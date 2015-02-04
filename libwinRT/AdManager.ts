///<reference path='refs.ts'/>

// Microsoft Advertisement signatures
declare module MicrosoftNSJS.Advertising {
    export class AdControl {
        constructor(el: HTMLElement, v: any);
    }
}

module TDev.RT.WinRT {
    export function AdManagerInit()
    {
        AdManager.initialize = function(
            el: HTMLElement
            ) {
            var ad = new MicrosoftNSJS.Advertising.AdControl(el, {
                applicationId: ApiManager.pubCenterApplicationId,
                adUnitId: ApiManager.pubCenterAdUnitId
            });
        }
    }
}