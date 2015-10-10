/// <reference path='../typings/node/node.d.ts' />

'use strict';

import * as td from './td';
import * as assert from 'assert';
import * as crypto from 'crypto';
import * as querystring from 'querystring';
import * as child_process from 'child_process';
import * as fs from 'fs';

type JsonObject = td.JsonObject;
type JsonBuilder = td.JsonBuilder;

var asArray = td.asArray;
var json = td.json;
var clone = td.clone;

import * as azureTable from "./azure-table"
import * as azureBlobStorage from "./azure-blob-storage"
import * as parallel from "./parallel"
import * as cachedStore from "./cached-store"
import * as redis from "./redis"
import * as indexedStore from "./indexed-store"
import * as restify from "./restify"
import * as raygun from "./raygun"
import * as loggly from "./loggly"
import * as libratoNode from "./librato-node"
import * as tdliteIndex from "./tdlite-index"
import * as mbedworkshopCompiler from "./mbedworkshop-compiler"
import * as microsoftTranslator from "./microsoft-translator"
import * as tdliteData from "./tdlite-data"

import * as core from "./tdlite-core"
import * as audit from "./tdlite-audit"
import * as search from "./tdlite-search"
import * as notifications from "./tdlite-notifications"
import * as tdliteScripts from "./tdlite-scripts"
import * as tdliteWorkspace from "./tdlite-workspace"
import * as tdliteArt from "./tdlite-art"
import * as tdliteVimeo from "./tdlite-vimeo"
import * as tdliteUsers from "./tdlite-users"
import * as tdliteGroups from "./tdlite-groups"
import * as tdliteComments from "./tdlite-comments"
import * as tdliteReviews from "./tdlite-reviews"
import * as tdliteTags from "./tdlite-tags"
import * as tdliteReleases from "./tdlite-releases"
import * as tdliteTdCompiler from "./tdlite-tdcompiler"
import * as tdlitePointers from "./tdlite-pointers"
import * as tdliteLogin from "./tdlite-login"
import * as tdliteImport from "./tdlite-import"

var orZero = core.orZero;
var orFalse = core.orFalse;
var withDefault = core.withDefault;
var orEmpty = td.orEmpty;


var reinit = false;

var logger = core.logger;
var httpCode = restify.http();

var abuseReports: indexedStore.Store;
var compileContainer: azureBlobStorage.Container;
var mbedVersion: number = 0;
var crashContainer: azureBlobStorage.Container;
var channels: indexedStore.Store;
var channelMemberships: indexedStore.Store;
var deploymentMeta: JsonObject;
var tdDeployments: azureBlobStorage.Container;
var mbedCache: boolean = false;
var faviconIco: Buffer;
var embedThumbnails: cachedStore.Container;
var promosTable: azureTable.Table;

export class PubAbusereport
    extends td.JsonRecord
{
    @json public kind: string = "";
    @json public time: number = 0;
    @json public id: string = "";
    @json public text: string = "";
    @json public userid: string = "";
    @json public username: string = "";
    @json public userscore: number = 0;
    @json public userhaspicture: boolean = false;
    @json public userplatform: string[];
    @json public publicationid: string = "";
    @json public publicationname: string = "";
    @json public publicationkind: string = "";
    @json public publicationuserid: string = "";
    @json public resolution: string = "";
    static createFromJson(o:JsonObject) { let r = new PubAbusereport(); r.fromJson(o); return r; }
}

export interface IPubAbusereport {
    kind: string;
    time: number;
    id: string;
    text: string;
    userid: string;
    username: string;
    userscore: number;
    userhaspicture: boolean;
    userplatform: string[];
    publicationid: string;
    publicationname: string;
    publicationkind: string;
    publicationuserid: string;
    resolution: string;
}

export class CompileReq
    extends td.JsonRecord
{
    @json public config: string = "";
    @json public source: string = "";
    @json public meta: JsonObject;
    @json public repohash: string = "";
    static createFromJson(o:JsonObject) { let r = new CompileReq(); r.fromJson(o); return r; }
}

export interface ICompileReq {
    config: string;
    source: string;
    meta: JsonObject;
    repohash: string;
}

export class CompileResp
    extends td.JsonRecord
{
    @json public statusurl: string = "";
    static createFromJson(o:JsonObject) { let r = new CompileResp(); r.fromJson(o); return r; }
}

export interface ICompileResp {
    statusurl: string;
}

export class CompileStatus
    extends td.JsonRecord
{
    @json public success: boolean = false;
    @json public hexurl: string = "";
    @json public mbedresponse: JsonBuilder;
    @json public messages: JsonObject[];
    static createFromJson(o:JsonObject) { let r = new CompileStatus(); r.fromJson(o); return r; }
}

export interface ICompileStatus {
    success: boolean;
    hexurl: string;
    mbedresponse: JsonBuilder;
    messages: JsonObject[];
}

export class CandeleteResponse
    extends td.JsonRecord
{
    @json public publicationkind: string = "";
    @json public publicationname: string = "";
    @json public publicationuserid: string = "";
    @json public candeletekind: boolean = false;
    @json public candelete: boolean = false;
    @json public hasabusereports: boolean = false;
    @json public canmanage: boolean = false;
    static createFromJson(o:JsonObject) { let r = new CandeleteResponse(); r.fromJson(o); return r; }
}

export interface ICandeleteResponse {
    publicationkind: string;
    publicationname: string;
    publicationuserid: string;
    candeletekind: boolean;
    candelete: boolean;
    hasabusereports: boolean;
    canmanage: boolean;
}

export class BugReport
    extends td.JsonRecord
{
    @json public exceptionConstructor: string = "";
    @json public exceptionMessage: string = "";
    @json public context: string = "";
    @json public currentUrl: string = "";
    @json public worldId: string = "";
    @json public kind: string = "";
    @json public scriptId: string = "";
    @json public stackTrace: string = "";
    @json public sourceURL: string = "";
    @json public line: number = 0;
    @json public eventTrace: string = "";
    @json public userAgent: string = "";
    @json public resolution: string = "";
    @json public jsUrl: string = "";
    @json public timestamp: number = 0;
    @json public platform: string[];
    @json public attachments: string[];
    @json public tdVersion: string = "";
    @json public logMessages: JsonObject;
    @json public reportId: string = "";
    static createFromJson(o:JsonObject) { let r = new BugReport(); r.fromJson(o); return r; }
}

export interface IBugReport {
    exceptionConstructor: string;
    exceptionMessage: string;
    context: string;
    currentUrl: string;
    worldId: string;
    kind: string;
    scriptId: string;
    stackTrace: string;
    sourceURL: string;
    line: number;
    eventTrace: string;
    userAgent: string;
    resolution: string;
    jsUrl: string;
    timestamp: number;
    platform: string[];
    attachments: string[];
    tdVersion: string;
    logMessages: JsonObject;
    reportId: string;
}

export class PubChannel
    extends td.JsonRecord
{
    @json public kind: string = "";
    @json public time: number = 0;
    @json public id: string = "";
    @json public name: string = "";
    @json public pictureid: string = "";
    @json public description: string = "";
    @json public userid: string = "";
    @json public username: string = "";
    @json public userscore: number = 0;
    @json public userhaspicture: boolean = false;
    @json public userplatform: string[];
    @json public positivereviews: number = 0;
    @json public subscribers: number = 0;
    @json public comments: number = 0;
    static createFromJson(o:JsonObject) { let r = new PubChannel(); r.fromJson(o); return r; }
}

export interface IPubChannel {
    kind: string;
    time: number;
    id: string;
    name: string;
    pictureid: string;
    description: string;
    userid: string;
    username: string;
    userscore: number;
    userhaspicture: boolean;
    userplatform: string[];
    positivereviews: number;
    subscribers: number;
    comments: number;
}

