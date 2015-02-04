///<reference path='refs.ts'/>


module TDev { export module AST {
    export class Parser
    {
        private errors:ParseError[];
        private tokens:LexToken[];
        private tokenPos:number;
        public stmtList:Stmt[];
        private declList:Decl[];
        private currentAction:Action;
        public currentApp:App;
        private libRefs:any = {};
        private currentLabel:string[] = []; // use peek/pop() to get the label

        constructor()
        {
            this.declarationCallbacks = {
                "action": this.parseAction,
                "event": this.parseAction,
                "meta": this.parseMetaDecl,
                "var": GlobalDef.parse,
                "table": RecordDef.parse
            };

            this.statementCallbacks = {
                "meta": this.parseMetaStmt,
                "skip": this.parseSkip,
                "for": Parser.stmtCtor(For),
                "foreach": Parser.stmtCtor(Foreach),
                "while": Parser.stmtCtor(While),
                "if": Parser.stmtCtor(If),
                "else": this.parseElseIf,
                "do": this.parseDo,
                "where": this.parseWhere,
                "var": this.parseField,
            };
        }

        private declarationCallbacks:any;
        private statementCallbacks:any;

        static stmtCtor(f:new()=>any)
        {
            return (p:Parser) => {
                var r = new f();
                p.stmtList.push(r);
                r.parseFrom(p);
            }
        }

        // TSBUG should be private
        public errorLoc(loc:LexToken, msg:string, ...args:any[])
        {
            debugger;
            this.errors.push(new ParseError(loc, Util.fmt_va(msg, args)));
        }

        public error(msg:string, ...args:any[])
        {
            debugger;
            this.errors.push(new ParseError(this.curr(), Util.fmt_va(msg, args)));
        }

        public getLibraryRef(name:string):LibraryRef
        {
            if (name == "this")
                return this.currentApp.thisLibRef;

            var existing = this.currentApp.libraries().filter((l) => l.getName() == name)[0];
            if (existing) return existing;

            if (this.libRefs.hasOwnProperty(name))
                return this.libRefs[name];
            var l = new LibraryRef();
            this.libRefs[name] = l;
            l.setName(name);
            this.declList.push(l);
            return l;
        }

        public declareLibrary(l:LibraryRef)
        {
            var idx = this.declList.indexOf(l);
            this.declList.splice(idx, 1);
            this.declList.push(l);
        }

        public consumeLabel()
        {
            var r = this.currentLabel
            this.currentLabel = []
            return r
        }

        public featureMissing(f:LanguageFeature)
        {
            if (!this.currentApp) return false
            return this.currentApp.featureMissing(f)
        }

        public lookahead(n:number) {
            var t = this.tokens[this.tokenPos + n]
            if (!t) return this.tokens[this.tokens.length - 1]
            return t;
        }

        public curr() { return this.tokens[this.tokenPos]; }
        public got(t:TokenType) { return this.curr().category == t; }
        public gotOp(s:string) { return this.got(TokenType.Op) && this.curr().data == s; }
        public gotKw(s:string) { return this.got(TokenType.Keyword) && this.curr().data == s; }
        public gotId(s:string) { return this.got(TokenType.Id) && this.curr().data == s; }

        public tokenize(s:string)
        {
            this.errors = [];
            this.stmtList = [];
            this.declList = [];
            this.currentAction = null;
            this.currentApp = null;

            var toks = Lexer.tokenize(s);

            toks.forEach((l:LexToken) => {
                if (l.category == TokenType.Error)
                    this.errorLoc(l, l.data);
            });

            this.tokenPos = 0;
            this.tokens = toks.filter((l:LexToken) => l.category != TokenType.Error);
        }

        static parseEndpoint(text:string, f : (p:Parser) => any, errs:string[], script:App) : any
        {
            var p = new Parser();
            p.tokenize(text);

            p.currentApp = script || Script;
            var r = f(p);
            if (errs)
                errs.pushRange(p.errors.map((e) => e.toString()));
            else
                p.handleErrors();

            return r;
        }

