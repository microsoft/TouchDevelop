///<reference path='refs.ts'/>
module TDev
{
    function fetchConfigAsync()
    {
        if (!Cloud.config.liteVersion) {
            var storeCfg = r => Object.keys(r).forEach(k => Cloud.config[k] = r[k]);
            var p = Cloud.getPublicApiAsync("clientconfig")
                .then(r => {
                    localStorage['clientconfig'] = JSON.stringify(r)
                    storeCfg(r)
                })

            if (localStorage['clientconfig']) {
                storeCfg(JSON.parse(localStorage['clientconfig']))
                p.done()
                return Promise.as()
            } else return p.then(() => {}, e => { Util.log("cannot download client config: " + e.message) });
        }
        else return Promise.as()
    }

    function initEditorAsync()
    {
        SizeMgr.earlyInit();

        Util.log("initialize editor");
        TheLoadingScreen = new LoadingScreen();
        TheEditor = new Editor();
        Browser.TheHost = new Browser.Host();
        Browser.TheHub = new Browser.Hub();
        Browser.TheApiCacheMgr = new Browser.ApiCacheMgr();

        allScreens = [TheEditor, Browser.TheHost, Browser.TheHub, TheLoadingScreen];

        SVG.loadScriptIcons(ScriptIcons.getScriptIcons());
        TDev.Browser.EditorSettings.init();

        Util.log("initialize api cache");
        return Promise.as()
        .then(() => LocalProxy.updateShellAsync())
        .then(() => LocalProxy.loadCachesAsync())
        .then(() => fetchConfigAsync())
        .then(() => Browser.TheApiCacheMgr.initAsync())
        .then(() => {
            initScreens();

            var upd:HTMLElement = null;

            if (window.localStorage["lastExceptionMessage"]) {
                var msg = window.localStorage["lastExceptionMessage"];
                window.localStorage.removeItem("lastExceptionMessage");
                if (TDev.Browser.EditorSettings.widgets().notifyAppReloaded)
                    upd = div("app-updated", lf("Something went wrong and we reloaded the app"));
            }

            if (!upd && window.localStorage["appUpdated"]) {
                window.localStorage.removeItem("appUpdated");
                if (dbg)
                    upd = div("app-updated", lf("The Touch Develop app has been updated."));
            }

            if (upd) {
                elt("root").appendChild(upd)
                upd.withClick(() => { upd.removeSelf() })
                Util.setTimeout(10000, () => { upd.removeSelf() })
            }

            TheEditor.historyMgr.initialHash();

            // needs to be done again after login
            Browser.TheApiCacheMgr.initWebsocketAsync().done();

            window.addEventListener("message", event => {
                if (External.TheChannel)
                    External.TheChannel.receive(event);
            });

            handleChromeSerial();            
            Hex.preCacheEmptyExtensionAsync().done();

            Cookies.initAsync().done();
        });
    }
    
    function handleChromeSerial() {
        var buffers: StringMap<string> = {};
        var chrome = (<any>window).chrome;
        if (chrome && chrome.runtime) {
            var m = /chromeid=([a-z]+)/.exec(window.location.href);            
            var extensionId = m ? m[1] : "cihhkhnngbjlhahcfmhekmbnnjcjdbge"
            var port = chrome.runtime.connect(extensionId, { name: "micro:bit" });
            port.onMessage.addListener(function(msg) {
                if (msg.type == "serial") {
                    Browser.serialLog = true;
                    
                    var buf = (buffers[msg.id] || "") + msg.data;
                    var i = buf.lastIndexOf("\n");
                    if (i >= 0) {
                        var msgb = buf.substring(0, i + 1);
                        TDev.RT.App.logEvent(TDev.RT.App.INFO, "serial", msgb, { id: msg.id });
                        buf = buf.slice(i + 1);
                    }
                    
                    buffers[msg.id] = buf;
                }
            });
        }
    }

    function onlyOneTab()
    {
        // implicit web apps don't use the database to
        // avoid multiple tabs issues
        if (!TDev.Storage.temporary) {
            // to avoid races with database storage,
            // detect multiple tabs and prevent it
            var id = Random.uniqueId();
            window.localStorage["currentTabId"] = id;
            window.setInterval(() => {
                if (window.localStorage["currentTabId"] != id && !Util.navigatingAway) {
                    Util.navigateInWindow((<any>window).errorUrl + "#oneTab");
                }
            }, 5000);
        }
    }

