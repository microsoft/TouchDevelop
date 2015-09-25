/// <reference path='../typings/node/node.d.ts' />

'use strict';

import * as td from 'td';
import * as assert from 'assert';

var TD = td.TD;
type JsonObject = td.JsonObject;
type JsonBuilder = td.JsonBuilder;

var asArray = td.asArray;
var json = td.json;
var clone = td.clone;


var apiKey: string = "";
var apiVersion: string = "";
var serviceUrl: string = "";
var logger: td.AppLogger;
var globalOptions: Options;


export class BatchUpdate
    extends td.JsonRecord
{
    @json public indexName: string = "";
    @json public keyFieldName: string = "";
    @json public root: JsonBuilder;
    @json public value: JsonBuilder[];
    static createFromJson(o:JsonObject) { let r = new BatchUpdate(); r.fromJson(o); return r; }
    /**
     * An upload command is similar to an "upsert" where the document will be inserted if it is new and updated/replaced if it exists. Note that all fields are replaced in the update case.
     */
    public upload(key: string) : JsonBuilder
    {
        let doc: JsonBuilder;
        assert(key != "", "missing key");
        doc = this.addAction("upload", key);
        return doc;
    }

    private addAction(action: string, key: string) : JsonBuilder
    {
        let doc: JsonBuilder;
        assert(this.actionCount() <= 1000, "too many actions in batch");
        assert(this.value != null, "");
        assert(this.keyFieldName != null, "");
        doc = {};
        doc["@search.action"] = action;
        doc[this.keyFieldName] = key;
        this.value.push(doc);
        return doc;
    }

    /**
     * ``merge`` updates an existing document with the specified fields. If the document doesn't exist, the merge will fail. Any field you specify in a merge will replace the existing field in the document. This includes fields of strings. For example, if the document contains a field "tags" with value ``["budget"]`` and you execute a merge with value ``["economy", "pool"]`` for "tags", the final value of the "tags" field will be ``["economy", "pool"]``. It will not be ``["budget", "economy", "pool"]``.
     */
    public merge(key: string) : JsonBuilder
    {
        let doc: JsonBuilder;
        doc = this.addAction("merge", key);
        return doc;
    }

    /**
     * ``delete`` removes the specified document from the index. If you want to remove an individual field from a document, use `merge` instead and simply set the field explicitly to `null`.
     */
    public _delete(key: string) : void
    {
        let doc = this.addAction("delete", key);
    }

    /**
     * Sends the batch request
     */
    public async sendAsync() : Promise<number>
    {
        let statusCode: number;
        log("updating (" + this.actionCount() + " actions)");
        let url = "/indexes/" + this.indexName + "/docs/index?api-version=" + apiVersion;
        let request = createRequest(url);
        request.setMethod("post");
        request.setContentAsJson(clone(this.root));
        let response = await sendRequestAsync(request);
        let js = response.contentAsJson();
        statusCode = response.statusCode();
        if (statusCode == 200) {
            this.value.splice(0, this.value.length);
        }
        else if (statusCode == 207) {
            logger.warning("at least one item was not successfully indexed");
            let jsvalues = js["value"];
            for (let jsvalue of jsvalues) {
                if ( ! jsvalue["status"]) {
                    logger.debug(jsvalue["key"] + ": " + jsvalue["errorMessage"]);
                }
            }
        }
        else if (statusCode == 429) {
            log("index exceeded quotas");
        }
        else {
            log("status code: " + statusCode);
            if (js != null) {
                logger.debug("body: " + JSON.stringify(js));
            }
        }
        return statusCode;
    }

    /**
     * Gets the number of update action in this batch
     */
    public actionCount() : number
    {
        let count: number;
        count = this.value.length;
        return count;
    }

    /**
     * Gets the internal JSON representation of the update.
     */
    public updateBuilder() : JsonBuilder
    {
        let jsb: JsonBuilder;
        jsb = this.root;
        return jsb;
    }

    /**
     * Clears all the pending actions from the update.
     */
    public reset() : void
    {
        this.root = {};
        this.value = [];
        this.root["value"] = this.value;
    }

}

export interface IBatchUpdate {
    indexName?: string;
    keyFieldName?: string;
    root?: JsonBuilder;
    value?: JsonBuilder;
}

