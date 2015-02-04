///<reference path='refs.ts'/>
module TDev { export module RT {
    //? true or false
    //@ stem("b") icon("CheckBox") immutable isData builtin ctx(general,indexkey,cloudfield,json)
    //@ robust
    export module Boolean_
    {

        //? Indicates that the two values are equal
        export function equals(self:boolean, right:boolean) : boolean { return self === right; }

        //? Negates the boolean expression
        //@ infixPriority(4)
        export function not(self:boolean) : boolean { return !self; }

        //? Builds conjunction
        //@ infixPriority(3)
        export function and(self:boolean, right:boolean) : boolean { return self && right; }
        // not really used

        //? Builds disjunction
        //@ infixPriority(2)
        export function or(self:boolean, right:boolean) : boolean { return self || right; }
        // not really used

        //? Converts a boolean to a string
        export function to_string(self:boolean) : string { return self ? "true" : "false"; }

        //? Converts true to 1 and false to 0
        export function to_number(self:boolean) : number { return self ? 1 : 0; }

        //? Displays the value on the wall
        export function post_to_wall(self:boolean, s:IStackFrame)
        {
            s.rt.postBoxedText(to_string(self), s.pc);
        }

        export function from_string(s: string) { return s === "true"; }

        export function picker()
        {
            var inp = HTML.mkCheckBox(lf("true?"));
            return <IPicker>{
                html: inp,
                validate: () => true,
                get: () => HTML.getCheckboxValue(inp),
                set: (v) => HTML.setCheckboxValue(inp, v)
            };
        }

        //? Converts the value into a json data structure.
        export function to_json(self: boolean): JsonObject {
            return JsonObject.wrap(self);
        }
    }
} }
