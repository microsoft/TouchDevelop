/// <reference path='../typings/node/node.d.ts' />

'use strict';

import * as td from './td';
import * as assert from 'assert';
import * as querystring from 'querystring';

type JsonObject = td.JsonObject;
type JsonBuilder = td.JsonBuilder;

var json = td.json;
var clone = td.clone;

import * as restify from "./restify"
import * as nodeJwtSimple from "./node-jwt-simple"

export type MakeUrlCallback = (req: restify.Request, p: OauthRequest) => Promise<string>;
export type MakeUserInfo = (profile: JsonObject) => Promise<UserInfo>;
export type GetProfile = (req1: restify.Request, p1: OauthRequest) => Promise<JsonObject>;
export type MakeJwt = (profile1: UserInfo, oauthReq: OauthRequest) => Promise<JsonBuilder>;
export type GetData = (key: string) => Promise<string>;
export type SetData = (key1: string, value: string) => Promise<void>;
export type PreDialog = (req2: restify.Request, res: restify.Response) => Promise<void>;
export type GetProviderTemplate = () => Promise<string>;
export type ErrorCallback = (res1: restify.Response, msg: string) => Promise<void>;

var logger: td.AppLogger;
var tokenSecret: string = "";
var debug: boolean = false;
var globalOptions: IInitOptions;
var fedTargets: string[];
var myHost: string = "";

var azureKey: string = 
`-----BEGIN RSA PUBLIC KEY-----
MIIBCgKCAQEAvIqz+4+ER/vNWLON9yv8hIYV737JQ6rCl6XfzOC628seYUPf0TaG
k91CFxefhzh23V9Tkq+RtwN1Vs/z57hO82kkzL+cQHZX3bMJD+GEGOKXCEXURN7V
MyZWMAuzQoW9vFb1k3cR1RW/EW/P+C8bb2dCGXhBYqPfHyimvz2WarXhntPSbM5X
yS5v5yCw5T/Vuwqqsio3V8wooWGMpp61y12NhN8bNVDQAkDPNu2DT9DXB1g0CeFI
Np/KAS/qQ2Kq6TSvRHJqxRR68RezYtje9KAqwqx4jxlmVAQy0T3+T+IAbsk1wRtW
DndhO6s1Os+dck5TzyZ/dNOhfXgelixLUQIDAQAB
-----END RSA PUBLIC KEY-----`;

var chooseProvider_html: string = 
`<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=320.1" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<title>Sign in</title>
<style>
a.provider {
   padding: 1em;
   text-decoration: none;
   color: white;
   background: #2986E0;
   width: 12em;
   display: block;
   margin: 0 auto;
   font-size: 1.2em;
}
</style>
<body id='root' style='font-size:16px; font-family:sans-serif;'>
<div style='margin: 0 auto; width: 310px;  text-align: center;'>
<h1 style='font-size:3em; font-weight:normal;'>Sign in</h1>
@BODY@
</div>
</body>
</html>`;


export class ClientOauth
    extends td.JsonRecord
{
    @json public state: string = "";
    @json public client_id: string = "";
    @json public redirect_uri: string = "";
    @json public scope: string = "";
    @json public response_type: string = "";
    @json public display: string = "";
    @json public provider: string = "";
    @json public td_state: string = "";
    @json public u: string = "";
    static createFromJson(o:JsonObject) { let r = new ClientOauth(); r.fromJson(o); return r; }
}

export class UserInfo
    extends td.JsonRecord
{
    @json public id: string = "";
    @json public name: string = "";
    @json public email: string = "";
    @json public redirectPrefix: string = "";
    @json public state: string = "";
    @json public userData: string = "";
    static createFromJson(o:JsonObject) { let r = new UserInfo(); r.fromJson(o); return r; }
}

