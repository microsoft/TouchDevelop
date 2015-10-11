/// <reference path='../typings/node/node.d.ts' />

'use strict';

import * as td from './td';
import * as assert from 'assert';

type JsonObject = td.JsonObject;
type JsonBuilder = td.JsonBuilder;

import * as azureBlobStorage from "./azure-blob-storage"
import * as azureTable from "./azure-table"
import * as cachedStore from "./cached-store"
import * as parallel from "./parallel"
import * as restify from "./restify"
import * as wordPassword from "./word-password"
import * as serverAuth from "./server-auth"
import * as core from "./tdlite-core"
import * as audit from "./tdlite-audit"
import * as search from "./tdlite-search"
import * as tdliteHtml from "./tdlite-html"
import * as tdliteUsers from "./tdlite-users"
import * as tdlitePointers from "./tdlite-pointers"
import * as tdliteGroups from "./tdlite-groups"

export type StringTransformer = (text: string) => Promise<string>;

var withDefault = core.withDefault;
var orEmpty = td.orEmpty;

var logger = core.logger;
var httpCode = core.httpCode;
var loginHtml: JsonObject;
var initialApprovals: boolean = false;
var tokensTable: azureTable.Table;

export class LoginSession
    extends td.JsonRecord
{
    @td.json public state: string = "";
    @td.json public userid: string = "";
    @td.json public redirectUri: string = "";
    @td.json public groupid: string = "";
    @td.json public passwords: string[];
    @td.json public pass: string = "";
    @td.json public ownerId: string = "";
    @td.json public termsOk: boolean = false;
    @td.json public codeOk: boolean = false;    
    @td.json public nickname: string = "";
    static createFromJson(o:JsonObject) { let r = new LoginSession(); r.fromJson(o); return r; }
}

export interface ILoginSession {
    state: string;
    userid: string;
    redirectUri: string;
    groupid: string;
    passwords: string[];
    pass: string;
    ownerId: string;
    termsOk: boolean;
    codeOk: boolean;
}


