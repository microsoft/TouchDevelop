///<reference path='refs.ts'/>
module TDev.RT.Wab {
    export function DeviceOrientationInit()
    {
        if (isSupportedAction(Action.START_ORIENTATION)) {
            Util.log('wab: boosting START_ORIENTATION');
            DeviceOrientation.isOrientationSupported = DeviceOrientationWab.isHeadingSupported;
            DeviceOrientation.addOrientationReadingEvent = DeviceOrientationWab.addOrientationReadingEvent;
            DeviceOrientation.removeOrientationReadingEvent = DeviceOrientationWab.removeOrientationReadingEvent;
        }

        if (isSupportedAction(Action.START_COMPASS)) {
            Util.log('wab: boosting START_COMPASS');
            DeviceOrientation.isHeadingSupported = DeviceOrientationWab.isHeadingSupported;
            DeviceOrientation.addHeadingReadingEvent = DeviceOrientationWab.addHeadingReadingEvent;
            DeviceOrientation.removeHeadingReadingEvent = DeviceOrientationWab.removeHeadingReadingEvent;
        }
    }

    export module DeviceOrientationWab
    {
        var currOrientationId: string;
        var currCompassId:string;

        export function isOrientationSupported() { return true; }
        export function isHeadingSupported() { return true; }

        export function addOrientationReadingEvent() {
            currOrientationId = sendRequest({ action: Action.START_ORIENTATION }, (r: OrientationResponse) => {
                DeviceOrientation.setOrientation(r.y, r.p, r.r);
            })
        }

        export function addHeadingReadingEvent() {
            currCompassId = sendRequest({ action: Action.START_COMPASS }, (r:CompassResponse) => {
                DeviceOrientation.setHeading(r.v);
            })
        }

        export function removeOrientationReadingEvent() {
            if (currOrientationId) {
                cancelRequest(currOrientationId);
                currCompassId = "";
            }
        }

        export function removeHeadingReadingEvent() {
            if (currCompassId) {
                cancelRequest(currCompassId);
                currCompassId = "";
            }
        }
    }
}
