/// <reference path='../typings/node/node.d.ts' />

'use strict';

import * as td from './td';
import * as assert from 'assert';

type JsonObject = td.JsonObject;
type JsonBuilder = td.JsonBuilder;


import * as parallel from "./parallel"
import * as indexedStore from "./indexed-store"
import * as core from "./tdlite-core"
import * as tdliteWorkspace from "./tdlite-workspace"
import * as audit from "./tdlite-audit"
import * as notifications from "./tdlite-notifications"
import * as tdliteReviews from "./tdlite-reviews"

var withDefault = core.withDefault;
var orEmpty = td.orEmpty;

var logger = core.logger;
var httpCode = core.httpCode;
var abuseReports: indexedStore.Store;

export class PubAbusereport
    extends td.JsonRecord
{
    @td.json public kind: string = "";
    @td.json public time: number = 0;
    @td.json public id: string = "";
    @td.json public text: string = "";
    @td.json public userid: string = "";
    @td.json public username: string = "";
    @td.json public userscore: number = 0;
    @td.json public userhaspicture: boolean = false;
    @td.json public userplatform: string[];
    @td.json public publicationid: string = "";
    @td.json public publicationname: string = "";
    @td.json public publicationkind: string = "";
    @td.json public publicationuserid: string = "";
    @td.json public resolution: string = "";
    static createFromJson(o:JsonObject) { let r = new PubAbusereport(); r.fromJson(o); return r; }
}

export interface IPubAbusereport {
    kind: string;
    time: number;
    id: string;
    text: string;
    userid: string;
    username: string;
    userscore: number;
    userhaspicture: boolean;
    userplatform: string[];
    publicationid: string;
    publicationname: string;
    publicationkind: string;
    publicationuserid: string;
    resolution: string;
}

export class CandeleteResponse
    extends td.JsonRecord
{
    @td.json public publicationkind: string = "";
    @td.json public publicationname: string = "";
    @td.json public publicationuserid: string = "";
    @td.json public candeletekind: boolean = false;
    @td.json public candelete: boolean = false;
    @td.json public hasabusereports: boolean = false;
    @td.json public canmanage: boolean = false;
    static createFromJson(o:JsonObject) { let r = new CandeleteResponse(); r.fromJson(o); return r; }
}

export interface ICandeleteResponse {
    publicationkind: string;
    publicationname: string;
    publicationuserid: string;
    candeletekind: boolean;
    candelete: boolean;
    hasabusereports: boolean;
    canmanage: boolean;
}

export async function initAsync() : Promise<void>
{
    abuseReports = await indexedStore.createStoreAsync(core.pubsContainer, "abusereport");
    await core.setResolveAsync(abuseReports, async (fetchResult: indexedStore.FetchResult, apiRequest: core.ApiRequest) => {
        let users = await core.followPubIdsAsync(fetchResult.items, "publicationuserid", "");
        let withUsers = await core.addUsernameEtcCoreAsync(fetchResult.items);
        let coll = (<PubAbusereport[]>[]);
        let x = 0;
        for (let jsb of withUsers) {
            if (jsb["pub"]["userid"] == apiRequest.userid || 
                core.callerIsFacilitatorOf(apiRequest, users[x]) || 
                core.callerIsFacilitatorOf(apiRequest, jsb["*userid"])) {
                let report = PubAbusereport.createFromJson(jsb["pub"]);
                report.text = core.decrypt(report.text);
                coll.push(report);
            }
            x = x + 1;
        }
        fetchResult.items = td.arrayToJson(coll);
    }
    , {
        byUserid: true,
        byPublicationid: true
    });
    await abuseReports.createIndexAsync("publicationuserid", entry => entry["pub"]["publicationuserid"]);
    core.addRoute("GET", "*user", "abuses", async (req: core.ApiRequest) => {
        await core.anyListAsync(abuseReports, req, "publicationuserid", req.rootId);
    });
    core.addRoute("POST", "*abusereport", "", async (req1: core.ApiRequest) => {
        let pub = req1.rootPub["pub"];
        await core.checkFacilitatorPermissionAsync(req1, pub["publicationuserid"]);
        if (req1.status == 200) {
            let res = td.toString(req1.body["resolution"]);
            await core.pubsContainer.updateAsync(req1.rootId, async (entry1: JsonBuilder) => {
                core.setFields(entry1["pub"], req1.body, ["resolution"]);
            });
            await core.pubsContainer.updateAsync(pub["publicationid"], async (entry2: JsonBuilder) => {
                entry2["abuseStatus"] = res;
                delete entry2["abuseStatusPosted"];
            });
            req1.response = ({});
        }
    });
    core.addRoute("POST", "*pub", "abusereports", async (req2: core.ApiRequest) => {
        await core.canPostAsync(req2, "abusereport");
        if (req2.status == 200) {
            await postAbusereportAsync(req2);
        }
    });
    core.addRoute("DELETE", "*user", "", async (req8: core.ApiRequest) => {
        await core.checkDeletePermissionAsync(req8);
        // Level4 users cannot be deleted; you first have to downgrade their permissions.
        if (req8.status == 200 && core.hasPermission(req8.rootPub, "level4")) {
            req8.status = httpCode._402PaymentRequired;
        }
        if (req8.status == 200) {
            await deleteUserAsync(req8);
            req8.response = ({ "msg": "have a nice life" });
        }
    });
    core.addRoute("DELETE", "*pub", "", async (req3: core.ApiRequest) => {
        if (core.canBeAdminDeleted(req3.rootPub)) {
            await core.checkDeletePermissionAsync(req3);
            if (req3.status == 200) {
                await audit.logAsync(req3, "delete", {
                    oldvalue: await audit.auditDeleteValueAsync(req3.rootPub)
                });
                await deletePubRecAsync(req3.rootPub);
                req3.response = ({});
            }
        }
        else {
            req3.status = httpCode._405MethodNotAllowed;
        }
    });
    core.addRoute("GET", "*pub", "candelete", async (req4: core.ApiRequest) => {
        let resp = new CandeleteResponse();
        let pub1 = req4.rootPub["pub"];
        resp.publicationkind = req4.rootPub["kind"];
        resp.publicationname = withDefault(pub1["name"], "/" + req4.rootId);
        resp.publicationuserid = getAuthor(pub1);
        resp.candeletekind = core.canBeAdminDeleted(req4.rootPub) || core.hasSpecialDelete(req4.rootPub);
        let reports = await abuseReports.getIndex("publicationid").fetchAsync(req4.rootId, ({"count":10}));
        resp.hasabusereports = reports.items.length > 0 || reports.continuation != "";
        if (resp.candeletekind) {
            await core.checkDeletePermissionAsync(req4);
            if (req4.status == 200) {
                resp.candelete = true;
                if (resp.publicationuserid == req4.userid) {
                    await core.checkFacilitatorPermissionAsync(req4, resp.publicationuserid);
                    if (req4.status == 200) {
                        resp.canmanage = true;
                    }
                    else {
                        resp.canmanage = false;
                        req4.status = 200;
                    }
                }
                else {
                    resp.canmanage = true;
                }
            }
            else {
                resp.candelete = false;
                req4.status = 200;
            }
        }
        req4.response = resp.toJson();
    });
}


