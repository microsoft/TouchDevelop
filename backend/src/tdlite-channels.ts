/// <reference path='../typings/node/node.d.ts' />

'use strict';

import * as td from './td';
import * as assert from 'assert';

type JsonObject = td.JsonObject;
type JsonBuilder = td.JsonBuilder;

var asArray = td.asArray;
var json = td.json;
var clone = td.clone;

import * as indexedStore from "./indexed-store"
import * as core from "./tdlite-core"
import * as tdliteScripts from "./tdlite-scripts"
import * as search from "./tdlite-search"
import * as notifications from "./tdlite-notifications"

var withDefault = core.withDefault;
var orEmpty = td.orEmpty;

var logger = core.logger;
var httpCode = core.httpCode;
var channels: indexedStore.Store;
var channelMemberships: indexedStore.Store;

export class PubChannel
    extends td.JsonRecord
{
    @json public kind: string = "";
    @json public time: number = 0;
    @json public id: string = "";
    @json public name: string = "";
    @json public pictureid: string = "";
    @json public description: string = "";
    @json public userid: string = "";
    @json public username: string = "";
    @json public userscore: number = 0;
    @json public userhaspicture: boolean = false;
    @json public userplatform: string[];
    @json public positivereviews: number = 0;
    @json public subscribers: number = 0;
    @json public comments: number = 0;
    static createFromJson(o:JsonObject) { let r = new PubChannel(); r.fromJson(o); return r; }
}

export interface IPubChannel {
    kind: string;
    time: number;
    id: string;
    name: string;
    pictureid: string;
    description: string;
    userid: string;
    username: string;
    userscore: number;
    userhaspicture: boolean;
    userplatform: string[];
    positivereviews: number;
    subscribers: number;
    comments: number;
}