        static parseType(text:string, script:App = null) : Kind
            { return Parser.parseEndpoint(text, (p) => p.parseType(), null, script); }
        static parseExprHolder(text:string, script:App = null) : ExprHolder
            { return Parser.parseEndpoint(text, (p) => p.parseExpr(), null, script); }
        static parseStmt(text:string, script:App = null) : Stmt
            { return Parser.parseEndpoint(text, (p) => p.parseOneStmt(), null, script); }
        static parseDecl(text:string, script:App = null) : Decl
            { return Parser.parseEndpoint(text, (p) => p.parseOneDecl(), null, script); }
        static parseDecls(text:string, script:App = null) : Decl[]
            { return Parser.parseEndpoint(text, (p) => p.parseManyDecls(), null, script); }
        static parseScript(text:string, errs:string[] = null) : App
            { return Parser.parseEndpoint(text, (p) => p.parseApp(), errs, null); }

        public handleErrors()
        {
            var errors = this.errors.map((e:ParseError) => e.toString()).join("\n");
            if (errors != "") {
                Util.log("Parse error: " + errors);
                debugger;
            }
        }

        public gotKey(s:string)
        {
            var t = this.curr();
            if (t.data == s) {
                this.shift();
                if (this.gotOp("=") || this.gotOp(":=")) this.shift();
                return true;
            }
            return false;
        }

        private trySkipId(s:string)
        {
            if (this.gotId(s)) { this.shift(); return true; }
            else return false;
        }

        private gotTerminator()
        {
            switch (this.curr().category) {
            case TokenType.Keyword:
            case TokenType.EOF:
            case TokenType.Label:
                return true;
            case TokenType.Op:
                switch (this.curr().data) {
                case ";":
                case "{":
                case "}":
                    return true;
                }
            }
            return false;
        }

        public shift()
        {
            var r = this.curr();
            if (r.category != TokenType.EOF) this.tokenPos++;
            return r;
        }

        public skipOp(s:string)
        {
            if (this.gotOp(s)) this.shift();
            else this.error("expecting operator {0}, got {1}", s, this.curr());
        }

        public skipKw(s:string)
        {
            if (this.gotKw(s)) this.shift();
            else this.error("expecting keyword {0}, got {1}", s, this.curr());
        }

        public parseString()
        {
            if (!this.got(TokenType.String)) {
                this.error("expecting string, got {0}", this.curr());
                this.shift();
                return "";
            } else return this.shift().data;
        }

        public parseBool() { return this.parseId() == "true"; }

        public parseLibRef()
        {
            if (this.gotOp(libSymbol)) {
                this.shift();
                return this.getLibraryRef(this.parseId("this"));
            } else {
                this.error("expecting library reference, got {0}", this.curr());
                return this.getLibraryRef("this");
            }
        }

        public parseId(defl = "?")
        {
            if (!this.got(TokenType.Id)) {
                this.error("expecting identifier, got {0}", this.curr());
                this.shift();
                return defl;
            } else {
                return this.shift().data;
            }
        }


