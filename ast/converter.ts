///<reference path='refs.ts'/>

module TDev.AST {
    class TsQuotingCtx
        extends QuotingCtx
    {
        static keywords:StringMap<number> = {
            "break":1,
            "case":1,
            "class":1,
            "catch":1,
            "const":1,
            "continue":1,
            "debugger":1,
            "default":1,
            "delete":1,
            "do":1,
            "else":1,
            "export":1,
            "extends":1,
            "finally":1,
            "for":1,
            "function":1,
            "if":1,
            "import":1,
            "in":1,
            "instanceof":1,
            "let":1,
            "new":1,
            "return":1,
            "super":1,
            "switch":1,
            "this":1,
            "throw":1,
            "try":1,
            "typeof":1,
            "var":1,
            "void":1,
            "while":1,
            "with":1,
            "yield":1,
            "enum":1,
            "await":1,
            "implements":1,
            "package":1,
            "protected":1,
        }
        
        public unUnicode(s:string)
        {
            s = s.replace(/\s+([A-Za-z])/g, (v,l) => l.toUpperCase())
            s = s.replace(/[^a-zA-Z0-9]+/g, "_");
            if (s == "" || /^[0-9]/.test(s) || TsQuotingCtx.keywords.hasOwnProperty(s)) s = "_" + s;
            return s;
        }
    }

