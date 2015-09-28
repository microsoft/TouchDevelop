///<reference path='refs.ts'/>


module TDev {

    export class LayoutMgr {
        static instance: LayoutMgr = new LayoutMgr();

        // Set in initAsync(), default.str
        public onBoxSelected: () => void = () => { };
        public onRendered: () => void = () => { };

        public numBoxes: number = 0;

        public changedtext: string;

        boxes: BoxBase[];
        rootBox: BoxBase;
        //relayoutingBoxes: WallBox[];

        rootElement: HTMLElement;

        scrollspeculation = true;

        pcTable: any;

        currentAstNodeId = "";

        selectedBox: BoxBase = null;

        boxMenu: HTMLElement = null;
        //originalX: number;
        //originalY: number;

        minimumScale: number;
        maximumScale: number;
        scale: number; // TODO: should be reset after loading the script.

        scrollTop: number = undefined;
        scrollLeft: number = undefined;
      //  zoomfactor: number = undefined;

        public editMode: boolean;
        public sideview = false;

        public updateEditMode(rt: Runtime) {

            // Set edit mode to true,
            // if the script is stopped or is running in live mode.
            this.editMode = rt.liveViewSupported() && (rt.isStopped() || rt.liveMode());

            // Dive into the edit mode!
            if (this.editMode) {

            } else {
                // Get out of the edit mode...
                if (this.currentAstNodeId) {
                    this.clearRelatedBoxes();
                }
                if (this.selectedBox !== null) {
                    this.unselectBox();
                }
                this.adjustForNormalView();
            }

            if (!!this.rootBox)
                this.updateRootElement();




            //if (!!this.rootBox) {
            //     this.boxes.forEach((box: WallBox) =>
            //            { box.setEditMode(editMode); });
            // }
        }

        private static renderexecutionmode = false;
        public static RenderExecutionMode(): boolean { return LayoutMgr.renderexecutionmode; }
        public static SetRenderExecutionMode(val: boolean) { LayoutMgr.renderexecutionmode = val; }

        private static needrelayout = false;

        public static QueueReLayout() {
            // keep it simple... do it immediately.
            //if (!LayoutMgr.renderexecutionmode && LayoutMgr.instance.rootBox) {
            //    LayoutMgr.instance.CoreLayout();
            //}

            var check = () => {
                if (LayoutMgr.needrelayout) {
                    if (!LayoutMgr.renderexecutionmode && LayoutMgr.instance.rootBox) {
                        LayoutMgr.instance.CoreLayout();
                        LayoutMgr.needrelayout = false;
                    } else
                        TDev.Util.setTimeout(100, check);
                }
            };

            if (!LayoutMgr.needrelayout) {
                LayoutMgr.needrelayout = true;
                TDev.Util.setTimeout(50, check);
            }
        }

        // functions for altering scroll behavior of top elements (switching between live view and actual view)
        public adjustForSideView() {
            // DUAL-TODO: remove?
            if (!this.sideview) {
                this.rootElement.style.overflow = "auto";
                this.rootElement.style.msContentZooming = "zoom";
                if (this.rootBox instanceof WallBox)
                     (<WallBox>this.rootBox).setRenderedSideView(true);
                this.updateRootElement();
                this.sideview = true;
            }
        }
        public adjustForNormalView() {
            // DUAL-TODO: remove?
            if (this.sideview) {
                var rootelt = this.rootElement;
                rootelt.style.overflow = "";
                rootelt.style.msContentZooming = "";
                rootelt.scrollTop = 0;
                rootelt.scrollLeft = 0;
                rootelt.msContentZoomFactor = 1;
                if (this.rootBox instanceof WallBox)
                    (<WallBox>this.rootBox).setRenderedSideView(false);
                this.updateRootElement();
                this.sideview = false;
            }
        }


        //private static TestAndClear(): boolean {
        //    var n = needrelayout;
        //    needrelayout = false;
        //    return n;
        //}

        // typing activity - we use this to catch race behavior on keystrokes
        public lastbox_edited: string;
        public FlagTypingActivity(id: string) { this.lastbox_edited = id; }
        public ClearTypingActivity(id: string) { if (this.lastbox_edited === id) this.lastbox_edited = undefined; }
        public CheckTypingActivity(id: string) { return this.lastbox_edited === id; }


        static lazyInitCurrentRanderBox = () => {};
        static htmlTagName:string;
        static createOrRecycleContainerBoxDelayed(rt: Runtime, cur: BoxBase) {
            var pc = rt.getTopScriptPc();
            LayoutMgr.lazyInitCurrentRanderBox = () => {
                LayoutMgr.lazyInitCurrentRanderBox = () => {};
                var tag = LayoutMgr.htmlTagName || "div";
                LayoutMgr.htmlTagName = undefined;
                var w = WallBox.CreateOrRecycleContainerBox(rt, cur, pc, tag)
                LayoutMgr.currentbox = w;
            }
            LayoutMgr.currentbox = null;
        }

        static setHtmlTagName(name:string) {
            if (LayoutMgr.currentbox)
                Util.userError(lf("you cannot set the HTML tag name here"))
            LayoutMgr.htmlTagName = name;
        }


        static currentbox: BoxBase;
        static getCurrentRenderBox(): BoxBase {
            LayoutMgr.lazyInitCurrentRanderBox()
            return LayoutMgr.currentbox;
        }
        static setCurrentRenderBox(box: BoxBase) {
            LayoutMgr.lazyInitCurrentRanderBox()
            LayoutMgr.currentbox = box;
        }


        public findFirstBoxByNodeId(astNodeId: string): WallBox {
            if (!this.pcTable) return null;
            var box = this.pcTable[astNodeId];
            return box === undefined ? null : box;
        }

        public findAllBoxesByNodeId(astNodeId: string): WallBox[] {
            var boxes = [];
            if (this.boxes) this.boxes.forEach((box: WallBox) => {
                if (box.getAstNodeId() === astNodeId) boxes.push(box);
            });
            return boxes;
        }

        public findAllBoxesByPropertyNodeId(astNodeId: string): WallBox[] {
            var boxes = [];
            if (this.boxes) this.boxes.forEach((box: WallBox) => {
                var pcTable = box.pcTable;
                for (var propName in pcTable) {
                    if (pcTable[propName] === astNodeId) {
                        boxes.push(box);
                        break;
                    }
                }
            });
            return boxes;
        }

        public getSelectedBox(): BoxBase {
            return this.selectedBox;
        }

        public setCurrentId(astNodeId: string) {
            this.currentAstNodeId = astNodeId;
        }

        public getCurrentId(): string {
            return this.currentAstNodeId;
        }

        // GUI selection
        public selectBox(box: BoxBase): boolean {

            if (this.selectedBox !== null) {

                // Skip this box? (propagate to the parent box.)
                var parent: BoxBase = box;
                while (parent !== null) {
                    if (parent === this.selectedBox)
                        return false;
                    parent = <WallBox> parent.parent;
                }

                // Cancel previous selection.
                this.unselectBox();
            }

            // Clear other highlights
            if (this.currentAstNodeId)
                this.clearRelatedBoxes();

            // If the selected box is the root or a single child in a non-root box, cancel selection.
            if (!box || box.depth <= 0
                || (box.isSingleChild && box.isLeaf() && box.depth > 1))
                return false;

            this.selectedBox = box;
            this.highlightSelectedBox();

            //Util.log("box is selected" + box);

            // Show the menu.
            if (this.onBoxSelected)
                this.onBoxSelected();
            return true;
        }

        public showBoxMenu(cb: () =>void ) {
            var editButton = HTML.mkRoundButton("svg:edit,currentColor", lf("edit"), Ticks.wallEdit, () => {
                if (cb) cb();
            });
            this.boxMenu = div("wall-selected", [editButton]);
            this.refreshBoxMenu();
        }

        public refreshBoxMenu() {
            if (this.boxMenu !== null) {
                this.updateBoxMenuPosition();
                this.rootElement.appendChild(this.boxMenu);
                this.checkBoxMenuPosition();
            }
        }

        public hideBoxMenu() {
            if (this.boxMenu !== null) {
                Animation.fadeOut(this.boxMenu).begin();
                this.boxMenu = null;
            }
        }

        private updateBoxMenuPosition() {
            if (this.selectedBox === null || this.boxMenu === null)
                return;

            var box = this.selectedBox;
            var offset = Util.offsetIn(box.element, this.rootElement);

            var renderedScale = 1; // This is not 1 when the wall is scaled by transformation matrix.
            var viewWidth = this.rootElement.clientWidth, viewHeight = this.rootElement.clientHeight;
            var boxWidth = box.getRenderedWidth() * renderedScale, boxHeight = box.getRenderedHeight() * renderedScale;
            var viewLeft = offset.x * renderedScale, viewTop = offset.y * renderedScale;

            var margin = SizeMgr.topFontSize * 0.2;

            // Show it on the right side.
            if (viewLeft + boxWidth / 2 < viewWidth / 2) {
                this.boxMenu.style.right = "auto";
                this.boxMenu.style.left = (viewLeft + boxWidth + margin) + "px";
                // Show it on the left side.
            } else {
                this.boxMenu.style.left = "auto";
                this.boxMenu.style.right = (viewWidth - (viewLeft - margin)) + "px";
            }

            // Show it on the lower side.
            if (viewTop + boxHeight / 2 < viewHeight / 2) {
                this.boxMenu.style.bottom = "auto";
                this.boxMenu.style.top = viewTop + "px";
                // Show it on the upper side.
            } else {
                this.boxMenu.style.top = "auto";
                this.boxMenu.style.bottom = (viewHeight - (viewTop + boxHeight)) + "px";
            }
        }

        private checkBoxMenuPosition() {
            if (this.boxMenu === null)
                return;

            var box = this.selectedBox;
            var offset = Util.offsetIn(this.boxMenu, this.rootElement);

            var renderedScale = 1; // This is not 1 when the wall is scaled by transformation matrix.
            var viewWidth = this.rootElement.clientWidth, viewHeight = this.rootElement.clientHeight;
            var menuWidth = this.boxMenu.clientWidth * renderedScale, menuHeight = this.boxMenu.clientHeight * renderedScale;
            var viewLeft = offset.x * renderedScale - this.rootElement.scrollLeft, viewTop = offset.y * renderedScale - this.rootElement.scrollTop;
            var viewRight = viewLeft + menuWidth, viewBottom = viewTop + menuHeight;

            // Stick to the left edge.
            if (viewLeft < 0) {
                this.boxMenu.style.left = "0px";
                this.boxMenu.style.right = "auto";
                // Stick to the right edge.
            } else if (viewRight > viewWidth) {
                this.boxMenu.style.right = "0px";
                this.boxMenu.style.left = "auto";
            }

            // Stick to the top edge.
            if (viewTop < 0) {
                this.boxMenu.style.top = "0px";
                this.boxMenu.style.bottom = "auto";
                // Stick to the bottom edge.
            } else if (viewBottom > viewHeight) {
                this.boxMenu.style.bottom = "0px";
                this.boxMenu.style.top = "auto";
            }
        }

        public unselectBox() {
            if (this.selectedBox !== null) {
                this.findAllBoxesByNodeId(this.selectedBox.getAstNodeId())
                        .forEach((box: BoxBase) => {
                            box.clearHighlight();
                        });
                this.selectedBox = null;
                this.hideBoxMenu();
            }
        }

        public highlightSelectedBox() {
            if (this.selectedBox !== null) {
                this.selectedBox.setHighlight();
                this.scrollToShow(this.selectedBox);
                this.findAllBoxesByNodeId(this.selectedBox.getAstNodeId())
                        .forEach((box: WallBox) => {
                            if (this.selectedBox !== box)
                                box.setHighlight(false);
                        });
            }
        }

        public highlightRelatedBoxes() {
            if (this.selectedBox !== null)
                this.unselectBox();
            if (this.currentAstNodeId) {
                var firstBox = this.findFirstBoxByNodeId(this.currentAstNodeId);
                if (firstBox !== null) {
                    firstBox.setHighlight();
                     this.selectedBox = firstBox;
                }
                this.findAllBoxesByPropertyNodeId(this.currentAstNodeId)
                        .forEach((box: WallBox) => {
                            if (firstBox !== box)
                                box.setHighlight(false);
                        });
            }
        }

        private clearRelatedBoxes() {
            if (this.currentAstNodeId) {
                this.findAllBoxesByPropertyNodeId(this.currentAstNodeId)
                        .forEach((box: WallBox) => {
                            box.clearHighlight();
                        });
            }
            this.currentAstNodeId = "";
        }

        public updateslider: (zoom: number, adjustscroll: boolean) => void;

        public createZoomingUI(): HTMLElement {
            var scaleSpan = span(null, "");
            var scaleSliderCursor = div("cursor");
            var scaleSlider = div("slider", [scaleSliderCursor]);

            this.updateslider = (zoom: number, adjustscroll:boolean) => {
                var oldScale = this.scale;
                this.scale = Math.max(this.minimumScale, Math.min(zoom, this.maximumScale));
                scaleSliderCursor.style.top = "0";
                scaleSliderCursor.style.left = (scaleSlider.clientWidth - scaleSliderCursor.clientWidth)
                        * this.fromZoomToSliderValue(this.scale) + "px";
                scaleSpan.setChildren([Math.round(this.scale * 100).toString() + "%"]);
                if (adjustscroll) {
                    this.updateScaling(this.scale);
                    if (this.scrollTop !== undefined) {
                        // Zoom in the center part of the live view.
                        this.scrollTop = this.scrollTop * this.scale / oldScale + this.rootElement.offsetHeight / 2 * (this.scale / oldScale - 1);
                        this.scrollLeft = this.scrollLeft * this.scale / oldScale + this.rootElement.offsetWidth / 2 * (this.scale / oldScale - 1);
                        this.recoverScroll();
                    }
                }
            };

            new DragHandler(scaleSliderCursor, (e, dx, dy) => {
                var pos = Util.offsetIn(scaleSliderCursor, scaleSlider);
                var max = scaleSlider.clientWidth - scaleSliderCursor.clientWidth;
                this.updateslider(this.fromSliderValueToZoom(pos.x / max), true);
            });

            var zoomOutButton = HTML.mkButtonElt("wall-zoom-out", "-");
            zoomOutButton.withClick(() => {
                this.updateslider(this.scale * 0.9, true);
            });

            var zoomInButton = HTML.mkButtonElt("wall-zoom-in", "+");
            zoomInButton.withClick(() => {
                this.updateslider(this.scale * 1.1, true);
            });

            var ui = div("wall-zoom", scaleSpan, zoomOutButton, scaleSlider, zoomInButton);

            return ui
        }

        private fromSliderValueToZoom(value: number): number {
            return this.minimumScale * Math.exp(Math.log(this.maximumScale / this.minimumScale) * value);
        }

        private fromZoomToSliderValue(zoom: number): number {
            return this.minimumScale >= this.maximumScale ? 1 : Math.log(zoom / this.minimumScale) / Math.log(this.maximumScale / this.minimumScale);
        }


