///<reference path='refs.ts'/>

module TDev {
    export module RT {

        export class RecordEntry
            extends RTValue {
            // lists the names for fields
            public keys: string[];
            public values: string[];
            public fields: string[];

            public parent: RecordSingleton;
            constructor() {
                super()
        }
            public rtType(): string { return this.parent.rtType() + "$entry"; }
            public noMagicRtType() { return true; }

            public equals(other: RecordEntry) {  // overridden for cloud things which may alias after deletion
                return this === other;
            }


            public isDeleted: boolean;
            public invalidate() {
                this.isDeleted = true;
                this.clear_fields();
                this.decorators = undefined;
            }


            public getShortStringRepresentation(): string {
                return "[" + this.parent.entryKindName + "]";
            }


            public post_to_wall(frame: IStackFrame): void {
                frame.rt.postBoxedHtml(this.parent.getTable([this], frame), frame.pc);
            }

            public to_json(s: IStackFrame): JsonObject {
                var ctx = new JsonExportCtx(s);
                ctx.push(this);
                var json = this.exportJson(ctx);
                ctx.pop(this);
                return JsonObject.wrap(json);
            }

            public from_json(jobj: JsonObject, s: IStackFrame): void {
                this.parent.logMutation(s);
                this.importJsonFields(new JsonImportCtx(s), jobj.value());
            }

            public importJsonFields(ctx: JsonImportCtx, jobj: JsonObject) {
                Util.oops("compiled code is supposed to override this method");
            }

            public jsonExportKey(ctx: JsonExportCtx) {
                return null; // overridden by table entries
            }

          //  public importJson(ctx: JsonImportCtx, jobj: JsonObject) {
         //       return this.importJsonFields(ctx, jobj);
          //  }

            public exportJson(ctx: JsonExportCtx): any {
                if (this.is_deleted())
                    return undefined;
                var keys = this.fields.map((k: string) => this[k + "_realname"]);
                var vals = this.fields.map((k: string) => this.getFieldValue(k, ctx.stackframe));
                return ctx.encodeObjectNode(this, keys, vals);
            }

            public getIndexCard(sf:IStackFrame): HTMLElement {
                var div: HTMLElement = document.createElement("div");
                div.className = "wall-record";

                var hr: HTMLElement = document.createElement("h3");
                hr.textContent = this.parent.entryKindName;
                hr.className = "wall-record";
                div.appendChild(hr);

                if (this.is_deleted()) {
                    var p: HTMLElement = document.createElement("p");
                    p.className = "wall-record";
                    p.textContent = "(deleted)";
                    div.appendChild(p);
                }
                else {
                    var ul: HTMLElement = document.createElement("ul");
                    ul.className = "wall-record";
                    this.fields.forEach((k: string) => {
                        var name = this[k + "_realname"];
                        var val = this.getFieldValue(k, sf);
                        var s = name + ": ";
                        if (val instanceof RTValue)
                            s = s + (<RTValue> val).getShortStringRepresentation();
                        else if (typeof val !== "undefined")
                            s = s + val;

                        var li: HTMLElement = document.createElement("li");
                        li.className = "wall-record";
                        li.textContent = s;
                        ul.appendChild(li);
                    });
                    div.appendChild(ul);
                }
                return div;
            }

            public debuggerDisplay(clickHandler: () => any): HTMLElement {
                var full: HTMLElement;
                try {
                    full = this.getIndexCard(null);
                } catch (e) {
                    return span(null, e.message || "").withClick(clickHandler); // can be a "user error" when record originated from stale session
                }
                var sized = div("wall-record", this.parent.entryKindName);

                var fullDisplay = false;
                var updateButton = () => {
                    full.style.display = fullDisplay ? "block" : "none";
                    sized.style.display = fullDisplay ? "none" : "block";
                };
                updateButton();

                return div(null, sized, full).withClick(() => {
                    clickHandler();
                    updateButton();
                    fullDisplay = !fullDisplay;
                });
            }

            public debuggerChildren(): any {
                if (this.is_deleted()) return undefined;

                var r = {};
                this.fields.forEach((k: string) => {
                    var val = this.getFieldValue(k, undefined);
                    r[ this[k + "_realname"] ] = val;
                });
                return r;
            }

            public getFieldValue(fieldname: string, sf:IStackFrame): any {
                return this[fieldname];
            }

            public getTableHeader(): HTMLElement {
                var tr: HTMLElement = document.createElement("tr");
                this.fields.forEach((k: string) => {
                    var th: HTMLElement = document.createElement("th");
                    th.setAttribute("scope", "col");
                    th.textContent = this[k + "_realname"];
                    tr.appendChild(th);
                });
                return tr;
            }
            public getTableRow(sf: IStackFrame): HTMLElement {
                var tr: HTMLElement = document.createElement("tr");
                this.fields.forEach((k: string) => {
                    var td: HTMLElement = document.createElement("td");
                    var val = this.getFieldValue(k, sf);
                    td.textContent = (val instanceof RTValue) ? (<RTValue> val).getShortStringRepresentation()
                    : ((typeof val === "undefined") ? "" : val);
                    tr.appendChild(td);
                });
                return tr;
            }

            //static check_invalid(ref: RecordEntry): boolean {
            //    return (!ref) ? true : ref.is_deleted();
            //}


            // overridden by persistent records
            public clear_fields(s?:IStackFrame) {
                if (s) this.parent.logMutation(s);
                this.values.forEach((k: string) => {
                    //this[k] = undefined;  does not work... masks default value in prototype
                    delete this[k];
                })
        }

            // overridden by index and table
            public is_deleted(): boolean { return false; }
            // overridden by cloud persisted things
            public confirmed(): boolean { return true; }

            public perform_get(fieldname: string, s: IStackFrame): RTValue { return Util.abstract(); }
            public perform_set(fieldname: string, value: RTValue, s: IStackFrame) { return Util.abstract(); }
            public perform_confirmed(fieldname: string, s: IStackFrame): boolean { return true; } // overridden for cloud records
            public perform_test_and_set(fieldname: string, value: RTValue, s: IStackFrame) { return Util.abstract(); }
            public perform_add(fieldname: string, value: RTValue, s: IStackFrame) { return Util.abstract(); }
            public perform_clear(fieldname: string, s: IStackFrame) { return Util.abstract(); }
        }

