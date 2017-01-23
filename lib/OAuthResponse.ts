///<reference path='refs.ts'/>
module TDev.RT {
    //? OAuth 2.0 Access Token or Error as described in http://tools.ietf.org/html/rfc6749.
    //@ stem("oauth res") serializable ctx(general,cloudfield,json)
    export class OAuthResponse
        extends RTValue
    {
        private _time: DateTime;
        private _accessToken: string;
        private _expiresIn: number;
        private _scope: string;
        private _error: string;
        private _errorDescription: string;
        private _errorUri: string;
        private _others: StringMap;
        private _code: string;

        // ctx is ignored
        public exportJson(ctx: JsonExportCtx): any {
            return {
                time: this._time && this._time.exportJson(ctx),
                accessToken: this._accessToken,
                expiresIn: this._expiresIn,
                scope: this._scope,
                error: this._error,
                errorDescription: this._errorDescription,
                errorUri: this._errorUri,
                others: this._others && this._others.exportJson(ctx),
            }
        }

        public importJson(ctx: JsonImportCtx, json: any): RT.RTValue {
            if (typeof json != "object") json = undefined;
            this._time = ctx.importDateTime(json, "time");
            this._accessToken = ctx.importString(json, "accessToken");
            this._expiresIn = ctx.importNumber(json, "expiresIn");
            this._scope = ctx.importString(json, "scope");
            this._error = ctx.importString(json, "error");
            this._errorDescription = ctx.importString(json, "errorDescription");
            this._errorUri= ctx.importString(json, "errorUri");
            this._others = ctx.importStringMap(json, this._others, "others");
            return this;
        }

        static parseJSON(json: JsonObject): OAuthResponse {
            var accessToken: string;
            var expiresIn: number = 0;
            var scope: string;
            var isError = false;
            var error: string;
            var errorDescription: string;
            var errorUri: string;
            var others = Collections.create_string_map();
            var keys = json.keys();
            for (var i = 0; i < keys.count(); ++i) {
                var key = keys.at(i);
                var value = json.at(i);
                switch (key) {
                    case "access_token": accessToken = value.to_string(); break;
                    case "expires_in": expiresIn = Math.floor(value.to_number() || -1); break;
                    case "scope": scope = value.to_string(); break;
                    case "error": error = value.to_string(); isError = true; break;
                    case "error_description": errorDescription = value.to_string(); break;
                    case "error_uri": errorUri = value.to_string(); break;
                    case "state": break;
                    default: others.set_at(key, value.to_string()); break;
                }
            }

            if (!accessToken && !isError)
                return undefined; // not a OAuth url
            else if (accessToken && !isError)
                return OAuthResponse.mkAccessToken(accessToken, expiresIn, scope, others);
            else
                return OAuthResponse.mkError(error, errorDescription, errorUri, others);
        }

        static parse_code(redirect_url: string): OAuthResponse {
            var queryIndex = redirect_url.indexOf('?');
            var markerIndex = redirect_url.indexOf('=', queryIndex + 1);
            if (queryIndex < 0 && markerIndex < 0)
                return undefined;

            var code = markerIndex < 0 ? "" : redirect_url.substring(markerIndex + 1, redirect_url.length);
            var error = 'access_denied';
            var errorDescription = 'invalid OAuth url';
            var errorUri = redirect_url;    
            if (code == error)
                return OAuthResponse.mkCodeError(error, errorDescription);
            else
                return OAuthResponse.mkCodeAccessToken(code);
        }

        static mkCodeAccessToken(code: string) : OAuthResponse {
            var r = new OAuthResponse();
            r._code = code;
            return r;
        }

        static mkCodeError(error: string, errorDescription: string): OAuthResponse {
            var r = new OAuthResponse();
            r._error = error;
            r._errorDescription = errorDescription;
            return r;
        }

        static parse(redirect_url: string): OAuthResponse {
            var queryIndex = redirect_url.indexOf('?');
            var markerIndex = redirect_url.indexOf('#', queryIndex + 1);
            if (queryIndex < 0 && markerIndex < 0)
                return undefined;

            var query = queryIndex < 0 ? "" : redirect_url.substring(queryIndex + 1, markerIndex < 0 ? redirect_url.length : markerIndex);
            var marker = markerIndex < 0 ? "" : redirect_url.substring(markerIndex + 1);
            var args = query.split('&').concat(marker.split('&'));
            var accessToken: string;
            var expiresIn: number = 0;
            var scope: string;
            var isError = false;
            var error: string;
            var errorDescription: string;
            var errorUri: string;
            var others = Collections.create_string_map();
            args.forEach((arg) => {
                var ei = arg.indexOf('=');
                if (ei > -1) {
                    var key = Web.url_decode(arg.substring(0, ei));
                    var value = Web.url_decode(arg.substring(ei + 1));
                    switch (key) {
                        case "access_token": accessToken = value; break;
                        case "expires_in": expiresIn = parseInt(value) || -1; break;
                        case "scope": scope = value; break;
                        case "error": error = value; isError = true; break;
                        case "error_description": errorDescription = value; break;
                        case "error_uri": errorUri = value; break;
                        case "state": break;
                        default: others.set_at(key, value); break;
                    }
                }
            });

            if (!accessToken && !isError)
                return undefined; // not a OAuth url
            else if (accessToken && !isError)
                return OAuthResponse.mkAccessToken(accessToken, expiresIn, scope, others);
            else
                return OAuthResponse.mkError(error, errorDescription, errorUri, others);
        }

        static mkAccessToken(accessToken: string, expiresIn: number, scope: string, others : StringMap = null) : OAuthResponse {
            var r = new OAuthResponse();
            r._time = Time.now();
            r._accessToken = accessToken;
            r._expiresIn = expiresIn || 0;
            r._scope = scope;
            r._others = others;
            return r;
        }

        static mkError(error: string, errorDescription: string, errorUri: string, others : StringMap = null): OAuthResponse {
            var r = new OAuthResponse();
            r._time = Time.now();
            r._error = error;
            r._errorDescription = errorDescription;
            r._errorUri = errorUri;
            r._others = others;
            return r;
        }

        public toString()
        {
            var s: string;
            if (this._error)
                s = this._error + ", " + (this._errorDescription || "no description") + ", " + (this._errorUri || "no error uri");
            else
                s = this._accessToken + ", " + this._expiresIn + ", " + (this._scope || "no scope");
            if (this._others)
                s += " ," + this._others.toString();
            return s;
        }

        //? The access token issued by the authorization server.
        public access_token(): string { return this._accessToken; }

        //? (Optional) The lifetime in seconds of the access token.
        public expires_in(): number { return this._expiresIn; }

        //? (Optional) Optional if identical to the scope requested by the client; otherwise, the scope of the access token as described by Section 3.3 of the OAuth 2.0 specification.
        public scope(): string { return this._scope; }

        //? A single ASCII [USASCII] error code.
        public error(): string { return this._error; }

        //? (Optional) A human readable error code.
        public error_description(): string { return this._errorDescription; }

        //? (Optional) A URI identifying a human-readable web page with information about the error, used to provide the client developer with additional information about the error.
        public error_uri(): string { return this._errorUri; }

        //? (Optional) Additional key-value pairs not covered by the OAuth 2.0 specification.
        public others(): StringMap
        {
            if (!this._others)
                this._others = Collections.create_string_map();
            return this._others;
        }

        //? (Optional) Indicates if the token might expire within the next seconds.
        //@ [seconds].defl(100)
        public is_expiring(seconds: number): boolean {
            if (this.is_error()) return true;
            return this._expiresIn > 0 && this._time.add_seconds(this._expiresIn + Math.max(0, seconds)).less(Time.now());
        }

        //? Indicates if this response is an error.
        public is_error(): boolean { return !this._accessToken; }

        //? Displays the response.
        public post_to_wall(s:IStackFrame) : void { super.post_to_wall(s) }
    }
}
