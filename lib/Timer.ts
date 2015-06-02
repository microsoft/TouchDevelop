///<reference path='refs.ts'/>

module TDev.RT {
    //? A timer
    //@ icon("timer") ctx(general,gckey)
    export class Timer
        extends RTValue
    {
        public handlerEvent: RT.Event_;
        private version : number;
        private armed = false;
        private active = true;

        constructor(private rt : Runtime, public interval: number, public oneTime: boolean = true) {
            super();
            this.version = rt.versionNumber;
            this.handlerEvent = new RT.Event_();
        }

        //? Clears the handlers and pauses the timer
        //@ writesMutable
        public clear() {
            this.handlerEvent.clearHandlers();
            this.pause();
        }

        //? sets the action to perform when the timer fires
        //@ writesMutable
        //@ ignoreReturnValue
        public on_trigger(body: Action): EventBinding {
            var b = this.handlerEvent.addHandler(body);
            this.arm();
            return b;
        }

        //? is the timer active
        public is_active(): boolean {
            return this.active;
        }

        //? is this an interval timer that fires regularly
        public is_interval(): boolean {
            return !this.oneTime;
        }

        //? set the regular interval in seconds at which this timer fires
        //@ writesMutable
        //@ [seconds].defl(1)
        public set_interval(seconds: number) {
            this.interval = seconds;
            this.oneTime = false;
        }

        //? set the time in seconds after which this timer fires once
        //@ writesMutable
        //@ [seconds].defl(1)
        public set_timeout(seconds: number) {
            this.interval = seconds;
            this.oneTime = true;
        }

        //? deactivates the timer
        //@ writesMutable
        public pause() {
            this.active = false;
        }

        //? reactives the timer
        //@ writesMutable
        public resume() {
            this.active = true;
            this.arm();
        }

        private arm() {
            if (this.armed || this.rt.isStopped() || this.version != this.rt.versionNumber) {
                return;
            }
            var milli = this.interval * 1000;
            var eventHandler = () => {
                this.armed = false;
                if (this.version != this.rt.versionNumber)
                    return;

                if (this.oneTime) {
                    this.active = false;
                }
                else {
                    if (this.rt &&
                        this.handlerEvent.handlers &&
                        this.active &&
                        !this.armed) {
                        this.armed = true;
                        Util.setTimeout(milli, eventHandler);
                    }
                }
                if (this.handlerEvent.pendinghandlers == 0)
                    this.rt.queueLocalEvent(this.handlerEvent);
            }

            if (this.rt &&
                this.handlerEvent.handlers &&
                this.active &&
                !this.armed) {
                this.armed = true;
                Util.setTimeout(milli, eventHandler);
            }
        }
    }
}