export class OauthRequest
    extends td.JsonRecord
{
    @json public state: string = "";
    @json public client_id: string = "";
    @json public redirect_uri: string = "";
    @json public scope: string = "";
    @json public response_type: string = "";
    @json public display: string = "";
    @json public access_token: string = "";
    @json public nonce: string = "";
    @json public response_mode: string = "";
    @json public _provider: string = "";
    @json public _client_oauth: ClientOauth;
    @json public _info: UserInfo;
    static createFromJson(o:JsonObject) { let r = new OauthRequest(); r.fromJson(o); return r; }

    public async getAccessCodeAsync(code_: string, clientSecret: string, url: string) : Promise<JsonObject>
    {
        let js: JsonObject;
        let tokenReq = new TokenReq();
        tokenReq.fromJson(this.toJson());
        tokenReq.code = code_;
        tokenReq.grant_type = "authorization_code";
        tokenReq.client_secret = clientSecret;
        // And now send the request
        let grant = td.createRequest(url);
        grant.setMethod("post");
        grant.setContent(toQueryString(tokenReq.toJson()));
        grant.setHeader("Content-type", "application/x-www-form-urlencoded");
        let response = await grant.sendAsync();
        logger.debug("auth response: " + response.statusCode() + " -> " + response.content());
        if (td.startsWith(response.content(), "{")) {
            js = response.contentAsJson();
        }
        else {
            js = fromQueryString(response.content());
        }
        if (js != null && ! js["access_token"] && ! js["id_token"]) {
            js = (<JsonObject>null);
        }
        return js;
    }

    public makeRedirectUrl(token: string) : string
    {
        let url: string;
        let hash = {};
        let clientOauth2 = this._client_oauth;
        hash["access_token"] = token;
        hash["state"] = clientOauth2.state;
        url = clientOauth2.redirect_uri + "#" + toQueryString(clone(hash));
        return url;
    }

}

export interface IOauthRequest {
    state?: string;
    client_id?: string;
    redirect_uri?: string;
    scope?: string;
    response_type?: string;
    display?: string;
    access_token?: string;
    nonce?: string;
    response_mode?: string;
    _provider?: string;
    _client_oauth?: ClientOauth;
    _info?: UserInfo;
}

export class TokenReq
    extends td.JsonRecord
{
    @json public client_id: string = "";
    @json public redirect_uri: string = "";
    @json public code: string = "";
    @json public client_secret: string = "";
    @json public grant_type: string = "";
    static createFromJson(o:JsonObject) { let r = new TokenReq(); r.fromJson(o); return r; }
}

export interface ITokenReq {
    client_id?: string;
    redirect_uri?: string;
    code?: string;
    client_secret?: string;
    grant_type?: string;
}

export class ProviderIndex
{
    public id: string = "";
    public makeLoginUrl: MakeUrlCallback;
    public getProfile: GetProfile;
    public makeCustomToken: MakeUserInfo;
    public name: string = "";
    public order: number = 0;

    static _providers:td.SMap<ProviderIndex> = {};
    static at(n:string)
    {
        if (!ProviderIndex._providers.hasOwnProperty(n)) {
            ProviderIndex._providers[n] = new ProviderIndex();
            ProviderIndex._providers[n].id = n;
        }
        return ProviderIndex._providers[n]
    }

    static all():ProviderIndex[]
    {
        var pp = ProviderIndex._providers
        return Object.keys(pp).map(k => pp[k]).filter(pi => !!pi.makeLoginUrl)
    }

    public setupProvider(makeUrl: MakeUrlCallback, getProfile: GetProfile, defaultCustomToken: MakeUserInfo) : void
    {
        logger.info("adding provider: " + this.id);
        this.makeLoginUrl = makeUrl;
        this.getProfile = getProfile;
        if (this.makeCustomToken == null) {
            this.makeCustomToken = async (profile: JsonObject) => {
                let inf = await defaultCustomToken(profile);
                if (inf != null && ! inf.id) {
                    inf = (<UserInfo>null);
                }
                if (inf != null) {
                    if (! inf.name) {
                        // isn't this brilliant?!
                        inf.name = "0x" + td.sha256(new Buffer(inf.id, "utf8")).substr(0, 8);
                    }
                    if (inf.email == null || ! td.stringContains(inf.email, "@")) {
                        inf.email = "";
                    }
                }
                return inf;
            }
            ;
        }
        this.order = ProviderIndex.length;
    }

}

