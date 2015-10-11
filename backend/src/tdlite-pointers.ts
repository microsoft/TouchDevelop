/// <reference path='../typings/node/node.d.ts' />

'use strict';

import * as td from './td';
import * as assert from 'assert';

type JsonObject = td.JsonObject;
type JsonBuilder = td.JsonBuilder;

var asArray = td.asArray;

import * as parallel from "./parallel"
import * as restify from "./restify"
import * as indexedStore from "./indexed-store"
import * as core from "./tdlite-core"
import * as tdliteScripts from "./tdlite-scripts"
import * as audit from "./tdlite-audit"
import * as search from "./tdlite-search"
import * as notifications from "./tdlite-notifications"
import * as tdliteTdCompiler from "./tdlite-tdcompiler"
import * as tdliteDocs from "./tdlite-docs"
import * as tdliteReleases from "./tdlite-releases"
import * as tdliteArt from "./tdlite-art"

export type StringTransformer = (text: string) => Promise<string>;

var withDefault = core.withDefault;
var orEmpty = td.orEmpty;

var logger = core.logger;
var httpCode = core.httpCode;

var pointers: indexedStore.Store;
var deployChannels: string[];
export var templateSuffix: string = "";

export class PubPointer
    extends td.JsonRecord
{
    @td.json public kind: string = "";
    @td.json public time: number = 0;
    @td.json public id: string = "";
    @td.json public path: string = "";
    @td.json public scriptid: string = "";
    @td.json public artid: string = "";
    @td.json public redirect: string = "";
    @td.json public description: string = "";
    @td.json public userid: string = "";
    @td.json public username: string = "";
    @td.json public userscore: number = 0;
    @td.json public userhaspicture: boolean = false;
    @td.json public userplatform: string[];
    @td.json public comments: number = 0;
    @td.json public artcontainer: string = "";
    @td.json public parentpath: string = "";
    @td.json public scriptname: string = "";
    @td.json public scriptdescription: string = "";
    @td.json public breadcrumbtitle: string = "";
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

export async function initAsync() : Promise<void>
{
    deployChannels = withDefault(td.serverSetting("CHANNELS", false), core.myChannel).split(",");
    templateSuffix = orEmpty(td.serverSetting("TEMPLATE_SUFFIX", true));

    // TODO cache compiler queries (with expiration)
    pointers = await indexedStore.createStoreAsync(core.pubsContainer, "pointer");
    core.registerPubKind({
        store: pointers,
        deleteWithAuthor: true,
        specialDeleteAsync: clearPtrCacheAsync,
    })
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
    core.addRoute("GET", "*script", "cardinfo", async (req14: core.ApiRequest) => {
        let jsb1 = await getCardInfoAsync(req14, req14.rootPub);
        req14.response = td.clone(jsb1);
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
                        newvalue: td.clone(jsb1)
                    });
                    await core.returnOnePubAsync(pointers, td.clone(jsb1), req);
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
            td.jsonCopyFrom(jsb2, td.clone(v));
            td.jsonCopyFrom(v, td.clone(jsb2));
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
                        ref = td.clone(entry1);
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
        let entry1 = await tdliteScripts.getScriptTextAsync(sid["id"]);
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
            newvalue: td.clone(bld)
        });
        await clearPtrCacheAsync(req.rootId);
        await core.returnOnePubAsync(pointers, td.clone(bld), req);
    }
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
            let textObj = await tdliteScripts.getScriptTextAsync(scriptjs["id"]);
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
                let resp3 = await tdliteTdCompiler.queryCloudCompilerAsync("q/" + scriptjs["id"] + "/string-art");
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
        await tdliteReleases.cacheRewritten.updateAsync("ptrcache/" + id, async (entry: JsonBuilder) => {
            entry["version"] = "outdated";
        });
    }
    for (let chname of deployChannels) {
        await tdliteReleases.cacheRewritten.updateAsync("ptrcache/" + chname + "/" + id, async (entry1: JsonBuilder) => {
            entry1["version"] = "outdated";
        });
        if ( ! /@\w+$/.test(id)) {
            await core.refreshSettingsAsync();
            for (let lang of Object.keys(core.serviceSettings.langs)) {
                await tdliteReleases.cacheRewritten.updateAsync("ptrcache/" + chname + "/" + id + "@" + lang, async (entry2: JsonBuilder) => {
                    entry2["version"] = "outdated";
                });
            }
        }
    }
    if (td.startsWith(id, "ptr-templates-")) {
        await tdliteReleases.pokeReleaseAsync("cloud", 0);
    }
}

