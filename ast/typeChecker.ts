///<reference path='refs.ts'/>

// TODO events and async

// Next available error: TD214:

module TDev.AST
{
    export class TypeResolver
        extends NodeVisitor
    {
        constructor(public parent:TypeChecker)
        {
            super()
        }

        private fixupKind(n:AstNode, k:Kind)
        {
            if (k instanceof UnresolvedKind && this.parent.topApp) {
                var k0 = this.parent.topApp.getDefinedKinds().filter(n => n.getName() == k.getName())[0]
                if (k0) k = k0
            }

            if (k.getRoot() != k) {
                var pk = <ParametricKind>k
                var parms = pk.parameters.map(kk => this.fixupKind(n, kk))
                if (parms.some((kk, i) => pk.parameters[i] != kk)) {
                    k = pk.createInstance(parms)
                }
            }

            if (k.isError()) {
                if (k instanceof LibraryRefAbstractKind || k.getRecord() instanceof LibraryRecordDef) {
                    if (k.parentLibrary().hasAbstractKind(k.getName())) {
                        k = k.parentLibrary().getAbstractKind(k.getName())
                    }
                }
            }

            if (k.isError()) {
                this.parent.errorCount++;
                n.setError(lf("TD121: cannot find type {0}", k.toString()));
            }
            return k;
        }

        visitGlobalDef(node:GlobalDef)
        {
            node._kind = this.fixupKind(node, node.getKind());
        }

        visitAction(node:Action)
        {
            var fixupLocal = (a:ActionParameter) => {
                var l = a.local;
                l._kind = this.fixupKind(node, l.getKind());
            }
            if (node.modelParameter)
                fixupLocal(node.modelParameter);
            node.getInParameters().forEach(fixupLocal);
            node.getOutParameters().forEach(fixupLocal);
        }

        visitBlock(b:Block)
        {
            this.visitChildren(b);
        }

        visitRecordDef(r:RecordDef)
        {
            this.visitChildren(r);
        }

        visitRecordField(node:RecordField)
        {
            node.setKind(this.fixupKind(node, node.dataKind))
        }

        visitApp(a:App)
        {
            this.visitChildren(a);
        }
    }

    export enum ActionSection {
        Normal,
        Init,
        Display,
        Lambda,
    }

    export interface InlineError
    {
        scope:string;
        message:string;
        line:string;
        lineNo:number;
        coremsg:string;
        hints:string;
    }

