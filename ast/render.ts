///<reference path='refs.ts'/>

module TDev
{
    export class Renderer
        extends AST.NodeVisitor
    {
        static spacedText(t:string) {
            switch (t) {
                case "0":
                case "1":
                case "2":
                case "3":
                case "4":
                case "5":
                case "6":
                case "7":
                case "8":
                case "9":
                case "(":
                case ")":
                case ".":
                case "":
                case " ":
                    return t;
                case ",":
                    return ", ";
                case "not":
                    return "not ";
                default:
                    return " " + t + " ";
            }
        }

        static opName(s:string) {
            if (!AST.proMode) return s
            switch (s) {
            case "\u2260": return "!="
            case "\u2264": return "<="
            case "\u2265": return ">="
            case "=":      return "=="
            default:
                return s
            }
        }

        static quoteString(s:string) {
            var r = "";
            for (var i = 0; i < s.length; ++i) {
                var c = s.charAt(i);
                var o:string;
                switch (c) {
                    case "\t": o = "\\t"; break;
                    case "\"": o = "\\\""; break;
                    case "\\": o = "\\\\"; break;
                    case "\r": o = "\\r"; break;
                    case "\n": o = "\\n"; break;
                    default: o = c; break;
                }
                r = r + o;
            }
            return r;
        }

        constructor() {
            super()
            this.mdComments = new MdComments(this, null)
        }

        static tdiv(cl: string, s: string) { return "<div class='" + cl + "'>" + s + "</div>"; }
        static tspan(cl: string, s: string) { return "<span class='" + cl + "'>" + Util.htmlEscape(s) + "</span>"; }
        static tspanRaw(cl: string, s: string) { return "<span class='" + cl + "'>" + s + "</span>"; }

        public kw(k:string) { return Renderer.tspan("kw", " " + k + " "); }
        public kw0(k:string) { return Renderer.tspan("kw", k); }
        public greyKw(k:string) { return Renderer.tspan("greyed", " " + k + " "); }
        public id(kw:string) { return Util.htmlEscape(kw); }
        public name(name: string) { return Renderer.tspan("name", Util.htmlEscape(name));}
        public kind(k:Kind) { return Util.htmlEscape(k.toString()); }
        public op(kw:string) { return Util.htmlEscape(Renderer.spacedText(kw)); }
        public st(kw:string) { return Renderer.tspan("st", kw); }
        public tline(s:string) {
            return Renderer.tdiv("line", s.trim() + (this.showDiff || AST.blockMode ? "" :
                "<span class='lineSpacer'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>")) + "<br/>"; }

        public isAux = false;
        public shortNameHeuristicsApplied = false;
        public shortNameHeuristics = false;
        public stringLimit = 30;
        public codeReplacement:string;
        public mdComments : MdComments;
        public renderingSnippet = false;
        public highlightLevel = 0;
        public showDiff = false;
        public hideErrors = false;
        public formatComments = true;
        public skipComments = false;
        public numDiffs = 0;

        public interpretedComment(n:AST.Comment)
        {
            if (!this.renderingSnippet) return false;
            var m = /^\s*\{(\/)?highlight\}\s*$/.exec(n.text);
            if (m) {
                if (m[1]) this.highlightLevel--;
                else this.highlightLevel++;
                return true;
            }
            return false;
        }

        public renderBlock(lst:AST.Block)
        {
            if (this.isAux) return "";

            if (this.showDiff)
                return this.renderSnippet(lst.stmtsWithDiffs())
            return this.renderSnippet(lst.stmts);
        }

        public renderDecl(d:AST.Decl)
        {
            this.highlightLevel = 0;
            this.renderingSnippet = true;
            try {
                return Renderer.tdiv("decl", d.accept(this))
            } finally {
                this.renderingSnippet = false;
            }
        }

        public renderSnippet(s:AST.AstNode[])
        {
            var res = "";
            var prevHl = this.highlightLevel
            var prevSnip = this.renderingSnippet
            this.highlightLevel = 0;
            this.renderingSnippet = true;
            try {
                for (var i = 0; i < s.length; ++i)
                    res += s[i].accept(this);
                return Renderer.tdiv("block", res);
            } finally {
                this.renderingSnippet = prevSnip
                this.highlightLevel = prevHl
            }
        }

        private wrapError(n:AST.AstNode, r:string)
        {
            if (n.getError() != null)
                return "<span class='errorSq'>" + r + "</span>";
            else
                return r;
        }

        public renderTokens(t:AST.Token[])
        {
            var res = "";
            if (this.shortNameHeuristics) {
                var sna = -2;
                for (var i = 0; i < t.length; ++i) {
                    if (t[i] instanceof AST.PropertyRef && sna == i - 1) {
                        res += this.id("\u200A" + t[i].getText())
                    } else {
                        this.shortNameHeuristicsApplied = false;
                        res += t[i].accept(this);
                        if (this.shortNameHeuristicsApplied) sna = i;
                    }
                }
            } else {
                for (var i = 0; i < t.length; ++i)
                    res += t[i].accept(this);
            }
            return res;
        }

        private renderArtUrl(kind: Kind, v: string): string {
            if (kind == api.core.String && v)
                return Renderer.tdiv("stringLiteral",
                    Util.htmlEscape(
                        TDev.RT.String_.trim_overflow(TDev.RT.String_.valueFromArtUrl(v), 400)
                    )
                    );
            return this.renderString(v, 200);
        }
        
        public renderBitmatrix(v: string, options?: { cls?: string; maxCols?: number; height?: number; }): string {
            options = options || {};
            
            var bits: boolean[][] = (v || "").trim().split("\n").map(row => row.split(/[\s\r\n]+/).map(s => {
                var x = parseInt(s); if (isNaN(x)) x = 0;
                return !!x;
            }));

            var maxCols = options.maxCols || 45;
            var height = options.height || 1;
            var f = 50; var f2 = f / 2;
            var r1 = "";
            var r0 = "";
            var w = 0;            
            var rows = bits.length;
            if (!v) rows = 5;
            var h = rows * f;
            var ellipse = false;
            for (var y = 0; y < rows; ++y) {
                var row = bits[y] || [];
                var cols = Math.max(rows, Math.min(row.length, maxCols));
                w = Math.max(w, cols * f + Math.floor(cols /5) * f);
                ellipse = ellipse || cols < row.length;
                for (var x = 0; x < cols; ++x) {
                    var bit = row[x];
                    var left = f * x + Math.floor(x / 5) * f;
                    var top = f * y;
                    var width = f2;
                    if (bit) { width += 4; left -= 2; top -= 2; }
                    var path = Util.fmt(" M {0} {1} {2} {3} {4} {5} {6} {7} Z",
                        left, top, left+width, top, left+width, top+width, left, top+width);
                    if (bit) r1 += path; else r0 += path;
                }
            }
            var viewPort = Util.fmt("0 0 {0} {1}", w, h);
            var svg = Util.fmt("<path class='biton' d='{0}'/><path class='bitoff' d='{1}'/>", r1, r0);
            var result = Util.fmt("<span class='kbm {0}' style='width:{1}em'>{2}</span>",
                options.cls || "",
                w / h * height + 0.1,
                SVG.svgBoilerPlate(viewPort, svg));
            if (ellipse) result += Renderer.tspan("stringLiteral", "...");
            return result;
        }

        public renderHintArtId(v: string, id: string): string {
            var url = Cloud.artUrl(id, true);
            return Util.fmt("<img class='picLiteral' src='{0}' alt='{1}' />", url, Renderer.quoteString(TDev.RT.String_.trim_overflow(v, this.stringLimit)))
        }
        
        public renderEnumVal(v: string): string {
            return Renderer.tspan("stringLiteral", Renderer.quoteString(TDev.RT.String_.trim_overflow(v, this.stringLimit)));            
        }
        
        public renderString(v:string, lim = this.stringLimit) : string
        {
            return Renderer.tspan("stringLiteral", "\"" + Renderer.quoteString(TDev.RT.String_.trim_overflow(v, lim)) + "\"");
        }

        public visitRecordName(n: AST.RecordName) {
            return this.id(n.data);
        }

        public visitFieldName(n: AST.FieldName) {
            return this.id(n.data) + this.op(":");
        }

        public visitLiteral(n:AST.Literal)
        {
            var v = n.data;
            var div:string;

            switch (typeof v) {
            case "number":
                v = v + "";
                Util.die();
                break;
            case "boolean":
                div = Renderer.tspan("kw", v ? "true" : "false");
                break;
            case "string":
                if (/^bitmatrix|bitframe$/i.test(n.languageHint)) div = this.renderBitmatrix(v);
                else if (n.enumVal) div = this.renderEnumVal(v);
                else div = this.renderString(v);
                if (n.hintArtId) div += this.renderHintArtId(v, n.hintArtId);
                break;
            default:
                Util.die();
            }
            return this.wrapError(n, div);
        }

        public visitPropertyRef(n:AST.PropertyRef)
        {
            var nm = n.getText();
            var arrow = n.getOrMakeProp().getArrow()
            if (n.skipArrow) arrow = "\u200A"
            return this.wrapError(n, this.id(arrow + nm));
        }

        public visitThingRef(n:AST.ThingRef)
        {
            if (this.codeReplacement && !n.forceLocal && n.getText() == 'code')
                return this.codeReplacement;

            var sn = n.shortName();

            if (!sn && this.shortNameHeuristics && !n.forceLocal) {
                var knd = api.getKind(n.getText())
                if (knd && knd instanceof ThingSetKind)
                    sn = knd.shortName();
                this.shortNameHeuristicsApplied = true;
            }

            if (n.def instanceof AST.PlaceholderDef) {
                var pl = <AST.PlaceholderDef>n.def;
                return this.wrapError(n, Util.fmt("<span class='placeholder'>{0:q}</span>", pl.label || pl.getKind().toString()))
            }

            var content = "";
            if (!sn) content = this.id(n.getText());
            else {
                if (Browser.isAndroid) {
                    var svg = SVG.codeSignHtml(sn);
                    if (svg) content = "<span class='svg-symbol'>" + svg + "</span>";
                    else content = Renderer.tspan("id symbol", sn);
                } else {
                    content = Renderer.tspan("id symbol", sn);
                }
            }
            return this.wrapError(n, content);
        }

        public visitOperator(n:AST.Operator)
        {
            var s = n.getText();
            var r = this.op(Renderer.opName(s));
            if (/^[a-z]+$/.test(s))
                r = this.kw(s);

            var args = n.getFunArgs()
            if (args) {
                if (args.length == 1) s = args[0]
                else s = "(" + args.join(", ") + ")"
                r = this.id(s + " ⇒ ")
            }

            //if (/^[0-9\.]$/.test(s))
            //    r = Renderer.tspan("numberLiteral", s)
            return this.wrapError(n, r);
        }

        private diffWords(tokens:string[])
        {
            var res = ""

            for (var i = 0; i < tokens.length; i += 2) {
                if (tokens[i] == null || tokens[i + 1] == null)
                    break;
                res += tokens[i + 1]
            }

            if (i >= tokens.length) return res;

            this.numDiffs++
            res = ""
            for (var i = 0; i < tokens.length; i += 2) {
                if (tokens[i] != null && tokens[i + 1] != null)
                    res += Renderer.tspanRaw("diffTokenUnchanged", tokens[i + 1])
                else if (tokens[i] != null)
                    res += Renderer.tspanRaw("diffTokenRemoved", tokens[i])
                else
                    res += Renderer.tspanRaw("diffTokenAdded", tokens[i+1])
            }

            return Renderer.tspanRaw("diffTokensChanged", res)
        }

        public renderDiffTokens(tokens:AST.Token[])
        {
            var toks = tokens.map(t => t ? <string>t.accept(this) : null)
            return this.diffWords(toks)
        }

        public visitExprHolder(e:AST.ExprHolder)
        {
            return this.renderExprHolder(e, e.tokens)
        }

        public renderExprHolder(e:AST.ExprHolder, tokens:AST.Token[]):string
        {
            if (this.showDiff && e.diffTokens) return this.renderDiffTokens(e.diffTokens)

            var res: string = this.renderTokens(tokens);
            if (!e.profilingExprData && !e.debuggingData)
                return res;
            if (e.profilingExprData) {
                var index = Math.floor(e.profilingExprData.duration / AST.ExprHolder.profilingDurationBucketSize);
                var color: string = AST.ExprHolder.heatmapColors[index];
                return "<span style='background-color:" + color + "'>" + res + "</span>" +
                       "<span class='profile' style='background-color:" + color + "'>" +
                       Math.round(e.profilingExprData.duration) + "ms/" + Math.round(e.profilingExprData.count) + "</span>";
            }

            if (e.debuggingData) {
                if (e.debuggingData.critical && e.debuggingData.max) {
                    var scorePartial = e.debuggingData.critical / e.debuggingData.max.critical;
                    var score = Math.floor(scorePartial * 27); // there are 28 colors, first of them is white
                    var color: string = AST.ExprHolder.heatmapColors[score];
                    var ret = "<span style='background-color:" + color + "'>" + res + "</span>";
                    if (dbg) ret += ("<span class='profile' style='background-color:" + color + "'>" + Math.floor(scorePartial*100) + "%</span>");
                    return ret;
                } else if (e.debuggingData.visited) {
                    return "<span style='background-color:#eaf3ff'>" + res + "</span>";
                } else if (e.debuggingData.alwaysTrue) {
                    return "<span style='background-color:#daffda'>" + res + "</span>";
                } else if (e.debuggingData.alwaysFalse) {
                    return "<span style='background-color:#ffdada'>" + res + "</span>";
                } else return res;
            }
        }

        public diffClass(n:AST.Stmt)
        {
            var diffClass = ""
            if (this.showDiff) {
                if (n.diffStatus < 0) {
                    this.numDiffs++
                    return " diffStmtRemoved";
                }
                else if (n.diffStatus > 0) {
                    this.numDiffs++
                    return " diffStmtAdded";
                }
            }
            return "";
        }

        public diffMoveMarker(n:AST.Stmt)
        {
            if (this.showDiff) {
                var moveId = 0;
                moveId = -n.diffStatus - 2;
                if (moveId < 0 && n.diffAltStmt)
                    moveId = -n.diffAltStmt.diffStatus - 2;
                if (moveId >= 0)
                    return "<div class='diffMoveMarker'>" + moveId + "</div>";
            }
            return "";
        }

        public stmtClass(n:AST.Stmt)
        {
            var tp = n.nodeType()
            var cat = "other"

            switch (tp) {
                case "inlineActions":
                case "exprStmt":
                    cat = "exprStmt"; break;

                case "actionHeader":
                case "inlineAction":
                    cat = "action"; break;

                case "recordDef":
                case "libraryRef":
                case "globalDef":
                    cat = "decl"; break;

                case "while":
                case "for":
                case "foreach":
                    cat = "loop"; break;

                case "elseIf":
                case "if":
                    cat = "if"; break;

                case "recordField":
                case "actionParameter":
                    cat = "field"; break;
            }

            return " stmt-" + cat + " stmt-" + tp
        }

        public stmt(n:AST.Stmt, args:string, f:(e:HTMLElement)=>void = undefined, blockNode:AST.Stmt = null)
        {
            if (this.showDiff)
                args = Renderer.tdiv(this.diffClass(n) + this.stmtClass(blockNode || n), args + this.diffMoveMarker(n))
            if (this.highlightLevel > 0)
                return Renderer.tdiv("code-highlight", args) + "<!-- HL -->";
            return Renderer.tdiv("stmt" + this.stmtClass(blockNode || n), args);
        }

        private expr(e:AST.ExprHolder)
        {
            if (e.isPlaceholder())
                return this.id("...");
            else
                return this.dispatch(e);
        }

        public message(cls:string, content:string)
        {
            return Renderer.tdiv(cls, content) + "<br class='errorBr'/>";
        }

        public errorNum(num:string)
        {
            if (!num) return "";
            else return "<span class='errorNumber'> [" + num + "]</span>";
        }

        public errorHTML(node:AST.AstNode)
        {
            if (node instanceof AST.ExprStmt) {
                var exprStmt = <AST.ExprStmt>node;
                if (exprStmt.expr) {
                    var dd = exprStmt.expr.debuggingData;
                    if (dd && dd.errorMessage)
                        return "<span class='symbol'>\u26a1</span> " + Util.htmlEscape(dd.errorMessage);
                }
            }
            var err = node.getError();
            if (err != null) {
                var errNum = "";
                err = err.replace(/^(TD\d\d\d): /, (mtch, en) => {
                    errNum = en;
                    return "";
                });
                return Util.htmlEscape("\u2639 " + err) + this.errorNum(errNum)
            } else {
                return ""
            }
        }

        public possibleError(node:AST.AstNode):any {
            if (this.isAux || this.showDiff || this.hideErrors) return "";
            var err = node.getError();
            var res = "";
            var errH = this.errorHTML(node)
            if (errH)
                res += this.message(node.errorIsOk ? "hintMessage" : "errorMessage", errH)

            if (res == "" && node instanceof AST.Stmt) {
                var tw = (<AST.Stmt>node).tutorialWarning
                if (tw) {
                    tw.split("\n").forEach(m => {
                        if (m)
                            res += this.message("errorMessage", Util.htmlEscape("[T] " + m))
                    })
                }
            }

            if (res == "" && node instanceof AST.Stmt) {
                var hint = (<AST.Stmt>node).getHint()
                if (hint)
                    hint.split("\n").forEach(h => {
                        res += this.message("hintMessage", Util.htmlEscape("\u270e " + h))
                    })
            }

            if (node.annotations)
                node.annotations.forEach(a => {
                    res += this.message(a.category == "error" ? "errorMessage fromPlugin" : "hintMessage fromPlugin",
                                        "<span class='svg-symbol'>" + (a.pluginRef == "caller" ?
                                            SVG.getIconSVGCore("bug,#7057D3,clip=100") :
                                            SVG.getIconSVGCore("plug,#7057D3,clip=100")) + "</span> " +
                                        Util.htmlEscape(a.message))
                })

            return res;
        }

        private renderExprStmt(n:AST.ExprStmt, suffix = "")
        {
            if (n.isPlaceholder()) {
                if (AST.proMode)
                    return this.tline("<span class='greyed'>&nbsp;;</span>");
                else
                    return this.tline("<span class='greyed'>do nothing</span>");
            } else {
                var toks = this.renderExprHolder(n.expr, n.expr.tokens)
                toks += suffix
                if (n.isVarDef())
                    toks = this.kw("var ") + toks;
                else if (!AST.blockMode && n.isPagePush())
                    toks = this.kw("push ") + toks;
                return this.tline(toks) + this.possibleError(n);
            }
        }

        public visitExprStmt(n:AST.ExprStmt)
        {
            if (!this.showDiff && this.formatComments) {
                var doc = n.docText()
                if (doc != null) {
                    var inner = this.tline(Renderer.tdiv("md-comment", 
                        this.mdComments.formatText(doc)))
                    return this.stmt(n, inner + this.possibleError(n));
                }
            }
            return this.stmt(n, this.renderExprStmt(n))
        }

        public visitOptionalParameter(o:AST.OptionalParameter)
        {
            var name = this.diffTwoWords(o.getName(), o.diffAltStmt ? (<AST.OptionalParameter>o.diffAltStmt).getName() : null)
            return this.stmt(o, this.tline(this.kw("with ") + name + this.op("=") + this.dispatch(o.expr)) +
                                this.possibleError(o))
        }

        public visitInlineAction(a:AST.InlineAction)
        {
            var renderHead = (a:AST.InlineAction) => {
                var r = [this.kw(a.isOptional ? "with " : "where "), this.id(a.name.getName())]

                var renderParms = (parms:AST.LocalDef[]) => {
                    var first = true;
                    r.push(this.op("("))
                    parms.forEach((p) => {
                        if (!first) r.push(this.op(", "))
                        first = false;
                        r.push(this.id(p.getName()), this.op(":"), this.kind(p.getKind()))
                    });
                    r.push(this.op(")"))
                }

                renderParms(a.inParameters);
                if (a.outParameters.length > 0) {
                    r.push(this.kw(" returns "))
                    renderParms(a.outParameters);
                }

                if (AST.proMode)
                    r.push(this.st(" {"))
                else
                    r.push(this.kw(" is"))

                return r;
            }

            var ss = this.diffLine(a, a.diffAltStmt, renderHead) +
                     this.possibleError(a) +
                     this.renderBlock(a.body) +
                     this.endKeyword("")
            return this.stmt(a, ss);
        }

        public visitInlineActions(n:AST.InlineActions)
        {
            var last = n.implicitAction()
            var hasImplicit = !!last

            var suff = ""
            if (!this.isAux && hasImplicit && n.actions.stmts.length == 1)
                suff = AST.proMode ? this.st(" {") : this.kw("do")

            var expr = this.renderExprStmt(n, suff);

            if (!this.isAux) {
                var body = n.actions.stmts.slice(0)
                if (hasImplicit) {
                    body.pop()
                    expr += this.renderSnippet(body)
                    if (!suff)
                        expr += this.tline(AST.proMode ? this.st(" {") : this.kw("do"))
                    expr += this.possibleError(last)
                    expr += this.renderBlock(last.body)
                    expr += this.tline(AST.proMode ? this.st("}") : this.kw("end"))
                } else {
                    expr += this.renderSnippet(body)
                    if (!AST.proMode && body.length > 0)
                        expr += this.endKeyword("")
                }
            }
            return this.stmt(n, expr)
        }

        public visitWhile(n:AST.While)
        {
            return this.stmt(n,
                (AST.proMode ?
                    this.tline(this.kw("while") + this.st(" (") + this.expr(n.condition) + this.st(") {")) :
                    this.tline(this.kw("while") + this.expr(n.condition) + this.kw("do"))) +
              this.possibleError(n) +
              this.renderBlock(n.body) +
              this.endKeyword("while"));
        }

        public visitBox(n:AST.Box)
        {
            return this.stmt(n,
              this.tline(this.kw("boxed") + (AST.proMode ? this.st("{") : "")) +
              this.possibleError(n) +
              this.renderBlock(n.body) +
              this.endKeyword("boxed"));
        }


        public visitComment(n:AST.Comment)
        {
            function tokenize(n:AST.Comment)
            {
                var toks = ["<div translate=yes class='md-comment'>"]
                n.text.replace(/[^\s]+\s*/g, (m) => {
                    toks.push(Util.htmlEscape(m))
                    return ""
                })
                toks.push("</div>")
                return toks
            }

            var inner = ""
            if (this.showDiff) {
                inner = this.diffLine(n, n.diffAltStmt, tokenize)
            } else {
                if (this.interpretedComment(n)) return "";
                if (!this.skipComments) {
                    if (this.formatComments)
                        inner = this.tline(Renderer.tdiv("md-comment", this.mdComments.formatText(n.text, n)))
                    else
                        inner = this.tline("<span class='comment'> " + Util.formatText(n.text) + "</span>")
                }
            }
            return this.stmt(n, inner + this.possibleError(n));
        }

        public endKeyword(name:string)
        {
            if (AST.proMode)
                return this.tline(this.st("}")/* + this.greyKw(" // " + name) */);
            else
                return this.tline(this.kw("end ") + this.greyKw(name));
        }

        public visitFor(n:AST.For)
        {
            var idiff = this.diffTwoWords(n.boundLocal.getName(), n.diffAltStmt ? (<AST.For>n.diffAltStmt).boundLocal.getName() : null)
            var i = this.id(n.boundLocal.getName())
            return this.stmt(n,
                (AST.proMode ?
                      //this.tline(this.kw("for") + this.st("(") + this.kw0("var ") + idiff + Renderer.tspan("greyed", " = 0; " + i + " < ") +
                      //           this.expr(n.upperBound) + Renderer.tspan("greyed", "; " + i + " = " + i + " + 1") + this.st(") {")) :
                      this.tline(this.kw("for") + this.st("(") + this.kw0("var ") + idiff + this.st(" < ") +
                                 this.expr(n.upperBound) + this.st(") {")) :
                      this.tline(this.kw("for") + this.id("0") + this.op("\u2264") + idiff + this.op("<") +
                                 this.expr(n.upperBound) + this.kw("do"))
                ) +
              this.possibleError(n) +
              this.renderBlock(n.body) +
              this.endKeyword("for")
              );
        }

        public visitForeach(n:AST.Foreach)
        {
            var hasWhere = n.conditions.stmts.length > 0
            return this.stmt(n,
              this.tline(this.kw("for each ") + (AST.proMode ? this.st("(") + this.kw0("var ") : "") +
                this.diffTwoWords(n.boundLocal.getName(), n.diffAltStmt ? (<AST.Foreach>n.diffAltStmt).boundLocal.getName() : null) +
                this.kw("in") + this.expr(n.collection) +
                    (AST.proMode ? this.st(")") + (hasWhere ? "" : this.st(" {"))
                                        : (!hasWhere ? this.kw("do") : ""))) +
              this.possibleError(n) +
              (hasWhere ?
               this.renderBlock(n.conditions) +
               this.tline(AST.proMode ? this.st("{") : this.kw("do")) : "") +
              this.renderBlock(n.body) +
              this.endKeyword("for each")
              );
        }

        public visitWhere(n:AST.Where)
        {
            return this.stmt(n, this.tline(this.kw("where") + this.expr(n.condition)) + this.possibleError(n));
        }

        public visitAnyIf(n:AST.If):string
        {
            var children =
              AST.proMode ?
                this.tline((n.isElseIf ? this.st("}") + this.kw("else if") : this.kw("if")) + this.st(" (") + this.expr(n.rawCondition) + this.st(") {")) :
                this.tline(this.kw(n.isElseIf ? "else if" : "if") + this.expr(n.rawCondition) + this.kw("then"))

            children += this.possibleError(n);

            if (n.isTopCommentedOut()) {
                children += Renderer.tdiv("block-comment", this.renderBlock(n.rawThenBody))
                // children += this.endKeyword("if false")
                return this.stmt(n, children);
            } else {
                children += this.renderBlock(n.rawThenBody);
            }

            if (this.isAux) return children;

            if (n.displayElse) {
                if (n.rawElseBody.isBlockPlaceholder()) {
                    return this.stmt(n, children) +
                        this.stmt(n.rawElseBody.stmts[0] || n,
                        AST.proMode ?
                            this.tline(this.st("}") + this.kw("else") + this.st("{ }")) :
                            this.tline(this.kw("else") + Renderer.tspan("greyed", "do nothing") + this.kw(" end ") + this.greyKw("if")),
                                     (e:HTMLElement) => e.setFlag("elseDoNothing", true), n);
                } else {
                    if (AST.proMode)
                        children += this.tline(this.st("}") + this.kw("else") + this.st("{"));
                    else
                        children += this.tline(this.kw("else"));
                    children += this.renderBlock(n.rawElseBody);
                    children += this.endKeyword("if")
                }
            }

            return this.stmt(n, children);
        }

        public visitActionParameter(n:AST.ActionParameter)
        {

            var finaltok = this.op((<AST.Block>n.parent).stmts.peek() == n ? ")" : ",")
            var str = this.diffLine(n, n.diffAltStmt,
                n => [this.id(n.getName()), this.op(":"), this.kind(n.getKind()), finaltok])
            return this.stmt(n, str + this.possibleError(n));
        }

        private actionKeyword(a:AST.Action)
        {
            if (a.isEvent()) return "event";
            else if (a.isPage()) return "page";
            return "function";
        }

        public renderAppHeader(app: AST.App) {
            var hd = "";

            if (app.isLibrary) hd += this.kw("library ");
            hd += this.kw("script ");
            hd += this.id(TDev.RT.String_.trim_overflow(app.getName(), 64));
            return Util.fmt("<div id='stmt-script' class='stmt stmt-appHeader'>{0}</div>", this.tline(hd));
        }
        
        private renderActionHeader(n:AST.ActionHeader)
        {
            var inParms = "";
            var returns = "";
            var outParms = "";

            var hd = "";

            if (n.action.isPrivate) hd += this.kw("private ");
            //if (!n.action.isEvent() && !n.action.isPrivate) hd += this.kw("public ");
            if (n.action.isAtomic && !n.action.isPage()) hd += this.kw("atomic ");
            if (n.action.isTest()) hd += this.kw("test ");
            if (n.action.isOffline) hd += this.kw("offline ");
            if (n.action.isQuery) hd += this.kw("query ");

            hd += this.kw(this.actionKeyword(n.action));

            if (n.action.isActionTypeDef())
                hd += this.kw(" type")

            hd += this.id(n.getName())

            if (n.action.hasInParameters()) {
                hd += this.op(" (");
                inParms = this.renderBlock(n.inParameters);
            } else {
                hd += this.op(" ()");
            }
            if (n.action.hasOutParameters()) {
                returns = this.tline(this.kw("returns") + this.op(" ("));
                outParms = this.renderBlock(n.outParameters);
            }

            if (AST.proMode && !inParms && !outParms)
                hd += this.st(" {")

            return this.tline(hd) +
              inParms +
              returns +
              outParms +
              this.possibleError(n.action);
        }

        public addModelFieldHint()
        {
            return ""
        }

        public visitActionHeader(n:AST.ActionHeader)
        {
            var body = this.renderActionHeader(n);
            var a = n.action;

            if (a.isActionTypeDef())
                return this.stmt(n, body)

            if (a.isPage()) {
                var inner = ""

                if (a.modelParameter) {
                    var k = a.modelParameter.getKind()
                    if (k instanceof AST.RecordEntryKind) {
                        var r = (<AST.RecordEntryKind>k).getRecord()
                        inner +=
                            this.tline(this.kw("data")) +
                            (r.values.stmts.length == 0 ? this.addModelFieldHint() : this.renderBlock(r.values))
                    }
                }

                inner +=
                    this.tline(this.kw("initialize")) +
                    this.renderBlock(a.getPageBlock(true)) +
                    this.tline(this.kw("display")) +
                    this.renderBlock(a.getPageBlock(false));
                return this.stmt(n, body + inner + this.endKeyword("page"));
            }

            if (a.hasOutParameters() || a.hasInParameters())
                body += this.tline(AST.proMode ? this.st("{") : this.kw("do"));

            return this.stmt(n, body + this.renderBlock(a.body) + this.endKeyword(this.actionKeyword(a)));
        }

        public visitLibraryRef(n:AST.LibraryRef)
        {
            return this.stmt(n,
                    this.tline(this.kw("import") + this.id(n.getName())) +
                        this.tline(this.kw(n.isPublished() ? "published" : "local") + this.id(n.getId())) +
                        this.possibleError(n) +
                        this.renderBlock(n.resolveClauses));
        }

        public visitRecordDef(n:AST.RecordDef)
        {
            var keys = n.keys.count() > 0
               ? (this.tline(this.kw((n.getKeyTerminology() || "key") + "s")) + this.renderBlock(n.keys))
               : "";
            var values = (n.values.count() > 0 && n.getValueTerminology())
               ? (this.tline(this.kw(n.getValueTerminology() + "s")) + this.renderBlock(n.values))
               : "";

            var kw1 = this.stmt(n.recordPersistence, this.tline(this.kw(n.getPersistenceDescription())));
            var spacer = n.getPersistenceDescription().length
                ? "&nbsp;"
                : "";
            var kw2 = this.stmt(n.recordKind, this.tline(this.kw(n.getDefTerminology())));
            var kw3 = this.stmt(n.recordNameHolder, this.tline(this.id(n.getCoreName())));
            var header = this.diffLine(n, n.diffAltDecl, n => [kw1, spacer, kw2, "&nbsp;", kw3])
            return this.stmt(n, this.possibleError(n) + header + keys + values);
        }

        private diffTwoWords(s:string, alt:string) : string
        {
            if (!this.showDiff || !alt || alt == s) return AST.proMode ? Renderer.tspan("greyed", s) : this.id(s);
            return this.diffWords([this.id(alt), null, null, this.id(s)])
        }

        private diffLine<T,S>(stmt:T, alt:S, f:(e:T)=>string[]) : string
        {
           var w0 = f(stmt)
           var r = ""
           if (this.showDiff && alt) {
               var w1 = f(<any>alt)
               var w2 = AST.Diff.minimalEditDistance(w1, w0, (a, b) => a == b)
               r = this.diffWords(w2)
           } else {
               if (w0.length == 0) return "";
               r = w0.join("")
           }
           return this.tline(r)
        }

        public visitRecordField(n:AST.RecordField)
        {
            var comments = n.commentBlock.children()
                    .map(c => this.visitComment(<AST.Comment>c))
                    .join("");

            var pref = n.def() && n.def().isModel ? AST.modelSymbol + "\u200A" : ""
            var str = this.diffLine(n, n.diffAltStmt,
                (n) => [
                    this.id(pref + n.getName()),
                    this.op(":"),
                    this.kind(n.dataKind)
                ]);

            // comments rendered outside of the statement, since they are
            // statements themselves
            return comments + this.stmt(n, str + this.possibleError(n));
        }

        private libName(l:AST.LibraryRef) { return Renderer.tspan("id symbol", AST.libSymbol) + (l ? this.id(l.getName()) : "?") }

        public visitResolveClause(n:AST.ResolveClause)
        {
            return this.stmt(n,
              this.tline(this.kw("uses") + this.id(n.getName()) + this.kw("bound to") + this.libName(n.defaultLib) + this.kw("with")) +
              this.possibleError(n) +
              this.renderBlock(n.kindBindings) +
              this.renderBlock(n.actionBindings));
        }

        public visitActionBinding(n:AST.ActionBinding)
        {
            if (this.showDiff && !n.isExplicit) return ""
            return this.stmt(n, this.tline((n.isExplicit ? this.kw("explicit") : "") +
                            this.kw("function") + this.id(n.formalName) + this.kw("bound to") +
                            this.libName(n.actualLib) + this.id("\u200A\u2192\u00A0" + (n.getActualName()))) +
                    this.possibleError(n))
        }

        public visitKindBinding(n:AST.KindBinding)
        {
            if (this.showDiff && !n.isExplicit) return ""
            return this.stmt(n, this.tline( /*(n.isExplicit ? this.kw("explicit") : "") + */
                            this.kw("type") + this.id(n.formalName) + this.kw("bound to") + this.kind(n.actual)) +
                    this.possibleError(n))
        }

        public visitAction(n:AST.Action)
        {
            return this.dispatch(n.header);
        }

        public visitGlobalDef(n:AST.GlobalDef)
        {
            var l0 = this.diffLine(n, n.diffAltDecl,
                n => [this.kw(n.isResource ? "art" : "data"), this.id(n.getName()), this.op(":"), this.kind(n.getKind())])
            var l1 = this.diffLine(n, n.diffAltDecl,
                n => n.isResource && n.url ? [this.kw("with"), this.id("data: "), this.renderArtUrl(n.getKind(), n.url)] : [])
            return this.stmt(n, l0 + l1) + this.possibleError(n);
        }

        public visitDecl(n: AST.Decl)
        {
            Util.check(false);
            return this.tline("Displaying " + n.getName() + " not implemented.");
        }

        public renderDiff(n: AST.App, showAll = false)
        {
            this.showDiff = true

            var th = n.things.concat(n.diffRemovedThings || [])
            AST.App.orderThings(th)
            var r = ""
            th.forEach(t => {
                var show = showAll || t.diffStatus
                var prevNum = this.numDiffs
                var str = this.dispatch(t)
                if (prevNum != this.numDiffs) show = true
                if (show)
                    r += Renderer.tdiv("decl " + (t.diffStatus < 0 ? "diffDeclRemoved" : t.diffStatus > 0 ? "diffDeclAdded" : ""),
                                       str)
            })
            return r
        }

        public visitApp(n: AST.App)
        {
            var r = ""
            n.orderedThings().forEach((t) => {
                r += Renderer.tdiv("decl", this.dispatch(t));
            });
            return r;
        }

        public renderPropertySig(prop:IProperty, withLinks = false, withKind = true, withKeyword = true)
        {
            var inParms = "";
            var returns = "";
            var outParms = "";

            var topicLink = (name:string, topic = name) => {
                if (!withLinks) return this.id(name);
                return "<a href='#topic:" + MdComments.shrink(topic) + "'>" + this.id(name) + "</a>";
            }

            var kindLink = (k:Kind) => {
                //if (!withLinks) return this.kind(k);
                if (!withLinks) return this.id(k.getName());
                return "<a href='#topic:" + MdComments.shrink(k.getName()) + "'>" + this.kind(k) + "</a>";
            }

            if ((<any>prop)._extensionAction) prop = (<any>prop)._extensionAction;            
            var propi = <IPropertyWithNamespaces>prop;            
            var isExtension = propi.isExtensionAction && propi.isExtensionAction();            
            var params = prop.getParameters().slice(0);
            var hd = "";            
            if (withKeyword)           
                hd += this.kw("function ");
            if (withKind) {
                if (isExtension) {
                    var __this = params[0];
                    hd += kindLink(__this.getKind());
                } else {
                    if (prop.parentKind.singleton)
                        hd += topicLink(prop.parentKind.singleton.getName())
                    else {
                        var ns: string = (<IPropertyWithNamespaces>prop).getNamespaces ? (<IPropertyWithNamespaces>prop).getNamespaces()[0] : undefined;
                        this.id
                        if (ns) hd += this.name(ns);
                        else hd += "(" + kindLink(prop.parentKind) + ")";
                    }
                }    
                params.shift();
                hd += "\u200A\u2192\u00A0";
            }
            hd += this.name(prop.getName())

            var parms = params.map((p) =>
                (withLinks ? "<br/>" : "") +
                "<span class='sig-parameter'>" + this.id(p.getName()) + "</span>" + this.op(":") + kindLink(p.getKind()))

            if(parms.length > 0)
                hd += "(" + parms.join(", ") + ")"

            var rt = prop.getResult().getKind();
            if (rt != api.core.Nothing) {
                hd += (withLinks ? "<br/>" : "");
                hd += this.kw("returns") + kindLink(rt);
            }

            return Renderer.tdiv("signature", hd);
        }
    }

