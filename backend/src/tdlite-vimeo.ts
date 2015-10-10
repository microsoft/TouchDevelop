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
import * as restify from "./restify"
import * as cachedStore from "./cached-store"
import * as indexedStore from "./indexed-store"
import * as core from "./tdlite-core"
import * as tdliteScripts from "./tdlite-scripts"
import * as tdliteWorkspace from "./tdlite-workspace"
import * as tdliteData from "./tdlite-data"
import * as audit from "./tdlite-audit"
import * as search from "./tdlite-search"
import * as notifications from "./tdlite-notifications"
import * as main from "./tdlite"

var orFalse = core.orFalse;
var withDefault = core.withDefault;
var orEmpty = td.orEmpty;

var logger = core.logger;
var httpCode = core.httpCode;

var videoContainer: azureBlobStorage.Container;
var videoStore: indexedStore.Store;


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
}

