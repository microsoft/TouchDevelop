///<reference path='refs.ts'/>
module TDev.RT {
    //? A json data structure.
    //@ stem("js") immutable ctx(general,gckey,enumerable,cloudfield,json) serializable
    export class JsonObject
        extends RTValue {
        private _item: any = undefined;
        constructor () {
            super()
        }

        static mk(s: string, log?: (msg: string) => void ): JsonObject {
            return JsonParser.parse(s, log);
        }

        static wrap(json: any): JsonObject {
            if (json === undefined) return undefined; // null must be wrapped
            var js = new JsonObject();
            js._item = json;
            return js;
        }

        public exportJson(ctx: JsonExportCtx): RT.RTValue {
            return this._item;
        }
        public importJson(ctx: JsonImportCtx, json: any): RT.RTValue {
            Util.oops("should not call immutable instance for importing");
            return undefined;
        }
        static mkFromJson(ctx: JsonImportCtx, json: any): RT.RTValue {
             if (json === undefined) return undefined;
            var copy = JSON.parse(JSON.stringify(json));
            return JsonObject.wrap(copy);
        }

        public getShortStringRepresentation(): string {
            return JSON.stringify(this._item, null, 2);
        }

        //? Creates a deep copy clone of the object
        public clone(): JsonObject {
            return JsonObject.wrap(JSON.parse(JSON.stringify(this._item)));
        }

        // gets the underlying value
        public value(): any { return this._item; }

        //? Gets the number of values
        public count(): number {
            return Array.isArray(this._item) ? this._item.length : undefined;
        }

        //? Gets the i-th json value
        public at(index: number): JsonObject {
            return Array.isArray(this._item) ? JsonObject.wrap(this._item[Math.floor(index)]) : undefined;
        }

            //? Gets a field value as a boolean
        public boolean(key: string): boolean {
            if (this._item === null) return undefined;
            var v: any = this._item[key];
            if (typeof v === 'boolean') return <boolean>v;
            if (typeof v === 'string') return /^true$/i.test(<string>v) ? true : false;
            if (typeof v === 'number') return (<number>v) == 0 ? false : true;
            else return !!v;
        }

            //? Indicates if the key exists
        public contains_key(key: string): boolean {
            var v = this._item;
            return v !== null && typeof v === 'object' && v.hasOwnProperty(key);
        }

            //? Gets the field value as a time
        public time(key: string): DateTime {
            if (this._item !== null) {
                var v = this._item[key];
                if (typeof v === 'string') return DateTime.mkMs(Date.parse(<string>v));
                if (typeof v === 'number') return DateTime.mkMs(<number>v);
            }
            return undefined;
        }

            //? Gets a value by name
        public field(key: string): JsonObject {
            var v = this._item;
            return v === null ? undefined : JsonObject.wrap(v[key]);
        }

            //? Gets the list of keys
        public keys(): Collection<string> {
            var v = this._item;
            return Collection.mkStrings(this.kind() === "object" ? Object.keys(v) : []);
        }

            //? Gets a json kind (string, number, object, array, boolean, null)
        public kind(): string {
            var result = 'array';
            if (this._item === null) result = "null";
            else if (Array.isArray(this._item)) { }
            else if (typeof this._item === 'string') result = 'string';
            else if (typeof this._item === 'number') result = 'number';
            else if (typeof this._item === 'boolean') result = 'boolean';
            else if (typeof this._item === 'object') result = 'object';

            return result;
        }

            //? Gets a field value as a number
        public number(key: string): number {
            if (this._item !== null) {
                var v = this._item[key];
                if (typeof v === 'number') return <number>v;
                if (typeof v === 'string') return parseFloat(<string>v);
                if (typeof v === 'boolean') return (<boolean>v) ? 1 : 0;
            }
            return undefined;
        }

            //? Gets a field value as a string
        public string(key: string): string {
            if (this._item !== null) {
                var v = this._item[key];
                if (typeof v === 'string') return <string>v;
                if (typeof v === 'number') return (<number>v).toString();
                if (typeof v === 'boolean') return (<boolean>v) ? 'true' : 'false';
            }
            return undefined;
        }

        //? Prints the value to the wall
        public post_to_wall(s: IStackFrame): void {
            s.rt.postBoxedText(JSON.stringify(this._item, null, 2), s.pc);
        }

        //? Create a string formatted for easy readability
        //@ [spaces].defl(2)
        public format(spaces: number): string {
            return JSON.stringify(this._item, null, spaces);
        }

        //? Converts to a boolean (type must be boolean)
        public to_boolean(): boolean {
            if (typeof this._item === 'boolean') return <boolean>this._item;
            if (typeof this._item === 'string') return /^true$/i.test(<string>this._item) ? true : false;
            if (typeof this._item === 'number') return (<number>this._item) == 0 ? false : true;
            return undefined;
        }

        //? Converts to a number (type must be number)
        public to_number(): number {
            if (typeof this._item === 'number') return <number>this._item;
            if (typeof this._item === 'string') return parseFloat(<string>this._item);
            if (typeof this._item === 'boolean') return (<boolean>this._item) ? 1 : 0;
            return undefined;
        }

        //? Converts to a string (type must be string)
        public to_string(): string {
            if (typeof this._item === 'string') return <string>this._item;
            if (typeof this._item === 'number') return (<number>this._item).toString();
            if (typeof this._item === 'boolean') return (<boolean>this._item) ? 'true' : 'false';
            return undefined;
        }

        //? Converts and parses to a date time (type must be string)
        public to_time(): DateTime {
            if (typeof this._item === 'string') return DateTime.mkMs(Date.parse(<string>this._item));
            if (typeof this._item === 'number') return DateTime.mkMs(<number>this._item);
            return undefined;
        }


        //? Converts to a collection of JsonObjects (type must be array)
        //@ readsMutable [result].writesMutable
        public to_collection(): Collection<JsonObject> {
            if (Array.isArray(this._item))
                return Collection.fromArray<JsonObject>(this._item.map(e => JsonObject.wrap(e)), JsonObject)
            else
                return undefined
        }

        //? Stringify the current JSON object
        public serialize(): string {
            return JSON.stringify(this._item)
        }

        //? Copy current JSON object into a Json Builder so it can be modified
        //@ readsMutable [result].writesMutable
        public to_json_builder(): JsonBuilder {
            return JsonBuilder.wrap(JSON.parse(JSON.stringify(this._item)))
        }


        public toString(): string {
            return JSON.stringify(this._item);
        }

        public debuggerDisplay(clickHandler) {
            var c = this._item;
            if (typeof c === 'boolean' || typeof c === 'string' || typeof c === 'number')
                return div(null, c.toString()).withClick(clickHandler);
            else if (c === null)
                return div(null, 'null').withClick(clickHandler);
            else if (Array.isArray(c))
                return div(null, '[' + c.length + ']').withClick(clickHandler);

            var txt = [];
            Object.keys(c).forEach(k => {
                var v = this._item[k];
                if (Array.isArray(v))
                    txt.push(k + ' : [' + v.length + ']');
                else if (typeof v === 'boolean' || typeof v === 'number')
                    txt.push(k + ' : ' + v);
                else if (typeof v === 'string')
                    txt.push(k + ' : "' + (<string>v).slice(0, 5) + '..."');
                else // object
                    txt.push(k + ' : {...}');
            });
            return div(null, '{' + txt.join(', ') + '}').withClick(clickHandler);
        }

        public debuggerChildren(): any {
            var c = this._item;
            if (c === null || typeof c === 'boolean' || typeof c === 'string' || typeof c === 'number')
                return null;

            var r = {};
            Object.keys(c).forEach(k => {
                var v = c[k];
                if (Array.isArray(v) || typeof v === 'object')
                    r[k] = JsonObject.wrap(v);
                else
                    r[k] = v;
            });
            return r;
        }
    }
}