        public getRootElement() {
            return this.rootElement;
        }
        public getRootBox() {
            return this.rootBox;
        }

        public updateRootElement() {

            this.rootElement.setAttribute("livemode", this.editMode ? "true" : "false");
        }

        private calcDefaultScaling() {
            if (this.sideview) {
                if (this.scale === undefined || isNaN(this.scale)) {
                    var horizontalScale =
                            this.rootElement.offsetWidth / this.rootBox.element.offsetWidth;
                    var verticalScale =
                            this.rootElement.offsetHeight / this.rootBox.element.offsetHeight;
                    this.minimumScale = Math.min(horizontalScale, verticalScale) * 0.5;
                    this.maximumScale = this.minimumScale * 100;
                    var defaultScale = Math.max(horizontalScale, verticalScale);
                    this.scale = defaultScale;
                    this.updateScaling(this.scale);
                }
            }
            else {
                this.updateScaling(1);
            }
        }

        private updateScaling(scale: number) {
            if (this.sideview && this.rootElement.msContentZoomFactor) {
                Util.setTransform(this.rootBox.element, "scale(" + this.minimumScale*10 + ", " + this.minimumScale*10 + ")", "0% 0%");
                this.rootElement.msContentZoomFactor = scale / (this.minimumScale*10);
                this.rootElement.style.msContentZoomLimit = "10% 1000%";
            }
            else {
                Util.setTransform(this.rootBox.element, "scale(" + scale + ", " + scale + ")", "0% 0%");
            }
        }


        public scrollbarWidth: number = undefined;
        public scrollbarHeight: number = undefined;
        private FindScrollbarSizes(elt: HTMLElement) {
            if (this.scrollbarWidth === undefined) {
                var saved = elt.style.overflow || "";
                this.scrollbarWidth = elt.clientWidth;
                this.scrollbarHeight = elt.clientHeight;
                elt.style.overflow = "scroll";
                this.scrollbarWidth -= elt.clientWidth;
                this.scrollbarHeight -= elt.clientHeight;
                elt.style.overflow = saved;
            }
        }

        private recoverScroll() {
            if (this.sideview) {
                if (this.scrollTop !== undefined) {
                    this.rootElement.scrollTop = this.scrollTop;
                    this.rootElement.scrollLeft = this.scrollLeft;
                }
                //if (this.zoomfactor !== undefined)
                  //  this.rootElement.msContentZoomFactor = this.zoomfactor;
            }
        }

        public onScroll() {
            this.scrollTop = this.rootElement.scrollTop;
            this.scrollLeft = this.rootElement.scrollLeft;
            var zoomfactor = this.rootElement.msContentZoomFactor;
            if (zoomfactor)
                this.updateslider(zoomfactor * this.minimumScale * 10, false);
        }

       // public onZoom() {
       //
       // }


        private scrollToShow(box: BoxBase) {
            // TODO: Implement this.
        }

        public render(box: BoxBase, e: HTMLElement) {

            // "box" should be the root box.
            if (box === null
                    || (box.parent !== null && box.parent !== undefined)) {
                return;
            }

            this.rootElement = e; // div wall-page box-page
            this.rootBox = box;
            box.isRoot = true;


            // Prevent flickering.
            var el = box.element;
           // el.style.visibility = "hidden";

            // fix element structure if necessary
            if (this.rootElement.firstChild != el || ! this.rootBox.structuring_done) {
                this.CreateOrFixElementStructure();
            }

            // the core layout algorithm
            this.CoreLayout();


            //el.style.visibility = "visible";
        }

        public isOnScreen(node: HTMLElement):boolean {
            var top = document.documentElement;
            while (node) {
                if (node === top)
                    return true;
                if (node.style.display === "none")
                    return false;
                node = <HTMLElement>node.parentNode;
            }
            return false;
        }

        // the idempotent layout algorithm. Call this to recompute layout on non-structural changes.
        public CoreLayout(): void {

            if (this.rootBox instanceof HtmlBox) {
                // we are doing almost nothing, just set attributes
                this.rootBox.doLayout();
                return;
            }

            if (!this.isOnScreen(this.rootElement))
                return; // breaks if we are not on screen, because we need browser to tell us size of things

            Util.time("CoreLayout", () =>
            {
                //Util.log("start layout");

                // make sure we know the size of scroll bars
                this.FindScrollbarSizes(this.rootElement);

                // if this view is scaled (e.g. because of pinch-zoom), ensure scale is in place
                if (this.sideview && this.scale !== undefined && this.scale != 1)
                    this.updateScaling(this.scale);

                // the layout algorithm
                this.rootBox.doLayout();

                // redo layout if we misspeculated on vertical scrollbars
                if (this.rootBox instanceof WallBox && !(<WallBox> this.rootBox).speculationwascorrect(this.scrollspeculation)) {
                    this.scrollspeculation = !this.scrollspeculation;
                    this.rootBox.doLayout();
                }

                // Calculate default scaling

                this.calcDefaultScaling();

                if (this.sideview) {
                    this.recoverScroll();
                    this.updateslider(this.scale, true);
                }

                if (this.onRendered)
                    this.onRendered();

                // Util.log("end layout");
            },
            false);  // set to true to stop measuring
        }




        private CreateOrFixElementStructure() {
            this.boxes = [];
            this.pcTable = {};
            // Remove previous content unless recycled
            var e = this.rootElement;
            var el = this.rootBox.element;
            while (e.hasChildNodes()) {
                var b = e.firstChild;
                if (b == el)
                    break;
                e.removeChild(b);
            }
            while (e.hasChildNodes()) {
                var b = e.lastChild;
                if (b == el)
                    break;
                e.removeChild(b);
            }
            // recurse
            this.passS(this.rootBox);
            // don't do it again
            this.rootBox.structuring_done = true;
        }

        private passS(box: BoxBase) {
            if (box.doLiveNavigation()) {
                this.boxes.push(box);
                this.recordmapping(box);
            }
            box.visitS();
            for (var i = 0; i < box.children.length; i++)
                this.passS(box.children[i]);
        }



        /*
        private doLayout(rootBox: WallBox) {
            // Horizontal layout
            //  1. make box groups
            //  2. compute widths of leaf nodes without wrapping
            //  3. set widths if specified explicitly
            var bottomUpQueue = this.prepareHorizontalLayout(rootBox);
            //  4. make box lines
            //  5. for each line, distribute the rest horizontal space among springs
            this.calcHorizontalSprings(bottomUpQueue);
            // Vertical layout
            //  6. set heights if specified explicitly
            this.prepareVerticalLayout(rootBox);
            //  7. distribute the rest vertical space among springs
            this.calcVerticalSprings(bottomUpQueue);
        }
        */




        // Put this box in the database.
        public recordmapping(box: BoxBase) {
            if (this.pcTable[box.getAstNodeId()] === undefined)
                this.pcTable[box.getAstNodeId()] = box;
            for (var propName in box.pcTable)
                if (this.pcTable[box.pcTable[propName]] === undefined)
                    this.pcTable[box.pcTable[propName]] = box;
        }




    }

    export class WallPage {
        libName: string;
        pageName: string;
        drawFn: any;
        drawArgs: any[];
        topDown: boolean = false;
        buttons: IPageButton[];
        crashed = false;
        id = Random.uniqueId();
        csslayout: boolean = false;

        model:any; // the compile sticks stuff in here

        private element: HTMLElement;
        private rootBox: BoxBase;
        private currentBox: BoxBase;
        public lastChildCount = -1;
        private runtime: Runtime;
        private _rtPage: TDev.RT.Page;
        private auto: boolean;

        public title = "";
        public subtitle = "";
        public chromeVisible = true;
        public backButtonVisible = true;
        public fgColor = "#000000";
        public bgColor = "#ffffff";
        public bgPictureUrl: string;
        public bgPicture: HTMLElement;
        public bgPictureWidth:number;
        public bgPictureHeight:number;
        public bgVideo: HTMLVideoElement;
        public fullScreenElement: HTMLElement;
        public renderCount = 0;
        public onNavigatedFrom: RT.Event_ = new RT.Event_();

        constructor (rt: Runtime, auto:boolean) {
            this.runtime = rt;
            this.element = div("wall-page");
            this.buttons = [];
            this.auto = auto;
            this.onNavigatedFrom.isPageEvent = true;
            this.clear();
        }

        activate(): void {
            this.getElement().style.display = "block";
        }

        deactivate(): void {
            this.getElement().style.display = "none";
        }

        getElement(): HTMLElement { return this.element; }

        isAuto() { return this.auto; }

        public isReversed(): boolean { return this.topDown; }
        public setReversed(reversed: boolean) {
            if (this.topDown != reversed) {
                this.lastChildCount = -1;
                this.topDown = reversed;
            }
        }
        public rtPage() : TDev.RT.Page
        {
            if (!this._rtPage)
                this._rtPage = TDev.RT.Page.mk(this);
            return this._rtPage;
        }

        static applySizeUpdate(e: HTMLElement) {
            var walkHtml = (e: any) => {
                if (!e) return;
                if (e.updateSizes)
                    e.updateSizes();
                Util.childNodes(e).forEach(walkHtml)
            }
            walkHtml(e);
        }

        getFrame(prev: IStackFrame, ret: IContinuationFunction) {
            var rt = prev.rt;

            if (!this.isAuto()) {
                var frame: IStackFrame = <any>{};
                frame.previous = prev;
                frame.rt = prev.rt;
                frame.returnAddr = ret;
                frame.entryAddr = (s) => { return s.rt.leave() };
                return frame;
            }

            if (!this.drawFn) {
                var f = prev.rt.compiled.lookupLibPage(this.libName, this.pageName);
                this.drawFn = (prev, ret) => {
                    var newFrame = f(prev);
                    return newFrame.invoke.apply(null, (<any[]>[newFrame, ret]).concat(this.drawArgs));
                };
            }

            return this.drawFn(prev, ret);
        }

        refreshForNewScript() {
            this.drawFn = null;
            //this.element = div("wall-page"); NOOOO dont do this... it breaks incremental layout
        }

        getCurrentBox(): BoxBase {
           // Util.log("get current box" + this.currentBox.id);
            return this.currentBox;
        }

        setCurrentBox(box: BoxBase) {
            this.currentBox = box;
            //Util.log("set current box" + box.id);
        }

        setFullScreenElement(host: RuntimeHost, elt: HTMLElement) {
            this.fullScreenElement = elt;
            host.setFullScreenElement(elt);
        }

        clear() {
            this.rootBox = WallBox.CreateOrRecycleRoot(this.runtime, null); // null forces creation
            this.setCurrentBox(this.rootBox);
            this.lastChildCount = -1;
        }

        startrender() {
            this.renderCount++;
            this.rootBox = WallBox.CreateOrRecycleRoot(this.runtime, this.rootBox);
            this.setCurrentBox(this.rootBox);
            this.lastChildCount = -1;
        }


        render(host: RuntimeHost, popCount: number = 0) {
            Util.assertCode(popCount >= 0);

            var rootElt = this.getElement();

            var getElt = (b: WallBox) =>
            {
                return div("legacy-wall-box", b.getContent());
            }

            // always apply wall background, foreground colors,
            // ignoring picture/video background for now.

            rootElt.style.background = "none"; // see through to the real background as set in applyPageAttributes
            rootElt.style.color = this.fgColor;

            if (this.isAuto()) {    //if (this.rootBox.isGeneric()) {
                rootElt.className =  "wall-page " + (this.csslayout ? " html-page" : "box-page");
                this.setFullScreenElement(host, null);
                LayoutMgr.instance.render(this.rootBox, rootElt)
            } else {
                Util.assert(this.rootBox instanceof WallBox);

                var i = 0;
                var sz = (<WallBox>this.rootBox).size()

                var newElts = []

                if (sz > 0) {
                    var last = (<WallBox>this.rootBox).get(sz - 1);
                    if ((<WallBox>last).fullScreen) {
                        this.setFullScreenElement(host,div("wall-fullscreen", last.getContent()));
                        this.lastChildCount = -1;
                        return;
                    }
                }

                this.setFullScreenElement(host,null);
                rootElt.className = "wall-page classic-page";
                // push front boxes
                if (this.lastChildCount < 0) {
                    var children: WallBox[] = []
                    for (i = 0; i < sz; ++i)
                        children.push(<WallBox> (<WallBox>this.rootBox).get(this.isReversed() ? i : sz - i - 1))
                    rootElt.setChildren(children.map(getElt))
                    newElts = [rootElt]
                } else {
                    for (i = this.lastChildCount - popCount; i < sz; ++i) {
                        var ch = getElt(<WallBox> (<WallBox>this.rootBox).get(i))
                        newElts.push(ch)
                        if (this.isReversed()) {
                            rootElt.appendChild(ch)
                        } else {
                            var first = rootElt.firstChild;
                            if (!first)
                                rootElt.appendChild(ch)
                            else
                                rootElt.insertBefore(ch, first)
                        }
                    }
                    // incremental pop back boxes
                    for (var i = 0; i < popCount; ++i) {
                        if (this.isReversed()) {
                            var firstChild = rootElt.firstChild;
                            if (firstChild)
                                rootElt.removeChild(firstChild);
                        }
                        else {
                            var lastChild = rootElt.lastChild;
                            if (lastChild)
                                rootElt.removeChild(lastChild);
                        }
                    }
                }

                this.lastChildCount = sz;
                newElts.forEach(WallPage.applySizeUpdate)
            }
        }
    }

    export interface BoxBackgroundImage {
        url: string;
        size?: string;
        repeat?: string;
        attachment?:string;
        position?: string;
        origin?: string;
    }

    export class BoxAttributes {

        public tappedEvent: RT.Event_;
        //public editEvent: RT.Event_;
        public textEditingEvent: RT.Event_;

        constructor() {
            this.tappedEvent = this.mkEv();
            this.textEditingEvent = this.mkEv();
        }

        // abstract methods
        public applyToStyle(b: BoxBase) { Util.oops("must override"); }

        public mkEv() {
            var r = new RT.Event_();
            r.isPageEvent = true;
            return r;
        }

    }

    export class HtmlAttributes extends BoxAttributes {

        public classnames: string[];
        public styles: StringMap<string>;
        public attributes: StringMap<string>;

        public applyToStyle(b: BoxBase) {
            Util.assert(b instanceof HtmlBox);
            var bb = <HtmlBox> b;
            if (bb.element.nodeType == Node.ELEMENT_NODE) {
                bb.setRenderedClassnames(this.classnames);
                bb.setRenderedStyles(this.styles);
                bb.setRenderedAttributes(this.attributes);
            }
        }
    }

    export class LayoutAttributes extends BoxAttributes {

        public flow:number; // FLOW_HORIZONTAL, FLOW_VERTICAL, FLOW_OVERLAY
        public textalign: number; // TEXT_LEFT, TEXT_CENTER, TEXT_RIGHT, TEXT_JUSTIFY
        public fontSize: number;
        public fontWeight: string;
        public fontFamily: string;
        public background: string;
        public backgroundImages: BoxBackgroundImage[];
        public foreground: string;
        public border: string;

