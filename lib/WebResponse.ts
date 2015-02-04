///<reference path='refs.ts'/>
module TDev.RT {
    //? An HTTP web response
    //@ stem("response") ctx(general,gckey)
    export class WebResponse
        extends RTValue
    {
        private _request: WebRequest = undefined;
        private _content: any = undefined;
        private _statusCode: number = undefined;
        private _binaryContent: any = undefined;
        constructor() {
            super()
        }
        private _headers: StringMap = new StringMap();

        static mkCrash(request: WebRequest): WebResponse {
            var r = new WebResponse();
            r._request = request;
            r._statusCode = 0;
            r._content = undefined;
            return r;
        }

        static mkProxy(request: WebRequest, proxyResponse: any) : WebResponse
        {
            var r = new WebResponse();
            r._request = request;
            r._statusCode = proxyResponse.code;
            var headers = proxyResponse.headers;
            if (headers)
                headers.forEach(h => r._headers.set_at(h.name.toLowerCase(), h.value));
            if (proxyResponse.forceText || request.proxyResponseType() == "text") r._content = proxyResponse.contentText;
            else r._content = atob(proxyResponse.content);
            r._binaryContent = proxyResponse.binaryContent
            return r;
        }
        static mk(request: WebRequest, xrequest : XMLHttpRequest) : WebResponse
        {
            var r = new WebResponse();
            r._request = request;
            r._statusCode = xrequest.status;
            Util.forEachResponseHeader(xrequest, (name, value) => r._headers.set_at(name.toLowerCase(), value));
            if (r._statusCode == 0) // CORS exception happened
            {
                HTML.showCorsNotification(request.url());
                r._content = undefined;
            }
            else {
                r._content = xrequest.response;
            }
            return r;
        }

        //? Gets the request associated to this response
        public request(): WebRequest { return this._request; }

        //? Gets the HTTP Status code of the request if any
        public status_code(): number { return this._statusCode; }

        //? Reads the response body as a string
        public content(): string { return <string>this._content; }

        public contentAsArraybuffer() : Uint8Array {
            if (this._binaryContent)
                return this._binaryContent;
            if (!this._content) return null;
            return new Uint8Array(this._content);
        }

        //? Reads the response body as a Buffer.
        public content_as_buffer(): Buffer {
            var arr = this.contentAsArraybuffer();
            if (arr) return Buffer.fromTypedArray(arr);
            return undefined;
        }

        //? Reads the response body as a JSON tree
        public content_as_json(): JsonObject
        {
            if (this.content())
                return JsonObject.mk(this.content(), Time.log);
            return undefined;
        }

        public toString(): string {
            return this.status_code() + " --> " + this.request().toString();
        }

        //? Reads the response body as a picture
        //@ returns(Picture) async
        public content_as_picture(r : ResumeCtx) // : Picture
        {
            var bytes = this.contentAsArraybuffer();
            if (!bytes)
                r.resumeVal(undefined);
            else {
                var img = document.createElement('img');
                img.onload = (e) => {
                    var pic = Picture.fromImage(img);
                    URL.revokeObjectURL(img.src); // Clean up after yourself.
                    r.resumeVal(pic);
                };
                img.onerror = (e) => {
                    r.resumeVal(undefined);
                }
                img.src = URL.createObjectURL(new Blob([bytes.buffer], { type: 'application/octect-stream' }));
            }
        }

        //? Reads the response body as a wave sound
        //@ stub
        public content_as_sound() : Sound
        { return undefined; }

        //? Reads the response body as a XML tree
        //@ import("npm", "xmldom", "0.1.*")
        public content_as_xml(): XmlObject
        {
            if (this.content())
                return XmlObject.mk(this._content);
            return undefined;
        }

        //? Gets the value of a given header
        public header(name: string): string { return this._headers.at(name.toLowerCase()); }

        //? Gets the names of the headers
        public header_names(): Collection<string> { return this._headers.keys(); }

        //? Displays the response to the wall
        public post_to_wall(s : IStackFrame): void
        {
            var rt = s.rt;
            rt.postBoxedText(this.toString(), s.pc);
            var keys = this._headers.keys();
            for (var i = 0; i < keys.count(); ++i) {
                var key = keys.at(i);
                rt.postBoxedText(keys.at(i) + ": " + this._headers.at(key), s.pc);
            }
            if (this.content())
                rt.postBoxedText(this.content(), s.pc);
        }

        public debuggerChildren(): any {
            var r = {
                'status code' : this._statusCode,
                'headers': this._headers,
                'content': this._content,
                'request': this._request
            };
            return r;
        }
    }
}
