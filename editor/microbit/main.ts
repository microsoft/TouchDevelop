///<reference path='../refs.ts'/>

module TDev {
    import J = AST.Json

    export module Microbit {
        export function compile(a: J.JApp): string {
            return (new Emitter()).visit(emptyEnv, a).code;
        }
    }
}