        public width: number[]; // width[MIN], width[MAX]
        public height: number[]; // height[MIN], height[MAX]
        public margin: number[]; // margin[T], margin[R], margin[B], margin[L]
        public padding: number[]; // padding[T], padding[R], padding[B], padding[L]
        public borderwidth: number[];
        public stretchwidth: number;  // -1 (auto) 0 (no stretching) >0 (stretch weight)
        public stretchheight: number;  // -1 (auto) 0 (no stretching) >0 (stretch weight)
        public stretchmargin: number[]; // [T,R,B,L] each being 0 (no stretching) or >0 (stretch weight)
        public scroll: boolean[]; // [H,V]
        public arrangement: number[]; // [H,V]
        public wrap: boolean;
        public wraplimit: number;

        // for compatibility with old API
        public legacystretch: boolean[];
        public legacybaseline: boolean;

        public textEditedEvent: RT.Event_;


        constructor(isroot: boolean) {
            super();
             // Set to the default values
            this.flow = WallBox.FLOW_VERTICAL;
            //this.textalign = undefined;
            this.fontSize = 0;
            //this.fontWeight = undefined;
            this.fontFamily = "";
            this.background = "transparent";
            //this.foreground = undefined;
            //this.border = undefined;

            this.width = [0, Infinity];
            this.height = [0, Infinity];
            this.margin = [0, 0, 0, 0];
            this.padding = [0, 0, 0, 0];
            this.stretchwidth = -1;
            this.stretchheight = -1;
            this.stretchmargin = [0, 0, 0, 0];
            this.borderwidth = [0, 0, 0, 0];
            this.arrangement = [undefined, WallBox.ARRANGE_BASELINE];

            this.scroll = [isroot, isroot];
            this.legacystretch = [false, false];
            this.legacybaseline = true;
            this.wrap = undefined;
            this.wraplimit = 15;

            this.textEditedEvent = this.mkEv();
        }

        public applyToStyle(b: WallBox) {
            b.setRenderedPositionMode("absolute");
            b.setRenderedTextAlign(this.textalign);
            b.setRenderedBackgroundColor(this.background);
            b.setRenderedBackgroundImages(this.backgroundImages);
            b.setRenderedColor(this.foreground);
            b.setRenderedFontWeight(this.fontWeight);
            b.setRenderedFontFamily(this.fontFamily);
            b.setRenderedFontSize(this.fontSize);
            b.setRenderedWrap(this.wrap, this.wraplimit);
            b.setRenderedBorder(this.border, this.borderwidth);
        }

    }

    export class BoxBase {

        // structural info
        public id: number;
        public depth: number;
        private astNodeId: string;
        public isRoot: boolean;
        public parent: BoxBase;
        public obsolete = false;

        // attributes and children
        public attributes: BoxAttributes;
        public children: BoxBase[];

        // reuse of boxes
        public recycled = false;
        private prevchildren: BoxBase[];
        private reuseindex = 0;
        private reusekey: any;
        private reuseversion: number;
        private replaces: BoxBase;

        // content
        private fresh = true;
        public element: HTMLElement;

        // other
        public runtime: Runtime;
        public pcTable: any;
        public structuring_done = false;
        public isSingleChild = false;
        layoutcompletehandler: (width: number, height: number) => void;
        public delayedlayout = false;

        constructor(rt: Runtime, parent: BoxBase, nodeId: string) {
            this.runtime = rt;
            this.id = LayoutMgr.instance.numBoxes++;
            this.astNodeId = nodeId;
            this.isRoot = false;

            this.parent = parent;
            if (this.parent) {
                this.parent.children.push(this);
                this.depth = this.parent.depth + 1;
            } else {
                this.depth = 0;
            }

            this.children = [];
            this.pcTable = { "": this.astNodeId };
        }

        // for leaf boxes - overridden
        public getContent(): HTMLElement { return undefined; }
        public setContent(e: any) { }
        public RefreshOnScreen(): void { }
        public SwapImageContent(newcontent: HTMLElement): void { }
        public hookContent(): void { }

        public mayReplaceWith(tagname?: string): boolean { return false; } // overridden
        public isLeaf(): boolean { return false } // overridden

        // for live navigation
        public doLiveNavigation(): boolean { return true; }
        public getRenderedWidth(): number { return 0; } // overridden
        public getRenderedHeight(): number { return 0; } // overridden
        public setHighlight(strong: boolean = true) { }// overridden
        public clearHighlight() { }// overridden


        public Obsolete() {
            this.obsolete = true;
            this.children.forEach(c => c.Obsolete());
        }

        public getAstNodeId(): string { return this.astNodeId; }

        // We don't use this since it fails when the default value for a method parameter is set.
        // (Strada compiler hides the callee name.)
        private onFunctionCall(f: (any) => any, pc: string) {
            var functionNames = f.toString().match(/function ([^\(]+)/);
            if (functionNames !== null) {
                var functionName = functionNames[1];
                this.onCall(functionName, pc);
            }
        }

        public onCall(fName: string, pc: string) {
            if (!pc) return;
            this.pcTable[fName] = pc;
        }


        // ---------------  tap events

        tapped() {

            var done = false;
            if (LayoutMgr.instance.editMode) { // live navigation
                if (LayoutMgr.instance.selectBox(this))
                    done = true;
            } else {

                if (this.obsolete || (this.runtime.eventQ && !this.runtime.eventQ.viewIsCurrent()))
                    return; // box may have been deleted or not reflect proper action

                if (this.attributes.tappedEvent.handlers) {
                    done = true;
                    this.setRenderedTappable(true, true);
                    this.runtime.queueLocalEvent(this.attributes.tappedEvent);
                    this.runtime.forcePageRefresh();
                }
                else if (this.contenttapapplies()) {
                    this.contenttaphandler();
                    done = true;
                }
            }

            if (LayoutMgr.instance.editMode || this instanceof WallBox) // bubble up tap events
               if (!done && this.parent)
                  this.parent.tapped();
        }

        // click handlers that are installed by posted content
        private contenttaphandler: () => void;
        public withClick(h: () => void): void {
            this.contenttaphandler = h;
        }
        public contenttapapplies(): boolean {
            return this.contenttaphandler && !this.attributes.tappedEvent.handlers && !(this.isSingleChild && this.parent.attributes.tappedEvent.handlers);
        }

        // overridden by WallBox - creates grey shadow
        setRenderedTappable(tappable: boolean, tapped: boolean) { }





        // ---------- editable text binding

        private inputversions = new Array<string>();
        private lastqueuededit: RT.Event_;
        static debuginput: boolean = false;

        public bindEditableText(s: string, handler: any /* RT.TextAction or Ref<string> */, pc: string)
        {
            this.addTextEditHandler(handler);
            this.setInputText(s);
            this.onCall("binding", pc);
        }

        private addTextEditHandler(handler: any /* RT.TextAction or Ref<string> */) {
            if (handler instanceof RT.Ref) {
                this.attributes.textEditingEvent.addHandler(new RT.PseudoAction((rt: Runtime, args: any[]) => {
                    (<RT.Ref<string>> handler)._set(args[0], rt.current);
                    rt.forcePageRefresh();
                }));
            }
            else // RT.TextAction
                this.attributes.textEditingEvent.addHandler(handler);
        }

        // virtual methods (these are specific to HtmlBox bs. LayoutBox)
        public getEditableContent(): string { Util.oops("virtual");  return undefined; }
        public setEditableContent(s: string) {   Util.oops("virtual");  }
        public invalidateCachedLayout(triggerdelayedrelayout: boolean) { }

        onInputTextChange() {

            if (LayoutMgr.instance.editMode)
                return;  // don't do anything in edit mode

            var text = this.getEditableContent();

            if (this.obsolete)
                return; // box may be already gone from screen


            if (this.inputversions.length === 3)
                this.inputversions.pop(); // never keep more than 3 versions
            if (this.inputversions[this.inputversions.length - 1] === text) {
                if (WallBox.debuginput) Util.log("&&&" + this.id + "                 flag \"" + this.inputversions + "\"");
                LayoutMgr.instance.FlagTypingActivity("i" + this.id); // for catching race
                return; // already being processed
            }
            this.inputversions.push(text);
            if (WallBox.debuginput) Util.log("&&&" + this.id + "                 push \"" + this.inputversions + "\"");
            var parent = this.parent;
            if (this.attributes.textEditingEvent.handlers) {
                this.invalidateCachedLayout(false);
                if (this.inputversions.length >= 2) {
                    this.runtime.queueLocalEvent(this.lastqueuededit = this.attributes.textEditingEvent, [this.inputversions[1]]);
                    this.runtime.forcePageRefresh();
                }
            }
            else {
                // no need for full refresh... just do a delayed relayout
                this.invalidateCachedLayout(true);
            }

        }

        setInputText(text: string) {

            var cur = this.getEditableContent();
            var requeue = false;

            if (text === this.inputversions[1]) {
                this.inputversions.shift(); // prune history
                if (WallBox.debuginput) Util.log("&&&" + this.id + "                 prune \"" + this.inputversions + "\"");
                // record additional changes
                if (text !== cur) {
                    this.inputversions[1] = cur;
                    requeue = true;
                }
            } else if (this.inputversions.length === 1 && text != cur && LayoutMgr.instance.CheckTypingActivity("i" + this.id)) {
                this.inputversions = [text, cur]; // skip the version by changing the event argument
                LayoutMgr.instance.ClearTypingActivity("i" + this.id);
                if (WallBox.debuginput) Util.log("&&&" + this.id + "                 skip \"" + this.inputversions + "\"");
                requeue = true;
            }
            //else if (text === this.inputversions[0] && this.lastqueuededit && this.lastqueuededit.inQueue) {
            // an update event is pending
            //Util.oops("should not refresh screen while page events are pending");
            //if (WallBox.debuginput) Util.log("&&&" + this.id + "                 wait \"" + this.inputversions + "\"");
            //}
            else {
                this.inputversions = [text]; // start new history, discard intermediate versions
                this.lastqueuededit = undefined;
                if (WallBox.debuginput) Util.log("&&&" + this.id + "                 set \"" + this.inputversions + "\"");
            }


            if (this.inputversions.length == 1) {
                // the current version is final - write it back
                if (text !== cur) {
                    this.setEditableContent(text);
                    this.invalidateCachedLayout(false);
                }
                LayoutMgr.instance.ClearTypingActivity("i" + this.id);
            }
            else if (this.inputversions.length == 2 && requeue) {
                // there were more edits since the last edit event -- requeue
                if (this.attributes.textEditingEvent.handlers) {
                    if (WallBox.debuginput) Util.log("&&&" + this.id + "                 requeue \"" + this.inputversions + "\"");
                    this.runtime.queueLocalEvent(this.lastqueuededit = this.attributes.textEditingEvent, [this.inputversions[1]]);
                    //this.runtime.forcePageRefresh();
                }
            }
        }


        // ----------- online tree diffing

        public static CreateOrRecycleRoot(rt: Runtime, p: BoxBase): BoxBase {
            var cssmode = rt.onCssPage();
            if (LayoutMgr.RenderExecutionMode()
                && p && (cssmode == p instanceof HtmlBox)) {
                return p.recycle(rt, null, "", rt.onCssPage());
            }
            else {
                return cssmode ? (<BoxBase> new HtmlBox(rt, null, "", "div")) : (<BoxBase> new WallBox(rt, null, ""));
            }
        }

        public static CreateOrRecycleContainerBox(rt: Runtime, cur: BoxBase, pc, tagName?:string):BoxBase {
            var candidate = null;
            if (LayoutMgr.RenderExecutionMode()
                && cur.recycled
                && cur.reuseindex < cur.prevchildren.length) {
                candidate = cur.prevchildren[cur.reuseindex];
                cur.reuseindex = cur.reuseindex + 1;
                if (candidate.mayReplaceWith(tagName))
                    return candidate.recycle(rt, cur, pc, rt.onCssPage());
            }
            var box = rt.onCssPage() ? <BoxBase>new HtmlBox(rt, cur, pc, tagName) : <BoxBase>new WallBox(rt, cur, pc);
            box.replaces = candidate;
            return box;
        }

        public static CreateOrRecycleLeafBox(rt: Runtime, val: any): BoxBase {
            var cur = rt.getCurrentBoxBase(true);
            var candidate = null;
            var pc = rt.getTopScriptPc();
            if (LayoutMgr.RenderExecutionMode()
                && cur.recycled
                && cur.reuseindex < cur.prevchildren.length) {
                candidate = cur.prevchildren[cur.reuseindex];
                cur.reuseindex = cur.reuseindex + 1;
                if (val !== null && candidate.content && candidate.reusekey === val
                    && (!candidate.reuseversion ||  (candidate.reuseversion === (<RT.RTValue>val).versioncounter))) {
                    return candidate.recycle(rt, cur, pc, rt.onCssPage());
                }
            }
            var cssmode = rt.onCssPage()
            var box = rt.onCssPage() ? <BoxBase>new HtmlBox(rt, cur, pc) : <BoxBase>new WallBox(rt, cur, pc);
            box.reusekey = val;
            box.reuseversion = val && val.versioncounter;
            box.replaces = candidate;
            return box;
        }

        public recycle(rt: Runtime, parent: BoxBase, nodeId: string, cssmode: boolean): BoxBase {
            Util.assert(!!cssmode === (this instanceof HtmlBox), "mixed up boxes");
            this.runtime = rt;
            this.parent = parent;
            this.astNodeId = nodeId;

            if (this.parent) {
                this.parent.children.push(this);
                Util.assert(this.depth === this.parent.depth + 1);
            } else {
                Util.assert(this.depth === 0);
            }

            this.recycled = true;
            this.structuring_done = false;
            this.prevchildren = this.children;
            this.reuseindex = 0;

            this.children = [];
            this.attributes = cssmode ? new HtmlAttributes() : new LayoutAttributes(this.depth == 0);
            this.pcTable = { "": this.astNodeId };

            return this;
        }

        // ----------- tree traversals

        public doLayout() { /*overridden*/  }

        public visitS() {

            // remove deleted children
            if (this.recycled) {
                for (var i = this.children.length; i < this.prevchildren.length; i++) {
                    var b = this.prevchildren[i];
                    b.Obsolete();
                    this.element.removeChild(b.element);
                }
            }

            // add to parent if fresh, or replace
            var p = this.parent;
            if (this.fresh || (p && !p.recycled)) {

                // add into parent container
                if (p) {
                    if (this.replaces) {
                        this.replaces.Obsolete();
                        p.element.replaceChild(this.element, this.replaces.element);
                        this.replaces = null;
                    }
                    else {
                        p.element.appendChild(this.element);
                    }
                }
                else {
                    Util.assert(this.isRoot);
                    LayoutMgr.instance.rootElement.appendChild(this.element);
                    LayoutMgr.instance.rootElement.onscroll = (e: Event) => { LayoutMgr.instance.onScroll(); };
                    //LayoutMgr.instance.rootElement.onzoom = (e: Event) => { LayoutMgr.instance.onZoom(); };
                }

                // set content, if fresh
                if (this.fresh) {
                    this.hookContent();
                    this.fresh = false;
                }

            }
        }


        public visitI() {

            this.attributes.applyToStyle(this);

        }
    }

