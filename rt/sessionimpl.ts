///<reference path='refs.ts'/>

module TDev {
    export module Revisions {

        export enum StatusType {
            Error,
            Warning,
            Ok
        }

        /* The current status of the session (e.g. connected, changes pending,
         * etc.), in a structured form. */
        export interface Status {
            type: StatusType;
            status: string;
            description: string;
        }

        /* A connected participant to the session. This is *not* the same as a user,
         * since there may be multiple clients with different [sessionId]'s,
         * sharing the same [userId]. */
        export interface Participant {
            userId: string;
            sessionId: number;
        }

        // the cloud session interface for accessing data
        export interface ISession {

            user_get_lval(definition: string, ukeys: string[], lkeys: string[]): LVal;
            user_get_item(uid: string): Item;
            user_get_items_in_domain(domain: string): Item[];
            user_get_entries_in_indexdomain(indexdomain: string): Entry[];
            user_modify_lval(lval: LVal, op: any /*string or any[] */);
            user_clear_all();
            user_create_item(definition: string, ukeys: string[], lkeys: string[]): Item;
            user_create_tombstone(definition: string, uid: string, ukeys: string[], lkeys: string[]): Item;
            user_delete_item(item: Item): void;
            user_get_entry(definition: string, ukeys: string[], lkeys: string[]): Entry;
            user_is_datum_deleted(datum: Datum): boolean;
            user_get_value(lval: LVal): any;
            //user_get_ast_log(lval: LVal): any;
            user_is_defaultvalue(lval: LVal): boolean;
            user_is_datum_confirmed(datum: Datum): void;

            user_yield(): boolean;
            user_push();
            user_enable_sync(enable: boolean);
            user_sync_enabled(): boolean;
            user_issue_fence(continuation: () => void, exclusive: boolean): void;

            user_set_doorbell(doorbell: () => void);
            user_get_connectionstatus(include_details: boolean): string;
            user_get_next_connection_attempt(): number;
            user_get_missing_rounds(): number;
            user_is_websocket_open(): boolean;
            user_retry_now(): void;
            user_get_percent_full(): number;
            user_unlink(): void;
            user_specify_ast_encoding(scheme: IAstEncoding);
            user_get_presence(): string[];
            user_set_userdata(key: string, val: any, equals? : (a,b) => boolean);
            user_get_userdata(key:string): any;

            // session status queries
            isFaulted(): boolean;
            isMarooned(): boolean;
            isClosed(): boolean;

            requiresAuth: boolean;
            getCloudSession(): TDev.RT.CloudSession;
            getMemberNumber(): number;
            servername: string;
            localname: string;
            user: string;

            // testing only
            user_dump_stable_data(assert: (cond: boolean) => void): string[];

            log(msg: string);
        }

       export interface IAstEncoding {
            //groundedreduction(first: any[]): any[];
            //deltareduction(first: any[], second: any[]): any[];
            tostrings(x: any[]): string[];
            fromstrings(x: string[]): any[];
            //serverask();
        }

        //export class AstLog {
        //    constructor(public stableprefix: any[], public tempops: any[]) { }
        //}

        export enum EncodingMode {
            CLIENT_LAYER_TO_DISK,
            CLIENT_BASE_TO_DISK,
            CLIENT_LAYER_TO_SERVER,
            SERVER_BASE_TO_DISK,
            SERVER_LAYER_TO_CLIENT,
            SERVER_UPDATES_TO_CLIENT,
            TRACE_LOAD
        }

        export interface MyWebSocket extends WebSocket {
            keyset: Keyset;
            channelCompressor: ChannelCompressor;
            lastclientroundsent: number;
            lastserverroundsent: number;
            membernumber: number;
            clientUserId: string;

            isTdWebSocket: boolean; // always true for these
        }


        export class Layer {

            public name: string;
            public serverround: number;
            public clientround: number;
            public grounded: boolean;
            public session: ClientSession;

            public clientrounds: any; // server only, contains all

            public cloudOperations: CloudOperation[];

            public data: Datum[];    // conservative superset of elements with changes in this layer
            public delcount: number = 0; // upper bound on holes in data

            constructor(session: ClientSession, name: string, data: Datum[], clientround?: number, serverround?: number, grounded = false) {
                this.session = session;
                this.name = name;
                this.data = data;
                if (clientround !== undefined) this.clientround = clientround;
                if (serverround !== undefined) this.serverround = serverround;
                this.grounded = grounded;
            }

            public hasData(): boolean {
                return ((this.data && this.data.length !== 0)
                    || (this.cloudOperations && this.cloudOperations.length !== 0)
                    || this.grounded
                    || this.clientrounds);
            }

            public clear(): boolean {
                var changes = false;
                this.data.forEach((d: Datum) => {
                    if (d.removeOperation(this) !== undefined)
                        changes = true;
                });
                return changes;
                this.grounded = false;
            }

            public cleanIfNeeded(limit: number) {
                if (this.delcount > limit) {
                    // scrub the data array to remove holes
                    this.data = this.data.filter((d: Datum) => (d.getOperation(this.name) !== undefined));
                    this.delcount = 0;
                }
            }

            // delete all items, invalidate all properties
            public invalidate_all() {
                this.data.forEach((d: Datum) => {
                    if (d instanceof Item)
                        (<Item>d).invalidate(true);
                    else
                        d.invalidate(false);
                });
            }

            public CommitCloudOperation(op: CloudOperation) {
                if (!this.cloudOperations) {
                    this.cloudOperations = [op];

                // will actually never be executed in practice (only 1 cloud operation recorded per transaction layer)
                } else {
                    this.cloudOperations.push(op);
                }
            }

            public mergeCloudOperations(layer: Layer) {
                if (!layer.cloudOperations)
                    return;
                if (!this.cloudOperations) {
                    this.cloudOperations = [];
                }
                this.cloudOperations = this.cloudOperations.concat(layer.cloudOperations);
            }

            public removeCloudOperations() {
                delete this.cloudOperations;
            }

        }

        class Fence {
            constructor(
                public continuation: () => void,
                public round: number,
                public exclusive: boolean
                ) {
            }
        }


        export class Datum {

            public definition: string;
            public ukeys: string[];
            public lkeys: string[];

            public session: ClientSession;

            public cached: any; // undefined means nothing cached, null represents a cached value of undefined
            public deleted: boolean; // true if this datum is deleted
            public invalidate(deleted:boolean) {// item overrides to invalidate dependencies
                delete this.cached;
                if (deleted) {
                    this.deleted = true;
                    this.unlink();
                }
             }

            public fromCloudOp: boolean;

            constructor() {
                this.fromCloudOp = Runtime.theRuntime && Runtime.theRuntime.inCloudCall;
                this.ops = {};
            }

            private ops: any;
            private get_op(layer: string): any { return <string> this.ops[layer]; }
            private set_op(layer: string, op: any): void { this.ops[layer] = op; }
            private del_op(layer: string): void { delete this.ops[layer]; }
            public all_ops(): string[] { return Object.keys(this.ops); }

            public getOperation(lname: string): any /*string or any[] */ {
                return this.get_op(lname);
            }
            public recordOperation(l: Layer, op: string):boolean {
                var val = this.get_op(l.name);
                var result = this.collapse(val, op, l.grounded);
                if (result !== undefined) {
                    this.set_op(l.name, result);
                    if (val === undefined)
                        l.data.push(this);
                }
                else {
                    if (val !== undefined) {
                        this.del_op(l.name);
                        l.delcount += 1;
                    }
                }
                return (val !== result);
            }
            public removeOperation(l: Layer): string {
                var val = this.get_op(l.name);
                if (val !== undefined) {
                    this.del_op(l.name);
                    l.delcount += 1;
                }
                return val;
            }

            // compute the collective effect of all the ops in all the log segments, representing the current value
            public compute_current(): any { // returns undefined (default value) or string/any[] (op)
                var cur = this.getOperation("B");
                if (!this.session.readonly) {
                    var baseround = this.session.get_layer("B").clientround;
                    var localround = this.session.localround;
                    for (var i = baseround + 1; i < localround; i++) {
                        var datalayer = this.session.get_layer("D" + i);
                        cur = (datalayer.grounded) ? this.getOperation("D" + i) : this.collapse(cur, this.getOperation("D" + i), true);
                    }
                    var locallayer = this.session.get_layer("D" + localround);
                    cur = (locallayer && locallayer.grounded) ? this.getOperation("D" + localround) : this.collapse(cur, this.getOperation("D" + localround), true);
                    var tlayer = this.session.get_layer("T");
                    if (tlayer)
                        cur = (tlayer.grounded) ? this.getOperation("T") : this.collapse(cur, this.getOperation("T"), true);
                }
                Util.check(!dbg || (this.cached === undefined) || (this.cached !== null && this.cached === cur) || (this.cached === null && cur === undefined)); // SEBTODO make this real caching once tested
                this.cached = (cur === undefined) ? null : cur;
                return cur;
            }

            //public compute_ast_log(session: ClientSession): AstLog {

            //    var stableprefix = this.getOperation("B") || [];

            //    var tempops = [];
            //    var addlayer = (name: string) => {
            //        var l = session.get_layer(name);
            //        if (l) {
            //            Util.assert(!l.grounded);
            //            var ops = this.getOperation(name);
            //            if (ops) tempops = tempops.concat(ops);
            //        }
            //    }
            //    var baseround = session.get_layer("B").clientround;
            //    var localround = session.localround;
            //    for (var i = baseround + 1; i < localround; i++)
            //        addlayer("D" + i);
            //    addlayer("D" + localround);
            //    addlayer("T");

            //    return new AstLog(stableprefix, tempops);
            //}

            public has_deleted_dependencies(): boolean {
                var deleted = false;
                this.ukeys.forEach((uid: string) => {
                    var item = this.session.get_item(uid);
                    if (!item || this.session.user_is_datum_deleted(item))
                        deleted = true;
                });
                Util.assert(!deleted || this.deleted);
                return deleted;
            }

            public linkDeps() {
                this.ukeys.forEach((l) => {
                    var item = this.session.get_item(l);
                    if (!(item && item.addDependency(this)))
                        this.deleted = true;
                });
            }

            // arguments and return value are invalid (if no change) or a string representing the change
            public collapse(first: any, second: any, grounded: boolean): any { }

            // overridden by item, entry, lval
            public target(): string { return ""; }

            // overridden by item
            public unlink():void {}

        }

        export class Item extends Datum {

            public uid: string;
            public backlink: any;  // link back to client data structure

            public target(): string {
                return this.uid;
            }


            public unlink() {
                if (this.backlink) {
                    this.backlink.unlink();
                    delete this.backlink;
                }
            }

            public collapse(first: any, second: any, grounded: boolean): any {
                if (first === undefined)
                    return second;
                if (second === undefined)
                    return first;
                if (first === "D") {
                    this.session.assertConsistency(second === "D");
                    return grounded ? undefined : "D";
                }
                Util.assert(first[0] === "C");
                if (second !== "D")
                    this.session.assertConsistency(false, "collapse uid=" + this.uid + " def=" + (this.backlink && this.backlink.parent && this.backlink.parent.cloudtype) + " second=" + second);
                return undefined;
            }

            public recordCreation(l: Layer, serveritemcount?: number) {
                if (serveritemcount === undefined)
                    this.recordOperation(l, "C");
                else {
                    this.recordOperation(l, "C" + serveritemcount);
                }
            }
            public recordDeletion(l: Layer) {
                this.recordOperation(l, "D");
            }

            public recordOperation(l: Layer, op: string): boolean {
                // on deletion, remove redundant deletions, creations, and updates
                if (op === "D")
                    this.removeRedundantOps(l);
                return super.recordOperation(l, op);
            }

            public compareTo(other: Item): number {
                var a = this.compute_current();
                if (a === "C") {
                    var b = other.compute_current();
                    if (b === "C")
                        return Number(this.uid) - Number(other.uid);
                    else
                        return 1;
                }
                else {
                    var b = other.compute_current();
                    if (b === "C")
                        return -1;
                    else
                        return Number(a.substr(1)) - Number(b.substr(1));
                }
            }

            private deps = {};
            public addDependency(d: Datum): boolean {
                this.deps["$" + d.target()] = d;
                return !this.deleted;
            }
            public removeDependency(d: Datum) {
                delete this.deps["$" + d.target()];
            }
            public invalidate(deleted:boolean) {
                super.invalidate(deleted);
                for (var p in this.deps)
                    if (this.deps.hasOwnProperty(p) && p[0] === "$")
                        this.deps[p].invalidate(deleted);
                this.session.remove_item_from_index(this);
            }
            public removeRedundantOps(layer: Layer) {
                for (var p in this.deps)
                    if (this.deps.hasOwnProperty(p) && p[0] === "$") {
                        var datum = <Datum> this.deps[p];
                        datum.removeOperation(layer);
                        if (datum instanceof Item)
                            (<Item>datum).removeRedundantOps(layer);
                    }
            }

         }

        export class Entry extends Datum {

            public backlink: any;  // link back to client data structure

            public target(): string {
                return ClientSession.MakeModTarget(this.definition, this.ukeys, this.lkeys);
            }

            // the following fields are used for transient purposes during queries (no invariants are maintained)
            public lvals: LVal[]; // set to contain all the lvals with nondefault values
            public qcount: number; // used internally, for duplicate filtering in queries

        }

        export class LVal extends Datum {

            public name: string;
            public codomain: string;
            public indexdomain: string;
            public entry: Entry;

            public target(): string {
                return ClientSession.MakeModTarget(this.definition, this.ukeys, this.lkeys);
            }

            public parseDefinition() {
                // extracts name, codomain, and indexdomain from the definition
                var p = new Parser(this.definition, 0);
                this.name = p.ParseDefinitionString();
                Util.assert(p.text[p.pos] === ",");
                p.pos += 1;
                this.codomain = p.ParseDefinitionString();
                Util.assert(p.text[p.pos] === "[");
                this.indexdomain = p.text.slice(p.pos + 1, p.text.length - 1);
            }

            //public allLayers() {

            //}

            // arguments and return value are invalid (if no change) or a string representing the change
            public collapse(first: any, second: any, grounded: boolean): any {
                if (second === undefined)
                    return first;
                else if (first === undefined) {
                    // return second, reduced
                    if (this.codomain === "double" || this.codomain === "long") {
                        if (grounded) {
                            if (second.lastIndexOf("A", 0) === 0) // second.startswith("A")
                                second = second.slice(1);
                            return (second === "0") ? undefined : second;
                        } else
                            return second === "A0" ? undefined : second;
                    } else if (this.codomain === "ast") {
                        return second;
                      //  return (grounded && session.reductionscheme) ? session.reductionscheme.groundedreduction(second) : second;
                    } else {
                        if (second.lastIndexOf("^?", 0) !== 0) // !second.startswith("^?")
                            return (grounded && !second) ? undefined : second;
                        // second is relative
                        var cond = second.substring(2);
                        if (cond === "")
                            return undefined;
                        if (grounded)
                            return (cond.charAt(0) === "^") ? ("^!" + cond) : cond;
                        return second;
                    }
                }
                else if (this.codomain === "double" || this.codomain === "long") {
                    // numbers: pay attention to relative vs. absolute
                    if (second.charAt(0) !== 'A')
                        return (grounded && second === "0") ? undefined : second;
                    var secondval = Number(second.slice(1));
                    var relative = false;
                    var firstval = Number(first);
                    if (isNaN(firstval)) {
                        Util.assert(first.charAt(0) === 'A');
                        firstval = Number(first.slice(1));
                        relative = true;
                        Util.assert(!grounded); // cannot have relative changes in grounded layer
                    }
                    var sum = (firstval + secondval);
                    if (sum !== 0 || (!relative && !grounded))
                        return relative ? ("A" + sum) : sum.toString();
                    else
                        return undefined;
                } else if (this.codomain === "ast") {
                    return second;
                    //session.assertConsistency(typeof (first) == "object" && Array.isArray(first) && typeof (second) == "object" && Array.isArray(second), "sync data format changed");
                    //return session.reductionscheme ?
                    //    (grounded ? session.reductionscheme.groundedreduction(first.concat(second)) : session.reductionscheme.deltareduction(first, second)) : first.concat(second);
                } else {
                    // string
                    if (second.lastIndexOf("^?", 0) !== 0) // !second.startswith("^?")
                    {   // second is absolute
                        return (grounded && !second) ? undefined : second;
                    }
                    else {
                        if (first.lastIndexOf("^?", 0) !== 0) // !first.startswith("^?")
                        {  // first is absolute, second is relative
                            if (first === "" || first === "^!")
                            {   // test succeeds
                                var cond = second.substring(2);
                                var r =(cond.charAt(0) === "^") ? ("^!" + cond) : cond;
                                return (grounded && !r) ? undefined : r;
                            }
                            else
                            {   // test fails
                                return first;
                            }
                        }
                        else
                        {  // both are relative
                            if (first.length === 2)
                                return (grounded && !second) ? undefined : second;
                            else
                                return first;
                        }
                    }
                }
                Util.oops("missing case in LVal.collapse");
            }
        }


        export class ClientSession implements ISessionParams {

            public sendCloudOperations: boolean = false;
            public concatIdToItem: boolean = false;
            public includeKeysInStatus: boolean = false;
            public acceptsUpdates: boolean = false;
            public clientUserId: string;
            public requiresAuth: boolean = true;

            constructor (
                public servername: string,         // the unique id for the session on the server
                public localname: string,         // where to cache this session locally, or undefined if no caching wanted
                public user: string               // who is connecting
            ) {
                this.initialize_data();
                this.loaded = (localname === undefined);
                if (this.user === undefined) this.user = "";
                Util.assert(!!servername || !!localname);
            }

