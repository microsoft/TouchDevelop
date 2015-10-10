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
import * as serverAuth from "./server-auth"
import * as wordPassword from "./word-password"
import * as raygun from "./raygun"
import * as loggly from "./loggly"
import * as libratoNode from "./librato-node"
import * as tdliteIndex from "./tdlite-index"
import * as tdliteDocs from "./tdlite-docs"
import * as mbedworkshopCompiler from "./mbedworkshop-compiler"
import * as microsoftTranslator from "./microsoft-translator"
import * as tdliteData from "./tdlite-data"
import * as tdliteHtml from "./tdlite-html"

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

var orZero = core.orZero;
var orFalse = core.orFalse;
var withDefault = core.withDefault;
var orEmpty = td.orEmpty;

export type StringTransformer = (text: string) => Promise<string>;

var reinit = false;

var logger = core.logger;
var httpCode = restify.http();

var comments: indexedStore.Store;
var reviews: indexedStore.Store;
var tags2: indexedStore.Store;
var importRunning: boolean = false;
var releases: indexedStore.Store;
var appContainer: azureBlobStorage.Container;
var cacheRewritten: cachedStore.Container;
var filesContainer: azureBlobStorage.Container;
var abuseReports: indexedStore.Store;
var compileContainer: azureBlobStorage.Container;
var mbedVersion: number = 0;
var crashContainer: azureBlobStorage.Container;
var channels: indexedStore.Store;
var channelMemberships: indexedStore.Store;
var cloudRelid: string = "";
var doctopics: JsonObject;
var doctopicsByTopicid: JsonObject;
var doctopicsCss: string = "";
var pointers: indexedStore.Store;
var deploymentMeta: JsonObject;
var tdDeployments: azureBlobStorage.Container;
var mainReleaseName: string = "";
var mbedCache: boolean = false;
var faviconIco: Buffer;
var embedThumbnails: cachedStore.Container;
var loginHtml: JsonObject;
var deployChannels: string[];
var promosTable: azureTable.Table;
var templateSuffix: string = "";
var initialApprovals: boolean = false;

export class PubComment
    extends td.JsonRecord
{
    @json public kind: string = "";
    @json public time: number = 0;
    @json public id: string = "";
    @json public url: string = "";
    @json public text: string = "";
    @json public userid: string = "";
    @json public username: string = "";
    @json public userscore: number = 0;
    @json public userhaspicture: boolean = false;
    @json public userplatform: string[];
    @json public publicationid: string = "";
    @json public publicationname: string = "";
    @json public publicationkind: string = "";
    @json public nestinglevel: number = 0;
    @json public positivereviews: number = 0;
    @json public subscribers: number = 0;
    @json public comments: number = 0;
    @json public assignedtoid: string = "";
    @json public resolved: string = "";
    static createFromJson(o:JsonObject) { let r = new PubComment(); r.fromJson(o); return r; }
}

export interface IPubComment {
    kind: string;
    time: number;
    id: string;
    url: string;
    text: string;
    userid: string;
    username: string;
    userscore: number;
    userhaspicture: boolean;
    userplatform: string[];
    publicationid: string;
    publicationname: string;
    publicationkind: string;
    nestinglevel: number;
    positivereviews: number;
    subscribers: number;
    comments: number;
    assignedtoid: string;
    resolved: string;
}

export class PubReview
    extends td.JsonRecord
{
    @json public kind: string = "";
    @json public time: number = 0;
    @json public id: string = "";
    @json public userid: string = "";
    @json public username: string = "";
    @json public userscore: number = 0;
    @json public userhaspicture: boolean = false;
    @json public userplatform: string[];
    @json public publicationid: string = "";
    @json public publicationname: string = "";
    @json public publicationkind: string = "";
    @json public publicationuserid: string = "";
    @json public ispositive: boolean = false;
    static createFromJson(o:JsonObject) { let r = new PubReview(); r.fromJson(o); return r; }
}

export interface IPubReview {
    kind: string;
    time: number;
    id: string;
    userid: string;
    username: string;
    userscore: number;
    userhaspicture: boolean;
    userplatform: string[];
    publicationid: string;
    publicationname: string;
    publicationkind: string;
    publicationuserid: string;
    ispositive: boolean;
}

export class PubTag
    extends td.JsonRecord
{
    @json public kind: string = "";
    @json public time: number = 0;
    @json public id: string = "";
    @json public url: string = "";
    @json public name: string = "";
    @json public category: string = "";
    @json public description: string = "";
    @json public instances: number = 0;
    @json public topscreenshotids: string[];
    static createFromJson(o:JsonObject) { let r = new PubTag(); r.fromJson(o); return r; }
}

export interface IPubTag {
    kind: string;
    time: number;
    id: string;
    url: string;
    name: string;
    category: string;
    description: string;
    instances: number;
    topscreenshotids: string[];
}

export class PubRelease
    extends td.JsonRecord
{
    @json public kind: string = "";
    @json public time: number = 0;
    @json public id: string = "";
    @json public releaseid: string = "";
    @json public userid: string = "";
    @json public username: string = "";
    @json public userscore: number = 0;
    @json public userhaspicture: boolean = false;
    @json public labels: IReleaseLabel[];
    @json public commit: string = "";
    @json public branch: string = "";
    @json public buildnumber: number = 0;
    @json public version: string = "";
    @json public name: string = "";
    static createFromJson(o:JsonObject) { let r = new PubRelease(); r.fromJson(o); return r; }
}

export interface IPubRelease {
    kind: string;
    time: number;
    id: string;
    releaseid: string;
    userid: string;
    username: string;
    userscore: number;
    userhaspicture: boolean;
    labels: IReleaseLabel[];
    commit: string;
    branch: string;
    buildnumber: number;
    version: string;
    name: string;
}

export interface IReleaseLabel {
    name: string;
    userid: string;
    time: number;
    releaseid: string;
    relid: string;
    numpokes: number;
}

export class PubWebfile
    extends td.JsonRecord
{
    @json public kind: string = "";
    @json public time: number = 0;
    @json public id: string = "";
    @json public userid: string = "";
    @json public username: string = "";
    @json public userscore: number = 0;
    @json public userhaspicture: boolean = false;
    @json public userplatform: string[];
    @json public filename: string = "";
    @json public contenttype: string = "";
    @json public labels: string[];
    @json public rawurl: string = "";
    static createFromJson(o:JsonObject) { let r = new PubWebfile(); r.fromJson(o); return r; }
}

export interface IPubWebfile {
    kind: string;
    time: number;
    id: string;
    userid: string;
    username: string;
    userscore: number;
    userhaspicture: boolean;
    userplatform: string[];
    filename: string;
    contenttype: string;
    labels: string[];
    rawurl: string;
}

export class LoginSession
    extends td.JsonRecord
{
    @json public state: string = "";
    @json public userid: string = "";
    @json public redirectUri: string = "";
    @json public groupid: string = "";
    @json public passwords: string[];
    @json public pass: string = "";
    @json public ownerId: string = "";
    @json public termsOk: boolean = false;
    @json public codeOk: boolean = false;    
    @json public nickname: string = "";
    static createFromJson(o:JsonObject) { let r = new LoginSession(); r.fromJson(o); return r; }
}

export interface ILoginSession {
    state: string;
    userid: string;
    redirectUri: string;
    groupid: string;
    passwords: string[];
    pass: string;
    ownerId: string;
    termsOk: boolean;
    codeOk: boolean;
}

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

export class RecImportResponse
    extends td.JsonRecord
{
    @json public problems: number = 0;
    @json public imported: number = 0;
    @json public present: number = 0;
    @json public attempts: number = 0;
    @json public ids: JsonBuilder;
    @json public force: boolean = false;
    @json public fulluser: boolean = false;
    static createFromJson(o:JsonObject) { let r = new RecImportResponse(); r.fromJson(o); return r; }
}

export interface IRecImportResponse {
    problems: number;
    imported: number;
    present: number;
    attempts: number;
    ids: JsonBuilder;
    force: boolean;
    fulluser: boolean;
}

export class PubPointer
    extends td.JsonRecord
{
    @json public kind: string = "";
    @json public time: number = 0;
    @json public id: string = "";
    @json public path: string = "";
    @json public scriptid: string = "";
    @json public artid: string = "";
    @json public redirect: string = "";
    @json public description: string = "";
    @json public userid: string = "";
    @json public username: string = "";
    @json public userscore: number = 0;
    @json public userhaspicture: boolean = false;
    @json public userplatform: string[];
    @json public comments: number = 0;
    @json public artcontainer: string = "";
    @json public parentpath: string = "";
    @json public scriptname: string = "";
    @json public scriptdescription: string = "";
    @json public breadcrumbtitle: string = "";
    static createFromJson(o:JsonObject) { let r = new PubPointer(); r.fromJson(o); return r; }
}

export interface IPubPointer {
    kind: string;
    time: number;
    id: string;
    path: string;
    scriptid: string;
    artid: string;
    redirect: string;
    description: string;
    userid: string;
    username: string;
    userscore: number;
    userhaspicture: boolean;
    userplatform: string[];
    comments: number;
    artcontainer: string;
    parentpath: string;
    scriptname: string;
    breadcrumbtitle: string;
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
    deployChannels = withDefault(td.serverSetting("CHANNELS", false), core.myChannel).split(",");
    templateSuffix = orEmpty(td.serverSetting("TEMPLATE_SUFFIX", true));
    initialApprovals = core.myChannel == "test";

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

    mainReleaseName = withDefault(td.serverSetting("MAIN_RELEASE_NAME", true), "current");
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

    core.somePubStore = comments;

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
    server.get("/api/ready/:userid", async (req1: restify.Request, res1: restify.Response) => {
        core.handleHttps(req1, res1);
        let throttleKey = core.sha256(req1.remoteIp()) + ":ready";
        if (await core.throttleCoreAsync(throttleKey, 1)) {
            res1.sendError(httpCode._429TooManyRequests, "");
        }
        else {
            let uid = req1.param("userid");
            let entry2 = await core.getPubAsync(uid, "user");
            if (entry2 == null) {
                if (await core.throttleCoreAsync(throttleKey, 100)) {
                    res1.sendError(httpCode._429TooManyRequests, "");
                }
                else {
                    res1.sendError(httpCode._404NotFound, "Missing");
                }
            }
            else if (orFalse(entry2["awaiting"])) {
                res1.json(({ "ready": false }));
            }
            else {
                res1.json(({ "ready": true }));
            }
        }
    });
    await _initLoginAsync();
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
                    await serveReleaseAsync(req4, res4);
                }
                else if (td.startsWith(req4.url(), "/favicon.ico")) {
                    if (faviconIco == null) {
                        let res = await filesContainer.getBlobToBufferAsync("favicon.ico");
                        faviconIco = res.buffer();
                    }
                    res4.sendBuffer(faviconIco, "image/x-icon");
                }
                else if (td.startsWith(req4.url(), "/verify/")) {
                    await handleEmailVerificationAsync(req4, res4);
                }
                else {
                    await servePointerAsync(req4, res4);
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
    cacheRewritten = await cachedStore.createContainerAsync("cacherewritten", {
        inMemoryCacheSeconds: 15,
        redisCacheSeconds: 3600
    });
    tdDeployments = await core.blobService.createContainerIfNotExistsAsync("tddeployments", "private");
    appContainer = await core.blobService.createContainerIfNotExistsAsync("app", "hidden");
    filesContainer = await core.blobService.createContainerIfNotExistsAsync("files", "hidden");
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
    await _initPromoAsync();
    await _initCommentsAsync();
    await tdliteGroups.initAsync();
    await _initTagsAsync();
    await tdliteArt.initAsync();
    await _initReviewsAsync();
    await tdliteUsers.initAsync();
    await notifications.initAsync();
    await _initReleasesAsync();
    await _initAbusereportsAsync();
    await _initChannelsAsync();
    await _initPointersAsync();
    _initConfig();
    await _initEmbedThumbnailsAsync();
    await tdliteVimeo.initAsync();
    _initProgress();
    _initRuntime();
    // ## and other stuff
    await search.initAsync();
    _initImport();
    await tdliteWorkspace.initAsync();
}


async function resolveCommentsAsync(entities: indexedStore.FetchResult) : Promise<void>
{
    await core.addUsernameEtcAsync(entities);
    let coll = (<PubComment[]>[]);
    for (let jsb of entities.items) {
        let comment = PubComment.createFromJson(jsb["pub"]);
        coll.push(comment);
    }
    entities.items = td.arrayToJson(coll);
}