        export class TableEntry
            extends RecordEntry {
            public rownumber: number;

            public toJsonKey(): any {
                return this.rownumber;
            }

            public jsonExportKey(ctx: JsonExportCtx) {
                return this.rownumber.toString();
            }


            constructor() {
                super()
            }

            public getShortStringRepresentation(): string {
                return "[" + this.parent.entryKindName + this.rownumber + "]";
            }


            public delete_row(s:IStackFrame) {
                this.parent.logMutation(s);
                if (this.isDeleted) return;
                var idx = (<TableSingleton> this.parent)._elements.indexOf(this);
                if (idx >= 0)
                    (<TableSingleton> this.parent)._elements.splice(idx, 1);
                this.invalidate();
                (<TableSingleton> this.parent).clearCachedData();

            }

            public perform_get(fieldname: string, s: IStackFrame): RTValue {
                this.is_deleted();
                return this[fieldname];
            }
            public perform_set(fieldname: string, value: RTValue, s: IStackFrame) {
                this.parent.logMutation(s);
                if (!this.isDeleted) {
                    if (value == undefined) // or null
                        delete this[fieldname];
                    else
                        this[fieldname] = value;
                }
            }
            public perform_add(fieldname: string, value: RTValue, s: IStackFrame) {
                this.parent.logMutation(s);
                if (!this.isDeleted && value)
                    this[fieldname] += value;
            }
            public perform_clear(fieldname: string, s: IStackFrame) {
                this.parent.logMutation(s);
                if (!this.isDeleted)
                    delete this[fieldname];
            }
            public perform_test_and_set(fieldname: string, value: RTValue, s: IStackFrame) {
                this.parent.logMutation(s);
                if (!this.isDeleted && !this[fieldname] && value)
                    this[fieldname] = value;
            }

            public is_deleted(): boolean {
                if (this.isDeleted)
                    return true;
                var deleted = false;
                if (this.keys.length > 0) {
                    this.keys.forEach((k: string) => {
                        if (deleted)
                            return;
                        var key = this[k];
                        if (((key instanceof TableEntry) && (<TableEntry> key).is_deleted())
                            || ((key instanceof CloudTableEntry) && (<CloudTableEntry> key).is_deleted()))
                            deleted = true;
                    });
                }
                if (deleted && !this.isDeleted) {
                    this.invalidate();
                }
                return deleted;
            }

            public keyCompareTo(other: any): number {
                return this.rownumber - (<TableEntry> other).rownumber;
            }


        }

        export class CloudTableEntry
            extends RecordEntry {
            // serialized fields
            public sessionname: string;
            public uid: string;

            public toJsonKey(): any {
                return this.sessionname + this.uid;
            }

            public equals(other: RecordEntry) {
                var o = <CloudTableEntry> other;
                return this.uid === o.uid && this.sessionname === o.sessionname;
            }

            constructor() {
                super()
            }

            public getShortStringRepresentation(): string {
                return "[" + this.parent.entryKindName + ": " + this.uid + "]";
            }

            // handle
            public item: Revisions.Item;

            // link this table entry with the session item
            public hookup(item: Revisions.Item) {
                this.sessionname = item.session.servername;
                this.uid = item.uid;
                this.item = item;
                item.backlink = this;
                this.read_cloud_fields(item);
            }

            public unlink() {
                this.decorators = undefined;
                this.item = undefined;
                for (var i = 0; i < this.values.length; i++) {
                    this[this.values[i]] = undefined;
                }
            }

            public getFieldValue(fieldname: string, s:IStackFrame): any {
                this.check();
                var f = this[fieldname];
                if (f instanceof Revisions.LVal)
                    return Conv.read(this.parent.session(), <Revisions.LVal>f, s);
                else
                    return f;
            }


            public check(abort = true): boolean {
                //Util.log("check: session status: " + TDev.RT.CloudData.connection_status(true));
                if (this.sessionname !== this.parent.session().servername) {
                    if (abort)
                        Util.userError(lf("stale row: originated in a different session"));
                    else
                        return false;
                }
                if (this.item === undefined || this.item.backlink != this || this.item.session !== this.parent.session()) {
                    //console.log("check: hookup: " + this.uid);
                    var session = this.parent.session();
                    var item = session.user_get_item(this.uid);
                    if (item === undefined)
                        item = session.user_create_tombstone(this.parent.cloudtype, this.uid, this.keys.map(k => undefined), []);
                    this.hookup(item);
                }
                return true;
            }

            public confirmed(): boolean {
                this.check();
                var session = this.parent.session();
                var confirmed = this.existenceConfirmed()
                    && !this.values.some((val) => !session.user_is_datum_confirmed(this[val]));
                return confirmed;
            }

            public existenceConfirmed(): boolean {
                return this.parent.session().user_is_datum_confirmed(this.item) &&
                    !this.keys.some((key) => {
                        var r = this[key];
                        return (r && r instanceof CloudTableEntry && !(<CloudTableEntry>r).existenceConfirmed());
                    });
            }

            public jsonExportKey(ctx: JsonExportCtx) {
                this.check();
                var uid = this.uid;
                if (uid.indexOf(".") === -1) {
                    var membernumber = this.parent.session().membernumber.toString();
                    if (membernumber === "-1")
                        membernumber = "";
                    uid = membernumber + "." + uid;
                }
                return uid;
            }

            public delete_row(s?:IStackFrame) {
                if (s) this.parent.logMutation(s);
                this.check();
                this.parent.session().user_delete_item(this.item);
                (<CloudTableSingleton> this.parent).clearCachedData();
            }


            public clear_fields(s?: IStackFrame) {
                if (s) this.parent.logMutation(s);
                this.check();
                for (var i = 0; i < this.values.length; i++) {
                    var lval: Revisions.LVal = this[this.values[i]];
                    Conv.clear(this.parent.session(), lval);
                }
            }


            public perform_get(fieldname: string, s: IStackFrame): RTValue {
                this.check();
                return Conv.read(this.parent.session(), this[fieldname], s);
            }
            public perform_confirmed(fieldname: string): boolean {
                this.check();
                return this.parent.session().user_is_datum_confirmed(this[fieldname]);
            }
            public perform_set(fieldname: string, value: RTValue, s: IStackFrame) {
                this.parent.logMutation(s);
                this.check();
                Conv.modify(this.parent.session(), this[fieldname], value, false);
            }
            public perform_test_and_set(fieldname: string, value: RTValue, s: IStackFrame) {
                this.parent.logMutation(s);
                this.check();
                Conv.modify(this.parent.session(), this[fieldname], value, true);
            }
            public perform_add(fieldname: string, value: RTValue, s: IStackFrame) {
                this.parent.logMutation(s);
                this.check();
                Conv.modify(this.parent.session(), this[fieldname], value, true);
            }
            public perform_clear(fieldname: string, s: IStackFrame) {
                this.parent.logMutation(s);
                this.check();
                Conv.modify(this.parent.session(), this[fieldname], undefined, false);
            }

            public is_deleted(): boolean {
                if (!this.check())
                    return true;
                return this.parent.session().user_is_datum_deleted(this.item);
            }

            public keyCompareTo(other: any): number {
                return this.item.compareTo(other.item);
            }

            //set up keys
            public read_cloud_fields(datum: Revisions.Datum) {
                // setup keys
                var lkeycount = 0;
                var ukeycount = 0;
                Util.assert(this.parent.key_cloudtypes.length === this.keys.length);
                for (var i = 0; i < this.keys.length; i++) {
                    var keytype = this.parent.key_cloudtypes[i];
                    var val: any;
                    if (keytype.charAt(keytype.length - 1) === ")") {
                        // row key
                        var uid = datum.ukeys[ukeycount];
                        var linkedtable = this.parent.linked_cloudtables[ukeycount];
                        val = linkedtable.import_item_from_uid(uid);
                        ukeycount += 1;
                    } else {
                        // literal key
                        val = Conv.fromCloud(keytype, datum.lkeys[lkeycount]);
                        lkeycount += 1;
                    }
                    this[this.keys[i]] = val;
                }
                //set up lvals
                Util.assert(this.parent.value_cloudtypes.length === this.values.length);
                for (var i = 0; i < this.values.length; i++) {
                    var property = this.parent.value_cloudtypes[i];
                    this[this.values[i]] = this.parent.session().user_get_lval(property, [this.uid], []);
                }
            }
        }

