///<reference path='refs.ts'/>
module TDev.RT.WinRT {
    export function BazaarInit()
    {
        Bazaar.storeidAsync = BazaarWinRT.storeidAsync;
    }

    export module BazaarWinRT {
        export function storeidAsync() : Promise {
            return Promise.as(Windows.ApplicationModel.Store.CurrentApp.appId);
        }
    }
}
