///<reference path='refs.ts'/>


module TDev {
    export module World {
        export function log(s: string) { Util.log("World: " + s); }
        // Filled in from [editor/default.ts]; expects [s] to be a
        // *touchdevelop* script text, not an external editor.
        export var getScriptMeta : (s:string) => any;
        export var sanitizeScriptTextForCloud : (s:string) => string;
        export var waitForUpdate = (id:string) => false;

        // for now disable merge on sync in the lite cloud
        export var disableMerge = true;

        // this is so that the Editor can react to changes made by sync
        // state is: 
        // "uploaded"   - when a new version was sent to the cloud, and we got a new snapshotId
        // "published"  - after a script is published
        // "downloaded" - after a merge, or just plain download
        export var newHeaderCallbackAsync = (h:Cloud.Header, state:string) => Promise.as();
        // this is called before we attempt a merge; the editor should save the state if the guid matches and display
        // a progress overlay until newHeaderCallbackAsync({ guid: guid }, "downloaded") is called
        export var incomingHeaderAsync = (guid:string) => Promise.as();

        var currentUserInfo:any = null;
        var currentUserPromise = new PromiseInv();
        var localStorage = window.localStorage;
        var getIndexTablePromise = () => Storage.getTableAsync("Index");
        var getScriptsTablePromise = () => Storage.getTableAsync("Scripts");
        var getTracesTablePromise = () => Storage.getTableAsync("Traces");

        interface SyncData {
            indexTable: Storage.Table;
            scriptsTable: Storage.Table;
            installedHeaders: Cloud.InstalledHeaders;
            recentUses: any;
            downloaded: any[];
            removed: any[];
            uptodates: any[];
            uploaded: any[];
            keys: string[];
            scriptVersionsInCloudItems: any;
            items: any;
            progress: any;
        }

        export interface ScriptStub {
            // Either "touchdevelop", or another one (external). This is unlike
            // [Cloud.Header] where [editor] is either undefined, or a string
            // (meaning external editor).
            editorName: string;
            // When the editor is "touchdevelop", this is the same value that
            // can be obtained by running [getScriptMeta] on [scriptText].
            scriptName: string;
            // When the editor is "touchdevelop", initially contains a template, then
            // gets mutated by [newScriptAsync] with extra meta information before
            // being saved to storage. When the editor is external, remains blank.
            scriptText: string;
        }


        function getHeader(body: Cloud.Body) : Cloud.Header {
            var x = JSON.parse(JSON.stringify(body));
            delete x.script;
            return x;
        }
        function removeInstalledAsync(indexTable: Storage.Table, scriptsTable: Storage.Table, guid: string) : Promise {
            var headerItem = {}
            headerItem[guid] = undefined;
            var bodyItem = {}
            bodyItem[guid + "-script"] = undefined;
            bodyItem[guid + "-scriptState"] = undefined;
            bodyItem[guid + "-scriptVersionInCloud"] = undefined;
            return Promise.join([indexTable.setItemsAsync(headerItem), scriptsTable.setItemsAsync(bodyItem)]);
        }

        function setInstalledAsync(
            indexTable: Storage.Table,
            scriptsTable: Storage.Table,
            header: Cloud.Header,
            script: string,
            editorState: string,
            scriptState: string,
            cloudScriptVersion: string
        ) : Promise {
            var headerItem = {}
            // In the case of a regular script, we can recover the metadata from
            // the script body. In the case of an external editor, we demand
            // that the caller properly set the metadata.
            if (script && !header.editor && (!header.meta || header.meta.comment === undefined))
                header.meta = getScriptMeta(script);
            if (header.editor && (!header.meta || !header.meta.name)) {
                Util.log("ERROR pre-condition not met for [setInstalledAsync]; bailing");
                debugger;
                return Promise.as();
            }
            headerItem[header.guid] = JSON.stringify(header);
            var bodyItem = {}
            // protz: I believe we can get rid of this assert now that we have
            // external scripts that may start out null...?
            // Util.assert(script !== "")
            if (script != null)
                bodyItem[header.guid + "-script"] = typeof script === "string" ? script : undefined;
            if (editorState != null)
                bodyItem[header.guid + "-editorState"] = typeof editorState === "string" ? editorState : undefined;
            if (scriptState !== null)
                bodyItem[header.guid + "-scriptState"] = typeof scriptState === "string" ? scriptState : undefined;
            if (cloudScriptVersion != null)
                bodyItem[header.guid + "-scriptVersionInCloud"] = typeof cloudScriptVersion === "string" ? cloudScriptVersion : undefined;

            log(header.guid + "/" + header.scriptId + ": " + header.name + " save with base " + header.scriptVersion.baseSnapshot);

            return Promise.join([indexTable.setItemsAsync(headerItem), scriptsTable.setItemsAsync(bodyItem)]);
        }

        function setCloudScriptVersionAsync(scriptsTable: Storage.Table, guid: string, cloudScriptVersion: string) : Promise {
            var bodyItem = {}
            bodyItem[guid + "-scriptVersionInCloud"] = typeof cloudScriptVersion === "string" ? cloudScriptVersion : undefined;
            return scriptsTable.setItemsAsync(bodyItem);
        }

        export function mergeJSON(base:any, local:any, server:any)
        {
            Object.keys(server).forEach(k => {
                if (server[k] && typeof server[k] === "object" && local[k] && typeof local[k] == "object")
                    local[k] = mergeJSON(base[k] || {}, local[k], server[k])
                else if (!local.hasOwnProperty(k) || base[k] === local[k])
                    local[k] = server[k]
            })

            return local
        }

        function mergeEditorStates(base:string, local:string, server:string)
        {
            return JSON.stringify(mergeJSON(JSON.parse(base || "{}"), JSON.parse(local || "{}"), JSON.parse(server || "{}")))
        }

        export var mergeScripts = (base:string, local:string, server:string) => local;

