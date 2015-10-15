/// <reference path='../typings/node/node.d.ts' />

'use strict';

import * as td from './td';
import * as assert from 'assert';
import * as crypto from 'crypto';

type JsonObject = td.JsonObject;
type JsonBuilder = td.JsonBuilder;


import * as azureTable from "./azure-table"
import * as azureBlobStorage from "./azure-blob-storage"
import * as raygun from "./raygun"
import * as core from "./tdlite-core"
import * as mbedworkshopCompiler from "./mbedworkshop-compiler"

var withDefault = core.withDefault;
var orEmpty = td.orEmpty;

var logger = core.logger;
var httpCode = core.httpCode;
var mbedVersion = 2;
var mbedCache = true;
var compileContainer: azureBlobStorage.Container;


export class CompileReq
    extends td.JsonRecord
{
    @td.json public config: string = "";
    @td.json public source: string = "";
    @td.json public meta: JsonObject;
    @td.json public repohash: string = "";
    static createFromJson(o:JsonObject) { let r = new CompileReq(); r.fromJson(o); return r; }
}

export interface ICompileReq {
    config: string;
    source: string;
    meta: JsonObject;
    repohash: string;
}

export class CompileResp
    extends td.JsonRecord
{
    @td.json public statusurl: string = "";
    static createFromJson(o:JsonObject) { let r = new CompileResp(); r.fromJson(o); return r; }
}

export interface ICompileResp {
    statusurl: string;
}

export class CompileStatus
    extends td.JsonRecord
{
    @td.json public success: boolean = false;
    @td.json public hexurl: string = "";
    @td.json public mbedresponse: JsonBuilder;
    @td.json public messages: JsonObject[];
    @td.json public bugReportId: string = "";
    static createFromJson(o:JsonObject) { let r = new CompileStatus(); r.fromJson(o); return r; }
}

export interface ICompileStatus {
    success: boolean;
    hexurl: string;
    mbedresponse: JsonBuilder;
    messages: JsonObject[];
}

export class CompilerConfig
    extends td.JsonRecord
{
    @td.json public repourl: string = "";
    @td.json public platform: string = "";
    @td.json public hexfilename: string = "";
    @td.json public hexcontenttype: string = "";
    @td.json public target_binary: string = "";
    @td.json public internalUrl: string = "";
    static createFromJson(o:JsonObject) { let r = new CompilerConfig(); r.fromJson(o); return r; }
}

export interface ICompilerConfig {
    repourl: string;
    platform: string;
    hexfilename: string;
    hexcontenttype: string;
    target_binary: string;
    internalUrl: string;
}

export async function initAsync()
{
    mbedworkshopCompiler.init();
    mbedworkshopCompiler.setVerbosity("debug");

    compileContainer = await core.blobService.createContainerIfNotExistsAsync("compile", "hidden");

    core.addRoute("POST", "admin", "mbedint", async (req9: core.ApiRequest) => {
        core.checkPermission(req9, "root");
        if (req9.status == 200) {
            let ccfg = CompilerConfig.createFromJson((await core.settingsContainer.getAsync("compile"))[req9.argument]);
            let jsb2 = td.clone(req9.body);
            let response2 = await mbedintRequestAsync(ccfg, jsb2);
            req9.response = response2.contentAsJson();
        }
    });
}


