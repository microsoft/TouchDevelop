///<reference path='refs.ts'/>
module TDev { export module RT {
    //? An general enumerator
    //@ ctx(none)
    export class Enumerator
        extends RTValue
    {
        constructor() {
            super()
        }

        //? Return current value
        //@ stub
        public current() : void
        { }

        //? Advance enumerator and return true if there is another element.
        //@ stub
        public move_next() : boolean
        { return undefined; }

    }
} }
