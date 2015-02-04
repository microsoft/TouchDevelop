///<reference path='refs.ts'/>

module TDev {
    
    export interface IStringSet {
        [key: string]: boolean;
    }

    export function setClone(s: IStringSet):IStringSet {
        if (!s) return {};

        var res:IStringSet = {};
        Object.keys(s).forEach(key => key && (res[key] = true));
        return res;
    }

    export function setEmpty(s: IStringSet) {
        if (!s) return true;
        return Object.keys(s).length === 0;
    }

    export function setSize(s: IStringSet) {
        if (!s) return 0;
        return Object.keys(s).length;
    }

    export function mkSet(...vals: string[]): IStringSet {
        var ret:IStringSet = {};
        vals.forEach(k => ret[k] = true);
        return ret;
    }

    export function setUnion(s0: IStringSet, s1: IStringSet) {
        if (!s0) return setClone(s1);
        if (!s1) return setClone(s0);

        var res:IStringSet = {};
        Object.keys(s0).forEach(key => key && (res[key] = true));
        Object.keys(s1).forEach(key => key && (res[key] = true));
        return res;
    }

    export function setIntersection(s0: IStringSet, s1: IStringSet):IStringSet {
        if (!s0 || !s1) return {};

        var res:IStringSet = {};
        Object.keys(s0).forEach(key => key && s1[key] && (res[key] = true));
        return res;
    }

    export function setDifference(s0: IStringSet, s1: IStringSet):IStringSet {
        if (!s0) return {};
        if (!s1) return setClone(s0);

        var res:IStringSet = {};
        Object.keys(s0).forEach(key => key && !s1[key] && (res[key] = true));
        return res;
    }

    export function setToArray(s: IStringSet) {
        if (!s) return [];
        
        return Object.keys(s).filter(k => !!k);
    }

    export function setFromArray(s: string[]):IStringSet {
        if (!s) return {};

        var ret:IStringSet = {};
        s.forEach(k => ret[k] = true);
        return ret;
    }

    export class FullRunMapper
        extends AST.NodeVisitor {
        private fullRunMap: IStringSet = TDev.mkSet();

        constructor(public runMap: RunBitMap, public stackTrace: IPackedStackTrace) {
            super()
        }
        public visitAstNode(node: AST.AstNode) {
            if (!this.runMap && !this.stackTrace) return;
            if (!node) return;
            return this.visitChildren(node);
        }

        public visitDecl(d: AST.Decl) {
            return this.visitAstNode(d);
        }

        private definitelyVisitedCache = {};
        private definitelyVisited(id: string): boolean {
            if (!id) return;
            if (this.definitelyVisitedCache[id] !== undefined) return this.definitelyVisitedCache[id];
            
            var ret = (this.runMap && this.runMap.contains(id)) || (this.stackTrace && this.stackTrace.pack.some(node => node.id === id));
            this.definitelyVisitedCache[id] = ret;
            return ret;
        }

        private definitelyVisitedThisOrChildrenCache = {};
        private definitelyVisitedThisOrChildren(s: AST.Stmt): boolean {
            if (!s) return;

            var id = s.stableId;

            if (this.definitelyVisitedThisOrChildrenCache[id] !== undefined) return this.definitelyVisitedThisOrChildrenCache[id];
            // the depth level is not big, so we can just use recursion
            var ret = this.definitelyVisited(s.stableId) || s.children().some((child: AST.Stmt) => this.definitelyVisitedThisOrChildren(child));
            this.definitelyVisitedThisOrChildrenCache[s.stableId] = ret;
            return ret;
        }

        // three state return value: true if visited else false; undefined for "don't know"
        private visitedCodeBlockStart(cb: AST.Block) {
            if (this.runMap &&
                cb &&
                cb.children() &&
                (cb.children().length > 0)) {
                var firstNonComment = cb.children().filter(stmt => (stmt.nodeType() !== "comment") && !!stmt.stableId)[0];

                if (!firstNonComment) return; // the bb contains only comments, not interested

                Util.assert(!!firstNonComment.stableId); // these guys should be already jsonified

                return (this.definitelyVisited(firstNonComment.stableId));
            } else return;
        }

        private visitedCodeBlockEnd(cb: AST.Block) {
            if (this.runMap &&
                cb &&
                cb.children() &&
                (cb.children().length > 0)) {
                var lastNonComment = cb.children().filter(stmt => stmt.nodeType() !== "comment" && !!stmt.stableId).peek();

                if (!lastNonComment) return; // the bb contains only comments, not interested

                Util.assert(!!lastNonComment.stableId);  // these guys should be already jsonified

                return (this.definitelyVisited(lastNonComment.stableId));
            } else return;
        }

        private visitedCodeBlockMiddle(cb: AST.Block, stmt: AST.Stmt) {
            if (this.runMap &&
                cb &&
                cb.children() &&
                (cb.children().length > 0)) {

                var stmtIndex = -1;
                var lastVisitedIndex = -1;

                cb.children().forEach((v, ix) => {
                    if (this.definitelyVisitedThisOrChildren(v)) lastVisitedIndex = ix;
                    if (v.stableId === stmt.stableId) stmtIndex = ix;
                });

                Util.assert(stmtIndex !== -1 && lastVisitedIndex !== -1);

                return (stmtIndex <= lastVisitedIndex);
            }
        }

        private visitedStmt(s: AST.Stmt) {
            if (!this.runMap) return;

            var visitedStart = this.visitedCodeBlockStart(s.parentBlock());
            var visitedEnd = this.visitedCodeBlockEnd(s.parentBlock());

            if (!visitedStart) {
                return false;
            }

            if (visitedStart && visitedEnd) {
                return true;
            }

            if (this.visitedCodeBlockMiddle(s.parentBlock(), s)) {
                return true;
            }
        }

        public visitStmt(s: AST.Stmt) {
            super.visitStmt(s);
            if (this.visitedStmt(s)) this.fullRunMap[s.stableId] = true;
        }

        public visitExprHolder(node: AST.ExprHolder) { // don't go below ExprHolder level
        }

        static doit(rm: RunBitMap, st: IPackedStackTrace, theScript: AST.App) {
            var visitor = new FullRunMapper(rm, st);
            visitor.dispatch(theScript);
            return visitor.fullRunMap;
        }
    }