        export class IndexEntry
            extends RecordEntry {
            constructor() {
                super()
        }
            public compareTo(other: IndexEntry): number {
                var diff = 0;
                this.keys.forEach((k: string): void => {
                    if (!diff) {
                        var a = this[k];
                        var b = other[k];
                        switch (typeof a) {
                            case "string":
                                diff = a.localeCompare(b);
                                break;
                            case "number":
                                diff = a - b;
                                break;
                            case "boolean":
                                if (a !== b)
                                    diff = (a ? 1 : -1);
                                break;
                            default:
                                diff = RTValue.CompareKeys(a, b);
                                break;
                        }
                    }
                });
                return diff;
            }

            public is_deleted(): boolean {
                if (this.isDeleted)
                    return true;
                var deleted = false;
                if (this.keys.length > 0) {
                    this.keys.forEach((k: string) => {
                        if (deleted)
                            return;
                        var key = this[k];
                        if (key && key instanceof TableEntry) {
                            if ((<TableEntry> key).is_deleted())
                                deleted = true;
                        }
                    });
                }
                if (deleted && !this.isDeleted) {
                    this.invalidate();
                }
                return deleted;
            }


            public isDeleted = false;

            public perform_get(fieldname: string, s: IStackFrame): RTValue {
                this.is_deleted();
                return this[fieldname];
            }
            public perform_set(fieldname: string, value: RTValue, s: IStackFrame) {
                this.parent.logMutation(s);
                if (!this.isDeleted) {
                    if (value == undefined) // or null
                        delete this[fieldname];
                    else
                        this[fieldname] = value;
                }
            }
            public perform_add(fieldname: string, value: RTValue, s: IStackFrame) {
                this.parent.logMutation(s);
                if (!this.isDeleted && value)
                    this[fieldname] += value;
            }
            public perform_clear(fieldname: string, s: IStackFrame) {
                this.parent.logMutation(s);
                if (!this.isDeleted)
                    delete this[fieldname];
            }
            public perform_test_and_set(fieldname: string, value: RTValue, s: IStackFrame) {
                this.parent.logMutation(s);
                if (!this.isDeleted && !this[fieldname] && value)
                    this[fieldname] = value;
            }

            public hasNondefaultValue(): boolean {
                var found = false;
                this.values.forEach((v: string) => {
                    if (found)
                        return;
                    var val = this[v];
                    if (val) {
                        if (typeof val !== "object")
                            found = true;
                        else {
                            Util.assert(val instanceof RTValue);
                            found = !val.isDefaultValue();
                        }
                    }
                });
                return found;
            }
        }

        export class ObjectEntry
            extends RecordEntry {
            constructor() {
                super()
            }

            public on_render_heap = false;


            public perform_get(fieldname: string, s: IStackFrame): RTValue {
                return this[fieldname];
            }
            public perform_set(fieldname: string, value: RTValue, s: IStackFrame) {
                s.rt.logDataWrite(this.on_render_heap);
                //if (value === undefined)
                //    delete this[fieldname]
                //else
                this[fieldname] = value;
            }
            public perform_add(fieldname: string, value: RTValue, s: IStackFrame) {
                s.rt.logDataWrite(this.on_render_heap);
                if (value)
                    this[fieldname] += value;
            }
            public perform_clear(fieldname: string, s: IStackFrame) {
                s.rt.logDataWrite(this.on_render_heap);
                delete this[fieldname];
            }
            public perform_test_and_set(fieldname: string, value: RTValue, s: IStackFrame) {
                s.rt.logDataWrite(this.on_render_heap);
                if (!this[fieldname] && value)
                    this[fieldname] = value;
            }

        }

        export class DecoratorEntry
            extends RecordEntry {

            public _written = 0;
            constructor() {
                super()
        }
            public post_to_wall(frame: IStackFrame): void {
                this.clear_if_necessary();
                super.post_to_wall(frame);
            }

            private clear_if_necessary() {
                var decsing = <DecoratorSingleton> this.parent;
                if (this._written < decsing._generation) {
                    this._written = decsing._generation;
                    this.clear_fields();
                }
            }

            private target(): RTValue {
                return this[this.keys[0]];
            }

            public perform_get(fieldname: string, s:IStackFrame): RTValue {
                this.clear_if_necessary();
                return this[fieldname];
            }
            public perform_set(fieldname: string, value: RTValue, s: IStackFrame) {
                s.rt.logDataWrite(this.target().on_render_heap);
                this.clear_if_necessary();
                //if (value === undefined)
                //    delete this[fieldname];
                //else
                this[fieldname] = value;
            }
            public perform_add(fieldname: string, value: RTValue, s: IStackFrame) {
                s.rt.logDataWrite(this.target().on_render_heap);
                this.clear_if_necessary();
                if (value)
                    this[fieldname] += value;
            }
            public perform_clear(fieldname: string, s: IStackFrame) {
                s.rt.logDataWrite(this.target().on_render_heap);
                this.clear_if_necessary();
                delete this[fieldname];
            }
            public perform_test_and_set(fieldname: string, value: RTValue, s: IStackFrame) {
                s.rt.logDataWrite(this.target().on_render_heap);
                this.clear_if_necessary();
                if (!this[fieldname] && value)
                    this[fieldname] = value;
            }

        }


