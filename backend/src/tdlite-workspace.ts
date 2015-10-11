/// <reference path='../typings/node/node.d.ts' />

'use strict';

import * as td from './td';
import * as assert from 'assert';
import * as crypto from 'crypto';

type JsonObject = td.JsonObject;
type JsonBuilder = td.JsonBuilder;

var asArray = td.asArray;
var json = td.json;
var clone = td.clone;

import * as azureTable from "./azure-table"
import * as azureBlobStorage from "./azure-blob-storage"
import * as parallel from "./parallel"
import * as cachedStore from "./cached-store"
import * as indexedStore from "./indexed-store"
import * as core from "./tdlite-core"
import * as tdliteScripts from "./tdlite-scripts"
import * as tdliteUsers from "./tdlite-users"
import * as tdliteCppCompiler from "./tdlite-cppcompiler"


var orFalse = core.orFalse;
var withDefault = core.withDefault;
var orEmpty = td.orEmpty;

var logger = core.logger;
var httpCode = core.httpCode;

var installSlotsTable: azureTable.Table;
var workspaceContainer: cachedStore.Container[] = [];
var historyTable: azureTable.Table;

export class PubVersion
    extends td.JsonRecord
{
    @json public instanceId: string = "";
    @json public baseSnapshot: string = "";
    @json public time: number = 0;
    @json public version: number = 0;
    static createFromJson(o:JsonObject) { let r = new PubVersion(); r.fromJson(o); return r; }
}

export interface IPubVersion {
    instanceId: string;
    baseSnapshot: string;
    time: number;
    version: number;
}

export class PubHeader
    extends td.JsonRecord
{
    @json public guid: string = "";
    @json public name: string = "";
    @json public scriptId: string = "";
    @json public scriptTime: number = 0;
    @json public updateId: string = "";
    @json public updateTime: number = 0;
    @json public userId: string = "";
    @json public status: string = "";
    @json public scriptVersion: IPubVersion;
    @json public hasErrors: string = "";
    @json public recentUse: number = 0;
    @json public editor: string = "";
    @json public meta: JsonObject;
    static createFromJson(o:JsonObject) { let r = new PubHeader(); r.fromJson(o); return r; }
}

export interface IPubHeader {
    guid: string;
    name: string;
    scriptId: string;
    scriptTime: number;
    updateId: string;
    updateTime: number;
    userId: string;
    status: string;
    scriptVersion: IPubVersion;
    hasErrors: string;
    recentUse: number;
    editor: string;
    meta: JsonObject;
}

export interface IPubHeaders {
    newNotifications: number;
    notifications: boolean;
    email: boolean;
    emailNewsletter: boolean;
    emailNotifications: boolean;
    profileIndex: number;
    profileCount: number;
    time: number;
    askBeta: boolean;
    askSomething: string;
    betaSettings: boolean;
    random: string;
    minimum: string;
    v: number;
    user: tdliteUsers.PubUser;
    headers: IPubHeader[];
    blobcontainer: string;
}

export class PubBody
    extends td.JsonRecord
{
    @json public guid: string = "";
    @json public name: string = "";
    @json public scriptId: string = "";
    @json public userId: string = "";
    @json public status: string = "";
    @json public scriptVersion: IPubVersion;
    @json public recentUse: number = 0;
    @json public script: string = "";
    @json public editorState: string = "";
    @json public editor: string = "";
    @json public meta: JsonObject;
    static createFromJson(o:JsonObject) { let r = new PubBody(); r.fromJson(o); return r; }
}

export interface IPubBody {
    guid: string;
    name: string;
    scriptId: string;
    userId: string;
    status: string;
    scriptVersion: IPubVersion;
    recentUse: number;
    script: string;
    editorState: string;
    editor: string;
    meta: JsonObject;
}

export class InstalledResult
    extends td.JsonRecord
{
    @json public delay: number = 0;
    @json public numErrors: number = 0;
    @json public headers: JsonObject[];
    static createFromJson(o:JsonObject) { let r = new InstalledResult(); r.fromJson(o); return r; }
}

