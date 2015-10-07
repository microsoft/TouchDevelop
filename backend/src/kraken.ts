/// <reference path='../typings/node/node.d.ts' />

'use strict';

import * as td from './td';
import * as assert from 'assert';

type JsonObject = td.JsonObject;
type JsonBuilder = td.JsonBuilder;

var clone = td.clone;


var logger: td.AppLogger;
var apiSecret: string = "";
var apiKey: string = "";


export interface IOptimizeOptions {
    width?: number;
    height?: number;
    resizeStrategy?: string;
    lossy?: boolean;
    quality?: number;
    webp?: boolean;
    callbackUrl?: string;
    retries?: number;
}


/**
 * Initializes the library. If empty, the ``api key`` and ``api secret`` values are read from the server settings ``KRAKEN_API_KEY`` and ``KRAKEN_API_SECRET``. The library is also setup to store the files in an Azure Blob storage container for which you can provide the information through ``AZURE_STORAGE_ACCOUNT`` and ``AZURE_STORAGE_ACCESS_KEY``.
 */
export function init(apiKey_: string, apiSecret_: string) : void
{
    assert(logger == null, "double initialization");
    logger = td.createLogger("kraken");
    apiKey = apiKey_ || td.serverSetting("KRAKEN_API_KEY", false);
    apiSecret = apiSecret_ || td.serverSetting("KRAKEN_API_SECRET", false);  
}

async function sendRequestAsync(url: string, payload: JsonBuilder, retry: number) : Promise<JsonObject>
{
    let resp: JsonObject;
    resp = (<JsonObject>null);
    let request = td.createRequest(url);
    request.setMethod("POST");
    request.setContentAsJson(clone(payload));
    let response = await request.sendAsync();
    let res = response.contentAsJson();
    logger.debug("optimize status: " + response.statusCode());
    if (res != null) {
        logger.debug("optimized res: " + JSON.stringify(res, null, 2));
    }
    if (response.statusCode() == 415 && retry > 0) {
        logger.debug("retrying... " + retry);
        resp = await sendRequestAsync(url, payload, retry - 1);
    }
    else if (response.statusCode() == 200) {
        resp = res;
        logger.debug("optimized id: " + resp);
    }
    else {
        logger.error("failed to krak picture - " + response.statusCode());
    }
    return resp;
}

function prepareRequest(pictureUrl: string, options: IOptimizeOptions) : JsonBuilder
{
    let payload: JsonBuilder;
    assert(logger != null, "did you forget to call init?");
    assert(pictureUrl != "", "missing picture url");
    payload = { "auth": {} };
    payload["url"] = pictureUrl;
    if (!options.retries) {
        options.retries = 2;
    }
    if (!options.callbackUrl) {
        payload["wait"] = true;
    }
    else {
        payload["wait"] = false;
        payload["callback_url"] = options.callbackUrl;
    }
    if (options.lossy) {
        payload["lossy"] = options.lossy;
        if (options.quality) {
            payload["quality"] = options.quality;
        }
    }
    if (options.webp) {
        payload["webp"] = true;
    }
    let resizeStrategy = options.resizeStrategy || "";
    if (resizeStrategy != "" && resizeStrategy != "none") {
        let resize = {};
        resize["strategy"] = resizeStrategy;
        if (options.width) {
            resize["width"] = options.width;
        }
        if (options.height) {
            resize["height"] = options.height;
        }
        payload["resize"] = resize;
    }
    logger.debug("optimize: " + JSON.stringify(payload, null, 2));
    let auth = payload["auth"];
    auth["api_key"] = apiKey;
    auth["api_secret"] = apiSecret;
    return payload;
}

/**
 * Schedules a file to be optimized by the Kraken optimization service.
 */
export async function optimizePictureUrlAsync(pictureUrl: string, options: IOptimizeOptions = {}) : Promise<string>
{
    let idOrUrl: string;
    let payload = prepareRequest(pictureUrl, options);
    let url = "https://api.kraken.io/v1/url";
    let resp = await sendRequestAsync(url, payload, options.retries);
    idOrUrl = processResponse(options, resp);
    return idOrUrl;
}

function processResponse(options: IOptimizeOptions, resp: JsonObject) : string
{
    let idOrUrl: string;
    if (!options.callbackUrl) {
        idOrUrl = resp["kraked_url"];
    }
    else {
        idOrUrl = null;
    }
    return idOrUrl;
}


