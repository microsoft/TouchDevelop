///<reference path='refs.ts'/>


module TDev
{
    export interface CoverageData {
        compilerversion: string;
        astnodes: string[];
    }


    export interface IStackFrame
    {
        previous:IStackFrame;
        rt:Runtime;
        d:any; // data
        libs:any; // libraries
        returnAddr:IContinuationFunction;
        entryAddr:IContinuationFunction;
        isLibProxy:boolean;
        stackDepth:number;
        name:string;
        pc:string;
        prevPC?:string;
        // this is used in the asyncStack
        continueAt?:IContinuationFunction;
        currentHandler?:RT.EventBinding;
        serverRequest?: RT.ServerRequest;

        result?:any;
        results?:any[];
        pauseValue?:any;
        rendermode?:any;
        errorHandler?:(err:any,th:IStackFrame)=>void;
        isDetached?:boolean;
        asyncTask?:RT.Task<any>;
        loggerContext?:any;
    }

    export interface IContinuationFunction
    {
        (s:IStackFrame): IContinuationFunction;
    }

    // Cloud runner interface
    export interface ExecutionRequest
    {
        script:string;
        actionName:string;
        state:any;
    }

    export interface ExecutionResult
    {
        crashReport?:BugReport;
        wallMessages:string[];
        state:any;
    }

    export class StackFrameBase
        implements IStackFrame
    {
        public d:any;
        public libs:any;
        public returnAddr:IContinuationFunction = null;
        public entryAddr:IContinuationFunction = null;
        public previous:IStackFrame = null;
        public isLibProxy:boolean = false;
        public stackDepth:number;
        public name:string;
        public pc:string;
        public serverRequest:RT.ServerRequest;
        public errorHandler:(err:any,th:IStackFrame)=>void;
        public isDetached:boolean;
        public prevPC:string;

        constructor(public rt:Runtime) {
        }
    }

    export class StackBottom
        extends StackFrameBase
    {
        public needsPicker = false;

        constructor(rt:Runtime) {
            super(rt)

            this.pc = ""
            this.stackDepth = 0
            this.name = "<entry-point>";

            this.d = this.rt.datas["this"];
            this.libs = this.rt.compiled.libs;
        }
    }

    export class LibProxy
        extends StackFrameBase
    {
        public isLibProxy = true;
        constructor(libs:any, previous:IStackFrame, public libRefName:string, public libActionName:string, public invoke:()=>any) {
            super(previous.rt)
            this.pc = "";
            this.libs = libs;
            this.previous = previous;
            this.prevPC = previous.pc;
            this.d = this.rt.datas[this.libRefName];
            this.name = this.libActionName;
            this.stackDepth = previous.stackDepth;
        }
    }

    export class ResumeCtx
    {
        private shownProgress:boolean;
        private used = false;
        public rt: Runtime;
        public isBlocking = false;
        public versionNumber:number;

        constructor(public stackframe:IStackFrame)
        {
            this.rt = stackframe.rt;
            stackframe.rendermode = stackframe.rt.rendermode;
        }

        public isTaskCtx() { return false }

        private clearProgress()
        {
            if (this.shownProgress) {
                this.shownProgress = false
                HTML.showProgressNotification("")
            }
        }

        public resumeVal(v:any)
        {
            // valid only once
            if (this.used) return;
            this.used = true;
            this.clearProgress()
            this.resumeCore(v)
        }

        public resumeCore(v:any)
        {
            this.rt._resumeVal(v, this)
        }

        public resume() { return this.resumeVal(undefined); }

        public progress(msg:string)
        {
            this.shownProgress = true
            HTML.showProgressNotification(msg, false)
        }
    }

    export enum RtState
    {
        Stopped,
        Running,
        Paused,
        AtAwait,
        BreakpointHit,
    }

    export interface RuntimeHost
    {
        getWall(): HTMLElement;
        init(rt: Runtime): void;
        notifyStopAsync(): Promise;
        notifyHideWall(): void;
        notifyPagePush(): void;
        notifyPagePop(p: WallPage): void;
        notifyPageButtonUpdate(): void;
        notifyRunState(): void;
        // debugger notifiers
        notifyBreakpointHit(bp: string): void;
        notifyBreakpointContinue(): void;
        initApiKeysAsync(): Promise;
        agreeTermsOfUseAsync(): Promise;
        liveMode(): boolean;
        dontWaitForEvents(): boolean;
        exceptionHandler(exn: any): void;
        applyPageAttributes(wp: WallPage): void;
        isFullScreen(): boolean;
        setFullScreenElement(elmt: HTMLElement): void;
        setTransform3d(trans: string, origin: string, perspective: string): void;
        attachProfilingInfo(profile: any): void;
        attachCoverageInfo(coverage: any, showCoverage: boolean): void;
        isHeadless(): boolean;

        notifyTutorial(cmd: string);

        askSourceAccessAsync(source: string, description: string, secondchance: boolean, critical?:boolean): Promise; // of boolean

        toScreenshotCanvas(): HTMLCanvasElement;

        wallOrientation: number;
        wallHeight: number;
        wallWidth: number;
        fullWallWidth(): number;
        fullWallHeight(): number;
        userWallHeight(): number;

        astOfAsync(id: string): Promise;
        pickScriptAsync(mode: string, message: string): Promise;
        saveAstAsync(id: string, ast: any): Promise;
        deploymentSettingsAsync(id: string): Promise;
        packageScriptAsync(id : string, options: any) : Promise; // json object

        currentGuid: string;

        keyboard: TDev.RT.RuntimeKeyboard;

        updateCloudState(hasCloudState: boolean, type: string, status: string);
        isServer?: boolean;

        localProxyAsync?: (path: string, data: any) => Promise; // of any
    }

    export interface IPageButton
    {
        icon():string;
        getElement():HTMLElement;
        // ...
    }

    export module RuntimeSettings {
        export var readSetting = (key : string): any  =>
        {
            return window.localStorage[key];
        }

        export var storeSetting = (key : string, value : any) =>
        {
            window.localStorage[key] = value;
        }
        export function location() : boolean {
            return !readSetting("rtnolocation");
        }
        export function setLocation(value : boolean) {
            storeSetting("rtnolocation", value ? value : undefined);
        }
        export function sounds() : boolean {
            return !readSetting("rtsnosounds");
        }
        export function setSounds(value: boolean) : void {
            storeSetting("rtsnosounds", value ? value : undefined);
            if (!value)
                TDev.RT.Player.pause();
        }
        export var askSourceAccess = true;
    }

    export interface TutorialState
    {
        validated?:boolean;
    }

    export class Runtime
    {
        // shell/package.ts depends on the exact format of the next line
        static shellVersion = 39;

        // this is not to be set from the editor - only in the exported app
        static initialUrl: string;

        public host: RuntimeHost;
        private handlingException = false;
        public current: IStackFrame;
        private returnedFrom: IStackFrame;
        public validatorAction: string;
        public validatorActionFlags: string;
        public datas: any = {};
        public liveMode() { return this.host.liveMode(); }
        public testMode = false;
        private getWall() { return this.host.getWall(); }
        public compiled: CompiledScript;
        public devMode = true;
        public eventQ: EventQueue = null;
        private recordTypesRegistered = false;
        private resumePointOverride = null;
        private pageStack: WallPage[]; // Instantiated at #initFrom(CompiledScript)
        public versionNumber = 1;
        public pluginSlotId: string;
        private restartQueued = false;
        public tutorialState: TutorialState = null;
        public editorObj: RT.Editor;
        public renderedComments:string = "";

        public sessions: Revisions.Sessions;
        public authValidator: RT.StringConverter<string>;
        public authAccessToken:string;
        public authUserId:string;
        public _libinitDone:boolean;

        public runtimeKind() {
            return this.devMode ? "editor" : "website"
        }

        public requiresAuth(): boolean {
            return this.compiled.hasCloudData && this.sessions.getCurrentSession().requiresAuth;
        }

        public getUserId() {
            if (this.authUserId)
                return this.authUserId

            if (this.sessions.isNodeClient()) {
                return (<Revisions.NodeSession>this.sessions.getCurrentSession()).clientUserId;
            }

            return Cloud.getUserId()
        }


        // state for various singletons
        public webState: RT.Web.State = <any>{};

        private state: RtState = RtState.Stopped;
        private stateMsg: string = undefined;
        // when an event is executing, no other event can start
        public eventExecuting = false;
        // used to prevent recursive invocations of mainLoop
        private mainLoopRunning = false;

        // after the user hits the pause button: state==Stopped && resumeAllowed
        private resumeAllowed = false;

        public runningPluginOn = "";
        public headlessPluginMode = false;
        public tutorialObject = "";
        public pageTransitionStyle = "slide";
        public currentScriptId: string = undefined;  // current script id, if any, is needed for the leaderboards
        public currentAuthorId: string = undefined;
        public baseScriptId: string = undefined;
        public getScriptGuid(): string { return this.host.currentGuid; }
        public getScriptName(): string { return this.compiled.scriptTitle; }
        public getScriptColor(): string { return this.compiled.scriptColor; }
        public disposables: RT.Disposable[] = [];


        // Session related getters
        //public getUserId() { return this.sessions.current_userid; }
        //public getScriptAuthor() { return this.sessions.current_scriptauthor; }
        //public getScript() { return this.sessions.current_script; }

        //public checkSignedIn(specific_script: boolean) { return this.sessions.checkSignedIn(specific_script, this); }



        constructor(sessions?: Revisions.Sessions) {
            this.sessions = sessions || new Revisions.Sessions();
            this.sessions.rt = this;
        }


        private asyncStack: IStackFrame[] = [];
        private asyncTasks: any[] = [];

        static theRuntime: Runtime; // there can be only one running!
        static maxBoxLength: number = 1000;

        // debugging stuff
        public runMap: RunBitMap = new RunBitMap(); // runMap is essentially just a set of visited stuff for now
        public beenHere(id: string) {
            this.runMap.push(id);
        }
        public resetRunMap() { this.runMap.clear(); }

        private breakpoints: Hashtable;
        public initBreakpoints(h: Hashtable) { this.breakpoints = h; this.updateScriptBreakpoints(); }
        private hitBreakpoint(id: string) {
            this.debuggerLastState = this.state;
            this.setState(RtState.BreakpointHit, "breakpoint");
            this.host.notifyBreakpointHit(id);
        }
        public updateScriptBreakpoints() {
            if (!this.compiled) return;

            var binds = this.compiled.breakpointBindings;
            Object.keys(binds).forEach(k => {
                var bind = binds[k];
                bind.setter(this.breakpoints.get(k));
            });
        }

        private debuggerCC: IContinuationFunction;
        private debuggerLastState: RtState = null;
        public debuggerContinue() {
            if (!this.debuggerStopped()) return;

            if (this.debuggerLastState !== null) this.setState(this.debuggerLastState, "debugger last state")
            if (this.debuggerCC) this.mainLoop(this.debuggerCC, "resume debugger");

        }
        public debuggerStopped(): boolean {
            return this.state === RtState.BreakpointHit;
        }

        public debuggerQueryGlobalValue(stableName: string) {
            Util.log("Runtime.debuggerQueryGlobalValue: " + stableName);
            if (!this.compiled || !this.current) return;
            return this.current.d[stableName];
        }

        public debuggerQueryLocalValue(actionId: string, name: string, stackFrame?: IStackFrame) {
            Util.log("Runtime.debuggerQueryLocalValue: " + name);

            if (!this.compiled || !this.current) return;

            var actionBindings: { [name: string]: string; };

            this.compiled.forEachLib(l => {
                if (!actionBindings && l.localNamesBindings)
                    actionBindings = l.localNamesBindings[actionId];
            })

            if (!actionBindings) return;

            name = actionBindings[name];

            Util.log("Runtime.debuggerQueryLocalValue resolved to: " + name);
            var frame = stackFrame ? stackFrame : this.current;
            return frame && frame["$" + name];
        }

        public debuggerQueryOutValue(ix: number, stackFrame?: IStackFrame) {
            Util.log("Runtime.debuggerQueryOutValue: " + ix);

            if (!this.compiled || !this.current) return;

            var frame = stackFrame ? stackFrame : this.current;

            if (ix > 0) return frame.results[ix];
            else return (<any>frame).orig_result || frame.result || (frame.results && frame.results[0]);
        }