export interface IInstalledResult {
    delay: number;
    numErrors: number;
    headers: JsonObject[];
}

export class PubInstalledHistory
    extends td.JsonRecord
{
    @json public kind: string = "";
    @json public time: number = 0;
    @json public historyid: string = "";
    @json public scriptstatus: string = "";
    @json public scriptname: string = "";
    @json public scriptdescription: string = "";
    @json public scriptid: string = "";
    @json public isactive: boolean = false;
    @json public meta: string = "";
    @json public scriptsize: number = 0;
    static createFromJson(o:JsonObject) { let r = new PubInstalledHistory(); r.fromJson(o); return r; }
}

export interface IPubInstalledHistory {
    kind: string;
    time: number;
    historyid: string;
    scriptstatus: string;
    scriptname: string;
    scriptdescription: string;
    scriptid: string;
    isactive: boolean;
    meta: string;
    scriptsize: number;
}


export async function initAsync() : Promise<void>
{
    let tableClientWs = await core.specTableClientAsync("WORKSPACE");
    let tableClientHist = await core.specTableClientAsync("WORKSPACE_HIST");
    installSlotsTable = await tableClientWs.createTableIfNotExistsAsync("installslots");
    historyTable = await tableClientHist.createTableIfNotExistsAsync("historyslots");
    for (let j = 0; j < 4; j++) {
        let blobServiceWs = azureBlobStorage.createBlobService({
            storageAccount: td.serverSetting("WORKSPACE_BLOB_ACCOUNT" + j, false),
            storageAccessKey: td.serverSetting("WORKSPACE_BLOB_KEY" + j, false)
        });
        /* async */ blobServiceWs.setCorsPropertiesAsync("*", "GET,HEAD,OPTIONS", "*", "*", 3600);
        let container = await cachedStore.createContainerAsync("workspace", {
            noCache: true,
            access: "hidden",
            blobService: blobServiceWs
        });
        workspaceContainer.push(container);
    }

    core.addRoute("GET", "*user", "installed", async (req: core.ApiRequest) => {
        core.meOnly(req);
        if (req.status == 200) {
            await getInstalledAsync(req, false);
        }
    });
    core.addRoute("GET", "*user", "installedlong", async (req1: core.ApiRequest) => {
        core.meOnly(req1);
        if (req1.status == 200) {
            await getInstalledAsync(req1, true);
        }
    });
    core.addRoute("POST", "*user", "installed", async (req2: core.ApiRequest) => {
        core.meOnly(req2);
        if (req2.status == 200) {
            await postInstalledAsync(req2);
        }
    }
    , {
        noSizeCheck: true
    });
    core.addRoute("DELETE", "*user", "installed", async (req3: core.ApiRequest) => {
        core.meOnly(req3);
        if (req3.status == 200) {
            let result = await installSlotsTable.getEntityAsync(req3.rootId, req3.argument);
            if (result == null) {
                req3.status = httpCode._404NotFound;
            }
            else {
                await deleteHistoryAsync(req3, req3.argument);
                await core.pokeSubChannelAsync("installed:" + req3.rootId);
                req3.response = ({});
            }
        }
    });
}

async function getInstalledAsync(req: core.ApiRequest, long: boolean) : Promise<void>
{
    if (req.argument == "") {
        let v = await core.longPollAsync("installed:" + req.rootId, long, req);
        if (req.status == 200) {
            if (long) {
                // re-get for new notifiacation count if any
                req.rootPub = await core.getPubAsync(req.rootId, "user");
            }
            let entities = await installSlotsTable.createQuery().partitionKeyIs(req.rootId).fetchAllAsync();
            let res:IPubHeaders = <any>{};
            res.blobcontainer = (await workspaceForUser(req.userid).blobContainerAsync()).url() + "/";
            res.time = await core.nowSecondsAsync();
            res.random = crypto.randomBytes(16).toString("base64");
            res.headers = [];
            res.newNotifications = core.orZero(req.rootPub["notifications"]);
            res.notifications = res.newNotifications > 0;
            res.v = v;
            for (let js of entities) {
                res.headers.push(headerFromSlot(js));
            }
            req.response = res
        }
    }
    else {
        // ### specific slot
        if (req.subArgument == "history") {
            await getInstalledHistoryAsync(req);
        }
        else {
            let result = await installSlotsTable.getEntityAsync(req.rootId, req.argument);
            if (result == null) {
                req.status = 404;
            }
            else {
                req.response = headerFromSlot(result)
            }
        }
    }
}

