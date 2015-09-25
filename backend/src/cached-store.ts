/// <reference path='../typings/node/node.d.ts' />

'use strict';

import * as td from 'td';
import * as assert from 'assert';
import * as crypto from 'crypto';

type JsonObject = td.JsonObject;
type JsonBuilder = td.JsonBuilder;

var asArray = td.asArray;
var json = td.json;
var clone = td.clone;

import * as azureBlobStorage from "./azure-blob-storage"
import * as redis from "./redis"
import * as parallel from "./parallel"

type UpdateJson = td.Action1<JsonBuilder>;

var blobService: azureBlobStorage.BlobService;
var redisClient: redis.Client;
var logger: td.AppLogger;
var blobTimeout: number = 0;
var nullJson: JsonObject;

var badWordsJs: JsonObject =
{a:{n:{a:{l:1},u:{s:1}},r:{r:{s:{e:1}},s:{e:1}},s:{s:1},h:{o:{l:{e:1}}}},
b:{a:{l:{l:{s:1}}},i:{t:{c:{h:1}}},o:{n:{e:{r:1}},o:{b:1}},u:{m:1,t:{t:1},
s:{t:{y:1}}},b:{w:1},d:{s:{m:1}}},c:{a:{w:{k:1}},h:{i:{n:{k:1,c:1}},
o:{a:{d:1},d:{e:1}}},i:{p:{a:1}},l:{i:{t:1}},n:{u:{t:1},t:{s:1,z:1}},
o:{c:{k:1},k:1,o:{n:1},x:1},r:{a:{p:1}},u:{m:1,n:{t:1}}},d:{a:{m:{n:1},
g:{o:1}},i:{c:{k:1},l:{d:{o:1}},n:{k:1},r:{s:{a:1}},k:{e:1}},l:{c:{k:1}},
o:{o:{s:{h:1}}},u:{c:{h:{e:1}}},y:{k:{e:1}},v:{d:{a:1}},e:{g:{g:{o:1}}}},
f:{u:{c:{k:1},k:1,x:1},a:{g:1,n:{n:{y:1},y:{y:1}},i:{g:1},r:{t:1}},
c:{u:{k:1}},e:{c:{k:1,a:{l:1}},l:{c:{h:1}}},o:{o:{k:1}}},h:{e:{l:{l:1},
s:{h:{e:1}},e:{b:1}},o:{a:{r:1},e:1,m:{o:1},r:{e:1,n:{y:1}},o:{r:1}},
u:{c:1,k:1},i:{t:{t:{y:1},y:1}},y:{t:1}},j:{a:{p:1},i:{s:{m:1,i:{m:1},
s:1},z:1},u:{g:{g:{s:1}}}},k:{a:{w:{k:1},n:{k:{y:1}}},n:{o:{b:1}},
o:{c:{k:1},o:{c:{h:1}}},u:{m:1,n:{t:1}},i:{k:{e:1},n:{k:{y:1}}},
r:{a:{u:{t:1}}},y:{k:{e:1}}},l:{a:{b:{i:{a:1}}},m:{f:{a:{o:1}}},u:{s:{t:1},
t:{t:{y:1}}},e:{s:{b:{o:1}}},o:{w:{o:{b:1}}},i:{t:1}},m:{o:{f:{o:1}},
u:{f:{f:1},t:{h:{a:1}}},i:{l:{f:1},c:{k:1},n:{g:{e:1}}}},n:{a:{z:{i:1},
s:{t:{t:1}}},i:{g:{g:{a:1},u:{r:1}},i:{g:{r:1}}},o:{b:1},e:{g:{r:{o:1}}},
u:{d:{e:1}}},p:{a:{w:{n:1},n:{t:{y:1}},k:{i:1,y:1},c:{k:{i:1,y:1}}},
e:{n:{i:{s:1},a:{s:1},u:{s:1}}},h:{u:{c:{k:1},k:1,q:1}},i:{s:{s:1}},
o:{o:{p:1,f:1,n:1},r:{n:1},l:{a:{c:1,k:1}}},r:{i:{c:{k:1}},o:{n:1}},
u:{b:{e:1},s:{s:{e:1,i:1,y:1}},n:{t:{a:1}},t:{o:1},u:{k:{e:1}}},
t:{h:{c:1}}},s:{h:{i:{t:1,z:1},a:{g:1},o:{t:{a:1}}},e:{m:{e:{n:1}},x:1},
k:{a:{n:{k:1}},e:{e:{t:1}}},l:{u:{t:1}},m:{u:{t:1},e:{g:1}},p:{a:{c:1},
u:{n:{k:1}},i:{c:1},o:{o:{k:1}}},c:{a:{t:1,n:{k:1}}},u:{c:{k:1}}},
t:{e:{e:{t:{s:1},z:1}},i:{t:1},u:{r:{d:1},s:{h:{y:1}}},w:{a:{t:1},
u:{n:{t:1}},i:{n:{k:1}}},a:{r:{d:1}}},v:{u:{l:{v:{a:1}}},a:{j:{j:1},g:1}},
w:{a:{n:{g:1,k:1}},h:{o:{a:{r:1},r:{e:1}}},i:{l:{l:{y:1}}},o:{p:1}},
x:{x:{x:1}},e:{c:{c:{h:{i:1}}},n:{e:{m:{a:1}}}},g:{r:{o:{p:{e:1}}},
s:{p:{o:{t:1}}},u:{r:{o:1},i:{d:{o:1}}},a:{y:1},o:{o:{c:{h:1},k:1}}},
o:{r:{g:{y:1}}},q:{u:{e:{a:{f:1},e:{f:1,r:1}}},w:{e:{i:{r:1}}}},
r:{a:{p:{e:1}},e:{n:{o:{b:1}}},u:{s:{k:{i:1}}}},y:{a:{o:{i:1}},
i:{f:{f:{y:1}}}},i:{a:{t:{c:{h:1}}}},u:{k:{a:{h:1},e:{n:1},i:{n:1},k:1}}}

