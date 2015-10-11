/// <reference path='../typings/node/node.d.ts' />

'use strict';

import * as td from './td';
import * as assert from 'assert';
//import * as crypto from 'crypto';

type JsonObject = td.JsonObject;
type JsonBuilder = td.JsonBuilder;

var asArray = td.asArray;
var json = td.json;
var clone = td.clone;

import * as azureTable from "./azure-table"
import * as parallel from "./parallel"
import * as cachedStore from "./cached-store"
import * as indexedStore from "./indexed-store"
import * as core from "./tdlite-core"
import * as audit from "./tdlite-audit"
import * as search from "./tdlite-search"
import * as notifications from "./tdlite-notifications"
import * as tdliteTdCompiler from "./tdlite-tdcompiler"

import * as main from "./tdlite"

var orFalse = core.orFalse;
var withDefault = core.withDefault;
var orEmpty = td.orEmpty;
var logger = core.logger;
var httpCode = core.httpCode;

var updateSlotTable: azureTable.Table;
export var scripts: indexedStore.Store;
export var scriptText: cachedStore.Container;
var updateSlots: indexedStore.Store;
var promosTable: azureTable.Table;

var lastShowcaseDl: Date;
var showcaseIds: string[];


export class PubScript
    extends td.JsonRecord
{
    @json public kind: string = "";
    @json public time: number = 0;
    @json public id: string = "";
    @json public baseid: string = "";
    @json public url: string = "";
    @json public name: string = "";
    @json public description: string = "";
    @json public userid: string = "";
    @json public username: string = "";
    @json public userscore: number = 0;
    @json public userhaspicture: boolean = false;
    @json public icon: string = "";
    @json public iconbackground: string = "";
    @json public iconurl: string = "";
    @json public positivereviews: number = 0;
    @json public cumulativepositivereviews: number = 0;
    @json public subscribers: number = 0;
    @json public comments: number = 0;
    @json public screenshots: number = 0;
    @json public platforms: string[];
    @json public capabilities: string[];
    @json public flows: string[];
    @json public haserrors: boolean = false;
    @json public rootid: string = "";
    @json public updateid: string = "";
    @json public updatetime: number = 0;
    @json public ishidden: boolean = false;
    @json public islibrary: boolean = false;
    @json public userplatform: string[];
    @json public installations: number = 0;
    @json public runs: number = 0;
    @json public art: number = 0;
    @json public toptagids: string[];
    @json public screenshotthumburl: string = "";
    @json public screenshoturl: string = "";
    @json public mergeids: string[];
    @json public editor: string = "";
    @json public meta: JsonObject;
    @json public iconArtId: string = "";
    @json public splashArtId: string = "";
    @json public raw: string = "";
    @json public scripthash: string = "";
    @json public sourceid: string = "";
    @json public updateroot: string = "";
    @json public unmoderated: boolean = false;
    @json public noexternallinks: boolean = false;
    @json public promo: JsonObject;
    static createFromJson(o:JsonObject) { let r = new PubScript(); r.fromJson(o); return r; }
}

export interface IPubScript {
    kind: string;
    time: number;
    id: string;
    baseid: string;
    url: string;
    name: string;
    description: string;
    userid: string;
    username: string;
    userscore: number;
    userhaspicture: boolean;
    icon: string;
    iconbackground: string;
    iconurl: string;
    positivereviews: number;
    cumulativepositivereviews: number;
    subscribers: number;
    comments: number;
    screenshots: number;
    platforms: string[];
    capabilities: string[];
    flows: string[];
    haserrors: boolean;
    rootid: string;
    updateid: string;
    updatetime: number;
    ishidden: boolean;
    islibrary: boolean;
    userplatform: string[];
    installations: number;
    runs: number;
    art: number;
    toptagids: string[];
    screenshotthumburl: string;
    screenshoturl: string;
    mergeids: string[];
    editor: string;
    meta: JsonObject;
    iconArtId: string;
    splashArtId: string;
    raw: string;
    scripthash: string;
    sourceid: string;
    updateroot: string;
    unmoderated: boolean;
    noexternallinks: boolean;
    promo: JsonObject;
}