    export class HtmlBox extends BoxBase {

        // specialize types
        public attributes: HtmlAttributes;

        public tagName: string;
        public isLeaf(): boolean {
            return !this.tagName;
        }


        constructor(rt: Runtime, parent: BoxBase, nodeId: string, tagName?: string) {

            super(rt, parent, nodeId);
            if (parent)
                Util.assert(parent instanceof HtmlBox);

            this.attributes = new HtmlAttributes();

            if (tagName !== undefined) {

                this.tagName = tagName;

                if (tagName && !HTML.allowedTagName(tagName))
                    Util.userError(lf("tag name {0} is not allowed", tagName))

                this.element = document.createElement(tagName);
                this.element.id = this.id.toString();

                this.attributes.applyToStyle(this);
            }
        }

        public mayReplaceWith(tagName?: string): boolean {
            return (this.tagName === tagName);
        }

        public doLiveNavigation(): boolean { return !!this.tagName; }

        public setContent(e: any) {
            Util.check(this.isLeaf());
            Util.check(e != null);
            this.element = e;
            this.attributes.applyToStyle(this);
        }
        public getContent() {
            return this.element;
        }
        public RefreshOnScreen(): void {
            // no action needed.. html layout is always on
        }
        public invalidateCachedLayout(triggerdelayedrelayout: boolean) {
            // no action needed... html layout is always on
        }

        public withClick(h: () => void): void {
            //todo
        }

        public getRenderedWidth(): number { return this.element.clientWidth; }
        public getRenderedHeight(): number { return this.element.clientHeight; }


        public getEditableContent(): string {
            return (<any>this.element).value;

            // return this.textarea ? (<HTMLTextAreaElement>this.content).value : (<HTMLInputElement>this.content).value
        }
        public setEditableContent(text: string) {
            (<any>this.element).value = text;
            // if (this.textarea)
            //     (<HTMLTextAreaElement>this.content).value = text;
            // else
            //     (<HTMLInputElement>this.content).value = text;
        }

        public hookContent() {
            var tag = this.element && this.element.tagName;
            if (tag) {
                this.element.withClick(() => { this.tapped() });
                if (/input|textarea/i.test(tag))
                    this.element.oninput = (e: Event) => { this.onInputTextChange(); };
            }
        }

        public SwapImageContent(newcontent: HTMLElement): void {
            var p = this.element.parentNode;
            if (p)
                p.replaceChild(newcontent, this.element);
            this.element = newcontent;
        }

        public setHighlight(strong: boolean = true) {
            if (this.element && this.element.style) {
                this.element.style.border = strong ? "5px dotted #C00" : "5px dotted #rgba(204, 0, 0, 0.6)";
                if (!strong)
                    this.element.style.background = "rgba(204, 0, 0, 0.4)";
            }
        }
        public clearHighlight() {
            this.element.style.cssText = this.rendered_styles;
        }


        public doLayout() {
            this.passA();
        }
        private passA() {
            this.visitI();
            for (var i = 0; i < this.children.length; i++) {
                (<HtmlBox>this.children[i]).passA();
            }
        }

       public addClassName(s: string, pc = "") {
           if (!this.attributes.classnames) this.attributes.classnames = [];
           this.attributes.classnames.push(s);
           this.onCall("class name", pc);
       }
        public setAttribute(name: string, value: string, pc = "") {
            if (!this.attributes.attributes) this.attributes.attributes = {};
            this.attributes.attributes[name] = value;
            this.onCall("attr:" + name, pc);
        }
        public setStyle(property: string, value:string, pc = "") {
            if (!this.attributes.styles) this.attributes.styles = {};
            this.attributes.styles[property] = value;
            this.onCall("style:" + property, pc);
        }

        private rendered_classnames: string;
        private rendered_styles: string;
        private rendered_attributes: string;

        setRenderedClassnames(names: string[]) {
            var cmp = (names && names.length > 0) ? names.join(' ') : '';
            if (cmp !== this.rendered_classnames) {
                if (cmp) this.element.className = cmp;
                else this.element.removeAttribute("class");
                this.rendered_classnames = cmp;
            }
        }
        setRenderedStyles(styles: StringMap<string>) {
            var s = styles ? Object.keys(styles).map(k => k + ": " + styles[k]).join("; ") : "";
            if (s !== this.rendered_styles) {
                this.element.style.cssText = s;
                this.rendered_styles = s;
            }
        }
        setRenderedAttributes(attributes: StringMap<string>) {
            var s = JSON.stringify(attributes);
            if (s !== this.rendered_attributes) {
                var prev = JSON.parse(this.rendered_attributes || "{}");
                // set new keys
                Object.keys(attributes).forEach(k => {
                    this.element.setAttribute(k, attributes[k]);
                    delete prev[k];
                });
                // remove keys that weren't overrideen
                Object.keys(prev).forEach(k => this.element.removeAttribute(k));
                // store new set of attributes
                this.rendered_attributes = s;
            }
        }
    }

    export class WallBox extends BoxBase {

        // specialize types
        public attributes: LayoutAttributes;

        // Constants
        static FLOW_HORIZONTAL: number = 0;
        static FLOW_VERTICAL: number = 1;
        static FLOW_OVERLAY: number = 2;

        static STRETCH_AUTO: number = -1;

        static ARRANGE_LEFT: number = 1;
        static ARRANGE_RIGHT: number = 2;
        static ARRANGE_CENTER: number = 3;
        static ARRANGE_JUSTIFY: number = 4;
        static ARRANGE_BASELINE: number = 5;
        static ARRANGE_TOP: number = 6;
        static ARRANGE_BOTTOM: number = 7;
        static ARRANGE_SPREAD: number = 8;

        static MIN: number = 0;
        static MAX: number = 1;

        static T: number = 0;
        static R: number = 1;
        static B: number = 2;
        static L: number = 3;

        static H: number = 0;
        static V: number = 1;

        static CONTENT_NONE: number = -1;
        static CONTENT_TEXT: number = 0;
        static CONTENT_IMAGE: number = 1;
        static CONTENT_INPUT: number = 2;


        // cached size info
        private cached_width = -1;   // the natural (full) width of the element
        private cached_height = -1;  // the natural height of the element, for the given cached_width
        private cached_baseline = -1;    // the baseline of this element
        private cached_aspectratio = 0;  // width / height, or zero if this element does not use a ratio

        // New layout algorithm
        private A_m: number; // requested minwidth
        private A_as: number;// requested alt width
        private A_s: number; // requested width
        private A_sl: number;// requested left margin
        private A_sr: number;// requested right margin
        private A_mc: number;// computed minwidth
        private A_asc: number;// computed alt width
        private A_sc: number;// computed width
        private A_scc: number;// computed width for content
        private A_fcc: number;// computed fill count for content
        private A_fcs: number;// computed fill count for spaces
        private A_f: number; // requested fill width for content
        private A_fl: number;// requested left margin fill
        private A_fr: number;// requested right margin fill
        private A_fp: number; // requested fill propagation
        private A_scr: number; // space needed for scrollbar
        private B_s: number; // granted width
        private B_x: number; // computed x coordinate of box
        private B_scr: boolean; // scrolling
        private C_m: number; // requested minheight
        private C_s: number; // requested height
        private C_st: number;// requested top margin
        private C_sb: number;// requested bottom margin
        private C_sc: number;// computed height
        private C_scc: number;// computed height for content
        private C_fcc: number;// computed fill count for content
        private C_fcs: number; // computed fill count for spaces
        private C_mc: number; // requested minheight
        private C_f: number; // requested fill height
        private C_ft: number;// requested top margin fill
        private C_fb: number;// requested bottom margin fill
        private C_fp: number;// requested fill propagation
        private C_scr: number; // space needed for scrollbar
        private C_zc: number; // number of z positions needed
        private C_bc: number; // computed baseline
        private C_b: number; // reported baseline
        private D_s: number; // granted height
        private D_y: number; // computed y coordinate of box
        private D_scr: boolean; // scrolling
        private D_z: number; // zrange
        private D_zmax: number; // zrange
        private D_b: number; // baseline

        // Fields that are computed and set during the layouting.
        private rendered_x: number;
        private rendered_y: number;
        private rendered_width: number;
        private rendered_height: number;
        private rendered_hmode: string;
        private rendered_vmode: string;
        private rendered_b: number;
        private rendered_fontfamily: string;
        private rendered_fontweight: string;
        private rendered_fontsize: number;
        private rendered_textalign: number;
        private rendered_foregroundcolor: string;
        private rendered_backgroundcolor: string;
        private rendered_background: string;
        private rendered_wrap: boolean;
        private rendered_wraplimit: number;
        private rendered_zindex: number;
        private rendered_border: string;
        private rendered_borderwidth: number[];
        private rendered_sideview: boolean;
        private rendered_tappable: string;
        private rendered_positionmode: string;

        // content
        private contentType: number;
        private content: HTMLElement;
        private auxcontent: HTMLElement;
        private baselineprobe: HTMLElement;
        public textarea: boolean;

        //other
        public fullScreen: boolean;


        constructor (rt: Runtime, parent: BoxBase, nodeId: string) {
            super(rt, parent, nodeId);

            if (parent)
               Util.assert(parent instanceof WallBox);

            this.attributes = new LayoutAttributes(this.depth == 0);

            this.contentType = WallBox.CONTENT_NONE;
            this.content = null;
            this.element = document.createElement("div");
            this.element.id = this.id.toString();
            this.element.withClick(() => { this.tapped() });
            this.attributes.applyToStyle(this);
        }

        public mayReplaceWith(tagname?: string): boolean {
            return (tagname === "div" && this.content === null && this.contentType === WallBox.CONTENT_NONE);
            }
        public isLeaf(): boolean {
            return this.contentType != WallBox.CONTENT_NONE;
        }

        public RefreshOnScreen(): void {
            if (this.contentType == WallBox.CONTENT_NONE)
                return; // too early... content not set yet
            Util.assert(this.contentType == WallBox.CONTENT_IMAGE);
            this.cached_height = -1;
            this.cached_width = -1;
            LayoutMgr.QueueReLayout();

        }

         public SwapImageContent(newcontent: HTMLElement):void {
            Util.assert(this.contentType == WallBox.CONTENT_IMAGE);
            this.element.removeAllChildren();
            this.element.appendChild(newcontent);
            this.content = newcontent;
            this.cached_height = -1;
            this.cached_width = -1;
            LayoutMgr.QueueReLayout();
        }

        public hookContent(): void {
            if (this.content && this.content !== this.element) {
                var e = this.element;
                if (this.contentType === WallBox.CONTENT_TEXT) {

                } else if (this.contentType === WallBox.CONTENT_INPUT) {
                    //this.content.onkeyup = (e: Event) => {
                    //    this.onInputTextChange();
                    //};
                    this.content.oninput = (e: Event) => {
                        this.onInputTextChange();
                    };
                    this.content.onchange = (e: Event) => {
                        this.onInputTextChangeDone();
                    };
                    this.content.onclick = (e: Event) => {
                        if (LayoutMgr.instance.editMode) {
                            this.tapped();
                        } else {
                            if (this.attributes.tappedEvent.handlers) {
                                this.runtime.queueLocalEvent(this.attributes.tappedEvent);
                            }
                        }
                    };
                }
                if (this.auxcontent)
                    e.appendChild(this.auxcontent);
                e.appendChild(this.content);
            }
        }

        public setHighlight(strong: boolean = true) {
            this.element.style.zIndex = strong ? "2" : "1";
            this.element.setAttribute("sel", strong ? "strong" : "weak");
        }

        public clearHighlight() {
            this.element.setAttribute("sel", "");
            this.element.style.zIndex = "auto";
        }