        export class RecordSingleton
            extends RTValue {
            constructor() {
                super()
            }
            public rtType(): string { return this.libName + "$" + this.stableName; }
            public entryCtor: (par: RecordSingleton) => RecordEntry;
            public selfCtor: (ln: string) => RecordSingleton;
            public stableName: string;
            public cloudtype: string;
            public key_cloudtypes: string[];
            public value_cloudtypes: string[];
            public linked_cloudtables: CloudTableSingleton[];
            public localsession: boolean;
            public libName: any;
            public onChangeEvent: RT.Event_;
            public entryKindName: string;
            public noMagicRtType() { return true; }
            public initParent() { }
            public isSerializable() { return true; }

            public session(): Revisions.ClientSession {
                var s = (this.localsession) ? Runtime.theRuntime.sessions.getLocalSession() : Runtime.theRuntime.sessions.getCurrentSession();
                if (!s)
                    Util.oops("missing " + (this.localsession ? "local" : "cloud") + " session, " + this.stableName);
                return s;
            }

            public create_collection(s: IStackFrame): Collection<RecordEntry> {
                var o = Collection.fromArray<RecordEntry>([], this)
                o.on_render_heap = s.rt.rendermode;
                return o;
            }

            public copy_to_collection(s: IStackFrame): Collection<RecordEntry> {
                var o = this.create_collection(s);
                o.a.pushRange(this.get_enumerator());
                return o;
            }

            // returns only entries by this user
            // used by indexes whose first key is of type User
            public my_entries(s: IStackFrame): Collection<RecordEntry> {
                var o = this.create_collection(s);
                var userid = Cloud.getUserId();
                if (userid === undefined)
                    return undefined;
                o.a.pushRange(this.get_enumerator().filter((e) => {
                    var u = e[e.keys[0]];
                    return u._id === userid;
                }));
                return o;
            }


            // returns entries linked to the given rows
            // used by tables with links
            public entries_linked_to(): Collection<RecordEntry> {
                var supplied = arguments;
                var o = this.create_collection(arguments[arguments.length - 1]);
                o.a.pushRange(this.get_enumerator().filter((e) => {
                    for (var i = 0; i < e.keys.length; i++)
                        if (e[e.keys[i]] !== supplied[i])
                            return false;
                    return true;
                }));
                return o;
            }


            public on_changed(perform: Action, s: IStackFrame): EventBinding {
                if (!this.onChangeEvent)
                    this.onChangeEvent = new RT.Event_();
                var b = this.onChangeEvent.addHandler(perform);
                s.rt.queueLocalEvent(this.onChangeEvent, undefined, true, true);
                return b;
            }

            public logMutation(s: IStackFrame) {
                s.rt.logDataWrite(false);
                if (this.onChangeEvent)
                    s.rt.queueLocalEvent(this.onChangeEvent, undefined, true, true);
            }

            public wait_for_update(r: ResumeCtx)
            {
                if (!this.onChangeEvent)
                    this.onChangeEvent = new RT.Event_();
                this.onChangeEvent.addAwaiter(v => {
                    r.resume()
                })
            }


            public getTable(entries: RecordEntry[], sf: IStackFrame): HTMLElement {
                var tab: HTMLElement = document.createElement("table");
                tab.className = "wall-table";
                //tab.setAttribute("summary", "TODO:table summary");

                //var caption: HTMLElement = document.createElement("caption");
                //caption.textContent = "TODO: caption";
                //tab.appendChild(caption);

                // create dummy elt to access names
                if (entries.length === 0) {
                    var tr: HTMLElement = document.createElement("tr");
                    var td: HTMLElement = document.createElement("td");
                    tr.textContent = "(empty table)"
                tr.appendChild(td);
                    tab.appendChild(tr);
                } else {
                    tab.appendChild(entries[0].getTableHeader());
                    entries.forEach((e: TableEntry) => tab.appendChild(e.getTableRow(sf)));
                }
                return tab;
            }

            public debuggerDisplay(_): HTMLElement {
                return null;
            }

            public invalid_row() {
                return undefined;
            }
            public invalid() {
                return undefined;
            }

            public get_enumerator(): RecordEntry[] { // overridden by index and table
                Util.oops("not implemented: enumerator");
                return [];
            }

            public exportJson(ctx: JsonExportCtx): any {
                var entries = this.get_enumerator();
                return ctx.encodeArrayNode(this, entries.slice(0));
            }

            public to_json(s: IStackFrame): JsonObject {
                var ctx = new JsonExportCtx(s);
                ctx.push(this);
                var json = this.exportJson(ctx);
                ctx.pop(this);
                return JsonObject.wrap(json);
            }

            public prune_to(entries: RecordEntry[]) {
                Util.oops("must be overridden by index and table");
            }

            public from_json(jobj: JsonObject, s: IStackFrame): void {
                this.logMutation(s);
                var ctx = new JsonImportCtx(s);
                var json = jobj.value();
                this.importJsonTableOrIndex(ctx, json);
            }

            public importJsonTableOrIndex(ctx: JsonImportCtx, json: any) {
                if (typeof json !== "object")
                    return;
                if (Array.isArray(json)) {
                    // import individual elements, delaying recursion
                    var elts = (<any[]> json).map(jsonelt => this.importJsonRecord(ctx, undefined, jsonelt, true));
                    // then go over it again and do the actual recursion
                    for (var i = 0; i < elts.length; i++)
                        elts[i].importJsonFields(ctx, json[i]);
                    // finally, prune to what was imported
                    this.prune_to(elts);
                }
                else {
                    // import a single entry
                    this.importJsonRecord(ctx, undefined, json, false);
                }
            }

            public jsonExportKey(ctx: JsonExportCtx) {
                return null; // overridden by table entries
            }


            public importJsonKeys(ctx: JsonImportCtx, jobj: JsonObject) {
                // overridden by compiled code for tables and indexes
                return [];
            }
            public findImportTarget(ctx: JsonImportCtx, id:string, target:RecordEntry, json:any): any {
                Util.oops("subclasses are supposed to override this method");
                return null;
            }

            public importJsonRecord(ctx: JsonImportCtx, target: RecordEntry, json: any, delayrecursion: boolean): RecordEntry {

                this.logMutation(ctx.s);

                var id: string;

                // find the id if present
                if (typeof (json) === "string") {
                    id = ctx.map(this.stableName, json);
                } else if (typeof (json) !== "object" || Array.isArray(json)) {
                    return undefined;
                } else {
                    id = ctx.map(this.stableName, json["⌹id"]);
                }

                // find or construct the correct target
                target = this.findImportTarget(ctx, id, target, json);

                // do the actual importing
                if (target) {
                    if (!delayrecursion)
                        target.importJsonFields(ctx, json);
                    if (id)
                        ctx.addmapping(this.stableName, id, target.jsonExportKey(undefined));
                }

                return target;
            }



        }