    export class TypeChecker
        extends NodeVisitor
    {
        private typeResolver:TypeResolver;
        private isTopExpr = false;

        static lastStoreLocalsAt:ExprHolder;
        static lintThumb : (a:Action, asm:string) => InlineError[];

        constructor() {
            super()
            this.typeResolver = new TypeResolver(this);
        }
        static tcAction(a:Action, first:boolean, storeAt:ExprHolder = null)
        {
            var ctx = new TypeChecker();
            ctx.topApp = Script;
            ctx.storeLocalsAt = storeAt;
            TypeChecker.lastStoreLocalsAt = storeAt;
            if (first) {
                TypeChecker.iterTokenUsage((t:TokenUsage) => { t.localCount = 0 });
                ctx.countToUpdate = 1;
            }
            ctx.dispatch(a);
        }

        static tcFragment(e: ExprHolder)
        {
            var ctx = new TypeChecker();
            ctx.topApp = Script;
            ctx.storeLocalsAt = e;
            TypeChecker.lastStoreLocalsAt = e;

            var es = mkExprStmt(e);
            ctx.dispatch(es);
        }

        static tcScript(a:App, ignoreLibErrors = false, isTop = false, depth = 0) : number
        {
            var ctx = new TypeChecker();
            ctx.topApp = a;
            a.imports = new AppImports();
            var prev = Script;
            ctx.storeLocalsAt = TypeChecker.lastStoreLocalsAt;
            ctx.ignoreLibErrors = ignoreLibErrors;
            try {
                setGlobalScript(a);
                ctx.typecheckLibraries(a);
                // this may be too often
                a.libNamespaceCache.recompute();
                ctx.typeResolver.dispatch(a);

                if (isTop) {
                    TypeChecker.iterTokenUsage((t:TokenUsage) => { t.globalCount = 0 });
                    ctx.countToUpdate = 2;
                }

                ctx.dispatch(a);
                a.addFeatures(LanguageFeature.Refs); // refs is fixed after one round
                if (ctx.numFixes > 0 && depth < 5) {
                    // retry
                    return TypeChecker.tcScript(a, ignoreLibErrors, isTop, depth + 1);
                }
                a.addFeatures(LanguageFeature.Current);

                a.things.forEach((t) => {
                    if (ignoreLibErrors && t instanceof LibraryRef) {
                        (<LibraryRef>t)._hasErrors = false
                        return;
                    }
                    if (t.hasErrors()) ctx.errorCount++;
                });


                return ctx.errorCount;
            } finally {
                setGlobalScript(prev); // rebinds "data", "code" etc.
            }
        }

        static tcApp(a:App) : number
        {
            return TypeChecker.tcScript(a, false, true);
        }

        static iterTokenUsage(f:(t:TokenUsage)=>void)
        {
            TDev.api.getKinds().forEach((k:Kind) => {
                if (!!k.singleton) {
                    f(k.singleton.usage);
                }
                k.listProperties().forEach((p:IProperty) => {
                    f(p.getUsage());
                });
            });

            TDev.api.getKind("code").singleton.usage.apiFreq = TDev.Script.actions().length > 0 ? 1.0 : 0.0;
            TDev.api.getKind("data").singleton.usage.apiFreq =  TDev.Script.variables().length > 0 ? 0.9 : 0.0;
            TDev.api.getKind("art").singleton.usage.apiFreq =  TDev.Script.resources().length > 0 ? 0.8 : 0.0;

            api.core.allStmtUsage().forEach(f);
        }

        static resolveKind(k:Kind)
        {
            var ctx = new TypeChecker();
            ctx.topApp = Script;
            var a = new GlobalDef()
            a._kind = k
            ctx.typeResolver.dispatch(a);
            return a._kind
        }

        public topApp:App;
        private currentAction:Action;
        private currentAnyAction:Stmt;
        private seenAwait = false;
        private numFixes = 0;
        private nothingLocals:LocalDef[] = [];
        private localScopes: LocalDef[][] = [[]];
        private readOnlyLocals:LocalDef[] = [];
        private outsideScopeLocals:LocalDef[] = [];
        private invisibleLocals:LocalDef[] = [];
        private writtenLocals:LocalDef[] = [];
        private readLocals:LocalDef[] = [];
        private currLoop:Stmt;

        private inAtomic = false;
        private inShim = false;
        private actionSection = ActionSection.Normal;
        private pageInit:Block;
        private pageDisplay:Block;
        private saveFixes = 0;
        private outLocals:LocalDef[] = [];
        private reportedUnassigned = false;

        private allLocals :LocalDef[] = [];
        private recentErrors: string[] = [];
        private lastStmt:Stmt;
        public errorCount = 0;
        public countToUpdate = 0;
        private timestamp = 1;
        private seenCurrent = false;
        private missingLocals:LocalDef[] = [];
        private errorLevel = 0;
        private hintsToFlush:string[] = [];
        private topInline:InlineActions;
        public storeLocalsAt:ExprHolder = null;
        public ignoreLibErrors = false;
        private typeHint:Kind;

        // TSBUG should be private
        public markError(expr:Token, msg:string)
        {
            if (!!expr.getError()) return;
            if (this.errorLevel > 0) return;
            expr.setError(msg);
            this.recentErrors.push(msg);
            this.errorCount++;

            var loc = (<Expr>expr).loc;
            if (loc) {
                var i = loc.beg;
                var e = i + loc.len;
                while (i < e) {
                    var t = loc.tokens[i]
                    if (!t.getError()) t.setError(msg);
                    i++;
                }
            }
        }

        private markHolderError(eh:ExprHolder, msg:string)
        {
            if (!!eh.getError()) return;
            if (!msg) return;
            if (this.errorLevel > 0) return;
            this.errorCount++;
            eh.setError(msg);
        }

        private setNodeError(n:AstNode, msg:string)
        {
            if (this.errorLevel == 0) {
                this.errorCount++;
                n.setError(msg)
            }
        }

        private typeCheck(expr:Stmt)
        {
            expr.clearError();
            expr._kind = null;
            this.dispatch(expr);
        }

        private snapshotLocals()
        {
            var locs = [];
            this.localScopes.forEach((l) => { locs.pushRange(l); });
            return locs;
        }

        public tcTokens(toks:Token[])
        {
            var e = new ExprHolder();
            e.tokens = toks
            this.expect(e, null, "void");
        }

        private expectsMessage(whoExpects:string, tp:string)
        {
            switch (whoExpects) {
                case "if": return lf("TD118: 'if' condition wants {1:a}", whoExpects, tp);
                case "where": return lf("TD128: 'where' condition wants {1:a}", whoExpects, tp);
                case "while": return lf("TD129: 'while' condition wants {1:a}", whoExpects, tp);
                case "for": return lf("TD130: bound of 'for' wants {1:a}", whoExpects, tp);
                case "optional": return lf("TD186: this optional parameter wants {1:a}", whoExpects, tp);
                case "return": return lf("TD204: 'return' value wants {1:a}", whoExpects, tp);
                default: Util.die()
            }
        }

        private expect(expr:ExprHolder, tp:Kind, whoExpects:string)
        {
            this.hintsToFlush = [];

            if (expr.tokens.length == 1) {
                if (expr.isPlaceholder()) expr.tokens = [];
            }

            if (this.topApp.featureMissing(LanguageFeature.AllAsync) &&
                expr.tokens.some(t => t.getOperator() == 'await'))
            {
                expr.tokens = expr.tokens.filter(t => t.getOperator() != 'await')
                this.numFixes++;
            }

            expr.clearError();

            expr.tokens.forEach((t, i) => {
                if (!(t instanceof ThingRef)) return
                var tt = <ThingRef>t
                if (tt.forceLocal) return
                if (!(expr.tokens[i + 1] instanceof PropertyRef)) return
                var pp = <PropertyRef>expr.tokens[i + 1]
                var key = tt.data + "->" + pp.data
                if (AST.crossKindRenames.hasOwnProperty(key)) {
                    var m = /(.*)->(.*)/.exec(AST.crossKindRenames[key])
                    tt.data = m[1]
                    pp.data = m[2]
                }
            })

            var parsed = ExprParser.parse1(expr.tokens);
            parsed.clearError();
            parsed._kind = null;
            expr.parsed = parsed;
            this.seenAwait = false;
            this.recentErrors = [];
            var parseErr:Token = expr.tokens.filter((n:Token) => n.getError() != null)[0];

            var prevLocals = this.allLocals.length;

            this.saveFixes = expr == this.storeLocalsAt ? 1 : 0;

            if (!parseErr) {
                this.isTopExpr = (whoExpects == "void");
                this.dispatch(parsed);
                expr.hasFix = this.saveFixes > 1
            } else {
                expr.hasFix = true
                if (this.errorLevel == 0)
                    this.errorCount++;

                this.errorLevel++;
                this.dispatch(parsed);
                this.errorLevel--;
            }

            this.saveFixes = 0

            expr._kind = expr.parsed.getKind();

            var seenAssign = false;
            var prevTok = null
            var tokErr:Token = null

            expr.tokens.forEach((t) => {
                if (t instanceof PropertyRef) {
                    var p = <PropertyRef>t;
                    if (!p.prop)
                        p.prop = p.getOrMakeProp();
                    if (prevTok && prevTok.getThing() instanceof LocalDef && prevTok.getThing().getName() == modelSymbol &&
                        AST.mkFakeCall(p).referencedRecordField())
                        p.skipArrow = true;
                    else if (p.skipArrow)
                        p.skipArrow = false;
                } else if (t instanceof ThingRef) {
                    var tt = <ThingRef>t;
                    if (tt._lastTypechecker != this)
                        this.dispatch(tt);
                } else if (t.getOperator() == ":=") {
                    seenAssign = true;
                }
                else if (t instanceof Literal) {
                    if (!t._kind) {
                        this.dispatch(t);
                    }
                }
                prevTok = t

                if (!tokErr && t.getError() != null)
                    tokErr = t
            })

            if (whoExpects == "void") {
                if (seenAssign && (this.allLocals.length == prevLocals || 
                                   !this.allLocals.slice(prevLocals).some(l => l.isRegular)))
                    seenAssign = false;
                expr.looksLikeVarDef = seenAssign;
            }

            var errNode:AstNode = parseErr || tokErr || expr.parsed;

            this.markHolderError(expr, errNode.getError());
            this.markHolderError(expr, this.recentErrors[0]);

            expr.isAwait = this.seenAwait;

            if (expr == this.storeLocalsAt) {
                this.seenCurrent = true;
                expr.locals = this.snapshotLocals();
            } else {
                expr.locals = null;
            }

            if (!Util.check(expr.getKind() != null, "expr type unset")) {
                expr._kind = api.core.Unknown
            }

            if (!expr.getError() && tp != null && !expr.getKind().equals(tp)) {
                var msg = this.expectsMessage(whoExpects, tp.toString())
                if (expr.getKind() != this.core.Unknown)
                    msg += lf(", got {0:a} instead", expr.getKind().toString())
                this.markHolderError(expr, msg);
            }

            if (!expr.getError() && parsed instanceof AST.Call) {
                var call = <AST.Call> parsed;
                if (tp == null && whoExpects == "void") {
                    var par = call.prop().parentKind
                    var act = call.anyCalledAction()
                    if (AST.legacyMode &&
                        par == this.core.Number &&
                        call.prop().getName() == "=")
                        expr.hint = lf("the '=' comparison has no effect here; did you mean assignment ':=' instead?");
                    else if (expr.getKind() != this.core.Nothing && expr.getKind() != this.core.Unknown && expr.getKind().getRoot() != this.core.Task)
                           //  call.calledAction() == null)
                            // (par == core.Number || call.args.length == 0))
                    {
                        var exception = !!(call.prop().getFlags() & PropertyFlags.IgnoreReturnValue);
                        var k = expr.getKind()
                        var msg = ""

                        if (k.hasContext(KindContext.Parameter))
                            msg = lf("did you want to use this value?");
                        else
                            msg = lf("now you can select a property on it");

                        if (call.prop() instanceof LibraryRef)
                            expr.hint =
                                lf("we have a library '{0}' here; {1}", call.prop().getName(), msg)
                        else if ((par.isBuiltin || call.args.length == 1) && !exception)
                            expr.hint =
                                lf("'{0}' returns a '{1}'; {2}",
                                         call.prop().getName(), call.getKind(), msg)
                        else if (!exception) {
                            /*
                            switch (expr.getKind().getName()) {
                                case "Board":
                                case "Sprite Set":
                                case "Sprite":
                                case "Json Object":
                                case "Xml Object":
                                case "Json Builder":
                                case "Form Builder":
                                case "Web Request":
                                case "Web Response":
                                case "OAuth Response":
                                    msgIt = storeIt; break;
                            }
                            */
                            expr.hint =
                                lf("'{0}' returns a '{1}'; {2}",
                                         call.prop().getName(), call.getKind(), msg)
                        }
                    }
                    else if (act && act.getOutParameters().length > 0)
                        expr.hint =
                            lf("'{0}' returns {1} values; you can use 'store in var' button to save them to locals",
                                     call.prop().getName(), act.getOutParameters().length)
                }
            } else if (tp == null && whoExpects == "void") {
                var k = expr.getKind();
                if (k != this.core.Nothing && k != this.core.Unknown) {
                    if (k.singleton)
                        expr.hint =
                            lf("now you can select a property of {0}; it doesn't do anything by itself", k)
                    else
                        expr.hint =
                            lf("we have {0:a} here; did you want to do something with it?", k)
                }
            }

            if (this.hintsToFlush.length > 0) {
                var hh = this.hintsToFlush.join("\n")
                if (expr.hint) expr.hint += "\n" + hh
                else expr.hint = hh
                this.hintsToFlush = [];
            }

            if (expr.assignmentInfo() && expr.assignmentInfo().fixContextError && expr.tokens[1].getOperator() == ":=") {
                this.numFixes++;
                this.nothingLocals.push(<LocalDef>expr.tokens[0].getThing());
                expr.tokens.splice(0, 2);
            }
            if (this.nothingLocals.length > 0 && expr.tokens.length == 1 &&
                this.nothingLocals.indexOf(<LocalDef>expr.tokens[0].getThing()) >= 0) {
                expr.tokens = []
                this.numFixes++;
            }
            if (this.topApp.featureMissing(LanguageFeature.Refs) &&
                expr.tokens.some(t => !!t.tokenFix))
            {
                var t0 = expr.tokens.filter(t => t.tokenFix == ":=")[0]
                if (t0) {
                    var idx = expr.tokens.indexOf(t0)
                    if (expr.tokens[idx + 1] && expr.tokens[idx + 1].getOperator() == "(") {
                        expr.tokens[idx] = mkOp(":=");
                        expr.tokens.splice(idx + 1, 1)
                        if (expr.tokens.peek().getOperator() == ")")
                            expr.tokens.pop()
                    }
                }

                expr.tokens = expr.tokens.filter(t => t.tokenFix != "delete")
                this.numFixes++;
            }
        }

        private declareLocal(v:LocalDef)
        {
            this.localScopes.peek().push(v);
            this.allLocals.push(v);
            v._isByRef = false;
            v.lastUsedAt = this.timestamp++;
            this.recordLocalRead(v);
        }

        private lookupSymbol(t:ThingRef) : AST.Decl
        {
            var n = t.data;
            for (var i = this.localScopes.length - 1; i >= 0; i--) {
                var s = this.localScopes[i];
                for (var j = s.length - 1; j >= 0; j--)
                    if (s[j].getName() === n)
                        return s[j];
            }

            if (n == "...") n = "$skip";

            if (t.forceLocal) return undefined;

            return TDev.api.getThing(n);
        }

        private scope(f : () => any)
        {
            this.localScopes.push(<LocalDef[]>[]); // STRBUG: this cast shouldn't be needed
            var r = f();
            this.localScopes.pop();
            return r;
        }

        private conditionalScope(f: () => any)
        {
            var prevWritten = this.writtenLocals.slice(0);
            var prevLoop = this.currLoop
            try {
                return this.scope(f);
            } finally {
                this.writtenLocals = prevWritten;
                this.currLoop = prevLoop
            }
        }

        private core = TDev.api.core;


        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Visitors
        ///////////////////////////////////////////////////////////////////////////////////////////////

        public visitAstNode(node:AstNode)
        {
            Util.oops("typechecking " + node.nodeType() + " not implemented!");
        }

        public visitAnyIf(node:If)
        {
            this.updateStmtUsage(node);
            this.expect(node.rawCondition, this.core.Boolean, "if");

            var isComment = node.isTopCommentedOut()

            if (isComment) {
                var vis = new ClearErrors()
                vis.dispatch(node.rawThenBody)
            }

            var prevWritten = this.writtenLocals.slice(0);

            if (node.rawThenBody == this.pageInit)
                this.actionSection = ActionSection.Init;
            else if (node.rawThenBody == this.pageDisplay)
                this.actionSection = ActionSection.Display;

            if (isComment)
                this.errorLevel++

            this.typeCheck(node.rawThenBody);
            node.rawThenBody.newlyWrittenLocals = this.writtenLocals.slice(prevWritten.length);

            if (node.rawElseBody.stmts.length == 1 &&
                node.rawElseBody.stmts[0] instanceof If) {
                var ei = <If>node.rawElseBody.stmts[0]
                ei.isElseIf = true;
                node.setElse(Parser.emptyBlock())
                var bl = node.parentBlock()
                var idx = bl.stmts.indexOf(node)
                bl.stmts.splice(idx + 1, 0, ei)
                bl.newChild(ei)
            }

            if (node.rawElseBody.isBlockPlaceholder()) {
                node.rawElseBody.newlyWrittenLocals = [];
                this.typeCheck(node.rawElseBody);
            } else {
                this.writtenLocals = prevWritten.slice(0);
                this.typeCheck(node.rawElseBody);
                node.rawElseBody.newlyWrittenLocals = this.writtenLocals.slice(prevWritten.length);
            }

            if (isComment)
                this.errorLevel--

            this.writtenLocals = prevWritten;
        }

        public visitWhere(node:Where)
        {
            this.expect(node.condition, this.core.Boolean, 'where');
        }

        public visitWhile(node:While)
        {
            this.updateStmtUsage(node);
            this.expect(node.condition, this.core.Boolean, 'while');
            this.conditionalScope(() => {
                this.currLoop = node;
                this.typeCheck(node.body);
            });
        }

        public visitBreakContinue(node:Call, tp:string)
        {
            node._kind = this.core.Nothing;
            node.topAffectedStmt = this.currLoop
            if (!this.currLoop)
                this.markError(node, lf("TD200: '{0}' can be only used inside a loop", tp))
            if (!node.args[0].isPlaceholder())
                this.markError(node, lf("TD205: '{0}' cannot take arguments", tp))
            this.expectExpr(node.args[0], null, tp)
        }
        
        public visitBreak(node:Call) { this.visitBreakContinue(node, "break") }
        public visitContinue(node:Call) { this.visitBreakContinue(node, "continue") }
        
        public visitShow(node:Call)
        {
            node._kind = this.core.Nothing;
            this.expectExpr(node.args[0], null, "show")
            node.topPostCall = null;
            if (node.args[0].isPlaceholder()) {
                this.markError(node, lf("TD207: we need something to show"))
            } else {
                var tp = node.args[0].getKind()
                if (tp == api.core.Unknown) return
                var show = tp.getProperty("post to wall")
                if (!show)
                    this.markError(node, lf("TD201: we don't know how to display {0}", tp.toString()))
                else
                    node.topPostCall = mkFakeCall(PropertyRef.mkProp(show), [node.args[0]])
            }
        }
        
        public visitReturn(node:Call)
        {
            node._kind = this.core.Nothing;
            node.topRetLocal = null;
            var exp = null

            if (!node.args[0].isPlaceholder()) {
                if (this.outLocals.length == 0)
                    this.markError(node.args[0], lf("TD202: the function doesn't have output parameters; return with a value is not allowed"))
                else if (this.outLocals.length > 1)
                    this.markError(node.args[0], lf("TD203: the function has more than one output parameter; return with a value is not allowed"))
                else {
                    node.topRetLocal = this.outLocals[0]
                    exp = node.topRetLocal.getKind()
                    this.recordLocalWrite(node.topRetLocal)
                }
            } else {
                if (this.outLocals.length == 1)
                    this.markError(node, lf("TD206: we need a value to return here"))
            }
            this.expectExpr(node.args[0], exp, "return")
            node.topAffectedStmt = this.currentAnyAction;
            this.checkAssignment(this.lastStmt)
        }
        
        public visitActionParameter(node:ActionParameter)
        {
        }

        public visitBlock(node:Block)
        {
            this.scope(() => {
                var ss = node.stmts;
                var unreach = false
                var reported = false
                for (var i = 0; i < ss.length; ++i) {
                    this.typeCheck(ss[i])
                    if (unreach) {
                        ss[i].isUnreachable = true
                        if (!reported && !(ss[i] instanceof Comment)) {
                            reported = true
                            ss[i].addHint(lf("code after return, break or continue won't ever run"))
                        }
                    }
                    if (ss[i].isJump())
                        unreach = true
                }
                for (var i = 0; i < ss.length; ++i) {
                    if (ss[i] instanceof If) {
                        var si = <If>ss[i]
                        si.isElseIf = false;
                        var end = i + 1
                        while (isElseIf(ss[end])) {
                            end++;
                            if (!(<If>ss[end - 1]).rawElseBody.isBlockPlaceholder())
                                break;
                        }
                        si.branches = []
                        while (i < end) {
                            var innerIf = <If>ss[i++]
                            innerIf.parentIf = si;
                            si.branches.push({
                                condition: innerIf.rawCondition,
                                body: innerIf.rawThenBody
                            })
                            if (i == end) {
                                si.branches.push({
                                    condition: null,
                                    body: innerIf.rawElseBody
                                })
                                innerIf.displayElse = true;
                            } else {
                                innerIf.displayElse = false;
                            }
                        }
                        i--;

                        this.writtenLocals.pushRange(Util.intersectArraysVA(si.branches.map(b => b.body.newlyWrittenLocals)))
                    }
                }
            })
        }

        private updateStmtUsage(s:Stmt, tp:string = null)
        {
            this.lastStmt = s
            if (this.countToUpdate != 0) {
                var u = api.core.stmtUsage(tp || s.nodeType())
                if (this.countToUpdate == 1)
                    u.localCount++;
                else
                    u.globalCount++;
            }
        }

        public visitFor(node:For)
        {
            this.updateStmtUsage(node);
            this.expect(node.upperBound, this.core.Number, 'for');
            node.boundLocal._kind = this.core.Number;
            this.readOnlyLocals.push(node.boundLocal);
            this.conditionalScope(() => {
                this.currLoop = node;
                this.declareLocal(node.boundLocal);
                this.typeCheck(node.body);
            });
        }

        public visitForeach(node:Foreach)
        {
            this.updateStmtUsage(node);
            this.expect(node.collection, null, null);
            var k = node.collection.getKind();
            if (!k.isEnumerable() && !node.collection.getError()) {
                if (k == this.core.Unknown) {
                    this.markHolderError(node.collection, lf("TD119: i need something to iterate on"));
                } else {
                    this.markHolderError(node.collection, lf("TD120: i cannot iterate over {0}", k.toString()));
                }
            }
            var ek: Kind;
            if (k instanceof RecordDefKind)
                ek = (<RecordDefKind>k).record.entryKind;
            var atProp = k.getProperty("at");
            if (!ek && !!atProp)
                ek = atProp.getResult().getKind();
            if (!!ek)
                node.boundLocal._kind = ek;
            this.readOnlyLocals.push(node.boundLocal);
            this.conditionalScope(() => {
                this.currLoop = node;
                this.declareLocal(node.boundLocal);
                this.typeCheck(node.conditions);
                this.typeCheck(node.body);
            });
        }

        public visitBox(node:Box)
        {
            this.updateStmtUsage(node);
            this.typeCheck(node.body)
        }

        public visitComment(node:Comment)
        {
            this.updateStmtUsage(node);
        }

        private setOutLocals(locs:LocalDef[])
        {
            this.outLocals = locs
            var isHiddenOut = locs.length == 1
            locs.forEach(l => {
                l.isHiddenOut = isHiddenOut;
                l.isOut = true;
            })
        }

        public visitAction(node:Action)
        {
            this.writtenLocals = [];
            this.readOnlyLocals = [];
            this.allLocals = [];
            this.currentAction = node;
            this.currentAnyAction = node;
            node.clearError();
            this.actionSection = ActionSection.Normal;
            this.inAtomic = node.isAtomic;
            this.inShim = this.topApp.entireShim || node.getShimName() != null;

            this.scope(() => {
                // TODO in - read-only?
                var prevErr = this.errorCount;
                this.setOutLocals(node.getOutParameters().map((p) => p.local))
                this.reportedUnassigned = false;

                this.typeResolver.visitAction(node);

                var fixupLocalInp = (a:ActionParameter) => {
                    this.declareLocal(a.local);
                    if (node.isPage())
                        this.readOnlyLocals.push(a.local)
                }
                if (node.modelParameter)
                    fixupLocalInp(node.modelParameter);
                node.getInParameters().forEach(fixupLocalInp);
                node.getOutParameters().forEach((a) => this.declareLocal(a.local))
                if (node.isPage()) {
                    this.pageInit = node.getPageBlock(true)
                    this.pageDisplay = node.getPageBlock(false)
                }
                this.typeCheck(node.body);
                if (node.isActionTypeDef()) {
                    var outp1 = node.getOutParameters()[1]
                    if (outp1) {
                        this.setNodeError(node, lf("TD171: function types support at most one output parameter; sorry"))
                    }
                } else {
                    if (!this.reportedUnassigned)
                        this.checkAssignment(node);
                }
                node._hasErrors = this.errorCount > prevErr;
                node.allLocals = this.allLocals;
            });

            if (// this.topApp.featureMissing(LanguageFeature.UnicodeModel) &&
                node.modelParameter &&
                node.modelParameter.local.getName() != modelSymbol)
            {
                node.modelParameter.local.setName(modelSymbol)
                this.numFixes++;
            }

            if (this.missingLocals.length > 0 && this.storeLocalsAt && this.storeLocalsAt.locals) {
                this.storeLocalsAt.locals.pushRange(this.missingLocals);
            }

            var inf = node.eventInfo;
            if (inf != null) {
                inf.disabled = false;
                if (inf.type.globalKind != null && !inf.onVariable) {
                    var varName = node.getName().slice(inf.type.category.length);
                    var v = this.topApp.variables().filter((v:GlobalDef) => v.getName() == varName)[0];
                    if (v === undefined) {
                        node.setError(lf("TD122: i cannot find variable {0}", varName))
                        inf.disabled = true;
                    }
                    inf.onVariable = v;
                }

                if (!!inf.onVariable) {
                    var newName = inf.type.category + inf.onVariable.getName()
                    if (!Script.things.filter(t => t.getName() == newName)[0])
                        node.setName(newName);
                    if (node.getName() != newName)
                        inf.onVariable = null;
                }

                // these should never really happen - we do not allow users to edit the signature
                if (node.hasOutParameters())
                    node.setError(lf("TD123: events cannot have out parameters"));
                if (node.getInParameters().length != inf.type.inParameters.length)
                    node.setError(lf("TD124: wrong number of in parameters to an event"));
                else {
                    var inParms = node.getInParameters();
                    for (var i = 0; i < inParms.length; ++i)
                        if (inParms[i].getKind() != inf.type.inParameters[i].getKind())
                            node.setError(lf("TD125: wrong type of parameter #{0}", i));
                }

                if (this.topApp.isLibrary && !this.ignoreLibErrors)
                    node.setError(lf("TD126: libraries cannot define global events"));
            }

            if (!node.isExternal) {
                if (this.topApp.isCloud && node.isPage())
                    node.setError(lf("TD177: cloud libraries cannot define pages"));

                if (this.topApp.isCloud && !node.isPrivate && node.isAtomic)
                    node.setError(lf("TD178: cloud libraries cannot define atomic functions"));
            }

            if (!!node.getError()) node._hasErrors = true;

            node._errorsOK = undefined;
            if (node.isCompilerTest()) {
                node._errorsOK = runErrorChecker(node);
            }
        }

        public visitLibraryRef(node:LibraryRef)
        {
        }

        private persistentStorageError(whatr: AST.RecordDef, wherep: AST.RecordPersistence, where?: AST.RecordDef): string {
            var error: string;
            var wheres: string;
            switch (wherep) {
                case RecordPersistence.Cloud: wheres =   lf("replicated "); break;
                case RecordPersistence.Partial: wheres = lf("replicated "); break;
                case RecordPersistence.Local: wheres = Script.isCloud ? lf("server-local ") :lf("locally persisted "); break;
            }
            wheres = wheres + (!where ? lf("variable") : (where.recordType === RecordType.Table ? lf("table") : lf("index")));
            if (whatr.recordType === RecordType.Object) {
                return lf("TD169: {0:a} cannot be persisted between script runs", whatr.toString());;
            }
            else {
                Util.assert(whatr.recordType === RecordType.Table);
                var whats: string;
                switch (whatr.getRecordPersistence()) {
                    case RecordPersistence.Cloud: whats =  lf("replicated table rows"); break;
                    case RecordPersistence.Local: whats = Script.isCloud ? lf("server-local table rows") : lf("locally persisted table rows"); break;
                    case RecordPersistence.Temporary: whats = lf("temporary table rows"); break;
                    case RecordPersistence.Partial: whats = lf("replicated table rows"); break;
                }
                return lf("TD166: cannot store {0} in a {1}",
                            whats, wheres);
            }
        }

        visitGlobalDef(node: GlobalDef) {
            node.clearError();

            if (node.isResource) {
                node.isTransient = true;
                node.cloudEnabled = false;
            }

            this.typeResolver.visitGlobalDef(node);
            if (node.getRecordPersistence() != RecordPersistence.Temporary &&
                (node.getKind().getContexts() & KindContext.CloudField) == 0) {
                this.setNodeError(node, lf("TD165: {0:a} cannot be saved between script runs", node.getKind().toString()))
                if (this.topApp.featureMissing(LanguageFeature.LocalCloud)) {
                    node.isTransient = true;
                    node.cloudEnabled = false;
                    this.numFixes++;
                }
            }
            if (node.getKind() instanceof RecordEntryKind) {

                var rdef = (<RecordEntryKind>(node.getKind())).getRecord();

                if (rdef.recordType == RecordType.Decorator) {
                    this.setNodeError(node, lf("TD175: must not store decorators in variables"));
                }

                else if (node.getRecordPersistence() > rdef.getRecordPersistence()) {
                    this.setNodeError(node, this.persistentStorageError(rdef, node.getRecordPersistence()));

                    if (!node.isTransient && this.topApp.featureMissing(LanguageFeature.LocalCloud)) {
                        node.isTransient = true;
                        node.cloudEnabled = false;
                        this.numFixes++;
                    }
                }
            }
        }

        private cyclefree(start,current: RecordDef) : boolean
        {
            return (current != start) &&
                (!current._wasTypechecked || current.linkedtables.every((t: RecordDef) => this.cyclefree(start, t)));
        }

        public visitRecordField(node:RecordField)
        {
            node.clearError();
            this.typeResolver.visitRecordField(node);

            var pers = node.def().getRecordPersistence()
            var cl = pers != RecordPersistence.Temporary;
            var ctx = cl ? (node.isKey ? KindContext.IndexKey : KindContext.CloudField) :
                           (node.isKey ? KindContext.IndexKey : KindContext.GlobalVar);
            var k = node.dataKind
            var c = k.getContexts();
            var newtype = node.def().recordType

            if (node.def().recordType == RecordType.Decorator && ctx == KindContext.IndexKey)
                ctx = KindContext.GcKey

            // check if this is a valid row key for an index or table
            if (!!(c & KindContext.RowKey) && (newtype == RecordType.Index || newtype == RecordType.Table)) {
                var other = (<RecordEntryKind>node.dataKind).getRecord()
                var otherpers = other.getRecordPersistence();

                if (otherpers < pers && !(otherpers == RecordPersistence.Cloud && pers == RecordPersistence.Partial)) {
                    this.setNodeError(node, this.persistentStorageError(other, pers, node.def()));
                    this.errorCount++;

                    if (this.topApp.featureMissing(LanguageFeature.LocalCloud) &&
                        pers != RecordPersistence.Cloud &&
                        other.getRecordPersistence() != RecordPersistence.Cloud) {
                        node.def().persistent = false
                        other.persistent = false
                        this.numFixes++;
                    }
                }
                if (node.isKey && newtype == RecordType.Table) // check links
                {
                    if (!this.cyclefree(node.def(), other)) {
                       this.setNodeError(node,  lf("TD176: links must not be circular") )
                    }
                    else
                      node.def().linkedtables.push(other);
                }
                return;
            }

            if (!(c & ctx)) {
                if (cl)
                    this.setNodeError(node, lf("TD167: {0:a} cannot be persisted between script runs", k.toString()));
                else
                    this.setNodeError(node, lf("TD168: {0:a} cannot be used as a {1}", node.isKey ? lf("key") : lf("field"), k.toString()))

                if (this.topApp.featureMissing(LanguageFeature.LocalCloud) && pers == RecordPersistence.Local) {
                    node.def().persistent = false;
                    this.numFixes++;
                }
            }

            if (pers === RecordPersistence.Partial && node.isKey && node.isFirstChild()) {
                if (node.dataKind.getName() !== "User") {
                    this.errorCount++;
                    node.setError("A partially replicated Index should have a User as first key");
                }
            }


        }

        public visitRecordDef(node:RecordDef)
        {
            node.isModel = false;
            node.linkedtables = [];
            this.visitChildren(node);
        }

        private typecheckLibraries(node:App)
        {
            node.libraries().forEach((l) => l.resolve());
            node.libraries().forEach((l) => l.typeCheck());
        }

        public visitApp(node:App)
        {
            this.typecheckLibraries(node);
            if (Cloud.isRestricted())
                node.entireShim = 
                    /#entireshim/i.test(node.comment) || 
                    node.actions().some(a => a.isPage()) || 
                    node.libraries().some(l => l.resolved && l.resolved.entireShim)
            node.things.forEach((n:Decl) => {
                var wt = n._wasTypechecked;
                n._wasTypechecked = true;
                this.dispatch(n);
                if (!wt) n.notifyChange();
            });

            var usedNames = {}
            node.things.forEach((n) => {
                if (usedNames.hasOwnProperty(n.getName())) {
                    // name clash, need to fix
                    this.numFixes++;
                    n.setName(node.freshName(n.getName() + " " + this.numFixes))
                } else {
                    usedNames[n.getName()] = n;
                }
            })

            node.actions().forEach(a => {
                var d = a.getModelDef()
                if (d) d.isModel = true
            })
        }

        public visitExprStmt(expr:ExprStmt)
        {
            this.updateStmtUsage(expr);
            this.expect(expr.expr, null, "void");
            if (expr.isVarDef())
                this.updateStmtUsage(expr, "var");
        }

        private checkAssignment(node:Stmt)
        {
            var unassigned = this.outLocals.filter((v) => this.writtenLocals.indexOf(v) < 0);
            if (unassigned.length > 0) {
                this.reportedUnassigned = true;
                node.addHint(lf("the function may not always return a value; insert a return statement?"));
            }
        }

        private actionScope(k:Kind, f:()=>void)
        {
            this.scope(() => {
                var prevReadOnly = this.readOnlyLocals;
                var prevRead = this.readLocals;
                var prevOutsideScopeLocals = this.outsideScopeLocals;
                var prevWritten = this.writtenLocals;
                var prevSect = this.actionSection;
                var prevAtomic = this.inAtomic;
                var prevOut = this.outLocals;
                var prevRep = this.reportedUnassigned;
                var prevAct = this.currentAnyAction;
                var prevLoop = this.currLoop;
                var prevInvisibleLocals = this.invisibleLocals;

                this.currLoop = null;
                this.writtenLocals = [];
                this.readLocals = [];

                this.actionSection = ActionSection.Lambda;
                this.inAtomic = k instanceof ActionKind && (<ActionKind>k).isAtomic();
                this.outsideScopeLocals = this.snapshotLocals()
                this.readOnlyLocals = AST.writableLocalsInClosures ? this.outsideScopeLocals.filter(l => !l.isRegular) : this.outsideScopeLocals.slice(0);
                if (Cloud.isRestricted())
                    this.invisibleLocals = this.snapshotLocals();

                try {
                    f()
                } finally {
                    this.readLocals = prevRead;
                    this.writtenLocals = prevWritten;
                    this.readOnlyLocals = prevReadOnly;
                    this.inAtomic = prevAtomic;
                    this.actionSection = prevSect;
                    this.outLocals = prevOut;
                    this.currentAnyAction = prevAct;
                    this.reportedUnassigned = prevRep;
                    this.currLoop = prevLoop;
                    this.invisibleLocals = prevInvisibleLocals;
                    this.outsideScopeLocals = prevOutsideScopeLocals;
                }
            })
        }


        private typeCheckInlineAction(inl:InlineAction)
        {
            this.actionScope(inl.name.getKind(), () => {
                this.currentAnyAction = inl;
                inl.inParameters.forEach((d) => this.declareLocal(d));
                inl.outParameters.forEach((d) => this.declareLocal(d));
                this.setOutLocals(inl.outParameters.slice(0))
                this.reportedUnassigned = false;
                this.typeCheck(inl.body);
                if (!this.reportedUnassigned)
                    this.checkAssignment(inl);
                this.computeClosure(inl);
            })
        }

        public visitInlineActions(inl:InlineActions)
        {
            this.updateStmtUsage(inl)

            // cannot just use scope, as the next expression can introduce fresh variables
            var names = inl.normalActions().map(a => a.name);
            names.forEach((n) => {
                this.declareLocal(n);
                n.lambdaNameStatus = 2;
            });

            inl.actions.forEach((iab:InlineActionBase) => {
                iab.clearError()
            })

            this.topInline = inl
            this.expect(inl.expr, null, "void");

            var p = this.localScopes.length - 1;
            this.localScopes[p] = this.localScopes[p].filter((l) => names.indexOf(l) < 0);

            var defined = (inl.expr.assignmentInfo() ? inl.expr.assignmentInfo().definedVars : null) || []
            var prevScope = this.localScopes[p]
            this.localScopes[p] = prevScope.filter(l => defined.indexOf(l) < 0)

            var rename = (s:string) => s; // TODO

            inl.actions.forEach((iab:InlineActionBase) => {
                if (iab instanceof OptionalParameter) {
                    var op = <OptionalParameter>iab
                    var knd = op.recordField ? op.recordField.dataKind : null
                    this.expect(op.expr, knd, "optional")
                    return
                }


                var ia = <InlineAction>iab

                var coerced = false;
                var coerce = (locs:LocalDef[], parms:PropertyParameter[]) =>
                {
                    if (locs.length > parms.length) {
                        locs.splice(parms.length, locs.length - parms.length)
                        coerced = true;
                    } else if (parms.length > locs.length) {
                        coerced = true;
                        parms.slice(locs.length).forEach((pp) => {
                            locs.push(mkLocal(rename(pp.getName()), pp.getKind()))
                        });
                    }
                    locs.forEach((l, i) => {
                        var pp = parms[i];
                        if (pp.getKind() != l.getKind()) {
                            l.rename(rename(pp.getName()));
                            l._kind = pp.getKind();
                            coerced = true;
                        }
                    })
                }

                if (ia.isOptional && ia.recordField) {
                    var ak = <ActionKind>ia.recordField.dataKind
                    ia.name.setKind(ak)
                    if (ak.isAction) {
                        coerce(ia.inParameters, ak.getInParameters())
                        coerce(ia.outParameters, ak.getOutParameters())
                    } else {
                        this.setNodeError(ia, lf("TD189: type of optional parameter '{0}' is not a function type", ia.getName()))
                    }
                } else if (ia.name.lambdaNameStatus != 2 && ia.name.getKind().isAction) {
                    var ak = <ActionKind>ia.name.getKind();

                    coerce(ia.inParameters, ak.getInParameters())
                    coerce(ia.outParameters, ak.getOutParameters())
                }

                this.typeCheckInlineAction(ia);
                ia.closure.forEach(l => this.recordLocalRead(l))
            });

            this.localScopes[p] = prevScope
        }


        /////////////////////////////////////////////////
        // Expression type-checking
        /////////////////////////////////////////////////

        public visitThingRef(t:ThingRef)
        {
            if (Util.startsWith(t.data, ThingRef.placeholderPrefix)) {
                var kn = t.data.slice(ThingRef.placeholderPrefix.length);
                var plName = null
                var colon = kn.indexOf(':')
                if (colon > 0) {
                    plName = kn.slice(colon + 1)
                    kn = kn.slice(0, colon)
                }
                var k = api.getKind(kn);
                if (!k && /[_\[]/.test(kn)) {
                    k = Parser.parseType(kn)
                    if (k) k = TypeChecker.resolveKind(k)
                    if (k == api.core.Unknown) k = null
                }
                if (!!k) {
                    var pl = new PlaceholderDef();
                    pl.setName("");
                    pl._kind = k;
                    if (plName) pl.label = plName
                    t.def = pl
                }
            }

            t._lastTypechecker = this;

            if (t.def instanceof PlaceholderDef) {
                if (!t.isEscapeDef())
                    this.markError(t, (<PlaceholderDef>t.def).longError());
            } else {
                if (!!t.def && !t.def.deleted && t.data != t.def.getName())
                    t.data = t.def.getName();
                t.def = this.lookupSymbol(t);
                if (!t.def && t.namespaceLibraryName()) {
                    if (!t.namespaceLibrary || t.namespaceLibrary.deleted)
                        t.namespaceLibrary = Script.libraries().filter(l => l.getName() == t.namespaceLibraryName())[0]
                    t.def = Script.libNamespaceCache.createSingleton(t.data, t.namespaceLibrary)
                }
                if (!t.def) {
                    this.markError(t, lf("TD101: cannot find '{0}'", t.data));
                    var loc = mkLocal(t.data, this.core.Unknown);
                    t.def = loc
                    loc.isRegular = true
                    if (this.seenCurrent)
                        this.missingLocals.push(loc)
                    this.declareLocal(loc)
                }
            }

            if (t.def instanceof LocalDef)
                this.recordLocalRead(<LocalDef>t.def)

            if (t.def instanceof LocalDef)
                t.forceLocal = true;
            else if (t.def instanceof SingletonDef)
                t.forceLocal = false;

            var l = <LocalDef>t.def;
            if (l instanceof LocalDef && l.lambdaNameStatus) {
                if (l.lambdaNameStatus == 1)
                    this.markError(t, lf("TD102: lambda reference '{0}' cannot be used more than once", l.getName()))
                else {
                    l.lambdaNameStatus = 1;
                    if (this.typeHint && this.typeHint.isAction) {
                        l._kind = this.typeHint;
                    }
                }
            }


            t._kind = t.def.getKind();
            if (t.def instanceof LocalDef) {
                var l = <LocalDef> t.def;
                if (!this.seenCurrent)
                    l.lastUsedAt = this.timestamp++;
            } else if (this.countToUpdate != 0) {
                if (t.def instanceof SingletonDef) {
                    var u = (<SingletonDef> t.def).usage;
                    if (this.countToUpdate == 1)
                        u.localCount++;
                    else
                        u.globalCount++;
                }
            }
        }

        public visitLiteral(l:Literal)
        {
            // Special, built-in type-checking for the literal that stands for a
            // field name.
            if (l instanceof FieldName) {
                var mkKind = () => {
                    var mk = TDev.MultiplexRootProperty.md_make_kind();
                    mk.md_parametric("T");
                    var prop = TDev.MultiplexRootProperty
                        .md_make_prop(mk, 0, TDev.api.core.Unknown, ":", "Whatever", [], mk.getParameter(0));
                    return prop.getResult().getKind();
                }
                l._kind = mkKind();
            } else switch (typeof l.data) {
                case "number": 
                    if (Cloud.isRestricted() && !this.inShim) {
                        if (Util.between(-0x80000000, l.data, l.possiblyNegative ? 0x80000000 : 0x7fffffff) != l.data) {
                            this.markError(l, lf("TD209: the number is outside of the allowed range (between {0} and {1})", -0x80000000, 0x7fffffff));
                        } else if (Math.round(l.data) != l.data) {
                            this.markError(l, lf("TD210: fractional numbers not allowed"));
                        }
                    }
                    l._kind = this.core.Number;
                    break;
                case "string": l._kind = this.core.String; break;
                case "boolean": l._kind = this.core.Boolean; break;
                default: Util.die();
            }
        }

        private typeCheckExpr(e:Expr)
        {
            e._kind = null;
            // e.error = null;
            this.dispatch(e);
            Util.assert(e.getKind() != null);
        }

        private expectExpr(expr:Expr, tp:Kind, whoExpects:string, skipTypecheck = false)
        {
            if (!skipTypecheck) {
                var prevHint = this.typeHint;
                this.typeHint = tp;
                this.typeCheckExpr(expr);
                this.typeHint = prevHint;
            }

            if (!Util.check(expr.getKind() != null, "expr type unset2")) {
                expr._kind = api.core.Unknown
            }
            if (tp != null && expr.getKind() !== tp) {
                var code = "TD103: "
                var suff = ""
                if (tp.getRoot() == api.core.Ref && (expr.referencedData() || expr.referencedRecordField())) {
                    code = "TD164: "
                    suff = lf("; are you missing  → ◈ref?")
                }
                var msg = lf("'{0}' expects {1} here", whoExpects, tp.toString())
                var k = expr.getKind();
                if (k != this.core.Unknown)
                    msg += lf(", got {0}", k.toString())
                this.markError(expr, code + msg + suff);
            }
        }

        private handleAsync(t:Call, args:Expr[])
        {
            t._kind = this.core.Unknown; // will get overridden
            if (args.length != 2) {
                // cannot trigger this one?
                this.markError(t, lf("TD104: syntax error in async"));
                return;
            }

            // args[0] is 'this'
            var arg = args[1]
            if (arg instanceof Call)
                (<Call>arg).runAsAsync = true;
            this.expectExpr(arg, null, "async")

            var calledProp = arg.getCalledProperty();
            var isAsyncable = calledProp && !!(calledProp.getFlags() & PropertyFlags.Async)
            if (calledProp == api.core.AsyncProp)
                isAsyncable = false;

            if (!isAsyncable) {
                this.markError(t, lf("TD157: 'async' keyword needs a non-atomic API or function to call"))
                return;
            }

            (<Call>arg).runAsAsync = true;


            if (calledProp && calledProp.forwardsTo() instanceof Action) {
                var act = <Action>calledProp.forwardsTo()
                if (act.getOutParameters().length > 1)
                    this.markError(t, lf("TD170: cannot use 'async' on functions with more than one output parameter"))
            }

            t._kind = this.core.Task.createInstance([arg.getKind()])
        }

        private computeClosure(inl:InlineAction)
        {
            inl.closure = [];
            inl.allLocals = [];
            this.readLocals.forEach(l => {
               if (this.outsideScopeLocals.indexOf(l) >= 0)
                    inl.closure.push(l)
                inl.allLocals.push(l)
            })
        }

        private handleFun(t:Call, args:Expr[])
        {
            var ak:ActionKind = null
            var resKind:Kind = null

            if (this.typeHint && this.typeHint.isAction) {
                ak = <ActionKind>this.typeHint
                var outp = ak.getOutParameters()
                if (outp.length != 1)
                    this.markError(t, lf("TD194: lambda expressions need to return exactly one value; function type '{0}' returns {1}", ak.getName(), outp.length))
                else
                    resKind = outp[0].getKind()
            } else {
                this.markError(t, lf("TD195: lambda expressions can only be used as arguments of function type"))
            }

            this.actionScope(this.typeHint, () => {
                if (ak) {
                    var synth = new InlineAction()
                    synth.name = mkLocal(Random.uniqueId(), ak)
                    this.declareLocal(synth.name)
                    var names = t.propRef.fromOp.getFunArgs() || []
                    synth.inParameters = ak.getInParameters().map((p, i) => mkLocal(names[i] || p.getName(), p.getKind()))
                    t.propRef.fromOp.funArgs = synth.inParameters
                    synth.outParameters = ak.getOutParameters().map(p => mkLocal(p.getName(), p.getKind()))
                    synth.inParameters.forEach(p => this.declareLocal(p))
                    synth.body = new CodeBlock()
                    synth.body.parent = synth
                    synth.parent = this.lastStmt.parent
                    var bb = Parser.emptyExprStmt()
                    synth.body.setChildren([bb])
                    var outp0 = synth.outParameters[0]
                    if (outp0) {
                        var resR = <ThingRef>mkThing(outp0.getName(), true)
                        resR.def = outp0
                        bb.expr.parsed = mkFakeCall(PropertyRef.mkProp(api.core.AssignmentProp), [
                            resR, args[1] ])
                        t.funAction = synth
                    }
                }
                this.expectExpr(args[1], resKind, "lambda expression")
                if (ak)
                    this.computeClosure(synth);
            });

            t._kind = ak || this.core.Unknown
        }

        private recordLocalRead(loc:LocalDef)
        {
            if (this.readLocals.indexOf(loc) < 0)
                this.readLocals.push(loc);
        }

        private recordLocalWrite(loc:LocalDef)
        {
            this.recordLocalRead(loc);
            if (this.writtenLocals.indexOf(loc) < 0)
                this.writtenLocals.push(loc);
        }

        private handleAssignment(t:Call, args:Expr[])
        {
            t._kind = this.core.Nothing;
            if (args.length != 2) {
                // cannot trigger this one?
                this.markError(t, lf("TD104: syntax error in assignment"));
                return;
            }
            Util.assert(args.length == 2);
            var lhs = args[0].flatten(this.core.TupleProp);
            var rhs = args[1];

            this.isTopExpr = true;
            this.typeCheckExpr(rhs);

            var info = new AssignmentInfo();
            t._assignmentInfo = info;

            var sources = [AST.mkLocal("", rhs.getKind())];
            var act = rhs.anyCalledAction()
            if (act != null)
            {
                sources = act.getOutParameters().map((a:AST.ActionParameter) => a.local);
                var missing = sources.length - lhs.length;
                if (missing > 0) {
                    this.markError(t, lf("TD105: function '{0}' returns {1} more value{1:s}", act, missing));
                    info.missingArguments = missing;
                }
            }

            info.targets = lhs;
            info.sources = sources;

            for (var i = 0; i < lhs.length; ++i) {
                var trg = lhs[i];
                var src = sources[i];
                if (src == undefined) {
                    this.markError(trg, lf("TD106: not enough values returned to assign to {0}", trg));
                    continue;
                }

                var prevErr = this.errorCount;
                if (trg.nodeType() === "thingRef") {
                    var tr = <ThingRef> trg;
                    tr._lastTypechecker = this;
                    if (!!tr.def) tr.data = tr.def.getName();
                    var name = tr.data;
                    var thing = this.lookupSymbol(tr);
                    if (!thing) {
                        var loc = mkLocal(name, src.getKind());
                        info.definedVars.push(loc);
                        thing = loc;
                        loc.isRegular = true
                        this.declareLocal(loc)
                        if (!src.getKind().hasContext(KindContext.Parameter)) {
                            if (src.getKind() == api.core.Nothing &&
                                this.topApp.featureMissing(LanguageFeature.ContextCheck))
                                info.fixContextError = true;
                            this.markError(tr, lf("TD155: '{0}' cannot be assigned to a local variable", src.getKind()))
                        }
                    } else {
                        var loc = <LocalDef>thing;
                        if (this.readOnlyLocals.indexOf(loc) >= 0) {
                            if (!AST.writableLocalsInClosures && this.actionSection == ActionSection.Lambda) {
                                this.markError(trg, lf("TD107: inline functions cannot assign to locals from outside like '{0}'", name));
                            } else {
                                this.markError(trg, lf("TD108: you cannot assign to the local variable '{0}'", name));
                            }
                        } else {
                            if (this.outsideScopeLocals.indexOf(loc) >= 0)
                                loc._isByRef = true;
                            this.recordLocalWrite(loc)
                        }
                    }
                    this.typeCheckExpr(trg);
                } else {
                    this.typeCheckExpr(trg);
                    var gd = trg.referencedData();
                    var rcf = trg.referencedRecordField();
                    var setter = trg.getLiftedSetter();
                    if (rcf == null && gd == null && setter == null) {
                        this.markError(trg, lf("TD109: cannot assign to this"));
                        continue;
                    }
                    if (gd && gd.readonly) {
                        this.markError(trg, lf("TD110: trying to assign to a read-only variable"));
                    } else if (rcf && rcf.isKey) {
                        this.markError(trg, lf("TD163: trying to assign to an index key"));
                    } else {
                        Util.assert(!!setter || trg.isRefValue());
                    }
                    (<Call>trg).autoGet = false;
                }

                if (src.getKind() != trg.getKind() && prevErr == this.errorCount)
                    this.markError(trg, lf("TD111: cannot assign from {0} to {1}", src.getKind(), trg.getKind()));
            }
        }

        private lintJavaScript(js:string, isAsync:boolean)
        {
            var toks:string[] = Lexer.tokenize(js).map(l => {
                switch (l.category) {
                    case TokenType.Op:
                    case TokenType.Id:
                    case TokenType.Keyword:
                    case TokenType.Label:
                        return l.data;
                    default:
                        return ""
                }
            }).filter(s => !!s)

            var nextProtected = false

            var hasResume = false
            var hasUnprotected = 0
            var hasOverprotected = 0
            var brStack = []
            var hasBrError = false

            toks.forEach((t, i) => {
                if ((t == "resume" || t == "checkAndResume") && toks[i + 1] == "(")
                    hasResume = true
                if (t == "protect" && toks[i + 1] == "(")
                    nextProtected = true
                if (t == "function") {
                    if (isAsync) {
                        if (!nextProtected)
                            hasUnprotected++
                    } else {
                        if (nextProtected)
                            hasOverprotected++
                    }
                    nextProtected = false
                }
                if (t == "(")
                    brStack.push(")")
                if (t == "{")
                    brStack.push("}")
                if (t == "[")
                    brStack.push("]")
                if (t == ")" || t == "}" || t == "]") {
                    if (brStack.peek() != t) {
                        if (!hasBrError)
                            this.hintsToFlush.push(lf("JS hint: possible brace mismatch: got '{0}', expecting '{1}'", t, brStack.peek()))
                        hasBrError = true
                    } else brStack.pop()
                }

            })

            if (!hasBrError && brStack.length > 0)
                this.hintsToFlush.push(lf("JS hint: possible missing closing brace: '{0}'", brStack.peek()))
            if (isAsync && !hasResume)
                this.hintsToFlush.push(lf("JS hint: using 'javascript async' but no call to 'resume()'"))
            if (!isAsync && hasResume)
                this.hintsToFlush.push(lf("JS hint: using 'resume()' outside of 'javascript async'"))
            if (hasUnprotected)
                this.hintsToFlush.push(lf("JS hint: found function() without lib.protect(...) around it"))
            if (hasOverprotected)
                this.hintsToFlush.push(lf("JS hint: found function() with lib.protect(...) outside of `javascript async`"))
        }

        private checkStringLiteralArguments(t: Call) : (number) => boolean {
            var propName = t.prop().getName();
            if (!t.args.slice(1).every(a => a.getStringLiteral() != null)) {
                this.markError(t, lf("TD179: arguments to `{0}` have to be string literals", propName))
                return undefined;
            }
            var checkArgumentCount = (c: number) => {
                if (t.args.length != c) {
                    this.markError(t, lf("TD181: wrong number of arguments to `{0}`", propName))
                    return false;
                }
                return true;
            }
            return checkArgumentCount;
        }

        private handleJavascriptImport(t:Call)
        {
            var checkArgumentCount = this.checkStringLiteralArguments(t);
            if (!checkArgumentCount) return;

            var propName = t.prop().getName();
            switch (propName) {
            case "javascript":
            case "javascript async":
                if (!checkArgumentCount(3)) return;
                this.currentAction.getOutParameters().forEach(p => this.recordLocalWrite(p.local))
                this.lintJavaScript(t.args[2].getStringLiteral(), /async/.test(t.prop().getName()))
                break;
            case "thumb":
                if (!checkArgumentCount(2)) return;
                if (!this.inShim)
                    // TODO check that there is only one
                    this.markError(t, lf("TD213: app->thumb only supported inside of {shim:}"))
                this.currentAction.getOutParameters().forEach(p => this.recordLocalWrite(p.local))
                if (TypeChecker.lintThumb) {
                    var errs = TypeChecker.lintThumb(this.currentAction, t.args[1].getStringLiteral())
                    if (errs.length > 0) {
                        this.markError(t, lf("TD212: thumb assembler error"))
                        this.lastStmt._inlineErrors = errs;
                    } else {
                        this.lastStmt._inlineErrors = null;
                    }
                }
                break;
            case "import":
                if (!checkArgumentCount(4)) return;
                    var manager = t.args[1].getStringLiteral() || ""
                    var plugin = t.args[2].getStringLiteral()
                    var v = t.args[3].getStringLiteral()
                    if (v == null) v = "*";
                    switch (manager.trim().toLowerCase()) {
                        case "npm":
                            if (!this.topApp.canUseCapability(PlatformCapability.Npm))
                                this.unsupportedCapability(plugin, PlatformCapability.Npm);
                            this.topApp.imports.importNpm(this, t, plugin, v); break;
                        case "cordova":
                            if (!this.topApp.canUseCapability(PlatformCapability.Cordova))
                                this.unsupportedCapability(plugin, PlatformCapability.Cordova);
                            this.topApp.imports.importCordova(this, t, plugin, v); break;
                        case "bower":
                            this.topApp.imports.importBower(this, t, plugin, v); break;
                        case "client":
                            this.topApp.imports.importClientScript(this, t, plugin, v); break;
                        case "pip":
                            if (!this.topApp.canUseCapability(PlatformCapability.Npm))
                                this.unsupportedCapability(plugin, PlatformCapability.Npm);
                            this.topApp.imports.importPip(this, t, plugin, v); break;
                        case "touchdevelop": {
                            if (!/^\/?[a-z]{4,}$/.test(v)) this.markError(t, lf("TD190: version must be a published script id"));
                            else {
                                if (!this.topApp.canUseCapability(PlatformCapability.EditorOnly))
                                    this.unsupportedCapability(plugin, PlatformCapability.EditorOnly);
                                this.topApp.imports.importTouchDevelop(this, t, plugin, v.replace(/^\/?/, ""));
                            }
                            break;
                        }
                        default: this.markError(t, lf("TD191: unknown package manager")); break;
                }
                break;
            }
        }

        public visitCall(t:Call)
        {
            var args = t.args;
            var prop = t.prop();
            var wasTopExpr = this.isTopExpr
            this.isTopExpr = false

            if (this.inShim)
                t.isShim = this.inShim;
            t._assignmentInfo = null;

            if (prop === this.core.AssignmentProp) {
                this.handleAssignment(t, args);
                return;
            }

            if (prop === this.core.AsyncProp) {
                this.handleAsync(t, args);
                return;
            }

            if (prop == this.core.FunProp) {
                this.handleFun(t, args)
                return
            }

            var topInline = this.topInline
            this.topInline = null

            var prevErr = this.errorCount;
            this.typeCheckExpr(args[0]);
            var k0 = args[0].getKind();

            if (this.topApp.featureMissing(LanguageFeature.Refs) &&
                args[0].referencedRecordField() &&
                /^(get|set|test and set|confirmed|clear|add)$/.test(t.propRef.data))
            {
                this.numFixes++;
                prop = null;
                t.propRef.data = api.core.refPropPrefix + t.propRef.data
                if (/^.(get)$/.test(t.propRef.data)) {
                    t.propRef.tokenFix = "delete";
                } else if (/^.(set)$/.test(t.propRef.data)) {
                    t.propRef.tokenFix = ":=";
                }
            }

            if (t.propRef.getText().slice(0,1) == api.core.refPropPrefix &&
                args[0].allowRefUse()) {

                var innerCall = <Call>args[0]
                Util.assert(innerCall.autoGet)
                innerCall._kind = k0 = api.core.Ref.createInstance([k0])
                innerCall.autoGet = false;
            }

            if (prop) {
                if (k0 != this.core.Unknown && prop.getInfixPriority() == 0 && prop.parentKind != k0)
                    prop = null; // rebind
            }

            if (prop && prop.deleted) {
                var nn = prop.getName()
                if (nn)
                    t.propRef.data = nn
                prop = null;
            }

            if (!prop || prop instanceof UnresolvedProperty) {
                prop = k0.getProperty(t.propRef.data);

                if (!prop && this.topApp.featureMissing(LanguageFeature.UppercaseMultiplex)) {
                    if (k0 instanceof MultiplexKind) {
                        var otherOption = (s:string) => false
                        if (t.propRef.data[0] == recordSymbol) {
                            var libsuffix = "\u00A0" + t.propRef.data.slice(1)
                            otherOption = s => s.slice(-libsuffix.length) == libsuffix
                        }
                        prop = k0.listProperties().filter(p => p.getName().toLowerCase() == t.propRef.data || otherOption(p.getName()))[0]
                    } else if (k0.getName() == "Create" && t.propRef.data == "collection of") {
                        prop = k0.getProperty("Collection of")
                    }
                }

                if (!prop) {
                    var pref = k0.getName() + "->"
                    var autoRenameKey = pref + t.propRef.data
                    if (AST.propRenames.hasOwnProperty(autoRenameKey))
                        prop = k0.getProperty(AST.propRenames[autoRenameKey])
                }

                if (!prop && args[0] instanceof ThingRef) {
                    var nl = (<ThingRef>args[0]).namespaceLibrary
                    if (nl && !nl.deleted)
                        prop = nl.getKind().getProperty(t.propRef.data)
                }

                if (!prop) {
                    if (prevErr == this.errorCount)
                        this.markError(t, lf("TD112: i cannot find property '{0}' on {1}", t.propRef.data, k0));
                    prop = new UnresolvedProperty(k0, t.propRef.data);
                }
                t.propRef.prop = prop;
            }

            if (prop instanceof UnresolvedProperty) {
                args.slice(1).forEach((p:Expr) => { this.typeCheckExpr(p); });
                t._kind = this.core.Unknown;
                return;
            }

            if (prop && prop.parentKind == this.core.App &&
                /^(javascript|import|thumb)/.test(prop.getName())) {
                this.handleJavascriptImport(t);
            }

            var imports = prop.getImports();
            if (imports) imports.forEach(imp => {
                switch (imp.manager) {
                    case "cordova": this.topApp.imports.importCordova(this, null, imp.name, imp.version); break;
                    case "npm": this.topApp.imports.importNpm(this, null, imp.name, imp.version); break;
                    default:
                        Util.assert(false, imp.manager + " not supported");
                        break;
                }
            });

            t.autoGet = t.isRefValue();

            var decl = prop.forwardsTo();
            if (!!decl && decl.deleted) {
                try {
                    Util.log("deleted decl name: " + decl.getName())
                    Util.log("deleted decl: " + decl.serialize())
                } catch (e) {
                }
                Util.check(false, "deleted decl"); // should be handled above
                decl.deleted = false;
                // cannot trigger
                // this.markError(t, "TD113: '{0}' was deleted", t.propRef.data);
            }

            var cacc = t.calledExtensionAction() || t.calledAction();
            if (cacc) {
                cacc.markUsed();
                if (cacc.isPage()) {
                    t._assignmentInfo = new AssignmentInfo();
                    t._assignmentInfo.isPagePush = true;
                }
            }

            if ((prop.getFlags() & PropertyFlags.Async) && !t.runAsAsync) {
                if (this.inAtomic) {
                    if (this.actionSection == ActionSection.Init) {
                        // it's ok
                    } else if (this.actionSection == ActionSection.Display) {
                        var isRun = prop.getName() == "run" && prop.parentKind.isAction
                        if (cacc || isRun) {
                            // TODO: fix this warning to something usable
                            // this.hintsToFlush.push(Util.fmt("'{0}' may call non-atomic actions, which will fail at run time (search for 'atomic display' in the help)", prop.getName()));
                        } else {
                            this.markError(t, lf("TD172: '{0}' cannot be used in page display section (which is treated as 'atomic')", prop.getName()));
                        }
                    } else {
                        this.markError(t, lf("TD158: '{0}' cannot be used in functions marked with 'atomic'", prop.getName()));
                    }
                }
                this.seenAwait = true;
            }

            if (!prop.isImplementedAnywhere()) {
                if (prop.getFlags() & PropertyFlags.IsObsolete)
                    this.hintsToFlush.push(lf("'{0}' is obsolete and not implemented", prop.getName()));
                else
                    this.hintsToFlush.push(lf("'{0}' is currently not implemented", prop.getName()));
            } else if (Cloud.isRestricted() && prop.getCapability() && !
                ((<Property>prop).allowInRestricted || 
                 (Cloud.hasPermission("post-raw") && prop.getCapability() == PlatformCapability.Network))) {
                this.markError(t, lf("TD211: this call is not supported in the restricted profile"))
            } else if (!Browser.isNodeJS && !this.topApp.canUseProperty(prop)) {
                this.unsupportedCapability(prop.getName(), prop.getCapability());
            } else if (prop.getFlags() & PropertyFlags.IsObsolete) {
                this.hintsToFlush.push(lf("'{0}' is obsolete and should not be used", prop.getName()));
            }

            t._kind = prop.getResult().getKind();

            var inP = prop.getParameters();

            if (this.countToUpdate > 0)
                if (this.countToUpdate == 1)
                    prop.getUsage().localCount++;
                else
                    prop.getUsage().globalCount++;


            if (topInline) (()=>{
                var impl = topInline.implicitAction()
                if (impl) {
                    var implIdx = -1
                    inP.forEach((p, i) => {
                        if (InlineActions.isImplicitActionKind(p.getKind()))
                            implIdx = i
                    })
                    if (implIdx < 0) {
                        this.setNodeError(topInline, lf("TD182: '{0}' doesn't take an implicit inline function", prop))
                    } else {
                        var tok = AST.mkThing(impl.getName(), true)
                        // this.dispatch(tok)
                        args.splice(implIdx, 0, tok)
                    }
                }
            })()

            var optionsParm = OptionalParameter.optionsParameter(prop)
            if (optionsParm && inP.length > args.length) (()=>{
                var lk = optionsParm.getKind()
                var rec = lk.getRecord()
                var maker = new PlaceholderDef()
                maker._kind = lk
                maker.escapeDef = {
                    objectToMake: lk,
                    optionalConstructor: topInline,
                    isEmpty: true
                }
                var t = mkThing("_libobj_");
                (<ThingRef>t).def = maker
                args.push(t)

                if (!topInline) return

                var used:StringMap<boolean> = {}
                topInline.optionalParameters().forEach(opt => {
                    var fld = lk.getProperty(opt.getName())
                    var stmt = fld ? fld.forwardsToStmt() : null
                    if (stmt instanceof AST.RecordField) {
                        if (used.hasOwnProperty(opt.getName()))
                            this.setNodeError(opt, lf("TD185: optional parameter '{0}' specified more than once", opt.getName()))
                        used[opt.getName()] = true
                        var rf = <AST.RecordField>stmt
                        opt.recordField = rf
                        maker.escapeDef.isEmpty = false
                    } else if (!opt.getName()) {
                        this.setNodeError(opt, lf("TD193: we need a name for optional parameter of '{0}' (from type '{1}')",
                                    prop, lk))
                    } else {
                        this.setNodeError(opt, lf("TD183: '{0}' doesn't take optional parameter named '{1}' (in type '{2}')",
                                    prop, opt.getName(), lk))
                    }
                })

                topInline = null
            })()

            if (topInline && topInline.optionalParameters().length > 0)
                if (optionsParm)
                    this.markError(t, lf("TD188: '{0}' already has the optional parameters object passed explicitly", prop))
                else
                    this.markError(t, lf("TD184: '{0}' doesn't take optional parameters", prop))

            if (inP.length < args.length)
                this.markError(t, lf("TD115: excessive parameter(s) supplied to {0}", prop));
            else if (inP.length > args.length)
                this.markError(t, lf("TD116: not enough parameters supplied to {0}", prop));

            var concatOk = (e:Expr) => {
                var k = e.getKind()
                if (k == api.core.Unknown) return;
                if (k == api.core.Nothing ||
                    k.singleton ||
                    k instanceof AST.LibraryRefKind)
                    this.markError(e, lf("TD117: cannot use this expression as argument to ||; are you missing parenthesis?"));
            }

            // args[0] is already typechecked; typechecking it again is exponential

            if (prop == this.core.StringConcatProp) {
                this.typeCheckExpr(args[1]);
                concatOk(args[0]);
                concatOk(args[1]);
                if (this.saveFixes)
                    this.fixConcat(t)
                return;
            }

            for (var i = 0; i < args.length; ++i) {
                if (i >= inP.length) {
                    if (i > 0)
                        this.typeCheckExpr(args[i]);
                } else {
                    var expK = inP[i].getKind();
                    if (i == 0 &&
                        args[i].getThing() instanceof SingletonDef &&
                        expK instanceof LibraryRefKind) {
                        (<ThingRef>args[i]).namespaceLibrary = (<LibraryRefKind>expK).lib;
                        (<ThingRef>args[i]).namespaceLibraryName();
                    } else {
                        this.expectExpr(args[i], expK, prop.getName(), i == 0);
                    }
                    args[i].languageHint = inP[i].languageHint
                    var str = inP[i].getStringValues()      
                    if (str) {
                        var emap = (<any>str).enumMap
                        if (emap) {
                            var lit = args[i].getLiteral()
                            if (typeof lit == "string") {
                                var picMap = inP[i].getStringValueArtIds();
                                if (picMap) args[i].hintArtId = picMap[lit];
                                if (str.indexOf(lit) >= 0) {
                                    args[i].enumVal = emap.hasOwnProperty(lit) ? emap[lit] : undefined
                                } else {
                                    this.markError(args[i], lf("TD199: we didn't expect {0} here; try something like {1}",
                                        JSON.stringify(lit),
                                        str.map(s => JSON.stringify(s)).join(", ").slice(0, 100)))
                                }                                
                            } else {
                                this.markError(args[i], lf("TD198: we need an enum string here, something like {0}",
                                    str.map(s => JSON.stringify(s)).join(", ").slice(0, 100)))
                            }
                        } else { // hints                        
                            var lit = args[i].getLiteral()
                            if (typeof lit == "string") {
                                var picMap = inP[i].getStringValueArtIds();
                                if (picMap) args[i].hintArtId = picMap[lit];
                                if(str.indexOf(lit) >= 0)
                                    args[i].hintVal = lit;
                            }
                        }                        
                    }

                    if (/^bitmatrix|bitframe$/i.test(args[i].languageHint)) {
                        var lit = args[i].getLiteral();
                        if (!(typeof lit == "string")) {
                            this.markError(args[i], lf("TD179: we need a string here"));
                        }
                    }
                }
            }

            if (this.saveFixes)
                this.argumentFixes(t, inP)
        }

        private unsupportedCapability(name: string, cap: PlatformCapability) {
            var missing = App.capabilityString(cap & ~(this.topApp.getPlatform()));
            if (this.topApp.getPlatformRaw() & PlatformCapability.Current)
                this.hintsToFlush.push(lf("your current device does not support '{0}'; to develop scripts for other devices, enable the '{1}' capability in the platform settings in the script properties pane",
                    name, missing));
            else
                this.hintsToFlush.push(lf("your current platform settings do not include the '{1}' capability required for '{0}'; you can change platform settings in the script properties pane",
                    name, missing));
            if (this.currentAction)
                this.currentAction.numUnsupported++
        }

        private cloneCall(t:Call, args:Expr[])
        {
            return mkFakeCall(t.propRef, args)
        }

        private fixConcat(t:Call)
        {
            var prop = t.args[1].getCalledProperty()
            var c = <Call>t.args[1]
            if (prop && prop.getResult().getKind() == api.core.Nothing && c.args.length == 1) {
                t.savedFix = this.cloneCall(c, [this.cloneCall(t, [t.args[0], c.args[0]])])
                this.saveFixes++
            }
        }

        private argumentFixes(t:Call, inP:PropertyParameter[])
        {
            if (t.prop() == api.core.TupleProp) {
                if (t.args[0].getKind() == api.core.String || t.args[1].getKind() == api.core.String) {
                    t.savedFix = mkFakeCall(PropertyRef.mkProp(api.core.StringConcatProp), t.args.slice(0))
                    this.saveFixes++
                }
            }
            else if (inP.length > t.args.length) {
                var args = t.args.slice(0)
                var locs = this.snapshotLocals()
                for (var i = args.length; i < inP.length; ++i) {
                    var toks = Fixer.findDefault(inP[i], locs)
                    var innExpr = ExprParser.parse1(toks)
                    this.typeCheckExpr(innExpr)
                    args.push(innExpr)
                }
                t.savedFix = this.cloneCall(t, args)
                this.saveFixes++
            }
        }
    }

    class ClearErrors
        extends NodeVisitor
    {
        public visitAstNode(n:AstNode)
        {
            n.clearError()
            this.visitChildren(n)
        }
    }

}
