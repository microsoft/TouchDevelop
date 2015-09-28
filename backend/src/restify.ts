/// <reference path='../typings/node/node.d.ts' />

'use strict';

import * as td from './td';
import * as assert from 'assert';
import * as httpMod from 'http';

type JsonObject = td.JsonObject;
type JsonBuilder = td.JsonBuilder;

var asArray = td.asArray;
var json = td.json;
var clone = td.clone;


var logger: td.AppLogger;
var httpStatus: IHTTPStatusCodes;

var restify = require('restify');


export class Server
{
    public handle:any;

    /**
     * Installs a middleware for a given route path.
     */
    public use(mid: Middleware) : void
    {
        this.handle.use(mid)
    }

    /**
     * This function matches the ``GET`` verb
     * {hints:path:/}
     */
    public get(path: string, then: RequestHandler) : void
    {
        this.route("get", path, then);
    }

    /**
     * This function matches the ``POST`` verb
     * {hints:path:/}
     */
    public post(path: string, then: RequestHandler) : void
    {
        this.route("post", path, then);
    }

    /**
     * This function matches the ``PUT`` verb
     * {hints:path:/}
     */
    public put(path: string, then: RequestHandler) : void
    {
        this.route("put", path, then);
    }

    /**
     * This function matches the `DELETE` verb
     * {hints:path:/}
     */
    public del(path: string, then: RequestHandler) : void
    {
        this.route("del", path, then);
    }

    /**
     * This function matches the ``HEAD`` verb
     * {hints:path:/}
     */
    public head(path: string, then: RequestHandler) : void
    {
        this.route("head", path, then);
    }

    /**
     * Installs a middleware before any handler is run.
     */
    public pre(mid: Middleware) : void
    {
        this.handle.pre(mid)
    }

    public route(method: string, path: string, then: RequestHandler) : void
    {
        method = method.toLowerCase().trim();
        assert(/^(get|head|opts|post|put|patch|del)$/.test(method), "unsupported method");
        logger.debug("mounting " + method + " " + path);
        then = setupHandler(method, path, then);
        this.handle[method](path, restifyHandlerFactory(then));
    }

    public address() : string
    {
        return this.handle.address()
    }

    /**
     * This function matches the ``OPTIONS`` verb
     * {hints:path:/}
     */
    public opts(path: string, then: RequestHandler) : void
    {
        this.route("opts", path, then);
    }

    /**
     * This function matches the ``PATCH`` verb
     * {hints:path:/}
     */
    public patch(path: string, then: RequestHandler) : void
    {
        this.route("patch", path, then);
    }

    /**
     * Gets a string that describes the current this.handle
     */
    public toString() : string
    {
        return this.handle.toString()
    }

    public all(then: RequestHandler) : void
    {
        logger.debug("mounting catch all handler");
        let coll = "get|head|opts|post|put|patch|del".split("|");
        for (let meth of coll) {
            this.routeRegex(meth, ".*", then);
        }
    }

    public routeRegex(method: string, pathRegex: string, then: RequestHandler) : void
    {
        method = method.toLowerCase().trim();
        assert(/^(get|head|opts|post|put|patch|del)$/.test(method), "unsupported method");
        logger.debug("mounting " + method + " Regex: " + pathRegex);
        then = setupHandler(method, pathRegex, then);
        this.handle[method](new RegExp(pathRegex), restifyHandlerFactory(then));
    }
}

export type RequestHandler = (req:Request, res:Response) => Promise<void>;

export class Middleware
{
}

export class Request
{
    public handle:any;

    /**
     * 
     * Check if the incoming request contains the "Content-Type" header field, and if it matches the give mime type.
     * {hints:type:application/json}
     */
    public is(type: string) : boolean
    {
        return this.handle.is(type)
    }

    /**
     * Check if the given types are acceptable, returning the best match when true, or else invalid (in which case you should respond with 406 "Not Acceptable").
     * The type value may be a single mime type string (such as "application/json"), the extension name such as "json", a comma-delimited list, or an array. When a list or array is given, the best match (if any) is returned.
     * {hints:types:application/json,text/plain}
     */
    public accepts(types: string) : string
    {
        return this.handle.accepts(types)
    }

    /**
     * Get the case-insensitive request header key
     */
    public header(name: string) : string
    {
        return this.handle.header(name)
    }

