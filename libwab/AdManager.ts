///<reference path='refs.ts'/>
module TDev.RT.Wab {
    export function AdManagerInit()
    {
        if (isSupportedAction(Action.SHOW_AD) && 
            ApiManager.pubCenterApplicationId &&
            ApiManager.pubCenterAdUnitId) {
            Util.log('wab: boosting SHOW_AD');
            AdManager.initialize = AdManagerWab.initialize;
        }
    }

    export module AdManagerWab {
        export function initialize(el: HTMLElement) {
            Util.log('wab: initialize AdCenter, AdUnitId = ' + ApiManager.pubCenterAdUnitId + ', ApplicationId = ' + ApiManager.pubCenterApplicationId);
            el.style.display = 'none';
            sendRequest({ 
                action: Action.SHOW_AD, 
                adUnitId:ApiManager.pubCenterAdUnitId, 
                applicationId:ApiManager.pubCenterApplicationId
            }, (response: Response) => { });
        }
    }
}