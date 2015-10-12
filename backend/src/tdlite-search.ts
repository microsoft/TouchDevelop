/// <reference path='../typings/node/node.d.ts' />

'use strict';

import * as td from './td';
import * as assert from 'assert';

type JsonObject = td.JsonObject;
type JsonBuilder = td.JsonBuilder;

var asArray = td.asArray;

import * as azureSearch from "./azure-search"
import * as acs from "./acs"
import * as cachedStore from "./cached-store"
import * as indexedStore from "./indexed-store"
import * as core from "./tdlite-core"
import * as tdliteIndex from "./tdlite-index"
import * as tdliteScripts from "./tdlite-scripts"
import * as tdliteAbuse from "./tdlite-abuse"


var orEmpty = td.orEmpty;
var logger = core.logger;
var httpCode = core.httpCode;

export var disableSearch: boolean = false;
var acsCallbackToken: string = "";
var acsCallbackUrl: string = "";

export interface IScanAndSearchOptions {
    skipSearch?: boolean;
    skipScan?: boolean;
}

export async function scanAndSearchAsync(obj: JsonBuilder, options_: IScanAndSearchOptions = {}) : Promise<void>
{
    if (disableSearch) {
        options_.skipSearch = true;
    }
    if (acsCallbackUrl == "" || ! tdliteAbuse.canHaveAbuseReport(obj["kind"])) {
        options_.skipScan = true;
    }
    if (options_.skipScan && options_.skipSearch) {
        return;
    }
    logger.debug("inserting pub into search: " + obj["id"]);

    let store = indexedStore.storeByKind(obj["kind"]);
    let fetchResult = store.singleFetchResult(td.clone(obj));
    await core.resolveAsync(store, fetchResult, core.adminRequest);
    let pub = fetchResult.items[0];
    let body = orEmpty(core.withDefault(pub["text"], obj["text"]));
    
    if (body == "" && store.kind == "script") {
        let entry2 = await tdliteScripts.getScriptTextAsync(pub["id"]);
        if (entry2 != null) {
            body = entry2["text"];
        }
    }
    
    // ## search
    if ( ! options_.skipSearch) {
        let batch = tdliteIndex.createPubsUpdate();
        let entry = tdliteIndex.toPubEntry(pub, body, pubFeatures(pub), 0);
        entry.upsertPub(batch);
        /* async */ batch.sendAsync();
    }
    // ## scan
    if ( ! options_.skipScan) {
        let text = body;
        for (let fldname of ["name", "description", "about", "grade", "school"]) {
            text = text + " " + orEmpty(pub[fldname]);
        }
        /* async */ acs.validateTextAsync(pub["id"], text, acsCallbackUrl);
        let picurl = orEmpty(pub["pictureurl"]);
        if (picurl != "") {
            /* async */ acs.validatePictureAsync(pub["id"], picurl, acsCallbackUrl);
        }
    }
}

/**
 * {action:ignoreReturn}
 */
export async function updateAndUpsertAsync(container: cachedStore.Container, req: core.ApiRequest, update:td.Action1<JsonBuilder>) : Promise<JsonBuilder>
{
    let bld: JsonBuilder;
    let last = {}
    await container.updateAsync(req.rootId, async (entry: JsonBuilder) => {
        await update(entry);
        last = entry;
    });
    await scanAndSearchAsync(last);
    return last;
}

