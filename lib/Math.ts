
///<reference path='refs.ts'/>

module TDev.RT {
    //? Math goodness, abs, max, ...
    //@ robust
    export module Math_
    {
        //? Maps an integer value from one range to another. Does not contrain the value.
        //@ [result].writesMutable
        //@ [in_max].defl(1023) [out_max].defl(4)
        export function map_range(x: number, in_min: number, in_max: number, out_min: number, out_max: number): number {
            return Bits.add_int32(out_min,
                Bits.multiply_int32(
                    Bits.subtract_int32(x, in_min),                
                    Bits.divide_int32(
                        Bits.subtract_int32(out_max, out_min),
                        Bits.subtract_int32(in_max, in_min)
                    )
                )
            );
        }
        
        //? Creates a matrix of zeros of a given size
        //@ [result].writesMutable
        //@ [rows].defl(3) [columns].defl(3)
        export function create_matrix(rows: number, columns: number): Matrix { return Matrix.mk(rows, columns); }

        //? Returns the smallest integral value greater than or equal to the specified number
        export function ceiling(x:number) : number { return Math.ceil(x); }

        //? Returns the largest integer less than or equal to the specified number
        export function floor(x:number) : number { return Math.floor(x); }

        //? Returns a specified number raised to the specified power
        export function pow(x:number, y:number) : number { return Math.pow(x, y); }

        //? Returns a random integral number between `min` and `max` included.
        //@ tandre
        //@ [min].defl(-100) [max].defl(100)
        export function random_range(min: number, max: number): number {
            var r = Math_.random(max - min + 1);
            if (r == undefined) return undefined;
            return min + r;
        }

        //? Returns a random integral number bounded between limit and 0, not including limit unless it is 0
        //@ tandre
        //@ [limit].defl(2) oldName("rand")
        export function random(limit: number): number {
            var max = Math.round(limit);
            if (max == 0) return 0;
            if (is_inf(max) || is_nan(max)) return undefined; // TODO: we could support infinity
            var r = max;
            while (r == max) r = Random.normalized() * (max); // supposedly can happen because of floating-point behavior
            return Math.floor(r);
        }

        //? Returns a random floating-point number x: 0 ≤ x < 1
        //@ tandre
        export function random_normalized() : number { return Random.normalized(); }

        //? Renamed to 'random normalized'
        //@ hidden
        //@ tandre
        export function rand_norm() : number { return random_normalized(); }

        //? Returns the result of integer division of one number by another number
        export function div(x:number, y:number) : number { return (x / y)|0; }

        //? Returns the modulus resulting from the division of one number by another number
        export function mod(x:number, y:number) : number { return x % y; }

        //? Returns the absolute value of a number
        export function abs(x:number) : number { return Math.abs(x); }

        //? Returns the angle whose cosine is the specified number
        export function acos(x:number) : number { return Math.acos(x); }

        //? Returns the angle whose sine is the specified number
        export function asin(x:number) : number { return Math.asin(x); }

        //? Returns the angle whose tangent is the specified number
        export function atan(x:number) : number { return Math.atan(x); }

        //? Returns the angle whose tangent is the quotient of two specified numbers
        export function atan2(y:number, x:number) : number { return Math.atan2(y,x); }

        //? Returns the cosine of the specified angle (in radians)
        export function cos(angle:number) : number { return Math.cos(angle); }

        //? Returns the natural logarithmic base, specified by the constant, e
        export function e() : number { return Math.E; }

        //? Returns e raised to the specified power
        export function exp(x:number) : number { return Math.exp(x); }

        //? Returns the logarithm of a specified number in a specified base
        export function log(x:number, base:number) : number {
            return base == 0 || base == 1 ? NaN : Math.log(x) / Math.log(base);
        }

        //? Returns the natural (base e) logarithm of a specified number
        export function loge(x:number) : number { return Math.log(x); }

        //? Returns the base 10 logarithm of a specified number
        export function log10(x:number) : number { return log(x, 10); }

        //? Returns the larger of two numbers
        export function max(x:number, y:number) : number { return Math.max(x,y); }

        //? Returns the smaller of two numbers
        export function min(x:number, y:number) : number { return Math.min(x,y); }

        //? Returns the Pi constant
        //@ name("\u03C0")
        export function pi() : number { return Math.PI; }

        //? Returns the gravity constant (9.80665)
        export function gravity() : number { return 9.80665; }