export async function mbedCompileAsync(req: core.ApiRequest) : Promise<void>
{
    let compileReq = CompileReq.createFromJson(req.body);
    let name = "my script";
    if (compileReq.meta != null) {
        name = withDefault(compileReq.meta["name"], name);
    }
    name = name.replace(/[^a-zA-Z0-9]+/g, "-");
    let cfg = await core.settingsContainer.getAsync("compile");
    let sha = core.sha256(JSON.stringify(compileReq.toJson()) + "/" + mbedVersion + "/" + cfg["__version"]).substr(0, 32);
    let info = await compileContainer.getBlobToTextAsync(sha + ".json");
    let compileResp = new CompileResp();
    compileResp.statusurl = compileContainer.url() + "/" + sha + ".json";
    logger.info("mbed compile: " + compileResp.statusurl);
    let hit = false;
    if (info.succeded()) {
        let js = JSON.parse(info.text());
        if (mbedCache && js["success"]) {
            hit = true;
        }
        else {
            await compileContainer.deleteBlobAsync(sha + ".json");
            logger.tick("MbedCacheHitButRetry");
        }
    }
    if (hit) {
        logger.tick("MbedCacheHit");
        req.response = compileResp.toJson();
    }
    else if (cfg[compileReq.config.replace(/-fota$/, "")] == null) {
        logger.info("compile config doesn't exists: " + compileReq.config)
        req.status = httpCode._412PreconditionFailed;
    }
    else {
        if (compileReq.source.length > 200000) {
            req.status = httpCode._413RequestEntityTooLarge;
        }
        let numrepl = 0;
        let src = td.replaceFn(compileReq.source, /#(\s*include\s+[<"]([a-zA-Z0-9\/\.\-]+)[">]|if\s+|ifdef\s+|else\s+|elif\s+|line\s+)?/g, (elt: string[]) => {
            let result: string;
            let body = orEmpty(elt[1]);
            if (elt.length > 1 && body != "") {
                result = "#" + body;
            }
            else {
                result = "\\x23";
                numrepl += 1;
            }
            return result;
        });
        src = td.replaceAll(src, "%:", "\\x25\\x3A");
        if (numrepl > 0) {
            logger.info("replaced some hashes, " + src.substr(0, 500));
        }
        await core.throttleAsync(req, "compile", 20);
        if (req.status == 200) {
            let isFota = false;
            if (compileReq.config.endsWith("-fota")) {
                isFota = true;
                compileReq.config = compileReq.config.replace(/-fota$/g, "");
            }
            let json0 = cfg[compileReq.config];
            if (json0 == null) {
                req.status = httpCode._404NotFound;
                return;
            }
            let ccfg = CompilerConfig.createFromJson(json0);
            if (isFota) {
                ccfg.target_binary = td.replaceAll(orEmpty(ccfg.target_binary), "-combined", "");
            }
            if (! ccfg.repourl) {
                req.status = httpCode._404NotFound;
                return;
            }
            ccfg.hexfilename = td.replaceAll(ccfg.hexfilename, "SCRIPT", name);
            if (orEmpty(ccfg.internalUrl) != "") {
                if (/^[\w.\-]+$/.test(orEmpty(compileReq.repohash)) && compileReq.repohash.length < 60) {
                    ccfg.repourl = compileReq.repohash;
                }
                if (/^[a-f0-9]+$/.test(ccfg.repourl) && ccfg.repourl.length == 64) {
                    // OK, looks like image ID
                }
                else {
                    let tags = await core.settingsContainer.getAsync("compiletag");
                    if (tags == null) {
                        tags = ({});
                    }
                    let imgcfg = tags[compileReq.config + "-" + ccfg.repourl];
                    if (imgcfg == null) {
                        imgcfg = tags[ccfg.repourl];
                    }
                    if (imgcfg == null) {
                        imgcfg = "";
                    }
                    let imgid = orEmpty(td.toString(imgcfg));
                    if (imgid == "") {
                        logger.info("cannot find repo: " + ccfg.repourl);
                        req.status = httpCode._404NotFound;
                        return;
                    }
                    logger.debug("found image: " + ccfg.repourl + " -> " + imgid);
                    ccfg.repourl = imgid;
                }
                let jsb = {};
                jsb["maincpp"] = src;
                jsb["op"] = "build";
                jsb["image"] = ccfg.repourl;
                /* async */ mbedintDownloadAsync(sha, jsb, ccfg);
                req.response = compileResp.toJson();
            }
            else if (! ccfg.target_binary) {
                req.status = httpCode._404NotFound;
            }
            else {
                if (/^[\w.\-]+$/.test(orEmpty(compileReq.repohash))) {
                    ccfg.repourl = ccfg.repourl.replace(/#.*/g, "#" + compileReq.repohash);
                }
                logger.debug("compile at " + ccfg.repourl);
                let compile = mbedworkshopCompiler.createCompilation(ccfg.platform, ccfg.repourl, ccfg.target_binary);
                compile.replaceFiles["/source/main.cpp"] = src;
                let started = await compile.startAsync();
                if ( ! started) {
                    logger.tick("MbedWsCompileStartFailed");
                    req.status = httpCode._424FailedDependency;
                }
                else {
                    /* async */ mbedwsDownloadAsync(sha, compile, ccfg);
                    req.response = compileResp.toJson();
                }
            }
        }
    }
}