async function postInstalledAsync(req: core.ApiRequest) : Promise<void>
{
    let installedResult = new InstalledResult();
    installedResult.delay = 10;
    installedResult.headers = (<JsonObject[]>[]);
    if (req.argument == "") {
        let bodies = req.body["bodies"];
        if (bodies != null) {
            for (let body of bodies) {
                let pubBody = new PubBody();
                pubBody.fromJson(body);
                let item = await saveScriptAsync(req.rootId, pubBody);
                if (item.hasOwnProperty("error")) {
                    installedResult.numErrors += 1;
                }
                installedResult.headers.push(item);
                req.verb = "installedbodies";
            }
        }
        let uses = req.body["recentUses"];
        if (uses != null) {
            for (let use of uses) {
                let entity = azureTable.createEntity(req.rootId, orEmpty(use["guid"]));
                entity["recentUse"] = use["recentUse"];
                let ok = await installSlotsTable.tryUpdateEntityAsync(clone(entity), "merge");
                if ( ! ok) {
                    installedResult.numErrors += 1;
                }
                req.verb = "installedrecent";
            }
        }
        await core.pokeSubChannelAsync("installed:" + req.rootId);
        req.response = installedResult.toJson();
    }
    else {
        req.verb = req.subArgument;
        if (req.subArgument == "compile") {
            await tdliteCppCompiler.mbedCompileAsync(req);
        }
        else if (req.subArgument == "publish") {
            await core.canPostAsync(req, "script");
            if (req.status == 200) {
                let uid = req.rootId;
                await publishScriptAsync(req);
                core.progress("publish - poke");
                await core.pokeSubChannelAsync("installed:" + uid);
            }
        }
        else {
            req.status = httpCode._400BadRequest;
        }
    }

}

export async function deleteAllHistoryAsync(userid:string, req:core.ApiRequest)
{
    let resQuery = installSlotsTable.createQuery().partitionKeyIs(userid);
    await parallel.forJsonAsync(await resQuery.fetchAllAsync(), async (json1: JsonObject) => {
        await deleteHistoryAsync(req, json1["RowKey"]);
    });
}

async function deleteHistoryAsync(req: core.ApiRequest, guid: string) : Promise<void>
{
    let result = await installSlotsTable.getEntityAsync(req.rootId, guid);
    if (result == null) {
        return;
    }
    let entity = azureTable.createEntity(req.rootId, guid);
    entity["guid"] = guid;
    entity["status"] = "deleted";
    await installSlotsTable.insertEntityAsync(clone(entity), "or replace");

    let wsContainer = workspaceForUser(req.rootId);
    let scriptGuid = req.rootId + "." + guid;
    let resQuery = historyTable.createQuery().partitionKeyIs(scriptGuid);
    await parallel.forJsonAsync(await resQuery.fetchAllAsync(), async (json: JsonObject) => {
        await historyTable.deleteEntityAsync(json);
        await (await wsContainer.blobContainerAsync()).deleteBlobAsync(json["historyid"]);
    });
}

function workspaceForUser(userid: string) : cachedStore.Container
{
    let container: cachedStore.Container;
    container = workspaceContainer[userid[userid.length - 1].charCodeAt(0) % workspaceContainer.length];
    return container;
}

