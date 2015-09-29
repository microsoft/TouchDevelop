/// <reference path='../typings/node/node.d.ts' />

'use strict';

import * as td from './td';
import * as assert from 'assert';
import * as util from 'util';
import * as crypto from 'crypto';

var azure_table_node = require("azure-table-node");

type JsonObject = td.JsonObject;
type JsonBuilder = td.JsonBuilder;
var json = td.json;

var logSeqNo: number = 0;
var instanceId: string = "";
var logger: td.AppLogger;
var assumeTablesExists_: boolean = false;


export class Table
{
    constructor(public name:string, public client:Client)
    {
    }

    private async tableOpCoreAsync(op: string, entity: JsonObject, withEtag: boolean) : Promise<string>
    {
        let table: Table = this;
        let error: string;
        let start = logger.loggerDuration();
        await new Promise(resume => {
            var cb = function(err) {
              if (err) {
                 if (err.statusCode == 412 || err.statusCode == 409) error = "normal:" + err.code
                 else if (err.message) error = err.message;
                 else error = util.inspect(err);
              }     
              else error = "";
              //lib.App.log("table: stop " + suff + " " + error)
              resume()
            }
            var ent = entity
            //var suff = op + " " + ent.PartitionKey + "/" + ent.RowKey
            //lib.App.log("table: start " + suff)
            
            if (withEtag && !ent["__etag"])
              table.client[op](table.name, ent, {force:true}, cb)
            else
              table.client[op](table.name, ent, cb)
        });
        table.timeOpCore(start, "write");
        return error;
    }

    private async tableOpAsync(op: string, entity: JsonObject, withEtag: boolean) : Promise<void>
    {
        let err = await this.tableOpCoreAsync(op, prepEntity(entity), withEtag);
        assert(err == "", op + " failed: " + err);
    }

    private async tryTableOpAsync(op: string, entity: JsonObject, withEtag: boolean) : Promise<boolean>
    {
        let err = await this.tableOpCoreAsync(op, prepEntity(entity), withEtag);
        if (err == "") {
            return true;
        }
        else {
            if ( ! /^normal:/.test(err)) {
                logger.info(op + " failed: " + err);
            }
            return false;
        }
    }

    /**
     * Insert an entity into a table (can merge or replace when its already present)
     * {hints:when present:,or merge,or replace}
     */
    public insertEntityAsync(entity: JsonObject, whenPresent: string = "") : Promise<void>
    {
        let op = "";
        if (whenPresent == "") {
            op = "insertEntity";
        }
        else if (whenPresent == "or merge") {
            op = "insertOrMergeEntity";
        }
        else if (whenPresent == "or replace") {
            op = "insertOrReplaceEntity";
        }
        else {
            assert(false, "wrong 'when present' mode");
        }
        return this.tableOpAsync(op, entity, false);
    }

    public insertOrMergeEntityAsync(entity: JsonObject) : Promise<void>
    {
        return this.insertEntityAsync(entity, "or merge")
    }

    public insertOrReplaceEntityAsync(entity: JsonObject) : Promise<void>
    {
        return this.insertEntityAsync(entity, "or replace")
    }

    /**
     * Update an existing entity in a table (can merge with existing fields or completely replace it)
     * {hints:mode:merge,replace}
     */
    public updateEntityAsync(entity: JsonObject, mode: string = "replace") : Promise<void>
    {
        return this.tableOpAsync(getUpdateOp(mode), entity, true);
    }

    public mergeEntityAsync(entity: JsonObject) : Promise<void>
    {
        return this.updateEntityAsync(entity, "merge")
    }

    /**
     * Try to update an existing entity in a table (can merge with existing fields or completely replace it)
     * {hints:mode:merge,replace}
     */
    public tryUpdateEntityAsync(entity: JsonObject, mode: string = "replace") : Promise<boolean>
    {
        let op = getUpdateOp(mode);
        return this.tryTableOpAsync(op, entity, true);
    }

    /**
     * Remove an existing entity from a table
     */
    public deleteEntityAsync(entity: JsonObject) : Promise<void>
    {
        return this.tableOpAsync("deleteEntity", entity, true);
    }

    /**
     * Remove an existing table
     */
    public async deleteTableAsync() : Promise<void>
    {
        let table: Table = this;
        logger.debug("delete table " + table);
        let err = await table.tableStaticOpCoreAsync("deleteTable");
        assert(err == "", "delete table failed: " + err);
    }

