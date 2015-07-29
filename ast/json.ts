///<reference path='refs.ts'/>

module TDev.AST.Json
{
    export var docs:string;


    function isPlaceholder(j:JExprHolder) {
        return (<any>j) === "" ||
            j.tokens && (j.tokens.length == 0 || (j.tokens.length == 1 && j.tokens[0].nodeType == "placeholder"))
    }

    function isEmptyBlock(b:JStmt[])
    {
        return !b || b.length == 0 || (b.length == 1 && b[0].nodeType == "exprStmt" && isPlaceholder((<JExprStmt>b[0]).expr))
    }

    export function setStableId(a:App, prefix ?: string):void
    {
        if (a.hasIds) {
            var s0 = new InitIdVisitor(false)
            s0.dispatch(a)
            var s1 = new IdFromStableSetter()
            s1.dispatch(a)
        } else {
            var i = new IdSetter(prefix);
            i.dispatch(a);
        }
    }

    export function addIdsAndDumpNode(a:AstNode): JNode {
        var i = new IdSetter("");
        i.dispatch(a);
        return (new Dumper()).toJson(a);
    }

    export function dump(a:App):JApp
    {
        try {
            setStableId(a);
            return (new Dumper()).toJson(a);
        } catch (e) {
            e.bugAttachments = [a.serialize()]
            throw e
        }
    }

    export function dumpForDiff(a:App):JApp
    {
        var d = new Dumper()
        d.shortMode = true
        return d.toJson(a);
    }

    class IdFromStableSetter
        extends NodeVisitor
    {
        constructor() {
            super()
        }
        private currId = 0;
        private lastStmt:Stmt;

        public visitStmt(n:Stmt)
        {
            this.lastStmt = n;
            this.currId = 0;
            var id = n.getStableName()
            if (!id)
                Util.oops("no stable name on " + n.nodeType())
            n.stableId = id
            this.visitChildren(n)
        }

        public visitKindBinding(n:KindBinding)
        {
            if (n.isExplicit) {
                this.visitStmt(n);
            } else {
                n.stableId = this.makeId()
                this.visitChildren(n)
            }
        }

        public visitActionBinding(n:ActionBinding)
        {
            if (n.isExplicit) {
                this.visitStmt(n);
            } else {
                n.stableId = this.makeId()
                this.visitChildren(n)
            }
        }

        private makeId()
        {
            return this.lastStmt.stableId + "$i" + this.currId++;
        }

        public visitAction(a:Action)
        {
            a.allLocals.forEach((l) => {
                l.stableId = l.getStableName()
            })

            // parameters need to get the exact ID of the enclosing stmt
            var copyId = (p:ActionParameter) => p.local.stableId = p.getStableName()
            a.getInParameters().forEach(copyId)
            a.getOutParameters().forEach(copyId)
            if (a.modelParameter) copyId(a.modelParameter)

            this.visitStmt(a)
        }

        public visitLibraryRef(l:LibraryRef)
        {
            this.visitStmt(l)

            l.getPublicActionsAndActionTypes().forEach((a, i) => {
                a.stableId = l.stableId + "$a" + i
                a.header.stableId = l.stableId + "$ah" + i
                a.getInParameters().concat(a.getOutParameters()).forEach((p, j) => {
                    p.stableId = a.stableId + "$p" + j
                    p.local.stableId = p.stableId + "$l"
                })
            })

            l.getPublicKinds().forEach(k => {
                var r = k.getRecord()
                if (r) {
                    r.keys.setStableName(r.getStableName() + "$ks")
                    r.values.setStableName(r.getStableName() + "$vs")
                    this.dispatch(r)
                }
            })
        }

        public visitExprHolder(n:ExprHolder)
        {
            var id = this.lastStmt.stableId
            n.stableId = id + "$eh"
            if (n.parsed)
                this.dispatch(n.parsed)
            n.tokens.forEach((t, i) => {
                t.stableId = id + "$t" + i
                var loc = t.getLocalDef()
                if (loc && !loc.stableId)
                    loc.stableId = id + "$err" + i
                if (t.getFunArgs()) {
                    var fa = (<Operator>t).call.funAction
                    if (fa) {
                        fa.stableId = id + "$fn" + i
                        fa.body.stableId = id + "$fnb" + i;
                        fa.body.stmts[0].stableId = id + "$fns" + i;
                        (<ExprStmt>fa.body.stmts[0]).expr.stableId = id + "$fneh" + i
                    }
                }
            })
        }

        public visitAstNode(n:AstNode)
        {
            n.stableId = this.makeId();
            this.visitChildren(n);
        }
    }

    //TODO test this for all scripts

    class IdSetter
        extends NodeVisitor
    {
        constructor(private prefix = "") {
            super()
        }
        private currId = 0;
        static begIds = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

        private makeId()
        {
            var r = this.prefix;
            if (this.currId < IdSetter.begIds.length)
                r += IdSetter.begIds[this.currId];
            else {
                if (/\d$/.test(r)) r += "."
                r += this.currId + ".";
            }
            this.currId++;
            return r;
        }

        private scope(f:()=>any)
        {
            var id = this.makeId();
            var prevPrefix = this.prefix;
            var prevId = this.currId;
            try {
                this.prefix = this.makeId();
                this.currId = 0;
                f();
                return id;
            } finally {
                this.prefix = prevPrefix;
                this.currId = prevId;
            }
        }

        public visitLocalDef(l:LocalDef) {
            // skip; should be handled already
        }

        public visitApp(a:App)
        {
            a.stableId = this.makeId();
            // no scope
            this.visitChildren(a);
        }

        public visitAction(a:Action)
        {
            a.stableId = this.scope(() =>
                a.allLocals.forEach((l) => {
                    l.stableId = this.makeId();
                }))
            this.visitChildren(a);
        }

        public visitLibraryRef(l:LibraryRef)
        {
            super.visitLibraryRef(l);
            this.scopedList(l.getPublicActionsAndActionTypes())
        }

        public scopedList(ns:AstNode[])
        {
            this.scope(() => {
                ns.forEach((n) => this.dispatch(n))
            })
        }

        public scoped(n:AstNode)
        {
            n.stableId = this.scope(() => this.visitChildren(n))
        }

        public visitDecl(n:Decl) { this.scoped(n) }
        public visitBlock(n:Block) { this.scoped(n) }
        public visitCall(n:Call) { this.scoped(n) }

        public visitExprHolder(n:ExprHolder)
        {
            this.scoped(n)
            if (n.parsed)
                this.dispatch(n.parsed)
        }

        public visitAstNode(n:AstNode)
        {
            n.stableId = this.makeId();
            this.visitChildren(n);
        }
    }

