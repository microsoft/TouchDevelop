///<reference path='refs.ts'/>

module TDev.AST {
    // a visitor to find the set of ``next'' statements after provided one
    // the next finder is conservative and can find false nodes!
    export class NextFinder
        extends NodeVisitor {
        constructor()
        {
            super();
        }

        static enclosingStmt(stmt: Stmt) {
            return stmt.parentBlock() && stmt.parentBlock().parent;
        }

        static asLoop(stmt: Stmt): LoopStmt{
            if (stmt instanceof While || stmt instanceof For || stmt instanceof Foreach) return <LoopStmt><any>stmt;
            else return null;
        }

        private nextInBlock(stmt: Stmt) {
            if (!stmt || !stmt.parentBlock()) return [];

            var container = stmt.parentBlock().stmts;
            var ix = container.indexOf(stmt);
            var enclosing = NextFinder.enclosingStmt(stmt);

            ++ix;
            while ((ix < container.length) && (container[ix].isPlaceholder() || container[ix].nodeType() === "comment")) ++ix;

            var ret = []

            if(ix >= container.length) {
                // we are last child
                ret = this.nextInBlock(enclosing);
            } else {
                ret = [container[ix]];
            }

            return ret.concat(this.visitLoop(NextFinder.asLoop(enclosing)));
        }

        static firstInCodeBlock(body: CodeBlock) {
            if (body == null) return null;

            var ix = 0;
            var container = body.stmts;

            while ((ix < container.length) && (container[ix].isPlaceholder() || container[ix].nodeType() === "comment"))++ix;

            if (ix >= container.length) {
                // nothing useful inside
                return null;
            }

            return container[ix];
        }

        public visitCodeBlock(body: CodeBlock) {
            var ret = NextFinder.firstInCodeBlock(body);
            return ret ? [ret] : [];
        }

        private visitLoop(stmt: LoopStmt) {
            if (stmt == null) return [];

            var ret = this.visitCodeBlock(stmt.body);
            return ret.concat(this.nextInBlock(<Stmt><any>stmt));
        }

        public visitFor(stmt: For) { return this.visitLoop(stmt); }
        public visitForeach(stmt: Foreach) { return this.visitLoop(stmt); }
        public visitWhile(stmt: While) { return this.visitLoop(stmt); }

        // TODO this is wrong for Return and Break
        public visitExprStmt(stmt: ExprStmt) {
            return this.nextInBlock(stmt);
        }

        public visitBox(box: Box) {
            return this.visitCodeBlock(box.body);
        }

        public visitInlineActions(ia: InlineActions) {
            return this.visitExprStmt(ia);
        }

        public visitAnyIf(stmt: If) {
            var arrs = stmt.parentIf.bodies().map(b => this.visitCodeBlock(b))
            arrs.push(this.nextInBlock(stmt)) // this is not really the case most of the time, but whatever
            return Util.concatArraysVA(arrs)
        }

        static find(stmt: Stmt): Stmt[]{
            if (!stmt) return [];

            var ret = new NextFinder().dispatch(stmt);
            if (!ret) {
                return [];
            }
            return ret;
        }
    }

    export class InnerNextFinder
        extends NodeVisitor {
        called: Action[] = [];

        visitAstNode(n: AstNode) {
            this.visitChildren(n);
            return null;
        }

        visitCall(n: Call) {
            var act = n.calledAction();
            if (act && this.called.indexOf(act) < 0) {
                this.called.push(act);
            } else {
                super.visitCall(n);
            }
        }

        visitExprHolder(n: ExprHolder) {
            if (n.parsed) this.dispatch(n.parsed);
        }

        static find(stmt: Stmt): Stmt[]{
            if (!stmt) return [];

            var finder = new InnerNextFinder();
            finder.dispatch(stmt);
            return finder.called.filter(a => !!a.body).map(a => {
                var fst = NextFinder.firstInCodeBlock(a.body);
                return fst ? [fst] : [];
            }).reduce((a,b) => a.concat(b), []);
        }

    }

    class AwaitChecker extends NodeVisitor {
        private res = false;

        visitAstNode(n: AstNode) {
            if (!n) return;
            this.visitChildren(n);
        }

        visitExprHolder(eh: ExprHolder) {
            if (!eh) return;

            this.dispatch(eh.parsed);
        }

        visitCall(n: Call) {
            if (!n) return;

            super.visitCall(n);
            if (n.awaits()) this.res = true;
        }

        static isAwait(n: Stmt) {
            if (!n) return;

            var checker = new AwaitChecker();
            checker.dispatch(n);
            return checker.res;
        }
    }

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    // Visitor classes that enable Dataflow Analyses to walk through the AST

    // PredecessorsFinder extracts the list of predecessors statements of another statement
    // by walking the AST. These are the predecessors when converting the AST to a CFG.
    // NOTE: Valid nodes for all dataflow analyses are Statement nodes
    // that contain an ExprHolder instance (therefore, consumes an expression).
    // PredecessorsFinder and SuccessorsFinder both walk through these nodes
    // and bypasses the rest (Box es, for instance).
    export class PredecessorsFinder
        extends NodeVisitor {
        constructor() {
            super();
        }

        // Convenience methods
        static enclosingStmt(stmt: Stmt): Stmt {
            return stmt.parentBlock() && stmt.parentBlock().parent;
        }

        static asLoop(stmt: Stmt): Stmt {
            if (stmt instanceof While || stmt instanceof For || stmt instanceof Foreach) return stmt;
            else return null;
        }

        // Tries to dig the last statement of a block that belongs to the
        // current stmt. If it does not contain a block, returns itself.
        static unpeelAndGetLast(stmt: Stmt): Stmt[]{
            var ret: Stmt[] = [];
            // Comments and placeholders are not excluded from the dataflow
            // visiting path. They just propagate the information through,
            // but we need to handle them.
            if (stmt instanceof Comment) {
                ret = [stmt];
            } else if (stmt instanceof For) {
                ret = ret.concat(PredecessorsFinder.lastInCodeBlock((<For>stmt).body));
            } else if (stmt instanceof Foreach) {
                ret = ret.concat(PredecessorsFinder.lastInCodeBlock((<Foreach>stmt).body));
            } else if (stmt instanceof While) {
                ret = ret.concat(PredecessorsFinder.lastInCodeBlock((<While>stmt).body));
            } else if (stmt instanceof If) {
                Util.assert(!((<If>stmt).isElseIf));
                // "If" nodes contains many last statements, one for each block. This should
                // always return at least two nodes, even when else is empty - in this
                // case it returns the placeholder.
                ret = ret.concat(Util.concatArraysVA((<If>stmt).bodies().map(PredecessorsFinder.lastInCodeBlock)))
            } else if (stmt instanceof Box) {
                ret = ret.concat(PredecessorsFinder.lastInCodeBlock((<Box>stmt).body));
            } else if (stmt instanceof ExprStmt) {
                ret = [stmt];
            }
            if (ret.length == 0)
                ret = [stmt];
            return ret;
        }

        // Find the previous IF statement (used only to find predecessors
        // of ifelse conditions).
        private findPreviousIf(ifstmt: If): Stmt[] {
            Util.assert(!!ifstmt && !!(ifstmt.parentBlock()));

            var container = ifstmt.parentBlock().stmts;
            var ix = container.indexOf(ifstmt);

            --ix;

            Util.assert(ix >= 0);
            var previous = container[ix];
            Util.assert(previous instanceof If);
            return [previous];
        }

        // Find the previous statement considering the enclosing block
        private previousInBlock(stmt: Stmt): Stmt[] {
            if (!stmt || !stmt.parentBlock()) return [];

            var container = stmt.parentBlock().stmts;
            var ix = container.indexOf(stmt);
            var enclosing = PredecessorsFinder.enclosingStmt(stmt);

            --ix;

            var ret = [];

            if (ix < 0) {
                // We are the first statement in a block
                // The previous is the loop condition check or if statement,
                // if they exist. Otherwise, we need to dig further and go for
                // the previous statement of the enclosing block.
                var l = PredecessorsFinder.asLoop(enclosing);
                if (!!l || (enclosing instanceof If)) {
                    ret = ret.concat(enclosing);
                } else if (enclosing instanceof InlineAction) {
                    ret = [];
                } else {
                    ret = ret.concat(this.previousInBlock(enclosing));
                }
            } else {
                var prev = container[ix];
                // In case of a block of statements, we need to unpeel and go
                // inside it. For loops, the loop itself is the statement.
                if ((prev instanceof For)
                    || (prev instanceof While)
                    || (prev instanceof Foreach)) {
                    ret = ret.concat([prev]);
                } else if ((prev instanceof If)
                    && ((<If>prev).isElseIf)) {
                    ret = ret.concat(PredecessorsFinder.unpeelAndGetLast((<If>prev).parentIf));
                } else {
                    ret = ret.concat(PredecessorsFinder.unpeelAndGetLast(prev));
                }
                if (ret.length == 0)
                    ret = this.previousInBlock(prev);
            }

            return ret;
        }


        // Extracts the last statement in a code block. Useful for finding
        // predecessors of loop structures.
        static lastInCodeBlock(body: CodeBlock): Stmt[] {
            if (body == null) return [];

            var enclosing = PredecessorsFinder.enclosingStmt(body);
            var container = body.stmts;
            var ix = container.length - 1;

            if (ix < 0) {
                return [];
            }

            var last = container[ix];

            // In case of a block of statements, we need to unpeel and go
            // inside it. For loops, the loop itself is the statement.
            if ((last instanceof For)
                || (last instanceof While)
                || (last instanceof Foreach))
                return [last];
            if (last instanceof If && (<If>last).isElseIf) {
                return PredecessorsFinder.unpeelAndGetLast((<If>last).parentIf);
            }
            return PredecessorsFinder.unpeelAndGetLast(last);
        }

        public visitCodeBlock(body: CodeBlock): Stmt[] {
            return PredecessorsFinder.lastInCodeBlock(body);
        }

        // The predecessor of a loop is the pair of the previous statement in
        // its enclosing block and the last statement inside the loop
        private visitLoop(stmt: Stmt): Stmt[] {
            if (stmt == null) return [];

            var ret = this.previousInBlock(<Stmt><any>stmt);
            return ret.concat(PredecessorsFinder.unpeelAndGetLast(stmt));
        }

        public visitFor(stmt: For): Stmt[] { return this.visitLoop(stmt); }
        public visitForeach(stmt: Foreach): Stmt[] { return this.visitLoop(stmt); }
        public visitWhile(stmt: While): Stmt[] { return this.visitLoop(stmt); }

        // The predecessor of a regular statement is simply the previous
        // statement in the block
        public visitStmt(stmt: Stmt): Stmt[] {
            return this.previousInBlock(stmt);
        }

        // The predecessor of an If is simply the previous statement in its
        // enclosing block.
        public visitIf(stmt: If): Stmt[]{
            Util.assert(!stmt.isElseIf);
            return this.previousInBlock(stmt);
        }
        // If it is an Ifelse, then its predecessor is the previous If.
        public visitElseIf(n: If) {
            return this.findPreviousIf(n);
        }

        // Returns the list of predecessor statements for "stmt". Uses a
        // visitor to handle different node types.
        static find(stmt: Stmt): Stmt[] {
            if (!stmt) return [];

            return new PredecessorsFinder().dispatch(stmt);
        }
    }

