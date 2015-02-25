///<reference path='refs.ts'/>

module TDev
{
    export var TheEditor:Editor;
    export var TheLoadingScreen:LoadingScreen;

    export interface EditorWorldInfo {
        guid: string;
        baseId: string;
        baseUserId: string;
        status: string;
        version: number;
        baseSnapshot: string;
    }
    export interface EditorState {
        worldInfo: EditorWorldInfo;
        undoState: any;
        clipState: any;
    }
    export interface ScriptToSave {
        script: string;
        editorState: string;
        header: Cloud.Header;
    }
    export interface RecentScript {
        id:string;
        now:number;
    }
    export var ScriptEditorWorldInfo: EditorWorldInfo;



    export class EditorHost
        extends RuntimeHostBase
    {
        constructor() {
            super()
            if (Browser.localProxy)
                this.localProxyAsync = LocalShell.localProxyHandler();
        }
        public isServer = false;
        private pauseBtnDiv = div(null);
        public onStop:()=>void;
        public inLiveMode = false;
        public numExceptions = 0;
        public canEdit = true;

        public otherwiseBack()
        {
        }

        public canEditCode()
        {
            return this.canEdit;
        }

        /* override */
        public showBackButton(): boolean {
            // always show back button in debugger mode
            return super.showBackButton() || TheEditor.isDebuggerMode();
        }

        public liveMode() { return this.inLiveMode; }

        private backBtn: HTMLElement;
        private scriptBtn: HTMLElement;
        public showWall() {
            super.showWall();
            this.backBtn = <HTMLElement>this.backBtnDiv.firstChild;
            this.scriptBtn = HTML.mkRoundButton("svg:script,black", lf("back"), Ticks.wallBack, () => this.scriptBtnHandler());
        }

        public updateButtonsVisibility() {
            super.updateButtonsVisibility();
            if (!this.backBtn) return; // have not run "showWall" yet

            if (this.currentRt.debuggerStopped()) {
                this.backBtnDiv.setChildren([this.scriptBtn]);
            } else {
                this.backBtnDiv.setChildren([this.backBtn]);
            }
        }

        public wallHidden()
        {
            elt("root").setFlag("wall-visible", false);
            TheEditor.wallHidden();
        }

        public wallShown()
        {
            elt("root").setFlag("wall-visible", true);
            TheEditor.wallShown();
        }

        public initApiKeysAsync(): Promise
        {
            var rt = this.currentRt;
            var compiled = rt.compiled;

            var consent = !!rt.datas["this"]["apikeys_consent"];
            // collect all api keys
            var apiKeys = compiled.allApiKeys();
            var missingKeys = apiKeys.some(apiKey => !apiKey.value);
            if (apiKeys.length > 0 && (!consent || missingKeys)) {
                return new Promise((onSuccess, onError, onProgress) => {
                    var m = new ModalDialog();
                    m.add([
                        div("wall-dialog-header", lf("allow access to your API keys?")),
                        div("wall-dialog-body", lf("The following API keys are required to run this script. Do you allow access to this script to read to your API keys?"))
                    ]);
                    var inputs = [];
                    apiKeys.forEach((apiKey: ApiKey) => {
                        m.add(div("wall-dialog-body", HTML.mkA('', apiKey.url, '_blank', apiKey.url)));
                        var input = HTML.mkTextInput("text", lf("key value"));
                        input.value = apiKey.value || "";
                        m.add(div("wall-dialog-body", input));
                        inputs.push(input);
                    });
                    m.add(div("wall-dialog-buttons", HTML.mkButton(lf("allow"), () => {
                        m.onDismiss = null;
                        m.dismiss();
                        rt.datas["this"]["apikeys_consent"] = consent = true;
                        if (Cloud.isOnline() && Cloud.getUserId()) {
                            var promises = apiKeys.map((apiKey: ApiKey, index: number) => {
                                var value = inputs[index].value || "";
                                return (value !== apiKey.value)
                                    ? Cloud.postPrivateApiAsync("me/keys", { uri: apiKey.url, value: inputs[index].value })
                                           .then(() => { }, e => World.handlePostingError(e, lf("save key"))) : null;
                            }).filter(p => p != null);
                            if (promises.length == 0)
                                onSuccess(false);
                            else {
                                HTML.showProgressNotification(lf("saving keys..."));
                                Promise.join(promises).done(() => {
                                    HTML.showProgressNotification(lf("saving keys done."), true);
                                    onSuccess(true);
                                });
                            }
                        }
                    }),
                        HTML.mkButton(lf("cancel"), () => m.dismiss())
                    ));
                    m.add(div("wall-dialog-body", lf("Changing a value with automatically delete your script data. The API key values will automatically be stored in the cloud and are only available to you. When exporting your script to an app, the API keys are automatically embedded in the app. You can delete any of your keys by tapping on your user name in the hub and selecting the 'keys' tab.")));
                    m.onDismiss = () => onSuccess(null);
                    m.show();
                }).then((needsReload: boolean) => {
                    if (!needsReload) return Promise.as();

                    // clear state to force realoading art
                    rt.datas = {};
                    return rt.initDataAsync().then(() => {
                        rt.datas["this"]["apikeys_consent"] = consent;
                    });
                });
            }
            return Promise.as();
        }

        public tweakMsg()
        {
            var d = div("copyright-text", lf("give feedback about touchdevelop!")).withClick(Editor.showFeedbackBox)
            if (SizeMgr.phoneMode)
                Browser.setInnerHTML(d, "<span class='beta-underline'>" + lf("feedback") + "</span>");
            return d;
        }

        public additionalButtons(): HTMLElement[]{
            this.pauseBtnDiv = div("inlineBlock")
            this.updatePause()

            var btns = [this.pauseBtnDiv];
            if (ScriptEditorWorldInfo.status != "published" && TheEditor.widgetEnabled("wallLogsButton"))
                btns.push(HTML.mkRoundButton("svg:CommandLine,black", lf("logs"), Ticks.wallLogs, () => TDev.RT.App.showAppLogAsync().done()));
            return btns;
        }

        public additionalFullScreenButtons(): HTMLElement[] {
            var btns = [];
            if (ScriptEditorWorldInfo.status == "published")
                btns.push(
                    HTML.mkRoundButton("svg:camera,black", lf("screenshot"), Ticks.wallScreenshot, () => this.takeScreenshot())
                    );
            return btns;
        }

        public takeScreenshot() {
            if (ScriptEditorWorldInfo.status !== "published") {
                ModalDialog.info(lf("Oops, your script is not published"),
                                 lf("You need to publish your script in order to upload screenshots."));
                return;
            }
            if (Cloud.anonMode(lf("publishing screenshots"))) return;

            RT.ScreenshotManager.toScreenshotURLAsync(this)
                .done((data: string) => {
                    if (!data) {
                        ModalDialog.info(lf("Oops, we could not take the screenshot"),
                            lf("You are probably using a picture downloaded from the web on the board. Your web browser and the web site prevent cross-origin resource sharing (CORS)."));
                        return;
                    }

                    var contentType = data.match(/^data:(image\/(png|jpeg));base64,/i)[1];
                    Util.log('content type: ' + contentType);
                    var base64content = Util.base64EncodeToBase64(data, contentType);
                    if (base64content && base64content.length > 2000000) {
                        var m = new ModalDialog();
                        m.add([
                            div("wall-dialog-header", lf("Oops, we can't take a screenshot now")),
                            div("wall-dialog-body", lf("The encoded screenshot is too big.")),
                        ]);
                        m.show();
                    } else if (base64content && ScriptEditorWorldInfo.baseId) {
                        var previewImage = HTML.mkImg(data);
                        previewImage.setAttribute('class', 'wall-media');
                        var m = new ModalDialog();
                        m.add([
                            div("wall-dialog-header", lf("wall screenshot")),
                            div("wall-dialog-body", lf("Publish your screenshot to the cloud so that everybody can enjoy it.")),
                            div("wall-dialog-buttons",
                                HTML.mkButton(lf("publish"), () => {
                                    m.dismiss();
                                    HTML.showProgressNotification(lf("uploading screenshot..."));
                                    Cloud.postPrivateApiAsync(ScriptEditorWorldInfo.baseId + "/screenshots",
                                        {
                                            kind: "screenshot",
                                            contentType: contentType,
                                            content: base64content,
                                            userplatform: Browser.platformCaps
                                        }).then(() => {
                                            HTML.showProgressNotification(lf("screenshot uploaded"), true);
                                            Browser.Hub.askToEnableNotifications();
                                        }, e => {
                                            HTML.showProgressNotification(lf("screenshot upload failed"), true);
                                            World.handlePostingError(e, lf("post screenshot"));
                                        }).done();
                                })),
                            previewImage
                        ]);
                        m.setScroll();
                        m.show();
                    } else {
                        var m = new ModalDialog();
                        m.add([
                            div("wall-dialog-header", lf("Oops, we can't take a screenshot now.")),
                            div("wall-dialog-body", lf("Unfortunately, we can only take screenshots of full screen boards.")),
                        ]);
                        m.show();
                    }
                });
        }

        public notifyStopAsync() : Promise
        {
            TheEditor.stopPlayTime();
            if (ScriptEditorWorldInfo &&
                ScriptEditorWorldInfo.status !== "published")
                this.takeScreenshotMaybe();
            return super.notifyStopAsync().then(v => {
                if (TheEditor.stepTutorial) TheEditor.stepTutorial.notify("runStop");
                if (this.currentRt.headlessPluginMode &&
                    this.currentRt.runningPluginOn &&
                    TheEditor.forceReload) {
                    TheEditor.forceReload = false;
                    TheEditor.reloadScriptAsync(this.currentRt.runningPluginOn, () => Util.setHash("hub", true))
                    .done(() => TheEditor.pluginCompleted())
                }
                this.inLiveMode = false;
                var f = this.onStop
                this.onStop = null
                if (f) f()
                return v
            })
        }

        public exceptionHandler(e:any)
        {
            this.numExceptions++
            if (!this.inLiveMode)
                super.exceptionHandler(e)
        }

        public notifyRunState()
        {
            Util.log('editor: notifyRunState');
            super.notifyRunState();
            this.updatePause();

            if (this.currentRt.isStopped() && TheEditor.isDebuggerMode()) {
                if (this.currentRt.getStackTrace().length > 0) TheEditor.leaveDebuggerMode();
                TheEditor.updateDebuggerButtons(true);
            }

            if (this.currentRt.isStopped())
                TheEditor.setupPlayButton(); // may have to transition from resume button to play button

            // Update edit mode. (When live mode, updateEditMode is called in SideEditorHost.notifyStopAsync())
            if (!this.currentRt.liveMode())
                LayoutMgr.instance.updateEditMode(this.currentRt);

            // take screenshots periodically
            var takePoll = () => {
                if (this.takeScreenshotMaybe())
                    Util.setTimeout(TheEditor.hasLastScreenshot() ? 5000 : 3000, takePoll);
            }
            if (ScriptEditorWorldInfo &&
                ScriptEditorWorldInfo.status !== "published")
                Util.setTimeout(2000, takePoll);
        }

        private takeScreenshotMaybe() : boolean {
            if (this.currentRt && !this.currentRt.isStopped()) {
                if (!TheEditor.hasLastScreenshot() || Math.random() < 0.4) {
                    var canvas = this.toScreenshotCanvas();
                    if (canvas)
                        TheEditor.setLastScreenshot(canvas);
                }
                return true;
            }
            return false;
        }

        public notifyBreakpointHit(bp: string) {
            Util.log('editor: notifyBreakpointHit: ' + bp);
            //if (dbg) HTML.showProgressNotification(lf("breakpoint hit!"))

            this.justConcealTheWall();
            var node = Script.findAstNodeById(bp);
            if (!node) return;

            Util.assert(node.node instanceof AST.Stmt);

            TheEditor.updateStackAndCoverage();
            TheEditor.setRunningStmt(<AST.Stmt>node.node);
            TheEditor.clearTempBreakpoints();
        }
        public notifyBreakpointContinue() {
            Util.log('editor: notifyBreakpointContinue');
            //if(dbg)  HTML.showProgressNotification(lf("script continues!"))

            TheEditor.updateStackAndCoverage();
            TheEditor.setRunningStmt(null);
            //TheEditor.clearTempBreakpoints();
            this.justShowTheWall();
        }

        public notifyTutorial(cmd: string) {
            if (TheEditor.stepTutorial)
                TheEditor.stepTutorial.notify(cmd);
        }

        private updatePause()
        {
            var heart: HTMLElement = undefined;
            var pause: HTMLElement;
            if (TheEditor.isDebuggerMode()) {
                if (this.currentRt.isStopped()) {
                    pause = HTML.mkRoundButton("svg:play,black", lf("re-run"), Ticks.wallRun, () => this.runBtnHandler())
                } else if (this.currentRt.debuggerStopped()) {
                    pause = HTML.mkRoundButton("svg:play,black", lf("continue"), Ticks.debuggerContinue, () => this.debuggerContinueBtnHandler())
                } else {
                    pause = HTML.mkRoundButton("svg:pauseSq,black", lf("pause"), Ticks.debuggerPauseWall, () => this.debuggerPauseBtnHandler())
                }
            } else if (this.currentRt.isStopped()) {
                if (this.currentRt.canResume())
                    pause = HTML.mkRoundButton("svg:resume,black", lf("resume"), Ticks.wallResume, () => this.resumeBtnHandler())
                else
                    pause = HTML.mkRoundButton("svg:play,black", lf("re-run"), Ticks.wallRun, () => this.runBtnHandler())
            } else {
                if (!TheEditor.stepTutorial && this.currentRt.canPause())
                    pause = HTML.mkRoundButton("svg:pauseSq,black", lf("pause"), Ticks.wallPause, () => this.pauseBtnHandler())
                else
                    pause = HTML.mkRoundButton("svg:stop,black", lf("stop"), Ticks.wallStop, () => this.stopBtnHandler())
            }
            if (!TheEditor.isDebuggerMode() && this.currentRt.currentScriptId) {
                heart = div('');
                heart.style.display = 'inline-block';
                TDev.Browser.ScriptInfo.setupLike(this.currentRt.currentScriptId, (s, h, f) => {
                    var btn: HTMLElement;
                    if (s < 0)
                        btn = HTML.mkRoundButton("svg:wholeheart,black", h, Ticks.wallAddHeart, f);
                    else
                        btn = HTML.mkRoundButton("svg:brokenheart,black", h, Ticks.wallRemoveHeart, f);
                    if (Math.abs(s) < 2) btn.setFlag("working", true);
                    heart.setChildren([btn]);
                });
            }
            this.pauseBtnDiv.setChildren([heart, pause]);
            this.currentRt.applyPageAttributes();
            //keyMgr.btnShortcut(pause, "Esc");
        }


        private pauseBtnHandler()
        {
            var pause = HTML.mkRoundButton("svg:stop,black", lf("stop"), Ticks.wallStopForce, () => this.stopBtnHandler())
            pause.setFlag("working", true);
            this.pauseBtnDiv.setChildren([pause]);
            this.currentRt.pauseExecution();
        }

        private debuggerPauseBtnHandler()
        {
            TheEditor.debuggerTriggerPause();
            this.updatePause();
        }

        private debuggerContinueBtnHandler() {
            this.updatePause();
            TheEditor.debuggerContinue();
        }

        private stopBtnHandler()
        {
            if(TheEditor.isDebuggerMode()) {
                TheEditor.leaveDebuggerMode();
            } else this.currentRt.stopAsync().done();
        }

        private resumeBtnHandler()
        {
            TheEditor.resumeAction()
        }

        private runBtnHandler()
        {
            TheEditor.rerunAction()
        }

        public justHideTheWall() {
            if (!SizeMgr.splitScreen) {
                var wallStyle = elt("wallOverlay").style;
                wallStyle.display = "none";
                // for good housekeeping
                wallStyle.opacity = "1";
                wallStyle.zIndex = "0";
                wallStyle.visibility = "visible";
            }

            this.wallVisible = false;
            elt("root").setFlag("wall-visible", false);
            TheEditor.showEditorContainer();
            this.updatePause();
        }

        public justConcealTheWall() {
            if (!SizeMgr.splitScreen) {
                var wallStyle = elt("wallOverlay").style;

                wallStyle.zIndex = "-10";
                wallStyle.visibility = "hidden";
                wallStyle.display = "block";
            }

            this.wallVisible = false;
            elt("root").setFlag("wall-visible", false);
            TheEditor.showEditorContainer();
            this.updatePause();
        }

        // it's public so the editor has access to it
        public justShowTheWall() {
            this.updatePause();
            this.updateButtonsVisibility();
            var wallStyle = elt("wallOverlay").style;

            wallStyle.opacity = "1";
            wallStyle.zIndex = "0";
            wallStyle.display = "block";
            wallStyle.visibility = "visible";

            if (!SizeMgr.splitScreen)
                this.wallVisible = true;
            elt("root").setFlag("wall-visible", true);
        }

        public scriptBtnHandler() {
            if (TheEditor.isDebuggerMode()) {
                this.justHideTheWall();
                TheEditor.updateStackAndCoverage();
                if (TheEditor.currentRt && TheEditor.currentRt.current && TheEditor.currentRt.current.pc) {
                    TheEditor.goToLocation(CodeLocation.fromNodeId(TheEditor.currentRt.current.pc));
                }
            }
        }

        public backBtnHandler() {
            if (SizeMgr.splitScreen) {
                this.currentRt.popPage()
            } else {
                Util.goBack();
            }
        }

        public attachScriptStackTrace(bug:BugReport)
        {
            if (!this.currentRt) return;
            if (!Script) return;

            var stack = "";
            this.currentRt.getStackTrace().forEach((sf) => {
                var res = Script.findAstNodeById(sf.pc);
                if (res && res.node instanceof AST.Stmt) {
                    stack += "  at: " + res.node.serialize().replace(/[\r\n]/g, " ") + "\n";
                }
            })

            if (stack)
                bug.eventTrace = stack + bug.eventTrace;
        }

        public exceptionActions(e:any)
        {
            return {
                stack: () => {
                    this.hideWallAsync().then(() => {
                        TheEditor.showStackTrace()
                    }).done();
                },

                debug: () => {
                    this.hideWallAsync().then(() => {
                        if (!TheEditor.isDebuggerMode()) TheEditor.enterDebuggerMode();
                        TheEditor.updateDebuggerButtons(true); // disable the stepping buttons, because enterDebuggerMode explicitly enables them
                        TheEditor.showStackTrace();
                    }).done();
                }
            };
        }

        public deploymentSettingsAsync(id:string):Promise {
            return Meta.deploymentSettingsAsync(this.currentRt, id)
        }

        public astOfAsync(id:string):Promise {
            return Meta.astOfAsync(this.currentRt, id);
        }

        public pickScriptAsync(mode:string, message:string):Promise {
            return Meta.pickScriptAsync(this.currentRt, mode, message);
        }

        public saveAstAsync(id:string, ast:any):Promise {
            return Meta.saveAstAsync(this.currentRt, id, ast)
        }

        public packageScriptAsync(id : string, options : TDev.AST.Apps.DeploymentOptions) : Promise {
            return Meta.packageScriptAsync(this.currentRt, id, options);
        }

        static scriptProfiledCache: { [scriptId: string]: Promise/*of Profiled*/; } = {}
        static getScriptProfiledAsync(scriptId: string): Promise { // of Profiled
            var p = EditorHost.scriptProfiledCache[scriptId];
            if (!p) EditorHost.scriptProfiledCache[scriptId] = p = Cloud.getProfiledAsync(scriptId, TDev.AST.Compiler.version);
            return p;
        }

        resetAnnotators() {
            new ProfilingResultsAnnotator(null).visitApp(Script);
            new ScriptDebuggingAnnotator(null, null, null).visitApp(Script);
        }

        public attachProfilingInfo(profilingData: AST.ProfilingDataCollection): void {
            if (!profilingData) return;

            var scriptId = this.currentRt.currentScriptId;
            if (scriptId) {
                if (this.currentRt.eventQ != null) {
                    this.currentRt.eventQ.calculateEpsInfo();
                    profilingData.minimumEps = this.currentRt.eventQ.minimumEps;
                    profilingData.maximumEps = this.currentRt.eventQ.maximumEps;
                    profilingData.averageEps = this.currentRt.eventQ.averageEps;
                }
                EditorHost.getScriptProfiledAsync(scriptId)
                    .then(profiled=> {
                        var p = profiled.count < 20 ? 1 - .90 * profiled.count / 20 : .1; // probability of uploading profiling information; this is after the probability of getting instrumented for profiling; the combined probability converges to 1%
                        if (Random.normalized() < p)
                            return Cloud.postProfilingDataAsync(scriptId, profilingData)
                                .then(() => profiled.count++);
                    })
                    .done(undefined, () => { }); // ignore network errors
            }
            if (profilingData.show) {
                this.resetAnnotators();
                new ProfilingResultsAnnotator(profilingData).visitApp(Script);
            }
        }

        static scriptCoveredCache: { [scriptId: string]: Promise/*of Covered*/; } = { }
        static getScriptCoveredAsync(scriptId: string): Promise { // of Covered
            var p = EditorHost.scriptCoveredCache[scriptId];
            if (!p) EditorHost.scriptCoveredCache[scriptId] = p = Cloud.getCoveredAsync(scriptId, TDev.AST.Compiler.version);
            return p;
        }

        public attachCoverageInfo(coverageData: CoverageData, showCoverage: boolean): void {
            if (!coverageData) return;

            var scriptId = this.currentRt.currentScriptId;
            if (scriptId)
                EditorHost.getScriptCoveredAsync(scriptId)
                    .then(covered => {
                        var p = covered.count < 90 ? .5 - .49 * covered.count / 90 : .01; // probability of uploading coverage information
                        if (Random.normalized() < p)
                            return Cloud.postCoverageDataAsync(scriptId, coverageData)
                                .then(() => covered.count++);
                    })
                    .done(undefined, () => { }); // ignore network errors

            if (showCoverage) {
                this.resetAnnotators();
                this.attachDebuggingInfo(RunBitMap.fromJSON(coverageData.astnodes), null, null);
            }
        }

        public attachDebuggingInfo(runMap: RunBitMap, stackTrace: IPackedStackTrace, errorMessage: string): void {
            if (!runMap && !stackTrace || !Script) return;

            if (Script.annotatedBy == AST.AnnotationMode.None || Script.annotatedBy == AST.AnnotationMode.Coverage) {
                new ScriptDebuggingAnnotator((!runMap || runMap.isEmpty()) ? null : runMap, stackTrace, errorMessage).visitApp(Script);
            }
        }

        public debugModeEnabled(): boolean {
            return TheEditor.debugSupported();
        }

        public publishRunHelpLink(title: string) {
            return Editor.mkHelpLink("publishing run", title);
        }

        public fixErrorIn(stableName:string, error:string)
        {
            this.hideWallAsync().then(() => {
                var decl = Script.things.filter(t => t.getStableName() == stableName)[0]
                if (decl) {
                    var loc = new CodeLocation(decl)
                    loc.stmt = AST.FindErrorVisitor.run(decl)
                    if (loc.stmt) loc.isSearchResult = true
                    TheEditor.goToLocation(loc)
                } else {
                    var m = ModalDialog.info("error in library",
                      "it appears that the error is in fact in a library. " +
                      "you need to locate the relevant library reference and tap on [edit library].")
                    m.addHTML("<b>message:</b> " + Util.formatText(error))
                    loc = new CodeLocation(<AST.Decl>Script.libraries()[0]||Script)
                    TheEditor.goToLocation(loc)
                }
            }).done();
        }
    }

    export class ProfilingResultsAnnotator
        extends AST.NodeVisitor
        {
        private maxDuration: number = 0;  // [ms]

        constructor(public profilingScriptData: AST.ProfilingDataCollection) {
            super()
        }
        visitApp(node: AST.App) {
            super.visitApp(node);
            node.annotatedBy = this.profilingScriptData ? AST.AnnotationMode.Profiling : AST.AnnotationMode.None;
            AST.ExprHolder.profilingDurationBucketSize = (this.maxDuration + 1) / AST.ExprHolder.heatmapColors.length;
        }
        visitAstNode(node: AST.AstNode) {
            return this.visitChildren(node);
        }
        visitExprHolder(node: AST.ExprHolder) {
            if (this.profilingScriptData) {
                var data = this.profilingScriptData.astnodes[node.stableId.replace(/\./g, "_")];
                if (data) {
                    node.profilingExprData = data;
                    if (data.duration > this.maxDuration)
                        this.maxDuration = data.duration;
                    return;
                }
            }
            delete node.profilingExprData;
        }
    }

