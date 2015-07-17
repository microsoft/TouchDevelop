///<reference path='refs.ts'/>


module TDev {

    export var currentScreen: Screen = null;
    export var allScreens: Screen[] = [];

    interface HistoryEntry {
        url: string;
        onPop: () => void;
    }

    export class HistoryMgr
    {
        private lastSetHash: string;
        // hack to filter out hash change that wasn't according to us
        private previousHash: string;

        public replaceNext: boolean;

        // seems to be used to determine if this is the first loadHash ever
        public numReloads = 0;

        static instance: HistoryMgr;

        private urlStack : HistoryEntry[] = [];

        constructor() {
            this.lastSetHash = "";
            this.replaceNext = false;

            Screen.pushModalHash = (s, f) => this.pushModalHash(s, f);
            Screen.popModalHash = (s) => this.popModalHash(s);

            HistoryMgr.instance = this;

            Util.onSetHash = (s, r) => this.setHashHandler(s, r);
            Util.onGoBack = () => this.back();
        }

        /// Used for debugging.
        public currentHash() { return this.lastSetHash; }

        static urlHash(url: string): string {
            var i = url.indexOf('#')
            if (i > 0 && i < url.length - 1)
                return url.slice(i);
            else
                return "#hub";
        }

        static windowHash() {
            var h = window.location.href;
            return HistoryMgr.urlHash(h);
        }

