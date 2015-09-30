/// <reference path='../typings/node/node.d.ts' />

'use strict';

import * as td from './td';
import * as assert from 'assert';
import * as crypto from 'crypto';
import * as querystring from 'querystring';
import * as child_process from 'child_process';
import * as fs from 'fs';

type JsonObject = td.JsonObject;
type JsonBuilder = td.JsonBuilder;

var asArray = td.asArray;
var json = td.json;
var clone = td.clone;

import * as azureTable from "./azure-table"
import * as azureBlobStorage from "./azure-blob-storage"
import * as parallel from "./parallel"
import * as cachedStore from "./cached-store"
import * as redis from "./redis"
import * as indexedStore from "./indexed-store"
import * as kraken from "./kraken"
import * as restify from "./restify"
import * as serverAuth from "./server-auth"
import * as nodeJwtSimple from "./node-jwt-simple"
import * as wordPassword from "./word-password"
import * as raygun from "./raygun"
import * as loggly from "./loggly"
import * as libratoNode from "./librato-node"
import * as tdliteSearch from "./tdlite-search"
import * as azureSearch from "./azure-search"
import * as acs from "./acs"
import * as tdliteDocs from "./tdlite-docs"
import * as sendgrid from "./sendgrid"
import * as nodemailer from "./nodemailer"
import * as mbedworkshopCompiler from "./mbedworkshop-compiler"
import * as microsoftTranslator from "./microsoft-translator"
import * as tdliteData from "./tdlite-data"

export type ApiReqHandler = (req: ApiRequest) => Promise<void>;
export type ResolutionCallback = (fetchResult: indexedStore.FetchResult, apiRequest: ApiRequest) => Promise<void>;
export type StringTransformer = (text: string) => Promise<string>;

var installSlotsTable: azureTable.Table;
var logger: td.AppLogger;
var workspaceContainer: cachedStore.Container[];
var pubsContainer: cachedStore.Container;
var scripts: indexedStore.Store;
var comments: indexedStore.Store;
var users: indexedStore.Store;
var tokenSecret: string = "";
var scriptText: cachedStore.Container;
var updateSlotTable: azureTable.Table;
var updateSlots: indexedStore.Store;
var reviews: indexedStore.Store;
var emptyRequest: ApiRequest;
var arts: indexedStore.Store;
var artContainer: azureBlobStorage.Container;
var thumbContainers: ThumbContainer[];
var blobService: azureBlobStorage.BlobService;
var aacContainer: azureBlobStorage.Container;
var groups: indexedStore.Store;
var tags2: indexedStore.Store;
var screenshots: indexedStore.Store;
var lastShowcaseDl: Date;
var showcaseIds: string[];
var importRunning: boolean = false;
var historyTable: azureTable.Table;
var subscriptions: indexedStore.Store;
var notificationsTable: azureTable.Table;
var releases: indexedStore.Store;
var appContainer: azureBlobStorage.Container;
var settingsContainer: cachedStore.Container;
var cacheRewritten: cachedStore.Container;
var rewriteVersion: number = 0;
var tokensTable: azureTable.Table;
var redisClient: redis.Client;
var filesContainer: azureBlobStorage.Container;
var passcodesContainer: cachedStore.Container;
var groupMemberships: indexedStore.Store;
var basicCreds: string = "";
var abuseReports: indexedStore.Store;
var compileContainer: azureBlobStorage.Container;
var mbedVersion: number = 0;
var releaseVersionPrefix: string = "";
var crashContainer: azureBlobStorage.Container;
var channels: indexedStore.Store;
var channelMemberships: indexedStore.Store;
var cloudRelid: string = "";
var doctopics: JsonObject;
var doctopicsByTopicid: JsonObject;
var doctopicsCss: string = "";
var currClientConfig: ClientConfig;
var pointers: indexedStore.Store;
var cacheCompiler: cachedStore.Container;
var artContentTypes: JsonObject;
var hasHttps: boolean = false;
var throttleDisabled: boolean = false;
var tableClient: azureTable.Client;
var myChannel: string = "";
var myHost: string = "";
var nonSelfRedirect: string = "";
var disableSearch: boolean = false;
var deploymentMeta: JsonObject;
var tdDeployments: azureBlobStorage.Container;
var lastSettingsCheck: number = 0;
var settingsPermissions: JsonObject;
var mainReleaseName: string = "";
var mbedCache: boolean = false;
var faviconIco: Buffer;
var self: string = "";
var embedThumbnails: cachedStore.Container;
var acsCallbackToken: string = "";
var acsCallbackUrl: string = "";
var loginHtml: JsonObject;
var deployChannels: string[];
var emailKeyid: string = "";
var fullTD: boolean = false;
var useSendgrid: boolean = false;
var adminRequest: ApiRequest;
var theServiceSettings: ServiceSettings;
var auditContainer: cachedStore.Container;
var auditStore: indexedStore.Store;
var videoContainer: azureBlobStorage.Container;
var videoStore: indexedStore.Store;
var promosTable: azureTable.Table;
var cachedApiContainer: cachedStore.Container;
var templateSuffix: string = "";
var lastSearchReport: Date;
var initialApprovals: boolean = false;

var settingsOptionsJson = tdliteData.settingsOptionsJson;
var enterCode_html: string = "<script>\nfunction oncode() {\n  var inp = document.getElementById(\"code\")\n  seturl(\"&td_state=\" + encodeURIComponent(inp.value))\n}\nfunction onteacher() {\n  seturl(\"&td_state=teacher\")\n}\n\n(function() {\n  var m = /validated_code=([^?&]+)/.exec(url)\n  if (m) {\n    localStorage['validated_code'] = m[1]\n    window.location = window.location.href.replace(\"/oauth/dialog\", \"/oauth/login\")\n  }\n}())\n</script>\n<div style='margin: 0 auto; width: 310px;  text-align: center;'>\n<h1 style='font-size:3em; font-weight:normal;'>Enter code</h1>\n<div style='color:red; margin: 1em 0'>@MSG@</div>\n<input type=\"text\" id=\"code\" class=\"code\"/><br/>\n<a href=\"#\" class=\"provider\" onclick=\"oncode()\">Go</a><br/>\n<a href=\"#\" onclick=\"onteacher()\">I'm an adult</a><br/>\n</div>\n\n";
var template_html: string = "<!DOCTYPE html>\n<html>\n<head>\n<meta name=\"viewport\" content=\"width=320.1\" />\n<meta http-equiv=\"X-UA-Compatible\" content=\"IE=edge\" />\n<title>Sign in</title>\n<style>\ninput.code,\n.provider {\n   padding: 0.7em;\n   text-decoration: none;\n   width: 310px;\n   display: block;\n   margin: 0 auto;\n   font-size: 16px;\n   font-family: inherit;\n   box-sizing: border-box;\n}\n.provider {\n  color: white;\n  background: #2986E0;\n}\n</style>\n<body id='root' style='font-size:16px; font-family:sans-serif;'>\n<script>\n@JS@\n</script>\n\n@BODY@\n</body>\n</html>\n";
var activate_html: string = "<script>\nfunction oncode() {\n  var inp = document.getElementById(\"code\")\n  seturl(\"&td_state=\" + encodeURIComponent(inp.value))\n}\n(function() {\n  var cd = localStorage['validated_code'];\n  if (cd) {\n     localStorage['validated_code'] = \"\";\n     seturl(\"&td_state=\" + encodeURIComponent(cd))\n  }\n}())\n</script>\n<div style='margin: 0 auto; width: 310px;  text-align: center;'>\n<h1 style='font-size:3em; font-weight:normal;'>We still need a code</h1>\n<div style='color:red; margin: 1em 0'>@MSG@</div>\n<input type=\"text\" id=\"code\" class=\"code\"/><br/>\n<a href=\"#\" class=\"provider\" onclick=\"oncode()\">Go</a><br/>\n<div style='color:#999;'>You are logged in, but you still need to provide an activation code.</div>\n</div>\n";
var newuser_html: string = "<script>\nvar session = \"&td_session=@SESSION@\";\nfunction oncode() {\n    var inp = document.getElementById(\"code\")\n    seturl(\"&td_state=\" + encodeURIComponent(inp.value) + session)\n}\n\nfunction forgotcode() {\n  var f = document.getElementById('forgot')\n  f.style.fontSize = '1.5em';\n  f.innerHTML = 'Go ask your teacher to reset your code.';\n}\n\nfunction nocode() {\n  var f = document.getElementById('kidcode')\n  f.style.display = 'none';\n  f = document.getElementById('newuser')\n  f.style.display = 'block';\n}\n\nfunction passwordok(n) {\n  var inp = document.getElementById(\"firstname\")\n  if (!inp.value || inp.value.length < 3) {\n    inp.style.borderColor = \"red\"\n    return\n  }\n  seturl(\"&td_username=\" + encodeURIComponent(inp.value) + \"&td_password=\" + encodeURIComponent(n) + session)\n}\n\ndocument.onready = function() {\n}\n</script>\n<div style='margin: 0 auto; width: 310px;  text-align: center;'>\n\n<div id='kidcode'>\n<h1 style='font-size:3em; font-weight:normal;'>Do you have kid code?</h1>\n<div style='color:red; margin: 1em 0'>@MSG@</div>\n<input type=\"text\" id=\"code\" class=\"code\"/><br/>\n<a href=\"#\" class=\"provider\" onclick=\"oncode()\">Here it goes!</a><br/>\n<div id='forgot'>\n<a href=\"#\" onclick=\"forgotcode()\">I forgot my kid code</a><br/>\n</div>\n<a href=\"#\" onclick=\"nocode()\">I never got a kid code</a><br/>\n</div>\n\n<div id='newuser' style='display:none'>\n<h1 style='font-size:3em; font-weight:normal;'>Tell us your first name</h1>\n<input type=\"text\" id=\"firstname\" placeholder='First Name' class=\"code\"/><br/>\n<div>\nAnd now pick a 4-word password you'll use in future.\n</div>\n<!-- TODO only show passwords once there is 3 letters in the firstname field -->\n<div id='passwords'>\n@PASSWORDS@\n</div>\n</div>\n\n</div>\n";
var user_created_html: string = "<script>\n  setTimeout(function(){\n    document.getElementById(\"weredone\").style.display = \"block\";\n  }, 2000)\n</script>\n\n<div style='margin: 0 auto; width: 310px;  text-align: center;'>\n<h1 style='font-size:3em; font-weight:normal;'>Welcome, @NAME@</h1>\n<p>Your password is:</p>\n<p style='font-size:1.5em' class='password'>@PASSWORD@</p>\n<p>Remember it!</p>\n<p>\n<a style='display:none' id='weredone' href=\"@URL@\" class=\"provider\">Got it!</a>\n</p>\n</div>\n";
var notFound_html: string = "<!DOCTYPE html>\n<html>\n<head>\n<meta name=\"viewport\" content=\"width=320.1\" />\n<meta http-equiv=\"X-UA-Compatible\" content=\"IE=edge\" />\n<title>Not found</title>\n<body id='root' style='font-size:16px; font-family:sans-serif;'>\n<div style='margin: 0 auto; width: 310px;  text-align: center;'>\n<h1 style='font-size:3em; font-weight:normal;'>HTTP 404</h1>\n<p>The page you've requested cannot be found.</p>\n</div>\n</body>\n</html>\n";
var kidOrNot_html: string = "<script>\nfunction onkid() {\n  window.location = seturl(\"&td_state=kid\")\n}\nfunction onteacher() {\n  window.location = seturl(\"&td_state=teacher\")\n}\n</script>\n<div style='margin: 0 auto; width: 310px;  text-align: center;'>\n<h1 style='font-size:3em; font-weight:normal;'>Who are we dealing with?</h1>\n<a href=\"#\" class=\"provider\" onclick=\"onkid()\">I'm a kid</a><br/>\n<a href=\"#\" class=\"provider\" onclick=\"onteacher()\">I'm an adult</a><br/>\n</div>\n";
var login_js: string = "function seturl(p) {\n  var url = window.location.href.replace(/#.*/, \"\").replace(/\\&td_(username|password|state)=[^?&]*/g, \"\")\n  window.location.href = url + p\n}\n\nfunction setstate(s) {\n    seturl(\"&td_state=\" + encodeURIComponent(s))\n}\n\nfunction checkready(f)\n{\n    var userid = \"@USERID@\";\n    var done = false;\n    if (userid && !/^@/.test(userid)) {\n        setInterval(function() {\n            if (done) return\n            $.get(\"/api/ready/\" + userid).then(function(r) {\n              if (r && r.ready) {\n                  done = true;\n                  f();\n              }\n            })\n        }, 2000)\n    } else {\n        f();\n    }\n}";
var agree_html: string = "<div style='margin: 0 auto; width: 310px;  text-align: center;'>\n<h1 style='font-size:3em; font-weight:normal;'>Legal stuff</h1>\n<p>Agree to terms and conditions?</p>\n<a href=\"@AGREEURL@\" class=\"provider\">Agree</a><br/>\n</div>\n";

export class RouteIndex
{
    public method: string = "";
    public root: string = "";
    public verb: string = "";
    public handler: ApiReqHandler;
    public options: RouteOptions;

    static _dict:td.SMap<RouteIndex> = {};
    static has(m:string, r:string, v:string):boolean
    {
        if (/%/.test((m+r+v)))
            return false
        var h = m + "%" + r + "%" + v
        return RouteIndex._dict.hasOwnProperty(h)
    }

    static at(m:string, r:string, v:string):RouteIndex
    {
        if (/%/.test((m+r+v)))
            return null
        var h = m + "%" + r + "%" + v
        if (!RouteIndex._dict.hasOwnProperty(h)) {
            var x = new RouteIndex()
            x.method = m
            x.root = r
            x.verb = v
            RouteIndex._dict[h] = x
        }
        return RouteIndex._dict[h]
    }
}

export class ApiRequest
{
    public method: string = "";
    public root: string = "";
    public rootPub: JsonObject;
    public rootId: string = "";
    public verb: string = "";
    public queryOptions: JsonObject;
    public body: JsonObject;
    public userid: string = "";
    public argument: string = "";
    public subArgument: string = "";
    public subSubArgument: string = "";
    public status: number = 0;
    public response: JsonObject;
    public responseContentType: string = "";
    public isUpgrade: boolean = false;
    public upgradeTasks: Promise<void>[];
    public origUrl: string = "";
    public startTime: number = 0;
    public throttleIp: string = "";
    public route: RouteIndex;
    public isTopLevel: boolean = false;
    public headers: td.StringMap;
    public userinfo: ApireqUserInfo;
    public isCached: boolean = false;
}

export interface IApiRequest {
    method?: string;
    root?: string;
    rootPub?: JsonObject;
    rootId?: string;
    verb?: string;
    queryOptions?: JsonObject;
    body?: JsonObject;
    userid?: string;
    argument?: string;
    subArgument?: string;
    subSubArgument?: string;
    status?: number;
    response?: JsonObject;
    responseContentType?: string;
    isUpgrade?: boolean;
    upgradeTasks?: Promise<void>[];
    origUrl?: string;
    startTime?: number;
    throttleIp?: string;
    route?: RouteIndex;
    isTopLevel?: boolean;
    headers?: td.StringMap;
    userinfo?: ApireqUserInfo;
    isCached?: boolean;
}

export class PubScript
    extends td.JsonRecord
{
    @json public kind: string = "";
    @json public time: number = 0;
    @json public id: string = "";
    @json public baseid: string = "";
    @json public url: string = "";
    @json public name: string = "";
    @json public description: string = "";
    @json public userid: string = "";
    @json public username: string = "";
    @json public userscore: number = 0;
    @json public userhaspicture: boolean = false;
    @json public icon: string = "";
    @json public iconbackground: string = "";
    @json public iconurl: string = "";
    @json public positivereviews: number = 0;
    @json public cumulativepositivereviews: number = 0;
    @json public subscribers: number = 0;
    @json public comments: number = 0;
    @json public screenshots: number = 0;
    @json public platforms: string[];
    @json public capabilities: string[];
    @json public flows: string[];
    @json public haserrors: boolean = false;
    @json public rootid: string = "";
    @json public updateid: string = "";
    @json public updatetime: number = 0;
    @json public ishidden: boolean = false;
    @json public islibrary: boolean = false;
    @json public userplatform: string[];
    @json public installations: number = 0;
    @json public runs: number = 0;
    @json public art: number = 0;
    @json public toptagids: string[];
    @json public screenshotthumburl: string = "";
    @json public screenshoturl: string = "";
    @json public mergeids: string[];
    @json public editor: string = "";
    @json public meta: JsonObject;
    @json public iconArtId: string = "";
    @json public splashArtId: string = "";
    @json public raw: string = "";
    @json public scripthash: string = "";
    @json public sourceid: string = "";
    @json public updateroot: string = "";
    @json public unmoderated: boolean = false;
    @json public noexternallinks: boolean = false;
    @json public promo: JsonObject;
    static createFromJson(o:JsonObject) { let r = new PubScript(); r.fromJson(o); return r; }
}

export interface IPubScript {
    kind?: string;
    time?: number;
    id?: string;
    baseid?: string;
    url?: string;
    name?: string;
    description?: string;
    userid?: string;
    username?: string;
    userscore?: number;
    userhaspicture?: boolean;
    icon?: string;
    iconbackground?: string;
    iconurl?: string;
    positivereviews?: number;
    cumulativepositivereviews?: number;
    subscribers?: number;
    comments?: number;
    screenshots?: number;
    platforms?: string[];
    capabilities?: string[];
    flows?: string[];
    haserrors?: boolean;
    rootid?: string;
    updateid?: string;
    updatetime?: number;
    ishidden?: boolean;
    islibrary?: boolean;
    userplatform?: string[];
    installations?: number;
    runs?: number;
    art?: number;
    toptagids?: string[];
    screenshotthumburl?: string;
    screenshoturl?: string;
    mergeids?: string[];
    editor?: string;
    meta?: JsonObject;
    iconArtId?: string;
    splashArtId?: string;
    raw?: string;
    scripthash?: string;
    sourceid?: string;
    updateroot?: string;
    unmoderated?: boolean;
    noexternallinks?: boolean;
    promo?: JsonObject;
}

export class PubComment
    extends td.JsonRecord
{
    @json public kind: string = "";
    @json public time: number = 0;
    @json public id: string = "";
    @json public url: string = "";
    @json public text: string = "";
    @json public userid: string = "";
    @json public username: string = "";
    @json public userscore: number = 0;
    @json public userhaspicture: boolean = false;
    @json public userplatform: string[];
    @json public publicationid: string = "";
    @json public publicationname: string = "";
    @json public publicationkind: string = "";
    @json public nestinglevel: number = 0;
    @json public positivereviews: number = 0;
    @json public subscribers: number = 0;
    @json public comments: number = 0;
    @json public assignedtoid: string = "";
    @json public resolved: string = "";
    static createFromJson(o:JsonObject) { let r = new PubComment(); r.fromJson(o); return r; }
}

export interface IPubComment {
    kind?: string;
    time?: number;
    id?: string;
    url?: string;
    text?: string;
    userid?: string;
    username?: string;
    userscore?: number;
    userhaspicture?: boolean;
    userplatform?: string[];
    publicationid?: string;
    publicationname?: string;
    publicationkind?: string;
    nestinglevel?: number;
    positivereviews?: number;
    subscribers?: number;
    comments?: number;
    assignedtoid?: string;
    resolved?: string;
}

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
    kind?: string;
    id?: string;
    url?: string;
    name?: string;
    haspicture?: boolean;
    time?: number;
    about?: string;
    features?: number;
    activedays?: number;
    receivedpositivereviews?: number;
    subscribers?: number;
    score?: number;
    isadult?: boolean;
}

export class PubVersion
    extends td.JsonRecord
{
    @json public instanceId: string = "";
    @json public baseSnapshot: string = "";
    @json public time: number = 0;
    @json public version: number = 0;
    static createFromJson(o:JsonObject) { let r = new PubVersion(); r.fromJson(o); return r; }
}

export interface IPubVersion {
    instanceId: string;
    baseSnapshot: string;
    time: number;
    version: number;
}

export class PubHeader
    extends td.JsonRecord
{
    @json public guid: string = "";
    @json public name: string = "";
    @json public scriptId: string = "";
    @json public scriptTime: number = 0;
    @json public updateId: string = "";
    @json public updateTime: number = 0;
    @json public userId: string = "";
    @json public status: string = "";
    @json public scriptVersion: IPubVersion;
    @json public hasErrors: string = "";
    @json public recentUse: number = 0;
    @json public editor: string = "";
    @json public meta: JsonObject;
    static createFromJson(o:JsonObject) { let r = new PubHeader(); r.fromJson(o); return r; }
}

export interface IPubHeader {
    guid: string;
    name: string;
    scriptId: string;
    scriptTime: number;
    updateId: string;
    updateTime: number;
    userId: string;
    status: string;
    scriptVersion: IPubVersion;
    hasErrors: string;
    recentUse: number;
    editor: string;
    meta: JsonObject;
}

export interface IPubHeaders {
    newNotifications: number;
    notifications: boolean;
    email: boolean;
    emailNewsletter: boolean;
    emailNotifications: boolean;
    profileIndex: number;
    profileCount: number;
    time: number;
    askBeta: boolean;
    askSomething: string;
    betaSettings: boolean;
    random: string;
    minimum: string;
    v: number;
    user: PubUser;
    headers: IPubHeader[];
    blobcontainer: string;
}

export class PubBody
    extends td.JsonRecord
{
    @json public guid: string = "";
    @json public name: string = "";
    @json public scriptId: string = "";
    @json public userId: string = "";
    @json public status: string = "";
    @json public scriptVersion: IPubVersion;
    @json public recentUse: number = 0;
    @json public script: string = "";
    @json public editorState: string = "";
    @json public editor: string = "";
    @json public meta: JsonObject;
    static createFromJson(o:JsonObject) { let r = new PubBody(); r.fromJson(o); return r; }
}

export interface IPubBody {
    guid?: string;
    name?: string;
    scriptId?: string;
    userId?: string;
    status?: string;
    scriptVersion?: IPubVersion;
    recentUse?: number;
    script?: string;
    editorState?: string;
    editor?: string;
    meta?: JsonObject;
}

export class InstalledResult
    extends td.JsonRecord
{
    @json public delay: number = 0;
    @json public numErrors: number = 0;
    @json public headers: JsonObject[];
    static createFromJson(o:JsonObject) { let r = new InstalledResult(); r.fromJson(o); return r; }
}

export interface IInstalledResult {
    delay?: number;
    numErrors?: number;
    headers?: JsonObject[];
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
    nickname?: string;
    aboutme?: string;
    website?: string;
    notifications?: boolean;
    notifications2?: string;
    picturelinkedtofacebook?: string;
    picture?: string;
    gender?: string;
    realname?: string;
    yearofbirth?: number;
    location?: string;
    culture?: string;
    howfound?: string;
    programmingknowledge?: string;
    occupation?: string;
    twitterhandle?: string;
    email?: string;
    emailverificationsent?: boolean;
    emailverified?: boolean;
    emailnewsletter2?: string;
    emailfrequency?: string;
    editorMode?: string;
    school?: string;
    wallpaper?: string;
    permissions?: string;
    credit?: number;
    userid?: string;
    previousemail?: string;
}

export class PublishResult
    extends td.JsonRecord
{
    @json public bodies: JsonObject[];
    static createFromJson(o:JsonObject) { let r = new PublishResult(); r.fromJson(o); return r; }
}

export interface IPublishResult {
    bodies?: JsonObject[];
}

export class UpdateEntry
    extends td.JsonRecord
{
    @json public PartitionKey: string = "";
    @json public RowKey: string = "";
    @json public pub: string = "";
    @json public time: number = 0;
    static createFromJson(o:JsonObject) { let r = new UpdateEntry(); r.fromJson(o); return r; }
}

export interface IUpdateEntry {
    PartitionKey?: string;
    RowKey?: string;
    pub?: string;
    time?: number;
}

export class PubReview
    extends td.JsonRecord
{
    @json public kind: string = "";
    @json public time: number = 0;
    @json public id: string = "";
    @json public userid: string = "";
    @json public username: string = "";
    @json public userscore: number = 0;
    @json public userhaspicture: boolean = false;
    @json public userplatform: string[];
    @json public publicationid: string = "";
    @json public publicationname: string = "";
    @json public publicationkind: string = "";
    @json public publicationuserid: string = "";
    @json public ispositive: boolean = false;
    static createFromJson(o:JsonObject) { let r = new PubReview(); r.fromJson(o); return r; }
}

export interface IPubReview {
    kind?: string;
    time?: number;
    id?: string;
    userid?: string;
    username?: string;
    userscore?: number;
    userhaspicture?: boolean;
    userplatform?: string[];
    publicationid?: string;
    publicationname?: string;
    publicationkind?: string;
    publicationuserid?: string;
    ispositive?: boolean;
}

export interface DecoratedStore
{
    myResolve: ResolutionCallback;
}

export interface IStoreDecorator {
    target?: indexedStore.Store;
    resolve?: ResolutionCallback;
}

export class ResolveOptions
    extends td.JsonRecord
{
    @json public byUserid: boolean = false;
    @json public byPublicationid: boolean = false;
    @json public anonList: boolean = false;
    @json public anonSearch: boolean = false;
    static createFromJson(o:JsonObject) { let r = new ResolveOptions(); r.fromJson(o); return r; }
}

export interface IResolveOptions {
    byUserid?: boolean;
    byPublicationid?: boolean;
    anonList?: boolean;
    anonSearch?: boolean;
}

export class PubArt
    extends td.JsonRecord
{
    @json public kind: string = "";
    @json public time: number = 0;
    @json public id: string = "";
    @json public name: string = "";
    @json public description: string = "";
    @json public url: string = "";
    @json public userid: string = "";
    @json public username: string = "";
    @json public userscore: number = 0;
    @json public userhaspicture: boolean = false;
    @json public userplatform: string[];
    @json public flags: string[];
    @json public pictureurl: string = "";
    @json public thumburl: string = "";
    @json public mediumthumburl: string = "";
    @json public wavurl: string = "";
    @json public aacurl: string = "";
    @json public contenttype: string = "";
    @json public bloburl: string = "";
    @json public arttype: string = "";
    @json public filehash: string = "";
    static createFromJson(o:JsonObject) { let r = new PubArt(); r.fromJson(o); return r; }
}

export interface IPubArt {
    kind?: string;
    time?: number;
    id?: string;
    name?: string;
    description?: string;
    url?: string;
    userid?: string;
    username?: string;
    userscore?: number;
    userhaspicture?: boolean;
    userplatform?: string[];
    flags?: string[];
    pictureurl?: string;
    thumburl?: string;
    mediumthumburl?: string;
    wavurl?: string;
    aacurl?: string;
    contenttype?: string;
    bloburl?: string;
    arttype?: string;
    filehash?: string;
}

export class ThumbContainer
{
    public name: string = "";
    public container: azureBlobStorage.Container;
    public size: number = 0;
}

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
    kind?: string;
    time?: number;
    id?: string;
    url?: string;
    name?: string;
    category?: string;
    description?: string;
    instances?: number;
    topscreenshotids?: string[];
}

export class PubGroup
    extends td.JsonRecord
{
    @json public kind: string = "";
    @json public time: number = 0;
    @json public id: string = "";
    @json public name: string = "";
    @json public pictureid: string = "";
    @json public allowexport: boolean = false;
    @json public allowappstatistics: boolean = false;
    @json public isrestricted: boolean = false;
    @json public isclass: boolean = false;
    @json public description: string = "";
    @json public school: string = "";
    @json public grade: string = "";
    @json public url: string = "";
    @json public userid: string = "";
    @json public username: string = "";
    @json public userscore: number = 0;
    @json public userhaspicture: boolean = false;
    @json public userplatform: string[];
    @json public positivereviews: number = 0;
    @json public subscribers: number = 0;
    @json public comments: number = 0;
    static createFromJson(o:JsonObject) { let r = new PubGroup(); r.fromJson(o); return r; }
}

export interface IPubGroup {
    kind?: string;
    time?: number;
    id?: string;
    name?: string;
    pictureid?: string;
    allowexport?: boolean;
    allowappstatistics?: boolean;
    isrestricted?: boolean;
    isclass?: boolean;
    description?: string;
    school?: string;
    grade?: string;
    url?: string;
    userid?: string;
    username?: string;
    userscore?: number;
    userhaspicture?: boolean;
    userplatform?: string[];
    positivereviews?: number;
    subscribers?: number;
    comments?: number;
}

export class PubScreenshot
    extends td.JsonRecord
{
    @json public kind: string = "";
    @json public time: number = 0;
    @json public id: string = "";
    @json public url: string = "";
    @json public userid: string = "";
    @json public username: string = "";
    @json public userscore: number = 0;
    @json public userhaspicture: boolean = false;
    @json public userplatform: string[];
    @json public publicationid: string = "";
    @json public publicationname: string = "";
    @json public publicationkind: string = "";
    @json public pictureurl: string = "";
    @json public thumburl: string = "";
    static createFromJson(o:JsonObject) { let r = new PubScreenshot(); r.fromJson(o); return r; }
}

export interface IPubScreenshot {
    kind?: string;
    time?: number;
    id?: string;
    url?: string;
    userid?: string;
    username?: string;
    userscore?: number;
    userhaspicture?: boolean;
    userplatform?: string[];
    publicationid?: string;
    publicationname?: string;
    publicationkind?: string;
    pictureurl?: string;
    thumburl?: string;
}

export class RouteOptions
    extends td.JsonRecord
{
    @json public noSizeCheck: boolean = false;
    @json public sizeCheckExcludes: string = "";
    @json public cacheKey: string = "";
    static createFromJson(o:JsonObject) { let r = new RouteOptions(); r.fromJson(o); return r; }
}

export interface IRouteOptions {
    noSizeCheck?: boolean;
    sizeCheckExcludes?: string;
    cacheKey?: string;
}

export class PubInstalledHistory
    extends td.JsonRecord
{
    @json public kind: string = "";
    @json public time: number = 0;
    @json public historyid: string = "";
    @json public scriptstatus: string = "";
    @json public scriptname: string = "";
    @json public scriptdescription: string = "";
    @json public scriptid: string = "";
    @json public isactive: boolean = false;
    @json public meta: string = "";
    @json public scriptsize: number = 0;
    static createFromJson(o:JsonObject) { let r = new PubInstalledHistory(); r.fromJson(o); return r; }
}

export interface IPubInstalledHistory {
    kind?: string;
    time?: number;
    historyid?: string;
    scriptstatus?: string;
    scriptname?: string;
    scriptdescription?: string;
    scriptid?: string;
    isactive?: boolean;
    meta?: string;
    scriptsize?: number;
}

export class PubSubscription
    extends td.JsonRecord
{
    @json public kind: string = "";
    @json public time: number = 0;
    @json public id: string = "";
    @json public userid: string = "";
    @json public username: string = "";
    @json public userscore: number = 0;
    @json public userhaspicture: boolean = false;
    @json public publicationid: string = "";
    @json public publicationname: string = "";
    @json public publicationkind: string = "";
    static createFromJson(o:JsonObject) { let r = new PubSubscription(); r.fromJson(o); return r; }
}

export interface IPubSubscription {
    kind?: string;
    time?: number;
    id?: string;
    userid?: string;
    username?: string;
    userscore?: number;
    userhaspicture?: boolean;
    publicationid?: string;
    publicationname?: string;
    publicationkind?: string;
}

export class PubNotification
    extends td.JsonRecord
{
    @json public kind: string = "";
    @json public time: number = 0;
    @json public id: string = "";
    @json public notificationkind: string = "";
    @json public userid: string = "";
    @json public publicationid: string = "";
    @json public publicationname: string = "";
    @json public publicationkind: string = "";
    @json public supplementalid: string = "";
    @json public supplementalkind: string = "";
    @json public supplementalname: string = "";
    static createFromJson(o:JsonObject) { let r = new PubNotification(); r.fromJson(o); return r; }
}

export interface IPubNotification {
    kind?: string;
    time?: number;
    id?: string;
    notificationkind?: string;
    userid?: string;
    publicationid?: string;
    publicationname?: string;
    publicationkind?: string;
    supplementalid?: string;
    supplementalkind?: string;
    supplementalname?: string;
}

export class PubRelease
    extends td.JsonRecord
{
    @json public kind: string = "";
    @json public time: number = 0;
    @json public id: string = "";
    @json public releaseid: string = "";
    @json public userid: string = "";
    @json public username: string = "";
    @json public userscore: number = 0;
    @json public userhaspicture: boolean = false;
    @json public labels: IReleaseLabel[];
    @json public commit: string = "";
    @json public branch: string = "";
    @json public buildnumber: number = 0;
    @json public version: string = "";
    @json public name: string = "";
    static createFromJson(o:JsonObject) { let r = new PubRelease(); r.fromJson(o); return r; }
}

export interface IPubRelease {
    kind?: string;
    time?: number;
    id?: string;
    releaseid?: string;
    userid?: string;
    username?: string;
    userscore?: number;
    userhaspicture?: boolean;
    labels?: IReleaseLabel[];
    commit?: string;
    branch?: string;
    buildnumber?: number;
    version?: string;
    name?: string;
}

export interface IReleaseLabel {
    name: string;
    userid: string;
    time: number;
    releaseid: string;
    relid: string;
    numpokes: number;
}

export class Token
    extends td.JsonRecord
{
    @json public PartitionKey: string = "";
    @json public RowKey: string = "";
    @json public time: number = 0;
    @json public reason: string = "";
    @json public cookie: string = "";
    @json public version: number = 0;
    static createFromJson(o:JsonObject) { let r = new Token(); r.fromJson(o); return r; }
}

export interface IToken {
    PartitionKey?: string;
    RowKey?: string;
    time?: number;
    reason?: string;
    cookie?: string;
    version?: number;
}

export class PubAuditLog
    extends td.JsonRecord
{
    @json public kind: string = "";
    @json public time: number = 0;
    @json public type: string = "";
    @json public userid: string = "";
    @json public subjectid: string = "";
    @json public publicationid: string = "";
    @json public publicationkind: string = "";
    @json public data: string = "";
    @json public oldvalue: JsonObject;
    @json public newvalue: JsonObject;
    @json public ip: string = "";
    @json public tokenid: string = "";
    static createFromJson(o:JsonObject) { let r = new PubAuditLog(); r.fromJson(o); return r; }
}

export interface IPubAuditLog {
    kind?: string;
    time?: number;
    type?: string;
    userid?: string;
    subjectid?: string;
    publicationid?: string;
    publicationkind?: string;
    data?: string;
    oldvalue?: JsonObject;
    newvalue?: JsonObject;
    ip?: string;
    tokenid?: string;
}

export class PubWebfile
    extends td.JsonRecord
{
    @json public kind: string = "";
    @json public time: number = 0;
    @json public id: string = "";
    @json public userid: string = "";
    @json public username: string = "";
    @json public userscore: number = 0;
    @json public userhaspicture: boolean = false;
    @json public userplatform: string[];
    @json public filename: string = "";
    @json public contenttype: string = "";
    @json public labels: string[];
    @json public rawurl: string = "";
    static createFromJson(o:JsonObject) { let r = new PubWebfile(); r.fromJson(o); return r; }
}

export interface IPubWebfile {
    kind?: string;
    time?: number;
    id?: string;
    userid?: string;
    username?: string;
    userscore?: number;
    userhaspicture?: boolean;
    userplatform?: string[];
    filename?: string;
    contenttype?: string;
    labels?: string[];
    rawurl?: string;
}

export class LoginSession
    extends td.JsonRecord
{
    @json public state: string = "";
    @json public userid: string = "";
    @json public redirectUri: string = "";
    @json public groupid: string = "";
    @json public passwords: string[];
    @json public pass: string = "";
    @json public ownerId: string = "";
    @json public termsOk: boolean = false;
    @json public codeOk: boolean = false;
    static createFromJson(o:JsonObject) { let r = new LoginSession(); r.fromJson(o); return r; }
}

export interface ILoginSession {
    state?: string;
    userid?: string;
    redirectUri?: string;
    groupid?: string;
    passwords?: string[];
    pass?: string;
    ownerId?: string;
    termsOk?: boolean;
    codeOk?: boolean;
}

export class PubGroupMembership
    extends td.JsonRecord
{
    @json public kind: string = "";
    @json public time: number = 0;
    @json public id: string = "";
    @json public userid: string = "";
    @json public username: string = "";
    @json public userscore: number = 0;
    @json public userhaspicture: boolean = false;
    @json public publicationid: string = "";
    static createFromJson(o:JsonObject) { let r = new PubGroupMembership(); r.fromJson(o); return r; }
}

export interface IPubGroupMembership {
    kind?: string;
    time?: number;
    id?: string;
    userid?: string;
    username?: string;
    userscore?: number;
    userhaspicture?: boolean;
    publicationid?: string;
}

export class PubAbusereport
    extends td.JsonRecord
{
    @json public kind: string = "";
    @json public time: number = 0;
    @json public id: string = "";
    @json public text: string = "";
    @json public userid: string = "";
    @json public username: string = "";
    @json public userscore: number = 0;
    @json public userhaspicture: boolean = false;
    @json public userplatform: string[];
    @json public publicationid: string = "";
    @json public publicationname: string = "";
    @json public publicationkind: string = "";
    @json public publicationuserid: string = "";
    @json public resolution: string = "";
    static createFromJson(o:JsonObject) { let r = new PubAbusereport(); r.fromJson(o); return r; }
}

export interface IPubAbusereport {
    kind?: string;
    time?: number;
    id?: string;
    text?: string;
    userid?: string;
    username?: string;
    userscore?: number;
    userhaspicture?: boolean;
    userplatform?: string[];
    publicationid?: string;
    publicationname?: string;
    publicationkind?: string;
    publicationuserid?: string;
    resolution?: string;
}

export class CompileReq
    extends td.JsonRecord
{
    @json public config: string = "";
    @json public source: string = "";
    @json public meta: JsonObject;
    @json public repohash: string = "";
    static createFromJson(o:JsonObject) { let r = new CompileReq(); r.fromJson(o); return r; }
}

export interface ICompileReq {
    config?: string;
    source?: string;
    meta?: JsonObject;
    repohash?: string;
}

export class CompileResp
    extends td.JsonRecord
{
    @json public statusurl: string = "";
    static createFromJson(o:JsonObject) { let r = new CompileResp(); r.fromJson(o); return r; }
}

export interface ICompileResp {
    statusurl?: string;
}

export class CompileStatus
    extends td.JsonRecord
{
    @json public success: boolean = false;
    @json public hexurl: string = "";
    @json public mbedresponse: JsonBuilder;
    @json public messages: JsonObject[];
    static createFromJson(o:JsonObject) { let r = new CompileStatus(); r.fromJson(o); return r; }
}

export interface ICompileStatus {
    success?: boolean;
    hexurl?: string;
    mbedresponse?: JsonBuilder;
    messages?: JsonObject[];
}

export class CandeleteResponse
    extends td.JsonRecord
{
    @json public publicationkind: string = "";
    @json public publicationname: string = "";
    @json public publicationuserid: string = "";
    @json public candeletekind: boolean = false;
    @json public candelete: boolean = false;
    @json public hasabusereports: boolean = false;
    @json public canmanage: boolean = false;
    static createFromJson(o:JsonObject) { let r = new CandeleteResponse(); r.fromJson(o); return r; }
}

export interface ICandeleteResponse {
    publicationkind?: string;
    publicationname?: string;
    publicationuserid?: string;
    candeletekind?: boolean;
    candelete?: boolean;
    hasabusereports?: boolean;
    canmanage?: boolean;
}

export class BugReport
    extends td.JsonRecord
{
    @json public exceptionConstructor: string = "";
    @json public exceptionMessage: string = "";
    @json public context: string = "";
    @json public currentUrl: string = "";
    @json public worldId: string = "";
    @json public kind: string = "";
    @json public scriptId: string = "";
    @json public stackTrace: string = "";
    @json public sourceURL: string = "";
    @json public line: number = 0;
    @json public eventTrace: string = "";
    @json public userAgent: string = "";
    @json public resolution: string = "";
    @json public jsUrl: string = "";
    @json public timestamp: number = 0;
    @json public platform: string[];
    @json public attachments: string[];
    @json public tdVersion: string = "";
    @json public logMessages: JsonObject;
    @json public reportId: string = "";
    static createFromJson(o:JsonObject) { let r = new BugReport(); r.fromJson(o); return r; }
}

export interface IBugReport {
    exceptionConstructor?: string;
    exceptionMessage?: string;
    context?: string;
    currentUrl?: string;
    worldId?: string;
    kind?: string;
    scriptId?: string;
    stackTrace?: string;
    sourceURL?: string;
    line?: number;
    eventTrace?: string;
    userAgent?: string;
    resolution?: string;
    jsUrl?: string;
    timestamp?: number;
    platform?: string[];
    attachments?: string[];
    tdVersion?: string;
    logMessages?: JsonObject;
    reportId?: string;
}

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
    kind?: string;
    time?: number;
    id?: string;
    name?: string;
    pictureid?: string;
    description?: string;
    userid?: string;
    username?: string;
    userscore?: number;
    userhaspicture?: boolean;
    userplatform?: string[];
    positivereviews?: number;
    subscribers?: number;
    comments?: number;
}

export class RecImportResponse
    extends td.JsonRecord
{
    @json public problems: number = 0;
    @json public imported: number = 0;
    @json public present: number = 0;
    @json public attempts: number = 0;
    @json public ids: JsonBuilder;
    @json public force: boolean = false;
    @json public fulluser: boolean = false;
    static createFromJson(o:JsonObject) { let r = new RecImportResponse(); r.fromJson(o); return r; }
}

export interface IRecImportResponse {
    problems?: number;
    imported?: number;
    present?: number;
    attempts?: number;
    ids?: JsonBuilder;
    force?: boolean;
    fulluser?: boolean;
}

export class ClientConfig
    extends td.JsonRecord
{
    @json public workspaceUrl: string = "";
    @json public searchUrl: string = "";
    @json public searchApiKey: string = "";
    @json public apiUrl: string = "";
    @json public rootUrl: string = "";
    @json public liteVersion: string = "";
    @json public tdVersion: string = "";
    @json public releaseid: string = "";
    @json public relid: string = "";
    @json public releaseLabel: string = "";
    @json public shareUrl: string = "";
    @json public cdnUrl: string = "";
    @json public anonToken: string = "";
    @json public primaryCdnUrl: string = "";
    @json public altCdnUrls: string[];
    static createFromJson(o:JsonObject) { let r = new ClientConfig(); r.fromJson(o); return r; }
}

export interface IClientConfig {
    workspaceUrl?: string;
    searchUrl?: string;
    searchApiKey?: string;
    apiUrl?: string;
    rootUrl?: string;
    liteVersion?: string;
    tdVersion?: string;
    releaseid?: string;
    relid?: string;
    releaseLabel?: string;
    shareUrl?: string;
    cdnUrl?: string;
    anonToken?: string;
    primaryCdnUrl?: string;
    altCdnUrls?: string[];
}

export class PubPointer
    extends td.JsonRecord
{
    @json public kind: string = "";
    @json public time: number = 0;
    @json public id: string = "";
    @json public path: string = "";
    @json public scriptid: string = "";
    @json public artid: string = "";
    @json public redirect: string = "";
    @json public description: string = "";
    @json public userid: string = "";
    @json public username: string = "";
    @json public userscore: number = 0;
    @json public userhaspicture: boolean = false;
    @json public userplatform: string[];
    @json public comments: number = 0;
    @json public artcontainer: string = "";
    @json public parentpath: string = "";
    @json public scriptname: string = "";
    @json public breadcrumbtitle: string = "";
    static createFromJson(o:JsonObject) { let r = new PubPointer(); r.fromJson(o); return r; }
}

export interface IPubPointer {
    kind?: string;
    time?: number;
    id?: string;
    path?: string;
    scriptid?: string;
    artid?: string;
    redirect?: string;
    description?: string;
    userid?: string;
    username?: string;
    userscore?: number;
    userhaspicture?: boolean;
    userplatform?: string[];
    comments?: number;
    artcontainer?: string;
    parentpath?: string;
    scriptname?: string;
    breadcrumbtitle?: string;
}

export class CompilerConfig
    extends td.JsonRecord
{
    @json public repourl: string = "";
    @json public platform: string = "";
    @json public hexfilename: string = "";
    @json public hexcontenttype: string = "";
    @json public target_binary: string = "";
    @json public internalUrl: string = "";
    static createFromJson(o:JsonObject) { let r = new CompilerConfig(); r.fromJson(o); return r; }
}

export interface ICompilerConfig {
    repourl?: string;
    platform?: string;
    hexfilename?: string;
    hexcontenttype?: string;
    target_binary?: string;
    internalUrl?: string;
}

export class ScanAndSearchOptions
    extends td.JsonRecord
{
    @json public skipSearch: boolean = false;
    @json public skipScan: boolean = false;
    static createFromJson(o:JsonObject) { let r = new ScanAndSearchOptions(); r.fromJson(o); return r; }
}

export interface IScanAndSearchOptions {
    skipSearch?: boolean;
    skipScan?: boolean;
}

export class ApireqUserInfo
    extends td.JsonRecord
{
    public id: string = "";
    public token: Token;
    public json: JsonObject;
    public permissionCache: JsonBuilder;
    public ip: string = "";
}

export class ServiceSettings
    extends td.JsonRecord
{
    @json public paths: JsonObject;
    @json public emailFrom: string = "";
    @json public accounts: JsonObject;
    @json public alarmingEmails: JsonObject;
    @json public termsversion: string = "";
    @json public blockedNicknameRx: string = "";
    @json public tokenExpiration: number = 0;
    @json public defaultLang: string = "";
    @json public langs: JsonObject;
    @json public envrewrite: JsonObject;
    static createFromJson(o:JsonObject) { let r = new ServiceSettings(); r.fromJson(o); return r; }
}

export interface IServiceSettings {
    paths?: JsonObject;
    emailFrom?: string;
    accounts?: JsonObject;
    alarmingEmails?: JsonObject;
    termsversion?: string;
    blockedNicknameRx?: string;
    tokenExpiration?: number;
    defaultLang?: string;
    langs?: JsonObject;
    envrewrite?: JsonObject;
}

export class PubVideo
    extends td.JsonRecord
{
    @json public kind: string = "";
    @json public time: number = 0;
    @json public id: string = "";
    @json public provider: string = "";
    @json public providerid: string = "";
    @json public blobid: string = "";
    @json public sdvideourl: string = "";
    @json public thumb512url: string = "";
    @json public thumb128url: string = "";
    static createFromJson(o:JsonObject) { let r = new PubVideo(); r.fromJson(o); return r; }
}

export interface IPubVideo {
    kind?: string;
    time?: number;
    id?: string;
    provider?: string;
    providerid?: string;
    blobid?: string;
    sdvideourl?: string;
    thumb512url?: string;
    thumb128url?: string;
}


async function _initAsync() : Promise<void>
{
    rewriteVersion = 220;
    let reinit = false;
    logger = td.createLogger("tdlite");
    throttleDisabled = orEmpty(td.serverSetting("DISABLE_THROTTLE", true)) == "true";
    disableSearch = orEmpty(td.serverSetting("DISABLE_SEARCH", true)) == "true";
    myChannel = withDefault(td.serverSetting("TD_BLOB_DEPLOY_CHANNEL", true), "local");
    deployChannels = withDefault(td.serverSetting("CHANNELS", false), myChannel).split(",");
    templateSuffix = orEmpty(td.serverSetting("TEMPLATE_SUFFIX", true));
    fullTD = false;
    initialApprovals = myChannel == "test";

    if (hasSetting("LOGGLY_TOKEN")) {
        await loggly.initAsync({
            globalTags: td.serverSetting("LOG_TAG", false)
        });
    }
    if (hasSetting("RAYGUN_API_KEY")) {
        await raygun.initAsync({
            private: ! fullTD,
            saveReport: async (json: JsonObject) => {
                let blobName = orEmpty(json["reportId"]);
                if (blobName != "") {
                    let encReport = encrypt(JSON.stringify(json), "BUG");
                    let result4 = await crashContainer.createBlockBlobFromTextAsync(blobName, encReport);
                }
            }

        });
    }
    if (hasSetting("LIBRATO_TOKEN")) {
        let libSource = withDefault(td.serverSetting("RoleInstanceId", true), "local");
        await libratoNode.initAsync({
            period: 60000,
            aggregate: true
        });
        /* async */ statusReportLoopAsync();
    }

    mbedVersion = 2;
    mbedCache = true;
    releaseVersionPrefix = "0.0";

    let creds = orEmpty(td.serverSetting("BASIC_CREDS", true));
    if (creds != "") {
        basicCreds = "Basic " + new Buffer(creds, "utf8").toString("base64");
    }
    tableClient = azureTable.createClient({
        timeout: 10000,
        retries: 10
    });
    azureBlobStorage.init();
    blobService = azureBlobStorage.createBlobService();
    workspaceContainer = (<cachedStore.Container[]>[]);
    redisClient = await redis.createClientAsync("", 0, "");
    mainReleaseName = withDefault(td.serverSetting("MAIN_RELEASE_NAME", true), "current");
    if (reinit) {
        let success = await blobService.setCorsPropertiesAsync("*", "GET,HEAD,OPTIONS", "*", "ErrorMessage,x-ms-request-id,Server,x-ms-version,Content-Type,Cache-Control,Last-Modified,ETag,Content-MD5,x-ms-lease-status,x-ms-blob-type", 3600);
    }
    else {
        azureTable.assumeTablesExists();
        azureBlobStorage.assumeContainerExists();
    }
    if (hasSetting("KRAKEN_API_SECRET")) {
        kraken.init("", "");
    }
    mbedworkshopCompiler.init();
    mbedworkshopCompiler.setVerbosity("debug");

    hasHttps = td.startsWith(td.serverSetting("SELF", false), "https:");
    if (hasSetting("SENDGRID_API_KEY")) {
        useSendgrid = true;
        await sendgrid.initAsync("", "");
    }
    await nodemailer.initAsync();

    azureSearch.init({
        allow_409: true
    });
    await tdliteSearch.initAsync();
    if (hasSetting("MICROSOFT_TRANSLATOR_CLIENT_SECRET")) {
        await microsoftTranslator.initAsync("", "");
    }
    let timeDelta = await redisClient.cachedTimeAsync() - new Date().getTime();
    logger.info("time difference to redis instance: " + timeDelta + "ms");
    if (false) {
        logger.info(JSON.stringify(await redisClient.sendCommandAsync("info", [])));
    }

    tokenSecret = td.serverSetting("TOKEN_SECRET", false);
    await cachedStore.initAsync();
    indexedStore.init(tableClient);
    // cachedStore.getLogger().setVerbosity("info");

    await _init_0Async();

    if (hasSetting("LIBRATO_TOKEN")) {
        /* async */ failureReportLoopAsync();
    }
    emptyRequest = buildApiRequest("/api");
    adminRequest = buildApiRequest("/api");
    adminRequest.userinfo.json = ({ "groups": {} });

    self = td.serverSetting("SELF", false).toLowerCase();
    myHost = (/^https?:\/\/([^\/]+)/.exec(self) || [])[1].toLowerCase();
    nonSelfRedirect = orEmpty(td.serverSetting("NON_SELF_REDIRECT", true));

    let server = restify.server();
    server.use(restify.bodyParser());
    server.use(restify.queryParser());
    server.use(restify.gzipResponse());
    let cors = restify.CORS({
        credentials: true,
        headers: "ErrorMessage"
    });
    server.use(cors);
    restify.disableTicks();
    await _initAcsAsync();

    server.get("/api/ping", async (req: restify.Request, res: restify.Response) => {
        handleHttps(req, res);
        if ( ! res.finished()) {
            res.send(orEmpty(req.query()["value"]));
        }
    });
    server.get("/api/ready/:userid", async (req1: restify.Request, res1: restify.Response) => {
        handleHttps(req1, res1);
        let throttleKey = sha256(req1.remoteIp()) + ":ready";
        if (await throttleCoreAsync(throttleKey, 1)) {
            res1.sendError(restify.http()._429TooManyRequests, "");
        }
        else {
            let uid = req1.param("userid");
            let entry2 = await getPubAsync(uid, "user");
            if (entry2 == null) {
                if (await throttleCoreAsync(throttleKey, 100)) {
                    res1.sendError(restify.http()._429TooManyRequests, "");
                }
                else {
                    res1.sendError(restify.http()._404NotFound, "Missing");
                }
            }
            else if (orFalse(entry2["awaiting"])) {
                res1.json(({ "ready": false }));
            }
            else {
                res1.json(({ "ready": true }));
            }
        }
    });
    await _initLoginAsync();
    // ## batch api here
    server.post("/api", async (req2: restify.Request, res2: restify.Response) => {
        await performRoutingAsync(req2, res2);
    });
    server.routeRegex("OPTS", ".*", async (req3: restify.Request, res3: restify.Response) => {
        res3.setHeader("Access-Control-Allow-Headers", "Accept, Accept-Version, Content-Type, Origin, X-TD-Access-Token, X-TD-World-ID, X-TD-Release-ID, X-TD-User-Platform, Authorization");
        res3.setHeader("Access-Control-Allow-Credentials", "true");
        res3.setHeader("Access-Control-Max-Age", "3600");
        res3.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, HEAD, OPTIONS");
        res3.sendStatus(200);
    });
    server.all(async (req4: restify.Request, res4: restify.Response) => {
        if (td.startsWith(req4.url(), "/api/")) {
            await performRoutingAsync(req4, res4);
        }
        else {
            handleBasicAuth(req4, res4);
            if ( ! res4.finished() && req4.method() != "GET") {
                res4.sendError(restify.http()._405MethodNotAllowed, "");
            }
            if ( ! res4.finished()) {
                if (td.startsWith(req4.url(), "/app/")) {
                    await serveReleaseAsync(req4, res4);
                }
                else if (td.startsWith(req4.url(), "/favicon.ico")) {
                    if (faviconIco == null) {
                        let [result, faviconIco] = await filesContainer.getBlobToBufferAsync("favicon.ico");
                    }
                    res4.sendBuffer(faviconIco, "image/x-icon");
                }
                else if (td.startsWith(req4.url(), "/verify/")) {
                    await handleEmailVerificationAsync(req4, res4);
                }
                else {
                    await servePointerAsync(req4, res4);
                }
            }
        }
    });
    logger.debug("librato email: " + td.serverSetting("LIBRATO_EMAIL", false));
}

async function fetchQueryAsync(query: azureTable.TableQuery, req: restify.Request) : Promise<JsonObject>
{
    let entities: JsonObject;
    query = query.continueAt(req.query()["continuation"]);
    let count = req.query()["count"];
    if (count != null) {
        query = query.top(count);
    }
    entities = (await query.fetchPageAsync()).toJson();
    return entities;
}

async function saveScriptAsync(userid: string, body: PubBody) : Promise<JsonObject>
{
    let newSlot: JsonObject;
    progress("save 0");
    let bodyBuilder = clone(body.toJson());
    body.script = (<string>null);
    body.editorState = (<string>null);
    let bodyJson = body.toJson();
    assert(JSON.stringify(bodyJson).length < 10000, "too large header");
    let slotJson = await installSlotsTable.getEntityAsync(userid, body.guid);
    let updatedSlot = azureTable.createEntity(userid, body.guid);

    progress("save 1");
    let id2 = (20000000000000 - await redisClient.cachedTimeAsync()) + "." + userid + "." + azureTable.createRandomId(12);
    let _new = false;
    let prevBlob = "";
    if (slotJson == null) {
        _new = true;
        let s2 = orEmpty(body.userId);
        let source = "@fork";
        if (s2 == "" || s2 == userid) {
            source = "@fresh";
        }
        logger.tick("New_slot" + source);
    }
    else {
        prevBlob = slotJson["currentBlob"];
        updatedSlot = clone(slotJson);
    }
    logger.tick("SaveScript");
    bodyBuilder["slotUserId"] = userid;
    for (let s of Object.keys(bodyJson)) {
        if (s != "scriptVersion") {
            updatedSlot[s] = bodyJson[s];
        }
    }
    if (bodyJson.hasOwnProperty("meta")) {
        updatedSlot["meta"] = JSON.stringify(bodyJson["meta"]);
    }
    else {
        updatedSlot["meta"] = "{}";
    }
    updatedSlot["currentBlob"] = id2;
    let updatedJson = clone(updatedSlot);
    let versionOK = body.status == "deleted" || prevBlob == body.scriptVersion.baseSnapshot || body.scriptVersion.baseSnapshot == "*";
    if (versionOK) {
        progress("save 2");
        await workspaceForUser(userid).justInsertAsync(id2, bodyBuilder);
        progress("save 3");
        if (_new) {
            versionOK = await installSlotsTable.tryInsertEntityAsync(updatedJson);
        }
        else {
            versionOK = await installSlotsTable.tryUpdateEntityAsync(updatedJson, "merge");
        }
        if ( ! versionOK) {
            let result = await installSlotsTable.getEntityAsync(userid, body.guid);
            if (result != null && orEmpty(result["currentBlob"]) == id2) {
                logger.debug("fixing up wrong result from azure table insert, " + userid + " " + body.guid + " " + id2);
                versionOK = true;
            }
        }
    }
    if (versionOK) {
        progress("save 4");
        let hist = new PubInstalledHistory();
        hist.historyid = id2;
        hist.scriptstatus = body.status;
        hist.scriptname = body.name;
        hist.scriptdescription = "";
        hist.kind = "installedscripthistory";
        hist.isactive = false;
        hist.time = body.scriptVersion.time;
        hist.meta = updatedSlot["meta"];
        hist.scriptsize = orEmpty(bodyBuilder["script"]).length;
        let jsb = clone(hist.toJson());
        jsb["PartitionKey"] = userid + "." + body.guid;
        jsb["RowKey"] = hist.historyid;
        await historyTable.insertEntityAsync(clone(jsb), "or merge");
        progress("save 5");
        newSlot = headerFromSlot(updatedJson)
    }
    else {
        newSlot = ({"error":"out of date"});
        logger.debug("collision on " + userid + "/" + body.guid + " " + prevBlob + " vs " + body.scriptVersion.baseSnapshot);
    }
    return newSlot;
}

async function _init_0Async() : Promise<void>
{
    let tableClientWs = await specTableClientAsync("WORKSPACE");
    let tableClientHist = await specTableClientAsync("WORKSPACE_HIST");
    let notTableClient = await specTableClientAsync("NOTIFICATIONS");
    installSlotsTable = await tableClientWs.createTableIfNotExistsAsync("installslots");
    historyTable = await tableClientHist.createTableIfNotExistsAsync("historyslots");
    updateSlotTable = await tableClient.createTableIfNotExistsAsync("scriptupdates");
    tokensTable = await tableClient.createTableIfNotExistsAsync("tokens");
    scriptText = await cachedStore.createContainerAsync("scripttext", {
        access: "private"
    });
    pubsContainer = await cachedStore.createContainerAsync("pubs");
    settingsContainer = await cachedStore.createContainerAsync("settings", {
        inMemoryCacheSeconds: 5
    });
    cacheRewritten = await cachedStore.createContainerAsync("cacherewritten", {
        inMemoryCacheSeconds: 15,
        redisCacheSeconds: 3600
    });
    cacheCompiler = await cachedStore.createContainerAsync("cachecompiler", {
        redisCacheSeconds: 600
    });
    passcodesContainer = await cachedStore.createContainerAsync("passcodes", {
        noCache: true
    });
    artContainer = await blobService.createContainerIfNotExistsAsync("pub", "hidden");
    aacContainer = await blobService.createContainerIfNotExistsAsync("aac", "hidden");
    videoContainer = await blobService.createContainerIfNotExistsAsync("cachevideo", "hidden");
    tdDeployments = await blobService.createContainerIfNotExistsAsync("tddeployments", "private");
    thumbContainers = (<ThumbContainer[]>[]);
    await addThumbContainerAsync(128, "thumb");
    await addThumbContainerAsync(512, "thumb1");
    await addThumbContainerAsync(1024, "thumb2");
    notificationsTable = await notTableClient.createTableIfNotExistsAsync("notifications2");
    appContainer = await blobService.createContainerIfNotExistsAsync("app", "hidden");
    filesContainer = await blobService.createContainerIfNotExistsAsync("files", "hidden");
    compileContainer = await blobService.createContainerIfNotExistsAsync("compile", "hidden");
    crashContainer = await blobService.createContainerIfNotExistsAsync("crashes2", "private");
    cachedApiContainer = await cachedStore.createContainerAsync("cachedapi", {
        inMemoryCacheSeconds: 5,
        redisCacheSeconds: 600,
        noBlobStorage: true
    });
    for (let j = 0; j < 4; j++) {
        let blobServiceWs = azureBlobStorage.createBlobService({
            storageAccount: td.serverSetting("WORKSPACE_BLOB_ACCOUNT" + j, false),
            storageAccessKey: td.serverSetting("WORKSPACE_BLOB_KEY" + j, false)
        });
        /* async */ blobServiceWs.setCorsPropertiesAsync("*", "GET,HEAD,OPTIONS", "*", "*", 3600);
        let container = await cachedStore.createContainerAsync("workspace", {
            noCache: true,
            access: "hidden",
            blobService: blobServiceWs
        });
        workspaceContainer.push(container);
    }
    await _initAuditAsync();
    // ## General
    addRoute("POST", "", "", async (req: ApiRequest) => {
        await performBatchAsync(req);
    }
    , {
        noSizeCheck: true
    });
    _initTicks();
    _initBugs();
    // # Init different publication kinds
    _initAdmin();
    await _initScriptsAsync();
    await _initPromoAsync();
    await _initCommentsAsync();
    await _initGroupsAsync();
    await _initTagsAsync();
    await _initArtAsync();
    await _initScreenshotsAsync();
    await _initReviewsAsync();
    await _initUsersAsync();
    await _initSubscriptionsAsync();
    await _initReleasesAsync();
    await _initAbusereportsAsync();
    await _initChannelsAsync();
    await _initPointersAsync();
    _initConfig();
    await _initEmbedThumbnailsAsync();
    await _initVimeoAsync();
    _initProgress();
    _initRuntime();
    // ## and other stuff
    _initSearch();
    _initImport();
    _initWorkspaces();
}

/**
 * {hints:method:GET,POST,PUT,DELETE}
 */
function addRoute(method: string, root: string, verb: string, handler: ApiReqHandler, options_0: IRouteOptions = {}) : void
{
    let options_ = new RouteOptions(); options_.load(options_0);
    let route = RouteIndex.at(method, root, verb);
    route.options = options_;
    if (options_.noSizeCheck || method == "GET" || method == "DELETE") {
        route.handler = handler;
    }
    else {
        route.handler = async (req: ApiRequest) => {
            let size = 0;
            if (req.body != null) {
                if (options_.sizeCheckExcludes != "") {
                    let jsb = clone(req.body);
                    delete jsb[options_.sizeCheckExcludes];
                    size = JSON.stringify(jsb).length;
                }
                else {
                    size = JSON.stringify(req.body).length;
                }
            }
            if (size > 20000) {
                req.status = restify.http()._413RequestEntityTooLarge;
            }
            else {
                await handler(req);
            }
        }
        ;
    }
}

function orEmpty(s: string) : string
{
    let r: string;
    if (s == null) {
        r = "";
    }
    else {
        r = s;
    }
    return r;
}

async function performRoutingAsync(req: restify.Request, res: restify.Response) : Promise<void>
{
    let apiRequest = buildApiRequest(req.url());
    apiRequest.method = req.method();
    apiRequest.body = req.bodyAsJson();
    await validateTokenAsync(apiRequest, req);
    if (apiRequest.userid == "") {
        apiRequest.throttleIp = sha256(req.remoteIp());
    }
    if ( ! apiRequest.isCached && apiRequest.userinfo.token == null) {
        handleBasicAuth(req, res);
    }
    else {
        handleHttps(req, res);
    }
    if ( ! res.finished()) {
        let upgradeToken = apiRequest.queryOptions["upgrade"];
        apiRequest.isUpgrade = upgradeToken != null && upgradeToken == tokenSecret;
        apiRequest.isTopLevel = true;
        if (apiRequest.status == 200) {
            if (apiRequest.isCached) {
                if ( ! (await handledByCacheAsync(apiRequest))) {
                    await storeCacheAsync(apiRequest);
                }
            }
            else {
                await throttleAsync(apiRequest, "apireq", 2);
                await performSingleRequestAsync(apiRequest);
            }
        }
        sendResponse(apiRequest, req, res);
    }
}

function lookupRoute(apiRequest: ApiRequest, root: string, verb: string) : void
{
    if (apiRequest.route == null) {
        if (RouteIndex.has(apiRequest.method, root, verb)) {
            apiRequest.route = RouteIndex.at(apiRequest.method, root, verb)
        }
    }
}

async function anyListAsync(store: indexedStore.Store, req: ApiRequest, idxName: string, key: string) : Promise<void>
{
    let entities = await fetchAndResolveAsync(store, req, idxName, key);
    buildListResponse(entities, req);
}

function aliasRoute(method: string, copy: string, src: string) : void
{
    let dst = RouteIndex.at(method, copy, "");
    let route = RouteIndex.at(method, src, "");
    dst.handler = route.handler;
    dst.options = route.options;
}

function withDefault(s: string, defl: string) : string
{
    let r: string;
    if (s == null || s == "") {
        r = defl;
    }
    else {
        r = s;
    }
    return r;
}

function hashPassword(salt: string, pass: string) : string
{
    let hashed: string;
    if (salt == "") {
        salt = crypto.randomBytes(8).toString("hex");
    }
    else {
        salt = salt.replace(/\$.*/g, "");
    }

    hashed = salt + "$$" + sha256(salt + orEmpty(pass));
    return hashed;
}

async function generateTokenAsync(user: string, reason: string, client_id: string) : Promise<[string, string]>
{
    let customToken: string;
    let tdCookie: string;
    let token = new Token();
    token.PartitionKey = user;
    token.RowKey = azureBlobStorage.createRandomId(32);
    token.time = await nowSecondsAsync();
    token.reason = reason;
    token.version = 2;
    if (orEmpty(client_id) != "no-cookie") {
        token.cookie = azureBlobStorage.createRandomId(32);
    }
    await pubsContainer.updateAsync(user, async (entry: JsonBuilder) => {
        entry["lastlogin"] = await nowSecondsAsync();
    });
    await tokensTable.insertEntityAsync(token.toJson(), "or merge");
    customToken = tokenString(token);
    tdCookie = token.cookie;
    return <[string, string]>[customToken, tdCookie]
}

async function nowSecondsAsync() : Promise<number>
{
    let value: number;
    value = Math.floor(await redisClient.cachedTimeAsync() / 1000);
    return value;
}

async function getPubAsync(id: string, kind: string) : Promise<JsonObject>
{
    let entry2: JsonObject;
    if (nonEmpty(id)) {
        entry2 = await pubsContainer.getAsync(id);
        if (entry2 == null || orEmpty(entry2["kind"]) != kind) {
            entry2 = (<JsonObject>null);
        }
    }
    else {
        entry2 = (<JsonObject>null);
    }
    return entry2;
}

function nonEmpty(id: string) : boolean
{
    let b: boolean;
    b = id != null && id != "";
    return b;
}

async function performSingleRequestAsync(apiRequest: ApiRequest) : Promise<void>
{
    logger.newContext();
    if (apiRequest.status == 200 && apiRequest.root == "me") {
        if (apiRequest.userid == "") {
            apiRequest.status = restify.http()._401Unauthorized;
        }
        else {
            apiRequest.root = apiRequest.userid;
        }
    }
    if (apiRequest.status == 200) {
        lookupRoute(apiRequest, apiRequest.root, apiRequest.verb);
        if (apiRequest.verb != "") {
            lookupRoute(apiRequest, apiRequest.root, "*");
        }
        if (apiRequest.route == null && apiRequest.root != "") {
            let pub = await pubsContainer.getAsync(apiRequest.root);
            if (pub == null || pub["kind"] == "reserved") {
            }
            else {
                apiRequest.root = "*" + pub["kind"];
                apiRequest.rootPub = pub;
                apiRequest.rootId = pub["id"];
                lookupRoute(apiRequest, "*" + pub["kind"], apiRequest.verb);
                lookupRoute(apiRequest, "*pub", apiRequest.verb);
                if (apiRequest.verb == "") {
                }
                else {
                    lookupRoute(apiRequest, "*" + pub["kind"], "*");
                }
            }
        }

        if (apiRequest.route == null) {
            await throttleAsync(apiRequest, "apireq", 3);
            apiRequest.status = 404;
        }
        else {
            await apiRequest.route.handler(apiRequest);
        }
        let cat = "ApiGet";
        if (apiRequest.root == "") {
            cat = "ApiBatch";
        }
        else if (apiRequest.verb == "installedlong" || apiRequest.root == "notificationslong" || apiRequest.verb == "notificationslong") {
            cat = "ApiPoll";
        }
        else if (apiRequest.method != "GET") {
            cat = "ApiPost";
        }
        else if ( ! apiRequest.isTopLevel) {
            cat = "ApiInner";
        }
        let evArgs = {};
        let path = apiRequest.method + " /api/";
        if (apiRequest.route != null) {
            path = path + apiRequest.route.root;
            if (apiRequest.route.verb != "") {
                path = path + "/" + apiRequest.route.verb;
            }
        }
        else {
            path = path + "*" + apiRequest.status;
        }
        evArgs["rawURL"] = sanitze(apiRequest.origUrl);
        evArgs["user"] = apiRequest.userid;
        evArgs["cat"] = cat;
        evArgs["statusCode"] = apiRequest.status;
        if (false) {
            logger.customTick(path, clone(evArgs));
        }
        logger.measure(cat + "@" + path, logger.contextDuration());
    }
}

function sendResponse(apiRequest: ApiRequest, req: restify.Request, res: restify.Response) : void
{
    if (apiRequest.status != 200) {
        if (apiRequest.status == restify.http()._401Unauthorized) {
            res.sendError(restify.http()._403Forbidden, "Invalid or missing ?access_token=...");
        }
        else if (apiRequest.status == restify.http()._402PaymentRequired) {
            res.sendCustomError(restify.http()._402PaymentRequired, "Your account is not authorized to perform this operation.");
        }
        else {
            res.sendError(apiRequest.status, "");
        }
    }
    else if (apiRequest.response == null) {
        assert(false, "response unset");
    }
    else {
        let etag = computeEtagOfJson(apiRequest.response);
        if (apiRequest.method == "GET" && orEmpty(req.header("If-None-Match")) == etag) {
            res.sendError(restify.http()._304NotModified, "");
            return;
        }
        res.setHeader("ETag", etag);
        if ( ! apiRequest.isCached) {
            res.setHeader("Cache-Control", "no-cache, no-store");
        }
        if (apiRequest.headers != null) {
            for (let hd of Object.keys(apiRequest.headers)) {
                res.setHeader(hd, apiRequest.headers[hd]);
            }
        }
        if (typeof apiRequest.response == "string") {
            res.setHeader("X-Content-Type-Options", "nosniff");
            res.sendText(td.toString(apiRequest.response), withDefault(apiRequest.responseContentType, "text/plain"));
        }
        else {
            res.json(apiRequest.response);
        }
    }
}

async function performBatchAsync(req: ApiRequest) : Promise<void>
{
    let reqArr = req.body["array"];
    if (reqArr == null || reqArr.length > 50 || ! req.isTopLevel) {
        req.status = restify.http()._400BadRequest;
    }
    else {
        let resps = asArray(clone(reqArr));
        await parallel.forAsync(reqArr.length, async (x: number) => {
            let inpReq = resps[x];
            let resp = await performBatchedRequestAsync(inpReq, req, false);
            resps[x] = resp;
        });
        let jsb = {};
        jsb["code"] = 200;
        jsb["array"] = td.arrayToJson(resps);
        req.response = clone(jsb);
    }
}

function parseUrl(url: string) : [string, JsonObject]
{
    let path: string;
    let query: JsonObject;

    var m = /^([^?]*)\?(.*)/.exec(url)
    if (m) {
        path = m[1]
        query = querystring.parse(m[2])
    } else { path = url; query = {} }
    path = path.replace(/^\//, "")

    return [path, query]
}

async function performBatchedRequestAsync(inpReq: JsonBuilder, req: ApiRequest, allowPost: boolean) : Promise<JsonBuilder>
{
    let resp: JsonBuilder;
    let apiRequest = buildApiRequest(withDefault(inpReq["relative_url"], "/no-such-url"));
    apiRequest.method = withDefault(inpReq["method"], "GET").toUpperCase();
    apiRequest.userid = req.userid;
    apiRequest.userinfo = req.userinfo;

    apiRequest.isUpgrade = req.isUpgrade;
    if ( ! allowPost) {
        if (apiRequest.method != "GET") {
            apiRequest.status = restify.http()._405MethodNotAllowed;
        }
    }
    if (apiRequest.status == 200) {
        await performSingleRequestAsync(apiRequest);
    }
    resp = {};
    resp["code"] = apiRequest.status;
    if (apiRequest.status == 200) {
        let etag = computeEtagOfJson(apiRequest.response);
        let s = inpReq["If-None-Match"];
        if (s != null && s == etag) {
            resp["code"] = restify.http()._304NotModified;
        }
        else {
            resp["ETag"] = etag;
            resp["body"] = apiRequest.response;
        }
    }
    return resp;
}

async function resolveScriptsAsync(entities: indexedStore.FetchResult, req: ApiRequest, forSearch: boolean) : Promise<void>
{
    let applyUpdates = req.queryOptions["applyupdates"];
    let singleResult = false;
    if (applyUpdates) {
        let updates = {};
        updates[""] = "1";
        entities.items = asArray(entities.items).filter((elt: JsonObject) => {
            let result: boolean;
            if ( ! elt["pub"]["ishidden"]) {
                let key = orEmpty(elt["updateKey"]);
                if (updates[key] == null) {
                    updates[key] = "1";
                    return true;
                }
            }
            return false;
            return result;
        });
    }
    else if (entities.items.length == 1) {
        singleResult = req.rootId == entities.items[0]["id"];
    }
    // 
    let updateObjs = (<JsonObject[]>[]);
    let srcmapping = {};
    let srcitems = asArray(entities.items);
    let updateIds = srcitems.map<string>(elt1 => withDefault(elt1["updateKey"], "***"));
    updateObjs = await pubsContainer.getManyAsync(updateIds);
    if (applyUpdates) {
        let coll2 = updateObjs.map<string>(elt2 => withDefault(elt2["scriptId"], "***"));
        let includeAbuse = true;
        if (forSearch) {
            includeAbuse = callerHasPermission(req, "global-list");
        }
        entities.items = (await pubsContainer.getManyAsync(coll2))
            .filter(elt3 => isGoodPub(elt3, "script") && (includeAbuse || isAbuseSafe(elt3)));
        if (forSearch) {
            srcitems.reverse();
            for (let js2 of srcitems) {
                srcmapping[js2["updateKey"]] = js2["id"];
            }
        }
    }
    // 
    await addUsernameEtcAsync(entities);
    // 
    let seeHidden = hasPermission(req.userinfo.json, "global-list");
    let coll = (<PubScript[]>[]);
    for (let i = 0; i < entities.items.length; i++) {
        let js = entities.items[i];
        let script = PubScript.createFromJson(js["pub"]);
        script.unmoderated = orFalse(script.unmoderated);
        script.noexternallinks = ! hasPermission(js["*userid"], "external-links");
        let seeIt = seeHidden || script.userid == req.userid;

        if (script.ishidden) {
            if (script.unmoderated && singleResult) {
                singleResult = callerSharesGroupWith(req, js["*userid"]);
            }
            seeIt = seeIt || singleResult || callerIsFacilitatorOf(req, js["*userid"]);
            seeIt = seeIt || req.rootId == "promo-scripts" && ! script.unmoderated;
        }
        else if (script.unmoderated) {
            seeIt = seeIt || callerSharesGroupWith(req, js["*userid"]);
        }
        else {
            seeIt = true;
        }
        if ( ! seeIt) {
            continue;
        }
        if (forSearch) {
            script.sourceid = withDefault(srcmapping[js["updateKey"]], script.id);
        }
        else {
            script.sourceid = (<string>null);
        }
        if (script == null) {
            logger.error("wrong json: " + JSON.stringify(js));
        }
        if (script.meta == null) {
            script.meta = ({});
        }
        script.promo = js["promo"];
        coll.push(script);
        if (script.rootid == "") {
            script.rootid = script.id;
        }
        let updateObj = updateObjs[i];
        if (updateObj == null) {
            updateObj = ({});
        }
        if (updateObj.hasOwnProperty("scriptTime")) {
            script.updateid = updateObj["scriptId"];
            script.updatetime = updateObj["scriptTime"];
        }
        else {
            script.updateid = script.id;
            script.updatetime = script.time;
        }
        script.updateroot = updateObj["id0"];
        if (script.updateroot == null) {
            script.updateroot = withDefault(updateObj["scriptId"], script.id);
        }
        if (updateObj.hasOwnProperty("pub") && updateObj["pub"].hasOwnProperty("positivereviews")) {
            let count = updateObj["pub"]["positivereviews"];
            script.positivereviews = count;
            script.cumulativepositivereviews = count;
        }
    }
    entities.items = td.arrayToJson(coll);
}

function resolveUsers(entities: indexedStore.FetchResult, req: ApiRequest) : void
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
        if ( ! fullTD) {
            user.time = 0;
        }
        user.isadult = hasPermission(jsb, "adult");
    }
    entities.items = td.arrayToJson(coll);
}

function _initWorkspaces() : void
{
    addRoute("GET", "*user", "installed", async (req: ApiRequest) => {
        meOnly(req);
        if (req.status == 200) {
            await getInstalledAsync(req, false);
        }
    });
    addRoute("GET", "*user", "installedlong", async (req1: ApiRequest) => {
        meOnly(req1);
        if (req1.status == 200) {
            await getInstalledAsync(req1, true);
        }
    });
    addRoute("POST", "*user", "installed", async (req2: ApiRequest) => {
        meOnly(req2);
        if (req2.status == 200) {
            await postInstalledAsync(req2);
        }
    }
    , {
        noSizeCheck: true
    });
    addRoute("DELETE", "*user", "installed", async (req3: ApiRequest) => {
        meOnly(req3);
        if (req3.status == 200) {
            let result = await installSlotsTable.getEntityAsync(req3.rootId, req3.argument);
            if (result == null) {
                req3.status = restify.http()._404NotFound;
            }
            else {
                await deleteHistoryAsync(req3, req3.argument);
                await pokeSubChannelAsync("installed:" + req3.rootId);
                req3.response = ({});
            }
        }
    });
    emailKeyid = "EMAIL";
    addRoute("POST", "*user", "settings", async (req4: ApiRequest) => {
        let logcat = "admin-settings";
        let updateOwn = false;
        if (req4.rootId == req4.userid) {
            checkPermission(req4, "adult");
            if (req4.status == 200) {
                await throttleAsync(req4, "settings", 120);
                logcat = "user-settings";
                updateOwn = true;
            }
        }
        else {
            await checkFacilitatorPermissionAsync(req4, req4.rootId);
        }
        if (req4.status == 200) {
            let nick = orEmpty(req4.body["nickname"]).replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
            await refreshSettingsAsync();
            if (new RegExp(theServiceSettings.blockedNicknameRx).test(nick)) {
                checkPermission(req4, "official");
            }
        }
        if (req4.status == 200) {
            let bld = await updateAndUpsertAsync(pubsContainer, req4, async (entry: JsonBuilder) => {
                let sett = await buildSettingsAsync(clone(entry));
                let newEmail = req4.body["email"];
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
                            /* async */ nodemailer.sendAsync(newEmail, theServiceSettings.emailFrom, "email verification on " + myHost, "Please follow the link below to verify your new email address on " + myHost + "\n\n      " + self + "verify/" + req4.rootId + "/" + id + "\n\nThanks!");
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
                setFields(settings, req4.body, "aboutme\nculture\neditorMode\nemailfrequency\nemailnewsletter2\ngender\nhowfound\nlocation\nnickname\nnotifications\nnotifications2\noccupation\npicture\npicturelinkedtofacebook\nprogrammingknowledge\nrealname\nschool\ntwitterhandle\nwallpaper\nwebsite\nyearofbirth");
                for (let k of "culture\nemail\npreviousemail\ngender\nlocation\noccupation\nprogrammingknowledge\nrealname\nschool".split("\n")) {
                    let val = settings[k];
                    if (orEmpty(val) != "") {
                        settings[k] = encrypt(val, emailKeyid);
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
            await auditLogAsync(req4, logcat, {
                oldvalue: req4.rootPub,
                newvalue: clone(bld)
            });
        }
    });
    addRoute("GET", "*user", "settings", async (req5: ApiRequest) => {
        if (req5.rootId == req5.userid) {
        }
        else {
            await checkFacilitatorPermissionAsync(req5, req5.rootId);
        }
        if (req5.status == 200) {
            if (req5.userid != req5.rootId) {
                await auditLogAsync(req5, "view-settings");
            }
            let jsb = clone((await buildSettingsAsync(req5.rootPub)).toJson());
            if (orEmpty(req5.queryOptions["format"]) != "short") {
                copyJson(settingsOptionsJson, jsb);
            }
            req5.response = clone(jsb);
        }
    });
}

function headerFromSlot(js: JsonObject) : IPubHeader
{
    let pubHeader: PubHeader;
    pubHeader = new PubHeader();
    let isDeleted = js["status"] == "deleted";
    if (isDeleted) {
        pubHeader.fromJson(({}));
        pubHeader.status = js["status"];
        pubHeader.guid = js["guid"];
    }
    else {
        pubHeader.fromJson(js);
        pubHeader.meta = JSON.parse(withDefault(js["meta"], "{}"));
    }
    let ms = 20000000000000 - parseFloat(pubHeader.scriptVersion.baseSnapshot.replace(/\..*/g, ""));
    pubHeader.scriptVersion = {
        instanceId: "cloud",
        baseSnapshot: withDefault(js["currentBlob"], "18561817817178.deleted.foobar"),
        time: Math.round(ms / 1000),
        version: 1
    };
    return <any>pubHeader.toJson();
}

async function getInstalledAsync(req: ApiRequest, long: boolean) : Promise<void>
{
    if (req.argument == "") {
        let v = await longPollAsync("installed:" + req.rootId, long, req);
        if (req.status == 200) {
            if (long) {
                // re-get for new notifiacation count if any
                req.rootPub = await getPubAsync(req.rootId, "user");
            }
            let entities = await installSlotsTable.createQuery().partitionKeyIs(req.rootId).fetchAllAsync();
            let res:IPubHeaders = <any>{};
            res.blobcontainer = (await workspaceForUser(req.userid).blobContainerAsync()).url() + "/";
            res.time = await nowSecondsAsync();
            res.random = crypto.randomBytes(16).toString("base64");
            res.headers = [];
            res.newNotifications = orZero(req.rootPub["notifications"]);
            res.notifications = res.newNotifications > 0;
            res.v = v;
            for (let js of entities) {
                res.headers.push(headerFromSlot(js));
            }
            req.response = res
        }
    }
    else {
        // ### specific slot
        if (req.subArgument == "history") {
            await getInstalledHistoryAsync(req);
        }
        else {
            let result = await installSlotsTable.getEntityAsync(req.rootId, req.argument);
            if (result == null) {
                req.status = 404;
            }
            else {
                req.response = headerFromSlot(result)
            }
        }
    }
}

async function postInstalledAsync(req: ApiRequest) : Promise<void>
{
    let installedResult = new InstalledResult();
    installedResult.delay = 10;
    installedResult.headers = (<JsonObject[]>[]);
    if (req.argument == "") {
        let bodies = req.body["bodies"];
        if (bodies != null) {
            for (let body of bodies) {
                let pubBody = new PubBody();
                pubBody.fromJson(body);
                let item = await saveScriptAsync(req.rootId, pubBody);
                if (item.hasOwnProperty("error")) {
                    installedResult.numErrors += 1;
                }
                installedResult.headers.push(item);
                req.verb = "installedbodies";
            }
        }
        let uses = req.body["recentUses"];
        if (uses != null) {
            for (let use of uses) {
                let entity = azureTable.createEntity(req.rootId, orEmpty(use["guid"]));
                entity["recentUse"] = use["recentUse"];
                let ok = await installSlotsTable.tryUpdateEntityAsync(clone(entity), "merge");
                if ( ! ok) {
                    installedResult.numErrors += 1;
                }
                req.verb = "installedrecent";
            }
        }
        await pokeSubChannelAsync("installed:" + req.rootId);
        req.response = installedResult.toJson();
    }
    else {
        req.verb = req.subArgument;
        if (req.subArgument == "compile") {
            await mbedCompileAsync(req);
        }
        else if (req.subArgument == "publish") {
            await canPostAsync(req, "script");
            if (req.status == 200) {
                let uid = req.rootId;
                await publishScriptAsync(req);
                progress("publish - poke");
                await pokeSubChannelAsync("installed:" + uid);
            }
        }
        else {
            req.status = restify.http()._400BadRequest;
        }
    }

}

function buildApiRequest(url: string) : ApiRequest
{
    let apiReq: ApiRequest;
    apiReq = new ApiRequest();
    apiReq.origUrl = url;
    let [path, query] = parseUrl(url);
    let strings = path.split("/");
    if (strings.length > 0 && strings[0] == "api") {
        strings.splice(0, 1);
    }
    if (strings.length > 0 && strings[0] == "cached") {
        strings.splice(0, 1);
        apiReq.isCached = true;
    }
    apiReq.method = "GET";
    apiReq.root = orEmpty(strings[0]);
    apiReq.verb = orEmpty(strings[1]);
    apiReq.argument = orEmpty(strings[2]);
    apiReq.subArgument = orEmpty(strings[3]);
    apiReq.subSubArgument = orEmpty(strings[4]);
    apiReq.queryOptions = query;
    apiReq.status = 200;
    apiReq.userinfo = new ApireqUserInfo();
    apiReq.userinfo.permissionCache = {};
    apiReq.body = {};
    return apiReq;
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
                jsb[kk] = decrypt(vv);
            }
        }
        settings.fromJson(clone(jsb));
    }
    settings.userid = userJson["id"];
    settings.nickname = user.name;
    settings.aboutme = user.about;
    await refreshSettingsAsync();
    let perms = {};
    for (let s of orEmpty(userJson["permissions"]).split(",")) {
        if (s != "") {
            perms[s] = 1;
            let js2 = settingsPermissions[s];
            if (js2 != null) {
                td.jsonCopyFrom(perms, js2);
            }
        }
    }
    settings.permissions = "," + Object.keys(perms).join(",") + ",";
    settings.credit = orZero(userJson["credit"]);
    return settings;
    return r;
}

function copyJson(js: JsonObject, jsb: JsonBuilder) : void
{
    for (let key of Object.keys(js)) {
        jsb[key] = js[key];
    }
}

async function publishScriptAsync(req: ApiRequest) : Promise<void>
{
    progress("start publish, ");
    let publishResult = new PublishResult();
    publishResult.bodies = (<JsonObject[]>[]);

    let slotJson = await installSlotsTable.getEntityAsync(req.userid, req.argument);
    let pubVersion = new PubVersion();
    pubVersion.fromJson(JSON.parse(req.queryOptions["scriptversion"]));
    if (slotJson == null) {
        req.status = restify.http()._404NotFound;
    }
    else if (slotJson["currentBlob"] != pubVersion.baseSnapshot) {
        req.status = restify.http()._409Conflict;
    }

    if (req.status == 200) {
        let pubScript = new PubScript();
        pubScript.userid = req.userid;
        pubScript.ishidden = req.queryOptions["hidden"];
        pubScript.unmoderated = ! callerHasPermission(req, "adult");
        let mergeids = req.queryOptions["mergeids"];
        if (mergeids != null) {
            pubScript.mergeids = mergeids.split(",");
        }
        else {
            pubScript.mergeids = (<string[]>[]);
        }
        let body = await workspaceForUser(req.userid).getAsync(pubVersion.baseSnapshot);
        pubScript.baseid = orEmpty(body["scriptId"]);
        req.rootPub = (<JsonObject>null);
        req.rootId = "";
        if (pubScript.baseid != "") {
            let baseJson = await getPubAsync(pubScript.baseid, "script");
            if (baseJson != null) {
                req.rootPub = baseJson;
                req.rootId = pubScript.baseid;
                pubScript.rootid = withDefault(baseJson["pub"]["rootid"], pubScript.baseid);
            }
        }
        pubScript.time = await nowSecondsAsync();
        pubScript.name = withDefault(req.body["name"], "unnamed");
        pubScript.description = orEmpty(req.body["comment"]);
        pubScript.icon = orEmpty(req.body["icon"]);
        pubScript.iconbackground = withDefault(req.body["color"], "#FF7518");
        pubScript.platforms = orEmpty(req.body["platform"]).split(",");
        pubScript.islibrary = orEmpty(req.body["isLibrary"]) == "yes";
        pubScript.userplatform = getUserPlatforms(req);
        pubScript.capabilities = (<string[]>[]);
        pubScript.flows = (<string[]>[]);
        pubScript.editor = orEmpty(slotJson["editor"]);
        pubScript.iconArtId = req.body["iconArtId"];
        pubScript.splashArtId = req.body["splashArtId"];
        pubScript.meta = req.body["meta"];

        let jsb = {};
        jsb["currentBlob"] = pubVersion.baseSnapshot;
        await publishScriptCoreAsync(pubScript, jsb, body["script"], req);
        // 
        let slotBuilder = clone(slotJson);
        slotBuilder["status"] = "published";
        slotBuilder["scriptId"] = pubScript.id;
        slotBuilder["userId"] = pubScript.userid;
        delete slotBuilder["__etag"];
        let newSlot = clone(slotBuilder);
        await installSlotsTable.updateEntityAsync(newSlot, "merge");
        publishResult.bodies.push(headerFromSlot(newSlot));
        req.response = publishResult.toJson();
    }
}

async function resolveCommentsAsync(entities: indexedStore.FetchResult) : Promise<void>
{
    await addUsernameEtcAsync(entities);
    let coll = (<PubComment[]>[]);
    for (let jsb of entities.items) {
        let comment = PubComment.createFromJson(jsb["pub"]);
        coll.push(comment);
    }
    entities.items = td.arrayToJson(coll);
}

function getUserPlatforms(req: ApiRequest) : string[]
{
    let platforms: string[];
    if ( ! fullTD) {
        return (<string[]>[]);
    }
    return withDefault(req.queryOptions["user_platform"], "unknown").split(",");
    return platforms;
}

async function postCommentAsync(req: ApiRequest) : Promise<void>
{
    let baseKind = req.rootPub["kind"];
    if ( ! /^(comment|script|group|screenshot|channel)$/.test(baseKind)) {
        req.status = restify.http()._412PreconditionFailed;
    }
    else {
        let comment = new PubComment();
        comment.text = req.body["text"];
        comment.userplatform = getUserPlatforms(req);
        comment.userid = req.userid;
        comment.time = await nowSecondsAsync();
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
        await generateIdAsync(jsb, 10);
        await comments.insertAsync(jsb);
        await updateCommentCountersAsync(comment);
        await storeNotificationsAsync(req, jsb, "");
        await scanAndSearchAsync(jsb);
        // ### return comment back
        await returnOnePubAsync(comments, clone(jsb), req);
    }
}

async function addUsernameEtcAsync(entities: indexedStore.FetchResult) : Promise<void>
{
    let coll = await addUsernameEtcCoreAsync(entities.items);
    entities.items = td.arrayToJson(coll);
}

function increment(entry: JsonBuilder, counter: string, delta: number) : void
{
    let basePub = entry["pub"];
    if (basePub == null) {
        basePub = {};
        entry["pub"] = basePub;
        entry["kind"] = "reserved";
    }
    let x = basePub[counter];
    if (x == null) {
        x = 0;
    }
    basePub[counter] = x + delta;
}

function computeEtagOfJson(resp: JsonObject) : string
{
    let etag: string;
    let hash = crypto.createHash("md5");
    hash.update(JSON.stringify(resp), "utf8");
    etag = hash.digest().toString("base64");
    return etag;
}

async function setResolveAsync(store: indexedStore.Store, resolutionCallback: ResolutionCallback, options_0: IResolveOptions = {}) : Promise<void>
{
    let options_ = new ResolveOptions(); options_.load(options_0);
    if (options_.anonList) {
        options_.anonSearch = true;
    }
    (<DecoratedStore><any>store).myResolve = resolutionCallback;
    addRoute("GET", "*" + store.kind, "", async (req: ApiRequest) => {
        let fetchResult = store.singleFetchResult(req.rootPub);
        await (<DecoratedStore><any>store).myResolve(fetchResult, req);
        req.response = fetchResult.items[0];
        if (req.response == null) {
            req.status = restify.http()._402PaymentRequired;
        }
    });
    await store.createIndexAsync("all", entry => "all");
    let plural = store.kind + "s";
    if (plural == "arts") {
        plural = "art";
    }
    addRoute("GET", plural, "", async (req1: ApiRequest) => {
        let q = orEmpty(req1.queryOptions["q"]);
        if (q == "") {
            if ( ! options_.anonList) {
                checkPermission(req1, "global-list");
            }
            if (req1.status == 200) {
                await anyListAsync(store, req1, "all", "all");
            }
        }
        else {
            if ( ! options_.anonSearch) {
                checkPermission(req1, "global-list");
            }
            if (req1.status == 200) {
                await executeSearchAsync(store.kind, q, req1);
            }
        }
    });
    if (options_.byUserid) {
        // ### by posting user
        await store.createIndexAsync("userid", entry1 => entry1["pub"]["userid"]);
        let pubPlural = plural;
        if (pubPlural == "groups") {
            pubPlural = "owngroups";
        }
        addRoute("GET", "*user", pubPlural, async (req2: ApiRequest) => {
            await anyListAsync(store, req2, "userid", req2.rootId);
        });
    }
    if (options_.byPublicationid) {
        // ### by parent publication
        let pluralPub = plural;
        if (pluralPub == "subscriptions") {
            pluralPub = "subscribers";
        }
        if (pluralPub == "auditlogs") {
            pluralPub = "pubauditlogs";
        }
        await store.createIndexAsync("publicationid", entry2 => entry2["pub"]["publicationid"]);
        addRoute("GET", "*pub", pluralPub, async (req3: ApiRequest) => {
            if (req3.rootPub["kind"] == "group" && req3.rootPub["pub"]["isclass"]) {
                if (req3.userid == "") {
                    req3.status = restify.http()._401Unauthorized;
                }
                else if ( ! req3.userinfo.json["groups"].hasOwnProperty(req3.rootPub["id"])) {
                    checkPermission(req3, "global-list");
                }
            }
            if (req3.status == 200) {
                await anyListAsync(store, req3, "publicationid", req3.rootId);
            }
        });
    }
}

async function resolveReviewsAsync(entities: indexedStore.FetchResult) : Promise<void>
{
    await addUsernameEtcAsync(entities);
    let coll = (<PubReview[]>[]);
    for (let jsb of entities.items) {
        let review = PubReview.createFromJson(jsb["pub"]);
        coll.push(review);
    }
    entities.items = td.arrayToJson(coll);
}

async function getUserReviewedAsync(req: ApiRequest) : Promise<void>
{
    let pub = await pubsContainer.getAsync(req.argument);
    if (pub == null) {
        req.status = 404;
    }
    else {
        let id = pub["id"];
        if (pub["kind"] == "script") {
            id = pub["updateKey"];
        }
        let reviewPointer = await getPubAsync("r-" + id + "-" + req.rootId, "pubpointer");
        if (reviewPointer == null) {
            req.status = 404;
        }
        else {
            req.response = await getOnePubAsync(reviews, reviewPointer["pointer"], req);
            if (req.response == null) {
                req.status = 404;
            }
        }
    }
}

async function fetchAndResolveAsync(store: indexedStore.Store, req: ApiRequest, idxName: string, key: string) : Promise<indexedStore.FetchResult>
{
    let entities: indexedStore.FetchResult;
    entities = await store.getIndex(idxName).fetchAsync(key, req.queryOptions);
    await (<DecoratedStore><any>store).myResolve(entities, req);
    return entities;
}

async function postReviewAsync(req: ApiRequest) : Promise<void>
{
    let baseKind = req.rootPub["kind"];
    if ( ! /^(comment|script|channel)$/.test(baseKind)) {
        req.status = restify.http()._412PreconditionFailed;
    }
    else {
        let pubid = req.rootId;
        if (baseKind == "script") {
            pubid = req.rootPub["updateKey"];
        }

        let review = new PubReview();
        review.id = await reviews.generateIdAsync(10);
        review.userplatform = getUserPlatforms(req);
        review.userid = req.userid;
        review.time = await nowSecondsAsync();
        review.publicationid = req.rootId;
        review.publicationkind = baseKind;
        review.publicationname = orEmpty(req.rootPub["pub"]["name"]);
        review.publicationuserid = orEmpty(req.rootPub["pub"]["userid"]);
        review.ispositive = true;
        let jsb = await updateReviewCountsAsync(review, pubid, req);
        if (req.status == 200) {
            // ### return heart back
            await storeNotificationsAsync(req, jsb, "");
            await returnOnePubAsync(reviews, clone(jsb), req);
        }
    }
}

async function returnOnePubAsync(store: indexedStore.Store, obj: JsonObject, apiRequest: ApiRequest) : Promise<void>
{
    apiRequest.response = await resolveOnePubAsync(store, obj, apiRequest);
    if (apiRequest.response == null) {
        apiRequest.status = restify.http()._402PaymentRequired;
    }
}

async function getOnePubAsync(store: indexedStore.Store, id: string, apiRequest: ApiRequest) : Promise<JsonObject>
{
    let js: JsonObject;
    let obj = await getPubAsync(id, store.kind);
    if (obj == null) {
        js = obj;
    }
    else {
        js = await resolveOnePubAsync(store, obj, apiRequest);
    }
    return js;
}

async function generateIdAsync(jsb: JsonBuilder, minNameLength: number) : Promise<void>
{
    jsb["id"] = await comments.generateIdAsync(minNameLength);
}

async function resolveArtAsync(entities: indexedStore.FetchResult, req: ApiRequest) : Promise<void>
{
    await addUsernameEtcAsync(entities);
    let coll = (<PubArt[]>[]);

    for (let jsb of entities.items) {
        let pubArt = PubArt.createFromJson(jsb["pub"]);
        coll.push(pubArt);
        if (pubArt.flags == null) {
            pubArt.flags = (<string[]>[]);
        }
        let id = "/" + pubArt.id;
        pubArt.contenttype = jsb["contentType"];
        if (req.isUpgrade) {
            queueUpgradeTask(req, /* async */ redownloadArtAsync(jsb));
        }
        if (jsb["isImage"]) {
            pubArt.pictureurl = artContainer.url() + id;
            pubArt.thumburl = thumbContainers[0].container.url() + id;
            pubArt.mediumthumburl = thumbContainers[1].container.url() + id;
            pubArt.bloburl = pubArt.pictureurl;
            pubArt.arttype = "picture";
        }
        else if (! pubArt.arttype || pubArt.arttype == "sound") {
            pubArt.wavurl = artContainer.url() + id;
            if (orFalse(jsb["hasAac"])) {
                pubArt.aacurl = aacContainer.url() + id + ".m4a";
            }
            else {
                pubArt.aacurl = "";
            }
            pubArt.bloburl = withDefault(pubArt.aacurl, pubArt.wavurl);
            pubArt.arttype = "sound";
        }
        else {
            pubArt.bloburl = artContainer.url() + "/" + jsb["filename"];
        }
    }
    await awaitUpgradeTasksAsync(req);
    entities.items = td.arrayToJson(coll);
}

async function postArtAsync(req: ApiRequest) : Promise<void>
{
    let ext = getArtExtension(req.body["contentType"]);
    await canPostAsync(req, "art");
    checkPermission(req, "post-art-" + ext);
    if (req.status != 200) {
        return;
    }
    let pubArt = new PubArt();
    pubArt.name = orEmpty(req.body["name"]);
    pubArt.description = orEmpty(req.body["description"]);
    pubArt.userplatform = getUserPlatforms(req);
    pubArt.userid = req.userid;
    pubArt.time = await nowSecondsAsync();
    let jsb = {};
    jsb["pub"] = pubArt.toJson();
    logger.tick("PubArt");
    jsb["kind"] = "art";
    await postArt_likeAsync(req, jsb);
    if (jsb.hasOwnProperty("existing")) {
        await returnOnePubAsync(arts, clone(jsb["existing"]), req);
        return;
    }
    if (req.status == 200) {
        await arts.insertAsync(jsb);
        await storeNotificationsAsync(req, jsb, "");
        await upsertArtAsync(jsb);
        await scanAndSearchAsync(jsb, {
            skipSearch: true
        });
        // ### return art back
        await returnOnePubAsync(arts, clone(jsb), req);
    }
}

function getArtExtension(contentType: string) : string
{
    let ext: string;
    ext = orEmpty(artContentTypes[contentType]);
    return ext;
}

async function addThumbContainerAsync(size: number, name: string) : Promise<void>
{
    let thumbContainer2 = new ThumbContainer();
    thumbContainer2.size = size;
    thumbContainer2.name = name;
    thumbContainer2.container = await blobService.createContainerIfNotExistsAsync(thumbContainer2.name, "hidden");
    thumbContainers.push(thumbContainer2);
}

async function importCommentAsync(req: ApiRequest, body: JsonObject) : Promise<void>
{
    let comment = new PubComment();
    comment.fromJson(removeDerivedProperties(body));

    let jsb = {};
    jsb["pub"] = comment.toJson();
    jsb["id"] = comment.id;
    await comments.insertAsync(jsb);
    await scanAndSearchAsync(jsb, {
        skipScan: true
    });
    await updateCommentCountersAsync(comment);
}

/**
 * ### update comment count
 */
async function updateCommentCountersAsync(comment: PubComment) : Promise<void>
{
    await pubsContainer.updateAsync(comment.publicationid, async (entry: JsonBuilder) => {
        increment(entry, "comments", 1);
    });
}

async function importArtAsync(req: ApiRequest, body: JsonObject) : Promise<void>
{
    let pubArt = new PubArt();
    pubArt.fromJson(removeDerivedProperties(body));
    let contentType = "";
    let r = orEmpty(pubArt.pictureurl);
    if (r != "") {
        let wreq = td.createRequest(r);
        wreq.setMethod("head");
        let response = await wreq.sendAsync();
        if (response.statusCode() == 200) {
            contentType = response.header("content-type");
        }
        else {
            logger.error("cannot HEAD art resource: " + r);
            req.status = 404;
        }
    }
    else if (orEmpty(pubArt.wavurl) != "") {
        contentType = "audio/wav";
        r = pubArt.wavurl;
    }
    else {
        logger.error("bad art import: " + JSON.stringify(body));
        req.status = 500;
    }
    logger.debug("content type: " + contentType + " for " + pubArt.id);
    if (req.status == 200) {
        let jsb = {};
        jsb["pub"] = pubArt.toJson();
        jsb["id"] = pubArt.id;
        fixArtProps(contentType, jsb);
        // 
        let fn = pubArt.id;
        let result3 = await copyUrlToBlobAsync(artContainer, fn, r);
        if (result3 == null) {
            logger.error("cannot download art blob: " + JSON.stringify(pubArt.toJson()));
            req.status = 500;
        }
        else if ( ! result3.succeded()) {
            logger.error("cannot create art blob: " + JSON.stringify(pubArt.toJson()));
            req.status = 500;
        }
        else if (jsb["isImage"]) {
            let result4 = await copyUrlToBlobAsync(thumbContainers[0].container, fn, withDefault(pubArt.thumburl, r));
            let result5 = await copyUrlToBlobAsync(thumbContainers[1].container, fn, withDefault(pubArt.mediumthumburl, r));
            if (result5 == null || result4 == null) {
                logger.error("cannot download art blob thumb: " + JSON.stringify(pubArt.toJson()));
                req.status = 404;
            }
            else if ( ! result4.succeded() || ! result5.succeded()) {
                logger.error("cannot create art blob thumb: " + JSON.stringify(pubArt.toJson()));
                req.status = 500;
            }

        }
        else if (orEmpty(pubArt.aacurl) != "") {
            let result41 = await copyUrlToBlobAsync(aacContainer, pubArt.id + ".m4a", pubArt.aacurl);
            logger.debug("copy audio url OK for " + pubArt.id);
            if (result41 == null || ! result41.succeded()) {
                logger.error("cannot create art blob aac: " + JSON.stringify(pubArt.toJson()));
                req.status = 500;
            }
            else {
                jsb["hasAac"] = true;
            }
        }
        // 
        if (req.status == 200) {
            await arts.insertAsync(jsb);
            await upsertArtAsync(jsb);
            logger.debug("insert OK " + pubArt.id);
        }
    }
}

function fixArtProps(contentType: string, jsb: JsonBuilder) : void
{
    let ext = getArtExtension(contentType);
    jsb["ext"] = ext;
    jsb["contentType"] = contentType;
    let arttype = "blob";
    if (ext == "jpg" || ext == "png") {
        arttype = "picture";
    }
    else if (ext == "wav" || ext == "mp3" || ext == "aac") {
        arttype = "sound";
    }
    else if (ext == "js" || /^text\//.test(contentType)) {
        arttype = "text";
    }
    else if (ext == "mp4") {
        arttype = "video";
    }
    if (ext == "") {
        arttype = "";
    }
    jsb["isImage"] = arttype == "picture";
    jsb["arttype"] = arttype;
    jsb["pub"]["arttype"] = arttype;
}

async function insertScriptAsync(jsb: JsonBuilder, pubScript: PubScript, scriptText_: string, isImport: boolean) : Promise<void>
{
    pubScript.scripthash = sha256(scriptText_).substr(0, 32);
    jsb["pub"] = pubScript.toJson();
    // 
    let updateKey = sha256(pubScript.userid + ":" + pubScript.rootid + ":" + pubScript.name);
    let updateEntry = new UpdateEntry();
    updateEntry.PartitionKey = updateKey;
    updateEntry.pub = pubScript.id;
    updateEntry.time = pubScript.time;
    // 
    jsb["updateKey"] = updateKey;
    await scripts.insertAsync(jsb);
    updateEntry.RowKey = jsb["indexId"];
    // 
    let bodyBuilder = clone(pubScript.toJson());
    bodyBuilder["text"] = scriptText_;
    progress("publish - about to just insert");
    await scriptText.justInsertAsync(pubScript.id, bodyBuilder);
    // 
    let upslot = await getPubAsync(updateKey, "updateslot");
    if (upslot == null) {
        let jsb2 = {};
        jsb2["pub"] = ({ positivereviews: 0 });
        jsb2["id"] = updateKey;
        jsb2["id0"] = updateEntry.pub;
        jsb2["scriptId"] = updateEntry.pub;
        jsb2["scriptTime"] = updateEntry.time;
        progress("publish - about to update");
        await updateSlots.insertAsync(jsb2);
    }
    jsb["text"] = scriptText_;
    if ( ! pubScript.ishidden) {
        progress("publish - about to update insert");
        await updateSlotTable.insertEntityAsync(updateEntry.toJson(), "or merge");
        progress("publish - about to update insert2");
        await pubsContainer.updateAsync(updateKey, async (entry: JsonBuilder) => {
            if ( ! entry.hasOwnProperty("id0")) {
                entry["id0"] = withDefault(entry["scriptId"], updateEntry.pub);
            }
            entry["scriptId"] = updateEntry.pub;
            entry["scriptTime"] = updateEntry.time;
        });
    }
    await scanAndSearchAsync(jsb, {
        skipSearch: pubScript.ishidden,
        skipScan: isImport
    });
}

async function importScriptAsync(req: ApiRequest, body: JsonObject) : Promise<void>
{
    let pubScript = new PubScript();
    pubScript.fromJson(removeDerivedProperties(body));
    pubScript.screenshotthumburl = "";
    pubScript.iconurl = "";
    pubScript.screenshoturl = "";
    pubScript.capabilities = (<string[]>[]);
    pubScript.flows = (<string[]>[]);
    pubScript.toptagids = (<string[]>[]);
    pubScript.updateid = "";
    pubScript.updatetime = 0;
    pubScript.baseid = orEmpty(pubScript.baseid);
    pubScript.positivereviews = 0;
    pubScript.cumulativepositivereviews = 0;
    pubScript.screenshots = 0;
    if (pubScript.baseid == "" || pubScript.rootid == "") {
        pubScript.rootid = pubScript.id;
    }

    let jsb = {};
    jsb["id"] = pubScript.id;
    await insertScriptAsync(jsb, pubScript, body["text"], true);
}

async function importAnythingAsync(req: ApiRequest) : Promise<void>
{
    let coll = asArray(req.body);
    await parallel.forAsync(coll.length, async (x: number) => {
        let js = coll[x];
        let apiRequest = await importOneAnythingAsync(js);
        coll[x] = apiRequest.status;
    });
    req.response = td.arrayToJson(coll);
}

async function importUserAsync(req: ApiRequest, body: JsonObject) : Promise<void>
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

async function copyUrlToBlobAsync(Container: azureBlobStorage.Container, id: string, url: string) : Promise<azureBlobStorage.BlobInfo>
{
    let result3: azureBlobStorage.BlobInfo;
    url = td.replaceAll(url, "az31353.vo.msecnd.net", "touchdevelop.blob.core.windows.net");
    let dlFailure = false;
    for (let i = 0; i < 3; i++) {
        if (result3 == null && ! dlFailure) {
            let request = td.createRequest(url);
            if (i > 0) {
                request.setHeader("Connection", "close");
            }
            let task = /* async */ request.sendAsync();
            let response = await td.awaitAtMostAsync(task, 15);
            if (response == null) {
                logger.info("timeout downloading " + url);
            }
            else if (response.statusCode() == 200) {
                let buf = response.contentAsBuffer();
                result3 = await Container.createBlockBlobFromBufferAsync(id, buf, {
                    contentType: response.header("Content-type"),
                    timeoutIntervalInMs: 3000
                });
                let err = "";
                if ( ! result3.succeded()) {
                    err = " ERROR: " + result3.error();
                }
                if (false) {
                    logger.debug("copy url for " + Container.url() + "/" + id + err);
                }
            }
            else if (response.statusCode() == 404) {
                dlFailure = true;
            }
            else {
                logger.info("error downloading " + url + " status " + response.statusCode());
            }
        }
    }
    return result3;
}

function removeDerivedProperties(body: JsonObject) : JsonObject
{
    let body2: JsonObject;
    let jsb2 = clone(body);
    for (let fld of "username,url".split(",")) {
        jsb2[fld] = "";
    }
    for (let fld2 of "userscore,positivereviews,comments,subscribers".split(",")) {
        jsb2[fld2] = 0;
    }
    body = clone(jsb2);
    body2 = body;
    return body2;
}

async function importGroupAsync(req: ApiRequest, body: JsonObject) : Promise<void>
{
    let grp = new PubGroup();
    grp.fromJson(removeDerivedProperties(body));

    let jsb = {};
    jsb["pub"] = grp.toJson();
    jsb["id"] = grp.id;
    await groups.insertAsync(jsb);
    await scanAndSearchAsync(jsb, {
        skipScan: true
    });
}

async function importTagAsync(req: ApiRequest, body: JsonObject) : Promise<void>
{
    let grp = new PubGroup();
    grp.fromJson(removeDerivedProperties(body));

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

async function importScreenshotAsync(req: ApiRequest, body: JsonObject) : Promise<void>
{
    let screenshot = new PubScreenshot();
    screenshot.fromJson(removeDerivedProperties(body));
    let r = orEmpty(screenshot.pictureurl);
    let jsb = {};
    jsb["pub"] = screenshot.toJson();
    jsb["id"] = screenshot.id;
    fixArtProps("image/jpeg", jsb);
    // 
    let fn = screenshot.id;
    let result3 = await copyUrlToBlobAsync(artContainer, fn, r);
    if (result3 == null || ! result3.succeded()) {
        logger.error("cannot create ss blob: " + JSON.stringify(screenshot.toJson()));
        req.status = 500;
    }

    if (req.status == 200) {
        let result4 = await copyUrlToBlobAsync(thumbContainers[0].container, fn, withDefault(screenshot.thumburl, r));
        if (result4 == null) {
            logger.error("cannot download ssblob thumb: " + JSON.stringify(screenshot.toJson()));
            req.status = 404;
        }
        else if ( ! result4.succeded()) {
            logger.error("cannot create ssblob thumb: " + JSON.stringify(screenshot.toJson()));
            req.status = 500;
        }
    }
    // 
    if (req.status == 200) {
        await screenshots.insertAsync(jsb);
        logger.debug("insert OK " + screenshot.id);
        await updateScreenshotCountersAsync(screenshot);
    }
}

async function _initScriptsAsync() : Promise<void>
{
    updateSlots = await indexedStore.createStoreAsync(pubsContainer, "updateslot");
    scripts = await indexedStore.createStoreAsync(pubsContainer, "script");
    await setResolveAsync(scripts, async (fetchResult: indexedStore.FetchResult, apiRequest: ApiRequest) => {
        await resolveScriptsAsync(fetchResult, apiRequest, false);
    }
    , {
        byUserid: true,
        anonSearch: true
    });
    // ### all
    addRoute("GET", "language", "*", async (req: ApiRequest) => {
        await throttleAsync(req, "tdcompile", 20);
        if (req.status == 200) {
            let s = req.origUrl.replace(/^\/api\/language\//g, "");
            await forwardToCloudCompilerAsync(req, "language/" + s);
        }
    });
    addRoute("GET", "doctopics", "", async (req1: ApiRequest) => {
        let resp = await queryCloudCompilerAsync("doctopics");
        req1.response = resp["topicsExt"];
    });
    addRoute("GET", "*script", "*", async (req2: ApiRequest) => {
        let isTd = ! req2.rootPub["pub"]["editor"];
        if ( ! isTd) {
            req2.status = restify.http()._405MethodNotAllowed;
        }
        else {
            await throttleAsync(req2, "tdcompile", 20);
            if (req2.status == 200) {
                let path = req2.origUrl.replace(/^\/api\/[a-z]+\//g, "");
                await forwardToCloudCompilerAsync(req2, "q/" + req2.rootId + "/" + path);
            }
        }
    });
    addRoute("POST", "scripts", "", async (req3: ApiRequest) => {
        await canPostAsync(req3, "direct-script");
        if (req3.status == 200 && orEmpty(req3.body["text"]).length > 100000) {
            req3.status = restify.http()._413RequestEntityTooLarge;
        }

        let rawSrc = orEmpty(req3.body["raw"]);
        if (req3.status == 200 && rawSrc != "") {
            checkPermission(req3, "post-raw");
        }
        let forceid = orEmpty(req3.body["forceid"]);
        if (req3.status == 200 && forceid != "") {
            checkPermission(req3, "pub-mgmt");
        }

        if (req3.status == 200) {
            let scr = new PubScript();
            let entry3 = await getPubAsync(req3.body["baseid"], "script");
            if (entry3 != null) {
                scr.baseid = entry3["id"];
                scr.rootid = entry3["pub"]["rootid"];
            }
            scr.userid = req3.userid;
            scr.mergeids = (<string[]>[]);
            if (req3.body.hasOwnProperty("mergeids")) {
                scr.mergeids = td.toStringArray(req3.body["mergeids"]);
            }
            scr.name = withDefault(req3.body["name"], "unnamed");
            scr.description = orEmpty(req3.body["description"]);
            scr.iconbackground = withDefault(req3.body["iconbackground"], "#FF7518");
            scr.islibrary = orFalse(req3.body["islibrary"]);
            scr.ishidden = orFalse(req3.body["ishidden"]);
            scr.userplatform = getUserPlatforms(req3);
            scr.capabilities = (<string[]>[]);
            scr.flows = (<string[]>[]);
            scr.editor = orEmpty(req3.body["editor"]);
            scr.meta = req3.body["meta"];
            scr.iconArtId = req3.body["iconArtId"];
            scr.splashArtId = req3.body["splashArtId"];
            scr.raw = rawSrc;
            scr.unmoderated = ! callerHasPermission(req3, "adult");

            let jsb = {};
            if (forceid != "") {
                jsb["id"] = forceid;
            }
            await publishScriptCoreAsync(scr, jsb, req3.body["text"], req3);
            await returnOnePubAsync(scripts, clone(jsb), req3);
        }
    }
    , {
        sizeCheckExcludes: "text"
    });
    addRoute("POST", "*script", "", async (req4: ApiRequest) => {
        let unmod = req4.body["unmoderated"];
        if (unmod != null) {
            await checkFacilitatorPermissionAsync(req4, req4.rootPub["pub"]["userid"]);
            if (req4.status == 200) {
                await pubsContainer.updateAsync(req4.rootId, async (entry: JsonBuilder) => {
                    entry["pub"]["unmoderated"] = unmod;
                });
                if ( ! unmod) {
                    await sendNotificationAsync(req4.rootPub, "moderated", (<JsonObject>null));
                }
                req4.response = ({});
            }
        }
        else {
            req4.status = restify.http()._400BadRequest;
        }
    });
    addRoute("POST", "*script", "meta", async (req5: ApiRequest) => {
        if ( ! callerHasPermission(req5, "script-promo")) {
            checkPubPermission(req5);
        }
        await canPostAsync(req5, "script-meta");
        if (req5.status == 200) {
            await pubsContainer.updateAsync(req5.rootId, async (v: JsonBuilder) => {
                let meta = v["pub"]["meta"];
                if (meta == null) {
                    meta = {};
                }
                else {
                    meta = clone(meta);
                }
                copyJson(req5.body, meta);
                for (let k of Object.keys(meta)) {
                    if (meta[k] === null) {
                        delete meta[k];
                    }
                }
                if (JSON.stringify(meta).length > 10000) {
                    req5.status = restify.http()._413RequestEntityTooLarge;
                }
                else {
                    v["pub"]["meta"] = meta;
                    req5.response = clone(meta);
                }
            });
            if (req5.rootPub["promo"] != null) {
                await flushApiCacheAsync("promo");
            }
        }
    });
    addRoute("GET", "*script", "text", async (req6: ApiRequest) => {
        if (await canSeeRootpubScriptAsync(req6)) {
            let entry2 = await scriptText.getAsync(req6.rootId);
            req6.response = entry2["text"];
        }
        else {
            req6.status = restify.http()._402PaymentRequired;
        }
    });
    addRoute("GET", "*script", "canexportapp", async (req7: ApiRequest) => {
        req7.response = ({ canExport: false, reason: "App export not supported in Lite." });
    });
    addRoute("GET", "*script", "base", async (req8: ApiRequest) => {
        let baseId = req8.rootPub["pub"]["baseid"];
        if (baseId == "") {
            req8.status = 404;
        }
        else {
            req8.response = await getOnePubAsync(scripts, baseId, req8);
            if (req8.response == null) {
                req8.status = 404;
            }
        }
    });

    addRoute("GET", "showcase-scripts", "", async (req9: ApiRequest) => {
        if (Date.now() - lastShowcaseDl.getTime() > 20000) {
            let js = await td.downloadJsonAsync("https://tdshowcase.blob.core.windows.net/export/current.json");
            showcaseIds = td.toStringArray(js["ids"]) || [];
            lastShowcaseDl = new Date();
        }
        let entities = await scripts.fetchFromIdListAsync(showcaseIds, req9.queryOptions);
        await (<DecoratedStore><any>scripts).myResolve(entities, req9);
        buildListResponse(entities, req9);
    });
    aliasRoute("GET", "featured-scripts", "showcase-scripts");
    aliasRoute("GET", "new-scripts", "scripts");
    aliasRoute("GET", "top-scripts", "scripts");
    // ### by base
    await scripts.createIndexAsync("baseid", entry1 => withDefault(entry1["pub"]["baseid"], "-"));
    addRoute("GET", "*script", "successors", async (req10: ApiRequest) => {
        await anyListAsync(scripts, req10, "baseid", req10.rootId);
    });
    await scripts.createIndexAsync("scripthash", entry4 => entry4["pub"]["scripthash"]);
    addRoute("GET", "scripthash", "*", async (req11: ApiRequest) => {
        await anyListAsync(scripts, req11, "scripthash", req11.verb);
    });
    await scripts.createIndexAsync("updatekey", entry5 => entry5["updateKey"]);
    addRoute("GET", "*script", "updates", async (req12: ApiRequest) => {
        await anyListAsync(scripts, req12, "updatekey", req12.rootPub["updateKey"]);
    });
    await scripts.createIndexAsync("rootid", entry6 => entry6["pub"]["rootid"]);
    addRoute("GET", "*script", "family", async (req13: ApiRequest) => {
        await anyListAsync(scripts, req13, "rootid", req13.rootPub["pub"]["rootid"]);
    });
    addRoute("GET", "*script", "cardinfo", async (req14: ApiRequest) => {
        let jsb1 = await getCardInfoAsync(req14, req14.rootPub);
        req14.response = clone(jsb1);
    });
    addRoute("POST", "admin", "reindexscripts", async (req15: ApiRequest) => {
        checkPermission(req15, "operator");
        if (req15.status == 200) {
            /* async */ scripts.getIndex("all").forAllBatchedAsync("all", 50, async (json: JsonObject) => {
                await parallel.forJsonAsync(json, async (json1: JsonObject) => {
                    let pub = json1["pub"];
                    let r = orFalse(pub["noexternallinks"]);
                    if ( ! r) {
                        let userjson = await getPubAsync(pub["userid"], "user");
                        if ( ! hasPermission(userjson, "external-links")) {
                            logger.debug("noexternallink -> true on " + json1["id"]);
                            await scripts.container.updateAsync(json1["id"], async (entry7: JsonBuilder) => {
                                entry7["pub"]["noexternallinks"] = true;
                            });
                        }
                    }
                });
            });
            req15.response = ({});
        }
    });
}

async function _initCommentsAsync() : Promise<void>
{
    comments = await indexedStore.createStoreAsync(pubsContainer, "comment");
    await setResolveAsync(comments, async (fetchResult: indexedStore.FetchResult, apiRequest: ApiRequest) => {
        await resolveCommentsAsync(fetchResult);
    }
    , {
        byUserid: true,
        byPublicationid: true
    });
    addRoute("POST", "*pub", "comments", async (req: ApiRequest) => {
        await canPostAsync(req, "comment");
        if (req.status == 200) {
            await postCommentAsync(req);
        }
    });
    addRoute("GET", "*pub", "comments", async (req1: ApiRequest) => {
        if (req1.status == 200) {
            // optimize the no-comments case
            if (orZero(req1.rootPub["pub"]["comments"]) == 0) {
                req1.response = ({"continuation":"","items":[],"kind":"list"});
            }
            else {
                await anyListAsync(comments, req1, "publicationid", req1.rootId);
            }
        }
    });
}

async function _initGroupsAsync() : Promise<void>
{
    groups = await indexedStore.createStoreAsync(pubsContainer, "group");
    await setResolveAsync(groups, async (fetchResult: indexedStore.FetchResult, apiRequest: ApiRequest) => {
        let hasGlobalList = callerHasPermission(apiRequest, "global-list");
        if ( ! hasGlobalList && apiRequest.userid == "") {
            fetchResult.items = ([]);
            return;
        }
        await addUsernameEtcAsync(fetchResult);
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
    addRoute("POST", "groups", "", async (req: ApiRequest) => {
        await canPostAsync(req, "group");
        if (req.status == 200) {
            let js2 = req.userinfo.json["settings"];
            if ( ! js2["emailverified"]) {
                req.status = restify.http()._405MethodNotAllowed;
            }
        }
        if (req.status == 200) {
            let body = req.body;
            let group = new PubGroup();
            group.name = withDefault(body["name"], "unnamed");
            group.isclass = orFalse(body["isclass"]);
            setGroupProps(group, body);
            group.userid = req.userid;
            group.userplatform = getUserPlatforms(req);
            group.isrestricted = true;
            let jsb1 = {};
            jsb1["pub"] = group.toJson();
            await generateIdAsync(jsb1, 8);
            await groups.insertAsync(jsb1);
            await auditLogAsync(req, "create-group", {
                subjectid: req.userid,
                publicationid: jsb1["id"],
                publicationkind: "group",
                newvalue: clone(jsb1)
            });
            await addUserToGroupAsync(group.userid, clone(jsb1), (<ApiRequest>null));
            await storeNotificationsAsync(req, jsb1, "");
            await scanAndSearchAsync(jsb1);
            // re-fetch user to include new permission
            await setReqUserIdAsync(req, req.userid);
            await returnOnePubAsync(groups, clone(jsb1), req);
        }
    });
    addRoute("POST", "*group", "", async (req1: ApiRequest) => {
        checkGroupPermission(req1);
        if (req1.status == 200) {
            let needsReindex = false;
            let user = orEmpty(req1.body["userid"]);
            if (user == req1.rootPub["pub"]["userid"]) {
                user = "";
            }
            if (user != "") {
                let newOwner = await getPubAsync(user, "user");
                if (newOwner == null || ! hasPermission(newOwner, "post-group") || ! newOwner["groups"].hasOwnProperty(req1.rootId)) {
                    req1.status = restify.http()._412PreconditionFailed;
                    return;
                }
                await groups.reindexAsync(req1.rootId, async (v: JsonBuilder) => {
                    v["pub"]["userid"] = user;
                });
                await reindexGroupsAsync(newOwner);
                await reindexGroupsAsync(req1.userinfo.json);
            }
            await updateAndUpsertAsync(pubsContainer, req1, async (entry: JsonBuilder) => {
                let group1 = PubGroup.createFromJson(clone(entry["pub"]));
                setGroupProps(group1, req1.body);
                entry["pub"] = group1.toJson();
            });
            req1.response = ({});
        }
    });
    addRoute("GET", "*group", "code", async (req2: ApiRequest) => {
        checkGroupPermission(req2);
        if (req2.status == 200) {
            let s = orEmpty(req2.rootPub["code"]);
            let jsb2 = {};
            jsb2["code"] = s;
            jsb2["expiration"] = await nowSecondsAsync() + 365 * 24 * 3600;
            req2.response = clone(jsb2);
        }
    });
    addRoute("GET", "*user", "code", async (req3: ApiRequest) => {
        let passId = normalizeAndHash(req3.argument);
        let codeObj = await passcodesContainer.getAsync(passId);
        if (codeObj == null || codeObj["kind"] == "reserved") {
            req3.status = restify.http()._404NotFound;
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
                    jsb3["credit"] = orZero(codeObj["singlecredit"]);
                }
            }
            else if (kind == "groupinvitation") {
                jsb3["verb"] = "JoinGroup";
                jsb3["data"] = codeObj["groupid"];
            }
            if (jsb3.hasOwnProperty("verb")) {
                req3.response = clone(jsb3);
            }
            else {
                req3.status = restify.http()._404NotFound;
            }
        }
    });
    addRoute("GET", "*group", "approvals", async (req4: ApiRequest) => {
        checkGroupPermission(req4);
        if (req4.status == 200) {
            let js = req4.rootPub["approvals"];
            if (js == null) {
                js = ([]);
            }
            req4.response = js;
        }
    });
    addRoute("POST", "*user", "code", async (req5: ApiRequest) => {
        meOnly(req5);
        if (req5.status == 200) {
            let passId1 = normalizeAndHash(req5.argument);
            let codeObj1 = await passcodesContainer.getAsync(passId1);
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
                        req5.status = restify.http()._409Conflict;
                    }
                    else if (codeObj1["credit"] > 0) {
                        await applyCodeAsync(req5.rootPub, codeObj1, passId1, req5);
                        req5.response = ({});
                    }
                    else {
                        req5.status = restify.http()._409Conflict;
                    }
                }
                else if (kind1 == "groupinvitation") {
                    let groupJson = await getPubAsync(codeObj1["groupid"], "group");
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
    addRoute("POST", "*group", "code", async (req6: ApiRequest) => {
        checkGroupPermission(req6);
        if (req6.status == 200) {
            let grCode = orEmpty(req6.rootPub["code"]);
            if (grCode != "") {
                await passcodesContainer.updateAsync(normalizeAndHash(grCode), async (entry1: JsonBuilder) => {
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
            let hashed = normalizeAndHash(grCode);
            await passcodesContainer.updateAsync(hashed, async (entry2: JsonBuilder) => {
                entry2["kind"] = "groupinvitation";
                entry2["groupid"] = req6.rootId;
                entry2["time"] = await nowSecondsAsync();
            });
            await pubsContainer.updateAsync(req6.rootId, async (entry3: JsonBuilder) => {
                entry3["code"] = grCode;
            });
            req6.response = ({});
        }
    });
    addRoute("DELETE", "*group", "code", async (req7: ApiRequest) => {
        checkGroupPermission(req7);
        if (req7.status == 200) {
            let s1 = normalizeAndHash(req7.rootPub["code"]);
            if (s1 == "") {
                req7.status = 404;
            }
            else {
                await passcodesContainer.updateAsync(s1, async (entry4: JsonBuilder) => {
                    entry4["kind"] = "reserved";
                });
                await pubsContainer.updateAsync(req7.rootId, async (entry5: JsonBuilder) => {
                    delete entry5["code"];
                });
                req7.response = ({});
            }
        }
    });
    groupMemberships = await indexedStore.createStoreAsync(pubsContainer, "groupmembership");
    await setResolveAsync(groupMemberships, async (fetchResult1: indexedStore.FetchResult, apiRequest1: ApiRequest) => {
        if (apiRequest1.userid == "") {
            fetchResult1.items = ([]);
            return;
        }
        let grps1 = apiRequest1.userinfo.json["groups"];
        let hasGlobalList1 = callerHasPermission(apiRequest1, "global-list");

        let field = "publicationid";
        let store = groups;
        if (apiRequest1.verb == "users") {
            field = "userid";
            store = users;
        }
        if ( ! hasGlobalList1) {
            fetchResult1.items = td.arrayToJson(asArray(fetchResult1.items).filter(elt => grps1.hasOwnProperty(elt["pub"]["publicationid"])));
        }
        let pubs = await followPubIdsAsync(fetchResult1.items, field, store.kind);
        fetchResult1.items = td.arrayToJson(pubs);
        await (<DecoratedStore><any>store).myResolve(fetchResult1, apiRequest1);
    });
    await groupMemberships.createIndexAsync("userid", entry6 => entry6["pub"]["userid"]);
    addRoute("POST", "admin", "reindexgroups", async (req8: ApiRequest) => {
        checkPermission(req8, "operator");
        if (req8.status == 200) {
            /* async */ users.getIndex("all").forAllBatchedAsync("all", 20, async (json: JsonObject) => {
                await parallel.forJsonAsync(json, async (json1: JsonObject) => {
                    await reindexGroupsAsync(json1);
                });
            });
            req8.response = ({});
        }
    });
    addRoute("GET", "*user", "groups", async (req9: ApiRequest) => {
        if (req9.argument == "") {
            await anyListAsync(groupMemberships, req9, "userid", req9.rootId);
        }
        else {
            let entry21 = await getPubAsync(req9.argument, "group");
            if (entry21 == null) {
                req9.status = 404;
            }
            else {
                let s2 = "gm-" + req9.rootId + "-" + entry21["id"];
                let entry31 = await getPubAsync(s2, "groupmembership");
                if (entry31 == null) {
                    req9.status = 404;
                }
                else {
                    await returnOnePubAsync(groupMemberships, entry31, req9);
                }
            }
        }
    });
    addRoute("POST", "*user", "groups", async (req10: ApiRequest) => {
        let entry22 = await getPubAsync(req10.argument, "group");
        if (entry22 == null) {
            req10.status = 404;
        }
        else {
            let gr = PubGroup.createFromJson(entry22["pub"]);
            let askedToJoin = jsonArrayIndexOf(entry22["approvals"], req10.rootId) >= 0;
            if (askedToJoin && gr.isclass && withDefault(gr.userid, "???") == req10.userid) {
                // OK, this is an approval.
                if (orFalse(req10.rootPub["awaiting"])) {
                    await auditLogAsync(req10, "approve-user", {
                        subjectid: req10.rootId,
                        publicationid: gr.id,
                        publicationkind: "group"
                    });
                    await pubsContainer.updateAsync(req10.rootId, async (entry7: JsonBuilder) => {
                        delete entry7["awaiting"];
                    });
                }
                await pubsContainer.updateAsync(gr.id, async (entry8: JsonBuilder) => {
                    let jsb4 = entry8["approvals"];
                    let idx = jsonArrayIndexOf(clone(jsb4), req10.rootId);
                    if (idx >= 0) {
                        jsb4.removeAt(idx);
                    }
                });
                await sendNotificationAsync(entry22, "groupapproved", req10.rootPub);
            }
            else {
                meOnly(req10);
                if (gr.isrestricted) {
                    checkPermission(req10, "user-mgmt");
                }
            }
            if (req10.status == 200) {
                await addUserToGroupAsync(req10.rootId, entry22, req10);
                req10.response = ({});
            }
        }
    });
    addRoute("DELETE", "*user", "groups", async (req11: ApiRequest) => {
        let entry23 = await getPubAsync(req11.argument, "group");
        if (entry23 == null) {
            req11.status = 404;
        }
        else {
            let grid = entry23["id"];
            meOnly(req11);
            if (req11.status == 200 && req11.rootId == entry23["pub"]["userid"]) {
                // Cannot remove self from the group.
                req11.status = restify.http()._412PreconditionFailed;
            }
            if (req11.status == 200) {
                let memid = "gm-" + req11.rootId + "-" + grid;
                let entry41 = await getPubAsync(memid, "groupmembership");
                if (entry41 == null) {
                    req11.status = 404;
                }
                else {
                    let delok = await deleteAsync(entry41);
                    await pubsContainer.updateAsync(req11.rootId, async (entry9: JsonBuilder) => {
                        delete setBuilderIfMissing(entry9, "groups")[grid];
                    });
                    await auditLogAsync(req11, "leave-group", {
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
    addRoute("GET", "*group", "users", async (req12: ApiRequest) => {
        await anyListAsync(groupMemberships, req12, "publicationid", req12.rootId);
    });
}

async function _initTagsAsync() : Promise<void>
{
    tags2 = await indexedStore.createStoreAsync(pubsContainer, "tag");
    await setResolveAsync(tags2, async (fetchResult: indexedStore.FetchResult, apiRequest: ApiRequest) => {
        resolveTags(fetchResult);
    });
    addRoute("GET", "*script", "tags", async (req: ApiRequest) => {
        req.response = ({ "items": [] });
    });
}

async function _initArtAsync() : Promise<void>
{
    artContentTypes = ({ 
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/svg+xml": "svg",
  "audio/wav": "wav",
  "text/css": "css",
  "application/javascript": "js",
  "text/plain": "txt",
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "video/mp4": "mp4",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx"
}
);
    arts = await indexedStore.createStoreAsync(pubsContainer, "art");
    await setResolveAsync(arts, async (fetchResult: indexedStore.FetchResult, apiRequest: ApiRequest) => {
        await resolveArtAsync(fetchResult, apiRequest);
    }
    , {
        byUserid: true,
        anonSearch: true
    });
    addRoute("POST", "art", "", async (req: ApiRequest) => {
        await postArtAsync(req);
    }
    , {
        sizeCheckExcludes: "content"
    });
    addRoute("GET", "*script", "art", async (req1: ApiRequest) => {
        // TODO implement /<scriptid>/art
        req1.response = ({ "items": [] });
    });
    await arts.createIndexAsync("filehash", entry => orEmpty(entry["pub"]["filehash"]));
    addRoute("GET", "arthash", "*", async (req2: ApiRequest) => {
        await anyListAsync(arts, req2, "filehash", req2.verb);
    });
}

async function _initScreenshotsAsync() : Promise<void>
{
    screenshots = await indexedStore.createStoreAsync(pubsContainer, "screenshot");
    await setResolveAsync(screenshots, async (fetchResult: indexedStore.FetchResult, apiRequest: ApiRequest) => {
        await resolveScreenshotAsync(fetchResult, apiRequest);
    }
    , {
        byUserid: true,
        byPublicationid: true
    });
    addRoute("POST", "screenshots", "", async (req: ApiRequest) => {
        await canPostAsync(req, "screenshot");
        if (req.status == 200) {
            await postScreenshotAsync(req);
        }
    }
    , {
        sizeCheckExcludes: "content"
    });
}

async function _initReviewsAsync() : Promise<void>
{
    reviews = await indexedStore.createStoreAsync(pubsContainer, "review");
    await setResolveAsync(reviews, async (fetchResult: indexedStore.FetchResult, apiRequest: ApiRequest) => {
        await resolveReviewsAsync(fetchResult);
    }
    , {
        byUserid: true
    });
    // ### by parent publication
    await reviews.createIndexAsync("pubid", entry => entry["pubid"]);
    addRoute("GET", "*pub", "reviews", async (req: ApiRequest) => {
        let id = req.rootId;
        if (req.rootPub["kind"] == "script") {
            id = withDefault(req.rootPub["updateKey"], id);
        }
        await anyListAsync(reviews, req, "pubid", id);
    });
    // ### by author of publication getting heart (not in TD)
    await reviews.createIndexAsync("publicationuserid", entry1 => entry1["pub"]["publicationuserid"]);
    addRoute("GET", "*user", "receivedreviews", async (req1: ApiRequest) => {
        await anyListAsync(reviews, req1, "publicationuserid", req1.rootId);
    });
    addRoute("GET", "*user", "reviewed", async (req2: ApiRequest) => {
        await getUserReviewedAsync(req2);
    });
    addRoute("POST", "*pub", "reviews", async (req3: ApiRequest) => {
        await canPostAsync(req3, "review");
        if (req3.status == 200) {
            await postReviewAsync(req3);
        }
    });
    addRoute("DELETE", "*review", "", async (req4: ApiRequest) => {
        if (await deleteReviewAsync(req4.rootPub)) {
            req4.response = ({});
        }
        else {
            req4.status = restify.http()._409Conflict;
        }
    });
}

async function _initUsersAsync() : Promise<void>
{
    users = await indexedStore.createStoreAsync(pubsContainer, "user");
    await setResolveAsync(users, async (fetchResult: indexedStore.FetchResult, apiRequest: ApiRequest) => {
        resolveUsers(fetchResult, apiRequest);
    });
    await users.createIndexAsync("seconadaryid", entry => orEmpty(entry["secondaryid"]));
    addRoute("GET", "secondaryid", "*", async (req: ApiRequest) => {
        checkPermission(req, "user-mgmt");
        if (req.status == 200) {
            await anyListAsync(users, req, "secondaryid", req.verb);
        }
    });
    // ### all
    addRoute("POST", "*user", "permissions", async (req1: ApiRequest) => {
        checkMgmtPermission(req1, "user-mgmt");
        if (req1.status == 200) {
            let perm = req1.body["permissions"];
            if (perm != null) {
                perm = normalizePermissions(perm);
                checkPermission(req1, "root");
                if (req1.status != 200) {
                    return;
                }
                await auditLogAsync(req1, "set-perm", {
                    data: perm
                });
                if (isAlarming(perm)) {
                    await auditLogAsync(req1, "set-perm-high", {
                        data: perm
                    });
                }
                await updateAndUpsertAsync(pubsContainer, req1, async (entry1: JsonBuilder) => {
                    entry1["permissions"] = perm;
                    await sendPermissionNotificationAsync(req1, entry1);
                });
            }
            let credit = req1.body["credit"];
            if (credit != null) {
                await auditLogAsync(req1, "set-credit", {
                    data: credit.toString()
                });
                await updateAndUpsertAsync(pubsContainer, req1, async (entry2: JsonBuilder) => {
                    entry2["credit"] = credit;
                    entry2["totalcredit"] = credit;
                });
            }
            req1.response = ({});
        }
    });
    addRoute("GET", "*user", "permissions", async (req2: ApiRequest) => {
        checkMgmtPermission(req2, "user-mgmt");
        if (req2.status == 200) {
            let jsb = {};
            for (let s of "permissions,login".split(",")) {
                jsb[s] = orEmpty(req2.rootPub[s]);
            }
            for (let s1 of "credit,totalcredit,lastlogin".split(",")) {
                jsb[s1] = orZero(req2.rootPub[s1]);
            }
            req2.response = clone(jsb);
        }
    });
    addRoute("POST", "logout", "", async (req3: ApiRequest) => {
        if (req3.userid != "") {
            if (req3.body["everywhere"]) {
                let entities = await tokensTable.createQuery().partitionKeyIs(req3.userid).fetchAllAsync();
                await parallel.forAsync(entities.length, async (x: number) => {
                    let json = entities[x];
                    // TODO: filter out reason=admin?
                    let token = Token.createFromJson(json);
                    await tokensTable.deleteEntityAsync(token.toJson());
                    await redisClient.setpxAsync("tok:" + tokenString(token), "", 500);
                });
            }
            else {
                await tokensTable.deleteEntityAsync(req3.userinfo.token.toJson());
                await redisClient.setpxAsync("tok:" + tokenString(req3.userinfo.token), "", 500);
            }
            req3.response = ({});
            req3.headers = {};
            let s4 = wrapAccessTokenCookie("logout").replace(/Dec 9999/g, "Dec 1971");
            req3.headers["Set-Cookie"] = s4;
        }
        else {
            req3.status = restify.http()._401Unauthorized;
        }
    });
    // This is for test users for load testing nd doe **system accounts**
    addRoute("POST", "users", "", async (req4: ApiRequest) => {
        checkPermission(req4, "root");
        if (req4.status == 200) {
            let opts = req4.body;
            let pubUser = new PubUser();
            pubUser.name = withDefault(opts["name"], "Dummy" + td.randomInt(100000));
            pubUser.about = withDefault(opts["about"], "");
            pubUser.time = await nowSecondsAsync();
            let jsb1 = {};
            jsb1["pub"] = pubUser.toJson();
            jsb1["settings"] = ({});
            jsb1["permissions"] = ",preview,";
            jsb1["secondaryid"] = cachedStore.freshShortId(12);
            if (false) {
                jsb1["password"] = hashPassword("", opts["password"]);
            }
            await generateIdAsync(jsb1, 4);
            await users.insertAsync(jsb1);
            let pass2 = wordPassword.generate();
            req4.rootId = jsb1["id"];
            req4.rootPub = clone(jsb1);
            await setPasswordAsync(req4, pass2, "");
            let jsb3 = clone(await resolveOnePubAsync(users, req4.rootPub, req4));
            jsb3["password"] = pass2;
            req4.response = clone(jsb3);
        }
    });
    addRoute("POST", "*user", "addauth", async (req5: ApiRequest) => {
        let tokenJs = req5.userinfo.token;
        if (orEmpty(req5.body["key"]) != tokenSecret) {
            req5.status = restify.http()._403Forbidden;
        }
        else if (tokenJs == null) {
            req5.status = restify.http()._404NotFound;
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
                req5.status = restify.http()._400BadRequest;
            }
        }
    });
    addRoute("POST", "*user", "swapauth", async (req6: ApiRequest) => {
        checkPermission(req6, "root");
        if (req6.status != 200) {
            return;
        }
        if (req6.rootId == req6.argument) {
            req6.status = restify.http()._412PreconditionFailed;
            return;
        }
        let otherUser = await getPubAsync(req6.argument, "user");
        if (otherUser == null) {
            req6.status = restify.http()._404NotFound;
            return;
        }
        let rootPassId = req6.rootPub["login"];
        let rootPass = await passcodesContainer.getAsync(rootPassId);
        let otherPassId = otherUser["login"];
        let otherPass = await passcodesContainer.getAsync(otherPassId);
        if (rootPass == null || otherPass == null) {
            req6.status = restify.http()._424FailedDependency;
            return;
        }
        await passcodesContainer.updateAsync(rootPassId, async (entry4: JsonBuilder) => {
            entry4["userid"] = otherUser["id"];
        });
        await passcodesContainer.updateAsync(otherPassId, async (entry5: JsonBuilder) => {
            entry5["userid"] = req6.rootId;
        });
        await pubsContainer.updateAsync(req6.rootId, async (entry6: JsonBuilder) => {
            entry6["login"] = otherPassId;
        });
        await pubsContainer.updateAsync(otherUser["id"], async (entry7: JsonBuilder) => {
            entry7["login"] = rootPassId;
        });
        let jsb4 = {};
        jsb4["oldrootpass"] = rootPass;
        jsb4["oldotherpass"] = otherPass;
        req6.response = clone(jsb4);
    });
    addRoute("POST", "*user", "token", async (req7: ApiRequest) => {
        checkPermission(req7, "signin-" + req7.rootId);
        if (req7.status == 200) {
            let resp = {};
            let [customToken, cookie] = await generateTokenAsync(req7.rootId, "admin", "webapp2");
            if (cookie != "") {
                if (req7.headers == null) {
                    req7.headers = {};
                }
                req7.headers["Set-Cookie"] = wrapAccessTokenCookie(cookie);
            }
            else {
                assert(false, "no cookie in token");
            }
            await auditLogAsync(req7, "signin-as", {
                data: sha256(customToken).substr(0, 10)
            });
            resp["token"] = customToken;
            req7.response = clone(resp);
        }
    });
    addRoute("DELETE", "*user", "", async (req8: ApiRequest) => {
        await checkDeletePermissionAsync(req8);
        // Level4 users cannot be deleted; you first have to downgrade their permissions.
        if (req8.status == 200 && hasPermission(req8.rootPub, "level4")) {
            req8.status = restify.http()._402PaymentRequired;
        }
        if (req8.status == 200) {
            let resQuery = installSlotsTable.createQuery().partitionKeyIs(req8.rootId);
            await parallel.forJsonAsync(await resQuery.fetchAllAsync(), async (json1: JsonObject) => {
                await deleteHistoryAsync(req8, json1["RowKey"]);
            });
            await deleteAllByUserAsync(comments, req8.rootId, req8);
            await deleteAllByUserAsync(arts, req8.rootId, req8);
            await deleteAllByUserAsync(scripts, req8.rootId, req8);
            await deleteAllByUserAsync(pointers, req8.rootId, req8);
            await deleteAllByUserAsync(screenshots, req8.rootId, req8);
            await deleteAllByUserAsync(reviews, req8.rootId, req8);
            // TODO We leave groups alone - rethink.
            // Bugs, releases, etc just stay
            let delok = await deleteAsync(req8.rootPub);
            await auditLogAsync(req8, "delete", {
                oldvalue: req8.rootPub
            });
            req8.response = ({ "msg": "have a nice life" });
        }
    });
    addRoute("GET", "*user", "resetpassword", async (req9: ApiRequest) => {
        await checkFacilitatorPermissionAsync(req9, req9.rootId);
        if (req9.status == 200) {
            let jsb2 = {};
            let coll2 = td.range(0, 10).map<string>(elt => wordPassword.generate());
            jsb2["passwords"] = td.arrayToJson(coll2);
            req9.response = clone(jsb2);
        }
    });
    addRoute("POST", "*user", "resetpassword", async (req10: ApiRequest) => {
        await checkFacilitatorPermissionAsync(req10, req10.rootId);
        if (req10.status == 200) {
            let pass = orEmpty(req10.body["password"]);
            let prevPass = orEmpty(req10.rootPub["login"]);
            if (pass.length < 10) {
                req10.status = restify.http()._412PreconditionFailed;
            }
            else if ( ! td.startsWith(prevPass, "code/")) {
                req10.status = restify.http()._405MethodNotAllowed;
            }
            else {
                await setPasswordAsync(req10, pass, prevPass);
            }
        }
    });
    addRoute("POST", "updatecodes", "", async (req11: ApiRequest) => {
        checkPermission(req11, "root");
        if (req11.status != 200) {
            return;
        }
        let codes = req11.body["codes"];
        await parallel.forBatchedAsync(codes.length, 50, async (x1: number) => {
            let s5 = td.toString(codes[x1]);
            await passcodesContainer.updateAsync(normalizeAndHash(s5), async (entry8: JsonBuilder) => {
                assert(td.stringContains(entry8["permissions"], ","), "");
                entry8["permissions"] = req11.body["permissions"];
            });
        }
        , async () => {
        });
        req11.response = ({});
    });
    addRoute("POST", "generatecodes", "", async (req12: ApiRequest) => {
        let perm1 = normalizePermissions(req12.body["permissions"]);
        let grps = orEmpty(req12.body["groups"]);
        let addperm = "";
        if (grps != "") {
            addperm = ",user-mgmt";
        }
        if (perm1 == "") {
            perm1 = "educator";
        }
        if (isAlarming(perm1)) {
            req12.status = restify.http()._402PaymentRequired;
        }
        let numCodes = req12.body["count"];
        if (numCodes > 1000) {
            req12.status = restify.http()._413RequestEntityTooLarge;
        }
        checkPermission(req12, "gen-code," + perm1 + addperm);
        if (req12.status == 200) {
            let coll = (<string[]>[]);
            let credit1 = req12.body["credit"];
            await auditLogAsync(req12, "generatecodes", {
                data: numCodes + "x" + credit1 + perm1,
                newvalue: req12.body
            });
            await parallel.forAsync(numCodes, async (x2: number) => {
                let id = cachedStore.freshShortId(12);
                if (req12.body.hasOwnProperty("code")) {
                    id = req12.body["code"];
                }
                let s3 = normalizeAndHash(id);
                await passcodesContainer.updateAsync(s3, async (entry9: JsonBuilder) => {
                    entry9["kind"] = "activationcode";
                    entry9["userid"] = req12.userid;
                    if (perm1 != "") {
                        entry9["permissions"] = perm1;
                    }
                    entry9["groups"] = grps;
                    entry9["orig_credit"] = credit1;
                    entry9["credit"] = credit1;
                    entry9["time"] = await nowSecondsAsync();
                    entry9["description"] = orEmpty(req12.body["description"]);
                    if (req12.body.hasOwnProperty("singlecredit")) {
                        entry9["singlecredit"] = req12.body["singlecredit"];
                    }
                });
                coll.push(id);
            });
            let fetchResult1 = scripts.singleFetchResult(({}));
            fetchResult1.items = td.arrayToJson(coll);
            req12.response = fetchResult1.toJson();
        }
    });
    addRoute("POST", "admin", "reindexusers", async (req13: ApiRequest) => {
        checkPermission(req13, "operator");
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
}

function _initImport() : void
{
    addRoute("GET", "logcrash", "", async (req: ApiRequest) => {
        crashAndBurn();
    });
    addRoute("GET", "tdtext", "*", async (req1: ApiRequest) => {
        if (/^[a-z]+$/.test(req1.verb)) {
            let s = await td.downloadTextAsync("https://www.touchdevelop.com/api/" + req1.verb + "/text?original=true");
            req1.response = s;
        }
        else {
            req1.status = restify.http()._400BadRequest;
        }
    });
    addRoute("POST", "import", "", async (req2: ApiRequest) => {
        checkPermission(req2, "root");
        if (req2.status == 200) {
            if (importRunning) {
                req2.status = restify.http()._503ServiceUnavailable;
            }
            else {
                importRunning = true;
                await importAnythingAsync(req2);
                importRunning = false;
            }
        }
    });
    addRoute("POST", "recimport", "*", async (req3: ApiRequest) => {
        checkPermission(req3, "root");
        let id = req3.verb;
        if (req3.status == 200 && ! /^[a-z]+$/.test(id)) {
            req3.status = restify.http()._412PreconditionFailed;
        }
        if (req3.status == 200) {
            let resp = new RecImportResponse();
            resp.ids = {};
            resp.force = orFalse(req3.queryOptions["force"]);
            resp.fulluser = orFalse(req3.queryOptions["fulluser"]);
            await importRecAsync(resp, id);
            req3.response = resp.toJson();
        }
    });
    addRoute("POST", "importdocs", "", async (req4: ApiRequest) => {
        checkPermission(req4, "root");
        if (req4.status == 200) {
            await importDoctopicsAsync(req4);
        }
    });
    addRoute("GET", "importsync", "", async (req5: ApiRequest) => {
        let key = req5.queryOptions["key"];
        if (key != null && key == td.serverSetting("LOGIN_SECRET", false)) {
            if (importRunning) {
                req5.status = restify.http()._503ServiceUnavailable;
            }
            else {
                importRunning = true;
                await importFromPubloggerAsync(req5);
                importRunning = false;
            }
        }
        else {
            req5.status = restify.http()._402PaymentRequired;
        }
    });
}

async function resolveScreenshotAsync(entities: indexedStore.FetchResult, req: ApiRequest) : Promise<void>
{
    await addUsernameEtcAsync(entities);
    let coll = (<PubScreenshot[]>[]);
    for (let js of entities.items) {
        let screenshot = PubScreenshot.createFromJson(js["pub"]);
        coll.push(screenshot);
        let id = "/" + screenshot.id;
        screenshot.pictureurl = artContainer.url() + id;
        screenshot.thumburl = thumbContainers[0].container.url() + id;
        if (req.isUpgrade) {
            queueUpgradeTask(req, /* async */ redownloadScreenshotAsync(js));
        }
    }
    await awaitUpgradeTasksAsync(req);
    entities.items = td.arrayToJson(coll);
}

async function updateScreenshotCountersAsync(screenshot: PubScreenshot) : Promise<void>
{
    await pubsContainer.updateAsync(screenshot.publicationid, async (entry: JsonBuilder) => {
        increment(entry, "screenshots", 1);
    });
}

function orZero(s: number) : number
{
    let r: number;
    if (s == null) {
        r = 0;
    }
    else {
        r = s;
    }
    return r;
}

async function clearScriptCountsAsync(script: PubScript) : Promise<void>
{
    script.screenshots = 0;
    script.comments = 0;
    await pubsContainer.updateAsync(script.id, async (entry: JsonBuilder) => {
        entry["pub"]["screenshots"] = 0;
        entry["pub"]["comments"] = 0;
    });
}

function buildListResponse(entities: indexedStore.FetchResult, req: ApiRequest) : void
{
    let bld = clone(entities.toJson());
    bld["kind"] = "list";
    let etags = req.queryOptions["etagsmode"];
    if (etags == null) {
    }
    else if (etags == "includeetags" || etags == "etagsonly") {
        let coll = asArray(entities.items).map<JsonBuilder>((elt: JsonObject) => {
            let result: JsonBuilder;
            result = {};
            result["id"] = elt["id"];
            result["kind"] = elt["kind"];
            result["ETag"] = computeEtagOfJson(elt);
            return result;
        });
        bld["etags"] = td.arrayToJson(coll);
        if (etags == "etagsonly") {
            delete bld["items"];
        }
    }
    req.response = clone(bld);
}

async function redownloadArtAsync(jsb: JsonObject) : Promise<void>
{
    let urlbase = "https://touchdevelop.blob.core.windows.net/";
    urlbase = "http://cdn.touchdevelop.com/";
    let id = jsb["id"];
    let filename = id;
    let result3 = await copyUrlToBlobAsync(artContainer, filename, urlbase + "pub/" + id);
    if (jsb["isImage"]) {
        let result = await copyUrlToBlobAsync(thumbContainers[0].container, filename, urlbase + "thumb/" + id);
        if (result == null) {
            result = await copyUrlToBlobAsync(thumbContainers[0].container, filename, urlbase + "pub/" + id);
        }
        if (jsb["kind"] == "art") {
            result = await copyUrlToBlobAsync(thumbContainers[1].container, filename, urlbase + "thumb1/" + id);
            if (result == null) {
                result = await copyUrlToBlobAsync(thumbContainers[1].container, filename, urlbase + "pub/" + id);
            }
        }
    }
    else {
        let result2 = await copyUrlToBlobAsync(aacContainer, id + ".m4a", urlbase + "aac/" + id + ".m4a");
    }
}

async function postScreenshotAsync(req: ApiRequest) : Promise<void>
{
    let baseKind = req.rootPub["kind"];
    if ( ! /^(script)$/.test(baseKind)) {
        req.status = restify.http()._412PreconditionFailed;
    }
    else {
        let screenshot = new PubScreenshot();
        screenshot.userplatform = getUserPlatforms(req);
        screenshot.userid = req.userid;
        screenshot.time = await nowSecondsAsync();
        screenshot.publicationid = req.rootId;
        screenshot.publicationkind = baseKind;
        screenshot.publicationname = orEmpty(req.rootPub["pub"]["name"]);
        let jsb = {};
        jsb["pub"] = screenshot.toJson();
        await postArt_likeAsync(req, jsb);
        if (req.status == 200) {
            await screenshots.insertAsync(jsb);
            await updateScreenshotCountersAsync(screenshot);
            await storeNotificationsAsync(req, jsb, "");
            // ### return screenshot
            await returnOnePubAsync(screenshots, clone(jsb), req);
        }
    }
}

async function postArt_likeAsync(req: ApiRequest, jsb: JsonBuilder) : Promise<void>
{
    let contentType = req.body["contentType"];
    fixArtProps(contentType, jsb);
    let ext = jsb["ext"];
    let enc = withDefault(req.body["contentEncoding"], "base64");
    if ( ! (enc == "base64" || enc == "utf8")) {
        req.status = restify.http()._412PreconditionFailed;
    }
    else if (ext == "") {
        req.status = restify.http()._415UnsupportedMediaType;
    }
    else {
        let buf = new Buffer(req.body["content"], enc);
        let sizeLimit = 1 * 1024 * 1024;
        let arttype = jsb["arttype"];
        if (arttype == "blob") {
            sizeLimit = 8 * 1024 * 1024;
        }
        else if (arttype == "video") {
            sizeLimit = 8 * 1024 * 1024;
        }
        if (buf == null) {
            req.status = restify.http()._400BadRequest;
        }
        else if (buf.length > sizeLimit) {
            req.status = restify.http()._413RequestEntityTooLarge;
        }
        else {
            let sha = td.sha256(buf).substr(0, 32);
            jsb["pub"]["filehash"] = sha;
            if (orEmpty(jsb["kind"]) == "art" && ! orFalse(req.body["forcenew"])) {
                let fetchResult = await arts.getIndex("filehash").fetchAsync(sha, ({}));
                let existing = fetchResult.items[0];
                if (existing != null) {
                    jsb["existing"] = existing;
                    return;
                }
            }
            await generateIdAsync(jsb, 8);
            let filename = jsb["id"];
            if (arttype == "blob" || arttype == "text") {
                let s = orEmpty(jsb["pub"]["name"]).replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+/g, "").replace(/-+$/g, "");
                filename = filename + "/" + withDefault(s, "file") + "." + ext;
            }
            jsb["filename"] = filename;
            let result = await artContainer.createGzippedBlockBlobFromBufferAsync(filename, buf, {
                forceNew: true,
                contentType: contentType,
                cacheControl: "public, max-age=900",
                smartGzip: true
            });
            if ( ! result.succeded()) {
                req.status = restify.http()._424FailedDependency;
            }
            else if (jsb["isImage"]) {
                let url = artContainer.url() + "/" + filename;
                await parallel.forAsync(thumbContainers.length, async (i: number) => {
                    let thumbContainer = thumbContainers[i];
                    let tempThumbUrl = await kraken.optimizePictureUrlAsync(url, {
                        width: thumbContainer.size,
                        height: thumbContainer.size,
                        resizeStrategy: "auto",
                        lossy: true,
                        quality: 60
                    });
                    if (tempThumbUrl != null) {
                        let result2 = await thumbContainer.container.createBlockBlobFromUrlAsync(filename, tempThumbUrl, {
                            forceNew: true,
                            contentType: contentType,
                            cacheControl: "public, max-age=900",
                            timeoutIntervalInMs: 3000
                        });
                        if ( ! result2.succeded()) {
                            req.status = restify.http()._424FailedDependency;
                        }
                    }
                    else {
                        req.status = restify.http()._400BadRequest;
                    }
                });
            }
        }
    }
}

function queueUpgradeTask(req: ApiRequest, task:Promise<void>) : void
{
    if (req.upgradeTasks == null) {
        req.upgradeTasks = [];
    }
    req.upgradeTasks.push(task);
}

async function awaitUpgradeTasksAsync(req: ApiRequest) : Promise<void>
{
    if (req.upgradeTasks != null) {
        for (let task2 of req.upgradeTasks) {
            await task2;
        }
    }
}

async function redownloadScreenshotAsync(js: JsonObject) : Promise<void>
{
    await redownloadArtAsync(js);
    await pubsContainer.updateAsync(js["id"], async (entry: JsonBuilder) => {
        fixArtProps("image/jpeg", entry);
    });
}

async function importReviewAsync(req: ApiRequest, body: JsonObject) : Promise<void>
{
    let review = new PubReview();
    review.fromJson(removeDerivedProperties(body));

    let pubid = review.publicationid;
    let entry = await pubsContainer.getAsync(pubid);
    if (isGoodEntry(entry)) {
        if (entry["kind"] == "script") {
            pubid = entry["updateKey"];
        }
        review.publicationuserid = entry["pub"]["userid"];
        let jsb = await updateReviewCountsAsync(review, pubid, req);
        if (req.status == 409) {
            await reviews.reserveIdAsync(review.id);
            req.status = restify.http()._410Gone;
        }
    }
    else {
        req.status = 404;
    }
}

async function updateReviewCountsAsync(review: PubReview, pubid: string, req: ApiRequest) : Promise<JsonBuilder>
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
    let ok = await tryInsertPubPointerAsync(key, review.id);
    if (ok) {
        if (false) {
            logger.debug("review: " + JSON.stringify(jsb));
        }
        await reviews.insertAsync(jsb);
        // ### update heart count
        await pubsContainer.updateAsync(pubid, async (entry: JsonBuilder) => {
            increment(entry, "positivereviews", 1);
        });
        await pubsContainer.updateAsync(review.publicationuserid, async (entry1: JsonBuilder) => {
            increment(entry1, "receivedpositivereviews", 1);
        });
    }
    else {
        req.status = restify.http()._409Conflict;
    }
    return jsb;
}

async function importFromPubloggerAsync(req: ApiRequest) : Promise<void>
{
    let entry = await pubsContainer.getAsync("cfg-lastsync");
    let start = 0;
    if (entry != null) {
        start = entry["start"];
    }
    let resp = {};
    let coll2 = (<JsonObject[]>[]);
    let continuation = "&fake=blah";
    let lastTime = start;
    while (continuation != "") {
        logger.info("download from publogger: " + start + " : " + continuation);
        let js2 = await td.downloadJsonAsync("http://tdpublogger.azurewebsites.net/syncpubs?count=30&start=" + start + continuation);
        await parallel.forJsonAsync(js2["items"], async (json: JsonObject) => {
            lastTime = json["notificationtime"];
            await importDownloadPublicationAsync(json["id"], resp, coll2);
        });
        let cont = orEmpty(js2["continuation"]);
        if (coll2.length > 30 || cont == "") {
            continuation = "";
        }
        else {
            continuation = "&continuation=" + cont;
        }
    }
    for (let js4 of coll2) {
        let apiRequest = await importOneAnythingAsync(js4);
        resp[js4["id"]] = apiRequest.status;
    }
    await pubsContainer.updateAsync("cfg-lastsync", async (entry1: JsonBuilder) => {
        let r = orZero(entry1["start"]);
        entry1["start"] = Math.max(r, lastTime);
    });
    req.response = clone(resp);
}

async function importOneAnythingAsync(js: JsonObject) : Promise<ApiRequest>
{
    let apiRequest: ApiRequest;
    let entry = await pubsContainer.getAsync(js["id"]);
    apiRequest = new ApiRequest();
    apiRequest.status = 200;
    if ( ! isGoodEntry(entry)) {
        let kind = js["kind"];
        if (kind == "script") {
            await importScriptAsync(apiRequest, js);
        }
        else if (kind == "art") {
            await importArtAsync(apiRequest, js);
        }
        else if (kind == "review") {
            await importReviewAsync(apiRequest, js);
        }
        else if (kind == "user") {
            await importUserAsync(apiRequest, js);
        }
        else if (kind == "comment") {
            await importCommentAsync(apiRequest, js);
        }
        else if (kind == "tag") {
            await importTagAsync(apiRequest, js);
        }
        else if (kind == "group") {
            await importGroupAsync(apiRequest, js);
        }
        else if (kind == "screenshot") {
            await importScreenshotAsync(apiRequest, js);
        }
        else {
            apiRequest.status = restify.http()._422UnprocessableEntity;
        }
        logger.info("import " + kind + " /" + js["id"] + ": " + apiRequest.status);
    }
    else {
        apiRequest.status = restify.http()._409Conflict;
    }
    return apiRequest;
}

async function importDownloadPublicationAsync(id: string, resp: JsonBuilder, coll2: JsonObject[]) : Promise<void>
{
    let existingEntry = await pubsContainer.getAsync(id);
    if ( ! isGoodEntry(existingEntry)) {
        let url = "https://www.touchdevelop.com/api/" + id;
        let js = await td.downloadJsonAsync(url);
        if (js == null) {
            resp[id] = 404;
        }
        else if (js["kind"] == "script") {
            let jsb = clone(js);
            if (js["rootid"] != id) {
                let js3 = await td.downloadJsonAsync(url + "/base");
                jsb["baseid"] = js3["id"];
            }
            else {
                jsb["baseid"] = "";
            }
            let s2 = await td.downloadTextAsync(url + "/text?original=true&ids=true");
            jsb["text"] = s2;
            coll2.push(clone(jsb));
        }
        else if (/^(runbucket|run|webapp)$/.test(js["kind"])) {
        }
        else {
            coll2.push(js);
        }
    }
}

function isGoodEntry(entry: JsonObject) : boolean
{
    let b: boolean;
    b = entry != null && entry["kind"] != "reserved";
    return b;
}

function isGoodPub(entry: JsonObject, kind: string) : boolean
{
    let b: boolean;
    b = entry != null && orEmpty(entry["kind"]) == kind;
    return b;
}

async function getInstalledHistoryAsync(req: ApiRequest) : Promise<void>
{
    let scriptGuid = req.rootId + "." + req.argument;
    let resQuery = historyTable.createQuery().partitionKeyIs(scriptGuid);
    let entities2 = await indexedStore.executeTableQueryAsync(resQuery, req.queryOptions);
    req.response = entities2.toJson();
}

async function _initSubscriptionsAsync() : Promise<void>
{
    subscriptions = await indexedStore.createStoreAsync(pubsContainer, "subscription");
    await setResolveAsync(subscriptions, async (fetchResult: indexedStore.FetchResult, apiRequest: ApiRequest) => {
        let field = "userid";
        if (apiRequest.verb == "subscriptions") {
            field = "publicationid";
        }
        let users = await followPubIdsAsync(fetchResult.items, field, "user");
        fetchResult.items = td.arrayToJson(users);
        resolveUsers(fetchResult, apiRequest);
    }
    , {
        byUserid: true,
        byPublicationid: true
    });
    // Note that it logically should be ``subscribers``, but we use ``subscriptions`` for backward compat.
    addRoute("POST", "*user", "subscriptions", async (req: ApiRequest) => {
        await canPostAsync(req, "subscription");
        if (req.status == 200) {
            await addSubscriptionAsync(req.userid, req.rootId);
            req.response = ({});
        }
    });
    addRoute("DELETE", "*user", "subscriptions", async (req1: ApiRequest) => {
        await canPostAsync(req1, "subscription");
        if (req1.status == 200) {
            await removeSubscriptionAsync(req1.userid, req1.rootId);
            req1.response = ({});
        }
    });
    addRoute("GET", "*pub", "notifications", async (req2: ApiRequest) => {
        await getNotificationsAsync(req2, false);
    });
    addRoute("GET", "notifications", "", async (req3: ApiRequest) => {
        req3.rootId = "all";
        await getNotificationsAsync(req3, false);
    });
    addRoute("GET", "*pub", "notificationslong", async (req4: ApiRequest) => {
        await getNotificationsAsync(req4, true);
    });
    addRoute("GET", "notificationslong", "", async (req5: ApiRequest) => {
        req5.rootId = "all";
        await getNotificationsAsync(req5, true);
    });
    addRoute("POST", "*user", "notifications", async (req6: ApiRequest) => {
        meOnly(req6);
        if (req6.status == 200) {
            let resQuery2 = notificationsTable.createQuery().partitionKeyIs(req6.rootId).top(1);
            let entities2 = await resQuery2.fetchPageAsync();
            let js = entities2.items[0];
            let topNot = "";
            if (js != null) {
                topNot = js["RowKey"];
            }
            let resp = {};
            resp["lastNotificationId"] = orEmpty(req6.rootPub["lastNotificationId"]);
            await pubsContainer.updateAsync(req6.rootId, async (entry: JsonBuilder) => {
                entry["lastNotificationId"] = topNot;
                entry["notifications"] = 0;
            });
            req6.response = clone(resp);
        }
    });
}

async function storeNotificationsAsync(req: ApiRequest, jsb: JsonBuilder, subkind: string) : Promise<void>
{
    let pub = jsb["pub"];
    let userid = pub["userid"];
    let pubkind = pub["kind"];
    logger.tick("New_" + pubkind);
    if (pubkind == "abusereport") {
        userid = pub["publicationuserid"];
    }
    let toNotify = {}
    if (pubkind != "review") {
        for (let sub of await subscriptions.getIndex("publicationid").fetchAllAsync(userid)) {
            toNotify[sub["pub"]["userid"]] = "subscribed";
        }
        for (let grJson of await getUser_sGroupsAsync(userid)) {
            let gr = PubGroup.createFromJson(grJson["pub"]);
            if (gr.isclass && gr.userid != userid) {
                toNotify[gr.userid] = "class";
            }
            if (pubkind != "abusereport") {
                toNotify[gr.id] = "group";
            }
        }
    }
    if (req.rootPub != null) {
        let parentUserid = req.rootPub["pub"]["userid"];
        let parentKind = req.rootPub["kind"];
        if (parentUserid != userid) {
            if (pubkind == "script") {
                toNotify[parentUserid] = "fork";
            }
            else if (pubkind == "comment") {
                if (parentKind == "comment") {
                    toNotify[parentUserid] = "reply";
                }
                else {
                    toNotify[parentUserid] = "onmine";
                }
            }
            else {
                toNotify[parentUserid] = "onmine";
            }
        }
    }
    toNotify["all"] = "all";

    if (Object.keys(toNotify).length > 0) {
        let notification = new PubNotification();
        notification.kind = "notification";
        notification.id = (await cachedStore.invSeqIdAsync()).toString();
        notification.time = pub["time"];
        notification.publicationid = pub["id"];
        notification.publicationkind = pubkind;
        notification.publicationname = orEmpty(pub["name"]);
        if (req.rootPub != null) {
            notification.supplementalid = req.rootPub["id"];
            notification.supplementalkind = req.rootPub["kind"];
            notification.supplementalname = orEmpty(req.rootPub["pub"]["name"]);
        }
        notification.userid = userid;

        let jsb2 = clone(notification.toJson());
        jsb2["RowKey"] = notification.id;

        let ids = Object.keys(toNotify);
        await parallel.forAsync(ids.length, async (x: number) => {
            let id = ids[x];
            let jsb3 = clone(jsb2);
            jsb3["PartitionKey"] = id;
            jsb3["notificationkind"] = toNotify[id];
            await notificationsTable.insertEntityAsync(clone(jsb3), "or merge");
            if (id != "all") {
                await pubsContainer.updateAsync(id, async (entry: JsonBuilder) => {
                    let num = orZero(entry["notifications"]);
                    entry["notifications"] = num + 1;
                });
            }
            await pokeSubChannelAsync("notifications:" + id);
            await pokeSubChannelAsync("installed:" + id);
        });
    }
}

async function _initReleasesAsync() : Promise<void>
{
    currClientConfig = new ClientConfig();
    currClientConfig.searchApiKey = td.serverSetting("AZURE_SEARCH_CLIENT_KEY", false);
    currClientConfig.searchUrl = "https://" + td.serverSetting("AZURE_SEARCH_SERVICE_NAME", false) + ".search.windows.net";
    currClientConfig.rootUrl = td.serverSetting("SELF", false).replace(/\/$/g, "");
    currClientConfig.apiUrl = currClientConfig.rootUrl + "/api";
    // TODO client config: per user
    currClientConfig.workspaceUrl = (await workspaceContainer[0].blobContainerAsync()).url() + "/";
    currClientConfig.liteVersion = releaseVersionPrefix + ".r" + rewriteVersion;
    currClientConfig.shareUrl = currClientConfig.rootUrl;
    currClientConfig.cdnUrl = (await pubsContainer.blobContainerAsync()).url().replace(/\/pubs$/g, "");
    currClientConfig.primaryCdnUrl = withDefault(td.serverSetting("CDN_URL", true), currClientConfig.cdnUrl);
    currClientConfig.altCdnUrls = (<string[]>[]);
    currClientConfig.altCdnUrls.push((await pubsContainer.blobContainerAsync()).url().replace(/\/pubs$/g, ""));
    currClientConfig.altCdnUrls.push(currClientConfig.primaryCdnUrl);
    currClientConfig.anonToken = basicCreds;
    addRoute("GET", "clientconfig", "", async (req: ApiRequest) => {
        req.response = currClientConfig.toJson();
    });

    releases = await indexedStore.createStoreAsync(pubsContainer, "release");
    await setResolveAsync(releases, async (fetchResult: indexedStore.FetchResult, apiRequest: ApiRequest) => {
        await addUsernameEtcAsync(fetchResult);
        let coll = (<PubRelease[]>[]);
        let labels = <IReleaseLabel[]>[];
        let entry3 = await settingsContainer.getAsync("releases");
        if (entry3 != null && entry3["ids"] != null) {
            let js = entry3["ids"];
            for (let k of Object.keys(js)) {
                labels.push(js[k]);
            }
        }
        for (let jsb of fetchResult.items) {
            let rel = PubRelease.createFromJson(jsb["pub"]);
            rel.labels = labels.filter(elt => elt.releaseid == rel.releaseid);
            let ver = orEmpty(rel.version);
            if (ver == "") {
                rel.name = rel.releaseid.replace(/.*-/g, "");
            }
            else {
                rel.name = withDefault(rel.branch, rel.releaseid.replace(/.*-\d*/g, "")) + " " + ver;
            }
            coll.push(rel);
        }
        fetchResult.items = td.arrayToJson(coll);
    }
    , {
        byUserid: true
    });
    addRoute("POST", "releases", "", async (req1: ApiRequest) => {
        checkPermission(req1, "upload");
        if (req1.status == 200) {
            let rel1 = new PubRelease();
            rel1.userid = req1.userid;
            rel1.time = await nowSecondsAsync();
            rel1.releaseid = req1.body["releaseid"];
            rel1.commit = orEmpty(req1.body["commit"]);
            rel1.branch = orEmpty(req1.body["branch"]);
            rel1.buildnumber = orZero(req1.body["buildnumber"]);
            if (looksLikeReleaseId(rel1.releaseid)) {
                await settingsContainer.updateAsync("releaseversion", async (entry: JsonBuilder) => {
                    let x = orZero(entry[releaseVersionPrefix]) + 1;
                    entry[releaseVersionPrefix] = x;
                    rel1.version = releaseVersionPrefix + "." + x + "." + rel1.buildnumber;
                });
                let key = "rel-" + rel1.releaseid;
                let jsb1 = {};
                jsb1["pub"] = rel1.toJson();
                await generateIdAsync(jsb1, 5);
                let ok = await tryInsertPubPointerAsync(key, jsb1["id"]);
                if (ok) {
                    await releases.insertAsync(jsb1);
                    await returnOnePubAsync(releases, clone(jsb1), req1);
                }
                else {
                    let entry1 = await getPointedPubAsync(key, "release");
                    await returnOnePubAsync(releases, entry1, req1);
                }
            }
            else {
                req1.status = restify.http()._412PreconditionFailed;
            }
        }
    });
    addRoute("POST", "*release", "files", async (req2: ApiRequest) => {
        checkPermission(req2, "upload");
        if (req2.status == 200) {
            let rel2 = PubRelease.createFromJson(req2.rootPub["pub"]);
            let body = req2.body;
            let buf = new Buffer(body["content"], body["encoding"]);
            let request = td.createRequest(filesContainer.url() + "/overrideupload/" + body["filename"]);
            let response = await request.sendAsync();
            if (response.statusCode() == 200) {
                buf = response.contentAsBuffer();
            }
            let result = await appContainer.createBlockBlobFromBufferAsync(rel2.releaseid + "/" + body["filename"], buf, {
                contentType: body["contentType"]
            });
            result = await appContainer.createGzippedBlockBlobFromBufferAsync(rel2.releaseid + "/c/" + body["filename"], buf, {
                contentType: body["contentType"],
                cacheControl: "public, max-age=31556925",
                smartGzip: true
            });
            req2.response = ({ "status": "ok" });
        }
    }
    , {
        sizeCheckExcludes: "content"
    });
    addRoute("POST", "*release", "label", async (req3: ApiRequest) => {
        let name = orEmpty(req3.body["name"]);
        if ( ! isKnownReleaseName(name)) {
            req3.status = restify.http()._412PreconditionFailed;
        }
        if (req3.status == 200) {
            checkPermission(req3, "lbl-" + name);
        }
        if (req3.status == 200) {
            let rel3 = PubRelease.createFromJson(req3.rootPub["pub"]);
            let lab:IReleaseLabel = <any>{};
            lab.name = name;
            lab.time = await nowSecondsAsync();
            lab.userid = req3.userid;
            lab.releaseid = rel3.releaseid;
            lab.relid = rel3.id;
            lab.numpokes = 0;
            await auditLogAsync(req3, "lbl-" + lab.name);
            await settingsContainer.updateAsync("releases", async (entry2: JsonBuilder) => {
                let jsb2 = entry2["ids"];
                if (jsb2 == null) {
                    jsb2 = {};
                    entry2["ids"] = jsb2;
                }
                jsb2[lab.name] = lab;
                bareIncrement(entry2, "updatecount");
            });
            if (name == "cloud") {
                /* async */ pokeReleaseAsync(name, 15);
                /* async */ deployCompileServiceAsync(rel3, req3);
            }
            req3.response = ({});
        }
    });
    addRoute("POST", "upload", "files", async (req4: ApiRequest) => {
        if (td.startsWith(orEmpty(req4.body["filename"]).toLowerCase(), "override")) {
            checkPermission(req4, "root");
        }
        else {
            checkPermission(req4, "web-upload");
        }
        if (req4.status == 200) {
            let body1 = req4.body;
            let buf1 = new Buffer(body1["content"], body1["encoding"]);
            let result1 = await filesContainer.createGzippedBlockBlobFromBufferAsync(body1["filename"], buf1, {
                contentType: body1["contentType"],
                cacheControl: "public, max-age=3600",
                smartGzip: true
            });
            req4.response = ({ "status": "ok" });
        }
    }
    , {
        sizeCheckExcludes: "content"
    });

}

function checkPermission(req: ApiRequest, perm: string) : void
{
    if (req.userid == "") {
        req.status = restify.http()._401Unauthorized;
    }
    else if ( ! hasPermission(req.userinfo.json, perm)) {
        req.status = restify.http()._402PaymentRequired;
    }
}

function looksLikeReleaseId(s: string) : boolean
{
    let b: boolean;
    b = /^\d\d\d\d\d\d\d\d\d\d[a-zA-Z\d\.\-]+$/.test(s);
    return b;
}

async function serveReleaseAsync(req: restify.Request, res: restify.Response) : Promise<void>
{
    let coll = (/^([^\?]+)(\?.*)$/.exec(req.url()) || []);
    let fn = req.url();
    let query = "";
    if (coll[1] != null) {
        fn = coll[1];
        query = coll[2];
    }
    fn = fn.replace(/^\/app\//g, "");
    if (fn.endsWith("/")) {
        res.redirect(301, "/app/" + fn.replace(/\/+$/g, "") + query);
        return;
    }
    let rel = mainReleaseName;
    if (isKnownReleaseName(fn)) {
        rel = fn;
        fn = "";
    }
    rel = withDefault(req.query()["releaseid"], withDefault(req.query()["r"], rel));

    let relid = "";
    if (looksLikeReleaseId(rel)) {
        relid = rel;
    }
    else {
        let entry = await settingsContainer.getAsync("releases");
        let js = entry["ids"][rel];
        if (js == null) {
            let entry3 = await getPubAsync(rel, "release");
            if (entry3 == null) {
                res.sendError(404, "no such release: " + rel);
            }
            else {
                relid = entry3["pub"]["releaseid"];
            }
        }
        else {
            relid = js["releaseid"];
        }
    }
    if (relid != "") {
        if (fn == "") {
            await rewriteAndCacheAsync(rel, relid, "index.html", "text/html", res, async (text: string) => {
                let result: string;
                let ver = "";
                let shortrelid = "";
                let relpub = await getPointedPubAsync("rel-" + relid, "release");
                let prel = PubRelease.createFromJson(relpub["pub"]);
                let ccfg = clientConfigForRelease(prel);
                ccfg.releaseLabel = rel;
                ver = orEmpty(relpub["pub"]["version"]);
                shortrelid = relpub["id"];
                if (basicCreds == "") {
                    text = td.replaceAll(text, "data-manifest=\"\"", "manifest=\"app.manifest?releaseid=" + encodeURIComponent(rel) + "\"");
                }
                else if (false) {
                    text = td.replaceAll(text, "data-manifest=\"\"", "manifest=\"app.manifest?releaseid=" + encodeURIComponent(rel) + "&anon_token=" + encodeURIComponent(basicCreds) + "\"");
                }
                let suff = "?releaseid=" + encodeURIComponent(relid) + "\"";
                text = td.replaceAll(text, "\"browsers.html\"", "\"browsers.html" + suff);
                text = td.replaceAll(text, "\"error.html\"", "\"error.html" + suff);
                text = td.replaceAll(text, "\"./", "\"" + currClientConfig.primaryCdnUrl + "/app/" + relid + "/c/");
                let verPref = "var tdVersion = \"" + ver + "\";\n" + "var tdConfig = " + JSON.stringify(ccfg.toJson(), null, 2) + ";\n";
                text = td.replaceAll(text, "var rootUrl = ", verPref + "var tdlite = \"url\";\nvar rootUrl = ");
                if (rel != "current") {
                    text = td.replaceAll(text, "betaFriendlyId = \"\"", "betaFriendlyId = \"beta " + withDefault(ver, relid.replace(/.*-/g, "")) + "\"");
                }
                result = text;
                return result;
            });
        }
        else if (fn == "app.manifest") {
            await rewriteAndCacheAsync(rel, relid, fn, "text/cache-manifest", res, async (text1: string) => {
                let result1: string;
                text1 = td.replaceAll(text1, "./", currClientConfig.primaryCdnUrl + "/app/" + relid + "/c/");
                text1 = text1 + "\n# " + rewriteVersion + "\n";
                result1 = text1;
                return result1;
            });
        }
        else if (fn == "error.html" || fn == "browsers.html") {
            await rewriteAndCacheAsync(rel, relid, fn, "text/html", res, async (text2: string) => {
                let result2: string;
                text2 = td.replaceAll(text2, "\"./", "\"" + currClientConfig.primaryCdnUrl + "/app/" + relid + "/c/");
                result2 = text2;
                return result2;
            });
        }
        else {
            res.sendError(404, "get file from CDN");
        }
    }
}

function isKnownReleaseName(fn: string) : boolean
{
    let b: boolean;
    b = /^(beta|current|latest|cloud)$/.test(fn);
    return b;
}

async function rewriteAndCacheAsync(rel: string, relid: string, srcFile: string, contentType: string, res: restify.Response, rewrite: StringTransformer) : Promise<void>
{
    let path = relid + "/" + rel + "/" + myChannel + "/" + srcFile;
    let entry2 = await cacheRewritten.getAsync(path);
    if (entry2 == null || entry2["version"] != rewriteVersion) {
        let lock = await acquireCacheLockAsync(path);
        if (lock == "") {
            await rewriteAndCacheAsync(rel, relid, srcFile, contentType, res, rewrite);
            return;
        }

        let info = await appContainer.getBlobToTextAsync(relid + "/" + srcFile);
        if (info.succeded()) {
            let text = await rewrite(info.text());
            await cacheRewritten.updateAsync(path, async (entry: JsonBuilder) => {
                entry["version"] = rewriteVersion;
                entry["text"] = text;
            });
            res.sendText(text, contentType);
        }
        else {
            res.sendError(404, "missing file");
        }
        await releaseCacheLockAsync(lock);
    }
    else {
        res.sendText(entry2["text"], contentType);
    }
    logger.measure("ServeApp@" + srcFile, logger.contextDuration());
}

async function validateTokenAsync(req: ApiRequest, rreq: restify.Request) : Promise<void>
{
    await refreshSettingsAsync();
    if (req.isCached) {
        return;
    }
    let token = withDefault(rreq.header("x-td-access-token"), req.queryOptions["access_token"]);
    if (token != null && token != "null" && token != "undefined") {
        let tokenJs = (<JsonObject>null);
        if (td.startsWith(token, "0") && token.length < 100) {
            let value = await redisClient.getAsync("tok:" + token);
            if (value == null || value == "") {
                let coll = (/^0([a-z]+)\.([A-Za-z]+)$/.exec(token) || []);
                if (coll.length > 1) {
                    tokenJs = await tokensTable.getEntityAsync(coll[1], coll[2]);
                    if (tokenJs != null) {
                        await redisClient.setpxAsync("tok:" + token, JSON.stringify(tokenJs), 1000 * 1000);
                    }
                }
            }
            else {
                tokenJs = JSON.parse(value);
            }
        }
        if (tokenJs == null) {
            req.status = restify.http()._401Unauthorized;
        }
        else {
            let token2 = Token.createFromJson(tokenJs);
            if (orZero(token2.version) < 2) {
                req.status = restify.http()._401Unauthorized;
                return;
            }
            if (orEmpty(token2.cookie) != "") {
                let ok = td.stringContains(orEmpty(rreq.header("cookie")), "TD_ACCESS_TOKEN2=" + token2.cookie);
                if ( ! ok) {
                    req.status = restify.http()._401Unauthorized;
                    logger.info("cookie missing, user=" + token2.PartitionKey);
                    return;
                }
                let r = orEmpty(rreq.header("referer"));
                if (td.startsWith(r, "http://localhost:") || td.startsWith(r, self + "app/")) {
                }
                else {
                    req.status = restify.http()._401Unauthorized;
                    logger.info("bad referer: " + r + ", user = " + token2.PartitionKey);
                    return;
                }
                // minimum token expiration - 5min
                if (orEmpty(token2.reason) != "code" && orZero(theServiceSettings.tokenExpiration) > 300 && await nowSecondsAsync() - token2.time > theServiceSettings.tokenExpiration) {
                    // Token expired
                    req.status = restify.http()._401Unauthorized;
                    return;
                }
            }
            let uid = token2.PartitionKey;
            await setReqUserIdAsync(req, uid);
            if (req.status == 200 && orFalse(req.userinfo.json["awaiting"])) {
                req.status = restify.http()._418ImATeapot;
            }
            if (req.status == 200) {
                req.userinfo.token = token2;
                req.userinfo.ip = rreq.remoteIp();
                let uid2 = orEmpty(req.queryOptions["userid"]);
                if (uid2 != "" && hasPermission(req.userinfo.json, "root")) {
                    await setReqUserIdAsync(req, uid2);
                }
            }
        }
    }
}

function tokenString(token: Token) : string
{
    let customToken: string;
    customToken = "0" + token.PartitionKey + "." + token.RowKey;
    return customToken;
}

async function auditLogAsync(req: ApiRequest, type: string, options_0: IPubAuditLog = {}) : Promise<void>
{
    let options_ = new PubAuditLog(); options_.load(options_0);
    let msg = options_;
    msg.time = await nowSecondsAsync();
    if (msg.userid == "") {
        msg.userid = req.userid;
    }
    let pubkind = "";
    if (req.rootPub != null) {
        pubkind = orEmpty(req.rootPub["kind"]);
    }
    if (pubkind == "user" && msg.subjectid == "") {
        msg.subjectid = req.rootId;
    }
    if (msg.publicationid == "") {
        msg.publicationid = req.rootId;
        msg.publicationkind = pubkind;
        if (msg.subjectid == "" && pubkind != "") {
            msg.subjectid = orEmpty(req.rootPub["pub"]["userid"]);
        }
    }
    if (req.userinfo.token != null) {
        msg.tokenid = sha256(tokenString(req.userinfo.token)).substr(0, 10);
    }
    msg.type = type;
    msg.ip = encrypt(req.userinfo.ip, "AUDIT");
    if (false) {
        msg.oldvalue = encryptJson(msg.oldvalue, "AUDIT");
        msg.newvalue = encryptJson(msg.newvalue, "AUDIT");
    }
    let jsb = {};
    jsb["id"] = azureTable.createLogId();
    jsb["pub"] = msg.toJson();
    await auditStore.insertAsync(jsb);
}

async function throttleAsync(req: ApiRequest, kind: string, tokenCost_s_: number) : Promise<void>
{
    if ( ! throttleDisabled && req.status == 200) {
        if (callerHasPermission(req, "unlimited")) {
            return;
        }
        let drop = await throttleCoreAsync(withDefault(req.userid, req.throttleIp) + ":" + kind, tokenCost_s_);
        if (drop) {
            req.status = restify.http()._429TooManyRequests;
        }
    }
}

async function rewriteAndCachePointerAsync(id: string, res: restify.Response, rewrite:td.Action1<JsonBuilder>) : Promise<void>
{
    let path = "ptrcache/" + myChannel + "/" + id;
    let entry2 = await cacheRewritten.getAsync(path);
    let ver = await getCloudRelidAsync(true);

    let event = "ServePtr";
    let cat = "other";
    if (id == "ptr-home") {
        cat = "home";
    }
    else if (td.startsWith(id, "ptr-preview-")) {
        cat = "preview";
    }
    if (entry2 == null || entry2["version"] != ver || orZero(entry2["expiration"]) > 0 && entry2["expiration"] < await nowSecondsAsync()) {
        let lock = await acquireCacheLockAsync(path);
        if (lock == "") {
            await rewriteAndCachePointerAsync(id, res, rewrite);
            return;
        }

        await cacheCloudCompilerDataAsync(ver);

        let jsb = {};
        jsb["contentType"] = "text/html";
        jsb["version"] = ver;
        jsb["expiration"] = await nowSecondsAsync() + td.randomRange(2000, 3600);
        jsb["status"] = 200;
        await rewrite(jsb);
        entry2 = clone(jsb);

        if (jsb["version"] == ver) {
            await cacheRewritten.updateAsync(path, async (entry: JsonBuilder) => {
                copyJson(entry2, entry);
            });
        }
        await releaseCacheLockAsync(lock);
        event = "ServePtrFirst";
    }

    if (res.finished()) {
        return;
    }
    let redir = orEmpty(entry2["redirect"]);
    if (redir == "") {
        let status0 = orZero(entry2["status"]);
        if (status0 == 0) {
            status0 = 200;
        }
        if (false) {
            res.setHeader("X-TDlite-cache", event);
        }
        res.sendText(entry2["text"], entry2["contentType"], {
            status: status0
        });
        if (orFalse(entry2["error"])) {
            cat = "error";
        }
        logger.debug("serve ptr2: " + event + " " + cat + " " + path);
        logger.measure(event + "@" + cat, logger.contextDuration());
    }
    else {
        res.redirect(302, redir);
    }
}

async function servePointerAsync(req: restify.Request, res: restify.Response) : Promise<void>
{
    let lang = await handleLanguageAsync(req, res, true);
    let fn = req.url().replace(/\?.*/g, "").replace(/^\//g, "").replace(/\/$/g, "").toLowerCase();
    if (fn == "") {
        fn = "home";
    }
    let id = pathToPtr(fn);
    let pathLang = orEmpty((/@([a-z][a-z])$/.exec(id) || [])[1]);
    if (pathLang != "") {
        if (pathLang == theServiceSettings.defaultLang) {
            id = id.replace(/@..$/g, "");
            lang = "";
        }
        else {
            lang = "@" + pathLang;
        }
    }
    if (templateSuffix != "" && theServiceSettings.envrewrite.hasOwnProperty(id.replace(/^ptr-/g, ""))) {
        id = id + templateSuffix;
    }
    id = id + lang;

    await rewriteAndCachePointerAsync(id, res, async (v: JsonBuilder) => {
        let pubdata = {};
        let templatename = "templates/official-s";
        let msg = "";
        v["redirect"] = "";
        v["text"] = "";
        v["error"] = false;
        pubdata["webpath"] = fn;
        pubdata["ptrid"] = id;
        let existing = await getPubAsync(id, "pointer");
        if (existing == null && /@[a-z][a-z]$/.test(id)) {
            existing = await getPubAsync(id.replace(/@..$/g, ""), "pointer");
        }
        if (existing == null) {
            if (false && td.startsWith(fn, "docs/")) {
                let docid = fn.replace(/^docs\//g, "");
                let doctopic = doctopicsByTopicid[docid];
                if (doctopic != null) {
                    pubdata = clone(doctopic);
                    let html = topicList(doctopic, "", "");
                    pubdata["topiclist"] = html;
                    let resp = await queryCloudCompilerAsync(fn);
                    if (resp != null) {
                        pubdata["body"] = resp["prettyDocs"];
                    }
                    else {
                        msg = "Rendering docs failed";
                    }
                }
                else {
                    msg = "No such doctopic";
                }
            }
            else if (td.startsWith(fn, "u/")) {
                v["redirect"] = fn.replace(/^u\//g, "/usercontent/");
                return;
            }
            else if (td.startsWith(fn, "preview/")) {
                let docid1 = fn.replace(/^preview\//g, "");
                let [done, templatename, msg] = await renderScriptAsync(docid1, v, pubdata);
                if (done) {
                    return;
                }
            }
            else if (/^[a-z]+$/.test(fn)) {
                let entry = await pubsContainer.getAsync(fn);
                if (entry == null || withDefault(entry["kind"], "reserved") == "reserved") {
                    msg = "No such publication";
                }
                else {
                    v["redirect"] = "/app/#pub:" + entry["id"];
                    return;
                }
            }
            else {
                msg = "No such pointer";
            }
        }
        else {
            let ptr = PubPointer.createFromJson(existing["pub"]);
            if (! ptr.redirect) {
                if (! ptr.artid) {
                    let scriptid = ptr.scriptid;
                    let [done1, templatename, msg] = await renderScriptAsync(ptr.scriptid, v, pubdata);
                    if (done1) {
                        return;
                    }
                    let path = ptr.parentpath;
                    let breadcrumb = ptr.breadcrumbtitle;
                    let sep = "&nbsp;&nbsp;»&nbsp; ";
                    for (let i = 0; i < 5; i++) {
                        let parJson = await getPubAsync(pathToPtr(path), "pointer");
                        if (parJson == null) {
                            break;
                        }
                        let parptr = PubPointer.createFromJson(parJson["pub"]);
                        breadcrumb = "<a href=\"" + htmlQuote("/" + parptr.path) + "\">" + parptr.breadcrumbtitle + "</a>" + sep + breadcrumb;
                        path = parptr.parentpath;
                    }
                    breadcrumb = "<a href=\"/home\">Home</a>" + sep + breadcrumb;
                    pubdata["breadcrumb"] = breadcrumb;
                }
                else {
                    let cont = orEmpty(ptr.artcontainer);
                    cont = "";
                    if (thumbContainers.filter(elt => elt.name == cont).length == 0) {
                        cont = "pub";
                    }
                    v["redirect"] = currClientConfig.primaryCdnUrl + "/" + cont + "/" + ptr.artid;
                    return;
                }
            }
            else {
                v["redirect"] = ptr.redirect;
                return;
            }
        }

        pubdata["css"] = doctopicsCss;
        pubdata["rootUrl"] = currClientConfig.rootUrl;
        if (msg != "") {
            templatename = "templates/official-s";
        }
        let templText = await getTemplateTextAsync(templatename + templateSuffix, lang);
        if (msg == "" && templText.length < 100) {
            msg = templText;
        }
        if (templText.length < 100) {
            v["text"] = msg;
            v["version"] = "no-cache";
        }
        else {
            if (msg != "") {
                if (false) {
                    v["version"] = "no-cache";
                }
                v["expiration"] = await nowSecondsAsync() + 5 * 60;
                if (td.startsWith(msg, "No such ")) {
                    pubdata["name"] = "Sorry, the page you were looking for doesn’t exist";
                    v["status"] = 404;
                }
                else {
                    pubdata["name"] = "Whoops, something went wrong.";
                    v["status"] = 500;
                }
                pubdata["body"] = htmlQuote("Error message: " + msg);
                v["error"] = true;
                let text = await simplePointerCacheAsync("error-template", lang);
                if (text.length > 100) {
                    templText = text;
                }
            }
            v["text"] = await tdliteDocs.formatAsync(templText, pubdata);
        }
    });
}

async function _initLoginAsync() : Promise<void>
{
    let jsb = {};
    jsb["activate"] = td.replaceAll(template_html, "@BODY@", activate_html);
    jsb["kidcode"] = td.replaceAll(template_html, "@BODY@", enterCode_html);
    jsb["kidornot"] = td.replaceAll(template_html, "@BODY@", kidOrNot_html);
    jsb["newuser"] = td.replaceAll(template_html, "@BODY@", newuser_html);
    jsb["agree"] = td.replaceAll(template_html, "@BODY@", agree_html);
    jsb["usercreated"] = td.replaceAll(template_html, "@BODY@", user_created_html);
    jsb["providers"] = "";
    loginHtml = clone(jsb);

    serverAuth.init({
        makeJwt: async (profile: serverAuth.UserInfo, oauthReq: serverAuth.OauthRequest) => {
            let jwt: JsonBuilder;
            let url2 = await loginFederatedAsync(profile, oauthReq);
            let [url3, cook] = stripCookie(url2);
            let jsb2 = ({ "headers": {} });
            if (cook != "") {
                jsb2["headers"]["Set-Cookie"] = cook;
            }
            jsb2["http redirect"] = url3;
            return jsb2;
            return jwt;
        }
        ,
        getData: async (key: string) => {
            let value: string;
            value = await redisClient.getAsync("authsess:" + key);
            return value;
        }
        ,
        setData: async (key1: string, value1: string) => {
            let minutes = 30;
            await redisClient.setpxAsync("authsess:" + key1, value1, minutes * 60 * 1000);
        }
        ,
        federationMaster: orEmpty(td.serverSetting("AUTH_FEDERATION_MASTER", true)),
        federationTargets: orEmpty(td.serverSetting("AUTH_FEDERATION_TARGETS", true)),
        self: td.serverSetting("SELF", false).replace(/\/$/g, ""),
        requestEmail: true,
        redirectOnError: "/#loginerror"
    });
    if (hasSetting("AZURE_AD_CLIENT_SECRET")) {
        serverAuth.addAzureAd();
    }
    if (hasSetting("LIVE_CLIENT_SECRET")) {
        serverAuth.addLiveId();
    }
    if (hasSetting("GOOGLE_CLIENT_SECRET")) {
        serverAuth.addGoogle();
    }
    if (hasSetting("FACEBOOK_CLIENT_SECRET")) {
        serverAuth.addFacebook();
    }
    restify.server().get("/user/logout", async (req: restify.Request, res: restify.Response) => {
        res.redirect(302, "/signout");
    });
    restify.server().get("/oauth/providers", async (req1: restify.Request, res1: restify.Response) => {
        serverAuth.validateOauthParameters(req1, res1);
        handleBasicAuth(req1, res1);
        if ( ! res1.finished()) {
            let links = serverAuth.providerLinks(req1.query());
            let lang2 = await handleLanguageAsync(req1, res1, true);
            let html = await getLoginHtmlAsync("providers", lang2);
            for (let k of Object.keys(links)) {
                html = td.replaceAll(html, "@" + k + "-url@", links[k]);
            }
            res1.html(html);
        }
    });
    restify.server().get("/oauth/dialog", async (req2: restify.Request, res2: restify.Response) => {
        let sessionString = orEmpty(await serverAuth.options().getData(orEmpty(req2.query()["td_session"])));
        let session = new LoginSession();
        session.state = cachedStore.freshShortId(16);
        if (sessionString != "") {
            session = LoginSession.createFromJson(JSON.parse(sessionString));
        }
        if (session.userid == "") {
            serverAuth.validateOauthParameters(req2, res2);
        }
        handleBasicAuth(req2, res2);
        await loginCreateUserAsync(req2, session, res2);
        if ( ! res2.finished()) {
            let accessCode = orEmpty(req2.query()["td_state"]);
            if (accessCode == "teacher") {
                let query = req2.url().replace(/^[^\?]*/g, "");
                let url = req2.serverUrl() + "/oauth/providers" + query;
                res2.redirect(303, url);
            }
            else if (accessCode == tokenSecret && session.userid != "") {
                // **this is to be used during initial setup of a new cloud deployment**
                await pubsContainer.updateAsync(session.userid, async (entry: JsonBuilder) => {
                    jsonAdd(entry, "credit", 1000);
                    jsonAdd(entry, "totalcredit", 1000);
                    entry["permissions"] = ",admin,";
                });
                accessTokenRedirect(res2, session.redirectUri);
            }
            else {
                await loginHandleCodeAsync(accessCode, res2, req2, session);
            }
        }
    });
    restify.server().get("/oauth/gettoken", async (req3: restify.Request, res3: restify.Response) => {
        let s3 = req3.serverUrl() + "/oauth/login?state=foobar&response_type=token&client_id=no-cookie&redirect_uri=" + encodeURIComponent(req3.serverUrl() + "/oauth/gettokencallback") + "&u=" + encodeURIComponent(orEmpty(req3.query()["u"]));
        res3.redirect(303, s3);
    });
    restify.server().get("/oauth/gettokencallback", async (req4: restify.Request, res4: restify.Response) => {
        let _new = "<p>Your access token is below. Only paste in applications you absolutely trust.</p>\n<pre id=\"token\">\nloading...\n</pre>\n<p>You could have added <code>?u=xyzw</code> to get access token for a different user (given the right permissions).\n</p>\n<script>\nsetTimeout(function() {\nvar h = document.location.href.replace(/oauth\\/gettoken.*access_token/, \"?access_token\").replace(/&.*/, \"\");\ndocument.getElementById(\"token\").textContent = h;\n}, 100)\n</script>";
        res4.html(td.replaceAll(td.replaceAll(template_html, "@JS@", ""), "@BODY@", _new));
    });
    if (false) {
        addRoute("GET", "*user", "rawtoken", async (req5: ApiRequest) => {
            if (req5.userinfo.token.cookie != "") {
                // Only cookie-less (service) tokens allowed here.
                req5.status = restify.http()._418ImATeapot;
            }
            checkPermission(req5, "root");
            if (req5.status == 200) {
                let [customToken, cookie] = await generateTokenAsync(req5.rootId, "admin", "no-cookie");
                assert(cookie == "", "no cookie expected");
                await auditLogAsync(req5, "rawtoken", {
                    data: sha256(customToken).substr(0, 10)
                });
                req5.response = (self + "?access_token=" + customToken);
            }
        });
    }
}

function normalizeAndHash(accessCode: string) : string
{
    let s: string;
    s = orEmpty(accessCode).toLowerCase().replace(/\s/g, "");
    if (s != "") {
        s = "code/" + sha256(s);
    }
    return s;
}

function jsonAdd(entry: JsonBuilder, counter: string, delta: number) : void
{
    let x2 = orZero(entry[counter]) + delta;
    entry[counter] = x2;
}

function orFalse(s: boolean) : boolean
{
    let r: boolean;
    if (s == null) {
        r = false;
    }
    else {
        r = s;
    }
    return r;
}

function checkGroupPermission(req: ApiRequest) : void
{
    if (req.userid == req.rootPub["pub"]["userid"]) {
    }
    else {
        checkPermission(req, "pub-mgmt");
    }
}

async function createNewUserAsync(username: string, email: string, profileId: string, perms: string, realname: string, awaiting: boolean) : Promise<JsonBuilder>
{
    let r: JsonBuilder;
    r = {};
    let pubUser = new PubUser();
    pubUser.name = username;
    let settings = new PubUserSettings();
    settings.email = encrypt(email, emailKeyid);
    settings.realname = encrypt(realname, emailKeyid);
    settings.emailverified = orEmpty(settings.email) != "";
    r["pub"] = pubUser.toJson();
    r["settings"] = settings.toJson();
    r["login"] = profileId;
    r["permissions"] = perms;
    r["secondaryid"] = cachedStore.freshShortId(12);
    if (awaiting) {
        r["awaiting"] = awaiting;
    }
    let dictionary = setBuilderIfMissing(r, "groups");
    let dictionary2 = setBuilderIfMissing(r, "owngroups");
    await generateIdAsync(r, 8);
    await users.insertAsync(r);
    await passcodesContainer.updateAsync(profileId, async (entry: JsonBuilder) => {
        entry["kind"] = "userpointer";
        entry["userid"] = r["id"];
    });
    await sendPermissionNotificationAsync(emptyRequest, r);
    return r;
}

async function getRedirectUrlAsync(user2: string, req: restify.Request) : Promise<string>
{
    let url: string;
    let jsb = {};
    let [customToken, cookie] = await generateTokenAsync(user2, "code", req.query()["client_id"]);
    jsb["access_token"] = customToken;
    jsb["state"] = req.query()["state"];
    jsb["id"] = user2;
    if (cookie != "") {
        jsb["td_cookie"] = cookie;
    }
    url = req.query()["redirect_uri"] + "#" + serverAuth.toQueryString(clone(jsb));
    return url;
}

function htmlQuote(tdUsername: string) : string
{
    let _new: string;
    _new = td.replaceAll(td.replaceAll(td.replaceAll(td.replaceAll(td.replaceAll(tdUsername, "&", "&amp;"), "<", "&lt;"), ">", "&gt;"), "\"", "&quot;"), "'", "&#39;");
    return _new;
}

async function loginFederatedAsync(profile: serverAuth.UserInfo, oauthReq: serverAuth.OauthRequest) : Promise<string>
{
    let url: string;
    let coll = (/([^:]*):(.*)/.exec(profile.id) || []);
    let provider = coll[1];
    let providerUserId = coll[2];
    let profileId = "id/" + provider + "/" + encryptId(providerUserId, "SOCIAL0");
    logger.debug("profileid: " + profile.id + " enc " + profileId);
    let modernId = profileId;
    let entry2 = await passcodesContainer.getAsync(profileId);
    // ## Legacy profiles
    if (false) {
        if (entry2 == null) {
            let legacyId = "id/" + provider + "/" + sha256(providerUserId);
            let entry = await passcodesContainer.getAsync(legacyId);
            if (isGoodPub(entry, "userpointer") && await getPubAsync(entry["userid"], "user") != null) {
                entry2 = entry;
                profileId = legacyId;
            }
        }
        if (entry2 == null) {
            let legacyId1 = "id/" + provider + "/" + td.replaceAll(providerUserId, ":", "/");
            let entry1 = await passcodesContainer.getAsync(legacyId1);
            if (isGoodPub(entry1, "userpointer") && await getPubAsync(entry1["userid"], "user") != null) {
                entry2 = entry1;
                profileId = legacyId1;
            }
        }
        // If we have a legacy pointer, update it
        if (modernId != profileId && entry2 != null) {
            await passcodesContainer.updateAsync(modernId, async (entry3: JsonBuilder) => {
                td.jsonCopyFrom(entry3, entry2);
            });
        }
    }

    let jsb = (<JsonBuilder>null);
    if (isGoodPub(entry2, "userpointer")) {
        let entry31 = await getPubAsync(entry2["userid"], "user");
        if (entry31 != null) {
            jsb = clone(entry31);
            if (orEmpty(jsb["login"]) != profileId) {
                await pubsContainer.updateAsync(jsb["id"], async (entry4: JsonBuilder) => {
                    entry4["login"] = profileId;
                });
                jsb["login"] = profileId;
            }
        }
    }
    if (jsb == null) {
        let email = profile.email;
        let username = profile.name.replace(/\s.*/g, "");
        if (provider == "google") {
            // New Google accounts blocked for now.
            return "/";
        }
        logger.tick("PubUser@federated");
        jsb = await createNewUserAsync(username, email, profileId, "", profile.name, false);
    }
    else {
        logger.tick("Login@federated");
        let uidOverride = withDefault(oauthReq._client_oauth.u, jsb["id"]);
        if (uidOverride != jsb["id"]) {
            logger.info("login with override: " + jsb["id"] + "->" + uidOverride);
            if (hasPermission(clone(jsb), "signin-" + uidOverride)) {
                let entry41 = await getPubAsync(uidOverride, "user");
                if (entry41 != null) {
                    logger.debug("login with override OK: " + jsb["id"] + "->" + uidOverride);
                    jsb = clone(entry41);
                }
            }
        }
    }
    let user = jsb["id"];
    let [token, cookie] = await generateTokenAsync(user, profileId, oauthReq._client_oauth.client_id);

    let redirectUrl = td.replaceAll(profile.redirectPrefix, "TOKEN", encodeURIComponent(token)) + "&id=" + user;
    if (cookie != "") {
        redirectUrl = redirectUrl + "&td_cookie=" + cookie;
    }
    await refreshSettingsAsync();
    let session = new LoginSession();
    session.termsOk = orEmpty(jsb["termsversion"]) == theServiceSettings.termsversion;
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
            let groupJson = await getPubAsync(session.groupid, "group");
            session.pass = session.passwords[orZero(req.query()["td_password"])];
            if (session.pass == null) {
                session.pass = session.passwords[0];
            }
            // this can go negative; maybe we should reject it in this case?
            await pubsContainer.updateAsync(session.ownerId, async (entry: JsonBuilder) => {
                jsonAdd(entry, "credit", -1);
            });
            logger.tick("PubUser@code");
            let jsb = await createNewUserAsync(tdUsername, "", normalizeAndHash(session.pass), ",student,", "", initialApprovals);
            let user2 = jsb["id"];

            await auditLogAsync(buildAuditApiRequest(req), "user-create-code", {
                userid: session.ownerId,
                subjectid: user2,
                publicationid: session.groupid,
                publicationkind: "group",
                newvalue: clone(jsb)
            });
            if (initialApprovals) {
                await addGroupApprovalAsync(groupJson, clone(jsb));
            }
            else {
                await addUserToGroupAsync(user2, groupJson, (<ApiRequest>null));
            }
            session.redirectUri = await getRedirectUrlAsync(user2, req);
            await serverAuth.options().setData(session.state, JSON.stringify(session.toJson()));
        }
        let [url, cook] = stripCookie(session.redirectUri);
        if (cook != "") {
            res.setHeader("Set-Cookie", cook);
        }
        let lang = await handleLanguageAsync(req, res, false);
        let html = td.replaceAll(await getLoginHtmlAsync("usercreated", lang), "@URL@", url);
        html = td.replaceAll(html, "@USERID@", session.userid);
        html = td.replaceAll(html, "@PASSWORD@", session.pass);
        html = td.replaceAll(html, "@NAME@", htmlQuote(tdUsername));
        setHtmlHeaders(res);
        res.html(html);
    }
}

async function loginHandleCodeAsync(accessCode: string, res: restify.Response, req: restify.Request, session: LoginSession) : Promise<void>
{
    let passId = normalizeAndHash(accessCode);
    let msg = "";
    if (passId == "" || accessCode == "kid") {
    }
    else {
        if (await throttleCoreAsync(sha256(req.remoteIp()) + ":code", 10)) {
            // TODO this should be some nice page
            res.sendError(restify.http()._429TooManyRequests, "Too many login attempts");
            return;
        }
        let codeObj = await passcodesContainer.getAsync(passId);
        if (codeObj == null || codeObj["kind"] == "reserved") {
            msg = "Whoops! The code doesn't seem right. Keep trying!";
        }
        else {
            let kind = codeObj["kind"];
            if (kind == "userpointer") {
                let userJson = await getPubAsync(codeObj["userid"], "user");
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
                    let userjson = await getPubAsync(session.userid, "user");
                    await applyCodeAsync(userjson, codeObj, passId, buildAuditApiRequest(req));
                    accessTokenRedirect(res, session.redirectUri);
                }
            }
            else if (kind == "groupinvitation") {
                let groupJson = await getPubAsync(codeObj["groupid"], "group");
                if (session.userid != "") {
                    msg = "We need an activation code here, not group code.";
                }
                else if (groupJson == null) {
                    msg = "Group gone?";
                }
                else {
                    session.ownerId = groupJson["pub"]["userid"];
                    let groupOwner = await getPubAsync(session.ownerId, "user");
                    if (orZero(groupOwner["credit"]) <= 0) {
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
        await refreshSettingsAsync();
        let inner = "kidornot";
        if (accessCode == "kid") {
            inner = "kidcode";
        }
        if (session.passwords != null) {
            let links = "";
            for (let i = 0; i < session.passwords.length; i++) {
                links = links + "<button type=\"button\" class=\"button provider\" href=\"#\" onclick=\"passwordok(" + i + ")\">" + session.passwords[i] + "</button><br/>\n";
            }
            let lang2 = await handleLanguageAsync(req, res, true);
            inner = td.replaceAll(td.replaceAll(await getLoginHtmlAsync("newuser", lang2), "@PASSWORDS@", links), "@SESSION@", session.state);
            setHtmlHeaders(res);
            res.html(td.replaceAll(inner, "@MSG@", msg));
            return;
        }
        else if (session.userid != "") {
            let termsversion = orEmpty(req.query()["td_agree"]);
            if (termsversion == "noway") {
                await serverAuth.options().setData(session.state, "{}");
                if (session.userid != "") {
                    let delEntry = await getPubAsync(session.userid, "user");
                    if (delEntry != null && ! delEntry["termsversion"] && ! delEntry["permissions"]) {
                        let delok = await deleteAsync(delEntry);
                        await pubsContainer.updateAsync(session.userid, async (entry: JsonBuilder) => {
                            entry["settings"] = ({});
                            entry["pub"] = ({});
                            entry["login"] = "";
                            entry["permissions"] = "";
                        });
                    }
                }
                res.redirect(302, "/");
                return;
            }
            if ( ! session.termsOk && termsversion == theServiceSettings.termsversion) {
                session.termsOk = true;
                await serverAuth.options().setData(session.state, JSON.stringify(session.toJson()));
                if (termsversion != "") {
                    await pubsContainer.updateAsync(session.userid, async (entry1: JsonBuilder) => {
                        entry1["termsversion"] = termsversion;
                    });
                }
                await auditLogAsync(buildAuditApiRequest(req), "user-agree", {
                    userid: session.userid,
                    subjectid: session.userid,
                    data: termsversion,
                    newvalue: await getPubAsync(session.userid, "user")
                });
            }
            if ( ! session.termsOk) {
                inner = "agree";
            }
            else if ( ! session.codeOk) {
                inner = "activate";
            }
            else {
                res.redirect(303, session.redirectUri);
            }
        }
        if ( ! res.finished()) {
            let agreeurl = "/oauth/dialog?td_session=" + encodeURIComponent(session.state) + "&td_agree=" + encodeURIComponent(theServiceSettings.termsversion);
            let disagreeurl = "/oauth/dialog?td_session=" + encodeURIComponent(session.state) + "&td_agree=noway";
            let lang21 = await handleLanguageAsync(req, res, true);
            res.html(td.replaceAll(td.replaceAll(td.replaceAll(await getLoginHtmlAsync(inner, lang21), "@MSG@", msg), "@AGREEURL@", agreeurl), "@DISAGREEURL@", disagreeurl));
        }
    }
}

function setGroupProps(group: PubGroup, body: JsonObject) : void
{
    let bld = clone(group.toJson());
    setFields(bld, body, "description\nschool\ngrade\nallowappstatistics\nallowexport\nisrestricted\npictureid");
    group.fromJson(clone(bld));
}

async function addUserToGroupAsync(userid: string, gr: JsonObject, auditReq: ApiRequest) : Promise<void>
{
    let sub = new PubGroupMembership();
    sub.id = "gm-" + userid + "-" + gr["id"];
    sub.userid = userid;
    sub.time = await nowSecondsAsync();
    sub.publicationid = gr["id"];
    let jsb = {};
    jsb["pub"] = sub.toJson();
    jsb["id"] = sub.id;
    await groupMemberships.insertAsync(jsb);
    let pub = gr["pub"];
    if (pub["isclass"]) {
        await pubsContainer.updateAsync(userid, async (entry: JsonBuilder) => {
            let grps = setBuilderIfMissing(entry, "groups");
            grps[gr["id"]] = 1;
            if (pub["userid"] == userid) {
                let dictionary = setBuilderIfMissing(entry, "owngroups");
                dictionary[gr["id"]] = 1;
            }
        });
    }
    if (auditReq != null) {
        await auditLogAsync(auditReq, "join-group", {
            userid: pub["userid"],
            subjectid: userid,
            publicationid: gr["id"],
            publicationkind: "group"
        });
    }
}

function handleBasicAuth(req: restify.Request, res: restify.Response) : void
{
    if (res.finished()) {
        return;
    }
    setHtmlHeaders(res);
    handleHttps(req, res);
    if (nonSelfRedirect != "" && ! res.finished()) {
        if (req.header("host").toLowerCase() != myHost) {
            if (nonSelfRedirect == "soon") {
                res.html(notFound_html, {
                    status: 404
                });
            }
            else if (nonSelfRedirect == "self") {
                res.redirect(restify.http()._301MovedPermanently, self.replace(/\/$/g, "") + req.url());
            }
            else {
                res.redirect(restify.http()._302MovedTemporarily, nonSelfRedirect);
            }
        }
    }
    if ( ! res.finished() && basicCreds != "") {
        if (orEmpty(req.query()["anon_token"]) == basicCreds) {
            // OK
        }
        else {
            let value = req.header("authorization");
            if (value == null || value != basicCreds) {
                res.setHeader("WWW-Authenticate", "Basic realm=\"TD Lite\"");
                res.sendError(401, "Authentication required");
            }
        }
    }
}

async function _initAbusereportsAsync() : Promise<void>
{
    abuseReports = await indexedStore.createStoreAsync(pubsContainer, "abusereport");
    await setResolveAsync(abuseReports, async (fetchResult: indexedStore.FetchResult, apiRequest: ApiRequest) => {
        let users = await followPubIdsAsync(fetchResult.items, "publicationuserid", "");
        let withUsers = await addUsernameEtcCoreAsync(fetchResult.items);
        let coll = (<PubAbusereport[]>[]);
        let x = 0;
        for (let jsb of withUsers) {
            if (jsb["pub"]["userid"] == apiRequest.userid || callerIsFacilitatorOf(apiRequest, users[x]) || callerIsFacilitatorOf(apiRequest, unsafeToJson(jsb["*userid"]))) {
                let report = PubAbusereport.createFromJson(unsafeToJson(jsb["pub"]));
                report.text = decrypt(report.text);
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
    addRoute("GET", "*user", "abuses", async (req: ApiRequest) => {
        await anyListAsync(abuseReports, req, "publicationuserid", req.rootId);
    });
    addRoute("POST", "*abusereport", "", async (req1: ApiRequest) => {
        let pub = req1.rootPub["pub"];
        await checkFacilitatorPermissionAsync(req1, pub["publicationuserid"]);
        if (req1.status == 200) {
            let res = req1.body["resolution"];
            await pubsContainer.updateAsync(req1.rootId, async (entry1: JsonBuilder) => {
                setFields(entry1["pub"], req1.body, "resolution");
            });
            await pubsContainer.updateAsync(pub["publicationid"], async (entry2: JsonBuilder) => {
                entry2["abuseStatus"] = res;
                delete entry2["abuseStatusPosted"];
            });
            req1.response = ({});
        }
    });
    addRoute("POST", "*pub", "abusereports", async (req2: ApiRequest) => {
        await canPostAsync(req2, "abusereport");
        if (req2.status == 200) {
            await postAbusereportAsync(req2);
        }
    });
    addRoute("DELETE", "*pub", "", async (req3: ApiRequest) => {
        if (canBeAdminDeleted(req3.rootPub)) {
            await checkDeletePermissionAsync(req3);
            if (req3.status == 200) {
                await auditLogAsync(req3, "delete", {
                    oldvalue: await auditDeleteValueAsync(req3.rootPub)
                });
                await deletePubRecAsync(req3.rootPub);
                req3.response = ({});
            }
        }
        else {
            req3.status = restify.http()._405MethodNotAllowed;
        }
    });
    addRoute("GET", "*pub", "candelete", async (req4: ApiRequest) => {
        let resp = new CandeleteResponse();
        let pub1 = req4.rootPub["pub"];
        resp.publicationkind = req4.rootPub["kind"];
        resp.publicationname = withDefault(pub1["name"], "/" + req4.rootId);
        resp.publicationuserid = getAuthor(pub1);
        resp.candeletekind = canBeAdminDeleted(req4.rootPub) || hasSpecialDelete(req4.rootPub);
        let reports = await abuseReports.getIndex("publicationid").fetchAsync(req4.rootId, ({"count":10}));
        resp.hasabusereports = reports.items.length > 0 || reports.continuation != "";
        if (resp.candeletekind) {
            await checkDeletePermissionAsync(req4);
            if (req4.status == 200) {
                resp.candelete = true;
                if (resp.publicationuserid == req4.userid) {
                    await checkFacilitatorPermissionAsync(req4, resp.publicationuserid);
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

async function checkFacilitatorPermissionAsync(req: ApiRequest, subjectUserid: string) : Promise<void>
{
    if (req.userid == "") {
        req.status = restify.http()._401Unauthorized;
    }
    if (req.status == 200) {
        let userjs = await getPubAsync(subjectUserid, "user");
        if (userjs == null) {
            checkPermission(req, "root");
            return;
        }
        if ( ! callerIsFacilitatorOf(req, userjs)) {
            req.status = restify.http()._402PaymentRequired;
        }
        else {
            // You need to have all of subject's permission to delete their stuff.
            checkPermission(req, getPermissionLevel(userjs));
        }
    }
}

async function followPubIdsAsync(fetchResult: JsonObject[], field: string, kind: string) : Promise<JsonObject[]>
{
    let pubs: JsonObject[];
    let ids = (<string[]>[]);
    for (let js of fetchResult) {
        let s = js["pub"][field];
        ids.push(s);
    }
    pubs = await pubsContainer.getManyAsync(ids);
    if (kind != "") {
        pubs = pubs.filter(elt => isGoodPub(elt, kind));
    }
    else {
        pubs = pubs.map<JsonObject>((elt1: JsonObject) => {
            let result: JsonObject;
            if (elt1 == null || elt1["kind"] == "reserved") {
                return (<JsonObject>null);
            }
            else {
                return elt1;
            }
            return result;
        });
    }
    return pubs;
}

async function deletePubRecAsync(delEntry: JsonObject) : Promise<void>
{
    if (delEntry["kind"] == "review") {
        let delok3 = await deleteReviewAsync(delEntry);
    }
    else {
        let delok = await deleteAsync(delEntry);
        if (delok) {
            // TODO handle updateId stuff for scripts
            // TODO delete comments on this publication
            // TODO update comment counts
            let kind = delEntry["kind"];
            let entryid = delEntry["id"];
            if (kind == "group") {
                let memberships = await groupMemberships.getIndex("publicationid").fetchAllAsync(entryid);
                await parallel.forJsonAsync(memberships, async (json: JsonObject) => {
                    let uid = json["pub"]["userid"];
                    let delok2 = await deleteAsync(json);
                    await pubsContainer.updateAsync(uid, async (entry: JsonBuilder) => {
                        delete setBuilderIfMissing(entry, "groups")[entryid];
                        delete setBuilderIfMissing(entry, "owngroups")[entryid];
                    });
                });
            }
            else if (kind == "pointer") {
                await clearPtrCacheAsync(entryid);
            }
            else if (kind == "script") {
                await scriptText.updateAsync(entryid, async (entry1: JsonBuilder) => {
                    for (let fld of Object.keys(entry1)) {
                        delete entry1[fld];
                    }
                });
            }
            else if (kind == "art" || kind == "screenshot") {
                await artContainer.deleteBlobAsync(entryid);
                for (let thumbContainer of thumbContainers) {
                    await thumbContainer.container.deleteBlobAsync(entryid);
                }
            }
            let abuses = await abuseReports.getIndex("publicationid").fetchAllAsync(entryid);
            await parallel.forJsonAsync(abuses, async (json1: JsonObject) => {
                await pubsContainer.updateAsync(json1["id"], async (entry2: JsonBuilder) => {
                    entry2["pub"]["resolution"] = "deleted";
                });
            });

        }
    }
}

function meOnly(req: ApiRequest) : void
{
    if (req.rootId != req.userid) {
        checkMgmtPermission(req, "me-only");
    }
}

function normalizePermissions(perm: string) : string
{
    let perm2: string;
    perm = orEmpty(perm).replace(/,+/g, ",");
    if (perm == "") {
        perm2 = "";
    }
    else {
        if ( ! td.startsWith(perm, ",")) {
            perm = "," + perm;
        }
        if ( ! perm.endsWith(",")) {
            perm = perm + ",";
        }
        perm2 = perm;
    }
    return perm2;
}

async function mbedCompileAsync(req: ApiRequest) : Promise<void>
{
    let compileReq = CompileReq.createFromJson(req.body);
    let name = "my script";
    if (compileReq.meta != null) {
        name = withDefault(compileReq.meta["name"], name);
    }
    name = name.replace(/[^a-zA-Z0-9]+/g, "-");
    let cfg = await settingsContainer.getAsync("compile");
    let sha = sha256(JSON.stringify(compileReq.toJson()) + "/" + mbedVersion + "/" + cfg["__version"]).substr(0, 32);
    let info = await compileContainer.getBlobToTextAsync(sha + ".json");
    let compileResp = new CompileResp();
    compileResp.statusurl = compileContainer.url() + "/" + sha + ".json";
    logger.info("mbed compile: " + compileResp.statusurl);
    let hit = false;
    if (info.succeded()) {
        let js = JSON.parse(info.text());
        if (mbedCache && js["success"]) {
            hit = true;
        }
        else {
            await compileContainer.deleteBlobAsync(sha + ".json");
            logger.tick("MbedCacheHitButRetry");
        }
    }
    if (hit) {
        logger.tick("MbedCacheHit");
        req.response = compileResp.toJson();
    }
    else if (cfg[compileReq.config] == null) {
        req.status = restify.http()._412PreconditionFailed;
    }
    else {
        if (compileReq.source.length > 200000) {
            req.status = restify.http()._413RequestEntityTooLarge;
        }
        let numrepl = 0;
        let src = td.replaceFn(compileReq.source, /#(\s*include\s+[<"]([a-zA-Z0-9\/\.\-]+)[">]|if\s+|ifdef\s+|else\s+|elif\s+|line\s+)?/g, (elt: string[]) => {
            let result: string;
            let body = orEmpty(elt[1]);
            if (elt.length > 1 && body != "") {
                result = "#" + body;
            }
            else {
                result = "\\x23";
                numrepl += 1;
            }
            return result;
        });
        src = td.replaceAll(src, "%:", "\\x25\\x3A");
        if (numrepl > 0) {
            logger.info("replaced some hashes, " + src.substr(0, 500));
        }
        await throttleAsync(req, "compile", 20);
        if (req.status == 200) {
            let isFota = false;
            if (compileReq.config.endsWith("-fota")) {
                isFota = true;
                compileReq.config = compileReq.config.replace(/-fota$/g, "");
            }
            let json0 = cfg[compileReq.config];
            if (json0 == null) {
                req.status = restify.http()._404NotFound;
                return;
            }
            let ccfg = CompilerConfig.createFromJson(json0);
            if (isFota) {
                ccfg.target_binary = td.replaceAll(orEmpty(ccfg.target_binary), "-combined", "");
            }
            if (! ccfg.repourl) {
                req.status = restify.http()._404NotFound;
                return;
            }
            ccfg.hexfilename = td.replaceAll(ccfg.hexfilename, "SCRIPT", name);
            if (orEmpty(ccfg.internalUrl) != "") {
                if (/^[\w.\-]+$/.test(orEmpty(compileReq.repohash)) && compileReq.repohash.length < 60) {
                    ccfg.repourl = compileReq.repohash;
                }
                if (/^[a-f0-9]+$/.test(ccfg.repourl) && ccfg.repourl.length == 64) {
                    // OK, looks like image ID
                }
                else {
                    let tags = await settingsContainer.getAsync("compiletag");
                    if (tags == null) {
                        tags = ({});
                    }
                    let imgcfg = tags[compileReq.config + "-" + ccfg.repourl];
                    if (imgcfg == null) {
                        imgcfg = tags[ccfg.repourl];
                    }
                    if (imgcfg == null) {
                        imgcfg = "";
                    }
                    let imgid = orEmpty(td.toString(imgcfg));
                    if (imgid == "") {
                        logger.info("cannot find repo: " + ccfg.repourl);
                        req.status = restify.http()._404NotFound;
                        return;
                    }
                    logger.debug("found image: " + ccfg.repourl + " -> " + imgid);
                    ccfg.repourl = imgid;
                }
                let jsb = {};
                jsb["maincpp"] = src;
                jsb["op"] = "build";
                jsb["image"] = ccfg.repourl;
                /* async */ mbedintDownloadAsync(sha, jsb, ccfg);
                req.response = compileResp.toJson();
            }
            else if (! ccfg.target_binary) {
                req.status = restify.http()._404NotFound;
            }
            else {
                if (/^[\w.\-]+$/.test(orEmpty(compileReq.repohash))) {
                    ccfg.repourl = ccfg.repourl.replace(/#.*/g, "#" + compileReq.repohash);
                }
                logger.debug("compile at " + ccfg.repourl);
                let compile = mbedworkshopCompiler.createCompilation(ccfg.platform, ccfg.repourl, ccfg.target_binary);
                compile.replaceFiles["/source/main.cpp"] = src;
                let started = await compile.startAsync();
                if ( ! started) {
                    logger.tick("MbedWsCompileStartFailed");
                    req.status = restify.http()._424FailedDependency;
                }
                else {
                    /* async */ mbedwsDownloadAsync(sha, compile, ccfg);
                    req.response = compileResp.toJson();
                }
            }
        }
    }
}

function sha256(hashData: string) : string
{
    let sha: string;
    let hash = crypto.createHash("sha256");
    hash.update(hashData, "utf8");
    sha = hash.digest().toString("hex").toLowerCase();
    return sha;
}

function handleHttps(req: restify.Request, res: restify.Response) : void
{
    if (hasHttps && ! req.isSecure() && ! td.startsWith(req.serverUrl(), "http://localhost:")) {
        res.redirect(302, req.serverUrl().replace(/^http/g, "https") + req.url());
    }
}

function setFields(bld: JsonBuilder, body: JsonObject, fields: string) : void
{
    for (let fld of fields.split("\n")) {
        if (body.hasOwnProperty(fld) && typeof body[fld] == typeof bld[fld]) {
            bld[fld] = body[fld];
        }
    }
}

async function addSubscriptionAsync(follower: string, celebrity: string) : Promise<void>
{
    let sub = new PubSubscription();
    sub.id = "s-" + follower + "-" + celebrity;
    if (follower != celebrity && await getPubAsync(sub.id, "subscription") == null) {
        sub.userid = follower;
        sub.time = await nowSecondsAsync();
        sub.publicationid = celebrity;
        sub.publicationkind = "user";
        let jsb = {};
        jsb["pub"] = sub.toJson();
        jsb["id"] = sub.id;
        await subscriptions.insertAsync(jsb);
        await pubsContainer.updateAsync(sub.publicationid, async (entry: JsonBuilder) => {
            increment(entry, "subscribers", 1);
        });
    }
}

function canBeAdminDeleted(jsonpub: JsonObject) : boolean
{
    let b: boolean;
    b = /^(art|screenshot|comment|script|group|publist|channel|pointer)$/.test(jsonpub["kind"]);
    return b;
}

async function checkDeletePermissionAsync(req: ApiRequest) : Promise<void>
{
    let pub = req.rootPub["pub"];
    let authorid = pub["userid"];
    if (pub["kind"] == "user") {
        authorid = pub["id"];
    }
    if (authorid != req.userid) {
        await checkFacilitatorPermissionAsync(req, authorid);
    }
}

async function canPostAsync(req: ApiRequest, kind: string) : Promise<void>
{
    if (req.userid == "") {
        req.status = restify.http()._401Unauthorized;
    }
    else {
        checkPermission(req, "post-" + kind);
        if (req.status == 200) {
            if (callerHasPermission(req, "post-raw") || callerHasPermission(req, "unlimited")) {
                // no throttle
            }
            else {
                await throttleAsync(req, "pub", 60);
            }
        }
    }
}

async function getUser_sGroupsAsync(subjectUserid: string) : Promise<JsonObject[]>
{
    let groups: JsonObject[];
    let fetchResult = await groupMemberships.getIndex("userid").fetchAllAsync(subjectUserid);
    groups = await followPubIdsAsync(fetchResult, "publicationid", "group");
    return groups;
}

async function removeSubscriptionAsync(follower: string, celebrity: string) : Promise<void>
{
    let subid = "s-" + follower + "-" + celebrity;
    let entry2 = await getPubAsync(subid, "subscription");
    if (entry2 != null) {
        let delok = await deleteAsync(entry2);
        if (delok) {
            await pubsContainer.updateAsync(celebrity, async (entry: JsonBuilder) => {
                increment(entry, "subscribers", -1);
            });
        }
    }
}

async function deleteAsync(delEntry: JsonObject) : Promise<boolean>
{
    let delok: boolean;
    if (delEntry == null || delEntry["kind"] == "reserved") {
        delok = false;
    }
    else {
        let store = indexedStore.storeByKind(delEntry["kind"]);
        if (store == null) {
            store = scripts;
        }
        delok = await store.deleteAsync(delEntry["id"]);
    }
    return delok;
}

async function getNotificationsAsync(req: ApiRequest, long: boolean) : Promise<void>
{
    if (req.rootId == "all") {
        checkPermission(req, "global-list");
    }
    else if (req.rootPub["kind"] == "group") {
        let pub = req.rootPub["pub"];
        if (pub["isclass"]) {
            let b = req.userinfo.json["groups"].hasOwnProperty(pub["id"]);
            if ( ! b) {
                checkPermission(req, "global-list");
            }
        }
    }
    else {
        meOnly(req);
    }
    if (req.status != 200) {
        return;
    }
    let v = await longPollAsync("notifications:" + req.rootId, long, req);
    if (req.status == 200) {
        let resQuery = notificationsTable.createQuery().partitionKeyIs(req.rootId);
        let entities = await indexedStore.executeTableQueryAsync(resQuery, req.queryOptions);
        entities.v = v;
        req.response = entities.toJson();
    }
}

async function pokeSubChannelAsync(channel: string) : Promise<void>
{
    let s = td.randomInt(1000000000).toString();
    await redisClient.setAsync(channel, s);
    await redisClient.publishAsync(channel, s);
}

async function getSubChannelAsync(ch: string) : Promise<number>
{
    let v: number;
    let value = await redisClient.getAsync(ch);
    if (value == null) {
        value = td.randomInt(1000000000).toString();
        await redisClient.setAsync(ch, value);
    }
    v = parseFloat(value);
    return v;
}

async function longPollAsync(ch: string, long: boolean, req: ApiRequest) : Promise<number>
{
    let v: number;
    v = await getSubChannelAsync(ch);
    if (long && orZero(req.queryOptions["v"]) == v) {
        logger.contextPause();
        let message = await redisClient.waitOnAsync(ch, 30);
        logger.contextResume();
        if (message == null) {
            req.status = 204;
        }
        else {
            v = await getSubChannelAsync(ch);
        }
    }

    return v;
}

async function throttleCoreAsync(throttleKey: string, tokenCost_s_: number) : Promise<boolean>
{
    let drop: boolean;
    let keys = (<string[]>[]);
    keys.push("throttle:" + throttleKey);
    let args = (<string[]>[]);
    args.push(await redisClient.cachedTimeAsync() + "");
    if (throttleDisabled) {
        // still simulate throttling at 1/1000 of rate (redis writes); below we ignore the result anyway
        args.push(tokenCost_s_ + "");
    }
    else {
        args.push(tokenCost_s_ * 1000 + "");
    }
    // accumulate tokens for up N seconds
    let accumulationSeconds = 3600;
    args.push(accumulationSeconds * 1000 + "");
    // return wait times of up to 10000ms
    args.push("10000");
    let value = await redisClient.evalAsync("local now     = ARGV[1]\nlocal rate    = ARGV[2] or 1000   -- token cost (1000ms - 1 token/seq)\nlocal burst   = ARGV[3] or 3600000    -- accumulate for up to an hour\nlocal dropAt  = ARGV[4] or 10000  -- return wait time of up to 10s; otherwise just drop the request\n\nlocal curr = redis.call(\"GET\", KEYS[1]) or 0\nlocal newHorizon = math.max(now - burst, curr + rate)\nlocal sleepTime  = math.max(0, newHorizon - now)\n\nif sleepTime > tonumber(dropAt) then\n  return -1\nelse\n  redis.call(\"SET\", KEYS[1], newHorizon)\n  return sleepTime\nend", keys, args);
    let sleepTime = td.toNumber(value);
    if (throttleDisabled) {
        sleepTime = 0;
    }
    drop = false;
    if (sleepTime < 0) {
        drop = true;
    }
    else if (sleepTime > 0) {
        await td.sleepAsync(sleepTime / 1000);
    }
    return drop;
}

function hasSpecialDelete(jsonpub: JsonObject) : boolean
{
    let b: boolean;
    b = /^(review|user)$/.test(jsonpub["kind"]);
    return b;
}

async function tryDeletePubPointerAsync(key: string) : Promise<boolean>
{
    let ref = false;
    await pubsContainer.updateAsync(key, async (entry: JsonBuilder) => {
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

async function tryInsertPubPointerAsync(key: string, pointsTo: string) : Promise<boolean>
{
    let ref = false;
    await pubsContainer.updateAsync(key, async (entry: JsonBuilder) => {
        if (withDefault(entry["kind"], "reserved") == "reserved") {
            entry["kind"] = "pubpointer";
            entry["pointer"] = pointsTo;
            entry["id"] = key;
            ref = true;
        }
        else {
            ref = false;
        }
    });
    return ref;
}

async function getPointedPubAsync(key: string, kind: string) : Promise<JsonObject>
{
    let entry: JsonObject;
    let ptr = await getPubAsync(key, "pubpointer");
    if (ptr == null) {
        entry = (<JsonObject>null);
    }
    else {
        entry = await getPubAsync(ptr["pointer"], kind);
    }
    return entry;
}

function sanitze(s: string) : string
{
    let value: string;
    value = s.replace(/access_token=.*/g, "[snip]");
    return value;
}

function sanitizeJson(jsb: JsonBuilder) : void
{
    for (let k of Object.keys(jsb)) {
        let v = jsb[k];
        if (typeof v == "string") {
            jsb[k] = sanitze(td.toString(v));
        }
        else if (typeof v == "object") {
            sanitizeJson(v);
        }
    }
}

function crashAndBurn() : void
{
    assert(false, "/api/logcrash (OK)");
}

function _initBugs() : void
{
    addRoute("GET", "bug", "*", async (req: ApiRequest) => {
        checkPermission(req, "view-bug");
        if (req.status == 200) {
            let info = await crashContainer.getBlobToTextAsync(req.verb);
            if (info.succeded()) {
                let js3 = JSON.parse(decrypt(info.text()));
                req.response = js3;
            }
            else {
                req.status = restify.http()._404NotFound;
            }
        }
    });
    addRoute("POST", "bug", "", async (req1: ApiRequest) => {
        let report = BugReport.createFromJson(req1.body);
        let jsb = ({ "details": { "client": { }, "error": { "stackTrace": [] }, "environment": { }, "request": { "headers": {} }, "user": { }, "context": { } } });
        let timestamp = report.timestamp;
        jsb["occurredOn"] = new Date(timestamp);
        let det = jsb["details"];
        det["machineName"] = orEmpty(report.worldId);
        det["version"] = orEmpty(report.tdVersion);
        det["request"]["headers"]["User-Agent"] = orEmpty(report.userAgent);
        if (fullTD) {
            det["user"]["identifier"] = req1.userid;
        }
        det["error"]["message"] = withDefault(report.exceptionConstructor, "Error");
        det["error"]["innerError"] = orEmpty(report.exceptionMessage);
        report.reportId = "BuG" + (20000000000000 - await redisClient.cachedTimeAsync()) + azureTable.createRandomId(10);
        let js2 = report.toJson();
        let encReport = encrypt(JSON.stringify(js2), "BUG");
        let result4 = await crashContainer.createBlockBlobFromTextAsync(report.reportId, encReport);
        let js = clone(js2);
        delete js["eventTrace"];
        delete js["logMessages"];
        delete js["attachments"];
        det["userCustomData"] = js;
        let trace = det["error"]["stackTrace"];
        let s = td.replaceFn(orEmpty(report.stackTrace), /^[^@\s]*:\d+/g, (elt: string[]) => {
            let result: string;
            result = "   at " + elt[0];
            return result;
        });
        s = td.replaceFn(s, /^([^@\s]*)@(.*)/g, (elt1: string[]) => {
            let result1: string;
            result1 = "   at " + elt1[1] + " (" + elt1[2] + ")";
            return result1;
        });
        s = td.replaceFn(s, / at (\S+?):([\d:]+)$/g, (elt2: string[]) => {
            let result2: string;
            result2 = " at nofn (" + elt2[1] + ":" + elt2[2] + ")";
            return result2;
        });
        s = td.replaceFn(s, / at (\S+)[^(]*(\((\S+?):([\d:]+)\))?/g, (elt3: string[]) => {
            let result3: string;
            let st = {};
            st["methodName"] = elt3[1];
            st["fileName"] = withDefault(elt3[3], "unknown");
            st["lineNumber"] = parseFloat(withDefault(elt3[4], "1").replace(/:.*/g, ""));
            trace.push(clone(st));
            result3 = "";
            return result3;
        });
        if (trace.length == 0) {
            let st1 = {};
            st1["lineNumber"] = orZero(report.line);
            trace.push(clone(st1));
        }
        else {
            for (let jsb2 of trace) {
                let grps = (/^([^\.]+)\.(.*)/.exec(orEmpty(jsb2["methodName"])) || []);
                if (grps.length > 2) {
                    jsb2["className"] = grps[1];
                    jsb2["methodName"] = grps[2];
                }
                else {
                    jsb2["className"] = "X";
                }
            }
        }
        logger.info("stored crash: " + report.reportId);
        if (! report.tdVersion) {
            // Skip reporting of errors from local builds.
        }
        else {
            sanitizeJson(jsb);
            let creq = td.createRequest("https://api.raygun.io/entries");
            creq.setHeader("X-ApiKey", td.serverSetting("RAYGUN_API_KEY2", false));
            creq.setMethod("post");
            creq.setContentAsJson(clone(jsb));
            let response = await creq.sendAsync();
            logger.debug("raygun: " + response + "");
        }
        req1.response = ({});
    }
    , {
        noSizeCheck: true
    });
}

function saltFilename(plain: string) : string
{
    let salted: string;
    salted = plain + sha256("filesalt:" + tokenSecret + plain).substr(0, 20);
    return salted;
}

/**
 * TODO include access token for the compile service
 */
async function deployCompileServiceAsync(rel: PubRelease, req: ApiRequest) : Promise<void>
{
    let cfg = {};
    let clientConfig = clientConfigForRelease(rel);
    cfg["TDC_AUTH_KEY"] = td.serverSetting("TDC_AUTH_KEY", false);
    cfg["TDC_ACCESS_TOKEN"] = td.serverSetting("TDC_ACCESS_TOKEN", false);
    cfg["TDC_LITE_STORAGE"] = crashContainer.url().replace(/\/[^\/]+$/g, "");
    cfg["TDC_API_ENDPOINT"] = clientConfig.rootUrl + "/api/";
    cfg["TD_RELEASE_ID"] = rel.releaseid;
    cfg["TD_CLIENT_CONFIG"] = JSON.stringify(clientConfig.toJson());
    let jsSrc = "";
    for (let k of Object.keys(cfg)) {
        jsSrc = jsSrc + "process.env." + k + " = " + JSON.stringify(cfg[k]) + ";\n";
    }
    jsSrc = jsSrc + "require(\"./noderunner.js\");\n";
    let jsb = ({ "files": [ {
  "path": "script/compiled.js"
}, {
  "path": "script/noderunner.js"
}] });
    let file = {};
    jsb["files"][0]["content"] = jsSrc;
    jsb["files"][1]["url"] = appContainer.url() + "/" + rel.releaseid + "/c/noderunner.js";
    if (false) {
        logger.debug("cloud JS: " + JSON.stringify(clone(jsb), null, 2));
    }

    let request = td.createRequest(td.serverSetting("TDC_ENDPOINT", false) + "deploy");
    request.setMethod("post");
    request.setContentAsJson(clone(jsb));
    let response = await request.sendAsync();
    logger.info("cloud deploy: " + response);

    let requestcfg = td.createRequest(td.serverSetting("TDC_ENDPOINT", false) + "setconfig");
    requestcfg.setMethod("post");
    requestcfg.setContentAsJson(({"AppSettings":
  [
     {"Name":"TD_RESTART_INTERVAL","Value":"900"}
  ]
}));
    let response2 = await requestcfg.sendAsync();
    logger.info("cloud deploy cfg: " + response2);

    // ### give it time to come up and reindex docs
    // TODO enable this back
    if (false) {
        await td.sleepAsync(60);
        await importDoctopicsAsync(req);
        // await tdliteSearch.indexDocsAsync();
        logger.info("docs reindexed");
    }
}

async function forwardToCloudCompilerAsync(req: ApiRequest, api: string) : Promise<void>
{
    let resp = await queryCloudCompilerAsync(api);
    if (resp == null) {
        req.status = restify.http()._400BadRequest;
    }
    else {
        req.response = resp;
    }
}

async function _initChannelsAsync() : Promise<void>
{
    channels = await indexedStore.createStoreAsync(pubsContainer, "channel");
    await setResolveAsync(channels, async (fetchResult: indexedStore.FetchResult, apiRequest: ApiRequest) => {
        await addUsernameEtcAsync(fetchResult);
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
    addRoute("POST", "channels", "", async (req: ApiRequest) => {
        await canPostAsync(req, "channel");
        if (req.status == 200) {
            let body = req.body;
            let lst = new PubChannel();
            lst.name = withDefault(body["name"], "unnamed");
            setChannelProps(lst, body);
            lst.userid = req.userid;
            lst.userplatform = getUserPlatforms(req);
            let jsb1 = {};
            jsb1["pub"] = lst.toJson();
            await generateIdAsync(jsb1, 8);
            await channels.insertAsync(jsb1);
            await storeNotificationsAsync(req, jsb1, "");
            await scanAndSearchAsync(jsb1);
            await returnOnePubAsync(channels, clone(jsb1), req);
        }
    });
    addRoute("POST", "*channel", "", async (req1: ApiRequest) => {
        checkChannelPermission(req1, req1.rootPub);
        if (req1.status == 200) {
            await updateAndUpsertAsync(pubsContainer, req1, async (entry: JsonBuilder) => {
                let lst1 = PubChannel.createFromJson(clone(entry["pub"]));
                setChannelProps(lst1, req1.body);
                entry["pub"] = lst1.toJson();
            });
            req1.response = ({});
        }
    });
    channelMemberships = await indexedStore.createStoreAsync(pubsContainer, "channelmembership");
    await setResolveAsync(channelMemberships, async (fetchResult1: indexedStore.FetchResult, apiRequest1: ApiRequest) => {
        let store = scripts;
        if (apiRequest1.verb == "channels") {
            store = channels;
            fetchResult1.items = td.arrayToJson(await followPubIdsAsync(fetchResult1.items, "channelid", store.kind));
        }
        else {
            let pubs = await followIdsAsync(fetchResult1.items, "updateKey", "updateslot");
            fetchResult1.items = td.arrayToJson(await followIdsAsync(td.arrayToJson(pubs), "scriptId", "script"));
            let opts = apiRequest1.queryOptions;
            // ?applyupdates=true no longer needed - already applied - perf opt
            delete opts['applyupdates']
        }
        await (<DecoratedStore><any>store).myResolve(fetchResult1, apiRequest1);
    });
    await channelMemberships.createIndexAsync("channelid", entry1 => entry1["pub"]["channelid"]);
    await channelMemberships.createIndexAsync("updatekey", entry2 => orEmpty(entry2["updateKey"]));
    await channelMemberships.createIndexAsync("channelsof", entry3 => orEmpty(entry3["channelsof"]));
    addRoute("GET", "*script", "channels", async (req2: ApiRequest) => {
        let key = req2.rootPub["updateKey"];
        if (req2.argument == "") {
            await anyListAsync(channelMemberships, req2, "updatekey", key);
        }
        else {
            let entry21 = await getPubAsync(req2.argument, "channel");
            if (entry21 == null) {
                req2.status = 404;
            }
            else {
                let s2 = "gm-" + key + "-" + entry21["id"];
                let entry31 = await getPubAsync(s2, "channelmembership");
                if (entry31 == null) {
                    req2.status = 404;
                }
                else {
                    await returnOnePubAsync(channelMemberships, entry31, req2);
                }
            }
        }
    });
    addRoute("GET", "*script", "channelsof", async (req3: ApiRequest) => {
        if (req3.argument == "me") {
            req3.argument = req3.userid;
        }
        let userJs = await getPubAsync(req3.argument, "user");
        if (userJs == null) {
            req3.status = 404;
        }
        else {
            let key1 = req3.rootPub["updateKey"];
            await anyListAsync(channelMemberships, req3, "channelsof", key1 + ":" + userJs["id"]);
        }
    });
    addRoute("POST", "*script", "channels", async (req4: ApiRequest) => {
        let [memid, listJs] = await channelOpAsync(req4);
        if (memid != "") {
            let memJson = await getPubAsync(memid, "channelmembership");
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
    addRoute("DELETE", "*script", "channels", async (req5: ApiRequest) => {
        let [memid1, listJs1] = await channelOpAsync(req5);
        if (memid1 != "") {
            let memJson1 = await getPubAsync(memid1, "channelmembership");
            if (memJson1 == null) {
                req5.status = 404;
            }
            else {
                let delok = await deleteAsync(memJson1);
                req5.response = ({});
            }
        }
    });
    addRoute("GET", "*channel", "scripts", async (req6: ApiRequest) => {
        await anyListAsync(channelMemberships, req6, "channelid", req6.rootId);
    });
}

function setChannelProps(lst: PubChannel, body: JsonObject) : void
{
    let bld = clone(lst.toJson());
    setFields(bld, body, "description\npictureid");
    lst.fromJson(clone(bld));
}

function checkChannelPermission(req: ApiRequest, listJs: JsonObject) : void
{
    if (req.userid == listJs["pub"]["userid"]) {
    }
    else {
        checkPermission(req, "pub-mgmt");
    }
}

async function followIdsAsync(fetchResult: JsonObject[], field: string, kind: string) : Promise<JsonObject[]>
{
    let pubs: JsonObject[];
    let ids = (<string[]>[]);
    for (let js of fetchResult) {
        let s = js[field];
        ids.push(s);
    }
    pubs = (await pubsContainer.getManyAsync(ids)).filter(elt => isGoodPub(elt, kind));
    return pubs;
}

async function channelOpAsync(req: ApiRequest) : Promise<[string, JsonObject]>
{
    let memid: string;
    let listJs: JsonObject;
    memid = "";
    listJs = await getPubAsync(req.argument, "channel");
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

async function importRecAsync(resp: RecImportResponse, id: string) : Promise<void>
{
    resp.attempts += 1;
    let full = resp.fulluser;
    resp.fulluser = false;

    if (! id || resp.ids.hasOwnProperty(id)) {
    }
    else {
        resp.ids[id] = 0;
        let isThere = isGoodEntry(await pubsContainer.getAsync(id));
        if (isThere && ! resp.force && ! full) {
            resp.ids[id] = 409;
            resp.present += 1;
        }
        else {
            let tdapi = "https://www.touchdevelop.com/api/";
            let js = await td.downloadJsonAsync(tdapi + id);
            if (js == null) {
                resp.problems += 1;
            }
            else {
                let coll = []
                coll.push(/* async */ importRecAsync(resp, js["userid"]));
                let kind = js["kind"];
                if (kind == "script") {
                    let jsb = clone(js);
                    if (js["rootid"] != js["id"]) {
                        let js2 = await td.downloadJsonAsync(tdapi + id + "/base");
                        if (js2 != null) {
                            jsb["baseid"] = js2["id"];
                        }
                    }
                    await importRecAsync(resp, jsb["baseid"]);
                    let s = await td.downloadTextAsync(tdapi + id + "/text?original=true&ids=true");
                    jsb["text"] = withDefault(s, "no text");
                    js = clone(jsb);
                }

                if ( ! isThere) {
                    let apiRequest = await importOneAnythingAsync(js);
                    if (apiRequest.status == 200) {
                        resp.imported += 1;
                    }
                    else {
                        resp.problems += 1;
                    }
                }

                if (kind == "script") {
                    for (let js3 of js["librarydependencyids"]) {
                        coll.push(/* async */ importRecAsync(resp, td.toString(js3)));
                    }
                    for (let js31 of js["mergeids"]) {
                        coll.push(/* async */ importRecAsync(resp, td.toString(js31)));
                    }
                }

                coll.push(/* async */ importDepsAsync(resp, js, tdapi, id, "art"));
                coll.push(/* async */ importDepsAsync(resp, js, tdapi, id, "comments"));
                for (let task of coll) {
                    await task;
                }
                resp.ids[id] = 200;
                if (full && kind == "user") {
                    /* async */ importUserScriptsAsync(resp, tdapi, id);
                }
            }
        }
    }
}

async function importDepsAsync(resp: RecImportResponse, js: JsonObject, tdapi: string, id: string, kind: string) : Promise<void>
{
    if (orZero(js[kind]) > 0) {
        let js4 = await td.downloadJsonAsync(tdapi + id + "/" + kind + "?count=1000");
        await parallel.forJsonAsync(js4["items"], async (json: JsonObject) => {
            await importRecAsync(resp, json["id"]);
        });
    }
}

async function importUserScriptsAsync(resp: RecImportResponse, tdapi: string, id: string) : Promise<void>
{
    let keepGoing = true;
    let cont = "";
    while (keepGoing) {
        let js4 = await td.downloadJsonAsync(tdapi + id + "/scripts?applyupdates=true&count=50" + cont);
        await parallel.forJsonAsync(js4["items"], async (json: JsonObject) => {
            await importRecAsync(resp, json["id"]);
        });
        let r = orEmpty(js4["continuation"]);
        logger.info("import batch for " + id + " cont= " + r);
        if (r != "") {
            cont = "&continuation=" + r;
        }
        else {
            keepGoing = false;
        }
    }
}

function searchIndexArt(pub: PubArt) : tdliteSearch.ArtEntry
{
    let entry: tdliteSearch.ArtEntry;
    let tp = "picture";
    if (! pub.pictureurl) {
        tp = "sound";
    }
    let spr = false;
    if (pub.flags != null) {
        spr = pub.flags.indexOf("transparent") >= 0;
    }
    entry = tdliteSearch.createArtEntry(pub.id, {
        name: pub.name,
        description: pub.description,
        type: tp,
        userid: pub.userid,
        username: pub.username,
        sprite: spr
    });
    return entry;
}

async function addUsernameEtcCoreAsync(entities: JsonObject[]) : Promise<JsonBuilder[]>
{
    let coll2: JsonBuilder[];
    let users = await followPubIdsAsync(entities, "userid", "");
    coll2 = (<JsonBuilder[]>[]);
    for (let i = 0; i < entities.length; i++) {
        let userJs = users[i];
        let user = new PubUser();
        let root = clone(entities[i]);
        coll2.push(root);
        if (userJs != null) {
            user.fromJson(userJs["pub"]);
            root["*userid"] = userJs;
        }
        let pub = root["pub"];
        pub["id"] = root["id"];
        pub["kind"] = root["kind"];
        pub["userhaspicture"] = user.haspicture;
        pub["username"] = user.name;
        pub["userscore"] = user.score;
        if ( ! fullTD) {
            pub["userplatform"] = ([]);
        }
    }
    return coll2;
}

async function upsertArtAsync(obj: JsonBuilder) : Promise<void>
{
    if (disableSearch) {
        return;
    }
    let batch = tdliteSearch.createArtUpdate();
    let coll2 = await addUsernameEtcCoreAsync(arts.singleFetchResult(clone(obj)).items);
    let pub = PubArt.createFromJson(clone(coll2[0]["pub"]));
    searchIndexArt(pub).upsertArt(batch);
    /* async */ batch.sendAsync();

    await scanAndSearchAsync(obj, {
        skipScan: true
    });
}

async function importDoctopicsAsync(req: ApiRequest) : Promise<void>
{
    await cacheCloudCompilerDataAsync(await getCloudRelidAsync(true));
    let ids = asArray(doctopics).map<string>(elt => orEmpty(elt["scriptId"])).filter(elt1 => elt1 != "");
    let fetchResult = await scripts.fetchFromIdListAsync(ids, (<JsonObject>null));
    let jsb = {};
    for (let s of ids) {
        jsb[s] = true;
    }
    for (let js of fetchResult.items) {
        delete jsb[js["id"]];
    }

    let resp = new RecImportResponse();
    resp.ids = {};
    ids = Object.keys(jsb);
    await parallel.forAsync(ids.length, async (x: number) => {
        await importRecAsync(resp, ids[x]);
    });
    req.response = resp.toJson();
}

function _initSearch() : void
{
    addRoute("GET", "search", "", async (req: ApiRequest) => {
        // this may be a bit too much to ask
        checkPermission(req, "global-list");
        if (req.status == 200) {
            await executeSearchAsync("", orEmpty(req.queryOptions["q"]), req);
        }
    });
    addRoute("POST", "search", "reindexdocs", async (req1: ApiRequest) => {
        checkPermission(req1, "operator");
        if (req1.status == 200) {
            // /* async */ tdliteSearch.indexDocsAsync();
            req1.response = ({});
        }
    });
    addRoute("POST", "art", "reindex", async (req2: ApiRequest) => {
        checkPermission(req2, "operator");
        if (req2.status == 200) {
            /* async */ arts.getIndex("all").forAllBatchedAsync("all", 100, async (json: JsonObject[]) => {
                let batch = tdliteSearch.createArtUpdate();
                for (let js of await addUsernameEtcCoreAsync(json)) {
                    let pub = PubArt.createFromJson(clone(js["pub"]));
                    searchIndexArt(pub).upsertArt(batch);
                }
                let statusCode = await batch.sendAsync();
                logger.debug("reindex art, status: " + statusCode);
            });
            req2.status = restify.http()._201Created;
        }
    });
    addRoute("POST", "pubs", "reindex", async (req3: ApiRequest) => {
        checkPermission(req3, "operator");
        if (req3.status == 200) {
            /* async */ reindexStoreAsync(arts, req3);
            /* async */ reindexStoreAsync(comments, req3);
            /* async */ reindexStoreAsync(scripts, req3);
            /* async */ reindexStoreAsync(users, req3);
            /* async */ reindexStoreAsync(channels, req3);
            /* async */ reindexStoreAsync(groups, req3);
            /* async */ reindexStoreAsync(pointers, req3);
            req3.status = restify.http()._201Created;
        }
    });
}

async function reindexStoreAsync(store: indexedStore.Store, req: ApiRequest) : Promise<void>
{
    await store.getIndex("all").forAllBatchedAsync("all", 100, async (json: JsonObject[]) => {
        let batch = tdliteSearch.createPubsUpdate();
        let fetchResult = store.singleFetchResult(json);
        fetchResult.items = json;
        await (<DecoratedStore><any>store).myResolve(fetchResult, adminRequest);
        let fieldname = "id";
        let isPtr = store.kind == "pointer";
        if (isPtr) {
            fieldname = "scriptid";
        }
        if (store.kind == "script" || isPtr) {
            let coll = asArray(json).map<string>(elt => orEmpty(elt["pub"][fieldname])).filter(elt1 => elt1 != "");
            let bodies = {};
            let entries = await scriptText.getManyAsync(coll);
            for (let js2 of entries) {
                if (js2.hasOwnProperty("id")) {
                    bodies[js2["id"]] = js2["text"];
                }
            }
            for (let pub of fetchResult.items) {
                if ( ! pub["ishidden"]) {
                    let body = orEmpty(bodies[orEmpty(pub[fieldname])]);
                    let entry = tdliteSearch.toPubEntry(pub, body, pubFeatures(pub), 0);
                    entry.upsertPub(batch);
                }
            }
        }
        else {
            for (let pub1 of fetchResult.items) {
                let entry2 = tdliteSearch.toPubEntry(pub1, withDefault(pub1["text"], ""), pubFeatures(pub1), 0);
                entry2.upsertPub(batch);
            }
        }
        let statusCode = await batch.sendAsync();
        logger.debug("reindex pubs, status: " + statusCode);
    });
}

/**
 * {action:ignoreReturn}
 */
async function updateAndUpsertAsync(container: cachedStore.Container, req: ApiRequest, update:td.Action1<JsonBuilder>) : Promise<JsonBuilder>
{
    let bld: JsonBuilder;
    let last = {}
    await container.updateAsync(req.rootId, async (entry: JsonBuilder) => {
        await update(entry);
        last = entry;
    });
    await scanAndSearchAsync(last);
    return last;
}

async function queryCloudCompilerAsync(api: string) : Promise<JsonObject>
{
    let resp: JsonObject;
    let js = (<JsonObject>null);
    let canCache = /^[\w\/]+$/.test(api);
    if (canCache) {
        js = await cacheCompiler.getAsync(api);
    }
    let ver = await getCloudRelidAsync(false);
    if (js != null && js["version"] == ver) {
        resp = js["resp"];
    }
    else {
        let url = td.serverSetting("TDC_ENDPOINT", false).replace(/-tdevmgmt-.*/g, "") + api + "?access_token=" + td.serverSetting("TDC_AUTH_KEY", false);
        let request = td.createRequest(url);
        logger.debug("cloud compiler: " + api);
        let response = await request.sendAsync();
        if (response.statusCode() == 200) {
            if (td.startsWith(response.header("content-type"), "application/json")) {
                resp = response.contentAsJson();
            }
            else {
                resp = response.content();
            }
        }
        else {
            resp = (<JsonObject>null);
            canCache = false;
        }
        logger.debug(JSON.stringify(td.arrayToJson(response.headerNames())));
        if (canCache && response.header("X-TouchDevelop-RelID") == ver) {
            let jsb = {};
            jsb["version"] = ver;
            if (resp != null) {
                jsb["resp"] = resp;
            }
            await cacheCompiler.justInsertAsync(api, jsb);
        }
    }
    return resp;
}

async function cacheCloudCompilerDataAsync(ver: string) : Promise<void>
{
    if (cloudRelid != ver) {
        let resp2 = /* async */ queryCloudCompilerAsync("css");
        doctopics = (await queryCloudCompilerAsync("doctopics"))["topicsExt"];
        let jsb = {};
        for (let js of asArray(doctopics)) {
            jsb[js["id"]] = js;
        }
        doctopicsByTopicid = clone(jsb);
        doctopicsCss = (await resp2)["css"];
        cloudRelid = ver;
    }
}

function clientConfigForRelease(prel: PubRelease) : ClientConfig
{
    let ccfg: ClientConfig;
    ccfg = ClientConfig.createFromJson(currClientConfig.toJson());
    ccfg.tdVersion = prel.version;
    ccfg.releaseid = prel.releaseid;
    ccfg.relid = prel.id;
    return ccfg;
}

function topicLink(doctopic: JsonObject) : string
{
    let s: string;
    s = "<a href='/docs/" + doctopic["id"] + "'>" + htmlQuote(doctopic["name"]) + "</a>";
    return s;
}

function topicList(doctopic: JsonObject, childId: string, childRepl: string) : string
{
    let html: string;
    html = "<li class='active'>" + topicLink(doctopic);
    let children = doctopic["childTopics"];
    if (children != null && children.length > 0) {
        html = html + "<ul class='nav'>";
        for (let js of children) {
            let id = td.toString(js);
            if (id == childId) {
                html = html + childRepl;
            }
            else {
                if (childId == "") {
                    html = html + "<li>";
                }
                else {
                    html = html + "<li class='hidden-xs'>";
                }
                html = html + topicLink(doctopicsByTopicid[id]) + "</li>\n";
            }
        }
        html = html + "</ul>";
    }
    html = html + "</li>\n";
    let r = orEmpty(doctopic["parentTopic"]);
    if (r != "") {
        html = topicList(doctopicsByTopicid[r], doctopic["id"], html);
    }
    return html;
}

function checkPubPermission(req: ApiRequest) : void
{
    if (req.userid == req.rootPub["pub"]["userid"]) {
    }
    else {
        checkPermission(req, "pub-mgmt");
    }
}

async function _initPointersAsync() : Promise<void>
{
    // TODO cache compiler queries (with ex)
    pointers = await indexedStore.createStoreAsync(pubsContainer, "pointer");
    await setResolveAsync(pointers, async (fetchResult: indexedStore.FetchResult, apiRequest: ApiRequest) => {
        await addUsernameEtcAsync(fetchResult);
        let coll = (<PubPointer[]>[]);
        for (let jsb of fetchResult.items) {
            let ptr = PubPointer.createFromJson(jsb["pub"]);
            coll.push(ptr);
        }
        fetchResult.items = td.arrayToJson(coll);
    }
    , {
        byUserid: true
    });
    addRoute("POST", "pointers", "", async (req: ApiRequest) => {
        await canPostAsync(req, "pointer");
        if (req.status == 200) {
            let body = req.body;
            let ptr1 = new PubPointer();
            ptr1.path = orEmpty(body["path"]).replace(/^\/+/g, "");
            ptr1.id = pathToPtr(ptr1.path);
            let matches = (/^usercontent\/([a-z]+)$/.exec(ptr1.path) || []);
            if (matches[1] == null) {
                if (td.startsWith(ptr1.path, "users/" + req.userid + "/")) {
                    checkPermission(req, "custom-ptr");
                }
                else {
                    checkPermission(req, "root-ptr");
                    if (req.status == 200 && ! hasPtrPermission(req, ptr1.id)) {
                        req.status = restify.http()._402PaymentRequired;
                    }
                }
            }
            else {
                let entry2 = await getPubAsync(matches[1], "script");
                if (entry2 == null || entry2["pub"]["userid"] != req.userid) {
                    checkPermission(req, "root-ptr");
                }
            }
            if (req.status == 200 && ! /^[\w\/\-@]+$/.test(ptr1.path)) {
                req.status = restify.http()._412PreconditionFailed;
            }
            if (req.status == 200) {
                let existing = await getPubAsync(ptr1.id, "pointer");
                if (existing != null) {
                    req.rootPub = existing;
                    req.rootId = existing["id"];
                    await updatePointerAsync(req);
                }
                else {
                    ptr1.userid = req.userid;
                    ptr1.userplatform = getUserPlatforms(req);
                    let jsb1 = {};
                    jsb1["id"] = ptr1.id;
                    jsb1["pub"] = ptr1.toJson();
                    await setPointerPropsAsync(jsb1, body);
                    await pointers.insertAsync(jsb1);
                    await storeNotificationsAsync(req, jsb1, "");
                    await scanAndSearchAsync(jsb1);
                    await clearPtrCacheAsync(ptr1.id);
                    await auditLogAsync(req, "post-ptr", {
                        newvalue: clone(jsb1)
                    });
                    await returnOnePubAsync(pointers, clone(jsb1), req);
                }
            }
        }
    });
    addRoute("POST", "*pointer", "", async (req1: ApiRequest) => {
        await updatePointerAsync(req1);
    });
    tdliteDocs.init(async (v: JsonBuilder) => {
        let wp = orEmpty(v["webpath"]);
        if (wp != "") {
            let ptrId = pathToPtr(wp.replace(/^\//g, ""));
            v["ptrid"] = ptrId;
            let entry = await getPubAsync(ptrId, "pointer");
            if (entry != null) {
                let s = entry["pub"]["scriptid"];
                if (orEmpty(s) != "") {
                    v["id"] = s;
                }
            }
        }
        let pubObj = await getPubAsync(v["id"], "script");
        if (pubObj != null) {
            v["isvolatile"] = true;
            let jsb2 = await getCardInfoAsync(emptyRequest, pubObj);
            // use values from expansion only if there are not present in v
            td.jsonCopyFrom(jsb2, clone(v));
            td.jsonCopyFrom(v, clone(jsb2));
        }
        let promotag = orEmpty(v["promotag"]);
        if (promotag != "") {
            let apiReq = buildApiRequest("/api/promo-scripts/all?count=50");
            let entities = await fetchAndResolveAsync(scripts, apiReq, "promo", promotag);
            v["promo"] = entities.items;
        }
    });
    addRoute("POST", "admin", "reindexpointers", async (req2: ApiRequest) => {
        checkPermission(req2, "operator");
        if (req2.status == 200) {
            /* async */ pointers.getIndex("all").forAllBatchedAsync("all", 50, async (json: JsonObject) => {
                await parallel.forJsonAsync(json, async (json1: JsonObject) => {
                    let ref = {}
                    await pointers.container.updateAsync(json1["id"], async (entry1: JsonBuilder) => {
                        await setPointerPropsAsync(entry1, ({}));
                        ref = clone(entry1);
                    });
                    await auditLogAsync(req2, "reindex-ptr", {
                        oldvalue: json1,
                        newvalue: ref
                    });
                });
            });
            req2.response = ({});
        }
    });
}

async function setPointerPropsAsync(ptr: JsonBuilder, body: JsonObject) : Promise<void>
{
    let pub = ptr["pub"];
    let empty = new PubPointer().toJson();
    for (let k of Object.keys(empty)) {
        if ( ! pub.hasOwnProperty(k)) {
            pub[k] = empty[k];
        }
    }
    setFields(pub, body, "description\nscriptid\nredirect\nartid\nartcontainer");
    pub["parentpath"] = "";
    pub["scriptname"] = "";
    let sid = await getPubAsync(pub["scriptid"], "script");
    if (sid == null) {
        pub["scriptid"] = "";
    }
    else {
        pub["scriptname"] = sid["pub"]["name"];
        await pubsContainer.updateAsync(sid["id"], async (entry: JsonBuilder) => {
            entry["lastPointer"] = pub["id"];
        });
        let entry1 = await scriptText.getAsync(sid["id"]);
        let parentTopic = (<JsonObject>null);
        if (entry1 != null) {
            let coll = (/{parent[tT]opic:([\w\/@\-]+)}/.exec(orEmpty(entry1["text"])) || []);
            let r = orEmpty(coll[1]);
            if (r != "") {
                parentTopic = await getPubAsync(pathToPtr(r), "pointer");
            }
            coll = (/{bread[Cc]rumb[tT]itle:([^{}]+)}/.exec(orEmpty(entry1["text"])) || []);
            pub["breadcrumbtitle"] = withDefault(coll[1], pub["scriptname"]);
        }
        if (parentTopic == null) {
            let currid = pub["path"];
            for (let i = 0; i < 5; i++) {
                currid = currid.replace(/[^\/]*$/g, "").replace(/\/$/g, "");
                if (currid == "") {
                    break;
                }
                parentTopic = await getPubAsync(pathToPtr(currid), "pointer");
                if (parentTopic != null) {
                    break;
                }
            }
        }
        if (parentTopic != null) {
            let parentRedir = orEmpty(parentTopic["pub"]["redirect"]);
            if (parentRedir != "") {
                parentTopic = await getPubAsync(pathToPtr(parentRedir), "pointer");
            }
        }
        if (parentTopic != null) {
            pub["parentpath"] = parentTopic["pub"]["path"];
        }
    }
    sid = await getPubAsync(pub["artid"], "art");
    if (sid == null) {
        pub["artid"] = "";
    }
    let s = orEmpty(pub["redirect"]);
    if ( ! /^\/[a-zA-Z0-9\/\-@]+$/.test(s)) {
        pub["redirect"] = "";
    }
}

async function publishScriptCoreAsync(pubScript: PubScript, jsb: JsonBuilder, body: string, req: ApiRequest) : Promise<void>
{
    if ( ! jsb.hasOwnProperty("id")) {
        progress("publish - gen id, ");
        if (pubScript.ishidden) {
            await generateIdAsync(jsb, 10);
        }
        else {
            await generateIdAsync(jsb, 6);
        }
    }
    progress("publish - gen id done");
    pubScript.id = jsb["id"];
    if (pubScript.rootid == "") {
        pubScript.rootid = pubScript.id;
    }
    // 
    await insertScriptAsync(jsb, pubScript, body, false);
    let jsb2 = clone(jsb);
    delete jsb2["text"];
    let scr = clone(jsb2);
    await auditLogAsync(req, "publish-script", {
        subjectid: scr["pub"]["userid"],
        publicationid: scr["id"],
        publicationkind: "script",
        newvalue: scr
    });
    progress("publish - inserted");
    if (td.stringContains(pubScript.description, "#docs")) {
        logger.tick("CreateHashDocsScript");
    }
    if ( ! pubScript.ishidden) {
        await storeNotificationsAsync(req, jsb, "");
        progress("publish - notified");
    }
    else {
        logger.tick("New_script_hidden");
    }
}

async function updatePointerAsync(req: ApiRequest) : Promise<void>
{
    if (req.userid == req.rootPub["pub"]["userid"]) {
    }
    else {
        checkPermission(req, "root-ptr");
        if (req.status == 200 && ! hasPtrPermission(req, req.rootId)) {
            req.status = restify.http()._402PaymentRequired;
        }
    }
    if (req.status == 200) {
        let bld = await updateAndUpsertAsync(pubsContainer, req, async (entry: JsonBuilder) => {
            await setPointerPropsAsync(entry, req.body);
        });
        await auditLogAsync(req, "update-ptr", {
            oldvalue: req.rootPub,
            newvalue: clone(bld)
        });
        await clearPtrCacheAsync(req.rootId);
        await returnOnePubAsync(pointers, clone(bld), req);
    }
}

async function pokeReleaseAsync(relLabel: string, delay: number) : Promise<void>
{
    await td.sleepAsync(delay);
    await settingsContainer.updateAsync("releases", async (entry: JsonBuilder) => {
        let jsb = entry["ids"][relLabel];
        jsb["numpokes"] = jsb["numpokes"] + 1;
    });
}

async function getCloudRelidAsync(includeVer: boolean) : Promise<string>
{
    let ver: string;
    let entry = await settingsContainer.getAsync("releases");
    let js = entry["ids"]["cloud"];
    ver = js["relid"];
    if (includeVer) {
        ver = ver + "." + rewriteVersion + "." + js["numpokes"];
    }
    return ver;
}

function pathToPtr(fn: string) : string
{
    let s: string;
    if (! fn) {
        return "";
    }
    s = "ptr-" + fn.replace(/^\/+/g, "").replace(/[^a-zA-Z0-9@]/g, "-").toLowerCase();
    return s;
}

async function getTemplateTextAsync(templatename: string, lang: string) : Promise<string>
{
    let r: string;
    let id = pathToPtr(templatename.replace(/:.*/g, ""));
    let entry3 = (<JsonObject>null);
    if (entry3 == null) {
        entry3 = await getPubAsync(id + lang, "pointer");
    }
    if (entry3 == null && lang != "") {
        entry3 = await getPubAsync(id, "pointer");
    }
    if (entry3 == null) {
        return "Template pointer leads to nowhere";
    }
    else {
        let templid = entry3["pub"]["scriptid"];
        let scriptjs = await getPubAsync(templid, "script");
        if (scriptjs == null) {
            return "Template script missing";
        }
        else if (orEmpty(scriptjs["pub"]["raw"]) == "html") {
            let textObj = await scriptText.getAsync(scriptjs["id"]);
            if (textObj == null) {
                return "Script text not found.";
            }
            else {
                return textObj["text"];
            }
        }
        else {
            return "Template has to be raw html";
            if (false) {
                let resp3 = await queryCloudCompilerAsync("q/" + scriptjs["id"] + "/string-art");
                if (resp3 == null) {
                    return "Extracting strings from template failed";
                }
                else {
                    let arts1 = asArray(resp3);
                    let artid = templatename.replace(/^[^:]*:?/g, "");
                    if (artid != "") {
                        arts1 = arts1.filter(elt => elt["name"] == artid);
                    }
                    if (arts1.length == 0) {
                        return "No art matching template name (if any)";
                    }
                    else {
                        return arts1[0]["value"];
                    }
                }
            }
        }
    }
    return r;
}

async function clearPtrCacheAsync(id: string) : Promise<void>
{
    if (false) {
        await cacheRewritten.updateAsync("ptrcache/" + id, async (entry: JsonBuilder) => {
            entry["version"] = "outdated";
        });
    }
    for (let chname of deployChannels) {
        await cacheRewritten.updateAsync("ptrcache/" + chname + "/" + id, async (entry1: JsonBuilder) => {
            entry1["version"] = "outdated";
        });
        if ( ! /@\w+$/.test(id)) {
            await refreshSettingsAsync();
            for (let lang of Object.keys(theServiceSettings.langs)) {
                await cacheRewritten.updateAsync("ptrcache/" + chname + "/" + id + "@" + lang, async (entry2: JsonBuilder) => {
                    entry2["version"] = "outdated";
                });
            }
        }
    }
    if (td.startsWith(id, "ptr-templates-")) {
        await pokeReleaseAsync("cloud", 0);
    }
}

async function renderScriptAsync(scriptid: string, v: JsonBuilder, pubdata: JsonBuilder) : Promise<[boolean, string, string]>
{
    let done: boolean;
    let templatename: string;
    let msg: string;
    done = false;
    msg = "";
    templatename = "";
    let scriptjs = await getPubAsync(scriptid, "script");
    if (scriptjs != null) {
        let editor = orEmpty(scriptjs["pub"]["editor"]);
        let raw = orEmpty(scriptjs["pub"]["raw"]);

        if (raw == "html") {
            let entry = await scriptText.getAsync(scriptjs["id"]);
            v["text"] = entry["text"];
            done = true;
        }
        else if (editor == "") {
            td.jsonCopyFrom(pubdata, scriptjs["pub"]);
            pubdata["scriptId"] = scriptjs["id"];
            let userid = scriptjs["pub"]["userid"];
            let userjs = await getPubAsync(userid, "user");
            let username = "User " + userid;
            let allowlinks = "";
            if (hasPermission(userjs, "external-links")) {
                allowlinks = "-official";
            }
            let resp2 = await queryCloudCompilerAsync("q/" + scriptjs["id"] + "/raw-docs" + allowlinks);
            if (resp2 != null) {
                let official = hasPermission(userjs, "root-ptr");
                if (userjs != null) {
                    username = withDefault(userjs["pub"]["name"], username);
                }
                pubdata["username"] = username;
                pubdata["userid"] = userid;
                pubdata["body"] = resp2["body"].replace(/^<h1>[^<>]+<\/h1>/g, "").replace(/<h2>/g, "<h2 class=\"beta\">").replace(/<h3>/g, "<h3 class=\"gamma\">");
                let desc = pubdata["description"];
                pubdata["hashdescription"] = desc;
                pubdata["description"] = desc.replace(/#\w+/g, "");
                pubdata["doctype"] = "Documentation";
                pubdata["time"] = scriptjs["pub"]["time"];
                let doctype = withDefault((/ptr-([a-z]+)-/.exec(pubdata["ptrid"]) || [])[1], "");
                if ( ! official && ! /^(users|usercontent|preview|)$/.test(doctype)) {
                    official = true;
                }
                await refreshSettingsAsync();
                let pathConfig = theServiceSettings.paths[doctype];
                if (pathConfig != null) {
                    td.jsonCopyFrom(pubdata, pathConfig);
                }
                if (official) {
                    let s = orEmpty((/#(page\w*)/.exec(desc) || [])[1]).toLowerCase();
                    if (s == "") {
                        templatename = "templates/official-s";
                    }
                    else {
                        templatename = "templates/" + s + "-s";
                    }
                }
                else {
                    templatename = "templates/users-s";
                }
            }
            else {
                msg = "Rendering failed";
            }
        }
        else {
            msg = "Unsupported doc script editor";
        }
    }
    else {
        msg = "Pointed script not found";
    }
    return <[boolean, string, string]>[done, templatename, msg]
}

function _initConfig() : void
{
    addRoute("GET", "config", "*", async (req: ApiRequest) => {
        if (req.verb == "promo") {
            checkPermission(req, "script-promo");
        }
        else {
            checkPermission(req, "root");
        }
        if (req.status == 200) {
            let entry = await settingsContainer.getAsync(req.verb);
            if (entry == null) {
                req.response = ({});
            }
            else {
                req.response = entry;
            }
        }
    });
    addRoute("POST", "config", "*", async (req1: ApiRequest) => {
        checkPermission(req1, "root");
        if (req1.status == 200 && ! /^(compile|settings|promo|compiletag)$/.test(req1.verb)) {
            req1.status = restify.http()._404NotFound;
        }
        if (req1.status == 200) {
            await auditLogAsync(req1, "update-settings", {
                subjectid: req1.verb,
                oldvalue: await settingsContainer.getAsync(req1.verb),
                newvalue: req1.body
            });
            await settingsContainer.updateAsync(req1.verb, async (entry1: JsonBuilder) => {
                copyJson(req1.body, entry1);
                entry1["stamp"] = azureTable.createLogId();
            });
        }
        req1.response = ({});
    });
}

async function executeSearchAsync(kind: string, q: string, req: ApiRequest) : Promise<void>
{
    let query = tdliteSearch.toPubQuery("pubs1", kind, q);
    let request = azureSearch.createRequest(query.toUrl());
    let response = await request.sendAsync();
    let js = response.contentAsJson();
    let ids = (<string[]>[]);
    if (js["value"] == null) {
        logger.debug("js: " + JSON.stringify(js, null, 2));
    }
    for (let js2 of js["value"]) {
        ids.push(js2["id"]);
    }
    let fetchResult2 = await scripts.fetchFromIdListAsync(ids, req.queryOptions);
    let jsons = asArray(fetchResult2.items);
    if ( ! callerHasPermission(req, "global-list")) {
        jsons = jsons.filter(elt => isAbuseSafe(elt));
    }
    let bykind = {};
    for (let ent of jsons) {
        let lst = bykind[ent["kind"]];
        if (lst == null) {
            lst = ([]);
            bykind[ent["kind"]] = lst;
        }
        lst.push(ent);
    }
    let byid = {};
    for (let knd of Object.keys(bykind)) {
        fetchResult2.items = bykind[knd];
        let store = indexedStore.storeByKind(knd);
        let fld = "id";
        if (knd == "script") {
            await resolveScriptsAsync(fetchResult2, req, true);
            fld = "sourceid";
        }
        else {
            await (<DecoratedStore><any>store).myResolve(fetchResult2, req);
        }
        for (let s of fetchResult2.items) {
            byid[s[fld]] = s;
        }
    }
    fetchResult2.items = td.arrayToJson(ids.map<JsonBuilder>(elt1 => byid[elt1]).filter(elt2 => elt2 != null));
    buildListResponse(fetchResult2, req);
}

function hasSetting(key: string) : boolean
{
    let hasSetting: boolean;
    hasSetting = orEmpty(td.serverSetting(key, true)) != "";
    return hasSetting;
}

async function setPasswordAsync(req: ApiRequest, pass: string, prevPass: string) : Promise<void>
{
    pass = normalizeAndHash(pass);
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
        await pubsContainer.updateAsync(req.rootId, async (entry1: JsonBuilder) => {
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
        req.status = restify.http()._400BadRequest;
    }
}

function progress(message: string) : void
{
    if (false) {
        logger.debug(message);
    }
}

function workspaceForUser(userid: string) : cachedStore.Container
{
    let container: cachedStore.Container;
    container = workspaceContainer[userid[userid.length - 1].charCodeAt(0) % workspaceContainer.length];
    return container;
}

async function cpuLoadAsync() : Promise<number>
{
    let load: number;
    await new Promise(resume => {
        child_process.execFile("wmic", ["cpu", "get", "loadpercentage"], function (err, res:string) {
          var arr = [];
          if (res)
            res.replace(/\d+/g, m => { arr.push(parseFloat(m)); return "" });
          load = 0;
          arr.forEach(function(n) { load += n });
          load = load / arr.length;
          resume();
        });
    });
    return load;
}

async function statusReportLoopAsync() : Promise<void>
{
    while (true) {
        await td.sleepAsync(30 + td.randomRange(0, 10));
        let value = await cpuLoadAsync();
        logger.measure("load-perc", value);
    }
}

async function specTableClientAsync(pref: string) : Promise<azureTable.Client>
{
    let tableClient: azureTable.Client;
    tableClient = azureTable.createClient({
        timeout: 10000,
        retries: 10,
        storageAccount: td.serverSetting(pref + "_ACCOUNT", false),
        storageAccessKey: td.serverSetting(pref + "_KEY", false)
    });
    return tableClient;
}

function bareIncrement(entry: JsonBuilder, key: string) : void
{
    entry[key] = orZero(entry[key]) + 1;
}

async function deleteAllByUserAsync(store: indexedStore.Store, id: string, req: ApiRequest) : Promise<void>
{
    let logDelete = store.kind != "review";
    await store.getIndex("userid").forAllBatchedAsync(id, 50, async (json: JsonObject) => {
        await parallel.forJsonAsync(json, async (json1: JsonObject) => {
            if (logDelete) {
                await auditLogAsync(req, "delete-by-user", {
                    publicationid: json1["id"],
                    oldvalue: await auditDeleteValueAsync(json1),
                    publicationkind: json1["kind"]
                });
            }
            await deletePubRecAsync(json1);
        });
    });
}

async function deleteReviewAsync(js: JsonObject) : Promise<boolean>
{
    let delok2: boolean;
    let pubid = orEmpty(js["pubid"]);
    assert(pubid != "", "");
    let ok2 = await tryDeletePubPointerAsync(js["ptrid"]);
    if (ok2) {
        let delok = await deleteAsync(js);
        if (delok) {
            await pubsContainer.updateAsync(pubid, async (entry: JsonBuilder) => {
                increment(entry, "positivereviews", -1);
            });
            await pubsContainer.updateAsync(js["pub"]["publicationuserid"], async (entry1: JsonBuilder) => {
                increment(entry1, "receivedpositivereviews", -1);
            });
            return true;
        }
    }
    return false;
    return delok2;
}

function hasPermission(userjs: JsonObject, perm: string) : boolean
{
    let ok2: boolean;
    if (userjs == null) {
        return false;
    }
    if (! perm) {
        return true;
    }
    if (td.stringContains(perm, ",")) {
        for (let oneperm of perm.split(",")) {
            if (oneperm != "") {
                if ( ! hasPermission(userjs, oneperm)) {
                    return false;
                }
            }
        }
        return true;
    }
    let lev = orEmpty(userjs["permissions"]);
    for (let s of lev.split(",")) {
        if (s != "") {
            if (false) {
                logger.debug("check " + s + " for " + perm + " against " + JSON.stringify(settingsPermissions, null, 2));
            }
            if (s == perm || s == "admin") {
                return true;
            }
            let js = settingsPermissions[s];
            if (js != null && js.hasOwnProperty(perm)) {
                return true;
            }
        }
    }
    return false;
    return ok2;
}

async function refreshSettingsAsync() : Promise<void>
{
    let now = new Date().getTime();
    if (now - lastSettingsCheck > 5000) {
        while (lastSettingsCheck < 0) {
            await td.sleepAsync(0.1);
        }
        now = new Date().getTime();
        if (now - lastSettingsCheck > 5000) {
            lastSettingsCheck = -1;
            let entry2 = await settingsContainer.getAsync("settings");
            if (entry2 == null) {
                entry2 = ({ "permissions": {} });
            }
            let permMap = clone(entry2["permissions"]);
            let numAdded = 1;
            while (numAdded > 0) {
                numAdded = 0;
                for (let perm of Object.keys(permMap)) {
                    let currperm = permMap[perm];
                    for (let perm2 of Object.keys(permMap[perm])) {
                        let otherperm = permMap[perm2];
                        if (otherperm != null) {
                            for (let perm3 of Object.keys(otherperm)) {
                                if ( ! currperm.hasOwnProperty(perm3)) {
                                    currperm[perm3] = 1;
                                    numAdded = numAdded + 1;
                                }
                            }
                        }
                    }
                }
            }
            let jsb = ({
  "paths": {},
  "blockedNicknameRx": "official|touchdevelop",
  "accounts": {},
  "termsversion": "v1",
  "emailFrom": "noreply@touchdevelop.com",
  "tokenExpiration": 0,
  "defaultLang": "en",
  "langs": {},
  "envrewrite": {},
  "alarmingEmails": []
});
            td.jsonCopyFrom(jsb, entry2);
            theServiceSettings = ServiceSettings.createFromJson(clone(jsb));
            lastSettingsCheck = now;
            settingsPermissions = clone(permMap);

        }
    }
}

function pubFeatures(pub: JsonObject) : string[]
{
    let features2: string[];
    let features = (<string[]>[]);
    if (pub["kind"] == "script") {
        if (pub["islibrary"]) {
            features.push("library");
        }
    }
    return features;
    return features2;
}

async function _initEmbedThumbnailsAsync() : Promise<void>
{
    embedThumbnails = await cachedStore.createContainerAsync("embedthumbnails", {
        inMemoryCacheSeconds: 120
    });
    restify.server().get("/thumbnail/:size/:provider/:id", async (req: restify.Request, res: restify.Response) => {
        let referer = orEmpty(req.header("referer")).toLowerCase();
        if (referer == "" || td.startsWith(referer, self) || td.startsWith(referer, "http://localhost:")) {
            // ok, referer checked
        }
        else {
            res.sendCustomError(restify.http()._402PaymentRequired, "Bad referer");
            return;
        }
        let provider = req.param("provider");
        let id = req.param("id");
        let path = provider + "/" + id;
        let entry = await embedThumbnails.getAsync(path);
        if (entry == null) {
            let drop = await throttleCoreAsync(sha256(req.remoteIp()) + ":thumb", 10);
            if (drop) {
                res.sendError(restify.http()._429TooManyRequests, "Too many thumbnail reqs");
                return;
            }
            if (provider == "vimeo") {
                if ( ! /^[0-9]+$/.test(id)) {
                    res.sendError(restify.http()._412PreconditionFailed, "Bad video id");
                    return;
                }
                let js = await td.downloadJsonAsync("https://vimeo.com/api/oembed.json?url=" + encodeURIComponent("https://vimeo.com/" + id));
                if (js == null) {
                    res.sendError(restify.http()._404NotFound, "");
                    return;
                }
                let jsb = {};
                jsb["info"] = js;
                let ok = await embedThumbnails.tryInsertAsync(path, jsb);
                entry = clone(jsb);
            }
            else {
                res.sendError(restify.http()._405MethodNotAllowed, "invalid provider");
                return;
            }
        }
        let sz = orZero(parseFloat(withDefault(req.param("size"), "0")));
        if (sz <= 0) {
            sz = 512;
        }
        let url = entry["info"]["thumbnail_url"];
        url = url.replace(/_\d+\./g, "_" + sz + ".");
        res.redirect(301, url);
    });
    restify.server().get("/embed/.*", async (req1: restify.Request, res1: restify.Response) => {
        let id1 = req1.url().replace(/\?.*/g, "").replace(/^\/embed\//g, "");
        if (/^[a-z0-9\-\/]+$/.test(id1)) {
            let templ = "<!doctype html>\n<html lang=\"en\">\n<head>\n  <meta charset=\"utf-8\">\n  <title>Video</title>\n</head>\n<body>\n  <video controls autoplay preload=auto poster=\"{SELF}{ID}/thumb\" style='width:100%;height:100%'>\n    <source src=\"{SELF}{ID}/sd\" type=\"video/mp4\">\n    Video not supported.\n  </video>\n</body>\n</html>\n";
            let s = td.replaceAll(td.replaceAll(templ, "{SELF}", self), "{ID}", id1);
            res1.html(s);
        }
        else {
            res1.sendError(restify.http()._404NotFound, "Bad id");
        }
    });
}

function _initAdmin() : void
{
    deploymentMeta = JSON.parse(withDefault(td.serverSetting("TD_DEPLOYMENT_META", true), "{}"));
    addRoute("GET", "stats", "dmeta", async (req: ApiRequest) => {
        req.response = deploymentMeta;
    });
    addRoute("GET", "admin", "stats", async (req1: ApiRequest) => {
        checkPermission(req1, "operator");
        if (req1.status == 200) {
            let jsb = {};
            for (let s of "RoleInstanceID\nTD_BLOB_DEPLOY_CHANNEL\nTD_WORKER_ID\nTD_DEPLOYMENT_ID".split("\n")) {
                if (s != "") {
                    jsb[s] = orEmpty(td.serverSetting(s, true));
                }
            }
            jsb["search"] = await tdliteSearch.statisticsAsync();
            jsb["dmeta"] = deploymentMeta;
            jsb["load"] = await cpuLoadAsync();
            let redis0 = await redisClient.infoAsync();
            jsb["redis"] = redis0;
            if (orFalse(req1.queryOptions["text"])) {
                let s2 = jsb["RoleInstanceID"] + ": load " + JSON.stringify(jsb["load"]) + " redis load: " + redis0["used_cpu_avg_ms_per_sec"] / 10 + " req/s: " + redis0["instantaneous_ops_per_sec"] + "\n";
                req1.response = s2;
            }
            else {
                req1.response = clone(jsb);
            }
        }
    });
    addRoute("GET", "admin", "deploydata", async (req2: ApiRequest) => {
        checkPermission(req2, "root");
        if (req2.status == 200) {
            let ch = withDefault(req2.argument, myChannel);
            req2.response = JSON.parse((await tdDeployments.getBlobToTextAsync("000ch-" + ch)).text());
        }
    });
    addRoute("POST", "admin", "copydeployment", async (req3: ApiRequest) => {
        await auditLogAsync(req3, "copydeployment", {
            data: req3.argument
        });
        await copyDeploymentAsync(req3, req3.argument);
    });
    addRoute("POST", "admin", "restart", async (req4: ApiRequest) => {
        await auditLogAsync(req4, "copydeployment", {
            data: "restart"
        });
        await copyDeploymentAsync(req4, myChannel);
    });
    addRoute("GET", "admin", "raw", async (req5: ApiRequest) => {
        checkPermission(req5, "root");
        if (req5.status == 200) {
            let entry = await pubsContainer.getAsync(req5.argument);
            if (entry == null) {
                entry = ({ "code": "four oh four" });
            }
            req5.response = entry;
        }
    });
    addRoute("GET", "admin", "rawblob", async (req6: ApiRequest) => {
        checkPermission(req6, "root");
        if (req6.status == 200) {
            let info = await (await pubsContainer.blobContainerAsync()).getBlobToTextAsync(req6.argument);
            if (info.succeded()) {
                req6.response = info.text();
            }
            else {
                req6.response = info.error();
            }
        }
    });
    addRoute("GET", "admin", "rawcode", async (req7: ApiRequest) => {
        checkPermission(req7, "root");
        if (req7.status == 200) {
            let cd = req7.argument;
            if (cd.length < 64) {
                cd = sha256(cd);
            }
            let entry1 = await passcodesContainer.getAsync("code/" + cd);
            if (entry1 == null) {
                entry1 = ({ "status": "four oh four" });
            }
            req7.response = entry1;
        }
    });
    addRoute("POST", "admin", "opcode", async (req8: ApiRequest) => {
        checkPermission(req8, "root");
        if (req8.status == 200) {
            let cd1 = req8.body["code"];
            let entry2 = await passcodesContainer.getAsync(cd1);
            if (entry2 == null) {
                entry2 = ({ "status": "four oh four" });
            }
            else if (orEmpty(req8.body["op"]) == "delete") {
                await passcodesContainer.updateAsync(cd1, async (entry3: JsonBuilder) => {
                    for (let s4 of Object.keys(entry3)) {
                        delete entry3[s4];
                    }
                    entry3["kind"] = "reserved";
                });
            }
            req8.response = entry2;
        }
    });
    addRoute("POST", "admin", "mbedint", async (req9: ApiRequest) => {
        checkPermission(req9, "root");
        if (req9.status == 200) {
            let ccfg = CompilerConfig.createFromJson((await settingsContainer.getAsync("compile"))[req9.argument]);
            let jsb2 = clone(req9.body);
            let response2 = await mbedintRequestAsync(ccfg, jsb2);
            req9.response = response2.contentAsJson();
        }
    });
}

function _initProgress() : void
{
    addRoute("POST", "*user", "progress", async (req: ApiRequest) => {
        meOnly(req);
        if (req.status == 200) {
            req.response = ({});
        }
    });
}

async function _initAcsAsync() : Promise<void>
{
    if (false && hasSetting("ACS_PASSWORD")) {
        acsCallbackToken = sha256(tokenSecret + ":acs");
        acsCallbackUrl = self + "api/acscallback?token=" + acsCallbackToken + "&anon_token=" + encodeURIComponent(basicCreds);
        await acs.initAsync();
    }
    addRoute("POST", "acscallback", "", async (req: ApiRequest) => {
        if (withDefault(req.queryOptions["token"], "none") == acsCallbackToken) {
            let jobid = orEmpty(req.body["JobId"]);
            let results = req.body["Results"];
            for (let stat of results) {
                if (stat["Status"] == "3000") {
                    let pubid = stat["Id"];
                    if (stat["Safe"]) {
                        logger.debug("acsok: " + JSON.stringify(stat, null, 2));
                        await pubsContainer.updateAsync(pubid, async (entry: JsonBuilder) => {
                            entry["acsJobId"] = jobid;
                        });
                    }
                    else {
                        logger.info("acsflag: " + JSON.stringify(stat, null, 2));
                        await pubsContainer.updateAsync(pubid, async (entry1: JsonBuilder) => {
                            entry1["acsFlag"] = stat;
                            entry1["acsJobId"] = jobid;
                        });
                        await refreshSettingsAsync();
                        let uid = orEmpty(theServiceSettings.accounts["acsreport"]);
                        if (uid != "") {
                            await setReqUserIdAsync(req, uid);
                            req.rootPub = await pubsContainer.getAsync(pubid);
                            if (isGoodEntry(req.rootPub)) {
                                let jsb = {};
                                jsb["text"] = "ACS flagged, policy codes " + JSON.stringify(stat["PolicyCodes"]);
                                req.body = clone(jsb);
                                req.rootId = pubid;
                                await postAbusereportAsync(req);
                            }
                        }
                    }
                }
                else {
                    logger.warning("bad results from ACS: " + JSON.stringify(req.body, null, 2));
                }
            }
            req.response = ({});
        }
        else {
            logger.debug("acs, wrong token: " + JSON.stringify(req.queryOptions));
            req.status = restify.http()._402PaymentRequired;
        }
    });
}

function acsValidatePub(jsb: JsonBuilder) : void
{
    if (acsCallbackUrl == "") {
        return;
    }
}

async function simplePointerCacheAsync(urlPath: string, lang: string) : Promise<string>
{
    let text: string;
    let versionMarker = "simple3";
    urlPath = urlPath + templateSuffix;
    let id = pathToPtr(urlPath);
    let path = "ptrcache/" + myChannel + "/" + id + lang;
    let entry2 = await cacheRewritten.getAsync(path);
    if (entry2 == null || orEmpty(entry2["version"]) != versionMarker) {
        let jsb2 = {};
        jsb2["version"] = versionMarker;
        let r = await getTemplateTextAsync(urlPath, lang);
        jsb2["text"] = orEmpty(r);
        entry2 = clone(jsb2);
        await cacheRewritten.updateAsync(path, async (entry: JsonBuilder) => {
            copyJson(entry2, entry);
        });
    }
    return orEmpty(entry2["text"]);
    return text;
}

async function getLoginHtmlAsync(inner: string, lang: string) : Promise<string>
{
    let text2: string;
    let text = await simplePointerCacheAsync("signin/" + inner, lang);
    if (text.length < 100) {
        text = loginHtml[inner];
    }
    text = td.replaceAll(text, "@JS@", login_js);
    return text;
    return text2;
}

async function postAbusereportAsync(req: ApiRequest) : Promise<void>
{
    let baseKind = req.rootPub["kind"];
    if ( ! canHaveAbuseReport(baseKind)) {
        req.status = restify.http()._412PreconditionFailed;
    }
    else {
        let report = new PubAbusereport();
        report.text = encrypt(req.body["text"], "ABUSE");
        report.userplatform = getUserPlatforms(req);
        report.userid = req.userid;
        report.time = await nowSecondsAsync();
        report.publicationid = req.rootId;
        report.publicationkind = baseKind;
        let pub = req.rootPub["pub"];
        report.publicationname = orEmpty(pub["name"]);
        report.publicationuserid = getAuthor(pub);
        let jsb = {};
        jsb["pub"] = report.toJson();
        await generateIdAsync(jsb, 10);
        await abuseReports.insertAsync(jsb);
        await pubsContainer.updateAsync(report.publicationid, async (entry: JsonBuilder) => {
            if (! entry["abuseStatus"]) {
                entry["abuseStatus"] = "active";
            }
            entry["abuseStatusPosted"] = "active";
        });
        await storeNotificationsAsync(req, jsb, "");
        await returnOnePubAsync(abuseReports, clone(jsb), req);
    }
}

async function scanAndSearchAsync(obj: JsonBuilder, options_0: IScanAndSearchOptions = {}) : Promise<void>
{
    let options_ = new ScanAndSearchOptions(); options_.load(options_0);
    if (disableSearch) {
        options_.skipSearch = true;
    }
    if (acsCallbackUrl == "" || ! canHaveAbuseReport(obj["kind"])) {
        options_.skipScan = true;
    }
    if (options_.skipScan && options_.skipSearch) {
        return;
    }
    logger.debug("inserting pub into search: " + obj["id"]);

    let store = indexedStore.storeByKind(obj["kind"]);
    let fetchResult = store.singleFetchResult(clone(obj));
    await (<DecoratedStore><any>store).myResolve(fetchResult, adminRequest);
    let pub = fetchResult.items[0];
    let body = orEmpty(withDefault(pub["text"], obj["text"]));
    if (body == "" && store.kind == "script") {
        let entry2 = await scriptText.getAsync(pub["id"]);
        if (entry2 != null) {
            body = entry2["text"];
        }
    }
    if (store.kind == "pointer") {
        let scrid = orEmpty(pub["scriptid"]);
        if (scrid != "") {
            let entry21 = await scriptText.getAsync(scrid);
            if (entry21 != null) {
                body = entry21["text"];
            }
        }
    }
    // ## search
    if ( ! options_.skipSearch) {
        let batch = tdliteSearch.createPubsUpdate();
        let entry = tdliteSearch.toPubEntry(pub, body, pubFeatures(pub), 0);
        entry.upsertPub(batch);
        /* async */ batch.sendAsync();
    }
    // ## scan
    if ( ! options_.skipScan) {
        let text = body;
        for (let fldname of "name\ndescription\nabout\ngrade\nschool".split("\n")) {
            text = text + " " + orEmpty(pub[fldname]);
        }
        /* async */ acs.validateTextAsync(pub["id"], text, acsCallbackUrl);
        let picurl = orEmpty(pub["pictureurl"]);
        if (picurl != "") {
            /* async */ acs.validatePictureAsync(pub["id"], picurl, acsCallbackUrl);
        }
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

function canHaveAbuseReport(baseKind: string) : boolean
{
    let canAbuse2: boolean;
    let canAbuse = /^(art|comment|script|screenshot|channel|group|user)$/.test(baseKind);
    return canAbuse;
    return canAbuse2;
}

function setHtmlHeaders(res: restify.Response) : void
{
    res.setHeader("Cache-Control", "no-cache, no-store");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-XSS-Protection", "1");
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    res.setHeader("X-Content-Type-Options", "nosniff");
}

function _initTicks() : void
{
    addRoute("POST", "ticks", "", async (req: ApiRequest) => {
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

function twoDigits(p: number) : string
{
    let r: string;
    let s = "0" + p;
    return s.substr(s.length - 2, 2);
    return r;
}

async function getCardInfoAsync(req: ApiRequest, pubJson: JsonObject) : Promise<JsonBuilder>
{
    let jsb2: JsonBuilder;
    let js3 = await resolveOnePubAsync(scripts, pubJson, req);
    if (js3 == null) {
        return {};
    }
    let scr = PubScript.createFromJson(js3);
    let jsb = clone(js3);
    jsb["description"] = scr.description.replace(/#docs/g, "");
    let vimeo = scr.meta["vimeo"];
    if (vimeo != null) {
        // TODO use thumbnail cache
        let js2 = await td.downloadJsonAsync("https://vimeo.com/api/oembed.json?url=https%3A//vimeo.com/" + vimeo);
        jsb["vimeo"] = vimeo;
        jsb["fullpicture"] = js2["thumbnail_url"];
        jsb["thumbnail"] = js2["thumbnail_url"].replace(/_\d+\./g, "_512.");
        if (false) {
            let s2 = td.replaceAll("<iframe src=\"https://player.vimeo.com/video/{vimeo}\" width=\"500\" height=\"281\" frameborder=\"0\" webkitallowfullscreen mozallowfullscreen allowfullscreen></iframe>", "{vimeo}", vimeo);
        }
    }
    let artid = orEmpty(scr.meta["art"]);
    if (artid != "") {
        jsb["fullpicture"] = currClientConfig.primaryCdnUrl + "/pub/" + artid;
        jsb["thumbnail"] = currClientConfig.primaryCdnUrl + "/thumb1/" + artid;
    }
    if (scr.editor == "blockly") {
        td.jsonCopyFrom(jsb, ({ 
  "editorname": "Block Editor", 
  "editor": "blocks",
  "editorhtml": "Microsoft Block Editor"
}));
    }
    else {
        td.jsonCopyFrom(jsb, ({ 
  "editorname": "Touch Develop", 
  "editor": "touchdevelop",
  "editorhtml": "Microsoft Touch Develop"
}));
    }
    jsb["timems"] = scr.time * 1000;
    jsb["realid"] = scr.id;
    jsb["humantime"] = tdliteDocs.humanTime(new Date(jsb["timems"]))
    return jsb;
    return jsb2;
}

function encrypt(val: string, keyid: string) : string
{
    let s2: string;
    if (! val) {
        return val;
    }
    keyid = keyid + "0";
    let key2 = prepEncryptionKey(keyid);
    if (key2 == null) {
        keyid = keyid + myChannel;
        key2 = prepEncryptionKey(keyid);
        if (key2 == null) {
            return val;
        }
    }
    let iv = crypto.randomBytes(16);
    let ivCipher = crypto.createCipheriv("aes256", key2, iv);
    let enciphered = ivCipher.update(new Buffer(val, "utf8"));
    let cipherFinal = ivCipher.final();
    let s = Buffer.concat([enciphered, cipherFinal]).toString("base64");
    return "EnC$" + keyid + "$" + iv.toString("base64") + "$" + s;
    return s2;
}

function prepEncryptionKey(keyid: string) : Buffer
{
    let key = orEmpty(td.serverSetting("ENCKEY_" + keyid, true));
    if (key == "") {
        return null;
    }
    let hash = crypto.createHash("sha256");
    hash.update(key);
    return hash.digest();
}

function decrypt(val: string) : string
{
    if (! val) {
        return "";
    }
    let coll = val.split("$");
    if (coll.length == 4 && coll[0] == "EnC") {
        let key2 = prepEncryptionKey(coll[1]);
        if (key2 == null) {
            return val;
        }
        let iv = new Buffer(coll[2], "base64");
        let ivDecipher = crypto.createDecipheriv("aes256", key2, iv);
        let deciphered = ivDecipher.update(new Buffer(coll[3], "base64"));
        let decipherFinal = ivDecipher.final();
        let buf = Buffer.concat([deciphered, decipherFinal]);
        return buf.toString("utf8")
    }
    else {
        return val;
    }
}

async function copyDeploymentAsync(req: ApiRequest, target: string) : Promise<void>
{
    checkPermission(req, "root");
    if (req.status == 200) {
        let jsb2 = JSON.parse((await tdDeployments.getBlobToTextAsync("000ch-" + myChannel)).text());
        jsb2["did"] = cachedStore.freshShortId(12);
        req.response = clone(jsb2);
        let result = await tdDeployments.createBlockBlobFromTextAsync("000ch-" + target, JSON.stringify(req.response), {
            contentType: "application/json;charset=utf8"
        });
        if ( ! result.succeded()) {
            req.status = 400;
        }
    }
}

function checkMgmtPermission(req: ApiRequest, addPerm: string) : void
{
    if (req.status == 200) {
        let perm = getPermissionLevel(req.rootPub) + "," + addPerm;
        checkPermission(req, perm);
    }
}

async function sendPermissionNotificationAsync(req: ApiRequest, r: JsonBuilder) : Promise<void>
{
    if (isAlarming(r["permissions"])) {
        await refreshSettingsAsync();
        if ( ! r.hasOwnProperty("settings")) {
            r["settings"] = ({});
        }
        let name_ = withDefault(decrypt(r["settings"]["realname"]), r["pub"]["name"]);
        let subj = "[TDLite] permissions for " + name_ + " set to " + r["permissions"];
        let body = "By code.";
        if (req.userid != "") {
            let entry2 = req.userinfo.json;
            body = "Permissions set by: " + entry2["pub"]["name"] + " " + currClientConfig.shareUrl + "/" + req.userid;
        }
        body = body + "\n\nTarget user: " + currClientConfig.shareUrl + "/" + r["id"];
        await parallel.forJsonAsync(theServiceSettings.alarmingEmails, async (json: JsonObject) => {
            let email = td.toString(json);
            await sendgrid.sendAsync(email, "noreply@touchdevelop.com", subj, body);
        });
    }
}

async function applyCodeAsync(userjson: JsonObject, codeObj: JsonObject, passId: string, auditReq: ApiRequest) : Promise<void>
{
    let userid = userjson["id"];
    let credit = codeObj["credit"];
    let singleCredit = codeObj["singlecredit"];
    if (singleCredit != null) {
        credit = Math.min(credit, singleCredit);
    }
    let perm = withDefault(codeObj["permissions"], "preview,");
    await pubsContainer.updateAsync(userid, async (entry: JsonBuilder) => {
        jsonAdd(entry, "credit", credit);
        jsonAdd(entry, "totalcredit", credit);
        if ( ! hasPermission(clone(entry), perm)) {
            let existing = normalizePermissions(orEmpty(entry["permissions"]));
            entry["permissions"] = existing + "," + perm;
        }
        if (! entry["firstcode"]) {
            entry["firstcode"] = passId;
        }
        await sendPermissionNotificationAsync(emptyRequest, entry);
    });
    await passcodesContainer.updateAsync(passId, async (entry1: JsonBuilder) => {
        entry1["credit"] = entry1["credit"] - credit;
    });
    await auditLogAsync(auditReq, "apply-code", {
        userid: codeObj["userid"],
        subjectid: userjson["id"],
        publicationid: passId.replace(/^code\//g, ""),
        publicationkind: "code",
        oldvalue: codeObj
    });
    for (let grpid of orEmpty(codeObj["groups"]).split(",")) {
        if (grpid != "") {
            let grp = await getPubAsync(grpid, "group");
            if (grp != null) {
                await addUserToGroupAsync(userid, grp, auditReq);
            }
        }
    }
}

function isAlarming(perm: string) : boolean
{
    let isAlarming2: boolean;
    let jsb = {};
    jsb["permissions"] = "non-alarming";
    let isAlarming = ! hasPermission(clone(jsb), perm);
    return isAlarming;
    return isAlarming2;
}

function encryptId(val: string, keyid: string) : string
{
    let key2 = prepEncryptionKey(keyid);
    if (key2 == null || ! val) {
        return val;
    }
    let cipher = crypto.createCipher("aes256", key2);
    let enciphered = cipher.update(new Buffer(val, "utf8"));
    let cipherFinal = cipher.final();
    let s = Buffer.concat([enciphered, cipherFinal]).toString("hex");
    return keyid + "-" + s;
}

function accessTokenRedirect(res: restify.Response, url2: string) : void
{
    let [url3, cook] = stripCookie(url2);
    if (cook != "") {
        res.setHeader("Set-Cookie", cook);
    }
    res.redirect(303, url3);
}

function wrapAccessTokenCookie(cookie: string) : string
{
    let value2: string;
    let value = "TD_ACCESS_TOKEN2=" + cookie + "; Secure; HttpOnly; Path=/; " + "Domain=" + self.replace(/\/$/g, "").replace(/.*\//g, "") + "; Expires=Fri, 31 Dec 9999 23:59:59 GMT";
    return value;
    return value2;
}

function stripCookie(url2: string) : [string, string]
{
    let url: string;
    let cook: string;
    let coll = (/&td_cookie=([\w.]+)$/.exec(url2) || []);
    let cookie = coll[1];
    cook = "";
    if (cookie != null) {
        url2 = url2.substr(0, url2.length - coll[0].length);
        cook = wrapAccessTokenCookie(cookie);
    }
    url = url2;
    return [url, cook]
}

async function resolveOnePubAsync(store: indexedStore.Store, obj: JsonObject, apiRequest: ApiRequest) : Promise<JsonObject>
{
    let js: JsonObject;
    let fetchResult = store.singleFetchResult(obj);
    await (<DecoratedStore><any>store).myResolve(fetchResult, apiRequest);
    js = fetchResult.items[0];
    return js;
}

function setBuilderIfMissing(entry: JsonBuilder, key: string) : JsonBuilder
{
    let dictionary: JsonBuilder;
    let dict = entry[key];
    if (dict == null) {
        dict = {};
        entry[key] = dict;
    }
    return dict;
    return dictionary;
}

async function setReqUserIdAsync(req: ApiRequest, uid: string) : Promise<void>
{
    let userjs = await getPubAsync(uid, "user");
    if (userjs == null) {
        req.status = restify.http()._401Unauthorized;
        logger.info("accessing token for deleted user, " + uid);
    }
    else {
        req.userid = uid;
        req.userinfo.id = uid;
        req.userinfo.json = userjs;
        logger.setContextUser(uid);
    }
}

function callerIsFacilitatorOf(req: ApiRequest, subjectJson: JsonObject) : boolean
{
    let isFacilitator: boolean;
    if (req === adminRequest) {
        return true;
    }
    if (req.userid == "" || subjectJson == null) {
        return false;
    }
    let callerJson = req.userinfo.json;
    if (hasPermission(callerJson, "any-facilitator")) {
        return true;
    }
    if ( ! hasPermission(callerJson, "adult") || hasPermission(subjectJson, "adult")) {
        return false;
    }
    let owngrps = callerJson["owngroups"];
    for (let grpid of Object.keys(subjectJson["groups"])) {
        if (owngrps.hasOwnProperty(grpid)) {
            return true;
        }
    }
    return false;
    return isFacilitator;
}

function callerSharesGroupWith(req: ApiRequest, subjectJson: JsonObject) : boolean
{
    let isFacilitator: boolean;
    if (req === adminRequest) {
        return true;
    }
    if (req.userid == "" || subjectJson == null) {
        return false;
    }
    let callerJson = req.userinfo.json;
    if (hasPermission(callerJson, "any-facilitator")) {
        return true;
    }
    let callerGrps = callerJson["groups"];
    for (let grpid of Object.keys(subjectJson["groups"])) {
        if (callerGrps.hasOwnProperty(grpid)) {
            return true;
        }
    }
    return false;
    return isFacilitator;
}

function unsafeToJson(jsb: JsonBuilder) : JsonObject
{
    return jsb;
}

function isAbuseSafe(elt: JsonObject) : boolean
{
    let b2: boolean;
    let b = orEmpty(elt["abuseStatus"]) != "active";
    return b;
    return b2;
}

function callerHasPermission(req: ApiRequest, perm: string) : boolean
{
    let hasPerm: boolean;
    if (req === adminRequest) {
        return true;
    }
    if (req.userid == "") {
        return false;
    }
    return hasPermission(req.userinfo.json, perm);
    return hasPerm;
}

async function handleEmailVerificationAsync(req: restify.Request, res: restify.Response) : Promise<void>
{
    let coll = (/^\/verify\/([a-z]+)\/([a-z]+)/.exec(req.url()) || []);
    let userJs = await getPubAsync(coll[1], "user");
    let msg = "";
    if (userJs == null) {
        msg = "Cannot verify email - no such user.";
    }
    else if (orEmpty(userJs["emailcode"]) != coll[2]) {
        msg = "Cannot verify email - invalid or expired code.";
    }
    else {
        msg = "Thank you, your email was updated.";
        await pubsContainer.updateAsync(userJs["id"], async (entry: JsonBuilder) => {
            let jsb = entry["settings"];
            jsb["emailverified"] = true;
            jsb["previousemail"] = "";
            entry["emailcode"] = "";
        });
    }
    res.sendText(msg, "text/plain");
}

async function _initAuditAsync() : Promise<void>
{
    let auditTableClient = await specTableClientAsync("AUDIT_BLOB");
    let auditBlobService = azureBlobStorage.createBlobService({
        storageAccount: td.serverSetting("AUDIT_BLOB_ACCOUNT", false),
        storageAccessKey: td.serverSetting("AUDIT_BLOB_KEY", false)
    });
    auditContainer = await cachedStore.createContainerAsync("audit", {
        blobService: auditBlobService
    });
    auditStore = await indexedStore.createStoreAsync(auditContainer, "auditlog", {
        tableClient: auditTableClient
    });
    let store = auditStore;
    (<DecoratedStore><any>store).myResolve = async (fetchResult: indexedStore.FetchResult, apiRequest: ApiRequest) => {
        checkPermission(apiRequest, "audit");
        if (apiRequest.status == 200) {
            let coll = (<PubAuditLog[]>[]);
            for (let jsb of fetchResult.items) {
                let msg = PubAuditLog.createFromJson(jsb["pub"]);
                msg.ip = decrypt(msg.ip);
                coll.push(msg);
            }
            fetchResult.items = td.arrayToJson(coll);
        }
        else {
            fetchResult.items = ([]);
        }
    }
    ;
    await store.createIndexAsync("all", entry => "all");
    addRoute("GET", "audit", "", async (req: ApiRequest) => {
        checkPermission(req, "audit");
        if (req.status == 200) {
            await anyListAsync(store, req, "all", "all");
        }
    });
    await auditIndexAsync("userid");
    await auditIndexAsync("publicationid");
    await auditIndexAsync("subjectid");
    await auditIndexAsync("type");
}

function encryptJson(js: JsonObject, keyid: string) : JsonObject
{
    let js2: JsonObject;
    if (js != null) {
        js = encrypt(JSON.stringify(js), keyid);
    }
    return js;
    return js2;
}

async function auditDeleteValueAsync(js: JsonObject) : Promise<JsonObject>
{
    let oldval2: JsonObject;
    if (js["kind"] == "script") {
        let entry2 = await scriptText.getAsync(js["id"]);
        let jsb2 = clone(js);
        jsb2["text"] = encrypt(entry2["text"], "AUDIT");
        js = clone(jsb2);
    }
    return js;
    return oldval2;
}

function buildAuditApiRequest(req: restify.Request) : ApiRequest
{
    let apiReq2: ApiRequest;
    let apiReq = buildApiRequest("/api");
    apiReq.userinfo.ip = req.remoteIp();
    return apiReq;
    return apiReq2;
}

async function auditIndexAsync(field: string) : Promise<void>
{
    let store = auditStore;
    await store.createIndexAsync(field, entry => entry["pub"][field]);
    addRoute("GET", "audit", field, async (req: ApiRequest) => {
        checkPermission(req, "audit");
        if (req.status == 200) {
            await anyListAsync(store, req, field, req.argument);
        }
    });
}

async function canSeeRootpubScriptAsync(req: ApiRequest) : Promise<boolean>
{
    let seeIt2: boolean;
    if (hasPermission(req.userinfo.json, "global-list")) {
        return true;
    }
    let scr = PubScript.createFromJson(req.rootPub["pub"]);
    if ( ! orFalse(scr.unmoderated) || scr.userid == req.userid) {
        return true;
    }
    else {
        let entry4 = await getPubAsync(scr.userid, "user");
        return callerSharesGroupWith(req, entry4);
    }
    return seeIt2;
}

async function deleteHistoryAsync(req: ApiRequest, guid: string) : Promise<void>
{
    let result = await installSlotsTable.getEntityAsync(req.rootId, guid);
    if (result == null) {
        return;
    }
    let entity = azureTable.createEntity(req.rootId, guid);
    entity["guid"] = guid;
    entity["status"] = "deleted";
    await installSlotsTable.insertEntityAsync(clone(entity), "or replace");

    let wsContainer = workspaceForUser(req.rootId);
    let scriptGuid = req.rootId + "." + guid;
    let resQuery = historyTable.createQuery().partitionKeyIs(scriptGuid);
    await parallel.forJsonAsync(await resQuery.fetchAllAsync(), async (json: JsonObject) => {
        await historyTable.deleteEntityAsync(json);
        await (await wsContainer.blobContainerAsync()).deleteBlobAsync(json["historyid"]);
    });
}

async function sendNotificationAsync(about: JsonObject, notkind: string, suplemental: JsonObject) : Promise<void>
{
    let notification = new PubNotification();
    notification.kind = "notification";
    notification.id = (await cachedStore.invSeqIdAsync()).toString();
    let pub = about["pub"];
    notification.time = pub["time"];
    notification.publicationid = pub["id"];
    notification.publicationkind = pub["kind"];
    notification.publicationname = orEmpty(pub["name"]);
    notification.userid = pub["userid"];
    if (notkind == "groupapproved") {
        notification.userid = suplemental["id"];
    }
    notification.notificationkind = notkind;
    if (suplemental != null) {
        notification.supplementalid = suplemental["id"];
        notification.supplementalkind = suplemental["kind"];
        notification.supplementalname = suplemental["pub"]["name"];
    }
    let target = notification.userid;
    let jsb2 = clone(notification.toJson());
    jsb2["PartitionKey"] = target;
    jsb2["RowKey"] = notification.id;
    await notificationsTable.insertEntityAsync(clone(jsb2), "or merge");
    await pubsContainer.updateAsync(target, async (entry: JsonBuilder) => {
        jsonAdd(entry, "notifications", 1);
    });
    await pokeSubChannelAsync("notifications:" + target);
    await pokeSubChannelAsync("installed:" + target);
}

async function _initVimeoAsync() : Promise<void>
{
    videoStore = await indexedStore.createStoreAsync(pubsContainer, "video");
    await setResolveAsync(videoStore, async (fetchResult: indexedStore.FetchResult, apiRequest: ApiRequest) => {
        let coll = (<PubVideo[]>[]);
        for (let js of fetchResult.items) {
            let vid = PubVideo.createFromJson(js["pub"]);
            vid.sdvideourl = currClientConfig.primaryCdnUrl + "/cachevideo/" + vid.blobid + "-sd";
            vid.thumb128url = currClientConfig.primaryCdnUrl + "/cachevideo/" + vid.blobid + "-thumb128";
            vid.thumb512url = currClientConfig.primaryCdnUrl + "/cachevideo/" + vid.blobid + "-thumb512";
            coll.push(vid);
        }
        fetchResult.items = td.arrayToJson(coll);
    });
    addRoute("DELETE", "*video", "", async (req: ApiRequest) => {
        checkPermission(req, "root-ptr");
        if (req.status == 200) {
            let delok = await deleteAsync(req.rootPub);
            req.response = ({});
        }
    });
    restify.server().get("/vimeo/:id/:endpoint", async (req1: restify.Request, res: restify.Response) => {
        let referer = orEmpty(req1.header("referer")).toLowerCase();
        if (referer == "" || td.startsWith(referer, self) || td.startsWith(referer, "http://localhost:")) {
            // ok, referer checked
        }
        else {
            res.sendCustomError(restify.http()._402PaymentRequired, "Bad referer");
            return;
        }
        let id = req1.param("id");
        if ( ! /^\d+$/.test(id)) {
            res.sendError(restify.http()._400BadRequest, "Bad ID");
            return;
        }
        let endpoint = req1.param("endpoint");
        if ( ! /^(sd|thumb512|thumb128)$/.test(endpoint)) {
            res.sendError(restify.http()._404NotFound, "Bad endpoint");
            return;
        }
        let entry = await getPubAsync("vimeo-" + id, "video");
        if (entry == null) {
            let drop = await throttleCoreAsync(sha256(req1.remoteIp()) + ":video", 10);
            if (drop) {
                res.sendError(restify.http()._429TooManyRequests, "Too many video reqs");
                return;
            }
            let request = td.createRequest("https://api.vimeo.com/videos/" + encodeURIComponent(id));
            request.setHeader("Authorization", "Bearer " + td.serverSetting("VIMEO_API_TOKEN", false));
            let response = await request.sendAsync();
            if (response.statusCode() != 200) {
                res.sendCustomError(restify.http()._424FailedDependency, "No such vimeo video?");
                logger.info("failed vimeo download: " + response + ": " + response.content());
                return;
            }
            let vimeoPayload = response.contentAsJson();
            if (vimeoPayload["user"]["uri"] != "/users/" + td.serverSetting("VIMEO_USER", false)) {
                res.sendError(restify.http()._402PaymentRequired, "Invalid video user");
                return;
            }
            let pubVideo = new PubVideo();
            pubVideo.blobid = azureBlobStorage.createRandomId(20).toLowerCase();
            pubVideo.provider = "vimeo";
            pubVideo.providerid = id;
            if (false) {
                pubVideo.time = vimeoPayload["modified_time"];
            }
            let thumburl = vimeoPayload["pictures"]["sizes"][0]["link"];
            let sdDesc = asArray(vimeoPayload["download"]).filter(elt => elt["quality"] == "sd")[0];
            if (sdDesc["size"] > 4 * 1024 * 1024) {
                res.sendError(restify.http()._413RequestEntityTooLarge, "Video too large");
                return;
            }
            let request2 = td.createRequest(sdDesc["link"]);
            let response2 = await request2.sendAsync();
            assert(response2.statusCode() == 302, "Bad status from vimeo: " + response2);
            let vidurl = response2.header("Location");
            let task = /* async */ videoContainer.createBlockBlobFromUrlAsync(pubVideo.blobid + "-thumb512", thumburl.replace(/_[\dx]+\.jpg/g, "_512.jpg"));
            let task2 = /* async */ videoContainer.createBlockBlobFromUrlAsync(pubVideo.blobid + "-thumb128", thumburl.replace(/_[\dx]+\.jpg/g, "_128.jpg"));
            let task3 = /* async */ videoContainer.createBlockBlobFromUrlAsync(pubVideo.blobid + "-sd", vidurl);
            let jsb2 = {};
            jsb2["pub"] = pubVideo.toJson();
            jsb2["id"] = "vimeo-" + id;
            jsb2["thumburl"] = thumburl;
            let BlobInfo = await task;
            BlobInfo = await task2;
            BlobInfo = await task3;
            await videoStore.insertAsync(jsb2);
            entry = clone(jsb2);
        }
        let blobid = entry["pub"]["blobid"];
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.redirect(restify.http()._302MovedTemporarily, currClientConfig.primaryCdnUrl + "/cachevideo/" + blobid + "-" + endpoint);
    });
}

function getPermissionLevel(userjs: JsonObject) : string
{
    let lastperm2: string;
    let lastperm = "level0";
    for (let i = 0; i < 7; i++) {
        if (hasPermission(userjs, "level" + i)) {
            lastperm = "level" + i;
        }
        else {
            break;
        }
    }
    return lastperm;
    return lastperm2;
}

function _initRuntime() : void
{
    addRoute("POST", "runtime", "translate", async (req: ApiRequest) => {
        // TODO figure out the right permission here and throttle
        checkPermission(req, "root-ptr");
        if (req.status != 200) {
            return;
        }
        let text = orEmpty(req.body["html"]);
        let ishtml = true;
        if (text == "") {
            text = orEmpty(req.body["text"]);
            ishtml = false;
        }
        let jsb = {};
        if (text == "") {
            jsb["translated"] = "";
        }
        else {
            let translated = await microsoftTranslator.translateAsync(text, orEmpty(req.body["from"]), orEmpty(req.body["to"]), ishtml);
            if (translated == null) {
                req.status = restify.http()._424FailedDependency;
            }
            else {
                jsb["translated"] = translated;
            }
        }
        req.response = clone(jsb);
    });
}

async function handleLanguageAsync(req: restify.Request, res: restify.Response, setCookie: boolean) : Promise<string>
{
    let lang2: string;
    await refreshSettingsAsync();
    let lang = theServiceSettings.defaultLang;
    for (let s of orEmpty(req.header("Accept-Language")).split(",")) {
        let headerLang = orEmpty((/^\s*([a-z][a-z])/.exec(s) || [])[1]);
        if (theServiceSettings.langs.hasOwnProperty(headerLang)) {
            lang = headerLang;
            break;
        }
    }
    let cookieLang = orEmpty((/TD_LANG=([a-z][a-z])/.exec(orEmpty(req.header("Cookie"))) || [])[1]);
    if (theServiceSettings.langs.hasOwnProperty(cookieLang)) {
        lang = cookieLang;
    }
    else {
        // Cookie conflicts with access token cookie
        if (false) {
            if (setCookie) {
                let value = "TD_LANG=" + lang + "; Secure; Path=/; " + "Domain=" + self.replace(/\/$/g, "").replace(/.*\//g, "") + "; Expires=Fri, 31 Dec 9999 23:59:59 GMT";
                res.setHeader("Set-Cookie", value);
            }
        }
    }
    if (lang == theServiceSettings.defaultLang) {
        lang = "";
    }
    else {
        lang = "@" + lang;
    }
    return lang;
    return lang2;
}

function hasPtrPermission(req: ApiRequest, currptr: string) : boolean
{
    let b2: boolean;
    currptr = currptr.replace(/@..$/g, "");
    while (currptr != "") {
        if (callerHasPermission(req, "write-" + currptr)) {
            return true;
        }
        else {
            let newptr = currptr.replace(/-[^\-]*$/g, "");
            if (newptr == currptr) {
                return false;
            }
            else {
                currptr = newptr;
            }
        }
    }
    return false;
    return b2;
}

async function mbedwsDownloadAsync(sha: string, compile: mbedworkshopCompiler.CompilationRequest, ccfg: CompilerConfig) : Promise<void>
{
    logger.newContext();
    let task = await compile.statusAsync(true);
    // TODO: mbed seems to need a second call
    await td.sleepAsync(1);
    task = await compile.statusAsync(false);
    let st = new CompileStatus();
    logger.measure("MbedWsCompileTime", logger.contextDuration());
    st.success = task.success;
    // Just in case...
    let s = JSON.stringify(task.payload).replace(/\w+@github.com/g, "[...]@github.com");
    st.mbedresponse = JSON.parse(s);
    if (task.success) {
        let bytes = await task.downloadAsync(compile);
        if (bytes.length == 0) {
            st.success = false;
            logger.tick("MbedEmptyDownload");
        }
        else {
            st.hexurl = compileContainer.url() + "/" + sha + "/" + ccfg.hexfilename;
            let result = await compileContainer.createGzippedBlockBlobFromBufferAsync(sha + "/" + ccfg.hexfilename, bytes, {
                contentType: ccfg.hexcontenttype
            });
            logger.tick("MbedHexCreated");
        }
    }
    let result2 = await compileContainer.createBlockBlobFromTextAsync(sha + ".json", JSON.stringify(st.toJson()), {
        contentType: "application/json; charset=utf-8"
    });
}

async function mbedintDownloadAsync(sha: string, jsb2: JsonBuilder, ccfg: CompilerConfig) : Promise<void>
{
    logger.newContext();
    jsb2["hexfile"] = "source/" + ccfg.target_binary;
    jsb2["target"] = ccfg.platform;
    let response = await mbedintRequestAsync(ccfg, jsb2);
    let respJson = response.contentAsJson();
    let st = new CompileStatus();
    logger.measure("MbedIntCompileTime", logger.contextDuration());
    // Just in case...
    if (response.statusCode() != 200 || respJson == null) {
        setMbedresponse(st, "Code: " + response.statusCode());
    }
    else {
        let hexfile = respJson["hexfile"];
        let msg = orEmpty(respJson["stderr"]) + orEmpty(respJson["stdout"]);
        if (hexfile == null) {
            setMbedresponse(st, withDefault(msg, "no hex"));
        }
        else {
            st.success = true;
            st.hexurl = compileContainer.url() + "/" + sha + "/" + ccfg.hexfilename;
            let result = await compileContainer.createGzippedBlockBlobFromBufferAsync(sha + "/" + ccfg.hexfilename, new Buffer(hexfile, "utf8"), {
                contentType: ccfg.hexcontenttype
            });
            logger.tick("MbedHexCreated");
        }
    }
    let result2 = await compileContainer.createBlockBlobFromTextAsync(sha + ".json", JSON.stringify(st.toJson()), {
        contentType: "application/json; charset=utf-8"
    });
}

function setMbedresponse(st: CompileStatus, msg: string) : void
{
    let jsb = ({ "result": {} });
    jsb["result"]["exception"] = msg;
    st.mbedresponse = jsb;
}

async function mbedintRequestAsync(ccfg: CompilerConfig, jsb2: JsonBuilder) : Promise<td.WebResponse>
{
    jsb2["requestId"] = azureTable.createRandomId(128);
    let request = td.createRequest(ccfg.internalUrl);
    let iv = crypto.randomBytes(16);
    let key = new Buffer(td.serverSetting("MBEDINT_KEY", false), "hex");
    let cipher = crypto.createCipheriv("aes256", key, iv);
    request.setHeader("x-iv", iv.toString("hex"));
    let enciphered = cipher.update(new Buffer(JSON.stringify(jsb2), "utf8"));
    let cipherFinal = cipher.final();
    request.setContentAsBuffer(Buffer.concat([enciphered, cipherFinal]));
    request.setMethod("post");
    let response = await request.sendAsync();
    let buf = response.contentAsBuffer();
    let inpiv = response.header("x-iv");
    if (response.statusCode() == 200) {
        var ciph = crypto.createDecipheriv("AES256", key, new Buffer(inpiv, "hex"));
        var b0 = ciph.update(buf)
        var b1 = ciph.final()
        var dat = Buffer.concat([b0, b1]).toString("utf8");
        (<any>response)._content = dat;
    }
    return response;
}

async function _initPromoAsync() : Promise<void>
{
    promosTable = await tableClient.createTableIfNotExistsAsync("promos");
    await scripts.createCustomIndexAsync("promo", promosTable);
    addRoute("GET", "promo-scripts", "*", async (req: ApiRequest) => {
        await anyListAsync(scripts, req, "promo", req.verb);
    }
    , {
        cacheKey: "promo"
    });
    addRoute("GET", "promo", "config", async (req1: ApiRequest) => {
        checkPermission(req1, "script-promo");
        if (req1.status != 200) {
            return;
        }
        req1.response = await settingsContainer.getAsync("promo");
    });
    addRoute("GET", "*script", "promo", async (req2: ApiRequest) => {
        checkPermission(req2, "script-promo");
        if (req2.status != 200) {
            return;
        }
        req2.response = await getPromoAsync(req2);
    });
    addRoute("POST", "*script", "promo", async (req3: ApiRequest) => {
        checkPermission(req3, "script-promo");
        if (req3.status != 200) {
            return;
        }
        let promo = await getPromoAsync(req3);
        let oldPromoId = orEmpty(req3.rootPub["promoId"]);
        if (oldPromoId != "") {
            await parallel.forJsonAsync(promo["tags"], async (json: JsonObject) => {
                let entity = azureTable.createEntity(td.toString(json), oldPromoId);
                let ok = await promosTable.tryDeleteEntityAsync(clone(entity));
            });
        }
        let jsb2 = clone(promo);
        td.jsonCopyFrom(jsb2, req3.body);
        let coll = (<string[]>[]);
        let newTags = jsb2["tags"];
        if (newTags.length > 0) {
            let d = {};
            for (let jsb3 of newTags) {
                d[td.toString(jsb3)] = "1";
            }
            d["all"] = "1";
            if (false) {
                let pubScript = PubScript.createFromJson(req3.rootPub["pub"]);
                coll.push(pubScript.editor);
                d[withDefault(pubScript.editor, "touchdevelop")] = "1";
                if (td.stringContains(pubScript.description, "#docs")) {
                    d["docs"] = "1";
                }
            }
            jsb2["tags"] = td.arrayToJson(Object.keys(d));
        }
        promo = clone(jsb2);
        let offsetHours = Math.round(td.clamp(-200000, 200000, orZero(promo["priority"])));
        let newtime = Math.round(req3.rootPub["pub"]["time"] + offsetHours * 3600);
        let newId = (10000000000 - newtime) + "." + req3.rootId;
        await pubsContainer.updateAsync(req3.rootId, async (entry: JsonBuilder) => {
            entry["promo"] = promo;
            entry["promoId"] = newId;
        });
        let js = promo["tags"];
        if (jsonArrayIndexOf(js, "hidden") > 0) {
            js = (["hidden"]);
        }
        else if (jsonArrayIndexOf(js, "preview") > 0) {
            js = (["preview"]);
        }
        await parallel.forJsonAsync(js, async (json1: JsonObject) => {
            let entity1 = azureTable.createEntity(td.toString(json1), newId);
            entity1["pub"] = req3.rootId;
            await promosTable.insertEntityAsync(clone(entity1), "or merge");
        });
        await flushApiCacheAsync("promo");
        req3.response = promo;
    });
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
    await pubsContainer.updateAsync(userid, async (entry: JsonBuilder) => {
        entry["groups"] = grps;
        entry["owngroups"] = owngrps;
    });
    logger.debug("reindex grps: " + userid + " -> " + JSON.stringify(grps));
}

async function handledByCacheAsync(apiRequest: ApiRequest) : Promise<boolean>
{
    let handled: boolean;
    let entry = await cachedApiContainer.getAsync(apiRequest.origUrl);
    if (entry == null) {
        return false;
    }
    let keyname = orEmpty(entry["cachekey"]);
    if (keyname == "") {
        return false;
    }
    let key = await cachedApiContainer.getAsync("@" + keyname);
    if (key == null || key["value"] != entry["cachekeyvalue"]) {
        return false;
    }
    apiRequest.response = entry["response"];
    apiRequest.status = entry["status"];
    return true;
    return handled;
}

async function storeCacheAsync(apiRequest: ApiRequest) : Promise<void>
{
    if (apiRequest.method != "GET") {
        apiRequest.status = restify.http()._405MethodNotAllowed;
        return;
    }
    await throttleAsync(apiRequest, "apireq", 10);
    if (apiRequest.status == restify.http()._429TooManyRequests) {
        return;
    }
    // 
    await performSingleRequestAsync(apiRequest);
    // 
    let thekey = apiRequest.route.options.cacheKey;
    if (thekey == "") {
        apiRequest.status = restify.http()._404NotFound;
        return;
    }
    let jsb = {};
    let verkey = await cachedApiContainer.getAsync("@" + thekey);
    if (verkey == null) {
        jsb["cachekeyvalue"] = await flushApiCacheAsync(thekey);
    }
    else {
        jsb["cachekeyvalue"] = verkey["value"];
    }
    jsb["cachekey"] = thekey;
    jsb["status"] = apiRequest.status;
    if (apiRequest.status == 200) {
        jsb["response"] = apiRequest.response;
    }
    await cachedApiContainer.justInsertAsync(apiRequest.origUrl, jsb);
    // TODO store etag/other headers?
}

/**
 * {action:ignoreReturn}
 */
async function flushApiCacheAsync(s: string) : Promise<string>
{
    let val: string;
    let jsb2 = {};
    let value = azureTable.createRandomId(10);
    jsb2["value"] = value;
    await cachedApiContainer.justInsertAsync("@" + s, jsb2);
    return value;
    return val;
}

/**
 * This lock is for API calls that are cached. It's only for performance. When there are many calls to /X happening at the same time, and /X is flushed out of cache, normally multiple workers would start to re-compute /X, and then they would all save the cache (possibly fighting over it). With this lock, only one of them will, and the others will wait (or retry).
 */
async function acquireCacheLockAsync(path: string) : Promise<string>
{
    let b2: string;
    let timeout = 10;
    let args = ("key,self,EX," + timeout + ",NX").split(",");
    let item = "lock:" + path;
    args[0] = item;
    let s = td.toString(await redisClient.sendCommandAsync("set", td.arrayToJson(args)));
    if (orEmpty(s) == "OK") {
        logger.debug("got cache lock: " + item);
        return item;
    }
    logger.debug("failed cache lock: " + item);
    for (let i = 0; i < timeout * 2; i++) {
        await td.sleepAsync(0.5);
        if (await redisClient.getAsync(item) == null) {
            break;
        }
    }
    logger.debug("failed cache lock, wait finished: " + item);
    return "";
    return b2;
}

async function releaseCacheLockAsync(lock: string) : Promise<void>
{
    await redisClient.delAsync(lock);
}

async function getPromoAsync(req: ApiRequest) : Promise<JsonObject>
{
    let js3: JsonObject;
    let js2 = req.rootPub["promo"];
    if (js2 == null) {
        let jsb = ({ "tags": [], "priority": 0 });
        let lastPtr = await getPubAsync(req.rootPub["lastPointer"], "pointer");
        if (lastPtr != null) {
            jsb["link"] = "/" + lastPtr["pub"]["path"];
        }
        js2 = clone(jsb);
    }
    return js2;
    return js3;
}

function jsonArrayIndexOf(js: JsonObject, id: string) : number
{
    if (!Array.isArray(js)) {
        return -1;
    }
    let x = 0;
    for (let js2 of asArray(js)) {
        if (td.toString(js2) == id) {
            return x;
        }
        x = x + 1;
    }
    return -1;
}

async function addGroupApprovalAsync(groupJson: JsonObject, userJson: JsonObject) : Promise<void>
{
    let grpid = groupJson["id"];
    let userid = userJson["id"];
    await pubsContainer.updateAsync(grpid, async (entry: JsonBuilder) => {
        let appr = entry["approvals"];
        if (appr == null) {
            appr = ([]);
            entry["approvals"] = appr;
        }
        let idx2 = jsonArrayIndexOf(clone(appr), userid);
        if (idx2 >= 0) {
            appr.removeAt(idx2);
        }
        if (appr.length > 200) {
            appr.removeAt(0);
        }
        appr.push(userid);
    });
    await sendNotificationAsync(groupJson, "groupapproval", userJson);
}

async function failureReportLoopAsync() : Promise<void>
{
    let container = await blobService.createContainerIfNotExistsAsync("blobwritetest", "private");
    let table = await tableClient.createTableIfNotExistsAsync("tablewritetest");
    while (true) {
        await td.sleepAsync(300 + td.randomRange(0, 100));
        /* async */ checkSearchAsync();
        await td.sleepAsync(30);
        /* async */ doFailureChecksAsync(container, table);
    }
}

async function checkSearchAsync() : Promise<void>
{
    let res = await tdliteSearch.statisticsAsync();
    lastSearchReport = new Date();
}

async function doFailureChecksAsync(container: azureBlobStorage.Container, table: azureTable.Table) : Promise<void>
{
    if (Date.now() - lastSearchReport.getTime() > 100000) {
        logger.tick("Failure@search");
    }
    if (await redisClient.isStatusLateAsync()) {
        logger.tick("Failure@redis");
    }
    let result2 = await container.createBlockBlobFromTextAsync(td.randomInt(1000) + "", "foobar", {
        justTry: true
    });
    if ( ! result2.succeded()) {
        logger.tick("Failure@blob");
    }
    let entity = azureTable.createEntity(td.randomInt(1000) + "", "foo");
    let ok = await table.tryInsertEntityExtAsync(clone(entity), "or replace");
    if ( ! ok) {
        logger.tick("Failure@table");
    }
}


async function main()
{
    if (fs.existsSync(process.argv[2])) {
        var cfg = JSON.parse(fs.readFileSync(process.argv[2], "utf8"))
        Object.keys(cfg).forEach(k => {
            process.env[k] = cfg[k]
        })
        console.log("loaded cfg")
    }
    await _initAsync();
    await restify.startAsync();
}

main();
