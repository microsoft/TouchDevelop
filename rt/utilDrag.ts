///<reference path='refs.ts'/>

module TDev
{
    export class DragHandler
        extends ClickHandler
    {
        private offX = 0;
        private offY = 0;
        public lockX = false;
        public lockY = false;
        private isTap = true;
        private lastX = 0;
        private lastY = 0;
        private beginTime = 0;
        public moveElt = true;

        private isIeTouch = false;

        constructor(public helt:HTMLElement, public cb:(tag:string, x:number, y:number, x2:number, y2:number)=>void) {
            super(helt, null)
            this.helt.style.msTouchAction = "none";
            this.helt.style.touchAction = "none";
        }
        public setupVersion() { }

        public clickBegin(pos:any)
        {
            super.clickBegin(pos);
            this.offX = this.helt.offsetLeft - this.begX;
            this.offY = this.helt.offsetTop - this.begY;
            this.beginTime = Util.now();
            this.isTap = true;
            this.lastX = this.begX;
            this.lastY = this.begY;
            this.cb("drag", 0, 0, this.begX, this.begY);
        }

        public onMove(pos:any)
        {
            this.lastX = pos.pageX;
            this.lastY = pos.pageY;
            if (this.lockX) this.lastX = this.begX;
            if (this.lockY) this.lastY = this.begY;
            if (this.moveElt) {
                this.helt.style.left = this.offX + this.lastX + "px";
                this.helt.style.top = this.offY + this.lastY + "px";
            }
            var dx = this.lastX - this.begX;
            var dy = this.lastY - this.begY;
            if (Math.abs(dx) > 10 || Math.abs(dy) > 10) this.isTap = false;
            this.cb("move", dx, dy, undefined, undefined)
        }

        public fireClick(pos:any)
        {
            if (Util.now() - this.beginTime > 300) this.isTap = false;
            this.clear();
            this.cb("release", this.lastX - this.begX, this.lastY - this.begY, <any>this.isTap, undefined);
        }

        public prepareMouseOverlay()
        {
            if (this.isIeTouch)
                this.mouseCaptureOverlay = this.helt;
            else
                this.mouseCaptureOverlay = document.body;
        }

        public hideMouseOverlay()
        {
        }

        public handleEvent(e:MouseEvent) {
            try {
                if (this.skipIt(e)) return;

                e.stopPropagation();
                e.preventDefault();
                this.isIeTouch = (<MSPointerEvent>e).pointerType == 2;
                if ((<MSPointerEvent>e).preventMouseEvent) {
                    (<MSPointerEvent>e).preventMouseEvent();
                    // TDev.elt("leftPaneContent").style.overflowY = "hidden";
                    // TDev.elt("leftPaneContent").style.msContentZooming = "hidden";
                    //TDev.elt("leftPaneContent").style.msTouchAction = "none";
                    // helt.style.msTouchAction = "none";
                }
                if ((<MSPointerEvent>e).preventManipulation) {
                    (<MSPointerEvent>e).preventManipulation();
                }
                super.handleEvent(e);
            } catch (err) {
                Util.reportError("dragHandler", err);
            }
        }
    }
}
