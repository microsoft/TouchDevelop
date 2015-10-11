/// <reference path='../typings/node/node.d.ts' />

'use strict';

import * as td from './td';
import * as assert from 'assert';
import * as fs from 'fs';

type JsonObject = td.JsonObject;
type JsonBuilder = td.JsonBuilder;


import * as azureTable from "./azure-table"
import * as azureBlobStorage from "./azure-blob-storage"
import * as cachedStore from "./cached-store"
import * as indexedStore from "./indexed-store"
import * as restify from "./restify"
import * as raygun from "./raygun"
import * as loggly from "./loggly"
import * as libratoNode from "./librato-node"
import * as tdliteIndex from "./tdlite-index"
import * as parallel from "./parallel"

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
import * as tdliteCppCompiler from "./tdlite-cppcompiler"
import * as tdliteAbuse from "./tdlite-abuse"
import * as tdliteAdmin from "./tdlite-admin"
import * as tdliteCrashes from "./tdlite-crashes"
import * as tdliteChannels from "./tdlite-channels"
import * as tdliteTicks from "./tdlite-ticks"
import * as tdliteRuntime from "./tdlite-runtime"

var withDefault = core.withDefault;
var orEmpty = td.orEmpty;


var reinit = false;

var logger = core.logger;
var httpCode = restify.http();

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
            private: !core.fullTD,
            saveReport: tdliteCrashes.saveBugReportAsync,
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

    await core.lateInitAsync();

    if (reinit) {
        let success = await core.blobService.setCorsPropertiesAsync("*", "GET,HEAD,OPTIONS", "*", "ErrorMessage,x-ms-request-id,Server,x-ms-version,Content-Type,Cache-Control,Last-Modified,ETag,Content-MD5,x-ms-lease-status,x-ms-blob-type", 3600);
    }
    else {
        azureTable.assumeTablesExists();
        azureBlobStorage.assumeContainerExists();
    }

    await tdliteIndex.initAsync();
    let timeDelta = await core.redisClient.cachedTimeAsync() - new Date().getTime();
    logger.info("time difference to redis instance: " + timeDelta + "ms");
    if (false) {
        logger.info(JSON.stringify(await core.redisClient.sendCommandAsync("info", [])));
    }

    await cachedStore.initAsync();
    indexedStore.init(core.tableClient);
    // cachedStore.getLogger().setVerbosity("info");

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
        await performRoutingAsync(req2, res2);
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
            await performRoutingAsync(req4, res4);
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
                    res4.sendBuffer(await tdliteReleases.getFaviconAsync(), "image/x-icon");
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
    core.cachedApiContainer = await cachedStore.createContainerAsync("cachedapi", {
        inMemoryCacheSeconds: 5,
        redisCacheSeconds: 600,
        noBlobStorage: true
    });
    await audit.initAsync();
    // ## General
    core.addRoute("POST", "", "", async (req: core.ApiRequest) => {
        await performBatchAsync(req);
    }, {
        noSizeCheck: true
    });
    await tdliteTicks.initAsync();
    await tdliteCrashes.initAsync();
    await tdliteAdmin.initAsync();
    await tdliteScripts.initAsync();
    await tdliteTdCompiler.initAsync();
    await tdliteComments.initAsync()
    await tdliteGroups.initAsync();
    await tdliteTags.initAsync();
    await tdliteArt.initAsync();
    await tdliteReviews.initAsync();
    await tdliteUsers.initAsync();
    await notifications.initAsync();
    await tdliteReleases.initAsync();
    await tdliteAbuse.initAsync();
    await tdliteChannels.initAsync();
    await tdlitePointers.initAsync();
    await tdliteVimeo.initAsync();
    await tdliteRuntime.initAsync();
    // ## and other stuff
    await search.initAsync();
    await tdliteImport.initAsync();
    await tdliteWorkspace.initAsync();
    await tdliteCppCompiler.initAsync();
}


async function performBatchAsync(req: core.ApiRequest) : Promise<void>
{
    let reqArr = req.body["array"];
    if (reqArr == null || reqArr.length > 50 || ! req.isTopLevel) {
        req.status = httpCode._400BadRequest;
    }
    else {
        let resps = td.asArray(td.clone(reqArr));
        await parallel.forAsync(reqArr.length, async (x: number) => {
            let inpReq = resps[x];
            let resp = await performBatchedRequestAsync(inpReq, req, false);
            resps[x] = resp;
        });
        let jsb = {};
        jsb["code"] = 200;
        jsb["array"] = td.arrayToJson(resps);
        req.response = td.clone(jsb);
    }
}

async function performBatchedRequestAsync(inpReq: JsonBuilder, req: core.ApiRequest, allowPost: boolean) : Promise<JsonBuilder>
{
    let resp: JsonBuilder;
    let apiRequest = core.buildApiRequest(withDefault(inpReq["relative_url"], "/no-such-url"));
    apiRequest.method = withDefault(inpReq["method"], "GET").toUpperCase();
    apiRequest.userid = req.userid;
    apiRequest.userinfo = req.userinfo;

    apiRequest.isUpgrade = req.isUpgrade;
    if ( ! allowPost) {
        if (apiRequest.method != "GET") {
            apiRequest.status = httpCode._405MethodNotAllowed;
        }
    }
    if (apiRequest.status == 200) {
        await performSingleRequestAsync(apiRequest);
    }
    resp = {};
    resp["code"] = apiRequest.status;
    if (apiRequest.status == 200) {
        let etag = core.computeEtagOfJson(apiRequest.response);
        let s = inpReq["If-None-Match"];
        if (s != null && s == etag) {
            resp["code"] = httpCode._304NotModified;
        }
        else {
            resp["ETag"] = etag;
            resp["body"] = apiRequest.response;
        }
    }
    return resp;
}

