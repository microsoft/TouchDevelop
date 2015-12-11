///<reference path='refs.ts'/>
module TDev.RT {
    // meta in messages coming from a logger will be augmented with the following
    export interface StdMeta {
        contextId: string;
        contextDuration: number;
        contextUser: string;
    }

    export interface AppLogTransport {
        log? : (level : number, category : string, msg: string, meta?: any) => void;
        logException?: (err: any, meta?: any) => void;
        logTick?: (category: string, id: string, meta: any) => void;
        logMeasure?: (category: string, id: string, value: number, meta: any) => void;

        id?: string;
        domain?: any;
    }

    //? A custom logger
    //@ stem("logger")
    export class AppLogger extends RTValue {
        public created: number;
        public parent: AppLogger;
        public minLevel = App.DEBUG;

        constructor(public category : string) {
            super();
            this.category = this.category || "";
            this.created = Util.perfNow()
        }

        //? Logs a debug message
        public debug(message: string, s:IStackFrame) {
            this.log("debug", message, undefined, s);
        }

        //? Logs an informational message
        public info(message: string, s:IStackFrame) {
            this.log("info", message, undefined, s);
        }

        //? Logs a warning message
        public warning(message: string, s:IStackFrame) {
            this.log("warning", message, undefined, s);
        }

        //? Logs an error message
        public error(message: string, s:IStackFrame) {
            this.log("error", message, undefined, s);
        }

        private stringToLevel(level:string)
        {
            switch (level.trim().toLowerCase()) {
            case 'debug': return App.DEBUG;
            case 'warning': return App.WARNING;
            case 'error': return App.ERROR;
            default: return App.INFO;
            }
        }

        //? Logs a new message with optional metadata. The level follows the syslog convention.
        //@ [level].deflStrings("info", "debug", "warning", "error") [meta].deflExpr('invalid->json_object')
        public log(level: string, message: string, meta: JsonObject, s:IStackFrame) {
            var ilevel = this.stringToLevel(level);
            if (ilevel > this.minLevel) return
            App.logEvent(ilevel, this.category, message, this.augmentMeta(meta ? meta.value() : undefined, s));
        }

        //? Set minimum logging level for this logger (defaults to "debug").
        //@ [level].deflStrings("info", "debug", "warning", "error")
        //@ betaOnly
        public set_verbosity(level: string, s:IStackFrame) {
            this.minLevel = this.stringToLevel(level)
        }

        //? Get the current logging level for this logger (defaults to "debug").
        //@ betaOnly
        public verbosity(s:IStackFrame) : string {
            if (this.minLevel == App.DEBUG) return "debug";
            if (this.minLevel == App.WARNING) return "warning";
            if (this.minLevel == App.ERROR) return "error";
            return "info";
        }

        static findContext(s: IStackFrame) : any
        {
            while (s && !s.loggerContext) {
                s = s.previous
                if (s && s.isDetached) {
                    s = null
                    break
                }
            }
            if (s) return s.loggerContext
            return null
        }

        public contextInfo(s: IStackFrame) : StdMeta
        {
            var c = AppLogger.findContext(s)
            if (!c) {
                return null
            } else {
                var tm = Util.perfNow() - c.created
                if (c.root.pauseOffset)
                    tm -= c.root.pauseOffset
                var r = { contextId: c.id, contextDuration: Math.round(tm), contextUser: "" }
                for (var p = c; p; p = p.prev)
                    if (!r.contextUser) r.contextUser = p.userid || ""
                return r
            }
        }

        public setMetaFromContext(v: any, s: IStackFrame)
        {
            var i = this.contextInfo(s)
            if (i) {
                v.contextId = i.contextId
                v.contextDuration = i.contextDuration
                v.contextUser = i.contextUser
            }
        }

        private augmentMeta(meta: JsonObject, s: IStackFrame) : any
        {
            var v = meta ? meta.value() : null

            if (!AppLogger.findContext(s)) return v || {}

            if (v) v = Util.jsonClone(v)
            else v = {}

            this.setMetaFromContext(v, s)

            return v
        }

        //? Get the userid attached to the current context, or empty.
        //@ betaOnly
        public set_context_user(userid:string, s: IStackFrame)
        {
            var c = AppLogger.findContext(s)
            if (!c) Util.userError("No current context")
            if (c) c.userid = userid
        }

        //? Get the userid attached to the current context, or empty.
        //@ betaOnly
        public context_user(s: IStackFrame) : string
        {
            var i = this.contextInfo(s)
            if (!i || !i.contextUser) return ""
            return i.contextUser
        }

