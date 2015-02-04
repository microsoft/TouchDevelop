///<reference path='refs.ts'/>

module TDev.RT {
    //? A 3D vector
    //@ stem("p") immutable ctx(general,indexkey,walltap,json) serializable
    export class Vector3
        extends RTValue
    {
        constructor(public _x:number, public _y:number, public _z:number) {
            super()
        }

        static mk(x : number, y : number, z : number) : Vector3
        {
            var v = new Vector3(x,y,z);
            return v;
        }
        static zero = Vector3.mk(0, 0, 0);

        public toJsonKey() {
             return [this._x, this._y, this._z];
        }

        public keyCompareTo(o:any):number
        {
            var other:Vector3 = o;
            var diff = this._x - other._x;
            if (diff) return diff;
            diff = this._y - other._y;
            if (diff) return diff;
            diff = this._z - other._z;
            return diff;
        }

        public exportJson(ctx: JsonExportCtx): any {
            return [this._x, this._y, this._z];
        }
        public importJson(ctx: JsonImportCtx, json: any): RT.RTValue {
            Util.oops("should not call immutable instance for importing");
            return undefined;
        }
        static mkFromJson(ctx: JsonImportCtx, json: any): RT.RTValue {
            if (! Array.isArray(json) || json.length !== 3)
                return undefined;
            var ensurenr = (x) => (typeof x === "number" ? x : 0);
            return new Vector3(ensurenr(json[0]), ensurenr(json[1]), ensurenr(json[2]));
        }

        //? Gets the x-component
        public x() : number { return this._x; }

        //? Gets the y-component
        public y() : number { return this._y; }

        //? Gets the z-component
        public z() : number { return this._z; }

        //? Gets the length of the vector
        public length() : number { return Math.sqrt(this._x*this._x + this._y*this._y + this._z*this._z); }

        //? Gets the distance between the two vectors
        public distance(other:Vector3) : number { return this.subtract(other).length(); }

        //? Returns a vector pointing in the opposite direction
        public negate() : Vector3 { return Vector3.mk(-this._x,-this._y,-this._z); }

        //? Returns a vector of one unit pointing in the same direction as the original vector
        public normalize() : Vector3 { return this.scale(1 / this.length()); }

        //? Adds a vector
        public add(other:Vector3) : Vector3 { return Vector3.mk(this._x + other._x, this._y + other._y, this._z + other._z); }

        //? Subtracts another vector
        public subtract(other:Vector3) : Vector3 { return Vector3.mk(this._x - other._x, this._y - other._y, this._z - other._z); }

        //? Multiplies component-wise with a vector
        public multiply(other:Vector3) : Vector3 { return Vector3.mk(this._x*other._x, this._y * other._y, this._z * other._z); }

        //? Multiplies with a scaling factor
        public scale(scalar:number) : Vector3 { return Vector3.mk(this._x * scalar, this._y * scalar, this._z * scalar); }

        //? Restricts the vector in the specified range
        public clamp(min:Vector3, max:Vector3) : Vector3
        {
            return Vector3.mk(Math_.clamp(min._x, max._x, this._x), Math_.clamp(min._y, max._y, this._y), Math_.clamp(min._z, max._z, this._z));
        }

        //? Calculates the cross product with the other vector
        public cross(other:Vector3) : Vector3
        {
            return Vector3.mk(this._y * other._z - this._z * other._y,
               this._z * other._x - this._x * other._z,
               this._x * other._y - this._y * other._x);
        }

        //? Linear interpolation between two vectors
        public linear_interpolation(other:Vector3, amount:number) : Vector3
        {
            var a = Math_.normalize(amount);
            var a1 = 1.0 - a;
            return Vector3.mk(a * this._x + a1 * other._x, a * this._y + a1 * other._y, a * this._z + a1 * other._z);
        }

        //? Turns the vector into a string
        public to_string() : string { return '(' + this._x.toPrecision(6) + ',' + this._y.toPrecision(6) + ',' + this._z.toPrecision(6) + ')'; }

        public toString(): string { return this.to_string(); }

        //? Displays the vector on the wall
        public post_to_wall(s:IStackFrame) : void { super.post_to_wall(s) }
    }
}