export class UpdateEntry
    extends td.JsonRecord
{
    @json public PartitionKey: string = "";
    @json public RowKey: string = "";
    @json public pub: string = "";
    @json public time: number = 0;
    static createFromJson(o:JsonObject) { let r = new UpdateEntry(); r.fromJson(o); return r; }
}

export interface IUpdateEntry {
    PartitionKey: string;
    RowKey: string;
    pub: string;
    time: number;
}


export async function resolveScriptsAsync(entities: indexedStore.FetchResult, req: core.ApiRequest, forSearch: boolean) : Promise<void>
{
    let applyUpdates = orFalse(req.queryOptions["applyupdates"]);
    let singleResult = false;
    if (applyUpdates) {
        let updates = {};
        updates[""] = "1";
        entities.items = asArray(entities.items).filter((elt: JsonObject) => {
            let result: boolean;
            if ( ! elt["pub"]["ishidden"]) {
                let key = orEmpty(elt["updateKey"]);
                if (updates[key] == null) {
                    updates[key] = "1";
                    return true;
                }
            }
            return false;
            return result;
        });
    }
    else if (entities.items.length == 1) {
        singleResult = req.rootId == entities.items[0]["id"];
    }
    // 
    let updateObjs = (<JsonObject[]>[]);
    let srcmapping = {};
    let srcitems = asArray(entities.items);
    let updateIds = srcitems.map<string>(elt1 => withDefault(elt1["updateKey"], "***"));
    updateObjs = await core.pubsContainer.getManyAsync(updateIds);
    if (applyUpdates) {
        let coll2 = updateObjs.map<string>(elt2 => withDefault(elt2["scriptId"], "***"));
        let includeAbuse = true;
        if (forSearch) {
            includeAbuse = core.callerHasPermission(req, "global-list");
        }
        entities.items = (await core.pubsContainer.getManyAsync(coll2))
            .filter(elt3 => core.isGoodPub(elt3, "script") && (includeAbuse || core.isAbuseSafe(elt3)));
        if (forSearch) {
            srcitems.reverse();
            for (let js2 of srcitems) {
                srcmapping[js2["updateKey"]] = js2["id"];
            }
        }
    }
    // 
    await core.addUsernameEtcAsync(entities);
    // 
    let seeHidden = core.hasPermission(req.userinfo.json, "global-list");
    let coll = (<PubScript[]>[]);
    for (let i = 0; i < entities.items.length; i++) {
        let js = entities.items[i];
        let script = PubScript.createFromJson(js["pub"]);
        script.unmoderated = orFalse(script.unmoderated);
        script.noexternallinks = ! core.hasPermission(js["*userid"], "external-links");
        let seeIt = seeHidden || script.userid == req.userid;

        if (script.ishidden) {
            if (script.unmoderated && singleResult) {
                singleResult = core.callerSharesGroupWith(req, js["*userid"]);
            }
            seeIt = seeIt || singleResult || core.callerIsFacilitatorOf(req, js["*userid"]);
            seeIt = seeIt || req.rootId == "promo-scripts" && ! script.unmoderated;
        }
        else if (script.unmoderated) {
            seeIt = seeIt || core.callerSharesGroupWith(req, js["*userid"]);
        }
        else {
            seeIt = true;
        }
        if ( ! seeIt) {
            continue;
        }
        if (forSearch) {
            script.sourceid = withDefault(srcmapping[js["updateKey"]], script.id);
        }
        else {
            script.sourceid = (<string>null);
        }
        if (script == null) {
            logger.error("wrong json: " + JSON.stringify(js));
        }
        if (script.meta == null) {
            script.meta = ({});
        }
        script.promo = js["promo"];
        coll.push(script);
        if (script.rootid == "") {
            script.rootid = script.id;
        }
        let updateObj = updateObjs[i];
        if (updateObj == null) {
            updateObj = ({});
        }
        if (updateObj.hasOwnProperty("scriptTime")) {
            script.updateid = updateObj["scriptId"];
            script.updatetime = updateObj["scriptTime"];
        }
        else {
            script.updateid = script.id;
            script.updatetime = script.time;
        }
        script.updateroot = updateObj["id0"];
        if (script.updateroot == null) {
            script.updateroot = withDefault(updateObj["scriptId"], script.id);
        }
        if (updateObj.hasOwnProperty("pub") && updateObj["pub"].hasOwnProperty("positivereviews")) {
            let count = updateObj["pub"]["positivereviews"];
            script.positivereviews = count;
            script.cumulativepositivereviews = count;
        }
    }
    entities.items = td.arrayToJson(coll);
}

