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

import * as azureTable from "./azure-table"
import * as azureBlobStorage from "./azure-blob-storage"
import * as parallel from "./parallel"
import * as cachedStore from "./cached-store"
import * as indexedStore from "./indexed-store"
import * as wordPassword from "./word-password"
import * as core from "./tdlite-core"
import * as tdliteScripts from "./tdlite-scripts"
import * as tdliteWorkspace from "./tdlite-workspace"
import * as nodemailer from "./nodemailer"
import * as sendgrid from "./sendgrid"
import * as tdliteData from "./tdlite-data"
import * as audit from "./tdlite-audit"
import * as search from "./tdlite-search"
import * as tdliteGroups from "./tdlite-groups"
import * as main from "./tdlite"

var orFalse = core.orFalse;
var withDefault = core.withDefault;
var orEmpty = td.orEmpty;

var logger = core.logger;
var httpCode = core.httpCode;

export var users: indexedStore.Store;
export var tokensTable: azureTable.Table;
export var passcodesContainer: cachedStore.Container;
var emailKeyid: string = "";
var settingsOptionsJson = tdliteData.settingsOptionsJson;
var useSendgrid: boolean = false;


export class PubUser
    extends td.JsonRecord
{
    @json public kind: string = "";
    @json public id: string = "";
    @json public url: string = "";
    @json public name: string = "";
    @json public haspicture: boolean = false;
    @json public time: number = 0;
    @json public about: string = "";
    @json public features: number = 0;
    @json public activedays: number = 0;
    @json public receivedpositivereviews: number = 0;
    @json public subscribers: number = 0;
    @json public score: number = 0;
    @json public isadult: boolean = false;
    static createFromJson(o:JsonObject) { let r = new PubUser(); r.fromJson(o); return r; }
}

export interface IPubUser {
    kind: string;
    id: string;
    url: string;
    name: string;
    haspicture: boolean;
    time: number;
    about: string;
    features: number;
    activedays: number;
    receivedpositivereviews: number;
    subscribers: number;
    score: number;
    isadult: boolean;
}

export class PubUserSettings
    extends td.JsonRecord
{
    @json public nickname: string = "";
    @json public aboutme: string = "";
    @json public website: string = "";
    @json public notifications: boolean = false;
    @json public notifications2: string = "";
    @json public picturelinkedtofacebook: string = "";
    @json public picture: string = "";
    @json public gender: string = "";
    @json public realname: string = "";
    @json public yearofbirth: number = 0;
    @json public location: string = "";
    @json public culture: string = "";
    @json public howfound: string = "";
    @json public programmingknowledge: string = "";
    @json public occupation: string = "";
    @json public twitterhandle: string = "";
    @json public email: string = "";
    @json public emailverificationsent: boolean = false;
    @json public emailverified: boolean = false;
    @json public emailnewsletter2: string = "";
    @json public emailfrequency: string = "";
    @json public editorMode: string = "";
    @json public school: string = "";
    @json public wallpaper: string = "";
    @json public permissions: string = "";
    @json public credit: number = 0;
    @json public userid: string = "";
    @json public previousemail: string = "";
    static createFromJson(o:JsonObject) { let r = new PubUserSettings(); r.fromJson(o); return r; }
}

export interface IPubUserSettings {
    nickname: string;
    aboutme: string;
    website: string;
    notifications: boolean;
    notifications2: string;
    picturelinkedtofacebook: string;
    picture: string;
    gender: string;
    realname: string;
    yearofbirth: number;
    location: string;
    culture: string;
    howfound: string;
    programmingknowledge: string;
    occupation: string;
    twitterhandle: string;
    email: string;
    emailverificationsent: boolean;
    emailverified: boolean;
    emailnewsletter2: string;
    emailfrequency: string;
    editorMode: string;
    school: string;
    wallpaper: string;
    permissions: string;
    credit: number;
    userid: string;
    previousemail: string;
}

