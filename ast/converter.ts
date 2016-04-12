///<reference path='refs.ts'/>

module TDev.AST {
    var useAsync = false;

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
            s = s.replace(/#/g, " sharp ")
            s = s.replace(/\+/g, " plus ")
            s = s.replace(/\s+([A-Za-z])/g, (v,l) => l.toUpperCase())
            s = s.replace(/[^a-zA-Z0-9]+/g, "_");
            if (s == "" || /^[0-9]/.test(s) || TsQuotingCtx.keywords.hasOwnProperty(s)) s = "_" + s;
            return s;
        }
    }

    function stringLit(s:string) {
        if (s.length > 20 && /\n/.test(s)) {
            if (/^[01 \n]*$/.test(s))
                s = "\n" + s.replace(/0/g, ".").replace(/1/g, "#") + "\n"
            return "`" + s.replace(/[\\`${}]/g, f => "\\" + f) + "`"
        }
        else return JSON.stringify(s)
    }

    class TsTokenWriter
        extends TokenWriter
    {
        public globalCtx = new TsQuotingCtx();
        public highlight = 0

        constructor()
        {
            super()
            this.indentString = "    ";
        }

        public finalize(skipNL = false)
        {
            var ret = super.finalize(skipNL)
            ret = ret.replace(/(\s+)\}\n\s*else/, (a, b) => b + "} else")
            return ret
        }

        public globalId(d:Decl, pref = "")
        {
            var n = d.getName()
            
            if (d instanceof RecordDef || (d instanceof Action && (<Action>d).isActionTypeDef())) {
                n = n[0].toUpperCase() + n.slice(1)
            } else  if (d instanceof Action) {
                var a = <Action>d;
                if (useAsync && !a.isAtomic)
                    n += "Async"
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

        public semiNL() {
            if (this.highlight)
                this.sep().write("// ***")
            this.nl()
            return this
        }

        public comment(s:string)
        {
            var inner = MdDocs.formatText(s).trim()
            inner.split("\n").forEach(l =>
                this.op("//").space().write(l).nl())
            return this
        }
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
            delete n._converterValue
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

        visitThingRef(t:ThingRef) {
            var l = t.referencedLocal()
            if (l && typeof l._converterUses == "number")
                l._converterUses++
        }

        visitAction(a:Action) {
            a.getOutParameters().forEach(op => {
                op.local._converterUses = 0
            })
            super.visitAction(a)
        }
    }

    export interface Td2TsOptions {
        text?: string;
        useExtensions?: boolean;
        apiInfo?: ApisInfo;
    }

    export interface ParameterDesc {
        name: string;
        description: string;
        type: string;
        initializer?: string;
        defaults?: string[];
    }

    export enum SymbolKind {
        None,
        Method,
        Property,
        Function,
        Variable,
        Module,
        Enum,
        EnumMember
    }

    export interface CommentAttrs {
        shim?: string;
        enumval?: string;
        helper?: string;
        help?: string;
        async?: boolean;
        block?: string;
        blockId?: string;
        blockGap?: string;
        blockExternalInputs?: boolean;
        blockStatement?: boolean;
        blockImportId?: string;
        color?: string;
        icon?: string;
        imageLiteral?: number;
        weight?: number;
        
        // on interfaces
        indexerGet?: string;
        indexerSet?: string;

        _name?: string;
        jsDoc?: string;
        paramHelp?: StringMap<string>;
        // foo.defl=12 -> paramDefl: { foo: "12" }
        paramDefl: StringMap<string>;
    }
    

    export interface SymbolInfo {
        attributes: CommentAttrs;
        name: string;
        namespace: string;
        kind: SymbolKind;
        parameters: ParameterDesc[];
        retType: string;
        isContextual?: boolean;
    }

    export interface ApisInfo {
        byQName: StringMap<SymbolInfo>;
    }
    

    export function td2ts(options:Td2TsOptions) {
        AST.reset();
        AST.loadScriptAsync((s) => Promise.as(s == "" ? options.text : null));
        var r = new TDev.AST.Converter(Script, options).run()
        return r;
    }

    export function testConverterAsync() {
        return Util.httpGetJsonAsync("http://localhost:4242/editor/local/apiinfo.json")
            .then(json => {
                var r = new TDev.AST.Converter(Script, {
                    useExtensions: true,
                    apiInfo: json
                }).run()
                return r.text;
            })
    }

    export class Converter 
        extends NodeVisitor 
    {
        private tw = new TsTokenWriter();
        private localCtx = new TsQuotingCtx();
        private currAsync:Call;
        private apis:StringMap<number> = {};
        private allEnums:StringMap<number> = {};

        constructor(private app:App, private options:Td2TsOptions = {})
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
            var txt = (this.tw.finalize().trim() + "\n").replace(/\n+/g, "\n")
            return {
                text: txt,
                apis: newApis,
            }
        }

        public renderSnippet(stmts:AST.Stmt[]) {
            this.tw.clear()
            stmts.forEach(s => this.dispatch(s))
            return this.tw.finalize()
        }

        public renderSig(act:Action) {
            this.tw.clear()
            this.printActionHeader(act)
            return this.tw.finalize()
        }

        private localName(l:LocalDef):TsTokenWriter
        {
            if (l == this.thisLocal)
                this.tw.kw("this")
            else
                this.tw.jsid(this.localCtx.quote(l.getName(), l.nodeId))
            return this.tw
        }

        static kindMap:StringMap<string> = {
            "String": "string",
            "Number": "number",
            "Boolean": "boolean",
            "Nothing": "void",
            "DateTime": "Date",
            "Json Object": "{}",
            "Json Builder": "{}",
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

        private globalName(n:string)
        {
            return this.tw.globalCtx.quote(n, 0)
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
            } else if (p.getName() == "mod" && p.parentKind.getName() == "Math") {
                return 20
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

            if (useAsync && e.awaits()) {
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
              "App->log": "console.log",
              "Time->now": "new Date",
              "Json Builder->keys": "Object.keys",
              "Json Object->keys": "Object.keys",
              "String Map->keys": "Object.keys",
              "Contract->assert": "assert",
              "Bits->string to buffer": "new Buffer",
              "Time->sleep": "basic.sleep",
              "String->to number": "parseInt",
              "Web->decode url": "decodeURIComponent",
              "Web->decode uri component": "decodeURIComponent",
              "Web->encode uri component": "encodeURIComponent",
              "Web->encode url": "encodeURIComponent",
              "Math->clamp": "Math.clamp",
              "Math->min": "Math.min",
              "Math->max": "Math.max",
              "Math->round": "Math.round",
              "Math->floor": "Math.floor",
              "Math->random": "Math.random",
              "Math->random range": "Math.randomRange",
              "Math->random normalized": "Math.randomNormalized",
              "Json Builder->to string": "td.toString",
              "Json Object->to string": "td.toString",
              "Json Builder->to number": "td.toNumber",
              "Json Object->to number": "td.toNumber",
              "♻ micro:bit->plot image": "basic.showLeds",
              "♻ micro:bit->create image": "images.createImage",
        }

        static methodRepl:StringMap<string> = {
          "Buffer->concat": "concat",
          "Buffer->to string": "toString",
          "Number->to string": "toString",
          "String->replace": "replaceAll",
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
          "Web Request->send": "sendAsync",
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

        fixupArgs(e:Call, nameOverride:string) {
            if (!e.args[0])
                return

            var th = e.args[0].getThing()

            if (!(th instanceof SingletonDef))
                return

            if (th.getKind() instanceof ThingSetKind)
                return

            if (!this.options.apiInfo)
                return

            var p = e.getCalledProperty()
            var fullName = nameOverride || this.globalName(e.args[0].getThing().getName()) + "." + this.globalName(p.getName())

            var apiInfo = this.options.apiInfo.byQName[fullName]
            if (!apiInfo) {
                this.tw.write("/*WARN: no api " + fullName + "*/")
                return
            } 

            e.args.slice(1).forEach((a, i) => {
                var litVal:string = a.getLiteral()
                if (!litVal || typeof litVal != "string") return;
                litVal = litVal.toLowerCase()
                var pi = apiInfo.parameters[i]
                if (!pi) return

                var enumInfo = this.options.apiInfo.byQName[pi.type]
                if (enumInfo && enumInfo.kind == SymbolKind.Enum) {
                    var members = Util.values(this.options.apiInfo.byQName)
                        .filter(e => e.namespace == pi.type &&
                            (e.name.toLowerCase() == litVal ||
                             (e.attributes.block || "").toLowerCase() == litVal))
                    if (members.length >= 1) {
                        a._converterValue = members[0].namespace + "." + members[0].name
                        if (members.length > 1) {
                            a._converterValue += " /*WARN: more possible!*/"
                        }
                    } else {
                        a._converterValue = pi.type + "." + a.getLiteral() +  " /*WARN: not found*/"
                    }
                }
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

            this.fixupArgs(e, Converter.prefixGlue[pn])

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
            } else if (p.getName() == "\u25C8set") {
                this.dispatch(e.args[0])
                this.tw.op("=")
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
            "mod": "%",
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
            if (l._converterValue) {
                this.tw.write(l._converterValue)
                return
            }

            if (l.data === undefined) return
            if (typeof l.data == "number")
                this.tw.write(l.stringForm || l.data.toString())
            else if (typeof l.data == "string")
                this.tw.write(stringLit(l.data))
            else if (typeof l.data == "boolean")
                this.tw.kw(l.data ? "true" : "false")
            else
                l.writeTo(this.tw)
        }

        inlineAction(a:InlineAction)
        {
            if (useAsync && !(<ActionKind>a.name.getKind()).isAtomic())
                this.tw.kw("async").space()
            this.pcommaSep(a.inParameters, p => this.localDef(p))
            this.tw.op("=>").beginBlock();

            a.outParameters.forEach(p => {
                this.tw.kw("let")
                this.localDef(p)
                this.tw.semiNL();
            })

            this.codeBlockInner(a.body.stmts)

            if (a.outParameters.length >= 1) {
                this.tw.kw("return")
                this.localName(a.outParameters[0]).semiNL();
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
                // this.tw.write("TD.")
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
            this.tw.semiNL()
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
            if (!this.options.useExtensions || !this.isExtension(a)) return false
            var r = this.getFirstRecord(a)
            return (r && r.parent == this.app)
        }

        isExtension(a:Action)
        {
            if (!this.options.useExtensions && a.parent == this.app)
                return false

            if (a.isActionTypeDef())
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

        actionReturn(a:Action)
        {
            if (useAsync && !a.isAtomic) this.tw.kw("Promise<")

                var outp = a.getOutParameters()
                if (outp.length == 0) this.tw.kw("void")
                else if (outp.length == 1) this.type(outp[0].getKind())
                else {
                    this.tw.op0("[")
                    this.commaSep(outp, p => this.type(p.local.getKind()))
                    this.tw.op0("]")
                }

            if (useAsync && !a.isAtomic) this.tw.op0(">")
        }

        printActionTypeDef(a:Action)
        {
            this.tw.kw("export type")
            this.tw.globalId(a).op("=")
            this.pcommaSep(a.getInParameters(), p => this.localDef(p.local))
            this.tw.op("=>");
            this.actionReturn(a)
            this.tw.semiNL()
        }

        printActionHeader(a:Action)
        {
            if (a.isActionTypeDef()) {
                this.printActionTypeDef(a)
                return
            }

            var isExtension = this.isOwnExtension(a)

            this.localCtx = new TsQuotingCtx()
            this.thisLocal = null;
            var optsName = ""
            var optsLocal:LocalDef = null

            var printP = p => {
                if (/\?$/.test(p.getName())) {
                    optsLocal = p.local
                    optsName = this.localCtx.unUnicode(p.getName() + "0")
                    this.tw.jsid(optsName).write(": ")
                    this.tw.globalId(p.local.getKind().getRecord(), "I")
                    this.tw.write(" = {}")
                } else this.localDef(p.local)
            }

            var stmts = a.body.stmts.slice(0)
            var annot:string[] = []

            if (!/^example/.test(a.getName()) && stmts[0] instanceof Comment) {
                var paramHelp = {}
                var helpLines = 0
                while (stmts[0] instanceof Comment) {
                    var txt = (<Comment>stmts[0]).text
                    txt = txt.replace(/\{(\w+)(:[^{}]*)?\}/g, (full, n, arg) => {
                        if (!arg) arg = ":"
                        arg = arg.slice(1)
                        var arg0 = arg.replace(/:.*/)
                        var argRest = arg.slice(arg0.length + 1)
                        switch (n) {
                            case "shim":
                            case "help":
                            case "weight":
                                if (/\s/.test(arg))
                                    if (/"/.test(arg))
                                        arg = "'" + arg + "'"
                                    else
                                        arg = "\"" + arg + "\""
                                else
                                    arg = arg
                                annot.push(n + "=" + arg)
                                break;
                            case "enum":
                            case "namespace":
                            case "action":
                                break;
                            case "hints":
                                paramHelp[arg0] = ", eg: " + argRest.replace(/,/g, ", ")
                                break;
                            default:
                                return full;
                        }
                        if (n == "shim" && !a.isAtomic)
                            annot.push("async")
                        return ""
                    })
                    txt = txt.trim()
                    if (txt) {
                        if (helpLines == 0)
                            this.tw.write("/**").nl()
                        this.tw.write(" * " + txt).nl()
                        helpLines++
                    }
                    stmts.shift();
                }
                if (helpLines) {
                    a.getInParameters().forEach(p => {
                        this.tw.write(" * @param ")
                        this.localName(p.local)
                        this.tw.write(" TODO" + (paramHelp[p.getName()] || "")).nl()
                    })
                    this.tw.write(" */").nl()
                }
                if (annot.length)
                    this.tw.write("//% " + annot.join(" ")).nl()

                a.getParameters().forEach(p => {
                    if (p.enumMap) {
                        var thisEnum = "enum TODO {\n" +
                        Object.keys(p.enumMap).map(k =>
                            "    //% enumval=" + p.enumMap[k] + "\n    " +
                            this.tw.globalCtx.quote(k, 0) + ",\n").join("") +
                        "}\n"
                        this.allEnums[thisEnum] = 1
                    }
                })
            }

            if (isExtension) {
                if (a.isPrivate)
                    this.tw.kw("private")
                else
                    this.tw.kw("public")
                if (useAsync && !a.isAtomic)
                    this.tw.kw("async")
                this.tw.globalId(a)
                this.pcommaSep(a.getInParameters().slice(1), printP)
            } else {
                //if (!a.isPrivate)
                //    this.tw.kw("export")
                if (useAsync && !a.isAtomic)
                    this.tw.kw("async")
                this.tw.kw("function")
                this.tw.globalId(a)
                this.pcommaSep(a.getInParameters(), printP)
            }

            if (a.getOutParameters().length > 0) {
                this.tw.op(":");
                this.actionReturn(a);
            }

            return { isExtension: isExtension, stmts: stmts, optsLocal: optsLocal, optsName: optsName }
        }

        visitAction(a:Action)
        {
            var isMain = a.getInParameters().length == 0 && /^main/.test(a.getName())

            if (isMain) {
                this.codeBlockInner(a.body.stmts)
                this.tw.nl()
                return
            }

            var info = this.printActionHeader(a)
            var optsLocal = info.optsLocal

            this.tw.beginBlock()

            if (info.isExtension) {
                this.thisLocal = a.getInParameters()[0].local
            }

            if (optsLocal) {
                this.tw.kw("let").sep()
                this.localName(optsLocal)
                this.tw.write(" = new").sep()
                this.type(optsLocal.getKind())
                this.tw.write("(); ")
                this.localName(optsLocal).write(".load(")
                this.tw.jsid(info.optsName).op0(");").nl()
            }

            var hasOutP = !!a.getOutParameters().filter(p => p.local._converterUses > 0)[0]


            if (hasOutP)
                a.getOutParameters().forEach(p => {
                    this.tw.kw("let")
                    this.localDef(p.local)
                    this.tw.semiNL()
                })

            this.codeBlockInner(info.stmts)

            if (!hasOutP) {
                // nothing to do
            } else if (a.getOutParameters().length == 1) {
                this.tw.kw("return")
                this.localName(a.getOutParameters()[0].local).semiNL()
            } else if (a.getOutParameters().length > 1) {
                this.tw.kw("return ");
                if (!a.isAtomic) {
                    // TS 1.6 requires this cast
                    this.tw.op0("<[")
                    this.commaSep(a.getOutParameters(), p => this.type(p.local.getKind()))
                    this.tw.op0("]>")
                }
                this.tw.op0("[");
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
            if (g.isResource) {
                if (g.getKind() == api.core.JsonObject) {
                    d = RT.String_.valueFromArtUrl(g.url)
                } else {
                    d = stringLit(g.stringResourceValue() || g.url)
                }
            }
            if (d != null)
                this.tw.op("=").write(d)
            this.tw.semiNL()
        }

        visitLibraryRef(l:LibraryRef)
        {
        }

        visitRecordDef(r:RecordDef)
        {
            this.tw.kw("class").sep()
            this.tw.globalId(r).beginBlock()
            r.getFields().forEach(f => {
                this.tw.kw("public").sep()
                this.simpleId(f.getName())
                this.tw.op0(":").sep()
                this.type(f.dataKind)
                var d = this.defaultValue(f.dataKind)
                if (d != null)
                    this.tw.write(" = " + d)
                this.tw.semiNL()
            })

            var exts = this.app.actions().filter(a => this.isOwnExtension(a) && this.getFirstRecord(a) == r)
            exts.forEach(e => this.visitAction(e))

            this.tw.endBlock()
            this.tw.nl()
        }

        visitApp(a:App)
        {
            var dump = (lst:Decl[]) => lst.forEach(t => this.dispatch(t))
            dump(a.libraries())
            this.tw.nl()
            dump(a.allActions().filter(a => a.isActionTypeDef()))
            this.tw.nl()
            dump(a.variables())
            this.tw.nl()
            dump(a.resources())
            this.tw.nl()
            dump(a.records())
            this.tw.nl()
            var normalActions = a.allActions().filter(a => !this.isOwnExtension(a) && !a.isActionTypeDef())
            var byNs = Util.groupBy(normalActions, a => a.getNamespaces()[0] || "")
            Object.keys(byNs).forEach(ns => {
                if (ns)
                    this.tw.kw("namespace " + ns).beginBlock()
                dump(byNs[ns])
                if (ns)
                    this.tw.endBlock()
            })
            this.tw.write(Object.keys(this.allEnums).join("\n"))
        }

        visitComment(c:Comment)
        {
            var tt = c.text.trim()
            if (tt == "{highlight}")
                this.tw.highlight++
            else if (tt == "{/highlight}")
                this.tw.highlight--
            else
                this.tw.comment(c.text)
        }

        visitStmt(s:Stmt)
        {
            console.log("unhandled stmt: " + s.nodeType())
            super.visitStmt(s)
        }
    }
}