export interface IProviderOptions {
    makeCustomToken?: MakeUserInfo;
}

export interface IClientOauth {
    state?: string;
    client_id?: string;
    redirect_uri?: string;
    scope?: string;
    response_type?: string;
    display?: string;
    provider?: string;
    td_state?: string;
    u?: string;
}

export interface IInitOptions {
    preDialog?: PreDialog;
    makeJwt?: MakeJwt;
    getData?: GetData;
    setData?: SetData;
    federationMaster?: string;
    federationTargets?: string;
    self?: string;
    requestEmail?: boolean;
    getProviderTemplate?: GetProviderTemplate;
    errorCallback?: ErrorCallback;
    redirectOnError?: string;
}

export interface IUserInfo {
    id?: string;
    name?: string;
    email?: string;
    redirectPrefix?: string;
    state?: string;
    userData?: string;
}


export function init(options_: IInitOptions = {}) : void
{
    globalOptions = options_;
    if (globalOptions.errorCallback == null) {
        globalOptions.errorCallback = async (res: restify.Response, msg: string) => {
            if (!globalOptions.redirectOnError) {
                res.sendError(403, msg);
            }
            else {
                res.redirect(302, globalOptions.redirectOnError);
            }
        }
    }
    if (globalOptions.makeJwt == null) {
        globalOptions.makeJwt = async (profile: UserInfo, oauthReq: OauthRequest) => {
            let jwt: JsonBuilder;
            jwt = {};
            jwt["sub"] = profile.id;
            return jwt;
        }
    }
    logger = td.createLogger("serverauth");
    if (globalOptions.getData == null) {
        logger.info("using in-memory (single instance) storage");
        let d = {}
        globalOptions.getData = key => d[key];
        globalOptions.setData = async (key1: string, value: string) => {
            d[key1] = value;
        }
    }
    if (globalOptions.preDialog == null) {
        globalOptions.preDialog = async (req: restify.Request, res1: restify.Response) => {
            // Do nothing.
        }
    }
    if (globalOptions.federationTargets) {
        fedTargets = globalOptions.federationTargets.split(",");
    }
    else {
        fedTargets = (<string[]>[]);
    }
    tokenSecret = td.serverSetting("TOKEN_SECRET", false);
    initRestify();
    logger.info("Started");
}

export function toQueryString(params: JsonObject) : string
{
    let query: string;
    query = "";
    for (let k of Object.keys(params)) {
        let text = params[k];
        if (orEmpty(text) != "" && ! td.startsWith(k, "_")) {
            if (query != "") {
                query = query + "&";
            }
            query = query + encodeURIComponent(k) + "=" + encodeURIComponent(text);
        }
    }
    return query;
}

function initRestify() : void
{
    let server = restify.server();
    server.get("/oauth/login", async (req: restify.Request, res: restify.Response) => {
        setSelf(req);
        await oauthLoginAsync(req, res);
    });
    server.post("/oauth/callback", async (req1: restify.Request, res1: restify.Response) => {
        let query = fromQueryString(req1.body());
        req1.handle.body = query;
        let state = orEmpty(query["state"]);
        logger.debug("POST at callback: " + JSON.stringify(req1.bodyAsJson()));
        await handleResponseAsync(state, req1, res1);
    });
    server.get("/oauth/callback", async (req2: restify.Request, res2: restify.Response) => {
        logger.debug("GET at callback: " + JSON.stringify(req2.query()));
        await handleResponseAsync(req2.query()["state"], req2, res2);
    });
    if (debug) {
        server.get("/oauth/testlogin", async (req3: restify.Request, res3: restify.Response) => {
            let s3 = req3.serverUrl() + "/oauth/login?state=foobar&response_type=token&redirect_uri=" + encodeURIComponent(req3.serverUrl() + "/oauth/testcallback");
            res3.redirect(303, s3);
        });
        server.get("/oauth/testcallback", async (req4: restify.Request, res4: restify.Response) => {
            let tok = decodeToken(req4.query()["access_token"]);
            if (tok == null) {
                let _new = "<script>\nvar h = document.location.href\nvar h2 = h.replace(/#/, \"?\")\nif (h != h2) \n  document.location = h2\n</script>";
                res4.html(td.replaceAll(chooseProvider_html, "@BODY@", _new));
            }
            else {
                res4.json(tok);
            }
        });
    }
}

