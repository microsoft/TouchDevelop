/// <reference path='../typings/node/node.d.ts' />

'use strict';

import * as td from './td';
import * as assert from 'assert';
import * as crypto from 'crypto';
import * as querystring from 'querystring';
import * as child_process from 'child_process';

type JsonObject = td.JsonObject;
type JsonBuilder = td.JsonBuilder;

var asArray = td.asArray;

import * as azureTable from "./azure-table"
import * as azureBlobStorage from "./azure-blob-storage"
import * as parallel from "./parallel"
import * as cachedStore from "./cached-store"
import * as redis from "./redis"
import * as indexedStore from "./indexed-store"
import * as restify from "./restify"
import * as tdliteIndex from "./tdlite-index"
import * as tdliteHtml from "./tdlite-html"

export type ApiReqHandler = (req: ApiRequest) => Promise<void>;
export type ResolutionCallback = (fetchResult: indexedStore.FetchResult, apiRequest: ApiRequest) => Promise<void>;

export var validateTokenAsync : (req: ApiRequest, rreq: restify.Request) => Promise<void>;
export var executeSearchAsync : (kind: string, q: string, req: ApiRequest) => Promise<void>;
export var somePubStore: indexedStore.Store;
export var logger = td.createLogger("tdlite");

export var adminRequest: ApiRequest;
export var basicCreds: string = "";
export var blobService: azureBlobStorage.BlobService;
export var cachedApiContainer: cachedStore.Container;
export var emptyRequest: ApiRequest;
export var fullTD: boolean = false;
export var hasHttps: boolean = false;
export var httpCode = restify.http();
export var lastSearchReport: Date;
export var myChannel: string = "";
export var myHost: string = "";
export var nonSelfRedirect: string = "";
export var pubsContainer: cachedStore.Container;
export var redisClient: redis.Client;
export var self: string = "";
export var settingsPermissions: JsonObject;
export var tableClient: azureTable.Client;
export var throttleDisabled: boolean = false;
export var tokenSecret:string;
export var serviceSettings: ServiceSettings;
export var settingsContainer: cachedStore.Container;
export var currClientConfig: ClientConfig;
export var releaseVersionPrefix: string = "0.0";
export var rewriteVersion: number = 221;


var lastSettingsCheck: number = 0;

export class ServiceSettings
    extends td.JsonRecord
{
    @td.json public paths: JsonObject;
    @td.json public emailFrom: string = "";
    @td.json public accounts: JsonObject;
    @td.json public alarmingEmails: JsonObject;
    @td.json public termsversion: string = "";
    @td.json public blockedNicknameRx: string = "";
    @td.json public tokenExpiration: number = 0;
    @td.json public defaultLang: string = "";
    @td.json public langs: JsonObject;
    @td.json public envrewrite: JsonObject;
    static createFromJson(o:JsonObject) { let r = new ServiceSettings(); r.fromJson(o); return r; }
}

export interface IServiceSettings {
    paths: JsonObject;
    emailFrom: string;
    accounts: JsonObject;
    alarmingEmails: JsonObject;
    termsversion: string;
    blockedNicknameRx: string;
    tokenExpiration: number;
    defaultLang: string;
    langs: JsonObject;
    envrewrite: JsonObject;
}

export class RouteIndex
{
    public method: string = "";
    public root: string = "";
    public verb: string = "";
    public handler: ApiReqHandler;
    public options: IRouteOptions;

    static _dict:td.SMap<RouteIndex> = {};
    static has(m:string, r:string, v:string):boolean
    {
        if (/%/.test((m+r+v)))
            return false
        var h = m + "%" + r + "%" + v
        return RouteIndex._dict.hasOwnProperty(h)
    }

    static at(m:string, r:string, v:string):RouteIndex
    {
        if (/%/.test((m+r+v)))
            return null
        var h = m + "%" + r + "%" + v
        if (!RouteIndex._dict.hasOwnProperty(h)) {
            var x = new RouteIndex()
            x.method = m
            x.root = r
            x.verb = v
            RouteIndex._dict[h] = x
        }
        return RouteIndex._dict[h]
    }
}

export class ApiRequest
{
    public method: string = "";
    public root: string = "";
    public rootPub: JsonObject;
    public rootId: string = "";
    public verb: string = "";
    public queryOptions: JsonObject;
    public body: JsonObject;
    public userid: string = "";
    public argument: string = "";
    public subArgument: string = "";
    public subSubArgument: string = "";
    public status: number = 0;
    public response: JsonObject;
    public responseContentType: string = "";
    public isUpgrade: boolean = false;
    public upgradeTasks: Promise<void>[];
    public origUrl: string = "";
    public startTime: number = 0;
    public throttleIp: string = "";
    public route: RouteIndex;
    public isTopLevel: boolean = false;
    public headers: td.StringMap;
    public userinfo: ApireqUserInfo;
    public isCached: boolean = false;
}

export interface DecoratedStore
{
    myResolve: ResolutionCallback;
}

export interface IStoreDecorator {
    target: indexedStore.Store;
    resolve: ResolutionCallback;
}


export class Token
    extends td.JsonRecord
{
    @td.json public PartitionKey: string = "";
    @td.json public RowKey: string = "";
    @td.json public time: number = 0;
    @td.json public reason: string = "";
    @td.json public cookie: string = "";
    @td.json public version: number = 0;
    static createFromJson(o:JsonObject) { let r = new Token(); r.fromJson(o); return r; }
}

export interface IToken {
    PartitionKey: string;
    RowKey: string;
    time: number;
    reason: string;
    cookie: string;
    version: number;
}


export class ApireqUserInfo
    extends td.JsonRecord
{
    public id: string = "";
    public token: Token;
    public json: JsonObject;
    public permissionCache: JsonBuilder;
    public ip: string = "";
}


export class ClientConfig
    extends td.JsonRecord
{
    @td.json public workspaceUrl: string = "";
    @td.json public searchUrl: string = "";
    @td.json public searchApiKey: string = "";
    @td.json public apiUrl: string = "";
    @td.json public rootUrl: string = "";
    @td.json public liteVersion: string = "";
    @td.json public tdVersion: string = "";
    @td.json public releaseid: string = "";
    @td.json public relid: string = "";
    @td.json public releaseLabel: string = "";
    @td.json public shareUrl: string = "";
    @td.json public cdnUrl: string = "";
    @td.json public anonToken: string = "";
    @td.json public primaryCdnUrl: string = "";
    @td.json public altCdnUrls: string[];
    static createFromJson(o:JsonObject) { let r = new ClientConfig(); r.fromJson(o); return r; }
}

