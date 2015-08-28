///<reference path='refs.ts'/>

module TDev.AST {
    export var libSymbol = "\u267B";

    export class LibraryRefAction
        extends Action
    {
        private _description:string;
        private _flags:PropertyFlags;
        public template: Action;
        public wasUsed: boolean;
        public _extensionAction:LibExtensionAction;
        public _weight = 50;

        constructor(public _lib:LibraryRef) {
            super()
            this.parentKind = _lib.getKind();
        }

        public isInLibrary() { return true }
        public getNamespace() { return libSymbol + this.parentLibrary().getName() + this.getArrow(); }
        public parentLibrary() { return this._lib; }
        public getFlags() { return this._flags }
        public getDescription() {
            if (this._description) return this._description;
            return super.getDescription();
        }
        public getArrow() { return "\u200A\u2192\u00A0" }

        public markUsed() { this.wasUsed = true }
        public canRename() { return false; }

        public usageKey()
        {
            return Util.tagify(this._lib.getName() + " " + this.getName())
        }

        private setAllLocals()
        {
            this.allLocals = this.getAllParameters().map((ap) => ap.local)
            this.body = Parser.emptyBlock();
        }

        public updateSubstitution()
        {
            if (!this.template) return;
            var copyParam = (ap:ActionParameter) => new ActionParameter(mkLocal(ap.getName(), this.parentLibrary().substitute(ap.getKind())));
            this.header.inParameters.setChildren(this.template.getInParameters().map(copyParam));
            this.header.outParameters.setChildren(this.template.getOutParameters().map(copyParam));
            this.setAllLocals()
        }

        public fromTemplateCore(template:Action)
        {
            this.template = template;
            this.updateSubstitution();
            this._description = template.getInlineHelp();
            this._flags = template.getFlags()
            this.setName(template.getName());
            this._isPage = template.isPage();
            this.isAtomic = template.isAtomic;
            this._isActionTypeDef = template.isActionTypeDef();
            this.setStableName(template.getStableName());
            this.setAllLocals();
        }

        private addExtensionAction()
        {
            if (this.isActionTypeDef())
                return

            var k = <ExtensionEnabledKind>this.getExtensionKind()
            if (k)
                k.addExtensionAction(this._extensionAction = new LibExtensionAction(this));
        }

        public fromTemplate(template:Action)
        {
            this.fromTemplateCore(template)
            if (!template.isPage())
                this.addExtensionAction();
            return this;
        }

        public parse(p:Parser)
        {
            this.setStableName(p.consumeLabel())

            while (true) {
                if (p.gotOp("sync")) {
                    p.shift();
                    this.isAtomic = true;
                    continue;
                }
                if (p.gotOp("async")) {
                    p.shift();
                    this.isAtomic = false;
                    continue;
                }
                if (p.gotOp("page")) {
                    p.shift();
                    this._isPage = true;
                    continue;
                }
                break;
            }

            var hd = p.parseActionHeader();
            this.setName(hd.name);
            this.header.inParameters.setChildren(hd.inParameters);
            this.header.outParameters.setChildren(hd.outParameters);
            this._isActionTypeDef = hd.isType
            this.setAllLocals();
            this.addExtensionAction();
            this._flags = super.getFlags()
        }
        
        public isBrowsable() :boolean {
            return !(this._flags & PropertyFlags.NonBrowsable) && !this.isLibInit();
        }

        public toString()
        {
            return this.getNamespace() + this.getName();
        }

        public showIntelliButton()
        {
            if (this.isExtensionAction()) return true;
            return this.getExtensionKind() == null;
        }
    }

    export class LibExtensionAction
        extends LibraryRefAction
    {
        constructor(public shortcutTo:LibraryRefAction)
        {
            super(shortcutTo._lib)
            this.fromTemplateCore(shortcutTo)
        }

        public updateSubstitution()
        {
            super.updateSubstitution()
            this.parentKind = this.getInParameters()[0].getKind();
            this.header.inParameters.stmts.shift()
        }

        public isExtensionAction() :boolean{ return true }
        public extensionForward():Action { return this.shortcutTo }

        public getDescription()
        {
            return this.shortcutTo.getDescription()
        }

        public getFlags()
        {
            return this.shortcutTo.getFlags()
        }

        public markUsed() {
            super.markUsed()
            this.shortcutTo.markUsed();
        }
    }

