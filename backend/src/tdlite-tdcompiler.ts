/// <reference path='../typings/node/node.d.ts' />

'use strict';

import * as td from './td';
import * as assert from 'assert';

type JsonObject = td.JsonObject;
type JsonBuilder = td.JsonBuilder;

var asArray = td.asArray;

import * as cachedStore from "./cached-store"
import * as parallel from "./parallel"
import * as core from "./tdlite-core"
import * as tdliteScripts from "./tdlite-scripts"
import * as tdliteReleases from "./tdlite-releases"
import * as tdliteImport from "./tdlite-import"

var orEmpty = td.orEmpty;

var logger = core.logger;
var httpCode = core.httpCode;
var cacheCompiler: cachedStore.Container;
var doctopics: JsonObject;
var doctopicsByTopicid: JsonObject;
export var doctopicsCss: string = "";
var cloudRelid: string = "";

export async function initAsync()
{
    cacheCompiler = await cachedStore.createContainerAsync("cachecompiler", {
        redisCacheSeconds: 600
    });
    core.addRoute("POST", "importdocs", "", async (req4: core.ApiRequest) => {
        core.checkPermission(req4, "root");
        if (req4.status == 200) {
            await importDoctopicsAsync(req4);
        }
    });
}

export async function forwardToCloudCompilerAsync(req: core.ApiRequest, api: string) : Promise<void>
{
    let resp = await queryCloudCompilerAsync(api);
    if (resp == null) {
        req.status = httpCode._400BadRequest;
    }
    else {
        req.response = resp;
    }
}

export async function queryCloudCompilerAsync(api: string) : Promise<JsonObject>
{
    let resp: JsonObject;
    let js = (<JsonObject>null);
    let canCache = /^[\w\/]+$/.test(api);
    if (canCache) {
        js = await cacheCompiler.getAsync(api);
    }
    let ver = await core.getCloudRelidAsync(false);
    if (js != null && js["version"] == ver) {
        resp = js["resp"];
    }
    else {
        let url = td.serverSetting("TDC_ENDPOINT", false).replace(/-tdevmgmt-.*/g, "") + api + "?access_token=" + td.serverSetting("TDC_AUTH_KEY", false);
        let request = td.createRequest(url);
        logger.debug("cloud compiler: " + api);
        let response = await request.sendAsync();
        if (response.statusCode() == 200) {
            if (td.startsWith(response.header("content-type"), "application/json")) {
                resp = response.contentAsJson();
            }
            else {
                resp = response.content();
            }
        }
        else {
            resp = (<JsonObject>null);
            canCache = false;
        }
        logger.debug(JSON.stringify(td.arrayToJson(response.headerNames())));
        if (canCache && response.header("X-TouchDevelop-RelID") == ver) {
            let jsb = {};
            jsb["version"] = ver;
            if (resp != null) {
                jsb["resp"] = resp;
            }
            await cacheCompiler.justInsertAsync(api, jsb);
        }
    }
    return resp;
}

/**
 * TODO include access token for the compile service
 */
export async function deployCompileServiceAsync(rel: tdliteReleases.PubRelease, req: core.ApiRequest) : Promise<void>
{
    let cfg = {};
    let clientConfig = tdliteReleases.clientConfigForRelease(rel);
    cfg["TDC_AUTH_KEY"] = td.serverSetting("TDC_AUTH_KEY", false);
    cfg["TDC_ACCESS_TOKEN"] = td.serverSetting("TDC_ACCESS_TOKEN", false);
    cfg["TDC_LITE_STORAGE"] = tdliteReleases.appContainerUrl().replace(/\/[^\/]+$/g, "");
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
            "url": tdliteReleases.appContainerUrl() + "/" + rel.releaseid + "/c/noderunner.js"
        }] 
    };
    let file = {};        
    if (false) {
        logger.debug("cloud JS: " + JSON.stringify(td.clone(jsb), null, 2));
    }

    let request = td.createRequest(td.serverSetting("TDC_ENDPOINT", false) + "deploy");
    request.setMethod("post");
    request.setContentAsJson(td.clone(jsb));
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

export async function cacheCloudCompilerDataAsync(ver: string) : Promise<void>
{
    if (cloudRelid != ver) {
        let resp2 = /* async */ queryCloudCompilerAsync("css");
        doctopics = (await queryCloudCompilerAsync("doctopics"))["topicsExt"];
        let jsb = {};
        for (let js of asArray(doctopics)) {
            jsb[js["id"]] = js;
        }
        doctopicsByTopicid = td.clone(jsb);
        doctopicsCss = (await resp2)["css"];
        cloudRelid = ver;
    }
}

async function importDoctopicsAsync(req: core.ApiRequest) : Promise<void>
{
    await cacheCloudCompilerDataAsync(await core.getCloudRelidAsync(true));
    let ids = asArray(doctopics).map<string>(elt => orEmpty(elt["scriptId"])).filter(elt1 => elt1 != "");
    let fetchResult = await tdliteScripts.scripts.fetchFromIdListAsync(ids, (<JsonObject>null));
    let jsb = {};
    for (let s of ids) {
        jsb[s] = true;
    }
    for (let js of fetchResult.items) {
        delete jsb[js["id"]];
    }

    let resp = new tdliteImport.RecImportResponse();
    resp.ids = {};
    ids = Object.keys(jsb);
    await parallel.forAsync(ids.length, async (x: number) => {
        await tdliteImport.importRecAsync(resp, ids[x]);
    });
    req.response = resp.toJson();
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

