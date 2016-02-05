///<reference path='refs.ts'/>
module TDev
{
    export class ModalDialog
    {
        private overlay = div("modalOverlay");
        private dialog = div("modalDialog");
        private floating: HTMLElement;
        private outerDialog:HTMLElement;
        private savedKeyState = null;
        private id = Random.uniqueId();
        private logView: TDev.RT.AppLogView;

        constructor(header = "")
        {
            this.floating = div("modalDialogInner", this.dialog);
            this.outerDialog = div("modalDialogOuter", div("modalDialogMid", this.floating));
            if (header)
                this.add(div("wall-dialog-header", header))
            this.fullWhite();
        }

        public opacity = 0.85;
        public onDismiss:(m:ModalDialog)=>void = null;
        public visible = false;
        public canDismiss = true;

        static current:ModalDialog;
        static dismissCurrent()
        {
            if (ModalDialog.currentIsVisible()) {
                ModalDialog.current.canDismiss = true;
                ModalDialog.current.dismiss()
            }
        }

        static currentIsVisible()
        {
            return ModalDialog.current && ModalDialog.current.visible;
        }

        public show()
        {
            this.showBare();
        }

        public addLog() {
            if (!this.logView) {
                this.logView = new TDev.RT.AppLogView();
                this.logView.charts(false);
                this.logView.search(false);
                this.logView.reversed(true);
                this.logView.attachLogEvents();
                this.logView.element.style.fontSize = "0.7em";
                this.add(this.logView.element);
                this.setScroll();
                this.stretchWide();
            }
        }

        public addFirst(v:HTMLElement)
        {
            if (this.dialog.firstChild)
                this.dialog.insertBefore(v, this.dialog.firstChild)
            else this.add(v)
        }

        public empty()
        {
            this.dialog.setChildren([])
        }

        public addBody(v:any)
        {
            this.add(div("wall-dialog-body", v))
        }

        public add(v:any)
        {
            if (v && Array.isArray(v))
                this.dialog.appendChildren(v);
            else
                this.dialog.appendChildren([v]);
        }

        public addClass(c:string)
        {
            this.dialog.className += " " + c;
        }

        public addHTML(html:string) : HTMLElement
        {
            var b = div("wall-dialog-body");
            Browser.setInnerHTML(b, html);
            this.add(b);
            return b;
        }

        public addOuter(v:any)
        {
            this.outerDialog.appendChildren([v]);
        }

        public stretchDown(e:HTMLElement, keep = 0)
        {
            this.outerDialog.className += " modalDialogOuterLong";
            this.listheight = SizeMgr.windowHeight - e.offsetTop - (3 + keep) * SizeMgr.topFontSize;
            e.style.height = this.listheight + "px";
        }

        public adjustlistsize() {
            if (!this.list || !this.buttondiv)
                return;
            var howmuchover = this.dialog.scrollHeight - this.dialog.clientHeight;
            if (howmuchover > 0) {
                this.listheight = Math.max(10 * SizeMgr.topFontSize, this.listheight - howmuchover);
                this.list.style.height = this.listheight + "px";
            }
        }

        public stretchWide()
        {
            this.floating.style.width = 'calc(100% - 1em)';
            this.dialog.style.width = '100%';
        }
        