    export class LibraryRefAbstractKind
        extends ExtensionEnabledKind
    {
        constructor(public _lib:LibraryRef, n:string) {
            super(n, "a kind from library");
            this._stemName = n;
            this._contexts = KindContext.General | KindContext.GcKey;

            var invl = Property.md_make(0, this, "is invalid", "Returns true if the current instance is useless", [], api.core.Boolean)
            invl.md_runOnInvalid();
            this.addExtensionAction(invl)
        }

        private deleted = false;
        public kill()
        {
            this.deleted = true;
        }

        public isError() { return this.deleted || this._lib.deleted; }
        public isUserDefined() { return true; }

        public parentLibrary() { return this._lib; }
        public getNamespace() { return LibraryRef.libNamespace(this.parentLibrary().getName()) }
        public toString()
        {
            return this.getNamespace() + this.getName();
        }

        public listPriority() { return 3; }

        public listProperties() { return this.listExtensions() }
        public getProperty(name:string) { return this.getExtension(name) }
    }

    export class LibraryRefKind
        extends Kind
    {
        constructor(public lib:LibraryRef) {
            super("no name yet", "a library reference")
        }
        public listProperties() : IProperty[] { return this.lib.getPublicActions().map(Property.withParent(this)); }

        public getProperty(name:string) : IProperty
        {
            var a = this.lib.getPublicActions().filter((a:IProperty) => a.getName() == name);
            if (!a[0])
                return undefined;
            return Property.withParent(this)(a[0]);
        }

        public getHtmlName() { return [span('symbol', AST.libSymbol), this.lib.getName()]; }
        public getName() { return this.lib.getName() }
        public toString() { return this.lib.toString() }

        public getHelp() { return this.lib.getDescription() }
    }

    export class LibraryRecordDef
        extends RecordDef
    {
        public template:RecordDef;

        constructor(public _lib:LibraryRef) {
            super()
        }

        public updateSubstitution()
        {
            if (!this.template) return;
            var copyField = (fld:RecordField) => {
                var k = this.parentLibrary().substitute(fld.dataKind)
                var rf = new RecordField(fld.getName(), k, fld.isKey, fld.getDescription())
                rf.setStableName(fld.getStableName())
                return rf
            }
            this.keys.setChildren(this.template.keys.map(copyField))
            this.values.setChildren(this.template.values.map(copyField))
        }

        public fromTemplate(template:RecordDef)
        {
            this.template = template;
            this.recordType = template.recordType;
            this.cloudEnabled = template.cloudEnabled;
            this.cloudPartiallyEnabled = template.cloudPartiallyEnabled;
            this._isExported = template._isExported;
            this.persistent = template.persistent;
            this.description = template.description;
            this.setName(template.getCoreName());
            this.setStableName(template.getStableName());
            this.updateSubstitution();
        }

        public parentLibrary()
        {
            return this._lib;
        }

        public getNamespace() { return LibraryRef.libNamespace(this.parentLibrary().getName()) }
    }

    interface Assumption {
        formal: Kind;
        actual: Kind;
    }

    export class UnificationCtx
    {
        public mapping:StringMap<Kind> = {};
        public clause:ResolveClause = null;

        constructor(public lib:LibraryRef)
        {
        }

        public resolve(form:Kind)
        {
            if (form instanceof LibraryRefAbstractKind) {
                var fk = <LibraryRefAbstractKind>form
                if (fk.parentLibrary().parent == this.lib.resolved) {
                    var n = fk.toString()
                    if (this.mapping.hasOwnProperty(n)) {
                        return this.mapping[n]
                    } else {
                        return null;
                    }
                }
            }
            return form;
        }

        private unifyActionKinds(form:ActionKind, act:ActionKind)
        {
            var cmpLists = (a:PropertyParameter[], b:PropertyParameter[]) => {
                if (a.length != b.length) return false
                return a.every((aa, i) => this.unify(aa.getKind(), b[i].getKind()))
            }

            return cmpLists(form.getInParameters(), act.getInParameters()) &&
                   cmpLists(form.getOutParameters(), act.getOutParameters());
        }