function fixupTDHtml(html: string): string
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
            let entry = await tdliteScripts.getScriptTextAsync(scriptjs["id"]);
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
            let resp2 = await tdliteTdCompiler.queryCloudCompilerAsync("q/" + scriptjs["id"] + "/raw-docs" + allowlinks);
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


async function rewriteAndCachePointerAsync(id: string, res: restify.Response, rewrite:td.Action1<JsonBuilder>) : Promise<void>
{
    let path = "ptrcache/" + core.myChannel + "/" + id;
    let entry2 = await tdliteReleases.cacheRewritten.getAsync(path);
    let ver = await core.getCloudRelidAsync(true);

    let event = "ServePtr";
    let cat = "other";
    if (id == "ptr-home") {
        cat = "home";
    }
    else if (td.startsWith(id, "ptr-preview-")) {
        cat = "preview";
    }
    if (entry2 == null || entry2["version"] != ver || core.orZero(entry2["expiration"]) > 0 && entry2["expiration"] < await core.nowSecondsAsync()) {
        let lock = await core.acquireCacheLockAsync(path);
        if (lock == "") {
            await rewriteAndCachePointerAsync(id, res, rewrite);
            return;
        }

        await tdliteTdCompiler.cacheCloudCompilerDataAsync(ver);

        let jsb = {};
        jsb["contentType"] = "text/html";
        jsb["version"] = ver;
        jsb["expiration"] = await core.nowSecondsAsync() + td.randomRange(2000, 3600);
        jsb["status"] = 200;
        await rewrite(jsb);
        entry2 = td.clone(jsb);

        if (jsb["version"] == ver) {
            await tdliteReleases.cacheRewritten.updateAsync(path, async (entry: JsonBuilder) => {
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
        let status0 = core.orZero(entry2["status"]);
        if (status0 == 0) {
            status0 = 200;
        }
        if (false) {
            res.setHeader("X-TDlite-cache", event);
        }
        res.sendText(entry2["text"], entry2["contentType"], {
            status: status0
        });
        if (core.orFalse(entry2["error"])) {
            cat = "error";
        }
        logger.debug("serve ptr2: " + event + " " + cat + " " + path);
        logger.measure(event + "@" + cat, logger.contextDuration());
    }
    else {
        res.redirect(302, redir);
    }
}

export async function servePointerAsync(req: restify.Request, res: restify.Response) : Promise<void>
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
                /*
                let docid = fn.replace(/^docs\//g, "");
                let doctopic = doctopicsByTopicid[docid];
                if (doctopic != null) {
                    pubdata = td.clone(doctopic);
                    let html = topicList(doctopic, "", "");
                    pubdata["topiclist"] = html;
                    let resp = await tdliteTdCompiler.queryCloudCompilerAsync(fn);
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
                */
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

        pubdata["css"] = tdliteTdCompiler.doctopicsCss;
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


export async function getCardInfoAsync(req: core.ApiRequest, pubJson: JsonObject) : Promise<JsonBuilder>
{
    let jsb2: JsonBuilder;
    let js3 = await core.resolveOnePubAsync(tdliteScripts.scripts, pubJson, req);
    if (js3 == null) {
        return {};
    }
    let scr = tdliteScripts.PubScript.createFromJson(js3);
    let jsb = td.clone(js3);
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


export async function handleLanguageAsync(req: restify.Request, res: restify.Response, setCookie: boolean) : Promise<string>
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

export async function simplePointerCacheAsync(urlPath: string, lang: string) : Promise<string>
{
    let text: string;
    let versionMarker = "simple3";
    urlPath = urlPath + templateSuffix;
    let id = core.pathToPtr(urlPath);
    let path = "ptrcache/" + core.myChannel + "/" + id + lang;
    let entry2 = await tdliteReleases.cacheRewritten.getAsync(path);
    if (entry2 == null || orEmpty(entry2["version"]) != versionMarker) {
        let jsb2 = {};
        jsb2["version"] = versionMarker;
        let r = await getTemplateTextAsync(urlPath, lang);
        jsb2["text"] = orEmpty(r);
        entry2 = td.clone(jsb2);
        await tdliteReleases.cacheRewritten.updateAsync(path, async (entry: JsonBuilder) => {
            core.copyJson(entry2, entry);
        });
    }
    return orEmpty(entry2["text"]);
    return text;
}

