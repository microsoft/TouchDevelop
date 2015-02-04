///<reference path='refs.ts'/>
module TDev.RT.Cordova {

    export function WebInit()
    {
        Web.browseAsync = WebCordova.browseAsync;
        Web.oauth_v2_dance_async = WebCordova.oauth_v2_dance_async;
    }

    export module WebCordova
    {
        export function browseAsync(url: string) {
            window.open(url, "_blank", 'location=no,toolbar=no');
            return Promise.as();
        }

        export function oauth_v2_dance_async(url: string, redirect_uri: string, userid: string, stateArg: string)
        {
            return new Promise((onSuccess, onError, onProgress) => {
                var woptions = 'location=yes,menubar=no,toolbar=no';
                var oauthWindow = window.open(url, '_blank', woptions);
                oauthWindow.addEventListener('loadstart', (e : Event) => {
                    var rurl = <string>(<any>e).url;
                    App.logEvent(App.DEBUG, 'oauth', 'oauth redirect_uri: ' + rurl, undefined);
                    if (String_.starts_with(rurl, redirect_uri)) {
                        var response = OAuthResponse.parse(rurl);
                        if (response) {
                            oauthWindow.close();
                            onSuccess(response);
                        }
                    }
                }, false);
            });
        }
    }
}
