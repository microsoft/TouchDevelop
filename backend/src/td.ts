/// <reference path='../typings/node/node.d.ts' />
/// <reference path='../node_modules/reflect-metadata/reflect-metadata.d.ts' />

'use strict';

require('reflect-metadata');

import * as crypto from 'crypto';
import * as http from 'http';
import * as https from 'https';
import * as url from 'url';
import * as zlib from 'zlib';

export type JsonObject = {};
export type JsonBuilder = {};
export type Action1<T> = (v:T) => Promise<void>;
export type Action = () => Promise<void>;
export type NumberAction = Action1<number>;
export type JsonAction = Action1<JsonObject>;

export namespace App {
    export var ERROR = 3;
    export var WARNING = 4;
    export var INFO = 6;
    export var DEBUG = 7;

    export function logTick(category: string, id: string, meta:any) {
    }

    export function logMeasure(category:string, id: string, value: number, meta: any) {
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
    return self.replace(regexp, () => {
        var arr = []
        for (var i = 0; i < arguments.length; ++i) arr.push(arguments[i])
        return f(arr)
    })
}

export function arrayToJson(arr:any[]):JsonObject
{
    return arr.map(e => e.toJson ? e.toJson() : e)
}

export function jsonCopyFrom(trg:JsonBuilder, src:JsonObject)
{
    var v = clone(src)
    Object.keys(src).forEach(k => {
        trg[k] = v[k]
    })
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

export function orEmpty(s: any) : string
{
    if (s == null) return "";
    return toString(s);
}
export function clamp(min : number, max : number, value : number) : number { return value < min ? min : value > max ? max : value; }


export function asArray(o:JsonObject) : JsonObject[]
{
    return <any>o;
}

export class JsonRecord
{
    toJson():JsonObject
    {
        //TODO
        return {}
    }

    fromJson(o:JsonObject):void
    {
        //TODO
    }

    equals(other:JsonRecord)
    {
        return this === other;
    }

    load(o:any):void
    {
        //TODO
    }
}

export function json(className : any, fieldName : string) {
    var t = (<any>Reflect).getMetadata("design:type", className, fieldName);
    // t.name
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
    //TODO
    //logError(err, meta);
    return false
}

export function log(msg:string)
{
    //TODO
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
        console.log(this.category + ": " + message)
        // App.logEvent(ilevel, this.category, message, this.augmentMeta(meta ? meta.value() : undefined, s));
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

    static findContext() : any
    {
        // TODO
        return null
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
            //TODO
            //id: prev ? prev.id + "." + ++prev.numCh : Random.uniqueId(8),
            prev: prev,
            created: perfNow(), 
            numCh: 0, 
        }
        if (prev)
            ctx.root = prev.root
        else ctx.root = ctx
        //TODO s.loggerContext = ctx
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
