///<reference path='refs.ts'/>
module TDev.RT {
    export enum ShakeType
    {
        X,
        Y,
        Z,
    }

    export module ShakeDetector
    {
        /// <summary>
        /// Any vector that has a magnitude (after reducing gravitation) bigger than this parameter will be considered as a shake vector
        /// </summary>
        var shakeMagnitudeWithoutGravitationThreshold : number = 0.2;

        /// <summary>
        /// This parameter determines how many consecutive still vectors are required to stop a shake signal
        /// </summary>
        var stillCounterThreshold : number = 8;

        /// <summary>
        /// This parameter determines the maximum allowed magnitude (after reducing gravitation) for a still vector to be considered to the average
        /// The last still vector is averaged out of still vectors that are under this bound
        /// </summary>
        var stillMagnitudeWithoutGravitationThreshold : number = 0.02;

        /// <summary>
        /// The maximum amount of still vectors needed to create a still vector average
        /// instead of averaging the entire still signal, we just look at the top recent still vectors
        /// </summary>
        var maximumStillVectorsNeededForAverage : number = 20;

        /// <summary>
        /// The minimum amount of still vectors needed to create a still vector average.
        /// Without enough vectors the average will not be stable and thus ignored
        /// </summary>
        var minimumStillVectorsNeededForAverage : number = 5;

        /// <summary>
        /// Determines the amount of shake vectors needed that has been classified the same to recognize a shake
        /// </summary>
        var minimumShakeVectorsNeededForShake : number = 8;

        /// <summary>
        /// Shake vectors with magnitude less than this parameter will not be considered for gesture classification
        /// </summary>
        var weakMagnitudeWithoutGravitationThreshold : number = 0.2;

        /// <summary>
        /// Determines the number of moves required to get a shake signal
        /// </summary>
        var minimumRequiredMovesForShake : number = 2;

        // last still vector - average of the last still signal
        // used to eliminate the gravitation effect
        // initial value has no meaning, it's just a dummy vector to avoid dealing with null values
        var _lastStillVector : Vector3 = Vector3.mk(0, -1, 0);

        // flag that indicates whether we are currently in a middle of a shake signal
        var _isInShakeState : boolean = false;

        // counts the number of still vectors - while in shake signal
        var _stillCounter : number = 0;

        // holds shake signal vectors
        var _shakeSignal : Vector3[] = [];

        // holds shake signal histogram
        var _shakeHistogram : number[] = [0,0,0];

        // hold still signal vectors, newest vectors are first
        var _stillSignal : Vector3[] = [];

        /// <summary>
        /// Called when the accelerometer provides a new value
        /// </summary>
        export function accelerationChanged(currentVector : Vector3) : boolean
        {
            //Util.log('sd: ' + currentVector);
            var shakeType : ShakeType = undefined;

            // check if this vector is considered a shake vector
            var isShakeMagnitude : boolean =
                Math.abs(_lastStillVector.length() - currentVector.length()) > shakeMagnitudeWithoutGravitationThreshold;

            // following is a state machine for detection of shake signal start and end

            // if still --> shake
            if ((!_isInShakeState) && (isShakeMagnitude))
            {
                //Util.log('sd: still --> shake');
                // set shake state flag
                _isInShakeState = true;

                // clear old shake signal
                clearShakeSignal();

                // process still signal
                processStillSignal();

                // add vector to shake signal
                addVectorToShakeSignal(currentVector);
            }
            // if still --> still
            else if ((!_isInShakeState) && (!isShakeMagnitude))
            {
                //Util.log('sd: still --> still');
                // add vector to still signal
                addVectorToStillSignal(currentVector);
            }
            // if shake --> shake
            else if ((_isInShakeState) && (isShakeMagnitude))
            {
                //Util.log('sd: shake --> shake');

                // add vector to shake signal
                addVectorToShakeSignal(currentVector);

                // reset still counter
                _stillCounter = 0;

                // try to process shake signal
                shakeType = processShakeSignal();
                if (shakeType)
                    // shake signal generated, clear used data
                    clearShakeSignal();
            }
            // if shake --> still
            else if ((_isInShakeState) && (!isShakeMagnitude))
            {
                //Util.log('sd: shake -->? still: '+ _stillCounter);

                // add vector to shake signal
                addVectorToShakeSignal(currentVector);

                // count still vectors
                _stillCounter++;

                // if too much still samples
                if (_stillCounter > stillCounterThreshold)
                {
                    //Util.log('sd: shake --> still');
                    // clear old still signal
                    _stillSignal.clear();

                    // add still vectors from shake signal to still signal
                    for (var i = 0; i < stillCounterThreshold; ++i)
                    {
                        // calculate current index element
                        var currentSampleIndex = _shakeSignal.length - stillCounterThreshold + i;

                        // add vector to still signal
                        addVectorToStillSignal(currentVector);
                    }

                    // remove last samples from shake signal
                    _shakeSignal.splice(_shakeSignal.length - stillCounterThreshold, stillCounterThreshold);

                    // reset shake state flag
                    _isInShakeState = false;
                    _stillCounter = 0;

                    // try to process shake signal
                    shakeType = processShakeSignal();
                    if (shakeType)
                        clearShakeSignal();
                }
            }
            return !!shakeType;
        }

