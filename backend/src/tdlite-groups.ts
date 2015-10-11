/// <reference path='../typings/node/node.d.ts' />

'use strict';

import * as td from './td';
import * as assert from 'assert';

type JsonObject = td.JsonObject;
type JsonBuilder = td.JsonBuilder;

var asArray = td.asArray;

import * as parallel from "./parallel"
import * as indexedStore from "./indexed-store"
import * as core from "./tdlite-core"
import * as audit from "./tdlite-audit"
import * as search from "./tdlite-search"
import * as notifications from "./tdlite-notifications"
import * as tdliteUsers from "./tdlite-users"

var orFalse = core.orFalse;
var withDefault = core.withDefault;
var orEmpty = td.orEmpty;

var logger = core.logger;
var httpCode = core.httpCode;

var groups: indexedStore.Store;
var groupMemberships: indexedStore.Store;

export class PubGroup
    extends core.TopPub
{
    @td.json public pictureid: string = "";
    @td.json public allowexport: boolean = false;
    @td.json public allowappstatistics: boolean = false;
    @td.json public isrestricted: boolean = false;
    @td.json public isclass: boolean = false;
    @td.json public school: string = "";
    @td.json public grade: string = "";
    static createFromJson(o:JsonObject) { let r = new PubGroup(); r.fromJson(o); return r; }
}

export class PubGroupMembership
    extends core.Publication
{
    @td.json public publicationid: string = "";
    static createFromJson(o:JsonObject) { let r = new PubGroupMembership(); r.fromJson(o); return r; }
}

