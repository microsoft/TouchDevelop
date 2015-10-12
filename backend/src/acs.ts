/// <reference path='../typings/node/node.d.ts' />

'use strict';

import * as td from './td';
import * as assert from 'assert';

type JsonObject = td.JsonObject;
type JsonBuilder = td.JsonBuilder;


var _username: string = "";
var _password: string = "";
var _orgId: string = "";
var logger: td.AppLogger;
var _token: string = "";


export interface IOptions {
    userName?: string;
    password?: string;
    orgid?: string;
}

export interface IValidationResult {
    id?: string;
    status?: number;
    info?: JsonObject;
}


/**
 * Initializes the service. If not provided as arguments, reads the ``user name``, ``password`` and ``orgid`` from the ``ACS_USERNAME``, ``ACS_PASSWORD`` and ``ACS_ORG_ID`` server settings.
 */
export async function initAsync(options_: IOptions = {}) : Promise<void>
{
    if (!options_.userName) {
        options_.userName = td.serverSetting("ACS_USERNAME", false);
    }
    if (!options_.password) {
        options_.password = td.serverSetting("ACS_PASSWORD", false);
    }
    if (!options_.orgid) {
        options_.orgid = td.serverSetting("ACS_ORG_ID", false);
    }
    _username = options_.userName;
    _password = options_.password;
    _orgId = options_.orgid;
    logger = td.createLogger("acs");
    await refreshTokenAsync();
}

async function refreshTokenAsync() : Promise<void>
{
    if (_token == "") {
        logger.info("resfreshing token");
        let request = td.createRequest("https://cvsservices.accesscontrol.windows.net/WRAPv0.9/");
        request.setMethod("post");
        request.setContent("wrap_name=" + encodeURIComponent(_username) + "&wrap_password=" + encodeURIComponent(_password) + "&wrap_scope=" + encodeURIComponent("https://coreservice.centralvalidation.com"));
        request.setHeader("Content-Type", "application/x-www-form-urlencoded");
        let response = await request.sendAsync();
        logger.debug("refresh: " + response.statusCode());
        if (response.statusCode() == 200) {
            logger.debug("content: " + response.content());
            let m = (/wrap_access_token=([^&]+)/.exec(response.content()) || []);
            _token = decodeURIComponent(m[1]);
            logger.debug("token: " + _token);
        }
    }
}

/**
 * Schedules an image validate job. url must point to a publically available image.
 */
export async function validatePictureAsync(id: string, pictureUrl: string, callbackUrl: string) : Promise<string>
{
    let jobId: string;
    assert(id != "", "missing id");
    assert(pictureUrl != "", "missing url");
    await refreshTokenAsync();
    let contentType = 1;
    let dataRepresentation = 1;
    jobId = await validateAsync(id, contentType, dataRepresentation, pictureUrl, callbackUrl);
    return jobId;
}

function createRequest(path: string, payload: JsonBuilder) : td.WebRequest
{
    let request:td.WebRequest;
    request = td.createRequest("https://coreservice.centralvalidation.com" + path);
    request.setHeader("Authorization", "WRAP access_token=\"" + _token + "\"");
    request.setHeader("OrgId", _orgId);
    request.setHeader("Host", "coreservice.centralvalidation.com");
    request.setMethod("post");
    request.setContentAsJson(td.clone(payload));
    request.setHeader("Accept", "application/json");
    return request;
}

function readResults(js: JsonObject, res:td.StringMap) : void
{
    let results = js["ResultCollection"];
    for (let js2 of results) {
        let id = js2["ContentId"];
        let violations = js2["ViolationCount"];
        logger.debug(id + " -> " + violations + " violations");
        res[id] = violations.toString();
    }
}

/**
 * Gets the details on the given job. If ``status code`` is ``3602``, the result is not ready yet. Anything else than ``3000`` is an error.
 */
export async function detailsAsync(jobId: string) : Promise<[number, td.StringMap]>
{
    let statusCode: number;
    let res:td.StringMap;
    await refreshTokenAsync();
    logger.info("details on " + jobId);
    let jsb = {};
    jsb["JobId"] = jobId;
    jsb["OrgId"] = _orgId;
    let request = createRequest("/Content/GetDetails", jsb);
    let response = await request.sendAsync();
    logger.debug(response.content());
    statusCode = 0;
    res = (<td.StringMap>null);
    if (response.statusCode() == 200) {
        let js = response.contentAsJson();
        js = JSON.parse(td.toString(js));
        statusCode = js["Status"]["Code"] + statusCode + statusCode;
        logger.debug("scan status: " + statusCode);
        if (statusCode == 3000) {
            res = {};
            readResults(js, res);
        }
    }
    else if (response.statusCode() == 401) {
        logger.debug("token expired, refreshing");
        _token = "";
        let t = await detailsAsync(jobId);
        statusCode = t[0];
        res = t[1];
    }
    return <[number, td.StringMap]>[statusCode, res]
}

