///<reference path='refs.ts'/>

module TDev {
    export var sharedText: string = null;
    export var runnerHost : RunnerHost = null;

    export class RunnerHost
        extends RuntimeHostBase {
        currentRt: Runtime;
        runMain: () =>void;

        constructor () {
            super();
            var script = (<any>TDev).precompiledScript;
            this.currentRt = new Runtime();
            this.currentRt.devMode = false;
        }

        runAsync() {
            RunnerSettings.reportLaunch();
            SizeMgr.applySizes();

            var rt = this.currentRt;


            var cs = new CompiledScript();
            cs.initFromPrecompiled();
            if (!cs.baseScriptId)
                cs.baseScriptId = cs.scriptId;
            if (!cs.scriptTitle)
                cs.scriptTitle = (<any>window).webAppName;
            rt.initFrom(cs);

            rt.setHost(this);
            this.showWall();
            rt.initPageStack();
            rt.applyPageAttributes();
            SizeMgr.applySizes();

            this.runMain = () => {
                var fn = cs.actionsByName[cs.mainActionName];
                if (cs.pagesByName[cs.mainActionName] !== undefined) {
                    fn = Runtime.syntheticFrame((s) => s.rt.postAutoPage("this", cs.mainActionName));
                }
                rt.run(fn, null);
            };

            this.runMain();
            return Promise.as();
        }

        notifyHideWall() {
            this.runMain();
        }

        public agreeTermsOfUseAsync(): Promise {
            return RunnerSettings.agreeTermsAsync();
        }

        public tweakMsg()
        {
            var webAppId = (<any>window).webAppId || "";
            var txt = webAppId && Math.random() < 0.2 ? "tweak this web app on touchdevelop.com" : "find more on touchdevelop.com";
            var d = div("copyright-text", txt);
            if (SizeMgr.phoneMode)
                d.innerHTML = "<span class='beta-underline'>more</span>";

            return d.withClick(() => {
                var link = (text:string, lnk:string) =>
                    HTML.mkButton(text,
                                    () => { window.open(Cloud.getServiceUrl() + lnk) });

                var m = new ModalDialog();

                m.add(div("wall-dialog-header", lf("Create apps at TouchDevelop.com")));
                m.addHTML("With TouchDevelop you can create and publish apps. "+
                          "You can also explore, use and edit apps published by others.");
                m.addHTML("TouchDevelop was brought to you by Microsoft Research and runs on " +
                          "Windows, Windows Phone, Mac, Linux, iPhone, iPad, Android, etc. (and soon your toaster :-)");

                if (webAppId) {
                    m.add(div("wall-dialog-buttons",
                        link("tweak this web app", "/" + webAppId),
                        link("explore TouchDevelop", "/app")));
                } else {
                    m.add(div("wall-dialog-buttons",
                        link("run TouchDevelop now!", "/app")));
                }

                m.show();

            })
        }
    }

    function initEditor() {
        SizeMgr.earlyInit();

        document.onkeypress = Util.catchErrors("documentKeyPress", (e) => KeyboardMgr.instance.processKey(e));
        document.onkeydown = Util.catchErrors("documentKeyDown", (e) => KeyboardMgr.instance.processKey(e));
        document.onkeyup = Util.catchErrors("documentKeyUp", (e) => KeyboardMgr.instance.keyUp(e));
        document.onselectstart = () => { return <any> false; };

        window.onunload = () => {
        };

        function saveState() {
            Ticker.saveCurrent()
            RT.Perf.saveCurrent();
        }
        (<any>window).tdevSaveState = saveState;

        var e = elt("loading");
        if (e) e.removeSelf();

        var r = divId("scriptEditor", null,
                    divId("wallOverlay", null));
        elt("root").appendChild(r);
    }