    function initScreens():void
    {
        allScreens.forEach((s) => s.init());

        // Debug.enableFirstChanceException(true);

        window.addEventListener("resize", Util.catchErrors("windowResize", function () {
            SizeMgr.applySizes();

        }));

        window.addEventListener("hashchange", Util.catchErrors("hashchange", function (ev) {
            TheEditor.historyMgr.hashChange();
        }), false);

        window.addEventListener("popstate", Util.catchErrors("popState", function (ev) {
            if (TheEditor.historyMgr.popState) {
                TheEditor.historyMgr.popState(ev);
            }
        }), false);

        document.onkeypress = Util.catchErrors("documentKeyPress", (e) => TheEditor.keyMgr.processKey(e));
        document.onkeydown = Util.catchErrors("documentKeyDown", (e) => TheEditor.keyMgr.processKey(e));
        document.onkeyup = Util.catchErrors("documentKeyUp", (e) => TheEditor.keyMgr.keyUp(e));

        function saveState() {
            TheEditor.saveStateAsync({ forReal: true }).done();
            Browser.TheApiCacheMgr.save();
            Ticker.saveCurrent()
            RT.Perf.saveCurrentAsync().done();
        }

        (<any>window).tdevSaveState = saveState;
        window.onunload = saveState;

        /*
        // bad idea for development - refresh key triggers that
        if (false) {
            window.onbeforeunload = (e) => {
                var s = "Any changes will be lost.";
                if (e) {
                    e.returnValue = s;
                }
                return s;
            };
        }
        */

        if (Browser.mobileWebkit) {
            window.scrollTo(0,1);
        }
        SizeMgr.applySizes();

        var appCache = window.applicationCache;

        function markUpdate()
        {
            tick(Ticks.appUpdateAvailable);
            Browser.Host.updateIsWaiting = true;
        }

        (<any>window).tdevMarkRefresh = markUpdate;
        if (appCache.status == appCache.UPDATEREADY) {
            markUpdate();
            tick(Ticks.appQuickUpdate)
            Browser.Host.tryUpdate();
            return;
        }

        appCache.addEventListener('updateready', () => {
            if (appCache.status == appCache.UPDATEREADY) {
                markUpdate();
            } else {
                tick(Ticks.appNoUpdate);
            }
        }, false);

        onlyOneTab();
    }

    export function initAsync(): Promise {
        Util.log("baseUrl0: {0}", baseUrl);
        Util.log("userAgent: {0}", window.navigator.userAgent);
        Util.log("browser: {0}/{1}/{2}", Browser.browserShortName, Browser.browserVersion, Browser.browserVersion2);
        if (Browser.isWebkit) {
            Util.log("Browser: webkit/{0}", Browser.webkitVersion);
            if (Browser.isMobileSafari) Util.log("Browser: mobileSafari");
        }

        if ((<any>window.navigator).standalone) Util.log("standalone");
        statusMsg("page loaded, initializing");
        return init2Async()
    }

    function init2Async(): Promise {
        Util.initHtmlExtensions();
        Util.initGenericExtensions();

        Util.sendPendingBugReports();

        Util.log("baseUrl: {0}", baseUrl);

        var localStorage = window.localStorage;
        var experimentalVersion = "8";
        if (localStorage["experimentalVersion"] != experimentalVersion) {
            Util.log("updating local storage, '{0}' to '{1}'", localStorage["experimentalVersion"], experimentalVersion);
            return Storage.clearAsync().then(() => { // hard reset of all storage
                Util.log("storage clear");
                localStorage["experimentalVersion"] = experimentalVersion;
                return initCoreAsync();
            });
        }

        return initCoreAsync();
    }