        export class TableSingleton
            extends RecordSingleton {

            public row_counter = 0;
            public _elements: TableEntry[];

            constructor() {
                super()
        }
            public initParent() {
                this._elements = [];
            }

            public next_row_number() {
                this.row_counter = this.row_counter + 1;
                return this.row_counter;
            }

            public add_row(s: IStackFrame): TableEntry {
                return this.constructrow(arguments);
            }

            public constructrow(args: IArguments) {
                this.clearCachedData();

                var ent = <TableEntry> new (<any>this.entryCtor)(this);
                ent.rownumber = this.next_row_number();
                this._elements.push(ent);

                Util.assert(args.length == ent.keys.length + 1); // last arg is stackframe
                this.logMutation(args[args.length - 1]);
                for (var i = 0; i < ent.keys.length; ++i)
                    ent[ent.keys[i]] = args[i];

                return ent;
            }

            public row_at(index: number): TableEntry {
                this.cacheItems();
                return this.cacheditems[Math.floor(index)];
            }


            public count() {
                this.cacheItems();
                return this.cacheditems.length;
            }
            public clear(s: IStackFrame) {
                this.logMutation(s);
                this.clearCachedData();
                this._elements.forEach((e) => { e.invalidate(); });
                this._elements = [];
            }

            public prune_to(entries: RecordEntry[]) {
                this._elements = <TableEntry[]>entries;
            }

            public findImportTarget(ctx: JsonImportCtx, id: string, target: RecordEntry, json:any): any {
                if (id && (!target || target.jsonExportKey(undefined) !== id)) {
                    target = undefined;
                    this._elements.forEach((e: TableEntry) => {  //SEBTODO binary search
                        if (e.jsonExportKey(undefined) === id)
                            target = e;
                    });
                }
                if (target && target.is_deleted())
                    target = undefined;
                if (!target && (typeof (json) !== "string")) {
                    var keys = this.importJsonKeys(ctx, json);
                    keys.push(ctx.s);
                    target = this.constructrow(<any> keys);
                }
                return target;
            }


            private cacheditems: TableEntry[];
            private dependentcaches = [];
            private cacheItems() {
                if (this.cacheditems === undefined) {
                    this.cacheditems = this._elements.filter((val: TableEntry) => !val.is_deleted());
                    if (this.cacheditems.length > 0) {
                        var e = this.cacheditems[0];
                        if (e.keys.length > 0) {
                            e.keys.forEach((k: string) => {
                                var key = e[k];
                                Util.assert(key instanceof TableEntry || key instanceof CloudTableEntry);
                                (<any> key.parent).dependentcaches[this.stableName] = this;
                            });
                        }
                    }
                }
            }
            public clearCachedData(): void {
                this.cacheditems = undefined;
                for (var l in this.dependentcaches) {
                    if (this.dependentcaches.hasOwnProperty(l))
                        this.dependentcaches[l].clearCachedData();
                }
            }

            public get_enumerator(): RecordEntry[] {
                this.cacheItems();
                return this.cacheditems;
            }


            public post_to_wall(s: IStackFrame): void {
                s.rt.postBoxedHtml(this.getTable(this.get_enumerator(), s), s.pc);
            }

        }



        export class CloudTableSingleton
            extends RecordSingleton implements TDev.Revisions.IDataCache {

            constructor() {
                super()
            }

            public add_row(s: IStackFrame): CloudTableEntry {
                return this.constructrow(arguments);
            }

            public constructrow(args: IArguments) {



                this.clearCachedData();
                var ent = <CloudTableEntry> new (<any>this.entryCtor)(this);

                Util.assert(args.length == ent.keys.length + 1); // last argument is stackframe
                this.logMutation(args[args.length-1]);
                var links = new Array<string>();
                for (var i = 0; i < ent.keys.length; ++i) {
                    var x = <CloudTableEntry>args[i];
                    var correctsession = x.check(false);
                    if (!correctsession)
                        Util.userError(lf("invalid link argument: originated in a different session"));
                    links.push(x.uid);
                    ent[ent.keys[i]] = x;
                }
                ent.hookup(this.session().user_create_item(this.cloudtype, links, []));
                return ent;
            }


            public prune_to(entries: RecordEntry[]) {
                var map = {};
                entries.forEach(e => map[(<CloudTableEntry>e).uid] = true);
                this.get_enumerator().forEach(r => map[(<CloudTableEntry> r).uid] ? undefined: (<CloudTableEntry> r).delete_row());
            }


            public import_item(item: Revisions.Item): CloudTableEntry {
                if (item.backlink !== undefined)
                    return <CloudTableEntry>(item.backlink);
                else {
                    var ent = <CloudTableEntry> new (<any>this.entryCtor)(this);
                    ent.hookup(item);
                    return ent;
                }
            }

            public import_item_from_uid(uid: string, def?: string): CloudTableEntry {
                if (!uid)
                    return undefined;
                var session = this.session();
                var item = session.user_get_item(uid);
                if (def && (!item || item.definition !== def))
                    return undefined; // import situation: make no effort
                if (item === undefined)
                    item = session.user_create_tombstone(this.cloudtype, uid, this.key_cloudtypes.map(k => undefined), []);
                return this.import_item(item);
            }

            public fromRest(json: any) {
                return this.import_item_from_uid(json["⌹id"]);
            }

            private cacheditems: TDev.Revisions.Item[];
            private dependentcaches = [];
            private cacheItems() {
                if (this.cacheditems === undefined) {
                    var session = this.session();
                    this.cacheditems = session.user_get_items_in_domain(this.cloudtype).sort((a, b) => a.compareTo(b));
                    this.linked_cloudtables.forEach((t) => t.dependentcaches[this.stableName] = this);
                    Runtime.theRuntime.sessions.registerDataCache(this.stableName, this);
                }
            }
            public clearCachedData(): void {
                this.cacheditems = undefined;
                this.linked_cloudtables.forEach((t) => delete t.dependentcaches[this.stableName]);
                Runtime.theRuntime.sessions.unregisterDataCache(this.stableName);
                for (var l in this.dependentcaches) {
                    if (this.dependentcaches.hasOwnProperty(l))
                        this.dependentcaches[l].clearCachedData();
                }
            }

            public count() {
                this.cacheItems();
                return this.cacheditems.length;
            }

            public row_at(index: number): CloudTableEntry {
                this.cacheItems();
                var item = this.cacheditems[Math.floor(index)];
                return item ? this.import_item(item) : undefined;
            }

            public clear() {
                this.cacheItems();
                this.cacheditems.forEach(item => this.session().user_delete_item(item));
                this.clearCachedData();
            }

            public get_enumerator(): RecordEntry[] {
                this.cacheItems();
                var entries = this.cacheditems.map((i: Revisions.Item) => this.import_item(i));
                return entries;
            }


            public post_to_wall(frame: IStackFrame): void {
                frame.rt.postBoxedHtml(this.getTable(this.get_enumerator(), frame), frame.pc);
            }

            public findImportTarget(ctx: JsonImportCtx, id: string, t: RecordEntry, json: any): any {
                var target = <CloudTableEntry> t;
                if (id && (!target || target.jsonExportKey(undefined) !== id)) {
                    if (id[0] === ".")
                        id = id.slice(1);
                    target = this.import_item_from_uid(id, this.cloudtype);
                }
                if (target && target.is_deleted())
                    target = undefined;
                if (!target && (typeof (json) !== "string")) {
                    var keys = this.importJsonKeys(ctx, json);
                    keys.push(ctx.s);
                    target = this.constructrow(<any> keys);
                }
                return target;
            }

        }


