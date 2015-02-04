///<reference path='refs.ts'/>

module TDev.AST {
    // update library references
     export class SplitAppIntoAppAndLibrary {
        constructor() {
            this.ddManager = new DeclAndDepsManager();
        }

        private ddManager: DeclAndDepsManager = null;
        private theApp: App = null;
        private targetLibrary: LibraryRef = null;
        private declsSelectedToMove: DeclAndDeps[] = [];
        private otherDeclsToMove: DeclAndDeps[] = [];
        private remainingDecls: DeclAndDeps[] = null;
        public appRewritten: string = null
        public library: string = null;

        public getAllDeclsToMove(): DeclAndDeps[]{
            return this.declsSelectedToMove.concat(this.otherDeclsToMove);
        }
        public getRemainingDecls(): DeclAndDeps[] {
            return this.remainingDecls;
        }

        private programChanged(): boolean {
            var all = this.ddManager.getAll().filter(dd => !(dd.decl instanceof LibraryRef));
            if (all.length == this.theApp.things.length) {
                var ret = true;
                this.theApp.things.forEach(d => { ret = ret && d.cachedSerialized.idx >= 0; });
                this.ddManager.getAll().forEach(dd => {
                    ret = ret && this.theApp.things.indexOf(dd.decl) >= 0;
                });
                return ret;
            } else {
                return false;
            }
        }

        public invalidate() {
            // we should only do this if the program changed (it's an expensive operation)
            if (this.targetLibrary != null && this.programChanged()) {
                this.ddManager.invalidate(); // get rid of all derived information
                this.otherDeclsToMove = [];  // ""
                this.remainingDecls = null;  // ""
                var remove = [];
                this.ddManager.getAll().forEach(dd => {
                    if (this.theApp.things.indexOf(dd.decl) < 0) {
                        remove.push(dd);
                    }
                });
                remove.forEach(dd => {
                    this.ddManager.remove(dd);
                    var idx = this.declsSelectedToMove.indexOf(dd);
                    if (idx >= 0) this.declsSelectedToMove.splice(idx);
                });
                // add back the require elements
                this.addToDeclsToMove(this.declsSelectedToMove);
            }
        }

        public getAll(): DeclAndDeps[] {
            return this.ddManager.getAll();
        }

        public getter(d: Decl): DeclAndDeps {
            return this.ddManager.getter(d);
        }

        public setAppAndLib(a: App, l: LibraryRef): boolean {
            if (this.targetLibrary == null) {
                this.theApp = a;
                this.targetLibrary = l;
                return true;
            } else {
                return false;
            }
        }

        public getApp(): App {
            return this.theApp;
        }

        public getLib(): LibraryRef {
            return this.targetLibrary;
        }

        public addToDeclsToMove(newOnes: DeclAndDeps[]) {
            // we ensure that declsToMove always is downwards closed,
            // which means that the split into app/library is well-defined
            var theRest = this.computeClosure(newOnes);
            newOnes.forEach(dd => {
                if (this.declsSelectedToMove.indexOf(dd) < 0) {
                    this.declsSelectedToMove.push(dd)
                }
            });
            theRest.forEach(dd => {
                if (this.declsSelectedToMove.indexOf(dd) < 0 && this.otherDeclsToMove.indexOf(dd) < 0) {
                    this.otherDeclsToMove.push(dd)
                }
            });
            this.computeRemaining();
        }

        public computeClosure(roots: DeclAndDeps[]): DeclAndDeps[] {
            return this.computeClosureRaw(roots, this.getAllDeclsToMove());
        }

        private computeRemaining() {
            if (this.remainingDecls == null) {
                this.remainingDecls = [];
                this.theApp.things.forEach(t => {
                    if (!(t instanceof Action && (<Action>t).isEvent())) {
                        var dd = this.ddManager.getter(t);
                        if (this.getAllDeclsToMove().indexOf(dd) < 0) {
                            this.remainingDecls.push(dd);
                        }
                    }
                });
            } else {
                this.remainingDecls = this.remainingDecls.filter((a) => this.getAllDeclsToMove().indexOf(a) < 0);
            }
        }

        private computeClosureRaw(roots: DeclAndDeps[], alreadyIn: DeclAndDeps[]) {
            var theRest = [];
            DeclAndDeps.computeClosure(roots, alreadyIn, theRest);
            return theRest.filter(dd => dd.decl != this.targetLibrary);
        }