    // Used for dataflow equations, analogous to the PredecessorFinder.
    // Predecessor and Successors Finders must satisfy the property that
    //   Succs[ Preds[x] ] = x
    // Otherwise analyses will break. Successors are not just used in backward
    // analysis, but also in regular forward analysis in order to discover
    // which nodes to analyze when its Outs[] set is update, and vice-versa.
    //
    // NOTE: Valid nodes for all dataflow analyses are Statement nodes
    // that contain an ExprHolder instance (therefore, consumes an expression).
    // PredecessorsFinder and SuccessorsFinder both walk through these nodes
    // and bypasses the rest (Box es, for instance).
    export class SuccessorsFinder
        extends NodeVisitor {
        constructor() {
            super();
        }

        // Convenience methods
        static enclosingStmt(stmt: Stmt): Stmt {
            return stmt.parentBlock() && stmt.parentBlock().parent;
        }

        static asLoop(stmt: Stmt): Stmt {
            if (stmt instanceof While || stmt instanceof For || stmt instanceof Foreach) return stmt;
            else return null;
        }

        // This is not the same as "unpeelAndGetLast" of Predecessors because
        // it rarely needs to actually unpeel and get the statements inside a
        // block. The reason is that the first statement of a "If" or loop node
        // are really the "If" or loop themselves, except for Boxes.
        static unpeelAndGetFirst(stmt: Stmt): Stmt[]{
            var ret: Stmt[] = [];
            if (stmt instanceof Comment) {
                ret = ret.concat(stmt);
            } else if (stmt instanceof For)
                ret = ret.concat(stmt);
            else if (stmt instanceof Foreach) {
                ret = ret.concat(stmt);
            } else if (stmt instanceof While) {
                ret = ret.concat(stmt);
            } else if (stmt instanceof If) {
                ret = ret.concat(stmt);
            } else if (stmt instanceof Box) {
                ret = ret.concat(SuccessorsFinder.firstInCodeBlock((<Box>stmt).body));
            } else if (stmt instanceof ExprStmt) {
                ret = ret.concat(stmt);
            }
            if (ret.length == 0)
                ret = [stmt];
            return ret;
        }

        // Find the next IF statement (used only to find successors
        // of if/ifelse nodes).
        private findNextIf(ifstmt: If): Stmt[] {
            Util.assert(!!ifstmt && !!(ifstmt.parentBlock()));

            var container = ifstmt.parentBlock().stmts;
            var ix = container.indexOf(ifstmt);

            ++ix;

            if (ix >= container.length)
                return [];
            var next = container[ix];
            if (!(next instanceof If) || !((<If>next).isElseIf))
                return [];
            return [next];
        }

        // clone of nextInBlock, but jumps over IFELSE stmts.
        // Goes to the next stmt after a sequence of ifelse. Useful to
        // jump to the end of the structure when finding the successors of
        // the last statement of a codeblock inside an if.
        private jumpToEndOfIfElse(ifstmt: Stmt): Stmt[] {
            Util.assert(!!ifstmt && !!(ifstmt.parentBlock()));

            var container = ifstmt.parentBlock().stmts;
            var ix = container.indexOf(ifstmt);
            var enclosing = PredecessorsFinder.enclosingStmt(ifstmt);

            ++ix;
            while (container[ix] && container[ix] instanceof If && (<If>(container[ix])).isElseIf) ++ix;

            var ret = [];
            if (ix >= container.length) {
                // We are the last statement, so we can only find the next
                // statement looking for our parents: it is either the
                // enclosing loop or the successor of our parent. NOTE: We do not
                // jump directly from the last statement of a loop to outside
                // the loop: it must first go to the loop node to check the
                // condition, therefore we only have a single successor in
                // this case.
                var l = SuccessorsFinder.asLoop(enclosing);
                if (!!l) {
                    ret = ret.concat(enclosing);
                } else if (enclosing instanceof If) {
                    ret = ret.concat(this.jumpToEndOfIfElse(enclosing));
                } else if (enclosing instanceof InlineAction) {
                    ret = [];
                } else {
                    ret = ret.concat(this.nextInBlock(enclosing));
                }
            } else {
                var next = container[ix];
                // If this is a statement that contains statements, we want its children,
                // but first check if it is an statement that contains an ExprHolder
                ret = ret.concat(SuccessorsFinder.unpeelAndGetFirst(next));
                if (ret.length == 0)
                    ret = this.nextInBlock(next);
            }

            return ret;
        }

        // Look for the next statement considering its enclosing block.
        private nextInBlock(stmt: Stmt): Stmt[] {
            if (!stmt || !stmt.parentBlock()) return [];

            var container = stmt.parentBlock().stmts;
            var ix = container.indexOf(stmt);
            var enclosing = PredecessorsFinder.enclosingStmt(stmt);

            ++ix;


            var ret = [];
            if (ix >= container.length) {
                // We are the last statement, so we can only find the next
                // statement looking for our parents: it is either the
                // enclosing loop or the successor of our parent. NOTE: We do not
                // jump directly from the last statement of a loop to outside
                // the loop: it must first go to the loop node to check the
                // condition, therefore we only have a single successor in
                // this case.
                var l = SuccessorsFinder.asLoop(enclosing);
                if (!!l) {
                    ret = ret.concat(enclosing);
                } else if (enclosing instanceof If) {
                    ret = ret.concat(this.jumpToEndOfIfElse(enclosing));
                } else if (enclosing instanceof InlineAction) {
                    ret = [];
                } else {
                    ret = ret.concat(this.nextInBlock(enclosing));
                }
            } else {
                var next = container[ix];
                // If this is a statement that contains statements, we want its children,
                // but first check if it is an statement that contains an ExprHolder
                ret = ret.concat(SuccessorsFinder.unpeelAndGetFirst(next));
                if (ret.length == 0)
                    ret = this.nextInBlock(next);
            }

            return ret;
        }

        // Extracts the first statement in a code block, useful for finding
        // successors of loop structures.
        static firstInCodeBlock(body: CodeBlock): Stmt[] {
            if (body == null) return [];

            var container = body.stmts;
            var ix = 0;
            var enclosing = SuccessorsFinder.enclosingStmt(body);

            if (ix >= container.length) {
                // nothing useful inside
                return [];
            }

            var first = container[ix];
            return SuccessorsFinder.unpeelAndGetFirst(first);
        }

        public visitCodeBlock(body: CodeBlock): Stmt[] {
            return SuccessorsFinder.firstInCodeBlock(body);
        }

        // The successors of a loop is the pair of the first statement in its
        // body and the next statement after the loop, since the execution flow
        // skips the loop body after its condition evaluates to false.
        private visitLoop(stmt: Stmt): Stmt[] {
            if (stmt == null) return [];

            var ret = this.nextInBlock(stmt);
            return ret.concat(this.visitCodeBlock((<LoopStmt><any>stmt).body));
        }
        public visitFor(stmt: For): Stmt[] { return this.visitLoop(stmt); }
        public visitForeach(stmt: Foreach): Stmt[] { return this.visitLoop(stmt); }
        public visitWhile(stmt: While): Stmt[] { return this.visitLoop(stmt); }

        // The succ for a generic statement is the next stmt in its enclosing
        // block.
        public visitStmt(stmt: Stmt): Stmt[] {
            return this.nextInBlock(stmt);
        }

        // Successors of the "If" node are the first statements of its child
        // code blocks ("then" and "else"). If the else path includes another
        // condition check (ifelse node), then the first statement of "then"
        // block and the next ifelse node are the successors.
        public visitIf(stmt: If): Stmt[]{
            var ret = SuccessorsFinder.firstInCodeBlock(stmt.rawThenBody);
            if (stmt.displayElse)
                return ret.concat(SuccessorsFinder.firstInCodeBlock(stmt.rawElseBody));
            return ret.concat(this.findNextIf(stmt));
        }
        public visitElseIf(n: If) { return this.visitIf(n); }

        // Returns the list of successor statements for "stmt". Only returns
        // "valid" nodes as described in the note above (Statement nodes that
        // contains ExprHolder instances).
        static find(stmt: Stmt): Stmt[] {
            if (!stmt) return [];

            return new SuccessorsFinder().dispatch(stmt);
        }
    }

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    // Dataflow set data strucutes

    // An element may be anything worth storing in Ins/Outs sets for each point
    // of the program and depends on the analysis. Reaching definitions will
    // store the stringified def expression as the "key" and a reference to the
    // def expression itself. "Id" is bookkeeping maintained by the
    // SetElementsPool class.
    export class SetElement {
        constructor(public id: number, public key: string, public refNode: Expr) { }
    }

    // The pool keeps the elements alive and assign the lowest possible id
    // to reference them, and Set instances reference them using a lightweight
    // bitset representation. If IDs are large, more memory will be necessary
    // to represent the bitset.
    // After an analysis is done, a pool contains all elements generated by
    // Gen equations.
    class SetElementsPool {
        private map: { [s: string]: number; };
        private pool: SetElement[];

        constructor(private curId = 0) {
            this.map = {};
            this.pool = [];
        }