        public visitI() {
                if (!this.isRoot) {

                    //this.rendered_x = undefined;
                    //this.rendered_y = undefined;
                    //this.rendered_width = undefined;
                    // this.rendered_height = undefined;
                    //this.rendered_hscrollbar = false;
                    //this.rendered_vscrollbar = false;

                    // set fontfamily and fontsize if they were not specified
                    if (this.getFontFamily() === "")
                    this.setFontFamily((<WallBox> this.parent).getFontFamily());
                    if (this.getFontSize() <= 0)
                    this.setFontSize((<WallBox> this.parent).getFontSize());

                    // set wrapping if this a multiline input and it was not specified


                } else {
                    // Calculate size of the wall
                    var width = this.runtime.host.fullWallWidth();
                    var height = this.runtime.host.userWallHeight();

                    // restore full element size (not sure if needed)
                    this.setRenderedWidth(width);
                    this.setRenderedHeight(height);

                    // overrides any user-specified sizes... they are meaningless for root box
                    //this.setWidth(width);
                    // this.setHeight(height);

                    // set fontfamily and fontsize if they were not specified
                    if (this.getFontFamily() === "")
                        this.setFontFamily('"Segoe UI", "Segoe WP", "Helvetica Neue", Sans-Serif')
                if (this.getFontSize() <= 0)
                        this.setFontSize(SizeMgr.topFontSize);
                }


                // determine if this is a single child
            var parent = this.parent;
                if (parent && parent.children.length === 1)
                    this.isSingleChild = true;


                // leaf boxes get some attributes from parent
                if (this.contentType == WallBox.CONTENT_TEXT) {
                var parentattributes = <LayoutAttributes> (parent.attributes);
                (<LayoutAttributes>this.attributes).textalign = parentattributes.textalign;
                this.attributes.wrap = parentattributes.wrap;
                this.attributes.wraplimit = parentattributes.wraplimit;
                }
                if (this.contentType == WallBox.CONTENT_INPUT) {
                var parentattributes = <LayoutAttributes> (parent.attributes);
                    this.attributes.textalign = WallBox.ARRANGE_LEFT; // this is the only thing that works on input boxes
                this.attributes.wrap = this.textarea ? (parentattributes.wrap === undefined ? true : parentattributes.wrap) : false;
                this.attributes.wraplimit = parentattributes.wraplimit;

                }
                if (this.contentType == WallBox.CONTENT_IMAGE) {
                var parentattributes = <LayoutAttributes> (parent.attributes);
                this.attributes.textalign = parentattributes.textalign;
                this.attributes.width = parentattributes.width;
                this.attributes.height = parentattributes.height;
                if (parentattributes.stretchwidth !== -1) this.attributes.stretchwidth = parentattributes.stretchwidth; // influences min width
                if (parentattributes.stretchheight !== -1) this.attributes.stretchheight = parentattributes.stretchheight;
                this.attributes.wrap = parentattributes.wrap;
                this.attributes.wraplimit = parentattributes.wraplimit;
                }

                var numchildren = this.children.length;

                // arrangement sets stretch margins
                var harr = this.attributes.arrangement[WallBox.H];
                if (harr !== undefined) {
                    if (this.attributes.flow !== WallBox.FLOW_HORIZONTAL) {
                        for (var i = 0; i < numchildren; i++) {
                        var child = <WallBox> this.children[i];
                            child.attributes.stretchmargin[WallBox.L] = (harr == WallBox.ARRANGE_RIGHT || harr == WallBox.ARRANGE_CENTER || harr == WallBox.ARRANGE_SPREAD) ? 1 : 0;
                            child.attributes.stretchmargin[WallBox.R] = (harr == WallBox.ARRANGE_LEFT || harr == WallBox.ARRANGE_CENTER || harr == WallBox.ARRANGE_SPREAD) ? 1 : 0;
                        }
                    }
                    else {
                        for (var i = 0; i < numchildren; i++) {
                        var child = <WallBox> this.children[i];
                            child.attributes.stretchmargin[WallBox.L] = (harr == WallBox.ARRANGE_SPREAD ||
                            (i == 0 ? (harr == WallBox.ARRANGE_RIGHT || harr == WallBox.ARRANGE_CENTER) : (harr == WallBox.ARRANGE_JUSTIFY))) ? 1 : 0;
                            child.attributes.stretchmargin[WallBox.R] = (harr == WallBox.ARRANGE_SPREAD ||
                            (i == (numchildren - 1) ? (harr == WallBox.ARRANGE_LEFT || harr == WallBox.ARRANGE_CENTER) : (harr == WallBox.ARRANGE_JUSTIFY || harr == WallBox.ARRANGE_CENTER))) ? 1 : 0;
                        }
                        //if (this.attributes.stretchwidth === -1 && (harr == WallBox.ARRANGE_LEFT || harr === WallBox.ARRANGE_RIGHT || harr === WallBox.ARRANGE_CENTER))
                        //    this.attributes.stretchwidth = 1;
                    }
                }
                var varr = this.attributes.arrangement[WallBox.V];
                if (varr !== WallBox.ARRANGE_BASELINE) {
                    if (this.attributes.flow !== WallBox.FLOW_VERTICAL) {
                        for (var i = 0; i < numchildren; i++) {
                        var child = <WallBox> this.children[i];
                            child.attributes.stretchmargin[WallBox.T] = (varr == WallBox.ARRANGE_BOTTOM || varr == WallBox.ARRANGE_CENTER || varr == WallBox.ARRANGE_SPREAD) ? 1 : 0;
                            child.attributes.stretchmargin[WallBox.B] = (varr == WallBox.ARRANGE_TOP || varr == WallBox.ARRANGE_CENTER || varr == WallBox.ARRANGE_SPREAD) ? 1 : 0;
                        }
                    }
                    else {
                        for (var i = 0; i < numchildren; i++) {
                        var child = <WallBox> this.children[i];
                            child.attributes.stretchmargin[WallBox.T] = (varr == WallBox.ARRANGE_SPREAD ||
                            (i == 0 ? (varr == WallBox.ARRANGE_BOTTOM || varr == WallBox.ARRANGE_CENTER) : (varr == WallBox.ARRANGE_JUSTIFY))) ? 1 : 0;
                            child.attributes.stretchmargin[WallBox.B] = (varr == WallBox.ARRANGE_SPREAD ||
                            (i == (numchildren - 1) ? (varr == WallBox.ARRANGE_TOP || varr == WallBox.ARRANGE_CENTER) : (varr == WallBox.ARRANGE_JUSTIFY))) ? 1 : 0;
                        }
                        // if (this.attributes.stretchheight === -1 && (varr == WallBox.ARRANGE_TOP || varr === WallBox.ARRANGE_BOTTOM || varr === WallBox.ARRANGE_CENTER))
                        //     this.attributes.stretchheight = 1;
                    }
                }

                // disable baseline probe if not needed
                if (!this.attributes.legacybaseline &&
                    (this.attributes.flow !== WallBox.FLOW_HORIZONTAL || varr !== WallBox.ARRANGE_BASELINE || numchildren < 2))
                    for (var i = 0; i < numchildren; i++) {
                    var child = <WallBox> this.children[i];
                        child.attributes.legacybaseline = false;
                    }

            super.visitI();

            // tappability visualization
            this.setRenderedTappable((this.attributes.tappedEvent.handlers || this.contenttapapplies()) ? true : false, false);

        }


        //isGeneric() {
        //    return !this.wallLike;
        //}

        //makeGeneric() {
        //    if (this.wallLike) {
       //         this.wallLike = false;
        //        if (this.parent) this.parent.makeGeneric();
        //    }
        //}

        public speculationwascorrect(scroll: boolean): boolean {
            return scroll === this.D_scr;
        }

        private bound(min: number, val: number, max: number): number {
            if (min > val)
                return min;
            if (max < val)
                return max;
            return val;
        }

        private tryPreserveAspectRatio(): boolean {

            return /img|canvas|video|audio|boardContainer|viewPicture/i.test(this.content.tagName)
                || /boardContainer|viewPicture/i.test(this.content.className);

        }

        private fillh(f: number): boolean {
            if (f <= 0)  return false;
            if (Math.abs(1-f) < 0.0001 || this.isRoot) return true;
            var a = this.attributes.arrangement[WallBox.H];
            return (a === WallBox.ARRANGE_LEFT || a === WallBox.ARRANGE_CENTER || a === WallBox.ARRANGE_SPREAD || a === WallBox.ARRANGE_RIGHT);
        }
        private fillv(f: number): boolean {
            if (f <= 0) return false;
            if (f == 1 || this.isRoot) return true;
            var a = this.attributes.arrangement[WallBox.V];
            return (a === WallBox.ARRANGE_TOP || a === WallBox.ARRANGE_BOTTOM || a === WallBox.ARRANGE_CENTER || a === WallBox.ARRANGE_SPREAD );
        }


        // new layout algorithm

        public doLayout() {
            this.passA();
            this.passBC();
            this.passD();
        }

        private passA() {
            this.visitI();
            for (var i = 0; i < this.children.length; i++) {
                (<WallBox>this.children[i]).passA();
            }
            this.visitA();
        }
        private passBC() {
            this.visitB();
            for (var i = 0; i < this.children.length; i++)
                (<WallBox>this.children[i]).passBC();
            this.visitC();
        }
        private passD() {
            this.visitD();
            for (var i = 0; i < this.children.length; i++)
                (<WallBox>this.children[i]).passD();
            if (this.layoutcompletehandler)
                this.layoutcompletehandler(this.getRenderedWidth(), this.getRenderedHeight());
        }


        private visitA() {
            var numchildren = this.children.length;
            if (numchildren === 0) {

                // determine width
                if (this.contentType != WallBox.CONTENT_NONE && this.cached_width === -1) {

                    // remove all size settings
                    this.setRenderedWidth(-1);
                    this.setRenderedHeight(-1);

                    if ((this.contentType === WallBox.CONTENT_TEXT || this.contentType === WallBox.CONTENT_INPUT)) {

                        // update the auxiliary span we use to take measurements
                        if (this.contentType === WallBox.CONTENT_INPUT) {
                            var text = this.textarea ? (<HTMLTextAreaElement>this.content).value : (<HTMLInputElement>this.content).value;
                            text = text + " abc"; // guarantee some free space for typing ahead
                            this.auxcontent.textContent = text;
                        }

                        this.setRenderedWrap(false, this.attributes.wraplimit);

                        // compute the width it wants to be
                        var newwidth = (this.contentType === WallBox.CONTENT_INPUT) ?
                             this.auxcontent.scrollWidth + (this.textarea ? (LayoutMgr.instance.scrollbarWidth + 50) : 50) :
                              this.element.scrollWidth;

                        //if (newwidth > this.width[WallBox.MAX]) {
                        //    newwidth = this.attributes.wrap * SizeMgr.topFontSize;
                        //    this.setRenderedWrap(this.attributes.wrap);
                        //    this.setRenderedWidth(newwidth);
                        //    newwidth = (this.contentType === WallBox.CONTENT_INPUT) ? this.auxcontent.scrollWidth : this.element.scrollWidth;

                        this.setRenderedWrap(this.attributes.wrap, this.attributes.wraplimit);
                        this.cached_width = newwidth;
                        this.cached_aspectratio = 0;

                        // determine baseline if asked for
                        if (this.attributes.legacybaseline && this.cached_baseline === -1) {
                            if (!this.baselineprobe) {
                                this.baselineprobe = span(null, "s");
                                this.baselineprobe.style.fontSize = "0";
                                var c = div(null,
                                    span(null, "L"),
                                    this.baselineprobe);
                                c.style.visibility = "hidden";
                                c.style.position = "absolute";
                                this.element.appendChild(c);
                            }
                            var yPosition = 0;
                            this.cached_baseline = this.baselineprobe.offsetTop - this.baselineprobe.scrollTop + this.baselineprobe.clientTop;
                            this.element.removeChild(this.baselineprobe.parentElement);
                            this.baselineprobe = null;
                        }

                    }
                    else {
                        // use attributes if present, or use browser-reported size otherwise
                        var targetelt = (this.content.className === "viewPicture") ? (<HTMLElement>this.content.firstChild) : this.content;
                        var ha = targetelt ? Number(targetelt.getAttribute("height")) : 0;
                        var wa = targetelt ? Number(targetelt.getAttribute("width")) : 0;

                        // look for attributes on elt
                        if (targetelt && (targetelt.tagName == "IMG" || targetelt.tagName == "VIDEO" || targetelt.tagName == "AUDIO")) {
                            ha = ha || (<any>targetelt).height;
                            wa = wa || (<any>targetelt).width;
                        }

                        this.cached_width = wa || this.element.scrollWidth;

                        this.cached_aspectratio = (this.tryPreserveAspectRatio() && this.cached_width) ?
                        ((ha || this.element.scrollHeight) / this.cached_width) : 0;

                        // if this is video or audio and we couldn't get any width reported, use default
                        if ((this.cached_width == 0) && targetelt && (targetelt.tagName == "VIDEO" || targetelt.tagName == "AUDIO")) {
                            this.cached_width = 300;
                        }
                        // if this is an image and we couldn't get any width reported, use default
                        if ((this.cached_width == 0) && targetelt && (targetelt.tagName == "IMG")) {
                            this.cached_width = 100;
                        }
                    }

                }
                // determine requested widths
                if (this.contentType === WallBox.CONTENT_IMAGE) {
                    if (this.cached_aspectratio > 0) {
                        var scmin = this.attributes.height[WallBox.MIN] / this.cached_aspectratio;
                        var scmax = this.attributes.height[WallBox.MAX] / this.cached_aspectratio;
                        if ((this.attributes.width[WallBox.MIN] <= scmax) && (this.attributes.width[WallBox.MAX] >= scmin))
                            // constraints are satisfiable, take them into account
                            this.A_sc = this.bound(scmin, this.cached_width, scmax);
                        else
                            // constraints are not satisfiable, do not take them into account
                            this.A_sc = this.cached_width;
                    }
                    else {
                        this.A_sc = this.cached_width;
                    }
                    this.A_asc = this.A_sc;
                    var flex = (this.attributes.stretchwidth == 1 || !this.tryPreserveAspectRatio() || (this.attributes.stretchwidth == -1 && this.content && this.content.tagName == "IMG")) ? 1 : 0;
                    this.A_mc = flex ? 0 : this.A_asc;
                    this.A_fcc = flex;
                } else if (this.contentType === WallBox.CONTENT_TEXT) {
                    var statedwidth = this.cached_width;
                    var safetywidth = statedwidth + 1;  // need safety margin pixel ... browser are not good at this
                    this.A_sc = safetywidth;
                    this.A_asc = (this.attributes.wrap) ? Math.min(this.A_sc, this.attributes.wraplimit * SizeMgr.topFontSize) : this.A_sc;
                    this.A_mc = this.A_asc;
                    this.A_fcc = 1;
                } else if (this.contentType === WallBox.CONTENT_INPUT) {
                    this.A_sc = this.cached_width;
                    this.A_asc = (this.attributes.wrap) ? Math.min(this.A_sc, this.attributes.wraplimit * SizeMgr.topFontSize) : this.A_sc;
                    this.A_mc = this.A_asc;
                    this.A_fcc = 1;
                } else {
                    this.A_sc = 0;
                    this.A_mc = 0;
                    this.A_asc = 0;
                    this.A_fcc = 0;
                }
            }
            else {
                // composite node
                if (this.attributes.flow === WallBox.FLOW_HORIZONTAL) {
                    var lm_s = this.attributes.padding[WallBox.L];
                    var lm_f = 0;
                    this.A_mc = lm_s;
                    this.A_sc = lm_s;
                    this.A_scc = 0;
                    this.A_asc = lm_s;
                    this.A_fcc = 0;
                    this.A_fcs = 0;
                    this.A_fp = 0;
                    for (var i = 0; i < numchildren; i++) {
                        var child = <WallBox> this.children[i];
                        var ws = Math.max(0, child.A_sl - lm_s) + child.A_sr;
                        lm_s = child.A_sr;
                        if (i == numchildren - 1)
                            ws += Math.max(0, this.attributes.padding[WallBox.R] - lm_s);
                        this.A_mc += child.A_m + ws;
                        this.A_sc += child.A_s + ws;
                        this.A_scc += child.A_s;
                        this.A_asc += child.A_as + ws;
                        this.A_fcc += child.A_f;
                        this.A_fcs += Math.max(0, child.A_fl - lm_f) + child.A_fr;
                        this.A_fp = this.A_fp || child.A_fp;
                        lm_f = child.A_fr;
                    }
                } else if (this.attributes.flow === WallBox.FLOW_VERTICAL || this.attributes.flow === WallBox.FLOW_OVERLAY) {
                    this.A_mc = 0;
                    this.A_sc = 0;
                    this.A_asc = 0;
                    this.A_fcc = 0;
                    this.A_fp = 0;
                    for (var i = 0; i < this.children.length; i++) {
                        var child = <WallBox> this.children[i];
                        var ws = Math.max(child.A_sl, this.attributes.padding[WallBox.L]) + Math.max(child.A_sr, this.attributes.padding[WallBox.R]);
                        this.A_mc = Math.max(this.A_mc, child.A_m + ws);
                        this.A_asc = Math.max(this.A_asc, child.A_as + ws);
                        this.A_sc = Math.max(this.A_sc, child.A_s + ws);
                        this.A_fcc = Math.max(this.A_fcc, child.A_f);
                        this.A_fp = this.A_fp || child.A_fp;
                    }
                }

            }
            var min = this.attributes.width[WallBox.MIN];
            var max = this.attributes.width[WallBox.MAX];
            var borderwidth = this.attributes.borderwidth[WallBox.L] + this.attributes.borderwidth[WallBox.R];
            this.A_scr = (this.attributes.scroll[WallBox.V] && (!this.isRoot || LayoutMgr.instance.scrollspeculation)) ? LayoutMgr.instance.scrollbarWidth : 0;
            this.A_m = this.bound(min, (this.attributes.scroll[WallBox.H] ? Math.min(this.A_mc, SizeMgr.topFontSize*6) : this.A_mc)  + this.A_scr, max) + borderwidth;
            this.A_as = this.bound(min, (this.attributes.scroll[WallBox.H] ? Math.min(this.A_mc, SizeMgr.topFontSize * 10) : this.A_asc) + this.A_scr, max) + borderwidth;
            this.A_s = this.bound(min, this.A_sc + this.A_scr, max) + borderwidth;
            this.A_sl = this.attributes.margin[WallBox.L];
            this.A_sr = this.attributes.margin[WallBox.R];
            this.A_f = (this.attributes.stretchwidth == -1) ? ((this.A_fp || (numchildren == 0)) ? (this.fillh(this.A_fcc) ? 1 : this.A_fcc) : 0) : this.attributes.stretchwidth;
            this.A_fp = (this.attributes.stretchwidth == -1) ? ((numchildren > 0) && (max > min) && this.A_fp) : (this.attributes.legacystretch[WallBox.H] ? 0 : this.attributes.stretchwidth);
            this.A_fl = this.attributes.stretchmargin[WallBox.L];
            this.A_fr = this.attributes.stretchmargin[WallBox.R];
        }



