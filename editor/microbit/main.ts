///<reference path='../refs.ts'/>

module TDev {
    import J = AST.Json

    export module Microbit {
        export function compile(a: J.JApp): string {
            lift(a);
            return (new Emitter()).visit(emptyEnv, a);
        }
    }
}
