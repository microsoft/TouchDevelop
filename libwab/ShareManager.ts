///<reference path='refs.ts'/>
module TDev.RT.Wab {
    export function ShareManagerInit()
    {
        if (isSupportedAction(Action.SHARE)) {
            Util.log('wab: boosting SHARE');
            ShareManager.shareSocialAsync = ShareManagerWab.shareSocialAsync;
            ShareManager.sharePictureAsync = ShareManagerWab.sharePictureAsync;
            // This is no good, it doesn't show the list of choices
            // ShareManager.shareButtons = ShareManagerWab.shareButtons;
        }
        if (isSupportedAction(Action.COPY_TO_CLIPBOARD)) {
            Util.log('wab: boosting COPY_TO_CLIPBOARD');
            ShareManager.copyToClipboardAsync = ShareManagerWab.copyToClipboardAsync;
        }
    }

    export module ShareManagerWab {
        function nullToUndefined(x) {
            return x === null ? undefined : x;
        }
        export function copyToClipboardAsync(text: string): Promise {
            return sendRequestAsync(<CopyToClipboardRequest>{ action: Action.COPY_TO_CLIPBOARD, text: text });
        }
        export function shareSocialAsync(network: string, text: string, uri : string) : Promise {
            return sendRequestAsync(<ShareRequest>{ action: Action.SHARE, text: nullToUndefined(text), provider: network, uri: nullToUndefined(uri) });
        }
        export function shareButtons(m:ModalDialog, link: Link, options:ShareManager.ShareOptions)
        {
            return [
                HTML.mkButton(lf("share"), () => {
                    shareSocialAsync("", link.name(), link.address()).done()
                    if (!options.noDismiss) m.dismiss();
                })
            ]
        }
        export function sharePictureAsync(pic: Picture, network: string, text: string) : Promise {
            var dataUri = pic.getDataUri();
            return sendRequestAsync(<ShareRequest>{ action: Action.SHARE, photoUri: nullToUndefined(dataUri), text: nullToUndefined(text), provider: network });
        }
    }
}
