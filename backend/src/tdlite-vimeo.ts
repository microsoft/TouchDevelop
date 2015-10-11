/// <reference path='../typings/node/node.d.ts' />

'use strict';

import * as td from './td';
import * as assert from 'assert';

type JsonObject = td.JsonObject;
type JsonBuilder = td.JsonBuilder;

var asArray = td.asArray;
var json = td.json;
var clone = td.clone;

import * as azureBlobStorage from "./azure-blob-storage"
import * as restify from "./restify"
import * as cachedStore from "./cached-store"
import * as indexedStore from "./indexed-store"
import * as core from "./tdlite-core"

var orFalse = core.orFalse;
var withDefault = core.withDefault;
var orEmpty = td.orEmpty;

var logger = core.logger;
var httpCode = core.httpCode;

var videoContainer: azureBlobStorage.Container;
var videoStore: indexedStore.Store;
var embedThumbnails: cachedStore.Container;


export class PubVideo
    extends td.JsonRecord
{
    @json public kind: string = "";
    @json public time: number = 0;
    @json public id: string = "";
    @json public provider: string = "";
    @json public providerid: string = "";
    @json public blobid: string = "";
    @json public sdvideourl: string = "";
    @json public thumb512url: string = "";
    @json public thumb128url: string = "";
    static createFromJson(o:JsonObject) { let r = new PubVideo(); r.fromJson(o); return r; }
}

export interface IPubVideo {
    kind: string;
    time: number;
    id: string;
    provider: string;
    providerid: string;
    blobid: string;
    sdvideourl: string;
    thumb512url: string;
    thumb128url: string;
}

export async function initAsync() : Promise<void>
{
    videoContainer = await core.blobService.createContainerIfNotExistsAsync("cachevideo", "hidden");
    videoStore = await indexedStore.createStoreAsync(core.pubsContainer, "video");
    await core.setResolveAsync(videoStore, async (fetchResult: indexedStore.FetchResult, apiRequest: core.ApiRequest) => {
        let coll = (<PubVideo[]>[]);
        for (let js of fetchResult.items) {
            let vid = PubVideo.createFromJson(js["pub"]);
            vid.sdvideourl = core.currClientConfig.primaryCdnUrl + "/cachevideo/" + vid.blobid + "-sd";
            vid.thumb128url = core.currClientConfig.primaryCdnUrl + "/cachevideo/" + vid.blobid + "-thumb128";
            vid.thumb512url = core.currClientConfig.primaryCdnUrl + "/cachevideo/" + vid.blobid + "-thumb512";
            coll.push(vid);
        }
        fetchResult.items = td.arrayToJson(coll);
    });
    core.addRoute("DELETE", "*video", "", async (req: core.ApiRequest) => {
        core.checkPermission(req, "root-ptr");
        if (req.status == 200) {
            let delok = await core.deleteAsync(req.rootPub);
            req.response = ({});
        }
    });
    restify.server().get("/vimeo/:id/:endpoint", async (req1: restify.Request, res: restify.Response) => {
        let referer = orEmpty(req1.header("referer")).toLowerCase();
        if (referer == "" || td.startsWith(referer, core.self) || td.startsWith(referer, "http://localhost:")) {
            // ok, referer checked
        }
        else {
            res.sendCustomError(httpCode._402PaymentRequired, "Bad referer");
            return;
        }
        let id = req1.param("id");
        if ( ! /^\d+$/.test(id)) {
            res.sendError(httpCode._400BadRequest, "Bad ID");
            return;
        }
        let endpoint = req1.param("endpoint");
        if ( ! /^(sd|thumb512|thumb128)$/.test(endpoint)) {
            res.sendError(httpCode._404NotFound, "Bad endpoint");
            return;
        }
        let entry = await core.getPubAsync("vimeo-" + id, "video");
        if (entry == null) {
            let drop = await core.throttleCoreAsync(core.sha256(req1.remoteIp()) + ":video", 10);
            if (drop) {
                res.sendError(httpCode._429TooManyRequests, "Too many video reqs");
                return;
            }
            let request = td.createRequest("https://api.vimeo.com/videos/" + encodeURIComponent(id));
            request.setHeader("Authorization", "Bearer " + td.serverSetting("VIMEO_API_TOKEN", false));
            let response = await request.sendAsync();
            if (response.statusCode() != 200) {
                res.sendCustomError(httpCode._424FailedDependency, "No such vimeo video?");
                logger.info("failed vimeo download: " + response + ": " + response.content());
                return;
            }
            let vimeoPayload = response.contentAsJson();
            if (vimeoPayload["user"]["uri"] != "/users/" + td.serverSetting("VIMEO_USER", false)) {
                res.sendError(httpCode._402PaymentRequired, "Invalid video user");
                return;
            }
            let pubVideo = new PubVideo();
            pubVideo.blobid = azureBlobStorage.createRandomId(20).toLowerCase();
            pubVideo.provider = "vimeo";
            pubVideo.providerid = id;
            if (false) {
                pubVideo.time = vimeoPayload["modified_time"];
            }
            let thumburl = vimeoPayload["pictures"]["sizes"][0]["link"];
            let sdDesc = asArray(vimeoPayload["download"]).filter(elt => elt["quality"] == "sd")[0];
            if (sdDesc["size"] > 4 * 1024 * 1024) {
                res.sendError(httpCode._413RequestEntityTooLarge, "Video too large");
                return;
            }
            let request2 = td.createRequest(sdDesc["link"]);
            let response2 = await request2.sendAsync();
            assert(response2.statusCode() == 302, "Bad status from vimeo: " + response2);
            let vidurl = response2.header("Location");
            let task = /* async */ videoContainer.createBlockBlobFromUrlAsync(pubVideo.blobid + "-thumb512", thumburl.replace(/_[\dx]+\.jpg/g, "_512.jpg"));
            let task2 = /* async */ videoContainer.createBlockBlobFromUrlAsync(pubVideo.blobid + "-thumb128", thumburl.replace(/_[\dx]+\.jpg/g, "_128.jpg"));
            let task3 = /* async */ videoContainer.createBlockBlobFromUrlAsync(pubVideo.blobid + "-sd", vidurl);
            let jsb2 = {};
            jsb2["pub"] = pubVideo.toJson();
            jsb2["id"] = "vimeo-" + id;
            jsb2["thumburl"] = thumburl;
            let BlobInfo = await task;
            BlobInfo = await task2;
            BlobInfo = await task3;
            await videoStore.insertAsync(jsb2);
            entry = clone(jsb2);
        }
        let blobid = entry["pub"]["blobid"];
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.redirect(httpCode._302MovedTemporarily, core.currClientConfig.primaryCdnUrl + "/cachevideo/" + blobid + "-" + endpoint);
    });
    
    await initEmbedThumbnailsAsync();
}

