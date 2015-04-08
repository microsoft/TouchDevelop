///<reference path='refs.ts'/>
module TDev.RT {
    // meta in messages coming from a logger will be augmented with the following
    export interface StdMeta {
        contextId: string;
        contextDuration: number;
    }

    export interface AppLogTransport {
        log? : (level : number, category : string, msg: string, meta?: any) => void;
        logException?: (err: any, meta?: any) => void;
        logTick?: (category: string, id: string, meta: any) => void;
        logMeasure?: (category: string, id: string, value: number, meta: any) => void;
    }

    //? A custom logger
    //@ stem("logger")
    export class AppLogger extends RTValue {
        public created: number;
        public parent: AppLogger;
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

        //? Logs a new message with optional metadata. The level follows the syslog convention.
        //@ [level].deflStrings("info", "debug", "warning", "error") [meta].deflExpr('invalid->json_object')
        public log(level: string, message: string, meta: JsonObject, s:IStackFrame) {
            var ilevel : number;
            switch (level.trim().toLowerCase()) {
                case 'debug': ilevel = App.DEBUG; break;
                case 'warning': ilevel = App.WARNING; break;
                case 'error': ilevel = App.ERROR; break;
                default: ilevel = App.INFO; break;
            }
            App.logEvent(ilevel, this.category, message, this.augmentMeta(meta ? meta.value() : undefined, s));
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
                return { contextId: c.id, contextDuration: Math.round(tm) }
            }
        }

