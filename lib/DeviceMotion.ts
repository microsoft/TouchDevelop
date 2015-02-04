///<reference path='refs.ts'/>
module TDev.RT {
    export module DeviceMotion
    {
        var _raw: Vector3 = undefined;
        var _rawSign = 0;
        var _low: Vector3 = undefined;
        var _optimal: Vector3 = undefined;
        var _rotationRate: Vector3 = undefined;
        var _runtime: Runtime = undefined;
        var _deviceStableCount: number = 0;

        // This is the maximum inclination angle variation on any axis between the average acceleration and the filtered
        // acceleration beyond which the device cannot be calibrated on that particular axis.
        // The calibration cannot be done until this condition is met on the last contiguous samples from the accelerometer
        // 0.5 deg inclination delta at max
        var _maximumStabilityTiltDeltaAngle : number = 0.5 * Math.PI / 180.0;

        // Corresponding lateral acceleration offset at 1g of Maximum Stability Tilt Delta Angle
        var _maximumStabilityDeltaOffset : number = Math.sin(_maximumStabilityTiltDeltaAngle);
        var _samplesCount: number = 20;

        function initializeData(r: Runtime)
        {
            _raw = Vector3.mk(0, 1, 0);
            _rawSign = 0;
            _low = Vector3.mk(0, 1, 0);
            _optimal = Vector3.mk(0, 1, 0);
            _rotationRate = Vector3.mk(0, 0, 0);
            _deviceStableCount = 0;
            _runtime = r;
        }
        function clearData()
        {
            _raw = undefined;
            _rawSign = 0;
            _low = undefined;
            _optimal = undefined;
            _rotationRate = undefined;
            _runtime = undefined;
            _deviceStableCount = 0;
        }
        function lowPass(old: number, current: number): number
        {
            return old + (current - old) * 0.1;
        }
        function fastLowPass(old: number, current: number): number
        {
            if (Math.abs(old - current) < 0.05) {
                return lowPass(old, current);
            }
            else {
                return current;
            }
        }

        export function isDeviceStable(r: ResumeCtx)
        {
            start(r.rt);
            r.resumeVal(_deviceStableCount >= _samplesCount);
        }

        export function setRaw(v: Vector3, orientation?:number) {
            if (orientation === undefined)
                orientation = (<any>window).orientation;
            if (orientation == 90) {
                v = Vector3.mk(v.y(), -v.x(), v.z());
            }
            else if (orientation == -90) {
                v = Vector3.mk(-v.y(), v.x(), v.z());
            }
            else if (orientation == 180) {
                v = Vector3.mk(-v.x(), -v.y(), v.z());
            }

            _raw = v;
            if (_low) {
                _low = Vector3.mk(
                    lowPass(_low.x(), _raw.x()),
                    lowPass(_low.y(), _raw.y()),
                    lowPass(_low.z(), _raw.z())
                    );
            }
            else {
                _low = _raw;
            }
            if (_optimal) {
                _optimal = Vector3.mk(
                    fastLowPass(_optimal.x(), _raw.x()),
                    fastLowPass(_optimal.y(), _raw.y()),
                    fastLowPass(_optimal.z(), _raw.z())
                    );
            }
            else {
                _optimal = _raw;
            }

            // Stablity check
            // If current low-pass filtered sample is deviating for more than 1/100 g from average (max of 0.5 deg inclination noise if device steady)
            // then reset the stability counter.
            // The calibration will be prevented until the counter is reaching the sample count size (calibration enabled only if entire
            // sampling buffer is "stable"
            if (_low && _optimal) {
                var dv = _low.subtract(_optimal);
                if (Math.abs(dv.x()) > _maximumStabilityDeltaOffset ||
                    Math.abs(dv.y()) > _maximumStabilityDeltaOffset ||
                    Math.abs(dv.z()) > _maximumStabilityDeltaOffset)
                    _deviceStableCount = 0;
                else {
                    if (_deviceStableCount < _samplesCount)++_deviceStableCount;
                }
            }

            if (ShakeDetector.accelerationChanged(_raw))
                Senses.raiseShakeEvent();
        }

