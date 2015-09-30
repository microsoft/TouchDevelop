/// <reference path='../typings/node/node.d.ts' />

'use strict';

import * as td from './td';
import * as assert from 'assert';

type JsonObject = td.JsonObject;
type JsonBuilder = td.JsonBuilder;

var json = td.json;
var clone = td.clone;

import * as azureSearch from "./azure-search"
import * as parallel from "./parallel"


var logger: td.AppLogger;
var artIndex: azureSearch.Index;
var docsIndex: azureSearch.Index;
var pubsIndex: azureSearch.Index;

var documentMimetypes_json: string = "{ \n  \"image/jpeg\": \"jpg\",\n  \"image/png\": \"png\",\n  \"audio/wav\": \"wav\",\n  \"text/css\": \"css\",\n  \"application/javascript\": \"js\",\n  \"text/plain\": \"txt\",\n  \"application/pdf\": \"pdf\",\n  \"application/vnd.openxmlformats-officedocument.wordprocessingml.document\": \"docx\",\n  \"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet\": \"xlsx\",\n  \"application/vnd.openxmlformats-officedocument.presentationml.presentation\": \"pptx\"\n}\n";

export class ArtEntry
    extends td.JsonRecord
{
    @json public id: string = "";
    @json public name: string = "";
    @json public description: string = "";
    @json public type: string = "";
    @json public userid: string = "";
    @json public username: string = "";
    @json public time: number = 0;
    @json public sprite: boolean = false;
    @json public tags: string = "";
    @json public score: number = 0;
    static createFromJson(o:JsonObject) { let r = new ArtEntry(); r.fromJson(o); return r; }

    /**
     * Upserts the art entry in the batch update
     */
    public upsertArt(batch: azureSearch.BatchUpdate) : void
    {
        let doc = batch.upload(this.id);
        td.jsonCopyFrom(doc, this.toJson());
    }

}

export interface IArtEntry {
    id?: string;
    name?: string;
    description?: string;
    type?: string;
    userid?: string;
    username?: string;
    time?: number;
    sprite?: boolean;
    tags?: string;
    score?: number;
}

export class PubEntry
    extends td.JsonRecord
{
    @json public id: string = "";
    @json public kind: string = "";
    @json public score: number = 0;
    @json public name: string = "";
    @json public description: string = "";
    @json public userid: string = "";
    @json public username: string = "";
    @json public body: string = "";
    @json public hashes: string[];
    @json public features: string[];
    @json public time: number = 0;
    @json public editor: string = "";
    @json public artkind: string = "";
    @json public arttype: string = "";
    static createFromJson(o:JsonObject) { let r = new PubEntry(); r.fromJson(o); return r; }

    /**
     * Upserts the pub entry in the batch update
     */
    public upsertPub(batch: azureSearch.BatchUpdate) : void
    {
        let doc = batch.upload(this.id);
        td.jsonCopyFrom(doc, this.toJson());
        if (false) {
            logger.debug("upsert pub: " + JSON.stringify(this.toJson(), null, 2));
        }
    }

}

export interface IPubEntry {
    id?: string;
    kind?: string;
    score?: number;
    name?: string;
    description?: string;
    userid?: string;
    username?: string;
    body?: string;
    hashes?: string[];
    features?: string[];
    time?: number;
    editor?: string;
    artkind?: string;
    arttype?: string;
}