            public samesession(other: ClientSession) {
                return (this.servername === other.servername && this.localname === other.localname);
            }

            public trace_save_and_load = false;
            public trace_incoming_packets = false;
            public trace_saving = false;

            // used by node session & node server
            public nodeserver: string;
            public scriptguid: string;

            // connection parameters
            public url: string;
            public tokensource: (bool) => Promise;

            // S-state: updated when incorporating server data
            public membernumber = -1;
            public disambiguator = "";
            public enable_sync = undefined; // set on load
            public serveritemcount = 0;

            public getMemberNumber() { return this.membernumber; }

            // session info stored on server: set to initial value by user, updated by server status packet
            public permissions: string;
            public title: string;
            public statusPacket: Packet;

            // user controlled state
            public userdata = {};

            // C-state: updated when writing locally
            public localround = 1;
            public uidcount = 0;

            public key_sessionlist() { return "%"; }
            public key_Sstate() { return this.localname + "/S"; }
            public key_Cstate() { return this.localname + "/C"; }
            public key_layer(layer: string) { return this.localname + "/" + layer; }


            public S_toJSONstring(): any {
                return JSON.stringify({
                    servername: this.servername,
                    localname: this.localname,
                    description: this.title,
                    membernumber: this.membernumber,
                    disambiguator: this.disambiguator,
                    enable_sync: this.enable_sync,
                    serveritemcount: this.serveritemcount,
                    permissions: this.permissions,
                    userdata: this.userdata,
                });
            }
            public S_fromJSONstring(s: string): any {
                var json = JSON.parse(s);
                Util.assert(this.servername === json.servername);
                Util.assert(this.localname === json.localname);
                if (!this.title && json.description)
                    this.title = json.description;
                this.membernumber = json.membernumber;
                this.disambiguator = json.disambiguator;
                if (this.enable_sync === undefined)
                    this.enable_sync = json.enable_sync;
                this.serveritemcount = json.serveritemcount;
                this.permissions = json.permissions;
                this.userdata = json.userdata || {};
            }
            public C_toJSONstring(): any {
                return JSON.stringify({
                    uidcount: this.uidcount,
                    localround: this.localround,
                });
            }
            public C_fromJSONstring(s: string): any {
                var json = JSON.parse(s);
                this.uidcount = json.uidcount;
                this.localround = json.localround;
            }



            // tuning parameters
            public sendinterval = 250;
            public pendingroundlimit = 5;
            public scrublimit = 1000;
            public connectionretrydelay = 20000;

            // connection state
            public script: string;
            public readonly: boolean;

            // ast encoding scheme
            public astencoding: IAstEncoding;
            public user_specify_ast_encoding(s: IAstEncoding) {
                this.astencoding = s;
            }

            // ---- consistency fault detection

            public assertConsistency(cond: boolean, message?: string) {
                if (!cond) {
                    this.faulted = true; // this session is dead. User can reload using button.
                    this.statuschanges = true;
                    Util.check(cond, /* message || <-- creates hundreds of crash reports */ "local cache inconsistent with server"); // report
                }
            }


            // ------ user API

            public user_get_lval(definition: string, ukeys: string[], lkeys: string[]): LVal {
                var t = ClientSession.MakeModTarget(definition, ukeys, lkeys);
                var lval = this.get_lval(t);
                if (!lval) {
                    lval = new LVal();
                    lval.session = this;
                    lval.definition = definition;
                    lval.ukeys = ukeys;
                    lval.lkeys = lkeys;
                    lval.parseDefinition();
                    lval.entry = this.user_get_entry(lval.indexdomain, ukeys, lkeys);
                    lval.linkDeps();
                    this.add_lval(lval);
                    this.add_lval_to_index(lval);
                }
                else {
                    this.assertConsistency(lval.definition === definition);
                    this.assertConsistency(ukeys.length === lval.ukeys.length);
                    for (var i = 0; i < ukeys.length; i++)
                        this.assertConsistency(ukeys[i] === lval.ukeys[i]);
                    this.assertConsistency(lkeys.length === lval.lkeys.length);
                    for (var i = 0; i < lkeys.length; i++)
                        this.assertConsistency(lkeys[i] === lval.lkeys[i]);
                }
                return lval;
            }
            public user_get_entry(definition: string, ukeys: string[], lkeys: string[]): Entry {
                var k = ClientSession.MakeModTarget(definition, ukeys, lkeys);
                var entry = this.get_entry(k);
                if (!entry) {
                    entry = new Entry();
                    entry.session = this;
                    entry.definition = definition;
                    entry.ukeys = ukeys;
                    entry.lkeys = lkeys;
                    entry.linkDeps();
                    this.add_entry(entry);
                }
                else {
                    this.assertConsistency(entry.definition === definition);
                    this.assertConsistency(ukeys.length === entry.ukeys.length);
                    for (var i = 0; i < ukeys.length; i++)
                        this.assertConsistency(ukeys[i] === entry.ukeys[i]);
                    this.assertConsistency(lkeys.length === entry.lkeys.length);
                    for (var i = 0; i < lkeys.length; i++)
                        this.assertConsistency(lkeys[i] === entry.lkeys[i]);
                }
                return entry;
            }
            private qcount = 0; // counter for queries
            public user_get_entries_in_indexdomain(indexdomain: string): Entry[] {
                var entries = new Array<Entry>();
                var qcount = this.qcount;
                this.qcount += 1;
                // gather nonzero values
                this.get_lvals_for_indexdomain(indexdomain).forEach((lval: LVal) =>
                {
                    if (!this.user_is_defaultvalue(lval)) {
                        var e = lval.entry;
                        if (e.qcount !== qcount) {
                            e.qcount = qcount;
                            entries.push(lval.entry);
                            e.lvals = new Array<LVal>();
                        }
                        e.lvals.push(lval);
                    }
                });
                return entries;
            }
            public user_modify_lval(lval: Revisions.LVal, op: any /*string or any[] */) {
                if (this.readonly)
                    return;
                var deleted = this.user_is_datum_deleted(lval);
                if (!deleted) {
                    lval.invalidate(false);
                    if (op !== undefined) {
                        var transactionlayer = this.get_layer("T") || this.create_layer("T");
                        lval.recordOperation(transactionlayer, op);
                    }
                }
            }
            public user_get_items_in_domain(domain: string): Item[] {
                var base = this.get_items_in_domain(domain);
                return base.filter((i: Item) => !this.user_is_datum_deleted(i));
            }
            public user_get_item(uid: string): Item {
                var k = this.get_item(uid);
                if (k === undefined) {
                    var pos = uid.indexOf('.');
                    if (pos != -1 && uid.substr(0, pos) === this.membernumber.toString())
                        k = this.get_item(uid.substr(pos + 1));
                }
                return k;
            }
            public user_create_tombstone(definition: string, uid: string, ukeys: string[], lkeys: string[]): Item {
                var k = new Item();
                k.session = this;
                k.definition = definition;
                k.uid = uid;
                k.ukeys = ukeys;
                k.lkeys = lkeys;
                k.deleted = true;
                return k;
            }
            public user_create_item(definition: string, ukeys: string[], lkeys: string[]): Item {
                // create the new item
                var k = new Item();
                k.session = this;
                k.definition = definition;
                Util.assert(this.loaded || this.faulted);
                this.uidcount += 1;
                k.uid = (this.concatIdToItem ? (this.membernumber + ".") : "") + this.uidcount.toString();
                k.ukeys = ukeys;
                k.lkeys = lkeys;
                this.assertConsistency(!this.get_item(k.uid));
                if (this.readonly) {
                    k.deleted = true;
                    return k;
                }
                k.linkDeps();
                this.add_item(k);
                if (!k.has_deleted_dependencies()) {
                    // record creation
                    var transactionlayer = this.get_layer("T") || this.create_layer("T");
                    k.recordCreation(transactionlayer);
                    this.add_item_to_index(k);
                }
                // return datum
                return k;
            }
            public user_delete_item(item: Item): void {
                if (this.readonly)
                    return;
                var deleted = this.user_is_datum_deleted(item);
                if (!deleted) {
                    var transactionlayer = this.get_layer("T") || this.create_layer("T");
                    item.recordDeletion(transactionlayer);
                    item.invalidate(true);
                }
            }
            public user_clear_all(): void {
                if (this.readonly)
                    return;
                 // invalidate all visible datums
                 var baselayer = this.get_layer("B");
                 baselayer.invalidate_all();
                 var baseround = baselayer.clientround;
                 var localround = this.localround;
                 for (var i = baseround + 1; i <= localround; i++) {
                    var datalayer = this.get_layer("D" + i);
                    datalayer && datalayer.invalidate_all();
                 }
                // kill transaction layer and start from scratch
                var transactionlayer = this.get_layer("T");
                transactionlayer && transactionlayer.invalidate_all();
                this.delete_layer("T", false);
                var transactionlayer = this.create_layer("T");
                transactionlayer.grounded = true;
           }

            public log(msg: string) {
                Util.log("{0}", this.logmsg(msg));
            }
            public logmsg(msg: string) {
                return "[" + (this.servername || this.localname) + "] " + msg;
            }


            public user_is_datum_deleted(datum: Datum): boolean {
                if (datum.has_deleted_dependencies())
                    return true;
                var deleted = false;
                if (datum instanceof Item) {
                    var s = datum.compute_current();
                    deleted = (!s || s[0] !== "C");
                }
                Util.assert(!dbg || deleted === !!datum.deleted);
                return deleted;
            }
            public user_is_datum_confirmed(datum: Datum): boolean {
                var ops = datum.all_ops();
                if (this.servername)
                    return !ops.some(s => (s[0] === "D" || s[0] === "T"));
                else
                    return !ops.some(s => s != "D1");
            }
            public user_get_value(lval: LVal): any {
                var s: string;
                if (!lval.has_deleted_dependencies())
                    s = lval.compute_current()
                return s;
            }
            //public user_get_ast_log(lval: LVal): AstLog {
            //    Util.assert(lval.codomain == "ast");
            //    return lval.compute_ast_log(this);
            //}
            public user_is_defaultvalue(lval: LVal): boolean {
                if (lval.has_deleted_dependencies())
                    return true;
                var s = lval.compute_current();
                if (s === undefined)
                    return true;
                if (lval.codomain === "long" || lval.codomain === "double")
                    return (s === "A0" || s === "0");
                else if (lval.codomain === "string")
                    return (s === "" || s === "^" || s === "^?" || s === "^!");
                else
                    return s === "";
            }




            // the data : a giant map [string -> Datum]
            // containing
            //             items, mapped as (uid) -> Item
            //             lvals, mapped as (target) -> LVal
            public data: any;
            public get_datum(target: string): Datum { return <Datum> this.data[target]; }
            public get_item(uid: string): Item { return <Item> this.data[uid]; }
            public get_lval(target: string): LVal { return <LVal> this.data[target]; }
            public get_entry(target: string): Entry { return <Entry> this.data[target]; }
            public add_item(item: Item): void { this.data[item.uid] = item; }
            public add_lval(lval: LVal): void { this.data[lval.target()] = lval; }
            public add_entry(entry: Entry): void { this.data[entry.target()] = entry; }


            // we use the following auxiliary data structure to quickly retrieve visible items in a domain
            private domains: any;
            public get_items_in_domain(domain: string): Item[] {
                var obj = this.domains[domain];
                return obj ? (<Item[]> Util.values(obj)) : [];
            }
            public add_item_to_index(item: Item): void {
                var obj = this.domains[item.definition];
                if (!obj)
                    obj = this.domains[item.definition] = {};
                obj[item.target()] = item;
            }
            public remove_item_from_index(item: Item): void {
                var obj = this.domains[item.definition];
                if (obj)
                    delete obj[item.target()];
            }

            // we use the following auxiliary data structure to quickly retrieve visible lvals for a index domain
            private properties: any;
            public get_lvals_for_indexdomain(indexdomain: string): LVal[] {
                var obj:StringMap<LVal> = this.properties[indexdomain];
                // believe it or not, not using for (var ... in ...) is a major perf win
                if (obj)
                    return Util.values(obj)
                else return []
            }
            public add_lval_to_index(lval: LVal): void {
                var obj = this.properties[lval.indexdomain];
                if (!obj)
                    obj = this.properties[lval.indexdomain] = {};
                obj[lval.target()] = lval;
            }
            public remove_lval_from_index(lval: LVal): void {
                var obj = this.properties[lval.indexdomain];
                if (obj)
                    delete obj[lval.target()];
            }

            // unlink backlinks
            public user_unlink():void {
                for (var p in this.data) {
                    var o = this.data[p];
                    if (o.backlink) {
                        o.backlink.unlink();
                        o.backlink = undefined;
                    }
                }
            }

            // for debugging purposes only
            public checkinvariants() {

                // comment this out when debugging
                return;

                // layers must be subset of data
                this.all_layers().forEach((l:Layer) =>
                {
                    l.data.forEach((d: Datum) =>
                    {
                        Util.assert(this.get_datum(d.target()) === d);
                    });
                });
            }

            public user_dump_stable_data(assert: (cond: boolean) => void ): string[] {
                var result = new Array<string>();
                assert(this.loaded);

                this.checkinvariants();

                // check stability
                var count1 = 0;
                for (var x in Util.values(this.data)) {
                    if (x instanceof Datum) {
                        var ops = x.all_ops();
                        if (ops.length !== 0) {
                            assert(ops.length === 1);
                            assert(ops[0] === "B");
                            count1 += 1;
                        }
                    }
                }
                // display values
                var basedata = this.get_layer("B").data;
                var count2 = 0;
                basedata.forEach((d: Datum) =>
                {
                    var op = d.getOperation("B");
                    var p: Packet;
                    if (op !== undefined) {
                        if (d instanceof Item) {
                            if (op[0] === "C")
                                p = Packet.MakeNewPacket(d.definition, (<Item>d).uid, d.ukeys, d.lkeys, (op.length === 1) ? undefined : Number(op.substr(1)));
                            else {
                                Util.assert(op === "D");
                                p = Packet.MakeDelPacket((<Item>d).uid);
                            }
                        } else if (d instanceof LVal && (op !== undefined)) {

                            p = Packet.MakeModPacket(d.definition, op, d.ukeys, d.lkeys, this.astencoding);
                        }
                        result.push(p.toString());
                        count2 += 1;
                    }
                });
                assert(count1 === count2);
                return result;
            }


            //
            // constructor
            //
            public initialize_data() {
                this.data = {};
                this.domains = {};
                this.properties = {};
                this.layers = {
                    "B": new Layer(this, "B", new Array<Datum>(), 0, 0, true)
                };
            }

            //
            // the layers
            //
            public layers: any;
            public create_layer(name: string, clientround?: number, serverround?: number): Layer {
                Util.assert(!this.layers[name]);
                var l = new Layer(this, name, new Array<Datum>(), clientround, serverround, false);
                this.layers[name] = l;
                if (clientround === 1 && serverround === undefined && this.servername === "")
                    l.grounded = true;  // local session: D1 is grounded
                return l;
            }
            public get_layer(s: string): Layer {
                return this.layers[s];
            }
            public collapse_layers(firstname: string, secondname: string, keepsecond?: boolean): boolean {
                var first = this.layers[firstname];
                var second = this.layers[secondname];
                Util.assert(first && second);
                var changed = false;
                var observable = (firstname === "B" && secondname === "S");
                if (second.grounded) {
                    // clear out first layer
                    changed = first.clear();
                    if (observable) first.invalidate_all();
                }
                // update rounds
                if ((first.serverround === undefined) || first.serverround < second.serverround) {
                    changed = true;
                    first.serverround = second.serverround;
                }
                if ((first.clientround === undefined) || first.clientround < second.clientround) {
                    changed = true;
                    first.clientround = second.clientround;
                }
                // collapse entries in second layer into first layer
                second.data.forEach((d: Datum) => {
                    var secondop = d.getOperation(second.name);
                    if (!keepsecond) {
                        d.removeOperation(second);
                    }
                    if (d.recordOperation(first, secondop)) {
                        changed = true;
                        if (observable) {
                            if (d instanceof Item) {
                                var item = <Item> d;
                                d.invalidate(secondop === "D");
                                if (secondop && secondop[0] === "C")
                                    this.add_item_to_index(item);
                            } else {
                                Util.assert(d instanceof LVal);
                                d.invalidate(false);
                                if (secondop !== undefined)
                                    this.add_lval_to_index(<LVal> d);
                            }
                        }
                    }
                });

                // update grounded
                if (second.grounded)
                    first.grounded = true;

                // remove second layer
                if (!keepsecond) {
                    delete this.layers[second.name];
                }
                return changed;
            }
            public delete_layer(s: string, assertexists: boolean): boolean {
                var l = this.layers[s];
                if (assertexists)
                    Util.assert(l);
                else if (l === undefined)
                    return false;
                var changes = l.clear();
                delete this.layers[s];
                return changes;
            }
            public all_layers():Layer[] {
                return <Layer[]> Util.values(this.layers);
            }


            public logLayers() {
                var layers = this.all_layers();
                //var packetss = layers.map((l) => this.EncodeLayer(l, undefined, true));
                for (var i = 0; i < layers.length; i++) {
                    var layer = layers[i];
                    this.log(Util.fmt("Layer {0} (s:{1}/c:{2})", layer.name, layer.serverround, layer.clientround));
                }
            }


            //
            // transitions
            //






            public unsent_changes(): boolean {
                var locallayer = this.get_layer("D" + this.localround);
                return locallayer && locallayer.hasData();
            }


            public dependency_is_gone(d: Datum, layer: Layer): boolean {
                if (d.ukeys.some((uid: string) => this.uid_is_gone(uid, layer))) {
                    d.removeOperation(layer);
                    return true;
                }
                return false;
            }