        private visitB() {
            if (this.isRoot) {
                // get algorithm inputs from window constraints
                this.B_x = 0;
                //this.B_s = window.innerWidth;
                this.B_s = this.runtime.host.fullWallWidth();
            }
            var borderwidth = (this.attributes.borderwidth[WallBox.L] + this.attributes.borderwidth[WallBox.R]);
            var allowance = this.B_s - this.A_scr - borderwidth;
            var numchildren = this.children.length;
            var overflow = false;
            if (numchildren == 0) {
                // leaf node
                this.B_scr = false;
            } else {
                // composite node
                overflow = allowance < this.A_mc;
                this.B_scr = (overflow && this.attributes.scroll[WallBox.H]);
                if (this.attributes.flow === WallBox.FLOW_VERTICAL || this.attributes.flow === WallBox.FLOW_OVERLAY) {
                    var pl = this.attributes.padding[WallBox.L];
                    var pr = this.attributes.padding[WallBox.R];
                    for (var i = 0; i < numchildren; i++) {
                        var child = <WallBox> this.children[i];
                        var ws = Math.max(Math.max(pl, child.A_sl) + Math.max(pr, child.A_sr));
                        if (allowance > child.A_s + ws) {
                            // we have enough for requested width
                            var extra_c = 0;
                            if (child.A_f) {
                                var proportion = (child.A_f < 1 && this.fillh(child.A_f)) ? child.A_f : 1;
                                extra_c = Math.max(0, Math.min(proportion*allowance - ws, child.attributes.width[WallBox.MAX]) - child.A_s);
                            }
                            child.B_s = child.A_s + extra_c;
                            var extra_s = (child.A_fl + child.A_fr) ? ((allowance - child.B_s - ws) / (child.A_fl + child.A_fr)) : 0;
                            child.B_x = Math.max(pl,child.A_sl) + extra_s * child.A_fl;
                        }
                        else if (allowance > child.A_as + ws) {
                            // we have enough for alt width
                            child.B_x = Math.max(pl,child.A_sl);
                            child.B_s = allowance - ws;
                        }
                        else if (this.B_scr) {
                            // we are scrolling, use alt width
                            child.B_x = Math.max(pl,child.A_sl);
                            child.B_s = child.A_as;
                        }
                        else {
                            // take what we can
                            child.B_x = Math.max(pl,child.A_sl);
                            child.B_s = Math.max(child.A_m, allowance - ws);
                        }
                    }
                }
                else if (this.attributes.flow === WallBox.FLOW_HORIZONTAL) {
                    if (allowance >= this.A_sc) {
                        // we have enough for requested width
                        var apply_fractional_stretches = this.fillh(this.A_fcc);
                        var space_for_content = allowance - (this.A_sc - this.A_scc);
                        // first, give extra space to content that wants it
                        var remainder = space_for_content;
                        var wsum = this.A_fcc;
                        var csum = this.A_scc;
                        if (remainder === 0 || wsum === 0)
                            this.children.forEach((c:WallBox) => remainder -= (c.B_s = c.A_s));
                        else {
                            var limit = (c:WallBox) => {
                                if (!apply_fractional_stretches || c.A_f >= 1)
                                    return c.attributes.width[WallBox.MAX];
                                else
                                    return Math.max(c.A_s, Math.min(c.attributes.width[WallBox.MAX], space_for_content * c.A_f));
                            };
                            var sortedlist = this.children.slice(0).sort((wb1: WallBox, wb2: WallBox) => limit(wb1) - limit(wb2));
                            for (var i = 0; i < sortedlist.length; i++) {
                                var c = <WallBox> sortedlist[i];
                                c.B_s = (c.A_f == 0) ? c.A_s : ((!apply_fractional_stretches || c.A_f >= 1) ?
                                               Math.min(c.attributes.width[WallBox.MAX], c.A_s + ((remainder - csum) / wsum) * c.A_f)
                                             : Math.max(c.A_s, Math.min(c.attributes.width[WallBox.MAX], space_for_content * c.A_f)));
                                remainder -= c.B_s;
                                csum -= c.A_s;
                                wsum -= c.A_f;
                            }
                        }
                        // then, give extra space wo white space
                        var extra_s = this.A_fcs ? (remainder / this.A_fcs) : 0;
                        var ls = this.attributes.padding[WallBox.L];
                        var lf = 0;
                        var x = ls;
                        for (var i = 0; i < numchildren; i++) {
                            var child = <WallBox> this.children[i];
                            x = x + Math.max(0, child.A_sl - ls) + Math.max(0, extra_s * child.A_fl - lf);
                            child.B_x = x;
                            ls = child.A_sr;
                            lf = extra_s * child.A_fr;
                            x = x + child.B_s + ls + lf;
                        }
                    }
                    else {
                        if (allowance > this.A_asc) {
                            // we have enough for requested alternate width
                            this.distribute(allowance - this.A_asc,
                                        (child: WallBox) => child.A_s - child.A_as,
                                        (child: WallBox, give: number) => { child.B_s = child.A_as + give });
                        }
                        else if (this.B_scr) {
                            // scrolling - everybody gets alt width
                            for (var i = 0; i < numchildren; i++) {
                                var child = <WallBox> this.children[i];
                                child.B_s = child.A_as;
                            }
                        }
                        else {
                            //  minimum width
                            overflow = true;
                            this.distribute(this.A_asc - allowance,
                                       (child: WallBox) => child.A_as - child.A_m,
                                       (child: WallBox, take: number) => { child.B_s = child.A_as - take });
                        }
                        // assign position
                        var x = 0;
                        var lastmargin = this.attributes.padding[WallBox.L];
                        for (var i = 0; i < numchildren; i++) {
                            var child = <WallBox> this.children[i];
                            x = x + Math.max(lastmargin, child.A_sl);
                            child.B_x = x;
                            x = x + child.B_s;
                            lastmargin = child.A_sr;
                        }

                    }

                }
            }
            // output to rendering
            if (!this.delayedlayout)
                this.setRenderedWidth(this.B_s - borderwidth);
            this.setRenderedHorizontalOverflow(this.B_scr ? "scroll" : (overflow ? "hidden" : ""));
            this.setRenderedX(this.B_x);
        }

        private distribute(
            amount: number,
            limit: (wb: WallBox) => number,
                apply: (wb: WallBox, amount: number) => void )
            {
            if (amount === 0) {
                for (var i = 0; i < this.children.length; i++)
                    apply(<WallBox>this.children[i], 0);
            }
            else {
                var takers = this.children.length;
                var sortedlist = this.children.slice(0).sort((wb1: WallBox, wb2: WallBox) => limit(wb1) - limit(wb2));
                for (var i = 0; i < this.children.length; i++) {
                    var child = <WallBox>sortedlist[i];
                    var take = Math.min(limit(child), amount / takers);
                    amount -= take;
                    apply(child, take);
                    takers--;
                }
            }
        }


        private visitC() {
            var numchildren = this.children.length;
            if (numchildren === 0) {
                // we are on leaf

                // determine height
                if (this.contentType != WallBox.CONTENT_NONE && this.cached_height === -1) {

                    if (this.contentType == WallBox.CONTENT_IMAGE) {
                        var targetelt = (this.content.className === "viewPicture") ? (<HTMLElement>this.content.firstChild) : this.content;
                        this.cached_height = targetelt ? Number(targetelt.getAttribute("height")) : 0;
                        if (!this.cached_height && this.content && this.content.tagName == "IMG") {
                            this.cached_height = (<HTMLImageElement> targetelt).height;
                        }
                        if (!this.cached_height) {
                            this.setRenderedHeight(-1);
                            this.cached_height = this.element.clientHeight;
                        }
                    }
                    else if (this.contentType == WallBox.CONTENT_INPUT) {
                        this.setRenderedHeight(-1);
                        this.cached_height = this.auxcontent.scrollHeight + (this.textarea ? 5 : 0);
                    } else {
                        this.setRenderedHeight(-1);
                        this.cached_height = this.element.clientHeight;
                    }
                }

                // initialize algorithm inputs
                if (this.contentType === WallBox.CONTENT_IMAGE) {
                    if (this.cached_aspectratio > 0) // try to preserve aspect ratio
                        this.C_sc = ((this.delayedlayout ? this.cached_width : this.getRenderedWidth()) * this.cached_aspectratio);
                    else // cannot preserve aspect ratio
                        this.C_sc = this.cached_height;
                    this.C_mc = this.attributes.stretchheight == 1 ? 0 : this.C_sc;
                    this.C_bc = 0;
                    this.C_fcc = this.attributes.stretchheight == 1 ? 1 : 0;
                }
                else if (this.contentType === WallBox.CONTENT_TEXT) {
                    this.C_sc = this.cached_height + 1;  // add 1 for browser inaccuracy
                    this.C_mc = this.C_sc; // want all of it
                    this.C_bc = this.cached_baseline;
                    this.C_fcc = 0;
                }
                else if (this.contentType === WallBox.CONTENT_INPUT) {
                    this.C_sc = this.cached_height + (this.textarea ? 1 : 6);
                    this.C_mc = this.C_sc; // want all of it
                    this.C_bc = this.cached_baseline;
                    this.C_fcc = 0;
                } else {
                    this.C_sc = 0;
                    this.C_mc = 0;
                    this.C_bc = 0;
                    this.C_fcc = 0;
                }
                this.C_zc = 1;
            }
            else {
                this.C_bc = 0;
                var dobaseline = (this.attributes.arrangement[WallBox.V] === WallBox.ARRANGE_BASELINE);
                if (this.attributes.flow === WallBox.FLOW_VERTICAL) {

                    // find baseline adjustment
                    var firstchild = <WallBox>this.children[0];
                    if (dobaseline && firstchild.C_b) {
                        this.C_bc = firstchild.C_b + Math.max(this.attributes.padding[WallBox.T], firstchild.C_st);
                    }

                    var bm_s = this.attributes.padding[WallBox.T];
                    var bm_f = 0;
                    this.C_sc = bm_s;
                    this.C_scc = 0;
                    this.C_mc = bm_s;
                    this.C_fcc = 0;
                    this.C_fcs = 0;
                    this.C_fp = 0;
                    this.C_zc = 1;
                    for (var i = 0; i < numchildren; i++) {
                        var child = <WallBox>this.children[i];
                        var ws = Math.max(0, child.C_st - bm_s) + child.C_sb;
                        bm_s = child.C_sb;
                        if (i == numchildren-1)
                            ws += Math.max(0, this.attributes.padding[WallBox.B] - bm_s);
                        this.C_sc += child.C_s + ws;
                        this.C_scc += child.C_s;
                        this.C_mc += child.C_m + ws;
                        this.C_fcc += child.C_f;
                        this.C_fcs += Math.max(0, child.C_ft - bm_f)  + child.C_fb;
                        this.C_fp = this.C_fp || child.C_fp;
                        bm_f = child.C_fb;
                        this.C_zc = Math.max(this.C_zc, 1 + child.C_zc);
                    }
                } else if (this.attributes.flow === WallBox.FLOW_HORIZONTAL || this.attributes.flow === WallBox.FLOW_OVERLAY) {
                    // var pos = 0;
                    //for (var line = 0; pos < this.children.length; line++) {
                    //var lsa = 0;
                    //var lst = 0;
                    //var lsb = 0;
                    //var lft = true;
                    //var lf = true;
                    //var lfb = true;
                    //for (var col = 0;  pos < this.children.length && this.children[pos].B_g == line; col++) {
                    //    var child = this.children[pos];
                    //    if (child.B_g > line) break;
                    //    lsa = Math.max(lsa, child.C_st + child.C_s + child.C_sb);
                    //    lst = Math.max(lsa, child.C_st + child.C_s + child.C_sb);
                    //    lsb = Math.max(lsa, child.C_st + child.C_s + child.C_sb);
                    //    lft = lft && child.C_ft;


                    if (dobaseline)
                        for (var i = 0; i < this.children.length; i++) {
                            var child = <WallBox>this.children[i];
                            if (child.C_b)
                                this.C_bc = Math.max(this.C_bc, child.C_b + Math.max(this.attributes.padding[WallBox.T], child.C_st));
                        }

                    this.C_sc = 0;
                    this.C_mc = 0;
                    this.C_fcc = 0;
                    this.C_fp = 0;
                    this.C_zc = 1;
                    for (var i = 0; i < this.children.length; i++) {
                        var child = <WallBox>this.children[i];
                        var wst = Math.max(this.attributes.padding[WallBox.T], child.C_st);
                        var bsa = child.C_b ? Math.max(0, this.C_bc - (child.C_b + wst)) : 0;
                        var ws = wst + bsa + Math.max(this.attributes.padding[WallBox.B], child.C_sb);
                        this.C_sc = Math.max(this.C_sc, child.C_s + ws);
                        this.C_mc = Math.max(this.C_mc, child.C_m + ws);
                        this.C_fcc = Math.max(this.C_fcc, child.C_f);
                        this.C_fp = this.C_fp || child.C_fp;
                        if (this.attributes.flow === WallBox.FLOW_OVERLAY)
                            this.C_zc = this.C_zc + child.C_zc;
                        else
                            this.C_zc = Math.max(this.C_zc, 1 + child.C_zc);
                    }
                }
            }
            var min = this.attributes.height[WallBox.MIN];
            var max = this.attributes.height[WallBox.MAX];
            var borderwidth = this.attributes.borderwidth[WallBox.T] + this.attributes.borderwidth[WallBox.B];
            this.C_scr = this.B_scr ? LayoutMgr.instance.scrollbarHeight : 0;
            this.C_m = this.bound(min, (this.attributes.scroll[WallBox.V] ? Math.min(this.C_mc, SizeMgr.topFontSize * 6) : this.C_mc) + this.C_scr, max) + borderwidth;
            this.C_s = this.bound(min, this.C_sc + this.C_scr, max) + borderwidth;
            this.C_st = this.attributes.margin[WallBox.T];
            this.C_sb = this.attributes.margin[WallBox.B];
            this.C_f = (this.attributes.stretchheight == -1) ? ((this.C_fp || (numchildren == 0)) ? (this.fillv(this.C_fcc) ? 1 : this.C_fcc) : 0) : this.attributes.stretchheight;
            this.C_fp = (this.attributes.stretchheight == -1) ? ((numchildren > 0) && (max > min) && this.C_fp) : (this.attributes.legacystretch[WallBox.V] ? 0 : this.attributes.stretchheight);
            this.C_ft = this.attributes.stretchmargin[WallBox.T];
            this.C_fb = this.attributes.stretchmargin[WallBox.B];
            this.C_b = (this.attributes.legacybaseline && this.C_bc) ? (this.C_bc + this.attributes.borderwidth[WallBox.T]) : 0;
        }