export class PubQuery
    extends td.JsonRecord
{
    public kind: string = "";
    public body: string = "";
    public users: td.StringMap;
    public features: td.StringMap;
    public hashes: td.StringMap;
    public index: string = "";
    public orderby: string = "";
    public select: string = "";
    public scoringProfile: string = "";
    public skip: number = 0;
    public top: number = 0;

    /**
     * Creates the OData search request
     */
    public toSearch() : string
    {
        let search: string;
        search = "*";
        if (this.body != "") {
            if (/[+*\-|")(]/.test(this.body)) {
                search = this.body;
            }
            else {
                search = cleanQuery(this.body).split(" ").map<string>(elt => elt + "*").join("+");
            }
        }
        return search;
    }

    /**
     * Creates the OData filter
     */
    public toFilter() : string
    {
        let filter: string;
        let coll = (<string[]>[]);
        if (this.kind != "") {
            coll.push("kind eq '" + this.kind + "'");
        }
        let includedUsers = (<string[]>[]);
        for (let user of Object.keys(this.users)) {
            if (td.toBoolean(this.users[user])) {
                includedUsers.push(user);
            }
            else {
                coll.push("userid ne '" + cleanQuery(user) + "'");
            }
        }
        if (includedUsers.length > 0) {
            coll.push("(" + includedUsers.map<string>(elt => "userid eq '" + elt + "'").join(" or ") + ")");
        }
        for (let feature of Object.keys(this.features)) {
            if (this.features[feature] == "true") {
                coll.push("features/any(t: t eq '" + cleanQuery(feature) + "')");
            }
            else {
                coll.push("features/all(t: t ne '" + cleanQuery(feature) + "')");
            }
        }
        for (let hash of Object.keys(this.hashes)) {
            if (this.hashes[hash] == "true") {
                coll.push("hashes/any(t: t eq '" + cleanQuery(hash) + "')");
            }
            else {
                coll.push("hashes/all(t: t ne '" + cleanQuery(hash) + "')");
            }
        }
        filter = coll.join(" and ");
        return filter;
    }

    /**
     * Creates an Azure search url (``/indexes/..../docs?search...``) for this query.
     */
    public toUrl() : string
    {
        let url: string;
        url = "/indexes/" + this.index + "/docs?";
        url = url + "search=" + encodeURIComponent(this.toSearch());
        if (this.orderby != "") {
            url = url + "&$orderby=" + encodeURIComponent(this.orderby);
        }
        if (this.select != "") {
            url = url + "&$select=" + encodeURIComponent(this.select);
        }
        if (this.skip > 0) {
            url = url + "&$skip=" + this.skip;
        }
        if (this.top > 0) {
            url = url + "&$top=" + this.top;
        }
        let filter = this.toFilter();
        if (filter != "") {
            url = url + "&$filter=" + encodeURIComponent(filter);
        }
        if (this.scoringProfile != "") {
            url = url + "&scoringProfile=" + encodeURIComponent(this.scoringProfile);
        }
        url = url + "&api-version=2015-02-28";
        return url;
    }

    /**
     * Gets a value indicating if there is any filtering in the search request.
     */
     /*
    public isEmpty() : boolean
    {
        let empty: boolean;
        empty = this.body == "" && this.features.length == 0 && this.users.length == 0 && this.hashes.length == 0;
        return empty;
    }
    */

}

export async function initAsync() : Promise<void>
{
    logger = td.createLogger("search");
    await initArtSearchIndexAsync();
    await initDocsSearchIndexAsync();
    await initPubSearchIndexAsync();
}

async function initArtSearchIndexAsync() : Promise<void>
{
    let schema = azureSearch.createIndexDefinition("art1", "id");
    let name = schema.addField("name", "Edm.String");
    let descr = schema.addField("description", "Edm.String");
    let type = schema.addField("type", "Edm.String");
    type.setSearchable(false);
    type.setFilterable(true);
    let userid = schema.addField("userid", "Edm.String");
    userid.setFilterable(true);
    let username = schema.addField("username", "Edm.String");
    let timeField = schema.addField("time", "Edm.Int32");
    let sprite = schema.addField("sprite", "Edm.Boolean");
    sprite.setFilterable(true);
    let imaggatags = schema.addField("tags", "Edm.String");
    imaggatags.setRetrievable(false);
    let score = schema.addField("score", "Edm.Double");
    let profile = schema.addScoringProfile("editorpics");
    profile.setWeight(schema.keyField(), 10);
    profile.setWeight(name, 5);
    profile.setWeight(descr, 4);
    profile.setWeight(imaggatags, 1);
    profile.addMagnitude(score, 5, "linear", 0, 10, true);
    schema.addCORSOrigin("*");
    artIndex = await schema.createOrUpdateAsync();
    assert(artIndex != null, "");
}

async function initDocsSearchIndexAsync() : Promise<void>
{
    let schema = azureSearch.createIndexDefinition("docs1", "id");
    schema.addCORSOrigin("*");
    let title = schema.addField("title", "Edm.String");
    let description = schema.addField("description", "Edm.String");
    let body = schema.addField("body", "Edm.String");
    let version = schema.addField("version", "Edm.String");
    version.setFilterable(true);
    version.setRetrievable(false);
    version.setSearchable(false);
    let locale = schema.addField("locale", "Edm.String");
    locale.setFilterable(true);
    locale.setSearchable(false);
    let priority = schema.addField("priority", "Edm.Int32");
    priority.setRetrievable(false);
    priority.setSearchable(false);
    let profile = schema.addScoringProfile("prioritized");
    profile.setWeight(schema.keyField(), 10);
    profile.setWeight(title, 100);
    profile.setWeight(description, 50);
    profile.setWeight(body, 10);
    profile.addMagnitude(priority, 2, "linear", 0, 0, false);
    docsIndex = await schema.createOrUpdateAsync();
    assert(docsIndex != null, "");
}

/**
 * Creates a batch update instance that can be used to update the ``art`` index.
 */
export function createArtUpdate() : azureSearch.BatchUpdate
{
    let batch: azureSearch.BatchUpdate;
    batch = artIndex.createBatchUpdate();
    return batch;
}

/**
 * Creates an art entry to be indexed
 */
export function createArtEntry(id: string, options_0: IArtEntry = {}) : ArtEntry
{
    let options_ = new ArtEntry(); options_.load(options_0);
    let entry: ArtEntry;
    assert(id != "", "missing art id");
    assert(options_.id == "", "id already specified");
    entry = options_;
    entry.id = id;
    return entry;
}

/*
export async function indexDocsAsync() : Promise<void>
{
    let jsversion = await touchdevelopCloud.getJsonAsync("language/version");
    let version = jsversion["releaseid"];
    logger.debug("current version: " + version);
    let topics = await touchdevelopCloud.getJsonAsync("doctopics");
    logger.debug("received topics: " + topics.length);
    let update = docsIndex.createBatchUpdate();
    await parallel.forBatchedAsync(topics.length, 32, async (x: number) => {
        let topic = topics[x];
        await indexDocAsync(topic, update, version);
    }
    , async () => {
        await applyBatchUpdateAsync(update);
    });
}
*/

async function applyBatchUpdateAsync(update: azureSearch.BatchUpdate) : Promise<void>
{
    let statusCode = await update.sendAsync();
    logger.info("update ( " + update.actionCount() + " actions): " + statusCode);
    update.reset();
}

/*
async function indexDocAsync(topic: JsonObject, update: azureSearch.BatchUpdate, version: string) : Promise<void>
{
    let id = topic["id"];
    let scriptId = topic["scriptId"];
    logger.debug("indexing " + id + " --> " + scriptId);
    let doc = update.upload(id);
    doc["title"] = topic["name"];
    doc["description"] = topic["description"];
    doc["version"] = version;
    doc["locale"] = "en";
    if (scriptId != "") {
        let docsInfo = await touchdevelopCloud.getJsonAsync(scriptId + "/docs-info");
        if (docsInfo != null) {
            let body = "";
            for (let div of docsInfo["body"]) {
                body = body + "\\n" + td.toString(div).replace(/<[^>]*>/g, " ");
            }
            doc["body"] = body;
        }
        else {
            logger.warning("failed to retrieve docs for " + id);
        }
    }
}
*/

async function exampleAsync() : Promise<void>
{
    // ### indices
    // There are 3 indexes in the current implementation:
    // * ``pubs``, all publications
    // * ``art``, specialized index for pictures and sounds. Used for in-editor art search.
    // * ``docs``, specialized index for documentation
    // ### init and setup
    // This library assumes that the ``azure search`` library has been intialized. The ``touchdevelop cloud`` library may also be initialized to point to a different cloud.
    // Simply call the ``init`` action to create the indexes.
    await initAsync();
    // ### indexing art
    // Indexing (create, update, delete) can be batched.
    // * create a batch update.
    let batch = createArtUpdate();
    // * create or updatet an art entry
    let entry = createArtEntry("uniqueid", {
        name: "some picture",
        description: "a description"
    });
    entry.upsertArt(batch);
    // * delete an entry
    batch._delete("uniqueid");
    // * send the batch
    let statusCode = await batch.sendAsync();
    // * clear the batch before uploading again
    batch.reset();
    // ### indexing publications
    // Use the ``to pub entry`` helper to convert a publication json payload into a pub entry; then proceed as with the art search.
    // ### searching publications
    let query = toPubQuery("pubs1", "script", "hello #docs ~@eijl feature:library");
    let search = query.toSearch();
}

async function initPubSearchIndexAsync() : Promise<void>
{
    let schema = azureSearch.createIndexDefinition("pubs1", "id");
    let kind = schema.addField("kind", "Edm.String");
    kind.setFilterable(true);
    kind.setSortable(false);
    kind.setFacetable(false);
    kind.setSearchable(false);
    let score = schema.addField("score", "Edm.Int32");
    score.setFilterable(true);
    score.setFacetable(false);
    score.setSortable(true);
    score.setSearchable(false);
    let name = schema.addField("name", "Edm.String");
    name.setSuggestions(true);
    let description = schema.addField("description", "Edm.String");
    let editor = schema.addField("editor", "Edm.String");
    editor.setFilterable(true);
    editor.setSearchable(false);
    editor.setSortable(false);
    let body = schema.addField("body", "Edm.String");
    body.setRetrievable(false);
    let userid = schema.addField("userid", "Edm.String");
    userid.setFilterable(true);
    let username = schema.addField("username", "Edm.String");
    let time2 = schema.addField("time", "Edm.Int32");
    time2.setFilterable(true);
    time2.setFacetable(true);
    let features = schema.addField("features", "Collection(Edm.String)");
    features.setFilterable(true);
    features.setSortable(false);
    features.setSearchable(true);
    let hashes = schema.addField("hashes", "Collection(Edm.String)");
    hashes.setFilterable(true);
    hashes.setSortable(false);
    hashes.setSearchable(true);
    let artKind = schema.addField("artkind", "Edm.String");
    artKind.setFilterable(true);
    artKind.setSearchable(false);
    artKind.setSortable(false);
    let artType = schema.addField("arttype", "Edm.String");
    artType.setFilterable(true);
    artType.setSearchable(false);
    artType.setSortable(false);
    let profile = schema.addScoringProfile("pubs");
    profile.setWeight(schema.keyField(), 10);
    profile.setWeight(userid, 10);
    profile.setWeight(username, 30);
    profile.setWeight(name, 100);
    profile.setWeight(description, 50);
    profile.setWeight(body, 5);
    profile.setWeight(hashes, 20);
    profile.setWeight(features, 20);
    schema.addCORSOrigin("*");
    pubsIndex = await schema.createOrUpdateAsync();
    assert(pubsIndex != null, "");
}

/**
 * Creates an art entry to be indexed
 */
export function createPubEntry(id: string, options_0: IPubEntry = {}) : PubEntry
{
    let options_ = new PubEntry(); options_.load(options_0);
    let entry: PubEntry;
    assert(id != "", "missing art id");
    assert(options_.id == "", "id already specified");
    if (options_.hashes == null) {
        options_.hashes = (<string[]>[]);
    }
    if (options_.features == null) {
        options_.features = (<string[]>[]);
    }
    options_.id = id;
    return options_;
    return entry;
}

/**
 * Creates a batch update instance that can be used to update the ``pubs`` index.
 */
export function createPubsUpdate() : azureSearch.BatchUpdate
{
    let batch: azureSearch.BatchUpdate;
    batch = pubsIndex.createBatchUpdate();
    return batch;
}

/**
 * Collects various statistics about the search indexes
 */
export async function statisticsAsync() : Promise<JsonObject>
{
    let res: JsonObject;
    let coll = (<azureSearch.Index[]>[]);
    coll.push(docsIndex);
    coll.push(artIndex);
    coll.push(pubsIndex);
    let jsres = {};
    await parallel.forAsync(coll.length, async (x: number) => {
        let index = coll[x];
        let [documentCount, storageSize] = await index.statisticsAsync();
        let jsb2 = {};
        jsb2["docs"] = documentCount;
        jsb2["storage"] = storageSize;
        jsres[index.indexName()] = jsb2;
    });
    res = clone(jsres);
    return res;
}

/**
 * Removes unwanted characters, spurious whitespaces
 */
function cleanCode(text: string) : string
{
    let out: string;
    if (text == null || text == "") {
        return "";
    }
    else {
        // statement ids
        text = text.replace(/#[a-zA-Z0-9]{12,}/g, "\n");
        // string resources
        text = text.replace(/"data:text\/plain;base64,[^"]+/g, "");
        // html tags
        text = text.replace(/<[^>]>/g, "");
        text = text.replace(/[^a-zA-Z0-9-+*\/@_=\.,\s""':\\]/g, " ");
        // spurious spaces
        text = text.replace(/ {2,}/g, " ");
        if (text.length > 16384) {
            text = text.substr(0, 16384);
        }
        // make it all lower case
        text = text.toLowerCase();
        return text;
    }
    return out;
}

/**
 * Creates an indexable entry from a publication
 */
export function toPubEntry(pub: JsonObject, body: string, features: string[], score: number) : PubEntry
{
    let r: PubEntry;
    let entry = createPubEntry(pub["id"], {
        kind: pub["kind"],
        score: score,
        userid: orEmpty(pub["userid"]),
        username: orEmpty(pub["username"]).toLowerCase(),
        body: cleanCode(body),
        features: features.map<string>(elt => elt.toLowerCase()),
        time: pub["time"]
    });
    // if not specified, assign editor to touchdevelop
    // some pubs have a name or description
    entry.name = cleanQuery(pub["name"]);
    entry.description = cleanQuery(pub["description"]);
    // specific indexing
    if (entry.kind == "user") {
        entry.description = cleanQuery(pub["about"]);
    }
    else if (entry.kind == "group") {
        entry.description = entry.description + " " + cleanQuery(pub["school"]);
    }
    else if (entry.kind == "art") {
        if (pub.hasOwnProperty("arttype")) {
            entry.arttype = pub["arttype"];
        }
        if (pub.hasOwnProperty("wavurl")) {
            entry.artkind = "sound";
        }
        else if (pub.hasOwnProperty("pictureurl")) {
            entry.artkind = "picture";
        }
        else {
            entry.artkind = "document";
        }
    }
    else if (entry.kind == "script") {
        entry.editor = pub["editor"];
        if (! entry.editor) {
            entry.editor = "touchdevelop";
        }
    }
    entry.hashes = hashes(entry.description);
    return entry;
}

/**
 * Extracts hashtags from description
 */
function hashes(description: string) : string[]
{
    return (description.match(/#[a-zA-Z0-9]+/g) || []).map<string>(elt1 => elt1.replace(/#/g, ""));
}


var orEmpty = td.orEmpty;

/**
 * Parses the search text and returns a structured search query.
 */
export function toPubQuery(index: string, kind: string, text: string) : PubQuery
{
    let query: PubQuery;
    query = new PubQuery();
    query.index = index;
    query.kind = kind;
    query.orderby = "score desc, time desc";
    query.select = "id,kind,name,score,time";
    query.users = {};
    query.features = {};
    query.hashes = {};
    // parse text...
    let body = (<string[]>[]);
    for (let word of text.split(" ").filter(elt => elt != "")) {
        let [key, val] = parseProperty(word);
        if (key == "userid") {
            query.users[val] = "true";
        }
        else if (key == "feature") {
            query.features[val] = "true";
        }
        else if (key == "libraries") {
            query.features["libraries"] = (val.toLowerCase().trim() == "true").toString().toLowerCase();
        }
        else if (key == "scoring") {
            query.scoringProfile = val;
        }
        else if (key == "kind") {
            query.kind = val;
        }
        else {
            let m = (/(\~)?([#@*])([a-zA-Z0-9_\.]+)/.exec(word) || []);
            if (m.length > 0) {
                let enabled = (m[1] == null).toString();
                let op = m[2];
                val = m[3];
                if (op == "#") {
                    query.hashes[val] = enabled;
                }
                else if (op == "@") {
                    query.users[val] = enabled;
                }
                else if (op == "*") {
                    query.features[val] = enabled;
                }
            }
            else {
                body.push(word);
            }
        }
    }
    query.body = body.join(" ");
    return query;
}

function parseProperty(text: string) : [string, string]
{
    let key: string;
    let value: string;
    let x = text.indexOf(":", 0);
    if (x > -1) {
        key = text.substr(0, x);
        value = text.substr(x + 1, text.length - x - 1);
    }
    else {
        key = "";
        value = "";
    }
    return [key, value]
}

/**
 * Removes unwanted characters, spurious whitespaces
 */
function cleanQuery(text: string) : string
{
    let out: string;
    if (text == null || text == "") {
        out = "";
    }
    else {
        out = text.replace(/[^a-zA-Z0-9#@*~ ]/g, "");
        out = out.toLowerCase();
    }
    return out;
}

function toPubQueryTest() : void
{
    let coll = "test\n@user\n#hash\n*feature\n~@notuser ~#nothash ~*feature\ntwo words".split("\n");
    for (let s of coll) {
        let query = toPubQuery("pubs1", "script", s);
        let search = query.toSearch();
        let filter = query.toFilter();
        let url = query.toUrl();
        td.log(s + " -> " + search);
        td.log(s + " -> " + filter);
        td.log(s + " -> " + url);

    }

}


