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
import * as cachedStore from "./cached-store"
import * as parallel from "./parallel"
import * as indexedStore from "./indexed-store"
import * as core from "./tdlite-core"
import * as tdliteScripts from "./tdlite-scripts"
import * as tdliteWorkspace from "./tdlite-workspace"
import * as tdliteData from "./tdlite-data"
import * as audit from "./tdlite-audit"
import * as search from "./tdlite-search"
import * as notifications from "./tdlite-notifications"
import * as tdliteReleases from "./tdlite-releases"
import * as tdliteImport from "./tdlite-import"
import * as main from "./tdlite"

var withDefault = core.withDefault;
var orEmpty = td.orEmpty;

var logger = core.logger;
var httpCode = core.httpCode;
export var crashContainer: azureBlobStorage.Container;


export class BugReport
    extends td.JsonRecord
{
    @json public exceptionConstructor: string = "";
    @json public exceptionMessage: string = "";
    @json public context: string = "";
    @json public currentUrl: string = "";
    @json public worldId: string = "";
    @json public kind: string = "";
    @json public scriptId: string = "";
    @json public stackTrace: string = "";
    @json public sourceURL: string = "";
    @json public line: number = 0;
    @json public eventTrace: string = "";
    @json public userAgent: string = "";
    @json public resolution: string = "";
    @json public jsUrl: string = "";
    @json public timestamp: number = 0;
    @json public platform: string[];
    @json public attachments: string[];
    @json public tdVersion: string = "";
    @json public logMessages: JsonObject;
    @json public reportId: string = "";
    static createFromJson(o:JsonObject) { let r = new BugReport(); r.fromJson(o); return r; }
}

export interface IBugReport {
    exceptionConstructor: string;
    exceptionMessage: string;
    context: string;
    currentUrl: string;
    worldId: string;
    kind: string;
    scriptId: string;
    stackTrace: string;
    sourceURL: string;
    line: number;
    eventTrace: string;
    userAgent: string;
    resolution: string;
    jsUrl: string;
    timestamp: number;
    platform: string[];
    attachments: string[];
    tdVersion: string;
    logMessages: JsonObject;
    reportId: string;
}

function crashAndBurn() : void
{
    assert(false, "/api/logcrash (OK)");
}

export async function initAsync()
{
    crashContainer = await core.blobService.createContainerIfNotExistsAsync("crashes2", "private");
    core.addRoute("GET", "logcrash", "", async (req: core.ApiRequest) => {
        crashAndBurn();
    });
    core.addRoute("GET", "bug", "*", async (req: core.ApiRequest) => {
        core.checkPermission(req, "view-bug");
        if (req.status == 200) {
            let info = await crashContainer.getBlobToTextAsync(req.verb);
            if (info.succeded()) {
                let js3 = JSON.parse(core.decrypt(info.text()));
                req.response = js3;
            }
            else {
                req.status = httpCode._404NotFound;
            }
        }
    });
    core.addRoute("POST", "bug", "", async (req1: core.ApiRequest) => {
        let report = BugReport.createFromJson(req1.body);
        let jsb = ({ "details": { "client": { }, "error": { "stackTrace": [] }, "environment": { }, "request": { "headers": {} }, "user": { }, "context": { } } });
        let timestamp = report.timestamp;
        jsb["occurredOn"] = new Date(timestamp);
        let det = jsb["details"];
        det["machineName"] = orEmpty(report.worldId);
        det["version"] = orEmpty(report.tdVersion);
        det["request"]["headers"]["User-Agent"] = orEmpty(report.userAgent);
        if (core.fullTD) {
            det["user"]["identifier"] = req1.userid;
        }
        det["error"]["message"] = withDefault(report.exceptionConstructor, "Error");
        det["error"]["innerError"] = orEmpty(report.exceptionMessage);
        report.reportId = "BuG" + (20000000000000 - await core.redisClient.cachedTimeAsync()) + azureTable.createRandomId(10);
        let js2 = report.toJson();
        let encReport = core.encrypt(JSON.stringify(js2), "BUG");
        let result4 = await crashContainer.createBlockBlobFromTextAsync(report.reportId, encReport);
        let js = clone(js2);
        delete js["eventTrace"];
        delete js["logMessages"];
        delete js["attachments"];
        det["userCustomData"] = js;
        let trace = det["error"]["stackTrace"];
        let s = td.replaceFn(orEmpty(report.stackTrace), /^[^@\s]*:\d+/g, (elt: string[]) => {
            let result: string;
            result = "   at " + elt[0];
            return result;
        });
        s = td.replaceFn(s, /^([^@\s]*)@(.*)/g, (elt1: string[]) => {
            let result1: string;
            result1 = "   at " + elt1[1] + " (" + elt1[2] + ")";
            return result1;
        });
        s = td.replaceFn(s, / at (\S+?):([\d:]+)$/g, (elt2: string[]) => {
            let result2: string;
            result2 = " at nofn (" + elt2[1] + ":" + elt2[2] + ")";
            return result2;
        });
        s = td.replaceFn(s, / at (\S+)[^(]*(\((\S+?):([\d:]+)\))?/g, (elt3: string[]) => {
            let result3: string;
            let st = {};
            st["methodName"] = elt3[1];
            st["fileName"] = withDefault(elt3[3], "unknown");
            st["lineNumber"] = parseFloat(withDefault(elt3[4], "1").replace(/:.*/g, ""));
            trace.push(clone(st));
            result3 = "";
            return result3;
        });
        if (trace.length == 0) {
            let st1 = {};
            st1["lineNumber"] = core.orZero(report.line);
            trace.push(clone(st1));
        }
        else {
            for (let jsb2 of trace) {
                let grps = (/^([^\.]+)\.(.*)/.exec(orEmpty(jsb2["methodName"])) || []);
                if (grps.length > 2) {
                    jsb2["className"] = grps[1];
                    jsb2["methodName"] = grps[2];
                }
                else {
                    jsb2["className"] = "X";
                }
            }
        }
        logger.info("stored crash: " + report.reportId);
        if (! report.tdVersion) {
            // Skip reporting of errors from local builds.
        }
        else {
            core.sanitizeJson(jsb);
            let creq = td.createRequest("https://api.raygun.io/entries");
            creq.setHeader("X-ApiKey", td.serverSetting("RAYGUN_API_KEY2", false));
            creq.setMethod("post");
            creq.setContentAsJson(clone(jsb));
            let response = await creq.sendAsync();
            logger.debug("raygun: " + response + "");
        }
        req1.response = ({});
    }
    , {
        noSizeCheck: true
    });
}