        public parseType()
        {
            if (this.gotOp(libSymbol)) {
                var lib = this.parseLibRef();
                this.skipOp("\u2192"); // ->
                if (this.got(TokenType.Id))
                    return lib.getAbstractKind(this.parseId());
            }

            var forceRecord = false

            if (this.gotOp("*")) {
                this.shift();
                forceRecord = true
            }

            var n = this.parseId();

            var k = forceRecord ? new UnresolvedKind(n) : api.getKind(n);
            if (!k && / field$/.test(n)) {
                n = n.slice(0, n.length - 6);
                if (/^Collection of /.test(n))
                    n = n.slice(14) + " Collection";
                k = api.getKind(n);
            }

            var collKind:Kind = null;
            switch (n) {
            case "Appointment Collection": collKind = api.getKind("Appointment"); break;
            case "Contact Collection": collKind = api.getKind("Contact"); break;
            case "Device Collection": collKind = api.getKind("Device"); break;
            case "Link Collection": collKind = api.getKind("Link"); break;
            case "Location Collection": collKind = api.getKind("Location"); break;
            case "Media Link Collection": collKind = api.getKind("Media Link"); break;
            case "Media Player Collection": collKind = api.getKind("Media Player"); break;
            case "Media Server Collection": collKind = api.getKind("Media Server"); break;
            case "Message Collection": collKind = api.getKind("Message"); break;
            case "Number Collection": collKind = api.core.Number; break;
            case "Page Collection": collKind = api.getKind("Page"); break;
            case "Place Collection": collKind = api.getKind("Place"); break;
            case "Printer Collection": collKind = api.getKind("Printer"); break;
            case "String Collection": collKind = api.core.String; break;
            }

            if (collKind)
                k = api.core.Collection.createInstance([collKind])

            if (!k) {
                if (/ Collection$/.test(n))
                    k = api.core.Collection.createInstance([new UnresolvedKind(n.slice(0, n.length - 11))])
                else
                    k = new UnresolvedKind(n)
            }
            if (n == "Unknown")
                k = api.core.String;
            if (!k) {
                this.error("unknown type {0}", n);
                k = api.core.Unknown;
            }

            if (this.gotOp("[")) {
                this.shift();
                var parms = [];
                while (true) {
                    var t = this.parseType()
                    parms.push(t)
                    if (this.gotOp("]")) {
                        this.shift();
                        break;
                    } else if (this.gotOp(",")) {
                        this.shift();
                        continue;
                    } else {
                        this.error("bad type syntax");
                        break;
                    }
                }
                if (k instanceof ParametricKind) {
                    var pk = <ParametricKind>k;
                    var numF = pk.parameters.length
                    if (parms.length > numF) {
                        this.error("too many type arguments");
                        parms = parms.slice(0, numF)
                    } else if (parms.length < numF) {
                        this.error("too few type arguments");
                        while (parms.length < numF) parms.push(api.core.Nothing)
                    }
                    k = pk.createInstance(parms);
                } else {
                    this.error("{0} is not parametric type", k.getName())
                }
            }

            return k;
        }

        public parseTypeAnnotation()
        {
            this.skipOp(":");
            return this.parseType();
        }

        public addDecl(s:Decl)
        {
            this.declList.push(s);
        }

        private addStmt(s:Stmt)
        {
            this.stmtList.push(s);
        }

        private parseElseIf()
        {
            this.shiftLabel();
            this.skipKw("if")
            var r = new If()
            this.stmtList.push(r)
            r.isElseIf = true;
            r.parseFrom(this)
        }

        private parseParameters(lbl:string,sep:string)
        {
            var parens = false;
            var res:ActionParameter[] = [];

            if (this.gotOp("("))
            {
                this.shift();
                parens = true;
            }

            var index = 0;
            while (true)
            {
                if (parens && this.gotOp(")"))
                {
                    this.shift();
                    break;
                }

                this.shiftLabel();
                var lbl2 = this.consumeLabel()

                if (this.gotTerminator()) break;

                var n = this.parseId();
                var t = this.parseTypeAnnotation();

                var loc = mkLocal(n, t);
                var ap = new ActionParameter(loc);
                ap.setStableName(lbl2)
                index++;
                res.push(ap);

                if (this.gotOp(","))
                    this.shift();
            }

            return res;
        }

        // TODO - lbl should always be provided (check events.ts)
        public parseActionHeader(lbl:string = "")
        {
            var isType = false

            while (this.got(TokenType.Op) && !this.gotTerminator()) {
                if (this.gotOp("type")) {
                    isType = true
                } else {
                    this.error("expecting identifier, got {0}", this.curr());
                }
                this.shift();
            }

            var res = {
                name: this.parseId(),
                inParameters: <ActionParameter[]>[],
                outParameters: <ActionParameter[]>[],
                isType: isType,
            }

            res.inParameters = this.parseParameters(lbl,"_3");

            if (this.gotKw("returns")) {
                this.shift();
                res.outParameters = this.parseParameters(lbl,"_4");
            }

            return res;
        }