        public saveAndCloseAllSessionsAsync(): Promise {
            return this.sessions.clearScriptContext(true);
        }

        public permissionsAsync(): Promise {
            return this.sessions.getLocalSessionAttributeAsync("____source_access", this).then(s => JSON.parse(s || "{}"));
        }
        public savePermissionsAsync(perm: any): Promise {
            return this.sessions.setLocalSessionAttributeAsync("____source_access", JSON.stringify(perm), this);
        }

        static lockOrientation: (portraitAllowed: boolean, landscapeAllowed: boolean, showClock: boolean) => void = () => { };
        static rateTouchDevelop: () => void = null;
        static refreshNotifications: (enable: boolean) => void;
        static offerNotifications() { return !!Runtime.refreshNotifications || !!localStorage["gcm"]; }
        static legalNotice: string = "";
        static legalNoticeHeader: string;
        static companyCopyright = "Microsoft";
        static appName = "TouchDevelop";
        static notificationIcon = "https://www.touchdevelop.com/images/touchdevelop114x114.png";

        public getActionResults() {
            var r = this.returnedFrom;
            if (!r) return null;
            if (r.results) return r.results.slice(0);
            else return [r.result];
        }

        private eventCategory: string = null;
        private eventVariable: string = null;
        public setNextEvent(c: string, v: string) {
            this.eventCategory = c;
            this.eventVariable = v;
        }
        public resetNextEvent() {
            this.eventCategory = null;
            this.eventVariable = null;
        }

        public currentTime() {
            return Util.perfNow();
        }

        public setHost(h: RuntimeHost) {
            this.host = h;
            this.host.init(this);
        }


        // cloud service
        public inCloudCall: boolean = false;
        public inQuery: boolean = false;

        // should only be called for top-level cloud operation call
        public startCloudCall(libName: string, actionName: string, paramNames: string[], returnNames: string[], args: any, isQuery: boolean) {
            Util.assert(!this.inCloudCall);
            Util.assert(!this.inQuery);
            this.inCloudCall = true;
            if (!isQuery) {
                (<Revisions.NodeSession>this.sessions.getCurrentSession()).user_start_cloud_operation(libName, actionName, paramNames, returnNames, args, Revisions.CloudOperationType.OFFLINE);
            } else {
                this.inQuery = true;
            }
        }

        public endCloudCall(libName: string, actionName: string, paramNames: string[], returnNames: string[], args: any, isQuery: boolean) {
            Util.assert(this.inCloudCall);
            this.inCloudCall = false;
            if (isQuery) {
                Util.assert(this.inQuery);
                this.inQuery = false;
            } else {
                (<Revisions.NodeSession>this.sessions.getCurrentSession()).user_stop_cloud_operation(libName, actionName, paramNames, returnNames, args);
            }
        }

        public log(s: string) {
            Util.log(s);
        }

        ////////////////////////////////////////////////////////////////////////
        // Wall methods
        ////////////////////////////////////////////////////////////////////////

        public mayPostToWall(p: WallPage): boolean {
            return !this.headlessPluginMode && (!p.isAuto() || this.rendermode || p.crashed)
        }

        public clearWall() {
            var p = this.getCurrentPage();
            if (p.isAuto())
                Util.userError(lf("cannot clear wall on pages"));
            p.clear();
            p.render(this.host);
        }

        public setWallDirection(topDown: boolean) {
            var p = this.getCurrentPage();
            if (p.isAuto())
                Util.userError(lf("cannot set wall direction on pages"));
            p.setReversed(topDown);
        }

        //private postHtmlWithTap(e:HTMLElement, rtV:RT.RTValue)
        //{
        //    var box = this.postBoxedHtml(e)
        //    this.addTapEvent(e, rtV.rtType(), box, rtV);
        //}

        //public postTextWithTap(s:string, rtV:RT.RTValue)
        //{
        //    this.postHtmlWithTap(div("wall-text", s), rtV);
        //}

        public postHtml(e: HTMLElement, pc: string): void {
            this.postBoxedHtml(e, pc);
        }

        public postText(s: string, pc: string): void {
            this.postHtml(div("wall-text", s), pc);
        }

        public postException(e: HTMLElement): void {
            var p = this.getCurrentPage();
            if (this.rendermode)
                this.abortRender();
            else if (p.isAuto())
                p.clear();
            p.crashed = true;
            this.postBoxedHtml(e, "");
        }

        public addTapEvent(e: HTMLElement, tp: string, box: WallBox, v: any) {
            if (this.eventEnabled("tap wall " + tp)) {
                if (!box || !this.getCurrentPage().isAuto()) {
                    e.style.cursor = "pointer";
                    e.withClick(() => {
                        this.eventQ.add("tap wall " + tp, null, [v]);
                    });
                }
                else {
                    box.withClick(() => {
                        this.eventQ.add("tap wall " + tp, null, [v]);
                    });
                }
            }
        }


        ////////////////////////////////////////////////////////////////////////
        // Page methods
        ////////////////////////////////////////////////////////////////////////

        public getPageCount(): number {
            return !this.pageStack ? 0 : this.pageStack.length < 1 ? 1 : this.pageStack.length;
        }

        public pushPage(auto = false): WallPage {
            // Hide the current page.
            var currentPage = this.getCurrentPage();
            currentPage.deactivate();

            // Create a new page.
            var page = new WallPage(this, auto);

            if (auto && this.pageStack.length == 1 && !this.pageStack[0].isAuto()
                && this.pageStack[0].lastChildCount < 0 && !(this.pageStack[0].fullScreenElement))
                this.pageStack[0] = page; // special case: discard startup empty legacy wall page.
            else
                this.pageStack.push(page);

            // Append the page element to the wall.
            var wall = this.getWall();
            wall.appendChild(page.getElement());

            if (this.pageTransitionStyle == "slide")
                Util.coreAnim("showPageRight", 400, page.getElement())
            else if (this.pageTransitionStyle == "fade")
                Util.coreAnim("fadeIn", 400, page.getElement())

            // ensure render code is called
            this.forcePageRefresh();

            // Notify this event to the runtime host.
            this.host.notifyPagePush();

            this.applyPageAttributes();

            return page;
        }

        public popPagesIncluding(p: WallPage) {
            while (this.pageStack.indexOf(p) >= 0) {
                if (!this.popPage()) return;
            }
        }

        public popPage(transition: string = null): boolean {

            // Return false if current page is the default one.
            if (this.pageStack.length <= 1) return false;

            // Remove the topmost page element.
            var currentPage = this.pageStack.pop();
            var prevPage = currentPage;
            var currentElement = currentPage.getElement();

            // Show the previous page element.
            currentPage = this.getCurrentPage();
            currentPage.activate();

            var hideStyle = transition;
            var hideAnim = null;
            if (hideStyle == "slide" || hideStyle == "slide right")
                hideAnim = "hidePageLeft 0.2";
            else if (hideStyle == "slide up")
                hideAnim = "hidePageUp 0.7";
            else if (hideStyle == "slide down")
                hideAnim = "hidePageDown 0.7";
            else if (hideStyle == "fade")
                hideAnim = "fadeOut 0.3";
            else if (hideStyle == "none")
                hideAnim = "fadeOut 0.01";

            if (!hideAnim && this.pageTransitionStyle == "slide")
                hideAnim = "hidePageLeft 0.2";

            if (hideAnim) {
                currentPage.getElement().style.opacity = "0";
                var parts = hideAnim.split(/ /)
                var hideDuration = parseFloat(parts[1]) * 1000
                hideAnim = parts[0]
                Util.coreAnim(hideAnim, hideDuration, currentElement, () => {
                    currentElement.removeSelf()
                    currentPage.getElement().style.opacity = null;
                    if (this.pageTransitionStyle == "slide")
                        Util.coreAnim("showPageLeft", 300, currentPage.getElement())
                    else if (this.pageTransitionStyle == "fade")
                        Util.coreAnim("fadeIn", 400, currentPage.getElement())
                    else { }
                });
            } else if (this.pageTransitionStyle == "fade") {
                Util.coreAnim("fadeOut", 400, currentElement, () => currentElement.removeSelf())
                Util.coreAnim("fadeIn", 400, currentPage.getElement())
            } else {
                currentElement.removeSelf();
            }

            if (this.eventEnabled("page navigated from"))
                this.eventQ.add("page navigated from", null, [prevPage.rtPage()]);
            if (prevPage.onNavigatedFrom.handlers)
                this.queueLocalEvent(prevPage.onNavigatedFrom);

            // Notify this event to the runtime host.
            this.host.notifyPagePop(prevPage);
            this.applyPageAttributes();

            // ensure render code is called
            if (currentPage.isAuto())
                this.forcePageRefresh();
            else
                currentPage.render(this.host);

            return true;
        }

        public getPageAt(idx: number): WallPage {
            if (idx == 0) return this.getCurrentPage();
            else return this.pageStack[idx];
        }

        public initPageStack() {
            var page = new WallPage(this, false);
            this.pageStack = [page];
            var wall = this.getWall();
            if (wall)
                wall.setChildren([page.getElement()]);
            this.sessions.scriptRestarted();

            // defensive programming: reset mode to avoid mode errors when restarting after crashes
            this.resetRender();
        }

        private refreshPageStackForNewScript() {
            this.pageStack.forEach((p) => p.refreshForNewScript())
        }

        public getCurrentPage(): WallPage {
            if (!this.pageStack) return new WallPage(this, false)
            return this.pageStack.peek();
        }

        public onCssPage(): boolean {
            if (!this.pageStack) return false;
            var pg = this.pageStack.peek();
            return pg ? pg.csslayout : false;
        }

        public addPageButton(pageButton: IPageButton): void {
            this.forceNonRender("You may not add a page button here");
            var currentPage = this.getCurrentPage();

            currentPage.buttons.push(pageButton);
            this.host.notifyPageButtonUpdate();
            this.addTapEvent(pageButton.getElement(), "Page Button", null, pageButton);
        }

        public clearPageButtons(): void {
            this.forceNonRender("You may not remove a page button here");
            var currentPage = this.getCurrentPage();
            currentPage.buttons = [];
            this.host.notifyPageButtonUpdate();
        }

        public getPageButtons(): IPageButton[] { return this.getCurrentPage().buttons; }

        public applyPageAttributes(renderwall = false) {
            var p = this.getCurrentPage();
            this.host.applyPageAttributes(p);
            if (renderwall && !p.isAuto())
                p.render(this.host);
        }

        // libName, pageName, args
        public postAutoPage(...args: any[]) {
            this.eventQ.add("page", null, args);
        }

        public forceNonRender(msg = "You may not perform this operation here") {
            if (this.rendermode) {
                Util.userError(msg + ". Only side-effect-free operations are allowed in page display code.");
            }
        }

        public mkLibObject(libId:string, objectName:string)
        {
            var singl = this.getLibRecordSingleton(libId, objectName)
            var obj = <RT.ObjectEntry> new (<any>singl.entryCtor)(this);
            obj.on_render_heap = this.rendermode;
            return obj;
        }

        public getLibRecordSingleton(libId:string, objectName:string):RT.RecordSingleton
        {
            var indir = this.current.libs[libId + "$lib"]
            if (indir) libId = indir
            var d = this.datas[libId]
            var getsingl = this.compiled.libScripts[libId].objectSingletons[objectName]
            return getsingl(d)
        }

        public logDataWrite(renderheap = false) {
            if (!renderheap)
                this.forceNonRender("You may not modify global variables here");
            if (this.inQuery)
                this.forceNonRender("You may not change data in a query function");
            this.forcePageRefresh();
        }

        public logObjectMutation(value: RT.RTValue): void {
            if (value) {
                value.versioncounter++;
                if (!value.on_render_heap) {
                    this.forcePageRefresh();
                    this.forceNonRender();
                }
            } else {
                this.forceNonRender();
                this.forcePageRefresh();
            }
        }

        public forcePageRefresh() {
            if (!Browser.isNodeJS) {
                if (this.eventQ)
                    this.eventQ.queuePageUpdate();
            }
        }

        public yield_when_possible() {
            if (this.eventQ)
                this.eventQ.queueYield();
        }

        public yield_now() {
            var changes = this.sessions.yieldSession();
            if (this.eventQ) {
                this.eventQ.finishYield(changes, this.eventEnabled("cloud data updated"));
            }
        }