        export class CloudIndexEntry
            extends RecordEntry {
            // serialized fields
            public sessionname: string;

            constructor() {
                super()
         }
            public equals(other: RecordEntry): boolean {
                var o = (<CloudIndexEntry>other);
                this.check();
                o.check();
                return (this.sessionname === o.sessionname) && (this.entry === o.entry);
            }

            public getShortStringRepresentation(): string {
                return "[" + this.parent.entryKindName + "]";
            }

            // handle
            public entry: Revisions.Entry;

            // link this table entry with the session item
            public hookup(entry: Revisions.Entry) {
                this.sessionname = entry.session.servername;
                this.entry = entry;
                entry.backlink = this;
                this.read_cloud_fields(entry);
            }

            public unlink() {
                this.decorators = undefined;
                this.entry = undefined;
                for (var i = 0; i < this.values.length; i++) {
                    this[this.values[i]] = undefined;
                }
            }


            public getFieldValue(fieldname: string, s:IStackFrame): any {
                this.check();
                var f = this[fieldname];
                if (f instanceof Revisions.LVal)
                    return Conv.read(this.parent.session(), <Revisions.LVal>f, s);
                else
                    return f;
            }

            public check(abort = true): boolean {
                if (this.sessionname !== this.parent.session().servername) {
                    if (abort)
                        Util.userError(lf("stale index entry: originated in a different session"));
                    else
                        return false;
                }
                if (typeof (this.entry) === "undefined" || this.entry.backlink != this || this.entry.session !== this.parent.session()) {
                    Util.assert(this.keys.length === this.parent.key_cloudtypes.length);
                    var ukeys = new Array<string>();
                    var lkeys = new Array<string>();
                    for (var i = 0; i < this.keys.length; i++) {
                        var cloudtype = this.parent.key_cloudtypes[i];
                        if (cloudtype.charAt(cloudtype.length - 1) === ')') {
                            // row key
                            var uid = (<CloudTableEntry>this[this.keys[i]]).uid;
                            ukeys.push(uid);
                        }
                        else {
                            // literal key
                            lkeys.push(Conv.toCloud(cloudtype, this[this.keys[i]], false));
                        }
                        this.hookup(this.parent.session().user_get_entry(this.parent.cloudtype, ukeys, lkeys));
                    }
                    return true;
                }
                return true;
            }


            public clear_fields(s?: IStackFrame) {
                if (s) this.parent.logMutation(s);
                this.check();
                for (var i = 0; i < this.values.length; i++) {
                    var lval = this[this.values[i]];
                    Conv.clear(this.parent.session(), lval);
                }
            }

            public confirmed(): boolean {
                this.check();
                var session = this.parent.session();
                var confirmed = this.dependenciesconfirmed && !this.values.some((val) => !session.user_is_datum_confirmed(this[val]));
                return confirmed;
            }

            public dependenciesconfirmed(): boolean {
                return !this.keys.some((key) => {
                    var r = this[key];
                    return (r && r instanceof CloudTableEntry && !(<CloudTableEntry>r).existenceConfirmed());
                });
            }

            public compareTo(other: CloudIndexEntry): number {
                this.check();
                other.check();
                var diff = 0;
                this.keys.forEach((k: string): void => {
                    if (!diff) {
                        var a = this[k];
                        var b = other[k];
                        switch (typeof a) {
                            case "string":
                                diff = a.localeCompare(b);
                                break;
                            case "number":
                                diff = a - b;
                                break;
                            case "boolean":
                                if (a !== b)
                                    diff = (a ? 1 : -1);
                                break;
                            default:
                                diff = RTValue.CompareKeys(a, b);
                                break;
                        }
                    }
                });
                return diff;
            }

            public is_deleted(): boolean {
                if (!this.check())
                    return true;
                return this.parent.session().user_is_datum_deleted(this.entry);
            }

            public perform_get(fieldname: string, s:IStackFrame): RTValue {
                this.check();
                return Conv.read(this.parent.session(), this[fieldname], s);
            }
            public perform_confirmed(fieldname: string): boolean {
                this.check();
                return this.parent.session().user_is_datum_confirmed(this[fieldname]);
            }
            public perform_set(fieldname: string, value: RTValue, s: IStackFrame) {
                this.parent.logMutation(s);
                this.check();
                Conv.modify(this.parent.session(), this[fieldname], value, false);
            }
            public perform_test_and_set(fieldname: string, value: RTValue, s: IStackFrame) {
                this.parent.logMutation(s);
                this.check();
                Conv.modify(this.parent.session(), this[fieldname], value, true);
            }
            public perform_add(fieldname: string, value: RTValue, s: IStackFrame) {
                this.parent.logMutation(s);
                this.check();
                Conv.modify(this.parent.session(), this[fieldname], value, true);
            }
            public perform_clear(fieldname: string, s: IStackFrame) {
                this.parent.logMutation(s);
                this.check();
                Conv.modify(this.parent.session(), this[fieldname], undefined, false);
            }


            //set up keys
            public read_cloud_fields(datum: Revisions.Datum) {
                // setup keys
                var ukeys = new Array<string>();
                var lkeys = new Array<string>();
                Util.assert(this.parent.key_cloudtypes.length === this.keys.length);
                for (var i = 0; i < this.keys.length; i++) {
                    var keytype = this.parent.key_cloudtypes[i];
                    var val: any;
                    if (keytype.charAt(keytype.length - 1) === ")") {
                        // row key
                        var uid = datum.ukeys[ukeys.length];
                        var linkedtable = this.parent.linked_cloudtables[ukeys.length];
                        val = linkedtable.import_item_from_uid(uid);
                        ukeys.push(uid);
                    } else {
                        // literal key
                        var lit = datum.lkeys[lkeys.length];
                        val = Conv.fromCloud(keytype, lit);
                        lkeys.push(lit);
                    }
                    this[this.keys[i]] = val;
                }
                //set up lvals
                Util.assert(this.parent.value_cloudtypes.length === this.values.length);
                for (var i = 0; i < this.values.length; i++) {
                    var property = this.parent.value_cloudtypes[i];
                    this[this.values[i]] = this.parent.session().user_get_lval(property, ukeys, lkeys);
                }
            }
        }

        export class PersistentVars {

            public names: string[];              // set by compiled code
            public cloudtypes: string[];
            public localsession: boolean;        // set by compiled code
            public libName: string;              // set by compiled code - the unique id of the library
            public sessions: Revisions.Sessions;

            public session: Revisions.ClientSession;

            constructor(public rt: Runtime) { this.sessions = rt.sessions; }

            public check() {
                if (!this.session || (!this.localsession && this.session !== this.sessions.getCurrentSession())) {
                    this.session = (this.localsession ? this.sessions.getLocalSession() : this.sessions.getCurrentSession());
                    var prefix = (this.libName === "this") ? "" : (this.libName + ".");
                    for (var i = 0; i < this.names.length; i++) {
                        var name = this.names[i];
                        var property = prefix + this.cloudtypes[i];
                        this[name] = this.session.user_get_lval(property, [], [])
                    }
                }
            }

