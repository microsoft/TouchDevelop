/// <reference path='../typings/node/node.d.ts' />

'use strict';

import * as td from './td';
import * as assert from 'assert';

type JsonObject = td.JsonObject;
type JsonBuilder = td.JsonBuilder;

var asArray = td.asArray;
var json = td.json;
var clone = td.clone;


var logger: td.AppLogger;
var redis = require("redis");


export class Client
{
    public lastTimeSync: number = 0;
    public timeDelta: number = 0;
    public lastCachedTimeReading: number = 0;
    public hostid: string = "";
    public lastStatusReport = new Date();

    public redisClient:any;
    public subs:any;
    public subClient:any;
    public mkClient:()=>any;


    /**
     * Set key to hold the string value. If key already holds a value, it is overwritten, regardless of its type.
     */
    public async setAsync(key: string, value: string) : Promise<void>
    {
        let result = await this.sendCommand2Async("set", key, value);
    }

    /**
     * Get the value of ``key``. If the ``key`` does not exist the special value `invalid` is returned. An error is returned if the value stored at key is not a `string`, because ``get`` only handles string values.
     */
    public getAsync(key: string) : Promise<string>
    {
        return this.sendCommand1Async("get", key);
    }

    /**
     * Executes a redis command. See [redis commands](http://redis.io/commands) for an extensive list.
     */
    public async sendCommandAsync(command: string, args: JsonObject) : Promise<JsonObject>
    {
        let result: JsonObject;
        command = command.replace(/(^\s*)|(\s*$)/g, "").toLowerCase();
        let startTime = logger.loggerDuration();
        await new Promise(resume => {
            this.redisClient[command](args, (err,res) => {
              if (err) td.log('redis: error ' + err);
              result = res;
              resume();
            });
        });
        this.timeOpCore(startTime, "command");
        return result;
    }

    /**
     * Set key to hold the string value. If key already holds a value, it is overwritten, regardless of its type.
     */
    public async saddAsync(key: string, value: string) : Promise<number>
    {
        let added = 0;
        let result = await this.sendCommand2Async("sadd", key, value);
        if (result != null) {
            added = td.toNumber(result)
        }
        return added;
    }

    /**
     * Returns the set cardinality (number of elements) of the set stored at key.
     */
    public async scardAsync(key: string) : Promise<number>
    {
        let count: number;
        count = 0;
        let result = await this.sendCommandAsync("scard", key);
        if (result != null) {
            count = td.toNumber(result);
        }
        return count;
    }

    /**
     * Returns the set cardinality (number of elements) of the set stored at key.
     */
    public async smembersAsync(key: string) : Promise<JsonObject>
    {
        let members: JsonObject;
        members = await this.sendCommand1Async("smembers", key);
        return members;
    }

    /**
     * Creates a multi command client.
     */
    public async multiAsync() : Promise<Client>
    {
        let multi: Client;
        multi = new Client();
        multi.redisClient = this.redisClient.multi();
        return multi;
    }

    /**
     * Executes the commands stored in a multi action.
     */
    public async execAsync() : Promise<JsonObject>
    {
        let js: JsonObject;
        js = await this.sendCommandAsync("exec", []);
        return js;
    }

    /**
     * Executes given LUA `script` on `keys` passing `args`
     */
    public evalAsync(script: string, keys: string[], args: string[]) : Promise<JsonObject>
    {
        return this.sendCommandAsync("eval", [script, keys.length].concat(keys).concat(args));
    }

    /**
     * Get the values of all ``keys``.
     */
    public mgetAsync(keys: string[]) : Promise<JsonObject>
    {
        return this.sendCommandAsync("mget", keys);
    }

    /**
     * Set key to hold the string value. The key will expire in `px` milliseconds.
     */
    public setpxAsync(key: string, value: string, px: number) : Promise<void>
    {
        return <any>this.sendCommandAsync("set", [key, value, "PX", px])
    }

    /**
     * Get the current server time - milliseconds since epoch.
     */
    public async serverTimeAsync() : Promise<number>
    {
        let millis: number;
        let result = await this.sendCommandAsync("time", [])
        let x = td.toNumber(result[0]) * 1000 + td.toNumber(result[1]) * 0.001;
        millis = Math.round(x);
        return millis;
    }

