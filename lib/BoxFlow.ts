///<reference path='refs.ts'/>
module TDev { export module RT {
    export class BoxFlow
        extends RTValue
    {
        constructor() {
            super()
        }

        static mk(flow: string) {
            var boxFlow = new BoxFlow();
            boxFlow._flow = flow;
            return boxFlow;
        }

        private _flow: string;

        public flow(): string { return this._flow; }

        // Checks if the layout equals to the other
        public equals(other: BoxFlow): boolean { return this._flow === other._flow; }
    }
} }