            public perform_get(fieldname: string, s: IStackFrame): RTValue {
                this.check();
                return Conv.read(this.session, this[fieldname], s);
            }
            public perform_confirmed(fieldname: string): boolean {
                this.check();
                return this.session.user_is_datum_confirmed(this[fieldname]);
            }
            public perform_set(fieldname: string, value: RTValue, s: IStackFrame) {
                s.rt.logDataWrite(false);
                this.check();
                Conv.modify(this.session, this[fieldname], value, false);
            }
            public perform_test_and_set(fieldname: string, value: RTValue, s: IStackFrame) {
                s.rt.logDataWrite(false);
                this.check();
                Conv.modify(this.session, this[fieldname], value, true);
            }
            public perform_add(fieldname: string, value: RTValue, s: IStackFrame) {
                s.rt.logDataWrite(false);
                this.check();
                Conv.modify(this.session, this[fieldname], value, true);
            }
            public perform_clear(fieldname: string, s: IStackFrame) {
                s.rt.logDataWrite(false);
                this.check();
                Conv.modify(this.session, this[fieldname], undefined, false);
            }
        }

        export class CloudIndexSingleton
            extends RecordSingleton {
            constructor() {
                super()
         }

            public clear() {
                var session = this.session();
                var entries = session.user_get_entries_in_indexdomain(this.cloudtype);
                entries.forEach((e) => e.lvals.forEach((l) => Conv.clear(session, l)));
            }

            public count() { return this.session().user_get_entries_in_indexdomain(this.cloudtype).length; }

            public get_enumerator(): RecordEntry[] {
                var entries = this.session().user_get_entries_in_indexdomain(this.cloudtype);
                var x = entries.map((e: Revisions.Entry) => this.import_item(e));
                x.sort((a, b) => a.compareTo(b));
                return x;
            }

            public post_to_wall(frame: IStackFrame): void {
                frame.rt.postBoxedHtml(this.getTable(this.get_enumerator(), frame), frame.pc);
            }

            public import_item(entry: Revisions.Entry): CloudIndexEntry {
                if (typeof (entry.backlink) != "undefined")
                    return <CloudIndexEntry>(entry.backlink);
                else {
                    var ent = <CloudIndexEntry> new (<any>this.entryCtor)(this);
                    ent.hookup(entry);
                    return ent;
                }
            }



            public singleton() { return this.access(arguments); }
            public at() { return this.access(arguments); }

            private access(args: IArguments): CloudIndexEntry {
                Util.assert(args.length - 1 === this.key_cloudtypes.length);
                var ukeys = new Array<string>();
                var lkeys = new Array<string>();
                for (var i = 0; i < this.key_cloudtypes.length; i++) {
                    var cloudtype = this.key_cloudtypes[i];
                    if (cloudtype.charAt(cloudtype.length - 1) === ')') {
                        // row key
                        var uid = (<CloudTableEntry>args[i]).uid;
                        ukeys.push(uid);
                    }
                    else {
                        // literal key
                        lkeys.push(Conv.toCloud(cloudtype, args[i], false));
                    }
                }

                var entry = this.session().user_get_entry(this.cloudtype, ukeys, lkeys);

                return this.import_item(entry);
            }

            public findImportTarget(ctx: JsonImportCtx, id: string, target: RecordEntry, json: any): any {
                var keys = this.importJsonKeys(ctx, json);
                keys.push(ctx.s);
                return this.access(<any> keys);
            }

            public prune_to(entries: RecordEntry[]) {
                entries.forEach(e => (<any>e).flagthatthisentryispresentusingalongnoncollidingname = true);
                this.get_enumerator().forEach(r => (<any>r).flagthatthisentryispresentusingalongnoncollidingname ? undefined : (<CloudIndexEntry> r).clear_fields());
                entries.forEach(e => delete (<any>e).flagthatthisentryispresentusingalongnoncollidingname);
            }


        }


        export class IndexSingleton
            extends RecordSingleton {
            private _index: Hashtable;
            constructor() {
                super()
            }

            public initParent() {
                this._index = Hashtable.forJson()
            }

            public clear() { return this._index.clear(); }
            public count() { return this._index.countFiltered((val: IndexEntry) => (!val.is_deleted() && val.hasNondefaultValue())); }

            public singleton() { return this.access(arguments); }
            public at() { return this.access(arguments); }

            public makekey(args: IArguments) {
                var key = [];
                // the last argument is IStackFrame
                for (var i = 0; i < args.length - 1; ++i) {
                    var a = args[i];
                    switch (typeof a) {
                        case "string":
                        case "number":
                        case "boolean":
                            key.push(a)
                    break;
                        default:
                            Util.assert(!!a);
                            key.push(a.toJsonKey());
                            break;
                    }
                }
                return key;
            }

            public access(args: IArguments) {
                var key = this.makekey(args);
                var e = this._index.get(key);
                if (!e) {
                    //debugger;
                    e = new (<any>this.entryCtor)(this);
                    Util.assert((args.length === 0 && e.keys.length === 0) || (args.length - 1 === e.keys.length));
                    for (var i = 0; i < e.keys.length; ++i)
                        e[e.keys[i]] = args[i];
                    this._index.set(key, e);
                }
                return e;
            }

            public get_enumerator(): RecordEntry[] {
                var a = this._index.filteredValues((val: IndexEntry) => (!val.is_deleted() && val.hasNondefaultValue()));
                a.sort((a, b) => a.compareTo(b));
                return a;
            }



            public post_to_wall(frame: IStackFrame): void {
                frame.rt.postBoxedHtml(this.getTable(this.get_enumerator(), frame), frame.pc);
            }

            public findImportTarget(ctx: JsonImportCtx, id: string, target: RecordEntry, json: any): any {
                var keys = this.importJsonKeys(ctx, json);
                keys.push(ctx.s);
                return this.access(<any> keys);
            }

            public prune_to(entries: RecordEntry[]) {
                entries.forEach(e => (<any>e).flagthatthisentryispresentusingalongnoncollidingname = true);
                var tobedeleted = this._index.filteredValues(e => !(<any>e).flagthatthisentryispresentusingalongnoncollidingname);
                entries.forEach(e => delete (<any>e).flagthatthisentryispresentusingalongnoncollidingname);
                tobedeleted.forEach(e => {
                    var keys = e.keys.map(k => e[k]);
                    keys.push(null); //dummy item for what is ususally context but not needed here
                    var key = this.makekey(<any> keys);
                    this._index.remove(key);
                });
            }
        }

        export class ObjectSingleton
            extends RecordSingleton {
            constructor() {
                super()
            }
            public create(s: IStackFrame): ObjectEntry {
                var o = <ObjectEntry> new (<any>this.entryCtor)(this);
                o.on_render_heap = s.rt.rendermode;
                return o;
            }

            public create_from_json(jobj: JsonObject, s: IStackFrame): ObjectEntry {
                var o = this.create(s)
                o.from_json(jobj, s)
                return o;
            }

            public invalid() {
                return undefined;
            }

            public clear() {
                // no-op ... cannot clear objects this way.
                // here for uniformity (called on all temporary RecordSingleton when resetting globals)
            }

            public importJsonRecord(ctx: JsonImportCtx, target: RecordEntry, json: any): RecordEntry {
                if (!target)
                    target = this.create(ctx.s);
                target.importJsonFields(ctx, json);
                return target;
            }
        }