    /**
     * 
     * Check if the incoming request is encrypted (i.e, HTTPS).
     */
    public isSecure() : boolean
    {
        if (this.handle.header('x-arr-ssl') && process.env['IISNODE_VERSION'])
           this.handle._secure = true;
        if (this.handle.header('x-forwarded-proto') == "https" && process.env['TD_WORKER_ID'])
           this.handle._secure = true;
        return this.handle.isSecure()
    }

    /**
     * 
     * Check if the incoming request is chunked.
     */
    public isChunked() : boolean
    {
        return this.handle.isChunked()
    }

    /**
     * 
     * Check if the incoming request is keep alive.
     */
    public isKeepAlive() : boolean
    {
        return this.handle.isKeepAlive()
    }

    /**
     * Gets the JSON body of the request. Requires ``body parser``
     */
    public bodyAsJson() : JsonObject
    {
        return this.handle.body
    }

    /**
     * Gets the request id
     */
    public id() : string
    {
        return this.handle.id
    }

    /**
     * Gets the parameter value.
     */
    public param(name: string) : string
    {
        return this.handle.params[name]
    }

    /**
     * Gets the body of the request as text. Requires ``body parser``.
     */
    public body() : string
    {
        return this.handle.body
    }

    /**
     * Get the method, eg. `GET` or `POST`
     */
    public method() : string
    {
        return this.handle.method
    }

    /**
     * Get the path of the request, eg. `/api/post?param=42`
     */
    public url() : string
    {
        return this.handle.url
    }

    /**
     * This property is an object containing the parsed query-string (needs `use(query parser)`)
     */
    public query() : JsonObject
    {
        return this.handle.query
    }

    /**
     * Gets the binary body of the request.
     */
    public async readBodyAsBufferAsync() : Promise<Buffer>
    {
        let body: Buffer;
        await new Promise(resume => {
            var bufs = []
            this.handle.on("data", function(data) {
              bufs.push(data)
            })
            this.handle.on("end", function() {
              body = Buffer.concat(bufs)
              resume()
            })
        });
        return body;
    }

    /**
     * Gets all the request headers
     */
    public headers() : JsonObject
    {
        return this.handle.headers
    }

    /**
     * Get the URL of the server (e.g., ``https://foobar.azurewebsites.net``)
     */
    public serverUrl() : string
    {
        let url: string;
        if (this.isSecure()) {
            url = "https://" + this.header("host");
        }
        else {
            url = "http://" + this.header("host");
        }
        return url;
    }

    /**
     * 
     * Get the IP address of the connecting client.
     */
    public remoteIp() : string
    {
        let ip: string;
        var fw = this.handle.header('x-forwarded-for')
        if (fw && (process.env['IISNODE_VERSION'] || process.env['TD_WORKER_ID'])) ip = fw
        else ip = this.handle.connection.remoteAddress + ""
        return ip;
    }

}

export class Response
{
    public handle:any;

    /**
     * Respond with a string.
     */
    public send(content: string, options_: ISendOptions = {}) : void
    {
        delete this.handle.__next
        var opts = options_;
        if (!this.handle.header('content-type')) {
          this.handle.setHeader('content-type', 'text/plain');
          this.handle.charSet("utf-8")
        }
        if (opts.status)
          this.handle.send(opts.status, content)
        else
          this.handle.send(content)
    }

    /**
     * Sets the response statusCode.
     * {hints:status:200}
     */
    public status(status: number) : void
    {
        this.handle.status(status)
    }

    /**
     * Respond with a JSON payload.
     */
    public json(content: JsonObject, options_: ISendOptions = {}) : void
    {
        delete this.handle.__next
        var body = content
        this.handle.charSet("utf-8")
        if (options_.status)
          this.handle.json(options_.status, body)
        else
          this.handle.json(body)
        ;
    }

    /**
     * Explicitely calls the next handler
     */
    public next() : void
    {
        /*JS*/
        var n = this.handle.__next;
        delete this.handle.__next
        if (n) n()
    }

    /**
     * Sends an error back
     */
    public nextError(error: Error) : void
    {
        var n = this.handle.__next;
        delete this.handle.__next
        if (n) n(error)
    }

    /**
     * Sets the header value
     */
    public setHeader(name: string, value: string) : void
    {
        this.handle.setHeader(name,value)
    }

