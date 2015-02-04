///<reference path='refs.ts'/>
module TDev.RT.WinRT {
    export module UtilWinRT
    {
        export function tryUnsnap(): boolean
        {
            // Verify that we are currently not snapped, or that we can unsnap to open the picker
            var currentState = Windows.UI.ViewManagement.ApplicationView.value;
            if (currentState
                && currentState === Windows.UI.ViewManagement.ApplicationViewState.snapped
                && !Windows.UI.ViewManagement.ApplicationView.tryUnsnap()) {
                // Fail silently if we can't unsnap
                return false;
            }
            return true;
        }

    }

    export function RandomInit()
    {
        var cb = Windows.Security.Cryptography.CryptographicBuffer;
        Random.strongEntropySource = (buf:Uint8Array) => {
            var arr = cb.copyToByteArray(cb.generateRandom(buf.length))
            for (var i = 0; i < arr.length; ++i) buf[i] = arr[i];
        };
    }
}