        private unifyParametricKinds(form:ParametricKind, act:ParametricKind)
        {
            return form.getRoot().equals(act.getRoot()) &&
                   form.parameters.length == act.parameters.length &&
                   form.parameters.every((f, i) => this.unify(f, act.parameters[i]))
        }

        private unifyRecords(form:RecordDef, act:RecordDef)
        {
            if (form.getName() != act.getName() ||
                form.recordType != act.recordType ||
                form.getRecordPersistence() != act.getRecordPersistence())
                return false;

            var actFields = Util.toDictionary(act.getFields(), f => f.getName())
            var allOK = true

            form.getFields().forEach(f => {
                if (actFields.hasOwnProperty(f.getName())) {
                    var a = actFields[f.getName()]
                    if (f.isKey != a.isKey ||
                        !this.unify(f.dataKind, a.dataKind))
                        allOK = false
                } else {
                    allOK = false
                }
            })

            return allOK
        }

        private assumptions:Assumption[] = [];

        public unify(form:Kind, act:Kind)
        {
            if (form.equals(act)) return true;

            if (form instanceof ActionKind && act instanceof ActionKind)
                return this.unifyActionKinds(<ActionKind>form, <ActionKind>act)

            if (form instanceof ParametricKind && act instanceof ParametricKind)
                return this.unifyParametricKinds(<ParametricKind>form, <ParametricKind>act)

            if (form.getRecord() && act.getRecord()) {
                if (this.assumptions.some(a => a.formal == form && a.actual == act))
                    return true

                this.assumptions.push({ formal: form, actual: act })
                try {
                    return this.unifyRecords(form.getRecord(), act.getRecord())
                } finally {
                    this.assumptions.pop()
                }
            }

            var resolved = this.resolve(form);
            if (!resolved) {
                /*
                // note that this would actually possibly add it to the wrong resolve clause
                if (this.clause) {
                    var k = new KindBinding(form.getName())
                    // k.isExplicit = true;
                    k.actual = act;
                    this.clause.kindBindings.push(k)
                }
                */
                this.mapping[form.toString()] = act;
                return true;
            } else return resolved.equals(act);
        }
    }

    export class ResolveClause
        extends Stmt
    {
        public defaultLib:LibraryRef;
        public formalLib:LibraryRef; // from resolved version of the library
        public kindBindings = new BindingBlock();
        public actionBindings = new BindingBlock();
        public primaryBody():Block { return this.actionBindings; }
        public children() { return <Stmt[]>[this.kindBindings, this.actionBindings]; }
        public accept(v:NodeVisitor) { return v.visitResolveClause(this); }
        public nodeType() { return "resolveClause"; }

        constructor(public name:string) {
            super()
            this.kindBindings.parent = this;
            this.actionBindings.parent = this;
        }
        public getName() { return this.name; }

        public resolveExplicit(par:LibraryRef)
        {
            this.clearError();
            if (!this.defaultLib) {
                par._hasErrors = true;
                this.setError("TD135: not bound to any library; tap to bind");
                return;
            }
            this.actionBindings.stmts.forEach((binding:ActionBinding) => {
                var al = binding.actualLib;
                var act = al.getPublicActions().filter((a) => a.getName() == binding.actualName)[0];
                binding.actual = act;
                if (!act)
                    binding.setError(lf("TD138: cannot find function '{1}' in {0}", al, binding.actualName));
            })
        }

        public typeCheck(ctx:UnificationCtx)
        {
            this.clearError();
            if (!this.defaultLib) {
                this.setError("TD135: not bound to any library; tap to bind");
                return;
            }

            this.defaultLib.typeCheck();

            ctx.clause = this;

            this.kindBindings.setChildren([])
            var newBindings = this.formalLib.getPublicActions().filter((a:LibraryRefAction) => a.wasUsed).map((form:Action,ix:number) => {
                Util.assert(form instanceof LibraryRefAction);
                var binding = <ActionBinding>(this.actionBindings.stmts.filter((a:ActionBinding) => a.formalName == form.getName())[0]);
                if (!binding)
                    binding = new ActionBinding(form.getName());

                if (!binding.isExplicit) {
                    binding.actualLib = this.defaultLib;
                    binding.actualName = form.getName();
                }
                var al = binding.actualLib;
                al.typeCheck();
                var act = al.getPublicActions().filter((a) => a.getName() == binding.actualName)[0];
                binding.formal = <LibraryRefAction>form;
                binding.actual = act;
                if (act) {
                    var err = binding.getSignatureError(ctx, act);
                    if (err) {
                        binding.setError(err);
                    } else {
                        binding.clearError();
                    }
                    if (!al.isTypechecked)
                        binding.setError("TD174: cause of circular library reference")
                } else if (al.isReal()) {
                    binding.setError(lf("TD138: cannot find function '{1}' in {0}", al, binding.actualName));
                } else {
                    this.setError(lf("TD139: no library reference named {0}", al));
                }
                return binding;
            });

            var cmpBindings = (a:AST.Binding, b:AST.Binding) => {
                if (a.isExplicit == b.isExplicit)
                    return a.formalName.localeCompare(b.formalName);
                else if (a.isExplicit) return -1;
                else return 1;
            }
            newBindings.sort(cmpBindings);

            this.actionBindings.setChildren(newBindings);

            if (!this.getError()) {
                var err = newBindings.filter(b => !!b.getError())[0]
                if (err) this.setError("TD173: some binding(s) have errors")
            }
        }
    }

