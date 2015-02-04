///<reference path='refs.ts'/>
module TDev.RT.Wab {
    export function WebInit()
    {
        var w = <any>Web;
        if (isSupportedAction(Action.NETWORK_INFORMATION)) {
            Util.log('wab: boosting NETWORK_INFORMATION');
            w.connection_type = WebWab.connection_type;
            w.connection_name = WebWab.connection_name;
        }
        if (isSupportedAction(Action.BROWSE)) {
            Util.log('wab: boosting BROWSE');
            w.browseAsync = WebWab.browseAsync;
        }


        if (Browser.isWP8app) {
            // no CORS enforced
            w.proxy = function (url: string) { return url; }
            w.open_connection_settings = WebWp8.open_connection_settings;

        } else if (isSupportedAction(Action.PROXY)) {
            Util.log('wab: boosting PROXY');
            WebRequest.prototype.sendAsync = function () {
                var request: WebRequest = this;
                if (!Browser.isWP8app) return request.sendCoreAsync();
                var json: any = request.serializeForProxy();
                json.action = Action.PROXY;
                Time.log(this.toString() + " [WP8 proxy]");
                return sendRequestAsync(json).then(response => {
                    Util.log(this.toString() + " [WP8 proxy response]");
                    var r = WebResponse.mkProxy(request, response)
                    return r;
                });
            }
        }

        if (isSupportedAction(Action.OAUTH_AUTHENTICATION)) {
            Util.log('wab: boosting OAUTH_AUTHENTICATION');
            w.oauth_v2_dance_async = WebWab.oauth_v2_dance_async;
        }
    }

    export module WebWp8 {
        // wp8 only
        export function open_connection_settings(page: string, r : ResumeCtx): void {
            switch (page.toLowerCase()) {
                case 'airplanemode':
                case 'bluetooth':
                case 'cellular':
                case 'wifi':
                    WebWab.browseAsync('ms-settings-' + page + ':').done(() => r.resume());
                    break;
                default:
                    r.resume(); break;
            }
        }
    }

    export module WebWab {
        export function oauth_v2_dance_async(url: string, redirect_uri: string, userid: string, stateArg: string) {
            return sendRequestAsync(<OAuthAuthenticationRequest>{
                action: Action.OAUTH_AUTHENTICATION,
                uri: url,
                redirectUri: redirect_uri,
                state: stateArg
            })
                .then((response: UriResponse) => {
                    if (response.status == Status.OK && response.uri &&  response.uri.indexOf(stateArg) > -1)
                        return OAuthResponse.parse(response.uri);
                    else
                        return OAuthResponse.mkError('access_denied', '', '');
                });
        }

        export function connection_type(r: ResumeCtx) { //: string
            sendRequest({ action: Action.NETWORK_INFORMATION },
                (response: NetworkInformationResponse) => {
                    if (response.status == Status.OK)
                        r.resumeVal(response.connectionType || 'none');
                    else
                        r.resumeVal('unknown');
                });
        }
        export function connection_name(r : ResumeCtx) { // : string
            sendRequest({ action: Action.NETWORK_INFORMATION },
                (response: NetworkInformationResponse) => {
                    if (response.status == Status.OK)
                        r.resumeVal(response.connectionName || "");
                    else
                        r.resumeVal('');
                });

        }
        export function browseAsync(url: string): Promise {
            Util.log("wab: browse " + url);
            return sendRequestAsync(<UriRequest>{ action: Action.BROWSE, uri: url });
        }
    }
}
