///<reference path='refs.ts'/>
module TDev.RT {
    //? A task created with `async` keyword
    //@ stem("task")
    export class Task<T>
        extends RTValue
    {
        private _completed:boolean = false;
        private _value:T;
        private _awaitQueue:ResumeCtx[];

        //? Check if the task is done yet
        public completed() : boolean
        {
            return this._completed;
        }

        public resume(v:T)
        {
            Util.assert(!this._completed)
            this._completed = true;
            this._value = v;
            this.runAwaiters();
        }

        //? Wait for the task to finish, and return any possible value
        //@ async returns(T)
        public await(r:ResumeCtx)
        {
            if (this._completed) {
                // r.resumeVal(this._value);
                r.rt.queueAsyncEvent(() => {
                    return r.rt.continueStackFrame(this._value, r.stackframe)
                })
            } else {
                if (!this._awaitQueue)
                    this._awaitQueue = [r];
                else
                    this._awaitQueue.push(r);
            }
        }

        //? Get the value of the task, which must have completed.
        public value():T
        {
            if (!this._completed)
                Util.userError(lf("cannot get value - task has not completed yet"))
            return this._value
        }

        //? Wait for the task to finish for at most `seconds`; returns invalid in case of timeout
        //@ async returns(T)
        public await_at_most(seconds:number, r:ResumeCtx)
        {
            this.await(r)
            if (!this._completed) {
                Util.setTimeout(seconds * 1000, () => {
                    if (this._awaitQueue) {
                        var idx = this._awaitQueue.indexOf(r)
                        if (idx >= 0) {
                            this._awaitQueue.splice(idx, 1)
                            r.rt.queueAsyncEvent(() => {
                                return r.rt.continueStackFrame(undefined, r.stackframe)
                            })
                        }
                    }
                })
            }
        }

        private runAwaiters()
        {
            var q = this._awaitQueue
            if (!q) return;
            this._awaitQueue = null
            q.forEach(r => {
                r.rt.queueAsyncEvent(() => {
                    return r.rt.continueStackFrame(this._value, r.stackframe)
                })
            })
        }
    }

    export class TaskResumeCtx
        extends ResumeCtx
    {
        constructor(public task:Task<any>, s:IStackFrame)
        {
            super(s)
        }

        public resumeCore(v:any)
        {
            this.task.resume(v);
        }

        public isTaskCtx() { return true }
    }
}