export async function initAsync() : Promise<void>
{
    await nodemailer.initAsync();
    if (core.hasSetting("SENDGRID_API_KEY")) {
        useSendgrid = true;
        await sendgrid.initAsync("", "");
    }

    tokensTable = await core.tableClient.createTableIfNotExistsAsync("tokens");
    passcodesContainer = await cachedStore.createContainerAsync("passcodes", {
        noCache: true
    });

    users = await indexedStore.createStoreAsync(core.pubsContainer, "user");
    core.registerPubKind({
        store: users,
        deleteWithAuthor: false,
        importOne: importUserAsync
    })
    await core.setResolveAsync(users, async (fetchResult: indexedStore.FetchResult, apiRequest: core.ApiRequest) => {
        resolveUsers(fetchResult, apiRequest);
    });
    await users.createIndexAsync("seconadaryid", entry => orEmpty(entry["secondaryid"]));
    core.addRoute("GET", "secondaryid", "*", async (req: core.ApiRequest) => {
        core.checkPermission(req, "user-mgmt");
        if (req.status == 200) {
            await core.anyListAsync(users, req, "secondaryid", req.verb);
        }
    });
    // ### all
    core.addRoute("POST", "*user", "permissions", async (req1: core.ApiRequest) => {
        core.checkMgmtPermission(req1, "user-mgmt");
        if (req1.status == 200) {
            let perm = td.toString(req1.body["permissions"]);
            if (perm != null) {
                perm = core.normalizePermissions(perm);
                core.checkPermission(req1, "root");
                if (req1.status != 200) {
                    return;
                }
                await audit.logAsync(req1, "set-perm", {
                    data: perm
                });
                if (core.isAlarming(perm)) {
                    await audit.logAsync(req1, "set-perm-high", {
                        data: perm
                    });
                }
                await search.updateAndUpsertAsync(core.pubsContainer, req1, async (entry1: JsonBuilder) => {
                    entry1["permissions"] = perm;
                    await sendPermissionNotificationAsync(req1, entry1);
                });
            }
            let credit = td.toNumber(req1.body["credit"]);
            if (credit != null) {
                await audit.logAsync(req1, "set-credit", {
                    data: credit.toString()
                });
                await search.updateAndUpsertAsync(core.pubsContainer, req1, async (entry2: JsonBuilder) => {
                    entry2["credit"] = credit;
                    entry2["totalcredit"] = credit;
                });
            }
            req1.response = ({});
        }
    });
    core.addRoute("GET", "*user", "permissions", async (req2: core.ApiRequest) => {
        core.checkMgmtPermission(req2, "user-mgmt");
        if (req2.status == 200) {
            let jsb = {};
            for (let s of ["permissions", "login"]) {
                jsb[s] = orEmpty(req2.rootPub[s]);
            }
            for (let s1 of ["credit", "totalcredit", "lastlogin"]) {
                jsb[s1] = core.orZero(req2.rootPub[s1]);
            }
            req2.response = clone(jsb);
        }
    });
    core.addRoute("POST", "logout", "", async (req3: core.ApiRequest) => {
        if (req3.userid != "") {
            if (orFalse(req3.body["everywhere"])) {
                let entities = await tokensTable.createQuery().partitionKeyIs(req3.userid).fetchAllAsync();
                await parallel.forAsync(entities.length, async (x: number) => {
                    let json = entities[x];
                    // TODO: filter out reason=admin?
                    let token = core.Token.createFromJson(json);
                    await tokensTable.deleteEntityAsync(token.toJson());
                    await core.redisClient.setpxAsync("tok:" + tokenString(token), "", 500);
                });
            }
            else {
                await tokensTable.deleteEntityAsync(req3.userinfo.token.toJson());
                await core.redisClient.setpxAsync("tok:" + tokenString(req3.userinfo.token), "", 500);
            }
            req3.response = ({});
            req3.headers = {};
            let s4 = wrapAccessTokenCookie("logout").replace(/Dec 9999/g, "Dec 1971");
            req3.headers["Set-Cookie"] = s4;
        }
        else {
            req3.status = httpCode._401Unauthorized;
        }
    });
    // This is for test users for load testing nd doe **system accounts**
    core.addRoute("POST", "users", "", async (req4: core.ApiRequest) => {
        core.checkPermission(req4, "root");
        if (req4.status == 200) {
            let opts = req4.body;
            let pubUser = new PubUser();
            pubUser.name = withDefault(opts["name"], "Dummy" + td.randomInt(100000));
            pubUser.about = withDefault(opts["about"], "");
            pubUser.time = await core.nowSecondsAsync();
            let jsb1 = {};
            jsb1["pub"] = pubUser.toJson();
            jsb1["settings"] = ({});
            jsb1["permissions"] = ",preview,";
            jsb1["secondaryid"] = cachedStore.freshShortId(12);
            if (false) {
                jsb1["password"] = core.hashPassword("", opts["password"]);
            }
            await core.generateIdAsync(jsb1, 4);
            await users.insertAsync(jsb1);
            let pass2 = wordPassword.generate();
            req4.rootId = jsb1["id"];
            req4.rootPub = clone(jsb1);
            await setPasswordAsync(req4, pass2, "");
            let jsb3 = clone(await core.resolveOnePubAsync(users, req4.rootPub, req4));
            jsb3["password"] = pass2;
            req4.response = clone(jsb3);
        }
    });
    core.addRoute("POST", "*user", "addauth", async (req5: core.ApiRequest) => {
        let tokenJs = req5.userinfo.token;
        if (orEmpty(req5.body["key"]) != core.tokenSecret) {
            req5.status = httpCode._403Forbidden;
        }
        else if (tokenJs == null) {
            req5.status = httpCode._404NotFound;
        }
        else {
            let s2 = tokenJs.reason;
            if (td.startsWith(s2, "id/")) {
                await passcodesContainer.updateAsync(s2, async (entry3: JsonBuilder) => {
                    entry3["userid"] = req5.rootId;
                });
                req5.response = ({});
            }
            else {
                req5.status = httpCode._400BadRequest;
            }
        }
    });
    core.addRoute("POST", "*user", "swapauth", async (req: core.ApiRequest) => {
        core.checkPermission(req, "root");
        if (req.status != 200) {
            return;
        }
        if (req.rootId == req.argument) {
            req.status = httpCode._412PreconditionFailed;
            return;
        }
        let otherUser = await core.getPubAsync(req.argument, "user");
        if (otherUser == null) {
            req.status = httpCode._404NotFound;
            return;
        }
        let rootPassId = req.rootPub["login"];
        let rootPass = await passcodesContainer.getAsync(rootPassId);
        let otherPassId = otherUser["login"];
        let otherPass = await passcodesContainer.getAsync(otherPassId);
        if (rootPass == null || otherPass == null) {
            req.status = httpCode._424FailedDependency;
            return;
        }
        await passcodesContainer.updateAsync(rootPassId, async (entry4: JsonBuilder) => {
            entry4["userid"] = otherUser["id"];
        });
        await passcodesContainer.updateAsync(otherPassId, async (entry5: JsonBuilder) => {
            entry5["userid"] = req.rootId;
        });
        await core.pubsContainer.updateAsync(req.rootId, async (entry6: JsonBuilder) => {
            entry6["login"] = otherPassId;
        });
        await core.pubsContainer.updateAsync(otherUser["id"], async (entry7: JsonBuilder) => {
            entry7["login"] = rootPassId;
        });
        let jsb4 = {};
        jsb4["oldrootpass"] = rootPass;
        jsb4["oldotherpass"] = otherPass;
        req.response = clone(jsb4);
    });
    core.addRoute("POST", "*user", "token", async (req7: core.ApiRequest) => {
        core.checkPermission(req7, "signin-" + req7.rootId);
        if (req7.status == 200) {
            let resp = {};
            let tok = await generateTokenAsync(req7.rootId, "admin", "webapp2");
            if (tok.cookie) {
                if (req7.headers == null) {
                    req7.headers = {};
                }
                req7.headers["Set-Cookie"] = wrapAccessTokenCookie(tok.cookie);
            }
            else {
                assert(false, "no cookie in token");
            }
            await audit.logAsync(req7, "signin-as", {
                data: core.sha256(tok.url).substr(0, 10)
            });
            resp["token"] = tok.url;
            req7.response = clone(resp);
        }
    });
    core.addRoute("DELETE", "*user", "", async (req8: core.ApiRequest) => {
        await core.checkDeletePermissionAsync(req8);
        // Level4 users cannot be deleted; you first have to downgrade their permissions.
        if (req8.status == 200 && core.hasPermission(req8.rootPub, "level4")) {
            req8.status = httpCode._402PaymentRequired;
        }
        if (req8.status == 200) {
            await main.deleteUserAsync(req8);
            req8.response = ({ "msg": "have a nice life" });
        }
    });
    core.addRoute("GET", "*user", "resetpassword", async (req9: core.ApiRequest) => {
        await core.checkFacilitatorPermissionAsync(req9, req9.rootId);
        if (req9.status == 200) {
            let jsb2 = {};
            let coll2 = td.range(0, 10).map<string>(elt => wordPassword.generate());
            jsb2["passwords"] = td.arrayToJson(coll2);
            req9.response = clone(jsb2);
        }
    });
    core.addRoute("POST", "*user", "resetpassword", async (req10: core.ApiRequest) => {
        await core.checkFacilitatorPermissionAsync(req10, req10.rootId);
        if (req10.status == 200) {
            let pass = orEmpty(req10.body["password"]);
            let prevPass = orEmpty(req10.rootPub["login"]);
            if (pass.length < 10) {
                req10.status = httpCode._412PreconditionFailed;
            }
            else if ( ! td.startsWith(prevPass, "code/")) {
                req10.status = httpCode._405MethodNotAllowed;
            }
            else {
                await setPasswordAsync(req10, pass, prevPass);
            }
        }
    });
    core.addRoute("POST", "updatecodes", "", async (req11: core.ApiRequest) => {
        core.checkPermission(req11, "root");
        if (req11.status != 200) {
            return;
        }
        let codes = req11.body["codes"];
        await parallel.forBatchedAsync(codes.length, 50, async (x1: number) => {
            let s5 = td.toString(codes[x1]);
            await passcodesContainer.updateAsync(core.normalizeAndHash(s5), async (entry8: JsonBuilder) => {
                assert(td.stringContains(entry8["permissions"], ","), "");
                entry8["permissions"] = req11.body["permissions"];
            });
        }
        , async () => {
        });
        req11.response = ({});
    });
    core.addRoute("POST", "generatecodes", "", async (req12: core.ApiRequest) => {
        let perm1 = core.normalizePermissions(td.toString(req12.body["permissions"]));
        let grps = orEmpty(req12.body["groups"]);
        let addperm = "";
        if (grps != "") {
            addperm = ",user-mgmt";
        }
        if (perm1 == "") {
            perm1 = "educator";
        }
        if (core.isAlarming(perm1)) {
            req12.status = httpCode._402PaymentRequired;
        }
        let numCodes = td.toNumber(req12.body["count"]);
        if (numCodes > 1000) {
            req12.status = httpCode._413RequestEntityTooLarge;
        }
        core.checkPermission(req12, "gen-code," + perm1 + addperm);
        if (req12.status == 200) {
            let coll = (<string[]>[]);
            let credit1 = td.toNumber(req12.body["credit"]);
            await audit.logAsync(req12, "generatecodes", {
                data: numCodes + "x" + credit1 + perm1,
                newvalue: req12.body
            });
            await parallel.forAsync(numCodes, async (x2: number) => {
                let id = cachedStore.freshShortId(12);
                if (req12.body.hasOwnProperty("code")) {
                    id = td.toString(req12.body["code"]);
                }
                let s3 = core.normalizeAndHash(id);
                await passcodesContainer.updateAsync(s3, async (entry9: JsonBuilder) => {
                    entry9["kind"] = "activationcode";
                    entry9["userid"] = req12.userid;
                    if (perm1 != "") {
                        entry9["permissions"] = perm1;
                    }
                    entry9["groups"] = grps;
                    entry9["orig_credit"] = credit1;
                    entry9["credit"] = credit1;
                    entry9["time"] = await core.nowSecondsAsync();
                    entry9["description"] = orEmpty(req12.body["description"]);
                    if (req12.body.hasOwnProperty("singlecredit")) {
                        entry9["singlecredit"] = td.toNumber(req12.body["singlecredit"]);
                    }
                });
                coll.push(id);
            });
            let fetchResult1 = core.somePubStore.singleFetchResult(({}));
            fetchResult1.items = td.arrayToJson(coll);
            req12.response = fetchResult1.toJson();
        }
    });
    
    if (false)
    core.addRoute("POST", "admin", "reindexusers", async (req13: core.ApiRequest) => {
        core.checkPermission(req13, "operator");
        if (req13.status == 200) {
            /* async */ users.getIndex("all").forAllBatchedAsync("all", 50, async (json2: JsonObject) => {
                await parallel.forJsonAsync(json2, async (json3: JsonObject) => {
                    let userid = json3["id"];
                    let js2 = json3["settings"];
                });
            });
            req13.response = ({});
        }
    });

    emailKeyid = "EMAIL";
    core.addRoute("POST", "*user", "settings", async (req4: core.ApiRequest) => {
        let logcat = "admin-settings";
        let updateOwn = false;
        if (req4.rootId == req4.userid) {
            core.checkPermission(req4, "adult");
            if (req4.status == 200) {
                await core.throttleAsync(req4, "settings", 120);
                logcat = "user-settings";
                updateOwn = true;
            }
        }
        else {
            await core.checkFacilitatorPermissionAsync(req4, req4.rootId);
        }
        if (req4.status == 200) {
            let nick = orEmpty(req4.body["nickname"]).replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
            await core.refreshSettingsAsync();
            if (new RegExp(core.serviceSettings.blockedNicknameRx).test(nick)) {
                core.checkPermission(req4, "official");
            }
        }
        if (req4.status == 200) {
            let bld = await search.updateAndUpsertAsync(core.pubsContainer, req4, async (entry: JsonBuilder) => {
                let sett = await buildSettingsAsync(clone(entry));
                let newEmail = td.toString(req4.body["email"]);
                if (newEmail != null) {
                    if (updateOwn) {
                        if (sett.emailverified) {
                            sett.previousemail = sett.email;
                        }
                        sett.emailverified = false;
                        sett.email = newEmail;
                        let id = azureBlobStorage.createRandomId(16).toLowerCase();
                        entry["emailcode"] = id;
                        if (/^[^@]+@[^@]+$/.test(newEmail)) {
                            /* async */ nodemailer.sendAsync(newEmail, core.serviceSettings.emailFrom, "email verification on " + core.myHost, "Please follow the link below to verify your new email address on " + core.myHost + "\n\n      " + core.self + "verify/" + req4.rootId + "/" + id + "\n\nThanks!");
                        }
                    }
                    else {
                        sett.email = newEmail;
                        sett.emailverified = true;
                        sett.previousemail = "";
                        entry["emailcode"] = "";
                    }
                }
                let settings = clone(sett.toJson());
                core.setFields(settings, req4.body, ["aboutme", "culture", "editorMode", "emailfrequency", "emailnewsletter2", 
                    "gender", "howfound", "location", "nickname", "notifications", "notifications2", "occupation", "picture", 
                    "picturelinkedtofacebook", "programmingknowledge", "realname", "school", "twitterhandle", "wallpaper", 
                    "website", "yearofbirth"]);
                for (let k of ["culture", "email", "previousemail", "gender", "location", "occupation", 
                               "programmingknowledge", "realname", "school"]) {
                    let val = settings[k];
                    if (orEmpty(val) != "") {
                        settings[k] = core.encrypt(val, emailKeyid);
                    }
                }
                let value = clone(settings);
                entry["settings"] = value;
                sett = PubUserSettings.createFromJson(value);
                sett.nickname = sett.nickname.substr(0, 25);
                entry["pub"]["name"] = sett.nickname;
                entry["pub"]["about"] = sett.aboutme;
                req4.response = clone(settings);
            });
            await audit.logAsync(req4, logcat, {
                oldvalue: req4.rootPub,
                newvalue: clone(bld)
            });
        }
    });
    core.addRoute("GET", "*user", "settings", async (req5: core.ApiRequest) => {
        if (req5.rootId == req5.userid) {
        }
        else {
            await core.checkFacilitatorPermissionAsync(req5, req5.rootId);
        }
        if (req5.status == 200) {
            if (req5.userid != req5.rootId) {
                await audit.logAsync(req5, "view-settings");
            }
            let jsb = clone((await buildSettingsAsync(req5.rootPub)).toJson());
            if (orEmpty(req5.queryOptions["format"]) != "short") {
                core.copyJson(settingsOptionsJson, jsb);
            }
            req5.response = clone(jsb);
        }
    });
}