        public registerTimeDependency() {
            if (this.rendermode && this.eventQ)
                this.eventQ.registerTimeDependency();
        }


        public canPause() {
            return this.pageStack && this.pageStack.length && this.pageStack[this.pageStack.length - 1].isAuto();
        }

        public canResume() {
            return this.canPause() && this.resumeAllowed;
        }

        public liveViewSupported() {
            return this.canResume() && this.getCurrentPage().isAuto();
        }

        ////////////////////////////////////////////////////////////////////////
        // Render Mode
        ////////////////////////////////////////////////////////////////////////

        public rendermode = false;

        // called when excecution enters display code
        public enter_render() {
            this.rendermode = true;
            LayoutMgr.SetRenderExecutionMode(true);
            var page = this.getCurrentPage();
            page.startrender();
            LayoutMgr.setCurrentRenderBox(page.getCurrentBox());
            Util.log("Enter Render Mode");
        }

        // called when excecution exits display code
        public leave_render() {
            Util.log("Leave Render Mode");
            this.render();
            LayoutMgr.SetRenderExecutionMode(false);
            this.rendermode = false;
            if (this.eventQ)
                this.eventQ.finishPageUpdate(); // we just recomputed the view
            //this.render();
        }

        // called on exceptions
        public abortRender() {
            LayoutMgr.SetRenderExecutionMode(false);
            this.rendermode = false;

            // clear page so we can display an exception message
            this.getCurrentPage().clear();
            this.host.setFullScreenElement(undefined);
        }

        // called when starting the app (defensively)
        private resetRender() {
            LayoutMgr.SetRenderExecutionMode(false);
            this.rendermode = false;
            this.host.setFullScreenElement(undefined);
        }

        public markAllocated(obj: any) {
            if (this.rendermode && obj) obj.on_render_heap = true;
        }


        ////////////////////////////////////////////////////////////////////////
        // Box-related method
        ////////////////////////////////////////////////////////////////////////

        public getCurrentBoxBase(nonRenderOk = false): BoxBase {
            if (this.rendermode) {
                // get current box in layout mgr
                return LayoutMgr.getCurrentRenderBox();
            }
            else {
                if (!nonRenderOk)
                    Util.userError(lf("'box' can only be accessed in page display code"));
                // get current box on current page
                return this.getCurrentPage().getCurrentBox();
            }
        }
        public getCurrentBox(): WallBox {
            var box = this.getCurrentBoxBase();
            if (! (box instanceof WallBox))
                Util.userError(lf("'box' cannot be accessed in HTML layout mode"));
            return <WallBox> box;
        }
        public getCurrentHtmlBox(): HtmlBox {
            var box = this.getCurrentBoxBase();
            if (!(box instanceof HtmlBox))
                Util.userError(lf("'html' can only be accessed in HTML layout mode"));
            return <HtmlBox> box;
        }

        public render(popCount: number = 0): void {
            Contract.Requires(popCount >= 0);
            this.getCurrentPage().render(this.host, popCount);
        }

        public renderBox(box: BoxBase): void {
            var p = this.getCurrentPage();
            if ((p.crashed || !p.isAuto()) && (<WallBox>box).getDepth() === 1) {
                var popCount = 0;
                // avoid infinite wall
                var parent = <WallBox> box.parent;
                Util.assert(parent instanceof WallBox);
                if (parent.size() > Runtime.maxBoxLength) {
                    parent.shift();
                    popCount++;
                }
                this.render(popCount);
            }
        }


        public postBoxedHtml(e: HTMLElement, pc: string, reusekey= null): BoxBase {
            if (!this.mayPostToWall(this.getCurrentPage()))
                Util.userError(lf("cannot post to the wall here"));
            var box = WallBox.CreateOrRecycleLeafBox(this, reusekey);  // null key means we never recycle
            box.setContent(e);
            this.renderBox(box);
            return box;
        }

        /*
        public postBoxedHtmlWithTap(e:HTMLElement, type:string, rtV:any) : WallBox
        {
            if (this.suppressWallPosts(this.getCurrentPage())) return;
            var box = WallBox.CreateOrRecycleLeafBox(this, null);  // null key means we never recycle
            box.setContent(e);
            this.renderBox(box);
            this.addTapEvent(box.getContent(), type, rtV, box);
            return box;
        }
        */

        public postBoxedTextWithTap(s: string, rtV: any, pc: string): BoxBase {
            if (!this.mayPostToWall(this.getCurrentPage()))
                Util.userError(lf("cannot post to the wall here"));
            var box = WallBox.CreateOrRecycleLeafBox(this, rtV);
            if (!box.getContent()) {
                box.setContent(s);
                this.renderBox(box);
                var type;
                switch (typeof rtV) {
                    case "boolean":
                        type = "Bool";
                        break;
                    case "string":
                        type = "String";
                        break;
                    case "number":
                        type = "Number";
                        break;
                    default:
                        type = rtV.rtType();
                        break;
                }
                if (box instanceof WallBox)
                   this.addTapEvent(box.getContent(), type, <WallBox>box, rtV);
            }
            return box;
        }

        public postBoxedText(s: string, pc: string): BoxBase {
            if (!this.mayPostToWall(this.getCurrentPage()))
                Util.userError(lf("cannot post to the wall here"));
            var box = WallBox.CreateOrRecycleLeafBox(this, s);
            if (!box.getContent()) {
                box.setContent(s);
                this.renderBox(box);
            }
            return box;
        }

        public postUnboxedText(s: string, pc: string) {
            if (!this.mayPostToWall(this.getCurrentPage()))
                Util.userError(lf("cannot post to the wall here"));
            var box = WallBox.CreateOrRecycleLeafBox(this, s);
            if (!box.getContent()) {
                box.setContent(text(s));
                this.renderBox(box);
            }
            return box;
        }

        static inputboxstylemap = { textline: "text", password: "password", number: "number" };

        public postEditableText(style: string, s: string, handler: any /* RT.TextAction or Ref<string> */, pc: string): WallBox {
            if (!this.mayPostToWall(this.getCurrentPage()))
                Util.userError(lf("cannot post to the wall here"));
            var box = <WallBox> WallBox.CreateOrRecycleLeafBox(this, style);
            var current = box.getContent();
            if (!current) {
                if (style === "textarea") {
                    box.textarea = true;
                    var elt = HTML.mkTextArea();
                    elt.id = "i" + box.getId();
                    box.setContent(elt);
                }
                else {
                    box.textarea = false;
                    style = (Runtime.inputboxstylemap[style] || "text");
                    var elt2 = HTML.mkTextInput(style, lf("edit"));
                    elt2.id = "i" + box.getId();
                    box.setContent(elt2);
                }
                box.bindEditableText(s, handler, pc);
                this.renderBox(box);
            } else {
                box.textarea = (style === "textarea");
                box.bindEditableText(s, handler, pc);
            }
            return box;
        }



        ////////////////////////////////////////////////////////////////////////
        // Hooks for API
        ////////////////////////////////////////////////////////////////////////

        public nextHitCount(current: number) {
            if (current >= 200)
                return Math.round(200 + (Math.random() * 50));
            else
                return Math.round(current * (Math.random() + 1) + 2);
        }

        public isHeadless() {
            return this.host.isHeadless()
        }

        public restartAfterException() {
            this.current = null
            this.asyncStack = []
            this.setState(RtState.AtAwait, "restart after exception");
            this.queueRestart()
        }

        public stopAsync(isPause = false): Promise {
            var p = Promise.as();
            if (!this.isHeadless()) {
                HistoryMgr.instance.clearModalStack();
            }
            if (this.state != RtState.Stopped) {
                this.setState(RtState.Stopped, "stopAsync");
                if (!isPause) {
                    this.versionNumber++;
                    if (this.eventQ) this.eventQ.clear();
                }
                this.eventExecuting = false;
                this.resumeAllowed = isPause;
                if (this.headlessPluginMode)
                    ProgressOverlay.hide()
                this.asyncStack = [];
                this.asyncTasks = [];
                this.compiled.stopFn(this);
                if (!isPause && !this.resumeAllowed && !this.handlingException) {
                    var profilingData = this.compiled._getProfilingResults();
                    this.host.attachProfilingInfo(profilingData);
                    var runMap = this.getRunMap();
                    if (runMap)
                        this.host.attachCoverageInfo(<CoverageData>{
                            compilerversion: this.compiled._compilerVersion,
                            astnodes: runMap.toJSON()
                        }, this.compiled._showCoverage);
                }
                if (!this.resumeAllowed) {
                    this.killDisposables();
                    this.killTempState();
                }
                p = this.host.notifyStopAsync();
                p = p.then(() => this.sessions.stopAsync());
            }
            return p;
        }


        public stopAndHideAsync(): Promise {
            var p = this.stopAsync();
            this.host.notifyHideWall();
            return p;
        }

        public isStopped() { return this.state == RtState.Stopped; }

        public queueEvent(category: string, varValue: any, args: any[], ignore = true) {
            if (this.eventQ == null) return;
            this.eventQ.add(category, varValue, args, ignore);
        }

        public queueBoardEvent(categories: string[], valueStack: any[], args: any[], ignore = true, matchAll = false) {
            if (this.eventQ == null) return;
            this.eventQ.addBoardEvent(categories, valueStack, args, ignore, matchAll);
        }

        public queueLocalEvent(e: RT.Event_, args: any[]= [], ignore = true, skipIfInQueue = false, filter: (b: RT.EventBinding) => boolean = undefined) {
            if (this.eventQ == null) return;
            this.eventQ.addLocalEvent(e, args, ignore, skipIfInQueue, filter);
        }

        public queueAsyncEvent(f: () => any) {
            this.asyncTasks.push(f);
            this.queueRestart();
        }

        public queueRestart() {
            if (this.restartQueued || this.state != RtState.AtAwait) return;

            this.restartQueued = true;
            Util.setTimeout(0, () => {
                this.restartQueued = false;
                if (this.state != RtState.AtAwait) return;

                var f = this.pumpEventsCore();
                if (f) {
                    this.mainLoop(f, "queue restart");
                }
            })
        }

        public eventEnabled(category: string) { return this.eventQ != null && !!this.eventQ.eventsByCategory[category]; }

        ////////////////////////////////////////////////////////////////////////
        // Hooks for compiler
        ////////////////////////////////////////////////////////////////////////

        public enterAsync(t: RT.Task<any>, s: IStackFrame) {
            this.current.continueAt = s.returnAddr;
            this.asyncStack.push(this.current)
            s.asyncTask = t
            s.returnAddr = (s: IStackFrame) => {
                var prev = s.rt.returnedFrom
                t.resume(prev.results || prev.result)
                this.setState(RtState.AtAwait, "enterAsync stop");
                return null
            };
            return this.enter(s)
        }

        private last_topscript_pc: string;
        private isTopScriptFrame(s: IStackFrame): boolean { return s.libs.scriptId === s.libs.topScriptId; }
        public getTopScriptPc() {
            return this.current ?
                ((!this.rendermode || this.isTopScriptFrame(this.current)) ? this.current.pc : this.last_topscript_pc)
                : "";
        }

        public enter(s: IStackFrame): IContinuationFunction {
            this.current = s;
            if (s.previous) {

                if (this.rendermode && s.previous.isLibProxy && this.isTopScriptFrame(s.previous.previous)) {
                    this.last_topscript_pc = s.previous.previous.pc; s.previous.previous.libs
                }

                s.stackDepth = s.previous.stackDepth + 1;
                if (s.stackDepth > 1000) {
                    Util.userError("stack overflow");
                }
            }
            return s.entryAddr;
        }

        public leave() {
            var c = this.current;
            this.current = c.previous;
            if (this.current.isLibProxy)
                this.current = this.current.previous;
            if (c.serverRequest)
                c.serverRequest.response().sendNow()
            this.returnedFrom = c;
            var ret = c.returnAddr;
            //Util.dbglog("leave, " + c.name  +" ret " + ret )
            c.returnAddr = Runtime.pumpEvents;
            return ret
        }