        function addVectorToStillSignal(currentVector : Vector3 )
        {
            // add current vector to still signal, newest vectors are first
            _stillSignal.unshift(currentVector);

            // if still signal is getting too big, remove old items
            if (_stillSignal.length > 2 * maximumStillVectorsNeededForAverage)
            {
                _stillSignal.pop();
            }
        }

        /// <summary>
        /// Add a vector the shake signal and does some preprocessing
        /// </summary>
        function addVectorToShakeSignal(currentVector : Vector3)
        {
            // remove still vector from current vector
            var currentVectorWithoutGravitation : Vector3 = currentVector.subtract(_lastStillVector);

            // add current vector to shake signal
            _shakeSignal.push(currentVectorWithoutGravitation);

            // skip weak vectors
            if (currentVectorWithoutGravitation.length() < weakMagnitudeWithoutGravitationThreshold)
            {
                return;
            }

            // classify vector
            var vectorShakeType : ShakeType = classifyVectorShakeType(currentVectorWithoutGravitation);
            // count vector to histogram
            _shakeHistogram[<number>vectorShakeType]++;
        }

        /// <summary>
        /// Clear shake signal and related data
        /// </summary>
        function clearShakeSignal()
        {
            // clear shake signal
            _shakeSignal.clear();

            // create empty histogram
            for (var i = 0; i < _shakeHistogram.length;++i)
                _shakeHistogram[i] = 0;
        }

        /// <summary>
        /// Process still signal: calculate average still vector
        /// </summary>
        function processStillSignal()
        {
            var sumVector = Vector3.mk(0, 0, 0);
            var count = 0;

            // going over vectors in still signal
            // still signal was saved backwards, i.e. newest vectors are first
            for (var i = 0; i < _stillSignal.length;++i)
            {
                var currentStillVector = _stillSignal[i];
                // make sure current vector is very still
                var isStillMagnitude  : boolean = (Math.abs(_lastStillVector.length() - currentStillVector.length())
                    < stillMagnitudeWithoutGravitationThreshold);

                if (isStillMagnitude)
                {
                    // sum x,y,z values
                    sumVector = sumVector.add(currentStillVector);
                    ++count;

                    // 20 samples are sufficent
                    if (count >= maximumStillVectorsNeededForAverage)
                    {
                        break;
                    }
                }
            }

            // need at least a few vectors to get a good average
            if (count >= minimumStillVectorsNeededForAverage)
            {
                // calculate average of still vectors
                _lastStillVector = sumVector.scale(1 / count);
            }
        }

        /// <summary>
        /// Classify vector shake type
        /// </summary>
        function classifyVectorShakeType(v : Vector3) : ShakeType
        {
            var absX :number = Math.abs(v.x());
            var absY :number = Math.abs(v.y());
            var absZ :number = Math.abs(v.z());

            // check if X is the most significant component
            if ((absX >= absY) && (absX >= absZ))
            {
                return ShakeType.X;
            }

            // check if Y is the most significant component
            if ((absY >= absX) && (absY >= absZ))
            {
                return ShakeType.Y;
            }

            // Z is the most significant component
            return ShakeType.Z;
        }

        /// <summary>
        /// Classify shake signal according to shake histogram
        /// </summary>
        function processShakeSignal() : ShakeType
        {
            var xCount = _shakeHistogram[0];
            var yCount = _shakeHistogram[1];
            var zCount = _shakeHistogram[2];

            var shakeType : ShakeType = undefined;

            // if X part is strongest and above a minimum
            if ((xCount >= yCount) && (xCount >= zCount) && (xCount >= minimumShakeVectorsNeededForShake))
            {
                shakeType = ShakeType.X;
            }
            // if Y part is strongest and above a minimum
            else if ((yCount >= xCount) && (yCount >= zCount) && (yCount >= minimumShakeVectorsNeededForShake))
            {
                shakeType = ShakeType.Y;
            }
            // if Z part is strongest and above a minimum
            else if ((zCount >= xCount) && (zCount >= yCount) && (zCount >= minimumShakeVectorsNeededForShake))
            {
                shakeType = ShakeType.Z;
            }

            if (shakeType)
            {
                var countSignsChanges = countSignChanges(shakeType);

                // check that we have enough shakes
                if (countSignsChanges < minimumRequiredMovesForShake)
                {
                    //Util.log('sd: shake cancelled signs: ' + countSignsChanges);
                    shakeType = undefined;
                }
            }

            return shakeType;
        }

        /// <summary>
        /// Count how many shakes the shake signal contains
        /// </summary>
        function countSignChanges(shakeType : ShakeType) : number
        {
            var countSignsChanges = 0;
            var currentSign = 0;
            var prevSign : number = undefined;

            for (var i = 0; i < _shakeSignal.length; ++i)
            {
                // get sign of current vector
                switch (shakeType)
                {
                    case ShakeType.X:
                        currentSign = Math_.sign(_shakeSignal[i].x());
                        break;

                    case ShakeType.Y:
                        currentSign = Math_.sign(_shakeSignal[i].y());
                        break;

                    case ShakeType.Z:
                        currentSign = Math_.sign(_shakeSignal[i].z());
                        break;
                }

                // skip sign-less vectors
                if (currentSign == 0)
                {
                    continue;
                }

                // handle sign for first vector
                if (!prevSign)
                {
                    prevSign = currentSign;
                }

                // check if sign changed
                if (currentSign != prevSign)
                {
                    ++countSignsChanges;
                }

                // save previous sign
                prevSign = currentSign;
            }

            return countSignsChanges;
        }
    }
}