export async function initAsync() : Promise<void>
{
    channels = await indexedStore.createStoreAsync(core.pubsContainer, "channel");
    await core.setResolveAsync(channels, async (fetchResult: indexedStore.FetchResult, apiRequest: core.ApiRequest) => {
        await core.addUsernameEtcAsync(fetchResult);
        let coll = (<PubChannel[]>[]);
        for (let jsb of fetchResult.items) {
            let grp = PubChannel.createFromJson(jsb["pub"]);
            coll.push(grp);
        }
        fetchResult.items = td.arrayToJson(coll);
    }
    , {
        byUserid: true,
        anonSearch: true
    });
    core.addRoute("POST", "channels", "", async (req: core.ApiRequest) => {
        await core.canPostAsync(req, "channel");
        if (req.status == 200) {
            let body = req.body;
            let lst = new PubChannel();
            lst.name = withDefault(body["name"], "unnamed");
            setChannelProps(lst, body);
            lst.userid = req.userid;
            lst.userplatform = core.getUserPlatforms(req);
            let jsb1 = {};
            jsb1["pub"] = lst.toJson();
            await core.generateIdAsync(jsb1, 8);
            await channels.insertAsync(jsb1);
            await notifications.storeAsync(req, jsb1, "");
            await search.scanAndSearchAsync(jsb1);
            await core.returnOnePubAsync(channels, clone(jsb1), req);
        }
    });
    core.addRoute("POST", "*channel", "", async (req1: core.ApiRequest) => {
        checkChannelPermission(req1, req1.rootPub);
        if (req1.status == 200) {
            await search.updateAndUpsertAsync(core.pubsContainer, req1, async (entry: JsonBuilder) => {
                let lst1 = PubChannel.createFromJson(clone(entry["pub"]));
                setChannelProps(lst1, req1.body);
                entry["pub"] = lst1.toJson();
            });
            req1.response = ({});
        }
    });
    channelMemberships = await indexedStore.createStoreAsync(core.pubsContainer, "channelmembership");
    await core.setResolveAsync(channelMemberships, async (fetchResult1: indexedStore.FetchResult, apiRequest1: core.ApiRequest) => {
        let store = tdliteScripts.scripts;
        if (apiRequest1.verb == "channels") {
            store = channels;
            fetchResult1.items = td.arrayToJson(await core.followPubIdsAsync(fetchResult1.items, "channelid", store.kind));
        }
        else {
            let pubs = await core.followIdsAsync(fetchResult1.items, "updateKey", "updateslot");
            fetchResult1.items = td.arrayToJson(await core.followIdsAsync(td.arrayToJson(pubs), "scriptId", "script"));
            let opts = apiRequest1.queryOptions;
            // ?applyupdates=true no longer needed - already applied - perf opt
            delete opts['applyupdates']
        }
        await core.resolveAsync(store, fetchResult1, apiRequest1);        
    });
    await channelMemberships.createIndexAsync("channelid", entry1 => entry1["pub"]["channelid"]);
    await channelMemberships.createIndexAsync("updatekey", entry2 => orEmpty(entry2["updateKey"]));
    await channelMemberships.createIndexAsync("channelsof", entry3 => orEmpty(entry3["channelsof"]));
    core.addRoute("GET", "*script", "channels", async (req2: core.ApiRequest) => {
        let key = req2.rootPub["updateKey"];
        if (req2.argument == "") {
            await core.anyListAsync(channelMemberships, req2, "updatekey", key);
        }
        else {
            let entry21 = await core.getPubAsync(req2.argument, "channel");
            if (entry21 == null) {
                req2.status = 404;
            }
            else {
                let s2 = "gm-" + key + "-" + entry21["id"];
                let entry31 = await core.getPubAsync(s2, "channelmembership");
                if (entry31 == null) {
                    req2.status = 404;
                }
                else {
                    await core.returnOnePubAsync(channelMemberships, entry31, req2);
                }
            }
        }
    });
    core.addRoute("GET", "*script", "channelsof", async (req3: core.ApiRequest) => {
        if (req3.argument == "me") {
            req3.argument = req3.userid;
        }
        let userJs = await core.getPubAsync(req3.argument, "user");
        if (userJs == null) {
            req3.status = 404;
        }
        else {
            let key1 = req3.rootPub["updateKey"];
            await core.anyListAsync(channelMemberships, req3, "channelsof", key1 + ":" + userJs["id"]);
        }
    });
    core.addRoute("POST", "*script", "channels", async (req4: core.ApiRequest) => {
        let tmp = await channelOpAsync(req4);
        let memid = tmp[0];
        let listJs = tmp[1];         
        if (memid != "") {
            let memJson = await core.getPubAsync(memid, "channelmembership");
            if (memJson == null) {
                let jsb2 = ({ "pub": { } });
                jsb2["id"] = memid;
                let key2 = req4.rootPub["updateKey"];
                jsb2["updateKey"] = key2;
                jsb2["scriptid"] = req4.rootPub["id"];
                jsb2["channelsof"] = key2 + ":" + listJs["pub"]["userid"];
                jsb2["pub"]["channelid"] = listJs["id"];
                await channelMemberships.insertAsync(jsb2);
            }
            req4.response = ({});
        }
    });
    core.addRoute("DELETE", "*script", "channels", async (req5: core.ApiRequest) => {
        let tmp = await channelOpAsync(req5);
        let memid1 = tmp[0];
        let listJs1 = tmp[1];         
        if (memid1 != "") {
            let memJson1 = await core.getPubAsync(memid1, "channelmembership");
            if (memJson1 == null) {
                req5.status = 404;
            }
            else {
                let delok = await core.deleteAsync(memJson1);
                req5.response = ({});
            }
        }
    });
    core.addRoute("GET", "*channel", "scripts", async (req6: core.ApiRequest) => {
        await core.anyListAsync(channelMemberships, req6, "channelid", req6.rootId);
    });
}

function setChannelProps(lst: PubChannel, body: JsonObject) : void
{
    let bld = clone(lst.toJson());
    core.setFields(bld, body, ["description", "pictureid"]);
    lst.fromJson(clone(bld));
}

function checkChannelPermission(req: core.ApiRequest, listJs: JsonObject) : void
{
    if (req.userid == listJs["pub"]["userid"]) {
    }
    else {
        core.checkPermission(req, "pub-mgmt");
    }
}


async function channelOpAsync(req: core.ApiRequest) : Promise<[string, JsonObject]>
{
    let memid: string;
    let listJs: JsonObject;
    memid = "";
    listJs = await core.getPubAsync(req.argument, "channel");
    if (listJs == null) {
        req.status = 404;
    }
    else {
        checkChannelPermission(req, listJs);
        if (req.status == 200) {
            let key = req.rootPub["updateKey"];
            memid = "gm-" + key + "-" + listJs["id"];
        }
    }
    return <[string, JsonObject]>[memid, listJs]
}

