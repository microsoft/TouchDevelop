///<reference path='refs.ts'/>

module TDev { export module Browser {

    export var TheHub:Hub;

    export interface ScriptTemplate {
        title: string;
        id: string;
        scriptid:string;
        //tick: Ticks; automatically generated
        icon: string;
        description: string;
        name: string;
        source: string;
        section: string;
        editorMode: number;
        caps?: string;
        baseId?: string;
        baseUserId?: string;
        requiresLogin?: boolean;
    }

    interface ITutorial {
        title: string;
        // Represents the progress of the script corresponding to that tutorial
        header?: Cloud.Header;
        // The tutorial per se (the terminology in the source code refers to
        // "topic")
        topic: HelpTopic;
        // The app that contains the tutorial
        app?: AST.App;
    }

    export module EditorSoundManager
    {
        var sounds : any = {};

        export var keyboardSounds = /sounds/.test(window.location.href);
        export function intellibuttonClick() { if (keyboardSounds) playSound('aonptkth'); }
        export function scoreUp() { playSound('sjmgbwrv'); }
        export function tutorialStepNew() { playSound('ncoqavnw', 1); }
        export function tutorialStepFinished() { playSound('sjmgbwrv', 1); }
        export function tutorialStart() { playSound('sjmgbwrv', 1); }

        export function startTutorial() {
            //keyboardSounds = true;
            // caching
            //TDev.RT.Sound.fromArtId('aonptkth').done(undefined, () => {});
            tutorialStart();
            TDev.RT.Sound.fromArtId('ncoqavnw').done(undefined, () => {});
        }

        function playSound(id : string, volume : number = 0.2)
        {
            var snd = <TDev.RT.Sound>sounds[id];
            if(snd) snd.playAsync().done();
            else {
                TDev.RT.Sound.fromArtId(id).done(s => {
                    sounds[id] = s;
                    if (s) {
                        s.set_volume(volume);
                        s.playAsync().done();
                    }
                }, e => {});
            }
        }
    }