export async function initAsync(): Promise<void> {
    core.validateTokenAsync = validateTokenAsync;
    initialApprovals = core.myChannel == "test";
    tokensTable = await core.tableClient.createTableIfNotExistsAsync("tokens");

    restify.server().get("/api/ready/:userid", async(req1: restify.Request, res1: restify.Response) => {
        core.handleHttps(req1, res1);
        let throttleKey = core.sha256(req1.remoteIp()) + ":ready";
        if (await core.throttleCoreAsync(throttleKey, 1)) {
            res1.sendError(httpCode._429TooManyRequests, "");
        }
        else {
            let uid = req1.param("userid");
            let entry2 = await core.getPubAsync(uid, "user");
            if (entry2 == null) {
                if (await core.throttleCoreAsync(throttleKey, 100)) {
                    res1.sendError(httpCode._429TooManyRequests, "");
                }
                else {
                    res1.sendError(httpCode._404NotFound, "Missing");
                }
            }
            else if (core.orFalse(entry2["awaiting"])) {
                res1.json(({ "ready": false }));
            }
            else {
                res1.json(({ "ready": true }));
            }
        }
    });

    let jsb = {};
    let template_html = tdliteHtml.template_html
    jsb["activate"] = td.replaceAll(template_html, "@BODY@", tdliteHtml.activate_html);
    jsb["kidcode"] = td.replaceAll(template_html, "@BODY@", tdliteHtml.enterCode_html);
    jsb["kidornot"] = td.replaceAll(template_html, "@BODY@", tdliteHtml.kidOrNot_html);
    jsb["newuser"] = td.replaceAll(template_html, "@BODY@", tdliteHtml.newuser_html);
    jsb["newadult"] = td.replaceAll(template_html, "@BODY@", tdliteHtml.newadult_html);
    jsb["agree"] = td.replaceAll(template_html, "@BODY@", tdliteHtml.agree_html);
    jsb["usercreated"] = td.replaceAll(template_html, "@BODY@", tdliteHtml.user_created_html);
    jsb["providers"] = "";
    loginHtml = td.clone(jsb);

    serverAuth.init({
        makeJwt: async(profile: serverAuth.UserInfo, oauthReq: serverAuth.OauthRequest) => {
            let url2 = await loginFederatedAsync(profile, oauthReq);
            let stripped = stripCookie(url2);
            let jsb2 = ({ "headers": {} });
            if (stripped.cookie) {
                jsb2["headers"]["Set-Cookie"] = stripped.cookie;
            }
            jsb2["http redirect"] = stripped.url;
            return jsb2;
        },
        getData: async(key: string) => {
            let value: string;
            value = await core.redisClient.getAsync("authsess:" + key);
            return value;
        },
        setData: async(key1: string, value1: string) => {
            let minutes = 30;
            await core.redisClient.setpxAsync("authsess:" + key1, value1, minutes * 60 * 1000);
        },
        federationMaster: orEmpty(td.serverSetting("AUTH_FEDERATION_MASTER", true)),
        federationTargets: orEmpty(td.serverSetting("AUTH_FEDERATION_TARGETS", true)),
        self: td.serverSetting("SELF", false).replace(/\/$/g, ""),
        requestEmail: true,
        redirectOnError: "/#loginerror"
    });
    if (core.hasSetting("AZURE_AD_CLIENT_SECRET")) {
        serverAuth.addAzureAd();
    }
    if (core.hasSetting("LIVE_CLIENT_SECRET")) {
        serverAuth.addLiveId();
    }
    if (core.hasSetting("GOOGLE_CLIENT_SECRET")) {
        serverAuth.addGoogle();
    }
    if (core.hasSetting("FACEBOOK_CLIENT_SECRET")) {
        serverAuth.addFacebook();
    }
    restify.server().get("/user/logout", async(req: restify.Request, res: restify.Response) => {
        res.redirect(302, "/signout");
    });
    restify.server().get("/oauth/providers", async(req1: restify.Request, res1: restify.Response) => {
        serverAuth.validateOauthParameters(req1, res1);
        core.handleBasicAuth(req1, res1);
        if (!res1.finished()) {
            let links = serverAuth.providerLinks(req1.query());
            let lang2 = await tdlitePointers.handleLanguageAsync(req1, res1, true);
            let html = await getLoginHtmlAsync("providers", lang2);
            for (let k of Object.keys(links)) {
                html = td.replaceAll(html, "@" + k + "-url@", links[k]);
            }
            res1.html(html);
        }
    });
    restify.server().get("/oauth/dialog", async(req: restify.Request, res: restify.Response) => {
        let sessionString = orEmpty(await serverAuth.options().getData(orEmpty(req.query()["td_session"])));
        let session = new LoginSession();
        session.state = cachedStore.freshShortId(16);
        logger.debug("session string: " + sessionString);
        if (sessionString != "") {
            session = LoginSession.createFromJson(JSON.parse(sessionString));
        }
        if (session.userid == "") {
            serverAuth.validateOauthParameters(req, res);
        }
        core.handleBasicAuth(req, res);
        await loginCreateUserAsync(req, session, res);
        if (!res.finished()) {
            let accessCode = orEmpty(req.query()["td_state"]);
            if (accessCode == "teacher") {
                let query = req.url().replace(/^[^\?]*/g, "");
                let url = req.serverUrl() + "/oauth/providers" + query;
                res.redirect(303, url);
            }
            else if (accessCode == core.tokenSecret && session.userid != "") {
                // **this is to be used during initial setup of a new cloud deployment**
                await core.pubsContainer.updateAsync(session.userid, async(entry: JsonBuilder) => {
                    core.jsonAdd(entry, "credit", 1000);
                    core.jsonAdd(entry, "totalcredit", 1000);
                    entry["permissions"] = ",admin,";
                });
                accessTokenRedirect(res, session.redirectUri);
            }
            else {
                await loginHandleCodeAsync(accessCode, res, req, session);
            }
        }
    });
    restify.server().get("/oauth/gettoken", async(req3: restify.Request, res3: restify.Response) => {
        let s3 = req3.serverUrl() + "/oauth/login?state=foobar&response_type=token&client_id=no-cookie&redirect_uri=" + encodeURIComponent(req3.serverUrl() + "/oauth/gettokencallback") + "&u=" + encodeURIComponent(orEmpty(req3.query()["u"]));
        res3.redirect(303, s3);
    });
    restify.server().get("/oauth/gettokencallback", async(req4: restify.Request, res4: restify.Response) => {
        let _new = "<p>Your access token is below. Only paste in applications you absolutely trust.</p>\n<pre id=\"token\">\nloading...\n</pre>\n<p>You could have added <code>?u=xyzw</code> to get access token for a different user (given the right permissions).\n</p>\n<script>\nsetTimeout(function() {\nvar h = document.location.href.replace(/oauth\\/gettoken.*access_token/, \"?access_token\").replace(/&.*/, \"\");\ndocument.getElementById(\"token\").textContent = h;\n}, 100)\n</script>";
        res4.html(td.replaceAll(td.replaceAll(template_html, "@JS@", ""), "@BODY@", _new));
    });
    if (false) {
        core.addRoute("GET", "*user", "rawtoken", async(req5: core.ApiRequest) => {
            if (req5.userinfo.token.cookie != "") {
                // Only cookie-less (service) tokens allowed here.
                req5.status = httpCode._418ImATeapot;
            }
            core.checkPermission(req5, "root");
            if (req5.status == 200) {
                let tok = await generateTokenAsync(req5.rootId, "admin", "no-cookie");
                assert(tok.cookie == "", "no cookie expected");
                await audit.logAsync(req5, "rawtoken", {
                    data: core.sha256(tok.url).substr(0, 10)
                });
                req5.response = (core.self + "?access_token=" + tok.url);
            }
        });
    }

    core.addRoute("POST", "logout", "", async(req3: core.ApiRequest) => {
        if (req3.userid != "") {
            if (core.orFalse(req3.body["everywhere"])) {
                let entities = await tokensTable.createQuery().partitionKeyIs(req3.userid).fetchAllAsync();
                await parallel.forAsync(entities.length, async(x: number) => {
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
    
    core.addRoute("POST", "*user", "token", async(req7: core.ApiRequest) => {
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
            req7.response = td.clone(resp);
        }
    });
}

async function generateTokenAsync(user: string, reason: string, client_id: string) : Promise<tdliteUsers.IRedirectAndCookie>
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

function wrapAccessTokenCookie(cookie: string): string 
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

async function getRedirectUrlAsync(user2: string, req: restify.Request) : Promise<string>
{
    let url: string;
    let jsb = {};
    let tok = await generateTokenAsync(user2, "code", req.query()["client_id"]);
    jsb["access_token"] = tok.url;
    jsb["state"] = req.query()["state"];
    jsb["id"] = user2;
    if (tok.cookie != "") {
        jsb["td_cookie"] = tok.cookie;
    }
    url = req.query()["redirect_uri"] + "#" + serverAuth.toQueryString(td.clone(jsb));
    return url;
}


async function loginFederatedAsync(profile: serverAuth.UserInfo, oauthReq: serverAuth.OauthRequest) : Promise<string>
{
    let url: string;
    let coll = (/([^:]*):(.*)/.exec(profile.id) || []);
    let provider = coll[1];
    let providerUserId = coll[2];
    let profileId = "id/" + provider + "/" + core.encryptId(providerUserId, "SOCIAL0");
    logger.debug("profileid: " + profile.id + " enc " + profileId);
    let modernId = profileId;
    let entry2 = await tdliteUsers.passcodesContainer.getAsync(profileId);
    // ## Legacy profiles
    if (false) {
        if (entry2 == null) {
            let legacyId = "id/" + provider + "/" + core.sha256(providerUserId);
            let entry = await tdliteUsers.passcodesContainer.getAsync(legacyId);
            if (core.isGoodPub(entry, "userpointer") && await core.getPubAsync(entry["userid"], "user") != null) {
                entry2 = entry;
                profileId = legacyId;
            }
        }
        if (entry2 == null) {
            let legacyId1 = "id/" + provider + "/" + td.replaceAll(providerUserId, ":", "/");
            let entry1 = await tdliteUsers.passcodesContainer.getAsync(legacyId1);
            if (core.isGoodPub(entry1, "userpointer") && await core.getPubAsync(entry1["userid"], "user") != null) {
                entry2 = entry1;
                profileId = legacyId1;
            }
        }
        // If we have a legacy pointer, update it
        if (modernId != profileId && entry2 != null) {
            await tdliteUsers.passcodesContainer.updateAsync(modernId, async (entry3: JsonBuilder) => {
                td.jsonCopyFrom(entry3, entry2);
            });
        }
    }

    let jsb = (<JsonBuilder>null);
    if (core.isGoodPub(entry2, "userpointer")) {
        let entry31 = await core.getPubAsync(entry2["userid"], "user");
        if (entry31 != null) {
            jsb = td.clone(entry31);
            if (orEmpty(jsb["login"]) != profileId) {
                await core.pubsContainer.updateAsync(jsb["id"], async (entry4: JsonBuilder) => {
                    entry4["login"] = profileId;
                });
                jsb["login"] = profileId;
            }
        }
    }
    let clientOAuth = serverAuth.ClientOauth.createFromJson(oauthReq._client_oauth);
    if (jsb == null) {
        let email = profile.email;
        let username = profile.name.replace(/\s.*/g, "");
        if (provider == "google") {
            // New Google accounts blocked for now.
            return "/";
        }
        logger.tick("PubUser@federated");
        jsb = await tdliteUsers.createNewUserAsync(username, email, profileId, "", profile.name, false);
    }
    else {
        logger.tick("Login@federated");
        let uidOverride = withDefault(clientOAuth.u, jsb["id"]);
        if (uidOverride != jsb["id"]) {
            logger.info("login with override: " + jsb["id"] + "->" + uidOverride);
            if (core.hasPermission(td.clone(jsb), "signin-" + uidOverride)) {
                let entry41 = await core.getPubAsync(uidOverride, "user");
                if (entry41 != null) {
                    logger.debug("login with override OK: " + jsb["id"] + "->" + uidOverride);
                    jsb = td.clone(entry41);
                }
            }
        }
    }
    let user = jsb["id"];
    let tok = await generateTokenAsync(user, profileId, clientOAuth.client_id);

    let redirectUrl = td.replaceAll(profile.redirectPrefix, "TOKEN", encodeURIComponent(tok.url)) + "&id=" + user;
    if (tok.cookie != "") {
        redirectUrl = redirectUrl + "&td_cookie=" + tok.cookie;
    }
    await core.refreshSettingsAsync();
    let session = new LoginSession();
    session.termsOk = orEmpty(jsb["termsversion"]) == core.serviceSettings.termsversion;
    session.codeOk = orEmpty(jsb["permissions"]) != "";
    if ( ! session.termsOk || ! session.codeOk) {
        session.state = cachedStore.freshShortId(16);
        session.userid = user;
        session.redirectUri = redirectUrl;
        await serverAuth.options().setData(session.state, JSON.stringify(session.toJson()));
        redirectUrl = "/oauth/dialog?td_session=" + encodeURIComponent(session.state);
    }
    return redirectUrl;
    return url;
}

async function loginCreateUserAsync(req: restify.Request, session: LoginSession, res: restify.Response) : Promise<void>
{
    let tdUsername = req.query()["td_username"];
    if ( ! res.finished() && session.groupid != "" && orEmpty(tdUsername) != "") {
        if (session.redirectUri == "") {
            let groupJson = await core.getPubAsync(session.groupid, "group");
            session.pass = session.passwords[core.orZero(req.query()["td_password"])];
            if (session.pass == null) {
                session.pass = session.passwords[0];
            }
            // this can go negative; maybe we should reject it in this case?
            await core.pubsContainer.updateAsync(session.ownerId, async (entry: JsonBuilder) => {
                core.jsonAdd(entry, "credit", -1);
            });
            logger.tick("PubUser@code");
            let jsb = await tdliteUsers.createNewUserAsync(tdUsername, "", core.normalizeAndHash(session.pass), ",student,", "", initialApprovals);
            let user2 = jsb["id"];

            await audit.logAsync(audit.buildAuditApiRequest(req), "user-create-code", {
                userid: session.ownerId,
                subjectid: user2,
                publicationid: session.groupid,
                publicationkind: "group",
                newvalue: td.clone(jsb)
            });
            if (initialApprovals) {
                await tdliteGroups.addGroupApprovalAsync(groupJson, td.clone(jsb));
            }
            else {
                await tdliteGroups.addUserToGroupAsync(user2, groupJson, (<core.ApiRequest>null));
            }
            session.redirectUri = await getRedirectUrlAsync(user2, req);
            await serverAuth.options().setData(session.state, JSON.stringify(session.toJson()));
        }
        let tok = stripCookie(session.redirectUri);
        if (tok.cookie != "") {
            res.setHeader("Set-Cookie", tok.cookie);
        }
        let lang = await tdlitePointers.handleLanguageAsync(req, res, false);
        let html = td.replaceAll(await getLoginHtmlAsync("usercreated", lang), "@URL@", tok.url);
        html = td.replaceAll(html, "@USERID@", session.userid);
        html = td.replaceAll(html, "@PASSWORD@", session.pass);
        html = td.replaceAll(html, "@NAME@", core.htmlQuote(tdUsername));
        core.setHtmlHeaders(res);
        res.html(html);
    }
}

async function loginHandleCodeAsync(accessCode: string, res: restify.Response, req: restify.Request, session: LoginSession) : Promise<void>
{
    let passId = core.normalizeAndHash(accessCode);
    let msg = "";
    if (passId == "" || accessCode == "kid") {
    }
    else {
        if (await core.throttleCoreAsync(core.sha256(req.remoteIp()) + ":code", 10)) {
            // TODO this should be some nice page
            res.sendError(httpCode._429TooManyRequests, "Too many login attempts");
            return;
        }
        let codeObj = await tdliteUsers.passcodesContainer.getAsync(passId);
        if (codeObj == null || codeObj["kind"] == "reserved") {
            msg = "Whoops! The code doesn't seem right. Keep trying!";
        }
        else {
            let kind = codeObj["kind"];
            if (kind == "userpointer") {
                let userJson = await core.getPubAsync(codeObj["userid"], "user");
                if (session.userid != "") {
                    msg = "We need an activation code here, not user password.";
                }
                else if (userJson == null) {
                    msg = "The user account doesn't exist anymore.";
                }
                else {
                    logger.tick("Login@code");
                    accessTokenRedirect(res, await getRedirectUrlAsync(userJson["id"], req));
                }
            }
            else if (kind == "activationcode") {
                if (session.userid == "") {
                    // The code shouldn't be entered here, let's save it for future.
                    let query = req.url().replace(/^[^\?]*/g, "");
                    let url = req.serverUrl() + "/oauth/dialog" + td.replaceAll(query, "&td_state=", "&validated_code=");
                    res.redirect(303, url);
                }
                else if (codeObj["credit"] <= 0) {
                    msg = "This code has already been used.";
                }
                else {
                    let userjson = await core.getPubAsync(session.userid, "user");
                    await tdliteUsers.applyCodeAsync(userjson, codeObj, passId, audit.buildAuditApiRequest(req));
                    accessTokenRedirect(res, session.redirectUri);
                }
            }
            else if (kind == "groupinvitation") {
                let groupJson = await core.getPubAsync(codeObj["groupid"], "group");
                if (session.userid != "") {
                    msg = "We need an activation code here, not group code.";
                }
                else if (groupJson == null) {
                    msg = "Group gone?";
                }
                else {
                    session.ownerId = groupJson["pub"]["userid"];
                    let groupOwner = await core.getPubAsync(session.ownerId, "user");
                    if (core.orZero(groupOwner["credit"]) <= 0) {
                        msg = "Group owner is out of activation credits.";
                    }
                    else {
                        session.groupid = groupJson["id"];
                        session.passwords = td.range(0, 10).map<string>(elt => wordPassword.generate());
                        await serverAuth.options().setData(session.state, JSON.stringify(session.toJson()));
                    }
                }
            }
            else {
                msg = "This code cannot be entered here. Sorry.";
            }
        }
    }

    if ( ! res.finished()) {
        await core.refreshSettingsAsync();
        let params = {};
        let inner = "kidornot";
        if (accessCode == "kid") {
            inner = "kidcode";
        }
        if (session.passwords != null) {
            let links = "";
            for (let i = 0; i < session.passwords.length; i++) {
                links = links + "<button type=\"button\" class=\"button provider\" href=\"#\" onclick=\"passwordok(" + i + ")\">" + session.passwords[i] + "</button><br/>\n";
            }
            let lang2 = await tdlitePointers.handleLanguageAsync(req, res, true);
            inner = td.replaceAll(td.replaceAll(await getLoginHtmlAsync("newuser", lang2), "@PASSWORDS@", links), "@SESSION@", session.state);
            core.setHtmlHeaders(res);
            res.html(td.replaceAll(inner, "@MSG@", msg));
            return;
        }
        else if (session.userid != "") {
            let termsversion = orEmpty(req.query()["td_agree"]);
            if (termsversion == "noway") {
                await serverAuth.options().setData(session.state, "{}");
                if (session.userid != "") {
                    let delEntry = await core.getPubAsync(session.userid, "user");
                    if (delEntry != null && ! delEntry["termsversion"] && ! delEntry["permissions"]) {
                        let delok = await core.deleteAsync(delEntry);
                        await core.pubsContainer.updateAsync(session.userid, async (entry: JsonBuilder) => {
                            entry["settings"] = {};
                            entry["pub"] = {};
                            entry["login"] = "";
                            entry["permissions"] = "";
                        });
                    }
                }
                res.redirect(302, "/");
                return;
            }
            if ( ! session.termsOk && termsversion == core.serviceSettings.termsversion) {
                session.termsOk = true;
                await serverAuth.options().setData(session.state, JSON.stringify(session.toJson()));
                if (termsversion != "") {
                    await core.pubsContainer.updateAsync(session.userid, async (entry1: JsonBuilder) => {
                        entry1["termsversion"] = termsversion;
                    });
                }
                await audit.logAsync(audit.buildAuditApiRequest(req), "user-agree", {
                    userid: session.userid,
                    subjectid: session.userid,
                    data: termsversion,
                    newvalue: await core.getPubAsync(session.userid, "user")
                });
            }
            let username = orEmpty(req.query()["td_username"]).slice(0, 25);
            if (!session.nickname && username) {
                session.nickname = username;
                await serverAuth.options().setData(session.state, JSON.stringify(session.toJson()));
                let lastx = {};                
                await core.pubsContainer.updateAsync(session.userid, async(entry1: JsonBuilder) => {
                    entry1["settings"].nickname = username;
                    entry1["pub"].name = username;                    
                    lastx = entry1;
                });                
                await search.scanAndSearchAsync(lastx);
            }
            if ( ! session.termsOk) {
                inner = "agree";
            }
            else if (!session.nickname && tdlitePointers.templateSuffix) {
                inner = "newadult";
                params["EXAMPLES"] = "";
                params["SESSION"] = session.state;
                let uentry = await core.getPubAsync(session.userid, "user");
                if (uentry) {
                    let nm = uentry["pub"].name
                    params["EXAMPLES"] = ["Ms" + nm, "Mr" + nm, nm + td.randomRange(10, 99)].join(", ");
                }
            }
            else if ( ! session.codeOk) {
                inner = "activate";
            }
            else {
                res.redirect(303, session.redirectUri);
            }
        }
        if ( ! res.finished()) {
            let agreeurl = "/oauth/dialog?td_session=" + encodeURIComponent(session.state) + "&td_agree=" + encodeURIComponent(core.serviceSettings.termsversion);
            let disagreeurl = "/oauth/dialog?td_session=" + encodeURIComponent(session.state) + "&td_agree=noway";
            let lang21 = await tdlitePointers.handleLanguageAsync(req, res, true);
            params["MSG"] = msg;
            params["AGREEURL"] = agreeurl;
            params["DISAGREEURL"] = disagreeurl;
            let ht = await getLoginHtmlAsync(inner, lang21)
            ht = ht.replace(/@([A-Z]+)@/g, (m, n) => params.hasOwnProperty(n) ? params[n] : m)
            res.html(ht);
        }
    }
}

async function getLoginHtmlAsync(inner: string, lang: string) : Promise<string>
{
    let text2: string;
    let text = await tdlitePointers.simplePointerCacheAsync("signin/" + inner, lang);
    if (text.length < 100) {
        text = loginHtml[inner];
    }
    text = td.replaceAll(text, "@JS@", tdliteHtml.login_js);
    return text;
    return text2;
}


function accessTokenRedirect(res: restify.Response, url2: string) : void
{
    let tok = stripCookie(url2);
    if (tok.cookie != "") {
        res.setHeader("Set-Cookie", tok.cookie);
    }
    res.redirect(303, tok.url);
}

function stripCookie(url2: string) : tdliteUsers.IRedirectAndCookie
{
    let cook: string;
    let coll = (/&td_cookie=([\w.]+)$/.exec(url2) || []);
    let cookie = coll[1];
    cook = "";
    if (cookie != null) {
        url2 = url2.substr(0, url2.length - coll[0].length);
        cook = wrapAccessTokenCookie(cookie);
    }
    return {
        url: url2,
        cookie: cook
    }
}



async function validateTokenAsync(req: core.ApiRequest, rreq: restify.Request) : Promise<void>
{
    await core.refreshSettingsAsync();
    if (req.isCached) {
        return;
    }
    let token = withDefault(rreq.header("x-td-access-token"), td.toString(req.queryOptions["access_token"]));
    if (token != null && token != "null" && token != "undefined") {
        let tokenJs = (<JsonObject>null);
        if (td.startsWith(token, "0") && token.length < 100) {
            let value = await core.redisClient.getAsync("tok:" + token);
            if (value == null || value == "") {
                let coll = (/^0([a-z]+)\.([A-Za-z]+)$/.exec(token) || []);
                if (coll.length > 1) {
                    tokenJs = await tokensTable.getEntityAsync(coll[1], coll[2]);
                    if (tokenJs != null) {
                        await core.redisClient.setpxAsync("tok:" + token, JSON.stringify(tokenJs), 1000 * 1000);
                    }
                }
            }
            else {
                tokenJs = JSON.parse(value);
            }
        }
        if (tokenJs == null) {
            req.status = httpCode._401Unauthorized;
        }
        else {
            let token2 = core.Token.createFromJson(tokenJs);
            if (core.orZero(token2.version) < 2) {
                req.status = httpCode._401Unauthorized;
                return;
            }
            if (orEmpty(token2.cookie) != "") {
                let ok = td.stringContains(orEmpty(rreq.header("cookie")), "TD_ACCESS_TOKEN2=" + token2.cookie);
                if ( ! ok) {
                    req.status = httpCode._401Unauthorized;
                    logger.info("cookie missing, user=" + token2.PartitionKey);
                    return;
                }
                let r = orEmpty(rreq.header("referer"));
                if (td.startsWith(r, "http://localhost:") || td.startsWith(r, core.self + "app/")) {
                }
                else {
                    req.status = httpCode._401Unauthorized;
                    logger.info("bad referer: " + r + ", user = " + token2.PartitionKey);
                    return;
                }
                // minimum token expiration - 5min
                if (orEmpty(token2.reason) != "code" && core.orZero(core.serviceSettings.tokenExpiration) > 300 && await core.nowSecondsAsync() - token2.time > core.serviceSettings.tokenExpiration) {
                    // core.Token expired
                    req.status = httpCode._401Unauthorized;
                    return;
                }
            }
            let uid = token2.PartitionKey;
            await core.setReqUserIdAsync(req, uid);
            if (req.status == 200 && core.orFalse(req.userinfo.json["awaiting"])) {
                req.status = httpCode._418ImATeapot;
            }
            if (req.status == 200) {
                req.userinfo.token = token2;
                req.userinfo.ip = rreq.remoteIp();
                let uid2 = orEmpty(req.queryOptions["userid"]);
                if (uid2 != "" && core.hasPermission(req.userinfo.json, "root")) {
                    await core.setReqUserIdAsync(req, uid2);
                }
            }
        }
    }
}

