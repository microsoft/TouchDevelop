///<reference path='refs.ts'/>

module TDev.RT {
    //? Arithmetic and bitwise operations on 32 bit integers
    //@ skill(3)
    export module Bits
    {
        //? Add two unsigned 32 bit numbers
        export function add_uint32(x:number, y:number):number { return (x + y) >>> 0; }

        //? Subtract two unsigned 32 bit numbers
        export function subtract_uint32(x:number, y:number):number { return (x - y) >>> 0; }

        //? Multiply two unsigned 32 bit numbers
        export function multiply_uint32(x:number, y:number):number { return Util.intMult(x, y) >>> 0; }

        //? Add two signed 32 bit numbers
        export function add_int32(x:number, y:number):number { return (x + y) | 0; }

        //? Subtract two signed 32 bit numbers
        export function subtract_int32(x:number, y:number):number { return (x - y) | 0; }

        //? Multiply two signed 32 bit numbers
        export function multiply_int32(x:number, y:number):number { return Util.intMult(x, y) | 0; }

        //? Perform bitwise and (`&` in C)
        export function and_uint32(x:number, y:number):number { return (x & y) >>> 0; }

        //? Perform bitwise or (`|` in C)
        export function or_uint32(x:number, y:number):number { return (x | y) >>> 0; }

        //? Perform bitwise and (`&` in C) on signed integers
        export function and_int32(x:number, y:number):number { return (x & y); }

        //? Perform bitwise or (`|` in C) on signed integers
        export function or_int32(x:number, y:number):number { return (x | y); }

        //? Perform bitwise exclusive or (`^` in C)
        export function xor_uint32(x:number, y:number):number { return (x ^ y) >>> 0; }

        //? Perform bitwise negation (`~` in C)
        export function not_uint32(x:number):number { return (~x) >>> 0; }

        //? Shift `x` by `bits` left (`<<` in C)
        export function shift_left_uint32(x:number, bits:number):number { return (x << bits) >>> 0; }

        //? Shift `x` by `bits` right (`>>` in C, `>>>` in JavaScript)
        export function shift_right_uint32(x:number, bits:number):number { return x >>> bits; }

        //? Rotate `x` by `bits` left (rotl)
        export function rotate_left_uint32(x:number, bits:number):number { return ((x << bits) | (x >>> (32 - bits))) >>> 0; }

        //? Rotate `x` by `bits` right (rotr)
        export function rotate_right_uint32(x:number, bits:number):number { return ((x >>> bits) | (x << (32 - bits))) >>> 0; }

        //? Creates an empty binary buffer of `size` bytes
        //@ [size].defl(32) [result].writesMutable
        export function create_buffer(size:number): Buffer { return Buffer.mk(size); }

        //? Decodes string into a binary buffer
        //@ [encoding].deflStrings("base64", "hex", "binary", "utf8", "utf16le")
        export function string_to_buffer(s:string, encoding:string) : Buffer { return Buffer.fromString(s, encoding); }

        // TODO: is this correct?
        // Divide two signed 32 bit numbers
        export function divide_int32(x:number, y:number):number { return Math.floor(x / y) | 0; }
    }
}