        public makeSplit() {
            // sanity checks
            if (this.targetLibrary == null || this.getAllDeclsToMove() == [])
                return;

            // which library actions will be public?
            var actions = this.getAllDeclsToMove().filter(dd => dd.decl instanceof Action);
            actions.forEach(dd => (<Action>dd.decl).isPrivate = true);
            this.remainingDecls.filter(dd => dd.decl instanceof Action).forEach(a => {
                // check for calls into library from app and make actions public as needed
                a.getActions().forEach(b => {
                    if (actions.indexOf(b) >= 0) {
                        var act = <Action>b.decl;
                        act.isPrivate = false;
                        // if parameter of b is a callback, make it public
                        // (this is a special case that we might generalize later
                        // if record types and other types can be exported from
                        // library concretely)
                        act.getInParameters().forEach(p => {
                            if (p.local.getKind() instanceof UserActionKind) {
                                (<UserActionKind>p.local.getKind()).userAction.isPrivate = false;
                            }
                        });
                    }
                });
            });

            // keep a copy of originals in case user wants to revert
            this.getAllDeclsToMove().forEach(dd => { dd.serialized = dd.decl.serialize(); });

            // we need to rewrite the decls that depend on target library to remove the library reference
            var removeTarget = new RemoveLibraryReference(this.targetLibrary);
            this.getAllDeclsToMove().forEach(dd => removeTarget.dispatch(dd.decl));

            // create the accessor functions that will permit application to
            // access the fields/properties of the hidden data
            var accessors = new CreateAccessors(
                this.theApp,
                this.getAllDeclsToMove().filter(dd => !(dd.decl instanceof Action)).map(dd => dd.decl),
                this.remainingDecls);
            // add the accessors to the library
            accessors.getAccessorActions().forEach(act => this.targetLibrary.resolved.addDecl(act));

            // rewrite the application (given the accessor information)
            var rewriter = new RewriteApp(this.targetLibrary, actions.map(dd => dd.decl), accessors);
            rewriter.performRewrite(this.theApp);

            //  move everything to library
            //  NOTE: we are assuming that there are no name conflicts with things already in the library
            var libraryReferences = [];
            this.getAllDeclsToMove().forEach((dd) => {
                if (dd.decl != this.targetLibrary && dd.decl.parent == this.theApp) {
                    var decls = AST.Parser.parseDecls(dd.decl.serialize(), this.targetLibrary.resolved);
                    decls.forEach(d => {
                        if (d instanceof LibraryRef) {
                            if (libraryReferences.indexOf(d) < 0) {
                                libraryReferences.push(d);
                                this.targetLibrary.resolved.addDecl(d);
                            }
                        } else {
                            this.targetLibrary.resolved.addDecl(d);
                        }
                    });
                }
            });

            // resolve any new library references we've added to the target library
            this.targetLibrary.initializeResolves();

            // delete the decls that have been copied ('cept for LibraryRefs)
            this.getAllDeclsToMove().forEach(dd => {
                if (!(dd.decl instanceof LibraryRef)) {
                    this.theApp.deleteDecl(dd.decl);
                    dd.decl = null;
                } else {
                    // in order to delete a library reference, we need
                    // to show that it's no longer needed in the application
                }
            });

            // save the app and library
            InitIdVisitor.ensureOK(this.theApp)
            InitIdVisitor.ensureOK(this.targetLibrary.resolved)
            this.appRewritten = this.theApp.serialize();
            this.library = this.targetLibrary.resolved.serialize();
            // TODO: for testing, we will want to check that the above are syntactically
            // TODO: and semantically correct.
        }


    }


    class CreateAccessors {

        constructor(
            public theApp: App,
            public declsToLibrary: Decl[],
            public remaining: DeclAndDeps[]) {
            // go through the actions that remain in the application to see
            // what globals/fields/properties they access of decls that are
            // moving to the library
            remaining.forEach(dd => {
                dd.direct.readGlobals.forEach(rg => this.addGlobal(rg, "R"));
                dd.direct.writtenGlobals.forEach(wg => this.addGlobal(wg, "W"));
                dd.direct.readFields.forEach(rf => {
                    var stmt = rf.forwardsToStmt();
                    this.addField(<RecordField>stmt, "R");
                });
                dd.direct.readProps.forEach((rp, i) => {
                    this.addProperty(rp, dd.direct.readPropsWhat[i]);
                });
                dd.direct.writtenFields.forEach(wp => {
                    var stmt = wp.forwardsToStmt();
                    this.addField(<RecordField>stmt, "W")
                });
                dd.direct.asIEnumerable.forEach(e => {
                    if (this.declsToLibrary.indexOf(e) >= 0 && this.collectionOfRecords.indexOf(e) < 0)
                        this.collectionOfRecords.push(e);
                });
            });
        }

        // these are all derived from dd
        private rewriteFields: RecordField[] = [];
        private fieldModes: string[] = [];
        private rewriteGlobals: Decl[] = [];
        private globalModes: string[] = [];
        private globalThings: string[] = [];
        private rewriteProperties: IProperty[] = [];
        private rewritePropertiesExpr: Expr[] = [];
        private collectionOfRecords: RecordDef[] = [];

        private getRecordName(prop: IProperty): string {
            var rd = <RecordDef>prop.parentKind.getRecord();
            if (rd && this.declsToLibrary.indexOf(rd) >= 0) {
                return rd.getName() + " " + prop.getName();
            }
            return null;
        }

        // this should be part of accessor.
        public getAccessorName(e: Expr, mode: string): string {
            if (e.referencedData()) {
                var glob = e.referencedData();
                if (this.declsToLibrary.indexOf(e.referencedData()) >= 0) {
                    return (mode == "R" ? "" : "set ") + glob.getName();
                }
            } else if (e.referencedRecordField()) {
                var field = e.referencedRecordField();
                var recordDef = field.def();
                if (this.declsToLibrary.indexOf(recordDef) >= 0) {
                    return (mode == "R" ? "" : "set ") + field.getName();
                }
            } else if (e.calledProp()) {
                var c = <Call>e;
                if (e.calledProp() instanceof RecordDef) {
                    var rd2 = <RecordDef>c.prop();
                    if (this.declsToLibrary.indexOf(rd2) >= 0)
                        return rd2.getName() + (mode == "E" ? " collection" : "");
                } else {
                    return this.getRecordName(c.prop());
                }
            }
            return null;
        }

        private getName(name: string, mode: string): string {
            return (mode == "W" ? "set " : "") + name;
        }

