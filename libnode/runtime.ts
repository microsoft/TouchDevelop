///<reference path='refs.ts'/>

declare var unescape : (s:string) => string;

module TDev.RT.Node {
    if (typeof require === "undefined") {
        // running in a brower; prevent a crash
        (<any>window).require = (name:string) => { return <any>{} }
    }

    var fs = require("fs");
    var crypto = require("crypto")
    var querystring = require("querystring")
    var url = require("url")
    var util = require("util")
    var http = require("http")
    var https = require("https")
    var zlib = require("zlib")
    var Buffer;
    var webSocketModule;

    function setupGlobalAgent() {
        var maxSock = 15

        var Agent = http.Agent
        var AgentSSL = https.Agent

        function buildAgent(self) {
          self.removeAllListeners('free')
          self.on('free', function(socket, host, port) {
            var name = host + ':' + port
            if (self.requests[name] && self.requests[name].length) {
              //RT.App.log("socket: free for " + name + " - immediate reuse, len: " + self.requests[name].length)
              self.requests[name].shift().onSocket(socket)
            } else {
              //RT.App.log("socket: free for " + name + " - save for later")
              // if an error happens while we don't use the socket anyway, meh, throw the socket away
              var onIdleError = function() {
                socket.destroy()
              }
              socket._onIdleError = onIdleError
              socket.on('error', onIdleError)
            }
          })

          self.addRequestNoreuse = self.addRequest
          self.addRequest = function(req, host, port) {
            var name = host + ':' + port
            var socks = this.sockets[name]
            if (socks) {
              for (var i = 0; i < socks.length; ++i) {
                var idleSocket = socks[i]
                if (idleSocket._onIdleError) {
                  idleSocket.removeListener('error', idleSocket._onIdleError)
                  delete idleSocket._onIdleError
                  req._reusedSocket = true
                  req.onSocket(idleSocket)
                  //RT.App.log("socket: reuse for " + name + " (out of " + socks.length + ")")
                  return
                 }
               }
            }

            //RT.App.log("socket: create new for " + name + " (out of " + (socks ? socks.length : "NA") + "/" + this.maxSockets + ")")
            this.addRequestNoreuse(req, host, port)
          }
        }

        function ReuseAgent(options) {
          Agent.call(this, options)
          buildAgent(this)
        }
        util.inherits(ReuseAgent, Agent)

        function ReuseAgentSSL(options) {
          AgentSSL.call(this, options)
          buildAgent(this)
        }
        util.inherits(ReuseAgentSSL, AgentSSL)

        if (/^v0\.10/.test(process.version))
            mkAgent = p => p == "https:" ? new ReuseAgentSSL({ maxSockets: maxSock }) : new ReuseAgent({ maxSockets: maxSock })
        else
            mkAgent = p => p == "https:" ? new AgentSSL({ maxSockets: maxSock, keepAlive: true }) : new Agent({ maxSockets: maxSock, keepAlive: true })

        httpAgent = http.globalAgent = mkAgent("http:")
        httpsAgent = https.globalAgent = mkAgent("https:")
    }

    export var httpAgent:any, httpsAgent:any;
    export var mkAgent : (protocol:string) => any;


    export var logInfo: (s:string) => void = s => Util.log(s);
    export var logError: (s:string) => void = s => Util.log("error: " + s);
    export var handleError: (err:any) => void = err => {
        if (err.rtProtectHandled)
            return
        RT.App.logException(err)
    }

    class FsTable implements Storage.Table
    {
        private cache:TDev.StringMap<string> = {};
        private path:string;
        private numWrites = 0;

        private encode(s: string) {
            return s.replace(/[^a-z0-9\-]/g, (c) => "_" + ("0000" + c.charCodeAt(0).toString(16)).slice(-4));
        }
        private decode(s:string) {
            return s.toLowerCase().replace(/_([0-9a-f]{4})/g, (a, b) => String.fromCharCode(parseInt(b, 16)))
        }

        public getValueAsync(key: string): Promise {
            if (this.cache.hasOwnProperty(key))
                return Promise.as(this.cache[key]);

            var prevWrites = this.numWrites

            var r = new PromiseInv()
            fs.readFile(this.path + this.encode(key), "utf8", (err, data) => {
                if (err) r.success(undefined)
                else {
                    if (data.length < 256 && this.numWrites == prevWrites)
                        this.cache[key] = data;
                    r.success(data)
                }
            })
            return r
        }

