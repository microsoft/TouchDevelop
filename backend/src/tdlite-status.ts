/// <reference path='../typings/node/node.d.ts' />

'use strict';

import * as td from './td';
import * as assert from 'assert';

type JsonObject = td.JsonObject;
type JsonBuilder = td.JsonBuilder;


import * as restify from "./restify"
import * as azureTable from "./azure-table"
import * as azureBlobStorage from "./azure-blob-storage"
import * as child_process from 'child_process';
import * as tdliteIndex from "./tdlite-index"
import * as core from "./tdlite-core"

var orEmpty = td.orEmpty;
var logger = core.logger;
var httpCode = restify.http();

var lastSearchReport: Date;


export async function failureReportLoopAsync() : Promise<void>
{
    let container = await core.blobService.createContainerIfNotExistsAsync("blobwritetest", "private");
    let table = await core.tableClient.createTableIfNotExistsAsync("tablewritetest");
    lastSearchReport = new Date();
    while (true) {
        await td.sleepAsync(300 + td.randomRange(0, 100));
        /* async */ checkSearchAsync();
        await td.sleepAsync(30);
        /* async */ doFailureChecksAsync(container, table);
    }
}


async function checkSearchAsync() : Promise<void>
{
    let res = await tdliteIndex.statisticsAsync();
    lastSearchReport = new Date();
}

async function doFailureChecksAsync(container: azureBlobStorage.Container, table: azureTable.Table) : Promise<void>
{
    if (Date.now() - lastSearchReport.getTime() > 100000) {
        logger.tick("Failure@search");
    }
    if (await core.redisClient.isStatusLateAsync()) {
        logger.tick("Failure@redis");
    }
    let result2 = await container.createBlockBlobFromTextAsync(td.randomInt(1000) + "", "foobar", {
        justTry: true
    });
    if ( ! result2.succeded()) {
        logger.tick("Failure@blob");
    }
    let entity = azureTable.createEntity(td.randomInt(1000) + "", "foo");
    let ok = await table.tryInsertEntityExtAsync(td.clone(entity), "or replace");
    if ( ! ok) {
        logger.tick("Failure@table");
    }
}


export async function cpuLoadAsync() : Promise<number>
{
    let load: number;
    await new Promise(resume => {
        child_process.execFile("wmic", ["cpu", "get", "loadpercentage"], function (err, res:string) {
          var arr = [];
          if (res)
            res.replace(/\d+/g, m => { arr.push(parseFloat(m)); return "" });
          load = 0;
          arr.forEach(function(n) { load += n });
          load = load / arr.length;
          resume();
        });
    });
    return load;
}

export async function statusReportLoopAsync() : Promise<void>
{
    while (true) {
        await td.sleepAsync(30 + td.randomRange(0, 10));
        let value = await cpuLoadAsync();
        logger.measure("load-perc", value);
    }
}
