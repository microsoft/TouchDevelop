///<reference path='refs.ts'/>

module TDev {
    export class DragToScrollHandler
    {
        private posX = 0;
        private posY = 0;
        private theHistory = [];
        public vertical = true;
        public horizontal = false;
        private seenTouchEvent = false;
        private captureingMouse = false;
        private inertialAnimation : Animation;

        constructor(public helt:HTMLElement) {
        }
        public unhook()
        {
            var t = <any>this;
            if (Browser.touchStart) {
                this.helt.removeEventListener("touchstart", t, false);
                this.helt.removeEventListener("touchmove", t, false);
                this.helt.removeEventListener("touchend", t, false);
            } else {
                this.helt.removeEventListener("mousedown", t, false);
                this.helt.removeEventListener("mouseup", t, false);
                this.helt.removeEventListener("mouseout", t, false);
                this.helt.removeEventListener("mouseleave", t, false);
                this.helt.removeEventListener("mousemove", t, false);
            }
        }

        public init()
        {
            (<any>this.helt).dragToScroll = this;
            var t = <any>this;
            if (Browser.touchStart) {
                this.helt.addEventListener("touchstart", t, false);
                this.helt.addEventListener("touchmove", t, false);
                this.helt.addEventListener("touchend", t, false);
            } else {
                this.helt.addEventListener("mousedown", t, false);
                this.helt.addEventListener("mouseup", t, false);
                this.helt.addEventListener("mouseout", t, false);
                this.helt.addEventListener("mouseleave", t, false);
                this.helt.addEventListener("mousemove", t, false);
            }
        }

        private record(pos:any)
        {
            //var n = pos.timestamp;
            //if (!n)
            var n = new Date().getTime();
            // TODO keep the history small?
            this.theHistory.push(
                { x: pos.pageX,
                  y: pos.pageY,
                  t: n });
        }

        private stopInertialAnimation()
        {
            if (!this.inertialAnimation) return;
            this.inertialAnimation.complete();
            this.inertialAnimation = null;
        }


        private begin(pos:any)
        {
            this.posX = this.helt.scrollLeft + pos.pageX;
            this.posY = this.helt.scrollTop + pos.pageY;
            this.stopInertialAnimation();
            this.theHistory = [];
            this.record(pos);
        }

        private scrollTo(x:number, y:number)
        {
            if (this.horizontal) {
                this.helt.scrollLeft = x;
            }

            if (this.vertical) {
                this.helt.scrollTop = y;
            }
        }

        private move(pos:any)
        {
            this.scrollTo(this.posX - pos.pageX, this.posY - pos.pageY);
            this.record(pos);
        }

        private log()
        {
            var n = new Date().getTime();
            var k = this.theHistory.slice(this.theHistory.length - 5).map((h) => h.x + "," + h.y + "," + (h.t - n)).join(" : ");
            Util.log(k);
        }

        private end(pos:any)
        {
            if (!!pos) this.record(pos);
            if (this.theHistory.length == 0) return;
            var last = this.theHistory[this.theHistory.length - 1];
            var beg = last.t - 200;
            var first = last;
            for (var i = 0; i < this.theHistory.length; ++i) {
                if (this.theHistory[i].t >= beg) {
                    first = this.theHistory[i];
                    break;
                }
            }

            var dt = last.t - first.t;
            if (dt > 0) {
                var m = 150;
                var dx = (last.x - first.x) / dt * m;
                var dy = (last.y - first.y) / dt * m;
                var speed = Math.abs(dx) + Math.abs(dy);
                if (speed < 50) return;

                this.inertialAnimation =
                    new Animation((p:number) => {
                        this.scrollTo(this.posX - (last.x + dx * p), this.posY - (last.y + dy * p));
                    });
                this.inertialAnimation.duration = 700;
                this.inertialAnimation.begin();
            }
        }

        public handleEvent(e:Event)
        {
            try {
                var now = new Date().getTime();
                switch (e.type) {
                case "mousedown":
                    if (!this.seenTouchEvent && (<MouseEvent> e).button == 0) {
                        this.captureingMouse = true;
                        this.begin(e);
                    }
                    break;
                case "mousemove":
                    if (this.captureingMouse) {
                        this.move(e);
                        //e.preventDefault();
                    }
                    break;
                case "mouseleave":
                    this.end(e);
                    this.captureingMouse = false;
                    break;
                case "mouseout":
                    // Chrome and FF don't do mouseleave
                    // instead they have this silly bubbling mouseout
                    if (this.captureingMouse) {
                        var me = <MouseEvent> e;
                        if (!!me.relatedTarget) {
                            var elts = this.helt.getElementsByTagName((<HTMLElement> me.relatedTarget).nodeName);
                            for (var i = 0; i < elts.length; ++i)
                                if (elts[i] == me.relatedTarget)
                                    return;
                        }
                        this.end(e);
                        this.captureingMouse = false;
                    }
                    break;
                case "mouseup":
                    this.end(e);
                    this.captureingMouse = false;
                    break;

                case "touchstart":
                    this.seenTouchEvent = true;
                    this.begin((<any> e).touches[0]);
                    break;
                case "touchmove":
                    e.preventDefault(); // otherwise the entire page will scroll
                    this.move((<any> e).touches[0]);
                    break;
                case "touchend":
                    this.end((<any> e).touches[0]);
                    break;
                }
            } catch (err) {
                Util.reportError("dragToScroll", err);
            }
        }
    }

    export module Util {
        export function setupDragToScroll(e:HTMLElement)
        {
            (<any>e).scrollEnabled = true;
            if (Browser.isMobileSafari) {
                e.style.boxSizing = "border-box";
                e.style.overflowY = "scroll";
                e.className += " iOSScroll";
            } else if (Browser.builtinTouchToPan) {
                e.style.boxSizing = "border-box";
                e.style.overflowY = "auto";
            } else {
                e.style.overflowY = "hidden";
                var d = new DragToScrollHandler(e);
                d.init();
            }
        }

        export function resetDragToScroll(e:HTMLElement)
        {
            (<any>e).scrollEnabled = false;
            if (Browser.builtinTouchToPan || Browser.isMobileSafari) {
                e.style.boxSizing = "";
                e.style.overflowX = "";
                e.style.overflowY = "";
                if (Browser.isMobileSafari)
                    e.className = e.className.replace(/iOSScroll/g, "");
            } else {
                var d:DragToScrollHandler = (<any>e).dragToScroll;
                if (d) d.unhook();
            }
        }

        export function setupHDragToScroll(e:HTMLElement)
        {
            (<any>e).scrollEnabled = true;
            if (Browser.isMobileSafari) {
                e.style.boxSizing = "border-box";
                e.style.overflowY = "auto";
                e.className += " iOSScroll";
            } else if (Browser.builtinTouchToPan) {
                e.style.boxSizing = "border-box";
                e.style.overflowX = "auto";
                if (Browser.isTrident)
                    e.style.msScrollTranslation = 'vertical-to-horizontal';
            } else {
                e.style.overflowX = "hidden";
                var d = new DragToScrollHandler(e);
                d.horizontal = true;
                d.vertical = false;
                d.init();
            }
        }
    }
}