        // Builds a new SetElement and assign to it the lowest possible id. Get
        // it if an element with the same id already exists.
        public getElm(key: string, refNode: Expr): SetElement {
            var idx = this.map[["a_", key].join("")];
            if (idx == undefined) {
                idx = this.curId++;
                var elm = new SetElement(idx, key, refNode);
                this.pool.push(elm);
                this.map[["a_", key].join("")] = idx;
            }
            return this.pool[idx];
        }

        public getElmById(id: number): SetElement {
            if (id >= this.pool.length) return null;
            return this.pool[id];
        }

        public size(): number {
            return this.pool.length;
        }

    }

    // The memory representation of all Ins/Outs sets for all points of the
    // programs.
    export class BitSet {
        private _myset: number[];
        private setSize: number;
        // largestIndex is important for bookkeeping and directly reflects
        // our current size, signaling when it should be expanded. It is also
        // used to limit which indexes to traverse when forEach is called for
        // an allSet set (that is supposed to contain all known elements).
        private largestIndex: number;

        // The allSet flag is meant to be used in a set that is supposed to
        // start containing all possible elements. Therefore, it expands
        // with 1s, meaning it contains even those elements that it has never
        // seen before. Useful for intersection-confluence analyses.
        constructor(public allSet = false) {
            this._myset = [];
            if (allSet)
                this._myset.push(0xFFFFFFFF);
            else
                this._myset.push(0);
            this.setSize = 1;
            this.largestIndex = -1;
        }

        // Helper function to expand the set when a large index is used
        // to access an element that is currently not being represented.
        private growSet(idx: number): void {
            idx -= this.setSize * 32;
            while (idx >= 0) {
                if (this.allSet)
                    this._myset.push(0xFFFFFFFF);
                else
                    this._myset.push(0);
                ++this.setSize;
                idx -= 32;
            }
        }

        private cloneSet(): number[]{
            var a: number[] = [];
            for (var i = 0; i < this.setSize; ++i) {
                a.push(this._myset[i]);
            }
            return a;
        }

        // Makes this an allSet set (contains all elements).
        public makeAllSet(): void {
            this._myset = [0xFFFFFFFF];
            this.setSize = 1;
            this.allSet = true;
            this.largestIndex = -1;
        }

        public add(elm: number): void {
            if (elm >= this.setSize * 32)
                this.growSet(elm);
            if (elm > this.largestIndex)
                this.largestIndex = elm;
            this._myset[Math.floor(elm / 32)] |= 1 << elm % 32;
        }

        public setLargestIndex(idx: number): void {
            if (idx > this.setSize * 32)
                this.growSet(idx);
            this.largestIndex = idx;
        }

        public remove(elm: number): void {
            if (elm >= this.setSize * 32)
                this.growSet(elm);
            if (elm > this.largestIndex)
                this.largestIndex = elm;
            this._myset[Math.floor(elm / 32)] &= ~(1 << elm % 32);
        }

        public contains(elm: number): boolean {
            if (elm >= this.setSize * 32)
                this.growSet(elm);
            if (elm > this.largestIndex)
                this.largestIndex = elm;
            return !!(this._myset[Math.floor(elm / 32)] & (1 << elm % 32));
        }

        public union(a: BitSet): void {
            if (a.largestIndex > this.largestIndex) {
                this.setLargestIndex(a.largestIndex);
            } else if (this.largestIndex > a.largestIndex) {
                a.setLargestIndex(this.largestIndex);
            }
            for (var i = 0; i < a.setSize; ++i) {
                this._myset[i] |= a._myset[i];
            }
            if (a.allSet)
                this.allSet = true;
        }

        public intersection(a: BitSet): void {
            if (a.largestIndex > this.largestIndex) {
                this.setLargestIndex(a.largestIndex);
            } else if (this.largestIndex > a.largestIndex) {
                a.setLargestIndex(this.largestIndex);
            }
            for (var i = 0; i < a.setSize; ++i) {
                this._myset[i] &= a._myset[i];
            }
            if (this.allSet && !a.allSet)
                this.allSet = false;
        }

        public forEach(cb: (elm: number) => void ): void {
            if (this.largestIndex < 0)
                return;
            for (var i = 0; i <= this.largestIndex / 32; ++i) {
                var idx = i * 32;
                var val = this._myset[i];
                while (val != 0 && idx <= this.largestIndex) {
                    if (val & 1)
                        cb(idx);
                    ++idx; val = val >>> 1;
                }
            }
        }

        public clone(): BitSet {
            var a = new BitSet(this.allSet);
            a._myset = this.cloneSet();
            a.setSize = this.setSize;
            a.largestIndex = this.largestIndex;
            return a;
        }

        public equals(a: BitSet): boolean {
            if ((this.allSet && !a.allSet) || (!this.allSet && a.allSet))
                return false;
            if (a.largestIndex > this.largestIndex) {
                this.setLargestIndex(a.largestIndex);
            } else if (this.largestIndex > a.largestIndex) {
                a.setLargestIndex(this.largestIndex);
            }
            for (var i = 0; i < a.setSize; ++i) {
                if (this._myset[i] != a._myset[i])
                    return false;
            }
            return true;
        }
    }

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    // Dataflow framework classes

    // Every dataflow analysis should implement this interface.
    // DataflowVisitor will call your analysis for every Statement that
    // contains expressions (ExprHolder instances) to calculate gen/kill
    // sets.
    export interface IDataflowAnalysis {
        // Change _set to reflect the In set of the entry node of
        // the action (or exit node if backwards analysis).
        buildStartNodeSet(a: Action, _set: BitSet): void;
        // All sets are intialized by cloning the set specified by this
        // function. You should start with an allSet set for analysis that
        // use intersection confluence.
        buildStartingSet(a: Action, _set: BitSet): void;
        // Change _set to reflect Gen[n], where n is an expression.
        // inSet: the original set before Kill kicked in
        // isIV: true when this expression does not actually exist, but was
        //   generated to simulate the behavior experienced by induction
        //   variables of "For" nodes.
        gen(n: ExprHolder, _set: BitSet, inSet: BitSet, isIV: boolean): void;
        // Change _set to reflext Kill[n], where n is an expression.
        // isIV: true when this expression does not actually exist, but was
        //   generated to simulate the behavior experienced by induction
        //   variables when "For" nodes are executed.
        kill(n: ExprHolder, _set: BitSet, isIV: boolean): void;
        // Attach the calculated information from expression "n" in node "s",
        // which owns this expression. This should be the result of this
        // analysis and remains attached to the AST.
        updateNode(s: Stmt, n: ExprHolder): void;
    }

