///<reference path='refs.ts'/>
module TDev.RT {
    //? A map of numbers to numbers
    //@ stem("m") enumerable serializable ctx(general,json)
    export class NumberMap
        extends RTValue
    {
        constructor() {
            super()
        }
        public items : any = new Object();
        private length : number = 0;

        //? Gets the number of elements
        //@ readsMutable
        public count() : number { return this.length; }

        //? Clears the number map.
        public clear(): void {
            this.items = new Object();
            this.length = 0;
        }

        //? Computes the sum of the values
        //@ readsMutable
        public sum() : number
        {
            var r = 0;
            Object.keys(this.items).forEach((key) => {
                var value = this.at_key(key);
                r += value;
            });
            return r;
        }

        //? Computes the average of the values
        //@ readsMutable
        public avg() : number { return this.sum() / this.length; }

        //? Extracts the elements at indices between start (inclusive) and end (non-inclusive).
        //@ readsMutable [result].writesMutable
        public slice(start: number, end: number): NumberMap
        {
            var nm = new NumberMap();
            Object.keys(this.items).forEach((skey) => {
                var value = this.at_key(skey);
                var key = parseFloat(skey);
                if (start <= key && key < end)
                    nm.set_at_key(skey, value);
            });
            return nm;
        }

        //? Computes the minimum of the values
        //@ readsMutable
        public min() : number
        {
            if (this.length == 0) return undefined;
            
            var r = Number.MAX_VALUE;
            Object.keys(this.items).forEach((key) => {
                var value = this.at_key(key);
                if (value < r)
                    r = value;
            });
            return r;
        }

        //? Computes the maximum of the values
        //@ readsMutable
        public max() : number
        {
            if (this.length == 0) return undefined;
            
            var r = Number.MIN_VALUE;
            Object.keys(this.items).forEach((key) => {
                var value = this.at_key(key);
                if (value > r)
                    r = value;
            });
            return r;
        }
        
        private at_key(key:string) : number
        {
            var result = (<any>(this.items)[key]);
            if (!result) { return 0; }
            return <number>(result);
        }

        //? Gets the element at index. Index may be any floating-point value.
        //@ readsMutable
        public at(index:number) : number
        {
            var key = index.toString();
            return this.at_key(key);
        }
        
        //? Sets the element at index. Index may be any floating-point value.
        //@ writesMutable
        public set_at(index:number, value:number) : void
        {
            var key = index.toString();
            this.set_at_key(key, value);
        }
        
        private set_at_key(key:string, value:number) : void
        {
            var val = this.items[key];
            if (val != undefined)
                this.length--;
            this.items[key] = value;
            if (value != undefined)
                this.length++;
        }
        

        //? Sets many elements at once.
        //@ writesMutable [numbers].readsMutable
        public set_many(numbers:NumberMap) : void
        {
            Object.keys(numbers.items).forEach((key) => {
                var value = numbers.at_key(key);
                this.set_at_key(key, value);
            });
        }
        
        //? Removes the value at a given index
        public remove(index:number) : void
        {
            var val = this.items[index];
            if (val != undefined)
            {    
                this.length--;
                this.items[index] = undefined;
            }            
        }        
        
        public toString() : string
        {
            var s = "{";
            var count = 0;
            Object.keys(this.items).forEach((key) => {
                if (count++ <= 20) {
                    var value = this.at_key(key);
                    if (s.length > 1)
                        s += ", ";
                    s+= key + "->" + value;                
                }
            });
            if (count == 20)
                s += ', ...';
            s += "}";
            return s;
        }

        public get_enumerator() { 
            var k : number[] = <number[]>Object.keys(this.items).map(parseFloat); 
            k.sort((a, b) => a - b);
            return k;
        }

        private _canvas: HTMLCanvasElement = undefined;

        //? Updates any display of this map
        //@ readsMutable
        public update_on_wall(): void
        {
            this.updateCanvas();
        }

        private updateCanvas() {
            if (this._canvas) {
                this._canvas.height = this._canvas.width;
                var points: TDev.RT.Charts.Point[] = [];
                Object.keys(this.items).forEach((skey) => {
                    var key = parseFloat(skey);
                    var value = this.at_key(skey);
                    points.push(new TDev.RT.Charts.Point(key, value));
                });
                new TDev.RT.Charts.CanvasChart().drawChart(this._canvas, points);
            }
        }

        public updateViewCore(s: IStackFrame, b: BoxBase) {
            this.updateCanvas();
        }

        public getViewCore(s: IStackFrame, b:BoxBase): HTMLElement {
            this._canvas = <HTMLCanvasElement> document.createElement("canvas");
            return this._canvas;
        }

        //? Exports a JSON representation of the contents.
        //@ readsMutable
        public to_json(): JsonObject {
            return JsonObject.wrap(this.exportJson(null));
        }
        //? Imports a JSON representation of the contents.
        //@ writesMutable
        public from_json(jobj: JsonObject): void {
            this.importJson(null, jobj.value());
        }

        // ctx is ignored
        public exportJson(ctx: JsonExportCtx): any {
            var obj = {};
            Object.keys(this.items).forEach((k) => {
               obj[k] = this.items[k];
            });
            return obj;
        }
        // ctx is ignored
        public importJson(ctx: JsonImportCtx, json: any): RT.RTValue {
            if ((typeof (json) !== "object") || Array.isArray(json)) {
                this.clear();
                return this;
            } else {
                this.items = {};
                this.length = 0;
                Object.keys(json).forEach(k => {
                    var v = json[k]
                        if (typeof v == "number") {
                        this.items[k] = v;
                        this.length++;
                    }
                });
            }
        }

        //? Displays the map in a line chart; you need to call 'update on wall' later if you want changes to be reflected.
        //@ readsMutable
        public post_to_wall(s: IStackFrame): void { super.post_to_wall(s) }

        public debuggerDisplay(clickHandler) {
            return span(null, "NumberMap[" + this.length + "]").withClick(clickHandler);
        }

        public debuggerChildren() {
            var ret = {};
            var items = this.items;

            Object.keys(items).forEach(k => {
                ret["at(" + k + ")"] = items[k]; 
            });
            
            return ret;
        }
    }
}