        static toRestArgument(v: any, s: IStackFrame): any {
            if (typeof v == "undefined" ||
                typeof v == "string" ||
                typeof v == "number" ||
                typeof v == "boolean") {
                // OK
                return v
            } else if (v.exportJson) {
                try {
                    var ctx = new JsonExportCtx(s)
                    var v0 = v
                    ctx.push(v0)
                    v = v.exportJson(ctx)
                    ctx.pop(v0)
                    return v
                } catch (e) {
                    Util.userError("JSON export failed on " + v.toString())
                }
            } else {
                Util.userError("unsupported value in JSON cloud call: " + v.toString())
            }
        }



        public getRuntimeType(libname: string, typename: string) {
            var type = this.datas[libname];
            var result;
            Object.keys(type).forEach((t) => {
                if (type[t].name === typename) {
                    result = type[t]
                }
            });
            return result;
        }

        static stringToBoolean(s: string): boolean {
            if (!s) return false
            if (/^(false|no|0)$/i.test(s)) return false
            return true
        }

        static fromRestArgument(v: any, tp: any, s: IStackFrame): any {
            //if (typeof tp === "Object") {
            //    tp.fromRest(v, s);
            //}

            //if (tp.indexOf("Collection of") !== -1) {
            //    var subtype = tp.slice(14);
            //    var rtt = s.rt.datas.all[subtype];
            //    return TDev.RT.Collection.fromArray(v.map((v) => rtt.fromRest(v)));
            //}
            var singleton = s.d["$" + tp];
            if (singleton !== undefined) {
                return singleton.fromRest(v);
            }
            var a = tp.indexOf("→");
            if (a !== -1) {
                var lib = tp.slice(0, a);
                var tab = tp.slice(a + 1);
                if (lib.indexOf("Collection of") !== -1) {
                    lib = lib.slice(14);
                    var typ = s.rt.getRuntimeType(lib, tab);
                    return TDev.RT.Collection.fromArray(v.map((v) => typ.fromRest(v)), typ);
                } else {
                    return s.rt.getRuntimeType(lib, tab).fromRest(v);
                }

            }
            switch (tp) {
                case "Number":
                    return parseFloat(v);
                case "String":
                    return v + "";
                case "Boolean":
                    return Runtime.stringToBoolean(v);
                case "Json Object":
                    return RT.JsonObject.wrap(v);
                case "Json Builder":
                    if (typeof v == "object")
                        return RT.JsonBuilder.wrap(Util.jsonClone(v))
                    return undefined;
                default:
                    TDev.RT.App.logEvent(TDev.RT.App.WARNING, "rest", lf("unsupported type {0}", tp), undefined);
                    return undefined;
            }


        }

        // Service call that is tagged as offline available
        public callServiceOffline(isQuery: boolean, site: string, service: string, libName: string, actionName: string, paramNames: string[], returnNames: string[],
            returnTypes: string[], prev, ret, ...args: any[]) {
            var rt = this;
            var action = prev.libs[libName][actionName](prev);
            var next = ret;

            if (this.rendermode && !isQuery) {
                this.forceNonRender("Can not call a cloud function that is not \"read-only\" in display code");
            }

            // setup recording if outer cloud service call
            if (!rt.inCloudCall && !rt.host.isServer) {

                // Compose the parameters object
                var req = {};
                for (var i = 0; i < args.length; i++) {
                    req[paramNames[i]] = Runtime.toRestArgument(args[i], prev);
                }

                // 1) start recording operation
                prev.rt.startCloudCall(service, actionName, paramNames, returnNames, req, isQuery);

                // executed after outer cloud service function
                next = (s: IStackFrame) => {

                    // 3) stop recording operation
                    s.rt.endCloudCall(service, actionName, paramNames, returnNames, req, isQuery);

                    // 4) continue after function call
                    return ret;
                };
            }

            // 2) execute function locally
            return action.invoke.apply(action, [action, next].concat(args));
        }

        public queryServiceAsync(path:string, req:any, site = "")
        {
            var hdrs = {}
            hdrs["Content-type"] = "application/json;charset=UTF-8"
            if (this.authAccessToken)
                hdrs["Authorization"] = "Bearer " + this.authAccessToken

            if (!site) site = this.compiled.azureSite

            return Util.httpRequestAsync(site + "-tdevrpc-/" + path, "POST", JSON.stringify(req), hdrs)
                   .then((s) => s ? JSON.parse(s) : {})
        }

        // Remote service call -- action not tagged as "offline available"
        public callService(isQuery: boolean, site: string, service: string, libName: string, actionName: string, paramNames: string[], returnNames: string[],
            returnTypes: string[], prev, ret, ...args: any[]) {
            var rt = this;

            var run = (s: IStackFrame) => {
                if (this.rendermode) {
                    this.forceNonRender("Can not call a remote cloud function in display code (only \"offline available\" \"read-only\" are allowed)");
                }

                // Start await
                var ctx = this.getAwaitResumeCtx((s) => s.rt.leave());

                // Compose the parameters object
                var req = {};
                for (var i = 0; i < args.length; i++) {
                    req[paramNames[i]] = Runtime.toRestArgument(args[i], prev);
                }

                this.queryServiceAsync(encodeURIComponent(service) + "/" + encodeURIComponent(actionName), req, site)
                .done(resp => {
                        var results = returnNames.map((n) => resp[n]);
                        results = results.map((v, i) => Runtime.fromRestArgument(v, returnTypes[i], s))
                        if (results.length == 1)
                            s.result = results[0];
                        else
                            s.results = results;

                        // Resume await
                        ctx.resume();
                    }, (err: any) => {
                        TDev.Runtime.theRuntime.handleException(err, s);
                })

                /*
                var ses = (<Revisions.NodeSession>rt.sessions.getCurrentSession());

                if (!ses.hasNodeConnection()) {
                    var m = new ModalDialog();
                    m.add([
                        div("wall-dialog-header", lf("Trying to reach server")),
                        div("wall-dialog-body", lf("Please wait..."))
                    ]);
                    m.show();
                }

                ses.user_rpc_cloud_operation(service, actionName, paramNames, returnNames, req)
                    .then((resp) => {
                        var results = returnNames.map((n) => resp[n]);
                        results = results.map((v, i) => Runtime.fromRestArgument(v, returnTypes[i], s))
                        if (results.length == 1)
                            s.result = results[0];
                        else
                            s.results = results;

                        if (m) m.dismiss();

                        // Resume await
                        ctx.resume();
                    }, (err: any) => {
                        TDev.Runtime.theRuntime.handleException(err);
                    });
                */
            };

            return {
                previous: prev,
                returnAddr: ret,
                d: prev.d,
                rt: this,
                libs: prev.libs,
                entryAddr: run,
                name: actionName
            };

        }

        ////////////////////////////////////////////////////////////////////////
        // Parameter picking
        ////////////////////////////////////////////////////////////////////////

        public pickParameters(cont: (s: IStackFrame) => any, ...parms: RT.IFullPicker[]) {
            var ch: any[] = parms.map((p) => [div("picker-name", p.userName + ":"), div("picker-input", p.html)]);
            var ctx = this.getAwaitResumeCtx(cont);
            ch.push(div("wall-dialog-buttons", HTML.mkButton(lf("ok"), () => {
                var allOk = true;
                var s = this.current;
                parms.forEach((p) => {
                    var ok = p.validate();
                    allOk = allOk && ok;
                    p.html.setFlag("invalid", !ok);
                    if (ok) {
                        s[p.quotedName] = p.get();
                    }
                });
                if (allOk)
                    ctx.resume();
            })));
            this.postHtml(div("picker-form", ch), "");
        }

        public displayResult(name: string, val: any) {
            var e = div("picker-form");
            var pc = this.current.pc;

            var box = new WallBox(this, <WallBox> this.getCurrentBoxBase(true), pc);
            box.setContent(e);

            this.getCurrentPage().setCurrentBox(box);
            var dual = (str: string) => {
                this.postHtml(div("picker-name", name + ":"), pc)
                this.postHtml(div("picker-input", str), pc)
            }

            try {
                switch (typeof val) {
                    case "string": dual(val); break;
                    case "number": dual(val + ""); break;
                    case "boolean": dual(val ? "True" : "False"); break;
                    case "undefined": dual("[invalid]"); break;
                    default:
                        if (val === null)
                            dual("[null]"); // shouldn't really happen
                        else {
                            if (val.postResult)
                                val.postResult(this.current);
                            else {
                                this.postText(name + ":", pc);
                                val.post_to_wall(this.current);
                            }
                        }
                        break;
                }
            } finally {
                this.getCurrentPage().setCurrentBox(box.parent)
            }

            box.forEachChild((c) => {
                e.appendChild(c.getContent())
            });

            this.renderBox(box);
        }

        ////////////////////////////////////////////////////////////////////////
        // Execution loop
        ////////////////////////////////////////////////////////////////////////

        public setState(s: RtState, msg: string) {
            // Util.log("state: {0} -> {1}, {2}", this.state, s, msg)
            if (this.state == RtState.Stopped || s == RtState.Stopped)
                Util.log("runtime state: {0} -> {1}, {2}", this.state, s, msg)
            this.state = s;
            this.stateMsg = msg;
        }

        private getResumeCtxCore(isBlocking: boolean, cont: IContinuationFunction) {
            //this.forceNonRender();
            //this.forcePageRefresh();

            Util.assert(this.state == RtState.Running)

            if (isBlocking)
                this.setState(RtState.Paused, "getBlockingResumeCtx");
            else
                this.setState(RtState.AtAwait, "getAwaitResumeCtx");

            this.current.continueAt = cont
            var r = new ResumeCtx(this.current);
            r.isBlocking = isBlocking;
            r.versionNumber = this.versionNumber;

            return r
        }

        public getBlockingResumeCtx(cont: IContinuationFunction) { return this.getResumeCtxCore(true, cont) }
        public getAwaitResumeCtx(cont: IContinuationFunction) {
            if (this.rendermode)
                Util.userError("non-atomic APIs cannot be called in page display code");
            return this.getResumeCtxCore(false, cont)
        }

        public getAsyncResumeCtx() {
            Util.assert(this.state == RtState.Running)
            if (this.rendermode)
                Util.userError("'async' cannot be used in page display code");
            var t = new (<any>RT.Task)(); // TS9
            var r = new RT.TaskResumeCtx(t, this.current);
            r.versionNumber = this.versionNumber;
            return r
        }

        public mkActionTask() {
            var t = new (<any>RT.Task)(); // TS9
            return t;
        }

        public _resumeVal(v: any, r: ResumeCtx) {
            var frame = r.stackframe

            // a stale continuation coming to hunt us?
            if (r.versionNumber != this.versionNumber) return;

            //Util.dbglog("resuming, " + this.state + " v: " + v)
            if (this.state == RtState.Paused) {
                if (r.isBlocking) {
                    this._resumeValCore(v, frame)
                    this.mainLoop(frame.continueAt, "_resumeValBlocking");
                } else {
                    // we're waiting for a blocking await, but another thing has finished; put it in the queue
                    this.queueAsyncEvent(() => this.continueStackFrame(v, frame))
                }
            } else if (this.state == RtState.AtAwait) {
                Util.assert(!r.isBlocking, "blocking await")
                this._resumeValCore(v, frame)
                this.mainLoop(frame.continueAt, "_resumeValAwait");
            } else {
                Util.oops("wrong resume state: " + this.state)
            }
        }

        public continueStackFrame(v: any, frame: IStackFrame): IContinuationFunction {
            this._resumeValCore(v, frame)
            return frame.continueAt
        }

        private _resumeValCore(v: any, frame: IStackFrame) {
            this.current = frame;
            if (frame.rendermode !== undefined)
                this.rendermode = frame.rendermode;
            frame.pauseValue = v;
        }

        public initFrom(cs: CompiledScript) {
            this.compiled = cs;
            if (cs.authorId) this.currentAuthorId = cs.authorId;
            if (cs.scriptId) { this.currentScriptId = this.baseScriptId = cs.scriptId; }
            cs.initPages();
            EventQueue.init(this);
            this.sessions.scriptStarted(cs.authorId);
        }

        private nextAsyncTask(): IContinuationFunction {
            if (this.asyncStack.length > 0) {
                // asyncTask should always be set here
                if (this.current.asyncTask)
                    this.current.isDetached = true
                var f = this.asyncStack.pop()
                this.current = f;
                this.setState(RtState.Running, "async stack");
                return f.continueAt;
            } else if (this.asyncTasks.length > 0) {
                var q = this.asyncTasks.shift()
                this.setState(RtState.Running, "async task");
                return q();
            } else {
                return null
            }
        }

