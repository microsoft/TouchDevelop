///<reference path='refs.ts'/>
module TDev.RT {
    export class ActionBase
        extends RTValue
    {
    }

    export class PseudoAction extends ActionBase {
        constructor(public run: (rt: Runtime, args: any[]) => void) {
            super();
        }
    }

    export class Event_
        extends RTValue
    {
        public isPageEvent = false;
        public handlers: EventBinding[] = undefined;
        public pendinghandlers: number = 0; //  inQueue <=> (pendinghandlers > 0)
        public isBlocking = true;
        public finalCallback:(s:IStackFrame)=>void;
        public errorHandler:(error:any, s:IStackFrame)=>void;

        public addHandler(f: ActionBase): EventBinding
        {
            var binding = new EventBinding(this, f);
            if (!this.handlers) this.handlers = [];
            this.handlers.push(binding);
            return binding;
        }

        public removeHandler(binding : EventBinding) {
            if (this.handlers) {
                var idx = this.handlers.indexOf(binding);
                if (idx > -1) {
                    this.handlers.splice(idx,1);
                    if (this.handlers.length == 0) this.handlers = undefined;
                }
            }
        }

        public clearHandlers() {
            this.handlers = undefined;
        }


        private awaiters:any[];
        public runAwaiters(args:any)
        {
            if (this.awaiters) {
                var lst = this.awaiters
                this.awaiters = null
                Util.setTimeout(0, () => lst.forEach(a => a(args)))
            }
        }

        public addAwaiter(f:(v:any) => void)
        {
            if (!this.awaiters) this.awaiters = []
            this.awaiters.push(f)
        }


        constructor() {
            super()
        }
    }

    //? A handler attached to an event.
    //@ stem("ev") ctx(general)
    export class EventBinding
        extends RTValue
    {
        constructor(public _event : Event_, public _handler : ActionBase) {
            super();
        }

        //? Detaches the handler from the event.
        public delete_() {
            if (this._event && this._handler) {
                this._event.removeHandler(this);
                this._handler = undefined;
            }
        }

        inQueue: boolean = false;
        public data: any = undefined;
    }
}