        //? The unique id of current context, or empty if in global scope.
        //@ betaOnly
        public context_id(s: IStackFrame) : string
        {
            var i = this.contextInfo(s)
            if (!i) return ""
            return i.contextId
        }

        //? Stop counting time in all current contexts
        //@ betaOnly
        public context_pause(s: IStackFrame)
        {
            var c = AppLogger.findContext(s)
            if (c) {
                c.root.pauseStart = Util.perfNow()
            }
        }

        //? Start counting time again in all current contexts
        //@ betaOnly
        public context_resume(s: IStackFrame)
        {
            var c = AppLogger.findContext(s)
            if (c) {
                c = c.root
                if (c.pauseStart) {
                    c.pauseOffset = Util.perfNow() - c.pauseStart
                    c.pauseStart = 0
                }
            }
        }

        //? How long the current logger has been executing for in milliseconds.
        //@ betaOnly
        public logger_duration(s: IStackFrame) : number
        {
            return Util.perfNow() - this.created
        }

        //? How long the current context has been executing for in milliseconds.
        //@ betaOnly
        public context_duration(s: IStackFrame) : number
        {
            var i = this.contextInfo(s)
            if (i)
                return i.contextDuration
            return Util.perfNow() - this.created
        }

        //? Log a custom event tick in any registered performance logger.
        //@ betaOnly
        public tick(id: string, s: IStackFrame)
        {
            if (!id) return;
            App.logTick(this.category, id, this.augmentMeta(null, s));
        }

        //? Log a custom event tick, including specified meta information, in any registered performance logger.
        //@ betaOnly
        public custom_tick(id: string, meta: JsonObject, s: IStackFrame)
        {
            if (!id) return;
            App.logTick(this.category, id, this.augmentMeta(meta, s));
        }

        //? Log a measure in any registered performance logger.
        //@ betaOnly
        public measure(id: string, value: number, s: IStackFrame)
        {
            if (!id) return;
            App.logMeasure(this.category, id, value, this.augmentMeta(null, s))
        }

        //? Start new logging context when you're starting a new task (eg, handling a request)
        //@ betaOnly
        public new_context(s:IStackFrame)
        {
            var prev = AppLogger.findContext(s)
            var ctx:any = { 
                id: prev ? prev.id + "." + ++prev.numCh : Random.uniqueId(8),
                prev: prev,
                created: Util.perfNow(), 
                numCh: 0, 
            }
            if (prev)
                ctx.root = prev.root
            else ctx.root = ctx
            s.loggerContext = ctx
        }


        //? Starts a timed sub-logger. The task name is concatenated to the current logger category.
        //@ betaOnly
        public start(task: string): AppLogger {            
            var name = this.category;
            if (name) name += ".";
            name += task;
            var logger = new AppLogger(name);
            logger.parent = this;
            return logger;
        }

        //? Ends a time sub-logger and reports the time.
        //@ betaOnly
        public end() {
            if (this.parent) {
                App.logMeasure(this.category, "LoggerStop", Util.perfNow() - this.created, null);
                this.parent = undefined;
            }
        }
    }

    export class AppLogView {
        private searchBox: HTMLInputElement;
        private chartsEl: HTMLElement;
        private logsEl: HTMLElement;
        private _reversed = false;
        public element: HTMLElement;
        public maxItems = Browser.isMobile ? 200 : 2000;
        public refreshRate = Browser.isMobile ? 500 : 100;

        static current:AppLogView;

        constructor() {
            // search bar
            AppLogView.current = this;
            this.searchBox = HTML.mkTextInput("text", lf("Filter..."), "search");
            this.searchBox.classList.add("logSearchInput");
            Util.onInputChange(this.searchBox, v => this.update());

            this.chartsEl = div(''); this.chartsEl.style.display = 'none';
            this.logsEl = div('');

            this.element = div('', this.searchBox, div('logView', this.chartsEl, this.logsEl));
            Util.setupDragToScroll(this.element);
            this.element.withClick(() => { }, true);

            this.update();
        }

        public setFilter(filter: string) {
            this.searchBox.value = filter || "";
            this.update();
        }

        public showAsync() : Promise {
            return new Promise((onSuccess, onError, onProgress) => {
                var m = new ModalDialog();
                m.onDismiss = () => onSuccess(undefined);
                m.add(this.element);
                m.setScroll();
                m.fullScreen();
                m.show();
            });
        }

