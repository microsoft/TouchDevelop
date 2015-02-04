///<reference path='refs.ts'/>
module TDev.RT {
    //? A collection of objects
    //@ stem("coll") icon("NumberedList")
    //@ enumerable serializable ctx(general,json)
    export class Collection<T> 
        extends RTValue
    {
        constructor(public typeInfo:any) {
            super();
        }

        static mkAny(typeInfo:any, a:any[] = []):Collection<any>
        {
            return Collection.mk<any>(typeInfo, a)
        }

        static mk<T>(a:T[], typeInfo:any):Collection<T>
        {
            return Collection.fromArray(a, typeInfo)
        }

        static mkStrings(a:string[]):Collection<string>
        {
            return Collection.fromArray(a, "string")
        }

        static mkNumbers(a:number[]):Collection<number>
        {
            return Collection.fromArray(a, "number")
        }

        static fromArray<T>(a:T[], typeInfo:any):Collection<T>
        {
            if (!a) return undefined;

            var r = new Collection<T>(typeInfo);
            r.a = a;
            return r;
        }

        public a:T[] = [];
        private _continuation:string;

        public get_enumerator() { return this.a.slice(0); }

        //? Gets the number of objects.
        public count() : number { return this.a.length; }

        //? Removes all objects from the collection
        //@ writesMutable
        public clear() : void { this.a = []; }

        //? Adds an object
        //@ writesMutable
        public add(item:T) : void { this.a.push(item); }

        //? Adds many objects at once
        //@ writesMutable
        public add_many(items:Collection<T>) : void { this.a.pushRange(items.a.slice(0)); }

        //? Gets the index of the first occurrence of an object. Returns -1 if not found or start is out of range.
        public index_of(item:T, start:number) : number
        {
            if (Util.isOOB(start, this.count())) return -1;
            for (var i = Util.indexCheck(start, this.count()); i < this.a.length; ++i)
                if (this.a[i] === item) return i;
            return -1;
        }

        //? Gets the object at position index. Returns invalid if index is out of range
        public at(index:number) : T { return this.a[Math.floor(index)]; }

        //? Checks if the item is in the collection
        public contains(item:T) : boolean
        {
            var i = this.index_of(item, 0);
            return (i >= 0);
        }

        //? Removes the first occurence of an object. Returns true if removed.
        //@ writesMutable
        public remove(item:T) : boolean
        {
            var i = this.index_of(item, 0);
            if (i >= 0) {
                this.a.splice(i, 1);
                return true;
           } else return false;
        }

        //? Removes the object at position index.
        //@ writesMutable
        public remove_at(index:number) : void
        {
            if (Util.isOOB(index, this.count())) return;
            this.a.splice(Util.indexCheck(index, this.count()), 1);
        }

        //? Reverses the order of objects in the collection
        //@ writesMutable
        public reverse() : void { this.a.reverse(); }

        //? Gets a random object from the collection. Returns invalid if the collection is empty.
        public random() : T { return this.a.length == 0 ? undefined : this.at(Math_.random(this.a.length)); }

        //? Sets the object at position index. Does nothing if the index is out of range.
        //@ writesMutable
        public set_at(index:number, item:T) : void
        {
		    var _index = Math.floor(index);
			if (0 <= _index && index < this.a.length)
	            this.a[_index] = item; 
        }

        //? Inserts an object at position index. Does nothing if index is out of range.
        //@ writesMutable
        public insert_at(index:number, item:T) : void
        {
            if (Util.isOOB(index, this.count() + 1)) return;
            this.a.splice(Util.indexCheck(index, this.count() + 1), 0, item);
        }

        //? Exports a JSON representation of the contents.
        //@ readsMutable [result].writesMutable 
        public to_json(sf: IStackFrame): JsonObject {
            var ctx = new JsonExportCtx(sf);
            ctx.push(this);
            var json = this.exportJson(ctx);
            ctx.pop(this);
            return JsonObject.wrap(json);
        }
        
        //? Imports a JSON representation of the contents.
        //@ writesMutable
        public from_json(jobj: JsonObject, sf:IStackFrame): void {
            this.importJson(new JsonImportCtx(sf), jobj.value());
        }

        //? Returns a collections of elements that satisfy the filter `condition`
        //@ readsMutable [result].writesMutable 
        public where(condition:Predicate<T>, s:IStackFrame) : Collection<T>
        {
            var rt = s.rt
            return Collection.fromArray(this.a.filter(e => !!rt.runUserAction(condition, [e])), this.typeInfo)
        }

        //? Applies `converter` on all elements of the input collection and returns a collection of results
        //@ readsMutable [result].writesMutable
        public map_to<S>(converter:Converter<T,S>, s:IStackFrame, type_S:any) : Collection<S>
        {
            var rt = s.rt
            return Collection.fromArray(this.a.map(e => <S>rt.runUserAction(converter, [e])), type_S)
        }

        //? Returns a collection sorted using specified `comparison` function
        //@ readsMutable [result].writesMutable 
        public sorted(comparison:Comparison<T>, s:IStackFrame) : Collection<T>
        {
            var rt = s.rt
            return Collection.fromArray(this.a.stableSorted((a, b) => rt.runValidUserAction(comparison, [a, b])), this.typeInfo)
        }

        //? Returns a collection sorted using specified comparison key
        //@ readsMutable [result].writesMutable
        public ordered_by(key:NumberConverter<T>, s:IStackFrame) : Collection<T>
        {
            var rt = s.rt
            return Collection.fromArray(this.a.stableSorted((a, b) => {
                return rt.runValidUserAction(key, [a]) - rt.runValidUserAction(key, [b])
            }), this.typeInfo)
        }

        //? Returns a collection sorted using specified comparison key
        //@ readsMutable [result].writesMutable
        public ordered_by_string(key:StringConverter<T>, s:IStackFrame) : Collection<T>
        {
            var rt = s.rt
            return Collection.fromArray(this.a.stableSorted((a, b) => {
                return rt.runValidUserAction(key, [a]).localeCompare(rt.runValidUserAction(key, [b]))
            }), this.typeInfo)
        }

        //? Returns a collection with the `count` first elements if any.
        //@ readsMutable [result].writesMutable
        public take(count: number, s: IStackFrame): Collection<T> {
            return Collection.fromArray(this.a.slice(0, Math.floor(count)), this.typeInfo);
        }

        //? Returns a slice of the collection starting at `start`, and ends at, but does not include, the `end`.
        //@ readsMutable [result].writesMutable
        public slice(start: number, end: number): Collection<T> {
            return Collection.fromArray(this.a.slice(Math.floor(start), Math.floor(end)), this.typeInfo);
        }
        
        public jsonExportKey(ctx: JsonExportCtx) {
            return null; // conservative - recursion is possible if wrapped type is recursive
        }

        public exportJson(ctx: JsonExportCtx): any {
            
            if (this.a.length > 0 && (this.a[0]["exportJson"] === undefined)) {
                var a0 = this.a[0]
                if (typeof a0 == "string" || typeof a0 == "number" || typeof a0 == "boolean") {
                    // primitives are OK
                } else
                    Util.userError(lf("json export is not supported for this type"));
            }

            return ctx.encodeArrayNode(this, this.a.slice(0));
        }

        public importJson(ctx: JsonImportCtx, json: any): RT.RTValue
        {
            var prev = this.a;
            this.a = []

            if (!Array.isArray(json)) return this

            if (typeof this.typeInfo == "string") {
                if (this.typeInfo === "number")
                    json.forEach(n => { if (typeof n === "number") this.a.push(n) })
                else if (this.typeInfo === "string")
                    json.forEach(n => { if (typeof n === "string") this.a.push(n) })
                else if (this.typeInfo === "boolean")
                    json.forEach(n => { if (typeof n === "boolean") this.a.push(n) })
                else
                    Util.userError("json import is not supported for Collection of " + this.typeInfo);
            } else if (this.typeInfo instanceof RecordSingleton) {
                for (var n = 0; n < json.length; n++) {
                    var o = ctx.importRecord(json, prev[n], n, this.typeInfo);
                    if (o)
                       this.a.push(<any>o);
                }
            } else if (typeof this.typeInfo === "function") {
                var ctor = this.typeInfo
                json.forEach(n => {
                    var v = new ctor()
                    v = v.importJson(ctx, n)
                    if (v) this.a.push(v)
                })
            } else {
                Util.userError("json import is not supported for this Collection")
            }

            return this
        }

        private getHtml()
        {
            var first = undefined
            for (var i = 0; i < this.a.length; ++i)
                if (this.a[i]) {
                    first = this.a[i];
                    break;
                }

            var s = '[';
            for (var i = 0; i < this.a.length; ++i) {
                if (i > 0) s += ', ';
                s += this.a[i];
            }
            s += ']';
            return span(null, s);
        }
        
        private getRecord():RecordSingleton
        {
            if (this.typeInfo instanceof RecordSingleton)
                return <RecordSingleton>this.typeInfo
            return null
        }

        //? Display all objects on the wall
        public post_to_wall(s : IStackFrame): void
        {
            if (this.getRecord())
                s.rt.postBoxedHtml(this.getRecord().getTable(<any[]>this.a, s), s.pc);
            else
                s.rt.postBoxedHtml(this.getHtml(), s.pc);
        }

        public debuggerDisplay(clickHandler: () => any): HTMLElement
        {
            var e: HTMLElement;
            if (this.getRecord()) {
                try {
                    e = this.getRecord().getTable(<any[]>this.a, null);
                } catch (e) {
                    e = span(null, e.message || ""); // can be a "user error" when record originated from stale session
                }
            } else {
                e = this.getHtml()
            }

            return e.withClick(clickHandler);
        }

        //? Ask user to pick an entry from this collection
        //@ uiAsync returns(T)
        public pick_entry(text: string, r: ResumeCtx)  {
            var rt = r.rt;
            var getView = (o:any) => {
                if (o.getIndexCard) return o.getIndexCard(r.stackframe)
                else if (o.getViewCore) return o.getViewCore(r.stackframe, null)
                else if (o.toString) return o.toString()
                else return o + ""
            };
            if (rt.useModalWallDialogs()) {
                var m = new ModalDialog();
                var chosen = null;
                var btns = this.a.map((o: any) => div('modalDialogChooseItem', getView(o)).withClick(() => {
                    chosen = o;
                    m.dismiss();
                }));
                m.add([div("wall-dialog-header", text)/* ,div("wall-dialog-body", caption)*/]);
                m.onDismiss = () => r.resumeVal(chosen);
                m.choose(btns);
            } else {
                var btnsDiv: HTMLElement;
                var btns2 = this.a.map((o: any) => {
                    var btn = HTML.mkButtonElt("wall-button", getView(o));
                    Util.clickHandler(btn, () =>
                    {
                        r.resumeVal(o);
                        btnsDiv.removeSelf();
                    });
                    return btn;
                });
                var elt = div("wall-dialog",
                    [div("wall-dialog-header", text),
                        /*div("wall-dialog-body", caption),*/
                        btnsDiv = div("wall-dialog-buttons", btns2)]);
                rt.postHtml(elt, rt.current.pc);
            }
        }

        //? Computes the sum of the key of the elements in the collection
        //@ readsMutable
        public sum_of(key: NumberConverter<T>, s: IStackFrame): number {
            var rt = s.rt
            var v = this.a.map(x => <number>rt.runValidUserAction(key, [x]));
            return Util.stableSum(v);
        }

        //? Computes the maximum of the key of the elements in the collection
        //@ readsMutable
        public max_of(key: NumberConverter<T>, s: IStackFrame): number {
            var rt = s.rt
            if (this.a.length == 0) return undefined;
            var m = <number>rt.runValidUserAction(key, [this.a[0]]);
            for (var i = 1; i < this.a.length; ++i) {
                var v = <number>rt.runValidUserAction(key, [this.a[i]]);
                if (v > m) m = v;
            }
            return m;
        }

        //? Computes the average of the key of the elements in the collection
        //@ readsMutable
        public avg_of(key: NumberConverter<T>, s: IStackFrame): number {
            var rt = s.rt
            if (this.a.length == 0) return undefined;
            return this.sum_of(key, s) / this.count();
        }

        //? Computes the minimum of the key of the elements in the collection
        //@ readsMutable
        public min_of(key: NumberConverter<T>, s: IStackFrame): number {
            var rt = s.rt
            if (this.a.length == 0) return undefined;
            var m = <number>rt.runValidUserAction(key, [this.a[0]]);
            for (var i = 1; i < this.a.length; ++i) {
                var v = <number>rt.runValidUserAction(key, [this.a[i]]);
                if (v < m) m = v;
            }
            return m;
        }

        //
        // Methods specific to Collection<some-specific-type>
        // 

        //? Computes the minimum of the values
        //@ readsMutable onlyOn(Number)
        public min(): number
        {
            var a = <number[]><any>this.a
            if (a.length == 0) return undefined;
            return this.a.min();
        }

        //? Computes the maximum of the values
        //@ readsMutable onlyOn(Number)
        public max() : number
        {
            if (this.a.length == 0) return undefined;
            var a = <number[]><any>this.a
            return a.max();
        }

        //? Computes the sum of the values
        //@ readsMutable onlyOn(Number)
        public sum(): number {
            if (this.a.length == 0) return 0;
            var a = <number[]><any>this.a
            return Util.stableSum(a);
        }

        //? Computes the average of the values
        //@ readsMutable onlyOn(Number)
        public avg(): number
        {
            if (this.a.length == 0) return 0;
            return this.sum() / this.a.length;
        }

        //? Sorts from the newest to oldest
        //@ writesMutable onlyOn(Message)
        public sort_by_date(): void
        {
            (<Message[]><any>this.a).sort(function (m1, m2) {
                if (!m1.time()) return 1;
                if (!m2.time()) return -1;
                return m1.time().d.valueOf() < m2.time().d.valueOf() ? -1 : 1;
            });
        }

        //? Sorts the strings in this collection
        //@ writesMutable onlyOn(Number, String)
        public sort() : void
        {
            this.a.sort(); // TODO locale?
        }

        //? Sorts the places by distance to the location
        //@ writesMutable onlyOn(Location, Place)
        public sort_by_distance(loc:Location_) : void
        { 
            var getLoc = (l) => {
                if (l instanceof Place) return (<Place>l).location()
                return <Location_>l
            }
            (<any[]>this.a).sort((l, r) => {
                var lloc = getLoc(l)
                var rloc = getLoc(r)
                if (!lloc && !rloc) return 0;
                if (!lloc) return 1;
                if (!rloc) return -1;
                
                return rloc.distance(lloc) - lloc.distance(rloc);
            });
        }

        //? Concatenates the separator and items into a string
        //@ readsMutable onlyOn(Number, String)
        public join(separator:string) : string
        {
            return (<string[]><any>this.a).join(separator);
        }

        //? Gets the identifier of the next set of items (if any)
        //@ readsMutable
        public continuation(): string { return this._continuation || ""; }

        //? Sets the identifier of the next set of items
        //@ writesMutable
        public set_continuation(value : string) : void { this._continuation = value; }
    }

    // Backward-compat for javascript* APIs
    export module StringCollection {
        export function mk(v:string[]) { return Collection.mkStrings(v) }
        export function fromArray(v:string[]) { return Collection.mkStrings(v) }
    }
    export module NumberCollection {
        export function mk(v:number[]) { return Collection.mkNumbers(v) }
        export function fromArray(v:number[]) { return Collection.mkNumbers(v) }
    }
}