    export class ScriptDebuggingAnnotator
        extends AST.NodeVisitor {
        constructor(public runMap: RunBitMap, public stackTrace: IPackedStackTrace, public errorMessage : string) {
            super()
        }
        public visitAstNode(node: AST.AstNode) {
            //if (!this.runMap && !this.stackTrace) return;
            if (!node) return;
            return this.visitChildren(node);
        }

        public visitDecl(d: AST.Decl) {
            return this.visitAstNode(d);
        }

        private definitelyVisitedCache = {};
        private definitelyVisited(id: string): boolean {
            if (!id) return;
            if (this.definitelyVisitedCache[id] !== undefined) return this.definitelyVisitedCache[id];

            var ret = (this.runMap && this.runMap.contains(id)) || (this.stackTrace && this.stackTrace.pack.some(node => node.id === id));
            this.definitelyVisitedCache[id] = ret;
            return ret;
        }

        private definitelyVisitedThisOrChildrenCache = {};
        private definitelyVisitedThisOrChildren(s: AST.Stmt): boolean {
            if (!s) return;

            var id = s.stableId;

            if (this.definitelyVisitedThisOrChildrenCache[id] !== undefined) return this.definitelyVisitedThisOrChildrenCache[id];
            // the depth level is not big, so we can just use recursion
            var ret = this.definitelyVisited(s.stableId) || s.children().some((child: AST.Stmt) => this.definitelyVisitedThisOrChildren(child));
            this.definitelyVisitedThisOrChildrenCache[s.stableId] = ret;
            return ret;
        }

        // three state return value: true if visited else false; undefined for "don't know"
        private visitedCodeBlockStart(cb: AST.Block) {
            if (this.runMap &&
                cb &&
                cb.children() &&
                (cb.children().length > 0)) {
                var firstNonComment = cb.children().filter(stmt => (stmt.nodeType() !== "comment") && !!stmt.stableId)[0];

                if (!firstNonComment) return; // the bb contains only comments, not interested

                Util.assert(!!firstNonComment.stableId); // these guys should be already jsonified

                return (this.definitelyVisited(firstNonComment.stableId));
            } else return;
        }

        private visitedCodeBlockEnd(cb: AST.Block) {
            if (this.runMap &&
                cb &&
                cb.children() &&
                (cb.children().length > 0)) {
                var lastNonComment = cb.children().filter(stmt => stmt.nodeType() !== "comment" && !!stmt.stableId).peek();

                if (!lastNonComment) return; // the bb contains only comments, not interested

                Util.assert(!!lastNonComment.stableId);  // these guys should be already jsonified

                return (this.definitelyVisited(lastNonComment.stableId));
            } else return;
        }

        private visitedCodeBlockMiddle(cb: AST.Block, stmt: AST.Stmt) {
            if (this.runMap &&
                cb &&
                cb.children() &&
                (cb.children().length > 0)) {

                var stmtIndex = -1;
                var lastVisitedIndex = -1;

                cb.children().forEach((v, ix) => {
                    if (this.definitelyVisitedThisOrChildren(v)) lastVisitedIndex = ix;
                    if (v.stableId === stmt.stableId) stmtIndex = ix;
                });

                Util.assert(stmtIndex !== -1 && lastVisitedIndex !== -1);

                return (stmtIndex <= lastVisitedIndex);
            }
        }

        public visitStmt(st: AST.Stmt) {
            super.visitStmt(st);
            delete st.debuggerRenderContext.isOnStackTrace;

            if (!this.stackTrace) return;

            var ctx = st.debuggerRenderContext;
            var id = st.stableId;

            this.stackTrace.pack.forEach(trace => {
                if (trace.id == id) ctx.isOnStackTrace = true;
            });
        }

        public visitAnyIf(iff: AST.If) {
            super.visitAnyIf(iff);

            var visitedThen = this.visitedCodeBlockStart(iff.rawThenBody);
            var visitedElse = this.visitedCodeBlockStart(iff.rawElseBody);

            var cond = iff.rawCondition;

            if (visitedThen && visitedElse) cond.debuggingData = { visited: true };
            else if (visitedThen) cond.debuggingData = { alwaysTrue: true };
            else if (visitedElse) cond.debuggingData = { alwaysFalse: true };
            else cond.debuggingData = {};
        }

        public visitWhile(loop: AST.While) {
            super.visitWhile(loop);
            loop.condition.debuggingData = {};
            if (!this.visitedStmt(loop)) return;

            if (!this.runMap) return;

            var visitedBody = this.visitedCodeBlockStart(loop.body);
            if (!visitedBody) loop.condition.debuggingData = { alwaysFalse: true };
            else loop.condition.debuggingData = { visited: true };
        }

        private visitedStmt(s: AST.Stmt) {
            if (!this.runMap) return;

            var visitedStart = this.visitedCodeBlockStart(s.parentBlock());
            var visitedEnd = this.visitedCodeBlockEnd(s.parentBlock());

            if (!visitedStart) {
                return false;
            }

            if (visitedStart && visitedEnd) {
                return true;
            }

            if (this.visitedCodeBlockMiddle(s.parentBlock(), s)) {
                return true;
            }
        }

        public visitExprStmt(s: AST.ExprStmt) {
            super.visitExprStmt(s);
            if (coalesce(this.stackTrace)(_=>_.pack)(_=>_[0])(_=>_.id)() == s.stableId) {
                s.expr.debuggingData = { visited: true, errorMessage: this.errorMessage };
            } else s.expr.debuggingData = { visited: this.visitedStmt(s) };
        }

        public visitExprHolder(node: AST.ExprHolder) { // don't go below ExprHolder level
        }

        public visitInlineActions(ia: AST.InlineActions) {
            return this.visitExprStmt(ia);
        }

        public visitApp(script: AST.App) {
            super.visitApp(script);
            if (!this.runMap && !this.stackTrace) {
                script.annotatedBy = AST.AnnotationMode.None;
            } else script.annotatedBy = AST.AnnotationMode.Coverage;
        }
    }