    class TsTokenWriter
        extends TokenWriter
    {
        public globalCtx = new TsQuotingCtx();

        constructor()
        {
            super()
            this.indentString = "    ";
        }

        public globalId(d:Decl, pref = "")
        {
            var n = d.getName()
            if (d instanceof Action) {
                var a = <Action>d;
                if (!a.isAtomic)
                    n += "Async"
            } else if (d instanceof RecordDef) {
                n = n[0].toUpperCase() + n.slice(1)
            }
            return this.jsid(this.globalCtx.quote(pref + n, 0))
        }

        public sep():TokenWriter
        {
            if (" ([<.".indexOf(this.lastChar) >= 0) return this;
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
            s.normalActions().forEach(a => a.name._converterAction = a)
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
        private apis:StringMap<number> = {};
        public useExtensions = true;

        constructor(private app:App)
        {
            super()
        }

        public run()
        {
            new ConverterPrep().dispatch(this.app)
            this.dispatch(this.app)
            var keys = Object.keys(this.apis)
            keys.sort((a, b) => this.apis[a] - this.apis[b])
            var newApis = {}
            keys.forEach(k => newApis[k] = this.apis[k])
            return {
                text: this.tw.finalize(),
                apis: newApis,
            }
        }

        private localName(l:LocalDef)
        {
            if (l == this.thisLocal)
                return this.tw.kw("this")
            return this.tw.jsid(this.localCtx.quote(l.getName(), l.nodeId))
        }

        static kindMap:StringMap<string> = {
            "String": "string",
            "Number": "number",
            "Boolean": "boolean",
            "Nothing": "void",
            "DateTime": "Date",
            "Json Object": "JsonObject",
            "Json Builder": "JsonBuilder",
            "Buffer": "Buffer",
        }

        private type(t:Kind)
        {
            if (t.getRoot() == api.core.Collection) {
                this.type(t.getParameter(0))
                this.tw.op0("[]")
            } else if (t.getRoot() == api.core.Task) {
                this.tw.write("Promise<")
                this.type(t.getParameter(0))
                this.tw.write(">")
            } else if (t.getRecord()) {
                var parL = t.getRecord().parentLibrary()
                if (parL && !parL.isThis())
                    this.tw.globalId(parL).op0(".");
                this.tw.globalId(t.getRecord())
            } else if (t.parentLibrary()) {
                if (!t.parentLibrary().isThis())
                    this.tw.globalId(t.parentLibrary()).op0(".");
                var n = t.getName()
                n = n[0].toUpperCase() + n.slice(1)
                this.tw.jsid(this.tw.globalCtx.quote(n, 0))
            } else if (Converter.kindMap.hasOwnProperty(t.toString())) {
                this.tw.kw(Converter.kindMap[t.toString()])
            } else {
                this.tw.write("td.").id(this.localCtx.unUnicode(t.getRoot().toString()))
                var len = t.getParameterCount()
                if (len > 0) {
                    this.tw.write("<")
                    this.type(t.getParameter(0))
                    this.tw.write(">")
                }
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

        private toRegex(e:Expr, flags = "") {
            var l = e.getLiteral()
            if (l)
                this.tw.write("/" + l.replace(/\\?\//g, "\\/") + "/" + flags)
            else {
                this.tw.write("new RegExp(")
                this.dispatch(e)
                if (flags)
                    this.tw.write(", " + JSON.stringify(flags))
                this.tw.write(")")
            }
        }

        private infixPri(e:Expr)
        {
            var p = e.getCalledProperty()
            if (!p) return 0
            if (p.getName() == "is invalid")
                return 5 // '== null'
            if (e instanceof Call && e.funAction)
                return 0.1 // => function
            if (p.parentKind == api.core.String) {
                if (p.getName() == "equals" || p.getName() == "is empty")
                    return 5
                // + in JS
                if (p == api.core.StringConcatProp)
                    return 10
            } else if (p.parentKind == api.core.Boolean) {
                if (p.getName() == "not") {
                    var a0 = (<Call>e).args[0].getCalledProperty()
                    if (a0 && a0.getName() == "is invalid")
                        return 5 // '!= null'
                    if (a0 && a0.parentKind == api.core.String && (a0.getName() == "is empty" || a0.getName() == "equals"))
                        return 5 // '!= ""'
                    return 50
                }
            } else if (e instanceof Call && e.awaits()) {
                return 40
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
                this.tw.write("await").space()
            }

            this.visitCallInner(e)
        }

        propName(e:Expr)
        {
            var p = e.getCalledProperty()
            if (!p) return null
            return p.parentKind.getRoot().toString() + "->" + p.getName()
        }

        static prefixGlue:StringMap<string> = {
              "String->replace": "td.replaceAll",
              "String->starts with": "td.startsWith",
              "App->server setting": "td.serverSetting",
              "Time->now": "new Date",
              "Json Builder->keys": "Object.keys",
              "Json Object->keys": "Object.keys",
              "Contract->assert": "assert",
              "Bits->string to buffer": "new Buffer",
              "Time->sleep": "td.sleepAsync",
              "String->to number": "parseFloat",
              "Json Builder->copy from": "td.jsonCopyFrom",
              "String->contains": "td.stringContains",
              "Collection->to json": "td.arrayToJson",
              "Web->encode uri component": "encodeURIComponent",
              "Json Object->to collection": "asArray",
              "Json Builder->to collection": "asArray",
              "Math->min": "Math.min",
              "Math->max": "Math.max",
              "Math->round": "Math.round",
              "Math->floor": "Math.floor",
              "Math->random": "td.randomInt",
              "Math->random range": "td.randomRange",
              "Math->random normalized": "td.randomNormalized",
              "Json Builder->to string": "td.toString",
              "Json Object->to string": "td.toString",
              "Json Builder->to number": "td.toNumber",
              "Json Object->to number": "td.toNumber",
              "App->create logger": "td.createLogger",
        }

        static methodRepl:StringMap<string> = {
          "Buffer->concat": "concat",
          "Buffer->to string": "toString",
          "Number->to string": "toString",
          "String->split": "split",
          "String->substring": "substr",
          "String->to upper case": "toUpperCase",
          "String->to lower case": "toLowerCase",
          "Json Builder->add": "push",
          "Json Builder->contains key": "hasOwnProperty",
          "Json Object->contains key": "hasOwnProperty",
          "Collection->add": "push",
          "Collection->where": "filter",
          "DateTime->milliseconds since epoch": "getTime",
          "String->to json": "",
          "Number->to json": "",
          "Task->await": "",
        }

        dumpJs(s:string)
        {
            this.tw.write("/*JS*/").nl()
            s.split("\n").forEach(l => {
                l = l.replace(/(TDev\.Util|lib)\.userError\(/g, "throw new Error(")
                this.tw.write(l).nl()
            })
        }

        visitCallInner(e:Call)
        {
            var p = e.getCalledProperty()
            var infixPri = this.infixPri(e)
            var pn = this.propName(e)
            if (infixPri == 40) infixPri = 0; // await only for inner
            
            var params = (pp:Expr[]) => {
                if (pp.peek() && pp.peek().isEscapeDef() && (<PlaceholderDef>(<ThingRef>pp.peek()).def).escapeDef.isEmpty)
                    pp.pop()
                this.pcommaSep(pp, p => this.dispatch(p))
            }

            if (p.parentKind == api.core.Unknown && /^(return|break|continue)$/.test(p.getName())) {
                this.tw.kw(p.getName())
                if (!e.args[0].isPlaceholder()) {
                    this.tw.sep()
                    this.dispatch(e.args[0])
                }
                return
            }

            if (infixPri) {
                if (p.getName() == "-" && e.args[0].getLiteral() === 0.0) {
                    this.tw.op0("-")
                    this.dispatch(e.args[1])
                    return
                }

                if (e.funAction) {
                    if (e.funAction.inParameters.length == 1) {
                        this.localName(e.funAction.inParameters[0])
                    } else {
                        this.pcommaSep(e.funAction.inParameters, p => this.localName(p))
                    }
                    this.tw.op("=>")
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

                if (p.getName() == "is invalid") {
                    doParen(e.args[0])
                    this.tw.sep().write("== null")
                } else if (p.getName() == "async") {
                    this.tw.write("/* async */ ")
                    this.dispatch(e.args[1])
                } else if (p.getName() == "is empty") {
                    var inner0 = e.args[0].getCalledProperty()
                    if (inner0 && inner0.getName() == "or empty") {
                        this.tw.op0("!")
                        this.tightExpr((<Call>e.args[0]).args[1])
                    } else {
                        doParen(e.args[0])
                        this.tw.sep().write("== \"\"")
                    }
                } else if (infixPri == 5 && p.getName() == "not") {
                    doParen((<Call>e.args[0]).args[0])
                    switch (e.args[0].getCalledProperty().getName()) {
                    case "is invalid": this.tw.sep().write("!= null"); break;
                    case "is empty": this.tw.sep().write("!= \"\""); break;
                    case "equals":
                        this.tw.op("!=");
                        doParen((<Call>e.args[0]).args[1]);
                        break;
                    default: Util.die()
                    }
                } else if (e.args.length == 1) {
                    this.printOp(p.getName())
                    doParen(e.args[0])
                } else if (e._assignmentInfo && e._assignmentInfo.targets && e._assignmentInfo.targets.length > 1) {
                    this.tw.sep().op0("[")
                    this.commaSep(e._assignmentInfo.targets, p => this.dispatch(p))
                    this.tw.op0("] =").sep()
                    this.dispatch(e.args[1])
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
            } else if (e.calledAction() || e.calledExtensionAction()) {
                var aa = e.calledExtensionAction() || e.calledAction()
                var args = e.args.slice(0)
                if (args[0].getKind() instanceof ThingSetKind) {
                    args.shift()
                }

                if (this.isExtension(aa) || aa.parent != this.app) {
                    this.tightExpr(args[0])
                    args.shift()
                    this.tw.op0(".")
                }

                this.tw.globalId(aa)
                params(args)
            } else if (pn == "App->javascript") {
                this.dumpJs(e.args[2].getLiteral())
            } else if (pn == "App->javascript async") {
                this.tw.write("new Promise(resume =>").beginBlock();
                this.dumpJs(e.args[2].getLiteral())
                this.tw.endBlock();
                this.tw.op0(")")
            } else if (p.parentKind instanceof RecordDefKind && p.getName() == "create") {
                this.tw.write("new ");
                this.type(e.getKind())
                params([])
            } else if (/^Invalid->/.test(pn) || (p.parentKind instanceof RecordDefKind && p.getName() == "invalid")) {
                this.tw.write("(<");
                this.type(e.getKind())
                this.tw.write(">null)");
            } else if (/^Json Builder->set (string|number|boolean|field|builder)$/.test(pn) ||
                       /->set at$/.test(pn)) {
                this.tightExpr(e.args[0])
                this.tw.op0("[")
                this.dispatch(e.args[1])
                this.tw.op0("] = ").sep()
                this.dispatch(e.args[2])
            } else if (/^Json (Builder|Object)->(string|number|boolean|field|remove field)$/.test(pn) ||
                       /->at$/.test(pn)) {
                if (/remove/.test(pn))
                    this.tw.kw("delete")
                this.tightExpr(e.args[0])
                this.tw.op0("[")
                this.dispatch(e.args[1])
                this.tw.op0("]")
            } else if (/^Web->json array$/.test(pn)) {
                this.tw.write("[]")
            } else if (/^Web->json object$/.test(pn)) {
                this.tw.write("{}")
            } else if (/^Json (Builder|Object)->serialize$/.test(pn)) {
                this.tw.write("JSON.stringify")
                params([e.args[0]])
            } else if (/^Json (Builder|Object)->format$/.test(pn)) {
                this.tw.write("JSON.stringify(")
                this.dispatch(e.args[0])
                this.tw.write(", null,").sep()
                this.dispatch(e.args[1])
                this.tw.write(")")
            } else if (/^Collection->remove at$/.test(pn)) {
                this.tightExpr(e.args[0])
                this.tw.write(".splice(")
                this.dispatch(e.args[1])
                this.tw.write(", 1)")
            } else if (/^Json (Builder|Object)->(to json|clone|to json builder)$/.test(pn)) {
                if (/^Web->json(| array| object)$/.test(this.propName(e.args[0]))) {
                    this.dispatch(e.args[0])
                } else {
                    this.tw.write("clone")
                    params([e.args[0]])
                }
            } else if (pn == "Web->create json builder") {
                this.tw.op0("{}")
            } else if ((e.getKind().getRoot() == api.core.Collection && e.args[0].getCalledProperty() &&
                        e.args[0].getCalledProperty().getName() == "Collection of")
                       || /->create collection$/.test(pn)
                       || /^Collections->.* collection$/.test(pn)) {
                this.tw.op0("(<")
                this.type(e.getKind())
                this.tw.op0(">[])")
            } else if ((e.getKind().getRoot() == api.core.Collection && e.args[0].getCalledProperty() &&
                        e.args[0].getCalledProperty().getName() == "map to")) {
                this.tightExpr((<Call>e.args[0]).args[0])
                this.tw.op0(".map<")
                this.type(e.getKind().getParameter(0))
                this.tw.op0(">")
                params([e.args[1]])
            } else if (/->count$/.test(pn)) {
                this.tightExpr(e.args[0])
                this.tw.op0(".length")
            } else if (pn == "String->replace regex with converter") {
                this.tw.write("td.replaceFn(")
                this.dispatch(e.args[0])
                this.tw.op0(",").sep()
                this.toRegex(e.args[1])
                this.tw.write("g,").sep()
                this.dispatch(e.args[2])
                this.tw.op0(")")
            } else if (pn == "String->match") {
                this.tw.op0("(")
                this.toRegex(e.args[1])
                this.tw.write(".exec(")
                this.dispatch(e.args[0])
                this.tw.op0(") || [])")
            } else if (pn == "String->is match regex") {
                this.toRegex(e.args[1])
                this.tw.write(".test(")
                this.dispatch(e.args[0])
                this.tw.op0(")")
            } else if (pn == "String->replace regex") {
                this.tightExpr(e.args[0])
                this.tw.write(".replace(")
                this.toRegex(e.args[1], "g")
                this.tw.op0(",").sep()
                this.dispatch(e.args[2])
                this.tw.op0(")")
            } else if (p.getName() == "\u25C8add") {
                this.dispatch(e.args[0])
                this.tw.op("+=")
                this.dispatch(e.args[1])
            } else if (p.parentKind.isAction && p.getName() == "run") {
                this.tightExpr(e.args[0])
                params(e.args.slice(1))
            } else if (Converter.prefixGlue.hasOwnProperty(pn)) {
                this.tw.write(Converter.prefixGlue[pn])
                var tmpargs = e.args.slice(0)
                if (tmpargs[0] && tmpargs[0].getThing() instanceof SingletonDef)
                    tmpargs.shift()
                params(tmpargs)
            } else if (Converter.methodRepl.hasOwnProperty(pn)) {
                this.tightExpr(e.args[0])
                if (Converter.methodRepl[pn] != "") {
                    this.tw.write("." + Converter.methodRepl[pn])
                    params(e.args.slice(1))
                }
            } else if (pn == "Web->json") {
                if (e.args[1].getLiteral())
                    this.tw.op0("(").write(e.args[1].getLiteral()).op0(")")
                else {
                    this.tw.write("JSON.parse(")
                    this.dispatch(e.args[1])
                    this.tw.write(")")
                }
            } else {
                if (!/^App Logger->/.test(pn)) {
                    if (!this.apis.hasOwnProperty(pn))
                        this.apis[pn] = 0
                    this.apis[pn]++
                }
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
            "\u2260": "!=",
            "\u2264": "<=",
            "\u2265": ">=",
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

        inlineAction(a:InlineAction)
        {
            if (!(<ActionKind>a.name.getKind()).isAtomic())
                this.tw.kw("async").space()
            this.pcommaSep(a.inParameters, p => this.localDef(p))
            this.tw.op("=>").beginBlock();

            a.outParameters.forEach(p => {
                this.tw.kw("let")
                this.localDef(p)
                this.tw.op0(";").nl()
            })

            this.codeBlockInner(a.body.stmts)

            if (a.outParameters.length >= 1) {
                this.tw.kw("return")
                this.localName(a.outParameters[0]).op0(";").nl()
            }

            this.tw.endBlock()
        }

        visitThingRef(t:ThingRef)
        {
            var d = t.def
            if (d instanceof LocalDef) {
                var a = (<LocalDef>d)._converterAction
                if (a) {
                    this.inlineAction(a)
                } else {
                    this.localName(<LocalDef>d)
                }
            } else if (d instanceof SingletonDef) {
                this.tw.write("TD.")
                this.simpleId(d.getName())
            } else if (t.isEscapeDef()) {
                var e = (<PlaceholderDef>d).escapeDef
                if (e.isEmpty) {
                    this.tw.op0("{}")
                    return
                }

                this.tw.beginBlock()
                    var vals = e.optionalConstructor.optionalParameters()
                    vals.forEach((p : InlineActionBase, i:number) => {
                        this.simpleId(p.recordField.getName()).op0(":").sep()
                        if (p instanceof OptionalParameter)
                            this.dispatch(p.expr)
                        else
                            this.inlineAction(<InlineAction>p)
                        if (i < vals.length - 1)
                            this.tw.op0(",")
                        this.tw.nl()
                    })
                this.tw.endBlock()
            }
            else
                this.simpleId(d.getName())
            // TODO placeholder for options
        }

        visitAnyIf(i:If)
        {
            var tw = this.tw

            if (false && i.isTopCommentedOut()) {
                tw.op0("/*").nl()
                this.codeBlockInner(i.rawThenBody.stmts)
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

        visitFor(f:For)
        {
            this.tw.kw("for (let").sep();
            this.localName(f.boundLocal).write(" = 0;").sep();
            this.localName(f.boundLocal).op("<");
            this.dispatch(f.upperBound);
            this.tw.op0(";").sep();
            this.localName(f.boundLocal).op0("++)");
            this.dispatch(f.body)
        }

        visitForeach(f:Foreach)
        {
            this.tw.kw("for (let").sep();
            this.localName(f.boundLocal).write(" of").sep();
            this.dispatch(f.collection);
            this.tw.op0(")");
            Util.assert(f.conditions.stmts.length == 0);
            this.dispatch(f.body)
        }

        visitWhile(n:While)
        {
            var tw = this.tw
            tw.keyword("while").sep().op0("(")
            this.dispatch(n.condition)
            tw.op0(")")
            this.dispatch(n.body)
        }

        visitInlineActions(i:InlineActions)
        {
            this.visitExprStmt(i)
        }

        visitExprStmt(es:ExprStmt)
        {
            if (es.isVarDef())
                this.tw.kw("let")
            this.dispatch(es.expr)
            this.tw.op0(";").nl()
        }

        codeBlockInner(stmts:Stmt[])
        {
            stmts.forEach((s, i) => {
                if (s.isPlaceholder()) {
                    if (i > 0)
                        this.tw.nl()
                } else {
                    this.dispatch(s)
                }
            })
        }

        visitCodeBlock(b:CodeBlock)
        {
            this.tw.beginBlock()
            this.codeBlockInner(b.stmts)
            this.tw.endBlock()
        }

        pcommaSep<T>(l:T[], f:(v:T)=>void) {
            this.tw.op0("(")
            this.commaSep(l, f)
            this.tw.op0(")")
        }

        commaSep<T>(l:T[], f:(v:T)=>void) {
            l.forEach((p, i) => {
                if (i > 0) this.tw.op0(",").sep()
                f(p)
            })
        }

        isOwnExtension(a:Action)
        {
            if (!this.useExtensions || !this.isExtension(a)) return false
            var r = this.getFirstRecord(a)
            return (r && r.parent == this.app)
        }

        isExtension(a:Action)
        {
            if (!this.useExtensions && a.parent == this.app)
                return false

            var p0 = a.getInParameters()[0]
            if (p0 && /\?$/.test(p0.getName()))
                return false

            var r = this.getFirstRecord(a)
            if (!r) {
                if (p0 && p0.local.getKind().parentLibrary() == a.parentLibrary())
                    return true
                return false
            }
            if (r.parent != a.parent)
                return false

            return true
        }

        getFirstRecord(a:Action):RecordDef
        {
            var p0 = a.getInParameters()[0]
            if (!p0) return null
            return p0.local.getKind().getRecord()
        }

        thisLocal:LocalDef;

        visitAction(a:Action)
        {
            var isExtension = this.isOwnExtension(a)

            this.localCtx = new TsQuotingCtx()
            this.thisLocal = null;
            var optsName = ""
            var optsLocal:LocalDef = null

            var printP = p => {
                if (/\?$/.test(p.getName())) {
                    optsLocal = p.local
                    optsName = this.localCtx.unUnicode(p.getName() + "0")
                    this.tw.jsid(optsName).write("?: ")
                    this.tw.globalId(p.local.getKind().getRecord(), "I")
                } else this.localDef(p.local)
            }

            var stmts = a.body.stmts.slice(0)
            if (stmts[0] instanceof Comment) {
                this.tw.write("/**").nl()
                while (stmts[0] instanceof Comment) {
                    this.tw.write(" * " + (<Comment>stmts[0]).text).nl()
                    stmts.shift();
                }
                this.tw.write(" */").nl()
            }

            if (isExtension) {
                if (a.isPrivate)
                    this.tw.kw("private")
                else
                    this.tw.kw("public")
                if (!a.isAtomic)
                    this.tw.kw("async")
                this.tw.globalId(a)
                this.pcommaSep(a.getInParameters().slice(1), printP)
            } else {
                if (!a.isPrivate)
                    this.tw.kw("export")
                if (!a.isAtomic)
                    this.tw.kw("async")
                this.tw.kw("function")
                this.tw.globalId(a)
                this.pcommaSep(a.getInParameters(), printP)
            }

            this.tw.op(":");

            if (!a.isAtomic) this.tw.kw("Promise<")

                var outp = a.getOutParameters()
                if (outp.length == 0) this.tw.kw("void")
                else if (outp.length == 1) this.type(outp[0].getKind())
                else {
                    this.tw.op0("[")
                    this.commaSep(outp, p => this.type(p.local.getKind()))
                    this.tw.op0("]")
                }

            if (!a.isAtomic) this.tw.op0(">")

            this.tw.nl()
            this.tw.beginBlock()

            if (isExtension) {
                this.thisLocal = a.getInParameters()[0].local
            }

            if (optsLocal) {
                this.tw.kw("let").sep()
                this.localName(optsLocal)
                this.tw.write(" = new").sep()
                this.type(optsLocal.getKind())
                this.tw.write("(); ")
                this.localName(optsLocal).write(".load(")
                this.tw.jsid(optsName).op0(");").nl()
            }

            a.getOutParameters().forEach(p => {
                this.tw.kw("let")
                this.localDef(p.local)
                this.tw.op0(";").nl()
            })

            this.codeBlockInner(stmts)

            if (a.getOutParameters().length == 1) {
                this.tw.kw("return")
                this.localName(a.getOutParameters()[0].local).op0(";").nl()
            } else if (a.getOutParameters().length > 1) {
                this.tw.kw("return ").op0("[");
                this.commaSep(a.getOutParameters(), p => this.localName(p.local))
                this.tw.op0("]").nl()
            }

            this.tw.endBlock()
            this.tw.nl()
        }

        defaultValue(k:Kind)
        {
            if (k == api.core.String) return '""'
            else if (k == api.core.Number) return '0'
            else if (k == api.core.Boolean) return 'false'
            else return null
        }

        visitGlobalDef(g:GlobalDef)
        {
            this.tw.kw("var");
            this.tw.globalId(g).op0(": ");
            this.type(g.getKind())
            var d = this.defaultValue(g.getKind())
            if (g.isResource)
                d = JSON.stringify(g.stringResourceValue() || g.url)
            if (d != null)
                this.tw.op("=").write(d)
            this.tw.op0(";").nl();
        }

        visitLibraryRef(l:LibraryRef)
        {
            var modName = JSON.stringify("./" + l.getName().replace(/\s/g, "-"))
            this.tw.kw("import * as ");
            this.tw.globalId(l).keyword("from").sep().write(modName).nl();
        }

        visitRecordDef(r:RecordDef)
        {
            this.tw.kw("export class").sep()
            this.tw.globalId(r).nl()
            this.tw.kw("    extends td.JsonRecord").nl().beginBlock()
            r.getFields().forEach(f => {
                this.tw.kw("@json public").sep()
                this.simpleId(f.getName())
                this.tw.op0(":").sep()
                this.type(f.dataKind)
                var d = this.defaultValue(f.dataKind)
                if (d != null)
                    this.tw.write(" = " + d)
                this.tw.op0(";").nl()
            })

            this.tw.write("static createFromJson(o:JsonObject) { let r = new ")
            this.tw.globalId(r).write("(); r.fromJson(o); return r; }").nl()

            var exts = this.app.actions().filter(a => this.isOwnExtension(a) && this.getFirstRecord(a) == r)
            exts.forEach(e => this.visitAction(e))

            this.tw.endBlock()
            this.tw.nl()

            this.tw.kw("export interface").sep()
            this.tw.globalId(r, "I")
            this.tw.beginBlock()
            r.getFields().forEach(f => {
                this.simpleId(f.getName())
                this.tw.op0("?:").sep()
                this.type(f.dataKind)
                this.tw.op0(";").nl()
            })
            this.tw.endBlock()

            this.tw.nl()
        }

        visitApp(a:App)
        {
            var dump = (lst:Decl[]) => lst.forEach(t => this.dispatch(t))
            dump(a.libraries())
            this.tw.nl()
            dump(a.variables())
            this.tw.nl()
            dump(a.resources())
            this.tw.nl()
            dump(a.records())
            this.tw.nl()
            dump(a.allActions().filter(a => !this.isOwnExtension(a)))
        }

        visitComment(c:Comment)
        {
            this.tw.write("// " + c.text).nl()
        }

        visitStmt(s:Stmt)
        {
            console.log("unhandled stmt: " + s.nodeType())
            super.visitStmt(s)
        }
    }
}