        // either glob nonnull iff field null
        private makeActionFromGlobOrField(thing: string, glob: Decl, field: RecordField, mode: string): Action {
            var writer = new TokenWriter();
            writer.keyword("action").id(this.getName(glob ? glob.getName() : field.getName(), mode));
            writer.op("(");
            if (!glob) {
                writer.id("r").op(":").kind(this.theApp, field.def().entryKind);
                if (mode == "W")
                    writer.op(",");
            }
            if (mode == "W") {
                writer.id("val").op(":").kind(this.theApp, glob ? glob.getKind() : field.dataKind)
            }
            writer.op(")");
            if (mode == "R") {
                writer.keyword("returns").op("(").id("val").op(":").kind(this.theApp, glob ? glob.getKind() : field.dataKind).op(")");
            }
            writer.op("{");
            if (mode == "R") {
                writer.id("val").op(":=");
            }
            if (glob) {
                writer.id(thing);
            } else {
                writer.id("r");
            }
            writer.op("→").id(glob ? glob.getName() : field.getName());
            if (mode == "W") {
                writer.op(":=").id("val");
            }
            writer.op("}");
            return <Action> Parser.parseDecl(writer.finalize());
        }

        // TODO: we need to generate different names if we have the same property
        private makeActionFromProperty(prop: IProperty, expr: Expr): Action {
            var record = prop.parentKind.getRecord();
            // property return value?
            // property arguments
            var writer = new TokenWriter();
            writer.keyword("action");
            // put in the parameters
            var name = this.getRecordName(prop);
            if (name == null)
                name = prop.getName();
            writer.id(name).op("(");
            var parms = prop.getParameters();
            var first = true;
            if (expr.getKind() instanceof RecordEntryKind) {
                writer.id("r").op(":").id(record.entryKind.getName());
                first = false;
            }
            // always skip the implicit this
            var i = 1;
            while (i < parms.length) {
                if (!first) writer.op(",");
                var p = parms[i];
                writer.id(p.getName()).op(":").kind(this.theApp, p.getKind());
                i++;
            }
            writer.op(")");
            var res = prop.getResult();
            if (res) {
                writer.keyword("returns").op("(");
                writer.id("res").op(":").kind(this.theApp, res.getKind());
                writer.op(")");
            }
            writer.op("{");
            // now call the property on record
            if (res) {
                writer.id("res").op(":=");
            }
            if (expr.getKind() instanceof RecordEntryKind) {
                writer.id("r");
            } else {
                writer.id(record.thingSetKindName()).op("→").id(record.getName());
            }
            writer.op("→").id(prop.getName());
            i = 1;
            if (i < parms.length && parms.length > 0) {
                writer.op("(");
                var first = true;
                while (i < parms.length) {
                    if (!first) writer.op(",");
                    writer.id(parms[i].getName());
                    i++;
                    first = false;
                }
                writer.op(")");
            }
            writer.op("}");
            return <Action> Parser.parseDecl(writer.finalize());
        }

        private collectionTemplate =
            "action $NAME_collection() returns(coll: Collection[ * $ENTRY]) { " +
            "$coll := records→$NAME→create_collection; " +
            "foreach e in records→$NAME where true do { $coll→add($e); } " +
            "}";

        private makeCollectionAccessor(rd: RecordDef): Action {
            var text = this.collectionTemplate;
            text = text.replace(/\$NAME/g, Lexer.quoteId(rd.getName()))
                .replace(/\$ENTRY/g, Lexer.quoteId(rd.entryKind.getName()));
            return <Action> Parser.parseDecl(text);
        }

        public getAccessorActions(): Action[] {

            var actions: Action[] = [];

            for (var i = 0; i < this.rewriteGlobals.length; i++) {
                for (var j = 0; j < this.globalModes[i].length; j++) {
                    actions.push(this.makeActionFromGlobOrField(this.globalThings[i], this.rewriteGlobals[i], null, this.globalModes[i][j]));
                }
            }
            for (var i = 0; i < this.rewriteFields.length; i++) {
                for (var j = 0; j < this.fieldModes[i].length; j++) {
                    actions.push(this.makeActionFromGlobOrField(null, null, this.rewriteFields[i], this.fieldModes[i][j]));
                }
            }
            this.rewriteProperties.forEach((p, i) => actions.push(this.makeActionFromProperty(p, this.rewritePropertiesExpr[i])));
            this.collectionOfRecords.forEach(r => actions.push(this.makeCollectionAccessor(r)));
            return actions;
        }

        private addField(field: RecordField, mode: string) {
            var recordDef = field.def();
            if (this.declsToLibrary.indexOf(recordDef) >= 0) {
                var index = this.rewriteFields.indexOf(field);
                if (index < 0) {
                    this.rewriteFields.push(field);
                    this.fieldModes.push(mode);
                } else {
                    if (this.fieldModes[index].indexOf(mode) < 0) {
                        this.fieldModes[index] += mode;
                    }
                }
            }
        }

        private addGlobal(decl: Decl, mode: string) {
            if (this.declsToLibrary.indexOf(decl) >= 0 && decl instanceof GlobalDef) {
                var glob = <GlobalDef>decl;
                var index = this.rewriteGlobals.indexOf(glob);
                if (index < 0) {
                    this.rewriteGlobals.push(glob);
                    this.globalModes.push(mode);
                    this.globalThings.push(glob.thingSetKindName());
                } else {
                    if (this.globalModes[index].indexOf(mode) < 0) {
                        this.globalModes[index] += mode;
                    }
                }
            }
        }

