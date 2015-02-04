///<reference path='refs.ts'/>

// Bing Maps signatures
declare module Microsoft.Maps {
    export function loadModule(name : string, options : any);
    export class Map {
        constructor(el: HTMLElement, v: any);
        public entities : EntityCollection;
        public setOptions(options: any): void;
        public setView(options: any): void;
        public getZoom(): number;
        public getCenter(): Microsoft.Maps.Location;
    }
    export module LocationRect {
        export function fromLocations(locs: Microsoft.Maps.Location[]): any;
    }
    export class EntityCollection {
        public push(entity: any);
        public clear();
    }
    export class Point {
        constructor(x : number, y : number);
    }
    export class Location {
        constructor(latitude : number, longitude : number);
        public latitude: number;
        public longitude: number;
    }
    export class Pushpin {
        constructor(center: Microsoft.Maps.Location, options: any);
        setLocation(center: Microsoft.Maps.Location);
        setOptions(options:any);
    }
    export class Polyline {
        constructor(locs: Microsoft.Maps.Location[], options: any);
    }
    export class Polygon {
        constructor(locs: Microsoft.Maps.Location[], options: any);
    }
    export class Color {
        constructor(r : number, g : number, b : number, a : number);
    }
    export module Events {
        export function addHandler(pp: Microsoft.Maps.Pushpin, name: string, handler: any);
    }
}

module TDev.RT {
    export module BingMaps {
        export function createMap(
            el: HTMLElement,
            loc: Location_,
            zoom: number
            ): Microsoft.Maps.Map {
            var options = <any>{
                credentials: ApiManager.bingMapsKey,
                enableClickableLogo : false,
                enableSearchLogo : false,
                disableBirdseye: true,
                showMapTypeSelector:false
            };
            if (loc)
                options.center = new Microsoft.Maps.Location(loc.latitude(), loc.longitude());
            if (zoom)
                options.zoom = zoom;
            var map = new Microsoft.Maps.Map(el, options);
            return map;
        }

        export function isBingMapsLoaded() {
            return typeof (Microsoft) != 'undefined'
                && typeof (Microsoft.Maps) != 'undefined'
                && typeof (Microsoft.Maps.Map) != 'undefined';
        }

        export var mkMapAsync = ( el: HTMLElement, loc: Location_, zoom: number): Promise  =>
        {
            if (isBingMapsLoaded()) {
                return Promise.as(createMap(el, loc, zoom));
            }

            return new Promise((onSuccess: (v: any) => any, onError: (v: any) => any, onProgress: (v: any) => any) => {
                var script = <HTMLScriptElement> document.createElement("script");

                // Bing maps inject script into the head, so listening to script load is not enough
                var loadWatcher: (retry: number) => void = undefined;
                var loadWatcher = (retry: number) => {
                    if (isBingMapsLoaded()) {
                        onSuccess(createMap(el, loc, zoom));
                    } else {
                        if (retry-- < 0) {
                            onError(undefined);
                        } else {
                            Util.setTimeout(100, () => loadWatcher(retry - 1));
                        }
                    }
                };

                script.type = "text/javascript";
                script.charset = "utf-8";
                script.onload = () =>
                {
                    if (!script.readyState || script.readyState === 'complete') {
                        loadWatcher(50);
                    }
                };
                script.onreadystatechange = script.onload;
                script.onerror = () => {
                    onSuccess(undefined);
                };
                script.src = "https://ecn.dev.virtualearth.net/mapcontrol/mapcontrol.ashx?v=7.0&s=1";
                document.head.appendChild(script);
            });
        }

        export function addClickHandler(pp: Microsoft.Maps.Pushpin, h: () => void ) {
            Microsoft.Maps.Events.addHandler(pp, 'click', h);
        }

    }
}