export class Container
{
    public name: string = "";
    public blob: azureBlobStorage.Container;
    public cacheEnabled: boolean = false;
    public memCacheValidity: number = 0;
    public lastMemSwap: number = 0;
    public memCache: JsonBuilder;
    public memCacheSecondary: JsonBuilder;
    public cacheValidity: number = 0;

    /**
     * Try inserting named entry into the cache.
     */
    public async tryInsertAsync(name: string, data_: JsonBuilder) : Promise<boolean>
    {
        let ok: boolean;
        data_["__version"] = 1;
        let text = JSON.stringify(data_);
        let result = await this.blob.createBlockBlobFromTextAsync(name, text, {
            forceNew: true,
            justTry: true,
            contentType: "application/json; charset=utf-8",
            timeoutIntervalInMs: blobTimeout
        });
        ok = result.succeded();

        if (ok) {
            await this.saveCacheAsync(name, text, 1);
        }
        else if (false) {
            logger.warning("failed to insert: " + result.error());
        }
        return ok;
    }

    /**
     * Fetch named entry, run `update` on it, and store the results. Repeat in case of race.
     */
    public async updateAsync(name: string, update: UpdateJson) : Promise<void>
    {
        let blob = this.blob;
        let retries = 20;
        let sleepTime = 0.1;
        while (retries > 0) {
            let info = await blob.getBlobToTextAsync(name, {
                timeoutIntervalInMs: blobTimeout
            });
            logger.debug("got text: " + name);
            let text = info.text();
            let isNew = false;
            if (text == null && info.error() == "404") {
                text = "{}";
            }
            let jsb = JSON.parse(text);
            let ver = jsb["__version"];
            await update(jsb);
            if (ver == null) {
                ver = 1;
            }
            else {
                ver = ver + 1;
            }
            jsb["__version"] = ver;
            let text2 = JSON.stringify(jsb);
            let result = await this.blob.createBlockBlobFromTextAsync(name, text2, {
                etag: info.etag(),
                forceNew: isNew,
                justTry: true,
                contentType: "application/json; charset=utf-8",
                timeoutIntervalInMs: blobTimeout
            });
            if (result.succeded()) {
                logger.debug("save OK: " + name);
                await this.saveCacheAsync(name, text2, ver);
                logger.debug("cache OK: " + name);
                retries = -1;
            }
            else {
                retries = retries - 1;
                sleepTime = sleepTime * (1 + td.randomNormalized());
                await td.sleepAsync(sleepTime);
                logger.info("save FAILED: " + name + " sleep: " + sleepTime);
            }
        }
        if (retries == 0) {
            assert(false, "atomic blob update failed, " + this.name + "/" + name);
        }
    }

