///<reference path='refs.ts'/>
module TDev.RT {
    export interface IProxyResponse {
        response: WebResponse;
        statusCode: number;
    }

    //? An HTTP web request
    //@ stem("request") ctx(general,gckey)
    export class WebRequest
        extends RTValue {
        private _method: string = undefined;
        private _url: string = undefined;
        private _showNotifications: boolean = true;
        private _proxyResponseType: string = undefined;
        constructor () {
            super()
        }
        private _headers: StringMap = new StringMap();
        private _content: any = undefined;
        private _credentialsName: string = undefined;
        private _credentialsPassword: string = undefined;
        private _responseReceived: RT.Event_ = new RT.Event_();

        static mk(url: string, proxyResponseType: string): WebRequest {
            var wr = new WebRequest();
            wr._url = url;
            wr._method = "GET";
            wr._proxyResponseType = proxyResponseType;
            return wr;
        }

        //? Indicates if program notifications should be shown to the user. Default is true.
        public show_notifications(visible: boolean) {
            this._showNotifications = visible;
        }

        public proxyResponseType(): string {
            return this._proxyResponseType;
        }

        //? Gets whether it was a 'get' or a 'post'.
        public method(): string { return this._method; }

        //? Sets the method. Default value is 'get'.
        //@ [method].deflStrings("post", "put", "get", "delete")
        public set_method(method: string): void { this._method = method; }

        //? Gets the url of the request
        public url(): string { return this._url; }

        //? Sets the url of the request. Must be a valid internet address.
        public set_url(url: string): void { this._url = url; }

        //? Gets the value of a given header
        //@ readsMutable
        public header(name: string): string { return this._headers.at(name); }

        //? Sets an HTML header value. Empty string clears the value
        public set_header(name: string, value: string): void {
            if (!value)
                this._headers.remove(name);
            else
                this._headers.set_at(name, value);
        }

        //? Indicates if both requests are the same instance.
        public equals(other: WebRequest): boolean {
            return this == other;
        }

        public toString(): string {
            return this.method() + " " + this.url();
        }

        //? Sets the Accept header type ('text/xml' for xml, 'application/json' for json).
        //@ [type].deflStrings('application/json', 'text/xml')
        public set_accept(type: string) {
            this._headers.set_at("Accept", type);
        }

        //? Displays the request to the wall
        public post_to_wall(s: IStackFrame): void {
            var rt = s.rt;
            if (this._content && this._content.length)
                rt.postBoxedText("Content-Length: " + this._content.length, s.pc);
            var keys = this._headers.keys();
            for (var i = 0; i < keys.count(); ++i) {
                var key = keys.at(i);
                rt.postBoxedText(keys.at(i) + ": " + this._headers.at(key), s.pc);
            }
            if (this._credentialsName || this._credentialsPassword)
                rt.postBoxedText("credentials: " + this._credentialsName, s.pc);
            rt.postBoxedText(this.toString(), s.pc);
        }

        public serializeForProxy() {
            var credentials = undefined;
            if (this._credentialsName || this._credentialsPassword) {
                credentials = {
                    name: this._credentialsName || "",
                    password: this._credentialsPassword || ""
                };
            }
            var headers = this._headers.keys().a.map(k => {
                return { name: k, value: this._headers.at(k) };
            });
            return {
                url: this._url,
                method: this._method,
                contentText: typeof this._content == "string" ? this._content : undefined,
                content: this._content instanceof Uint8Array ? Util.base64EncodeBytes(this._content) : undefined,
                responseType: this._proxyResponseType,
                headers: headers,
                credentials: credentials
            }
        }

        public set_content_type(contentType: string) { this._headers.set_at("Content-Type", contentType); }

        public debuggerChildren(): any {
            var r = {
                'method': this._method,
                'url': this._url,
                'headers': this._headers,
                'content': this._content,
                'user name': this._credentialsName,
                'password': this._credentialsPassword,
                'notifications': this._showNotifications
            };
            return r;
        }

        private mkProxyCrash(proxyResponse: WebResponse): IProxyResponse {
            return {
                statusCode: proxyResponse.status_code(),
                response : WebResponse.mkCrash(this)
            };
        }

        private sendViaProxyAsync(): Promise { // ProxyResponse
            if (!Util.check(!!this._proxyResponseType)) return Promise.as(<IProxyResponse>{ statusCode: 0, response: WebResponse.mkCrash(this) });
            var proxy = WebRequest.mk(Cloud.getPrivateApiUrl("runtime/web/request"), undefined);
            proxy.set_method("POST");
            proxy.set_content(JSON.stringify(this.serializeForProxy()))
            return proxy.sendAsync().then(proxyResponse => {
                switch (proxyResponse.status_code()) {
                    case 502:
                        if (this._showNotifications)
                            HTML.showProxyNotification("Proxy Error: Could not perform web request. " + Cloud.onlineInfo(), this._url);
                        return this.mkProxyCrash(proxyResponse);
                    case 503:
                        if (this._showNotifications)
                            HTML.showProxyNotification("Proxy Error: Could not perform web request. Did you transfer a lot of data recently? (code 503)", this._url);
                        return this.mkProxyCrash(proxyResponse);
                    case 403:
                        Cloud.accessTokenExpired();
                        if (this._showNotifications)
                            HTML.showProxyNotification("Proxy Error: Could not perform web request; access denied; your access token might have expired.", this._url);
                        return this.mkProxyCrash(proxyResponse);
                    case 504:
                        if (this._showNotifications)
                            HTML.showProxyNotification("Proxy Error: Could not perform web request. Response too big.  (code 504)", this._url);
                        return this.mkProxyCrash(proxyResponse);
                    case 400:
                        if (this._showNotifications)
                            HTML.showProxyNotification("Proxy Error: Malformed inputs: " + Util.decodeErrorMessage(proxyResponse.header("ErrorMessage")), this._url);
                        return this.mkProxyCrash(proxyResponse);
                    default:
                        return <IProxyResponse>{
                            statusCode: proxyResponse.status_code(),
                            response: WebResponse.mkProxy(this, JSON.parse(proxyResponse.content()))
                        };
                }
            });
        }
        private prepareAndSend(client: XMLHttpRequest) {
            if (this._credentialsName || this._credentialsPassword) {
                client.open(this.method().toUpperCase(), this.url(), true, this._credentialsName || "", this._credentialsPassword || "");
                client.withCredentials = true;
            }
            else
                client.open(this.method().toUpperCase(), this.url(), true);
            // for some reason WebWorkers don't have FormData
            var isForms = !isWebWorker && !!this._content && this._content instanceof FormData;
            var keys = this._headers.keys();
            for (var i = 0; i < keys.count(); ++i) {
                var header = keys.at(i);
                if (isForms && /^content-type$/i.test(header)) continue; // content-type set by browser when sending form
                var headerValue = this._headers.at(header);
                client.setRequestHeader(header, headerValue);
                if (/^accept$/i.test(header) && /^image\/|^audio\//i.test(headerValue)) {
                    client.responseType = 'arraybuffer';
                }
            }
            Time.log(this.toString());
            client.send(this._content);
        }

        public sendAsync(): Promise {
            return this.sendCoreAsync();
        }

        public sendCoreAsync(): Promise {
            var request = this;
            return new Promise((onSuccess: (v: any) => any, onError: (v: any) => any, onProgress: (v: any) => any) => {
                // quick check for connectivity
                if (Cloud.isOffline()) {
					if (request._showNotifications)
	                    HTML.showNotificationText('Web request failed, please connect to Internet.');
                    onSuccess(WebResponse.mkCrash(request));
                    return;
                }

                var onCORS = function () {
                    if (request._proxyResponseType) // CORS exception happened, and we are allowed to proxy
                    {
                        Cloud.authenticateAsync(lf("web request proxying"))
                            .done((authenticated) => {
                                if (!authenticated) onSuccess(WebResponse.mkCrash(request));
                                else request.sendViaProxyAsync().then((r: IProxyResponse) => {
                                    // expired token?
                                    if (r.statusCode == 403) {
                                        // try to regresh token...
                                        Cloud.authenticateAsync(lf("web request proxying"))
                                            .done((authenticated) => {
                                                if (!authenticated) onSuccess(WebResponse.mkCrash(request));
                                                else request.sendViaProxyAsync().then((r: IProxyResponse) => onSuccess(r.response), e => onError(e));
                                            });
                                    } else onSuccess(r.response)
                                }, e => onError(e));
                            });
                    }
                    else {
                        if (request._showNotifications)
                            HTML.showCorsNotification(request.url());
                        onSuccess(WebResponse.mkCrash(request));
                    }
                }

                // calls from HTTPS to HTTP never work and don't call "onerror" in Chrome 38+
                if (Web.proxy(this.url()) != this.url() &&
                    /^https:\//i.test(document.URL) && /^http:\//.test(this.url())) {
                    onCORS();
                    return
                }

                try {
                    var client: XMLHttpRequest = new XMLHttpRequest();
                    client.onerror = (e: ErrorEvent) => {
                        Time.log('error with ' + this.toString());
                    }
                    client.onreadystatechange = () => {
                        if (client.readyState == (XMLHttpRequest.DONE || 4)) {
                            if (client.status == 0)
                                onCORS();
                            else {
                                var r = WebResponse.mk(request, client);
                                onSuccess(<any>r);
                            }
                        }
                    };
                    request.prepareAndSend(client);
                } catch (e) {
                    onCORS();
                }
            });
        }

        public testCORSAsync(): Promise {
            if (Web.proxy(this._url) == this._url) return Promise.as(false);

            var request = this;
            return new Promise((onSuccess: (v: any) => any, onError: (v: any) => any, onProgress: (v: any) => any) =>
            {
                try {
                    var client: XMLHttpRequest = new XMLHttpRequest();
                    client.onerror = (e: ErrorEvent) => Time.log('error with ' + this.toString());
                    client.onreadystatechange = () =>
                    {
                        if (client.readyState == (XMLHttpRequest.DONE || 4)) {
                            onSuccess(client.status == 0);
                        }
                    };
                    request.prepareAndSend(client);
                } catch (e) {
                    onSuccess(true);
                }
            });
        }

        //? User ``send`` instead
        //@ cap(network) flow(SinkWeb) hidden
        public send_async(s: IStackFrame) {
            this.sendAsync().then((response: WebResponse) =>
            {
                if (this._responseReceived && this._responseReceived.handlers)
                    s.rt.queueLocalEvent(this._responseReceived, [response]);
            }, (e) =>
            {
                var r = WebResponse.mkCrash(this);
                if (this._responseReceived && this._responseReceived.handlers)
                    s.rt.queueLocalEvent(this._responseReceived, [r]);
            });
        }

        //? Use ``send`` instead
        //@ ignoreReturnValue hidden
        public on_response_received(handler:WebResponseAction) : EventBinding {
            return this._responseReceived.addHandler(handler);
        }

        //? Performs the request synchronously
        //@ async cap(network) flow(SinkWeb) returns(WebResponse)
        public send(r: ResumeCtx) {
            this.sendAsync().then((response: WebResponse) =>
            {
                r.resumeVal(response);
            }, e => {
                r.resumeVal(WebResponse.mkCrash(this));
            });
        }

        //? Sets the content of a 'post' request
        public set_content(content: string): void {
            this._content = content;
            this.set_content_type("text/plain; charset=utf-8");
        }

        //? Sets the content of a 'post' request as the JSON tree
        public set_content_as_json(json: JsonObject): void {
            this.set_content(json.toString());
            this.set_content_type("application/json; charset=utf-8");
        }

        //? Sets the content of a 'post' request as a binary buffer
        public set_content_as_buffer(bytes: Buffer): void {
            this._content = bytes.buffer;
            this.set_content_type("application/octet-stream");
        }

        //? Sets the content as multipart/form-data.
        public set_content_as_form(form: FormBuilder): void {
            this._content = form.data();
            // set by browser
            // this.set_content_type("multipart/form-data");
            if (/^get$/i.test(this.method()))
                this.set_method("post");
        }

        //? Sets the content of a 'post' request as a JPEG encoded image. Quality from 0 (worse) to 1 (best).
        //@ [quality].defl(0.85) picAsync
        public set_content_as_picture(pic: Picture, quality: number, r:ResumeCtx): void {
            pic.loadFirst(r, () => {
                this.setContentAsPictureInternal(pic, quality);
            })
        }

		public setContentAsSoundInternal(snd : Sound) : void {
			var url = snd.getDataUri();
			if (url) {
				var mimeType = Sound.dataUriMimeType(url);
				var bytes = Util.decodeDataURL(url, mimeType);
				if (bytes) {
					this._content = bytes;
					this.set_content_type(mimeType);
				}
			}
		}

        public setContentAsPictureInternal(pic: Picture, quality: number, forceJpeg = false): void
        {
            quality = Math_.normalize(quality);
            var mimeType = (quality >= 1 && !forceJpeg) ? "image/png" : "image/jpeg";
            var jpegUrl = pic.getDataUri(quality, -1, forceJpeg);
            var bytes = Util.decodeDataURL(jpegUrl, mimeType);
            if (bytes) {
                this._content = bytes;
                this.set_content_type(mimeType);
            }
        }

        //? Sets the content of a 'post' request as the XML tree
        //@ import("npm", "xmldom", "0.1.*")
        public set_content_as_xml(xml: XmlObject): void {
            this.set_content(xml.toString());
            this.set_content_type("text/xml; charset=utf-8");
        }

        //? Sets the name and password for basic authentication. Requires an HTTPS URL, empty string clears.
        public set_credentials(name: string, password: string): void {
            if (!this.url().match(/^https:\/\//i))
                Util.userError(lf("Web Request->set credentials requires a secure HTTP url (https)"));
            this._credentialsName = name;
            this._credentialsPassword = password;
        }

        //? Gets the names of the headers
        //@ readsMutable
        public header_names(): Collection<string> {
            return this._headers.keys();
        }

        //? Compresses the request content with gzip and sets the Content-Encoding header
        //@ [value].defl(true)
        //@ obsolete
        public set_compress(value: boolean): void { }
    }
}