            public item_is_gone(i: Item, layer: Layer): boolean {
                var op = i.getOperation(layer.name);
                if (op === undefined)
                    return true;
                if (op === "D") {
                    i.removeOperation(layer);
                    return true;
                }
                return this.dependency_is_gone(i, layer);
            }

            public uid_is_gone(uid: string, layer: Layer): boolean {
                var i: Item = this.get_item(uid);
                if (!i)
                    return true;
                return this.item_is_gone(i, layer);
            }

            public forEachValidDatum(layer: Layer, fn: (d: Datum, op?:string) => any) {
                layer.data.forEach((d: Datum) => {
                    var op = <any> d.getOperation(layer.name);
                    if (op === undefined || (layer.grounded && (d instanceof Item && this.item_is_gone(<Item>d, layer) || this.dependency_is_gone(d, layer)))) return;
                    fn(d, op);
                });
            }



            public EncodeLayer(layer: Layer, mode: EncodingMode, socket?: MyWebSocket): Packet[] {

                var includeCloudEffects = (mode != EncodingMode.CLIENT_LAYER_TO_SERVER && mode != EncodingMode.SERVER_UPDATES_TO_CLIENT);
                var withClientRounds = (mode == EncodingMode.SERVER_BASE_TO_DISK);
                var packets = new Array<Packet>();
                var comp = socket && socket.channelCompressor;

                // make clear packet
                if (layer.grounded) {
                    packets.push(Packet.MakeCldStarPacket(comp));
                }

                // add cloud effect packets
                layer.data.forEach((d: Datum) =>
                {
                    if (mode == EncodingMode.SERVER_LAYER_TO_CLIENT) {
                       if (!socket.keyset.contains_and_clr(d.target())) return;
                    } else if (mode == EncodingMode.SERVER_UPDATES_TO_CLIENT) {
                       if (!socket.keyset.is_unsent_and_clr(d.target())) return;
                    }

                    var op = <any> d.getOperation(layer.name);
                    if (op !== undefined) {
                        if (layer.grounded && (d instanceof Item && this.item_is_gone(<Item> d, layer) || this.dependency_is_gone(d, layer)))  {
                            // do not encode
                        }
                        else {
                            if (d.fromCloudOp && !includeCloudEffects) return;

                            var p: Packet;
                            if (d instanceof Item) {
                                if (op[0] === "C") {
                                    p = Packet.MakeNewPacket(d.definition, (<Item>d).uid, d.ukeys, d.lkeys, (op.length == 1) ? undefined : Number(op.substr(1)), comp);
                                } else {
                                    this.assertConsistency(op === "D" && !layer.grounded);
                                    p = Packet.MakeDelPacket((<Item>d).uid);
                                }
                            } else if (d instanceof LVal) {
                                p = Packet.MakeModPacket(d.definition, op, d.ukeys, d.lkeys, this.astencoding, comp);
                            }

                            p.fromCloudOp = d.fromCloudOp;
                            packets.push(p);
                        }
                    }

                });

                // add cloud operation packets
                if ( this.sendCloudOperations && layer.cloudOperations !== undefined) {
                    layer.cloudOperations.forEach((op) => {
                        if (op.optype == CloudOperationType.RPC && mode == EncodingMode.CLIENT_LAYER_TO_DISK)
                            return; // do not save RPC calls, only send them
                        var p = Packet.MakeCopPacket(op.libName + "/" + op.actionName, op.args, op.opid, op.uidcountstart, op.uidcountstop)
                        packets.push(p);
                    });
                }

                // add frame packet
                packets.push(Packet.MakeFramePacket(layer, withClientRounds));

                return packets;
            }



            public static MakeModTarget(definition: string, ukeys: string[], lkeys: string[]): string {
                var s = (definition ? Parser.WriteComboString(definition) : "");
                ukeys.forEach((uid: string) => {
                    s = s + "|" + uid;
                });
                lkeys.forEach((lit: string) => {
                    s = s + "|+" + Parser.WriteComboString(lit);
                });
                return s;
            }

            public static ParseModTarget(s: string, datum: Datum) {
                var c = (new Parser(s, 0)).ParseComboComponents();
                datum.definition = c[0];
                datum.ukeys = new Array<string>();
                datum.lkeys = new Array<string>();
                for (var i = 2; i < c.length; i++) {
                    var s = c[i];
                    if (s.charAt(0) === "+")
                        datum.lkeys.push(s.slice(1));
                    else
                        datum.ukeys.push(s);
                }
            }


            // state in memory
            public loaded: boolean;
            public loadtask: Promise;
            public closetask: Promise;
            public faulted: boolean;
            public closed: boolean;
            public isFaulted() { return this.faulted; }

            // handles to activities
            public intervalhandle: number;
            public last_S_save = Promise.as();
            public last_C_save = Promise.as();
            public ring_doorbell_when_done = false;

            // local storage state
            public table: TDev.Storage.Table;
            public CLstate_needsave = false;
            public Sstate_needsave = false;


            public receivedstatus: boolean;
            public last_serverround_received: number;
            public last_clientround_received: number;
            public last_serverround_sent: number;
            public last_clientround_sent: number;
            public writeblock: number;
            public readblock: number;

            public tokenpromise: Promise;
            public token: string;
            public ws: MyWebSocket;
            public nexttry: number;
            public marooned: boolean;
            public rebase; boolean;
            public error: string;
            public errorcategory: string;
            public encountered_token_expiration: boolean;

            public isMarooned() { return this.marooned; }
            public isClosed() { return this.closed; }


            public receivedserverinfo: boolean;
            public previewround: number = 0;
            public percentfull: number = 0;
            public presence: Participant[] = [];

            // channel compression
            private dochannelcompression = false;

            public stopAsync() {
                return Promise.as();
            }


            public send_layer(layer: Layer) {
                var packets = this.EncodeLayer(layer, EncodingMode.CLIENT_LAYER_TO_SERVER, this.ws);
                this.log(Util.fmt("Sending {0}[{1},{2}]", layer.name, layer.clientround, layer.serverround));
                    //packets.map((p) => p.code + ":" + p.lkeys[0]).join("|")));
                packets.forEach((p) => p.send(this.ws));
            }

            public getCloudSession(): TDev.RT.CloudSession {
                if (!this.cachedsession) {
                    var cs = new TDev.RT.CloudSession();
                    cs._id = this.servername;
                    cs._permissions = this.permissions;
                    cs._title = this.title;
                    cs.sessionimpl = this;
                    if (cs.validate())
                        this.cachedsession = cs;
                }
                return this.cachedsession;
            }
            private cachedsession: TDev.RT.CloudSession;



            // ------ management API


            public loadAsync(after_load_task?: () => Promise): Promise {
                Util.assert(this.loadtask === undefined && !this.loaded);
                if (!this.localname || this.closed)
                    return (after_load_task ? after_load_task() : Promise.as());

                var promise = this.LoadFromDiskAsync();

                // after the load is complete, start interval or handle error
                promise = promise.then(
                    (success) => {
                        if (!this.closed) {
                            // start save/send task on regular interval
                            this.intervalhandle = setInterval(() => {
                                if (!this.closed && !this.faulted)
                                    this.SaveAndSend();
                            }, this.sendinterval);
                            var h = <any>this.intervalhandle
                            // this shouldn't keep the node.js event loop running
                            if (h.unref) h.unref()
                        }
                    },
                    (error) => {
                        this.faulted = true;
                        this.initialize_data();
                        this.statuschanges = true;
                        this.log("failed to load stored session, error=" + error);
                    });

                if (after_load_task)
                    promise = promise.thenalways(() => after_load_task());

                promise.thenalways(this.doorbell);
                return this.loadtask = promise;
            }

            public LoadFromDiskAsync(): Promise {
                return Storage.getTableAsync("Sessions").then((table) => {
                    this.table = table;
                    var keys = [this.key_Sstate(), this.key_Cstate(), this.key_layer("B")];
                    return table.getItemsAsync(keys).then(
                        (results) => {
                            var S = results[keys[0]];
                            var C = results[keys[1]];
                            var B = results[keys[2]];
                            if (!S) {
                                // the session has not been saved to local storage.. it is fresh
                                this.Sstate_needsave = true;
                                this.loaded = true;
                                this.statuschanges = true;
                                if (this.trace_save_and_load) this.trace_load();
                                // put id in session list
                                return this.table.getValueAsync(this.key_sessionlist()).then(
                                    (val: string) => {
                                        var kvpairs = {};
                                        kvpairs[this.key_sessionlist()] = (val || "") + this.localname + " ";
                                        return this.table.setItemsAsync(kvpairs);
                                    });
                            }
                            else {
                                this.S_fromJSONstring(S);
                                if (C)
                                    this.C_fromJSONstring(C);
                                var baselayer = this.get_layer("B");
                                if (B) {
                                    var packets = JSON.parse(B);
                                    packets.forEach(p => this.ProcessLoadedPacket(p, baselayer));
                                }
                                keys = new Array<string>();
                                for (var i = baselayer.clientround + 1; i <= this.localround; i++)
                                    keys.push(this.key_layer("D" + i));
                                return this.table.getItemsAsync(keys).then(
                                    (result) => {
                                        keys.forEach((k) => {
                                            var packetsjson = result[k];
                                            if (packetsjson) {
                                                var packets = JSON.parse(packetsjson);
                                                var datalayer = this.create_layer(k.substr(k.indexOf("/") + 1));
                                                datalayer.clientround = Number(k.substr(k.indexOf("/") + 2));
                                                packets.forEach(p => this.ProcessLoadedPacket(p, datalayer));
                                            }
                                            else if (k !== this.key_layer("D" + this.localround)) {
                                                // if data layers other than the last are missing, it means base layer clientround was stale
                                                baselayer.clientround = baselayer.clientround + 1;
                                            }
                                        });
                                        // success
                                        this.loaded = true;
                                        this.statuschanges = true;
                                        if (this.trace_save_and_load) this.trace_load();
                                    });
                            }
                        })
                    });
            }


            private trace_load() {
                this.log(Util.fmt("\Loaded S:\n{0}\nLoaded C:{1}\nLoaded Data:\n{2}",
                    this.S_toJSONstring(),
                    this.C_toJSONstring(),
                    this.EncodeLayer(this.get_layer("B"), EncodingMode.TRACE_LOAD).map(p => p.toString()).join("\n"))
                    );
            }



            private deleteLocalStorageAsync(): Promise {

                var keystodelete = [this.key_Sstate(), this.key_Cstate(), this.key_layer("B")];
                var baselayer = this.get_layer("B");
                for (var i = baselayer.clientround + 1; i <= this.localround; i++)
                    keystodelete.push(this.key_layer("D" + i));
                var kvpairs = [];
                keystodelete.forEach((k) => kvpairs[k] = undefined);

                return this.table.getValueAsync(this.key_sessionlist()).then((val) => {
                    var regexp = new RegExp(this.localname + " ", 'g');
                    kvpairs[this.key_sessionlist()] = (val || "").replace(regexp, "");
                    return this.table.setItemsAsync(kvpairs);
                });
            }

            public try_reconnect_in(msec: number) {
                var curws = this.ws;
                var currentTime = new Date();
                //var hours = currentTime.getHours();
                //var minutes = currentTime.getMinutes();
                //var seconds = currentTime.getSeconds();
                //var attempt = (hours < 9 ? "0" : "") + hours + ":" + (minutes < 9 ? "0" : "") + minutes
                //    + ":" + (seconds < 9 ? "0" : "") + seconds + ((hours > 11) ? "PM" : "AM");
                //this.nexttry = attempt;
                this.nexttry = currentTime.getTime() + msec;
                this.statuschanges = true;
                this.retrypending = curws;
                Util.setTimeout(msec, () => this.user_retry_now());
            }

            private retrypending: WebSocket;

            public user_retry_now(): void {
                if (this.retrypending === this.ws) {
                    this.retrypending = undefined;
                    this.connect(this.url, this.tokensource);
                }
            }

            public connect(url: string, tokensource: (bool) => TDev.Promise): void {

                this.url = url;
                this.tokensource = tokensource;

                Util.assert(this.servername !== "");

                if (this.enable_sync === undefined) {
                    this.enable_sync = true; // default
                }

                if (Cloud.isOffline()) {
                    this.try_reconnect_in(this.connectionretrydelay);
                    return;
                }

                // check if connections are possible and allowed
                if (!this.enable_sync || this.marooned || this.closed || this.faulted)
                    return;

                // check if we need to force a new token
                var need_fresh_token = this.encountered_token_expiration;

                // clear remnants of previous connection, if any
                this.delete_layer("R", false);
                this.delete_layer("S", false);
                this.receivedstatus = false;
                this.last_serverround_received = undefined;
                this.last_clientround_received = undefined;
                this.last_serverround_sent = undefined;
                this.last_clientround_sent = undefined;
                this.encountered_token_expiration = undefined;

                var gotconnection = false;
                this.tokenpromise = this.tokensource(need_fresh_token);

                var ws = new WebSocket(url);
                this.log("connecting to " + url);

                this.ws = <MyWebSocket> ws;
                this.nexttry = 0;
                if (this.dochannelcompression)
                    this.ws.channelCompressor = new ChannelCompressor();


                this.ws.onmessage = (e) => {
                    if (this.ws !== ws) return;
                    if (this.trace_incoming_packets)
                        this.log("receive: " + e.data.replace(/\n/g, " ").substr(0,300));
                    this.ReceivePacket(Packet.ParsePacket(<string> e.data, this.ws));
                };

                this.ws.onopen = () => {
                    if (this.ws !== ws) return;
                    this.log("connected to " + url);
                    gotconnection = true;
                    this.nexttry = undefined;
                    this.tokenpromise.then(
                        (token) => {
                            if (this.ws !== ws)
                                return;
                            this.SendStatusPacket(token);
                        },
                        (err) => {
                            this.log("could not get authentication token");
                            if (this.ws !== ws)
                                return;
                            this.errorcategory = "offline";
                            this.error = "could not get authentication token from server";
                            this.disconnect();
                            this.try_reconnect_in(this.connectionretrydelay);
                        })
                    .then(() => {
                        this.doorbell();
                    })
                };
                this.ws.onclose = (c: CloseEvent) => {
                    var retryspeed = 1;
                    if (this.ws !== ws) return;
                    this.log("disconnected, code=" + c.code + ", reason=" + c.reason);

                    if (c.code === 1011 || c.code === 1005 || c.code === 1000) { // cannot rely on error codes
                        if (c.reason.indexOf("switched server") !== -1
                            || c.reason.indexOf("member not found") !== -1
                            || c.reason.indexOf("session salt mismatch") !== -1) {
                            this.marooned = true;
                        }
                        else if (c.reason.indexOf("connection reset") !== -1)
                        {
                            this.errorcategory = "connecting";
                            this.error = "refreshing base value";
                            this.rebase = true;
                            retryspeed = 10;
                        }
                        else if (c.reason.indexOf("cannot create session") !== -1) {
                            if (this.membernumber !== -1) {
                                this.marooned = true;
                            }
                            else if (this.servername.lastIndexOf(this.user, 0) !== 0) { // startswith
                                this.errorcategory = "not found";
                                this.error = "possible causes: spelling error in session id, the owner has not connected to this session yet, the session has been deleted";
                                retryspeed = 2;
                            }
                            else {
                                this.errorcategory = "not found";
                                this.error = "cannot create session on server" + c.reason.substr(21);
                                retryspeed = 1;
                            }
                        }
                        else if (c.reason.indexOf("Cannot reconnect: member still connected on existing socket") !== -1) {
                            this.errorcategory = "connecting";
                            this.error = "cleaning up old connection";
                            retryspeed = 7;
                        }
                        else if (c.reason.indexOf("access denied: readonly.") !== -1) {
                            this.errorcategory = "connecting";
                            this.error = "reconnecting as readonly";
                            this.readonly = true;
                            retryspeed = 10;
                        }
                        else if (c.reason.indexOf("access denied: ") !== -1) {
                            this.error = c.reason.substr(15);
                            if (c.reason.indexOf("old script version") !== -1
                                || c.reason.indexOf("outdated script, must update first") !== -1
                                ) {
                                this.errorcategory = "need update";
                                retryspeed = 0.01;
                            }
                            else
                                this.errorcategory = "access denied";
                        }
                        else if (c.reason.indexOf("Token Expired") !== -1) {
                            this.errorcategory = "connecting";
                            this.error = c.reason;
                            this.encountered_token_expiration = true;
                            retryspeed = 10;
                        } else if (c.reason.indexOf("failed to migrate session") !== -1
                            || c.reason.indexOf("Migrating session to new script version") !== -1) {
                            this.errorcategory = "transitioning";
                            this.error = "server is migrating session to newer script version";
                            retryspeed = 10;
                        } else if (c.reason.indexOf("reset") !== -1) {
                            this.errorcategory = "transitioning";
                            this.error = c.reason;
                            retryspeed = 10;
                        } else if (c.reason.indexOf("server: ") !== -1) {
                            this.errorcategory = "transitioning";
                            this.error = c.reason;
                       }
                        else {
                            this.errorcategory = "not working";
                            this.error = "server error: " + c.reason;
                        }
                    }
                    else if (c.code === 1006) {
                        this.errorcategory = "offline";
                        this.error = gotconnection ? "lost connection to server" : "could not connect to server";
                        retryspeed = gotconnection ? 10 : 1;
                    }
                    else {
                        this.errorcategory = "not working";
                        this.error = "websocket error " + c.code + " clean=" + c.wasClean + " reason=" + c.reason;
                    }

                    this.try_reconnect_in(this.connectionretrydelay / retryspeed);

                    this.presence = [];
                    this.statuschanges = true;
                    this.doorbell();
                };
            }

