///<reference path='refs.ts'/>
module TDev.RT.WinRT {
    export function MediaManagerInit() {
        MediaManagerWinRT.init();
    }

    export module MediaManagerWinRT
    {
        var _url: string;

        export function init()
        {
            if (Browser.isGenStubs) return;
            if (Windows.Media.PlayTo.PlayToManager) {
                var playToManager = Windows.Media.PlayTo.PlayToManager.getForCurrentView();
                playToManager.defaultSourceSelection = false;
                playToManager.onsourcerequested = null;
            }
        }

        function sourceRequested(e : Windows.Media.PlayTo.PlayToSourceRequestedEventArgs) {
            if (_url) {
                if (Windows.Media.PlayTo.PlayToManager) {
                    var playToManager = Windows.Media.PlayTo.PlayToManager.getForCurrentView();
                    playToManager.onsourcerequested = null;
                }

                try {
                    var video = <HTMLVideoElement>elt("video");
                    video.src = _url;
                    _url = null;
                    e.sourceRequest.setSource((<any>video).msPlayToSource);
                } catch (ex) {
                    Time.log(ex.message);
                }
            }
        }

        export function playMedia(url: string)
        {
            _url = url;

            if (Windows.Media.PlayTo.PlayToManager) {
                var playToManager = Windows.Media.PlayTo.PlayToManager.getForCurrentView();
                playToManager.onsourcerequested = sourceRequested;
                (<any>playToManager).showPlayToUI();
            }
        }
    }
}