export interface IClientConfig {
    workspaceUrl: string;
    searchUrl: string;
    searchApiKey: string;
    apiUrl: string;
    rootUrl: string;
    liteVersion: string;
    tdVersion: string;
    releaseid: string;
    relid: string;
    releaseLabel: string;
    shareUrl: string;
    cdnUrl: string;
    anonToken: string;
    primaryCdnUrl: string;
    altCdnUrls: string[];
}

export async function fetchQueryAsync(query: azureTable.TableQuery, req: restify.Request) : Promise<JsonObject>
{
    let entities: JsonObject;
    query = query.continueAt(req.query()["continuation"]);
    let count = req.query()["count"];
    if (count != null) {
        query = query.top(count);
    }
    entities = (await query.fetchPageAsync()).toJson();
    return entities;
}

export interface IRouteOptions {
    noSizeCheck?: boolean;
    sizeCheckExcludes?: string;
    cacheKey?: string;
}

/**
 * {hints:method:GET,POST,PUT,DELETE}
 */
export function addRoute(method: string, root: string, verb: string, handler: ApiReqHandler, options_: IRouteOptions = {}) : void
{
    let route = RouteIndex.at(method, root, verb);
    route.options = options_;

    if (options_.noSizeCheck || method == "GET" || method == "DELETE") {
        route.handler = handler;
    }
    else {
        route.handler = async (req: ApiRequest) => {
            let size = 0;
            if (req.body != null) {
                if (options_.sizeCheckExcludes) {
                    let jsb = td.clone(req.body);
                    delete jsb[options_.sizeCheckExcludes];
                    size = JSON.stringify(jsb).length;
                }
                else {
                    size = JSON.stringify(req.body).length;
                }
            }
            if (size > 20000) {
                req.status = httpCode._413RequestEntityTooLarge;
            }
            else {
                await handler(req);
            }
        }
        ;
    }
}

var orEmpty = td.orEmpty;

export async function anyListAsync(store: indexedStore.Store, req: ApiRequest, idxName: string, key: string) : Promise<void>
{
    let entities = await fetchAndResolveAsync(store, req, idxName, key);
    buildListResponse(entities, req);
}

export function aliasRoute(method: string, copy: string, src: string) : void
{
    let dst = RouteIndex.at(method, copy, "");
    let route = RouteIndex.at(method, src, "");
    dst.handler = route.handler;
    dst.options = route.options;
}

export function withDefault(s: string, defl: string) : string
{
    return td.toString(s) || defl;    
}

export function hashPassword(salt: string, pass: string) : string
{
    let hashed: string;
    if (salt == "") {
        salt = crypto.randomBytes(8).toString("hex");
    }
    else {
        salt = salt.replace(/\$.*/g, "");
    }

    hashed = salt + "$$" + sha256(salt + orEmpty(pass));
    return hashed;
}

export async function nowSecondsAsync() : Promise<number>
{
    let value: number;
    value = Math.floor(await redisClient.cachedTimeAsync() / 1000);
    return value;
}

export async function getPubAsync(id: string, kind: string) : Promise<JsonObject>
{
    let entry2: JsonObject;
    if (nonEmpty(id)) {
        entry2 = await pubsContainer.getAsync(id);
        if (entry2 == null || orEmpty(entry2["kind"]) != kind) {
            entry2 = (<JsonObject>null);
        }
    }
    else {
        entry2 = (<JsonObject>null);
    }
    return entry2;
}

export function nonEmpty(id: string) : boolean
{
    let b: boolean;
    b = id != null && id != "";
    return b;
}

export function sendResponse(apiRequest: ApiRequest, req: restify.Request, res: restify.Response) : void
{
    if (apiRequest.status != 200) {
        if (apiRequest.status == httpCode._401Unauthorized) {
            res.sendError(httpCode._403Forbidden, "Invalid or missing ?access_token=...");
        }
        else if (apiRequest.status == httpCode._402PaymentRequired) {
            res.sendCustomError(httpCode._402PaymentRequired, "Your account is not authorized to perform this operation.");
        }
        else {
            res.sendError(apiRequest.status, "");
        }
    }
    else if (apiRequest.response == null) {
        assert(false, "response unset");
    }
    else {
        let etag = computeEtagOfJson(apiRequest.response);
        if (apiRequest.method == "GET" && orEmpty(req.header("If-None-Match")) == etag) {
            res.sendError(httpCode._304NotModified, "");
            return;
        }
        res.setHeader("ETag", etag);
        if ( ! apiRequest.isCached) {
            res.setHeader("Cache-Control", "no-cache, no-store");
        }
        if (apiRequest.headers != null) {
            for (let hd of Object.keys(apiRequest.headers)) {
                res.setHeader(hd, apiRequest.headers[hd]);
            }
        }
        if (typeof apiRequest.response == "string") {
            res.setHeader("X-Content-Type-Options", "nosniff");
            res.sendText(td.toString(apiRequest.response), withDefault(apiRequest.responseContentType, "text/plain"));
        }
        else {
            res.json(apiRequest.response);
        }
    }
}