        export function getScriptBlobAsync(snapshotId:string)
        {
            return Util.httpGetJsonAsync(Cloud.config.workspaceUrl + snapshotId)
        }

        export interface ScriptBlob
        {
            script: string;
            editorState: string;
            extra?: any;
        }

        // [header] is coming from the cloud; we need to update our local
        // storage to merge data from the cloud
        function downloadInstalledAsync(indexTable: Storage.Table, scriptsTable: Storage.Table, header: Cloud.Header) : Promise {
            log(header.guid + "/" + header.scriptId + ": " + header.name + " is newer");

            if (Cloud.lite) {
                var theirs:ScriptBlob;
                var baseVer:ScriptBlob;
                var currVer:ScriptBlob;
                var hd:Cloud.Header; // local header
                var skipMsg = false

                return getScriptBlobAsync(header.scriptVersion.baseSnapshot)
                    .then(v => theirs = v)
                    .then(() => incomingHeaderAsync(header.guid))
                    .then(() => indexTable.getValueAsync(header.guid))
                    .then(str => hd = str ? JSON.parse(str) : null)
                    .then(() => {
                        // [hd] is the local header; if the [instanceId] is "cloud", then no local modifications were performed, i.e. the
                        // local header is *exactly* baseSnapshot
                        var touch = () => {
                            header.scriptVersion.instanceId = Cloud.getWorldId()
                            header.scriptVersion.time = getCurrentTime();
                            header.scriptVersion.version++;
                            header.status = "unpublished";
                        }
                        if (hd && hd.scriptVersion.instanceId != "cloud" && hd.scriptVersion.baseSnapshot && hd.scriptVersion.baseSnapshot != header.scriptVersion.baseSnapshot) {
                            if (disableMerge) {
                                touch()
                                skipMsg = true
                                // setInstalledAsync() will not update to null
                                return <ScriptBlob>{ script: null, editorState: null }
                            }
                            // We need to merge, because there's been a fork.  The base header is [hd.scriptVersion.baseSnapshot], "theirs" is
                            // [header], and "mine" is [hd].
                            log(header.guid + "/" + header.scriptId + ": " + header.name + " merging based on " + hd.scriptVersion.baseSnapshot);
                            return getScriptBlobAsync(hd.scriptVersion.baseSnapshot)
                                .then(r => { baseVer = r })
                                // Note: the [guid] is the same for both [header] and [hd].  The line below is getting the local script.
                                .then(() => incomingHeaderAsync(header.guid))
                                .then(() => scriptsTable.getItemsAsync([header.guid + "-script", header.guid + "-editorState"]))
                                .then(r => { currVer = { script: r[header.guid + "-script"], editorState: r[header.guid + "-editorState"] } })
                                .then(() => {
                                    if (header.editor) {
                                        var ret:ScriptBlob = {
                                            script: currVer.script,
                                            editorState: currVer.editorState,
                                            // This must be exactly an <External.PendingMerge>
                                            extra: {
                                                theirs: {
                                                    scriptText: theirs.script,
                                                    editorState: theirs.editorState,
                                                    baseSnapshot: header.scriptVersion.baseSnapshot,
                                                    metadata: header.meta,
                                                },
                                                base: {
                                                    scriptText: baseVer.script,
                                                    editorState: baseVer.editorState,
                                                    baseSnapshot: hd.scriptVersion.baseSnapshot,
                                                    metadata: hd.meta,
                                                },
                                            }
                                        };
                                        // Don't update the header: merely record the fact that we've seen a new version go by from the cloud,
                                        // and record in the extra field the contents of that version (so that we don't have to hit the cloud
                                        // again to get it later on).
                                        var newVersion = header.scriptVersion.baseSnapshot;
                                        header = hd; // FIXME properly pass a value instead of updating in-place, so that we don't have to bind ret before
                                        header.pendingMerge = newVersion;
                                        return ret;
                                    } else {
                                        // Our new header is the one that we took in from the cloud, except that some modifications were
                                        // performed.  Hence, we modify the [instanceId] so that it no longer says "cloud". Since the
                                        // [baseSnapshot] is still the one from the cloud header, this means that we've been creating a new
                                        // version *on top of* the cloud header. This new version has not been synced to the cloud, and
                                        // therefore does not have a [baseSnapshot] yet.
                                        touch()
                                        return <ScriptBlob>{
                                            script:      mergeScripts(baseVer.script, currVer.script, theirs.script),
                                            editorState: mergeEditorStates(baseVer.editorState, currVer.editorState, theirs.editorState),
                                        }
                                    }
                                })
                        } else {
                            return theirs
                        }
                    })
                    .then(resp =>
                        setInstalledAsync(indexTable, scriptsTable, header, resp.script, resp.editorState, null, JSON.stringify(resp.extra || {})))
                    .then(() => skipMsg ? Promise.as() : newHeaderCallbackAsync(header, "downloaded"))
                    .then(() => header.scriptVersion.instanceId == "cloud" ? Promise.as() : uploadInstalledAsync(indexTable, scriptsTable, header))
            }

            return Cloud.getUserInstalledBodyAsync(header.guid).then(function (installedBodies: Cloud.InstalledBodies) {
                var body = <Cloud.Body>undefined;
                installedBodies.bodies.forEach(function (b) { if (b.guid == header.guid) body = b; });
                if (body) {
                    var cloudScriptVersion = JSON.stringify(header.scriptVersion);
                    if (body.status == "published")
                        return ScriptCache.getScriptAsync(body.scriptId)
                            .then((script) => script == null // transient download error?
                                ? Promise.as() // ignore
                                : script == "" // published script deleted in cloud? (rare, but possible)
                                ? setInstalledAsync(indexTable, scriptsTable, uninstall(getHeader(body)), undefined, undefined, null, null)
                                : setInstalledAsync(indexTable, scriptsTable, getHeader(body), script, body.editorState, null, cloudScriptVersion));
                    else if (body.script == "") // unpublished script deleted in cloud? (not sure how possible, but observed in practice)
                        return setInstalledAsync(indexTable, scriptsTable, uninstall(getHeader(body)), undefined, undefined, null, null);
                    else
                        return setInstalledAsync(indexTable, scriptsTable, getHeader(body), body.script, body.editorState, null, cloudScriptVersion);
                }
                else
                    return removeInstalledAsync(indexTable, scriptsTable, header.guid);
            });
        }