async function postCommentAsync(req: core.ApiRequest) : Promise<void>
{
    let baseKind = req.rootPub["kind"];
    if ( ! /^(comment|script|group|screenshot|channel)$/.test(baseKind)) {
        req.status = httpCode._412PreconditionFailed;
    }
    else {
        let comment = new PubComment();
        comment.text = orEmpty(req.body["text"]);
        comment.userplatform = core.getUserPlatforms(req);
        comment.userid = req.userid;
        comment.time = await core.nowSecondsAsync();
        comment.publicationid = req.rootId;
        comment.publicationkind = baseKind;
        if (baseKind == "comment") {
            comment.nestinglevel = req.rootPub["pub"]["nestinglevel"] + 1;
            comment.publicationname = req.rootPub["pub"]["publicationname"];
        }
        else {
            comment.nestinglevel = 0;
            comment.publicationname = orEmpty(req.rootPub["pub"]["name"]);
        }
        let jsb = {};
        jsb["pub"] = comment.toJson();
        await core.generateIdAsync(jsb, 10);
        await comments.insertAsync(jsb);
        await updateCommentCountersAsync(comment);
        await notifications.storeAsync(req, jsb, "");
        await search.scanAndSearchAsync(jsb);
        // ### return comment back
        await core.returnOnePubAsync(comments, clone(jsb), req);
    }
}

async function resolveReviewsAsync(entities: indexedStore.FetchResult) : Promise<void>
{
    await core.addUsernameEtcAsync(entities);
    let coll = (<PubReview[]>[]);
    for (let jsb of entities.items) {
        let review = PubReview.createFromJson(jsb["pub"]);
        coll.push(review);
    }
    entities.items = td.arrayToJson(coll);
}

async function getUserReviewedAsync(req: core.ApiRequest) : Promise<void>
{
    let pub = await core.pubsContainer.getAsync(req.argument);
    if (pub == null) {
        req.status = 404;
    }
    else {
        let id = pub["id"];
        if (pub["kind"] == "script") {
            id = pub["updateKey"];
        }
        let reviewPointer = await core.getPubAsync("r-" + id + "-" + req.rootId, "pubpointer");
        if (reviewPointer == null) {
            req.status = 404;
        }
        else {
            req.response = await core.getOnePubAsync(reviews, reviewPointer["pointer"], req);
            if (req.response == null) {
                req.status = 404;
            }
        }
    }
}


async function postReviewAsync(req: core.ApiRequest) : Promise<void>
{
    let baseKind = req.rootPub["kind"];
    if ( ! /^(comment|script|channel)$/.test(baseKind)) {
        req.status = httpCode._412PreconditionFailed;
    }
    else {
        let pubid = req.rootId;
        if (baseKind == "script") {
            pubid = req.rootPub["updateKey"];
        }

        let review = new PubReview();
        review.id = await reviews.generateIdAsync(10);
        review.userplatform = core.getUserPlatforms(req);
        review.userid = req.userid;
        review.time = await core.nowSecondsAsync();
        review.publicationid = req.rootId;
        review.publicationkind = baseKind;
        review.publicationname = orEmpty(req.rootPub["pub"]["name"]);
        review.publicationuserid = orEmpty(req.rootPub["pub"]["userid"]);
        review.ispositive = true;
        let jsb = await updateReviewCountsAsync(review, pubid, req);
        if (req.status == 200) {
            // ### return heart back
            await notifications.storeAsync(req, jsb, "");
            await core.returnOnePubAsync(reviews, clone(jsb), req);
        }
    }
}



async function importCommentAsync(req: core.ApiRequest, body: JsonObject) : Promise<void>
{
    let comment = new PubComment();
    comment.fromJson(core.removeDerivedProperties(body));

    let jsb = {};
    jsb["pub"] = comment.toJson();
    jsb["id"] = comment.id;
    await comments.insertAsync(jsb);
    await search.scanAndSearchAsync(jsb, {
        skipScan: true
    });
    await updateCommentCountersAsync(comment);
}

/**
 * ### update comment count
 */
async function updateCommentCountersAsync(comment: PubComment) : Promise<void>
{
    await core.pubsContainer.updateAsync(comment.publicationid, async (entry: JsonBuilder) => {
        core.increment(entry, "comments", 1);
    });
}

async function importAnythingAsync(req: core.ApiRequest) : Promise<void>
{
    let coll = asArray(req.body);
    await parallel.forAsync(coll.length, async (x: number) => {
        let js = coll[x];
        let apiRequest = await importOneAnythingAsync(js);
        coll[x] = apiRequest.status;
    });
    req.response = td.arrayToJson(coll);
}


async function importTagAsync(req: core.ApiRequest, body: JsonObject) : Promise<void>
{
    let grp = new PubTag();
    grp.fromJson(core.removeDerivedProperties(body));

    let jsb = {};
    jsb["pub"] = grp.toJson();
    jsb["id"] = grp.id;
    await tags2.insertAsync(jsb);
}

function resolveTags(entities: indexedStore.FetchResult) : void
{
    let coll = (<PubTag[]>[]);
    for (let jsb of entities.items) {
        let tag = PubTag.createFromJson(jsb["pub"]);
        tag.topscreenshotids = (<string[]>[]);
        coll.push(tag);
    }
    entities.items = td.arrayToJson(coll);
}

async function _initCommentsAsync() : Promise<void>
{
    comments = await indexedStore.createStoreAsync(core.pubsContainer, "comment");
    await core.setResolveAsync(comments, async (fetchResult: indexedStore.FetchResult, apiRequest: core.ApiRequest) => {
        await resolveCommentsAsync(fetchResult);
    }
    , {
        byUserid: true,
        byPublicationid: true
    });
    core.addRoute("POST", "*pub", "comments", async (req: core.ApiRequest) => {
        await core.canPostAsync(req, "comment");
        if (req.status == 200) {
            await postCommentAsync(req);
        }
    });
    core.addRoute("GET", "*pub", "comments", async (req1: core.ApiRequest) => {
        if (req1.status == 200) {
            // optimize the no-comments case
            if (orZero(req1.rootPub["pub"]["comments"]) == 0) {
                req1.response = ({"continuation":"","items":[],"kind":"list"});
            }
            else {
                await core.anyListAsync(comments, req1, "publicationid", req1.rootId);
            }
        }
    });
}

async function _initTagsAsync() : Promise<void>
{
    tags2 = await indexedStore.createStoreAsync(core.pubsContainer, "tag");
    await core.setResolveAsync(tags2, async (fetchResult: indexedStore.FetchResult, apiRequest: core.ApiRequest) => {
        resolveTags(fetchResult);
    });
    core.addRoute("GET", "*script", "tags", async (req: core.ApiRequest) => {
        req.response = ({ "items": [] });
    });
}

async function _initReviewsAsync() : Promise<void>
{
    reviews = await indexedStore.createStoreAsync(core.pubsContainer, "review");
    await core.setResolveAsync(reviews, async (fetchResult: indexedStore.FetchResult, apiRequest: core.ApiRequest) => {
        await resolveReviewsAsync(fetchResult);
    }
    , {
        byUserid: true
    });
    // ### by parent publication
    await reviews.createIndexAsync("pubid", entry => entry["pubid"]);
    core.addRoute("GET", "*pub", "reviews", async (req: core.ApiRequest) => {
        let id = req.rootId;
        if (req.rootPub["kind"] == "script") {
            id = withDefault(req.rootPub["updateKey"], id);
        }
        await core.anyListAsync(reviews, req, "pubid", id);
    });
    // ### by author of publication getting heart (not in TD)
    await reviews.createIndexAsync("publicationuserid", entry1 => entry1["pub"]["publicationuserid"]);
    core.addRoute("GET", "*user", "receivedreviews", async (req1: core.ApiRequest) => {
        await core.anyListAsync(reviews, req1, "publicationuserid", req1.rootId);
    });
    core.addRoute("GET", "*user", "reviewed", async (req2: core.ApiRequest) => {
        await getUserReviewedAsync(req2);
    });
    core.addRoute("POST", "*pub", "reviews", async (req3: core.ApiRequest) => {
        await core.canPostAsync(req3, "review");
        if (req3.status == 200) {
            await postReviewAsync(req3);
        }
    });
    core.addRoute("DELETE", "*review", "", async (req4: core.ApiRequest) => {
        if (await deleteReviewAsync(req4.rootPub)) {
            req4.response = ({});
        }
        else {
            req4.status = httpCode._409Conflict;
        }
    });
}

function _initImport() : void
{
    core.addRoute("GET", "logcrash", "", async (req: core.ApiRequest) => {
        crashAndBurn();
    });
    core.addRoute("GET", "tdtext", "*", async (req1: core.ApiRequest) => {
        if (/^[a-z]+$/.test(req1.verb)) {
            let s = await td.downloadTextAsync("https://www.touchdevelop.com/api/" + req1.verb + "/text?original=true");
            req1.response = s;
        }
        else {
            req1.status = httpCode._400BadRequest;
        }
    });
    core.addRoute("POST", "import", "", async (req2: core.ApiRequest) => {
        core.checkPermission(req2, "root");
        if (req2.status == 200) {
            if (importRunning) {
                req2.status = httpCode._503ServiceUnavailable;
            }
            else {
                importRunning = true;
                await importAnythingAsync(req2);
                importRunning = false;
            }
        }
    });
    core.addRoute("POST", "recimport", "*", async (req3: core.ApiRequest) => {
        core.checkPermission(req3, "root");
        let id = req3.verb;
        if (req3.status == 200 && ! /^[a-z]+$/.test(id)) {
            req3.status = httpCode._412PreconditionFailed;
        }
        if (req3.status == 200) {
            let resp = new RecImportResponse();
            resp.ids = {};
            resp.force = orFalse(req3.queryOptions["force"]);
            resp.fulluser = orFalse(req3.queryOptions["fulluser"]);
            await importRecAsync(resp, id);
            req3.response = resp.toJson();
        }
    });
    core.addRoute("POST", "importdocs", "", async (req4: core.ApiRequest) => {
        core.checkPermission(req4, "root");
        if (req4.status == 200) {
            await importDoctopicsAsync(req4);
        }
    });
    core.addRoute("GET", "importsync", "", async (req5: core.ApiRequest) => {
        let key = req5.queryOptions["key"];
        if (key != null && key == td.serverSetting("LOGIN_SECRET", false)) {
            if (importRunning) {
                req5.status = httpCode._503ServiceUnavailable;
            }
            else {
                importRunning = true;
                await importFromPubloggerAsync(req5);
                importRunning = false;
            }
        }
        else {
            req5.status = httpCode._402PaymentRequired;
        }
    });
}

async function importReviewAsync(req: core.ApiRequest, body: JsonObject) : Promise<void>
{
    let review = new PubReview();
    review.fromJson(core.removeDerivedProperties(body));

    let pubid = review.publicationid;
    let entry = await core.pubsContainer.getAsync(pubid);
    if (core.isGoodEntry(entry)) {
        if (entry["kind"] == "script") {
            pubid = entry["updateKey"];
        }
        review.publicationuserid = entry["pub"]["userid"];
        let jsb = await updateReviewCountsAsync(review, pubid, req);
        if (req.status == 409) {
            await reviews.reserveIdAsync(review.id);
            req.status = httpCode._410Gone;
        }
    }
    else {
        req.status = 404;
    }
}

async function updateReviewCountsAsync(review: PubReview, pubid: string, req: core.ApiRequest) : Promise<JsonBuilder>
{
    let jsb: JsonBuilder;
    assert(pubid != "", "");
    jsb = {};
    jsb["pub"] = review.toJson();
    jsb["pubid"] = pubid;
    jsb["id"] = review.id;
    let key = "r-" + pubid + "-" + review.userid;
    jsb["ptrid"] = key;
    jsb["pubid"] = pubid;
    let ok = await core.tryInsertPubPointerAsync(key, review.id);
    if (ok) {
        if (false) {
            logger.debug("review: " + JSON.stringify(jsb));
        }
        await reviews.insertAsync(jsb);
        // ### update heart count
        await core.pubsContainer.updateAsync(pubid, async (entry: JsonBuilder) => {
            core.increment(entry, "positivereviews", 1);
        });
        await core.pubsContainer.updateAsync(review.publicationuserid, async (entry1: JsonBuilder) => {
            core.increment(entry1, "receivedpositivereviews", 1);
        });
    }
    else {
        req.status = httpCode._409Conflict;
    }
    return jsb;
}

