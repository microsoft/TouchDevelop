///<reference path='refs.ts'/>

module TDev {

    export interface ICallNode {
        id: string; action: string;
    }

    export class CallNode implements ICallNode {
        constructor(public id: string, public action: string) { }
    }

    export interface IPackedStackTrace {
        pack: ICallNode[]; path: number[];
    }

    export class PackedStackTrace implements IPackedStackTrace {
        public pack: ICallNode[] = []; // all the callnodes we have
        public path: number[] = []; // trace is an indexing array into the pack

        static buildFrom(st: IStackFrame[]): PackedStackTrace {
            var ret = new PackedStackTrace()
            var pack: string[] = []
            var actions: string[] = []

            st.forEach(sf => {
                var ix = pack.indexOf(sf.pc);
                if (ix === -1) {
                    ix = pack.push(sf.pc) - 1;
                    actions.push(sf.name);
                }
                ret.path.push(ix);
            });

            pack.forEach((x,i) => ret.pack.push(new CallNode(x, actions[i])));

            return ret;
        }

        // the return stack frame will only work if you query pc and name fields
        // it can be used only for display purposes!
        static toFakeStackTrace(st: IPackedStackTrace): IStackFrame[]{
            if (!st) return [];

            var fakePack = st.pack.map(cnode => { return <IStackFrame>{ pc: cnode.id, name: cnode.action } });
            return st.path.map(ix => fakePack[ix]);
        }
    }


    // Run map is essentially just a list of nodes we've encountered
    export class RunBitMap {
        private empty = true;
        private data = {};

        public push(id: string) {
            this.data[id] = true;
            this.empty = false;
        }

        public contains(id: string) {
            return !!this.data[id];
        }

        public toJSON() {
            return Object.keys(this.data);
        }

        public isEmpty() {
            return this.empty;
        }

        public clear() {
            this.empty = true;
            this.data = {}
        }

        static fromJSON(json: any): RunBitMap {
            if (json == null) return null;

            if (json instanceof Array) {
                var ret = new RunBitMap();
                json.forEach((e: any) => {
                    if (e != undefined) {
                        ret.push(e);
                    }
                });
                return ret;
            }
            return undefined;
        }
    }

    export interface IRun {
        kind: string;
        publicationid: string;
        error?: string;
        stack?: IPackedStackTrace;
        runmap: RunBitMap;
        userplatform: any[];
        anonymous: boolean;
    }



}