    /**
     * Sends an HTTP error
     * {hints:status:400,401,402,403,404}
     */
    public sendError(status: number, message: string) : void
    {
        delete this.handle.__next
        if (!message) message = httpMod.STATUS_CODES[status] || "code: " + status
        this.handle.send(status, new Error(message))
    }

    /**
     * Explicitely calls the next handler
     * {hints:status code:302,301,303}
     */
    public redirect(statusCode: number, url: string) : void
    {
        this.setHeader("Location", url);
        this.sendStatus(statusCode);
    }

    public sendStatus(statusCode: number) : void
    {
        this.send("", {
            status: statusCode
        });
    }

    /**
     * Sets the response '; charset=...' in Content-Type header.
     * {hints:charset:utf-8,iso-8859-1}
     */
    public charset(encoding: string) : void
    {
        this.handle.charSet(encoding)
    }

    /**
     * Respond with HTML document, bypassing formatters.
     */
    public html(content: string, options_: ISendOptions = {}) : void
    {
        this.sendText(content, "text/html", options_);
    }

    /**
     * Respond with any text document, bypassing formatters.
     * {hints:content type:text/plain,text/html,text/css,text/cache-manifest,application/javascript}
     */
    public sendText(content: string, contentType: string, options_: ISendOptions = {}) : void
    {
        delete this.handle.__next
        var opts = options_;
        var buf = new Buffer(content, "utf8");
        this.handle.setHeader('content-type', contentType + '; charset=utf8');
        this.handle.setHeader('content-length', buf.length);
        this.handle.writeHead(opts.status || 200);
        this.handle.write(buf);
        this.handle.end();
        ;
    }

    /**
     * Respond with a given buffer.
     * {hints:content type:application/octet-stream,image/jpeg,image/png}
     */
    public sendBuffer(content: Buffer, contentType: string, options_: ISendOptions = {}) : void
    {
        delete this.handle.__next
        var opts = options_
        var buf = content
        this.handle.setHeader('content-type', contentType);
        this.handle.setHeader('content-length', buf.length);
        this.handle.writeHead(opts.status || 200);
        this.handle.write(buf);
        this.handle.end();
        ;
    }

    /**
     * Check if the response was already sent.
     */
    public finished() : boolean
    {
        return this.handle.tdFinished || this.handle.finished
    }

    /**
     * Sends an HTTP error
     * {hints:status:400,401,402,403,404}
     */
    public sendCustomError(status: number, message: string) : void
    {
        if (message == null) {
            message = "";
        }
        assert( ! td.stringContains(message, "\n"), "Head-message cannot contain new lines");
        delete this.handle.__next
        if (!message) message = httpMod.STATUS_CODES[status] || "code: " + status
        var buf = new Buffer(JSON.stringify({ message: message }, null, 2), "utf8");
        this.handle.writeHead(status, message, { 
          "Content-Type": "application/json;charset=utf8",
          "Content-Length": buf.length
        })
        this.handle.end(buf);
    }

}

export interface IThrottleOptions {
    rate?: number;
    burst?: number;
    ip?: boolean;
    xff?: boolean;
    username?: boolean;
    maxKeys?: number;
    // tokensTable?: TokensTable;
}

export interface IServeStaticOptions {
    default?: string;
    maxAge?: number;
}

export interface ICORSOptions {
    origins?: string;
    credentials?: boolean;
    headers?: string;
}

export interface IBodyParserOptions {
    maxBodySize?: number;
    mapParams?: boolean;
    mapFiles?: boolean;
    overrideParams?: boolean;
}

export interface ISendOptions {
    status?: number;
}

export interface IHTTPStatusCodes {
    _200OK?: number;
    _201Created?: number;
    _300MultipleChoices?: number;
    _301MovedPermanently?: number;
    _302MovedTemporarily?: number;
    _303SeeOther?: number;
    _304NotModified?: number;
    _307TemporaryRedirect?: number;
    _400BadRequest?: number;
    _401Unauthorized?: number;
    _402PaymentRequired?: number;
    _403Forbidden?: number;
    _404NotFound?: number;
    _405MethodNotAllowed?: number;
    _408RequestTimeout?: number;
    _409Conflict?: number;
    _410Gone?: number;
    _412PreconditionFailed?: number;
    _413RequestEntityTooLarge?: number;
    _415UnsupportedMediaType?: number;
    _418ImATeapot?: number;
    _422UnprocessableEntity?: number;
    _423Locked?: number;
    _424FailedDependency?: number;
    _425UnorderedCollection?: number;
    _429TooManyRequests?: number;
    _500InternalServerError?: number;
    _501NotImplemented?: number;
    _503ServiceUnavailable?: number;
}


