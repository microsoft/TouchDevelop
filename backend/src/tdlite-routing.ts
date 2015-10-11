/// <reference path='../typings/node/node.d.ts' />

'use strict';

import * as td from './td';
import * as assert from 'assert';

type JsonObject = td.JsonObject;
type JsonBuilder = td.JsonBuilder;


import * as restify from "./restify"
import * as parallel from "./parallel"

import * as core from "./tdlite-core"

var orEmpty = td.orEmpty;
var logger = core.logger;
var httpCode = restify.http();


export async function performBatchAsync(req: core.ApiRequest) : Promise<void>
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
    let apiRequest = core.buildApiRequest(core.withDefault(inpReq["relative_url"], "/no-such-url"));
    apiRequest.method = core.withDefault(inpReq["method"], "GET").toUpperCase();
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

export async function performRoutingAsync(req: restify.Request, res: restify.Response) : Promise<void>
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
        sendResponse(apiRequest, req, res);
    }
}

function sendResponse(apiRequest: core.ApiRequest, req: restify.Request, res: restify.Response) : void
{
    if (apiRequest.status != 200) {
        if (apiRequest.status == httpCode._401Unauthorized) {
            res.sendError(httpCode._403Forbidden, "Invalid or missing ?access_token=...");
        }
        else if (apiRequest.status == httpCode._402PaymentRequired) {
            res.sendCustomError(httpCode._402PaymentRequired, "Your account is not authorized to perform this operation.");
        }
        else {
            res.sendError(apiRequest.status, "");
        }
    }
    else if (apiRequest.response == null) {
        assert(false, "response unset");
    }
    else {
        let etag = core.computeEtagOfJson(apiRequest.response);
        if (apiRequest.method == "GET" && orEmpty(req.header("If-None-Match")) == etag) {
            res.sendError(httpCode._304NotModified, "");
            return;
        }
        res.setHeader("ETag", etag);
        if ( ! apiRequest.isCached) {
            res.setHeader("Cache-Control", "no-cache, no-store");
        }
        if (apiRequest.headers != null) {
            for (let hd of Object.keys(apiRequest.headers)) {
                res.setHeader(hd, apiRequest.headers[hd]);
            }
        }
        if (typeof apiRequest.response == "string") {
            res.setHeader("X-Content-Type-Options", "nosniff");
            res.sendText(td.toString(apiRequest.response), core.withDefault(apiRequest.responseContentType, "text/plain"));
        }
        else {
            res.json(apiRequest.response);
        }
    }
}

