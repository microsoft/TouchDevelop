///<reference path='refs.ts'/>

module TDev
{
    export class Animation
    {
        private running = false;
        public beginValue = 0;
        public delay = 0;
        public endValue = 1;
        public duration = 1000;
        public frameLength = 30;
        private beginTime = 0;
        public completed : () => void;
        public quadratic = true;
        constructor(public update : (v:number) => void) {
            this.stepFn = () => { this.step() };
        }
        private stepFn:()=>void;

        public begin()
        {
            var run = () => {
                this.beginTime = new Date().getTime();
                this.step();
            }

            this.running = true;
            if (this.delay > 0)
                window.setTimeout(run, this.delay);
            else
                (<any>run)(); // STRBUG w/ intellisense this cast is needed
        }

        public complete()
        {
            if (this.running) {
                this.running = false;
                this.update(this.endValue);
                if (!!this.completed) this.completed();
            }
        }

        public stop()
        {
            this.running = false;
        }

        private step():void
        {
            try {
                if (!this.running) return;
                var now = new Date().getTime();
                if (now > this.beginTime + this.duration || Browser.noAnimations) {
                    this.complete();
                    return;
                }
                var phase = 1 - (now - this.beginTime) / this.duration;
                if (this.quadratic)
                    phase = (this.beginValue - this.endValue) * phase * phase + this.endValue;
                else
                    phase = (this.beginValue - this.endValue) * phase + this.endValue;
                this.update(phase);
                window.setTimeout(this.stepFn, this.frameLength);
            } catch (err) {
                Util.reportError("animation", err);
            }
        }

        static fadeIn(elt:HTMLElement, duration : number = 300)
        {
            var a = new Animation((v:number) => {
                elt.style.opacity = v + "";
            });
            a.duration = duration;
            return a;
        }

        static fadeOut(elt:HTMLElement, duration : number = 300)
        {
            var a = new Animation((v:number) => {
                if (v == 0) elt.removeSelf();
                else elt.style.opacity = v + "";
            });
            a.beginValue = 1;
            a.endValue = 0;
            a.duration = duration;
            return a;
        }
    }
}
