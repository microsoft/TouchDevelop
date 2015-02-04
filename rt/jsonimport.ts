///<reference path='refs.ts'/>

'use strict';

module TDev {


    export class JsonExportCtx {

        constructor(public stackframe: IStackFrame, public fullcloudstate = false) { }
        private depth = 0;

        public push(node: RT.RTValue) {
            Util.assert(!node.jsonExportMark);
            node.jsonExportMark = true;
            this.depth++;
        }
        public pop(node: RT.RTValue) {
            Util.assert(node.jsonExportMark);
            node.jsonExportMark = false;
            this.depth--;
        }
        public encodeObjectNode(node: RT.RTValue, keys: string[], vals: any[]): any {
            Util.assert(keys.length == vals.length);
            var json = {};
            var exportkey = node.jsonExportKey(this);
            if (exportkey)
                json["⌹id"] = exportkey;
            this.encodeValues(vals);
            for (var i = 0; i < vals.length; i++) {
                var val = vals[i];
                if (val !== undefined)
                    json[keys[i]] = val;
            }
            return json;
        }

        public encodeArrayNode(node: RT.RTValue, vals: any[]): any {
            Util.assert(!node.jsonExportKey(this));
            this.encodeValues(vals);
            return vals;
        }

        private encodeValues(vals: any[]) {
            var recursed: RT.RTValue[];

            // mark or prune recursive entries
            for (var i = 0; i < vals.length; i++) {
                var v = vals[i];
                if (v && (v instanceof RT.RTValue)) {
                    var k = v.jsonExportKey(this);
                    if (k !== undefined) {
                        // needs recursive encoding
                        if (v.jsonExportMark || (this.fullcloudstate && this.depth > 0)) {
                            vals[i] = k;
                        } else {
                            v.jsonExportMark = true;
                            if (!recursed)
                                recursed = new Array<RT.RTValue>();
                            recursed.push(v);
                        }
                    }
                }
            }
            // encode all entries
            for (var i = 0; i < vals.length; i++) {
                var val = vals[i];
                if (val !== undefined && val !== null) {
                    var t = typeof val;
                    if (t == "function")
                        vals[i] = undefined
                    else if (t !== "boolean" && t !== "string" && t !== "number")
                        vals[i] = val.exportJson(this);
                }
            }
            // unmark entries
            if (recursed)
                recursed.forEach((rv) => {
                    Util.assert(rv.jsonExportMark);
                    rv.jsonExportMark = false;
                });
        }

    }


    export class JsonImportCtx {

        constructor(public s: IStackFrame) { }

        // mappings

        private mapping = {};
        public map(table: string, id: string): string {
             return id ? (this.mapping[table+id] || id) : id;
        }
        public addmapping(table: string, from: string, to: string) {
            this.mapping[table + from] = to;
        }


        // basic value types

        public importString(source: any, key: any): string {
            var v = source ? source[key] : undefined;
            return (typeof v == "string") ? v : undefined;
        }
        public importNumber(source: any, key: any): number {
            var v = source ? source[key] : undefined;
            if (typeof v == "string")
                v = Number(v);
            return (typeof v == "number") ? v : undefined;
        }
        public importBoolean(source: any, key: any): boolean {
            var v = source ? source[key] : undefined;
            return (typeof v == "boolean") ? v : undefined;
        }

        // immutable RT types

        public importDateTime(source: any, key: any): RT.DateTime {
            var v = source ? source[key] : undefined;
            return RT.DateTime.mkFromJson(this, v);
        }
        public importColor(source: any, key: any): RT.RTValue {
           var v = source ? source[key] : undefined;
           return  RT.Color.mkFromJson(this, v);
        }
        public importJsonObject(source: any, key: any): RT.RTValue {
            var v = source ? source[key] : undefined;
            return RT.JsonObject.mkFromJson(this, v);
        }
        public importLocation(source: any, key: any): RT.Location_ {
            var v = source ? source[key] : undefined;
            return RT.Location_.mkFromJson(this, v);
        }
        public importVector3(source: any, key: any): RT.RTValue {
            var v = source ? source[key] : undefined;
            return RT.Vector3.mkFromJson(this, v);
        }
        public importUser(source: any, key: any): RT.RTValue {
            var v = source ? source[key] : undefined;
            return RT.User.mkFromJson(this, v);
        }

        // collection types