export async function publishScriptCoreAsync(pubScript: PubScript, jsb: JsonBuilder, body: string, req: core.ApiRequest) : Promise<void>
{
    if ( ! jsb.hasOwnProperty("id")) {
        core.progress("publish - gen id, ");
        if (pubScript.ishidden) {
            await core.generateIdAsync(jsb, 10);
        }
        else {
            await core.generateIdAsync(jsb, 6);
        }
    }
    core.progress("publish - gen id done");
    pubScript.id = jsb["id"];
    if (pubScript.rootid == "") {
        pubScript.rootid = pubScript.id;
    }
    // 
    await insertScriptAsync(jsb, pubScript, body, false);
    let jsb2 = clone(jsb);
    delete jsb2["text"];
    let scr = clone(jsb2);
    await audit.logAsync(req, "publish-script", {
        subjectid: scr["pub"]["userid"],
        publicationid: scr["id"],
        publicationkind: "script",
        newvalue: scr
    });
    core.progress("publish - inserted");
    if (td.stringContains(pubScript.description, "#docs")) {
        logger.tick("CreateHashDocsScript");
    }
    if ( ! pubScript.ishidden) {
        await notifications.storeAsync(req, jsb, "");
        core.progress("publish - notified");
    }
    else {
        logger.tick("New_script_hidden");
    }
}

async function canSeeRootpubScriptAsync(req: core.ApiRequest) : Promise<boolean>
{
    let seeIt2: boolean;
    if (core.hasPermission(req.userinfo.json, "global-list")) {
        return true;
    }
    let scr = PubScript.createFromJson(req.rootPub["pub"]);
    if ( ! orFalse(scr.unmoderated) || scr.userid == req.userid) {
        return true;
    }
    else {
        let entry4 = await core.getPubAsync(scr.userid, "user");
        return core.callerSharesGroupWith(req, entry4);
    }
    return seeIt2;
}

async function insertScriptAsync(jsb: JsonBuilder, pubScript: PubScript, scriptText_: string, isImport: boolean) : Promise<void>
{
    pubScript.scripthash = core.sha256(scriptText_).substr(0, 32);
    jsb["pub"] = pubScript.toJson();
    // 
    let updateKey = core.sha256(pubScript.userid + ":" + pubScript.rootid + ":" + pubScript.name);
    let updateEntry = new UpdateEntry();
    updateEntry.PartitionKey = updateKey;
    updateEntry.pub = pubScript.id;
    updateEntry.time = pubScript.time;
    // 
    jsb["updateKey"] = updateKey;
    await scripts.insertAsync(jsb);
    updateEntry.RowKey = jsb["indexId"];
    // 
    let bodyBuilder = clone(pubScript.toJson());
    bodyBuilder["text"] = scriptText_;
    core.progress("publish - about to just insert");
    await scriptText.justInsertAsync(pubScript.id, bodyBuilder);
    // 
    let upslot = await core.getPubAsync(updateKey, "updateslot");
    if (upslot == null) {
        let jsb2 = {};
        jsb2["pub"] = ({ positivereviews: 0 });
        jsb2["id"] = updateKey;
        jsb2["id0"] = updateEntry.pub;
        jsb2["scriptId"] = updateEntry.pub;
        jsb2["scriptTime"] = updateEntry.time;
        core.progress("publish - about to update");
        await updateSlots.insertAsync(jsb2);
    }
    jsb["text"] = scriptText_;
    if ( ! pubScript.ishidden) {
        core.progress("publish - about to update insert");
        await updateSlotTable.insertEntityAsync(updateEntry.toJson(), "or merge");
        core.progress("publish - about to update insert2");
        await core.pubsContainer.updateAsync(updateKey, async (entry: JsonBuilder) => {
            if ( ! entry.hasOwnProperty("id0")) {
                entry["id0"] = withDefault(entry["scriptId"], updateEntry.pub);
            }
            entry["scriptId"] = updateEntry.pub;
            entry["scriptTime"] = updateEntry.time;
        });
    }
    await search.scanAndSearchAsync(jsb, {
        skipSearch: pubScript.ishidden,
        skipScan: isImport
    });
}

