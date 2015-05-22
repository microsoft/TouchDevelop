///<reference path='refs.ts'/>

module TDev
{
    export class LiveViewMgr
    {
        private visible = false;
        private liveTimer:RefreshTimer;
        private liveRefreshSupported = false;
        private liveRefreshWaiting = false;
        private liveWallDiv = div(null);



        constructor()
        {
            this.liveTimer = new RefreshTimer(100, () => this.liveRefresh());
        }

        public reset()
        {
            this.liveRefreshSupported = false;
        }

        public poke()
        {
            if (this.visible)
                this.liveTimer.restart()
        }

        private update()
        {
            LayoutMgr.instance.CoreLayout();
        }

        public show() {
            //TheEditor.showLive(this.liveWallDiv)
            this.update()
            this.visible = true;
        }

        public hide() {
            if (!this.visible)
                return;
            this.visible = false;
        }

        private liveRefresh()
        {
            if (!this.visible || !Script) return;

            if (!TheEditor.currentRt.isStopped()) {
                this.liveRefreshWaiting = true;
                return;
            }
            this.liveRefreshWaiting = false;

            var act = TheEditor.currentAction();
            if (!act) return;

            if (act.hasErrors()) {
                //this.errDiv.setChildren(["current function has errors"]);
                //this.searchApi.removeLiveView();
                return;
            } else if (Script.getGlobalErrorDecl(false)) {
                ///this.errDiv.setChildren(["script has errors"]);
                //this.searchApi.removeLiveView();
                return;
            }

            var prevExn = TheEditor.host.numExceptions
            TheEditor.runSidePage(() => {
                //this.errDiv.setChildren([TheEditor.sideHost.exceptionThrown ? "something went wrong, resume the script for details" : "live view"]);
                //LayoutMgr.instance.createZoomingUI(this.searchApi.liveWallDiv);
                //sideWall.style.opacity = "1";
                //Util.childNodes(this.searchApi.liveWallDiv).forEach((node) => {
                //    if ((<HTMLElement>node).className == "sideWall" && node != sideWall) {
                //        node.removeSelf();
                //   }
                // });
                if (prevExn == TheEditor.host.numExceptions)
                    this.update()
                //else
                //   this.searchApi.removeLiveView();

                if (this.liveRefreshWaiting) this.poke();
            });
        }


    }
}