        public showBare(what:HTMLElement = null)
        {
            Ticker.dbg("ModalDialog.showBare0");

            if (ModalDialog.current && ModalDialog.current != this && !ModalDialog.current.canDismiss)
                return;

            this.overlay.style.opacity = this.opacity.toString();
            this.overlay.withClick(() => { this.dismiss(); });
            this.outerDialog.withClick(() => { this.dismiss() });
            this.floating.withClick(() => { });
            var root = elt("root");
            Util.children(root).forEach(ch => ch.setAttribute("aria-hidden", "true"));
            root.appendChildren([this.overlay, what || this.outerDialog]);

            var btnsDiv:HTMLElement;

            Util.children(this.dialog).forEach((e) => {
                if (e.className == "wall-dialog-buttons")
                    btnsDiv = e;
                if (e.withClick && !(<any>e).clickHandler && !(<any>e).onselectstart)
                    e.withClick(() => {})
            });

            if (!what) {
                Util.showPopup(this.floating);
            } else {
                this.outerDialog = what;
                Util.showPopup(what);
            }

            if (ModalDialog.current && ModalDialog.current != this) {
                ModalDialog.dismissCurrent();
            }

            if (this.canDismiss)
                Screen.pushModalHash("dialog-" + this.id, () => this.dismiss());

            this.savedKeyState = KeyboardMgr.instance.saveState();
            KeyboardMgr.instance.register("Esc", () => { this.dismiss(); return true });

            this.visible = true;
            ModalDialog.current = this;

            if (btnsDiv) {
                var btns = Util.children(btnsDiv).filter((e) => (<any>e).clickHandler);
                if (btns.length == 1)
                    KeyboardMgr.instance.btnShortcut(btns[0], "Enter");
            }

            elt("root").setFlag("modal-visible", true);

            Ticker.dbg("ModalDialog.showBare1");
        }

        public dismiss()
        {
            if (!this.canDismiss) {
                Ticker.dbg("ModalDialog.dismiss - cannot");
                return;
            }

            Ticker.dbg("ModalDialog.dismiss0");

            Screen.popModalHash("dialog-" + this.id);

            if (this.logView) this.logView.removeLogEvents();
            this.visible = false;
            elt("root").setFlag("modal-visible", false);
            KeyboardMgr.instance.loadState(this.savedKeyState);
            Util.hidePopup(this.outerDialog, () => {
                Ticker.dbg("ModalDialog.dismiss1");
                this.outerDialog.removeSelf();
                Util.children(elt("root")).forEach(ch => ch.removeAttribute("aria-hidden"));
            });
            Util.fadeOut(this.overlay);
            var f = this.onDismiss
            this.onDismiss = null
            if (f) f(this);
        }

        static ask(msg: string, confirmation: string, act: () => void, critical = false, header: string = null)
        {
            var m = new ModalDialog();
            if (header == null) header = confirmation + "?"
            m.add([
                div("wall-dialog-header", header),
                div("wall-dialog-body", msg),
                div("wall-dialog-buttons",
                    HTML.mkButton(lf("cancel"), () => m.dismiss()),
                    HTML.mkButton(confirmation, () => { act(); m.dismiss(); }))
            ]);
            if (critical)   
                m.critical();
            m.show();
            return m;
        }

        static askAsync(msg: string, confirmation: string, critical = false, header: string = null)
            // the promise never finishes when not confirmed
        {
            var ret = new PromiseInv()
            var m = ModalDialog.ask(msg, confirmation, () => { ret.success(null) }, critical, header)
            return ret
        }

        static askMany(header:string, msg:string, options:any)
        {
            var m = new ModalDialog();
            m.add([
                div("wall-dialog-header", header),
                div("wall-dialog-body", msg),
                div("wall-dialog-buttons",
                    Object.keys(options).map((k:string) =>
                        HTML.mkButton(k, () => { m.dismiss(); options[k](); })))
            ]);
            m.show();
            return m;
        }

        static askManyWithAdditionalElts(header: string, helpLink: any, msg: any, subHeader: string, subMsg: any, options: any, ...elts: any[]) {
            var m = new ModalDialog();
            m.add([
                div("wall-dialog-header", header, helpLink),
                div("wall-dialog-body", msg),
                div("wall-dialog-header", subHeader),
                div("wall-dialog-body", subMsg),
                div("wall-dialog-buttons",
                    Object.keys(options).map((k: string) =>
                        HTML.mkButton(k, () => { m.dismiss(); options[k](); }))),
                elts
            ]);
            m.show();
            return m;
        }

        static buttons(header: string, msg: string, subheader: string, submsg: string, ...buttons: any[]) {
            var m = new ModalDialog();
            m.add([
                div("wall-dialog-header", header),
                div("wall-dialog-body", msg),
                subheader && div("wall-dialog-header", subheader),
                submsg && div("wall-dialog-body", submsg),
                div("wall-dialog-buttons", buttons)
            ]);
            m.show();
            return m;
        }

