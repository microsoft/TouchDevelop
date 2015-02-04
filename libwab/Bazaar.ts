///<reference path='refs.ts'/>
module TDev.RT.Wab {
    export function BazaarInit()
    {
        var Bazaar = <any>TDev.RT.Bazaar;
        if (isSupportedAction(Action.CURRENT_APP_INFO)) {
            Util.log('wab: boosting CURRENT_APP_INFO');
            Bazaar.storeidAsync = BazaarWab.storeidAsync;
        }
    }

    export module BazaarWab {
        export function storeidAsync() : Promise {
            return sendRequestAsync({ action: Action.CURRENT_APP_INFO })
                .then((response: CurrentAppInfoResponse) => {
                    if (response.status === Status.OK)
                        return <any>response.storeid;
                    else
                        return undefined;
                });
        }
    }
}
