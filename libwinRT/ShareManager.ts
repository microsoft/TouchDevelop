///<reference path='refs.ts'/>
module TDev.RT.WinRT {
    export function ShareManagerInit()
    {
        ShareManager.shareSocialAsync = ShareManagerWinRT.shareSocialAsync;
        ShareManager.sharePictureAsync = ShareManagerWinRT.sharePictureAsync;
        ShareManagerWinRT.init();
    }

    export module ShareManagerWinRT
    {
        var _text: string = undefined;
        var _uri: string = undefined;
        var _picture: Picture = undefined;

        function clear()
        {
            _text = undefined;
            _uri = undefined;
            _picture = undefined;
        }

        function requestSetText(request: Windows.ApplicationModel.DataTransfer.DataRequest, t: string) {
            var i = t.indexOf('\n');
            request.data.properties.title = t.substring(0, i) || "some text";
            request.data.properties.description = "";
            request.data.setText(t.substring(i + 1) || "");
        }

        function shareHandler(e : any)
        {
            var request = <Windows.ApplicationModel.DataTransfer.DataRequest>(e.request);
            if (_text && _uri) {
                request.data.properties.title = _text;
                request.data.properties.description = "a link";
                request.data.setUri(new Windows.Foundation.Uri(_uri));
                clear();
            }
            else if (_text) {
                requestSetText(request, _text);
                clear();
            }
            else if (_picture) {
                requestSetPicture(request, _text || "sharing a picture", _picture);
            }
            else {
                request.failWithDisplayText("Sorry, there is nothing to share for now.");
            }
        }

        function requestSetPicture(request: Windows.ApplicationModel.DataTransfer.DataRequest, msg: string, pic : Picture) : void {
            pic.initAsync().done(() => {
                request.data.properties.title = "";
                request.data.properties.description = msg;
                var data = pic.getImageData();
                var w = data.width;
                var h = data.height;
                var deferral = request.getDeferral();
                var stream = new Windows.Storage.Streams.InMemoryRandomAccessStream();
                var encoderId = Windows.Graphics.Imaging.BitmapEncoder.jpegEncoderId;
                Windows.Graphics.Imaging.BitmapEncoder.createAsync(encoderId, stream)
                .then(function (encoder: Windows.Graphics.Imaging.BitmapEncoder) {
                    encoder.setPixelData(
                        Windows.Graphics.Imaging.BitmapPixelFormat.rgba8,
                        Windows.Graphics.Imaging.BitmapAlphaMode.straight,
                        w, // pixel width
                        h, // pixel height
                        96, // horizontal DPI
                        96, // vertical DPI
                        <any>data.data
                        );
                    return encoder.flushAsync();
                })
                .done(function () {
                    request.data.setBitmap(Windows.Storage.Streams.RandomAccessStreamReference.createFromStream(stream));
                    deferral.complete();
                    clear();
                }, function (err: any) {
                    request.failWithDisplayText("Sorry, there is nothing to share for now.");
                    deferral.complete();
                    clear();
                });
            })
        }

        export function init()
        {
            if (Browser.isGenStubs) return;
            var dataTransferManager = Windows.ApplicationModel.DataTransfer.DataTransferManager.getForCurrentView();
            dataTransferManager.ondatarequested = shareHandler;
            ShareManager.facebookLike = (text, url, fburl) => null;
            ShareManager.createFacebookLike = null;
            ShareManager.createTwitterTweet = null;
        }

        export function shareSocialAsync(network: string, text: string, uri : string) : Promise
        {
            _uri = uri;
            _text = text;
            Windows.ApplicationModel.DataTransfer.DataTransferManager.showShareUI();
            return Promise.as();
        }

        export function sharePictureAsync(pic : Picture, network : string, message : string)
        {
            _picture = pic;
            _text = message;
            Windows.ApplicationModel.DataTransfer.DataTransferManager.showShareUI();
            return Promise.as();
        }
    }
}