    function initWebRunnerApis() {
        // api keys needed to make maps work
        TDev.RT.ApiManager.bingMapsKey = 'AsnQk63tYReqttLHcIL1RUsc_0h0BwCOib6j0Zvk8QjWs4FQjM9JRM9wEKescphX';
        TDev.RT.ArtCache.isArtResource = (url: string) => false; // disable art caching
        TDev.RT.ApiManager.getKeyAsync = function (url: string): Promise { return Promise.as(undefined); }
        TDev.RT.AdManager.initialize = (el) => el.style.display = 'none'; // do not show adds
        //TDev.RT.Web.create_request = function (url: string): TDev.RT.WebRequest { return TDev.RT.WebRequest.mk(url, undefined);};
        //TDev.RT.Web.proxy = function (url: string): string { return url; }
        TDev.RT.BingServices.searchAsync = function (
            kind: string,
            query: string,
            loc: TDev.RT.Location_): Promise { return Promise.as([]); };
        (<any>TDev.RT.Languages).picture_to_text = function picture_to_text(lang: string, pic: TDev.RT.Picture, r: ResumeCtx) { r.resumeVal(undefined); }
        if (!Browser.webRunner) {
            TDev.RT.Sound.patchLocalArtUrl = function (url: string): string {
                if (/\.\/art\//.test(url) && !/\.(wav|m4a)\?a=/.test(url)) {
                    // adding 'a' argument to trigger caching
                    url = url + (Browser.audioWav ? '.wav' : '.m4a') + "?a=" + (<any>window).webAppGuid;
                    url = Util.toAbsoluteUrl(url); // enable local caching of these sounds
                    Util.log('patched local art sound: ' + url);
                }
                return url;
            }
		    TDev.RT.Picture.patchLocalArtUrl = function (url: string): string {
                if (/\.\/art\//.test(url) && !/\?a=/.test(url)) {
                    // adding 'a' argument to trigger caching
                    url += "?a=" + (<any>window).webAppGuid;
                    url = Util.toAbsoluteUrl(url); // enable local caching of these pictures
                    Util.log('patched local art picture: ' + url);
                }
                return url;
            }
        }
        // office mix
        if (TDev.Browser.webAppImplicit) {
            // do not ask the authenticate
            var auth = TDev.Cloud.authenticateAsync;
            TDev.Cloud.authenticateAsync = (reason: string) => {
                if (reason == "leaderboard")
                    return Promise.as(!Cloud.isAccessTokenExpired());
                return auth(reason);
            }
        }
    }

