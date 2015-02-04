///<reference path='refs.ts'/>

module TDev.RT {
    export module ArtCache {
        export var runningTests = false;
        function log(s: string) { Util.log("ArtCache: " + s); }
        var getArtCacheTableAsync = () => Storage.getTableAsync("ArtCache");
        export var getMaxItems = () =>
        {
            return TDev.Browser.isMobile ? 25 : 150;
        }
        export var getMaxItemSize = () => {
            return Browser.isMobile ? 500000 : 10000000; // 500Kb max size for mobile, 10mb for desktop
        }

        var itemsToDownload = 0;
        var itemsDownloaded = 0;

        export function resetProgress()
        {
            itemsToDownload = 0;
            itemsDownloaded = 0;
        }

        export var isArtResource = (url: string) : boolean => {
            return /^https:\/\/az31353\.vo\.msecnd\.net\/pub\//i.test(url)
                || /^http:\/\/cdn.touchdevelop.com\/pub\//i.test(url);
        }

        export function responseToDataUrl(response: TDev.RT.WebResponse): string {
            if (typeof response.content() == "string") {
                return "data:text/plain;base64," + Util.base64Encode(Util.toUTF8(response.content()));
            }

            var bytes = response.contentAsArraybuffer(); if (!bytes) return null;
            var contentType = response.header('Content-Type');
            if (!contentType) {
                Util.log('art cache: missing Content-Type');
                return null;
            }
            if (bytes.length > ArtCache.getMaxItemSize()) {
                Util.log('art cache: item too big ' + (bytes.length / 1e6).toFixed(1) + 'Mb');
                return "data:none";
            }
            var encoded = Util.base64EncodeBytes(<number[]><any>bytes);
            return "data:" + contentType + ";base64," + encoded;
        }

        export function snapshotCacheAsync(storage:any)
        {
            return getArtCacheTableAsync()
                .then((table:Storage.Table) => table.getKeysAsync()
                    .then((keys:string[]) =>
                        table.getItemsAsync(keys)
                            .then(v => {
                                storage.artCache = v
                            })
                    ))
        }

        export function restoreCacheAsync(storage:any)
        {
            if (!storage.artCache) return Promise.as()
            return getArtCacheTableAsync()
                .then((table:Storage.Table) => table.getKeysAsync()
                    .then((keys:string[]) => {
                        var toSet = storage.artCache
                        keys.forEach(k => {
                            if (!toSet.hasOwnProperty(k)) toSet[k] = null
                        })
                        return table.setItemsAsync(toSet)
                    }))
        }


        export function getArtAsync(url: string, accept:string = "*") : Promise // of string
        {
            // make sure we have a url and not a data uri
            if (!url || !/^https?:\/\//.test(url)) {
                Util.log('art cache: must be absolute url');
                return Promise.as(null);
            }

            // skip with proxy?
            url = HTML.proxyResource(url);

            var id = url;
            var art = null;
            var table = null;
            return getArtCacheTableAsync()
                .then((t) => {
                    table = t;
                    return table.getValueAsync(id);
                })
                .then((value) => {
                    if (typeof value === "string") {
                        log("art cache: hit " + id);
                        if (value == "data:none") {
                            log("art cache: hit on art too big, streaming " + id);
                            return null;
                        }
                        return value;
                    }
                    log("art cache: miss " + id);
                    var rt = Runtime.theRuntime;
                    itemsToDownload++;

                    if (!Cloud.isOnline()) {
                        Util.log('art cache: no internet')
                        return null;
                    }

                    var request = TDev.RT.WebRequest.mk(url, null);
                    if (accept)
                        request.set_header("Accept", accept)
                    request.show_notifications(false);
                    return request.sendAsync()
                        .then((response: WebResponse) => {
                            itemsDownloaded++;
                            if (!ArtCache.runningTests)
                                ProgressOverlay.setProgress(Util.fmt("{0} of {1} done", itemsDownloaded, itemsToDownload));
                            art = responseToDataUrl(response);
                            if (!art) {
                                Util.log('art cache: request failed ' + id);
                                return null;
                            }
                            // update element list
                            return table.getValueAsync("arttable:keys").then((k) => {
                                if (!k) k = "";
                                var keys = k.split(';');

                                var items = {}
                                items[id] = art;
                                // rudimentary caching
                                var ii = keys.indexOf(id);
                                if (ii > -1) {
                                    keys[ii] = null;
                                    keys = keys.filter(kk => !!kk);
                                }
                                var maxKeys = ArtCache.getMaxItems();
                                while (keys.length > maxKeys) {
                                    items[keys[0]] = null;
                                    keys.shift();
                                    log("art cache: drop " + id);
                                }
                                keys.push(id);
                                items["arttable:keys"] = keys.join(';');
                                return table.setItemsAsync(items);
                            })
                            .then(() => art);
                        });
                })
        }
    }
}