var orEmpty = td.orEmpty;

/**
 * Setup Azure Active Directory (Office 365 or Corporate) authentication provider. Requires ``AZURE_AD_CLIENT_ID`` env.
 * This relies on `art->azure key` being valid and used, but doesn't require client secret (which expires every 2 years).
 */
export function addAzureAdClientOnly(options_: IProviderOptions = {}) : void
{
    let clientId = td.serverSetting("AZURE_AD_CLIENT_ID", false);
    let prov = ProviderIndex.at("azureadcl");
    prov.name = "Office 365 or Corporate";
    prov.makeCustomToken = options_.makeCustomToken;
    prov.setupProvider(async (req: restify.Request, p: OauthRequest) => {
        let url: string;
        p.client_id = clientId;
        p.response_type = "id_token";
        p.scope = "openid";
        p.nonce = td.createRandomId(12);
        p.response_mode = "form_post";
        url = "https://login.windows.net/common/oauth2/authorize?" + toQueryString(p.toJson());
        return url;
    }
    , async (req1: restify.Request, p1: OauthRequest) => {
        let profile: JsonObject;
        let payload = nodeJwtSimple.decode(req1.bodyAsJson()["id_token"], azureKey);
        if (payload["nonce"] == p1.nonce) {
            profile = payload;
        }
        else {
            profile = (<JsonObject>null);
        }
        return profile;
    }
    , async (profile1: JsonObject) => {
        let info: UserInfo;
        info = new UserInfo();
        info.id = "ad:" + td.replaceAll(profile1["oid"], "-", "").toLowerCase();
        info.name = profile1["name"];
        info.email = profile1["unique_name"];
        return info;
    });
}

function fromQueryString(body: string) : JsonObject
{
    return querystring.parse(body)
}

function setIfEmpty(jsb: JsonBuilder, key: string, value: string) : void
{
    if (! jsb[key]) {
        jsb[key] = value;
    }
}

function now() : number
{
    let value: number;
    value = Math.round(new Date().getTime() / 1000);
    return value;
}