function headerFromSlot(js: JsonObject) : IPubHeader
{
    let pubHeader: PubHeader;
    pubHeader = new PubHeader();
    let isDeleted = js["status"] == "deleted";
    if (isDeleted) {
        pubHeader.fromJson(({}));
        pubHeader.status = js["status"];
        pubHeader.guid = js["guid"];
    }
    else {
        pubHeader.fromJson(js);
        pubHeader.meta = JSON.parse(withDefault(js["meta"], "{}"));
    }
    let snap = withDefault(js["currentBlob"], "18561817817178.deleted.foobar")
    let ms = 20000000000000 - parseFloat(snap.replace(/\..*/g, ""));
    pubHeader.scriptVersion = {
        instanceId: "cloud",
        baseSnapshot: snap,
        time: Math.round(ms / 1000),
        version: 1
    };
    return <any>pubHeader.toJson();
}

async function getInstalledHistoryAsync(req: core.ApiRequest) : Promise<void>
{
    let scriptGuid = req.rootId + "." + req.argument;
    let resQuery = historyTable.createQuery().partitionKeyIs(scriptGuid);
    let entities2 = await indexedStore.executeTableQueryAsync(resQuery, req.queryOptions);
    req.response = entities2.toJson();
}

async function saveScriptAsync(userid: string, body: PubBody) : Promise<JsonObject>
{
    let newSlot: JsonObject;
    core.progress("save 0");
    let bodyBuilder = clone(body.toJson());
    body.script = (<string>null);
    body.editorState = (<string>null);
    let bodyJson = body.toJson();
    assert(JSON.stringify(bodyJson).length < 10000, "too large header");
    let slotJson = await installSlotsTable.getEntityAsync(userid, body.guid);
    let updatedSlot = azureTable.createEntity(userid, body.guid);

    core.progress("save 1");
    let id2 = (20000000000000 - await core.redisClient.cachedTimeAsync()) + "." + userid + "." + azureTable.createRandomId(12);
    let _new = false;
    let prevBlob = "";
    if (slotJson == null) {
        _new = true;
        let s2 = orEmpty(body.userId);
        let source = "@fork";
        if (s2 == "" || s2 == userid) {
            source = "@fresh";
        }
        logger.tick("New_slot" + source);
    }
    else {
        prevBlob = slotJson["currentBlob"];
        updatedSlot = clone(slotJson);
    }
    logger.tick("SaveScript");
    bodyBuilder["slotUserId"] = userid;
    for (let s of Object.keys(bodyJson)) {
        if (s != "scriptVersion") {
            updatedSlot[s] = bodyJson[s];
        }
    }
    if (bodyJson.hasOwnProperty("meta")) {
        updatedSlot["meta"] = JSON.stringify(bodyJson["meta"]);
    }
    else {
        updatedSlot["meta"] = "{}";
    }
    updatedSlot["currentBlob"] = id2;
    let updatedJson = clone(updatedSlot);
    let versionOK = body.status == "deleted" || prevBlob == body.scriptVersion.baseSnapshot || body.scriptVersion.baseSnapshot == "*";
    if (versionOK) {
        core.progress("save 2");
        await workspaceForUser(userid).justInsertAsync(id2, bodyBuilder);
        core.progress("save 3");
        if (_new) {
            versionOK = await installSlotsTable.tryInsertEntityAsync(updatedJson);
        }
        else {
            versionOK = await installSlotsTable.tryUpdateEntityAsync(updatedJson, "merge");
        }
        if ( ! versionOK) {
            let result = await installSlotsTable.getEntityAsync(userid, body.guid);
            if (result != null && orEmpty(result["currentBlob"]) == id2) {
                logger.debug("fixing up wrong result from azure table insert, " + userid + " " + body.guid + " " + id2);
                versionOK = true;
            }
        }
    }
    if (versionOK) {
        core.progress("save 4");
        let hist = new PubInstalledHistory();
        hist.historyid = id2;
        hist.scriptstatus = body.status;
        hist.scriptname = body.name;
        hist.scriptdescription = "";
        hist.kind = "installedscripthistory";
        hist.isactive = false;
        hist.time = body.scriptVersion.time;
        hist.meta = updatedSlot["meta"];
        hist.scriptsize = orEmpty(bodyBuilder["script"]).length;
        let jsb = clone(hist.toJson());
        jsb["PartitionKey"] = userid + "." + body.guid;
        jsb["RowKey"] = hist.historyid;
        await historyTable.insertEntityAsync(clone(jsb), "or merge");
        core.progress("save 5");
        newSlot = headerFromSlot(updatedJson)
    }
    else {
        newSlot = ({"error":"out of date"});
        logger.debug("collision on " + userid + "/" + body.guid + " " + prevBlob + " vs " + body.scriptVersion.baseSnapshot);
    }
    return newSlot;
}

