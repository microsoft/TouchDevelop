///<reference path='refs.ts'/>
module TDev.RT.Cordova {

    export function DeviceOrientationInit()
    {
        if ((<any>navigator).compass) {
            Util.log('cordova: boosting COMPASS');
            DeviceOrientation.isHeadingSupported = DeviceOrientationCordova.isHeadingSupported;
            DeviceOrientation.addHeadingReadingEvent = DeviceOrientationCordova.addHeadingReadingEvent;
            DeviceOrientation.removeHeadingReadingEvent = DeviceOrientationCordova.removeHeadingReadingEvent;
        }
    }

    export module DeviceOrientationCordova
    {
        var watchID;

        export function isHeadingSupported() { return true; }

        export function addHeadingReadingEvent() {
            watchID = (<any>navigator).compass.watchHeading((heading) => {
                DeviceOrientation.setHeading(heading.magneticHeading);
            },
            (error) => {
                Util.log("compass error: " + error)
            }, {
                frequency: 1000
            });
        }

        export function removeHeadingReadingEvent() {
            if (watchID) {
                (<any>navigator).compass.clearWatch(watchID)
                watchID = null
            }
        }
    }
}