    private async saveCacheAsync(name: string, val: string, ver: number) : Promise<void>
    {
        this.saveMemCache(name, val);
        if (this.cacheEnabled) {
            let root = "c:" + this.name + "/" + name;
            if (this.blob == null) {
                if (this.cacheValidity > 0 && ! td.startsWith(name, "@")) {
                    await redisClient.setpxAsync(root + ":data", val, this.cacheValidity * 1000);
                }
                else {
                    await redisClient.setAsync(root + ":data", val);
                }
            }
            else {
                let keys = (<string[]>[]);
                keys.push(root + ":version");
                keys.push(root + ":data");
                let args = (<string[]>[]);
                args.push(ver.toString());
                args.push(val);
                if (this.cacheValidity > 0) {
                    args.push(this.cacheValidity.toString());
                    let value = await redisClient.evalAsync(
                            `
                            local curr = tonumber(redis.call('get', KEYS[1]));
                            if not curr then curr = 0 end;
                            if curr < tonumber(ARGV[1]) then 
                               local ex = tonumber(ARGV[3])
                               redis.call('set', KEYS[2], ARGV[2], 'ex', ex); 
                               redis.call('set', KEYS[1], ARGV[1], 'ex', ex + 1);
                            end`,
                    keys, args);
                }
                else {
                    let value1 = await redisClient.evalAsync(
                            `
                            local curr = tonumber(redis.call('get', KEYS[1]));
                            if not curr then curr = 0 end;
                            if curr < tonumber(ARGV[1]) then 
                               redis.call('set', KEYS[2], ARGV[2]); 
                               redis.call('set', KEYS[1], ARGV[1]);
                            end`,
                    keys, args);
                }
            }
            if (false) {
                // watch root:version
                // v = get root:version
                // if v < ver then
                // multi
                // save root:version ver
                // save root:data val
                // exec
                // if failed repeat
                // end if
            }
        }
    }

    /**
     * Fetch named entry.
     */
    public async getAsync(name: string) : Promise<JsonObject>
    {
        let entry: JsonObject;
        let text = await this.getFromCacheAsync(name);
        if (text != null) {
            return JSON.parse(text);
        }
        if (this.blob == null) {
            return (<JsonObject>null);
        }
        let info = await this.blob.getBlobToTextAsync(name, {
            timeoutIntervalInMs: blobTimeout
        });
        text = info.text();
        if (text == null) {
            entry = (<JsonObject>null);
        }
        else {
            entry = JSON.parse(text);
            await this.saveCacheAsync(name, text, entry["__version"]);
        }
        return entry;
    }

    /**
     * Insert entry at a freshly generated unique id.
     */
    public async insertUniqueAsync(data_: JsonBuilder, minIdLength: number) : Promise<string>
    {
        let id: string;
        let retries = 5;
        let collisions = retries;
        let len = minIdLength;
        id = "";
        while (collisions > 0) {
            id = freshShortId(minIdLength);
            data_["id"] = id;
            let ok = await this.tryInsertAsync(id, data_);
            if (ok) {
                collisions = -1;
            }
            else if (collisions == 1) {
                collisions = retries;
                len = len + 1;
            }
            else {
                collisions = collisions - 1;
            }
        }
        return id;
    }

    private async getFromCacheAsync(name: string) : Promise<string>
    {
        let text: string;
        text = (<string>null);
        if (this.memCacheValidity > 0) {
            let now = new Date().getTime();
            swapMemCaches(now, this);
            let v = this.memCache[name];
            if (v == null || now - v > this.memCacheValidity) {
                v = this.memCacheSecondary[name];
                if (v == null || now - v > this.memCacheValidity) {
                }
                else {
                    text = this.memCacheSecondary[name + ":data"];
                }
            }
            else {
                text = this.memCache[name + ":data"];
            }
        }
        if (text == null && this.cacheEnabled) {
            let root = "c:" + this.name + "/" + name;
            text = await redisClient.getAsync(root + ":data");
            if (text != null) {
                this.saveMemCache(name, text);
            }
        }
        return text;
    }

