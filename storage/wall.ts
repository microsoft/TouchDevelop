///<reference path='refs.ts'/>


module TDev {

    export var onWallClose:() => void = null;

    export class RuntimeHostBase
        implements RuntimeHost {
        public currentGuid: string;
        public currentRt: Runtime;
        public getWall() { return elt("theWall"); }
        private wallContainer = div('');
        public backBtnDiv = div(null); // FIXME t-mikhab: do something with lack of protected visibility
        private scriptTitleDiv = div("scriptTitle");
        private titleDiv = div("title");
        private subtitleDiv = div("subtitle");
        private titleContainer = div("wallTitleDiv");
        private cloudSymbol = div("wallCloudSymbol");
        private cloudStatus = div("wallCloudStatus");
        private cloudContainer: HTMLElement;
        private bottomBtnsDiv: HTMLElement;
        private topBtnRow: HTMLElement;
        private fullScreenBtnRow: HTMLElement;
        private bgPictureContainer = div("wallBgPictureHorizontal");
        private fullScreenContainer = div("wallFullScreenContainer");
        private adContainer = div('wallAdContainer');

        public wallWidth = 1000;
        public wallHeight = 1000;
        public wallOrientation = 0;
        public wallVisible = false;

        public copyrightHeight = 26;
        public showCopyright = !Browser.win8 && !Browser.isWP8app;
        private keyState: any = null;
        public localProxyAsync : (path: string, data: any) => Promise = undefined;

        public isHeadless()
        {
            return Browser.isHeadless || this.currentRt.headlessPluginMode
        }

        public fullWallHeight() {
            this.computeCopyrightHeight()
            return SizeMgr.windowHeight - (this.showCopyright ? this.copyrightHeight : 0);
        }

        private computeCopyrightHeight()
        {
            this.copyrightHeight = Math.round(SizeMgr.topFontSize*0.7*1.66);
        }

        public userWallHeight() {
            if (!this.currentRt.getCurrentPage().chromeVisible) return this.fullWallHeight();
            this.computeCopyrightHeight()
            return SizeMgr.windowHeight - 4 * SizeMgr.topFontSize - (this.showCopyright ? this.copyrightHeight : 0);
        }

        public fullWallWidth() {
            return SizeMgr.wallWindowWidth;
        }

        public init(rt: Runtime) {
            this.currentRt = rt;
        }

        public liveMode() { return false; }
        public dontWaitForEvents() { return false; }
        public astOfAsync(id: string) { return Promise.as(undefined); }
        public deploymentSettingsAsync(id:string) { return Promise.as(undefined); }
        public pickScriptAsync(mode: string, message: string): Promise { return Promise.as(undefined) }
        public saveAstAsync(id: string, ast: any): Promise { return Promise.as(undefined); }
        public packageScriptAsync(id : string, options: any) : Promise { return Promise.as(undefined); }
        
        /* overriden in EditorHost */
        public showBackButton() {
            // we need a consistent experience for tutorial
            //if (TDev.Browser.hasHardwareBack) return false;
            if (TDev.Browser.notifyBackToHost)
                return this.currentRt.getCurrentPage().backButtonVisible;

            if (this.currentRt.getPageCount() == 1 && (TDev.Browser.isCompiledApp || SizeMgr.splitScreen)) return false;
            if (!this.currentRt.isStopped()) 
                return this.currentRt.getCurrentPage().backButtonVisible;
            return true;
        }

        public applyPageAttributes(wp: WallPage) {
            this.titleDiv.setChildren(wp.title)
            this.subtitleDiv.setChildren(wp.subtitle)
            // do not show back button on first page
            if (this.showBackButton())
                this.titleContainer.className = 'wallTitleDiv';
            else
                this.titleContainer.className = 'wallTitleDiv wallTitleDivFirst';
            var wall = elt("wallOverlay");
            wall.style.background = wp.bgColor;
            wall.style.color = wp.fgColor;

            this.updateCloudStateColor(wp.fgColor);

            var bgPic = this.bgPictureContainer;

            if (wp.bgVideo) {
                wp.bgVideo.style.width = '100%';
                wp.bgVideo.style.height = '100%';
                wp.bgVideo.style.overflow = 'hidden';
                wp.bgVideo.controls = false;
                bgPic.className = "wallBgPictureHorizontal"
                bgPic.setChildren(wp.bgVideo);
                wp.bgVideo.play();
            }
            else if (wp.bgPicture && wp.bgPictureWidth > 0 && wp.bgPictureHeight > 0) {
                var ww = wp.bgPictureWidth;
                var hh = wp.bgPictureHeight;
                var pic = wp.bgPicture;
                bgPic.setChildren(pic);
                var r = hh / ww;
                var sr = window.innerHeight / window.innerWidth;
                if (ww / hh < SizeMgr.wallWindowWidth / SizeMgr.windowHeight) {
                    pic.style.width = '100%';
                    var h = (100 * r / sr);
                    pic.style.height = h + '%';
                    bgPic.style.left = "0";
                    bgPic.style.top = (100 - h) / 2 + "%";
                    bgPic.className = "wallBgPictureHorizontal"
                } else {
                    var w = 100 / r * sr;
                    pic.style.width = w + '%';
                    pic.style.height = '100%';
                    bgPic.style.left = (100 - w) / 2 + "%";
                    bgPic.style.top = "0";
                    bgPic.className = "wallBgPictureVertical"
                }
            } else if (wp.bgPictureUrl) {
                bgPic.style.backgroundImage = HTML.cssImage( wp.bgPictureUrl );
                bgPic.style.backgroundSize = "cover";
                bgPic.style.width = '100%';
                bgPic.style.height = '100%';
                bgPic.className = 'wallBgPictureVertical';
            } else {
                bgPic.className = "";
                bgPic.style.width = '';
                bgPic.style.height = '';
                bgPic.style.backgroundImage = '';
                bgPic.style.backgroundSize = '';
                bgPic.setChildren([])
            }

            var walkHtml = (e: HTMLElement) => {
                if (!e) return;
                if (e.getAttribute && e.getAttribute("fill")) {
                    e.setAttribute("fill", wp.fgColor)
                }
                if (e.className == "topMenu-button-frame")
                    e.style.borderColor = wp.fgColor;
                else if (e.className == "topMenu-button-desc" || e.className == "appBarSymbol")
                    e.style.color = wp.fgColor;
                Util.childNodes(e).forEach(walkHtml)
            }

            walkHtml(elt("wallBtns"));
            walkHtml(elt("wallFullScreenBtns"));
            walkHtml(elt("wallBottomBtns"));
        }

        public setTransform3d(trans: string, origin: string, perspective: string) {
            var ch = <HTMLElement>this.fullScreenContainer.firstChild
            if (ch)
                Util.setTransform(ch, trans, origin, perspective);
        }

        public setFullScreenElement(element: HTMLElement) {
            this.fullScreenContainer.setChildren(element);
            if (element) {
                var wall = elt("wallOverlay");
                this.fullScreenContainer.style.position = "relative";
                this.fullScreenContainer.style.display = "block";
            }
            else {
                this.fullScreenContainer.style.display = "none";
                this.fullScreenContainer.innerHTML = "";
            }
            this.updateButtonsVisibility();
        }

		public isFullScreen() : boolean {
			return this.fullScreenContainer.style.display != "none" &&
				!!this.fullScreenContainer.firstChild;
		}

        public tweakMsg(): HTMLElement {
            return div(null);
        }

        public copyrightElement(): HTMLElement {
            // no copyright notice in compiled apps
            if (Browser.isCompiledApp && !Browser.webRunner)
                return div(null);

            var copyrights = div("copyright-text copyright-info");
            //var msg = this.tweakMsg();
            var logo = div("copyright-text copyright-logo", SVG.getHorizLogo())
            //copyrights.style.right = "0";
            //logo.style.left = "0";
            var theNote = div("copyright-note", logo, copyrights);

            var aw = <any>window;
            var userName = Util.htmlEscape(aw.userName);
            var userId = Util.htmlEscape(aw.userId);
            var appName = Util.htmlEscape(aw.webAppName);
            var betaFriendlyId = aw.betaFriendlyId;

            var shareLink = () =>
                Browser.webRunner ? window.location.toString().replace(/#.*/, "") :
                this.currentRt && this.currentRt.currentScriptId ?
                    Cloud.getServiceUrl() + "/" + this.currentRt.currentScriptId : "";

            var author = Browser.inEditor ? "" : " by <b>" + userName + "</b>";
            var betaNote = betaFriendlyId ? ("<b>" + betaFriendlyId + "</b> ") : "";
            betaNote += "<b>" + appName + "</b>" + author;

            //var like = "<span class='beta-underline'>like</span>&nbsp;&nbsp;";
            //if (Browser.webRunner)
            //    like = "<div class='bottomSocialWidget'>" + RT.ShareManager.createFacebookLike(shareLink() || Cloud.getServiceUrl()) + "</div>";

            Browser.setInnerHTML(copyrights,  
                                //"<span class='beta-underline'>share</span>&nbsp;&nbsp;" +
                                //betaNote + "&nbsp;&nbsp;" +
                                "©&nbsp;&nbsp;" +
                                "<span class='beta-underline'>privacy and cookies</span>&nbsp;&nbsp;" +
                                "<span class='beta-underline'>legal</span>"
                                );

            var link = (text: string, lnk: string) =>
                HTML.mkButton(text, () => { window.open(/:\/\//.test(lnk) ? lnk : Cloud.getServiceUrl() + lnk) });

            var popup = () => {
                var m = new ModalDialog();
                m.fullWhite();
                m.add(div("wall-dialog-header", Util.htmlUnescape(appName)));

                m.addHTML("This web app was created" + author + " using TouchDevelop.");
                m.addHTML("The TouchDevelop platform - Copyright © 2014 Microsoft Corporation. All rights reserved.");
                m.addHTML("<b>DISCLAIMER:</b> This web app is not endorsed by Microsoft.");

                if (!Browser.inEditor)
                    m.add(div("wall-dialog-buttons",
                        link("more by " + userName, "/" + userId),
                        link("try touchdevelop", "")));

                m.add(div("wall-dialog-buttons",
                    link("legal", "/legal"),
                    link("privacy and cookies", "/privacy")));

                //var s = shareLink();
                //if (s) {
                //    RT.ShareManager.addShareButtons(m, TDev.RT.Web.link_url("Cool #touchdevelop web app", s), {
                //            header: "share this web app"
                //    });
                //} else {
                //    m.add(div("wall-dialog-header", lf("publish to share!")));
                //    m.addHTML("To share your script with others you first need to publish it. " +
                //             "In editor, tap on the 'publish' button, next to your script name and icon. ");
                //}

                m.show();
            }

            logo.withClick(popup);
            copyrights.withClick(popup);

            return theNote;
        }

        public askSourceAccessAsync(source: string, description: string, secondchance: boolean, critical? : boolean): Promise {
            if (!RuntimeSettings.askSourceAccess) // shortcut for generated app
                return Promise.as(true);

            var rt = this.currentRt;
            return rt.permissionsAsync()
                .then(d => {
                    var v = d[source];
                    if (v === false && secondchance)
                        v = undefined;
                    if (v != undefined) {
                        if (!v)
                            HTML.showProgressNotification("denied access to " + description);
                        return Promise.as(!!v);
                    }
                    return new Promise((onSuccess, onError, onProgress) => {
                        var m = new ModalDialog();
                        var allow = false;
                        m.onDismiss = () => {
                            d[source] = allow;
                            rt.savePermissionsAsync(d)
                                .done(() => onSuccess(allow));
                        }
                        var buttons: HTMLElement;
                        m.add([
                            div("wall-dialog-header", lf("allow access to {0}?", source)),
                            div("wall-dialog-body", lf("This script wants to access {0}", description)),
                            buttons = div("wall-dialog-buttons",
                                HTML.mkButton(lf("deny"), () => {
                                    allow = false; m.dismiss();
                                }),
                                HTML.mkButton(lf("allow"), () => {
                                    allow = true; m.dismiss();
                                })
                                )
                        ]);
                        if (critical) {
                            m.critical()
                            buttons.style.display = "none";
                            Util.setTimeout(5000, () => {
                                buttons.style.display = "block";
                            });
                        }
                        m.show();
                    });
                });
        }

        public updateButtonsVisibility() {
            if (this.isHeadless()) return

            var wp = this.currentRt.getCurrentPage();
            var element = this.fullScreenContainer.firstChild;
            var isStopped = this.currentRt.isStopped();
            this.titleContainer.style.display =
                (!wp.chromeVisible || element) && !isStopped ? "none" : "block";
            this.backBtnDiv.style.display = this.showBackButton() ? "block" : "none";
            if (wp.chromeVisible) this.wallContainer.classList.remove('no-bar');
            else this.wallContainer.classList.add('no-bar');
            this.wallContainer.style.display = element ? "none" : "block";
            this.fullScreenBtnRow.style.display = (Browser.screenshots || element) ? "block" : "none";
            this.bottomBtnsDiv.style.display = (element || !this.bottomBtnsDiv.hasChildNodes()) ? "none" : "block";
            for (var i = 0; i < this.bottomBtnsDiv.children.length; ++i)
                this.bottomBtnsDiv.children[i].setFlag('disabled', isStopped);
        }

        public applyWallStyle() {
            var w = this.getWall();
            w.className = "wallWithColumns";

            var h = SizeMgr.windowHeight;

            Util.setTransform(w, "none");
            Util.setupHDragToScroll(elt("wallContainer"));
            Util.resetDragToScroll(w);

            this.wallOrientation = 0;
            this.wallWidth = 18.5 * SizeMgr.topFontSize * 0.8;
            this.wallHeight = this.userWallHeight();
        }

        public publishSizeUpdate() {
            if (this.currentRt) {
                var p = this.currentRt.getCurrentPage();
                if (p)
                    this.applyPageAttributes(p);
            }
            WallPage.applySizeUpdate(elt("wallOverlay"));
        }

        public additionalButtons(): HTMLElement[] { return []; }
        public additionalFullScreenButtons(): HTMLElement[] { return []; }
        public notifyRunState() {
            this.updateButtonsVisibility();
        }
        public notifyBreakpointHit(bp: string) {
        }
        public notifyBreakpointContinue() {
        }
        public notifyTutorial(cmd: string) {
        }

        public initApiKeysAsync(): Promise  // boolean : reload
        { return Promise.as(); }
        public agreeTermsOfUseAsync(): Promise {
            return Promise.as();
        }
        public keyboard: TDev.RT.RuntimeKeyboard = undefined;

        private keyDown(e: KeyboardEvent): boolean {
            return this.keyboard.keyDown(e);
        }

        private keyUp(e: KeyboardEvent): boolean {
            return this.keyboard.keyUp(e);
        }

        private cssSetup = false;
        public clearCss()
        {
            this.cssSetup = false
            Util.childNodes(document.head).forEach(ch => {
                if (ch.getAttribute && ch.getAttribute("data-td-css"))
                    document.head.removeChild(ch)
            })
        }

        public importCss(url: string) {
            Util.assert(!!url, "missing url");
            this.cssSetup = true
            var fileref = document.createElement("link")
            fileref.setAttribute("rel", "stylesheet")
            fileref.setAttribute("type", "text/css")
            fileref.setAttribute("href", url)
            fileref.setAttribute("data-td-css", "yes")
            document.head.appendChild(fileref)
        }

        public showWall() {
            Ticker.dbg("showWall");

            var back = HTML.mkRoundButton("svg:back,black", lf("back"), Ticks.wallBack, () => this.backBtnHandler());

            this.keyboard = new TDev.RT.RuntimeKeyboard(this.currentRt)

            this.clearCss();

            if (!SizeMgr.splitScreen) {
                var keyMgr = KeyboardMgr.instance;

                this.wallVisible = true;
                if (this.keyState == null)
                    this.keyState = keyMgr.saveState();

                keyMgr.btnShortcut(back, "Esc");
                keyMgr.register("*keydown*", (e) => this.keyDown(e));
                keyMgr.register("*keyup*", (e) => this.keyUp(e));
            }

            this.backBtnDiv = div("wallBack", back);

            this.scriptTitleDiv.setChildren([this.currentRt.compiled.scriptTitle]);

            
            this.cloudContainer = div("inlineBlock", this.cloudSymbol, this.cloudStatus);
            this.cloudContainer.withClick(() => {
                if (this.cs_hasCloudState)
                    TDev.RT.CloudData.sessionInfoAsync(this.currentRt);
            });

            this.wallContainer = divId("wallContainer", "pane", divId("theWall", null), divId("theWallFloat", null));
            var wall = elt("wallOverlay");
            this.titleContainer.setChildren([this.scriptTitleDiv, this.titleDiv, this.subtitleDiv]);
            this.topBtnRow = divId("wallBtns", "wallBtnRow",
                    this.backBtnDiv, this.titleContainer, this.cloudContainer,
                    this.additionalButtons()
                    );
            this.fullScreenBtnRow = divId("wallFullScreenBtns", "", this.additionalFullScreenButtons());
            this.bottomBtnsDiv = divId("wallBottomBtns", "bottomButtons");
            this.setFullScreenElement(null);
            this.bgPictureContainer.setChildren([])
            wall.setChildren([
                this.bgPictureContainer,
                this.wallContainer,
                this.fullScreenContainer,
                this.topBtnRow,
                this.fullScreenBtnRow,
                this.bottomBtnsDiv
            ]);
            if (this.currentRt.compiled.showAd) {
                wall.appendChildren([this.adContainer]);
                TDev.RT.AdManager.initialize(this.adContainer);
            }
            if (this.showCopyright) {
                this.computeCopyrightHeight()
                this.wallContainer.style.bottom = this.copyrightHeight + "px";
                var copyright = this.copyrightElement();
                if (copyright) {
                    // copyright.style.height = this.copyrightHeight + "px";
                    wall.appendChild(copyright);
                }
            }
            this.applyWallStyle();
            wall.style.display = "block";
            wall.style.opacity = "1";
            Util.showLeftPanel(wall);
            this.wallShown();
        }

        public getFullScreenCanvas(): HTMLCanvasElement {
            if (this.fullScreenContainer.style.display !== "none") {
                var el = this.fullScreenContainer.firstChild;
                while (el != null && !(<any>el).toDataURL)
                    el = el.firstChild;
                var fs = <HTMLCanvasElement>el;
                if (fs != null)
                    return fs;
            }
            return undefined;
        }

        public toScreenshotCanvas(): HTMLCanvasElement {
            var fs = this.getFullScreenCanvas();
            if (fs != null) {
                try {
                    // artificially render the wall background color to avoid transparent boards
                    var page = this.currentRt.getCurrentPage();
                    var bgColor = page.bgColor || 'white';
					var bgPicture = page.bgPicture;
                    var canvas = <HTMLCanvasElement>document.createElement("canvas");
                    var w = fs.width;
                    var h = fs.height;
                    var f = 1;
                    if (h > w) {
                        if (h > 800) // too tall?
                            f = 800 / h;
                    } else {
                        if (w > 800) // too wide?
                            f = 800 / w;
                    }
                    canvas.width = Math.floor(w * f);
                    canvas.height = Math.floor(h * f);
                    var ctx = canvas.getContext("2d");
                    ctx.save();
                    ctx.fillStyle = bgColor;
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
					if (bgPicture) {
						var ww = page.bgPictureWidth;
						var hh = page.bgPictureHeight;
						var r = hh / ww;
						var sr = canvas.height / canvas.width;
						var left, top;
						if (r > sr) {
						    hh = ww * sr;
							left = 0;
							top = (page.bgPictureHeight - hh) / 2;
						} else {
						    ww = hh / sr;
							top = 0;
							left = (page.bgPictureWidth - ww) / 2;
						}
				        ctx.drawImage(bgPicture, left, top, ww, hh, 0, 0, canvas.width, canvas.height);
					}
                    ctx.drawImage(fs, 0, 0, canvas.width, canvas.height);
                    ctx.restore();

                    return canvas;
                } catch (e) {
                }
            }
            return undefined;
        }

        public otherwiseBack() { }

        public backBtnHandler() {
            Ticker.dbg("history.back from RuntimeHostBase.backBtnHandler");
            if (Browser.notifyBackToHost && this.currentRt.getPageCount() == 1) // last page
                Util.externalNotify("exit");
            else
                Util.goBack();
        }

        public notifyPageButtonUpdate(): void {
            this.bottomBtnsDiv.removeAllChildren();
            var page = this.currentRt.getCurrentPage();
            for (var i = 0; i < page.buttons.length; i++) {
                var button = page.buttons[i];
                this.bottomBtnsDiv.appendChild(button.getElement());
            }
            if (page.buttons.length > 0) {
                this.bottomBtnsDiv.style.display = 'block';
                (<HTMLElement>this.getWall().firstChild).style.paddingBottom = '6em';
            }
            else {
                this.bottomBtnsDiv.style.display = 'none';
                (<HTMLElement>this.getWall().firstChild).style.paddingBottom = null;
            }

            this.notifyRunState();
        }

        public notifyPagePush(): void {
            this.notifyPageButtonUpdate();
            if (this.currentRt.getPageCount() > 1) {
                var p = this.currentRt.getCurrentPage()
                if (!SizeMgr.splitScreen)
                    Screen.pushModalHash("page" + p.id, () => {
                        this.currentRt.popPagesIncluding(p);
                    })
            }
        }

        public notifyPagePop(p:WallPage): void {
            this.notifyPageButtonUpdate();
            if (!SizeMgr.splitScreen)
                Screen.popModalHash("page" + p.id)
        }

        public notifyStopAsync(): Promise {
            Ticker.dbg("notifyStop");
            var p = this.currentRt.saveDataAsync();
            this.notifyRunState();
            if (!SizeMgr.splitScreen && this.backBtnDiv && this.backBtnDiv.firstChild)
                KeyboardMgr.instance.btnShortcut(<HTMLElement>this.backBtnDiv.firstChild, "Esc");
            return p;
        }

        private cs_hasCloudState = false;
        private cs_status = "";
        private cs_type = "";
        private cs_color = "#000000";
        public updateCloudState(hasCloudState: boolean, type: string, status: string) {
            if (hasCloudState !== this.cs_hasCloudState || type !== this.cs_type || status !== this.cs_status)
            {
                if (!hasCloudState)
                    this.cloudSymbol.setChildren([]);
                else {
                    var svg = SVG.getCloudSymbol(this.cs_color, type, status === "connected", 1.5);
                    //svg.style.width = "10em";
                    //svg.style.height = "1.5em"; 
                    this.cloudSymbol.setChildren(svg);
                }
                this.cs_hasCloudState = hasCloudState;
                this.cs_type = type;
            }
            if (status !== this.cs_status)
            {
                this.cloudStatus.setChildren(status);
                this.cs_status = status;
            }
        }
        private updateCloudStateColor(color: string) {
            if (this.cs_color != color) {
                if (!this.cs_hasCloudState)
                    this.cloudSymbol.setChildren([]);
                else {
                    var svg = SVG.getCloudSymbol(color, this.cs_type, this.cs_status === "connected", 1.5);
                    //svg.style.width = (10 * SizeMgr.topFontSize) + "px";
                    //svg.style.height = (1.5 * SizeMgr.topFontSize) + "px";  
                    //svg.style.width = "10em";
                   // svg.style.height = "1.5em";  
                    this.cloudSymbol.setChildren(svg);
                }
                this.cs_color = color;
            }
        }


        public attachProfilingInfo(profile: any): void
        {
        }

        public attachCoverageInfo(profile: any, showCoverage: boolean): void
        {
        }

        public attachDebuggingInfo(runMap: RunBitMap, stackTrace: IPackedStackTrace, errorMessage: string): void
        {
        }

        public canEditCode()
        {
            return false
        }

        public fixErrorIn(stableName:string, error:string): void
        {
        }

        public wallHidden()
        {
        }

        public wallShown()
        {
        }

        public hideWallAsync()
        {
            Ticker.dbg("hideWallAsync");
            if (this.keyState)
                KeyboardMgr.instance.loadState(this.keyState);
            if (!this.wallVisible) {
                return Promise.as()
            }
            this.clearCss();
            var wall = elt("wallOverlay");
            this.keyState = null;
            this.wallHidden();

            return Util.animAsync("fadeOut", 200, wall).then(() => {
                this.wallVisible = false;
                wall.style.display = "none";
            });
        }

        public goBack()
        {
            Ticker.dbg("history.back from RuntimeHostBase.goBack");
            Util.goBack()
        }

        public notifyHideWall() : void
        {
            Ticker.dbg("notifyHideWall");
            this.hideWallAsync().done(() => {
                var f = TDev.onWallClose;
                if (!!f) {
                    TDev.onWallClose = null;
                    f();
                }
                this.goBack()
            });
        }

        /* overriden in EditorHost */
        public exceptionActions(e: any): any { return null; }
        /* overriden in EditorHost */
        public attachScriptStackTrace(bug: BugReport): void { }
        /* overriden in EditorHost */
        public debugModeEnabled(): boolean { return false; }
        /* overriden in EditorHost */
        public publishRunHelpLink(title: string): any { return undefined; }

        public exceptionHandler(e:any)
        {
            Ticker.dbg("wallExceptionHandler");

            e.includeSource = true;

            var bug = Ticker.mkBugReport(e, "runtime error");
            var msg = bug.exceptionMessage;

            var runMap = this.currentRt.runMap;
            var stack = PackedStackTrace.buildFrom(this.currentRt.getStackTrace());
            TDev.RT.App.logException(e);

            var askRunReport =
                !!e.isUserError &&
                !!Runtime.theRuntime.currentScriptId /* && this.currentRt.currentAuthorId != Cloud.getUserId() */; // the commented piece is questionable, put to remove by Nikolai

            var actions = this.exceptionActions(e) || {}
                        
            var debugAction = actions.debug || Util.doNothing;
            var stackTraceAction = actions.stack || Util.doNothing;
            var cancelAction = Util.doNothing;
            var error = ((e.isUserError && (e.message || e.name)) || "") + "";

            function frown(d:ModalDialog)
            {
                d.addFirst(div("floatingFrown", ":("))
            }

            if (askRunReport) {
                var futureModalDialog: ModalDialog;
                var debugBtn: any = (this.debugModeEnabled() && debugAction) ? HTML.mkButton(lf("debug"), () => {
                    debugAction(); this.attachDebuggingInfo(runMap, stack, msg); futureModalDialog.dismiss()
                }) : null;
                var sendRunReport = (anonymous: boolean, comment?: string) => {
                    var run: IRun = {
                        clientfile: (<any>window).mainJsName,
                        compilerversion: this.currentRt.compiled._compilerVersion,
                        kind: "run", 
                        publicationid: this.currentRt.currentScriptId,
                        error: error,
                        stack: stack,
                        runmap: runMap.isEmpty() ? undefined : runMap,
                        userplatform: Browser.platformCaps,
                        anonymous: anonymous
                    };
                    var rt = Runtime.theRuntime;
                    Cloud.postRunReportAsync(rt.currentScriptId, run).done(
                        json => {
                            HTML.showProgressNotification(dbg ? ("crash report submitted: /" + json.id) : "thank you for your run report");
                            if (!!comment) {
                                var jsonComment = {
                                    kind: "comment",
                                    text: comment,
                                    userplatform: Browser.platformCaps
                                };
                                Util.httpPostJsonAsync(Cloud.getPrivateApiUrl(json.id + "/comments"), jsonComment).done();
                            }
                        },
                        e => HTML.showProgressNotification(dbg ? ("crash report send failed: " + e) : "thank you for your run report")
                    );
                }

                var hiddenContent = div(null);
                var commentArea = HTML.mkAutoExpandingTextArea();
                commentArea.textarea.placeholder = "describe how you crashed the script";

                var defDS = hiddenContent.style.display;
                hiddenContent.style.display = "none";
                hiddenContent.setChildren([commentArea.div, debugBtn]);
                var showHidden = (v: boolean) => hiddenContent.style.display = v ? defDS : "none";

                var commentBox = HTML.mkCheckBox(
                    lf("show additional options"),
                    showHidden
                );

                futureModalDialog = ModalDialog.askManyWithAdditionalElts(
                    lf("the script crashed"), this.publishRunHelpLink("about posting crash"),
                    lf("Do you want to post some information to help improve the script? (The collected information include a stack trace, a coverage map, and a message.)"),
                    lf("error message"),
                    error,
                    {
                        "post": () => sendRunReport(false, commentArea.textarea.value || null),
                        "post anonymously": () => sendRunReport(true, commentArea.textarea.value || null),
                        cancel: () => { },
                    },
                    commentBox,
                    hiddenContent
                    );
                futureModalDialog.fullYellow();
                frown(futureModalDialog)
            } else if(this.canEditCode() && !!e.syntaxErrorDeclName) {
                var dial = ModalDialog.buttons(
                    lf("errors in the code?"),
                    lf("the script appears to have some errors. fix each error marked with a red :( symbol and try to run again"),
                    "",//"message",
                    "",//error,
                    HTML.mkButton(lf("edit code"), () => {
                        tick(Ticks.crashDialogEdit);
                        dial.dismiss(); this.fixErrorIn(e.syntaxErrorDeclName, error);
                    })
                    );
                dial.fullYellow();
                frown(dial)
            } else if(!!e.isUserError) {
                var dial = ModalDialog.buttons(
                    lf("the script crashed"),
                    this.canEditCode() ? lf("do you want do debug it?") : null,
                    lf("error message"),
                    error,
                    this.canEditCode() ? HTML.mkButton(lf("debug"), () => {
                        tick(Ticks.crashDialogDebug);                        
                        dial.dismiss(); this.attachDebuggingInfo(runMap, stack, msg); debugAction();
                    }) : null,
                    HTML.mkButton(lf("cancel"), () => {
                        dial.dismiss()
                    })
                    );
                dial.fullYellow();
                frown(dial)
            } else { //!isUserError
                this.attachScriptStackTrace(bug);
                Util.sendErrorReport(bug);
         
                var jsinfo:HTMLElement = dbg ? div("inlineBlock", HTML.mkButton(lf("js info (dbg)"), 
                    () => {
                        jsinfo.className = "";
                        var addInfo = bug.stackTrace ? bug.stackTrace : "(none available)";
                        Browser.setInnerHTML(jsinfo, Util.formatText(addInfo));
                    })) : undefined;

                var dial = ModalDialog.buttons(
                    "TouchDevelop crashed",
                    this.canEditCode() ? "do you want do debug the script?" : null, 
                    null, null,
                    this.canEditCode() ? HTML.mkButton(lf("debug"), () => { dial.dismiss(); this.attachDebuggingInfo(runMap, stack, msg); debugAction(); }) : null,
                    jsinfo,
                    HTML.mkButton(lf("cancel"), () => { dial.dismiss() })
                );
                dial.fullYellow();
                frown(dial)
            }
        }
    }

}