        private transport: AppLogTransport;
        public attachLogEvents() {
            if (!this.transport) {
                var start = Util.now();
                this.transport = {
                    log: (level: number, category: string, msg: string, meta?: any) => {
                        var lm = App.createLogMessage(level, category, msg, meta);
                        lm.elapsed = Util.elapsed(start, Util.now());
                        this.append([lm]);
                    }
                };
                App.addTransport(this.transport);
            }
        }

        public removeLogEvents() {
            if (this.transport) {
                App.removeTransport(this.transport);
                this.transport = undefined;
            }
        }

        public charts(visible: boolean) {
            this.chartsEl.style.display = visible ? "block" : "none";
        }

        public search(visible: boolean) {
            this.searchBox.style.display = visible ? "block" : "none";
        }

        public reversed(r: boolean) {
            this._reversed = r;
            this.update();
        }

        private pendingChartUpdate = false;
        private update() {
            var els = Util.childNodes(this.logsEl);
            var terms = this.searchBox.value.toLowerCase();
            if (!terms) els.forEach(el => el.style.display = 'block');
            else els.forEach(el => {
                    if (el.innerText.toLowerCase().indexOf(terms) > -1) {
                        el.style.display = 'block';
                    } else el.style.display = 'none';
            });
            if (this.chartsEl.style.display == 'block' && !this.pendingChartUpdate) {
                this.pendingChartUpdate = true;
                Util.setTimeout(this.refreshRate, () => {
                    this.generateLogCharts();
                    this.pendingChartUpdate = false;
                });
            }
        }

        public onMessages : (els: HTMLElement[]) => void;

        private temp: HTMLElement;
        public append(msgs: LogMessage[]) {
            function levelToClass(level: number) {
                if (level <= RT.App.ERROR) return "error";
                else if (level <= RT.App.WARNING) return "warning";
                else if (level <= RT.App.INFO) return "info";
                else if (level <= RT.App.DEBUG) return "debug";
                else return "noisy";
            }

            var res = [];
            msgs.filter(msg => !!msg).forEach((lvl, index) => {
                var msg = lvl.msg;
                var txt = Util.htmlEscape(msg)
                    .replace(/https?:\/\/[^\s\r\n"'`]+/ig, (m) => "<a href=\"" + m + "\" target='_blank' rel='nofollow'>" + m + "</a>")
                    .replace(/\b(StK[A-Za-z0-9]{8,500})/g, (m) => " <a href='#cmd:search:" + m + "'>" + m + "</a>")

                if (lvl.meta && lvl.meta.contextId) {
                    var searchTerm = Util.htmlEscape(lvl.meta.contextId.replace(/\..*/, ""))
                    txt += " <span class='logMeta'>[<a href='#cmd:logfilter:" + searchTerm + "'>" + 
                           Util.htmlEscape(lvl.meta.contextId) + 
                           "</a>: " + Math.round(lvl.meta.contextDuration) + "ms]</span>"
                }

                var crash: RuntimeCrash = undefined;
                if (lvl.meta && lvl.meta && lvl.meta.kind === 'crash')
                    crash = <RuntimeCrash>lvl.meta;
                res.push("<div class='logMsg' data-level='" + levelToClass(lvl.level) + "' data-timestamp='" + lvl.timestamp + "'"
                    + (crash ? " data-crash='" + Util.htmlEscape(JSON.stringify(crash)) + "'" : "")
                    + ">"
                    + (lvl.elapsed ? (lvl.elapsed + '&gt; ') : '')
                    + (lvl.category ? (Util.htmlEscape(lvl.category) + ': ') : '')
                    + txt
                    + "</div>");
            });
            var temp = div(''); Browser.setInnerHTML(temp, res.join(""));

            var nodes = Util.childNodes(temp);
            if (this.onMessages) this.onMessages(nodes);

            var todrop = this.logsEl.childElementCount + nodes.length - this.maxItems;
            while(todrop-- > 0 && this.logsEl.firstElementChild)
                this.logsEl.removeChild(this._reversed ? this.logsEl.lastElementChild : this.logsEl.firstElementChild);
            var n = Math.min(nodes.length, this.maxItems);
            if (this._reversed) {
                for (var i = n-1; i >=0; --i)
                    this.logsEl.insertBefore(nodes[i], this.logsEl.firstElementChild);
            } else {
                for (var i = 0; i < n; ++i)
                    this.logsEl.appendChild(nodes[i]);
            }
            this.update();
        }

        public prependHTML(e:HTMLElement)
        {
            this.logsEl.insertBefore(e, this.logsEl.firstElementChild);
        }

        private series: TDev.StringMap<{ points: RT.Charts.Point[]; canvas?: HTMLCanvasElement; d? : HTMLElement }> = {};
        private generateLogCharts() : void {
            var els = Util.childNodes(this.logsEl).filter(el => el.style.display == 'block');

            Object.keys(this.series).forEach(key => this.series[key].points = []);
            // collect data
            var timestart = 0;
            els.forEach((elt, index) => {
                var msg = elt.innerText; if (!msg) return;
                var timestamp = parseFloat(elt.getAttribute("data-timestamp"))
                if (index == 0) timestart = timestamp;
                // parse out data
                var f: number;
                msg.replace(/\b([a-z]\w*)\b\s*[:=]\s*(-?\d+(\.\d+)?(e\d+)?)\s*$/ig, (mtch, key, v) => {
                    var value = parseFloat(v);
                    if (!this.series[key]) this.series[key] = { points: [] };
                    var x = (timestamp - timestart) / 1000.0;
                    this.series[key].points.push(new RT.Charts.Point(x, value));
                    return mtch;
                });
            });
            // render series
            Object.keys(this.series).forEach(key => {
                var serie = this.series[key];
                var points = serie.points;
                if (points.length < 5) {
                    if (serie.d) serie.d.removeSelf();
                    delete this.series[key];
                }
                else {
                    if (!serie.canvas) {
                        serie.canvas = <HTMLCanvasElement>document.createElement("canvas");
                        serie.canvas.width = SizeMgr.windowWidth * 0.8;
                        serie.canvas.height = serie.canvas.width / 7;
                        serie.canvas.style.display = 'block';
                        serie.canvas.style.cursor = 'pointer';
                        serie.canvas.style.marginTop = "0.5em";
                        serie.canvas.style.width = "100%";
                        serie.canvas.withClick(() => {
                            var rows = serie.points.map(p => p.x + "\t" + p.y);
                            rows.unshift("t\t" + key);
                            var csv = rows.join('\n');
                            ShareManager.copyToClipboardAsync(csv)
                                .done(() => HTML.showProgressNotification(lf("time serie copied to clipboard")));
                        });
                        serie.d = div('logMsg', spanDirAuto(key), serie.canvas);
                        this.chartsEl.appendChild(serie.d);
                    }
                    var chart = new RT.Charts.CanvasChart();
                    chart.backgroundColor = "#000";
                    chart.gridColor = "#ccc";
                    chart.lineColor = "#0c0";
                    chart.axesColor = "#000";
                    chart.graphLineWidth = 3;
                    chart.gridCols = 11;
                    chart.gridRows = 5;
                    chart.drawChart(serie.canvas, points);
                }
            });
        }
    }