    private async tableStaticOpCoreAsync(op: string) : Promise<string>
    {
        let table: Table = this;
        let error: string;
        let start = logger.loggerDuration();
        await new Promise(resume => {
            table.client[op](table.name, (err) => {
              if (err) error = err + "";
              else error = "";
              resume()
            })
        });
        table.timeOpCore(start, "write");
        return error;
    }

    /**
     * Initializes a table query
     */
    public createQuery() : TableQuery
    {
        let query = new TableQuery();
        query.initQuery(this);
        return query;
    }

    /**
     * Retrieve a specific entity from a table; returns invalid if missing
     */
    public async getEntityAsync(PartitionKey: string, RowKey: string) : Promise<JsonObject>
    {
        let table: Table = this;
        let result: JsonObject;
        let start = logger.loggerDuration();
        await new Promise(resume => {
            table.client.handle.getEntity(table.name, PartitionKey, RowKey,
                (err, ent) => {
                  if (err) {
                     if (err.statusCode == 404) {}
                     else td.checkAndLog(err);
                  } else if (ent) {
                      result = ent;
                  }
                  resume()
                })
        });
        table.timeOpCore(start, "read");
        return result;
    }

    /**
     * Try adding a new entity into a table
     */
    public tryInsertEntityAsync(entity: JsonObject) : Promise<boolean>
    {
        return this.tryTableOpAsync("insertEntity", entity, false);
    }

    /**
     * Try to remove an existing entity from a table
     */
    public tryDeleteEntityAsync(entity: JsonObject) : Promise<boolean>
    {
        return this.tryTableOpAsync("deleteEntity", entity, true);
    }

    public timeOpCore(start: number, id: string) : void
    {
        let delta = logger.loggerDuration() - start;
        logger.measure(id + this.suffix(), delta);
    }

    private suffix() : string
    {
        return "@" + this.client.tdAccount;
    }

    /**
     * Insert an entity into a table (can merge or replace when its already present)
     * {hints:when present:,or merge,or replace}
     */
    public tryInsertEntityExtAsync(entity: JsonObject, whenPresent: string = "") : Promise<boolean>
    {
        let op = "";
        if (whenPresent == "") {
            op = "insertEntity";
        }
        else if (whenPresent == "or merge") {
            op = "insertOrMergeEntity";
        }
        else if (whenPresent == "or replace") {
            op = "insertOrReplaceEntity";
        }
        else {
            assert(false, "wrong 'when present' mode");
        }
        return this.tryTableOpAsync(op, entity, false);
    }

}

export class TableQuery
{
    public table: Table;
    public onlyTop: number;

    // azure-table-node interface:
    public limitTo: number;
    public continuation: string[];
    public query: any;
    public forceEtags: boolean;

    public initQuery(table: Table) : void
    {
        let query: TableQuery = this;
        query.table = table;
        query.onlyTop = Number.POSITIVE_INFINITY;
        query.query = azure_table_node.Query.create();
    }

    /**
     * Return at most `count` elements.
     */
    public top(count: number) : TableQuery
    {
        this.onlyTop = count;
        return this.pageSize(count);
    }

    public partitionKeyIs(PartitionKey: string) : TableQuery
    {
        return this.where("PartitionKey", "==", PartitionKey);
    }

    private exprCore(op: string, field: string, comparison: string, argument: string) : TableQuery
    {
        this.query = this.query[op](field, comparison, argument);
        return this
    }

    /**
     * Adds AND clause to the query. Cannot be first.
     * {hints:comparison:==,!=,<,>,<=,>=}
     */
    public and(field: string, comparison: string, argument: string) : TableQuery
    {
        return this.exprCore("and", field, comparison, argument);
    }

    /**
     * Don't return more than `count` elements at the same time.
     */
    public pageSize(count: number) : TableQuery
    {
        this.limitTo = count;
        return this;
    }

    /**
     * Fetch all (or `->top`) results of the query.
     */
    public async fetchAllAsync() : Promise<JsonObject>
    {
        let query: TableQuery = this;
        let coll = [];
        let hasMore = true;
        while (hasMore) {
            let [entities2, token] = await query.fetchCoreAsync();
            for (let js of entities2) {
                if (coll.length < query.onlyTop) {
                    coll.push(js);
                }
            }
            if (token == "" || coll.length >= query.onlyTop) {
                hasMore = false;
            }
            else {
                query = query.continueAt(token);
            }
        }
        // Reset continuation token.
        query = query.continueAt("");
        return coll;
    }