export class CompilerConfig
    extends td.JsonRecord
{
    @json public repourl: string = "";
    @json public platform: string = "";
    @json public hexfilename: string = "";
    @json public hexcontenttype: string = "";
    @json public target_binary: string = "";
    @json public internalUrl: string = "";
    static createFromJson(o:JsonObject) { let r = new CompilerConfig(); r.fromJson(o); return r; }
}

export interface ICompilerConfig {
    repourl: string;
    platform: string;
    hexfilename: string;
    hexcontenttype: string;
    target_binary: string;
    internalUrl: string;
}


async function _initAsync() : Promise<void>
{
    await core.initAsync();

    if (core.myChannel == "live" || core.myChannel == "stage") {
        // never re-init on production instances
        reinit = false;
    }

    if (core.hasSetting("LOGGLY_TOKEN")) {
        await loggly.initAsync({
            globalTags: td.serverSetting("LOG_TAG", false)
        });
    }
    if (core.hasSetting("RAYGUN_API_KEY")) {
        await raygun.initAsync({
            private: ! core.fullTD,
            saveReport: async (json: JsonObject) => {
                let blobName = orEmpty(json["reportId"]);
                if (blobName != "") {
                    let encReport = core.encrypt(JSON.stringify(json), "BUG");
                    let result4 = await crashContainer.createBlockBlobFromTextAsync(blobName, encReport);
                }
            }

        });
    }
    if (core.hasSetting("LIBRATO_TOKEN")) {
        let libSource = withDefault(td.serverSetting("RoleInstanceId", true), "local");
        await libratoNode.initAsync({
            period: 60000,
            aggregate: true
        });
        /* async */ core.statusReportLoopAsync();
    }

    mbedVersion = 2;
    mbedCache = true;

    await core.lateInitAsync();

    if (reinit) {
        let success = await core.blobService.setCorsPropertiesAsync("*", "GET,HEAD,OPTIONS", "*", "ErrorMessage,x-ms-request-id,Server,x-ms-version,Content-Type,Cache-Control,Last-Modified,ETag,Content-MD5,x-ms-lease-status,x-ms-blob-type", 3600);
    }
    else {
        azureTable.assumeTablesExists();
        azureBlobStorage.assumeContainerExists();
    }
    mbedworkshopCompiler.init();
    mbedworkshopCompiler.setVerbosity("debug");

    await tdliteIndex.initAsync();
    if (core.hasSetting("MICROSOFT_TRANSLATOR_CLIENT_SECRET")) {
        await microsoftTranslator.initAsync("", "");
    }
    let timeDelta = await core.redisClient.cachedTimeAsync() - new Date().getTime();
    logger.info("time difference to redis instance: " + timeDelta + "ms");
    if (false) {
        logger.info(JSON.stringify(await core.redisClient.sendCommandAsync("info", [])));
    }

    await cachedStore.initAsync();
    indexedStore.init(core.tableClient);
    // cachedStore.getLogger().setVerbosity("info");

    core.validateTokenAsync = validateTokenAsync;
    core.executeSearchAsync = search.executeSearchAsync;

    await _init_0Async();

    await core.initFinalAsync();

    let server = restify.server();
    server.use(restify.bodyParser());
    server.use(restify.queryParser());
    server.use(restify.gzipResponse());
    let cors = restify.CORS({
        credentials: true,
        headers: "ErrorMessage"
    });
    server.use(cors);
    restify.disableTicks();
    restify.setupShellHooks();
    await restify.startAsync();

    server.get("/api/ping", async (req: restify.Request, res: restify.Response) => {
        core.handleHttps(req, res);
        if ( ! res.finished()) {
            res.send(orEmpty(req.query()["value"]));
        }
    });
    await tdliteLogin.initAsync();

    // ## batch api here
    server.post("/api", async (req2: restify.Request, res2: restify.Response) => {
        await core.performRoutingAsync(req2, res2);
    });
    server.routeRegex("OPTS", ".*", async (req3: restify.Request, res3: restify.Response) => {
        res3.setHeader("Access-Control-Allow-Headers", "Accept, Accept-Version, Content-Type, Origin, X-TD-Access-Token, X-TD-World-ID, X-TD-Release-ID, X-TD-User-Platform, Authorization");
        res3.setHeader("Access-Control-Allow-Credentials", "true");
        res3.setHeader("Access-Control-Max-Age", "3600");
        res3.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, HEAD, OPTIONS");
        res3.sendStatus(200);
    });
    server.all(async (req4: restify.Request, res4: restify.Response) => {
        if (td.startsWith(req4.url(), "/api/")) {
            await core.performRoutingAsync(req4, res4);
        }
        else {
            core.handleBasicAuth(req4, res4);
            if ( ! res4.finished() && req4.method() != "GET") {
                res4.sendError(httpCode._405MethodNotAllowed, "");
            }
            if ( ! res4.finished()) {
                if (td.startsWith(req4.url(), "/app/")) {
                    await tdliteReleases.serveReleaseAsync(req4, res4);
                }
                else if (td.startsWith(req4.url(), "/favicon.ico")) {
                    if (faviconIco == null) {
                        let res = await tdliteReleases.filesContainer.getBlobToBufferAsync("favicon.ico");
                        faviconIco = res.buffer();
                    }
                    res4.sendBuffer(faviconIco, "image/x-icon");
                }
                else if (td.startsWith(req4.url(), "/verify/")) {
                    await tdliteUsers.handleEmailVerificationAsync(req4, res4);
                }
                else {
                    await tdlitePointers.servePointerAsync(req4, res4);
                }
            }
        }
    });
    logger.debug("librato email: " + td.serverSetting("LIBRATO_EMAIL", false));
}


async function _init_0Async() : Promise<void>
{
    core.pubsContainer = await cachedStore.createContainerAsync("pubs");
    core.settingsContainer = await cachedStore.createContainerAsync("settings", {
        inMemoryCacheSeconds: 5
    });
    tdDeployments = await core.blobService.createContainerIfNotExistsAsync("tddeployments", "private");
    compileContainer = await core.blobService.createContainerIfNotExistsAsync("compile", "hidden");
    crashContainer = await core.blobService.createContainerIfNotExistsAsync("crashes2", "private");
    core.cachedApiContainer = await cachedStore.createContainerAsync("cachedapi", {
        inMemoryCacheSeconds: 5,
        redisCacheSeconds: 600,
        noBlobStorage: true
    });
    await audit.initAsync();
    // ## General
    core.addRoute("POST", "", "", async (req: core.ApiRequest) => {
        await core.performBatchAsync(req);
    }
    , {
        noSizeCheck: true
    });
    _initTicks();
    _initBugs();
    // # Init different publication kinds
    _initAdmin();
    await tdliteScripts.initAsync();
    await tdliteTdCompiler.initAsync();
    await _initPromoAsync();
    await tdliteComments.initAsync()
    await tdliteGroups.initAsync();
    await tdliteTags.initAsync();
    await tdliteArt.initAsync();
    await tdliteReviews.initAsync();
    await tdliteUsers.initAsync();
    await notifications.initAsync();
    await tdliteReleases.initAsync();
    await _initAbusereportsAsync();
    await _initChannelsAsync();
    await tdlitePointers.initAsync();
    _initConfig();
    await _initEmbedThumbnailsAsync();
    await tdliteVimeo.initAsync();
    _initProgress();
    _initRuntime();
    // ## and other stuff
    await search.initAsync();
    await tdliteImport.initAsync();
    await tdliteWorkspace.initAsync();
}