        private pushState(h:string)
        {
            try {
                Util.log("pushState: " + h)
                h = window.location.href.replace(/#.*/, "") + (h || "")
                window.history.pushState(++this.numPush, null, h)
            } catch (e) {
                // this doesn't work in embedded iframe
            }
        }

        // Called to tell the history manager where we are
        // Not expected to change the appearance of the UI
        public setHash(h: string, t: string) {
            Util.log("sethash: " + h + " - " + t)
            Ticker.dbg("History.setHash|" + h);
            var repl = this.replaceNext;
            this.replaceNext = false;
            if (repl) {
                Ticker.dbg("History.setHash is a replace");
            }
            this.numReloads++;

            if (!/^#/.test(h)) h = "#" + h;

            if (h == "#hub") h = "#"

            this.clearModalSuffix();

            Screen.arrivedAtHash(h);

            if (this.urlStack.length == 0 || this.urlStack.peek().url != h) {
                this.urlStack.push({ url: h, onPop: () => { } });
                this.pushState(h)
            }
            else {
                Ticker.dbg("setHash.. ignoring same hash");
            }
            if (t !== null) {
                if (t)
                    document.title = t + " - " + Runtime.appName;
                else
                    document.title = Runtime.appName;
            }
        }

        private pushModalHash(s: string, f: () => void) {
            var hash = '#modal-' + s;
            if (this.urlStack.length > 0 && this.urlStack.peek().url == hash) {
                this.urlStack.pop();
            }
            this.urlStack.push({ url: hash, onPop: f });
            this.pushState(this.topHash())
            Screen.arrivedAtHash(hash); // inform the WAB shell there is a modal dialog
        }

        private popModalHash(s: string) {
            Ticker.dbg("popModal " + s);
            var hash = '#modal-' + s;
            var index = -1;
            for (var i = 0; i < this.urlStack.length; i++) {
                if (this.urlStack[i].url == hash) {
                    index = i;
                    this.urlStack[i].onPop = null;
                    break;
                }
            }
            if (index < 0) return;
            this.popBack(this.urlStack.length - index)
        }


        private popBack(toPop = 1) {
            Ticker.dbg("historyMgr: popBack " + toPop);

            var popped = this.urlStack.splice(this.urlStack.length - toPop, toPop);
            var seenNonModal = false
            for (var i = popped.length - 1; i >= 0; i--) {
                var entry = popped[i];
                if (!/#modal-/.test(entry.url))
                    seenNonModal = true
                if (entry.onPop) {
                    var f = entry.onPop;
                    entry.onPop = null;
                    f();
                }
            }

            // inform the WAB shell whether the current url is the top page
            var last = this.urlStack.peek()
            Screen.arrivedAtHash(last ? last.url : "#")

            if (seenNonModal)
                this.dispatch(this.topHash())
            else
                this.hashReloaded()
        }

        public hashReloaded()
        {
            this.pushState(this.topHash())
        }

        private topHash()
        {
            for (var i = this.urlStack.length - 1; i >= 0; i--) {
                var t = this.urlStack[i]
                if (t && !/^#modal-/.test(t.url)) return t.url
            }

            return "#"
        }

        private dispatch(h:string)
        {
            Util.log("dispatch: " + h)
            ModalDialog.dismissCurrent()
            this.pushState(h)
            this.reload(h)
        }


        public initialHash()
        {
            this.setHashHandler(HistoryMgr.windowHash(), true);
            if (this.lastSetHash == "" && !this.replaceNext) {
                // make sure we get a pop event
                this.pushState(null)
                this.replaceNext = true;
                this.showStartScreen();
            }
        }

        public showStartScreen()
        {
        }

        public reload(hash:string)
        {
        }

        public confirmLoadHash()
        {
            Ticker.dbg("History.confirmLoadHash");
            this.replaceNext = false;
        }

        public clearModalSuffix(): number {
            for (var i = 0; i < this.urlStack.length; i++) {
                if (/^#modal-/.test(this.urlStack[i].url)) {
                    var removed = this.urlStack.splice(i, this.urlStack.length - i);
                    return removed.length;
                }
            }
            return 0;
        }

        public clearModalStack()
        {
            var n = this.clearModalSuffix();
            // this.popBack(n)
        }

        private numPush = 1;

        public commandHandler(h:string)
        {
        }

        public popState(event:any) {
            Ticker.dbg("popState: " + event.state);

            // exiting the app?
            if (this.urlStack.length == 1) {
                window.history.back()
                return
            }

            var h = HistoryMgr.windowHash()
            if (/^#cmd:/.test(h)) {
                var nh = this.topHash()
                this.whenSafe(() => {
                    this.pushState(nh)
                    this.commandHandler(h)
                })
            } else {
                this.back();
            }
        }

        public back()
        {
            this.whenSafe(() => this.popBack())
        }

        private whenSafe(f:()=>void)
        {
            if (ProgressOverlay.isActive())
                Util.setTimeout(500, () => this.whenSafe(f))
            else
                f();
        }

        private setHashHandler(h:string, replace:boolean)
        {
            this.whenSafe(() => {
                if (!h) h = "#"
                if (!/^#/.test(h)) h = "#" + h
                if (replace) { // try to pop history until h is found
                    for (var i = this.urlStack.length - 1; i >= 0; --i) {
                        if (this.urlStack[i].url == h) {
                            if (i == this.urlStack.length - 1) { // nothing to do.
                                Util.log("replaced hash already current, skipping " + h)
                                return;
                            }
                            else {
                                Util.log("found hash to replace in stack, popping " + h)
                                this.popBack(this.urlStack.length - 1 - i);
                                return;
                            }
                        }
                    }
                    
                }    
                this.dispatch(h)
            })
        }

        public scriptOrHub(h:string[])
        {
            var id = h.filter((s) => /^id=/.test(s))[0]
            if (id) {
                // HTML.showProgressNotification("script not installed yet");
                var scr = id.replace(/^id=/, "script:")
                if (h[0] == "list")
                    Util.setHash(h[0] + ":" + h[1] + ":" + scr, true)
                else
                    Util.setHash(scr, true)
            } else {
                Util.setHash("hub", true)
            }
        }

        public hashChange()
        {
            Util.log("hashChange: " + HistoryMgr.windowHash())
        }
    }

    export class Screen
    {
        public init() {}
        public hide() {}
        public screenId() { return ""; }
        public loadHash(h:string[]) {}
        public keyDown(e:KeyboardEvent):boolean { return false; }
        public applySizes() {}

        static pushModalHash = (s:string, removeCb:()=>void) => {};
        static popModalHash = (s: string) => { };

        static arrivedAtHash = (s:string) => {};

        public syncDone() {}
        public hashReloaded() {}

        private paneState = 0;

        public autoHide() { return SizeMgr.portraitMode; }

        public sidePaneVisible() { return !this.autoHide() || this.sidePane().style.display == "block"; }
        public sidePaneVisibleNow() { return !this.autoHide() || this.paneState > 0; }

        public updateSidePane() {
            var pane = this.sidePane();
            if (!this.autoHide()) {
                pane.style.display = "block";
                pane.style.opacity = "1";
            } else if (this.autoHide() && this.paneState < 0) {
                pane.style.display = "none";
            }
            elt("root").setFlag("pane-hidden", pane.style.display == "none");
        }

        public showSidePane()
        {
            if (!this.autoHide() || this.paneState > 0) return;
            Screen.pushModalHash("side", () => this.hideSidePane());
            elt("root").setFlag("pane-hidden", false);
            this.paneState = 1;
            var pane = this.sidePane();
            pane.style.display = "block";
            pane.style.opacity = "1";
            Util.showRightPanel(pane);
        }

        public sidePane():HTMLElement { return null; }

        public hideSidePane()
        {
            var pane = this.sidePane();
            if (!this.autoHide()) {
                pane.style.display = "block";
                pane.style.opacity = "1";
                return;
            }
            if (this.paneState < 0) return;

            Screen.popModalHash("side");
            elt("root").setFlag("pane-hidden", true);
            this.paneState = -1;
            Util.hidePopup(pane, () => {
                if (this.paneState < 0 && this.autoHide())
                    pane.style.display = "none";
            });
        }

        public hashCommandHandler(h:string)
        {
        }

    }


    export class KeyboardMgr
    {
        static instance = new KeyboardMgr();

        private handlers:any = {};

        public register(key:string, cb:(e:KeyboardEvent)=>boolean)
        {
            if (/^-/.test(key)) return;
            this.handlers[key] = cb;
        }

        public saveState()
        {
            return Util.flatClone(this.handlers);
        }

        public loadState(s:any)
        {
            if (!Util.check(!!s)) return;
            this.handlers = s;
        }

        public triggerKey(name:string)
        {
            var h = this.handlers[name];
            if (h && h.isBtnShortcut)
                h();
        }

        static triggerClick(e:HTMLElement)
        {
            var h = <ClickHandler>(<any>e).clickHandler;
            if (!!h) {
                var active = <HTMLElement> document.activeElement;
                if (!!active && !!active.blur) active.blur();
                e.setFlag("active", true);
                Util.setTimeout(150, () => { e.setFlag("active", false) });
                h.fireClick(<any>{});
            }
        }

        static elementVisible(e:HTMLElement)
        {
            while (e) {
                if (e.id == "root") return true;
                if (window.getComputedStyle(e).display == "none") return false;
                e = <HTMLElement> e.parentNode;
            }
            return false;
        }

        public btnShortcut(e:HTMLElement, key:string)
        {
            var handle = () => {
                if (KeyboardMgr.elementVisible(e)) {
                    KeyboardMgr.triggerClick(e);
                    return true;
                }
                return false;
            }

            if (!key) return;

            (<any>handle).isBtnShortcut = true;

            if (!/^ /.test(key))
                key.split(", ").forEach((k) => this.register(k, handle));

            e.title = key.replace(/(^| )-/g, "");
        }

        private previousStoppedEvent:KeyboardEvent;

        public keyUp(e:KeyboardEvent) : any
        {
            Util.normalizeKeyEvent(e);
            if (/-(Control|Alt)$/.test(e.keyName))
                return true;

            var h = this.handlers["*keyup*"];
            if (h) {
                Ticker.dbg("keyUp.run");
                if (h(e)) return true;
            }
        }

        public processKey(e:KeyboardEvent) : any
        {
            Util.normalizeKeyEvent(e);
            if (/-(Control|Alt)$/.test(e.keyName))
                return true;

            if (Browser.isGecko) {
                var isRepeated =
                    e.type == "keypress" &&
                    this.previousStoppedEvent &&
                    this.previousStoppedEvent.type == "keydown";
                this.previousStoppedEvent = null;
                if (isRepeated)
                    return e.stopIt();
            }

            if (this.keyHandler(e)) {
                if (Browser.isGecko)
                    this.previousStoppedEvent = e;
                return e.stopIt();
            }
        }

        public attach(inp:HTMLInputElement)
        {
            inp.onkeydown = Util.catchErrors("textboxKey", (e:KeyboardEvent) => {
                e.fromTextBox = true;
                return this.processKey(e);
            });
        }

        private keyHandler(e:KeyboardEvent) : boolean
        {
            if (ProgressOverlay.isKeyboardBlocked()) return true;

            if (e.keyName == "Ctrl-Control") return false;

            if (/^(Del|Ctrl-[CXVA]|Shift-(Left|Right)|(Ctrl|Shift)-(Ins|Del))$/.test(e.keyName) && e.fromTextBox) return false;

            if (TDev.dbg && e.keyName) tick(Ticks.mainKeyEvent)

            h = this.handlers["*keydown*"];
            if (h) {
                if (TDev.dbg && e.keyName)
                    Ticker.dbg("keyHandler.preCatchAll." + e.keyName)
                if (h(e)) return true;
            }

            var h = this.handlers[e.keyName];
            if (h) {
                if (TDev.dbg && e.keyName)
                    Ticker.dbg("keyHandler.byName." + e.keyName);
                if (h(e)) return true;
            }

            h = this.handlers["***"];
            if (h) {
                if (TDev.dbg && e.keyName)
                    Ticker.dbg("keyHandler.catchAll." + e.keyName)
                if (h(e)) return true;
            }

            if (currentScreen) {
                if (TDev.dbg && e.keyName)
                    Ticker.dbg("keyHandler.currentScreen." + e.keyName)
                if (currentScreen.keyDown(e)) return true;
            }

            if (e.keyCode == 8 && !e.fromTextBox)
                return true;

            return false;
        }
    }


}