    function initCompiledApp() {
        TDev.RuntimeSettings.askSourceAccess = false;
        TDev.Cloud.authenticateAsync = (reason:string) => Promise.as(true);
        TDev.RT.ArtCache.isArtResource = (url: string) => false; // disable art caching
        TDev.RT.ApiManager.getKeyAsync = (url: string): Promise => Promise.as(TDev.RT.ApiManager.keys[url] || undefined);
        TDev.RT.BingServices.searchAsync = function (
            kind: string,
            query: string,
            loc: TDev.RT.Location_): Promise {
            if (!TDev.RT.ApiManager.bingSearchKey) {
                TDev.RT.Time.log('Missing API Key for Bing search. Please edit /js/apikeys.js.');
                return Promise.as([]);
            }

            var url = 'https://api.datamarket.azure.com/Bing/Search/v1/'
                + encodeURIComponent(kind) + "?Adult='Strict'&Query=" + encodeURIComponent("'" + query + "'");
            if (loc) {
                url += '&Latitude=' + encodeURIComponent(loc.latitude().toString()) + '&Longitude=' + encodeURIComponent(loc.longitude().toString());
            }
            var request = TDev.RT.WebRequest.mk(url, undefined);
            request.set_credentials('', TDev.RT.ApiManager.bingSearchKey);
            return request.sendAsync()
                   .then((response) => {
                       var r: TDev.RT.BingSearchResult[] = [];
                       var feed = TDev.RT.Web.feed(response.content());
                       for (var i = 0; i < feed.count(); ++i) {
                           var msg = feed.at(i);
                           var kind = msg.title();
                           var values = msg.values();
                           if (/^webresult$/i.test(kind)) {
                               r.push({
                                   name: values.at('Title'),
                                   url: values.at('Url'),
                                   thumbUrl: null,
                                   web: values.at('DisplayUrl')
                               });
                           } else if (/^imageresult$/i.test(kind)) {
                               r.push({
                                   name: values.at('Title'),
                                   url: values.at('MediaUrl'),
                                   thumbUrl: null,
                                   web: values.at('Url')
                               });
                           } else if (/^newsresult/i.test(kind)) {
                               var dt = Date.parse(values.at('Date'));
                               r.push({
                                   name: values.at('Title') + ' - ' + values.at('Source') + ' - ' + Util.timeSince(dt),
                                   url: values.at('Url'),
                                   thumbUrl: null,
                                   web: null
                               });
                           }
                       }
                       return r;
                   });
        };

        (<any>TDev.RT.Languages).translate = function translate(source_lang: string, target_lang: string, text: string, r : ResumeCtx)//: string
        {
            Util.log('translate: called');
            if (!target_lang) {
                TDev.RT.Time.log('languages->translate: no target language');
                r.resumeVal(undefined);
                return;
            }
            if (!text || source_lang === target_lang) {
                r.resumeVal(text);
                return;
            }
            if (!TDev.RT.ApiManager.microsoftTranslatorKey) {
                TDev.RT.Time.log('Missing Microsoft Translator API Key.');
                r.resumeVal(undefined);
                return;
            }

            Util.log('translating text...');
            var url = 'https://api.datamarket.azure.com/Bing/MicrosoftTranslator/v1/Translate?'
                + 'Text=%27' + encodeURIComponent(text) + "%27"
                + '&To=%27' + encodeURIComponent(target_lang) + "%27";
            if (source_lang)
                url += '&From=%27' + encodeURIComponent(source_lang) + "%27";

            TDev.RT.Time.log('languages->translate: sending request');
            var request = TDev.RT.WebRequest.mk(url, undefined);
            request.set_credentials('', TDev.RT.ApiManager.microsoftTranslatorKey);
            request.sendAsync()
                .done((response: TDev.RT.WebResponse) => {
                    var translated = TDev.RT.Web.feed(response.content());
                    if (translated && translated.count() > 0) {
                        var tr = translated.at(0);
                        var rts = tr.values().at('Text');
                        r.resumeVal(rts);
                        return;
                    }
                    r.resumeVal(undefined);
                }, e => {
                    TDev.RT.Time.log('error while translating');
                    r.resumeVal(undefined);
                });
        };

        (<any>TDev.RT.Languages).detect_language = function detect_language(text: string, r: ResumeCtx) //: string
        {
            if (!text) {
                r.resumeVal(undefined);
                return;
            }
            if (!TDev.RT.ApiManager.microsoftTranslatorKey) {
                TDev.RT.Time.log('Missing Microsoft Translator API Key. Please edit /js/apikeys.js.');
                r.resumeVal(undefined);
                return;
            }

            var url = 'https://api.datamarket.azure.com/Bing/MicrosoftTranslator/v1/Detect?'
                + 'Text=%27' + encodeURIComponent(text) + "%27";
            var request = TDev.RT.WebRequest.mk(url, undefined);
            request.set_credentials('', TDev.RT.ApiManager.microsoftTranslatorKey);
            request.sendAsync()
                .done((response: TDev.RT.WebResponse) => {
                    var translated = TDev.RT.Web.feed(response.content());
                    if (translated && translated.count() > 0) {
                        var tr = translated.at(0);
                        var code = tr.values().at('Code');
                        r.resumeVal(code);
                        return;
                    }
                    r.resumeVal(undefined);
                }, e => {
                    TDev.RT.Time.log('error while detecting language');
                    r.resumeVal(undefined);
                });
        };

        TDev.RT.MicrosoftTranslator.speak = function (lang, text) {
            if (lang.length == 0 || text.length == 0) return undefined;
            if (!TDev.RT.ApiManager.microsoftTranslatorClientId ||
                !TDev.RT.ApiManager.microsoftTranslatorClientSecret) {
                TDev.RT.Time.log('Missing Microsoft Translator Client ID and Client Secret. Please edit /js/apikeys.js.');
                return undefined;
            }

            var url = 'http://api.microsofttranslator.com/V2/Http.svc/Speak?'
                + 'language=' + encodeURIComponent(lang)
                + '&text=' + encodeURIComponent(text)
                + '&format=' + encodeURIComponent('audio/mp3')
                + '&options=MaxQuality';
            var snd = TDev.RT.Sound.mk(url, TDev.RT.SoundUrlTokenDomain.MicrosoftTranslator, 'audio/mp4');
            return snd;
        }
    }

    function initAsync() : Promise
    {
        if (RT.Wab)
            return RT.Wab.initAsync().then(() => init2Async());
        else
            return init2Async();
    }

    function init2Async() : Promise
    {
        Ticker.disable();
        tick(Ticks.mainInit);

        Util.initHtmlExtensions();
        Util.initGenericExtensions();

        initEditor();

        RT.RTValue.initApis();
        if (Browser.webRunner)
            initWebRunnerApis();
        else if (Browser.isCompiledApp)
            initCompiledApp();

        var h = new HistoryMgr();
        window.addEventListener("hashchange", Util.catchErrors("hashchange", function (ev) {
            h.hashChange();
        }), false);

        window.addEventListener("popstate", Util.catchErrors("popState", function (ev) {
            if (h.popState) {
                h.popState(ev);
            }
        }), false);

        runnerHost = new RunnerHost();
        runnerHost.currentGuid = (<any>window).webAppGuid || "6B4CD5BD-8C23-458D-9422-E329520060AE";

        window.addEventListener("resize", Util.catchErrors("windowResize", () => {
            SizeMgr.applySizes();
            runnerHost.currentRt.forcePageRefresh();
            runnerHost.publishSizeUpdate();
        }));

        return runnerHost.runAsync();
    }

