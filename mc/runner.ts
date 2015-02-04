///<reference path='refs.ts'/>

module TDev.RT.Minecraft {
    export var logInfo: (s:string) => void;
    export var logError: (s:string) => void;
    export var handleError: (err:any) => void;

    export class TheMinecraftRuntime
        extends Runtime
    {
        public initPromise:Promise;
        public requestHandler: (req:any, resp:any) => void;

        constructor(public nodeHost:RunnerHost)
        {
            super(new Revisions.Sessions(undefined))
        }

        public initPageStack()
        {
        }

        public getUserId(): string { return undefined; }

        public postBoxedText(s:string) : TDev.WallBox
        {
            TDev.Util.log("WALL: " + s);
            return undefined;
        }
        
        public postBoxedTextWithTap(s:string, rtV: any) : TDev.WallBox
        {
            return this.postBoxedText(s);
        }
        public queueAsyncStd(cb) {
            this.queueEventCallback((rt, args) => {
                this.queueAsyncEvent(() => cb(rt, args));
            });
        }

        public queueAsync(cb) {
            this.queueAsyncStd((rt, args) => {
                cb();
                var bot = new StackBottom(this);
                this.current = bot;
                return Runtime.pumpEvents;
            });
        }

        public handleException(e:any)
        {
            if (this.quietlyHandleError(e))
                return
            
            if (e.programCounter)
                this.errorPC = e.programCounter;

            this.host.exceptionHandler(e);
            this.restartAfterException()
        }
    }

    export class RunnerHost
        extends HeadlessHost
        implements TDev.RuntimeHost
    {
        public log(s: string) {
            App.log(s);
        }

        public fillCrashInfo(crash:RuntimeCrash)
        {}

        constructor() {
            super()
            this.currentRt = new TheMinecraftRuntime(this);
        }
    }

    export function setup(): void {
        Browser.canWebSql = false;
        Browser.canIndexedDB = false;
        Browser.canMemoryTable = true;
        Browser.useConsoleLog = true;
        Browser.canLogin = false;
        Browser.browserShortName = "minecraft";
        Browser.isCompiledApp = true;
        Browser.isHeadless = true;
        Browser.noNetwork = true;

        Ticker.fillEditorInfoBugReport = (b: BugReport) => {
            try {
                b.currentUrl = "runner";
                b.scriptId = "";
                b.userAgent = "minecraft";
                b.resolution = "";
            } catch (e) {
                //debugger;
            }
        };
        Storage.getTableAsync = (name: string) => Promise.as(TDev.Storage.createMemoryTable(name));
        Storage.clearPreAsync = () => Promise.as()

        TDev.Ticker.disable()
        TDev.Util.initGenericExtensions();
        TDev.RT.RTValue.initApis();

        window = <any>{};
        window.removeEventListener = () => {};
        window.setTimeout = setTimeout;
        (<any>window).rootUrl = "https://www.touchdevelop.com";
        var ls = <any>{};
        window.localStorage = ls;
        ls.getItem = (s) => ls[s]
        ls.setItem = (s, v) => ls[s] = v + ""
        ls.removeItem = (s) => delete ls[s]
        window.navigator = navigator;
        navigator.userAgent = "NodeJS " //?

        Promise.errorHandler = (ctx, err) => {
            if (Runtime.theRuntime && !Runtime.theRuntime.isStopped()) {
                Runtime.theRuntime.handleException(err);
            } else {
                handleError(err)
            }
            return new TDev.PromiseInv();
        }
        Cloud.getUserId = () => undefined;
        Cloud.authenticateAsync = (activity:string, redirect = false, dontRedirect = false): Promise => {
            return Promise.as(!!Cloud.getUserId())
        }
        TDev.RT.Web.proxy = (url) => url;
    }

    var host: RunnerHost;
    export function runAsync()
    {
        setup();

        host = new RunnerHost();
        var rt = <TheMinecraftRuntime> host.currentRt;
        Runtime.theRuntime = rt;
        host.initFromPrecompiled();
        host.currentGuid = rt.compiled.scriptGuid;

        var cs = rt.compiled;
        var fn = cs.actionsByName[cs.mainActionName];
        if (cs.pagesByName[cs.mainActionName] !== undefined) {
            fn = Runtime.syntheticFrame((s) => s.rt.postAutoPage("this", cs.mainActionName));
        }
        rt.run(fn, null);
    }
}

function main() {
    TDev.RT.Minecraft.runAsync();
}