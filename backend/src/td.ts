/// <reference path='../typings/node/node.d.ts' />
/// <reference path='../node_modules/reflect-metadata/reflect-metadata.d.ts' />

'use strict';

require('reflect-metadata');
var bb = require('bluebird');
Promise = bb;
bb.longStackTraces();


import * as crypto from 'crypto';
import * as http from 'http';
import * as https from 'https';
import * as url from 'url';
import * as zlib from 'zlib';
import * as net from 'net';
import * as domain from 'domain';
import * as assert from 'assert';

export type JsonObject = {};
export type JsonBuilder = {};
export type StringMap = {};
export type Action1<T> = (v:T) => Promise<void>;
export type Action = () => Promise<void>;
export type NumberAction = Action1<number>;
export type JsonAction = Action1<JsonObject>;

export type SMap<T> = { [s:string]: T; };

export interface LogMessage {
    timestamp: number;
    elapsed?: string;
    level: number;
    category: string;
    msg: string;
    meta?: any; // custom data associated to event
}


export namespace App {
    export var ERROR = 3;
    export var WARNING = 4;
    export var INFO = 6;
    export var DEBUG = 7;

    export function createInfoMessage(s: string) : LogMessage {
        return createLogMessage(App.INFO, "", s, undefined);
    }
    export function createLogMessage(level : number, category : string, s:string, meta: any) : LogMessage
    {
        var m = <LogMessage>{
            timestamp: Date.now(),
            level: level,
            category: category,
            msg: s,
            meta: meta
        }
        return m;
    }

    class Logger {
        logIdx = -1;
        logMsgs:LogMessage[] = [];
        logSz = 2000;

        addMsg(level : number, category : string, s:string, meta: any = null)
        {
            var m = createLogMessage(level, category, s, meta);
            if (this.logIdx >= 0) {
                this.logMsgs[this.logIdx++] = m;
                if (this.logIdx >= this.logSz) this.logIdx = 0;
            } else {
                this.logMsgs.push(m);
                if (this.logMsgs.length >= this.logSz)
                    this.logIdx = 0;
            }

            console.log(category + ": " + s);
        }

        log(msg:string)
        {
            this.addMsg(INFO, "TD", msg)
        }

        getMsgs():LogMessage[]
        {
            var i = this.logIdx;
            var res = [];
            var wrapped = false;
            if (i < 0) i = 0;
            var n = Date.now()
            while (i < this.logMsgs.length) {
                var m = this.logMsgs[i]
                var diff = ("00000000" + (n - m.timestamp)).slice(-7).replace(/(\d\d\d)$/, (k) => "." + k);
                res.push(<LogMessage>{
                    level: m.level,
                    category: m.category,
                    msg: m.msg,
                    elapsed: diff,
                    meta: m.meta,
                    timestamp: m.timestamp
                });
                if (++i == this.logMsgs.length && !wrapped) {
                    wrapped = true;
                    i = 0;
                }
                if (wrapped && i >= this.logIdx) break;
            }
            res.reverse()
            return res;
        }
    }

    var logger = new Logger();

    export function getMsgs():LogMessage[]
    {
        return logger.getMsgs()
    }


    export interface AppLogTransport {
        log? : (level : number, category : string, msg: string, meta?: any) => void;
        logException?: (err: any, meta?: any) => void;
        logTick?: (category: string, id: string, meta: any) => void;
        logMeasure?: (category: string, id: string, value: number, meta: any) => void;

        id?: string;
        domain?: any;
    }

    export var transports: AppLogTransport[] = [];
    export function addTransport(transport: AppLogTransport) {
        transports.push(transport)
    }

    export function transportFailed(t:AppLogTransport, tp:string, err:any) {
        if (t.id) tp = " (" + t.id + ")"
        logger.log(tp + ": transport failed. " + (err.stack || err.message || err))
    }

    function runTransports(id:string, run:(t:AppLogTransport) => void)
    {
        transports.forEach(transport => {
            var d = transport.domain
            if (!d) {
                transport.domain = d = domain.create()
                d.on("error", err => {
                    transportFailed(transport, id, err)
                })
            }

            d.enter()
            try {
                run(transport)
            } catch (err) {
                transportFailed(transport, id, err)
            }
            d.exit()
        })
    }

