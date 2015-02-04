///<reference path='refs.ts'/>

module TDev
{
    export class ScriptNav
        extends SideTab
    {
        constructor() {
            super()
        }
        public icon() { return "svg:script,black"; }
        public name() { return "script"; }
        public keyShortcut() { return "Ctrl-S"; }
        public getTick() { return Ticks.sideScript; }
        public phoneFullScreen() { return true }

        private selectedOne:AST.Decl;

        public htmlForDecl(d:AST.Decl)
        {
            return this.htmlEntries.filter(i => (<any> i).theNode == d)[0]
        }

        public getSelected() {
            return this.selectedOne;
        }

        public setSelected(d:AST.Decl)
        {
            if (!d) return;

            var sel:HTMLElement = null;
            this.htmlEntries.forEach((i) => {
                var decl:AST.Decl = (<any> i).theNode;
                i.setFlag("errors", decl instanceof AST.Decl && decl.hasErrors())
                i.setFlag("warnings", decl instanceof AST.Decl && decl.hasWarnings())
                var isCurr = decl == d;
                if (isCurr) 
                    sel = i;
                i.setFlag("selected", isCurr);
            })

            if (!!sel) {
                Util.ensureVisible(sel);
                this.selectedOne = d;
                this.saveState();
            } else {
                this.selectedOne = null;
            }
        }

        public previousDecl(d:AST.Decl)
        {
            var prev:AST.Decl = Script;

            var fnd = false;
            this.htmlEntries.forEach((i) => {
                if (fnd) return;
                var n = (<any>i).theNode;
                if (n == d) fnd = true;
                else if (n instanceof AST.Decl)
                    prev = n;
            })
            return prev;
        }

        private updateErrorStatus()
        {
        }

        static publishScript(noDialog = false, screenshotDataUri : string = null, app:AST.App = null)
        {
            if (!app) app = Script

            TheEditor.saveStateAsync({ forReal: true }).then(() => {
                TheEditor.queueNavRefresh();
                World.getInstalledHeaderAsync(app.localGuid).then((h: Cloud.Header) => {
                    if (h.status == "published") {
                        HTML.showProgressNotification(lf("already published"))
                        return Promise.as();
                    }
                    var info = Browser.TheHost.createInstalled(h)
                    return info.publishAsync(false, noDialog, screenshotDataUri);
                }).done(() => {
                    if (TheEditor.stepTutorial) TheEditor.stepTutorial.notify("publish");
                }, e => {
                    if (TheEditor.stepTutorial) TheEditor.stepTutorial.notify("publish");
                });
            })
        }

        static shareScript() {
            World.getInstalledHeaderAsync(Script.localGuid).then((h:Cloud.Header) => {
                if (h.status == "published") {
                    var info = Browser.TheHost.createInstalled(h);
                    info.share();
                }
            })
        }

        static addSideButton(d:HTMLElement, btn:HTMLElement)
        {
            btn.className += " navItem-button";
            d = div(null, d, btn);
            d.style.position = "relative";
            return d;
        }

        private goToDecl(decl:AST.Decl)
        {
            if (!Script) return;
            tick(Ticks.sideScriptGoToDecl);
            if (decl instanceof AST.App && decl != Script) {
                var guid = (<AST.App>decl).localGuid
                if (guid)
                    this.editor.loadHash(["", guid, ""])
            } else {
                this.editor.dismissSidePane();
                this.editor.renderDecl(decl);
            }
        }

        private scriptButtons(app:AST.App, isParent:boolean, hasParent:boolean)
        {
            var r = div("scriptButtons");
            if (!app) return r // ???

            var onlyParent = isParent || !hasParent

            var addBtn = (d:HTMLElement) => {
                d.className += " navItem-button";
                r.appendChild(d);
            }
            if (!isParent && app.isDocsTopic())
                addBtn(HTML.mkRoundButton("svg:movie,black", lf("preview"), Ticks.sidePreview, () => { 
                    var topic = HelpTopic.fromScript(app)
                    var d = 
                    elt('leftPaneContent').setChildren([ 
                        topic.render(e => {
                            Browser.TopicInfo.attachCopyHandlers(e);
                            World.getInstalledHeaderAsync(Script.localGuid).then((h: Cloud.Header) => {
                                if (h.status == "published" && (dbg || h.userId == Cloud.getUserId())) {
                                    HTML.showProgressNotification(lf("loading analytics..."), true, 0, 1000);
                                    var pro = HTML.mkProgressBar(); pro.start();
                                    e.insertBefore(pro, e.firstElementChild);
                                    Cloud.getPublicApiAsync(h.scriptId + "/progressstats")
                                        .done((progress: JsonProgressStats) => {
                                            pro.stop(); pro.removeSelf();
                                            var steps: StringMap<JsonProgressStep> = {};
                                            var lastStep : JsonProgressStep = undefined;
                                            progress.steps.forEach(s => steps[s.index] = s);
                                            var elts = e.getElementsByClassName("stepid")
                                            for (var i = 0; i < elts.length; ++i) {
                                                    (() => {
                                                        var e = <HTMLElement>elts[i]
                                                        var index = e.getAttribute('data-stepid') || e.innerText;
                                                        var step = steps[index];
                                                        if (step) {
                                                            var sp = HTML.span("");
                                                            sp.innerText = Util.fmt('{0}{1} users ({2:%}), ~{3:f1.1}s, dialog ~{4:f1.1}s, play ~{5:f1.1}s',
                                                                step.count,
                                                                lastStep ? Util.fmt(' {0:%}', (step.count - lastStep.count) / lastStep.count) : '',
                                                                step.count / progress.count,
                                                                step.medDuration <= 0 ? 0 : step.medDuration,
                                                                step.medModalDuration <= 0 ? 0 : step.medModalDuration,
                                                                step.medPlayDuration <= 0 ? 0 : step.medPlayDuration);
                                                            e.appendChild(sp);
                                                            lastStep = step;
                                                        }
                                                    })()
                                            }
                                        }, e => {
                                            pro.stop(); pro.removeSelf();
                                            Util.log('failed to retreive progress info');
                                        });
                                }
                            })
                        }),
                        HTML.mkButton(lf("for print/email"), () => {
                            topic.print()
                        }),
                        dbg ? HTML.mkButton(lf("for newsletter"), () => {
                            topic.printNewsletter()
                        }) : null
                    ])
                }));

            if (!isParent && TheEditor.widgetEnabled("updateButton") &&
                (TheEditor.scriptUpdateId || TheEditor.librariesNeedUpdate()))
                addBtn(HTML.mkRoundButton("svg:Recycle,black", lf("update"), Ticks.sideUpdate, () => {
                    TheEditor.updateScript();
                }));
			if (!isParent && TheEditor.widgetEnabled("splitButton") && SizeMgr.canSplitScreen())
				addBtn(HTML.mkRoundButton("svg:Split,black", lf("split"), Ticks.sideSplit, () => { 
                    TheEditor.setSplitScreen(!SizeMgr.splitScreenRequested, true)
				}));
            if (onlyParent && TheEditor.widgetEnabled("logsButton"))
                addBtn(HTML.mkRoundButton("svg:CommandLine,black", lf("logs"), Ticks.sideLogs, () => {
                    TheEditor.showAppLog(app);
                }));
            if (!isParent && TheEditor.widgetEnabled("errorsButton"))
                addBtn(HTML.mkRoundButton("svg:SmilieSad,black", lf("errors"), Ticks.sideErrors, () => {
                    TheEditor.searchFor(":m");
                }));

            if (onlyParent && isBeta && TheEditor.widgetEnabled("deployButton") && 
                (Azure.getWebsiteAuthForApp(app) || app.usesCloudLibs() || Script.usesCloudLibs())) {
                addBtn(HTML.mkRoundButton("svg:cloudupload,black", lf("deploy"), Ticks.sideDeployWebSite, () => {
                    var wa = Azure.getWebsiteAuthForApp(app)

                    var recompile = Promise.as()
                    if (app != Script)
                        recompile =
                            TheEditor.saveStateAsync({ forReal: true })
                            .then(() => AST.loadScriptAsync(World.getAnyScriptAsync, app.localGuid))
                            .then(res => {
                                Script.editorState = app.editorState
                                Script.localGuid = app.localGuid
                                app = Script
                                TheEditor.parentScript = Script
                                Script = res.prevScript
                            })

                    recompile
                    .then(() => AppExport.deployLocalWebappAsync(app, wa))
                    .then(
                        () => AppExport.showStatus(wa),
                        err => {
                            if (app == Script)
                                AppExport.setupAzure()
                            else
                                ModalDialog.info(lf("deployment not configured"),
                                        lf("Go to the main script and try to deploy from there."))
                        })
                    .done()
                }));
            }

			if (!isParent && TheEditor.widgetEnabled("pluginsButton"))
				addBtn(HTML.mkRoundButton("svg:plug,black", lf("plugins"), Ticks.sidePlugins, () => { 
                    Plugins.runPlugin();
				}));
            if (!isParent && app.hasTests() && TheEditor.widgetEnabled("runTestsButton"))
                addBtn(HTML.mkRoundButton("svg:experiment,black", lf("run tests"), Ticks.sideAllTests, () => { 
                    TestMgr.testCurrentScript()
                }));

            if (!isParent && TheEditor.debugSupported())
                addBtn(HTML.mkRoundButton("svg:bug,black", lf("debug"), Ticks.sideDebug, () => { TheEditor.runMainAction(true) }))

            r.appendChildren(Plugins.getPluginButtons("script"))

            return r;
        }

        static addAnythingVisible = false;

        public refreshCore()
        {
            if (!Script) return

            var items:HTMLElement[] = [];
            this.htmlEntries = [];

            var mainAction = Script.mainAction();
            var debugMode = TheEditor.isDebuggerMode();

            var declIt = (decl:AST.Decl) => {
                var d = DeclRender.mkBox(decl);
                (<any> d).itemIndex = items.length;
                Util.clickHandler(d, () => this.goToDecl(decl));
                d.setAttribute("data-stablename", decl.getStableName());
                this.htmlEntries.push(d);
                if (!debugMode) {
                    if (decl == mainAction || decl instanceof AST.Action) {
                        var a = <AST.Action>decl;
                        if (a.isTest()) {
                            var runbtn = HTML.mkRoundButton("svg:experiment,black", lf("test"), Ticks.sideTestOne, () => { TheEditor.runAction(decl, null, { debugging : true }) });
                            d = ScriptNav.addSideButton(d, runbtn);
                        } else if (a.isRunnable() && TheEditor.widgetEnabled("sideRunButton")) {
                            var runbtn = HTML.mkRoundButton("svg:play,black", lf("run"), Ticks.sideRun, () => { TheEditor.runAction(decl) });
                            d = ScriptNav.addSideButton(d, runbtn);
                        }
                        var participants = div("stmtParticipants", div("stmtParticipantsOverfloxBox"));
                        participants.classList.add("actionParticipants");
                        d.appendChild(participants);
                    }
                    if (decl instanceof AST.LibraryRef) {
                        var lib = <AST.LibraryRef>decl;
                        if (lib.needsUpdate && this.editor.widgetEnabled("updateButton")) {
                            var runbtn = HTML.mkRoundButton("svg:Recycle,black", lf("update"), Ticks.sideUpdateOne,
                                    () => { TheEditor.updateLibraries([lib]) });
                            d = ScriptNav.addSideButton(d, runbtn);
                        } else if (this.editor.widgetEnabled("editLibraryButton")) {
                            var runbtn = HTML.mkRoundButton("svg:edit,black", lf("edit"), Ticks.sideEditLibrary,
                                    () => { 
                                        LibraryRefProperties.editLibrary(lib, () => {})
                                    });
                            d = ScriptNav.addSideButton(d, runbtn);
                        }
                    }
                }
                items.push(d);
                return d;
            }
    
            var displayThings = (sect:ThingSection) => 
            {
                if (!sect.newName) sect.newName = sect.label.replace(/s$/, "");

                if (sect.things.length == 0) return;
				// some sections are optional in tutorials
				if (sect.tutorialHidden && sect.widget && !TheEditor.widgetEnabled(sect.widget)) return;

                items.push(div("navHeader", sect.label));

                sect.things.forEach((e:AST.Decl) => {
                    var d = declIt(e);
                    if (e.hasErrors())
                        d.setFlag("errors", true);
                });
            }

            var spacer = div("navTopSpacer");
            spacer.style.height = "1em";
            items.push(spacer);

            if (TheEditor.parentScript) {
                var parDiv = declIt(TheEditor.parentScript)

                var sharebtn = HTML.mkRoundButton("svg:cancel,black", lf("disconnect"), Ticks.sideDisconnect, 
                    () => { 
                        TheEditor.disconnectParent()
                        TheEditor.queueNavRefresh();
                    });
                (<any>parDiv).theDesc.setChildren([ "main script" ])
                parDiv = ScriptNav.addSideButton(parDiv, sharebtn);
                items[items.length - 1] = parDiv;

                if (!debugMode)
                    items.push(this.scriptButtons(TheEditor.parentScript, true, true))

                items.push(div("navHeader", lf("editing library")));
            } else {
                // items.push(div("navHeader", lf("script")));
            }

            var prog = Script;
            var progDiv = declIt(prog);

            if (ScriptEditorWorldInfo.status === "published") {
                (<any>progDiv).theDesc.appendChildren( ", /" + ScriptEditorWorldInfo.baseId);
                var sharebtn = HTML.mkRoundButton("svg:Package,black", lf("share"), Ticks.sideShare, () => { ScriptNav.shareScript() });
                progDiv = ScriptNav.addSideButton(progDiv, sharebtn);
                items[items.length - 1] = progDiv;
            } else if(!debugMode) {
                var pubbtn = HTML.mkRoundButton("svg:Upload,black", lf("publish"), Ticks.sidePublish, () => { ScriptNav.publishScript() });
                TheEditor.keyMgr.btnShortcut(pubbtn, "Ctrl-S")
                progDiv = ScriptNav.addSideButton(progDiv, pubbtn);
                items[items.length - 1] = progDiv;
            }

            if (!debugMode)
                items.push(this.scriptButtons(Script, false, !!TheEditor.parentScript));
                      

            /*
            var tp = TheEditor.clipMgr.pasteType();
            if (tp == "tokens" || tp == "block" || tp == "decls") {
                var it = new DeclEntry("paste");
                it.description = tp == "block" ? "copied lines as a new action" : "copied declaration(s)";
                it.makeIntoAddButton();
                var ee = it.mkBox();
                ee.withClick(() => { tick(Ticks.sidePaste); TheEditor.pasteNode() });
                items.push(ee);
            }
            */

            var addNode = (t:Ticks, n:AST.Decl) => 
            {
                Util.assert(!debugMode);
                tick(t);
                this.editor.addNode(n);
            }

            var addEvent = () => 
            {
                Util.assert(!debugMode);
                var mkEvent = (a:AST.Action) => {
                    var b = DeclRender.mkBox(a);
                    (<any>b).initiallyHidden = a.eventInfo.type.lowPriority;
                    return b.withClick(() => { m.dismiss(); addNode(Ticks.sideAddEvent, a); });
                }
                var m = new ModalDialog();
                var acts = api.eventMgr.availableEvents().map(mkEvent)
                m.choose(acts, { mkSeeMore: DeclEntry.mkSeeMore, header: "which kind of event to add?" });
            }

            var addLibrary = () => {
                Util.assert(!debugMode);
                LibraryRefProperties.libraryChooser((scr) => {
                    var lib = this.editor.freshLibrary();
                    tick(Ticks.sideAddLibrary);
                    Script.addDecl(lib);
                    TheEditor.bindLibrary(lib, scr)
                })
            }

            var things = prog.orderedThings();
            var actions = <AST.Action[]> things.filter((t) => t instanceof AST.Action);
            var vars = <AST.GlobalDef[]> things.filter((t) => t instanceof AST.GlobalDef);

            var normalActions = actions.filter((a) => !a.isPage() && !a.isEvent() && !a.isActionTypeDef() && !a.isTest()) 
            var byKind:StringMap<AST.Decl[]> = {}
            var unsorted = normalActions.filter(a => {
                var k = a.getExtensionKind()
                if (!k) return true
                var key = k.toString()
                if (!byKind.hasOwnProperty(key))
                    byKind[key] = []
                byKind[key].push(a)
                return false
            })

            var names = Object.keys(byKind)
            names.sort(Util.stringCompare)
            var kindSects = names.map(name => {
                return <ThingSection>{
                    label: name,
                    things: byKind[name],
                    createOne: null,
                    newName: lf("action")
                }
            })

            var sections: ThingSection[] = [
                <ThingSection>{
                    label: lf("code"),
                    things: unsorted,
                    createOne: () => [{
                        decl: (AST.blockMode || AST.legacyMode || TheEditor.stepTutorial) ? this.editor.freshAsyncAction() : this.editor.freshAction(),
                        displayName: 'action',
                        description: lf("Code that performs a specific task"),
                        tick: Ticks.sideAddAction
                    }],
                    newName: lf("action")
                }, <ThingSection>{
                    label: lf("pages"),
                    widget: "pagesSection",
                    things: actions.filter((a) => a.isPage() && !a.isTest()),
                    initiallyHidden: AST.blockMode, 
                    createOne: () => [{
                        decl: this.editor.freshPage(),
                        displayName: 'page',
                        description: lf("A user interface"),
                        tick: Ticks.sideAddPage,                        
                    }],
                }, <ThingSection>{
                    label: lf("tests"),
                    widget: "testsSection",
                    things: actions.filter(a => a.isTest()),
                    initiallyHidden: !AST.proMode,
                    createOne: () => [{
                        decl: this.editor.freshTestAction(),
                        displayName: 'test',
                        description: lf("A unit test"),
                        tick: Ticks.sideAddActionTest
                    }],
                    newName: lf("test"),
                }, <ThingSection>{
                    label: lf("events"),
                    widget: "eventsSection",
                    initiallyHidden: true,
                    things: actions.filter((a) => a.isEvent() && !a.isTest()),
                    createOne: () => [{
                        decl: api.eventMgr.genericEvent(),
                        tick: Ticks.sideAddEvent,
                        displayName: 'event',
                        description: lf("Code raised when a user interaction happens")
                    }],
                    addOne: addEvent,
                }, <ThingSection>{
                    label: lf("libraries"),
                    widget: "librariesSection",
                    things: things.filter((t) => t instanceof AST.LibraryRef),
                    initiallyHidden: AST.blockMode,
                    createOne: () => [{
                        decl: this.editor.freshLibrary(),
                        displayName: 'library',
                        tick: Ticks.sideAddLibrary,
                        description: lf("A reference to a library script")
                    }],
                    addOne: addLibrary,
                    newName: lf("lib"),
                    tutorialHidden: true
                }, <ThingSection>{
                    label: lf("data"),
                    widget: "dataSection",
                    initiallyHidden: AST.blockMode,
                    things: vars.filter((v) => !v.isResource),
                    // Unknown triggers set kind dialog immedietely - tutorial doesn't support it
                    createOne: () => [{
                        decl: this.editor.freshVar((AST.blockMode || TheEditor.stepTutorial) ? api.core.Number : api.core.Unknown),
                        tick: Ticks.sideAddVariable,
                        displayName: 'data',
                        description: lf("A global variable")
                    }],
                    newName: lf("global variable"),
                }, <ThingSection>{
                    label: lf("art"),
                    widget: "artSection",
                    things: vars.filter((v) => v.isResource),
                    createOne: () => [
                        { decl: this.editor.freshPictureResource(), displayName: 'picture resource', tick: Ticks.sideAddResource, description: lf("A picture from the web") },
                        { decl: this.editor.freshSoundResource(), displayName: 'sound resource', tick: Ticks.sideAddResource, description: lf("A sound from the web")},
                        { decl: this.editor.freshArtResource("String", "str"), initiallyHidden: true, displayName: 'string resource', tick: Ticks.sideAddResource, description: lf("Embeded text or downloaded from the web")},
                        { decl: this.editor.freshArtResource("Color", "col"), initiallyHidden: true, displayName: 'color resource', tick: Ticks.sideAddResource, description: lf("A color constant")},
                        { decl: this.editor.freshArtResource("Number", "n"), initiallyHidden:true, displayName: 'number resource', tick: Ticks.sideAddResource, description: lf("A number constant") }
                    ],
                    newName: lf("art resource")
                }, <ThingSection>{
                    label: lf("records"),
                    widget: lf("recordsSection"),
                    things: things.filter((t) => t instanceof AST.RecordDef && !(<AST.RecordDef>t).isModel),
                    createOne: () => [
                        { decl: this.editor.freshObject(), displayName: 'object', initiallyHidden: AST.blockMode, tick: Ticks.sideAddObject, description: lf("A row of data") },
                        { decl: this.editor.freshTable(), displayName: ' ', initiallyHidden: AST.blockMode || AST.legacyMode, tick: Ticks.sideAddTable, description: lf("A table of user-defined rows")},
                        { decl: this.editor.freshIndex(), displayName: '  ', initiallyHidden: AST.blockMode || AST.legacyMode, tick: Ticks.sideAddIndex, description: lf("An indexed table of user-defined rows")}
                   ],
                }, <ThingSection>{
                    label: lf("action types"),
                    widget: lf("actionTypesSection"),
                    initiallyHidden: !AST.proMode,
                    things: things.filter((t) => t instanceof AST.Action && (<AST.Action>t).isActionTypeDef()),
                    createOne: () => [{
                        decl: this.editor.freshActionTypeDef(),
                        tick: Ticks.sideAddActionTypeDef,
                        displayName: 'callback',
                        description: lf("A signature definition of an action")
                    }],
                }, 
            ]

            var c = sections.shift()
            sections = [c].concat(kindSects).concat(sections)

            function addNew() {
                Util.assert(!debugMode);
                var m = new ModalDialog();
                var boxes = [];

                m.onDismiss = () => {
                    ScriptNav.addAnythingVisible = false;
                    Util.setTimeout(100, () => TheEditor.updateTutorial())
                };
                
                sections.forEach((sect) => {
                    if (!sect.createOne) return
                    sect.createOne().forEach((ds, i) => {
                        // d.setName(sect.newName
                        var d = ds.decl;
                        var dname = (d instanceof AST.RecordDef) ? (<AST.RecordDef> d).getCoreName() : d.getName();                    
                        d.setName(ds.displayName);
                        var b = DeclRender.mkBox(d);
                        boxes.push(b);
                        (<any>b).theDesc.setChildren(ds.description);
                        (<any>b).initiallyHidden = !!sect.initiallyHidden || !!(<any>ds).initiallyHidden;
                        HTML.setTickCallback(b, ds.tick, () => {
                            m.dismiss();
                            d.setName(dname);
                            if (sect.addOne) sect.addOne(d)
                            else addNode(ds.tick, d);
                        });
                    })
                })
                ScriptNav.addAnythingVisible = true;
                m.choose(boxes, {
                    header: lf("create a new ..."),
                    mkSeeMore: DeclEntry.mkSeeMore,
                    includeSearch: true,
                });
                TheEditor.updateTutorial()
            }

            if (!debugMode && TheEditor.widgetEnabled("addNewButton")) {
                var e = new DeclEntry(lf("add new action, event, ..."));
                e.makeIntoAddButton();
                e.description = lf("or event, variable, library reference, record")
                var ee = e.mkBox();
                HTML.setTickCallback(ee, Ticks.sideAddAnything, addNew);
                items.push(ee);
                this.htmlEntries.push(ee);
            }

            sections.forEach(displayThings)

            items.push(EditorSettings.changeSkillLevelDiv(this.editor, Ticks.changeSkillScriptExplorer, "formHint marginBottom marginTop"));

            this.setChildren(items);

            this.setSelected(this.editor.lastDecl);

            TipManager.update();
        }

        public navigatedTo()
        {
            super.navigatedTo();
            this.selectedOne = null;
        }

        public refresh()
        {
            if (!this.navRefreshPending && this.selectedOne != TheEditor.lastDecl)
                this.setSelected(TheEditor.lastDecl);
            super.refresh();
        }
    }

    interface DeclButton {
        decl: AST.Decl;
        displayName: string;
        description: string;
        tick: Ticks;
    }

    interface ThingSection {
        label: string;
        widget?: string;
        things: AST.Decl[];
        createOne: () => DeclButton[];
        addOne?: (d: AST.Decl) => void;
        newName?: string;
        tutorialHidden?: boolean; // specifies whether it should be hidden by default in tutorials
        initiallyHidden?: boolean; // don't show immediately in dialog
    }
}

