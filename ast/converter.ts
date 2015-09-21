///<reference path='refs.ts'/>

module TDev.AST {
    class TsQuotingCtx
        extends QuotingCtx
    {
        public unUnicode(s:string)
        {
            s = s.replace(/\s+([a-z])/g, (v,l) => l.toUpperCase())
            s = s.replace(/[^a-zA-Z0-9]+/g, "_");
            if (s == "" || /^[0-9]/.test(s)) s = "_" + s;
            return s;
        }

    }

    class TsTokenWriter
        extends TokenWriter
    {
        private globalCtx = new TsQuotingCtx();

        public globalId(d:Decl)
        {
            var n = d.getName()
            if (d instanceof Action) {
                var a = <Action>d;
                if (!a.isAtomic)
                    n += "Async"

            }
            return this.jsid(this.globalCtx.quote(n, 0))
        }

        public sep():TokenWriter
        {
            if (" ([.".indexOf(this.lastChar) >= 0) return this;
            return super.sep();
        }

        public jsid(id:string) {
            if (!/^[a-zA-Z_]\w*$/.test(id))
                Util.oops("bad id: " + id)
            return this.sep().write(id);
        }

        public kw(k:string) { return this.keyword(k) }
    }

    class AsyncFinder
        extends ExprVisitor
    {
        public lastAsync:Call;

        visitCall(c:Call)
        {
            if (c.awaits())
                this.lastAsync = c;
            super.visitCall(c)
        }

    }

    class ConverterPrep
        extends NodeVisitor
    {
        private numAwaits = 0;

        visitAstNode(n:AstNode)
        {
            this.visitChildren(n);
        }

        visitInlineActions(s:InlineActions)
        {
            var pre = this.numAwaits;
            this.dispatch(s.expr);
            s._converterAwait = pre < this.numAwaits
            super.visitStmt(s)
        }

        visitStmt(s:Stmt)
        {
            var pre = this.numAwaits;
            super.visitStmt(s)
            s._converterAwait = pre < this.numAwaits
        }

        visitExprHolder(eh:ExprHolder)
        {
            if (eh.isAwait) 
                this.numAwaits++
        }
    }