        private augmentMeta(meta: JsonObject, s: IStackFrame) : any
        {
            var i = this.contextInfo(s)
            var v = meta ? meta.value() : null
            if (!i) return v
            if (!v) return i
            else {
                v = Util.jsonClone(v)
                v.contextId = i.contextId
                v.contextDuration = i.contextDuration
                return v
            }
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

        private series: TDev.StringMap<{ points: RT.Charts.Point[]; canvas?: HTMLCanvasElement; d? : HTMLElement }> = {};
        private generateLogCharts() : void {
            var els = Util.childNodes(this.logsEl).filter(el => el.style.display == 'block');

            Object.keys(this.series).forEach(key => this.series[key].points = []);
            // collect data
            var timestart = 0;
            els.forEach((elt, index) => {
                var msg = elt.innerText; if (!msg) return;
                var timestamp = parseFloat(elt.dataset["timestamp"])
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
                if (points.length < 2) {
                    if (serie.d) serie.d.removeSelf();
                    delete this.series[key];
                }
                else {
                    if (!serie.canvas) {
                        serie.canvas = <HTMLCanvasElement>document.createElement("canvas");
                        serie.canvas.width = SizeMgr.wallWindowWidth * 0.8;
                        serie.canvas.height = serie.canvas.width / 7;
                        serie.canvas.style.display = 'block';
                        serie.canvas.style.cursor = 'pointer';
                        serie.canvas.style.marginTop = "0.5em"; serie.canvas.style.width = "100%";
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
            logSz = 2000;

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
        var transports: AppLogTransport[] = [];

        export function clearLogs() {
            logger = null;
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

        export function logException(err: any, meta? : any): void {
            transports.filter(transport => !!transport.logException).forEach(transport => {
                try {
                    transport.logException(err, meta);
                } catch (err) {
                    Util.log('log: transport failed ');
                }
            });
            var msg = err.stack
            if (!msg) {
                msg = err.message || (err + "")
                if (err.tdCompressedStack)
                    msg += " at " + err.tdCompressedStack
            }
            logEvent(ERROR, "crash", msg, meta);
        }

        export function logEvent(level: number, category: string, message: string, meta: any): void {
            level = Math.max(0, Math.floor(level));
            category = category || "";
            message = message || "";

            transports.filter(transport => !!transport.log).forEach(transport => {
                try {
                    transport.log(level, category, message, meta);
                } catch (err) {
                    Util.log('transport failed ');
                }
            });
            if (logger) {
                logger.addMsg(level, category, message, meta)
                Util.log((category || "log") + ": " + message);
            }
        }

        export function logTick(category: string, id: string, meta:any) {
            App.logEvent(App.INFO, category, id, meta);
            transports.filter(transport => !!transport.logTick).forEach(transport => {
                try {
                    transport.logTick(category, id, meta);
                } catch (err) {
                    Util.log('transport failed');
                }
            });
        }

        export function logMeasure(category:string, id: string, value: number, meta: any) {
            var lmeta = Util.jsonClone(meta)
            lmeta.measureId = id
            lmeta.measureValue = value
            App.logEvent(App.INFO, category, id + ": " + value, lmeta);
            transports.filter(transport => !!transport.logMeasure).forEach(transport => {
                try {
                    transport.logMeasure(category, id, value, meta);
                } catch (err) {
                    Util.log('transport failed');
                }
            });
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

        //? Restarts the app and pops a restart dialog
        export function restart(message: string, r: ResumeCtx): void {
            var rt = r.rt;
            var score = Bazaar.cachedScore(rt);
            var scriptId = rt.currentScriptId;
            rt.stopAsync().done(() => {
                var m = new ModalDialog();
                m.canDismiss = !scriptId;
                m.add(div('wall-dialog-huge wall-dialog-text-center', message || lf("try again!")));
                if (score > 0)
                    m.add(div('wall-dialog-large wall-dialog-text-center', lf("your best score: {0}", score)));
                m.add(div('wall-dialog-body wall-dialog-extra-space wall-dialog-text-center',
                    HTML.mkButton(lf("play again"),() => {
                        tick(Ticks.runtimePlayAgain);
                        m.dismiss();
                        rt.rerunAsync().done();
                    }, 'wall-dialog-button-huge'),
                    !scriptId ? HTML.mkButton(lf("dismiss"),() => {
                        m.dismiss();
                    }) : null,
                    scriptId && Browser.notifyBackToHost ? HTML.mkButton(lf("back"),() => {
                        tick(Ticks.runtimeBack);
                        m.dismiss();
                        Util.externalNotify("exit");
                    }) : null
                    ));
                if (score > 0 && scriptId) {
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
        export function javascript(calling_convention:string, script:string) : void
        {
        }

        //? When exported, run `script` instead of the body of the action
        //@ async
        //@ [calling_convention].defl("local")
        export function javascript_async(calling_convention:string, script:string, r:ResumeCtx) : void
        {
            r.resume()
        }

        //? Imports a dependent package which may be versioned. Package managers may be Node.JS npm, Bower, Apache cordova, Python Pip and TouchDevelop plugins. ``bower`` and ``client`` imports are not available within the touchdevelop.com domain.
        //@ name("import") [manager].deflStrings("npm", "cordova", "bower", "client", "touchdevelop", "pip") [version].defl("*")
        export function import_(manager : string, module: string, version: string): void {
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
            view.reversed(true);
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
                var mcefQuery = (<any>window).mcefQuery;
                if (mcefQuery) {
                    mcefQuery({
                        request: message,
                        persistent: false,
                        onSuccess: function (response) {
                            onSuccess(response);
                        },
                        onFailure: function (error_code, error_message) {
                            onSuccess(JSON.stringify({ error: error_code, message: error_message }));
                        }
                    });
                    return;
                }

                var exec = (<any>window).touchDevelopExec;
                if (!exec) {
                    App.log("window.touchDevelopExec function not defined");
                    onSuccess(undefined);
                    return;
                }

                try {
                    exec(message,(result) => { onSuccess(result); });
                }
                catch (e) {
                    App.logEvent(App.DEBUG, "app", "touchDevelopExec failed", undefined);
                    onSuccess(undefined);
                }
            });
        }

        //? Invokes the host to execute a command described in the message and returns the response. There is no restriction on the format of the request and response. If not available or errored, returns invalid.
        //@ async readsMutable returns(string) betaOnly
        export function host_exec(message: string, r: ResumeCtx) {
            return hostExecAsync(message).done(resp => r.resumeVal(resp));
        }
    }
}