        function publishInstalledAsync(indexTable: Storage.Table, scriptsTable: Storage.Table, header: Cloud.Header) : Promise {
            log(header.guid + "/" + header.scriptId + ": " + header.name + " is to be published");
            return indexTable.getValueAsync(header.guid)
            .then(resp => { header = JSON.parse(resp) })
            .then(() => Cloud.postUserInstalledPublishAsync(header.guid, header.publishAsHidden, JSON.stringify(header.scriptVersion), header.meta))
            .then(function (installedBodies: Cloud.InstalledBodies) {
                var body = <Cloud.Body>undefined;
                installedBodies.bodies.forEach(function (b) { if (b.guid == header.guid) body = b; });
                if (!body) return undefined;
                var cloudScriptVersion = JSON.stringify(header.scriptVersion);
                // do not delete state on publication; make sure we don't override body with ""
                var hd = getHeader(body)
                return setInstalledAsync(indexTable, scriptsTable, hd, body.script || null, body.editorState || null, null, cloudScriptVersion)
                    .then(() => newHeaderCallbackAsync(hd, "published"))
                    .then(() => []) // non-null result
            })
            .then((r) => r, (e) => {
                if (e.status == 400) {
                    ModalDialog.info("cannot publish",
                        "Your script '" + header.name + "' cannot be published. Error message: " + (e.errorMessage || "not available"))
                    getInstalledHeaderAsync(header.guid).then((header:Cloud.Header) => {
                        if (header.status == "tobepublished") {
                            header.status = "unpublished";
                            return setInstalledAsync(indexTable, scriptsTable, header, null, null, null, null)
                        } else return Promise.as();
                    }).done();
                }
                throw e;
            });
        }

        function uploadInstalledAsync(indexTable: Storage.Table, scriptsTable: Storage.Table, header: Cloud.Header): Promise { // of PostUserInstalledResponse
            // A conservative estimate of the version we are saving. We compare all three fields at
            // the same time. (It may be the case that in-between the various asynchronous steps
            // below, a newer version gets written and it's innocuous, but we err on the safe side.)
            var conservativeVersion = JSON.stringify(header.scriptVersion);
            log(header.guid + "/" + header.scriptId + ": " + header.name + " is dirty, attempting to save version " + conservativeVersion);
            if (header.pendingMerge) {
                log(header.guid + "/" + header.scriptId + ": " + header.name + " is pending merge resolution, skipping");
                return Promise.as();
            }
            return Promise.join({
                script: scriptsTable.getValueAsync(header.guid + "-script"),
                editorState: scriptsTable.getValueAsync(header.guid + "-editorState")
            }).then(function (data) {
                var body = <Cloud.Body>JSON.parse(JSON.stringify(header));
                if (!Cloud.lite && body.status == "published")
                    body.script = "";
                else if ((Cloud.lite && body.status == "published") || body.status == "unpublished" || body.status == "tobepublished") {
                    body.script = sanitizeScriptTextForCloud(data.script);
                    if (body.status == "tobepublished")
                        body.status = "unpublished";
                }
                else
                    body.script = undefined;
                body.editorState = data.editorState;
                if (Cloud.lite && disableMerge) {
                    body.scriptVersion.baseSnapshot = "*"
                }
                return Cloud.postUserInstalledAsync(<Cloud.InstalledBodies>{ bodies: [body] })
                    .then(resp => {
                        if (Cloud.lite && !resp.numErrors) {
                            var header = resp.headers[0]
                            if (!header.editor && body.script)
                                header.meta = getScriptMeta(body.script)
                            // [setInstalledAsync] is not interrupted until it performs the
                            // actual call to [setItemsAsync], so that's the right time to check
                            // whether the version has changed in the meanwhile. This check
                            // assumes that all clients of the [World] module are well-behaved
                            // and always call [updateInstalledAsync], which takes care of
                            // bumping the version number in a monotonic fashion.
                            return getInstalledHeaderAsync(header.guid).then((h: Cloud.Header) => {
                                var currentVersion = JSON.stringify(h.scriptVersion);
                                // This should be equal or greater than currentVersion. Anything
                                // else means I've missed something!
                                log("actually saving? version is now "+currentVersion);
                                if (currentVersion != conservativeVersion) {
                                    // Someone wrote a new version in local storage; so all we
                                    // remember is that this local version now needs to be saved on
                                    // top of the newer version that's in the cloud. Client code
                                    // must retry to save.
                                    h.scriptVersion.baseSnapshot = resp.headers[0].scriptVersion.baseSnapshot;
                                    resp.retry = true;
                                    return setInstalledAsync(indexTable, scriptsTable, h, null, null, null, null)
                                        .then(() => resp)
                                } else {
                                    // That header in the cloud is fine, that's our new header.
                                    return setInstalledAsync(indexTable, scriptsTable, header, null, null, null, null)
                                        .then(() => resp)
                                }
                            })
                            .then(resp => newHeaderCallbackAsync(resp.headers[0], "uploaded").then(() => resp));
                        }
                        return Promise.as(resp)
                    })
            });
        }