        private visitD() {
            // input from the top element
            if (this.isRoot) {
                this.D_y = 0;
                //this.D_s = window.innerHeight - SizeMgr.topFontSize * 4;
                this.D_s = this.runtime.host.userWallHeight();
                this.D_z = 1;
                this.D_b = this.C_b;
            }
            var overflow = false;
            var borderwidth = (this.attributes.borderwidth[WallBox.T] + this.attributes.borderwidth[WallBox.B]);
            var allowance = this.D_s - this.C_scr - borderwidth;
            var baseline = this.attributes.legacybaseline ? ((this.attributes.arrangement[WallBox.V]===WallBox.ARRANGE_BASELINE) ? Math.max(this.C_bc,this.D_b - this.attributes.borderwidth[WallBox.T]) : 0) : this.C_bc;
            var numchildren = this.children.length;
            if (numchildren === 0) {
                // leaf node
                this.D_scr = false;
            } else {
                // composite node
                overflow = allowance < this.C_mc + this.C_scr;
                this.D_scr = (overflow && this.attributes.scroll[WallBox.V]);
                var nextz = this.D_z + 1;
                if (this.attributes.flow === WallBox.FLOW_HORIZONTAL || this.attributes.flow === WallBox.FLOW_OVERLAY) {
                    var pt = this.attributes.padding[WallBox.T];
                    var pb = this.attributes.padding[WallBox.B];
                    for (var i = 0; i < numchildren; i++) {
                        var child = <WallBox>this.children[i];
                        var wst = Math.max(pt, child.C_st, child.C_b ? Math.max(0, baseline - child.C_b) : 0);
                        var ws = wst + Math.max(pb, child.C_sb);
                        if (allowance > child.C_s + ws) {
                            // we have enough for requested width
                            var extra_c = 0;
                            if (child.C_f)
                            {
                                var proportion = (child.C_f < 1 &&  this.fillv(child.C_f)) ? child.C_f : 1;
                                extra_c = Math.max(0, Math.min(allowance*proportion - ws, child.attributes.height[WallBox.MAX]) - child.C_s);
                            }
                            child.D_s = child.C_s + extra_c;
                            var extra_s = (child.C_ft + child.C_fb) ? ((allowance - child.D_s - ws) / (child.C_ft + child.C_fb)) : 0;
                            child.D_y = wst + extra_s * child.C_ft;
                        }
                        else if (this.D_scr) {
                            // we are scrolling - give full requested size
                            child.D_y = wst;
                            child.D_s = child.C_s;

                        } else {
                            // shrink as much as possible
                            child.D_y = wst;
                            child.D_s = Math.max(child.C_m, allowance - ws);
                        }
                        child.D_b = Math.max(0, baseline - child.D_y);
                        child.D_z = nextz;
                        if (this.attributes.flow === WallBox.FLOW_OVERLAY)
                            nextz = nextz + child.C_zc;
                    }
                }
                else if (this.attributes.flow === WallBox.FLOW_VERTICAL) {
                    var firstchild = <WallBox>this.children[0];
                    var bsa = firstchild.C_b ? Math.max(0, baseline - firstchild.C_b) : 0;
                    var pt = Math.max(this.attributes.padding[WallBox.T], bsa);
                    if (allowance >= this.C_sc) {
                        // we have enough for requested width
                        var apply_fractional_stretches = this.fillv(this.C_fcc);
                        var space_for_content = allowance - (this.C_sc - this.C_scc);
                        // first, give extra space to content that wants it
                        var remainder = space_for_content;
                        var wsum = this.C_fcc;
                        var csum = this.C_scc;
                        if (remainder === 0 || wsum === 0)
                            this.children.forEach((c:WallBox) => remainder -= (c.D_s = c.C_s));
                        else {
                            var limit = c => {
                                if (!apply_fractional_stretches || c.C_f >= 1)
                                    return c.attributes.height[WallBox.MAX];
                                else
                                    return Math.max(c.C_s, Math.min(c.attributes.height[WallBox.MAX], space_for_content * c.C_f));
                            };
                            var sortedlist = this.children.slice(0).sort((wb1: WallBox, wb2: WallBox) => limit(wb1) - limit(wb2));
                            for (var i = 0; i < sortedlist.length; i++) {
                                var c = <WallBox> sortedlist[i];
                                c.D_s = (c.C_f == 0) ? c.C_s : ((!apply_fractional_stretches || c.C_f >= 1) ?
                                               Math.min(c.attributes.height[WallBox.MAX], c.C_s + ((remainder - csum) / wsum) * c.C_f)
                                             : Math.max(c.C_s, Math.min(c.attributes.height[WallBox.MAX], space_for_content * c.C_f)));
                                remainder -= c.D_s;
                                csum -= c.C_s;
                                wsum -= c.C_f;
                            }
                        }
                        // then, give extra space to white space that wants it
                        var extra_s = this.C_fcs ? (remainder / this.C_fcs) : 0;
                        var y = pt;
                        var ls = pt;
                        var lf = 0;
                        for (var i = 0; i < numchildren; i++) {
                            var child = <WallBox>this.children[i];
                            y = y + Math.max(0, child.C_st - ls) + Math.max(0, extra_s * child.C_ft - lf);
                            child.D_y = y;
                            ls = child.C_sb;
                            lf = extra_s * child.C_fb;
                            y = y + child.D_s + ls + lf;
                            child.D_z = nextz;
                            child.D_b = Math.max(0, baseline - child.D_y);
                        }
                    }
                    else {
                        if (this.D_scr) {
                            // we are scrolling - give full requested size
                            for (var i = 0; i < numchildren; i++) {
                                var child = <WallBox>this.children[i];
                                child.D_s = child.C_s;
                            }
                        }
                        else if (allowance > this.C_mc) {
                            this.distribute(allowance - this.C_mc,
                                            (child: WallBox) => child.C_s - child.C_m,
                                            (child: WallBox, give: number) => { child.D_s = child.C_m + give });
                        } else {
                            //  give minimum width
                            overflow = allowance < this.C_mc;
                            for (var i = 0; i < numchildren; i++) {
                                var child = <WallBox>this.children[i];
                                child.D_s = child.C_m;
                            }
                        }
                        // assign position
                        var y = 0;
                        var lastmargin = pt;
                        for (var i = 0; i < numchildren; i++) {
                            var child = <WallBox>this.children[i];
                            y = y + Math.max(lastmargin, child.C_st);
                            child.D_y = y;
                            child.D_b = Math.max(0, baseline - child.D_y);
                            y = y + child.D_s;
                            lastmargin = child.C_sb;
                            child.D_z = nextz;
                            child.D_b = Math.max(0, baseline - child.D_y);
                        }
                    }
                }
            }
            // output to the HTML element
            if (!this.delayedlayout)
                this.setRenderedHeight(this.D_s - borderwidth);
            this.setRenderedVerticalOverflow(this.D_scr ? "scroll" : (overflow ? "hidden" : ""));
            this.setRenderedY(this.D_y);
            this.setRenderedZIndex(this.D_z);
        }


        public getEditableContent(): string {
            Util.assert(this.contentType == WallBox.CONTENT_INPUT);
            return this.textarea ? (<HTMLTextAreaElement>this.content).value : (<HTMLInputElement>this.content).value
        }
        public setEditableContent(text: string) {
            Util.assert(this.contentType == WallBox.CONTENT_INPUT);
            if (this.textarea)
                (<HTMLTextAreaElement>this.content).value = text;
            else
                (<HTMLInputElement>this.content).value = text;
        }

        public invalidateCachedLayout(triggerdelayedrelayout: boolean) {
            this.cached_width = -1;
            this.cached_height = -1;
            if (triggerdelayedrelayout)
                TDev.Util.setTimeout(100, () => {
                    if (this.cached_width === -1)
                        LayoutMgr.QueueReLayout();
                });
        }



        onInputTextChangeDone() {

            if (this.obsolete)
              return; // box may be already gone from screen

            if (LayoutMgr.instance.editMode) {
                // don't do anything in edit mode
            } else {
                this.cached_width = -1;
                this.cached_height = -1;
                var parent = this.parent;
                var text = this.textarea ? (<HTMLTextAreaElement>this.content).value : (<HTMLInputElement>this.content).value;
                if (parent && (<LayoutAttributes>parent.attributes).textEditedEvent.handlers) {
                    this.runtime.queueLocalEvent((<LayoutAttributes>parent.attributes).textEditedEvent, [text]);
                }
                this.runtime.forcePageRefresh(); // we need to ensure display is updated.
            }
        }



        // Getters
        public size(): number { return this.children.length; }
        public get(index: number): BoxBase { return this.children[index]; }
        public shift(): void {
            if (this.children.length > 0)
                this.children.shift();
        }
        public forEachChild(f: (WallBox) =>any) { this.children.forEach(f); }

        public getDepth(): number { return this.depth; }
        public getId(): number { return this.id; }

        public getElement(): HTMLElement { return this.element; }
        public getFlow(): number { return this.attributes.flow; }
        public getAlign(): number { return this.attributes.textalign; }
        public getBackground(): string { return this.attributes.background; }
        public getForeground(): string { return this.attributes.foreground; }
        public getFontSize(): number { return this.attributes.fontSize; }
        public getFontWeight(): string { return this.attributes.fontWeight; }
        public getFontFamily(): string { return this.attributes.fontFamily; }

        /*
        public getMinWidth(): number { return this.width[WallBox.MIN]; }
        public getMaxWidth(): number { return this.width[WallBox.MAX]; }
        public getMinHeight(): number { return this.height[WallBox.MIN]; }
        public getMaxHeight(): number { return this.height[WallBox.MAX]; }
        public getMargin(direction: number): number { return this.margin[direction]; }
        public getTopMargin(): number { return this.margin[WallBox.T]; }
        public getRightMargin(): number { return this.margin[WallBox.R]; }
        public getBottomMargin(): number { return this.margin[WallBox.B]; }
        public getLeftMargin(): number { return this.margin[WallBox.L]; }
*/

        // public getX(): number { return this.rendered_x; }
        // public getY(): number { return this.rendered_y; }
        public getRenderedWidth(): number { return this.rendered_width; }
        public getRenderedHeight(): number { return this.rendered_height; }
        //public getRenderedMargin(direction: number): number { return this.rendered_margin[direction]; }
        //public getRenderedTopMargin(): number { return this.rendered_margin[WallBox.T]; }
        //public getRenderedRightMargin(): number { return this.rendered_margin[WallBox.R]; }
        //public getRenderedBottomMargin(): number { return this.rendered_margin[WallBox.B]; }
        //public getRenderedLeftMargin(): number { return this.rendered_margin[WallBox.L]; }
        //public getHorizontalScrollbar(): boolean { return this.rendered_hscrollbar; }
        // public getVerticalScrollbar(): boolean { return this.rendered_vscrollbar; }

        //public getContentType(): number { return this.contentType; }
        public getContent(): HTMLElement { return this.content; }



        // Functions for setting box attributes. Called from user code.

        public setFlow(flow: number, pc = "") { this.attributes.flow = flow; this.onCall("flow", pc); }
        public setBackground(background: string, pc = "") { this.attributes.background = background; this.onCall("background", pc); }
        public addBackgroundImage(img: BoxBackgroundImage, pc = "") {
            if (!this.attributes.backgroundImages) this.attributes.backgroundImages = [];
            this.attributes.backgroundImages.splice(0, 0, img); this.onCall("background image", pc);
        }
        public setForeground(foreground: string, pc = "") { this.attributes.foreground = foreground; this.onCall("foreground", pc); }
        public setFontSize(fontSize: number, pc = "") { this.attributes.fontSize = fontSize; this.onCall("font size", pc); }
        public setFontWeight(fontWeight: string, pc = "") { this.attributes.fontWeight = fontWeight; this.onCall("font weight", pc); }
        public setFontFamily(fontFamily: string, pc = "") { this.attributes.fontFamily = fontFamily; this.onCall("font family", pc); }

        public setScrolling(h: boolean, v: boolean, pc = "") {
            this.attributes.scroll = [h, v];
            this.onCall("scrolling", pc);
        }
        public setEmBorder(color: string, width: number, pc = "") {
            this.attributes.border = color;
            var bw = SizeMgr.topFontSize * width;
            this.attributes.borderwidth = [bw, bw, bw, bw];
            this.onCall("border", pc);
       }
       public setBorderWidth(top: number, right: number, bottom: number, left: number, pc = "") {
            this.attributes.borderwidth = [top, right, bottom, left];
            this.onCall("border widths", pc);
        }
        public setAllMargins(top: number, right: number, bottom: number, left: number, pc = "") {
            this.attributes.margin = [top, right, bottom, left];
            this.onCall("margins", pc);
        }
         public setPadding(top: number, right: number, bottom: number, left: number, pc = "") {
            this.attributes.padding = [top, right, bottom, left];
            this.onCall("margins", pc);
        }
        public setWrap(wrap: boolean, width: number, pc = "") { this.attributes.wrap = wrap;  this.attributes.wraplimit = Math.max(width,1); this.onCall("text wrap", pc); }
        public setWidth(width: number, pc = "") { this.attributes.width = [width, width]; this.onCall("width", pc); }
        public setWidthRange(minWidth: number, maxWidth: number, pc = "") { this.attributes.width[WallBox.MIN] = minWidth; this.attributes.width[WallBox.MAX] = maxWidth; this.onCall("width range", pc); }

        public setHorizontalStretch(n: number, pc = "") {
            this.attributes.stretchwidth = n;
            this.onCall("horizontal stretch", pc);
        }
        public setVerticalStretch(n: number, pc = "") {
            this.attributes.stretchheight = n;
            this.onCall("vertical stretch", pc);
        }