    // DataflowVisitor manages all common duties of a dataflow analysis, leaving
    // only the gen/kill sets calculation for the analysis itself. It works once
    // per Action and starts by determining the order of nodes to visit in this
    // action, but only consider nodes that are Statement and that contains
    // expressions (ExprHolder instances), skipping other nodes.
    // Uses BitSet for union and intersection set operations, topological sort
    // for the initial visit order and a worklist for the remaining visits
    // NOTE: If the analysis is backwards, notice that Ins/Outs sets are
    // reversed.
    class DataflowVisitor
        extends NodeVisitor {
        private worklist: Stmt[] = [];
        public Ins: { [k: number]: BitSet; } = {};
        public Outs: { [k: number]: BitSet; } = {};
        private startingSet: BitSet;
        private startNodeSet: BitSet;
        private starting: boolean = false;
        private changed: boolean = false;
        private visited: { [id: number]: boolean; } = {};

        // df: Reference to the actual Analysis that will be called for each
        //    expression.
        // pool: Reference to the pool to create/reference elements of sets.
        // backwards: direction, true if backwards.
        // intersection:  confluence operator, false if union, true if
        //    intersection
        // useWorklist: true if uses a worklist to visit nodes, false will
        //    use the blind algorithm of revisiting all nodes each time a
        //    modification is detected.
        constructor(public df: IDataflowAnalysis, public pool: SetElementsPool,
            public backwards: boolean = false, public intersection: boolean = false,
            public useWorklist = true) {
            super();
        }

        // Keep the same id for generated assignzero expressions
        private genZeroMap: { [name: string]: Expr; } = {};

        // Helper function to generate an expression that mimics the behavior
        // of a "For" node, initializing the induction variable with zero.
        private generateAssignZero(l: LocalDef): Expr {
            var res = this.genZeroMap[["d_", l.getName()].join("")];
            if (res != undefined)
                return res;
            var localThing = mkThing(l.getName());
            (<ThingRef>localThing).def = l;
            var initialVal = mkLit(0);
            res = mkCall(PropertyRef.mkProp(api.core.AssignmentProp),
                [localThing, initialVal]);
            this.genZeroMap[["d_", l.getName()].join("")] = res;
            return res;
        }

        // Keep the same id for generated inc expressions
        private genIncMap: { [name: string]: Expr; } = {};

        // Helper function to generate an expression that mimics the behavior
        // of a "For" node, incrementing the induction variable
        private generateInc(l: LocalDef): Expr {
            var res = this.genIncMap[["d_", l.getName()].join("")];
            if (res != undefined)
                return res;
            var localThing = mkThing(l.getName());
            (<ThingRef>localThing).def = l;
            var incVal = mkLit(1);
            var sum = mkCall(PropertyRef.mkProp(api.core.Number.getProperty("+")),
                [localThing, incVal]);
            res = mkCall(PropertyRef.mkProp(api.core.AssignmentProp),
                [localThing, sum]);
            this.genIncMap[["d_", l.getName()].join("")] = res;
            return res;
        }

        public visitAstNode(node: AstNode): any {
            this.visitChildren(node);
        }

        // This is the core of DataflowVisitor and handles our subject of
        // interest: AST Statements that contains ExprHolder instances.
        private visitExprHolderHolder(stmt: Stmt) {
            var preds = this.backwards ? AST.SuccessorsFinder.find(stmt) : AST.PredecessorsFinder.find(stmt);
            var newIn: BitSet;
            if (this.starting) {
                newIn = this.startNodeSet.clone();
                this.starting = false;
            } else {
                var validPreds = 0;
                newIn = this.intersection ? new BitSet(/*allset*/true) : new BitSet();
                preds.forEach((x: Stmt) => {
                    var nOut = this.Outs[x.nodeId];
                    if (nOut != undefined) {
                        ++validPreds;
                        if (this.intersection)
                            newIn.intersection(nOut);
                        else
                            newIn.union(nOut);
                    }
                });
                if (validPreds == 0) {
                    newIn = this.startingSet.clone();
                }
            }
            this.Ins[stmt.nodeId] = newIn;
            var newOut = newIn.clone();

            // Calculate kill/gen sets. Ignore placeholders.
            if (stmt instanceof ExprStmt && !stmt.isPlaceholder()) {
                this.df.kill((<ExprStmt>stmt).expr, newOut, false);
                this.df.gen((<ExprStmt>stmt).expr, newOut, newIn, false);
            } else if (!!stmt.calcNode()) {
                // A "For" node implicitly updates the induction variable each
                // time it is run, and some analyses need to know about this.
                // We generate fake expressions that represent this behavior.
                if (stmt instanceof For) {
                    var forInitialAssgn = exprToStmt(this.generateAssignZero((<For>stmt).boundLocal));
                    var forIncAssgn = exprToStmt(this.generateInc((<For>stmt).boundLocal));
                    this.df.kill(forInitialAssgn.expr, newOut, true);
                    this.df.kill(forIncAssgn.expr, newOut, true);
                    this.df.gen(forIncAssgn.expr, newOut, newIn, true);
                    this.df.gen(forInitialAssgn.expr, newOut, newIn, true);
                }
                this.df.kill(stmt.calcNode(), newOut, false);
                this.df.gen(stmt.calcNode(), newOut, newIn, false);
            }

            // Check to see if we are stuck at a fixed point or if we need
            // to continue running the analysis for succs nodes.
            var oldOut = this.Outs[stmt.nodeId];
            if (!oldOut || !oldOut.equals(newOut)) {
                if (this.useWorklist) {
                    if (this.backwards) {
                        AST.PredecessorsFinder.find(stmt).forEach((s: Stmt) => {
                            this.worklist.push(s);
                            this.visited[s.nodeId] = false;
                        });
                    } else {
                        AST.SuccessorsFinder.find(stmt).forEach((s: Stmt) => {
                            this.worklist.push(s);
                            this.visited[s.nodeId] = false;
                        });
                    }
                } else {
                    this.changed = true;
                }
                this.Outs[stmt.nodeId] = newOut;
            }
            // Attach the analysis info into the AST
            if (stmt instanceof ExprStmt) {
                this.df.updateNode(stmt, (<ExprStmt>stmt).expr);
            } else if (!!stmt.calcNode()) {
                this.df.updateNode(stmt, stmt.calcNode());
            }

            if (!this.useWorklist)
                this.visitChildren(stmt);
        }

        visitComment(n: Comment) {
            this.visitExprHolderHolder(n);
        }
        visitFor(n: For) {
            this.visitExprHolderHolder(n);
        }
        visitIf(n: If) {
            this.visitExprHolderHolder(n);
        }
        visitElseIf(n: If) {
            this.visitExprHolderHolder(n);
        }
        visitForeach(n: Foreach) {
            this.visitExprHolderHolder(n);
        }
        visitWhile(n: While) {
            this.visitExprHolderHolder(n);
        }
        visitExprStmt(n: ExprStmt) {
            this.visitExprHolderHolder(n);
        }

        // Non-recursive version of a topological sort to order our first
        // visit to the Action's nodes. Recursive versions are simpler
        // and more elegant but crash on shallow stack mobile Safari browsers.
        private topologicalSort(a: Action) {
            var incomingEdges : { [id: number]: number; } = { };
            var visited: { [id: number]: boolean; } = {};
            var noIncomingEdges: { [id: number]: boolean; } = {};
            var idToNode: { [id: number]: Stmt; } = {};
            var numNodesVisited = 0;

            // Populate map with frequency of incoming edges
            a.body.forEach((s: Stmt) => {
                var todo = this.backwards ? PredecessorsFinder.unpeelAndGetLast(s) :
                    SuccessorsFinder.unpeelAndGetFirst(s);
                while (todo.length > 0) {
                    var cur = todo.shift();
                    if (visited[cur.nodeId])
                        continue;
                    visited[cur.nodeId] = true;
                    ++numNodesVisited;
                    idToNode[cur.nodeId] = cur;
                    if (!(incomingEdges[cur.nodeId] > 0)) {
                        noIncomingEdges[cur.nodeId] = true;
                    }
                    var succs = this.backwards ? AST.PredecessorsFinder.find(cur)
                        : AST.SuccessorsFinder.find(cur);
                    succs.forEach((x: ExprStmt) => {
                        if (incomingEdges[x.nodeId] == undefined)
                            incomingEdges[x.nodeId] = 1;
                        else
                            incomingEdges[x.nodeId]++;
                        noIncomingEdges[x.nodeId] = false;
                        todo.push(x);
                    });
                }
            });

            // Get nodes with no incoming edges
            var s: Stmt[] = [];
            for (var key in noIncomingEdges) {
                if (noIncomingEdges[key]) {
                    var node = idToNode[key];
                    Util.assert(node !== undefined);
                    s.push(node);
                }
            }

            // Sort
            while (this.worklist.length < numNodesVisited) {
                if (s.length == 0) {
                    var found = false;
                    for (var key in visited) {
                        var cand = idToNode[key];
                        if (cand !== undefined && incomingEdges[key] > 0) {
                            incomingEdges[key] = 0;
                            s.push(cand);
                            found = true;
                            break;
                        }
                    }
                    Util.assert(found);
                }
                var cur = s.shift();
                this.worklist.push(cur);
                var succs = this.backwards ? AST.PredecessorsFinder.find(cur)
                    : AST.SuccessorsFinder.find(cur);
                for (var i = 0; i < succs.length; ++i) {
                    var x = succs[i];
                    if (--incomingEdges[x.nodeId] == 0)
                        s.unshift(x);
                    else if (incomingEdges[x.nodeId] > 0 && i == succs.length - 1 && s.length == 0) {
                        // break the cycle
                        incomingEdges[x.nodeId] = 0;
                        s.push(x);
                    }
                }
            }
        }

        private dfTesting(s: Stmt) {
            // Testing to ensure  x C Succs[Preds[x]]
            var preds = AST.PredecessorsFinder.find(s);
            var succs;
            for (var i = 0; i < preds.length; ++i) {
                var elmi = preds[i];
                succs = AST.SuccessorsFinder.find(elmi);
                var found = false;
                for (var j = 0; j < succs.length; ++j) {
                    var elmj = succs[j];
                    if (elmj === s)
                        found = true;
                }
                Util.assert(found);
            }
            // Testing to ensure  x C Preds[Succs[x]]
            succs = AST.SuccessorsFinder.find(s);
            for (var i = 0; i < succs.length; ++i) {
                var elmi2 = succs[i];
                preds = AST.PredecessorsFinder.find(elmi2);
                var found = false;
                for (var j = 0; j < preds.length; ++j) {
                    var elmj2 = preds[j];
                    if (elmj2 === s)
                        found = true;
                }
                Util.assert(found);
            }
        }

        // Entry point for the dataflow analysis. Initialize all data
        // structures and start visiting the statements of Action n.
        visitAction(n: Action) {
            if (n instanceof LibraryRefAction)
                return;
            if (n.isPage())
                return;

            if (this.useWorklist) {
                this.worklist = [];
                this.topologicalSort(n);
                this.visited = {};
                this.startNodeSet = new BitSet();
                this.df.buildStartNodeSet(n, this.startNodeSet);
                this.startingSet = new BitSet();
                this.df.buildStartingSet(n, this.startingSet);
                this.starting = true;
                while (this.worklist.length > 0) {
                    var cur = this.worklist.shift();
                    if (this.visited[cur.nodeId])
                        continue;
                    this.visited[cur.nodeId] = true;
                    //this.dfTesting(cur); // Check if preds/succs are alright
                    cur.accept(this);
                }
            } else {
                this.startNodeSet = new BitSet();
                this.df.buildStartNodeSet(n, this.startNodeSet);
                this.startingSet = new BitSet();
                this.df.buildStartingSet(n, this.startingSet);
                this.changed = true;
                this.starting = true;
                while (this.changed) {
                    this.changed = false;
                    n.body.forEach((c) => {
                        c.accept(this);
                    });
                }
            }
        }
    }

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    // Dataflow Analyses

    // * REACHING DEFINITIONS *

    // Motivation: RD seeks to eliminate "ok checks" that slows down script
    // execution in IE and Firefox by checking if the invalid definition
    // reaches an expression.
    // Flags to activate: options.okElimination, URL ?okElimination

    // Manages Reaching Definitions data attached to the AST as the result
    // of the analysis.
    export class ReachingDefsMgr {
        constructor(public defs: Expr[], public node: Stmt) { }

        private getLocal(e: Token): String {
            if (e instanceof ThingRef) {
                var d = (<ThingRef>e).def;
                if (d instanceof LocalDef) return (<LocalDef>d).getName();
            }

            return null;
        }

        public toString(): string {
            return "RD #" + this.node.nodeId + ": {" + this.defs.join() + "}";
        }

        // The compiler will ask whether this definition may be invalid, at
        // this point of the program. If it may be, then it needs to put an
        // "ok check".
        public mayBeInvalid(d: LocalDef): boolean {
            var ret = false;
            this.defs.forEach((e: Expr) => {
                var refcall = <Call>e;
                if (refcall.prop() != api.core.AssignmentProp)
                    return;
                refcall.args[0].flatten(api.core.TupleProp).forEach((a) => {
                    var l = this.getLocal(a);
                    if (l && l == d.getName()) {
                        if (refcall.args.length > 1) {
                            refcall.args.slice(1).forEach((val: Expr) => {
                                // check for invalid
                                if (val instanceof Call &&
                                    (<Call>val).args.length > 0 &&
                                    (<Call>val).args[0] instanceof ThingRef &&
                                    (<ThingRef>(<Call>val).args[0]).data == "invalid") {
                                    ret = true;
                                }
                                // check for non-robust call
                                if (val instanceof Call &&
                                    !((<Call>val).prop().getFlags() & PropertyFlags.Robust)) {
                                    ret = true;
                                }
                            });
                        }
                    }
                });
            });
            return ret;
        }
    }