        function recentUsesInstalledAsync(headers: Cloud.Header[]): Promise { // of PostUserInstalledResponse
            return Cloud.postUserInstalledAsync(<Cloud.InstalledBodies>{ recentUses: headers.map(h => <Cloud.RecentUse>{ guid: h.guid, recentUse: h.recentUse }) });
        }
        var syncVersion = undefined;
        var continuouslySyncVersion = undefined;
        var syncCount = 0;
        export function cancelSync() {
            syncVersion = undefined;
        }
        export function syncIsActive()
        {
            return !!syncVersion;
        }
        export function cancelContinuouslySync() {
            if (continuouslySyncVersion) {
                continuouslySyncVersion = undefined;
                cancelSync();
            }
        }

        var updateCache:any = null
        var addUpdates:any = {}
        export var onNewNotificationChanged: (newNotifications: number) => void = undefined;

        export var _askEmail: boolean = false;
        export var _askToEnableEmailNewsletter: boolean = false;
        export var _askToEnableEmailNotifications: boolean = false;
        export var _askToEnableNotifications: boolean = false;
        export var _profileIndex: number = 0;
        export var _profileCount: number = 0;

        export function continuouslySyncAsync(m: boolean, onSyncedAsync: () => Promise = undefined) {
            if (continuouslySyncVersion) return Promise.as(); // continuouslySync still going on
            return internalContinuouslySyncAsync(m, onSyncedAsync, continuouslySyncVersion = new Object());
        }
        function internalContinuouslySyncAsync(m: boolean, onSyncedAsync: () => Promise , myContinuouslySyncVersion: any) {
            var v = lastV;
            if (myContinuouslySyncVersion == continuouslySyncVersion && v)
                return syncAsync(false, v, m).then(() => {
                    var p = Promise.as();
                    if (myContinuouslySyncVersion == continuouslySyncVersion) {
                        if (onSyncedAsync && v != lastV) p = p.then(() => onSyncedAsync());
                        p = p.then(() => Promise.delay(2000, () =>
                            internalContinuouslySyncAsync(m, onSyncedAsync, myContinuouslySyncVersion)));
                    }
                    return p;
                });
            else
                return Promise.as();
        }

        export function getCurrentUserInfoAsync()
        {
            if (currentUserInfo) return Promise.as(currentUserInfo)
            else return currentUserPromise;
        }