    function initWin8()
    {
        var app = WinJS.Application;
        var webapp = Windows.UI.WebUI.WebUIApplication;
        app.onactivated = (eventObject:any) => {
            if (eventObject.detail.kind === Windows.ApplicationModel.Activation.ActivationKind.launch) {
                TDev.Util.log('win8 activated: ' + eventObject.detail.kind);
                eventObject.setPromise(
                        initAsync()
                        .then(() => WinJS.UI.processAll())
                        );
            }
        };
        webapp.onresuming = (eventObject: any) => {
            TDev.Util.log('win8 resuming: ' + (runnerHost ? 'resuming' : 'no runtime'));
            if (runnerHost)
                runnerHost.currentRt.resumeExecution(false);
        };
        app.oncheckpoint = (eventObject:any) => {
            TDev.Util.log('win8 checkpoint: ' + (runnerHost ? 'stop async' : 'already paused'));
            if (runnerHost)
                eventObject.setPromise(runnerHost.currentRt.stopAsync(true));
        };

        (<any>app).onsettings = (e) => {
            TDev.Util.log('win8 settings');
            var appcommands : any = {
                "about": {
                    title: "About",
                    href: "/html/about.html"
                },
                "privacystatement": {
                    title: "Privacy Statement",
                    href: "/html/privacystatement.html"
                }
            };
            if (TDev.RunnerSettings.showTermsOfUse) {
                appcommands.termsofuse = {
                    title: "Terms of Use",
                    href: "/html/termsofuse.html"
                };
            }
            if (TDev.RunnerSettings.showFeedback) {
                appcommands.feedback = {
                    title: "Feedback",
                    href: "/html/feedback.html"
                };
            }
            if (TDev.RunnerSettings.showSettings) {
                appcommands.settings = {
                    title: "Settings",
                    href: "/html/settings.html"
                };
            }
            e.detail.applicationcommands = appcommands;
            (<any>WinJS.UI).SettingsFlyout.populateSettings(e);
        };

        app.start();
    }

    function initJs()
    {
        window.onload = Util.catchErrors("windowOnLoad", () => {
            initAsync().done();
        });
    }

    export function globalInit()
    {
        window.onerror = (errMsg, url, lineNumber) => {
            Util.log("error " + lineNumber + ":" + errMsg);
            return false;
        };

        if ((<any>TDev).isWebserviceOnly) {
            Util.navigateInWindow((<any>window).errorUrl + "#webservice")
            return;
        }

        TDev.Browser.isCompiledApp = true;
        TDev.Browser.detect();
        Ticker.fillEditorInfoBugReport = (b: BugReport) => {
            try {
                b.currentUrl = "runner";
                b.scriptId = "";
                b.userAgent = Browser.isNodeJS ? "node" : window.navigator.userAgent;
                b.resolution = "";
            } catch (e) {
                //debugger;
            }
        };

        Runtime.initialUrl = document.URL

        if (Browser.isNodeJS) {
            if ((<any>TDev.RT).Node)
                ((<any>TDev.RT).Node).setup()
        } else if (Browser.inCordova) {
            TDev.RT.Cordova.setup(() => initAsync().done())
        } else if (Browser.win8) {
            initWin8();
        } else {
            initJs();
        }
    }

    export module RunnerSettings
    {
        // specified when baking the app
        var _appid: string = undefined;
        var _storeid: string = undefined;

        export var showTermsOfUse = false;
        export var showFeedback = false;
        export var showSettings = false;
        export var privacyStatement = "";
        export var privacyStatementUrl = "";
        export var termsOfUse = "";
        export var termsOfUseUrl = "";
        export var title = "";
        export var author = "";
        export var description = "";
        export var isGame = false;