async function importFromPubloggerAsync(req: core.ApiRequest) : Promise<void>
{
    let entry = await core.pubsContainer.getAsync("cfg-lastsync");
    let start = 0;
    if (entry != null) {
        start = entry["start"];
    }
    let resp = {};
    let coll2 = (<JsonObject[]>[]);
    let continuation = "&fake=blah";
    let lastTime = start;
    while (continuation != "") {
        logger.info("download from publogger: " + start + " : " + continuation);
        let js2 = await td.downloadJsonAsync("http://tdpublogger.azurewebsites.net/syncpubs?count=30&start=" + start + continuation);
        await parallel.forJsonAsync(js2["items"], async (json: JsonObject) => {
            lastTime = json["notificationtime"];
            await importDownloadPublicationAsync(json["id"], resp, coll2);
        });
        let cont = orEmpty(js2["continuation"]);
        if (coll2.length > 30 || cont == "") {
            continuation = "";
        }
        else {
            continuation = "&continuation=" + cont;
        }
    }
    for (let js4 of coll2) {
        let apiRequest = await importOneAnythingAsync(js4);
        resp[js4["id"]] = apiRequest.status;
    }
    await core.pubsContainer.updateAsync("cfg-lastsync", async (entry1: JsonBuilder) => {
        let r = orZero(entry1["start"]);
        entry1["start"] = Math.max(r, lastTime);
    });
    req.response = clone(resp);
}

async function importOneAnythingAsync(js: JsonObject) : Promise<core.ApiRequest>
{
    let apiRequest: core.ApiRequest;
    let entry = await core.pubsContainer.getAsync(js["id"]);
    apiRequest = new core.ApiRequest();
    apiRequest.status = 200;
    if ( ! core.isGoodEntry(entry)) {
        let kind = orEmpty(js["kind"])
        let desc = core.getPubKind(kind)

        if (kind == "review") {
            await importReviewAsync(apiRequest, js);
        }
        else if (kind == "comment") {
            await importCommentAsync(apiRequest, js);
        }
        else if (kind == "tag") {
            await importTagAsync(apiRequest, js);
        } else

        if (!desc)
            apiRequest.status = httpCode._422UnprocessableEntity;
        else if (desc.importOne)
            await desc.importOne(apiRequest, js)
        else
            apiRequest.status = httpCode._405MethodNotAllowed;


        logger.info("import " + kind + " /" + js["id"] + ": " + apiRequest.status);
    }
    else {
        apiRequest.status = httpCode._409Conflict;
    }
    return apiRequest;
}

async function importDownloadPublicationAsync(id: string, resp: JsonBuilder, coll2: JsonObject[]) : Promise<void>
{
    let existingEntry = await core.pubsContainer.getAsync(id);
    if ( ! core.isGoodEntry(existingEntry)) {
        let url = "https://www.touchdevelop.com/api/" + id;
        let js = await td.downloadJsonAsync(url);
        if (js == null) {
            resp[id] = 404;
        }
        else if (js["kind"] == "script") {
            let jsb = clone(js);
            if (js["rootid"] != id) {
                let js3 = await td.downloadJsonAsync(url + "/base");
                jsb["baseid"] = js3["id"];
            }
            else {
                jsb["baseid"] = "";
            }
            let s2 = await td.downloadTextAsync(url + "/text?original=true&ids=true");
            jsb["text"] = s2;
            coll2.push(clone(jsb));
        }
        else if (/^(runbucket|run|webapp)$/.test(js["kind"])) {
        }
        else {
            coll2.push(js);
        }
    }
}

async function _initReleasesAsync() : Promise<void>
{
    releases = await indexedStore.createStoreAsync(core.pubsContainer, "release");
    await core.setResolveAsync(releases, async (fetchResult: indexedStore.FetchResult, apiRequest: core.ApiRequest) => {
        await core.addUsernameEtcAsync(fetchResult);
        let coll = (<PubRelease[]>[]);
        let labels = <IReleaseLabel[]>[];
        let entry3 = await core.settingsContainer.getAsync("releases");
        if (entry3 != null && entry3["ids"] != null) {
            let js = entry3["ids"];
            for (let k of Object.keys(js)) {
                labels.push(js[k]);
            }
        }
        for (let jsb of fetchResult.items) {
            let rel = PubRelease.createFromJson(jsb["pub"]);
            rel.labels = labels.filter(elt => elt.releaseid == rel.releaseid);
            let ver = orEmpty(rel.version);
            if (ver == "") {
                rel.name = rel.releaseid.replace(/.*-/g, "");
            }
            else {
                rel.name = withDefault(rel.branch, rel.releaseid.replace(/.*-\d*/g, "")) + " " + ver;
            }
            coll.push(rel);
        }
        fetchResult.items = td.arrayToJson(coll);
    }
    , {
        byUserid: true
    });
    core.addRoute("POST", "releases", "", async (req1: core.ApiRequest) => {
        core.checkPermission(req1, "upload");
        if (req1.status == 200) {
            let rel1 = new PubRelease();
            rel1.userid = req1.userid;
            rel1.time = await core.nowSecondsAsync();
            rel1.releaseid = td.toString(req1.body["releaseid"]);
            rel1.commit = orEmpty(req1.body["commit"]);
            rel1.branch = orEmpty(req1.body["branch"]);
            rel1.buildnumber = orZero(req1.body["buildnumber"]);
            if (looksLikeReleaseId(rel1.releaseid)) {
                await core.settingsContainer.updateAsync("releaseversion", async (entry: JsonBuilder) => {
                    let x = orZero(entry[core.releaseVersionPrefix]) + 1;
                    entry[core.releaseVersionPrefix] = x;
                    rel1.version = core.releaseVersionPrefix + "." + x + "." + rel1.buildnumber;
                });
                let key = "rel-" + rel1.releaseid;
                let jsb1 = {};
                jsb1["pub"] = rel1.toJson();
                await core.generateIdAsync(jsb1, 5);
                let ok = await core.tryInsertPubPointerAsync(key, jsb1["id"]);
                if (ok) {
                    await releases.insertAsync(jsb1);
                    await core.returnOnePubAsync(releases, clone(jsb1), req1);
                }
                else {
                    let entry1 = await core.getPointedPubAsync(key, "release");
                    await core.returnOnePubAsync(releases, entry1, req1);
                }
            }
            else {
                req1.status = httpCode._412PreconditionFailed;
            }
        }
    });
    core.addRoute("POST", "*release", "files", async (req2: core.ApiRequest) => {
        core.checkPermission(req2, "upload");
        if (req2.status == 200) {
            let rel2 = PubRelease.createFromJson(req2.rootPub["pub"]);
            let body = req2.body;
            let buf = new Buffer(orEmpty(body["content"]), orEmpty(body["encoding"]));
            let request = td.createRequest(filesContainer.url() + "/overrideupload/" + td.toString(body["filename"]));
            let response = await request.sendAsync();
            if (response.statusCode() == 200) {
                buf = response.contentAsBuffer();
            }
            let result = await appContainer.createBlockBlobFromBufferAsync(rel2.releaseid + "/" + td.toString(body["filename"]), buf, {
                contentType: td.toString(body["contentType"])
            });
            result = await appContainer.createGzippedBlockBlobFromBufferAsync(rel2.releaseid + "/c/" + td.toString(body["filename"]), buf, {
                contentType: td.toString(body["contentType"]),
                cacheControl: "public, max-age=31556925",
                smartGzip: true
            });
            req2.response = ({ "status": "ok" });
        }
    }
    , {
        sizeCheckExcludes: "content"
    });
    core.addRoute("POST", "*release", "label", async (req3: core.ApiRequest) => {
        let name = orEmpty(req3.body["name"]);
        if ( ! isKnownReleaseName(name)) {
            req3.status = httpCode._412PreconditionFailed;
        }
        if (req3.status == 200) {
            core.checkPermission(req3, "lbl-" + name);
        }
        if (req3.status == 200) {
            let rel3 = PubRelease.createFromJson(req3.rootPub["pub"]);
            let lab:IReleaseLabel = <any>{};
            lab.name = name;
            lab.time = await core.nowSecondsAsync();
            lab.userid = req3.userid;
            lab.releaseid = rel3.releaseid;
            lab.relid = rel3.id;
            lab.numpokes = 0;
            await audit.logAsync(req3, "lbl-" + lab.name);
            await core.settingsContainer.updateAsync("releases", async (entry2: JsonBuilder) => {
                let jsb2 = entry2["ids"];
                if (jsb2 == null) {
                    jsb2 = {};
                    entry2["ids"] = jsb2;
                }
                jsb2[lab.name] = lab;
                core.bareIncrement(entry2, "updatecount");
            });
            if (name == "cloud") {
                /* async */ pokeReleaseAsync(name, 15);
                /* async */ deployCompileServiceAsync(rel3, req3);
            }
            req3.response = ({});
        }
    });
    core.addRoute("POST", "upload", "files", async (req4: core.ApiRequest) => {
        if (td.startsWith(orEmpty(req4.body["filename"]).toLowerCase(), "override")) {
            core.checkPermission(req4, "root");
        }
        else {
            core.checkPermission(req4, "web-upload");
        }
        if (req4.status == 200) {
            let body1 = req4.body;
            let buf1 = new Buffer(orEmpty(body1["content"]), orEmpty(body1["encoding"]));
            let result1 = await filesContainer.createGzippedBlockBlobFromBufferAsync(td.toString(body1["filename"]), buf1, {
                contentType: body1["contentType"],
                cacheControl: "public, max-age=3600",
                smartGzip: true
            });
            req4.response = ({ "status": "ok" });
        }
    }
    , {
        sizeCheckExcludes: "content"
    });

}


function looksLikeReleaseId(s: string) : boolean
{
    let b: boolean;
    b = /^\d\d\d\d\d\d\d\d\d\d[a-zA-Z\d\.\-]+$/.test(s);
    return b;
}