        private parseTokenSequenceStmt()
        {
            var eh = this.parseTokenSequence();
            if (eh != null)
                this.addStmt(mkExprStmt(eh, this));
        }

        static emptyExpr()
        {
            var eh = new ExprHolder();
            eh.tokens = [];
            eh.locals = [];
            eh.parsed = mkPlaceholderThingRef()
            return eh;
        }

        public parseExpr()
        {
            var eh = this.parseTokenSequence();
            if (eh == null) {
                eh = Parser.emptyExpr();
            }
            return eh;
        }

        private parseTokenSequence()
        {
            var toks:Token[] = [];
            var t:LexToken;

            var add = (tp:string, json = undefined) =>
            {
                if (json === undefined)
                    json = {};
                json.type = tp;
                if (json.data === undefined)
                    json.data = t.data;
                toks.push(mkTok(json))
            }

            while (true) {
                if (this.gotTerminator())
                    break;

                t = this.curr();
                switch (t.category) {
                    case TokenType.Op:
                        if (t.data == "...") {
                            add("thingRef", { data: "$skip" });
                        } else if (t.data == "$") {
                            this.shift();
                            var pos = this.tokenPos;
                            var id = this.parseId();
                            this.tokenPos = pos; // there is Shift() down the line
                            add("thingRef", { data: id, forceLocal: true });
                        } else {
                            add("operator");
                        }
                        break;
                    case TokenType.Id:
                        if (toks.peek() instanceof Operator) {
                            var pt = (<Operator> toks.peek()).data;
                            if (pt == "→")
                                toks[toks.length - 1] = mkPropRef(t.data);
                            else if (pt == "♻") {
                                toks[toks.length - 1] = mkThing(pt);
                                add("propertyRef");
                            } else {
                                add("thingRef");
                            }
                        } else {
                            add("thingRef");
                        }
                        break;
                    case TokenType.String:
                        add("literal", { kind: "String" });
                        break;
                    case TokenType.Comment:
                        break;
                    case TokenType.Keyword:
                    case TokenType.EOF:
                        Util.die();
                        break;
                    default:
                        Util.die();
                        break;
                }
                this.shift();
            }


            if (toks.length > 0)
            {
                var r = new ExprHolder();
                // avoid stack overflow; /bygua is a real script using more than 200 tokens in a line...
                if (toks.length > 300)
                    toks = toks.slice(0, 300);
                r.tokens = toks;
                return r;
            } else {
                return null;
            }

        }

        static emptyBlock()
        {
            var r = new CodeBlock();
            r.setChildren([Parser.emptyExprStmt()]);
            return r;
        }