    //? Various properties of application environment
    export class AppEnv
    {
        private temporarySettings: TDev.StringMap<string> = {};
        
        //? Retreives an in-memory editor setting
        //@ flow(SourceWeb)
        public temporary_setting(key: string) : string {
            return this.temporarySettings[key];
        }
        
        //? Sets an in-memory editor setting. The setting is stored until the page is refreshed
        //@ flow(SinkWeb)
        public set_temporary_setting(key: string, value: string) {            
            this.temporarySettings[key] = value;
        }        
        
        //? Get the browser name and version
        public user_agent() : string
        {
            return navigator.userAgent
        }

        //? Indicates if the `app->run_command` action can be used to run shell commands.
        //@ betaOnly
        public has_shell(): boolean {
            return !!Browser.localProxy;
        }

        //? Indicates if the `app->host_exec` action can be used to run host commands.
        //@ betaOnly
        public has_host(): boolean {
            return Browser.isHosted;
        }

        //? Where are we running from: "editor", "website", "nodejs", "mobileapp", "plugin"
        public runtime_kind(s:IStackFrame) : string
        {
            // TODO mobileapp not implemented yet
            return s.rt.runtimeKind()
        }

        //? Get device 'size': "phone", "tablet", or "desktop"
        public form_factor() : string
        {
            if (Browser.isCellphone) return "phone"
            if (Browser.isTablet) return "tablet"
            return "desktop"
        }

        //? Get current OS: "windows", "osx", "linux", "wp", "ios", "android", ...
        public operating_system() : string
        {
            if (Browser.isAndroid) return "android";
            if (Browser.isWP8app || (Browser.isTrident && Browser.isCellphone)) return "wp";
            if (Browser.isMobileSafari) return "ios";
            if (Browser.isMacOSX) return "osx";

            var c = Browser.platformCaps
            for (var i = 0; i < c.length; ++i)
                switch (c[i]) {
                    case "win": return "windows"
                    case "x11": return "linux"
                }

            return "unknown"
        }
        
        //? Return URL of the cloud backend service if any.
        public backend_url(s:IStackFrame) : string
        {
            return s.rt.compiled.azureSite
        }

