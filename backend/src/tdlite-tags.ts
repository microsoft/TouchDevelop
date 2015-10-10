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
import * as parallel from "./parallel"
import * as kraken from "./kraken"
import * as indexedStore from "./indexed-store"
import * as core from "./tdlite-core"
import * as tdliteScripts from "./tdlite-scripts"
import * as tdliteWorkspace from "./tdlite-workspace"
import * as tdliteData from "./tdlite-data"
import * as audit from "./tdlite-audit"
import * as search from "./tdlite-search"
import * as notifications from "./tdlite-notifications"
import * as main from "./tdlite"

var withDefault = core.withDefault;
var orEmpty = td.orEmpty;

var logger = core.logger;
var httpCode = core.httpCode;
var tags2: indexedStore.Store;

/* -----------------------------------------------------------------------------
 *
 * This is really not functional. It's a stub for full TD functiality!
 *
 * -----------------------------------------------------------------------------
 */

export class PubTag
    extends td.JsonRecord
{
    @json public kind: string = "";
    @json public time: number = 0;
    @json public id: string = "";
    @json public url: string = "";
    @json public name: string = "";
    @json public category: string = "";
    @json public description: string = "";
    @json public instances: number = 0;
    @json public topscreenshotids: string[];
    static createFromJson(o:JsonObject) { let r = new PubTag(); r.fromJson(o); return r; }
}

export interface IPubTag {
    kind: string;
    time: number;
    id: string;
    url: string;
    name: string;
    category: string;
    description: string;
    instances: number;
    topscreenshotids: string[];
}

async function importTagAsync(req: core.ApiRequest, body: JsonObject) : Promise<void>
{
    let grp = new PubTag();
    grp.fromJson(core.removeDerivedProperties(body));

    let jsb = {};
    jsb["pub"] = grp.toJson();
    jsb["id"] = grp.id;
    await tags2.insertAsync(jsb);
}

function resolveTags(entities: indexedStore.FetchResult) : void
{
    let coll = (<PubTag[]>[]);
    for (let jsb of entities.items) {
        let tag = PubTag.createFromJson(jsb["pub"]);
        tag.topscreenshotids = (<string[]>[]);
        coll.push(tag);
    }
    entities.items = td.arrayToJson(coll);
}

export async function initAsync() : Promise<void>
{
    tags2 = await indexedStore.createStoreAsync(core.pubsContainer, "tag");
    core.registerPubKind({
        store: tags2,
        deleteWithAuthor: false,
        importOne: importTagAsync,
    })
    await core.setResolveAsync(tags2, async (fetchResult: indexedStore.FetchResult, apiRequest: core.ApiRequest) => {
        resolveTags(fetchResult);
    });
    core.addRoute("GET", "*script", "tags", async (req: core.ApiRequest) => {
        req.response = ({ "items": [] });
    });
}

