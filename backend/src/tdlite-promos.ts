/// <reference path='../typings/node/node.d.ts' />

'use strict';

import * as td from './td';
import * as assert from 'assert';

type JsonObject = td.JsonObject;
type JsonBuilder = td.JsonBuilder;

var asArray = td.asArray;

import * as azureTable from "./azure-table"
import * as parallel from "./parallel"
import * as core from "./tdlite-core"
import * as tdliteScripts from "./tdlite-scripts"
import * as tdliteSearch from "./tdlite-search"
import * as tdliteIndex from "./tdlite-index"


var orEmpty = td.orEmpty;
var logger = core.logger;
var httpCode = core.httpCode;

var promosTable: azureTable.Table;

export async function initAsync() : Promise<void>
{
    promosTable = await core.tableClient.createTableIfNotExistsAsync("promos");
    await tdliteScripts.scripts.createCustomIndexAsync("promo", promosTable);
    core.addRoute("GET", "promo-scripts", "*", async (req: core.ApiRequest) => {
        await core.anyListAsync(tdliteScripts.scripts, req, "promo", req.verb);
    }, {
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
                let ok = await promosTable.tryDeleteEntityAsync(td.clone(entity));
            });
        }
        let jsb2 = td.clone(promo);
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
                d[core.withDefault(pubScript.editor, "touchdevelop")] = "1";
                if (td.stringContains(pubScript.description, "#docs")) {
                    d["docs"] = "1";
                }
            }
            jsb2["tags"] = td.arrayToJson(Object.keys(d));
        }
        promo = td.clone(jsb2);
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
            await promosTable.insertEntityAsync(td.clone(entity1), "or merge");
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

export async function reindexAsync(req: core.ApiRequest)
{
    let store = tdliteScripts.scripts;
    let lst = await store.getIndex("promo").fetchAsync("all", req.queryOptions);
    
    req.response = {
        continuation: lst.continuation,
        itemCount: lst.items.length,
        itemsReindexed: 0
    }
    
    await core.resolveAsync(store, lst, core.emptyRequest);
    
    let batch = tdliteIndex.createPubsUpdate();
    
    await parallel.forJsonAsync(lst.items, async (e) => {    
        let jtxt = await tdliteScripts.getScriptTextAsync(e["id"]) || {}
        let secondary = await tdliteSearch.secondarySearchEntryAsync(e, jtxt["text"] || "");
        if (secondary) {
            let entry2 = tdliteIndex.toPubEntry(secondary, secondary["body"], [], 0);
            entry2.upsertPub(batch);
            req.response["itemsReindexed"]++;
        }        
    })
    
    await batch.sendAsync();
}
