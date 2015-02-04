///<reference path='refs.ts'/>
module TDev.RT.WinRT {
    export function WebInit() {
        var Web = <any>TDev.RT.Web;
        Web.browseAsync = function (url: string) : Promise {
            try {
                var uri = new Windows.Foundation.Uri(url);
                return new Promise((onSuccess, onError, onProgress) => {
                    Windows.System.Launcher.launchUriAsync(uri)
                        .done(() => onSuccess(undefined));
                });
            }
            catch (e) {
                Time.log('web browse: invalid uri');
                return Promise.as(undefined);
            }
        }
        Web.connection_type = function () {
            var connectionProfile = Windows.Networking.Connectivity.NetworkInformation.getInternetConnectionProfile();
            if (connectionProfile) {
                var networkAdapter = connectionProfile.networkAdapter;
                var interfaceType = networkAdapter.ianaInterfaceType;
                switch (interfaceType) {
                    case 6: return 'ethernet';
                    case 71: return 'wifi';
                    case 243:
                    case 244: return 'mobile';
                }
                return 'unknown';
            }
            return 'none';
        };
        Web.connection_name = function () {
            var connectionProfile = Windows.Networking.Connectivity.NetworkInformation.getInternetConnectionProfile();
            if (connectionProfile)
                return connectionProfile.profileName;
            else
                return "";
        };
        Web.create_request = function (url: string): WebRequest {
            return WebRequest.mk(url, undefined);
        };
        Web.proxy = function (url: string): string {
            return url;
        }
        Web.oauth_v2_dance_async = function (url : string, redirect_uri : string, userid : string, stateArg : string) {
            var startURI = new Windows.Foundation.Uri(url);
            var endURI = new Windows.Foundation.Uri(redirect_uri);
            var res = new PromiseInv();
            Windows.Security.Authentication.Web.WebAuthenticationBroker.authenticateAsync(
                Windows.Security.Authentication.Web.WebAuthenticationOptions.none, startURI, endURI)
                .done(function (result) {
                    res.success(OAuthResponse.parse(result.responseData));
                }, function (err) {
                    res.success(OAuthResponse.mkError('access_denied', err.message, ""));
                });
            return res;
        }
    }
}