        static info(title:string, msg:string, btn : string = "ok")
        {
            var m = new ModalDialog();
            m.add([
                div("wall-dialog-header", title),
                div("wall-dialog-body", msg)])
            if (btn)
                m.addOk(btn)
            m.show();
            return m;
        }

        static infoAsync(title:string, msg:string, btn : string = "ok")
        {
            var r = new PromiseInv()
            var m = ModalDialog.info(title, msg, btn)
            m.onDismiss = () => r.success(null)
            return r
        }

        public addButtons(btns:any)
        {
            this.add(div("wall-dialog-buttons", Object.keys(btns).map(b => HTML.mkButton(b, btns[b]))))
        }

        public addOk(btn = lf("ok"), f:()=>void = null, cls = "", btns:any = [])
        {
            var b = HTML.mkButton(btn, () => {
                        if (f) f();
                        else this.dismiss();
                    });
            if (cls) b.className += " " + cls;
            this.add(div("wall-dialog-buttons", [b, btns]))
            return b;
        }
        
        static showAsync(msg: any, options: { title?: string; cancel?: boolean } = {}): Promise {
            return new Promise(function(onSuccess, onError, onProgress) {
                var m = new ModalDialog();
                var ok = false;
                if (options.title) m.add(div('wall-dialog-header', options.title));
                if (msg) m.add(div('wall-dialog-body', msg))
                m.addOk(lf("ok"), () => {
                    ok = true;
                    m.dismiss();
                }, "", options.cancel ? HTML.mkButton(lf("cancel"), () => m.dismiss()) : undefined);
                m.onDismiss = () => onSuccess(ok);
                m.show();                
            })            
        }

        static showText(s:string, title:string = null, msg:string = null, done : () => void = null) : ModalDialog
        {
            var m = new ModalDialog();
            if (title != null)
                m.add(div('wall-dialog-header', title));
            if (msg != null)
                m.add(div('wall-dialog-body', msg));
            var elt = HTML.mkTextArea("scriptText");
            elt.value = s;
            m.dialog.appendChild(elt);
            (<any>m).textArea = elt;
            m.onDismiss = done;
            m.show();
            m.stretchDown(elt);
            m.stretchWide();
            try {
                elt.setSelectionRange(0, s.length);
            } catch (e) { }
            return m;
        }

        static showTable(headers: string[], values: string[][], ondblclick: (md: ModalDialog, idx: number) => any) : ModalDialog
        {
            var m = new ModalDialog();
            var table = <HTMLTableElement>document.createElement("table");
            table.className = "traces";

            var hdrRow = <HTMLTableRowElement>document.createElement("tr");
            for (var i = 0; i < headers.length; i++) {
                var hdr = <HTMLTableHeaderCellElement>document.createElement("th");
                hdr.textContent = headers[i];
                hdrRow.appendChild(hdr);
            }
            table.appendChild(hdrRow);

            for (var i = 0; i < values.length; i++) {
                var row = <HTMLTableRowElement>document.createElement("tr");
                row.classList.add("hover");
                var rowValues = values[i];
                for (var j = 0; j < rowValues.length; j++) {
                    var v = <HTMLTableCellElement>document.createElement("td");
                    v.textContent = rowValues[j];
                    v.ondblclick = function(ev) {
                        var target:any = ev.target || ev.srcElement;
                        return ondblclick(m, target.parentElement.sectionRowIndex - 1);
                    }
                    row.appendChild(v);
                }
                table.appendChild(row);
            }

            m.dialog.appendChild(table);
            m.stretchDown(table);
            m.show();
            return m;
        }

