///<reference path='refs.ts'/>
module TDev.RT {
    //? An HTTP web response to be returned
    //@ stem("resp") ctx(general,gckey) betaOnly
    export class ServerResponse
        extends RTValue
    {
        private _headers: StringMap = new StringMap();
        private _content: any;
        private _restResult: any;
        private _statusCode = 200;

        constructor(private _request:ServerRequest, private _proxy?: PromiseInv)
        {
            super()
        }

        //? Gets the value of a given header
        //@ readsMutable
        public header(name: string): string { return this._headers.at(name); }

        //? Sets an HTTP header value. Empty string clears the value
        public set_header(name: string, value: string): void {
            if (!value)
                this._headers.remove(name.toLowerCase());
            else
                this._headers.set_at(name.toLowerCase(), value);
        }

        //? Gets the request associated to this response
        public request(): ServerRequest { return this._request; }

        //? Gets the HTTP Status code of the response (defaults to 200)
        public status_code(): number { return this._statusCode; }

        //? Sets the HTTP Status code of the response (defaults to 200)
        //@ [code].defl(403)
        public set_status_code(code:number): void
        {
            this._statusCode = code;
        }

        //? Indicates if both responses are the same instance.
        public equals(other: ServerResponse): boolean {
            return this == other;
        }

        public toString()
        {
            return "Response to " + this._request.toString()
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
            rt.postBoxedText(this.toString(), s.pc);
        }

        //? Sets the 'Content-Type' HTTP header; call after `->set_content...`
        //@ [type].deflStrings('text/html', 'picture/jpeg', 'picture/png')
        public set_content_type(type: string) {
            this._headers.set_at("Content-Type", type);
        }

        //? Sets the content of the response
        public set_content(content: string): void {
            this._content = content;
            this.set_content_type("text/plain; charset=utf-8");
        }

        //? Sets the content of the response as the JSON tree
        public set_content_as_json(json: JsonObject): void {
            this.set_content(json.toString());
            this.set_content_type("application/json; charset=utf-8");
        }

        //? Sets the content of the response as a binary buffer
        public set_content_as_buffer(bytes: Buffer): void {
            this._content = (<any>bytes).toNodeBuffer();
            this.set_content_type("application/octet-stream");
        }

        //? Sets the content of the response as the XML tree
        //@ import("npm", "xmldom", "0.1.*")
        public set_content_as_xml(xml: XmlObject): void {
            this.set_content(xml.toString());
            this.set_content_type("text/xml; charset=utf-8");
        }

        //? Gets the names of the headers
        //@ readsMutable
        public header_names(): Collection<string> {
            return this._headers.keys();
        }

        public addRestResult(name:string, v:any)
        {
            if (!this._restResult)
                this._restResult = {}
            this._restResult[name] = Runtime.toRestArgument(v, this._request._stackframe);
        }

        static toUtfBuffer: (s:string) => any;

        public sendNow()
        {
            var resp = this.request().getNodeRequest().tdResponse
            var headers = this._headers.items
            var data = this._content

            // if this is a proxy for a websocket operation, call given handler instead of sending the data
            if (this._proxy) {
                return this._proxy.success(this._restResult || {});
            }

            if (data == undefined && this.request().header("TouchDevelop-Accept") == "text/plain") {
                if (!headers["content-type"])
                    headers["content-type"] = "text/plain"
                data = Util.values(this._restResult || {}).map(v => v + "").join(";")
            } else if (data === undefined) {
                var format = parseInt(this.request().query("x-td-format") || "0")
                format = Util.between(0, format, 8)
                if (format)
                    data = JSON.stringify(this._restResult || {}, null, format)
                else
                    data = JSON.stringify(this._restResult || {})
                if (!headers["content-type"])
                    headers["content-type"] = "application/json; charset=utf-8"
            } else {
                if (this._restResult)
                    Util.userError(lf("set_content_... cannot be called on the response object when action has result(s)"))
            }


            if (typeof data == "string")
                data = ServerResponse.toUtfBuffer(data)

            if (!headers["content-length"])
                headers["content-length"] = data.length

            resp.writeHead(this._statusCode, headers)
            resp.end(data)

            this.request().stopHandle();
        }
    }
}
