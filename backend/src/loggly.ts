/// <reference path='../typings/node/node.d.ts' />

'use strict';

import * as td from './td';
import * as assert from 'assert';

type JsonObject = td.JsonObject;
type JsonBuilder = td.JsonBuilder;

var clone = td.clone;

var logger: td.AppLogger;
var logglyLevel = 0;


export interface IOptions {
    token?: string;
    subdomain?: string;
    globalTags?: string;
    uploadInterval?: number;
    minLevel?: number;
}

var loggly = require('loggly');


/**
 * Initializes loggly with the account information. If ``token`` is not provided, the ``LOGGLY_TOKEN`` server setting is used. If ``sub domain`` is not provided, ``LOGGLY_SUB_DOMAIN`` is provided.
 */
export async function initAsync(options_: IOptions = {}) : Promise<void>
{
    assert(logger == null, "multiple initialization");
    if (!options_.token) {
        options_.token = td.serverSetting("LOGGLY_TOKEN", false);
    }
    if (!options_.subdomain) {
        options_.subdomain = td.serverSetting("LOGGLY_SUB_DOMAIN", false);
    }
    if (!options_.uploadInterval) {
        options_.uploadInterval = 2;
    }
    if (!options_.minLevel) {
        options_.minLevel = 7;
    }
    setMinLevel(options_.minLevel);
    logger = td.createLogger("loggly");
    let allTags = options_.globalTags.split(";");
    allTags.push("TouchDevelop");
    let globalTags = allTags.join(";");
    initProxy(options_.token, options_.subdomain, globalTags, options_.uploadInterval);
}

async function exampleAsync() : Promise<void>
{
    // Sends logging messages to [loggly.com](http://www.loggly.com).
    // ### configuration
    // Set the ``LOGGLY_TOKEN`` and ``LOGGLY_SUB_DOMAIN`` server setting to your token and subdomain.
    await initAsync({
        globalTags: "myapp"
    });
    // That's it!
}

function initProxy(token: string, subDomain: string, globalTags: string, seconds: number) : void
{
    /*JS*/
    let logglyClient = loggly.createClient({
        token: token,
        subdomain: subDomain,
        tags: globalTags.split(';'),
        json: true,
        useTagHeader: false,
      });
    let logglyLogs = [];
    td.App.addTransport({
      log : function(level, cat, msg, meta) {
          if (level <= logglyLevel) {
            logglyLogs.push({
              level: level,
              category: cat,
              message: msg,
              meta: meta });
           }
      },
      logException: function(err,meta) {}
    });
    // batching
    setInterval(function() {
      if (logglyLogs.length > 0) {
        var lgs = logglyLogs;
        logglyLogs = [];
        var retry = 10;
        var send = function() {
           logglyClient.log(lgs, function (err, result) {
                  if(err) {
                     if (retry-- > 0 && (err.code == "ETIMEDOUT" || err.code == "ECONNRESET"))
                         setTimeout(send, 2000);
                     else
                         td.App.logException(err);
                  }
           });
        }
        send()
      }
    }, seconds * 1000);
}

/**
 * Sets the minimum level of messages to be logged (``debug=7``, ``info=6``, ``warning=4``, ``error=3``)
 * {hints:level:6,7,3,4}
 */
export function setMinLevel(level: number) : void
{
    level = Math.floor(level);
    logglyLevel = level
}