        static editText(lbl:string, text:string, updateAsync:(s:string)=>Promise)
        {
            var m = new ModalDialog();

            var btns = div("wall-dialog-buttons",
                HTML.mkButton(lf("update"), () => {
                    btns.removeSelf()
                    updateAsync(inp.value)
                        .done(() => m.dismiss())
                }),
                HTML.mkButton(lf("cancel"), () => m.dismiss()))

            var inp = HTML.mkTextInput("text", "")
            inp.value = text

            m.add(div("wall-dialog-header", lbl))
            m.add(div(null, inp))
            m.add(btns)

            m.show()

            return m
        }
        
        public noChrome()
        {
            this.outerDialog.className += " modalNoChrome";
        }

        public fullScreen(iMeanIt = false)
        {
            this.outerDialog.className += " modalNoChrome " + (iMeanIt ? "reallyFullScreen" : "modalFullScreen");
            this.outerDialog.setChildren(this.dialog);
        }

        public fullBlack()
        {
            this.outerDialog.classList.add("modalFullBlack");
            this.outerDialog.classList.remove("modalFullWhite");
            this.outerDialog.classList.remove("modalFullYellow");
        }
       
        public fullWhite()
        {
            this.outerDialog.classList.remove("modalFullBlack");
            this.outerDialog.classList.add("modalFullWhite");
            this.outerDialog.classList.remove("modalFullYellow");
        }

        public fullYellow() {
            this.outerDialog.classList.remove("modalFullBlack");
            this.outerDialog.classList.remove("modalFullWhite");
            this.outerDialog.classList.add("modalFullYellow");
        }
                
        public critical() {
            this.outerDialog.classList.remove("modalFullBlack");
            this.outerDialog.classList.remove("modalFullWhite");
            this.outerDialog.classList.remove("modalFullYellow");
            this.floating.classList.add('bg-critical');
        }

        public setScroll() {
            this.dialog.style.maxHeight = (SizeMgr.windowHeight * 0.85) / SizeMgr.topFontSize + "em";
            Util.setupDragToScroll(this.dialog);
        }

        private list: HTMLElement;
        private listheight: number;
        private buttondiv: HTMLElement;
        private searchbox: HTMLElement;

        public showorhidelist(show: boolean) {
            var d = show ? "" : "none";
            if (this.searchbox)
                this.searchbox.style.display = d;
            if (this.list)
                this.list.style.display = d;
        }