export class IndexDefinition
    extends td.JsonRecord
{
    @json public value: JsonBuilder;
    @json public indexName: string = "";
    @json public keyFieldName: string = "";
    @json public _key: FieldDefinition;
    static createFromJson(o:JsonObject) { let r = new IndexDefinition(); r.fromJson(o); return r; }
    /**
     * Creates a new index. If it already exists, it is updated to the new definition.
     */
    public async createOrUpdateAsync() : Promise<Index>
    {
        let index: Index;
        log("creating index " + this.indexName);
        log(JSON.stringify(this.indexBuilder()));
        let request = createRequest("/indexes/" + encodeURIComponent(this.indexName) + "?api-version=" + apiVersion);
        request.setContentAsJson(clone(this.indexBuilder()));
        request.setMethod("put");
        request.setHeader("Prefer", "return=representation");
        let response = await sendRequestAsync(request);
        let js = response.contentAsJson();
        if (js != null) {
            log(this.indexName + ": " + JSON.stringify(js));
        }
        let created = response.statusCode() == 200 || response.statusCode() == 201 || globalOptions.allow_409 && response.statusCode() == 409;
        if (created) {
            index = this.get();
        }
        else {
            log("create: " + response.statusCode());
            index = (<Index>null);
        }
        return index;
    }

    /**
     * Adds a field to the index schema
     * {hints:type:Edm.String,Collection(Edm.String),Edm.Int32,Edm.Double,Edm.Boolean,Edm.DateTimeOffset,Edm.GeographyPoint}
     */
    public addField(name: string, type: string) : FieldDefinition
    {
        let field: FieldDefinition;
        field = new FieldDefinition();
        field.value = {};
        this.value["fields"].addBuilder(field.value);
        type = type.trim();
        field.value["name"] = name;
        field.value["type"] = type;
        return field;
    }

    /**
     * Gets the internal JSON representation of the schema.
     */
    public indexBuilder() : JsonBuilder
    {
        let jsb: JsonBuilder;
        jsb = this.value;
        return jsb;
    }

    /**
     * Adds an origin that will be granted access to your index. This means that any JavaScript code served from those origins will be allowed to query your index (assuming it provides the correct API key). Each origin is typically of the form ``protocol://<fully-qualified-domain-name>:<port>`` although the ``<port>`` is often omitted.
     * {hints:origin:*}
     * {box:hint}
     * If you want to allow access to all origins, include ``*``. Note that this is not recommended practice for production search services. However, it may be useful for development or debugging purposes.
     * {/box}
     */
    public addCORSOrigin(origin: string) : void
    {
        let cors = this.value["corsOptions"];
        if (cors == null) {
            cors = {};
            let value = [];
            cors["allowedOrigins"] = value;
            this.value["corsOptions"] = cors;
        }
        cors["allowedOrigins"].push(origin);
    }

    /**
     * Adds a new scoring profile to the index. [read more](http://msdn.microsoft.com/en-us/library/azure/dn798928.aspx)
     */
    public addScoringProfile(name: string) : ScoringProfile
    {
        let profile: ScoringProfile;
        assert(name != "", "name required");
        let jsprofiles = this.value["scoringProfiles"];
        if (jsprofiles == null) {
            jsprofiles = {};
            jsprofiles.addNull();
            jsprofiles.clear();
            this.value["scoringProfiles"] = jsprofiles;
        }
        profile = new ScoringProfile();
        profile.value = {};
        profile.value["name"] = name;
        jsprofiles.addBuilder(profile.value);
        return profile;
    }

    /**
     * Gets the key field of the index.
     */
    public keyField() : FieldDefinition
    {
        let key: FieldDefinition;
        key = this._key;
        return key;
    }

    /**
     * Gets the index without trying to create it
     */
    public get() : Index
    {
        let index: Index;
        index = new Index();
        index.name = this.indexName;
        index.keyFieldName = this.keyFieldName;
        return index;
    }

}

export interface IIndexDefinition {
    value?: JsonBuilder;
    indexName?: string;
    keyFieldName?: string;
    _key?: FieldDefinition;
}

