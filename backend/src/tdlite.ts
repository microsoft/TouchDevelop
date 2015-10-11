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
import * as tdliteCppCompiler from "./tdlite-cppcompiler"
import * as tdliteAbuse from "./tdlite-abuse"
import * as tdliteAdmin from "./tdlite-admin"
import * as tdliteCrashes from "./tdlite-crashes"
import * as tdliteChannels from "./tdlite-channels"

var orZero = core.orZero;
var orFalse = core.orFalse;
var withDefault = core.withDefault;
var orEmpty = td.orEmpty;


var reinit = false;

var logger = core.logger;
var httpCode = restify.http();

var faviconIco: Buffer;


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
                    let result4 = await tdliteCrashes.crashContainer.createBlockBlobFromTextAsync(blobName, encReport);
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

    await core.lateInitAsync();

    if (reinit) {
        let success = await core.blobService.setCorsPropertiesAsync("*", "GET,HEAD,OPTIONS", "*", "ErrorMessage,x-ms-request-id,Server,x-ms-version,Content-Type,Cache-Control,Last-Modified,ETag,Content-MD5,x-ms-lease-status,x-ms-blob-type", 3600);
    }
    else {
        azureTable.assumeTablesExists();
        azureBlobStorage.assumeContainerExists();
    }

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
    _initProgress();
    _initRuntime();
    // ## and other stuff
    await search.initAsync();
    await tdliteImport.initAsync();
    await tdliteWorkspace.initAsync();
    await tdliteCppCompiler.initAsync();
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
