///<reference path='../refs.ts'/>

module TDev {
    import J = AST.Json

    export module Microbit {
        export class Emitter extends JsonAstVisitor<{}, string> {
        }
    }
}
