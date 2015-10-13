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
    @td.json public parsedStackTrace: JsonObject[];
    static createFromJson(o:JsonObject) { let r = new BugReport(); r.fromJson(o); return r; }
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
        report.reportId = "BuG" + (20000000000000 - await core.redisClient.cachedTimeAsync()) + azureTable.createRandomId(10);
        report.parsedStackTrace = buildStackTrace(orEmpty(report.stackTrace), report.line);
        
        let jsb = {
            "details": {
                "client": {
                    "name": "tdlite",
                    "version": "0.0.1"
                },
                "error": {
                    "stackTrace": report.parsedStackTrace,
                    "message": withDefault(report.exceptionConstructor, "Error"),
                    "innerError": orEmpty(report.exceptionMessage),
                    "className": "Error",
                },
                "environment": {},
                "request": {
                    "headers": {
                        "User-Agent": orEmpty(report.userAgent),
                    }
                },
                "user": {
                    "identifier": core.fullTD ? req1.userid : undefined
                },
                "context": {},
                "machineName": orEmpty(report.worldId),
                "version": orEmpty(report.tdVersion),
            },
            "occurredOn": new Date(report.timestamp),
        };
        
        let js2 = report.toJson();
        let encReport = core.encrypt(JSON.stringify(js2), "BUG");
        let result4 = await crashContainer.createBlockBlobFromTextAsync(report.reportId, encReport);
        let js = td.clone(js2);
        delete js["eventTrace"];
        delete js["logMessages"];
        delete js["attachments"];        
        jsb["details"]["userCustomData"] = js;
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
        req1.response = {
            reportId: report.reportId
        };
    }
    , {
        noSizeCheck: true
    });
}