function example() : void
{
    // This library is a thin wrapper around the [node-restify](http://mcavage.me/node-restify/) engine that TouchDevelop uses to route requests in web applications.
    // ## configuring your web app
    // Typically, you'll want to setup your routes in the initialization of your web library or ``_init`` action.
    // ## application and router
    // * start by creating an Restify server app.
    let ser = server();
    // ## routing
    // You define routing path using ``get``, ``post``, ... Each function will match the HTTP method. ``all`` matches all methods.
    // * define new routes to handle requests
    ser.get("/ping", async (req: Request, res: Response) => {
        res.send(new Date().getTime().toString());
    });
    // ## middleware
    // * support for CORS
    ser.use(CORS());
    // * if you want to use `req->query`
    ser.use(bodyParser());
}

var rootRestifyApp:Server;

/**
 * Gets the restify root sever instance.
 */
export function server() : Server
{
    init();
    return rootRestifyApp
}

function init() : void
{
    if (logger == null) {
        logger = td.createLogger("restify");
        initProxy(logger);
        httpStatus = {};
        httpStatus._200OK = 200;
        httpStatus._201Created = 201;
        httpStatus._300MultipleChoices = 300;
        httpStatus._301MovedPermanently = 301;
        httpStatus._302MovedTemporarily = 302;
        httpStatus._303SeeOther = 303;
        httpStatus._304NotModified = 304;
        httpStatus._307TemporaryRedirect = 307;
        httpStatus._400BadRequest = 400;
        httpStatus._401Unauthorized = 401;
        httpStatus._402PaymentRequired = 402;
        httpStatus._403Forbidden = 403;
        httpStatus._404NotFound = 404;
        httpStatus._405MethodNotAllowed = 405;
        httpStatus._408RequestTimeout = 408;
        httpStatus._409Conflict = 409;
        httpStatus._410Gone = 410;
        httpStatus._412PreconditionFailed = 412;
        httpStatus._413RequestEntityTooLarge = 413;
        httpStatus._415UnsupportedMediaType = 415;
        httpStatus._418ImATeapot = 418;
        httpStatus._422UnprocessableEntity = 422;
        httpStatus._423Locked = 423;
        httpStatus._424FailedDependency = 424;
        httpStatus._425UnorderedCollection = 425;
        httpStatus._429TooManyRequests = 429;
        httpStatus._500InternalServerError = 500;
        httpStatus._501NotImplemented = 501;
        httpStatus._503ServiceUnavailable = 503;
    }
}

export function handleRequest(req, res)
{
    rootRestifyApp.handle._setupRequest(req, res);
    return rootRestifyApp.handle._handle(req, res);
}

function restifyErrorResponse(e, req:Request, res:Response, route) {
    if (!e.tdMeta) e.tdMeta = {}
    e.body = { 
        message: e.message, 
        stack: e.tdMeta.compressedStack,
//        origStack: typeof e.stack == "string" ? e.stack.split(/\n/) : [],
        reportId: e.tdMeta.reportId,
    }
    if (route && route.name)
      e.tdMeta.routeName = route.name
    if (req) {
      e.tdMeta.reqUrl = req.method() + " " + (req.url() || "???").replace(/access_token=.*/, "[secure]")
      e.tdNodeRequest = req.handle
    }
    e.tdMeta.interesting = true
}

function restifyHandlerFactory(then:RequestHandler) {
    return (req, res, next) => {
      res.__next = next;
      then(req, res)
      .then(
        () => {
           var n = res.__next; delete res.__next
           if (n) n();
        },
        err => {
           restifyErrorResponse(err, req, res, null)
           td.App.logException(err)
           var n = res.__next; delete res.__next
           if (n) n(err);
        })
    }
}

function initProxy(logger:td.AppLogger) : void
{
    logger.debug("starting");

    var server = restify.createServer()
    rootRestifyApp = new Server()
    rootRestifyApp.handle = server

    server.use(restify.acceptParser(server.acceptable));
    
    
    server.on("uncaughtException", (req, res, route, e) => {
        restifyErrorResponse(e, req, res, route)
        // TODO s.rt.handleException(e, null)
        if (!res.finished && !res.tdFinished) {
           res.send(500, e)
        }
    })
}

