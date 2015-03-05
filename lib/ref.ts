///<reference path='refs.ts'/>
module TDev.RT {
    //? A reference to a value
    //@ stem("ref") icon("fa-gift")
    export class Ref<T>
        extends RTValue
    {
        constructor() {
            super()
        }

        private _item: T;

        //? Get the current value of the reference
        //@ name("\u25C8get")
        public _get(s:IStackFrame) : T
        {
            return this._item;
        }

        //? Check if reference has been written to the storage/server
        //@ name("\u25C8confirmed")
        public _confirmed(s:IStackFrame) : boolean
        {
            return true;
        }

        //? Set the value of the reference
        //@ name("\u25C8set")
        public _set(t:T, s:IStackFrame)
        {
            this._item = t;
        }

        //? Set reference to invalid
        //@ name("\u25C8clear")
        public _clear(s:IStackFrame)
        {
            this._set(undefined, s)
        }

        //? Retrive the reference itself (useful on globals and fields)
        //@ name("\u25C8ref")
        public _ref(s:IStackFrame) : Ref<T>
        {
            return this;
        }

        //? Add specified value to given reference
        //@ name("\u25C8add") onlyOn(Number)
        public _add(v:number, s:IStackFrame)
        {
            this._set(<any>(<any>this._get(s) + v), s)
        }

        //? Set reference to `v` if it's currently non-empty
        //@ name("\u25C8test and set") onlyOn(String)
        public _test_and_set(v:T, s:IStackFrame)
        {
            if (!this._get(s))
                this._set(v, s)
        }

        //? Create a new ref, that invokes `on changed` whenever the update is performed through it
        //@ name("\u25C8with notify")
        //@ dbgOnly
        public _with_notify(on_changed:Action, s:IStackFrame) : Ref<T>
        {
            return new RefWithNotify<T>(this, on_changed);
        }
    }

    export class GlobalVarRef
        extends Ref<RTValue>
    {
        constructor(private d:any, private fieldname:string)
        {
            super()
        }

        static mk(d:any, fieldname:string)
        {
            return new GlobalVarRef(d, fieldname)
        }

        public _set(v:RTValue, s:IStackFrame)
        {
            this.d[this.fieldname] = v
        }

        public _get(s:IStackFrame) : RTValue
        {
            return this.d[this.fieldname]
        }
    }

    export class PersistedVarRef
        extends Ref<RTValue>
    {
        constructor(private container: PersistentVars, private fieldname: string) {
            super()
        }

        static mk(container: PersistentVars, fieldname: string) {
            return new PersistedVarRef(container, fieldname)
        }

        public _set(v: RTValue, s: IStackFrame) {
            this.container.perform_set(this.fieldname, v, s)
        }

        public _get(s: IStackFrame): RTValue {
            return this.container.perform_get(this.fieldname, s)
        }

        public _clear(s: IStackFrame) {
            this.container.perform_clear(this.fieldname, s)
        }

        public _add(v: number, s: IStackFrame) {
            this.container.perform_add(this.fieldname, <any>v, s)
        }

        public _test_and_set(v: RTValue, s: IStackFrame) {
            this.container.perform_test_and_set(this.fieldname, v, s)
        }

        public _confirmed(s: IStackFrame): boolean {
            return this.container.perform_confirmed(this.fieldname)
        }
    }


    export class FieldRef
        extends Ref<RTValue>
    {
        constructor(private entry:RecordEntry, private fieldname:string)
        {
            super()
        }

        static mk(entry:RecordEntry, fieldname:string)
        {
            return new FieldRef(entry, fieldname)
        }

        public _set(v:RTValue, s:IStackFrame)
        {
            this.entry.perform_set(this.fieldname, v, s)
        }

        public _get(s:IStackFrame)
        {
            return this.entry.perform_get(this.fieldname, s)
        }

        public _clear(s:IStackFrame)
        {
            this.entry.perform_clear(this.fieldname, s)
        }

        public _add(v:number, s:IStackFrame)
        {
            this.entry.perform_add(this.fieldname, <any>v, s)
        }

        public _test_and_set(v:RTValue, s:IStackFrame)
        {
            this.entry.perform_test_and_set(this.fieldname, v, s)
        }

        public _confirmed(s:IStackFrame) : boolean
        {
            return this.entry.perform_confirmed(this.fieldname, s)
        }

    }

    class RefWithNotify<T>
        extends Ref<T>
    {
        private ev:Event_;

        constructor(private ref:Ref<T>, on_changed:Action)
        {
            super()

            this.ev = new Event_();
            this.ev.addHandler(on_changed);
        }

        private notify(s:IStackFrame)
        {
            s.rt.queueLocalEvent(this.ev, undefined, true, true);
        }

        public _set(v:T, s:IStackFrame)
        {
            this.ref._set(v, s);
            this.notify(s)
        }

        public _get(s:IStackFrame)
        {
            return this.ref._get(s);
        }

        public _clear(s:IStackFrame)
        {
            this.ref._clear(s);
            this.notify(s);
        }

        public _add(v:number, s:IStackFrame)
        {
            this.ref._add(v, s);
            this.notify(s);
        }

        public _test_and_set(v:T, s:IStackFrame)
        {
            this.ref._test_and_set(v, s);
            this.notify(s);
        }

        public _confirmed(s:IStackFrame)
        {
            return this.ref._confirmed(s)
        }
    }
}