function buildStackTrace(stk: string, line:number) {
    let trace = [];
    for (let s of stk.split(/\n/)) {
        s = td.replaceFn(s, /^[^@\s]*:\d+/g, (elt: string[]) => {
            return "   at " + elt[0];
        });
        s = td.replaceFn(s, /^([^@\s]*)@(.*)/g, (elt1: string[]) => {
            return "   at " + elt1[1] + " (" + elt1[2] + ")";
        });
        s = td.replaceFn(s, / at (\S+?):([\d:]+)$/g, (elt2: string[]) => {
            return " at nofn (" + elt2[1] + ":" + elt2[2] + ")";
        });
        s = td.replaceFn(s, / at (\S+)[^(]*(\((\S+?):([\d:]+)\))?/g, (elt3: string[]) => {
            let result3: string;
            let st = {};
            st["methodName"] = elt3[1];
            st["fileName"] = withDefault(elt3[3], "unknown");
            st["lineNumber"] = parseFloat(withDefault(elt3[4], "1").replace(/:.*/g, ""));
            trace.push(td.clone(st));
            return "";
        });
    }
    
    if (trace.length == 0) {
        let st1 = {};
        st1["lineNumber"] = core.orZero(line);
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
    
    return trace;
}

function testit()
{
    var err1 =
`Error: OOPS: no such {shim:nosuchfun} from do stuff
    at Object.oops (https://az742082.vo.msecnd.net/app/2519576283037080000-aba1dbfd.fd09.4679.bce8.3d4b8d7ef6ef-micmo/c/main.js:10235:23)
    at Compiler.handleActionCall (https://az742082.vo.msecnd.net/app/2519576283037080000-aba1dbfd.fd09.4679.bce8.3d4b8d7ef6ef-micmo/c/main.js:91878:39)
    at Compiler.visitCall (https://az742082.vo.msecnd.net/app/2519576283037080000-aba1dbfd.fd09.4679.bce8.3d4b8d7ef6ef-micmo/c/main.js:91928:30)
    at Call.accept (https://az742082.vo.msecnd.net/app/2519576283037080000-aba1dbfd.fd09.4679.bce8.3d4b8d7ef6ef-micmo/c/main.js:48897:30)
    at Compiler.NodeVisitor.dispatch (https://az742082.vo.msecnd.net/app/2519576283037080000-aba1dbfd.fd09.4679.bce8.3d4b8d7ef6ef-micmo/c/main.js:49262:26)
    at Compiler.visitExprHolder (https://az742082.vo.msecnd.net/app/2519576283037080000-aba1dbfd.fd09.4679.bce8.3d4b8d7ef6ef-micmo/c/main.js:92007:30)
    at ExprHolder.accept (https://az742082.vo.msecnd.net/app/2519576283037080000-aba1dbfd.fd09.4679.bce8.3d4b8d7ef6ef-micmo/c/main.js:48352:26)
    at Compiler.NodeVisitor.dispatch (https://az742082.vo.msecnd.net/app/2519576283037080000-aba1dbfd.fd09.4679.bce8.3d4b8d7ef6ef-micmo/c/main.js:49262:26)
    at Compiler.visitExprStmt (https://az742082.vo.msecnd.net/app/2519576283037080000-aba1dbfd.fd09.4679.bce8.3d4b8d7ef6ef-micmo/c/main.js:92202:26)
    at ExprStmt.accept (https://az742082.vo.msecnd.net/app/2519576283037080000-aba1dbfd.fd09.4679.bce8.3d4b8d7ef6ef-micmo/c/main.js:46221:26)
    at Compiler.NodeVisitor.dispatch (https://az742082.vo.msecnd.net/app/2519576283037080000-aba1dbfd.fd09.4679.bce8.3d4b8d7ef6ef-micmo/c/main.js:49262:26)
    at https://az742082.vo.msecnd.net/app/2519576283037080000-aba1dbfd.fd09.4679.bce8.3d4b8d7ef6ef-micmo/c/main.js:92219:31
    at Array.forEach (native)
    at Compiler.visitCodeBlock (https://az742082.vo.msecnd.net/app/2519576283037080000-aba1dbfd.fd09.4679.bce8.3d4b8d7ef6ef-micmo/c/main.js:92217:29)
    at CodeBlock.accept (https://az742082.vo.msecnd.net/app/2519576283037080000-aba1dbfd.fd09.4679.bce8.3d4b8d7ef6ef-micmo/c/main.js:45687:26)
    at Compiler.NodeVisitor.dispatch (https://az742082.vo.msecnd.net/app/2519576283037080000-aba1dbfd.fd09.4679.bce8.3d4b8d7ef6ef-micmo/c/main.js:49262:26)
    at Compiler.visitAction (https://az742082.vo.msecnd.net/app/2519576283037080000-aba1dbfd.fd09.4679.bce8.3d4b8d7ef6ef-micmo/c/main.js:92228:26)
    at Action.accept (https://az742082.vo.msecnd.net/app/2519576283037080000-aba1dbfd.fd09.4679.bce8.3d4b8d7ef6ef-micmo/c/main.js:47069:26)
    at Compiler.NodeVisitor.dispatch (https://az742082.vo.msecnd.net/app/2519576283037080000-aba1dbfd.fd09.4679.bce8.3d4b8d7ef6ef-micmo/c/main.js:49262:26)
    at https://az742082.vo.msecnd.net/app/2519576283037080000-aba1dbfd.fd09.4679.bce8.3d4b8d7ef6ef-micmo/c/main.js:92298:35
    at Array.forEach (native)
    at Compiler.dump (https://az742082.vo.msecnd.net/app/2519576283037080000-aba1dbfd.fd09.4679.bce8.3d4b8d7ef6ef-micmo/c/main.js:92296:25)
    at Compiler.compileApp (https://az742082.vo.msecnd.net/app/2519576283037080000-aba1dbfd.fd09.4679.bce8.3d4b8d7ef6ef-micmo/c/main.js:92314:26)
    at https://az742082.vo.msecnd.net/app/2519576283037080000-aba1dbfd.fd09.4679.bce8.3d4b8d7ef6ef-micmo/c/main.js:91717:35
    at Array.forEach (native)
    at Compiler.run (https://az742082.vo.msecnd.net/app/2519576283037080000-aba1dbfd.fd09.4679.bce8.3d4b8d7ef6ef-micmo/c/main.js:91716:53)
    at Function.ScriptProperties.bytecodeCompile (https://az742082.vo.msecnd.net/app/2519576283037080000-aba1dbfd.fd09.4679.bce8.3d4b8d7ef6ef-micmo/c/main.js:123801:19)
    at Editor.bytecodeCompileWithUi (https://az742082.vo.msecnd.net/app/2519576283037080000-aba1dbfd.fd09.4679.bce8.3d4b8d7ef6ef-micmo/c/main.js:101404:35)
    at Editor.compile (https://az742082.vo.msecnd.net/app/2519576283037080000-aba1dbfd.fd09.4679.bce8.3d4b8d7ef6ef-micmo/c/main.js:101485:22)
    at https://az742082.vo.msecnd.net/app/2519576283037080000-aba1dbfd.fd09.4679.bce8.3d4b8d7ef6ef-micmo/c/main.js:101501:27
    at https://az742082.vo.msecnd.net/app/2519576283037080000-aba1dbfd.fd09.4679.bce8.3d4b8d7ef6ef-micmo/c/main.js:1383:21
    at ClickHandler.newCb [as f] (https://az742082.vo.msecnd.net/app/2519576283037080000-aba1dbfd.fd09.4679.bce8.3d4b8d7ef6ef-micmo/c/main.js:14304:28)
    at ClickHandler.fireClick (https://az742082.vo.msecnd.net/app/2519576283037080000-aba1dbfd.fd09.4679.bce8.3d4b8d7ef6ef-micmo/c/main.js:14257:22)
    at ClickHandler.handleEvent (https://az742082.vo.msecnd.net/app/2519576283037080000-aba1dbfd.fd09.4679.bce8.3d4b8d7ef6ef-micmo/c/main.js:14242:34)`
    
    var err2 =
`Error: OOPS: no such {shim:nosuchfun} from do stuff
    at https://az742082.vo.msecnd.net/app/2519576283037080000-aba1dbfd.fd09.4679.bce8.3d4b8d7ef6ef-micmo/c/main.js:1383:21
    at ClickHandler.newCb [as f] (https://az742082.vo.msecnd.net/app/2519576283037080000-aba1dbfd.fd09.4679.bce8.3d4b8d7ef6ef-micmo/c/main.js:14304:28)
    at ClickHandler.handleEvent (https://az742082.vo.msecnd.net/app/2519576283037080000-aba1dbfd.fd09.4679.bce8.3d4b8d7ef6ef-micmo/c/main.js:14242:34)`
 
 var err3 = 
`check@https://az742082.vo.msecnd.net/app/2519585664678950000-77bbe272.1d35.445f.a414.33700cd13e25-81749/c/main.js:10165:32
uninstallAsync@https://az742082.vo.msecnd.net/app/2519585664678950000-77bbe272.1d35.445f.a414.33700cd13e25-81749/c/main.js:85480:33
https://az742082.vo.msecnd.net/app/2519585664678950000-77bbe272.1d35.445f.a414.33700cd13e25-81749/c/main.js:114476:53
https://az742082.vo.msecnd.net/app/2519585664678950000-77bbe272.1d35.445f.a414.33700cd13e25-81749/c/main.js:99366:18
https://az742082.vo.msecnd.net/app/2519585664678950000-77bbe272.1d35.445f.a414.33700cd13e25-81749/c/main.js:13783:42
_notify@https://az742082.vo.msecnd.net/app/2519585664678950000-77bbe272.1d35.445f.a414.33700cd13e25-81749/c/main.js:13729:28
then@https://az742082.vo.msecnd.net/app/2519585664678950000-77bbe272.1d35.445f.a414.33700cd13e25-81749/c/main.js:13794:29
updateEditorStateAsync@https://az742082.vo.msecnd.net/app/2519585664678950000-77bbe272.1d35.445f.a414.33700cd13e25-81749/c/main.js:99363:70
uninstallAsync@https://az742082.vo.msecnd.net/app/2519585664678950000-77bbe272.1d35.445f.a414.33700cd13e25-81749/c/main.js:114467:58
uninstall@https://az742082.vo.msecnd.net/app/2519585664678950000-77bbe272.1d35.445f.a414.33700cd13e25-81749/c/main.js:114459:36
https://az742082.vo.msecnd.net/app/2519585664678950000-77bbe272.1d35.445f.a414.33700cd13e25-81749/c/main.js:113837:149
https://az742082.vo.msecnd.net/app/2519585664678950000-77bbe272.1d35.445f.a414.33700cd13e25-81749/c/main.js:113778:26
newCb@https://az742082.vo.msecnd.net/app/2519585664678950000-77bbe272.1d35.445f.a414.33700cd13e25-81749/c/main.js:14223:30
fireClick@https://az742082.vo.msecnd.net/app/2519585664678950000-77bbe272.1d35.445f.a414.33700cd13e25-81749/c/main.js:14176:23
handleEvent@https://az742082.vo.msecnd.net/app/2519585664678950000-77bbe272.1d35.445f.a414.33700cd13e25-81749/c/main.js:14142:43`
   
 let tst = s => buildStackTrace(s, 42).forEach(f => assert(/^\w+(\.\w+)?$/.test(f.methodName)))
 tst(err1);
 tst(err2);
 tst(err3);   
}

if (!module.parent)
    testit();
