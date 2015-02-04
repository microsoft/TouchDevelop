///<reference path='refs.ts'/>
module TDev.RT.WinRT {
    export function MapsInit()
    {
        BingMaps.mkMapAsync = function (
            el: HTMLElement,
            loc: Location_,
            zoom: number): Promise {
            return new Promise((onSuccess: (v: any) => any, onError: (v: any) => any, onProgress: (v: any) => any) => {
                function initMap() {
                    onSuccess(BingMaps.createMap(el, loc, zoom));
                }
                Microsoft.Maps.loadModule('Microsoft.Maps.Map', { callback: initMap,  culture: Languages.current_language() || "en-us"});
            });
        }
    }
}