        function reading(ev: any)
        {
            var acc = ev.accelerationIncludingGravity;
            if (acc) {
                // assuming the device starts screen up, z should be negative
                // on Android, the frame of reference is inverted to our expectatations.
                if (!_rawSign)
                    _rawSign = acc.z < 0 ? 1 : -1;
                var g = 9.81 * _rawSign;
                var ax = acc.x / g;
                var ay = -acc.y / g;
                var az = acc.z / g;
                setRaw(Vector3.mk(ax, ay, az));
            }

            var rot = ev.rotationRate;
            if (rot) {
                _rotationRate = Vector3.mk(rot.x, rot.y, rot.z);
            } else {
                _rotationRate = undefined;
            }
        }

        // simulating acceleration through orientation (not accurate)
        function orientationReading(ev: any) {
            var beta = Math_.deg_to_rad(<number>ev.beta || 0);
            var gamma = Math_.deg_to_rad(<number>ev.gamma || 0);

            var cosBeta = Math.cos(beta);
            var cosGamma = Math.cos(gamma);

            var v = Vector3.mk(
                    gamma * 1.5,
                    beta * 1.5,
                    -cosBeta*cosGamma * 1.25);

            //var orientation = (<any>window).orientation;
            //if (orientation == 90) {
            //    v = Vector3.mk(-v.x(), -v.y(), v.z());
            //}
            //else if (orientation == -90) {
            //    v = Vector3.mk(-v.x(), -v.y(), v.z());
            //}

            setRaw(v);
        }

        function mouseReading(ev: MouseEvent)
        {
            var x = (ev.pageX - SizeMgr.windowWidth / 2) / SizeMgr.windowWidth;
            var y = (ev.pageY - SizeMgr.windowHeight / 2) / SizeMgr.windowHeight;
            x *= 2;
            y *= 2;
            var z = Math.sqrt(Math.max(0, 1 - x * x - y * y));

            if (_runtime)
                _runtime.host.setTransform3d(Util.fmt("perspective(30em) rotateX({0}deg) rotateY({1}deg)", -y, x), "50% 50% 50%", "30em")

            setRaw(Vector3.mk(
                x,
                y,
                z));
        }

        export var isSupported = () : boolean =>
        {
            return  isMotionSupported()
                || DeviceOrientation.isOrientationSupported()
                || Browser.assumeMouse;
        }

        export var isMotionSupported = (): boolean =>
        {
            return Browser.deviceMotion;
        }

        export var isGyroscopeSupported = (): boolean =>
        {
            return Browser.deviceMotion;
        }

        export function rt_start(r: Runtime)
        {
            if (r.eventEnabled("shake"))
                start(r);
        }

        export var addReadingEvent = () =>
        {
            if (isMotionSupported())
                window.addEventListener('devicemotion', reading, false);
            else if (DeviceOrientation.isOrientationSupported())
                window.addEventListener('deviceorientation', orientationReading, false);
            else if (Browser.assumeMouse)
                window.addEventListener('mousemove', mouseReading, false);
        }

        export var removeReadingEvent = () =>
        {
            window.removeEventListener('devicemotion', reading, false);
            window.removeEventListener('deviceorientation', orientationReading, false);
            window.removeEventListener('mousemove', mouseReading, false);
        }

        export var start = (r: Runtime) =>
        {
            if (r.isHeadless()) return
            if (!_runtime) {
                initializeData(r);
                if (isSupported())
                    DeviceMotion.addReadingEvent();
            }
        }
        export var stop = (r:Runtime) =>
        {
            if (r.isHeadless()) return
            DeviceMotion.removeReadingEvent();
            clearData();
        }

        export function accelerationStable(r : ResumeCtx) {
            start(r.rt);
            r.resumeVal(_raw);
        }
        export function accelerationSmooth(r : ResumeCtx) {
            start(r.rt);
            r.resumeVal(_low);
        }
        export function accelerationQuick(r : ResumeCtx) {
            start(r.rt);
            r.resumeVal(_optimal);
        }
        export function acceleration(r : ResumeCtx) : Vector3 {
            start(r.rt);
            return _optimal;
        }
        export function rotationRate(r : ResumeCtx) {
            start(r.rt);
            r.resumeVal(_rotationRate);
        }
    }
}