export async function initAsync() : Promise<void>
{
    groups = await indexedStore.createStoreAsync(core.pubsContainer, "group");
    core.registerPubKind({
        store: groups,
        deleteWithAuthor: false,
        importOne: importGroupAsync,
        specialDeleteAsync: async (entryid:string, delentry:JsonObject) => {
            let memberships = await groupMemberships.getIndex("publicationid").fetchAllAsync(entryid);
            await parallel.forJsonAsync(memberships, async (json: JsonObject) => {
                let uid = json["pub"]["userid"];
                let delok2 = await core.deleteAsync(json);
                await core.pubsContainer.updateAsync(uid, async (entry: JsonBuilder) => {
                    delete core.setBuilderIfMissing(entry, "groups")[entryid];
                    delete core.setBuilderIfMissing(entry, "owngroups")[entryid];
                });
            });
        },
    })
    await core.setResolveAsync(groups, async (fetchResult: indexedStore.FetchResult, apiRequest: core.ApiRequest) => {
        let hasGlobalList = core.callerHasPermission(apiRequest, "global-list");
        if ( ! hasGlobalList && apiRequest.userid == "") {
            fetchResult.items = ([]);
            return;
        }
        await core.addUsernameEtcAsync(fetchResult);
        let coll = (<PubGroup[]>[]);
        let grps = apiRequest.userinfo.json["groups"];
        for (let jsb of fetchResult.items) {
            let grp = PubGroup.createFromJson(jsb["pub"]);
            if ( ! hasGlobalList && grp.isclass && ! grps.hasOwnProperty(grp.id) && withDefault(apiRequest.queryOptions["code"], "none") != orEmpty(jsb["code"])) {
                // skip, no permission
            }
            else {
                coll.push(grp);
            }
        }
        fetchResult.items = td.arrayToJson(coll);
    }
    , {
        byUserid: true
    });
    core.addRoute("POST", "groups", "", async (req: core.ApiRequest) => {
        await core.canPostAsync(req, "group");
        if (req.status == 200) {
            let js2 = req.userinfo.json["settings"];
            if ( ! js2["emailverified"]) {
                req.status = httpCode._405MethodNotAllowed;
            }
        }
        if (req.status == 200) {
            let body = req.body;
            let group = new PubGroup();
            group.name = withDefault(body["name"], "unnamed");
            group.isclass = orFalse(body["isclass"]);
            if (!core.fullTD) group.isclass = true;
            setGroupProps(group, body);
            group.userid = req.userid;
            group.userplatform = core.getUserPlatforms(req);
            group.isrestricted = true;
            let jsb1 = {};
            jsb1["pub"] = group.toJson();
            await core.generateIdAsync(jsb1, 8);
            await groups.insertAsync(jsb1);
            await audit.logAsync(req, "create-group", {
                subjectid: req.userid,
                publicationid: jsb1["id"],
                publicationkind: "group",
                newvalue: td.clone(jsb1)
            });
            await addUserToGroupAsync(group.userid, td.clone(jsb1), (<core.ApiRequest>null));
            await notifications.storeAsync(req, jsb1, "");
            await search.scanAndSearchAsync(jsb1);
            // re-fetch user to include new permission
            await core.setReqUserIdAsync(req, req.userid);
            await core.returnOnePubAsync(groups, td.clone(jsb1), req);
        }
    });
    core.addRoute("POST", "*group", "", async (req: core.ApiRequest) => {
        checkGroupPermission(req);
        if (req.status == 200) {
            let needsReindex = false;
            let user = orEmpty(req.body["userid"]);
            if (user == req.rootPub["pub"]["userid"]) {
                user = "";
            }
            if (user != "") {
                let newOwner = await core.getPubAsync(user, "user");
                if (newOwner == null || ! core.hasPermission(newOwner, "post-group") || ! newOwner["groups"].hasOwnProperty(req.rootId)) {
                    req.status = httpCode._412PreconditionFailed;
                    return;
                }
                await groups.reindexAsync(req.rootId, async (v: JsonBuilder) => {
                    v["pub"]["userid"] = user;
                });
                await reindexGroupsAsync(newOwner);
                await reindexGroupsAsync(req.userinfo.json);
            }
            await search.updateAndUpsertAsync(core.pubsContainer, req, async (entry: JsonBuilder) => {
                let group1 = PubGroup.createFromJson(td.clone(entry["pub"]));
                setGroupProps(group1, req.body);
                entry["pub"] = group1.toJson();
            });
            req.response = ({});
        }
    });
    core.addRoute("GET", "*group", "code", async (req2: core.ApiRequest) => {
        checkGroupPermission(req2);
        if (req2.status == 200) {
            let s = orEmpty(req2.rootPub["code"]);
            let jsb2 = {};
            jsb2["code"] = s;
            jsb2["expiration"] = await core.nowSecondsAsync() + 365 * 24 * 3600;
            req2.response = td.clone(jsb2);
        }
    });
    core.addRoute("GET", "*user", "code", async (req3: core.ApiRequest) => {
        let passId = core.normalizeAndHash(req3.argument);
        let codeObj = await tdliteUsers.passcodesContainer.getAsync(passId);
        if (codeObj == null || codeObj["kind"] == "reserved") {
            req3.status = httpCode._404NotFound;
        }
        else {
            let kind = codeObj["kind"];
            let jsb3 = {};
            if (kind == "userpointer") {
            }
            else if (kind == "activationcode") {
                if (codeObj["credit"] <= 0) {
                    jsb3["verb"] = "SpentActivationCode";
                }
                else {
                    jsb3["verb"] = "ActivationCode";
                    let crd = codeObj["singlecredit"];
                    if (crd != null && codeObj["orig_credit"] != crd) {
                        jsb3["verb"] = "MultiActivationCode";
                    }
                    jsb3["permissions"] = orEmpty(codeObj["permissions"]);
                    jsb3["credit"] = core.orZero(codeObj["singlecredit"]);
                }
            }
            else if (kind == "groupinvitation") {
                jsb3["verb"] = "JoinGroup";
                jsb3["data"] = codeObj["groupid"];
            }
            if (jsb3.hasOwnProperty("verb")) {
                req3.response = td.clone(jsb3);
            }
            else {
                req3.status = httpCode._404NotFound;
            }
        }
    });
    core.addRoute("GET", "*group", "approvals", async (req4: core.ApiRequest) => {
        checkGroupPermission(req4);
        if (req4.status == 200) {
            let js = req4.rootPub["approvals"];
            if (js == null) {
                js = ([]);
            }
            req4.response = js;
        }
    });
    core.addRoute("POST", "*user", "code", async (req5: core.ApiRequest) => {
        core.meOnly(req5);
        if (req5.status == 200) {
            let passId1 = core.normalizeAndHash(req5.argument);
            let codeObj1 = await tdliteUsers.passcodesContainer.getAsync(passId1);
            if (codeObj1 == null || codeObj1["kind"] == "reserved") {
                req5.status = 404;
            }
            else {
                let kind1 = codeObj1["kind"];
                let jsb31 = {};
                if (kind1 == "userpointer") {
                    req5.status = 404;
                }
                else if (kind1 == "activationcode") {
                    let crd1 = codeObj1["singlecredit"];
                    if (crd1 != null && codeObj1["orig_credit"] != crd1) {
                        req5.status = httpCode._409Conflict;
                    }
                    else if (codeObj1["credit"] > 0) {
                        await tdliteUsers.applyCodeAsync(req5.rootPub, codeObj1, passId1, req5);
                        req5.response = ({});
                    }
                    else {
                        req5.status = httpCode._409Conflict;
                    }
                }
                else if (kind1 == "groupinvitation") {
                    let groupJson = await core.getPubAsync(codeObj1["groupid"], "group");
                    if (groupJson == null) {
                        req5.status = 404;
                    }
                    else {
                        let grp1 = PubGroup.createFromJson(groupJson["pub"]);
                        if (grp1.isclass) {
                            await addGroupApprovalAsync(groupJson, req5.rootPub);
                            req5.response = ({ "status": "waiting" });
                        }
                        else {
                            await addUserToGroupAsync(req5.rootId, groupJson, req5);
                            req5.response = ({ "status": "joined" });
                        }
                    }
                }
            }
        }
    });
    core.addRoute("POST", "*group", "code", async (req6: core.ApiRequest) => {
        checkGroupPermission(req6);
        if (req6.status == 200) {
            let grCode = orEmpty(req6.rootPub["code"]);
            if (grCode != "") {
                await tdliteUsers.passcodesContainer.updateAsync(core.normalizeAndHash(grCode), async (entry1: JsonBuilder) => {
                    entry1["kind"] = "reserved";
                });
            }
            let numCode = "";
            for (let i = 0; i < 12; i++) {
                if (false) {
                    if (i > 0 && i % 4 == 0) {
                        numCode = numCode + " ";
                    }
                }
                numCode = numCode + td.randomRange(0, 9);
            }
            grCode = numCode;
            let hashed = core.normalizeAndHash(grCode);
            await tdliteUsers.passcodesContainer.updateAsync(hashed, async (entry2: JsonBuilder) => {
                entry2["kind"] = "groupinvitation";
                entry2["groupid"] = req6.rootId;
                entry2["time"] = await core.nowSecondsAsync();
            });
            await core.pubsContainer.updateAsync(req6.rootId, async (entry3: JsonBuilder) => {
                entry3["code"] = grCode;
            });
            req6.response = ({});
        }
    });
    core.addRoute("DELETE", "*group", "code", async (req: core.ApiRequest) => {
        checkGroupPermission(req);
        if (req.status == 200) {
            let s1 = core.normalizeAndHash(req.rootPub["code"]);
            if (s1 == "") {
                req.status = 404;
            }
            else {
                await tdliteUsers.passcodesContainer.updateAsync(s1, async (entry4: JsonBuilder) => {
                    entry4["kind"] = "reserved";
                });
                await core.pubsContainer.updateAsync(req.rootId, async (entry5: JsonBuilder) => {
                    delete entry5["code"];
                });
                req.response = ({});
            }
        }
    });
    groupMemberships = await indexedStore.createStoreAsync(core.pubsContainer, "groupmembership");
    await core.setResolveAsync(groupMemberships, async (fetchResult1: indexedStore.FetchResult, apiRequest1: core.ApiRequest) => {
        if (apiRequest1.userid == "") {
            fetchResult1.items = ([]);
            return;
        }
        let grps1 = apiRequest1.userinfo.json["groups"];
        let hasGlobalList1 = core.callerHasPermission(apiRequest1, "global-list");

        let field = "publicationid";
        let store = groups;
        if (apiRequest1.verb == "users") {
            field = "userid";
            store = tdliteUsers.users;
        }
        if ( ! hasGlobalList1) {
            fetchResult1.items = td.arrayToJson(asArray(fetchResult1.items).filter(elt => grps1.hasOwnProperty(elt["pub"]["publicationid"])));
        }
        let pubs = await core.followPubIdsAsync(fetchResult1.items, field, store.kind);
        fetchResult1.items = td.arrayToJson(pubs);
        await core.resolveAsync(store, fetchResult1, apiRequest1);        
    });
    await groupMemberships.createIndexAsync("userid", entry6 => entry6["pub"]["userid"]);
    core.addRoute("POST", "admin", "reindexgroups", async (req8: core.ApiRequest) => {
        core.checkPermission(req8, "operator");
        if (req8.status == 200) {
            /* async */ tdliteUsers.users.getIndex("all").forAllBatchedAsync("all", 20, async (json: JsonObject) => {
                await parallel.forJsonAsync(json, async (json1: JsonObject) => {
                    await reindexGroupsAsync(json1);
                });
            });
            req8.response = ({});
        }
    });
    core.addRoute("GET", "*user", "groups", async (req9: core.ApiRequest) => {
        if (req9.argument == "") {
            await core.anyListAsync(groupMemberships, req9, "userid", req9.rootId);
        }
        else {
            let entry21 = await core.getPubAsync(req9.argument, "group");
            if (entry21 == null) {
                req9.status = 404;
            }
            else {
                let s2 = "gm-" + req9.rootId + "-" + entry21["id"];
                let entry31 = await core.getPubAsync(s2, "groupmembership");
                if (entry31 == null) {
                    req9.status = 404;
                }
                else {
                    await core.returnOnePubAsync(groupMemberships, entry31, req9);
                }
            }
        }
    });
    core.addRoute("POST", "*user", "groups", async (req10: core.ApiRequest) => {
        let entry22 = await core.getPubAsync(req10.argument, "group");
        if (entry22 == null) {
            req10.status = 404;
        }
        else {
            let gr = PubGroup.createFromJson(entry22["pub"]);
            let askedToJoin = core.jsonArrayIndexOf(entry22["approvals"], req10.rootId) >= 0;
            if (askedToJoin && gr.isclass && withDefault(gr.userid, "???") == req10.userid) {
                // OK, this is an approval.
                if (orFalse(req10.rootPub["awaiting"])) {
                    await audit.logAsync(req10, "approve-user", {
                        subjectid: req10.rootId,
                        publicationid: gr.id,
                        publicationkind: "group"
                    });
                    await core.pubsContainer.updateAsync(req10.rootId, async (entry7: JsonBuilder) => {
                        delete entry7["awaiting"];
                    });
                }
                await core.pubsContainer.updateAsync(gr.id, async (entry8: JsonBuilder) => {
                    let approvals:string[] = entry8["approvals"];
                    let idx = core.jsonArrayIndexOf(approvals, req10.rootId);
                    if (idx >= 0) {
                        approvals.splice(idx, 1);
                    }
                });
                await notifications.sendAsync(entry22, "groupapproved", req10.rootPub);
            }
            else {
                core.meOnly(req10);
                if (gr.isrestricted) {
                    core.checkPermission(req10, "user-mgmt");
                }
            }
            if (req10.status == 200) {
                await addUserToGroupAsync(req10.rootId, entry22, req10);
                req10.response = ({});
            }
        }
    });
    core.addRoute("DELETE", "*user", "groups", async (req11: core.ApiRequest) => {
        let entry23 = await core.getPubAsync(req11.argument, "group");
        if (entry23 == null) {
            req11.status = 404;
        }
        else {
            let grid = entry23["id"];
            core.meOnly(req11);
            if (req11.status == 200 && req11.rootId == entry23["pub"]["userid"]) {
                // Cannot remove core.self from the group.
                req11.status = httpCode._412PreconditionFailed;
            }
            if (req11.status == 200) {
                let memid = "gm-" + req11.rootId + "-" + grid;
                let entry41 = await core.getPubAsync(memid, "groupmembership");
                if (entry41 == null) {
                    req11.status = 404;
                }
                else {
                    let delok = await core.deleteAsync(entry41);
                    await core.pubsContainer.updateAsync(req11.rootId, async (entry9: JsonBuilder) => {
                        delete core.setBuilderIfMissing(entry9, "groups")[grid];
                    });
                    await audit.logAsync(req11, "leave-group", {
                        subjectid: req11.rootId,
                        publicationid: grid,
                        publicationkind: "group"
                    });
                    req11.response = ({});
                }
            }
        }
    });
    await groupMemberships.createIndexAsync("publicationid", entry10 => entry10["pub"]["publicationid"]);
    core.addRoute("GET", "*group", "users", async (req12: core.ApiRequest) => {
        await core.anyListAsync(groupMemberships, req12, "publicationid", req12.rootId);
    });
}