async function handleResponseAsync(state: string, req: restify.Request, res: restify.Response) : Promise<void>
{
    setSelf(req);
    if (td.stringContains(state, ",")) {
        let stateWords = state.split(",");
        if (fedTargets.indexOf(stateWords[0]) >= 0) {
            res.redirect(307, "https://" + stateWords[0] + req.url().replace(/state=[^&]+/g, "state=" + encodeURIComponent(stateWords[1])));
        }
        else {
            res.sendError(403, "invalid fed target");
        }
        return;
    }
    let s = orEmpty(await globalOptions.getData(state));
    if (s == "") {
        res.sendError(404, "Wrong state");
    }
    else {
        let oauthRequest = OauthRequest.createFromJson(JSON.parse(s));
        let prov = ProviderIndex.at(oauthRequest._provider);
        let profile = await prov.getProfile(req, oauthRequest);
        if (profile == null) {
            await globalOptions.errorCallback(res, "Cannot get profile.");
        }
        else {
            logger.debug("profile: " + JSON.stringify(profile));
            let info = await prov.makeCustomToken(profile);
            if (info == null) {
                await globalOptions.errorCallback(res, "Profile not accepted");
            }
            else {
                logger.debug("user info: " + JSON.stringify(info.toJson()));
                info.redirectPrefix = oauthRequest.makeRedirectUrl("TOKEN");
                info.state = state;
                let jsb = await globalOptions.makeJwt(info, oauthRequest);
                if (jsb == null) {
                    res.sendError(403, "User info not accepted");
                }
                else {
                    let token = "";
                    if (typeof jsb == "string") {
                        oauthRequest._info = info;
                        await globalOptions.setData(state, JSON.stringify(oauthRequest.toJson()));
                        res.redirect(303, td.toString(jsb));
                    }
                    else if (jsb.hasOwnProperty("http redirect")) {
                        oauthRequest._info = info;
                        await globalOptions.setData(state, JSON.stringify(oauthRequest.toJson()));
                        let hds = jsb["headers"];
                        if (hds != null) {
                            for (let hd of Object.keys(hds)) {
                                res.setHeader(hd, hds[hd]);
                            }
                        }
                        res.redirect(303, jsb["http redirect"]);
                    }
                    else {
                        setIfEmpty(jsb, "iss", globalOptions.self);
                        setIfEmpty(jsb, "jti", td.createRandomId(10));
                        if (jsb["iat"] == null) {
                            jsb["iat"] = now();
                        }
                        token = nodeJwtSimple.encode(clone(jsb), tokenSecret, "HS256");
                        res.redirect(303, oauthRequest.makeRedirectUrl(token));
                    }
                }
            }
        }
    }
}

/**
 * Setup Live Connect / Microsoft Account authentication. Requires ``LIVE_CLIENT_ID`` and ``LIVE_CLIENT_SECRET`` env.
 */
export function addLiveId(options_: IProviderOptions = {}) : void
{
    let clientId = td.serverSetting("LIVE_CLIENT_ID", false);
    let clientSecret = td.serverSetting("LIVE_CLIENT_SECRET", false);
    let prov = ProviderIndex.at("liveid");
    prov.name = "Microsoft Account";
    prov.makeCustomToken = options_.makeCustomToken;
    prov.setupProvider(async (req: restify.Request, p: OauthRequest) => {
        let url: string;
        p.client_id = clientId;
        if (globalOptions.requestEmail) {
            p.scope = "wl.signin wl.emails";
        }
        else {
            p.scope = "wl.signin";
        }
        p.response_type = "code";
        url = "https://login.live.com/oauth20_authorize.srf?" + toQueryString(p.toJson());
        return url;
    }
    , async (req1: restify.Request, p1: OauthRequest) => {
        let profile: JsonObject;
        let js = await p1.getAccessCodeAsync(req1.query()["code"], clientSecret, "https://login.live.com/oauth20_token.srf");
        if (js == null) {
            return js;
        }
        let request = td.createRequest("https://apis.live.net/v5.0/me?access_token=" + encodeURIComponent(js["access_token"]));
        let response = await request.sendAsync();
        profile = response.contentAsJson();
        return profile;
    }
    , async (profile1: JsonObject) => {
        let info: UserInfo;
        let inf = new UserInfo();
        inf.id = "live:" + profile1["id"];
        inf.name = profile1["name"];
        let eml = profile1["emails"];
        if (eml != null) {
            inf.email = orEmpty(eml["preferred"]);
            if (inf.email == "") {
                inf.email = eml["account"];
            }
        }
        return inf;
        return info;
    });
}

/**
 * Decode JWT token
 */
export function decodeToken(token: string) : JsonObject
{
    let tok: JsonObject;
    if (token == null || ! /.+\..+\./.test(token)) {
        tok = (<JsonObject>null);
    }
    else {
        tok = nodeJwtSimple.decode(token, tokenSecret);
    }
    return tok;
}

function example_init() : void
{
    debug = true;
    if (debug) {
        setupRestifyServer();
        // 
        init({
            makeJwt: async (profile: UserInfo, oauthReq: OauthRequest) => {
                let jwt: JsonBuilder;
                jwt = {};
                jwt["sub"] = profile.id;
                jwt["_name"] = profile.name;
                jwt["_email"] = profile.email;
                return jwt;
            }

        });
        addAzureAd();
        addLiveId();
        addFacebook();
        addGoogle();
    }
}

