///<reference path='refs.ts'/>
module TDev { export module RT {
    export class Vector2
        extends RTValue
    {
        constructor(public _x:number, public _y:number) {
            super()
        }
        static mk(x : number, y : number) : Vector2 { return new Vector2(x,y); }

        // Gets the x-component
        public x() : number { return this._x; }

        // Gets the y-component
        public y() : number { return this._y; }

        // Gets the length of the vector
        public length() : number { return Math.sqrt(this._x*this._x + this._y*this._y); }

        // Gets the distance between the two vectors
        private distance(other:Vector2) : number { return this.subtract(other).length(); }

        // Returns a vector pointing in the opposite direction
        private negate() : Vector2 { return Vector2.mk(-this._x,-this._y); }

        // Returns a vector of one unit pointing in the same direction as the original vector
        public normalize() : Vector2 { return this.scale(1 / this.length()); }

        // Adds a vector
        public add(other:Vector2) : Vector2 { return Vector2.mk(this._x + other._x, this._y + other._y); }

        // Subtracts another vector
        public subtract(other:Vector2) : Vector2 { return Vector2.mk(this._x - other._x, this._y - other._y); }

        // Multiplies component-wise with a vector
        private multiply(other:Vector2) : Vector2 { return Vector2.mk(this._x*other._x, this._y * other._y); }

        // Multiplies with a scaling factor
        public scale(scalar:number) : Vector2 { return Vector2.mk(this._x * scalar, this._y * scalar); }

        // Computes the dot product
        static dot(v1:Vector2, other:Vector2) : number { return v1._x * other._x + v1._y * other._y; }

        // Restricts the vector in the specified range
        private clamp(min:Vector2, max:Vector2) : Vector2
        {
            return Vector2.mk(Math_.clamp(min._x, max._x, this._x), Math_.clamp(min._y, max._y, this._y));
        }

        // Linear interpolation between two vectors
        private linear_interpolation(other:Vector2, amount:number) : Vector2
        {
            var a = Math_.normalize(amount);
            var a1 = 1.0 - a;
            return Vector2.mk(a * this._x + a1 * other._x, a * this._y + a1 * other._y);
        }

        // Turns the vector into a string
        private to_string() : string { return '(' + this._x + ',' + this._y + ')'; }

        public rotate90Left():Vector2
        {
            return Vector2.mk(-this._y, this._x);
        }

        public equals(that:Vector2):boolean
        {
            return this._x == that._x && this._y == that._y;
        }
    }
} }