    function initCoreAsync()
    {
        Util.log("setting up flags and knobs");

        var url = document.URL;
        // in debuggerExceptions mode erros are displayed inline in the page, not in window.alert() kind of thing
        // the "debugger" statement in the handler is also not triggered - we're are assuming the debugger
        // was attached to begin with and it caught the exception
        if (/debuggerExceptions/.test(url)) debuggerExceptions = true;
        if (/withTracing/.test(url)) withTracing = true;
        if (/enableUndo/.test(url)) TDev.Collab.enableUndo = true;
        if (/nohub/.test(url) || Cloud.isRestricted()) { TDev.noHub = true; TDev.hubHash = "list:installed-scripts"; }

        if (/bitvm=0/.test(url)) {
            Cloud.useNativeCompilation = true;
        }

        //if (/endKeywords/.test(url)) Renderer.useEndKeywords = true;
        if (/lfDebug/.test(url)) Util.translationDebug = true;
        if (Browser.noStorage || /temporaryStorage/.test(url)) {
            Browser.supportMemoryTable(true);
            Storage.temporary = true;
        }


        var m = /lang=([a-zA-Z\-]+)/.exec(url)
        if (m) {
            Util.setTranslationLanguage(m[1])
        } else if (!Util.loadUserLanguageSetting()) {
            m = /TD_LANG=([\w\-]+)/.exec(document.cookie)
            if (m)
                Util.setTranslationLanguage(m[1])
            else {
                var lang = window.navigator.language || window.navigator.userLanguage
                if (lang)
                    Util.setTranslationLanguage(lang)
            }
        }

        if (Math.random() < 0.05 || /translationTracking/.test(url))
            Util.enableTranslationTracking()

        if (/localTranslationTracking/.test(url))
            Util.enableTranslationTracking(true)

        var m = /translationTracking=([a-zA-Z0-9]+)/.exec(url)
        if (m) {
            Util.enableTranslationTracking()
            Util.translationToken = m[1]
        }

        Revisions.parseUrlParameters(url);

        Ticker.init()

        RT.Perf.init(TDev.AST.Compiler.version, Cloud.currentReleaseId);

        tick(Ticks.mainInit);

        AST.Lexer.init();

        var appCache = window.applicationCache;
        function logAppCacheEvent(ev:Event) {
            Ticker.dbg("app cache event: {0}, status={1}", ev.type, appCache.status);
        }
        [ 'cached', 'checking', 'downloading', 'error', 'noupdate', 'obsolete', 'progress', 'updateready'
          ].forEach((ev) => appCache.addEventListener(ev, logAppCacheEvent, false));

        Cloud._migrate = Login.migrate;

        World.getScriptMeta = (script) => {
            var s = AST.Parser.parseScript(script);
            return s.toMeta();
        };

        World.mergeScripts = (o, a, b) => AST.mergeScripts(o, a, b).serialize();
        World.sanitizeScriptTextForCloud = AST.App.sanitizeScriptTextForCloud;

        var onBoxSelected = () => {
            if (!(currentScreen instanceof Editor)) return;

            var editor: Editor = <Editor>currentScreen;
            var box = LayoutMgr.instance.getSelectedBox();
            if (box === null) return;
            var id = box.getAstNodeId();

            // Live view in the code editor
            if (!editor.isWallVisible()) {
                if (id)
                    editor.goToNodeId(id);

            // Paused view on the main wall
            } else {
                LayoutMgr.instance.showBoxMenu(() => {
                    if (id) editor.goToNodeId(id);
                    LayoutMgr.instance.hideBoxMenu();
                });
            }
        }
        LayoutMgr.instance.onBoxSelected = onBoxSelected;

        var onRendered = () => {
            if (!(currentScreen instanceof Editor)) return;

            var editor: Editor = <Editor>currentScreen;
            var rt = editor.currentRt;

            // Live view in the code editor
            if (!editor.isWallVisible()) {
                LayoutMgr.instance.highlightSelectedBox(); // GUI selection
                LayoutMgr.instance.highlightRelatedBoxes(); // Code selection

            // Paused view on the main wall
            } else if (rt.isStopped()) {
                LayoutMgr.instance.highlightSelectedBox(); // GUI selection
                LayoutMgr.instance.refreshBoxMenu(); // Box edit menu
            }

            // Otherwise, program is running on the main wall
        }
        LayoutMgr.instance.onRendered = onRendered;

        Util.log("initialize apis");
        api.initFrom();
        ArtEditor.initEditors();

        try {
            var testProto = div(null, "test");
        } catch (e) {
            Util.reportError("protoError", e, false);
            Util.setTimeout(1000, () => {
                Util.navigateInWindow((<any>window).errorUrl + "#prototype");
            })
            return Promise.as();
        }

        return initEditorAsync();
    }

    function search(query: string)
    {
        Browser.TheHost.startSearch(query)
    }

    // return at most 5 results
    function searchResultSuggestions(query: string) : string[]
    {
        return Browser.TheHost.quickSearch(query)
    }

    function searchPaneVisible(visible: boolean) {
        // TODO: handle visibility changes
    }

    function initJs()
    {
        statusMsg("setting up load hook");
        window.onload = Util.catchErrors("windowOnLoad", () => { initAsync().done(); });
    }

    function statusMsg(m:string)
    {
        if (/dbg/.test(document.URL)) {
            var e = elt("statusMsg");
            if (e) Browser.setInnerHTML(e, m);
        }
    }

    export function updateLoop(id:string, msg:string)
    {
        Cloud.transientOfflineMode = true;

        var updateCnt = 0;
        var last = window.localStorage["lastForcedUpdate"]
        if (last) {
            var diff = Date.now() - parseInt(last)
            if (diff < 8*3600*1000) {
                HTML.showProgressNotification(msg + " failed");
                return;
            }
        }

        ProgressOverlay.lockAndShow(msg);

        function checkUpdate() {
            Browser.Host.tryUpdate();
            if (updateCnt++ == 20) {
                var bug = Ticker.mkBugReport("waitForUpdate", "Cannot update")
                bug.jsUrl = "fake://" + id + "/main.js";
                Util.sendErrorReport(bug);
            }
            if (updateCnt >= 30) {
                ProgressOverlay.hide()
                window.localStorage["lastForcedUpdate"] = Date.now()
                ModalDialog.info("couldn't connect to cloud services",lf("{0} failed; we are now using offline mode;\n make sure your internet connection is working",msg))
            } else {
                Util.setTimeout(1000, checkUpdate)
            }
        }
        checkUpdate();
    }