async function validateTokenAsync(req: core.ApiRequest, rreq: restify.Request) : Promise<void>
{
    await core.refreshSettingsAsync();
    if (req.isCached) {
        return;
    }
    let token = withDefault(rreq.header("x-td-access-token"), td.toString(req.queryOptions["access_token"]));
    if (token != null && token != "null" && token != "undefined") {
        let tokenJs = (<JsonObject>null);
        if (td.startsWith(token, "0") && token.length < 100) {
            let value = await core.redisClient.getAsync("tok:" + token);
            if (value == null || value == "") {
                let coll = (/^0([a-z]+)\.([A-Za-z]+)$/.exec(token) || []);
                if (coll.length > 1) {
                    tokenJs = await tdliteUsers.tokensTable.getEntityAsync(coll[1], coll[2]);
                    if (tokenJs != null) {
                        await core.redisClient.setpxAsync("tok:" + token, JSON.stringify(tokenJs), 1000 * 1000);
                    }
                }
            }
            else {
                tokenJs = JSON.parse(value);
            }
        }
        if (tokenJs == null) {
            req.status = httpCode._401Unauthorized;
        }
        else {
            let token2 = core.Token.createFromJson(tokenJs);
            if (orZero(token2.version) < 2) {
                req.status = httpCode._401Unauthorized;
                return;
            }
            if (orEmpty(token2.cookie) != "") {
                let ok = td.stringContains(orEmpty(rreq.header("cookie")), "TD_ACCESS_TOKEN2=" + token2.cookie);
                if ( ! ok) {
                    req.status = httpCode._401Unauthorized;
                    logger.info("cookie missing, user=" + token2.PartitionKey);
                    return;
                }
                let r = orEmpty(rreq.header("referer"));
                if (td.startsWith(r, "http://localhost:") || td.startsWith(r, core.self + "app/")) {
                }
                else {
                    req.status = httpCode._401Unauthorized;
                    logger.info("bad referer: " + r + ", user = " + token2.PartitionKey);
                    return;
                }
                // minimum token expiration - 5min
                if (orEmpty(token2.reason) != "code" && orZero(core.serviceSettings.tokenExpiration) > 300 && await core.nowSecondsAsync() - token2.time > core.serviceSettings.tokenExpiration) {
                    // core.Token expired
                    req.status = httpCode._401Unauthorized;
                    return;
                }
            }
            let uid = token2.PartitionKey;
            await core.setReqUserIdAsync(req, uid);
            if (req.status == 200 && orFalse(req.userinfo.json["awaiting"])) {
                req.status = httpCode._418ImATeapot;
            }
            if (req.status == 200) {
                req.userinfo.token = token2;
                req.userinfo.ip = rreq.remoteIp();
                let uid2 = orEmpty(req.queryOptions["userid"]);
                if (uid2 != "" && core.hasPermission(req.userinfo.json, "root")) {
                    await core.setReqUserIdAsync(req, uid2);
                }
            }
        }
    }
}

async function _initAbusereportsAsync() : Promise<void>
{
    abuseReports = await indexedStore.createStoreAsync(core.pubsContainer, "abusereport");
    await core.setResolveAsync(abuseReports, async (fetchResult: indexedStore.FetchResult, apiRequest: core.ApiRequest) => {
        let users = await core.followPubIdsAsync(fetchResult.items, "publicationuserid", "");
        let withUsers = await core.addUsernameEtcCoreAsync(fetchResult.items);
        let coll = (<PubAbusereport[]>[]);
        let x = 0;
        for (let jsb of withUsers) {
            if (jsb["pub"]["userid"] == apiRequest.userid || 
                core.callerIsFacilitatorOf(apiRequest, users[x]) || 
                core.callerIsFacilitatorOf(apiRequest, jsb["*userid"])) {
                let report = PubAbusereport.createFromJson(jsb["pub"]);
                report.text = core.decrypt(report.text);
                coll.push(report);
            }
            x = x + 1;
        }
        fetchResult.items = td.arrayToJson(coll);
    }
    , {
        byUserid: true,
        byPublicationid: true
    });
    await abuseReports.createIndexAsync("publicationuserid", entry => entry["pub"]["publicationuserid"]);
    core.addRoute("GET", "*user", "abuses", async (req: core.ApiRequest) => {
        await core.anyListAsync(abuseReports, req, "publicationuserid", req.rootId);
    });
    core.addRoute("POST", "*abusereport", "", async (req1: core.ApiRequest) => {
        let pub = req1.rootPub["pub"];
        await core.checkFacilitatorPermissionAsync(req1, pub["publicationuserid"]);
        if (req1.status == 200) {
            let res = td.toString(req1.body["resolution"]);
            await core.pubsContainer.updateAsync(req1.rootId, async (entry1: JsonBuilder) => {
                core.setFields(entry1["pub"], req1.body, ["resolution"]);
            });
            await core.pubsContainer.updateAsync(pub["publicationid"], async (entry2: JsonBuilder) => {
                entry2["abuseStatus"] = res;
                delete entry2["abuseStatusPosted"];
            });
            req1.response = ({});
        }
    });
    core.addRoute("POST", "*pub", "abusereports", async (req2: core.ApiRequest) => {
        await core.canPostAsync(req2, "abusereport");
        if (req2.status == 200) {
            await postAbusereportAsync(req2);
        }
    });
    core.addRoute("DELETE", "*pub", "", async (req3: core.ApiRequest) => {
        if (core.canBeAdminDeleted(req3.rootPub)) {
            await core.checkDeletePermissionAsync(req3);
            if (req3.status == 200) {
                await audit.logAsync(req3, "delete", {
                    oldvalue: await audit.auditDeleteValueAsync(req3.rootPub)
                });
                await deletePubRecAsync(req3.rootPub);
                req3.response = ({});
            }
        }
        else {
            req3.status = httpCode._405MethodNotAllowed;
        }
    });
    core.addRoute("GET", "*pub", "candelete", async (req4: core.ApiRequest) => {
        let resp = new CandeleteResponse();
        let pub1 = req4.rootPub["pub"];
        resp.publicationkind = req4.rootPub["kind"];
        resp.publicationname = withDefault(pub1["name"], "/" + req4.rootId);
        resp.publicationuserid = getAuthor(pub1);
        resp.candeletekind = core.canBeAdminDeleted(req4.rootPub) || core.hasSpecialDelete(req4.rootPub);
        let reports = await abuseReports.getIndex("publicationid").fetchAsync(req4.rootId, ({"count":10}));
        resp.hasabusereports = reports.items.length > 0 || reports.continuation != "";
        if (resp.candeletekind) {
            await core.checkDeletePermissionAsync(req4);
            if (req4.status == 200) {
                resp.candelete = true;
                if (resp.publicationuserid == req4.userid) {
                    await core.checkFacilitatorPermissionAsync(req4, resp.publicationuserid);
                    if (req4.status == 200) {
                        resp.canmanage = true;
                    }
                    else {
                        resp.canmanage = false;
                        req4.status = 200;
                    }
                }
                else {
                    resp.canmanage = true;
                }
            }
            else {
                resp.candelete = false;
                req4.status = 200;
            }
        }
        req4.response = resp.toJson();
    });
}



async function deletePubRecAsync(delEntry: JsonObject) : Promise<void>
{
    if (delEntry["kind"] == "review") {
        let delok3 = await tdliteReviews.deleteReviewAsync(delEntry);
    }
    else {
        let delok = await core.deleteAsync(delEntry);
        if (delok) {
            // TODO handle updateId stuff for scripts
            // TODO delete comments on this publication
            // TODO update comment counts
            let kind = delEntry["kind"];
            let entryid = delEntry["id"];
            let desc = core.getPubKind(kind)

            if (desc && desc.specialDeleteAsync)
                await desc.specialDeleteAsync(entryid, delEntry)

            let abuses = await abuseReports.getIndex("publicationid").fetchAllAsync(entryid);
            await parallel.forJsonAsync(abuses, async (json1: JsonObject) => {
                await core.pubsContainer.updateAsync(json1["id"], async (entry2: JsonBuilder) => {
                    entry2["pub"]["resolution"] = "deleted";
                });
            });

        }
    }
}