        // queryAsync returns a promise that returns HTMLElement[]
        public choose(boxes:HTMLElement[], options : ModalChooseOptions = {})
        {
            var progressBar = HTML.mkProgressBar();
            var list = this.list = HTML.mkModalList([]);
            var search = HTML.mkTextInput("text", lf("choose..."));
            search.id = "chooseSearch"
            search.placeholder = options.searchHint || (options.queryAsync ? lf("Type to search online...") : lf("Type to search..."));
            var autoKeyboard = KeyboardAutoUpdate.mkInput(search, Util.catchErrors("chooseSearch", () => refresh(true)));
            autoKeyboard.attach()
            var limitedMode = !!options.mkSeeMore;

            if (limitedMode && boxes.every((b) => !(<any>b).initiallyHidden))
                limitedMode = false;

            var needKbd = false;
            
            function selectedItem(): HTMLElement { return Util.children(list).filter(el => el.getFlag("current"))[0]; }
            
            function refresh(onlineOK:boolean) {
                var allTerms = search.value;
                var terms = allTerms.split(/\s+/).map((s:string) => s.toLowerCase()).filter((s) => s != "");
                var res = []
                var ids = {}

                if (terms.length > 0) limitedMode = false;
                var skipCnt = 0;

                boxes.forEach((b:HTMLElement) => {
                    var miss = false;
                    if (limitedMode && (<any>b).initiallyHidden) {
                        skipCnt++;
                        return;
                    }
                    var cont = b.textContent.toLowerCase();
                    terms.forEach((term) => {
                        if (!miss && cont.indexOf(term) < 0) miss = true;
                    })
                    if (!miss) {
                        ids[cont] = 1;
                        res.push(b);
                        Util.highlightWords(b, terms, true);
                    }
                });
                if (limitedMode) {
                    var b = options.mkSeeMore(needKbd ? lf("you can also search") : lf("more option{0:s}", skipCnt))
                    HTML.setTickCallback(b, Ticks.sideMoreOptions, () => {
                        limitedMode = false;
                        refresh(options.initialEmptyQuery);                        
                    });
                    res.push(b);
                }
                list.setChildren(res);

                if (onlineOK && !!options.queryAsync && Cloud.isOnline()) {
                    progressBar.start();
                    options.queryAsync(allTerms).then((bxs : HTMLElement[]) => {
                            progressBar.stop();
                            if (!autoKeyboard.resultsCurrent(allTerms)) {
                                return;
                            }
                            if (!!bxs) {
                                bxs.forEach((bx) => {
                                    var bkey = bx.textContent.toLowerCase();
                                    if(!ids[bkey]) {
                                        ids[bkey] = 1;
                                        list.appendChild(bx);
                                        Util.highlightWords(bx, terms, true);
                                    }
                                });
                            }
                    }).done();
                }

                if (options.afterRefresh)
                    options.afterRefresh();
            }

            if (!options.noBackground)
                this.outerDialog.className += " modalChooser";

            if (options.header) {
                this.add(div("modalSearchHeader", options.header));
            }
            
            if (options.includeSearch !== undefined)
                needKbd = !!options.includeSearch;
            else
                needKbd = (!!options.queryAsync || boxes.length > 5)

            if (needKbd)
                this.add(this.searchbox = div("modalSearch", [<HTMLElement>progressBar, search]));

            this.add(list);

            this.buttondiv = div('wall-dialog-buttons modalChooseBtns');
            if (options.custombuttons !== undefined)
                this.buttondiv.appendChildren(options.custombuttons);
            else
                this.buttondiv.appendChild(HTML.mkButtonTick(lf("cancel"), Ticks.chooseCancel, () => this.dismiss()));
            this.add(this.buttondiv);

            this.show();

            // this has to happen after show() - show() saves the keyboard state so later this handler is removed
            // always capture keyboard in modal dialog
                KeyboardMgr.instance.register("Down", e => {
                    var selected = selectedItem();
                    if (!selected && list.firstElementChild) list.firstElementChild.setFlag("current", true);
                    else if(selected && selected.nextElementSibling) {
                        selected.setFlag("current", false);
                        selected.nextElementSibling.setFlag("current", true);
                        (<HTMLElement>selected.nextElementSibling).scrollIntoView(false);
                    }
                    return true;
                });
                KeyboardMgr.instance.register("Up", e => {
                    var selected = selectedItem();                    
                    if (!selected && list.lastElementChild) list.lastElementChild.setFlag("current", true);
                    else if(selected && selected.previousElementSibling) {
                        selected.setFlag("current", false);
                        selected.previousElementSibling.setFlag("current", true);
                        (<HTMLElement>selected.previousElementSibling).scrollIntoView(false);
                    }
                    return true;
                });
                KeyboardMgr.instance.register("Enter", e => {
                    var selected = selectedItem();
                    if (selected && (<any>selected).clickHandler) {
                        (<any>selected).clickHandler.fireClick(e);
                    } else if (list.firstElementChild) list.firstElementChild.setFlag("current", true);    
                    return true;
                });                
                KeyboardMgr.instance.register("***", (e: KeyboardEvent) => {
                    if (e.fromTextBox) return false;
                    var s = Util.keyEventString(e);
                    if (s) {
                        search.value += s;
                        Util.setKeyboardFocus(search);
                        return true;
                    }
                    return false;
                });

            if (!options.dontStretchDown)
                this.stretchDown(list, 2.8);

            if (options.adjustListSize)
                this.adjustlistsize();

            if (options.initialQuery !== undefined) {
                options.initialEmptyQuery = true
                search.value = options.initialQuery
                Util.setKeyboardFocus(search, true)
            }

            refresh(options.initialEmptyQuery);
         }


    }

