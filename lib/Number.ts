///<reference path='refs.ts'/>
module TDev { export module RT {
    //? A number (possibly negative and/or fractional)
    //@ stem("x") icon("fa-calculator") immutable isData builtin ctx(general,indexkey,cloudfield,json)
    //@ robust
    //@ idempotent
    export module Number_
    {

        //? Converts a number to a string
        export function to_string(self:number) : string { return self.toString(); }
        export function fromArtUrl(url: string) { return Promise.wrap(String_.to_number(url)); }

        //? Prints the number to the wall
        export function post_to_wall(self:number, s:IStackFrame)
        {
            var box = s.rt.postBoxedText(self.toString(), s.pc);
        }

        //? Interprets a number as a unicode value and converts it to the single character string
        export function to_character(self: number): string {
            var c = Math.round(self);
            if (c < -0x8000 || c > 0xFFFF) return undefined;
            c &= 0xFFFF;
            return String.fromCharCode(c);
        }

        //? Interprets the number as a ARGB (alpha, red, green, blue) color
        export function to_color(self:number) : Color { return Color.fromInt32(self); }

        export function picker()
        {
            var inp = HTML.mkTextInput("number", lf("number"));
            return <IPicker>{
                html: inp,
                validate: () => /^[+-]?[0-9]+(\.[0-9]+)?$/.test(inp.value),
                get: () => parseFloat(inp.value),
                set: function(v) { inp.value = v + "" }
            };
        }

        //? Converts the value into a json data structure.
        export function to_json(self: number): JsonObject {
            return JsonObject.wrap(self);
        }

        //? Adds numbers
        //@ name("+") infixPriority(10) inlineApply("+")
        export function add(self: number, other: number) : number { return 0; }

        //? Subtracts numbers
        //@ name("-") infixPriority(10) inlineApply("-")
        export function subtract(self: number, other: number) : number { return 0; }

        //? Multiplies numbers
        //@ name("*") infixPriority(20) inlineApply("*")
        export function multiply(self: number, other: number) : number { return 0; }

        //? Divides numbers
        //@ name("/") infixPriority(20) inlineApply("/")
        export function divide(self: number, other: number) : number { return 0; }

        //? Compares numbers for equality
        //@ name("=") infixPriority(5) inlineApply("===")
        export function eq(self: number, other: number) : boolean { return false; }

        //? Compares numbers for disequality
        //@ name("\u2260") infixPriority(5) inlineApply("!==")
        export function neq(self: number, other: number) : boolean { return false; }

        //? Compares numbers for less or equal
        //@ name("\u2264") infixPriority(5) inlineApply("<=")
        export function le(self: number, other: number) : boolean { return false; }

        //? Compares numbers for less
        //@ name("<") infixPriority(5) inlineApply("<")
        export function lt(self: number, other: number) : boolean { return false; }

        //? Compares numbers for more or equal
        //@ name("\u2265") infixPriority(5) inlineApply(">=")
        export function ge(self: number, other: number) : boolean { return false; }

        //? Compares numbers for more
        //@ name(">") infixPriority(5) inlineApply(">")
        export function gt(self: number, other: number) : boolean { return false; }
    }
} }