/**
 * Setup Facebook login. Requires ``FACEBOOK_CLIENT_ID`` and ``FACEBOOK_CLIENT_SECRET`` env.
 */
export function addFacebook(options_: IProviderOptions = {}) : void
{
    let clientId = td.serverSetting("FACEBOOK_CLIENT_ID", false);
    let clientSecret = td.serverSetting("FACEBOOK_CLIENT_SECRET", false);
    let prov = ProviderIndex.at("facebook");
    prov.name = "Facebook";
    prov.makeCustomToken = options_.makeCustomToken;
    prov.setupProvider(async (req: restify.Request, p: OauthRequest) => {
        let url: string;
        p.client_id = clientId;
        if (globalOptions.requestEmail) {
            p.scope = "public_profile,email";
        }
        else {
            p.scope = "public_profile";
        }
        p.response_type = "code";
        url = "https://www.facebook.com/dialog/oauth?" + toQueryString(p.toJson());
        return url;
    }
    , async (req1: restify.Request, p1: OauthRequest) => {
        let profile: JsonObject;
        let js = await p1.getAccessCodeAsync(req1.query()["code"], clientSecret, "https://graph.facebook.com/oauth/access_token");
        if (js == null) {
            return js;
        }
        let request = td.createRequest("https://graph.facebook.com/v2.2/me?access_token=" + encodeURIComponent(js["access_token"]));
        let response = await request.sendAsync();
        profile = response.contentAsJson();
        return profile;
    }
    , async (profile1: JsonObject) => {
        let info: UserInfo;
        let inf = new UserInfo();
        inf.id = "fb:" + profile1["id"];
        inf.name = profile1["name"];
        inf.email = profile1["email"];
        return inf;
        return info;
    });
}

/**
 * Setup Google login. Requires ``GOOGLE_CLIENT_ID`` and ``GOOGLE_CLIENT_SECRET`` env.
 */
export function addGoogle(options_: IProviderOptions = {}) : void
{
    let clientId = td.serverSetting("GOOGLE_CLIENT_ID", false);
    let clientSecret = td.serverSetting("GOOGLE_CLIENT_SECRET", false);
    let prov = ProviderIndex.at("google");
    prov.name = "Google";
    prov.makeCustomToken = options_.makeCustomToken;
    prov.setupProvider(async (req: restify.Request, p: OauthRequest) => {
        let url: string;
        p.client_id = clientId;
        if (globalOptions.requestEmail) {
            p.scope = "openid email profile";
        }
        else {
            p.scope = "openid profile";
        }
        p.response_type = "code";
        url = "https://accounts.google.com/o/oauth2/auth?" + toQueryString(p.toJson());
        return url;
    }
    , async (req1: restify.Request, p1: OauthRequest) => {
        let profile: JsonObject;
        let js = await p1.getAccessCodeAsync(req1.query()["code"], clientSecret, "https://www.googleapis.com/oauth2/v3/token");
        if (js == null) {
            return js;
        }
        let request = td.createRequest("https://www.googleapis.com/oauth2/v2/userinfo");
        request.setHeader("Authorization", "Bearer " + js["access_token"]);
        let response = await request.sendAsync();
        // The JWT token doesn't have user's name
        if (false) {
            profile = nodeJwtSimple.decodeNoVerify(js["id_token"]);
        }
        profile = response.contentAsJson();
        return profile;
    }
    , async (profile1: JsonObject) => {
        let info: UserInfo;
        let inf = new UserInfo();
        inf.id = "google:" + profile1["id"];
        inf.name = profile1["name"];
        inf.email = profile1["email"];
        return inf;
        return info;
    });
}

/**
 * Setup Edmodo login. Requires ``EDMODO_CLIENT_ID`` and ``EDMODO_CLIENT_SECRET`` env.
 */