export function resolveUsers(entities: indexedStore.FetchResult, req: core.ApiRequest) : void
{
    let coll = (<PubUser[]>[]);
    if (orFalse(req.queryOptions["imported"])) {
        entities.items = td.arrayToJson(asArray(entities.items).filter(elt => ! elt["login"]));
    }
    for (let jsb of entities.items) {
        let user = new PubUser();
        coll.push(user);
        user.fromJson(jsb["pub"]);
        user.id = jsb["id"];
        user.kind = jsb["kind"];
        if ( ! core.fullTD) {
            user.time = 0;
        }
        user.isadult = core.hasPermission(jsb, "adult");
    }
    entities.items = td.arrayToJson(coll);
}


async function buildSettingsAsync(userJson: JsonObject) : Promise<PubUserSettings>
{
    let r: PubUserSettings;
    let settings = new PubUserSettings();
    let user = new PubUser();
    user.fromJson(userJson["pub"]);
    let js = userJson["settings"];
    if (js != null) {
        let jsb = clone(js);
        for (let kk of Object.keys(jsb)) {
            let vv = jsb[kk];
            if (td.startsWith(orEmpty(vv), "EnC$")) {
                jsb[kk] = core.decrypt(vv);
            }
        }
        settings.fromJson(clone(jsb));
    }
    settings.userid = userJson["id"];
    settings.nickname = user.name;
    settings.aboutme = user.about;
    await core.refreshSettingsAsync();
    let perms = {};
    for (let s of orEmpty(userJson["permissions"]).split(",")) {
        if (s != "") {
            perms[s] = 1;
            let js2 = core.settingsPermissions[s];
            if (js2 != null) {
                td.jsonCopyFrom(perms, js2);
            }
        }
    }
    settings.permissions = "," + Object.keys(perms).join(",") + ",";
    settings.credit = core.orZero(userJson["credit"]);
    return settings;
    return r;
}

