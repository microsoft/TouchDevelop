///<reference path='refs.ts'/>
module TDev { export module RT {
    //? A map from strings to strings
    //@ stem("d") enumerable serializable ctx(general,json)
    export class StringMap
        extends RTValue
    {
        constructor() {
            super()
        }
        public items : any = new Object();
        private length : number = 0;

        static mk(items:any)
        {
            var r = new StringMap()
            r.items = Util.clone(items)
            r.length = Object.keys(r.items).length
            return r
        }

        //? Gets the number of elements in the map
        //@ readsMutable
        public count() : number { return this.length; }

        //? Gets the keys in the map
        //@ readsMutable
        public keys(): Collection<string>
        {
            var keys = Object.keys(this.items);
            return Collection.mkStrings(keys);
        }

        //? Gets the value at a given key; invalid if not found
        //@ readsMutable
        public at(key:string) : string
        {
            var result = (<any>(this.items)[key]);
            return <string>(result);
        }

        //? Sets the value at a given key; invalid if not found
        //@ writesMutable
        public set_at(key:string, value:string) : void
        {
            var val = this.items[key];
            if (val != value) {
                if (val != null) {
                    this.length--;
                    delete this.items[key];
                }
                if (value != null) {
                    this.items[key] = value;
                    this.length++;
                }
            }
        }

        //? Exports a JSON representation of the contents.
        //@ readsMutable
        public to_json(): JsonObject {
            return JsonObject.wrap(this.exportJson(null))
        }
        //? Imports a JSON representation of the contents.
        //@ writesMutable
        public from_json(jobj: JsonObject): void {
            this.importJson(null, jobj.value());
        }

        // ctx is ignored
        public exportJson(ctx: JsonExportCtx): any {
            var obj = {};
            Object.keys(this.items).forEach((k) => {
                obj[k] = this.items[k];
            });
            return obj;
        }
        // ctx is ignored
        public importJson(ctx: JsonImportCtx, json: any): RT.RTValue {
            if ((typeof (json) !== "object") || Array.isArray(json)) {
                this.clear();
                return this;
            } else {
                this.items = {};
                this.length = 0;
                Object.keys(json).forEach(k => {
                    var v = json[k];
                    if (typeof v == "string") {
                        this.items[k] = v;
                        this.length++;
                    }
                });
            }
        }

        //? Clears the values from the map
        public clear()
        {
            this.items = new Object();
            this.length = 0;
        }

        //? Sets many elements at once.
        //@ writesMutable [strings].readsMutable
        public set_many(strings:StringMap) : void
        {
            Object.keys(strings.items).forEach((key) => {
                var value = strings.at(key);
                this.set_at(key, value);
            });
        }

        //? Removes the value at a given key
        public remove(key:string) : void
        {
            var val = this.items[key];
            if (val != null)
            {
                this.length--;
                delete this.items[key];
            }
        }

        public toString(): string {
            var s = "{" + Object.keys(this.items)
                .map(key => key + "->" + this.at(key))
                .join(",")
             + "}";
            return s;
        }

        public get_enumerator() { return Object.keys(this.items); }

        //? Displays the list of key,value pairs in a table
        //@ readsMutable
        public post_to_wall(s: IStackFrame)
        {
            s.rt.postBoxedText(this.toString(), s.pc);
        }

        public debuggerDisplay(clickHandler: () => any): HTMLElement {
            return span(null, "String Map[" + this.length + "]").withClick(clickHandler);
        }

        public debuggerChildren() {
            var ret = {};
            var items = this.items;
            Object.keys(items).forEach(k => ret['"' + k + '"'] = items[k]);
            return ret;
        }
    }
} }
