///<reference path='refs.ts'/>

module TDev.AST {
    class TsQuotingCtx
        extends QuotingCtx
    {
        public unUnicode(s:string)
        {
            s = s.replace(/[^a-zA-Z0-9]+/g, "_");
            if (s == "" || /^[0-9]/.test(s)) s = "_" + s;
            return s;
        }

    }

    class TsTokenWriter
        extends TokenWriter
    {
        private globalCtx = new TsQuotingCtx();

        public globalId(id:string, cat = "")
        {
            return this.id(this.globalCtx.quote(id, cat))
        }

        public kw(k:string) { return this.keyword(k) }
    }

    export class Converter 
        extends AllNodeVisitor 
    {
        private tw = new TsTokenWriter();
        private localCtx = new TsQuotingCtx();

        constructor(private app:App)
        {
        }

        public run()
        {
            this.app.dispatch(this)
        }

        private localName(l:LocalDef)
        {
            return this.tw.id(this.localCtx.quote(l.getName(), l.nodeId))
        }

        private type(t:Kind)
        {
            //TODO
            this.tw.kind(t)
            return this.tw
        }

        private localDef(l:LocalDef)
        {
            this.localName(l).op(":")
            return this.type(l.getKind())
        }

        visitExprHolder(eh:ExprHolder)
        {
            eh.writeTo(this.tw)
        }

        visitExprStmt(es:ExprStmt)
        {
            this.visit(es.expr)
            this.op(";").nl()
        }

        visitAnyIf(i:If)
        {
            var tw = this.tw
            if (i.isElseIf)
                tw.keyword("else")
            tw.keyword("if").op("(")
            this.visit(i.rawCondition)
            tw.op(")")
            this.visit(i.rawThenBody)
            if (!i.rawElseBody.isBlockPlaceholder()) {
                tw.keyword("else")
                this.visit(i.rawElseBody)
            }
        }

        visitCodeBlock(b:CodeBlock)
        {
            this.tw.beginBlock()
            b.stmts.forEach(s => this.visit(s))
            this.tw.endBlock()
        }

        visitAction(a:Action)
        {
            this.localCtx = new TsQuotingCtx()
            this.tw.kw("export function")
            this.tw.globalId(a.getName()).op0("(");
            a.getInParameters().forEach((p, i) => {
                if (i > 0) this.tw.op(",")
                this.localDef(p)
            })
            this.tw.op0(")").op(":");
            if (a.isAtomic) {
                var outp = a.getOutParameters()
                if (outp.length == 0) this.kw("void")
                else if (outp.length == 1) this.type(outp[0].getKind())
                else {
                    this.op("{")
                    outp.forEach(p => {
                        this.localDef(p).op(";")
                    })
                    this.op("}")
                }
            } else {
                this.kw("Promise")
            }

            this.tw.nl()
            this.visit(a.body)
        }
    }
}