/**
 * Supports tacking CORS headers into actual requests (as defined by the spec).
 */
export function CORS(options: ICORSOptions = {}) : Middleware
{
    var o:any = { }
    if (options.origins) o.origins = options.origins.split(';')
    if (options.credentials) o.credentials = true
    if (options.headers) o.headers = options.headers.split(';')
    return restify.CORS(o)
}

/**
 * You can use this handler to let clients do nice HTTP semantics with the "match" headers.
 */
export function conditionalRequest() : Middleware
{
    return restify.conditionalRequest()
}

/**
 * A plugin to gzip the response if the client supports it.
 */
export function gzipResponse() : Middleware
{
    return restify.gzipResponse()
}

/**
 * Blocks your chain on reading and parsing the HTTP request body. Switches on ``Content-Type`` and does the appropriate logic. ``application/json``, ``application/x-www-form-urlencoded`` and ``multipart/form-data`` are currently supported.
 */
export function bodyParser(options: IBodyParserOptions = {}) : Middleware
{
    return restify.bodyParser(options)
}

export function throttle(options_: IThrottleOptions = {}) : Middleware
{
    if (!options_.burst) {
        options_.burst = 100;
    }
    if (!options_.rate) {
        options_.rate = 50;
    }
    logger.debug("throttle options: " + JSON.stringify(options_, null, 2));
    return restify.throttle(options_)
}

/**
 * Parses out the HTTP Date header (if present) and checks for clock skew
 * (default allowed clock skew is 300s, like Kerberos). You can pass in a
 * number, which is interpreted in seconds, to allow for clock skew.
 * {hints:clock skew:300,60}
 */
export function dateParser(clockSkew: number) : Middleware
{
    return restify.dateParser(clockSkew)
}

/**
 * The plugin will enforce that all files under ``directory`` are served. The directory served is relative to the process working directory. This module is different than most of the other plugins, in that it is expected that you are going to map it to a route.
 */
export function serveStatic(directory: string, options: IServeStaticOptions = {}) : Middleware
{
    var o:any = {
      directory: directory
    }
    if (o.default) o.default = options.default
    if (o.maxAge) o.maxAge = options.maxAge
    return restify.serveStatic(o);
}

/**
 * Parses the HTTP query string (i.e., ``/foo?id=bar&name=mark``). If you use
 * this, the parsed content will always be available in ``req->query``,
 * additionally ``params`` are merged into ``req->params``.
 */
export function queryParser() : Middleware
{
    return restify.queryParser()
}

/**
 * Parses out the ``Authorization`` header as best restify can. Currently only HTTP Basic Auth and [HTTP Signature](https://github.com/joyent/node-http-signature) schemes are supported. When this is used, ``req->authorization`` will be set.
 */
export function authorizationParser() : Middleware
{
    return restify.authorizationParser()
}

/**
 * Supports checking the query string for callback or jsonp and ensuring that the content-type is appropriately set if JSONP params are in place. There is also a default ``application/javascript`` formatter to handle this.
 * You should set the ``query parser`` plugin to run before this, but if you don't this plugin will still parse the query string properly.
 */
export function jsonp() : Middleware
{
    return restify.jsonp()
}

/**
 * A plugin that cleans up the path
 */
export function sanitizePath() : Middleware
{
    return restify.sanitizePath();
}

/**
 * Interesting HTTP status codes.
 */
export function http() : IHTTPStatusCodes
{
    init();
    return httpStatus;
}

function setupHandler(method: string, path: string, then: RequestHandler) : RequestHandler
{
    return async (req: Request, res: Response) => {
        logger.newContext();
        let url = req.url().replace(/access_token=.*/g, "[secure]");
        let id = method + " " + path;
        logger.debug("start " + method + " " + url);

        var fin = () => {
          var meta = { rawURL: url, statusCode: res.handle.statusCode }
          logger.customTick(id, meta)
          res.handle.tdFinished = true;
        }
        if (!res.handle.origEnd) res.handle.origEnd = res.handle.end;
        res.handle.end = function() {
          this.origEnd.apply(this, arguments);
          fin();
        }
        await then(req, res);
    };
}

export function disableTicks() : void
{
    logger.customTick = function() {}
}