    export class Binding
        extends Stmt
    {
        public isExplicit = false;
        constructor(public formalName:string) {
            super()
        }
    }

    export class KindBinding
        extends Binding
    {
        public actual:Kind;
        constructor(f:string) {
            super(f)
        }
        public accept(v:NodeVisitor) { return v.visitKindBinding(this); }
        public nodeType() { return "kindBinding"; }
    }

    export class ActionBinding
        extends Binding
    {
        public formal:LibraryRefAction;
        public actualLib:LibraryRef;
        public actualName:string;
        public actual:Action;
        constructor(f:string) {
            super(f)
        }
        public accept(v:NodeVisitor) { return v.visitActionBinding(this); }
        public nodeType() { return "actionBinding"; }
        public getActualName() { return this.actual ? this.actual.getName() : this.actualName || "?"; }

        public getSignatureError(ctx:UnificationCtx, act:Action)
        {
            var form = this.formal;
            var err = null;
            // var al = binding.actualLib;
            var compareParameters = (formal:ActionParameter[], actual:ActionParameter[], tp:string) =>
            {
                if (formal.length != actual.length)
                    err = lf("TD136: '{0}' has {1} {2}-paramters, but '{3}' requires {4}", act, actual.length, tp, form.getName(), formal.length);
                else
                    for (var i = 0; i < formal.length; ++i) {
                        var fk = formal[i].getKind();
                        var ak = actual[i].getKind();
                        if (!ctx.unify(fk, ak))
                            err = lf("TD137: '{0}' has {1} as {3}-paramter #{2}, but '{4}' requires {5}",
                                           act, ak, i, tp, form.getName(), ctx.resolve(fk));
                    }
            }

            if (form.isAtomic && !act.isAtomic)
                return lf("TD162: an atomic function is required for '{0}'", form.getName());

            compareParameters(form.getInParameters(), act.getInParameters(), "in");
            compareParameters(form.getOutParameters(), act.getOutParameters(), "out");

            return err;
        }
    }

    export interface SingletonExtensions
    {
        actionList:AST.LibraryRefAction[];
        actions:StringMap<AST.LibraryRefAction>;
    }

    export class LibNamespaceCache
    {
        public singletonList:AST.SingletonDef[] = [];
        public singletons:StringMap<AST.SingletonDef> = {};
        public extensions:StringMap<SingletonExtensions> = {};

        constructor(private app:App)
        {
        }

        public createSingleton(name:string):SingletonDef
        {
            var k = new Kind(name, lf("Extensions"));
            k._contexts = KindContext.None;
            var th = mkSingletonDef(name, k);
            th.isExtension = true;
            return th
        }

        private addSingleton(name:string)
        {
            if (api.getThing(name)) return

            var th = this.createSingleton(name)
            this.singletonList.push(th)
            this.singletons[th.getName()] = th
        }