        private addProperty(p: IProperty, e: Expr) {
            var rd = p.parentKind.getRecord();
            if (rd && this.declsToLibrary.indexOf(rd) >= 0 && this.rewriteProperties.indexOf(p) < 0) {
                this.rewriteProperties.push(p);
                this.rewritePropertiesExpr.push(e);
            }
        }
    }

    // rewrite a kind, which may depend on types moved to the library
    class RewriteKind {
        // two modes for rewriting
        // 1. declsToMove.length > 0 && replaceTarget==false
        // 2. declsToMove.length == 0 && replaceTarget==true
        constructor(public targetLibrary: LibraryRef, public declsToMove: Decl[], public replaceTarget: boolean) {

        }

        public rewriteKind(k: Kind): Kind {
            if (k.getRecord()) {
                var rec = k.getRecord();
                if (this.declsToMove.indexOf(rec) >= 0) {
                    return this.targetLibrary.getAbstractKind(k.getName());
                }
            } else if (k instanceof UserActionKind) {
                var act = (<UserActionKind>k).userAction;
                if (this.declsToMove.indexOf(act) >= 0) {
                    // nothing to do, since all dependent types are in downwards closure
                } else {
                    act.getParameters().forEach(p => {
                        p._kind = this.rewriteKind(p.getKind())
                    });
                }
            } else if (k instanceof LibraryRefAbstractKind) {
                // we are taking a dependence on a library
                var absKind = <LibraryRefAbstractKind>k;
                var lib = absKind.parentLibrary();
                if (this.replaceTarget && lib == this.targetLibrary) {
                    return new UnresolvedKind(absKind.getName());
                }
            } else if (k instanceof ParametricKind) {
                var pk = <ParametricKind>k;
                pk.parameters.forEach((p, i) => pk.parameters[i] = this.rewriteKind(pk.parameters[i]));
            } else if (k instanceof ActionKind) {
                var params = (<ActionKind>k).getInParameters().concat((<ActionKind>k).getOutParameters());
                params.forEach(p => { p._kind = this.rewriteKind(p.getKind()) });
            }
            return k;
        }
    }

    // for removing reference to target library
    // TODO: we may want to create a "rewriting visitor" base class at some point
    class RemoveLibraryReference
        extends NodeVisitor {

        constructor(public targetLibrary: LibraryRef) {
            super();
            this.rewriteKind = new RewriteKind(this.targetLibrary, [], true);
        }
        private rewriteKind: RewriteKind;
        private lastExprHolder: ExprHolder;

        visitAstNode(n: AstNode) {
            this.visitChildren(n);
            return null;
        }

        visitExprHolder(n: ExprHolder) {
            this.lastExprHolder = n;
            if (n.parsed)
                this.dispatch(n.parsed);
            return null;
        }

        visitAction(n: Action) {
            super.visitAction(n);
            n.getInParameters().concat(n.getOutParameters()).
                forEach((p) => {
                    p.local.setKind(this.rewriteKind.rewriteKind(p.local.getKind()));
                });
        }

        visitGlobalDef(n: GlobalDef) {
            n.setKind(this.rewriteKind.rewriteKind(n.getKind()));
        }

        visitRecordDef(n: RecordDef) {
            n.getFields().forEach(f => { f.dataKind = this.rewriteKind.rewriteKind(f.dataKind) });
        }

        // are we calling
        visitCall(n: Call) {
            n.args.forEach(e => { this.dispatch(e); });
            var prop = n.prop();
            var thingref = <ThingRef>n.args[0];
            if (prop && prop.forwardsTo() instanceof LibraryRefAction) {
                var lra = <LibraryRefAction>prop.forwardsTo();
                if (lra.parentLibrary() == this.targetLibrary) {
                    // TODO: this is pretty ugly and repeated (encapsulate, if you dare)
                    var subcall = <Call>n.args[0];
                    var tokens = this.lastExprHolder.tokens;
                    var leftmost = getLeftmost(n.args[0]);
                    var leftIdx = tokens.indexOf(leftmost);
                    var rightIdx = tokens.indexOf(subcall.propRef);
                    if (!(lra instanceof LibExtensionAction) && leftmost instanceof ThingRef) {
                        var writer = new TokenWriter();
                        writer.keyword("code");
                        var newExprHolder = Parser.parseExprHolder(writer.finalize());
                        tokens.spliceArr(leftIdx, rightIdx - leftIdx + 1, newExprHolder.tokens);
                    }
                }
            }
        }
    }