        var lastV;
        export function syncAsync(uploadRecentUses: boolean = true, v: number = undefined, m: boolean = false,
                                  onNotLoggedIn: () => void = undefined,
                                  onBadTime: (number) => void = undefined,
                                  onAskBeta: () => void = undefined,
                                  onAskSomething: (AskSomething) => void = undefined,
                                  onNoOtherAsk: () => void = undefined): Promise // of string --- undefined: success; some text: we hit an error (no internet, not yet logged in, too much posted...); you can try again later
        {
            var totalCounter = TDev.RT.Perf.start("syncasync", true);
            var last = TDev.RT.Perf.start("startsync");
            function time(name: string) {
                if (!v) TDev.RT.Perf.stop(last);
                last = TDev.RT.Perf.start(name);
            }
            if (syncCount > 0 && window.applicationCache.status == window.applicationCache.IDLE) {
                try {
                    window.applicationCache.update();
                } catch (e) {
                }
            }
            time("appcache");

            syncCount++;

            if (Cloud.isOffline()) {
                var message = "cannot sync - you appear to be offline";
                HTML.showProgressNotification(v ? undefined : message);
                return Promise.as(message);
            }
            time("isonline");

            var mySyncVersion = new Object();
            syncVersion = mySyncVersion;
            var canceled = Promise.wrapError("canceled");
            log("starting sync");

            localStorage.removeItem("editorScriptToSaveDirty");

            var pendingDownloads = 0;
            var pendingUploads = 0;
            var pendingPublishs = 0;
            var progress = function (deltaDownloads: number, deltaUploads: number, deltaPublishs: number) {
                if (syncVersion != mySyncVersion) return;
                pendingDownloads += deltaDownloads;
                pendingUploads += deltaUploads;
                pendingPublishs += deltaPublishs;
                var a = []
                if (pendingDownloads) a.push(pendingDownloads + " down");
                if (pendingUploads) a.push(pendingUploads + " up");
                if (pendingPublishs) a.push(pendingPublishs + " publish");
                var s = "syncing...";
                if (a.length > 0) {
                    s += " (" + a.join(", ") + ")";
                    HTML.showProgressNotification(s, false);
                }
            };
            progress(0, 0, 0);

            var tobepublished = []
            var newerHeaders = []
            var deletedHeaders = []
            var uptodates = []
            var dirtyHeaders = [];

            var askBeta = false;
            var askSomething = null;
            return (v ? Cloud.getUserInstalledLongAsync(v, m) : Cloud.getUserInstalledAsync()).then(installedHeaders =>
            {
                if (syncVersion != mySyncVersion) return canceled;
                return Promise.join({
                    installedHeaders: installedHeaders,
                    indexTable: getIndexTablePromise(),
                    scriptsTable: getScriptsTablePromise()
                });
            }, e =>
            {
                if (e.status == 204 || // NoContent
                    false)
                    // This triggers randomly on flaky connections and such
                    // We're very rarely really not logged in nowadays
                    // v && Cloud.isOnline() && /localhost/.test(document.URL) && e.status == 0 // because of CORS on localhost when not logged in yet
                {
                    mySyncVersion = new Object();
                    return canceled;
                }
                throw e;
            }).then(function (data: SyncData) {
                time("opendb+user/installed");
                if (syncVersion != mySyncVersion) return canceled;
                var user = data.installedHeaders.user;
                if (user) {
                    currentUserInfo = user;
                    if (currentUserPromise) {
                        currentUserPromise.success(user);
                        currentUserPromise = null;
                    }
                }
                var min = data.installedHeaders.minimum;
                lastV = data.installedHeaders.v;
                if (min && Cloud.currentReleaseId && min < Cloud.currentReleaseId) {
                    if (waitForUpdate(min)) {
                        syncVersion = new Object()
                        return;
                    }
                }
                if (onNewNotificationChanged) onNewNotificationChanged(data.installedHeaders.newNotifications);
                if (Runtime.offerNotifications()) {
                    var notifications = data.installedHeaders.notifications;
                    if (Runtime.refreshNotifications) Runtime.refreshNotifications(notifications);
                    _askToEnableNotifications = !notifications;
                }
                _askEmail = !data.installedHeaders.email;
                _askToEnableEmailNewsletter = !data.installedHeaders.emailNewsletter;
                _askToEnableEmailNotifications = !data.installedHeaders.emailNotifications;
                _profileIndex = data.installedHeaders.profileIndex || 0;
                _profileCount = data.installedHeaders.profileCount || 0;
                if (data.installedHeaders.blobcontainer)
                    Cloud.config.workspaceUrl = data.installedHeaders.blobcontainer
                Random.addCloudEntropy(data.installedHeaders.random)
                if (!Cloud.lite && data.installedHeaders.time) {
                    var now = new Date().getTime();
                    var seconds = (now - data.installedHeaders.time * 1000) / 1000;
                    if (Math.abs(seconds) > 120) {
                        HTML.showProgressNotification(v ? undefined : "syncing canceled.");
                        syncVersion = undefined;
                        if (onBadTime) onBadTime(seconds);
                        return;
                    }
                }
                if (data.installedHeaders.askBeta && World.switchToChannel) askBeta = true;
                askSomething = data.installedHeaders.askSomething;
                updateCache = {}
                data.installedHeaders.headers.forEach((hd) => {
                    if (hd.updateId && hd.scriptId != hd.updateId && hd.updateTime > hd.scriptTime)
                        updateCache[hd.scriptId] = hd.updateId;
                });
                localStorage["updateCacheForInstalled"] = JSON.stringify(updateCache);
                data.keys = <any>data.indexTable.getKeysAsync();
                return Promise.join(data);
            }).then(function (data: SyncData) {
                time("readdb1");
                if (syncVersion != mySyncVersion) return canceled;
                data.items = data.indexTable.getItemsAsync(data.keys)
                if (!Cloud.lite)
                    data.scriptVersionsInCloudItems = data.scriptsTable.getItemsAsync(data.keys.map((guid) => guid + "-scriptVersionInCloud"));
                return Promise.join(data);
            }).then(function (data/*: SyncData*/) {
                time("readdb2");
                if (syncVersion != mySyncVersion) return canceled;
                var recentUses = []
                var newerOrDeletedGuids: any = {};
                (<SyncData>data).installedHeaders.headers.forEach(function (header) {
                    var existingItem = data.items[header.guid];
                    var isNewer = true;
                    if (existingItem) {
                        var existingHeader = <Cloud.Header>JSON.parse(existingItem);
                        if (Cloud.lite) {
                            isNewer = header.scriptVersion.baseSnapshot != existingHeader.scriptVersion.baseSnapshot
                                && header.scriptVersion.baseSnapshot != existingHeader.pendingMerge;
                            if (existingHeader.status == "deleted")
                                isNewer = false
                            if (!isNewer && existingHeader.scriptVersion.instanceId == "cloud" &&
                                header.status == "published" && existingHeader.status == "unpublished")
                                isNewer = true;
                        } else
                            isNewer = Cloud.isVersionNewer(header.scriptVersion, existingHeader.scriptVersion);
                        if (header.recentUse < existingHeader.recentUse)
                            recentUses.push(existingHeader);
                    }
                    if (isNewer) {
                        newerOrDeletedGuids[header.guid] = true;
                        if (header.status === "deleted") {
                            if (existingItem)
                                deletedHeaders.push(header);
                        } else {
                            newerHeaders.push(header);
                        }
                    }
                    else {
                        var cloudScriptVersion = JSON.stringify(header.scriptVersion);
                        var uptodate = Promise.as();
                        if (!Cloud.lite && data.scriptVersionsInCloudItems[header.guid + "-scriptVersionInCloud"] !== cloudScriptVersion)
                            uptodate = uptodate.then(() => setCloudScriptVersionAsync(data.scriptsTable, header.guid, cloudScriptVersion));
                        if (header.recentUse > existingHeader.recentUse)
                            uptodate = uptodate.then(() => recentUseAsync(data.indexTable, header.guid, header.recentUse));
                        uptodates.push(uptodate)
                    }
                });
                (<SyncData>data).keys.forEach(function (key) {
                    var header = <Cloud.Header>JSON.parse(data.items[key]);
                    if (newerOrDeletedGuids[header.guid]) return;
                    if (header.status === "tobepublished") tobepublished.push(header);
                    var isDirty = true;
                    if (Cloud.lite) {
                        isDirty = header.scriptVersion.instanceId != "cloud"
                    } else {
                        var s = data.scriptVersionsInCloudItems[key + "-scriptVersionInCloud"];
                        if (s) {
                            var cloudScriptVersion = <Cloud.Version>JSON.parse(s);
                            if (!Cloud.isVersionNewer(header.scriptVersion, cloudScriptVersion)) isDirty = false;
                        }
                    }
                    if (isDirty) dirtyHeaders.push(header);
                });
                log(recentUses.length + " items with newer recentUses");
                log(newerHeaders.length + " newer items to download, " + deletedHeaders.length + " deleted items");
                log(dirtyHeaders.length + " items to upload");

                progress(newerHeaders.length, dirtyHeaders.length, tobepublished.length);
                if (recentUses.length > 0 && uploadRecentUses)
                    data.recentUses = recentUsesInstalledAsync(recentUses);
                return Promise.join(data);
            }).then(function (data/*: SyncData*/) {
                // It's unclear how [data] is used from then on, because it is
                // just discarded two steps below. Perhaps we assign the
                // properties to prevent some promises from being
                // garbage-collected until we move on to the next step?
                time("diff");
                data.downloaded = Promise.thenEach(newerHeaders, (h: Cloud.Header) => {
                    if (syncVersion != mySyncVersion) return canceled;
                    return downloadInstalledAsync(data.indexTable, data.scriptsTable, h).then(() => { progress(-1, 0, 0) });
                });
                data.removed = Promise.thenEach(deletedHeaders, (h: Cloud.Header) => {
                    if (syncVersion != mySyncVersion) return canceled;
                    return removeInstalledAsync(data.indexTable, data.scriptsTable, h.guid);
                });
                data.uploaded = Promise.thenEach(dirtyHeaders, (h: Cloud.Header) => {
                    if (syncVersion != mySyncVersion) return canceled;
                    return uploadInstalledAsync(data.indexTable, data.scriptsTable, h).then(() => { progress(0, -1, 0) });
                });
                data.uptodates = Promise.join(uptodates);
                return Promise.join(data);
            }).then(function (data/*: SyncData*/) {
                time("download+upload");
                if (syncVersion != mySyncVersion) return canceled;
                data.tobepublished = Promise.thenEach(tobepublished, (header) => publishInstalledAsync(data.indexTable, data.scriptsTable, header).then(result => {
                    progress(0, 0, -1);
                    if (!result)
                        ModalDialog.info("publishing failed", "There was a versioning mismatch between your local state and the cloud. Please check the content of the script you want to publish and then try again.");
                }));
                data.progress = Cloud.postPendingProgressAsync();
                return Promise.join(data);
            }).then(() => {
                time("publish");
                if (!v) TDev.RT.Perf.stop(totalCounter);
                if (syncVersion != mySyncVersion) return;
                syncVersion = undefined;
                HTML.showProgressNotification(v ? undefined : "syncing done", true, 0, 1000);
                if (askBeta && onAskBeta && !/localhost/.test(window.location.href)) onAskBeta();
                else if (askSomething && onAskSomething) onAskSomething(askSomething);
                else if (onNoOtherAsk) onNoOtherAsk();
                return undefined;
            }, function (e) {
                if (syncVersion != mySyncVersion) return;
                syncVersion = undefined;
                var status = e.status
                var errorMessage = e.errorMessage
                if (!status) Object.keys(e).forEach(k => {
                    var f = e[k];
                    if (!f) return;
                    if (f.status) status = f.status;
                    if (f.errorMessage) errorMessage = f.errorMessage;
                    if (typeof f == "object")
                        Object.keys(f).forEach(l => {
                            var g = f[l];
                            if (!g) return;
                            if (g.status) status = g.status;
                            if (g.errorMessage) errorMessage = g.errorMessage;
                        });
                });
                var info = "";
                if (status || errorMessage)
                    info = " (code " + status + (errorMessage ? (": " + errorMessage) : "") + ")";
                Util.log('nosync: ' + info);
                if (Util.navigatingAway) {
                    HTML.showProgressNotification(undefined);
                    return undefined;
                } else if (status == 400) {
                    var message = lf("Cloud precondition violated") + info;
                    HTML.showProgressNotification(message)
                    return message;
                }
                else if (status == 503) {
                    var message = lf("Did you post a lot recently? You must wait for one hour before you can post more.") + info;
                    HTML.showProgressNotification(message);
                    return message;
                }
                else if (status == 403)
                    //(Cloud.isOnline() && /localhost/.test(document.URL)) // because of CORS on localhost when not logged in yet
                {
                    var message = status == 403
                        ? Cloud.hasAccessToken()
                            ? onNotLoggedIn
                                ? lf("cannot sync - your access token has expired and will renew automatically") + info
                                : lf("cannot sync - your access token has expired") + info
                            : lf("cannot sync - you are not signed in") + info
                        : lf("cannot sync") + info;
                    HTML.showProgressNotification(message)
                    if (status == 403)
                        Cloud.setAccessToken(undefined);
                    if (onNotLoggedIn) onNotLoggedIn();
                    return message;
                }
                else if (!Cloud.isTouchDevelopOnline()) {
                    var message = lf("cannot sync - you are in offline mode");
                    HTML.showProgressNotification(v ? undefined : message);
                    return message;
                } else {
                    var message = lf("cannot sync - are you offline?") + info;
                    HTML.showProgressNotification(v ? undefined : message);
                    return message;
                }
                // TDev.World.log("ERROR" + (!!e ? JSON.stringify(e) : "undefined"));
            });
        }
        export function saveAsync(guid: string, onNotLoggedIn: () => void = undefined, onBadTime: (number) => void = undefined): Promise // of PostUserInstalledResponse
        {
            if (!Cloud.getUserId() || Cloud.isOffline()) {
                Util.log('save skipped: not auth or offline');
                return Promise.as();
            }

            var mySyncVersion = new Object();
            syncVersion = mySyncVersion;
            var canceled = Promise.wrapError("canceled");
            log("starting save");

            return Promise.join({
                indexTable: getIndexTablePromise(),
                scriptsTable: getScriptsTablePromise(),
                header: getInstalledHeaderAsync(guid)
            }).then(function (data) {
                if (syncVersion != mySyncVersion) return;
                return uploadInstalledAsync(data.indexTable, data.scriptsTable, data.header);
            }).then(function (result) {
                if (syncVersion != mySyncVersion) return;
                syncVersion = undefined;
                HTML.showSaveNotification(result.numErrors ? lf("problems saving!") : lf("saved"));
                return result;
            }, function (e) {
                if (syncVersion != mySyncVersion) return;
                syncVersion = undefined;
                var status = e.status
                var errorMessage = e.errorMessage
                var info = "";
                if (status || errorMessage)
                    info = " (code " + status + (errorMessage ? (": " + errorMessage) : "") + ")";
                if (status == 400)
                    throw new Error("Cloud precondition violated" + info);
                else if (status == 403 ||
                    (Cloud.isOnline() && /localhost/.test(document.URL))) // because of CORS on localhost when not logged in yet
                    {
                    HTML.showSaveNotification("could not save - you are not signed in (" + status + ")", 500);
                    if (status == 403)
                        Cloud.setAccessToken(undefined);
                    if (onNotLoggedIn) onNotLoggedIn();
                }
                else
                    HTML.showSaveNotification("cannot back up to cloud - you appear to be offline");
            });
        }
        function uninstall(header: Cloud.Header) {
            header.scriptVersion = <Cloud.Version>{ instanceId: Cloud.getWorldId(), version: 2147483647, time: 253402300799, baseSnapshot: header.scriptVersion.baseSnapshot };
            header.status = "deleted";
            return header;
        }
        export function uninstallAsync(guid: string) : Promise // of void
        {
            if (!Util.check(!!guid)) return Promise.as(undefined);
            log("starting uninstall of " + guid);
            return Promise.join({
                indexTable: getIndexTablePromise(),
                scriptsTable: getScriptsTablePromise(),
            }).then(function (data/*: SyncData*/) {
                data.items = data.indexTable.getItemsAsync([guid]);
                return Promise.join(data);
            }).then(function (data/*: SyncData*/) {
                var h = data.items[guid];
                if (!h) return undefined; // already uninstalled?
                var header = uninstall(<Cloud.Header>JSON.parse(h));
                return setInstalledAsync(data.indexTable, data.scriptsTable, header, undefined, undefined, null, null);
            });
        }
        export function publishAsync(guid: string, hidden:boolean) : Promise // of void
        {
            if (!Util.check(!!guid)) return Promise.as(undefined);
            log("starting publishing of " + guid);
            return Promise.join({
                indexTable: getIndexTablePromise()
            }).then(function (data/*: SyncData*/) {
                data.items = data.indexTable.getItemsAsync([guid]);
                return Promise.join(data);
            }).then(function (data/*: SyncData*/) {
                var h = data.items[guid];
                if (!h) return undefined; // uninstalled?
                var header = <Cloud.Header>JSON.parse(h);
                if (header.status !== "unpublished") return undefined;
                header.status = "tobepublished";
                header.publishAsHidden = hidden;
                var headerItem = {};
                headerItem[header.guid] = JSON.stringify(header);
                return data.indexTable.setItemsAsync(headerItem);
            });
        }
        export function recentUseAsync(indexTable: any, guid: string, recentUse: number) : Promise // of void
        {
            if (!Util.check(!!guid)) return Promise.as(undefined);
            return Promise.join({
                items: indexTable.getItemsAsync([guid])
            }).then(function (data/*: SyncData*/) {
                var h = data.items[guid];
                if (!h) return undefined; // uninstalled?
                var header = <Cloud.Header>JSON.parse(h);
                if (header.recentUse < recentUse) header.recentUse = recentUse;
                var headerItem = {};
                headerItem[header.guid] = JSON.stringify(header);
                return indexTable.setItemsAsync(headerItem);
            });
        }
        export function getCurrentTime() {
            return Math.floor(new Date().getTime()/1000);
        }
        function installAsync(status: string, scriptId: string, userId: string, stub: ScriptStub) : Promise // of Cloud.Header
        {
            var meta;
            if (stub.editorName == "touchdevelop") {
                meta = getScriptMeta(stub.scriptText);
                // This is mandatory: since [setInstalledAsync] uses the
                // [scriptText] to save data, there's no way we can switch to a
                // different name at this stage.
                Util.assert(meta.name.trim() == stub.scriptName.trim());
                // For compatibility with old cloud entries, we now switch to
                // the semantics "falsy [editor] field for [Cloud.Header] means
                // TouchDevelop editor".
                stub.editorName = "";
            } else {
                meta = {
                    localGuid: Util.guidGen(),
                    name: stub.scriptName,
                };
            }
            var h = <Cloud.Header>(<any>{
                status: status,
                scriptId: scriptId,
                userId: userId,
                meta: meta,
                name: meta.name,
                scriptVersion: <Cloud.Version>{instanceId: Cloud.getWorldId(), version: 0, time: getCurrentTime(), baseSnapshot: "" },
                guid: meta.localGuid,
                editor: stub.editorName,
            });
            Util.assert(!!h.guid);
            return Promise.join({
                indexTable: getIndexTablePromise(),
                scriptsTable: getScriptsTablePromise(),
            }).then(function (data/*: SyncData*/) {
                return setInstalledAsync(data.indexTable, data.scriptsTable, h, stub.scriptText, null, null, null).then(() => h);
            });
        }
        export function installPublishedAsync(scriptId: string, userId: string) : Promise // of Cloud.Header
        {
            if (!Util.check(!!scriptId)) return Promise.as(undefined);
            return getInstalledAsync().then(function (items) {
                var guids = Object.keys(items);
                var matchingGuids = guids.filter(function (guid) {
                    var item = items[guid];
                    return item.status == "published" && item.scriptId == scriptId;
                });
                if (matchingGuids.length > 0)
                    return items[matchingGuids[0]];
                return Promise.join({
                    text: ScriptCache.getScriptAsync(scriptId),
                    json: (<any>Browser).TheApiCacheMgr.getAsync(scriptId, true),
                }).then(data => {
                    var text: string = data.text;
                    var json = data.json;
                    if (!text) {
                        HTML.showErrorNotification("cannot get script /" + scriptId);
                        return new PromiseInv(); // stall
                    } else {
                        return installAsync("published", scriptId, userId, {
                            scriptText: text,
                            // This is a script stub that uses the different
                            // convention
                            editorName: json.editor || "touchdevelop",
                            scriptName: json.name,
                        });
                    }
                });
            });
        }
        export function installUnpublishedAsync(baseScriptId: string, baseUserId: string, stub: ScriptStub) : Promise // of Cloud.Header
        {
            return installAsync("unpublished", baseScriptId, baseUserId, stub);
        }
        export function getInstalledAsync() : Promise // yields object whose keys are guids, and the values are Headers
        {
            return Promise.join({
                indexTable: getIndexTablePromise(),
                scriptsTable: getScriptsTablePromise(),
            }).then(function (data/*: SyncData*/) {
                data.keys = data.indexTable.getKeysAsync();
                return Promise.join(data);
            }).then(function (data: SyncData) {
                return data.indexTable.getItemsAsync(data.keys).then((items) => Promise.thenEach(items, (v) => JSON.parse(v)));
            });
        }
        export function getInstalledHeaderAsync(guid: string) : Promise // of Cloud.Header
        {
            if (!Util.check(!!guid)) return Promise.as(undefined);
            return getIndexTablePromise().then((indexTable) => indexTable.getValueAsync(guid)).then((s) => s ? JSON.parse(s) : undefined);
        }
        export function getInstalledScriptAsync(guid: string) : Promise // of string (script text)
        {
            if (!Util.check(!!guid)) return Promise.as(undefined);
            return getScriptsTablePromise().then((scriptsTable) => scriptsTable.getValueAsync(guid + "-script"));
        }
        export function getInstalledEditorStateAsync(guid: string) : Promise // of string (script text)
        {
            if (!Util.check(!!guid)) return Promise.as(undefined);
            return getScriptsTablePromise().then((scriptsTable) => scriptsTable.getValueAsync(guid + "-editorState"));
        }
        export function getInstalledScriptVersionInCloud(guid: string) : Promise // of string
        {
            if (!Util.check(!!guid)) return Promise.as(undefined);
            return getScriptsTablePromise().then((scriptsTable) => scriptsTable.getValueAsync(guid + "-scriptVersionInCloud"));
        }
        export function getAnyScriptAsync(guid: string) : Promise // of string (script text)
        {
            if (/-/.test(guid)) return getInstalledScriptAsync(guid);
            else return ScriptCache.getScriptAsync(guid);
        }
        export function getInstalledScriptsAsync(guids: string[]) : Promise // of guid => string (script text)
        {
            return getScriptsTablePromise().then((scriptsTable) =>
                scriptsTable.getItemsAsync(guids.map((g) => g + "-script")).then((map) => {
                    var r = {}
                    guids.forEach((g) => {
                        r[g] = map[g + "-script"]
                    })
                    return r;
                })
            );
        }