    export function logException(err: any, meta? : any): void {
        if (err.tdSkipReporting) {
            logEvent(DEBUG, "skipped-crash", err.message || err + "", null)
            return
        }

        if (err.tdIsSecondary) {
            logEvent(DEBUG, "secondary-crash", err.message || err + "", null)
            return
        }

        if (err.tdMeta) {
            if (meta)
                Object.keys(meta).forEach(k => {
                    err.tdMeta[k] = meta[k]
                })
            meta = err.tdMeta
        }

        runTransports("logException", t => t.logException && t.logException(err, meta))

        var msg = err.stack
        if (!msg) {
            msg = err.message || (err + "")
        }
        logEvent(ERROR, "crash", msg, meta);
    }

    export function logEvent(level: number, category: string, message: string, meta: any): void {
        level = Math.max(0, Math.floor(level));
        category = category || "";
        message = message || "";

        logger.addMsg(level, category, message, meta)
        runTransports("logEvent", t => t.log && t.log(level, category, message, meta))
    }

    export function logTick(category: string, id: string, meta:any) {
        runTransports("logTick", t => t.logTick && t.logTick(category, id, meta))
        if (!meta || !meta.skipLog)
            App.logEvent(App.INFO, category, id, meta);
    }

    export function logMeasure(category:string, id: string, value: number, meta: any) {
        var lmeta:any = clone(meta) || {};
        lmeta.measureId = id
        lmeta.measureValue = value
        runTransports("logMeasure", t => t.logMeasure && t.logMeasure(category, id, value, meta))
        if (!meta || !meta.skipLog)
            App.logEvent(App.INFO, category, id + ": " + value, lmeta);
    }
}

export function perfNow() {
    var t = process.hrtime();
    return t[0] * 1e3 + t[1] * 1e-6;
}

export function sleepAsync(seconds:number)
{
    return new Promise((r) => {
        setTimeout(() => r(), seconds*1000)
    })
}

export function startsWith(s:string, pref:string)
{
    return s.indexOf(pref) == 0
}

export function stringContains(s:string, what:string)
{
    return s.indexOf(what) >= 0
}

export function serverSetting(sett:string, optional:boolean)
{
    if (process.env.hasOwnProperty(sett))
        return process.env[sett]
    if (optional) return null
    throw new Error('missing environment variable ' + sett)
}

export function replaceAll(self: string, old: string, new_: string): string {
    if (!old) return self;
    return self.split(old).join(new_);
}

export function replaceFn(self:string, regexp:RegExp, f:(m:string[]) => string)
{
    return self.replace(regexp, function () {
        var arr = []
        for (var i = 0; i < arguments.length; ++i) arr.push(arguments[i])
        return f(arr)
    })
}

export function arrayToJson(arr:any[]):JsonObject[]
{
    return arr.map(e => e.toJson ? e.toJson() : e)
}

export function awaitAtMostAsync<T>(p:Promise<T>, s:number):Promise<T>
{
    return (<any>p).timeout(s*1000).then(v => v, e => null)
}

export function pushRange<T>(trg:T[], src:T[])
{
    for (let e of src)
        trg.push(e)
}

export function jsonCopyFrom(trg:JsonBuilder, src:JsonObject)
{
    var v = clone(src)
    Object.keys(src).forEach(k => {
        trg[k] = v[k]
    })
}

//? Return numbers between `start` and `start + length - 1` inclusively
export function range(start:number, length:number) : number[]
{
    var r = []
    for (var i = 0; i < length; ++i)
        r.push(start + i)
    return r
}


export function toDictionary<T>(arr: T[], f: (t: T) => string): SMap<T> {
    var r: SMap<T> = {}
    arr.forEach(e => { r[f(e)] = e })
    return r
}

export function toNumber(v:any) : number
{
    if (v == null) return null

    if (typeof v == "number") return v
    return parseFloat(v)
}

export function toString(v:any) : string
{
    if (v == null) return null
    return v + "";
}

export function toStringArray(v:any) : string[]
{
    if (Array.isArray(v))
        return v.map(e => toString(e))
    return null
}

export function toBoolean(v:any) : boolean
{
    if (typeof v == "string") return (v.toLowerCase() == "true")
    return !!v;
}

export function orEmpty(s: any) : string
{
    if (s == null) return "";
    return toString(s);
}

export function clamp(min : number, max : number, value : number) : number
{
    return value < min ? min : value > max ? max : value; 
}


export function asArray(o:JsonObject) : JsonObject[]
{
    return <any>o;
}