    /**
     * Adds a clause to the query. Has to be first.
     * {hints:comparison:==,!=,<,>,<=,>=}
     */
    public where(field: string, comparison: string, argument: string) : TableQuery
    {
        return this.exprCore("where", field, comparison, argument);
    }

    /**
     * Adds OR clause to the query. Cannot be first.
     * {hints:comparison:==,!=,<,>,<=,>=}
     */
    public or(field: string, comparison: string, argument: string) : TableQuery
    {
        return this.exprCore("or", field, comparison, argument);
    }

    /**
     * Restart a query at `token`.
     */
    public continueAt(token: string) : TableQuery
    {
        if (token)
          this.continuation = token.split(/\//);
        else
          this.continuation = null;
        return this;
    }

    private async fetchCoreAsync() : Promise<[JsonObject[], string]>
    {
        let entities: JsonObject[];
        let token: string;
        let start = logger.loggerDuration();
        let table = this.table
        await new Promise(resume => {
            table.client.handle.queryEntities(table.name, this, (err, res, cont) => {
              if (err)
                throw new Error("error executing query on azure table " + table.name + ": " + err);
              entities = res;
              token = cont ? cont.join("/") : ""
              resume();
            });
        });
        table.timeOpCore(start, "read");
        return <[JsonObject[], string]>[entities, token]
    }

    /**
     * Include `__etag` field to each returned entry.
     */
    public withEtags() : TableQuery
    {
        this.forceEtags = true;
        return this;
    }

    /**
     * Fetch one page (~1000 or `->page size`) results of the query, and allow for continuation.
     */
    public async fetchPageAsync() : Promise<QueryResult>
    {
        let [items, token] = await this.fetchCoreAsync();
        let entities = new QueryResult();
        entities.items = items;
        entities.continuation = token;
        return entities;
    }

}

export class QueryResult
    extends td.JsonRecord
{
    @json public items: JsonObject[];
    @json public continuation: string = "";
    static createFromJson(o:JsonObject) { let r = new QueryResult(); r.fromJson(o); return r; }
}

export interface IInitOptions {
    timeout?: number;
    retries?: number;
    storageAccount?: string;
    storageAccessKey?: string;
}

export class Client
{
    public handle:any;
    public tdAccount:string;