    export class Editor
        extends Screen {
        static localStorage = window.localStorage;
        public lastDecl: AST.Decl = null;
        public currentRt: Runtime;
        public rtEditor: RT.Editor;
        public undoMgr = new UndoMgr();
        public clipMgr = new ClipMgr();
        public historyMgr = new EditorHistoryMgr();
        public keyMgr = KeyboardMgr.instance;
        public libCache = new LibraryCache();
        public live:LiveViewMgr = new LiveViewMgr();
        private doingRefresh = false;
        public host = new EditorHost();
        private scriptForCloud: string;
        private editorStateForCloud: string;
        public runImmediately = false;
        public lastListPath = ""
        public loadDeclImmediately = "";
        public blinkElement:string;
        public rerunAction: () =>void;
        public resumeAction: () =>void;
        private backBtnDiv: HTMLElement;
        private playBtnDiv: HTMLElement;
        private debuggerModeButtons: HTMLElement[];
        public forceReload = false;
        private scriptVersions: any = {}; // guid -> Cloud.Version
        public searchBox: HTMLInputElement;
        private searchContainer = div("editorSearchContainer");
        private landscapeSearchContainer = div(null);
        private portraitSearchContainer = div(null);
        private searchButtonContainer: HTMLElement;
        private complainedAboutMissingAPIs = false;
        public scriptUpdateId = "";
        private videoContainer: HTMLElement;
        private docContainer : HTMLElement;
        private innerDocContainer:HTMLElement;
        private isReadOnly = false;
        private scriptCompiled = false;
        private tutorialId: string;
        private hadSplit = false;

        public auxRenderer = new Renderer();
        public intelliProfile:AST.IntelliProfile = null;

        public stepTutorial:StepTutorial;
        public parentScript:AST.App;
        public parentScriptHeader:Cloud.Header;

        //public wallBox: HTMLElement = null;

        public scriptNav = new ScriptNav();
        private searchTab = new SearchTab();
        private commentEditor = new CommentEditor();
        private selectorEditor = new SelectorEditor();
        private inlineActionEditor = new InlineActionEditor();
        public calculator = new Calculator();
        public debuggerControl = new ScriptDebuggerControl();
        public debuggerEditor = new ScriptDebuggerEditor();
        public debuggerNonEditor = new ScriptDebuggerNonEditor();
        public selector = new Selector();
        private actionProperties = new ActionProperties();
        private typeCheckPending = false;
        private onRestore = () => {};
        private lastEditHash = "";
        private libExtractor = new LibraryExtractor();

        public sideKeyFocus = false;
        private sideTabs: SideTab[];
        private stmtEditors: StmtEditor[];
        private currentSideTab: SideTab;
        private currentStmtEditor: StmtEditor;

        private scriptProperties = new ScriptProperties();
        private variableProperties = new VariableProperties();
        private librefProperties = new LibraryRefProperties();
        private recordProperties = new RecordDefProperties();
        private recordEditor = new RecordEditor(this.recordProperties);
        private actionView = new ActionView();
        private debuggerCodeView = new ScriptDebuggerNonCodeView();
        private currentCodeView: CodeView;
        private codeViews: CodeView[];
        private pluginProducedAnnotations:boolean;

        public codeInner: HTMLElement;
        private codeOuter: HTMLElement;
        private betaNote: HTMLElement;
        private teamElt: HTMLElement;
        public visible = false;
        private forceRefresh = false;
        private debuggerMode = false;
        public isDebuggerMode(): boolean { return this.debuggerMode; }


        // we keep the last screenshot around for publishing
        private lastScreenshotId : number;
        private lastScreenshotCanvas : HTMLCanvasElement;
        public lastScreenshotUri() : string {
            if (this.hasLastScreenshot()) {
                try {
                    return this.lastScreenshotCanvas.toDataURL('image/png');
                } catch(e) { } // CORS issues
            }
            return undefined;
        }
        public hasLastScreenshot() {
            return this.lastScreenshotId == this.undoMgr.currentId()
                && this.lastScreenshotCanvas;
        }
        public setLastScreenshot(canvas : HTMLCanvasElement) {
            this.lastScreenshotId = this.undoMgr.currentId();
            this.lastScreenshotCanvas = canvas;
        }

        public refreshScriptNav() {
            this.scriptNav.refreshCore();
        }
        public enterDebuggerMode() {
            Util.log("entering debugger mode");
            this.spyManager.onEnterDebugMode();
            this.debuggerMode = true;
            elt("editorContainer").setFlag("debuggerMode", true);
            this.refreshScriptNav();
            this.breakpoints = BreakpointCollector.collect(Script);
            this.currentRt.initBreakpoints(this.breakpoints);
            this.updateDebuggerButtons(false);
        }
        public leaveDebuggerMode() {
            Util.log("leaving debugger mode");
            this.spyManager.onLeaveDebugMode();
            this.debuggerMode = false;
            this.setRunningStmt(null);
            this.removeStackAndCoverage();

            this.debuggerControl.visualRoot.removeSelf();

            this.currentRt.stopAsync().done(() => { elt("editorContainer").setFlag("debuggerMode", false); this.scriptNav.refreshCore(); });

            this.updateDebuggerButtons(false);
            this.resetSidePane();
            this.refreshDecl();
            this.host.justHideTheWall();
        }
        public updateStackAndCoverage() {
            if (Script.annotatedBy == AST.AnnotationMode.None || Script.annotatedBy == AST.AnnotationMode.Coverage) {
                new ScriptDebuggingAnnotator(this.currentRt.getRunMap(), PackedStackTrace.buildFrom(this.getStackTrace()), null).dispatch(Script);
            }
        }
        public removeStackAndCoverage() {
            if (Script && Script.annotatedBy == AST.AnnotationMode.Coverage) {
                new ScriptDebuggingAnnotator(null, null, null).dispatch(Script);
            }
        }
        public updateDebuggerButtons(stopped: boolean) {
            this.debuggerModeButtons.forEach(btn => btn.setFlag("disabled", stopped));
        }

        private lastTapTime = 0;
        private lastTappedNode: AST.AstNode;

        private breakpoints: Hashtable = Hashtable.forStrings();
        private runningStmt: AST.Stmt;

        private spyManager: IEditorSurveyManager = new EditorSurveyManager();
        public getSpyManager() { return this.spyManager; }

        public clearTempBreakpoints() {
            Util.log("editor: clearing temporary breakpoints");
            this.clearTempBreakpointHooks.reverse().forEach(f => f());
            this.clearTempBreakpointHooks = [];
            this.currentRt.updateScriptBreakpoints();
        }
        private clearTempBreakpointHooks: any[] = [];

        public setRunningStmt(stmt: AST.Stmt) {
            if (this.runningStmt) this.runningStmt.debuggerRenderContext.isCurrentExecPoint = false;
            this.runningStmt = stmt;

            if(stmt){
                stmt.debuggerRenderContext.isCurrentExecPoint = true;
                this.goToLocation(CodeLocation.fromNodeId(stmt.stableId), false);
            } else {
                this.refreshDecl();
            }
        }

        public showAppLog(app:AST.App) {
            var logs = TDev.RT.App.logs();
            var wa = Azure.getWebsiteAuthForApp(app)
            if (wa) {
                HTML.showProgressNotification(lf("loading server logs"), true);
                AppExport.mgmtRequestAsync(wa, "info/applog,tdlog")
                    .done(resp => {
                        var addOne = (resp, suff) => {
                            logs.push(RT.App.createInfoMessage(''));
                            logs.push(RT.App.createInfoMessage('---------------------'));
                            logs.push(RT.App.createInfoMessage(wa.website + " -- server log -- " + suff));
                            logs = logs.concat(resp.applog);
                            logs.push(RT.App.createInfoMessage('---------------------'));
                            logs.push(RT.App.createInfoMessage(wa.website + " -- touchdevelop log -- " + suff));
                            logs = logs.concat(resp.tdlog);
                        }
                        if (resp.workers)
                            resp.workers.forEach(r => {
                                if (r.body && r.body.applog)
                                    addOne(r.body, r.worker)
                                else
                                    logs.push(RT.App.createInfoMessage(wa.website + " -- server log -- " + r.worker + " missing; " + r.code));
                            })
                        else addOne(resp, "")
                        TDev.RT.App.showLog(logs);
                    }, e => {
                        logs.push(RT.App.createInfoMessage(''));
                        logs.push(RT.App.createInfoMessage('--- error while retreiving web site logs ---'));
                        logs.push(RT.App.createInfoMessage(e.message || ""));
                        TDev.RT.App.showLog(logs);
                    });
            }
            else
                TDev.RT.App.showAppLogAsync().done();
        }

        public showRunningStmt() {
            var togo: string;
            if (this.runningStmt) {
                togo = this.runningStmt.stableId;
            } else {
                var stack = this.getStackTrace();
                togo = stack && stack[0] && stack[0].pc;
            }
            if (togo) this.goToLocation(CodeLocation.fromNodeId(togo));
        }

        constructor () {
            super();
        }

        static blockWidgets: StringMap<number> = {
            // edit
            addNewButton: 1,
            undoButton: 1,
            // refactoring
            fixItButton: 1,
            splitScreen: 1,
        }
        static legacyWidgets: StringMap<number> = {
            // edit
            copyPaste: 1,
            // features
            actionSettings: 1,
            publishAsHidden: 1,
            // refactoring
            promoteRefactoring: 1,
            simplify: 1,
            // ui
            splitButton: 1,
            uploadArtInSearchButton: 1,
            calcApiHelp: 1,
            sideRunButton: 1,
            scriptPropertiesManagement: 1,
            scriptPropertiesSettings: 1,
            scriptPropertiesExport: 1,
            // sections
            dataSection: 1,
            eventsSection: 1,
            artSection:1,
            librariesSection: 1,
        }
        static proWidgets: StringMap<number> = {
            //navigation
            codeSearch:1,
            findReferences: 1,
            gotoNavigation: 1,
            goToDef: 1,
            // refactorings
            moveToLibrary: 1,
            stripBlock: 1,
            // debugging
            toggleBreakpoint: 1,
            debugButton: 1,
            // ui
            publishDescription: 1,
            sendPullRequest: 1,
            // sections
            testsSection: 1,
            actionTypesSection:1,
            pagesSection: 1,
            recordsSection:1,
            // script lifecycle
            updateButton: 1,
            editLibraryButton: 1,
            errorsButton: 1,
            logsButton: 1,
            deployButton:1,
            // ui
            pluginsButton: 1,
            runTestsButton:1,
            scriptPropertiesPlatform: 1,
            scriptPropertiesInstrumentation: 1,
            scriptPropertiesData: 1,
            wallLogsButton: 1,
            // language
            async: 1,
            testAction: 1,
            lambda: 1,
        }

        public toggleWidgetVisibility(name: string, el: HTMLElement) {
            if (this.widgetEnabled(name))
                el.style.display = 'block';
            else
                el.style.display = 'none';
        }

        public widgetEnabled(name : string) : boolean {
            if (this.intelliProfile && this.intelliProfile.hasKey("tutorialWidgets"))
                return this.intelliProfile.hasKey(name)

            if (TDev.isBeta)
                Util.assert(!!Editor.blockWidgets[name] || !!Editor.legacyWidgets[name] || !!Editor.proWidgets[name], "uncategorized widget " + name);

            if (AST.blockMode && !Editor.blockWidgets[name])
                return false

            if (AST.legacyMode && !Editor.blockWidgets[name] && !Editor.legacyWidgets[name])
                return false;

            return true
        }

        public editedStmt(selectorOk = false):AST.Stmt
        {
            if (!selectorOk && this.currentStmtEditor == this.selectorEditor)
                return null
            if (this.currentStmtEditor)
                return this.currentStmtEditor.editedStmt()
            if (this.currentSideTab) {
                var res = this.currentSideTab.editedStmt()
                if (res) return res
            }
            if (this.currentCodeView)
                return this.currentCodeView.editedStmt()
            return null
        }

        public codeVisible()
        {
            if (!SizeMgr.phoneMode) return true;
            if (this.sidePaneVisibleNow() && this.currentSideTab && this.currentSideTab.phoneFullScreen())
                return false;
            return true;
        }

        public debugSupported() : boolean {
            return this.widgetEnabled('debugButton')
                && !/nodebugger/.test(document.URL);
        }
        public toggleBreakpoint(node: AST.Stmt) {
            if (this.isDebuggerMode() && !node.stableId) return; // crash observed in logs
            tick(Ticks.debuggerToggleBreakpoint);
            if (node.debuggerRenderContext.isBreakPoint) {
                this.removeBreakpoint(node);
            } else {
                this.addBreakpoint(node);
            }
        }
        public addBreakpoint(node: AST.Stmt) {
            node.debuggerRenderContext.isBreakPoint = true;
            this.spyManager.onAddBreakpoint(node);

            if (this.isDebuggerMode()) {
                Util.log("editor: addBreakpoint: " + node.stableId);
                var id = node.stableId;
                this.breakpoints.set(id, id);
                this.currentRt.updateScriptBreakpoints();
            }

            this.refreshDecl();
        }
        public addTemporaryBreakpoint(node: AST.Stmt) {
            Util.assert(this.isDebuggerMode());
            if (!node) return;

            Util.log("editor: addTempBreakpoint: " + node.stableId);
            var editor = this;
            var id = node.stableId;
            var bps = this.breakpoints;
            if (!bps.get(id)) this.clearTempBreakpointHooks.push(() => { bps.remove(id); });
            // else nothing changes
            bps.set(id, id);
            this.currentRt.updateScriptBreakpoints();
        }
        public removeBreakpoint(node: AST.Stmt) {
            delete node.debuggerRenderContext.isBreakPoint;
            this.spyManager.onRemoveBreakpoint(node);

            if(this.isDebuggerMode()) {
                Util.log("editor: removeBreakpoint: " + node.stableId);
                this.breakpoints.remove(node.stableId);
                this.currentRt.updateScriptBreakpoints();
                this.refreshDecl();
            }

            this.refreshDecl();
        }

        public renderDecl(decl: AST.Decl, transparent : boolean = false) {
            this.goToLocation(new CodeLocation(decl), !transparent);
        }

        public bindLibrary(lib: AST.LibraryRef, scr: Browser.ScriptInfo) {
            this.renderDecl(lib);
            this.librefProperties.bindLibraryHere(scr);
        }

        public isWallVisible(): boolean {
            return this.host.wallVisible;
        }

        public goToLocation(loc: CodeLocation, useAnim = true) {
            if (!this.currentSideTab)
                this.setupNavPane();

            this.searchTab.saveLocation();
            this.selector.clear();
            this.dismissModalPane();
            this.loadLocation(loc, useAnim);
            this.searchTab.saveLocation();
            try {
                this.refreshParticipants(true);
                // Don't wait until a statement is clicked to notify others
                // we're in a different action.
                Collab.onActivation(null);
            } catch (e) {
                Util.reportError("CollabFeature", e);
            }

            if (useAnim)
                Util.showRightPanel(this.codeOuter);
        }

        public goToLocationAndEdit(loc: CodeLocation) {
            if (loc.decl == this.lastDecl) {
                this.showOrHideLive();
                this.editNode(loc.stmt);
            } else {
                this.goToLocation(loc);
                this.editNode(loc.stmt);
            }
        }

        public currentAction() {
            if (this.lastDecl instanceof AST.Action)
                return <AST.Action> this.lastDecl;
            return null;
        }

        public displayLeft(nodes: any) {
            this.codeInner.setChildren(nodes);
        }

        public topScriptOp(f:()=>void)
        {
            ProgressOverlay.lock.done(() => {
                if (Script) f();
            })
        }

        public queueNavRefresh(typeCheck = true) {
            if (typeCheck)
                this.typeCheckPending = true;
            Util.setTimeout(1, () =>
                this.topScriptOp(() => this.refreshSideTab()))
        }

        public reload()
        {
            this.forceReload = true;
            if (!this.host.wallVisible)
                this.historyMgr.reload(HistoryMgr.windowHash())
        }

        public syncDone() {
            Ticker.dbg("syncDone");
            ProgressOverlay.lock.done(() => {
                this.getDepsVersionsAsync().done((ver) => {
                    if (!Script) return;
                    if (!Util.jsonEq(ver, this.scriptVersions)) {
                        var script = this.serializeScript();
                        if (this.scriptForCloud !== script || this.serializeState() != this.editorStateForCloud) {
                            // ignore this message while running a tutorial
                            if (!TheEditor || !TheEditor.stepTutorial)
                                HTML.showErrorNotification("local edits have overridden changes from the cloud; use version history to recover")
                            this.saveStateAsync().done();
                        } else {
                            this.reload();
                        }
                    }
                })
            })
        }

        public applySizes() {
            var pane = elt("rightPane");
            if (this.autoHide())
                pane.style.display = "none";
            else
                pane.style.display = "block";
            elt("stmtEditorPane").setChildren([]);
            elt("stmtEditorPaneInner").setChildren([]);
            elt("root").setFlag("stmt-editor-visible", false)

            this.sizeSplitScreen();
            this.dismissModalPane();

            // Re-run the layouting algorithm.
            if (this.resumeAction) {
                this.currentRt.forcePageRefresh()
            }

            this.sideTabs.forEach((s: SideTab) => {
                s.applySizes();
            });
            this.stmtEditors.forEach((s) => {
                s.applySizes();
            });
            this.showDebuggerControl();

            this.placeSearchContainer();

            if (this.host) {
                this.host.publishSizeUpdate();
            }

            this.applyVideoSize();
            TipManager.update();
        }

        private placeSearchContainer() {
            this.searchContainer.removeSelf();
            if (SizeMgr.portraitMode)
                this.portraitSearchContainer.setChildren([this.searchContainer]);
            else
                this.landscapeSearchContainer.setChildren([this.searchContainer]);
        }

        public typeCheckNow()
        {
            this.typeCheckPending = false;
            AST.TypeChecker.tcApp(Script);
            if (Script.isTutorial())
                AST.Step.splitActions(Script)
            this.sideTabs.forEach((s: SideTab) => {
                s.queueNavRefresh();
            });
        }

        private refreshSideTab() {
            if (!Script) return;

            if (this.typeCheckPending)
                this.typeCheckNow();

            if (!this.visible) return;

            if (!!this.currentSideTab && this.currentSideTab.isNav()) {
                this.currentSideTab.saveState();
                this.currentSideTab.refresh();
            }
        }

        public undoLoaded() {
            this.searchTab.saveLocation();
            this.queueNavRefresh();
        }

        public screenId() { return "edit"; }

        private showOrHideLive(doShow=true)
        {
            var rt = this.currentRt;
            if (rt && rt.liveViewSupported()) {
                if (doShow) {
                    this.live.show();
                    this.live.poke();
                }
            } else {
                this.live.hide();
            }
        }

        private sizeSplitScreen()
        {
            var s = elt("editorContainer").style;
            var w = elt("wallOverlay").style
            if (SizeMgr.splitScreen) {
                s.width = SizeMgr.editorWindowWidth + "px"
                w.left = (SizeMgr.windowWidth - SizeMgr.wallWindowWidth) + "px"
            } else {
                s.width = "100%"
                w.left = "0"
            }
        }

        public showEditorContainer()
        {
            var s = elt("editorContainer").style;
            s.display = "block";
            this.sizeSplitScreen();
            this.showOrHideLive(false);
            if (this.isDebuggerMode()) this.debuggerControl.applySizes();
            this.showDebuggerControl();
        }

        public idSuffix()
        {
            return ScriptEditorWorldInfo.baseId ? ":id=" + ScriptEditorWorldInfo.baseId : ""
        }

        private setReadOnly(ro:boolean)
        {
            this.isReadOnly = ro;
            this.codeInner.style.backgroundColor = ro ? "#ffd" : "#fff";
        }

        public loadLocation(loc: CodeLocation, isLocalChange=true) {
            Ticker.dbg("Editor.loadLocation");
            if (!loc)
                return false;
            if (!loc.isLibrary && !Script.hasDecl(loc.decl))
                return false;

            this.setReadOnly(loc.isLibrary);

            var nodeType = loc.nodeType();
            if (this.isDebuggerMode() && nodeType != "action") nodeType = "debugger";

            var cv = this.codeViews.filter((cv: CodeView) => cv.nodeType() === nodeType)[0];

            if (!cv) return false;

            tick(cv.getTick());
            this.spyManager.onView(loc && loc.decl);

            this.showEditorContainer();

            if (!!this.currentCodeView) {
                this.currentCodeView.commit();
                if(isLocalChange) this.undoMgr.pushMainUndoState();
                this.updateWorldInfoStatus();
            }
            //if(this.currentCodeView != cv) {
                //if(nodeType === "app") {
                    //Util.log(">>> CLOSING CODE EDITOR");
                    //TDev.Collab.stopCollab();
                //} else {
                    //Util.log(">>> OPENING CODE EDITOR");
                    //TDev.Collab.startCollab();
                //}
            //}
            this.currentCodeView = cv;
            this.selector.setSelected(null);
            this.sideKeyFocus = false;
            if (this.lastDecl != loc.decl) {
                Script.setStableNames();
                var scr = Script;
                this.onRestore = () => {
                    setGlobalScript(scr);
                    this.host.hideWallAsync().done(() => {
                        this.showEditorContainer();
                        this.lastEditHash = "edit:" + Script.localGuid + ":" + loc.decl.getStableName() + this.idSuffix()
                        this.historyMgr.setHash(this.lastEditHash, Script.getName() + " :: " + loc.decl.getName())
                        this.setSplitScreen(this.hadSplit)
                    })
                };
                this.onRestore();
            }
            this.lastDecl = loc.decl;
            if (this.currentSideTab == this.scriptNav) {
                this.scriptNav.setSelected(loc.decl)
            }
            cv.loadLocation(loc);
            this.showOrHideLive();
            this.updateTutorial();
            Util.setTimeout(1, () => { this.refreshSideTab() });
            return true;
        }

        private setHash() {
        }

        public currentLocation() {
            if (!!this.currentCodeView) return this.currentCodeView.saveLocation();
            return null;
        }

        public refreshDecl() {
            Ticker.dbg("Editor.refreshDecl");
            this.showDebuggerControl();
            if (this.doingRefresh || !this.lastDecl || !Script) return;
            try {
                this.doingRefresh = true;
                if (Util.cloudRun) {
                    var a = this.currentAction();
                    // reset the canBeOffloadedCache
                    if (a) a.canBeOffloadedCache = AST.CanBeOffloadedState.Unknown;
                }
                this.currentCodeView.render(this.lastDecl);

                // This destroys all of our collaboration info, so we need to
                // recreate it.
                try {
                    this.refreshParticipants(true);
                } catch (e) {
                    Util.reportError("CollabFeature", e);
                }

                // when editing an action, the offload flag of the action may change. Need to refresh the side tab.
                if (Util.cloudRun && this.currentSideTab) {
                    this.currentSideTab.navRefreshPending = true;
                    this.currentSideTab.refresh();
                }
                this.updateTutorial()
            } finally {
                this.doingRefresh = false;
            }
        }

        public showCurrentJs(opts: AST.CompilerOptions = {})
        {
            this.recompileScript(opts);
            ModalDialog.showText(this.currentRt.compiled.getCompiledCode());
        }

        // private fib(x:number) { return x < 2 ? x : this.fib(x-1) +this.fib(x-2); } private ff;


        public getCurrentAuthorId():string  {
            var x = Cloud.getUserId() || ""
            if (ScriptEditorWorldInfo.status === "published") {
                x = ScriptEditorWorldInfo.baseUserId;
                if (!x)
                    throw new Error("Could not determine the user id of the script owner; status = " + ScriptEditorWorldInfo.status);
            }
            return x;
        }
        public getCurrentScriptId(): string {
            return ScriptEditorWorldInfo.status === "published" ? ScriptEditorWorldInfo.baseId : Script.localGuid;
        }
        public getBaseScriptId(): string {
            return ScriptEditorWorldInfo.baseId || "unknown";
        }

        public compileScript(app:AST.App, opts:AST.CompilerOptions = {})
        {
            AST.TypeChecker.tcApp(app)
            var cs:CompiledScript;

            Util.time("compile", () => {
                var newOpts: AST.CompilerOptions = {
                    optimizeLoops: /optimizeLoops/.test(document.URL),
                    inlining: Browser.compilerInlining || /inlining/.test(document.URL),
                    okElimination: Browser.compilerOkElimination || /okElimination/.test(document.URL),
                    blockChaining: Browser.compilerBlockChaining || /blockChaining/.test(document.URL),
                    crashOnInvalid: /crashOnInvalid/.test(document.URL),
                    commonSubexprElim: /commonSubexprElim/.test(document.URL),
                    constantPropagation: /constantPropagation/.test(document.URL),
                    coverage: true,
                    azureSite: Azure.getDestinationAppUrl(app),
                };
                Object.keys(opts).forEach((k) => {
                    newOpts[k] = opts[k]
                })
                cs = AST.Compiler.getCompiledScript(app, newOpts, this.breakpoints);
            })

            return cs
        }

        public recompileScript(opts:AST.CompilerOptions = {})
        {
            this.scriptCompiled = true;

            this.spyManager.onCompile(Script);

            var newOpts: AST.CompilerOptions = {
                authorId: this.getCurrentAuthorId(),
                scriptId: this.getCurrentScriptId(),
                baseScriptId: this.getBaseScriptId(),
            };
            Object.keys(opts).forEach((k) => { newOpts[k] = opts[k] })

            var cs = this.compileScript(Script, newOpts)
            this.currentRt.initFrom(cs)
        }


        private _lastPlayDuration:number = undefined;
        public lastPlayDuration() : number {
            var playDurr = this._lastPlayDuration;
            this._lastPlayDuration = undefined;
            if (playDurr < 0) playDurr = undefined;
            else if (playDurr) playDurr /= 1000;
            return playDurr;
        }
        private startPlayTime() { this._lastPlayDuration = -Util.now(); }
        public stopPlayTime() {
            if (this._lastPlayDuration < 0)
                this._lastPlayDuration = Util.now() + this._lastPlayDuration;
            else
                this._lastPlayDuration = undefined;
        }

        static runCount = 0;
        public runAction(a: AST.Decl, args: any[]= null, opts: AST.CompilerOptions = {}) {
            TipManager.setTip(null); // clear any tip
            var run0 = () => {
                this.spyManager.onRunAction(<AST.Action>a);
                ProgressOverlay.lockAndShow(lf("compiling script"), () => {
                    if (!Script) {
                        ProgressOverlay.hide();
                        return;
                    }

                    var saveAndRun = () => this.saveStateAsync().done(() => {
                        if (!Script) {
                            ProgressOverlay.hide();
                            return;
                        }

                        if (!opts.profiling && TDev.RT.Perf.unit() > 0 && Math.random() < .1) {
                            opts = JSON.parse(JSON.stringify(opts));
                            opts.profiling = true;
                        }
                        if (opts.debugging) {
                            this.enterDebuggerMode();
                            if (a instanceof AST.Action) {
                                this.addTemporaryBreakpoint((<AST.Action>a).body.firstNonComment());
                            }
                        }

                        this.recompileScript(opts);
                        (<any>window).webAppName = Script.getName();
                        this.currentRt.setHost(this.host);

                        if (this.currentRt.eventQ != null)
                            this.currentRt.eventQ.profiling = opts.profiling;

                        this.runActionCore(a, args, !!opts.debugging);
                    });
                    saveAndRun()
                }, ArtUtil.artUrl(Script.splashArtId));
            };

            var run1 = () => {
                if (args == null)
                    this.currentRt.headlessPluginMode = false;
                if (args == null &&
                    a instanceof AST.Action &&
                    ((<AST.Action>a).isPlugin() || (<AST.Action>a).isButtonPlugin())
                    )
                {
                    var act = <AST.Action>a;
                    var k = act.getInParameters()[0].getKind();
                    Meta.pickScriptAsync(null, "read-write", "script for plugin to run on").done(id => {
                        if (id) {
                            Plugins.setupEditorObject(id)
                            if (k == api.core.Editor)
                                args = [this.currentRt.editorObj]
                            else
                                args = [id]
                            run0()
                        }
                    })
                    return
                }

                run0();
            };

            var run = () => {
                if (SizeMgr.splitScreen)
                    Runtime.stopPendingScriptsAsync().done(run1)
                else run1()
            };

            if (!this.stepTutorial && !TestMgr.Benchmarker.unitTimeReported()) {
                if (TDev.RT.Perf.unit() < 0) {
                    if (++Editor.runCount > 5 && Math.random() < .20) {
                        TestMgr.Benchmarker.measureUnitTimeAsync().done(() => {
                            TestMgr.Benchmarker.reportUnitTime();
                            run();
                        });
                        return;
                    }
                }
                else
                    TestMgr.Benchmarker.reportUnitTime();
            }

            if (!this.parentScript && Script.usesCloudLibs() && !Azure.getDestinationAppUrl(Script)) {
                AppExport.setupAzure()
                return
            }

            run();
        }

        private runActionCore(a:AST.Decl, args:any[], debugMode: boolean = false)
        {
            var missing = this.currentRt.compiled.missingApis;
            if (!this.complainedAboutMissingAPIs && missing.length > 0) {
                ProgressOverlay.hide();
                ModalDialog.ask("the following APIs are not implemented on the current device: " +
                                missing.join(", "),
                                lf("run anyway"),
                                () => {
                                    this.complainedAboutMissingAPIs = true;
                                    this.runAction(a, args, debugMode ? { debugging: true } : {})
                                })
                return;
            }


            if (! (a instanceof AST.Action)) a = null;
            var act = <AST.Action>a;

            var rt = this.currentRt;
            var headless = rt.headlessPluginMode

            if (!headless) {
                this.host.showWall();
                this.initPageStack();
                SizeMgr.applySizes();
            }

            this.currentRt.validatorAction = null
            this.currentRt.validatorActionFlags = null

            if (this.stepTutorial) this.stepTutorial.notify("run");

            if (act == null || (args == null && !act.isTest() && !act.isRunnable()) || !Script) {
                ProgressOverlay.hide();
                rt.postText("can't run this", rt.current ? rt.current.pc : "");
                this.rerunAction = () => {};
                this.resumeAction = () => {};
                return;
            }

            // we only support links to the main action
            var isMain = a == Script.mainAction();
            var setHash = () => {
                if (SizeMgr.splitScreen || headless) return

                if (isMain)
                    this.historyMgr.setHash("run:" + Script.localGuid + this.idSuffix(), Script.getName() + " :: run")
                else
                    this.historyMgr.setHash("run-action:" + Script.localGuid + ":" + a.getStableName() + this.idSuffix(), Script.getName() + " :: run " + a.getName())
            }
            setHash();

            this.startPlayTime();
            var name = a.getStableName();
            var runIt = () => {
                var publicId = ScriptEditorWorldInfo.status === "published" ? ScriptEditorWorldInfo.baseId : "";
                Ticker.tick(Ticks.coreRun, publicId);
                rt.currentScriptId = publicId;
                rt.baseScriptId = ScriptEditorWorldInfo.baseId || "unknown";
                if (act.isPage()) {
                    var actname = act.getName();
                    rt.run(Runtime.syntheticFrame((s) => {
                        s.rt.postAutoPage("this", actname);
                    }), []);
                } else {
                    var fn = rt.compiled.actionsByStableName[name];
                    if (!fn) {
                        ProgressOverlay.hide();
                        this.runAction(Script.mainAction(), null)
                    }
                    else
                        rt.run(fn, args);
                }
            }

            this.rerunAction = () => {
                tick(Ticks.coreRerun)
                ProgressOverlay.lockAndShow(lf("starting..."), () => {
                    if (!Script) {
                        ProgressOverlay.hide();
                        return;
                    }
                    this.recompileScript({ debugging: debugMode });
                    rt.setHost(this.host);
                    this.initPageStack();
                    runIt();
                })
            };

            this.resumeAction = () => {
                tick(Ticks.coreResume)
                setHash();
                rt.setHost(this.host);
                this.recompileScript();
                rt.resumeExecution(false);
            };

            rt.devMode = true; // ScriptEditorWorldInfo.status !== "published" || (<AST.Action>a).isTest;
            runIt()
        }

        private initPageStack()
        {
            var rt = this.currentRt;
            rt.initPageStack();
            var p = rt.getCurrentPage()
            rt.applyPageAttributes()
        }

        public gotoWall() {
            this.host.justShowTheWall();
        }

        public resumeExecution()
        {
            if (this.host.wallVisible) return;

            this.host.showWall();
            SizeMgr.applySizes();
            this.resumeAction();
        }

        public runSidePage(whenDone:()=>void)
        {
            //if (!Script.recompiler) {
            //    AST.Compiler.getCompiledScript(Script, true, this.withTracing, this.withReplaying);
            //}
            // var cs = Script.recompiledScript

            this.host.onStop = whenDone;
            this.host.inLiveMode = true;
            this.recompileScript();
            SizeMgr.applySizes();
            this.currentRt.resumeExecution(true);
        }

        static mkTopMenuItem(icon:string, name:string, tick:Ticks, key:string, f:()=>void)
        {
            var btn = HTML.mkRoundButton(icon, name, tick, f);
            TheEditor.keyMgr.btnShortcut(btn, key);
            return btn;
        }

        static goToTopic(topic:string)
        {
            var t = MdComments.shrink(topic)
            Ticker.rawTick("helpButton_" + t);
            Util.setHash("#topic:" + t)
        }

        static mkHelpButton(topic:string, lbl = "help on " + topic)
        {
            var btn = HTML.mkRoundButton("svg:Question,black", lbl, Ticks.noEvent, () => Editor.goToTopic(topic))
            btn.setAttribute("aria-label", topic);
            var r = div("float-help-button", btn);
            return r;
        }

        static mkHelpLinkBtn(topic: string, lbl = lf("read more..."))
        {
            var btn = HTML.mkLinkButton(lbl, () => Editor.goToTopic(topic))
            btn.setAttribute("aria-label", lf("learn more about {0}", topic));
            var r = div("float-help-link", btn);
            return r;
        }

        static mkHelpLink(topic:string, lbl = lf("read more..."))
        {
            var r = div("float-help-link");
            Browser.setInnerHTML(r, "<a href=\"#topic:" + MdComments.shrink(topic) + "\">" + Util.htmlEscape(lbl) + "</a>");
            r.firstElementChild.setAttribute("aria-label", lf("learn more about {0}", topic));
            HTML.fixWp8Links(r);
            return r;
        }

        public mkTabMenuItem(icon:string, name:string, key:string, t:Ticks, f:()=>void)
        {
            var btn = HTML.mkButtonElt("tabMenu-button", [
                div("tabMenu-button-frame", HTML.mkImg(icon)),
                div("topMenu-button-desc", name)
            ]);
            HTML.setTickCallback(btn, t, f);
            this.keyMgr.btnShortcut(btn, key);
            return btn;
        }

        private reloadPage()
        {
            var url = document.URL.replace( /\?id=.*/g, "");
            Util.navigateInWindow( url + "?id=" + Util.guidGen());
        }

        public pluginCompleted()
        {
            if (this.pluginProducedAnnotations)
                this.searchFor(":plugin")
        }

        public searchFor(s:string)
        {
            this.searchBox.value = s;
            this.focusSideTab(this.searchTab);
            Util.setKeyboardFocus(this.searchBox);
            this.searchTab.searchKey();
        }

        private _overridenStackTrace: IStackFrame[] = null;

        public getStackTrace() {
            if (this._overridenStackTrace) return this._overridenStackTrace;
            else return this.currentRt.getStackTrace();
        }

        public showStackFrame(sf: AST.Stmt) {
            this.showStackTraceAgain();

            var lookFor = sf.stableId;
            var trace = this.getStackTrace();
            var frames = trace.length;

            for (var i = 0; i < frames; ++i) {
                if (trace[i].pc == lookFor) {
                    this.searchTab.select(i);
                    return;
                }
            }
            this.searchTab.selectFirst();
        }

        // this version of showStackTrace does not set/reset current trace, just shows it
        public showStackTraceAgain(selectFirst: boolean = true) {
            this.searchFor(":stack");
            if (selectFirst)
            {
                this.lastDecl = null;
                this.searchTab.selectFirst();
                if (!this.lastDecl)
                    this.renderDefaultDecl();
            }
        }

        public showStackTrace(overrideTrace ?: IStackFrame[])
        {
            Ticker.dbg("Editor.showStackTrace");
            if (!this.scriptCompiled)
                this.recompileScript();
            this._overridenStackTrace = overrideTrace;
            this.showStackTraceAgain();
        }

        public findRefs(decl:AST.Decl, fld:AST.RecordField = null)
        {
            var r = "?" + AST.Lexer.quoteString(decl.getName() + (fld ? "->" + fld.getName() : ""), false)
            this.searchFor(r);
        }

        private backBtn()
        {
            /* if (!dbg && this.stepTutorial && this.stepTutorial.isActive()) {
                var m = new ModalDialog();
                m.add([
                    div("wall-dialog-header", 'take a break?'),
                    div("wall-dialog-body", 'Are you sure you want to stop editing? You can come back at any time and continue where you left off.'),
                    div("wall-dialog-buttons",
                        HTML.mkButton('cancel', () => m.dismiss()),
                        HTML.mkButton('take a break', () => {
                            m.dismiss();
                            this.goToHubAsync().done();
                        }))
                ]);
                m.show();
            } else */
            {
                this.goToHubAsync().done();
            }
        }

        /*
        public isNonTopPage()
        {
            var act = this.currentAction();
            return this.liveViewSupported() && act && act.isPage() && this.currentRt.getCurrentPage().pageName != act.stableName;
        }
        */


        public setupPlayButton()
        {
            if (this.currentRt && this.currentRt.canResume())
                this.playBtnDiv.setChildren([Editor.mkTopMenuItem("svg:resume,black", lf("resume"), Ticks.codeResume, "Ctrl-P", () => this.resumeExecution())]);
            else
                this.playBtnDiv.setChildren([Editor.mkTopMenuItem("svg:play,black", lf("run"), Ticks.codeRun, "Ctrl-P", () => this.runMainAction())]);

            this.calculator.searchApi.updateRunButton();
        }

        public setupSearchButton()
        {
            var tab:HTMLElement;
            if (this.searchBox.value)
                tab = this.mkTabMenuItem("svg:cancel,black", lf("clear"), null, Ticks.editBtnSideSearch, () => this.searchPressed())
            else if (this.autoHide() || this.currentSideTab != this.scriptNav)
                tab = this.mkTabMenuItem("svg:script,black", lf("script"), null, Ticks.editBtnSideSearch, () => this.searchPressed())
            else tab = null;
            this.searchButtonContainer.setChildren([tab])
        }

        public hasDeclList()
        {
            return !this.searchBox.value && this.sidePaneVisibleNow() && !this.currentStmtEditor && this.currentSideTab == this.scriptNav;
        }

        private searchPressed()
        {
            if (this.searchBox.value != "") {
                this.searchBox.value = ""
                this.dismissSidePane();
                return;
            }

            if (this.currentSideTab != this.scriptNav) {
                tick(Ticks.codeFocusSidePaneFull)
                this.searchBox.value = ""
                this.focusSideTab(this.scriptNav);
            } else {
                if (this.autoHide()) {
                    if (this.sidePaneVisible()) {
                        // tick(Ticks.codeCycleSidePane)
                        // this.hideSidePane();
                    } else {
                        tick(Ticks.codeFocusSidePane)
                        this.focusSideTab(this.scriptNav);
                    }
                } else {
                    tick(Ticks.codeCycleSidePaneFull)
                    this.searchBox.value = ""
                    this.dismissSidePane();
                }
            }
        }

        static mkDisablingTopMenuItem(icon: string, caption: string, tick: Ticks, shortcut: string, handler: () => any) {
            var ret = Editor.mkTopMenuItem(icon, caption, tick, shortcut, () => {
                if (!ret.getFlag("disabled")) handler();
            });
            return ret;
        }

        private updateBackButton()
        {
            this.backBtnDiv.setChildren([
                this.hasModalPane() ?
                    Editor.mkTopMenuItem("svg:back,black", lf("dismiss"), Ticks.calcSearchBack, " Esc", () => this.dismissModalPane()) :
                    TDev.noHub ? null : Editor.mkTopMenuItem("svg:back,black", lf("my scripts"), Ticks.codeHub, "Ctrl-I", () => this.backBtn())
            ])
        }

        private setupExternalButtons() {
            elt("externalEditorChrome").setChildren([
                Editor.mkTopMenuItem("svg:back,black", lf("my scripts"), Ticks.codeHub, "Ctrl-I", () => {
                    this.goToHub("list:installed-scripts:foobar:overview");
                }),
                div("tdLite", [ "TouchDevelop Lite" ])
            ])
        }

        private setupTopButtons()
        {
            this.setupExternalButtons();

            if (snapView) return;

            var splitBtn: HTMLElement = this.widgetEnabled("splitScreen") ? Editor.mkTopMenuItem("svg:split,black", lf("split"), Ticks.codeSplit, "",() => TheEditor.setSplitScreen(!SizeMgr.splitScreenRequested, true)) : null;
            if (splitBtn) splitBtn.className += " portrait-hidden split-visible";
            var top = div("topButtons",
                this.backBtnDiv = div("inlineBlock topMenu-button-container search-back"),
                this.playBtnDiv = div("inlineBlock topMenu-button-container"),
                this.widgetEnabled("undoButton") ? Editor.mkTopMenuItem("svg:undo,black", lf("undo"), Ticks.codeUndo, "Ctrl-Z",() => this.topUndo()) : null,
                splitBtn,
                this.portraitSearchContainer
                );
            this.updateBackButton();
            this.setupPlayButton();

            var debuggerExitButton = Editor.mkTopMenuItem("svg:back,black", lf("exit"), Ticks.debuggerExit, "Ctrl-I", () => this.leaveDebuggerMode());
            this.debuggerModeButtons = [
                Editor.mkDisablingTopMenuItem("svg:play,black", lf("continue"), Ticks.debuggerContinue, "Ctrl-P", () => this.debuggerContinue()),
                Editor.mkDisablingTopMenuItem("svg:stepIn,black", lf("step in"), Ticks.debuggerStepIn, "Right", () => this.debuggerStepIn()),
                Editor.mkDisablingTopMenuItem("svg:stepOver,black", lf("step over"), Ticks.debuggerStepOver, "Down", () => this.debuggerStepOver()),
                Editor.mkDisablingTopMenuItem("svg:stepOut,black", lf("step out"), Ticks.debuggerStepOut, "Up", () => this.debuggerStepOut()),
            ];

            debuggerExitButton.className += " debuggerTopButton";
            this.debuggerModeButtons.forEach(btn => btn.className += " debuggerTopButton");
            top.appendChildren([debuggerExitButton, this.debuggerModeButtons]);

            this.searchBox = HTML.mkTextInput("text", lf("Search code..."), "search");
            this.keyMgr.attach(this.searchBox);
            this.searchBox.onkeyup = () => {
                if (this.currentSideTab == this.searchTab)
                    this.searchTab.searchKey()
            };
            this.searchBox.onclick = () => {
                this.showSidePane();
                if (this.searchBox.value)
                    this.searchFor(this.searchBox.value);
            };
            this.searchButtonContainer = div("inlineBlock");
            this.setupSearchContainer();
            this.setupSearchButton()

            elt("leftBtnRow").setChildren([top]);
        }

        private setupSearchContainer() {
            this.searchContainer.setChildren(<any[]>[
                this.widgetEnabled("codeSearch") ? this.searchBox : null,
                this.widgetEnabled("codeSearch") || SizeMgr.portraitMode ? this.searchButtonContainer : null]);
            this.sidePane().setFlag("code-search", this.widgetEnabled("codeSearch"));
        }

        // it's public because it can be called by the host
        public debuggerTriggerPause() {
            Util.assert(this.isDebuggerMode());

            this.calculatePauseBreakpoints();
            this.currentRt.debuggerContinue();
        }
        public debuggerContinue() {
            Util.assert(this.isDebuggerMode());
            this.host.justShowTheWall();
            this.setRunningStmt(null);
            this.currentRt.debuggerContinue();
        }
        private debuggerStepIn() {
            this.calculateStepInBreakpoints();
            this.calculateStepOverBreakpoints();
            this.calculateStepOutBreakpoints();
            this.debuggerContinue();
        }
        private debuggerStepOut() {
            this.calculateStepOutBreakpoints();
            this.debuggerContinue();
        }
        private debuggerStepOver() {
            this.calculateStepOverBreakpoints();
            this.calculateStepOutBreakpoints();
            this.debuggerContinue();
        }

        private calculateStepInBreakpoints() {
            AST.InnerNextFinder.find(this.runningStmt).forEach(stmt => this.addTemporaryBreakpoint(stmt));
        }
        private calculateStepOverBreakpoints() {
            AST.NextFinder.find(this.runningStmt).forEach(stmt => this.addTemporaryBreakpoint(stmt));
        }
        private calculateEventAndActionBreakpoints() {
            Script.allActions().map(act => act.body.firstNonComment()).forEach(stmt => this.addTemporaryBreakpoint(stmt));
        }
        private calculatePauseBreakpoints() {
            var currentNode = Script.findAstNodeById(this.currentRt.current.pc);
            if (currentNode && currentNode.node instanceof AST.Stmt) {
                this.setRunningStmt(null); // clear the marker
                this.runningStmt = <AST.Stmt>currentNode.node; // we need only to assign the property, do not set the marker, do not draw it
                this.calculateStepOverBreakpoints();
                this.calculateStepOutBreakpoints();
            } else {
                this.calculateEventAndActionBreakpoints();
                HTML.showProgressNotification(lf("waiting for next event to happen..."));
            }
        }
        private calculateStepOutBreakpoints() {
            var topCallId = this.currentRt.current && this.currentRt.current.previous && this.currentRt.current.previous.pc;
            if (!topCallId) return;
            var r = Script.findAstNodeById(topCallId);
            if (!r) return; // TODO: Review: How can this happen?
            var topCallNode = r.node;
            if (!topCallNode || !(topCallNode instanceof AST.Stmt)) return;
            return AST.NextFinder.find(<AST.Stmt>topCallNode).forEach(stmt => this.addTemporaryBreakpoint(stmt));
        }

        public runMainAction(inDebugMode : boolean = false)
        {
            if (this.host.wallVisible) return;
            if (inDebugMode) this.spyManager.onDebug(Script);
            else this.spyManager.onRun(Script);

            this.dismissSidePane();

            if (this.isDebuggerMode()) this.leaveDebuggerMode();

            if (!Script) return;
            if (Script.isTestOnly()) {
                TestMgr.testCurrentScript();
            } else {
                var a = Script.mainAction();
                if (!a) return;
                this.runAction(a, null, inDebugMode ? { debugging: true } : {});
            }
        }

        public runWithCoverage() {
            tick(Ticks.editorRunWithCoverage);
            if (!Script) return;
            var a = Script.mainAction();
            if (!a) return;
            else this.runAction(a, null, { coverage: true, showCoverage: true });
        }

        public runWithProfiling() {
            tick(Ticks.editorRunWithProfiling);
            var run = () => {
                if (!Script) return;
                var a = Script.mainAction();
                if (!a) return;
                else this.runAction(a, null, { profiling: true, showProfiling: true });
            }

            if (!this.stepTutorial && !TestMgr.Benchmarker.unitTimeReported()) {
                if (TDev.RT.Perf.unit() < 0) {
                    TestMgr.Benchmarker.measureUnitTimeAsync().done(() => {
                        TestMgr.Benchmarker.reportUnitTime();
                        run();
                    });
                    return;
                }
                else
                    TestMgr.Benchmarker.reportUnitTime();
            }
            run();
        }

        public copyDecl(decl:AST.Decl)
        {
            if (decl == Script) {
                HTML.showErrorNotification("script duplication not implemented yet");
            } else {
                this.clipMgr.copy({ type: "decls", data: decl.serialize(), scriptId: (Script ? Script.localGuid : Util.guidGen()), isCut: false });
                this.queueNavRefresh();
                this.dismissSidePane();
            }
        }

        public moveDeclToLibrary(decl:AST.Decl)
        {
            this.libExtractor.moveDecl(decl);
        }

        public cutDecl(decl:AST.Decl, dontCopy = false)
        {
            if (decl == Script) {
                ModalDialog.ask(lf("are you sure you want to uninstall the current script? there is no undo for this!"),
                    lf("uninstall"),
                    () => {
                        this.uninstallCurrentScriptAsync().done();
                    });
            } else {
                this.undoMgr.pushMainUndoState();
                if (!dontCopy)
                    this.clipMgr.copy({ type: "decls", data: decl.serialize(), scriptId: (Script ? Script.localGuid : Util.guidGen()), isCut: true });
                var prev = this.scriptNav.previousDecl(decl);
                Script.deleteDecl(decl);
                this.renderDecl(prev);
                this.queueNavRefresh();
            }
        }

        public pasteNode()
        {
            Ticker.dbg("Editor.pasteNode");
            var node = this.clipMgr.paste();
            if (!!node) {
                this.undoMgr.pushMainUndoState();

                var decls:AST.Decl[] = [];
                if (node.type == "decls") {
                    // TODO this seems to parse just one decl
                    decls = AST.Parser.parseDecls(node.data);
                    // refresh the IDs in decls if pasted data
                    // (1) came from another script, or
                    // (2) was *copied* instead of cut
                    if(node.scriptId != Script.localGuid || !node.isCut) {
                        decls.forEach(d => TheEditor.initIds(d, true));
                    }
                } else if (node.type == "block" || node.type == "tokens") {
                    var act = this.freshAction();
                    var stmt = AST.Parser.parseStmt(node.data);
                    // refresh the IDs in stmt if pasted data
                    // (1) came from another script, or
                    // (2) was *copied* instead of cut
                    if(node.scriptId != Script.localGuid || !node.isCut) {
                        TheEditor.initIds(stmt, true);
                    }
                    var stmts = [stmt];
                    if (stmt instanceof AST.CodeBlock) {
                        stmts = (<AST.CodeBlock>stmt).stmts;
                    } else if (stmt instanceof AST.Block) {
                        HTML.showErrorNotification("cannot paste this");
                        return;
                    }
                    if (stmts.length > 0)
                        act.body.setChildren(stmts);
                    decls = [act];
                }

                // second paste should refresh ids
                node.isCut = false

                if (decls.length > 0) {
                    decls.forEach((d) => {
                        var newName = Script.freshName(d.getName())
                        if (newName != d.getName()) {
                            if (d instanceof AST.Action) {
                                var a = <AST.Action>d;
                                if (a.isEvent()) {
                                    // there already is an event under this name,  make it into an action
                                    a.isPrivate = true;
                                    a.eventInfo = null;
                                }
                            }
                            d.setName(newName);
                        }
                        Script.addDecl(d);
                    });
                    this.renderDecl(decls[0]);
                    this.queueNavRefresh();
                    this.typeCheckNow();
                }
            }
        }

        private topUndo()
        {
            this.topScriptOp(() => {
                if (!this.calculator.undo())
                    this.undoMgr.popMainUndoStateAsync().done();
            })
        }

        private stmtEditorPane() { return this.autoHide() ? elt("stmtEditorPaneInner") : elt("stmtEditorPane"); }

        public showStmtEditor(stmtEditor:StmtEditor)
        {
            this.currentStmtEditor = stmtEditor;
            Screen.pushModalHash("stmt", () => this.dismissModalPane())

            elt("root").setFlag("stmt-editor-visible", true)

            this.hideVideo();
            this.stmtEditorPane().setChildren([stmtEditor.visualRoot]);
            this.updateBackButton();
        }

        public sidePane() { return elt("rightPane"); }

        public showSideTab(st:SideTab, focus:boolean, stmtEditor:StmtEditor = null)
        {
            if (!st && !!stmtEditor)
                st = stmtEditor.getSideTab();
            if (!st)
                st = this.currentSideTab;

            if (!stmtEditor) {
                this.adjustCodeViewSize(null);
            }


            if (this.currentSideTab == st && !focus && this.sidePane().firstChild == st.visualRoot) {
                st.saveState();
                st.refresh();
                this.sideKeyFocus = focus || !!stmtEditor;
                return;
            }

            this.sideKeyFocus = focus || !!stmtEditor;


            if (!!this.currentSideTab) {
                //this.currentSideTab.tabButton.setFlag("tab-selected", false);
                this.currentSideTab.saveState();
            }
            //st.tabButton.setFlag("tab-selected", true);
            this.currentSideTab = st;
            if (st.isModal())
                Screen.pushModalHash("stmt", () => this.dismissModalPane())
            this.updateBackButton();
            var rp = elt("rightPane");
            //rp.style.opacity = "1"
            rp.setChildren([st.visualRoot]);
            rp.setFlag("phone-full-screen", st.phoneFullScreen())
            rp.setFlag("phone-narrow", st.phoneNarrow())
            if (focus)
                this.showSidePane()
            if (this.sideKeyFocus) this.selector.hideCurrent();
            else this.selector.showCurrent();
            st.navigatedTo();
            if (focus) st.gotKeyboardFocus();
            st.refresh();
            Util.showLeftPanel(st.visualRoot);
            this.setupSearchButton()
        }

        public showSidePane()
        {
            super.showSidePane();
            this.updateBackButton();
            this.notifyTutorial("showside");
        }

        public hideSidePane(skipNotify = false)
        {
            super.hideSidePane();
            this.updateBackButton();
            this.setupSearchButton()
            if (!skipNotify)
                this.notifyTutorial("hideside");
        }

        private flushLocalStorageAsync() {
            var sts = localStorage["editorScriptToSave"];
            if (!sts) return Promise.as();
            var ss: ScriptToSave[] = JSON.parse(sts);
            return Promise.sequentialMap(ss, (s) => World.setInstalledScriptAsync(s.header, s.script, s.editorState))
                .then(() => {
                    localStorage.removeItem("editorScriptToSave");
                });
        }

        private saveToCloudDelay = 10000;
        private lastSaveTime = 100;
        private scheduled: boolean;
        private numSchedules = 0;

        public scheduleSaveToCloudAsync(): TDev.Promise {
            this.numSchedules++;
            if (World.syncIsActive() || this.scheduled) return Promise.as();
            this.scheduled = true;
            var numSch = 0;

            var delay = this.saveToCloudDelay + this.lastSaveTime

            return Promise.delay(delay)
                .then(() => {
                    if (!Util.check(this.scheduled, "save-sch0")) return Promise.as();
                    numSch = this.numSchedules;
                    Ticker.dbg("save-ssa-" + numSch);
                    return this.saveStateAsync()
                }).then(() => {
                    if (!Util.check(this.scheduled, "save-sch1")) return Promise.as();
                    var guid = localStorage["editorScriptToSaveDirty"];
                    if (!guid || World.syncIsActive()) {
                        localStorage.removeItem("editorScriptToSaveDirty");
                        Ticker.dbg("save-clr0");
                        this.scheduled = false;
                        return Promise.as();
                    }
                    var start = Util.now();
                    //var id = Random.uniqueId()
                    //Ticker.dbg("save-start " + id)
                    return World.saveAsync(guid).then((response: Cloud.PostUserInstalledResponse) => {
                        //Ticker.dbg("save-stop " + id)
                        if (!Util.check(this.scheduled, "save-sch2")) return Promise.as();

                        if (Cloud.lite && !response.numErrors && ScriptEditorWorldInfo && ScriptEditorWorldInfo.guid == guid) {
                            ScriptEditorWorldInfo.baseSnapshot = response.headers[0].scriptVersion.baseSnapshot
                        }

                        this.lastSaveTime = Math.min(Util.now() - start, 30000);
                        if (response) this.saveToCloudDelay = response.delay * 1000;
                        this.scheduled = false;
                        if (this.numSchedules != numSch) {
                            //Ticker.dbg("save-clr1");
                            return this.scheduleSaveToCloudAsync();
                        } else {
                            //Ticker.dbg("save-clr2");
                        }
                        localStorage.removeItem("editorScriptToSaveDirty");
                    }, e => {
                        //Ticker.dbg("save-clr-exn");
                        this.scheduled = false;
                        localStorage.removeItem("editorScriptToSaveDirty");
                    });
                });
        }

        public prepareForLoadAsync(msg:string, f:()=>any)
        {
            Ticker.dbg("Editor.prepareForLoad " + msg);
            AST.reset();
            AST.followingTutorial = false;
            Plugins.stopAllPlugins();
            this.host.canEdit = true;
            this.hadSplit = false;
            this.stepTutorial = null;
            this.parentScript = null;
            this.parentScriptHeader = null;
            this._overridenStackTrace = null;
            this.currentSideTab = null;
            this.currentStmtEditor = null;
            this.intelliProfile = null;
            this.displayLeft([]);
            this.complainedAboutMissingAPIs = false;
            this.setLastScreenshot(null);
            this.searchBox.value = ""
            this.setReadOnly(false);
            this.scriptCompiled = false;
            elt("rightPane").setChildren([]);
            var w = elt("wallOverlay");
            w.setChildren([]);
            w.style.display = "none";
            this.hideSidePane();
            Browser.TheHost.clearHelp();

            this.removeVideo();

            this.host.wallVisible = false;
            this.resumeAction = null;
            this.rerunAction = null;
            this.scriptUpdateId = "";

            this.show();
            this.undoMgr.clear();

            /*
            var g = localStorage["editorState"];
            if (g) {
                var editorState = <EditorState>JSON.parse(g);
                //Note that this would first need to be cleared when we switch between scripts
                //undoMgr.load(editorState.undoState);
                this.clipMgr.load(editorState.clipState);
            }
            */

            this.sideTabs.forEach((st:SideTab) => st.reset());
            Ticker.dbg("Editor.prepareForLoad.end");

            var r = new PromiseInv();
            ProgressOverlay.lockAndShow(msg, () => {
                r.success(f())
            });
            return r;
        }

        private hideStmtEditor()
        {
            if (!!this.currentStmtEditor) {
                Screen.popModalHash("stmt");
                elt("root").setFlag("stmt-editor-visible", false)
                if (this.currentStmtEditor) {
                    this.currentStmtEditor.bye();
                    this.currentStmtEditor = null;
                }
                var editor = <HTMLElement> this.stmtEditorPane().firstChild;
                if (editor)
                    Util.fadeOut(editor);
                this.refreshDecl();
            }
        }

        private showDebuggerControl() {
            if (this.isDebuggerMode() && !this.currentStmtEditor) {
                this.stmtEditorPane().setChildren([this.debuggerControl.visualRoot]);
            }
        }

        public resetSidePane() : void
        {
            tick(Ticks.sideResetSidePane);
            this.selector.clear();

            this.hideStmtEditor();


            if (this.forceRefresh || (!!this.currentSideTab && this.currentSideTab.isModal())) {
                Ticker.dbg("Editor.resetSidePane.refresh");
                Screen.popModalHash("stmt");
                this.forceRefresh = false;
                this.currentSideTab.bye();
                this.refreshDecl();
            } else {
                Ticker.dbg("Editor.resetSidePane.norefresh");
            }

            if (Script)
                this.undoMgr.pushMainUndoState();
            this.moveVideoDown();
            this.updateBackButton();
        }

        private focusSideTab(pane:SideTab)
        {
            Ticker.dbg("Editor.focusSideTab");
            this.resetSidePane();
            this.showSideTab(pane, true);
        }

        public dismissModalPane()
        {
            this.selector.clear();
            if (!!this.currentStmtEditor || (this.currentSideTab && this.currentSideTab.isModal()))
                this.dismissSidePane();
            else
                this.hideSidePane();
        }

        public hasModalPane()
        {
            return this.visible && !this.isWallVisible() && Script &&
                   (!this.codeVisible() || !!this.currentStmtEditor || (this.currentSideTab && this.currentSideTab.isModal()));
        }

        public dismissSidePane()
        {
            Ticker.dbg("Editor.dismissSidePane");
            this.hideSidePane(true);
            this.resetSidePane()
            this.showSideTab(this.scriptNav, false);
            this.updateWorldInfoStatus();
            this.updateTutorial();
        }

        public backToScript()
        {
            Ticker.dbg("Editor.backToScript");
            this.resetSidePane()
            this.showSideTab(this.scriptNav, false);
        }

        static scriptSource(text:string)
        {
            return (id:string) => {
                if (!id) return Promise.as(text);
                else return World.getAnyScriptAsync(id);
            }
        }

        static updateEditorStateAsync(guid:string, f:(v:AST.AppEditorState) => void)
        {
            return World.getInstalledEditorStateAsync(guid)
                .then(str => {
                    var st:AST.AppEditorState = JSON.parse(str || "{}")
                    var pre = JSON.stringify(st)
                    f(st)
                    if (pre == JSON.stringify(st))
                        return Promise.as()
                    else
                        return World.getInstalledHeaderAsync(guid)
                            .then(hd => World.updateInstalledScriptAsync(hd, null, JSON.stringify(st), true))
                })
        }

        private loadScriptTextCore(worldInfo: EditorWorldInfo, text:string, editorState:string)
        {
            Util.assert(text && text.charAt(0) != '{');

            ScriptEditorWorldInfo = undefined; // to avoid corrupt state
            setGlobalScript(AST.Parser.parseScript(text));
            try {
                Script.editorState = JSON.parse(editorState || "{}");
            } catch (e) {
                Util.check(false, "wrong editor state: " + editorState)
            }
            Script.isTopLevel = true;
            Script.localGuid = worldInfo.guid;

            ScriptEditorWorldInfo = worldInfo;

            this.sideTabs.forEach((st:SideTab) => st.rebind());
        }

        public loadScriptTextAsync(worldInfo: EditorWorldInfo, text:string, editorState:string, fromDB = false)
        {
            Ticker.dbg("Editor.loadScriptTextAsync.start");
            Util.assert(text && text.charAt(0) != '{');
            this.loadScriptTextCore(worldInfo, text, editorState);
            Ticker.dbg("Editor.loadScriptTextAsync.coreLoaded");

            this.libCache.clear();
            return this.libCache.loadLibsAsync(Script).then(() => {
                AST.TypeChecker.tcApp(Script);
                Script.setStableNames();
                if (fromDB) {
                    this.scriptForCloud = this.serializeScript();
                    this.editorStateForCloud = this.serializeState();
                }
            })
            .then(() => this.rebindLibrariesToLocalAsync())
            .then(() => this.getDepsVersionsAsync())
            .then(ver => {
                this.scriptVersions = ver;
                Ticker.dbg("Editor.loadScriptTextAsync.done");
            })
            .then(() => this.loadPluginsAsync())
            .then(() => this.loadParentScriptAsync())
        }

        private rebindLibrariesToLocalAsync()
        {
            var bindings = Script.editorState.libraryLocalBindings
            if (!bindings) return Promise.as()
            var numUpdates = 0
            return Promise.join(Object.keys(bindings).map(k => {
                var guid = bindings[k]
                var lib = Script.libraries().filter(l => l.getStableName() == k)[0]
                if (!guid || !lib || lib.guid) return Promise.as()
                return World.getInstalledHeaderAsync(guid)
                    .then(hd => {
                        if (hd.status == "published" && hd.scriptId == lib.pubid)
                            return Promise.as()

                        Ticker.dbg("rebind library to local /" + lib.pubid)
                        lib.pubid = ""
                        lib.guid = guid
                        numUpdates++
                        lib.notifyChange()
                        return this.libCache.loadLibAsync(lib)
                    })
            }))
            .then(() => {
                if (numUpdates > 0) {
                    AST.TypeChecker.tcApp(Script);
                }
            })
        }

        private loadPluginsAsync()
        {
            var ids = Script.editorState.buttonPlugins
            if (!ids) return Promise.as()
            return Promise.join(Object.keys(ids).map(id => Plugins.installButtonPluginAsync(id)));
        }

        public disconnectParent()
        {
            Script.editorState.parentScriptGuid = null
            this.parentScript = null
            this.parentScriptHeader = null
        }

        private loadParentScriptAsync()
        {
            var script = Script;
            if (!script) return Promise.as();

            var guid = script.editorState.parentScriptGuid
            if (!guid)
                return Promise.as()

            return Promise.join({
                text: World.getInstalledScriptAsync(guid),
                header: World.getInstalledHeaderAsync(guid),
                state: World.getInstalledEditorStateAsync(guid)
            })
            .then(data => {
                if (!data.text || !data.header) {
                    this.disconnectParent()
                } else {
                    this.parentScript = AST.Parser.parseScript(data.text)
                    this.parentScript.localGuid = guid;
                    this.parentScript.editorState = JSON.parse(data.state || "{}")
                    this.parentScriptHeader = data.header
                }
            })
        }

        public renderDefaultDecl(transparent : boolean = false)
        {
            if (!this.currentSideTab)
                this.setupNavPane();

            if(transparent && this.currentSideTab instanceof ScriptNav) {
                var x = (<ScriptNav>this.currentSideTab).getSelected();
                if(x) this.loadDeclImmediately = x.getStableName();
            }

            var a = Script.findStableName(this.loadDeclImmediately);
            this.loadDeclImmediately = "";

            if (a && a == this.lastDecl) return;

            if (!a) a = Script.mainAction();
            if (!a) a = Script.actions()[0];
            if (!a) a = Script;

            this.renderDecl(a, transparent);
        }

        public wallShown()
        {
            if (!SizeMgr.splitScreen)
                elt("editorContainer").style.display = "none";
        }

        public wallHidden()
        {
            if (Browser.isCellphone)
                Runtime.lockOrientation(true, false, true);
            if (this.forceReload)
                this.historyMgr.reload(HistoryMgr.windowHash())
            if (this.stepTutorial) this.stepTutorial.notify("runBack");
        }

        public loadHash(h:string[])
        {
            if (h[0] == "replace-tutorial") {
                var tid = h[1]
                this.dismissModalPane();
                if (tid == "t") tid += ":" + h[2]
                Script.editorState.tutorialId = tid
                Util.setHash(this.lastEditHash);
                this.loadTutorial(true);
                var d = this.lastDecl
                this.lastDecl = null
                this.renderDecl(d)
                return
            }

            this.loadDeclImmediately = h[2];
            if (/:blinkExport/.test(h.slice(3).join(":")))
                this.blinkElement = "exportApp";
            this.runImmediately = h[0] == "run";

            this.showEditorContainer();
            TipManager.update();

            if (!this.forceReload && !this.runImmediately && this.visible && Script && Script.localGuid === h[1]) {
                Ticker.dbg("Editor.loadHashCore.inline");
                this.host.hideWallAsync()
                    .then(() => Script ? World.getInstalledHeaderAsync(Script.localGuid) : null)
                    .then((hd) => {
                        if (!hd || !Script) return;
                        Ticker.dbg("Editor.loadHashCore.checkingId");
                        this.setupPlayButton();
                        this.renderDefaultDecl();
                        this.historyMgr.confirmLoadHash();
                    }).done();
                return;
            }

            this.forceReload = false;

            if (this.historyMgr.numReloads == 0 && !World.syncIsActive()) {
                Browser.TheHost.clearAsync(false).done();
            }

            this.reloadScriptAsync(h[1], () => {
                this.historyMgr.scriptOrHub(h);
            }).done()
        }

        public clearAnnotations(pluginRef:string)
        {
            AST.visitNodes(Script, (s) => {
                if (s.annotations) {
                    var ann = s.annotations.filter(a => a.pluginRef != pluginRef)
                    if (ann.length == 0)
                        delete s.annotations
                    else
                        s.annotations = ann
                }
            })
        }

        public injectAnnotations(annotations:RT.AstAnnotation[])
        {
            var idx:StringMap<AST.Stmt> = {}
            var lastStmt:AST.Stmt = null
            AST.visitNodes(Script, (s) => {
                if (s instanceof AST.Stmt)
                    lastStmt = <AST.Stmt>s
                idx[s.stableId] = lastStmt
            })

            annotations.forEach(a => {
                if (idx.hasOwnProperty(a.id)) {
                    var s = idx[a.id]
                    if (!s.annotations)
                        s.annotations = []
                    s.annotations.push(a)
                }
            })
        }

        private applyAnnotations(rtEditor:RT.Editor)
        {
            this.pluginProducedAnnotations = false
            if (!rtEditor || rtEditor.allAnnotations.length == 0) return;

            this.pluginProducedAnnotations = true
            AST.Json.setStableId(Script)

            this.injectAnnotations(rtEditor.allAnnotations)
        }

        public reloadScriptAsync(guid:string, fail:()=>void)
        {
            Ticker.dbg("Editor.loadHashCore.fullLoad");
            return World.getInstalledHeaderAsync(guid).then((hd) => {
                if (!hd || hd.status == "deleted") {
                    Ticker.dbg("Editor.loadHashCore.cannotLoad");
                    fail()
                } else {
                    return this.prepareForLoadAsync("reloading script", () =>
                        this.loadScriptAsync(hd))
                }
            });
        }

        private versionString(hd:Cloud.Header)
        {
            if (!hd) return undefined;
            var v = hd.scriptVersion;
            return v.instanceId + "-" + v.version + "-" + v.time + "-" + hd.status;
        }

        private getDepsVersionsAsync()
        {
            if (!Script) return Promise.as();

            return World.getInstalledAsync().then((headers) => {
                if (!Script) return null;

                var res:any = {}
                var addVer = (guid) => {
                    res[guid] = this.versionString(<Cloud.Header>headers[guid]);
                }

                addVer(Script.localGuid);
                Script.libraries().forEach((l:AST.LibraryRef) => {
                    if (l.guid) addVer(l.guid)
                })

                return res;
            })
        }

        public loadScriptAsync(header: Cloud.Header, runPlugin = false, firstTime = false) : Promise
        {
            Ticker.dbg("Editor.loadScriptAsync");
            this.lastDecl = null;
            var shouldRun = this.runImmediately || runPlugin;
            this.runImmediately = false;
            this.scriptUpdateId = World.updateFor(header);
            var wasUpgraded = false

            if (!header)
                Util.oops(lf("header missing"));
            Util.assert(header.status != "deleted");
            var editorState:string;

            Util.log("loadScriptAsync: " + header.guid);
            return World.getInstalledHeaderAsync(header.guid)
            .then(resp => {
                header = resp;
                if (!header) Util.oops(lf("script not installed"));
            })
            .then(() => this.saveStateAsync({ forReal: true }))
            .then(() => {
                this.undoMgr.clear();
                Ticker.dbg("Editor.loadScriptAsync.getHeader");
                return Promise.join([World.getInstalledScriptAsync(header.guid), World.getInstalledEditorStateAsync(header.guid)])
            }).then((arr: string[]) => {
                var script = arr[0]
                editorState = arr[1]
                if (!header.editor && !script) {
                    Util.navigateInWindow((<any>window).errorUrl + "#logout")
                    return new PromiseInv();
                }

                header.recentUse = World.getCurrentTime();
                Ticker.dbg("Editor.loadScriptAsync.setHeader");
                if (!header.editor && (!header.meta || header.meta.comment === undefined))
                    header.meta = World.getScriptMeta(script);
                return World.setInstalledScriptAsync(header, null, null).then(() => script);
            }).then((script: string) => {
                var worldInfo = <EditorWorldInfo>{
                    guid: header.guid,
                    status: header.status,
                    baseId: header.scriptId,
                    baseUserId: header.userId,
                    version: header.scriptVersion.version,
                    baseSnapshot: header.scriptVersion.baseSnapshot,
                };
                if (worldInfo.status === "published") {
                    if (!worldInfo.baseUserId)
                        throw new Error("Could not determine the user id of the script owner; status = " + worldInfo.status);
                    if (!worldInfo.baseId)
                        throw new Error("Could not determine the script id; status = " + worldInfo.status);
                }
                this.host.currentGuid = header.guid;

                var scr = Promise.as(script)

                if (!shouldRun && Cloud.isOnline() && !/^meta hasIds/m.test(script)) {
                    ProgressOverlay.setProgress("upgrading script text for future merges");
                    scr = this.addIdsAsync(header, worldInfo.baseId, script)
                }


                // Two outcomes, depending on whether we're proceeding with the
                // classic editor, or an external one.
                var finalClassic = () => scr.then(scriptN => {
                    elt("scriptEditor").classList.remove("external");
                    if (script != scriptN) wasUpgraded = true
                    ProgressOverlay.setProgress("parsing script text");
                    return this.loadScriptTextAsync(worldInfo, scriptN, editorState, true);
                });
                var finalExternal = () => scr.then(script => {
                    elt("scriptEditor").classList.add("external");
                    var editor = editorById(header.editor);
                    ProgressOverlay.hide();
                    return new PromiseInv();
                });
                var final = header.editor ? finalExternal : finalClassic;

                if (worldInfo.baseId && !worldInfo.baseUserId) {
                    // it seems that there are even cases like this in the cloud, let's just fix it
                    return Browser.TheApiCacheMgr.getAsync(worldInfo.baseId, true).then(scriptInfo => {
                        if (scriptInfo)
                            worldInfo.baseUserId = scriptInfo.userid;
                    }).then(final);
                }

                return final();
            }).then(() => {
                if (!shouldRun && !EditorSettings.editorMode())
                    return EditorSettings.showChooseEditorModeAsync().then(() => this.setMode(true))
                else return Promise.as();
            }).then(() => {
                if (!Script) return;

                this.currentRt = new Runtime();
                this.setupPlayButton();

                if (TDev.Script) {
                   this.currentRt.sessions.setEditorScriptContext(Cloud.getUserId(), TDev.Script.localGuid, TDev.Script.getName(),
                      this.getBaseScriptId(), this.getCurrentAuthorId());
                }

                // start collaboration project
                if (Script.editorState && Script.editorState.collabSessionId) {
                    TDev.Collab.setCollab(Script.editorState.collabSessionId);
                    TDev.Collab.setTemporaryPullSuppression(false);
                    this.teamElt.setFlag("collab", true);
                    this.codeInner.setFlag("collab", true);
                    try {
                        this.showCollabView();
                    } catch (e) {
                        Util.reportError("CollabFeature", e);
                    }
                } else {
                    TDev.Collab.setCollab(undefined);
                    this.teamElt.setFlag("collab", false);
                    this.codeInner.setFlag("collab", false);
                }

                var ed = this.consumeRtEditor()

                if (!shouldRun) {
                    var st = Script.editorState
                    if (st.splitScreen)
                        this.setSplitScreen(true, true)

                    this.setMode()

                    this.applyAnnotations(ed)
                    this.setupNavPane();
                    this.renderDefaultDecl();
                    this.dismissSidePane();
                    this.undoMgr.pushMainUndoState();
                    this.loadTutorial(firstTime);
                }

                this.setLibraryUpdateIds();

            }).then(() => {
                    ProgressOverlay.setProgress("loading group script");
                    return Collab.loadPromise;
                }).then((firsttime: boolean) => {
                    if (firsttime)
                       ProgressOverlay.setProgress("joining group script (first-time connection)");
                    return Collab.readyPromise;
            }).then(() => {
                Util.log("loadScriptAsync: saving state again");
                return this.saveStateAsync({ wasUpgraded: wasUpgraded });
            }).then(() => {
                if (!shouldRun && !Script.editorState.buttonPlugins) {
                    Script.editorState.buttonPlugins = {}
                    return this.installPluginsAsync(Object.keys(this.libPluginIds()))
                }
            }).then(() => {
                    Ticker.dbg("Editor.loadScriptAsync.done");
                    ProgressOverlay.hide();
                    if (!Script)
                        return;
                    if (runPlugin) return;
                    if (shouldRun) {
                        this.runAction(Script.mainAction(), null)
                }
            }, (e) => {
                ProgressOverlay.hide();
                throw e;
            });
        }

        public installPluginsAsync(lst:string[])
        {
            if (lst.length > 0) {
                return Promise.join(lst.map(p => Plugins.installButtonPluginAsync(p)))
                    .then(() => this.queueNavRefresh())
            } else return Promise.as()
        }

        public libPluginIds():StringMap<number>
        {
            var plugins:StringMap<number> = {}
            Script.librariesAndThis().forEach(l => {
                if (l.resolved) {
                    Object.keys(l.resolved.touchDevelopPlugins).forEach(p => plugins[p] = 1)
                }
            })
            return plugins
        }

        /* Set of helper methods for all the collaboration-related UI
         * manipulations. */

        // Returns a DOM node representing a user (their picture) + the user
        // info
        private mkUser(aUserId) {
            if (!aUserId)
                return undefined;
            var info = Browser.TheHost.getUserInfoById(aUserId, aUserId);
            var el = info.thumbnail(false, () => { });
            el.classList.add('teamHead');
            el.addEventListener("click", () => {
                Browser.TheApiCacheMgr.getAnd(aUserId, (j: JsonUser) => {
                    var participant = Collab.getLastActivity(aUserId);
                    // User's still there, but has no recent activity.
                    if (!participant)
                        return;

                    var howLongAgo = Util.timeSince(participant.lastEdit.getTime()/1000);
                    var notification = div("errorNotification");
                    notification.appendChild(el.cloneNode(true));
                    notification.appendChild(text(j.name));
                    if (participant.lastEdit) {
                        notification.appendChild(text(" ("));
                        notification.appendChild(text(lf("last edit {0}", howLongAgo)));

                        if (!this.currentAction() || this.currentAction().getStableName() != participant.actionName) {
                            notification.appendChild(text(" "));
                            var a = document.createElement("a");
                            a.textContent = lf("on another action");
                            a.href = "#";
                            a.addEventListener("click", (event) => {
                                Script.orderedThings().forEach(thing => {
                                    if (thing instanceof AST.Decl
                                    && (<AST.Decl>thing).getStableName() == participant.actionName) {
                                        this.renderDecl(thing);
                                        event.stopPropagation();
                                        event.preventDefault();
                                    }
                                });
                            }, false);
                            notification.appendChild(a);
                        }

                        notification.appendChild(text(")"));
                    }
                    HTML.showNotification(notification);
                });
                event.stopPropagation();
                event.preventDefault();
            }, false);
            return {
                node: el,
                info: info,
            };
        }

        // Returns a DOM node for a message
        private mkMessage(msg: TDev.Collab.IMessage) {
            var isMe = (msg.user == Cloud.getUserId());
            var elt = div('teamMsg', this.mkUser(msg.user).node, span('', msg.content));
            if (isMe)
                elt.classList.add('teamMsgMine');
            return elt;
        }

        private mkIconUrl(aUserId: string, j: JsonUser) {
            if (j.haspicture) {
                return Cloud.getPublicApiUrl(aUserId + "/picture?type=large");
            } else {
                // URL for "TouchDevelop samples"
                return Cloud.getPublicApiUrl("pboj/picture?type=large");
                // FIXME once browsers start supporting data-URLs for Web
                // Notification icons, re-enable this!
                // var svg = Util.svgGravatar(aUserId);
                // return "data:image/svg+xml;base64,"+btoa(svg);
            }
        }

        // A wrapper for the DOM Notifications we use
        private webNotification(body: string, tag: string, icon="") {
            HTML.showWebNotification("TouchDevelop", {
                body: body,
                tag: tag,
                icon: icon,
                lang: ""
            });
        }


        // This function may be called at any time to scroll down the message
        // list and ensure the most recent messages are in view, even though
        // there may not be any message list.
        private scrollDownMessageList() {
            if (!Collab.AstSession || !Collab.AstSession.loaded)
                return;

            var messages = <HTMLElement>document.querySelector(".teamMsgs");

            // Note: we should scroll even though the message list may be
            // collapsed, so that the user doesn't have to tap on the message
            // list to read new messages.
            if (messages && messages.lastElementChild)
                (<HTMLElement>messages.lastElementChild).scrollIntoView(false);
        }



        /* Set of routines for updating the UI based on fresh data obtained via
           the Collab module, along with some private state. */

        // Maps a user id to the corresponding DOM node (the one returned by
        // [head]). Every node in the DOM appears in this map and every
        // object in this map is in the DOM.
        private currentUserMap: StringMap<Element> = {};
        // Ordered sequence of each message that's in the DOM along with the
        // corresponding node.
        private currentMsgSequence: { msg: TDev.Collab.IMessage; node: Element }[] = [];
        // Maps a session id to the corresponding stable name. XXX this
        // should probably a weak map because the editor can blast our nodes
        // away.
        private currentParticipantMap: {
            [index: number]: {
                stmtName: string;
                node: Element;
                mark: number
            }
        } = {};

        // A globally unique mark for marking which participants have been seen
        // as "active" recently.
        private mark = 0;

        // The users' various locations in the code. Two clients with the same
        // username appear twice.
        private refreshParticipants(forceRefresh=false) {
            // This may be called from various contexts: script load-time (where
            // collaboration may not be enabled), the setInterval'd function...
            if (!Collab.AstSession || !Collab.AstSession.loaded)
                return;

            this.mark++;

            var connectedUsers = Collab.getConnectedUsers();

            var userOfSessionId = {};
            connectedUsers.forEach(u => {
                userOfSessionId[u.sessionId] = u.userId;
            });

            var mySessionId = Collab.AstSession.getMemberNumber();
            // This function should be called prior to moving a node so that the
            // CSS class on its parent container can be updated
            var updateContainer = (node) => {
                // This is somewhat painful but:
                // - we need to use overflow: hidden when there's too many
                //  users in the same box
                // - we can't use .stmtParticipants for overflow: hidden
                //  because of the speech bubble
                // - we hence need a child of .stmtParticipants, meaning
                //  that we can no longer use :empty pseudo-selectors
                if (node.parentNode && node.parentNode.children.length == 1)
                    node.parentNode.parentNode.classList.remove("nonEmpty");
            };
            Collab.getActiveParticipants().forEach(p => {
                if (p.sessionId != mySessionId) {
                    // Mark this participant as "active", regardless of whether
                    // they moved or not: their last known location is recent
                    // enough.
                    if (p.sessionId in this.currentParticipantMap)
                        this.currentParticipantMap[p.sessionId].mark = this.mark;

                    // If the user is new, moved, or if we're rebuilding
                    // everything, then we need to update their location.
                    if (!(p.sessionId in this.currentParticipantMap) ||
                        this.currentParticipantMap[p.sessionId].stmtName != p.stmtName ||
                        forceRefresh
                    ) {
                        // Information about a user doesn't change: we can reuse
                        // an old node! This will implicitly perform a DOM move
                        // when we do the call to appendChild later on.
                        var node;
                        if (p.sessionId in this.currentParticipantMap) {
                            node = this.currentParticipantMap[p.sessionId].node;
                        }

                        var find = (p) => {
                            // Is this statement in the current script?
                            if (this.currentAction() && this.currentAction().getStableName() == p.actionName) {
                                var stmt = Script.findStmtByStableName(p.stmtName);
                                if (stmt && stmt.renderedAs)
                                    return stmt.renderedAs.querySelector(".stmtParticipantsOverflowBox");
                            }

                            // Just report the action, then...
                            var candidates = document.getElementsByClassName("actionParticipants");
                            for (var i = 0; i < candidates.length; ++i) {
                                var pNode = <Element>candidates[i].parentNode;
                                var button = <HTMLElement>pNode.firstElementChild;
                                if (button.getAttribute("data-stablename") == p.actionName)
                                    return (<Element>candidates[i]).firstElementChild;
                            }

                            // Found nothing.
                            return null;
                        }

                        var container = find(p);
                        if (container) {
                            var userId = userOfSessionId[p.sessionId];
                            if (userId) {
                                // If we don't have an old node, create a new one
                                if (!node)
                                    node = this.mkUser(userId).node;
                                updateContainer(node);
                                container.appendChild(node);
                                (<HTMLElement>container.parentNode).classList.add("nonEmpty");
                                this.currentParticipantMap[p.sessionId] = {
                                    stmtName: p.stmtName, node: node, mark: this.mark
                                };
                            } else {
                                // This means the user has left the session, but
                                // their last position is still in the
                                // participants cloud index.
                                Util.log("No userId for sessionId "+p.sessionId);
                            }
                        }
                    }
                }
            });

            // Now, remove users who are gone (i.e. haven't been visited).
            Object.keys(this.currentParticipantMap).forEach(sessionId => {
                if (this.currentParticipantMap[sessionId].mark != this.mark) {
                    var node = this.currentParticipantMap[sessionId].node;
                    if (node.parentNode) {
                        updateContainer(node);
                        node.parentNode.removeChild(node);
                    }

                    delete this.currentParticipantMap[sessionId];
                }
            });
        }

        // People currently connected to the session. Two clients with the same
        // username appear once.
        private refreshUsers() {
            var users = <HTMLElement>document.querySelector(".teamUsers");
            var connectedUsers = Collab.getConnectedUsers();

            // Update the user list. Since the order doesn't matter, we just
            // work in terms of sets and remove/add what's necessary.
            var newUserSet = connectedUsers.map(u => u.userId);
            var currentUserSet = Object.keys(this.currentUserMap);
            currentUserSet.forEach(aUserId => {
                if (!newUserSet.some(x => x == aUserId)) {
                    var node = this.currentUserMap[aUserId];
                    delete this.currentUserMap[aUserId];
                    users.removeChild(node);
                }
            });
            newUserSet.forEach(aUserId => {
                if (!currentUserSet.some(x => x == aUserId)) {
                    var theUser = this.mkUser(aUserId);
                    this.currentUserMap[aUserId] = theUser.node;
                    currentUserSet.push(aUserId);
                    users.appendChild(theUser.node);

                    Browser.TheApiCacheMgr.getAnd(aUserId, (j: JsonUser) => {
                        var icon = this.mkIconUrl(aUserId, j);
                        this.webNotification(lf("{0} joined {1}", j.name, Script.getName()), "join", icon);
                    });
                }
            });
        }

        // The set of current chat messages. Complete diff algorithm to reduce
        // flickering and emit proper web notifications.
        private refreshChat() {
            var msgId = m => m.uid;
            var msgsEqual = (m1, m2) => msgId(m1) == msgId(m2);
            var messages = <HTMLElement>document.querySelector(".teamMsgs");

            var newMsgSequence: TDev.Collab.IMessage[] = TDev.Collab.getLastTenMessages();
            var commonSequence: TDev.Collab.IMessage[] =
              (new Lcs(msgsEqual, this.currentMsgSequence.map(m => m.msg), newMsgSequence))
              .lcs();
            // console.log("current", currentMsgSequence.map(x => msgId(x.msg)));
            // console.log("common", commonSequence.map(x => msgId(x)));
            // console.log("new", newMsgSequence.map(x => msgId(x)));

            // Handle deletions. Anything that's in the current sequence and
            // NOT in the common sequence goes away. Please note that from
            // this stage, the invariant over [currentMsgSequence] is broken
            // (it is no longer in sync with the DOM).
            if (this.currentMsgSequence.length == 0) {
                // console.log("del none");
            } else if (commonSequence.length == 0) {
                // console.log("del all");
                messages.setChildren([]);
            } else {
                for (
                    var i = 0, j = 0;
                    i < this.currentMsgSequence.length;
                    // nop
                ) {
                    // console.log("del: i", i, "j", j);
                    var currentMsg = this.currentMsgSequence[i].msg;
                    var currentNode = this.currentMsgSequence[i].node;
                    if (j < commonSequence.length && msgsEqual(currentMsg, commonSequence[j])) {
                        i++, j++;
                    } else {
                        var id = msgId(currentMsg);
                        // console.log("del", id);
                        messages.removeChild(currentNode);
                        i++;
                    }
                }
            }

            // Handle additions. Anything that's in the new sequence and NOT
            // in the common sequence gets added. We don't care at this
            // stage about [currentMsgSequence].
            if (newMsgSequence.length == 0) {
                // console.log("add none");
            } else if (commonSequence.length == 0) {
                // console.log("add all");
                var nodes = newMsgSequence.map(x => this.mkMessage(x));
                messages.setChildren(nodes);
            } else {
                for (
                    var i = 0, j = 0;
                    i < newMsgSequence.length;
                    // nop
                ) {
                    // console.log("add: i", i, "j", j);
                    if (j < commonSequence.length && msgsEqual(newMsgSequence[i], commonSequence[j])) {
                        i++, j++;
                    } else {
                        var id = msgId(newMsgSequence[i]);
                        // console.log("add", id);
                        var node = this.mkMessage(newMsgSequence[i]);
                        if (i > 0)
                            messages.insertBefore(node, messages.children[i-1].nextElementSibling);
                        else
                            messages.insertBefore(node, messages.firstElementChild);

                        var theUser = newMsgSequence[i].user;
                        if (theUser != Cloud.getUserId())
                            Browser.TheApiCacheMgr.getAnd(theUser, (j: JsonUser) => {
                                var icon = this.mkIconUrl(theUser, j);
                                this.webNotification(lf("New message from {0} in {1}", j.name, Script.getName()), "message", icon);
                            });

                        i++;
                    }
                }
                this.scrollDownMessageList();
            }

            // And now, it's easy to restore the invariant for [currentMsgSequence]
            this.currentMsgSequence = newMsgSequence.map((m, i) => ({
                node: messages.children[i],
                msg: m
            }));

            // One last pass to update the confirmed status on messages
            this.currentMsgSequence.forEach(m => {
                if (m.msg.confirmed)
                    (<HTMLElement>m.node).classList.add("confirmed");
            });
        }


        private refreshStatus() {
            var connection = <HTMLElement>document.querySelector(".teamConnection");

            var st = Collab.AstSession.user_get_connectionstatus_full();
            var cl =
                st.type == Revisions.StatusType.Error ? "stError" :
                st.type == Revisions.StatusType.Warning ? "stWarning" :
                "stOk";

            connection.setChildren([
              div(cl, span('', st.status)),
              div("teamStatusMore", span('', st.description))
            ]);
        }


        private showCollabView() {
            /* Building the status box */

            var statusbox = div('teamStatus');
            var connection = div('teamConnection');

            // The active / inactive links are hidden/shown via CSS
            var linkActive = createElement('a', 'teamLinkActive', lf("enabled"));
            linkActive.setAttribute("href", "#");
            linkActive.addEventListener("click", (event) => {
                this.teamElt.classList.add("inactive");
                this.codeInner.classList.add("inactive");
                TDev.Collab.setAutomaticPushEnabled(false);
                TDev.Collab.setAutomaticPullEnabled(false);
                event.stopPropagation();
                event.preventDefault();
            });
            var linkInactive = createElement('a', 'teamLinkInactive', lf("disabled"));
            linkInactive.setAttribute("href", "#");
            linkInactive.addEventListener("click", (event) => {
                this.teamElt.classList.remove("inactive");
                this.codeInner.classList.remove("inactive");
                TDev.Collab.setAutomaticPushEnabled(true);
                TDev.Collab.setAutomaticPullEnabled(true);
                event.stopPropagation();
                event.preventDefault();
            });
            // If we're not fully automatic, then this means we're inactive. The
            // two calls to set* are to make sure we're in a consistent state.
            if (!TDev.Collab.getAutomaticPushEnabled() || !TDev.Collab.getAutomaticPullEnabled()) {
                this.teamElt.classList.add("inactive");
                this.codeInner.classList.add("inactive");
                TDev.Collab.setAutomaticPushEnabled(false);
                TDev.Collab.setAutomaticPullEnabled(false);
            }
            var onoff = div('teamOnOff',
              span('', lf("code sync ")),
              linkActive,
              linkInactive
            );

            var usersbox = div('teamUsersBox');
            var userscount = div('teamUsersCount');
            var users = div('teamUsers');
            usersbox.setChildren([userscount, users]);
            statusbox.setChildren([connection, onoff, users]);



            /* Building the input area at the bottom */

            var input = HTML.mkTextInput('text', lf("say something..."));
            input.id = "teamInput";
            input.className = "";
            input.maxLength = 140;
            var textbox = div('teamTextbox', this.mkUser(Cloud.getUserId()).node, input);


            /* Building the message list and associated event listeners */

            var messages = div('teamMsgs');

            // The chat is collapsed either when the user hits escape, or when
            // the user click-focuses into the code area.
            var collapseCollabView = () => {
                this.teamElt.setFlag("collapsed", true);
                // Just scroll infinitely down to make sure that the input field
                // at the bottom is shown.
                this.scrollDownMessageList();
            }
            var expandCollabView = () => {
                this.teamElt.setFlag("collapsed", false);
            }

            var postMessage = () => {
                if (input.value)
                    TDev.Collab.postMessage(input.value);
                if (this.currentMsgSequence.length == 0)
                    expandCollabView();
                // Make sure we can see our own messages.
                this.refreshChat();
                input.value = '';
                input.scrollIntoView(false);
            }
            input.onkeydown = (e) => {
                Util.normalizeKeyEvent(e)
                switch (e.keyCode) {
                    case 13: // return
                        postMessage();
                        e.stopPropagation();
                        return false;
                    case 27: // esc
                        input.value = '';
                        collapseCollabView();
                        e.stopPropagation();
                        return false;
                }
            }

            // Tap on messages = expand or collapse, that's all.
            var expandCollapse = event => {
                // Tapping on the messages area toggles the chat
                if (this.teamElt.getFlag("collapsed")) {
                    expandCollabView();
                } else {
                    collapseCollabView();
                }
            };
            messages.addEventListener("click", expandCollapse, false);

            /* Putting all the elements together */
            this.teamElt.setChildren([
                statusbox,
                messages,
                textbox
            ]);
            collapseCollabView();
            input.blur();


            this.currentUserMap = {};
            this.currentMsgSequence = [];
            this.currentParticipantMap = {};
            Collab.registerChangeHandler(() => {
                this.refreshParticipants();
                this.refreshUsers();
                this.refreshChat();
                this.refreshStatus();
            });

            // It may happen that nothing new arrives from the server; yet, if
            // someone hasn't moved in the code for a while, we should still
            // refresh the view and make them disappear.
            window.setInterval(() => this.refreshParticipants(), 30*1000);
        }

        private addIdsAsync(header:Cloud.Header, baseId:string, script:string)
        {
            return (baseId ? ScriptCache.getScriptAsync(baseId) : Promise.as(""))
                .then(baseText => {
                    if (baseText == null) return script; // transient fetch problem?

                    try {
                        var res = AST.Diff.assignIds(baseText, script).text
                        Util.log("adding ids to script, " + script.length + " to " + res.length)
                        if (res && res != script)
                            return res
                    } catch (e) {
                        Util.reportError("addids", e, false)
                    }

                    return script
                })
        }

        public consumeRtEditor():RT.Editor
        {
            var ed = this.rtEditor
            this.rtEditor = null
            return ed
        }

        public loadTutorial(firstTime: boolean = false)
        {
            if (!Script) {
                this.loadIntelliProfile(null, firstTime);
                return;
            }
            var id = Script.editorState.tutorialId;
            if (!id) {
                this.loadIntelliProfile(null, firstTime);
                return;
            }

            if (/^t:/.test(id)) {
                var ht = HelpTopic.findById(id.slice(2));
                if (ht) {
                    this.followTopic(ht, firstTime);
                } else {
                    this.loadIntelliProfile(null, firstTime);
                }
            }
            else
                World.getAnyScriptAsync(id).done((text) => {
                    if (!text) {
                        this.loadIntelliProfile(null, firstTime);
                    } else {
                        if (!Script) return;
                        var ht = HelpTopic.fromScriptText(id, text);
                        this.followTopic(ht, firstTime);
                    }
                })
        }

        public refreshIntelliProfile() {
            this.loadIntelliProfile(null, false);
        }

        private addIntelliProfile(profile? : AST.IntelliProfile) : AST.IntelliProfile {
            if (!profile) return this.intelliProfile;

            if (!this.intelliProfile) this.intelliProfile = new AST.IntelliProfile();
            this.intelliProfile.merge(profile);
            return this.intelliProfile;
        }

        private loadIntelliProfile(ht: HelpTopic, firstTime: boolean = false)
        {
            var refresh = () => {
                this.addIntelliProfile(Plugins.getPluginIntelliProfile());
                this.setupTopButtons();
                this.refreshScriptNav();
                this.setupSearchContainer();
            };

            if (!ht) {
                this.intelliProfile = null;
                this.stepTutorial = null;
                TipManager.setTip(null);
                TDev.Browser.EditorSoundManager.keyboardSounds = false;
                refresh();
                return;
            }

            this.stepTutorial = null;
            ht.initAsync().done((app:AST.App) => {
                this.addIntelliProfile(new AST.IntelliProfile()).allowAllLibraries = false;
                Util.setTimeout(10, () => {
                // ht.reloadAppAsync().done((app:AST.App) => {
                    if (!Script) return;
                    var st = new StepTutorial(app, ht, firstTime, Script.localGuid);
                    if (st.isEnabled()) {
                        this.stepTutorial = st;
                        st.disableUpdate = true;
                        st.updateProfile(this.intelliProfile)

                        // only enable split screen selectively
                        if ((AST.blockMode || this.widgetEnabled("splitScreen")) && !this.intelliProfile.hasKey("flag:nosplit"))
                            this.setSplitScreen(true, true);

                        if (firstTime) {
                            if (st.hourOfCode && !/#hourOfCode/i.test(Script.comment)) {
                                Script.comment += " #HourOfCode";
                                Script.notifyChange()
                            }
                            // hash tags defined in sthashtags macro
                            var templateHashTags = ht.templateHashTags();
                            if (templateHashTags.length > 0) {
                                templateHashTags.forEach(hashtag => {
                                    if (Script.comment.indexOf("#" + hashtag) < 0)
                                        Script.comment += " #" + hashtag;
                                });
                                Script.notifyChange()
                            }

                            var editorMode = ht.templateEditorMode();
                            if (editorMode)
                                EditorSettings.showChooseEditorModeAsync(EditorSettings.parseEditorMode(editorMode)).done();
                        }

                        // we've got kicked out of the editor in the meantime?
                        if (!this.stepTutorial) return

                        this.tutorialId = ht.json.id
                        this.addTutorialValidatorLibrary()

                        if (/^t:/.test(Script.editorState.tutorialId))
                            Script.editorState.tutorialId = ht.json.id

                        if (!Script.editorState.tutorialUpdateKey) {
                            Browser.TheHost.getTutorialUpdateKeyAsync(ht).done(key =>
                                Script.editorState.tutorialUpdateKey = key
                            );
                        }

                        this.applyVideoSize()
                        if (firstTime)
                            TDev.Browser.EditorSoundManager.startTutorial();
                        refresh();
                        this.stepTutorial.startAsync().done(() => {
                            refresh();
                            this.updateTutorial();
                        });
                    }
                // })
                })
                refresh();
            })
        }

        public addTutorialValidatorLibrary()
        {
            var st = this.stepTutorial
            var id = this.tutorialId

            if (st.hasValidators && !Script.libraries().some(l => l.isTutorial())) {
                var l = new AST.LibraryRef();
                l.setStableName("tutorialLib")
                l.setName("__tutorial")
                l.isDeclared = true
                if (/-/.test(id))
                    l.guid = id
                else
                    l.pubid = id
                Script.addDecl(l)
                TheEditor.libCache.loadLibAsync(l).done(() => {
                    l.initializeResolves()
                    l.resolve()
                    this.initIds(l, true)
                    l.setStableName("tutorialLib")
                    l.notifyChange()
                })
            }
        }

        public loadPublicScriptAsync(scriptId: string, userId: string, runPlugin = false) : Promise
        {
            Ticker.dbg("loadPublicScriptAsync");
            return World.installPublishedAsync(scriptId, userId)
                .then((header) => this.loadScriptAsync(header, runPlugin));
        }

        public onExitAsync()
        {
            this.spyManager.onExit();
            if (!!this.currentCodeView)
                this.currentCodeView.commit();

            /*
            if (this.currentSideTab && this.currentSideTab.isModal())
                this.dismissSidePane();
            else if (this.currentSideTab != this.scriptNav)
                this.showSideTab(this.scriptNav, false);
            else
            */

            this.dismissSidePane();
            this.setLastScreenshot(null);
            this.libExtractor.reset();
            Plugins.stopAllPlugins();
            return this.saveStateAsync({ forReal: true, clearScript: true });
        }

        private goToHub(hash) {
            this.hide(true);
            Util.setHash(hash);
        }

        public goToHubAsync(tab = "overview"): Promise
        {
            var prevGuid = Script ? Script.localGuid : null;
            var path = this.lastListPath || "installed-scripts"
            this.lastListPath = null

            var hash: string;

            if (prevGuid)
                hash = "list:" + path + ":script:" + prevGuid + ":" + tab;
            else
                hash = "hub";

            return this.onExitAsync().then(() => {
                this.goToHub(hash);
            });
        }

        private resetWorldAsync() : TDev.Promise
        {
            Ticker.dbg("resetWorldAsync");
            setGlobalScript(undefined);
            ScriptEditorWorldInfo = undefined;
            return TDev.Storage.clearAsync();
        }


        public uninstallCurrentScriptAsync()
        {
            var isownedgroupscript = Script.editorState
                && Script.editorState.collabSessionId
                && Collab.getSessionOwner(Script.editorState.collabSessionId) == Cloud.getUserId();

            if (isownedgroupscript) {
                ModalDialog.info(lf("owned group script"), lf("you are the owner of this group script. To uninstall, you must first remove it from the group scripts."));
                return Promise.as();
            }

            tick(Ticks.codeUninstallScript);
            var guid = Script.localGuid;
            currentScreen = null;
            setGlobalScript(undefined);
            ScriptEditorWorldInfo = undefined;
            return World.uninstallAsync(guid)
                .then(() => {
                    setGlobalScript(null);
                    this.goToHubAsync().done();
                })
        }

        public newScriptAndLoadAsync(stub: World.ScriptStub, t?:Browser.ScriptTemplate) : Promise {
            return this.newScriptAsync(stub, t)
                .then((header) => this.loadScriptAsync(header, false, true));
        }

        public newScriptAsync(stub: World.ScriptStub, t?: Browser.ScriptTemplate): Promise {
            Ticker.dbg("newScriptAsync");
            if (!t)
                t = <any>{};

            if (stub.editorName == "touchdevelop") {
                var app = AST.Parser.parseScript(stub.scriptText, [])
                app.setMeta("name", stub.scriptName)
                app.setMeta("rootId", Random.uniqueId())
                AST.TypeChecker.tcScript(app, true); // perform syntax upgrades

                new AST.InitIdVisitor(true).dispatch(app)
                app.setMeta("hasIds", "yes")

                stub.scriptText = app.serialize();
            }

            return World.installUnpublishedAsync(t.baseId || "", t.baseUserId || "", stub);
        }

        public cloneScriptAsync() : Promise
        {
            //var old = ScriptEditorWorldInfo.baseId;
            Ticker.dbg("cloneScriptAsync");
            var host = Browser.TheHost;
            return this.prepareForLoadAsync("cloning script", () =>
                    host.updateInstalledHeaderCacheAsync().then(() => {
                        var scriptStub = {
                            editorName: "touchdevelop",
                            scriptText: this.serializeScript(),
                            scriptName: Script.getName(),
                        };
                        World.installUnpublishedAsync(ScriptEditorWorldInfo.baseId, ScriptEditorWorldInfo.baseUserId, scriptStub)
                            .then((header) => this.loadScriptAsync(header)
                                .then(() => {
                                    Script.setName(host.newScriptName(Script.getName()));
                                    //Script.parentIds = [old];
                                    Script.notifyChange();
                                    this.queueNavRefresh();
                                }))}));
        }

        static showLog()
        {
            TDev.RT.App.showLog(Util.getLogMsgs());
        }

        public logoutAsync(everywhere: boolean, url: string = undefined) {
            tick(Ticks.mainResetWorld);

            var userId = Cloud.getUserId();
            // when users don't have an picture, the dialog has a broken image which looks really bad
            // var meImg = userId  ? HTML.mkImg(Cloud.getPublicApiUrl(userId + "/picture?type=normal")) : null;
            var progressDialog = new ModalDialog();
            progressDialog.canDismiss = false;
            var progressBar = HTML.mkProgressBar();
            progressDialog.add(progressBar);
            progressDialog.add(div("wall-dialog-header", div("", lf("signing out"))));
            progressDialog.add(div("wall-dialog-body", div('', "cleaning up browser data...")));
            progressDialog.add(div("wall-dialog-body", div('', "(please wait, it can take up to a minute)")));
            progressDialog.show();
            progressBar.start();

            World.cancelSync();
            Cloud.setAccessToken(undefined);
            return this.resetWorldAsync().then(() => {
                if (Browser.win8)
                    Browser.TheHost.clearMeAsync(true).then(() =>
                    {
                        progressBar.stop();
                        progressDialog.dismiss();
                    }).done();
                else {
                    // don't stop progress; keep animation running until we actually navigate away
                    window.onunload = () => { }; // clearing out the onunload event handler; the regular one would write to stuff to storage again
                    if (!url) url = Cloud.getServiceUrl() + "/user/logout" + (everywhere ? "" : "?local=true");
                    Util.navigateInWindow(url);
                }
            });
        }

        public logoutDialog() {
            var userId = Cloud.getUserId();
            // when users don't have an picture, the dialog has a broken image which looks really bad
            // var meImg = userId  ? HTML.mkImg(Cloud.getPublicApiUrl(userId + "/picture?type=normal")) : null;
            var progressDialog = new ModalDialog();
            var progressBar = HTML.mkProgressBar();
            progressDialog.add(progressBar);
            progressDialog.add(div("wall-dialog-header", div("", lf("sign out"))));
            progressDialog.add(div("wall-dialog-body", div('', "checking status...")));
            progressDialog.show();
            progressBar.start();

            // initially, delay served for testing; but then without it, it would just look like the screen flickering too much (often too fast)
            Promise.delay(1000, () => Cloud.isOnlineWithPingAsync().then((isOnline: boolean) =>
                {
                    progressBar.stop();
                    progressDialog.dismiss();

                    var m = new ModalDialog();
                    var options = {};
                    if (isOnline && userId)
                        options["sign out everywhere"] = () => {
                            m.dismiss();
                            TheEditor.logoutAsync(true).done();
                        };
                    options["sign out"] = () => {
                        m.dismiss();
                        TheEditor.logoutAsync(false).done();
                    };
                    m.add([
                        div("wall-dialog-header", div("", lf("sign out")), Editor.mkHelpLink("user accounts")),
                        div("wall-dialog-body", lf("Are you sure?\nAll your script data and any unsynchronized script changes will be lost.")),
                        div("wall-dialog-buttons",
                            Object.keys(options).map((k: string) =>
                                HTML.mkButton(k, () => { m.dismiss(); options[k](); })))
                    ]);
                    m.show();
            })).done();
        }

        static setAlwaysBeta(v:boolean)
        {
            window.localStorage["always_beta"] = (v ? "yes" : "no");
        }

        static isAlwaysBeta()
        {
            return window.localStorage["always_beta"] === "yes";
        }

        public popupMenu()
        {
            var m = new ModalDialog();
            m.addClass("accountSettings")
            var betaDiv = null

            var relId = (<any>window).betaFriendlyId;
            if (!relId) relId = "(local)";
            var mtch = /-(\d+)\//.exec(Ticker.mainJsName)
            if (mtch) relId = "v" + mtch[1];

            betaDiv = div("wall-dialog-body",
                Editor.mkHelpLink("beta"),
                Browser.isWP8app ? div(null, lf("Using cloud services ") + relId)
                : HTML.mkCheckBox(
                    lf("always use beta version of TouchDevelop"),
                    Editor.setAlwaysBeta, Editor.isAlwaysBeta()),
                div("clear"));
            if (World.switchToChannel) {
                if ((<any>window).betaFriendlyId) {
                    betaDiv.appendChild(HTML.mkButton(
                        Browser.isWP8app ?
                            lf("stop cloud services beta testing") :
                            lf("stop beta testing"),
                        () => {
                            Editor.setAlwaysBeta(false);
                            World.switchToChannel("current");
                            m.dismiss();
                        }))
                } else {
                    betaDiv.appendChild(HTML.mkButton(
                        Browser.isWP8app ?
                            lf("start cloud services beta testing") :
                            lf("start beta testing"),
                    () => {
                        World.switchToChannel("beta");
                        m.dismiss();
                    }))
                }
            }

            var zoomSlide = HTML.mkTextInput("range", lf("zoom factor"));
            zoomSlide.className = "colorSlider";
            zoomSlide.min = "50";
            zoomSlide.max = "130";
            zoomSlide.step = "5";
            zoomSlide.value = ((parseFloat(window.localStorage["zoomFactor"])*100) || 100) + ""
            var zoomLabel = div("inlineBlock", lf("{0}% text zoom", zoomSlide.value));
            zoomSlide.onchange = Util.catchErrors("zoomSlider", () => {
                window.localStorage["zoomFactor"] = parseFloat(zoomSlide.value)/100 + "";
                zoomLabel.setChildren(lf("{0}% text zoom", zoomSlide.value));
                SizeMgr.applySizes(true);
            });


            m.add([
                div("wall-dialog-header", lf("TouchDevelop settings")),
                div("wall-dialog-body", Cloud.getUserId() ? lf("You have signed in with {0}.", Cloud.getIdentityProvider()) :
                    lf("You are not signed in.")),
                div("wall-dialog-body",
                    Editor.mkHelpLink("user accounts"),
                    HTML.mkButton(lf("sign out"), () => TheEditor.logoutDialog())
                    ),
                div("wall-dialog-body", HTML.mkCheckBox(lf("access and use your location"),
                    (v) => RuntimeSettings.setLocation(v), RuntimeSettings.location())),
                div("wall-dialog-body", HTML.mkCheckBox(lf("play sounds and music"),
                    (v) => RuntimeSettings.setSounds(v), RuntimeSettings.sounds())),
                betaDiv,
                div("wall-dialog-body", HTML.mkCheckBox(lf("force offline mode"),
                    (v) => Cloud.setTouchDevelopOnline(!v), !Cloud.isTouchDevelopOnline())),
                div("wall-dialog-body", zoomSlide, zoomLabel),
                div("wall-dialog-body",
                        HTML.mkButton(lf("run platform tests"), () => {
                            Util.setHash("hub:test");
                        }), lf("check if everything works")
                    ),
                 div("wall-dialog-body",
                        HTML.mkButton(lf("show diagnostic log"), () => {
                            m.dismiss();
                            Editor.showLog();
                        }), lf("internal log used for diagnostics.")
                    )
            ])

            if (TDev.dbg) {
                var chaosOfflineEdit = HTML.mkCheckBox(lf("chaos offline mode"), (v) => Cloud.setChaosOffline(v), Cloud.isChaosOffline());
                m.add([
                    div("wall-dialog-body", "under the hood (dbg): ",
                        HTML.mkButton(lf("throw"), () => {
                            Util.die();
                        })),
                        div("wall-dialog-body", HTML.mkButton(lf("log database contents"), () => {
                            var logContentsAsync = (details) => {
                                HTML.showProgressNotification(lf("logging database contents..."));
                                Storage.logContentsAsync(details).done(() =>
                                    HTML.showProgressNotification(lf("logging database contents done."), true));
                            };
                            ModalDialog.askMany("how much?", "Do you want detailed information about each key in each table?",
                                {
                                    yes: () => logContentsAsync(true),
                                    no: () => logContentsAsync(false)
                            });
                        })),
                        div("wall-dialog-body", chaosOfflineEdit),
                        div("wall-dialog-body",
                            HTML.mkButton(lf("perf cloud data"), () => {
                                TestMgr.Benchmarker.displayPerfData();
                            }),
                            !LocalShell.mgmtUrl("") ? null :
                                HTML.mkButton(lf("save offline caches"), () =>
                                    LocalProxy.saveCachesAsync().done())
                            ),
                        div("wall-dialog-body", HTML.mkCheckBox("enable new intelli prediction",
                            (v) => { TheEditor.calculator.enableNewPredictor = v; }, TheEditor.calculator.enableNewPredictor)),
                        (dbg ? HTML.mkButtonTick(lf("run tests"), Ticks.hubTests, () => { TestMgr.testAllScripts(); }) : null),
                        (!Util.localTranslationTracking && dbg ? HTML.mkButtonTick(lf("run benchmarks"), Ticks.hubBenchmarks, () => { TestMgr.Benchmarker.runBenchmarksButtonAsync(); }) : null),
                        (dbg ? HTML.mkButtonTick(lf("manage showcase"), Ticks.hubShowcaseMgmt, () => { this.hide(); Browser.TheHost.showList("showcase-mgmt", null); }) : null),
                        (Util.localTranslationTracking ? HTML.mkButtonTick(lf("translations"), Ticks.hubShowcaseMgmt, () => { ModalDialog.showText(Util.dumpTranslationFreqs()) }) : null),
                        (dbg ? HTML.mkButton(lf("show internal icons"), () => { ScriptProperties.showIcons(); }) : null),
                ]);
            }
            m.add([
                div("wall-dialog-buttons",
                    HTML.mkButton(lf("close"), () => m.dismiss())),
            ]);

            m.setScroll();
            m.fullWhite();
            m.show();
        }

        private buildRootFrames()
        {
            var r = divId("scriptEditor", null,
                      divId("editorContainer", null,
                        divId("leftBtnRow", "btnRow"),
                        divId("scriptMainPanes", "scriptMainPanes",
                          divId("leftPane", "pane",
                            divId("teamPaneContent", "teamContent"),
                            divId("leftPaneContent", "sideTabContent")
                            ),
                          divId("stmtEditorPaneInner", null),
                          divId("rightPane", "pane")
                        ),
                        this.landscapeSearchContainer,
                        divId("stmtEditorPane", null),
                        divId("stmtEditorLeftTop", null)),

                      divId("externalEditorContainer", null,
                        divId("externalEditorChrome", null),
                        divId("externalEditorFrame", null)),

                      divId("wallOverlay", null));
            r.style.display = "none";
            elt("root").appendChild(divId("testHostFrame", null));
            elt("root").appendChild(r);
            Util.setupDragToScroll(elt("leftPaneContent"));
        }





        public hide(isInternal = false)
        {
            if (this.visible) {
                TDev.Collab.setCollab(undefined);
                SizeMgr.setSplitScreen(false)
                World.cancelContinuouslySync();
                if (!isInternal)
                    this.onExitAsync().done();
                this.visible = false;
                elt("scriptEditor").style.display = "none";
                elt("root").setFlag("is-editor", false);
                TipManager.setTip(null)
            }
        }

        private show()
        {
            if (!this.visible) {
                //this.startLogTimer();
                this.visible = true;
                currentScreen = this;
                elt("scriptEditor").style.display = "block";
                this.placeSearchContainer()
                elt("root").setFlag("is-editor", true);
                this.resetVideoConstraints();
                SizeMgr.applySizes(true);
            }
        }

        public setSplitScreen(split:boolean, save = false)
        {
            if (save && Script)
                Script.editorState.splitScreen = split

            this.hadSplit = split
            if (SizeMgr.splitScreenRequested != split) {
                SizeMgr.setSplitScreen(split)
                if (!split) {
                    Runtime.stopPendingScriptsAsync().then(() => {
                        this.host.wallVisible = true;
                        this.host.hideWallAsync()
                    }).done()
                }
            }
        }

        public restore()
        {
            if (!this.onRestore)
                this.goToHubAsync().done();
            else {
                this.show();
                this.onRestore();
            }
        }

        public refreshMode() {
            this.setMode(true);
        }

        private setMode(refresh = false)
        {
            var prevMode = EditorSettings.editorMode();

            if (prevMode == EditorMode.block) {
                AST.proMode = false
                AST.blockMode = true
                AST.legacyMode = false
            } else if (prevMode == EditorMode.pro) {
                AST.proMode = true
                AST.blockMode = false
                AST.legacyMode = false
            } else {
                AST.proMode = false
                AST.blockMode = false
                AST.legacyMode = true
            }

            var setFlags = () => {
                elt("scriptEditor").setFlag("proMode", AST.proMode)
                elt("scriptEditor").setFlag("blockMode", AST.blockMode)
                elt("scriptEditor").setFlag("legacyMode", AST.legacyMode)
            }

            if (refresh) {
                var setup = () => {
                    setFlags()
                    this.setupTopButtons();
                    this.refreshScriptNav();
                    this.setupSearchContainer();
                    this.refreshDecl()
                }

                if (prevMode == 2 && this.codeInner.firstChild) {
                    (<HTMLElement>this.codeInner.firstChild).className += " blocksToCode"
                    Util.setTimeout(600, () => Util.coreAnim("shakeCode", 400, this.codeInner))
                    Util.setTimeout(750, setup)
                }
                else
                    setup()
            } else setFlags()
        }

        public init()
        {
            this.buildRootFrames();

            this.auxRenderer.isAux = true;
            this.codeOuter = elt("leftPane");
            this.codeInner = elt("leftPaneContent");
            this.teamElt = elt("teamPaneContent");

            if (/monospace=1/.test(document.URL))
                this.codeInner.className += " monospace"

            this.sideTabs = [<SideTab> this.scriptNav, this.searchTab, this.selector, this.actionProperties, this.inlineActionEditor, this.debuggerNonEditor, this.recordEditor];
            this.stmtEditors = [<StmtEditor> this.calculator, <StmtEditor> this.debuggerEditor, this.commentEditor, this.debuggerControl, this.selectorEditor]
            this.stmtEditors.forEach((t) => {
                t.init(this);
                var st = t.getSideTab();
                if (!!st) this.sideTabs.push(st);
            });
            this.sideTabs.forEach((t:SideTab) => {
                t.init(this);
            });

            this.codeViews = [<CodeView> this.actionView, this.scriptProperties, this.variableProperties, this.librefProperties, this.recordProperties, this.debuggerCodeView];
            this.codeViews.forEach((c:CodeView) => {
                c.init(this);
            });

            Util.clickHandler(this.codeOuter, () => {
                this.dismissSidePane();
            });

            elt("scriptEditor").appendChild(this.betaNote = Editor.mkBetaNote());
            elt("scriptEditor").withClick(() => {}) // disable text selection

            this.setupTopButtons();

            if (Browser.webAppBooster) {
                api.core.currentPlatform = PlatformCapabilityManager.current(); // based on supported features
                api.core.currentPlatformImpl = ImplementationStatus.Wab;
            } else if (Browser.win8) {
                api.core.currentPlatform = PlatformCapability.WinRT;
                api.core.currentPlatformImpl = ImplementationStatus.WinRT;
            } else {
                api.core.currentPlatform = PlatformCapabilityManager.current();
                api.core.currentPlatformImpl = ImplementationStatus.Web;
            }
        }

        private getEditorState() : EditorState {
            return {
                worldInfo: ScriptEditorWorldInfo,
                undoState: null, // this.undoMgr.toJson(),
                clipState: null, // this.clipMgr.toJson(),
            };
        }

        private updateWorldInfoStatus()
        {
            if (!ScriptEditorWorldInfo || ScriptEditorWorldInfo.status === "unpublished") return;

            var script = this.undoMgr.getScriptSource();
            if (this.scriptForCloud !== script) {
                if (ScriptEditorWorldInfo.status == "published") {
                     Script.parentIds = [];
                     Script.notifyChange()
                }
                ScriptEditorWorldInfo.status = "unpublished";
                this.queueNavRefresh();
            }
        }

        public serializeState()
        {
            return JSON.stringify(Script.editorState)
        }

        public serializeScript()
        {
            var s:string;
            Util.time("serialize", () => { s = Script.serialize().replace(/\n+/g, "\n"); });
            return s;
        }

        public saveStateAsync(opts:SaveStateOptions = {}) : TDev.Promise // of void
        {
            Ticker.dbg("Editor.saveStateAsync");
            if (!!Script) {
                if (!opts.isRevert && !!this.currentCodeView)
                    this.currentCodeView.commit();
                Script.setStableNames();
                var meta = Script.toMeta();
                this.undoMgr.pushMainUndoState();
                var script = this.undoMgr.getScriptSource();
                var troubles = false
                var reported = false

                var editorState = this.getEditorState();
                if (opts.forReal &&
                    // only run the ids check when the script was actually modified
                    (this.scriptForCloud != script || editorState.worldInfo.status != "published")
                    ) {
                    if (Script.hasIds) {
                        try {
                            new AST.InitIdVisitor(false).expectSet(Script)
                        } catch (err) {
                            (<any>err).bugAttachments = [script2];
                            Util.reportError("saveStateAsync", err, false)
                            reported = true
                        }
                    }

                    var script2 = this.serializeScript();
                    if (script != script2) {
                        troubles = true
                        if (!reported) {
                            var err = new Error("Script text mismatch: " + this.undoMgr.checkCaches());
                            (<any>err).bugAttachments = [script2];
                            Util.reportError("saveStateAsync", err, false)
                        }
                        script = script2;
                    }

                }
                localStorage["editorState"] = JSON.stringify(editorState);

                var serializedEditorState = this.serializeState()

                if (opts.isRevert || opts.wasUpgraded || this.scriptForCloud !== script || this.editorStateForCloud != serializedEditorState) {
                    var worldInfo = editorState.worldInfo;
                    Util.assert(worldInfo.version < 2147483647); // keep it an int; 2147483647 means script was deleted
                    var version = ++worldInfo.version;
                    if ((opts.isRevert && worldInfo.status !== "published") ||
                        (!opts.isRevert && worldInfo.status !== "unpublished"))
                        this.queueNavRefresh();
                    var time = World.getCurrentTime();
                    if (this.scriptForCloud === script && worldInfo.status == "published") {
                        // just keep it - both the upgrade scenario and editor state update
                    } else {
                        // clear the parentIds when the script is first modified after publication/install
                        if (Script.parentIds.length && !opts.isRevert && worldInfo.status == "published") {
                            Script.parentIds = []
                            if (troubles)
                                script = this.serializeScript()
                            else
                                script = this.undoMgr.getScriptSource();
                        }
                        worldInfo.status = opts.isRevert ? "published" : "unpublished";
                    }
                    if (opts.isRevert)
                        Util.assert(!!worldInfo.baseUserId)
                    var h = <Cloud.Header>(<any>{
                        status: worldInfo.status,
                        scriptId: worldInfo.baseId,
                        meta: meta,
                        name: meta.name,
                        scriptVersion: <Cloud.Version>{
                            instanceId: Cloud.getWorldId(),
                            version: version,
                            time: time,
                            baseSnapshot: worldInfo.baseSnapshot
                        },
                        guid: worldInfo.guid,
                        recentUse: time,
                        userId: worldInfo.baseUserId,
                    });
                    this.scriptVersions[h.guid] = this.versionString(h);
                    this.scriptForCloud = script;
                    this.editorStateForCloud = serializedEditorState;
                    // it is in fact unlikely that we will ever have more than one script in there at a time
                    // but why take chances...
                    var prevS = localStorage["editorScriptToSave"];
                    var prev:ScriptToSave[] = [];
                    if (!prevS) prev = [];
                    else prev = JSON.parse(prevS);
                    prev.push(<ScriptToSave>{ header: h, script: script, editorState: serializedEditorState });
                    localStorage["editorScriptToSave"] = JSON.stringify(prev);
                    localStorage["editorScriptToSaveDirty"] = h.guid; // TODO: support saving not just one, but many past scripts
                }

                if (opts.clearScript) {
                    setGlobalScript(null);
                    this.stepTutorial = null;
                }
            }
            return this.flushLocalStorageAsync();
        }

        private setupNavPane() : void
        {
            this.typeCheckPending = true;
            this.currentSideTab = null;
            this.refreshSideTab();
            this.showSideTab(this.scriptNav, false);
        }

        public freshTestAction(): AST.Action {
            var decl = AST.Parser.parseDecl("action test() { meta test; }");
            decl.setName(Script.freshName("test"));
            return <AST.Action>decl;
        }

        public freshAsyncAction(): AST.Action {
            var decl = AST.Parser.parseDecl("action do_stuff() { }");
            decl.setName(Script.freshName("do stuff"));
            return <AST.Action>decl;
        }

        public freshAction():AST.Action
        {
            var decl = AST.Parser.parseDecl("action do_stuff() { meta private; meta sync; }");
            decl.setName(Script.freshName("do stuff"));
            return <AST.Action>decl;
        }

        public freshActionTypeDef():AST.Action
        {
            // you usually don't want these to be private in libraries
            var decl = AST.Parser.parseDecl("action `type` callback() { }");
            decl.setName(Script.freshName("callback"));
            return <AST.Action>decl;
        }

        public freshPage():AST.Action
        {
            var decl = <AST.Action>AST.Parser.parseDecl("action show() { meta private; meta page; }");
            decl.setName(Script.freshName("show"));
            return <AST.Action>decl;
        }

        public freshVar(k:Kind = null)
        {
            var decl = <AST.GlobalDef> AST.Parser.parseDecl("var v : Number { transient = true; }");
            decl.setName(Script.freshName("v"));
            if (k) decl.setKind(k);
            return decl;
        }

        public freshArtResource(kind : string, name: string, url? : string) : AST.Decl {
            var decl = AST.Parser.parseDecl("var a : " + kind + " { is\\_resource = true; url = ''; }");
            if (url) (<AST.GlobalDef>decl).url = url;
            decl.setName(Script.freshName(name));
            return decl;
        }

        public addNode(n: AST.Decl)
        {
            Script.addDecl(n);
            n.freshlyCreated();
            this.initIds(n, false);
            this.renderDecl(n);
            this.queueNavRefresh();
            this.typeCheckNow();
        }

        public freshSoundResource(name: string = "snd", url? : string) {
            return this.freshArtResource("Sound", name, url);
        }

        public freshPictureResource(name: string = "pic", url? : string) {
            return this.freshArtResource("Picture", name, url);
        }

        public freshResource()
        {
            return this.freshPictureResource();
        }

        public freshLibrary() { return AST.LibraryRef.fresh(); }

        public freshObject() { return this.freshRecord('Object'); }
        public freshTable() { return this.freshRecord('Table'); }
        public freshIndex() { return this.freshRecord('Index'); }
        public freshRecord(type : string)
        {
            var name = Script.freshName(lf("Thing"));
            var decl = AST.Parser.parseDecl("table " + name + " { type = '" + type + "'; fields { } }");
            return decl;
        }

        public initIds(s:AST.AstNode, refreshIds = false) {
            if (Script.hasIds) {
                new AST.InitIdVisitor(refreshIds).dispatch(s)
            }
        }

        public editNode(s:AST.AstNode, isBelow = false, refreshIds = false)
        {
            if (!s) return // not sure when this happens...

            this.initIds(s, refreshIds);
            Ticker.dbg("Editor.editNode: " + s.nodeType() + " " + ((<AST.Stmt>s).getStableName ? (<AST.Stmt>s).getStableName() : "[non-stmt]"));
            this.spyManager.onEdit(s);

            var editor:SideTab;
            var stmtEditor:StmtEditor;

            this.undoMgr.pushMainUndoState();

            if (s instanceof AST.Comment)
                stmtEditor = this.commentEditor;
            else if (s instanceof AST.InlineAction)
                editor = this.inlineActionEditor;
            else if (s instanceof AST.ActionHeader)
                editor = this.actionProperties;
            else if (s instanceof AST.RecordKind || s instanceof AST.RecordPersistenceKind)
                editor = this.recordEditor;
            else if (s instanceof AST.RecordDef || s instanceof AST.LibraryRef || s instanceof AST.GlobalDef) {
                // not editing these
                if ((<AST.Stmt>s).renderedAs)
                    Util.coreAnim("shakeTip", 500, (<AST.Stmt>s).renderedAs)
                return
            }
            else if (s instanceof AST.Stmt) {
                stmtEditor = this.calculator;
                // Hide the chat, it uses too much vertical space.
                this.teamElt.setFlag("collapsed", true);
                this.scrollDownMessageList();
            }

            if (this.debuggerMode) {
                if (stmtEditor)
                    stmtEditor = this.debuggerEditor;
                else
                    editor = this.debuggerNonEditor;
            } else if (isBelow) {
                stmtEditor = this.selectorEditor;
            }


            if (!editor && !stmtEditor) return;

            this.resetSidePane();

            if (stmtEditor) {
                this.hideSidePane(true);
                this.showSideTab(editor, false, stmtEditor);
            } else {
                this.showSideTab(editor, true);
            }

            if (s instanceof AST.Stmt) {
                this.selector.setup(<AST.Stmt>s);
                this.selector.setupCodeButtons();
            }

            if (!editor)
                stmtEditor.edit(<AST.Stmt>s);
            else
                editor.edit(<AST.Stmt>s);
            this.adjustCodeViewSize(<AST.Stmt>s);
            this.updateTutorial();
        }

        public adjustCodeViewSize(s:AST.Stmt)
        {
            var stmtEd = this.stmtEditorPane();
            var ch = <HTMLElement> stmtEd.firstChild
            if (s && ch && ch.offsetHeight) {
                var stmtEdtHeight = ch.offsetHeight + 3;
                var chatHeight = this.teamElt ? this.teamElt.offsetHeight : 0;
                this.codeInner.style.height = this.codeOuter.offsetHeight - chatHeight - stmtEdtHeight + "px";
                // elt("rightPane").style.height = codeOuter.offsetHeight - stmtEdtHeight + "px";
                Util.ensureVisible(s.renderedAs, this.codeInner, 2.5 * SizeMgr.topFontSize);
            } else {
                this.codeInner.style.height = "100%";
                // elt("rightPane").style.height = "100%";
            }
        }

        public moveEditorCarret(off:number)
        {
            this.selector.moveCarret(off);
            this.editNode(this.selector.selectedStmt);
        }

        public nodeTap(s:AST.AstNode, isInner:boolean, isBelow = false)
        {
            if (!Script) return;
            if (this.isReadOnly && !this.debuggerMode) return;

            while (s instanceof AST.Stmt && (<AST.Stmt>s).isCommentedOut()) {
                s = (<AST.Stmt>s).parent
            }

            var now = Util.now()
            var dblTap = (now - this.lastTapTime < 500 && s == this.lastTappedNode);
            this.lastTapTime = now;
            this.lastTappedNode = s;

            if (dblTap && s instanceof AST.Stmt && !(s instanceof AST.ActionHeader)) {
                if (!this.selector.nonActionSelected())
                    this.selector.setup(<AST.Stmt>s);
                this.selector.startSelection();
                return;
            }

            if (!isInner) {
                this.dismissModalPane();
                return;
            }

            if (this.currentStmtEditor && this.currentStmtEditor.nodeTap(s))
                return;

            if (this.currentCodeView && s instanceof AST.Stmt && this.currentCodeView.nodeTap(<AST.Stmt>s))
                return;

            this.editNode(s, isBelow)
        }

        public belowDeclTap()
        {
            if (this.currentStmtEditor) {
                this.dismissSidePane();
                return;
            }

            var last:AST.Stmt = null;

            var desc = (s:AST.AstNode) => {
                if (s instanceof AST.Stmt) {
                    if (!(s instanceof AST.Block) && (<AST.Stmt>s).renderedAs)
                        last = <AST.Stmt>s;
                    s.children().forEach(desc);
                }
            }

            this.lastDecl.children().forEach(desc);

            if (last && !last.isCommentedOut()) {
                this.editNode(last);
                //selector.setup(last);
                //forceRefresh = true;
                //selector.addCallback(1)();
            }
        }

        private editLastNode()
        {
            if (this.currentSideTab.isModal()) {
                this.dismissSidePane();
                return;
            }

            this.editNode(this.firstIfMissing(this.selector.selectedStmt));
        }

        public firstIfMissing(node:AST.AstNode):AST.Stmt
        {
            if (this.lastDecl instanceof AST.Action || this.lastDecl instanceof AST.RecordDef) {
                while (node && !node.isInvisible) {
                    var search = new SearchForNode(node);
                    search.dispatch(this.lastDecl);
                    if (search.found) return <AST.Stmt>node;
                    if (node instanceof AST.Stmt) {
                        node = (<AST.Stmt>node).parent;
                        if (node instanceof AST.Block)
                            node = (<AST.Block>node).parent;
                    }
                }
                var a = this.currentAction();
                if (!a) return null;
                var pg = a.getPageBlock(true);
                if (pg) return pg.stmts[0];
                else return a.body.stmts[0];
            }
        }

        public goToNodeId(id:string)
        {
            var loc = CodeLocation.fromNodeId(id);
            if (loc)
                if (this.host.wallVisible)
                    this.host.hideWallAsync().done(() => {
                        //this.wallBox = <HTMLElement>this.host.getWall().lastChild;
                        if (!this.currentSideTab)
                            this.setupNavPane();
                        this.lastDecl = null;
                        this.setupPlayButton();
                        this.goToLocationAndEdit(loc);
                    })
                else {
                    //this.wallBox = <HTMLElement>this.getSideWall().lastChild;
                    this.goToLocationAndEdit(loc);
                }
        }

        public keyDown(e:KeyboardEvent)
        {
            if (!this.visible) return false;
            if (this.host.wallVisible) return false;

            if (e.srcElement == this.searchBox || (<any>e).originalTarget == this.searchBox) {
                if (this.currentSideTab != this.searchTab) {
                    this.focusSideTab(this.searchTab);
                }
                this.showSidePane();
            }

            if (this.currentStmtEditor && this.currentStmtEditor.handleKey(e))
                return true;

            if (this.currentSideTab && this.currentSideTab.handleKey(e))
                return true;

            switch (e.keyName) {
            case "Esc":
                if (this.currentSideTab != this.scriptNav) {
                    this.dismissSidePane();
                    return true;
                }
                break;

            case "PageUp":
            case "PageDown":
                if (!e.fromTextArea) {
                    TheEditor.selector.moveCarret(e.keyName == "PageUp" ? -2 : +2);
                    return true;
                }
                break;

            case "Up":
            case "Down":
                if (!e.fromTextArea) {
                    if (this.currentSideTab.isModal())
                        this.dismissSidePane();
                    TheEditor.selector.moveCarret(e.keyName == "Up" ? -1 : +1);
                    return true;
                }
                break;

            case "Shift-Up":
            case "Shift-Down":
                if (!e.fromTextArea) {
                    TheEditor.selector.extendCarret(e.keyName == "Shift-Up" ? -1 : +1);
                    return true;
                }
                break;

            case "Right":
                if (!e.fromTextBox && !this.currentSideTab.isModal()) {
                   this.editLastNode();
                   return true;
                }
                break;

            case "Enter":
                if (!e.fromTextArea && !this.currentSideTab.isModal()) {
                   this.editLastNode();
                   return true;
                }
                break;

            case "Tab":
                if (!this.currentSideTab.isModal()) {
                    if (!this.sideKeyFocus) {
                        this.sideKeyFocus = true;
                        this.currentSideTab.gotKeyboardFocus();
                        this.selector.hideCurrent();
                    } else {
                        this.sideKeyFocus = false;
                        this.currentSideTab.refresh();
                        this.selector.showCurrent();
                    }
                }
                return true;

            case "Ctrl-Q":
                this.popupMenu();
                return true;

            case "Ctrl-V":
            case "Shift-Ins":
            case "Ctrl-C":
            case "Ctrl-X":
            case "Shift-Del":
            case "Ctrl-Del":
            case "Ctrl-Ins":
                this.clipKey(e.keyName);
                return true;

            case "Ctrl-Alt-D":
                if (this.stepTutorial) this.stepTutorial.showDiff();
                return true;

            case "Ctrl-Alt-R":
                if (isBeta && this.stepTutorial) this.stepTutorial.replyDialog();
                return true;

            default:
                var s = Util.keyEventString(e, ":");
                if (s && !e.metaKey && !e.ctrlKey) {
                    this.searchFor(s);
                    return true;
                }
                break;
            }

            return false;
        }

        private clipKey(name:string)
        {
            this.dismissSidePane()
            var stmt = this.selector.selectedStmt
            if (stmt instanceof AST.ActionHeader || stmt instanceof AST.ActionParameter)
                stmt = null;
            stmt = this.firstIfMissing(stmt)
            if (stmt) {
                this.selector.setup(stmt);
                switch (name) {
                case "Ctrl-V":
                case "Shift-Ins":
                    this.selector.pasteCode();
                    this.refreshDecl();
                    break;
                case "Ctrl-C":
                case "Ctrl-Ins":
                    this.selector.copyCode();
                    break;
                case "Ctrl-X":
                case "Shift-Del":
                    this.selector.cutCode();
                    this.refreshDecl();
                    break;
                }
            }
        }

        public showLive(inner:HTMLElement)
        {
            this.removeVideo();
            this.videoContainer = divId("editorVideo", "editorVideo inlineDocs", inner)
            elt("editorContainer").appendChild(this.videoContainer);
            this.applyVideoSize();
        }

        static sideDocBtn(icon:string)
        {
            return HTML.mkButtonElt("code-button", div("code-button-frame", HTML.mkImg("svg:" + icon + ",black")));
        }

        public setStepHint(e:HTMLElement)
        {
            if (this.innerDocContainer)
                this.innerDocContainer.setChildren(e)
        }

        public removeTutorialLibs()
        {
            Script.libraries().forEach(l => {
                if (/^_/.test(l.getName()))
                    Script.deleteDecl(l)
            })
        }


        public followTopic(topic:HelpTopic, firstTime: boolean = false, tutorialMode: string = "")
        {
            this.loadIntelliProfile(topic, firstTime);
            AST.followingTutorial = true;

            this.removeVideo();
            var innerHeader = topic.renderHeader();
            innerHeader.className += " inlineDocsHeaderInnerInner";
            var header = div("inlineDocsHeaderInner", innerHeader);
            this.innerDocContainer = null;

            this.videoContainer = divId("editorVideo", "editorVideo inlineDocs");
            this.docContainer = header;
            this.videoContainer.appendChild(this.docContainer);

            var isTopic = topic.id != topic.json.id;
            Script.editorState.tutorialId = (isTopic ? "t:" : "") + topic.id;
            Script.editorState.tutorialMode = tutorialMode;
            var href = (isTopic ? "#topic:" : "#script:") + topic.id;

            var btn = (icon, t:Ticks, f) => HTML.setTickCallback(Editor.sideDocBtn(icon), t, f)
            var cancelBtn = btn("cancel", Ticks.sideTutorialCancel, () => {
                ModalDialog.ask(lf("Are you sure you want to stop following the tutorial?"),
                    lf("leave tutorial"), () => this.leaveTutorial());
                });
            var docButtons = div("inlineDocsButtons",
                        btn("Star", Ticks.sideTutorialRedisplay, () => {
                            Script.editorState.tutorialRedisplayed = (Script.editorState.tutorialRedisplayed || 0) + 1
                            if (this.stepTutorial)
                                this.stepTutorial.startAsync().done();
                        }),
                        cancelBtn
            );
            header.appendChild(docButtons);
            elt("editorContainer").appendChild(this.videoContainer);
            this.applyVideoSize();
            this.updateTutorial()
        }

        public leaveTutorial() {
            Script.editorState.tutorialId = "";
            this.removeTutorialLibs();
            this.loadIntelliProfile(null);
            this.removeVideo();
            this.resetVideoConstraints();
        }

        public removeVideo()
        {
            if (!this.videoContainer) return;

            this.videoContainer.removeSelf();
            this.videoContainer = null;
            this.docContainer = null;
        }

        private applyVideoSize()
        {
            var vidE = this.videoContainer;
            if (!vidE) return;

            var w = SizeMgr.portraitMode ? SizeMgr.editorWindowWidth : 0.4*SizeMgr.windowWidth;
            var h = 0.40 * SizeMgr.windowHeight;

            w /= SizeMgr.topFontSize;
            h = SizeMgr.portraitMode ? 2.2 : 1.8;

            if (this.stepTutorial) {
                vidE.setFlag("step-tutorial", true)
            }

            vidE.style.width = w + "em";
            vidE.style.height = h + "em";

            this.applyVideoConstraints();
        }

        private applyVideoConstraints()
        {
            if (!this.videoContainer) return;
            var h = this.videoContainer.offsetHeight / SizeMgr.topFontSize;
            this.resetVideoConstraints();
            if (SizeMgr.portraitMode)
                elt("scriptMainPanes").style.bottom = (h+0.4) + "em";
            else
                elt("rightPane").style.bottom = (h+0.4) + "em";
        }

        public resetVideoConstraints()
        {
            elt("rightPane").style.bottom = "0em";
            elt("scriptMainPanes").style.bottom = "0em";
        }

        private moveVideoDown()
        {
            if (!this.videoContainer) return;
            this.showVideo();
            //Util.setTransform(this.videoContainer, "translate(0,0)");
        }

        public hideVideo()
        {
            if (!this.videoContainer) return;
            this.videoContainer.style.display = "none";
            this.resetVideoConstraints();
        }

        public showVideo()
        {
            if (!this.videoContainer) return;
            if (this.videoContainer.style.display != "block") {
                this.videoContainer.style.display = "block";
            }
            this.applyVideoConstraints();
        }

        static showFeedbackBox()
        {
            var link = (text:string, lnk:string) =>
                HTML.mkButton(text,
                                () => { window.open(Cloud.getServiceUrl() + lnk) });

            if (ModalDialog.current && !ModalDialog.current.canDismiss) {
                window.open(Cloud.getServiceUrl());
                return;
            }

            var relId = "(local)";
            var mtch = /-(\d+)\//.exec(Ticker.mainJsName)
            if (mtch) relId = mtch[1];

            var m = new ModalDialog();
            m.fullWhite();
            m.add(div("wall-dialog-header", Runtime.appName));
            m.add(div("wall-dialog-body", lf("For feedback and support please use our forum, or just email us!")));
            m.add(div("wall-dialog-buttons",
                HTML.mkButton(lf("changes"),() => {
                    HTML.showProgressNotification(lf("downloading change log..."))
                    Util.httpGetJsonAsync((<any>window).mainJsName.replace(/main.js$/, "buildinfo.json"))
                        .then(t => RT.Web.browseAsync("http://github.com/Microsoft/TouchDevelop/commits/" + t.commit))
                        .done();
                }),
                HTML.mkButton(lf("forum"),() => { Browser.Hub.showForum(); }),
                HTML.mkButton(lf("GitHub"),() => { RT.Web.browseAsync("https://github.com/Microsoft/TouchDevelop").done(); })
                /*
                HTML.mkButton(lf("email"), () => {
                    if (Browser.win8) {
                        window.open("mailto:touchdevelop@microsoft.com?subject=Feedback about TouchDevelop App Early Preview for Windows 8");
                    } else if (Browser.isWP8app) {
                        window.open("mailto:touchdevelop@microsoft.com?subject=Feedback about TouchDevelop App for Windows Phone 8 with cloud services v" + relId);
                    } else {
                        window.open("mailto:touchdevelop@microsoft.com?subject=Feedback about TouchDevelop Web App v" + relId);
                    }
                }) */
                ));

            m.add(div("wall-dialog-body", "Running against cloud services v" + relId + ". " +
                                          "TouchDevelop was brought to you by Microsoft Research."));
            m.add(div("wall-dialog-buttons",
                link("legal", "/legal"),
                link("privacy and cookies", "/privacy")));

            m.add(div("wall-dialog-buttons",
                link("visit www.touchdevelop.com", "/")));

            m.show();
        }

        static mkBetaNote() : HTMLElement
        {
            var beta = div("beta-note");
            var betaFriendlyId = (<any>window).betaFriendlyId;
            var betaNote = (<any>window).betaFriendlyId ? ("<b>" + betaFriendlyId + "</b> ") : "";
            var copyrights = "<div class='beta-legal'>© 2015 <span class='beta-black'>Microsoft</span></div>" +
                             "<div class='beta-legal'><span class='beta-underline'>privacy and cookies</span>&nbsp;&nbsp;<span class='beta-underline'>legal</span></div>"
                             ;

            // there is a menu option for that in the wp8 app
            if (Browser.isWP8app) copyrights = "";

            Browser.setInnerHTML(beta, betaNote + copyrights);

            beta.withClick(Editor.showFeedbackBox);

            return beta;
        }

        public displayHelp()
        {
            tick(Ticks.calcHelp);
            if (HelpTopic.contextTopics.length == 0) {
                Util.setHash("#help")
            } else {
                Util.setHash("#topic:" + HelpTopic.contextTopics[0].id)
            }
        }

        public showDebuggingHelp() {
            ModalDialog.ask(lf("Do you want to learn more about debugging in TouchDevelop? Accessing help will terminate your current debugging session."), lf("learn more"),
                () => {
                    TheEditor.leaveDebuggerMode();
                    Util.setHash("#topic:debugging")
                });
        }

        public updateScript()
        {
            this.dismissSidePane();

            if (this.scriptUpdateId) {
                this.saveStateAsync({ forReal: true }).done(() => {
                    if (ScriptEditorWorldInfo.status !== "published") {
                        this.scriptUpdateId = "";
                        this.updateScript(); // retry
                        return;
                    }

                    ModalDialog.ask(lf("There is a new version of the current script."), lf("update"), () => {
                        ProgressOverlay.lockAndShow(lf("updating script"), () => {
                            tick(Ticks.editorUpdateScript);
                            World.updateAsync(ScriptEditorWorldInfo.guid).done(() => {
                                ProgressOverlay.hide();
                                this.reload();
                            });
                        })
                    })
                })
            } else {
                var libs = Script.libraries().filter((l) => l.needsUpdate)
                if (libs.length == 0) {
                    // ???
                    this.reload();
                    return;
                }

                ModalDialog.ask(lf("Some libraries need update: {0}",
                                         libs.map((l) => l.getName()).join(", ")), lf("update libraries"),
                () => {
                    tick(Ticks.editorUpdateLibrary);
                    this.updateLibraries(libs);
                })
            }
        }

        public updateLibraries(libs:AST.LibraryRef[])
        {
            ProgressOverlay.lockAndShow(lf("updating libraries"), () => {
                this.undoMgr.pushMainUndoState();
                Promise.sequentialMap(libs, (l) =>
                    LibraryRefProperties.bindLibraryAsync(l, Browser.TheHost.getScriptInfoById(l.updateId)))
                .done(() => {
                    ProgressOverlay.hide();
                    this.queueNavRefresh();
                })
            })
        }

        private setLibraryUpdateIds()
        {
            var num = 0;
            Script.libraries().forEach((l) => {
                if (l.isPublished())
                    Browser.TheApiCacheMgr.getAnd(l.getId(), (j:JsonScript) => {
                        var upd = null;
                        if (j.updateid && j.updateid != j.id && j.updatetime > j.time) upd = j.updateid;
                        if (upd) {
                            l.updateId = upd;
                            l.needsUpdate = true;
                            if (num++ == 0) this.queueNavRefresh();
                        } else {
                            l.updateId = l.getId();
                            l.needsUpdate = false;
                        }
                    })
            })
        }

        public librariesNeedUpdate()
        {
            return Script.libraries().some((l) => l.needsUpdate)
        }

        public notifyTutorial(event:string)
        {
            if (Script && this.stepTutorial)
                this.stepTutorial.notify(event)
        }

        public updateTutorial()
        {
            if (this.stepTutorial)
                this.stepTutorial.update()
        }

        public tutorializeName(s:string)
        {
            if (this.stepTutorial)
                return s.trim().toLowerCase()
            else
                return s
        }

        static testScriptParse(id:string):void
        {
            AST.loadScriptAsync(World.getAnyScriptAsync, id).done((resp:AST.LoadScriptResult) => {
                var app = Script
                setGlobalScript(resp.prevScript)
                console.log(resp)

                app.setStableNames();
                var cs = TDev.AST.Compiler.getCompiledScript(app, {
                        packaging: true,
                        authorId: "none",
                        scriptId: id
                });
                console.log(cs.getCompiledCode().length)

            })
        }

        static testScriptJson(id:string):void
        {
            AST.loadScriptAsync(World.getAnyScriptAsync, id).done((resp:AST.LoadScriptResult) => {
                var app = Script
                var js = AST.Json.dump(app)
                setGlobalScript(resp.prevScript)
                console.log(resp)
                console.log(js)
            })
        }

        static testIdAssignment(id:string)
        {
            World.getAnyScriptAsync(id).done(text => {
                console.log(AST.Diff.assignIds("", text))
            })
        }

        public replyTutorial(stepNo:number)
        {
            if (this.stepTutorial)
                this.stepTutorial.replyAsync(stepNo).done();
        }

        public canReplyTutorial()
        {
            return !!this.stepTutorial;
        }

        public getRuntimeTutorialState():TutorialState
        {
            if (!this.currentRt) return {}
            return this.currentRt.tutorialState || {}
        }

    }