    class RewriteApp
        extends NodeVisitor {

        constructor(public targetLibrary: LibraryRef,
            public libActions: Decl[],
            public acc: CreateAccessors) {
                super();
                this.rewriteKind = new RewriteKind(this.targetLibrary, this.acc.declsToLibrary, false);
        }

        private lastExprHolder: ExprHolder = null;
        private mode: string = "";
        private rewriteKind: RewriteKind;

        visitExprHolder(n: ExprHolder) {
            this.lastExprHolder = n;
            this.mode = "R";
            if (n.parsed)
                this.dispatch(n.parsed);
            return null;
        }

        visitForeach(n: Foreach) {
            if (n.collection.parsed) {
                this.mode = "E";
                this.lastExprHolder = n.collection;
                this.dispatch(n.collection.parsed);
            }
            [<AstNode> n.conditions, n.body].forEach(c => c.accept(this));
        }

        visitAstNode(n: AstNode) {
            this.visitChildren(n);
            return null;
        }

        // only rewrite actions in app
        visitAction(n: Action) {
            if (this.libActions.indexOf(n) < 0) {
                super.visitAction(n);
                n.getInParameters().concat(n.getOutParameters()).
                    forEach((p) => this.rewriteActionParameter(p));
            }
        }

        rewriteActionParameter(n: ActionParameter) {
            n.local.setKind(this.rewriteKind.rewriteKind(n.local.getKind()));
        }

        // for globals and records remaining in the app, we may need to rewrite
        // some of their reference types, if those moved to the library
        visitGlobalDef(n: GlobalDef) {
            if (this.acc.declsToLibrary.indexOf(n) < 0) {
                n.setKind(this.rewriteKind.rewriteKind(n.getKind()));
            }
        }

        visitRecordDef(n: RecordDef) {
            if (this.acc.declsToLibrary.indexOf(n) < 0) {
                // for a record still in the app, check it fields to see what needs to be written
                n.getFields().forEach(f => { f.dataKind = this.rewriteKind.rewriteKind(f.dataKind) });
            }
        }

        // helper method for rewriting call
        rewriteThingRef(t: ThingRef) {
            var tokens = this.lastExprHolder.tokens;
            var idx = tokens.indexOf(t);
            var writer = new TokenWriter();
            this.targetLibrary.writeRef(writer);
            var newExprHolder = Parser.parseExprHolder(writer.finalize());
            this.lastExprHolder.tokens.spliceArr(idx, 1, newExprHolder.tokens);
        }

        // when rewriting a call, we need to be careful to rewrite bottom up,
        // as calls can be nested under calls. we also need to track mode, as
        // done in DirectAccessFinder

        visitCall(n: Call) {
            var prop = n.prop();
            if (!prop)
                return;
            // assignment guaranteed to be outermost in token stream because assignments aren't expressions
            if (prop == api.core.AssignmentProp) {
                var lhs = n.args[0].flatten(api.core.TupleProp);
                lhs.forEach(((e) => {
                    this.mode = "W";
                    // this trick works because AssignmentProp is not nested even though calls are
                    this.dispatch(e);
                }));
                this.mode = "R";
                var rhs = n.args[1];
                this.dispatch(rhs);

                // TODO: need to wait for Michal in order to support lhs.length > 1
                if (lhs.length == 1) {
                    var oneLHS = <Call>lhs[0];
                    // does the LHS require a rewrite?
                    var accessor = this.acc.getAccessorName(oneLHS, "W");
                    if (accessor != null) {
                        var writer = new TokenWriter();
                        var tokens = this.lastExprHolder.tokens;
                        if (oneLHS.referencedRecordField()) {
                            var oneLHStok = tokens.filter(t => t == oneLHS.propRef)[0]
                            var oneLHSidx = tokens.indexOf(oneLHStok);
                            tokens.slice(0, oneLHSidx).forEach(t => t.writeTo(writer));
                        } else {
                            this.targetLibrary.writeRef(writer);
                        }
                        writer.op("→").id(accessor).op("(");
                        var assign = tokens.filter(t => t.getOperator() == ":=")[0]
                        var idx = tokens.indexOf(assign);
                        tokens.slice(idx + 1, tokens.length).forEach(t => t.writeTo(writer));
                        writer.op(")");
                        var newExprHolder = Parser.parseExprHolder(writer.finalize());
                        // replacement OK here because we're at top level (otherwise, need to splice)
                        this.lastExprHolder.tokens = newExprHolder.tokens;
                    }
                }
            } else if (n.referencedData() || n.referencedRecordField()) {
                // remember what was set up one level in AST (by Call/Assignment)
                var mode = this.mode;
                this.mode = "R";
                n.args.forEach(e => this.dispatch(e));
                // read of global or field
                // do rewriting on Call via PropertyRef of Call, which is a Token
                var accessor = this.acc.getAccessorName(n, mode);
                if (accessor != null && mode != "W") {
                    n.propRef.data = accessor;
                    if (n.referencedData()) {
                        this.rewriteThingRef(<ThingRef>n.args[0]);
                    } else {
                        // use extension syntax because record will be first arg to accessor (no library reference needed)
                        n.propRef.prop = null;
                    }
                }
            } else if (prop instanceof RecordDef) {
                if (this.mode == "E") {
                    var accessor = this.acc.getAccessorName(n, "E");
                    if (accessor != null) {
                        var tokens = this.lastExprHolder.tokens;
                        var leftmost = getLeftmost(n);
                        var leftIdx = tokens.indexOf(leftmost);
                        var rightIdx = tokens.indexOf(n.propRef);
                        // create the library thingref
                        var writer = new TokenWriter();
                        this.targetLibrary.writeRef(writer).op("→").id(accessor);
                        var newExprHolder = Parser.parseExprHolder(writer.finalize());
                        tokens.spliceArr(leftIdx, rightIdx - leftIdx + 1, newExprHolder.tokens);
                    }
                }
            } else if (prop && (prop.forwardsTo() instanceof Action || prop instanceof ExtensionProperty)) {
                this.mode = "R";
                n.args.forEach(e => this.dispatch(e));
                var callee = <Action>prop.forwardsTo();
                if (callee && this.libActions.indexOf(callee) >= 0) {
                    this.rewriteThingRef(<ThingRef>n.args[0]);
                } else {
                    callee = (<ExtensionProperty>prop).shortcutTo;
                    if (this.libActions.indexOf(callee) >= 0) {
                        // TODO: finish this case
                    }
                }
            } else {
                n.args.forEach(e => { this.mode = "R"; this.dispatch(e); });
                var accessor = this.acc.getAccessorName(n, "");
                if (accessor != null && prop) {
                    n.propRef.data = accessor;
                    n.propRef.prop = null;
                    var kind = prop.parentKind;
                    if (kind instanceof RecordDefKind) {
                        var rd = (<RecordDefKind>kind).getRecord();
                        if (rd) {
                            var subcall = <Call>n.args[0];
                            var leftmost = getLeftmost(subcall);
                            // TODO: are we sure about thingref check???
                            if (leftmost instanceof ThingRef) {
                                // replace the subcall by thingref
                                // identify the token subsequence associated with subcall
                                var tokens = this.lastExprHolder.tokens;
                                var leftIdx = tokens.indexOf(leftmost);
                                var rightIdx = tokens.indexOf(subcall.propRef);
                                // create the library thingref
                                var writer = new TokenWriter();
                                this.targetLibrary.writeRef(writer);
                                var newExprHolder = Parser.parseExprHolder(writer.finalize());
                                // replace the subcall sequence with the library thingref
                                tokens.spliceArr(leftIdx, rightIdx - leftIdx + 1, newExprHolder.tokens);
                            } else {
                                // it's a local variable or parameter,
                            }
                        }
                    } else {
                        // nothing to do here
                    }
                }
            }
            return null;
        }

        performRewrite(n: AstNode) {
            this.dispatch(n);
        }
    }