        export function agreeTermsAsync(): Promise {
            Util.log('checking agreed terms...');
            if (!termsOfUseUrl && !privacyStatementUrl) return Promise.as();

            var agreed = !!RuntimeSettings.readSetting("td.agreed.termsofuse");
            if (agreed) return Promise.as();

            Util.log('asking user to agree terms...');
            return new Promise((onSuccess, onError, onProgress) => {
                var m = new ModalDialog();
                m.onDismiss = () => {
                    RuntimeSettings.storeSetting("td.agreed.termsofuse", true);
                    onSuccess(undefined);
                }
                m.canDismiss = false;
                m.fullWhite();
                m.addHTML("<div class='wall-dialog-body'>To use this app, you must agree to the <a href='" + RunnerSettings.termsOfUseUrl + "'>Terms of use</a> and <a href='" + RunnerSettings.termsOfUseUrl + "'>Privacy Statement</a>.</div>");
                m.add(div('wall-dialog-buttons', HTML.mkButton(lf("I Agree"), () => {
                    m.canDismiss = true;
                    m.dismiss();
                })));
                m.show();
            });
        }

        export function showPrivacyStatementDialog()
        {
            var m = new ModalDialog();
            m.add(div('wall-dialog-header', 'privacy statement'));
            m.add(div('wall-dialog-body', RunnerSettings.privacyStatement));
            m.setScroll()
            m.addOk();
            m.show();
        }

        export function showTermsOfUseDialog()
        {
            var m = new ModalDialog();
            m.add(div('wall-dialog-header', 'terms of use'));
            m.add(div('wall-dialog-body', RunnerSettings.termsOfUse));
            m.setScroll()
            m.addOk();
            m.show();
        }

        export function showAboutDialog() {
            var m = new ModalDialog();
            m.add(div('wall-dialog-header', 'about'));
            m.add(div('wall-dialog-body', RunnerSettings.title));
            m.add(div('wall-dialog-body', 'by ' + RunnerSettings.author));
            m.add(div('wall-dialog-body', RunnerSettings.description));
            m.setScroll()
            m.addOk();
            m.show();
        }

        export function showSettingsDialog() {
            var locationcb = HTML.mkCheckBox(lf("access and use your location"), (b) => RuntimeSettings.setLocation(b), RuntimeSettings.location());
            var soundcb = HTML.mkCheckBox(lf("sounds"), (b) => RuntimeSettings.setSounds(b), RuntimeSettings.sounds());

            var m = new ModalDialog();
            m.add(div('wall-dialog-header', lf("settings")));
            m.add(div('wall-dialog-body', locationcb));
            m.add(div('wall-dialog-body', soundcb));
            m.addOk();
            m.show();
        }

        var _launchReported = false;
        export function reportLaunch() {
            if (_appid && window.navigator.onLine && !_launchReported) {
                TDev.RT.Bazaar.storeidAsync()
                    .done((sid : string) => {
                        if (sid) {
                            // analytics
                            var url = Cloud.getPrivateApiUrl("app/" + encodeURIComponent(_appid)
                                + "/" + encodeURIComponent(userid())
                                + "/launch/" + encodeURIComponent(sid) + "?store=" + encodeURIComponent(_storeid));
                            Util.log('runner: report launch ' + url);
                            var req = TDev.RT.WebRequest.mk(url, undefined);
                            req.show_notifications(false);
                            req.sendAsync().done(() => {
                                _launchReported = true;
                            }, e => {
                                Util.log('runner: launch report failed');
                            });
                        }
                    }, e => {});
            }
        }