export class FieldDefinition
    extends td.JsonRecord
{
    @json public value: JsonBuilder;
    static createFromJson(o:JsonObject) { let r = new FieldDefinition(); r.fromJson(o); return r; }
    /**
     * Marks the field as full-text search-able. This means it will undergo analysis such as word-breaking during indexing. If you set a searchable field to a value like ``"sunny day"``, internally it will be split into the individual tokens ``"sunny"`` and ``"day"``. This enables full-text searches for these terms. Fields of type ``Edm.String`` or ``Collection(Edm.String)`` are searchable by default. Fields of other types cannot be searchable.
     * {box:hint}
     * searchable fields consume extra space in your index since Azure Search will store an additional tokenized version of the field value for full-text searches. If you want to save space in your index and you don't need a field to be included in searches, set searchable to false.
     * {/box}
     */
    public setSearchable(value: boolean) : void
    {
        this.value["searchable"] = value;
    }

    /**
     * Allows the field to be referenced in ``$filter`` queries. filterable differs from `searchable` in how strings are handled. Fields of type ``Edm.String`` or ``Collection(Edm.String)`` that are filterable do not undergo word-breaking, so comparisons are for exact matches only. For example, if you set such a field f to ``"sunny day"``, ``$filter=f eq 'sunny'`` will find no matches, but ``$filter=f eq 'sunny day'`` will. All fields are filterable by default.
     */
    public setFilterable(value: boolean) : void
    {
        this.value["filterable"] = value;
    }

    /**
     * By default the system sorts results by score, but in many experiences users will want to sort by fields in the documents. Fields of type ``Collection(Edm.String)`` cannot be sortable. All other fields are sortable by default.
     */
    public setSortable(value: boolean) : void
    {
        this.value["sortable"] = value;
    }

    /**
     * Typically used in a presentation of search results that includes hit count by category (e.g. search for digital cameras and see hits by brand, by megapixels, by price, etc.). This option cannot be used with fields of type ``Edm.GeographyPoint``. All other fields are facetable by default.
     */
    public setFacetable(value: boolean) : void
    {
        this.value["facetable"] = value;
    }

    /**
     * Sets whether the field can be used for auto-complete for type ahead. This can only be set for fields of type ``Edm.String`` or ``Collection(Edm.String)``. suggestions is false by default since it requires extra space in your index.
     * {box:hint}
     * If a field has none of the above attributes set to true (searchable, filterable, sortable, facetable, suggestions) the field is effectively excluded from the inverted index. This option is useful for fields that are not used in queries, but are needed in search results. Excluding such fields from the index improves performance.
     * {/box}
     */
    public setSuggestions(value: boolean) : void
    {
        this.value["suggestions"] = value;
    }

    /**
     * Marks the field as containing unique identifiers for documents within the index. Exactly one field must be chosen as the key field and it must be of type ``Edm.String``. Key fields can be used to look up documents directly.
     */
    setKey(value: boolean) : void
    {
        this.value["key"] = value;
    }

    /**
     * Sets whether the field can be returned in a search result. This is useful when you want to use a field (e.g., margin) as a filter, sorting, or scoring mechanism but do not want the field to be visible to the end user. This attribute must be true for key fields.
     */
    public setRetrievable(value: boolean) : void
    {
        this.value["retrievable"] = value;
    }

}

export interface IFieldDefinition {
    value?: JsonBuilder;
}

export class ScoringProfile
    extends td.JsonRecord
{
    @json public value: JsonBuilder;
    static createFromJson(o:JsonObject) { let r = new ScoringProfile(); r.fromJson(o); return r; }
    /**
     * Sets the scoring weight of a **searchable** field. The weight is a relative positive # of instance.
     */
    public setWeight(field: FieldDefinition, weight: number) : void
    {
        let jstext = this.value["text"];
        if (jstext == null) {
            jstext = {};
            jstext["weights"] = {};
            this.value["text"] = jstext;
        }
        let jsweights = jstext["weights"];
        jsweights[field.value["name"]] = weight;
    }

    /**
     * Adds a magnitude function to the scoring profile for the given field.
     * {hints:interpolation:linear,constant,quadratic,logarithmic}
     */
    public addMagnitude(field: FieldDefinition, boost: number, interpolation: string, boostingRangeStart: number, boostingRangeEnd: number, constantBoostBeyondRange: boolean) : void
    {
        let name = "magnitude";
        let jsfunction = this.addFunction(name, boost, field, interpolation);
        let jsmag = {};
        jsfunction["magnitude"] = jsmag;
        jsmag["boostingRangeStart"] = boostingRangeStart;
        jsmag["boostingRangeEnd"] = boostingRangeEnd;
        jsmag["constantBoostBeyondRange"] = constantBoostBeyondRange;
    }

    private addFunction(name: string, boost: number, field: FieldDefinition, interpolation: string) : JsonBuilder
    {
        let jsfunction: JsonBuilder;
        let jsfunctions = this.value["functions"];
        if (jsfunctions == null) {
            jsfunctions = {};
            jsfunctions.addNull();
            jsfunctions.clear();
            this.value["functions"] = jsfunctions;
        }
        jsfunction = {};
        jsfunctions.addBuilder(jsfunction);
        jsfunction["type"] = name;
        jsfunction["boost"] = boost;
        jsfunction["fieldName"] = field.value["name"];
        jsfunction["interpolation"] = interpolation;
        return jsfunction;
    }

    /**
     * Applies only when functions are specified.
     * {hints:type:sum,average,minimum,maximum,firstMatching}
     */
    public setFunctionAggregation(type: string) : void
    {
        this.value["functionAggregation"] = type.toLowerCase().trim();
    }

}