async function validateAsync(id: string, contentType: number, dataRepresentation: number, value: string, callbackUrl: string) : Promise<string>
{
    let jobId: string;
    assert(id != "", "missing id");
    jobId = (<string>null);
    let payload = {
       "RequestId":"TODO",
       "ContentCollection":[
          {
             "ContentId":"TODO",
             "ContentType":1,
             "DataRepresentation":1,
             "Value":"TODO",
             "Metadata":[
                {
                   "Key":"RunImageClassifier",
                   "Value":"True"
                },
                {
                   "Key":"SupressFaceDetection",
                   "Value":"True"
                }
             ],
             "PolicyCodes":[],
             "LanguageCodes":[],
             "Descriptors":[]
          }
       ],
       "Metadata":[
            {"Key":"ReviewEnabled","Value":"False"},
            {"Key":"Realtime","Value":"False"},
            {"Key":"SuppressEmptyReview","Value":"False"}   
       ],
       "OrgId":"0"
    };
    payload["RequestId"] = id;
    payload["OrgId"] = _orgId;
    let content = payload["ContentCollection"][0];
    content["ContentId"] = id;
    content["ContentType"] = contentType;
    content["DataRepresentation"] = dataRepresentation;
    content["Value"] = value;
    if (contentType != 1) {
        content["Metadata"] = [];
    }
    if (callbackUrl != "") {
        let jsb = { "Key": "CallbackEndpoint", Value: callbackUrl };
        payload["Metadata"].push(jsb);
    }
    logger.debug("payload: " + JSON.stringify(payload));
    let path = "/Content/Validate";
    let request = createRequest(path, payload);
    let response = await request.sendAsync();
    logger.debug("status: " + response.statusCode());
    if (response.statusCode() == 200) {
        logger.debug(response.content());
        let js = response.contentAsJson();
        js = JSON.parse(td.toString(js));
        let statusCode = js["Status"]["Code"];
        logger.debug("internal status: " + statusCode);
        if (statusCode == 3000) {
            jobId = js["JobId"];
            logger.debug("jobid: " + jobId);
        }
    }
    else if (response.statusCode() == 401) {
        logger.debug("token expired, refreshing");
        _token = "";
        jobId = await validatePictureAsync(id, value, callbackUrl);
    }
    return jobId;
}

/**
 * Schedules a text validation job.
 */
export async function validateTextAsync(id: string, text: string, callbackUrl: string) : Promise<string>
{
    let jobId: string;
    assert(id != "", "missing id");
    assert(text != "", "missing text");
    await refreshTokenAsync();
    jobId = await validateAsync(id, 0, 0, text, callbackUrl);
    return jobId;
}

async function exampleAsync() : Promise<void>
{
    // This library allows to sanitize text and picture using the Microsoft ACS service.
    // ### setup
    // Call the `init` action within your web site ``_init`` action to initialize the service.
    // Initializes the service. If not provided as arguments, reads the ``user name``, ``password`` and ``orgid`` from the ``ACS_USERNAME``, ``ACS_PASSWORD`` and ``ACS_ORG_ID`` server settings.
    await initAsync();
    // ### validation
    // All validation methods take a _optional_ callback url that will be invoked by ACS when the results are ready. Keep the jobid around, it's useful later to give feedback.
    // * validate text
    let jobId = await validateTextAsync("unique id", "the text to validate", "the result callback");
    // * validate a picture
    let jobId2 = await validatePictureAsync("picture id", "url to the picture", "the callback url");
    // ### validation callback
    // ACS will issue a ``POST`` with a JSON payload to your callback url. You can then parse the results as follow:
    // {hide}
    let payload = JSON.parse("");
    // {/hide}
    let results = parseResults(payload);
    for (let vr of results) {
        // each result contains the ``id`` and the ``status``. A status other than 3000 is a failure or violation.
        td.log(vr.id + ": " + vr.status);
    }
    // ### feedback
    // When you make the decision on a reported assets, you can send a feedback to help improve ACS.
    // * In this example, we accepted the report (see `code->feedback` for more info)
    await feedbackAsync(jobId, "accept");
}

/**
 * Parses the acs results and returns the list of validation results. Any status other than ``3000`` indicates an error.
 */
export function parseResults(payload: JsonObject) : IValidationResult[]
{
    let results: IValidationResult[] = []
    assert(payload != null, "missing payload");
    let jsresults = payload["Results"];
    for (let jsr of jsresults) {
        results.push({
            id: jsr["Id"],
            status: jsr["Status"],
            info: jsr
        })
    }
    return results;
}

/**
 * Sends a feedback to ACS about the outcome of the decision for the job.
 * {action:ignoreReturn}
 * {hints:decision:accept,wrong interpretation, wrong application,unavailable}
 * * ``accept`` The reported violation on the content is correct.
 * * ``wrong interpretation`` The reported violation on the content is incorrect due to interpretation of policy. Tenant does not accept CVS's response as they believe the content policy was applied very conservatively by CVS or that type of content is allowed in tenant's particular business scenario
 * * ``wrong application`` The violation on the content is rejected due to application of policy. Tenant does not accept CVS's response as they believe the content was incorrectly flagged/failed or an error was made by CVS
 * * ``unavailable`` The violation on the content is rejected because the content is no longer available.
 */
export async function feedbackAsync(jobId: string, decision: string) : Promise<number>
{
    let statusCode: number;
    logger.debug("feedback for " + jobId + ": " + decision);
    let actionType = 0;
    if (decision == "accept") {
        actionType = 1;
    }
    else if (decision == "wrong interpretation") {
        actionType = 2;
    }
    else if (decision == "wrong application") {
        actionType = 3;
    }
    else if (decision == "unavailable") {
        actionType = 4;
    }
    else {
        assert(false, "invalid decision value");
    }
    let payload = {};
    payload["ActionType"] = actionType;
    payload["JobId"] = jobId;
    payload["OrgId"] = _orgId;
    await refreshTokenAsync();
    let path = "/Feeback/JobAction";
    let request = createRequest(path, payload);
    let response = await request.sendAsync();
    statusCode = response.statusCode();
    return statusCode;
}