        export function getScriptRestoreAsync(guid:string)
        {
            var d = null

            return Promise.join({
                indexTable: getIndexTablePromise(),
                scriptsTable: getScriptsTablePromise(),
            }).then(function (data/*: SyncData*/) {
                d = data
                return Promise.join([
                    data.indexTable.getValueAsync(guid),
                    data.scriptsTable.getItemsAsync([
                            guid + "-scriptVersionInCloud",
                            guid + "-editorState",
                            guid + "-script"
                    ])])
            }).then(resp => {
                var hd = {}
                hd[guid] = resp[0]
                var entries = resp[1]
                return () => Promise.join([d.indexTable.setItemsAsync(hd), d.scriptsTable.setItemsAsync(entries)])
            })
        }

        export function setInstalledScriptAsync(
            header: Cloud.Header,
            script: string,
            editorState: string,
            scriptState: string = null,
            scriptVersionInCloud = null
        ) : Promise // of void
        {
            if (!Util.check(!!header)) return Promise.as(undefined);
            log("setting " + header.guid);
            return Promise.join({
                indexTable: getIndexTablePromise(),
                scriptsTable: getScriptsTablePromise(),
            }).then(function (data/*: SyncData*/) {
                return setInstalledAsync(data.indexTable, data.scriptsTable, header, script, editorState, scriptState, scriptVersionInCloud);
            });
        }

