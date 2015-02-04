///<reference path='refs.ts'/>
module TDev.RT {
    //? Correctness helpers
    export module Contract
    {
        //? Specifies a precondition contract for the action; if the condition is false, execution fails. Does nothing for published scripts.
        export function requires(condition: boolean, message : string, s : IStackFrame) {
            if (s.rt.devMode && !condition)
                Util.userError(lf("requirement failed: {0}", message), s.pc, 400);
        }

        //? Checks for a condition; if the condition is false, execution fails. Does nothing for published scripts.
        export function assert(condition: boolean, message : string, s : IStackFrame) {
            if (s.rt.devMode && !condition)
                Util.userError(lf("assertion failed: {0}", message), s.pc);
        }
    }
}
