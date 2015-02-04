///<reference path='refs.ts'/>
module TDev.RT {
    //? A 2D matrix of numbers
    //@ stem("m") enumerable serializable
    export class Matrix
        extends RTValue
    {
        private data: number[] = [];
        private rowCount: number = 0;
        private columnCount: number = 0;

        //public exportJson(ctx: JsonExportCtx): any {
        //    return ctx.encodeObjectNode(this, ["data", "rowCount", "columnCount"], [this.data.slice(0), this.rowCount, this.columnCount]);
        //}

        static mk(rowCount : number, columnCount : number) : Matrix
        {
            if (rowCount < 0 || isNaN(rowCount))
                return null;
            if (columnCount < 0 || isNaN(columnCount))
                return null;
            var irow = Math.floor(rowCount);
            if (irow < 0)
                return null;
            var icolumn = Math.floor(columnCount);
            if (icolumn < 0)
                return null;
            if (irow * icolumn < 0)
                return null;
            var m = new Matrix();
            m.rowCount = irow;
            m.columnCount = icolumn;
            m.data = <number[]>new Array(irow * icolumn);
            m.clear(0);
            return m;
        }

        private index(i: number, j: number): number {
            return this.columnCount * Math.floor(i) + Math.floor(j);
        }

        public toString(): string {
            var r = ["["];
            for (var i = 0; i < this.rowCount; i++)
            {
                if (i > 0)
                    r.push("\n");
                for (var j = 0; j < this.columnCount; j++)
                {
                    if (j > 0)
                        r.push(", ");
                    r.push( this.data[this.index(i, j)].toString() );
                }
            }
            r.push("]");
            return r.join("");
        }

        public get_enumerator() { return this.data.slice(0); }

        //? Gets the total number of elements
        //@ readsMutable
        public count(): number { return this.rowCount * this.columnCount; }

        //? Gets the number of rows
        //@ readsMutable
        public row_count(): number { return this.rowCount; }

        //? Gets the number of columns
        //@ readsMutable
        public column_count(): number { return this.columnCount; }

         //? Displays the value of the array on the wall
        public post_to_wall(s: IStackFrame): void {
            super.post_to_wall(s);
        }


        public getViewCore(s: IStackFrame, b: BoxBase): HTMLElement {
            var d = div("item");
            for (var i = 0;  i < this.rowCount; i++) {
                var r = i == 0 ? "[" : "";
                for (var j = 0; j < this.columnCount; j++) {
                    if (j > 0)
                        r += ", ";
                    r += this.data[this.index(i, j)];
                }
                if (i == this.rowCount - 1)
                    r += "]";
                d.appendChild(div(null, r))
            }
            return d;
        }

        //? Copies the content from ``other`` starting at position ``row`` and ``column``
        //@ writesMutable
        public copy_from(row: number, column: number, other: Matrix) {
            row = Math.floor(row);
            column = Math.floor(column);

            for (var i = 0; i < other.rowCount; ++i) {
                for (var j = 0; j < other.columnCount; ++j) {
                    this.data[this.index(row + i, column + j)] = other.data[other.index(i, j)];
                }
            }
        }

        //? Gets the value at a given index. Elements are ordered line by line starting top left.
        //@ readsMutable
        public at(index:number) : number { return this.data[Math.floor(index)]; }

        //? Sets the value at a given index. Elements are ordered line by line starting top left.
        //@ writesMutable
        public set_at(index: number, value: number): void {
		    var _index = Math.floor(index);
			if (0 <= _index && index < this.data.length)
	            this.data[_index] = value;
        }

        //? Gets the value at a given location. Returns invalid if outside of the array dimensions
        //@ readsMutable
        public item(row: number, column: number): number {
            return this.at(this.index(row, column));
        }

        //? Sets the value at a particular position. The matrix  will be expanded if the position falls outside the boundaries.
        //@ writesMutable
        public set_item(row: number, column: number, value: number): void {
            this.set_at(this.index(row, column), value);
        }

        //? Creates a deep copy of the matrix.
        //@ readsMutable
        public clone(): Matrix {
            var m = new Matrix();
            m.rowCount = this.rowCount;
            m.columnCount = this.columnCount;
            m.data = this.data.slice(0);
            return m;
        }

        //? Computes the minimum of the values
        //@ readsMutable
        public min(): number {
            if (this.data.length == 0) return undefined;
            var r = this.data[0];
            for (var i = 1; i < this.data.length; ++i)
                r = this.data[i] < r ? this.data[i] : r;
            return r;
        }

        //? Computes the maximum of the values
        //@ readsMutable
        public max(): number
        {
            if (this.data.length == 0) return undefined;
            var r = this.data[0];
            for (var i = 1; i < this.data.length; ++i)
                r = this.data[i] > r ? this.data[i] : r;
            return r;
        }

        //? Returns a copy of the matrix scaled by factor.
        //@ readsMutable
        public scale(factor: number): Matrix {
            var m = Matrix.mk(this.rowCount, this.columnCount);
            for (var i = 0; i < this.data.length;++i)
                m.data[i] = this.data[i] * factor;
            return m;
        }

        //? Returns the matrix negated.
        //@ readsMutable
        public negate(): Matrix {
            var m = Matrix.mk(this.rowCount, this.columnCount);
            for (var i = 0; i < this.data.length;++i)
                m.data[i] = -this.data[i];
            return m;
        }

        //? Returns the transposed matrix.
        //@ readsMutable
        public transpose(): Matrix {
            var m = Matrix.mk(this.columnCount, this.rowCount);
            for (var i = 0; i < this.rowCount;++i)
                for (var j = 0; j < this.columnCount; ++j)
                    m.data[m.index(j, i)] = this.data[this.index(i, j)];
            return m;
        }

        //? Returns a matrix resulting from adding this matrix to b. The size of both matrices must match.
        //@ readsMutable
        public add(b: Matrix): Matrix {
            if (this.rowCount != b.rowCount || this.columnCount != b.columnCount) {
                Time.log("matrix add error: incompatible matrix sizes");
                return undefined;
            }

            var m = Matrix.mk(this.rowCount, this.columnCount);
            for (var i = 0; i < this.data.length;++i)
                m.data[i] = this.data[i] + b.data[i];
            return m;
        }

        //? Returns a matrix resulting from subtracting b from this matrix. The size of both matrices must match.
        //@ readsMutable
        public subtract(b: Matrix): Matrix {
            if (this.rowCount != b.rowCount || this.columnCount != b.columnCount) {
                Time.log("matrix subtract error: incompatible matrix sizes");
                return undefined;
            }

            var m = Matrix.mk(this.rowCount, this.columnCount);
            for (var i = 0; i < this.data.length; ++i)
                m.data[i] = this.data[i] - b.data[i];
            return m;
        }

        //? Returns a matrix resulting from multiply each element in the matrices. The size of both matrices must match.
        //@ readsMutable
        public multiply(b: Matrix): Matrix {
            if (this.columnCount != b.rowCount) {
                Time.log("matrix multiply error: incompatible matrix sizes");
                return undefined;
            }

            var r = Matrix.mk(this.rowCount, b.columnCount);
            var m = this.rowCount;
            var n = this.columnCount;
            var p = b.columnCount;
            for (var i = 0; i < m; i++)
                for (var j = 0; j < n; j++)
                    for (var k = 0; k < p; k++)
                        r.data[r.index(i,k)] +=
                            this.data[this.index(i,j)] * b.data[b.index(j,k)];
            return r;
        }

        //? Gets the string representation of the matrix
        //@ readsMutable
        public to_string(): string {
            return this.toString();
        }

        //? Gets a random element. Returns invalid if the matrix is empty.
        //@ tandre
        //@ readsMutable
        public random(): number {
            return this.data.length == 0 ? undefined : this.at(Math_.random(this.data.length));
        }

        //? Sets all the element of the matrix to the value.
        //@ writesMutable
        public clear(value: number): void {
            for (var i = 0; i < this.data.length;++i)
                this.data[i] = value;
        }

        public debuggerDisplay(clickHandler: () => any) {

            var container: HTMLElement = div(null).withClick(clickHandler);

            var tableVar: HTMLElement;
            var tableDataCell: HTMLElement;
            var tableRow: HTMLElement;

            tableVar = document.createElement("table").withClick(clickHandler);

            for(var i = 0; i < this.rowCount; ++i) {
                tableRow = createElement("tr");

                for(var j = 0; j < this.columnCount; ++j) {
                    tableDataCell = document.createElement("td").withClick(clickHandler);
                    tableDataCell.innerText = this.data[this.index(i, j)].toString();
                    tableDataCell.style.padding = "0.5em";
                    tableRow.appendChild(tableDataCell);
                }

                tableVar.appendChild(tableRow);
            }
            container.appendChild(tableVar);

            return container;
        }
    }
}
