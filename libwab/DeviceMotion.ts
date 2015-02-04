///<reference path='refs.ts'/>
module TDev.RT.Wab {
    export function DeviceMotionInit()
    {
        if (isSupportedAction(Action.START_ACCELEROMETER)) {
            Util.log('wab: boosting START_ACCELEROMETER');
            DeviceMotion.isSupported = DeviceMotionWab.isSupported;
            DeviceMotion.isMotionSupported = DeviceMotionWab.isMotionSupported;
            DeviceMotion.addReadingEvent = DeviceMotionWab.addReadingEvent;
            DeviceMotion.removeReadingEvent = DeviceMotionWab.removeReadingEvent;
        }
    }

    export module DeviceMotionWab
    {
        var currId:string;

        export function isSupported() { return true; }
        export function isMotionSupported() { return true; }

        export function addReadingEvent() {
            Util.log('wab: starting accelerometer');
            currId = sendRequest({ action: Action.START_ACCELEROMETER }, (acc:AccelerometerResponse) => {
                //Util.log('wab: acc ' + acc.x + ', ' + acc.y + ', ' + acc.z);
                DeviceMotion.setRaw(Vector3.mk(acc.x, acc.y, acc.z), acc.orientation);
            })
        }

        export function removeReadingEvent() {
            Util.log('wab: stopping accelerometer');
            if (currId) {
                cancelRequest(currId);
                currId = "";
            }
        }
    }
}