    /**
     * Get the current server time - milliseconds since epoch. Approximated and synced every 5s; also it never decreases.
     */
    public async cachedTimeAsync() : Promise<number>
    {
        let millis: number;
        let now = Date.now();
        if (now - this.lastTimeSync > 5000) {
            let millis2 = await this.serverTimeAsync();
            this.timeDelta = millis2 - now;
            this.lastTimeSync = now;
        }
        millis = now + this.timeDelta;
        if (millis <= this.lastCachedTimeReading) {
            // Someone moved the clock backward.
            millis = this.lastCachedTimeReading;
        }
        else {
            this.lastCachedTimeReading = millis;
        }
        return millis;
    }

    /**
     * Increment `key` by one and returns new value.
     */
    public async incrAsync(key: string) : Promise<number>
    {
        let newvalue: number;
        newvalue = td.toNumber(await this.sendCommand1Async("incr", key))
        return newvalue;
    }

    /**
     * Set key to hold the string value if the key doesn't exists.
     */
    public async setnxAsync(key: string, value: string) : Promise<boolean>
    {
        let ok: boolean;
        let result = td.toString(await this.sendCommand3Async("set", key, value, "NX"))
        ok = result != null && result == "OK";
        return ok;
    }

    /**
     * Send message on given channel
     */
    public publishAsync(channel: string, value: string) : Promise<void>
    {
        return <any>this.sendCommand2Async("publish", channel, value);
    }

    private async sendCommand2Async(command: string, arg0: string, arg1: string) : Promise<JsonObject>
    {
        let result: JsonObject;
        let startTime = logger.loggerDuration();
        await new Promise(resume => {
            if (arg0 == null || arg1 == null) throw new Error("arguments are undefined");
            this.redisClient[command]([arg0, arg1], (err,res) => {
              if (err) td.log('redis: error ' + err);
              result = res;
              resume();
            });
        });
        this.timeOpCore(startTime, "command");
        return result;
    }

    private async sendCommand1Async(command: string, arg0: string) : Promise<JsonObject>
    {
        let result: JsonObject;
        let startTime = logger.loggerDuration();
        await new Promise(resume => {
            if (arg0 == null) throw new Error("arguments are undefined");
            this.redisClient[command]([arg0], (err,res) => {
              if (err) td.log('redis: error ' + err);
              result = res;
              resume();
            });
        });
        this.timeOpCore(startTime, "command");
        return result;
    }

    private async sendCommand3Async(command: string, arg0: string, arg1: string, arg2: string) : Promise<JsonObject>
    {
        let result: JsonObject;
        let startTime = logger.loggerDuration();
        await new Promise(resume => {
            if (arg0 == null || arg1 == null || arg2 == null) throw new Error("arguments are undefined");
            this.redisClient[command]([arg0, arg1, arg2], (err,res) => {
              if (err) td.log('redis: error ' + err);
              result = res;
              resume();
            });
        });
        this.timeOpCore(startTime, "command");
        return result;
    }

    /**
     * Waits for a message on a given channel for a given number of seconds (0 - infinite)
     */
    public async waitOnAsync(channel: string, timeout: number) : Promise<string>
    {
        let message: string;
        let client = this;
        await new Promise(resume => {
            var done = false;
            var listener = (msg) => {
               if (done) return;
               done = true;
               message = msg;
               var lst = client.subs[channel];
               var idx = lst.indexOf(listener);
               if (idx >= 0) lst.splice(idx, 1)
               if (lst.length == 0) {
                 delete client.subs[channel];
                 client.subClient.unsubscribe(channel);
               }
               resume()
            }
            
            if (!client.subClient) {
              client.subs = {};
              client.subClient = client.mkClient();
              client.subClient.on("message", (ch, msg) => {
                if (Array.isArray(client.subs[ch]))
                  client.subs[ch].slice(0).forEach(l => l(msg));
              })
            }
            
            if (!client.subs.hasOwnProperty(channel)) {
              client.subClient.subscribe(channel);
              client.subs[channel] = [];
            }
            
            client.subs[channel].push(listener);
            if (timeout) {
              setTimeout(() => listener(undefined), timeout * 1000);
            }
        });
        return message;
    }

    private timeOpCore(start: number, id: string) : void
    {
        let delta = logger.loggerDuration() - start;
        logger.measure(id + "@" + this.hostid, delta);
    }

