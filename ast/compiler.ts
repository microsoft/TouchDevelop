///<reference path='refs.ts'/>

module TDev.AST
{
    var crashOnInvalid = false;
    var blockChaining = false;

    export interface ProfilingDataCollection {
        unitduration: number;
        compilerversion: string;
        count?: number;
        astnodes?: { [id: string]: ProfilingAstNodeData; };  // TD Ast node --> performance
        show?: boolean;
        minimumEps?: number;
        maximumEps?: number;
        averageEps?: number;
    }

    export class StmtIdCollector extends NodeVisitor {
        constructor(public ids: string[] = []) {
            super();
        }

        visitAstNode(node: AstNode) {
            return this.visitChildren(node);
        }

        visitDecl(decl: Decl) {
            return this.visitChildren(decl);
        }

        visitStmt(stmt: Stmt) {
            this.ids.push(stmt.stableId);
            super.visitStmt(stmt);
        }

        static collect(script: App) {
            var self = new StmtIdCollector();
            self.dispatch(script);
            return self.ids;
        }
    }

    export class QuotingCtx
    {
        private mapping: any = {};
        private nameMapping: any = {};
        private usedNames:any = {};

        private unUnicode(s:string)
        {
            s = s.replace(/[^a-zA-Z0-9]+/g, "_");
            if (s == "" || /^[0-9]/.test(s)) s = "_" + s;
            return s;
        }

        public quote(s:string, id:number)
        {
            var si = s + ":" + id;
            var name = s;
            if (this.mapping.hasOwnProperty(si)) {
                return this.mapping[si];
            }
            s = this.unUnicode(s);
            if (this.usedNames.hasOwnProperty(s)) {
                var n = 1;
                while (this.usedNames.hasOwnProperty(s + n.toString())) {
                    n++;
                }
                s = s + n.toString();
            }
            this.usedNames[s] = 1;
            this.mapping[si] = s;
            this.nameMapping[name] = s;
            return s;
        }

        public getNameMapping() { return this.nameMapping; }
    }

    export enum JsNodeCategory
    {
        Bad,
        ExprStmt,
        Goto,
        If,
        Label,
        TmpDef,
        TmpRef,
        LabelRef,
        Call,
        Infix,
        Term,
        DeleteStmt,
        Lambda,
   }

    export class JsNode
    {
        private cost:number;

        public category() { return JsNodeCategory.Bad; }
        public toString() { return "<???>"; }
        public isUsedLabel() { return false; }
        public injectEndIfJumps() { }
        public dump(wr:(s:string) => void)
        {
            wr(this.toString());
        }
        public forEachExpr(f:(e:JsExpr) => void) { Util.die(); }
    }

    export class JsStmt
        extends JsNode
    {
        constructor() {
            super()
        }
    }

    export class JsExpr
        extends JsNode
    {
        constructor() {
            super()
        }
        public _alwaysValid = false;
        public alwaysValid() { return this._alwaysValid }
        public gets(v:JsExpr) : JsStmt
        {
            return new JsExprStmt(new JsInfix(this, "=", v));
        }

        public makeValid()
        {
            this._alwaysValid = true
            return this
        }
    }

    export class JsCall
        extends JsExpr
    {
        constructor(public recv:JsExpr, public method:string, public args:JsExpr[]) {
            super()
        }
        public category() { return JsNodeCategory.Call; }
        public forEachExpr(f:(e:JsExpr) => void)
        {
            f(this);
            if (this.recv != null) this.recv.forEachExpr(f);
            if (this.args)
            this.args.forEach((a) => a.forEachExpr(f));
        }

        public toString()
        {
            var isAlwaysValid = (e:JsExpr) =>
            {
                if (crashOnInvalid) return true;

                if (e.alwaysValid()) return true;

                if (e instanceof JsTerm) {
                    var t = <JsTerm>e;
                    if (t.code == "s") return true;
                }
                return false;
            }

            var meth = this.method;
            var args2 = this.args;
            if (meth == "ok") {
                args2 = args2.filter((e) => !isAlwaysValid(e));
                if (args2.length == 0)
                    return "true";
                meth += args2.length;
                args2.unshift(new JsTerm("s"));
            }
            var a = meth;
            if (args2) a += "(" + args2.map((e) => e.toString()).join(", ") + ")";
            if (this.recv == null)
                return a;
            else {
                var r = this.recv.toString();
                if (meth == "[")
                    return r + a + "]";
                else if (meth == "")
                    return r + a;
                else
                    return r + "." + a;
            }
        }

        static direct(meth:string, args:JsExpr[]) { return new JsCall(null, meth, args); }
        static directInst(recv:JsExpr, meth:string, args:JsExpr[]) { return new JsCall(recv, meth, args); }

        static okAnd(args:JsExpr[], andThen:JsExpr) { return new JsInfix(JsCall.direct("ok", args), "&&", andThen); }

        static mk(recv:JsExpr, method:string, args:JsExpr[])
        {
            return JsCall.okAnd(recv == null ? args : [recv].concat(args), new JsCall(recv, method, args));
        }
    }

    export class JsInfix
        extends JsExpr
    {
        constructor(public left:JsExpr, public op:string, public right:JsExpr) {
            super()
        }
        public category() { return JsNodeCategory.Infix; }
        public forEachExpr(f:(e:JsExpr) => void)
        {
            f(this);
            if (this.left != null) this.left.forEachExpr(f);
            if (this.right != null) this.right.forEachExpr(f);
        }

        public toString()
        {
            if (this.left == null)
                return "(" + this.op + this.right.toString() + ")";

            var ll = this.left.toString();
            if (this.right == null)
                return "(" + ll + this.op + ")";
            else {
                var rr = this.right.toString();
                if (this.op == "&&" && ll == "true") return rr;
                return "(" + ll + " " + this.op + " " + rr + ")";
            }
        }
    }

    export class JsTerm
        extends JsExpr
    {
        constructor(public code:string) {
            super()
        }
        public category() { return JsNodeCategory.Term; }
        public forEachExpr(f:(e:JsExpr) => void) { f(this); }
        public toString() { return this.code; }
    }

    export class JsLiteral
        extends JsTerm
    {
        constructor(c:string) {
            super(c)
        }
        public alwaysValid() { return true }
    }

    export class JsTmpRef
        extends JsExpr
    {
        constructor(public tmp:JsTmpDef) {
            super()
        }
        public category() { return JsNodeCategory.TmpRef; }
        public forEachExpr(f:(e:JsExpr) => void) { f(this); }
        public toString() { return this.tmp.getRef(); }
    }

    export class JsLabelRef
        extends JsExpr
    {
        constructor(public label:JsLabel) {
            super()
        }
        public category() { return JsNodeCategory.LabelRef; }
        public forEachExpr(f:(e:JsExpr) => void) { f(this); }
        public toString() { return this.label.id; }
    }

    export class JsTmpDef
        extends JsStmt
    {
        constructor(public stem:string, public initial:JsExpr) {
            super()
        }
        public category() { return JsNodeCategory.TmpDef; }
        public id:number;
        public isLocal:boolean = true;
        public definitionPoint:number;

        public forEachExpr(f:(e:JsExpr) => void) { this.initial.forEachExpr(f); }

        private getName() { return "t_" + this.stem + "_" + this.id.toString(); }
        public getRef() { return this.isLocal ? this.getName() : "s." + this.getName(); }
        public toString() {
            if (this.isLocal)
                return "var " + this.getName() + " = " + this.initial.toString() + ";";
            else
                return this.getRef() + " = " + this.initial.toString() + ";";
        }
    }

    export class JsExprStmt
        extends JsStmt
    {
        constructor(public code:JsExpr) {
            super()
            Util.assert(!!code)
        }
        public category() { return JsNodeCategory.ExprStmt; }
        public toString() { return this.code.toString() + ";"; }
        public forEachExpr(f:(e:JsExpr) => void) { this.code.forEachExpr(f); }
    }

    export class JsDeleteStmt
        extends JsStmt
    {
        constructor(public target:JsExpr) {
            super()
        }
        public category() { return JsNodeCategory.DeleteStmt; }
        public toString() { return "delete " + this.target.toString() + ";"; }
        public forEachExpr(f:(e:JsExpr) => void) { this.target.forEachExpr(f); }
    }

    export class JsLambda
        extends JsExpr
    {
        constructor(public argCount:number, public body:JsExpr) {
            super()
        }
        public alwaysValid() { return true }
        public category() { return JsNodeCategory.Lambda; }
        public toString() {
            return (
                "function(" + Util.range(0, this.argCount).map((i) => "la" + i).join(", ") + ") { " +
                    "return " + this.body.toString() + " }")
        }
        public forEachExpr(f:(e:JsExpr) => void) { this.body.forEachExpr(f); }
    }


    export class JsGoto
        extends JsStmt
    {
        public jumpsToOptimizedLoop = false;
        constructor(public target:JsExpr, public canChain = blockChaining) {
            super()
        }
        public toString() {
            if (!this.canChain)
                return "return " + this.target.toString() + ";";
            if (!this.jumpsToOptimizedLoop)
                return "if (callstackcurdepth++ < 50) return " + this.target.toString() + "(s); else { callstackcurdepth = 0; return "
                    + this.target.toString() + ";}";
            return "if (callstackcurdepth++ >= 500) { callstackcurdepth = 0; return "
                + this.target.toString() + ";}";
        }
        public category() { return JsNodeCategory.Goto; }
        public forEachExpr(f:(e:JsExpr) => void) { this.target.forEachExpr(f); }

        static simple(t:JsLabel, canChain = blockChaining) { return new JsGoto(new JsLabelRef(t), canChain); }

        public isSimple(t:JsLabel)
        {
            return this.target instanceof JsLabelRef && (<JsLabelRef>this.target).label == t;
        }
    }

    export class JsIf
        extends JsStmt
    {
        public condition:JsExpr;
        public thenBody:JsStmt[];
        public elseBody:JsStmt[];
        public isWhile = false;

        constructor(public finalLabel:JsLabel) {
            super()
        }
        public category() { return JsNodeCategory.If; }

        public injectEndIfJumps()
        {
            var inject = (lst:JsNode[]) => {
                var wasJmp = false;
                var hadLbl = false;
                for (var i = 0; i < lst.length; ++i) {
                    wasJmp = lst[i].category() == JsNodeCategory.Goto;
                    if (wasJmp || lst[i].isUsedLabel())
                        hadLbl = true;
                }
                if (hadLbl && !wasJmp) {
                    var j = JsGoto.simple(this.finalLabel);
                    this.finalLabel.refs.push(j);
                    lst.push(j);
                }
            }
            this.thenBody.forEach((t) => t.injectEndIfJumps());
            this.elseBody.forEach((t) => t.injectEndIfJumps());
            if (this.finalLabel != null) {
                inject(this.thenBody);
                inject(this.elseBody);
            }
        }

        public forEachExpr(f:(e:JsExpr) => void) {
            this.condition.forEachExpr(f);
            this.thenBody.concat(this.elseBody).forEach((t) => t.forEachExpr(f));
        }

        public dump(wr:(s:string) => void):void
        {
            wr("if (" + this.condition + ") {");
            var wri = (s:string) => { wr("  " + s); }
            this.thenBody.forEach((n:JsStmt) => { n.dump(wri); });
            if (this.elseBody.length > 0) {
                wr("} else {");
                this.elseBody.forEach((n:JsStmt) => { n.dump(wri); });
            }
            wr("}");
        }
    }

    export class JsLabel
        extends JsStmt
    {
        public refs:JsNode[] = [];
        constructor(public id:string) {
            super()
        }
        public category() { return JsNodeCategory.Label; }
        public isUsedLabel() { return this.refs.length > 0; }

        public dump(wr:(s:string) => void)
        {
            wr("LABEL " + this.id + ":");
        }

        public forEachExpr(f:(e:JsExpr) => void) { }
    }

    export interface CompilerOptions
    {
        isTopLevel?: boolean;
        coverage?: boolean;
        showCoverage?: boolean;
        profiling?: boolean;
        showProfiling?: boolean;
        debugging?: boolean;
        packaging?: boolean;
        artResolver?: (url: string) => string;
        dynamic?: boolean;
        rest?: boolean;
        cloud?: boolean;
        javascript?: boolean;
        authorId?: string;
        scriptId?: string; // if present, the ids of libraries will be also baked into the script
        scriptGuid?: string;
        baseScriptId?: string;
        hasCloudData?: boolean;
        hasLocalData?: boolean;
        hasPartialData?: boolean;
        hostCloudData?: boolean;
        optimizeLoops?: boolean;
        crashOnInvalid?: boolean;
        inlining?: boolean;
        okElimination?: boolean;
        blockChaining?: boolean;
        commonSubexprElim?: boolean;
        constantPropagation?: boolean;
        libStaticPrefix?: string;
        artUrlSuffix?: string;
        azureSite?: string;
        problemCallback?: (prob: string) => void;
        apiKeys?: StringMap<string>;
        usedProperties?:StringMap<boolean>;
    }

