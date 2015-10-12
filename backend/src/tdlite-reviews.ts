/// <reference path='../typings/node/node.d.ts' />

'use strict';

import * as td from './td';
import * as assert from 'assert';

type JsonObject = td.JsonObject;
type JsonBuilder = td.JsonBuilder;


import * as indexedStore from "./indexed-store"
import * as core from "./tdlite-core"
import * as notifications from "./tdlite-notifications"

var withDefault = core.withDefault;
var orEmpty = td.orEmpty;

var logger = core.logger;
var httpCode = core.httpCode;
var reviews: indexedStore.Store;

export class PubReview
    extends core.PubOnPub
{
    @td.json public publicationuserid: string = "";
    @td.json public ispositive: boolean = true;
    static createFromJson(o:JsonObject) { let r = new PubReview(); r.fromJson(o); return r; }
}

export interface IPubReview {
    kind: string;
    time: number;
    id: string;
    userid: string;
    username: string;
    userscore: number;
    userhaspicture: boolean;
    userplatform: string[];
    publicationid: string;
    publicationname: string;
    publicationkind: string;
    publicationuserid: string;
    ispositive: boolean;
}


export async function initAsync() : Promise<void>
{
    reviews = await indexedStore.createStoreAsync(core.pubsContainer, "review");
    core.registerPubKind({
        store: reviews,
        deleteWithAuthor: true,
        importOne: importReviewAsync,
    })
    await core.setResolveAsync(reviews, async (fetchResult: indexedStore.FetchResult, apiRequest: core.ApiRequest) => {
        await resolveReviewsAsync(fetchResult);
    }
    , {
        byUserid: true
    });
    // ### by parent publication
    await reviews.createIndexAsync("pubid", entry => entry["pubid"]);
    core.addRoute("GET", "*pub", "reviews", async (req: core.ApiRequest) => {
        let id = req.rootId;
        if (req.rootPub["kind"] == "script") {
            id = withDefault(req.rootPub["updateKey"], id);
        }
        await core.anyListAsync(reviews, req, "pubid", id);
    });
    // ### by author of publication getting heart (not in TD)
    await reviews.createIndexAsync("publicationuserid", entry1 => entry1["pub"]["publicationuserid"]);
    core.addRoute("GET", "*user", "receivedreviews", async (req1: core.ApiRequest) => {
        await core.anyListAsync(reviews, req1, "publicationuserid", req1.rootId);
    });
    core.addRoute("GET", "*user", "reviewed", async (req2: core.ApiRequest) => {
        await getUserReviewedAsync(req2);
    });
    core.addRoute("POST", "*pub", "reviews", async (req3: core.ApiRequest) => {
        await core.canPostAsync(req3, "review");
        if (req3.status == 200) {
            await postReviewAsync(req3);
        }
    });
    core.addRoute("DELETE", "*review", "", async (req4: core.ApiRequest) => {
        if (await deleteReviewAsync(req4.rootPub)) {
            req4.response = ({});
        }
        else {
            req4.status = httpCode._409Conflict;
        }
    });
}

async function importReviewAsync(req: core.ApiRequest, body: JsonObject) : Promise<void>
{
    let review = new PubReview();
    review.fromJson(core.removeDerivedProperties(body));

    let pubid = review.publicationid;
    let entry = await core.pubsContainer.getAsync(pubid);
    if (core.isGoodEntry(entry)) {
        if (entry["kind"] == "script") {
            pubid = entry["updateKey"];
        }
        review.publicationuserid = entry["pub"]["userid"];
        let jsb = await updateReviewCountsAsync(review, pubid, req);
        if (req.status == 409) {
            await reviews.reserveIdAsync(review.id);
            req.status = httpCode._410Gone;
        }
    }
    else {
        req.status = 404;
    }
}

