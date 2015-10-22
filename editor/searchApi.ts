///<reference path='refs.ts'/>

module TDev
{
    export interface HTMLElementWithIntelliItem extends HTMLElement
    {
        intelliItem: IntelliItem;
    }

    export class SearchApi
        extends SideTab {
        constructor (public calc: Calculator) {
            super()
            this.autoUpdate = KeyboardAutoUpdate.mkInput(this.searchBox, null);
        }
        public icon() { return "svg:search,currentColor"; }
        public name() { return "results"; }
        public keyShortcut() { return "Ctrl-F"; }
        public isModal() { return true; }
        public isNav() { return true; }
        private lastSearchValue = "";
        private lastHistoryVersion = 0;
        private lastSelectedIdx = -1;
        private lastEntryCount = -1;
        private wasSelected: any = {};
        private searchTerms: string[] = [];
        private progressBar = HTML.mkProgressBar();

        private searchBox = HTML.mkTextInput("text", lf("Search..."), "search");
        private autoUpdate: KeyboardAutoUpdate;
        private backContainer = div("apiBackContainer");
        private searchDiv = div("apiTopDiv");
        private snapshotId: Promise = null;

        private dismissBtn:HTMLElement;
        private runBtn: HTMLElement;
        private compileBtn: HTMLElement;
        private toCodeBtn:HTMLElement;
        public visible = false;
        public prepopulate: string;
        public artKind: Kind; // restricting to picture or sounds
        private doInsertOnDismissing = false;

        private dismissDiv = div("apiDismiss");

        public listenToSpeech() {
            var recognition = TDev.RT.WebSpeechManager.createRecognition();
            if(recognition) {
                recognition.continuous = true; // stop when user stops talking
                recognition.interimResults = true; // only report final results
                recognition.lang = 'en-US';
                recognition.onresult = (e : any) => {
                    Util.log('reco:result');
                    var res = '';
                    for (var i = e.resultIndex; i < e.results.length; ++i)
                        res += e.results[i][0].transcript;
                    if (res)
                        this.show(res, false);
                }
                recognition.onerror = (e:any) => {
                    Util.log('reco:error' + e);
                }
                recognition.onstart = () => {
                    Util.log('reco:start');
                }
                recognition.onend = () => {
                    Util.log('reco:end');
                }
                recognition.start();
            }
        }


        public navigatedTo() {
            super.navigatedTo();
            this.navRefreshPending = true; // we want to always refresh
        }

        public cancel()
        {
            this.doInsertOnDismissing = false;
            this.searchBox.blur();
            this.calc.display();
        }

        public cancelImplicitInsert()
        {
            this.doInsertOnDismissing = false;
        }

        public setSize() {
            var off = this.searchDiv.offsetHeight;
            if (TheEditor.autoHide()) off = 0;
            this.scrollRoot.style.top = off + "px";
            this.scrollRoot.style.height = this.visualRoot.offsetHeight - off + "px";
        }

        public handleKey(e: KeyboardEvent) {
            if (e.keyName == "Esc") {
                this.cancel();
                return true;
            }

            if (this.handleCarretKeys(e))
                return true;

            var charName = String.fromCharCode(e.charCode);
            if (!this.getVerb(this.searchBox.value) &&
                this.carretIdx != -1 &&
                (e.keyName == 'Tab' || /^[:()\-+\/*=<>|&\'\".,]$/.test(charName))) {
                this.onEnter();
                e.fromTextBox = false;
                Util.setTimeout(1, () => this.calc.handleKey(e));
                return true;
            }

            return false;
        }

        public resetState() {
            this.progressBar.reset();
            this.searchDiv.removeSelf();
            this.snapshotId = null;
        }

        public onEnter() {
            if (!super.onEnter()) {
                this.carretIdx = 0;
                this.highlightCarret();
                return true;
            }
            this.searchBox.blur();
            return true;
        }

        private setVR() {
            //this.searchDiv.removeSelf();
            this.searchDiv.setChildren(<any[]>[this.backContainer, this.searchBox, this.progressBar]);
            // IEMobile seems to pass some clicks through here
            this.searchDiv.withClick(() => {});
            if (TheEditor.autoHide()) {
                this.searchDiv.appendChild(
                    TheEditor.mkTabMenuItem("svg:search,currentColor", "all APIs", null, Ticks.calcBtnApiSearch, () => {
                        if (TheEditor.sidePaneVisible())
                            this.cancel();
                        else
                            this.startSearch(false)
                    }));
                elt("leftBtnRow").appendChild(this.searchDiv);
            } else {
                this.visualRoot.setChildrenIfNeeded([this.searchDiv, this.scrollRoot]);
            }
        }

        public refreshCore() {
            this.setVR();
            // scrollRoot.addEventListener("scroll", function => calc.onIntelliScroll());
            this.setupList();
            /*
            if (justNavigatedTo) {
                // this will not show the keyboard on the iPad
                // without the timeout the keyboard shows for a split second and then hides
                // I have no idea why
                Util.setTimeout(1, () => { Util.setKeyboardFocus(searchBox); });
                // Util.log("keyboard focused");
            }
            */
        }

        private startSearch(focus:boolean) {
            tick(Ticks.calcStartSearch)

            this.carretIdx = focus ? 0 : -1;
            this.calc.onIntelliScroll();
            this.lastSearchValue = null;
            var selectAll = false;
            if (this.prepopulate) {
                this.searchBox.value = this.prepopulate;
                this.prepopulate = null;
                this.lastSearchValue = "";
                focus = true;
                selectAll = true;
            }
            this.searchKey();
            Util.showLeftPanel(this.scrollRoot);
            if (focus)
                Util.setKeyboardFocus(this.searchBox, selectAll);
            //this.setSize();
        }

        public show(value = "", focus = true) {
            this.searchBox.value = value;
            this.startSearch(focus);
        }

        private newItems() {
            this.searchBox.blur();
            Util.setTimeout(1, () => { this.searchBox.blur() });
            this.lastSearchValue = null;
            this.searchBox.value = "";
            this.carretIdx = 0;
            this.searchKey();
        }

        public displayPlaceholder() {
            this.searchBox.value = "";
            this.lastSearchValue = null;
            this.setChildren([this.dismissDiv]);
            this.setPlaceholder();
            this.setVR();
        }

        public dismissing()
        {
            this.artKind = null;
            if (this.doInsertOnDismissing) {
                this.doInsertOnDismissing = false;
                return super.onEnter();
            }
            return false;
        }

        private setPlaceholder() {
            this.searchBox.placeholder = lf("Search...");
            this.searchBox.setAttribute("aria-label", this.searchBox.placeholder);
        }

        public updateRunButton() {
            if (this.runBtn) {
                if (TheEditor.currentRt && TheEditor.currentRt.canResume())
                    this.runBtn.setChildren([Editor.mkTopMenuItem("svg:resume,currentColor", lf("resume"), Ticks.calcSearchRun, "Ctrl-M", () => {
                        TheEditor.resumeExecution();
                    })]);
                else
                    this.runBtn.setChildren([Editor.mkTopMenuItem("svg:play,currentColor", lf("run main"), Ticks.calcSearchRun, "Ctrl-M", () => {
                        TheEditor.runMainAction();
                    })]);
            }
        }

        public init(e: Editor) {
            super.init(e);

            this.searchBox.id = "apiSearchBox";
            this.setPlaceholder();

            this.dismissDiv.withClick(() => TheEditor.dismissSidePane());

            this.searchBox.onkeyup = Util.catchErrors("sideSearch-searchKey", () => this.searchKey());
            this.searchBox.onclick = Util.catchErrors("sideSearch-on-focus", () => this.startSearch(false));
            HTML.enableSpeech(this.searchBox, Util.catchErrors("sideSearch-onspeechchange", () => this.searchKey()));
            this.setVR();

            this.toCodeBtn =
                Editor.mkTopMenuItem("svg:back,currentColor", lf("to code"), Ticks.calcSearchBack, "Esc", () => {
                    this.cancel();
                });
            this.dismissBtn =
                Editor.mkTopMenuItem("svg:back,currentColor", lf("dismiss"), Ticks.calcSearchBack, "", () => {
                    TheEditor.dismissSidePane()
                });
            this.runBtn = div("");
            this.compileBtn = Cloud.canCompile() ? div("") : undefined;
            this.updateRunButton();
            this.runBtn.style.position = "relative";
            if (this.compileBtn) {
                this.compileBtn.style.position = "relative";
                this.compileBtn.setChildren([Editor.mkTopMenuItem("svg:bitcompile,currentColor", lf("compile"), Ticks.calcSearchCompile, "Ctrl-Alt-M", (e:MouseEvent) => {
                        var debug = (<MouseEvent> e).ctrlKey || /dbgcpp=1/i.test(document.location.href);
                        if (!debug && SizeMgr.splitScreen)
                            TheEditor.runMainAction();
                        TheEditor.compile(this.compileBtn, debug);
                })]);
            }    

            this.toCodeBtn.style.display = "none";
            this.backContainer.setChildren([
                this.dismissBtn,
                this.runBtn,
                this.compileBtn,
                this.toCodeBtn
            ]);
        }

        public moveCarret(d: number) {
            super.moveCarret(d);
            this.calc.onIntelliScroll();
        }
        
        public query() : string { return this.searchBox.value; }

        private searchKey() {
            this.searchBox.placeholder = "";
            if (this.lastSearchValue != this.searchBox.value) {
                this.lastSearchValue = this.searchBox.value;
                this.setupList();
                this.highlightCarret();
            }
        }

        public setVisible(v:boolean)
        {
            this.visible = v;
            if (this.visible) {
                this.doInsertOnDismissing = true;
                this.toCodeBtn.style.display = "inline-block";
                this.dismissBtn.style.display = "none";
                this.runBtn.style.display = "none";
                if (this.compileBtn) this.compileBtn.style.display = "none";
            } else {
                this.toCodeBtn.style.display = "none";
                this.dismissBtn.style.display = "inline-block";
                this.runBtn.style.display = "inline-block";
                if (this.compileBtn) this.compileBtn.style.display = "inline-block";
            }
        }

        public carretBound() { return -1 }

        public highlightCarret() {
            super.highlightCarret();

            this.calc.displayTokenPlaceholder(null, this.searchTerms);
            if (this.searchTerms.length > 0) {
                var e = <HTMLElementWithIntelliItem>this.htmlEntries[this.carretIdx];
                if (e) this.calc.displayTokenPlaceholder(e.intelliItem, this.searchTerms);
            }
        }

        private getVerb(s: string) {
            var verb = "";
            var mtch = /^\?([a-zA-Z]+)/.exec(s);
            if (mtch) {
                switch (mtch[1].toLowerCase()) {
                    case 'd': return 'd';
                    case 'a': return 'a';
                    case 'l': return 'l';
                }
            }
            return "";
        }

        private stripVerb(s: string) {
            var v = this.getVerb(s);
            if (v) return s.slice(v.length + 1);
            return s;
        }

        private setupList() {
            var maxLen = 20;
            var hasMore = false;

            var items: HTMLElement[] = [];

            var allTerms = this.searchBox.value;
            var verb = this.getVerb(allTerms);

            var terms = allTerms.split(/\s+/).map((s: string) => s.toLowerCase()).filter((s) => s != "");
            var fullName = terms.join("");

            this.searchTerms = terms;
            var isSpecificKind = false;

            if (terms.length == 0) maxLen = 100;

            var updateScore = (score: number, prop: IProperty) => {
                if (!prop || !score) return score;
                score *= 1e-1;
                var isSingleton = prop.parentKind.singleton || prop.parentKind instanceof AST.LibraryRefKind;
                if ((!isSpecificKind && !isSingleton) || prop.parentKind.getName() == "Invalid")
                    score *= 1e-5;
                if (!Script.canUseProperty(prop))
                    score *= 1e-10;
                return score;
            }

            var addList = (entries: IntelliItem[]) => {
                if (entries.length == 0) return;
                if (terms.length > 0) {
                    var totalProps = 0;
                    entries = entries.filter((it: IntelliItem) => {
                        it.lastMatchScore = updateScore(it.match(terms, fullName), it.prop);
                        if (it.lowSearch) it.lastMatchScore *= 0.05;
                        return it.lastMatchScore > 0;
                    });
                    entries.sort(IntelliItem.cmpScoreThenName);
                } else {
                    entries.sort(IntelliItem.cmpName);
                }
                if (entries.length == 0) return;
                // if (!!n) items.push(div("navHeader", n));
                if (entries.length > maxLen) {
                    entries = entries.slice(0, maxLen);
                    hasMore = true
                }
                entries.forEach((it: IntelliItem) => {
                    var b = it.mkBox();
                    if (terms.length > 0)
                        Util.highlightWords(b, terms);
                    (<HTMLElementWithIntelliItem>b).intelliItem = it;
                    if (it.prop && !Script.canUseProperty(it.prop))
                        b.className += " disabledItem";
                    items.push(b);
                });

                if (hasMore) items.push(IntelliItem.thereIsMore());
            }

            var its = this.calc.currentIntelliItems;
            var singletons: IntelliItem[] = its.filter((it: IntelliItem) => it.decl instanceof AST.SingletonDef);

            var propScore = (p: IProperty) => p.forwardsTo() ? 10 : 0;

            var getProps = () =>
            {
                var props: IProperty[] = [];

                function addProp(p:IProperty) {
                    var s = updateScore(IntelliItem.matchProp(p, terms, fullName), p);
                    if (s > 0) {
                        props.push(p);
                        p.lastMatchScore = s;
                    }
                }

                var profile = this.editor.intelliProfile;
                Script.getKinds().filter(k => (!profile || profile.hasKind(k))).forEach((k) => {
                    k.listProperties()
                        .filter(prop => prop.isBrowsable() && !prop.isExtensionAction() && (!profile || profile.hasProperty(prop)))
                        .forEach(addProp);
                });
                Script.libraries().forEach((l) => {
                    l.getKind().listProperties().filter(p => p.isBrowsable() && !(<AST.LibraryRefAction>p)._extensionAction).forEach(addProp);
                });
                props.sort((a: IProperty, b: IProperty) => {
                    if (a.lastMatchScore != b.lastMatchScore) return b.lastMatchScore - a.lastMatchScore;
                    var aa = propScore(a);
                    var bb = propScore(b);
                    if (aa != bb) return bb - aa;
                    // This is super slow on Chrome
                    // return an.localeCompare(bn);
                    return Util.nameCompare(a, b);
                });
                return props;
            }

            var allProps = () =>
            {
                var props: IProperty[] = getProps();

                /*
                // about 3ms per full search on IE, Core i7
                Util.time("search-props", () => {
                    for (var i = 0; i < 100; ++i) {
                        props = getProps();
                    }
                });
                */

                if (props.length > maxLen) {
                    hasMore = true;
                    props = props.slice(0, maxLen);
                }
                var propIts: IntelliItem[] = props.map((p: IProperty) => {
                    var it = new IntelliItem();
                    it.prop = p;
                    it.isAttachedTo = p.parentKind;
                    it.score = propScore(p);
                    it.tick = Ticks.calcIntelliProperty;
                    return it;
                });

                propIts.pushRange(its.filter((it: IntelliItem) => !it.prop));

                var insertLit = (name: string, tp = "literal") => {
                    var tr = new IntelliItem();
                    tr.tick = Ticks.calcIntelliLiteral;
                    tr.nameOverride = name;
                    tr.descOverride = lf("Insert '{0}' {1}", name, tp);
                    tr.cbOverride = () => { this.calc.insertOp(name); };
                    tr.score = 10;
                    propIts.push(tr);
                }
                insertLit("true");
                insertLit("false");
                insertLit("not", "operator");
                if (asyncEnabled && TheEditor.widgetEnabled("async")) {
                    insertLit("async", "operator");
                }
                propIts.pushRange(TheEditor.selector.getStmtIntelliItems());

                addList(propIts);
            }

            if (terms.length > 0)
                this.calc.onIntelliScroll();

            items = [];

            if ((singletons.length > 0  || TheEditor.calculator.inSelectionMode()) && terms.length > 0) {
                isSpecificKind = false;
                allProps();
            } else {
                isSpecificKind = true;
                addList(its); //.filter((it:IntelliItem) => !!it.prop));
            }

            var singleton = TheEditor.calculator.getSingletonBeforeCursor()
            var verbOverride = null

            if (singleton && singleton.getName() == "art")
                verbOverride = "a"
            if (singleton && singleton.getName() == AST.libSymbol)
                verbOverride = "l"

            var autoOnlineSearch = !Cloud.isRestricted()
                && (!isSpecificKind || verbOverride)
                && terms.length > 0
                && allTerms.length > 1
                && items.length < 15;

            if (verb || autoOnlineSearch) {
                this.autoUpdate.lastValue = "";
                this.autoUpdate.update = (s) => this.runOnlineSearchAsync(verbOverride, s);
                this.autoUpdate.keypress();
            }
            if (!verb && !isSpecificKind) {
                //items.push(this.onlineBox("d", "do as i mean", "tell us what you want and we'll try to generate a program that does it"));
                //items.push(this.onlineBox("a", "search online art", "find pictures and sounds uploaded by you and others"));
                //gets in the way on small screens
                //items.push(this.onlineBox("l", "search for libraries", "find libraries online doing useful stuff"));
            }

            if (!verb && !autoOnlineSearch) // synthesis might be on...
            {
                this.autoUpdate.update = null;
                this.autoUpdate.keypress();
            }

            this.htmlEntries = items.slice(0);

            this.setChildren(items);
            this.setSize();
        }

        private onlineBox(verb: string, name: string, desc: string) {
            var dwim = new IntelliItem();
            dwim.nameOverride = name;
            dwim.descOverride = "?" + verb + ": " + desc;
            dwim.colorOverride = "#FF7518";
            dwim.cbOverride = () => {
                var terms = this.stripVerb(this.searchBox.value);
                this.searchBox.value = "?" + verb + " " + terms;
                Util.setKeyboardFocus(this.searchBox);
                this.searchKey();
            };
            return dwim.mkBox();
        }

        private runOnlineSearchAsync(verbOverride:string, terms: string) : Promise {
            if (Cloud.isOffline()) return Promise.as();  // better offline experience

            var verb = this.getVerb(terms);
            if (verbOverride) verb = verbOverride

            var itemCount = (Browser.isMobile ? 5 : 20) + terms.length * 2;
            /* SYNTHESIS if (verb[0] == 'd') {
                tick(Ticks.searchApiSynthesis);
                return this.runSynthesisAsync(terms);
            } else */
            if (verb[0] == 'a') {
                tick(Ticks.searchApiSearchArt);
                return this.searchAzureSearchArtAsync(terms, itemCount);
                // return this.searchCoreAsync("art?count=" + itemCount + "&q=", terms);
            } else if (verb[0] == 'l') {
                tick(Ticks.searchApiSearchLib);
                return this.searchCoreAsync("scripts?count=" + itemCount + "&q=" + encodeURIComponent("*library "), terms, "", p => (<Browser.ScriptInfo>p).isLibrary());
            } else {
                tick(Ticks.searchApiSearchAuto);
                /* SYNTHESIS this.runSynthesisAsync(terms).then(() => )*/
                return this.searchAzureSearchArtAsync(terms, itemCount);
                // return this.searchCoreAsync("art?count=" + itemCount + "&q=", terms);
            }
        }

        private searchMessage(msg: string) {
            this.setChildren([<HTMLElement>div("navMessage", msg)].concat(this.htmlEntries))
        }

        private searchAzureSearchArtAsync(terms: string, itemCount: number, kind: string = undefined) {
            if (!this.editor.widgetEnabled("calcSearchArt") || !this.autoUpdate.resultsCurrent(terms)) {
                return Promise.as();
            }
            if (!kind && this.artKind) kind = this.artKind.getName().toLowerCase();

            var uploadPicBtn, uploadSndBtn;
            this.progressBar.start();

            return Meta.searchArtAsync(terms, kind).then(arts => {
                this.progressBar.stop();
                if (!this.autoUpdate.resultsCurrent(terms)) {
                    return;
                }

                var els = [];
                arts.map(art => {
                    var el = art.mkSmallBoxNoClick().withClick(() => {
                        art.getJsonAsync().done(() => {
                            tick(Ticks.searchApiInsertArt);
                            this.appendArt(art.art);
                        });
                    });
                    els.push(el);
                });
                if (this.editor.widgetEnabled('uploadArtInSearchButton')) {
                    if (uploadPicBtn) this.removeBtn(uploadPicBtn);
                    uploadPicBtn = HTML.mkButton(lf("upload picture"), () => {
                        this.removeBtn(uploadPicBtn);
                        ArtUtil.uploadPictureDialogAsync()
                            .done((a: JsonArt) => {
                                tick(Ticks.searchApiUploadArt);
                                if (a) this.appendArt(a);
                            });
                    });
                    els.push(uploadPicBtn);

                    uploadSndBtn = HTML.mkButton(lf("upload sound"), () => {
                        this.removeBtn(uploadSndBtn);
                        ArtUtil.uploadSoundDialogAsync()
                            .done((a: JsonArt) => {
                                tick(Ticks.searchApiUploadArt);
                                if (a) this.appendArt(a);
                            });
                    });
                    els.push(uploadSndBtn);
                }
                if (els.length > 0) {
                    els.forEach((c) => this.htmlEntries.push(c));
                    this.setChildren(this.htmlEntries);
                }
            });
        }

        private appendArt(a : JsonArt) {
            this.editor.undoMgr.pushMainUndoState();
            this.editor.undoMgr.clearCalc();
            var n = null;
            var appendPlay = false;
            if (a && a.pictureurl) {
                n = this.editor.freshPictureResource(a.name);
                n.url = a.pictureurl;
            } else {
                n = this.editor.freshSoundResource(a.name);
                n.url = a.wavurl;
                appendPlay = true;
            }
            Script.addDecl(n);
            this.editor.queueNavRefresh();
            this.cancelImplicitInsert();
            var artDecl = TDev.api.getThing("art")
            if (this.calc.getSingletonBeforeCursor() != artDecl)
                this.calc.insertThing(artDecl);
                this.calc.insertProp(n);
            if (appendPlay)
                this.calc.insertProp(TDev.api.getKind("Sound").getProperty("play"));
        }

        private removeBtn(btn : HTMLElement) {
            btn.removeSelf();
            var idx = this.htmlEntries.indexOf(btn);
            if (idx >= 0)
                this.htmlEntries.splice(idx, 1);
        }

        private searchCoreAsync(pref: string, terms: string, continuation : string = undefined, filter : (p:Browser.BrowserPage) => boolean = p => true) : Promise {
            if (!this.autoUpdate.resultsCurrent(terms)) {
                return Promise.as();
            }

            this.progressBar.start();
            var uri = pref + encodeURIComponent(this.stripVerb(terms));
            if (continuation) uri += "&continuation=" + encodeURIComponent(continuation);
            return Browser.TheHost.getLocationList(uri, (itms: Browser.BrowserPage[], cont: string) => {
                this.progressBar.stop();
                if (!this.autoUpdate.resultsCurrent(terms)) {
                    return;
                }

                var els = [];
                itms.forEach((itm: Browser.BrowserPage) => {
                    if (!filter(itm)) return;
                    if (itm instanceof Browser.ArtInfo) {
                        var art = <Browser.ArtInfo>itm;
                        var el = art.mkSmallBoxNoClick().withClick(() => {
                            art.getJsonAsync().done(() => {
                                tick(Ticks.searchApiInsertArt);
                                this.appendArt(art.art);
                            });
                        });
                        els.push(el);
                    } else if (itm instanceof Browser.ScriptInfo) {
                        var scr = <Browser.ScriptInfo>itm;
                        var el = scr.mkSmallBoxNoClick().withClick(() => {
                            if (scr.app && scr.app.isLibrary) {
                                tick(Ticks.searchApiInsertLib);
                                this.editor.undoMgr.pushMainUndoState();
                                this.editor.undoMgr.clearCalc();
                                var lib = this.editor.freshLibrary();
                                Script.addDecl(lib);
                                LibraryRefProperties.bindLibraryAsync(lib, scr).done(() => {
                                    this.cancelImplicitInsert();
                                    var libDecl = TDev.api.getThing(AST.libSymbol)
                                    if (this.calc.getSingletonBeforeCursor() != libDecl)
                                        this.calc.insertThing(libDecl);
                                    this.calc.insertProp(lib);
                                    this.editor.queueNavRefresh();
                                });
                            }
                        });
                        els.push(el);
                    }
                });

                if (els.length > 0) {
                    els.forEach((c) => this.htmlEntries.push(c));
                    this.setChildren(this.htmlEntries);
                }
            }, true);
        }

        /* SYNTHESIS
        private runSynthesisAsync(search: string): Promise {
            if (!Cloud.hasAccessToken() || Cloud.isOffline() || !Browser.canLogin) return Promise.as(); // better offline experience

            if (!this.calc || !this.calc.expr)
                return Promise.as();

            var urlPref = "me/installed/" + Script.localGuid + "/";

            this.progressBar.start();

            if (!this.snapshotId) {
                var tw = AST.TokenWriter.forStorage()
                tw.skipActionBodies = true
                Script.writeTo(tw);
                var req =
                    {
                        script: tw.finalize(),
                        actionname: TheEditor.lastDecl.getName(),
                        locals: (this.calc.expr.locals || []).map((l: AST.LocalDef) => { return { name: l.getName(), kind: l.getKind().toString() } }),
                        culture: "en-US"
                    }
                this.snapshotId =
                    Cloud.postPrivateApiAsync(urlPref + "snapshot", req).then((resp) => {
                        if (resp && resp.snapshotid) return resp.snapshotid;
                        else {
                            HTML.showErrorNotification("wrong synthesis snapshot response");
                            return "";
                        }
                    });
            }

            return this.snapshotId
                .then((snapshotId) => {
                    if (!this.autoUpdate.resultsCurrent(search)) {
                        this.progressBar.stop();
                        return Promise.as();
                    }
                    var url = urlPref + "synthesis?snapshotid=" + encodeURIComponent(snapshotId) +
                              "&query=" + encodeURIComponent(this.stripVerb(search));
                    return Util.httpGetJsonAsync(Cloud.getPrivateApiUrl(url));
                })
                .then((resp) => {
                    if (!resp || !this.autoUpdate.resultsCurrent(search)) {
                        this.progressBar.stop();
                        return;
                    }

                    if (Array.isArray(resp.results)) {
                        var renderer = new TDev.EditorRenderer()
                        var children = <HTMLElement[]>resp.results.slice(0, 1).map((res: string, idx: number) => {
                            var stmt = AST.Parser.parseStmt(res)
                            var stmtDiv = renderer.renderStmt(stmt)
                            stmtDiv.className = "codeSearchResult";

                            var icon = div("navImg", HTML.mkImg("svg:Wand,white"));
                            icon.style.backgroundColor = "blue";
                            var innerElt = div("navItemInner", icon, div("navContent", stmtDiv));
                            var elt = HTML.mkButtonElt("navItem codeSearchItem", innerElt);

                            elt.withClick(() => {
                                var url = urlPref + "synthesis?synthesisid=" + encodeURIComponent(resp.synthesisid) + "&index=" + idx;
                                Cloud.postPrivateApiAsync(url, {}).done(undefined, () => { });
                                stmt.accept(new SynthesisCleaner());
                                TheEditor.selector.injectBelow(stmt);
                            });
                            return elt;
                        });

                        if (children.length > 0) {
                            children.forEach((c) => this.htmlEntries.push(c));
                            this.setChildren(this.htmlEntries);
                        }
                    } else {
                        HTML.showErrorNotification("wrong synthesis response");
                    }
                    this.progressBar.stop();
            });
        } */
    }

    /* SYNTHESIS
    export class SynthesisCleaner
        extends TDev.AST.NodeVisitor
    {
        constructor () {
            super()
        }

        visitAction(n: TDev.AST.Action) {
            this.visitChildren(n);
            return null
        }

        visitBlock(n: TDev.AST.Block) {
            n.stmts = n.stmts.filter((s) => s.nodeType() != "comment");
            this.visitChildren(n);
        }

        visitStmt(s:TDev.AST.Stmt)
        {
            this.visitChildren(s);
            return null
        }
    } */
}