    export module LocalProxy {
        export function updateDeploymentKey(h : string = HistoryMgr.windowHash()) : string {
            return h.replace(/#td_deployment_key=([a-zA-Z0-9]+)/, (x, tok) => {
                window.localStorage.setItem("td_deployment_key", tok)
                return ""
            })
        }

        export function updateShellAsync()
        {
            return Promise.as();

            // disable this stuff, until it works

            if (!Browser.localProxy) return Promise.as()

            updateDeploymentKey();
            if (!LocalShell.mgmtUrl("")) return Promise.as()

            return LocalShell.mgmtRequestAsync("stats")
                .then(resp => {
                    var waitAndAsk = () => {
                        Util.log("waiting for shell to restart")
                        return Promise.delay(1000)
                            .then(() => LocalShell.mgmtRequestAsync("stats"))
                    }
                    if (resp.autoUpdate && resp.shellSha != (<any>TDev).pkgShellSha["server.js"]) {
                        Util.log("auto-updating shell")
                        return LocalShell.mgmtRequestAsync("autoupdate", { shell: (<any>TDev).pkgShell["server.js"] })
                            .then(() => { }, e => { }) // this is somewhat likely to fail
                            .then(waitAndAsk)
                            .then(() => { }, e => waitAndAsk)
                            .then(() => { }, e => waitAndAsk)
                            .then(() => { }, e => waitAndAsk)
                    } else
                        return Promise.as()
                })
        }