        export class DecoratorSingleton
            extends RecordSingleton {
            public _generation = 0;
            constructor() {
                super()
            }

            public clear() {
                this._generation = this._generation + 1;
            }

            public at(obj: RTValue, s: IStackFrame) {
                //SEBTODO check if targeting a deleted row/entry (currently wrong if deleted indirectly) - or revamp invalidation to be eager
                var decs = obj.decorators;
                if (!decs)
                    decs = obj.decorators = new DecoratorCollection();
                var key = s.d["libName"] + "$" + this.stableName;
                var dec = decs[key];
                if (!dec) {
                    dec = new (<any>this.entryCtor)(this);
                    dec[dec.keys[0]] = obj;
                    decs[key] = dec;
                }
                return dec;
            }
        }


        // handles how TD types are embedded into cloud types
        export class Conv {


            public static modify(session: Revisions.ClientSession, lval: Revisions.LVal, val: any, relative: boolean) {
                if (val instanceof CloudTableEntry)
                    val = (<CloudTableEntry>val).uid;
                var op = Conv.toCloud(lval.codomain, val, relative);
                session.user_modify_lval(lval, op);
            }

            public static read(session: Revisions.ClientSession, lval: Revisions.LVal, s: IStackFrame):RTValue {
                var cur = session.user_get_value(lval);
                cur = Conv.fromCloud(lval.codomain, cur);
                if (cur && s && lval.codomain.charAt(0) === "^") {
                    var table = <CloudTableSingleton> s.d["$" + lval.codomain.slice(1)];
                    cur = table.import_item_from_uid(cur);
                }
                return cur;
            }

            public static clear(session: Revisions.ClientSession, lval: Revisions.LVal) {
                var op = Conv.toCloud(lval.codomain, undefined, false);
                session.user_modify_lval(lval, op);
            }

            // static domains and codomains

            public static getCloudDomain(kind: string): string {
                switch (kind) {
                    case "Location": return "location";
                    case "User": return "user";
                    case "Boolean": return "boolean"
                    case "Color": return "color";
                    case "DateTime": return "datetime";
                    case "String": return "string";
                    case "Number": return "double";
                    case "Vector3": return "vector3";
                    default: Util.oops("unhandled case for cloud domain: " + (kind || "none"));
                }
            }

            public static getCloudCodomain(kind: string): string {
                 switch (kind) {
                    case "Location": return "location";
                    case "User": return "user";
                    case "Boolean": return "boolean";
                    case "Color": return "color";
                    case "DateTime": return "datetime";
                    case "String": return "string";
                    case "Number": return "double";
                    case "OAuth Response": return "oauthresponse";
                    case "Link": return "link";
                    case "Json Object": return "json";
                    case "Cloud Picture": return "cloudpicture";
                    default: Util.oops("unhandled case for cloud codomain: " + (kind || "none"));
                }
            }

            // serialization/deserialization of cloud keys and cloud values

            public static toCloud(kind: string, val: any, relative: boolean = false): string {
                switch (kind) {
                    case "location":
                        if (!val) return "";
                        Util.assert(val instanceof RT.Location_);
                        return (<RT.Location_>val).to_string();
                    case "user":
                        if (!val) return "";
                        Util.assert(val instanceof RT.User);
                        return (<RT.User>val).id();
                    case "boolean":
                        return val ? "t" : "";
                    case "color":
                        if (!val) return "";
                        Util.assert(val instanceof RT.Color);
                        return (<RT.Color>val).toInt32().toString();
                    case "vector3":
                        if (!val) return "";
                        return JSON.stringify((<Vector3>val).exportJson(null));
                    case "datetime":
                        if (!val) return "";
                        Util.assert(val instanceof RT.DateTime);
                        return (<RT.DateTime>val).milliseconds_since_epoch().toString();
                    case "string":
                        if (typeof(val) != "string") val = "";
                        //if (val.length > 4000) return val.substr(0, 4000); // truncate to 4000 characters
                        if (relative)
                            return "^?" + val;
                        if (val.charAt(0) === "^")
                            return "^!" + val;
                        return val;
                    case "double":
                        var newval = (typeof val !== "number" ? 0 : <number>val);
                        return relative ? ("A" + newval) : newval.toString();
                    case "oauthresponse":
                        if (!val) return "";
                        return JSON.stringify((<OAuthResponse>val).exportJson(null));
                    case "link":
                        if (!val) return "";
                        return JSON.stringify((<Link>val).exportJson(null));
                    case "json":
                        if (!val) return "";
                        return JSON.stringify((<RT.JsonObject> val).exportJson(null));
                    case "cloudpicture":
                        if (!val) return "";
                        return JSON.stringify((<CloudPicture>val).exportJson(null));
                    default: //reference
                        Util.assert(kind[0] === "^");
                        return val || "";
                }
            }

            public static fromCloud(kind: string, val: any): any {
                // val is either undefined (representing default value) or a string (the reduced op)
                switch (kind) {
                    case "location":
                        if (!val) return; // return undefined value
                        return RT.Location_.mkFromString(val);
                    case "user":
                        if (!val) return; // return undefined value
                        return RT.User.mk(val);
                    case "boolean":
                        return !!val && val !== "false"; // for legacy; new encoding is "" / "t"
                    case "color":
                        if (!val) return; // return undefined value
                        return RT.Color.fromInt32(Number(val));
                    case "datetime":
                        var nr = Number(val || 0); //SEBTODO: think about default
                        return RT.DateTime.mkMs(nr);
                    case "oauthresponse":
                        if (!val) return; // return undefined value
                        return (new OAuthResponse()).importJson(new JsonImportCtx(null), JSON.parse(val));
                    case "vector3":
                        if (!val) return; // return undefined value
                        return Vector3.mkFromJson(new JsonImportCtx(null), JSON.parse(val));
                    case "link":
                        if (!val) return; // return undefined value
                        return (new Link()).importJson(new JsonImportCtx(null), JSON.parse(val));
                    case "json":
                        if (!val) return; // return undefined value
                        return JsonObject.wrap(JSON.parse(val));
                    case "cloudpicture":
                        if (!val) return;
                        return new CloudPicture().importJson(new JsonImportCtx(null), JSON.parse(val));
                    case "string":
                        if (typeof (val) !== "string")
                            val = "";
                        else if (val.charAt(0) === "^")
                            val = val.substr(2);
                        return val;
                    case "double":
                        if (typeof (val) !== "string")
                            return 0;
                        Util.assert(val.charAt(0) !== "A");
                            //return Number(val.slice(1));
                        return Number(val);
                    default: //reference
                        Util.assert(kind[0] === "^");
                        return val || undefined;
                }
            }



        }
    }
}