        public parseBlock() : CodeBlock
        {
            var nesting = 0;
            var loc0 = this.curr();
            var elseStack:ElseEntry[] = [];

            var mkCodeBlock = (stmts:Stmt[]) => {
                var r = new CodeBlock();
                if (stmts.length == 0)
                    stmts.push(r.emptyStmt());
                r.setChildren(stmts);
                return r;
            };

            var unwind1 = () => {
                var br = elseStack.pop();
                var curr = this.stmtList
                this.stmtList = br.stmtList
                if (br.ifStmt) {
                    if (curr[0] instanceof If && curr.slice(1).every(isElseIf)) {
                        (<If>curr[0]).isElseIf = true;
                        this.stmtList.pushRange(curr)
                    } else {
                        br.ifStmt.setElse(mkCodeBlock(curr));
                    }
                } else if (elseStack.length == 0) {
                    return mkCodeBlock(curr);
                } else {
                    this.stmtList.pushRange(curr);
                }
                return null;
            };

            var unwind = () => {
                while (true) {
                    var r = unwind1()
                    if (r) return r;
                }
            };

            var pushBrace = (ifStmt:If = null) => {
                elseStack.push({
                    stmtList: this.stmtList,
                    ifStmt: ifStmt,
                })
                this.stmtList = []
            };

            if (this.gotOp("{"))
                this.shift();
            else
                this.error("expecting {{ at the beginning of the block, got {0}", this.curr());

            pushBrace();
            while (true)
            {
                var t = this.curr();
                switch (t.category)
                {
                    case TokenType.Op:
                        switch (t.data)
                        {
                            case "}":
                                this.shift();
                                var r = unwind1();
                                if (r) return r;
                                break;
                            case "{":
                                this.shift();
                                pushBrace();
                                break;
                            case ";":
                                this.shift();
                                break;
                            default:
                                this.parseStmtCore();
                                break;
                        }
                        break;
                    case TokenType.EOF:
                        this.errorLoc(loc0, "unclosed {{ (got end of file)");
                        return unwind();

                    default:
                        if (this.gotKw("else") && this.stmtList.peek() instanceof If) {
                            this.shift();
                            if (this.gotOp("{")) {
                                this.shift();
                                pushBrace(<If>this.stmtList.peek());
                            }
                        } else if (this.parseStmtCore()) {
                            this.errorLoc(loc0, "unclosed {{ (got next declaration)");
                            return unwind();
                        }
                        break;
                }
            }
        }

        private parseStmtCore()
        {
            this.shiftLabel();
            var t = this.curr();

            switch (t.category) {
            case TokenType.Keyword:
                var a = this.statementCallbacks[t.data];
                if (!a) {
                    if (!!this.declarationCallbacks[t.data]) {
                        return true;
                    } else {
                        this.error("keyword {0} is unexpected here (or reserved for future use)", t);
                        this.shift();
                    }
                } else {
                    this.shift();
                    a.call(this, this);
                }
                break;

            case TokenType.Comment:
                var c = new Comment();
                c.setStableName(this.consumeLabel());
                c.text = t.data.trim();
                this.addStmt(c);
                this.shift();
                break;

            case TokenType.Op:
            case TokenType.Id:
            case TokenType.String:
                this.parseTokenSequenceStmt();
                break;

            default:
                Util.die();
                break;
            }
            return false;
        }

        public parseOneStmt()
        {
            Util.assert(this.tokenPos == 0);
            this.stmtList = [];
            if (this.gotOp("{"))
                return this.parseBlock();
            this.parseStmtCore();
            if (this.stmtList.length != 1)
                this.error("expecting a single statement");
            return this.stmtList[0];
        }

        public shiftLabel()
        {
            var arr = [];
            while (this.got(TokenType.Label)) {
                arr.push(this.curr().data);
                this.shift();
            }
            this.currentLabel = arr;
            if(this.currentLabel.length==1 && !(this.currentLabel[0])) this.currentLabel = [];
            var res = (this.currentLabel.length > 0);
            //if(res) console.log(">>>>>>>>> shifted label: \""+this.currentLabel+"\"");
            return res;
        }

        public parseBraced(a : () => void)
        {
            if (!this.gotOp("{"))
                return;

            var nesting = 0;
            while (true) {
                this.shiftLabel();

                if (this.gotOp("{")) {
                    nesting++;
                    this.shift();
                    continue;
                } else if (this.gotOp("}")) {
                    nesting--;
                    this.shift();
                    if (nesting == 0)
                        break;
                    else
                        continue;
                } else if (this.got(TokenType.EOF)) {
                    break;
                }

                var prevPos = this.tokenPos;
                a();
                if (prevPos == this.tokenPos)
                    this.shift(); // error?
            }
        }

        private skipBlock() { return this.parseBraced(() => {}); }

        private parseDeclCore()
        {
            this.shiftLabel(); // TODO - what if there is no label?
            if (this.got(TokenType.Keyword)) {
                var a = this.declarationCallbacks[this.curr().data];
                if (a) {
                    this.shift();
                    a.call(this, this);
                    return true;
                }
            }
            return false;
        }