export async function mbedCompileAsync(req: core.ApiRequest) : Promise<void>
{
    let compileReq = CompileReq.createFromJson(req.body);
    let name = "my script";
    if (compileReq.meta != null) {
        name = withDefault(compileReq.meta["name"], name);
    }
    name = name.replace(/[^a-zA-Z0-9]+/g, "-");
    let cfg = await core.settingsContainer.getAsync("compile");
    let sha = core.sha256(JSON.stringify(compileReq.toJson()) + "/" + mbedVersion + "/" + cfg["__version"]).substr(0, 32);
    let info = await compileContainer.getBlobToTextAsync(sha + ".json");
    let compileResp = new CompileResp();
    compileResp.statusurl = compileContainer.url() + "/" + sha + ".json";
    logger.info("mbed compile: " + compileResp.statusurl);
    let hit = false;
    if (info.succeded()) {
        let js = JSON.parse(info.text());
        if (mbedCache && js["success"]) {
            hit = true;
        }
        else {
            await compileContainer.deleteBlobAsync(sha + ".json");
            logger.tick("MbedCacheHitButRetry");
        }
    }
    if (hit) {
        logger.tick("MbedCacheHit");
        req.response = compileResp.toJson();
    }
    else if (cfg[compileReq.config] == null) {
        req.status = httpCode._412PreconditionFailed;
    }
    else {
        if (compileReq.source.length > 200000) {
            req.status = httpCode._413RequestEntityTooLarge;
        }
        let numrepl = 0;
        let src = td.replaceFn(compileReq.source, /#(\s*include\s+[<"]([a-zA-Z0-9\/\.\-]+)[">]|if\s+|ifdef\s+|else\s+|elif\s+|line\s+)?/g, (elt: string[]) => {
            let result: string;
            let body = orEmpty(elt[1]);
            if (elt.length > 1 && body != "") {
                result = "#" + body;
            }
            else {
                result = "\\x23";
                numrepl += 1;
            }
            return result;
        });
        src = td.replaceAll(src, "%:", "\\x25\\x3A");
        if (numrepl > 0) {
            logger.info("replaced some hashes, " + src.substr(0, 500));
        }
        await core.throttleAsync(req, "compile", 20);
        if (req.status == 200) {
            let isFota = false;
            if (compileReq.config.endsWith("-fota")) {
                isFota = true;
                compileReq.config = compileReq.config.replace(/-fota$/g, "");
            }
            let json0 = cfg[compileReq.config];
            if (json0 == null) {
                req.status = httpCode._404NotFound;
                return;
            }
            let ccfg = CompilerConfig.createFromJson(json0);
            if (isFota) {
                ccfg.target_binary = td.replaceAll(orEmpty(ccfg.target_binary), "-combined", "");
            }
            if (! ccfg.repourl) {
                req.status = httpCode._404NotFound;
                return;
            }
            ccfg.hexfilename = td.replaceAll(ccfg.hexfilename, "SCRIPT", name);
            if (orEmpty(ccfg.internalUrl) != "") {
                if (/^[\w.\-]+$/.test(orEmpty(compileReq.repohash)) && compileReq.repohash.length < 60) {
                    ccfg.repourl = compileReq.repohash;
                }
                if (/^[a-f0-9]+$/.test(ccfg.repourl) && ccfg.repourl.length == 64) {
                    // OK, looks like image ID
                }
                else {
                    let tags = await core.settingsContainer.getAsync("compiletag");
                    if (tags == null) {
                        tags = ({});
                    }
                    let imgcfg = tags[compileReq.config + "-" + ccfg.repourl];
                    if (imgcfg == null) {
                        imgcfg = tags[ccfg.repourl];
                    }
                    if (imgcfg == null) {
                        imgcfg = "";
                    }
                    let imgid = orEmpty(td.toString(imgcfg));
                    if (imgid == "") {
                        logger.info("cannot find repo: " + ccfg.repourl);
                        req.status = httpCode._404NotFound;
                        return;
                    }
                    logger.debug("found image: " + ccfg.repourl + " -> " + imgid);
                    ccfg.repourl = imgid;
                }
                let jsb = {};
                jsb["maincpp"] = src;
                jsb["op"] = "build";
                jsb["image"] = ccfg.repourl;
                /* async */ mbedintDownloadAsync(sha, jsb, ccfg);
                req.response = compileResp.toJson();
            }
            else if (! ccfg.target_binary) {
                req.status = httpCode._404NotFound;
            }
            else {
                if (/^[\w.\-]+$/.test(orEmpty(compileReq.repohash))) {
                    ccfg.repourl = ccfg.repourl.replace(/#.*/g, "#" + compileReq.repohash);
                }
                logger.debug("compile at " + ccfg.repourl);
                let compile = mbedworkshopCompiler.createCompilation(ccfg.platform, ccfg.repourl, ccfg.target_binary);
                compile.replaceFiles["/source/main.cpp"] = src;
                let started = await compile.startAsync();
                if ( ! started) {
                    logger.tick("MbedWsCompileStartFailed");
                    req.status = httpCode._424FailedDependency;
                }
                else {
                    /* async */ mbedwsDownloadAsync(sha, compile, ccfg);
                    req.response = compileResp.toJson();
                }
            }
        }
    }
}






function crashAndBurn() : void
{
    assert(false, "/api/logcrash (OK)");
}

