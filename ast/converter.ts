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

        public globalId(id:string)
        {
            return this.jsid(this.globalCtx.quote(id, 0))
        }

        public jsid(id:string) {
            if (!/^[a-zA-Z_]\w*$/.test(id))
                Util.oops("bad id: " + id)
            return this.sep().write(id);
        }

        public kw(k:string) { return this.keyword(k) }
    }

    export class Converter 
        extends NodeVisitor 
    {
        private tw = new TsTokenWriter();
        private localCtx = new TsQuotingCtx();

        constructor(private app:App)
        {
            super()
        }

        public run()
        {
            this.dispatch(this.app)
            return this.tw.finalize()
        }

        private localName(l:LocalDef)
        {
            return this.tw.jsid(this.localCtx.quote(l.getName(), l.nodeId))
        }

        private type(t:Kind)
        {
            //TODO
            this.tw.kind(this.app, t)
            return this.tw
        }

        private localDef(l:LocalDef)
        {
            this.localName(l).op(":")
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
            return p.getInfixPriority() || 0
        }

        visitCall(e:Call)
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
                    this.printOp(p.getName())
                    doParen(e.args[1])
                }

            } else if (e.referencedData()) {
                this.tw.globalId(e.referencedData().getName())
            } else if (e.calledAction()) {
                this.tw.globalId(e.calledAction().getName())
                params(e.args.slice(1))
            } else if (pn == "App->javascript" || pn == "App->javascript async") {
                // TODO
                this.tw.write(e.args[2].getLiteral()).nl()
            } else {
                if (e.args[0] instanceof Call && !e.args[0].referencedData()) {
                    this.tw.op0("(")
                    this.dispatch(e.args[0])
                    this.tw.op0(")")
                } else {
                    this.dispatch(e.args[0])
                }
                this.tw.op0(".")
                this.simpleId(p.getName())
                params(e.args.slice(1))
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
            l.writeTo(this.tw)
        }

        visitThingRef(t:ThingRef)
        {
            var d = t.def
            if (d instanceof LocalDef)
                this.localName(<LocalDef>d)
            else
                this.simpleId(d.getName())
        }

        visitExprStmt(es:ExprStmt)
        {
            this.dispatch(es.expr)
            this.tw.op(";").nl()
        }

        visitAnyIf(i:If)
        {
            var tw = this.tw
            if (i.isElseIf)
                tw.keyword("else")
            tw.keyword("if").op("(")
            this.dispatch(i.rawCondition)
            tw.op(")")
            this.dispatch(i.rawThenBody)
            if (!i.rawElseBody.isBlockPlaceholder()) {
                tw.keyword("else")
                this.dispatch(i.rawElseBody)
            }
        }

        visitCodeBlock(b:CodeBlock)
        {
            this.tw.beginBlock()
            b.stmts.forEach(s => this.dispatch(s))
            this.tw.endBlock()
        }

        visitAction(a:Action)
        {
            this.localCtx = new TsQuotingCtx()
            this.tw.kw("export function")
            this.tw.globalId(a.getName()).op0("(");
            a.getInParameters().forEach((p, i) => {
                if (i > 0) this.tw.op(",")
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
                        this.localDef(p.local).op(";")
                    })
                    this.tw.op("}")
                }
            } else {
                this.tw.kw("Promise")
            }

            this.tw.nl()
            this.dispatch(a.body)
        }
    }
}