            public statuschanges = false; // flag for communicating status changes to user

            public disconnect(): void {
                var curws = this.ws;
                if (curws !== undefined) {
                    this.ws = undefined;
                    this.nexttry = undefined;
                    curws.close();
                    this.statuschanges = true;
                }
            }

            public finishPendingOperationsAsync(): Promise {
                if (!this.localname || !this.loadtask)
                    return Promise.as();
                if (this.closetask)
                    return this.closetask;
                return this.loadtask.then(() => Promise.join([
                    this.last_C_save.then(
                        (saveok) => {
                            this.SaveAndSend();
                            return this.last_C_save;
                        },
                        (savefailure) => {
                            this.faulted = true;
                            Util.oops("session save failed... local storage full?");
                        }
                        ),
                    this.last_S_save.then(
                        (saveok) => {
                            this.MergeAndSaveSB()
                            return this.last_S_save
                        },
                        (savefailure) => {
                            this.faulted = true;
                            Util.oops("session save failed... local storage full?");
                        }
                        )
                ]));
            }

            public closeAsync(deletelocalstorage: boolean): Promise {

                this.closed = true;

                var loadfirst = this.loadtask;

                if (this.intervalhandle)
                    clearInterval(this.intervalhandle);

                this.disconnect();

                this.user_unlink();

                if (!loadfirst) {
                    if (deletelocalstorage)
                        return this.closetask = this.deleteLocalStorageAsync();
                    else
                        return this.closetask = Promise.as();
                }

                if (!(this.localname && deletelocalstorage)) {
                    // ensure everything gets saved
                    return this.closetask = loadfirst.then(() => this.finishPendingOperationsAsync());
                } else {
                    // ensure everything gets deleted
                    return this.closetask = loadfirst.then(() => Promise.join([this.last_C_save, this.last_S_save]).then(
                        () => { return this.deleteLocalStorageAsync(); }
                    ));
                }
            }


            public MergeAndSaveSB(): boolean {

                Util.assert(this.loaded);
                if (this.faulted) return false;

                var save = false;
                var visiblechanges = false;
                var statuschanges = false;
                var changes = {};
                var layers_to_delete = new Array<Layer>();

                // check for ready serverrounds, integrate, and delete saved rounds
                var serverlayer = this.get_layer("S");
                if (serverlayer) {
                    var newround = serverlayer.clientround;
                    // proactively delete items in S if they are deleted by unconfirmed round
                    for (var i = newround + 1; i <= this.localround; i++) {
                        var unconfirmedlayer = this.get_layer("D" + i);
                        if (unconfirmedlayer && unconfirmedlayer.grounded)
                            serverlayer.invalidate_all();
                    }
                    if (!this.readblock) {
                        // add changes to baselayer
                        var oldbaseround = this.get_layer("B").clientround;
                        visiblechanges = this.collapse_layers("B", "S");
                        statuschanges = (newround === this.localround - 1);
                        this.get_layer("B").cleanIfNeeded(this.scrublimit);
                        // delete confirmed data layers
                        for (var i = oldbaseround + 1; i <= newround; i++) {
                            var datalayer = "D" + i;
                            this.delete_layer(datalayer, true);
                            if (this.localname) {
                                changes[this.key_layer(datalayer)] = undefined;
                                save = true;
                            }
                        }

                    }
                    else {
                        if (serverlayer.serverround >= this.readblock) {
                            // replace base layer
                            serverlayer.grounded = true;
                            this.collapse_layers("B", "S");
                            // delete confirmed data layers
                            var oldbaseround = this.get_layer("B").clientround;
                            var newround = serverlayer.clientround;
                            visiblechanges = true;
                            statuschanges = true;
                            for (var i = oldbaseround + 1; i <= newround; i++) {
                                var datalayer = "D" + i;
                                this.delete_layer(datalayer, true);
                                if (this.localname) {
                                    changes[this.key_layer(datalayer)] = undefined;
                                    save = true;
                                }
                            }
                            //remove readblock
                            this.readblock = undefined;
                        }
                    }
                }

                if (this.localname && !this.faulted) {

                    var packets;
                    var baselayer: Layer;

                    if (visiblechanges) {
                        changes[this.key_layer("B")] = JSON.stringify(packets = this.EncodeLayer(baselayer = this.get_layer("B"), EncodingMode.CLIENT_BASE_TO_DISK));
                        save = true;
                    }

                    if (this.Sstate_needsave) {
                        save = true;
                        this.Sstate_needsave = false;
                    }

                    if (save) {
                        changes[this.key_Sstate()] = this.S_toJSONstring(); // we always save this when saving at all

                        var savemsg = "(" + (packets ? ("B[" + baselayer.clientround + "," + baselayer.serverround + "]: " + packets.length + " pkts") : "status only") + ")";
                        if (this.trace_saving)
                            this.log("saving merged data " + savemsg);

                        if (this.trace_save_and_load)
                        this.log(Util.fmt("\nSaving S:\n{0}\nSaving B:\n{1}",
                            changes[this.key_Sstate()],
                            packets ? packets.map(p => p.toString()).join("\n") : "none"));

                        this.last_S_save = this.table.setItemsAsync(changes).then(
                            (saveok) => {
                                if (this.trace_saving)
                                    this.log("saved merged data " + savemsg);
                                if (this.ring_doorbell_when_done) {
                                    this.ring_doorbell_when_done = false;
                                    this.last_S_save = Promise.as();
                                    this.doorbell();
                                }
                            },
                            (savefailure) => {
                                this.log("!! failure while saving data " + savemsg);
                                Util.oops("save failed... local storage full?");
                            }
                            );
                    }
                }

                return visiblechanges || statuschanges;
            }


            public SaveAndSend(): Promise {
                Util.assert(this.loaded);

                if (this.last_C_save._state === PromiseState.Pending)
                    return this.last_C_save;

                if (this.ShouldSend()) {
                    var oldlayer = this.get_layer("D" + this.localround);
                    if (!oldlayer) oldlayer = this.create_layer("D" + this.localround, this.localround);
                    var baselayer = this.get_layer("B");

                    // create new layer
                    this.localround += 1;
                    var newlayer = this.create_layer("D" + this.localround, this.localround);

                    Util.check(baselayer.serverround !== undefined, "undefined serverround on baselayer");
                    var serverround = oldlayer.serverround = baselayer.serverround;
                    var clientround = oldlayer.clientround;


                    if (!this.localname) {
                        // just send those packets
                        this.send_layer(oldlayer);
                        return Promise.as();
                    }
                    else {
                        var curws = this.ws;
                        // first save to disk and then send layers
                        return this.SaveToDiskAsync([oldlayer, newlayer]).then(() => {
                            if (this.ws === curws)
                                this.send_layer(oldlayer)
                        });
                    }
                    this.CLstate_needsave = false;

                } else if (this.localname && this.CLstate_needsave) {

                    var locallayer = this.get_layer("D" + this.localround);
                    if (!locallayer) locallayer = this.create_layer("D" + this.localround, this.localround);

                    var promise = this.SaveToDiskAsync([locallayer]);
                    this.CLstate_needsave = false;
                    return promise;
                }
            }

            public cleanOutstandingLayers(): string[] {
                var blayer = this.get_layer("B");
                var deleted = [];
                for (var i = blayer.clientround+1; i <= this.localround; i++) {
                    this.delete_layer("D" + i, true);
                    deleted.push("D" + i);
                }
                this.localround = blayer.clientround + 1;
                return deleted;
            }

            public RemoveFromDiskAsync(layers: string[]): Promise {
                var kvpairs = {};
                kvpairs[this.key_Cstate()] = this.C_toJSONstring();
                kvpairs[this.key_Sstate()] = this.S_toJSONstring();
                layers.forEach((l) => kvpairs[this.key_layer(l)] = undefined);
                return this.table.setItemsAsync(kvpairs);
            }


            public SaveToDiskAsync(layers: Layer[]): Promise {

                if (this.faulted)
                    return Promise.as();

                //var packets = layers.map((l) => this.EncodeLayer(l, undefined, true));
                var kvpairs = {};
                kvpairs[this.key_Cstate()] = this.C_toJSONstring();
                layers.forEach((l) => {
                    var p = this.EncodeLayer(l, EncodingMode.CLIENT_LAYER_TO_DISK);
                    kvpairs[this.key_layer(l.name)] = JSON.stringify(p);
                });

                var currentws = this.ws;

                var savemsg = "(" + layers.map((l) => (l.name + "[" + l.clientround + ", " + l.serverround + "]")).join("/") + ")";
                if (this.trace_saving)
                    this.log("saving data " + savemsg);
                //this.logLayers();
                    this.last_C_save = this.table.setItemsAsync(kvpairs).then(
                    (saveok) => {
                        if (this.ws === currentws) // checks if ws was closed since we started this
                            return Promise.as(currentws);
                        if (this.trace_saving)
                            this.log("saved data " + savemsg);
                    },
                        (savefailure) => {
                        this.log("!! failure while saving data " + savemsg);
                            Util.oops("save failed... local storage full?");
                            this.faulted = true;
                });
                return this.last_C_save;
            }



            public ShouldSend(): boolean {


                // don't send data if broken
                if (this.faulted)
                    return false;

                // don't send data if websocket is not open
                if (this.ws === undefined || this.ws.readyState != WebSocket.OPEN || !this.receivedstatus)
                    return false;

                // don't send data if readonly or if ws buffer is not empty
                if (this.readonly || this.ws.bufferedAmount != 0)
                    return false;

                // don't send data while there is a write block
                var baselayer = this.get_layer("B")
                if (this.writeblock !== undefined) {
                    if (baselayer.serverround < this.writeblock)
                        return false;

                    // release writeblock and resend data
                    this.writeblock = undefined;
                    this.statuschanges = true;
                    var newround = this.localround;
                    for (var i = baselayer.clientround + 1; i < newround; i++) {
                        this.send_layer(this.get_layer("D" + i));
                    }
                }

                // don't send data if we have reached the limit on sent rounds
                if (this.localround - baselayer.clientround > this.pendingroundlimit)
                    return false;


                // don't send data if there is none and there is no fence pending
                if (!this.unsent_changes() && !this.fences.some((f: Fence) => (this.localround === f.round)))
                    return false;

                return true;
            }

            public user_issue_fence(continuation: () => void, exclusive: boolean): void {
                this.fences.push(new Fence(continuation, this.loaded ? this.localround : 0, exclusive));
                this.user_yield();
            }
            private fences: Fence[] = [];

            // callback for when data or status changes
            public doorbell: () => void = () => { };
            public user_set_doorbell(doorbell: () => void) {
                this.doorbell = doorbell;
            }


            // enable/disable sync
            public user_enable_sync(enable: boolean) {
                if (enable !== this.enable_sync) {
                    this.enable_sync = enable;
                    if (enable)
                        this.try_reconnect_in(500);
                    else
                        this.disconnect();
                    this.Sstate_needsave = true;
                    this.statuschanges = true;
                    this.doorbell();
                }
            }
            public user_sync_enabled(): boolean {
                return (this.enable_sync === undefined || this.enable_sync);
            }


            // various status functions

            public user_get_next_connection_attempt(): number {
                return (this.marooned || this.closed || this.faulted) ? undefined : this.nexttry;
            }

            public user_get_missing_rounds(): number {
                if (!this.faulted && this.loaded && !this.marooned && !this.closed && this.ws && this.ws.readyState === WebSocket.OPEN && this.receivedstatus) {
                    var baselayer = this.get_layer("B");
                    if (this.readblock)
                        return this.readblock - (this.get_layer("S") ? this.get_layer("S").serverround : 0);
                    else if (this.writeblock)
                        return this.writeblock - baselayer.serverround;
                    else if (this.localround - 1 > baselayer.clientround)
                        return (this.localround - 1 - baselayer.clientround);
                    else if (this.previewround > baselayer.serverround)
                        return (this.previewround - baselayer.serverround);
                    else
                        return this.NumberWaitingRpcs();
                }
                else return 0;
            }
            public user_is_websocket_open(): boolean {
                return this.ws && this.ws.readyState === WebSocket.OPEN;
            }
            public user_get_percent_full(): number {
                return (this.receivedserverinfo && this.percentfull) || 0;
            }

            /* This function may return an empty list if the session is not
             * ready yet. */
            public user_get_presence(): Participant[] {
                // In case we've disconnected, then we can still assert that
                // we're present, unless the session is not ready yet and
                // [membernumber] contains an invalid value.
                if (!this.presence && this.membernumber !== -1)
                    return [{ userId: this.user, sessionId: this.membernumber }]
                else
                    return this.presence;
            }

            // legacy status function
            public user_get_connectionstatus(include_details: boolean): string {
                var status = this.user_get_connectionstatus_full();
                if (include_details)
                    return status.status + " ("+status.description+")";
                else
                    return status.status;
            }

            // primary status function that returns structured info about the
            // connection status
            public user_get_connectionstatus_full(): Status {

                //var retrymsg = (this.nexttry !== undefined ? ("; will retry at " + this.nexttry) : "");
                var retrymsg = "";

                if (this.faulted) {
                    return {
                        type: StatusType.Error,
                        status: lf("not working"),
                        description: lf("local cache corrupted or storage full")
                    };
                } else if (!this.loaded) {
                    return {
                        type: StatusType.Ok,
                        status: lf("loading"),
                        description: lf("retrieving state from local storage")
                    };
                } else if (this.marooned) {
                    return {
                        type: StatusType.Error,
                        status: lf("isolated"),
                        description: lf("cloud session was deleted on server")
                    };
                } else if (this.closed) {
                    return {
                        type: StatusType.Error,
                        status: lf("closed"),
                        description: ""
                    };
                } else if (this.ws === undefined) {
                    if (this.enable_sync === false)
                        return {
                            type: StatusType.Warning,
                            status: lf("disabled") ,
                            description: lf("sync was disabled on purpose")
                        };
                    else if (Cloud.isOffline())
                        return {
                            type: StatusType.Warning,
                            status: lf("offline") ,
                            description: lf("touchdevelop is in offline mode{0}", retrymsg)
                        };
                    else {
                        return {
                            type: StatusType.Error,
                            status: lf("offline") ,
                            description: retrymsg
                        };
                    }
                } else if (this.ws.readyState === WebSocket.CONNECTING) {
                    return {
                        type: StatusType.Warning,
                        status: lf("connecting") ,
                        description: lf("trying to contact server")
                    };
                } else if (this.ws.readyState === WebSocket.OPEN) {
                    var baselayer = this.get_layer("B");
                    if (!this.receivedstatus)
                        return {
                            type: StatusType.Ok,
                            status: lf("connecting") ,
                            description: lf("waiting for server connection")
                        };
                    else if (this.readblock)
                        return {
                            type: StatusType.Ok,
                            status: lf("connecting"),
                            description: lf("receiving server data")
                        };
                    else if (this.writeblock)
                        return {
                            type: StatusType.Ok,
                            status: lf("connecting") ,
                            description: lf("checking changes on server")
                        };
                    else if (this.localround - 1 > baselayer.clientround)
                        return {
                            type: StatusType.Ok,
                            status: "connected" ,
                            description: this.NumberWaitingRpcs()
                                ? lf(" waiting for server")
                                : lf(" sending changes")
                        };
                    else if (this.previewround > baselayer.serverround)
                        return {
                            type: StatusType.Ok,
                            status: lf("connected") ,
                            description: lf("receiving changes")
                        };
                    else if (this.unsent_changes() || this.get_layer("T"))
                        return {
                            type: StatusType.Ok,
                            status: lf("connected") ,
                            description: lf("local changes pending")
                        };
                    else if (this.NumberWaitingRpcs())
                        return {
                            type: StatusType.Ok,
                            status: lf("connected") ,
                            description: lf("waiting for server")
                        };
                    else
                        return {
                            type: StatusType.Ok,
                            status: lf("connected"),
                            description: ""
                        };
                }
                else
                    return {
                        type: StatusType.Error,
                        status: this.errorcategory ,
                        description: (this.error) ? this.error + retrymsg : ""
                    };
            }



            public NumberWaitingRpcs(): number { // overridden by NodeSession
                return 0;
            }

            public user_set_userdata(key: string, val: any, equals?: (a, b) => boolean) {
                if (equals === undefined || !equals(this.userdata[key], val)) {
                    this.userdata[key] = val;
                    this.Sstate_needsave = true;
                }
            }
            public user_get_userdata(key: string): any {
                return this.userdata[key];
            }


            public user_push() {

                if (!this.loaded)
                    return;

                this.checkinvariants();

                // collapse T into L
                var locallayer = this.get_layer("D" + this.localround);
                if (!locallayer) locallayer = this.create_layer("D" + this.localround, this.localround);
                var transactionlayer = this.get_layer("T");
                if (transactionlayer) {
                    var changed = this.collapse_layers(locallayer.name, "T");
                    locallayer.cleanIfNeeded(this.scrublimit);
                    this.CLstate_needsave = this.CLstate_needsave || changed;
                }

                // expedite packets (instead of waiting till this gets called in the timer loop)
                this.SaveAndSend();

                this.checkinvariants();
            }