export function json(className: any, fieldName: string) {
    var t = (<any>Reflect).getMetadata("design:type", className, fieldName);
    if (!className.hasOwnProperty("__fields")) {
        className.__fields = (className.__fields || []).slice(0)
    }
    var e: any = { name: fieldName }
    switch (t.name) {
    case "String":
        e.toJson = v => toString(v);
        e.fromJson = v => toString(v);
        break;
    case "Number":
        e.toJson = v => toNumber(v);
        e.fromJson = v => toNumber(v);
        break;
    case "Boolean":
        e.toJson = v => toBoolean(v);
        e.fromJson = v => toBoolean(v);
        break;
    case "Array":
    case "Object":
        e.toJson = v => v;
        e.fromJson = v => v;
        break;
    default:
        throw new Error("Type " + t.name + " not supported for @td.json")
        e.toJson = v => v;
        e.fromJson = v => v;
        break;    
    }

    className.__fields.push(e)
}

export class JsonRecord
{
    toJson():JsonObject
    {
        var r = {}
        for (let f of (<any>this).__fields || []) {
            if (!this.hasOwnProperty(f.name)) continue;
            var v = this[f.name]
            if (v == null) continue;
            r[f.name] = f.toJson(v);
        }
        return r
    }

    fromJson(o:JsonObject):void
    {
        for (let f of (<any>this).__fields || []) {
            delete this[f.name];
            if (!o.hasOwnProperty(f.name)) continue;
            var v = o[f.name]
            if (v == null) continue;
            this[f.name] = f.fromJson(v);
        }
    }

    equals(other:JsonRecord)
    {
        return this === other;
    }

    load(o:any):void
    {
        for (let f of (<any>this).__fields || []) {
            if (!o.hasOwnProperty(f.name)) continue;
            this[f.name] = f.fromJson(o[f.name]);
        }
    }
}


export function createRandomId(size: number) : string
{
    let buf = crypto.randomBytes(size * 2)
    let s = buf.toString("base64").replace(/[^a-zA-Z]/g, "");
    if (s.length < size) {
        // this is very unlikely
        return createRandomId(size);
    }
    else {
        return s.substr(0, size);
    }
}

export function clone(e:JsonObject):JsonObject
{
    return JSON.parse(JSON.stringify(e))
}

export function randomUint32():number
{
    var b = crypto.randomBytes(4)
    return (b[0] | (b[1]<<8) | (b[2]<<16) | ((b[3]<<24) >>> 0)) >>> 0
}

export function sha256(b:Buffer):string
{
    let h = crypto.createHash('sha256')
    h.update(b)
    return h.digest('hex').toLowerCase()
}

export function orderedBy<T>(arr:T[], key:(e:T)=>number)
{
    arr = arr.slice(0)
    arr.sort((x, y) => key(x) - key(y))
    return arr
}

var m32 = 1 / 0x100000000;
var m64 = 1 / 0x10000000000000000;

export function randomNormalized()
{
    return randomUint32() * m32 + randomUint32() * m64;
}

export function randomInt(limit: number): number {
    var max = Math.round(limit);
    if (max == 0) return 0;
    var r = max;
    while (r == max) r = randomNormalized() * (max); // supposedly can happen because of floating-point behavior
    return Math.floor(r);
}

export function randomRange(min: number, max: number): number {
    var r = randomInt(max - min + 1);
    if (r == undefined) return undefined;
    return min + r;
}

export function checkAndLog(err:any, meta?: any):boolean
{
    if (!err) return true
    App.logException(err, meta)
    return false
}

export function log(msg:string)
{
    App.logEvent(App.INFO, "APP", msg, {});
}

export function mkAgent(proto:string):http.Agent
{
    var Agent = http.Agent
    var AgentSSL = https.Agent
    var maxSock = 15
    if (proto == "https:")
        return <any>new AgentSSL(<any>{ maxSockets: maxSock, keepAlive: true })
    else
        return new Agent({ maxSockets: maxSock, keepAlive: true })
}

var httpAgent = http.globalAgent = mkAgent("http:")
var httpsAgent = https.globalAgent = mkAgent("https:")

export var TD:any = {};

export class AppLogger {
    public created: number;
    public parent: AppLogger;
    public minLevel = App.DEBUG;

    constructor(public category : string) {
        this.category = this.category || "";
        this.created = perfNow()
    }

    public debug(message: string) { this.log("debug", message, undefined); }
    public info(message: string) { this.log("info", message, undefined); }
    public warning(message: string) { this.log("warning", message, undefined); }
    public error(message: string) { this.log("error", message, undefined); }