    export class FullRunMapDebuggingAnnotator
        extends AST.NodeVisitor {
        
        constructor(public fullRunMap: IStringSet) { super(); }

        public visitApp(script: AST.App) {
            super.visitApp(script);
            if (!this.fullRunMap) script.annotatedBy = AST.AnnotationMode.None;
            else script.annotatedBy = AST.AnnotationMode.Coverage;
        }

        public visitExprStmt(s: AST.ExprStmt) {
            if (!s || !s.stableId) return;
            if (this.fullRunMap[s.stableId]) s.expr.debuggingData = { visited: true };
            else s.expr.debuggingData = {};
        }

        public visitAnyIf(s: AST.If) {
            if (!s) return;
            var firstTrue = coalesce(s)(s => s.thenBody)(then_ => then_.firstNonComment())(fnc => fnc.stableId)();
            var firstFalse = coalesce(s)(s => s.elseBody)(else_ => else_.firstNonComment())(fnc => fnc.stableId)();

            var visitedTrue = this.fullRunMap[firstTrue];
            var visitedFalse = this.fullRunMap[firstFalse];

            if (visitedTrue && visitedFalse) s.rawCondition.debuggingData = { visited: true };
            else if (visitedTrue) s.rawCondition.debuggingData = { alwaysTrue: true };
            else if (visitedFalse) s.rawCondition.debuggingData = { alwaysFalse: true };

            super.visitAnyIf(s);
        }

        public visitAstNode(node: AST.AstNode) {
            if (!node) return;
            return this.visitChildren(node);
        }

        public visitInlineActions(node: AST.InlineActions) {
            if (!node) return;
            return this.visitExprStmt(node);
        }
    }

    export function getNormalCoverageAsync(scriptId: string, theScript: AST.App, compilerVersion: string) : Promise {
        var unionPromise = Cloud.getCoverageDataAsync(scriptId, compilerVersion).then(a => a.length > 0 ? a[0] : null);
        var intersectionPromise = Cloud.getCoverageDataAsync(scriptId, compilerVersion, true).then(a => a.length > 0 ? a[0] : null);

        var unwrapCoverage = (c) => c && FullRunMapper.doit(RunBitMap.fromJSON(c.astnodes), null, theScript);
        return unionPromise.then(union => {
            var unwrappedU = unwrapCoverage(union);
            return intersectionPromise.then(intersection => {
                var unwrappedI = unwrapCoverage(intersection);
                return { union: unwrappedU, intersection: unwrappedI };
            });
        });
    }

    export function accumulateRunMaps(runs: IRun[], theScript: AST.App, existingUAcc ?: IStringSet, existingIAcc ?: IStringSet) {
        var uacc = existingUAcc;
        var iacc = existingIAcc;

        runs.forEach(run => {
            var full = FullRunMapper.doit(run.runmap, run.stack, theScript);
            uacc = setUnion(uacc, full);
            iacc = (!iacc) ? full : setIntersection(iacc, full);
        });

        return { union: uacc, intersection: iacc };
    }

