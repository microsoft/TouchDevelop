///<reference path='refs.ts'/>

module TDev
{
    export class LibraryRefProperties
        extends CodeView
    {
        private theLibrary:AST.LibraryRef;
        constructor() {
            super()
        }
        private libraryName = HTML.mkTextInput("text", lf("library name"));
        private formRoot = div("varProps");
        private boundTo = div(null);
        private resolves = div(null);
        private renderer = new TDev.EditorRenderer();
        private rendererNoHooks = new TDev.EditorRenderer(true);
        private docs = div(null);
        private pluginsBtn:HTMLElement;

        public getTick() { return Ticks.viewLibraryRefInit; }

        public nodeType() { return "libraryRef"; }

        public init(e:Editor)
        {
            super.init(e);
        }

        private isActive() { return !!this.theLibrary; }

        static bindLibraryAsync(lib:AST.LibraryRef, s:Browser.ScriptInfo, earlyCb:()=>void = () => {})
        {
            var plugins0 = TheEditor.libPluginIds()

            lib.updateId = null;
            lib.needsUpdate = null;

            if (s.publicId) {
                lib.guid = "";
                lib.pubid = s.publicId;
                lib.rebind();
            } else if (s.getGuid()) {
                lib.guid = s.getGuid();
                lib.pubid = "";
                lib.rebind();
            } else {
                return Promise.as(); // ???
            }
            earlyCb();
            lib.notifyChange();

            var bindings = Script.editorState.libraryLocalBindings
            if (!bindings)
                Script.editorState.libraryLocalBindings = bindings = {}

            return TheEditor.libCache.loadLibAsync(lib)
                .then(() => Promise.join(!lib.resolved ? [] : lib.resolved.libraries().map((l) => TheEditor.libCache.loadLibAsync(l))))
                .then(() => Promise.join(lib.initializeResolves().map((l) => TheEditor.libCache.loadLibAsync(l))))
                .then(() => {
                    if (lib.guid)
                        bindings[lib.getStableName()] = lib.guid
                    else
                        delete bindings[lib.getStableName()]
                    TheEditor.initIds(lib, true)
                    if (lib.resolved) {
                        if (!Script.namesMatch(lib.getName(), lib.resolved.getName()))
                            // always rename library reference (regardless of auto-named)
                            lib.setName(Script.freshName(lib.resolved.getName()));
                    }
                    lib.notifyChange();
                    AST.TypeChecker.tcApp(Script);

                    var plugins1 = TheEditor.libPluginIds()
                    return TheEditor.installPluginsAsync(Object.keys(plugins1).filter(i => !plugins0.hasOwnProperty(i)))
                })
        }

        static libraryChooser(f:(s:Browser.ScriptInfo) => void)
        {
            Meta.chooseScriptAsync({
                searchPath: "scripts?count=50&q=" + encodeURIComponent("*library "),
                filter: (s) => s.isLibrary(),
                header: lf("choose library"),
            }).done((s) => {
                if (s) f(s)
            })
        }

        public bindLibraryHere(s:Browser.ScriptInfo)
        {
            LibraryRefProperties.bindLibraryAsync(this.theLibrary, s)
                .done(() => { this.syncAll(true) });
        }

        private rebind()
        {
            LibraryRefProperties.libraryChooser((s) => this.bindLibraryHere(s))
        }

        private syncAll(tc = true)
        {
            this.libraryName.value = this.theLibrary.getName();
            var bind = null;
            if (this.theLibrary.resolved) {
                var box = DeclRender.mkBox(this.theLibrary.resolved);
                (<any>box).theDesc.setChildren([this.theLibrary.pubid ? "published :: /" + this.theLibrary.pubid: "(local)"]);
                bind = box.withClick(() => this.rebind());
            } else
                bind = HTML.mkButton(lf("nothing; bind it!"), () => this.rebind());
            this.boundTo.setChildren([bind]);

            if (tc) {
                this.theLibrary.notifyChange();
                AST.TypeChecker.tcApp(Script);
                TheEditor.queueNavRefresh();
            }

            this.docs.setChildren(ScriptProperties.libraryDocs(this.theLibrary.resolved, this.theLibrary.getName(), true));

            this.resolves.setChildren([this.renderer.declDiv(this.theLibrary), this.rendererNoHooks.renderLibSignatures(this.theLibrary)]);
            this.renderer.attachHandlers();
            this.pluginsBtn.style.display = this.pluginIds().length > 0 ? "inline-block" : "none"
        }

        private pluginIds()
        {
            if (this.theLibrary.resolved)
                return Object.keys(this.theLibrary.resolved.imports.touchDevelopPlugins)
            return []
        }

        private rebindResolve(r:AST.ResolveClause)
        {
            var m = new ModalDialog()
            var boxes = []

            Script.librariesAndThis().forEach((l) => {
                boxes.push(DeclRender.mkBox(l).withClick(() => {
                    r.defaultLib = l;
                    m.dismiss();
                    this.syncAll();
                }));
            });

            m.choose(boxes);
        }

        private rebindKind(k:AST.KindBinding)
        {
        }

        private rebindAction(ab:AST.ActionBinding)
        {
            var m = new ModalDialog()
            var actions = []

            var done = () => {
                m.dismiss();
                this.syncAll();
            }

            var it = new DeclEntry("set to default");
            it.description = lf("set to function named '{0}' in default library if available", ab.formalName);
            actions.push(it.mkBox().withClick(() => {
                ab.isExplicit = false;
                done();
            }));

            var addAction = (a:AST.Action) => {
                if (!ab.getSignatureError(new AST.UnificationCtx(this.theLibrary), a)) {
                    actions.push(DeclRender.mkBox(a).withClick(() => {
                        ab.isExplicit = true;
                        ab.actualLib = a.parentLibrary();
                        ab.actualName = a.getName();
                        TheEditor.initIds(ab, false)
                        done();
                    }));
                }
            }

            Script.librariesAndThis().forEach((l) => {
                l.getPublicActions().forEach(addAction);
            });

            m.choose(actions);
        }

        public nodeTap(s:AST.Stmt)
        {
            if (s instanceof AST.ResolveClause)
                this.rebindResolve(<AST.ResolveClause>s);
            else if (s instanceof AST.KindBinding)
                this.rebindKind(<AST.KindBinding>s);
            else if (s instanceof AST.ActionBinding)
                this.rebindAction(<AST.ActionBinding>s);
            else
                return false;

            return true;
        }

        public renderCore(a:AST.Decl) { return this.load(<AST.LibraryRef>a); }

        private load(a:AST.LibraryRef) :void
        {
            this.theLibrary = null;
            TheEditor.dismissSidePane();
            this.theLibrary = a;

            this.formRoot.setChildren(<any[]>[
                                  Editor.mkHelpLink("libraries"),
                                  div("varLabel", lf("library reference")),
                                  div("varHalf",
                                    div("formHint", lf("known here as:")),
                                    this.libraryName),
                                  div("varHalf",
                                    div("formHint", lf("binds to script:")),
                                    this.boundTo),
                                  ActionProperties.copyCutRefs("the current library reference", this.theLibrary),
                                  TheEditor.widgetEnabled("editLibraryButton") ? HTML.mkButton(lf("edit library"), () => this.editLib()) : null,
                                  this.pluginsBtn = HTML.mkButton(lf("reinstall plugins"), () => this.reinstallPlugins()),
                                  this.docs,
                                  this.resolves
                                  ]);
            this.editor.displayLeft([this.formRoot]);
            this.libraryName.blur(); // prevent keyboard popup on iOS
            this.syncAll(false);
        }

        private reinstallPlugins()
        {
            TheEditor.installPluginsAsync(this.pluginIds()).done()
        }

        static editLibrary(lib:AST.LibraryRef, f:()=>void, declId = "")
        {
            var guidPromise: Promise;

            var g = lib.guid
            if (g) guidPromise = Promise.as(g)
            else if (lib.pubid) {
                var pre = Promise.as()
                if (ScriptCache.forcedUpdate(lib.pubid))
                    pre = ModalDialog.askAsync(
                       lf("If you edit one of the system libraries, they will not be auto-updated and your script might not work correctly in future."), 
                       lf("edit anyway"), false, lf("danger zone"))
                guidPromise = 
                    pre.then(() => Browser.TheApiCacheMgr.getAsync(lib.pubid, true))
                    .then((info: JsonScript) => World.installPublishedAsync(lib.pubid, info.userid))
                    .then((hd: Cloud.Header) => hd.guid);
            }
            else {
                HTML.showErrorNotification("You need to bind the library first.")
                return;
            }

            guidPromise.then((guid: string) => {
                lib.pubid = "";
                lib.guid = guid;
                lib.notifyChange();
                f()
                return Editor.updateEditorStateAsync(guid, st => {
                        if (Script)
                            st.parentScriptGuid = Script.localGuid
                    })
                    .then(() => TheEditor.loadHash(["", guid, declId]))
            })
            .done()
        }

        private editLib()
        {
            LibraryRefProperties.editLibrary(this.theLibrary, () => this.syncAll())
        }

        public commit()
        {
            if (!this.theLibrary) return;

            if (this.theLibrary.getName() != this.libraryName.value) {
                this.theLibrary.wasAutoNamed = false;
                this.theLibrary.setName(Script.freshName(this.libraryName.value));
            }
            this.theLibrary.notifyChange();
            TheEditor.queueNavRefresh();
        }
    }
}