        export function loadCachesAsync()
        {
            if (!Browser.localProxy) return Promise.as()


            HTML.localCdn = baseUrl.replace(/(\d\d\d\d\d.*|local\/)/, "cache/")

            var off = window.localStorage.getItem("offlineCaches")
            if (off) return Promise.as()

            Util.log("downloading offline caches")
            return Util.httpGetJsonAsync(baseUrl + "offlinecache")
                .then(json => restoreCachesAsync(json), err => {
                        Util.log("cannot load offline caches: " + err)
                    })
                .then(() => {
                    window.localStorage.setItem("offlineCaches", "loaded")
                    return
                })
        }

        function restoreCachesAsync(store:any):Promise
        {
            Util.log("loading offline caches, keys: " + Object.keys(store))
            if (store.entropy)
                Random.addCloudEntropy(store.entropy)
            return Promise.join([
                ScriptCache.restoreCacheAsync(store),
                RT.ArtCache.restoreCacheAsync(store),
                Browser.TheApiCacheMgr.restoreCacheAsync(store),
                Browser.Showcase.restoreCacheAsync(store),
            ])
        }

        export function saveCachesAsync():Promise
        {
            if (!LocalShell.mgmtUrl("")) return

            return snapshotCachesAsync()
                .then(json => Util.httpPostRealJsonAsync(LocalShell.mgmtUrl("savecache"), json))
        }