        public getItemsAsync(keys: string[]): Promise {
            var items = {};
            var promises = keys.map(k => this.getValueAsync(k).then(v => items[k] = v))
            return Promise.join(promises).then(v => items)
        }

        public getKeysAsync(): Promise {
            var r = new PromiseInv()
            fs.readdir(this.path, (err, files) => {
                if (err) r.error(err)
                else r.success(files.map(s => this.decode(s)))
            })
            return r
        }

        private setItemAsync(key:string, val:string): Promise {
            var r = new PromiseInv()

            //Util.log("FsTable Setting {0} encoded in {1} to ", key, this.encode(key), val);

            var temp = this.path + Random.uniqueId()
            fs.writeFile(temp, val, (err) => {
                if (err) r.error(err)
                else
                    fs.rename(temp, this.path + this.encode(key), (err) => {
                        if (err) r.error(err)
                        else {
                            if (val.length < 256) this.cache[key] = val
                            else delete this.cache[key]
                            this.numWrites++
                            r.success(null)
                        }
                    })
            })

            return r
        }

        public setItemsAsync(items: any): Promise {
            var keys = Object.keys(items)
            if (keys.length == 1)
                return this.setItemAsync(keys[0], items[keys[0]])
            else
                return Promise.join(Object.keys(items).map(k => this.setItemAsync(k, items[k]))).then(v => null)
        }

        constructor(public tableName: string) {
            this.path = "data/" + this.tableName + "/";
            if (!fs.existsSync("data"))
                fs.mkdirSync("data")
            if (!fs.existsSync(this.path))
                fs.mkdirSync(this.path)
        }
    }




    export class TheNodeRuntime
        extends Runtime
    {
        private routes:any = {}
        private restInits:any[] = [];
        private mainActionRef:any = null;
        public nodeModules: any = {};
        public initPromise:Promise;
        public requestHandler: (req:any, resp:any) => void;

        constructor(public nodeHost:RunnerHost, public wsServer:WebSocketServerWrapper)
        {
            super(new Revisions.Sessions(wsServer))
        }

        public initPageStack()
        {
        }

        public getUserId(): string {
            return Cloud.getUserId();
        }

        public postBoxedText(s:string) : TDev.WallBox
        {
            TDev.Util.log("WALL: " + s);
            return undefined;
        }

        public postBoxedTextWithTap(s:string, rtV: any) : TDev.WallBox
        {
            return this.postBoxedText(s);
        }

        public dispatchServerRequest(req:ServerRequest, promise?: Promise): Promise
        {
            var path = unescape(req._api_path.replace(/\+/g, "%20"))
            var path0 = path
            Util.log("path: {0}", path);

            while (true) {
                path = path.replace(/\/+$/, "")
                if (this.routes.hasOwnProperty(path))
                    break
                if (path == "") {
                    return Promise.wrapError(new Error("No such API: " + path0));
                }

                path = path.replace(/[^\/]+$/, "")
            }

            var fn = this.routes[path]
            req._api_path = path

            this.queueAsyncStd((rt, args) => {
                req.startHandle();
                var bot = new StackBottom(this);
                var lc = fn(bot)
                lc.needsPicker = true
                var f = lc.invoke(lc, Runtime.pumpEvents)
                f.serverRequest = req
                req._stackframe = f
                return this.enter(f)
            });
            return Promise.as(promise);
        }

        public queueAsyncStd(cb) {
            this.queueEventCallback((rt, args) => {
                this.queueAsyncEvent(() => cb(rt, args));
            });
        }

        public queueAsync(cb) {
            this.queueAsyncStd((rt, args) => {
                cb();
                var bot = new StackBottom(this);
                this.current = bot;
                return Runtime.pumpEvents;
            });
        }


        public queueActionCall(service: string, action: string, params: any, socket: any): Promise {
            var promise = new PromiseInv();

            var url = service + "/" + action;
            var req = {
                method: "WS",
                url: url,
                socket: socket,
                _stackframe: undefined
            }
            var fn = this.routes[service+"/"+action]

            var ev = new Event_();
            ev.addHandler(new RT.PseudoAction((rt: Runtime, args: any[]) => {
                this.queueAsyncEvent(() => {
                    var bot = new StackBottom(this);
                    var lc = fn(bot)
                    lc.needsPicker = true
                    var f = lc.invoke(lc, Runtime.pumpEvents)
                    f.serverRequest = req
                    req._stackframe = f
                    return this.enter(f)
                })
            }))
            this.queueLocalEvent(ev)

            return promise;
        }

        public addRestRoute(name:string, fn:(s:IStackFrame) => any)
        {
            this.routes[name] = fn
        }

        public addRestInit(fn:(s:IStackFrame) => any)
        {
            this.restInits.push(fn)
        }

        public setMainAction(fn:(s:IStackFrame) => any)
        {
            this.mainActionRef = fn;
        }

        public hasInits() { return this.restInits.length > 0 }

        public queueInits()
        {
            var queue = fn => {
                var lifted = (bot, retAddr) => {
                    // App.log("running an _init action")
                    var lc = fn(bot)
                    return lc.invoke(lc, retAddr)
                }
                var ev = new Event_()
                ev.addHandler(<any>lifted)
                this.queueLocalEvent(ev)
            }

            if (this.hasInits())
                this.restInits.forEach(queue)
            else if (this.mainActionRef)
                queue(this.mainActionRef)
        }


        public handleException(e:any)
        {
            if (this.quietlyHandleError(e))
                return

            if (e.programCounter)
                this.errorPC = e.programCounter;

            this.host.exceptionHandler(e);
            this.restartAfterException()
        }
    }