async function updateReviewCountsAsync(review: PubReview, pubid: string, req: core.ApiRequest) : Promise<JsonBuilder>
{
    let jsb: JsonBuilder;
    assert(pubid != "", "");
    jsb = {};
    jsb["pub"] = review.toJson();
    jsb["pubid"] = pubid;
    jsb["id"] = review.id;
    let key = "r-" + pubid + "-" + review.userid;
    jsb["ptrid"] = key;
    jsb["pubid"] = pubid;
    let ok = await core.tryInsertPubPointerAsync(key, review.id);
    if (ok) {
        if (false) {
            logger.debug("review: " + JSON.stringify(jsb));
        }
        await reviews.insertAsync(jsb);
        // ### update heart count
        await core.pubsContainer.updateAsync(pubid, async (entry: JsonBuilder) => {
            core.increment(entry, "positivereviews", 1);
        });
        await core.pubsContainer.updateAsync(review.publicationuserid, async (entry1: JsonBuilder) => {
            core.increment(entry1, "receivedpositivereviews", 1);
        });
    }
    else {
        req.status = httpCode._409Conflict;
    }
    return jsb;
}

export async function deleteReviewAsync(js: JsonObject) : Promise<boolean>
{
    let pubid = orEmpty(js["pubid"]);
    assert(pubid != "", "");
    let ok2 = await tryDeletePubPointerAsync(js["ptrid"]);
    if (ok2) {
        let delok = await core.deleteAsync(js);
        if (delok) {
            await core.pubsContainer.updateAsync(pubid, async (entry: JsonBuilder) => {
                core.increment(entry, "positivereviews", -1);
            });
            await core.pubsContainer.updateAsync(js["pub"]["publicationuserid"], async (entry1: JsonBuilder) => {
                core.increment(entry1, "receivedpositivereviews", -1);
            });
            return true;
        }
    }
    return false;
}

async function resolveReviewsAsync(entities: indexedStore.FetchResult) : Promise<void>
{
    await core.addUsernameEtcAsync(entities);
    let coll = (<PubReview[]>[]);
    for (let jsb of entities.items) {
        let review = PubReview.createFromJson(jsb["pub"]);
        coll.push(review);
    }
    entities.items = td.arrayToJson(coll);
}

async function getUserReviewedAsync(req: core.ApiRequest) : Promise<void>
{
    let pub = await core.pubsContainer.getAsync(req.argument);
    if (pub == null) {
        req.status = 404;
    }
    else {
        let id = pub["id"];
        if (pub["kind"] == "script") {
            id = pub["updateKey"];
        }
        let reviewPointer = await core.getPubAsync("r-" + id + "-" + req.rootId, "pubpointer");
        if (reviewPointer == null) {
            req.status = 404;
        }
        else {
            req.response = await core.getOnePubAsync(reviews, reviewPointer["pointer"], req);
            if (req.response == null) {
                req.status = 404;
            }
        }
    }
}


async function postReviewAsync(req: core.ApiRequest) : Promise<void>
{
    let baseKind = req.rootPub["kind"];
    if ( ! /^(comment|script|channel)$/.test(baseKind)) {
        req.status = httpCode._412PreconditionFailed;
    }
    else {
        let pubid = req.rootId;
        if (baseKind == "script") {
            pubid = req.rootPub["updateKey"];
        }

        let review = new PubReview();
        review.id = await reviews.generateIdAsync(10);
        review.userplatform = core.getUserPlatforms(req);
        review.userid = req.userid;
        review.time = await core.nowSecondsAsync();
        review.publicationid = req.rootId;
        review.publicationkind = baseKind;
        review.publicationname = orEmpty(req.rootPub["pub"]["name"]);
        review.publicationuserid = orEmpty(req.rootPub["pub"]["userid"]);
        review.ispositive = true;
        let jsb = await updateReviewCountsAsync(review, pubid, req);
        if (req.status == 200) {
            // ### return heart back
            await notifications.storeAsync(req, jsb, "");
            await core.returnOnePubAsync(reviews, td.clone(jsb), req);
        }
    }
}


async function tryDeletePubPointerAsync(key: string) : Promise<boolean>
{
    let ref = false;
    await core.pubsContainer.updateAsync(key, async (entry: JsonBuilder) => {
        if (orEmpty(entry["kind"]) == "pubpointer") {
            entry["kind"] = "reserved";
            ref = true;
        }
        else {
            ref = false;
        }
    });
    return ref;
}