        export function launch(appid: string, storeid: string) {
            _appid = appid || "invalid";
            _storeid = storeid || "unknown";
            if (Browser.win8) Win8RunnerSettings.init();
            RunnerSettings.reportLaunch();
            // override leaderboards
            (<any>TDev.RT.Bazaar).loadLeaderboardItemsAsync = function (scriptId: string) {
                return Promise.as([]);
            };
            (<any>TDev.RT.Bazaar).leaderboard_score = function (r: ResumeCtx) {
                if (window.navigator.onLine && (Browser.webRunner || Browser.webAppImplicit)) {
                    var url = Cloud.getPrivateApiUrl("app/" + encodeURIComponent(_appid)
                        + "/" + encodeURIComponent(userid()) + "/leaderboardscored");
                    var req = TDev.RT.WebRequest.mk(url, undefined);
                    req.sendAsync()
                       .done((resp: TDev.RT.WebResponse) => {
                            updateScoreFromResponse(resp.content_as_json());
                            r.resumeVal(RunnerSettings.score());
                        }, (e) => r.resumeVal(RunnerSettings.score()));
                }
                else
                    r.resumeVal(RunnerSettings.score());
            };
            (<any>TDev.RT.Bazaar).post_leaderboard_score = function (score: number, r: ResumeCtx) {
                var curr = RunnerSettings.score();
                if (score < curr) {
                    r.resume();
                }
                else {
                    setScore(score);
                    if (window.navigator.onLine && (Browser.webRunner || Browser.webAppImplicit)) {
                        var url = Cloud.getPrivateApiUrl("app/" + encodeURIComponent(_appid)
                            + "/" + encodeURIComponent(userid()) + "/leaderboard");
                        var req = TDev.RT.WebRequest.mk(url, undefined);
                        req.set_method('post');
                        req.set_content(JSON.stringify({ kind: "leaderboardscore", score: score }));
                        req.sendAsync()
                            .done((resp: TDev.RT.WebResponse) => {
                                updateScoreFromResponse(resp.content_as_json());
                                r.resume();
                            }, (e) => r.resume());
                    } else {
                        r.resume();
                    }
                }
            };

            (<any>TDev.RT.Bazaar).post_leaderboard_to_wall = function (r: ResumeCtx) //: void
            {
                if (!Browser.webRunner && !Browser.webAppImplicit) {
                    TDev.RT.App.restart("", r);
                    return;
                }

                var leaderboardDiv = div('item', [div('item-title', 'leaderboards')]);

                var rt = r.rt;
                if (window.navigator.onLine) {
                    r.progress(lf("Loading leaderboards..."));
                    var url = Cloud.getPrivateApiUrl("app/" + encodeURIComponent(_appid) + "/" + encodeURIComponent(userid()) + "/leaderboard");
                    var request = TDev.RT.WebRequest.mk(url, undefined);
                    request.sendAsync()
                        .done((response: TDev.RT.WebResponse) =>
                        {
                            var json = response.content_as_json();
                            if (json) {
                                var items = json.field('items');
                                if (items) {
                                    for (var i = 0; i < items.count(); ++i) {
                                        var item = items.at(i);
                                        if (item.string('kind') === 'leaderboardscore') {
                                            var userid = item.string('userid');
                                            var username = item.string('username');
                                            var userscore = (item.number('score') || 0).toString();
                                            var time = Util.timeSince(item.number('time'));
                                            var imgDiv = div('leaderboard-img');
                                            imgDiv.innerHTML = TDev.Util.svgGravatar(userid);
                                            var scoreDiv = div('item leaderboard-item', [
                                                imgDiv,
                                                div('leaderboards-score', userscore),
                                                div('leaderboard-center', [
                                                    div('item-title', username),
                                                    div('item-subtle', time)
                                                ])
                                            ]);
                                            leaderboardDiv.appendChild(scoreDiv);
                                        }
                                    }
                                }
                            }

                            rt.postBoxedHtml(leaderboardDiv, rt.current.pc);
                            r.resume();
                        });
                } else {
                    rt.postText(lf("Please connect to internet to see the leaderboard."), rt.current.pc);
                    r.resume();
                }
            }
        }

        function updateScoreFromResponse(response : TDev.RT.JsonObject) {
            if (response) {
                var score = response.number('score');
                if (score)
                    RunnerSettings.setScore(score);
            }
        }

        export function score() : Number {
            return Number(RuntimeSettings.readSetting("td.score") || 0);
        }

        export function setScore(score: Number) {
            if (score > RunnerSettings.score())
                RuntimeSettings.storeSetting("td.score", score);
        }

        export function userid() : string {
            var userid = RuntimeSettings.readSetting("td.userid");
            if (!userid) {
                // need new user id
                userid = TDev.Util.guidGen();
                RuntimeSettings.storeSetting("td.userid", userid);
            }
            return userid;
        }
    }

    export module Win8RunnerSettings {
        export function init() {
            TDev.RuntimeSettings.readSetting = Win8RunnerSettings.readSetting;
            TDev.RuntimeSettings.storeSetting = Win8RunnerSettings.storeSetting;
            TDev.RT.WinRT.BazaarInit();
        }

        export function readSetting(key : string): string {
            var applicationData = Windows.Storage.ApplicationData.current;
            var roamingSettings = applicationData.roamingSettings;
            return  roamingSettings.values[key];
        }

        export function storeSetting(key : string, value : any) {
            var applicationData = Windows.Storage.ApplicationData.current;
            var roamingSettings = applicationData.roamingSettings;
            roamingSettings.values[key] = value;
        }
    }
}

TDev.globalInit();