    // given a record or record field R, find all the other user defined types reachable from R
    class UserDefinedTypeFinder
        extends NodeVisitor {

        private recurse: boolean = false;
        decls: Decl[] = [];

        visitGlobalDef(n: GlobalDef) {
            this.visitKind(n.getKind(), this.recurse);
        }

        visitLocalDef(n: LocalDef) {
            this.visitKind(n.getKind(), this.recurse);
        }

        visitRecordDef(r: RecordDef) {
            if (this.decls.indexOf(r) < 0) {
                this.decls.push(r);
                if (this.recurse) {
                    r.values.fields().concat(r.keys.fields()).forEach((f) => {
                        this.visitRecordField(f);
                    });
                }
            }
        }

        visitRecordField(n: RecordField) {
            this.visitKind(n.dataKind, this.recurse);
        }

        public visitKind(k: Kind, recurse: boolean) {
            this.recurse = recurse;
            if (k.isUserDefined()) {
                if (k.getRecord())
                    this.visitRecordDef(k.getRecord());
                else if (k instanceof UserActionKind) {
                    var act = (<UserActionKind>k).userAction;
                    if (this.decls.indexOf(act) < 0) {
                        this.decls.push(act);
                        if (recurse) {
                            act.getParameters().forEach(p => this.visitKind(p.getKind(), recurse));
                        }
                    }
                } else if (k instanceof LibraryRefAbstractKind) {
                    // we are taking a dependence on a library
                    var lib = (<LibraryRefAbstractKind>k).parentLibrary();
                    if (this.decls.indexOf(lib) < 0) {
                        this.decls.push(lib);
                    }
                } else if (k instanceof ParametricKind) {
                    if (recurse) {
                        var pk = <ParametricKind>k;
                        var i = 0;
                        while (i < pk.getParameterCount()) {
                            this.visitKind(pk.getParameter(i), recurse);
                            i++;
                        }
                    }
                } else if (k instanceof ActionKind) {
                    if (recurse) {
                        var params = (<ActionKind>k).getInParameters().concat((<ActionKind>k).getInParameters());
                        params.forEach(p => this.visitKind(p.getKind(), recurse));
                    }
                } else {
                    // Question: do we need to recurse over SimpleProperties and their param/return types
                    // Answer: depends if we can reach a userdefined type from a Simple Property, which I
                    // don't think is possible.
                }
            }
        }

        public traverse(d: AstNode, recurse: boolean) {
            this.recurse = recurse;
            this.dispatch(d);
        }
    }

    export class DeclAndDepsManager {
        private cache: DeclAndDeps[] = [];
        private last: DeclAndDeps = null;
        public resetCache() {
            this.cache = [];
            this.last = null;
        }
        public invalidate() {
            this.cache.forEach(dd => dd.reset());
        }
        private getFromCache(d: Decl): DeclAndDeps {
            if (this.last != null && this.last.decl == d) {
                return this.last;
            } else {
                var filter = this.cache.filter(dd => dd.decl == d);
                if (filter.length > 0) {
                    this.last = filter[0];
                    return this.last;
                } else
                    return null;
            }
        }
        public remove(dd: DeclAndDeps) {
            this.last = null;
            var idx = this.cache.indexOf(dd);
            if (idx >= 0) {
                this.cache.splice(idx);
            }
        }
        public getter(decl: Decl): DeclAndDeps {
            Util.assert(decl != null);
            var res = this.getFromCache(decl);
            if (res == null) {
                res = new DeclAndDeps(this);
                res.decl = decl;
                this.cache.push(res);
            }
            return res;
        }
        public getAll(): DeclAndDeps[] {
            return this.cache;
        }
    }

    // wrap  decl in the AST to keep track of its dependences
    export class DeclAndDeps {
        private manager: DeclAndDepsManager;
        constructor(m: DeclAndDepsManager) {
            this.manager = m;
        }

