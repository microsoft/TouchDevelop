///<reference path='refs.ts'/>

module TDev { export module Browser {

    export var TheHost:Host;
    export var TheApiCacheMgr:ApiCacheMgr;

    var bugsEnabled = false;

    export class Host
        extends Screen
    {
        constructor() {
            super()
            this.autoUpdate = KeyboardAutoUpdate.mkInput(this.searchBox, null);
            this.listHeader = div("slListHeader", this.listHeaderHider, this.backContainer, this.searchBox, this.slideButton);
            this.leftPane = div("slLeft", this.listHeader, this.theList, this.progressBar);
            this.rightPane = div("slRight", this.hdContainer, this.tabLabelContainer, this.containerMarker, this.tabContainer);
            this.theRoot = div("slRoot", this.rightPane, this.leftPane);
            this.theRoot.appendChild(Editor.mkBetaNote());
        }
        private theList = div("slList");
        private header = div("sdListLabel");
        private searchBox = HTML.mkTextInput("text", lf("Search..."), "search");
        private autoUpdate:KeyboardAutoUpdate;
        private slideButton = div("slSlideContainer");
        private backContainer = div("slBackContainer");
        private listHeaderHider = div("slListHeaderHider");
        private progressBar = HTML.mkProgressBar();
        private listHeader:HTMLElement;
        private leftPane:HTMLElement;
        public tabContainer = div("slTabContainer");
        private hdContainer = div("slHeaderContainer");
        private tabLabelContainer = div("slTabLabelContainer");
        private containerMarker = div("slContainerMarker");
        private rightPane:HTMLElement;
        private bottomButtons = div("bottomButtons");
        private theRoot:HTMLElement;
        private visible = false;
        private locationCache:any = {};
        public picturelessUsers:any = {};
        private detailsLoadedFor:BrowserPage;
        private installedHeaders:Cloud.Header[];
        private scriptTexts:any;
        private searchOnline:()=>void;
        public initialSearch = "";
        public emphInstall = true;
        private firstLoad = true;
        public skipOneSync = false;
        private reloadInstalled:()=>void;
        private searchVersion = 1;
        public backToEditor = false;
        public runOnReload:()=>void = null;
        private reloadHelpTopic:()=>void = null;

        private topLocations:BrowserPage[] = [];
        private topLocationsOverride:BrowserPage[] = null;
        private helpLocations:BrowserPage[] = [];
        private displayLimit = 0;
        private hasMore = false;
        static maxDisplayAtOnce = 40;
        private moreDiv:HTMLElement;
        private listDivs:HTMLElement[] = [];
        private apiPath = "???";
        private topTitle = "???";
        private lastSearchValue = "";
        private shownSomething = false;
        public treatAsScript:any = {};

        public clearMeAsync(logout: boolean): Promise {
            Browser.TheApiCacheMgr.invalidate("me");
            Browser.TheApiCacheMgr.store("me", {}, "", true);
            Util.setUserLanguageSetting("");
            var promise = (logout || !Cloud.getUserId()) ? Promise.as() : Browser.TheApiCacheMgr.getAsync("me");
            return promise.then(() => this.clearAsync(false))
                .then(() => this.initMeAsync())
                .then(() => TheEditor.historyMgr.reload(HistoryMgr.windowHash()));
        }

        public init()
        {
            this.theRoot.style.display = "none";
            this.theRoot.id = "slRoot";
            Util.setupDragToScroll(this.theList);
            this.updateScroll()
            elt("root").appendChild(this.theRoot);

            Util.onInputChange(this.searchBox,
                    Util.catchErrors("slSearch-searchKey", () => this.searchKey()));
            this.searchBox.onclick = Util.catchErrors("slSearch-click", () => this.showSidePane());
            this.searchBox.placeholder = lf("Search here...");


            this.rightPane.withClick(() => this.hideSidePane(), true);
            this.listHeaderHider.withClick(() => this.hideSidePane());

            this.setBackButton();
            this.initMeAsync().done(() => { }, () => { });

            if (dbg) bugsEnabled = true;
        }

        private updateScroll()
        {
            // SizeMgr.phoneMode is not set on init
            if (SizeMgr.phoneMode || Browser.isCellphone) {
                Util.resetDragToScroll(this.tabContainer);
                Util.setupDragToScroll(this.rightPane);
                this.tabContainer.style.top = "";
            } else {
                Util.resetDragToScroll(this.rightPane);
                Util.setupDragToScroll(this.tabContainer);
            }
        }

        public applySizes()
        {
            this.updateScroll();
        }

        private setBackButton()
        {
            this.backContainer.setChildren([
                    ScriptInfo.mkBtn("svg:back,black", this.autoHide() && this.sidePaneVisibleNow() && this.shownSomething ? "dismiss" :
                                this.backToEditor ? lf("script") : lf("the hub"), () => this.showHub())
            ])
        }

        public initMeAsync(): Promise {
            var id = Cloud.getUserId();
            if (!id) return Promise.as();

            // update polling URI; relevant on Win8 when app is pinned
            var badgeTag = document.getElementsByName("msapplication-badge")[0];
            if (badgeTag) (<any>badgeTag).content = "frequency=30;polling-uri=" + Cloud.getServiceUrl() + "/api/" + id + "/badge";
            if (Browser.isTrident && !Browser.isCellphone)
                try {
                    (<any>(window.external)).msSiteModeRefreshBadge(); // don't test for it, just invoke --- testing would lie
                } catch (e) {
                }

            TheApiCacheMgr.getAnd("me", (u: JsonUser) => {
                (<any>window).userName = u.name;
                (<any>window).userScore = u.score;
                (<any>window).userId = id;
            });
            return Cloud.getUserSettingsAsync()
                .then((settings: Cloud.UserSettings) => {
                    Util.setUserLanguageSetting(settings.culture, true);
                    var mode = EditorSettings.parseEditorMode(settings.editorMode);
                    if (mode != EditorMode.unknown)
                        EditorSettings.setEditorMode(mode, false);
                    EditorSettings.setWallpaper(settings.wallpaper, false);
                }, e => { });
        }

        static updateIsWaiting = false;
        static tryUpdate()
        {
            if (this.updateIsWaiting && !Storage.temporary) {
                this.updateIsWaiting = false;
                tick(Ticks.appUpdate);
                window.localStorage["appUpdated"] = "1";
                window.localStorage["lastForcedUpdate"] = "";
                window.location.reload();
                return true;
            }

            return false;
        }

        public showHub()
        {
            if (this.autoHide() && this.sidePaneVisibleNow() && this.shownSomething) {
                this.hideSidePane();
                return;
            }

            var ed = this.backToEditor;
            this.hide();
            if (ed) {
                TheEditor.restore();
            } else TheHub.showSections();
        }

        public startSearch(s:string)
        {
            if (currentScreen)
                currentScreen.hide()
            this.initialSearch = s;
            this.showList("installed-scripts", null);
            this.searchBox.style.opacity = "0"
        }

        private show()
        {
            this.searchBox.style.opacity = "1"
            currentScreen = this;

            if (!this.visible) {
                this.theRoot.style.display = "block";
                setGlobalScript(null);
                this.visible = true;
                this.setSearch(this.initialSearch);
                if (this.initialSearch) {
                    Util.setKeyboardFocus(this.searchBox);
                } else
                    this.searchBox.blur();
                this.initialSearch = "";
                this.progressBar.reset();
            }
        }

        public hide()
        {
            this.backToEditor = false;
            if (this.visible) {
                this.theRoot.style.display = "none";
                this.visible = false;
                TipManager.setTip(null)
            }
        }

        public restoreTopics()
        {
            this.show();
        }

        private setCurrent(scroll = true)
        {
            var theOne = null;
            if (this.detailsLoadedFor)
                this.listDivs.forEach((e:HTMLElement) => {
                    var bx = (<any>e).theBoxable;
                    if (bx && bx.equals(this.detailsLoadedFor)) {
                        e.setFlag("selected", true);
                        if (!theOne)
                            theOne = e;
                    } else {
                        e.setFlag("selected", false);
                    }
                });

            if (!!theOne && scroll) Util.ensureVisible(theOne);
        }

        public quickSearch(query:string):string[]
        {
            var res:ScriptInfo[] = []
            var terms = query.toLowerCase().split(/\s+/);
            var fullName = terms.join("");
            this.installedHeaders.forEach((h) => {
                var info = this.createInstalled(h)
                info.lastScore = info.match(terms, fullName);
                if (info.lastScore > 0)
                    res.push(info)
            })
            return res.sort((a, b) => BrowserPage.comparePages(a,b)).slice(0, 5).map((inf) => inf.app.getName())
        }

        public headersWithUpdates():Cloud.Header[]
        {
            return this.installedHeaders.filter((h) => !!World.updateFor(h))
        }

        public getInstalledHeaders() { return this.installedHeaders }

        private syncView(showCurrent = true)
        {
            var lst:BrowserPage[] = this.topLocations;
            this.listDivs = [];

            var terms: string[] = this.lastSearchValue.split(/\s+/)
                // .map((s) => s.toLowerCase()) azure search case sensisitve
                .filter((s) => !!s);
            var searchMode = terms.length > 0;
            var allHelpBtn = null;

            if (!searchMode) {
                if (this.apiPath == "help") {
                    lst = this.helpLocations;
                    allHelpBtn = HTML.mkButton(lf("table of contents"), () => {
                        this.loadHash(["list", "topics", "topic", "contents", "overview"]);
                    })
                } else if (this.topLocationsOverride) {
                    lst = this.topLocationsOverride
                } else {
                    lst = lst.filter((l) => l.showInList());
                }
            }

            var scriptMod = false;
            var ageLimit = 0;
            var ageUpLimit = 0;
            var smallerThan = 0; // spacial
            var largerThan = 0;
            var onlyPublished = false;
            var onlyUnpublished = false;
            var onlyNotMe = false;
            var onlyMe = false;

            var bugStatus = ""
            var bugUser = ""
            var bugOrder = ""

            // Search modifiers:
            // older:<days>, newer:<days> - filter by last use time
            // pub:yes, pub:no - filter by publish status
            // shorter:<lines>, longer:<lines> - filter by size
            // When any of these filters is applied, you can uninstall all scripts matching the filter.

            terms = terms.filter((t) => {
                var m = /^older:([\d\.]+)$/i.exec(t)
                if (m) {
                    ageLimit = parseFloat(m[1]) * 24 * 3600;
                    scriptMod = true;
                    return false;
                }

                m = /^newer:([\d\.]+)$/i.exec(t)
                if (m) {
                    ageUpLimit = parseFloat(m[1]) * 24 * 3600;
                    scriptMod = true;
                    return false;
                }

                m = /^pub(lished)?:(yes|no)$/i.exec(t);
                if (m) {
                    if (/^yes$/i.test(m[2])) onlyPublished = true;
                    else onlyUnpublished = true;
                    scriptMod = true;
                    return false;
                }

                m = /^shorter:(\d+)$/i.exec(t);
                if (m) {
                    smallerThan = parseInt(m[1]);
                    scriptMod = true;
                    return false;
                }

                m = /^longer:(\d+)$/i.exec(t);
                if (m) {
                    largerThan = parseInt(m[1]);
                    scriptMod = true;
                    return false;
                }

                m = /^issue:(\w+)$/i.exec(t)
                if (m) {
                    bugStatus = m[1].toLowerCase()
                    return false;
                }

                m = /^assignedto:(\w+)$/i.exec(t)
                if (m) {
                    bugUser = m[1].toLowerCase()
                    return false;
                }

                m = /^order:(\w+)$/i.exec(t)
                if (m) {
                    bugOrder = m[1].toLowerCase()
                    return false;
                }

                m = /^me:(yes|no)$/i.exec(t);
                if (m) {
                    if (/^yes$/i.test(m[1])) onlyMe = true;
                    else onlyNotMe = true;
                    scriptMod = true;
                    return false;
                }

                return true;
            })

            if ((smallerThan || largerThan) && !this.scriptTexts) {
                World.getInstalledScriptsAsync(this.installedHeaders.filter((hd) => hd.status != "deleted").map((hd) => hd.guid)).then((v) => {
                    this.scriptTexts = v;
                    this.syncView(showCurrent);
                })
                return;
            }

            var fullName = terms.join("").toLowerCase();

            var searchPath = "search";
            var searchAdd = []
            switch (this.apiPath) {
                case "recent-scripts":
                case "installed-scripts":
                    searchPath = "scripts";
                    break;
                case "new-scripts":
                case "top-scripts":
                case "showcase-scripts":
                    searchPath = this.apiPath;
                    break;
                case "mygroups":
                    searchPath = "groups";
                    break;
                case "art":
                case "users":
                case "comments":
                    searchPath = this.apiPath;
                    break;
                case "myart":
                    // TODO: return user art first
                    searchPath = "art";
                    break;
                case "documents":
                case "topics":
                    searchPath = "scripts";
                    searchAdd = ['#docs'];
                    break;
            }
            if (/\/groups$/.test(this.apiPath)) {
                searchPath = this.apiPath;
            }

            var meid = Cloud.getUserId();
            if (searchMode) {
                if (scriptMod)
                (() => {
                    var now = Util.now()/1000;

                    lst = lst.filter((b) => {
                        if (!(b instanceof ScriptInfo)) return false;
                        var si = <ScriptInfo>b;
                        var ch = si.getCloudHeader();
                        if (!ch) return false;
                        if (ageLimit && (now - ch.recentUse) < ageLimit) return false;
                        if (ageUpLimit && (now - ch.recentUse) > ageUpLimit) return false;
                        if (onlyPublished && ch.status != "published") return false;
                        if (onlyUnpublished && ch.status == "published") return false;
                        if (smallerThan || largerThan) {
                            var lines = 0;
                            var empties = 0;
                            this.scriptTexts[ch.guid].split(/\r?\n/).forEach((line) => {
                                if (/^\s*(\}|meta .*)\s*$/.test(line)) empties++;
                                else lines++;
                            });
                            if (smallerThan && lines >= smallerThan) return false;
                            if (largerThan && lines <= largerThan) return false;
                        }
                        if (onlyMe && meid && ch.userId != meid) return false;
                        if (onlyNotMe && meid && ch.userId == meid) return false;
                        return true;
                    });
                })()

                if (bugStatus) lst = []

                var lcTerms = terms.map(t => t.toLowerCase());
                lst = lst.filter((b) => {
                    b.lastScore = b.match(lcTerms, fullName);
                    return b.lastScore > 0;
                });
                lst.sort((a, b) => BrowserPage.comparePages(a, b));
                if (lst.length == 0)
                    this.header.setChildren([]);
                else
                    this.header.setChildren([spanDirAuto(lf("search"))]);
            } else {
                this.header.setChildren([spanDirAuto(this.topTitle)]);
            }

            this.listDivs = [this.header];
            if (scriptMod && lst.length > 0) {
                this.listDivs.push(div(null, HTML.mkButton(Util.fmt("uninstall {0} script{0:s}", lst.length), () => {
                    this.massUninstall(lst.map((si:ScriptInfo) => si.getCloudHeader()));
                })))
            }
            if (this.apiPath == "showcase-mgmt") {
                var showDiv = div(null, HTML.mkButton(lf("publish showcase"), () => {
                    showDiv.setChildren("working on it...")
                    Showcase.snapshotAsync().done(msg => {
                        showDiv.setChildren(msg)
                    })
                }))
                this.listDivs.push(showDiv)
            }
            var seen:any = {}
            var len = 0
            this.hasMore = false;
            lst.forEach((s:BrowserPage) => {
                var id = (<BrowserPage>s).persistentId();
                if (seen[id]) return;
                seen[id] = 1;

                if (++len > this.displayLimit) {
                    this.hasMore = true
                    return
                }

                var b = s.mkSmallBox();
                (<any>b).theBoxable = s;
                if (searchMode)
                    Util.highlightWords(b, terms);
                this.listDivs.push(b);
            });

            this.searchOnline = null;
            var searchDiv:HTMLElement = div(null);
            var seenSearch:any = {}
            var direct = div(null)
            var searchCount = Browser.isMobile ? 20 : 50;

            var searchFrom = (cont:string) => {
                var version = ++this.searchVersion;

                var addEntry = (b:BrowserPage) => {
                    var id = b.persistentId();
                    if (seenSearch[id]) return null;
                    seenSearch[id] = 1;
                    var d = b.mkSmallBox();
                    (<any>d).theBoxable = b;
                    this.listDivs.push(d);
                    Util.highlightWords(d, terms);
                    return d;
                }

                this.progressBar.start();
                if (!cont && terms.length == 1) {
                    if (/^\/?[a-zA-Z]+$/i.test(terms[0])) {
                        TheApiCacheMgr.getAnd(terms[0].replace("/", ""), (e:JsonPublication) => {
                            if (version != this.searchVersion) return;
                            var inf = this.getAnyInfoByPub(e, "");
                            if (inf) {
                                direct.setChildren([addEntry(inf)])
                            }
                        });
                    } else if (/^\d{9,64}$/i.test(terms[0])) {
                        Cloud.getPrivateApiAsync(terms[0])
                            .done((rc : JsonCode) => {
                                if (rc.verb == "JoinGroup") this.joinGroup(terms[0]);
                            }, e => {});
                    }
                }
                searchDiv.setChildren([div("sdLoadingMore", lf("searching..."))]);

                var path = searchPath + "?" + cont + "count=" + searchCount + "&q=" + encodeURIComponent(terms.concat(searchAdd).join(" "))
                if (bugStatus)
                    path = "bugs/" + bugStatus
                searchCount = 50;

                this.getLocationList(path, (items:BrowserPage[], xcont:string) => {
                    this.progressBar.stop();
                    if (version != this.searchVersion) return;
                    this.searchOnline = null;
                    var sd = searchDiv;

                    if (bugStatus) {
                        var bugCompare = (a:BrowserPage, b:BrowserPage) => {
                            if (a instanceof CommentInfo) {
                                if (b instanceof CommentInfo) {
                                    return (<CommentInfo>a).bugCompareTo(<CommentInfo>b, bugOrder)
                                } else return -1;
                            } else {
                                return b instanceof CommentInfo ? 1 : 0
                            }
                        };

                        if (bugUser) {
                            var bu = bugUser == "me" ? Cloud.getUserId()
                                   : bugUser == "none" ? ""
                                   : bugUser;
                            items = items.filter(i => {
                                var j:JsonComment = TheApiCacheMgr.getCached(i.publicId)
                                if (j && (j.assignedtoid || "") != bu)
                                    return false
                                return true
                            })
                        }
                        items.sort(bugCompare)
                    }

                    var elts:HTMLElement[] = items.map(addEntry);
                    if (xcont) {
                        searchDiv = div(null, HTML.mkButton(lf("load more"), () => { searchFrom("continuation=" + xcont + "&") }));
                        elts.push(searchDiv);
                    } else if (items.length == 0) {
                        elts.push(div("sdLoadingMore", lf("no results match your search")));
                        var t = HelpTopic.findById("howtosearch");
                        if (t) {
                            var s = TopicInfo.mk(t);
                            var b = s.mkSmallBox();
                            elts.push(b);
                        }
                    }
                    sd.setChildren(elts);
                }, true);
            }

            if (searchMode) {
                if (this.hasMore)
                    this.listDivs.push(div('sdLoadingMore', lf("there is more, keep typing!")));
            } else {
                if (this.moreDiv)
                    this.listDivs.push(this.moreDiv)
            }

            if (searchMode) {
                if (!scriptMod) {
                    this.listDivs.push(div("sdListLabel", spanDirAuto(lf("online"))));
                    this.searchOnline = () => { searchFrom("") };
                    this.autoUpdate.update = this.searchOnline;
                    this.autoUpdate.lastValue = null;
                    this.autoUpdate.keypress();
                }
                searchDiv.setChildren([]);
               // HTML.mkButton(lf("search online"), this.searchOnline)]);
                this.listDivs.push(direct);
                this.listDivs.push(searchDiv);
            }

            if (allHelpBtn) this.listDivs.push(allHelpBtn)

            this.theList.setChildren(this.listDivs);

            this.setCurrent(showCurrent);
        }

        private massUninstall(items:Cloud.Header[])
        {
            ModalDialog.ask(Util.fmt("really uninstall all these {0} scripts?", items.length), lf("uninstall scripts"), () => {
                HTML.showProgressNotification(lf("uninstalling..."));
                Promise.sequentialMap(items, (h:Cloud.Header) => World.uninstallAsync(h.guid))
                    .then(() => this.clearAsync(false))
                    .done(() => { TheEditor.historyMgr.reload(HistoryMgr.windowHash()) });
            })
        }

        private sortHeaders(items:Cloud.Header[], recent = false)
        {
            function getNormalizedName(a: Cloud.Header) {
                return (typeof a.name == "string") ? a.name.toLowerCase() : "";
            }
            function cmp(a:Cloud.Header, b:Cloud.Header)
            {
                if (recent) {
                    var d = b.recentUse - a.recentUse;
                    if (d) return d;
                }
                return getNormalizedName(a).localeCompare(getNormalizedName(b));
            }

            items.sort(cmp)
        }

        public clearAsync(skipSync: boolean)
        {
            this.emphInstall = true;
            this.locationCache = {};
            this.detailsLoadedFor = null;
            this.topLocations = [];
            this.topLocationsOverride = null;
            this.helpLocations = null;
            this.displayLimit = 0;
            this.moreDiv = null;
            this.installedHeaders = [];
            this.scriptTexts = null;
            this.reloadInstalled = null;
            this.reloadHelpTopic = null;

            if (!skipSync && !this.skipOneSync && !World.syncIsActive()) {
                var canAsk = (beta: boolean) => {
                    if (ModalDialog.currentIsVisible()) return false; // don't show a dialog over a dialog
                    var h = window.location.href;
                    var i = h.indexOf('#');
                    if (beta && /localhost/.test(h)) return false; // don't ask on localhost
                    if (i >= 0) {
                        if (i < h.length - 1) return false; // don't ask if we are on a subpage
                        else h = h.substr(0, i);
                    }
                    if (beta && h[h.length - 1] != "/") return false; // don't ask if we are not running a plain version
                    return true;
                };
                var noOtherAsk = () => {
                    if (!canAsk(false)) return;
                    if (!Cloud.isOnline()) return;

                    var translateNag = !!localStorage["translateNagged"];

                    var benchmarksNagged = false;
                    var benchmarksNagVector = localStorage["benchmarksNagVector"];
                    var nagVector: { [version: string]: boolean; } = null;
                    if (benchmarksNagVector) {
                        try {
                            nagVector = JSON.parse(benchmarksNagVector);
                        } catch (e) { }
                        if (nagVector != null) {
                            if (!!nagVector[<string>Cloud.currentReleaseId])
                                benchmarksNagged = true;
                        }
                    }
                    if (!Cloud.getUserId() ||
                        !TDev.isBeta ||
                        dbg) // don't nag dbg users, as those do not represent general population
                        benchmarksNagged = true;

                    if(Math.random() > 0.05) // only 5% of users get nagged
                        benchmarksNagged = true;

                    if (!Cloud.lite && dbg &&
                        !!Cloud.getUserId() && !translateNag
                        && (<any>window).userScore > 30 && Math.random() < 0.1) { // only 20% get nagged of powerusers
                        localStorage["translateNagged"] = "1";
                        tick(Ticks.translateNagDisplay);
                        var m = new ModalDialog();
                        m.add([
                            div("wall-dialog-header", lf("Help us translate TouchDevelop!")),
                            div("wall-dialog-body", lf("We need your help to translate the TouchDevelop UI. Enter a couple translations in our translation and help the community!")),
                            div("wall-dialog-buttons",
                                HTML.mkButton(lf("maybe later"), () => { m.dismiss(); }),
                                HTML.mkButton(lf("i want to help"), () => {
                                    tick(Ticks.translateNagOk);
                                    RT.Web.browseAsync("https://touchdeveloptranslator.azurewebsites.net/#").done();
                                }))
                        ]);
                        m.show();
                    } else if (!Cloud.lite && !benchmarksNagged) {
                        if (nagVector == null)
                            nagVector = {};
                        nagVector[<string>Cloud.currentReleaseId] = true;
                        localStorage["benchmarksNagVector"] = JSON.stringify(nagVector);
                        tick(Ticks.benchmarksNagDisplay);
                        var m = new ModalDialog();
                        m.add([
                            div("wall-dialog-header", lf("Help the TouchDevelop community!")),
                            div("wall-dialog-body", lf("You can help us by running a TouchDevelop benchmark to test how well we perform on your device.")),
                            div("wall-dialog-buttons",
                                HTML.mkButton(lf("no, thanks"), () => {
                                    m.dismiss();
                                    tick(Ticks.benchmarksNagDismiss);
                                }),
                                HTML.mkButton(lf("run benchmark"), () => {
                                    tick(Ticks.benchmarksNagRunOne);
                                    m.dismiss();
                                    TestMgr.Benchmarker.runTDBenchmarksWithDialog(false).done();
                                })
                                )
                        ]);
                        m.show();
                    }
                };
                if (Cloud.getAccessToken() && Cloud.getUserId()) {
                    World.syncAsync(true, undefined, false,
                        () => {
                            Cloud.isOnlineWithPingAsync()
                                .then((isOnline: boolean) => {
                                    if (isOnline) {
                                        HTML.showProgressNotification(lf("sign in expired - refreshing..."));
                                        Login.show();
                                    }
                                    else {
                                        tick(Ticks.offlineLoginSync);
                                        var message = lf("cannot sync - you appear to be offline");
                                        HTML.showProgressNotification(message);
                                    }
                                });
                        },
                        (seconds) => {
                            var delta = "";
                            var msg = "";
                            if (Math.abs(seconds) >= 60 * 60 * 24) {
                                msg = lf("The time on your device is incorrect. Please adjust your date & time settings in order to sync your scripts.");
                            }
                            else {
                                if (Math.floor(Math.abs(seconds)) > 60 * 60) {
                                    delta += Math.floor(Math.abs(seconds) / 60 / 60) + " hours ";
                                    seconds %= 60 * 60;
                                }
                                if (Math.floor(Math.abs(seconds)) > 60) {
                                    delta += Math.floor(Math.abs(seconds) / 60) + " minutes ";
                                    seconds %= 60;
                                }
                                if (Math.floor(Math.abs(seconds)) > 0) {
                                    delta += Math.floor(Math.abs(seconds)) + " seconds ";
                                }
                                if (seconds < 0)
                                    delta += " forward";
                                else//
                                    delta += " backward";
                                msg = "Adjust it " + delta + ".";
                            }
                            Ticker.tick(Ticks.hubWrongTime);
                            HTML.showWarningNotification(lf("can't sync! fix the time on your device"), msg);
                        },
                        () => {
                            if (!canAsk(true)) return;
                            if ((<any>window).betaFriendlyId) return;

                            var m = new ModalDialog();
                            var postAskBetaFalse = true;
                            // make sure the checkbox now appears in settings
                            if (!Editor.isAlwaysBeta()) Editor.setAlwaysBeta(false);
                            m.add([
                                div("wall-dialog-header", lf("Stay at the bleeding edge!")),
                                Browser.isWP8app ? null :
                                div("introThumb introLarge",
                                    HTML.mkImg(baseUrl + "tutorial/beta.png")),
                                div("wall-dialog-body",
                                    Util.fmt("Run the beta version of TouchDevelop {0}.",
                                        Browser.isWP8app ? "cloud services" : "web app")),
                                div("wall-dialog-body", lf("See upcoming features first, and help us debugging.")),
                                div("wall-dialog-body", lf("You can always go back to the regular version (from 'Settings' in the hub).")),
                                Browser.isWP8app ? null :
                                div("wall-dialog-body", HTML.mkCheckBox("from now on always use beta", Editor.setAlwaysBeta, Editor.isAlwaysBeta())),
                                div("wall-dialog-buttons",
                                    HTML.mkButton(lf("try out beta"), () => {
                                        Cloud.postAskBetaAsync(true)
                                            .then(undefined, () => { }) // ignore network errors
                                            .then(() => {
                                                postAskBetaFalse = false;
                                                World.switchToChannel("beta");
                                                m.dismiss();
                                            }).done();
                                    }),
                                    HTML.mkButton(lf("learn more"), () => {
                                        m.dismiss();
                                        Util.setHash("#topic:beta")
                                    }),
                                    HTML.mkButton(lf("not today"), () => {
                                        m.dismiss();
                                    })
                                    )
                            ]);
                            m.onDismiss = () => {
                                if (postAskBetaFalse)
                                    Cloud.postAskBetaAsync(false)
                                        .done(undefined, () => { }); // ignore network errors
                            };
                            m.show();
                        },
                        (askSomething) => {
                            if (!canAsk(false)) return;

                            var m = new ModalDialog();
                            var postAskSomethingFalse = true;
                            // make sure the checkbox now appears in settings
                            var buttons;
                            if (askSomething.linkName && askSomething.linkUrl)
                                buttons = [
                                    HTML.mkButton(askSomething.linkName, () => {
                                        Cloud.postAskSomethingAsync(true)
                                            .then(undefined, () => { }) // ignore network errors
                                            .then(() => {
                                                postAskSomethingFalse = false;
                                                window.open(askSomething.linkUrl);
                                                m.dismiss();
                                                return Promise.as();
                                            }).done();
                                    }),
                                    HTML.mkButton(lf("cancel"), () => {
                                        m.dismiss();
                                    })];
                            else
                                buttons = [HTML.mkButton(lf("ok"), () => {
                                    m.dismiss();
                                })];
                            m.add([
                                div("wall-dialog-header", askSomething.title),
                                (!askSomething.picture) ? null :
                                div("introThumb introLarge",
                                    HTML.mkImg(askSomething.picture)),
                                div("wall-dialog-body", askSomething.message),
                                div("wall-dialog-buttons", buttons)
                            ]);
                            m.onDismiss = () => {
                                if (postAskSomethingFalse)
                                    Cloud.postAskSomethingAsync(false)
                                        .done(undefined, () => { }); // ignore network errors
                            };
                            m.show();
                        }, noOtherAsk).done(message => { Browser.TheHost.notifySyncDone() });
                }
                else {
                    // user never registered; just skip
                    noOtherAsk();
                }
            }
            this.skipOneSync = false;

            return this.updateInstalledHeaderCacheAsync();
        }

        public updateInstalledHeaderCacheAsync()
        {
            return World.getInstalledAsync().then((objs) => {
                this.installedHeaders = []
                this.scriptTexts = null;
                Object.keys(objs).forEach((k) => { this.installedHeaders.push(objs[k]) });
            });
        }

        public getTutorialsStateAsync()
        {
            if (!this.installedHeaders)
                return this.updateInstalledHeaderCacheAsync().then(() => this.getTutorialsStateAsync())

            var limit = Util.now() / 1000 - 14*24*3600
            var headers = <AST.HeaderWithState[]> this.installedHeaders.filter(h => h.status != "deleted" && h.recentUse >= limit)
            return Promise.join(headers.map(h => World.getInstalledEditorStateAsync(h.guid).then(text => {
                if (!text) return null
                var st = <AST.AppEditorState>JSON.parse(text || "{}")
                if (st && st.tutorialId) {
                    h = Util.flatClone(h);
                    h.editorState = st
                    return h
                }
                return null
            }))).then(arr => arr.filter(h => h != null))
        }

        public newScriptName(basename:string) : string
        {
            var names:any = {};
            this.installedHeaders.forEach((h) => {
                if (h.status != "deleted")
                    names[h.name] = h;
            });

            var name = basename || lf("my script");
            if (names[name]) {
                var i = 2;
                name += " ";
                while (names[name + i]) i++;
                name = name + i;
            }
            return name;
        }

        public joinGroup(code : string) {
            if (Cloud.anonMode(lf("joining groups"))) return;

            var name = HTML.mkTextInput("text", lf("enter invitation code"));
            name.maxLength = 64;
            name.pattern = '\d{9,64}';
            name.title = lf("a number between 9 and 64 characters long");
            name.value = code || "";

            var codeid = name.value;
            var groupid = "";
            var progressBar = HTML.mkProgressBar();
            var errorDiv = div('');
            function setError(error : string) {
                errorDiv.setChildren([error]);
            }
            var btn = HTML.mkButton(lf("join group"), () => {
                hideBtn();
                progressBar.start();
                Cloud.postPrivateApiAsync(codeid, {})
                    .done(() => {
                        progressBar.stop();
                        m.dismiss();
                        TheApiCacheMgr.invalidate("groups");
                        TheApiCacheMgr.invalidate(Cloud.getUserId()+ "/groups");
                        var groupInfo = this.getGroupInfoById(groupid);
                        TheHost.loadDetails(groupInfo);
                    }, e => {
                        setError(lf("this invitation code is invalid or expired, please check for typing errors..."));
                    });
            });
            function hideBtn() {
                progressBar.stop();
                btn.style.display = 'none';
            }
            function showBtn() {
                progressBar.stop();
                btn.style.display = 'inline';
            }
            hideBtn();
            var m = new ModalDialog();
            m.add([
                progressBar,
                div("wall-dialog-header", lf("join a group")),
                div("wall-dialog-body", lf("Enter the invitation code"), Editor.mkHelpLink("invitation code")),
                div("wall-dialog-line-textbox", name),
                errorDiv,
                div("wall-dialog-buttons", btn)
            ]);

            var autoKeyboard = KeyboardAutoUpdate.mkInput(name, Util.catchErrors("getCode", () => {
                codeid = name.value.trim();
                var lastCode : JsonCode = null;
                if (/\d{9,64}/.test(codeid)) {
                    progressBar.start();
                    Cloud.getPrivateApiAsync(codeid)
                        .then((code: JsonCode) => {
                            lastCode = code;
                            if(code.verb == 'JoinGroup')
                                return Cloud.getPrivateApiAsync(code.data)
                            else
                                return Promise.as(undefined);
                        })
                        .done((group: JsonGroup) => {
                            if (group) {
                                showBtn();
                                groupid = group.id;
                                errorDiv.setChildren([
                                    div('wall-dialog-header', 'group ',
                                        HTML.mkA('', '#list:' + group.userid + '/groups:group:' + group.id + ':overview', '', group.name),
                                        ' created by ',
                                        HTML.mkA('', '#list:installed-scripts:user:' + group.userid + ':overview', '', group.username)),
                                    ]);
                                if (group.allowexport)
                                    errorDiv.appendChild(div('wall-dialog-body', lf("group owner can export your scripts to app."), Editor.mkHelpLink("groups")));
                                if (group.allowappstatistics)
                                    errorDiv.appendChild(div('wall-dialog-body', lf("group owner has access to statistics of exported apps."), Editor.mkHelpLink("groups")));
                            } else {
                                hideBtn();
                                if (lastCode.expiration > Date.now() / 1000)
                                    setError(lf("this invitation code is expired."));
                                else
                                    setError(lf("this invitation code is invalid, please check for typing errors..."));
                            }
                        }, e => {
                            hideBtn();
                            setError(lf("this invitation code is invalid or expired, please check for typing errors..."));
                        });
                } else {
                    hideBtn();
                    setError(lf("the invitation code must be a number between 9 and 64 characters long"));
                }
            }));
            Util.onInputChange(name, () => autoKeyboard.keypress());

            m.show();
            autoKeyboard.keypress();
        }

        public createNewGroup() {
            if (Cloud.anonMode(lf("creating groups"))) return;

            var progressBar = HTML.mkProgressBar();
            var name = HTML.mkTextInput("text", lf("enter a group name (required)"));
            name.value = lf("my group");

            var descr = HTML.mkTextArea("wall-textbox")
            descr.placeholder = lf("enter a description");
            descr.value = "";

            var school = HTML.mkTextInput("text", lf("enter the school name"));
            school.value = lf("enter the school name");

            var grade = HTML.mkTextInput("text", lf("enter class grade"));
            grade.value = lf("enter the class grade");

            var allowExport = HTML.mkCheckBox(lf("owner can export user's scripts to app"));
            HTML.setCheckboxValue(allowExport, false);

            var div1, div2, cancelBtn;
            var m = new ModalDialog();
            var groupInfo : GroupInfo;
            m.add([
                progressBar,
                div("wall-dialog-header", lf("create new group")),
                div("wall-dialog-body", lf("A group can be used to run a class or an event. Users can collaborate on the same scripts at the same time."), Editor.mkHelpLink("groups")),
                div1 = div('wall-dialog-body',
                    div('', div('', lf("group name (minimum 4 characters)")), name),
                    div('', div('', lf("group description")), descr),
                    div('', div('', lf("school name")), school),
                    div('', div('', lf("class grade")), grade),
                    EditorSettings.editorMode() == EditorMode.pro ? div('', allowExport) : undefined
                    ),
                div2 = div('wall-dialog-body', lf("You cannot change these settings afterwards.")),
                div("wall-dialog-buttons",
                    cancelBtn = HTML.mkButton(lf("cancel"), () => m.dismiss()),
                    HTML.mkButtonOnce(lf("create"), () => {
                        var request = <Cloud.PostApiGroupsBody>{
                            name: name.value,
                            description: descr.value,
                            school: school.value,
                            grade: grade.value,
                            allowexport: HTML.getCheckboxValue(allowExport),
                            allowappstatistics: false,
                            userplatform: Browser.platformCaps
                        };
                        progressBar.start();
                        cancelBtn.removeSelf();
                        div1.removeSelf();
                        div2.removeSelf();
                        Cloud.postPrivateApiAsync("groups", request)
                            .then((r: Cloud.PostApiGroupsResponse) => {
                                TheApiCacheMgr.invalidate("groups");
                                TheApiCacheMgr.invalidate(Cloud.getUserId()+ "/groups");
                                groupInfo = this.getGroupInfoById(r.id);
                                return groupInfo.newInvitationCodeAsync();
                            }).then(() => {
                                progressBar.stop();
                                m.dismiss();
                                return groupInfo.changePictureAsync();
                            })
                            .done(() => TheHost.loadDetails(groupInfo, "settings"));
                    }))
            ]);
            m.show();
        }

        public openNewScriptAsync(stub: World.ScriptStub, t: ScriptTemplate = null): Promise {
            if (currentScreen)
                currentScreen.hide()
            stub.scriptName = this.newScriptName(stub.scriptName);
            return TheEditor.prepareForLoadAsync(lf("creating script"), () =>
                TheEditor
                    .newScriptAndLoadAsync(stub, t));
        }

        public getInstalledByPubId(id:string)
        {
            return this.installedHeaders.filter((k) => k.status == "published" && k.scriptId == id)[0];
        }

        public createInstalled(h:Cloud.Header):ScriptInfo
        {
            if (!h || h.status == "deleted") return undefined;

            var si = new ScriptInfo(this);
            si.loadLocalHeader(h);
            this.saveLocation(si);
            return si;
        }

        public getInstalledByGuid(guid:string):ScriptInfo
        {
            var si = <ScriptInfo> this.locationCache[guid];
            if (si) return si;
            var h = this.installedHeaders.filter((h:Cloud.Header) => h.guid == guid)[0];
            return this.createInstalled(h);
        }

        /* new-scripts top-scripts showcase-scripts search?text=[text] users comments screenshots reviews tags */
        public getLocationList(apiPath:string, f:(itms:BrowserPage[], cont:string)=>void, noCache = false, includeETags = true) : Promise
        {
            TheApiCacheMgr.initMassiveReview();

            if (!this.installedHeaders) {
                return this.clearAsync(false).then(() => { this.getLocationList(apiPath, f, noCache) });
            }

            if (apiPath == "installed-scripts" || apiPath == "recent-scripts" || apiPath == "search") {
                var items = this.installedHeaders;
                items = items.filter((h) => h && h.status != "deleted")
                this.sortHeaders(items, true) // apiPath == "recent-scripts")

                var res:BrowserPage[] = [];
                Object.keys(items).forEach((k) => {
                    var s = this.createInstalled(items[k]);
                    if (s) res.push(s);
                });
                f(res, null);
                return Promise.as();
            }

            if (apiPath == "showcase-mgmt") {
                Showcase.getListAsync(2)
                    .then((list:Showcase.Entry[]) => {
                        f(list.map(js => this.getScriptInfo(js.json)), null)
                    })
                    .done()
                return Promise.as()
            }

            if (apiPath == "topics" || apiPath == "help") {
                f(HelpTopic.getAll().map(TopicInfo.mk), null);
                return Promise.as();
            }

            if (!Cloud.lite && apiPath == "showcase-scripts") {
                Showcase.getShowcaseIds(ids => f(ids.map(id => this.getScriptInfoById(id)), null))
                return Promise.as()
            }

            var suspended = <ApiCacheEntry[]>[];

            var handle = (lst:JsonList, opts?:DataOptions) => {
                var isDefinitive = !opts || opts.isDefinitive;
                var res:BrowserPage[] = [];

                if (lst.items) {
                    lst.items.forEach((e:JsonPublication, i:number) => {
                        var k = this.getAnyInfoByPub(e, lst.etags ? lst.etags[i].ETag : "");
                        if (k) res.push(k);
                    });
                } else {
                    if (!isDefinitive)
                        lst.etags.forEach((e:JsonEtag) => {
                            suspended.push(TheApiCacheMgr.getSuspended(e.id));
                        });

                    lst.etags.forEach((e:JsonEtag) => {
                        var k = this.getAnyInfoByEtag(e);
                        if (k) res.push(k);
                    });
                }

                if (isDefinitive) {
                    if (lst.etags)
                        lst.etags.forEach((e:JsonEtag) => {
                            TheApiCacheMgr.validate(e.id, e.ETag);
                        });

                    suspended.forEach((e) => e.resume());

                }

                f(res, lst.continuation);
            }

            if (/\?/.test(apiPath))
                apiPath += "&";
            else
                apiPath += "?";
            apiPath += "applyupdates=true";

            if (noCache) {
                apiPath += "&etagsmode=includeetags";
                return Cloud.getPublicApiAsync(apiPath).then((s) => { handle(s) });
            } else {
                apiPath += "&etagsmode=" + (includeETags ? "includeetags" : "etagsonly") ;
                TheApiCacheMgr.getAndEx(apiPath, handle);
                return Promise.as();
            }
        }

        public getReferencedPubInfo(e:JsonPubOnPub):BrowserPage { return this.getAnyInfoByEtag({ id: e.publicationid, kind: e.publicationkind, ETag: "" }); }

        public getAnyInfoByEtag(e:JsonEtag):BrowserPage
        {
            if (!e) return null;
            else if (e.kind == "script") return this.getScriptInfoById(e.id);
            else if (e.kind == "forum") return this.getForumInfo();
            else if (e.kind == "user") return this.getUserInfoById(e.id, "");
            else if (e.kind == "comment") return this.getCommentInfoById(e.id);
            else if (e.kind == "art") return this.getArtInfoById(e.id);
            else if (e.kind == "group") return this.getGroupInfoById(e.id);
            else if (e.kind == "document") return this.getDocumentInfo(e);
            else if (e.kind == "run") return this.getRunInfoById(e.id, null);
            else if (e.kind == "runbucket") return this.getRunBucketInfoById(e.id);
            else return null;
        }

        public getAnyInfoByPub(e:JsonPublication, etag:string):BrowserPage
        {
            TheApiCacheMgr.store(e.id, e, etag);
            return this.getAnyInfoByEtag(<JsonEtag>(<any>e));
        }

        public getForumInfo()
        {
            var si = <ForumInfo>this.getLocation("theForum");
            if (!si) {
                si = new ForumInfo(this);
                this.saveLocation(si);
            }
            return si;
        }

        private showInstalledAsync()
        {
            this.showList("installed-scripts", null);
            return Promise.wrap(null);
        }

        public clearHelp()
        {
            this.reloadHelpTopic = null;
        }

        public loadHash(h:string[])
        {
            TipManager.update();
            if (h[0] == "help") {
                if (this.reloadHelpTopic) {
                    this.initialSearch = this.lastSearchValue;
                    this.show();
                    this.reloadHelpTopic();
                    return;
                } else {
                    h = ["list", "topics", "topic", "contents", "overview"]
                }
            }

            if (Browser.isCellphone)
                Runtime.lockOrientation(true, false, true);

            this.updateScroll()
            var skipSync = this.visible;
            // do not sync for help
            if (h.length >=2 && h[0] === "list" && h[1] === "topics") skipSync = true;
            this.clearAsync(skipSync).done(() => {
                this.emphInstall = this.firstLoad;
                this.firstLoad = false;
                var pg:BrowserPage = null;

                if (h[2] == "script" && /-/.test(h[3])) {
                    var hd = this.installedHeaders.filter((hd) => hd.guid == h[3])[0];
                    if (hd && hd.status != "deleted") {
                        var si = new ScriptInfo(this);
                        si.loadLocalHeader(hd);
                        pg = si;
                    } else {
                        TheEditor.historyMgr.scriptOrHub(h);
                        return;
                    }
                } else if (h[2] == "notifications") {
                    pg = new NotificationsPage(this);
                } else if (h[2] == "topic" || h[2] == "help") {
                    var t = HelpTopic.findById(h[3]);
                    if (!t && HelpTopic.contextTopics)
                        t = HelpTopic.contextTopics.filter(t => t.id == h[3])[0]
                    if (t) pg = TopicInfo.mk(t);
                } else if (h[1] == "edits") {
                    this.show()
                    HistoryTab.anyHistory(h[2])
                    return;
                } else if (h[1] == "ldscr") {
                    this.show();
                    TheEditor.historyMgr.setHash("list:ldscr:" + h[2], "Script parse test");
                    AST.loadScriptAsync(World.getAnyScriptAsync, h[2]).done((res:AST.LoadScriptResult) => {
                        ModalDialog.showText(res.status)
                    });
                    return;
                } else {
                    var etag = <JsonEtag> { kind: h[2], id: h[3], ETag: "" }
                    if (etag.kind == "script" && !etag.id) {
                        Util.setHash("hub")
                        return
                    }
                    pg = this.getAnyInfoByEtag(etag);
                }

                this.showList(h[1] || "", pg, h[4]);

                var f = this.runOnReload
                if (f) {
                    this.runOnReload = null
                    f();
                }
            });
        }

        public overrideSideList(items:BrowserPage[])
        {
            this.topLocationsOverride = items
            this.syncView()
        }

        public showList(path:string, item:BrowserPage = null, tab = "", noCache = false, includeETags = false)
        {
            var header = path.replace(/-scripts/, "").replace(/\/scripts/, "");
            this.shownSomething = false;
            this.apiPath = path;
            switch (header) {
                case "installed":
                    tick(Ticks.browseListMyScripts);
                    header = lf("my scripts");
                    break;
                case "topics":
                    tick(Ticks.browseListDocs);
                    header = lf("docs");
                    break;
                case "top":
                    tick(Ticks.browseListTop);
                    header = lf("top");
                    break;
                case "new":
                    tick(Ticks.browseListNew);
                    header = lf("new");
                    break;
                case "showcase":
                    tick(Ticks.browseListShowcase);
                    header = lf("showcase");
                    break;
                case "comments":
                    tick(Ticks.browseListForum);
                    header = lf("comments");
                    break;
                case "help":
                    tick(Ticks.browseListHelp);
                    header = lf("help");
                    break;
                case "groups":
                    tick(Ticks.browseListGroups);
                    header = lf("groups");
                    break;
                case "art":
                    tick(Ticks.browseListArt);
                    header = lf("art");
                    break;
                case "myart":
                    tick(Ticks.browseListMyArt);
                    header = lf("my art");
                    if(Cloud.getUserId()) path = Cloud.getUserId() + "/art";
                    else path = null;
                    break;
                case "mygroups":
                    tick(Ticks.browseListGroups);
                    header = lf("my groups");
                    if (Cloud.getUserId()) path = Cloud.getUserId() + "/groups";
                    else path = null;
                    break;
                case "showcase-mgmt":
                    header = "show-mgmt";
                    break;
                default:
                    if (/^bugs\//.test(path)) {
                        tick(Ticks.browseListBugs);
                        noCache = true;
                        header = path.slice(5)
                    } else if (/\/scripts/.test(path)) {
                        tick(Ticks.browseListTags);
                        Ticker.rawTick("browseListTag_" + MdComments.shrink(header));
                    } else {
                        Ticker.rawTick("browseListOther_" + MdComments.shrink(header));
                    }
                    break;
            }
            var loadItem = true;

            this.setBackButton();
            this.theList.setChildren([]);
            this.listDivs = [];
            this.show();
            this.topTitle = header;

            this.slideButton.setChildren([TheEditor.mkTabMenuItem("svg:BulletList,black", header, null, Ticks.editBtnSideSearch, () => {
                if (!this.sidePaneVisibleNow()) this.showSidePane();
            })]);

            if (!item) {
                TheEditor.historyMgr.setHash("list:" + this.apiPath, this.topTitle);
                Host.tryUpdate();
            }

            if (path == "help")
                this.helpLocations = HelpTopic.contextTopics.map(TopicInfo.mk);

            var loadEntries = (cont:string):void => {
                var lpath = path;
                if (cont) {
                    if (/\?/.test(path)) lpath += "&continuation=" + cont;
                    else lpath += "?continuation=" + cont;
                }

                this.getLocationList(lpath, (items, ncont) => {
                    if (!cont) this.topLocations = []; // hack...
                    this.topLocations.pushRange(items);
                    if (!ncont && !cont && this.topLocations.length > Host.maxDisplayAtOnce)
                        this.displayLimit = Host.maxDisplayAtOnce;
                    else
                        this.displayLimit = this.topLocations.length;

                    this.moreDiv = div(null)
                    this.syncView(!cont);

                    if (loadItem) {
                        loadItem = false; // just once
                        var nitem = item;
                        if (!!item) nitem = items.filter((p) => p.equals(item))[0] || item;
                        if (!nitem)
                            this.clearRightPane();
                        else {
                            if (!this.detailsLoadedFor || !nitem.equals(this.detailsLoadedFor)) {
                                this.loadDetails(nitem, tab);
                            }
                        }
                        if (!item)
                            this.showSidePane();
                    }

                    if (ncont) {
                        this.moreDiv.setChildren([HTML.mkButton(lf("load more"), () => {
                            this.moreDiv.setChildren([div("sdLoadingMore", lf("loading more..."))]);
                            loadEntries(ncont);
                        })]);
                    } else if (this.hasMore && this.moreDiv) {
                        this.moreDiv.setChildren([HTML.mkButton(lf("load more"), () => {
                            this.displayLimit += Host.maxDisplayAtOnce;
                            if (this.displayLimit >= this.topLocations.length && this.moreDiv)
                                this.moreDiv.setChildren([])
                            this.syncView(false)
                        })]);
                    }
                }, noCache, includeETags);
            }

            this.clearRightPane();
            this.topLocations = [];
            this.topLocationsOverride = null
            this.theList.scrollTop = 0;
            if (path) {
                this.tabContainer.setChildren([div("bigLoadingMore", lf("loading..."))]);
                loadEntries(null);
                this.reloadInstalled = null;
                if (/^installed/.test(path))
                    this.reloadInstalled = () => loadEntries(null);
            } else {
                this.syncView(true);
            }
        }

        public deletePaneAnimAsync()
        {
            return Util.animAsync("delete", 1000, this.rightPane).then(() => { this.clearRightPane() });
        }

        private clearRightPane()
        {
            this.detailsLoadedFor = null;
            this.tabLabelContainer.setChildren([]);
            this.hdContainer.setChildren([]);
            this.tabContainer.setChildren([]);
            this.setCurrent();
        }

        private tabLabels:TabLabel[];

        public moreLink(name:string, t:BrowserTab)
        {
            return div("slMoreLink", name).withClick(() => {
                if (t instanceof BrowserPage)
                    this.loadDetails(<BrowserPage>t);
                else
                    this.loadTab(t);
            });
        }

        public getApiPath() { return this.apiPath }

        public loadTab(t:BrowserTab, anim = true)
        {
            var s = t.parent;
            var setHash = () => {
                TheEditor.historyMgr.setHash("list:" + this.apiPath + ":" + s.persistentId() + ":" + t.getId() + s.additionalHash(),
                    s.getTitle()
                        + (t.getId() == "overview" ? "" : " :: " + t.getName())
                        + " (" + this.topTitle + ")");
            }
            setHash();

            this.hideSidePane();

            if (s instanceof TopicInfo)
                this.reloadHelpTopic = setHash;
            else
                this.reloadHelpTopic = null;
            Host.tryUpdate();

            this.syncTabVisibility();
            this.tabLabels.forEach((e) => e.setFlag("selected", e.theTab == t));
            t.tabLoaded = true;
            t.initTab();
            this.tabContainer.setChildren([t.tabContent]);
            this.tabContainer.scrollTop = 0;

            t.parent.activateTab(t);
            if (anim)
                Util.showBottomPanel(this.tabContainer);
        }

        public syncTabVisibility()
        {
            if (!!this.tabLabels)
                this.tabLabels.forEach((l) => {
                    if (l.theTab.isEmpty)
                        l.style.display = "none";
                });
        }

        public screenId() { return "list"; }

        public sidePane() { return this.theList; }

        public loadDetails(s:BrowserPage, tab = ""):void
        {
            TipManager.setTip(null);
            ModalDialog.dismissCurrent();
            this.searchBox.style.opacity = "1"
            this.shownSomething = true;

            if (currentScreen != this) {
                if (currentScreen)
                    currentScreen.hide();
                this.showList("installed-scripts", s, tab);
                return;
            }

            this.detailsLoadedFor = s;
            s = s.currentlyForwardsTo();
            var tabs = s.getTabs();
            this.tabLabels = [];

            if (tabs.length == 1) {
                this.tabLabelContainer.style.display = "none";
            } else {
                this.tabLabelContainer.style.display = "block";
                tabs.forEach((t:BrowserTab, i:number) => {
                    var n = t.getName();
                    if (!n) return;
                    var e = <TabLabel>div("sdTabLabel", n);
                    e.theTab = t;
                    e.withClick(() => { this.loadTab(t) });
                    this.tabLabels.push(e);
                });
                this.tabLabelContainer.setChildren(this.tabLabels);
            }
            this.syncTabVisibility();

            this.hdContainer.setChildren([s.mkBigBox()]);
            if (!SizeMgr.phoneMode)
                this.tabContainer.style.top = (this.containerMarker.offsetTop / SizeMgr.topFontSize) + "em";

            var allTabs = s.getAllTabs();
            var tabToLoad:BrowserTab = allTabs[0];
            if (tab)
                tabToLoad = allTabs.filter((t) => t.getId() == tab)[0] || tabToLoad;
            this.loadTab(tabToLoad, false);

            /*if (!this.lastSearchValue)
                this.syncView();
            else*/
                this.setCurrent();

            Util.showRightPanel(this.rightPane);
        }

        private getLocation(id:string) : BrowserPage { return this.locationCache[id]; }

        public getCreatorInfo(pub:JsonPublication)
        {
            var id = pub.userid;
            Util.check(!!id, "no id on " + JSON.stringify(pub));
            var si = <UserInfo>this.getLocation(id);
            if (!si) {
                si = new UserInfo(this);
                if (pub.userhaspicture === false) { // we're not happy with 'undefined' here
                    si.nopicture = true;
                }
                if (id)
                    si.loadFromWeb(id, pub.username);
                this.saveLocation(si);
            }
            return si;
        }

        public getUserInfo(c:JsonUser)
        {
            var si = <UserInfo>this.getLocation(c.id);
            if (!si) {
                si = new UserInfo(this);
                TheApiCacheMgr.store(c.id, c);
                si.loadFromWeb(c.id, c.name);
                this.saveLocation(si);
            }
            return si;
        }

        public getUserInfoById(id:string, username:string)
        {
            var si = <UserInfo>this.getLocation(id);
            if (!si) {
                si = new UserInfo(this);
                si.loadFromWeb(id, username);
                this.saveLocation(si);
            }
            return si;
        }

        public getScriptInfoById(id:string)
        {
            var si = <ScriptInfo>this.getLocation(id);
            if (!si) {
                si = new ScriptInfo(this);
                si.loadFromWeb(id);
                this.saveLocation(si);
            }
            return si;
        }

        public getScriptInfo(c:JsonScript)
        {
            var si = <ScriptInfo>this.getLocation(c.id);
            if (!si) {
                si = new ScriptInfo(this);
                TheApiCacheMgr.store(c.id, c);
                si.loadFromWeb(c.id);
                this.saveLocation(si);
            }
            return si;
        }

        public getGroupInfo(c: JsonGroup) {
            var si = <GroupInfo>this.getLocation(c.id);
            if (!si) {
                si = new GroupInfo(this);
                TheApiCacheMgr.store(c.id, c);
                si.loadFromWeb(c.id);
                this.saveLocation(si);
            }
            return si;
        }

        public getArtInfo(c:JsonArt)
        {
            var si = <ArtInfo>this.getLocation(c.id);
            if (!si) {
                si = new ArtInfo(this);
                TheApiCacheMgr.store(c.id, c);
                si.loadFromWeb(c.id);
                this.saveLocation(si);
            }
            return si;
        }

        public getDocumentInfo(c: any)
        {
            var id = (<JsonEtag>c).id || ('document:' + (<JsonDocument>c).url);
            var isEtag = !!(<JsonEtag>c).id;
            var si = <DocumentInfo>this.getLocation(id);
            if (!si) {
                si = new DocumentInfo(this);
                if (isEtag) {
                    var d = TheApiCacheMgr.getCached(id);
                    if (d)
                        si.loadFromJson(d);
                } else {
                    TheApiCacheMgr.store(id, c, id);
                    si.loadFromJson(c);
                }
                this.saveLocation(si);
            }
            return si;
        }

        public getRunInfoById(id: string, scriptId: string) {
            var si = <RunInfo>this.getLocation(id);
            if (!si) {
                si = new RunInfo(this);
                si.loadFromWeb(id, scriptId);
                this.saveLocation(si);
            }
            return si;
        }

        public getRunBucketInfoById(id: string) {
            var si = <RunBucketInfo>this.getLocation(id);
            if (!si) {
                si = new RunBucketInfo(this);
                si.loadFromWeb(id);
                this.saveLocation(si);
            }
            return si;
        }

        public getCommentInfoById(id:string)
        {
            var si = <CommentInfo>this.getLocation(id);
            if (!si) {
                si = new CommentInfo(this);
                si.loadFromWeb(id);
                this.saveLocation(si);
            }
            return si;
        }

        public getGroupInfoById(id: string) {
            var si = <GroupInfo>this.getLocation(id);
            if (!si) {
                si = new GroupInfo(this);
                si.loadFromWeb(id);
                this.saveLocation(si);
            }
            return si;
        }

        public getArtInfoById(id:string)
        {
            var si = <ArtInfo>this.getLocation(id);
            if (!si) {
                si = new ArtInfo(this);
                si.loadFromWeb(id);
                this.saveLocation(si);
            }
            return si;
        }

        private saveLocation(b:BrowserPage)
        {
            if (b.publicId)
                this.locationCache[b.publicId] = b;
            else if (b instanceof ScriptInfo) {
                this.locationCache[(<ScriptInfo>b).getGuid()] = b;
            }
        }

        static expandableTextBox(s:string)
        {
            if (!s) s = "";
            var maxLen = 300;
            var shortLen = maxLen - 50;

            s = s.replace(/\r\n/g, "\n");
            s = s.replace(/\r/g, "\n");
            s = s.replace(/\n+$/, "");

            if (s.replace(/[^\n]/g, "").length > 3 || s.length > maxLen) {
                var r:HTMLElement =
                    div("sdExpandableText",
                            s.slice(0, shortLen) + "... ",
                            div("sdExpandButton",
                                s.length > shortLen ?
                                    "expand (+" + (s.length - shortLen) + ")" :
                                    "expand",
                                div("sdExpandButtonTarget").withClick(() => {
                                    Browser.setInnerHTML(r, Util.formatText(s));
                                })));
                return r;
            } else {
                return Host.textBox(s);
            }
        }

        static textBox(s: string)
        {
            var r = div("sdExpandableText");
            Browser.setInnerHTML(r, Util.htmlEscape(s).replace(/\n/g, "<br/>"));
            return r;
        }

        public showSidePane()
        {
            super.showSidePane();
            this.setBackButton();
        }

        public hideSidePane()
        {
            super.hideSidePane();
            this.setBackButton()
        }


        //
        // Search
        //

        private searchKey()
        {
            //Util.normalizeKeyEvent(e);
            this.showSidePane();
            if (this.lastSearchValue != this.searchBox.value) {
                this.lastSearchValue = this.searchBox.value;
                this.syncView();
            }
            //if (e.keyName == "Enter" && !!this.searchOnline) {
            //    this.searchOnline();
           // }
        }

        private setSearch(s:string)
        {
            this.searchBox.value = s;
            this.lastSearchValue = s;
        }

        public searchFor(s:string)
        {
            this.setSearch(s);
            this.syncView();
        }

        public keyDown(e:KeyboardEvent)
        {
            var s = Util.keyEventString(e);
            if (s && !e.ctrlKey && !e.metaKey) {
                this.setSearch(s);
                this.syncView();
                Util.setKeyboardFocus(this.searchBox);
                return true;
            }


            switch (e.keyName) {
            case "Esc":
                if (this.lastSearchValue != "") {
                    this.setSearch("");
                    this.syncView();
                    this.searchBox.blur();
                } else {
                    this.showHub();
                }
                break;

            default:
                return false;
            }


            return true;
        }

        public syncDone()
        {
            if (this.reloadInstalled)
                this.reloadInstalled();
        }


        /// Hack according to Michal:
        /// In portrait mode, if you click on hub- > my scripts- > see more, you go to #list: installed - scripts,
        /// and then immediately to #modal - side, with the actual list.
        /// When you hit back, without this hack you would see an empty screen
        public hashReloaded()
        {
            var h = HistoryMgr.windowHash().split(/:/)
            if (SizeMgr.portraitMode && h[0] == "#list" && !h[2]) {
                Ticker.dbg("history.back from Host.hashReloaded");
                Util.goBack()
            }
        }

        public notifySyncDone()
        {
            this.updateInstalledHeaderCacheAsync().done(() => {
                if (currentScreen)
                    currentScreen.syncDone();
            });
        }

        public getTutorialUpdateKeyAsync(ht:HelpTopic)
        {
            if (ht.json.rootid == "none" &&
                ht.json.id && ht.json.id != "none") {
                return TheApiCacheMgr.getAsync(ht.json.id, true).then(scr => {
                    if (scr)
                        ht.json.rootid = scr.rootid
                    return ht.updateKey()
                })
            } else return Promise.as(ht.updateKey())
        }
    }

    export enum EntryState
    {
        stale,
        fetching,
        current,
    }

    export interface SerializedApiCacheEntry
    {
        path:string;
        lastUse:number;
        etag?:string;
        currentData?:any;
    }

    // this is not a promise - it may trigger updates twice
    export class ApiCacheEntry
    {
        public currentData:any;
        public etag:string;
        private callbacks = [];
        private state = EntryState.stale;
        public hardSerialized = 0; // 0 - no, 1 - done, negative - in progress
        public lastUse = 0;
        private suspended = false;
        private attachedIds:string[] = [];

        constructor(public path:string, public mgr:ApiCacheMgr) {
        }
        public getReqObj()
        {
            var reqObj:any = { "relative_url": this.path }
            if (this.etag)
                reqObj["If-None-Match"] = this.etag;
            return reqObj;
        }

        public isCurrent() { return this.state == EntryState.current; }

        public fetch()
        {
            this.state = EntryState.fetching;
            if (!this.suspended)
                this.mgr.queueRequest(this);
        }

        public suspend()
        {
            if (this.state != EntryState.current) {
                this.suspended = true;
            }
        }

        public resume()
        {
            if (this.suspended) {
                this.suspended = false;
                if (this.state == EntryState.fetching)
                    this.mgr.queueRequest(this);
            }
        }

        public validate()
        {
            this.state = EntryState.current;
        }

        public invalidate()
        {
            this.state = EntryState.stale;
        }

        public got404()
        {
            if (/^me\/reviewed/.test(this.path))
                this.gotData({ id: "" }, "");
        }

        public gotData(data:any, etag:string)
        {
            var wasSame = false;
            this.etag = etag;
            var newDataStr = JSON.stringify(data)
            if (!!this.currentData)
                wasSame = newDataStr == JSON.stringify(this.currentData);
            this.mgr.logData(wasSame ? 1 : newDataStr.length)
            this.hardSerialized = 0
            this.currentData = data;
            if (this.state == EntryState.fetching)
                this.state = EntryState.current;
            var cbs = this.callbacks;
            // it is critical that this list gets cleared;
            // otherwise they will keep accumulating as the user navigates around
            this.callbacks = [];
            var opts = <DataOptions>{ isDefinitive: true, isSame: wasSame };
            cbs.forEach((f) => { f(data, opts) });
            this.attachedIds.forEach((id) => {
                var e = elt(id);
                if (e && (<any>e).autoUpdate) {
                    (<any>e).autoUpdate(e, this.currentData, opts);

                }
            });
        }

        public gotError(err:any)
        {
            this.callbacks = [];
        }

        public set(d:any, weak = false)
        {
            this.hardSerialized = 0
            this.currentData = d
            this.mgr.logData(JSON.stringify(d).length)
            this.etag = ""

            if (!weak) {
                this.state = EntryState.current;
                this.refresh();
            }
        }

        public refresh()
        {
            this.lastUse = new Date().getTime();
            if (this.state == EntryState.stale)
                this.fetch();
        }

        private currentOptions() { return <DataOptions>{ isDefinitive: this.state == EntryState.current, isSame: false }; }

        public whenUpdated(f:(x:any, opts:DataOptions) => void)
        {
            if (this.state == EntryState.fetching)
                this.callbacks.push(f);
            if (!!this.currentData)
                f(this.currentData, this.currentOptions());
        }

        public attachAutoUpdate(elt:HTMLElement)
        {
            if (this.currentData)
                (<any>elt).autoUpdate(elt, this.currentData, this.currentOptions());
            this.attachedIds.push(elt.id);
        }

        public toJson(justTime:boolean):SerializedApiCacheEntry
        {
            if (justTime)
                return { path: this.path, lastUse: this.lastUse }
            else
                return {
                    path: this.path,
                    lastUse: this.lastUse,
                    etag: this.etag,
                    currentData: this.mgr.compressList(this.currentData)
                }
        }

        public updateWithJson(j:SerializedApiCacheEntry)
        {
            this.lastUse = j.lastUse;
            if (j.currentData) {
                this.etag = j.etag
                this.currentData = j.currentData
                this.hardSerialized = 0
            }
        }
    }

    export class BogusApiCacheEntry
        extends ApiCacheEntry
    {
        constructor(par:ApiCacheMgr) {
            super("*bogus*", par)
        }
        public fetch() {}
    }

    export interface DataOptions
    {
        isDefinitive:boolean;
        isSame:boolean;
    }

    interface MassiveJsonList
        extends JsonList
    {
        disableMassiveReview:boolean;
    }

    export class ApiCacheMgr
    {
        private entriesByPath:StringMap<ApiCacheEntry> = {};
        private offlineErrorReported = false;
        private pendingReqs:ApiCacheEntry[] = [];
        private massiveReviewObject = {};
        private massiveReviewInitDone = false;
        private lastHardRefreshTime = 0;
        static massiveReviewUrl = "me/reviews?count=199";
        private hardStorage:Promise;
        private currentSerializationId = -1;
        private unflushedDataSize = 0;

        static maxLocalStorageSize = 512*1024;
        static maxEntrySize = 32*1024;
        static maxHardStorageSize = 4*1024*1024;
        static localStorageFlushThreshold = ApiCacheMgr.maxLocalStorageSize / 4;

        private autoUpdateId = 0;

        public initMassiveReview()
        {
            if (Cloud.lite) {
                this.massiveReviewObject = null
            }

            if (this.massiveReviewInitDone) return;
            this.massiveReviewInitDone = true;

            var e = this.getCore(ApiCacheMgr.massiveReviewUrl)
            if (e.currentData && (<MassiveJsonList>e.currentData).disableMassiveReview) {
                this.massiveReviewObject = null
            } else {
                e.refresh();
                e.whenUpdated((lst:MassiveJsonList, opts:DataOptions) => {
                    if (lst.continuation) {
                        lst.disableMassiveReview = true;
                        this.massiveReviewObject = null
                        return;
                    }

                    var curr = this.massiveReviewObject;
                    if (!curr) return; // disabled before
                    Object.keys(curr).forEach((k) => {
                        if (!curr[k].stored)
                            delete curr[k];
                    });

                    lst.items = lst.items.map((r:JsonReview):any => {
                        if (!curr[r.publicationid])
                            curr[r.publicationid] = { id: r.id };
                        return { id: r.id, publicationid: r.publicationid }
                    });
                });
            }
        }

        public registerAutoUpdate(url:string, elt:HTMLElement, update:(elt:HTMLElement, data:any, options:DataOptions)=>void)
        {
            elt.id = "autoUpdate-" + this.autoUpdateId++;
            (<any>elt).autoUpdate = update;
            var entry = this.get(url);
            entry.attachAutoUpdate(elt);
            return elt;
        }

        public storeHeart(id:string, hid:string)
        {
            this.initMassiveReview();
            if (this.massiveReviewObject)
                this.massiveReviewObject[id] = { id: hid, stored: true };
            else
                this.store("me/reviewed/" + id, { id: hid });
            this.invalidate(id);
        }

        private heartId(id:string)
        {
            var res = this.massiveReviewObject[id];
            if (!res) return "";
            else return res.id;
        }

        public getHeart(id:string, changedMyMind:(reviewId:string)=>void)
        {
            var late = false;
            var res = "";

            this.initMassiveReview();

            if (this.massiveReviewObject) {
                var e = this.getCore(ApiCacheMgr.massiveReviewUrl);
                if (!e.isCurrent()) {
                    e.whenUpdated((data, opts) => {
                        if (late && changedMyMind && this.massiveReviewObject) {
                            changedMyMind(this.heartId(id));
                        }
                    });
                }
                res = this.heartId(id);
            } else {
                this.getAnd("me/reviewed/" + id, (d) => {
                    res = d.id;
                    if (late && changedMyMind) {
                        changedMyMind(res);
                    }
                });
            }

            late = true;
            return res;
        }

        public compressList(l:JsonList) : any
        {
            var compress = (i:JsonIdObject):any => {
                if (i && this.entriesByPath.hasOwnProperty(i.id))
                    return i.id;
                else
                    return i;
            }

            if (!l) return l;

            if (l.items) {
                // STRBUG what's the cast to JsonIdObject?
               return <JsonList>{ continuation: l.continuation, items: <JsonIdObject[]>l.items.map(compress), etags: null };
            } else return l;
        }

        private flushReqArray(reqs:ApiCacheEntry[])
        {
            Cloud.postApiBatch({ array: reqs.map((e) => e.getReqObj()) }).done(
                (resps:Cloud.BatchResponses) => {
                    reqs.forEach((entry, i) => {
                        var resp = resps.array[i];
                        if (!resp)
                            this.handleError("no such entry", entry);
                        else if (resp.code == 304)
                            entry.gotData(entry.currentData, entry.etag);
                        else if (resp.code == 200)
                            entry.gotData(resp.body, resp.ETag);
                        else if (resp.code == 404)
                            entry.got404();
                        else {
                            if (resp.code == 400 && window.localStorage["everLoggedIn"] && !Cloud.isOffline() && !Cloud.getAccessToken())
                                Login.show();
                            this.handleError("wrong code " + resp.code, entry);
                        }
                    });
                },
                (err:any) => {
                    reqs.forEach((entry) => this.handleError(err, entry))
                });
        }

        private flushRequests()
        {
            var max = 40;
            while (this.pendingReqs.length > 0) {
                var arr = this.pendingReqs.slice(0, max);
                this.pendingReqs.splice(0, max);
                this.flushReqArray(arr);
            }
        }

        public queueRequest(entry:ApiCacheEntry)
        {
            if (this.pendingReqs.length == 0)
                Util.setTimeout(1, () => this.flushRequests());
            this.pendingReqs.push(entry);
        }

        private handleError(err: any, entry: ApiCacheEntry) {
            entry.gotError(err);

            if (this.offlineErrorReported) return;
            if (!window.localStorage["everLoggedIn"])
                return;
            this.offlineErrorReported = true;
            if (Cloud.isTouchDevelopOnline()) {
                HTML.showProgressNotification(Util.fmt("cannot reach {0}{1}; are you offline or not signed in?",
                    Cloud.getServiceUrl(), dbg ? ("/" + entry.path) : ""))
            }
        }

        private decompressLists()
        {
            var oops = false;
            var decompress = (v:any):any => {
                if (typeof v == "string") {
                    var d = this.entriesByPath.hasOwnProperty(v) ? this.entriesByPath[v].currentData : null;
                    if (!d) oops = true;
                    return d;
                } else {
                    if (!v) oops = true;
                    return v;
                }
            }

            Object.keys(this.entriesByPath).forEach((k) => {
                var e = this.entriesByPath[k];
                var d = e.currentData;
                if (d && d.items) {
                    oops = false;
                    d.items = d.items.map(decompress);
                    // this happens when an entry in the list is evicted from the cache, but the list itself is not
                    // this should be fixed properly, but is rather rare
                    if (oops) {
                        e.hardSerialized = 0
                        e.currentData = null;
                        e.etag = "";
                    }
                }
            });
        }

        public invalidate(path:string)
        {
            this.forEachEntry((e) => {
                if (Util.startsWith(e.path, path))
                    e.invalidate()
            })
        }

        public validate(path:string, etag:string)
        {
            var e = <ApiCacheEntry> this.entriesByPath[path];
            if (e) {
                if (e.etag == etag) {
                    e.validate();
                }
            }
        }

        public store(path:string, resp:any, etag = "", weak = false) : ApiCacheEntry
        {
            var e:ApiCacheEntry;
            if (this.entriesByPath.hasOwnProperty(path)) {
                e = this.entriesByPath[path];
                if (!etag && JSON.stringify(resp) == JSON.stringify(e.currentData))
                    return e;
            } else {
                e = new ApiCacheEntry(path, this);
                this.entriesByPath[path] = e;
            }
            e.set(resp, weak);
            e.etag = etag;
            return e;
        }

        public getSuspended(path:string) : ApiCacheEntry
        {
            var e = this.getCore(path);
            e.suspend();
            return e;
        }

        private get(path:string) : ApiCacheEntry
        {
            var e = this.getCore(path);
            e.refresh();
            return e;
        }

        private getCore(path:string) : ApiCacheEntry
        {
            var e:ApiCacheEntry;
            if (this.entriesByPath.hasOwnProperty(path)) {
                e = this.entriesByPath[path];
            } else {
                e = new ApiCacheEntry(path, this);
                this.entriesByPath[path] = e;
            }
            return e;
        }

        public has(path:string)
        {
            var e = <ApiCacheEntry> this.entriesByPath[path];
            return (!!e && !!e.currentData);
        }

        public getCached(path:string)
        {
            var e = <ApiCacheEntry> this.entriesByPath[path];
            if (e) return e.currentData;
            else return undefined;
        }

        public getAndEx(path:string, f:(x:any,opts:DataOptions)=>void)
        {
            var e = this.get(path);
            e.whenUpdated(f);
            return e;
        }

        public getAnd(path:string, f:(x:any)=>void)
        {
            var e = this.get(path);
            e.whenUpdated((d, o) => { if (!o.isSame) f(d); });
            return e;
        }

        public getAsync(path:string, cachedOK = false)
        {
            var called = false;

            return new Promise((onSuccess: (v: any) => any, onError: (v: any) => any, onProgress: (v: any) => any) => {
                this.getAndEx(path, (v, opts) => {
                    if (!called && (cachedOK || opts.isDefinitive)) {
                        called = true;
                        onSuccess(v);
                    }
                });
            });
        }

        private stringify(id:number)
        {
            var forLocal = id == 0
            var maxSize = forLocal ? ApiCacheMgr.maxLocalStorageSize : ApiCacheMgr.maxHardStorageSize;
            var entries:ApiCacheEntry[] = Object.keys(this.entriesByPath).map((k) => this.entriesByPath[k]);
            entries.sort((a, b) => b.lastUse - a.lastUse);
            var res = "[";
            var first = true;
            for (var i = 0; i < entries.length; ++i) {
                var entry = entries[i]
                if (!entry.currentData) continue;

                var s:string;
                if (forLocal && entry.hardSerialized == 1) {
                    if (entry.lastUse > this.lastHardRefreshTime)
                        s = JSON.stringify(entry.toJson(true))
                    else
                        continue;
                } else {
                    s = JSON.stringify(entry.toJson(false));
                    entry.hardSerialized = id
                }
                if (s.length > ApiCacheMgr.maxEntrySize) continue;
                if (res.length + s.length > maxSize) break;
                if (first)
                    first = false;
                else
                    res += ",";
                res += s;
            }
            res += "]";
            return res;
        }

        public snapshotCacheAsync(storage:any)
        {
            return this.flushToHardStorageAsync()
                .then(() => this.hardStorage)
                .then((table:Storage.Table) => table.getValueAsync("data"))
                .then(data => {
                    storage.apiCache = JSON.parse(data)
                    return
                })
        }

        public restoreCacheAsync(storage:any)
        {
            if (!storage.apiCache) return Promise.as()
            return Storage.getTableAsync("ApiCache")
                .then((table:Storage.Table) => table.setItemsAsync({ data: JSON.stringify(storage.apiCache) }))
        }

        public flushToHardStorageAsync()
        {
            var id = this.currentSerializationId--
            this.unflushedDataSize = 0

            return this.hardStorage.then((table:Storage.Table) =>
                table.setItemsAsync({ data: this.stringify(id) }))
            .then(() => {
                    this.forEachEntry((entry) => {
                        if (entry.hardSerialized == id) {
                            entry.hardSerialized = 1
                            this.lastHardRefreshTime = Math.max(this.lastHardRefreshTime, entry.lastUse)
                        }
                    })
                    this.save() // update localStorage version (should be smaller now)
                });
        }

        private forEachEntry(f:(e:ApiCacheEntry)=>void)
        {
            Object.keys(this.entriesByPath).forEach((k) => {
                f(this.entriesByPath[k])
            })
        }

        private loadEntries(s:string)
        {
            if (!s) return;
            try {
                var entries:SerializedApiCacheEntry[] = JSON.parse(s);
                entries.forEach((j) => {
                    var path = j.path;
                    var e:ApiCacheEntry = this.entriesByPath[path];
                    if (!e) {
                        e = new ApiCacheEntry(path, this)
                        this.entriesByPath[path] = e
                    }
                    e.updateWithJson(j)
                });
                this.decompressLists();
            } catch (e) { }
        }

        public initAsync()
        {
            this.hardStorage = Storage.getTableAsync("ApiCache")
            Ticker.dbg("ApiCacheMgr.initAsync: got table promise");
            return this.hardStorage.
                then((table:Storage.Table) => {
                    Ticker.dbg("ApiCacheMgr.initAsync: got table");
                    return table.getValueAsync("data")
                }).
                then((v:string) => {
                    Ticker.dbg("ApiCacheMgr.initAsync: got data");
                    this.entriesByPath = {} // just in case
                    this.loadEntries(v);
                    this.forEachEntry((entry) => {
                        entry.hardSerialized = 1
                        this.lastHardRefreshTime = Math.max(this.lastHardRefreshTime, entry.lastUse)
                    })
                    var s = window.localStorage["cacheMgrState"];
                    this.loadEntries(s)
                    this.unflushedDataSize = s ? s.length : 0
                    if (this.unflushedDataSize > 128)
                        return this.flushToHardStorageAsync();
                });
        }

        public save()
        {
            var s = this.stringify(0);
            Util.log("saving cache mgr, {0} bytes", s.length);
            window.localStorage["cacheMgrState"] = s;
            this.unflushedDataSize = s.length;
        }

        public logData(size:number)
        {
            this.unflushedDataSize += size + 50;
            if (this.unflushedDataSize > ApiCacheMgr.localStorageFlushThreshold)
                this.flushToHardStorageAsync().done();
        }
    }

    export interface TabLabel extends HTMLElement
    {
        theTab:BrowserTab;
    }

    export class BrowserTab
    {
        public inlineContent:HTMLElement;
        public inlineContentContainer:HTMLElement;
        public tabContent:HTMLElement;
        public tabLoaded = false;
        public isEmpty = false;

        constructor(public parent:BrowserPage) {
        }
        public browser() { return this.parent.parentBrowser; }
        public getName() { return ""; }
        public getId() { return ""; }

        public inlineIsTile() { return true; }
        public bgIcon() { return ""; }
        public noneText() { return ""; }

        public setVisibility(v:boolean)
        {
            this.inlineContentContainer.style.display = v ? (this.inlineIsTile() ? "inline-block" : "block") : "none";
        }

        public initElements()
        {
            this.inlineContent = <HTMLElement>div(this.inlineIsTile() ? "sdTabTile" : "sdInlineTab").withClick(() => {
                this.browser().loadTab(this);
            });
            this.inlineContentContainer = div("sdInlineContentContainer", this.inlineContent);
            this.tabContent = div("sdTab");
        }

        public initInline() {}
        public initTab() : void { Util.abstract() }

        public update()
        {
            this.initInline();
            if (this.tabLoaded)
                this.initTab();
        }
    }


    export class BrowserMultiTab extends BrowserTab {
        private subTabs: BrowserTab[];
        public initialTabContent;

        public getSubTabs() { return this.subTabs }

        constructor(parent: BrowserPage, desc: any, ...childClasses: any[]) {
            super(parent);
            if (desc) this.initialTabContent = div("sdTabDescription", desc);
            this.subTabs = childClasses.map(clazz => <BrowserTab>new clazz(parent));
            this.subTabs.forEach(tab => { tab.initElements(); tab.initInline(); });
        }

        static generateReplacementTileContents(t: BrowserTab) {
            var label = div("sdTabTileLabel", span(null, t.getName()));
            var img = null;
            if (t.bgIcon())
                img = HTML.mkImg(t.bgIcon() + ",black,clip=80");
            return [div("sdTabTileReplacementIcon", img), label];
        }

        static generateReplacementTile(t: BrowserTab) {
            var conts = BrowserMultiTab.generateReplacementTileContents(t);
            var inlineContent = <HTMLElement>div("sdTabTile", conts).withClick(() => {
                t.browser().loadTab(t);
            });

            var ret = div("sdInlineContentContainer", inlineContent);
            ret.style.display = "inline-block";
            return ret;
        }

        public initTab(): void {
            var tabTiles = this.subTabs.map(t => {
                if (t.inlineContent.children.length > 0) return t.inlineContentContainer;
                else return BrowserMultiTab.generateReplacementTile(t);
            });

            this.tabContent.setChildren([]);
            if (this.initialTabContent) this.tabContent.appendChild(this.initialTabContent);
            this.tabContent.appendChildren(tabTiles);
        }

        public switchTo(ix: number) {
            this.browser().loadTab(this.subTabs[ix]);
        }
    }

    export interface Boxable {
        mkSmallBox(): HTMLElement;
        match(terms:string[], fullName:string):number;
        lastScore:number;
    }

    export class BrowserPage
        extends BrowserTab
        implements Boxable
    {
        private tabsCache:BrowserTab[];
        public publicId:string;
        public currentTab:BrowserTab;
        public lastScore:number;

        public getPublicationId() { return this.publicId; }
        public additionalHash() { return "" }

        constructor(public parentBrowser:Host) {
            super(null);
            this.parent = this;
        }
        public isMe() { return this.publicId == Cloud.getUserId(); }

        public currentlyForwardsTo() { return this; }

        public persistentId():string { return ""; }
        public getTitle():string { return this.publicId; }
        public showInList() { return true; }

        static comparePages(a: BrowserPage, b: BrowserPage): number {
            var c = b.lastScore - a.lastScore;
            if (c != 0) return c;

            if (a instanceof CommentInfo && b instanceof CommentInfo) {
            }

            if (a instanceof ScriptInfo && b instanceof ScriptInfo)
                return ScriptInfo.compareScripts(<ScriptInfo>a, <ScriptInfo>b);
            else
                return c;
        }

        public activateTab(t:BrowserTab)
        {
            this.currentTab = t;
        }

        public equals(other:BrowserPage) { return other && (this == other || this.persistentId() == other.persistentId()); }

        public mkSmallBox():HTMLElement
        {
            return this.mkBoxCore(false).withClick(() => { this.parentBrowser.loadDetails(this) });
        }

        public mkSmallBoxNoClick():HTMLElement
        {
            return this.mkBoxCore(false);
        }

        public mkBigBox():HTMLElement
        {
            return this.mkBoxCore(true);
        }

        public reportAbuse(big:boolean):HTMLElement
        {
            if (!big || !this.getPublicationId()) return null;

            return div("sdReportAbuse", HTML.mkImg("svg:SmilieSad,#000,clip=100"), lf("report abuse")).withClick(() => {
                window.open(Cloud.getServiceUrl() + "/user/report/" + this.getPublicationId())
            });

        }

        // sizes are 1 (smallest), 2, 3
        public mkTile(size:number) : HTMLElement { return Util.abstract() }

        public getAllTabs():BrowserTab[]
        {
            var tabs = this.getTabs()
            var res = tabs.slice(0)
            tabs.forEach(t => {
                if (t instanceof BrowserMultiTab)
                    res.pushRange((<BrowserMultiTab>t).getSubTabs())
            })
            return res
        }

        public getTabs():BrowserTab[]
        {
            if (!this.tabsCache) {
                this.tabsCache = this.mkTabsCore().filter((t) => !!t);
                this.tabsCache.forEach((t:BrowserTab) => t.initElements());
                this.tabsCache.forEach((t:BrowserTab) => t.initInline());
            }
            return this.tabsCache;
        }

        public mkBoxCore(big:boolean):HTMLElement { return Util.abstract() }
        public mkTabsCore():BrowserTab[] { return [this]; }
        private loadDetails():HTMLElement[] { return Util.abstract() }

        public match(terms:string[], fullName:string)
        {
            return 0;
        }

        public withUpdate(elt:HTMLElement, update:(data:any)=>void)
        {
            return TheApiCacheMgr.registerAutoUpdate(this.publicId, elt, (elt, data, opts) => {
                if (!opts.isSame) update(data);
            });
        }

        public twitterMessage()
        {
            return "Cool #touchdevelop script";
        }

        public facebookLike(): HTMLElement {
            var id = this.getPublicationId();
            if (!id) return null;

            var url = Cloud.getServiceUrl() + "/" + id;
            var text = this.twitterMessage();
            var r: HTMLElement;
            if (Cloud.isOffline())
                r = div("sdReportAbuse", HTML.mkImg("svg:Package,#000,clip=100"), 'package').withClick(() => {
                    TDev.RT.ShareManager.shareLinkAsync(TDev.RT.Web.link_url(text, url), "");
                });
            else
                //r = div("sdCmtBtn", HTML.mkImg("svg:Package,#000"), 'share').withClick(() => {});
                r = TDev.RT.ShareManager.facebookLike(text, url, null);
            return r;
        }
    }

    export class ListTab
        extends BrowserTab
    {
        public numElts:string;
        private eltsSoFar:JsonPublication[] = [];

        constructor(par:BrowserPage, public urlSuff:string) {
            super(par)
        }
        public script():ScriptInfo { return this.parent instanceof ScriptInfo ? <ScriptInfo>this.parent : null; }

        public hideOnEmpty() { return false; }
        public needsJsonScript() { return false; }
        public getPreciseCount() { return -1; }
        public topContainer():HTMLElement { return null; }

        public inlineText(e:JsonIdObject) : any[] { return null; }
        public tabBox(e:JsonIdObject) : HTMLElement { return null; }

        static limitLength(s:string, max:number)
        {
            return s.length > max ? s.slice(0, max) + "..." : s;
        }

        public getUrl() { return this.parent.getPublicationId() + this.urlSuff; }

        public resetEltsSoFar() { }

        public nextCount(cont: string): number {
            if (!cont) // first time querying
                return Browser.isCellphone ? 7 : Browser.isMobile ? 12 : 15;
            else // user asked for more
                return Browser.isCellphone ? 20 : Browser.isMobile ? 25 : 30;
        }
        public loadMoreElementsAnd(cont:string, f:(items:any[], cont:string)=>void)
        {
            var id = this.parent.getPublicationId();
            if (!id) return;
            var count = this.nextCount(cont);
            var path = this.getUrl() + (/\?/.test(this.getUrl()) ? "&" : "?") + "count=" + count + (!cont ? "" : "&continuation=" + cont);
            TheApiCacheMgr.getAnd(path, (l:JsonList) => {
                if (!cont) {
                    this.resetEltsSoFar();
                    this.eltsSoFar = [];
                }

                this.eltsSoFar.pushRange(<JsonPublication[]>l.items);
                this.numElts = this.eltsSoFar.length + "";
                var c = l.continuation;
                if (!!c) this.numElts += "+";
                if (this.needsJsonScript() && !!this.script()) {
                    var prom = this.script().getJsonScriptPromise();
                    if (!prom.currentData)
                        f(l.items, c);
                    prom.whenUpdated((dat,opts) => { if (!opts.isSame) f(l.items, c); });
                } else {
                    f(l.items, c);
                }
            });
        }

        public getTileLabel(c:string)
        {
            var nm = this.getName();
            if (c == "1") nm = nm.replace(/s$/, "");
            return div("sdTabTileLabel", span(null, nm));
        }

        public getTileContent(c:string):any[]
        {
            var img = null;
            if (this.bgIcon())
                img = HTML.mkImg(this.bgIcon() + ",black,clip=80");
            return [div("sdTabTileCount", span(null, c), img), this.getTileLabel(c)];
        }

        private setCount(c:string)
        {
            this.inlineContent.setChildren(this.getTileContent(c));
        }

        public initElements()
        {
            super.initElements();
            this.inlineContentContainer.className = "sdInlineContentContainer sdList-" + this.getId();
            if (!!this.parent.getPublicationId()) {
                this.setVisibility(true);
                if (this.inlineIsTile())
                    this.setCount("");
                else
                    this.inlineContent.setChildren([]) // [div("sdNothing", "loading " + this.getName() + "...")]);
            }
        }

        public initInline()
        {
            this.loadMoreElementsAnd(null, (cmts:JsonPublication[]) => {
                if (this.hideOnEmpty() && cmts.length == 0) {
                    this.setVisibility(false);
                    this.isEmpty = true;
                    this.browser().syncTabVisibility();
                } else {
                    this.setVisibility(true);
                    var num = this.getPreciseCount();
                    if (num >= 0)
                        this.numElts = num + "";
                    if (num < 0)
                        num = cmts.length;
                    if (this.numElts == "0") {
                        this.inlineContent.setChildren([div("sdTabTileNothing", span(null, this.noneText())), this.getTileLabel("")])
                    } else {
                        this.setCount(this.numElts);
                    }

                    /*
                    var hd = " " + (num == 1 ? this.getName().replace(/s$/, "") : this.getName());
                    var children = <HTMLElement[]>[div("sdInlineHd", span("sdInlineHdNum", this.numElts), span("sdInlineHdLabel", hd))];
                    var len = 0;
                    var maxLen = 300;
                    var first = true;
                    cmts.forEach((c:JsonPublication) => {
                        if (len < maxLen) {
                            var inl = this.inlineText(c);
                            if (first) first = false;
                            else inl.unshift(", ");
                            var t = span("sdSubtle", inl);
                            children.push(t);
                            len += t.textContent.length;
                        }
                    });
                    if (len >= maxLen)
                        children.push(span("sdSubtle", span("sdBold", " and more!")));

                    this.inlineContent.setChildren(children);
                    */
                }
            });
        }

        public finalListElt():HTMLElement { return div(null) }

        private loadMoreBtn(cont:string) : HTMLElement
        {
            var btn:HTMLElement = HTML.mkButton(lf("load more"), () => {
                btn.removeSelf();
                var loading = div("sdLoadingMore", lf("loading more..."));
                this.tabContent.appendChild(loading);
                this.loadMoreElementsAnd(cont, (elts:JsonPublication[], cont:string) => {
                    loading.className = "";
                    loading.setChildren(elts.map((c) => this.tabBox(c)));
                    if (!!cont) loading.appendChild(this.loadMoreBtn(cont));
                    else loading.appendChild(this.finalListElt())
                });
            });
            return btn;
        }

        public initTab()
        {
            var tc = this.topContainer()
            this.loadMoreElementsAnd(null, (cmts:JsonPublication[], cont:string) => {
                var children = cmts.map((c) => this.tabBox(c));
                if (tc) children.unshift(tc);
                this.tabContent.setChildren(children);
                if (!!cont) this.tabContent.appendChild(this.loadMoreBtn(cont));
                else this.tabContent.appendChildren(this.finalListElt())
            });
        }
    }

    export class CloudSessionsTab
        extends BrowserTab {
        constructor(par: BrowserPage) {
            super(par)
        }
        public getId() { return "cloud-sessions"; }
        public getName() { return lf("cloud sessions"); }

        public initTab() {
            var descDiv: HTMLElement = div('sdInlineHelp', 'Some scripts may use cloud sessions to store data, and to make data available for many users and on many devices. Here you can manage cloud sessions that you created, and cloud sessions that are cached locally because you connected to them recently.');
            this.tabContent.setChildren([
                descDiv]);
            this.tabContent.appendChildren([
                HTML.mkButton(lf("manage my cloud sessions"), () => {
                    if (!Runtime.theRuntime || !Runtime.theRuntime.sessions.enable_script_session_mgt)
                        ModalDialog.info(lf("not available"),
                            lf("No runtime information found. Please run some script first."))
                     else {
                        Cloud.authenticateAsync(lf("cloud data")).then((authenticated) => {
                            if (authenticated)
                                // check if last session matches
                                return TDev.RT.CloudData.managementDialog(Runtime.theRuntime);
                        }).done();
                    }
           })]);
        }
    }

    export class StoreAppsTab
        extends BrowserTab {
        constructor(par: BrowserPage, private name : string, private path : string, private logo : string) {
            super(par)
        }
        public getId() : string { return this.path; }
        public getName() : string { return this.name; }

        private mkBox(b: Host, c: JsonStoreApp) {
            var cont = [];
            var addNum = (n:number, sym:string) => { cont.push(ScriptInfo.mkNum(n, sym)) }
            addNum(c.users, "svg:person");
            addNum(c.launches, "svg:play");

            var time = c.time;
            var timeStr = Util.timeSince(time) + " :: /" + c.scriptid;

            var icon = div("sdIcon", HTML.mkImg(c.iconurl));
            icon.style.backgroundColor = ScriptIcons.stableColorFromName(c.storeid);
            var nameBlock = dirAuto(div("sdName", c.title));
            var hd = div("sdNameBlock", nameBlock);

            var numbers = div("sdNumbers", cont);
            var author = div("sdAuthorInner", c.publisher);
            var addInfo = div("sdAddInfoInner", timeStr);
            var res = div("sdHeaderOuter sdBigHeader",
                            div("sdHeader", icon,
                                div("sdHeaderInner", hd, div("sdAddInfoOuter", addInfo), div("sdAuthor", author), numbers)));
            return res.withClick(() => {
                window.location.href = c.url;
            });
        }

        public tabBox(c: JsonStoreApp)
        {
            return this.mkBox(this.browser(), c);
        }

        public initTab() {
            this.tabContent.setChildren([ScriptIcons.getWinLogo(this.logo, 2, '#000'), Editor.mkHelpLink("export to app")]);

            var loadingDiv = div('bigLoadingMore', 'loading...');
            this.tabContent.appendChildren([loadingDiv]);
            Cloud.getPrivateApiAsync(this.parent.publicId + "/" + this.path)
                .done((lst : any) => {
                    loadingDiv.removeSelf();
                    var apps : JsonStoreApp[] = lst.items;
                    var boxes = apps.map(app => this.tabBox(app));
                    this.tabContent.appendChildren(boxes);
                },
                (e) => {
                    loadingDiv.removeSelf();
                    var status = e.status;
                    if (status == 403) {
                        this.tabContent.appendChildren(div('', 'you are not allowed to see this data'));
                    } else {
                        this.tabContent.appendChildren(div('', 'failed to load apps; are you connected to internet?'));
                    }
                });
        }
    }

    export class WindowsStoreAppsTab extends StoreAppsTab {
        constructor(par : BrowserPage) {
            super(par, "Windows Store", "windowsstoreapps", "win8");
        }
    }

    export class WindowsPhoneStoreAppsTab extends StoreAppsTab {
        constructor(par : BrowserPage) {
            super(par, "Windows Phone Store", "windowsphonestoreapps", "wp8");
        }
    }

    export class KeysTab
        extends BrowserTab
    {
        constructor(par:BrowserPage) {
            super(par)
        }
        public getId() { return "keys"; }
        public getName() { return lf("keys"); }

        private mkBox(b: Host, c: TDev.RT.JsonKey) {
            var valueDiv = div("", lf("show"));
            var d = div("sdKey",
                    div("sdKeyUri", HTML.mkA('', c.uri, '_blank', c.uri)),
                    div('',
                        HTML.mkButton(lf("show"), () => {
                            ModalDialog.showText(c.value, "key value", c.uri);
                        }),
                        HTML.mkButton(lf("delete"), () => {
                            ModalDialog.ask(lf("Are you sure you want to delete this key? There is no undo for this operation."), lf("delete it"), () => {
                                HTML.showProgressNotification(lf("deleting key..."));
                                Cloud.deletePrivateApiAsync("me/keys?uri=" + encodeURIComponent(c.uri))
                                    .done(() => {
                                        d.removeSelf();
                                    }, e => {
                                        HTML.showProgressNotification(lf("error deleting key; are you connected to internet?"));
                                    });
                            });
                        })
                    )
                );
            return d;
        }

        public tabBox(c: TDev.RT.JsonKey)
        {
            return this.mkBox(this.browser(), c);
        }

        public initTab() {
            var descDiv : HTMLElement = div('sdInlineHelp', 'The keys are stored in the TouchDevelop cloud and only available to you. \n'
                + 'You can use keys to use web services that require an API key without sharing your key with other users. \n'
                + 'When your script is exported into an app, the key is automatically embedded into the generated app. \n'
                + 'When a user uses a script that requires a key, the user will be automatically prompted to enter their own key. \n'
                + "The 'service url' is the url that points to the registration page to get the key. It uniquely identifies your key. \n"
                + 'Keys can be deleted at any time.');
            this.tabContent.setChildren([
                descDiv,
                HTML.mkButton(lf("add key"), () => {
                var uriInput = HTML.mkTextInput("text", lf("key uri"));
                var valueInput = HTML.mkTextInput("text", lf("key value"));
                var m = new ModalDialog();
                m.add([
                    div("wall-dialog-header", lf("add key")),
                    div("wall-dialog-body", <HTMLElement[]>[
                        div('', "Service Uri"),
                        uriInput,
                        div('', "API Key value"),
                        valueInput
                    ]),
                    div("wall-dialog-buttons", HTML.mkButton(lf("save"), () => {
                        m.dismiss();
                        HTML.showProgressNotification(lf("saving key..."));
                        var key: TDev.RT.JsonKey = { uri : uriInput.value, value : valueInput.value };
                        Cloud.postPrivateApiAsync("me/keys", key)
                            .done(
                                () => {
                                    HTML.showProgressNotification(lf("key saved..."));
                                    this.initTab();
                                },
                                e => HTML.showProgressNotification(lf("could not save key; are you connected to internet?"))
                            );
                    }))
                ]);
                m.show();
            })]);

            var loadingDiv = div('bigLoadingMore', lf("loading..."));
            this.tabContent.appendChildren([loadingDiv]);
            Cloud.getUserApiKeysAsync()
                .done((keys : TDev.RT.JsonKey[]) => {
                    loadingDiv.removeSelf();
                    var boxes = keys.map(key => this.tabBox(key));
                    this.tabContent.appendChildren(boxes);
                },
                (e) => {
                    loadingDiv.removeSelf();
                    this.tabContent.appendChildren(div('', lf("failed to load keys; are you connected to internet?")));
                });
        }
    }

    export class HistoryTab
        extends BrowserTab
    {
        constructor(par:BrowserPage)
        {
            super(par)
        }

        public inlineIsTile() { return false; }
        public getId() { return "history"; }
        public getName() { return lf("history"); }
        private script(): ScriptInfo { return <ScriptInfo>this.parent; }
        public bgIcon() {
            return "svg:Clock";
        }

        // this thing is somewhat internals, for Oregon people
        static anyHistory(path:string)
        {
            var m = /^([a-z]*)\/([a-f0-9-]+)$/.exec(path)
            if (!m) return;
            var u = m[1]
            var guid = m[2]

            TheEditor.historyMgr.setHash("list:edits:" + path, "History");

            if (!Cloud.getAccessToken()) {
                ModalDialog.info("need access token", "you need to be logged in");
                return
            }

            var allItems:JsonHistoryItem[] = []
            var getItems = (cont:string) => {
                Cloud.getPrivateApiAsync(u + "/installed/" + guid + "/history?count=100" + cont)
                .done((resp) => {
                    allItems.pushRange(resp.items)
                    if (resp.continuation) {
                        getItems("&continuation=" + resp.continuation)
                    } else {
                        HistoryTab.showMicroEditsAsync(u, guid, allItems)
                        .done(s => ModalDialog.showText(s))
                    }
                })
            };
            getItems("")
        }

        static historicalTextAsync(uid:string, guid:string, it:JsonHistoryItem)
        {
            var scrid = it.scriptstatus == "published" ? it.scriptid : null
            return scrid ? ScriptCache.getScriptAsync(scrid) :
                    Cloud.getPrivateApiAsync(uid + "/installed/" + guid + "/history/" + it.historyid)
                    .then(resp => resp && resp.bodies && resp.bodies[0] ? resp.bodies[0].script : null);
        }

        private boxFor(it:JsonHistoryItem)
        {
            var s = this.script()
            var guid = s.getGuid()
            var scrid = it.scriptstatus == "published" ? it.scriptid : null
            var icon = div("sdIcon", HTML.mkImg("svg:" + (scrid ? "Upload" : "Clock") + ",white"))
            icon.style.background = scrid ? "#40B619" : "#007FFF";
            var box =
                div("sdHeaderOuter",
                    div("sdHeader",
                        icon,
                        div("sdHeaderInner",
                            div("sdNameBlock", div("sdName", spanDirAuto(it.scriptname + (it.entryNo === undefined ? "" : " #" + it.entryNo)))),
                            div("sdAddInfoOuter",
                                div("sdAddInfoInner",
                                    Util.timeSince(it.time) + (scrid ? " :: /" + scrid : ""))),
                            div("sdAuthor", div("sdAuthorInner showWhenSelected", lf("current"))))))
            box.setFlag("selected", it.isactive)

            box.withClick(() => {
                var scrProm = new PromiseInv();
                var m:ModalDialog = ScriptProperties.showDiff(scrProm, {
                    "restore": () => {
                        var prog = HTML.mkProgressBar()
                        prog.start()
                        m.empty()
                        m.add(prog)
                        m.addHTML("restoring...")
                        Util.childNodes(<HTMLElement>box.parentNode).forEach(n => n.setFlag("selected", false));
                        Cloud.postPrivateApiAsync(Cloud.getUserId() + "/installed/" + guid + "/history/" + it.historyid, {})
                            .then(resp => {
                                box.setFlag("selected", true)
                                return World.syncAsync(false)
                            })
                            .then(() => {
                                prog.stop()
                                m.dismiss()
                                Util.setTimeout(500, () => TheEditor.historyMgr.reload(HistoryMgr.windowHash()))
                            })
                            .done()
                    }
                })

                Promise.join([HistoryTab.historicalTextAsync(Cloud.getUserId(), this.script().getGuid(), it),
                              s.getScriptTextAsync()]).done(texts => {
                    if (!texts[0] || !texts[1])
                        return;
                    var app0 = AST.Parser.parseScript(texts[0]);
                    var app1 = AST.Parser.parseScript(texts[1]);
                    AST.Diff.diffApps(app0, app1)
                    scrProm.success(app1)
                })
            })
            return box
        }

        static showMicroEditsAsync(uid:string, guid:string, allItems:JsonHistoryItem[])
        {
            var numItems = allItems.length
            return Promise.join(allItems.map((it, i) => HistoryTab.historicalTextAsync(uid, guid, it).then(t => {
                HTML.showProgressNotification("history, " + numItems + " to go...")
                numItems--;
                return <AST.Diff.HistoryEntry>{
                    time: it.time,
                    seqNo: allItems.length - i,
                    scriptId: it.scriptstatus == "published" ? it.scriptid : null,
                    historyId: it.historyid,
                    script: t
                }
            }))).then(edits => {
                edits = edits.filter(e => !!e.script)
                if (edits.length == 0) return "no edits";
                edits.reverse()
                AST.Diff.computeMicroEdits(edits)
                AST.Diff.sanityCheckEdits(edits)
                // AST.Diff.scrub(edits)
                var r = JSON.stringify(edits, null, 2)
                AST.reset();
                return r
            })
        }

        public initTab() {
            var loadingDiv = div('bigLoadingMore', 'loading...');
            this.tabContent.setChildren([loadingDiv]);

            if (!Cloud.getUserId()) {
                loadingDiv.setChildren([ "sign in required" ])
                return;
            }

           // TDev.RT.Web.browseAsync(Cloud.getServiceUrl() + "/user/view/" + Script.localGuid).done(),

            var allItems:JsonHistoryItem[] = []

            var buildBoxesAsync = (cont: string) => {
                var guid = this.script().getGuid();
                if (!guid) return Promise.as([lf("This script has not been synchronized with the cloud yet.")]);

                return Cloud.getPrivateApiAsync(Cloud.getUserId() + "/installed/" + guid + "/history" +
                                               (cont ? "?continuation=" + cont : ""))
                    .then((resp) => {
                        resp.items.forEach((it, n) => {
                            it.entryNo = allItems.length + n
                        })
                        allItems.pushRange(resp.items)
                        var r = resp.items.map(it => this.boxFor(it))
                        if (resp.continuation) {
                            var loading = false;
                            var btn = HTML.mkButton(lf("load more"), () => {
                                if (loading) return;
                                Browser.setInnerHTML(btn, "loading...");
                                loading = true;
                                buildBoxesAsync(resp.continuation).done(boxes => {
                                    (<HTMLElement>btn.parentNode).appendChildren(boxes)
                                    btn.removeSelf();
                                })
                            })
                            r.push(btn)
                        } else if (dbg) {
                            r.push(HTML.mkButton(lf("micro edits"), () => {
                                HistoryTab.showMicroEditsAsync(Cloud.getUserId(), this.script().getGuid(), allItems)
                                .done(s => ModalDialog.showText(s))
                            }))
                        }
                        return r
                    })
            }

            buildBoxesAsync(null).done(boxes => this.tabContent.setChildren(boxes))
        }
    }

    export class CodeTab
        extends BrowserTab
    {
        constructor(par:BrowserPage)
        {
            super(par)
        }
        public inlineIsTile() { return false; }
        public getId() { return "code"; }
        public getName() { return lf("code"); }
        private script(): ScriptInfo { return <ScriptInfo>this.parent; }
        public bgIcon() {
            return "svg:AlignLeft";
        }

        public initTab() {
            var loadingDiv = div('bigLoadingMore', 'loading...');
            var baseDiffDiv = div('diffLink');
            this.tabContent.setChildren([baseDiffDiv, loadingDiv]);

            Promise.delay(Browser.isWebkit ? 100 : 1, () => // make sure the 'loading...' is shown while compute-intensive tasks are going on
            {
                var s = this.script();

                if (s.publicId)
                    TheApiCacheMgr.getAsync(s.publicId + "/base", true).then(d => {
                        var baseId = d.id;
                        Browser.setInnerHTML(baseDiffDiv, "show differences from base <a href=\"" + Cloud.getServiceUrl() + "/diff/" + encodeURIComponent(baseId) + "/" + encodeURIComponent(s.publicId) + "\">/" + encodeURIComponent(baseId) + "</a>");
                    }).done();

                return s.getScriptTextAsync().then((scriptText: string) =>
                {
                    loadingDiv.removeSelf();

                    if (!scriptText) {
                        this.tabContent.appendChild(div(null, "script text not available; are you offline?"));
                        return;
                    }

                    this.tabContent.appendChild(
                        div(
                            null,
                            HTML.mkButton(lf("open in editor"),
                                () => {
                                    tickArg(Ticks.coverageOpenInEditor, "script");
                                    RunInfo.openScriptInEditor(this.browser(), s.getAnyId(), null, null, null, null);
                                })));

                    var app = AST.Parser.parseScript(scriptText);
                    AST.TypeChecker.tcScript(app);
                    var renderer = new EditorRenderer();
                    var elts = renderer.declDiv(app);
                    this.tabContent.appendChild(elts);

                    if (!Browser.isCellphone)
                        this.tabContent.appendChild(div(null, HTML.mkButton(lf("for print/email"), () => {
                            ScriptProperties.printScript(app);
                        })));
                });
            }).done();
        }
    }

    export class InsightsTab extends BrowserMultiTab {
        constructor(par: ScriptInfo) {
            super(par,
                lf("This tab contains additional information about this script: the source code (code), the edit history (history), the reference art (art), the given hearts (hearts), the code coverage (coverage), the profiling data (profile), detailed crash reports (buckets)"),
                CodeTab, HistoryTab, ArtTab, ConsumersTab, SuccessorsTab, CrowdCodeCoverageTab, CrowdCodeProfileTab, RunBucketsTab,
                DerivativesTab);
        }

        public bgIcon() {
            return "svg:eye";
        }

        public inlineIsTile() { return true; }

        public initElements() {
            super.initElements();
            this.inlineContent.setChildren(BrowserMultiTab.generateReplacementTileContents(this));
            this.setVisibility(true);
        }

        public initInline() {
            super.initInline();
            this.inlineContent.setChildren(BrowserMultiTab.generateReplacementTileContents(this));
            this.setVisibility(true);
        }

        public getName() { return lf("insights"); }
        public getId() { return "insights"; }
    }

    export class CrowdCodeCoverageTab
        extends BrowserTab {
        constructor(par: BrowserPage) {
            super(par)
        }
        public inlineIsTile() { return false; }
        public getId() { return "coverage"; }
        public getName() { return lf("coverage"); }
        private script(): ScriptInfo { return <ScriptInfo>this.parent; }
        public bgIcon() {
            return "svg:Globe";
        }

        public initTab() {
            tickArg(Ticks.coverageShown, "script");
            var loadingDiv = div('bigLoadingMore', 'loading...');
            var statusDiv = div('', '');
            var desc = "This tab shows which statements that got executed (covered) by someone."
            this.tabContent.setChildren([div("sdTabDescription", desc), Editor.mkHelpLink("coverage", "about coverage"), loadingDiv, statusDiv]);
            var s = this.script();
            var coveragePromise = Cloud.getCoverageDataAsync(s.publicId, TDev.AST.Compiler.version).then(a =>
                a.length > 0 ? a[0] : undefined);

            s.getScriptTextAsync()
                .then((scriptText: string) => {
                    if (!scriptText) {
                        loadingDiv.removeSelf();
                        Browser.setInnerHTML(statusDiv, 'could not get script info; are you connected to internet?');
                        return;
                    }
                    return coveragePromise.then(coverage => {
                        var app = AST.Parser.parseScript(scriptText);
                        AST.TypeChecker.tcScript(app);
                        AST.Compiler.annotateWithIds(app);
                        var renderer = new EditorRenderer();

                        loadingDiv.removeSelf();
                        if (coverage) {
                            Browser.setInnerHTML(statusDiv, coverage.count + " successful runs by " + coverage.users + " users contributed coverage data anonymously");
                            this.tabContent.appendChild(
                                div(
                                    null,
                                    HTML.mkButton(lf("open in editor"),
                                        () => {
                                            tickArg(Ticks.coverageOpenInEditor, "script");
                                            RunInfo.openScriptInEditor(this.browser(), s.getAnyId(), RunBitMap.fromJSON(coverage.astnodes), null, null, null);
                                        })));
                            new ScriptDebuggingAnnotator(RunBitMap.fromJSON(coverage.astnodes), null, null).dispatch(app);
                            var elts = renderer.declDiv(app);
                            this.tabContent.appendChild(elts);
                        } else {
                            Browser.setInnerHTML(statusDiv, "no crowd coverage information available yet");
                        }
                    }, e =>
                    {
                        loadingDiv.removeSelf();
                        Browser.setInnerHTML(statusDiv, "crowd coverage information not available; are you offline?");
                    });
                }).done();
        }
    }

    export class CrowdCodeProfileTab
        extends BrowserTab {
        constructor(par: BrowserPage) {
            super(par)
        }
        public inlineIsTile() { return false; }
        public getId() { return "profile"; }
        public getName() { return lf("profile"); }
        private script(): ScriptInfo { return <ScriptInfo>this.parent; }
        public bgIcon() {
            return "svg:timer";
        }

        public initTab() {
            tickArg(Ticks.profileShown, "script");
            var loadingDiv = div('bigLoadingMore', 'loading...');
            var statusDiv = div('', '');
            var desc = "This tab contains information about performance characteristics of this script."
            this.tabContent.setChildren([div("sdTabDescription", desc), Editor.mkHelpLink("profiling", "about profile"), loadingDiv, statusDiv]);
            var s = this.script();
            var profilePromise = Cloud.getProfileDataAsync(s.publicId, TDev.AST.Compiler.version).then(a => {
                if (a.length == 0) return undefined;
                var profile = <TDev.AST.ProfilingDataCollection>(a[0]);
                var c = profile.count;
                if (c > 1) {
                    var astnodes = profile.astnodes;
                    Object.keys(astnodes).forEach((k) => {
                        var d = astnodes[k];
                        d.count /= c;
                        d.duration /= c;
                    });
                }
                return profile;
            });
            s.getScriptTextAsync()
                .then((scriptText: string) => {
                    if (!scriptText) {
                        loadingDiv.removeSelf();
                        Browser.setInnerHTML(statusDiv, "could not get script info");
                        return;
                    }
                    return profilePromise.then(profile => {
                        var app = AST.Parser.parseScript(scriptText);
                        AST.TypeChecker.tcScript(app);
                        AST.Compiler.annotateWithIds(app);
                        var renderer = new EditorRenderer();

                        loadingDiv.removeSelf();
                        if (profile) {
                            Browser.setInnerHTML(statusDiv, profile.count + "  runs by " + profile.users + " users contributed profile data anonymously");
                            this.tabContent.appendChild(
                                div(
                                    null,
                                    HTML.mkButton(lf("open in editor"),
                                        () => {
                                            tickArg(Ticks.profileOpenInEditor, "script");
                                            RunInfo.openScriptInEditor(this.browser(), s.getAnyId(), null, null, null, profile);
                                        })));
                            new ProfilingResultsAnnotator(profile).dispatch(app);
                            var elts = renderer.declDiv(app);
                            this.tabContent.appendChild(elts);
                        } else {
                            Browser.setInnerHTML(statusDiv, "no crowd profile information available yet");
                        }
                    }, e =>
                    {
                        loadingDiv.removeSelf();
                        Browser.setInnerHTML(statusDiv, "crowd profile information not available; are you offline?");
                    });
                }).done();
        }
    }

    export class RunCodeCoverageTab
        extends BrowserTab {
        constructor(par: RunInfo) {
            super(par)
        }
        public inlineIsTile() { return false; }
        public getId() { return "coverage-map"; }
        public getName() { return lf("coverage map"); }
        private runInfo() { return <RunInfo>(this.parent); }

        public initTab() {
            tickArg(Ticks.coverageShown, "run");
            var desc = "This tab shows which statements got executed (covered) before the script crashed; blue: covered; red: condition=false; green: condition=true"
            this.tabContent.setChildren([div("sdTabDescription", desc)]);
            var loadingDiv = div('bigLoadingMore', 'loading...');
            var statusDiv = div('', '');
            this.tabContent.appendChildren([loadingDiv, statusDiv]);

            this.runInfo().getScriptASTAsync().done((app: AST.App) => {
                if (!app) {
                    loadingDiv.removeSelf();
                    statusDiv.innerHTML = "could not get script info";
                    return;
                }

                this.runInfo().withUpdate(this.tabContent, (v: JsonRun) => {
                    loadingDiv.removeSelf();
                    if (!v.runmap) {
                        statusDiv.innerHTML = "sorry, this run does not contain a coverage map";
                        return;
                    }

                    statusDiv.removeSelf();
                    this.tabContent.appendChildren([div(null, HTML.mkButton(lf("open in editor"), () => { this.runInfo().openInEditor(); }))]);
                    new ScriptDebuggingAnnotator(RunBitMap.fromJSON(v.runmap), v.stack, v.error).dispatch(app);
                    var renderer = new EditorRenderer();
                    var elts = renderer.declDiv(app);
                    this.tabContent.appendChild(elts);
                });
            });
        }
    }

    export class StackTraceTab
        extends BrowserTab {
        constructor(par: RunInfo) {
            super(par)
        }
        public inlineIsTile() { return false; }
        public getId() { return "stack-trace"; }
        public getName() { return lf("stack trace"); }
        private runInfo() { return <RunInfo>(this.parent); }


        public initTab() {
            var loadingDiv = div('bigLoadingMore', 'loading...');
            var statusDiv = div('', '');
            this.tabContent.setChildren([loadingDiv, statusDiv]);
            var renderer = new EditorRenderer();
            function mkBox(decl: AST.Decl, stmt?: AST.Stmt) {
                if (!stmt) return DeclRender.mkBox(decl);

                var res = DeclRender.mkBoxEx(decl, "codeLocation");
                var descDiv = <HTMLElement> (<any>res).theDesc;
                Browser.setInnerHTML(descDiv, renderer.dispatch(stmt));
                return res;
                return div(null, res);
            }
            function mkMoreBox() {
                var de: DeclEntry = new DeclEntry("... there is more");
                var res = DeclRender.mkBox(<any>de);
                return div(null, res);
            }

            this.runInfo().getScriptASTAsync().done((app: AST.App) => {
                loadingDiv.removeSelf();
                if (!app) {
                    statusDiv.innerHTML = "could not get script info";
                    return;
                }
                statusDiv.removeSelf();
                this.tabContent.appendChild(div(null, HTML.mkButton(lf("open in editor"), () => this.runInfo().openInEditor())));

                this.runInfo().withUpdate(this.tabContent, (v: JsonRun) => {
                    if (!v.stack) return

                    var maxSize = 50;
                    var path = v.stack.path;
                    var thereIsMore = false;

                    if (v.stack.path.length > maxSize) {
                        path = path.slice(0, maxSize);
                        thereIsMore = true;
                    }

                    path.map(ix => v.stack.pack[ix]).forEach((obj: ICallNode, i: number) => {
                        var pc = obj.id;
                        var node = app.findAstNodeById(pc);

                        if (node) {
                            var decl: AST.Decl;
                            var stmt: AST.Stmt;

                            if (node.node instanceof AST.Decl) decl = <AST.Decl>node.node;
                            else if (node.node instanceof AST.Stmt) {
                                decl = node.decl;
                                stmt = <AST.Stmt>node.node;
                            }

                            if (decl) {
                                var elts = mkBox(decl, stmt);
                                return this.tabContent.appendChild(elts);
                            }
                        }

                        var decl = app.things.filter(t => t.getName() == obj.action)[0];
                        if (!decl) return;
                        var elts = mkBox(decl);
                        this.tabContent.appendChild(elts);
                    });

                    if (thereIsMore) {
                        this.tabContent.appendChild(mkMoreBox());
                    }
                });
            });
        }
    }

    export class RunBucketsTab
        extends ListTab
    {
        constructor(par: BrowserPage) {
            super(par, "/runbuckets");
        }

        public getId() { return "buckets"; }
        public getName() { return lf("buckets"); }
        public noneText() { return lf("no buckets for this script yet"); }

        public bgIcon() {
            return "svg:trash";
        }

        // public bgIcon() => "svg:WritePage";
        inlineText(b: JsonIdObject) {
            var c = <JsonRunBucket>b;
            return <any[]>["a bucket for ", span("sdBold",c.publicationname)];
        }

        public tabBox(cc: JsonIdObject) {
            var b = <JsonRunBucket>cc;
            return this.runBucketBox(b);
        }

        public runBucketBox(c: JsonRunBucket): HTMLElement {
            return this.browser().getRunBucketInfoById(c.id).mkSmallBox();

            //var uid = this.browser().getCreatorInfo(c);
            //var r: HTMLElement = null;

            //var delBtn: HTMLElement = null;
            //function deleteCmt() => {
            //    if (Cloud.isOffline()) {
            //        Cloud.showModalOnlineInfo('could not delete bucket');
            //        return;
            //    }
            //    ModalDialog.ask("are you sure you want to delete this bucket?", "delete it", () => {
            //        delBtn.setFlag("working", true);
            //        Util.httpRequestAsync(Cloud.getPrivateApiUrl(c.id), "DELETE", undefined).then(() => {
            //            r.removeSelf();
            //        }, (e: any) => {
            //            delBtn.setFlag("working", false);
            //            World.handlePostingError(e, "delete comment");
            //        }).done();
            //    });
            //}

            //if (c.userid == Cloud.getUserId()) {
            //    delBtn = div("sdCmtBtn", HTML.mkImg("svg:Trash,#000"), "delete").withClick(deleteCmt);
            //}

            //var likeBtn = div("sdCmtBtnOuter");
            //function setLikeBtn(s: number, f: () => void ) {
            //    var btn: HTMLElement;
            //    if (s < 0)
            //        btn = div("sdCmtBtn", HTML.mkImg("svg:wholeheart, #000"), "add")
            //    else
            //        btn = div("sdCmtBtn", HTML.mkImg("svg:wholeheart,#a00"), "remove")
            //    if (Math.abs(s) < 2) btn.setFlag("working", true);
            //    likeBtn.setChildren([btn.withClick(f)]);
            //}
            //ScriptInfo.setupLike(c.id, setLikeBtn);

            //var r = div("sdCmt",
            //            div("sdCmtTopic",
            //                span("sdBold", c.error || "Unknown error").withClick(() => {
            //                    var b = this.browser();
            //                    b.loadDetails(b.getRunBucketInfoById(c.id))
            //                }),
            //                div("sdCmtMeta",
            //                    Util.timeSince(c.time),
            //                    " - " + c.runs + (c.runs == 1 ? " run " : " runs "),
            //                    " - encountered " + (c.cumulativeruns == 1 ? " once " : (c.cumulativeruns + " times ")),
            //                    span("sdCmtId", " :: /" + c.id),
            //                div("sdCmtBtns", likeBtn, delBtn)),
            //                this.parent.getPublicationId() == c.publicationid ? null
            //                  : <any[]>[" on ", div("sdCmtScriptName", c.publicationname).withClick(() => {
            //                      var b = this.browser();
            //                      b.loadDetails(b.getScriptInfoById(c.publicationid))
            //                  })])
            //            );
            //return r;
        }

        topContainer():HTMLElement
        {
            return div(null, Editor.mkHelpLink("publishing run", "about buckets"), super.topContainer());
        }
    }

    export class RunsTab
        extends ListTab
    {
        constructor(par: BrowserPage) {
            super(par, "/runs");
        }

        public bgIcon() {
            return "svg:fire";
        }

        public getId() { return "runs"; }
        public getName() { return lf("runs"); }
        public noneText() { return lf("no runs in this bucket, sorry :("); }
        // public bgIcon() => "svg:WritePage";
        inlineText(b: JsonIdObject) {
            var c = <JsonRun>b;
            return <any[]>["a run for ", span("sdBold", c.publicationname)];
        }

        public tabBox(cc: JsonIdObject) {
            var b = <JsonRun>cc;
            return this.runBox(b);
        }

        public runBox(c: JsonRun): HTMLElement {

            return this.browser().getRunInfoById(c.id, c.publicationid).mkSmallBox();

            var uid = this.browser().getCreatorInfo(c);
            var r: HTMLElement = null;

            var delBtn: HTMLElement = null;
            var deleteCmt = () => {
                if (Cloud.anonMode(lf("deleting runs"))) return;
                ModalDialog.ask("are you sure you want to delete this run?", "delete it", () => {
                    delBtn.setFlag("working", true);
                    Util.httpRequestAsync(Cloud.getPrivateApiUrl(c.id), "DELETE", undefined).then(() => {
                        r.removeSelf();
                    }, (e: any) => {
                        delBtn.setFlag("working", false);
                        World.handlePostingError(e, "delete run");
                    }).done();
                });
            }

            if (c.userid == Cloud.getUserId()) {
                delBtn = div("sdCmtBtn", HTML.mkImg("svg:Trash,#000"), "delete").withClick(deleteCmt);
            }

            var likeBtn = div("sdCmtBtnOuter");
            function setLikeBtn(s: number, h : string, f: () => void ) {
                var btn: HTMLElement;
                if (s < 0)
                    btn = div("sdCmtBtn", HTML.mkImg("svg:wholeheart,#000"), h)
                else
                    btn = div("sdCmtBtn", HTML.mkImg("svg:wholeheart,#a00"), h)
                if (Math.abs(s) < 2) btn.setFlag("working", true);
                likeBtn.setChildren([btn.withClick(f)]);
            }
            ScriptInfo.setupLike(c.id, setLikeBtn);

            r = div("sdCmt",
                        div("sdCmtTopic",
                            span("sdBold", c.error || "unknown error").withClick(() => {
                                var b = this.browser();
                                b.loadDetails(b.getRunInfoById(c.id, c.publicationid))
                            }),
                            div("sdCmtMeta",
                                Util.timeSince(c.time),
                                " - compiler version: " + c.compilerversion,
                                (c.runmap && c.runmap.length > 0) ? " - coverage map " : " - no coverage map ",
                                (c.stack && c.stack.pack) ? " - stack trace " : " - no stack trace ",
                                span("sdCmtId", " :: /" + c.id),
                            div("sdCmtBtns", likeBtn, delBtn)),
                            (this.parent.parent && this.parent.getPublicationId() == c.publicationid) ? null
                              : <any[]>[" on ", div("sdCmtScriptName", c.publicationname).withClick(() => {
                                  var b = this.browser();
                                  b.loadDetails(b.getScriptInfoById(c.publicationid))
                              })],
                            (this.parent.getPublicationId() == c.userid) ? null
                              : <any[]>[" by ", div("sdCmtScriptName", c.anonymous? "someone" : c.username).withClick(() => {
                                  var b = this.browser();
                                  b.loadDetails(b.getUserInfoById(c.userid, c.username))
                              })]
                        ));
            return r;
        }
    }

    export class CommentsTab
        extends ListTab
    {
        private seenComments:any = {}

        static topCommentInitialText : string = undefined;

        constructor(par:BrowserPage, private canDeleteAny : () => boolean = undefined, private headerRenderer : (el : HTMLElement) => void = undefined) {
            super(par, "/comments")
        }
        public getId() { return this.forumId || "comments"; }
        public getName() { return this.forumName || lf("comments"); }
        public needsJsonScript() { return true; }
        public getPreciseCount():number { return !this.script() || !this.script().jsonScript ? -1 : this.script().jsonScript.comments; }
        private _topContainer:HTMLElement;

        public isForum() { return !!this.forumName; }

        public forumName:string;
        public forumId:string;

        public getUrl() {
            if (this.forumName) return this.forumId ? this.forumId + "/comments?bylatestnestedcomments=true" : "comments";
            return this.parent.getPublicationId() + "/comments?bylatestnestedcomments=true";
        }

        public bgIcon() { return "svg:Email"; }
        public noneText() { return this.parent instanceof UserInfo ? lf("no comments written by this user") : lf("no comments, tap to write some!"); }

        public resetEltsSoFar()
        {
            this.seenComments = {}
        }

        static bugStatuses = {
                "bug": { icon: "bug", name: "bug" },
                "feature": { icon: "chip", name: "feature" },
                "fixed": { icon: "bandage", name: "fixed" },
                "postponed": { icon: "Alram" /* sic! */, name: "postponed" },
                "notabug": { icon: "Butterfly", name: "not a bug" },
                "duplicate": { icon: "twobugs", name: "duplicate" },
        }
        static bugUsers = [ "gxfb", "wonm", "ajlk", "bqsl", "ikyp", "pboj", "jeiv", "expza" ]


        public finalListElt():HTMLElement
        {
            if (!this.isForum() && this.parent instanceof ScriptInfo) {
                var js = this.script().jsonScript
                if (js.rootid == js.id)
                    return div(null)

                   var cont = div(null)

                   var getFor = (id:string) =>
                       TheApiCacheMgr.getAsync(id + "/base").done(resp => {
                            if (!resp) return
                            var d = div("sdLoadingMore", lf("loading comments for /{0}...", resp.id))
                            var loadMore = (cont:string) => {
                                var dd = div(null, HTML.mkButton(lf("load more"), () => {
                                    dd.setChildren("loading...")
                                    TheApiCacheMgr.getAnd(resp.id + "/comments?continuation=" + cont, (lst:JsonList) => {
                                        dd.setChildren(lst.items.map(j => this.tabBox(j)))
                                        if (lst.continuation)
                                            dd.appendChild(loadMore(lst.continuation))
                                    })
                                }))
                                return dd
                            }

                            TheApiCacheMgr.getAnd(resp.id + "/comments", (lst:JsonList) => {
                                d.className = ""
                                if (lst.items.length > 0) {
                                    var ch = lst.items.map(j => this.tabBox(j))
                                    //ch.unshift(div("sdHeading", lf("comments on base /{0}", resp.id)))
                                    if (lst.continuation)
                                        ch.push(loadMore(lst.continuation))
                                    d.setChildren(ch)
                                } else {
                                    d.setChildren([])
                                }
                            })

                            var si = this.browser().getScriptInfo(resp)
                            var hd = si.mkSmallBox();
                            hd.className += " sdBaseHeader"
                            var btn = div("sdBaseCorner",
                                div(null, HTML.mkButton(lf("diff curr"), () => this.script().diffToId(resp.id))),
                                div(null, HTML.mkButton(lf("diff prev"), () => si.diffToBase())))
                            hd.appendChild(btn)
                            cont.appendChild(div(null, hd, d))

                            if (resp.rootid != resp.id) getFor(resp.id)
                       })

                    getFor(js.id)

               return cont
            } else {
                return div(null)
            }
        }

        private mkCommentPostWidget(reply:boolean, id:string, initialText : string = null):HTMLElement
        {
            var text =  HTML.mkTextArea();
            var postBtn = div(null);
            text.rows = 1;
            text.placeholder =  reply ? lf("Reply...") : lf("Say something...");
            var postDiv:HTMLElement = div("commentPost", div(null, text), postBtn);

            var post = () => {
                if (text.value.length < 2) return;
                if (Cloud.anonMode(lf("posting comments"))) return;
                var cmt =
                    {
                        time: Util.now() * 1000,
                        userid: "me",
                        username: "",
                        publicationid: id,
                        publicationname: this.parent.getName(),
                        text: text.value,
                        nestinglevel: this.parent.getPublicationId() == id ? 0 : 1,
                        positivereviews: 0,
                        comments: 0
                    };
                var req = { kind: "comment", text: text.value, userplatform: Browser.platformCaps };
                Cloud.postPrivateApiAsync(id + "/comments", req)
                    .done((resp: JsonComment) => {
                    cmtBox.setFlag("working", false);
                    if (reply)
                        postDiv.setChildren([cmtBox, inner]);
                    else
                        postDiv.setChildren([inner, cmtBox]);
                    if (resp.id) {
                        TheApiCacheMgr.invalidate(id);
                        TheApiCacheMgr.store(resp.id, resp);
                        cmtBox.setChildren([this.commentBox(resp)]);
                        Browser.Hub.askToEnableNotifications();


                        if (bugsEnabled) {
                            var bugId = id
                            if (!reply) bugId = resp.id

                            var bugReq = { assignedtoid: undefined, resolved: undefined }
                            Util.getHashTags(req.text).forEach((h) => {
                                h = h.toLowerCase()
                                var m = /^assignedto(\w+)$/.exec(h)
                                if (m) bugReq.assignedtoid = m[1]
                                if (CommentsTab.bugStatuses.hasOwnProperty(h))
                                    bugReq.resolved = h
                            })

                            if (bugReq.assignedtoid || bugReq.resolved) {
                                return Cloud.postPrivateApiAsync(bugId, bugReq).then((resp) => {
                                    TheApiCacheMgr.invalidate(bugId);
                                    // debugger;
                                })
                            }
                        }
                    }
                }, (e: any) => {
                    cmtBox.setFlag("working", false);
                    postDiv.setChildren([inner]);
                    if (e && e.status == 400)
                        ModalDialog.info(lf("couldn't post comment"), lf("Sorry, we could not post this comment. If you are posting to a group, please join the group first."));
                    else
                        World.handlePostingError(e, "post comment");
                });

                var cmtBox = div("sdCmtPosting", HTML.mkImg("svg:EmailOpen,#000,clip=100"), "posting...");
                cmtBox.setFlag("working", true);
                postDiv.className = "";
                var inner = this.mkCommentPostWidget(reply, id);
                postDiv.setChildren([cmtBox]);
            }

            var addText = (s:string) => {
                if (s) {
                    if (text.value) s = " " + s;
                    text.value += s + " ";
                    Util.setKeyboardFocusTextArea(text);
                }
            };

            var attaching = false;
            var attach = () => {
                if (!attaching) {
                    attaching = true;
                    tick(Ticks.commentAttach);
                    Meta.chooseScriptAsync({ header : 'pick a published script to attach', filter : s => !!s.publicId })
                        .done(s => {
                            attaching = false;
                            if (s) {
                                var x = "/" + s.publicId
                                if(s.app)
                                    x = "'" + s.app.getName() + "' " + x;
                                addText(x)
                            }
                        });
                }
            };

            var bug = () => {
                tick(Ticks.commentBugTracking);
                var m = new ModalDialog()
                var boxes = []

                var mkStatus = (info) => {
                    var e = new DeclEntry(info.name);
                    e.icon = "svg:" + info.icon + ",white"
                    e.description = "set status to " + info.name
                    boxes.push(e.mkBox().withClick(() => {
                        addText(Util.toHashTag(info.name))
                        m.dismiss()
                    }))
                }

                var mkUser = (name:string) => {
                    var ui = this.browser().getUserInfoById(name, name)
                    boxes.push(ui.mkSmallBox().withClick(() => {
                        addText(Util.toHashTag("assigned to " + name))
                        m.dismiss()
                    }))
                }

                var st = CommentsTab.bugStatuses
                Object.keys(st).forEach(k => mkStatus(st[k]))
                CommentsTab.bugUsers.forEach(mkUser)

                m.choose(boxes);
            }

            var expand = () => {
                if (text.rows <= 1) {
                    if (Cloud.anonMode(lf("posting comments"), expand)) return;
                    text.rows = 4;
                    postBtn.setChildren(<any[]>[
                        bugsEnabled ? HTML.mkButton(lf("bug-tracking"), bug) : null,
                        HTML.mkButton(lf("attach"), attach),
                        HTML.mkButton(lf("post"), post)]);
                }
            }

            Util.onInputChange(text, expand);
            text.addEventListener("click", expand, false);

            if (initialText) {
                text.value = initialText;
                Util.setTimeout(1, post);
            }

            return postDiv;
        }

        private addBugControls()
        {
            var assignedto = ""
            var assignedtoBtn = HTML.mkLinkButton(lf("any assignment"), () => {
                var m = new ModalDialog()
                var boxes = []

                var add = (b:HTMLElement, f:()=>void) =>
                    boxes.push(b.withClick(() => { f(); m.dismiss(); }));

                var mkUser = (name:string) => {
                    var ui = this.browser().getUserInfoById(name, name)
                    add(ui.mkSmallBox(), () => {
                        assignedto = name;
                        assignedtoBtn.setChildren(ui.getTitle())
                    })
                }

                var mkEntry = (name:string, at:string) => {
                    var e = new DeclEntry(name)
                    add(e.mkBox(), () => {
                        assignedto = at
                        assignedtoBtn.setChildren(name)
                    })
                }

                mkEntry("any assignment", "")
                mkEntry("not yet assigned", "none")

                CommentsTab.bugUsers.forEach(mkUser)

                m.choose(boxes)
            })

            var order = ""
            var orderBtn = HTML.mkLinkButton(lf("by votes"), () => {
                if (order) {
                    order = ""
                    orderBtn.setChildren(lf("by votes"))
                } else {
                    order = "recent";
                    orderBtn.setChildren(lf("by time"))
                }
            })

            var mk = (n:string) =>
                HTML.mkLinkButton(n + "s", () => {
                    var srch = "issue:" + n
                    if (assignedto)
                        srch += " assignedto:" + assignedto
                    if (order)
                        srch += " order:" + order
                    this.browser().searchFor(srch)
                });
            this._topContainer = div(null,
                div("smallText",
                    "show: ",
                    mk("bug"),
                    mk("feature"),
                    " filters: ",
                    assignedtoBtn,
                    orderBtn),
                this._topContainer)
        }

        public topContainer()
        {
            if (!this._topContainer) {
                if (this.forumName && !this.forumId)
                    this._topContainer = div(null);
                else {
                    var t = CommentsTab.topCommentInitialText;
                    CommentsTab.topCommentInitialText = undefined;
                    this._topContainer = this.mkCommentPostWidget(false, this.forumId || this.parent.getPublicationId(), t);
                }
                if (this.forumName == lf("issues"))
                    this.addBugControls();
                //if (this.isForum())
                //    this._topContainer = div(null, ScriptInfo.labeledBox("forum", this.parent.mkSmallBox()), this._topContainer);
                if (this.headerRenderer) {
                    var h = div(null);
                    this._topContainer = div(null, h, this._topContainer);
                    this.headerRenderer(h);
                }
            }
            // invalidate forum to rlease
            TheApiCacheMgr.invalidate(this.getUrl());
            return this._topContainer;
        }

        public hideOnEmpty() { return false; }

        inlineText(cc:JsonIdObject)
        {
            var c = <JsonComment>cc;
            return <any[]>[span("sdBold", c.username), ": " + ListTab.limitLength(c.text, 60)];
        }

        private nestedCommentsCount(cont: string): number {
            if (!cont) // first time querying
                return Browser.isCellphone ? 2 : Browser.isMobile ? 3 : 5;
            else // user asked for more
                return Browser.isCellphone ? 5 : Browser.isMobile ? 10 : 15;
        }

        private getNestedComments(elt:HTMLElement, id:string, cont:string)
        {
            elt.setChildren(["loading replies..."]);
            var count = this.nestedCommentsCount(cont);
            TheApiCacheMgr.getAnd(id + "/comments?count=" + count + (cont ? "&continuation=" + cont : ""), (lst: JsonList) => {
                var items = <JsonComment[]>lst.items;
                if (!cont && items.length > count) // first load
                {
                    var boxes = items.slice(0, count).map((cmt) => this.commentBox(cmt));
                    boxes.reverse();
                    var loadRemaining = () => {
                        var d: HTMLElement = div(null, HTML.mkButton(lf("load more replies"), () => {
                            var remainingBoxes = items.slice(count).map((cmt) => this.commentBox(cmt));
                            remainingBoxes.reverse();
                            if (!!lst.continuation) {
                                var d2: HTMLElement = div(null, HTML.mkButton(lf("load more replies"), () => {
                                    this.getNestedComments(d2, id, lst.continuation);
                                }));
                                remainingBoxes.unshift(d2);
                            }
                            d.setChildren(remainingBoxes);
                        }));
                        boxes.unshift(d);
                    }
                    loadRemaining();
                    elt.setChildren(boxes);
                } else {
                    var boxes = items.map((cmt) => this.commentBox(cmt));
                    boxes.reverse();
                    var loadMore = () => {
                        if (!!lst.continuation) {
                            var d: HTMLElement = div(null, HTML.mkButton(lf("load more replies"), () => {
                                this.getNestedComments(d, id, lst.continuation);
                            }));
                            boxes.unshift(d);
                        }
                    }
                    loadMore()
                    elt.setChildren(boxes);
                }
            });
        }

        public tabBox(cc:JsonIdObject) : HTMLElement
        {
            var c = <JsonComment>cc;

            if (!this.isForum())
                return this.commentBox(c, c.nestinglevel == 0);

            if (c.nestinglevel > 0) {
                var r = div(null);

                if (!this.seenComments.hasOwnProperty(c.publicationid)) {
                    this.seenComments[c.publicationid] = 1;
                    TheApiCacheMgr.getAnd(c.publicationid, (pc:JsonComment) => {
                        r.setChildren([this.commentBox(pc, true)]);
                    });
                }

                return r;
            } else {
                if (this.seenComments.hasOwnProperty(c.id)) return div(null);
                return this.commentBox(c, true);
            }
        }

        static translateCommentAsync(cid: string): Promise { // text
            var to = Util.getTranslationLanguage();
            var blobUrl = "https://tdtutorialtranslator.blob.core.windows.net/comments/" + to + "/" + cid;
            return Util.httpGetTextAsync(blobUrl)
                .then((blob) => blob, e => {
                    // requestion translation
                    var url = 'https://tdtutorialtranslator.azurewebsites.net/api/translate_comment?commentId=' + cid + '&to=' + to;
                    return Util.httpGetJsonAsync(url).then((js) => js.translated, e => undefined);
                });
        }

        public commentBox(c:JsonComment, includePosting = false) : HTMLElement
        {
            var uid = this.browser().getCreatorInfo(c);
            var nestedComments = div(null);
            var nestedPubs = div(null);
            if (c.nestinglevel > 0 || c.comments == 0) nestedComments = null;
            else {
                TheApiCacheMgr.invalidate(c.id + "/comments");
                this.getNestedComments(nestedComments, c.id, null);
            }
            var textDiv = div('sdSmallerTextBox');
            var cmts = new MdComments();
            cmts.allowLinks = false;
            cmts.allowImages = false;
            cmts.allowVideos = false;
            var formattedText = cmts.formatText(c.text)
            Browser.setInnerHTML(textDiv, formattedText);
            dirAuto(textDiv);

            // parsing any pub id
            var pubRx = /(^|[^\w\/]|https?:\/\/tdev.ly|https?:\/\/(www\.)?touchdevelop.com)\/([a-z]{4,})/g;
            var pubM = null;
            var isPull = /#pullRequest/i.test(c.text)
            while ((pubM = pubRx.exec(c.text)) != null) {
                TheApiCacheMgr.getAsync(pubM[3], true)
                    .done(
                        j => {
                            var jd = this.browser().getAnyInfoByEtag(j);
                            if (jd) {
                                var box = jd.mkSmallBox()
                                nestedPubs.appendChild(box);
                                if (isPull && jd instanceof ScriptInfo) {
                                    box.appendChild(
                                        div("sdBaseCorner", HTML.mkButton(lf("pull"), () => (<ScriptInfo>jd).mergeScript())))
                                }
                            }
                        },
                        e => {});
            }
            // parsing user id
            var userRx = /(^|[^\w@])@([a-z]{4,})/g;
            var userM = null;
            while ((userM = userRx.exec(c.text)) != null) {
                TheApiCacheMgr.getAsync(userM[2], true)
                    .done(
                        j => {
                            var jd = this.browser().getAnyInfoByEtag(j);
                            if (jd) nestedPubs.appendChild(jd.mkSmallBox());
                        },
                        e => {});
            }

            var translateBtn: HTMLElement = null;
            var translateCmt = () => {
                translateBtn.setFlag("working", true);
                CommentsTab.translateCommentAsync(c.id)
                    .done(translated => {
                        var trDiv = div('translated', translated || ':( ' + lf("Sorry, we could not translate this message."));
                        dirAuto(trDiv);
                        translateBtn.setFlag("working", false);
                        translateBtn.removeSelf();
                        textDiv.appendChild(trDiv);
                });
            }
            translateBtn = div("sdCmtBtn", HTML.mkImg("svg:Recycle,#000"), lf("translate")).withClick(translateCmt);

            var delBtn:HTMLElement = null;
            var deleteCmt = () => {
                if (Cloud.anonMode(lf("deleting comments"))) return;
                ModalDialog.ask(lf("are you sure you want to delete this comment?"), lf("delete it"), () => {
                    delBtn.setFlag("working", true);
                    Cloud.deletePrivateApiAsync(c.id).done(() => {
                        r.removeSelf();
                    }, (e: any) => {
                        delBtn.setFlag("working", false);
                        World.handlePostingError(e, "delete comment");
                    });
                });
            }

            var reportAbuse = () => {
                window.open(Cloud.getServiceUrl() + "/user/report/" + c.id)
            }

            if (c.userid == Cloud.getUserId() || (this.canDeleteAny && this.canDeleteAny())) {
                delBtn = div("sdCmtBtn", HTML.mkImg("svg:Trash,#000"), lf("delete")).withClick(deleteCmt);
            } else {
                delBtn = div("sdCmtBtn", HTML.mkImg("svg:SmilieSad,#000"), lf("abuse")).withClick(reportAbuse);
            }

            var likeBtn = div("sdCmtBtnOuter");
            function setLikeBtn(s:number, h:string, f:()=>void) {
                var btn:HTMLElement;
                if (s < 0)
                    btn = div("sdCmtBtn", HTML.mkImg("svg:wholeheart,#000"), h)
                else
                    btn = div("sdCmtBtn", HTML.mkImg("svg:wholeheart,#a00"), h)
                if (Math.abs(s) < 2) btn.setFlag("working", true);
                likeBtn.setChildren([btn.withClick(f)]);
            }
            ScriptInfo.setupLike(c.id, setLikeBtn);

            var r = div("sdCmt", uid.thumbnail(),
                        div("sdCmtTopic",
                            span("sdBold", c.username),
                            c.resolved ? div("sdCmtResolved", c.resolved + (c.assignedtoid ? " (" + c.assignedtoid + ")" : "")) : null,
                            this.parent.getPublicationId() == c.publicationid || this.forumId == c.publicationid || c.nestinglevel > 0 ? null
                              : <any[]>[" on ", div("sdCmtScriptName", c.publicationname).withClick(() => {
                                            var b = this.browser();
                                            b.loadDetails(b.getReferencedPubInfo(c))
                                        })
                                    ]),
                        textDiv,
                        div("sdCmtMeta",
                                Util.timeSince(c.time),
                                c.positivereviews > 0 ? " " + c.positivereviews + "♥ " : null,
                                c.comments > 0 ? " " + c.comments + " replies " : null,
                                span("sdCmtId", " :: /" + c.id),
                            div("sdCmtBtns", translateBtn, likeBtn, delBtn)),
                        nestedPubs,
                        nestedComments,
                        includePosting ? this.mkCommentPostWidget(true, c.id) : null
                        );
            if (c.nestinglevel == 0) {
                r.className += " sdCmtTop";
                if (!includePosting) {
                    r.style.cursor = "pointer";
                    r.withClick(() => {
                        var b = this.browser();
                        b.loadDetails(b.getCommentInfoById(c.id));
                    });
                }
            } else {
                r.className += " sdCmtNested";
            }
            return r;
        }
    }

    export class SuccessorsTab
        extends ListTab
    {
        constructor(par:BrowserPage) {
            super(par, "/successors")
        }
        public getId() { return "forks"; }
        public getName() { return lf("forks"); }

        public bgIcon() { return "svg:ShareThis"; }
        public noneText() { return lf("no forks, install, edit and re-publish script to create one!"); }
        // public bgIcon() => "svg:WritePage";
        inlineText(cc:JsonIdObject)
        {
            var c = <JsonScript>cc;
            return <any[]>[c.name == this.script().app.getName() ? null : c.name, " by\u00A0", span("sdBold", c.username)];
        }

        public tabBox(cc:JsonIdObject):HTMLElement
        {
            var c = <JsonScript>cc;
            return this.browser().getScriptInfo(c).mkSmallBox();
        }
    }

    interface JsonScriptWithBase extends JsonScript
    {
        baseid:string;
    }

    export class DerivativesTab
        extends BrowserTab
    {
        constructor(par:BrowserPage) {
            super(par)
        }
        public getId() { return "derivatives"; }
        public getName() { return lf("derivatives"); }

        public bgIcon() { return "svg:Binoculars"; }

        public initTab() {
            var infos:StringMap<JsonScriptWithBase> = {}
            var boxes:HTMLElement[] = []
            var numQueries = 0
            var numDiffs = 0

            var statDiv = div("sdInlineHelp")
            boxes.push(statDiv)

            var updateStats = (done = false) => {
                statDiv.setChildren(Util.fmt("{2}. {0} server request(s), {1} diff(s) computed", numQueries, numDiffs, done ? "Done" : "Working"))
            }

            var addDiffAsync = (scr:JsonScriptWithBase) => {
                // find first script up with a different update id
                var diffTo = scr.baseid
                while (infos.hasOwnProperty(diffTo)) {
                    var par = infos[diffTo]
                    if (par.updateid != scr.updateid)
                        break
                    diffTo = par.baseid
                }

                return Promise.join([ScriptCache.getScriptAsync(diffTo), ScriptCache.getScriptAsync(scr.id)]).then(scrs => {
                    if (!scrs[0] || !scrs[1]) return;

                    function prep(s:string)
                    {
                        var app = AST.Parser.parseScript(s, [])
                        //app.isTopLevel = true;
                        //AST.TypeChecker.tcScript(app, true);
                        return app;
                    }
                    var a0 = prep(scrs[0])
                    var a1 = prep(scrs[1])
                    AST.Diff.diffApps(a0, a1, {
                        useStableNames: true
                    })
                    var st = AST.Diff.DiffStat.run(a1)

                    var info = this.browser().getScriptInfoById(scr.id)
                    var box = div(null, info.mkSmallBox())
                    box.appendChild(HTML.mkButton(lf("diff"), () => info.diffToId(diffTo)))
                    var addNum = (n:number, sym:string) => { box.appendChildren([ScriptInfo.mkNum(n, sym)]) }

                    addNum(st.numOtherChanges, "svg:Wrench")
                    addNum(st.numCommentChanges, "svg:callout")
                    addNum(st.numArtChanges, "svg:Clover")
                    addNum(st.numStringChanges, "svg:ABC")
                    addNum(st.numNumberChanges, "svg:123");

                    (<any>box).score = [st.numOtherChanges, st.numCommentChanges + st.numStringChanges + st.numNumberChanges,
                                        st.numArtChanges, -scr.time]
                    var cmpBox = (a, b) => {
                        if (!a.score) return -1
                        if (!b.score) return 1
                        for (var i = 0; i < a.score.length; ++i) {
                            var d = b.score[i] - a.score[i]
                            if (d) return d
                        }
                        return 0
                    }

                    boxes.push(box)
                    boxes.sort(cmpBox)
                    this.tabContent.setChildren(boxes)

                    numDiffs++
                    updateStats()
                })
            }

            var processAsync : (p:string)=>Promise = (parid:string) => {
                var withContAsync = (cont:string) =>
                    TheApiCacheMgr.getAsync(parid + "/successors?count=100" + cont)
                      .then((resp:JsonList) => {
                          numQueries++
                          updateStats()
                          var promises:Promise[] = []
                          resp.items.forEach((scr:JsonScriptWithBase) => {
                              scr.baseid = parid
                              infos[scr.id] = scr
                              if (scr.updateid == scr.id)
                                  promises.push(addDiffAsync(scr))
                              promises.push(processAsync(scr.id))
                          })
                          if (resp.continuation)
                              promises.push(withContAsync("&continuation=" + resp.continuation))
                          return Promise.join(promises)
                      })
                return withContAsync("")
            }
            processAsync(this.parent.publicId).done(() => updateStats(true))

            this.tabContent.setChildren(boxes)
        }
    }

    export class TagsTab extends ListTab
    {
        tagBtns:any = {};
        ownTags:any = {};
        askedForTagList = false;
        _topContainer:HTMLElement = null;

        constructor(par:BrowserPage)
        {
            super(par, "/tags");
        }

        hideOnEmpty() { return false; }

        getId() { return "tags"; }
        getName() { return lf("tags"); }

        private fullName(c:JsonTag) { return c.category ? c.category + " :: " + c.name : c.name; }

        inlineText(cc:JsonIdObject)
        {
            var c = <JsonTag>cc;
            return <any[]>[c.instances + "x ", span("sdBold", this.fullName(c))];
        }

        noneText() { return lf("no tags, tap to add some!"); }

        initInline()
        {
            this.loadMoreElementsAnd(null, (tags:JsonTag[]) => {
                this.setVisibility(true);
                if (tags.length == 0) {
                    this.inlineContent.setChildren([div("sdTabTileNothing", span(null, this.noneText())), this.getTileLabel("")])
                } else {
                    tags.sort((a,b) => b.instances - a.instances);
                    var ptfn = this.fullName(tags[0]);
                    var prim = div("sdTabTilePrimaryTag " + (ptfn.length < 10 ? " sdTabTilePrimaryTagBig" : ""), span(null, ptfn));
                    var ch = [prim];
                    for (var i = 1; i < 2; i++) {
                        var t = tags[i];
                        if (t)
                            ch.push(div("sdTabTileSecondaryTag", span(null, this.fullName(t))))
                    }
                    ch.push(this.getTileLabel(""));
                    this.inlineContent.setChildren(ch);
                }
            });
        }


        resetEltsSoFar()
        {
            this.tagBtns = {}
        }


        topContainer():HTMLElement
        {
            if (this._topContainer) return this._topContainer;

            var tagContainer = div(null);

            var addTag = (e:JsonTag) => {
                if (Cloud.anonMode(lf("adding tags"))) return;

                var id = e.id;
                e = JSON.parse(JSON.stringify(e));
                e.instances = 1;
                tagContainer.appendChild(this.tabBox(e));
                this.tagBtns[id].firstChild.setFlag("working", true);

                var req = { kind: "tag", id: id }
                Cloud.postPrivateApiAsync(this.parent.getPublicationId() + "/tags", req)
                .done((resp) => {
                    this.updateTagTo(id, true);
                    Browser.Hub.askToEnableNotifications();
                }, (e: any) => {
                    this.tagBtns[id].firstChild.setFlag("working", false);
                    World.handlePostingError(e, "add tag");
                });
            }

            var btn = HTML.mkButton(lf("add new tag"), () => {
                var done = false;
                TheApiCacheMgr.getAnd("tags?count=1000", (lst:JsonList) => {
                    if (done) return;
                    done = true;
                    var seenTags:any = {}
                    var items = lst.items.filter((e:JsonTag) => {
                        if (this.tagBtns[e.id] || seenTags[e.id]) return false;
                        seenTags[e.id] = true;
                        return true;
                    });
                    items.sort((a:JsonTag,b:JsonTag) => b.instances - a.instances);
                    var m = new ModalDialog();
                    m.choose(items.map((e:JsonTag) => this.bareBox(e, null).withClick(() => { m.dismiss(); addTag(e) })));
                });
            });

            return this._topContainer = div(null, div(null, btn),
                    Host.expandableTextBox(lf("tap a checkmark to add (or remove) your 'vote' to an existing tag")), tagContainer);
        }

        private bareBox(c:JsonTag, btn:HTMLElement)
        {
            return div("sdCmt",
                    btn,
                    div("sdCmtTopic",
                        span("sdBold", this.fullName(c)),
                        " x" + c.instances + ""
                        ),
                    Host.expandableTextBox(c.description));
        }

        updateTagTo(id:string, hasIt:boolean)
        {
            var sid = this.parent.getPublicationId();
            TheApiCacheMgr.invalidate("me/tagged/" + sid);
            TheApiCacheMgr.invalidate(sid + "/tags");
            this.ownTags[id] = hasIt;
            this.updateTag(id);
        }

        updateTag(id:string)
        {
            var sid = this.parent.getPublicationId();
            var btn = this.tagBtns[id];
            if (!btn) return;
            var hasIt = !!this.ownTags[id];
            var elt = div("sdIcon", HTML.mkImg("svg:Check," + (hasIt ? "black" : "#ddd") + ",clip=60"));
            elt.withClick(() => {
                elt.setFlag("working", true);
                if (hasIt) {
                    if (Cloud.anonMode(lf("removing tags"))) return;
                    Util.httpRequestAsync(Cloud.getPrivateApiUrl(sid + "/" + id), "DELETE", undefined).then(() => {
                        this.updateTagTo(id, false);
                    }, (e: any) => {
                        elt.setFlag("working", false);
                        World.handlePostingError(e, "remove tag");
                    }).done();
                } else {
                    if (Cloud.anonMode(lf("adding tags"))) return;
                    var req = { kind: "tag", id: id }
                    Cloud.postPrivateApiAsync(sid + "/tags", req)
                    .done((resp) => {
                        this.updateTagTo(id, true);
                        Browser.Hub.askToEnableNotifications();
                    }, (e: any) => {
                        elt.setFlag("working", false);
                        World.handlePostingError(e, "add tag");
                    });
                }
            });
            btn.setChildren([elt]);
        }

        tabBox(cc:JsonIdObject)
        {
            var c = <JsonTag>cc;
            if (!this.askedForTagList) {
                TheApiCacheMgr.getAnd("me/tagged/" + this.parent.getPublicationId(), (resp:JsonList) => {
                    this.ownTags = {}
                    resp.items.forEach((t:JsonTag) => { this.ownTags[t.id] = true })
                    Object.keys(this.tagBtns).forEach((t) => this.updateTag(t))
                })
            }

            var btn = div("sdThumb");
            var d = this.bareBox(c, btn);
            this.tagBtns[c.id] = btn;
            this.updateTag(c.id);

            return d;
        }
    }

    export class ScriptHeartsTab
        extends ListTab
    {
        constructor(par:BrowserPage) {
            super(par, "/reviews")
        }
        public getId() { return "hearts"; }
        public getName() { return lf("hearts"); }
        public needsJsonScript() { return true; }
        public getPreciseCount():number { return !this.script() || !this.script().jsonScript ? -1 : getScriptHeartCount(this.script().jsonScript); }

        public bgIcon() { return "svg:wholeheart"; }
        public noneText() { return lf("no hearts. you can add one once you install the script!"); }
        public inlineText(c:JsonReview)
        {
            return <any[]>["by\u00A0", span("sdBold", c.username)];
        }

        public getTileContent(c:string):any[]
        {
            var r = super.getTileContent(c);
            if (!this.script()) return r;
            var j = this.script().jsonScript
            if (j && j.positivereviews != getScriptHeartCount(j))
                r.push(div("sdTabTileSubtitle", j.positivereviews + " for this version"))
            return r
        }

        public tabBox(cc:JsonIdObject)
        {
            var c = <JsonReview>cc;
            var uid = this.browser().getCreatorInfo(c);
            var d = div("sdCmt", uid.thumbnail(),
                        div("sdCmtTopic",
                            span("sdBold", c.username)
                            ),
                        div("sdCmtMeta",
                                Util.timeSince(c.time)
                                ));
            d.style.cursor = "pointer";
            d.withClick(() => { this.browser().loadDetails(uid) });
            return d;
        }
    }

    export class SubscribersTab
        extends ListTab
    {
        constructor(par:BrowserPage)
        {
            super(par, "/subscribers");
        }

        public getId() { return "subscribers"; }
        public getName() { return lf("subscribers"); }
        public needsJsonScript() { return true; }
        public getPreciseCount():number
        {
            if (this.parent.publicId) {
                var entry = TheApiCacheMgr.getCached(this.parent.publicId);
                if (entry && entry.subscribers !== undefined)
                    return entry.subscribers;
            }
            return -1;
        }
        // => !this.script() || !this.script().jsonScript ? -1 : this.script().jsonScript.subscribers;

        public bgIcon() { return "svg:Person"; }
        public noneText() { return this.parent.isMe() ? lf("no subscribers") : lf("no subscribers, tap to subscribe!"); }

        public topContainer()
        {
            if (this.parent.isMe()) return null;

            var id = this.parent.publicId;

            var btnDiv:HTMLElement = div(null,
                HTML.mkButton(lf("subscribe to this user"), () => {
                    if (Cloud.anonMode(lf("user subscription"))) return;
                    btnDiv.style.opacity = "0.5"
                    Util.httpPostJsonAsync(Cloud.getPrivateApiUrl(id + "/subscriptions"), {}).then(() => {
                        UserInfo.invalidateSubscriptions(id)
                        btnDiv.setChildren(["subscribed!"])
                        Browser.Hub.askToEnableNotifications();
                    }, (e: any) => {
                        World.handlePostingError(e, "subscribe");
                    }).done();
                }))

            return div(null,
                Host.expandableTextBox("After you subscribe to this user, you will recive notifications when they publish scripts or comments." +
                                       " You can unsubscribe by going to your user page, and deleting the user from your list of subscriptions."),
                btnDiv);
        }

        public tabBox(cc:JsonIdObject):HTMLElement
        {
            var c = <JsonUser>cc;
            TheApiCacheMgr.store(c.id, c);
            return this.browser().getUserInfoById(c.id, c.name).mkSmallBox();
        }
    }

    export class NotificationsTab
        extends ListTab
    {
        constructor(par:BrowserPage)
        {
            super(par, "/notifications");
        }

        public getId() { return "notifications"; }
        public getName() { return lf("notifications"); }

        public bgIcon() { return "svg:ExclamationCircleAlt"; }
        public noneText() { return lf("nothin' goin' on"); }

        public topContainer():HTMLElement
        {
            return div("sdListLabel", spanDirAuto(lf("notifications")))
        }

        public tabBox(c:JsonPublication):HTMLElement
        {
            var pub = this.browser().getAnyInfoByPub(c, "");
            var lab = (l:string, box = null, content = null) => ScriptInfo.labeledBox(l, box || pub.mkSmallBox())
            var own = c.userid == this.parent.publicId;

            switch (c.kind) {
            case "script":
                return div(null, lab(lf("forked")))
            case "comment":
                return div(null, lab(own ? lf("wrote") : lf("reply")))
            case "review":
                return div(null, lab(own ? lf("gave ♥") : lf("got ♥"), this.browser().getReferencedPubInfo(<JsonPubOnPub>c).mkSmallBox()))
            case "screenshot":
                return div(null, lab(lf("screenshot"), ScreenShotTab.mkBox(this.browser(), <JsonScreenShot>c)),
                                 lab(lf("of"), this.browser().getReferencedPubInfo(<JsonPubOnPub>c).mkSmallBox()));
            case "art":
                return div(null, lab(lf("art"), ArtTab.mkBox(this.browser(), <JsonArt>c)));
            case "group":
                return div(null, lab(lf("group"), GroupsTab.mkBox(this.browser(), <JsonGroup>c)));
            case "leaderboardscore": // this one should not happen anymore
                return div(null, lab(lf("scored {0}", (<any>c).score), this.browser().getCreatorInfo(c).mkSmallBox()),
                    lab(lf("in"), this.browser().getReferencedPubInfo(<JsonPubOnPub>c).mkSmallBox()));
            // missing: tag, crash buckets
            default:
                debugger;
                if (!pub) return null;
                else return pub.mkSmallBox();
            }
        }
    }

    export class NotificationsPage
        extends BrowserPage
    {
        private _notifications:NotificationsTab;

        constructor(par:Host)
        {
            super(par)
            this.publicId = Cloud.getUserId() || "me";
            this._notifications = new NotificationsTab(this);
        }

        public persistentId() { return "notifications:" + this.publicId; }
        public getTitle() { return lf("notifications for {0}", this.publicId); }

        public getId() { return "notifications"; }
        public getName() { return lf("notifications"); }

        public loadFromWeb(id:string)
        {
            this.publicId = id;
        }

        public mkBoxCore(big:boolean):HTMLElement
        {
            return null;
        }

        public initTab()
        {
            this._notifications.initElements();
            this._notifications.tabLoaded = true;
            this._notifications.initTab();
            Cloud.postNotificationsAsync().then(continuation => // TODO: use continuation to somehow highlight which messages are new
            {
                if (Browser.isTrident)
                    try {
                        (<any>(window.external)).msSiteModeClearBadge();
                    } catch (e) {}
            }, ex => { }).done();
            Util.setTimeout(1, () => this.browser().loadTab(this._notifications))
        }

        public mkTabsCore():BrowserTab[] { return [this]; }
    }

    export class SubscriptionsTab
        extends ListTab
    {
        constructor(par:BrowserPage)
        {
            super(par, "/subscriptions");
        }

        public getName() { return lf("subscriptions"); }
        public getId() { return "subscriptions"; }

        public bgIcon() { return "svg:Person"; }
        public noneText() { return lf("no subscriptions"); }

        public tabBox(c:JsonPublication):HTMLElement
        {
            var infoPage = this.browser().getAnyInfoByPub(c, "");
            if (!infoPage) return div('');

            var box = infoPage.mkSmallBox();

            if (this.parent.isMe()) {
                var unsubDiv:HTMLElement;
                box.firstChild.appendChild(
                    unsubDiv = <HTMLElement>div("sdReportAbuse", HTML.mkImg("svg:Person,#000,clip=100"), lf("unsubscribe")).withClick(() => {
                        unsubDiv.style.opacity = "0.1";
                        Util.httpRequestAsync(Cloud.getPrivateApiUrl(c.id + "/subscriptions"), "DELETE", undefined).then(() => {
                            UserInfo.invalidateSubscriptions(c.id)
                            box.setChildren([])
                            box.className = ""
                        }, (e: any) => {
                            World.handlePostingError(e, lf("remove subscription"));
                        }).done();
                    }))
            }

            return box;
        }
    }

    export class UserHeartsTab
        extends ListTab
    {
        constructor(par:BrowserPage) {
            super(par, "/reviews")
        }
        public getId() { return "given-hearts"; }
        public getName() { return lf("given ♥"); }
        public bgIcon() { return "svg:wholeheart"; }
        public noneText() { return lf("no hearts awarded by this user"); }

        public inlineText(c:JsonReview)
        {
            return <any[]>[lf("for\u00A0"), span("sdBold", c.publicationname)];
        }

        public tabBox(c:JsonReview) : HTMLElement
            { return this.browser().getReferencedPubInfo(c).mkSmallBox(); }

    }

    export class ScreenShotTab
        extends ListTab
    {
        constructor(par:BrowserPage, path = "screenshots") {
            super(par, "/" + path)
        }
        public getId() { return "screens"; }
        public getName() { return lf("screens"); }

        public inlineIsTile() { return false; }

        static mkBox(b: Host, c: JsonScreenShot) {
            var reportAbuse = () => {
                window.open(Cloud.getServiceUrl() + "/user/report/" + c.id)
            }
            var d = div("sdScreen", HTML.mkImg(c.thumburl));
            d.withClick(() => {
                var m = new ModalDialog();

                var d = div("sdScreenShotFrame");
                d.withClick(() => { m.dismiss() });
                var loading = div("sdScreenShotImgLoading", lf("loading screenshot ..."));
                var img = HTML.mkImg(c.pictureurl);
                // TSBUG onLoadHandler was defined inline
                var onLoadHandler = () => { loading.removeSelf() }
                img.onload = onLoadHandler;
                d.appendChild(div("sdScreenShotImg", loading, img));
                var buttons: HTMLElement = undefined;
                d.appendChild(div("sdScreenShotLabel",
                    div(null, ScriptInfo.labeledBox(lf("featuring"), b.getScriptInfoById(c.publicationid).mkSmallBox())),
                    div(null, ScriptInfo.labeledBox(lf("taker"), b.getCreatorInfo(c).mkSmallBox())),
                    buttons = div("sdScreenShotButtons",
                      div("sdCmtBtn", HTML.mkImg("svg:SmilieSad,#000"), lf("report abuse")).withClick(reportAbuse)
                      )
                    ));

                var deleteScreenshot = () => {
                    HTML.showProgressNotification(lf("deleting..."), true);
                    Cloud
                        .deletePublicationAsync(c.id)
                        .done(() => {
                            m.dismiss();
                        });
                }
                // delete button if screenshot author
                if (c.userid === Cloud.getUserId()) {
                    buttons.appendChild(
                        div("sdCmtBtn", HTML.mkImg("svg:Delete,#000"), lf("delete")).withClick(deleteScreenshot)
                    );
                }

                m.showBare(d);
            });
            return d;
        }

        public tabBox(c:JsonScreenShot)
        {
            return ScreenShotTab.mkBox(this.browser(), c);
        }

        public initInline()
        {
            this.loadMoreElementsAnd(null, (cmts:JsonScreenShot[]) => {
                if (cmts.length == 0) {
                    this.setVisibility(false);
                    // this.isEmpty = true;
                }
                else {
                    this.setVisibility(true);
                    this.isEmpty = false;
                    this.inlineContent.className = "sdInlineTab sdScreens";
                    var ch = cmts.slice(0, 8).map((c) => this.tabBox(c));
                    if (cmts.length > ch.length)
                        ch.push(this.browser().moreLink(lf("more screens"), this));
                    this.inlineContent.setChildren(ch);
                }
            });
        }
    }

    export class ArtInfo
        extends BrowserPage
    {
        public name: string;
        public art: JsonArt;

        constructor(par:Host) {
            super(par)
        }
        public persistentId() { return "art:" + this.publicId; }
        public getTitle() { return this.name || ("art " + this.publicId); }
        public getId() { return "overview"; }
        public getName() { return lf("overview"); }

        public loadFromJson(a: JsonArt)
        {
            this.loadFromWeb(a.id);
            this.name = a.name;
            this.art = a;
        }

        public loadFromWeb(id:string)
        {
            this.publicId = id;
        }

        public getJsonAsync() {
            if (!this.art) {
                var r:JsonArt = TheApiCacheMgr.getCached(this.publicId);
                if (r)
                    this.loadFromJson(r);
                else {
                    return TheApiCacheMgr.getAsync(this.publicId).then((a: JsonArt) => {
                        this.loadFromJson(a);
                    });
                }
            }
            return Promise.as();
        }

        public mkTabsCore(): BrowserTab[] {
            return [
             this
           // these need more work
           //  new CommentsTab(this),
             , new ScriptsTab(this, lf("no scripts using this art"))
           //  new SubscribersTab(this)
            ];
        }

        public mkTile(sz:number)
        {
            var d = div("hubTile hubArtTile hubTileSize" + sz);
            d.style.background =  ScriptIcons.stableColorFromName(this.publicId);
            return this.withUpdate(d, (a:JsonArt) => {
                this.loadFromJson(a);

                var cont = [];
                var audio = null;
                var addNum = (n:number, sym:string) => { cont.push(ScriptInfo.mkNum(n, sym)) }
               // addNum(a.positivereviews, "♥");
               // if (sz > 1) {
               //     addNum(a.comments, "✉");
               // }

                var nums = div("hubTileNumbers", cont, div("hubTileNumbersOverlay"));
                //nums.style.background = d.style.background;

                var img : HTMLElement = null;
                if (a.mediumthumburl || a.pictureurl) {
                    var transparent = !!a.flags && a.flags.indexOf('transparent') > -1;
                    var picDiv = d;
                    var picMode = 'cover';

                    if (transparent) {
                        picDiv = div("hubArtPicture");
                        img = picDiv;
                        picMode = 'contain';
                    }

                    picDiv.style.backgroundImage = HTML.cssImage(a.mediumthumburl || a.pictureurl);
                    picDiv.style.backgroundRepeat = 'no-repeat';
                    picDiv.style.backgroundPosition = 'center';
                    picDiv.style.backgroundSize = picMode;
                } else if (a.wavurl) {
                    var playBtn = HTML.mkRoundButton("svg:play,black", lf("sound"), Ticks.artSoundPreviewPlay, () => {
                        if (!audio) {
                            playBtn.setFlag("disabled", true);
                            var aa = HTML.mkAudio(a.wavurl, a.aacurl);
                            HTML.audioLoadAsync(aa).done(aa => {
                                playBtn.setFlag("disabled", false);
                                audio = aa;
                                audio.play();
                            });
                        }
                        else audio.play();
                    });
                    img = playBtn;
                }

                d.setChildren([img,
                               div("hubTileTitleBar",
                                   div("hubTileTitle", spanDirAuto(this.name)),
                                     div("hubTileSubtitle",
                                        div("hubTileAuthor", spanDirAuto(a.username), nums)))])
            });
            return d;
        }

        public mkBoxCore(big:boolean)
        {
            var icon = div("sdIcon");
            var nameBlock = dirAuto(div("sdName", this.name));
            var hd = div("sdNameBlock", nameBlock);
            var numbers = div("sdNumbers"); // TODO
            var author = div("sdAuthorInner");
            var addInfo = div("sdAddInfoInner", "/" + this.publicId);
            var pubId = div("sdAddInfoOuter", addInfo);
            var res = div("sdHeaderOuter",
                            div("sdHeader", icon,
                              div("sdHeaderInner", hd, pubId, div("sdAuthor", author), numbers, this.reportAbuse(big))));
            var audio = null;
            if (big)
                res.className += " sdBigHeader";

            return this.withUpdate(res, (a:JsonArt) => {
                this.loadFromJson(a);

                var time = 0;
                if (a) time = a.time;
                var timeStr = "";
                if (time) timeStr = Util.timeSince(time) + " :: ";
                if (this.publicId) timeStr += "/" + this.publicId;
                addInfo.setChildren([timeStr]);

                nameBlock.setChildren([a.name]);
                dirAuto(nameBlock);
                var img = null;
                if (a.thumburl) {
                    img = HTML.mkImg(a.thumburl);
                    img.className += " checker";
                } else {
                    var playBtn = HTML.mkRoundButton("svg:play,black", lf("sound"), Ticks.artSoundPreviewPlay, () => {
                        if (!audio) {
                            playBtn.setFlag("disabled", true);
                            var aa = HTML.mkAudio(a.wavurl, a.aacurl);
                            HTML.audioLoadAsync(aa).done(aa => {
                                playBtn.setFlag("disabled", false);
                                audio = aa;
                                audio.play();
                            });
                        }
                        else audio.play();
                    });
                    img = div('checker', playBtn);
                }
                icon.setChildren([img]);

                author.setChildren([a.username]);

                var cont = [];
                var addNum = (n:number, sym:string) => { cont.push(ScriptInfo.mkNum(n, sym)) }
                //addNum(a.receivedpositivereviews, "♥");
                //addNum(a.subscribers, "svg:Person,black,clip=80");
                //addNum(a.features, "svg:Award,black,clip=110");
                numbers.setChildren(cont);
            });
        }

        public initTab()
        {
            var ch = this.getTabs().map((t:BrowserTab) => t == this ? null : t.inlineContentContainer);
            var hd = div("sdDesc");
            var id = div("sdImg");
            var runBtns = div(null);
            var remainingContainer = div(null);

            ch.unshift(remainingContainer);
            ch.unshift(id);
            ch.unshift(hd);
            if (TDev.dbg)
                ch.unshift(runBtns);

            var authorDiv = div("inlineBlock");
            remainingContainer.setChildren([authorDiv]);

            this.tabContent.setChildren(ch);

            this.withUpdate(hd, (a:JsonArt) => {
                this.loadFromJson(a);
                hd.setChildren([Host.expandableTextBox(a.description)]);

                if (a.mediumthumburl || a.pictureurl) {
                    var img = HTML.mkImg(a.mediumthumburl || a.pictureurl);
                    img.className += " checker";
                    id.setChildren([img]);

                    img.withClick(() => {
                        var m = new ModalDialog();
                        var d = div("sdScreenShotFrame");
                        d.withClick(() => { m.dismiss() });
                        var loading = div("sdScreenShotImgLoading", lf("loading art ..."));
                        var fullimg = HTML.mkImg(a.pictureurl);
                        // TSBUG onLoadHandler was defined inline
                        var onLoadHandler = () => { loading.removeSelf() }
                        fullimg.onload = onLoadHandler;
                        d.appendChild(div("sdScreenShotImg", loading, fullimg));
                        m.showBare(d);
                    });
                } else if (a.wavurl) {
                    id.setChildren([HTML.mkAudio(a.wavurl, a.aacurl, null, true)]);
                }

                var uid = this.browser().getCreatorInfo(a);
                authorDiv.setChildren([ScriptInfo.labeledBox(lf("author"), uid.mkSmallBox())]);
                if (TDev.dbg)
                    runBtns.setChildren(this.mkButtons());
            });
        }

        private mkButtons(): HTMLElement {
            var mkBtn = (icon:string, desc:string, key:string, f:()=>void) =>
            {
                var b = HTML.mkButtonElt("sdBigButton sdBigButtonHalf", div("sdBigButtonIcon", HTML.mkImg(icon)), div("sdBigButtonDesc sdHeartCounter", desc));
                TheEditor.keyMgr.btnShortcut(b, key);
                return b.withClick(f);
            }
            var heartButton: HTMLElement = span("sdHeart", "");
            var setBtn = (state:number, hearts:string, f:()=>void) => {
                var btn:HTMLElement;
                if (state < 0)
                    btn = mkBtn("svg:wholeheart,white,opacity=0.3", hearts, null, f);
                else
                    btn = mkBtn("svg:wholeheart,white", hearts, null, f);
                heartButton.setChildren([btn]);
                btn.setFlag("working", Math.abs(state) < 2);
            }

            ScriptInfo.setupLike(this.publicId, setBtn);
            return div("sdRunBtns", heartButton);
        }

        public match(terms:string[], fullName:string)
        {
            if (terms.length == 0) return 1;

            var json:JsonArt = TheApiCacheMgr.getCached(this.publicId);
            if (!json) return 0; // not loaded yet

            var lowerName = json.name.toLowerCase();
            var r = IntelliItem.matchString(lowerName, terms, 10000, 1000, 100);
            if (r > 0) {
                if (lowerName.replace(/[^a-z0-9]/g, "") == fullName)
                    r += 100000;
                return r;
            }
            var lowerDescription = (json.description || "").toLowerCase();
            var s = lowerName + " " + this.publicId + " " + lowerDescription;
            return IntelliItem.matchString(s.toLowerCase(), terms, 100, 10, 1);
        }
    }

    export class ArtTab
        extends ListTab
    {
        constructor(par:BrowserPage) {
            super(par, "/art")
        }
        public getId() { return "art"; }
        public getName() { return lf("art"); }
        public bgIcon() { return "svg:snowflake"; } // TODO: Art icon
        public hideOnEmpty() { return false; }
        public noneText() { return lf("no art published by this user"); }

        public inlineIsTile() { return true; }

        static mkBox(b: Host, c: JsonArt) {
            return b.getArtInfo(c).mkSmallBox();
        }

        public tabBox(c:JsonArt)
        {
            return ArtTab.mkBox(this.browser(), c);
        }
    }

    export class DocumentInfo
        extends BrowserPage
    {
        private doc: JsonDocument;
        private name: string;
        private abstract: string;
        private views: number;

        constructor(par:Host) {
            super(par)
        }
        public persistentId() { return "doc:" + this.publicId; }
        public getTitle() { return this.name; }
        public getId() { return "learn"; }
        public getName() { return lf("learn"); }

        public loadFromJson(a: JsonDocument)
        {
            this.doc = a;
            this.publicId = a.name;
            this.name = a.name;
            this.abstract = a.abstract;
            this.views = a.views;
        }

        public mkTabsCore(): BrowserTab[] {
            return [
             this
            ];
        }

        private getMimeTypeName() {
            if (/^video\//.test(this.doc.mimetype))
                return "tutorial video";
            return "";
        }

        public mkTile(sz: number) {
            var d = div("hubTile hubDocTile hubTileSize" + sz);
            var icon = div('');
            d.style.backgroundImage = HTML.cssImage(this.getIconUrl());
            d.style.backgroundRepeat = 'no-repeat';
            d.style.backgroundPosition = 'center';
            d.style.backgroundSize = 'cover';

            var author = div("hubTileAuthor", this.getMimeTypeName());
            var nums = div('');
            if (this.views > 0) {
                nums = div("hubTileNumbers", this.views + " views", div("hubTileNumbersOverlay"));
                //nums.style.background = d.style.background;
            }
            var titleBar = div("hubTileTitleBar",
                                 div("hubTileTitle", spanDirAuto(this.name)),
                                 div("hubTileSubtitle", author, nums));
            titleBar.style.background = 'gray';
            d.setChildren([
                        icon,
                        titleBar
                        ])
            return d;
        }

        private getIconUrl() {
            if (this.doc.thumburl)
                return this.doc.thumburl;
            if(/video\//.test(this.doc.mimetype))
                return 'svg:movie,white';
            else if ("application/pdf" == this.doc.mimetype)
                return 'svg:Book,white';
            else if ("application/vnd.openxmlformats-officedocument.presentationml.presentation" == this.doc.mimetype)
                return 'svg:Presentation,white';
            else
                return 'svg:QuestionCircle,white';
        }

        private getIcon() {
            return HTML.mkImg(this.getIconUrl());
        }

        public mkBoxCore(big:boolean)
        {
            var icon = div("sdIcon hubDocTile", this.getIcon());
            var nameBlock = dirAuto(div("sdName", this.name));
            var hd = div("sdNameBlock", nameBlock);
            var pubId = div("sdAddInfoOuter", this.getMimeTypeName());
            if (this.views > 0)
                pubId.setChildren([div("sdAddInfoInner", this.views + " views")]);
            var res = div("sdHeaderOuter",
                            div("sdHeader", icon, div("sdHeaderInner", hd, pubId)));
            if (big)
                res.className += " sdBigHeader";
            return res;
        }

        private mkButtons() {
            var mkBtn = (icon: string, desc: string, key: string, f: () => void) => {
                var b = HTML.mkButtonElt("sdBigButton sdBigButtonHalf", div("sdBigButtonIcon", HTML.mkImg(icon)), div("sdBigButtonDesc", desc));
                TheEditor.keyMgr.btnShortcut(b, key);
                return b.withClick(f);
            }

            var editB = mkBtn(this.getIconUrl(), "open", null, () => {
                tick(Ticks.learnBrowseDoc);
                window.open(this.doc.url);
            });
            editB.className = "sdBigButton";
            return div("sdRunBtns", editB);
        }

        public initTab()
        {
            var ch:HTMLElement[] = this.getTabs().map((t:BrowserTab) => t == this ? null : t.inlineContentContainer);
            var hd = div("sdDesc", this.abstract);
            var id = div("sdImg");
            var runBtns = this.mkButtons();
            var remainingContainer = div(null);

            ch.unshift(remainingContainer);
            ch.unshift(id);
            ch.unshift(runBtns);
            ch.unshift(hd);

            this.tabContent.setChildren(ch);
        }

        public match(terms:string[], fullName:string)
        {
            if (terms.length == 0) return 1;

            var json:JsonDocument = TheApiCacheMgr.getCached(this.publicId);
            if (!json) return 0; // not loaded yet

            var lowerName = json.name.toLowerCase();
            var r = IntelliItem.matchString(lowerName, terms, 10000, 1000, 100);
            if (r > 0) {
                if (lowerName.replace(/[^a-z0-9]/g, "") == fullName)
                    r += 100000;
                return r;
            }
            var lowerDescription = (json.abstract || "").toLowerCase();
            var s = lowerName + " " + this.publicId + " " + lowerDescription;
            return IntelliItem.matchString(s.toLowerCase(), terms, 100, 10, 1);
        }
    }

    export class ScriptInfo
        extends BrowserPage
    {
        public app:AST.App;
        public jsonScript:JsonScript;
        private _jsonScriptPromise:ApiCacheEntry;
        private basedOnPub:string;
        private cloudHeader:Cloud.Header;
        private platform:PlatformCapability;
        private correspondingTopic:TopicInfo;

        constructor(par:Host) {
            super(par)
        }
        public isLibrary() { return this.app && this.app.isLibrary; }
        public persistentId() { return "script:" + (this.cloudHeader ? this.getGuid() : this.publicId); }
        public getTitle() { return this.app ? this.app.getName() : super.getTitle(); }

        public additionalHash() { return this.cloudHeader && this.cloudHeader.scriptId ? ":id=" + this.cloudHeader.scriptId : "" }

        public getGuid() { return this.cloudHeader ? this.cloudHeader.guid : ""; }
        public getAnyId() { return this.getGuid() || this.publicId; }
        public getCloudHeader() { return this.cloudHeader; }
        public getDescription() {
            return this.app ? this.app.getDescription() : "";
        }

        static compareScripts(a: ScriptInfo, b: ScriptInfo) : number {
            var c = b.lastScore - a.lastScore;
            if (c == 0)
                c = a.getJsonScriptPromise().lastUse - b.getJsonScriptPromise().lastUse;
            return c;
        }

        public editAsync() : Promise
        {
            TheEditor.lastListPath = this.browser().getApiPath()
            if (!this.cloudHeader || this.cloudHeader.status == "deleted") {
                if (!this.publicId) return Promise.as(); // hmm?
                this.browser().hide();
                return TheEditor.prepareForLoadAsync("installing and loading script",
                    () => TheApiCacheMgr.getAsync(this.publicId, true).then((info: JsonScript) => TheEditor.loadPublicScriptAsync(this.publicId, info.userid)));
            } else {
                this.browser().hide();
                return TheEditor.prepareForLoadAsync("loading script", () =>
                    TheEditor.loadScriptAsync(this.cloudHeader));
            }
        }

        public edit()
        {
            this.editAsync().done();
        }

        public update()
        {
            var id = World.updateFor(this.cloudHeader);
            if (!id) return;
            tick(Ticks.browseUpdate);
            World.updateAsync(this.cloudHeader.guid)
                .then(() => this.browser().updateInstalledHeaderCacheAsync())
                .done(() => {
                    // this.cloudHeader = this.browser().installedHeaders.filter((h) => h.guid == this.cloudHeader.guid)[0];
                    TheEditor.historyMgr.reload(HistoryMgr.windowHash());
                });
        }

        public run()
        {
            TheEditor.runImmediately = true;
            this.edit();
        }

        public pinAsync(): Promise {
            var fragment = 'run%3A' + this.getGuid();
            return TDev.RT.Tiles.updateTileAsync(fragment, <TDev.RT.ITileData>{
                title: this.app.getName(),
                background: this.app.htmlColor(),
                pin: true
            });
        }

        public getRealJsonScriptPromise() : Promise
        {
            if (this.jsonScript) return Promise.as(this.jsonScript);
            var r = new PromiseInv();
            var done = false;
            this.getJsonScriptPromise().whenUpdated((dat, options) => {
                if (!done) {
                    done = true;
                    r.success(dat)
                }
            })
            return r;
        }

        public getJsonScriptPromise() : ApiCacheEntry
        {
            var fromLocal = ():any => {
                var j = this.app.toJsonScript();
                if (!!this.basedOnPub)
                    j.rootid = this.basedOnPub;
                return j;
            }

            if (!this._jsonScriptPromise) {
                if (this.publicId) {
                    if (!TheApiCacheMgr.has(this.publicId) && this.cloudHeader) {
                        TheApiCacheMgr.store(this.publicId, fromLocal(), "", true);
                    }
                    this._jsonScriptPromise = TheApiCacheMgr.getAnd(this.publicId, (j) => { this.jsonScript = j; });
                } else {
                    var j = fromLocal();
                    this.jsonScript = j;
                    this._jsonScriptPromise = new BogusApiCacheEntry(TheApiCacheMgr);
                    this._jsonScriptPromise.set(j);
                }
            }
            return this._jsonScriptPromise;
        }

        public getName() { return lf("overview"); }
        public getId() { return "overview"; }

        public twitterMessage()
        {
            return (this.app ? this.app.getName() + " - " : "") +  "cool #touchdevelop script!";
        }

        public loadLocalHeader(v:Cloud.Header)
        {
            this.cloudHeader = v;
            var meta = !!v.meta ? Util.jsonClone(v.meta) : {};
            meta["name"] = v.name;
            this.app = AST.Parser.parseScript("")
            this.app.loadMeta(meta);
            this.app.localGuid = v.guid;
            if (v.status == "published")
                this.publicId = v.scriptId;
            else
                this.basedOnPub = v.scriptId;
        }

        private buildTopic()
        {
            var j = this.jsonScript;
            if (j && !this.correspondingTopic && /#docs/i.test(j.description)) {
                if (!j.id) {
                    j = Util.flatClone(j);
                    j.id = this.getGuid()
                }
                var ht = HelpTopic.fromJsonScript(j)
                ht.initAsync().done()
                this.correspondingTopic = TopicInfo.mk(ht);
            }
        }

        private loadJsonScriptCore(j:JsonScript)
        {
            if (!this.app)
                this.app = AST.Parser.parseScript("")
            Util.assert(j.name != null); // unfortunately, some scripts have empty names
            this.app.setMeta("name", j.name);
            this.app.setMeta("icon", j.icon);
            this.app.setMeta("color", j.iconbackground ? ("#ff" + j.iconbackground.slice(-6)) : undefined);
            this.app.setMeta("isLibrary", j.islibrary ? "yes" : "");
            this.app.setMeta("iconArtId", j.iconArtId);
            this.app.setMeta("splashArtId", j.splashArtId);
            this.app.localGuid = "";
            this.app.comment = j.description;
            this.publicId = j.id;
            if (j.platforms) {
                var platform = AST.App.fromCapabilityList(j.platforms);
                this.app.setPlatform(platform);
            }
            this.jsonScript = j;
            if (!!this.publicId)
                this.cloudHeader = this.browser().getInstalledByPubId(this.publicId);
            this.buildTopic();
        }

        public loadFromWeb(id:string)
        {
            this.publicId = id;
            this.app = AST.Parser.parseScript("")
            this.app.setMeta("name", id);
            if (!!id)
                this.cloudHeader = this.browser().getInstalledByPubId(id);
            this.getJsonScriptPromise().whenUpdated((j:JsonScript,opts:DataOptions) => {
                if (opts.isDefinitive && j.updateid && j.id !== j.updateid && j.updatetime > j.time)
                    World.rememberUpdate(j.id, j.updateid);
                if(!opts.isSame) this.loadJsonScriptCore(j);
            });
        }

        static mkNum(n:number, sym:string) {
            if (n > 0) {
                var ch:any[] = [" " + n + " "];
                if (/^svg:/.test(sym))
                    ch.push(div("inlineIcon", HTML.mkImg(sym)))
                else if (sym.length > 1)
                    ch.push(span("smallText", sym));
                else
                    ch.push(sym);
                return div("sdNumber", ch);
            } else {
                return null;
            }
        }

        public mkBoxCore(big:boolean)
        {
            return this.mkBoxExt(big, false);
        }

        public iconImg(thumb : boolean): HTMLElement {
            return this.app.iconArtId ? ArtUtil.artImg(this.app.iconArtId, thumb) : HTML.mkImg(this.app.iconPath());
        }

        public mkBoxExt(big:boolean, isTopic:boolean)
        {
            var icon = div("sdIcon");
            var nameBlock = div("sdName");
            var hd = div("sdNameBlock", nameBlock);

            var numbers = div("sdNumbers");
            var author = div("sdAuthorInner");
            var addInfo = div("sdAddInfoInner", this.publicId);
            var abuseDiv = big ? div(null, this.reportAbuse(true)) : null;
            var facebook = div("sdShare");
            //var pubId = div("sdPubId", !!publicId ? "/" + publicId : null);
            var screenShot = div("sdScriptShot");
            if (big) screenShot = null;
            var res = div("sdHeaderOuter",
                            div("sdHeader", icon, screenShot,
                                div("sdHeaderInner", hd, div("sdAddInfoOuter", addInfo), div("sdAuthor", author), numbers,
                                    facebook, abuseDiv)));

            if (big)
                res.className += " sdBigHeader";

            var setLocal = () => {
                nameBlock.setChildren([this.app.getName()]);
                dirAuto(nameBlock);
                icon.style.backgroundColor = this.app.htmlColor();
                icon.setChildren([this.iconImg(true), !this.cloudHeader ? null : div("sdInstalled") ]);

                var time = 0;
                if (this.jsonScript) time = this.jsonScript.time;
                if (!time && this.cloudHeader && this.cloudHeader.scriptVersion) time = this.cloudHeader.scriptVersion.time;
                var timeStr = "";
                if (time) timeStr = Util.timeSince(time) + " :: ";
                if (this.publicId) timeStr += "/" + this.publicId;
                //if(!timeStr) debugger;
                addInfo.setChildren([timeStr]);

                if (!big) res.className = "sdHeaderOuter";
            }

            var hideScriptAsync = (all : boolean, id : string) : Promise => {
                Util.log('script: hiding ' + id);
                var rishidden = false;
                return Util.httpPostJsonAsync(Cloud.getPrivateApiUrl(id), { kind: "script", ishidden: true })
                    .then(r => {
                        rishidden = r.ishidden;
                        return this.browser()
                            .getScriptInfoById(id)
                            .getRealJsonScriptPromise();
                    }).then(jsonScript => {
                        jsonScript.ishidden = rishidden;
                        return Util.httpGetJsonAsync(Cloud.getPrivateApiUrl(id));
                    }).then(r2 => {
                        if (all && (r2.id != r2.updateid || !r2.ishidden)) {
                            return hideScriptAsync(true, r2.updateid);
                        } else return Promise.as();
                    });
            }

            var updateHideButton = (): void => {
                var hidden = this.jsonScript.ishidden;
                var id = this.publicId;
                var working = false;
                var btn;
                if (hidden) {
                    btn = div("sdReportAbuse",
                        HTML.mkImg("svg:Unlock,#000,clip=100"), lf("unhide")).withClick(() => {
                            if (working) return;
                            btn.setFlag("working", true);
                            Util.httpPostJsonAsync(Cloud.getPrivateApiUrl(id), { kind: "script", ishidden: false }).then(r => {
                                this.jsonScript.ishidden = r.ishidden;
                                updateHideButton();
                            }, (e: any) => {
                                btn.setFlag("working", false);
                                if (e.status == 403)
                                    ModalDialog.info(lf("posting failed"), lf("Could not unhide script. Please try again later."));
                                else if (e.status == 400)
                                    throw new Error("Cloud precondition violated (" + e.errorMessage + ")");
                                else
                                    throw e;
                            }).done();
                        });
                } else {
                    btn = div("sdReportAbuse",
                        HTML.mkImg("svg:Lock,#000,clip=100"), lf("hide")).withClick(() => {
                            var progressBar = HTML.mkProgressBar();
                            var m = new ModalDialog();
                            m.onDismiss = () => updateHideButton();
                            m.add(progressBar);
                            var hideBtns, statusDiv;
                            m.add(div('wall-dialog-header', lf("hide script")));
                            m.add(statusDiv = div('wall-dialog-body', lf("Do you want to hide only this version or all? If you only hide this version, the latest not-hidden version (if any) will become the latest update of this script.")));
                            m.add(hideBtns = div('wall-dialog-buttons',
                                HTML.mkButton(lf("hide this version"), () => {
                                    hideBtns.removeSelf();
                                    statusDiv.setChildren([lf("hiding...")]);
                                    progressBar.start();
                                    hideScriptAsync(false, this.publicId).done(() => m.dismiss());
                                }),
                                HTML.mkButton(lf("hide all"), () => {
                                    hideBtns.removeSelf();
                                    statusDiv.setChildren([lf("hiding...")]);
                                    progressBar.start();
                                    hideScriptAsync(true, this.publicId).done(() => m.dismiss());
                                }),
                                HTML.mkButton(lf("cancel"), () => m.dismiss())
                                ));
                            m.show();
                        });
                }
                abuseDiv.setChildren([btn]);
            }

            var setNumbers = (js:any, opts:DataOptions) => {
                if (opts.isSame) return;
                setLocal();

                if (!this.jsonScript) return;

                if (big && !isTopic) facebook.setChildren(this.facebookLike())

                if (abuseDiv && this.publicId && this.jsonScript.userid == Cloud.getUserId()) {
                    updateHideButton();
                }

                var cont = [];
                var addNum = (n:number, sym:string) => { cont.push(ScriptInfo.mkNum(n, sym)) }
                if (big && !isTopic) {
                    if (!SizeMgr.phoneMode)
                        addNum(this.jsonScript.installations, "users");
                    addNum(this.jsonScript.runs, "runs");
                } else {
                    addNum(getScriptHeartCount(this.jsonScript), "♥");
                    addNum(this.jsonScript.comments, "✉");
                }
                if (this.app.isLibrary) {
                    var sp = document.createElement('span'); sp.className = 'sdNumber symbol';
                    sp.innerHTML = ' ' + AST.libSymbol;
                    cont.push(sp);
                }
                if (/#docs/i.test(this.jsonScript.description))
                    cont.push(div("sdNumber", " \u24D8"));
                if (!this.willWork())
                    cont.push(span("sdNumber symbol", "⚠"));
                numbers.setChildren(cont);
                author.setChildren([ this.jsonScript.username ]);

                if (screenShot && this.jsonScript.screenshotthumburl) {
                    res.className += " sdHasScriptShot";
                    screenShot.setChildren([HTML.mkImg(this.jsonScript.screenshotthumburl)]);
                }

                if (Showcase.mgmtMode()) {
                    if (Showcase.isIn(this.jsonScript.id))
                        res.className += " sdShowcase";
                    if (Showcase.isIgnored(this.jsonScript.id))
                        res.className += " sdShowcaseIgnore";
                    var sc = Showcase.getStars(this.jsonScript.id)
                    if (sc)
                        res.appendChild(div("sdBaseCorner", sc))
                }
            }

            setLocal();
            this.getJsonScriptPromise().whenUpdated(setNumbers);

            return res;
        }

        public mkTile(sz:number)
        {
            var d = div("hubTile hubTileSize" + sz);
            this.getJsonScriptPromise().whenUpdated((j,opts) => {
                if (opts.isSame || !this.jsonScript) return;

                d.style.background = this.app.htmlColor();

                var cont = [];
                var addNum = (n:number, sym:string) => { cont.push(ScriptInfo.mkNum(n, sym)) }
                addNum(getScriptHeartCount(this.jsonScript), "♥");
                if (sz > 1) {
                    addNum(this.jsonScript.comments, "✉");
                    //addNum(jsonScript.installations, "users");
                    //addNum(jsonScript.runs, "runs");
                }

                var nums = div("hubTileNumbers", cont, div("hubTileNumbersOverlay"));
                //nums.style.background = this.app.htmlColor();

                var smallIcon = div("hubTileSmallIcon");
                var bigIcon = div("hubTileScreenShot");

                var ss = this.jsonScript.screenshotthumburl || ArtUtil.artUrl(this.app.iconArtId);
                if (ss) {
                    ss = ss.replace(/\/thumb\//, "/pub/");
                    bigIcon.style.backgroundImage = HTML.cssImage(ss);
                    bigIcon.style.backgroundRepeat = 'no-repeat';
                    bigIcon.style.backgroundPosition = 'center';
                    bigIcon.style.backgroundSize = 'cover';
                    smallIcon.setChildren([this.iconImg(true)]);
                    smallIcon.style.background = this.app.htmlColor();
                }

                d.setChildren([div("hubTileIcon", this.iconImg(true)),
                               bigIcon,
                               smallIcon,
                               div("hubTileTitleBar",
                                     div("hubTileTitle", spanDirAuto(this.app.getName())),
                                     div("hubTileSubtitle",
                                        div("hubTileAuthor", spanDirAuto(this.jsonScript.username), nums)))])
            });
            return d;
        }

        public willWork() {
            return !this.app || this.app.supportsAllPlatforms(api.core.currentPlatform);
        }

        private commentsTab : CommentsTab;
        public mkTabsCore():BrowserTab[]
        {
            var r:BrowserTab[];
            if (!this.publicId)
                r = [this, new CodeTab(this), new HistoryTab(this)];
            else
                r =
                [
                    this,
                    new ScreenShotTab(this),
                    new CommentsTab(this),
                    new ScriptHeartsTab(this),
                    new TagsTab(this),
                    new InsightsTab(this),
                ];
            return r;
        }

        static labeledBox(hd:string, elt:HTMLElement)
        {
            var hdiv = div("sdInlineHd", span("sdInlineHdLabel", hd));
            var r = div("inlineBlock sdInlineContentContainer sdScriptBox sdBox-" + hd.replace(/ /g, "-"), hdiv, elt);
            return r.withClick(() => {
               KeyboardMgr.triggerClick(<HTMLElement>r.lastChild);
            });
        }


        private mkButtons()
        {
            var mkBtn = (t:Ticks, icon:string, desc:string, key:string, f:()=>void) =>
            {
                var b = HTML.mkButtonElt("sdBigButton sdBigButtonHalf", div("sdBigButtonIcon", HTML.mkImg(icon)),
                    div("sdBigButtonDesc " + (desc.length > 7 ? "sdBigButtonLongDesc" : ""), desc));
                TheEditor.keyMgr.btnShortcut(b, key);
                return b.withClick(() => {
                    tick(t);
                    f();
                });
            }

            var pinB = null
            var updateB = null
            var shareB = null
            if (this.publicId) shareB = mkBtn(Ticks.browseShare, "svg:package,white", lf("share"), null, () => { this.share(); });
            var editB = mkBtn(Ticks.browseEdit, "svg:edit,white", lf("edit"), null, () => { this.edit() });
            if (TDev.RT.Wab && this.getGuid() && TDev.RT.Wab.isSupportedAction(TDev.RT.Wab.Action.UPDATE_TILE)) {
                pinB = mkBtn(Ticks.browsePin, "svg:pushpin,white", lf("pin to start"), null, () => { this.pinAsync().done(); });
            }
            if (World.updateFor(this.cloudHeader)) {
                updateB = mkBtn(Ticks.browseEdit, "svg:Recycle,white", lf("update"), null, () => { this.update() });
            } else {
                editB.className = "sdBigButton sdBigButtonFull";
            }
            var runB = mkBtn(Ticks.browseRun, "svg:play,white", lf("run"), null, () => { this.run() });
            if (this.jsonScript && this.jsonScript.islibrary) {
                runB = null;
                pinB = null;
            }

            var likePub:HTMLElement;

            var setBtn = (state:number, hearts:string, f:()=>void) => {
                var btn:HTMLElement;
                if (state < 0)
                    btn = mkBtn(Ticks.browseHeart, "svg:wholeheart,white,opacity=0.3", hearts, null, f);
                else
                    btn = mkBtn(Ticks.browseUnHeart, "svg:wholeheart,white", hearts, null, f);
                heartButton.setChildren([btn]);
                btn.setFlag("working", Math.abs(state) < 2);
            }

            if (this.publicId) {
                var heartButton = span("sdHeart", "");
                likePub = heartButton;
                ScriptInfo.setupLike(this.publicId, setBtn);
            } else {
                likePub = mkBtn(Ticks.browsePublish, "svg:Upload,white", lf("publish"), null, () => this.publishAsync(true).done());
            }

            var uninstall:HTMLElement;
            var editWithGroup:HTMLElement;
            var groupDiv: HTMLElement = div("");

            if (this.cloudHeader) {
                uninstall = div(null, ScriptInfo.mkSimpleBtnConfirm(lf("uninstall"), () => this.uninstall()))
                World.getInstalledEditorStateAsync(this.getGuid()).done(text => {
                    if (!text) return;

                    // tutorial state
                    var st = <AST.AppEditorState>JSON.parse(text)
                    var num = st.tutorialNumSteps - (st.tutorialStep || 0)
                    if (st.tutorialId && num > 0) {
                        Util.setTimeout(1, () => {
                            TipManager.setTip({
                                el: editB,
                                title: lf("tap there"),
                                description: lf("go back to coding! {0}★ to go", num),
                            })
                        });
                    }

                    // group mode?
                    if(!st.collabSessionId) {
                        uninstall.appendChild(HTML.mkButton(lf("edit with group"), () => {
                            Meta.chooseGroupAsync({ header: lf("choose a group") })
                                .done((group : GroupInfo) => {
                                    if (group) group.addScriptAsync(this).done(() => this.edit());
                                });
                        }));
                    } else if (st.groupId) {
                        groupDiv.setChildren([
                            ScriptInfo.labeledBox(
                                lf("belongs to"),
                                Browser.TheHost.getGroupInfoById(st.groupId).mkSmallBox()
                            )
                        ]);
                    }
                })
            }

            if (EditorSettings.editorMode() != EditorMode.block && this.jsonScript && this.jsonScript.time) {
                var pull = HTML.mkButtonTick(lf("pull changes"), Ticks.browsePush, () => (<ScriptInfo>this.parent).mergeScript())
                var diff = HTML.mkButtonTick(lf("diff to base script"), Ticks.browseDiffBase, () => (<ScriptInfo>this.parent).diffToBase())
            }
            return div("sdRunBtns", updateB, editB, runB, likePub, shareB, pinB, uninstall, groupDiv, div(null, pull, diff, this.showcaseBtns()));
        }

        private showcaseBtns()
        {
            if (!Showcase.mgmtMode()) return null
            if (!this.jsonScript) return null
            var id = this.jsonScript.id
            if (!id) return null

            var btns = []
            if (!Showcase.isIn(id))
                btns.push(HTML.mkButton("add to showcase", () =>
                            Showcase.setStatusAsync(id, "showcase").done()))
            btns.push(HTML.mkButton("ignore for showcase", () =>
                        Showcase.setStatusAsync(id, "ignore").done()))
            var warning = div(null)
            if (this.jsonScript.id != this.jsonScript.rootid)
                TheApiCacheMgr.getAsync(this.jsonScript.rootid, true)
                    .done((js:JsonScript) => {
                        if (js.userid != this.jsonScript.userid) {
                            warning.style.color = "#f00"
                            warning.setChildren("Root script has as different author. Check comments.")
                        }
                    })
            btns.push(warning)
            return btns
        }

        static mkBtn(icon:string, desc:string, f:()=>void)
        {
            return Editor.mkTopMenuItem(icon, desc, Ticks.noEvent, null, f);
        }

        static mkSimpleBtnConfirm(desc:string, f:()=>void)
        {
            var isRed = false

            var btn = HTML.mkButton(desc, () => {
                if (isRed) f();
                else {
                    isRed = true;
                    btn.style.color = 'red'
                    Util.setTimeout(3000, () => {
                        isRed = false;
                        btn.style.color = '';
                    })
                }
            })

            return btn
        }

        static mkBtnConfirm(icon:string, desc:string, f:()=>void)
        {
            var restoreNormal = () => {
                btn1.style.display = "inline-block";
                btn2.style.display = "none";
            }

            var btn2:HTMLElement = ScriptInfo.mkBtn("svg:" + icon + ",red", "i'm sure!", () => {
                restoreNormal();
                f();
            })
            var btn1:HTMLElement = ScriptInfo.mkBtn("svg:" + icon + ",black", desc, () => {
                btn1.style.display = "none";
                btn2.style.display = "inline-block";
                Util.setTimeout(3000, restoreNormal);
            });
            restoreNormal();
            return [btn1, btn2];
        }

        public getScriptTextAsync() : Promise
        {
            if (this.cloudHeader)
                return World.getInstalledScriptAsync(this.getGuid());
            else
                return ScriptCache.getScriptAsync(this.publicId);
        }

        public currentlyForwardsTo():BrowserPage
        {
            if (this.correspondingTopic && !this.browser().treatAsScript[this.publicId])
                return this.correspondingTopic;
            return this;
        }

        public initTab()
        {
            this.browser().treatAsScript[this.publicId] = true;

            var ch = this.getTabs().map((t:BrowserTab) => t == this ? null : t.inlineContentContainer);
            var authorDiv = div("inlineBlock");
            var descDiv = div("sdDesc");
            var libsDiv = div(null);
            var infoDiv = div(null)
            var capsDiv = div(null)
            var wontWork = div(null);
            var likesDiv = div(null);
            var basisDiv = div("inlineBlock");
            ch.shift();
            var screens = ch.shift();
            var remainingContainer = div(null);
            var docsButtonDiv = div(null);
            ch.unshift(remainingContainer);
            remainingContainer.setChildren([authorDiv]);
            ch.unshift(screens);
            ch.unshift(docsButtonDiv);
            ch.unshift(likesDiv);
            ch.unshift(descDiv);
            ch.unshift(wontWork);
            var runBtns = div(null);
            ch.unshift(runBtns);
            ch.push(libsDiv);
            ch.push(infoDiv);
            ch.push(capsDiv);
            this.tabContent.setChildren(ch);

            var scriptBox = (hd:string, id:string) => {
                if (!id || id == this.publicId) return null;
                return ScriptInfo.labeledBox(hd, this.browser().getScriptInfoById(id).mkSmallBox());
            }

            this.getJsonScriptPromise().whenUpdated((js,opts) => {
                if (opts.isSame) return;
                this.buildTopic();

                if (this.cloudHeader && this.cloudHeader.status != "published" && this.cloudHeader.scriptId)
                    basisDiv.setChildren(scriptBox(lf("base"), this.cloudHeader.scriptId));

                if (basisDiv.childNodes.length == 0 && js.rootid != js.id)
                    basisDiv.setChildren(ScriptInfo.labeledBox(lf("base"), null));

                remainingContainer.setChildren([authorDiv, basisDiv, scriptBox(lf("update"), this.jsonScript.updateid)]);

                var uid = this.browser().getCreatorInfo(this.jsonScript);
                authorDiv.setChildren([ScriptInfo.labeledBox(lf("author"), uid.mkSmallBox())]);

                if (this.app.isLibrary)
                    Browser.setInnerHTML(descDiv, (new MdComments()).formatText(this.jsonScript.description));
                else
                    descDiv.setChildren([Host.expandableTextBox(this.jsonScript.description)]);

                if (this.correspondingTopic && !this.cloudHeader) {
                    docsButtonDiv.setChildren([HTML.mkButton(lf("view as docs"), () => {
                        this.browser().treatAsScript[this.publicId] = false;
                        TheEditor.historyMgr.reload(HistoryMgr.windowHash());
                    })])
                }

                if (this.correspondingTopic) {
                    docsButtonDiv.appendChildren([HTML.mkButton(lf("follow"), () => {
                        tick(Ticks.browseFollowTopic)
                        this.correspondingTopic.follow()
                    })])
                }

                // if (this.cloudHeader)
                runBtns.setChildren([this.mkButtons()]);

                if (this.app.getPlatformRaw() & PlatformCapability.Current) {
                    capsDiv.setChildren([])
                } else if (this.app.getPlatform()) {
                    var caps = lf("This script uses the following capabilities: ") +
                               AST.App.capabilityName(this.app.getPlatform())
                    capsDiv.setChildren(Host.expandableTextBox(caps))
                }

                if (!this.willWork()) {
                    wontWork.className = "sdWarning";
                    wontWork.setChildren([span("symbol", "⚠"),
                        lf("This script is using the following capabilities that might be missing on your current device: {0}",
                                             AST.App.capabilityName(this.app.getPlatform() & ~api.core.currentPlatform))]);
                }
                /*
                if (this.publicId) {
                    // display a lis of buble headers
                    TheApiCacheMgr.getAnd(this.publicId + "/reviews?count=30", (list : JsonList) => {
                        likesDiv.setChildren(list.items.map((review : JsonReview) => {
                            var info = Browser.TheHost.getUserInfoById(review.userid, review.username);
                            var el = info.thumbnail(false, () => { this.parentBrowser.loadDetails(info)  });
                            el.classList.add('teamHead');
                            return el;
                        }));
                    });
                } */
            });

            if (this.publicId) {
                TheApiCacheMgr.getAndEx(this.publicId + "/base", (d, opts) => {
                    var j = <JsonScript>d;
                    if (opts.isDefinitive)
                        TheApiCacheMgr.store(j.id, j);
                    basisDiv.setChildren([scriptBox(lf("base"), j.id)]);
                });
            }

            this.getScriptTextAsync()
                .done((scriptText:string) => {
                if (!scriptText) return;

                var oldPlatform = this.app && this.app.getPlatform();

                this.app = AST.Parser.parseScript(scriptText);
                this.app.localGuid = this.getGuid();
                if (oldPlatform)
                    this.app.setPlatform(oldPlatform);
                var libDivs = []
                var seen:any = {}
                this.app.libraries().forEach((lr:AST.LibraryRef) => {
                    var b = this.browser();
                    var scriptInfo = lr.pubid ? b.getScriptInfoById(lr.pubid) : b.getInstalledByGuid(lr.guid);
                    if (scriptInfo && !seen[scriptInfo.persistentId()]) {
                        seen[scriptInfo.persistentId()] = 1;
                        libDivs.push(ScriptInfo.labeledBox(lf("library"), scriptInfo.mkSmallBox()))
                    }
                });
                libsDiv.setChildren(libDivs);


                if (EditorSettings.editorMode() == EditorMode.pro) {
                    var stats = ""
                    var uplat = this.jsonScript ? this.jsonScript.userplatform : null;
                            stats += ScriptInfo.userPlatformDisplayText(uplat);

                            var descs: AST.StatsComputer[] = this.app.allActions().map((a) => a.getStats());
                            descs.sort((a, b) => a.weight == b.weight ? b.stmtCount - a.stmtCount : b.weight - a.weight)
                    var stmts = 0
                    descs.forEach((d) => { stmts += d.stmtCount })
                    if (this.jsonScript && this.jsonScript.time) {
                                var d = new Date(this.jsonScript.time * 1000)
                        stats += Util.fmt("Published on {0}-{1:f02.0}-{2:f02.0} {3:f02.0}:{4:f02.0}:{5:f02.0}. ",
                                    d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds())
                    }
                            stats += lf("{0} action{0:s}, {1} line{1:s}, actions: ", descs.length, stmts)
                    descs.slice(0, 20).forEach((d, i) => {
                                if (i > 0)
                                    stats += Util.fmt(", {0} ({1})", d.action.getName(), d.stmtCount)
                        else
                                    stats += lf("{0} ({1} line{1:s})", d.action.getName(), d.stmtCount)
                    })
                    if (descs.length > 20)
                        stats += ", ...";
                    infoDiv.setChildren([Host.expandableTextBox(stats)]);
                }

                if (this.app.isLibrary)
                    descDiv.appendChildren(ScriptProperties.libraryDocs(this.app, this.app.getName(), false));
            });
        }

        static userPlatformDisplayText(uplat: string[]) {
            if (!uplat) return "";

            var hasPlat = (n) => uplat.indexOf(n) >= 0;

            var pubFrom = "Published from ";
            if (hasPlat("wp8app")) pubFrom += "Windows Phone 8 app";
            else if (hasPlat("legacywindowsphoneapp")) pubFrom += "Windows Phone 7 app";
            else {
                if (hasPlat("ie10") || hasPlat("ie11")) pubFrom += "Internet Explorer";
                else if (hasPlat("chrome")) pubFrom += "Chrome";
                else if (hasPlat("safari")) pubFrom += "Safari";
                else if (hasPlat("firefox")) pubFrom += "Firefox";

                if (hasPlat("win8plus")) {
                    pubFrom += " on Windows 8";
                    if (hasPlat("touch")) pubFrom += " tablet";
                }
                else if (hasPlat("ie10.phone") && !hasPlat("wp8app")) pubFrom += " on Windows Phone 8";
                else if (hasPlat("win")) pubFrom += " on Windows";
                else if (hasPlat("macOSX")) pubFrom += " on Mac";
                else if (hasPlat("iPad")) pubFrom += " on iPad";
                else if (hasPlat("iPod")) pubFrom += " on iPod";
                else if (hasPlat("iPhone")) pubFrom += " on iPhone";
                else if (hasPlat("android")) {
                    pubFrom += " on Android";
                    if (hasPlat("cellphone")) pubFrom += " phone";
                    else if (hasPlat("touch")) pubFrom += " tablet";
                }
                else if (hasPlat("x11")) pubFrom += " on Linux";
            }
            return pubFrom + ". ";

        }

        private addShare(m:ModalDialog, options:RT.ShareManager.ShareOptions)
        {
            var id = this.publicId;
            var title = this.getTitle();
            var ht = "";
            this.getDescription().replace(/(#\w+)/g, (m, h) => { ht += " " + m; return "" })
            var url = "http://tdev.ly/" + id
            var lnk = RT.Link.mk(url, RT.LinkKind.hyperlink)
            lnk.set_title(title + " #touchdevelop" + ht)

            options.header = lf("share this script")
            options.noDismiss = true
            options.moreButtons = [{
                    text:lf("group"),
                    handler: () => {
                        tick(Ticks.publishShareGroup);
                        Meta.chooseGroupAsync({ header : lf("choose group"), includeSearch : false })
                            .done((g : GroupInfo) => {
                                if (g) {
                                    CommentsTab.topCommentInitialText = "'" + title + "' /" + id;
                                    this.browser().loadDetails(g);
                                }
                            });
                    }
                }]

            var buttons = RT.ShareManager.addShareButtons(m, lnk, options)
            buttons.classList.add("text-left");

            if (!this.isLibrary()) {
                var appStudioDiv = div("wall-dialog-buttons text-left")
                appStudioDiv.style.height = "2.8em";
                m.add(appStudioDiv)
                this.appStudioUrlAsync().done((appStudioUrl:string) => {
                        if (appStudioUrl) {
                            var lnk = HTML.mkA('appStudio', appStudioUrl, '_blank',
                                HTML.mkButtonElt("wall-button", lf("make it an app")),
                                SVG.getAppStudioLogo(),
                                null)
                            appStudioDiv.setChildren(lnk);
                            Util.fadeIn(lnk);
                        } else if (appStudioUrl === "") {
                            var dlnk = div('appStudio',
                                HTML.mkButtonElt("wall-button", lf("want an app?")),
                                SVG.getAppStudioLogo(),
                                null)
                            .withClick(() => {
                                ModalDialog.ask(
                                    lf("Your script is currently using features unsupported in App Studio.")
                                    + " " + lf("If you set your platform settings to 'App Studio', we will give you hints about which particular ones are problematic.")
                                    + " " + lf("Look for a blue pencil next to action name."),
                                    lf("set platform to App Studio"),
                                    () => {
                                        Script.setPlatform(PlatformCapability.AppStudio)
                                        TheEditor.queueNavRefresh()
                                    })
                            })
                            appStudioDiv.setChildren(dlnk);
                            Util.fadeIn(dlnk);
                        }
                    }, e => {
                        Util.reportError('appstudioexport', e, false);
                    });
            }
        }

        public share()
        {
            var m = new ModalDialog()
            this.addShare(m, { tickCallback: (s) => Ticker.rawTick("shareScript_" + s) })
            m.addOk("cancel")
            m.show()
        }

        public publishAsync(fromHub: boolean, noDialog = false, screenshotDataUri : string = null) : Promise
        {
            TipManager.setTip(null);
            if (Cloud.isOffline()) {
                Cloud.showModalOnlineInfo(lf("publishing cancelled"));
                return Promise.as();
            }

            if (!Cloud.canPublish()) {
                ModalDialog.info(lf("cannot publish"), lf("This user is not allowed to publish."));
                return Promise.as();
            }

            if (!Cloud.getAccessToken()) {
                return Cloud.authenticateAsync(lf("publishing scripts")).then((auth) => {
                    if (auth) this.publishAsync(fromHub, noDialog, screenshotDataUri);
                    else return Promise.as();
                })
            }

            var m: ModalDialog;
            var sendPullRequest = false;
            var sendPullRequestId = this.cloudHeader.scriptId;
            var pullMergeIds : string[] = undefined;
            var changeDescription = HTML.mkTextInput('text', lf("add a publication note"));
            changeDescription.classList.add('pub-notes');

            var pub = (hidden: boolean, screenshotUri: string) => {
                var headers: any;
                var done: any = {}
                var waitList: Promise[] = []
                var numPublished = 0

                tick(hidden ? Ticks.corePublishHidden : Ticks.corePublishPublic)

                var trigger = (guid: string) => {
                    if (done[guid]) return;
                    done[guid] = 1;

                    var header = <Cloud.Header>headers[guid];
                    if (!header) return;

                    if (header.status == "unpublished") {
                        waitList.push(World.getInstalledScriptAsync(guid).then((scriptText: string) => {
                            var canPublish = true;
                            var madeUpdate = false;
                            var app = AST.Parser.parseScript(scriptText)
                            if (guid == this.getGuid())
                                pullMergeIds = app.parentIds; // store those for later before they get cleared by publishing
                            app.libraries().forEach((l: AST.LibraryRef) => {
                                if (l.pubid) return;
                                var hd = <Cloud.Header>headers[l.guid];
                                if (!hd) {
                                    HTML.showErrorNotification(lf("cannot find library reference {0} in {1}", l.getName(), app.getName()))
                                    canPublish = false;
                                    return;
                                }

                                if (hd.status == "published") {
                                    l.guid = "";
                                    l.pubid = hd.scriptId;
                                    madeUpdate = true;
                                } else {
                                    trigger(l.guid);
                                    canPublish = false;
                                }
                            })

                            var savePromise = Promise.as();

                            if (madeUpdate) {
                                // don't mess up with version number and instance id - this may conflict with the editor
                                header.scriptVersion.instanceId = Cloud.getWorldId()
                                header.scriptVersion.time = World.getCurrentTime();
                                savePromise = World.setInstalledScriptAsync(header, app.serialize(), null)
                            }

                            if (canPublish)
                                return savePromise.then(() => {
                                    numPublished++;
                                    return World.publishAsync(guid, hidden);
                                });
                            else
                                return savePromise;
                        }))
                    }
                }

                var fixpoint = () => {
                    World.getInstalledAsync().done((h) => {
                        var prePub = numPublished;
                        done = {}
                        waitList = []
                        headers = h;

                        trigger(this.getGuid())
                        Promise.join(waitList).then(() => World.syncAsync()).then(message => {
                            if (!message) {
                                if (prePub != numPublished)
                                    fixpoint();
                                else {
                                    HTML.showProgressNotification(lf("{0} script{0:s} published", numPublished));

                                    World.getInstalledHeaderAsync(this.getGuid()).then((hd) => {
                                        if (!hd || hd.status !== "published") {
                                            // let's hope there was some error notification already
                                            m.dismiss()
                                            return null;
                                        }

                                        this.cloudHeader = hd;
                                        this.publicId = hd.scriptId;

                                        if (screenshotDataUri)
                                            this.backgroundUploadScreenshot(screenshotDataUri);

                                        var descr = changeDescription.value || "";
                                        if (descr && this.cloudHeader.status == 'published') {
                                            tick(Ticks.browsePublicationNotes);
                                            var req = { kind: "comment", text: descr + ' #publicationNotes', userplatform: Browser.platformCaps };
                                            HTML.showProgressNotification(lf("saving publication notes..."), true);
                                            Cloud.postPrivateApiAsync(this.cloudHeader.scriptId + "/comments", req)
                                                .then((jscom: JsonComment) => {
                                                    if (jscom && sendPullRequest) {
                                                        tick(Ticks.browseSendPullRequest);
                                                        Util.log('send pull request');
                                                        HTML.showProgressNotification(lf("sending pull request..."), true);
                                                        var req = { kind: "comment", text: '#pullRequest /' + jscom.id + ' /' + this.cloudHeader.scriptId, userplatform: Browser.platformCaps };
                                                        return Cloud.postPrivateApiAsync(sendPullRequestId + "/comments", req);
                                                    }
                                                    return Promise.as();
                                                }).done();
                                        }
                                        if (pullMergeIds) {
                                            HTML.showProgressNotification(lf("closing pull requests..."), true);
                                            Promise.join(pullMergeIds.map(mid => {
                                                var req = { kind: "comment", text: lf("Your changes have been pulled into {0}!", ' /' + this.cloudHeader.scriptId), userplatform: Browser.platformCaps };
                                                return Cloud.postPrivateApiAsync(mid + "/comments", req);
                                            })).done(() => {}, (e) => {});
                                        }
                                        this.publishFinished(m, fromHub, sendPullRequest);
                                    }).done()
                                }
                            } else {
                                if (!ModalDialog.currentIsVisible())
                                    ModalDialog.info("publishing unsuccessful", lf("Your script might not have been successfully published. Another attempt will be made when you sync again later.") + " " + message);
                            }
                        }).done();
                    })
                }

                if (m)
                    m.dismiss();

                m = new ModalDialog();
                m.add(div("wall-dialog-header", lf("Publishing script...")));
                var progressBar = HTML.mkProgressBar();
                m.add(progressBar);
                m.show();
                progressBar.start();
                m.onDismiss = () => {
                    this.browser().notifySyncDone();
                };
                fixpoint();
                if (!hidden)
                    Browser.Hub.askToEnableNotifications();
                // TODO: properly invalidate affected items
            }

            if (noDialog) {
                pub(false, undefined)
                return Promise.as();
            } else {
                return new Promise((onSuccess, onError, onProgress) => {
                    m = new ModalDialog();
                    m.add(div("wall-dialog-header", lf("Publish script"), Editor.mkHelpLink("publishing", lf("learn about publishing"))));

                    m.add(div("wall-dialog-body",
                        lf("DO NOT STORE PASSWORDS or other confidential information in your script code. ") +
                        lf("Everyone will be able to see your script on the Internet forever. ")
                        ));
                    var screenshotDataUri = TheEditor.lastScreenshotUri();
                    var uploadScreenshot = true;
                    var uploadScreenshotCheck = HTML.mkCheckBox(lf("upload screenshot"), b => uploadScreenshot = b, uploadScreenshot);
                    if (screenshotDataUri) {
                        var previewImage = HTML.mkImg(screenshotDataUri);
                        previewImage.setAttribute('class', 'publishScreenshot');
                        m.add(previewImage);
                        m.add(div('wall-dialog-body', uploadScreenshotCheck));
                        m.setScroll();
                    }

                    var publishBtn;
                    m.add(div("wall-dialog-buttons",
                        publishBtn = HTML.mkButton(lf("publish"), () => pub(false, uploadScreenshot ? screenshotDataUri : undefined)),
                        TheEditor.widgetEnabled('publishAsHidden') ? HTML.mkButton(lf("publish as hidden"), () => pub(true, uploadScreenshot ? screenshotDataUri : undefined)) : undefined,
                        HTML.mkButton(lf("cancel"), () => m.dismiss())));
                    if (TheEditor.widgetEnabled('publishDescription')) {
                        // if different author, allow to create pull request
                        m.add(div('wall-dialog-buttons', changeDescription));
                    }
                    if (TheEditor.widgetEnabled('sendPullRequest') &&
                        this.cloudHeader.userId && this.cloudHeader.userId != Cloud.getUserId()) {
                        m.add(div('wall-dialog-body',
                            Editor.mkHelpLink('pullrequests', lf("learn about pull requests")),
                            HTML.mkCheckBox(lf("send pull request"), (v) => {
                                sendPullRequest = v;
                                publishBtn.style.display = v ? 'none' : 'inline';
                            }, sendPullRequest)
                            ));
                    }
                    m.add(Cloud.mkLegalDiv());
                    m.onDismiss = () => onSuccess(undefined);
                    m.show();
                });
            }
        }

        private backgroundUploadScreenshot(dataUri: string) {
            var m = dataUri.match(/^data:(image\/(png|jpeg));base64,(.*)$/);
            var contentType = m[1];
            var base64content = m[3];
            Util.betaCheck(!!contentType);
            if (contentType && base64content) {
                HTML.showProgressNotification(lf("uploading screenshot..."));
                Cloud.postPrivateApiAsync(this.publicId+ "/screenshots", {
                    kind: "screenshot",
                    contentType: contentType,
                    content: base64content,
                    userplatform: Browser.platformCaps
                    }).then(() => {
                        HTML.showProgressNotification(lf("screenshot uploaded"), true);
                    }, e => {
                        HTML.showProgressNotification(lf("screenshot upload failed"), true);
                        World.handlePostingError(e, lf("post screenshot"));
                   }).done();
            }
        }

        public appStudioUrlAsync(): Promise {
            if (!this.publicId) return Promise.as(undefined);
            return Cloud.getPublicApiAsync(this.publicId + "/canexportapp/" + Cloud.getUserId() + "?features=anonBrowser")
                .then((res: JsonCanExportApp) => {
                    if (res.canExport)
                        return TDev.AppExport.getExportScriptsTokenAsync()
                            .then((tok: string) =>
                                'https://appstudio.windows.com/projects/CreateTouchDevelopApp/' +
                                this.publicId + "?token=" + encodeURIComponent(tok))
                    else if (/missing the feature/.test(res.reason))
                        return Promise.as("")
                    else
                        return Promise.as(null)
                })
        }

        private publishFinished(m:ModalDialog, fromHub:boolean, isPull:boolean)
        {
            m.empty();
            var sml = div("floatingSmilie", ":)")
            m.add(sml)
            Util.setTimeout(1500, () => {
                sml.setChildren(";)")
                    Util.setTimeout(600, () => {
                    sml.setChildren(":)")
                    })
                })
            m.add(div("wall-dialog-header", lf("hooray! your script is published")));
            if (isPull)
                m.addHTML(lf("A comment about your pull request was added."));
            else {
                var txtAddress = HTML.mkTextInput('text', lf("script url"));
                txtAddress.value = "http://tdev.ly/" + this.publicId;
                txtAddress.readOnly = true;
                Util.selectOnFocus(txtAddress);

                m.add(div('wall-dialog-body', lf("Everyone can run your script at:"), txtAddress));
            }

            var finish = () => {
                Util.setTimeout(500, () => {
                    // without this line, publishng from the hub leaves behind outdated script page
                    if (fromHub) {
                        TheEditor.historyMgr.reload(HistoryMgr.windowHash());
                    }
                });
            }


            if (!isPull)
                this.addShare(m, { tickCallback: (s) => Ticker.rawTick("publishShareScript_" + s), justButtons: true })

            m.addOk("close", () => {
                m.dismiss();
                Browser.Hub.askToEnableNotifications(finish);
            });
        }

        private uninstall()
        {
            TipManager.setTip(null);
            Promise.join([
                this.browser().deletePaneAnimAsync(),
                World.uninstallAsync(this.getGuid())
            ]).done(() => {
                this.cloudHeader = null;
                if (this.publicId)
                    TheEditor.historyMgr.reload(HistoryMgr.windowHash());
                else {
                    this.browser().skipOneSync = true;
                    Util.setHash("list:installed-scripts");
                }
            });
        }

        private killData() {
            TheEditor.currentRt.sessions.deleteAllLocalDataAsync(this.getGuid()).done(() => {
                HTML.showProgressNotification(lf("puff! gone."));
            });
        }

        static setupLike(id:string, setBtn:(state:number, hearts : string, f:()=>void)=>void)
        {
            function load(n:number,h:number) : void {
                var reviewId = TheApiCacheMgr.getHeart(id, () => load(2,h));
                if (reviewId) {
                    setBtn(n, h < 0 ? lf("remove") : h.toString(), delHeart);
                } else {
                    setBtn(-n, h < 0 ? lf("add") : h.toString(), addHeart);
                }
            }

            function addHeart() {
                if (Cloud.anonMode(lf("adding hearts"), addHeart)) return;

                var ha = getScriptHeartCount(TheApiCacheMgr.getCached(id));
                setBtn(-1, ha < 0 ? "0" : ha.toString(), () => {});
                Util.httpPostJsonAsync(Cloud.getPrivateApiUrl(id + "/reviews"), { kind: "review", userplatform: Browser.platformCaps })
                .done((resp: JsonReview) => {
                    if (localStorage["rateTouchDevelop"] != 2) {
                        localStorage["rateTouchDevelop"] = 1;
                    }
                    TheApiCacheMgr.storeHeart(id, resp.id);
                    load(3, Math.max(ha,0)+1);
                    Browser.Hub.askToEnableNotifications();
                }, (e: any) => {
                    World.handlePostingError(e, "add hearts");
                });
            }

            function delHeart() {
                if (Cloud.anonMode(lf("removing hearts"), delHeart)) return;

                var hd = getScriptHeartCount(TheApiCacheMgr.getCached(id));
                setBtn(1, hd < 0 ? "0" : hd.toString(), () => {});
                var reviewId = TheApiCacheMgr.getHeart(id, null);
                Util.httpRequestAsync(Cloud.getPrivateApiUrl(reviewId), "DELETE", undefined)
                .done(() => {
                    TheApiCacheMgr.storeHeart(id, "");
                    load(3, Math.max(hd, 1)-1);
                }, (e: any) => {
                    World.handlePostingError(e, "remove hearts");
                });
            }

            var hs = getScriptHeartCount(TheApiCacheMgr.getCached(id));
            load(2,hs);
        }

        public match(terms:string[], fullName:string)
        {
            if (terms.length == 0) return 1;
            var lowerName = this.app.getName().toLowerCase();
            var r = IntelliItem.matchString(lowerName, terms, 10000, 1000, 100);
            if (r > 0) {
                if (lowerName.replace(/[^a-z0-9]/g, "") == fullName)
                    r += 100000;
                return r;
            }
            var s = this.app.getName() + " " + this.publicId + " " + this.app.getDescription();
            if (!!this.jsonScript)
                s += " " + this.jsonScript.username;
            return IntelliItem.matchString(s.toLowerCase(), terms, 100, 10, 1);
        }

        public diffToId(id:string)
        {
            ScriptProperties.showDiff(
                Promise.join([id ? ScriptCache.getScriptAsync(id) : this.getScriptTextAsync(), this.getScriptTextAsync()]).then(scrs => {
                    if (!scrs[0] || !scrs[1]) return;
                    function prep(s:string)
                    {
                        var app = AST.Parser.parseScript(s, [])
                        app.isTopLevel = true;
                        AST.TypeChecker.tcScript(app, true);
                        return app;
                    }
                    var a0 = prep(scrs[0])
                    var a1 = prep(scrs[1])
                    new AST.InitIdVisitor(false).dispatch(a0)
                    AST.Diff.diffApps(a0, a1, {
                        useStableNames: /diffNoStable/.test(document.URL) ? false : true,
                        tutorialMode: /tutorialDiff/.test(document.URL)
                    })
                    return a1
                }))
        }

        public diffToBase()
        {
            if (this.basedOnPub)
                this.diffToId(this.basedOnPub)
            else if (this.jsonScript && this.jsonScript.id == this.jsonScript.rootid)
                this.diffToId(null);
            else if (this.publicId)
                TheApiCacheMgr.getAsync(this.publicId + "/base", true).done(scr => this.diffToId(scr ? scr.id : null))
            else
                this.diffToId(null);
        }

        public mergeScript()
        {
            ScriptProperties.mergeScript(this.jsonScript)
        }
    }

    export class ScriptsTab
        extends ListTab
    {
        constructor(par:BrowserPage, private _noneText : string = lf("no scripts published by this user"), private _name : string = lf("scripts"), private path:string = "scripts") {
            super(par, "/" + path + "?applyupdates=" + (/hiddenScripts/.test(document.URL) ? "false" : "true"))
        }
        public getId() { return this.path; }
        public getName() { return this._name; }
        public bgIcon() { return "svg:Upload"; }
        public noneText() { return this._noneText; }

        public inlineText(cc:JsonIdObject)
        {
            var c = <JsonScript>cc;
            var h = getScriptHeartCount(c)
            return <any[]>[c.name, h > 0 ? " " + h + " " + "♥" : null];
        }

        public tabBox(c:JsonScript):HTMLElement
        {
            return this.browser().getScriptInfo(c).mkSmallBox();
        }
    }

    export class ConsumersTab
        extends ListTab
    {
        constructor(par:BrowserPage)
        {
            super(par, "/scripts?applyupdates=true");
            this.isEmpty = true;
        }

        public needsJsonScript() { return true; }
        public inlineIsTile() { return false; }
        public getId() { return "consumers"; }
        public getName() { return lf("consumers"); }
        public bgIcon() { return "svg:pizza"; }
        public noneText() { return lf("no consumers of this library"); }

        public tabBox(c:JsonScript):HTMLElement
        {
            return this.browser().getScriptInfo(c).mkSmallBox();
        }

        initInline()
        {
            this.inlineContent.className = "";

            var hide = () => {
                this.setVisibility(false);
                this.isEmpty = true;
                this.browser().syncTabVisibility();
            }

            var par = this.script();
            if (par.jsonScript && !par.jsonScript.islibrary) {
                hide();
                return;
            }

            this.loadMoreElementsAnd(null, (cmts:JsonPublication[]) => {
                if (cmts.length == 0) {
                    hide();
                } else {
                    this.setVisibility(true);
                    this.isEmpty = false;
                    var children = []
                    cmts.forEach((scr:JsonScript, i:number) => {
                        if (i >= 1) return;
                        children.push(ScriptInfo.labeledBox(lf("consumer"), this.browser().getScriptInfo(scr).mkSmallBox()));
                    });
                    children.push(div("sdTabTile inlineBlock", this.getTileContent(this.numElts)));
                    this.inlineContent.setChildren(children);
                }
            });
        }
    }

    export class UserTab
        extends ListTab
    {
        constructor(par:BrowserPage) {
            super(par, "/users")
        }
        public getId() { return "users"; }
        public getName() { return lf("users"); }
        public bgIcon() { return "svg:SmilieHappy"; }
        public hideOnEmpty() { return false; }
        public noneText() { return ""; }

        public inlineIsTile() { return true; }

        static mkBox(b: Host, c: JsonUser) {
            return b.getUserInfo(c).mkSmallBox();
        }

        public tabBox(c:JsonUser)
        {
            return UserTab.mkBox(this.browser(), c);
        }
    }

    export class UserInfo
        extends BrowserPage
    {
        private userName: string;
        public userScore: number;
        public nopicture:boolean;

        constructor(par:Host) {
            super(par)
        }
        public persistentId() { return "user:" + this.publicId; }
        public getTitle() { return this.userName || super.getTitle(); }

        public getId() { return "overview"; }
        public getName() { return lf("overview"); }

        public loadFromWeb(id:string, name:string)
        {
            Util.assert(!!id)
            this.publicId = id;
            this.userName = name;
        }

        public userPicture(thumb = false)
        {
            var dd = div("sdIcon");
            var loadAnon = ():void => {
                var id = this.publicId;
                this.browser().picturelessUsers[id] = true;
                Browser.setInnerHTML(dd, TDev.Util.svgGravatar(id));
            }

            var load = (id:string):void =>
            {
                var ui = TheApiCacheMgr.getCached(id);
                if (ui && !ui.haspicture) this.nopicture = true;

                function loadHandler() { /*EXT*/
                    if (this.width + this.height == 0) loadAnon();
                }

                if (this.nopicture || this.browser().picturelessUsers.hasOwnProperty(id)) {
                    Util.setTimeout(1, loadAnon);
                } else {
                    var img = HTML.mkImg(Cloud.getPublicApiUrl(id + "/picture?type=" + (thumb ? "normal" : "large")));
                    dd.setChildren(img);
                    img.onerror = loadAnon;
                    img.onload = loadHandler;
                }
            }

            if (this.publicId == "me" && !Cloud.getUserId()) {
                dd.setChildren(HTML.mkImg("svg:Person,#40B619,clip=80"));
            }

            this.getPublicIdAsync().done(() => { load(this.publicId) });

            return dd;
        }

        public getPublicIdAsync() {
            if (this.publicId == "me") {
                var id = Cloud.getUserId();
                if (!id) return new Promise(() =>{ }); // never return
                this.publicId = id;
            }
            return Promise.as(this.publicId);
        }


        public mkBoxCore(big:boolean)
        {
            var icon = this.userPicture();
            var nameBlock = dirAuto(div("sdName", this.userName));
            var hd = div("sdNameBlock", nameBlock);

            var numbers = div("sdNumbers");
            var author = div("sdAuthorInner");
            var pubId = div("sdAddInfoOuter", div("sdAddInfoInner", "/" + this.publicId));
            var res = div("sdHeaderOuter", div("sdHeader", icon,
                div("sdHeaderInner", hd, pubId, div("sdAuthor", author), numbers, this.reportAbuse(big))));

            if (big)
                res.className += " sdBigHeader";

            return this.withUpdate(res, (u:JsonUser) => {
                this.userName = u.name;
                this.userScore = u.score;
                nameBlock.setChildren([u.name]);

                var cont = [];
                var addNum = (n:number, sym:string) => { cont.push(ScriptInfo.mkNum(n, sym)) }
                addNum(u.score, "svg:Award,black,clip=110");
                addNum(u.receivedpositivereviews, "♥");
                //addNum(u.subscribers, "♟");
                //addNum(u.features, "⚒");
                if (big && !SizeMgr.phoneMode) {
                    addNum(u.subscribers, "svg:Person,black,clip=80");
                    //addNum(u.features, "svg:Award,black,clip=110");
                    addNum(u.features, "svg:Pencil,black,clip=110");
                    addNum(u.activedays, "☀");
                }
                numbers.setChildren(cont);
            });
        }

        public mkTile(sz:number)
        {
            var d = div("hubTile hubTileSize" + sz);
            d.style.background =  ScriptIcons.stableColorFromName(this.userName);

            return this.withUpdate(d, (u:JsonUser) => {
                this.userName = u.name;

                var cont = [];
                var addNum = (n:number, sym:string) => { cont.push(ScriptInfo.mkNum(n, sym)) }
                addNum(u.receivedpositivereviews, "♥");
                //addNum(u.subscribers, "svg:Person,white,clip=80"); does not scale properly
                //addNum(u.features, "svg:Award,white,clip=110");

                var nums = div("hubTileNumbers", cont, div("hubTileNumbersOverlay"));

                d.style.backgroundImage = HTML.cssImage( Cloud.getPublicApiUrl(u.id + "/picture?type=large") );
                d.style.backgroundRepeat = 'no-repeat';
                d.style.backgroundPosition = 'center';
                d.style.backgroundSize = 'cover';
                d.setChildren([div("hubTileTitleBar",
                                     div("hubTileTitle", spanDirAuto(this.userName)),
                                     div("hubTileSubtitle",
                                        div("hubTileAuthor", u.score.toString(), nums)))])
            });
            return d;
        }

        public thumbnail(showName = true, onClick : () => void = undefined) : HTMLElement
        {
            if (!this.publicId) return div(null);
            var icon = this.userPicture(true);
            var thumb = div("sdThumb", icon);

            if (!onClick) onClick = () => this.browser().loadDetails(this);
            thumb.withClick(onClick);
            thumb.style.cursor = "pointer";

            if (showName) {
                var nameBlock = div("sdThumbName", this.userName);
                thumb.appendChild(nameBlock)
                if (!this.userName) {
                    this.withUpdate(nameBlock, (u: JsonUser) => {
                        this.userName = u.name;
                        nameBlock.setChildren([u.name]);
                    });
                }
            }

            return thumb;
        }

        public mkTabsCore():BrowserTab[]
        {
            var tabs:BrowserTab[] = [this,
             new UserScoreTab(this),
             new ScreenShotTab(this),
             new ScriptsTab(this),
             new UserSocialTab(this),
            ];
            if (this.isMe())
                tabs.push(new UserPrivateTab(this));
            return tabs;
        }

        static invalidateSubscriptions(id:string)
        {
            TheApiCacheMgr.invalidate((Cloud.getUserId() || "") + "/subscriptions")
            TheApiCacheMgr.invalidate(id + "/subscribers")
            TheApiCacheMgr.invalidate(id)
        }

        private askedToLogin:boolean;

        public initTab() {
            if (this.publicId == "me" && !Cloud.getUserId() && !this.askedToLogin) {
                this.askedToLogin = true;
                Cloud.anonMode(lf("editing user settings"), null, true);
            }

            var ch = this.getTabs().map((t: BrowserTab) => t == this ? null : <HTMLElement>t.inlineContentContainer);
            var hd = div("sdDesc");
            var accountButtons = <HTMLElement>undefined;
            if (this.isMe())
                ch.unshift(accountButtons = div("sdBottomButtons sdAccountBtns",
                    HTML.mkButton(lf("account settings"), () => { Hub.accountSettings() }),
                    HTML.mkButton(lf("change wallpaper"), () => { Hub.chooseWallpaper() })
                ));
            ch.unshift(hd);

            this.tabContent.setChildren(ch);

            this.withUpdate(hd, (u: JsonUser) => {
                hd.setChildren([Host.expandableTextBox(u.about)]);
                if (this.isMe()) {
                    var scoreDiv = Browser.ScriptInfo.mkNum(u.score, "svg:Award,white,clip=110");
                    var scoreBtn = HTML.mkButtonElt("wall-button", scoreDiv);
                    Util.clickHandler(scoreBtn, () => {
                        Util.setHash("#list:installed-scripts:user:" + this.publicId + ":score")
                    });
                    accountButtons.appendChildren([scoreBtn, HTML.mkButton(lf("sign out"), () => TheEditor.logoutDialog())]);
                }
            });
        }

        public match(terms:string[], fullName:string)
        {
            if (terms.length == 0) return 1;

            var json:JsonUser = TheApiCacheMgr.getCached(this.publicId);
            if (!json) return 0; // not loaded yet

            var lowerName = json.name.toLowerCase();
            var r = IntelliItem.matchString(lowerName, terms, 10000, 1000, 100);
            if (r > 0) {
                if (lowerName.replace(/[^a-z0-9]/g, "") == fullName)
                    r += 100000;
                return r;
            }
            var s = lowerName + " " + this.publicId + " " + json.about;
            return IntelliItem.matchString(s.toLowerCase(), terms, 100, 10, 1);
        }
    }

    export class UserPrivateTab extends BrowserMultiTab {
        constructor(par: UserInfo) {
            super(par,
                "Informations about apps, keys and cloud sessions.",
                WindowsStoreAppsTab, WindowsPhoneStoreAppsTab, KeysTab, CloudSessionsTab
                );
        }

        public bgIcon() {
            return "svg:lock";
        }

        public inlineIsTile() { return true; }

        public initElements() {
            super.initElements();
            this.inlineContent.setChildren(BrowserMultiTab.generateReplacementTileContents(this));
            this.setVisibility(true);
        }

        public initInline() {
            super.initInline();
            this.inlineContent.setChildren(BrowserMultiTab.generateReplacementTileContents(this));
            this.setVisibility(true);
        }

        public getName() { return lf("private"); }
        public getId() { return "private"; }
    }

    export class UserSocialTab extends BrowserMultiTab {
        constructor(par: UserInfo) {
            super(par,
                "More information about art, score, groups, subscribers, subscriptions and given hearts.",
                ArtTab, GroupsTab, SubscribersTab, UserHeartsTab, SubscriptionsTab, RunBucketsTab);
        }

        public bgIcon() {
            return "svg:group";
        }

        public inlineIsTile() { return true; }

        public initElements() {
            super.initElements();
            this.inlineContent.setChildren(BrowserMultiTab.generateReplacementTileContents(this));
            this.setVisibility(true);
        }

        public initInline() {
            super.initInline();
            this.inlineContent.setChildren(BrowserMultiTab.generateReplacementTileContents(this));
            this.setVisibility(true);
        }

        public getName() { return lf("more"); }
        public getId() { return "more"; }
    }

    export class UserScoreTab
        extends BrowserTab
    {
        constructor(par: BrowserPage) {
            super(par);
        }
        public getName() { return lf("score"); }
        public getId() { return "score"; }
        public bgIcon() { return "svg:Group"; }
        public hideOnEmpty() { return true; }
        public inlineIsTile() { return false; }

        public initTab() {
            if (Cloud.anonMode(lf("accessing user score"))) return;

            var loadingDiv = div('bigLoadingMore', lf("loading..."));
            var ch = div('');
            this.tabContent.setChildren([loadingDiv, ch]);
            Cloud.getPrivateApiAsync(this.parent.publicId + "/score").done((u: JsonUserScore) => {
            TheApiCacheMgr.getAsync(this.parent.publicId, true).done((ui: JsonUser) => {

                loadingDiv.removeSelf();

                var features = u.languageFeatures.features;
                features.sort((a,b) => b.count - a.count);
                var reviews = u.receivedPositiveReviews.scripts;
                //reviews.sort((a,b) => b.count - a.count);

                ch.appendChild(div('sdScoreTitleTop', 'user score: ' + ui.score + ' points'));

                ch.appendChild(div('sdScoreTitle', 'subscriptions: ' + ui.subscribers + " gives " + u.receivedSubscriptions.points + ' points'));
                ch.appendChild(div('sdScoreTitle', 'active days: ' + ui.activedays + " gives " + u.activeDays.points + ' points'));
                ch.appendChild(div('sdScoreTitle', 'language features: ' + features.length + " gives " + u.languageFeatures.points + ' points'));
                ch.appendChild(div('sdScoreTitle', '♥ from other people: ' + ui.receivedpositivereviews + " gives " + u.receivedPositiveReviews.points + ' points'));
                ch.appendChildren(
                    reviews.map((review : JsonScript) => this.browser().getScriptInfo(review).mkSmallBox())
                    );
                ch.appendChild(div('',
                    features.map((feature : JsonFeature) => HTML.mkA('sdFeature', '#topic:' + feature.name, '', feature.title))
                    ));
            })});
        }
    }

    export class GroupsTab
        extends ListTab {
        constructor(par: BrowserPage) {
            super(par, "/groups")
        }
        public getName() { return lf("groups"); }
        public getId() { return "groups"; }
        public bgIcon() { return "svg:group"; }

        static mkBox(b: Host, c: JsonGroup) {
            return b.getGroupInfo(c).mkSmallBox();
        }

        public tabBox(c: JsonGroup) {
            return GroupsTab.mkBox(this.browser(), c);
        }
    }

    export class GroupUserProgressTab
        extends ListTab
    {
        constructor(par:GroupInfo)
        {
            super(par, "/users");
        }

        public getName() { return lf("progress"); }
        public getId() { return "progress"; }
        public bgIcon() { return "svg:Star"; }
        public noneText() { return lf("no users in this group!"); }

        private progressTable : HTMLTableElement;
        private progressHeader : HTMLTableRowElement;
        private tutorials : StringMap<string> = {};
        topContainer() : HTMLElement
        {
            this.progressTable = document.createElement("table");
            this.progressTable.className = "dashboard";
            this.progressHeader = document.createElement("tr");
            this.progressHeader.className = "header";
            this.progressTable.appendChild(this.progressHeader);
            this.progressHeader.appendChild(document.createElement("td"));
            var cp = document.createElement("td"); cp.appendChild(div('', span('', lf("tutorial completed"))));
            this.progressHeader.appendChild(cp); // completed
            var st = document.createElement("td"); st.appendChild(div('', span('', lf("tutorial steps"))));
            this.progressHeader.appendChild(st);
            this.tutorials = {};
            return div('tbProgress', this.progressTable);
        }

        public tabBox(cc:JsonIdObject):HTMLElement
        {
            var tr = (u : JsonUser) => {
                var row = document.createElement("tr");
                row.dataset["userid"] = c.id;
                var cell = document.createElement("td");
                row.appendChild(cell);
                var user = this.browser().getUserInfoById(c.id, c.name).mkSmallBox();
                user.setFlag('slim', true);
                user.style.width = '21em';
                cell.appendChild(user);
                this.progressTable.appendChild(row);
                return row;
            }
            var td = (r: HTMLTableRowElement, txt:string) => {
                var el = document.createElement("td");
                el.innerText = txt;
                r.appendChild(el)
                return el;
            }

            var c = <JsonUser>cc;
            // skip owner
            if (c.id == (<GroupInfo>this.parent).userid) return undefined;

            TheApiCacheMgr.store(c.id, c);
            TheApiCacheMgr.getAnd(c.id + "/progress", (progresses) => {
                if (!progresses) return;
                // gather list of tutorials
                var pis = (<JsonProgress[]>progresses.items)
                    .filter(p => p.index > 0)
                    .reverse();
                if (pis.length == 0) return;
                var items : StringMap<JsonProgress> = {};
                pis.forEach(it => {
                        if (!this.tutorials[it.progressid]) {
                            var hd = document.createElement("td");
                            var info = this.browser().getScriptInfoById(it.progressid)
                            hd.withClick(() => this.browser().loadDetails(info));
                            var sp = span('', '/' + it.progressid);
                            hd.appendChild(div('', sp))
                            this.progressHeader.appendChild(hd);
                            this.tutorials[it.progressid] = "1";
                            info.getJsonScriptPromise().whenUpdated((x, opts) => { sp.innerText = x.name + ' /' + x.id });

                        }
                        items[it.progressid] = it;
                    });

                var row = tr(c);
                var completed = 0; var steps = 0;
                var completedTd = td(row, "0"); completedTd.className = "stats";
                var stepsTd = td(row, "0"); stepsTd.className = "stats";
                Object.keys(this.tutorials)
                    .map(progressid => items[progressid])
                    .forEach(progress => {
                        if(!progress) {
                            td(row, '');
                            return;
                        }
                        var cell = td(row, "");
                        cell.dataset["scriptid"] = progress.progressid;
                        cell.setFlag("completed", progress.completed>0);
                        steps += progress.index;
                        stepsTd.innerText = steps.toString();
                        if (progress.completed) {
                            Browser.setInnerHTML(cell, '<span class="symbol">✓</span>')
                            completed++;
                            completedTd.innerText = completed.toString();
                        } else {
                            cell.innerText = progress.index.toString();
                        }
                    })
            });

            return undefined;
        }
    }

    export class CollaborationsTab
        extends BrowserTab
    {
        constructor(par: GroupInfo) {
            super(par);
        }
        public getName() { return lf("scripts"); }
        public getId() { return "scripts"; }
        public bgIcon() { return "svg:Space"; }

        public initTab() {
            var infoDiv = div('sdExpandableText',
                lf("Group scripts can be edited by multiple group members at the same time. Only group owners can add and remove group scripts."),
                Editor.mkHelpLink("group scripts"));
            var me = Cloud.getUserId()
            if (!me) {
                this.tabContent.setChildren([infoDiv,
                    lf("You must sign in to use group scripts.")]);
                return;
            }

            var loadingDiv = div('bigLoadingMore', lf("loading..."));

            var buttons = div('');
            var ch = div('');
            var sessionMapping:StringMap<Cloud.Header> = {}
            this.tabContent.setChildren([infoDiv, buttons, ch]);

            var fillSessionMappingAsync = () => {
                return Promise.join(
                    this.browser().getInstalledHeaders().map(h =>
                        World.getInstalledEditorStateAsync(h.guid)
                        .then(s => {
                            if (s) {
                                var st = <AST.AppEditorState> JSON.parse(s)
                                if (st.collabSessionId)
                                    sessionMapping[st.collabSessionId] = h
                            }
                        })))
            }

            var loadCollaborations = () => {
                this.tabContent.appendChild(loadingDiv);
                Promise.join([
                    TDev.Collab.getCollaborationsAsync(this.parent.publicId),
                    fillSessionMappingAsync()
                ]).done(arr => {
                        var collabs: TDev.Collab.CollaborationInfo[] = arr[0]
                        loadingDiv.removeSelf();
                        if (!collabs || collabs.length == 0)
                            ch.setChildren(lf("no scripts in this group yet!"));
                        else
                            ch.setChildren(collabs.map(collab => {
                                var hd = sessionMapping[collab.session]
                                if (collab.owner == me)
                                    var info = this.browser().getInstalledByGuid(collab.ownerScriptguid);
                                else if (hd)
                                    info = this.browser().getInstalledByGuid(hd.guid)
                                else {
                                    var app = AST.Parser.parseScript(collab.meta)
                                    var j = app.toJsonScript()
                                    j.userid = collab.owner
                                    j.username = collab.owner // TODO load real one
                                    j.id = collab.ownerScriptguid.replace(/-/g, "")
                                    info = this.browser().getScriptInfo(j)
                                }

                                var setAndEdit = () => {
                                    Editor.updateEditorStateAsync(info.getGuid(), (st) => {
                                        st.collabSessionId = collab.session;
                                        st.groupId = this.parent.publicId;
                                    }).done(() => info.edit())
                                }

                                if (info) {
                                    var box = info.mkBoxCore(false).withClick(() => {
                                        if (collab.owner == me)
                                            setAndEdit()
                                        else if (hd)
                                            info.edit()
                                        else {
                                            var stub: World.ScriptStub = {
                                                editorName: "touchdevelop",
                                                scriptText: collab.meta,
                                                scriptName: info.getTitle(),
                                            };
                                            World.installUnpublishedAsync(null, collab.owner, stub)
                                                .then(hd => {
                                                    info = this.browser().createInstalled(hd)
                                                    setAndEdit()
                                                })
                                                .done()
                                        }
                                    });
                                    if (collab.owner == me || (<GroupInfo>this.parent).isMine())
                                        box.appendChild(HTML.mkButton(lf("remove from group"), () => {
                                            ModalDialog.ask(
                                                lf("Are you sure you want to remove this script from the group? Other members of the group won't be able to edit it anymore."),
                                                lf("remove script"),
                                                () => {
                                                    HTML.showProgressNotification(lf("removing script from group"), true);
                                                    TDev.Collab.stopCollaborationAsync(collab.owner, collab.ownerScriptguid)
                                                        .then(() => Editor.updateEditorStateAsync(collab.ownerScriptguid, (st) => {
                                                            delete st.collabSessionId;
                                                            delete st.groupId;
                                                        }))
                                                        .done(() => loadCollaborations())
                                                });
                                        }));
                                    return box;
                                }
                                else
                                    return null
                            }));
                    }, e => {
                        Util.check(false, lf("failed to retreive scripts"));
                        loadingDiv.removeSelf();
                        ch.appendChild(div('', lf("Oops, we could not get the scripts for this group. Please try again later.")));
                });
            }

            this.setCollaborationButtons(buttons, () => ch.setChildren([loadingDiv]), loadCollaborations);
            loadCollaborations();
        }

        public setCollaborationButtons(buttons: HTMLElement, start: () => void, done: () => void) {
            buttons.setChildren([
                HTML.mkButton(lf("add existing script"), () => {
                    start();
                    Meta.chooseScriptAsync(<TDev.Meta.ChooseScriptOptions>{
                        filter: function (si: ScriptInfo) {
                            return !si.getCloudHeader().userId || si.getCloudHeader().userId == Cloud.getUserId();
                        }
                    })
                    .then((script: ScriptInfo) => (<GroupInfo>this.parent).addScriptAsync(script))
                    .done(() => done());
                }),
                HTML.mkButton(lf("create new script"), () => {
                    start();
                    Browser.TheHub.chooseScriptFromTemplateAsync()
                        .done(template => {
                            if (template) {
                                HTML.showProgressNotification(lf("creating script..."), true);
                                var headerGuid, scriptText;
                                TheEditor.newScriptAsync(template.source, template.name)
                                    .then(header => World.getInstalledScriptAsync(headerGuid = header.guid))
                                    .then(text => { scriptText = text; return World.syncAsync(); })
                                    .then(() => TDev.Collab.startCollaborationAsync(headerGuid, scriptText, this.parent.publicId))
                                    .then(() => World.syncAsync())
                                    .done(() => done());
                            }
                        });
                })
            ]);
        }
    }

    export class GroupUsersTab
        extends ListTab
    {
        constructor(par:GroupInfo)
        {
            super(par, "/users");
        }

        public getName() { return lf("users"); }
        public getId() { return "users"; }
        public bgIcon() { return "svg:Person"; }
        public noneText() { return lf("no users in this group!"); }

        public tabBox(cc:JsonIdObject):HTMLElement
        {
            var c = <JsonUser>cc;
            TheApiCacheMgr.store(c.id, c);
            var user = this.browser().getUserInfoById(c.id, c.name).mkSmallBox();
            if ((<GroupInfo>this.parent).isMine() && (<GroupInfo>this.parent).userid != c.id) {
                var removeBtn = null;
                user.appendChild(removeBtn = HTML.mkButton(lf("remove"), () => {
                    ModalDialog.ask(lf("Are you sure you want to remove this user from this group?"), lf("remove this user"), () => {
                        removeBtn.removeSelf();
                        HTML.showProgressNotification(lf("Removing user..."));
                        Cloud.deletePrivateApiAsync(c.id + "/groups/" + this.parent.publicId)
                            .done(() => {
                                user.removeSelf();
                            });
                    });
                }));
            }
            return user;
        }
    }

    export class GroupInfo
        extends BrowserPage {
        private name: string;
        public description: string;
        public userid:string;
        private collaborations: CollaborationsTab;

        constructor(par: Host) {
            super(par)
        }
        public persistentId() { return "group:" + this.publicId; }
        public getTitle() { return this.name || super.getTitle(); }

        public getName() { return lf("settings"); }
        public getId() { return "settings"; }
        public isMine() { return this.userid == Cloud.getUserId(); }

        public loadFromWeb(id: string) {
            Util.assert(!!id)
            this.publicId = id;
        }

        public groupPicture() {
            var icon = div('sdIcon');
            Browser.setInnerHTML(icon, TDev.Util.svgGravatar(this.publicId));
            return icon;
        }

        public mkBoxCore(big: boolean) {
            var icon = this.groupPicture();

            var nameBlock = dirAuto(div("sdName", this.name));
            var hd = div("sdNameBlock", nameBlock);

            var numbers = div("sdNumbers");
            var author = div("sdAuthorInner");
            var pubId = div("sdAddInfoOuter", div("sdAddInfoInner", "/" + this.publicId));
            var res = div("sdHeaderOuter", div("sdHeader", icon,
                div("sdHeaderInner", hd, pubId, div("sdAuthor", author), numbers, this.reportAbuse(big))));

            if (big)
                res.className += " sdBigHeader";

            return this.withUpdate(res, (u: JsonGroup) => {
                this.name = u.name;
                this.description = u.description;
                this.userid = u.userid;

                if (u.pictureid) {
                    icon.style.backgroundImage = HTML.cssImage('https://az31353.vo.msecnd.net/pub/' + u.pictureid);
                    icon.style.backgroundRepeat = 'no-repeat';
                    icon.style.backgroundPosition = 'center';
                    icon.style.backgroundSize = 'contain';
                    icon.setChildren([]);
                }

                nameBlock.setChildren([u.name]);
                dirAuto(nameBlock);

                var cont = [];
                var addNum = (n: number, sym: string) => { cont.push(ScriptInfo.mkNum(n, sym)) }
                addNum(u.positivereviews, "♥");
                addNum(u.comments, "✉");
                /* if (big) {
                    addNum(u.subscribers, "svg:Person,black,clip=80");
                } */
                numbers.setChildren(cont);
                author.setChildren([u.username]);
            });
        }

        public mkTile(sz: number) {
            var d = div("hubTile hubTileSize" + sz);
            d.style.background = ScriptIcons.stableColorFromName(this.publicId);
            d.appendChild(div("hubTileSearch", HTML.mkImg("svg:group,white")));

            return this.withUpdate(d, (u: JsonGroup) => {
                this.name = u.name;
                if (u.pictureid) {
                    d.style.backgroundImage = HTML.cssImage('https://az31353.vo.msecnd.net/pub/' + u.pictureid);
                    d.style.backgroundRepeat = 'no-repeat';
                    d.style.backgroundPosition = 'center';
                    d.style.backgroundSize = 'cover';
                }
                var cont = [];
                //var addNum = (n: number, sym: string) => { cont.push(ScriptInfo.mkNum(n, sym)) }
                //addNum(u.receivedpositivereviews, "♥");

                var nums = div("hubTileNumbers", cont, div("hubTileNumbersOverlay"));

                d.setChildren([
                    div("hubTileSearch", HTML.mkImg("svg:group,white")),
                    div("hubTileTitleBar",
                    div("hubTileTitle", spanDirAuto(this.name)),
                    div("hubTileSubtitle",
                        div("hubTileAuthor", spanDirAuto(u.username), nums)))])
            });
            return d;
        }

        public thumbnail() {
            if (!this.publicId) return div(null);
            var icon = this.groupPicture();
            var nameBlock = div("sdThumbName", this.name);
            var thumb = div("sdThumb", icon, nameBlock);

            thumb.withClick(() => {
                this.browser().loadDetails(this);
            });

            if (!this.name) {
                this.withUpdate(nameBlock, (u: JsonGroup) => {
                    this.name = u.name;
                    nameBlock.setChildren([u.name]);
                });
            }

            thumb.style.cursor = "pointer";

            return thumb;
        }

        public mkTabsCore(): BrowserTab[] {
            var tabs: BrowserTab[] = [
                new CommentsTab(this, () => this.isMine(), (el) => this.updateCommentsHeader(el)),
                new GroupUsersTab(this),
                this.collaborations = new CollaborationsTab(this),
                new GroupUserProgressTab(this),
                this
            ];
            return tabs;
        }

        public addScriptAsync(script : ScriptInfo) : Promise{
            if (!script) return Promise.as();

            return ProgressOverlay.lockAndShowAsync(lf("adding script to group..."))
                  .then(() => script.getScriptTextAsync())
                  .then(text => TDev.Collab.startCollaborationAsync(script.getGuid(), text, this.publicId))
                  .then(sessionid => {
                    if (sessionid) {
                        Editor.updateEditorStateAsync(script.getGuid(), (st) => {
                            st.collabSessionId = sessionid;
                            st.groupId = this.publicId;
                        })
                    }
                  })
                  .then(() => World.syncAsync())
                  .then(() => Cloud.postCommentAsync(this.publicId, lf("Script ``{0:q}`` was added to the group.", script.getTitle())))
                  .then(() => ProgressOverlay.hide(), e => { ProgressOverlay.hide(); throw e;});
        }

        private updateCommentsHeader(el : HTMLElement) {
            this.withUpdate(el, (u: JsonGroup) => {
                el.setChildren([Host.expandableTextBox(u.description)]);
                if (!this.isMine()) {
                    Cloud.getPrivateApiAsync(Cloud.getUserId() + "/groups/" + this.publicId)
                        .done(() => {}, e => {
                            if (!u.isrestricted)
                                el.appendChild(div('', HTML.mkButton(lf("join group"), () => { tick(Ticks.groupJoin); this.joinGroupDirect(); })));
                    });
                }
             });
        }

        public initTab() {
            var ch = this.getTabs().map((t: BrowserTab) => t == this ? null : <HTMLElement>t.inlineContentContainer);
            var authorDiv = div('inlineBlock');
            var ad = div("wall-div-buttons");
            var hd = div("sdDesc");
            var remainingContainer = div(null);
            ch.unshift(remainingContainer);
            ch.unshift(ad);
            ch.unshift(hd);

            var authorDiv = div("inlineBlock");
            remainingContainer.setChildren([authorDiv]);

            this.tabContent.setChildren(ch);

            this.withUpdate(hd, (u: JsonGroup) => {
                var membership = div('');
                hd.setChildren([membership]);

                var uid = this.browser().getCreatorInfo(u);
                authorDiv.setChildren([ScriptInfo.labeledBox(lf("owner"), uid.mkSmallBox())]);

                ad.setChildren([]);
                if (this.isMine()) {
                    ad.appendChild(HTML.mkButton(lf("change picture"), () => {
                        tick(Ticks.groupChangePicture);
                        this.changePictureAsync().done(() => this.browser().loadDetails(this, "settings"));
                    }));
                    if(u.isrestricted) {
                        Cloud.getPrivateApiAsync(this.publicId + "/code")
                            .done((r : Cloud.ApiGroupCodeResponse ) => {
                                if (r.code && r.expiration > Date.now() / 1000) {
                                    var input = HTML.mkTextInput("text", lf("invitation code"));
                                    // readonly does not pop keyboard on mobile
                                    input.value = r.code;
                                    input.onchange = () => { input.value = r.code };
                                    var codeDiv = div('',
                                        div('', lf("join by invitation only"), Editor.mkHelpLink("groups")),
                                        div('sdExpandableText',
                                            lf("To join, users can enter the invitation code in the search or navigate to "),
                                            HTML.mkA('', 'http://tdev.ly/' + r.code, '_blank', 'http://tdev.ly/' + r.code)),
                                        input
                                    );
                                    hd.appendChild(codeDiv);
                                } else {
                                    hd.appendChild(div('', lf("This group is locked.")));
                                    hd.appendChild(div('sdExpandableText', lf("There is no active invitation code. Tap 'new invitation code' to generate a code that will allow users to join immediately (the new code will be valid 14 days). Tap 'allow anyone to join' to allow any user to join without registration code.")));
                                }
                                ad.appendChild(HTML.mkButton(lf("new invitation code"), () => {
                                    tick(Ticks.groupCodeNew);
                                    HTML.showProgressNotification(lf("requesting new invitiation code..."));
                                    this.newInvitationCodeAsync().done(() => this.browser().loadDetails(this, "settings"));
                                }));
                                ad.appendChild(HTML.mkButton(lf("allow anyone to join"), () => { tick(Ticks.groupAllowAnyoneToJoin); this.allowAnyoneToJoin(); }));
                                ad.appendChild(HTML.mkButton(lf("delete group"), () => { tick(Ticks.groupDelete); this.deleteGroup(); }));
                            });
                    } else {
                        hd.appendChild(div('', lf("This group is open.")));
                        hd.appendChild(div('sdExpandableText', lf("Anyone can join this group without permissions.")));
                        ad.appendChild(HTML.mkButton(lf("require invitation code"), () => { tick(Ticks.groupRequireInvitationCodeToJoin); this.requireInvitationCodeToJoin(); }));
                        ad.appendChild(HTML.mkButton(lf("delete group"), () => { tick(Ticks.groupDelete); this.deleteGroup(); }));
                    }
                }

                Cloud.getPrivateApiAsync(Cloud.getUserId() + "/groups/" + this.publicId)
                    .done(() => {
                        if(this.isMine()) {
                            //membership.appendChild(div('', 'You are the owner of this group. '));
                        } else {
                            membership.appendChild(div('', 'You are a member of this group.'));
                            ad.appendChild(HTML.mkButton(lf("leave group"), () => { tick(Ticks.groupLeave); this.leaveGroup(); }));
                        }
                    }, e => {
                        membership.appendChild(div('', 'You are not a member of this group.'));
                        if (!u.isrestricted)
                            ad.appendChild(HTML.mkButton(lf("join group"), () => { tick(Ticks.groupJoin); this.joinGroupDirect(); }));
                    });

                if (u.allowexport)
                    remainingContainer.appendChild(div('sdExpandableText',
                        lf("group owner can export your scripts to app."),
                        Editor.mkHelpLink("groups")));
                if (u.allowappstatistics)
                    remainingContainer.appendChild(div('sdExpandableText',
                        lf("group owner has access to runtime statistics of exported apps."),
                        Editor.mkHelpLink("groups")));
            });
        }

        public addProjectAsync(): Promise {
            this.collaborations = new CollaborationsTab(this);
            return new Promise((onSuccess, onError, onProgress) => {
                var m = new ModalDialog();
                m.onDismiss = () => onSuccess(undefined);
                var buttons = div('wall-dialog-buttons');
                this.collaborations.setCollaborationButtons(buttons,
                    () => {
                        m.onDismiss = undefined;
                        m.dismiss();
                    },
                    () => onSuccess(undefined));
                m.add(div('wall-dialog-header', lf("add scripts to your group")));
                m.add(div('wall-dialog-body', lf("Group scripts can be edited by multiple group users at the same time. You can add or remove projects any time you want.")));
                m.add(buttons);
                m.show();
            });
        }

        public changePictureAsync(): Promise {
            return Meta.chooseArtPictureAsync({ title: lf("change your group picture"), initialQuery: "group" })
                .then((a: JsonArt) => {
                    if (a) return this.updateGroupPictureAsync(a.id);
                    return Promise.as(undefined);
                });
        }

        public allowAnyoneToJoin() {
            this.restrictGroup(false);
        }

        public requireInvitationCodeToJoin() {
            this.restrictGroup(true);
        }

        private joinGroupDirect() {
            HTML.showProgressNotification(lf("Joining group..."));
            Cloud.postPrivateApiAsync(Cloud.getUserId() + "/groups/" + this.publicId, {})
                .done(() => {
                    this.invalidateCaches();
                    this.browser().loadDetails(this);
            });
        }

        private updateGroupPictureAsync(pictureid : string) : Promise {
            HTML.showProgressNotification(lf("Updating group picture..."));
            return Cloud.postPrivateApiAsync(this.publicId, { pictureid : pictureid })
                .then(() => { this.invalidateCaches(); });
        }

        private restrictGroup(restricted : boolean) {
            HTML.showProgressNotification(lf("Updating group access..."));
            Cloud.postPrivateApiAsync(this.publicId, { isrestricted : restricted })
                .done(() => {
                    this.invalidateCaches();
                    this.browser().loadDetails(this);
            });
        }

        public newInvitationCodeAsync() {
            return Cloud.postPrivateApiAsync(this.publicId + "/code", <Cloud.ApiGroupCodeRequest>{})
                .then((r: Cloud.ApiGroupCodeResponse) => {
                    this.invalidateCaches();
                    return r.code;
                });
        }

        public resetInvitationCode() {
            HTML.showProgressNotification(lf("clearing invitiation code..."));
            Cloud.deletePrivateApiAsync(this.publicId + "/code")
                .done(() => {
                    this.invalidateCaches();
                    this.browser().loadDetails(this);
                });
        }

        public deleteGroup() {
            ModalDialog.ask(lf("Are you sure you want to delete this group? There is no undo for this operation."), lf("delete group"), () => {
                HTML.showProgressNotification(lf("deleting group..."));
                Cloud.deletePrivateApiAsync(this.publicId)
                    .done(() => {
                        this.invalidateCaches();
                        Util.setHash("list:groups");
                    });
            });
        }

        public leaveGroup() {
            ModalDialog.ask(lf("Are you sure you want to leave this group?"), lf("leave group"), () => {
                HTML.showProgressNotification(lf("leaving group..."));
                Cloud.deletePrivateApiAsync(Cloud.getUserId() + "/groups/" + this.publicId)
                    .done(() => {
                        this.invalidateCaches();
                        TheEditor.historyMgr.reload(HistoryMgr.windowHash());
                    });
            });
        }

        private invalidateCaches() {
            TheApiCacheMgr.invalidate("groups");
            TheApiCacheMgr.invalidate(Cloud.getUserId() + "/groups");
            TheApiCacheMgr.invalidate(this.publicId);
        }

        public match(terms: string[], fullName: string) {
            if (terms.length == 0) return 1;

            var json: JsonGroup = TheApiCacheMgr.getCached(this.publicId);
            if (!json) return 0; // not loaded yet

            var lowerName = json.name.toLowerCase();
            var r = IntelliItem.matchString(lowerName, terms, 10000, 1000, 100);
            if (r > 0) {
                if (lowerName.replace(/[^a-z0-9]/g, "") == fullName)
                    r += 100000;
                return r;
            }
            var s = lowerName + " " + this.publicId + " " + json.description;
            return IntelliItem.matchString(s.toLowerCase(), terms, 100, 10, 1);
        }
    }


    export class ForumInfo
        extends BrowserPage {

        constructor(par: Host) {
            super(par)
            this.publicId = "theForum";
        }
        public persistentId() { return "forum:forum"; }
        public getTitle() { return "Forum"; }

        public getId() { return "overview"; }
        public getName() { return lf("overview"); }

        public mkBoxCore(big:boolean):HTMLElement { return div("hubSectionHeader", spanDirAuto(lf("the forums"))) }

        public mkTabsCore(): BrowserTab[] {
            var tabs: CommentsTab[] = [
                new CommentsTab(this),
                new CommentsTab(this),
                new CommentsTab(this)
            ];

            tabs[0].forumName = lf("general");
            tabs[0].forumId = "bttt";

            tabs[1].forumName = lf("issues");
            tabs[1].forumId = "atljilhp";

            tabs[2].forumName = lf("everything");
            tabs[2].forumId = "";

            return tabs;
        }

        public initTab() {
        }
    }


    export class RunBucketInfo
        extends BrowserPage
    {

        constructor(par: Host) {
            super(par)
        }

        public persistentId() { return "runbucket:" + this.publicId; }
        public getTitle() { return "bucket " + this.publicId; }

        public getId() { return "overview"; }
        public getName() { return lf("overview"); }

        public loadFromWeb(id: string) {
            this.publicId = id;
        }

        public mkBoxCore(big: boolean) {
            var nameBlock = div("sdName");
            var hd = div("sdNameBlock", nameBlock);
            var author = div("dsAuthor");

            var icon = div("sdIcon", HTML.mkImg("svg:trash,white"));
            icon.style.background = "#ccff00";

            var numbers = div("sdNumbers");
            var addInfoInner = div("sdAddInfoInner", "/" + this.publicId);
            var pubId = div("sdAddInfoOuter", addInfoInner);
            var res = div("sdHeaderOuter", div("sdHeader", icon, div("sdHeaderInner", hd, pubId, numbers)));

            if (big)
                res.className += " sdBigHeader";

            return this.withUpdate(res, (u: JsonRunBucket) => {
                nameBlock.setChildren([u.error || lf("unknown error")]);
                dirAuto(nameBlock);
                author.setChildren(["-- ", u.username]);
                addInfoInner.setChildren([Util.timeSince(u.time) + lf(" on ") + u.publicationname]);

                var cont = <any[]>[];
                var addNum = (n: number, sym: string) => { cont.push(ScriptInfo.mkNum(n, sym)) }
                addNum(u.runs, "runs");
                addNum(u.cumulativeruns, "total");
                numbers.setChildren(cont);
            });
        }

        public mkTile(sz: number) {
            var d = div("hubTile hubTileSize" + sz);
            return this.withUpdate(d, (u: JsonRunBucket) => {

                var cont = [];
                var addNum = (n: number, sym: string) => { cont.push(ScriptInfo.mkNum(n, sym)) }
                addNum(u.runs, "runs");
                addNum(u.cumulativeruns, "total");

                var nums = div("hubTileNumbers", cont, div("hubTileNumbersOverlay"));
                //nums.style.background = d.style.background;

                d.setChildren([div("hubTileIcon", HTML.mkImg("svg:callout,white")),
                               div("hubTileTitleBar",
                                   div("hubTileTitle", "on " + spanDirAuto(u.publicationname)),
                                     div("hubTileSubtitle",
                                        div("hubTileAuthor", spanDirAuto(u.username), nums)))])
            });
            return d;
        }

        public initTab() {
            var ch = this.getTabs().map((t: BrowserTab) => t == this ? null : t.inlineContentContainer);
            var hd = div("sdDesc");
            var desc = "This is the view of a bucket. A bucket is a group of similar runs that cause crashes. View our crash root cause analysis in the coverage tab."
            ch.unshift(hd);

            this.tabContent.setChildren(ch);

            this.withUpdate(this.tabContent, (c: JsonRunBucket) => {
                hd.setChildren([div("sdTabDescription", desc), Host.expandableTextBox(c.error)]);
            });
        }

        public mkTabsCore(): BrowserTab[]{
            return [this, new RunsTab(this), new CommentsTab(this), new RunBucketCodeCoverageUnionTab(this)];
        }

        public match(terms: string[], fullName: string) {
            if (terms.length == 0) return 1;

            var json: JsonRunBucket = TheApiCacheMgr.getCached(this.publicId);
            if (!json) return 0; // not loaded yet

            var s = this.publicId + " " + json.publicationid + " " + json.username + " " + json.error;
            return IntelliItem.matchString(s.toLowerCase(), terms, 100, 10, 1);
        }

        public mkSmallBox(): HTMLElement {
            return this.mkBoxCore(false).withClick(() => {
                var json = TheApiCacheMgr.getCached(this.publicId);
                if (!json || json.nestinglevel == 0) this.parentBrowser.loadDetails(this)
                else this.parentBrowser.loadDetails(this.parentBrowser.getRunBucketInfoById(json.id));
            });
        }


    }

    export class RunBucketCodeCoverageUnionTab
        extends RunsTab {
        constructor(par: RunBucketInfo) {
            super(par)
        }
        public getId() { return "coverage"; }
        public getName() { return lf("coverage"); }
        private bucketInfo() { return <RunBucketInfo>(this.parent); }
        public bgIcon() {
            return "svg:Globe";
        }

        private scriptPromise: Promise;
        private runMaps: { union: IStringSet; intersection: IStringSet; } = { union: null, intersection: null };
        private stacks: { tops: IStringSet; full: IStringSet; } = { tops: null, full: null };

        public getTileContent(c: string): any[]{
            return BrowserMultiTab.generateReplacementTileContents(this);
        }

        private openScriptInEditor(scriptId: string, annotator: ScriptDebuggingBugginessAnnotator) {
            var doEdit = () => {
                tickArg(Ticks.coverageOpenInEditor, "bucket");
                this.browser().getScriptInfoById(scriptId).editAsync().then(() => {
                    RunInfo.prepareScript(Script);
                    if (annotator)
                    {
                        annotator.dispatch(Script);
                        TheEditor.refreshScriptNav();
                        new ScriptBugginessFeatureSurvey().addTo(TheEditor.getSpyManager());
                        if (annotator.topRatedId) TheEditor.goToLocation(CodeLocation.fromNodeId(annotator.topRatedId));
                        else TheEditor.refreshDecl();
                    }
                }).done();
            }

            if (!this.browser().getInstalledByPubId(scriptId)) {
                ModalDialog.ask("To open the script in editor, you need to install it first. Continue and install the script?",
                    "OK", doEdit);
            } else doEdit();
        }

        public initTab() {
            tickArg(Ticks.coverageShown, "bucket");
            var count = 0;
            var loadingDiv = div('bigLoadingMore', 'loading...');
            var statusDiv = div('', '');
            var desc = "Here you can see the root cause analysis results. Red colors represent areas that are more likely to be connected to the crash";
            this.tabContent.setChildren([div("sdTabDescription", desc), loadingDiv, statusDiv]);
            var progress = (done: boolean) => {
                if (loadingDiv) {
                    loadingDiv.removeSelf();
                    loadingDiv = undefined;
                }
                if (!done)
                    Browser.setInnerHTML(statusDiv, "loading... " + count + " runs found so far");
                else if (count)
                    Browser.setInnerHTML(statusDiv, count + " runs used for root cause analysis");
                else
                    Browser.setInnerHTML(statusDiv, "root cause analysis not available for this script");
            };
            // this is a curried pseudo-recursive function
            var loader = (currentCont: string = null) => () => this.loadMoreElementsAnd(currentCont, (runs: JsonRun[], cont: string) => {
                if (runs.length == 0) {
                    progress(true);
                    return;
                } else {
                    progress(false);
                }

                count += runs.length;
                var scriptId = runs[0].publicationid;
                var errorMessage = runs[0].error;

                if (!this.scriptPromise) {
                    this.scriptPromise = this.
                        browser().
                        getScriptInfoById(scriptId).
                        getScriptTextAsync().
                        then((scriptText: string) => {
                            if (!scriptText) return;
                            var app = AST.Parser.parseScript(scriptText);
                            AST.TypeChecker.tcScript(app);
                            AST.Compiler.annotateWithIds(app);
                            return app;
                        });
                }

                var timer2load = TDev.RT.Perf.start("bucketCoverage:loadingNetwork");

                this.scriptPromise.then((ast: AST.App) => {
                    if (!ast) {
                        progress(true);
                        Browser.setInnerHTML(statusDiv, "could not get script info; are you offline?");
                        return;
                    }
                    var accum = TDev.accumulateRunMaps(
                        runs.map(json => <IRun><any>{ stack: json.stack, runmap: RunBitMap.fromJSON(json.runmap) }),
                        ast,
                        this.runMaps.union,
                        this.runMaps.intersection);
                    this.runMaps = accum;

                    var accStacks = TDev.accumulateStacks(
                        runs.map(json => <IRun><any>{ stack: json.stack, runmap: RunBitMap.fromJSON(json.runmap) }),
                        ast,
                        this.stacks.tops,
                        this.stacks.full);
                    this.stacks = accStacks;

                    var normalCoveragePromise = TDev.getNormalCoverageAsync(scriptId, ast, AST.Compiler.version);

                    return normalCoveragePromise.then(normal => {

                        TDev.RT.Perf.stop(timer2load);

                        var timer2analyze = TDev.RT.Perf.start("bucketCoverage:analysis");
                        var smallSlice = new SmallBackSlicer(setToArray(this.stacks.tops).map(it => < AST.Stmt > ast.findAstNodeById(it).node), this.runMaps.union).doit();
                        TDev.RT.Perf.stop(timer2analyze);

                        var annotator = new ScriptDebuggingBugginessAnnotator(normal, this.runMaps, this.stacks, smallSlice, errorMessage);
                        annotator.dispatch(ast);

                        var renderer = new EditorRenderer();
                        var elts = renderer.declDiv(ast);

                        this.tabContent.appendChild(div(null, HTML.mkButton(lf("open in editor"), () => this.openScriptInEditor(scriptId, annotator))));
                        this.tabContent.appendChild(elts);

                        if (cont && cont != currentCont) {
                            Util.setTimeout(Browser.isWebkit ? 100 : 1, loader(cont));
                        } else {
                            progress(true);
                        }
                    });
                }).done(undefined, e =>
                {
                    progress(true);
                    Browser.setInnerHTML(statusDiv, "root cause analysis not available; are you offline?");
                });
            });

            loader()(); // this is intended.
        }
    }

    export class RunInfo
        extends BrowserPage {

        constructor(par: Host) {
            super(par)
        }

        public persistentId() { return "run:" + this.publicId; }
        public getTitle() { return "run " + this.publicId; }

        public getId() { return "overview"; }
        public getName() { return lf("overview"); }

        private scriptId: string;
        public getScriptIdAsync() {
            if (this.scriptId) return Promise.as(this.scriptId);
            else return TheApiCacheMgr.getAsync(this.publicId).then((daRun: JsonRun) => (this.scriptId = daRun.publicationid));
        }
        public loadFromWeb(id: string, scriptId: string) {
            this.publicId = id;
            this.scriptId = scriptId;
        }

        static prepareScript(script: AST.App) {
            AST.TypeChecker.tcScript(script);
            AST.Compiler.annotateWithIds(script);
            return script;
        }

        static openScriptInEditor(host: Host, scriptId: string, runBitMap: RunBitMap, stackTrace: IPackedStackTrace, errorMessage: string, profilingData: AST.ProfilingDataCollection) {
            var doEdit = (si:ScriptInfo) => {
                if (!si)
                    si = host.getScriptInfoById(scriptId)
                si.editAsync().then(() => {
                    RunInfo.prepareScript(Script);
                    if (runBitMap || stackTrace)
                    {
                        new ScriptDebuggingAnnotator(runBitMap, stackTrace, errorMessage).dispatch(Script);
                        if (stackTrace) {
                            var fakeStackTrace = PackedStackTrace.toFakeStackTrace(stackTrace);
                            if (fakeStackTrace.length > 0) TheEditor.showStackTrace(fakeStackTrace);
                        }
                        else {
                            TheEditor.refreshDecl();
                        }
                    }
                    if (profilingData)
                    {
                        new ProfilingResultsAnnotator(profilingData).dispatch(Script);
                        TheEditor.refreshDecl();
                    }
                }).done();
            }

            if (/-/.test(scriptId)) {
                var si = host.getInstalledByGuid(scriptId)
                doEdit(si)
            } else if (!host.getInstalledByPubId(scriptId)) {
                ModalDialog.ask("To open the script in the editor, you need to install the script first. Do you want to install the script?",
                    "OK", () => doEdit(null));
            } else doEdit(null);
        }

        public openInEditor() {
            tickArg(Ticks.coverageOpenInEditor, "run");
            TheApiCacheMgr.getAnd(this.publicId,(daRun: JsonRun) =>
                this.getScriptIdAsync().then( (scriptId: string) =>
                    RunInfo.openScriptInEditor(this.parentBrowser, scriptId, RunBitMap.fromJSON(daRun.runmap), daRun.stack, daRun.error, null)));
        }

        private _scriptASTPromise : Promise;
        public getScriptASTAsync() {
            if(!this._scriptASTPromise) {
                this._scriptASTPromise = this.getScriptIdAsync().then(scriptId => {
                    return this.parentBrowser.
                        getScriptInfoById(this.scriptId).
                        getScriptTextAsync().
                        then((scriptText: string) => {
                            if (!scriptText) return;
                            var app = AST.Parser.parseScript(scriptText);
                            AST.TypeChecker.tcScript(app);
                            AST.Compiler.annotateWithIds(app);
                            return app;
                        });
                }, () => undefined);
            }
            return this._scriptASTPromise;
        }

        private mkIcon() {
            var icon = div("sdIcon", HTML.mkImg("svg:fire,white"));
            icon.style.background = "#ffcc00";
            return icon;
        }

        public mkBoxCore(big: boolean) {
            var nameBlock = div("sdName");
            var hd = div("sdNameBlock", nameBlock);
            var author = div("dsAuthor");

            var icon = this.mkIcon();

            var numbers = div("sdNumbers");
            var addInfoInner = div("sdAddInfoInner", "/" + this.publicId);
            var pubId = div("sdAddInfoOuter", addInfoInner);
            var res = div("sdHeaderOuter", div("sdHeader", icon, div("sdHeaderInner", hd, pubId, numbers)));

            if (big)
                res.className += " sdBigHeader";

            return this.withUpdate(res, (u: JsonRun) => {
                nameBlock.setChildren([u.error || lf("unknown error")]);
                dirAuto(nameBlock);
                author.setChildren([u.anonymous? lf("anonymous") : u.username]);
                addInfoInner.setChildren([Util.timeSince(u.time) + lf(" on ") + u.publicationname]);
            });
        }

        private innerMkSmallBox() {
            var nameBlock = div("sdName");
            var hd = div("sdNameBlock", nameBlock);

            var icon = div("sdIcon", HTML.mkImg("svg:fire,white"));
            icon.style.background = "#ffcc00";

            var addInfoInner = div("sdAddInfoInner", ":: /" + this.publicId);
            var pubId = div("sdAddInfoOuter", addInfoInner);
            var res = div("sdHeaderOuter", div("sdHeader", icon, div("sdHeaderInner", hd, pubId)));

            return this.withUpdate(res, (u: JsonRun) => {
                nameBlock.setChildren([Util.timeSince(u.time)]);
                dirAuto(nameBlock);
                addInfoInner.appendChild(span(null, " by " + (u.anonymous ? "someone" : Util.htmlEscape(u.username))));
                addInfoInner.appendChild(span(null, !!u.runmap ? " (with coverage data) " : " (no coverage data)"));

                if (!u.anonymous) {
                    icon.setChildren([this.browser().getUserInfoById(u.userid, u.username).userPicture()]);
                    icon.style.background = "#ffffff";
                }

                //var delBtn: HTMLElement = null;
                //function deleteCmt() => {
                //    if (Cloud.isOffline()) {
                //        Cloud.showModalOnlineInfo('could not delete run');
                //        return;
                //    }
                //    ModalDialog.ask("are you sure you want to delete this run?", "delete it", () => {
                //        delBtn.setFlag("working", true);
                //        Util.httpRequestAsync(Cloud.getPrivateApiUrl(u.id), "DELETE", undefined).then(() => {
                //            res.removeSelf();
                //        }, (e: any) => {
                //            delBtn.setFlag("working", false);
                //            World.handlePostingError(e, "delete run");
                //        }).done();
                //    });
                //}

                //if (u.userid == Cloud.getUserId()) {
                //    delBtn = div("sdCmtBtn", HTML.mkImg("svg:Trash,#000"), "delete").withClick(deleteCmt);
                //}

                //var likeBtn = div("sdCmtBtnOuter");
                //function setLikeBtn(s: number, f: () => void ) {
                //    var btn: HTMLElement;
                //    if (s < 0)
                //        btn = div("sdCmtBtn", HTML.mkImg("svg:wholeheart,#000"), "add")
                //    else
                //        btn = div("sdCmtBtn", HTML.mkImg("svg:wholeheart,#a00"), "remove")
                //    if (Math.abs(s) < 2) btn.setFlag("working", true);
                //    likeBtn.setChildren([btn.withClick(f)]);
                //}
                //ScriptInfo.setupLike(u.id, setLikeBtn);

                //addInfoInner.appendChild(div("sdCmtBtns", likeBtn, delBtn));
            });
        }

        public mkTile(sz: number) {
            var d = div("hubTile hubTileSize" + sz);
            return this.withUpdate(d, (u: JsonRun) => {

                var cont = [];
                var addNum = (n: number, sym: string) => { cont.push(ScriptInfo.mkNum(n, sym)) }

                var nums = div("hubTileNumbers", cont, div("hubTileNumbersOverlay"));
                //nums.style.background = d.style.background;

                d.setChildren([div("hubTileIcon", HTML.mkImg("svg:callout,white")),
                               div("hubTileTitleBar",
                                     div("hubTileTitle", "on " + spanDirAuto(u.publicationname)),
                                     div("hubTileSubtitle",
                                        div("hubTileAuthor", spanDirAuto(u.username), nums)))])
            });
            return d;
        }

        public initTab() {
            var ch = this.getTabs().map((t: BrowserTab) => t == this ? null : t.inlineContentContainer);
            var hd = div("sdDesc");
            ch.unshift(hd);

            this.tabContent.setChildren(ch);

            this.withUpdate(this.tabContent, (c: JsonRun) => {
                hd.setChildren([
                    div(null, "bucket: ", this.browser().getRunBucketInfoById(c.bucketid).mkSmallBox()),
                    c.anonymous ? null : div(null, "user: ", this.browser().getUserInfoById(c.userid, c.username).mkSmallBox()),
                    div(null, "script: ", this.browser().getScriptInfoById(c.publicationid).mkSmallBox()),
                    div(null, Host.expandableTextBox(ScriptInfo.userPlatformDisplayText(c.userplatform)))
                ]);
            });
        }

        public mkTabsCore(): BrowserTab[] {
            return [this, new RunCodeCoverageTab(this), new StackTraceTab(this), new CommentsTab(this)];
        }

        public match(terms: string[], fullName: string) {
            if (terms.length == 0) return 1;

            var json: JsonRunBucket = TheApiCacheMgr.getCached(this.publicId);
            if (!json) return 0; // not loaded yet

            var s = this.publicId + " " + json.publicationid + " " + json.username + " " + json.error;
            return IntelliItem.matchString(s.toLowerCase(), terms, 100, 10, 1);
        }

        public mkSmallBox(): HTMLElement {
            return this.innerMkSmallBox().withClick(() => {
                var json = TheApiCacheMgr.getCached(this.publicId);
                if (!json || json.nestinglevel == 0) this.parentBrowser.loadDetails(this)
                else this.parentBrowser.loadDetails(this.parentBrowser.getRunInfoById(json.id, json.publicationid));
            });
        }


    }

    export class CommentInfo
        extends BrowserPage
    {
        constructor(par:Host) {
            super(par)
            this._comments = new CommentsTab(this);
        }
        public persistentId() { return "comment:" + this.targetId(); }
        public getTitle() { return "comment " + this.publicId; }

        public getId() { return "comment"; }
        public getName() { return lf("comment"); }

        public loadFromWeb(id:string)
        {
            this.publicId = id;
        }

        public mkBoxCore(big:boolean)
        {
            var icon = div("sdIcon", HTML.mkImg("svg:email,white"));
            icon.style.background = "#1731B8";
            var textBlock = div("sdCommentBlockInner");
            var author = div("sdCommentAuthor");
            var hd = div("sdCommentBlock", textBlock, author);

            var numbers = div("sdNumbers");
            var addInfoInner = div("sdAddInfoInner", "/" + this.publicId);
            var pubId = div("sdAddInfoOuter", addInfoInner);
            var res = div("sdHeaderOuter", div("sdHeader", icon, div("sdHeaderInner", hd, pubId, numbers, this.reportAbuse(big))));

            if (big)
                res.className += " sdBigHeader";

            return this.withUpdate(res, (u:JsonComment) => {
                textBlock.setChildren([ u.text ]);
                author.setChildren(["-- ", u.username]);
                addInfoInner.setChildren([Util.timeSince(u.time) + " on " + u.publicationname]);
                if (u.publicationname == "general discussion" || u.publicationname == "bug reports and feature requests") {
                    icon.setChildren([HTML.mkImg("svg:callout,white")])
                    icon.style.background = "#080";
                }
                if (u.resolved) {
                    var ic = CommentsTab.bugStatuses[u.resolved]
                    if (ic && ic.icon)
                        icon.setChildren([HTML.mkImg("svg:" + ic.icon + ",white")])
                }

                var cont = <any[]>[];
                var addNum = (n:number, sym:string) => { cont.push(ScriptInfo.mkNum(n, sym)) }
                addNum(u.positivereviews, "♥");
                addNum(u.comments, "replies");
                numbers.setChildren(cont);
            });
        }

        public mkTile(sz:number)
        {
            var d = div("hubTile hubTileSize" + sz);
            return this.withUpdate(d, (u:JsonComment) => {

                var cont = [];
                var addNum = (n:number, sym:string) => { cont.push(ScriptInfo.mkNum(n, sym)) }
                addNum(u.positivereviews, "♥");
                addNum(u.comments, lf("replies"));

                var nums = div("hubTileNumbers", cont, div("hubTileNumbersOverlay"));
                //nums.style.background = d.style.background;

                d.setChildren([div("hubTileIcon", HTML.mkImg("svg:callout,white")),
                               div("hubTileTitleBar",
                                     div("hubTileTitle", "on " + spanDirAuto(u.publicationname)),
                                     div("hubTileSubtitle",
                                        div("hubTileAuthor", spanDirAuto(u.username), nums)))])
            });
            return d;
        }

        public initTab()
        {
            this._comments.initElements();
            this._comments.tabLoaded = true;
            this._comments.initTab();

            this.withUpdate(this.tabContent, (c:JsonComment) => {
                this.tabContent.setChildren([
                    ScriptInfo.labeledBox(lf("comment on"), this.browser().getReferencedPubInfo(c).mkSmallBox()),
                    this._comments.commentBox(c, true)]);
            });
        }

        public mkBigBox():HTMLElement { return null; }

        private _comments:CommentsTab;

        public mkTabsCore():BrowserTab[] { return [this]; }

        public bugCompareTo(other:CommentInfo, order:string) {
            var j0:JsonComment = TheApiCacheMgr.getCached(this.publicId)
            var j1:JsonComment = TheApiCacheMgr.getCached(other.publicId)
            if (j0)
                if (j1) {
                    return (order == "recent" ? 0 :
                                (j1.positivereviews - j0.positivereviews) ||
                                (j1.comments - j0.comments)) ||
                           (j1.time - j0.time)
                } else return -1;
            else if (j1) return 1;
            else return 0;
        }

        public match(terms:string[], fullName:string)
        {
            if (terms.length == 0) return 1;

            var json:JsonComment = TheApiCacheMgr.getCached(this.publicId);
            if (!json) return 0; // not loaded yet

            var s = this.publicId + " " + json.publicationid + " " + json.username + " " + json.text;
            return IntelliItem.matchString(s.toLowerCase(), terms, 100, 10, 1);
        }

        public mkSmallBox():HTMLElement
        {
            return this.mkBoxCore(false).withClick(() => {
                var json = TheApiCacheMgr.getCached(this.publicId);
                if (!json || json.nestinglevel == 0) this.parentBrowser.loadDetails(this)
                else this.parentBrowser.loadDetails(this.parentBrowser.getCommentInfoById(json.publicationid));
            });
        }

        private targetId():string
        {
            var json = TheApiCacheMgr.getCached(this.publicId);
            if (!json || json.nestinglevel == 0) return this.publicId;
            else return json.publicationid;
        }

    }

    export class TopicInfo
        extends BrowserPage
    {
        public topic:HelpTopic;

        constructor(par:Host) {
            super(par)
        }
        public persistentId() { return (this.topic.fromJson ? "script:" : "topic:") + this.publicId; }
        public getTitle() { return this.topic.json.name; }
        public getId() { return "overview"; }
        public getName() { return lf("overview"); }

        public mkBigBox():HTMLElement { return null; }

        public loadFromTopic(topic:HelpTopic)
        {
            this.topic = topic;
            this.publicId = MdComments.shrink(topic.id);
        }

        static mk(t:HelpTopic) {
            var r = new TopicInfo(TheHost);
            r.loadFromTopic(t);
            return r;
        }

        public mkTabsCore(): BrowserTab[] {
            return [
             this
            ];
        }

        private getIconUrl() { return "svg:" + this.topic.json.icon + ",white"; }
        private getIcon() { return HTML.mkImg(this.getIconUrl()); }

        private likeBtn(showCount = false)
        {
            var likeBtn = div(null);
            var id = this.topic.json.id;
            if (!id) return likeBtn;

            var setLikeBtn = (s:number, h:string, f:()=>void) => {
                var btn:HTMLElement;
                var cntDiv = showCount ? div("sdDocsCount") : null;
                if (s < 0)
                    btn = div("sdDocsBtn", cntDiv, HTML.mkImg("svg:wholeheart,#000"), h)
                else
                    btn = div("sdDocsBtn", cntDiv, HTML.mkImg("svg:wholeheart,#EAC117"), h)
                if (Math.abs(s) < 2) btn.setFlag("working", true);
                likeBtn.setChildren([btn.withClick(f)]);
                if (showCount)
                    TheApiCacheMgr.getAnd(id, (s:JsonScript) => {
                        var n = this.topic.fromJson ? getScriptHeartCount(s) : s.cumulativepositivereviews
                        cntDiv.setChildren(n + "");
                    })
            }
            ScriptInfo.setupLike(id, setLikeBtn);
            return likeBtn;
        }

        public mkBoxCore(big:boolean):HTMLElement
        {
            if (this.topic.fromJson) {
                var r = this.browser().getScriptInfoById(this.topic.id).mkBoxExt(big, true);
                if (big) {
                    r.className += " sdDocsHeader";
                    r.appendChild(this.likeBtn(false));
                }
                return r;
            }

            var j = this.topic.json;

            var icon = div("sdIcon hubDocTile", this.getIcon());
            icon.style.background = j.iconbackground;
            var nameText = j.name
            if (!big) nameText = nameText.replace(/.*\u2192/, "\u2192")
            var nameBlock = dirAuto(div("sdName", nameText))
            var hd = div("sdNameBlock", nameBlock);
            var desc = div("sdTopicExpansion", dirAuto(div("sdTopicExpansionInner", (big && this.topic.isApiHelp()) ? "" : j.description)))
            var res = div("sdHeaderOuter",
                            div("sdHeader", icon, div("sdHeaderInner", hd, desc)));
            if (big) {
                res.className += " sdBigHeader sdDocsHeader";
                res.appendChild(this.likeBtn(true));
            } else {
                res.style.paddingLeft = (1 + 1.5 * this.topic.nestingLevel) + "em"
            }
            return res;
        }

        private commentsTab:CommentsTab;

        public getPublicationId() { return this.topic.json.id; }

        public initTab()
        {
            // TODO: locale support for docs
            var followDiv = div(null);
            var allBottomDiv = div(null)
            var allTopDiv = div(null)
            var noChromeDiv = div("sdInfoLink")
            var btn2 = null
            var btnShare = null

            if (!this.topic.fromJson) {
                Ticker.rawTick("browseTopic_" + this.topic.id);

                var t = this.topic

                if (t.parentTopic) {
                    var children = t.parentTopic.childTopics
                } else {
                    children = [t]
                }

                var idx = children.indexOf(t)
                if (idx < 0) idx = children.length // shouldn't happen
                children = children.slice(0, idx + 1).concat(t.childTopics).concat(children.slice(idx + 1))

                for (var pp = t; pp.parentTopic; pp = pp.parentTopic)
                    children.unshift(pp.parentTopic)

                this.browser().overrideSideList(children.map(TopicInfo.mk))
            }

            var id = this.getPublicationId();

            var viewAsScript = () => {
                var b = this.browser();
                b.treatAsScript[id] = true;
                b.loadDetails(b.getScriptInfoById(id));
            }
            var shareAsScript = () => {
                if (id) {
                    var b = this.browser();
                    b.getScriptInfoById(id).share();
                }
            }

            if (id) {
                Ticker.tick(Ticks.coreRun, id)
                var btn = HTML.mkButtonTick(lf("edit this topic"), Ticks.docsEdit, () => {
                    var m = new ModalDialog();
                    m.add(div('wall-dialog-header', lf("ready to edit this topic?")));
                    m.add(div('wall-dialog-body', lf("Once you are happy with your changes, publish the script and send a pull request to get your changes integrated."),
                        Editor.mkHelpLink("howtoeditthedocs", lf("read more..."))));
                    m.add(div('wall-dialog-buttons',
                        HTML.mkButton(lf("cancel"), () => m.dismiss()),
                        HTML.mkButton(lf("let's do it!"), () => {
                            m.dismiss();
                            var docInfo = this.browser().getScriptInfoById(this.topic.json.id)
                        if (docInfo) docInfo.edit();
                        })));
                    m.show();
                });

                btn2 = HTML.mkButton(lf("view as script"), viewAsScript)
                btnShare = HTML.mkButton(lf("share"), shareAsScript);
                noChromeDiv.setChildren([
                    HTML.mkLinkButton(lf("share"), shareAsScript),
                    HTML.mkLinkButton(lf("view as script"), viewAsScript)])
            }
            var btn3 = HTML.mkButton(lf("print"), () => this.topic.print())
            //var docsList = div("sdRelatedContainer", div("sdLoadingMore", lf("loading...")));
            var rnd = this.topic.render(TopicInfo.attachCopyHandlers);

            allTopDiv.style.display = "none";
            allBottomDiv.style.display = "none";
            noChromeDiv.style.display = "none"

            this.topic.initAsync().done(() => {
                var m = /[^`]\{docflags:([^}]*)\}/i.exec(this.topic.json.text)
                var viewTop = true
                var viewBottom = true

                if (m) {
                    var processFlag = (f:string) => {
                        f = f.toLowerCase()
                        if (f == "noheader") viewTop = false
                        if (f == "nosocial") viewBottom = false
                        if (f == "nochrome") {
                            processFlag("noheader")
                            processFlag("nosocial")
                        }
                    }
                    m[1].split(/,\s*/).forEach(processFlag)
                }

                allTopDiv.style.display = viewTop ? "block" : "none";
                allBottomDiv.style.display = viewBottom ? "block" : "none";
                noChromeDiv.style.display = !viewBottom ? "block" : "none";

                //if (allBottomDiv.style.display != "none")
                //    this.renderRelatedTopics(docsList);

                if (/[^`]\{template:(\w+)\}/.test(this.topic.json.text)) {
                    var d = div("sdBottomButtons", [
                        HTML.mkButton(lf("follow tutorial in editor"), () => {
                            tick(Ticks.browseFollowTopic)
                            this.follow()
                        }),
                        HTML.mkButton(lf("share"), shareAsScript)
                    ])
                    d.style.fontSize = "1.2em";
                    followDiv.setChildren([d]);
                }
            })

            var requestDocs = null

            if (this.topic.isBuiltIn) {
                requestDocs = this.needMore();
            }

            var comments = div(null)
            if (id) {
                if (!this.commentsTab) {
                    this.commentsTab = new CommentsTab(this);
                    this.commentsTab.initElements();
                }
                comments.setChildren([
                    div("sdHeading", lf("comments")),
                    this.commentsTab.topContainer(),
                    this.commentsTab.tabContent])
            }

            allBottomDiv.setChildren([
                div("sdBottomButtons", btnShare, btn, btn3, btn2,
                  Editor.mkHelpLink("how to edit the docs", lf("about editing docs"))
                  ),
                //div(null, div("sdHeading inlineBlock", lf("related docs"))
                  // , Editor.mkHelpButton("add your own docs", "adding docs")
                //),
                //docsList,
                comments,
                requestDocs
            ])

            allTopDiv.setChildren([ super.mkBigBox() ])

            this.tabContent.setChildren([
                allTopDiv,
                followDiv,
                rnd,
                noChromeDiv,
                allBottomDiv
            ])
            if (this.commentsTab)
                this.commentsTab.initTab();
        }

        private needMore()
        {
            if (!Cloud.getUserId()) return null;

            var topDiv = div("sdVotingButtons", lf("Loading voting device; watch this space."))

            var update = () => {
                var id0 = "docs/" + this.topic.id
                var id1 = Cloud.getUserId() + "/docs/" + this.topic.id
                var btn0:HTMLElement, btn1:HTMLElement;

                var vote = (good) => () => {
                    btn0.setFlag("disabled", true);
                    btn1.setFlag("disabled", true);
                    topDiv.setFlag("working", true);
                    Util.httpPostJsonAsync(Cloud.getPrivateApiUrl(id0),
                                           { sufficient: good ? 1 : 0, insufficient: good ? 0 : 1 })
                    .done((resp) => {
                        TheApiCacheMgr.invalidate(id0)
                        TheApiCacheMgr.invalidate(id1)
                        update();
                        if (!good) Browser.Hub.askToEnableNotifications();
                    }, (e) => World.handlePostingError(e, "vote on docs"));
                }

                topDiv.setFlag("working", false);
                Promise.join([TheApiCacheMgr.getAsync(id0), TheApiCacheMgr.getAsync(id1)]).done((results) => {
                    btn0 = HTML.mkDisablableButton(lf("I need more docs"), vote(false));
                    btn1 = HTML.mkDisablableButton(lf("this is good enough"), vote(true));
                    var all = results[0]
                    var me = results[1]

                    if (me.sufficient) btn1.setFlag("disabled", true);
                    else if (me.insufficient) btn0.setFlag("disabled", true);

                    topDiv.setChildren([
                        div(null, btn1,
                            all.sufficient == 0 ? lf("No one said so yet.") :
                            me.sufficient && all.sufficient == 1 ? lf("You said so.") :
                            me.sufficient ? Util.fmt("You and {0} other{0:s} are happy with it.", all.sufficient - 1)
                                          : Util.fmt("{0} user{0:s} are happy with it.", all.sufficient)),
                        div(null, btn0,
                            all.insufficient == 0 ? lf("No one said so yet.") :
                            me.insufficient && all.insufficient == 1 ? ("You said so.") :
                            me.insufficient ? Util.fmt("You and {0} other{0:s} need more.", all.insufficient - 1)
                            : Util.fmt("{0} user{0:s} need more.", all.insufficient)),
                    ])
                })
            }
            update();

            return topDiv;
        }

        public match(terms:string[], fullName:string)
        {
            if (terms.length == 0) return 1;

            if (!this.topic) return 0;

            var name = this.topic.json.name;

            var lowerName = name.replace(/.*\u200A\u2192\u00A0/, "").toLowerCase();
            var r = IntelliItem.matchString(name.toLowerCase() + " " + this.topic.json.description.toLowerCase(), terms, 10000, 1000, 100);
            if (r > 0) {
                if (lowerName.replace(/[^a-z0-9]/g, "") == fullName)
                    r += 100000;
                r -= lowerName.length/10;
            } else {
                r = IntelliItem.matchString(this.topic.forSearch(), terms, 10, 1, 0.1);
            }

            if (this.topic.isApiHelp()) r *= 0.7;

            return r;
        }

        public showInList()
        {
            return this.topic.json.priority < 10000;
        }

        private renderExample(parent:TopicInfo)
        {
            var c = this.topic.fromJson;
            if (!c) return this.topic.render(() => {}); // shouldn't really happen

            var uid = this.browser().getCreatorInfo(c);
            var title = this.topic.json.name;
            var r = div("sdCmt sdRelated", uid.thumbnail(),
                        div("sdCmtTopic",
                            title.replace(/\s*\d*$/, "") == parent.topic.json.name.replace(/\s*\d*$/, "")
                              ? null
                              : span("sdBold", title + " "),
                            "by ",
                            span("sdBold", c.username)),
                        div("sdRelatedBody", this.topic.render(() => {})),
                        div("sdCmtMeta",
                                Util.timeSince(c.time),
                                //c.positivereviews > 0 ? " " + c.positivereviews + "♥ " : null,
                                c.comments > 0 ? " " + c.comments + " comments " : null,
                                span("sdCmtId", " :: /" + c.id),
                            div("sdRelatedBtns", HTML.mkButton(lf("open"), () => {
                                var b = this.browser();
                                b.loadDetails(b.getScriptInfoById(c.id));
                            }))),
                        this.likeBtn(true)
                        );
            return r;
        }

        static isWorthwhile(e:JsonScript)
        {
            return getScriptHeartCount(e) * 20 + e.userscore >= 60;
        }

        private renderRelatedTopics(target:HTMLElement)
        {
            if (this.topic.hashTags().length == 0) {
                target.setChildren([div("sdLoadingMore", lf("no #tags; this is strange"))]);
                return;
            }

            var apiPath = "scripts?applyupdates=true&etagsmode=includeetags&count=100&q=" + encodeURIComponent("~@jeiv ");
            apiPath += encodeURIComponent(this.topic.hashTags().join(" "));

            TheApiCacheMgr.getAndEx(apiPath, (lst:JsonList, opts:DataOptions) => {
                var isDefinitive = !opts || opts.isDefinitive;

                var ch = []
                var numTotal = 0;
                var hidden:JsonScript[] = []
                var shown:JsonScript[] = []
                var ignored = 0;

                lst.items.forEach((e:JsonScript, i:number) => {
                    var etag = lst.etags ? lst.etags[i].ETag : ""
                    TheApiCacheMgr.store(e.id, e, etag);
                    if (etag && isDefinitive) TheApiCacheMgr.validate(e.id, etag);

                    // same script?
                    if (e.id == this.topic.id) return;
                    if (e.id == this.topic.json.id) return;

                    numTotal++;

                    if (!TopicInfo.isWorthwhile(e)) {
                        hidden.push(e);
                    } else {
                        shown.push(e);
                    }
                });

                var cmpTopic = (a:JsonScript, b:JsonScript) => getScriptHeartCount(b) - getScriptHeartCount(a) || b.runs - a.runs;
                shown.sort(cmpTopic);
                hidden.sort(cmpTopic);

                var maxTopics = 5;
                if (shown.length > maxTopics) {
                    hidden = shown.slice(maxTopics).concat(hidden);
                    shown = shown.slice(0, maxTopics);
                }

                var showMore = () => {
                    this.browser().searchFor(this.topic.hashTags().join(" "));
                }

                var render = (e:JsonScript) => {
                    var ti = TopicInfo.mk(HelpTopic.fromJsonScript(e))
                    return ti.renderExample(this);
                }

                var searchRelated = div(null,
                    HTML.mkButton(lf("search all related"), () => {
                        this.browser().searchFor(this.topic.hashTags().join(" "));
                    }))

                ch.pushRange(shown.map(render));

                if (hidden.length > 0) {
                    ch.push(div("sdLoadingMore", lf("unrated topics found; give them hearts to expand them by default!")));
                    var moreDiv = div(null,
                        HTML.mkButton(lf("show unrated topics"), () => {
                            var ch = hidden.map(render);
                            ch.push(searchRelated);
                            moreDiv.setChildren(ch)
                        }))
                    ch.push(moreDiv)
                } else if (numTotal == 0) {
                    ch.push(div("sdLoadingMore", lf("nothing here yet; you can add some yourself!")))
                } else {
                    ch.push(searchRelated);
                }

                target.setChildren(ch);
                // lst.continuation
            })
        }

        static attachCopyHandlers(e:HTMLElement):void
        {
            var elts = e.getElementsByClassName("copy-button")
            for (var i = 0; i < elts.length; ++i) {
                (() => {
                    var e = <HTMLElement>elts[i]
                    e.withClick(() => {
                        TheEditor.clipMgr.copy({
                            type: e.getAttribute("data-type"),
                            data: e.getAttribute("data-data"),
                            scriptId: (Script ? Script.localGuid : Util.guidGen()),
                            isCut: false
                        })
                    })
                })()
            }
            MdComments.attachVideoHandlers(e, false);
            if (TheEditor.canReplyTutorial()) {
                var elts = e.getElementsByClassName("stepid")
                for (var i = 0; i < elts.length; ++i) {
                    (() => {
                        var e = <HTMLElement>elts[i]
                        var n = parseInt(e.textContent)
                        e.appendChild(HTML.mkLinkButton(lf("rewind"), () => TheEditor.replyTutorial(n)))
                    })()
                }
            }

            Util.toArray(e.getElementsByTagName("a")).forEach((ae: HTMLAnchorElement) => {
                TopicInfo.loadTutorialTileAsync(ae.href)
                .then(t => {
                    if (t) {
                        ae.parentNode.insertBefore(t, ae)
                        ae.removeSelf()
                    }
                })
            })
        }

        static loadTutorialTileAsync(href: string): Promise {
            var m;
            if (m = /#hub:follow-tile:(\w+)$/.exec(decodeURIComponent(href)))
                return Promise.as(Browser.TheHub.tutorialTile(m[1], (h) => { }))
            else if (m = /#topic-tile:(\w+)$/.exec(decodeURIComponent(href)))
                return Promise.as(Browser.TheHub.topicTile(m[1], "More"));
            else if (m = /#pub:(\w+)$/.exec(decodeURIComponent(href)))
                return TheApiCacheMgr.getAsync(m[1], true)
                    .then((d : JsonPublication) => {
                        if (!d) return undefined;
                        if (d.kind == "script" && (<JsonScript>d).updateid != d.id)
                            return TheApiCacheMgr.getAsync((<JsonScript>d).updateid, true);
                        else return Promise.as(d);
                    }).then(pub => {
                        var details = TheHost.getAnyInfoByEtag(pub);
                        return details ? details.mkSmallBox() : undefined;
                    });
            else
                return Promise.as(undefined);
        }

        static defaultTutorialTemplate =
           "meta version 'v2.2';\n" +
           "meta name 'tutorial playground';\n" +
           'meta allowExport "yes";\n' +
           "action main {\n" +
           "}";

        static defaultTutorialAppTemplate =
            "meta version 'v2.2,js,ctx,refs,localcloud,unicodemodel,allasync';\n" +
            "meta name 'tutorial app playground';\n" +
            'meta allowExport "yes";\n' +
            "#main\n" +
            "action main(\\u2756: * main_page_data) {\n" +
            "  if box→is_init then { skip; }\n" +
            "  if true then { skip; }\n" +
            "  meta page;\n" +
            "}\n" +
            "#mainpagedata\n" +
            "table main_page_data {\n" +
            "  type = 'Object';\n" +
            "  persistent = false;\n" +
            "}\n";

        static defaultScriptPluginTemplate =
            'meta version "v2.2,js,ctx,refs,localcloud,unicodemodel,allasync";\n' +
            'meta name "plugin playground";\n' +
            'meta allowExport "yes";\n' +
            'meta platform "current";\n' +
            '// #scriptPlugin\n' +
            '#plugin action plugin(ed: Editor) {\n' +
            '}\n';

        static getAwesomeAdj():string
        {
            if (!TopicInfo.awesomeAdj)
                TopicInfo.awesomeAdj = (
                    lf("amazing, astonishing, astounding, awe-inspiring, awesome, breathtaking, classic, cool, curious, distinct, exceptional, exclusive, extraordinary, fabulous, fantastic, glorious, great, ") +
                    lf("incredible, magical, marvellous, marvelous, mind-blowing, mind-boggling, miraculous, peculiar, phenomenal, rad, rockin', special, spectacular, startling, stunning, super-cool, ") +
                    lf("superior, supernatural, terrific, unbelievable, unearthly, unique, unprecedented, unusual, weird, wonderful, wondrous")
                    ).split(/\s*[,،、]\s*/)
            return Random.pick(TopicInfo.awesomeAdj)
        }

        static awesomeAdj:string[] = null

        static followTopic(topic:HelpTopic, tutorialMode = "")
        {
            topic.initAsync()
                .done((topicApp) => {
                    if (!Cloud.getUserId() && topicApp.usesCloud()) {
                        Hub.loginToCreate(topicApp.getName(), "hub:follow:" + topic.json.id)
                        return
                    }

                    if (topic.isBuiltIn)
                        Ticker.rawTick("startTutorial_" + topic.id);

                    var m = /[^`]\{template:(\w+)\}/.exec(topic.json.text);
                    var justFollow = () => {
                        TheHost.showHub();
                        TheEditor.followTopic(topic);
                    }
                    var startNew = () => {
                        var text = !m || m[1] == "empty" ? Promise.as(TopicInfo.defaultTutorialTemplate) :
                            m[1].toLowerCase() == "emptyapp" ? Promise.as(TopicInfo.defaultTutorialAppTemplate) :
                            m[1].toLowerCase() == "emptyscriptplugin" ? Promise.as(TopicInfo.defaultScriptPluginTemplate) :
                            TheApiCacheMgr.getAsync(m[1]).then((jscript:JsonScript) => {
                                return ScriptCache.getScriptAsync(jscript.updateid || m[1]);
                            })
                        if (!m)
                            HTML.showWarningNotification("missing {template:empty} in the tutorial")
                        text.done((t) => {
                            if (!t) {
                                ModalDialog.info("template missing", "the script template /" + m[1] + " couldn't be retrived");
                                return;
                            }

                            var app = AST.Parser.parseScript(t);
                            var n = app.getName().replace(/ template$/, "")
                            m = /[^`]\{templatename:([^{}]+)\}/i.exec(topic.json.text);
                            if (m) n = m[1].replace(/ADJ/g, () => TopicInfo.getAwesomeAdj())
                            else n = TopicInfo.getAwesomeAdj() + " app";

                            var str = app.serialize()

                            if (app.libraries().length == 0)
                                topicApp.libraries().forEach(l => {
                                    str += l.serialize()
                                })
                            // Tutorials are TD-specific, not for external
                            // editors.
                            var stub: World.ScriptStub = {
                                editorName: "touchdevelop",
                                scriptText: str,
                                scriptName: n,
                            };
                            TheHost.openNewScriptAsync(stub).done(() => {
                                TheEditor.followTopic(topic, true, tutorialMode);
                            })
                        })
                    }

                    if (false && TheHost.backToEditor) {
                        if (!m) {
                            justFollow();
                        } else {
                            ModalDialog.askMany(lf("use template?"),
                                                lf("do you want to follow the tutorial using your existing script or start a new script, as the tutorial author intended?"),
                                                { "use existing": justFollow,
                                                  "start new":  startNew })
                        }
                    } else {
                        startNew();
                    }
                });
        }

        public follow()
        {
            Util.log("follow() on Topic")
            TopicInfo.followTopic(this.topic)
        }
    }

    HelpTopic.getScriptAsync = World.getAnyScriptAsync;

    export module Showcase {
        export interface Entry {
            id:string;
            status:string;
            reason:string;
            info:string;
            score:number;
            stars:string;
            json:JsonScript;
        }

        var cache:Entry[];
        var cacheById:StringMap<Entry> = {}
        var statusCache:StringMap<string> = {}
        var serviceUrl = "https://tdshowcase.azurewebsites.net/api/"

        var listCached = false;

        export function snapshotCacheAsync(storage:any)
        {
            var l = localStorage["showcaseIds"]
            if (l) storage.showcaseIds = JSON.parse(l)
            return Promise.as()
        }

        export function restoreCacheAsync(storage:any)
        {
            if (storage.showcaseIds)
                localStorage["showcaseIds"] = JSON.stringify(storage.showcaseIds)
            return Promise.as()
        }

        export function getShowcaseIds(f:(ids:string[])=>void)
        {
            var cached = localStorage["showcaseIds"]
            if (cached)
                f(JSON.parse(cached).ids)
            if (listCached) return
            listCached = true
            Util.httpGetTextAsync("https://tdshowcase.blob.core.windows.net/export/current.json?nocache=" + Util.guidGen())
                .done(text => {
                    if (text != cached) {
                        localStorage["showcaseIds"] = text
                        f(JSON.parse(text).ids)
                    }
                })
        }

        export function getListAsync(days:number)
        {
            if (cache)
                return Promise.as(cache)

            return Promise.join([
                    Util.httpGetJsonAsync(serviceUrl + "scripts?days=" + days),
                    Util.httpGetJsonAsync(serviceUrl + "showcase_ids")
                ])
                .then(resps => {
                    resps[1].items.forEach(k => statusCache[k] = "showcase")
                    cache = resps[0].items
                    cache.forEach(c => {
                        cacheById[c.id] = c
                    })
                    return cache
                })
        }

        export function mgmtMode()
        {
            return !!cache
        }

        export function isIn(id:string)
        {
            return statusCache[id] == "showcase"
        }

        export function isIgnored(id:string)
        {
            return statusCache[id] == "ignore"
        }

        export function getStars(id:string)
        {
            var ent = cacheById[id]
            if (ent) return ent.stars
            return ""
        }

        export function setStatusAsync(id:string, status:string)
        {
            return getTokenAsync()
                .then(tok => Util.httpPostRealJsonAsync(serviceUrl + "set_status",
                                    { id: id, status: status, access_token: tok }))
                .then(resp => {
                    if (cache) {
                        var ent = cacheById[id]
                        if (ent) {
                            ent.status = status
                            ent.reason = "web"
                        }
                    }
                    statusCache[id] = status
                    HTML.showProgressNotification(lf("status updated"))
                    return resp
                })
        }

        function getTokenAsync()
        {
            var tok = localStorage["showcase_access_token"]
            if (tok) return Promise.as(tok)
            return TDev.RT.EditorServices.getTokenAsync("TouchDevelop Showcase Management")
                .then(tok => {
                    localStorage["showcase_access_token"] = tok
                    return tok
                })
        }

        export function snapshotAsync()
        {
            return getTokenAsync()
                .then(tok => Util.httpPostRealJsonAsync(serviceUrl + "snapshot",
                                    { access_token: tok }))
                .then(resp => {
                    listCached = false
                    return resp ? resp.info : "bad response"
                })
        }
    }


} }
