///<reference path='refs.ts'/>

module TDev
{
    export class ClickHandler
    {
        public begX = 0;
        public begY = 0;
        private cleared = false;
        private version = 0;
        public mouseCaptureOverlay:HTMLElement = document.body;
        constructor(public helt:HTMLElement, public f:(e:Event)=>void) {
            this.setup();
        }

        public clickBegin(pos:any)
        {
            this.helt.setFlag("active", true);
            this.begX = pos.pageX;
            this.begY = pos.pageY;
            this.cleared = false;
            this.setupVersion();
        }

        public setupVersion()
        {
            var v = ++this.version;
            Util.setTimeout(300, () => {
                if (!this.cleared && v == this.version) this.clear();
            });
        }

        public onMove(e:any)
        {
            if (Math.abs(e.pageX - this.begX) > 10 ||
                Math.abs(e.pageY - this.begY) > 10)
                this.clear();
        }

        private getPos(e:MSPointerEvent)
        {
            // e.preventMouseEvent();
            // var pp = Util.offsetIn(e.target, TDev.elt("root"));

            if (!e.getPointerList)
                return { pageX: e.clientX, pageY: e.clientY };

            var pt = e.getPointerList()[0];
            return {
                pageX: pt.clientX,
                pageY: pt.clientY
            };
        }

        public skipIt(e:Event)
        {
            var targ = <HTMLElement>e.target;
            if (e.target != e.currentTarget &&
                (targ.nodeName == "INPUT" || targ.nodeName == "TEXTAREA")) return true;

            return false;
        }

        private isCanceled(e:Event)
        {
            if (this.skipIt(e)) return true;
            if ((<any>e).utilClickCancel) return true;
            (<any>e).utilClickCancel = true;
            return false;
        }

        public getPosition(element:HTMLElement) {
            var xPosition = 0;
            var yPosition = 0;
            while (element) {
                xPosition += (element.offsetLeft - element.scrollLeft + element.clientLeft);
                yPosition += (element.offsetTop - element.scrollTop + element.clientTop);
                element = <HTMLElement>element.offsetParent;
            }
            return { x: xPosition, y: yPosition };
        }

        public handleEvent(e:Event) {
            try {
                var ep = <any>e;
                if (Util.mouseLogging) {
                    Util.log("executing click handler " + e.type + " on " + this.helt.id);
                    Util.log("pageX:{0} pageY:{1} offsetX:{2} offsetY:{3} clientX:{4} clientY:{5}", ep.pageX, ep.pageY, ep.offsetX, ep.offsetY, ep.clientX, ep.clientY);
                }
                if (ep.touches && ep.touches[0]) {
                    ep = ep.touches[0];
                }
                else if (ep.touches && ep.touches.item(0)) {
                    ep = ep.touches.item(0);
                }
                else if (ep.changedTouches && ep.changedTouches.item(0)) {
                    ep = ep.changedTouches.item(0);
                }
                if (Util.mouseLogging) {
                    Util.log("after touch adjustment");
                    var pos = this.getPosition(this.helt);
                    Util.log("pageX:{0} pageY:{1} offsetX:{2} offsetY:{3} clientX:{4} clientY:{5} eltX:{6} eltY:{7}", ep.pageX, ep.pageY, ep.offsetX, ep.offsetY, ep.clientX, ep.clientY, pos.x, pos.y);
                }
                switch (e.type) {
                /*
                case "MSGestureTap":
                    var ge = <MSGestureEvent>e;
                    ge.preventMouseEvent();
                    var pp = Util.offsetIn(e.target, TDev.elt("root"));
                    begX = ge.offsetX + pp.x;
                    begX = ge.offsetY + pp.y;
                    fireClick(e);
                    break;
                    */

                case "pointerdown":
                    if (this.isCanceled(e)) break;
                    this.prepareMouseOverlay();
                    this.clickBegin(this.getPos(<MSPointerEvent>e));
                    this.mouseCaptureOverlay.addEventListener("pointermove", <any>this, false);
                    this.mouseCaptureOverlay.addEventListener("pointerup", <any>this, false);
                    break;

                case "MSPointerDown":
                    if (this.isCanceled(e)) break;
                    this.prepareMouseOverlay();
                    this.clickBegin(this.getPos(<MSPointerEvent>e));
                    this.mouseCaptureOverlay.addEventListener("MSPointerMove", <any>this, false);
                    this.mouseCaptureOverlay.addEventListener("MSPointerUp", <any>this, false);
                    break;

                case "pointermove":
                case "MSPointerMove":
                    if (!this.cleared) this.onMove(this.getPos(<MSPointerEvent>e));
                    break;

                case "pointerup":
                case "MSPointerUp":
                    if (!this.cleared) this.fireClick(e);
                    break;

                case "touchstart":
                    if (this.isCanceled(e)) break;
                    // e.stopPropagation();
                    this.helt.addEventListener("touchend", <any>this, false);
                    document.body.addEventListener("touchmove", <any>this, false);
                    document.body.addEventListener("touchend", <any>this, false);
                    this.clickBegin(ep);
                    break;
                case "touchmove":
                    if (!this.cleared) this.onMove(ep);
                    break;

                case "touchend":
                    if (!this.cleared) this.fireClick(ep);
                    break;

                case "mousedown":
                    if (this.isCanceled(e)) break;
                    // e.stopPropagation();
                    if ((<MouseEvent> e).button != 0) break;
                    this.helt.hideFocus = true;
                    this.helt.addEventListener("mouseup", <any>this, false);
                    document.addEventListener("mouseup", <any>this, false);
                    document.body.addEventListener("mousemove", <any>this, false);
                    this.clickBegin(e);
                    break;

                case "mousemove":
                    if (!this.cleared) this.onMove(e);
                    break;

                case "mouseup":
                    if (!this.cleared) this.fireClick(e);
                    break;
                case "keypress":
                    var ke = <KeyboardEvent>e;
                    if (ke.target == this.helt && (ke.which == 13 || ke.which == 32)) {
                        this.f(e);
                    }
                    break;
                /*
                case "click":
                    e.stopPropagation();
                    clear();
                    f(e);
                    break;
                    */
                }
            } catch (err) {
                Util.reportError("clickHandler", err);
            }
        }