        //? Rounds a number to the nearest integral value
        export function round(x:number) : number { return x < 0 ? Math.ceil(x - 0.5) : Math.floor(x + 0.5); }

        //? Returns a value indicating the sign of a number
        export function sign(x:number) : number
        {
            if (x < 0) return -1; else if (x > 0) return 1; else return 0;
        }

        //? Returns the sine of the specified angle (in radians)
        export function sin(angle:number) : number { return Math.sin(angle); }

        //? Returns the square root of a specified number
        export function sqrt(x:number) : number { return Math.sqrt(x); }

        //? Returns the tangent of the specified angle (in radians)
        export function tan(angle:number) : number { return Math.tan(angle); }

        //? Converts degrees into radians
        export function deg_to_rad(degrees:number) : number { return degrees / 180.0 * Math.PI; }

        //? Converts rad into degrees
        export function rad_to_deg(radians:number) : number { return radians / Math.PI * 180.0; }

        //? Returns the positive infinity
        //@ name("\u221E\u208A")
        export function pos_inf() : number { return Number.POSITIVE_INFINITY; }

        //? Returns the negative infinity
        //@ name("\u221E\u208B")
        export function neg_inf() : number { return Number.NEGATIVE_INFINITY; }

        //? Indicates whether number evaluates to negative or positive infinity
        //@ name("is \u221E")
        export function is_inf(x:number) : boolean { return is_pos_inf(x) || is_neg_inf(x); }

        //? Indicates whether number evaluates to positive infinity
        //@ name("is \u221E\u208A")
        export function is_pos_inf(x:number) : boolean { return x == Number.POSITIVE_INFINITY; }

        //? Indicates whether number evaluates to negative infinity
        //@ name("is \u221E\u208B")
        export function is_neg_inf(x:number) : boolean { return x == Number.NEGATIVE_INFINITY; }

        //? Indicates that value cannot be represented as a number, i.e. Not-a-Number. This usually happens when the number is the result of a division by zero.
        export function is_nan(x:number) : boolean { return isNaN(x); }

        //? Rounds a number to a specified number of fractional digits.
        //@ [digits].defl(2)
        export function round_with_precision(x: number, digits: number): number
        {
            if (digits <= 0) return Math.round(x);
            var d = Math.pow(10, digits);
            return Math.round(x * d) / d;
        }

        //? Returns the hyperbolic cosine of the specified angle (in radians)
        export function cosh(angle: number): number { return (Math.pow(Math_.e(), 2* angle) + 1) / (2 * Math.pow(Math_.e(), angle)); }

        //? Returns the hyperbolic sine of the specified angle (in radians)
        export function sinh(angle: number): number { return (Math.pow(Math_.e(), 2* angle) - 1) / (2 * Math.pow(Math_.e(), angle)); }

        //? Returns the hyperbolic tangent of the specified angle (in radians)
        export function tanh(angle: number): number { return (Math.pow(Math_.e(), 2* angle) - 1) / (Math.pow(Math_.e(), 2* angle) + 1); }

        //? Use Collections->create number map instead.
        //@ hidden [result].writesMutable
        export function create_number_map() : NumberMap { return Collections.create_number_map(); }

        //? Creates a 3D vector
        export function create_vector3(x:number, y:number, z:number) : Vector3 { return Vector3.mk(x, y, z); }

        // Returns the smallest positive number greater than zero.
        var _epsilon: number = -1;

        //? Returns the machine epsilon, the smallest positive number greater than zero.
        //@ name("\u03B5")
        export function epsilon(): number {
            if (_epsilon < 0) {
                _epsilon = 1;
                while(1 + _epsilon != 1)
                    _epsilon /= 2;
            }
            return _epsilon;
        }

        //? Clamps `value` between `min` and `max`
        export function clamp(min : number, max : number, value : number) : number { return value < min ? min : value > max ? max : value; }

        //? Clamps `value` between 0 and 1.
        export function normalize(value : number) : number { return clamp(0, 1, value); }

        //? Returns the remainder resulting from the division of a specified number by another specified number
        export function ieee_remainder(x: number, y: number):number { return x - (y * Math.round(x / y)); }

        //? Return numbers between `start` and `start + length - 1` inclusively
        export function range(start:number, length:number) : Collection<number>
        {
            var r = []
            for (var i = 0; i < length; ++i)
                r.push(start + i)
            return Collection.fromArray(r, "number")
        }
    }
}