    private stringToLevel(level:string)
    {
        switch (level.trim().toLowerCase()) {
        case 'debug': return App.DEBUG;
        case 'warning': return App.WARNING;
        case 'error': return App.ERROR;
        default: return App.INFO;
        }
    }

    public log(level: string, message: string, meta: JsonObject) {
        var ilevel = this.stringToLevel(level);
        if (ilevel > this.minLevel) return
        // console.log(this.category + ": " + message)
        App.logEvent(ilevel, this.category, message, this.augmentMeta(meta));
    }

    // Set minimum logging level for this logger (defaults to "debug").
    //@ [level].deflStrings("info", "debug", "warning", "error")
    public setVerbosity(level: string) {
        this.minLevel = this.stringToLevel(level)
    }

    //? Get the current logging level for this logger (defaults to "debug").
    //@ betaOnly
    public verbosity() : string {
        if (this.minLevel == App.DEBUG) return "debug";
        if (this.minLevel == App.WARNING) return "warning";
        if (this.minLevel == App.ERROR) return "error";
        return "info";
    }

    static findContext(): any 
    {
        if ((<any>process).domain)
            return (<any>process).domain.tdLogger;
    }

    public contextInfo() : any
    {
        var c = AppLogger.findContext()
        if (!c) {
            return null
        } else {
            var tm = perfNow() - c.created
            if (c.root.pauseOffset)
                tm -= c.root.pauseOffset
            var r = { contextId: c.id, contextDuration: Math.round(tm), contextUser: "" }
            for (var p = c; p; p = p.prev)
                if (!r.contextUser) r.contextUser = p.userid || ""
            return r
        }
    }

    public setMetaFromContext(v: any)
    {
        var i = this.contextInfo()
        if (i) {
            v.contextId = i.contextId
            v.contextDuration = i.contextDuration
            v.contextUser = i.contextUser
        }
    }

    private augmentMeta(meta: JsonObject) : any
    {
        var v = meta

        if (!AppLogger.findContext()) return v || {}

        if (v) v = clone(v)
        else v = {}

        this.setMetaFromContext(v)

        return v
    }

    //? Get the userid attached to the current context, or empty.
    public setContextUser(userid:string)
    {
        var c = AppLogger.findContext()
        if (!c) throw new Error("No current context")
        if (c) c.userid = userid
    }

    //? Get the userid attached to the current context, or empty.
    public contextUser() : string
    {
        var i = this.contextInfo()
        if (!i || !i.contextUser) return ""
        return i.contextUser
    }

    //? The unique id of current context, or empty if in global scope.
    public contextId() : string
    {
        var i = this.contextInfo()
        if (!i) return ""
        return i.contextId
    }

    //? Stop counting time in all current contexts
    public contextPause()
    {
        var c = AppLogger.findContext()
        if (c) {
            c.root.pauseStart = perfNow()
        }
    }

    //? Start counting time again in all current contexts
    public contextResume()
    {
        var c = AppLogger.findContext()
        if (c) {
            c = c.root
            if (c.pauseStart) {
                c.pauseOffset = perfNow() - c.pauseStart
                c.pauseStart = 0
            }
        }
    }

    //? How long the current logger has been executing for in milliseconds.
    public loggerDuration() : number
    {
        return perfNow() - this.created
    }

    //? How long the current context has been executing for in milliseconds.
    public contextDuration() : number
    {
        var i = this.contextInfo()
        if (i)
            return i.contextDuration
        return perfNow() - this.created
    }

    //? Log a custom event tick in any registered performance logger.
    public tick(id: string)
    {
        if (!id) return;
        App.logTick(this.category, id, this.augmentMeta(null));
    }

    //? Log a custom event tick, including specified meta information, in any registered performance logger.
    public customTick(id: string, meta: JsonObject)
    {
        if (!id) return;
        App.logTick(this.category, id, this.augmentMeta(meta));
    }

    //? Log a measure in any registered performance logger.
    public measure(id: string, value: number)
    {
        if (!id) return;
        App.logMeasure(this.category, id, value, this.augmentMeta(null))
    }

    //? Start new logging context when you're starting a new task (eg, handling a request)
    public newContext()
    {
        var prev = AppLogger.findContext()
        var ctx:any = { 
            id: prev ? prev.id + "." + ++prev.numCh : createRandomId(8),
            prev: prev,
            created: perfNow(), 
            numCh: 0, 
        }
        if (prev)
            ctx.root = prev.root
        else ctx.root = ctx
        if ((<any>process).domain)
            (<any>process).domain.tdLogger = ctx;
    }

}