        public parseOneDecl() {
            var decls = this.parseManyDecls();
            if (decls.length != 1)
                this.error("expecting a single declaration");
            return decls[0];
        }

        public parseManyDecls()
        {
            Util.assert(this.tokenPos == 0);
            this.declList = [];
            this.parseDeclCore();
            return this.declList;
        }

        public parseApp()
        {
            Util.assert(this.tokenPos == 0);
            this.currentApp = new App(this);

            var printedError = false;
            var description = "";

            while (true)
            {
                if (this.got(TokenType.EOF))
                    break;

                if (this.parseDeclCore()) {
                    printedError = false;
                    continue;
                }

                if (this.got(TokenType.Comment)) {
                    description += this.curr().data.trim() + "\n";
                    this.shift();
                    printedError = false;
                    continue;
                }

                if (!printedError)
                    this.error("expecting declaration, got {0}", this.curr());
                printedError = true;
                this.shift();
            }

            var app = this.currentApp;

            app.comment = description.trim();
            this.declList.forEach((d) => {
                if (d instanceof LibraryRef) {
                    var l = <LibraryRef>d;
                    if (!l.isDeclared) {
                        l.deleted = true;
                        return;
                    }
                }
                app.addDecl(d)
            });

            app.parsingFinished();

            this.currentApp = null;
            return app;
        }

        private parseAction()
        {
            var prevTok = this.tokens[this.tokenPos - 1];
            var lbl = this.consumeLabel();
            var hd = this.parseActionHeader(lbl.peek());
            this.currentAction = new Action();
            this.currentAction.setStableName(lbl);
            this.addDecl(this.currentAction);
            this.currentAction.header.inParameters.setChildren(hd.inParameters);
            this.currentAction.header.outParameters.setChildren(hd.outParameters);
            this.currentAction.setName(hd.name);
            this.currentAction.body = this.parseBlock();
            this.currentAction._isActionTypeDef = hd.isType
            if (this.currentAction.isPage() && !this.currentAction.getPageBlock(false)) {
                // pages need to have a specific structure; bring it up to date
                var bl = <CodeBlock> Parser.parseStmt("{ if box->is_init then { } if true then { } }");
                (<If>bl.children()[1]).rawThenBody.setChildren(<Stmt[]>this.currentAction.body.children());
                this.currentAction.body = bl;
            }
            this.currentAction.body.parent = this.currentAction.header;

            if (prevTok.data == "event")
                api.eventMgr.setInfo(this.currentAction, this);

            if (this.currentAction.isPage()) {
                this.currentAction.isAtomic = true;
                var parms = this.currentAction.header.inParameters;
                var parm0 = <ActionParameter>parms.stmts[0];
                if (parm0 &&
                    parms.stmts[0] &&
                    (parm0.getKind().isExtensionEnabled() || parm0.getKind() instanceof UnresolvedKind) &&
                    ((this.featureMissing(LanguageFeature.UnicodeModel) &&
                        (parm0.getName() == "model" || parm0.getName() == "page data")) ||
                     parm0.getName() == modelSymbol ||
                     parm0.getName() == oldModelSymbol
                    )) {

                    parms.setChildren(parms.stmts.slice(1));
                    this.currentAction.modelParameter = parm0;
                }
            }

            this.currentAction = null;
        }

        private parseMetaDecl()
        {
            var tag = "";
            if (this.got(TokenType.Keyword)) tag = this.shift().data;
            else tag = this.parseId();

            // currently, ignore "recent"

            if (tag == "import") {
                LibraryRef.parse(this);
                return;
            }

            if (this.gotOp("{")) this.skipBlock();
            else {
                var v = this.shift().data;
                if (this.currentApp)
                    this.currentApp.setMeta(tag, v);
                this.skipOp(";");
            }
        }