    // ReachingDefinitions is the classic analysis to compute local variable
    // definitions that reaches a certain point. It is used by the compiler
    // to detect whether an "invalid" definition reaches some point, in which
    // case we need to emit an "ok check" to dynamically detect if it is truly
    // invalid value and stop the script before it is used.
    //
    // Main characteristics: Forward, union confluence
    export class ReachingDefinitions
        implements IDataflowAnalysis {
        private df: DataflowVisitor;
        private curNode: Stmt;
        private pool: SetElementsPool;
        constructor() {
        }

        // Convenience methods
        private getLocal(e: Token): LocalDef {
            if (e instanceof ThingRef) {
                var d = (<ThingRef>e).def;
                if (d instanceof LocalDef) return <LocalDef>d;
            }
            return null;
        }

        private getLocalName(e: Token): String {
            var ld = this.getLocal(e);
            if (ld != null) {
                return ld.getName();
            }
            return null;
        }

        // Helper function to calculate the Gen set when the expression
        // is a variable copy. We need to copy all the definitions of the
        // source variable to the destination variable.
        private handleCopy(c: Call, _set: BitSet): boolean {
            var bypassGen = false;
            // Check for a regular copy
            if (c.prop() == api.core.AssignmentProp
                && c.args.length == 2
                && c.args[0] instanceof ThingRef
                && c.args[1] instanceof ThingRef) {
                var dst = this.getLocal(c.args[0]);
                var src = this.getLocal(c.args[1]);
                if (src != null && dst != null) {
                    _set.forEach((idx: number) => {
                        var elm = this.pool.getElmById(idx);
                        var refcall = <Call> elm.refNode;
                        if (refcall) {
                            refcall.args[0].flatten(api.core.TupleProp).forEach((a) => {
                                var l2 = this.getLocalName(a);
                                if (l2 == src.getName()) {
                                    var newCall = this.cloneAndChangeDst(refcall, dst);
                                    var newElm = this.pool.getElm(newCall.getText(), newCall);
                                    _set.add(newElm.id);
                                    bypassGen = true; // we dont need to keep "x = y" definitions
                                }
                            });
                        }
                    });
                }
            }
            // Check for a conditional copy (or/and)
            if (c.prop() == api.core.AssignmentProp
                && c.args.length == 2
                && c.args[0] instanceof ThingRef
                && c.args[1] instanceof Call) {
                var dst = this.getLocal(c.args[0]);
                var srcCall = <Call> c.args[1];
                if (dst != null && srcCall != null
                    &&  srcCall.args.length == 2
                    && (srcCall.prop() == api.core.AndProp ||
                        srcCall.prop() == api.core.OrProp)
                    &&  srcCall.args[1] instanceof ThingRef) {
                    var src = this.getLocal(srcCall.args[1]);
                    if (src != null && dst != null) {
                        _set.forEach((idx: number) => {
                            var elm = this.pool.getElmById(idx);
                            var refcall = <Call> elm.refNode;
                            if (refcall) {
                                refcall.args[0].flatten(api.core.TupleProp).forEach((a) => {
                                    var l2 = this.getLocalName(a);
                                    if (l2 == src.getName()) {
                                        var newCall = this.cloneAndChangeDst(refcall, dst);
                                        var newElm = this.pool.getElm(newCall.getText(), newCall);
                                        _set.add(newElm.id);
                                    }
                                });
                            }
                        });
                    }
                }
            }
            return bypassGen;
        }

        // The core function of this Analysis, calculates the GEN and KILL sets
        // for the expression "n". Updates "_set" to reflect this.
        private updateSet(n: ExprHolder, _set: BitSet, genKill: boolean): void {
            if (!n.parsed || !(n.parsed instanceof Call))
                return;
            var c = <Call>n.parsed;
            //... Traverse nodes non-recursively
            var exprVisitQueue: Expr[] = [];
            exprVisitQueue.push(c);
            while (exprVisitQueue.length > 0) {
                var cur = exprVisitQueue.shift();
                if (!(cur instanceof Call))
                    continue;
                var curCall = <Call> cur;
                exprVisitQueue = exprVisitQueue.concat(curCall.children());
                var prop = curCall.prop();
                // We are only looking for assignments to local variables
                if (prop == api.core.AssignmentProp) {
                    c.args[0].flatten(api.core.TupleProp).forEach((e) => {
                        var l = this.getLocalName(e);
                        if (l) {
                            if (genKill) { // Generate
                                // First check if it is a local copy expression
                                if (!this.handleCopy(curCall, _set)) {
                                    // If it is not, put this assignment into the Out set
                                    var elm = this.pool.getElm(curCall.getText(), curCall);
                                    _set.add(elm.id);
                                }
                            } else { // Remove all defs of the same var from the In set
                                _set.forEach((idx: number) => {
                                    var elm = this.pool.getElmById(idx);
                                    var refcall = <Call> elm.refNode;
                                    var remove = false;
                                    if (refcall) {
                                        refcall.args[0].flatten(api.core.TupleProp).forEach((a) => {
                                            var l2 = this.getLocalName(a);
                                            if (l2 == l)
                                                remove = true;
                                        });
                                    }
                                    if (remove)
                                        _set.remove(idx);
                                });
                            }
                        }
                    });
                }
            }
        }

        // Wrappers for updateSet
        gen(n: ExprHolder, _set: BitSet, inSet: BitSet, isIV = false): void {
            this.updateSet(n, _set, true);
        }

        kill(n: ExprHolder, _set: BitSet, isIV = false): void {
            this.updateSet(n, _set, false);
        }

        // Extract our calculated RD set by using Set and SetElementsPool data
        // structure, then stick this into the AST.
        updateNode(s: Stmt, n: ExprHolder) {
            n.reachingDefs = null;
            var defs:Expr[] = [];
            this.df.Ins[s.nodeId].forEach((idx: number) => {
                defs.push(this.pool.getElmById(idx).refNode);
            });
            if (defs.length > 0)
                n.reachingDefs = new ReachingDefsMgr(defs, s);
        }

        // Helper function to generate a fake invalid assignment.
        private generateInvalidAssignmentFor(l: LocalDef): Expr {
            var localThing = mkThing(l.getName());
            (<ThingRef>localThing).def = l;
            var invalidThing = mkThing("invalid");
            (<ThingRef>invalidThing).def = api.getKind("Invalid").singleton;
            return mkCall(PropertyRef.mkProp(api.core.AssignmentProp),
                [localThing, mkCall(PropertyRef.mkProp(api.getKind("Invalid").getProperty("number")), [invalidThing])]);
        }

        // Helper function used when handling copy expressions, necessary
        // when copying all the definitions of the source variable to the
        // destination variable.
        private cloneAndChangeDst(c: Call, dst: LocalDef): Expr {
            var args = c.args.slice(0);
            args[0] = mkThing(dst.getName());
            (<ThingRef>args[0]).def = dst;
            return mkCall(c.propRef, args);
        }

        // Our start node for the action assigns all input parameters to
        // invalid, assuming (conservatively) that they are undefined.
        buildStartNodeSet(a: Action, _set: BitSet): void {
            a.allLocals.forEach((e: Decl) => {
                if (!(e instanceof LocalDef))
                    return;
                var l = (<LocalDef>e).getName();
                var elm = this.pool.getElm(l, this.generateInvalidAssignmentFor(<LocalDef>e));
                _set.add(elm.id);
            });
        }

        // All nodes start empty in this analysis.
        buildStartingSet(a: Action, _set: BitSet): void {
        }

        // Entry point for this analysis. Analyze the App Action-wise.
        visitApp(n: App) {
            n.things.forEach((a: Decl) => {
                if (a instanceof Action && !(<Action>a).isPage()) {
                    this.pool = new SetElementsPool();
                    this.df = new DataflowVisitor(this, this.pool,/*backwards*/false, /*intersection*/false, /*useWorklist*/true);
                    this.df.dispatch(a);
                }
            });
        }
    }

    // * DOMINATOR SET *

    // Motivation:
    // The Dominator Set Analysis is used only to debug intersection-confluence
    // analysis, since it is the simplest analysis you can build with the
    // intersection confluence operator. May be used as boilerplate code for
    // other analyses as well.
    // Flags to activate: no one

    export class DominatorsMgr {
        constructor(public doms: Expr[], public node: Stmt) { }

        public toString() {
            var str = "DOMS(" + this.node.nodeId + ") : {";
            str += this.doms.map((e: Expr) => {
                return e.nodeId.toString();
            }).join();
            return str + "}";
        }
    }

    // Dominators will compute the set of statements that dominate each
    // other. A statement x dominates y if all paths from the start of
    // the action to y includes x.
    //
    // Main characteristics: Forward, intersection confluence
    export class Dominators
        implements IDataflowAnalysis {
        private df: DataflowVisitor;
        private curNode: Stmt;
        private pool: SetElementsPool;
        constructor() {
        }

        // Our gen set is simply our own expression id.
        gen(n: ExprHolder, _set: BitSet, inSet: BitSet, isIV = false): void {
            if (!n.parsed)
                return;
            var elm = this.pool.getElm(n.parsed.nodeId.toString(), n.parsed);
            _set.add(elm.id);
        }

        // We do not need to kill. The intersection confluence operator takes
        // care of eliminating IDs that do not dominate this statement.
        kill(n: ExprHolder, _set: BitSet, isIV = false): void {
        }

        // Put our calculated set into the AST node of this statement
        updateNode(s: Stmt, n: ExprHolder) {
            n.dominators = null;
            var doms: Expr[] = [];
            this.df.Ins[s.nodeId].forEach((idx: number) => {
                doms.push(this.pool.getElmById(idx).refNode);
            });
            if (doms.length > 0)
                n.dominators = new DominatorsMgr(doms, s);
        }

        // We assume no one dominates the first node.
        buildStartNodeSet(a: Action, _set: BitSet): void {
        }

        // All nodes must be initialized with the set that contains all
        // elements (allSet), otherwise we will not reach the maximum
        // fixed point solution.
        buildStartingSet(a: Action, _set: BitSet): void {
            _set.makeAllSet();
        }

        // Entry point for this analysis. Analyze the App Action-wise.
        visitApp(n: App) {
            n.things.forEach((a: Decl) => {
                if (a instanceof Action && !(<Action>a).isPage()) {
                    this.pool = new SetElementsPool();
                    this.df = new DataflowVisitor(this, this.pool,/*backwards*/false, /*intersection*/true, /*useWorklist*/true);
                    this.df.dispatch(a);
                }
            });
        }
    }

