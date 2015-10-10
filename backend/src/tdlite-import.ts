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

import * as azureBlobStorage from "./azure-blob-storage"
import * as cachedStore from "./cached-store"
import * as parallel from "./parallel"
import * as indexedStore from "./indexed-store"
import * as restify from "./restify"
import * as core from "./tdlite-core"
import * as tdliteScripts from "./tdlite-scripts"
import * as tdliteWorkspace from "./tdlite-workspace"
import * as tdliteData from "./tdlite-data"
import * as audit from "./tdlite-audit"
import * as search from "./tdlite-search"
import * as notifications from "./tdlite-notifications"
import * as main from "./tdlite"
import * as tdliteTdCompiler from "./tdlite-tdcompiler"

export type StringTransformer = (text: string) => Promise<string>;

var withDefault = core.withDefault;
var orEmpty = td.orEmpty;

var logger = core.logger;
var httpCode = core.httpCode;
var importRunning: boolean = false;

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


export async function initAsync() : Promise<void>
{
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
    core.addRoute("POST", "recimport", "*", async (req3: core.ApiRequest) => {
        core.checkPermission(req3, "root");
        let id = req3.verb;
        if (req3.status == 200 && ! /^[a-z]+$/.test(id)) {
            req3.status = httpCode._412PreconditionFailed;
        }
        if (req3.status == 200) {
            let resp = new RecImportResponse();
            resp.ids = {};
            resp.force = core.orFalse(req3.queryOptions["force"]);
            resp.fulluser = core.orFalse(req3.queryOptions["fulluser"]);
            await importRecAsync(resp, id);
            req3.response = resp.toJson();
        }
    });
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
        let r = core.orZero(entry1["start"]);
        entry1["start"] = Math.max(r, lastTime);
    });
    req.response = clone(resp);
}

export async function importOneAnythingAsync(js: JsonObject) : Promise<core.ApiRequest>
{
    let apiRequest: core.ApiRequest;
    let entry = await core.pubsContainer.getAsync(js["id"]);
    apiRequest = new core.ApiRequest();
    apiRequest.status = 200;
    if ( ! core.isGoodEntry(entry)) {
        let kind = orEmpty(js["kind"])
        let desc = core.getPubKind(kind)

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

export async function importRecAsync(resp: RecImportResponse, id: string) : Promise<void>
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
    if (core.orZero(js[kind]) > 0) {
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