    export function accumulateStacks(runs: IRun[], theScript: AST.App, existingTops?: IStringSet, existingStacks?: IStringSet) {
        var tops:IStringSet = existingTops ? existingTops : {};
        var stacks = existingStacks;

        runs.forEach(run => {
            var stack = run.stack;
            if (!stack || !stack.pack || !stack.path) return;

            var full = setFromArray(stack.pack.map(node => node.id).filter(id => !!id));
            var top = stack.pack[stack.path[0]].id;
            stacks = setUnion(stacks, full);
            tops[top] = true;
        });

        return { tops: tops, full: stacks };
    }

    export class ScriptDebuggingBugginessAnnotator extends AST.NodeVisitor {
        private bugSkeleton: IStringSet;
        private bugShell: IStringSet;
        private bugInnerSkeleton: IStringSet;
        public maxRating = 9;
        public topRatedId: string;
        public topRatedRate: number = 0;
        public localTopRate: number = 0;
        
        public topRateContainer = { critical: 0 };

        constructor(
            public normalPortrait: { union: IStringSet; intersection: IStringSet; },
            public bugPortrait: { union: IStringSet; intersection: IStringSet; },
            public stacky: { tops: IStringSet; full: IStringSet },
            public additional: IStringSet = {},
            public errorMessage: string = null)
        {
            super();
            
            this.bugSkeleton = setEmpty(normalPortrait.intersection) ? {} : setDifference(bugPortrait.intersection, normalPortrait.intersection) || {};
            this.bugInnerSkeleton = setEmpty(normalPortrait.union) ? {} : setDifference(this.bugSkeleton, normalPortrait.union);
            this.bugShell = setEmpty(normalPortrait.union) ? {} : setDifference(bugPortrait.union, normalPortrait.union);           
        }

        public rate(id: string): number {
            var ret = 0;
            var countSet = (s: IStringSet) => ret += (s[id] ? 1 : 0);
            
            countSet(this.bugPortrait.union || {});
            countSet(this.bugPortrait.intersection || {});
            countSet(this.stacky.tops || {});
            countSet(this.stacky.full || {});
            countSet(this.bugShell);
            countSet(this.bugSkeleton);
            countSet(this.bugInnerSkeleton);
            countSet(this.additional);
            countSet(this.additional);

            if (ret > this.maxRating) ret = this.maxRating;
            if (ret > this.localTopRate) this.localTopRate = ret;
            if (ret > this.topRatedRate) {
                this.topRatedRate = ret;
                this.topRatedId = id;
            }
            
            return ret;
        }

        public visitApp(script: AST.App) {
            super.visitApp(script);

            script.annotatedBy = AST.AnnotationMode.Crash;
            this.topRateContainer.critical = this.topRatedRate;
        }

        public visitAction(node: AST.Action) {
            this.localTopRate = 0;
            super.visitAction(node);
            if (!node || !this.localTopRate) return;
            
            node.debuggingData = { critical: this.localTopRate, max: this.topRateContainer };
        }

        public visitAstNode(node: AST.AstNode) {
            if (!node) return;
            return this.visitChildren(node);
        }

        public updateRatingForGlobals(node: AST.AstNode, rate: number) {
            var varFinder = new AST.VariableFinder();
            varFinder.traverse(node, true);
            varFinder.readGlobals.forEach((g: AST.GlobalDef) => {
                var dd = g.debuggingData;
                if (dd && dd.critical) (dd.critical < rate) && (dd.critical = rate);
                else g.debuggingData = { critical: rate, max: this.topRateContainer };
            });
        }

        public visitAnyIf(node: AST.If) {
            if (!node) return;
            super.visitAnyIf(node);

            var rate = this.rate(node.stableId);
            node.rawCondition.debuggingData = { critical: rate, max: this.topRateContainer };
            this.updateRatingForGlobals(node.rawCondition, rate);
        }

        public visitFor(node: AST.For) {
            if (!node) return;
            super.visitFor(node);

            var rate = this.rate(node.stableId);
            node.upperBound.debuggingData = { critical: rate, max: this.topRateContainer };
            this.updateRatingForGlobals(node.upperBound, rate);
        }

        public visitForeach(node: AST.Foreach) {
            if (!node) return;
            super.visitForeach(node);

            var rate = this.rate(node.stableId);
            node.collection.debuggingData = { critical: rate, max: this.topRateContainer };
            this.updateRatingForGlobals(node.collection, rate);
        }