        public runInlineJavascript(f:()=>void)
        {
            f()
        }

        public wrap(s: IStackFrame, f: any): any {
            if (this.isStopped())
                return () => { };

            if (!s) s = this.current
            var rt = s.rt
            Util.assert(rt == this)

            return function () {
                try {
                    if (rt.isStopped())
                        return undefined

                    Runtime.theRuntime = rt
                    rt.current = s
                    f.apply(this, arguments)

                } catch (e) {
                    e.tdStackFrame = s
                    throw e
                }
            }
        }

        public pumpEventsCore(): IContinuationFunction {
            this.yield_now();

            Util.assert(!this.isStopped(), "pump-stopped")

            var r = this.nextAsyncTask()
            if (r) return r

            if (this.eventQ == null) {
                this.stopAsync().done()
                return null;
            } else if (this.eventExecuting) {
                this.setState(RtState.AtAwait, "event executing");
                return null
            } else {
                var fn = this.eventQ.maybeRunPageRefresh();
                if (!fn)
                    fn = this.eventQ.process();
                if (!fn && this.host.dontWaitForEvents())
                    this.stopAsync(true).done();
                else if (fn)
                    this.setState(RtState.Running, "got event");
                else {
                    if (this.liveMode())
                        this.stopAsync(true).done()
                    else if (this.headlessPluginMode)
                        this.stopAsync().done()
                    else
                        this.setState(RtState.AtAwait, "no event");
                }
                return fn;
            }
        }

        static pumpEvents(s: IStackFrame) {
            s.rt.eventExecuting = false
            return s.rt.pumpEventsCore();
        }

        public pauseExecution() {
            this.queueEvent("pause", null, [])
        }

        public resumeExecution(once: boolean = false) {
            this.eventQ.clearPause()
            if (this.state != RtState.Stopped || !this.resumeAllowed) return;

            this.refreshPageStackForNewScript();
            this.eventQ.clear();
            if (!this.liveMode())
                this.getWall().setChildrenIfNeeded(this.pageStack.map((p) => p.getElement()))

            try {
                this.eventQ.blockEvents = false;
                this.logDataWrite();
                this.eventQ.blockEvents = once;

                var bot = new StackBottom(this);
                bot.entryAddr = Runtime.pumpEvents;
                bot.returnAddr = Runtime.pumpEvents;
                var frame = this.enter(bot);
                this.mainLoop(frame, "resume execution");
            } catch (e) {
                this.handleException(e, this.current)
            }
        }

        static mkStackFrame(prev: IStackFrame, ret: any) {
            return <IStackFrame> <any>{
                previous: prev,
                prevPC: prev.pc,
                d: prev.d,
                rt: prev.rt,
                libs: prev.libs,
                returnAddr: ret,
            };
        }

        static syntheticFrame(f: (s: IStackFrame) => void) {
            return (prev: IStackFrame, ret: any) => {
                var s = Runtime.mkStackFrame(prev, ret);
                s.name = "__synthetic";
                s.entryAddr = (s) => {
                    s.rt.forcePageRefresh();
                    f(s);
                    return s.rt.leave();
                };
                return s;
            }
        }

        public getActionFrame(mk: any, args: any[], isBlocking = true): IContinuationFunction {
            var bot = new StackBottom(this);
            if (args == null) {
                bot.needsPicker = true;
                args = [];
            }
            var fnObj: any;
            if (isBlocking)
                this.eventExecuting = true;
            if (args.length == 0)
                fnObj = mk(bot, Runtime.pumpEvents);
            else
                fnObj = mk.apply(null, (<any[]>[bot, Runtime.pumpEvents]).concat(args));

            // Special event processing work-around
            this.resetNextEvent();

            return this.enter(fnObj);
        }

        public queueEventCallback(cb: (rt: Runtime, args: any[]) => void) {
            var ev = new RT.Event_();
            ev.addHandler(new RT.PseudoAction((rt: Runtime, args: any[]) => {
                cb(rt, args)
            }));
            this.queueLocalEvent(ev)
        }

        public getEventFrame(mk: any, args: any[], isBlocking: boolean = true): IContinuationFunction {
            try {
                if (this.state != RtState.Running) {
                    Util.assert(this.state == RtState.AtAwait)
                    this.setState(RtState.Running, "getEventFrame dispatch");
                }
                return this.getActionFrame(mk, args, isBlocking);
            } catch (e) {
                return () => { throw e; return null };
            }
        }

        static handleUserError(err: any) {
            var rt = Runtime.theRuntime
            if (rt && rt.state != RtState.Stopped && !rt.handlingException) {
                if (err.isUserError || err.wabStatus) {
                    rt.handleException(err, rt.current);
                    return true;
                }
            }
            return false;
        }

        static stopPendingScriptsAsync() {
            if (Runtime.theRuntime && Runtime.theRuntime.state != RtState.Stopped) {
                return Runtime.theRuntime.stopAsync();
            } else {
                return Promise.as();
            }
        }

        private startMk: any;
        private startArgs: any[];

        public rerunAsync() : Promise {
            return this.stopAsync().then(() => {
                Util.assert(this.isStopped(), "rerun-isStopped")
                this.initPageStack();
                this.run(this.startMk, this.startArgs);
            });
        }

        public run(mk: any, args: any[]) {
            Util.assert(this.isStopped(), "run-isStopped")

            this.startMk = mk;
            this.startArgs = args;

            this.tutorialState = null
            Runtime.stopPendingScriptsAsync().done(() => {
                Runtime.theRuntime = this;

                if (this.eventQ)
                    this.eventQ.blockEvents = false;

                this.resetRunMap();
                this.killTempState();
                ProgressOverlay.setMessage("loading...");
                RT.ArtCache.resetProgress();
                this.initDataAsync().done(() => {
                    try {
                        if (this.headlessPluginMode) {
                            ProgressOverlay.setMessage("running...")
                            ProgressOverlay.unblockKeyboard()
                            ProgressOverlay.showLog()
                        }
                        else
                            ProgressOverlay.hide();
                        Util.assert(this.isStopped())
                        // missing must be setup after the loading dialog is gone
                        this.host.initApiKeysAsync()
                            .then(() => this.host.agreeTermsOfUseAsync())
                            .done(() => {
                                try {
                                    var entryPt = this.getActionFrame(mk, args);
                                    if (this.validatorAction) {
                                        var act = this.current.libs["tutorialLib"][this.validatorAction]
                                        if (!act) {
                                            Util.userError(lf("problem with tutorial: validator function '{0}' not found", this.validatorAction))
                                        }
                                        var libcall = act(this.current)
                                        this.tutorialObject = libcall.libs.topScriptId
                                        if (/norun/i.test(this.validatorActionFlags))
                                            entryPt = Runtime.pumpEvents
                                        entryPt = this.enter(libcall.invoke(libcall, entryPt, this.editorObj))
                                    }
                                    this.mainLoop(entryPt, "Runtime.run");
                                } catch (e) {
                                    this.handleException(e, this.current)
                                }
                            });
                        } catch (e) {
                            this.handleException(e, this.current)
                        }
                }, (e) => {
                    this.handleException(e, null);
                });
            });

        }

        public resyncData()
        {
            this.datas = {};
        }

        public initDataAsync() : Promise
        {
            this.compiled.startFn(this);

            var loadSession = this.sessions.ensureSessionLoaded().thenalways(() => { this.sessions.yieldSession(); });

            this.compiled.initGlobals(this.datas, this);

            // let NodeJS skip initArtAsync
            //if (Browser.isNodeJS) return loadSession;
            //else
                return Promise.join([this.compiled.initArtAsync(this.datas), loadSession]);
        }

        public addDisposableHandler(handler: () => void) {
            var binding = new RT.DisposableHandler(handler);
            this.disposables.push(binding);
            return binding;
        }

        public killDisposables() {
            // dispose more data
            this.disposables.forEach(d => {
                try { d.dispose(); }
                catch (e) { Util.reportError('', e, false); }
            });
            this.disposables = [];
        }

        public killTempState() {
            this.renderedComments = ""
            this._libinitDone = false;
            this.sessions.unlink();   // sessions can have backlinks
            this.compiled.resetData(this.datas); // all globals need to be cleared
        }

        // called from editor on data definition changes
        public resetData() {
            if (this.state == RtState.Stopped && this.resumeAllowed) {
                this.resumeAllowed = false;
                this.killTempState();
                this.initPageStack(); // pages can reference temporary data
                this.host.notifyRunState();
            }
        }

        public quietlyHandleError(e:any, s?:IStackFrame)
        {
            try {
                this.augmentException(e);
            } catch (ee) {}

            var foundSome = false

            var isSecondary = !!s
            if (!s) s = e.tdStackFrame

            for (; s; s = s.previous) {
                if (s.isDetached) {
                    s.asyncTask.setException(e)
                    break
                }
                if (s.errorHandler) (() => {
                    foundSome = true
                    var s0 = s
                    var h = s.errorHandler
                    s.errorHandler = null
                    Util.setTimeout(0, () => {
                        try {
                            var prev = e.tdIsSecondary
                            e.tdIsSecondary = isSecondary
                            h(e, s0)
                            e.tdIsSecondary = prev
                        } catch (exn) {
                            this.host.exceptionHandler(exn);
                        }
                    })
                })()
            }

            return foundSome
        }

        public augmentException(e:any)
        {
            if (typeof e !== "object") return

            var s = this.current
            if (e.tdStackFrame) s = e.tdStackFrame

            var st = e.stack

            if (s && st !== undefined && !e.tdStack) {
                e.tdStack = this.getStackTrace(s, true)
                if (!e.tdMeta) e.tdMeta = {}
                if (s)
                    new RT.AppLogger("dummy").setMetaFromContext(e.tdMeta, s)
                var compr = StackUtil.compress(e.tdStack)
                if (compr) {
                    compr = "StK" + compr
                    e.tdMeta.compressedStack = compr
                }

                if (compr) {
                    e.tdMeta.originalStack = st
                    //st = st.replace(/^\s*at a_\S+\$\d.*\n/gm, "")
                    st = st.replace(/^\s*at a_\S+\$\d[^]*/m, "")
                    //st = st.replace(/\s+at .*mainLoop .*\n[^]*/gm, "")
                    st = st.replace(/((compiled|noderuntime).js):\d+:\d+/g, (t, f) => f + ":1:1")
                    st = st.replace(/^\s*at /m, t => t + compr + " (td.js:42:42)\n" + t)
                    try {
                        e.stack = st
                    } catch (fail) { }
                }

            }
        }

        public handleException(e:any, s:IStackFrame)
        {
            if (!e.tdStackFrame)
                e.tdStackFrame = s
            var handled = this.quietlyHandleError(e)

            this.handlingException = true;

            if (!handled) {
                this.compiled.extractAllRunMaps(this);
                this.host.exceptionHandler(e);
            }

            this.stopAsync().done()
        }

        public getStackTrace(init?:IStackFrame, strip = false)
        {
            var locs:IStackFrame[] = []

            for (var s = init || this.current; s; s = s.previous) {
                var ns
                if (strip)
                    ns = <any> {
                        pc: s.pc, 
                        prevPC: s.prevPC,
                        name: s.name, 
                        d: { libName: (s.d ? s.d.libName : undefined) } 
                    }
                else
                    ns = Util.flatClone(s)
                locs.push(ns)
            }
            locs.forEach((l, i) => {
                if (l.prevPC && locs[i + 1])
                    locs[i + 1].pc = l.prevPC
            })
            return locs;
        }

        public getRunMap() {
            this.runMap.clear();
            if (this.compiled.extractAllRunMaps(this))
                return this.runMap;
            else
                return undefined;
        }

        public saveComment(cmt:string)
        {
            this.renderedComments += cmt
        }

        private lastBreak = 0;
        private quickLoopDepth = 0;

        public wrapFromHandler(f:()=>void)
        {
            var prevState = this.state
            var prevCurr = this.current

            this.current = new StackBottom(this);
            this.setState(RtState.Running, "runUserAction from handler")

            try {
                f()
                this.setState(prevState, "runUserAction from handler restore")
                this.current = prevCurr
            } catch (e) {
                this.handleException(e, this.current)
            }
        }

