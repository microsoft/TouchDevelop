///<reference path='refs.ts'/>
module TDev.RT {
    //? An incomming HTTP web request
    //@ stem("request") ctx(general,gckey) betaOnly
    export class ServerRequest
        extends RTValue
    {
        private _req:any;
        private _headers: StringMap = new StringMap();
        private _querystring: StringMap = new StringMap();
        private _content: any = undefined;
        private _url:string;
        private _isText:boolean;
        private _jsonBody:any;
        private _response:ServerResponse;
        private _startTime:number;
        private _startHandleTime:number;
        private _id: string;
        public _user: User;
        public _onStop: PromiseInv;
        public _api_path: string;
        public _stackframe: IStackFrame;


        static mk(req: any, _proxy?: PromiseInv)
        {
            var r = new ServerRequest()
            r._id = Random.uniqueId(12)
            r._headers = StringMap.mk(req.headers)
            r._querystring = StringMap.mk(req.tdQueryString)
            r._req = req
            r._startTime = Date.now()
            var proto = "http"
            if (_proxy)
                proto = "ws"
            if (req.headers['x-forwarded-proto'] === 'https' || req.headers['x-arr-ssl'] || req.connection.encrypted)
                proto = "https"
            r._url = proto + "://" + (req.headers.host || "unknown") + req.url
            r._response = new ServerResponse(r, _proxy)
            return r
        }

        public startHandle()
        {
            this._startHandleTime = Date.now()
            this.log(this.toString())
        }

        public stopHandle()
        {
            var n = Date.now()
            var t0 = (n - this._startHandleTime) / 1000
            var t1 = (this._startHandleTime - this._startTime) / 1000
            if (this._onStop !== undefined) {
                this._onStop.success(true);
            }
            this.log(Util.fmt("status={0} [{1}s prep, {2}s exec]",  this._response.status_code(), t1, t0))
        }

        public log(msg:string)
        {
            App.log("[req:" + this._id + (this._user ? ":" + this._user.id() : "") + "] " + msg)
        }

        public getNodeRequest() { return this._req }

        public recvContentAsync()
        {
            var r = new PromiseInv()
            var contentType = this.header("content-type") || "application/octet-stream"
            contentType = contentType.replace(/;.*/, "")
            this._isText = /^text\//.test(contentType) || contentType == "application/json"
            var req = this._req

            if (this._isText) {
                var acc = ""
                req.setEncoding("utf8")
                req.on("data", buf => acc += buf)
                req.on("end", () => {
                    this._content = acc
                    if (contentType == "application/json") {
                        var obj = JsonObject.mk(this._content, Time.log)
                        this._jsonBody = obj.value()
                    }
                    r.success(null)
                })
            } else {
                var bufs = []
                var len = 0
                req.on("data", buf => {
                    bufs.push(buf)
                    len += buf.length
                })
                req.on("end", () => {
                    var bf = new Uint8Array(len)
                    var pos = 0
                    bufs.forEach(buf => {
                        for (var i = 0; i < buf.length; ++i)
                            bf[pos++] = buf[i]
                    })
                    this._content = Buffer.fromTypedArray(bf)
                    r.success(null)
                })
            }

            return r
        }

        public getRestArgument(name:string, tp:string, s:IStackFrame):any
        {
            if (tp == "Server Request")
                return this

            if (tp == "Server Response")
                return this.response()

            var v = this.query(name)
            if (v === undefined && this._jsonBody) v = this._jsonBody[name];
            if (v === undefined) return undefined;
            return Runtime.fromRestArgument(v, tp, s)
        }

        //? Gets the associated response
        public response():ServerResponse
        {
            return this._response
        }

        //? Reads the request body as a string
        public content(): string
        {
            if (typeof this._content == "string")
                return this._content
            return undefined
        }

        //? Reads the request body as a binary buffer
        public content_as_buffer(): Buffer
        {
            if (this._content instanceof RT.Buffer)
                return this._content
            return undefined
        }

        //? Reads the request body as a JSON tree
        public content_as_json(): JsonObject
        {
            if (this._jsonBody)
                return JsonObject.wrap(this._jsonBody)
            return undefined;
        }

        //? Gets whether it was a 'get', 'post', 'put', 'delete', 'options', etc.
        public method(): string { return this._req.method.toLowerCase(); }

        //? Gets the url of the request
        public url(): string { return this._url; }

        //TODO expose?
        public api_path(): string { return this._req.tdApiPath; }

        //? Gets the value of a given header
        //@ readsMutable
        public header(name: string): string { return this._headers.at(name.toLowerCase()); }

        //? Gets the value of a given query string parameter
        //@ readsMutable
        public query(name: string): string { return this._querystring.at(name); }

        //? Indicates if both requests are the same instance.
        public equals(other: ServerRequest): boolean {
            return this == other;
        }

        public toString(): string {
            return this.method() + " " + this.url();
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

        //? Gets the names of the headers
        //@ readsMutable
        public header_names(): Collection<string> {
            return this._headers.keys();
        }

        //? Gets the names of the query string parameters
        //@ readsMutable
        public query_names(): Collection<string> {
            return this._querystring.keys();
        }

        public setJsonBody(json: any) {
            this._jsonBody = json;
        }

        //? Get the user who sent this request
        //@ dbgOnly
        public user() : User
        {
            return this._user;
        }
    }
}