async function importGroupAsync(req: core.ApiRequest, body: JsonObject) : Promise<void>
{
    let grp = new PubGroup();
    grp.fromJson(core.removeDerivedProperties(body));

    let jsb = {};
    jsb["pub"] = grp.toJson();
    jsb["id"] = grp.id;
    await groups.insertAsync(jsb);
    await search.scanAndSearchAsync(jsb, {
        skipScan: true
    });
}

function setGroupProps(group: PubGroup, body: JsonObject) : void
{
    let bld = td.clone(group.toJson());
    let fields = ["description", "pictureid"]
    if (core.fullTD)
        fields = fields.concat(["school", "grade", "allowappstatistics", "allowexport", "isrestricted"]);    
    core.setFields(bld, body, fields);
    group.fromJson(td.clone(bld));
}

export async function addUserToGroupAsync(userid: string, gr: JsonObject, auditReq: core.ApiRequest) : Promise<void>
{
    let sub = new PubGroupMembership();
    sub.id = "gm-" + userid + "-" + gr["id"];
    sub.userid = userid;
    sub.time = await core.nowSecondsAsync();
    sub.publicationid = gr["id"];
    let jsb = {};
    jsb["pub"] = sub.toJson();
    jsb["id"] = sub.id;
    await groupMemberships.insertAsync(jsb);
    let pub = gr["pub"];
    if (pub["isclass"]) {
        await core.pubsContainer.updateAsync(userid, async (entry: JsonBuilder) => {
            let grps = core.setBuilderIfMissing(entry, "groups");
            grps[gr["id"]] = 1;
            if (pub["userid"] == userid) {
                let dictionary = core.setBuilderIfMissing(entry, "owngroups");
                dictionary[gr["id"]] = 1;
            }
        });
    }
    if (auditReq != null) {
        await audit.logAsync(auditReq, "join-group", {
            userid: pub["userid"],
            subjectid: userid,
            publicationid: gr["id"],
            publicationkind: "group"
        });
    }
}

