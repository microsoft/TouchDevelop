///<reference path='refs.ts'/>
module TDev.RT {
    //? time and dates
    //@ robust
    export module Time
    {
        var _rt : Runtime;
        var everyFrameTimer : Timer;

        export function rt_start(rt: Runtime): void
        {
            _rt = rt;
            everyFrameTimer = undefined;
        }
        export function rt_stop(rt: Runtime)
        {
            _rt = undefined;
            if (everyFrameTimer) everyFrameTimer.pause();
            everyFrameTimer = undefined;
        }

        //? Attaches a handler to run on every time frame, roughly every 20ms.
        //@ writesMutable
        //@ ignoreReturnValue
        export function on_every_frame(perform : Action, s : IStackFrame) : EventBinding {
            if (!everyFrameTimer) everyFrameTimer = new Timer(s.rt, 0.02,false);
            return everyFrameTimer.on_trigger(perform);
        }

        //? Starts a timer to run ``perform`` after ``seconds`` seconds.
        //@ writesMutable
        //@ ignoreReturnValue [seconds].defl(1)
        export function run_after(seconds : number, perform : Action, s : IStackFrame) : Timer {
            seconds = Math.max(0.02, seconds);
            var timer = new Timer(s.rt, seconds, true);
            timer.on_trigger(perform);
            return timer;
        }

        //? Starts a timer to run ``perform`` every ``seconds`` seconds.
        //@ writesMutable
        //@ [seconds].defl(1) ignoreReturnValue
        export function run_every(seconds : number, perform : Action, s : IStackFrame) : Timer {
            seconds = Math.max(0.02, seconds);
            var timer = new Timer(s.rt, seconds, false);
            timer.on_trigger(perform);
            return timer;
        }

        //? Waits for a specified amount of seconds
        //@ [seconds].defl(1)
        //@ async
        export function sleep(seconds: number, s: ResumeCtx): void {
            s.rt.yield_now();
            Util.setTimeout(seconds * 1000, function () {
                s.rt.yield_now();
                s.resume();
            });
        }

        //? Gets the current time
        //@ tandre
        export function now(s?: IStackFrame): DateTime {
            if (s)
                s.rt.registerTimeDependency();
            return DateTime.mk(new Date());
        }

        //? Gets today's date without time
        //@ tandre
        export function today() : DateTime { return now().date(); }

        //? Gets tomorrow's date without time
        //@ tandre
        export function tomorrow() : DateTime { return today().add_days(1); }

        //? Use `app->fail_if_not` instead.
        //@ [condition].defl(true) obsolete
        export function fail_if_not(condition:boolean) : void
        {
            App.fail_if_not(condition);
        }

        //? Use `app->stop` instead.
        //@ hidden
        export function stop(r:ResumeCtx) : void
        {
            App.stop(r);
        }

        //? Use `app->log` instead.
        //@ hidden
        export function log(message: string): void
        {
            App.log(message);
        }

        //? Use `app->stop` instead.
        //@ hidden
        export function stop_and_close(r:ResumeCtx) : void
        {
            App.stop(r);
        }

        //? Creates a new date instance
        //@ [year].defl(2000) [month].defl(1) [day].defl(1) [hour].defl(12)
        export function create(year: number, month: number, day: number, hour: number, minute: number, second: number): DateTime
        {
            return DateTime.mkFull(year, month, day, hour, minute, second);
        }
    }
}