            public user_yield(): boolean {

                if (!this.loaded)
                    return;

                this.checkinvariants();
                var statuschanges = this.statuschanges;
                this.statuschanges = false;

                // collapse T into L
                var locallayer = this.get_layer("D" + this.localround);
                if (!locallayer) locallayer = this.create_layer("D" + this.localround, this.localround);
                var transactionlayer = this.get_layer("T");
                if (transactionlayer) {
                    var changed = this.collapse_layers(locallayer.name, "T");
                    locallayer.cleanIfNeeded(this.scrublimit);
                    this.CLstate_needsave = this.CLstate_needsave || changed;
                }

                // incorporate server changes
                if (this.last_S_save._state === PromiseState.Pending) {
                    this.ring_doorbell_when_done = true; // this flag will be seen by previous save when it completes
                    return false;
                }

                var datachanges = this.MergeAndSaveSB();

                // expedite packets (instead of waiting till this gets called in the timer loop)
                this.SaveAndSend();

                this.checkinvariants();

                // check if any fences are done
                if (this.fences.length > 0) {
                    var round = this.get_layer("B").clientround;
                    this.fences = this.fences.filter((f: Fence) => {
                        if (round < f.round)
                            return true;
                        // release
                        f.continuation();
                        return false;
                    });
                }

                return datachanges || statuschanges;
            }




            public protocolversion(): string { return "3.0"; }

            public SendStatusPacket(token: string) {

                var baselayer = this.get_layer("B");

                var keystring = "";
                if (this.includeKeysInStatus) {
                    var keys = [];
                    this.forEachValidDatum(baselayer, (datum: Datum) => keys.push(datum.target()));
                    keystring = keys.join("?").replace("|", "/");
                }

                var p = Packet.MakeStatusPacket(
                    this.protocolversion() + (this.dochannelcompression ? "C" : "") + (this.readonly ? "R" : ""),
                    this.servername,
                    this.membernumber.toString(),
                    this.user,
                    this.title,
                    this.disambiguator,
                    baselayer.clientround.toString(),
                    this.rebase ? "0" : baselayer.serverround.toString(),
                    token,
                    this.script,
                    this.permissions,
                    keystring
                );

                this.rebase = false;

                this.assertConsistency(this.receivedstatus === false);
                this.assertConsistency(this.last_serverround_sent === undefined);
                this.assertConsistency(this.last_serverround_received === undefined);
                this.assertConsistency(this.last_clientround_sent === undefined);
                this.assertConsistency(this.last_clientround_received === undefined);

                p.send(this.ws);
            }

            public ReceivePacket(p: Packet) {
                if (p.code === "sts") {
                    this.ReceiveStatusPacket(p);
                    this.doorbell();
                }
                else if (p.code === "inf") {
                    this.ReceiveInfoPacket(p);
                    this.doorbell();
                }

                else if (p.code === "frm") {
                    this.ReceiveFramePacket(p);
                    this.doorbell();
                }
                else {
                    var receivelayer = this.get_layer("R") || this.create_layer("R");
                    if (p.code === "new") {
                        p.serveritemcount = this.serveritemcount;
                        this.serveritemcount += 1;
                        this.ProcessNewPacket(p, receivelayer, this.ws.channelCompressor);
                    }
                    else if (p.code === "del") {
                        this.ProcessDelPacket(p, receivelayer);
                    }
                    else if (p.code === "cld") {
                        // read the packet
                        if (this.ws.channelCompressor)
                            p.definition = this.ws.channelCompressor.InBound(p.definition, p.lkeys);

                        if (p.definition === "*")
                            this.ProcessClearRootPacket(p, receivelayer);
                        //SEBTODO support domain clearing
                    }
                    else if (p.code === "clp") {
                        if (this.ws.channelCompressor)
                            p.definition = this.ws.channelCompressor.InBound(p.definition, p.lkeys);

                        //SEBTODO support property clearing
                    }
                    else {
                        Util.assert(p.code === "mod");
                        this.ProcessModPacket(p, receivelayer, this.ws.channelCompressor);
                    }
                }
            }

            public ProcessLoadedPacket(p: any, l: Layer) {
                if (typeof p === "string") // old serialization saved a string
                    p = Packet.ParsePacket(<string> p, this.ws, true);

                if (p.code === "new") {
                    var item = this.ProcessNewPacket(p, l);
                    this.add_item_to_index(item);
                }
                else if (p.code === "del") {
                    var item = this.ProcessDelPacket(p, l);
                    if (item) item.invalidate(true);
                }
                else if (p.code === "mod") {
                    var lval = this.ProcessModPacket(p, l);
                    this.add_lval_to_index(lval);
                }
                else if (p.code === "cld" && p.definition === "*") {
                    this.ProcessClearRootPacket(p, l);
                    // invalidate all datums in earlier layers
                    if (l.name != "B") {
                        var baselayer = this.get_layer("B");
                        baselayer.invalidate_all();
                        var baseround = baselayer.clientround;
                        var localround = this.localround;
                        for (var i = baselayer.clientround + 1; i < l.clientround; i++) {
                            var datalayer = this.get_layer("D" + i);
                            datalayer && datalayer.invalidate_all();
                        }
                    }
                }
                else if (p.code === "cop") {
                    var json = JSON.parse(p.lkeys[0]);
                    var libName = json.path.split("/")[0];
                    var actionName = json.path.split("/")[1];
                    var cop = <CloudOperation>{
                        libName: libName,
                        actionName: actionName,
                        paramNames: Object.keys(json.params),
                        returnNames: json.returnNames,
                        args: json.params,
                        opid: json.opid === undefined ? undefined : Number(json.opid),
                        uidcountstart: json.uidcountstart === undefined ? undefined : Number(json.uidcountstart),
                        uidcountstop: json.uidcountstop === undefined ? undefined : Number(json.uidcountstop),
                        optype: json.optype || CloudOperationType.UNKNOWN
                    };
                    l.CommitCloudOperation(cop);
                }
                else {
                    Util.assert(p.code === "frm");
                    this.ProcessFramePacket(p, l);
                }
            }


            public ReceiveInfoPacket(p: Packet) {
                // read the packet
                this.receivedserverinfo = true;
                this.previewround = Number(p.lkeys[0]);
                this.percentfull = Number(p.lkeys[1]);

                var userIds = p.lkeys[2].split(",");
                var sessionIds = p.lkeys[3].split(",");
                Util.assert(userIds.length == sessionIds.length);
                this.presence = userIds.map((userId, i) =>
                    ({ userId: userId, sessionId: parseInt(sessionIds[i]) })
                );

                this.statuschanges = true;
            }

            public ReceiveStatusPacket(p: Packet) {

                // read the packet
                var version = p.lkeys[0];
                var servername = p.lkeys[1];
                var membernumber = Number(p.lkeys[2]);
                var user = p.lkeys[3];
                var description = p.lkeys[4];
                var disambiguator = p.lkeys[5];
                var curserverround = Number(p.lkeys[6]);
                var serverround = Number(p.lkeys[7]);
                var token = p.lkeys[8];
                var script = p.lkeys[9];
                var permissions = p.lkeys[10];

                var clientUserId = p.lkeys[11];
                this.clientUserId = clientUserId;

                // store info
                if (description)
                    this.title = description;
                this.disambiguator = disambiguator;
                this.permissions = permissions;
                this.statusPacket = p;

                this.previewround = curserverround;

                Util.assert(version === this.protocolversion());
                Util.assert(servername === this.servername);
                Util.assert(this.membernumber === -1 || this.membernumber === membernumber);
                Util.assert(membernumber > 0);
                this.membernumber = membernumber;
                Util.assert(user === this.user);
                var baselayer = this.get_layer("B");
                this.assertConsistency(serverround === baselayer.serverround || serverround === 0);
                this.assertConsistency(curserverround >= baselayer.serverround);

                // if this is not the first status packet, it indicates that the server is rebasing the local segment
                var rebase = (this.receivedstatus);
                this.receivedstatus = true;

                if (rebase) {
                    this.delete_layer("R", false);
                    this.delete_layer("S", false)
                } else {
                    this.assertConsistency(this.last_clientround_received === undefined);
                }
                this.last_serverround_received = serverround;
                this.last_clientround_received = 0;

                // install blocks
                if (rebase || (serverround < baselayer.serverround))
                    this.readblock = curserverround;
                if (!rebase && (baselayer.clientround < this.localround - 1))
                    this.writeblock = curserverround;

                this.statuschanges = true;
                this.Sstate_needsave = true;

            }

            public ReceiveFramePacket(p: Packet) {

                // read the packet
                var clientround = Number(p.lkeys[0]);
                var serverround = Number(p.lkeys[1]);
                this.assertConsistency(this.receivedstatus);
                this.assertConsistency(serverround > this.last_serverround_received || this.acceptsUpdates);
                this.assertConsistency(clientround >= this.last_clientround_received);
                this.assertConsistency((!this.last_serverround_sent) || serverround > this.last_serverround_sent || this.acceptsUpdates);
                this.assertConsistency((!this.last_clientround_sent) || clientround <= this.last_clientround_sent);
                this.last_clientround_received = clientround;
                this.last_serverround_received = serverround;

                var baselayer = this.get_layer("B");
                this.assertConsistency(serverround >= baselayer.serverround || this.acceptsUpdates);
                this.assertConsistency(clientround >= baselayer.clientround);

                var serverlayer = this.get_layer("S") || this.create_layer("S", clientround, serverround);
                this.assertConsistency(serverround >= serverlayer.serverround || this.acceptsUpdates);
                this.assertConsistency(clientround >= serverlayer.clientround);

                var receivelayer = this.get_layer("R");
                if (receivelayer)
                    this.collapse_layers("S", "R");


                // collapse accumulation layers
                this.get_layer("S").cleanIfNeeded(this.scrublimit);

                serverlayer.serverround = serverround;
                serverlayer.clientround = clientround;

                if (this.fences.some((f: Fence) => f.exclusive)) {
                    //  need to yield here since the user script is blocked
                    //  this is safe because no other code can be executing
                    this.user_yield();
                }
            }

            public ProcessFramePacket(p: Packet, layer: Layer) {
                // read the packet and update layer
                layer.clientround = Number(p.lkeys[0]);
                layer.serverround = p.lkeys[1] == "" ? undefined : Number(p.lkeys[1]);
                if (p.lkeys[2]) {
                    var x = layer.clientrounds = {};
                    p.lkeys[2].split(",").forEach(s => {
                        var pair = s.split(":");
                        x[Number(pair[0])] = Number(pair[1]);
                    });
                }
            }

            public ProcessNewPacket(p: Packet, layer: Layer, comp?: ChannelCompressor): Item {

                // read the packet
                var uid = p.ukeys.shift();
                var ukeys = p.ukeys;
                var lkeys = p.lkeys;
                var fromCloudOp = p.fromCloudOp;
                var definition = comp ? comp.InBound(p.definition, lkeys) : p.definition;

                // create if not exist
                var entry = this.get_item(uid);
                if (!entry) {
                    entry = new Item();
                    entry.session = this;
                    entry.definition = definition;
                    entry.uid = uid;
                    entry.ukeys = ukeys;
                    entry.lkeys = lkeys;
                    entry.linkDeps();
                    entry.fromCloudOp = fromCloudOp;
                    this.add_item(entry);
                }
                else {
                    this.assertConsistency(entry.uid === uid);
                    this.assertConsistency(entry.definition === definition);
                    this.assertConsistency(ukeys.length === entry.ukeys.length);
                    for (var i = 0; i < ukeys.length; i++)
                        this.assertConsistency(ukeys[i] === entry.ukeys[i]);
                    this.assertConsistency(lkeys.length === entry.lkeys.length);
                    for (var i = 0; i < lkeys.length; i++)
                        this.assertConsistency(lkeys[i] === entry.lkeys[i]);
                }

                // check consistency with uid counter
                this.assertConsistency((uid.indexOf(".") !== -1) || (Number(uid) <= this.uidcount));

                // store in layer
                entry.recordCreation(layer, p.serveritemcount);

                return entry;
            }

            public ProcessDelPacket(p: Packet, layer: Layer) : Item {

                // read the packet
                var uid = p.ukeys[0];

                // record deletion if exist
                var entry = this.get_item(uid);
                if (entry) {
                    this.assertConsistency(entry.uid === uid);

                    entry.recordDeletion(layer);

                }
                return <Item> entry;
            }

            public ProcessModPacket(p: Packet, layer: Layer, comp?: ChannelCompressor, member?: number): LVal {
                // read the packet
                var ukeys = p.ukeys;
                var lkeys = p.lkeys;
                var definition = comp ? comp.InBound(p.definition, lkeys) : p.definition;
                var fromCloudOp = p.fromCloudOp;
                var op: any = lkeys.pop();
                if (op.lastIndexOf("^#", 0) === 0)  //startswith("^#")
                {
                    var c = (new Parser(op.substr(2), 0)).ParseComboComponents();
                    op = c.map(code => comp ? comp.InBound(code, lkeys) : code);
                    if (this.astencoding)
                       op = this.astencoding.fromstrings(op);
                }

                var target = ClientSession.MakeModTarget(definition, ukeys, lkeys);

                // create if not exist
                var lval = this.get_lval(target);
                if (!lval) {
                    lval = new LVal();
                    lval.session = this;
                    lval.definition = definition;
                    lval.ukeys = ukeys;
                    lval.lkeys = lkeys;
                    lval.parseDefinition();
                    lval.entry = this.user_get_entry(lval.indexdomain, ukeys, lkeys);
                    lval.linkDeps();
                    lval.fromCloudOp = fromCloudOp;
                    this.add_lval(lval);
                }
                else {
                    this.assertConsistency(lval.definition === definition);
                    this.assertConsistency(ukeys.length === lval.ukeys.length);
                    for (var i = 0; i < ukeys.length; i++)
                        this.assertConsistency(ukeys[i] === lval.ukeys[i]);
                    this.assertConsistency(lkeys.length === lval.lkeys.length);
                    for (var i = 0; i < lkeys.length; i++)
                        this.assertConsistency(lkeys[i] === lval.lkeys[i]);
                }

                if (member !== undefined && lval.codomain.indexOf("^") === 0) {
                    if (op.indexOf(".") !== 0) {
                        op = member + "." + op;
                    }
                }

                // store in layer
                lval.recordOperation(layer, op);

                return lval;
            }

            public ProcessClearRootPacket(p: Packet, layer: Layer) {

                Util.assert(p.code === "cld" && p.definition === "*"); // only support this one at this point

                // store in receive layer
                layer.grounded = true;
            }

        }



        /*
         * NodeSession
         * *************
         * A client cloud session that connects to a node server, i.e. that connects to an exported app.
         *
         **/
        export class NodeSession extends ClientSession {
            public returnMap = {};
            public sendCloudOperations: boolean = true;
            public includeKeysInStatus: boolean = true;
            public acceptsUpdates: boolean = true;
            public clientUserId: string;
            public requiresAuth: boolean = false;

            constructor(
                nodeserver: string,
                servername: string,         // the unique id for the session on the server
                localname: string,           // where to cache this session locally, or undefined if no caching wanted
                user: string               // who is connecting
                )
            {
                super(servername, localname, user);
                Util.assert(!!nodeserver);
                this.nodeserver = nodeserver
            }

            public hasNodeConnection(): boolean {
                return this.ws !== undefined && this.ws.readyState === WebSocket.OPEN;
            }

            public stopAsync() {
                this.disconnect();
                return Promise.as();
            }

            // Overwrite original ReceivePacket to also handle the new 'rpc' packets
            public ReceivePacket(p: Packet) {
                if (p.code === 'rpc') {
                    this.ReceiveOperation(p);
                    this.doorbell();
                } else {
                    return super.ReceivePacket(p);
                }
            }

            // ------ Cloud Operations
            // keep track of the curring top-level cloud operation that is being executed/recorded
            public recording: CloudOperation = null;
            public recordinground: number;

            // called when the first top-level cloud operation call is encountered
            public user_start_cloud_operation(libName: string, actionName: string, paramNames: string[], returnNames: string[], args: any, optype:CloudOperationType) {
                Util.assert(this.recording == null);
                Util.assert(this.recordinground == null);
                Util.assert(optype == CloudOperationType.OFFLINE);
                this.log("start recording operation: " + actionName);
                var script: CompiledScript = Runtime.theRuntime.compiled.libScripts[libName];
                this.recording = <CloudOperation>{
                    libName: libName,
                    actionName: actionName,
                    paramNames: paramNames,
                    returnNames: returnNames,
                    uidcountstart: this.uidcount,
                    args: args,
                    optype: optype
                };
                this.recordinground = this.localround;
            }

            // called when the call of the top-level cloud operation operation ended
            // commits the transactionlayer and adds the cloud operation to it
            public user_stop_cloud_operation(libName: string, actionName: string, paramNames: string[], returnNames: string[], args: any) {
                Util.assert(this.recording.libName == libName);
                Util.assert(this.recording.actionName == actionName);
                Util.assert(this.recording.paramNames == paramNames);
                Util.assert(this.recording.returnNames == returnNames);
                Util.assert(this.recording.args == args);
                Util.assert(this.recordinground == this.localround);
                this.log("done recording operation: " + actionName);
                var tlayer = this.get_layer("T") || this.create_layer("T");
                this.recording.uidcountstop = this.uidcount;
                tlayer.CommitCloudOperation(this.recording);
                this.recording = null;
                this.recordinground = null;
            }

            // called when an rpc operation is called
            // 1) commits the transaction layer and adds an RPC operation to it.
            // 2) yields and sets up the operationId and promise for when confirmation of the rpc has arrived through yielding.
            public user_rpc_cloud_operation(libName: string, actionName: string, paramNames: string[], returnNames: string[], args: any): Promise {
                this.log("record rpc operation: " + actionName);
                var promise = new PromiseInv();
                var script: CompiledScript = Runtime.theRuntime.compiled.libScripts[libName];
                var tlayer = this.get_layer("T") || this.create_layer("T");
                this.uidcount += 1;
                var opid = this.uidcount;
                this.returnMap[opid] = promise;
                var cop = <CloudOperation>{
                    libName: libName,
                    actionName: actionName,
                    paramNames: paramNames,
                    returnNames: returnNames,
                    args: args,
                    opid: opid,
                    optype: CloudOperationType.RPC
                };
                tlayer.CommitCloudOperation(cop);
                this.user_yield();
                return promise;
            }