    // * USED SET ANALYSIS *

    // Motivation:
    // ReachingDefinitions is not enough to eliminate all unnecessary "ok
    // checks". Since all checks are done once a value is used, there are
    // time in which the program already used the value and thus it was
    // already checked, and all the remaining checks may be eliminated.
    // Uset set analysis calculates the set of local variables that were
    // already used at a certain point of the program, but were not
    // redefined since the last use, therefore, enabling us to remove
    // redundant "ok checks".
    // Flags to activate: options.okElimination, URL ?okElimination

    // Manages the information we stick into the AST statament nodes.
    export class UsedSetMgr {
        constructor(public used: Expr[], public node: Stmt) { }

        // Convenience methods accessible for everyone
        public static getLocal(e: Token): LocalDef {
            if (e instanceof ThingRef) {
                var d = (<ThingRef>e).def;
                if (d instanceof LocalDef) return <LocalDef>d;
            }
            return null;
        }

        public static getLocalName(e: Token): String {
            var ld = this.getLocal(e);
            if (ld != null) {
                return ld.getName();
            }
            return null;
        }

        // The compiler asks whether the local ld was already used at this
        // point in order to eliminate redundant "ok checks".
        public alreadyUsed(ld: LocalDef): boolean {
            var res = false;
            this.used.forEach((e: Expr) => {
                var name1 = UsedSetMgr.getLocalName(e);
                if (name1 && name1 == ld.getName()) {
                    res = true;
                }
            });
            return res;
        }

        // Debugging
        public toString() {
            var str = "USED(" + this.node.nodeId + ") : {";
            str += this.used.map((e: Expr) => {
                return UsedSetMgr.getLocalName(e);
            }).join();
            return str + "}";
        }
    }

    // UsedAnalysis main class
    //
    // Main characteristics: Forward, intersection confluence
    // NOTE: gen/kill functions are reversed in order to compensate for the
    //   calling order of DataflowVisitor.
    export class UsedAnalysis
        implements IDataflowAnalysis {
        private df: DataflowVisitor;
        private curNode: Stmt;
        private pool: SetElementsPool;
        constructor() {
        }

        // This is actually the kill set. Since, for UsedAnalysis, we need to
        // kill after generation (as opposed to the common case), we reverse
        // the gen/kill functions.
        gen(n: ExprHolder, _set: BitSet, inSet: BitSet, isIV = false): void {
            // We are only interested in Call expressions
            if (!n.parsed || !(n.parsed instanceof Call))
                return;
            // .. Traverse nodes non-recursively
            var c = <Call>n.parsed;
            var exprVisitQueue: Expr[] = [];
            exprVisitQueue.push(c);
            while (exprVisitQueue.length > 0) {
                var cur = exprVisitQueue.shift();
                if (!(cur instanceof Call))
                    continue;
                var curCall = <Call> cur;
                exprVisitQueue = exprVisitQueue.concat(curCall.children());
                var prop = curCall.prop();
                // We are only interested in assignments
                if (prop == api.core.AssignmentProp) {
                    c.args[0].flatten(api.core.TupleProp).forEach((e) => {
                        var l = UsedSetMgr.getLocalName(e);
                        if (l) {
                            { // Kill all uses of the var that was defined
                              // in this expression, since it was redefined
                                _set.forEach((idx: number) => {
                                    var elm = this.pool.getElmById(idx);
                                    if (elm.key == l)
                                        _set.remove(idx);
                                });
                            }
                        }
                    });
                }
            }
        }

        // This is actually the gen set. We look for all uses of local
        // variables and add them to the set.
        kill(n: ExprHolder, _set: BitSet, isIV = false): void {
            if (!n.parsed)
                return;
            var exprVisitQueue: Expr[] = [];
            exprVisitQueue.push(n.parsed);
            while (exprVisitQueue.length > 0) {
                var e = exprVisitQueue.shift();
                var refcall = <Call>e;
                if (!(e instanceof Call)) {
                    if (e instanceof ThingRef) {
                        var ed = (<ThingRef> e).def;
                        if (ed instanceof LocalDef) {
                            var elm = this.pool.getElm((<LocalDef>ed).getName(), e);
                            _set.add(elm.id);
                        }
                    }
                } else {
                    if (refcall.prop() && refcall.prop().getName() == "is invalid") {
                        // x->is_invalid is not a use of x
                    } else if (refcall.prop() != api.core.AssignmentProp) {
                        exprVisitQueue = exprVisitQueue.concat(refcall.children());
                    } else {
                        exprVisitQueue = exprVisitQueue.concat(refcall.args.slice(1));
                    }
                }
            }
        }

        // Put our calculated UsedSet into the AST, so the compiler can query
        // later.
        updateNode(s: Stmt, n: ExprHolder) {
            n.usedSet = null;
            var usedSet: Expr[] = [];
            this.df.Ins[s.nodeId].forEach((idx: number) => {
                usedSet.push(this.pool.getElmById(idx).refNode);
            });
            if (usedSet.length > 0)
                n.usedSet = new UsedSetMgr(usedSet, s);
        }

        // Our start node begins with no used variables.
        buildStartNodeSet(a: Action, _set: BitSet): void {
        }

        // All remaining nodes are initialized with allSet, necessary for
        // intersection analyses.
        buildStartingSet(a: Action, _set: BitSet): void {
            _set.makeAllSet();
        }

        // Entry point for this analysis. Analyze the App Action-wise.
        visitApp(n: App) {
            n.things.forEach((a: Decl) => {
                if (a instanceof Action && !(<Action>a).isPage()) {
                    this.pool = new SetElementsPool();
                    this.df = new DataflowVisitor(this, this.pool,/*backwards*/false, /*intersection*/true, /*useWorklist*/true);
                    this.df.dispatch(a);
                }
            });
        }
    }

    // * AVAILABLE EXPRESSIONS *

    // Motivation:
    // The Available Expressions classic analysis is used to detect
    // opportunities for common subexpression elimination. Since the compiler
    // may separate an action into several steps, each one being a different
    // native JavaScript function, the JIT engine will miss optimization
    // opportunities beyond the step granularity, and this analysis can help
    // in these cases by performing global common subexpression elimination.
    // Flags to activate: options.commonSubexprElim, URL ?commonSubexprElim

    export class AvailableExpressionsMgr {
        constructor(public aeSet: Expr[], public node: Stmt) { }

        // Helper method to check if the entire expression is idempotent,
        // which means there is no effect in recalculating it or not.
        private hasOnlyIdempotentNodes(e: Expr) {
            var exprVisitQueue: Expr[] = [];
            exprVisitQueue.push(e);
            while (exprVisitQueue.length > 0) {
                var e = exprVisitQueue.shift();
                var refcall = <Call>e;
                if (!(e instanceof Call)) {
                    if (!(e instanceof Literal || (e instanceof ThingRef
                        && (<ThingRef>e).def.nodeType() == "localDef")))
                        return false;
                } else {
                    if (refcall.prop() != api.core.AssignmentProp &&
                        refcall.prop().getFlags() & PropertyFlags.Idempotent) {
                        exprVisitQueue = exprVisitQueue.concat(refcall.children());
                    } else {
                        return false;
                    }
                }
            }
            return true;
        }

        // The compiler will ask if this expression was already calculated at
        // this point and if they are idempotent. Returns the set of all such
        // expressions.
        public checkForIdenticalExpressions(e: Expr): Expr[]{
            var res: Expr[] = [];
            if (e == undefined)
                return;
            this.aeSet.forEach((ae: Expr) => {
                if (ae.toString() == e.toString()
                    && this.hasOnlyIdempotentNodes(e))
                    res.push(ae);
            });
            return res;
        }

        // Debugging
        public toString() {
            var str = "AE(" + this.node.nodeId + ") : {";
            str += this.aeSet.join();
            return str + "}";
        }
    }

    // Main characteriscs: Forward, intersection confluence
    // NOTE: gen/kill functions are reversed in order to compensate for the
    //   calling order of DataflowVisitor.
    export class AvailableExpressions
        implements IDataflowAnalysis {
        private df: DataflowVisitor;
        private curNode: Stmt;
        private pool: SetElementsPool;
        constructor() {
        }

        // Helper function to detect whether expression "e" uses local variable
        // "l"
        private usesLocal(e: Expr, l: String): boolean {
            var exprVisitQueue: Expr[] = [];
            exprVisitQueue.push(e);
            while (exprVisitQueue.length > 0) {
                var e = exprVisitQueue.shift();
                var refcall = <Call>e;
                if (!(e instanceof Call)) {
                    if (UsedSetMgr.getLocalName(e) == l)
                        return true;
                } else {
                    if (refcall.prop() != api.core.AssignmentProp) {
                        exprVisitQueue = exprVisitQueue.concat(refcall.children());
                    } else {
                        exprVisitQueue = exprVisitQueue.concat(refcall.args.slice(1));
                    }
                }
            }
            return false;
        }

        // This is actually the kill set. Since, for AvailableExpressions, we
        // need to kill after generation (as opposed to the common case), we
        // reverse the gen/kill functions.
        gen(n: ExprHolder, _set: BitSet, inSet: BitSet, isIV = false): void {
            if (isIV)
                return;
            if (!n.parsed || !(n.parsed instanceof Call))
                return;
            var c = <Call>n.parsed;
            var exprVisitQueue: Expr[] = [];
            exprVisitQueue.push(c);
            while (exprVisitQueue.length > 0) {
                var cur = exprVisitQueue.shift();
                if (!(cur instanceof Call))
                    continue;
                var curCall = <Call> cur;
                exprVisitQueue = exprVisitQueue.concat(curCall.children());
                var prop = curCall.prop();
                if (prop == api.core.AssignmentProp) {
                    c.args[0].flatten(api.core.TupleProp).forEach((e) => {
                        var l = UsedSetMgr.getLocalName(e);
                        if (l) {
                            { // Kill all expressions that the same var
                                _set.forEach((idx: number) => {
                                    var elm = this.pool.getElmById(idx);
                                    if (this.usesLocal(elm.refNode, l))
                                        _set.remove(idx);
                                });
                            }
                        }
                    });
                }
            }
        }

        // This is actually the gen set. We look for all uses of local
        // variables and add them to the set.
        kill(n: ExprHolder, _set: BitSet, isIV = false): void {
            if (isIV)
                return;
            if (!n.parsed)
                return;
            var exprVisitQueue: Expr[] = [];
            exprVisitQueue.push(n.parsed);
            while (exprVisitQueue.length > 0) {
                var e = exprVisitQueue.shift();
                var refcall = <Call>e;
                if (e instanceof Call) {
                    if (refcall.prop() != api.core.AssignmentProp) {
                        var elm = this.pool.getElm(refcall.toString(), refcall);
                        _set.add(elm.id);
                        exprVisitQueue = exprVisitQueue.concat(refcall.args.slice(1));
                    } else {
                        exprVisitQueue = exprVisitQueue.concat(refcall.children());
                    }
                }
            }
        }

        // Put our calculated UsedSet into the AST, so the compiler can query
        // later.
        updateNode(s: Stmt, n: ExprHolder) {
            n.aeSet = null;
            var aeSet: Expr[] = [];
            this.df.Ins[s.nodeId].forEach((idx: number) => {
                aeSet.push(this.pool.getElmById(idx).refNode);
            });
            if (aeSet.length > 0)
                n.aeSet = new AvailableExpressionsMgr(aeSet, s);
        }

        // Our start node begins with no available expressions.
        buildStartNodeSet(a: Action, _set: BitSet): void {
        }

        // All remaining nodes are initialized with allSet, necessary for
        // intersection analyses.
        buildStartingSet(a: Action, _set: BitSet): void {
            _set.makeAllSet();
        }

        // Entry point for this analysis. Analyze the App Action-wise.
        visitApp(n: App) {
            n.things.forEach((a: Decl) => {
                if (a instanceof Action && !(<Action>a).isPage()) {
                    this.pool = new SetElementsPool();
                    this.df = new DataflowVisitor(this, this.pool,/*backwards*/false, /*intersection*/true, /*useWorklist*/true);
                    this.df.dispatch(a);
                }
            });
        }
    }