export async function initAsync() : Promise<void>
{
    disableSearch = orEmpty(td.serverSetting("DISABLE_SEARCH", true)) == "true";
    core.executeSearchAsync = executeSearchAsync;

    await initAcsAsync();

    azureSearch.init({
        allow_409: true
    });

    core.addRoute("GET", "search", "", async (req: core.ApiRequest) => {
        // this may be a bit too much to ask
        core.checkPermission(req, "global-list");
        if (req.status == 200) {
            await executeSearchAsync("", orEmpty(req.queryOptions["q"]), req);
        }
    });
    core.addRoute("POST", "search", "reindexdocs", async (req1: core.ApiRequest) => {
        core.checkPermission(req1, "operator");
        if (req1.status == 200) {
            // /* async */ tdliteIndex.indexDocsAsync();
            req1.response = ({});
        }
    });
    
    core.addRoute("DELETE", "admin", "searchindex", async (req: core.ApiRequest) => {
        core.checkPermission(req, "operator");
        if (req.status == 200) {
            await tdliteIndex.clearPubIndexAsync();
            req.response = { msg: "Gone." }            
        }
    });
    
    core.addRoute("POST", "admin", "reindex", async (req: core.ApiRequest) => {
        core.checkPermission(req, "operator");
        if (req.status != 200) return;
        let store = indexedStore.storeByKind(req.argument);
        if (!store) {
            req.status = httpCode._404NotFound;
            return;
        }
        
        let lst = await store.getIndex("all").fetchAsync("all", req.queryOptions);
        req.response = {
            continuation: lst.continuation,
            itemCount: lst.items.length,
            itemsReindexed: 0
        }           
        await reindexEntriesAsync(store, lst.items, req);
    });
}

async function reindexEntriesAsync(store: indexedStore.Store, json: JsonObject[], req: core.ApiRequest): Promise<void> {
    let batch = tdliteIndex.createPubsUpdate();
    let fetchResult = store.singleFetchResult(json);
    fetchResult.items = json;
     
    await core.resolveAsync(store, fetchResult, core.adminRequest);        
    let fieldname = "id";
    let isPtr = store.kind == "pointer";
    if (isPtr) {
        fieldname = "scriptid";
    }
    if (store.kind == "script" || isPtr) {
        fetchResult.items = fetchResult.items.filter(pub => {
            if (pub["updateroot"] && pub["updateid"] != pub["id"]) {
                // only insert the latest version
                return false;
            }
            if (pub["ishidden"]) {
                return false; // always skip hidden scripts
            }
            
            return true;            
        })        
        let coll = fetchResult.items.map<string>(elt => orEmpty(elt[fieldname])).filter(elt1 => elt1 != "");
        let bodies = {};
        let entries = await tdliteScripts.getScriptTextsAsync(coll);
        for (let js2 of entries) {
            if (js2.hasOwnProperty("id")) {
                bodies[js2["id"]] = js2["text"];
            }
        }
                
        for (let pub of fetchResult.items) {
            let body = orEmpty(bodies[orEmpty(pub[fieldname])]);            
            let entry = tdliteIndex.toPubEntry(pub, body, pubFeatures(pub), 0);
            req.response["itemsReindexed"]++;
            entry.upsertPub(batch);
        }
    }
    else {
        for (let pub1 of fetchResult.items) {
            let entry2 = tdliteIndex.toPubEntry(pub1, core.withDefault(pub1["text"], ""), pubFeatures(pub1), 0);
            req.response["itemsReindexed"]++;
            entry2.upsertPub(batch);
        }
    }
    if (batch.actionCount() > 0) {
        let statusCode = await batch.sendAsync();
        logger.debug("reindex pubs, status: " + statusCode);
    }
}

function pubFeatures(pub: JsonObject) : string[]
{    
    let features = <string[]>[];
    if (pub["kind"] == "script") {
        if (pub["islibrary"]) {
            features.push("library");
        }
    }
    return features;
}
 