        public fireClick(e:Event)
        {
            this.clear();
            var canc = (<any> e).clickCancelled;
            (<any> e).clickCancelled = true;
            if (!canc) {
                (<any>e).pgX = this.begX;
                (<any>e).pgY = this.begY;
                this.f(e);
            }
        }

        public clear()
        {
            this.hideMouseOverlay();
            this.cleared = true;
            this.hideMouseOverlay();
            this.helt.removeEventListener("touchend", <any>this, false);
            this.helt.removeEventListener("mouseup", <any>this, false);
            this.helt.setFlag("active", false);
            document.body.removeEventListener("touchmove", <any>this, false);
            document.removeEventListener("mouseup", <any>this, false);
            document.body.removeEventListener("mouseup", <any>this, false);
            document.body.removeEventListener("mousemove", <any>this, false);
            document.body.removeEventListener("touchend", <any>this, false);
            this.mouseCaptureOverlay.removeEventListener("MSPointerMove", <any>this, false);
            this.mouseCaptureOverlay.removeEventListener("MSPointerUp", <any>this, false);
            this.mouseCaptureOverlay.removeEventListener("pointermove", <any>this, false);
            this.mouseCaptureOverlay.removeEventListener("pointerup", <any>this, false);
        }

        public prepareMouseOverlay()
        {
        }

        public hideMouseOverlay()
        {
        }

        private setup()
        {
            if (window.navigator.pointerEnabled)
                this.helt.addEventListener("pointerdown", <any>this, false);
            else if (window.navigator.msPointerEnabled)
                // this guy triggers just once for double tap, and in general seems to have delay
                // e.addEventListener("MSGestureTap", self, false);
                this.helt.addEventListener("MSPointerDown", <any>this, false);
            else if (Browser.touchStart)
                this.helt.addEventListener("touchstart", <any>this, false);
            else
                this.helt.addEventListener("mousedown", <any>this, false);
            this.helt.addEventListener("keypress", <any>this, true);
        }

        public unhook()
        {
            this.helt.removeEventListener("MSPointerDown", <any>this, false);
            this.helt.removeEventListener("touchstart", <any>this, false);
            this.helt.removeEventListener("mousedown", <any>this, false);
            this.helt.removeEventListener("keypress", <any>this, true);
        }
    }

    export module Util {
        export function clickHandler(e:HTMLElement, cb:(e:any) => void, allowSelect?:boolean)
        {
            if (e) {
                e.setAttribute("role", "button")
                e.tabIndex = 0;
            }
            function newCb(e:any) {
                try {
                    return cb(e);
                } catch (err) {
                    Util.reportError("clickHandler " + cb.toString(), err);
                }
            }

            var oldH = (<any>e).clickHandler;
            if (oldH)
                oldH.unhook();

            var handler = new ClickHandler(e, newCb);
            (<any>e).clickHandler = handler;

            if (!allowSelect)
                e.onselectstart = () => { return <any> false; };
            else
                e.onselectstart = (e) => {
                    e.stopImmediatePropagation();
                    return true;
                }
        }   

        try {
            if (typeof HTMLElement != "undefined")
                HTMLElement.prototype.withClick = function (cb, allowSelect?) {
                    Util.clickHandler(this, cb, allowSelect);
                    return this;
                };
        } catch (e) {
        }
    }

}