        public importStringMap(source: any, target: any, key: any): RT.StringMap {
            var v = source ? source[key] : undefined;
            if (!v) return undefined;
            if (!target) target = new RT.StringMap();
            return target.importJson(this, v);
        }
        public importNumberMap(source: any, target: any, key: any): RT.NumberMap {
            var v = source ? source[key] : undefined;
            if (!v) return undefined;
            if (!target) target = new RT.NumberMap();
            return target.importJson(this, v);
        }
        public importCollection(source: any, target: any, key: any, typeInfo: any)
        {
            var v = source ? source[key] : undefined;
            if (!v) return undefined;
            if (!target) {
                target = RT.Collection.fromArray([], typeInfo)
            }
            return target.importJson(this, v);
        }

        // mutable RT types

        public importJsonBuilder(source: any, target: any, key: any): RT.RTValue {
            var v = source ? source[key] : undefined;
            if (!v) return undefined;
            if (!target) target = new (<any>RT.JsonBuilder)(); //TS9
            return target.importJson(this, v);
        }
        public importLink(source: any, target: any, key: any): RT.RTValue {
            var v = source ? source[key] : undefined;
            if (!v) return undefined;
            if (!target) target = new RT.Link();
            return target.importJson(this, v);
        }
        public importOAuthResponse(source: any, target: any, key: any): RT.RTValue {
            var v = source ? source[key] : undefined;
            if (!v) return undefined;
            if (!target) target = new RT.OAuthResponse();
            return target.importJson(this, v);
        }

        // records

        public importRecord(source: any, target: any, key: any, singleton: RT.RecordSingleton): RT.RTValue {
            var v = source ? source[key] : undefined;
            if (!v)  return undefined;
            return singleton.importJsonRecord(this, target, v, false);
        }


        /*
        public importValueField(obj: any, name: string, type: string) {
        }
        public importReferenceField(obj: any, name: string) {
            var val = obj[name];
            val.importJson(this);
        }

        public importjson(
            getter: (sk: any, v: any) => any[],
            setter: (dk: any, v: any) => void,
            srckeys: any,
            json: any): void {
            var len = (typeof srckeys === 'number') ? srckeys : srckeys.length;
            var getkey = (typeof srckeys === 'number') ? (n: number) => n : (n: number) => srckeys[n];
            for (var i = 0; i < len; i++) {
                var key = getkey(i);
                var val = json[key];
                var importpair = getter(key, val);
                var destkey = importpair[0];
                var importer = importpair[1];
                switch (typeof (importer)) {
                    case "function":
                        val = importer(this, val); // general import function
                        break;
                    case "object":
                        Util.assert(importer instanceof RT.RTValue);
                        val = (<RT.RTValue>importer).importJson(this, val);
                        break;
                    case "number":
                        if (typeof val !== "number")
                            val = 0;
                        break;
                    case "boolean":
                        if (typeof val !== "boolean")
                            val = false;
                        break;
                    case "string":
                        if (typeof val !== "string")
                            val = "";
                        break;
                    default:
                        Util.oops("unhandled type: " + typeof(importer));
                        break;
                }
                setter(destkey, val);
            }
        }




        // import json array. Factory creates [key,val] or undefined if it should not be imported
        public importArray(obj: any, json: any[], key: (n: number) => any, factory: (n: number) => any[]): boolean {
            if (!Array.isArray(json))
                return false;
            for (var i = 0; i < json.length; i++) {
                if (json[i] === null)
                    continue;
                Util.assert(json[i] !== undefined);
                var k = key(i);
                var dest = obj[k];
                if (dest === undefined || dest === null) {
                    var keyvalpair = factory(i);
                    if (!keyvalpair)
                        continue;
                    k = keyvalpair[0];
                    dest = keyvalpair[1];
                }
                if (typeof (dest) != typeof (json[i]))
                    continue;
                switch (typeof (dest)) {
                    case "object":
                        if (dest.importJson(this, json[i]))
                            obj[k] = dest;
                        break;
                    case "number":
                    case "boolean":
                    case "string":
                        obj[k] = json[i];
                        break;
                    default:
                        Util.oops("unhandled type");
                        break;
                }
            }
            return true;
        }
*/

        // import json object. Factory creates val or undefined if it should not be imported
        //public importObject(obj: any, json: any, keys: any[], factory: (k: string) => any): boolean {
       //     if (typeof (json) !== "object")
        //        return false;
        //    var keys = Object.keys(json);
         //   return importArray(this, obj, keys.map((k) => json[k]), (n) => keys[n], (n) => {
         //       var val = factory(keys[n]);
         //       if (val !== undefined)
         //           val = [keys[n], val];
         //       return val;
        //    });
       // }
    }
}
