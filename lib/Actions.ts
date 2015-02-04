///<reference path='refs.ts'/>
module TDev.RT {

    //? A place to hook up an action to execute in response to an event
    //@ ctx(general) isAction
    export class Action
        extends ActionBase
    {
        //? Run the inline action.
        public run() : void { }
    }

    //? A place to hook up an action to execute in response to an event
    //@ ctx(general) isAction
    export class TextAction
        extends ActionBase
    {
        //? Run the inline action.
        public run(text:string) : void { }
    }

    //? A place to hook up an action to execute in response to an event
    //@ ctx(general) isAction
    export class NumberAction
        extends ActionBase {
        //? Run the inline action.
        public run(x: number): void { }
    }

    //? A place to hook up an action to execute in response to an event
    //@ ctx(general) isAction
    export class BooleanAction
        extends ActionBase {
        //? Run the inline action.
        public run(boolean: boolean): void { }
    }


    //? A place to hook up an action to execute in response to an event
    //@ ctx(general) isAction
    export class PositionAction
        extends ActionBase
    {
        //? Run the inline action.
        public run(x:number, y:number) : void { }
    }

    //? A place to hook up an action to execute in response to an event
    //@ ctx(general) isAction
    export class SpriteAction
        extends ActionBase
    {
        //? Run the inline action.
        public run(sprite:Sprite) : void { }
    }

    //? A place to hook up an action to execute in response to an event
    //@ ctx(general) isAction
    export class SpriteSetAction
        extends ActionBase
    {
        //? Run the inline action.
        public run(sprites:SpriteSet) : void { }
    }

    //? A place to hook up an action to execute in response to an event
    //@ ctx(general) isAction
    export class VectorAction
        extends ActionBase
    {
        //? Run the inline action.
        public run(x:number, y:number, delta_x:number, delta_y:number) : void { }
    }

    //? A place to hook up an action to execute in response to an event
    //@ ctx(general) isAction
    export class WebResponseAction
        extends ActionBase
    {
        //? Run the inline action.
        public run(response:WebResponse) : void { }
    }

    //? A place to hook up an action to execute in response to an event
    //@ ctx(general) isAction
    export class CollectionMessageAction
        extends ActionBase
    {
        //? Run the inline action.
        public run(msgs:Collection<Message>) : void { }
    }

    //? A place to hook up an action to execute in response to an event
    //@ ctx(general) isAction
    export class JsonAction
        extends ActionBase {
        //? Run the inline action.
        public run(json: JsonObject): void { }
    }

    //? An atomic comparison action
    //@ stem("cmp") ctx(general) isAction isAtomic
    export class Comparison<Elt>
        extends ActionBase
    {
        //? Run the inline action.
        public run(a:Elt, b:Elt) : number { return 0 }
    }

    //? An atomic predicate test
    //@ stem("cmp") ctx(general) isAction isAtomic parameterPrefixes("on")
    export class Predicate<Elt>
        extends ActionBase
    {
        //? Run the inline action.
        public run(elt:Elt) : boolean { return false }
    }

    //? An atomic action with no arguments
    //@ stem("op") ctx(general) isAction isAtomic
    export class AtomicAction
        extends ActionBase
    {
        //? Run the inline action.
        public run() : void { }
    }

    //? An atomic single argument action
    //@ stem("op") ctx(general) isAction isAtomic parameterPrefixes("taking")
    export class AtomicAction1<T>
        extends ActionBase
    {
        //? Run the inline action.
        public run(v:T) : void { }
    }

    //? A possibly non-atomic single argument action
    //@ stem("op") ctx(general) isAction parameterPrefixes("taking")
    export class Action1<T>
        extends ActionBase
    {
        //? Run the inline action.
        public run(v:T) : void { }
    }

    //? An atomic conversion function to number
    //@ stem("key") ctx(general) isAction isAtomic parameterPrefixes("from")
    export class NumberConverter<Elt>
        extends ActionBase
    {
        //? Run the inline action.
        public run(elt:Elt) : number { return 0 }
    }

    //? An atomic conversion function to string
    //@ stem("key") ctx(general) isAction isAtomic parameterPrefixes("from")
    export class StringConverter<Elt>
        extends ActionBase
    {
        //? Run the inline action.
        public run(elt:Elt) : string { return "" }
    }

    //? A generic atomic conversion function
    //@ stem("cnv") ctx(general) isAction isAtomic parameterPrefixes("from", "to")
    export class Converter<From,To>
        extends ActionBase
    {
        //? Run the inline action.
        public run(elt:From) : To { return undefined }
    }
}
