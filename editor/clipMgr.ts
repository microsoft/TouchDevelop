///<reference path='refs.ts'/>

module TDev
{
    export interface ClipState
    {
        type: string;
        data: string;
        scriptId : string;
        isCut : boolean;
    }

    export class ClipMgr
    {
        private maxUndo = 20;
        private mainStates:ClipState[] = [];

        public copy(u:ClipState)
        {
            if (this.mainStates.length > this.maxUndo) {
                for (var i = 1; i < this.mainStates.length; ++i)
                    this.mainStates[i - 1] = this.mainStates[i];
                this.mainStates[i - 1] = u;
            } else {
                this.mainStates.push(u);
            }
        }

        public pasteType() : string { return !this.mainStates.peek() ? "" : this.mainStates.peek().type; }

        public paste() : ClipState
        {
            return this.mainStates.peek();
        }

        private clear()
        {
            this.mainStates = [];
        }

        public toJson()
        {
            var r = []
            var maxSize = 512000;
            for (var i = this.mainStates.length - 1; i >= 0; i--) {
                var st = this.mainStates[i];
                maxSize -= st.data.length;
                if (maxSize < 0) break;
                r.push(st);
            }
            r.reverse()
            return {
                states : r
            };
        }

        public load(j:any)
        {
            this.mainStates = j.states || [];
        }
    }
}
