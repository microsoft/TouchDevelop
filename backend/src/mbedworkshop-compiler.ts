/// <reference path='../typings/node/node.d.ts' />

'use strict';

import * as td from 'td';
import * as assert from 'assert';

type JsonObject = td.JsonObject;
type JsonBuilder = td.JsonBuilder;

var clone = td.clone;

var logger: td.AppLogger;
var options: IOptions;


export interface IOptions {
    apikey?: string;
    apiurl?: string;
    githubApiKey?: string;
}

export class CompilationRequest
{
    public clearcache: boolean = false;
    public repo: string = "";
    public target: string = "";
    public replaceFiles: JsonObject;
    public taskId: string = "";
    public targetBinary: string = "";

    public async startAsync() : Promise<boolean>
    {
        let success: boolean;
        let url = options.apiurl + "/v1/build";
        let jsb = {};
        jsb["repo"] = this.repo;
        jsb["target"] = this.target;
        jsb["target_binary"] = this.targetBinary;
        if (options.githubApiKey != "") {
            jsb["github_api_key"] = options.githubApiKey;
        }
        if (this.clearcache) {
            jsb["clearcache"] = "true";
        }
        let repl = {};
        jsb["replace_files"] = repl;
        for (let fn of Object.keys(this.replaceFiles)) {
            repl[fn] = new Buffer(this.replaceFiles[fn], "utf8").toString("base64");
        }
        let req = td.createRequest(url);
        let payload = clone(jsb);
        req.setContentAsJson(payload);
        logger.debug(JSON.stringify(payload, null, 2));
        req.setMethod("post");
        req.setHeader("Ocp-Apim-Subscription-Key", options.apikey);
        logger.debug(req + "");
        let response = await req.sendAsync();
        logger.debug("compile status: " + response.statusCode());
        if (response.statusCode() == 201) {
            this.taskId = response.header("Location");
            logger.debug("compile task id: " + this.taskId);
            success = true;
        }
        else {
            logger.warning("compile failed, status: " + response.statusCode() + ", content: " + response.content());
            success = false;
        }
        return success;
    }

    /**
     * Queries the compilation status for a given task
     */
    public async statusAsync(block: boolean) : Promise<CompilationResult>
    {
        let result: CompilationResult;
        assert(this != null, "missing compilation");
        let request = td.createRequest(this.taskId + "?block=" + block);
        request.setHeader("Ocp-Apim-Subscription-Key", options.apikey);
        let response = await request.sendAsync();
        result = this.readResult(response);
        return result;
    }

    private readResult(response:td.WebResponse) : CompilationResult
    {
        let task: CompilationResult;
        task = new CompilationResult();
        task.payload = response.contentAsJson();
        logger.debug("poll: " + response.statusCode());
        if (response.statusCode() == 200) {
            let js = task.payload["result"];
            logger.debug(JSON.stringify(js, null, 2));
            if (task.payload["task_status"] == "finished") {
                task.completed = true;
                task.success = js["compile_status"] == "Succeeded";
                task.binary = js["binary"].replace(/^http:/g, "https:");
                task.timeTaken = js["seconds"];
                logger.debug("completed, success: " + task.success);
            }
        }
        else {
            logger.error("poll failed, status: " + response.statusCode() + ", content: " + response.content());
        }
        return task;
    }

}

export class CompilationResult
{
    public payload: JsonObject;
    public completed: boolean = false;
    public success: boolean = false;
    public binary: string = "";
    public timeTaken: number = 0;

    /**
     * If the task is completed and successful, downloads the .hex file
     */
    public async downloadAsync(request2: CompilationRequest) : Promise<Buffer>
    {
        let bytes: Buffer;
        assert(this.completed, "task not completed");
        assert(this.success, "task uncessessfull");
        logger.debug("downloading " + this.binary);
        let req = td.createRequest(this.binary);
        logger.debug("" + req);
        let response = await req.sendAsync();
        logger.debug("res: " + response.statusCode());
        if (response.statusCode() == 200) {
            bytes = response.contentAsBuffer();
        }
        else {
            logger.warning("download failed: " + response.statusCode());
            bytes = new Buffer("");
        }
        return bytes;
    }

}

export function createCompilation(target: string, repo: string, targetBinary: string) : CompilationRequest
{
    let request: CompilationRequest;
    assert(logger != null, "mbed not initialized");
    assert(target != "", "missing platform");
    assert(repo != "", "missing team information");
    logger.debug("repo: " + repo);
    request = new CompilationRequest();
    request.target = target;
    request.repo = repo;
    request.targetBinary = targetBinary;
    request.replaceFiles = {};
    return request;
}

/**
 * Initializes the library
 */
export function init(options_?: IOptions) : void
{
    logger = td.createLogger("mbed");
    options = options_;
    if (!options.apikey) {
        options.apikey = td.serverSetting("MBED_API_KEY", false);
    }
    if (!options.githubApiKey) {
        options.githubApiKey = td.serverSetting("MBED_GITHUB_API_KEY", true);
        if (options.githubApiKey == null) {
            options.githubApiKey = "";
        }
    }
    if (!options.apiurl) {
        options.apiurl = td.serverSetting("MBED_API_URL", true);
        if (!options.apiurl) {
            options.apiurl = "https://mbedworkshop.azure-api.net";
        }
        options.apiurl = options.apiurl.replace(/\/+$/, "");
    }
}

/**
 * A library to leverage the ARM mbed [compile api](https://developer.mbed.org/handbook/Compile-API).
 * ### setup
 * Sets the user name and password used to authenticate the API calls. If not provided, uses ``MBED_USER`` and ``MBED_PASSWORD`` server settings.
 */
export async function exampleAsync() : Promise<void>
{
    init();
    // ### starting a compilation
    // * Create a compilation request for the given ``platform`` and ``repo``
    let request = createCompilation("NRF51822", "https://developer.mbed.org/users/dan/code/pubtest/", "foobar-combined.hex");
    // * replace repo files with new content
    request.replaceFiles["main.cpp"] = "...";
    // * Make sure to test that the compilation started.
    if ( ! (await request.startAsync())) {
        // oopsy, something when wrong
    }
    // ### polling for the result
    // * use the ``status`` action to track the progress of the task
    let task = await request.statusAsync(true);
    // ### download the hex file
    // Upon successful completion, download the ``.hex`` file using ``code->download``.
    if (task.success) {
        let bytes = await task.downloadAsync(request);
    }
}

/**
 * Set the verbosity of log.
 * {hints:level:info,debug,warning}
 */
export function setVerbosity(level: string) : void
{
    logger.setVerbosity(level);
}