async function mbedwsDownloadAsync(sha: string, compile: mbedworkshopCompiler.CompilationRequest, ccfg: CompilerConfig) : Promise<void>
{
    logger.newContext();
    let task = await compile.statusAsync(true);
    // TODO: mbed seems to need a second call
    await td.sleepAsync(1);
    task = await compile.statusAsync(false);
    let st = new CompileStatus();
    logger.measure("MbedWsCompileTime", logger.contextDuration());
    st.success = task.success;    
    if (task.success) {
        let bytes = await task.downloadAsync(compile);
        if (bytes.length == 0) {
            st.success = false;
            logger.tick("MbedEmptyDownload");
        }
        else {
            st.hexurl = compileContainer.url() + "/" + sha + "/" + ccfg.hexfilename;
            let result = await compileContainer.createGzippedBlockBlobFromBufferAsync(sha + "/" + ccfg.hexfilename, bytes, {
                contentType: ccfg.hexcontenttype
            });
            logger.tick("MbedHexCreated");
        }
    }
    
    var err: any = null;
    if (!task.success) {
        err = new Error("Compilation failed");
        st.bugReportId = raygun.mkReportId()
        err.tdMeta = { reportId: st.bugReportId }
        let payload = JSON.parse(JSON.stringify(task.payload).replace(/\w+@github.com/g, "[...]@github.com"))
        delete payload["replace_files"];         
        err.bugAttachments = [
            core.withDefault(payload.result ? payload.result.exception : null, "Cannot find exception")
                .replace(/(\\r)?\\n/g, "\n")
                .replace(/['"], ["']/g, "\n"),                
            JSON.stringify(payload, null, 1),
            compile.replaceFiles["/source/main.cpp"]            
        ];
        st.mbedresponse = { result: { exception: "ReportID: " + st.bugReportId }}
    }
    
    let result2 = await compileContainer.createBlockBlobFromTextAsync(sha + ".json", JSON.stringify(st.toJson()), {
        contentType: "application/json; charset=utf-8"
    });
    
    if (err)    
        throw err;
}

async function mbedintDownloadAsync(sha: string, jsb2: JsonBuilder, ccfg: CompilerConfig) : Promise<void>
{
    logger.newContext();
    jsb2["hexfile"] = "source/" + ccfg.target_binary;
    jsb2["target"] = ccfg.platform;
    let response = await mbedintRequestAsync(ccfg, jsb2);
    let respJson = response.contentAsJson();
    let st = new CompileStatus();
    logger.measure("MbedIntCompileTime", logger.contextDuration());
    // Just in case...
    if (response.statusCode() != 200 || respJson == null) {
        setMbedresponse(st, "Code: " + response.statusCode());
    }
    else {
        let hexfile = respJson["hexfile"];
        let msg = orEmpty(respJson["stderr"]) + orEmpty(respJson["stdout"]);
        if (hexfile == null) {
            setMbedresponse(st, withDefault(msg, "no hex"));
        }
        else {
            st.success = true;
            st.hexurl = compileContainer.url() + "/" + sha + "/" + ccfg.hexfilename;
            let result = await compileContainer.createGzippedBlockBlobFromBufferAsync(sha + "/" + ccfg.hexfilename, new Buffer(hexfile, "utf8"), {
                contentType: ccfg.hexcontenttype
            });
            logger.tick("MbedHexCreated");
        }
    }
    let result2 = await compileContainer.createBlockBlobFromTextAsync(sha + ".json", JSON.stringify(st.toJson()), {
        contentType: "application/json; charset=utf-8"
    });
}

function setMbedresponse(st: CompileStatus, msg: string) : void
{
    let jsb = ({ "result": {} });
    jsb["result"]["exception"] = msg;
    st.mbedresponse = jsb;
}

async function mbedintRequestAsync(ccfg: CompilerConfig, jsb2: JsonBuilder) : Promise<td.WebResponse>
{
    jsb2["requestId"] = azureTable.createRandomId(128);
    let request = td.createRequest(ccfg.internalUrl);
    let iv = crypto.randomBytes(16);
    let key = new Buffer(td.serverSetting("MBEDINT_KEY", false), "hex");
    let cipher = crypto.createCipheriv("aes256", key, iv);
    request.setHeader("x-iv", iv.toString("hex"));
    let enciphered = cipher.update(new Buffer(JSON.stringify(jsb2), "utf8"));
    let cipherFinal = cipher.final();
    request.setContentAsBuffer(Buffer.concat([enciphered, cipherFinal]));
    request.setMethod("post");
    let response = await request.sendAsync();
    let buf = response.contentAsBuffer();
    let inpiv = response.header("x-iv");
    if (response.statusCode() == 200) {
        var ciph = crypto.createDecipheriv("AES256", key, new Buffer(inpiv, "hex"));
        var b0 = ciph.update(buf)
        var b1 = ciph.final()
        var dat = Buffer.concat([b0, b1]).toString("utf8");
        (<any>response)._content = dat;
    }
    return response;
}
