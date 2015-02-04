///<reference path='refs.ts'/>
module TDev { export module RT {
    export module GeoLocation {
        export function isSupported() : boolean { return !!(<any>window).navigator.geolocation;         }
        function getCurrentPosition(accurate : boolean, r : ResumeCtx) {
            if (isSupported()) {
                (<any>window).navigator.geolocation.getCurrentPosition(
                    (position : any) => {
                        var coords = position.coords;
                        var loc = Location_.mk(
                            coords.latitude, coords.longitude, coords.altitude,
                            coords.accuracy, coords.altitudeAccuracy,
                            coords.heading, coords.speed);
                        r.resumeVal(loc);
                    },
                    (error:any) => {
                        r.resumeVal(undefined);
                    }, 
                    { enableHighAccuracy : accurate }
                    );
            } else {
                r.resumeVal(undefined);
            }
        }
        
        export function currentLocation(r: ResumeCtx) {
            getCurrentPosition(false, r);
        }
        
        export function currentLocationAccurate(r : ResumeCtx) {
            getCurrentPosition(true, r);
        }
    }
} }