export function addEdmodo(options_: IProviderOptions = {}) : void
{
    let clientId = td.serverSetting("EDMODO_CLIENT_ID", false);
    let clientSecret = td.serverSetting("EDMODO_CLIENT_SECRET", false);
    let prov = ProviderIndex.at("edmodo");
    prov.name = "Edmodo";
    prov.makeCustomToken = options_.makeCustomToken;
    prov.setupProvider(async (req: restify.Request, p: OauthRequest) => {
        let url: string;
        p.client_id = clientId;
        p.scope = "basic";
        p.response_type = "code";
        url = "https://api.edmodo.com/oauth/authorize?" + toQueryString(p.toJson());
        return url;
    }
    , async (req1: restify.Request, p1: OauthRequest) => {
        let profile: JsonObject;
        let js = await p1.getAccessCodeAsync(req1.query()["code"], clientSecret, "https://api.edmodo.com/oauth/token");
        if (js == null) {
            return js;
        }
        let request = td.createRequest("https://api.edmodo.com/users/me");
        request.setHeader("Authorization", "Bearer " + js["access_token"]);
        let response = await request.sendAsync();
        request = td.createRequest(response.header("Location"));
        request.setHeader("Authorization", "Bearer " + js["access_token"]);
        response = await request.sendAsync();
        profile = response.contentAsJson();
        return profile;
    }
    , async (profile1: JsonObject) => {
        let info: UserInfo;
        info = new UserInfo();
        info.id = "edmodo:" + profile1["id"];
        info.name = profile1["name"];
        return info;
    });
}

/**
 * Setup Azure Active Directory (Office 365 or Corporate) authentication provider. Requires ``AZURE_AD_CLIENT_ID`` and ``AZURE_AD_CLIENT_SECRET`` env.
 */
export function addAzureAd(options_: IProviderOptions = {}) : void
{
    let clientId = td.serverSetting("AZURE_AD_CLIENT_ID", false);
    let clientSecret = td.serverSetting("AZURE_AD_CLIENT_SECRET", false);
    let prov = ProviderIndex.at("azuread");
    prov.name = "Office 365 or Corporate";
    prov.makeCustomToken = options_.makeCustomToken;
    prov.setupProvider(async (req: restify.Request, p: OauthRequest) => {
        let url: string;
        p.client_id = clientId;
        p.scope = "openid";
        p.response_type = "code";
        p.nonce = td.createRandomId(12);
        url = "https://login.windows.net/common/oauth2/authorize?" + toQueryString(p.toJson());
        return url;
    }
    , async (req1: restify.Request, p1: OauthRequest) => {
        let profile: JsonObject;
        let js = await p1.getAccessCodeAsync(req1.query()["code"], clientSecret, "https://login.windows.net/common/oauth2/token");
        if (js == null) {
            return js;
        }
        logger.debug("resp: " + JSON.stringify(js));
        profile = nodeJwtSimple.decodeNoVerify(js["id_token"]);
        return profile;
    }
    , async (profile1: JsonObject) => {
        let info: UserInfo;
        info = new UserInfo();
        info.id = "ad:" + td.replaceAll(profile1["oid"], "-", "").toLowerCase();
        info.name = profile1["name"];
        info.email = profile1["unique_name"];
        return info;
    });
}