        public runUserAction(f:RT.ActionBase, args:any[])
        {
            args.unshift((s:IStackFrame) => {
                this.state = RtState.Paused
                return null
            })
            args.unshift(this.current)
            var fn = this.enter((<any>f).apply(null, args))
            return this.quickLoop(fn)
        }

        public runValidUserAction(f:RT.ActionBase, args:any[])
        {
            var r = this.runUserAction(f, args)
            if (r === undefined)
                Util.userError("user function passed to library returned invalid")
            return r
        }

        private quickLoop(fn:IContinuationFunction) : any
        {
            if (this.quickLoopDepth > 20) {
                Util.userError("stack overflow (more than 20 runtime/user code switches)")
            }

            Util.assert(this.state == RtState.Running);

            this.quickLoopDepth++;
            var prevFrom = this.returnedFrom
            this.returnedFrom = null

            try {
                while (true) {
                    var newFn = fn(this.current);
                    if (this.state != RtState.Running) {
                        if (this.state == RtState.Paused) {
                            this.state = RtState.Running
                            break
                        }
                        if (this.state == RtState.BreakpointHit)
                            Util.userError("breakpoints in library callbacks are not supported")
                        Util.oops("wrong state in quick Loop " + this.state);
                    }
                    if (!newFn) Util.oops("no newFn: " + fn);
                    fn = newFn;
                }
            } finally {
                this.quickLoopDepth--;
            }

            var res = this.returnedFrom ? this.returnedFrom.result : undefined
            this.returnedFrom = prevFrom
            return res
        }

        public mainLoop(fn:IContinuationFunction, comment:string) : void
        {
            if (!Runtime.continueAfter)
                Runtime.continueAfter = Util.setTimeout;

            this.handlingException = false;

            // this happens when resumeVal() is called from the API method, not from an event handler later
            if (this.mainLoopRunning) {
                //Util.dbglog("saving resume point override")
                this.setState(RtState.Running, "resume point override");
                this.resumePointOverride = fn;
                return;
            }

            var prevState = this.state
            this.setState(RtState.Running, comment);

            if (prevState == RtState.Stopped)
                this.host.notifyRunState();

            // check that cloud state is valid before proceeding, abort execution if necessary
            if (!this.sessions.readyForExecution()) {
                this.stopAsync().done();
                return;
            }

            var continueLater = false;
            var continueLaterVersion = 0;
            var numCheck = 0;

            this.mainLoopRunning = true;

            try {
                while (true) {
                    var newFn = fn(this.current);

                    if (this.state != RtState.Running) {

                        if (this.state == RtState.BreakpointHit) {
                            this.debuggerCC = newFn;
                            break;
                        }

                        if (this.state == RtState.Stopped) {
                            break;
                        }

                        if (this.debuggerCC) {
                            this.debuggerCC = null;
                            this.host.notifyBreakpointContinue();
                        }

                        if (this.state == RtState.AtAwait) {
                            newFn = this.pumpEventsCore();
                            if (!newFn) break;
                            Util.check(!this.resumePointOverride);
                            this.resumePointOverride = null;
                        }

                        if (this.state != RtState.Running) {
                            break;
                        }
                    }

                    if (!newFn) Util.oops("no newFn: " + fn);
                    if (!!this.resumePointOverride) {
                        fn = this.resumePointOverride;
                        this.resumePointOverride = null;
                    } else {
                        fn = newFn;
                    }
                    if (numCheck++ > 10) {
                        var now = Date.now();
                        if (now - this.lastBreak > (Browser.isNodeJS ? 1000 : 50)) {
                            continueLater = true;
                            continueLaterVersion = this.versionNumber;
                            break;
                        }
                        numCheck = 0;
                    }
                }
            } catch (e) {
                this.handleException(e, this.current)
            }

            this.mainLoopRunning = false;
            if (continueLater && continueLaterVersion == this.versionNumber && this.state != RtState.Stopped) {
                this.setState(RtState.Paused, "continue later");
                var ver = this.versionNumber;
                var curr = this.current
                Runtime.continueAfter(1, () => {
                    if (ver != this.versionNumber)
                        return;
                    this.lastBreak = Date.now();
                    this.current = curr
                    this.mainLoop(fn, "continue later - run")
                });
            }

            Util.assert(this.state != RtState.Running)
        }

        static continueAfter:(ms:number,f:()=>void)=>void;

        public saveDataAsync() : Promise
        {
            this.sessions.yieldSession();
            return Promise.as();
        }

        public getRestRequest():RT.ServerRequest
        {
            var frame = <any>this.current
            while (frame && !frame.serverRequest)
                frame = frame.previous
            return frame ? frame.serverRequest : undefined
        }

        public getRestArgument(name:string, tp:string, s:IStackFrame):any
        {
            var r = this.getRestRequest().getRestArgument(name, tp, s);
            //console.log("get rest : " + name + " -> " + r)
            return r
        }

        public runLibInits(ids:string[], cb:any)
        {
            if (this._libinitDone) return
            var frame = this.current
            this._libinitDone = true

            var loop = (i) => {
                if (i >= ids.length)
                    return cb(frame)
                var libcall = this.compiled.libs[ids[i]]["_libinit"](frame)
                return this.enter(libcall.invoke(libcall, () => {
                    return loop(i + 1)
                }))
            }

            return loop(0)
        }
    }

    export class EventHandlerDesc
    {
        constructor(public varId:string, public entry:any) {
        }
    }

    export interface IEventEntry {
        category: string;
        dispatch(rt: Runtime, eventsByCategory: any): IContinuationFunction
        isGameLoop(): boolean;
        isPause(): boolean;
        isPageEvent():boolean;
        clear():void;
    }

    export class EventEntry implements IEventEntry {
        public category = "local";
        private done = false;
        constructor(private binding : RT.EventBinding, private args : any[], private isLast:boolean)
        { }
        public isPageEvent() { return this.binding._event.isPageEvent }
        public dispatch(rt: Runtime, eventsByCategory: any): IContinuationFunction
        {
            if (this.done) return null;
            this.done = true;
            var ev = this.binding._event;
            ev.pendinghandlers--;
            this.binding.inQueue = false;
            var f = this.binding._handler;
            if (!f) return null;
            if (f instanceof RT.PseudoAction) {
                (<RT.PseudoAction>f).run(rt, this.args);
                return null;
            }
            var res = rt.getEventFrame(f, this.args, ev.isBlocking);
            if (rt.current) {
                rt.current.currentHandler = this.binding;
                if (ev.finalCallback) {
                    var cb = ev.finalCallback
                    ev.finalCallback = null
                    rt.current.returnAddr = s => {
                        cb(s);
                        return Runtime.pumpEvents(s)
                    }
                }
                if (ev.errorHandler) {
                    rt.current.errorHandler = ev.errorHandler
                }
            }
            return res
        }
        public clear()
        {
            var ev = this.binding._event;
            ev.pendinghandlers = 0;
        }
        public isPause() { return false; }
        public isGameLoop() { return false; }
    }



    export class GlobalEventEntry implements IEventEntry
    {
        private evts:EventHandlerDesc[];
        public isPageEvent() { return false; }

        constructor(public category:string, private varValue:any, private args:any[], private idx = 0) {
            Util.assert(category != "local");
        }

        public dispatch(rt: Runtime, eventsByCategory: any): IContinuationFunction
        {
            if (this.evts === undefined)
                this.evts = eventsByCategory[this.category];
            if (this.evts === undefined)
                return null;

            while (this.idx < this.evts.length) {
                var handler = this.evts[this.idx++];
                var match = this.handlerMatch(handler, rt);
                if (match.matches) {
                    rt.setNextEvent(this.category, handler.varId);
                    return rt.getEventFrame(handler.entry, match.args);
                }
            }
            return null;
        }

        private handlerMatch(desc:EventHandlerDesc, rt:Runtime)
        {
            if (desc.varId == null) return { matches:true, args:this.args };
            if (this.category.search(/ in /) >= 0) {
                var set : ObjSet = rt.datas["this"][desc.varId];
                if (!!set) {
                    var idx = set.index_of_obj(this.varValue);
                    if (idx >= 0) {
                        return {matches:true, args:[this.varValue, idx].concat(this.args)}
                    }
                }
            }
            else {
                if (rt.datas["this"][desc.varId] === this.varValue) {
                    return {matches:true, args:this.args};
                }
            }
            return {matches:false, args:[]};
        }

        public isGameLoop() { return this.category == "gameloop" && !this.evts; }
        public isPause() { return this.category == "pause" && !this.evts; }
        public clear() {}
    }


    export class BoardEventEntry implements IEventEntry
    {
        public category = "board";
        private categoryHandlers:EventHandlerDesc[][];
        private matchedHandlers: { category: string; varid: string; handler: any; args: any[]; }[];

        constructor(private categories:string[], private valueStack:any[], private args:any[], private matchAll:boolean) {
        }

        ///
        /// We need to potentially match a value against many sets/locals, not just the first handler that is satisfied
        /// However, once we picked a value that matches, not other values should be picked and matched!
        ///
        public dispatch(rt:Runtime, eventsByCategory:any)
        {
            if (this.categoryHandlers === undefined)
                this.categoryHandlers = <any>this.categories.map((c) => eventsByCategory[c]);

            var valueIndex = 0;
            while (!this.matchedHandlers && valueIndex < this.valueStack.length) {
                var value = this.valueStack[valueIndex++];

                var categoryIndex = 0;
                while (categoryIndex < this.categories.length) {
                    var category = this.categories[categoryIndex];
                    var handlers = this.categoryHandlers[categoryIndex++];

                    if (!handlers) {
                        continue;
                    }

                    var handlerIndex = 0;
                    while (handlerIndex < handlers.length) {
                        var handler = handlers[handlerIndex++];

                        var match = this.handlerMatch(handler, category, value, rt);
                        if (match.matches) {
                            if (!this.matchedHandlers) {
                                this.matchedHandlers = [];
                            }
                            this.matchedHandlers.push({ category: category, varid: handler.varId, handler: handler.entry, args: match.args });
                        }
                    }
                }
                if (!this.matchAll && !!this.matchedHandlers) {
                    // stop matching lower z-index values
                    break;
                }
            }

            if (!!this.matchedHandlers && this.matchedHandlers.length > 0) {
                var matchedHandler = this.matchedHandlers.shift();
                rt.setNextEvent(matchedHandler.category, matchedHandler.varid);
                return rt.getEventFrame(matchedHandler.handler, matchedHandler.args);
            }
            return null;
        }

        private handlerMatch(desc:EventHandlerDesc, category:string, varValue:any, rt:Runtime)
        {
            if (category.search(/ sprite in /) >= 0) {
                var set : ObjSet = rt.datas["this"][desc.varId];
                if (!!set) {
                    var idx = set.index_of_obj(varValue);
                    if (idx >= 0) {
                        return {matches:true, args:[varValue, idx].concat(this.args)}
                    }
                }
            }
            if (category.search(/touch over /) >= 0) {
                var set : ObjSet = rt.datas["this"][desc.varId];
                if (!!set) {
                    var idx = set.index_of_obj(varValue);
                    if (idx >= 0) {
                        return {matches:true, args:[varValue, idx].concat(this.args)}
                    }
                }
            }
            else if (category.search(/ sprite:/) >= 0) {
                if (rt.datas["this"][desc.varId] == varValue) {
                    return { matches: true, args: [varValue].concat(this.args) }
                }
            }
            else {
                if (rt.datas["this"][desc.varId] === varValue) {
                    return { matches: true, args: this.args };
                }
            }
            return {matches:false, args:[]};
        }

        public isGameLoop() { return false; }
        public isPause() { return false; }
        public isPageEvent() { return false }
        public clear() {}
    }

    export interface ObjSet
    {
        index_of_obj(v: any): number;
    }

    export class EventQueue {
        private queue: IEventEntry[] = [];
        private needPageRefresh = false;
        private needYield = false;
        private needCloudstateRefresh = false;
        public eventsByCategory: any = null;
        public hasGameLoop = false;
        public needsGameLoopTimer = false;
        public blockEvents = false;
        public eps = 0; // gameloop events per second
        public minimumEps = 0;
        public maximumEps = 0;
        public averageEps = 0;
        public epsHistory: number[] = [];
        public profiling = false;
        public numPageEvents = 0;