    export class Hub
        extends Screen {
        constructor () {
            super()
            this.topContainer = div(null, this.logo, this.meBox, this.notificationBox, this.facebookLikeContainer, this.dingDingBox);
            this.topBox = div(null, this.topContainer);
            this.theRoot = div("hubRoot", this.bglogo, this.mainContent, this.topBox);
            this.templates = HelpTopic.scriptTemplates.filter(t => isBeta || !t.betaOnly);
            this.templates.forEach((t) => {
                t.source = HelpTopic.shippedScripts[t.scriptid]
            })
        }
        private facebookLikeContainer = div("hubFacebookLike");
        private mainContent = div("hubContent");
        private logo = div("hubLogo", SVG.getTopLogo());
        private bglogo = div("hubBgLogo", HTML.mkImg("svg:touchDevelop,black"));
            // private bglogo2 = div("hubBgLogo2", HTML.mkImg("svg:touchDevelop,#B9F594"));
        private meBox = div("hubMe");
        private notificationBox = div("notificationBox");
        private dingDingBox = div("dingDingBox");
        private topBox: HTMLElement;
        private topContainer: HTMLElement;
        private theRoot: HTMLElement;
        private visible = false;
        private notificationsCount = -1;
        private showingIntro = false;

        private historyMode = false;
        public vertical = true;

        private afterSections:()=>void = null;

        public screenId() { return "hub"; }

        public init() {
            this.theRoot.style.display = "none";
            this.theRoot.id = "hubRoot";
            this.theRoot.appendChild(Editor.mkBetaNote());
            elt("root").appendChild(this.theRoot);
            this.logo.withClick(() => {
                tick(Ticks.hubAbout);
                Hub.showAbout();
            });
            if (!Browser.mobileWebkit)
                this.mainContent.addEventListener("scroll", () => this.paralax())
            ArtUtil.setupDragAndDrop(document.body);
        }

        public keyDown(e: KeyboardEvent) {
            var s = Util.keyEventString(e);
            if (s && !e.ctrlKey && !e.metaKey) {
                this.hide();
                this.browser().initialSearch = s;
                this.browser().showList("search", null);
                return true;
            }
            return false;
        }

        private paralax() {
            if (this.vertical) {
                var dx = -this.mainContent.scrollTop / 10;
                Util.setTransform(this.bglogo, "translate(0px," + dx + "px)")
            } else {
                var dx = -this.mainContent.scrollLeft / 10;
                Util.setTransform(this.bglogo, "translate(" + dx + "px, 0px)")
            }
        }

        private show() {
            if (!this.visible) {
                this.theRoot.style.display = "block";
                this.visible = true;
                currentScreen = this;
                setGlobalScript(null);
                TheEditor.historyMgr.setHash("hub", "");

                if (Cloud.isOnline() && this.facebookLikeContainer.childNodes.length == 0)
                    this.facebookLikeContainer.setChildren([
                        TDev.RT.ShareManager.facebookLike("TouchDevelop - create apps everywhere, on all your devices!", Cloud.getServiceUrl(), "http://www.facebook.com/touchdevelop")
                    ]);

                Host.tryUpdate();

                if (!Cloud.isAccessTokenExpired())
                    TestMgr.runBetaTests();
            }
        }

        public hide() {
            if (this.visible) {
                TipManager.setTip(null);
                this.theRoot.style.display = "none";
                this.visible = false;
            }
            World.cancelContinuouslySync();
        }

        public applySizes() {
            if (!this.showingIntro)
                this.updateSections();
        }

        public syncDone() {
            this.updateSections();
            World.continuouslySyncAsync(false, () =>
                this.showSectionsCoreAsync(true));
        }

        private browser(): Host { return TheHost; }

        static legacyTemplateIds:StringMap<string> = {
            turtle: "firststepswithturtle",
            bouncingmonster: "monsterslicertutorial",
            soundboard: "soundboardtutorial",
            lovemenot: "lovemenottutorial",
            fallingrocks: "fallingrockstutorial",
            popper: "bubblepoppertutorial",
            bubbles: "bouncingbubbleswalkthrough",
            shaker: "songshakertutorial",
            tapmania: "tapmaniatutorial",
            cutestvotingapp: "cutestvotingapptutorial",
            mapofthings: "mapofthingstutorial",
            acceleroturtle: "acceleroturtle",
            turtlestrianglespiral: "turtletrianglespiraltutorial",
            turtlefractals: "turtlefractalstutorial",
            turtletree: "turtletreetutorial",
            drawing: "firststepswithdrawing",
            pixels: "pixelstutorial",
            scratchdancingcat: "scratchcattutorial",
            scratchhideandseek: "hideandseekscratchtutorial",
            scratchpong: "scratchpongtutorial",
            quadraticequationsolver: "quadraticequationsolver",
            turtlesphero: "funwithspheroturtle",
            makeybeatbox: "makeymakeybeatboxtutorial",
            esploralevel: "esploraleveltutorial",
            small: "insanelyshorttutorial",
        }

        private newScriptHash(id:string, tutorialMode:string)
        {
            Util.log("newScriptHash: " + id + " tut:" + tutorialMode)

            if (Hub.legacyTemplateIds.hasOwnProperty(id))
                id = Hub.legacyTemplateIds[id]

            var t = this.templates.filter((s) => s.id == id)[0];
            var top = HelpTopic.findById(id)

            if (!top && !t) {
                Util.setHash("#")
                return
            }

            // do not run test suite in beta
            var betaFriendlyId = (<any>window).betaFriendlyId;
            if(betaFriendlyId)
                window.localStorage["betaTestsRunFor"] = betaFriendlyId;

            if (t) {
                this.createScriptFromTemplate(t);
            } else {
                this.tutorialsByUpdateIdAsync().done(tutorials => {
                    var h:AST.HeaderWithState = tutorials[top.updateKey()]
                    if (!h) {
                        TopicInfo.followTopic(top)
                        return
                    }
                    var st = h.editorState
                    ModalDialog.askMany(lf("resume tutorial?"),
                        "We have detected you already got " + ((st.tutorialStep || 0) + 1) +
                        (st.tutorialNumSteps ? " of " + (st.tutorialNumSteps + 1) : "") +
                        " trophies in this tutorial.",
                        { "start over": () => {
                                TopicInfo.followTopic(top, tutorialMode)
                           },
                           "resume my tutorial": () => {
                               this.browser().createInstalled(h).edit();
                           }
                        })
                })
            }
        }

        public loadHash(h: string[]) {
            TipManager.update();
            if (h[1] == "logout") {
                // we may be hosed enough that ModalDialog.ask doesn't work anymore
                if (window.confirm("Do you really want to sign out?\nAll your script data and any unsynchronized script changes will be lost.") == true) {
                    TheEditor.logoutAsync(false).done();
                    return;
                }
            }

            if (h[1] == 'new') {
                HistoryMgr.instance.setHash(this.screenId() + ":" + h[1] + ":" + h[2], null)
                this.newScriptHash(h[2], h[3]);
                return
            }

            if (h[1] == 'account-settings') {
                this.afterSections = () => Hub.accountSettings();
            }

            if (h[1] == 'settings') {
                this.afterSections = () => TheEditor.popupMenu();
            }

            if (h[1] == "install-run" && /^\w+$/.test(h[2])) {
                this.browser().clearAsync(true).done(() => {
                    var details = this.browser().getScriptInfoById(h[2])
                    details.run();
                })
                return
            }

            if ((h[1] == "follow" || h[1] == "follow-tile") && /^\w+$/.test(h[2])) {
                // temporary fix
                if (h[2] == 'jumpingbird') h[2] = 'jumpingbirdtutorial';
                this.browser().clearAsync(true)
                .done(() => {
                    // try finding built-in topic first
                    var bt = HelpTopic.findById(h[2]);
                    if (bt)
                        TopicInfo.mk(bt).follow();
                    else
                        TheApiCacheMgr.getAsync(h[2], true)
                            .done(j => {
                                if (j && j.kind == "script") {
                                    var ti = TopicInfo.mk(HelpTopic.fromJsonScript(j))
                                ti.follow();
                                } else Util.setHash("hub");
                            }, e => {
                                Util.setHash("hub");
                            });
                    });
                return;
            }

            this.showSections();

            switch(h[1]) {
                case "test":
                    TestMgr.testAllScripts();
                    break;
                case "singlebenchmark":
                    HistoryMgr.instance.setHash(this.screenId() + ":singlebenchmark", null)
                    if (!Cloud.isAccessTokenExpired())
                        TestMgr.Benchmarker.runTDBenchmarksWithDialog(false);
                    break;
                case "benchmarksuite":
                    HistoryMgr.instance.setHash(this.screenId() + ":benchmarksuite", null)
                    if (!Cloud.isAccessTokenExpired())
                        TestMgr.Benchmarker.runTDBenchmarksWithDialog(true);
                    break;
                case "joingroup":
                    var code = h[2];
                    HistoryMgr.instance.setHash(this.screenId() + ":joingroup:" + code, null)
                    Cloud.authenticateAsync(lf("joining groups"), false, true)
                        .done((auth) => {
                            if (auth) Browser.TheHost.joinGroup(code);
                        });
                    break;
                case "creategroup":
                    Util.log('creategroup received');
                    HistoryMgr.instance.setHash(this.screenId() + ":creategroup", null);
                    Cloud.authenticateAsync(lf("creating groups"), false, true)
                        .done((auth) => {
                            if (auth) this.createGroup();
                        });
                    break;
                case "androidgcm":
                    var regid = h[2];
                    var versionMinor = parseInt(h[3]);
                    var versionMajor = parseInt(h[4]);
                    Util.log('androidgcm: registering ' + regid + ':' + versionMinor + ':' + versionMajor);
                    HistoryMgr.instance.setHash(this.screenId() + ":androidgcm:" + regid + ':' + versionMinor + ':' + versionMajor, null)
                    localStorage["gcm"] = 1;
                    if (Cloud.isOffline()) {
                        Util.log('androidgcm: cancelled, offline');
                    } else {
                        Cloud.authenticateAsync(lf("receive Android notifications"), false, true)
                            .done((auth) => {
                                if (auth) {
                                    Cloud.postNotificationChannelAsync({
                                        subscriptionuri : 'androidgcm:' + regid,
                                        versionminor : versionMinor,
                                        versionmajor : versionMajor
                                    }).done(() => {
                                        Util.log('androidgcm: registered');
                                        Browser.Hub.askToEnableNotifications();
                                    }, e => {
                                        World.handlePostingError(e, "android notifications");
                                    });
                                } else {
                                    Util.log('androidgcm: cancelled, offline or not authenticated');
                                }
                            });
                    }
                    break;
                case "pub":
                    var id = h[2];
                    if (/^[a-z]{4,}/.test(id)) {
                        HistoryMgr.instance.setHash(this.screenId() + ":pub:" + h[2], null)
                        TheApiCacheMgr.getAsync(id, true)
                            .done((d) => {
                                var details = this.browser().getAnyInfoByEtag(d);
                                if (details)
                                    this.browser().loadDetails(details);
                            });
                    }
                    break;
                case "derive":
                    if (/^\w+$/.test(h[2])) {
                        HistoryMgr.instance.setHash(this.screenId() + ":derive:" + h[2], null)
                        if (!Cloud.isAccessTokenExpired())
                            ProgressOverlay.show("creating your script", () => {
                                Promise.join([
                                    TheApiCacheMgr.getAsync(h[2]),
                                    ScriptCache.getScriptAsync(h[2])
                                ]).done((arr) => {
                                    var scr:JsonScript = arr[0]
                                    var txt:string = arr[1]
                                    if (!scr || !txt) return;
                                    var t:ScriptTemplate = <any>{
                                        title: scr.name,
                                        id: "derive",
                                        scriptid: scr.id,
                                        icon: "",
                                        description: "",
                                        name: scr.name,
                                        source: txt,
                                        section: "",
                                        editorMode:0,
                                        baseId: scr.id,
                                        baseUserId: scr.userid,
                                    }
                                    ProgressOverlay.hide();
                                    this.createScriptFromTemplate(t);
                                })
                            })
                    }
                    break;
            }
        }

        private tileClick(t: HTMLElement, f: () =>void ) {
            t.withClick(() => {
                var p = Util.offsetIn(t, this.theRoot);
                t.style.left = p.x + "px";
                t.style.top = p.y + "px";
                t.removeSelf();
                this.theRoot.appendChild(t);
                Util.coreAnim("fadeSlide", 200, this.mainContent, () => {
                    t.removeSelf();
                    f();
                })
            });
        }

        private layoutTiles(c: HTMLElement, elements: HTMLElement[], noFnBreak = false) {
            var margin = 0.3;
            var maxHeight = 20;
            var rowWidth = 0;
            var maxY = 0;
            var x = 0;
            var y = 0;
            c.setChildren(elements);
            var beforeFirstFnBtn = elements.filter((e) => !(<any>e).fnBtn).peek();
            if (elements.some((e) =>(<any>e).tutorialBtn))
                beforeFirstFnBtn = elements.filter((e) => !(<any>e).tutorialBtn).peek();
            if (noFnBreak) beforeFirstFnBtn = null;

            var heightUnit = (7 + margin) / 2;
            elements.forEach((t: HTMLElement, i) => {
                t.style.left = x + "em";
                t.style.top = y + "em";
                var w = 7;
                var h = 2;
                if (/hubTileSize0/.test(t.className)) h = 1;
                if (/hubTileSize[23]/.test(t.className)) w = 11;
                if (/hubTileSize3/.test(t.className)) h = 4;
                h *= heightUnit;
                rowWidth = Math.max(rowWidth, w);
                y += h;
                maxY = Math.max(y, maxY);
                if (t == beforeFirstFnBtn || y > maxHeight || (elements[i+1] && (<any>elements[i+1]).breakBefore)) {
                    y = 0;
                    x += rowWidth + margin;
                    rowWidth = 0;
                }
            });
            c.style.height = maxY + 0.2 + "em";
        }

        private mkFnBtn(lbl: string, f: () =>void , t = Ticks.noEvent, modal = false, size = 1, ovrLbl = null) {
            var elt = div("hubTile hubTileBtn hubTileSize" + size,
                dirAuto(div("hubTileBtnLabel " + (
                    size <= 1 && Util.wordLength(lbl) > 10 ? " hubTileBtnLabelSmall" :
                    Util.wordLength(lbl) >= 7 || (size < 3 && lbl.length > 20) ? " hubTileBtnLabelMedium"
                    : ""), ovrLbl, lbl)));
            (<any>elt).fnBtn = 1;
            var f0 = () => { tick(t); f() };
            if (t)
                elt.id = "btn-" + Ticker.tickName(t)
            if (modal)
                elt.withClick(f0);
            else
                this.tileClick(elt, f0);
            return elt;
        }

        public tutorialScriptText =
           "meta version 'v2.2';\n" +
           "meta name 'SCRIPTNAME';\n" +
           "action main { }";

        private templates : ScriptTemplate[];

        private joinGroup(code : string = null) {
            this.browser().joinGroup(code);
        }

        private createGroup() {
            this.browser().createNewGroup();
        }

        static loginToCreate(name:string, hash:string)
        {
            var m = new ModalDialog();
            m.addHTML(
                Util.fmt("<h3>{0:q} requires sign&nbsp;in</h3>", name) +
                  "<p class='agree'>" +
                  "This tutorial uses cloud data which is shared with other users." +
                  "</p>" +
                  "<p class='agree'>You can sign in with your Microsoft, Google, Facebook or Yahoo account.</p>"
                )
            m.fullWhite();
            m.add(div("wall-dialog-buttons",
                HTML.mkButtonElt("wall-button login-button", SVG.getLoginButton()).withClick(() => {
                    Login.show(hash);
                })));
            m.show();
        }

        public createScriptFromTemplate(template: ScriptTemplate) {
            this.renameScriptFromTemplateAsync(template)
                .then(temp => {
                    if (temp)
                        return this.browser().openNewScriptAsync(temp.source, temp.name);
                    else
                        return Promise.as();
                })
                .done();
        }

        private renameScriptFromTemplateAsync(template:ScriptTemplate)  : Promise // of ScriptTemplate
        {
            if (!Cloud.getUserId() && template.requiresLogin) {
                Hub.loginToCreate(template.title, "hub:new:" + template.id)
                return Promise.as(undefined);
            }

            Ticker.rawTick('scriptTemplate_' + template.id);

            template = JSON.parse(JSON.stringify(template)); // clone template
            var name = template.name;
            if (name) name = name.replace(/ADJ/g, () => TopicInfo.getAwesomeAdj());
            var nameBox = HTML.mkTextInput("text", lf("Enter a script name..."));

            return this.browser()
                .updateInstalledHeaderCacheAsync()
                .then(() => new Promise((onSuccess, onError, onProgress) => {
                    nameBox.value = this.browser().newScriptName(name)
                    var m = new ModalDialog();
                    m.onDismiss = () => onSuccess(undefined);
                    m.add([
                        div("wall-dialog-header", lf_static(template.title, true)),
                        div("wall-dialog-body", lf_static(template.description, true)),
                        div("wall-dialog-line-textbox", nameBox),
                        //div("wall-dialog-body", lf("Tip: pick a good name for your script.")),
                        div("wall-dialog-buttons",
                            HTML.mkButton(lf("create"), () => {
                                m.onDismiss = undefined;
                                m.dismiss();
                                template.name = nameBox.value;
                                this.browser()
                                    .clearAsync(false)
                                    .done(() => onSuccess(template), e => onSuccess(undefined));
                        }))
                    ]);
                    m.show();
                }));
        }

        private getAvailableTemplates():ScriptTemplate[]
        {
            var editorMode = EditorSettings.editorMode();
            var currentCap = PlatformCapabilityManager.current();
            return this.templates
                .filter(template => {
                    if (template.editorMode > editorMode) return false;
                    if (!template.caps) return true;
                    else {
                        var plat = AST.App.fromCapabilityList(template.caps.split(/,/))
                        return (plat & currentCap) == plat;
                    }
                })
        }

        public tutorialsByUpdateIdAsync()
        {
            return this.browser().getTutorialsStateAsync().then((headers:AST.HeaderWithState[]) => {
                var res = {}
                headers.forEach(h => {
                    var id = h.editorState.tutorialUpdateKey
                    if (res.hasOwnProperty(id) && res[id].recentUse > h.recentUse)
                        return;
                    res[id] = h
                })
                return res
            })
        }

        private headerByTutorialId:Promise;
        private headerByTutorialIdUpdated:number;

        public topicTile(templateId:string, topDesc:string):HTMLElement
        {
            var tileOuter = div("tutTileOuter tutTileLink")

            var top = HelpTopic.findById("t:" + templateId)

            var tile = div("tutTile")
            tileOuter.setChildren([tile])

            tile.appendChildren([
                div("tutTileLinkLabel",
                    div("tutTileLinkMore", topDesc),
                    div("tutTileLinkTitle", top ? top.json.name : "[missing] " + templateId))
            ])

            tile.withClick(() => {
                Util.setHash("#topic:" + templateId)
            })

            return tileOuter
        }

        // From what I understand, finding a tutorial is all but an easy task.
        // There's a variety of steps involved which I tried to isolate in this
        // function...
        // - [headerByTutorialId] is a promise of a map from tutorial id (e.g.
        //   "t:codingjetpackjumper" to the corresponding [Cloud.Header])
        // - the result of this promise is considered good for three seconds
        //   only, and is renewed after that by re-assigning a fresh promise
        //   into the variable
        // - the result of a call to [HelpTopic.findById]...  may return a
        //   null-ish value in case the tutorial is not in the cache; if this is
        //   the case, we fetch the corresponding tutorial using [TheApiCacheMgr]
        //   and follow the succession of updates to the tutorial.
        // - once this is done, we call [finish]
        // - because we may have found the tutorial we wanted in the process, we
        //   return a new value for [top]
        private findTutorial(templateId: string, finish) {
            var top = HelpTopic.findById("t:" + templateId)

            if (!this.headerByTutorialId || Date.now() - this.headerByTutorialIdUpdated > 3000) {
                this.headerByTutorialId = this.tutorialsByUpdateIdAsync();
                this.headerByTutorialIdUpdated = Date.now()
            }

            if (top) {
                Promise.join([Promise.as(null), this.headerByTutorialId]).done(res => finish(res, top));
            } else {
                var fetchingId = null
                var fetchId = id => {
                    // Is the pointer structure of [updateid]'s expected to
                    // loop? I assume that we abort in this case?
                    if (fetchingId == id)
                        return;
                    fetchingId = id;
                    TheApiCacheMgr.getAnd(id, (j:JsonScript) => {
                        if (j.updateid && j.id !== j.updateid && j.updatetime > j.time)
                            fetchId(j.updateid);
                        else {
                            top = HelpTopic.fromJsonScript(j);
                            Promise.join([top.initAsync(), this.headerByTutorialId]).done(res => finish(res, top));
                        }
                    })
                }

                fetchId(templateId);
            }
        }

        // Start a tutorial, with an (optional) header that represents progress,
        // along with an optional function.
        private startTutorial(top: HelpTopic, header: Cloud.Header = null) {
            if (header) {
                this.browser().createInstalled(header).edit();
            } else {
                TopicInfo.followTopic(top);
            }
        }

        private findImgForTutorial(app: AST.App) {
            // XXX it seems that this function is actually unused as [app] is
            // always null?!!
            if (!app)
                return null;

            var findImg = t => app.resources().filter(r =>
                    r.getKind() == api.core.Picture &&
                    t.test(r.getName()) &&
                    /^http(s?):\/\/az31353.vo.msecnd.net\/pub\/\w+$/.test(r.url))[0];

            var img = findImg(/screenshot/) || findImg(/background/);

            return img;
        }

        public tutorialTile(templateId:string, f:(startFrom:Cloud.Header)=>void):HTMLElement
        {
            var tileOuter = div("tutTileOuter")

            var startTutorial = (top, header: Cloud.Header) => {
                Util.log("tutorialTile.start: " + templateId)
                if (f)
                    f(header);
                this.startTutorial(top, header);
            };

            var finish = (res, top: HelpTopic) => {
                var isHelpTopic = !!top;
                var tile = div("tutTile")
                tileOuter.setChildren([tile])

                var app:AST.App = res[0]
                var progs = res[1]

                var titleText = top.json.name.replace(/ (tutorial|walkthrough)$/i, "");
                var descText = top.json.description.replace(/ #(docs|tutorials|stepbystep)\b/ig, " ")
                descText = descText.replace(/\s+\.$/, "")

                var author = top.fromJson && top.fromJson.userid != "jeiv" ? top.fromJson.username : "TouchDevelop";
                var titleDiv;
                tileOuter.appendChildren([
                    div("tutDesc",
                      titleDiv = div("tutDescFirst",
                          div("tutDescTitle", titleText),
                          div(null, descText)),
                        div("tutAuthor", "by " + author).withClick(() => {
                            if (isHelpTopic)
                                Util.setHash("topic:" + templateId);
                            else
                                Util.setHash("script:" + top.json.id);
                        })
                    )
                ])

                var cap = AST.App.fromCapabilityList(top.json.platforms || [])
                if (cap & ~api.core.currentPlatform) {
                    tileOuter.appendChildren([
                        div("tutWarning", HTML.mkImg("svg:Warning,black"))
                    ])
                }


                var img = this.findImgForTutorial(app);
                var imgUrl = img ? img.url : top.json.screenshot;

                if (imgUrl) {
                    var picDiv = tile
                    picDiv.style.backgroundColor = '#eee';
                    picDiv.style.backgroundImage = HTML.cssImage(imgUrl);
                    picDiv.style.backgroundRepeat = 'no-repeat';
                    picDiv.style.backgroundPosition = 'center';
                    picDiv.style.backgroundSize = 'cover';
                } else {
                    tile.style.backgroundColor = top.json.iconbackground;
                    var icon = div("tutIcon");
                    icon.setChildren([HTML.mkImg("svg:" + top.json.icon + ",white")]);
                    tile.appendChildren([icon])
                }

                var continueHeader:Cloud.Header = null

                var id = top.updateKey()
                if (progs.hasOwnProperty(id)) {
                    var h:AST.HeaderWithState = progs[id]
                    continueHeader = h
                    var prog = h.editorState

                    var starSpan = span("bold", ((prog.tutorialStep || 0) + 1) + "★");
                    var ofSteps = prog.tutorialNumSteps ? " of " + (prog.tutorialNumSteps + 1) : ""
                    tile.appendChild(div("tutProgress",
                        ((prog.tutorialStep && (prog.tutorialStep == prog.tutorialNumSteps)) ?
                            div(lf("steps done"), lf("done!"), div("label", starSpan))
                            :
                            div("steps", starSpan, ofSteps,
                                            div("label", lf("tutorial progress")))),
                            div("restart", HTML.mkButton(lf("start over"), () => startTutorial(top, null)))))
                }

                titleDiv.withClick(() => startTutorial(top, continueHeader))
                tile.withClick(() => startTutorial(top, continueHeader))
            };

            this.findTutorial(templateId, finish);

            return tileOuter
        }

        private chooseEditor() {
            var gotoTemplate = () => {
                this.chooseScriptFromTemplateAsync()
                    .done(template => {
                        if (template) {
                            var stub: World.ScriptStub = {
                                editorName: "touchdevelop",
                                scriptName: template.name,
                                scriptText: template.source
                            };
                            this.browser().openNewScriptAsync(stub);
                        }
                    });
            };
            if (Cloud.lite)
                this.chooseEditorAsync().done((editor) => {
                    if (editor === undefined) {
                    } else if (editor != "touchdevelop") {
                        var stub: World.ScriptStub = {
                            editorName: editor,
                            scriptName: lf("{0} external script", TopicInfo.getAwesomeAdj()),
                            scriptText: "",
                        };
                        this.browser().openNewScriptAsync(stub);
                    } else {
                        gotoTemplate();
                    }
                })
            else
                gotoTemplate();
        }

        public chooseEditorAsync() : Promise { // of ScriptTemplate
            return new Promise((onSuccess, onError, onProgress) => {
                var m = new ModalDialog();
                m.onDismiss = () => onSuccess(undefined);

                var elts = [];
                externalEditors.concat([{
                    name: "TouchDevelop",
                    description: "The touch editor you love and know!",
                    id: "touchdevelop",
                    root: ""
                }]).forEach(k => {
                    var icon = div("sdIcon");
                    icon.style.backgroundColor = ScriptIcons.stableColorFromName(k.name);
                    icon.setChildren([HTML.mkImg("svg:edit,white")]);

                    var nameBlock = div("sdName", k.name);
                    var hd = div("sdNameBlock", nameBlock);
                    var addInfo = div("sdAddInfoInner", k.description);
                    var res = div("sdHeaderOuter", div("sdHeader", icon, div("sdHeaderInner", hd, div("sdAddInfoOuter", addInfo))));

                    res.withClick(() => {
                        m.onDismiss = undefined;
                        m.dismiss();
                        onSuccess(k.id);
                    });
                    elts.push(res)
                })
                m.choose(elts, { searchHint: lf("search editors"), header: lf("pick an editor for your script...") });
            });
        }

        public chooseScriptFromTemplateAsync() : Promise { // of ScriptTemplate
            TipManager.setTip(null)

            return new Promise((onSuccess, onError, onProgress) => {
                var m = new ModalDialog();
                var templates = this.getAvailableTemplates();
                var sections = Util.unique(templates, t => t.section).map(t => t.section);
                var bySection = Util.groupBy(templates, t => t.section);
                m.onDismiss = () => onSuccess(undefined);
                var elts = []
                sections.forEach(k => {
                    if (k != "templates" && !this.isBeginner())
                        elts.push(div("modalSearchHeader section", lf_static(k, true)))
                    bySection[k].forEach((template: ScriptTemplate) => {
                        var icon = div("sdIcon");
                        icon.style.backgroundColor = ScriptIcons.stableColorFromName(template.title);
                        icon.setChildren([HTML.mkImg("svg:" + template.icon + ",white")]);

                        var nameBlock = div("sdName", lf_static(template.title, true));
                        var hd = div("sdNameBlock", nameBlock);
                        var addInfo = div("sdAddInfoInner", lf_static(template.description, true));
                        var res = div("sdHeaderOuter", div("sdHeader", icon, div("sdHeaderInner", hd, div("sdAddInfoOuter", addInfo))));

                        res.withClick(() => {
                            m.onDismiss = undefined;
                            m.dismiss();
                            this.renameScriptFromTemplateAsync(template)
                                .done(temp => onSuccess(temp), e => onSuccess(undefined));
                        });
                        elts.push(res)
                    })
                })
                m.choose(elts, { searchHint: lf("search templates"), header: lf("pick a script template...") });
            });
        }

        private startTutorialButton(t:Ticks)
        {
            var elt = this.mkFnBtn(lf("Tutorials"), () => {
                Util.setHash('#topic:tutorials');
            }, t, true, 3, dirAuto(div("hubTileOver", lf("Create your own apps"))));

            elt.style.backgroundSize = 'contain';
            elt.style.backgroundImage = HTML.cssImage('https://az31353.vo.msecnd.net/pub/zxddkvgm');
            elt.style.backgroundRepeat = 'no-repeat';
            elt.className += " tutorialBtn";

            return elt
        }

        private showTutorialTip()
        {
            if (!this.visible) return;
            if (ModalDialog.currentIsVisible()) {
                Util.setTimeout(1000, () => this.showTutorialTip())
                return;
            }
            TipManager.setTip(null)
            TipManager.setTip({
                tick: Ticks.hubFirstTutorial,
                title: lf("tap there"),
                description: lf("we'll guide you step by step"),
                //forceTop: true,
            })
        }

        private addPageTiles(s: string, c: HTMLElement, items: BrowserPage[]) {
            var elements: HTMLElement[] = [];

            if (s == "top" || s == "showcase" || s == "new") {
                items = items.filter((s) => !(s instanceof ScriptInfo) || (<ScriptInfo>s).willWork())
            }

            var tutorialOffset = 0
            function tileSize(k) {
                k += tutorialOffset
                var sz = 1;
                if (k == 0) sz = 3;
                else if (k == 1) sz = 2;
                return sz;
            }

            var scriptSlots = 0
            if (s == "recent" && items.length < 5) {
                tutorialOffset++;
                elements.push(this.startTutorialButton(Ticks.hubFirstTutorial))
                scriptSlots = 4 - items.length
            }


            items.slice(0, 5).forEach((item, i) => {
                var sz = tileSize(i);
                var t = items[i].mkTile(sz);
                this.tileClick(t, () => {
                    this.hide();
                    if (s == "recent") this.browser().showList("installed-scripts", item);
                    else if (s == "myart") {
                        if (Cloud.getUserId())
                            this.browser().showList("myart", item);
                    } else if (s == "art") this.browser().showList("art", item);
                    else if (s == "social") this.browser().showList("groups", item);
                    else if (s == "users") this.browser().showList("users", item);
                    else this.browser().showList(s + "-scripts", item);
                });
                elements.push(t);
            });

            if (scriptSlots && items.length == 0) {
                Util.setTimeout(1000, () => this.showTutorialTip())
            }

            while (scriptSlots-- > 0) {
                var oneSlot = this.mkFnBtn(lf("Your script will appear here"), () => {
                    this.showTutorialTip()
                }, Ticks.hubFirstTutorial, true, scriptSlots == 3 ? 2 : 1);
                oneSlot.className += " scriptSlot";
                elements.push(oneSlot)
            }

            var beforeFirstFnBtn = null;
            var noFnBreak = false;

            if (s == "social") {
                var slots = 4;
                elements = elements.slice(0, slots);
                if (elements.length == 1) {
                    var fill = div("hubTile hubTileBtn hubTileSize" + tileSize(elements.length));
                    fill.style.opacity = '0';
                    elements.push(fill);
                }

                var forumEl = this.mkFnBtn(lf("Forums"), () => { this.hide(); Hub.showForum() }, Ticks.hubForum, false, tileSize(elements.length));
                forumEl.appendChild(div("hubTileSearch", HTML.mkImg("svg:im,white")));
                elements.push(forumEl);

                var toExternalBtn = (btn: HTMLElement) => {
                    btn.className += " externalBtn";
                    return btn;
                }
                if (!this.isBeginner()) {
                    if (elements.length < slots + 1) {
                        var el = toExternalBtn(this.mkFnBtn(lf("Facebook"),() => { window.open('http://www.facebook.com/TouchDevelop'); }, Ticks.hubFacebook, true, tileSize(elements.length)));
                        el.appendChild(div("hubTileSearch", HTML.mkImg("svg:facebook,white")));
                        elements.push(el);
                    }
                    if (elements.length < slots + 1) {
                        var el = toExternalBtn(this.mkFnBtn(lf("Twitter"),() => { window.open('http://www.twitter.com/TouchDevelop'); }, Ticks.hubTwitter, true, tileSize(elements.length)));
                        el.appendChild(div("hubTileSearch", HTML.mkImg("svg:twitter,white")));
                        elements.push(el);
                    }
                    if (elements.length < slots + 1) {
                        var el = toExternalBtn(this.mkFnBtn(lf("YouTube"),() => { window.open('http://www.youtube.com/TouchDevelop'); }, Ticks.hubYouTube, true, tileSize(elements.length)));
                        elements.push(el);
                    }
                }
                while (elements.length < slots + 1) {
                    var fill = div("hubTile hubTileBtn hubTileSize" + tileSize(elements.length));
                    fill.style.opacity = '0';
                    elements.push(fill);
                }
            }

            var addFnBtn = (lbl: string, t, f: () =>void , modal = false, size = 1) => {
                elements.push(this.mkFnBtn(lbl, f, t, modal, size));
            }

            if (s == "recent") {
                noFnBreak = true;
                addFnBtn(lf("All my scripts"), Ticks.hubSeeMoreMyScripts,
                    () => { this.hide(); this.browser().showList("installed-scripts", null) });
                elements.peek().appendChild(div("hubTileSearch", HTML.mkImg("svg:search,white")));
                addFnBtn(lf("Create Script"), Ticks.hubCreateScript, () => { this.chooseEditor(); }, true);
                if (!this.isBeginner()) {
                    var upd = this.browser().headersWithUpdates();
                    if (upd.length > 0) {
                        var updBtn =
                            this.mkFnBtn(lf("Script Updates"),() => { this.updateScripts() }, Ticks.hubUpdates, true);
                        updBtn.appendChild(div('hubTileCounter', upd.length.toString()));
                        elements.push(updBtn)
                    }
                }
            }
            else if (s == "art" || s == "myart") {
                noFnBreak = true;
                while(elements.length < 5) {
                    var oneSlot = this.mkFnBtn(lf("Your art will appear here"), () => {
                        this.showTutorialTip()
                    }, Ticks.hubFirstTutorial, true, tileSize(elements.length));
                    oneSlot.className += " scriptSlot";
                    elements.push(oneSlot)
                }
                addFnBtn(lf("See More"), Ticks.hubSeeMoreArt, () => { this.hide(); this.browser().showList("myart", null) });
                elements.peek().appendChild(div("hubTileSearch", HTML.mkImg("svg:search,white")));
                addFnBtn(lf("Upload Picture"), Ticks.hubUploadPicture, () => { ArtUtil.uploadPictureDialogAsync().done() }, true);
                addFnBtn(lf("Upload Sound"), Ticks.hubUploadSound, () => { ArtUtil.uploadSoundDialogAsync().done() }, true);
            }
            else if (s == "social") {
                    addFnBtn(lf("All my groups"), Ticks.hubSeeMoreGroups, () => { this.hide(); this.browser().showList("mygroups", null) });
                    elements.peek().appendChild(div("hubTileSearch", HTML.mkImg("svg:search,white")));

                    if (!this.isBeginner()) {
                        elements.push(this.smallBtn(lf("Users"), () => { this.hide(); this.browser().showList("users", null) }, Ticks.hubSeeMoreUsers));
                        elements.push(this.smallBtn(lf("Give feedback Contact us"), () => { Editor.showFeedbackBox() }, Ticks.hubFeedback));
                        elements.push(this.smallBtn(lf("Join Group"), () => { this.joinGroup() }, Ticks.hubJoinGroup));
                        elements.push(this.smallBtn(lf("Create Group"), () => { this.createGroup() }, Ticks.hubCreateGroup));
                    } else {
                        elements.push(this.mkFnBtn(lf("Join Group"), () => { this.joinGroup() }, Ticks.hubJoinGroup));
                    }
            } else {
                //if (items.length > 5)
                // there is almost always more; the list will filter by capabilities, so it may seem short
                addFnBtn(lf("See More"), s == "new" ? Ticks.hubSeeMoreNewScripts :
                                     s == "top" ? Ticks.hubSeeMoreTopScripts :
                                     s == "showcase" ? Ticks.hubSeeMoreShowcase :
                                     Ticks.hubSeeMoreCloudOther,
                () => { this.hide(); this.browser().showList(s + "-scripts", null) });
                elements.peek().appendChild(div("hubTileSearch", HTML.mkImg("svg:search,white")));

                if (s == "top") {
                    addFnBtn(lf("New Scripts"), Ticks.hubSeeMoreNewScripts,
                        () => { this.hide(); this.browser().showList("new-scripts", null) });
                    elements.peek().appendChild(div("hubTileSearch", HTML.mkImg("svg:star,white")));
                }
            }

            this.layoutTiles(c, elements, noFnBreak);
        }

        private updateScripts()
        {
            var boxes = this.browser().headersWithUpdates().map((h) => {
                var c = HTML.mkCheckBox(h.name);
                (<any>c).scriptGuid = h.guid;
                HTML.setCheckboxValue(c, true);
                return c;
            })

            var update = () => {
                tick(Ticks.hubDoUpdates);
                var byGuid = {}
                var forUpdate:Cloud.Header[] = []
                this.browser().headersWithUpdates().forEach((h) => {
                    byGuid[h.guid] = h
                })
                boxes.forEach((b) => {
                    if (HTML.getCheckboxValue(b)) {
                        var h = byGuid[(<any>b).scriptGuid];
                        if (h) {
                            forUpdate.push(h);
                        }
                    }
                })
                ProgressOverlay.lockAndShow(lf("updating your scripts"), () => {
                    var idx = 0;
                    var promises = []
                    forUpdate.forEach((h) => {
                        promises.push(World.updateAsync(h.guid)
                            .then(() => {
                                ProgressOverlay.setProgress(lf("{0} of {1} done", ++idx, forUpdate.length))
                            }))
                    })
                    Promise.join(promises).done(() => {
                        ProgressOverlay.hide();
                        this.showSections();
                    })
                })
            }

            var m = new ModalDialog();
            m.add(div("wall-dialog-header", lf("{0} script{0:s} to update", boxes.length)))
            if (dbg)
                m.add(div("wall-dialog-buttons",
                        HTML.mkButton(lf("select all"), () => { boxes.forEach((b) => HTML.setCheckboxValue(b, true) ) }),
                        HTML.mkButton(lf("unselect all"), () => { boxes.forEach((b) => HTML.setCheckboxValue(b, false) ) })))
            m.add(HTML.mkModalList(boxes));
            m.add(div("wall-dialog-buttons",
                    HTML.mkButton(lf("cancel"), () => m.dismiss()),
                    HTML.mkButton(lf("update them!"), () => { m.dismiss(); update(); })))
            m.show();
        }

        private showSectionsCoreAsync(skipSync = false)
        {
            this.showingIntro = false;
            return this.browser().clearAsync(skipSync).then(() => {
                this.updateSections();
                if (this.afterSections) {
                    var f = this.afterSections;
                    this.afterSections = null;
                    f();
                }
            });
        }

        private temporaryRequestedSignin = false;
        private showingTemporarySignin = false;
        private showTemporaryNotice() {
            if (!Storage.temporary || this.showingTemporarySignin) return;

            // if only and not signed in, request to sign in
            if (!this.temporaryRequestedSignin
                && Cloud.isOnline()
                && Cloud.isAccessTokenExpired()) {
                this.temporaryRequestedSignin = true;
                this.showingTemporarySignin = true;
                var d = new ModalDialog();
                d.addHTML(lf("<h3>Welcome to TouchDevelop!</h3>"));
                d.add(div('wall-dialog-header', lf("Sign in to avoid losing your scripts!")));
                d.add(div('wall-dialog-body', lf("Your browser does not allow TouchDevelop to store web site data. This usually happens if run in Private Mode (Safari), in InPrivate mode (Internet Explorer) or your security settings prevent data storage.")));
                d.add(div('wall-dialog-body', lf("When you sign in, TouchDevelop will save your scripts in the cloud.")));
                d.add(div("wall-dialog-buttons",
                    HTML.mkButton(lf("skip this"), () => {
                        this.showingTemporarySignin = false;
                        d.canDismiss = true;
                        d.dismiss();
                    }, "gray-button"),
                    HTML.mkButton(lf("sign in"), () => {
                        this.showingTemporarySignin = false;
                        if (Login.show()) {
                            d.canDismiss = true;
                            d.dismiss();
                        }
                    }, "gray-button")
                ));
                d.fullWhite()
                    d.canDismiss = false;
                d.show();
            } else {
                Storage.showTemporaryWarning();
            }
        }

        private showLegalNotice()
        {
            this.showingIntro = true;
            var d = new ModalDialog();
            d.addHTML(
                '<h3>welcome to TouchDevelop</h3>' +
                '<p>TouchDevelop lets you <b>create apps easily</b>, directly on ' +
                (Browser.isCellphone ? 'your phone' :
                 Browser.isTablet ? 'your tablet' :
                 'pretty much any device including your computer') +
                '. You can share your apps with others, so they can <b>run and edit</b> them on ' +
                'Windows Phone, iPad, iPhone, Android, PC, or Mac. ' +
                '</p>')

            /*
            d.addHTML('<p class="agree">' +
                'TouchDevelop client apps use cloud services to synchronize your scripts across all your devices. ' +
                'You will need to login to make use of that.' +
                '</p>')
            */


            var msgHolder = div(null);
            d.add(msgHolder);

            var notice = Runtime.legalNotice;
            if (notice)
                d.addHTML(notice);

            d.add(div("wall-dialog-buttons",
                HTML.mkButton(lf("sign in"), () => {
                    tick(Ticks.legalNoticeSignIn);
                    if(Login.show()) {
                        localStorage["legalNotice"] = notice;
                        d.canDismiss = true;
                        d.dismiss();
                    }
                }, "gray-button"),
                HTML.mkButton(Runtime.legalNotice ? lf("agree, let's get started") : lf("let's get started!"), () => {
                    tick(Ticks.legalNoticeAgree);
                    localStorage["legalNotice"] = notice;
                    d.canDismiss = true;
                    d.dismiss();
                }, "gray-button")
            ));
            d.fullWhite()
            d.canDismiss = false;
            d.show();
        }

        static userPictureChooser(fbButton:boolean, onUpd:()=>void)
        {
            var preview = <HTMLImageElement> document.createElement("img");
            var placeholder = "https://az31353.vo.msecnd.net/c04/nbpp.png"
            preview.onerror = () => {
                if (preview.src != placeholder && Cloud.isOnline())
                    preview.src = placeholder;
            };
            var error = div("formError");
            var msg = div("formHint");
            var updatePreview = () => {
                preview.src = Cloud.getPrivateApiUrl("me/picture?nocache=" + Util.guidGen())
            }
            updatePreview();
            var chooser = HTML.mkImageChooser((uri) => {
                var img = <HTMLImageElement>HTML.mkImg(uri)
                function onLoad() {
                    var w = img.width;
                    var h = img.height;
                    if (w < 150 || h < 150) {
                        error.setChildren("image too small (we need 150x150px or more)")
                        return;
                    }

                    var f = 500 / Math.max(w, h);

                    // does it need scaling?
                    if (f < 1.05 || !/^data:image\/jpeg/.test(uri)) {
                        if (f < 1) f = 1;
                        var canvas = <HTMLCanvasElement>document.createElement("canvas");
                        canvas.width = Math.floor(w * f);
                        canvas.height = Math.floor(h * f);
                        var ctx = canvas.getContext("2d");
                        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                        uri = canvas.toDataURL('image/jpeg', 0.85);
                    }

                    preview.src = uri;
                    msg.setChildren([])
                    error.setChildren([])
                    Util.httpPostTextAsync(Cloud.getPrivateApiUrl("me/picture"), JSON.stringify({
                            content: uri.replace(/^[^,]*,/, ""),
                            contentType: "image/jpeg"
                    })).done(resp => {
                        msg.setChildren("picture changed; it may take a few minutes and a page reload for the changes to show up");
                        onUpd();
                        updatePreview();
                    }, err => {
                        error.setChildren("failed to upload image");
                        updatePreview();
                    })
                }

                img.onload = onLoad;
            })

            var widget = div("form-section",
                div("float-right", preview),
                div(null, "picture"),
                div(null, chooser),
                error,
                msg,
                HTML.mkButton(lf("remove picture"), () => {
                    Util.httpDeleteAsync(Cloud.getPrivateApiUrl("me/picture")).done(() => {
                        msg.setChildren("picture removed");
                        updatePreview();
                    })
                }),
                !fbButton ? null :
                HTML.mkButton(lf("get from facebook"), () => {
                    Util.httpPostJsonAsync(Cloud.getPrivateApiUrl("me/settings"), { picturelinkedtofacebook: true }).done(() => {
                        msg.setChildren("picture linked to your facebook profile");
                        updatePreview();
                    })
                }),
                div("clear"))
            return widget;
        }

        static askToEnableNotifications(finish: () => void = undefined) {
            if (!Cloud.lite &&
                !ModalDialog.currentIsVisible() && // don't show dialog on top of other dialog
                !TheEditor.stepTutorial && // don't show dialog during tutorials
                (Runtime.offerNotifications() && World._askToEnableNotifications ||
                 (World._askEmail || World._askToEnableEmailNewsletter || World._askToEnableEmailNotifications)))
            {
                Hub.accountSettings(true, finish);
            }
            else if (finish !== undefined) {
                finish();
            }
        }

        static accountSettings(notificationsOnly: boolean = false, finish: () => void = undefined) {
            if (Cloud.anonMode(lf("editing user settings"), null, true)) return;

            var d = new ModalDialog();
            var updated = false;
            if (finish === undefined && !notificationsOnly)
                finish = () => {
                    if (updated && !Storage.showTemporaryWarning())
                            Util.setTimeout(500, () => window.location.reload());
                };
            var dialogBody = div(null)
            Browser.setInnerHTML(dialogBody, lf("<h3>loading current settings...</h3>"));
            d.add(dialogBody)
            var err = div("formError");

            var lastDiv;
            var textEntry = (lbl: any, inp: HTMLElement, ...rest: any[]) => {
                dialogBody.appendChild(lastDiv = div("form-section", HTML.label("", HTML.span("input-label", lbl), inp, div("formHint", rest))))
                return inp;
            }

            Util.httpGetJsonAsync(Cloud.getPrivateApiUrl("me/settings")).done((settings) => {
                Browser.setInnerHTML(dialogBody, "")

                var nickname, website, twitterhandle, githubuser, location, area, aboutme, realname, gender, yearofbirth,
                    culture, howfound, programmingknowledge, occupation, email, emailnewsletter, emailfrequency, pushNotifications,
                    school;

                if (!notificationsOnly) {
                    dialogBody.appendChild(div("formHint", lf("Don't forget to scroll down and tap 'save' when you are done editing!")));

                    dialogBody.appendChild(div("form-title", lf("public profile")));
                    nickname = <HTMLInputElement>textEntry(<any[]>[lf("nickname"), HTML.span("errorSq", "*")], HTML.mkTextInput("text", lf("nickname")),
                        lf("A unique display name for your public profile (at least 8 characters)"));

                    website = <HTMLInputElement>textEntry(lf("website"), HTML.mkTextInput("url", lf("website url")),
                        lf("Enter the URL to your personal website (Example: http://www.northwindtraders.com)"))

                    twitterhandle = <HTMLInputElement>textEntry(lf("twitter handle"), HTML.mkTextInput("text", lf("twitter handle")),
                        lf("Your twitter handle, like @touchdevelop."));

                    githubuser = <HTMLInputElement>textEntry(lf("github user"), HTML.mkTextInput("text", lf("github user")),
                        lf("Your GitHub user."));

                    location = <HTMLInputElement>textEntry(lf("location"), HTML.mkTextInput("text", lf("location")),
                        lf("Where in the world are you?"))

                    area = HTML.mkAutoExpandingTextArea()
                    aboutme = textEntry(lf("about you"), area.div, lf("Enter some information about yourself"))

                dialogBody.appendChild(Hub.userPictureChooser(settings.picturelinkedtofacebook === false, () => { updated = true }))

                dialogBody.appendChild(div("form-title", lf("private profile")));

                    var cultureOptions = [HTML.mkOption("", "")];
                    for (var i = 0; i < settings.cultureoptions.length; i++)
                        cultureOptions.push(HTML.mkOption(settings.cultureoptions[i], settings.culturenames[i], (settings.culture || (<any>navigator).language) == settings.cultureoptions[i]));
                    var cultureBox = HTML.mkComboBox(cultureOptions);
                    culture = <HTMLSelectElement>textEntry(lf("preferred language"), cultureBox);
                    cultureBox.style.fontSize = "0.8em";

                    realname = <HTMLInputElement>textEntry(lf("real name"), HTML.mkTextInput("text", lf("real name")),
                        lf("Your full name"));

                    gender = <HTMLSelectElement>textEntry(lf("gender"), HTML.mkComboBox([HTML.mkOption("", "")].concat(settings.genderoptions.map(s => HTML.mkOption(s, s, settings.gender == s)))));

                    yearofbirth = <HTMLSelectElement>textEntry(lf("year of birth"), HTML.mkComboBox([HTML.mkOption("0", "")].concat(settings.yearofbirthoptions.map(year => HTML.mkOption(year + "", year + "", settings.yearofbirth == year)))));

                    howfound = <HTMLSelectElement>textEntry(lf("how found"), HTML.mkComboBox([HTML.mkOption("", "")].concat(settings.howfoundoptions.map(s => HTML.mkOption(s, s, settings.howfound == s)))),
                        lf("How did you discover TouchDevelop?"));

                    programmingknowledge = <HTMLSelectElement>textEntry(lf("programming knowledge"), HTML.mkComboBox([HTML.mkOption("", "")].concat(settings.programmingknowledgeoptions.map(s => HTML.mkOption(s, s, settings.programmingknowledge == s)))),
                        lf("What is your level of programming knowledge?"));

                    occupation = <HTMLSelectElement>textEntry(lf("occupation"), HTML.mkComboBox([HTML.mkOption("", "")].concat(settings.occupationoptions.map(s => HTML.mkOption(s, s, settings.occupation == s)))),
                        lf("What is your occupation?"));

                    school = <HTMLInputElement>textEntry(lf("school"), HTML.mkTextInput("text", lf("school")),
                        lf("Enter your school affiliation if any."));
                }

                dialogBody.appendChild(div("form-title", lf("email and push notifications")));

                if (!notificationsOnly || World._askEmail || World._askToEnableEmailNewsletter || World._askToEnableEmailNotifications)
                {
                    email = <HTMLSelectElement>textEntry(lf("email"), HTML.mkTextInput("text", "you@example.com"));
                    if (settings.email && !settings.emailverified) {
                        var emailError = div("formError2");
                        emailError.setChildren(lf("Your email address has not yet been verified. Please check your inbox."))
                        dialogBody.appendChild(emailError);
                    }
                }

                var emailnewsletterDiv, emailfrequencyDiv, pushNotificationsDiv;

                var t = settings.emailnewsletter2;
                if (notificationsOnly && !t) t = "yes";
                emailnewsletter = <HTMLSelectElement>textEntry(lf("receive email newsletters"), HTML.mkComboBox([HTML.mkOption("", "")].concat(settings.emailnewsletter2options.map(s => HTML.mkOption(s, s, t == s)))),
                    lf("Do you want to receive informational TouchDevelop-related newsletters, e.g. about new features and upcoming events?"));
                emailnewsletterDiv = lastDiv;

                var u = settings.emailfrequency;
                if (notificationsOnly && !u) u = "weekly";
                emailfrequency = <HTMLSelectElement>textEntry(lf("receive email notifications"), HTML.mkComboBox([HTML.mkOption("", "")].concat(settings.emailfrequencyoptions.map(s => HTML.mkOption(s, s, u == s)))),
                    lf("Receive email notifications when other people review/take a screenshot of/comment on your scripts, or reply to one of your comments, or when events related to your subscriptions occur."));
                emailfrequencyDiv = lastDiv;

                var v = settings.notifications2;
                if (Runtime.offerNotifications() && !v) v = "yes";
                if (Runtime.offerNotifications() || v) {
                    pushNotifications = <HTMLSelectElement>textEntry(lf("receive push notifications"), HTML.mkComboBox([HTML.mkOption("", "")].concat(settings.notifications2options.map(s => HTML.mkOption(s, s, v == s)))),
                        lf("Receive notifications to your mobile device when other people review / take a screenshot of/comment on your scripts, or reply to one of your comments, or when events related to your subscriptions occur."));
                    pushNotificationsDiv = lastDiv;
                }

                if (notificationsOnly) {
                    emailnewsletterDiv.style.display = "none";
                    emailfrequencyDiv.style.display = "none";
                    if (pushNotificationsDiv) pushNotificationsDiv.style.display = "none";
                    var summary = div("formHint",
                        t == "yes" ? lf("You will get TouchDevelop newsletters.") : lf("You will not get TouchDevelop newsletters."),
                        "You will get a ", span("emph", u), " email notification digest ", pushNotifications  ? <any[]>["and ", span("emph", v == "yes" ? "mobile" : "no"), " push notifications"] : [], " when users engage with your publications or posts. ",
                        span("emph", lf("Change settings...")));
                    summary.onclick = () => {
                        emailnewsletterDiv.style.display = "block";
                        emailfrequencyDiv.style.display = "block";
                        if (pushNotificationsDiv) pushNotificationsDiv.style.display = "block";
                        summary.style.display = "none";
                    };
                    dialogBody.appendChild(summary);
                }

                dialogBody.appendChild(div("form-section", "")); // spacing
                if (!notificationsOnly) {
                dialogBody.appendChild(div("formHint", lf("Items marked with * are required."),
                    Editor.mkHelpLink("account settings")));
                }
                dialogBody.appendChild(div("formHint", HTML.mkA(null, Cloud.getServiceUrl() + "/privacy", "_blank", lf("Please review our Privacy Statement."))));

                var saveBtn: HTMLElement;
                dialogBody.appendChild(err)
                var progressBar = HTML.mkProgressBar();
                dialogBody.appendChild(div("formRelative", progressBar));
                dialogBody.appendChild(
                    div("wall-dialog-buttons",
                        HTML.mkButton(notificationsOnly ? lf("maybe later") : lf("cancel"), () => { d.dismiss() }),
                        saveBtn = HTML.mkButton(lf("save"), () => {
                            var emailnewsletter2Value = emailnewsletter === undefined ? undefined : emailnewsletter.options[emailnewsletter.selectedIndex].value;
                            var emailfrequencyValue = emailfrequency === undefined ? undefined : emailfrequency.options[emailfrequency.selectedIndex].value;
                            if (isBeta &&
                                (emailnewsletter2Value == "yes" || emailfrequencyValue && emailfrequencyValue != "never") &&
                                email && !email.value)
                            {
                                if (notificationsOnly) {
                                    err.className = "formError2";
                                    err.setChildren(lf("Tap 'maybe later' if you don't want to enter an email address now."));
                                }
                                else
                                {
                                    err.setChildren(lf("You need to enter a valid email address if you want to get emails."));
                                }
                                return;
                            }
                            progressBar.start();
                            saveBtn.setChildren(lf("saving..."));
                            err.setChildren([])
                            var cultureValue = culture === undefined ? undefined : culture.options[culture.selectedIndex].value;
                            Cloud.postUserSettingsAsync({
                                    nickname: nickname === undefined ? undefined : nickname.value,
                                    website: website === undefined ? undefined : website.value,
                                    aboutme: aboutme === undefined ? undefined : area.textarea.value,
                                    notifications2: pushNotifications === undefined ? undefined : pushNotifications.options[pushNotifications.selectedIndex].value,
                                    realname: realname === undefined ? undefined : realname.value,
                                    gender: gender === undefined ? undefined : gender.options[gender.selectedIndex].value,
                                    howfound: howfound === undefined ? undefined : howfound.options[howfound.selectedIndex].value,
                                    culture: cultureValue,
                                    yearofbirth: yearofbirth === undefined ? undefined : parseInt(yearofbirth.options[yearofbirth.selectedIndex].value),
                                    programmingknowledge: programmingknowledge === undefined ? undefined : programmingknowledge.options[programmingknowledge.selectedIndex].value,
                                    occupation: occupation === undefined ? undefined : occupation.options[occupation.selectedIndex].value,
                                    emailnewsletter2: emailnewsletter2Value,
                                    emailfrequency: emailfrequencyValue,
                                    email: email === undefined ? undefined : email.value,
                                    location: location === undefined ? undefined : location.value,
                                    twitterhandle: twitterhandle === undefined ? undefined : twitterhandle.value,
                                    githubuser: githubuser === undefined ? undefined : githubuser.value,
                                    school: school ? school.value : undefined,
                                }).done(resp => {
                                    progressBar.stop();
                                    saveBtn.setChildren("save");
                                    if (resp.message)
                                        err.setChildren(resp.message);
                                    else {
                                        if (resp.emailverificationsent) d.onDismiss = undefined;
                                        updated = true;
                                        Util.setUserLanguageSetting(cultureValue);
                                        d.dismiss();
                                        if (resp.emailverificationsent)
                                        {
                                            var m = new ModalDialog();
                                            m.add([
                                                div("wall-dialog-header", lf("email verification")),
                                                div("wall-dialog-body", lf("We sent you a verification email. Please check your inbox."))])
                                            m.addOk(lf("ok"))
                                            m.onDismiss = finish;
                                            m.show();
                                        }
                                    }
                                }, error => {
                                    progressBar.stop();
                                    d.onDismiss = undefined;
                                    d.dismiss();
                                    ModalDialog.info("error", lf("A network error occurred. Your account settings could not be saved. Are you offline?")).onDismiss = finish;
                                })
                        })))

                if (nickname) nickname.value = settings.nickname || "";
                if (website) website.value = settings.website || "";
                if (location) location.value = settings.location || "";
                if (area) { area.textarea.value = settings.aboutme || ""; area.update() }
                if (realname) realname.value = settings.realname || "";
                if (twitterhandle) twitterhandle.value = settings.twitterhandle || "";
                if (githubuser) githubuser.value = settings.githubuser || "";
                if (email) email.value = settings.email || "";
                if (school) school.value = settings.school || "";

                World._askEmail = World._askToEnableNotifications = World._askToEnableEmailNewsletter = World._askToEnableEmailNotifications = false;
            });

            d.onDismiss = finish;

            d.fullWhite();
            d.addClass("accountSettings");
            d.setScroll();
            d.show();
        }

        static chooseWallpaper() {
            if (Cloud.anonMode(lf("choosing wallpaper"), null, true)) return;

            tick(Ticks.hubChooseWallpaper);
            var buttons : StringMap<() => void> = {};
            buttons[lf("clear")] = () => EditorSettings.setWallpaper("", true);
            Meta.chooseArtPictureAsync({ title: lf("choose a wallpaper"), initialQuery: "background", buttons: buttons })
                .done((a: JsonArt) => { if (a) EditorSettings.setWallpaper(a.id, true); });
        }

        public showSections(skipSync = false)
        {
            this.show();
            if (Runtime.legalNotice && localStorage["legalNotice"] != Runtime.legalNotice) //|| (localStorage["legalNotice"] == undefined)
                this.showLegalNotice();
            else this.showTemporaryNotice();
            this.showSectionsCoreAsync(skipSync).done();
        }

        private exportBtn(lbl:string, f:()=>void, t : Ticks):HTMLElement {
            var elt = div("hubTile hubTileBtn hubTileSize1 hubTileWithLogo tutorialBtn",
                dirAuto(div("hubTileBtnLabel hubTileBtnLabelSmall", lbl))
                /* ,div("hubTileSearch hubTileSearchSmall", HTML.mkImg("svg:shoppingcartalt,white"))  FIXME: need icons */
                );
            elt.withClick(() => {
                tick(t);
                f();
            });
            (<any>elt).tutorialBtn = 1;

            return elt;
        }

        private smallBtn(lbl:string, f:()=>void, t : Ticks, tutorial : boolean = false):HTMLElement {
            var lbls = lbl.split(/: /)
            if (lbls[1]) lbl = lbls[1]
            var elt = div("hubTile hubTileBtn hubTileSize0", dirAuto(div("hubTileBtnLabel " + (
                    lbl.length > 30 ? " hubTileBtnLabelTiny"
                    : " hubTileBtnLabelSmall"), lbl)));
            if (lbls[1])
                elt.appendChild(div("hubTileCorner", lbls[0]))
            elt.withClick(() => {
                tick(t);
                f();
            });
            if (tutorial) {
                (<any>elt).tutorialBtn = 1;
                elt.className += " tutorialBtn";
            }
            return elt;
        }

        static showForum()
        {
            Util.setHash("#forum")
        }

        static showAbout() {
            if (Browser.isWP8app)
                Editor.showFeedbackBox();
            else
                Util.navigateInWindow("https://www.touchdevelop.com/");
        }

        static winStoreHelp() {
            Util.setHash('#topic:exporttoapp');
        }

        // Takes care of the painful, non-trivial task of fetching all the
        // tutorials. For each tutorial found, we call [k] with it.
        private fetchAllTutorials(k: (t: ITutorial) => void) {
            var helpTopic = HelpTopic.findById("tutorials");
            helpTopic.initAsync().then(() => {
                // The list of tutorials is represented as an app, with a single
                // action, whose body is a list of comments...
                var comments = <AST.Comment[]> helpTopic.app.actions()[0].body.stmts;
                // Each comment has a special Markdown structure that can be
                // inspected using regular expressions. Essentially, we match the
                // syntax {macro:argument} where macro is the string "follow" and
                // argument is the title of the corresponding tutorial.
                comments.forEach((c: AST.Comment) => {
                    // Copied from [help.ts]
                    var m = c.text.match(/\{(\w+)(:([^{}]*))?\}/);
                    if (m && m[1] == "follow") {
                        var id = MdComments.shrink(m[3]);
                        // Copied from [tutorialTitle], and (hopefully) simplified.
                        this.findTutorial(id, (res, topic: HelpTopic) => {
                            var key = topic.updateKey();
                            var header = res[1][key]; // may be null or undefined
                            k({
                                title: topic.json.name.replace(/ (tutorial|walkthrough)$/i, ""),
                                header: header,
                                topic: topic,
                                app: res[0],
                            });
                        });
                    }
                });
            })
        }

        private showSimplifiedLearn(container:HTMLElement) {
            var buttons = [];
            this.fetchAllTutorials((tutorial: ITutorial) => {
                // We just listen for the first eight tutorials.
                if (buttons.length > 6)
                    return;

                var btn = this.mkFnBtn("", () => {
                    this.startTutorial(tutorial.topic, tutorial.header);
                }, Ticks.noEvent, false, Math.max(3 - buttons.length, 1));
                btn.appendChild(div("hubTileTitleBar", div("hubTileTitle", tutorial.title)));
                btn.style.backgroundImage = "url("+tutorial.topic.json.screenshot+")";
                btn.style.backgroundSize = "cover";
                buttons.push(btn);

                if (buttons.length == 6) {
                    buttons.push(this.createSkillButton());
                    buttons.push(this.mkFnBtn(lf("All tutorials"), () => {
                        Util.setHash('#topic:tutorials');
                    }, Ticks.noEvent, false, 1));
                    this.layoutTiles(container, buttons);
                }
            });
        }

        private createSkillButton(): HTMLElement {
            var editorMode = EditorSettings.editorMode();
            var skillTitle = editorMode ? lf("Skill level: {0}     ", EditorSettings.editorModeText(editorMode)) : lf("Choose skill");
            var skill = this.mkFnBtn(skillTitle,() => {
                EditorSettings.showChooseEditorModeAsync().done(() => this.updateSections(), e => this.updateSections());
            }, Ticks.hubChooseSkill, true);
            skill.className += " exportBtn";
            return skill;
        }

        private showLearn(container:HTMLElement)
        {
            function toTutBtn(btn: HTMLElement) {
                btn.className += " tutorialBtn";
                return btn;
            }

            var sellApps:HTMLElement;
            var docsEl: HTMLElement;
            var apiEl: HTMLElement;
            var whatsNew: HTMLElement;
            var begginersEl : HTMLElement;
            //var advancedEl:HTMLElement;
            var rate, settings: HTMLElement;
            var searchEl: HTMLElement;
            var elements = [
                this.startTutorialButton(Ticks.hubDocsTutorial),
                docsEl = toTutBtn(this.mkFnBtn(lf("Search Help"), () => {
                    this.hide();
                    this.browser().loadHash(["help"]);
                }, Ticks.hubDocs, false, 2)),
                //advancedEl = toTutBtn(this.mkFnBtn(lf("Advanced Tutorial"), () => {
                //    Util.setHash('#topic:devbootcamp')
                //}, Ticks.hubDevBootCamp, false)),
                whatsNew = toTutBtn(this.mkFnBtn(lf("What's new"), () => {
                    Util.setHash('#topic:whatsnew')
                }, Ticks.hubDocsWhatsNew, true)),
                sellApps = this.exportBtn(lf("Export to Windows, Android, iOS, Azure"), () => {
                    Hub.winStoreHelp();
                }, Ticks.hubWinStore),
                begginersEl = toTutBtn(this.smallBtn(lf("Getting started"), () => {
                    Util.setHash('#topic:gettingstarted');
                }, Ticks.hubBeginnersGettingStarted, true)),
                apiEl = toTutBtn(this.smallBtn(lf("API Docs"), () => {
                    Util.setHash('#topic:api')
                }, Ticks.hubDocsApi, true)),
                // this button says "Search", which means "search" not "search docs" - "Help" is for that
                searchEl = this.mkFnBtn(lf("Search everything"), () => { this.hide(); this.browser().showList("search", null); }, Ticks.hubChatSearch, false),
                this.createSkillButton(),
                settings = this.smallBtn(lf("Settings"), () => {
                    TheEditor.popupMenu()
                }, Ticks.hubSettings),
                Runtime.rateTouchDevelop && localStorage["rateTouchDevelop"] == 1 ?
                  rate = this.mkFnBtn(lf("Rate Touch- Develop"), () => {
                      localStorage["rateTouchDevelop"] = 2;
                      Runtime.rateTouchDevelop();
                  }, Ticks.hubRateTouchdevelop, false) : null,
            ];
            elements = elements.filter((e) => e != null);
            searchEl.appendChild(div("hubTileSearch", HTML.mkImg("svg:search,white")));
            (<any>searchEl).breakBefore = 1;
            docsEl.appendChild(div("hubTileSearch", HTML.mkImg("svg:search,white")));
            whatsNew.appendChild(div("hubTileSearch hubTileSearchSmall", HTML.mkImg("svg:star,white")));
            settings.appendChild(div("hubTileSearch hubTileSearchSmall", HTML.mkImg("svg:settings,white")));

            if (rate) rate.className += " exportBtn";

            this.layoutTiles(container, elements);
        }

        private showTags(container:HTMLElement)
        {
            TheApiCacheMgr.getAnd("tags?count=1000", (tgs:JsonList) => {
                var elements = [];
                var existing:any = {}

                var byName = (n) => unique.filter((t) => t.name == n)[0];

                var unique = <JsonTag[]>tgs.items.filter((t:JsonTag) => {
                    if (existing[t.id]) return false;
                    existing[t.id] = 1;
                    return true;
                });

                var mkBtn = (n:string, sz:number) => {
                    var t = byName(n);
                    if (!t) return; // shouldn't happen
                    var lbl = t.name;

                    //if (groupName == "libraries")
                    //    lbl = lbl.replace(" libraries", "");
                    var elt = div("hubTile hubTileBtn hubTileSize" + sz,
                                  div("hubTileTagTitle", lbl),
                                  div("hubTileTagNumber", t.instances + ""));
                    this.tileClick(elt, () => {
                        tick(Ticks.hubTag);
                        this.hide();
                        this.browser().showList(t.id + "/scripts");
                    });
                    elements.push(elt);
                }

                unique.sort((a:JsonTag, b:JsonTag) => b.instances - a.instances); // a.name.localeCompare(b.name));

                mkBtn("games", 3);
                mkBtn("libraries", 2);
                mkBtn("tools", 0);
                mkBtn("entertainment", 0);
                mkBtn("education", 0);
                mkBtn("productivity", 0);
                mkBtn("music", 0);
                mkBtn("business", 0);

                var search = this.mkFnBtn(lf("See More"), () => { this.showTagList(unique) }, Ticks.hubTagSearch, true);
                search.appendChild(div("hubTileSearch", HTML.mkImg("svg:search,white")));
                elements.push(search);

                this.layoutTiles(container, elements);
            });
        }

        private showTagList(tags:JsonTag[])
        {
            function fullName(c:JsonTag) { return c.category ? c.category + " :: " + c.name : c.name; }
            var boxes =
                tags.map((c) =>
                    div("hubTagBox",
                        div("sdCmtTopic",
                            span("sdBold", fullName(c)),
                            " x" + c.instances + ""
                            ),
                        Host.expandableTextBox(c.description)).withClick(() => {
                            m.dismiss();
                            tick(Ticks.hubTagFromList);
                            this.hide();
                            this.browser().showList(c.id + "/scripts");
                        }));
            var m = new ModalDialog();
            m.choose(boxes);
        }

        private isBeginner() {
            return EditorSettings.editorMode() <= EditorMode.block;
        }

        private updateSections()
        {
            var sects = {
                "recent": lf("my scripts"),
                "misc": this.isBeginner() ? lf("tutorials") : lf("learn"),
                "showcase": lf("showcase"),
                "social": lf("social"),
            };
            if (!this.isBeginner()) {
                var extra = {
                    "top": lf("top & new"),
                    "tags": lf("categories"),
                    //"new": lf("new"),
                    //"art": lf("art"),
                    "myart": lf("my art"),
                };
                Object.keys(extra).forEach(k => sects[k] = extra[k]);
            }

            if (SizeMgr.portraitMode) {
                this.vertical = true;
            } else {
                // IE has mouse-wheel translation feature that makes horizontal scrolling easier
                // it also makes sense for tablets in landscape mode
                if (Browser.isTrident || (Browser.isTouchDevice && !Browser.isDesktop))
                    this.vertical = false;
                else
                    // everyone else gets vertical
                    this.vertical = true;
            }
            if (/vertical/.test(document.URL)) this.vertical = true;
            if (/horizontal/.test(document.URL)) this.vertical = false;

            Util.resetDragToScroll(this.mainContent);
            if (this.vertical)
                Util.setupDragToScroll(this.mainContent);
            else
                Util.setupHDragToScroll(this.mainContent);

            var tileWidth = 7.3;
            var bigTileWidth = 11.3;

            var sectWidths = { tags: 5*tileWidth, libraries:2*tileWidth, games: 3*tileWidth, misc: 2*tileWidth, 'default': bigTileWidth + 2*tileWidth }

            var sectWidth = (name:string):number => sectWidths['default']

            this.logo.style.display = "";
            this.meBox.style.display = "";

            // h=26em

            var topMargin = 5;
            var sectionHeight = 26;
            var winHeight = SizeMgr.windowHeight / SizeMgr.topFontSize;
            var spaceRemaining = winHeight - topMargin;
            var fontScale = 1.0;

            var requiredWidth = sectWidth('recent') + (this.vertical ? 2 : 8);

            var posLeft = SizeMgr.portraitMode ? 1 : 4;
            var posTop = (spaceRemaining - fontScale*sectionHeight) / 2;

            this.theRoot.setFlag("vertical", this.vertical);

            if (this.vertical) {
                requiredWidth = sectWidth('recent');
                requiredWidth = SizeMgr.phoneMode ? requiredWidth + 2 :
                                SizeMgr.portraitMode ? requiredWidth + 2 :
                                requiredWidth * 2 + 4 + 6;
                fontScale = 1.5;
                posLeft = SizeMgr.portraitMode ? 1 : 3;
                posTop = 5;
            }

            var posLeft0 = posLeft;
            var minScale = SizeMgr.windowWidth / (SizeMgr.topFontSize * requiredWidth);
            if (minScale < fontScale) fontScale = minScale;

            var divs = []

            this.topContainer.removeSelf();
            if (this.vertical) {
                var needHeight = sectionHeight + 3.5;
                if (spaceRemaining < needHeight*fontScale)
                    fontScale = spaceRemaining/needHeight;
                divs.push(this.topContainer);
            } else {
                if (posTop < 0) {
                    fontScale = spaceRemaining / sectionHeight;
                    posTop = (topMargin - 1) / fontScale;
                    posLeft /= fontScale;
                } else {
                    posTop += topMargin - 1;
                }
                this.topBox.setChildren([this.topContainer]);
            }

            this.mainContent.style.fontSize = fontScale + "em";
            SizeMgr.hubFontSize = fontScale * SizeMgr.topFontSize;
            this.mainContent.style.height = SizeMgr.windowHeight + "px";
            var lastHeight = 0;

            Object.keys(sects).forEach((s) => {
                var c = div("hubSectionBody");

                var hd = sects[s];

                var sd = div("hubSection hubSection-" + s, div("hubSectionHeader", spanDirAuto(hd)), c);
                divs.push(sd)
                this.mainContent.appendChild(sd);

                sd.style.top = posTop + "em";
                sd.style.left = posLeft + "em";
                sd.style.width = sectWidth(s) + "em";
                lastHeight = posTop;

                if (this.vertical) {
                    if (!SizeMgr.portraitMode && posLeft == posLeft0)
                        posLeft += sectWidth(s) + 4;
                    else {
                        posTop += sectionHeight + 2;
                        posLeft = posLeft0;
                    }
                } else
                    posLeft += sectWidth(s) + 4;

                if (s == "misc")
                    this.isBeginner() ? this.showSimplifiedLearn(c) : this.showLearn(c);
                else if (s == "tags")
                    this.showTags(c);
                else if (s == "myart") {
                    if (Cloud.getUserId())
                        this.browser().getLocationList(Cloud.getUserId() + "/art?count=6", (items, cont) => this.addPageTiles(s, c, items));
                    else {
                        this.addPageTiles(s, c, []);
                    }
                }
                else if (s == "social") {
                    if (Cloud.getUserId())
                        this.browser().getLocationList(Cloud.getUserId() + "/groups?count=6", (items, cont) => this.addPageTiles(s, c, items));
                    else
                        this.addPageTiles(s, c, []);
                }
                else
                    this.browser().getLocationList(s + "-scripts", (items, cont) => this.addPageTiles(s, c, items));
            });

            if (this.vertical) {
                var spc = div("hubSectionSpacer");
                spc.style.top = (lastHeight + sectionHeight) + "em";
                divs.push(spc);
            }

            this.mainContent.setChildren(divs);

            if (Cloud.getUserId()) {
                var uid = this.browser().getUserInfoById("me", "me");
                this.meBox.setChildren([uid.mkSmallBox()]);
                var notificationsBtn = HTML.mkImg('svg:bell,#444');
                notificationsBtn.id = "notificationsBtn";
                var notificationsCounterDiv = div('notificationCounter', this.notificationsCount > 0 ? this.notificationsCount.toString() : '');
                notificationsCounterDiv.setAttribute("data-notifications", this.notificationsCount > 0 ? "yes" : "no");

                this.notificationBox.setChildren([notificationsBtn, notificationsCounterDiv])
                this.notificationBox.withClick(() => { TheApiCacheMgr.invalidate(Cloud.getUserId() + "/notifications"); Util.setHash("#notifications") });
                World.onNewNotificationChanged = (n: number) => {
                    if (n > 0 && this.notificationsCount != n) {
                        HTML.showWebNotification("TouchDevelop", { tag: "notifications", body: lf("You have {0} notification{0:s}", n), icon: "https://www.touchdevelop.com/images/touchdevelop114x114.png" });
                    }
                    this.notificationsCount = n;
                    Browser.setInnerHTML(notificationsCounterDiv, this.notificationsCount > 0 ? this.notificationsCount.toString() : '');
                    notificationsCounterDiv.setAttribute("data-notifications", this.notificationsCount > 0 ? "yes" : "no");
                };
            } else {
                var loginBtn = HTML.mkButtonElt("wall-button login-button", SVG.getLoginButton())
                this.meBox.setChildren(loginBtn.withClick(() => {
                    Login.show();
                }))
                this.notificationBox.setChildren([]);
            }

            World.getCurrentUserInfoAsync().done(u => {
                if (this.visible)
                    this.startDingDing(u);
            })
        }

        private currentDingDing = null;
        private startDingDing(u:JsonUser)
        {
            var prevScore = parseInt(window.localStorage["prevUserScore"] || "-1")
            if (prevScore < 0 || prevScore >= u.score) {
                window.localStorage["prevUserScore"] = u.score;
                return;
            }

            var scoreDiv = Browser.ScriptInfo.mkNum(1, "svg:Award,#444,clip=110")
            this.currentDingDing = scoreDiv;
            this.dingDingBox.setChildren([scoreDiv])

            var diff = u.score - prevScore
            var animTime = 400
            var sleepTime = 100

            var sym = scoreDiv.firstChild.nextSibling

            var currScore = 0

            var setNum = (v:number) => {
                scoreDiv.setChildren([" " + v + " ", sym])
                currScore = v;
                window.localStorage["prevUserScore"] = v + "";
            };

            var advance = () => {
                if (this.currentDingDing != scoreDiv)
                    return;

                if (currScore == u.score) {
                    Util.coreAnim("dingZoom", 3500, scoreDiv, () => {
                        scoreDiv.removeSelf();
                    })
                    return;
                }
                var s = currScore + Math.max(1, Math.round((u.score - currScore) / 4))
                setNum(s)
                Util.coreAnim("dingDing", animTime, scoreDiv, () => {
                    Util.setTimeout(sleepTime, advance);
                })
            };

            setNum(prevScore);
            EditorSoundManager.scoreUp();
            Util.coreAnim("dingShow", 1000, scoreDiv, () => {
                Util.setTimeout(600, advance)
            })
        }
    }
} }