        //? Initial URL used to launch the website; invalid when `->runtime kind` is "editor"
        public initial_url() : string
        {
            return Runtime.initialUrl
        }
    }

    //? Interact with the app runtime
    //@ skill(3)
    export module App
    {
        export function createInfoMessage(s: string) : LogMessage {
            return createLogMessage(App.INFO, "", s, undefined);
        }
        export function createLogMessage(level : number, category : string, s:string, meta: any) : LogMessage
        {
            var m = <LogMessage>{
                timestamp: Util.now(),
                level: level,
                category: category,
                msg: s,
                meta: meta
            }
            return m;
        }

        class Logger {
            logIdx = -1;
            logMsgs:LogMessage[] = [];
            logSz = Browser.isNodeJS ? 2000 : 300;

            addMsg(level : number, category : string, s:string, meta: any)
            {
                var m = createLogMessage(level, category, s, meta);
                if (this.logIdx >= 0) {
                    this.logMsgs[this.logIdx++] = m;
                    if (this.logIdx >= this.logSz) this.logIdx = 0;
                } else {
                    this.logMsgs.push(m);
                    if (this.logMsgs.length >= this.logSz)
                        this.logIdx = 0;
                }
            }

            getMsgs():LogMessage[]
            {
                var i = this.logIdx;
                var res = [];
                var wrapped = false;
                if (i < 0) i = 0;
                var n = Date.now()
                while (i < this.logMsgs.length) {
                    var m = this.logMsgs[i]
                    var diff = ("00000000" + (n - m.timestamp)).slice(-7).replace(/(\d\d\d)$/, (k) => "." + k);
                    res.push(<LogMessage>{
                        level: m.level,
                        category: m.category,
                        msg: m.msg,
                        elapsed: diff,
                        meta: m.meta,
                        timestamp: m.timestamp
                    });
                    if (++i == this.logMsgs.length && !wrapped) {
                        wrapped = true;
                        i = 0;
                    }
                    if (wrapped && i >= this.logIdx) break;
                }
                res.reverse()
                return res;
            }
        }

        var logger:Logger;
        export var transports: AppLogTransport[] = [];

        export function clearLogs() {
            logger = null;
            transports = [];        
        }

        export function startLogger()
        {
            logger = new Logger();
            transports = [];
        }

        export function rt_start(rt: Runtime): void
        {
            if (rt.liveMode())
                logger = null
            else if (!logger)
                logger = new Logger();
            transports = [];
        }

        export function rt_stop(rt: Runtime)
        {
            //transports = [];
        }

        //? Creates a specialized logger
        export function create_logger(category : string) : AppLogger {
            return new AppLogger(category);
        }

        // Adds a transport for the app log
        export function addTransport(transport: AppLogTransport) {
            if (transport) {
                removeTransport(transport);
                transports.push(transport);
            }
        }

        export function removeTransport(transport: AppLogTransport) {
            if (transport) {
                var i = transports.indexOf(transport);
                if (i > -1) transports.splice(i, 1);
            }
        }

        export var ERROR = 3;
        export var WARNING = 4;
        export var INFO = 6;
        export var DEBUG = 7;

        //? Appends this message to the debug log.
        //@ oldName("time->log")
        export function log(message: string): void
        {
            logEvent(INFO, "", message, undefined);
        }

        export function transportFailed(t:AppLogTransport, tp:string, err:any) {
            if (t.id) tp = " (" + t.id + ")"
            Util.log(tp + ": transport failed. " + (err.stack || err.message || err))
        }

        export var runTransports = (id:string, run:(t:AppLogTransport) => void) =>
        {
            transports.forEach(transport => {
                try {
                    run(transport)
                } catch (err) {
                    transportFailed(transport, id, err)
                }
            });
        }

        export function logException(err: any, meta? : any): void {
            if (err.tdSkipReporting) {
                logEvent(DEBUG, "skipped-crash", err.message || err + "", null)
                return
            }

            if (err.tdIsSecondary) {
                logEvent(DEBUG, "secondary-crash", err.message || err + "", null)
                return
            }

            try {
                if (Runtime.theRuntime)
                    Runtime.theRuntime.augmentException(err)
            } catch (e) { }

            if (err.tdMeta) {
                if (meta)
                    Object.keys(meta).forEach(k => {
                        err.tdMeta[k] = meta[k]
                    })
                meta = err.tdMeta
            }

            runTransports("logException", t => t.logException && t.logException(err, meta))

            var msg = err.stack
            if (!msg) {
                msg = err.message || (err + "")
                if (err.tdMeta && err.tdMeta.compressedStack)
                    msg += " at " + err.tdMeta.compressedStack
            }
            logEvent(ERROR, "crash", msg, meta);
        }