        public visitWhile(node: AST.While) {
            if (!node) return;
            super.visitWhile(node);

            var rate = this.rate(node.stableId);
            node.condition.debuggingData = { critical: rate, max: this.topRateContainer };
            this.updateRatingForGlobals(node.condition, rate);
        }

        public visitInlineActions(node: AST.InlineActions) {
            if (!node) return;
            return this.visitExprStmt(node);
        }

        public visitExprStmt(s: AST.ExprStmt) {
            if (!s || !s.stableId) return;

            var rate = this.rate(s.stableId);
            var message = this.stacky && this.stacky.tops && this.stacky.tops[s.stableId] ? this.errorMessage : undefined;

            s.expr.debuggingData = { critical: rate, max: this.topRateContainer, errorMessage: message };
            
            this.updateRatingForGlobals(s.expr, rate);
        }

    }

    export class StmtHashTable extends Hashtable {
        constructor() {
            super((stmt: AST.Stmt) => Hashtable.stringHash(stmt.stableId), (lhv: AST.Stmt, rhv: AST.Stmt) => lhv.stableId === rhv.stableId);
        }

        public push(stmt: AST.Stmt) {
            super.set(stmt, true);
        }
    }

    export class SmallBackSlicer {
        public slice: StmtHashTable = new StmtHashTable(); // really a hashset of Stmts
        public visitedCFNodes: StmtHashTable = new StmtHashTable(); // really a hashset of Stmts
        public relevants: StmtHashTable = new StmtHashTable(); // Stmt => IStringSet
        public vars: StmtHashTable = new StmtHashTable() // Stmt => VariableFinder

        private steps = 0;
        
        constructor(public roots: AST.Stmt[], public universum: IStringSet) { }

        static varsFrom(stmt: AST.AstNode) {
            if (stmt instanceof AST.If) stmt = (<AST.If>stmt).rawCondition;
            if (stmt instanceof AST.For) stmt = (<AST.For>stmt).upperBound;
            if (stmt instanceof AST.While) stmt = (<AST.While>stmt).condition;
            if (stmt instanceof AST.Foreach) stmt = (<AST.Foreach>stmt).conditions;

            var ret = new AST.VariableFinder();
            ret.traverse(stmt, true);
            return ret;
        }

        private defs(stmt: AST.Stmt): IStringSet {
            var vars: AST.VariableFinder = this.vars.get(stmt);
            if (!vars) this.vars.set(stmt, vars = SmallBackSlicer.varsFrom(stmt));
            return setFromArray(vars.writtenGlobals.map(v => v.getName()).concat(vars.writtenLocals.map(v => v.getName())));
        }

        private refs(stmt: AST.Stmt): IStringSet {
            var vars: AST.VariableFinder = this.vars.get(stmt);
            if (!vars) this.vars.set(stmt, vars = SmallBackSlicer.varsFrom(stmt));
            return setFromArray(vars.readGlobals.map(v => v.getName()).concat(vars.readLocals.map(v => v.getName())));
        }

        private majorStepBack(from: AST.Stmt[]): AST.Stmt[]{
            var retSet = new StmtHashTable();
            from.forEach(stmt => this.stepBack(stmt).forEach(pred => (pred) && (retSet.push(pred))));
            return retSet.keys();
        }

        static mayBeControlFlowDependency(from: AST.Stmt, stmt: AST.Stmt) {
            var cf = stmt instanceof AST.If || stmt instanceof AST.For || stmt instanceof AST.Foreach || stmt instanceof AST.While;
            return cf && AST.PredecessorsFinder.enclosingStmt(from) === stmt; // can use object equality here
        }

        private stepBack(from: AST.Stmt): AST.Stmt[]{
            var total: AST.Stmt[];
            total = [];
            total = AST.PredecessorsFinder.find(from);
            var refs = this.relevants.get(from);

            var ignoreIxs: number[] = [];
            total.forEach((stmt, ix) => {
                var check = this.relevants.get(stmt);
                
                var defs = this.defs(stmt);
                var newRefs = this.refs(stmt);
                
                var rel1 = setIntersection(refs, defs);
                var rel2 = setDifference(refs, defs);

                var rel3 = check || mkSet();

                var cf = SmallBackSlicer.mayBeControlFlowDependency(from, stmt) && !(this.visitedCFNodes.get(stmt));
                if (!setEmpty(rel1) || cf) {
                    if (cf) this.visitedCFNodes.set(stmt, true);
                    this.addToSlice(stmt);
                    rel3 = setUnion(rel3, newRefs);
                }

                var ret = setUnion(rel2, rel3);
                this.relevants.set(stmt, ret);
                if (setSize(check) === setSize(ret)) ignoreIxs.push(ix);
            });

            ignoreIxs.forEach(ix => delete total[ix]);
            
            return total;
        }

        
        