function lookupRoute(apiRequest: core.ApiRequest, root: string, verb: string) : void
{
    if (apiRequest.route == null) {
        if (core.RouteIndex.has(apiRequest.method, root, verb)) {
            apiRequest.route = core.RouteIndex.at(apiRequest.method, root, verb)
        }
    }
}


async function performSingleRequestAsync(apiRequest: core.ApiRequest) : Promise<void>
{
    logger.newContext();
    if (apiRequest.status == 200 && apiRequest.root == "me") {
        if (apiRequest.userid == "") {
            apiRequest.status = httpCode._401Unauthorized;
        }
        else {
            apiRequest.root = apiRequest.userid;
        }
    }
    if (apiRequest.status == 200) {
        lookupRoute(apiRequest, apiRequest.root, apiRequest.verb);
        if (apiRequest.verb != "") {
            lookupRoute(apiRequest, apiRequest.root, "*");
        }
        if (apiRequest.route == null && apiRequest.root != "") {
            let pub = await core.pubsContainer.getAsync(apiRequest.root);
            if (pub == null || pub["kind"] == "reserved") {
            }
            else {
                apiRequest.root = "*" + pub["kind"];
                apiRequest.rootPub = pub;
                apiRequest.rootId = pub["id"];
                lookupRoute(apiRequest, "*" + pub["kind"], apiRequest.verb);
                lookupRoute(apiRequest, "*pub", apiRequest.verb);
                if (apiRequest.verb == "") {
                }
                else {
                    lookupRoute(apiRequest, "*" + pub["kind"], "*");
                }
            }
        }

        if (apiRequest.route == null) {
            await core.throttleAsync(apiRequest, "apireq", 3);
            apiRequest.status = 404;
        }
        else {
            await apiRequest.route.handler(apiRequest);
        }
        let cat = "ApiGet";
        if (apiRequest.root == "") {
            cat = "ApiBatch";
        }
        else if (apiRequest.verb == "installedlong" || apiRequest.root == "notificationslong" || apiRequest.verb == "notificationslong") {
            cat = "ApiPoll";
        }
        else if (apiRequest.method != "GET") {
            cat = "ApiPost";
        }
        else if ( ! apiRequest.isTopLevel) {
            cat = "ApiInner";
        }
        let evArgs = {};
        let path = apiRequest.method + " /api/";
        if (apiRequest.route != null) {
            path = path + apiRequest.route.root;
            if (apiRequest.route.verb != "") {
                path = path + "/" + apiRequest.route.verb;
            }
        }
        else {
            path = path + "*" + apiRequest.status;
        }
        evArgs["rawURL"] = core.sanitze(apiRequest.origUrl);
        evArgs["user"] = apiRequest.userid;
        evArgs["cat"] = cat;
        evArgs["statusCode"] = apiRequest.status;
        if (false) {
            logger.customTick(path, td.clone(evArgs));
        }
        logger.measure(cat + "@" + path, logger.contextDuration());
    }
}

async function storeCacheAsync(apiRequest: core.ApiRequest) : Promise<void>
{
    if (apiRequest.method != "GET") {
        apiRequest.status = httpCode._405MethodNotAllowed;
        return;
    }
    await core.throttleAsync(apiRequest, "apireq", 10);
    if (apiRequest.status == httpCode._429TooManyRequests) {
        return;
    }
    // 
    await performSingleRequestAsync(apiRequest);
    // 
    let thekey = apiRequest.route.options.cacheKey;
    if (!thekey) {
        apiRequest.status = httpCode._404NotFound;
        return;
    }
    let jsb = {};
    let verkey = await core.cachedApiContainer.getAsync("@" + thekey);
    if (verkey == null) {
        jsb["cachekeyvalue"] = await core.flushApiCacheAsync(thekey);
    }
    else {
        jsb["cachekeyvalue"] = verkey["value"];
    }
    jsb["cachekey"] = thekey;
    jsb["status"] = apiRequest.status;
    if (apiRequest.status == 200) {
        jsb["response"] = apiRequest.response;
    }
    await core.cachedApiContainer.justInsertAsync(apiRequest.origUrl, jsb);
    // TODO store etag/other headers?
}

async function performRoutingAsync(req: restify.Request, res: restify.Response) : Promise<void>
{
    let apiRequest = core.buildApiRequest(req.url());
    apiRequest.method = req.method();
    apiRequest.body = req.bodyAsJson();
    await core.validateTokenAsync(apiRequest, req);
    if (apiRequest.userid == "") {
        apiRequest.throttleIp = core.sha256(req.remoteIp());
    }
    if ( ! apiRequest.isCached && apiRequest.userinfo.token == null) {
        core.handleBasicAuth(req, res);
    }
    else {
        core.handleHttps(req, res);
    }
    if ( ! res.finished()) {
        let upgradeToken = apiRequest.queryOptions["upgrade"];
        apiRequest.isUpgrade = upgradeToken != null && upgradeToken == core.tokenSecret;
        apiRequest.isTopLevel = true;
        if (apiRequest.status == 200) {
            if (apiRequest.isCached) {
                if ( ! (await core.handledByCacheAsync(apiRequest))) {
                    await storeCacheAsync(apiRequest);
                }
            }
            else {
                await core.throttleAsync(apiRequest, "apireq", 2);
                await performSingleRequestAsync(apiRequest);
            }
        }
        core.sendResponse(apiRequest, req, res);
    }
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