            public NumberWaitingRpcs(): number {
                return Object.keys(this.returnMap).length;
            }

            // Receive result of an RPC performed through user_rpc_cloud_operation
            public ReceiveOperation(p: Packet) {
                var json = JSON.parse(p.lkeys[0]);
                var opid = Number(json.opid);
                var res = json.params;
                var path = json.path;

                // if the rpc generated an error
                if (path === "err") {

                    // remove the uncommitted layers, otherwise we will continue sending the operation that generated an error.
                    this.RemoveFromDiskAsync(this.cleanOutstandingLayers()).thenalways(() => {
                        // if we don't have the promise for that rpc anymore (e.g. client reconnected), just throw the exception
                        if (opid === -1 || this.returnMap[opid] === undefined) {
                            TDev.Runtime.theRuntime.handleException(res);

                    // otherwise throw an error on the promise related to this rpc call
                    } else {
                        this.returnMap[opid].error(res);
                    }
                    }).done();

                // otherwise it returned the result
                } else {

                    // if we still have the promise for this rpc, resolve it
                    if (this.returnMap[opid] !== undefined) {
                        this.returnMap[opid].success(res);
                        delete this.returnMap[opid];
                    }
                }
            }


            // incorporate unsent cloudOperations to determine whether there are unsent changes
            public unsent_changes(): boolean {
                var locallayer = this.get_layer("D" + this.localround);
                if (locallayer && ((locallayer.data.length != 0 || locallayer.grounded) || locallayer.cloudOperations && locallayer.cloudOperations.length > 0))
                    return true;
                return false;
            }

            // when we collapse a layer, we also need to collapse the cloud operations
            public collapse_layers(firstname: string, secondname: string, keepsecond?: boolean): boolean {
                var l1 = this.get_layer(firstname);
                var l2 = this.get_layer(secondname);

                if (!l1.grounded) {
                    l1.mergeCloudOperations(l2);
                }

                return super.collapse_layers(firstname, secondname, keepsecond);
            }


        }




        /*
         * ServerSession
         * *************
         * A cloud session running on the node server
         *
         **/
        export class ServerSession extends NodeSession {

            public sendCloudOperations: boolean = false;
            public concatIdToItem: boolean = true;
            private uidcountstart: number;
            private uidcountstop: number;
            public includeKeysInStatus: boolean = false;
            public requiresAuth: boolean = false;

            constructor(
                nodeserver: string,
                servername: string,
                localname: string,
                user: string,
                public rt: TDev.Runtime,
                public wsServer: WebSocketServerWrapper
                ) {
                super(nodeserver, servername, localname, user);
            }

            private current_membernumber: number = 0;
            public membernumber: number = 0;

            // a map of membernumbers to largest committed clientround
            private disambiguators = {};


            private hasPartialData: boolean;
            private hasLocalData: boolean;

            private schema = {};
            private full_keys = {};
            private types = {};

            public log(msg: string) { Util.log(msg); }


            // overwrite creating an item so we can use the uidcountstart provided by the client to create our id's.
            // More: When a client executes a cloud operation optimistically, it keeps track of the objects it has created
            // (e.g. at the start of the operation uidcount = 5, at the end = 9)
            // The server then uses this range of id's to create objects in name of the client.
            // When more objects are created it will create these in name of the server.
            public user_create_item(definition: string, ukeys: string[], lkeys: string[]): Item {
                // create the new item
                var k = new Item();
                k.session = this;
                k.definition = definition;
                Util.assert(this.loaded || this.faulted);
                if (this.uidcountstart === undefined || this.uidcountstart > this.uidcountstop) {
                    this.uidcount++;
                    var uid = "0." + this.uidcount;
                } else {
                    this.uidcountstart++;
                    var uid = this.membernumber + "." + this.uidcountstart;
                }
                k.uid = uid;
                k.ukeys = ukeys;
                k.lkeys = lkeys;
                Util.assert(!this.get_item(k.uid));
                if (this.readonly) {
                    k.deleted = true;
                    return k;
                }
                k.linkDeps();
                this.add_item(k);
                if (!k.has_deleted_dependencies()) {
                    // record creation
                    var transactionlayer = this.get_layer("T") || this.create_layer("T");
                    k.recordCreation(transactionlayer);
                    this.add_item_to_index(k);
                }
                // return datum
                return k;
            }

            // when a new layer is created on the server, serverround = clientround (because clientround means serverround at that time...)
            public create_layer(name: string, clientround?: number, serverround?: number): Layer {
                if (serverround === undefined) {
                    serverround = clientround;
                }
                return super.create_layer(name, clientround, serverround);
            }

            // get the unsaved layer (there is always only 1 unsaved layer)
            public get_unsaved_layer(): Layer {
                var locallayer = this.get_layer("D" + this.localround);
                if (!locallayer)
                    locallayer = this.create_layer("D" + this.localround, this.localround, this.localround);
                return locallayer;
            }

            // overwrite collapse_layers to include the merging of cloudOperations and clientrounds
            public collapse_layers(first: string, second: string, keep_second?: boolean): boolean {
                var l1 = this.get_layer(first);
                var l2 = this.get_layer(second);

                // collapse max clientrounds
                if (l2.clientrounds !== undefined) {
                    if (l1.clientrounds === undefined) {
                        l1.clientrounds = {};
                    }
                    Object.keys(l2.clientrounds).forEach((c) => {
                        if (l1.clientrounds[c] !== undefined && l2.clientrounds[c] !== undefined)
                            Util.assert(l1.clientrounds[c] <= l2.clientrounds[c]);
                        l1.clientrounds[c] = l2.clientrounds[c];
                    });
                }

                return super.collapse_layers(first, second, keep_second);
            }

            // start a new transaction before processing a batch of operations/effects
            public user_start_transaction(membernumber?: number, clientRound?: number): Layer {
                //Util.assert(transactionlayer === undefined, "transaction layer should be closed by user_end_transaction before calling user_start_transaction");
                var tlayer = this.get_layer("T") || this.create_layer("T");

                // set the clientRound of the requesting member (the member that is executing the batch of operations) in this layer
                if (clientRound !== undefined) {
                    tlayer.clientrounds = {};
                    tlayer.clientrounds[membernumber] = clientRound;
                }
                this.checkinvariants();
                return tlayer;
            }

            // If we processed a batch (group of cloud operations/effects), commit the layer and notify the save-loop that it requires a saveAndSend
            public user_end_transaction() {
                // collapse T into unsaved layer (L)
                var tlayer = this.get_layer("T") || this.create_layer("T");
                //Util.assert(tlayer !== undefined, "transaction layer has to be created by user_start_transaction before calling user_end_transaction");

                var unsavedlayer = this.get_unsaved_layer();

                this.collapse_layers(unsavedlayer.name, "T");

                unsavedlayer.cleanIfNeeded(this.scrublimit);

                this.Sstate_needsave = true;
            }


            // Rollback the current transaction by simply deleting the transaction layer
            public user_rollback_transaction() {
                // collapse T into unsaved layer (L)
                var tlayer = this.get_layer("T");
                Util.assert(tlayer !== undefined, "transaction layer has to be created by user_start_transaction before calling user_rollback_transaction");
                this.delete_layer("T", true);
            }


            // Only yield if we are not running a transaction (f
            public user_yield(): boolean {
                if (this.transactionRunning) return false;
                return super.user_yield();
            }
            public user_push()  {
                if (this.transactionRunning) return;
                return super.user_push();
            }


            // There is no S layer on the server-side
            public MergeAndSaveSB(): boolean {
                return false;
            }




            /*
             * WebSocket Server Transport
             *
             **/

            // The WebSocket server - set by ServerSessions




            // Send Layer to a particular client
            public sendLayerToClient(layer: Layer, socket: MyWebSocket) {
                var packets = this.EncodeLayer(layer, EncodingMode.SERVER_LAYER_TO_CLIENT, socket);
                var clientround = (layer.clientrounds && layer.clientrounds[socket.membernumber]) || socket.lastclientroundsent;
                var serverround = layer.serverround;
                this.updateForClient(packets, clientround, socket.membernumber);
                packets.forEach((p) => this.sendPacketToClient(this, p, socket));
                Util.assert(clientround >= socket.lastclientroundsent);
                Util.assert(serverround > socket.lastserverroundsent);
                socket.lastclientroundsent = clientround;
                socket.lastserverroundsent = serverround;
            }



            // Send updates of given layer to given client
            public sendUpdatesToClient(socket: MyWebSocket) {
                if (socket.keyset.has_unsent_keys()) {
                    var layer = this.get_layer("B");
                    var packets = this.EncodeLayer(layer, EncodingMode.SERVER_UPDATES_TO_CLIENT, socket);
                    if (packets.length > 2) {
                        var clientround = (layer.clientrounds && layer.clientrounds[socket.membernumber]) || socket.lastclientroundsent;
                        Util.assert(clientround >= socket.lastclientroundsent);
                        this.updateForClient(packets, clientround, socket.membernumber);
                        packets.slice(1)  // remove clear packet ?
                               .forEach((p) => (p.code !== "cld") ? this.sendPacketToClient(this, p, socket) : undefined);
                    }
                }
            }



            // Send Packet to a particular client
            public sendPacketToClient(session: ClientSession, p: Packet, socket:MyWebSocket) {
                var s = p.toString()
                session.log(socket.membernumber.toString() + "< " + s);
                socket.send(s);
            }

            // Adjust the frame packet so it includes given clientround
            public updateForClient(packets: Packet[], clientround: number, membernumber: number) {
                if (packets.length > 0) {
                    packets[packets.length - 1].lkeys[0] = String(clientround);
                }
                for (var i = 0; i < packets.length - 1; i++) {
                    var packet = packets[i];
                    packet.ukeys = packet.ukeys.map((uid) => this.filteruid(uid, membernumber));
                    if (packet.code == "mod" && packet.definition.indexOf("^") !== -1) {
                        var l = packet.lkeys.length - 1;
                        var k = packet.lkeys[l]
                        packet.lkeys[l] = this.filteruid(k, membernumber);
                    }
                }
                return packets;
            }

            // add the given membernumber to the id if it doesn't contain a membernumber yet.
            private filteruid(uid: string, member: number) {
                var r = /^\d+/.exec(uid);
                var m = r ? r[0] : undefined;
                if (m === String(member)) {
                    return uid.slice(uid.indexOf(".") + 1);
                } else {
                    return uid;
                }
            }


            // Functions that let you gradually learn the schema
            // This is dead code at the moment, but could be usefull nonetheless.
            //------------
            //private schema_learn_item(item: Item) {
            //    var val = this.schema[item.definition];
            //    if (!val)
            //        val = this.schema[item.definition] = {};
            //    return val;
            //}

            //private schema_learn_lval(lval: LVal) {
            //    var val = this.schema[lval.indexdomain];
            //    // global or array
            //    if (val === undefined) {
            //        val = this.schema[lval.indexdomain] = {};
            //    }
            //    if (val[lval.name] !== undefined) {
            //        Util.assert(val[lval.name].codomain === lval.codomain);
            //        Util.assert(val[lval.name].definition === lval.definition);
            //    } else {
            //        val[lval.name] = { codomain: lval.codomain, definition: lval.definition };
            //    }
            //}

            //private get_keys(entry: Entry) {
            //    var def = /^\w+/.exec(entry.definition);
            //    if (!def) return undefined;
            //    return this.schema[def[0]];
            //}





            // Update the keysets of all clients with respect to this layer.
            // Algo: Add keys of newly added items in the layer to the keyset + add closure
            public update_keysets(layer: Layer) {
                this.forEachValidDatum(layer, (d: Datum, op?: string) => {
                    if (d instanceof Item) {
                        if (op[0] === "C") {
                            var def = /^\w+/.exec(d.definition)[0];
                            (<Item>d).uid
                            if (this.types[def].replication === "full") {
                                this.add_item_to_keysets(<Item>d);
                            }
                        } else {
                            Util.assert(op === "D");
                            Util.assert(!layer.grounded);
                            // cloud perhaps remove again? (i.e. when creating/deleting a lot of objects)
                            //this.remove_item_from_keysets(<Item>d);
                        }

                    } else if (d instanceof LVal) {
                        // added through closure
                    }
                });
                this.add_closure_to_keysets();
            }

            // add given item to all keysets (fully replicated item)
            private add_item_to_keysets(item: Item) {
                this.sockets().forEach(s => s.keyset.add(item.uid));
            }

            // add the closure to all keysets
            private add_closure_to_keysets() {
                this.sockets().forEach(s => this.add_closure_to_keyset(s.keyset));
            }

            // continue adding the closure until it converges (no more data is added)
            private add_closure_to_keyset(keyset: Keyset) {
                var added = true;
                while (added) {
                    added = this.add_closure_to_keyset_it(keyset);
                }
            }

            // closure iteration for given keyset
            private add_closure_to_keyset_it(keyset: Keyset): boolean {
                // start tracking whether keys are added
                keyset.track();

                var blayer = this.get_layer("B");
                this.forEachValidDatum(blayer, (datum: Datum) => {

                    // 1) already in set (full)
                    // 2) added through lval reference (partial)
                    // 3) if all keys are in set
                    if (datum instanceof Item) {
                        var item = <Item>datum;
                         if (this.all_keys_in_keyset(item.ukeys, keyset)) {
                            keyset.add(item.uid);
                         }
                        return;
                    }

                    if (datum instanceof LVal) {
                        var lval = <LVal>datum;

                        // Index property: if the user is
                        // TODO: check for User key
                        if (/^\w+\[.*\]/.exec(lval.indexdomain)) {
                            if (keyset.contains(lval.lkeys[0])) {
                                this.add_lval_to_keyset(lval, keyset);
                            }
                            return;
                        }

                        // Table property: in the set if the item is
                        if (/\w+\(.*\)/.exec(lval.indexdomain)) {
                            // lval.ukeys[0] == uid
                            if (keyset.contains(lval.ukeys[0])) {
                                this.add_lval_to_keyset(lval, keyset);
                            }
                        }
                        return;
                    }

                    // add entry + all keys if user belongs to keyset
                    if (datum instanceof Entry) {
                        var entry = <Entry>datum;
                        if (this.get_replication_type(entry) === "partial") {

                             // TODO: check for User type
                            if (keyset.contains(entry.lkeys[0])) {
                                if (entry.definition.charAt(entry.definition.length - 1) === "]") {
                                    var types = entry.definition.slice(entry.definition.indexOf("["), entry.definition.lastIndexOf("]")).split(",");
                                    for (var i = 0; i < types.length; i++) {
                                        if (types[i].indexOf("(") !== -1) {
                                            keyset.add(entry.ukeys[i]);
                                        }
                                    }
                                }
                            }
                        }


                        return;
                    }

                    Util.assert(false);
                });

                // return whether there were are new keys added
                return keyset.track();
            }

            // add given lval (property) to the set + if it references an item, also add it.
            private add_lval_to_keyset(lval: LVal, keyset: Keyset) {
                var key = lval.target();
                keyset.add(key);
                var datum = this.data[key];
                if (datum instanceof Item) {
                    var item = <Item>datum;
                    if (this.all_keys_in_keyset(item.ukeys, keyset)) {
                        keyset.add(item.uid);
                    }
                }
            }

            // checks whether all keys are in given set
            private all_keys_in_keyset(keys: string[], keyset: Keyset): boolean {
                return keys.reduce((included: boolean, uid: string) => {
                    var item = this.get_item(uid);
                    return included && (item === undefined || keyset.contains(uid));
                }, true);
            }


            // initialize a keyset for given socket,
            // taking into consideration the keys that this client already has
            private initializeKeyset(socket: MyWebSocket, keys: string[]) {
                // keys can be: [""], ["key"] or ["key1", "key2"]
                if (keys.length !== 1 || keys[0] !== "") {
                    keys.forEach((k) => socket.keyset.keys[k] = true);
                }

                if (socket.clientUserId !== undefined) {
                    socket.keyset.add(socket.clientUserId);
                }

                var blayer = this.get_layer("B");
                this.forEachValidDatum(blayer, (datum: Datum) => {
                    if (datum instanceof Item) {
                        var item = <Item>datum;
                        if (this.get_replication_type(item) === "full") {
                            socket.keyset.add(item.uid);
                        }
                    }
                });
                this.add_closure_to_keyset(socket.keyset);
            }

            private addKeysFromLayer(layer: Layer, keyset: Keyset) {
                this.forEachValidDatum(layer, (d: Datum) => keyset.add(d.target()));
            }

            public setupKeyset(socket: MyWebSocket) {
                socket.keyset = new Keyset(this);
            }


            // Gets the necessary data about replication from the runtime data
            public getMetaData() {
                if (this.rt === undefined) return;

                var datas = this.rt.datas;
                // for each lib
                Object.keys(datas).forEach((d) => {
                    var lib = datas[d];

                    // for each Singleton
                    Object.keys(lib).forEach((n) => {

                        // only interested in Index or Table
                        if (/^\$\w+/.exec(n)) {
                            var name = n.slice(1);
                            this.types[name] = { replication: (lib[n] ? lib[n].replication : undefined) };
                        }
                    });
                });
            }

            // Returns the type of replication for given datum ("full" | "partial" | "local")
            // Could be changed to enum.
            private get_replication_type(datum: Datum) {
                var def = /^\w+/.exec(datum.definition);
                if (!def) return undefined;
                var repl = this.types[def[0]];
                if (!repl) return undefined;
                return repl.replication;
            }

            /*
             * WebSocket Setup
             * ***************
             * Accepting ws requests, handling ws messages and terminating sockets
             *
             ***/