async function importScriptAsync(req: core.ApiRequest, body: JsonObject) : Promise<void>
{
    let pubScript = new PubScript();
    pubScript.fromJson(core.removeDerivedProperties(body));
    pubScript.screenshotthumburl = "";
    pubScript.iconurl = "";
    pubScript.screenshoturl = "";
    pubScript.capabilities = (<string[]>[]);
    pubScript.flows = (<string[]>[]);
    pubScript.toptagids = (<string[]>[]);
    pubScript.updateid = "";
    pubScript.updatetime = 0;
    pubScript.baseid = orEmpty(pubScript.baseid);
    pubScript.positivereviews = 0;
    pubScript.cumulativepositivereviews = 0;
    pubScript.screenshots = 0;
    if (pubScript.baseid == "" || pubScript.rootid == "") {
        pubScript.rootid = pubScript.id;
    }

    let jsb = {};
    jsb["id"] = pubScript.id;
    await insertScriptAsync(jsb, pubScript, body["text"], true);
}

export async function initAsync() : Promise<void>
{
    updateSlotTable = await core.tableClient.createTableIfNotExistsAsync("scriptupdates");
    scriptText = await cachedStore.createContainerAsync("scripttext", {
        access: "private"
    });
    updateSlots = await indexedStore.createStoreAsync(core.pubsContainer, "updateslot");
    scripts = await indexedStore.createStoreAsync(core.pubsContainer, "script");
    core.registerPubKind({
        store: scripts,
        deleteWithAuthor: true,
        importOne: importScriptAsync,
        specialDeleteAsync: async (entryid:string, delentry:JsonObject) => {
            await scriptText.updateAsync(entryid, async (entry1: JsonBuilder) => {
                for (let fld of Object.keys(entry1)) {
                    delete entry1[fld];
                }
            });
        },
    })
    await core.setResolveAsync(scripts, async (fetchResult: indexedStore.FetchResult, apiRequest: core.ApiRequest) => {
        await resolveScriptsAsync(fetchResult, apiRequest, false);
    }
    , {
        byUserid: true,
        anonSearch: true
    });
    // ### all
    core.addRoute("GET", "language", "*", async (req: core.ApiRequest) => {
        await core.throttleAsync(req, "tdcompile", 20);
        if (req.status == 200) {
            let s = req.origUrl.replace(/^\/api\/language\//g, "");
            await tdliteTdCompiler.forwardToCloudCompilerAsync(req, "language/" + s);
        }
    });
    core.addRoute("GET", "doctopics", "", async (req1: core.ApiRequest) => {
        let resp = await tdliteTdCompiler.queryCloudCompilerAsync("doctopics");
        req1.response = resp["topicsExt"];
    });
    core.addRoute("GET", "*script", "*", async (req2: core.ApiRequest) => {
        let isTd = ! req2.rootPub["pub"]["editor"];
        if ( ! isTd) {
            req2.status = httpCode._405MethodNotAllowed;
        }
        else {
            await core.throttleAsync(req2, "tdcompile", 20);
            if (req2.status == 200) {
                let path = req2.origUrl.replace(/^\/api\/[a-z]+\//g, "");
                await tdliteTdCompiler.forwardToCloudCompilerAsync(req2, "q/" + req2.rootId + "/" + path);
            }
        }
    });
    core.addRoute("POST", "scripts", "", async (req3: core.ApiRequest) => {
        await core.canPostAsync(req3, "direct-script");
        if (req3.status == 200 && orEmpty(req3.body["text"]).length > 100000) {
            req3.status = httpCode._413RequestEntityTooLarge;
        }

        let rawSrc = orEmpty(req3.body["raw"]);
        if (req3.status == 200 && rawSrc != "") {
            core.checkPermission(req3, "post-raw");
        }
        let forceid = orEmpty(req3.body["forceid"]);
        if (req3.status == 200 && forceid != "") {
            core.checkPermission(req3, "pub-mgmt");
        }

        if (req3.status == 200) {
            let scr = new PubScript();
            let entry3 = await core.getPubAsync(orEmpty(req3.body["baseid"]), "script");
            if (entry3 != null) {
                scr.baseid = entry3["id"];
                scr.rootid = entry3["pub"]["rootid"];
            }
            scr.userid = req3.userid;
            scr.mergeids = (<string[]>[]);
            if (req3.body.hasOwnProperty("mergeids")) {
                scr.mergeids = td.toStringArray(req3.body["mergeids"]);
            }
            scr.name = withDefault(req3.body["name"], "unnamed");
            scr.description = orEmpty(req3.body["description"]);
            scr.iconbackground = withDefault(req3.body["iconbackground"], "#FF7518");
            scr.islibrary = orFalse(req3.body["islibrary"]);
            scr.ishidden = orFalse(req3.body["ishidden"]);
            scr.userplatform = core.getUserPlatforms(req3);
            scr.capabilities = (<string[]>[]);
            scr.flows = (<string[]>[]);
            scr.editor = orEmpty(req3.body["editor"]);
            scr.meta = req3.body["meta"];
            if (typeof scr.meta != "object" || Array.isArray(scr.meta))
                scr.meta = {};
            scr.iconArtId = orEmpty(req3.body["iconArtId"]);
            scr.splashArtId = orEmpty(req3.body["splashArtId"]);
            scr.raw = rawSrc;
            scr.unmoderated = ! core.callerHasPermission(req3, "adult");

            let jsb = {};
            if (forceid != "") {
                jsb["id"] = forceid;
            }
            await publishScriptCoreAsync(scr, jsb, td.toString(req3.body["text"]), req3);
            await core.returnOnePubAsync(scripts, clone(jsb), req3);
        }
    }
    , {
        sizeCheckExcludes: "text"
    });
    core.addRoute("POST", "*script", "", async (req4: core.ApiRequest) => {
        let unmod = td.toBoolean(req4.body["unmoderated"])
        if (unmod != null) {
            await core.checkFacilitatorPermissionAsync(req4, req4.rootPub["pub"]["userid"]);
            if (req4.status == 200) {
                await core.pubsContainer.updateAsync(req4.rootId, async (entry: JsonBuilder) => {
                    entry["pub"]["unmoderated"] = unmod;
                });
                if ( ! unmod) {
                    await notifications.sendAsync(req4.rootPub, "moderated", (<JsonObject>null));
                }
                req4.response = ({});
            }
        }
        else {
            req4.status = httpCode._400BadRequest;
        }
    });
    core.addRoute("POST", "*script", "meta", async (req5: core.ApiRequest) => {
        if ( ! core.callerHasPermission(req5, "script-promo")) {
            core.checkPubPermission(req5);
        }
        await core.canPostAsync(req5, "script-meta");
        if (req5.status == 200) {
            await core.pubsContainer.updateAsync(req5.rootId, async (v: JsonBuilder) => {
                let meta = v["pub"]["meta"];
                if (meta == null) {
                    meta = {};
                }
                else {
                    meta = clone(meta);
                }
                core.copyJson(req5.body, meta);
                for (let k of Object.keys(meta)) {
                    if (meta[k] === null) {
                        delete meta[k];
                    }
                }
                if (JSON.stringify(meta).length > 10000) {
                    req5.status = httpCode._413RequestEntityTooLarge;
                }
                else {
                    v["pub"]["meta"] = meta;
                    req5.response = clone(meta);
                }
            });
            if (req5.rootPub["promo"] != null) {
                await core.flushApiCacheAsync("promo");
            }
        }
    });
    core.addRoute("GET", "*script", "text", async (req6: core.ApiRequest) => {
        if (await canSeeRootpubScriptAsync(req6)) {
            let entry2 = await scriptText.getAsync(req6.rootId);
            req6.response = entry2["text"];
        }
        else {
            req6.status = httpCode._402PaymentRequired;
        }
    });
    core.addRoute("GET", "*script", "canexportapp", async (req7: core.ApiRequest) => {
        req7.response = ({ canExport: false, reason: "App export not supported in Lite." });
    });
    core.addRoute("GET", "*script", "base", async (req8: core.ApiRequest) => {
        let baseId = req8.rootPub["pub"]["baseid"];
        if (baseId == "") {
            req8.status = 404;
        }
        else {
            req8.response = await core.getOnePubAsync(scripts, baseId, req8);
            if (req8.response == null) {
                req8.status = 404;
            }
        }
    });

    core.addRoute("GET", "showcase-scripts", "", async (req9: core.ApiRequest) => {
        if (!lastShowcaseDl || Date.now() - lastShowcaseDl.getTime() > 20000) {
            let js = await td.downloadJsonAsync("https://tdshowcase.blob.core.windows.net/export/current.json");
            showcaseIds = td.toStringArray(js["ids"]) || [];
            lastShowcaseDl = new Date();
        }
        let entities = await scripts.fetchFromIdListAsync(showcaseIds, req9.queryOptions);
        await core.resolveAsync(scripts, entities, req9);        
        core.buildListResponse(entities, req9);
    });
    core.aliasRoute("GET", "featured-scripts", "showcase-scripts");
    core.aliasRoute("GET", "new-scripts", "scripts");
    core.aliasRoute("GET", "top-scripts", "scripts");
    // ### by base
    await scripts.createIndexAsync("baseid", entry1 => withDefault(entry1["pub"]["baseid"], "-"));
    core.addRoute("GET", "*script", "successors", async (req10: core.ApiRequest) => {
        await core.anyListAsync(scripts, req10, "baseid", req10.rootId);
    });
    await scripts.createIndexAsync("scripthash", entry4 => entry4["pub"]["scripthash"]);
    core.addRoute("GET", "scripthash", "*", async (req11: core.ApiRequest) => {
        await core.anyListAsync(scripts, req11, "scripthash", req11.verb);
    });
    await scripts.createIndexAsync("updatekey", entry5 => entry5["updateKey"]);
    core.addRoute("GET", "*script", "updates", async (req12: core.ApiRequest) => {
        await core.anyListAsync(scripts, req12, "updatekey", req12.rootPub["updateKey"]);
    });
    await scripts.createIndexAsync("rootid", entry6 => entry6["pub"]["rootid"]);
    core.addRoute("GET", "*script", "family", async (req13: core.ApiRequest) => {
        await core.anyListAsync(scripts, req13, "rootid", req13.rootPub["pub"]["rootid"]);
    });
    
    if (false)
    core.addRoute("POST", "admin", "reindexscripts", async (req15: core.ApiRequest) => {
        core.checkPermission(req15, "operator");
        if (req15.status == 200) {
            /* async */ scripts.getIndex("all").forAllBatchedAsync("all", 50, async (json: JsonObject) => {
                await parallel.forJsonAsync(json, async (json1: JsonObject) => {
                    let pub = json1["pub"];
                    let r = orFalse(pub["noexternallinks"]);
                    if ( ! r) {
                        let userjson = await core.getPubAsync(pub["userid"], "user");
                        if ( ! core.hasPermission(userjson, "external-links")) {
                            logger.debug("noexternallink -> true on " + json1["id"]);
                            await scripts.container.updateAsync(json1["id"], async (entry7: JsonBuilder) => {
                                entry7["pub"]["noexternallinks"] = true;
                            });
                        }
                    }
                });
            });
            req15.response = ({});
        }
    });

    await initPromoAsync();
}

async function clearScriptCountsAsync(script: PubScript) : Promise<void>
{
    script.screenshots = 0;
    script.comments = 0;
    await core.pubsContainer.updateAsync(script.id, async (entry: JsonBuilder) => {
        entry["pub"]["screenshots"] = 0;
        entry["pub"]["comments"] = 0;
    });
}

async function initPromoAsync() : Promise<void>
{
    promosTable = await core.tableClient.createTableIfNotExistsAsync("promos");
    await scripts.createCustomIndexAsync("promo", promosTable);
    core.addRoute("GET", "promo-scripts", "*", async (req: core.ApiRequest) => {
        await core.anyListAsync(scripts, req, "promo", req.verb);
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
                let pubScript = PubScript.createFromJson(req3.rootPub["pub"]);
                coll.push(pubScript.editor);
                d[withDefault(pubScript.editor, "touchdevelop")] = "1";
                if (td.stringContains(pubScript.description, "#docs")) {
                    d["docs"] = "1";
                }
            }
            jsb2["tags"] = td.arrayToJson(Object.keys(d));
        }
        promo = clone(jsb2);
        let offsetHours = Math.round(td.clamp(-200000, 1000000, core.orZero(promo["priority"])));
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