async function serveReleaseAsync(req: restify.Request, res: restify.Response) : Promise<void>
{
    let coll = (/^([^\?]+)(\?.*)$/.exec(req.url()) || []);
    let fn = req.url();
    let query = "";
    if (coll[1] != null) {
        fn = coll[1];
        query = coll[2];
    }
    fn = fn.replace(/^\/app\//g, "");
    if (fn.endsWith("/")) {
        res.redirect(301, "/app/" + fn.replace(/\/+$/g, "") + query);
        return;
    }
    let rel = mainReleaseName;
    if (isKnownReleaseName(fn)) {
        rel = fn;
        fn = "";
    }
    rel = withDefault(req.query()["releaseid"], withDefault(req.query()["r"], rel));

    let relid = "";
    if (looksLikeReleaseId(rel)) {
        relid = rel;
    }
    else {
        let entry = await core.settingsContainer.getAsync("releases");
        let js = entry["ids"][rel];
        if (js == null) {
            let entry3 = await core.getPubAsync(rel, "release");
            if (entry3 == null) {
                res.sendError(404, "no such release: " + rel);
            }
            else {
                relid = entry3["pub"]["releaseid"];
            }
        }
        else {
            relid = js["releaseid"];
        }
    }
    if (relid != "") {
        if (fn == "") {
            await rewriteAndCacheAsync(rel, relid, "index.html", "text/html", res, async (text: string) => {
                let result: string;
                let ver = "";
                let shortrelid = "";
                let relpub = await core.getPointedPubAsync("rel-" + relid, "release");
                let prel = PubRelease.createFromJson(relpub["pub"]);
                let ccfg = clientConfigForRelease(prel);
                ccfg.releaseLabel = rel;
                ver = orEmpty(relpub["pub"]["version"]);
                shortrelid = relpub["id"];
                if (core.basicCreds == "") {
                    text = td.replaceAll(text, "data-manifest=\"\"", "manifest=\"app.manifest?releaseid=" + encodeURIComponent(rel) + "\"");
                }
                else if (false) {
                    text = td.replaceAll(text, "data-manifest=\"\"", "manifest=\"app.manifest?releaseid=" + encodeURIComponent(rel) + "&anon_token=" + encodeURIComponent(core.basicCreds) + "\"");
                }
                let suff = "?releaseid=" + encodeURIComponent(relid) + "\"";
                text = td.replaceAll(text, "\"browsers.html\"", "\"browsers.html" + suff);
                text = td.replaceAll(text, "\"error.html\"", "\"error.html" + suff);
                text = td.replaceAll(text, "\"./", "\"" + core.currClientConfig.primaryCdnUrl + "/app/" + relid + "/c/");
                let verPref = "var tdVersion = \"" + ver + "\";\n" + "var tdConfig = " + JSON.stringify(ccfg.toJson(), null, 2) + ";\n";
                text = td.replaceAll(text, "var rootUrl = ", verPref + "var tdlite = \"url\";\nvar rootUrl = ");
                if (rel != "current") {
                    text = td.replaceAll(text, "betaFriendlyId = \"\"", "betaFriendlyId = \"beta " + withDefault(ver, relid.replace(/.*-/g, "")) + "\"");
                }
                result = text;
                return result;
            });
        }
        else if (fn == "app.manifest") {
            await rewriteAndCacheAsync(rel, relid, fn, "text/cache-manifest", res, async (text1: string) => {
                let result1: string;
                text1 = td.replaceAll(text1, "./", core.currClientConfig.primaryCdnUrl + "/app/" + relid + "/c/");
                text1 = text1 + "\n# " + core.rewriteVersion + "\n";
                result1 = text1;
                return result1;
            });
        }
        else if (fn == "error.html" || fn == "browsers.html") {
            await rewriteAndCacheAsync(rel, relid, fn, "text/html", res, async (text2: string) => {
                let result2: string;
                text2 = td.replaceAll(text2, "\"./", "\"" + core.currClientConfig.primaryCdnUrl + "/app/" + relid + "/c/");
                result2 = text2;
                return result2;
            });
        }
        else {
            res.sendError(404, "get file from CDN");
        }
    }
}

function isKnownReleaseName(fn: string) : boolean
{
    let b: boolean;
    b = /^(beta|current|latest|cloud)$/.test(fn);
    return b;
}

async function rewriteAndCacheAsync(rel: string, relid: string, srcFile: string, contentType: string, res: restify.Response, rewrite: StringTransformer) : Promise<void>
{
    let path = relid + "/" + rel + "/" + core.myChannel + "/" + srcFile;
    let entry2 = await cacheRewritten.getAsync(path);
    if (entry2 == null || entry2["version"] != core.rewriteVersion) {
        let lock = await core.acquireCacheLockAsync(path);
        if (lock == "") {
            await rewriteAndCacheAsync(rel, relid, srcFile, contentType, res, rewrite);
            return;
        }

        let info = await appContainer.getBlobToTextAsync(relid + "/" + srcFile);
        if (info.succeded()) {
            let text = await rewrite(info.text());
            await cacheRewritten.updateAsync(path, async (entry: JsonBuilder) => {
                entry["version"] = core.rewriteVersion;
                entry["text"] = text;
            });
            res.sendText(text, contentType);
        }
        else {
            res.sendError(404, "missing file");
        }
        await core.releaseCacheLockAsync(lock);
    }
    else {
        res.sendText(entry2["text"], contentType);
    }
    logger.measure("ServeApp@" + srcFile, logger.contextDuration());
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


async function rewriteAndCachePointerAsync(id: string, res: restify.Response, rewrite:td.Action1<JsonBuilder>) : Promise<void>
{
    let path = "ptrcache/" + core.myChannel + "/" + id;
    let entry2 = await cacheRewritten.getAsync(path);
    let ver = await getCloudRelidAsync(true);

    let event = "ServePtr";
    let cat = "other";
    if (id == "ptr-home") {
        cat = "home";
    }
    else if (td.startsWith(id, "ptr-preview-")) {
        cat = "preview";
    }
    if (entry2 == null || entry2["version"] != ver || orZero(entry2["expiration"]) > 0 && entry2["expiration"] < await core.nowSecondsAsync()) {
        let lock = await core.acquireCacheLockAsync(path);
        if (lock == "") {
            await rewriteAndCachePointerAsync(id, res, rewrite);
            return;
        }

        await cacheCloudCompilerDataAsync(ver);

        let jsb = {};
        jsb["contentType"] = "text/html";
        jsb["version"] = ver;
        jsb["expiration"] = await core.nowSecondsAsync() + td.randomRange(2000, 3600);
        jsb["status"] = 200;
        await rewrite(jsb);
        entry2 = clone(jsb);

        if (jsb["version"] == ver) {
            await cacheRewritten.updateAsync(path, async (entry: JsonBuilder) => {
                core.copyJson(entry2, entry);
            });
        }
        await core.releaseCacheLockAsync(lock);
        event = "ServePtrFirst";
    }

    if (res.finished()) {
        return;
    }
    let redir = orEmpty(entry2["redirect"]);
    if (redir == "") {
        let status0 = orZero(entry2["status"]);
        if (status0 == 0) {
            status0 = 200;
        }
        if (false) {
            res.setHeader("X-TDlite-cache", event);
        }
        res.sendText(entry2["text"], entry2["contentType"], {
            status: status0
        });
        if (orFalse(entry2["error"])) {
            cat = "error";
        }
        logger.debug("serve ptr2: " + event + " " + cat + " " + path);
        logger.measure(event + "@" + cat, logger.contextDuration());
    }
    else {
        res.redirect(302, redir);
    }
}

async function servePointerAsync(req: restify.Request, res: restify.Response) : Promise<void>
{
    let lang = await handleLanguageAsync(req, res, true);
    let fn = req.url().replace(/\?.*/g, "").replace(/^\//g, "").replace(/\/$/g, "").toLowerCase();
    if (fn == "") {
        fn = "home";
    }
    let id = core.pathToPtr(fn);
    let pathLang = orEmpty((/@([a-z][a-z])$/.exec(id) || [])[1]);
    if (pathLang != "") {
        if (pathLang == core.serviceSettings.defaultLang) {
            id = id.replace(/@..$/g, "");
            lang = "";
        }
        else {
            lang = "@" + pathLang;
        }
    }
    if (templateSuffix != "" && core.serviceSettings.envrewrite.hasOwnProperty(id.replace(/^ptr-/g, ""))) {
        id = id + templateSuffix;
    }
    id = id + lang;

    await rewriteAndCachePointerAsync(id, res, async (v: JsonBuilder) => {
        let pubdata = {};        
        let msg = "";
        v["redirect"] = "";
        v["text"] = "";
        v["error"] = false;
        pubdata["webpath"] = fn;
        pubdata["ptrid"] = id;
        let existing = await core.getPubAsync(id, "pointer");
        if (existing == null && /@[a-z][a-z]$/.test(id)) {
            existing = await core.getPubAsync(id.replace(/@..$/g, ""), "pointer");
        }
        if (existing == null) {
            if (false && td.startsWith(fn, "docs/")) {
                let docid = fn.replace(/^docs\//g, "");
                let doctopic = doctopicsByTopicid[docid];
                if (doctopic != null) {
                    pubdata = clone(doctopic);
                    let html = topicList(doctopic, "", "");
                    pubdata["topiclist"] = html;
                    let resp = await tdliteScripts.queryCloudCompilerAsync(fn);
                    if (resp != null) {
                        pubdata["body"] = resp["prettyDocs"];
                    }
                    else {
                        msg = "Rendering docs failed";
                    }
                }
                else {
                    msg = "No such doctopic";
                }
            }
            else if (td.startsWith(fn, "u/")) {
                v["redirect"] = fn.replace(/^u\//g, "/usercontent/");
                return;
            }
            else if (td.startsWith(fn, "preview/")) {
                let docid1 = fn.replace(/^preview\//g, "");
                await renderScriptAsync(docid1, v, pubdata);
                msg = pubdata["msg"];
                if (pubdata["done"]) {
                    return;
                }
            }
            else if (/^[a-z]+$/.test(fn)) {
                let entry = await core.pubsContainer.getAsync(fn);
                if (entry == null || withDefault(entry["kind"], "reserved") == "reserved") {
                    msg = "No such publication";
                }
                else {
                    v["redirect"] = "/app/#pub:" + entry["id"];
                    return;
                }
            }
            else {
                msg = "No such pointer";
            }
        }
        else {
            let ptr = PubPointer.createFromJson(existing["pub"]);
            if (! ptr.redirect) {
                if (! ptr.artid) {
                    let scriptid = ptr.scriptid;
                    await renderScriptAsync(ptr.scriptid, v, pubdata);
                    msg = pubdata["msg"];
                    if (pubdata["done"]) {
                        return;
                    }
                    let path = ptr.parentpath;
                    let breadcrumb = ptr.breadcrumbtitle;
                    let sep = "&nbsp;&nbsp;»&nbsp; ";
                    for (let i = 0; i < 5; i++) {
                        let parJson = await core.getPubAsync(core.pathToPtr(path), "pointer");
                        if (parJson == null) {
                            break;
                        }
                        let parptr = PubPointer.createFromJson(parJson["pub"]);
                        breadcrumb = "<a href=\"" + core.htmlQuote("/" + parptr.path) + "\">" + parptr.breadcrumbtitle + "</a>" + sep + breadcrumb;
                        path = parptr.parentpath;
                    }
                    breadcrumb = "<a href=\"/home\">Home</a>" + sep + breadcrumb;
                    pubdata["breadcrumb"] = breadcrumb;
                }
                else {
                    let cont = orEmpty(ptr.artcontainer);
                    cont = "";
                    if (!tdliteArt.hasThumbContainer(cont)) {
                        cont = "pub";
                    }
                    v["redirect"] = core.currClientConfig.primaryCdnUrl + "/" + cont + "/" + ptr.artid;
                    return;
                }
            }
            else {
                v["redirect"] = ptr.redirect;
                return;
            }
        }

        pubdata["css"] = doctopicsCss;
        pubdata["rootUrl"] = core.currClientConfig.rootUrl;
        if (msg != "") {
            pubdata["templatename"] = "templates/official-s";
        }
        let templText = await getTemplateTextAsync(pubdata["templatename"] + templateSuffix, lang);
        if (msg == "" && templText.length < 100) {
            msg = templText;
        }
        if (templText.length < 100) {
            v["text"] = msg;
            v["version"] = "no-cache";
        }
        else {
            if (msg != "") {
                if (false) {
                    v["version"] = "no-cache";
                }
                v["expiration"] = await core.nowSecondsAsync() + 5 * 60;
                if (td.startsWith(msg, "No such ")) {
                    pubdata["name"] = "Sorry, the page you were looking for doesn’t exist";
                    v["status"] = 404;
                }
                else {
                    pubdata["name"] = "Whoops, something went wrong.";
                    v["status"] = 500;
                }
                pubdata["body"] = core.htmlQuote("Error message: " + msg);
                v["error"] = true;
                let text = await simplePointerCacheAsync("error-template", lang);
                if (text.length > 100) {
                    templText = text;
                }
            }
            console.log(pubdata)
            v["text"] = await tdliteDocs.formatAsync(templText, pubdata);
        }
    });
}

async function _initLoginAsync() : Promise<void>
{
    let jsb = {};
    let template_html = tdliteHtml.template_html
    jsb["activate"] = td.replaceAll(template_html, "@BODY@", tdliteHtml.activate_html);
    jsb["kidcode"] = td.replaceAll(template_html, "@BODY@", tdliteHtml.enterCode_html);
    jsb["kidornot"] = td.replaceAll(template_html, "@BODY@", tdliteHtml.kidOrNot_html);
    jsb["newuser"] = td.replaceAll(template_html, "@BODY@", tdliteHtml.newuser_html);
    jsb["newadult"] = td.replaceAll(template_html, "@BODY@", tdliteHtml.newadult_html);
    jsb["agree"] = td.replaceAll(template_html, "@BODY@", tdliteHtml.agree_html);
    jsb["usercreated"] = td.replaceAll(template_html, "@BODY@", tdliteHtml.user_created_html);
    jsb["providers"] = "";
    loginHtml = clone(jsb);

    serverAuth.init({
        makeJwt: async (profile: serverAuth.UserInfo, oauthReq: serverAuth.OauthRequest) => {            
            let url2 = await loginFederatedAsync(profile, oauthReq);
            let stripped = stripCookie(url2);
            let jsb2 = ({ "headers": {} });
            if (stripped.cookie) {
                jsb2["headers"]["Set-Cookie"] = stripped.cookie;
            }
            jsb2["http redirect"] = stripped.url;
            return jsb2;            
        },
        getData: async (key: string) => {
            let value: string;
            value = await core.redisClient.getAsync("authsess:" + key);
            return value;
        },
        setData: async (key1: string, value1: string) => {
            let minutes = 30;
            await core.redisClient.setpxAsync("authsess:" + key1, value1, minutes * 60 * 1000);
        },
        federationMaster: orEmpty(td.serverSetting("AUTH_FEDERATION_MASTER", true)),
        federationTargets: orEmpty(td.serverSetting("AUTH_FEDERATION_TARGETS", true)),
        self: td.serverSetting("SELF", false).replace(/\/$/g, ""),
        requestEmail: true,
        redirectOnError: "/#loginerror"
    });
    if (core.hasSetting("AZURE_AD_CLIENT_SECRET")) {
        serverAuth.addAzureAd();
    }
    if (core.hasSetting("LIVE_CLIENT_SECRET")) {
        serverAuth.addLiveId();
    }
    if (core.hasSetting("GOOGLE_CLIENT_SECRET")) {
        serverAuth.addGoogle();
    }
    if (core.hasSetting("FACEBOOK_CLIENT_SECRET")) {
        serverAuth.addFacebook();
    }
    restify.server().get("/user/logout", async (req: restify.Request, res: restify.Response) => {
        res.redirect(302, "/signout");
    });
    restify.server().get("/oauth/providers", async (req1: restify.Request, res1: restify.Response) => {
        serverAuth.validateOauthParameters(req1, res1);
        core.handleBasicAuth(req1, res1);
        if ( ! res1.finished()) {
            let links = serverAuth.providerLinks(req1.query());
            let lang2 = await handleLanguageAsync(req1, res1, true);
            let html = await getLoginHtmlAsync("providers", lang2);
            for (let k of Object.keys(links)) {
                html = td.replaceAll(html, "@" + k + "-url@", links[k]);
            }
            res1.html(html);
        }
    });
    restify.server().get("/oauth/dialog", async (req: restify.Request, res: restify.Response) => {
        let sessionString = orEmpty(await serverAuth.options().getData(orEmpty(req.query()["td_session"])));
        let session = new LoginSession();
        session.state = cachedStore.freshShortId(16);
        logger.debug("session string: " + sessionString);
        if (sessionString != "") {
            session = LoginSession.createFromJson(JSON.parse(sessionString));
        }
        if (session.userid == "") {
            serverAuth.validateOauthParameters(req, res);
        }
        core.handleBasicAuth(req, res);
        await loginCreateUserAsync(req, session, res);
        if ( ! res.finished()) {
            let accessCode = orEmpty(req.query()["td_state"]);
            if (accessCode == "teacher") {
                let query = req.url().replace(/^[^\?]*/g, "");
                let url = req.serverUrl() + "/oauth/providers" + query;
                res.redirect(303, url);
            }
            else if (accessCode == core.tokenSecret && session.userid != "") {
                // **this is to be used during initial setup of a new cloud deployment**
                await core.pubsContainer.updateAsync(session.userid, async (entry: JsonBuilder) => {
                    core.jsonAdd(entry, "credit", 1000);
                    core.jsonAdd(entry, "totalcredit", 1000);
                    entry["permissions"] = ",admin,";
                });
                accessTokenRedirect(res, session.redirectUri);
            }
            else {
                await loginHandleCodeAsync(accessCode, res, req, session);
            }
        }
    });
    restify.server().get("/oauth/gettoken", async (req3: restify.Request, res3: restify.Response) => {
        let s3 = req3.serverUrl() + "/oauth/login?state=foobar&response_type=token&client_id=no-cookie&redirect_uri=" + encodeURIComponent(req3.serverUrl() + "/oauth/gettokencallback") + "&u=" + encodeURIComponent(orEmpty(req3.query()["u"]));
        res3.redirect(303, s3);
    });
    restify.server().get("/oauth/gettokencallback", async (req4: restify.Request, res4: restify.Response) => {
        let _new = "<p>Your access token is below. Only paste in applications you absolutely trust.</p>\n<pre id=\"token\">\nloading...\n</pre>\n<p>You could have added <code>?u=xyzw</code> to get access token for a different user (given the right permissions).\n</p>\n<script>\nsetTimeout(function() {\nvar h = document.location.href.replace(/oauth\\/gettoken.*access_token/, \"?access_token\").replace(/&.*/, \"\");\ndocument.getElementById(\"token\").textContent = h;\n}, 100)\n</script>";
        res4.html(td.replaceAll(td.replaceAll(template_html, "@JS@", ""), "@BODY@", _new));
    });
    if (false) {
        core.addRoute("GET", "*user", "rawtoken", async (req5: core.ApiRequest) => {
            if (req5.userinfo.token.cookie != "") {
                // Only cookie-less (service) tokens allowed here.
                req5.status = httpCode._418ImATeapot;
            }
            core.checkPermission(req5, "root");
            if (req5.status == 200) {
                let tok = await tdliteUsers.generateTokenAsync(req5.rootId, "admin", "no-cookie");
                assert(tok.cookie == "", "no cookie expected");
                await audit.logAsync(req5, "rawtoken", {
                    data: core.sha256(tok.url).substr(0, 10)
                });
                req5.response = (core.self + "?access_token=" + tok.url);
            }
        });
    }
}





async function getRedirectUrlAsync(user2: string, req: restify.Request) : Promise<string>
{
    let url: string;
    let jsb = {};
    let tok = await tdliteUsers.generateTokenAsync(user2, "code", req.query()["client_id"]);
    jsb["access_token"] = tok.url;
    jsb["state"] = req.query()["state"];
    jsb["id"] = user2;
    if (tok.cookie != "") {
        jsb["td_cookie"] = tok.cookie;
    }
    url = req.query()["redirect_uri"] + "#" + serverAuth.toQueryString(clone(jsb));
    return url;
}


async function loginFederatedAsync(profile: serverAuth.UserInfo, oauthReq: serverAuth.OauthRequest) : Promise<string>
{
    let url: string;
    let coll = (/([^:]*):(.*)/.exec(profile.id) || []);
    let provider = coll[1];
    let providerUserId = coll[2];
    let profileId = "id/" + provider + "/" + core.encryptId(providerUserId, "SOCIAL0");
    logger.debug("profileid: " + profile.id + " enc " + profileId);
    let modernId = profileId;
    let entry2 = await tdliteUsers.passcodesContainer.getAsync(profileId);
    // ## Legacy profiles
    if (false) {
        if (entry2 == null) {
            let legacyId = "id/" + provider + "/" + core.sha256(providerUserId);
            let entry = await tdliteUsers.passcodesContainer.getAsync(legacyId);
            if (core.isGoodPub(entry, "userpointer") && await core.getPubAsync(entry["userid"], "user") != null) {
                entry2 = entry;
                profileId = legacyId;
            }
        }
        if (entry2 == null) {
            let legacyId1 = "id/" + provider + "/" + td.replaceAll(providerUserId, ":", "/");
            let entry1 = await tdliteUsers.passcodesContainer.getAsync(legacyId1);
            if (core.isGoodPub(entry1, "userpointer") && await core.getPubAsync(entry1["userid"], "user") != null) {
                entry2 = entry1;
                profileId = legacyId1;
            }
        }
        // If we have a legacy pointer, update it
        if (modernId != profileId && entry2 != null) {
            await tdliteUsers.passcodesContainer.updateAsync(modernId, async (entry3: JsonBuilder) => {
                td.jsonCopyFrom(entry3, entry2);
            });
        }
    }

    let jsb = (<JsonBuilder>null);
    if (core.isGoodPub(entry2, "userpointer")) {
        let entry31 = await core.getPubAsync(entry2["userid"], "user");
        if (entry31 != null) {
            jsb = clone(entry31);
            if (orEmpty(jsb["login"]) != profileId) {
                await core.pubsContainer.updateAsync(jsb["id"], async (entry4: JsonBuilder) => {
                    entry4["login"] = profileId;
                });
                jsb["login"] = profileId;
            }
        }
    }
    if (jsb == null) {
        let email = profile.email;
        let username = profile.name.replace(/\s.*/g, "");
        if (provider == "google") {
            // New Google accounts blocked for now.
            return "/";
        }
        logger.tick("PubUser@federated");
        jsb = await tdliteUsers.createNewUserAsync(username, email, profileId, "", profile.name, false);
    }
    else {
        logger.tick("Login@federated");
        let uidOverride = withDefault(oauthReq._client_oauth.u, jsb["id"]);
        if (uidOverride != jsb["id"]) {
            logger.info("login with override: " + jsb["id"] + "->" + uidOverride);
            if (core.hasPermission(clone(jsb), "signin-" + uidOverride)) {
                let entry41 = await core.getPubAsync(uidOverride, "user");
                if (entry41 != null) {
                    logger.debug("login with override OK: " + jsb["id"] + "->" + uidOverride);
                    jsb = clone(entry41);
                }
            }
        }
    }
    let user = jsb["id"];
    let tok = await tdliteUsers.generateTokenAsync(user, profileId, oauthReq._client_oauth.client_id);

    let redirectUrl = td.replaceAll(profile.redirectPrefix, "TOKEN", encodeURIComponent(tok.url)) + "&id=" + user;
    if (tok.cookie != "") {
        redirectUrl = redirectUrl + "&td_cookie=" + tok.cookie;
    }
    await core.refreshSettingsAsync();
    let session = new LoginSession();
    session.termsOk = orEmpty(jsb["termsversion"]) == core.serviceSettings.termsversion;
    session.codeOk = orEmpty(jsb["permissions"]) != "";
    if ( ! session.termsOk || ! session.codeOk) {
        session.state = cachedStore.freshShortId(16);
        session.userid = user;
        session.redirectUri = redirectUrl;
        await serverAuth.options().setData(session.state, JSON.stringify(session.toJson()));
        redirectUrl = "/oauth/dialog?td_session=" + encodeURIComponent(session.state);
    }
    return redirectUrl;
    return url;
}

async function loginCreateUserAsync(req: restify.Request, session: LoginSession, res: restify.Response) : Promise<void>
{
    let tdUsername = req.query()["td_username"];
    if ( ! res.finished() && session.groupid != "" && orEmpty(tdUsername) != "") {
        if (session.redirectUri == "") {
            let groupJson = await core.getPubAsync(session.groupid, "group");
            session.pass = session.passwords[orZero(req.query()["td_password"])];
            if (session.pass == null) {
                session.pass = session.passwords[0];
            }
            // this can go negative; maybe we should reject it in this case?
            await core.pubsContainer.updateAsync(session.ownerId, async (entry: JsonBuilder) => {
                core.jsonAdd(entry, "credit", -1);
            });
            logger.tick("PubUser@code");
            let jsb = await tdliteUsers.createNewUserAsync(tdUsername, "", core.normalizeAndHash(session.pass), ",student,", "", initialApprovals);
            let user2 = jsb["id"];

            await audit.logAsync(audit.buildAuditApiRequest(req), "user-create-code", {
                userid: session.ownerId,
                subjectid: user2,
                publicationid: session.groupid,
                publicationkind: "group",
                newvalue: clone(jsb)
            });
            if (initialApprovals) {
                await tdliteGroups.addGroupApprovalAsync(groupJson, clone(jsb));
            }
            else {
                await tdliteGroups.addUserToGroupAsync(user2, groupJson, (<core.ApiRequest>null));
            }
            session.redirectUri = await getRedirectUrlAsync(user2, req);
            await serverAuth.options().setData(session.state, JSON.stringify(session.toJson()));
        }
        let tok = stripCookie(session.redirectUri);
        if (tok.cookie != "") {
            res.setHeader("Set-Cookie", tok.cookie);
        }
        let lang = await handleLanguageAsync(req, res, false);
        let html = td.replaceAll(await getLoginHtmlAsync("usercreated", lang), "@URL@", tok.url);
        html = td.replaceAll(html, "@USERID@", session.userid);
        html = td.replaceAll(html, "@PASSWORD@", session.pass);
        html = td.replaceAll(html, "@NAME@", core.htmlQuote(tdUsername));
        core.setHtmlHeaders(res);
        res.html(html);
    }
}

async function loginHandleCodeAsync(accessCode: string, res: restify.Response, req: restify.Request, session: LoginSession) : Promise<void>
{
    let passId = core.normalizeAndHash(accessCode);
    let msg = "";
    if (passId == "" || accessCode == "kid") {
    }
    else {
        if (await core.throttleCoreAsync(core.sha256(req.remoteIp()) + ":code", 10)) {
            // TODO this should be some nice page
            res.sendError(httpCode._429TooManyRequests, "Too many login attempts");
            return;
        }
        let codeObj = await tdliteUsers.passcodesContainer.getAsync(passId);
        if (codeObj == null || codeObj["kind"] == "reserved") {
            msg = "Whoops! The code doesn't seem right. Keep trying!";
        }
        else {
            let kind = codeObj["kind"];
            if (kind == "userpointer") {
                let userJson = await core.getPubAsync(codeObj["userid"], "user");
                if (session.userid != "") {
                    msg = "We need an activation code here, not user password.";
                }
                else if (userJson == null) {
                    msg = "The user account doesn't exist anymore.";
                }
                else {
                    logger.tick("Login@code");
                    accessTokenRedirect(res, await getRedirectUrlAsync(userJson["id"], req));
                }
            }
            else if (kind == "activationcode") {
                if (session.userid == "") {
                    // The code shouldn't be entered here, let's save it for future.
                    let query = req.url().replace(/^[^\?]*/g, "");
                    let url = req.serverUrl() + "/oauth/dialog" + td.replaceAll(query, "&td_state=", "&validated_code=");
                    res.redirect(303, url);
                }
                else if (codeObj["credit"] <= 0) {
                    msg = "This code has already been used.";
                }
                else {
                    let userjson = await core.getPubAsync(session.userid, "user");
                    await tdliteUsers.applyCodeAsync(userjson, codeObj, passId, audit.buildAuditApiRequest(req));
                    accessTokenRedirect(res, session.redirectUri);
                }
            }
            else if (kind == "groupinvitation") {
                let groupJson = await core.getPubAsync(codeObj["groupid"], "group");
                if (session.userid != "") {
                    msg = "We need an activation code here, not group code.";
                }
                else if (groupJson == null) {
                    msg = "Group gone?";
                }
                else {
                    session.ownerId = groupJson["pub"]["userid"];
                    let groupOwner = await core.getPubAsync(session.ownerId, "user");
                    if (orZero(groupOwner["credit"]) <= 0) {
                        msg = "Group owner is out of activation credits.";
                    }
                    else {
                        session.groupid = groupJson["id"];
                        session.passwords = td.range(0, 10).map<string>(elt => wordPassword.generate());
                        await serverAuth.options().setData(session.state, JSON.stringify(session.toJson()));
                    }
                }
            }
            else {
                msg = "This code cannot be entered here. Sorry.";
            }
        }
    }

    if ( ! res.finished()) {
        await core.refreshSettingsAsync();
        let params = {};
        let inner = "kidornot";
        if (accessCode == "kid") {
            inner = "kidcode";
        }
        if (session.passwords != null) {
            let links = "";
            for (let i = 0; i < session.passwords.length; i++) {
                links = links + "<button type=\"button\" class=\"button provider\" href=\"#\" onclick=\"passwordok(" + i + ")\">" + session.passwords[i] + "</button><br/>\n";
            }
            let lang2 = await handleLanguageAsync(req, res, true);
            inner = td.replaceAll(td.replaceAll(await getLoginHtmlAsync("newuser", lang2), "@PASSWORDS@", links), "@SESSION@", session.state);
            core.setHtmlHeaders(res);
            res.html(td.replaceAll(inner, "@MSG@", msg));
            return;
        }
        else if (session.userid != "") {
            let termsversion = orEmpty(req.query()["td_agree"]);
            if (termsversion == "noway") {
                await serverAuth.options().setData(session.state, "{}");
                if (session.userid != "") {
                    let delEntry = await core.getPubAsync(session.userid, "user");
                    if (delEntry != null && ! delEntry["termsversion"] && ! delEntry["permissions"]) {
                        let delok = await core.deleteAsync(delEntry);
                        await core.pubsContainer.updateAsync(session.userid, async (entry: JsonBuilder) => {
                            entry["settings"] = {};
                            entry["pub"] = {};
                            entry["login"] = "";
                            entry["permissions"] = "";
                        });
                    }
                }
                res.redirect(302, "/");
                return;
            }
            if ( ! session.termsOk && termsversion == core.serviceSettings.termsversion) {
                session.termsOk = true;
                await serverAuth.options().setData(session.state, JSON.stringify(session.toJson()));
                if (termsversion != "") {
                    await core.pubsContainer.updateAsync(session.userid, async (entry1: JsonBuilder) => {
                        entry1["termsversion"] = termsversion;
                    });
                }
                await audit.logAsync(audit.buildAuditApiRequest(req), "user-agree", {
                    userid: session.userid,
                    subjectid: session.userid,
                    data: termsversion,
                    newvalue: await core.getPubAsync(session.userid, "user")
                });
            }
            let username = orEmpty(req.query()["td_username"]).slice(0, 25);
            if (!session.nickname && username) {
                session.nickname = username;
                await serverAuth.options().setData(session.state, JSON.stringify(session.toJson()));
                let lastx = {};                
                await core.pubsContainer.updateAsync(session.userid, async(entry1: JsonBuilder) => {
                    entry1["settings"].nickname = username;
                    entry1["pub"].name = username;                    
                    lastx = entry1;
                });                
                await search.scanAndSearchAsync(lastx);
            }
            if ( ! session.termsOk) {
                inner = "agree";
            }
            else if (!session.nickname && templateSuffix) {
                inner = "newadult";
                params["EXAMPLES"] = "";
                params["SESSION"] = session.state;
                let uentry = await core.getPubAsync(session.userid, "user");
                if (uentry) {
                    let nm = uentry["pub"].name
                    params["EXAMPLES"] = ["Ms" + nm, "Mr" + nm, nm + td.randomRange(10, 99)].join(", ");
                }
            }
            else if ( ! session.codeOk) {
                inner = "activate";
            }
            else {
                res.redirect(303, session.redirectUri);
            }
        }
        if ( ! res.finished()) {
            let agreeurl = "/oauth/dialog?td_session=" + encodeURIComponent(session.state) + "&td_agree=" + encodeURIComponent(core.serviceSettings.termsversion);
            let disagreeurl = "/oauth/dialog?td_session=" + encodeURIComponent(session.state) + "&td_agree=noway";
            let lang21 = await handleLanguageAsync(req, res, true);
            params["MSG"] = msg;
            params["AGREEURL"] = agreeurl;
            params["DISAGREEURL"] = disagreeurl;
            let ht = await getLoginHtmlAsync(inner, lang21)
            ht = ht.replace(/@([A-Z]+)@/g, (m, n) => params.hasOwnProperty(n) ? params[n] : m)
            res.html(ht);
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
        let delok3 = await deleteReviewAsync(delEntry);
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

            if (kind == "pointer") {
                await clearPtrCacheAsync(entryid);
            }

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






async function tryDeletePubPointerAsync(key: string) : Promise<boolean>
{
    let ref = false;
    await core.pubsContainer.updateAsync(key, async (entry: JsonBuilder) => {
        if (orEmpty(entry["kind"]) == "pubpointer") {
            entry["kind"] = "reserved";
            ref = true;
        }
        else {
            ref = false;
        }
    });
    return ref;
}

function crashAndBurn() : void
{
    assert(false, "/api/logcrash (OK)");
}

function _initBugs() : void
{
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


/**
 * TODO include access token for the compile service
 */
async function deployCompileServiceAsync(rel: PubRelease, req: core.ApiRequest) : Promise<void>
{
    let cfg = {};
    let clientConfig = clientConfigForRelease(rel);
    cfg["TDC_AUTH_KEY"] = td.serverSetting("TDC_AUTH_KEY", false);
    cfg["TDC_ACCESS_TOKEN"] = td.serverSetting("TDC_ACCESS_TOKEN", false);
    cfg["TDC_LITE_STORAGE"] = crashContainer.url().replace(/\/[^\/]+$/g, "");
    cfg["TDC_API_ENDPOINT"] = clientConfig.rootUrl + "/api/";
    cfg["TD_RELEASE_ID"] = rel.releaseid;
    cfg["TD_CLIENT_CONFIG"] = JSON.stringify(clientConfig.toJson());
    let jsSrc = "";
    for (let k of Object.keys(cfg)) {
        jsSrc = jsSrc + "process.env." + k + " = " + JSON.stringify(cfg[k]) + ";\n";
    }
    jsSrc = jsSrc + "require(\"./noderunner.js\");\n";
    let jsb = {
        "files": [ {
            "path": "script/compiled.js",
            "content": jsSrc
        }, {
            "path": "script/noderunner.js",
            "url": appContainer.url() + "/" + rel.releaseid + "/c/noderunner.js"
        }] 
    };
    let file = {};        
    if (false) {
        logger.debug("cloud JS: " + JSON.stringify(clone(jsb), null, 2));
    }

    let request = td.createRequest(td.serverSetting("TDC_ENDPOINT", false) + "deploy");
    request.setMethod("post");
    request.setContentAsJson(clone(jsb));
    let response = await request.sendAsync();
    logger.info("cloud deploy: " + response);

    let requestcfg = td.createRequest(td.serverSetting("TDC_ENDPOINT", false) + "setconfig");
    requestcfg.setMethod("post");
    requestcfg.setContentAsJson(({"AppSettings":
  [
     {"Name":"TD_RESTART_INTERVAL","Value":"900"}
  ]
}));
    let response2 = await requestcfg.sendAsync();
    logger.info("cloud deploy cfg: " + response2);

    // ### give it time to come up and reindex docs
    // TODO enable this back
    if (false) {
        await td.sleepAsync(60);
        await importDoctopicsAsync(req);
        // await tdliteIndex.indexDocsAsync();
        logger.info("docs reindexed");
    }
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

async function importRecAsync(resp: RecImportResponse, id: string) : Promise<void>
{
    resp.attempts += 1;
    let full = resp.fulluser;
    resp.fulluser = false;

    if (! id || resp.ids.hasOwnProperty(id)) {
    }
    else {
        resp.ids[id] = 0;
        let isThere = core.isGoodEntry(await core.pubsContainer.getAsync(id));
        if (isThere && ! resp.force && ! full) {
            resp.ids[id] = 409;
            resp.present += 1;
        }
        else {
            let tdapi = "https://www.touchdevelop.com/api/";
            let js = await td.downloadJsonAsync(tdapi + id);
            if (js == null) {
                resp.problems += 1;
            }
            else {
                let coll = []
                coll.push(/* async */ importRecAsync(resp, js["userid"]));
                let kind = js["kind"];
                if (kind == "script") {
                    let jsb = clone(js);
                    if (js["rootid"] != js["id"]) {
                        let js2 = await td.downloadJsonAsync(tdapi + id + "/base");
                        if (js2 != null) {
                            jsb["baseid"] = js2["id"];
                        }
                    }
                    await importRecAsync(resp, jsb["baseid"]);
                    let s = await td.downloadTextAsync(tdapi + id + "/text?original=true&ids=true");
                    jsb["text"] = withDefault(s, "no text");
                    js = clone(jsb);
                }

                if ( ! isThere) {
                    let apiRequest = await importOneAnythingAsync(js);
                    if (apiRequest.status == 200) {
                        resp.imported += 1;
                    }
                    else {
                        resp.problems += 1;
                    }
                }

                if (kind == "script") {
                    for (let js3 of js["librarydependencyids"]) {
                        coll.push(/* async */ importRecAsync(resp, td.toString(js3)));
                    }
                    for (let js31 of js["mergeids"]) {
                        coll.push(/* async */ importRecAsync(resp, td.toString(js31)));
                    }
                }

                coll.push(/* async */ importDepsAsync(resp, js, tdapi, id, "art"));
                coll.push(/* async */ importDepsAsync(resp, js, tdapi, id, "comments"));
                for (let task of coll) {
                    await task;
                }
                resp.ids[id] = 200;
                if (full && kind == "user") {
                    /* async */ importUserScriptsAsync(resp, tdapi, id);
                }
            }
        }
    }
}

async function importDepsAsync(resp: RecImportResponse, js: JsonObject, tdapi: string, id: string, kind: string) : Promise<void>
{
    if (orZero(js[kind]) > 0) {
        let js4 = await td.downloadJsonAsync(tdapi + id + "/" + kind + "?count=1000");
        await parallel.forJsonAsync(js4["items"], async (json: JsonObject) => {
            await importRecAsync(resp, json["id"]);
        });
    }
}

async function importUserScriptsAsync(resp: RecImportResponse, tdapi: string, id: string) : Promise<void>
{
    let keepGoing = true;
    let cont = "";
    while (keepGoing) {
        let js4 = await td.downloadJsonAsync(tdapi + id + "/scripts?applyupdates=true&count=50" + cont);
        await parallel.forJsonAsync(js4["items"], async (json: JsonObject) => {
            await importRecAsync(resp, json["id"]);
        });
        let r = orEmpty(js4["continuation"]);
        logger.info("import batch for " + id + " cont= " + r);
        if (r != "") {
            cont = "&continuation=" + r;
        }
        else {
            keepGoing = false;
        }
    }
}

async function importDoctopicsAsync(req: core.ApiRequest) : Promise<void>
{
    await cacheCloudCompilerDataAsync(await getCloudRelidAsync(true));
    let ids = asArray(doctopics).map<string>(elt => orEmpty(elt["scriptId"])).filter(elt1 => elt1 != "");
    let fetchResult = await tdliteScripts.scripts.fetchFromIdListAsync(ids, (<JsonObject>null));
    let jsb = {};
    for (let s of ids) {
        jsb[s] = true;
    }
    for (let js of fetchResult.items) {
        delete jsb[js["id"]];
    }

    let resp = new RecImportResponse();
    resp.ids = {};
    ids = Object.keys(jsb);
    await parallel.forAsync(ids.length, async (x: number) => {
        await importRecAsync(resp, ids[x]);
    });
    req.response = resp.toJson();
}

async function cacheCloudCompilerDataAsync(ver: string) : Promise<void>
{
    if (cloudRelid != ver) {
        let resp2 = /* async */ tdliteScripts.queryCloudCompilerAsync("css");
        doctopics = (await tdliteScripts.queryCloudCompilerAsync("doctopics"))["topicsExt"];
        let jsb = {};
        for (let js of asArray(doctopics)) {
            jsb[js["id"]] = js;
        }
        doctopicsByTopicid = clone(jsb);
        doctopicsCss = (await resp2)["css"];
        cloudRelid = ver;
    }
}

function clientConfigForRelease(prel: PubRelease) : core.ClientConfig
{
    let ccfg: core.ClientConfig;
    ccfg = core.ClientConfig.createFromJson(core.currClientConfig.toJson());
    ccfg.tdVersion = prel.version;
    ccfg.releaseid = prel.releaseid;
    ccfg.relid = prel.id;
    return ccfg;
}

function topicLink(doctopic: JsonObject) : string
{
    let s: string;
    s = "<a href='/docs/" + doctopic["id"] + "'>" + core.htmlQuote(doctopic["name"]) + "</a>";
    return s;
}

function topicList(doctopic: JsonObject, childId: string, childRepl: string) : string
{
    let html: string;
    html = "<li class='active'>" + topicLink(doctopic);
    let children = doctopic["childTopics"];
    if (children != null && children.length > 0) {
        html = html + "<ul class='nav'>";
        for (let js of children) {
            let id = td.toString(js);
            if (id == childId) {
                html = html + childRepl;
            }
            else {
                if (childId == "") {
                    html = html + "<li>";
                }
                else {
                    html = html + "<li class='hidden-xs'>";
                }
                html = html + topicLink(doctopicsByTopicid[id]) + "</li>\n";
            }
        }
        html = html + "</ul>";
    }
    html = html + "</li>\n";
    let r = orEmpty(doctopic["parentTopic"]);
    if (r != "") {
        html = topicList(doctopicsByTopicid[r], doctopic["id"], html);
    }
    return html;
}


async function _initPointersAsync() : Promise<void>
{
    // TODO cache compiler queries (with ex)
    pointers = await indexedStore.createStoreAsync(core.pubsContainer, "pointer");
    await core.setResolveAsync(pointers, async (fetchResult: indexedStore.FetchResult, apiRequest: core.ApiRequest) => {
        await core.addUsernameEtcAsync(fetchResult);
        let coll = (<PubPointer[]>[]);
        for (let jsb of fetchResult.items) {
            let ptr = PubPointer.createFromJson(jsb["pub"]);
            coll.push(ptr);
        }
        fetchResult.items = td.arrayToJson(coll);
    },
    {
        byUserid: true,
        anonSearch: true
    });
    core.addRoute("POST", "pointers", "", async (req: core.ApiRequest) => {
        await core.canPostAsync(req, "pointer");
        if (req.status == 200) {
            let body = req.body;
            let ptr1 = new PubPointer();
            ptr1.path = orEmpty(body["path"]).replace(/^\/+/g, "");
            ptr1.id = core.pathToPtr(ptr1.path);
            let matches = (/^usercontent\/([a-z]+)$/.exec(ptr1.path) || []);
            if (matches[1] == null) {
                if (td.startsWith(ptr1.path, "users/" + req.userid + "/")) {
                    core.checkPermission(req, "custom-ptr");
                }
                else {
                    core.checkPermission(req, "root-ptr");
                    if (req.status == 200 && ! hasPtrPermission(req, ptr1.id)) {
                        req.status = httpCode._402PaymentRequired;
                    }
                }
            }
            else {
                let entry2 = await core.getPubAsync(matches[1], "script");
                if (entry2 == null || entry2["pub"]["userid"] != req.userid) {
                    core.checkPermission(req, "root-ptr");
                }
            }
            if (req.status == 200 && ! /^[\w\/\-@]+$/.test(ptr1.path)) {
                req.status = httpCode._412PreconditionFailed;
            }
            if (req.status == 200) {
                let existing = await core.getPubAsync(ptr1.id, "pointer");
                if (existing != null) {
                    req.rootPub = existing;
                    req.rootId = existing["id"];
                    await updatePointerAsync(req);
                }
                else {
                    ptr1.userid = req.userid;
                    ptr1.userplatform = core.getUserPlatforms(req);
                    let jsb1 = {};
                    jsb1["id"] = ptr1.id;
                    jsb1["pub"] = ptr1.toJson();
                    await setPointerPropsAsync(jsb1, body);
                    await pointers.insertAsync(jsb1);
                    await notifications.storeAsync(req, jsb1, "");
                    await search.scanAndSearchAsync(jsb1);
                    await clearPtrCacheAsync(ptr1.id);
                    await audit.logAsync(req, "post-ptr", {
                        newvalue: clone(jsb1)
                    });
                    await core.returnOnePubAsync(pointers, clone(jsb1), req);
                }
            }
        }
    });
    core.addRoute("POST", "*pointer", "", async (req1: core.ApiRequest) => {
        await updatePointerAsync(req1);
    });
    tdliteDocs.init(async (v: JsonBuilder) => {
        let wp = orEmpty(v["webpath"]);
        if (wp != "") {
            let ptrId = core.pathToPtr(wp.replace(/^\//g, ""));
            v["ptrid"] = ptrId;
            let entry = await core.getPubAsync(ptrId, "pointer");
            if (entry != null) {
                let s = entry["pub"]["scriptid"];
                if (orEmpty(s) != "") {
                    v["id"] = s;
                }
            }
        }
        let pubObj = await core.getPubAsync(v["id"], "script");
        if (pubObj != null) {
            v["isvolatile"] = true;
            let jsb2 = await getCardInfoAsync(core.emptyRequest, pubObj);
            // use values from expansion only if there are not present in v
            td.jsonCopyFrom(jsb2, clone(v));
            td.jsonCopyFrom(v, clone(jsb2));
        }
        let promotag = orEmpty(v["promotag"]);
        if (promotag != "") {
            let apiReq = core.buildApiRequest("/api/promo-scripts/all?count=50");
            let entities = await core.fetchAndResolveAsync(tdliteScripts.scripts, apiReq, "promo", promotag);
            v["promo"] = entities.items;
        }
    });
    core.addRoute("POST", "admin", "reindexpointers", async (req2: core.ApiRequest) => {
        core.checkPermission(req2, "operator");
        if (req2.status == 200) {
            /* async */ pointers.getIndex("all").forAllBatchedAsync("all", 50, async (json: JsonObject) => {
                await parallel.forJsonAsync(json, async (json1: JsonObject) => {
                    let ref = {}
                    await pointers.container.updateAsync(json1["id"], async (entry1: JsonBuilder) => {
                        await setPointerPropsAsync(entry1, ({}));
                        ref = clone(entry1);
                    });
                    await audit.logAsync(req2, "reindex-ptr", {
                        oldvalue: json1,
                        newvalue: ref
                    });
                });
            });
            req2.response = ({});
        }
    });
}

async function setPointerPropsAsync(ptr: JsonBuilder, body: JsonObject) : Promise<void>
{
    let pub = ptr["pub"];
    let empty = new PubPointer().toJson();
    for (let k of Object.keys(empty)) {
        if ( ! pub.hasOwnProperty(k)) {
            pub[k] = empty[k];
        }
    }
    core.setFields(pub, body, ["description", "scriptid", "redirect", "artid", "artcontainer"]);
    pub["parentpath"] = "";
    pub["scriptname"] = "";
    pub["scriptdescription"] = "";
    let sid = await core.getPubAsync(pub["scriptid"], "script");
    if (sid == null) {
        pub["scriptid"] = "";
    }
    else {
        pub["scriptname"] = sid["pub"]["name"];
        pub["scriptdescription"] = sid["pub"]["description"];
        await core.pubsContainer.updateAsync(sid["id"], async (entry: JsonBuilder) => {
            entry["lastPointer"] = pub["id"];
        });
        let entry1 = await tdliteScripts.scriptText.getAsync(sid["id"]);
        let parentTopic = (<JsonObject>null);
        if (entry1 != null) {
            let coll = (/{parent[tT]opic:([\w\/@\-]+)}/.exec(orEmpty(entry1["text"])) || []);
            let r = orEmpty(coll[1]);
            if (r != "") {
                parentTopic = await core.getPubAsync(core.pathToPtr(r), "pointer");
            }
            coll = (/{bread[Cc]rumb[tT]itle:([^{}]+)}/.exec(orEmpty(entry1["text"])) || []);
            pub["breadcrumbtitle"] = withDefault(coll[1], pub["scriptname"]);
        }
        if (parentTopic == null) {
            let currid = pub["path"];
            for (let i = 0; i < 5; i++) {
                currid = currid.replace(/[^\/]*$/g, "").replace(/\/$/g, "");
                if (currid == "") {
                    break;
                }
                parentTopic = await core.getPubAsync(core.pathToPtr(currid), "pointer");
                if (parentTopic != null) {
                    break;
                }
            }
        }
        if (parentTopic != null) {
            let parentRedir = orEmpty(parentTopic["pub"]["redirect"]);
            if (parentRedir != "") {
                parentTopic = await core.getPubAsync(core.pathToPtr(parentRedir), "pointer");
            }
        }
        if (parentTopic != null) {
            pub["parentpath"] = parentTopic["pub"]["path"];
        }
    }
    sid = await core.getPubAsync(pub["artid"], "art");
    if (sid == null) {
        pub["artid"] = "";
    }
    let s = orEmpty(pub["redirect"]);
    if ( ! /^\/[a-zA-Z0-9\/\-@]+$/.test(s)) {
        pub["redirect"] = "";
    }
}

async function updatePointerAsync(req: core.ApiRequest) : Promise<void>
{
    if (req.userid == req.rootPub["pub"]["userid"]) {
    }
    else {
        core.checkPermission(req, "root-ptr");
        if (req.status == 200 && ! hasPtrPermission(req, req.rootId)) {
            req.status = httpCode._402PaymentRequired;
        }
    }
    if (req.status == 200) {
        let bld = await search.updateAndUpsertAsync(core.pubsContainer, req, async (entry: JsonBuilder) => {
            await setPointerPropsAsync(entry, req.body);
        });
        await audit.logAsync(req, "update-ptr", {
            oldvalue: req.rootPub,
            newvalue: clone(bld)
        });
        await clearPtrCacheAsync(req.rootId);
        await core.returnOnePubAsync(pointers, clone(bld), req);
    }
}

async function pokeReleaseAsync(relLabel: string, delay: number) : Promise<void>
{
    await td.sleepAsync(delay);
    await core.settingsContainer.updateAsync("releases", async (entry: JsonBuilder) => {
        let jsb = entry["ids"][relLabel];
        jsb["numpokes"] = jsb["numpokes"] + 1;
    });
}

export async function getCloudRelidAsync(includeVer: boolean) : Promise<string>
{
    let ver: string;
    let entry = await core.settingsContainer.getAsync("releases");
    let js = entry["ids"]["cloud"];
    ver = js["relid"];
    if (includeVer) {
        ver = ver + "." + core.rewriteVersion + "." + js["numpokes"];
    }
    return ver;
}


async function getTemplateTextAsync(templatename: string, lang: string) : Promise<string>
{
    let r: string;
    let id = core.pathToPtr(templatename.replace(/:.*/g, ""));
    let entry3 = (<JsonObject>null);
    if (entry3 == null) {
        entry3 = await core.getPubAsync(id + lang, "pointer");
    }
    if (entry3 == null && lang != "") {
        entry3 = await core.getPubAsync(id, "pointer");
    }
    if (entry3 == null) {
        return "Template pointer leads to nowhere";
    }
    else {
        let templid = entry3["pub"]["scriptid"];
        let scriptjs = await core.getPubAsync(templid, "script");
        if (scriptjs == null) {
            return "Template script missing";
        }
        else if (orEmpty(scriptjs["pub"]["raw"]) == "html") {
            let textObj = await tdliteScripts.scriptText.getAsync(scriptjs["id"]);
            if (textObj == null) {
                return "Script text not found.";
            }
            else {
                return textObj["text"];
            }
        }
        else {
            return "Template has to be raw html";
            if (false) {
                let resp3 = await tdliteScripts.queryCloudCompilerAsync("q/" + scriptjs["id"] + "/string-art");
                if (resp3 == null) {
                    return "Extracting strings from template failed";
                }
                else {
                    let arts1 = asArray(resp3);
                    let artid = templatename.replace(/^[^:]*:?/g, "");
                    if (artid != "") {
                        arts1 = arts1.filter(elt => elt["name"] == artid);
                    }
                    if (arts1.length == 0) {
                        return "No art matching template name (if any)";
                    }
                    else {
                        return arts1[0]["value"];
                    }
                }
            }
        }
    }
    return r;
}

async function clearPtrCacheAsync(id: string) : Promise<void>
{
    if (false) {
        await cacheRewritten.updateAsync("ptrcache/" + id, async (entry: JsonBuilder) => {
            entry["version"] = "outdated";
        });
    }
    for (let chname of deployChannels) {
        await cacheRewritten.updateAsync("ptrcache/" + chname + "/" + id, async (entry1: JsonBuilder) => {
            entry1["version"] = "outdated";
        });
        if ( ! /@\w+$/.test(id)) {
            await core.refreshSettingsAsync();
            for (let lang of Object.keys(core.serviceSettings.langs)) {
                await cacheRewritten.updateAsync("ptrcache/" + chname + "/" + id + "@" + lang, async (entry2: JsonBuilder) => {
                    entry2["version"] = "outdated";
                });
            }
        }
    }
    if (td.startsWith(id, "ptr-templates-")) {
        await pokeReleaseAsync("cloud", 0);
    }
}

export function fixupTDHtml(html: string): string
{
    html = html
        .replace(/^<h1>[^<>]+<\/h1>/g, "")
        .replace(/<h2>/g, "<h2 class=\"beta\">")
        .replace(/(<a class="[^"<>]*" href=")\//g, (f, p) => p + core.self)
        .replace(/<h3>/g, "<h3 class=\"gamma\">");
    return html; 
}

async function renderScriptAsync(scriptid: string, v: JsonBuilder, pubdata: JsonBuilder) : Promise<void>
{
    pubdata["done"] = false;
    pubdata["templatename"] = "";
    pubdata["msg"] = "";
    
    let scriptjs = await core.getPubAsync(scriptid, "script");
    if (scriptjs != null) {
        let editor = orEmpty(scriptjs["pub"]["editor"]);
        let raw = orEmpty(scriptjs["pub"]["raw"]);

        if (raw == "html") {
            let entry = await tdliteScripts.scriptText.getAsync(scriptjs["id"]);
            v["text"] = entry["text"];
            pubdata["done"] = true;
        }
        else if (editor == "") {
            td.jsonCopyFrom(pubdata, scriptjs["pub"]);
            pubdata["scriptId"] = scriptjs["id"];
            let userid = scriptjs["pub"]["userid"];
            let userjs = await core.getPubAsync(userid, "user");
            let username = "User " + userid;
            let allowlinks = "";
            if (core.hasPermission(userjs, "external-links")) {
                allowlinks = "-official";
            }
            let resp2 = await tdliteScripts.queryCloudCompilerAsync("q/" + scriptjs["id"] + "/raw-docs" + allowlinks);
            if (resp2 != null) {
                let official = core.hasPermission(userjs, "root-ptr");
                if (userjs != null) {
                    username = withDefault(userjs["pub"]["name"], username);
                }
                pubdata["username"] = username;
                pubdata["userid"] = userid;
                pubdata["body"] = fixupTDHtml(resp2["body"]);
                let desc = pubdata["description"];
                pubdata["hashdescription"] = desc;
                pubdata["description"] = desc.replace(/#\w+/g, "");
                pubdata["doctype"] = "Documentation";
                pubdata["time"] = scriptjs["pub"]["time"];
                let doctype = withDefault((/ptr-([a-z]+)-/.exec(pubdata["ptrid"]) || [])[1], "");
                if ( ! official && ! /^(users|usercontent|preview|)$/.test(doctype)) {
                    official = true;
                }
                await core.refreshSettingsAsync();
                let pathConfig = core.serviceSettings.paths[doctype];
                if (pathConfig != null) {
                    td.jsonCopyFrom(pubdata, pathConfig);
                }
                if (official) {
                    let s = orEmpty((/#(page\w*)/.exec(desc) || [])[1]).toLowerCase();
                    if (s == "") {
                        pubdata["templatename"] = "templates/official-s";
                    }
                    else {
                        pubdata["templatename"] = "templates/" + s + "-s";
                    }
                }
                else {
                    pubdata["templatename"] = "templates/users-s";
                }
            }
            else {
                pubdata["msg"] = "Rendering failed";
            }
        }
        else {
            pubdata["msg"] = "Unsupported doc script editor";
        }
    }
    else {
        pubdata["msg"] = "Pointed script not found";
    }        
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

    await deleteAllByUserAsync(comments, req8.rootId, req8);
    await deleteAllByUserAsync(pointers, req8.rootId, req8);
    await deleteAllByUserAsync(reviews, req8.rootId, req8);

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

async function deleteReviewAsync(js: JsonObject) : Promise<boolean>
{
    let delok2: boolean;
    let pubid = orEmpty(js["pubid"]);
    assert(pubid != "", "");
    let ok2 = await tryDeletePubPointerAsync(js["ptrid"]);
    if (ok2) {
        let delok = await core.deleteAsync(js);
        if (delok) {
            await core.pubsContainer.updateAsync(pubid, async (entry: JsonBuilder) => {
                core.increment(entry, "positivereviews", -1);
            });
            await core.pubsContainer.updateAsync(js["pub"]["publicationuserid"], async (entry1: JsonBuilder) => {
                core.increment(entry1, "receivedpositivereviews", -1);
            });
            return true;
        }
    }
    return false;
    return delok2;
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


async function simplePointerCacheAsync(urlPath: string, lang: string) : Promise<string>
{
    let text: string;
    let versionMarker = "simple3";
    urlPath = urlPath + templateSuffix;
    let id = core.pathToPtr(urlPath);
    let path = "ptrcache/" + core.myChannel + "/" + id + lang;
    let entry2 = await cacheRewritten.getAsync(path);
    if (entry2 == null || orEmpty(entry2["version"]) != versionMarker) {
        let jsb2 = {};
        jsb2["version"] = versionMarker;
        let r = await getTemplateTextAsync(urlPath, lang);
        jsb2["text"] = orEmpty(r);
        entry2 = clone(jsb2);
        await cacheRewritten.updateAsync(path, async (entry: JsonBuilder) => {
            core.copyJson(entry2, entry);
        });
    }
    return orEmpty(entry2["text"]);
    return text;
}

async function getLoginHtmlAsync(inner: string, lang: string) : Promise<string>
{
    let text2: string;
    let text = await simplePointerCacheAsync("signin/" + inner, lang);
    if (text.length < 100) {
        text = loginHtml[inner];
    }
    text = td.replaceAll(text, "@JS@", tdliteHtml.login_js);
    return text;
    return text2;
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


export async function getCardInfoAsync(req: core.ApiRequest, pubJson: JsonObject) : Promise<JsonBuilder>
{
    let jsb2: JsonBuilder;
    let js3 = await core.resolveOnePubAsync(tdliteScripts.scripts, pubJson, req);
    if (js3 == null) {
        return {};
    }
    let scr = tdliteScripts.PubScript.createFromJson(js3);
    let jsb = clone(js3);
    jsb["description"] = scr.description.replace(/#docs/g, "");
    let vimeo = scr.meta["vimeo"];
    if (vimeo != null) {
        // TODO use thumbnail cache
        let js2 = await td.downloadJsonAsync("https://vimeo.com/api/oembed.json?url=https%3A//vimeo.com/" + vimeo);
        jsb["vimeo"] = vimeo;
        jsb["fullpicture"] = js2["thumbnail_url"];
        jsb["thumbnail"] = js2["thumbnail_url"].replace(/_\d+\./g, "_512.");
        if (false) {
            let s2 = td.replaceAll("<iframe src=\"https://player.vimeo.com/video/{vimeo}\" width=\"500\" height=\"281\" frameborder=\"0\" webkitallowfullscreen mozallowfullscreen allowfullscreen></iframe>", "{vimeo}", vimeo);
        }
    }
    let artid = orEmpty(scr.meta["art"]);
    if (artid != "") {
        jsb["fullpicture"] = core.currClientConfig.primaryCdnUrl + "/pub/" + artid;
        jsb["thumbnail"] = core.currClientConfig.primaryCdnUrl + "/thumb1/" + artid;
    }
    if (scr.editor == "blockly") {
        td.jsonCopyFrom(jsb, ({ 
  "editorname": "Block Editor", 
  "editor": "blocks",
  "editorhtml": "Microsoft Block Editor"
}));
    }
    else {
        td.jsonCopyFrom(jsb, ({ 
  "editorname": "Touch Develop", 
  "editor": "touchdevelop",
  "editorhtml": "Microsoft Touch Develop"
}));
    }
    jsb["timems"] = scr.time * 1000;
    jsb["realid"] = scr.id;
    jsb["humantime"] = tdliteDocs.humanTime(new Date(jsb["timems"]))
    return jsb;
    return jsb2;
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


function accessTokenRedirect(res: restify.Response, url2: string) : void
{
    let tok = stripCookie(url2);
    if (tok.cookie != "") {
        res.setHeader("Set-Cookie", tok.cookie);
    }
    res.redirect(303, tok.url);
}

function stripCookie(url2: string) : tdliteUsers.IRedirectAndCookie
{
    let cook: string;
    let coll = (/&td_cookie=([\w.]+)$/.exec(url2) || []);
    let cookie = coll[1];
    cook = "";
    if (cookie != null) {
        url2 = url2.substr(0, url2.length - coll[0].length);
        cook = tdliteUsers.wrapAccessTokenCookie(cookie);
    }
    return {
        url: url2,
        cookie: cook
    }
}

async function handleEmailVerificationAsync(req: restify.Request, res: restify.Response) : Promise<void>
{
    let coll = (/^\/verify\/([a-z]+)\/([a-z]+)/.exec(req.url()) || []);
    let userJs = await core.getPubAsync(coll[1], "user");
    let msg = "";
    if (userJs == null) {
        msg = "Cannot verify email - no such user.";
    }
    else if (orEmpty(userJs["emailcode"]) != coll[2]) {
        msg = "Cannot verify email - invalid or expired code.";
    }
    else {
        msg = "Thank you, your email was updated.";
        await core.pubsContainer.updateAsync(userJs["id"], async (entry: JsonBuilder) => {
            let jsb = entry["settings"];
            jsb["emailverified"] = true;
            jsb["previousemail"] = "";
            entry["emailcode"] = "";
        });
    }
    res.sendText(msg, "text/plain");
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

async function handleLanguageAsync(req: restify.Request, res: restify.Response, setCookie: boolean) : Promise<string>
{
    let lang2: string;
    await core.refreshSettingsAsync();
    let lang = core.serviceSettings.defaultLang;
    for (let s of orEmpty(req.header("Accept-Language")).split(",")) {
        let headerLang = orEmpty((/^\s*([a-z][a-z])/.exec(s) || [])[1]);
        if (core.serviceSettings.langs.hasOwnProperty(headerLang)) {
            lang = headerLang;
            break;
        }
    }
    let cookieLang = orEmpty((/TD_LANG=([a-z][a-z])/.exec(orEmpty(req.header("Cookie"))) || [])[1]);
    if (core.serviceSettings.langs.hasOwnProperty(cookieLang)) {
        lang = cookieLang;
    }
    else {
        // Cookie conflicts with access token cookie
        if (false) {
            if (setCookie) {
                let value = "TD_LANG=" + lang + "; Secure; Path=/; " + "Domain=" + core.self.replace(/\/$/g, "").replace(/.*\//g, "") + "; Expires=Fri, 31 Dec 9999 23:59:59 GMT";
                res.setHeader("Set-Cookie", value);
            }
        }
    }
    if (lang == core.serviceSettings.defaultLang) {
        lang = "";
    }
    else {
        lang = "@" + lang;
    }
    return lang;
    return lang2;
}

function hasPtrPermission(req: core.ApiRequest, currptr: string) : boolean
{
    let b2: boolean;
    currptr = currptr.replace(/@..$/g, "");
    while (currptr != "") {
        if (core.callerHasPermission(req, "write-" + currptr)) {
            return true;
        }
        else {
            let newptr = currptr.replace(/-[^\-]*$/g, "");
            if (newptr == currptr) {
                return false;
            }
            else {
                currptr = newptr;
            }
        }
    }
    return false;
    return b2;
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
    let js3: JsonObject;
    let js2 = req.rootPub["promo"];
    if (js2 == null) {
        let jsb = ({ "tags": [], "priority": 0 });
        let lastPtr = await core.getPubAsync(req.rootPub["lastPointer"], "pointer");
        if (lastPtr != null) {
            jsb["link"] = "/" + lastPtr["pub"]["path"];
        }
        js2 = clone(jsb);
    }
    return js2;
    return js3;
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