        export function logEvent(level: number, category: string, message: string, meta: any): void {
            level = Math.max(0, Math.floor(level));
            category = category || "";
            message = message || "";

            runTransports("logEvent", t => t.log && t.log(level, category, message, meta))

            if (logger) {
                logger.addMsg(level, category, message, meta)
                Util.log((category || "log") + ": " + message);
            }
        }

        export function logTick(category: string, id: string, meta:any) {
            runTransports("logTick", t => t.logTick && t.logTick(category, id, meta))
            if (!meta || !meta.skipLog)
                App.logEvent(App.INFO, category, id, meta);
        }

        export function logMeasure(category:string, id: string, value: number, meta: any) {
            var lmeta = Util.jsonClone(meta) || {};
            lmeta.measureId = id
            lmeta.measureValue = value
            runTransports("logMeasure", t => t.logMeasure && t.logMeasure(category, id, value, meta))
            if (!meta || !meta.skipLog)
                App.logEvent(App.INFO, category, id + ": " + value, lmeta);
        }

        export function logs() : LogMessage[]
        {
            if (logger)
                return logger.getMsgs()
            else
                return [];
        }

        //? Gets the binding of the current handler if any. This can be used to delete a handler from itself.
        export function current_handler(s:IStackFrame) : EventBinding {
            return s.currentHandler;
        }

        //? Stops the app.
        export function stop(r:ResumeCtx) : void
        {
            if (Browser.isCompiledApp)
                App.restart("", r);
            else
                r.rt.stopAsync().done();
        }
        
        //? Gets the app script id if any; invalid if not available
        export function script_id(s: IStackFrame): string {
            return s.rt.currentScriptId || undefined;
        }

        //? Restarts the app and pops a restart dialog
        export function restart(message: string, r: ResumeCtx): void {
            var rt = r.rt;
            
            if (Cloud.isRestricted()) {
                rt.stopAsync()
                  .then(() => rt.rerunAsync())
                  .done();
                return;
            }
            
            var score = Bazaar.cachedScore(rt);
            var scriptId = rt.currentScriptId;

            rt.stopAsync().done(() => {                               
                var m = new ModalDialog();
                m.add(div('wall-dialog-huge wall-dialog-text-center', message || lf("try again!")));
                if (score > 0)
                    m.add(div('wall-dialog-large wall-dialog-text-center', lf("your best score: {0}", score)));
                m.add(div('wall-dialog-body wall-dialog-extra-space wall-dialog-text-center',
                    HTML.mkButton(lf("play again"),() => {
                        tick(Ticks.runtimePlayAgain);
                        m.dismiss();
                        rt.rerunAsync().done();
                    }, 'wall-dialog-button-huge'),
                    Browser.notifyBackToHost ? HTML.mkButton(lf("back"),() => {
                        tick(Ticks.runtimeBack);
                        m.dismiss();
                        Util.externalNotify("exit");
                    }) : null
                    ));
                if (scriptId && score > 0) {
                    Bazaar.loadLeaderboardItemsAsync(scriptId)
                        .done((els: HTMLElement[]) => {
                        if (els && els.length > 0) {
                            m.add(div('wall-dialog-body wall-dialog-extra-space ', els));
                            m.setScroll();
                        }
                    }, e => { });
                }
                m.fullWhite();
                m.show();
            });
        }

        //? Aborts the execution if the condition is false.
        //@ [condition].defl(true)
        export function fail_if_not(condition:boolean) : void
        {
            if (!condition)
                Util.userError(lf("assertion violation"));
        }

        //? When exported server-side, retreives the value of a setting stored on the server. If not optional, fails if missing. Returns invalid if missing.
        export function server_setting(key : string, optional : boolean, s : IStackFrame) : string {
            if (!optional)
                Util.userError(lf("only supported on exported node.js apps"), s.pc);
            return undefined;
        }

        //? When exported, run `script` instead of the body of the action
        //@ [calling_convention].defl("local")
        //@ [script].lang("js")
        export function javascript(calling_convention:string, script:string) : void
        {
        }

        //? When exported, run `script` instead of the body of the action
        //@ async
        //@ [calling_convention].defl("local")
        //@ [script].lang("js")
        export function javascript_async(calling_convention:string, script:string, r:ResumeCtx) : void
        {
            r.resume()
        }