        constructor(public rt: Runtime) {
        }

        public add(category: string, varValue: any, args: any[], ignore = true) {
            if (this.blockEvents) return;
            Util.assert(!(varValue instanceof RT.Event_));
            if (this.eventsByCategory[category] !== undefined) {
                var ev = new GlobalEventEntry(category, varValue, args);
                this.queue.push(ev);
                this.rt.queueRestart();
            }
        }

        public addLocalEvent(ev: RT.Event_, args: any[], ignore = true, skipIfInQueue = false, filter : (b : RT.EventBinding) => boolean = undefined) {
            if (!this.blockEvents && ev.handlers) {
                var anyPushed = false;

                for (var i = 0; i < ev.handlers.length; ++i) {
                    var binding = ev.handlers[i];
                    if (filter && !filter(binding)) continue;
                    if (!(skipIfInQueue && binding.inQueue)) {
                        var ee = new EventEntry(binding, args, i == ev.handlers.length - 1);
                        if (ee.isPageEvent()) this.numPageEvents++;
                        ev.pendinghandlers++;
                        binding.inQueue = true;
                        this.queue.push(ee);
                        anyPushed = true;
                    }
                }

                if (anyPushed)
                    this.rt.queueRestart()
            }

            ev.runAwaiters(args)
        }

        public addBoardEvent(categories: string[], valueStack: any[], args: any[], ignore = true, matchAll = false) {
            if (this.blockEvents) return;

            this.queue.push(new BoardEventEntry(categories, valueStack, args, matchAll));
            this.rt.queueRestart()
        }

        public clear() {
            this.queue.forEach(e => e.clear())
            this.queue = []
        }

        public clearPause() {
            this.queue = this.queue.filter(q => !q.isPause());
        }

        public calculateEpsInfo() {
            if (this.epsHistory.length > 2) {
                // first and last measurements are inaccurate
                var myEpsHistory = this.epsHistory.slice(1);
                myEpsHistory.pop();
                var minimum = Number.MAX_VALUE;
                var maximum = 0;
                var cumulative = 0;
                for (var i = 0; i < myEpsHistory.length; ++i) {
                    if (myEpsHistory[i] > maximum)
                        maximum = myEpsHistory[i];
                    if (myEpsHistory[i] < minimum)
                        minimum = myEpsHistory[i];
                    cumulative += myEpsHistory[i];
                }
                if (TDev.dbg) {
                    Util.log("Gameloop Events per Second statistics: minimum " + minimum + ", maximum "
                        + maximum + ", average " + (cumulative / myEpsHistory.length).toFixed(2)
                        + ". Ran for " + myEpsHistory.length + "s.");
                }
                this.minimumEps = minimum;
                this.maximumEps = maximum;
                this.averageEps = cumulative / myEpsHistory.length;
                this.epsHistory = [];
            }
        }

        private setupGameLoopTimer() {
            var stopLogEPS = false;

            // Log gameloop events per second
            var logEPS = (): void => {
                var eps = this.eps;
                this.eps = 0;
                if (!stopLogEPS)
                    Util.setTimeout(1000, logEPS);
                if (eps > 0)
                    this.epsHistory.push(eps);
            }

            var gameLoop = () =>
            {
                if (this.rt.isStopped()) {
                    this.needsGameLoopTimer = true;
                    stopLogEPS = true;
                    return;
                }

                var hasIt = false;
                for (var i = 0; i < this.queue.length; ++i)
                    if (this.queue[i].isGameLoop()) { hasIt = true; break; }
                if (!hasIt)
                    this.add("gameloop", null, []);

                Util.setTimeout(20, gameLoop);
            }

            this.needsGameLoopTimer = false;
            gameLoop();
            if (this.profiling)
                logEPS();
        }

        // queue a page refresh
        public queuePageUpdate() {
            this.needPageRefresh = true;
            this.rt.queueRestart();
        }

        public viewIsCurrent():boolean {
            return !this.needPageRefresh;
        }

        public registerTimeDependency() {
            this.pageIsTimeDependent = true;
        }

        private pageIsTimeDependent = false;
        private refreshtimerpending = false;

        public finishPageUpdate() {
            this.needPageRefresh = false;
            if (this.pageIsTimeDependent) {
                this.pageIsTimeDependent = false;
                if (!this.refreshtimerpending) {
                    this.refreshtimerpending = true;
                    Util.setTimeout(100, () => {
                        if (this.refreshtimerpending) {
                            this.refreshtimerpending = false;
                            this.queuePageUpdate();
                        }
                    });
                }
            }
            else
                this.refreshtimerpending = false;
        }

        // queue yield
        public queueYield() {
            this.needYield = true;
            this.rt.queueRestart();
        }

        public finishYield(changes: boolean, fireevent: boolean) {
            this.needYield = false;
            if (changes)
            {
                if (fireevent)
                    this.add("cloud data updated", null, []);
                this.queuePageUpdate();
            }
        }

        // queue events if nothing else is in the queue
        public maybeRunPageRefresh():IContinuationFunction {
            if (this.rt.isHeadless())
                return null

            if (!this.needPageRefresh && !this.needYield)
                return null

            if (this.numPageEvents > 0)
                return null

            // for both page refresh and yield, we use the same event
            var p = this.rt.getCurrentPage();
            if (p.isAuto() && !p.crashed) {
                return () => {
                    var page = this.rt.getCurrentPage();
                    return this.rt.getEventFrame((p, b) => page.getFrame(p, b), [])
                };
            }
            else {
                this.needPageRefresh = false;
                this.needYield = false;
                return null
            }
        }

        public process() : any
        {
            if (this.needsGameLoopTimer)
                this.setupGameLoopTimer();

            while (this.queue.length > 0) {
                var e = this.queue[0];
                if (this.profiling && this.hasGameLoop && e.isGameLoop()) {
                    ++this.eps;
                }
                var fn = e.dispatch(this.rt, this.eventsByCategory);
                if (fn != null) return fn;
                this.queue.shift();
                if (e.isPageEvent()) this.numPageEvents--;
                Util.assert(this.numPageEvents >= 0);
             }

            return null;
        }

        static init(rt: Runtime) {
            var s = rt.compiled;
            var q = new EventQueue(rt);
            rt.eventQ = q;
            if (!s.eventsByCategory || !s.eventsByCategory["local"]) {
                // will never get called; handled specially
                s.registerEventHandler("local", null, null);
            }

            q.hasGameLoop = (s.eventsByCategory && s.eventsByCategory["gameloop"] !== undefined);
            q.eps = 0;
            q.needsGameLoopTimer = q.hasGameLoop;
            q.eventsByCategory = s.eventsByCategory;
        }
    }

    export interface PackageResource {
        kind: string;
        type: string;
        id: string;
        packageUrl: string;
        url?: string;
        content?: string;
        sourceName?: string;
        usageLevel?: number;
    }

    export interface CompiledImports {
        npmModules: StringMap<string>;
        cordovaPlugins: StringMap<string>;
        pipPackages: StringMap<string>;
    }

    export interface ApiKey {
        url: string;
        value: string;
    }

    export interface BreakpointBinding {
        setter: (v: boolean) => void;
        getter: () => boolean;
    }

    export interface BreakpointBindings {
        [pc: string] : BreakpointBinding;
    }

    export class BreakpointCollection {
        constructor(private cs: CompiledScript) { }
        public init(bps: Hashtable) {
            bps.forEach((k, v) => this.cs.breakpointBindings[k].setter(true));
        }

        public set(bp: string, val: boolean) {
            this.cs.breakpointBindings[bp].setter(val);
        }

        public get(bp: string) {
            return this.cs.breakpointBindings[bp].getter();
        }
    }

    export class CompilerOptStatistics {
        constructor(public inlinedFunctions = 0, public inlinedCalls = 0, public eliminatedOks = 0,
            public termsReused = 0, public constantsPropagated = 0,
            public reachingDefsTime = 0, public inlineAnalysisTime = 0, public dominatorsTime = 0,
            public usedAnalysisTime = 0, public availableExpressionsTime = 0,
            public constantPropagationTime = 0,
            public compileTime = 0, public numActions = 0, public numStatements = 0) {
        }
    }

    export class CompiledScript
    {
        private steps = [];
        public actionsByName:any = {};
        public actionsByStableName:any = {};
        public pagesByName:any = {};
        public code:string;
        public objectSingletons:any;
        public additionalCode:string;
        public eventsByCategory:any = null;
        public reflectionInfo:StringMap<any> = {};
        private artInitializers = [];
        private artPromises: Promise[] = [];
        public missingApis: string[] = [];
        private apiKeys: any = {};
        public globals:string[] = [];
        public libScripts:any;
        public libs:any;
        public libBindings:any;
        public mainActionName:string;
        public packageResources: PackageResource[] = [];
        public imports: CompiledImports = {
            npmModules: {}, cordovaPlugins: {}, pipPackages: {}
        };
        public authorId: string;
        public scriptId: string;
        public baseScriptId: string;
        public hasCloudData: boolean;
        public hasLocalData: boolean;
        public hasPartialData: boolean;
        public hostCloudData: boolean;
        public autoRouting: boolean;
        public azureSite: string;
        public scriptGuid: string;

        public allApiKeys(): ApiKey[] {
            var r = {};
            Object.keys(this.libScripts).forEach(cs => {
                var keys = this.libScripts[cs].apiKeys;
                Object.keys(keys).forEach(key => r[key] = keys[key]);
            });
            return Object.keys(r).map(k => {
                return { url: k, value: r[k] };
            });
        }

        public scriptTitle: string = "";
        public scriptColor: string = "";
        public primaryName:string;
        public showAd = false;

        public startFn:(rt:Runtime)=>void = (rt) => {};
        public stopFn: (rt: Runtime) => void = (rt) => { };
        public setupRestRoutes: (rt:Runtime)=>void = (rt) => {};
        public extractRunMap: (rt: Runtime) => void = undefined;

        public _resetGlobals:(data:any)=>any = (dt) => {};
        public _initGlobals:(data:any,rt:Runtime)=>any = (dt,rt) => {};
        public _initGlobals2: (data: any) => any = (dt) => { };
        public _importJson: (data: any, ctx:JsonImportCtx, json:any) => any = (dt,ctx,json) => { };
        public _exportJson: (data: any, ctx: JsonExportCtx) => any = (dt, ctx) => { };
        public _getProfilingResults: () => any = () => null;
        public _showCoverage = false;
        public _compilerVersion: string;

        public breakpointBindings: BreakpointBindings = {};
        public breakpoints: BreakpointCollection;
        public initBreakpoints: Hashtable = null;
        public localNamesBindings: { [action: string]: { [name: string]: string; }; } = {};

        public optStatistics = new CompilerOptStatistics();

        constructor()
        {
            this.libScripts = { "this": this };
            this.breakpoints = new BreakpointCollection(this);
        }

        public forEachLib(f:(cs:CompiledScript) => void)
        {
            Object.keys(this.libScripts).forEach((k) => {
                f(this.libScripts[k])
            });
        }

        public extractAllRunMaps(rt: Runtime) {
            var defined = true;
            Object.keys(this.libScripts).forEach((k) => {
                var extractRunMap = this.libScripts[k].extractRunMap;
                if (extractRunMap)
                    extractRunMap(rt);
                else
                    defined = false;
            });
            return defined;
        }

        public registerAction(name:string, stName:string, entry:any, isAsync:boolean)
        {
            this.actionsByName[name] = entry;
            this.actionsByStableName[stName] = entry;
            if (isAsync && !this.eventsByCategory)
                this.registerEventHandler("async", null, null);
        }

        public initPages()
        {
            var hasPages = Object.keys(this.libScripts).some((k) => Object.keys(this.libScripts[k].pagesByName).length > 0);

            if (!hasPages) return;

            this.registerEventHandler("page", null,
                (prev:IStackFrame, ret:(s:IStackFrame)=>any, libName:string, pageName:string, ...args:any[]) => {
                    var p = prev.rt.pushPage(true);
                    p.libName = libName;
                    p.pageName = pageName;
                    p.drawArgs = args;
                    return p.getFrame(prev, ret);
                });
        }

        public getCompiledCode():string { return null } // overridden from the Compiler