export interface IScoringProfile {
    value?: JsonBuilder;
}

export class Index
    extends td.JsonRecord
{
    @json public name: string = "";
    @json public keyFieldName: string = "";
    static createFromJson(o:JsonObject) { let r = new Index(); r.fromJson(o); return r; }
    /**
     * Creates an object that allows to add or update multiple documents at once. A single batch may not have more than 1000 actions.
     */
    public createBatchUpdate() : BatchUpdate
    {
        let update: BatchUpdate;
        update = new BatchUpdate();
        update.indexName = this.name;
        update.keyFieldName = this.keyFieldName;
        update.reset();
        return update;
    }

    /**
     * Removes an index and associated documents from your Azure Search service. **Requires an admin api key.**
     */
    public async deleteIndexAsync() : Promise<boolean>
    {
        let deleted: boolean;
        let request = createRequest("/indexes/" + this.name + "?api-version=" + apiVersion);
        request.setMethod("delete");
        let response = await sendRequestAsync(request);
        deleted = response.statusCode() == 204;
        return deleted;
    }

    /**
     * Gets from Azure Search a document count for the current index plus storage usage. **requires an admin api key**
     */
    public async statisticsAsync() : Promise<[number, number]>
    {
        let documentCount: number;
        let storageSize: number;
        let request = createRequest("/indexes/" + this.name + "/stats?api-version=" + apiVersion);
        let response = await sendRequestAsync(request);
        let js = response.contentAsJson();
        if (response.statusCode() == 200) {
            documentCount = js["documentCount"];
            storageSize = js["storageSize"];
        }
        else {
            documentCount = -1;
            storageSize = -1;
        }
        log(this + "stats: " + documentCount + " docs, " + TD.math.roundWithPrecision(storageSize / 1000000, 3) + " Mb");
        return <[number, number]>[documentCount, storageSize]
    }

    /**
     * Retreives the index name
     */
    public indexName() : string
    {
        let name: string;
        name = this.name;
        return name;
    }

    /**
     * Gets the key field name
     */
    public keyName() : string
    {
        let name: string;
        name = this.keyFieldName;
        return name;
    }

}

export interface IIndex {
    name?: string;
    keyFieldName?: string;
}

export class Options
    extends td.JsonRecord
{
    @json public serviceName: string = "";
    @json public apiKey: string = "";
    @json public version: string = "";
    @json public allow_409: boolean = false;
    static createFromJson(o:JsonObject) { let r = new Options(); r.fromJson(o); return r; }
}

export interface IOptions {
    serviceName?: string;
    apiKey?: string;
    version?: string;
    allow_409?: boolean;
}


async function exampleAsync() : Promise<void>
{
    // The [Azure Search](http://msdn.microsoft.com/en-us/library/azure/dn798933.aspx) allows to index and search documents in a scalable way. This library provides the management APIs to create indexes and update documents.
    // ### initialization
    // This library expects the ``AZURE_SEARCH_SERVICE_NAME`` and the ``AZURE_SEARCH_API_KEY`` environment variables to be set.
    init();
    // ### create or update an index
    // To create or update an index, start by creating a schema.
    let schema = createIndexDefinition("docs", "id");
    // * add fields to the schema
    let descr = schema.addField("description", "Edm.String");
    descr.setFilterable(false);
    // * specify CORS options
    schema.addCORSOrigin("*");
    // When you're ready, create the index!
    let index = await schema.createOrUpdateAsync();
    // ### add or update documents
    // Documents are always updated in batch. First, create a batch update.
    let update = index.createBatchUpdate();
    // Then add your update operations.
    // * "upsert" a new document
    let doc = update.upload("book1");
    // * set any additional fields
    doc["descr"] = "A great book!";
    // * merge fields into a document
    let doc2 = update.merge("book2");
    doc2["descr"] = "new description";
    // * delete a document
    update._delete("old");
    // When you are done adding all the actions (<1000 per batch), send them!
    let statusCode = await update.sendAsync();
}