    export interface ModalChooseOptions
    {
        queryAsync?: (terms: string) => Promise;
        searchHint?: string;
        initialQuery?: string;
        initialEmptyQuery?: boolean;
        header?: any;
        mkSeeMore?: (lbl: string) => HTMLElement;
        afterRefresh?: () => void;
        includeSearch?: boolean; // overrides default of 6+ items
        dontStretchDown?: boolean;
        adjustListSize?: boolean;
        noBackground?: boolean;
        custombuttons?: HTMLElement[];
    }


    export module ProgressOverlay
    {
        var overlay:HTMLElement;
        var msgDiv:HTMLElement;
        var addInfo:HTMLElement;
        var progress:HTMLElement;
        var visible = 0;
        var unblockedKeyboard = false;
        var logView : TDev.RT.AppLogView;

        export var lock:PromiseInv = PromiseInv.as();

        export function lockAndShow(msg = lf("working hard"), f?:() => void, splashUrl?:string)
        {
            lock.done(() => show(msg, f, splashUrl))
        }

        export function lockAndShowAsync(msg:string)
        {
            var r = new PromiseInv()
            lockAndShow(msg, () => r.success(null));
            return r
        }

        export function bumpShow()
        {
            Util.assert(isActive())
            visible++;
        }

        export function show(msg = lf("working hard"), f?:() => void, splashUrl? : string)
        {
            visible++;
            Ticker.dbg("ProgressOverlay.show " + visible + " " + msg);
            if (visible > 1) {
                setMessage(msg);
                return;
            }

            if (!overlay) {
                overlay =
                    div("modalOverlay", div("modalMessage",
                            msgDiv = div("modalMessageHeader"),
                            addInfo = div("modalMessagePleaseWait"),
                            progress = div("modalMessagePleaseWait")
                            ));
                overlay.withClick(() => {});
                overlay.style.backgroundColor = "white";
                overlay.style.opacity = "0.95";
                overlay.style.backgroundSize = "cover";
                overlay.style.backgroundRepeat = "no-repeat";
            }

            lock = new PromiseInv();
            setMessage(msg);
            setSplashArtId(splashUrl);
            addInfo.setChildren([lf("please wait...")]);
            closeLog();

            //Util.cancelAnim(overlay);
            overlay.removeSelf();
            elt("root").appendChildren([overlay]);

            if (f)
                // webkit seems to optimize the thing away if we don't give it enough time
                Util.setTimeout(Browser.isWebkit ? 100 : 1, f);
        }

        export function setAddInfo(info:any[])
        {
            addInfo.setChildren(info);
        }

        export function hide()
        {
            if (visible == 0) {
                // certain code path call setMessage but don't actually display the overlay
                // thus this check fails in the compiled apps
                // Util.check(false, "too many hides()");
                return;
            }

            visible--;
            Ticker.dbg("ProgressOverlay.hide " + visible);
            if (visible == 0) {
                lock.success(null);
                progress.setChildren([]);
                overlay.removeSelf();
                unblockedKeyboard = false
                closeLog();
            }
        }

        function closeLog() {
            if (logView) {
                logView.element.removeSelf();
                logView.removeLogEvents();
                logView = undefined;
            }
        }

        export function setProgress(msg:string)
        {
            if (progress)
                progress.setChildren(msg);
        }

        export function setMessage(msg:string)
        {
            if (msgDiv)
                msgDiv.setChildren(msg);
        }

        export function setSplashArtId(url: string) {
            if (overlay) overlay.style.backgroundImage = HTML.cssImage(url, 0.3);
        }

        export function unblockKeyboard() { unblockedKeyboard = true }
        export function isKeyboardBlocked() { return isActive() && !unblockedKeyboard; }

        export function showLog() {
            if (!logView) {
                logView = new TDev.RT.AppLogView();
                logView.charts(false);
                logView.search(false);
                logView.reversed(true);
                logView.attachLogEvents();
                logView.element.style.fontSize = "0.7em";
                progress.parentElement.appendChild(logView.element);
            }
        }

        export function isActive() { return visible > 0; }
    }
}