function _initBugs() : void
{
    core.addRoute("GET", "logcrash", "", async (req: core.ApiRequest) => {
        crashAndBurn();
    });
    core.addRoute("GET", "bug", "*", async (req: core.ApiRequest) => {
        core.checkPermission(req, "view-bug");
        if (req.status == 200) {
            let info = await crashContainer.getBlobToTextAsync(req.verb);
            if (info.succeded()) {
                let js3 = JSON.parse(core.decrypt(info.text()));
                req.response = js3;
            }
            else {
                req.status = httpCode._404NotFound;
            }
        }
    });
    core.addRoute("POST", "bug", "", async (req1: core.ApiRequest) => {
        let report = BugReport.createFromJson(req1.body);
        let jsb = ({ "details": { "client": { }, "error": { "stackTrace": [] }, "environment": { }, "request": { "headers": {} }, "user": { }, "context": { } } });
        let timestamp = report.timestamp;
        jsb["occurredOn"] = new Date(timestamp);
        let det = jsb["details"];
        det["machineName"] = orEmpty(report.worldId);
        det["version"] = orEmpty(report.tdVersion);
        det["request"]["headers"]["User-Agent"] = orEmpty(report.userAgent);
        if (core.fullTD) {
            det["user"]["identifier"] = req1.userid;
        }
        det["error"]["message"] = withDefault(report.exceptionConstructor, "Error");
        det["error"]["innerError"] = orEmpty(report.exceptionMessage);
        report.reportId = "BuG" + (20000000000000 - await core.redisClient.cachedTimeAsync()) + azureTable.createRandomId(10);
        let js2 = report.toJson();
        let encReport = core.encrypt(JSON.stringify(js2), "BUG");
        let result4 = await crashContainer.createBlockBlobFromTextAsync(report.reportId, encReport);
        let js = clone(js2);
        delete js["eventTrace"];
        delete js["logMessages"];
        delete js["attachments"];
        det["userCustomData"] = js;
        let trace = det["error"]["stackTrace"];
        let s = td.replaceFn(orEmpty(report.stackTrace), /^[^@\s]*:\d+/g, (elt: string[]) => {
            let result: string;
            result = "   at " + elt[0];
            return result;
        });
        s = td.replaceFn(s, /^([^@\s]*)@(.*)/g, (elt1: string[]) => {
            let result1: string;
            result1 = "   at " + elt1[1] + " (" + elt1[2] + ")";
            return result1;
        });
        s = td.replaceFn(s, / at (\S+?):([\d:]+)$/g, (elt2: string[]) => {
            let result2: string;
            result2 = " at nofn (" + elt2[1] + ":" + elt2[2] + ")";
            return result2;
        });
        s = td.replaceFn(s, / at (\S+)[^(]*(\((\S+?):([\d:]+)\))?/g, (elt3: string[]) => {
            let result3: string;
            let st = {};
            st["methodName"] = elt3[1];
            st["fileName"] = withDefault(elt3[3], "unknown");
            st["lineNumber"] = parseFloat(withDefault(elt3[4], "1").replace(/:.*/g, ""));
            trace.push(clone(st));
            result3 = "";
            return result3;
        });
        if (trace.length == 0) {
            let st1 = {};
            st1["lineNumber"] = orZero(report.line);
            trace.push(clone(st1));
        }
        else {
            for (let jsb2 of trace) {
                let grps = (/^([^\.]+)\.(.*)/.exec(orEmpty(jsb2["methodName"])) || []);
                if (grps.length > 2) {
                    jsb2["className"] = grps[1];
                    jsb2["methodName"] = grps[2];
                }
                else {
                    jsb2["className"] = "X";
                }
            }
        }
        logger.info("stored crash: " + report.reportId);
        if (! report.tdVersion) {
            // Skip reporting of errors from local builds.
        }
        else {
            core.sanitizeJson(jsb);
            let creq = td.createRequest("https://api.raygun.io/entries");
            creq.setHeader("X-ApiKey", td.serverSetting("RAYGUN_API_KEY2", false));
            creq.setMethod("post");
            creq.setContentAsJson(clone(jsb));
            let response = await creq.sendAsync();
            logger.debug("raygun: " + response + "");
        }
        req1.response = ({});
    }
    , {
        noSizeCheck: true
    });
}


async function _initChannelsAsync() : Promise<void>
{
    channels = await indexedStore.createStoreAsync(core.pubsContainer, "channel");
    await core.setResolveAsync(channels, async (fetchResult: indexedStore.FetchResult, apiRequest: core.ApiRequest) => {
        await core.addUsernameEtcAsync(fetchResult);
        let coll = (<PubChannel[]>[]);
        for (let jsb of fetchResult.items) {
            let grp = PubChannel.createFromJson(jsb["pub"]);
            coll.push(grp);
        }
        fetchResult.items = td.arrayToJson(coll);
    }
    , {
        byUserid: true,
        anonSearch: true
    });
    core.addRoute("POST", "channels", "", async (req: core.ApiRequest) => {
        await core.canPostAsync(req, "channel");
        if (req.status == 200) {
            let body = req.body;
            let lst = new PubChannel();
            lst.name = withDefault(body["name"], "unnamed");
            setChannelProps(lst, body);
            lst.userid = req.userid;
            lst.userplatform = core.getUserPlatforms(req);
            let jsb1 = {};
            jsb1["pub"] = lst.toJson();
            await core.generateIdAsync(jsb1, 8);
            await channels.insertAsync(jsb1);
            await notifications.storeAsync(req, jsb1, "");
            await search.scanAndSearchAsync(jsb1);
            await core.returnOnePubAsync(channels, clone(jsb1), req);
        }
    });
    core.addRoute("POST", "*channel", "", async (req1: core.ApiRequest) => {
        checkChannelPermission(req1, req1.rootPub);
        if (req1.status == 200) {
            await search.updateAndUpsertAsync(core.pubsContainer, req1, async (entry: JsonBuilder) => {
                let lst1 = PubChannel.createFromJson(clone(entry["pub"]));
                setChannelProps(lst1, req1.body);
                entry["pub"] = lst1.toJson();
            });
            req1.response = ({});
        }
    });
    channelMemberships = await indexedStore.createStoreAsync(core.pubsContainer, "channelmembership");
    await core.setResolveAsync(channelMemberships, async (fetchResult1: indexedStore.FetchResult, apiRequest1: core.ApiRequest) => {
        let store = tdliteScripts.scripts;
        if (apiRequest1.verb == "channels") {
            store = channels;
            fetchResult1.items = td.arrayToJson(await core.followPubIdsAsync(fetchResult1.items, "channelid", store.kind));
        }
        else {
            let pubs = await core.followIdsAsync(fetchResult1.items, "updateKey", "updateslot");
            fetchResult1.items = td.arrayToJson(await core.followIdsAsync(td.arrayToJson(pubs), "scriptId", "script"));
            let opts = apiRequest1.queryOptions;
            // ?applyupdates=true no longer needed - already applied - perf opt
            delete opts['applyupdates']
        }
        await core.resolveAsync(store, fetchResult1, apiRequest1);        
    });
    await channelMemberships.createIndexAsync("channelid", entry1 => entry1["pub"]["channelid"]);
    await channelMemberships.createIndexAsync("updatekey", entry2 => orEmpty(entry2["updateKey"]));
    await channelMemberships.createIndexAsync("channelsof", entry3 => orEmpty(entry3["channelsof"]));
    core.addRoute("GET", "*script", "channels", async (req2: core.ApiRequest) => {
        let key = req2.rootPub["updateKey"];
        if (req2.argument == "") {
            await core.anyListAsync(channelMemberships, req2, "updatekey", key);
        }
        else {
            let entry21 = await core.getPubAsync(req2.argument, "channel");
            if (entry21 == null) {
                req2.status = 404;
            }
            else {
                let s2 = "gm-" + key + "-" + entry21["id"];
                let entry31 = await core.getPubAsync(s2, "channelmembership");
                if (entry31 == null) {
                    req2.status = 404;
                }
                else {
                    await core.returnOnePubAsync(channelMemberships, entry31, req2);
                }
            }
        }
    });
    core.addRoute("GET", "*script", "channelsof", async (req3: core.ApiRequest) => {
        if (req3.argument == "me") {
            req3.argument = req3.userid;
        }
        let userJs = await core.getPubAsync(req3.argument, "user");
        if (userJs == null) {
            req3.status = 404;
        }
        else {
            let key1 = req3.rootPub["updateKey"];
            await core.anyListAsync(channelMemberships, req3, "channelsof", key1 + ":" + userJs["id"]);
        }
    });
    core.addRoute("POST", "*script", "channels", async (req4: core.ApiRequest) => {
        let tmp = await channelOpAsync(req4);
        let memid = tmp[0];
        let listJs = tmp[1];         
        if (memid != "") {
            let memJson = await core.getPubAsync(memid, "channelmembership");
            if (memJson == null) {
                let jsb2 = ({ "pub": { } });
                jsb2["id"] = memid;
                let key2 = req4.rootPub["updateKey"];
                jsb2["updateKey"] = key2;
                jsb2["scriptid"] = req4.rootPub["id"];
                jsb2["channelsof"] = key2 + ":" + listJs["pub"]["userid"];
                jsb2["pub"]["channelid"] = listJs["id"];
                await channelMemberships.insertAsync(jsb2);
            }
            req4.response = ({});
        }
    });
    core.addRoute("DELETE", "*script", "channels", async (req5: core.ApiRequest) => {
        let tmp = await channelOpAsync(req5);
        let memid1 = tmp[0];
        let listJs1 = tmp[1];         
        if (memid1 != "") {
            let memJson1 = await core.getPubAsync(memid1, "channelmembership");
            if (memJson1 == null) {
                req5.status = 404;
            }
            else {
                let delok = await core.deleteAsync(memJson1);
                req5.response = ({});
            }
        }
    });
    core.addRoute("GET", "*channel", "scripts", async (req6: core.ApiRequest) => {
        await core.anyListAsync(channelMemberships, req6, "channelid", req6.rootId);
    });
}

function setChannelProps(lst: PubChannel, body: JsonObject) : void
{
    let bld = clone(lst.toJson());
    core.setFields(bld, body, ["description", "pictureid"]);
    lst.fromJson(clone(bld));
}

function checkChannelPermission(req: core.ApiRequest, listJs: JsonObject) : void
{
    if (req.userid == listJs["pub"]["userid"]) {
    }
    else {
        core.checkPermission(req, "pub-mgmt");
    }
}


async function channelOpAsync(req: core.ApiRequest) : Promise<[string, JsonObject]>
{
    let memid: string;
    let listJs: JsonObject;
    memid = "";
    listJs = await core.getPubAsync(req.argument, "channel");
    if (listJs == null) {
        req.status = 404;
    }
    else {
        checkChannelPermission(req, listJs);
        if (req.status == 200) {
            let key = req.rootPub["updateKey"];
            memid = "gm-" + key + "-" + listJs["id"];
        }
    }
    return <[string, JsonObject]>[memid, listJs]
}


function _initConfig() : void
{
    core.addRoute("GET", "config", "*", async (req: core.ApiRequest) => {
        if (req.verb == "promo") {
            core.checkPermission(req, "script-promo");
        }
        else {
            core.checkPermission(req, "root");
        }
        if (req.status == 200) {
            let entry = await core.settingsContainer.getAsync(req.verb);
            if (entry == null) {
                req.response = ({});
            }
            else {
                req.response = entry;
            }
        }
    });
    core.addRoute("POST", "config", "*", async (req1: core.ApiRequest) => {
        core.checkPermission(req1, "root");
        if (req1.status == 200 && ! /^(compile|settings|promo|compiletag)$/.test(req1.verb)) {
            req1.status = httpCode._404NotFound;
        }
        if (req1.status == 200) {
            await audit.logAsync(req1, "update-settings", {
                subjectid: req1.verb,
                oldvalue: await core.settingsContainer.getAsync(req1.verb),
                newvalue: req1.body
            });
            await core.settingsContainer.updateAsync(req1.verb, async (entry1: JsonBuilder) => {
                core.copyJson(req1.body, entry1);
                entry1["stamp"] = azureTable.createLogId();
            });
        }
        req1.response = ({});
    });
}

export async function deleteUserAsync(req8:core.ApiRequest)
{
    await tdliteWorkspace.deleteAllHistoryAsync(req8.rootId, req8);

    for (let pk of core.getPubKinds()) {
        // TODO We leave groups alone - rethink.
        if (pk.deleteWithAuthor)
            await deleteAllByUserAsync(pk.store, req8.rootId, req8);
    }

    // Bugs, releases, etc just stay
    let delok = await core.deleteAsync(req8.rootPub);
    await audit.logAsync(req8, "delete", {
        oldvalue: req8.rootPub
    });
}

async function deleteAllByUserAsync(store: indexedStore.Store, id: string, req: core.ApiRequest) : Promise<void>
{
    let logDelete = store.kind != "review";
    await store.getIndex("userid").forAllBatchedAsync(id, 50, async (json: JsonObject) => {
        await parallel.forJsonAsync(json, async (json1: JsonObject) => {
            if (logDelete) {
                await audit.logAsync(req, "delete-by-user", {
                    publicationid: json1["id"],
                    oldvalue: await audit.auditDeleteValueAsync(json1),
                    publicationkind: json1["kind"]
                });
            }
            await deletePubRecAsync(json1);
        });
    });
}


async function _initEmbedThumbnailsAsync() : Promise<void>
{
    embedThumbnails = await cachedStore.createContainerAsync("embedthumbnails", {
        inMemoryCacheSeconds: 120
    });
    restify.server().get("/thumbnail/:size/:provider/:id", async (req: restify.Request, res: restify.Response) => {
        let referer = orEmpty(req.header("referer")).toLowerCase();
        if (referer == "" || td.startsWith(referer, core.self) || td.startsWith(referer, "http://localhost:")) {
            // ok, referer checked
        }
        else {
            res.sendCustomError(httpCode._402PaymentRequired, "Bad referer");
            return;
        }
        let provider = req.param("provider");
        let id = req.param("id");
        let path = provider + "/" + id;
        let entry = await embedThumbnails.getAsync(path);
        if (entry == null) {
            let drop = await core.throttleCoreAsync(core.sha256(req.remoteIp()) + ":thumb", 10);
            if (drop) {
                res.sendError(httpCode._429TooManyRequests, "Too many thumbnail reqs");
                return;
            }
            if (provider == "vimeo") {
                if ( ! /^[0-9]+$/.test(id)) {
                    res.sendError(httpCode._412PreconditionFailed, "Bad video id");
                    return;
                }
                let js = await td.downloadJsonAsync("https://vimeo.com/api/oembed.json?url=" + encodeURIComponent("https://vimeo.com/" + id));
                if (js == null) {
                    res.sendError(httpCode._404NotFound, "");
                    return;
                }
                let jsb = {};
                jsb["info"] = js;
                let ok = await embedThumbnails.tryInsertAsync(path, jsb);
                entry = clone(jsb);
            }
            else {
                res.sendError(httpCode._405MethodNotAllowed, "invalid provider");
                return;
            }
        }
        let sz = orZero(parseFloat(withDefault(req.param("size"), "0")));
        if (sz <= 0) {
            sz = 512;
        }
        let url = entry["info"]["thumbnail_url"];
        url = url.replace(/_\d+\./g, "_" + sz + ".");
        res.redirect(301, url);
    });
    restify.server().get("/embed/.*", async (req1: restify.Request, res1: restify.Response) => {
        let id1 = req1.url().replace(/\?.*/g, "").replace(/^\/embed\//g, "");
        if (/^[a-z0-9\-\/]+$/.test(id1)) {
            let templ = "<!doctype html>\n<html lang=\"en\">\n<head>\n  <meta charset=\"utf-8\">\n  <title>Video</title>\n</head>\n<body>\n  <video controls autoplay preload=auto poster=\"{SELF}{ID}/thumb\" style='width:100%;height:100%'>\n    <source src=\"{SELF}{ID}/sd\" type=\"video/mp4\">\n    Video not supported.\n  </video>\n</body>\n</html>\n";
            let s = td.replaceAll(td.replaceAll(templ, "{SELF}", core.self), "{ID}", id1);
            res1.html(s);
        }
        else {
            res1.sendError(httpCode._404NotFound, "Bad id");
        }
    });
}

function _initAdmin() : void
{
    deploymentMeta = JSON.parse(withDefault(td.serverSetting("TD_DEPLOYMENT_META", true), "{}"));
    core.addRoute("GET", "stats", "dmeta", async (req: core.ApiRequest) => {
        req.response = deploymentMeta;
    });
    core.addRoute("GET", "admin", "stats", async (req1: core.ApiRequest) => {
        core.checkPermission(req1, "operator");
        if (req1.status == 200) {
            let jsb = {};
            for (let s of ["RoleInstanceID", "TD_BLOB_DEPLOY_CHANNEL", "TD_WORKER_ID", "TD_DEPLOYMENT_ID"]) {
                if (s != "") {
                    jsb[s] = orEmpty(td.serverSetting(s, true));
                }
            }
            jsb["search"] = await tdliteIndex.statisticsAsync();
            jsb["dmeta"] = deploymentMeta;
            jsb["load"] = await core.cpuLoadAsync();
            let redis0 = await core.redisClient.infoAsync();
            jsb["redis"] = redis0;
            if (orFalse(req1.queryOptions["text"])) {
                let s2 = jsb["RoleInstanceID"] + ": load " + JSON.stringify(jsb["load"]) + " redis load: " + redis0["used_cpu_avg_ms_per_sec"] / 10 + " req/s: " + redis0["instantaneous_ops_per_sec"] + "\n";
                req1.response = s2;
            }
            else {
                req1.response = clone(jsb);
            }
        }
    });
    core.addRoute("GET", "admin", "deploydata", async (req2: core.ApiRequest) => {
        core.checkPermission(req2, "root");
        if (req2.status == 200) {
            let ch = withDefault(req2.argument, core.myChannel);
            req2.response = JSON.parse((await tdDeployments.getBlobToTextAsync("000ch-" + ch)).text());
        }
    });
    core.addRoute("POST", "admin", "copydeployment", async (req3: core.ApiRequest) => {
        await audit.logAsync(req3, "copydeployment", {
            data: req3.argument
        });
        await copyDeploymentAsync(req3, req3.argument);
    });
    core.addRoute("POST", "admin", "restart", async (req4: core.ApiRequest) => {
        await audit.logAsync(req4, "copydeployment", {
            data: "restart"
        });
        await copyDeploymentAsync(req4, core.myChannel);
    });
    core.addRoute("GET", "admin", "raw", async (req5: core.ApiRequest) => {
        core.checkPermission(req5, "root");
        if (req5.status == 200) {
            let entry = await core.pubsContainer.getAsync(req5.argument);
            if (entry == null) {
                entry = ({ "code": "four oh four" });
            }
            req5.response = entry;
        }
    });
    core.addRoute("GET", "admin", "rawblob", async (req6: core.ApiRequest) => {
        core.checkPermission(req6, "root");
        if (req6.status == 200) {
            let info = await (await core.pubsContainer.blobContainerAsync()).getBlobToTextAsync(req6.argument);
            if (info.succeded()) {
                req6.response = info.text();
            }
            else {
                req6.response = info.error();
            }
        }
    });
    core.addRoute("GET", "admin", "rawcode", async (req7: core.ApiRequest) => {
        core.checkPermission(req7, "root");
        if (req7.status == 200) {
            let cd = req7.argument;
            if (cd.length < 64) {
                cd = core.sha256(cd);
            }
            let entry1 = await tdliteUsers.passcodesContainer.getAsync("code/" + cd);
            if (entry1 == null) {
                entry1 = ({ "status": "four oh four" });
            }
            req7.response = entry1;
        }
    });
    core.addRoute("POST", "admin", "opcode", async (req8: core.ApiRequest) => {
        core.checkPermission(req8, "root");
        if (req8.status == 200) {
            let cd1 = req8.body["code"];
            let entry2 = await tdliteUsers.passcodesContainer.getAsync(cd1);
            if (entry2 == null) {
                entry2 = ({ "status": "four oh four" });
            }
            else if (orEmpty(req8.body["op"]) == "delete") {
                await tdliteUsers.passcodesContainer.updateAsync(cd1, async (entry3: JsonBuilder) => {
                    for (let s4 of Object.keys(entry3)) {
                        delete entry3[s4];
                    }
                    entry3["kind"] = "reserved";
                });
            }
            req8.response = entry2;
        }
    });
    core.addRoute("POST", "admin", "mbedint", async (req9: core.ApiRequest) => {
        core.checkPermission(req9, "root");
        if (req9.status == 200) {
            let ccfg = CompilerConfig.createFromJson((await core.settingsContainer.getAsync("compile"))[req9.argument]);
            let jsb2 = clone(req9.body);
            let response2 = await mbedintRequestAsync(ccfg, jsb2);
            req9.response = response2.contentAsJson();
        }
    });
}

function _initProgress() : void
{
    core.addRoute("POST", "*user", "progress", async (req: core.ApiRequest) => {
        core.meOnly(req);
        if (req.status == 200) {
            req.response = ({});
        }
    });
}


export async function postAbusereportAsync(req: core.ApiRequest) : Promise<void>
{
    let baseKind = req.rootPub["kind"];
    if ( ! canHaveAbuseReport(baseKind)) {
        req.status = httpCode._412PreconditionFailed;
    }
    else {
        let report = new PubAbusereport();
        report.text = core.encrypt(orEmpty(req.body["text"]), "ABUSE");
        report.userplatform = core.getUserPlatforms(req);
        report.userid = req.userid;
        report.time = await core.nowSecondsAsync();
        report.publicationid = req.rootId;
        report.publicationkind = baseKind;
        let pub = req.rootPub["pub"];
        report.publicationname = orEmpty(pub["name"]);
        report.publicationuserid = getAuthor(pub);
        let jsb = {};
        jsb["pub"] = report.toJson();
        await core.generateIdAsync(jsb, 10);
        await abuseReports.insertAsync(jsb);
        await core.pubsContainer.updateAsync(report.publicationid, async (entry: JsonBuilder) => {
            if (! entry["abuseStatus"]) {
                entry["abuseStatus"] = "active";
            }
            entry["abuseStatusPosted"] = "active";
        });
        await notifications.storeAsync(req, jsb, "");
        await core.returnOnePubAsync(abuseReports, clone(jsb), req);
    }
}

function getAuthor(pub: JsonObject) : string
{
    let author2: string;
    let author = pub["userid"];
    if (pub["kind"] == "user") {
        author = pub["id"];
    }
    return author;
    return author2;
}

export function canHaveAbuseReport(baseKind: string) : boolean
{
    let canAbuse2: boolean;
    let canAbuse = /^(art|comment|script|screenshot|channel|group|user)$/.test(baseKind);
    return canAbuse;
    return canAbuse2;
}


function _initTicks() : void
{
    core.addRoute("POST", "ticks", "", async (req: core.ApiRequest) => {
        let js = req.body["sessionEvents"];
        if (js != null) {
            for (let evName of Object.keys(js)) {
                if (td.startsWith(evName, "browser.")) {
                    logger.tick(td.replaceAll(evName, "browser.", "NewWebApp@"));
                }
                else if (/^(calcEdit|coreRun)(\|.*)?$/.test(evName)) {
                    let jsb = {};
                    jsb["repeat"] = td.clamp(0, 100, js[evName]);
                    logger.customTick(evName.replace(/\|.*/g, ""), clone(jsb));
                }
            }
        }
        req.response = ({});
    }
    , {
        noSizeCheck: true
    });
}



async function copyDeploymentAsync(req: core.ApiRequest, target: string) : Promise<void>
{
    core.checkPermission(req, "root");
    if (req.status == 200) {
        let jsb2 = JSON.parse((await tdDeployments.getBlobToTextAsync("000ch-" + core.myChannel)).text());
        jsb2["did"] = cachedStore.freshShortId(12);
        req.response = clone(jsb2);
        let result = await tdDeployments.createBlockBlobFromTextAsync("000ch-" + target, JSON.stringify(req.response), {
            contentType: "application/json;charset=utf8"
        });
        if ( ! result.succeded()) {
            req.status = 400;
        }
    }
}


function _initRuntime() : void
{
    core.addRoute("POST", "runtime", "translate", async (req: core.ApiRequest) => {
        // TODO figure out the right permission here and throttle
        core.checkPermission(req, "root-ptr");
        if (req.status != 200) {
            return;
        }
        let text = orEmpty(req.body["html"]);
        let ishtml = true;
        if (text == "") {
            text = orEmpty(req.body["text"]);
            ishtml = false;
        }
        let jsb = {};
        if (text == "") {
            jsb["translated"] = "";
        }
        else {
            let translated = await microsoftTranslator.translateAsync(text, orEmpty(req.body["from"]), orEmpty(req.body["to"]), ishtml);
            if (translated == null) {
                req.status = httpCode._424FailedDependency;
            }
            else {
                jsb["translated"] = translated;
            }
        }
        req.response = clone(jsb);
    });
}

async function mbedwsDownloadAsync(sha: string, compile: mbedworkshopCompiler.CompilationRequest, ccfg: CompilerConfig) : Promise<void>
{
    logger.newContext();
    let task = await compile.statusAsync(true);
    // TODO: mbed seems to need a second call
    await td.sleepAsync(1);
    task = await compile.statusAsync(false);
    let st = new CompileStatus();
    logger.measure("MbedWsCompileTime", logger.contextDuration());
    st.success = task.success;
    // Just in case...
    let s = JSON.stringify(task.payload).replace(/\w+@github.com/g, "[...]@github.com");
    st.mbedresponse = JSON.parse(s);
    if (task.success) {
        let bytes = await task.downloadAsync(compile);
        if (bytes.length == 0) {
            st.success = false;
            logger.tick("MbedEmptyDownload");
        }
        else {
            st.hexurl = compileContainer.url() + "/" + sha + "/" + ccfg.hexfilename;
            let result = await compileContainer.createGzippedBlockBlobFromBufferAsync(sha + "/" + ccfg.hexfilename, bytes, {
                contentType: ccfg.hexcontenttype
            });
            logger.tick("MbedHexCreated");
        }
    }
    let result2 = await compileContainer.createBlockBlobFromTextAsync(sha + ".json", JSON.stringify(st.toJson()), {
        contentType: "application/json; charset=utf-8"
    });
}

async function mbedintDownloadAsync(sha: string, jsb2: JsonBuilder, ccfg: CompilerConfig) : Promise<void>
{
    logger.newContext();
    jsb2["hexfile"] = "source/" + ccfg.target_binary;
    jsb2["target"] = ccfg.platform;
    let response = await mbedintRequestAsync(ccfg, jsb2);
    let respJson = response.contentAsJson();
    let st = new CompileStatus();
    logger.measure("MbedIntCompileTime", logger.contextDuration());
    // Just in case...
    if (response.statusCode() != 200 || respJson == null) {
        setMbedresponse(st, "Code: " + response.statusCode());
    }
    else {
        let hexfile = respJson["hexfile"];
        let msg = orEmpty(respJson["stderr"]) + orEmpty(respJson["stdout"]);
        if (hexfile == null) {
            setMbedresponse(st, withDefault(msg, "no hex"));
        }
        else {
            st.success = true;
            st.hexurl = compileContainer.url() + "/" + sha + "/" + ccfg.hexfilename;
            let result = await compileContainer.createGzippedBlockBlobFromBufferAsync(sha + "/" + ccfg.hexfilename, new Buffer(hexfile, "utf8"), {
                contentType: ccfg.hexcontenttype
            });
            logger.tick("MbedHexCreated");
        }
    }
    let result2 = await compileContainer.createBlockBlobFromTextAsync(sha + ".json", JSON.stringify(st.toJson()), {
        contentType: "application/json; charset=utf-8"
    });
}

function setMbedresponse(st: CompileStatus, msg: string) : void
{
    let jsb = ({ "result": {} });
    jsb["result"]["exception"] = msg;
    st.mbedresponse = jsb;
}

async function mbedintRequestAsync(ccfg: CompilerConfig, jsb2: JsonBuilder) : Promise<td.WebResponse>
{
    jsb2["requestId"] = azureTable.createRandomId(128);
    let request = td.createRequest(ccfg.internalUrl);
    let iv = crypto.randomBytes(16);
    let key = new Buffer(td.serverSetting("MBEDINT_KEY", false), "hex");
    let cipher = crypto.createCipheriv("aes256", key, iv);
    request.setHeader("x-iv", iv.toString("hex"));
    let enciphered = cipher.update(new Buffer(JSON.stringify(jsb2), "utf8"));
    let cipherFinal = cipher.final();
    request.setContentAsBuffer(Buffer.concat([enciphered, cipherFinal]));
    request.setMethod("post");
    let response = await request.sendAsync();
    let buf = response.contentAsBuffer();
    let inpiv = response.header("x-iv");
    if (response.statusCode() == 200) {
        var ciph = crypto.createDecipheriv("AES256", key, new Buffer(inpiv, "hex"));
        var b0 = ciph.update(buf)
        var b1 = ciph.final()
        var dat = Buffer.concat([b0, b1]).toString("utf8");
        (<any>response)._content = dat;
    }
    return response;
}

async function _initPromoAsync() : Promise<void>
{
    promosTable = await core.tableClient.createTableIfNotExistsAsync("promos");
    await tdliteScripts.scripts.createCustomIndexAsync("promo", promosTable);
    core.addRoute("GET", "promo-scripts", "*", async (req: core.ApiRequest) => {
        await core.anyListAsync(tdliteScripts.scripts, req, "promo", req.verb);
    }
    , {
        cacheKey: "promo"
    });
    core.addRoute("GET", "promo", "config", async (req1: core.ApiRequest) => {
        core.checkPermission(req1, "script-promo");
        if (req1.status != 200) {
            return;
        }
        req1.response = await core.settingsContainer.getAsync("promo");
    });
    core.addRoute("GET", "*script", "promo", async (req2: core.ApiRequest) => {
        core.checkPermission(req2, "script-promo");
        if (req2.status != 200) {
            return;
        }
        req2.response = await getPromoAsync(req2);
    });
    core.addRoute("POST", "*script", "promo", async (req3: core.ApiRequest) => {
        core.checkPermission(req3, "script-promo");
        if (req3.status != 200) {
            return;
        }
        let promo = await getPromoAsync(req3);
        let oldPromoId = orEmpty(req3.rootPub["promoId"]);
        if (oldPromoId != "") {
            await parallel.forJsonAsync(promo["tags"], async (json: JsonObject) => {
                let entity = azureTable.createEntity(td.toString(json), oldPromoId);
                let ok = await promosTable.tryDeleteEntityAsync(clone(entity));
            });
        }
        let jsb2 = clone(promo);
        td.jsonCopyFrom(jsb2, req3.body);
        let coll = (<string[]>[]);
        let newTags = jsb2["tags"];
        if (newTags.length > 0) {
            let d = {};
            for (let jsb3 of newTags) {
                d[td.toString(jsb3)] = "1";
            }
            d["all"] = "1";
            if (false) {
                let pubScript = tdliteScripts.PubScript.createFromJson(req3.rootPub["pub"]);
                coll.push(pubScript.editor);
                d[withDefault(pubScript.editor, "touchdevelop")] = "1";
                if (td.stringContains(pubScript.description, "#docs")) {
                    d["docs"] = "1";
                }
            }
            jsb2["tags"] = td.arrayToJson(Object.keys(d));
        }
        promo = clone(jsb2);
        let offsetHours = Math.round(td.clamp(-200000, 1000000, orZero(promo["priority"])));
        let newtime = Math.round(req3.rootPub["pub"]["time"] + offsetHours * 3600);
        let newId = (10000000000 - newtime) + "." + req3.rootId;
        await core.pubsContainer.updateAsync(req3.rootId, async (entry: JsonBuilder) => {
            entry["promo"] = promo;
            entry["promoId"] = newId;
        });
        let js = promo["tags"];
        if (core.jsonArrayIndexOf(js, "hidden") > 0) {
            js = (["hidden"]);
        }
        else if (core.jsonArrayIndexOf(js, "preview") > 0) {
            js = (["preview"]);
        }
        await parallel.forJsonAsync(js, async (json1: JsonObject) => {
            let entity1 = azureTable.createEntity(td.toString(json1), newId);
            entity1["pub"] = req3.rootId;
            await promosTable.insertEntityAsync(clone(entity1), "or merge");
        });
        await core.flushApiCacheAsync("promo");
        req3.response = promo;
    });
}

async function getPromoAsync(req: core.ApiRequest) : Promise<JsonObject>
{
    let js2 = req.rootPub["promo"];
    if (js2 == null) {
        let jsb = ({ "tags": [], "priority": 0 });
        let lastPtr = await core.getPubAsync(req.rootPub["lastPointer"], "pointer");
        if (lastPtr != null) {
            jsb["link"] = "/" + lastPtr["pub"]["path"];
        }
        return jsb;
    }
    return js2;
}




async function main()
{
    if (fs.existsSync(process.argv[2])) {
        var cfg = JSON.parse(fs.readFileSync(process.argv[2], "utf8"))
        Object.keys(cfg).forEach(k => {
            process.env[k] = cfg[k]
        })
        console.log("loaded cfg")
    }
    await _initAsync();
    restify.finishStartup();
}

main();