    export class RunnerHost
        extends HeadlessHost
        implements TDev.RuntimeHost
    {
        public isServer = true;
        public localProxyAsync: (path: string, data: any) => Promise; // of any

        public respondToCrash(bug:BugReport)
        {
            var req = this.currentRt.getRestRequest()
            if (!req) return
            // HTTP cloud op
            try {
                var resp = req.getNodeRequest().tdResponse
                resp.writeHead(500)
                resp.end("Whoops, " + bug.exceptionMessage)

            // WS cloud op
            } catch (e) {
                var ses = <Revisions.ServerSession>this.currentRt.sessions.CurrentSession;
                ses.abortCurrentTransaction(bug);
            }

            logError("CRASH DETAILS: " + bug.exceptionMessage + "\n" + bug.stackTrace)
        }

        public log(s: string) {
            App.log(s);
        }

        public fillCrashInfo(crash:RuntimeCrash)
        {
            var req = this.currentRt.getRestRequest()
            crash.url = req ? req.url() : null;
        }

        constructor(wsServer: WebSocketServerWrapper) {
            super()
            this.currentRt = new TheNodeRuntime(this, wsServer);
            this.localProxyAsync = LocalShell.localProxyHandler();
            App.log('node runtime initialized');
        }
    }


    var host: RunnerHost;

    export function httpRequestStreamAsync(url_:string, method:string = "GET", body:string = undefined, contentType:string = null) : Promise
    {
        var parsed = url.parse(url_)
        parsed.method = method.toUpperCase()

        var req;
        if (parsed.protocol == "http:") {
            req = http.request(parsed)
        } else if (parsed.protocol == "https:") {
            req = https.request(parsed)
        } else {
            Util.oops("unknown node.js protocol " + parsed.protocol + " in " + url_)
        }

        var ret = new PromiseInv()

        if (contentType)
            req.setHeader("content-type", contentType)

        req.on("error", err => {
            //console.log(err)
            ret.error(err)
        })

        req.on("response", (res) => {
            if (res.statusCode == 200) {
                if (/gzip/.test((<any>res).headers['content-encoding'])) {
                    var g = zlib.createUnzip(undefined);
                    (<any>res).pipe(g);
                } else {
                    g = res;
                }

                ret.success(g)

            } else {
                ret.error("bad status code " + res.statusCode)
            }
        })

        if (body !== undefined)
            req.end(body, "utf8")
        else
            req.end()

        return ret
    }

    function httpRequestAsync(url_:string, method:string = "GET", body:string = undefined, contentType:string = null) : Promise
    {
        return httpRequestStreamAsync(url_, method, body, contentType)
            .then(g => {
                if (g.setEncoding)
                    g.setEncoding('utf8');

                var ret = new PromiseInv()
                var d = "";
                g.on('data', (c) => { d += c });
                g.on('end', () => { ret.success(d) })

                return ret
            })
    }