    /**
     * Try inserting named entry into the cache.
     */
    public async insertAtHashAsync(entry: JsonBuilder) : Promise<string>
    {
        let id: string;
        let text = JSON.stringify(entry);
        let hash = crypto.createHash("sha256");
        hash.update(text, "utf8");
        id = hash.digest("hex").toLowerCase();
        let result = await this.blob.createBlockBlobFromTextAsync(id, text, {
            forceNew: true,
            justTry: true,
            contentType: "application/json; charset=utf-8",
            timeoutIntervalInMs: blobTimeout
        });
        if (result.succeded()) {
            await this.saveCacheAsync(id, text, 0);
        }
        return id;
    }

    /**
     * Get the name of the blob container.
     */
    public getName() : string
    {
        return this.name;
    }

    /**
     * Fetch a number of entries at once.
     */
    public async getManyAsync(names: string[]) : Promise<JsonObject[]>
    {
        let entries: JsonObject[];
        if (names.length > 0) {
            let pref = "c:" + this.name + "/";
            let nameMap = {};
            let idxMap = (<number[]>[]);
            let namesUnique = (<string[]>[]);
            for (let name of names) {
                if (nameMap.hasOwnProperty(name)) {
                    idxMap.push(nameMap[name]);
                }
                else {
                    idxMap.push(namesUnique.length);
                    nameMap[name] = namesUnique.length;
                    namesUnique.push(name);
                }
            }
            names = namesUnique;
            let values = await redisClient.mgetAsync(names.map<string>(elt => pref + orEmpty(elt) + ":data"));
            let coll:Promise<void>[] = [];
            let jsb = clone(values);
            if (this.blob != null) {
                for (let i = 0; i < names.length; i++) {
                    if (td.toString(values[i]) == null && orEmpty(names[i]) != "") {
                        let task = /* async */ this.fetchFromBlobAsync(names, i, jsb);
                        coll.push(task);
                    }
                }
            }
            for (let task2 of coll) {
                await task2;
            }
            entries = (<JsonObject[]>[]);
            for (let idx of idxMap) {
                let elt1 = jsb[idx];
                if (elt1 == null) {
                    entries.push(nullJson);
                }
                else {
                    entries.push(JSON.parse(td.toString(elt1)));
                }
            }
        }
        else {
            entries = (<JsonObject[]>[]);
        }
        return entries;
    }

    private async fetchFromBlobAsync(names: string[], i: number, values: JsonBuilder) : Promise<void>
    {
        let info = await this.blob.getBlobToTextAsync(names[i], {
            timeoutIntervalInMs: blobTimeout
        });
        if (info.text() != null) {
            values[i] = clone(info.text());
            let js = JSON.parse(info.text());
            await this.saveCacheAsync(names[i], info.text(), js["__version"]);
        }
    }

    public async blobContainerAsync() : Promise<azureBlobStorage.Container>
    {
        let blobCont: azureBlobStorage.Container;
        blobCont = this.blob;
        return blobCont;
    }

    /**
     * Inserting named entry into the cache, overwriting whatever was there.
     */
    public async justInsertAsync(name: string, data_: JsonBuilder) : Promise<void>
    {
        data_["__version"] = 1;
        let text = JSON.stringify(data_);
        if (this.blob != null) {
            let result = await this.blob.createBlockBlobFromTextAsync(name, text, {
                forceNew: false,
                contentType: "application/json; charset=utf-8",
                timeoutIntervalInMs: blobTimeout
            });
            let ok = result.succeded();
        }
        await this.saveCacheAsync(name, text, 1);
    }

    private saveMemCache(name: string, val: string) : void
    {
        if (this.memCacheValidity > 0) {
            let now = new Date().getTime();
            swapMemCaches(now, this);
            this.memCache[name] = now;
            this.memCache[name + ":data"] = val;
        }
    }

}

export interface IContainer {
    name?: string;
    blob?: azureBlobStorage.Container;
    cacheEnabled?: boolean;
    memCacheValidity?: number;
    lastMemSwap?: number;
    memCache?: JsonBuilder;
    memCacheSecondary?: JsonBuilder;
    cacheValidity?: number;
}