/**
 * Initializes the service with a ``service name`` and an ``api key``. If empty, reads the ``AZURE_SEARCH_SERVICE_NAME`` and the ``AZURE_SEARCH_API_KEY`` environment variables to initialize the search service.
 */
export function init(options_0?: IOptions) : void
{
    let options_ = new Options(); options_.load(options_0);
    logger = td.createLogger("azuresearch");
    log("init");
    if (options_.serviceName == "") {
        options_.serviceName = td.serverSetting("AZURE_SEARCH_SERVICE_NAME", false);
    }
    if (options_.apiKey == "") {
        options_.apiKey = td.serverSetting("AZURE_SEARCH_API_KEY", false);
    }
    if (options_.version == "") {
        options_.version = "2014-07-31-Preview";
    }
    globalOptions = options_;
    apiVersion = options_.version;
    serviceUrl = "https://" + options_.serviceName + ".search.windows.net";
    apiKey = options_.apiKey;
}

export function createRequest(path: string) : td.WebRequest
{
    let request:td.WebRequest;
    assert(apiKey != "", "api key not initialized");
    assert(apiVersion != "", "api version not initialized");
    request = td.createRequest(serviceUrl + path);
    request.setHeader("api-key", apiKey);
    return request;
}

async function sendRequestAsync(request:td.WebRequest) : Promise<td.WebResponse>
{
    let response:td.WebResponse;
    response = await request.sendAsync();
    logger.debug(request.method() + " " + request.url() + " -> " + response.statusCode());
    return response;
}

function checkIndexName(indexName: string) : void
{
    assert(/^[a-z0-9]{2,15}$/.test(indexName), "``name`` must be lower case, have no dashes, and less than 15 characters. ");
}

function log(message: string) : void
{
    logger.info(message);
}

/**
 * Creates an empty index schema
 */
export function createIndexDefinition(indexName: string, keyName: string) : IndexDefinition
{
    let schema: IndexDefinition;
    checkIndexName(indexName);
    assert(keyName != "", "field key  name missing");
    schema = new IndexDefinition();
    schema.value = {};
    schema.indexName = indexName;
    schema.keyFieldName = keyName;
    schema.value["name"] = schema.indexName;
    let fields = [];
    schema.value["fields"] = fields;
    let key = schema.addField(keyName, "Edm.String");
    key.setKey(true);
    schema._key = key;
    return schema;
}

function indexSchemaTest() : void
{
    let schema = createIndexDefinition("index", "key");
    let field = schema.addField("loc", "Collection(Edm.String)");
    field.setSearchable(false);
    schema.addCORSOrigin("https://www.contoso.com/");
    schema.addCORSOrigin("https://www.contoso2.com/");
    let profile = schema.addScoringProfile("profile");
    profile.setWeight(field, 5);
    profile.addMagnitude(field, 5, "linear", 0, 10, true);
    profile.setFunctionAggregation("minimum");
}

/**
 * Gets the index definition from Azure Search
 */
export async function indexDefinitionAsync(indexName: string) : Promise<JsonObject>
{
    let schema: JsonObject;
    let request = createRequest("/indexes/" + indexName + "?api-version=" + apiVersion);
    let response = await request.sendAsync();
    if (response.statusCode() == 200) {
        schema = response.contentAsJson();
    }
    else {
        schema = (<JsonObject>null);
    }
    return schema;
}

/**
 * Gets the list of index definitions from Azure Search
 */
export async function indexeDefinitionsAsync() : Promise<JsonObject>
{
    let schema: JsonObject;
    let request = createRequest("/indexes" + "?api-version=" + apiVersion);
    let response = await request.sendAsync();
    if (response.statusCode() == 200) {
        schema = response.contentAsJson();
    }
    else {
        schema = (<JsonObject>null);
    }
    return schema;
}