export async function executeSearchAsync(kind: string, q: string, req: core.ApiRequest) : Promise<void>
{
    let query = tdliteIndex.toPubQuery("pubs1", kind, q);
    query.scoringProfile = "pubs";
    let qurl = query.toUrl();
    let request = azureSearch.createRequest(qurl);
    let response = await request.sendAsync();
    let js = response.contentAsJson();
    let ids = (<string[]>[]);
    if (js["value"] == null) {
        logger.debug("js: " + qurl + " -> " + JSON.stringify(js, null, 2));
    }
    for (let js2 of js["value"]) {
        ids.push(js2["id"]);
    }
    let fetchResult2 = await tdliteScripts.scripts.fetchFromIdListAsync(ids, req.queryOptions);
    let jsons = asArray(fetchResult2.items);
    if ( ! core.callerHasPermission(req, "global-list")) {
        jsons = jsons.filter(elt => core.isAbuseSafe(elt));
    }
    let bykind = {};
    for (let ent of jsons) {
        let lst = bykind[ent["kind"]];
        if (lst == null) {
            lst = ([]);
            bykind[ent["kind"]] = lst;
        }
        lst.push(ent);
    }
    let byid = {};
    for (let knd of Object.keys(bykind)) {
        fetchResult2.items = bykind[knd];
        let store = indexedStore.storeByKind(knd);
        let fld = "id";
        if (knd == "script") {
            await tdliteScripts.resolveScriptsAsync(fetchResult2, req, true);
            fld = "sourceid";
        }
        else {
            await core.resolveAsync(store, fetchResult2, req);
        }
        for (let s of fetchResult2.items) {
            byid[s[fld]] = s;
        }
    }
    fetchResult2.items = td.arrayToJson(ids.map<JsonBuilder>(elt1 => byid[elt1]).filter(elt2 => elt2 != null));
    core.buildListResponse(fetchResult2, req);
}

async function initAcsAsync() : Promise<void>
{
    if (false && core.hasSetting("ACS_PASSWORD")) {
        acsCallbackToken = core.sha256(core.tokenSecret + ":acs");
        acsCallbackUrl = core.self + "api/acscallback?token=" + acsCallbackToken + "&anon_token=" + encodeURIComponent(core.basicCreds);
        await acs.initAsync();
    }
    core.addRoute("POST", "acscallback", "", async (req: core.ApiRequest) => {
        if (core.withDefault(req.queryOptions["token"], "none") == acsCallbackToken) {
            let jobid = orEmpty(req.body["JobId"]);
            let results = req.body["Results"];
            for (let stat of results) {
                if (stat["Status"] == "3000") {
                    let pubid = stat["Id"];
                    if (stat["Safe"]) {
                        logger.debug("acsok: " + JSON.stringify(stat, null, 2));
                        await core.pubsContainer.updateAsync(pubid, async (entry: JsonBuilder) => {
                            entry["acsJobId"] = jobid;
                        });
                    }
                    else {
                        logger.info("acsflag: " + JSON.stringify(stat, null, 2));
                        await core.pubsContainer.updateAsync(pubid, async (entry1: JsonBuilder) => {
                            entry1["acsFlag"] = stat;
                            entry1["acsJobId"] = jobid;
                        });
                        await core.refreshSettingsAsync();
                        let uid = orEmpty(core.serviceSettings.accounts["acsreport"]);
                        if (uid != "") {
                            await core.setReqUserIdAsync(req, uid);
                            req.rootPub = await core.pubsContainer.getAsync(pubid);
                            if (core.isGoodEntry(req.rootPub)) {
                                let jsb = {};
                                jsb["text"] = "ACS flagged, policy codes " + JSON.stringify(stat["PolicyCodes"]);
                                req.body = td.clone(jsb);
                                req.rootId = pubid;
                                await tdliteAbuse.postAbusereportAsync(req);
                            }
                        }
                    }
                }
                else {
                    logger.warning("bad results from ACS: " + JSON.stringify(req.body, null, 2));
                }
            }
            req.response = ({});
        }
        else {
            logger.debug("acs, wrong token: " + JSON.stringify(req.queryOptions));
            req.status = httpCode._402PaymentRequired;
        }
    });
}

function acsValidatePub(jsb: JsonBuilder) : void
{
    if (acsCallbackUrl == "") {
        return;
    }
}