        private parseMetaStmt()
        {
            var tag = "";
            if (this.got(TokenType.Keyword)) tag = this.shift().data;
            else tag = this.parseId();

            // currently, ignore "recent" and "guid"

            if (tag == "private") {
                if (this.currentAction)
                    this.currentAction.isPrivate = true;
                this.skipOp(";");
            } else if (tag == "page") {
                if (this.currentAction)
                    this.currentAction._isPage = true;
                this.skipOp(";");
            } else if (tag == "offloaded") {
                if (this.currentAction)
                    this.currentAction.isOffloaded = true;
                this.skipOp(";");
            } else if (tag == "async") {
                if (this.currentAction)
                    this.currentAction.isAtomic = false;
                this.skipOp(";");
            } else if (tag == "sync") {
                if (this.currentAction)
                    this.currentAction.isAtomic = true;
                this.skipOp(";");
            } else if (tag == "test") {
                if (this.currentAction)
                    this.currentAction._isTest = true;
                this.skipOp(";");
            } else if (tag == "offline") {
                if (this.currentAction)
                    this.currentAction.isOffline = true;
                this.skipOp(";");
            } else if (tag == "query") {
                if (this.currentAction)
                    this.currentAction.isQuery = true;
                this.skipOp(";");
            } else {
                if (this.gotOp("{")) this.skipBlock();
                else {
                    this.shift();
                    this.skipOp(";");
                }
            }
        }

        static emptyCondition()
        {
            var e = Parser.emptyExpr();
            e.tokens.push(AST.mkThing("true"));
            return mkWhere(e);
        }

        static emptyExprStmt(p:Parser = null) { return mkExprStmt(Parser.emptyExpr(), p); }

        private parseSkip()
        {
            if (this.gotOp(";")) this.shift();
            this.addStmt(Parser.emptyExprStmt(this));
        }

        private parseDo()
        {
            var id = this.parseId();
            var node;
            if (id == "box")
                node = Box;
            else {
                this.error("expecting 'box' here");
                return;
            }

            (Parser.stmtCtor(node))(this);
        }

        private parseWhere()
        {
            var len = this.stmtList.length;

            var stmt: Stmt;

            var eq = this.lookahead(1)
            if (eq.category == TokenType.Op && eq.data == ":=") {
                var opt = new OptionalParameter()
                opt.parseFrom(this)
                stmt = opt
            } else {
                var inl = new InlineAction();
                inl.parseFrom(this);
                stmt = inl
            }

            if (len == 0 || !(this.stmtList[len - 1] instanceof ExprStmt)) {
                this.error("'where' should follow an expression");
            } else {
                var prev = this.stmtList[len - 1];
                var inls = <InlineActions>prev;
                if (!(prev instanceof InlineActions)) {
                    inls = new InlineActions();
                    inls.setStableName(prev.getStableName());
                    inls.expr = (<ExprStmt>prev).expr;
                    inls.parent = prev.parent;
                    this.stmtList[len - 1] = inls;
                }
                inls.actions.push(stmt);
            }
        }

        private parseField()
        {
            // the "var" keyword has already been [shift]'d
            var name = this.parseId();
            this.skipOp(":");
            var kind = this.parseType();
            this.skipOp(";");

            var description = "";
            if (this.got(TokenType.Comment)) {
                description = this.curr().data;
                this.shift();
            }

            // [isKey] will be set properly by the code in [pasteCode]
            this.stmtList.push(new RecordField(name, kind, false, description));
        }
    }

    interface ElseEntry {
        stmtList: Stmt[];
        ifStmt: If;
    }

    export class ParseError
    {
        constructor(public loc:LexToken, private msg:string) {
        }
        public toString()
        {
            var beg = this.loc.inputPos - 30;
            if (beg < 0) beg = 0;
            var desc = this.loc.input.slice(beg, this.loc.inputPos) + "<*>" + this.loc.input.slice(this.loc.inputPos, beg + 60);
            return this.msg + " at >>>" + desc + "<<<";
        }
    }
} }
