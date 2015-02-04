///<reference path='refs.ts'/>
module TDev { export module RT {
    export enum DeviceFaceOrientation {
        Up,
        Down
    }
    export enum DeviceLandscapeOrientation {
        Portrait,
        LandscapeLeft,
        LandscapeRight
    }
    
    export module DeviceOrientation
    {
        var _alpha: number = undefined;
        var _beta: number = undefined;
        var _gamma: number = undefined;
        var _heading: number = 0;
        var _face_orientation: DeviceFaceOrientation = undefined;
        var _landscape_orientation: DeviceLandscapeOrientation = undefined;
        var _runtime: Runtime = undefined;

        function clearData(clearRuntime = true)
        {
            Util.log('deviceorientation: clear data');
            _alpha = undefined;
            _beta = undefined;
            _gamma = undefined;
            _heading = 0;
            _face_orientation = undefined;
            _landscape_orientation = undefined;
            if (clearRuntime)
                _runtime = undefined;
        }

        // see http://dev.w3.org/geo/api/spec-source-orientation.html#deviceorientation
        export function computeHeading()
        {
            if (Math.abs(_gamma) < 45 &&
                45 < Math.abs(_beta) &&
                Math.abs(_beta) < 135) {
                var sinAlpha = Math.sin(_alpha);
                var cosAlpha = Math.cos(_alpha);
                var sinBeta = Math.sin(_beta);
                var sinGamma = Math.sin(_gamma);
                var cosGamma = Math.cos(_gamma);
                _heading = Math.atan(
                    (-cosAlpha * sinGamma - sinAlpha * sinBeta * cosGamma)
                  / (-sinAlpha * sinGamma + cosGamma * sinBeta * cosGamma)
                  );
            } else {
                _heading = 360 - _alpha;
            }
        }

        export function orientation(r: ResumeCtx)
        {
            start(r.rt);
            if (_alpha && _beta && _gamma)
                r.resumeVal(Vector3.mk(_alpha, _beta, _gamma));
            else
                r.resumeVal(Vector3.mk(0,0,0));
        }

        export function heading(r: ResumeCtx)
        {
            start(r.rt);
            r.resumeVal(_heading);
        }

        function detectLandscapeOrientation()
        {
            var threshold = 30;
            if (_beta > 90 - threshold && _beta < 90 + threshold) {
                if (_landscape_orientation != DeviceLandscapeOrientation.Portrait) {
                    Util.log('phone portrait');
                    _landscape_orientation = DeviceLandscapeOrientation.Portrait;
                    Senses.raisePhonePortrait();
                }
            } else if ((_beta < threshold || _beta > 360 - threshold)
                && _gamma > 270 - threshold && _gamma < 270 + threshold) {
                if (_landscape_orientation != DeviceLandscapeOrientation.LandscapeLeft) {
                    Util.log('phone landscape left');
                    _landscape_orientation = DeviceLandscapeOrientation.LandscapeLeft;
                    Senses.raisePhoneLandscapeLeft();
                }
            } else if ((_beta < threshold || _beta > 360 - threshold)
                && _gamma > 90 - threshold && _gamma < 90 + threshold) {
                if (_landscape_orientation != DeviceLandscapeOrientation.LandscapeRight) {
                    Util.log('phone landscape right');
                    _landscape_orientation = DeviceLandscapeOrientation.LandscapeRight;
                    Senses.raisePhoneLandscapeRight();
                }
            } else {
                _landscape_orientation = undefined;
            }
        }

        function detectFaceOrientation()
        {
            var threshold = 30;
            if ((_beta < threshold || _beta > 360 - threshold)
                && (_gamma < threshold || _gamma > 360 - threshold)
                ) {
                if (_face_orientation != DeviceFaceOrientation.Up) {
                    Util.log('phone face up');
                    _face_orientation = DeviceFaceOrientation.Up;
                    Senses.raisePhoneFaceUp();
                }
            }
            else if (
                (  (_gamma > 180 - threshold && _gamma < 180 + threshold && (_beta < threshold || _beta > 360 - threshold))
                || (_beta > 180 - threshold && _beta < 180 + threshold && (_gamma < threshold || _gamma > 360 - threshold))
                )) {
                if (_face_orientation != DeviceFaceOrientation.Down) {
                    Util.log('phone face down');
                    _face_orientation = DeviceFaceOrientation.Down;
                    Senses.raisePhoneFaceDown();
                }
            } else {
                _face_orientation = undefined;
            }
        }

        export function setOrientation(alpha: number, beta: number, gamma: number)
        {
            _alpha = alpha; if (_alpha && _alpha < 0) _alpha += 360.0;
            _beta = beta; if (_beta && _beta < 0) _beta += 360.0;
            _gamma = gamma; if (_gamma && _gamma < 0) _gamma += 360.0;
            if (!_alpha || !_beta || !_gamma) {
                clearData(false);
                return;
            }
            detectLandscapeOrientation();
            detectFaceOrientation();
        }

        export function setHeading(heading: number)
        {
            _heading = heading;
        }
        
        function reading(ev: any) { 
            Util.log('deviceorientation: reading...');
            // read data
            setOrientation(<number>ev.alpha, <number>ev.beta, <number>ev.gamma);
            
            // compass
            setHeading(<number>ev.compassHeading || <number>ev.webkitCompassHeading || undefined);
            if (!_heading && ev.absolute) {
                computeHeading();
            }
        }

        export var isOrientationSupported = () : boolean =>
        {
            return Browser.deviceOrientation;
        }

        export var isHeadingSupported = () : boolean =>
        {
            return Browser.deviceHeading;
        }

        export function rt_start(r: Runtime) {
            if (r.eventEnabled("phone face up")
                || r.eventEnabled("phone face down")
                || r.eventEnabled("phone portrait")
                || r.eventEnabled("phone landscape left")
                || r.eventEnabled("phone landscape right")
                ) {
                    start(r);
                }
        }

        export function rt_stop(rt: Runtime) {
            stop(rt);
        }

        export var addOrientationReadingEvent = () =>
        {
            Util.log('deviceorientation: attaching');
            window.addEventListener('deviceorientation', reading, false);                
        }

        export var removeOrientationReadingEvent = () =>
        {
            window.removeEventListener('deviceorientation', reading, false);
        }

        export var addHeadingReadingEvent = () =>
        {
            Util.log('compassneedscalibration: attaching');
            window.addEventListener("compassneedscalibration", calibrateCompass, false);
        }
        export var removeHeadingReadingEvent = () =>
        {
            window.removeEventListener("compassneedscalibration", calibrateCompass, false);
        }

        function calibrateCompass(ev : Event) {
            HTML.showNotificationText("Your compass needs calibrating! Wave your device in a figure-eight motion.");
        }
                   
        export function start(r : Runtime) {
            if (r.isHeadless()) return
            if (isOrientationSupported() || isHeadingSupported()) {
                if (!_runtime) {
                    _runtime = r;
                    if (isOrientationSupported())
                        DeviceOrientation.addOrientationReadingEvent();
                    if (isHeadingSupported())
                        DeviceOrientation.addHeadingReadingEvent();
                }
            }
            else {
                Util.log('deviceorientation: not supported');
                clearData();
            }
        }        

        export function stop(r: Runtime) {
            if (r.isHeadless()) return
            Util.log('deviceorientation: stop');
            DeviceOrientation.removeOrientationReadingEvent();
            DeviceOrientation.removeHeadingReadingEvent();
            clearData(true);
        }
    }
} }