async function reindexGroupsAsync(json: JsonObject) : Promise<void>
{
    let userid = json["id"];
    let groups = await getUser_sGroupsAsync(userid);
    let grps = {};
    let owngrps = {};
    for (let js of groups) {
        let grp = PubGroup.createFromJson(js["pub"]);
        if (grp.isclass) {
            grps[grp.id] = 1;
            if (grp.userid == userid) {
                owngrps[grp.id] = 1;
            }
        }
    }
    await core.pubsContainer.updateAsync(userid, async (entry: JsonBuilder) => {
        entry["groups"] = grps;
        entry["owngroups"] = owngrps;
    });
    logger.debug("reindex grps: " + userid + " -> " + JSON.stringify(grps));
}

export async function addGroupApprovalAsync(groupJson: JsonObject, userJson: JsonObject) : Promise<void>
{
    let grpid = groupJson["id"];
    let userid = userJson["id"];
    await core.pubsContainer.updateAsync(grpid, async (entry: JsonBuilder) => {
        let appr:string[] = entry["approvals"];
        if (appr == null) {
            appr = [];
            entry["approvals"] = appr;
        }
        let idx2 = core.jsonArrayIndexOf(appr, userid);        
        if (idx2 >= 0) {
            appr.splice(idx2, 1);
        }
        if (appr.length > 200) {
            appr.shift();            
        }
        appr.push(userid);
    });
    await notifications.sendAsync(groupJson, "groupapproval", userJson);
}

export async function getUser_sGroupsAsync(subjectUserid: string) : Promise<JsonObject[]>
{
    let groups: JsonObject[];
    let fetchResult = await groupMemberships.getIndex("userid").fetchAllAsync(subjectUserid);
    groups = await core.followPubIdsAsync(fetchResult, "publicationid", "group");
    return groups;
}

export function checkGroupPermission(req: core.ApiRequest) : void
{
    if (req.userid == req.rootPub["pub"]["userid"]) {
    }
    else {
        core.checkPermission(req, "pub-mgmt");
    }
}