        public decl: Decl = null;
        public serialized: string;    // remember the decl for restoring later

        public direct: DirectAccessFinder = null;
        // which actions are called by decl?
        private actions: DeclAndDeps[] = null;
        // types directly referenced by decl
        private otherDecls: DeclAndDeps[] = [];
        // decls for which this action actually reads/write a field or property
        private accessedTypes: DeclAndDeps[] = [];
        private accessedGlobals: DeclAndDeps[] = [];
        private transitiveClosure: DeclAndDeps[] = null;

        public reset() {
            this.actions = null;
            this.serialized = null;
            this.otherDecls = [];
            this.direct = null;
            this.accessedGlobals = [];
            this.accessedTypes = [];
            this.transitiveClosure = [];
        }

        public getActions(): DeclAndDeps[] {
            this.fillDeclDependencies();
            return this.actions;
        }
        public getOthers(): DeclAndDeps[] {
            this.fillDeclDependencies();
            return this.otherDecls;
        }

        public getAllDirectAccesses(): DeclAndDeps[] {
            this.fillDeclDependencies();
            if (this.decl instanceof Action)
                return this.accessedTypes.concat(this.accessedGlobals).concat(this.getActions());
            else
                return this.getOthers();
        }


        public getTransitiveClosure(): DeclAndDeps[] {
            this.fillDeclDependencies();
            if (!this.transitiveClosure) {
                this.transitiveClosure = [];
                DeclAndDeps.computeClosure([this], [], this.transitiveClosure);
            }
            return this.transitiveClosure;
        }

        // for user selection
        private include: boolean = false;
        public setInclude(b: boolean) { this.include = b; }
        public getInclude(): boolean { return this.include; }
        public count: number;

        // for ranking the declarations in order of suitability for library
        public numberDirectDeclsToMove: number;
        static rateTargetAgainstDecls(pending: DeclAndDeps[], tgt: DeclAndDeps) {
            tgt.numberDirectDeclsToMove = 0;
            tgt.getAllDirectAccesses().filter(dd => !(dd.decl instanceof LibraryRef)).forEach((t) => {
                if (pending.indexOf(t) >= 0) tgt.numberDirectDeclsToMove++;
            });
        }

        static compareSize(d1: DeclAndDeps, d2: DeclAndDeps): number {
            var len1 = d1.getTransitiveClosure().length;
            var len2 = d2.getTransitiveClosure().length;
            return len1 - len2;
        }

        private fillDeclDependencies() {

            if (this.actions != null)
                return;

            var directDecls: Decl[] = [];
            function add(decl: Decl) {
                if (directDecls.indexOf(decl) < 0) directDecls.push(decl);
            }

            function processDeclDirect(decl: Decl) {
                // local defs aren't moveable decls
                if (!(decl instanceof LocalDef))
                    add(decl);
                // now, find the types directly accessed
                var finder = new UserDefinedTypeFinder();
                finder.traverse(decl, false);
                finder.decls.forEach(d => add(d));
            }

            var finder = new DirectAccessFinder();
            finder.traverse(this.decl);
            this.direct = finder;
            finder.referencedLibraries.forEach(l => add(l));
            if (this.decl instanceof Action) {
                this.actions = finder.calledActions.map(a => this.manager.getter(a));
                finder.readGlobals.concat(finder.writtenGlobals).forEach(g => {
                    var ng = this.manager.getter(g);
                    if (this.accessedGlobals.indexOf(ng) < 0) this.accessedGlobals.push(ng);
                    processDeclDirect(g);
                });
                finder.inParams.concat(finder.outParams).forEach(processDeclDirect);
                finder.readProps.concat(finder.readFields).concat(finder.writtenFields).forEach(p => {
                    var rd = p.parentKind.getRecord();
                    if (rd) {
                        var newOne = this.manager.getter(rd);
                        if (this.accessedTypes.indexOf(newOne) < 0) this.accessedTypes.push(newOne);
                    }
                });
            } else {
                this.actions = [];
                finder.referencedRecords.forEach(processDeclDirect);
            }
            this.otherDecls = directDecls.map(a => this.manager.getter(a));
        }

        public static computeClosure(roots: DeclAndDeps[], alreadyIn: DeclAndDeps[], newOnes: DeclAndDeps[]) {
            var add = (dd2: DeclAndDeps) => {
                if (roots.indexOf(dd2) < 0 && alreadyIn.indexOf(dd2) < 0 && newOnes.indexOf(dd2) < 0) {
                    newOnes.push(dd2);
                    return true;
                } else {
                    return false;
                }
            }

            var recurseNotAction = (r: DeclAndDeps) => {
                if (add(r)) {
                    var finder = new UserDefinedTypeFinder();
                    finder.traverse(r.decl, true);
                    finder.decls.forEach(d => add(r.manager.getter(d)));
                }
            }

            roots.forEach(dd => {
                if (dd.decl instanceof Action) {
                    var closure = new CallGraphClosure(dd);
                    closure.allActions.forEach((a) => {
                        if (add(a)) a.getOthers().forEach(recurseNotAction);
                    });
                } else {
                    recurseNotAction(dd);
                }
                dd.getOthers().forEach(recurseNotAction);
            });
        }
    }

    class CallGraphClosure {
        constructor(action: DeclAndDeps) {
            var wl: DeclAndDeps[] = action.getActions().map(x=> x);
            while (wl.length > 0) {
                var a = wl.pop();
                this.allActions.push(a);
                a.getActions().forEach(b => {
                    if (this.allActions.indexOf(b) < 0 && wl.indexOf(b) < 0) wl.push(b)
                });
            }
        }
        public allActions: DeclAndDeps[] = [];
    }