    export class CopyRenderer
        extends Renderer
    {
        static css = "<style>\n" +
                     "@font-face { font-family: \"TD Symbols\"; src:url(data:application/x-font-woff;base64,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);}\n"+
                     "@page { margin: 1in; }\n" +
                      ".md-tutorial { font-size: 1.0em; line-height: 1.4em; }\n"+
                      "@media print { .md-tutorial a:link:after, .md-tutorial a:visited:after  { content:\" (\" attr(href) \") \"; } }\n"+                      
                      ".parse-error, .decl { margin-bottom: 1em; }\n" +
                      ".parse-error, .error { color: #d00; }\n" +
                      ".hint { color: #444; }\n" +
                      ".errorNumber { color: #aaa; }\n" +
                      ".kw, .keyword { font-weight: bold; color: black; }\n" +
                      ".kbm { display:inline-block;} .kbm svg { height: 1em; vertical-align: middle; margin-left: 0.2em; }\n" +
                      ".kbm svg > path.biton { fill:#000; } .kbm svg > path.bitoff { fill:#ccc; }\n" +
                      ".code-highlight { border: 1px dashed gray; font-weight:bold; }\n" +
                      ".comment { color:#444; font-style:italic; }\n" +
                      ".greyed { color:#444; }\n" +
                      ".api-kind { border: 1px dotted #BBB; padding: 0.4em; clear: both; font-size: 1.2em; margin-bottom: 0.6em; }\n" +
                      ".md-snippet { border: 1px dotted #bbb; padding: 0.4em 0; clear: both; line-height: 1.3em; page-break-inside:avoid; }\n" +
                      ".md-snippet .signature { padding:0em 0.2em 0em 0.2em; }\n" + 
                      ".md-snippet .name { font-weight: bold;}\n" +
                      ".md-img { margin:0.5em; clear:both; width:100%; text-align:center; position:relative; }\n" +
                      ".md-img-inner { position:relative; display:inline-block; width:100%; }\n" +
                      ".md-img .caption { font-size:0.8em; }\n" +
                      ".md-img img { max-height: 100%; max-width: 100%; }\n" +
                      ".md-box { page-break-inside: avoid; }\n" +
                      ".md-box-header, .md-box-header-print { font-weight: bold; font-size: 1.2em; }\n" +
                      ".md-box, .md-box-landscape, .md-box-portrait { margin-left: 2em;  margin-bottom:0.5em; border: 1px solid #555; border-left-width: 0.5em; padding: 1em; }\n" +
                      ".md-box-avatar { margin-bottom:0.5em; } .md-box-avatar-img { width:4em; display:inline-block; vertical-align:top;} .phone .md-box-avatar-img { width:3em; } .md-box-avatar-body { position:relative; padding:0em 0.5em 0em 0.5em; color:#000; background:#eeeeee; margin-left:1.5em; display:inline-block; width: calc(100% - 7em); } .phone .md-box-avatar-body { width: calc(100% - 6em); } .md-box-avatar-body:after { top: 1.1em; left: -1.5em; bottom: auto; border-width: 0px 1.5em 0.7em 0; border-color: transparent #eeeeee; content: ''; position: absolute; border-style: solid; display: block; width: 0; }\n"+
                      "@media print { .md-box-screen { display:none; } }\n" +
                      ".md-box-card { border: solid 1px black; background: inherit; margin-left:inherit; min-height:4em;}\n" +
                      "a { color:black; }\n" +
                      "a.md-api-entry-link, .api-kind a { text-decoration: none; }\n" +
                      ".api-desc { color: black; font-size: 0.8em; }\n" +
                      ".signature { font-size: 1.3em; }\n" +
                      ".md-api-entry { color: black; border: 1px dotted #BBB; padding: 0.6em 1em 0.5em 1em; margin: 0.5em 0; }\n" +
                      ".md-api-header { font-size: 1.4em; margin-bottom: 1em; }\n" +
                      ".md-api-header .signature { margin-bottom: 0.4em; }\n" +
                      ".md-api-header .sig-parameter { display:inline-block; margin-left: 4em; }\n" +
                      ".md-para { margin-top: 1em; margin-bottom: 1em; }\n"+
                      ".block .md-para { margin: 0; }\n"+
                      "span.stringLiteral { word-break: break-all; } div.stringLiteral { white-space:pre-wrap; }\n" +
                      ".picLiteral { height:1em; vertical-align: bottom;}\n"+
                      ".md-warning { background-color:lightyellow; border-left:solid 0.25em red; padding:0.5em; margin-left:2em;}\n"+
                      "div.md-video-link { position: relative; } div.md-video-link > img { width: calc(100 % - 1em); } div.md-video-link > svg { position: absolute;left:0em; bottom: 0em; width:25%; } @media print { div.md-video-link > svg { display:none; }  }\n" +
                      "@media print { a.md-external-link:link:after, a.md-external-link:visited:after { content: ' (' attr(href) ') '; font-size: 80%; } }\n"+
                      "svg.video-play { width: calc(100% - 1em); background-size:cover; background-repeat:no-repeat;}\n"+
                      ".nopara .md-para { margin:0; }\n"+
                      '.symbol { font-family: "TD Symbols", inherit; }\n' +
                      ".placeholder { font-size: 0.7em; padding: 0.2em; border: 1px dotted gray; }\n" +
                      ".md-comment, .md-comment h1, .md-comment h2, .md-comment h3, .md-comment h4 { display: inline-block; margin:0; }\n" +
                      'code { font-size: 1.0em; font-family: Calibri, \"Helvetica Neue\", HelveticaNeue, Helvetica, Arial, "TD Symbols", sans-serif; border: 1px dotted #bbb; padding: 0em 0.2em 0.1em 0.2em; white-space:nowrap; }\n' +
                      "code.md-ui { border: 2px solid #777; padding-left:0.2em; padding-right:0.2em; white-space:nowrap; }\n" +
                      ".block { margin-left: 1em; }\n" +
                      ".stmt { border-left: 0.2em solid #aaa; margin-top: 0.2em; }\n" +
                      ".line { margin-left: 0.4em; }\n" +
                      ".tutorial-step { font-size: 1.7em; }\n" +
                      ".tutorial-step .md-comment { font-size: 0.6em; }\n" +
                      ".decl > .stmt { border: none; }\n" +
                      ".print-big { font-size: 1.5em; }\n" +
                      "a.md-bigbutton {}\n" +
                      "@media print { #MicrosoftTranslatorWidget { display: none; } .body, .inner, .primary-content__inner, .md-tutorial { margin:0; padding:0; } }\n" +
                      'body { font-family: Calibri, "Helvetica Neue", HelveticaNeue, Helvetica, Arial, "TD Symbols", sans-serif; }\n' +
                      "@page { size: auto; margin: 1cm 1cm 1cm 1cm; }" +
                      "</style>";

                      //".stmt-comment { border: none; }\n" +
                      //".stmt-comment > .line { margin-left: 0; }\n" +

        constructor()
        {
            super();
            this.stringLimit = 1000;
            this.formatComments = false;
        }

        public tline(s:string) {
            return Renderer.tdiv("line", s.trim());
        }

        public kw(s:string) {
            return " <span class='keyword'>" + Util.htmlEscape(s) + "</span> ";
        }

        public message(cls:string, s:string)
        {
            if (/error/.test(cls))
                return "<div class='error'>" + s.trim() + "</div>";
            else
                return "<div class='hint'>" + s.trim() + "</div>";
        }

        public visitActionBinding(n:AST.ActionBinding)
        {
            if (!n.isExplicit && !n.getError()) return "";
            return super.visitActionBinding(n);
        }

        public visitKindBinding(n:AST.KindBinding)
        {
            if (!n.isExplicit && !n.getError()) return "";
            return super.visitKindBinding(n);
        }

        static styleMap = {
            '<span class=.keyword':     "font-weight: bold; color: #41900D",
            '<div class=.block':        "margin-left: 1em",
            '<div class=.md-snippet':   "border: 1px dotted #bbb; padding: 0.5em; margin-left: 2em",
            '<div class=.md-para':      "margin: 1em 0",
            '<div class=.md-img':       "margin: 0.5em; text-align: center",
        }

        static inlineStyles(text:string):string
        {
            var bodyStyle =
                "font-family: 'Segoe UI', 'Helvetica', sans-serif;" +
                "font-size:16px;" +
                //"max-width: 600px;" +
                //"margin: 1em auto;" +
                "margin: 0.5em;" +
                "";

            Object.keys(CopyRenderer.styleMap).forEach(s => {
                var inl = CopyRenderer.styleMap[s]
                var ss = Util.fmt(" style='{0:q}'", inl)
                text = text.replace(new RegExp(s + "[\"']", "g"), (m) => m + ss)
            })

            return Util.fmt("<div class='column' style='{0:q}'><!--HEADER-->{1}<!--FOOTER--></div>", bodyStyle, text)
        }
    }
}
