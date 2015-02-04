///<reference path='refs.ts'/>


module TDev { export module AST {
    export class TokenWriter
    {
        private buf = "";
        private indentLevel = 0;
        private newlinesPending = 0;
        public lastChar = " ";
        private lastBlockEnd = -1;
        private lastAfterBlockEnd = -1;
        public skipActionBodies = false;

        public unicodeOps = true;
        public unicodeStrings = true;

        static forStorage()
        {
            var tw = new TokenWriter();
            return tw;
        }

        public write(s:string)
        {
            if (this.newlinesPending > 0)
            {
                // This makes serialization much slower
                /*
                var last = this.buf.length - 1;
                while (last >= 0 && this.buf.charAt(last) == ' ')
                    last--;
                if (last != this.buf.length - 1)
                    this.buf = this.buf.slice(0, last + 1);
                */

                while (this.newlinesPending > 0)
                {
                    this.newlinesPending--;
                    this.buf += "\n";
                }

                for (var i = 0; i < this.indentLevel; ++i)
                    this.buf += "  ";

                this.lastChar = ' ';
            }

            this.buf += s;
            if (s.length > 0)
                this.lastChar = s.charAt(s.length - 1);

            return this;
        }

        public finalizeShort()
        {
            return this.buf;
        }

        public finalize(skipNL = false)
        {
            if (!skipNL)
                this.nl().write("");
            return this.buf;
        }

        public backspaceBlockEnd()
        {
            Util.assert(this.lastAfterBlockEnd == this.buf.length);
            this.buf = this.buf.slice(0, this.lastBlockEnd);
            this.newlinesPending = 1;
            this.lastChar = ' ';
            this.indentLevel++;
        }

        public beginBlock()
        {
            this.space().op0("{").nl();
            this.indentLevel++;
        }

        public endBlock()
        {
            this.lastBlockEnd = this.buf.length;
            this.indentLevel--;
            this.op0("}").nl();
            this.lastAfterBlockEnd = this.buf.length;
        }

        public space()
        {
            if (this.lastChar != ' ')
            {
                this.buf += " ";
                this.lastChar = ' ';
            }
            return this;
        }

        public sep()
        {
            var c = this.lastChar;
            if (!(c == ' ' || c == '(' || c == '['))
            {
                this.buf += ' ';
                this.lastChar = ' ';
            }
            return this;
        }

        public id(id:string) { return this.sep().write(Lexer.quoteId(id)); }
        public id0(id:string) { return this.write(Lexer.quoteId(id)); }
        public string(id:string) { return this.sep().write(Lexer.quoteString(id, !this.unicodeStrings)); }

        public uniqueId(id:string)
        {
            if (!id) {
                return this;
            }
            this.op0("#").id0(id);
            return this
        }

        public kind(app:App, k:Kind)
        {
            var par = k.parentLibrary()

            if (par && !par.isThis()) {
                par.writeRef(this);
                this.op("\u2192")
            } else if (k.isUserDefined()) {
                this.op("*")
            }
            this.id(k.getRoot().getName())

            if (k instanceof ParametricKind) {
                var pk = <ParametricKind>k;

                if (pk.parameters && pk.parameters.length > 0) {
                    this.op0("[");
                    pk.parameters.forEach((p, i) => {
                        if (i > 0) this.op(",");
                        this.kind(app, p);
                    })
                    this.op0("]");
                }
            }

            return this
        }

        public op0(op:string)
        {
            if (!this.unicodeOps)
                op = Lexer.asciiOperator(op);
            if (Lexer.quotedOp(op)) op = "`" + op + "`";
            return this.write(op);
        }

        public op(op:string) { return this.space().op0(op).space(); }
        public keyword(kw:string) { return this.sep().write(kw); }

        public nl()
        {
            this.newlinesPending++;
            this.lastChar = ' ';
            return this;
        }

        public metaOpt(k:string, v:string)
        {
            if (!v)
                return this;
            else
                return this.meta(k, v);
        }

        public meta(k:string, v:string) { return this.keyword("meta").id(k).string(v).op0(";").nl(); }

        static normalizeComment(lines:string)
        {
            lines = lines.replace(/\r\n/g, "\n");
            lines = lines.replace(/\r/g, "\n");
            return lines.trim();
        }

        public comment(lines:string)
        {
            TokenWriter.normalizeComment(lines).split('\n').forEach((l) => {
                this.op("//").space().write(l.trim().replace(/\\/g, "\\\\")).nl();
            });
            return this;
        }

        public stringAttr(n:string, v:string) { return this.id(n).op("=").string(v).op0(";").nl(); }
        public boolOptAttr(n:string, v:boolean)
        {
            if (v)
                this.id(n).op("=").keyword("true").op0(";").nl();
            return this;
        }

        public boolAttr(n:string, v:boolean)
        {
            return this.id(n).op("=").keyword(v ? "true" : "false").op0(";").nl();
        }

        public node(n:AST.AstNode)
        {
            n.writeTo(this);
            return this;
        }
    }
} }
