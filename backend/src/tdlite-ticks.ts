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
import * as tdliteReviews from "./tdlite-reviews"
import * as main from "./tdlite"

var withDefault = core.withDefault;
var orEmpty = td.orEmpty;

var logger = core.logger;
var httpCode = core.httpCode;

export async function initAsync()
{
    core.addRoute("POST", "ticks", "", async (req: core.ApiRequest) => {
        let js = req.body["sessionEvents"];
        if (js != null) {
            for (let evName of Object.keys(js)) {
                if (td.startsWith(evName, "browser.")) {
                    logger.tick(td.replaceAll(evName, "browser.", "NewWebApp@"));
                }
                else if (/^(calcEdit|coreRun)(\|.*)?$/.test(evName)) {
                    let jsb = {};
                    jsb["repeat"] = td.clamp(0, 100, js[evName]);
                    logger.customTick(evName.replace(/\|.*/g, ""), clone(jsb));
                }
            }
        }
        req.response = ({});
    }
    , {
        noSizeCheck: true
    });
}