    export class Compiler
        extends NodeVisitor
    {
        private localNameCtx:QuotingCtx;
        private stepIdx = 0;
        private actionName:string;
        private currentAction:Action;
        private inlineCurrentAction = false;
        private currentReachingDefs: ReachingDefsMgr;
        private currentDoms: DominatorsMgr;
        private currentUsedSet: UsedSetMgr;
        private currentAE: AvailableExpressionsMgr;
        private currentCP: ConstantPropagationMgr;
        private numInlinedFunctions = 0;
        private numInlinedCalls = 0;
        private numOkEliminations = 0;
        private numActions = 0;
        private numStatements = 0;
        private termsReused = 0;
        private constantsPropagated = 0;
        private currentApp:App;
        private globalError:string;
        private globalErrorId:string;
        public output = "";
        private steps = 0;
        private todo = [];
        private innerActions = [];
        private aux:JsStmt[] = [];
        private needsScriptText = false;

        private profilingBlocks: { [blockId: string]: string[]; } = {};  // block --> stmtExprHolder*
        private profilingScopes: JsTmpDef[] = [];

        private stmtIds: string[];

        private unit = new JsTerm("<unit>");
        private api = TDev.api;
        private tmpIdx = 0;
        private blockId = 1;
        public missingApis = [];
        private maxArgsToCheck = 0;
        private initGlobals = "";
        private initGlobals2 = "";
        private resetGlobals = "";
        private cloudstateJsonExport = "";
        private cloudstateJsonImport = "";
        private persistentvars = [];
        public npmModules: StringMap<string> = {};
        public cordovaPlugins: StringMap<string> = {};
        public pipPackages: StringMap<string> = {};
        public packageResources: PackageResource[] = [];
        private mapExprToVar: { [id: number]: JsTmpRef } = {};

        public debuggerLocalCtxs: { [action: string]: { [nameid: string]: string; }; } = {};

        public static version = "1";

        constructor(private options:CompilerOptions)
        {
            super()
            crashOnInvalid = !!options.crashOnInvalid;
            blockChaining = !!options.blockChaining;
        }

        private wr(s:string)
        {
            this.output += s;
        }

        private term(s:string):JsTerm { return new JsTerm(s); }

        private outRef(d:LocalDef)
        {
            var outp = this.currentAction.getOutParameters();
            for (var i = 0; i < outp.length; ++i)
                if (outp[i].local == d) {
                    if (outp.length <= 1)
                        return "result";
                    else
                        return "results[" + i + "]";
                }
            return null;
        }

        private localVarName(d:LocalDef)
        {
            var l = this.outRef(d);
            if (l) return l;
            return (this.inlineCurrentAction? "l_" :"$") + this.localNameCtx.quote(d.getName(), d.nodeId);
        }
        private localVarRef(d:LocalDef) { return (this.inlineCurrentAction? this.term(this.localVarName(d)) : this.term("s." + this.localVarName(d))); }

        private globalVarId(d:Decl) { return "$" + d.getStableName(); }

        private comment(s:string)
        { return "/* " + s.replace(/\//g, "") + " */" }

        private globalVarRef(d:Decl)
        {
            return this.term(this.comment(d.getName()) + " s.d." + this.globalVarId(d));
        }

        private newTmpVarOK(stem:string, initial:JsExpr, astref: Expr = null)
        {
            var r = this.newTmpVar(stem, initial, astref)
            r._alwaysValid = true
            return r
        }

        private newTmpVar(stem:string, initial:JsExpr, astref: Expr = null)
        {
            // When the compiler is asking to write an expression to a
            // temp var, we try to intercept and look for optimized versions
            // of this expression. If there is, we change the expression here
            // and return the optimized version instead of the original.
            if (this.options.constantPropagation && this.currentCP && astref != null) {
                var val = this.currentCP.precomputeLiteralExpression(astref);
                if (val != null) {
                    ++this.constantsPropagated;
                    initial = new JsLiteral(val);
                }
            }
            if (this.options.commonSubexprElim && this.currentAE && astref != null) {
                var ref: JsTmpRef = null;
                var exprs = this.currentAE.checkForIdenticalExpressions(astref);
                for (var i = 0; i < exprs.length; ++i) {
                    var cur = exprs[i];
                    ref = this.mapExprToVar[cur.nodeId];
                    if (ref != null)
                        break;
                }
                if (ref != null) {
                    ++this.termsReused;
                    return ref;
                }
            }
            var t = new JsTmpDef(stem, initial);
            this.aux.push(t);
            var r = new JsTmpRef(t);
            // Record this expression in a map to be used later if it is
            // repeated in the future
            if (this.options.commonSubexprElim && astref != null) {
                this.mapExprToVar[astref.nodeId] = r;
            }
            return r;
        }

        private newTmpVarOrUnit(rk:Kind, stem:string, initial:JsExpr, astref: Expr = null) : JsExpr
        {
            if (rk == api.core.Nothing) {
                this.aux.push(new JsExprStmt(initial));
                return this.unit;
            } else {
                return this.newTmpVar(stem, initial, astref);
            }
        }

        private allocateLabel()
        {
            return new JsLabel(this.actionName + "$" + this.stepIdx++);
        }

        public visitCodeBlock(b:CodeBlock)
        {
            var blockId = "";

            if (this.needsProfiling()) {
                blockId = b.stableId.replace(/\./g, "_");
                if (!this.profilingBlocks[blockId])  // associate stmt's ExprHolder with enclosing block [CCC]
                    this.profilingBlocks[blockId] = [];
            }

            var res = b.stmts.collect((s: Stmt): JsStmt[] => this.dispatch(s));

            if (this.needsProfiling()) {
                var blockId = b.stableId.replace(/\./g, "_");
                var hits = new JsTerm("profilingExecutions" + blockId);
                res.unshift(new JsExprStmt(new JsInfix(hits, "-=", new JsLiteral("1"))));  // record block hit in global cntr

                var hitsNext = new JsTerm("profilingExecutionsNext" + blockId);
                var hitsNextCount = new JsTerm("profilingExecutionsNextCount" + blockId);
                var resetHits = this.allocateIf();
                resetHits.condition = new JsInfix(hits, "==", new JsLiteral("0"));
                resetHits.thenBody = [
                    hits.gets(hitsNext),
                    new JsExprStmt(new JsInfix(hitsNextCount, "+=", hitsNext)),
                    hitsNext.gets(JsCall.direct("s.rt.nextHitCount", [hitsNext])),
                ];
                resetHits.elseBody = [];
                res.push(resetHits);
            }

            if (b.flags & (BlockFlags.IsPageInit|BlockFlags.IsPageRender)) {
                var p = this.currentAction.modelParameter;
                if (p) {
                    var rk = <RecordEntryKind>p.local.getKind();
                    if (rk.record) {
                        var stored = this.term("s.rt.getCurrentPage().model");
                        res.unshift(this.localVarRef(p.local).gets(stored))
                        if (b.flags & BlockFlags.IsPageInit)
                            res.unshift(stored.gets(this.term("s.d.$" + rk.record.getStableName() + ".create(s)")));
                    } else {
                        Util.check(false);
                    }
                }
            }
            if (b.flags & BlockFlags.IsPageRender) {
                res.unshift(new JsExprStmt(JsCall.direct("s.rt.enter_render", [])))
                res.push(new JsExprStmt(JsCall.direct("s.rt.leave_render", [])))
            }
            return res;
        }

        private flushAux()
        {
            var r = this.aux;
            this.aux = [];
            return r;
        }

        private doExpr(e:Expr):JsExpr
        {
            return this.dispatch(e);
        }

        private runmap_variables: string[][] = [];

        private topExpr(eHolder: ExprHolder, s: Stmt): JsExpr {

            var nodeId = eHolder.stableId.replace(/\./g, "_");
            var blockId = s.parent.stableId.replace(/\./g, "_");  // associate stmt's ExprHolder with enclosing block [CCC]

            if (this.needsProfiling()) {
                var profilingLastCallTimeStamp = new JsTmpRef(this.profilingScopes.peek());

                var sampleThisStmt = this.allocateIf();
                sampleThisStmt.condition = new JsInfix(
                    new JsInfix(new JsTerm("profilingExecutions" + blockId), "==", new JsLiteral("0")),
                    "&&",
                    new JsInfix(profilingLastCallTimeStamp, "==", new JsLiteral("0")));
                sampleThisStmt.thenBody = [profilingLastCallTimeStamp.gets(JsCall.direct("perfNow", []))];
                sampleThisStmt.elseBody = [];
                this.aux.push(sampleThisStmt);
            }

            var res = this.dispatch(eHolder.parsed);

            if (!this.needsProfiling())
                return res;

            this.profilingBlocks[blockId].push(nodeId);

            var duration = new JsTerm("tmp");
            var durationCallSite = new JsTerm("profilingDuration" + nodeId);  // global execution duration of this call site
            var durationSamplesCallSite = new JsTerm("profilingDurationSamples" + nodeId);
            var profilingLastCallTimeStamp = new JsTmpRef(this.profilingScopes.peek());  // frame-specific last-call timestamp // TODO: make block-specific


            var hits = new JsTerm("profilingExecutions" + blockId);
            var captureDuration = this.allocateIf();
            captureDuration.condition = new JsInfix(hits, "==", new JsLiteral("0"));
            captureDuration.thenBody = [
                duration.gets(new JsInfix(JsCall.direct("perfNow", []), "-", profilingLastCallTimeStamp)),
                new JsExprStmt(new JsInfix(durationCallSite, "+=", duration)),
                new JsExprStmt(new JsInfix(durationSamplesCallSite, "+=", new JsLiteral("1"))),
                new JsExprStmt(new JsInfix(profilingLastCallTimeStamp, "+=", duration))];
            captureDuration.elseBody = [
                profilingLastCallTimeStamp.gets(new JsLiteral("0"))
            ];
            this.aux.push(captureDuration);

            if (this.needsProfilingDebug())
                this.aux.push(new JsExprStmt(JsCall.direct("alert", [JsCall.direct("JSON.stringify", [new JsTerm("cs._getProfilingResults()")])])));

            return res;
        }

        private markLocation(s:Stmt)
        {
            this.numStatements++;
            var currentId = new JsLiteral(this.stringLiteral(s.stableId));
            if (this.debugBuild()) this.buildBreakpoint(s.stableId);
            this.aux.push(this.term("s.pc").gets(currentId));
            if (this.instrumentForCoverage() && (s.isFirstNonComment() || s.isLastNonComment())) {
                // each id gets a variable named c$N_id
                var lit = "c$" + s.stableId.replace(/\./g, "_");
                this.runmap_variables.push([s.stableId, lit]);
                this.aux.push(this.term(lit).gets(this.term('1')));
            }
        }

        private instrumentForCoverage() {
            return !!this.options.coverage;
        }

        // When visiting statements that consumes expressions, we need to set
        // up "current*" variables to point to the information generated by our
        // analysis passes.
        private updateAnalysisInfo(e: ExprHolder) {
            if (this.options.okElimination) {
                this.currentReachingDefs = e.reachingDefs;
                this.currentDoms = e.dominators;
                this.currentUsedSet = e.usedSet;
                if (this.currentReachingDefs && TDev.dbg) {
                    this.aux.push(this.term(this.comment(this.currentReachingDefs.toString())));
                }
                if (this.currentUsedSet && TDev.dbg) {
                    this.aux.push(this.term(this.comment(this.currentUsedSet.toString())));
                }
            }
            if (this.options.commonSubexprElim) {
                this.currentAE = e.aeSet;
                if (this.currentAE && TDev.dbg) {
                    this.aux.push(this.term(this.comment(this.currentAE.toString())));
                }
            }
            if (this.options.constantPropagation) {
                this.currentCP = e.cpSet;
                if (this.currentCP && TDev.dbg) {
                    this.aux.push(this.term(this.comment(this.currentCP.toString())));
                }
            }
        }

        // Cleans "current*" variables, preparing for the next expression.
        private resetAnalysisInfo() {
            if (this.options.okElimination) {
                this.currentReachingDefs = null;
                this.currentDoms = null;
                this.currentUsedSet = null;
            }
            if (this.options.commonSubexprElim) {
                this.currentAE = null;
            }
            if (this.options.constantPropagation) {
                this.currentCP = null;
            }
        }

        public visitExprStmt(e:ExprStmt)
        {
            this.updateAnalysisInfo(e.expr);
            this.markLocation(e);
            var ex = this.topExpr(e.expr, e);
            var r = this.flushAux();
            if (ex != this.unit)
                r.push(new JsExprStmt(ex));
            this.resetAnalysisInfo();
            return r;
        }

        public visitInlineActions(n:InlineActions)
        {
            n.actions.forEach((a) => {
                if (a instanceof InlineAction)
                    this.compileInlineAction(<InlineAction>a)
            })
            return this.visitExprStmt(n);
        }

        private allocateIf() { return new JsIf(this.allocateLabel()); }

        public visitElseIf(i:If) { return [] }

        public visitIf(i:If)
        {
            if (i.isTopCommentedOut()) return []

            var elseMarker:JsTmpRef = i.branches.length > 1 ? this.newTmpVarOK("elseIf", new JsLiteral("true")) : null;
            var res = this.flushAux();

            i.branches.forEach((b, idx) => {
                if (idx == i.branches.length - 1) return;

                this.updateAnalysisInfo(b.condition)
                var par = b.body.parent // this may be ElseIf stmt
                this.markLocation(par);
                var cond = this.topExpr(b.condition, par);
                this.resetAnalysisInfo();
                var body = this.flushAux();
                body.push(new JsExprStmt(JsCall.direct("ok", [cond])))
                var ifNode = this.allocateIf();
                body.push(ifNode);
                ifNode.condition = cond;
                ifNode.thenBody = this.dispatch(b.body);

                if (idx == i.branches.length - 2) {
                    ifNode.elseBody = this.dispatch(i.branches[idx+1].body)
                } else {
                    if (elseMarker) ifNode.thenBody.unshift(elseMarker.gets(new JsLiteral("false")))
                    ifNode.elseBody = []
                }

                if (idx > 0) {
                    var outer = this.allocateIf()
                    outer.condition = elseMarker
                    outer.thenBody = body
                    outer.elseBody = []
                    res.push(outer)
                } else {
                    res.pushRange(body)
                }
            })

            return res;
        }

        public visitWhile(w:While)
        {
            this.updateAnalysisInfo(w.calcNode());
            this.markLocation(w);
            var begLabel = this.allocateLabel();
            this.aux.push(begLabel);
            var cond = this.topExpr(w.condition, w);
            this.resetAnalysisInfo();
            var res = this.flushAux();
            var ifNode = this.allocateIf();
            ifNode.condition = cond;
            ifNode.thenBody = this.dispatch(w.body);
            ifNode.thenBody.push(JsGoto.simple(begLabel));
            ifNode.elseBody = [];
            res.push(ifNode);
            return res;
        }

        private compileInlineAction(inl:InlineAction)
        {
            var a = new Action();
            a.compilerParentAction = this.currentAction;
            a.body = inl.body;
            a.isLambda = true;
            a.setStableName(this.actionName + "$" + this.stepIdx);
            a.stableId = inl.stableId;
            a.setName(this.actionName + "::lambda::" + this.stepIdx);
            a.isPrivate = true;
            this.stepIdx++;

            inl.inParameters.forEach((p) => a.header.inParameters.push(new ActionParameter(p)))
            inl.outParameters.forEach((p) => a.header.outParameters.push(new ActionParameter(p)))

            var finder = new VariableFinder();
            finder.traverse(a.body);
            var capturedLocals:LocalDef[] = [];
            var writtenLocals = finder.writtenLocals.slice(0);
            writtenLocals.pushRange(inl.inParameters)
            writtenLocals.pushRange(inl.outParameters)
            finder.readLocals.forEach((l) => {
                if (writtenLocals.indexOf(l) < 0) capturedLocals.push(l);
            });
            a.allLocals = finder.readLocals;
            finder.writtenLocals.forEach((l) => {
                if (a.allLocals.indexOf(l) < 0) a.allLocals.push(l);
            });

            capturedLocals.forEach((p) => a.header.inParameters.push(new ActionParameter(p)));
            this.innerActions.push(a);

            this.markLocation(inl);
            var refs:JsExpr[] = capturedLocals.map((l) => this.newTmpVar("lmbv", this.localVarRef(l)));

            // -1 for this
            // +2 for previous, returnAddr
            var n = inl.inParameters.length - 1 + 2;
            while (n >= 1)
                refs.unshift(this.term("la" + n--));

            // push previous
            var mkProxy = this.newTmpVarOK("lmbProxy", this.term("s.libs.mkLambdaProxy"));
            refs.unshift(JsCall.directInst(mkProxy, "", [this.term("la0")]))

            var frame = new JsLambda(inl.inParameters.length + 2, JsCall.direct("a_" + a.getStableName(), refs))
            this.aux.push(this.localVarRef(inl.name).gets(frame));
        }

        public visitBox(b:Box)
        {
            this.markLocation(b);
            var res = this.flushAux();

            res.push(new JsExprStmt(JsCall.direct("lib.Box.push_box", [this.term("s")])))
            res.pushRange(this.dispatch(b.body))
            res.push(new JsExprStmt(JsCall.direct("lib.Box.pop_box", [this.term("s")])))

            return res;
        }

        private mkCall(prop:IProperty, args:Expr[])
        {
            var call = new Call();
            call.propRef = PropertyRef.mkProp(prop);
            call.args = args;
            return call;
        }

        public visitForeach(f:Foreach)
        {
            var collExpr = f.collection.parsed;
            var collTmp:JsTmpRef;
            var isArray = false;

            this.updateAnalysisInfo(f.calcNode());
            this.markLocation(f);
            if (collExpr.getKind().hasEnumerator())  {
                isArray = true;
                collTmp = this.newTmpVarOK("collArr", JsCall.mk(this.topExpr(f.collection, f), "get_enumerator", []));
            } else {
                collTmp = this.newTmpVar("coll", this.topExpr(f.collection, f));
            }
            this.resetAnalysisInfo();

            var idxTmp = this.newTmpVarOK("idx", this.term("0"));
            var begLabel = this.allocateLabel();
            this.aux.push(begLabel);
            var lenExpr:JsExpr;
            if (isArray)
                lenExpr = new JsInfix(collTmp, ".length", null);
            else {
                var countProp = collExpr.getKind().getProperty("count");
                lenExpr = this.callProperty(countProp, [collTmp]);
            }
            var res = this.flushAux();
            var ifNode = this.allocateIf();
            ifNode.condition = JsCall.okAnd([collTmp], new JsInfix(idxTmp, "<", lenExpr));

            var atExpr:JsExpr;
            if (isArray) {
                atExpr = new JsCall(collTmp, "[", [idxTmp]);
            } else {
                var atProp = collExpr.getKind().getProperty("at");
                atExpr = this.callProperty(atProp, [collTmp, idxTmp]);
            }
            this.aux.push(this.localVarRef(f.boundLocal).gets(atExpr));
            this.aux.push(new JsExprStmt(new JsInfix(idxTmp, "++", null)));

            if (f.conditions.stmts.length == 0) {
                ifNode.thenBody = this.flushAux();
                ifNode.thenBody.pushRange(this.dispatch(f.body))
            } else {
                var where = (idx:number) => (<Where>f.conditions.stmts[idx]).condition.parsed;
                var cond:Expr = where(0);
                for (var i = 1; i < f.conditions.stmts.length; ++i) {
                    cond = this.mkCall(api.core.AndProp, [cond, where(i)]);
                }

                var innerIf = this.allocateIf();
                innerIf.condition = this.doExpr(cond);
                this.aux.push(innerIf);
                ifNode.thenBody = this.flushAux();
                innerIf.thenBody = this.dispatch(f.body);
                innerIf.elseBody = [];
            }

            ifNode.thenBody.push(JsGoto.simple(begLabel));
            ifNode.elseBody = [];
            res.push(ifNode);
            return res;
        }

        public visitFor(f:For)
        {
            this.updateAnalysisInfo(f.calcNode());
            this.markLocation(f);
            var bndTmp = this.newTmpVar("bnd", this.topExpr(f.upperBound, f));
            this.resetAnalysisInfo();
            var idx = this.localVarRef(f.boundLocal);
            this.aux.push(idx.gets(this.term("0")));
            var begLabel = this.allocateLabel();
            var res = this.flushAux();
            res.push(begLabel);
            var ifNode = this.allocateIf();
            ifNode.condition = new JsInfix(idx, "<", bndTmp);
            ifNode.thenBody = this.dispatch(f.body);
            ifNode.thenBody.push(new JsExprStmt(new JsInfix(idx, "++", null)));
            ifNode.thenBody.push(JsGoto.simple(begLabel));
            ifNode.elseBody = [];
            res.push(ifNode);
            return res;
        }

        public visitComment(c:Comment) {
            if (this.options.usedProperties.hasOwnProperty("appconsumerenderedcomments")) {
                var par = (<CodeBlock>c.parent).stmts
                var idx = par.indexOf(c)
                if (par[idx - 1] instanceof Comment)
                    return []; // not first
                var end = idx
                while (par[end] instanceof Comment)
                    end++
                var d = Step.renderDocs(par.slice(idx, end))
                return [new JsExprStmt(JsCall.direct("s.rt.saveComment", [new JsLiteral(this.stringLiteral(d))]))]
            }
            return [];
        }

        private callString(prop:IProperty, args:JsExpr[], ctxArg:JsExpr, astref: Call) : JsExpr
        {
            var pk = prop.parentKind;
            var propName = prop.runtimeName();
            var parName = prop.parentKind.runtimeName();
            var rk = prop.getResult().getKind();
            var specApply = prop.getSpecialApply();
            var robust = prop.getFlags() & PropertyFlags.Robust;

            var res:JsExpr;
            var doMagic = () => {
                if (specApply) {
                    Util.assertCode(args.length == 2);
                    if (astref && astref.isSynthetic)
                        astref = null
                    res = this.newTmpVar("infix", JsCall.okAnd([args[0], args[1]], new JsInfix(args[0], specApply, args[1])), astref);
                } else if (propName == "is_invalid") {
                    //if (!(pk instanceof RecordEntryKind))
                    res = new JsInfix(args[0], "==", this.term("undefined"));
                    res._alwaysValid = true;
                    //else
                    //    res = JsCall.directInst(this.term("lib.RecordEntry"), "check_invalid", [ args[0] ]);
                } else if (!prop.isImplemented()) {
                    var meth = "";
                    var apiName = parName + "->" + propName;
                    if ((prop.getCapability() & api.core.currentPlatform) == 0) {
                        meth = "TDev.Util.notSupported";
                    } else {
                        meth = "TDev.Util.notImplementedYet";
                        apiName += " (yet)";
                    }
                    if (this.missingApis.indexOf(apiName) < 0)
                        this.missingApis.push(apiName);
                    res = this.newTmpVarOrUnit(rk, "notImpl", JsCall.direct(meth, [this.term("s"), this.term("'" + apiName + "'")]));
                } else if (pk == api.core.App && (propName == "javascript" || propName == "javascript_async")) {
                    this.emitJavascriptEscape(astref, ctxArg)
                    res = this.unit
                } else if (pk.isBuiltin || !pk.isData) {
                    if (!pk.isData) args.shift();
                    args.push(ctxArg);
                    if (astref && astref.compiledTypeArgs)
                        args.pushRange(astref.compiledTypeArgs)
                    res = this.newTmpVarOrUnit(rk, "call", JsCall.mk(null, "lib." + parName + "." + propName, args));
                } else {
                    var th = args.shift();
                    args.push(ctxArg);
                    if (astref && astref.compiledTypeArgs)
                        args.pushRange(astref.compiledTypeArgs)
                    res = this.newTmpVarOrUnit(rk, "call", JsCall.mk(th, propName, args));
                }
            }

            doMagic();

            if (this.options.okElimination && robust) {
                this.numOkEliminations++;
                res._alwaysValid = true;
            }

            return res;
        }

        private markAllocated(prop:IProperty, res:JsExpr)
        {
            if (!!(prop.getResult().getFlags() & ParameterFlags.WritesMutable)) {
                // this property allocates a new object - mark it if in render mode
                this.aux.push(new JsExprStmt(JsCall.direct("s.rt.markAllocated", [res])))
            }
        }

        private returnedFrom(numOut:number, idx:number)
        {
            var name = "result";
            if (numOut > 1)
                name = "results[" + idx + "]";
            return this.term("s.rt.returnedFrom." + name);
        }

        private isDataRef(e:Expr) { return (e instanceof Call) && !!(<Call>e).referencedData() }

        private assignTo(e:Expr, src:JsExpr)
        {
            if (e.referencedRecordField() || e.referencedData())
                this.emitRefOperation(e, "set", null, [src])
            else {
                var setter = e.getLiftedSetter()
                if (setter) {
                    var c = mkFakeCall(PropertyRef.mkProp(setter))
                    this.emitNormalCall(c, [this.doExpr((<Call>e).args[0]), src])
                } else
                    this.aux.push(this.doExpr(e).gets(src))
            }
        }

        private doAssignment(c:Call) : JsExpr
        {
            var targets = c.args[0].flatten(api.core.TupleProp);
            var src = this.doExpr(c.args[1]);
            if (targets.length == 1) {
                if (c.args[1].getKind() != api.core.Nothing)
                    this.assignTo(targets[0], src);
            } else {
                var act = (<Call> c.args[1]).anyCalledAction()
                Util.assertCode(act != null);
                for (var i = 0; i < act.getOutParameters().length; ++i) {
                    this.assignTo(targets[i], this.returnedFrom(act.getOutParameters().length, i));
                }
            }
            if (targets.some((e) => this.isDataRef(e)))
                this.aux.push(new JsExprStmt(JsCall.direct("s.rt.logDataWrite", [])))
            return this.unit;
        }

        private doLazy(c:Call, isAnd:boolean) : JsExpr
        {
            var arg0 = this.doExpr(c.args[0])
            var tmp = this.newTmpVar("lazy", arg0);
            var cond = this.allocateIf();
            if (this.options.okElimination && arg0.alwaysValid()) {
                this.numOkEliminations++;
                cond.condition = isAnd ? <JsExpr> tmp : new JsInfix(null, "!", tmp);
            } else
                cond.condition = JsCall.okAnd([tmp], isAnd ? <JsExpr> tmp : new JsInfix(null, "!", tmp));
            this.aux.push(cond);
            var tmpAux = this.flushAux();
            var arg1 = this.doExpr(c.args[1]);
            this.aux.push(tmp.gets(arg1));
            if (this.options.okElimination)
                tmp._alwaysValid = arg0.alwaysValid() && arg1.alwaysValid();
            cond.thenBody = this.flushAux();
            cond.elseBody = [];
            this.aux = tmpAux;
            return tmp;
        }


        private forceNonRender()
        {
            this.aux.push(new JsExprStmt(JsCall.direct("s.rt.forceNonRender", [])));
            this.aux.push(new JsExprStmt(JsCall.direct("s.rt.forcePageRefresh", [])))
        }

        private emitRefOperation(fieldRef:Expr, op:string, args:Expr[], compiledArgs:JsExpr[] = null)
        {
            if (op == "ref" || op == "with notify") return null;

            if (fieldRef instanceof Call) {
                var rcf = fieldRef.referencedRecordField()
                if (rcf)
                    return this.emitRecordOperation(<Call>fieldRef, op, rcf, args, compiledArgs)
                var rd = fieldRef.referencedData()
                if (rd)
                    return this.emitDataOperation(<Call>fieldRef, op, rd, args, compiledArgs)
            }
            return null;
        }

        private emitRefCall(c: Call)
        {
            return this.emitRefOperation(c.args[0], c.prop().getName().slice(1), c.args.slice(1))
        }

        private emitDataOperation(fieldRef: Call, op: string, rd: GlobalDef, opargs: Expr[], args: JsExpr[]):any {
            if (op == "get") {
                if (rd.isTransient)
                    return this.globalVarRef(rd);
                else {
                    if (!args)
                        args = <JsExpr[]> opargs.map((e) => this.doExpr(e));
                    args.unshift(new JsLiteral(this.stringLiteral("$"+rd.getStableName())));
                    args.push(this.term("s"));
                    return this.newTmpVar("val", JsCall.direct("s.d.$$" + (rd.cloudEnabled ? "cloud" : "local") + "persistentvars.perform_get", args));
                }
            }

            if (op == "set") {
                if (!args)
                    args = <JsExpr[]> opargs.map((e) => this.doExpr(e));
                if (rd.isTransient)
                    this.aux.push(this.globalVarRef(rd).gets(args[0]));
                else {
                    args.unshift(new JsLiteral(this.stringLiteral("$"+rd.getStableName())));
                    args.push(this.term("s"));
                    this.aux.push(new JsExprStmt(JsCall.direct("s.d.$$" + (rd.cloudEnabled ? "cloud" : "local") + "persistentvars.perform_set", args)));
                }
            }

            return null;
        }

        private emitRecordOperation(fieldRef:Call, op:string, rcf:RecordField, opargs:Expr[], args:JsExpr[])
        {
            var recvRecord = this.doExpr(fieldRef.args[0]);
            //var opName = new JsLiteral(this.stringLiteral(c.prop().getName()));
            var fieldName = new JsLiteral(this.stringLiteral(rcf.referenceName()));

            if (!args)
                args = <JsExpr[]> opargs.map((e) => this.doExpr(e));
            args.unshift(fieldName);
            args.push(this.term("s"));
            //args.unshift(opName);

            var prevAux = this.flushAux();

            var result: JsExpr;

            if (op === "get" || op === "confirmed") {

                if (rcf.def().recordType === RecordType.Object) {
                    // fast path: we inline field read of simple objects at compile time
                    result = JsCall.directInst(recvRecord, "[", [fieldName]);
                }
                else {
                    result = JsCall.directInst(recvRecord, "perform_" + op, args);
                }

            } else {

                var name = op
                name = "perform_" + ((name === "test and set") ? "test_and_set" : name);

                this.aux.push(new JsExprStmt(JsCall.directInst(recvRecord, name, args)));
                result = this.unit;

            }

            if (result != this.unit) {
                result = this.newTmpVar("recOp", result);
            }

            var ifNode = this.allocateIf();
            ifNode.condition = recvRecord;
            ifNode.thenBody = this.flushAux();
            ifNode.elseBody = [];

            prevAux.push(ifNode);
            this.aux = prevAux;

            return result;
        }

        private needsProfiling(): boolean {
            return this.options.profiling;
        }
        private needsProfilingDebug(): boolean {
            return /profilingDebug/.test(document.URL);
        }

        private debugBuild() : boolean {
            return !!this.options.debugging;
        }

        private buildBreakpoint(s: string) {
            var check =
                new JsExprStmt(
                    new JsInfix(
                        this.term("bp$" + s.replace(/\./g, "_")),
                        "&&",
                        JsCall.direct(
                            "s.rt.hitBreakpoint",
                            [new JsLiteral(this.stringLiteral(s))]
                        )
                    )
                );

            var l = this.allocateLabel();
            var g = JsGoto.simple(l, false);
            this.aux.push(check, g, l);
        }

        private buildActionCall(numOut:number, isAsync:boolean, args:JsExpr[], mkCall:()=>JsExpr):JsExpr
        {
            var l = this.allocateLabel();
            // skip code singleton
            args.splice(0, 1, this.term("s"), new JsLabelRef(l));
            var call:JsExpr = mkCall();
            var rtEnter:JsExpr;
            if (isAsync) {
                var task = this.newTmpVar("task", JsCall.direct("s.rt.mkActionTask", []))
                rtEnter = JsCall.direct("s.rt.enterAsync", [task, call]);
            } else {
                rtEnter = JsCall.direct("s.rt.enter", [call]);
            }
            var g = new JsGoto(rtEnter, false);
            this.aux.push(g, l);

            if (isAsync) return task;

            if (numOut == 1)
                return this.newTmpVar("actRes", this.returnedFrom(numOut, 0));
            else
                return this.unit;
        }

        // build a literal string array
        private buildStringArray(strings: string[]): JsExpr {
            return this.term("[" + strings.reduce(
                (str, current, i) =>
                    (!current) ? str :
                    (i == 0) ? this.stringLiteral(current) :
                    (str + ", " + this.stringLiteral(current)),
                "") + "]");
        }

        private emitJavascriptEscape(c:Call, ctxArg:JsExpr)
        {
            if (!this.options.javascript)
                return

            var code = ""

            function localName(l:LocalDef) {
                var r = Api.runtimeName(l.getName().replace(/[?]/g, ""))
                if (r == "s" || r == "lib") return "_" + r
                return r
            }

            function unterm(t:JsExpr)
            {
                if (t instanceof JsTerm)
                    return (<JsTerm>t).code
                Util.die()
                return ""
            }

            if (c.args[1].getStringLiteral() != "local") {
                this.problem(lf("wrong JS calling convention"))
                code = "TDev.Util.userError('wrong JS calling convention');"
            } else {
                var isAsync = c.prop().getName() == "javascript async";

                if (isAsync) {
                    code = "(function(_resumeCtx){\n" +
                           "   var s = _resumeCtx.stackframe;\n" +
                           "   function resume() { _saveResults(); _resumeCtx.resume() }\n" +
                           "   s.localResume = resume;\n" +
                           ""
                } else {
                    code = "(function(s){\n"
                }

                code += "  function _saveResults() {\n"
                this.currentAction.getOutParameters().forEach(p => {
                    code += "    " + unterm(this.localVarRef(p.local)) + " = " + localName(p.local) + ";\n"
                })
                code += "  }\n"

                var imp = this.currentApp.npmModules
                var impKeys = Object.keys(imp);
                if (impKeys.length > 0) {
                    //code += "var __window = window; window = undefined;\ntry {\n"; // window is undefined in node.js
                    impKeys.forEach(k => {
                        k = Api.runtimeName(k)
                        code += "  var " + k + " = s.rt.nodeModules." + k + ";\n"
                    })
                    //code += "} finally { window = __window }\n";
                }

                this.currentAction.allLocals.forEach(l => {
                    code += "  var " + localName(l) + " = " + unterm(this.localVarRef(l)) + ";\n"
                })

                code += "  var rt = s.rt;\n"
                code += "  function _userCode() {\n\n"
                var theCode = c.args[2].getStringLiteral()
                //if (/resume\s*\(\)/.test(theCode) != isAsync)
                //    this.problem("javascript async/resume() mismatch, " + theCode)
                code += c.args[2].getStringLiteral()
                code += "\n\n  }\n"
                code += "  _userCode();\n"
                if (!isAsync)
                    code += "  _saveResults();\n"
                code += "})"
            }

            try {
                //Security risk
                //eval(code)
            } catch (e) {
                this.problem("syntax error in app->javascript, " + e + "\n" + code)
            }

            this.aux.push(new JsExprStmt(JsCall.direct(code, [ctxArg])))
        }

        private problem(s:string)
        {
            Util.log("compiler problem: " + s)
            if (this.options.problemCallback)
                this.options.problemCallback(s)
        }

        private doFun(c:Call): JsExpr
        {
            if (c.funAction) {
                this.compileInlineAction(c.funAction)
                return this.localVarRef(c.funAction.name)
            } else return this.term("null")
        }

        public visitCall(c:Call) : JsExpr
        {
            var prop = c.prop();

            if (prop && prop.parentKind === api.core.CloudData)
                this.options.hasCloudData = true;

            if (prop == api.core.AssignmentProp) return this.doAssignment(c);

            if (prop == api.core.AndProp) return this.doLazy(c, true);
            if (prop == api.core.OrProp) return this.doLazy(c, false);

            if (prop == api.core.AsyncProp) return this.dispatch(c.args[1]);

            if (prop == api.core.FunProp) return this.doFun(c)

            if (prop.getCategory() == PropertyCategory.Library)
                return this.unit;

            if (prop.parentKind.getRoot() == api.core.Ref) {
                var tmp = this.emitRefCall(c);
                if (tmp) return tmp
            }

            if (c.autoGet)
                return this.emitRefOperation(c, "get", [])

            var args = c.args.slice(0)
            var typeArgs:JsExpr[] = []
            if (prop instanceof MultiplexProperty &&
                (<MultiplexProperty>prop).savedArgs)
                typeArgs = (<MultiplexProperty>prop).savedArgs.map(p => {
                    var r = this.term(this.reifyType(p) || "null")
                    r._alwaysValid = true
                    return r
                })
            while (prop instanceof MultiplexProperty) {
                var inner = c.args[0]
                if (inner instanceof Call) {
                    c = <Call>inner
                    prop = c.prop()
                } else {
                    break;
                }
            }
            c.compiledTypeArgs = typeArgs
            args[0] = c.args[0]

            return this.emitNormalCall(c, args.map((e) => this.doExpr(e)))
        }

        private reifyType(p:Kind): string
        {
            if (p.isBuiltin)
                return this.stringLiteral(p.getName().toLowerCase())
            else if (p.getRecord()) {
                if (!p.parentLibrary() || p.parentLibrary().isThis())
                    return (<JsTerm>this.globalVarRef(p.getRecord())).code
                else
                    return "s.rt.getLibRecordSingleton(" +
                        this.stringLiteral(p.parentLibrary().getStableName()) + ", " +
                        this.stringLiteral(p.getName()) + ")"
            } else if (p.isData && !p.isUserDefined() && p.getParameterCount() == 0)
                return "lib." + p.runtimeName()
            else
                return null
        }

        private emitNormalCall(c:Call, args:JsExpr[]) : JsExpr
        {
            var prop = c.prop();
            var dat = c.referencedData();
            var act = c.calledAction();
            var rcd = <RecordDef>(prop && prop.forwardsTo() instanceof RecordDef && prop.forwardsTo());

            var str = (s: string) => this.stringLiteral(s);

            if (prop instanceof ExtensionProperty) {
                act = (<ExtensionProperty>prop).shortcutTo
                args.unshift(null)
            }

            if (dat) {
                if (dat.isTransient)
                    return JsCall.direct("lib.GlobalVarRef.mk", [this.term("s.d"), new JsLiteral(this.stringLiteral(this.globalVarId(dat)))]).makeValid();
                else
                    return JsCall.direct("lib.PersistedVarRef.mk", [this.term("s.d.$$" + (dat.cloudEnabled ? "cloud" : "local") + "persistentvars"),
                        new JsLiteral(this.stringLiteral("$" + dat.getStableName()))]).makeValid();
            } else if (rcd) {
                return this.globalVarRef(rcd);
            } else if (act && act.isPage()) {
                var par:JsExpr;
                if (act instanceof LibraryRefAction)
                    par = new JsLiteral(str(act.parentLibrary().getStableName()));
                else
                    par = this.term("s.d.libName");
                var pageName:JsExpr[] = [par, new JsLiteral(str(act.getName()))];
                args.splice(0, 1);
                this.forceNonRender();
                this.aux.push(new JsExprStmt(JsCall.direct("s.rt.postAutoPage", pageName.concat(args))));
                return this.unit;
            } else if (act && act.canBeInlined && this.options.inlining) {
                var numOut = act.getOutParameters().length;
                var call:JsExpr = undefined;
                this.numInlinedCalls++;
                args.shift();
                args.unshift(new JsTerm("s"));
                call = JsCall.direct("a_" + act.getStableName(), args);
                if (numOut == 1)
                    return this.newTmpVar("fast_call", call);
                else {
                    this.aux.push(new JsExprStmt(call));
                    return this.unit;
                }
            } else if (act) {
                if (act.isExtensionAction()) {
                    act = act.extensionForward();
                    args.unshift(null);
                }

                return this.buildActionCall(!act.isAtomic ? 1 : act.getOutParameters().length, c.runAsAsync, args, () => {
                    if (act instanceof LibraryRefAction) {
                        var refAct: LibraryRefAction = (<LibraryRefAction>act)
                        // The library is ran as a web service
                        if (act.parentLibrary().isCloud()) {
                            args = [new JsTerm(refAct.template.isQuery ? "true" : "false"), // don't use toString() *Tim
                                    new JsLiteral(this.stringLiteral(this.options.azureSite)),
                                    new JsLiteral(this.stringLiteral(act.parentLibrary().getName())),
                                    new JsLiteral(this.stringLiteral(act.parentLibrary().getStableName())),
                                    new JsLiteral(this.stringLiteral(act.getName())),
                                    this.buildStringArray(act.getInParameters().map((ap) => { return ap.getName(); })),
                                    this.buildStringArray(act.getOutParameters().map((ap) => { return ap.getName(); })),
                                this.buildStringArray(act.getOutParameters().map((ap) => {
                                    var kind = ap.getKind();
                                    if (kind instanceof LibraryRefAbstractKind) {
                                        var ak = <LibraryRefAbstractKind>kind;
                                        var lb = ak.parentLibrary().getStableName();
                                        return lb + "→" + ak.getName();
                                    } else if (kind instanceof ParametricKind && kind._name === "Collection") {
                                        var pm = (<ParametricKind>kind).parameters[0];
                                        if (pm instanceof LibraryRefAbstractKind) {
                                            var ak = <LibraryRefAbstractKind> pm;
                                            var lb = ak.parentLibrary().getStableName();
                                            var name = lb + "→" + ak.getName();
                                        } else {
                                            var name = pm.getName();
                                        }
                                        return "Collection of " + name;
                                    }
                                    return kind.toString();
                                }))].concat(args);
                            return JsCall.direct(refAct.template.isOffline ? "s.rt.callServiceOffline" : "s.rt.callService", args);

                        // Normal library action call
                        } else {
                            var tmp = this.newTmpVar("libcall", this.term("s.libs[" + str(act.parentLibrary().getStableName()) + "][" + str(act.getName()) + "](s)"));
                            args[0] = tmp;
                            return JsCall.directInst(tmp, "invoke", args);
                        }

                    } else {
                        return JsCall.direct("a_" + act.getStableName(), args);
                    }
                })
            } else if (prop.getName() == "run" && prop.parentKind.isAction) {
                var lmb = args[0];
                return this.buildActionCall((<ActionKind>prop.parentKind).getOutParameters().length, c.runAsAsync, args, () => {
                    return JsCall.okAnd([lmb], JsCall.directInst(lmb, "", args));
                })
            } else {
                var rcf = c.referencedRecordField()
                if (rcf) {
                    var keyname = new JsLiteral(this.stringLiteral(rcf.referenceName()));
                    if (prop.isKey)
                        return JsCall.mk(args[0], "[", [keyname]);
                    else
                        return JsCall.mk(null, "lib.FieldRef.mk", [args[0], keyname]).makeValid()
                }

                return this.callProperty(prop, args, c, c.runAsAsync)
            }
        }

        private callProperty(prop: IProperty, args: JsExpr[], astref: Call = null, runAsAsync = false) : JsExpr
        {
            var writes = (p:PropertyParameter) => !!(p.getFlags() & ParameterFlags.WritesMutable);

            var parms = prop.getParameters();
            for (var i = 0; i < parms.length; i++)
            if (writes(parms[i]))
                this.aux.push(new JsExprStmt(JsCall.direct("s.rt.logObjectMutation", [args[i]])));

            if (prop.shouldPauseInterperter() && prop.isImplemented()) {
                if (runAsAsync) {
                    var rctx = this.newTmpVarOK("resumeCtx", JsCall.direct("s.rt.getAsyncResumeCtx", []));
                    this.callString(prop, args, rctx, astref); // this pushes the call
                    return JsCall.directInst(rctx, "task", null)
                }

                var l = this.allocateLabel();
                var r = new JsLabelRef(l);
                var fnName = prop.getFlags() & PropertyFlags.Async ? "s.rt.getAwaitResumeCtx" : "s.rt.getBlockingResumeCtx"
                var rctx = this.newTmpVarOK("resumeCtx", JsCall.direct(fnName, [r]));
                this.callString(prop, args, rctx, astref); // this pushes the call
                this.aux.push(new JsGoto(r, false));
                this.aux.push(l);
                if (prop.getResult().getKind() == api.core.Nothing)
                    return this.unit;
                else {
                    var res:JsExpr = this.newTmpVar("pauseRes", this.term("s.pauseValue"));
                    this.markAllocated(prop, res);
                    return res;
                }
            } else if (prop == api.core.StringConcatProp) {
                // TODO optimize when both arguments are strings?
                return this.newTmpVar("concat", JsCall.direct("lib.String_.concatAny", args));
            } else {
                var res = this.callString(prop, args, this.term("s"), astref);
                this.markAllocated(prop, res);
                return res;
            }
        }

        private stringLiteral(s:string) { return Util.jsStringLiteral(s) }

        public visitLiteral(l:Literal)
        {
            switch (typeof l.data) {
            case "string":
                return new JsLiteral(this.stringLiteral(l.data));
            case "number":
                return new JsLiteral(l.data.toString());
            case "boolean":
                return new JsLiteral(l.data.toString());
            default: Util.die();
            }
        }

        private handlePlaceholder(pdef:PlaceholderDef)
        {
            var str = (s:string) => new JsLiteral(this.stringLiteral(s));
            var data = pdef.escapeDef
            var lk:Kind = data.objectToMake
            var parentLib = lk.parentLibrary() ? lk.parentLibrary().getStableName() : "this"
            var call = JsCall.direct("s.rt.mkLibObject", [str(parentLib), str(lk.getName())])
            var res = this.newTmpVarOK("obj", call)
            if (data.optionalConstructor) {
                data.optionalConstructor.optionalParameters().forEach(p => {
                    var fieldName = new JsLiteral(this.stringLiteral(p.recordField.referenceName()));
                    var arg = p instanceof OptionalParameter ?
                        this.doExpr((<OptionalParameter>p).expr.parsed) :
                        this.localVarRef((<InlineAction>p).name);
                    this.aux.push(new JsExprStmt(JsCall.directInst(res, "perform_set", [fieldName, arg, this.term("s")])));
                })
            }
            return res
        }

        public visitThingRef(t:ThingRef):JsExpr
        {
            switch (t.def.nodeType()) {
            case "singletonDef":
                return this.term("null");
                //return this.unit;
            case "localDef":
                var term = this.localVarRef(<LocalDef>t.def);
                // If okElimination is turned on, uses all the information
                // we have to try to turn off the "ok check" for this local.
                if (this.options.okElimination && this.currentReachingDefs) {
                    if (!this.currentReachingDefs.mayBeInvalid(<LocalDef>t.def)
                        || (this.currentUsedSet && this.currentUsedSet.alreadyUsed(<LocalDef>t.def))) {
                        this.numOkEliminations++;
                        term._alwaysValid = true;
                    }
                }
                return term;
            case "placeholderDef":
                return this.handlePlaceholder(<PlaceholderDef>t.def)

            default: Util.die();
            }
        }

        public visitAstNode(n:AstNode)
        {
            Util.oops(lf("compilation not implemented for {0}", n.nodeType()));
        }

        private emitOk(n:number)
        {
            var a = Util.range(0, n).map((k) => "a" + k);
            this.wr("function ok" + n + "(s, " + a.join(", ") + ") {\n");
            // note that in JS "null == undefined" is true, see http://es5.github.com/#x11.9.3
            this.wr("  return (" + a.map((x) => x + " == undefined").join(" || ") + ") ?\n");
            this.wr("       TDev.Util.userError(\"using invalid value\") : true;\n");
            this.wr("}\n\n");
        }

        public visitLibraryRef(l:LibraryRef) {}

        public visitRecordDef(r:RecordDef)
        {
            if (!this.shouldCompile(r)) return

            var mkEntry = "Ent_" + r.getStableName();
            var mkTable = "Tbl_" + r.getStableName();

            if (r.cloudEnabled)
                this.options.hasCloudData = true;
            if (r.locallypersisted())
                this.options.hasLocalData = true;
            if (r.cloudPartiallyEnabled)
                this.options.hasPartialData = true;

            var rt = (r.persistent ? "Cloud" : "") + RecordDef.recordTypeToString(r.recordType);

            var wrProto = (target:string, fnName:string, expr:string) =>
            {
                if (fnName != "") fnName = "." + fnName;
                this.wr(target + ".prototype" + fnName + " = " + expr + ";\n");
            }

            var wrProtoQ = (target:string, fnName:string, expr:string) =>
            {
                this.wr(target + ".prototype[" + this.stringLiteral(fnName) + "] = " + expr + ";\n");
            }

            var wrFields = (target:string, id:string, flds:RecordField[]) =>
            {
                wrProto(target, id, "[" + flds.map((f) => this.stringLiteral(f.referenceName())).join(", ") + "]");
            }

            // define entry objects

            this.wr("\n//" + mkEntry + "\n");
            this.wr("function " + mkEntry + "(p) {\n");
            this.wr("  this.parent = p;\n");
            this.wr("}\n");
            wrProto(mkEntry, "", "new lib." + rt + "Entry()");
            wrFields(mkEntry, "keys", r.keys.fields());
            wrFields(mkEntry, "values", r.values.fields());
            wrFields(mkEntry, "fields", r.getFields());
            //wrFields(mkEntry, "factories", r.getFields().map((f:RecordField) => f.);
            var wrFieldName = (f: RecordField) =>
            {
                wrProtoQ(mkEntry, f.referenceName() + "_realname", this.stringLiteral(f.getName()));
            }
            var wrFieldDefaultValue = (f: RecordField) =>
            {
                var defl = ""
                switch (f.dataKind.getName()) {
                    case "Boolean": defl = 'false'; break;
                    case "Number": defl = '0'; break;
                    case "String": defl = '""'; break;
                    case "DateTime": defl = 'lib.DateTime.defaultValue'; break;
                    default: break;
                }
                if (defl)
                    wrProtoQ(mkEntry, f.referenceName(), defl)
            }
            r.getFields().forEach(wrFieldName);
            if (!r.persistent)
                r.getValueFields().forEach(wrFieldDefaultValue);

            // define table objects

            this.wr("//" + mkTable + "\n");
            this.wr("function " + mkTable + "(l) {\n");
            this.wr("  this.libName = l;\n");
            this.wr("  this.initParent();\n");
            this.wr("}\n");
            wrProto(mkTable, "", "new lib." + rt + "Singleton()");
            wrProto(mkTable, "entryCtor", mkEntry);
            this.wr("cs.objectSingletons[" + this.stringLiteral(r.getCoreName()) + "] " +
                    "= function(d) { return d." + this.globalVarId(r) + " };\n")
            wrProto(mkTable, "selfCtor", mkTable);
            wrProto(mkTable, "stableName", this.stringLiteral(r.getStableName()));
            wrProto(mkTable, "entryKindName", this.stringLiteral(r.entryKind.getName()));
            if (r.persistent && !r.hasErrors()) {
                wrProto(mkTable, "cloudtype", this.stringLiteral(r.getCloudType()));
                wrProto(mkTable, "key_cloudtypes", "[" + r.keys.fields().map((f) => this.stringLiteral(f.getCloudType())).join(", ") + "]");
                wrProto(mkTable, "value_cloudtypes", "[" + r.values.fields().map((f) => this.stringLiteral(f.getCloudType())).join(", ") + "]");
                if (r.locallypersisted() && !this.options.azureSite) {
                    wrProto(mkTable, "localsession", "true");
                } else {
                    this.cloudstateJsonExport = this.cloudstateJsonExport + "  json[" + this.stringLiteral(r.getName())
                    + "] = d." + this.globalVarId(r) + ".exportJson(ctx);\n";
                    this.cloudstateJsonImport = this.cloudstateJsonImport
                    + "  d." + this.globalVarId(r) + ".importJsonTableOrIndex(ctx,json[" + this.stringLiteral(r.getName()) + "]);\n";
                    wrProto(mkTable, "replication",
                        r.cloudPartiallyEnabled ? this.stringLiteral("partial")
                        : r.cloudEnabled ? this.stringLiteral("full")
                        : this.stringLiteral("local"));
                }

            }

            // define record jsonimport
            this.wr("\n// jsonimport\n");
            if ((r.recordType === RecordType.Table || r.recordType === RecordType.Index) && r.keys.fields().length > 0) {
                this.wr(mkTable + ".prototype.importJsonKeys = function (ctx, json) {\n");
                this.wr("  var s = ctx.s;\n");
                this.wr("  var a = [];\n");
                r.keys.fields().forEach((f) => {
                    if (f.dataKind.hasContext(KindContext.Json)) {
                        var typename = f.dataKind.getName().replace(/ /g, "");
                        switch (typename) {
                            case "Boolean":
                            case "Number":
                            case "String":
                            case "DateTime":
                            case "Color":
                            case "User":
                            case "Location":
                            case "Vector3":
                                this.wr("  a.push(ctx.import" + typename + "(json, " + this.stringLiteral(f.getName()) + "));\n");
                                break;
                            default: // RecordEntry or RecordCollection
                                if (f.dataKind instanceof RecordEntryKind) {
                                    this.wr("  a.push(ctx.importRecord(json, undefined,"
                                        + this.stringLiteral(f.getName()) + ", "
                                        + "s.d." + this.globalVarId((<RecordEntryKind> f.dataKind).record) + "));\n");
                                } break;
                        }
                    }
                });
                this.wr("  return a;\n");
                this.wr("}\n");
            }
            this.wr(mkEntry + ".prototype.importJsonFields = function (ctx, json) {\n");
            this.wr("  var s = ctx.s;\n");
            r.values.fields().forEach((f) => {
                if (f.dataKind.hasContext(KindContext.Json)) {
                    var typename = f.dataKind.getName().replace(/ /g, "");
                    var fieldname = this.stringLiteral(f.referenceName());
                    switch (typename) {
                        case "Boolean":
                        case "Number":
                        case "String":
                        case "DateTime":
                        case "Color":
                        case "JsonObject":
                        case "User":
                        case "Location":
                        case "Vector3":
                            this.wr("  this.perform_set(" +
                                fieldname + ", "
                                + "ctx.import" + typename + "(json, " + this.stringLiteral(f.getName()) + "), s);\n");
                            break;
                        case "JsonBuilder":
                        case "Link":
                        case "OAuthResponse":
                        case "StringMap":
                        case "NumberMap":
                            this.wr("  this.perform_set("
                                + fieldname + ", "
                                + "ctx.import" + typename + "(json, this.perform_get(" + fieldname + ",s),"
                                + this.stringLiteral(f.getName())
                                + "), s);\n");
                            break;
                        default: // RecordEntry or RecordCollection
                            if (f.dataKind instanceof RecordEntryKind) {
                                this.wr("  this.perform_set(" +
                                    fieldname + ", "
                                    + "ctx.importRecord(json, this.perform_get(" + fieldname + ",s),"
                                    + this.stringLiteral(f.getName()) + ", "
                                    + "s.d." + this.globalVarId((<RecordEntryKind> f.dataKind).record)
                                    + "), s);\n");
                            } else if (f.dataKind._name === "Collection") {
                                var containedkind = (<ParametricKind> f.dataKind).parameters[0];
                                var rt = containedkind.hasContext(KindContext.Json) ? this.reifyType(containedkind) : null
                                if (rt) {
                                    this.wr("  this.perform_set(" +
                                        fieldname + ", "
                                        + "ctx.importCollection(json, this.perform_get(" + fieldname + ",s),"
                                        + this.stringLiteral(f.getName()) + ", "
                                        + rt + "), s);\n");
                                }
                            }
                            break;
                    }
                }
            });
            this.wr("}\n");

            // define initialization

            var id = this.globalVarId(r);
            this.initGlobals += "  if(!d.hasOwnProperty(" + this.stringLiteral(id) + ") || !d[" + this.stringLiteral(id) + "]) d." + id + " = new " + mkTable + "(d.libName);\n";

            this.initGlobals2 += "d." + id + ".name = \"" + r.getCoreName() + "\";";
            if (r.persistent) {
                this.initGlobals2 += "d." + id + ".linked_cloudtables = ["
                + r.keys.fields().filter((f) => f.dataKind instanceof RecordEntryKind)
                    .map((ff) => ("d." + this.globalVarId((<RecordEntryKind>ff.dataKind).record)))
                    .join(", ")
                + "];\n";
            }

            this.resetGlobals += "  d." + id + " = undefined;\n";

            this.wr("cs.registerGlobal(" + this.stringLiteral(id) + ");\n");
        }

        private throwSyntaxError(a:Action)
        {
            var str = (s:string) => this.stringLiteral(s)
            var userErr = (msg:string, id:string) => {
                this.wr("  TDev.Util.syntaxError(" + this.stringLiteral(msg) + ", " + this.stringLiteral(id) + ");\n");
            }

            if (a.hasErrors()) {
                userErr(lf("action '{0}' (in '{1}') has errors and will not run", a.getName(), this.currentApp.getName()),
                        a.getStableName());
                return true;
            } else if (this.globalError) {
                userErr(this.globalError, this.globalErrorId);
                return true;
            }

            return false;
        }

        // Emit the JavaScript code for an inlined action, as determined by the
        // inline analysis. The analysis only selects actions that lacks
        // loop statements and calls to non-inlined actions, which makes it
        // simpler. Therefore, this code implements a simpler case of
        // visitAction and uses native JS locals to map TouchDevelop locals
        // instead of using a dedicated stack data structure.
        private visitInlinedAction(a:Action) {
            this.inlineCurrentAction = true;
            this.localNameCtx = new QuotingCtx();
            this.actionName = "a_" + a.getStableName();
            this.currentAction = a;
            this.wr(this.comment("ACTION: " + a.getName() + " (inlined)") + "\n");
            this.wr("function " + this.actionName + "(s ");
            a.getInParameters().forEach((l) => { this.wr(", " + this.localVarName(l.local)); });
            this.wr(") {\n");

            if (this.throwSyntaxError(a)) {
                this.wr("\n }\n");
                return;
            }

            Util.assert(a.getOutParameters().length <= 1);
            if (a.getOutParameters().length > 0) {
                var param = a.getOutParameters()[0];
                if (param.local == undefined) {
                    this.wr("  var " + param.getName() + " = undefined;\n");
                }
            }
            a.allLocals.forEach((l) => {
                if (!a.getInParameters().some((p:ActionParameter) => p.local == l)) {
                    this.wr("  var " + this.localVarName(l) + " = undefined;\n");
                }
            });

            var jsNodes: JsStmt[] = this.dispatch(a.body);
            var prevMax = this.maxArgsToCheck + 1;
            this.insertFinalLabels(jsNodes);
            jsNodes.forEach((n) => n.forEachExpr((e:JsExpr) => {
                if (e instanceof JsLabelRef) {
                    (<JsLabelRef> e).label.refs.push(e);
                }
                if (e instanceof JsCall) {
                    var c = <JsCall>e;  // look at each JS method call, including those inserted during compilation
                    if (c.method == "ok" && this.maxArgsToCheck < c.args.length)
                        this.maxArgsToCheck = c.args.length;
                }
                Util.assertCode(e !== this.unit);
            }));
            this.blockId = 1; this.tmpIdx = 0;
            this.markBlocks(jsNodes);

            jsNodes.forEach((n) => n.injectEndIfJumps());

            this.dumpInlinedContents(jsNodes);

            if (a.getOutParameters().length > 0) {
                var param = a.getOutParameters()[0];
                if (param.local == undefined)
                    this.wr("  return " + param.getName() + ";\n");
                else
                    this.wr("  return " + this.localVarName(param.local) + ";\n");
            }
            this.wr("}\n");
            while (prevMax <= this.maxArgsToCheck)
                this.emitOk(prevMax++);
            this.inlineCurrentAction = false;
        }

        private shouldCompile(d:Decl)
        {
            return d.visitorState === true;
        }

        public visitAction(a:Action)
        {
            if (!this.shouldCompile(a)) return

            this.numActions++;
            if (this.options.inlining && a.canBeInlined) {
                this.numInlinedFunctions++;
                return this.visitInlinedAction(a);
            }
            this.inlineCurrentAction = false;
            this.mapExprToVar = {};
            this.localNameCtx = new QuotingCtx();
            this.stepIdx = 0;

            var str = (s:string) => this.stringLiteral(s)

            this.actionName = "a_" + a.getStableName();
            this.currentAction = a;
            this.wr(this.comment("ACTION: " + a.getName()) + "\n");
            this.wr("function " + this.actionName + "(previous, returnAddr");
            a.getInParameters().forEach((l) => { this.wr(", " + this.localVarName(l.local)); });
            var lab0 = this.allocateLabel();
            this.wr(") {\n")

            if (!this.throwSyntaxError(a)) {
                this.wr(
                   "  var s = TDev.Runtime.mkStackFrame(previous, returnAddr);\n" +
                   "  s.entryAddr = " + lab0.id + ";\n" +
                   "  s.name = " + str((a.compilerParentAction || a).getName()) + ";\n");
                if (a.getOutParameters().length > 1)
                    this.wr("  s.results = [];\n");
                a.allLocals.forEach((l) => {
                    this.wr("  " + this.localVarRef(l).toString() + " = ");
                    if (a.getInParameters().some((p:ActionParameter) => p.local == l)) {
                      this.wr(this.localVarName(l));
                    } else {
                      this.wr("undefined");
                    }
                    this.wr(";\n");
                });
                this.wr("  return s;\n");
            }
            this.wr("}\n");

            this.wr("cs.register" + (a.isLambda ? "Lambda" : a.isPage() ? "Page" : "Action") + "(" + str(a.getName()) + ", " + str(a.getStableName()) + ", " + this.actionName + (!a.isAtomic ? ", true" : ", false") + ");\n");
            if (a.isEvent()) {
                var inf = a.eventInfo;
                if (!inf.disabled) {
                    var varId = !inf.onVariable ? "null" : str(this.globalVarId(inf.onVariable));
                    this.wr("cs.registerEventHandler(" + str(inf.type.category) + ", " + varId + ", " + this.actionName + ");\n");
                }
            }
            this.wr("\n");

            if (a.hasErrors() || !!this.globalError) return;

            function setFlag(b:CodeBlock, f:BlockFlags) { if (b) b.flags |= f; }
            if (a.isPage()) {
                setFlag(a.getPageBlock(true), BlockFlags.IsPageInit);
                setFlag(a.getPageBlock(false), BlockFlags.IsPageRender);
            }

            if (this.needsProfiling())  // create local var for profiler [CCC]
                this.profilingScopes.push(new JsTmpDef("profilingLastCallTimeStamp", new JsLiteral("0")));

            var jsNodes: JsStmt[] = this.dispatch(a.body);

            if (this.needsProfiling())
                jsNodes.unshift(this.profilingScopes.pop());

            // always add 'pickers' in cloud mode
            var cloudPicker = this.options.cloud && !a.isPrivate

            if (cloudPicker || (a.isRunnable() && a.hasInParameters()))
                jsNodes.unshift(this.synthesizePicker(a.getInParameters()));

            if (cloudPicker || (a.isRunnable() && a.hasOutParameters()))
                jsNodes.push(this.synthesizeOutput(a.getOutParameters()));

            jsNodes.unshift(lab0);
            lab0.refs.push(lab0);
            var prevMax = this.maxArgsToCheck + 1;
            this.insertFinalLabels(jsNodes);
            jsNodes.forEach((n) => n.forEachExpr((e:JsExpr) => {
                if (e instanceof JsLabelRef) {
                    (<JsLabelRef> e).label.refs.push(e);
                }
                if (e instanceof JsCall) {
                    var c = <JsCall>e;  // look at each JS method call, including those inserted during compilation
                    if (c.method == "ok" && this.maxArgsToCheck < c.args.length)
                        this.maxArgsToCheck = c.args.length;
                }
                Util.assertCode(e !== this.unit);
            }));
            while (prevMax <= this.maxArgsToCheck)
                this.emitOk(prevMax++);
            this.blockId = 1; this.tmpIdx = 0;
            this.markBlocks(jsNodes);

            jsNodes.forEach((n) => n.injectEndIfJumps());

            /*
            var dmp = "";
            var xwr = (s:string) => { dmp += s + "\n"; }
            if (/gameloop/.test(a.getName())) {
                jsNodes.forEach((n) => n.dump(xwr));
                debugger;
            }
            */

            jsNodes.push(new JsGoto(this.term("s.rt.leave()"), false));

            this.dumpFunction(jsNodes, 0);
            while (this.todo.length > 0) {
                var f = this.todo.shift();
                f();
            }

            this.debuggerLocalCtxs[a.stableId] = this.localNameCtx.getNameMapping();

            // this will actually only ever turn once
            while (this.innerActions.length > 0) {
                var aa = this.innerActions.shift();
                aa.visitorState = true
                this.dispatch(aa);
            }
        }

        public recompileAction(a:Action, cs:CompiledScript)
        {
            this.initGlobals = "";
            this.initGlobals2 = "";
            this.maxArgsToCheck = 0;
            this.output = "";

            this.wr("'use strict';\n");
            this.wr("(function (cs) {\n");
            this.wr("var libs = cs.libs;\n");
            this.wr("var lib = TDev.RT;\n");

            this.dispatch(a);

            this.wr("})");

            cs.reinit(this.output);
        }

        private insertFinalLabels(nodes:JsStmt[]):void
        {
            for (var i = 0; i < nodes.length; ++i) {
                if (nodes[i] instanceof JsIf) {
                    var s = <JsIf> nodes[i];
                    nodes.splice(i + 1, 0, s.finalLabel);
                    this.insertFinalLabels(s.thenBody);
                    this.insertFinalLabels(s.elseBody);
                }
            }
        }

        private markBlocks(nodes:JsStmt[]):void
        {
            var mark = (e:JsExpr) =>
            {
                if (e instanceof JsTmpRef) {
                    var t = <JsTmpRef>e;
                    if (this.blockId != t.tmp.definitionPoint)
                        t.tmp.isLocal = false;
                }
            }

            nodes.forEach((s:JsStmt) => {
                if (s instanceof JsIf) {
                    var i = <JsIf>s;
                    i.condition.forEachExpr(mark);
                    this.markBlocks(i.thenBody);
                    this.markBlocks(i.elseBody);
                    return;
                } else if (s instanceof JsTmpDef) {
                    var t = <JsTmpDef>s;
                    t.definitionPoint = this.blockId;
                    t.id = this.tmpIdx++;
                } else if (s instanceof JsLabel) {
                    var l = <JsLabel>s;
                    if (l.refs.length > 0)
                        this.blockId++;
                }
                s.forEachExpr(mark);
            });
        }

        private dumpFunction(nodes:JsStmt[], idx:number) : void
        {
            var lab = <JsLabel> nodes[idx];
            this.wr("function " + lab.id + "(s) {\n");

            if (this.options.optimizeLoops) {
                var head = <JsIf>nodes[idx + 1]
                if (head instanceof JsIf && head.elseBody.length == 0) {
                    var last = <JsGoto>head.thenBody.peek();
                    if (last instanceof JsGoto && last.isSimple(lab)) {
                        // ok, we have a loop
                        (() => {
                            var hasLabels = (n:JsStmt[]) => {
                                for (var i = 0; i < n.length; ++i) {
                                    var ifs = <JsIf>n[i]
                                    if (ifs instanceof JsIf)
                                        if (hasLabels(ifs.thenBody) || hasLabels(ifs.elseBody)) return true;
                                    if (n[i].isUsedLabel()) return true;
                                }
                                return false;
                            }
                            var innerBody = head.thenBody.slice(0, head.thenBody.length - 1);
                            if (!hasLabels(innerBody)) {
                                head.thenBody = innerBody;
                                head.isWhile = true;
                            }
                        })()
                    }
                }
            } else if (this.options.blockChaining) {
                // Block Chaining will transform an inner loop into a native
                // JavaScript loop by emitting a "while" construct. It uses
                // a counter to return to the interpreter after a few
                // iterations.
                var head = <JsIf>nodes[idx + 1];
                if (head instanceof JsIf && head.elseBody.length == 0) {
                    var last = <JsGoto>head.thenBody.peek();
                    if (last instanceof JsGoto && last.isSimple(lab)) {
                        // ok, we have a loop
                        (() => {
                            var hasLabels = (n: JsStmt[]) => {
                                for (var i = 0; i < n.length; ++i) {
                                    var ifs = <JsIf>n[i]
                                    if (ifs instanceof JsIf)
                                        if (hasLabels(ifs.thenBody) || hasLabels(ifs.elseBody)) return true;
                                    if (n[i].isUsedLabel()) return true;
                                }
                                return false;
                            }
                            var innerBody = head.thenBody.slice(0, head.thenBody.length - 1);
                            if (!hasLabels(innerBody)) {
                                last.jumpsToOptimizedLoop = true;
                                head.isWhile = true;
                            }
                        })()
                    }
                }
            }

            this.dumpInner(nodes, idx + 1)
            this.wr("}\n");
            this.wr("cs.registerStep(" + lab.id + ", '" + lab.id + "');\n\n");
        }

        private dumpSimple(n:JsStmt)
        {
            this.wr("  " + n.toString() + "\n");
        }

        private dumpInner(nodes:JsStmt[], idx:number)
        {
            while (idx < nodes.length) {
                var n = nodes[idx];
                if (n.isUsedLabel()) {
                    this.dumpSimple(JsGoto.simple(<JsLabel>n));
                    this.todo.push(() => { this.dumpFunction(nodes, idx); });
                    return;
                } else if (n.category() == JsNodeCategory.Goto) {
                    this.dumpSimple(n);
                    if (idx == nodes.length - 1) return;
                    Util.assertCode(nodes[idx+1].category() == JsNodeCategory.Label);
                    this.todo.push(() => { this.dumpFunction(nodes, idx + 1); });
                    return;
                } else if (n.category() == JsNodeCategory.If) {
                    var i = <JsIf> n;
                    this.wr("  " + (i.isWhile ? "while" : "if") + " (" + i.condition.toString() + ") {\n");
                    this.dumpInner(i.thenBody, 0);
                    if (i.elseBody.length > 0) {
                        this.wr("  } else {\n");
                        this.dumpInner(i.elseBody, 0);
                    }
                    this.wr("  }\n");
                } else if (n.category() == JsNodeCategory.Label) {
                    // unused label
                } else {
                    this.dumpSimple(n);
                }
                idx++;
            }
        }

        // This is a special version of dumpInner to inlined functions
        // (flagged by InlineAnalysis). It emits the contents of an inlined
        // function, which does not have a separate stack and is closer to
        // native JavaScript. On the other hand, it cannot have loops or
        // calls to non-inlined actions.
        private dumpInlinedContents(nodes:JsStmt[])
        {
            var idx = 0;
            while (idx < nodes.length) {
                var n = nodes[idx];
                if (n.isUsedLabel()) {
                    Util.assert(false && !!"Should not have used labels in inlined function!");
                    return;
                } else if (n.category() == JsNodeCategory.Goto) {
                    Util.assert(false && !!"Should not have Gotos in inlined function!");
                    return;
                } else if (n.category() == JsNodeCategory.If) {
                    var i = <JsIf> n;
                    this.wr("  " + (i.isWhile ? "while" : "if") + " (" + i.condition.toString() + ") {\n");
                    this.dumpInlinedContents(i.thenBody);
                    if (i.elseBody.length > 0) {
                        this.wr("  } else {\n");
                        this.dumpInlinedContents(i.elseBody);
                    }
                    this.wr("  }\n");
                } else if (n.category() == JsNodeCategory.Label) {
                    // unused label
                } else {
                    this.dumpSimple(n);
                }
                idx++;
            }
        }

        private defaultValue(k:Kind, forPicker = false)
        {
            switch (k.getName()) {
            case "Number": return "0";
            case "String": return "\"\"";
            case "Boolean": return "false";
            case "DateTime": return "lib.DateTime.defaultValue";
            case "Tile": return "lib.Tile.mkDefaultValue()";
            }
            if (!forPicker)
                return null;

            switch (k.getName()) {
            case "Collection": return "lib.Collection.fromArray([], " + (this.reifyType(k.getParameter(0)) || "null") + ")";
            }

            return null
        }

        private addResourceAsFile(res: PackageResource) {
            if (/^([a-z0-9\-_][a-z0-9\-_\.]*\/)*[a-z0-9\-_][a-z0-9\-_\.]*\.[a-z0-9]+$/i.test(res.sourceName)) {
                var resFile = Util.clone(res);
                resFile.packageUrl = res.sourceName;
                resFile.usageLevel = 1;
                this.packageResources.push(resFile)
            }
        }


        public visitGlobalDef(d:GlobalDef)
        {
            if (!this.shouldCompile(d)) return

            if (d.isResource && !!d.url) {
                var resourceId = this.globalVarId(d)
                var resourceUrl = d.url;
                // building up the table of 'resource id' -> url for packaging
                if (this.options.packaging) {
                    var kindName = d.getKind().getName();
                    var qualId = this.options.libStaticPrefix + resourceId.replace(/\$/, "")
                    var suff = this.options.artUrlSuffix || ""
                    var resource:PackageResource = {
                        kind:'art',
                        id: qualId,
                        url: resourceUrl,
                        packageUrl: null,
                        sourceName: d.getName(),
                        usageLevel: d.usageLevel,
                        type: kindName.toLowerCase()
                    }
                    if ((kindName === 'Picture' || kindName === 'Sound') && !/^data:\/\//i.test(resourceUrl)) {
                        resource.packageUrl = encodeURI('./art/' + qualId + suff);
                        resourceUrl = resource.packageUrl;
                        this.packageResources.push(resource)
                        this.addResourceAsFile(resource);
                    } else if (kindName === 'String') {
                        var key = TDev.RT.String_.valueFromKeyUrl(resourceUrl);
                        if (key) { // is this a key?
                            // do we have a key available?
                            var keyValue = this.options.apiKeys ? this.options.apiKeys[key] : '';
                            if (keyValue) // embed value if available
                                resourceUrl = TDev.RT.String_.valueToArtUrl(keyValue);
                            else { //no key available
                                resourceUrl = undefined;
                                this.packageResources.push({ kind: 'key', url: key, id: null, packageUrl: null, type: "string" });
                            }
                        } else if (!TDev.RT.String_.valueFromArtUrl(resourceUrl)) { // this is an url
                            resource.packageUrl = encodeURI('./art/' + qualId + suff);
                            resourceUrl = resource.packageUrl;
                            this.packageResources.push(resource)
                        }
                        // save resource as needed
                        if (resourceUrl) {
                            var value = TDev.RT.String_.valueFromArtUrl(resourceUrl);
                            if (value) {
                                resource.content = value;
                                resource.url = undefined;
                            }
                            this.addResourceAsFile(resource);
                        }
                     }
                }

                if (d.usageLevel > 0 && resourceUrl)
                    this.wr("cs.registerArtResource(" +
                            this.stringLiteral(d.getKind().runtimeName()) + ", " +
                            this.stringLiteral(resourceId) + ", " +
                            this.stringLiteral(resourceUrl) + ");\n");
            }

            if (d.cloudEnabled)
                this.options.hasCloudData = true;
            else if (!d.isTransient)
                this.options.hasLocalData = true;

            if (!d.isTransient && !d.hasErrors()) {
                this.persistentvars.push({
                    local: !d.cloudEnabled,
                    name: d.getStableName(),
                    cloudtype: Revisions.Parser.MakeProperty(d.getStableName(), "global[]", AST.KindToCodomain(d.getKind()))
                });
            }

            // not writing out the id will cause the art resource to be cleared when saving state
            if (!d.isResource && !d.isTransient)
                this.wr("cs.registerGlobal(" + this.stringLiteral(this.globalVarId(d)) + ");\n");

            var initVal = this.defaultValue(d.getKind());
            if (!!initVal) {
                this.initGlobals += "  if(!d.hasOwnProperty(" + this.stringLiteral(this.globalVarId(d)) + ")) d." + this.globalVarId(d) + " = " + initVal + ";\n";
            }
            if (!d.getKind().isSerializable || d.isTransient) {
                this.resetGlobals += "  d." + this.globalVarId(d) + " = " + (initVal || "undefined") + ";\n";
            }
        }

        public initPersistentVars(local: boolean): string {
            var collect = this.persistentvars.filter((v) => !!v.local === local);
            if (collect.length == 0)
                return;
            var pv = "  d.$$" + (local ? "local" : "cloud") + "persistentvars";
            this.wr(pv + " = new lib.PersistentVars(rt);\n");
            this.wr(pv + ".localsession = " + local.toString() + ";\n");
            this.wr(pv + ".libName = d.libName;\n");
            this.wr(pv + ".names = [" + collect.map((v) => this.stringLiteral("$" + v.name)).join(", ") + "]; \n");
            this.wr(pv + ".cloudtypes = [" + collect.map((v) => this.stringLiteral(v.cloudtype)).join(", ") + "]; \n");

            this.resetGlobals += (pv + " = undefined;\n");
        }

        static compileCore(a: App, cs: CompiledScript, options:CompilerOptions)
        {
            var comp = new Compiler(options);

            a.setStableNames();

            var usage = new UsageComputer()
            usage.dispatch(a);

            comp.dispatch(a);
            cs.init(comp.output, comp.missingApis, comp.packageResources, !options.javascript);

            cs.localNamesBindings = comp.debuggerLocalCtxs;

            if (options.dynamic) {
                a.recompiler = comp;
                a.recompiledScript = cs;
            }
            cs.optStatistics.inlinedCalls += comp.numInlinedCalls;
            cs.optStatistics.inlinedFunctions += comp.numInlinedFunctions;
            cs.optStatistics.eliminatedOks += comp.numOkEliminations;
            cs.optStatistics.numActions += comp.numActions;
            cs.optStatistics.numStatements += comp.numStatements;
            cs.optStatistics.termsReused += comp.termsReused;
            cs.optStatistics.constantsPropagated += comp.constantsPropagated;
            cs.npmModules = comp.npmModules
            cs.cordovaPlugins = comp.cordovaPlugins
            cs.pipPackages = comp.pipPackages
        }

        static annotateWithIds(a: App) {
            var compiled = [];
            var k = 0;
            a.libraries().forEach((l: LibraryRef) => {
                var prev = compiled.filter((e) => e.app == l.resolved)[0];
                if (!prev && l.resolved) {
                    Json.setStableId(l.resolved, (++k) + ".");
                    compiled.push(l.resolved);
                }
            });
            Json.setStableId(a, "0.");
        }

        static getCompiledCode(that:CompiledScript, options:CompilerOptions)
        {
            Object.keys(that.libScripts).forEach((name:string) => { that.libScripts[name].primaryName = null })

            var res = ""

            if (options.cloud) {
                res += "require('./noderuntime.js')\n" +
                       "var TDev     = global.TDev;\n" +
                       "var window   = global.TDev.window;\n" +
                       "var document = global.TDev.window.document;\n"
            } else {
                res += "var TDev;\n" +
                       "if (!TDev) TDev = {};\n"
            }

            res += "\nTDev.precompiledScript = {\n"
            var first = true;
            Object.keys(that.libScripts).forEach((name:string) => {
                if (!first)
                    res += ",\n\n// **************************************************************\n"
                first = false;

                res += Util.jsStringLiteral(name) + ": ";
                var cs = <CompiledScript>that.libScripts[name];
                if (cs.primaryName) res += Util.jsStringLiteral(cs.primaryName);
                else {
                    cs.primaryName = name;
                    res += cs.code
                }
            })
            res += "}\n"

            if (options.cloud) {
                res += "\nTDev.RT.Node.runMainAsync().done();\n"
            }

            return res;
        }

        static getCompiledScript(a: App, options: CompilerOptions, initialBreakpoints?: Hashtable): CompiledScript // TODO: get rid of Hashtable here
        {
            var prep = new PreCompiler(options)
            prep.run(a)
            
            var cs = new CompiledScript();
            cs.getCompiledCode = () => Compiler.getCompiledCode(cs, options);
            a.clearRecompiler();
            var compiled = [];
            a.setStableNames();
            var k = 0;
            a.libraries().forEach((l:LibraryRef) => {
                //if (options.packaging && l.isCloud()) return

                var prev = compiled.filter((e) => e.app == l.resolved)[0];
                if (!prev) {
                    prev = { app: l.resolved, cs: new CompiledScript() };
                    if (prev.app) {
                        var opts = Util.flatClone(options);
                        opts.dynamic = false;
                        opts.isTopLevel = false;
                        Json.setStableId(prev.app, (++k) + ".");
                        opts.libStaticPrefix = "l" + k + "_"
                        if (opts.debugging) prev.cs.initBreakpoints = (initialBreakpoints || Hashtable.forStrings());
                        Compiler.compileCore(prev.app, prev.cs, opts);
                        if (opts.hasCloudData) options.hasCloudData = true;
                        if (opts.hasPartialData) options.hasPartialData = true;
                        if (opts.hasLocalData) options.hasLocalData = true;
                    }
                    cs.missingApis.pushRange(prev.cs.missingApis);
                    cs.packageResources.pushRange(prev.cs.packageResources);
                }
                cs.registerLibRef(l.getStableName(), prev.cs);
            });
            Json.setStableId(a, "0.");
            options.libStaticPrefix = "l0_"
            // Initialize the analysis pipeline, will call all necessary
            // analyses to perform the requested optimizations
            var reachingDefsTime = 0;
            var usedAnalysisTime = 0;
            var availableExpressionsTime = 0;
            var constantPropagationTime = 0;
            var inlineAnalysisTime = 0;
            var compileTime = 0;
            if (options.profiling || options.debugging)
                options.inlining = false;

            if (options.inlining) {
                try {
                    var iaCounter = TDev.RT.Perf.start("inlineanalysis");
                    var ia = new InlineAnalysis();
                    ia.dispatch(a);
                    ia.nestedInlineAnalysis();
                    inlineAnalysisTime = TDev.RT.Perf.stop(iaCounter);
                } catch (err) {
                    Util.reportError('Inline Analysis failed', err, false);
                    inlineAnalysisTime = -1;
                    options.inlining = false;
                }
            }
            if (options.okElimination) {
                try {
                    var rdCounter = TDev.RT.Perf.start("reachingdefs");
                    var rd = new ReachingDefinitions();
                    rd.visitApp(a);
                    reachingDefsTime = TDev.RT.Perf.stop(rdCounter);
                    var uaCounter = TDev.RT.Perf.start("usedanalysis");
                    var ua = new UsedAnalysis();
                    ua.visitApp(a);
                    usedAnalysisTime = TDev.RT.Perf.stop(uaCounter);
                } catch (err) {
                    Util.reportError('Reaching Definitions failed', err, false);
                    reachingDefsTime = -1;
                    options.okElimination = false;
                }
            }
            if (options.commonSubexprElim) {
                var aeCounter = TDev.RT.Perf.start("availableexpressions");
                var ae = new AvailableExpressions();
                ae.visitApp(a);
                availableExpressionsTime = TDev.RT.Perf.stop(aeCounter);
                try {
                } catch (err) {
                    Util.reportError('CSE failed', err, false);
                    availableExpressionsTime = -1;
                    options.commonSubexprElim = false;
                }
            }
            if (options.constantPropagation) {
                var cpCounter = TDev.RT.Perf.start("constantpropagation");
                var cp = new ConstantPropagation();
                cp.visitApp(a);
                constantPropagationTime = TDev.RT.Perf.stop(cpCounter);
                try {
                } catch (err) {
                    Util.reportError('ConstantPropagation failed', err, false);
                    constantPropagationTime = -1;
                    options.constantPropagation = false;
                }
            }
            var opts = Util.flatClone(options);
            opts.isTopLevel = true;

            if (options.debugging) cs.initBreakpoints = (initialBreakpoints || Hashtable.forStrings());

            var beCounter = TDev.RT.Perf.start("backend");
            Compiler.compileCore(a, cs, opts);
            compileTime = TDev.RT.Perf.stop(beCounter);

            // Output optimization statistics
            if (options.inlining) {
                Util.log(Util.fmt("Inliner: {0} inlined call(s), {1} inlined action(s)",
                    cs.optStatistics.inlinedCalls, cs.optStatistics.inlinedFunctions));
            }
            if (options.okElimination) {
                Util.log(Util.fmt("Ok elimination: {0} check(s) eliminated (estimated)", cs.optStatistics.eliminatedOks));
            }
            if (options.commonSubexprElim) {
                Util.log(Util.fmt("CSE: {0} term(s) reused (estimated)", cs.optStatistics.termsReused));
            }
            if (options.constantPropagation) {
                Util.log(Util.fmt("CP: {0} constant(s) propagated (estimated)", cs.optStatistics.constantsPropagated));
            }

            cs.optStatistics.reachingDefsTime = reachingDefsTime;
            cs.optStatistics.usedAnalysisTime = usedAnalysisTime;
            cs.optStatistics.inlineAnalysisTime = inlineAnalysisTime;
            cs.optStatistics.availableExpressionsTime = availableExpressionsTime;
            cs.optStatistics.constantPropagationTime = constantPropagationTime;
            cs.optStatistics.compileTime = compileTime;

            return cs;
        }

        private compileLibs(a:App)
        {
            if (this.globalError) {
                this.wr("cs.libBindings = {};\n");
                return;
            }

            this.wr("(function () {\n");
            this.wr("  var lib, bnd, resolve;\n");
            this.wr("  var bnds = cs.libBindings = {};\n");
            a.librariesAndThis().forEach((l:LibraryRef) => {

                var ln = this.stringLiteral(l.getStableName());
                this.wr("  lib = libs[" + ln + "] = {};\n");
                this.wr("  bnd = bnds[" + ln + "] = " + (l.getStableName() == "this" ? "libs" : "{}") + ";\n");
                this.wr("  bnd.mkLambdaProxy = cs.mkLambdaProxy(bnd, " + ln + ");\n");
                if (this.options.scriptId) {
                    var libid = l.isThis() ? this.options.scriptId : l.pubid ? l.pubid : l.guid
                    if (l.resolved)
                        this.wr("  bnd.scriptName = " + this.stringLiteral(l.resolved.getName() + " (" + libid + ")") + ";\n");
                    this.wr("  bnd.scriptId = " + this.stringLiteral(libid) + ";\n");
                    this.wr("  bnd.topScriptId = " + this.stringLiteral(this.options.scriptId) + ";\n");
                }
                //if (this.options.packaging && l.isCloud()) return
                l.getPublicActions().forEach((act:Action) => {
                    if (!this.shouldCompile(act)) return
                    var an = this.stringLiteral(act.getName());
                    this.wr("    lib[" + an + "] = cs.mkLibProxyFactory(bnd, " + ln + ", " + an + ");\n");
                });
            });
            a.libraries().forEach((l:LibraryRef) => {
                //if (this.options.packaging && l.isCloud()) return

                var ln = this.stringLiteral(l.getStableName());
                this.wr("  bnd = bnds[" + ln + "];\n");
                this.wr("  bnd[\"this$lib\"] = " + ln + ";\n")
                l.resolveClauses.forEach((r:ResolveClause) => {
                    var rn = this.stringLiteral(r.formalLib.getStableName());
                    this.wr("    resolve = bnd[" + rn + "] = {};\n");
                    this.wr("    bnd[" + rn + " + \"$lib\"] = " + this.stringLiteral(r.defaultLib.getStableName()) + ";\n");
                    r.actionBindings.forEach((ab:ActionBinding) => {
                        var fn = this.stringLiteral(ab.actualLib.getStableName())
                        var act = "libs[" + fn + "][" + this.stringLiteral(ab.actual.getName()) + "]";
                        this.wr("      resolve[" + this.stringLiteral(ab.formalName) + "] = " + act + ";\n");
                    });
                });
            });
            this.wr("}());\n");
        }

        public visitApp(a:App)
        {
            this.stmtIds = StmtIdCollector.collect(a);

            this.initGlobals = "";
            this.initGlobals2 = "";
            this.currentApp = a;
            this.needsScriptText = false;
            var err = this.currentApp.getGlobalErrorDecl(!this.options.isTopLevel);
            if (err) {
                this.globalError = Util.fmt("'{0}' (in '{1}') has errors; the script will not run", err.getName(), this.currentApp.getName());
                this.globalErrorId = err.getStableName();
            } else {
                this.globalError = null;
                this.globalErrorId = null;
            }
            this.runmap_variables.clear();
            this.wr("(function (cs) {\n");
            this.wr("'use strict';\n");
            this.wr("var libs = cs.libs = {};\n");
            this.wr("var lib = TDev.RT;\n");
            this.wr("var callstackcurdepth = 0;\n");
            if (this.needsProfiling()) {
                this.wr("var profilingScriptStart = Date.now();\n");
            }
            if (this.debugBuild()) {
                this.wr("cs.breakpointBindings = {};\n");
                this.stmtIds.forEach(v => {
                    var varname = "bp$" + v.replace(/\./g, "_");
                    this.wr("var " + varname + " = !!cs.initBreakpoints.get(" + this.stringLiteral(v) +");\n");
                    this.wr("cs.breakpointBindings[" + this.stringLiteral(v) + "] = { setter : function(smth) { " + varname + " = smth; }, getter: function () { return " + varname + "; } };\n");
                });
            }

            this.wr("cs.scriptTitle = " + this.stringLiteral(a.getName()) + ";\n");
            this.wr("cs.scriptColor = " + this.stringLiteral(a.htmlColor()) + ";\n");
            this.wr("cs.objectSingletons = {};\n")
            if (a.showAd)
                this.wr("cs.showAd = true;\n");
            a.things.forEach((t) => this.dispatch(t));
            if (this.options.isTopLevel) this.compileLibs(a);
            this.wr("cs.startFn = function(rt) {\n" + api.rt_start + "};\n\n");
            this.wr("cs.stopFn = function(rt) {\n" + api.rt_stop + "};\n\n");

            if (this.instrumentForCoverage()) {
                this.wr("cs.extractRunMap = function(rt) {\n");
                this.runmap_variables.forEach((v) => this.wr("    if(" + v[1] + ") rt.beenHere(" + this.stringLiteral(v[0]) + ");\n"))
                this.wr("};\n\n");
            }

            if (!this.options.cloud && this.options.isTopLevel) {
                this.cordovaPlugins = TypeChecker.combineCordovaPlugins(a);
            }

            if (this.options.cloud && this.options.isTopLevel) {
                this.pipPackages = TypeChecker.combinePipPackages(a);

                if (a.usesCloudLibs() && !a.isCloud)
                    this.wr("cs.autoRouting = true;\n")

                this.wr("cs.setupRestRoutes = function(rt) {\n")
                var host = /^https?:\/\/(.+?)\/?$/i.exec(this.options.azureSite)[1];
                a.librariesAndThis()
                    .stableSorted((l1, l2) => l1.getStableName().localeCompare(l2.getStableName()))
                    .forEach(l => {
                    if (!l.isCloud()) return
                    l.getPublicActions().stableSorted((a1, a2) => a1.getName().localeCompare(a2.getName())).forEach(a => {
                        var ref = "libs[" + this.stringLiteral(l.getStableName()) + "][" + this.stringLiteral(a.getName()) + "]"

                        if (a.getName() == "_init") {
                            this.wr("  rt.addRestInit(" + ref + ");\n")
                        } else {
                            var name = (l.isThis() || l.getName() == "*") ? "" : l.getName() + "/"
                            if (a.getName() != "*")
                                name += a.getName()
                            name = name.replace(/\/+$/, "")
                            this.wr("  rt.addRestRoute(" + this.stringLiteral(name) + ", " + ref + ");\n")
                        }

                        if (l.isThis() && a.getName() == "main")
                            this.wr("  rt.setMainAction(" + ref + ");\n")
                    })
                })
                this.wr("  rt.nodeModules = {};\n")
                var imports = TypeChecker.combineNpmModules(a)
                var deps = this.npmModules
                Object.keys(imports).forEach(k => {
                    if (imports[k] == "error") {
                        this.wr("  TDev.Util.syntaxError(" + this.stringLiteral("node.js module version conflict on " + k) + ");\n");
                    } else {
                        this.wr("  rt.nodeModules." + Api.runtimeName(k) + " = require(" + this.stringLiteral(k) + ");\n")
                        var v = imports[k]
                        if (v)
                            deps[k] = v
                    }
                })
                this.wr("}\n\n")
            }

            this.wr("cs._compilerVersion = '" + Compiler.version + "';\n");
            this.wr("cs._initGlobals = function(d,rt) {\n" + this.initGlobals + "\n");
            this.initPersistentVars(true);
            this.initPersistentVars(false);
            this.wr("};\n\n");
            this.wr("cs._initGlobals2 = function(d) {\n" + this.initGlobals2 + "};\n\n");
            this.wr("cs._resetGlobals = function(d) {\n" + this.resetGlobals + "};\n\n");
            this.wr("cs._importJson = function(d,ctx,json) {\n" + this.cloudstateJsonImport + "};\n\n");
            this.wr("cs._exportJson = function(d,ctx) {\n"
                + "  var json = {};\n"
                + this.cloudstateJsonExport
                + "  return json;\n};\n\n");

            if (this.needsProfiling()) {  // emit global profiling vars collected during parsing [CCC]
                for (var blockId in this.profilingBlocks) {
                    this.wr("var profilingExecutions" + blockId + " = 1;\n");
                    this.wr("var profilingExecutionsNext" + blockId + " = 1;\n");
                    this.wr("var profilingExecutionsNextCount" + blockId + " = 1;\n");
                    var stmtIds = this.profilingBlocks[blockId];
                    for (var i = 0; i < stmtIds.length; i++) {  // create global vars to store durations per-callsite
                        this.wr("var profilingDuration" + stmtIds[i] + " = 0;\n");
                        this.wr("var profilingDurationSamples" + stmtIds[i] + " = 0;\n");
                    }
                }
                this.wr("\n");

                this.wr("var tmp = 0;\n\n");
                this.wr("var perfNow = TDev.Util.perfNow;\n\n");

                this.wr("cs._getProfilingResults = function() {\n");
                this.wr("  var profilingDataCollection = {\n");  // editor retrieves this object after script execution
                this.wr("    unitduration: " + localStorage["perfunit"] +",\n");
                this.wr("    compilerversion: '" + Compiler.version + "',\n");
                this.wr("    astnodes: {},\n");
                this.wr("    show: " + this.options.showProfiling + "\n");
                this.wr("  };\n");
                this.wr("  var astnodes = profilingDataCollection.astnodes;\n");
                this.wr("  astnodes[''] = {count: 1, duration: (Date.now() - profilingScriptStart)};\n");
                this.wr("  var hits;\n");

                for (var blockId in this.profilingBlocks) {  // store global vars in return object
                    var stmtIds = this.profilingBlocks[blockId];
                    for (var i = 0; i < stmtIds.length; i++) {
                        var stmtId = stmtIds[i];
                        var duration = "profilingDuration" + stmtId;
                        var samples = "profilingDurationSamples" + stmtId;
                        this.wr("  hits = profilingExecutionsNextCount" + blockId + "-" + "profilingExecutions" + blockId + ";\n");  // shared by all stmtExprHolder nested directly under same block
                        // we assume that these n samples were representative of all executions :-)
                        var d = "Math.ceil(" + duration + "/" + samples + "*hits)";
                        this.wr("  if (hits) astnodes['" + stmtId + "'] = {count: hits, duration: " + d + "};\n");
                    }
                }
                if (this.needsProfilingDebug())
                    this.wr("  alert(JSON.stringify(profilingDataCollection));\n");
                this.wr("  return profilingDataCollection;\n");
                this.wr("};\n\n");
            }
            if (this.options.showCoverage)
                this.wr("cs._showCoverage = true;\n");


            var main = a.mainAction();
            if (main)
                this.wr("cs.mainActionName = " + this.stringLiteral(main.getName()) + ";\n");
            if (this.options.authorId)
                this.wr("cs.authorId = " + this.stringLiteral(this.options.authorId) + ";\n");
            if (this.options.scriptId && !/-/.test(this.options.scriptId))
                this.wr("cs.scriptId = " + this.stringLiteral(this.options.scriptId) + ";\n");
            if (this.options.scriptGuid)
                this.wr("cs.scriptGuid = " + this.stringLiteral(this.options.scriptGuid) + ";\n");
            if (this.options.baseScriptId && !/-/.test(this.options.baseScriptId))
                this.wr("cs.baseScriptId = " + this.stringLiteral(this.options.baseScriptId) + ";\n");
            if (this.options.hasCloudData)
                this.wr("cs.hasCloudData = 1;\n");
            if (this.options.hasPartialData)
                this.wr("cs.hasPartialData = 1;\n");
            if (this.options.azureSite)
                this.wr("cs.azureSite = " + this.stringLiteral(this.options.azureSite) + ";\n");
            if (this.options.hasLocalData)
                this.wr("cs.hasLocalData = 1;\n");
            if (this.options.hostCloudData)
                this.wr("cs.hostCloudData = 1;\n");
            if (this.needsScriptText)
                this.wr("var scriptText = " + this.stringLiteral(a.serialize()) + ";\n");
            if (this.options.isTopLevel && this.options.usedProperties.hasOwnProperty("appreflect"))
                this.wr("cs.reflectionInfo = { actions: " + JSON.stringify(Json.reflectionInfo(a)) + " };\n");
            if (this.options.packaging && this.options.artResolver) {
                if (a.iconArtId)
                    this.packageResources.push({
                        kind: 'art',
                        id: "scripticon",
                        url: this.options.artResolver(a.iconArtId),
                        packageUrl: null,
                        sourceName: "icon",
                        usageLevel: 1,
                        type: "picture"
                    });
                if (a.splashArtId)
                    this.packageResources.push({
                        kind: 'art',
                        id: "scriptsplash",
                        url: this.options.artResolver(a.splashArtId),
                        packageUrl: null,
                        sourceName: "splash",
                        usageLevel: 1,
                        type: "picture"
                    });
            }
            this.runmap_variables.forEach((v) => this.wr("var " + v[1] + ";\n"));
            this.wr("})");
        }

        private synthesizeOutput(params:ActionParameter[])
        {
            var pickerIf = this.allocateIf();

            pickerIf.condition = this.term("s.previous.needsPicker");
            params = params.slice(0);
            var cloud = this.options.rest || this.options.cloud
            if (!cloud)
                params.reverse();
            pickerIf.thenBody = params.map((p) =>
                JsCall.direct((cloud ? "s.response.addRestResult" : "s.rt.displayResult"),
                              [new JsLiteral(this.stringLiteral(p.getName())), this.localVarRef(p.local)]));
            pickerIf.elseBody = [];

            return pickerIf;
        }

        private synthesizePicker(params:ActionParameter[])
        {
            var pickerIf = this.allocateIf();

            pickerIf.condition = this.term("s.previous.needsPicker");
            pickerIf.elseBody = [];

            var l = this.allocateLabel();
            var r = new JsLabelRef(l);
            var str = (s:string) => new JsLiteral(this.stringLiteral(s));

            if (this.options.rest || this.options.cloud) {
                pickerIf.thenBody =
                params.map((p) => {
                    var kind = p.getKind();
                        var v = JsCall.direct("s.rt.getRestArgument", [str(p.getName()), (kind instanceof RecordEntryKind) ? str((<RecordEntryKind>kind).record.getStableName()) : str(p.getKind().toString()), this.term("s")])

                    return this.localVarRef(p.local).gets(v);
                });
                pickerIf.thenBody.push(
                    this.term("s.response").gets(this.term("s.rt.getRestRequest().response()")))
            } else {
                var args:JsExpr[] =
                    params.map((p) =>
                        !p.getKind().picker ? this.term("undefined") :
                        JsCall.direct("lib.RTValue.mkPicker",
                                        <JsExpr[]>[  this.term(p.getKind().picker),
                                                     this.term(this.defaultValue(p.getKind(), true)),
                                                     str(p.getName()),
                                                     str(this.localVarName(p.local))]));
                args.unshift(r);
                pickerIf.thenBody = [new JsExprStmt(JsCall.direct("s.rt.pickParameters", args)), new JsGoto(r, false), l];
            }

            return pickerIf;
        }

    }

    class UsageComputer
        extends NodeVisitor
    {
        public visitApp(a:App)
        {
            a.variablesAndResources().forEach(v => v.usageLevel = 0)
            super.visitChildren(a)
        }

        public visitDecl(d:Decl) { super.visitChildren(d); }
        public visitStmt(s:Stmt) { super.visitChildren(s); }
        public visitExprHolder(eh:ExprHolder) { if (eh.parsed) this.dispatch(eh.parsed) }

        private doCall(c:Call, outerFlags:PropertyFlags)
        {
            var p = c.getCalledProperty()
            if (p && p.forwardsTo() instanceof GlobalDef) {
                var gd = <GlobalDef>p.forwardsTo()
                var lev = (outerFlags & PropertyFlags.NoCanvas) ? 1 : 2;
                if (gd.usageLevel < lev)
                    gd.usageLevel = lev
            }

            var flags = p ? p.getFlags() : PropertyFlags.None
            var a = c.args
            for (var i = 0; i < a.length; ++i) {
                if (a[i] instanceof Call)
                    this.doCall(<Call>a[i], flags)
                else
                    this.dispatch(a[i])
            }
        }


        public visitCall(c:Call)
        {
            this.doCall(c, PropertyFlags.None)
        }

    }

    class PreCompiler
        extends DeepVisitor
    {
        constructor(public options:CompilerOptions)
        {
            super()
            this.options.usedProperties = {}
        }

        useKind(k:Kind)
        {
            var r = k.getRecord()
            if (r) this.runOnDecl(r)
        }

        useBuiltinProperty(p:IProperty)
        {
            this.options.usedProperties[p.usageKey().toLowerCase()] = true
        }

        secondaryRun(app: App)
        {
            app.libraries().forEach(l => {
                if (l.isTutorial()) {
                    l.getPublicActions().forEach(a => this.runOnDecl(a))
                }
            })
        }
    }
}