        //? Imports a dependent package which may be versioned. Package managers may be Node.JS npm, Bower, Apache cordova, Python Pip and TouchDevelop plugins. ``bower`` and ``client`` imports are not available within the touchdevelop.com domain.
        //@ name("import") [manager].deflStrings("npm", "cordova", "bower", "client", "touchdevelop", "pip") [version].defl("*")
        export function import_(manager : string, module: string, version: string): void {
        }

        //? When compiled to ARM Thumb, inline the body.
        //@ [script].lang("thumb")
        export function thumb(script:string) : void
        {
        }

        //? Get the current incomming HTTP web request
        //@ betaOnly
        export function server_request(s:IStackFrame) : ServerRequest
        {
            return s.rt.getRestRequest();
        }

        //? Get the response corresponding to the current incomming HTTP web request
        //@ betaOnly
        export function server_response(s:IStackFrame) : ServerResponse
        {
            var r = s.rt.getRestRequest();
            if (r) return r.response()
            return undefined
        }
        
        //? Get the Editor interface
        //@ betaOnly
        export function editor(s:IStackFrame) : Editor
        {
            return s.rt.editorObj
        }

        var _env = new AppEnv()

        //? Access various properties of application environment
        //@ betaOnly
        export function env() : AppEnv
        {
            return _env
        }

        //? Return runtime information about functions and types defined in script and its libraries
        //@ betaOnly
        //@ [what].deflStrings("actions")
        export function reflect(what:string, s:IStackFrame):JsonObject
        {
            var ri = s.rt.compiled.reflectionInfo
            if (ri.hasOwnProperty(what)) return JsonObject.wrap(ri[what])
            return undefined
        }

        //? Runs a shell command. This action is only available when the script is running from a local web server.
        //@ [cmd].deflStrings("shell", "mkdir", "writeFile", "readFile", "readDir", "writeFiles", "pythonEnv", "socket", "seriallist")
        //@ cap(shell) returns(JsonObject) async
        export function run_command(cmd: string, data: JsonObject, r: ResumeCtx) {
            var proxyAsync = r.rt.host.localProxyAsync;
            if (!proxyAsync) {
                r.resumeVal(JsonObject.wrap({ error: 'notsupported', reason: lf("This command requires a local proxy.") }));
                return;
            }

            r.rt.host.askSourceAccessAsync(lf("execute shell commands or manipulate files."),
                lf("the shell and/or the file system. This script may be harmful for your computer. Do not allow this if you do not trust the source of this script."), false, true)
                .then((allow :boolean) => {
                    if (!allow) return Promise.as(JsonObject.wrap({ error: 'denied', reason: lf("The user denied access to shell execution.") }));
                    else return proxyAsync(cmd, data ? data.value() : undefined);
                })
                .done(res => r.resumeVal(JsonObject.wrap(res)),
                e => r.resumeVal(JsonObject.wrap({ error: 'proxyerror', message: e.message, stack: e.stack }))
                )
        }

        //? Shows a dialog with the logs
        //@ uiAsync betaOnly
        export function show_logs(filter : string, r : ResumeCtx) {
            r.resume();
            showAppLogAsync(undefined, filter).done(() => { }, e => { });
        }

        export function showAppLogAsync(msgs?: LogMessage[], filter? : string, onMessages? : (els : HTMLElement[]) => void): Promise {
            var view = new AppLogView();
            view.onMessages = onMessages;
            view.charts(true);
            //view.reversed(true);
            view.append(App.logs());
            view.setFilter(filter);
            if (msgs) view.append(msgs);
            view.attachLogEvents();
            return view.showAsync().then(() => view.removeLogEvents(), () => view.removeLogEvents());
        }

        export function showLog(msgs: LogMessage[], onMessages?: (els: HTMLElement[]) => void) {
            var view = new AppLogView();
            view.onMessages = onMessages;
            view.append(msgs);
            view.showAsync().done(() => { }, e => { });
        }

        //? Get HTML-rendered content of all comments 'executed' since last call
        //@ dbgOnly
        export function consume_rendered_comments(s:IStackFrame):string
        {
            var r = s.rt.renderedComments
            s.rt.renderedComments = ""
            return r
        }

