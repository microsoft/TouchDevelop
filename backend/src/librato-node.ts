/// <reference path='../typings/node/node.d.ts' />

'use strict';

import * as td from './td';
import * as assert from 'assert';

type JsonObject = td.JsonObject;
type JsonBuilder = td.JsonBuilder;

var clone = td.clone;


var logger: td.AppLogger;
var options: IOptions;


export interface IOptions {
    email?: string;
    token?: string;
    source?: string;
    period?: number;
    prefix?: string;
    aggregate?: boolean;
}

export interface IMeasurement {
    name: string;
    source: string;
    min: number;
    max: number;
    count: number;
    sum: number;
    sum_squares: number;
}

class State {
    public count = 0;
    public firsttime:string[] = [];
    public measures: td.SMap<IMeasurement> = {};
}

var commState = new State();

export async function initAsync(options_: IOptions = {}) : Promise<void>
{
    logger = td.createLogger("librato");
    if (!options_.email) {
        options_.email = td.serverSetting("LIBRATO_EMAIL", false);
    }
    if (!options_.token) {
        options_.token = td.serverSetting("LIBRATO_TOKEN", false);
    }
    if (!options_.period) options_.period = 60000;
    options = options_;
    var everReported = {};
    var opts = options;
    var san = function (s) {
      return s.replace(/[^\w.:\-]/g, "_").slice(0, 63);
    };
    opts.source = opts.source ? san(opts.source) : undefined;
    var logMeasure = function(cat, id, val, meta) {
          var st = commState;
          id = opts.prefix + cat + ":" + id;
          st.count++;
          var repeat = meta && meta.repeat ? meta.repeat : 1;
          if (!st.measures.hasOwnProperty(id)) {
            var src = opts.source, nm;
            var m = /(.*)@(.*)/.exec(id);
            if (m) { 
                nm = m[1]; 
                src = san(m[2]);
            }  else { 
                nm = id;
            }
            nm = san(nm);
            st.measures[id] = {
                min: val,
                max: val,
                sum: val*repeat,
                sum_squares: val*val*repeat,
                count: repeat,
                name: nm,
                source: src,
            };
            if (!everReported.hasOwnProperty(nm)) {
                everReported[nm] = true;
                st.firsttime.push(nm);
            }
          } else {
              var e = st.measures[id];
              e.max = Math.max(val, e.max);
              e.min = Math.min(val, e.min);
              e.count += repeat;
              e.sum += val * repeat;
              e.sum_squares += val * val * repeat;
          }
    
          if (meta) meta.skipLog = true;
    };

    td.App.addTransport({
      logTick: function(cat, id, meta) {
          logMeasure(cat, id, 1, meta);
      },
      logMeasure: logMeasure,
    });

    /* async */ sendLoopAsync();
    logger.debug("started...");
}

async function exampleAsync() : Promise<void>
{
    // A libraty to allows to upload measurements and counters to https://www.librato.com/ using https://github.com/goodeggs/librato-node .
    // {imports}
    // ### setup
    // Call the ``init`` function in the server intialization action. If not provided, the email and token are read from the ``LIBRATO_EMAIL`` and ``LIBRATO_TOKEN`` server settings.
    await initAsync();
}

async function sendLoopAsync() : Promise<void>
{
    while (true) {
        if (commState.count > 0) {
            // we do async to swallow any exceptions
            /* async */ oneReportAsync();
        }
        await td.sleepAsync(options.period / 1000);
    }
}

function createReq(path: string) : td.WebRequest
{
    let request:td.WebRequest;
    request = td.createRequest("https://metrics-api.librato.com/v1/metrics" + path);
    request.setCredentials(options.email, options.token);
    return request;
}

async function handleAggregateAsync() : Promise<void>
{
    if (options.aggregate) {
        let ftime = commState.firsttime;
        if (ftime.length > 0) {
            commState.firsttime = [];
            for (let elt of ftime) {
                let name = "/" + encodeURIComponent(td.toString(elt));
                let request2 = createReq(name);
                let curr = (await request2.sendAsync()).contentAsJson();
                let attr = curr["attributes"];
                let b = attr["aggregate"];
                if (b == null || ! b) {
                    attr["aggregate"] = true;
                    attr["gap_detection"] = true;
                    attr["summarize_function"] = "average";
                    curr["period"] = Math.round(options.period / 1000);
                    let request3 = createReq(name);
                    request3.setContentAsJson(clone(curr));
                    request3.setMethod("put");
                    let response2 = await request3.sendAsync();
                    logger.debug("set attr: " + response2);
                    if (response2.statusCode() != 204) {
                        logger.warning("resp: " + response2.content());
                        logger.debug("put: " + JSON.stringify(clone(curr), null, 2));
                    }
                }
            }
        }
    }
}

async function oneReportAsync() : Promise<void>
{
    let jsb = commState.measures;
    commState.measures = {};
    commState.count = 0;
    let jsb2 = {};
    jsb2["gauges"] = Object.keys(jsb).map<JsonBuilder>(k => jsb[k]);
    let request = createReq("");
    request.setMethod("post");
    let json = jsb2;
    if (false) {
        logger.debug("POST: " + JSON.stringify(json, null, 1));
    }
    request.setContentAsJson(json);
    let response = await request.sendAsync();
    if (response.statusCode() != 200) {
        logger.warning("" + response);
        logger.debug(JSON.stringify(json, null, 2));
    }
    await handleAggregateAsync();
}