export function createLogger(n:string)
{
    return new AppLogger(n);
}

export function httpRequestStreamAsync(url_:string, method:string = "GET", body:string = undefined, contentType:any = null) : Promise<http.IncomingMessage>
{
    var parsed:any = url.parse(url_)
    parsed.method = method.toUpperCase()

    var req;
    if (parsed.protocol == "http:") {
        req = http.request(parsed)
    } else if (parsed.protocol == "https:") {
        req = https.request(parsed)
    } else {
        throw new Error("unknown node.js protocol " + parsed.protocol + " in " + url_)
    }

    var headers = contentType || {}

    if (typeof headers == "string")
        headers = { "Content-Type": headers }

    Object.keys(headers).forEach(k => req.setHeader(k, headers[k]))

    return new Promise((success, error) => {
        req.on("error", err => {
            err.socketUrl = url_;
            error(err)
        })

        req.on("response", (res) => {
            if (res.statusCode == 200) {
                if (/gzip/.test((<any>res).headers['content-encoding'])) {
                    var g = zlib.createUnzip(undefined);
                    (<any>res).pipe(g);
                    (<any>g).headers = res.headers;
                } else {
                    g = res;
                }

                success(g)

            } else {
                error(new Error("bad status code " + res.statusCode + " for " + url_))
            }
        })

        if (body !== undefined)
            req.end(body, "utf8")
        else
            req.end()
    })
}
    
export class WebRequest
{
    private _method: string;
    private _url: string;
    private _headers: JsonObject = {};
    private _content: any;
    private _credentialsName: string;
    private _credentialsPassword: string;

    static mk(url: string): WebRequest {
        var wr = new WebRequest();
        wr._url = url;
        wr._method = "GET";
        return wr;
    }

    //? Gets whether it was a 'get' or a 'post'.
    public method(): string { return this._method; }

    //? Sets the method. Default value is 'get'.
    //@ [method].deflStrings("post", "put", "get", "delete")
    public setMethod(method: string): void { this._method = method; }

    //? Gets the url of the request
    public url(): string { return this._url; }

    //? Sets the url of the request. Must be a valid internet address.
    public setUrl(url: string): void { this._url = url; }

    //? Gets the value of a given header
    //@ readsMutable
    public header(name: string): string { return this._headers[name.toLowerCase()]; }

    //? Sets an HTML header value. Empty string clears the value
    public setHeader(name: string, value: string): void {
        if (!value)
            delete this._headers[name]
        else
            this._headers[name] = value
    }

    public toString(): string {
        return this.method() + " " + this.url();
    }

    //? Sets the Accept header type ('text/xml' for xml, 'application/json' for json).
    //@ [type].deflStrings('application/json', 'text/xml')
    public setAccept(type: string) {
        this.setHeader("Accept", type);
    }

    public setContentType(type: string) {
        this.setHeader("Content-Type", type);
    }

    public sendAsync(): Promise<WebResponse>
    {
        var r = this;
        var parsed:any = url.parse(r.url())
        parsed.method = r.method().toUpperCase()
        parsed.headers = clone(this._headers)

        if (this._credentialsName || this._credentialsPassword) {
            parsed.auth = this._credentialsName + ":" + this._credentialsPassword;
        }

        var data;

        if (typeof this._content == "string") {
            data = new Buffer(this._content, "utf8")
        } else if (this._content == null) {
            data = new Buffer(0);
        } else {
            if (!Buffer.isBuffer(this._content)) {
                console.log("NON BUFFER", this._content)
                assert(false)
            }
            data = this._content
        }

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
            throw new Error("unknown request protocol " + parsed.protocol + " in " + r.url())
        }

        return new Promise<WebResponse>((success, error) => {
            req.on("error", err => {
                //console.log(err)
                log("Web request error: " + err + " for " + r.url())
                err.socketUrl = r.url()
                error(err)
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
                    var wresp = WebResponse.mkProxy(r, {
                        code: res.statusCode,
                        headers: Object.keys(res.headers).map(h => { return { name: h, value: res.headers[h] } }),
                        binaryContent: buf
                    })
                    success(wresp)
                })
            })