    function webRequestAsync(r:WebRequest)
    {
        var parsed = url.parse(r.url())
        parsed.method = r.method().toUpperCase()

        var j = r.serializeForProxy()

        parsed.headers = {}
        j.headers.forEach(h => parsed.headers[h.name] = h.value)

        if (j.credentials)
            parsed.auth = j.credentials.name + ":" + j.credentials.password

        var data;

        if (typeof j.contentText == "string")
            data = new Buffer(j.contentText, "utf8")
        else if (typeof j.content == "string")
            data = new Buffer(j.content, "base64")
        else
            data = new Buffer("", "binary")

        if (data.length > 0)
            parsed.headers['content-length'] = data.length

        if (!parsed.headers['connection'])
            parsed.headers['connection'] = 'keep-alive';

        var req;
        if (parsed.protocol == "http:") {
            parsed.agent = httpAgent
            req = http.request(parsed)
        } else if (parsed.protocol == "https:") {
            parsed.agent = httpsAgent
            req = https.request(parsed)
        } else {
            Util.userError("unknown request protocol " + parsed.protocol + " in " + r.url())
        }

        var ret = new PromiseInv()

        req.on("error", err => {
            //console.log(err)
            App.log("Web request error: " + err)
            ret.error(err)
        })

        req.on("response", (res) => {
            var stream = res

            var encoding = (res.headers['content-encoding'] || "").toLowerCase()
            if (encoding == "gzip")
                stream = stream.pipe(zlib.createGunzip())
            else if (encoding == "deflate")
                stream = stream.pipe(zlib.createInflate())

            var buffers = []
            stream.on('data', b => {
                buffers.push(b)
            })
            stream.on('end', () => {
                var buf = Buffer.concat(buffers)
                var content = r.proxyResponseType() == "text" ? buf.toString("utf8") : buf.toString("binary")
                var wresp = WebResponse.mkProxy(r, {
                    code: res.statusCode,
                    headers: Object.keys(res.headers).map(h => { return { name: h, value: res.headers[h] } }),
                    forceText: true,
                    contentText: content,
                    binaryContent: buf
                })
                ret.success(wresp)
            })
        })

        if (data.length == 0)
            req.end()
        else
            req.end(data)

        return ret
    }

    export function setup(): void {
        if (!Browser.isNodeJS) return

        process.on('uncaughtException', handleError)

        Buffer = global.Buffer;

        Browser.canIndexedDB = false;
        Storage.getTableAsync = (name: string) => Promise.as(new FsTable(name));
        Storage.clearPreAsync = () => Promise.as()
        //Promise.join(Storage.tableNames.map((t) => sendRequestAsync({ action: Action.DB_DELETE, table: t })));

        Util.httpRequestAsync = httpRequestAsync;
        WebRequest.prototype.sendAsync = function() {
            return webRequestAsync(this)
        }

        TDev.Ticker.disable()
        TDev.Util.initGenericExtensions();
        TDev.RT.RTValue.initApis();

        window = <any>{};
        window.removeEventListener = () => {};
        window.setTimeout = setTimeout;
        (<any>window).rootUrl = "https://www.touchdevelop.com";
        var ls = <any>{};
        window.localStorage = ls;
        window.localStorage['local_proxy'] = process.env['TD_SERVER'] + '/-tdevmgmt-/' + process.env['TD_DEPLOYMENT_KEY']
        ls.getItem = (s) => ls[s]
        ls.setItem = (s, v) => ls[s] = v + ""
        ls.removeItem = (s) => delete ls[s]
        global.navigator = <any>{};
        window.navigator = navigator;
        navigator.userAgent = "NodeJS " + process.version

        Util.logSz = 3000;

        setupGlobalAgent()

        Promise.errorHandler = (ctx, err) => {
            if (Runtime.theRuntime && !Runtime.theRuntime.isStopped()) {
                Runtime.theRuntime.handleException(err);
            } else {
                handleError(err)
            }
            return new TDev.PromiseInv();
        }

        Cloud.getUserId = () => {
            var rt = Runtime.theRuntime
            if (!rt) return undefined
            var req = rt.getRestRequest()
            if (!req) return undefined
            var user = req.user()
            if (user)
                return user.id()
        }

        Cloud.authenticateAsync = (activity:string, redirect = false, dontRedirect = false): Promise => {
            return Promise.as(!!Cloud.getUserId())
        }
        try { // TODO: find a better way to detect if this module is available
            var xmldom = require('xmldom');
            if (xmldom) {
                global.DOMParser = xmldom.DOMParser;
                global.XMLSerializer = xmldom.XMLSerializer;
            }
        } catch (e) { }
        TDev.Random.strongEntropySource = (buf) => {
            var b2 = crypto.randomBytes(buf.length);
            for (var i = 0; i < buf.length; ++i)
                b2[i] = buf[i];
        };
        TDev.RT.App.server_setting = (key : string, optional : boolean, s : IStackFrame) => {
            var setting = process.env[key];
            if (!optional && setting == undefined)
                Util.userError('missing environment variable ' + key, s.pc);
            return setting;
        }
        TDev.RT.Web.proxy = (url) => url;

        //var buf = Buffer.prototype
        //buf.subarray = buf.slice;
        //slice is different than subarray
        ServerResponse.toUtfBuffer = (s) => new Buffer(s, "utf8");

        (<any>TDev.RT.Buffer.prototype).toNodeBuffer = function () {
            if (Buffer.isBuffer(this.buffer))
                return this.buffer;
            var r = new Buffer(this.count())
            var b = this.buffer
            for (var i = 0; i < r.length; ++i)
                r[i] = b[i]
            return r
        };

        (<any>TDev.RT.Buffer).fromNodeBuffer = buf => TDev.RT.Buffer.fromTypedArray(buf);
    }