    export function getApis()
    {
        return (new Dumper(false)).getApis()
    }

    class Dumper
        extends NodeVisitor
    {
        private seenIds:any = {}
        private addLocals:JLocalDef[] = [];
        private deletedDecls:Decl[] = [];
        static version = "v0.1,resolved";
        static shortVersion = "v1.1,resolved,short";
        public shortMode = false;
        public reflectionMode = false;

        constructor(private useIds = true)
        {
            super()
        }

        public getApis()
        {
            var optBool = (v:any):boolean => {
                if (v) return true;
                else return undefined;
            }
            var tc = new TypeChecker();
            tc.topApp = Parser.parseScript("")

            var doParam = (p:PropertyParameter) => {
                var defl = p.getDefaultValue();
                var toks = undefined;
                if (defl) {
                    tc.tcTokens(defl);
                    toks = this.toJsons(defl);
                }
                return <JPropertyParameter>{
                    name: p.getName(),
                    type: this.kind(p.getKind()),
                    writesMutable: optBool(p.getFlags() & ParameterFlags.WritesMutable),
                    readsMutable: optBool(p.getFlags() & ParameterFlags.ReadsMutable),
                    defaultValue: toks,
                    stringValues: p.getStringValues() || undefined,
                }
            }

            var doProp = (p:Property) => {
                if (!(p instanceof Property)) Util.die();
                var f = p.getFlags();
                return <JProperty>{
                    name: p.getName(),
                    help: p.getDescription(),
                    usage_count: p._usage_count,
                    isAsync: optBool(f & PropertyFlags.Async),
                    runOnInvalid: optBool(f & PropertyFlags.RunOnInvalidArguments),
                    isHidden: optBool(f & PropertyFlags.IsHidden),
                    //isPrivate: optBool(f & PropertyFlags.IsPrivate),
                    isObsolete: optBool(f & PropertyFlags.IsObsolete),
                    isDbgOnly: optBool(f & PropertyFlags.IsDebugOnly),
                    isBetaOnly: optBool(f & PropertyFlags.IsBetaOnly),
                    jsName: p.runtimeName(),
                    infixPriority: p._infixPriority,
                    pausesInterpreter: optBool(p._implStatus & ImplementationStatus.Pauses),
                    usesStackFrame: optBool(p._implStatus & ImplementationStatus.UsesStackFrame),
                    missingWeb: optBool(!(p._implStatus & ImplementationStatus.Web)),
                    missingWab: optBool(!(p._implStatus & ImplementationStatus.Wab)),
                    capabilities: App.capabilityString(p.getCapability()) || undefined,

                    result: doParam(p.getResult()),
                    parameters: p.getParameters().map(doParam),
                }
            }

            var doKind = (k:Kind) => {
                var ctx = k.getContexts()
                return <JTypeDef>{
                    name: k.getName(),
                    help: k.getDescription(),
                    icon: SVG.justName(k.icon()),
                    isAction: optBool(k.isAction),
                    isData: k.isData,
                    isDbgOnly: optBool(k.isDbgOnly),
                    isBetaOnly: optBool(k.isBetaOnly),
                    //isPrivate: optBool(k.isPrivate),
                    isSerializable: k.isSerializable,
                    stemName: k.getStemName(),
                    jsName: k.runtimeName(),
                    isBuiltin: k.isBuiltin,
                    ctxLocal: optBool(ctx & KindContext.Parameter),
                    ctxGlobal: optBool(ctx & KindContext.GlobalVar),
                    ctxLocalKey: optBool(ctx & KindContext.IndexKey),
                    ctxGcKey: optBool(ctx & KindContext.GcKey),
                    ctxCloudKey: optBool(ctx & KindContext.IndexKey),
                    ctxRowKey: optBool(ctx & KindContext.RowKey),
                    ctxCloudField: optBool(ctx & KindContext.CloudField),
                    ctxWallTap: optBool(ctx & KindContext.WallTap),
                    ctxEnumerable: optBool(ctx & KindContext.Enumerable),
                    ctxJson: optBool(ctx & KindContext.Json),
                    properties: k.listProperties().map(doProp),
                }
            }

            return <JApis>{
                textVersion: App.currentVersion,
                jsonVersion: Dumper.version,
                types: api.getKinds().filter((k) => !(k instanceof ThingSetKind)).map(doKind)
            }
        }

        public visitAstNode(node:AstNode):any {
            Util.oops("cannot jsonize " + node.nodeType())
            return null
        }

        private fixupJson(n:AstNode, r:any)
        {
            if (Array.isArray(r) || typeof r === "string") return r;

            Object.keys(r).forEach((k) => {
                var v = r[k]
                if (v instanceof AstNode)
                    r[k] = this.toJson(v);
                else if (v instanceof Kind)
                    r[k] = this.kind(v)
            })
            if (!r.nodeType) {
                r.nodeType = n.nodeType();
                if (!r.nodeType)
                    Util.oops("cannot get nodetype")
            }
            if (this.useIds && !r.id) {
                r.id = n.stableId;
                if (!r.id)
                    Util.oops("no id on " + r.nodeType)
                this.seenIds[r.id] = true;
            }

            if (this.shortMode && (<Stmt>n).calcNode) {
                var eh = (<Stmt>n).calcNode()
                if (eh && eh.definedLocals) {
                    r.locals = this.toJsons(eh.definedLocals)
                }
                var boundLocal = ""
                if (n instanceof For) boundLocal = "index"
                else if (n instanceof Foreach) boundLocal = "iterator"
                else if (n instanceof InlineAction) boundLocal = "reference"
                if (boundLocal) {
                    if (!r.locals) r.locals = []
                    r.locals.unshift(r[boundLocal])
                    delete r[boundLocal]
                }
            }

            return r;
        }

        private kindJson(k:Kind):any
        {
            var par = k.parentLibrary()

            if (par && !par.isThis())
                return { l: this.ref(par), o: k.getName() }

            if (k instanceof RecordEntryKind)
                return { o: k.getName() }

            if (k instanceof ParametricKind) {
                var pk = <ParametricKind>k;
                if (pk.parameters && pk.parameters.length)
                    return { g: pk.root.getName(), a: pk.parameters.map((k) => this.kindJson(k)) }
                else
                    return { g: pk.root.getName() }
            }

            return k.getName()
        }

        private kind(k:Kind):JTypeRef
        {
            var r = this.kindJson(k)
            if (typeof r === "object") return <any>JSON.stringify(r)
            return <any>r;
        }

        public toJson(n:AstNode)
        {
            return this.fixupJson(n, this.dispatch(n));
        }

        private possiblyEmptyBlock(b:CodeBlock)
        {
            var s = this.toJsons(b.stmts)
            if (isEmptyBlock(s)) return undefined;
            else return s;
        }

        private toJsons(n:AstNode[]):any[]
        {
            return n.map((e) => this.toJson(e))
        }

        private ref(n:AstNode)
        {
            if (!n) return null;
            if (n instanceof Decl && (<Decl>n).deleted) {
                var d = <Decl>n;
                if (this.deletedDecls.indexOf(d) < 0) {
                    this.deletedDecls.push(d)
                    var nm = d.getName()
                    if (d instanceof Action) {
                        var par = (<Action>d).parentLibrary()
                        if (!par.isThis()) nm = par.getName() + "->" + nm;
                    }
                    var id = Util.base64Encode(Util.toUTF8("\u0002" + d.nodeType() + ":" + nm)).replace(/[^a-zA-Z0-9]/g, "") + "Z"
                    d.stableId = AstNode.freshNameCore(id, (n) => this.deletedDecls.some(d => d.stableId == n))
                }
            }
            return n.stableId;
        }


        public visitOperator(n:Operator):any {
            // until we have operators with spaces, no quoting should be needed
            if (this.shortMode) return "," + n.data;
            return { op: n.data }
        }

        public visitPropertyRef(n:PropertyRef) {
            var fwd = n.prop.forwardsTo()
            if (fwd instanceof Action)
                fwd = (<Action>fwd).extensionForward()
            if (this.shortMode)
                return fwd ? "#" + fwd.stableId : "." + idUrlQuote(n.getText());
            var r:any = {
                name: n.getText(),
                parent: n.prop.parentKind,
            }
            if (fwd)
                r.declId = this.ref(fwd)
            return r;
        }

        public visitLiteral(n:Literal):any {
            if (this.shortMode) {
                switch (typeof n.data) {
                    case "string": return "'" + idUrlQuote(n.data);
                    case "boolean": return n.data ? "T" : "F";
                    default: Util.oops("bad literal " + n.data)
                }
            }
            return {
                nodeType: (typeof n.data) + "Literal",
                value: n.data,
                stringForm: n.stringForm,
                enumValue: n.enumVal,
            }
        }

        public visitThingRef(n:ThingRef):any {
            if (n.def instanceof LocalDef) {
                if (!this.seenIds.hasOwnProperty(n.def.stableId))
                    this.addLocals.push(this.toJson(n.def))
                if (this.shortMode) return "$" + n.def.stableId;
                return {
                    nodeType: "localRef",
                    name: n.getText(),
                    localId: this.ref(n.def),
                }
            } else if (n.def instanceof PlaceholderDef) {
                var pl = <PlaceholderDef>n.def
                if (this.shortMode) return "?" + idUrlQuote(<any>this.kind(n.def.getKind())) + ":" + idUrlQuote(pl.label || "")
                return {
                    nodeType: "placeholder",
                    name: pl.label || "",
                    type: n.def.getKind(),
                }
            } else if (n.def instanceof SingletonDef) {
                if (this.shortMode) return ":" + idUrlQuote(n.getText())
                return {
                    nodeType: "singletonRef",
                    name: n.getText(),
                    type: n.def.getKind(),
                    libraryName: n.namespaceLibrary ? n.namespaceLibrary.getName() : undefined,
                }
            } else
                Util.oops("unknown def " + (n.def ? n.def.nodeType() : "null"))
        }

        public visitCall(n:Call) {
            var r = this.visitPropertyRef(n.propRef)
            r.nodeType = "call";
            r.args = this.toJsons(n.args);
            if (n.calledExtensionAction() != null)
                r.callType = "extension";
            if (n.referencedRecordField() != null)
                r.callType = "field";
            return r;
        }

        public visitExprHolder(n:ExprHolder):any {
            if (this.shortMode)
                return n.tokens.map(t => t.accept(this)).join(" ")

            var ai = n.assignmentInfo()
            var locals = ai ? this.toJsons(ai.definedVars).slice(0) : []
            var r = {
                tokens: this.toJsons(n.tokens),
                tree: this.toJson(n.parsed),
                locals: locals
            }
            if (this.addLocals.length > 0) {
                locals.pushRange(this.addLocals);
                this.addLocals = []
            }
            if (n.locals)
                (<any>r).allLocals = this.toJsons(n.locals);
            return r
        }

        public visitComment(n:Comment) {
            return { text: n.text }
        }
        // all other blocks will be just arrays
        //public visitCodeBlock(n:Block) {
        //    return { stmts: this.toJsons(n.stmts) }
        //}

        public visitBlock(n:Block) {
            return this.toJsons(n.stmts)
        }

        public visitFor(n:For) {
            return {
                index: n.boundLocal,
                bound: n.upperBound,
                body: n.body
            }
        }

        public visitForeach(n:Foreach) {
            return {
                iterator: n.boundLocal,
                collection: n.collection,
                conditions: n.conditions,
                body: n.body
            }
        }

        public visitWhile(n:While) {
            return {
                condition: n.condition,
                body: n.body
            }
        }

        public visitShow(n:Call) {
            return {
                nodeType: "show",
                expr: n.args[0],
            }
        }

        public visitReturn(n:Call) {
            return {
                nodeType: "return",
                expr: n.args[0],
            }
        }

        public visitBreak(n:Call) {
            return {
                nodeType: "break",
            }
        }

        public visitContinue(n:Call) {
            return {
                nodeType: "continue",
            }
        }

        public visitBox(n:Box) {
            return { body: n.body }
        }

        public visitAnyIf(n:If) {
            return {
                nodeType: "if",
                condition: n.rawCondition,
                thenBody: n.rawThenBody,
                elseBody: this.possiblyEmptyBlock(n.rawElseBody),
                isElseIf: n.isElseIf,
            }
        }

        public visitWhere(n:Where) {
            return { condition: n.condition }
        }

        public visitExprStmt(n:ExprStmt) {
            return { expr: n.expr }
        }

        public visitInlineActions(n:InlineActions) {
            var r:any = this.visitExprStmt(n)
            r.actions = n.actions
            return r;
        }

        public visitInlineAction(n:InlineAction) {
            return {
                reference: n.name,
                inParameters: this.toJsons(n.inParameters),
                outParameters: this.toJsons(n.outParameters),
                isImplicit: n.isImplicit,
                isOptional: n.isOptional,
                body: n.body,
            }
        }

        public visitOptionalParameter(n:OptionalParameter) {
            return {
                name: n.getName(),
                declId: this.ref(n.recordField),
                expr: n.expr
            }
        }

        public visitActionParameter(n:ActionParameter) {
            return this.toJson(n.local);
        }

        public visitAction(n:Action) {
            return this.visitActionCore(n, !this.reflectionMode);
        }

        public visitActionCore(n:Action, includeBody:boolean) {
            var r:any = {
                name: n.getName(),
                inParameters: this.toJsons(n.header.inParameters.stmts),
                outParameters: n.header.outParameters,
                isPrivate: /*n.isEvent() ||*/ !!n.isPrivate,
                isTest: !!n.isTest(),
                isQuery: !!n.isQuery,
                isOffline: !!n.isOffline,
                isAsync: !n.isAtomic,
                description: n.getInlineHelp() || "",
                unused: n.visitorState !== true,
            }

            if (n.isPage()) {
                r.nodeType = "page";
                if (n.modelParameter) {
                    r.inParameters.unshift(this.toJson(n.modelParameter))
                    r.hasModelParameter = true;
                }
                if (includeBody) {
                    var b = n.getPageBlock(true);
                    r.initBody = b
                    r.initBodyId = b.parent.stableId
                    b = n.getPageBlock(false);
                    r.displayBody = b
                    r.displayBodyId = b.parent.stableId
                }
            } else if (n.isEvent()) {
                r.nodeType = "event";
                r.eventName = n.eventInfo.type.category;
                r.eventVariableId = this.ref(n.eventInfo.onVariable);
                if (includeBody)
                    r.body = n.body;
            } else if (n.isActionTypeDef()) {
                r.nodeType = "actionType";
                if (includeBody)
                    r.body = n.body;
            } else {
                r.nodeType = "action";
                if (includeBody)
                    r.body = n.body;
            }

            return r;
        }

        public visitGlobalDef(n:GlobalDef) {
            var r:any = {
                name: n.getName(),
                comment: n.comment,
                type: n.getKind(),
                isReadonly: n.readonly,
                isTransient: n.isTransient,
                isCloudEnabled: n.cloudEnabled,
                value: n.stringResourceValue(),
                unused: n.visitorState !== true,
            }

            if (n.isResource) {
                r.nodeType = "art";
                r.url = n.url;
            } else {
                r.nodeType = "data";
            }

            return r;
        }

        public visitLibraryRef(n:LibraryRef) {
            return {
                nodeType: "library",
                name: n.getName(),
                libIdentifier: n.getId(),
                libIsPublished: n.isPublished(),
                scriptName: n.resolved ? n.resolved.getName() : null,
                exportedTypes: n.getPublicKinds().map((k) => Lexer.quoteId(k.getName())).join(" "),
                exportedTypeDefs: n.getPublicKinds().map((k, i) => {
                    if (k instanceof LibraryRefAbstractKind)
                        return {
                            nodeType: "libAbstractType",
                            name: k.getName(),
                            id: n.stableId + "$tp" + i
                        }
                    else if (k instanceof UserActionKind) {
                        var a = (<UserActionKind>k).userAction
                        var j = this.visitActionCore(a, false)
                        j.nodeType = "libActionType";
                        return this.fixupJson(a, j)
                    } else if (k.getRecord()) {
                        var j = this.toJson(k.getRecord())
                        j.nodeType = "libRecordType"
                        return j
                    } else {
                        Util.die()
                    }
                }),
                exportedActions: n.getPublicActions().map((a) => {
                    var j = this.visitActionCore(a, false);
                    j.nodeType = "libAction";
                    var p = a.parentLibrary();
                    if (p && p.isThis()) p = null;
                    j.parentLibId = this.ref(p) || "";
                    return this.fixupJson(a, j)
                }),
                resolveClauses: n.resolveClauses,
            }
        }

        public visitRecordDef(n:RecordDef) {
            return {
                nodeType: "record",
                name: n.getCoreName(),
                sourceName: n.getName(),
                comment: n.description,
                category: n.getDefTerminology(),
                isCloudEnabled: n.cloudEnabled,
                isCloudPartiallyEnabled: n.cloudPartiallyEnabled,
                isPersistent: n.persistent,
                isExported: n.isExported(),
                keys: n.keys,
                fields: n.values,
                unused: n.visitorState !== true,
            }
        }

        public visitLocalDef(n:LocalDef) {
            return {
                name: n.getName(),
                type: n.getKind(),
            }
        }

        public visitApp(n:App) {
            Compiler.markUsedStuff(n);
            n.stableId = "app";
            var r:any = {
                textVersion: App.currentVersion,
                jsonVersion: this.shortMode ? Dumper.shortVersion : Dumper.version,
                name: n.getName(),
                comment: n.comment,
                icon: n.icon,
                color: n.color,
                iconArtId: n.iconArtId,
                spashArtId: n.splashArtId,
                autoIcon: SVG.justName(n.iconPath()),
                autoColor: n.htmlColor(),
                platform: n.getCapabilityString(),
                rootId: n.rootId,
            }
            App.metaMapping.forEach((k) => {
                r[k] = !!(<any>n)[k];
            })
            if (this.reflectionMode) {
                r.decls = this.toJsons(n.actions().filter(a => !a.isPrivate))
            } else {
                r.decls = this.toJsons(n.things)
                r.deletedDecls = this.deletedDecls.map(d => {
                    var j:any = { name: d.getName() }
                    if (d instanceof LibraryRefAction) {
                        var par = (<Action>d).parentLibrary()
                        j.parentLibId = this.ref(par)
                    }
                    return this.fixupJson(d, j)
                })
            }
            return r;
        }

        public visitKindBinding(n:KindBinding) {
            return {
                nodeType: "typeBinding",
                name: n.formalName,
                isExplicit: n.isExplicit,
                type: n.actual
            }
        }

        public visitActionBinding(n:ActionBinding) {

            var act = n.actual
            if (act && act.parentLibrary() && act.parentLibrary().deleted)
                act.deleted = true;

            if (!act) {
                act = new LibraryRefAction(n.actualLib)
                act.deleted = true;
                act.setName(n.actualName)
            }

            // create deletedDecl if needed
            this.ref(act.parentLibrary());

            return {
                name: n.formalName,
                isExplicit: n.isExplicit,
                actionId: this.ref(act),
            }
        }

        public visitResolveClause(n:ResolveClause) {
            return {
                name: n.name,
                defaultLibId: !n.defaultLib || n.defaultLib.isThis() ? null : this.ref(n.defaultLib),
                withTypes: n.kindBindings,
                withActions: n.actionBindings,
            }
        }

        public visitRecordField(n:RecordField) {
            return {
                nodeType: n.isKey ? "recordKey" : "recordField",
                name: n.getName(),
                type: n.dataKind,
            }
        }
    }