    export function globalInit()
    {
        statusMsg("global init 0");

        if ((typeof window == "object" && (<any>window).isWebWorker) || !(typeof window == "object" && typeof document == "object" && window.document == document)) {
            isWebWorker = true;
            Browser.isHeadless = true;
            Plugins.initWebWorker();
            return;
        }

        window.onerror = (errMsg:any, url, lineNumber) => {
            if (errMsg == "Script error.") return true; // ignore cross domain errors
            if (url == "chrome://global/content/bindings/videocontrols.xml") return true; // FF bug; ignore
            if (errMsg == "InvalidStateError") return true; // FF "bug" when running in "private" method and one tries to access IndexedDB
            Util.reportError(url + ":" + lineNumber, errMsg, false);
            return true;
        };

        function waitForUpdate(id:string)
        {
            if (/releaseid=/.test(document.URL))
                return; // this will never update

            //if (!Cloud.isOnline()) return;

            try {
                window.applicationCache.update();
            } catch (e) {
            }
            updateLoop(id, "updating the web app");

            return true;
        }

        var mx = /lite=([0-9a-z\.]+)/.exec(document.URL)

        if (mx && mx[1] != "0") {
            Cloud.lite = true;
            Cloud.config.rootUrl = "https://" + mx[1]
        }

        if ((<any>window).tdlite) {
            Cloud.lite = true;
            if ((<any>window).tdlite == "url") {
                mx = /^(https?:\/\/[^\/]+)/.exec(document.URL);
                Cloud.config.rootUrl = mx[1]
            } else {
                Cloud.config.rootUrl = (<any>window).tdlite;
            }
            var cfg = (<any>window).tdConfig
            if (cfg) Object.keys(cfg).forEach(k => Cloud.config[k] = cfg[k])
            if (!Cloud.config.newCdnUrl)
                Cloud.config.newCdnUrl = Cloud.config.primaryCdnUrl    
        }

        mx = /microbit=(\w+)/.exec(document.URL)
        if (mx)
            Cloud.config.microbitGitTag = mx[1]

        if (Cloud.lite) (<any>window).rootUrl = Cloud.config.rootUrl;

        Cloud.fullTD = (!Cloud.lite || /touchdevelop.com/.test(Cloud.config.rootUrl));

        if (/httplog=1/.test(document.URL)) {
            HttpLog.enabled = true;
        }

        var ms = document.getElementById("mainScript");
        if (ms && (<HTMLScriptElement>ms).src) {
            Ticker.mainJsName = (<HTMLScriptElement>ms).src;
            baseUrl = Ticker.mainJsName.replace(/[^\/]*$/, "");
            var mm = /\/([0-9]{18}[^\/]*)/.exec(Ticker.mainJsName);
            if (mm) {
                Cloud.currentReleaseId = mm[1];
            }
        }
        World.waitForUpdate = waitForUpdate;

        statusMsg("global init 1");

        Ticker.fillEditorInfoBugReport = (b:BugReport) => {
            try {
                b.currentUrl = TheEditor && TheEditor.historyMgr ? TheEditor.historyMgr.currentHash() : "";
                b.scriptId = Script ? Script.localGuid : "";
                b.userAgent = window.navigator.userAgent;
                b.resolution = SizeMgr.windowWidth + "x" + SizeMgr.windowHeight;
                b.platform = Browser.platformCaps;
                b.worldId = Cloud.getWorldId();
                if (TheEditor && TheEditor.undoMgr) {
                    var src = TheEditor.undoMgr.getScriptSource();
                    if (src)
                        b.attachments.push(src)
                }
            } catch (e) {
                debugger;
            }
        };
        Ticker.fillEditorInfoTicksReport = (b: TicksReport) => {
            try {
                b.worldId = Cloud.getWorldId();
            } catch (e) {
                debugger;
            }
        };

        // init API keys
        TDev.RT.ApiManager.bingMapsKey = 'AsnQk63tYReqttLHcIL1RUsc_0h0BwCOib6j0Zvk8QjWs4FQjM9JRM9wEKescphX';

        Browser.inEditor = true;

        statusMsg("global init 2");
        if (Browser.inCordova) {
            // TODO: move all TD code inside of this handler, including browser.js
            TDev.RT.Cordova.setup(() => {
                statusMsg("global init deviceready");
                initAsync().done();
            });
        } else if ((<any>window).browserSupported) {
            statusMsg("global init 4");
            initJs();
        } else {
            statusMsg("global init 5");
        }
    }
}

TDev.globalInit();