            if (data.length == 0)
                req.end()
            else
                req.end(data)
        })
    }


    //? Sets the content of a 'post' request
    public setContent(content: string): void {
        this._content = content;
        this.setContentType("text/plain; charset=utf-8");
    }

    //? Sets the content of a 'post' request as the JSON tree
    public setContentAsJson(json: JsonObject): void {
        this.setContent(JSON.stringify(json));
        this.setContentType("application/json; charset=utf-8");
    }

    //? Sets the content of a 'post' request as a binary buffer
    public setContentAsBuffer(bytes: Buffer): void {
        this._content = bytes;
        this.setContentType("application/octet-stream");
    }

    //? Sets the name and password for basic authentication. Requires an HTTPS URL, empty string clears.
    public setCredentials(name: string, password: string): void {
        if (!this.url().match(/^https:\/\//i))
            throw new Error("Web Request->set credentials requires a secure HTTP url (https)");
        this._credentialsName = name;
        this._credentialsPassword = password;
    }

    //? Gets the names of the headers
    public headerNames(): string[] {
        return Object.keys(this._headers);
    }
}

export class WebResponse
{
    private _request: WebRequest;
    private _content: string;
    private _statusCode: number;
    private _binaryContent: Buffer;

    private _headers: JsonBuilder = {};

    static mkProxy(request: WebRequest, proxyResponse: any) : WebResponse
    {
        var r = new WebResponse();
        r._request = request;
        r._statusCode = proxyResponse.code;
        var headers = proxyResponse.headers;
        if (headers)
            headers.forEach(h => r._headers[h.name.toLowerCase()] = h.value);
        r._binaryContent = proxyResponse.binaryContent
        return r;
    }

    //? Gets the request associated to this response
    public request(): WebRequest { return this._request; }

    //? Gets the HTTP Status code of the request if any
    public statusCode(): number { return this._statusCode; }

    //? Reads the response body as a string
    public content(): string {
        if (this._content == null)
            this._content = this._binaryContent.toString("utf8");
        return this._content;
    }

    //? Reads the response body as a Buffer.
    public contentAsBuffer(): Buffer {
        return this._binaryContent;
    }

    //? Reads the response body as a JSON tree
    public contentAsJson(): JsonObject
    {
        if (this.content())
            try {
                return JSON.parse(this.content())
            } catch (e) { return null }

        return null;
    }

    public toString(): string {
        return this.statusCode() + " --> " + this.request().toString();
    }

    //? Gets the value of a given header
    public header(name: string): string { return this._headers[name.toLowerCase()]; }

    //? Gets the names of the headers
    public headerNames(): string[] { return Object.keys(this._headers); }
}

export function createRequest(url: string): WebRequest
{
    return WebRequest.mk(url);
}

export async function downloadJsonAsync(url: string): Promise<JsonObject>
{
    var r = createRequest(url)
    r.setAccept('application/json');
    return (await r.sendAsync()).contentAsJson()
}

export async function downloadTextAsync(url: string): Promise<string>
{
    var r = createRequest(url)
    return (await r.sendAsync()).content()
}

function fixupSockets()
{
    var origConnect = net.Socket.prototype.connect
    net.Socket.prototype.connect = function (options) {
        if (options && typeof options.host == "string")
            this.tdHost = options.host
        return origConnect.apply(this, arguments)
    }

    var origDestroy = net.Socket.prototype._destroy
    net.Socket.prototype._destroy = function (exn) {
        if (typeof exn == "object" && (this.tdHost || this.tdUnrefed)) {
            if (!exn.tdMeta) exn.tdMeta = {}
            exn.tdMeta.socketHost = this.tdHost
            exn.tdMeta.unrefed = this.tdUnrefed

            if (this.tdUnrefed && exn.code == 'ECONNRESET') {
                log("ignoring ECONNRESET on " + this.tdHost)
                exn.rtProtectHandled = true;
                exn.tdSkipReporting = true;
            }
        }
        return origDestroy.apply(this, arguments)
    }

    var origRef = net.Socket.prototype.ref
    net.Socket.prototype.ref = function () {
        this.tdUnrefed = false
        return origRef.apply(this, arguments)
    }
    var origUnref = net.Socket.prototype.unref
    net.Socket.prototype.unref = function () {
        this.tdUnrefed = true
        return origUnref.apply(this, arguments)
    }
}

function initTd()
{
    process.on('uncaughtException', err => {
        App.logException(err);
    })
    process.on('unhandledRejection', err => {
        App.logException(err);
    })

    fixupSockets();
}

initTd();