async function oauthLoginAsync(req: restify.Request, res: restify.Response) : Promise<void>
{
    validateOauthParameters(req, res);
    if ( ! res.finished()) {
        await globalOptions.preDialog(req, res);
    }
    let clientOauth = ClientOauth.createFromJson(req.query());
    logger.debug("login: " + JSON.stringify(clientOauth.toJson()));
    if ( ! res.finished()) {
        let provider = ProviderIndex.at(orEmpty(clientOauth.provider));
        if (provider.makeLoginUrl == null) {
            let coll2 = ProviderIndex.all();
            if (coll2.length == 1) {
                provider = coll2[0];
            }
            else {
                let links = providerLinks(req.query());
                let s = Object.keys(links).map<string>((elt: string) => {
                    let result: string;
                    clientOauth.provider = elt;
                    let link = links[elt];
                    return "<a class=provider href=\"" + link + "\">" + elt + "</a><br>\n";
                    return result;
                }).join("");
                let html = td.replaceAll(chooseProvider_html, "@BODY@", s);
                if (globalOptions.getProviderTemplate != null) {
                    let s2 = orEmpty(await globalOptions.getProviderTemplate());
                    if (s2 != "") {
                        html = s2;
                        for (let k of Object.keys(links)) {
                            html = td.replaceAll(html, "@" + k + "-url@", links[k]);
                        }
                    }
                }
                res.html(html);
            }
        }
        if (provider.makeLoginUrl != null) {
            let p = new OauthRequest();
            let state = td.createRandomId(12);
            let redir = globalOptions.self + "/oauth/callback";
            p.state = state;
            p.redirect_uri = redir;
            p.display = "touch";
            p._provider = provider.id;
            p._client_oauth = clientOauth;
            if (globalOptions.federationMaster) {
                p.redirect_uri = "https://" + globalOptions.federationMaster + "/oauth/callback";
                p.state = myHost + "," + state;
            }
            let url = await provider.makeLoginUrl(req, p);
            p.state = state;
            await globalOptions.setData(p.state, JSON.stringify(p.toJson()));
            logger.debug("redirect url: " + url);
            res.redirect(303, url);
        }
    }
}

export function validateOauthParameters(req: restify.Request, res: restify.Response) : void
{
    let clientOauth = ClientOauth.createFromJson(req.query());
    if (orEmpty(clientOauth.response_type) != "token") {
        res.sendError(400, "Only response_type=token supported.");
    }
    else if (! clientOauth.state) {
        res.sendError(400, "state= required");
    }
    else {
        let url = orEmpty(clientOauth.redirect_uri);
        if ( ! (td.startsWith(url, globalOptions.self) || td.startsWith(url, "http://localhost:"))) {
            res.sendError(400, "invalid redirect_uri; expecting it to start with " + globalOptions.self + " or http://localhost");
        }
        if (orEmpty(clientOauth.client_id) == "no-cookie" && url != globalOptions.self + "/oauth/gettokencallback") {
            res.sendError(400, "invalid no-cookie redirect_uri; expecting it to start with " + globalOptions.self);
        }
    }
}

export function options() : IInitOptions
{
    return globalOptions
}

export async function userInfoByStateAsync(state: string) : Promise<UserInfo>
{
    let info: UserInfo;
    let s = await globalOptions.getData(state);
    if (s == null || s == "") {
        info = (<UserInfo>null);
    }
    else {
        let oauthRequest = OauthRequest.createFromJson(JSON.parse(s));
        info = oauthRequest._info;
    }
    return info;
}

export function setupRestifyServer() : void
{
    let server = restify.server();
    server.use(restify.authorizationParser());
    server.pre(restify.sanitizePath());
    server.use(restify.CORS());
    server.use(restify.bodyParser());
    server.use(restify.gzipResponse());
    server.use(restify.queryParser());
    server.use(restify.conditionalRequest());
}

function setSelf(req: restify.Request) : void
{
    if (!globalOptions.self) {
        globalOptions.self = req.serverUrl();
    }
    if (myHost == "") {
        myHost = (/^[a-z]+:\/\/([^\/]+)/.exec(globalOptions.self) || [])[1].toLowerCase();
    }
}

export function providerLinks(query: JsonObject) : JsonBuilder
{
    let clientOauth = ClientOauth.createFromJson(query);
    let coll2 = ProviderIndex.all();
    let links = {};
    for (let elt of td.orderedBy(coll2, elt1 => elt1.order)) {
        clientOauth.provider = elt.id;
        let link = "/oauth/login?" + toQueryString(clientOauth.toJson());
        links[elt.id] = link;
    }
    return links;
}