    function getLeftmost(e: Expr): Expr {
        if (e instanceof Call) {
            return getLeftmost((<Call>e).args[0]);
        } else {
            return e;
        }
    }

    // the stuff below here should be generically useful for lots of other
    // refactoring and analyses that need to find out what is referenced by
    // a declaration (action, global, record, etc.)

    // given an action A, find all the other top-level entities referenced directly by A
    export class DirectAccessFinder
        extends NodeVisitor {

        referencedLibraries: LibraryRef[] = [];
        calledActions: Action[] = [];
        inParams: LocalDef[] = [];
        outParams: LocalDef[] = [];
        readGlobals: Decl[] = [];
        writtenGlobals: Decl[] = [];
        readFields: IProperty[] = [];
        writtenFields: IProperty[] = [];
        readProps: IProperty[] = [];
        readPropsWhat: Expr[] = [];
        referencedRecords: RecordDef[] = [];
        asIEnumerable: RecordDef[] = [];

        addDecl(l: Decl, lst: Decl[]) {
            if (lst.indexOf(l) < 0) lst.push(l);
        }

        addField(l: IProperty, lst: IProperty[]) {
            if (lst.indexOf(l) < 0) lst.push(l);
        }

        addProp(l: IProperty, e: Expr) {
            if (this.readProps.indexOf(l) < 0) {
                this.readProps.push(l);
                this.readPropsWhat.push(e);
            }
        }

        private getGlobal(e: AstNode) {
            if (e instanceof Call) {
                var prop = (<Call>e).prop();
                if (prop instanceof GlobalDef || prop instanceof RecordDef)
                    return <PropertyDecl><any>prop;
            }
            return null;
        }

        visitAstNode(n: AstNode) {
            this.visitChildren(n);
            return null;
        }

        visitAction(n: Action) {
            n.getInParameters().forEach((p) => this.addDecl(p.local, this.inParams));
            n.getOutParameters().forEach((p) => this.addDecl(p.local, this.outParams));
            super.visitAction(n);
        }

        visitGlobalDef(n: GlobalDef) {
            var finder = new UserDefinedTypeFinder();
            finder.traverse(n, false);
            finder.decls.forEach(t => this.addDecl(t, this.referencedRecords));
        }

        visitRecordDef(r: RecordDef) {
            var finder = new UserDefinedTypeFinder();
            r.values.fields().concat(r.keys.fields()).forEach((f) => {
                finder.traverse(f, false);
            });
            finder.decls.forEach(t => this.addDecl(t, this.referencedRecords));
        }

        visitForeach(n: Foreach) {
            if (n.collection.parsed) {
                this.mode = "E";
                this.dispatch(n.collection.parsed);
            }
            [<AstNode> n.conditions, n.body].forEach(c => c.accept(this));
        }

        private mode: string = "";
        visitCall(n: Call) {
            var prop = n.prop();
            if (prop == api.core.AssignmentProp) {
                n.args[0].flatten(api.core.TupleProp).forEach((e) => {
                    this.mode = "W";
                    var g = this.getGlobal(e);
                    if (g && this.writtenGlobals.indexOf(g) < 0)
                        this.addDecl(g, this.writtenGlobals);
                    else
                        this.dispatch(e);
                });
                this.mode = "R";
                this.dispatch(n.args[1]);
            } else if (n.referencedRecordField() || n.referencedData()) {
                if (n.referencedRecordField()) {
                    this.addField(n.referencedRecordField().asProperty(), this.mode == "R" ? this.readFields : this.writtenFields);
                } else {
                    this.addDecl(n.referencedData(), this.mode == "R" ? this.readGlobals : this.writtenGlobals);
                }
            } else if (prop instanceof RecordDef) {
                // direct use of (built-in property of) a table/index
                if (this.mode == "E") {
                    this.addDecl(<RecordDef>prop, this.asIEnumerable);
                }
                this.addDecl(<RecordDef>prop, this.readGlobals);
            } else if (prop.forwardsTo() instanceof Action || prop instanceof ExtensionProperty) {
                var act = prop.forwardsTo() ? <Action> prop.forwardsTo() : (<ExtensionProperty>prop).shortcutTo;
                var lib = act.parentLibrary();
                if (lib && !lib.isThis()) {
                    if (this.referencedLibraries.indexOf(lib) < 0)
                        this.referencedLibraries.push(lib);
                } else {
                    if (this.calledActions.indexOf(act) < 0)
                        this.calledActions.push(act);
                }
            } else if (prop.parentKind.getRecord()) {
                this.addProp(prop, getLeftmost(n));
            } else if (prop.parentKind instanceof UserActionKind) {
                // we have a run call (look for dependence on a callback)
                var act = (<UserActionKind>(prop.parentKind)).userAction
                if (this.calledActions.indexOf(act) < 0)
                    this.calledActions.push(act);
            }
            // recurse and collect from arguments
            if (prop != api.core.AssignmentProp) {
                n.args.forEach(e => { this.mode = "R"; this.dispatch(e) });
            }
        }

        visitExprHolder(n: ExprHolder) {
            if (n.parsed) {
                this.mode = "R";
                this.dispatch(n.parsed);
            }
            return null;
        }

        traverse(node: AstNode) {
            this.dispatch(node);
        }
    }
}

