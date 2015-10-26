///<reference path='refs.ts'/>


module TDev {
    export module ScriptCache {
        function log(s: string) { Util.log("ScriptCache: " + s); }
        var getScriptCacheTableAsync = () => Storage.getTableAsync("ScriptCache");
        export var shippedScripts:any = {};
        export function scriptSource(text:string) : (id:string)=>Promise
        {
            return (id:string) => {
                if (!id) return Promise.as(text);
                else return getScriptAsync(id);
            }
        }

        export function snapshotCacheAsync(storage:any)
        {
            return getScriptCacheTableAsync()
                .then((table:Storage.Table) => table.getKeysAsync()
                    .then((keys:string[]) => {
                        keys = keys.filter(s => /^id-/.test(s))
                        return table.getItemsAsync(keys)
                            .then(v => {
                                storage.scriptCache = v
                            })
                    }))
        }

        export function restoreCacheAsync(storage:any)
        {
            if (!storage.scriptCache) return Promise.as()
            return getScriptCacheTableAsync()
                .then((table:Storage.Table) => table.setItemsAsync(storage.scriptCache))
        }

        export function forcedUpdate(id: string): { text: string; json: any; }
        {
            var libCache = (<any>TDev).shippedLibraryCache
            if (!libCache) return null

            if (libCache && libCache.updates.hasOwnProperty(id)) {
                id = libCache.updates[id]
                return { json: libCache.json[id], text: libCache.text[id] }
            }

            return null
        }
        
        export function shippedLibrariesJson(): StringMap<any>  {
            var libCache: { text: StringMap<string>; json: StringMap<any>; } = (<any>TDev).shippedLibraryCache
            return libCache ? libCache.json : undefined;
        }

        export function getScriptAsync(id: string) : Promise // of string
        {
            if (!Util.check(!!id)) return Promise.as("");

            if (shippedScripts.hasOwnProperty(id)) return Promise.as(shippedScripts[id]);

            var libCache = (<any>TDev).shippedLibraryCache
            if (libCache && libCache.text.hasOwnProperty(id))
                return Promise.as(libCache.text[id])

            return getScriptCacheTableAsync()
                .then((table) => table.getValueAsync("id-" + id))
                .then(function (value) {
                    if (typeof value === "string") {
                        log("cache hit: " + id);
                        return value;
                    }
                    log("cache miss: " + id);
                    return Cloud.getScriptTextAsync(id)
                        .then((value) =>
                            getScriptCacheTableAsync()
                                .then(function (table) {
                                    if (!value) return value; // don't store in the cache
                                    var items = {}
                                    items["id-" + id] = value;
                                    return table.setItemsAsync(items)
                                        .then(() => value);
                                }),
                            (err) => {
                                if (err.status != 404) {
                                    Util.reportError("getScriptAsync", err, false);
                                    return null; // different from "" to indicate (transient?) problem
                                }
                                return "";
                            });
                });
        }
    }
}
