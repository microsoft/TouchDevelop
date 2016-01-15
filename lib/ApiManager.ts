///<reference path='refs.ts'/>
module TDev.RT {
    export interface JsonKey
    {
        uri: string; // API key registration url
        value: string; // current key value
    }

    export module ApiManager {
        export var bingMapsKey: string;
        export var bingSearchKey: string;

        export var microsoftTranslatorKey: string;
        export var microsoftTranslatorClientId: string;
        export var microsoftTranslatorClientSecret: string;

        export var pubCenterApplicationId: string; // = 'd25517cb-12d4-4699-8bdc-52040c712cab'; // test mode
        export var pubCenterAdUnitId: string; // = '10043008'; // 500 x 130 ad
        export var keys = {};
        export function addKey(url: string, value: string) {
            keys[url] = value;
        }
        export var getKeyAsync = (url: string): Promise =>
        {
            // cached?
            var v = keys[url];
            if (v) return Promise.as(v);

            // ask cloud
            return Cloud.getPrivateApiAsync("me/keys?uri=" + encodeURIComponent(url))
                .then((k: JsonKey) => {
                    if (k.value === null) return undefined;
                    return k.value;
                }, e => null);
        }
    }

    export module AzureMarketplace {
        var tokens = {}

        // grabs an access token from the Azure Marketplace
        export function requestAccessTokenAsync(clientId: string, clientSecret: string, scope: string, grantType: string): Promise {
            var form = 'grant_type=' + encodeURIComponent(grantType)
                + '&client_id=' + encodeURIComponent(clientId)
                + '&client_secret=' + encodeURIComponent(clientSecret)
                + '&scope=' + encodeURIComponent(scope);

            // is there a cached token?
            var token = <AzureMarketplaceToken>tokens[form];
            if (token && token.expires < Date.now()) {
                return Promise.as(token.accessToken);
            }

            // cache miss
            var url = 'https://datamarket.accesscontrol.windows.net/v2/OAuth2-13';
            var request = Web.create_request(url);
            request.set_content(form);
            request.set_content_type('application/x-www-form-urlencoded');
            request.set_method('POST');
            return request.sendAsync()
                .then((response: WebResponse) => {
                    var json = response.content_as_json();
                    if (json) {
                        var expires = Date.now() + String_.to_number(json.string('expires_in')) - 10;
                        var accessToken = json.string('access_token');
                        tokens[form] = <AzureMarketplaceToken>{ accessToken: accessToken, expires: expires };
                        return accessToken;
                    }
                    return null;
                });
        }
    }

    interface AzureMarketplaceToken {
        accessToken: string;
        expires: number;
    }
}