async function initEmbedThumbnailsAsync() : Promise<void>
{
    embedThumbnails = await cachedStore.createContainerAsync("embedthumbnails", {
        inMemoryCacheSeconds: 120
    });
    restify.server().get("/thumbnail/:size/:provider/:id", async (req: restify.Request, res: restify.Response) => {
        let referer = orEmpty(req.header("referer")).toLowerCase();
        if (referer == "" || td.startsWith(referer, core.self) || td.startsWith(referer, "http://localhost:")) {
            // ok, referer checked
        }
        else {
            res.sendCustomError(httpCode._402PaymentRequired, "Bad referer");
            return;
        }
        let provider = req.param("provider");
        let id = req.param("id");
        let path = provider + "/" + id;
        let entry = await embedThumbnails.getAsync(path);
        if (entry == null) {
            let drop = await core.throttleCoreAsync(core.sha256(req.remoteIp()) + ":thumb", 10);
            if (drop) {
                res.sendError(httpCode._429TooManyRequests, "Too many thumbnail reqs");
                return;
            }
            if (provider == "vimeo") {
                if ( ! /^[0-9]+$/.test(id)) {
                    res.sendError(httpCode._412PreconditionFailed, "Bad video id");
                    return;
                }
                let js = await td.downloadJsonAsync("https://vimeo.com/api/oembed.json?url=" + encodeURIComponent("https://vimeo.com/" + id));
                if (js == null) {
                    res.sendError(httpCode._404NotFound, "");
                    return;
                }
                let jsb = {};
                jsb["info"] = js;
                let ok = await embedThumbnails.tryInsertAsync(path, jsb);
                entry = clone(jsb);
            }
            else {
                res.sendError(httpCode._405MethodNotAllowed, "invalid provider");
                return;
            }
        }
        let sz = core.orZero(parseFloat(withDefault(req.param("size"), "0")));
        if (sz <= 0) {
            sz = 512;
        }
        let url = entry["info"]["thumbnail_url"];
        url = url.replace(/_\d+\./g, "_" + sz + ".");
        res.redirect(301, url);
    });
    restify.server().get("/embed/.*", async (req1: restify.Request, res1: restify.Response) => {
        let id1 = req1.url().replace(/\?.*/g, "").replace(/^\/embed\//g, "");
        if (/^[a-z0-9\-\/]+$/.test(id1)) {
            let templ = "<!doctype html>\n<html lang=\"en\">\n<head>\n  <meta charset=\"utf-8\">\n  <title>Video</title>\n</head>\n<body>\n  <video controls autoplay preload=auto poster=\"{SELF}{ID}/thumb\" style='width:100%;height:100%'>\n    <source src=\"{SELF}{ID}/sd\" type=\"video/mp4\">\n    Video not supported.\n  </video>\n</body>\n</html>\n";
            let s = td.replaceAll(td.replaceAll(templ, "{SELF}", core.self), "{ID}", id1);
            res1.html(s);
        }
        else {
            res1.sendError(httpCode._404NotFound, "Bad id");
        }
    });
}

