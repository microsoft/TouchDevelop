///<reference path='../refs.ts'/>

module TDev {
    import J = AST.Json

    export module Microbit {
        export function compile(a: J.JApp) {
            return (new Emitter()).visit({}, a);
        }
    }
}