export interface IRedirectAndCookie
{
    url:string;
    cookie:string;
}

export async function generateTokenAsync(user: string, reason: string, client_id: string) : Promise<IRedirectAndCookie>
{
    let token = new core.Token();
    token.PartitionKey = user;
    token.RowKey = azureBlobStorage.createRandomId(32);
    token.time = await core.nowSecondsAsync();
    token.reason = reason;
    token.version = 2;
    if (orEmpty(client_id) != "no-cookie") {
        token.cookie = azureBlobStorage.createRandomId(32);
    }
    await core.pubsContainer.updateAsync(user, async (entry: JsonBuilder) => {
        entry["lastlogin"] = await core.nowSecondsAsync();
    });
    await tokensTable.insertEntityAsync(token.toJson(), "or merge");
    return {
        url: tokenString(token),
        cookie: token.cookie
    }
}

export function tokenString(token: core.Token) : string
{
    let customToken: string;
    customToken = "0" + token.PartitionKey + "." + token.RowKey;
    return customToken;
}

export function wrapAccessTokenCookie(cookie: string): string 
{
    let value = "TD_ACCESS_TOKEN2=" + cookie + "; ";
    if (core.hasHttps)
        value += "Secure; "
    value += "HttpOnly; Path=/; "
    if (!/localhost:/.test(core.self))
        value += "Domain=" + core.self.replace(/\/$/g, "").replace(/.*\//g, "").replace(/:\d+$/, "") + "; "
    value += "Expires=Fri, 31 Dec 9999 23:59:59 GMT";
    return value;
}

async function setPasswordAsync(req: core.ApiRequest, pass: string, prevPass: string) : Promise<void>
{
    pass = core.normalizeAndHash(pass);
    if (! prevPass) {
        prevPass = pass;
    }
    let ok = false;
    await passcodesContainer.updateAsync(pass, async (entry: JsonBuilder) => {
        let kind = orEmpty(entry["kind"]);
        if (kind == "" || kind == "reserved") {
            entry["kind"] = "userpointer";
            entry["userid"] = req.rootId;
            ok = true;
        }
        else {
            ok = false;
        }
    });
    if (ok) {
        await core.pubsContainer.updateAsync(req.rootId, async (entry1: JsonBuilder) => {
            entry1["login"] = pass;
        });
        if (prevPass != pass) {
            await passcodesContainer.updateAsync(prevPass, async (entry2: JsonBuilder) => {
                entry2["kind"] = "reserved";
            });
        }
        req.response = ({});
    }
    else {
        req.status = httpCode._400BadRequest;
    }
}

export async function sendPermissionNotificationAsync(req: core.ApiRequest, r: JsonBuilder) : Promise<void>
{
    if (core.isAlarming(r["permissions"])) {
        await core.refreshSettingsAsync();
        if ( ! r.hasOwnProperty("settings")) {
            r["settings"] = ({});
        }
        let name_ = withDefault(core.decrypt(r["settings"]["realname"]), r["pub"]["name"]);
        let subj = "[TDLite] permissions for " + name_ + " set to " + r["permissions"];
        let body = "By code.";
        if (req.userid != "") {
            let entry2 = req.userinfo.json;
            body = "Permissions set by: " + entry2["pub"]["name"] + " " + core.self + req.userid;
        }
        body = body + "\n\nTarget user: " + core.self + r["id"];
        await parallel.forJsonAsync(core.serviceSettings.alarmingEmails, async (json: JsonObject) => {
            let email = td.toString(json);
            await sendgrid.sendAsync(email, "noreply@touchdevelop.com", subj, body);
        });
    }
}

async function importUserAsync(req: core.ApiRequest, body: JsonObject) : Promise<void>
{
    let user = new PubUser();
    user.fromJson(body);
    user.url = "";
    user.features = 0;
    user.activedays = 0;
    user.subscribers = 0;
    user.receivedpositivereviews = 0;
    user.score = 0;
    user.haspicture = false;

    let jsb = {};
    jsb["pub"] = user.toJson();
    jsb["id"] = user.id;
    jsb["secondaryid"] = cachedStore.freshShortId(12);
    await users.insertAsync(jsb);
}

export async function createNewUserAsync(username: string, email: string, profileId: string, perms: string, realname: string, awaiting: boolean) : Promise<JsonBuilder>
{
    let r: JsonBuilder;
    r = {};
    let pubUser = new PubUser();
    pubUser.name = username;
    let settings = new PubUserSettings();
    settings.email = core.encrypt(email, emailKeyid);
    settings.realname = core.encrypt(realname, emailKeyid);
    settings.emailverified = orEmpty(settings.email) != "";
    r["pub"] = pubUser.toJson();
    r["settings"] = settings.toJson();
    r["login"] = profileId;
    r["permissions"] = perms;
    r["secondaryid"] = cachedStore.freshShortId(12);
    if (awaiting) {
        r["awaiting"] = awaiting;
    }
    let dictionary = core.setBuilderIfMissing(r, "groups");
    let dictionary2 = core.setBuilderIfMissing(r, "owngroups");
    await core.generateIdAsync(r, 8);
    await users.insertAsync(r);
    await passcodesContainer.updateAsync(profileId, async (entry: JsonBuilder) => {
        entry["kind"] = "userpointer";
        entry["userid"] = r["id"];
    });
    await sendPermissionNotificationAsync(core.emptyRequest, r);
    return r;
}


export async function applyCodeAsync(userjson: JsonObject, codeObj: JsonObject, passId: string, auditReq: core.ApiRequest) : Promise<void>
{
    let userid = userjson["id"];
    let credit = codeObj["credit"];
    let singleCredit = codeObj["singlecredit"];
    if (singleCredit != null) {
        credit = Math.min(credit, singleCredit);
    }
    let perm = withDefault(codeObj["permissions"], "preview,");
    await core.pubsContainer.updateAsync(userid, async (entry: JsonBuilder) => {
        core.jsonAdd(entry, "credit", credit);
        core.jsonAdd(entry, "totalcredit", credit);
        if ( ! core.hasPermission(clone(entry), perm)) {
            let existing = core.normalizePermissions(orEmpty(entry["permissions"]));
            entry["permissions"] = existing + "," + perm;
        }
        if (! entry["firstcode"]) {
            entry["firstcode"] = passId;
        }
        await sendPermissionNotificationAsync(core.emptyRequest, entry);
    });
    await passcodesContainer.updateAsync(passId, async (entry1: JsonBuilder) => {
        entry1["credit"] = entry1["credit"] - credit;
    });
    await audit.logAsync(auditReq, "apply-code", {
        userid: codeObj["userid"],
        subjectid: userjson["id"],
        publicationid: passId.replace(/^code\//g, ""),
        publicationkind: "code",
        oldvalue: codeObj
    });
    for (let grpid of orEmpty(codeObj["groups"]).split(",")) {
        if (grpid != "") {
            let grp = await core.getPubAsync(grpid, "group");
            if (grp != null) {
                await tdliteGroups.addUserToGroupAsync(userid, grp, auditReq);
            }
        }
    }
}