        /*
        export function triggerCrash(id:string)
        {
            getScriptsTablePromise().then(tbl => {
                var s = {}
                s[id + "-script"] = ""
                return tbl.setItemsAsync(s);
            }).done();
        }
        */

        function initUpdateCache()
        {
            if (!updateCache) {
                var s = localStorage["updateCacheForInstalled"]
                updateCache = s ? JSON.parse(s) : {}
            }
        }

        export function rememberUpdate(id:string, update:string)
        {
            addUpdates[id] = update;
        }

        export function updateFor(h:Cloud.Header)
        {
            initUpdateCache();
            if (h && h.status == "published") return updateCache[h.scriptId] || addUpdates[h.scriptId] || null;
            return null;
        }

        export function updateAsync(guid:string)
        {
            var id = "";
            return getInstalledHeaderAsync(guid).then((h:Cloud.Header) => {
                id = updateFor(h);
                if (!id) return Promise.as();
                return ScriptCache.getScriptAsync(id);
            }).then((text) => {
                if (!text) return Promise.as();
                return getInstalledHeaderAsync(guid).then((h:Cloud.Header) => {
                    if (h.status != "published") return Promise.as();
                    h.status = "published";
                    h.scriptId = id;
                    h.meta = null // recompute
                    return updateInstalledScriptAsync(h, text, null, true)
                })
            })
        }

        export function updateInstalledScriptAsync(hd:Cloud.Header, script:string, state:string, background = false, scriptVersionInCloud = "")
        {
            if (!background) {
                hd.status = "unpublished";
                hd.recentUse = getCurrentTime();
            }
            hd.scriptVersion.instanceId = Cloud.getWorldId()
            hd.scriptVersion.time = getCurrentTime();
            hd.scriptVersion.version++;
            if (!hd.editor)
                hd.meta = null // recompute
            return World.setInstalledScriptAsync(hd, script, state, "", scriptVersionInCloud)
        }

        export var switchToChannel = (ch:string) => {
            if (ch == "beta")
                Util.navigateInWindow(Cloud.getServiceUrl() + "/app/beta?nocache=" + Util.guidGen());
            else
                Util.navigateInWindow(Cloud.getServiceUrl() + "/app/");
        };
    }

}
