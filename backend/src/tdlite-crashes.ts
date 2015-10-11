/// <reference path='../typings/node/node.d.ts' />

'use strict';

import * as td from './td';
import * as assert from 'assert';

type JsonObject = td.JsonObject;
type JsonBuilder = td.JsonBuilder;


import * as azureTable from "./azure-table"
import * as azureBlobStorage from "./azure-blob-storage"
import * as core from "./tdlite-core"

var withDefault = core.withDefault;
var orEmpty = td.orEmpty;

var logger = core.logger;
var httpCode = core.httpCode;
var crashContainer: azureBlobStorage.Container;


export class BugReport
    extends td.JsonRecord
{
    @td.json public exceptionConstructor: string = "";
    @td.json public exceptionMessage: string = "";
    @td.json public context: string = "";
    @td.json public currentUrl: string = "";
    @td.json public worldId: string = "";
    @td.json public kind: string = "";
    @td.json public scriptId: string = "";
    @td.json public stackTrace: string = "";
    @td.json public sourceURL: string = "";
    @td.json public line: number = 0;
    @td.json public eventTrace: string = "";
    @td.json public userAgent: string = "";
    @td.json public resolution: string = "";
    @td.json public jsUrl: string = "";
    @td.json public timestamp: number = 0;
    @td.json public platform: string[];
    @td.json public attachments: string[];
    @td.json public tdVersion: string = "";
    @td.json public logMessages: JsonObject;
    @td.json public reportId: string = "";
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

export async function saveBugReportAsync(json: JsonBuilder) {
    let blobName = orEmpty(json["reportId"]);
    if (blobName != "") {
        let encReport = core.encrypt(JSON.stringify(json), "BUG");
        let result4 = await crashContainer.createBlockBlobFromTextAsync(blobName, encReport);
    }
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
        let js = td.clone(js2);
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
            trace.push(td.clone(st));
            result3 = "";
            return result3;
        });
        if (trace.length == 0) {
            let st1 = {};
            st1["lineNumber"] = core.orZero(report.line);
            trace.push(td.clone(st1));
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
            creq.setContentAsJson(td.clone(jsb));
            let response = await creq.sendAsync();
            logger.debug("raygun: " + response + "");
        }
        req1.response = ({});
    }
    , {
        noSizeCheck: true
    });
}