        public setHorizontalAlignment(left: number, right: number, pc = "") {
            left = Math.max(0, Math.min(1,left));
            right = Math.max(0, Math.min(1,right));
            if (left < 1) this.attributes.stretchmargin[WallBox.L] = (1 - left);
            if (right < 1) this.attributes.stretchmargin[WallBox.R] = (1 - left);
            if (left > 0 && right > 0)
                this.attributes.stretchwidth = 1;
            if (right == 0 && left != 0)
                this.attributes.textalign = WallBox.ARRANGE_LEFT;
            else if (right != 0 && left == 0)
                this.attributes.textalign = WallBox.ARRANGE_RIGHT;
            else if (right == 0 && left == 0)
                this.attributes.textalign = WallBox.ARRANGE_CENTER;
            else
            this.attributes.textalign = WallBox.ARRANGE_JUSTIFY;
            this.attributes.legacystretch[WallBox.H] = true;
            this.onCall("horizontal alignment", pc);
        }
        public setVerticalAlignment(top: number, bottom: number, pc = "") {
            top = Math.max(0, Math.min(1,top));
            bottom = Math.max(0, Math.min(1,bottom));
            if (top < 1) this.attributes.stretchmargin[WallBox.T] = (1 - top);
            if (bottom < 1) this.attributes.stretchmargin[WallBox.B] = (1 - bottom);
            if (top > 0 && bottom > 0) this.attributes.stretchheight = 1;
            this.attributes.legacybaseline = false;
            this.attributes.legacystretch[WallBox.V] = true;
            this.onCall("vertical alignment", pc);
        }

        public setHorizontalArrangement(what: number, pc = "") {
            this.attributes.arrangement[WallBox.H] = what;
            this.attributes.textalign = what;
            this.onCall("horizontal arrangement", pc);
        }

        public setVerticalArrangement(what: number, pc = "") {
            this.attributes.arrangement[WallBox.V] = what;
            if (what != WallBox.ARRANGE_BASELINE)
                this.attributes.legacybaseline = false;
            this.onCall("vertical arrangement", pc);
        }

        //  public stretchAllMargins(top: number, right: number, bottom: number, left: number, pc = "") {
        //    this.attributes.stretchmargin = [top, right, bottom, left];
        //    this.onCall("stretch margins", pc);
        //}
        //public setWidthStretch(weight: number, pc = "") { this.attributes.stretchwidth = ((weight < 0) ? WallBox.STRETCH_AUTO : weight); this.onCall("stretch width", pc); }
        //public setHeightStretch(weight: number, pc = "") { this.attributes.stretchheight = ((weight < 0) ? WallBox.STRETCH_AUTO : weight); this.onCall("stretch height", pc); }


        public setHeight(height: number, pc = "") { this.attributes.height = [height, height]; this.onCall("height", pc); }
        public setHeightRange(minHeight: number, maxHeight: number, pc = "") { this.attributes.height[WallBox.MIN] = minHeight; this.attributes.height[WallBox.MAX] = maxHeight; this.onCall("height range", pc); }

        public setEmFontSize(fontSize: number, pc = "") { this.setFontSize(SizeMgr.topFontSize * fontSize, pc); }

        public setEmBorderWidth(top: number, right: number, bottom: number, left: number, pc = "") {
            this.setBorderWidth(SizeMgr.topFontSize * top, SizeMgr.topFontSize * right, SizeMgr.topFontSize * bottom, SizeMgr.topFontSize * left, pc);
        }
        public setAllEmMargins(top: number, right: number, bottom: number, left: number, pc = "") {
            this.setAllMargins(SizeMgr.topFontSize * top, SizeMgr.topFontSize * right, SizeMgr.topFontSize * bottom, SizeMgr.topFontSize * left, pc);
        }
        public setEmPadding(top: number, right: number, bottom: number, left: number, pc = "") {
            this.setPadding(SizeMgr.topFontSize * top, SizeMgr.topFontSize * right, SizeMgr.topFontSize * bottom, SizeMgr.topFontSize * left, pc);
        }
        public setEmWidth(width: number, pc = "") { this.setWidth(SizeMgr.topFontSize * width, pc); }
        public setEmWidthRange(minWidth: number, maxWidth: number, pc = "") { this.setWidthRange(SizeMgr.topFontSize * minWidth, SizeMgr.topFontSize * maxWidth, pc); }

        public setEmHeight(height: number, pc = "") { this.setHeight(SizeMgr.topFontSize * height, pc); }
        public setEmHeightRange(minHeight: number, maxHeight: number, pc = "") { this.setHeightRange(SizeMgr.topFontSize * minHeight, SizeMgr.topFontSize * maxHeight, pc); }

        public setContent(e: any) {
            Util.check(e != null);
            if (e instanceof HTMLTextAreaElement || e instanceof HTMLInputElement) {
                this.contentType = WallBox.CONTENT_INPUT;
                this.content = e;
                this.auxcontent = span("wall-text", "");
                this.auxcontent.style.visibility = "hidden"; // make this visible for debugging
                this.auxcontent.style.position = "absolute";
                this.auxcontent.style.left = "0px";
                this.auxcontent.style.top = "0px";
                this.auxcontent.style.padding = "1px";
                this.auxcontent.style.color = "red";
                this.auxcontent.style.zIndex = "-1";
            }
            else if (e instanceof HTMLElement) {
                this.contentType = WallBox.CONTENT_IMAGE;
                this.content = e;
            } else {
                this.contentType = WallBox.CONTENT_TEXT;
                var str = (e || "").toString();
                this.content = span("wall-text", str);
            }
        }



        // functions for manipulating the appearance of the HTML element. Called by layout algorithm.

        setRenderedX(x: number) {
            if (x !== this.rendered_x) {
                if (typeof (this.rendered_x) === "invalid" && !this.isRoot) {
                    this.element.style.position = "absolute";
                }
                this.element.style.left = x + "px";
                this.rendered_x = x;
            }
        }
        setRenderedY(y: number) {
            if (y !== this.rendered_y) {
                this.element.style.top = y + "px";
                this.rendered_y = y;
            }
        }
        setRenderedWidth(width: number) {
            if (width !== this.rendered_width) {
                this.element.style.width = (width >= 0) ? (width + "px") : "";
                if (this.contentType != WallBox.CONTENT_NONE && this.contentType != WallBox.CONTENT_TEXT) {
                    var extra = (this.contentType == WallBox.CONTENT_INPUT && !this.textarea) ? 6 : 0;
                    var targetelt = (this.content.className === "viewPicture") ? (<HTMLElement>this.content.firstChild) : this.content;
                    if (targetelt)
                        targetelt.style.width = (width > 0) ? ((width - extra) + "px") : "";
                    if (this.contentType === WallBox.CONTENT_INPUT && this.textarea)
                        this.auxcontent.style.width = (width >= 0) ? ((width - 10) + "px") : "";
                }
                this.rendered_width = width;
                this.cached_height = -1;
            }
        }
        setRenderedHeight(height: number) {
            if (height !== this.rendered_height) {
                this.element.style.height = (height > 0) ? (height + "px") : "";
                if (this.contentType != WallBox.CONTENT_NONE && this.contentType != WallBox.CONTENT_TEXT) {
                    var extra = (this.contentType == WallBox.CONTENT_INPUT && !this.textarea) ? 6 : 0;
                    var targetelt = (this.content.className === "viewPicture") ? (<HTMLElement>this.content.firstChild) : this.content;
                    if (targetelt)
                        targetelt.style.height = (height > 0) ? ((height - extra) + "px") : "";
                    if (this.contentType == WallBox.CONTENT_INPUT && this.textarea && height >= this.cached_height) {
                        this.content.style.overflow = "hidden"; // make sure IE does not display gray scroll bars
                    }
                }
                this.rendered_height = height;
            }
        }
        setRenderedFontFamily(family: string) {
            if (family !== this.rendered_fontfamily) {
                this.element.style.fontFamily = (family === "Default" ? '"Segoe UI", "Segoe WP", "Helvetica Neue", Sans-Serif' : family);
                this.rendered_fontfamily = family;
                this.cached_height = -1;
                this.cached_baseline = -1;
                this.cached_width = -1;
            }
        }
        setRenderedFontWeight(fw: string) {
            var fontweight = fw || "inherit";
            if (fontweight !== this.rendered_fontweight) {
                this.element.style.fontWeight = fontweight;
                this.rendered_fontweight = fontweight;
                this.cached_height = -1;
                this.cached_baseline = -1;
                this.cached_width = -1;
            }
        }
        setRenderedFontSize(size: number) {
            if (size !== this.rendered_fontsize) {
                this.element.style.fontSize = (size > 0) ? (size + "px") :"inherit";
                this.rendered_fontsize = size;
                this.cached_height = -1;
                this.cached_baseline = -1;
                this.cached_width = -1;
            }
        }
        setRenderedColor(clr: string) {
            var color = clr || "inherit";
            if (color !== this.rendered_foregroundcolor) {
                this.element.style.color = color;
                this.rendered_foregroundcolor = color;
            }
        }
        setRenderedBackgroundColor(color: string) {
            if (color !== this.rendered_backgroundcolor) {
                this.element.style.backgroundColor = color;
                this.rendered_backgroundcolor = color;
            }
        }
        setRenderedBackgroundImages(images: BoxBackgroundImage[]) {
            var css = images ? images.map(img => HTML.cssImage(img.url) + ' '
                + (img.position || 'center')
                + ' / ' + (img.size || 'cover')
                + ' ' + (img.repeat || 'no-repeat')
                + ' ' + (img.attachment || 'scroll')
                ).join(', ') : '';
            if(css !== this.rendered_background) {
                this.element.style.background = css;
                this.rendered_background = css;
            }
        }
        //setRenderedTagname(name: string) {
        //    if (this.element.tagName !== name) {
        //        var original = this.element;
        //        var copy = document.createElement(name);
        //        if (original.attributes)
        //            for (var i = 0; i < original.attributes.length; i++) {
        //            var a = original.attributes.item(i);
        //            copy.setAttribute(a.nodeName, a.nodeValue);
        //        }
        //        while (original.firstChild) {
        //            copy.appendChild(original.firstChild);
        //}
        //        if (original.parentNode)
        //            original.parentNode.replaceChild(copy, original);
        //        this.element = copy;
        //    }
        //}


        setRenderedTappable(tappable: boolean, tapped: boolean) {

            var x = "wall-box" + (tappable ? " tappable " : "") + (tapped ? " tapped" : "");
            if (x !== this.rendered_tappable) {
                this.element.className = x;
                this.rendered_tappable = x;
            }
        }
        setRenderedPositionMode(positionmode: string) {
            if (positionmode !== this.rendered_positionmode) {
                this.element.style.position = positionmode;
                this.rendered_positionmode = positionmode;
            }
        }
        //clearCss()
        //{
        //    if (this.element.style.cssText)
        //        this.element.style.cssText = ""
        //}
        min1pixel(x: number) {
            return ((x > 0 && x < 1) ? "1" : x.toString()) + "px";
        }
        setRenderedBorder(clr: string, width: number[]) {
            var color = clr ||  "black";
            if (color !== this.rendered_border) {
                this.element.style.borderColor = color;
                this.rendered_border = color;
            }
            if (!this.rendered_borderwidth
                || width[0] !== this.rendered_borderwidth[0]
                || width[1] !== this.rendered_borderwidth[1]
                || width[2] !== this.rendered_borderwidth[2]
                || width[3] !== this.rendered_borderwidth[3]) {
                var visible = (width[0] || width[1] || width[2] || width[3]);
                this.element.style.borderStyle = visible ? "solid" : "none";
                this.element.style.borderTopWidth = visible ? this.min1pixel(width[WallBox.T]) : "";
                this.element.style.borderRightWidth = visible ? this.min1pixel(width[WallBox.R]) : "";
                this.element.style.borderBottomWidth = visible ? this.min1pixel(width[WallBox.B]) : "";
                this.element.style.borderLeftWidth = visible ? this.min1pixel(width[WallBox.L]) : "";
                this.rendered_borderwidth = width.slice(0);
            }
        }
        setRenderedTextAlign(alignment: number) {
            if (alignment !== this.rendered_textalign) {
                switch (alignment) {
                    case WallBox.ARRANGE_RIGHT:
                        this.element.style.textAlign = "right";
                        break;
                    case WallBox.ARRANGE_CENTER:
                        this.element.style.textAlign = "center";
                        break;
                    case WallBox.ARRANGE_JUSTIFY:
                        this.element.style.textAlign = "justify";
                        break;
                    default:
                        this.element.style.textAlign = "left";
                        break;
                }
                this.cached_height = -1;
                this.cached_width = -1;
                this.rendered_textalign = alignment;
            }
        }
        setRenderedHorizontalOverflow(mode: string) {
            if (mode != this.rendered_hmode) {
                this.element.style.overflowX = (this.rendered_sideview || (mode == "scroll" && (this.contentType == WallBox.CONTENT_INPUT))) ? "" : mode;
                this.rendered_hmode = mode;
            }
        }
        setRenderedVerticalOverflow(mode: string) {
            if (mode != this.rendered_vmode) {
                this.element.style.overflowY = (this.rendered_sideview || (mode == "scroll" && (this.contentType == WallBox.CONTENT_INPUT))) ? "" : mode;
                this.rendered_vmode = mode;
            }
        }
        setRenderedSideView(sideview: boolean) {
            // called on root box to adjust side view
            if (this.rendered_sideview != sideview) {
                this.element.style.overflowX = (sideview || (this.rendered_hmode == "scroll" && (this.contentType == WallBox.CONTENT_INPUT))) ? "" : this.rendered_hmode;
                this.element.style.overflowY = (sideview || (this.rendered_vmode == "scroll" && (this.contentType == WallBox.CONTENT_INPUT))) ? "" : this.rendered_vmode;
                this.rendered_sideview = sideview;
            }
        }
        setRenderedWrap(wrap: boolean, wraplimit: number) {
            wrap = wrap || false;
            if (wrap != this.rendered_wrap || wraplimit != this.rendered_wraplimit) {
                this.element.style.whiteSpace = wrap ? (this.element.style.textAlign === "justify" ? "pre-line" : "pre-wrap") : "pre";
                this.element.style.wordWrap = wrap ? "break-word" : "";
                this.rendered_wrap = wrap;
                this.rendered_wraplimit = wraplimit;
                this.cached_height = -1;
                this.cached_width = -1;
            }
        }
        setRenderedZIndex(zi: number) {
            if (zi != this.rendered_zindex) {
                this.element.style.zIndex = zi ? zi.toString() : "";
                this.rendered_zindex = zi;
            }
        }
        //setRenderedTopMargin(margin: number) { this.rendered_margin[WallBox.T] = Math.max(0, margin); }
        //setRenderedRightMargin(margin: number) { this.rendered_margin[WallBox.R] = Math.max(0, margin); }
        //setRenderedBottomMargin(margin: number) { this.rendered_margin[WallBox.B] = Math.max(0, margin); }
        //setRenderedLeftMargin(margin: number) { this.rendered_margin[WallBox.L] = Math.max(0, margin); }

        }



        }