        export function hostExecAsync(message: string): Promise {
            return new Promise((onSuccess, onError, onProgress) => {
                if (message == "td_access_token") {
                    if (!Cloud.hasPermission("post-raw"))
                        onSuccess(undefined)
                    Runtime.theRuntime.host.askSourceAccessAsync(lf("your private access token"),
                        lf("your Touch Develop access token. The script will be able to upload web content as you."), false, true)
                        .done((allow :boolean) => {
                            if (!allow) onSuccess(undefined)
                            else onSuccess(Cloud.getServiceUrl() + "/?access_token=" + Cloud.getAccessToken())
                        })
                    return;
                }
            
                // minecraft support
                var mcefQuery = (<any>window).mcefQuery;
                if (mcefQuery) {
                    mcefQuery({
                        request: message,
                        persistent: false,
                        onSuccess: function (response) {
                            onSuccess(response);
                        },
                        onFailure: function (error_code, error_message) {
                            App.logEvent(App.DEBUG, "app", "mcefQuery failed", undefined);
                            onSuccess(JSON.stringify({ error: error_code, message: error_message }));
                        }
                    });
                    return;
                }

                // cordova support
                var cordova = (<any>window).cordova;
                if (cordova && cordova.exec) {
                    try {
                        var payload = JSON.parse(message);
                        cordova.exec(function (result) {
                                onSuccess(JSON.stringify(result));
                            },
                            function (error) {
                                onSuccess(JSON.stringify({ error: error }));                            
                            },
                            payload.service,
                            payload.action,
                            payload.arguments);
                    }
                    catch (e) {
                        App.logEvent(App.DEBUG, "app", "window.cordova.exec failed", undefined);
                        onSuccess(undefined);
                    }
                    return;
                }

                // generic callback support
                var exec = (<any>window).touchDevelopExec;
                if (exec) {
                    try {
                        exec(message,(result) => { onSuccess(result); });
                    }
                    catch (e) {
                        App.logEvent(App.DEBUG, "app", "touchDevelopExec failed", undefined);
                        onSuccess(undefined);
                    }
                    return;
                }

                App.log("no host found");
                onSuccess(undefined);
            });
        }

        export function hostSubscribeAsync(rt : Runtime, message: string, handler : TextAction): Promise {
            return new Promise((onSuccess, onError, onProgress) => {
                var ev = new Event_();
                var binding = ev.addHandler(handler);
                // minecraft support
                var mcefQuery = (<any>window).mcefQuery;
                if (mcefQuery) {
                    try {
                        mcefQuery({
                            request: message,
                            persistent: true,
                            onSuccess: function (response) {
                                rt.queueLocalEvent(ev, [response], false, false);
                            },
                            onFailure: function (error_code, error_message) {
                                App.logEvent(App.DEBUG, "app", "mcefQuery failed: " + error_code, undefined);
                            }
                        });
                    } catch (e) {
                        onSuccess(undefined);
                        return;
                    }
                    onSuccess(binding);
                    return;
                }

                // cordova support
                var cordova = (<any>window).cordova;
                if (cordova && cordova.exec) {
                    try {
                        var payload = JSON.parse(message);
                        cordova.exec(function (result) {
                            rt.queueLocalEvent(ev, [JSON.stringify(result)], false, false);
                        },
                        function (error) {
                            App.logEvent(App.DEBUG, "app", "cordova.exec failed: " + error, undefined);
                        },
                        payload.service,
                        payload.action,
                        payload.arguments);
                    }
                    catch (e) {
                        App.logEvent(App.DEBUG, "app", "cordova.exec failed: " + e, undefined);
                        onSuccess(undefined);
                        return;
                    }
                    onSuccess(binding);
                    return;
                }

                // generic callback support
                var exec = (<any>window).touchDevelopExec;
                if (exec) {
                    try {
                        exec(message,(result) => {
                            rt.queueLocalEvent(ev, [JSON.stringify(result)], false, false);
                        });
                    }
                    catch (e) {
                        App.logEvent(App.DEBUG, "app", "touchDevelopExec failed", undefined);
                        onSuccess(undefined);
                        return;
                    }

                    onSuccess(binding);
                    return;
                }

                App.log("no host found");
                onSuccess(undefined);
            });
        }

        //? Invokes the host to execute a command described in the message and returns the response. There is no restriction on the format of the request and response. If not available or errored, returns invalid.
        //@ async readsMutable returns(string) betaOnly
        export function host_exec(message: string, r: ResumeCtx) {
            return hostExecAsync(message).done(resp => r.resumeVal(resp));
        }

        //? Invokes the host to register an event listener described in the message.
        //@ async readsMutable returns(EventBinding) betaOnly ignoreReturnValue
        export function host_subscribe(message: string, handler: TextAction, r: ResumeCtx) {
            return hostSubscribeAsync(r.rt, message, handler).done(resp => r.resumeVal(resp));
        }

        //? Allow execution of other events, before the current event finishes.
        export function allow_other_events(s:IStackFrame) {
            s.rt.eventExecuting = false;
        }
    }
}