    function getRuntimeInfoAsync(which:string)
    {
        var needed = Util.toDictionary(which.split(/,/), s => s)
        if (needed["tdlog"]) {
            var msgs = Util.getLogMsgs()
            msgs.reverse()
        }
        return Promise.as({
            applog: needed["applog"] ? App.logs() : undefined,
            tdlog: msgs,
            crashes: needed["crashes"] ? (host ? host.crashes : []) : undefined,
        })
    }

    var httpActions:any = {
        info: (args, req, resp) => getRuntimeInfoAsync(args[0] || "").done(r => resp.send(200, r)),
    }

    function specialHttpRequest(req, resp)
    {
        resp.send = (code, msg) => {
            if (typeof msg == "string") msg = { message: msg }
            var buf = new Buffer(JSON.stringify(msg), "utf8")
            resp.writeHead(code, { 
                    'content-length': buf.length, 
                    'content-type': 'application/json'
            })
            resp.end(buf)
        }

        var key = process.env['TD_DEPLOYMENT_KEY']
        if (!key) {
            resp.send(500, "key not setup")
            return
        }

        var words = req.url.replace(/^\//, "").split(/\//)
        if (words[0] != "-tdevmgmt-") resp.send(404, "only /-tdevmgmt-/ supported")
        else if (words[1] != key) resp.send(403, "wrong key")
        else if (httpActions.hasOwnProperty(words[2]))
            httpActions[words[2]](words.slice(3), req, resp)
        else
            resp.send(404, "no such API " + words[2])
    }

    export function handleHttpRequest(req, resp) 
    {
        if (/^\/-tdevmgmt-\//.test(req.url))
            specialHttpRequest(req, resp)
        else {
            var rt = <TheNodeRuntime> Runtime.theRuntime
            rt.requestHandler(req, resp)
        }
    }

    export function startServerAsync()
    {
        var ret = new PromiseInv()
        var port = process.env.PORT || 4242

        var app = http.createServer();

        app.on("upgrade", (req, sock, body) => {
            var rt = <TheNodeRuntime> Runtime.theRuntime
            if (rt.wsServer && rt.wsServer.isReal())
                rt.wsServer.upgradeCallback(req, sock, body)
            else sock.end()
        })

        app.on("request", handleHttpRequest)

        app.on("listening", () => {
            ret.success(app)
        })

        Util.log("listenting on " + port)
        app.listen(port)

        return ret
    }

    export function runMainAsync()
    {
        if (require.resolve("faye-websocket"))
            webSocketModule = require("faye-websocket")
        var wsServer = new WebSocketServerWrapper(webSocketModule)

        host = new RunnerHost(wsServer);
        var rt = <TheNodeRuntime> host.currentRt;
        Runtime.theRuntime = rt;
        var initProm = new PromiseInv()
        rt.initPromise = initProm
        host.initFromPrecompiled();
        host.currentGuid = rt.compiled.scriptGuid;

        Util.log("initializing data");
        Browser.localProxy = true;

        return rt.initDataAsync().then(() => {
            Util.log("starting server script")
            rt.setState(RtState.AtAwait, "start server");
            var autoStart = rt.hasInits()
            rt.queueInits()
            rt.queueAsyncStd(() => {
                // this will be only executed once all _init() actions are done
                if (autoStart)
                    initProm.success(startServerAsync())
                else {
                    Util.log("main finished")
                    initProm.success(null)
                }
            })
            return initProm
        })
    }

}