            public isOriginAllowed(origin:string) {
                return true;
            }

            public connect(url: string, tokensource: () => TDev.Promise): void {
                this.url = url;

                // check if connections are possible and allowed
                if (this.closed || this.faulted)
                    return;

                this.hasPartialData = this.rt.compiled.hasPartialData;
                this.hasLocalData = this.rt.compiled.hasLocalData;

                if (this.rt.compiled.hostCloudData)
                    this.setupWebSockets();

                this.getMetaData();
            }

            public sockets() {
                return (<MyWebSocket[]>this.wsServer.connections()).filter(c => c.isTdWebSocket)
            }

            public setupWebSockets() {
                this.log('setting up websockets server');

                /*
                 * New WebSocket request
                 */
                this.wsServer.addHandler((request, next) => {
                    if (request.path() != "/") {
                        next()
                        return
                    }

                    if (!this.isOriginAllowed(request.origin())) {
                        request.reject();
                        this.log(Util.fmt("WebSocket connection from {0} rejected", request.origin()));
                        return;
                    }
                    this.log(Util.fmt("WS request from {0}", request.origin()));
                    var socket = <MyWebSocket>request.accept();
                    socket.isTdWebSocket = true
                    this.log(Util.fmt("accepted socket {0}", request.remoteAddress()));

                    // Buffers packets from client until frame packet received,
                    // unless it's a sts or rpc packet.
                    var buffer: Packet[] = [];

                    // Did we receive a status packet of this client?
                    var receivedStatus = false;

                    // don't need keyset when we have no partial data
                    //if (this.hasPartialData) {
                    this.setupKeyset(socket);


                    /*
                     * New Incoming Message
                     */
                    request.onMessage((str, buff) => {
                        if (buff) {
                            this.log('ERROR: Received Binary Message of ' + buff.length + ' bytes');
                        } else {
                            this.log((socket.membernumber || "?") + "> " + str);
                            var p = Packet.ParsePacket(str, socket);

                            // skip for now
                            //if (p.code === "inf") {
                            //    this.ReceiveInfoPacket(p);
                            //}

                            // Handle status and rpc packet directly
                            if (p.code === "sts") {
                                this.handleStatusPacket(p, socket);
                                receivedStatus = true;
                                return;
                            }

                            // Only handle packets if received status packet
                            Util.assert(receivedStatus);

                            // If received frame packet, queue the buffer and frame and reset buffer
                            if (p.code === "frm") {
                                this.queuePackets(buffer, p, socket, request, socket.membernumber);
                                buffer = [];
                            }

                            // Buffer effects and cloud operations
                            else {
                                buffer.push(p);
                            }
                        }

                    });


                    /*
                     * WebSocket Client Connection Closed
                     */
                    request.onClose((reasonCode, description) => {
                        receivedStatus = false;
                        this.log(' Peer ' + request.remoteAddress() + ' disconnected.');
                    });
                });

            }



            // Handle incoming status packet from client
            public handleStatusPacket(p: Packet, socket: MyWebSocket) {
                // read the packet
                var version = p.lkeys[0];
                var servername = p.lkeys[1];
                var membernumber = Number(p.lkeys[2]);
                var user = p.lkeys[3];
                var description = p.lkeys[4];
                var disambiguator = p.lkeys[5];
                var last_clientround = Number(p.lkeys[6]);
                var last_serverround = Number(p.lkeys[7]);
                var token = p.lkeys[8];
                var script = p.lkeys[9];
                var permissions = p.lkeys[10];
                var keysoruser = p.lkeys[11];

                // dirty replacement that replaces:
                // 1) the "|" separator that was replaced by "/" so it doesn't gets picked up by the packet parser
                // 2) all the uid's that do not have a membernumber
                var keys = keysoruser.replace("/", "|").replace(/(^\d+(?!\.))|(\|\d+(?!\.))|(\?\d+(?!\.))/g, (d) => {
                    if (d.indexOf("|") === 0) {
                        return ("|" + p.lkeys[2] + "." + d.slice(1));
                    } else if (d.indexOf("?") === 0) {
                        return ("?" + p.lkeys[2] + "." + d.slice(1));
                    } else {
                        return (p.lkeys[2] + "." + d);
                    }
                }).split("?");

                var rt = Runtime.theRuntime
                if (rt.authValidator) {
                    var clientUserId = ""
                    rt.wrapFromHandler(() => {
                        clientUserId = rt.runUserAction(rt.authValidator, [token])
                        if (clientUserId && !/:/.test(clientUserId))
                            Util.userError("user id returned from validator has to have a namespace (eg., fb:123456)")
                    })
                    if (!clientUserId) {
                        this.log("invalid authorization attempt")
                        //socket.drop(1000, "invalid authorization token", false);
                        //return
                    } else {
                        this.log("authorized as " + clientUserId);
                        socket.keyset.add(clientUserId);
                    }

                    p.lkeys[11] = clientUserId; // echo back the corrected user id
                    socket.clientUserId = clientUserId;
                }

                if (servername !== Revisions.nodesessionid(this.rt.host.currentGuid)) {
                    return socket.close(1000, "switched script")
                }

                var baselayer = this.get_layer("B");
                var startFrom = 0;

                // user making fresh connection:
                if (membernumber === -1) {
                    Util.assert(disambiguator === "");
                    membernumber = ++this.current_membernumber;
                    disambiguator = (+new Date()).toString(36);
                    p.lkeys[5] = disambiguator;
                    p.lkeys[2] = (membernumber).toString();
                    this.disambiguators[membernumber] = disambiguator;


                // user reconnecting
                } else {

                    // No longer a valid client state for this server
                    if (membernumber > this.current_membernumber
                        || this.disambiguators[membernumber] !== disambiguator) {
                        return socket.close(1000, "switched server")
                    }

                    // Do deltas instead of full version if we have the deltas
                    if (last_serverround <= baselayer.serverround &&
                        this.get_layer("D" + (last_serverround + 1).toString()) &&
                        baselayer.clientrounds && baselayer.clientrounds[membernumber] >= last_clientround)
                    {
                        startFrom = last_serverround;
                    }
                }

                // echo current server round
                p.lkeys[6] = String(baselayer.serverround);
                // echo server layer to start sending from
                p.lkeys[7] = String(startFrom);

                // save membernumber/socket
                socket.membernumber = membernumber;

                // 1) Send status echo
                this.sendPacketToClient(this, p, socket);

                // 2) Initialize/Update keyset for this client
                this.initializeKeyset(socket, keys);

                // Notify save loop to save the client information
                this.CLstate_needsave = true;

                // No data yet, don't have to send anything
                if (baselayer.serverround === 0)
                {
                    this.log("Sending Nothing");
                    socket.lastclientroundsent = 0;
                    socket.lastserverroundsent = 0;
                    return;
                }

                // 4.a) Rebase
                if (startFrom === 0) {
                    this.log("Sending Base (" + baselayer.serverround + ")");
                    socket.lastclientroundsent = 0;
                    socket.lastserverroundsent = 0;
                    this.sendLayerToClient(baselayer, socket);

                // 4.b) Or send missing deltas/keys
                } else {
                    this.log("Sending " + (baselayer.serverround - startFrom).toString() + " Deltas");
                    socket.lastclientroundsent = last_clientround;
                    socket.lastserverroundsent = startFrom;
                    for (var i = startFrom + 1; i <= baselayer.serverround; i++) {
                        var dlayer = this.get_layer("D" + i);
                        this.sendLayerToClient(dlayer, socket);
                    }
                    this.log("Sending Updates");
                    this.sendUpdatesToClient(socket);
                }
            }


            private currentOp: PromiseInv;
            private currentSReq: RT.ServerRequest;
            private transactionFailed: boolean = false;
            private transactionRunning: boolean = false;

            // Sequentially queue cloud effects and operations in the async queue (batch)
            public queuePackets(packets: Packet[], frame: Packet, socket:MyWebSocket, request, membernumber: number) {

                var clientRound = Number(frame.lkeys[0]);

                // keep track of all the new keys that are added in this transaction
                //var added_keys = [];

                // Start transaction
                (<any> this.rt).queueAsync((rt, args) => {
                    this.user_start_transaction(membernumber, clientRound);
                    this.transactionRunning = true;
                    this.membernumber = membernumber;
                });

                packets.forEach((p) => {
                    // 1) Cloud operation (RPC or offline available)
                    if (p.code === "cop") {
                        if (this.transactionFailed) return;

                        var json = JSON.parse(p.lkeys[0]);
                        var path = json.path;
                        var params = json.params;
                        var opid = json.opid;
                        var optype = json.optype;
                        var uidcountstart = (isNaN(Number(json.uidcountstart))) ? undefined : Number(json.uidcountstart);
                        var uidcountstop = (isNaN(Number(json.uidcountstop))) ? undefined : Number(json.uidcountstoptart);

                        var promise = this.queueOperation(path, params, request.origin, socket.membernumber, socket, uidcountstart, uidcountstop);

                        // got result from operation, this can be after the transaction is already committed (with await)
                        // just commit operation in the current transaction layer (result will be sent when the layer is saved to disk -- in SaveAndSend)
                        promise.then((res) => {

                            var tlayer = this.get_layer("T") || this.create_layer("T");
                            tlayer.CommitCloudOperation(<CloudOperation>{
                                libName: path.split("/")[0],
                                actionName: path.split("/")[1],
                                paramNames: Object.keys(params),
                                returnNames: [],
                                args: [],
                                optype: optype,
                                opid: opid,
                                res: res,
                                socket: socket
                            })

                        // report error to client
                        }, (err) => {
                            this.sendError(opid, err, socket);
                        });

                    // 2) Cloud effect
                    } else {
                        (<any> this.rt).queueAsync((rt, args) => {
                            var tlayer = this.get_layer("T") || this.create_layer("T");
                            var key = this.handleCloudPacket(p, tlayer, request, socket);
                            //if (key !== undefined) added_keys.push(key);
                        });
                    }
                });

                // End of transaction
                (<any> this.rt).queueAsync((rt, args) => {
                    this.membernumber = 0;
                    if (this.transactionFailed) {
                        this.user_rollback_transaction();
                        this.transactionFailed = false;

                    } else {
                        this.addKeysFromLayer(this.get_layer("T"), socket.keyset);
                        this.user_end_transaction();
                        //added_keys.forEach((k) => socket.keyset.add(k));
                        this.log("finished handling cloud request");
                        this.SaveAndSend();
                    }
                    this.transactionRunning = false;
                });
            }


