///<reference path='refs.ts'/>

module TDev { export module RT {
    export class Vector4
        extends RTValue
    {
        constructor(private _x:number, private _y:number, private _z:number, private _w:number) {
            super()
        }
        static mk(x : number, y : number, z : number, w : number) : Vector4 { return new Vector4(x,y,z,w); }

        static fromV3(v : Vector3, w : number) : Vector4 { return new Vector4(v.x(), v.y(), v.z(), w); }

        static fromV2(v : Vector2, z : number, w : number) : Vector4 { return new Vector4(v.x(), v.y(), z, w); }

        static fromV2V2(v1 : Vector2, v2 : Vector2) : Vector4 { return new Vector4(v1.x(), v1.y(), v2.x(), v2.y()); }

        // Gets the x-component
        public x() : number { return this._x; }

        // Gets the y-component
        public y() : number { return this._y; }

        // Gets the z-component
        public z() : number { return this._z; }

        // Gets the w-component
        public w() : number { return this._w; }

        // Gets the length of the vector
        public length() : number { return Math.sqrt(this._x*this._x + this._y*this._y + this._z*this._z + this._w*this._w); }

        // Gets the distance between the two vectors
        private distance(other:Vector4) : number { return this.subtract(other).length(); }

        // Returns a vector pointing in the opposite direction
        private negate() : Vector4 { return Vector4.mk(-this._x,-this._y,-this._z,-this._w); }

        // Returns a vector of one unit pointing in the same direction as the original vector
        private normalize() : Vector4 { return this.scale(1 / this.length()); }

        // Adds a vector
        public add(other:Vector4) : Vector4 { return Vector4.mk(this._x + other._x, this._y + other._y, this._z + other._z, this._w + other._w); }

        // Subtracts another vector
        private subtract(other:Vector4) : Vector4 { return Vector4.mk(this._x - other._x, this._y - other._y, this._z - other._z, this._w - other._w); }

        // Multiplies component-wise with a vector
        private multiply(other:Vector4) : Vector4 { return Vector4.mk(this._x*other._x, this._y * other._y, this._z * other._z, this._w * other._w); }

        // Multiplies with a scaling factor
        public scale(scalar:number) : Vector4 { return Vector4.mk(this._x * scalar, this._y * scalar, this._z * scalar, this._w * scalar); }

        // Restricts the vector in the specified range
        private clamp(min:Vector4, max:Vector4) : Vector4
        {
            return Vector4.mk(Math_.clamp(min._x, max._x, this._x), Math_.clamp(min._y, max._y, this._y), Math_.clamp(min._z, max._z, this._z), Math_.clamp(min._w, max._w, this._w));
        }

        // Linear interpolation between two vectors
        private linear_interpolation(other:Vector4, amount:number) : Vector4
        {
            var a = Math_.normalize(amount);
            var a1 = 1.0 - a;
            return Vector4.mk(a * this._x + a1 * other._x, a * this._y + a1 * other._y, a * this._z + a1 * other._z, a * this._w + a1 * other._w);
        }

        // Turns the vector into a string
        private to_string() : string { return '(' + this._x + ',' + this._y + ',' + this._z + ',' + this._w + ')'; }

        private withX(x:number) : Vector4 { return Vector4.mk(x,this._y,this._z,this._w); }
        private withY(y:number) : Vector4 { return Vector4.mk(this._x,y,this._z,this._w); }
        public withZ(z:number) : Vector4 { return Vector4.mk(this._x,this._y,z,this._w); }
        public withW(w:number) : Vector4 { return Vector4.mk(this._x,this._y,this._z,w); }

    }
} }