async function publishScriptAsync(req: core.ApiRequest) : Promise<void>
{
    core.progress("start publish, ");
    let slotJson = await installSlotsTable.getEntityAsync(req.userid, req.argument);
    let pubVersion = new PubVersion();
    pubVersion.fromJson(JSON.parse(req.queryOptions["scriptversion"]));
    if (slotJson == null) {
        req.status = httpCode._404NotFound;
    }
    else if (slotJson["currentBlob"] != pubVersion.baseSnapshot) {
        req.status = httpCode._409Conflict;
    }

    if (req.status == 200) {
        let pubScript = new tdliteScripts.PubScript();
        pubScript.userid = req.userid;
        pubScript.ishidden = orFalse(req.queryOptions["hidden"]);
        pubScript.unmoderated = ! core.callerHasPermission(req, "adult");
        let mergeids = req.queryOptions["mergeids"];
        if (mergeids != null) {
            pubScript.mergeids = mergeids.split(",");
        }
        else {
            pubScript.mergeids = (<string[]>[]);
        }
        let body = await workspaceForUser(req.userid).getAsync(pubVersion.baseSnapshot);
        pubScript.baseid = orEmpty(body["scriptId"]);
        req.rootPub = (<JsonObject>null);
        req.rootId = "";
        if (pubScript.baseid != "") {
            let baseJson = await core.getPubAsync(pubScript.baseid, "script");
            if (baseJson != null) {
                req.rootPub = baseJson;
                req.rootId = pubScript.baseid;
                pubScript.rootid = withDefault(baseJson["pub"]["rootid"], pubScript.baseid);
            }
        }
        pubScript.time = await core.nowSecondsAsync();
        pubScript.name = withDefault(req.body["name"], "unnamed");
        pubScript.description = orEmpty(req.body["comment"]);
        pubScript.icon = orEmpty(req.body["icon"]);
        pubScript.iconbackground = withDefault(req.body["color"], "#FF7518");
        pubScript.platforms = orEmpty(req.body["platform"]).split(",");
        pubScript.islibrary = orEmpty(req.body["isLibrary"]) == "yes";
        pubScript.userplatform = core.getUserPlatforms(req);
        pubScript.capabilities = (<string[]>[]);
        pubScript.flows = (<string[]>[]);
        pubScript.editor = orEmpty(slotJson["editor"]);
        pubScript.iconArtId = td.toString(req.body["iconArtId"]);
        pubScript.splashArtId = td.toString(req.body["splashArtId"]);
        pubScript.meta = req.body["meta"];
        if (typeof pubScript.meta != "object" || Array.isArray(pubScript.meta))
            pubScript.meta = {};

        let jsb = {};
        jsb["currentBlob"] = pubVersion.baseSnapshot;
        await tdliteScripts.publishScriptCoreAsync(pubScript, jsb, body["script"], req);
        // 
        let slotBuilder = clone(slotJson);
        slotBuilder["status"] = "published";
        slotBuilder["scriptId"] = pubScript.id;
        slotBuilder["userId"] = pubScript.userid;
        delete slotBuilder["__etag"];
        let newSlot = clone(slotBuilder);
        await installSlotsTable.updateEntityAsync(newSlot, "merge");

        req.response = { bodies: [headerFromSlot(newSlot)] };
    }
}