            // Queue given action call by creating a proxy ServerRequest and enqueueing it in the rt
            public queueOperation(path: string, params: any, host: string, membernumber: number, socket:MyWebSocket, uidcountstart: number, uidcountstop: number): Promise {
                var promiseInv = new PromiseInv();
                var req = {
                    method: "WS",
                    headers: { host: host.replace(/^[a-z]+:\/\//, "") },
                    url: "/api/" + path,
                    body: params,
                    connection: socket,
                    tdQueryString: {},
                };

                var sReq = RT.ServerRequest.mk(req, promiseInv);
                if (socket.clientUserId)
                    sReq._user = RT.User.mk(socket.clientUserId)

                sReq.setJsonBody(params);
                sReq._api_path = path;

                this.currentOp = promiseInv;
                promiseInv.thenalways(() => {
                    if (this.currentOp === promiseInv) {
                        this.currentOp = undefined
                    }
                });

                // 1) set the uid/member values for the requesting client
                (<any> this.rt).queueAsync((rt, args) => {
                    this.membernumber = membernumber;
                    this.uidcountstart = uidcountstart;
                    this.uidcountstop = uidcountstop;
                });

                // 2) dispatch the actual request
                var promise = (<any>this.rt).dispatchServerRequest(sReq, promiseInv);

                // 3) reset the uid/member values
                (<any> this.rt).queueAsync((rt, args) => {
                    this.membernumber = 0;
                    this.uidcountstart = undefined;
                    this.uidcountstop = undefined;
                });
                //return promise.then((res) => { this.membernumber = -1; return res }, (err) => Promise.wrapError(err));
                return promise;
            }


            // Error was thrown in current operation, abort transaction
            public abortCurrentTransaction(bug) {
                // exception happened before an async/await in the operation
                if (this.currentOp != undefined) {
                    this.currentOp.error(bug);
                    this.transactionFailed = true;
                    this.log("rolled back transaction because of error");
               }

                // exception happened after or in an async
                this.log(bug.exceptionMessage);
                // TODO: report to client
            }


            // Handle cloud effect or operation packet
            // Assumes user_start_transaction is called
            public handleCloudPacket(p: Packet, layer: Layer, request, socket:MyWebSocket): string {
                Util.assert(layer !== undefined);
                this.completeIds(p, layer, socket.membernumber);
                if (p.code === "new") {
                    this.log("Handling new effect");
                    p.serveritemcount = this.serveritemcount;
                    this.serveritemcount += 1;
                    var entry = this.ProcessNewPacket(p, layer);
                    return entry.uid;
                }
                else if (p.code === "del") {
                    this.log("Handling del effect");
                    this.ProcessDelPacket(p, layer);
                }
                else if (p.code === "cld") {
                    this.log("Handling cld effect");
                    if (p.definition === "*")
                        this.ProcessClearRootPacket(p, layer);
                    //SEBTODO support domain clearing
                }
                else if (p.code === "clp") {
                    this.log("Handling clp effect");
                    //SEBTODO support property clearing
                }
                else {
                    Util.assert(p.code === "mod");
                    this.log("Handling mod effect");
                    var lval = this.ProcessModPacket(p, layer, undefined, socket.membernumber);
                    return lval.target();
                }
                return undefined;
            }

            // Add the respective membernumber to incoming non-complete id's.
            public completeIds(p: Packet, layer: Layer, membernumber: number) {
                p.ukeys.forEach((uid) => {
                    var uid = p.ukeys[0];
                    if (uid.indexOf(".") === -1) {
                        p.ukeys[0] = String(membernumber) + "." + uid;
                    }
                });
            }

            // Handle a cloud operation packet (cloud execution)
            //public ProcessCopPacket(p: Packet, layer: Layer, request, socket): Promise {
            //    var json = JSON.parse(p.definition);
            //    var path = json.path;
            //    var params = json.params;
            //    var opid = json.opid;
            //    var promise = this.executeOperation(path, params, request.origin, socket.membernumber, socket);
            //    return promise.then((res) => {
            //        layer.CommitCloudOperation(<CloudOperation>{ libName: path.split("/")[0], actionName: path.split("/")[1], paramNames: Object.keys(params), returnNames: [], args: [], opid: opid, res: res, socket: socket })
            //    }, (err) => {
            //        this.sendError(opid, err.message, socket);
            //        return Promise.wrapError(err);
            //    });
            //}


            // Execute given action call, by creating a ServerRequest for it and enqueueing it in the rt
            //public executeOperation(path: string, params: any, host: string, membernumber: number, socket): Promise {
            //    var promiseInv = new PromiseInv();
            //    var req = {
            //        method: "WS",
            //        headers: { host: host.replace(/^[a-z]+:\/\//, "") },
            //        url: "/api/" + path,
            //        body: params,
            //        connection: socket,
            //        tdQueryString: {},
            //    };

            //    var sReq = RT.ServerRequest.mk(req, promiseInv);
            //    if (socket.clientUserId)
            //        sReq._user = RT.User.mk(socket.clientUserId)

            //    sReq.setJsonBody(params);
            //    sReq._api_path = path;
            //    this.sessions.rt.sessions.getCurrentSession().membernumber = membernumber;
            //    var promise = this.sessions.rt.dispatchServerRequest(sReq, promiseInv);
            //    return promise.then((res) => { this.sessions.rt.sessions.getCurrentSession().membernumber = 0; return res }, (err) => Promise.wrapError(err));
            //}



            // Send the results for the executed rpc cloud ops in this layer to the clients
            public sendResults(layer: Layer) {
                if (layer.cloudOperations !== undefined) {
                    layer.cloudOperations.forEach((cop) => {
                        if (cop.opid !== undefined) {
                            Util.assert(cop.socket !== undefined);
                            Util.assert(cop.res !== undefined);
                            this.sendResult(cop.opid, cop.res, cop.socket);
                        }
                    });
                }
            }

            // Send the result back of RPC with given opid to given ws
            public sendResult(opid: number, res: any, socket:WebSocket) {
                var p = Packet.MakeRpcPacket("", res, opid);
                socket.send(p.toString());
            }

             // Send the error back of RPC with given opid to given ws
            public sendError(opid: number, err: any, socket:WebSocket) {
                var p = Packet.MakeRpcPacket("err", err, opid);
                socket.send(p.toString());
            }


            /*
             * Save Loop
             * *********
             * Periodically merges the unsaved layer into the base layer, saves it to disk and propagates
             * the newly committed layer to all connected clients
             *
             **/

            // Merge, Save and Send the unsaved layer if necessary
            // SaveAndSend is called:
            //  * periodically by ClientSession.loadAsync (no serverround)
            //  * after an RPC call (with serverround),
            //    so we know when exactly the required changes of the RPC call are saved and sent
            public SaveAndSend(serverround?: number): Promise {
                Util.assert(this.loaded);

                var promise = Promise.as();

                // if localround is bigger than given serverround, the required unsaved layer is already saved
                if (serverround !== undefined && this.localround > serverround) {
                    return this.last_C_save;
                }

                // currently saving, try again when done.
                if (this.last_C_save._state === PromiseState.Pending) {
                    return this.last_C_save.then(() => this.SaveAndSend(serverround));
                }

                var ulayer = this.get_layer("D" + this.localround);

                if (ulayer && ulayer.hasData()) {
                    var oldlayer = this.get_unsaved_layer();
                    var baselayer = this.get_layer("B");

                    // create new layer
                    this.localround += 1;
                    var newlayer = this.create_layer("D" + this.localround, this.localround, this.localround);

                    // 1) collapse the unsaved layer into B
                    this.collapse_layers("B", oldlayer.name, true);

                    // 2) save B and meta data to disk
                    this.last_C_save = this.SaveToDiskAsync().then(() => {
                        //...
                        this.update_keysets(oldlayer);
                        // 3.1) send the committed layer to all clients
                        this.log("Broadcasting Layer " + oldlayer.name);
                        this.sockets().forEach((s: MyWebSocket) => {
                            // the save may have interleaved with new connections joining.. these have already sent the latest
                            if (s.lastserverroundsent < oldlayer.serverround) {
                                Util.assert(s.lastserverroundsent == oldlayer.serverround - 1);
                                this.sendLayerToClient(oldlayer, s);
                            } else
                                Util.assert(s.lastserverroundsent == oldlayer.serverround);
                        });
                        // 3.2) send newly revealed keys
                        this.log("Sending Updates");
                        this.sockets().forEach((s: MyWebSocket) => this.sendUpdatesToClient(s));
                        // 4) send rpc results
                        this.sendResults(oldlayer);
                        oldlayer.removeCloudOperations();
                    });

                    promise = this.last_C_save;
                    this.CLstate_needsave = false;

                // Just save to disk (don't send)
                // This is used for the meta data (e.g. when someone new connected) so this could be optimized
                } else if (this.CLstate_needsave) {
                    promise = this.SaveToDiskAsync();
                    this.CLstate_needsave = false;
                    return promise;
                }

                return promise;
            }




            /*
             * Persistence
             * ***********
             * Saves and loads the baselayer and necessary meta data to and from disk using Tables
             * Uses: Table (rt/storage.ts) <- FsTable (nodelib/runtime.ts)
             *
             ****/

            /* Serialization */
            public S_toJSONstring(): any {
                return JSON.stringify({
                    uidcount: this.uidcount,
                    localround: this.localround,
                    disambiguators: this.disambiguators,
                    current_membernumber: this.current_membernumber
                });
            }
            public S_fromJSONstring(s: string): any {
                var json = JSON.parse(s);
                this.uidcount = json.uidcount;
                this.disambiguators = json.disambiguators || {};
                this.localround = json.localround;
                this.current_membernumber = json.current_membernumber;
            }


            /* Saving/Loading */
            public SaveToDiskAsync(): Promise {
                var baselayer = this.get_layer("B");
                var kvpairs = {};
                kvpairs[this.key_Sstate()] = this.S_toJSONstring();
                var packets = this.EncodeLayer(baselayer, EncodingMode.SERVER_BASE_TO_DISK);
                kvpairs[this.key_layer("B")] = JSON.stringify(packets);
                this.log("saving state...");
                if (this.trace_save_and_load)
                    this.log(Util.fmt("\nSaved Metadata:\n{0}\nSaved Data:\n{1}",
                    kvpairs[this.key_Sstate()],
                    packets.map(p => p.toString()).join("\n")));
                this.last_C_save = this.table.setItemsAsync(kvpairs).then(
                    (saveok) => {
                        this.log("saved state.");
                        return Promise.as();
                    },
                    (savefailure) => {
                        this.log("!! failure while saving data ");
                        Util.oops("save failed... local storage full?");
                        this.faulted = true;
                        throw savefailure;
                    });
                return this.last_C_save;
            }

            public LoadFromDiskAsync(): Promise {
                return Storage.getTableAsync("Sessions").then((table) => {
                    this.table = table;
                    var keys = [this.key_Sstate(), this.key_layer("B")];
                    return table.getItemsAsync(keys).then(
                        (results) => {
                            var S = results[keys[0]];
                            var B = results[keys[1]];
                            var baselayer = this.get_layer("B");
                            if (!S) {
                                // the session has not been saved to local storage.. it is fresh
                                this.Sstate_needsave = true;
                            }
                            else {
                                this.S_fromJSONstring(S);
                                if (B) {
                                    var packets = JSON.parse(B);
                                    packets.forEach(p => this.ProcessLoadedPacket(p, baselayer));
                                }
                                //this.logLayers();

                            }
                            // fix up client round if baselayer was not appropriately saved
                            if (baselayer.serverround < this.localround - 1) {
                                this.log("Corrupted files - lost " + (this.localround - baselayer.serverround - 1) + " rounds. ");
                                this.localround = baselayer.serverround + 1;
                            }
                            // success
                            this.loaded = true;
                            this.statuschanges = true;

                            if (this.trace_save_and_load)
                                this.log(Util.fmt("\Loaded Metadata:\n{0}\nLoaded Data:\n{1}",
                                    this.S_toJSONstring(),
                                    this.EncodeLayer(this.get_layer("B"), EncodingMode.TRACE_LOAD).map(p => p.toString()).join("\n"))
                                    );
                    })
                });
            }


            /*
             * Methods we inherit from ClientSession, but which we do not want to be called on the server
             *
             **/
            public user_sync_enabled(): boolean { throw new Error("Should not be called on the server"); }
            public user_enable_sync(b: boolean) { throw new Error("Should not be called on the server"); }
            public user_issue_fence(continuation: () => void, exclusive: boolean) { throw new Error("Should not be called on the server"); }
            //public user_set_doorbell(doorbell: () => void) { throw new Error("Should not be called on the server"); }
            public user_get_connectionstatus(include_details: boolean): string { throw new Error("Should not be called on the server"); }
            public user_get_next_connection_attempt(): number { throw new Error("Should not be called on the server"); }
            public user_get_missing_rounds(): number { throw new Error("Should not be called on the server"); }
            public user_is_websocket_open(): boolean { throw new Error("Should not be called on the server"); }
            public user_retry_now(): void { throw new Error("Should not be called on the server"); }
            public user_get_percent_full(): number { throw new Error("Should not be called on the server"); }
            public isFaulted(): boolean { throw new Error("Should not be called on the server"); }
            public isClosed(): boolean { throw new Error("Should not be called on the server"); }
            public isMarooned(): boolean { throw new Error("Should not be called on the server"); }
            public getCloudSession(): TDev.RT.CloudSession { throw new Error("Should not be called on the server"); }
        }





        /*
         * Keyset
         * ********
         *
         ***/

        export class Keyset {

            public keys: any;
            private delta: any;
            private added: boolean;

            constructor(private session: ServerSession) {
                this.keys = {};
                this.delta = {};
            }

            public add(key: string) {
                Util.assert(key !== undefined);
                if (this.keys[key]) return;
                this.added = true;
                this.delta[key] = true;
                this.keys[key] = true;
            }

            public remove(key: string) {
                delete this.keys[key];
                delete this.delta[key];
            }

            public contains(key: string) {
                return this.keys[key] !== undefined;
            }

            public contains_and_clr(key: string) {
                var contains = this.contains(key);
                if (contains) {
                    if (this.delta[key] !== undefined) {
                        this.session.log("sending " + key);
                    }
                    delete this.delta[key];
                } else {
                    this.session.log(Util.fmt("Does not contain: {0}", key));
                }
                return contains;
            }

            public is_unsent_and_clr(key: string) {
                var is_unsent = this.delta[key] !== undefined;
                if (is_unsent) {
                    this.session.log("send update for " + key);
                    delete this.delta[key];
                }
                return is_unsent;
            }

            public has_unsent_keys() {
                return Object.keys(this.delta).length > 0;
            }

            public key_sent(key: string) {
                delete this.delta[key];
            }

            public unsent_keys() {
                return this.delta;
            }

            public reset_delta() {
                this.delta = {};
            }

            public track() {
                var res = this.added;
                this.added = false;
                return res;
            }
        }






        export class Packet {

            public code: string;
            public definition: string;
            public ukeys: string[];
            public lkeys: string[];
            public serveritemcount: number;
            public fromCloudOp: boolean;

            public static MakeStatusPacket(...args) {
                var p = new Packet();
                p.code = "sts";
                p.ukeys = [];
                p.lkeys = args;
                return p;
            }

            public static MakeNewPacket(definition: string, uid: string, ukeys: string[], lkeys: string[], serveritemcount?: number, comp?:ChannelCompressor) {
                var addedliterals = [];
                var p = new Packet();
                p.code = "new";
                p.ukeys = [uid].concat(ukeys);
                if (comp) {
                    p.lkeys = lkeys.slice(0);
                    p.definition = comp.OutBound(definition, p.lkeys);
                } else {
                    p.lkeys = lkeys;
                    p.definition = definition;
                }
                p.serveritemcount = serveritemcount;
                return p;
            }

            public static MakeDelPacket(uid: string) {
                var p = new Packet();
                p.code = "del";
                p.ukeys = [uid];
                p.lkeys = [];
                return p;
            }

            public static MakeCldStarPacket(comp?: ChannelCompressor): Packet {
                var p = new Packet();
                p.code = "cld";
                p.ukeys = [];
                p.lkeys = [];
                p.definition = comp ? comp.OutBound("*", p.lkeys) : "*";
                return p;
            }

            public static MakeModPacket(definition: string, op: any, ukeys: string[], lkeys: string[], scheme: IAstEncoding, comp?: ChannelCompressor): Packet {
                var p = new Packet();
                p.code = "mod";
                var addedliterals = [];
                if (typeof (op) !== "string") {
                    Util.assert(Array.isArray(op));
                    if (scheme)
                        op = scheme.tostrings(op);
                    op = "^#" + (<string[]> op).map(s => Parser.WriteComboString(comp ? comp.OutBound(s, addedliterals) : s)).join("|");
                }
                addedliterals.reverse();
                addedliterals.push(op);
                p.definition = comp ? comp.OutBound(definition, addedliterals) : definition;
                p.ukeys = ukeys;
                p.lkeys = lkeys.concat(addedliterals);
                return p;
            }


            public static MakeFramePacket(layer: Layer, withClientRounds: boolean): Packet {
                var p = new Packet();
                p.code = "frm";
                p.ukeys = [];
                p.lkeys = [layer.clientround.toString()];
                p.lkeys.push(layer.serverround === undefined ? "" : layer.serverround.toString());
                if (withClientRounds && layer.clientrounds)
                    p.lkeys.push(Object.keys(layer.clientrounds).map((c) => c + ":" + layer.clientrounds[c].toString()).join(","));
                return p;
            }



            public static MakeCopPacket(path: string, params: any, opid?: number, uidcountstart?: number, uidcountstop?: number) {
                var json = {
                    path: path,
                    params: params,
                    opid: opid,
                    uidcountstart: uidcountstart,
                    uidcountstop: uidcountstop
                }
                var p = new Packet();
                p.code = "cop";
                p.ukeys = [];
                p.lkeys = [JSON.stringify(json)];
                return p;
            }

            public static MakeRpcPacket(path: string, params: any, opid: number) {
                var json = {
                    path: path,
                    params: params,
                    opid: opid
                }
                var p = new Packet();
                p.code = "rpc";
                p.ukeys = [];
                p.lkeys = [JSON.stringify(json)];
                return p;
            }

            public static ParsePacket(from: string, ws: WebSocket, fromDisk?: boolean): Packet {
                var p = new Packet();
                var code = from.slice(0, 3);
                //TODO: use compression table (stored as property of ws) when parsing to reuse existing string constants
                var c = (new Parser(from, 0)).ParseComboComponents();
                var i = 0;
                p.code = c[i++];
                p.definition = c[i++];
                if (fromDisk) {
                    p.fromCloudOp = Boolean(c[i++]);
                }
                p.ukeys = new Array<string>();
                p.lkeys = new Array<string>();
                for (; i < c.length; i++) {
                    var s = c[i];
                    var first = s.charAt(0);
                    if (first === "+")
                        p.lkeys.push(s.slice(1));
                    else if (first === "-")
                        p.serveritemcount = Number(s.slice(1));
                    else
                        p.ukeys.push(s);
                }
                return p;
            }

            public toString() {
                var s = this.code + "|" + (this.definition ? Parser.WriteComboString(this.definition) : "");
                /// if (toDisk) {
                ///    s = s + "|" + this.fromCloudOp;
                // }
                this.ukeys.forEach((uid: string) => {
                    s = s + "|" + uid;
                });
                this.lkeys.forEach((lit: string) => {
                    s = s + "|+" + Parser.WriteComboString(lit);
                });
                if (this.serveritemcount !== undefined)
                    s = s + "|-" + this.serveritemcount;
                return s;
            }

            public send(ws: WebSocket) {

                // trying to hunt down a bug I've seen in a log
                Util.check(this.code !== "frm" || this.lkeys[1] !== undefined, "undefined serverround sent frame");

                ws.send(this.toString());
            }


        }

        export class ChannelCompressor {
            public map: any = {};
            public hash: any = {};
            public localcount = 0;

            public InBound(code: string, lkeys: string[]): string {
                Util.assert(code.length > 0);
                var n: number;
                var s: string;
                if (code[0] === '+') {
                    n = Number(code.substr(1));
                    Util.assert(n !== undefined);
                    s = lkeys.pop();
                    this.map[n] = s;
                    this.hash[s] = n;
                }
                else {
                    n = Number(code);
                    Util.assert(n !== undefined);
                    s = this.map[n];
                    Util.assert(s !== undefined);
                }
                return s;
            }

            public OutBound(s: string, lkeys: string[]): string {
                var code:string;
                var key = <number> this.hash[s];
                if (key !== undefined) {
                    code = key.toString();
                }
                else {
                    code = "+" + (--this.localcount).toString();
                    this.map[this.localcount] = s;
                    this.hash[s] = this.localcount;
                    lkeys.push(s);
                }
                return code;
            }
        }

        export class Parser {

            // instances are used for parsing
            public text: string;
            public pos: number;
            constructor(text?: string, pos?: number) {
                this.text = text;
                this.pos = pos;
            }

            // definitions

            public static DOMAIN_BUILTIN: number = 0;
            public static DOMAIN_STATIC: number = 1;
            public static DOMAIN_DYNAMIC: number = 2;

            public static MakeDomain(name: string, type: number, components: string[]): string {
                var s = Parser.WriteDefinitionString(name);
                if (type !== Parser.DOMAIN_BUILTIN) {
                    s += (type === Parser.DOMAIN_DYNAMIC ? "(" : "[");
                    s += components.join(",");
                    s += (type === Parser.DOMAIN_DYNAMIC ? ")" : "]");
                }
                return s;
            }

            public static MakeProperty(name: string, domain: string, codomain: string): string {
                return Parser.WriteDefinitionString(name) + "," + codomain + "[" + domain + "]";
            }

            /*
            public ParsePropertyDefinition() {
                var name = this.ParseDefinitionString();
                Util.assert(this.text.charAt(this.pos) === ".");
                this.pos += 1;
                var codomain = this.ParseDefinitionString();
                var type = CloudTypes.DOMAIN_BUILTIN;
                var components = new Array<string>();
                if (this.text.charAt(this.pos) === "[") {
                    type = CloudTypes.DOMAIN_STATIC;
                    this.pos += 1;
                    while (this.pos < this.text.length && this.text.charAt(this.pos) !== "]") {

                    }
                }
                else if (this.text.charAt(this.pos) === "(") {
                    type = CloudTypes.DOMAIN_DYNAMIC;
                }  }
            */



            // targets and packets

            public static MakeKeyString(ukeys: string[], lkeys: string[]): string {
                var s = "";
                ukeys.forEach((uid: string) => {
                    s = s + "|" + uid;
                });
                lkeys.forEach((lit: string) => {
                    s = s + "|+" + Parser.WriteComboString(lit);
                });
                return s;
            }



            public ParseKeyString(ukeys: string[], lkeys: string[]) {
                var c = this.ParseComboComponents();
                for (var i = 0; i < c.length; i++) {
                    var s = c[i];
                    if (s.charAt(0) === "+")
                        lkeys.push(s.slice(1));
                    else
                        ukeys.push(s);
                }
            }
            public ParseComboComponents(): string[] {
                var result = new Array<string>();
                while (this.pos < this.text.length) {
                    result.push(this.ParseComboString());
                    this.pos++;
                }
                return result;
            }

            // escaping for definitions and targets

            public DefinitionEscapeChar = '$';
            public DefinitionMetaCharacters = "([,])";
            public ComboEscapeChar = '@';
            public ComboMetaCharacters = "|";

            public static WriteDefinitionString(s: string): string {
                var regexp = /[\$\(\[.\]\)]/g;
                return s.replace(regexp, '$$$&');
            }
            public static WriteComboString(s: string): string {
                var regexp = /[@\|]/g;
                return s.replace(regexp, '@$&');
            }
            /*
       public static ReadDefinitionString(s: string): string
       {
           var regexp = /\$(.)/g;
           return s.replace(regexp, '$1');
       }
       public static ReadComboString(s: string): string
       {
           var regexp = /\@(.)/g;
           return s.replace(regexp, '$1');
       } */

            public ParseDefinitionString(): string { return this.ParseString(this.DefinitionEscapeChar, this.DefinitionMetaCharacters); }
            public ParseComboString(): string { return this.ParseString(this.ComboEscapeChar, this.ComboMetaCharacters); }

            public ParseString(escapechar: string, metachars: string): string {
                var result = "";
                while (this.pos < this.text.length) {
                    var c = this.text.charAt(this.pos);
                    this.pos += 1;
                    if (c === escapechar) {
                        result = result + (this.text.charAt(this.pos) || escapechar);
                        this.pos += 1;
                    }
                    else if (metachars.indexOf(c) != -1) {
                        this.pos -= 1;
                        return result;
                    }
                    else {
                        result = result + c;
                    }
                }
                return result;
            }


            }



            }



}
