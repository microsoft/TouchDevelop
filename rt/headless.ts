///<reference path='refs.ts'/>

module TDev {
    export module StackUtil {
        var idChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"

        export function combineIds(a:string, b:string)
        {
            if (!a || a == "this") a = "";
            if (!b || b == "this") b = "";

            var maxLen = 8
            var buf = new Uint32Array(maxLen)
            var ptr = 0

            var add = (s:string) => {
                for (var i = 0; i < s.length; ++i) {
                    buf[ptr] = buf[ptr] * 13 + s.charCodeAt(i)
                    if (++ptr >= maxLen) ptr = 0
                }
            }

            add(a)
            add(b)

            var r = ""
            for (var i = 0; i < maxLen; ++i) {
                r += idChars[buf[i] % 62]
            }
            return r
        }

        export function compress(trace:IStackFrame[])
        {
            if (!trace) return ""

            trace = trace.filter(f => !!f.pc)
            if (trace.length > 15)
                trace = trace.slice(0, 15)
            var r = ""
            trace.forEach((f, i) => {
                r += combineIds(f.pc, f.d ? f.d.libName : "")
            })
            return r
        }
    }

    export interface CrashStackFrame
    {
        pc: string;
        name: string;
        d: { libName: string };
    }

    export interface RuntimeCrash
    {
        time: number;
        url?: string;
        stack: CrashStackFrame[];
        msg: string;
    }

    export class HeadlessHost
        implements TDev.RuntimeHost
    {
        public currentGuid : string;
        public currentRt : TDev.Runtime;
        public lastError:string;
        public crashes:RuntimeCrash[] = [];

        public getWall():HTMLElement { return null }
        public astOfAsync(id:string) { return TDev.Promise.as(undefined); }
        public pickScriptAsync(mode:string, message:string):TDev.Promise { return TDev.Promise.as(undefined) }
        public saveAstAsync(id:string, ast:any):TDev.Promise { return TDev.Promise.as(undefined); }
        public deploymentSettingsAsync(id:string) { return Promise.as(undefined); }
        public packageScriptAsync(id : string, options: any) { return Promise.as(undefined); } // json object

        public fullWallWidth() { return this.wallWidth; }
        public fullWallHeight() { return this.wallHeight; }
        public userWallHeight() { return this.wallWidth; }

        public wallWidth = 1000;
        public wallHeight = 1000;
        public wallOrientation = 0;
        public wallVisible = false;
        public keyboard = new TDev.RT.RuntimeKeyboard(undefined);
        public onProgramEnd:()=>void;
        public isHeadless() { return true }

        public init(rt:TDev.Runtime)
        {
            this.currentRt = rt;
        }

        public liveMode() { return false; }
        public dontWaitForEvents() { return false; }

        public applyPageAttributes(wp:TDev.WallPage) { }
        public setTransform3d(trans:string, origin:string, perspective:string) { }
        public setFullScreenElement(element: HTMLElement) { }
        public isFullScreen() : boolean { return false; }
        public applyWallStyle() { }

        public publishSizeUpdate() { }
        public notifyPageButtonUpdate() { }

        public additionalButtons():HTMLElement[] { return []; }
        public additionalFullScreenButtons():HTMLElement[] { return []; }

        public updateCloudState(hasCloudState: boolean, type: string, status: string) { }

        public initApiKeysAsync(): TDev.Promise { return TDev.Promise.as(); }
        public agreeTermsOfUseAsync(): TDev.Promise { return TDev.Promise.as(); }
        public notifyTutorial(cmd : string) { }

        public showWall()
        {
            this.wallVisible = true;
        }

        public getFullScreenCanvas(): HTMLCanvasElement {
            return undefined;
        }

        public toScreenshotCanvas() : HTMLCanvasElement { return undefined; }
        public otherwiseBack() {}

        public backBtnHandler()
        {
        }

        public notifyRunState() { }
        public notifyBreakpointHit() { }
        public notifyBreakpointContinue() { }

        public notifyPagePush() : void
        {
        }

        public notifyPagePop(p:TDev.WallPage) : void
        {
        }

        public attachProfilingInfo(profile:any)
        {
        }

        public attachCoverageInfo(coverage: any)
        {
        }

        public notifyStopAsync(): TDev.Promise
        {
            TDev.Ticker.dbg("notifyStop");
            var p = this.currentRt.saveDataAsync();
            TDev.Util.log("program stopped");

            if (this.onProgramEnd)
                this.onProgramEnd();
            return p;
        }

        public hideWallAsync()
        {
            TDev.Ticker.dbg("hideWallAsync");
            if (!this.wallVisible) {
                return TDev.Promise.as()
            }
            this.wallVisible = false;

            return TDev.Promise.as();
        }

        public goBack()
        {
        }

        public notifyHideWall() : void
        {
            TDev.Ticker.dbg("notifyHideWall");
            this.hideWallAsync().done(() => {
                this.goBack()
            });
        }

        public exceptionActions(e:any) : any { return null }

        public respondToCrash(bug:BugReport)
        {
        }

        public fillCrashInfo(crash:RuntimeCrash)
        {
        }

        public exceptionHandler(e:any)
        {
            e.includeSource = true;

            try {
                this.currentRt.augmentException(e);
            } catch (ee) {}

            var bug = TDev.Ticker.mkBugReport(e, "runtime error");

            var msg = bug.exceptionMessage;

            var crash:any = {
                time: Date.now(),
                stack: e.tdStack,
                msg: msg,
                meta: e.tdMeta,
            }

            this.fillCrashInfo(crash)
            this.crashes.push(crash)

            TDev.RT.App.logException(e);

            this.respondToCrash(bug);

            if (!Browser.isNodeJS && !e.isUserError)
                TDev.Util.sendErrorReport(bug);

            this.lastError = TDev.Ticker.bugReportToString(bug);
        }

        constructor()
        {
        }

        public askSourceAccessAsync(source: string, description: string, critical?:boolean): TDev.Promise {
            return TDev.Promise.as(true);
        }

        public initFromPrecompiled(precompiled:any = null)
        {
            var rt = this.currentRt

            var cs = new CompiledScript()
            cs.initFromPrecompiled(precompiled)
            rt.initFrom(cs)
            rt.setHost(this);

            if (cs.setupRestRoutes)
                cs.setupRestRoutes(rt)

            rt.killTempState();
        }
    }
}