        function snapshotCachesAsync():Promise
        {
            var store = {}

            return Promise.join([
                ScriptCache.snapshotCacheAsync(store),
                RT.ArtCache.snapshotCacheAsync(store),
                Browser.TheApiCacheMgr.snapshotCacheAsync(store),
                Browser.Showcase.snapshotCacheAsync(store),
            ]).then(() => {
                console.log(store)
                return store
            })
        }
    }

    export interface SaveStateOptions {
        forReal?: boolean;
        isRevert?: boolean;
        clearScript?: boolean;
        wasUpgraded?: boolean;
    }

    export class SearchForNode
        extends AST.NodeVisitor
    {
        public found = false;

        constructor(public n:AST.AstNode) {
            super()
        }

        public visitAction(node:AST.Action)
        {
            super.visitAction(node)
            var d = node.getModelDef()
            if (d) this.dispatch(d)
        }

        public visitAstNode(node:AST.AstNode)
        {
            if (!this.found) {
                this.found = node === this.n;
                if (!this.found) this.visitChildren(node);
            }
        }
    }

    // new one created for each rendered action/variable/...
    export class CodeView
    {
        public editor:Editor;
        public firstRendering = false;
        private lastDisplayed:AST.Decl;
        public getTick():Ticks { return Ticks.noEvent; }

        public renderCore(decl:AST.Decl) {}
        public render(decl:AST.Decl)
        {
            this.lastDisplayed = decl;
            this.renderCore(decl);
        }

        public init(e:Editor)
        {
            this.editor = e;
        }

        public commit() {}

        public nodeType() : string { return Util.abstract() }
        public saveLocationAdd(loc:CodeLocation) {}
        public loadLocationAdd(loc:CodeLocation) {}

        public saveLocation()
        {
            var loc = new CodeLocation(this.lastDisplayed);
            loc.scrollPos = this.editor.codeInner.scrollTop;
            this.saveLocationAdd(loc);
            return loc;
        }

        public editedStmt():AST.Stmt { return null; }

        public loadLocation(loc:CodeLocation)
        {
            this.render(loc.decl);
            this.editor.codeInner.scrollTop = loc.scrollPos;
            this.loadLocationAdd(loc);
        }

        public nodeTap(s:AST.Stmt) { return false; }
    }

    export class ActionView
        extends CodeView
    {
        constructor() {
            super()
        }
        private renderer = new TDev.EditorRenderer();
        public getTick() { return Ticks.viewActionInit; }

        public nodeType() { return "action"; }

        public renderCore(decl:AST.Decl)
        {
            var action = <AST.Action>decl;
            Util.assert(action instanceof AST.Action);

            if (Util.cloudRun) {
                action.isOffloaded = action.isOffloaded && action.canBeOffloaded();
            }

            var render = () => {
                Util.time("render-action", () => {
                    var node = this.renderer.declDiv(action);
                    node.appendChild(div("declBottomSpacer").withClick(() => {
                        TheEditor.belowDeclTap();
                    }));
                    this.editor.displayLeft(node);
                    this.renderer.attachHandlers();
                });
                this.editor.selector.setupCodeButtons();
            }

            Util.time("typecheck-action", () => AST.TypeChecker.tcAction(action, this.firstRendering));
            render();
        }

        public saveLocationAdd(loc:CodeLocation)
        {
            loc.stmt = TheEditor.selector.selectedStmt;
        }

        public loadLocationAdd(loc:CodeLocation)
        {
            var stmt = TheEditor.firstIfMissing(loc.stmt);
            if (stmt != loc.stmt) loc.isSearchResult = false;
            TheEditor.selector.setSelected(stmt);

            var elt = stmt.renderedAs;
            if (!elt) return;
            elt = <HTMLElement>elt.firstChild;
            if (!elt) return;

            if (loc.isSearchResult) {
                Util.coreAnim("blinkLocation", 4000, elt);
            }

            Util.ensureVisible(elt, TheEditor.codeInner, 0.2);
        }
    }

    export class ScriptDebuggerNonCodeView
        extends CodeView {

        constructor() {
            super()
        }

        public getTick() { return Ticks.debuggerViewInit; }

        public nodeType() { return "debugger"; } // Surely should not match anything

        public renderCore(decl: AST.Decl) {
            this.editor.displayLeft(ScriptDebuggerEditor.mkSorryMsg());
        }

        public saveLocationAdd(loc: CodeLocation) {
        }

        public loadLocationAdd(loc: CodeLocation) {
        }
    }

    class LibEntry {
        public text:string;
        public app:AST.App;
        public loading:Promise;
    }

    export class LibraryCache
    {
        // guid or pubid => LibEntry
        private libCache:any = {};

        public clear() { return this.libCache = {}; }

        private loadLibCoreAsync(l:AST.LibraryRef)
        {
            var entry = this.libCache[l.getId()];
            if (entry) {
                if (entry.app)
                    return Promise.wrap(entry.app);
                else
                    return entry.loading;
            }

            if (!l.getId()) {
                l.setError("TD140: no resolution target");
                return Promise.wrap(null);
            }

            entry = new LibEntry();
            this.libCache[l.getId()] = entry;
            var getApp = (s:string) => {
                if (!s) {
                    entry.loading = Promise.wrap(null);
                    return null;
                }

                entry.loading = null;
                entry.text = s;
                entry.app = AST.Parser.parseScript(s);
                if (l.guid) entry.app.localGuid = l.guid;
                AST.TypeChecker.tcScript(entry.app);
                return entry.app;
            }

            if (l.guid)
                entry.loading = World.getInstalledScriptAsync(l.guid).then(getApp);
            else
                entry.loading = ScriptCache.getScriptAsync(l.pubid).then(getApp);
            return entry.loading;
        }

        // public fetchIfAvailable(l:AST.LibraryRef)

        public loadLibAsync(l:AST.LibraryRef)
        {
            return this.loadLibCoreAsync(l).then((app:AST.App) => {
                l.resolved = app;
                if (!app && l.getId())
                    l.setError("TD141: cannot load target library");
            });
        }

        public loadLibsAsync(app:AST.App)
        {
            return Promise.join(app.libraries().map((l) => this.loadLibAsync(l)));
        }
    }

    export enum EditorMode {
        unknown,
        block,
        classic,
        pro
    }

    export module EditorSettings {
        export var BLOCK_MODE = "block";
        export var PRO_MODE = "pro";
        export var CLASSIC_MODE = "classic";

        export function parseEditorMode(mode: string): EditorMode {
            if (!mode) return EditorMode.unknown;
            mode = mode.trim().toLowerCase();
            if (mode === BLOCK_MODE) return EditorMode.block;
            else if (mode === CLASSIC_MODE) return EditorMode.classic;
            else if (mode === PRO_MODE) return EditorMode.pro;
            else return EditorMode.unknown;
        }

        export function wallpaper(): string {
            return localStorage.getItem("editorWallpaper") || "";
        }

        export function setWallpaper(id: string, upload : boolean) {
            var previous = EditorSettings.wallpaper();
            if (previous != id) {
                if (!id) localStorage.removeItem("editorWallpaper")
                else localStorage.setItem("editorWallpaper", id);
                if (upload)
                    uploadWallpaper();
            }

            [elt("hubRoot"), elt("slRoot")].forEach(e => {
                if (id) e.style.backgroundImage = HTML.cssImage(HTML.proxyResource("https://az31353.vo.msecnd.net/pub/" + id));
                else e.style.backgroundImage = "";
            });
        }

        function uploadWallpaper() {
            var m = wallpaper();
            if (Cloud.getUserId() && Cloud.isOnline()) {
                Util.log('updating wallpaper to ' + m);
                Cloud.postUserSettingsAsync({ wallpaper: m })
                    .done(() => { HTML.showProgressNotification(lf("wallpaper saved"), true); }, (e) => { });
            }
        }

        export function setEditorMode(mode: EditorMode, upload : boolean) {
            var previous = EditorSettings.editorMode();
            if (previous != mode) {
                if (mode == EditorMode.unknown)
                    localStorage.removeItem("editorMode");
                else
                    localStorage.setItem("editorMode", EditorMode[mode]);
                if(upload)
                    uploadEditorMode();
            }
        }

        export function editorModeText(mode: EditorMode) : string {
            switch (mode) {
                case EditorMode.block: return lf("beginner");
                case EditorMode.classic: return lf("coder");
                case EditorMode.pro: return lf("expert");
                default: return "";
            }
        }

        export function editorMode(): EditorMode {
            return parseEditorMode(localStorage.getItem("editorMode"));
        }

        function uploadEditorMode() {
            var m = editorMode();
            if (Cloud.getUserId() && Cloud.isOnline() && m != EditorMode.unknown) {
                Util.log('updating skill level to ' + EditorMode[m]);
                Cloud.postUserSettingsAsync({ editorMode: EditorMode[m] })
                    .done(() => { HTML.showProgressNotification(lf("skill level saved"), true); }, (e) => { });
            }
        }

        export function changeSkillLevelDiv(editor: Editor, tk: Ticks, cls = ""): HTMLElement {
            var current = editorMode();
            return div(cls, current < EditorMode.pro ? lf("Ready for more options?") : lf("Too many options?"), HTML.mkLinkButton(lf("Change skill level!"), () => {
                tick(tk);
                EditorSettings.showChooseEditorModeAsync().done(() => {
                    if (current != editorMode()) editor.refreshMode();
                });
            }));
        }

        export function createChooseSkillLevelElements(click? : () => void): HTMLElement[] {
            var modes = [{ n: EditorMode.block, id: "brfljsds", descr: lf("Drag and drop blocks, simplified interface, great for beginners!"), tick: Ticks.editorSkillBlock },
                { n: EditorMode.classic, id: "ehymsljr", descr: lf("Edit code as text, more options, for aspiring app writers!"), tick: Ticks.editorSkillClassic },
                { n: EditorMode.pro, id: "indivfwz", descr: lf("'Javascripty' curly braces, all the tools, for experienced coders!"), tick: Ticks.editorSkillCurly }]
            return modes.map((mode, index) => {
                var pic = div('pic');
                pic.style.background = HTML.cssImage("https://az31353.vo.msecnd.net/pub/" + mode.id);
                pic.style.backgroundSize = "cover";

                return div('editor-mode', pic, HTML.mkButton(EditorSettings.editorModeText(mode.n), () => {
                    tick(mode.tick);
                    EditorSettings.setEditorMode(mode.n, true);
                    if (click) click();
                }, 'title'), div('descr', mode.descr));
            });
        }

        export function showChooseEditorModeAsync(preferredMode = EditorMode.unknown): Promise {
            if (preferredMode != EditorMode.unknown && EditorSettings.editorMode() <= preferredMode) return Promise.as();

            TipManager.setTip(null)
            return new Promise((onSuccess, onError, onProgress) => {
                var m = new ModalDialog();
                m.onDismiss = () => onSuccess(undefined);
                m.add(div('wall-dialog-header', lf("choose your coding skill level")));
                m.add(div('wall-dialog-body', lf("TouchDevelop will adapt to the coding experience to your skill level. You can change your skill level again in the hub.")));
                var current = EditorSettings.editorModeText(EditorSettings.editorMode());
                if (current)
                    m.add(div('wall-dialog-header', lf("current skill level: {0}", current)));
                m.add(div('wall-dialog-body', EditorSettings.createChooseSkillLevelElements(() => m.dismiss())));
                m.add(Editor.mkHelpLink("skill levels"));
                m.fullWhite();
                m.show();
            });
        }
    }

    export class EditorHistoryMgr extends HistoryMgr
    {
        public hashReloaded()
        {
            super.hashReloaded()
            if (currentScreen)
                currentScreen.hashReloaded()
        }

        public showStartScreen()
        {
            TheLoadingScreen.hide();
            Browser.TheHub.showSections();
        }

        static findOnlineById(id:string):Promise
        {
            var allowEmpty = true;
            var h = HelpTopic.findById(id)
            if (h) return Promise.as(h)
            return ScriptCache.getScriptAsync(id).then(text => {
                if (!text && allowEmpty)
                    text = Util.fmt('meta version "v2.2,js,ctx";\nmeta name "missing {0}";\n' +
                                    '// Doesn\'t exists. #docs\n', MdComments.shrink(id))
                if (!text) return undefined;
                return HelpTopic.fromScriptText(id, text)
            })
        }

        public reload(h:string)
        {
            if (h == "#") h = "#hub"

            var i = h.indexOf("#access_token=");
            if (i != -1) {
                if(!Cloud.parseAccessToken(h,
                    () => TheEditor.logoutAsync(true, (<any>window).errorUrl + "#CSRF").done(),
                    () => TheEditor.logoutAsync(false, (<any>window).errorUrl + "#userchanged").done()
                    ))
                    return;
                window.localStorage["everLoggedIn"] = "yes";
                h = h.substr(0, i);
            }

            h = LocalProxy.updateDeploymentKey()

            Runtime.stopPendingScriptsAsync().done(() => {
                h = decodeURIComponent(h.replace("#", ""));
                var hs = h.split(":");
                if (!hs[0]) return;
                var inEditor = false;

                switch (hs[0]) {
                    case "script":
                        hs = ["list", "installed-scripts", "script", hs[1], "overview"];
                        inEditor = true;
                        break;
                    case "topic":
                    case "topic-tile":
                        hs = ["list", "topics", "topic", hs[1], "overview"];
                        inEditor = true;
                        break;
                    case "notifications":
                        hs = ["list", "installed-scripts", "notifications", "me", "notifications"];
                        break;
                    case "forum":
                        hs = ["list", "comments", "forum", "forum", hs[1]];
                        break;
                    case "androidgcm":
                        hs = ["hub", "androidgcm", hs[1], hs[2], hs[3] ];
                        break;
                    case "joingroup":
                        hs = ["hub", "joingroup", hs[1] ];
                        break;
                    case "creategroup":
                        hs = ["hub", "creategroup"];
                        break;
                    case "pub":
                        hs = ["hub", "pub", hs[1] ];
                        break;
                    case "print":
                        Promise.join(hs[1].split(/,/).map(EditorHistoryMgr.findOnlineById))
                            .then(HelpTopic.printManyAsync)
                            .done(() => {
                                //Ticker.dbg("history.back from EditorHistoryMgr (print)");
                                //window.history.back();
                            })
                        return;
                    case "landing":
                        hs = ["hub", "install-run", hs[1]]
                        break;
                }

                if (hs[0] == "list" && hs[1] == "help") inEditor = true;

                var myScreen = allScreens.filter((s) => s.screenId() == hs[0])[0];
                if (hs[0] == "run" || hs[0] == "run-action" || hs[0] == "replace-tutorial") myScreen = TheEditor;
                if (hs[0] == "help") {
                    myScreen = Browser.TheHost;
                    inEditor = true;
                }

                if (myScreen) {
                    var setIt = false;
                    if (TheEditor.visible && !TheEditor.isWallVisible() && inEditor)
                        setIt = true;
                    allScreens.forEach((s) => {
                        if (s != myScreen) s.hide();
                    });
                    if (setIt)
                        Browser.TheHost.backToEditor = true;
                    this.replaceNext = true;
                    myScreen.loadHash(hs);
                }
            })
        }
    }

    export class LoadingScreen extends Screen
    {
        root:HTMLElement;
        guid:string;
        visible = false;

        private show()
        {
            if (!this.visible) {
                this.root.style.display = "block";
                this.visible = true;
                currentScreen = this;
            }
        }

        public init()
        {
            this.root = elt("loading");
        }

        public hide()
        {
            this.visible = false;
            this.root.style.display = "none";
            this.root.removeSelf();
            Browser.loadingDone = true;
        }

        public screenId() { return "sync-n-run"; }

        public loadHash(h:string[])
        {
            this.guid = h[1];
            this.show();
            HistoryMgr.instance.setHash(this.screenId() + ":" + this.guid, "Syncing...")

            // triggers sync
            Browser.TheHost.clearAsync(false).done();
        }

        public syncDone()
        {
            var h = HistoryMgr.instance;
            if (Browser.TheHost.getInstalledByGuid(this.guid)) {
                // store a nicer entry in history
                //h.navigate("list:installed-scripts:script:" + this.guid + ":overview", true)
                //document.title = "Script info - TouchDevelop";
                // and then run it
                Util.setHash("run:" + this.guid)
            } else {
                Util.setHash("hub", true);
            }
        }
    }
}