export interface ICreateOptions {
    noCache?: boolean;
    access?: string;
    inMemoryCacheSeconds?: number;
    redisCacheSeconds?: number;
    blobService?: azureBlobStorage.BlobService;
    noBlobStorage?: boolean;
}


export async function createContainerAsync(name: string, options: ICreateOptions = {}) : Promise<Container>
{
    let container: Container;
    await initAsync();
    container = new Container();
    container.name = name;
    if (!options.access) {
        options.access = "private";
    }
    if (!options.blobService) {
        options.blobService = blobService;
    }
    if ( ! options.noBlobStorage) {
        container.blob = await options.blobService.createContainerIfNotExistsAsync(name, options.access);
    }
    container.cacheEnabled = ! options.noCache;
    container.cacheValidity = options.redisCacheSeconds || 0;
    options.inMemoryCacheSeconds = options.inMemoryCacheSeconds || 0;
    if (options.inMemoryCacheSeconds > 0) {
        container.memCacheValidity = options.inMemoryCacheSeconds * 1000;
        container.memCache = {};
        container.memCacheSecondary = {};
        container.lastMemSwap = new Date().getTime();
    }
    return container;
}

export async function initAsync() : Promise<void>
{
    if (blobService == null) {
        blobService = azureBlobStorage.createBlobService();
        if (false) {
            blobService.setLogLevel("debug");
        }
        redisClient = await redis.createClientAsync("", 0, "");
        logger = td.createLogger("cache");
        blobTimeout = 2000;
        nullJson = (null);
    }
}

export function freshShortId(len: number) : string
{
    let id: string;
    id = azureBlobStorage.createRandomId(len * 4).replace(/[^a-zA-Z]/g, "").toLowerCase().replace(/^[acegikmoqsuwy]*/g, "").substr(0, len);
    if (id.length < len || isBadWord(id)) {
        id = freshShortId(len);
    }
    return id;
}

function swapMemCaches(now: number, container: Container) : void
{
    if (now - container.lastMemSwap > container.memCacheValidity) {
        container.memCacheSecondary = container.memCache;
        container.memCache = {};
        container.lastMemSwap = now;
    }
}

function isBadWord(s: string) : boolean
{
    let bad: boolean;
    bad = false;
    for (let j = 0; j < s.length - 3; j++) {
        let ptr = badWordsJs;
        let s2 = s.substr(j, s.length - j);
        for (let letter of s2) {
            if (ptr != null) {
                let js = ptr[letter];
                if (js != null && typeof js == "number") {
                    bad = true;
                }
                else {
                    ptr = js;
                }
            }
        }
    }
    return bad;
}

var orEmpty = td.orEmpty;

export async function nowAsync() : Promise<number>
{
    let ms: number;
    ms = await redisClient.cachedTimeAsync();
    return ms;
}

export async function nowSecondsAsync() : Promise<number>
{
    let sec: number;
    sec = Math.round(await redisClient.cachedTimeAsync() / 1000);
    return sec;
}

/**
 * Return a globally sequential number.
 */
export async function seqIdAsync() : Promise<number>
{
    let id: number;
    id = await redisClient.incrAsync("cached-store:seq-id");
    if (id < 10000000) {
        let micros = Math.floor(await redisClient.serverTimeAsync() / 1000) * 1000000;
        logger.info("setting seq id for the first time, t=" + micros.toString());
        let ok = await redisClient.setnxAsync("cached-store:seq-id-initial", micros.toString());
        if (ok) {
            logger.info("seq id initialized, t=" + micros.toString());
            await redisClient.setAsync("cached-store:seq-id", micros.toString());
            id = micros;
        }
        else {
            logger.info("seq id race, t=" + micros.toString());
            id = await seqIdAsync();
        }
    }
    return id;
}

/**
 * Return a globally sequential number in decreasing order.
 */
export async function invSeqIdAsync() : Promise<number>
{
    let id: number;
    id = 9000000000000000 - await seqIdAsync();
    // Note that 9e15 above is close to max precise integer range of double, so it should not be increased. This is good until around year 2255.
    return id;
}

export function getLogger() : td.AppLogger
{
    let log:td.AppLogger;
    log = logger;
    return log;
}