    export class Converter 
        extends NodeVisitor 
    {
        private tw = new TsTokenWriter();
        private localCtx = new TsQuotingCtx();
        private currAsync:Call;

        constructor(private app:App)
        {
            super()
        }

        public run()
        {
            new ConverterPrep().dispatch(this.app)
            this.dispatch(this.app)
            return this.tw.finalize()
        }

        private localName(l:LocalDef)
        {
            return this.tw.jsid(this.localCtx.quote(l.getName(), l.nodeId))
        }

        private type(t:Kind)
        {
            if (/^(String|Number|Boolean)$/.test(t.toString()))
                this.tw.jsid(t.toString().toLowerCase())
            else if (t.getRoot() == api.core.Collection) {
                this.type(t.getParameter(0))
                this.tw.op0("[]")
            } else {
                //TODO
                this.tw.kind(this.app, t)
            }
            return this.tw
        }

        private localDef(l:LocalDef)
        {
            this.localName(l).op0(":")
            return this.type(l.getKind())
        }

        visitAstNode(n:AstNode)
        {
            this.visitChildren(n);
        }

        private infixPri(e:Expr)
        {
            var p = e.getCalledProperty()
            if (!p) return 0
            if (p.parentKind == api.core.String) {
                if (p.getName() == "equals")
                    return 5
                // + in JS
                if (p == api.core.StringConcatProp)
                    return 10
            }
            return p.getInfixPriority() || 0
        }

        visitCall(e:Call)
        {
            if (e == this.currAsync) {
                this.tw.jsid("_")
                return
            }

            if (e.awaits()) {
                this.tw.write(" /* ASYNC */ ")
            }

            this.visitCallInner(e)
        }

        visitCallInner(e:Call)
        {
            var p = e.getCalledProperty()
            var infixPri = this.infixPri(e)
            var pn = p.parentKind.toString() + "->" + p.getName()
            
            var params = (pp:Expr[]) => {
                this.tw.op0("(")
                pp.forEach((p, i) => {
                    if (i > 0) this.tw.op(",")
                    this.dispatch(p)
                })
                this.tw.op0(")")
            }

            if (infixPri) {
                if (p.getName() == "-" && e.args[0].getLiteral() === 0.0) {
                    this.tw.op0("-")
                    this.dispatch(e.args[1])
                    return
                }

                var doParen = e => {
                    if (this.infixPri(e) && this.infixPri(e) <= infixPri 
                        && e.getCalledProperty().getName() != p.getName())
                    {
                        this.tw.op0("(")
                        this.dispatch(e)
                        this.tw.op0(")")
                    } else this.dispatch(e)
                }

                if (e.args.length == 1) {
                    this.printOp(p.getName())
                    doParen(e.args[0])
                } else {
                    doParen(e.args[0])
                    var nn = p.getName()
                    if (nn == "equals") nn = "=="
                    this.printOp(nn)
                    doParen(e.args[1])
                }

            } else if (e.referencedData()) {
                this.tw.globalId(e.referencedData())
            } else if (e.referencedLibrary()) {
                this.tw.globalId(e.referencedLibrary())
            } else if (e.referencedRecord()) {
                this.tw.globalId(e.referencedRecord())
            } else if (e.referencedRecordField()) {
                this.tightExpr(e.args[0])
                this.tw.op0(".");
                this.simpleId(e.referencedRecordField().getName())
            } else if (e.calledAction()) {
                if (!(e.args[0].getKind() instanceof ThingSetKind)) {
                    this.tightExpr(e.args[0])
                    this.tw.op0(".")
                }
                this.tw.globalId(e.calledAction())
                params(e.args.slice(1))
            } else if (false && (pn == "App->javascript" || pn == "App->javascript async")) {
                // TODO
                this.tw.write(e.args[2].getLiteral()).nl()
            } else if (/^Json Builder->set (string|number|boolean|field|builder)$/.test(pn) ||
                       /->set at$/.test(pn)) {
                this.tightExpr(e.args[0])
                this.tw.op0("[")
                this.dispatch(e.args[1])
                this.tw.op0("] = ").sep()
                this.dispatch(e.args[2])
            } else if (/^Json (Builder|Object)->(string|number|boolean|field)$/.test(pn) ||
                       /->at$/.test(pn)) {
                this.tightExpr(e.args[0])
                this.tw.op0("[")
                this.dispatch(e.args[1])
                this.tw.op0("]")
            } else if (pn == "Web->create json builder") {
                this.tw.op0("{}")
            } else if (pn == "Create->collection of" || /^Collections->.* collection$/.test(pn)) {
                this.tw.op0("(<")
                this.type(e.getKind())
                this.tw.op0(">[])")
            } else if (/->count$/.test(pn)) {
                this.tightExpr(e.args[0])
                this.tw.op0(".length")
            } else if (/^(Json|Collection).*->add$/.test(pn)) {
                this.tightExpr(e.args[0])
                this.tw.op0(".push(")
                this.dispatch(e.args[1])
                this.tw.op0(")")
            } else if (pn == "Web->json") {
                if (e.args[1].getLiteral())
                    this.tw.op0("(").write(e.args[1].getLiteral()).op0(")")
                else {
                    this.tw.write("JSON.parse(")
                    this.dispatch(e.args[1])
                    this.tw.write(")")
                }
            } else {
                this.tightExpr(e.args[0])
                this.tw.op0(".")
                this.simpleId(p.getName())
                params(e.args.slice(1))
            }
        }

        tightExpr(e:Expr)
        {
            if (e instanceof ThingRef ||
                (e instanceof Call && this.infixPri(e) == 0) ||
                e instanceof Literal) {
                this.dispatch(e)
            } else {
                this.tw.op0("(")
                this.dispatch(e)
                this.tw.op0(")")
            }
        }

        visitExprHolder(eh:ExprHolder)
        {
            if (eh.isPlaceholder())
                this.tw.write("/* placeholder */")
            else
                this.dispatch(eh.parsed)
        }

        static opmap:StringMap<string> = {
            "not": "!",
            "and": "&&",
            "or": "||",
            "\u2225": "+",
            "=": "==",
            ":=": "=",
        }

        printOp(s:string)
        {
            if (Converter.opmap.hasOwnProperty(s))
                this.tw.op(Converter.opmap[s])
            else
                this.tw.op(s)
        }

        private simpleId(n:string)
        {
            return this.tw.jsid(this.localCtx.unUnicode(n))
        }

        visitPropertyRef(p:PropertyRef)
        {
            this.tw.op0(".")
            this.simpleId(p.getText())
        }

        visitLiteral(l:Literal)
        {
            if (l.data === undefined) return
            if (typeof l.data == "number")
                this.tw.write(l.stringForm || l.data.toString())
            else if (typeof l.data == "string")
                this.tw.write(JSON.stringify(l.data))
            else if (typeof l.data == "boolean")
                this.tw.kw(l.data ? "true" : "false")
            else
                l.writeTo(this.tw)
        }

        visitThingRef(t:ThingRef)
        {
            var d = t.def
            if (d instanceof LocalDef)
                this.localName(<LocalDef>d)
            else if (d instanceof SingletonDef) {
                this.tw.write("TD.")
                this.simpleId(d.getName())
            }
            else
                this.simpleId(d.getName())
            // TODO placeholder for options
        }

        visitAnyIf(i:If)
        {
            var tw = this.tw
            if (i.isTopCommentedOut()) {
                tw.op0("/*").nl()
                this.dispatch(i.rawThenBody)
                tw.op0("*/").nl()
                return
            }

            if (!i.branches) return

            i.branches.forEach((b, k) => {
                if (!b.condition) {
                    if (!b.body.isBlockPlaceholder()) {
                        tw.keyword("else")
                        this.dispatch(b.body)
                    }
                } else {
                    if (k > 0)
                        tw.keyword("else")
                    tw.keyword("if").sep().op0("(")
                    this.dispatch(b.condition)
                    tw.op0(")")
                    this.dispatch(b.body)
                }
            })
        }

        // TODO for
        // TODO foreach

        visitWhile(n:While)
        {
            var tw = this.tw
            tw.keyword("while").sep().op0("(")
            this.dispatch(n.condition)
            tw.op0(")")
            this.dispatch(n.body)
        }

        visitExprStmt(es:ExprStmt)
        {
            if (es.isVarDef())
                this.tw.kw("var")
            this.dispatch(es.expr)
            this.tw.op0(";").nl()
        }

        codeBlockInner(b:CodeBlock)
        {
            var inThen = false
            b.stmts.forEach((s, i) => {
                if (s.isPlaceholder()) {
                    if (i > 0)
                        this.tw.nl()
                    return
                }
                if (!s._converterAwait) {
                    this.dispatch(s)
                    return
                }

                if (s instanceof ExprStmt) {
                    this.tw.write("return ")
                    var expr = (<ExprStmt>s).expr.parsed
                    var af = new AsyncFinder()
                    af.dispatch(expr)
                    this.visitCallInner(af.lastAsync)
                    this.tw.nl()
                    if (inThen) this.tw.endBlock(")")

                    this.currAsync = af.lastAsync
                    if (i == b.stmts.length - 1) {
                        if (expr != af.lastAsync) {
                            this.tw.write(".then(_ => ")
                            this.dispatch(expr)
                            this.tw.write(")").nl()
                        }
                        inThen = false
                    } else {
                        this.tw.write(".then(_ => ").beginBlock()
                        if (expr != af.lastAsync) {
                            this.dispatch(expr)
                            this.tw.op0(";").nl();
                        }
                        inThen = true
                    }
                    this.currAsync = null

                    return
                } else if (inThen) {
                    this.dispatch(s)
                    this.tw.endBlock(")")
                } else {
                    this.tw.write("return Promise.as()").nl()
                    this.tw.write(".then(() => ").beginBlock()
                    this.dispatch(s)
                    this.tw.endBlock(")")
                }

                if (i == b.stmts.length - 1)
                    inThen = false
                else {
                    this.tw.write(".then(() => ").beginBlock()
                    inThen = true
                }
            })
            if (inThen) this.tw.endBlock(")")
        }

        visitCodeBlock(b:CodeBlock)
        {
            this.tw.beginBlock()
            this.codeBlockInner(b)
            this.tw.endBlock()
        }

        visitAction(a:Action)
        {
            this.localCtx = new TsQuotingCtx()
            this.tw.kw("export function")
            this.tw.globalId(a).op0("(");
            a.getInParameters().forEach((p, i) => {
                if (i > 0) this.tw.op0(",")
                this.localDef(p.local)
            })
            this.tw.op0(")").op(":");
            if (a.isAtomic) {
                var outp = a.getOutParameters()
                if (outp.length == 0) this.tw.kw("void")
                else if (outp.length == 1) this.type(outp[0].getKind())
                else {
                    this.tw.op("{")
                    outp.forEach(p => {
                        this.localDef(p.local).op0(";")
                    })
                    this.tw.op("}")
                }
            } else {
                this.tw.kw("Promise")
            }

            this.tw.nl()
            this.tw.beginBlock()

            a.getOutParameters().forEach(p => {
                this.tw.kw("var")
                this.localDef(p.local)
                this.tw.op0(";").nl()
            })

            this.codeBlockInner(a.body)

            if (a.getOutParameters().length == 1) {
                this.tw.kw("return")
                this.localName(a.getOutParameters()[0].local).op0(";").nl()
            }

            this.tw.endBlock()
        }
    }
}