    export function shortToTokens(shortForm:string):any[]
    {
        var uq = idUrlUnquote

        function oneToken(s:string):any {
            var v = s.slice(1)
            switch (s[0]) {
                case ",": return { nodeType: "operator", op: v }
                case "#": return { nodeType: "propertyRef", declId: v }
                case ".": return { nodeType: "propertyRef", name: uq(v) }
                case "'": return { nodeType: "stringLiteral", value: uq(v) }
                case "F":
                case "T": return { nodeType: "booleanLiteral", value: (s[0] == "T") }
                case "$": return { nodeType: "localRef", localId: v }
                case ":": return { nodeType: "singletonRef", name: uq(v) }
                case "?":
                    var cln = v.indexOf(':')
                    if (cln > 0)
                        return { nodeType: "placeholder", type: uq(v.slice(0, cln)), name: uq(v.slice(cln + 1)) }
                    else
                        return { nodeType: "placeholder", type: uq(v) }
                default:
                    throw new Error("wrong short form: " + s)
            }
        }

        if (!shortForm) return []; // handles "" and null; the code below is incorrect for ""

        return <any[]>shortForm.split(" ").map(oneToken)
    }

    export function longToShort(t:any) {
        var q = idUrlQuote
        switch (t.nodeType) {
            case "operator": return "," + t.op
            case "propertyRef":
                if (t.declId !== undefined) return "#" + t.declId
                else return "." + q(t.name)
            case "stringLiteral": return "'" + q(t.value)
            case "booleanLiteral": return t.value ? "T" : "F"
            case "localRef": return "$" + t.localId
            case "singletonRef": return ":" + q(t.name)
            case "placeholder":
                return "?" + q(t.type) + (t.name != null ? ":" + q(t.name) : "")
            default:
                Util.oops("wrong " + t.nodeType)
        }
    }