export function buildApiRequest(url: string) : ApiRequest
{
    let apiReq: ApiRequest;
    apiReq = new ApiRequest();
    apiReq.origUrl = url;
    
    let m = /^([^?]*)\?(.*)/.exec(url)
    let path = url;
    let query = {};
    
    if (m) {
        path = m[1]
        query = querystring.parse(m[2])
    }
    path = path.replace(/^\//, "")
        
    let strings = path.split("/");
    if (strings.length > 0 && strings[0] == "api") {
        strings.splice(0, 1);
    }
    if (strings.length > 0 && strings[0] == "cached") {
        strings.splice(0, 1);
        apiReq.isCached = true;
    }
    apiReq.method = "GET";
    apiReq.root = orEmpty(strings[0]);
    apiReq.verb = orEmpty(strings[1]);
    apiReq.argument = orEmpty(strings[2]);
    apiReq.subArgument = orEmpty(strings[3]);
    apiReq.subSubArgument = orEmpty(strings[4]);
    apiReq.queryOptions = query;
    apiReq.status = 200;
    apiReq.userinfo = new ApireqUserInfo();
    apiReq.userinfo.permissionCache = {};
    apiReq.body = {};
    return apiReq;
}

export function copyJson(js: JsonObject, jsb: JsonBuilder) : void
{
    for (let key of Object.keys(js)) {
        jsb[key] = js[key];
    }
}

export function getUserPlatforms(req: ApiRequest) : string[]
{
    if ( ! fullTD) {
        return (<string[]>[]);
    }
    return withDefault(req.queryOptions["user_platform"], "unknown").split(",");
}

export function increment(entry: JsonBuilder, counter: string, delta: number) : void
{
    let basePub = entry["pub"];
    if (basePub == null) {
        basePub = {};
        entry["pub"] = basePub;
        entry["kind"] = "reserved";
    }
    let x = basePub[counter];
    if (x == null) {
        x = 0;
    }
    basePub[counter] = x + delta;
}

export function computeEtagOfJson(resp: JsonObject) : string
{
    let etag: string;
    let hash = crypto.createHash("md5");
    hash.update(JSON.stringify(resp), "utf8");
    etag = hash.digest().toString("base64");
    return etag;
}

export interface IResolveOptions {
    byUserid?: boolean;
    byPublicationid?: boolean;
    anonList?: boolean;
    anonSearch?: boolean;
}

export async function setResolveAsync(store: indexedStore.Store, resolutionCallback: ResolutionCallback, options_: IResolveOptions = {}) : Promise<void>
{
    if (options_.anonList) {
        options_.anonSearch = true;
    }
    (<DecoratedStore><any>store).myResolve = resolutionCallback;
    addRoute("GET", "*" + store.kind, "", async (req: ApiRequest) => {
        let fetchResult = store.singleFetchResult(req.rootPub);
        await resolveAsync(store, fetchResult, req);
        req.response = fetchResult.items[0];
        if (req.response == null) {
            req.status = httpCode._402PaymentRequired;
        }
    });
    await store.createIndexAsync("all", entry => "all");
    let plural = store.kind + "s";
    if (plural == "arts") {
        plural = "art";
    }
    addRoute("GET", plural, "", async (req1: ApiRequest) => {
        let q = orEmpty(req1.queryOptions["q"]);
        if (q == "") {
            if ( ! options_.anonList) {
                checkPermission(req1, "global-list");
            }
            if (req1.status == 200) {
                await anyListAsync(store, req1, "all", "all");
            }
        }
        else {
            if ( ! options_.anonSearch) {
                checkPermission(req1, "global-list");
            }
            if (req1.status == 200) {
                await executeSearchAsync(store.kind, q, req1);
            }
        }
    });
    if (options_.byUserid) {
        // ### by posting user
        await store.createIndexAsync("userid", entry1 => entry1["pub"]["userid"]);
        let pubPlural = plural;
        if (pubPlural == "groups") {
            pubPlural = "owngroups";
        }
        addRoute("GET", "*user", pubPlural, async (req2: ApiRequest) => {
            await anyListAsync(store, req2, "userid", req2.rootId);
        });
    }
    if (options_.byPublicationid) {
        // ### by parent publication
        let pluralPub = plural;
        if (pluralPub == "subscriptions") {
            pluralPub = "subscribers";
        }
        if (pluralPub == "auditlogs") {
            pluralPub = "pubauditlogs";
        }
        await store.createIndexAsync("publicationid", entry2 => entry2["pub"]["publicationid"]);
        addRoute("GET", "*pub", pluralPub, async (req3: ApiRequest) => {
            if (req3.rootPub["kind"] == "group" && req3.rootPub["pub"]["isclass"]) {
                if (req3.userid == "") {
                    req3.status = httpCode._401Unauthorized;
                }
                else if ( ! req3.userinfo.json["groups"].hasOwnProperty(req3.rootPub["id"])) {
                    checkPermission(req3, "global-list");
                }
            }
            if (req3.status == 200) {
                await anyListAsync(store, req3, "publicationid", req3.rootId);
            }
        });
    }
}

export async function fetchAndResolveAsync(store: indexedStore.Store, req: ApiRequest, idxName: string, key: string) : Promise<indexedStore.FetchResult>
{
    let entities: indexedStore.FetchResult;
    entities = await store.getIndex(idxName).fetchAsync(key, req.queryOptions);    
    await resolveAsync(store, entities, req);
    return entities;
}

export async function returnOnePubAsync(store: indexedStore.Store, obj: JsonObject, apiRequest: ApiRequest) : Promise<void>
{
    apiRequest.response = await resolveOnePubAsync(store, obj, apiRequest);
    if (apiRequest.response == null) {
        apiRequest.status = httpCode._402PaymentRequired;
    }
}

export async function getOnePubAsync(store: indexedStore.Store, id: string, apiRequest: ApiRequest) : Promise<JsonObject>
{
    let js: JsonObject;
    let obj = await getPubAsync(id, store.kind);
    if (obj == null) {
        js = obj;
    }
    else {
        js = await resolveOnePubAsync(store, obj, apiRequest);
    }
    return js;
}

export async function generateIdAsync(jsb: JsonBuilder, minNameLength: number) : Promise<void>
{
    jsb["id"] = await somePubStore.generateIdAsync(minNameLength);
}

export async function copyUrlToBlobAsync(Container: azureBlobStorage.Container, id: string, url: string) : Promise<azureBlobStorage.BlobInfo>
{
    let result3: azureBlobStorage.BlobInfo;
    url = td.replaceAll(url, "az31353.vo.msecnd.net", "touchdevelop.blob.core.windows.net");
    let dlFailure = false;
    for (let i = 0; i < 3; i++) {
        if (result3 == null && ! dlFailure) {
            let request = td.createRequest(url);
            if (i > 0) {
                request.setHeader("Connection", "close");
            }
            let task = /* async */ request.sendAsync();
            let response = await td.awaitAtMostAsync(task, 15);
            if (response == null) {
                logger.info("timeout downloading " + url);
            }
            else if (response.statusCode() == 200) {
                let buf = response.contentAsBuffer();
                result3 = await Container.createBlockBlobFromBufferAsync(id, buf, {
                    contentType: response.header("Content-type"),
                    timeoutIntervalInMs: 3000
                });
                let err = "";
                if ( ! result3.succeded()) {
                    err = " ERROR: " + result3.error();
                }
                if (false) {
                    logger.debug("copy url for " + Container.url() + "/" + id + err);
                }
            }
            else if (response.statusCode() == 404) {
                dlFailure = true;
            }
            else {
                logger.info("error downloading " + url + " status " + response.statusCode());
            }
        }
    }
    return result3;
}

export function orZero(s: number) : number
{
    let r: number;
    if (s == null) {
        r = 0;
    }
    else {
        r = s;
    }
    return r;
}

export function buildListResponse(entities: indexedStore.FetchResult, req: ApiRequest) : void
{
    let bld = td.clone(entities.toJson());
    bld["kind"] = "list";
    let etags = td.toString(req.queryOptions["etagsmode"]);
    if (etags == null) {
    }
    else if (etags == "includeetags" || etags == "etagsonly") {
        let coll = asArray(entities.items).map<JsonBuilder>((elt: JsonObject) => {
            let result: JsonBuilder;
            result = {};
            result["id"] = elt["id"];
            result["kind"] = elt["kind"];
            result["ETag"] = computeEtagOfJson(elt);
            return result;
        });
        bld["etags"] = td.arrayToJson(coll);
        if (etags == "etagsonly") {
            delete bld["items"];
        }
    }
    req.response = td.clone(bld);
}

export function queueUpgradeTask(req: ApiRequest, task:Promise<void>) : void
{
    if (req.upgradeTasks == null) {
        req.upgradeTasks = [];
    }
    req.upgradeTasks.push(task);
}

export async function awaitUpgradeTasksAsync(req: ApiRequest) : Promise<void>
{
    if (req.upgradeTasks != null) {
        for (let task2 of req.upgradeTasks) {
            await task2;
        }
    }
}

export function isGoodEntry(entry: JsonObject) : boolean
{
    let b: boolean;
    b = entry != null && entry["kind"] != "reserved";
    return b;
}

export function isGoodPub(entry: JsonObject, kind: string) : boolean
{
    let b: boolean;
    b = entry != null && orEmpty(entry["kind"]) == kind;
    return b;
}

export function checkPermission(req: ApiRequest, perm: string) : void
{
    if (req.userid == "") {
        req.status = httpCode._401Unauthorized;
    }
    else if ( ! hasPermission(req.userinfo.json, perm)) {
        req.status = httpCode._402PaymentRequired;
    }
}

export async function throttleAsync(req: ApiRequest, kind: string, tokenCost_s_: number) : Promise<void>
{
    if ( ! throttleDisabled && req.status == 200) {
        if (callerHasPermission(req, "unlimited")) {
            return;
        }
        let drop = await throttleCoreAsync(withDefault(req.userid, req.throttleIp) + ":" + kind, tokenCost_s_);
        if (drop) {
            req.status = httpCode._429TooManyRequests;
        }
    }
}

export function normalizeAndHash(accessCode: string) : string
{
    let s: string;
    s = orEmpty(accessCode).toLowerCase().replace(/\s/g, "");
    if (s != "") {
        s = "code/" + sha256(s);
    }
    return s;
}

export function jsonAdd(entry: JsonBuilder, counter: string, delta: number) : void
{
    let x2 = orZero(entry[counter]) + delta;
    entry[counter] = x2;
}

export function orFalse(s: boolean) : boolean
{
    return td.toBoolean(s) || false;
}

export function checkGroupPermission(req: ApiRequest) : void
{
    if (req.userid == req.rootPub["pub"]["userid"]) {
    }
    else {
        checkPermission(req, "pub-mgmt");
    }
}

export function htmlQuote(tdUsername: string) : string
{
    let _new: string;
    _new = td.replaceAll(td.replaceAll(td.replaceAll(td.replaceAll(td.replaceAll(tdUsername, "&", "&amp;"), "<", "&lt;"), ">", "&gt;"), "\"", "&quot;"), "'", "&#39;");
    return _new;
}

export function handleBasicAuth(req: restify.Request, res: restify.Response) : void
{
    if (res.finished()) {
        return;
    }
    setHtmlHeaders(res);
    handleHttps(req, res);
    if (nonSelfRedirect != "" && ! res.finished()) {
        if (req.header("host").toLowerCase() != myHost) {
            if (nonSelfRedirect == "soon") {
                res.html(tdliteHtml.notFound_html, {
                    status: 404
                });
            }
            else if (nonSelfRedirect == "self") {
                res.redirect(httpCode._301MovedPermanently, self.replace(/\/$/g, "") + req.url());
            }
            else {
                res.redirect(httpCode._302MovedTemporarily, nonSelfRedirect);
            }
        }
    }
    if ( ! res.finished() && basicCreds != "") {
        if (orEmpty(req.query()["anon_token"]) == basicCreds) {
            // OK
        }
        else {
            let value = req.header("authorization");
            if (value == null || value != basicCreds) {
                res.setHeader("WWW-Authenticate", "Basic realm=\"TD Lite\"");
                res.sendError(401, "Authentication required");
            }
        }
    }
}

export async function checkFacilitatorPermissionAsync(req: ApiRequest, subjectUserid: string) : Promise<void>
{
    if (req.userid == "") {
        req.status = httpCode._401Unauthorized;
    }
    if (req.status == 200) {
        let userjs = await getPubAsync(subjectUserid, "user");
        if (userjs == null) {
            checkPermission(req, "root");
            return;
        }
        if ( ! callerIsFacilitatorOf(req, userjs)) {
            req.status = httpCode._402PaymentRequired;
        }
        else {
            // You need to have all of subject's permission to delete their stuff.
            checkPermission(req, getPermissionLevel(userjs));
        }
    }
}

export async function followPubIdsAsync(fetchResult: JsonObject[], field: string, kind: string) : Promise<JsonObject[]>
{
    let pubs: JsonObject[];
    let ids = (<string[]>[]);
    for (let js of fetchResult) {
        let s = js["pub"][field];
        ids.push(s);
    }
    pubs = await pubsContainer.getManyAsync(ids);
    if (kind != "") {
        pubs = pubs.filter(elt => isGoodPub(elt, kind));
    }
    else {
        pubs = pubs.map<JsonObject>((elt1: JsonObject) => {
            let result: JsonObject;
            if (elt1 == null || elt1["kind"] == "reserved") {
                return (<JsonObject>null);
            }
            else {
                return elt1;
            }
            return result;
        });
    }
    return pubs;
}

export function meOnly(req: ApiRequest) : void
{
    if (req.rootId != req.userid) {
        checkMgmtPermission(req, "me-only");
    }
}

export function normalizePermissions(perm: string) : string
{
    let perm2: string;
    perm = orEmpty(perm).replace(/,+/g, ",");
    if (perm == "") {
        perm2 = "";
    }
    else {
        if ( ! td.startsWith(perm, ",")) {
            perm = "," + perm;
        }
        if ( ! perm.endsWith(",")) {
            perm = perm + ",";
        }
        perm2 = perm;
    }
    return perm2;
}

export function sha256(hashData: string) : string
{
    let sha: string;
    let hash = crypto.createHash("sha256");
    hash.update(hashData, "utf8");
    sha = hash.digest().toString("hex").toLowerCase();
    return sha;
}

export function handleHttps(req: restify.Request, res: restify.Response) : void
{
    if (hasHttps && ! req.isSecure() && ! td.startsWith(req.serverUrl(), "http://localhost:")) {
        res.redirect(302, req.serverUrl().replace(/^http/g, "https") + req.url());
    }
}

export function setFields(bld: JsonBuilder, body: JsonObject, fields: string[]) : void
{
    for (let fld of fields) {
        if (body.hasOwnProperty(fld) && typeof body[fld] == typeof bld[fld]) {
            bld[fld] = body[fld];
        }
    }
}

export function canBeAdminDeleted(jsonpub: JsonObject) : boolean
{
    let b: boolean;
    b = /^(art|screenshot|comment|script|group|publist|channel|pointer)$/.test(jsonpub["kind"]);
    return b;
}

export async function checkDeletePermissionAsync(req: ApiRequest) : Promise<void>
{
    let pub = req.rootPub["pub"];
    let authorid = pub["userid"];
    if (pub["kind"] == "user") {
        authorid = pub["id"];
    }
    if (authorid != req.userid) {
        await checkFacilitatorPermissionAsync(req, authorid);
    }
}

export async function canPostAsync(req: ApiRequest, kind: string) : Promise<void>
{
    if (req.userid == "") {
        req.status = httpCode._401Unauthorized;
    }
    else {
        checkPermission(req, "post-" + kind);
        if (req.status == 200) {
            if (callerHasPermission(req, "post-raw") || callerHasPermission(req, "unlimited")) {
                // no throttle
            }
            else {
                await throttleAsync(req, "pub", 60);
            }
        }
    }
}

export async function pokeSubChannelAsync(channel: string) : Promise<void>
{
    let s = td.randomInt(1000000000).toString();
    await redisClient.setAsync(channel, s);
    await redisClient.publishAsync(channel, s);
}

export async function getSubChannelAsync(ch: string) : Promise<number>
{
    let v: number;
    let value = await redisClient.getAsync(ch);
    if (value == null) {
        value = td.randomInt(1000000000).toString();
        await redisClient.setAsync(ch, value);
    }
    v = parseFloat(value);
    return v;
}

export async function longPollAsync(ch: string, long: boolean, req: ApiRequest) : Promise<number>
{
    let v: number;
    v = await getSubChannelAsync(ch);
    if (long && orZero(req.queryOptions["v"]) == v) {
        logger.contextPause();
        let message = await redisClient.waitOnAsync(ch, 30);
        logger.contextResume();
        if (message == null) {
            req.status = 204;
        }
        else {
            v = await getSubChannelAsync(ch);
        }
    }

    return v;
}

export async function throttleCoreAsync(throttleKey: string, tokenCost_s_: number) : Promise<boolean>
{
    let drop: boolean;
    let keys = (<string[]>[]);
    keys.push("throttle:" + throttleKey);
    let args = (<string[]>[]);
    args.push(await redisClient.cachedTimeAsync() + "");
    if (throttleDisabled) {
        // still simulate throttling at 1/1000 of rate (redis writes); below we ignore the result anyway
        args.push(tokenCost_s_ + "");
    }
    else {
        args.push(tokenCost_s_ * 1000 + "");
    }
    // accumulate tokens for up N seconds
    let accumulationSeconds = 3600;
    args.push(accumulationSeconds * 1000 + "");
    // return wait times of up to 10000ms
    args.push("10000");
    let value = await redisClient.evalAsync("local now     = ARGV[1]\nlocal rate    = ARGV[2] or 1000   -- token cost (1000ms - 1 token/seq)\nlocal burst   = ARGV[3] or 3600000    -- accumulate for up to an hour\nlocal dropAt  = ARGV[4] or 10000  -- return wait time of up to 10s; otherwise just drop the request\n\nlocal curr = redis.call(\"GET\", KEYS[1]) or 0\nlocal newHorizon = math.max(now - burst, curr + rate)\nlocal sleepTime  = math.max(0, newHorizon - now)\n\nif sleepTime > tonumber(dropAt) then\n  return -1\nelse\n  redis.call(\"SET\", KEYS[1], newHorizon)\n  return sleepTime\nend", keys, args);
    let sleepTime = td.toNumber(value);
    if (throttleDisabled) {
        sleepTime = 0;
    }
    drop = false;
    if (sleepTime < 0) {
        drop = true;
    }
    else if (sleepTime > 0) {
        await td.sleepAsync(sleepTime / 1000);
    }
    return drop;
}

export function hasSpecialDelete(jsonpub: JsonObject) : boolean
{
    let b: boolean;
    b = /^(review|user)$/.test(jsonpub["kind"]);
    return b;
}

export async function tryInsertPubPointerAsync(key: string, pointsTo: string) : Promise<boolean>
{
    let ref = false;
    await pubsContainer.updateAsync(key, async (entry: JsonBuilder) => {
        if (withDefault(entry["kind"], "reserved") == "reserved") {
            entry["kind"] = "pubpointer";
            entry["pointer"] = pointsTo;
            entry["id"] = key;
            ref = true;
        }
        else {
            ref = false;
        }
    });
    return ref;
}

export async function getPointedPubAsync(key: string, kind: string) : Promise<JsonObject>
{
    let entry: JsonObject;
    let ptr = await getPubAsync(key, "pubpointer");
    if (ptr == null) {
        entry = (<JsonObject>null);
    }
    else {
        entry = await getPubAsync(ptr["pointer"], kind);
    }
    return entry;
}

export function sanitze(s: string) : string
{
    let value: string;
    value = s.replace(/access_token=.*/g, "[snip]");
    return value;
}

export function sanitizeJson(jsb: JsonBuilder) : void
{
    for (let k of Object.keys(jsb)) {
        let v = jsb[k];
        if (typeof v == "string") {
            jsb[k] = sanitze(td.toString(v));
        }
        else if (typeof v == "object") {
            sanitizeJson(v);
        }
    }
}

export function saltFilename(plain: string) : string
{
    let salted: string;
    salted = plain + sha256("filesalt:" + tokenSecret + plain).substr(0, 20);
    return salted;
}

export async function followIdsAsync(fetchResult: JsonObject[], field: string, kind: string) : Promise<JsonObject[]>
{
    let pubs: JsonObject[];
    let ids = (<string[]>[]);
    for (let js of fetchResult) {
        let s = js[field];
        ids.push(s);
    }
    pubs = (await pubsContainer.getManyAsync(ids)).filter(elt => isGoodPub(elt, kind));
    return pubs;
}

export function checkPubPermission(req: ApiRequest) : void
{
    if (req.userid == req.rootPub["pub"]["userid"]) {
    }
    else {
        checkPermission(req, "pub-mgmt");
    }
}

export function pathToPtr(fn: string) : string
{
    let s: string;
    if (! fn) {
        return "";
    }
    s = "ptr-" + fn.replace(/^\/+/g, "").replace(/[^a-zA-Z0-9@]/g, "-").toLowerCase();
    return s;
}

export function hasSetting(key: string) : boolean
{
    let hasSetting: boolean;
    hasSetting = orEmpty(td.serverSetting(key, true)) != "";
    return hasSetting;
}

export function progress(message: string) : void
{
    if (false) {
        logger.debug(message);
    }
}

export async function cpuLoadAsync() : Promise<number>
{
    let load: number;
    await new Promise(resume => {
        child_process.execFile("wmic", ["cpu", "get", "loadpercentage"], function (err, res:string) {
          var arr = [];
          if (res)
            res.replace(/\d+/g, m => { arr.push(parseFloat(m)); return "" });
          load = 0;
          arr.forEach(function(n) { load += n });
          load = load / arr.length;
          resume();
        });
    });
    return load;
}

export async function statusReportLoopAsync() : Promise<void>
{
    while (true) {
        await td.sleepAsync(30 + td.randomRange(0, 10));
        let value = await cpuLoadAsync();
        logger.measure("load-perc", value);
    }
}

export function bareIncrement(entry: JsonBuilder, key: string) : void
{
    entry[key] = orZero(entry[key]) + 1;
}

export function hasPermission(userjs: JsonObject, perm: string) : boolean
{
    if (userjs == null) {
        return false;
    }
    if (! perm) {
        return true;
    }
    if (td.stringContains(perm, ",")) {
        for (let oneperm of perm.split(",")) {
            if (oneperm != "") {
                if ( ! hasPermission(userjs, oneperm)) {
                    return false;
                }
            }
        }
        return true;
    }
    let lev = orEmpty(userjs["permissions"]);
    for (let s of lev.split(",")) {
        if (s != "") {
            if (false) {
                logger.debug("check " + s + " for " + perm + " against " + JSON.stringify(settingsPermissions, null, 2));
            }
            if (s == perm || s == "admin") {
                return true;
            }
            let js = settingsPermissions[s];
            if (js != null && js.hasOwnProperty(perm)) {
                return true;
            }
        }
    }
    return false;
}

export function setHtmlHeaders(res: restify.Response) : void
{
    res.setHeader("Cache-Control", "no-cache, no-store");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-XSS-Protection", "1");
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    res.setHeader("X-Content-Type-Options", "nosniff");
}

export function twoDigits(p: number) : string
{
    let r: string;
    let s = "0" + p;
    return s.substr(s.length - 2, 2);
    return r;
}

export function encrypt(val: string, keyid: string) : string
{
    let s2: string;
    if (! val) {
        return val;
    }
    keyid = keyid + "0";
    let key2 = prepEncryptionKey(keyid);
    if (key2 == null) {
        keyid = keyid + myChannel;
        key2 = prepEncryptionKey(keyid);
        if (key2 == null) {
            return val;
        }
    }
    let iv = crypto.randomBytes(16);
    let ivCipher = crypto.createCipheriv("aes256", key2, iv);
    let enciphered = ivCipher.update(new Buffer(val, "utf8"));
    let cipherFinal = ivCipher.final();
    let s = Buffer.concat([enciphered, cipherFinal]).toString("base64");
    return "EnC$" + keyid + "$" + iv.toString("base64") + "$" + s;
    return s2;
}

export function prepEncryptionKey(keyid: string) : Buffer
{
    let key = orEmpty(td.serverSetting("ENCKEY_" + keyid, true));
    if (key == "") {
        return null;
    }
    let hash = crypto.createHash("sha256");
    hash.update(key);
    return hash.digest();
}

export function decrypt(val: string) : string
{
    if (! val) {
        return "";
    }
    let coll = val.split("$");
    if (coll.length == 4 && coll[0] == "EnC") {
        let key2 = prepEncryptionKey(coll[1]);
        if (key2 == null) {
            return val;
        }
        let iv = new Buffer(coll[2], "base64");
        let ivDecipher = crypto.createDecipheriv("aes256", key2, iv);
        let deciphered = ivDecipher.update(new Buffer(coll[3], "base64"));
        let decipherFinal = ivDecipher.final();
        let buf = Buffer.concat([deciphered, decipherFinal]);
        return buf.toString("utf8")
    }
    else {
        return val;
    }
}

export function checkMgmtPermission(req: ApiRequest, addPerm: string) : void
{
    if (req.status == 200) {
        let perm = getPermissionLevel(req.rootPub) + "," + addPerm;
        checkPermission(req, perm);
    }
}

export function encryptId(val: string, keyid: string) : string
{
    let key2 = prepEncryptionKey(keyid);
    if (key2 == null || ! val) {
        return val;
    }
    let cipher = crypto.createCipher("aes256", key2);
    let enciphered = cipher.update(new Buffer(val, "utf8"));
    let cipherFinal = cipher.final();
    let s = Buffer.concat([enciphered, cipherFinal]).toString("hex");
    return keyid + "-" + s;
}

export async function resolveOnePubAsync(store: indexedStore.Store, obj: JsonObject, apiRequest: ApiRequest) : Promise<JsonObject>
{
    let js: JsonObject;
    let fetchResult = store.singleFetchResult(obj);
    await resolveAsync(store, fetchResult, apiRequest);
    js = fetchResult.items[0];
    return js;
}

export function setBuilderIfMissing(entry: JsonBuilder, key: string) : JsonBuilder
{
    let dictionary: JsonBuilder;
    let dict = entry[key];
    if (dict == null) {
        dict = {};
        entry[key] = dict;
    }
    return dict;
    return dictionary;
}

export function callerIsFacilitatorOf(req: ApiRequest, subjectJson: JsonObject) : boolean
{
    let isFacilitator: boolean;
    if (req === adminRequest) {
        return true;
    }
    if (req.userid == "" || subjectJson == null) {
        return false;
    }
    let callerJson = req.userinfo.json;
    if (hasPermission(callerJson, "any-facilitator")) {
        return true;
    }
    if ( ! hasPermission(callerJson, "adult") || hasPermission(subjectJson, "adult")) {
        return false;
    }
    let owngrps = callerJson["owngroups"];
    for (let grpid of Object.keys(subjectJson["groups"])) {
        if (owngrps.hasOwnProperty(grpid)) {
            return true;
        }
    }
    return false;
    return isFacilitator;
}

export function callerSharesGroupWith(req: ApiRequest, subjectJson: JsonObject) : boolean
{
    let isFacilitator: boolean;
    if (req === adminRequest) {
        return true;
    }
    if (req.userid == "" || subjectJson == null) {
        return false;
    }
    let callerJson = req.userinfo.json;
    if (hasPermission(callerJson, "any-facilitator")) {
        return true;
    }
    let callerGrps = callerJson["groups"];
    for (let grpid of Object.keys(subjectJson["groups"])) {
        if (callerGrps.hasOwnProperty(grpid)) {
            return true;
        }
    }
    return false;
    return isFacilitator;
}

export function unsafeToJson(jsb: JsonBuilder) : JsonObject
{
    return jsb;
}

export function isAbuseSafe(elt: JsonObject) : boolean
{
    let b2: boolean;
    let b = orEmpty(elt["abuseStatus"]) != "active";
    return b;
    return b2;
}

export function callerHasPermission(req: ApiRequest, perm: string) : boolean
{
    let hasPerm: boolean;
    if (req === adminRequest) {
        return true;
    }
    if (req.userid == "") {
        return false;
    }
    return hasPermission(req.userinfo.json, perm);
    return hasPerm;
}

export function encryptJson(js: JsonObject, keyid: string) : JsonObject
{
    let js2: JsonObject;
    if (js != null) {
        js = encrypt(JSON.stringify(js), keyid);
    }
    return js;
    return js2;
}


export function getPermissionLevel(userjs: JsonObject) : string
{
    let lastperm2: string;
    let lastperm = "level0";
    for (let i = 0; i < 7; i++) {
        if (hasPermission(userjs, "level" + i)) {
            lastperm = "level" + i;
        }
        else {
            break;
        }
    }
    return lastperm;
    return lastperm2;
}

export async function handledByCacheAsync(apiRequest: ApiRequest) : Promise<boolean>
{
    let handled: boolean;
    let entry = await cachedApiContainer.getAsync(apiRequest.origUrl);
    if (entry == null) {
        return false;
    }
    let keyname = orEmpty(entry["cachekey"]);
    if (keyname == "") {
        return false;
    }
    let key = await cachedApiContainer.getAsync("@" + keyname);
    if (key == null || key["value"] != entry["cachekeyvalue"]) {
        return false;
    }
    apiRequest.response = entry["response"];
    apiRequest.status = entry["status"];
    return true;
    return handled;
}

/**
 * {action:ignoreReturn}
 */
export async function flushApiCacheAsync(s: string) : Promise<string>
{
    let val: string;
    let jsb2 = {};
    let value = azureTable.createRandomId(10);
    jsb2["value"] = value;
    await cachedApiContainer.justInsertAsync("@" + s, jsb2);
    return value;
    return val;
}

/**
 * This lock is for API calls that are cached. It's only for performance. When there are many calls to /X happening at the same time, and /X is flushed out of cache, normally multiple workers would start to re-compute /X, and then they would all save the cache (possibly fighting over it). With this lock, only one of them will, and the others will wait (or retry).
 */
export async function acquireCacheLockAsync(path: string) : Promise<string>
{
    let b2: string;
    let timeout = 10;
    let item = "lock:" + path
    let args = [item, "self", "EX", timeout.toString(), "NX"]
    let s = td.toString(await redisClient.sendCommandAsync("set", args));
    if (orEmpty(s) == "OK") {
        logger.debug("got cache lock: " + item);
        return item;
    }
    logger.debug("failed cache lock: " + item);
    for (let i = 0; i < timeout * 2; i++) {
        await td.sleepAsync(0.5);
        if (await redisClient.getAsync(item) == null) {
            break;
        }
    }
    logger.debug("failed cache lock, wait finished: " + item);
    return "";
    return b2;
}

export async function releaseCacheLockAsync(lock: string) : Promise<void>
{
    await redisClient.delAsync(lock);
}

export function jsonArrayIndexOf(js: JsonObject[], id: string) : number
{
    if (!Array.isArray(js)) {
        return -1;
    }
    let x = 0;
    for (let js2 of asArray(js)) {
        if (td.toString(js2) == id) {
            return x;
        }
        x = x + 1;
    }
    return -1;
}

export async function failureReportLoopAsync() : Promise<void>
{
    let container = await blobService.createContainerIfNotExistsAsync("blobwritetest", "private");
    let table = await tableClient.createTableIfNotExistsAsync("tablewritetest");
    lastSearchReport = new Date();
    while (true) {
        await td.sleepAsync(300 + td.randomRange(0, 100));
        /* async */ checkSearchAsync();
        await td.sleepAsync(30);
        /* async */ doFailureChecksAsync(container, table);
    }
}

export async function checkSearchAsync() : Promise<void>
{
    let res = await tdliteIndex.statisticsAsync();
    lastSearchReport = new Date();
}

export async function doFailureChecksAsync(container: azureBlobStorage.Container, table: azureTable.Table) : Promise<void>
{
    if (Date.now() - lastSearchReport.getTime() > 100000) {
        logger.tick("Failure@search");
    }
    if (await redisClient.isStatusLateAsync()) {
        logger.tick("Failure@redis");
    }
    let result2 = await container.createBlockBlobFromTextAsync(td.randomInt(1000) + "", "foobar", {
        justTry: true
    });
    if ( ! result2.succeded()) {
        logger.tick("Failure@blob");
    }
    let entity = azureTable.createEntity(td.randomInt(1000) + "", "foo");
    let ok = await table.tryInsertEntityExtAsync(td.clone(entity), "or replace");
    if ( ! ok) {
        logger.tick("Failure@table");
    }
}

export function resolveAsync(store: indexedStore.Store, entities: indexedStore.FetchResult, req: ApiRequest) {
    return (<DecoratedStore><any>store).myResolve(entities, req);
}

export async function initAsync()
{
    tokenSecret = td.serverSetting("TOKEN_SECRET", false);
    throttleDisabled = orEmpty(td.serverSetting("DISABLE_THROTTLE", true)) == "true";
    myChannel = withDefault(td.serverSetting("TD_BLOB_DEPLOY_CHANNEL", true), "local");
    fullTD = false;
    hasHttps = td.startsWith(td.serverSetting("SELF", false), "https:");

    let creds = orEmpty(td.serverSetting("BASIC_CREDS", true));
    if (creds != "") {
        basicCreds = "Basic " + new Buffer(creds, "utf8").toString("base64");
    }
}

export async function lateInitAsync()
{
    tableClient = azureTable.createClient({
        timeout: 10000,
        retries: 10
    });
    azureBlobStorage.init();
    blobService = azureBlobStorage.createBlobService();
    redisClient = await redis.createClientAsync("", 0, "");

    currClientConfig = new ClientConfig();
    currClientConfig.searchApiKey = td.serverSetting("AZURE_SEARCH_CLIENT_KEY", false);
    currClientConfig.searchUrl = "https://" + td.serverSetting("AZURE_SEARCH_SERVICE_NAME", false) + ".search.windows.net";
    currClientConfig.rootUrl = td.serverSetting("SELF", false).replace(/\/$/g, "");
    currClientConfig.apiUrl = currClientConfig.rootUrl + "/api";
    // this is no longer set from here - it's blobcontainer in installedheaders response
    // currClientConfig.workspaceUrl = (await workspaceContainer[0].blobContainerAsync()).url() + "/";
    currClientConfig.liteVersion = releaseVersionPrefix + ".r" + rewriteVersion;
    currClientConfig.shareUrl = currClientConfig.rootUrl;
    currClientConfig.cdnUrl = (await pubsContainer.blobContainerAsync()).url().replace(/\/pubs$/g, "");
    currClientConfig.primaryCdnUrl = withDefault(td.serverSetting("CDN_URL", true), currClientConfig.cdnUrl);
    currClientConfig.altCdnUrls = (<string[]>[]);
    currClientConfig.altCdnUrls.push((await pubsContainer.blobContainerAsync()).url().replace(/\/pubs$/g, ""));
    currClientConfig.altCdnUrls.push(currClientConfig.primaryCdnUrl);
    currClientConfig.anonToken = basicCreds;
    addRoute("GET", "clientconfig", "", async (req: ApiRequest) => {
        req.response = currClientConfig.toJson();
    });

}

export async function initFinalAsync()
{
    if (hasSetting("LIBRATO_TOKEN")) {
        /* async */ failureReportLoopAsync();
    }
    emptyRequest = buildApiRequest("/api");
    adminRequest = buildApiRequest("/api");
    adminRequest.userinfo.json = ({ "groups": {} });

    self = td.serverSetting("SELF", false).toLowerCase();
    myHost = (/^https?:\/\/([^\/]+)/.exec(self) || [])[1].toLowerCase();
    nonSelfRedirect = orEmpty(td.serverSetting("NON_SELF_REDIRECT", true));
}

export function removeDerivedProperties(body: JsonObject) : JsonObject
{
    let body2: JsonObject;
    let jsb2 = td.clone(body);
    for (let fld of ["username", "url"]) {
        jsb2[fld] = "";
    }
    for (let fld2 of ["userscore", "positivereviews", "comments", "subscribers"]) {
        jsb2[fld2] = 0;
    }
    body = td.clone(jsb2);
    body2 = body;
    return body2;
}

export async function addUsernameEtcCoreAsync(entities: JsonObject[]) : Promise<JsonBuilder[]>
{
    let coll2: JsonBuilder[];
    let users = await followPubIdsAsync(entities, "userid", "");
    coll2 = (<JsonBuilder[]>[]);
    for (let i = 0; i < entities.length; i++) {
        let userJs:any = users[i];
        let root = td.clone(entities[i]);
        coll2.push(root);
        if (userJs != null) {
            root["*userid"] = userJs;
        } else {
            userJs = {};
        }
        let pub = root["pub"];
        pub["id"] = root["id"];
        pub["kind"] = root["kind"];
        pub["userhaspicture"] = userJs.haspicture;
        pub["username"] = userJs.name;
        pub["userscore"] = userJs.score;
        if ( ! fullTD) {
            pub["userplatform"] = [];
        }
    }
    return coll2;
}

export async function addUsernameEtcAsync(entities: indexedStore.FetchResult) : Promise<void>
{
    let coll = await addUsernameEtcCoreAsync(entities.items);
    entities.items = td.arrayToJson(coll);
}

export async function specTableClientAsync(pref: string) : Promise<azureTable.Client>
{
    let tableClient: azureTable.Client;
    tableClient = azureTable.createClient({
        timeout: 10000,
        retries: 10,
        storageAccount: td.serverSetting(pref + "_ACCOUNT", false),
        storageAccessKey: td.serverSetting(pref + "_KEY", false)
    });
    return tableClient;
}

export function isAlarming(perm: string) : boolean
{
    let jsb = {};
    jsb["permissions"] = "non-alarming";
    return ! hasPermission(jsb, perm);
}

export async function refreshSettingsAsync() : Promise<void>
{
    let now = new Date().getTime();
    if (now - lastSettingsCheck > 5000) {
        while (lastSettingsCheck < 0) {
            await td.sleepAsync(0.1);
        }
        now = new Date().getTime();
        if (now - lastSettingsCheck > 5000) {
            lastSettingsCheck = -1;
            let entry2 = await settingsContainer.getAsync("settings");
            if (entry2 == null) {
                entry2 = ({ "permissions": {} });
            }
            let permMap = td.clone(entry2["permissions"]);
            let numAdded = 1;
            while (numAdded > 0) {
                numAdded = 0;
                for (let perm of Object.keys(permMap)) {
                    let currperm = permMap[perm];
                    for (let perm2 of Object.keys(permMap[perm])) {
                        let otherperm = permMap[perm2];
                        if (otherperm != null) {
                            for (let perm3 of Object.keys(otherperm)) {
                                if ( ! currperm.hasOwnProperty(perm3)) {
                                    currperm[perm3] = 1;
                                    numAdded = numAdded + 1;
                                }
                            }
                        }
                    }
                }
            }
            let jsb = {
              "paths": {},
              "blockedNicknameRx": "official|touchdevelop",
              "accounts": {},
              "termsversion": "v1",
              "emailFrom": "noreply@touchdevelop.com",
              "tokenExpiration": 0,
              "defaultLang": "en",
              "langs": {},
              "envrewrite": {},
              "alarmingEmails": []
            };
            td.jsonCopyFrom(jsb, entry2);
            serviceSettings = ServiceSettings.createFromJson(td.clone(jsb));
            lastSettingsCheck = now;
            settingsPermissions = td.clone(permMap);

        }
    }
}

export async function deleteAsync(delEntry: JsonObject) : Promise<boolean>
{
    let delok: boolean;
    if (delEntry == null || delEntry["kind"] == "reserved") {
        delok = false;
    }
    else {
        let store = indexedStore.storeByKind(delEntry["kind"]);
        if (store == null) {
            store = somePubStore;
        }
        delok = await store.deleteAsync(delEntry["id"]);
    }
    return delok;
}

export async function setReqUserIdAsync(req: ApiRequest, uid: string) : Promise<void>
{
    let userjs = await getPubAsync(uid, "user");
    if (userjs == null) {
        req.status = httpCode._401Unauthorized;
        logger.info("accessing token for deleted user, " + uid);
    }
    else {
        req.userid = uid;
        req.userinfo.id = uid;
        req.userinfo.json = userjs;
        logger.setContextUser(uid);
    }
}

export interface IPubKind
{
    kind?: string;
    store: indexedStore.Store;
    deleteWithAuthor: boolean;
    importOne?: (req:ApiRequest, js:JsonObject) => Promise<void>;
    specialDeleteAsync?: (entryid:string, delentry:JsonBuilder) => Promise<void>;
}

var pubKinds:IPubKind[] = [];
export function getPubKind(kind:string)
{
    if (!kind) return null
    return pubKinds.filter(k => k.kind == kind)[0] || null
}

export function getPubKinds()
{
    return pubKinds.slice(0);
}

export function registerPubKind(desc:IPubKind)
{
    desc.kind = desc.store.kind;
    assert(!getPubKind(desc.kind))
    pubKinds.push(desc)
    if (!somePubStore)
        somePubStore = desc.store;
}

export async function getCloudRelidAsync(includeVer: boolean) : Promise<string>
{
    let ver: string;
    let entry = await settingsContainer.getAsync("releases");
    let js = entry["ids"]["cloud"];
    ver = js["relid"];
    if (includeVer) {
        ver = ver + "." + rewriteVersion + "." + js["numpokes"];
    }
    return ver;
}