    // * CONSTANT FOLDING/PROPAGATION FRAMEWORK *

    // Motivation:
    // This analysis computes the set of locals defined as constants, yielding
    // pairs <local, constant value>, and also folds an idempotent expression
    // that works with constants. A pair <local, constant value> may be the
    // result of many folded expressions. As with CSE, since the compiler
    // may separate an action into several steps, each one being a different
    // native JavaScript function, the JIT engine will miss optimization
    // opportunities beyond the step granularity, and this analysis can help
    // in these cases by performing global constant folding.
    // Flags to activate: options.constantPropagation, URL ?constantPropagation

    // Manages the information we stick into the AST statement nodes. It also
    // has the logic to perform folding for selected idempotent operators.
    export class ConstantPropagationMgr {
        constructor(public constantSet: Expr[], public node: Stmt) { }

        // Helper function.
        // Get the constant value of the local "d" by using the information
        // computed for this point of the program.
        public getLiteralValueFor(d: LocalDef) {
            var res = null;
            this.constantSet.forEach((e: Expr) => {
                if (e instanceof Call
                    && (<Call>e).prop() == api.core.AssignmentProp
                    && (<Call>e).args.length == 2
                    && (<Call>e).args[0] instanceof ThingRef
                    && (<ThingRef>((<Call>e).args[0])).def instanceof LocalDef
                    && (<LocalDef>((<ThingRef>((<Call>e).args[0])).def)).getName() == d.getName()
                    && (<Call>e).args[1] instanceof Literal
                    && (<Literal>((<Call>e).args[1])).data != null)
                    res = (<Literal>((<Call>e).args[1])).data;
            });
            return res;
        }

        // Helper function.
        // Avoids using JavaScript's "eval" and implement our own function
        // to evaluate expressions. Return null if we don't know how to
        // calculate this at compile time.
        public static evaluate(c: Call, args: any[]) {
            if (c.prop().getCategory() == PropertyCategory.Builtin) {
                if (c.prop().getSpecialApply() == "+")
                    return args[0] + args[1];
                else if (c.prop().getSpecialApply() == "-")
                    return args[0] - args[1];
                else if (c.prop().getSpecialApply() == "/")
                    return args[0] / args[1];
                else if (c.prop().getSpecialApply() == "*")
                    return args[0] * args[1];
                else if (c.prop().getSpecialApply() == "===")
                    return args[0] === args[1];
            }
            return null;
        }

        // Entry point for expression evaluation. By using the information
        // available at this point of the program (pairs <local, value>),
        // tries to evaluate the result of the expression "e". If it is
        // possible to know this at compile time, returns the value,
        // otherwise returns null.
        public precomputeLiteralExpression(e: Expr) {
            var visitExpr = (exp: Expr) => {
                var refcall = <Call>exp;
                if (!(exp instanceof Call)) {
                    if (exp instanceof Literal)
                        return (<Literal>exp).data;
                    if (exp instanceof ThingRef
                        && (<ThingRef>exp).def.nodeType() == "localDef"
                        && this.getLiteralValueFor(<LocalDef>(<ThingRef>exp).def) != null)
                        return this.getLiteralValueFor(<LocalDef>(<ThingRef>exp).def);
                } else {
                    if (refcall.prop() != api.core.AssignmentProp &&
                        refcall.prop().getFlags() & PropertyFlags.Idempotent) {
                        var values = refcall.children().map((ea: Expr) => visitExpr(ea));
                        var hasNull = false;
                        values.forEach((ea: Expr) => {
                            if (ea == null) hasNull = true;
                        });
                        if (!hasNull) {
                            return ConstantPropagationMgr.evaluate(refcall, values);
                        }
                    }
                    return null;
                }
            };
            return visitExpr(e);
        }

        // Debugging purposes
        public toString() {
            var str = "CP(" + this.node.nodeId + ") : {";
            str += this.constantSet.join();
            return str + "}";
        }
    }

    // ConstantPropagation will compute gen/kill sets to achieve the maximum
    // number of constant folding/propagation for locals of the action. It
    // uses ConstantPropagationMgr methods to help fold expressions with
    // literal leaves, which are also used by the compiler when emitting
    // code. This differs from the other analysis because they leave their
    // Manager to be used solely by the compiler.
    //
    // Main characteristics: Forward, intersection confluence
    export class ConstantPropagation
        implements IDataflowAnalysis {
        private df: DataflowVisitor;
        private curNode: Stmt;
        private pool: SetElementsPool;
        constructor() {
        }

        // Helper function to generate a fake assignment of literal "value"
        // to local "l". We need to generate these assingments to express
        // the result of folding, since they don't really exist in the original
        // source code.
        private generateAssignmentFor(l: LocalDef, value: any): Expr {
            var localThing = mkThing(l.getName());
            (<ThingRef>localThing).def = l;
            var literal = mkLit(value);
            return mkCall(PropertyRef.mkProp(api.core.AssignmentProp),
                [localThing, literal]);
        }

        // Helper function to handle copy assignments
        private cloneAndChangeDst(c: Call, dst: LocalDef): Expr {
            var args = c.args.slice(0);
            args[0] = mkThing(dst.getName());
            (<ThingRef>args[0]).def = dst;
            return mkCall(c.propRef, args);
        }

        // Convenience methods
        private getLocal(e: Token): LocalDef {
            if (e instanceof ThingRef) {
                var d = (<ThingRef>e).def;
                if (d instanceof LocalDef) return <LocalDef>d;
            }
            return null;
        }

        private getLocalName(e: Token): String {
            var ld = this.getLocal(e);
            if (ld != null) {
                return ld.getName();
            }
            return null;
        }

        // Handle copy. Copies the literal value of src to dst.
        private handleCopy(c: Call, _set: BitSet): boolean {
            var bypassGen = false;
            // Check for a regular copy
            if (c.prop() == api.core.AssignmentProp
                && c.args.length == 2
                && c.args[0] instanceof ThingRef
                && c.args[1] instanceof ThingRef) {
                var dst = this.getLocal(c.args[0]);
                var src = this.getLocal(c.args[1]);
                if (src != null && dst != null) {
                    // Find the literal value of src, if any
                    _set.forEach((idx: number) => {
                        var elm = this.pool.getElmById(idx);
                        var refcall = <Call> elm.refNode;
                        if (refcall) {
                            refcall.args[0].flatten(api.core.TupleProp).forEach((a) => {
                                var l2 = this.getLocalName(a);
                                if (l2 == src.getName()) { // Found
                                    // Copy to the destination generating a fake assingment
                                    var newCall = this.cloneAndChangeDst(refcall, dst);
                                    var newElm = this.pool.getElm(newCall.getText(), newCall);
                                    _set.add(newElm.id);
                                    bypassGen = true;
                                }
                            });
                        }
                    });
                }
            }
            return bypassGen;
        }

        // Entry point for generating/killing elements.
        private updateSet(n: ExprHolder, _set: BitSet, genKill: boolean): void {
            if (!n.parsed || !(n.parsed instanceof Call))
                return;
            var c = <Call>n.parsed;
            // Traverse all nodes of the expression non-recursively
            var exprVisitQueue: Expr[] = [];
            exprVisitQueue.push(c);
            while (exprVisitQueue.length > 0) {
                var cur = exprVisitQueue.shift();
                if (!(cur instanceof Call))
                    continue;
                var curCall = <Call> cur;
                exprVisitQueue = exprVisitQueue.concat(curCall.children());
                var prop = curCall.prop();
                // Look for assignments
                if (prop == api.core.AssignmentProp) {
                    c.args[0].flatten(api.core.TupleProp).forEach((e) => {
                        var l = this.getLocalName(e);
                        if (l) {
                            if (genKill) { // Generate
                                if (!this.handleCopy(curCall, _set)) {
                                    // Try to fold the src expression with the information we currently have
                                    // at this point and, if successful, assign it to the local
                                    var lit = (new ConstantPropagationMgr(this.generateCpSet(_set), null)).precomputeLiteralExpression(c.args[1]);
                                    if (lit != null) {
                                        var assgn = this.generateAssignmentFor(this.getLocal(e), lit);
                                        var elm = this.pool.getElm(assgn.getText(), assgn);
                                        _set.add(elm.id);
                                    }

                                }
                            } else { /// Kill all locals that this expression redefined
                                _set.forEach((idx: number) => {
                                    var elm = this.pool.getElmById(idx);
                                    var refcall = <Call> elm.refNode;
                                    var remove = false;
                                    if (refcall) {
                                        refcall.args[0].flatten(api.core.TupleProp).forEach((a) => {
                                            var l2 = this.getLocalName(a);
                                            if (l2 == l)
                                                remove = true;
                                        });
                                    }
                                    if (remove)
                                        _set.remove(idx);
                                });
                            }
                        }
                    });
                }
            }
        }

        // Wrappers to updateSet
        gen(n: ExprHolder, _set: BitSet, inSet: BitSet, isIV = false): void {
            if (!isIV)
                this.updateSet(n, _set, true);
        }

        kill(n: ExprHolder, _set: BitSet, isIV = false): void {
            if (!isIV)
                this.updateSet(n, _set, false);
        }

        // Helper function to compute the information the
        // ConstantPropagationMgr instance needs, converting the elements
        // of the BitSet into a regular JavaScript object array.
        private generateCpSet(_set: BitSet): Expr[] {
            var cpSet: Expr[] = [];
            _set.forEach((idx: number) => {
                cpSet.push(this.pool.getElmById(idx).refNode);
            });
            return cpSet;
        }

        // Update the AST with the info we calculated for this node,
        // use generateCpSet
        updateNode(s: Stmt, n: ExprHolder) {
            var cpSet = this.generateCpSet(this.df.Ins[s.nodeId]);
            n.cpSet = new ConstantPropagationMgr(cpSet, s);
        }

        // We start with no definitions
        buildStartNodeSet(a: Action, _set: BitSet): void {
        }

        // Sets are initialized full
        buildStartingSet(a: Action, _set: BitSet): void {
            _set.makeAllSet();
        }

        // Entry point for this analysis. Analyze the App Action-wise.
        visitApp(n: App) {
            n.things.forEach((a: Decl) => {
                if (a instanceof Action && !(<Action>a).isPage()) {
                    this.pool = new SetElementsPool();
                    this.df = new DataflowVisitor(this, this.pool,/*backwards*/false, /*intersection*/true, /*useWorklist*/true);
                    this.df.dispatch(a);
                }
            });
        }
    }

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    // Non-Dataflow Analyses

