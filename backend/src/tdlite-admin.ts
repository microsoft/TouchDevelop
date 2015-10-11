/// <reference path='../typings/node/node.d.ts' />

'use strict';

import * as td from './td';
import * as assert from 'assert';

type JsonObject = td.JsonObject;
type JsonBuilder = td.JsonBuilder;


import * as azureTable from "./azure-table"
import * as azureBlobStorage from "./azure-blob-storage"
import * as cachedStore from "./cached-store"
import * as core from "./tdlite-core"
import * as audit from "./tdlite-audit"
import * as tdliteUsers from "./tdlite-users"
import * as tdliteIndex from "./tdlite-index"
import * as tdliteStatus from "./tdlite-status"

var withDefault = core.withDefault;
var orEmpty = td.orEmpty;

var logger = core.logger;
var httpCode = core.httpCode;

var tdDeployments: azureBlobStorage.Container;
var deploymentMeta: JsonObject;

async function copyDeploymentAsync(req: core.ApiRequest, target: string) : Promise<void>
{
    core.checkPermission(req, "root");
    if (req.status == 200) {
        let jsb2 = JSON.parse((await tdDeployments.getBlobToTextAsync("000ch-" + core.myChannel)).text());
        jsb2["did"] = cachedStore.freshShortId(12);
        req.response = td.clone(jsb2);
        let result = await tdDeployments.createBlockBlobFromTextAsync("000ch-" + target, JSON.stringify(req.response), {
            contentType: "application/json;charset=utf8"
        });
        if ( ! result.succeded()) {
            req.status = 400;
        }
    }
}

export async function initAsync()
{
    tdDeployments = await core.blobService.createContainerIfNotExistsAsync("tddeployments", "private");
    deploymentMeta = JSON.parse(withDefault(td.serverSetting("TD_DEPLOYMENT_META", true), "{}"));
    core.addRoute("GET", "stats", "dmeta", async (req: core.ApiRequest) => {
        req.response = deploymentMeta;
    });
    core.addRoute("GET", "admin", "stats", async (req1: core.ApiRequest) => {
        core.checkPermission(req1, "operator");
        if (req1.status == 200) {
            let jsb = {};
            for (let s of ["RoleInstanceID", "TD_BLOB_DEPLOY_CHANNEL", "TD_WORKER_ID", "TD_DEPLOYMENT_ID"]) {
                if (s != "") {
                    jsb[s] = orEmpty(td.serverSetting(s, true));
                }
            }
            jsb["search"] = await tdliteIndex.statisticsAsync();
            jsb["dmeta"] = deploymentMeta;
            jsb["load"] = await tdliteStatus.cpuLoadAsync();
            let redis0 = await core.redisClient.infoAsync();
            jsb["redis"] = redis0;
            if (core.orFalse(req1.queryOptions["text"])) {
                let s2 = jsb["RoleInstanceID"] + ": load " + JSON.stringify(jsb["load"]) + " redis load: " + redis0["used_cpu_avg_ms_per_sec"] / 10 + " req/s: " + redis0["instantaneous_ops_per_sec"] + "\n";
                req1.response = s2;
            }
            else {
                req1.response = td.clone(jsb);
            }
        }
    });
    core.addRoute("GET", "admin", "deploydata", async (req2: core.ApiRequest) => {
        core.checkPermission(req2, "root");
        if (req2.status == 200) {
            let ch = withDefault(req2.argument, core.myChannel);
            req2.response = JSON.parse((await tdDeployments.getBlobToTextAsync("000ch-" + ch)).text());
        }
    });
    core.addRoute("POST", "admin", "copydeployment", async (req3: core.ApiRequest) => {
        await audit.logAsync(req3, "copydeployment", {
            data: req3.argument
        });
        await copyDeploymentAsync(req3, req3.argument);
    });
    core.addRoute("POST", "admin", "restart", async (req4: core.ApiRequest) => {
        await audit.logAsync(req4, "copydeployment", {
            data: "restart"
        });
        await copyDeploymentAsync(req4, core.myChannel);
    });
    core.addRoute("GET", "admin", "raw", async (req5: core.ApiRequest) => {
        core.checkPermission(req5, "root");
        if (req5.status == 200) {
            let entry = await core.pubsContainer.getAsync(req5.argument);
            if (entry == null) {
                entry = ({ "code": "four oh four" });
            }
            req5.response = entry;
        }
    });
    core.addRoute("GET", "admin", "rawblob", async (req6: core.ApiRequest) => {
        core.checkPermission(req6, "root");
        if (req6.status == 200) {
            let info = await (await core.pubsContainer.blobContainerAsync()).getBlobToTextAsync(req6.argument);
            if (info.succeded()) {
                req6.response = info.text();
            }
            else {
                req6.response = info.error();
            }
        }
    });
    core.addRoute("GET", "admin", "rawcode", async (req7: core.ApiRequest) => {
        core.checkPermission(req7, "root");
        if (req7.status == 200) {
            let cd = req7.argument;
            if (cd.length < 64) {
                cd = core.sha256(cd);
            }
            let entry1 = await tdliteUsers.passcodesContainer.getAsync("code/" + cd);
            if (entry1 == null) {
                entry1 = ({ "status": "four oh four" });
            }
            req7.response = entry1;
        }
    });
    core.addRoute("POST", "admin", "opcode", async (req8: core.ApiRequest) => {
        core.checkPermission(req8, "root");
        if (req8.status == 200) {
            let cd1 = req8.body["code"];
            let entry2 = await tdliteUsers.passcodesContainer.getAsync(cd1);
            if (entry2 == null) {
                entry2 = ({ "status": "four oh four" });
            }
            else if (orEmpty(req8.body["op"]) == "delete") {
                await tdliteUsers.passcodesContainer.updateAsync(cd1, async (entry3: JsonBuilder) => {
                    for (let s4 of Object.keys(entry3)) {
                        delete entry3[s4];
                    }
                    entry3["kind"] = "reserved";
                });
            }
            req8.response = entry2;
        }
    });

    initConfig();
}

function initConfig() : void
{
    core.addRoute("GET", "config", "*", async (req: core.ApiRequest) => {
        if (req.verb == "promo") {
            core.checkPermission(req, "script-promo");
        }
        else {
            core.checkPermission(req, "root");
        }
        if (req.status == 200) {
            let entry = await core.settingsContainer.getAsync(req.verb);
            if (entry == null) {
                req.response = ({});
            }
            else {
                req.response = entry;
            }
        }
    });
    core.addRoute("POST", "config", "*", async (req1: core.ApiRequest) => {
        core.checkPermission(req1, "root");
        if (req1.status == 200 && ! /^(compile|settings|promo|compiletag)$/.test(req1.verb)) {
            req1.status = httpCode._404NotFound;
        }
        if (req1.status == 200) {
            await audit.logAsync(req1, "update-settings", {
                subjectid: req1.verb,
                oldvalue: await core.settingsContainer.getAsync(req1.verb),
                newvalue: req1.body
            });
            await core.settingsContainer.updateAsync(req1.verb, async (entry1: JsonBuilder) => {
                core.copyJson(req1.body, entry1);
                entry1["stamp"] = azureTable.createLogId();
            });
        }
        req1.response = ({});
    });
}