        private addToSlice(stmt: AST.Stmt) {
            if (stmt && this.universum && this.universum[stmt.stableId]) this.slice.set(stmt, true);
        }

        public doit() {
            var current = this.roots;
            this.roots.forEach(root => {
                this.relevants.set(root, this.refs(root));
                this.addToSlice(root);
            });
            var limitDepth = 100;
            var i = 0;
            while (current.length > 0 && i < limitDepth) {
                ++i;
                current = current.filter(stmt => !!this.universum[stmt.stableId]);
                current = this.majorStepBack(current);
            }

            return setFromArray(this.slice.keys().map((stmt:AST.Stmt) => stmt.stableId));
        }
    }

    export class ScriptBugginessFeatureSurvey implements EditorSpy {
        static surveyName = "BucketColours";

        private manager: IEditorSurveyManager;
        private eventCounter = 0;

        public addTo(manager: IEditorSurveyManager) {
            manager.addSpy(ScriptBugginessFeatureSurvey.surveyName, this);
        }

        /* override */
        public onAddThisSpy(manager: IEditorSurveyManager) {
            this.manager = manager;
        }

        /* override */
        public onRemoveThisSpy() {
            delete this.manager;
            this.eventCounter = 0;
        }

        public removeSelf() {
            if (this.manager) this.manager.removeSpy(ScriptBugginessFeatureSurvey.surveyName);
        }

        /* override */
        public onRun(_) {
            this.removeSelf();
        }

        /* override */
        public onLeaveDebugMode() {
            this.removeSelf();
        }

        /* override */
        public onExit() {
            this.removeSelf();
        }

        private scoreDD(debuggingData) {
            if (debuggingData && debuggingData.critical && debuggingData.max) {
                var scoreF = debuggingData.critical / debuggingData.max.critical;
                return Math.ceil(scoreF * 5) * 20; // level to 20-40-60-80-100 %
            } else return 0;
        }

        private check() {
            if (this.eventCounter > 10) {
                this.removeSelf();
                tick(Ticks.coverageBucketSurveyExceededSuccessfully);
            } 
            this.eventCounter++;
        }

        /* override */
        public onEdit(node: AST.AstNode) {
            if (node instanceof AST.ExprStmt) {
                this.check();
                var dd: any = (<AST.ExprStmt>node).expr.debuggingData;
                if (!dd || !dd.max) return; // this is a new statement
                var scorr = this.scoreDD(dd);
                tickArg(Ticks.coverageBucketSurveyStatementEdit, scorr + "");
                return;
            }
        }

        /* override */
        public onView(decl: AST.Decl) {
            if (decl instanceof AST.Action) {
                this.check();
                var dd: any = (<AST.Action>decl).debuggingData;
                if (!dd || !dd.max) return; // this is a new action
                var scorr = this.scoreDD(dd);
                tickArg(Ticks.coverageBucketSurveyActionEdit, scorr + "");
                return;
            }
        }

        /* override */
        public onAddNear(node: AST.AstNode) {
            if (node instanceof AST.ExprStmt) {
                this.check();
                var dd: any = (<AST.ExprStmt>node).expr.debuggingData;
                if (!dd || !dd.max) return; // this is a new statement
                var scorr = this.scoreDD(dd);
                tickArg(Ticks.coverageBucketSurveyStatementEdit, scorr + "");
                return;
            }
        }

        /* override */
        public onDelete(node: AST.Block) {
            this.check();
            node.stmts.forEach(stmt => {
                if (stmt instanceof AST.ExprStmt) {
                    var dd: any = (<AST.ExprStmt>stmt).expr.debuggingData;
                    if (!dd || !dd.max) return; // this is a new statement
                    var scorr = this.scoreDD(dd);
                    tickArg(Ticks.coverageBucketSurveyStatementEdit, scorr + "");
                }
            });
        }

        /* override */
        public onEnterDebugMode() {
            this.check();
            tick(Ticks.coverageBucketSurveyDebugger);
        }

        /* override */
        public onAddBreakpoint(node: AST.Stmt) {
            this.check();
            if (node instanceof AST.ExprStmt) {
                var dd: any = (<AST.ExprStmt>node).expr.debuggingData;
                if (!dd || !dd.max) return; // this is a new statement
                var scorr = this.scoreDD(dd);
                tickArg(Ticks.coverageBucketSurveyBreakpoint, scorr + "");
                return;
            }
        }

    }

}

