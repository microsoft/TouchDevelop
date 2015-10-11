/// <reference path='../typings/node/node.d.ts' />

'use strict';

import * as td from './td';
import * as assert from 'assert';

type JsonObject = td.JsonObject;
type JsonBuilder = td.JsonBuilder;


import * as indexedStore from "./indexed-store"
import * as core from "./tdlite-core"
import * as search from "./tdlite-search"
import * as notifications from "./tdlite-notifications"

var orEmpty = td.orEmpty;

var logger = core.logger;
var httpCode = core.httpCode;

var comments: indexedStore.Store;

export class PubComment
    extends td.JsonRecord
{
    @td.json public kind: string = "";
    @td.json public time: number = 0;
    @td.json public id: string = "";
    @td.json public url: string = "";
    @td.json public text: string = "";
    @td.json public userid: string = "";
    @td.json public username: string = "";
    @td.json public userscore: number = 0;
    @td.json public userhaspicture: boolean = false;
    @td.json public userplatform: string[];
    @td.json public publicationid: string = "";
    @td.json public publicationname: string = "";
    @td.json public publicationkind: string = "";
    @td.json public nestinglevel: number = 0;
    @td.json public positivereviews: number = 0;
    @td.json public subscribers: number = 0;
    @td.json public comments: number = 0;
    @td.json public assignedtoid: string = "";
    @td.json public resolved: string = "";
    static createFromJson(o:JsonObject) { let r = new PubComment(); r.fromJson(o); return r; }
}

export interface IPubComment {
    kind: string;
    time: number;
    id: string;
    url: string;
    text: string;
    userid: string;
    username: string;
    userscore: number;
    userhaspicture: boolean;
    userplatform: string[];
    publicationid: string;
    publicationname: string;
    publicationkind: string;
    nestinglevel: number;
    positivereviews: number;
    subscribers: number;
    comments: number;
    assignedtoid: string;
    resolved: string;
}

export async function initAsync() : Promise<void>
{
    comments = await indexedStore.createStoreAsync(core.pubsContainer, "comment");
    core.registerPubKind({
        store: comments,
        deleteWithAuthor: true,
        importOne: importCommentAsync,
    })
    await core.setResolveAsync(comments, async (fetchResult: indexedStore.FetchResult, apiRequest: core.ApiRequest) => {
        await resolveCommentsAsync(fetchResult);
    }
    , {
        byUserid: true,
        byPublicationid: true
    });
    core.addRoute("POST", "*pub", "comments", async (req: core.ApiRequest) => {
        await core.canPostAsync(req, "comment");
        if (req.status == 200) {
            await postCommentAsync(req);
        }
    });
    core.addRoute("GET", "*pub", "comments", async (req1: core.ApiRequest) => {
        if (req1.status == 200) {
            // optimize the no-comments case
            if (core.orZero(req1.rootPub["pub"]["comments"]) == 0) {
                req1.response = ({"continuation":"","items":[],"kind":"list"});
            }
            else {
                await core.anyListAsync(comments, req1, "publicationid", req1.rootId);
            }
        }
    });
}

async function resolveCommentsAsync(entities: indexedStore.FetchResult) : Promise<void>
{
    await core.addUsernameEtcAsync(entities);
    let coll = (<PubComment[]>[]);
    for (let jsb of entities.items) {
        let comment = PubComment.createFromJson(jsb["pub"]);
        coll.push(comment);
    }
    entities.items = td.arrayToJson(coll);
}


async function postCommentAsync(req: core.ApiRequest) : Promise<void>
{
    let baseKind = req.rootPub["kind"];
    if ( ! /^(comment|script|group|screenshot|channel)$/.test(baseKind)) {
        req.status = httpCode._412PreconditionFailed;
    }
    else {
        let comment = new PubComment();
        comment.text = orEmpty(req.body["text"]);
        comment.userplatform = core.getUserPlatforms(req);
        comment.userid = req.userid;
        comment.time = await core.nowSecondsAsync();
        comment.publicationid = req.rootId;
        comment.publicationkind = baseKind;
        if (baseKind == "comment") {
            comment.nestinglevel = req.rootPub["pub"]["nestinglevel"] + 1;
            comment.publicationname = req.rootPub["pub"]["publicationname"];
        }
        else {
            comment.nestinglevel = 0;
            comment.publicationname = orEmpty(req.rootPub["pub"]["name"]);
        }
        let jsb = {};
        jsb["pub"] = comment.toJson();
        await core.generateIdAsync(jsb, 10);
        await comments.insertAsync(jsb);
        await updateCommentCountersAsync(comment);
        await notifications.storeAsync(req, jsb, "");
        await search.scanAndSearchAsync(jsb);
        // ### return comment back
        await core.returnOnePubAsync(comments, td.clone(jsb), req);
    }
}

async function importCommentAsync(req: core.ApiRequest, body: JsonObject) : Promise<void>
{
    let comment = new PubComment();
    comment.fromJson(core.removeDerivedProperties(body));

    let jsb = {};
    jsb["pub"] = comment.toJson();
    jsb["id"] = comment.id;
    await comments.insertAsync(jsb);
    await search.scanAndSearchAsync(jsb, {
        skipScan: true
    });
    await updateCommentCountersAsync(comment);
}

/**
 * ### update comment count
 */
async function updateCommentCountersAsync(comment: PubComment) : Promise<void>
{
    await core.pubsContainer.updateAsync(comment.publicationid, async (entry: JsonBuilder) => {
        core.increment(entry, "comments", 1);
    });
}

