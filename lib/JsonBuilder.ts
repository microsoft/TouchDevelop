///<reference path='refs.ts'/>
module TDev.RT {
    //? A json data structure builder
    //@ stem("jsb") ctx(general,enumerable,json)
    //@ serializable
    export class JsonBuilder
        extends RTValue {
        private item: any = {};
        public isSerializable() { return true; }

        static wrap(i: any) {
            if (i === undefined) return undefined; // null must be wrapped
            var r = new (<any>JsonBuilder)(); //TS9
            r.item = i
            return r
        }

        public value() { return this.item }

        public exportJson(ctx: JsonExportCtx): any {
            return Util.jsonClone(this.item);
        }
        public importJson(ctx: JsonImportCtx, json: any): RT.RTValue {
            if (json !== undefined) {
                this.item = Util.jsonClone(json);
                return this;
            }
            else
            return undefined;
        }


        private ensureObject() {
            if (this.item === null || typeof this.item !== "object" || Array.isArray(this.item))
                this.item = {};
        }
        //? Sets the field value.
        public set_field(name: string, value: JsonObject): void {
            if (name.length == 0) return;
            this.ensureObject();
            this.item[name] = this.toValue(value);
        }

            //? Sets the field the the reference to JsonBuilder.
        public set_builder(name: string, value: JsonBuilder): void {
            if (name.length == 0) return;
            this.ensureObject();
            this.item[name] = value.item;
        }

            //? Sets the string value.
        public set_string(name: string, value: string): void {
            if (name.length == 0) return;
            this.ensureObject();
            this.item[name] = value;
        }

            //? Sets the number value.
        public set_number(name: string, value: number): void {
            if (name.length == 0) return;
            this.ensureObject();
            this.item[name] = value;
        }

        //? Sets the boolean value.
        public set_boolean(name: string, value: boolean): void {
            if (name.length == 0) return;
            this.ensureObject();
            this.item[name] = value;
        }

        //? Sets the Sound value as a data uri.
        public set_sound(name: string, snd: Sound): void {
            if (name.length == 0) return;
            this.ensureObject();
            this.item[name] = snd.getDataUri();
        }

        //? Sets the Picture value as a data uri.
        //@ picAsync
        public set_picture(name: string, pic: Picture, quality: number, r: ResumeCtx): void {
            if (name.length == 0) return;
            this.ensureObject();
            pic.loadFirst(r, () => {
                this.item[name] = pic.getDataUri(Math_.normalize(quality));
            });
        }

        //? Sets the field value as null.
        public set_field_null(name: string): void {
            this.set_field(name, null);
        }

        //? Adds a value to the array.
        public add(value: JsonObject): void {
            if (!Array.isArray(this.item))
                this.item = [];
            this.item.push(this.toValue(value));
        }

        //? Copy all fields from given JSON object
        public copy_from(value: JsonObject): void
        {
            if (value.kind() != "object")
                Util.userError("cannot copy from non-object")
            var v = Util.jsonClone(value.value())
            Object.keys(v).forEach(k => {
                this.item[k] = v[k]
            })
        }

        //? Add a reference to JsonBuilder to the array.
        public add_builder(value: JsonBuilder): void {
            if (!Array.isArray(this.item))
                this.item = [];
            this.item.push(value.item);
        }

            //? Deletes all array elements from the current builder.
        public clear() {
            if (Array.isArray(this.item))
                while (this.item.length > 0)
                    this.item.pop();
        }

            //? Adds a null value to the array.
        public add_null(): void {
            this.add(null);
        }

        public toString(): string {
            return JSON.stringify(this.item);
        }

        public setItem(i: any) {
            this.item = i
        }

        private toValue(o: JsonObject): any {
            return o === null ? null : o.value();
        }

        //? Converts the builder into a json data structure
        public to_json(): JsonObject {
            return JsonObject.wrap(JSON.parse(JSON.stringify(this.item)));
        }

            //? Gets the number of values
        public count(): number {
            return Array.isArray(this.item) ? this.item.length : undefined;
        }

            //? Gets the i-th json value
        public at(index: number): JsonBuilder {
            return Array.isArray(this.item) ? JsonBuilder.wrap(this.item[Math.floor(index)]) : undefined;
        }

            //? Sets the i-th json value
        public set_at(index: number, v: JsonBuilder) {
            if (!Array.isArray(this.item))
                this.item = [];
            this.item[index] = v.item;
        }

            //? Removes the i-th json value
        public remove_at(index: number) {
            if (!Array.isArray(this.item))
                this.item = [];
            this.item.splice(index, 1);
        }

            //? Deletes named field
        public remove_field(name: string) {
            var v = this.item;
            this.ensureObject();
            delete this.item[name];
        }

            //? Gets a field value as a boolean
        public boolean(key: string): boolean {
            if (this.item === null) return undefined;
            var v: any = this.item[key];
            if (typeof v === 'boolean') return <boolean>v;
            if (typeof v === 'string') return /^true$/i.test(<string>v) ? true : false;
            if (typeof v === 'number') return (<number>v) == 0 ? false : true;
            else return !!v;
        }

            //? Indicates if the key exists
        public contains_key(key: string): boolean {
            var v = this.item;
            return v !== null && typeof v === 'object' && v.hasOwnProperty(key);
        }

            //? Gets the field value as a time
        public time(key: string): DateTime {
            if (this.item !== null) {
                var v = this.item[key];
                if (typeof v === 'string') return DateTime.mkMs(Date.parse(<string>v));
                if (typeof v === 'number') return DateTime.mkMs(<number>v);
            }
            return undefined;
        }

            //? Gets a value by name
        public field(key: string): JsonBuilder {
            var v = this.item;
            return v === null ? undefined : JsonBuilder.wrap(v[key]);
        }

            //? Gets the list of keys
        public keys(): Collection<string> {
            return Collection.mkStrings(this.kind() === "object" ? Object.keys(this.item) : []);
        }

            //? Gets a json kind (string, number, object, array, boolean, null)
        public kind(): string {
            var result = 'array';
            if (this.item === null) result = "null";
            else if (Array.isArray(this.item)) { }
            else if (typeof this.item === 'string') result = 'string';
            else if (typeof this.item === 'number') result = 'number';
            else if (typeof this.item === 'boolean') result = 'boolean';
            else if (typeof this.item === 'object') result = 'object';

            return result;
        }

            //? Gets a field value as a number
        public number(key: string): number {
            if (this.item !== null) {
                var v = this.item[key];
                if (typeof v === 'number') return <number>v;
                if (typeof v === 'string') return parseFloat(<string>v);
                if (typeof v === 'boolean') return (<boolean>v) ? 1 : 0;
            }
            return undefined;
        }

            //? Gets a field value as a string
        public string(key: string): string {
            if (this.item !== null) {
                var v = this.item[key];
                if (typeof v === 'string') return <string>v;
                if (typeof v === 'number') return (<number>v).toString();
                if (typeof v === 'boolean') return (<boolean>v) ? 'true' : 'false';
            }
            return undefined;
        }

            //? Prints the value to the wall
        public post_to_wall(s: IStackFrame): void {
            var txt;
            try {
                txt = JSON.stringify(this.item, null, 2)
            } catch (e) {
                txt = "error stringifying json builder: " + e.message;
            }
            s.rt.postBoxedText(txt, s.pc);
        }

            //? Converts to a boolean (type must be boolean)
        public to_boolean(): boolean {
            if (typeof this.item === 'boolean') return <boolean>this.item;
            if (typeof this.item === 'string') return /^true$/i.test(<string>this.item) ? true : false;
            if (typeof this.item === 'number') return (<number>this.item) == 0 ? false : true;
            return undefined;
        }

            //? Converts to a number (type must be number)
        public to_number(): number {
            if (typeof this.item === 'number') return <number>this.item;
            if (typeof this.item === 'string') return parseFloat(<string>this.item);
            if (typeof this.item === 'boolean') return (<boolean>this.item) ? 1 : 0;
            return undefined;
        }

            //? Converts to a string (type must be string)
        public to_string(): string {
            if (typeof this.item === 'string') return <string>this.item;
            if (typeof this.item === 'number') return (<number>this.item).toString();
            if (typeof this.item === 'boolean') return (<boolean>this.item) ? 'true' : 'false';
            return undefined;
        }

            //? Converts and parses to a date time (type must be string)
        public to_time(): DateTime {
            if (typeof this.item === 'string') return DateTime.mkMs(Date.parse(<string>this.item));
            if (typeof this.item === 'number') return DateTime.mkMs(<number>this.item);
            return undefined;
        }

        //? Converts to a collection of JsonBuilders (type must be array)
        //@ readsMutable [result].writesMutable
        public to_collection(): Collection<JsonBuilder> {
            if (Array.isArray(this.item))
                return Collection.fromArray<JsonBuilder>(this.item.map(e => JsonBuilder.wrap(e)), JsonBuilder)
            else
                return undefined
        }

            //? Stringify the current JSON object
        public serialize(): string {
            return JSON.stringify(this.item)
        }

        public getShortStringRepresentation(): string {
            return JSON.stringify(this.item, null, 2);
        }

        public debuggerDisplay(clickHandler) {
            return this.to_json().debuggerDisplay(clickHandler);
        }

        public debuggerChildren(): any {
            return this.to_json().debuggerChildren();
        }
    }
}