    /**
     * Creates a new table if there is not already a table with the same name
     */
    public async createTableIfNotExistsAsync(name: string) : Promise<Table>
    {
        let client: Client = this;
        let table = new Table(name, client);
        if ( ! assumeTablesExists_) {
            logger.debug("create table " + name);
            await new Promise(resume => {
                client.handle.createTable(name, {ignoreIfExists: true}, (error, result) => {
                  if (error) {
                      table = null
                      throw new Error("cannot create table " + error.message)
                  } else {
                      // ok
                      resume()
                  }
                })
            });
        }
        else {
            logger.debug("would create table " + name);
        }
        return table;
    }
}

/**
 * Create a client for Azure table service. The account options default to environment variables ``AZURE_STORAGE_ACCOUNT`` and ``AZURE_STORAGE_ACCESS_KEY``.
 */
export function createClient(options: IInitOptions = {}) : Client
{
    let client: Client;
    if (logger == null) {
        logger = td.createLogger("tables");
        logSeqNo = 1000000;
        instanceId = createRandomId(6);
        logger.info("initialized");
    }
    if (!options) options = {};
    if (!options.storageAccount) {
        options.storageAccount = td.serverSetting("AZURE_STORAGE_ACCOUNT", false);
    }
    if (!options.storageAccessKey) {
        options.storageAccessKey = td.serverSetting("AZURE_STORAGE_ACCESS_KEY", false);
    }

    // Setup azure client
    var azureTable = azure_table_node;
    
    var opts:any = {}
    var agent = td.mkAgent("https:")
    
    var co = options
    if (co.timeout) opts.timeout = co.timeout;
    if (co.retries) opts.retry = { retries: co.retries };
    
    var account = co.storageAccount
    var key = co.storageAccessKey
    opts.accountName = account
    opts.accountUrl = 'https://' + account + '.table.core.windows.net/'
    opts.accountKey = key
    
    opts.agent = agent
    
    client = new Client();
    client.tdAccount = account;
    client.handle = azureTable.createClient(opts);

    return client;
}

function prepEntity(js: JsonObject) : JsonObject
{
    let res: JsonObject;
    checkPartitionOrRowKey(js["PartitionKey"]);
    checkPartitionOrRowKey(js["RowKey"]);
    for (let key of Object.keys(js)) {
        assert(/^[a-zA-Z0-9_]+$/.test(key), "invalid characters in field name: " + key);
    }
    res = js;
    return res;
}

function getUpdateOp(mode: string) : string
{
    let op: string;
    op = "";
    if (mode == "merge") {
        op = "mergeEntity";
    }
    else if (mode == "replace") {
        op = "updateEntity";
    }
    else {
        assert(false, "not a valid update mode");
    }
    return op;
}

/**
 * Creates an entity with just a partition key and a row key
 */
export function createEntity(PartitionKey: string, RowKey: string) : JsonBuilder
{
    let entity: JsonBuilder;
    entity = {};
    entity["PartitionKey"] = PartitionKey;
    entity["RowKey"] = RowKey;
    return entity;
}

/**
 * Creates a log id (in decreasing order)
 */
export function createLogId() : string
{
    let id: string;
    let x = 20000000000000 - Date.now();
    logSeqNo += 1;
    id = x + "." + logSeqNo + "." + instanceId;
    return id;
}

/**
 * creates a random id
 */
export var createRandomId = td.createRandomId;

async function exampleAsync() : Promise<void>
{
    // This library gives access to the [Azure Storage Service](http://azure.microsoft.com/en-us/documentation/articles/storage-nodejs-how-to-use-table-storage/).
    // ### initializing the library
    // The azure module will read the environment variables ``AZURE_STORAGE_ACCOUNT`` and ``AZURE_STORAGE_ACCESS_KEY``, or ``AZURE_STORAGE_CONNECTION_STRING`` for information required to connect to your Azure storage account.
    let client = createClient();
    // ### working with tables
    // You first need to create a table, or get a handle to it, if it already exists.
    // * create a table
    let table = await client.createTableIfNotExistsAsync("table0");
    // * create an entity
    let entity = createEntity("testpartition0", "testrow0");
    // * set any properties you want in the entity
    entity["name0"] = "value0";
    // * insert the entity into your table. The second parameter can be "", "or merge", or "or replace".
    await table.insertEntityAsync(entity, "");
    // * retrieve an entity based on partition key and row key
    let retrievedEntity = await table.getEntityAsync("testpartition0", "testrow0");
    // * try to update an entity, will return true if the update succeeded. The third parameter can be either "merge", or "replace". "merge" will merge the two entities, taking all properties from both. "replace" will remove any properties present in the original entity and only use properties from the new entity.
    let ok = await table.tryUpdateEntityAsync(retrievedEntity, "merge");
    // * update an entity
    await table.updateEntityAsync(retrievedEntity, "merge");
    // * delete an entity
    await table.deleteEntityAsync(entity);
    // * delete a table
    await table.deleteTableAsync();
    // ### querying a table
    // * first initialize the query
    let query = table.createQuery();
    // * then add to the query
    // * query based on partition key
    let resQuery = query.partitionKeyIs("testpartitionkey1");
    // * use 'and', 'where', or 'or' to add to the query like so
    let resQuery2 = query.and("RowKey", "<", "5");
    // * All comparisons are string comparisons
    // * then pass your final res query to `fetch all` to execute the query. This will return a JSON object with all the entities that fit the query
    let entities = await resQuery2.fetchAllAsync();
}

function checkPartitionOrRowKey(s: string) : void
{
    assert(s != null, "Partition/RowKey must be present");
    assert(s != "", "Partition/RowKey must be non-empty");
    assert( ! /[\/\\\?#]/.test(s), "Partition/RowKey cannot contain \\ / ? #");
}

/**
 * Assume tables already exists for `create table if not exists`
 */
export function assumeTablesExists() : void
{
    assumeTablesExists_ = true;
}

/**
 * Creates a log id (in increasing order)
 */
export function createReverseLogId() : string
{
    let x = Date.now();
    logSeqNo += 1;
    return x + "." + logSeqNo + "." + instanceId;
}