async function deletePubRecAsync(delEntry: JsonObject) : Promise<void>
{
    if (delEntry["kind"] == "review") {
        let delok3 = await tdliteReviews.deleteReviewAsync(delEntry);
    }
    else {
        let delok = await core.deleteAsync(delEntry);
        if (delok) {
            // TODO handle updateId stuff for scripts
            // TODO delete comments on this publication
            // TODO update comment counts
            let kind = delEntry["kind"];
            let entryid = delEntry["id"];
            let desc = core.getPubKind(kind)

            if (desc && desc.specialDeleteAsync)
                await desc.specialDeleteAsync(entryid, delEntry)

            let abuses = await abuseReports.getIndex("publicationid").fetchAllAsync(entryid);
            await parallel.forJsonAsync(abuses, async (json1: JsonObject) => {
                await core.pubsContainer.updateAsync(json1["id"], async (entry2: JsonBuilder) => {
                    entry2["pub"]["resolution"] = "deleted";
                });
            });

        }
    }
}

export async function postAbusereportAsync(req: core.ApiRequest) : Promise<void>
{
    let baseKind = req.rootPub["kind"];
    if ( ! canHaveAbuseReport(baseKind)) {
        req.status = httpCode._412PreconditionFailed;
    }
    else {
        let report = new PubAbusereport();
        report.text = core.encrypt(orEmpty(req.body["text"]), "ABUSE");
        report.userplatform = core.getUserPlatforms(req);
        report.userid = req.userid;
        report.time = await core.nowSecondsAsync();
        report.publicationid = req.rootId;
        report.publicationkind = baseKind;
        let pub = req.rootPub["pub"];
        report.publicationname = orEmpty(pub["name"]);
        report.publicationuserid = getAuthor(pub);
        let jsb = {};
        jsb["pub"] = report.toJson();
        await core.generateIdAsync(jsb, 10);
        await abuseReports.insertAsync(jsb);
        await core.pubsContainer.updateAsync(report.publicationid, async (entry: JsonBuilder) => {
            if (! entry["abuseStatus"]) {
                entry["abuseStatus"] = "active";
            }
            entry["abuseStatusPosted"] = "active";
        });
        await notifications.storeAsync(req, jsb, "");
        await core.returnOnePubAsync(abuseReports, td.clone(jsb), req);
    }
}

function getAuthor(pub: JsonObject) : string
{
    let author2: string;
    let author = pub["userid"];
    if (pub["kind"] == "user") {
        author = pub["id"];
    }
    return author;
    return author2;
}

export function canHaveAbuseReport(baseKind: string) : boolean
{
    let canAbuse2: boolean;
    let canAbuse = /^(art|comment|script|screenshot|channel|group|user)$/.test(baseKind);
    return canAbuse;
    return canAbuse2;
}

export async function deleteUserAsync(req8:core.ApiRequest)
{
    await tdliteWorkspace.deleteAllHistoryAsync(req8.rootId, req8);

    for (let pk of core.getPubKinds()) {
        // TODO We leave groups alone - rethink.
        if (pk.deleteWithAuthor)
            await deleteAllByUserAsync(pk.store, req8.rootId, req8);
    }

    // Bugs, releases, etc just stay
    let delok = await core.deleteAsync(req8.rootPub);
    await audit.logAsync(req8, "delete", {
        oldvalue: req8.rootPub
    });
}

async function deleteAllByUserAsync(store: indexedStore.Store, id: string, req: core.ApiRequest) : Promise<void>
{
    let logDelete = store.kind != "review";
    await store.getIndex("userid").forAllBatchedAsync(id, 50, async (json: JsonObject) => {
        await parallel.forJsonAsync(json, async (json1: JsonObject) => {
            if (logDelete) {
                await audit.logAsync(req, "delete-by-user", {
                    publicationid: json1["id"],
                    oldvalue: await audit.auditDeleteValueAsync(json1),
                    publicationkind: json1["kind"]
                });
            }
            await deletePubRecAsync(json1);
        });
    });
}