    export function serialize(j:JApp, skipIds = false)
    {
        var tw = TokenWriter.forStorage();
        var lookup:any;
        var nodesById:any = {}
        var skipStmtIds = skipIds

        function addNode(j) {
            if (!j) return;
            if (Array.isArray(j)) j.forEach(addNode);
            else if (j.nodeType) {
                if (j.id) nodesById[j.id] = j;
                Object.keys(j).forEach((k) => addNode(j[k]))
            }
        }
        addNode(j);

        function self(j:JNode)
        {
            if (!j.nodeType) Util.oops("no node type");

            if (lookup.hasOwnProperty(j.nodeType))
                lookup[j.nodeType](j);
            else
                Util.oops("unhandled nodeType: " + j.nodeType)
        }

        function selfEh(n:JStmt, j:JExprHolder)
        {
            if (typeof j == "string") {
                var sj:string = <any>j;
                j = <any>{ nodeType: "exprHolder", tokens: shortToTokens(sj) }
            }

            self(j)
        }

        function lines(js:JNode[])
        {
            js.forEach((n) => { self(n); tw.nl(); });
        }

        function block(js:JNode[])
        {
            tw.beginBlock();
            var isElseIf = (n:JStmt) => n && n.nodeType == "if" && (<JIf>n).isElseIf;

            for (var i = 0; i < js.length; ++i) {
                var s = js[i]
                if (s.nodeType == "if" && isElseIf(js[i+1])) {
                    var si = <JIf>s;
                    self(si);
                    var numOpen = 0
                    while (true) {
                        tw.keyword("else").op("{")
                        numOpen++;
                        if (!isElseIf(js[i+1]))
                            break;
                        i++;
                        si = <JIf>js[i];
                        self(si)
                        if (!isEmptyBlock(si.elseBody))
                            break;
                    }
                    while (numOpen-- > 0)
                        tw.op("}");
                    tw.nl();
                } else {
                    self(s);
                }
            }

            tw.endBlock();
        }

        function jsonKind(k:any)
        {
            if (k.g) {
                kind(k.g)
                if (k.a) {
                    tw.op0("[");
                    k.a.forEach((a, i) => {
                        if (i > 0) tw.op(",")
                        jsonKind(a)
                    })
                    tw.op0("]");
                }
            } else if (k.o) {
                if (k.l) {
                    var nn = findNode(k.l)
                    tw.op(AST.libSymbol).id(nn.name).op("\u2192").id(k.o);
                } else tw.op0("*").id(k.o);
            } else if (typeof k === "string") {
                tw.id(k)
            } else {
                Util.oops("bad kind: " + JSON.stringify(k))
            }
        }

        function kind(k:JTypeRef)
        {
            if (typeof k === "string") {
                var s = <string><any>k;
                if (s[0] == "{" || s[0] == '"')
                    jsonKind(JSON.parse(s))
                else
                    tw.id(s)
            } else jsonKind(k)
        }

        function actionParms(a:JActionBase)
        {
            function writeParms(ps:JLocalDef[]) {
                ps.forEach((p, i) => {
                    if (i > 0) tw.op0(",").space();
                    stmt(p)
                    tw.id(p.name).op(":");
                    kind(p.type);
                });
            }

            tw.op0("(");
            writeParms(a.inParameters);
            tw.op0(")");

            if (a.outParameters.length > 0) {
                tw.keyword("returns").op0("(");
                writeParms(a.outParameters);
                tw.op0(")");
            }
            tw.nl();
        }

        function decl(d:JDecl)
        {
            if (!skipIds)
                tw.uniqueId(d.id)
        }

        function stmt(s:JNode)
        {
            if (!skipStmtIds)
                tw.uniqueId(s.id)
        }

        function actionHeader(a:JActionBase)
        {
            decl(a)
            tw.keyword(a.nodeType == "event" ? "event" : "action");
            if (a.nodeType == "libAction" || a.nodeType == "libActionType")
                tw.op(a.isAsync ? "async" : "sync");
            if (a.nodeType == "libActionType" || a.nodeType == "actionType")
                tw.op("type")
            tw.id(a.name);
            actionParms(a);
        }

        function actionMeta(a:JActionBase)
        {
            if (a.isPrivate)
                tw.keyword("meta").keyword("private").op0(";").nl();
            if (a.nodeType == "page")
                tw.keyword("meta").keyword("page").op0(";").nl();
            if (a.isOffline)
                tw.keyword("meta").keyword("offline").op0(";").nl();
            if (a.isQuery)
                tw.keyword("meta").keyword("query").op0(";").nl();
            if (a.isTest)
                tw.keyword("meta").keyword("test").op0(";").nl();
            if (!a.isAsync)
                tw.keyword("meta").keyword("sync").op0(";").nl();
        }

        function libRef(n:string)
        {
            return tw.op(libSymbol).id(n);
        }

        function findNode(id:JNodeRef)
        {
            var i = <any>id;
            if (nodesById.hasOwnProperty(i))
                return nodesById[i];
            return null;
        }

        function stringForm(n:JNumberLiteral) {
            var s = n.stringForm
            if (!s || (typeof n.value == "number" && parseFloat(s) !== n.value)) {
                s = Util.numberToStringNoE(n.value)
                if (/e/.test(s)) Util.oops("too big number in flattining; sorry, not implemented yet")
            }
            return s.split("")
        }


        function flatten(e0:JExpr)
        {
            var r:JToken[] = []

            function pushOp(c:string) {
                r.push(<JOperator>{
                    nodeType: "operator",
                    id: "",
                    op: c
                })
            }

            function call(e:JCall, outPrio:number) {
                var infixPri = 0
                var k = api.getKind(<any>e.parent || "")
                if (k) {
                    var p = k.getProperty(e.name || "")
                    if (p)
                        infixPri = p.getInfixPriority() || 0
                }
                if (infixPri) {
                    if (e.name == "-" &&
                        (e.args[0].nodeType == "numberLiteral") &&
                        ((<JNumberLiteral>e.args[0]).value === 0.0) &&
                        (!(<JNumberLiteral>e.args[0]).stringForm)) {
                        pushOp(e.name)
                        rec(e.args[1], 98)
                        return
                    }

                    if (infixPri < outPrio) pushOp("(");
                    if (e.args.length == 1) {
                        pushOp(e.name)
                        rec(e.args[0], infixPri)
                    } else {
                        var bindLeft = infixPri != 4 && infixPri != 98
                        rec(e.args[0],  bindLeft ? infixPri : infixPri + 0.1)
                        pushOp(e.name)
                        rec(e.args[1], !bindLeft ? infixPri : infixPri + 0.1)
                    }
                    if (infixPri < outPrio) pushOp(")");
                } else {
                    rec(e.args[0], 1000)
                    r.push(<JPropertyRef><any>{
                        nodeType: "propertyRef",
                        name: e.name,
                        parent: e.parent,
                        declId: e.declId,
                    })
                    if (e.args.length > 1) {
                        pushOp("(")
                        e.args.slice(1).forEach((ee, i) => {
                            if (i > 0) pushOp(",")
                            rec(ee, -1)
                        })
                        pushOp(")")
                    }
                }
            }

            function rec(e:JExpr, prio:number) {
                switch (e.nodeType) {
                    case "call":
                        call(<JCall>e, prio)
                        break;
                    case "numberLiteral":
                        stringForm(<JNumberLiteral>e).forEach(pushOp)
                        break;
                    case "stringLiteral":
                    case "booleanLiteral":
                    case "localRef":
                    case "placeholder":
                    case "singletonRef":
                        r.push(e);
                        break;
                    case "show":
                    case "break":
                    case "return":
                    case "continue":
                        pushOp(e.nodeType)
                        var ee = (<JReturn>e).expr
                        if (ee)
                            rec(ee, prio)
                        break
                    default:
                        Util.oops("invalid nodeType when flattning: " + e.nodeType)
                }
            }

            rec(e0, -1)

            return r
        }

        var isDigit = (o:JToken) => o && o.nodeType == "operator" && /^[0-9\.]$/.test((<JOperator>o).op);

        lookup = {
            "stringLiteral": (n:JStringLiteral) => {
                tw.string(n.value);
            },

            "booleanLiteral": (n:JBooleanLiteral) => {
                tw.id(n.value ? "true" : "false")
            },

            "numberLiteral": (n:JNumberLiteral) => {
                stringForm(n).forEach(v => tw.op(v))
            },

            "libAbstractType": (n:JLibAbstractType) => {
                tw.keyword("type").sep().id(n.name).nl();
            },

            "libActionType": (n:JLibActionType) => {
                actionHeader(n)
            },

            "libRecordType": (n:JRecord) => {
                lookup.record(n)
            },

            "actionType": (n:JActionType) => {
                lookup.action(n)
            },

            "library": (n:JLibrary) => {
                decl(n);
                tw.keyword("meta").id("import").id(n.name);
                tw.beginBlock();
                    tw.id(n.libIsPublished ? "pub" : "guid").string(n.libIdentifier).nl();
                    tw.id("usage");
                    tw.beginBlock();
                        var exp = n.exportedTypeDefs || []
                        exp.forEach(self)
                        n.exportedActions.forEach(actionHeader);
                        tw.nl();
                    tw.endBlock();
                    n.resolveClauses.forEach(self);
                tw.endBlock();
            },

            "resolveClause": (r:JResolveClause) => {
                stmt(r)
                tw.id("resolve").id(r.name).op("=");
                if (!r.defaultLibId) libRef("this");
                else libRef(findNode(r.defaultLibId).name)
                tw.id("with");
                tw.beginBlock();
                    r.withTypes.forEach(self);
                    r.withActions.forEach(self);
                tw.endBlock();
            },

            "typeBinding": (n:JTypeBinding) => {
                if (n.isExplicit) {
                    stmt(n)
                    tw.keyword("type").id(n.name).op("=");
                    kind(n.type);
                }
            },

            "actionBinding": (n:JActionBinding) => {
                if (n.isExplicit) {
                    stmt(n)
                    tw.keyword("action").id(n.name).op("=");
                    var a = findNode(n.actionId);
                    libRef(a.parentLibId ? findNode(a.parentLibId).name : "this")
                    tw.op("\u2192").id(a.name).nl();
                }
            },

            "record": (n:JRecord) => {
                decl(n)
                tw.keyword("table").id(n.name)
                tw.beginBlock();
                    if (n.comment)
                        tw.comment(n.comment);
                    tw.stringAttr("type", Util.capitalizeFirst(n.category));
                    tw.boolOptAttr("cloudenabled", n.isCloudEnabled);
                    tw.boolOptAttr("cloudpartiallyenabled", n.isCloudPartiallyEnabled);
                    tw.boolOptAttr("exported", n.isExported);
                    tw.boolAttr("persistent", n.isPersistent);
                    if (n.keys.length > 0) {
                        tw.id("keys");
                        block(n.keys);
                    }
                    if (n.fields.length > 0) {
                        tw.id("fields");
                        block(n.fields);
                    }
                tw.endBlock();
            },

            "recordKey": (n:JRecordKey) => {
                lookup.recordField(n);
            },

            "recordField": (n:JRecordField) => {
                if (!skipIds)
                    tw.uniqueId(n.id);
                tw.id(n.name).op(":");
                kind(n.type);
                tw.nl();
            },

            "data": (n:JData) => {
                lookup.art(n);
            },

            "art": (n:JArt) => {
                decl(n)
                tw.keyword("var").id(n.name).op(":");
                kind(n.type);
                tw.beginBlock();
                    if (!!n.comment)
                        tw.comment(n.comment);
                    tw.boolOptAttr("readonly", n.isReadonly);
                    tw.boolOptAttr("is_resource", n.nodeType == "art");
                    tw.boolOptAttr("transient", n.isTransient);
                    tw.boolOptAttr("cloudenabled", n.isCloudEnabled);
                    if (!!n.url) tw.stringAttr("url", n.url);
                tw.endBlock();
            },

            "page": (n:JPage) => {
                actionHeader(n);
                tw.beginBlock();
                    if (!skipStmtIds)
                        tw.uniqueId(n.initBodyId)
                    tw.keyword("if").id("box").op("->").id("is init").keyword("then");
                    block(n.initBody);
                    if (!skipStmtIds)
                        tw.uniqueId(n.displayBodyId)
                    tw.keyword("if").id("true").keyword("then");
                    block(n.displayBody)
                    actionMeta(n);
                tw.endBlock();
            },

            "action": (n:JAction) => {
                actionHeader(n);
                block(n.body);
                tw.backspaceBlockEnd();
                    actionMeta(n);
                tw.endBlock();
            },

            "event": (n:JEvent) => {
                lookup.action(n);
            },

            "localDef": (n:JLocalDef) => {
                Util.die();
            },

            "app": (n:JApp) => {
                if (!n.hasIds)
                    skipStmtIds = true
                tw.meta("version", App.currentVersion);  // n.textVersion?
                tw.meta("name", n.name);
                tw.metaOpt("icon", n.icon);
                if (n.color)
                    tw.metaOpt("color", /^#......$/.test(n.color) ? "#ff" + n.color.slice(1) : n.color);
                App.metaMapping.forEach((k) => {
                    tw.metaOpt(k, (<any>n)[k] ? "yes" : "");
                })
                tw.meta("platform", n.platform);
                tw.meta("rootId", n.rootId);
                if (!!n.comment)
                    tw.comment(n.comment);
                n.decls.forEach(self);
            },

            "comment": (n:JComment) => {
                stmt(n)
                tw.comment(n.text);
            },

            "for": (n:JFor) => {
                stmt(n)
                var idx = n.index || n.locals[0]
                tw.keyword("for").op("0").op("\u2264").id(idx.name).op("<");
                selfEh(n, n.bound);
                tw.keyword("do");
                block(n.body);
            },

            "foreach": (n:JForeach) => {
                stmt(n)
                var idx = n.iterator || n.locals[0]
                tw.keyword("foreach").id(idx.name).keyword("in");
                selfEh(n, n.collection);
                tw.nl();
                n.conditions.forEach(self);
                tw.keyword("do");
                block(n.body);
            },

            "where": (n:JWhere) => {
                stmt(n)
                tw.keyword("where");
                selfEh(<any>n, n.condition);
                tw.nl();
            },

            "while": (n:JWhile) => {
                stmt(n)
                tw.keyword("while");
                selfEh(n, n.condition);
                tw.keyword("do");
                block(n.body);
            },

            "if": (n:JIf) => {
                stmt(n)
                tw.keyword("if");
                selfEh(n, n.condition);
                tw.keyword("then");
                block(n.thenBody);
                if (!isEmptyBlock(n.elseBody)) {
                    tw.keyword("else");
                    block(n.elseBody);
                }
            },

            "boxed": (n:JBoxed) => {
                stmt(n)
                tw.keyword("do").id("box");
                block(n.body);
            },

            "exprStmt": (n:JExprStmt) => {
                stmt(n)
                if (isPlaceholder(n.expr)) tw.keyword("skip");
                else selfEh(n, n.expr);
                tw.op0(";").nl();
            },

            "inlineActions": (n:JInlineActions) => {
                lookup.exprStmt(n);
                n.actions.forEach(self);
            },

            "inlineAction": (n:JInlineAction) => {
                var idx = n.reference || n.locals[0]
                stmt(n)
                tw.keyword("where")
                if (n.isImplicit)
                    tw.op("implicit")
                if (n.isOptional)
                    tw.op("optional")
                tw.id(idx.name);
                actionParms(<any>n);
                block(n.body);
            },

            "optionalParameter": (n:JOptionalParameter) => {
                stmt(n)
                tw.keyword("where").id(n.declId ? findNode(n.declId).name : n.name).op(":=");
                selfEh(n, n.expr);
                tw.op0(";").nl();
            },

            "exprHolder": (n:JExprHolder) => {
                if (n.tree && !n.tokens) {
                    n.tokens = flatten(n.tree);
                }

                if (n.tokens.length == 0) {
                    tw.op("...");
                } else {
                    var prev = null;
                    n.tokens.forEach((t) => {
                        if (isDigit(t)) {
                            if (!isDigit(prev)) tw.sep();
                            tw.op0((<JOperator>t).op);
                        } else {
                            self(t);
                        }
                        prev = t;
                    });
                }
            },

            "operator": (n:JOperator) => {
                tw.op(n.op);
            },

            "propertyRef": (n:JPropertyRef) => {
                if (n.declId) {
                    var d = findNode(n.declId)
                    if (d) {
                        var cat = (<JRecord>d).category || "object"
                        var nm = d.name
                        if (cat == "decorator" && (<JRecord>d).keys[0]) {
                            var tp = <any>(<JRecord>d).keys[0].type
                            if (tp[0] == '{') {
                                var kk = JSON.parse(tp)
                                if (/*kk.l || kk.g ||*/ !kk.o)
                                    Util.oops("complex decorator: " + tp)
                                else
                                    tp = kk.o;
                            }
                            nm = tp + " decorator"
                        } else if (cat != "object") {
                            nm = nm + " " + cat
                        }
                        tw.sep().op0("\u2192").id0(nm)
                        return;
                    }
                }

                tw.sep().op0("\u2192").id0(n.name == null ? "<unbound>" : n.name);
            },

            "singletonRef": (n:JSingletonRef) => {
                tw.id(n.name);
                if (n.libraryName) 
                    tw.op0("[").id("lib").id(n.libraryName).op0("]")
            },

            "localRef": (n:JLocalRef) => {
                tw.sep().op0("$");
                if (n.localId) tw.id0(findNode(n.localId).name);
                else tw.id0(n.name);
            },

            "placeholder": (n:JPlaceholder) => {
                tw.id(ThingRef.placeholderPrefix + n.type + (n.name ? ":" + n.name : ""))
            },

            "call": (n:JCall) => {
                Util.die()
            },
        }

        self(j);
        var scriptText = tw.finalize();
        return scriptText
    }

    export function reflectionInfo(a:App)
    {
        var d = new Dumper(false)
        d.reflectionMode = true

        var res:JApp[] = []
        a.librariesAndThis().map(l => {
            if (l.resolved) {
                var r:JApp = d.toJson(l.resolved)
                r.libraryName = l.getName()
                r.libraryId = l.getStableName()
                res.push(r)
            }
        })
        return res
    }
}