        public recompute()
        {
            Util.assert(this.app == Script)

            this.singletons = {};
            this.singletonList = [];
            this.extensions = {};

            this.app.libraries().forEach(l => {
                l.getPublicActions().forEach(a => {
                    a.getNamespaces().forEach(ns => {
                        this.addSingleton(ns)
                        if (!this.extensions.hasOwnProperty(ns))
                            this.extensions[ns] = { actions: {}, actionList: [] }
                        var e = this.extensions[ns];
                        e.actionList.push(<LibraryRefAction>a);
                        e.actions[a.getName()] = <LibraryRefAction>a;
                    })
                })
            })
        }
    }

    export class LibraryRef
        extends PropertyDecl
        implements IProperty
    {
        public guid:string = "";
        public pubid:string = "";
        public resolved:App;
        public _publicActions:LibraryRefAction[] = [];
        public _publicKinds:Kind[] = [];
        private kindMapping:any = {};
        private externalKindMapping:StringMap<Kind> = {};

        public isTypechecked = false;
        private isTypechecking = false;

        public updateId:string;
        public needsUpdate:boolean;
        public isDeclared:boolean;
        public isCloud() { return this.resolved && this.resolved.isCloud }

        private publicActionsCopiedFromResolved = false;
        public resolveClauses = new ResolveBlock();
        public isTopLevel() { return this.parent.isTopLevel; }
        public isReal() { return !!this.getId(); }
        public children() { return <AstNode[]>[this.resolveClauses]; }
        public isThis() { return false; }
        public isPublished() { return !this.guid }
        public thingSetKindName() { return libSymbol; }

        public _hasErrors:boolean;
        public getPublicActions():Action[] { return this._publicActions; }
        public getPublicKinds() { return this._publicKinds; }

        public getIconArtId() : string { return this.resolved ? this.resolved.iconArtId : ""; }

        public getLibInit()
        {
            return this.getPublicActions().filter(a => a.isLibInit())[0]
        }

        public getPublicActionsAndActionTypes():Action[]
        {
            var acts:Action[] =
                this.getPublicKinds()
                    .map(k => k instanceof UserActionKind ? (<UserActionKind>k).userAction : null)
                    .filter(a => a != null)
            if (acts.length == 0) return this.getPublicActions()
            else return acts.concat(this.getPublicActions())
        }

        public getId() { return this.guid ? this.guid : this.pubid; }
        public hasErrors() { return this._hasErrors; }

        public getCategory() { return PropertyCategory.Library; }
        public helpTopic() { return "libraries"; }

        public listedKinds:string[] = [];

        public nodeType() { return "libraryRef"; }
        public accept(v:NodeVisitor) { return v.visitLibraryRef(this); }
        public getDescription() { return ": " + (this.resolved ? this.resolved.getName() : "?") + (this.pubid ? "" : " (local)"); }

        public getNamespace() { return libSymbol + "\u200A"; }
        public toString() { return this.getNamespace() + this.getName(); }

        public hasAbstractKind(n:string)
        {
            return !!this.kindMapping[n];
        }

        public isTutorial() { return this.getStableName() == "tutorialLib" }

        public isBrowsable()
        {
            if (followingTutorial && /^_/.test(this.getName())) return false
            return true
        }

        private updateSubstitutions()
        {
            this._publicActions.forEach(a => {
                a.updateSubstitution()
                if (a._extensionAction)
                    a._extensionAction.updateSubstitution()
            })
            this._publicKinds.forEach(k => {
                if (k.getRecord() instanceof LibraryRecordDef)
                    (<LibraryRecordDef>k.getRecord()).updateSubstitution()
            })
        }

        public importBindings()
        {
            this.externalKindMapping = {}
            /*
            this.resolveClauses.forEach((c:ResolveClause) => {
                c.kindBindings.forEach((k:KindBinding) => {
                    //Util.log("repl: " + k.formalName + " to " + k.actual.toString())
                    this.externalKindMapping[LibraryRef.libNamespace(c.name) + k.formalName] = k.actual;
                });
            })
            */
            this.updateSubstitutions();
        }

        public getAbstractKind(n:string):Kind
        {
            var k:Kind = this.kindMapping[n];
            if (k) return k;
            k = new LibraryRefAbstractKind(this, n);
            this.defKind(k)
            return k;
        }

        constructor() {
            super()
            this._kind = new LibraryRefKind(this);
        }

        public resolve()
        {
            this._hasErrors = false;
            this.isTypechecked = false;

            if (!this.isTopLevel()) return;

            if (!this.resolved) {
                this._hasErrors = true;
                return;
            }

            if (!this.publicActionsCopiedFromResolved) {
                this.resolved.setStableNames();
                this.publicActionsCopiedFromResolved = true;
                this._publicActions.forEach((a:Action) => {
                    a.deleted = true;
                });
                this._publicKinds.forEach((k) => { k.kill(); });
                this.kindMapping = {};
                this._publicKinds = [];
                // first collect all the function types
                var tasks = this.resolved.actionTypeDefs()
                    .filter((a) => !a.isPrivate)
                    .map(a => {
                        var la = new LibraryRefAction(this)
                        la._isActionTypeDef = true
                        la.setName(a.getName())
                        this.defKind(la.getDefinedKind())
                        return () => { la.fromTemplate(a) }
                    })

                tasks.pushRange(this.resolved.records()
                    .filter(r => r.isExported())
                    .map(r => {
                        var rec = new LibraryRecordDef(this)
                        rec.setName(r.getCoreName())
                        this.defKind(rec.entryKind)
                        return () => { rec.fromTemplate(r) }
                    }))

                // populate the parameters/fields
                tasks.forEach(f => f())
                // and proceed to normal actions which will produce any remaining kinds as abstract
                this._publicActions = this.resolved.actions()
                    .filter((a) => !a.isPrivate)
                    .map((a) => new LibraryRefAction(this).fromTemplate(a));

                var maxW = 0
                this._publicActions.forEach(a => {
                    var ad = a.getDescription();
                    var m = /{weight:(\d+)}/i.exec(ad)
                    if (m) a._weight = parseInt(m[1])
                    maxW = Math.max(a._weight, maxW)
                })
                this._publicActions.forEach(a => { a.getUsage().apiFreq = a._weight / (maxW + 1) })
            }
        }

        public substitute(k:Kind) : Kind
        {
            if (k instanceof LibraryRefAbstractKind) {
                var r:Kind = this.externalKindMapping[k.toString()];
                //Util.log("subst: in " + this.getName() + " type " + k.toString() + " to " + r)
                if (r) {
                    if ((<any>r).deleted)
                        r = r.parentLibrary().getAbstractKind(r.getName())
                    return r;
                }
                else return k;
            } else if (k.isUserDefined()) {
                return this.getAbstractKind(k.getName());
            } else if (k instanceof ParametricKind) {
                var pk = <ParametricKind>k;
                return pk.createInstance(pk.parameters.map(kk => this.substitute(kk)));
            } else {
                return k;
            }
        }

        public rebind()
        {
            this.publicActionsCopiedFromResolved = false;
        }

        public typeCheck()
        {
            if (this.isTypechecked || this.deleted) return;

            if (this.isTypechecking) {
                this.setError("TD174: cicular library reference")
                return;
            }

            if (!this.isTopLevel()) return;

            if (!this.resolved) {
                this.resolveClauses.forEach((r:ResolveClause) => r.resolveExplicit(this));
                return;
            }

            this.isTypechecking = true;
            this.clearError();

            var existing:any = {};
            this.resolveClauses.forEach((r:ResolveClause) => {
                existing[r.name] = r
            });
            var newResolves = this.resolved.libraries().map((l:LibraryRef,ix:number) => {
                var clause:ResolveClause = existing[l.getName()];
                if (!(clause instanceof ResolveClause))
                    clause = new ResolveClause(l.getName());
                clause.formalLib = l;
                return clause;
            });
            this.resolveClauses.setChildren(newResolves);

            var ctx = new UnificationCtx(this);
            this.resolveClauses.forEach((r:ResolveClause) => {
                r.typeCheck(ctx)
                if (r.getError())
                    this._hasErrors = true;
            });

            this.updateExternalKindMapping(ctx);

            this.isTypechecking = false;
            this.isTypechecked = true;
        }

        private updateExternalKindMapping(ctx:UnificationCtx)
        {
            var k0 = Object.keys(ctx.mapping)
            var changed = k0.length != Object.keys(this.externalKindMapping).length;
            if (!changed)
                k0.forEach(k => {
                    if (ctx.mapping[k] != this.externalKindMapping[k]) changed = true;
                })
            if (changed) {
                this.externalKindMapping = ctx.mapping;
                this.updateSubstitutions();
            }
        }

        public writeTo(tw:TokenWriter)
        {
            this.writeId(tw)
            tw.keyword("meta").id("import").id(this.getName());
            tw.beginBlock();
                if (this.pubid)
                    tw.id("pub").string(this.pubid).nl();
                else
                    tw.id("guid").string(this.guid).nl();
                tw.id("usage");
                tw.beginBlock();
                    this.getPublicKinds().forEach((k) => {
                        if (k instanceof LibraryRefAbstractKind)
                            tw.keyword("type").id(k.getName()).nl();
                        else if (k instanceof UserActionKind) {
                            (<UserActionKind>k).userAction.writeHeader(tw, true)
                            tw.nl()
                        } else if (k instanceof RecordEntryKind) {
                            k.getRecord().writeTo(tw)
                        }
                    });
                    // TODO only dump the used ones
                    this.getPublicActions().forEach((a) => {
                        a.writeHeader(tw, true);
                    });
                    tw.nl();
                tw.endBlock();
                this.resolveClauses.forEach((r:ResolveClause) => {
                    r.writeId(tw)
                    if (!r.defaultLib) return;
                    tw.id("resolve").id(r.name).op("=");
                    r.defaultLib.writeRef(tw);
                    tw.id("with");
                    tw.beginBlock();
                        r.kindBindings.forEach((k:KindBinding) => {
                            if (k.isExplicit) {
                                k.writeId(tw)
                                tw.keyword("type").id(k.formalName).op("=").kind(this.parent, k.actual).nl();
                            }
                        });
                        r.actionBindings.forEach((a:ActionBinding) => {
                            if (a.isExplicit) {
                                a.writeId(tw)
                                tw.keyword("action").id(a.formalName).op("=");
                                a.actualLib.writeRef(tw);
                                tw.op("\u2192").id(a.getActualName()).nl();
                            }
                        });
                    tw.endBlock();
                });
            tw.endBlock();
        }

        public writeRef(tw:TokenWriter) { return tw.op(libSymbol).id(this.getName()); }

        private defKind(k:Kind)
        {
            this._publicKinds.push(k)
            this.kindMapping[k.getName()] = k
        }

        static parse(p:Parser)
        {
            var l = p.getLibraryRef(p.parseId());
            l.setStableName(p.consumeLabel())

            if (l.isDeclared) {
                p.parseBraced(() => { p.shift() })
                return;
            }
            l.isDeclared = true;

            p.declareLibrary(l);
            p.parseBraced(() => {
                if (p.gotKey("pub")) l.pubid = p.parseString();
                if (p.gotKey("guid")) l.guid = p.parseString();
                if (p.gotKey("usage")) {
                    var seenNames:any = {}
                    p.parseBraced(() => {
                        if (p.gotKw("action")) {
                            p.shift();
                            var a = new LibraryRefAction(l);
                            a.parse(p);
                            if (!seenNames.hasOwnProperty(a.getName())) {
                                seenNames[a.getName()] = true;
                                if (a.isActionTypeDef()) {
                                    l.defKind(a.getDefinedKind())
                                } else {
                                    l._publicActions.push(a);
                                }
                            }
                        } else if (p.gotId("type")) {
                            p.shift();
                            //TODO do something with these
                            l.listedKinds.push(p.parseId());
                        } else if (p.gotKw("table")) {
                            p.shift()
                            var rec = new LibraryRecordDef(l)
                            rec._initalizeFromParser(p)
                            l.defKind(rec.entryKind)
                        }
                    });
                }
                if (p.gotKey("resolve")) {
                    var r = new ResolveClause(p.parseId());
                    r.setStableName(p.consumeLabel());
                    l.resolveClauses.push(r);
                    p.skipOp("=");
                    r.defaultLib = p.parseLibRef();
                    if (p.gotId("with")) p.shift();
                    p.parseBraced(() => {
                        if (p.gotKw("action")) {
                            p.shift();
                            var a = new ActionBinding(p.parseId());
                            a.setStableName(p.consumeLabel());
                            a.isExplicit = true;
                            p.skipOp("=");
                            a.actualLib = p.parseLibRef();
                            p.skipOp("\u2192"); // ->
                            a.actualName = p.parseId();
                            r.actionBindings.push(a);
                        } else if (p.gotId("type")) {
                            p.shift();
                            var k = new KindBinding(p.parseId());
                            k.setStableName(p.consumeLabel());
                            k.isExplicit = true;
                            p.skipOp("=");
                            k.actual = p.parseType();
                            r.kindBindings.push(k);
                        }
                    });
                }
            });

            // default to an empty published library
            if (!l.getId()) l.pubid = "sixvorgj";
            l.importBindings();
        }

        // TSBUG remove return type annoation - error given in wrong place
        static topScriptLibrary(par:App):LibraryRef { return new ThisLibraryRef(par); }

        static fresh()
        {
            var decl = <LibraryRef>AST.Parser.parseDecl("meta import __touch_develop__library__ { }");
            decl.setName(Script.freshName("lib"));
            decl.wasAutoNamed = true;
            decl.pubid = "";
            return <LibraryRef>decl;
        }

        public initializeResolves()
        {
            var findMatching = (l:LibraryRef) =>
                Script.libraries().filter((q:LibraryRef) => l.getId() == q.getId() ||
                        (q.resolved && l.resolved && q.resolved.getName() == l.resolved.getName()))[0];

            var findMapped = (l:LibraryRef) =>
                l == this.resolved.thisLibRef ? this :
                this.resolveClauses.map((r:ResolveClause) =>
                                                r.formalLib == l ? r.defaultLib : null).filter((x) => !!x)[0];

            if (!this.resolved) return [];

            this.isTypechecked = false;
            this.typeCheck(); // force creation of resolve clauses
            var newLibs = [];

            this.resolveClauses.forEach((r:ResolveClause) => {
                var lib = findMatching(r.formalLib);
                if (lib) {
                    r.defaultLib = lib;
                    return;
                }

                lib = LibraryRef.fresh();
                r.defaultLib = lib;
                newLibs.push(r);
            });

            newLibs.forEach((r:ResolveClause) => {
                var lib = r.defaultLib;
                Script.addDecl(lib);
                lib.setName(Script.freshName(r.formalLib.getName()));
                lib.pubid = r.formalLib.pubid;
                lib.guid = r.formalLib.guid;
                lib.typeCheck();
            });

            newLibs.forEach((r:ResolveClause) => {
                var lib = r.defaultLib;
                var copyResolve = (c:ResolveClause,ix:number) =>
                {
                    var o = new ResolveClause(c.name);
                    o.defaultLib = findMapped(c.defaultLib);
                    o.actionBindings.setChildren(c.actionBindings.stmts.map((a:ActionBinding,ix:number) => {
                        var ao = new ActionBinding(a.formalName);
                        ao.isExplicit = a.isExplicit;
                        ao.actualLib = findMapped(a.actualLib);
                        ao.actualName = a.actualName;
                        return ao;
                    }));
                    return o;
                }
                lib.resolveClauses.setChildren(r.formalLib.resolveClauses.stmts.map(copyResolve));
            });

            return newLibs.map((r:ResolveClause) => r.defaultLib);
        }

        static libNamespace(name:string)
        {
            if (!name) return ""
            return libSymbol + name + "\u200A\u2192\u00A0";
        }
    }


    class ThisLibraryRef
        extends LibraryRef
    {
        public isReal() { return true; }
        public getPublicActions()
        {
            return <Action[]>this.resolved.things.filter((a:Decl) => a instanceof Action && !(<Action>a).isPrivate);
        }
        public isThis() { return true; }

        constructor(p:App) {
            super()
            this.resolved = p;
            this.parent = p;
            this.setName("this");
            this.setStableName("this");
        }

        public typeCheck()
        {
            this.isTypechecked = true;
        }
    }

}
