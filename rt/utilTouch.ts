///<reference path='refs.ts'/>

module TDev
{
    export class TouchHandler
        extends ClickHandler
    {
        private offX = 0;
        private offY = 0;
        private lockX = false;
        private lockY = false;
        private lastX = 0;
        private lastY = 0;

        private isIeTouch = false;

        constructor(public helt:HTMLElement, public cb:(tag:string, x:number, y:number)=>void) {
            super(helt, null)
            this.helt.style.touchAction = "none";
            this.helt.style.msTouchAction = "none";
        }
        public setupVersion() { }

        private getRelativePos(pos: any) {
            if (Util.mouseLogging) {
                Util.log("touch handler ");
                var apos = this.getPosition(this.helt);
                Util.log("pageX:{0} pageY:{1} offsetX:{2} offsetY:{3} clientX:{4} clientY:{5} eltX:{6} eltY:{7}", pos.pageX, pos.pageY, pos.offsetX, pos.offsetY, pos.clientX, pos.clientY, apos.x, apos.y);
            }

            //if (pos.offsetX) return pos;
            var x:number, y:number;

            if (pos.pageX) {
                x = pos.pageX;
                y = pos.pageY;
            }
            else {
                x = pos.clientX;
                y = pos.clientY;
            }
            var absPos = this.getPosition(this.helt);
            pos.offX = x - absPos.x;
            pos.offY = y - absPos.y;
            return pos;
        }

        public clickBegin(pos:any)
        {
            super.clickBegin(pos);
            this.getRelativePos(pos);
            if (Util.mouseLogging) {
                Util.log("touchBegin: {0},{1}", pos.offX, pos.offY);
            }
            this.offX = this.helt.offsetLeft - this.begX;
            this.offY = this.helt.offsetTop - this.begY;
            this.cb("down", pos.offX, pos.offY);
        }

        public onMove(pos:any)
        {
            this.getRelativePos(pos);
            if (Util.mouseLogging) {
                Util.log("onMove: {0},{1}", pos.offX, pos.offY);
            }
            this.cb("move", pos.offX, pos.offY);
        }

        public fireClick(pos:any)
        {
            this.getRelativePos(pos);
            if (Util.mouseLogging) {
                Util.log("touchEnd: {0},{1}", pos.offX, pos.offY);
            }
            this.clear();
            this.cb("up", pos.offX, pos.offY);
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