    // * INLINE ANALYSIS *

    // Motivation:
    // The inline analysis looks for actions that can be inlined and flags them
    // to the compiler. This means these actions will be called as native
    // JavaScript functions in the final code, bypassing the interpreter and
    // saving time.
    // Flags to activate: options.inlining  or URL: ?inlining

    export class CallGraphNode
    {
        constructor(public action: Action, public succs: CallGraphNode[], public preds: CallGraphNode[],
                   public canInline: boolean = false) { }

        public addSucc(succ: CallGraphNode)
        {
            for (var i = 0; i < this.succs.length; ++i)
            {
                if (this.succs[i] == succ)
                    return;
            }
            this.succs.push(succ);
        }

        public addPred(pred: CallGraphNode)
        {
            for (var i = 0; i < this.preds.length; ++i)
            {
                if (this.preds[i] == pred)
                    return;
            }
            this.preds.push(pred);
        }

    }

    // InlineAnalysis (multi-level)
    //
    // Step1: Build a callgraph for the App using the
    // visitor pattern. While it is visiting each Action, it checks not only
    // for calls that helps to build the callgraph, but also for statements
    // that precludes an action from being inlined (i.e. loop statements).
    //
    // Step2: Afterwards, it sorts the callgraph using topological
    // sort, allowing it to easily perform a bottom-up traversal of the tree.
    // Then, it marks actions as inlined if they satisfy some
    // predefined properties in "actionHasDesiredProperties()", if it doesn't
    // have any unwanted statements and finally if all the actions it calls
    // are also inlined.
    export class InlineAnalysis
        extends NodeVisitor {
        public hasChanged = false;

        private nodeMap: { [s: string]: CallGraphNode; };
        private nodes: CallGraphNode[];
        private nowVisiting: CallGraphNode;

        constructor() {
            super();
            this.nodes = [];
            this.nodeMap = {};
        }

        visitAstNode(n: AstNode) {
            this.visitChildren(n);
        }

        visitExprHolder(n: ExprHolder) {
            if (n.parsed)
                this.dispatch(n.parsed);
            this.visitChildren(n);
        }

        // Unwanted statements in an inlined action
        visitFor(n: For) {
            this.nowVisiting.canInline = false;
            this.visitChildren(n);
        }
        visitForeach(n: Foreach) {
            this.nowVisiting.canInline = false;
            this.visitChildren(n);
        }
        visitWhile(n: While) {
            this.nowVisiting.canInline = false;
            this.visitChildren(n);
        }
        visitBox(n: Box) {
            this.nowVisiting.canInline = false;
            this.visitChildren(n);
        }
        visitForeachClause(n: ForeachClause) {
            this.nowVisiting.canInline = false;
            this.visitChildren(n);
        }
        visitInlineActions(n: InlineActions) {
            this.nowVisiting.canInline = false;
            this.visitChildren(n);
        }
        visitInlineAction(n: InlineAction) {
            this.nowVisiting.canInline = false;
            this.visitChildren(n);
        }
        visitOptionalParameter(n: OptionalParameter) {
            this.nowVisiting.canInline = false;
            this.visitChildren(n);
        }
        visitContinue(n: Call) {
            this.nowVisiting.canInline = false;
            this.visitChildren(n);
        }
        visitBreak(n: Call) {
            this.nowVisiting.canInline = false;
            this.visitChildren(n);
        }
        visitReturn(n: Call) {
            this.nowVisiting.canInline = false;
            this.visitChildren(n);
        }

        // Build a new edge of the callgraph if calling another action
        visitCall(n: Call) {
            var a = n.calledAction();
            var prop = n.prop();
            // Check for unwanted calls
            if (prop && prop.getCategory() == PropertyCategory.Library) {
                this.nowVisiting.canInline = false;
                return;
            }
            if (prop && prop.shouldPauseInterperter()) {
                this.nowVisiting.canInline = false;
                return;
            }
            if (prop && prop.getName() == "run" && prop.parentKind.isAction) {
                this.nowVisiting.canInline = false;
                return;
            }
            if (a == null) {
                this.visitChildren(n);
                return;
            }
            if (a instanceof LibraryRefAction) {
                this.nowVisiting.canInline = false;
                return;
            }
            // This is a call to another action inside this App, create the
            // callgraph node if not available and create the edge to it.
            var cgNode = this.nodeMap[["a_", a.getName()].join("")];
            if (cgNode == undefined) {
                cgNode = new CallGraphNode(a, [], []);
                this.nodeMap[["a_", a.getName()].join("")] = cgNode;
                this.nodes.push(cgNode);
            }
            this.nowVisiting.addSucc(cgNode);
            cgNode.addPred(this.nowVisiting);
            this.visitChildren(n);
        }

        // Check if this action can be inlined (apart from the callgraph
        // analysis)
        actionHasDesiredProperties(a: Action) {
            return (a.isNormalAction()
                    && a.isPrivate
                    && !a.isLambda
                    && !a.isTest()
                    && a.isAtomic
                    && a.getOutParameters().length <= 1);
        }

        // Create a new callgraph node to this action and start visiting it.
        visitAction(n: Action) {
            if (n instanceof LibraryRefAction)
                return;
            var cgNode = this.nodeMap[["a_", n.getName()].join("")];
            if (cgNode == undefined) {
                cgNode = new CallGraphNode(n, [], []);
                this.nodeMap[["a_", n.getName()].join("")] = cgNode;
                this.nodes.push(cgNode);
            }
            this.nowVisiting = cgNode;
            this.nowVisiting.canInline = true;
            this.visitChildren(n);
            if (this.nowVisiting.canInline
                && this.actionHasDesiredProperties(n)
                && this.nowVisiting.succs.length == 0) {
                n.canBeInlined = true;
            }
        }

        // Sort the callgraph node to allow an easy bottom-up traversal of
        // of the call tree.
        public topologicalSort() : CallGraphNode[] {
            var traversalOrder : CallGraphNode[] = [];
            var visited : { [idx: number] : boolean; } = <any>{};
            var indexMap: { [name: string] : number;} = {};
            for (var i = 0; i < this.nodes.length; ++i) {
                visited[i] = false;
                indexMap[["a_", this.nodes[i].action.getName()].join("")] = i;
            }
            var visit = (cur: number) => {
                if (visited[cur])
                    return;
                visited[cur] = true;
                for (var i = 0; i < this.nodes[cur].preds.length; ++i) {
                    visit(indexMap[["a_", this.nodes[cur].preds[i].action.getName()].join("")]);
                }
                traversalOrder.unshift(this.nodes[cur]);
            }
            for (var i = 0; i < this.nodes.length; ++i) {
                visit(i);
            }
            return traversalOrder;
        }

        // Entry point for the inline analysis.
        public nestedInlineAnalysis() {
            var sorted = this.topologicalSort();
            for (var i = 0; i < sorted.length; ++i) {
                if (sorted[i].action.canBeInlined)
                    continue;
                var canInline = this.actionHasDesiredProperties(sorted[i].action)
                    && sorted[i].canInline;
                if (!canInline)
                    continue;
                for (var j = 0; j < sorted[i].succs.length; ++j) {
                    if (!sorted[i].succs[j].action.canBeInlined)
                        canInline = false;
                }
                sorted[i].action.canBeInlined = canInline;
            }
        }

        // Debugging purposes
        public dumpCallGraph() {
            for (var i = 0; i < this.nodes.length; ++i) {
                if (this.nodes[i].action.canBeInlined)
                    Util.log("Node " + i + ": " + this.nodes[i].action.toString()
                            + " [can be inlined]");
                else
                    Util.log("Node " + i + ": " + this.nodes[i].action.toString());
                for (var j = 0; j < this.nodes[i].succs.length; ++j) {
                    Util.log(" |-> calls " + this.nodes[i].succs[j].action.toString());
                }
            }
        }
    }
}