        public initFromPrecompiled(script:any = null)
        {
            if (!script)
                script = (<any>TDev).precompiledScript;
            Object.keys(script).forEach((name:string) => {
                if (name == "this") return;

                var f = script[name]
                var cs = this;

                if (typeof f == "string") {
                    cs = this.libScripts[f]
                } else {
                    cs = new CompiledScript();
                    f(cs);
                }
                this.registerLibRef(name, cs);
            });

            script["this"](this);
        }

        public registerPage(name:string, stName:string, entry:any)
        {
            this.actionsByName[name] = entry;
            this.actionsByStableName[stName] = entry;
            this.pagesByName[name] = entry;
        }

        public registerLambda(name:string, stName:string, entry:any)
        {
            this.actionsByName[name] = entry;
            this.actionsByStableName[stName] = entry;
        }

        private forEachData(datas:any, f:(d:any, cs:CompiledScript, libRef:string)=>any)
        {
            var res = [];
            Object.keys(this.libScripts).forEach((lr) => {
                if (!datas[lr]) datas[lr] = {};
                datas[lr]["libName"] = lr;
                res.push(f(datas[lr], this.libScripts[lr], lr));
            });
            return res;
        }

        public resetData(datas:any)
        {
            this.forEachData(datas, (d, cs) => { cs._resetGlobals(d); });
        }

        public initGlobals(datas:any, rt:Runtime)
        {
            this.forEachData(datas, (d, cs) => { cs._initGlobals(d, rt); cs._initGlobals2(d); });
            //datas.all = {};
           // this.forEachData(datas, (d, cs) => {
            //    cs._initGlobals(datas.all);
            //    cs._initGlobals2(datas.all);
           // });
        }

        public registerArtResource(clsName:string, id:string, url:string)
        {
            this.artInitializers.push((data:any) => {
                if (!!data[id]) {
                    // detect API keys
                    if (clsName === "String_") {
                        var key = TDev.RT.String_.valueFromKeyUrl(url);
                        if (key) this.apiKeys[key] = <string>data[id];
                    }
                    return;
                }
                var f = (<any>TDev).RT[clsName].fromArtUrl;
                if (!!f)
                    this.artPromises.push(
                        f(url).then((v: any) => {
                            // detect API Keys
                            if (clsName === "String_") {
                                var key = TDev.RT.String_.valueFromKeyUrl(url);
                                if (key) {
                                    // user might not have a key already,
                                    // or might not have an internet connection to load it
                                    this.apiKeys[key] = v;
                                }
                            }
                            // load missing data
                            if (v === undefined) {
                                switch (clsName) {
                                    case "Picture":
                                        v = TDev.RT.Picture.fromArtUrl("data:image/jpeg;base64," +
                                                "iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAW7SURBVHhe7ZxbTBxVGMc/7gssdGG5LSIUC6UKTQu1Rg19EDVqmja2SWNTo1HTxMTESLw90PhkUk29PZgYo6kPTXyqDbGJPhgDKW1tLRWsWhrFyp0F2kUuy7VcnG/2bGcG+sAuifufM+eXbPg+CAT2x3fmfDPnnLji423LpIAhXnxUgKCEgKGEgKGEgKGEgKGEgKGEgKGEgKGEgKGEgKGEgKGEgKGEgKGEgKGEgKGEgOFoIdmuxNuv9ESMt8KxQg5X5lL7oa3669LBKirzuMRXYosjhTyQ76aGnXeJjOjopQG6cnNaZLHFcUKK3Mn05WOllBAfp+c/9IzRVx039BgBRwlJ0Bx89kgpeVIS9bx/cp7eONurxyg4SsjLW/NpW26aHi8tL9Ob53poYn5Rz1FwjJCKLBe9tr1AZERf/xmgC/6gyHBwhBAeqj6oLSGXmNoOBOfp2OVBPUbDEUL2bcq+PVQxH7f54YaqMNILSdWq4q0dhSIj6p6Yo8broyLDQ3ohz9+bQwXpSSIj+vTXIVoEXjwrtRCuDp5ZhUGvDkZqIXvvySKvK9RzMMevjkBXByO1kGcrckRENL2wRN9e/1dkuEgrpNKbaplZfd81RuOgMyszcEKe2uihLx4tpVO7y+mZzV7x2cg5UGb93pOdARFhAyXkUIWXPq8rpSdKPHR/vpuO1RZTfbXRXUfC4yUbREQUmF2gi0N4XfmdgBLyYmWeiAwORlEl5R6Xflc3THPfhIjwgRJinhGFcScliGjtPKlVmJmmvnER4QMlpKV/9X9y63DkQ01tYYaIiOYWl6jpDj8XFSghR1sH6MyA8eZ1BGboyE99IlsbyfFxVJ1nzK7aR6ZpRpvy2gXIXbh5qYmUk5pEf43N0sJSZL9ejTbVbdxTITKiE9du0jsXIpMaS6AqJMzIzAJ1jM5ELIOpyjGqg7nonxSRPYAUsh6qc9NFFIKrzE5IJ2RzlrGcZ1LrzDuVkNhSkpEiIqJRrSG0G1IJ4RlWRrLRt3RPzonIPkglxGd6EMX4g7dEZB8kE2LcLmHUkBVjvFr/YsY/PS8i+yDdRd3uSCXEnWT9c3jaazekEpKSYP1z5qPo9GONGrLAUELAkEoIP/sww42i3ZBKSPCWVYi5a7cLasgCQyoh/qC1EfSlWTt3OyCVEF7uY8a8yNouyFUhU9abiRszjVvxdkEqIdwI+qeMYWvl3V87IN1F3Txs8QkNdpv6SiekbcQ4AIBvpdTkWZ+xoyOhEOvCOiUkxvwRmBFRiCqvdVkQOtIJ4VUm5tvuD/rcIrIH0glhWgaMxXG8gJtXw9sFOCE7tDG/YWchfbirWN+8Ew0rV7vX3Z0pInyghPAmzW92l+s7Zw+UhzbvvHRfrvjq2mnun6BF08OpuiJj8w46UEJe3V5A8XHWvuGFKIRwL9I6PCUy0lfDr3y8iwrUb+lLW91Zc3MXDd91GztuuR/ZX5YtMmyghJwdXL1S/fdAdCe9newc1bdCh3luS+SVFgughLz7c7++SSdM1/gcNZyPbm8Hb9I5/Y9RJbwIm/eOoAO3YYePUtqSnaqf+vbLcJBm13H0wracNDq919i80/j3KNW39IgME7grHb//V7UqOa8NX+uRwfDBlk2mHbg8iyvJwH5oZY+pxzr4pN0vIq364uP0mRwy0gv5bUWV7N+UDV0l0gthVlbJ6zU+keHhCCFcJSeuGWfzPq1VyUOgNx0dIYR5v3WQhkzP3N97uJhcPKUDwzFCprS+5Ihpv3rphhQ6XLX6bJVY4xghzI+943RK60XC1Ff79F4FCUcJYd4+10tXboRuxyRpF3g+ejwTaMmp44Tw6RCvNHfRyHToelKkTYE/2lWsxwhAnnXyf1CTm077yrJEFjoTBeGQAccKQcVxQxY6SggYSggYSggYSggYSggYSggYSggYSggYSggYSggYSggYSggYSggYSggYSggURP8B901+vZyEn/4AAAAASUVORK5CYII="
                                            )._value;
                                        break;
                                    case "Sound":
                                        var missingUrl = Cloud.artUrl('pxiraczt');
                                        if (!Browser.audioWav) missingUrl = HTML.patchWavToMp4Url(missingUrl);
                                        v = TDev.RT.Sound.mk(missingUrl);
                                        break;
                                    default:
                                        break;
                                }
                            }
                            data[id] = v
                        }));
            });
        }

        public registerGlobal(id:string)
        {
            this.globals.push(id);
        }

        public initArtAsync(datas:any) : Promise
        {
            this.apiKeys = {};
            return Promise.join(this.forEachData(datas, (d, cs) => cs.initArtCoreAsync(d)));
        }

        public initArtCoreAsync(data:any) : Promise
        {
            this.artPromises = [];
            this.artInitializers.forEach((f) => { f(data) });
            return Promise.join(this.artPromises);
        }

        public registerEventHandler(category:string, varId:string, entry:any)
        {
            if (this.eventsByCategory == null)
                this.eventsByCategory = {};
            var curr = this.eventsByCategory[category];
            if (curr === undefined) {
                curr = [];
                this.eventsByCategory[category] = curr;
            }
            curr.push(new EventHandlerDesc(varId, entry));

            if (!this.eventsByCategory["pause"])
                this.registerEventHandler("pause", null,
                    (prev:IStackFrame, ret:(s:IStackFrame)=>any) => {
                        var frame:IStackFrame = <any>{};
                        frame.previous = prev;
                        frame.rt = prev.rt;
                        frame.returnAddr = ret;
                        frame.entryAddr = (s) => {
                            s.rt.stopAsync(true).done();
                            return null
                        };
                        return frame;
                    });
            if (!this.eventsByCategory["async"])
                // will never get called; handled specially
                this.registerEventHandler("async", null, null);
        }

        public registerStep(step:any, name:string)
        {
            step.idx = this.steps.length;
            step.theName = name;
            this.steps.push(step);
        }

        public registerLibRef(libRefName:string, cs:CompiledScript)
        {
            if (this.libScripts.hasOwnProperty(libRefName))
                Util.oops("redefinition of libref " + libRefName);
            this.libScripts[libRefName] = cs;
        }

        public mkLambdaProxy(libs:any, libRefName:string)
        {
            return (s:IStackFrame) => new LibProxy(libs, s, libRefName, "inline function", null);
        }

        public mkLibProxyFactory(libs:any, libRefName:string, actionName:string) : (s:IStackFrame) => IStackFrame
        {
            var f = this.libScripts[libRefName].actionsByName[actionName];
            Util.assert(f);
            return (s:IStackFrame) => new LibProxy(libs, s, libRefName, actionName, f);
        }

        public lookupLibPage(libRefName:string, actionName:string) : (s:IStackFrame) => LibProxy
        {
            var f = this.libScripts[libRefName].actionsByName[actionName];
            Util.assert(f);
            return (s:IStackFrame) => new LibProxy(this.libBindings[libRefName], s, libRefName, actionName, f);
        }

        public lookupAction(libName:string, actName:string) { return (<CompiledScript>this.libScripts[libName]).actionsByStableName[actName]; }

        static additionalScriptStateFields = ["leaderboard_score", "apikeys_consent", "source_access"];

        public init(code:string, missingApis:string[], packageResources : PackageResource[], safe:boolean)
        {
            this.code = code;
            this.missingApis.pushRange(missingApis);
            this.packageResources.pushRange(packageResources);
            if (safe) {
                var f = eval(code);
                f(this);
            }
        }

        public reinit(code:string)
        {
            this.additionalCode = code;
            var f = eval(code);
            f(this);
        }
    }

    export module RT {
        export function unwrapJson(o: JsonObject): any {
            return o ? o.value() : undefined;
        }
        export function wrapJson(o : any) : JsonObject {
            return JsonObject.wrap(o);
        }

        export function queueAction(s: IStackFrame, a: ActionBase, args: any[],
                            whenDone:(s:IStackFrame)=>void = null,
                            errorHandler: (err:any, s:IStackFrame)=>void = null) {
            if (a) {
                var ev = new Event_();
                ev.isBlocking = false;
                ev.finalCallback = whenDone;
                ev.errorHandler = errorHandler;
                ev.addHandler(a);
                s.rt.queueLocalEvent(ev, args);
            }
        }

        export function protect(s:IStackFrame, f:any):any
        {
            return s.rt.wrap(s, f)
        }

        export function userError(msg:string):any
        {
            Util.userError(msg)
        }

        export function logError(err: any, meta?: any) {
            if (err)
                App.logException(err, meta);
        }

        export function checkAndLog(err:any, meta?: any):boolean
        {
            if (!err) return true
            logError(err, meta);
            return false
        }

        export function checkAndThrow(e:any)
        {
            if (!e) return
            Util.userError(e + "")
        }

        export function checkAndResume(s:IStackFrame)
        {
            return protect(s, function (err) {
                checkAndThrow(err);
                (<any>s).localResume()
            })
        }
    }
}