    public async infoAsync() : Promise<JsonObject>
    {
        let redis = {};
        let redisText = td.toString(await this.sendCommandAsync("info", []));
        let dummy = td.replaceFn(redisText, /(\w+):(.*)/g, (elt: string[]) => {
            let result: string;
            let x = parseFloat(elt[2]);
            if (x == null) {
                redis[elt[1]] = elt[2];
            }
            else {
                redis[elt[1]] = x;
            }
            return "";
        });
        return redis;
    }

    async statusReportLoopAsync() : Promise<void>
    {
        this.lastStatusReport = new Date();

        while (true) {
            await td.sleepAsync(30 + td.randomRange(0, 10));
            let info = await this.infoAsync();
            this.lastStatusReport = new Date();
            let load = info["used_cpu_avg_ms_per_sec"] / 10;
            logger.measure("load-perc@" + this.hostid, load);
            logger.measure("memory-gb@" + this.hostid, info["used_memory"] / (1024 * 1024 * 1024));
        }
    }

    /**
     * Removes ``key`` from database. Returns ``true`` if it was there.
     * {action:ignoreReturn}
     */
    public async delAsync(key: string) : Promise<boolean>
    {
        let removed: boolean;
        let result = td.toNumber(await this.sendCommand1Async("del", key));
        if (result == 1) {
            return true;
        }
        else {
            return false;
        }
        return removed;
    }

    /**
     * Check if the status report is late (most likely the connection to redis is down)
     */
    public async isStatusLateAsync() : Promise<boolean>
    {
        let late: boolean;
        return (Date.now() - this.lastStatusReport.getTime()) > 60000;
        return late;
    }

}


/**
 * Imports the redis module
 */
async function initAsync() : Promise<void>
{
    if (logger == null) {
        logger = td.createLogger("redis");
        logger.info("initialized");
    }
}

/**
 * Creates a redis client and authenticates using the password
 */
export async function createClientAsync(host: string, port: number, password: string) : Promise<Client>
{
    let client: Client;
    if (host == "") {
        host = td.serverSetting("REDIS_HOST", false);
    }
    let usetls = false;
    if (port == 0) {
        let s = td.serverSetting("REDIS_SECURE_PORT", true);
        if (s == null || s == "") {
            port = parseFloat(td.serverSetting("REDIS_PORT", false));
        }
        else {
            port = parseFloat(s);
            usetls = true;
        }
    }
    if (password == "") {
        password = td.serverSetting("REDIS_PASSWORD", false);
    }
    await initAsync();
    client = new Client();
    client.hostid = host.replace(/\..*/g, "");
    await new Promise(resume => {
        /*JS*/
        client.mkClient = function() {
          var c;
          if (usetls) {
              logger.debug("creating secure connection to " + host)
              c = redis.createClient({
                  tls: { port: port, host: host }
              });
          } else {
              logger.debug("creating plain connection to " + host)
              c = redis.createClient(port, host);
          }
          c.auth(password)
          return c
        }
        client.redisClient = client.mkClient()
        resume()
    });
    logger.debug("created client");

    // should this be optional?
    /* async */ client.statusReportLoopAsync();

    return client;
}

/**
 * A wrapper for the [node.js redis module](https://github.com/mranney/node_redis).
 * ### configuration
 * Open and store a client with the connection information, host, port and password.
 * If blank, the library will use the ``REDIS_HOST``, ``REDIS_PORT`` and ``REDIS_PASSWORD`` server settings instead.
 */
async function exampleAsync() : Promise<void>
{
    let client = await createClientAsync("", 0, "");
    // ### commands
    // In its simplest form, you can use redis as a key-value store for strings.
    await client.setAsync("key", "value");
    let value = await client.getAsync("key");
    // You can also manipulate sets
    let added = await client.saddAsync("composers", "Mozart");
    added = await client.saddAsync("composers", "Bach");
    let count = await client.scardAsync("composers");
    // ### other commands
    // You can issue any [redis command](http://redis.io/commands) using ``send command``.
    let args = [];
    args.push("key");
    args.push("value");
    let result = await client.sendCommandAsync("append", clone(args));
    // ### multi commands
    let multi = await client.multiAsync();
    let madd = await multi.saddAsync("key", "Yay");
    let multiR = await multi.execAsync();
}


