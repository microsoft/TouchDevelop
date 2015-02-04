///<reference path='refs.ts'/>

module TDev.AST {
    export var recordSymbol = "\u2339";
    export var oldModelSymbol = "\u229E";
    export var modelSymbol = "\u2756";

    // A special variety of statement that is displayed inline. Useful for
    // making parts of the record definition clickable.
    export class InlineStmt
        extends AST.Stmt
    {

        constructor() {
            super();
        }

        public accept(v:NodeVisitor) { v.visitInlineStmt(this); }

        public nodeType() {
            return "inlineStmt";
        }
    }

    // First use-case: to make the record kind clickable.
    export class RecordKind
        extends InlineStmt
    {
        constructor(public parentDef: RecordDef) {
            super();
        }
    }

    // Same thing with the record persistence
    export class RecordPersistenceKind
        extends InlineStmt
    {
        constructor(public parentDef: RecordDef) {
            super();
        }
    }

    // Second use-case: to hold a single token that holds the record name. That
    // allows the calculator to switch into editing mode, which is convenient.
    // The [getName] and [setName] functions from the [RecordNameHolder] reflect
    // the value of the (supposedly) single [RecordName] token that's in there.
    export class RecordNameHolder
        extends InlineStmt
    {

        private exprHolder = new AST.ExprHolder();

        constructor() {
            super();

            this.exprHolder.tokens = [ new RecordName() ]
            this.exprHolder.parsed = new AST.Literal(); // placeholder
            this.exprHolder.locals = [];
        }

        public children() {
            return this.exprHolder.tokens;
        }

        public calcNode(): ExprHolder {
            return this.exprHolder;
        }

        public notifyChange() {
            var toks = this.exprHolder.tokens;
            if (toks[0] && toks[0] instanceof RecordName) {
                super.setName((<RecordName>toks[0]).data);
            }
        }

        public setName(v: string) {
            super.setName(v);
            var toks = this.exprHolder.tokens;
            if (toks[0] && toks[0] instanceof RecordName)
                (<RecordName>toks[0]).data = v;
        }
    }

    // The token that stands for the record name itself. While, strictly
    // speaking, it is a literal, having a subclass allows the renderer to
    // render it without quotes.
    export class RecordName
        extends AST.Literal
    {
        constructor() {
            super();
        }

        public accept(v:AST.NodeVisitor) { return v.visitRecordName(this); }
    }

    // Same deal here.
    export class FieldName
        extends AST.Literal
    {
        constructor() {
            super();
        }

        public accept(v:AST.NodeVisitor) { return v.visitFieldName(this); }
    }


    export enum RecordType
    {
        Object    = 1,
        Table     = 2,
        Index     = 3,
        Decorator = 4
    }


    // note: The order matters!! (Tim) Used in TypeChecker
    export enum RecordPersistence
    {
        Temporary,
        Local,
        Cloud,
        Partial
    }


    class SimpleProperty
        extends Property
    {
        constructor(private name:any, private help:string, private writesmutable:boolean, public parentKind:Kind, private resultKind:Kind, public isField=false,  paramKind1:Kind = null,  paramKind2:Kind = null) {
            super(parentKind, name, help, [], api.core.Unknown);
            this.paramkinds = [];
            if (paramKind1)
                this.paramkinds.push(paramKind1);
            if (paramKind2)
                this.paramkinds.push(paramKind2);
        }
        public getName():string { return typeof this.name === "string" ? this.name : this.name.getName(); }

        private paramkinds: Kind[];
        private cachedParameters: PropertyParameter[];

        public setParameterKinds(paramkinds : Kind[]) {
            this.paramkinds = paramkinds;
            this.cachedParameters = undefined;
        }

        public getParameters():PropertyParameter[]
        {
            if (!this.cachedParameters) {
                var selfParm = PropertyDecl.mkPPext(this, "_this_", this.parentKind);
                if (this.writesmutable)
                    selfParm._flags |= ParameterFlags.WritesMutable;
                this.cachedParameters = [selfParm];
                this.paramkinds.forEach(paramKind => {
                    this.cachedParameters.push(PropertyDecl.mkPPext(this,  paramKind.getStemName(),  paramKind));
                });
            }
            return this.cachedParameters;
        }

        public makeObsolete():SimpleProperty {
            this._addFlags(PropertyFlags.IsObsolete);
            return this;
        }
        public hideIntelliButton(): SimpleProperty {
            this._addFlags(PropertyFlags.HideIntelliButton);
            return this;
        }
        public ignoreReturnValue(): SimpleProperty {
            this._addFlags(PropertyFlags.IgnoreReturnValue);
            return this;
        }

        public getResult():PropertyParameter { return PropertyDecl.mkPPext(this, "", this.resultKind); }
        public getHelp() { return this.help }
        public isImplemented() { return true; }
        public canCacheSearch() { return false }

        static deleteProperties(props:IProperty[])
        {
            if (props)
                props.forEach(p => { p.deleted = true; })
        }
    }

    function memoize(f:()=>any) : ()=>any
    {
        var cache:any;
        var cached = false;
        return function() {
            if (cached) return cache;
            cached = true;
            cache = f();
            return cache;
        };
    }

    // This function takes a kind [k] and return a series of [PropertyRef]
    // tokens suitable for insertion in a [RecordField]. These [PropertyRef]'s,
    // when type-checked as an expression, have return kind [k].
    export function propertyRefsForKind(forKind: Kind): PropertyRef[] {
        // We're doing here pretty much the same thing the calculator would do:
        // from the "fake" kind assigned in [ast/typeChecker.ts] to the
        // [FieldName], we derive the right [MultiplexProperty] for this
        // [MultiplexRootProperty].
        var mkRootProp = () => {
            var mk = TDev.MultiplexRootProperty.md_make_kind();
            mk.md_parametric("T");
            var prop = TDev.MultiplexRootProperty
                .md_make_prop(mk, 0, TDev.api.core.Unknown, ":", "Whatever", [], mk.getParameter(0));
            return prop;
        }

        var acc = [];

        var genPropRef = (parentProp: MultiplexRootProperty, forKind: Kind, prefix: string) => {
            var parentKind = <MultiplexKind> parentProp.getResult().getKind();
            var argsN = MultiplexKind.argsFor(forKind);
            var prop;
            if (argsN.length == 0) {
                prop = parentKind.createFinal(forKind);
            } else {
                prop = new MultiplexProperty(forKind, parentKind, new MultiplexKind(argsN));
            }

            var propRef = new PropertyRef();
            propRef.prop = prop;
            // Generate the proper name for this token. This is what get
            // displayed in the edited statement. If incorrect, this is a
            // type-checking error! We bypass the [getName()] logic because
            // [forKind] is well-formed and we really want the token's [data]
            // property to be [collection of], not [collection of string].
            //
            // First, we need to prefix (that was determined by our parent
            // kind), such as "to" as in "converter from a to b".
            //                            ^^^^^^^^^^^^^^ ^ ^^^^
            // (Tokens highlighted.)
            propRef.data = prefix + MultiplexKind.propName(prop.forKind)

            acc.push(propRef);

            if (forKind.getParameterCount() > 0)
                (<ParametricKind> forKind).parameters.forEach((p: Kind, i: number) =>
                    genPropRef(prop, p, argsN[i].prefix)
                );
        }
        genPropRef(mkRootProp(), forKind, "");

        return acc;
    }

    export function KindToCodomain(kind: Kind):string {
        if (kind instanceof RecordEntryKind)
            return "^" + (<RecordEntryKind>kind).getRecord().getStableName();
        else
            return RT.Conv.getCloudCodomain(kind.getName());
    }

    export class RecordField
        extends Stmt
    {
        public dataKind:Kind;
        private exprHolder = new AST.ExprHolder();
        // The [CommentEditor] assumes that [Comments] are the children of a
        // codeblock.
        public commentBlock = new CodeBlock();

        constructor(name:string, k:Kind, public isKey:boolean, public description = "") {
            super()
            this.setStableName(uniqueAstId(16));

            this.exprHolder.tokens = [ <AST.Token> new FieldName() ].concat(propertyRefsForKind(k));
            this.exprHolder.parsed = new AST.Literal(); // placeholder
            this.exprHolder.locals = [];

            this.commentBlock.setChildren([]);
            description.split(/\n/).forEach(l => {
                if (!l)
                    return;

                var c = new FieldComment(this);
                c.text = l;
                this.commentBlock.push(c);
            });

            this.setName(name);
            this.setKind(k);
        }

        public calcNode() {
            return this.exprHolder;
        }

        public notifyChange() {
            // Examine the tokens and decide what to do.
            var toks = this.exprHolder.tokens;
            if (toks.length == 0) {
                var fb = <AST.FieldBlock>this.parent;
                // User deleted us. Update the AST accordingly. We're
                // short-circuiting slightly what the block would do otherwise.
                var ch = fb.children().filter(x => x != this);
                fb.setChildren(ch);
                // After that, the calculator will bail out and dismiss itself.
            } else if (toks[0] && toks[0] instanceof FieldName) {
                // Update the name only if no name clashes.
                var newName = (<FieldName>toks[0]).data;
                if (newName != this.getName() &&
                    this.def().getFields().every(f => f.getName() != newName))
                {
                    super.setName(newName);
                    Script.notifyChangeAll();
                }

                // Update the type of the field (if there's a valid type there).
                // Right now, we are unable to write back the proper kind as a
                // series of tokens, so don't erase the previously stored kind
                // until the user starts inputting a new one. Not the best UI
                // interaction, but that'll do for now.
                if (toks.length > 1) {
                    this.setKind(this.exprHolder.getKind());
                    this.def().clearPropertyCaches();
                }

                // Re-check everything, this gives proper error messages.
                TypeChecker.tcApp(Script);
            }
            if (toks.length > 1 && toks[1] instanceof AST.PropertyRef) {
                // For cosmetic reasons.
                (<AST.PropertyRef>toks[1]).skipArrow = true;
            }
            super.notifyChange();
        }

        public accept(v:NodeVisitor) { return v.visitRecordField(this); }
        public fieldKind:ParametricKind;
        public isLastChild() { return false; } // no moving please

        public nodeType() { return "recordField"; }
        public setName(v: string) {
            super.setName(v);
            var toks = this.exprHolder.tokens;
            if (toks.length > 0 && toks[0] instanceof FieldName)
                (<FieldName>toks[0]).data = v;
        }
        public def() { return (<FieldBlock>this.parent).parentDef; }
        public getDescription() { return this.description }

        public setKind(k:Kind)
        {
            if (this.dataKind != k) {
                this.dataKind = k;
                this.fieldKind = api.core.Ref.createInstance([ k ])
                this.clearPropertyCaches();
            }
        }

        public matches(d:AstNode)
        {
            return this.dataKind.matches(d)
        }

        // used by compiler
       // public jsonImporter:string ()
        //{
        //    switch(

        //}

        private propertyDeflStrings:string[];
        static trueFalse = ["true", "false"]
        public bogusPropertyParameter()
        {
            if (this.propertyDeflStrings === undefined) {
                var m = /\{hints:([^{}]*)/.exec(this.getDescription())
                if (m)
                    this.propertyDeflStrings = m[1].split(/,/)
                else if (this.dataKind == api.core.Boolean)
                    // make true the default
                    this.propertyDeflStrings = RecordField.trueFalse
                else
                    this.propertyDeflStrings = null
            }
            var r = this.def().mkPP(this.getName(), this.dataKind)
            if (this.propertyDeflStrings) {
                r.setDeflStrings(this.propertyDeflStrings)
                // in this case we only wanted the default
                if (this.propertyDeflStrings == RecordField.trueFalse)
                    r.setDeflStrings(null)
            }
            return r
        }

        public clearPropertyCaches()
        {
            if (this.propertyCache) {
                this.propertyCache.deleted = true;
                this.propertyCache = null;
            }
        }

        public onDelete()
        {
            this.clearPropertyCaches();
        }

        private propertyCache:IProperty;

        public asProperty() : IProperty
        {
            if (!this.propertyCache) {
                if (this.isKey) {
                    var sp =
                        new SimpleProperty(this, "get the " + this.dataKind.toString() + " key", false,
                                            this.def().entryKind, this.dataKind, true);
                    sp.isKey = true;
                    this.propertyCache = sp;
                }
                else {
                    this.propertyCache =
                        new SimpleProperty(this, "access the " + this.dataKind.toString() + " field", false,
                                            this.def().entryKind, this.dataKind, true);
                }
                var s = this;
                this.propertyCache.forwardsToStmt = () => s;
            }
            return this.propertyCache;
        }


        public writeDef(tw: TokenWriter)
        {
            if (this.description)
                tw.comment(this.description);
            tw.uniqueId(this.getStableName());
            tw.id(this.getName()).op(":").kind(this.def().parent, this.dataKind).nl();
        }

        public writeTo(tw:TokenWriter)
        {
            // used when serialized as a block for copy&paste
            // XXX use another keyword? var seems fragile (already used for
            // declarations)
            tw.keyword("var").id(this.getName()).op(":").kind(this.def().parent, this.dataKind).op0(";").nl()
            .comment(this.description);
        }



        public getCloudType(): string {
            if (this.isKey) {
                if (this.dataKind instanceof RecordEntryKind) {
                    return (<RecordEntryKind>(this.dataKind)).record.getCloudType();
                }
                else {
                    return RT.Conv.getCloudDomain(this.dataKind.getName());
                }
            }
            else {
                return Revisions.Parser.MakeProperty(this.getStableName(), this.def().getCloudType(), AST.KindToCodomain(this.dataKind));
            }
        }

        public referenceName() {
            if (this.def().recordType == RecordType.Object) return "$" + this.getName()
            return this.getStableName()
        }
    }

    export class ExtensionEnabledKind
        extends Kind
    {
        constructor(name:string, desc:string) {
            super(name, desc)
            this.isData = true;
        }

        private extActions:IProperty[] = [];

        public addExtensionAction(a:IProperty)
        {
            this.extActions.push(a)
        }

        public listExtensions():IProperty[]
        {
            var res:IProperty[] = []
            Script.things.forEach(t => {
                if (t instanceof Action) {
                    var a = <Action>t
                    if (a.getExtensionKind() == this) {
                        res.push(new ExtensionProperty(a))
                    }
                }
            })

            if (res.length > 0) {
                if (this.extActions.length > 0) return this.extActions.concat(res)
                else return res
            } else {
                return this.extActions;
            }
        }

        public getExtension(name:string)
        {
            return this.listExtensions().filter(p => p.getName() == name)[0]
        }

        public isUserDefined() { return true }
        public isExtensionEnabled() { return true }
    }

    export class RecordEntryKind
        extends ExtensionEnabledKind
    {
        constructor(public record: RecordDef) {
            super("none", "record entry")
            this.collectionKind = api.core.Collection.createInstance([this])
            this.isSerializable = true;
        }

        public getRecord() { return this.record; }

        public collectionKind:ParametricKind;
        public isError() { return this.record.deleted; }
        public listPriority() { return 5; }
        public isUserDefined() { return true; }

        public getDescription() { return this.record ? this.record.getEntryKindDescription() : ""; }
        public getHelp() { return this.record.getEntryKindDescription(); }
        public getStemName() { return this.record.getCoreName() }


        private props:IProperty[];

        public icon(): string {
            if (this.record.recordType === RecordType.Table)
                return "svg:Subtract,white";
            else
                return "svg:PageCurl,white";
        }

        public parentLibrary() : AST.LibraryRef { return this.getRecord().parentLibrary() }

        public getContexts() : KindContext
        {
            switch (this.record.recordType)
            {
                case RecordType.Object:
                    return KindContext.General | KindContext.WallTap | KindContext.GcKey | KindContext.Json;
                case RecordType.Table:
                    return KindContext.General | KindContext.RowKey | KindContext.GcKey| KindContext.CloudField | KindContext.WallTap | KindContext.Json;
                case RecordType.Decorator:
                    return KindContext.General | KindContext.WallTap;
                case RecordType.Index:
                    return KindContext.General | KindContext.WallTap | KindContext.GcKey;
            }
            Util.die()
        }

        private getCommonProps()
        {
            if (!this.props) {
                var clear = new SimpleProperty("clear fields", "sets all fields to their default values", true, this, api.core.Nothing)
                var eq    = new SimpleProperty("equals", "tests if two references refer to the same object", false, this, api.core.Boolean, false, this)
                var post = new SimpleProperty("post to wall", "displays the object on the wall", false, this, api.core.Nothing)
                var tojson = new SimpleProperty("to json", "export a JSON representation of the contents", false, this, api.core.JsonObject)

                switch (this.record.recordType) {
                case RecordType.Object:
                    this.props = [
                        post, clear, eq,
                        new SimpleProperty("is invalid", "checks if reference has not been set", false, this, api.core.Boolean),
                        tojson,
                        new SimpleProperty("from json", "import field values from a JSON object", false, this, api.core.Nothing, false, api.core.JsonObject)
                    ];
                    break;
                case RecordType.Table:
                    var dr = new SimpleProperty("delete row", "deletes this row from the table", true, this, api.core.Nothing);
                    var conf = new SimpleProperty("confirmed", "true if last update of row has been confirmed by server", false, this, api.core.Boolean)
                    this.props = [
                        post, eq,
                        dr,
                        tojson,
                        new SimpleProperty("from json", "import column values from a JSON object", false, this, api.core.Nothing, false, api.core.JsonObject),
                        new SimpleProperty("is invalid", "checks if reference has not been set", false, this, api.core.Boolean),
                        new SimpleProperty("is deleted", "checks if this row (or any of its linked rows) has been deleted", false, this, api.core.Boolean),
                        conf
                    ];
                    if (!(this.record.cloudEnabled || this.record.cloudPartiallyEnabled))
                        conf.hideIntelliButton();
                    break;
                    case RecordType.Decorator:
                        this.props = [post, clear, eq,
                            tojson,
                            new SimpleProperty("from json", "import field values from a JSON object", false, this, api.core.Nothing, false, api.core.JsonObject),
                        ];
                        break;
                case RecordType.Index:
                    this.props = [post, clear, eq,
                        tojson,
                        new SimpleProperty("from json", "import field values from a JSON object", false, this, api.core.Nothing, false, api.core.JsonObject),
                        new SimpleProperty("is invalid", "checks if reference has not been set", false, this, api.core.Boolean),
                        new SimpleProperty("is deleted", "checks if this index entry is deleted, i.e. has a deleted row key", false, this, api.core.Boolean),
                        new SimpleProperty("confirmed", "true if last update of entry has been confirmed by server", false, this, api.core.Boolean)
                    ];
                    break;
                default: Util.die();
                }

            }


            return this.props;
        }

        public clearPropertyCaches() {
            SimpleProperty.deleteProperties(this.props)
            this.props = null;
        }

        public kill()
        {
            this.clearPropertyCaches()
            this.record.deleted = true
        }

        public listProperties() : IProperty[] { return this.getCommonProps()
                                                         .concat(this.record.getFields().map((p) => p.asProperty()))
                                                         .concat(this.listExtensions()) }

        public getProperty(name:string) : IProperty
        {
            var flt = (p) => p.getName() === name
            var a = this.getCommonProps().filter(flt)[0];
            if (a) return a;
            var b = this.record.getFields().filter(flt)[0];
            if (b) return b.asProperty();
            return this.getExtension(name)
        }

        public getName() { return this.record.getCoreName(); }
        public toString() { return this.record.getNamespace() + this.getName() }

        public recordType() { return this.record.recordType }
    }

   export class RecordDefKind
        extends Kind
    {
        constructor(public record:RecordDef) {
            super("no name", "record definition")
            this.isData = true; // there is actually a data item (stored together with regular data) associated with it
            this.isSerializable = true;
        }
        public getRecord() { return this.record; }
        public listProperties() : IProperty[] { return this.record.getProperties(); }
        public getProperty(name:string) : IProperty { return this.record.getProperties().filter((a) => a.getName() === name)[0]; }
        public getName() { return this.record.getName() }
        public toString() { return this.record.toString() }
        public getDescription() { return this.record.getDescription(); }
        public getHelp() { return this.record.getDescription(); }
        public isEnumerable() { return this.record.recordType === RecordType.Table || this.record.recordType === RecordType.Index; }
        public hasEnumerator() { return true; }


        public getContexts() : KindContext
        {
            if (!this.record) return KindContext.None;
            switch (this.record.recordType)
            {
                case RecordType.Decorator:
                case RecordType.Object:
                    return KindContext.Enumerable;
                case RecordType.Table:
                case RecordType.Index:
                    return KindContext.Enumerable;
            }
            Util.die()
        }
    }

    export class RecordCtorProperty
        extends Property
    {
        public getName() {
            var suff = this.from_json ? " from json" : ""
            switch (this.record.recordType) {
            case RecordType.Object: return "create" + suff;
            case RecordType.Table: return "add row" + suff;
            case RecordType.Decorator: return "at";
            case RecordType.Index: return (this.record.keys.count() === 0 ? "singleton" : "at");
            default: Util.die();
            }
        }

        constructor(public record:RecordDef, public from_json = false) {
            super(record.entryKind, "", "", [], api.core.Unknown)
            this.parentKind = this.record.tableKind;
        }

        public getParameters():PropertyParameter[]
        {
            var res = [PropertyDecl.mkPPext(this, "_this_", this.record.tableKind)];
            this.record.keys.forEach((p:RecordField) => {
                res.push(PropertyDecl.mkPPext(this, p.getName(), p.dataKind));
            });
            if (this.from_json)
                res.push(PropertyDecl.mkPPext(this, "json", api.core.JsonObject))
            return res;
        }

        public getResult(): PropertyParameter {
            var rs = PropertyDecl.mkPPext(this, "k", this.record.entryKind);
            if (this.record.recordType === RecordType.Object)
                rs.md_writesMutable();
            return rs;
        }

        public getDescription() {
            switch (this.record.recordType) {
            case RecordType.Object:
                return this.from_json ? "create a fresh object and initialize from given JSON object" : "create a fresh object";
            case RecordType.Table:
                if (this.record.keys.count() === 0) return "create a fresh row in the table";
                else return "create a fresh row in the table, with the given links";
            case RecordType.Decorator:
                return "access the decoration for a target";
            case RecordType.Index:
                if (this.record.keys.count() === 0) return "access the single entry (there is only one, since there are no keys)"
                else return "accesses the entry indexed by the given keys";
            default: Util.die();
            }
        }

        public isImplemented() { return true; }
        public canCacheSearch() { return false }
    }

    export class RecordDef
        extends PropertyDecl
        implements IProperty
    {
        public keys = new FieldBlock();
        public values = new FieldBlock();
        public description = "";
        public recordType = RecordType.Object;

        public recordKind = new RecordKind(this);
        public recordPersistence = new RecordPersistenceKind(this);
        public recordNameHolder = new RecordNameHolder();

        public cloudEnabled = false;
        public cloudPartiallyEnabled = false;
        public persistent = false;
        private _properties:IProperty[];
        public tableKind:Kind;
        public entryKind:RecordEntryKind;
        private ctorProperty: IProperty;
        private ctorJsonProperty: IProperty;
        public isModel = false;
        public _isExported = false;

        constructor() {
            super()
            this.keys.parentDef = this;
            this.values.parentDef = this;
            this.tableKind = new RecordDefKind(this);
            this.entryKind = new RecordEntryKind(this);
            this.ctorProperty = new RecordCtorProperty(this);
            this.ctorJsonProperty = new RecordCtorProperty(this, true);
            this._kind = this.tableKind;
        }

        public setName(n: string) {
            this.recordNameHolder.setName(n);
        }

        public parentLibrary() : AST.LibraryRef { return null }

        public locallypersisted() { return this.persistent && !(this.cloudEnabled || this.cloudPartiallyEnabled); }

        public hasErrors() { return !!this.getError() || this.getFields().some((r) => !!r.getError()); }

        public children(): AstNode[] {
            return [
                this.keys,
                this.values
            ];
        }

        public thingSetKindName() { return "records"; }

        public getCoreName() { return this.recordNameHolder.getName(); }
        public getDefinedKind() { return this.entryKind }

        public isExported() { return this._isExported && this.recordType == RecordType.Object }

        public getName()
        {
            switch (this.recordType) {
            case RecordType.Object: return this.getCoreName();
            case RecordType.Table: return this.getCoreName() + " table";
            case RecordType.Index: return this.getCoreName() + " index";
            case RecordType.Decorator:
                var k = this.getTargetKind();
                if (!k) return this.getCoreName() + " decorator";
                else return k.getName() + " decorator";
            default: Util.die();
            }
        }

        public getSignature():string {
            return "";
        }

        public getRecordPersistence()
        {
            if (this.recordType === RecordType.Index || this.recordType === RecordType.Table) {
                if (this.cloudPartiallyEnabled) return RecordPersistence.Partial;
                if (this.cloudEnabled) return RecordPersistence.Cloud;
                if (this.persistent) return RecordPersistence.Local;
            }
            return RecordPersistence.Temporary;
        }

        public getPersistenceDescription()
        {
            switch (this.recordType) {
                case RecordType.Index:
                case RecordType.Table: return RecordDef.recordPersistenceToString(this.getRecordPersistence(), Script && Script.isCloud);
                case RecordType.Object:
                case RecordType.Decorator: return ""
                default: Util.die();
            }
        }

        public getDescription():string
        {
             if (this.description)
                return this.description;

            var pref = "A " + this.getPersistenceDescription()

            switch (this.recordType) {
                case RecordType.Object: return "A loose collection of " + this.getCoreName() + " objects.";
                case RecordType.Table: return pref + " table containing " + this.getCoreName() + " records.";
                case RecordType.Index: return pref + " index containing " + this.getCoreName() + " entries.";
                case RecordType.Decorator: return "A decorator for " + (this.getTargetKind().getName() || "") + " objects.";
                default: Util.die();
            }
         }
        public getEntryKindDescription():string
        {
            switch (this.recordType) {
                case RecordType.Object: return "A reference to a " + this.getCoreName() + " object.";
                case RecordType.Table: return "A reference to a " + this.getCoreName() + " table row.";
                case RecordType.Index: return "A reference to a " + this.getCoreName() + " index entry.";
                case RecordType.Decorator: return "A reference to a " + (this.getTargetKind().getName() || "") + " decoration.";
                default: Util.die();
            }
         }



        public getDefTerminology() { return RecordDef.recordTypeToString(this.recordType).toLowerCase(); }

        public getKeyTerminology()
        {
            switch (this.recordType) {
            case RecordType.Object: return null;
            case RecordType.Table: return "link";
            case RecordType.Index: return "key";
            case RecordType.Decorator: return null;
            default: Util.die();
            }
        }
        public getValueTerminology()
        {
            switch (this.recordType) {
            case RecordType.Object: return "field";
            case RecordType.Table: return "column";
            case RecordType.Index: return "field";
            case RecordType.Decorator: return "field";
            default: Util.die();
            }
        }

        public linkedtables: RecordDef[];

        public getCloudType(): string {
            Util.assert(this.persistent);
            switch (this.recordType) {
                case RecordType.Table:
                    {
                        var links = this.keys.stmts.map(x =>
                        {
                            var dk = (<RecordField>x).dataKind;
                            return (<RecordEntryKind>dk).record.getCloudType();
                        });
                        return Revisions.Parser.MakeDomain(this.getStableName(), Revisions.Parser.DOMAIN_DYNAMIC, links);
                    }
                case RecordType.Index:
                     {
                        var keys = this.keys.stmts.map(x =>
                        {
                            var dk = (<RecordField>x).dataKind;
                            var record = (<RecordEntryKind>dk).record;
                            if (record)
                               return (<RecordEntryKind>dk).record.getCloudType();
                            else {
                               return RT.Conv.getCloudDomain(dk.getName());
                            }
                        });
                         return Revisions.Parser.MakeDomain(this.getStableName(), Revisions.Parser.DOMAIN_STATIC, keys);
                    }
                default: Util.die();
            }
        }

        public getProperties()
        {
            this.initalizeProperties();
            return this._properties;
        }

        public clearPropertyCaches()
        {
            SimpleProperty.deleteProperties(this._properties);
            this._properties = null;
            (<RecordEntryKind>this.entryKind).clearPropertyCaches();
            this.getFields().forEach((r) => r.clearPropertyCaches());
        }

        //public needs_pre_op(op: string) : boolean {
        //    return (this.recordType != RecordType.Object);
        //}
        //public needs_post_op(op: string) : boolean{
        //    return (this.cloudEnabled);
        //}

        public fixupFields(oldtype: RecordType = undefined)
        {
            if (this.recordType != RecordType.Table && this.recordType != RecordType.Index) {
                this.cloudEnabled = false;
                this.cloudPartiallyEnabled = false;
                this.persistent = false;
            }

            var origtype = oldtype || this.recordType;
            var newtype = this.recordType;

            // delete keys if switching away from decorator
            if (origtype === RecordType.Decorator && newtype != RecordType.Decorator) {
                 this.keys.setChildren([]);
            }

            // delete keys if switching to a non-index
            else if (origtype != newtype && newtype != RecordType.Index) {
                 this.keys.setChildren([]);
            }

            // force decorator to be valid at all times
            if (newtype === RecordType.Decorator)
            {
                var theKey: RecordField = <RecordField>this.keys.stmts[0];
                if (!theKey) theKey = new RecordField("target", api.getKind("Sprite"), true);
                this.keys.setChildren([theKey]);
                theKey.setName("target");
            }
        }


        private initalizeProperties() {
            if (this._properties) return;
            switch (this.recordType) {
                case RecordType.Object:
                    var p = new SimpleProperty("create collection", "creates an empty collection of objects", false, this.tableKind, this.entryKind.collectionKind);
                    p.md_writesMutable();
                    var p1 = new SimpleProperty("invalid", "Create an invalid value of this object type", false, this.tableKind, this.entryKind);
                    this._properties = [p, p1];
                    break;
                case RecordType.Table:
                    var p = new SimpleProperty("create collection", "creates an empty collection of rows", false, this.tableKind, this.entryKind.collectionKind);
                    p.md_writesMutable();
                    var p2 = new SimpleProperty("copy to collection", "loads the table rows into a collection", false, this.tableKind, this.entryKind.collectionKind);
                    p2.md_writesMutable();
                    this._properties = [
                        new SimpleProperty("post to wall", "Post all rows to the wall", false, this.tableKind, api.core.Nothing),
                        new SimpleProperty("count", "Counts the number of rows", false, this.tableKind, api.core.Number),
                        new SimpleProperty("clear", "Clear all rows from the table", true, this.tableKind, api.core.Nothing),
                        p,
                        p2,
                        new SimpleProperty("invalid row", "Creates an invalid reference to a row", false, this.tableKind, this.entryKind).makeObsolete(),
                        new SimpleProperty("invalid", "Creates an invalid reference to a row", false, this.tableKind, this.entryKind),
                        new SimpleProperty("row at", "Gets the row at the specified position. Returns invalid if out of range", false, this.tableKind, this.entryKind, false, api.core.Number),
                    ];
                    //this._properties.push(new SimpleProperty("on changed", "sets an action to perform after data in this table changes", true, this.tableKind, api.core.EventBinding, false, api.core.Action).ignoreReturnValue());
                    this._properties.push(p = new SimpleProperty("wait for update", "waits until there is an update (possibly change) to the table contents", false, this.tableKind, api.core.Nothing));
                    p.md_resumes(); p.md_async(); p.md_betaOnly();
                    if (this.keys.stmts.length >= 1) {

                        var p3 = new SimpleProperty("entries linked to", "returns all rows with matching links", false, this.tableKind, this.entryKind.collectionKind);
                        p3.setParameterKinds(this.keys.stmts.map((p: RecordField) => p.dataKind))
                        p3.md_writesMutable();
                        this._properties.push(p3);
                    }
                    this._properties.push(new SimpleProperty("to json", "export a JSON representation of the table contents", false, this.tableKind, api.core.JsonObject));
                    this._properties.push(new SimpleProperty("from json", "import a JSON representation of the table contents", false, this.tableKind, api.core.Nothing, false, api.core.JsonObject));
                    break;
                case RecordType.Index:
                    var p = new SimpleProperty("create collection", "creates an empty collection of entries", false, this.tableKind, this.entryKind.collectionKind);
                    p.md_writesMutable();
                    var p2 = new SimpleProperty("copy to collection", "loads the index entries into a collection", false, this.tableKind, this.entryKind.collectionKind);
                    p2.md_writesMutable();
                    this._properties = [
                        new SimpleProperty("post to wall", "Posts all non-empty entries (i.e. entries with at least one non-default field) to the wall", false, this.tableKind, api.core.Nothing),
                        new SimpleProperty("count", "Counts the number of entries that contain non-default values", false, this.tableKind, api.core.Number),
                        new SimpleProperty("clear", "Clear all entries, all fields assume default value", true, this.tableKind, api.core.Nothing),
                        p,
                        p2,
                        new SimpleProperty("invalid", "Creates an invalid reference to an entry", false, this.tableKind, this.entryKind)
                    ];
                    if (this.isUserIndex()) {
                        var p2 = new SimpleProperty("my entries", "returns all non-empty entries whose first key matchest the current user", false, this.tableKind, this.entryKind.collectionKind);
                        p2.md_writesMutable();
                        this._properties.push(p2);
                    }
                    //this._properties.push(new SimpleProperty("on changed", "sets an action to perform after data in this index changes", true, this.tableKind, api.core.EventBinding, false, api.core.Action).ignoreReturnValue());
                    this._properties.push(p = new SimpleProperty("wait for update", "waits until there is an update (possibly change) to the index contents", false, this.tableKind, api.core.Nothing));
                    p.md_resumes(); p.md_async(); p.md_betaOnly();
                    this._properties.push(new SimpleProperty("to json", "export a JSON representation of the table contents", false, this.tableKind, api.core.JsonObject));
                    this._properties.push(new SimpleProperty("from json", "import a JSON representation of the table contents", false, this.tableKind, api.core.Nothing, false, api.core.JsonObject));
                   break;
                case RecordType.Decorator:
                    this._properties = [
                        new SimpleProperty("clear", "Clears all decorations, all fields assume initial value", true, this.tableKind, api.core.Nothing)
                    ];
                    break;
                default: Util.die();
            }
            this._properties.unshift(this.ctorProperty);
            if (this.recordType == RecordType.Object)
                this._properties.unshift(this.ctorJsonProperty);
        }

        public getTargetKind():Kind
        {
            if (this.recordType != RecordType.Decorator) return null;
            var k:RecordField = <RecordField>this.keys.stmts[0];
            if (!k) return null;
            return k.dataKind;
        }

        public isUserIndex(): boolean {
            if (this.recordType !== RecordType.Index || this.keys.stmts.length < 1) return false;
            var k: RecordField = <RecordField>this.keys.stmts[0];
            return k && k.dataKind._name === "User";
        }

        public getFields():RecordField[] { return <RecordField[]>this.keys.stmts.concat(this.values.stmts); }
        public getValueFields():RecordField[] { return <RecordField[]>this.values.stmts; }
        public getKeyFields():RecordField[] { return <RecordField[]>this.keys.stmts; }

        public nodeType() { return "recordDef"; }
        public accept(v:NodeVisitor) { return v.visitRecordDef(this); }

        public getCategory() { return PropertyCategory.Record; }
        public getNamespace() { return recordSymbol + "\u200A"; }
        public toString() { return this.getNamespace() + this.getName(); }

        public writeTo(tw:TokenWriter)
        {
            this.writeId(tw);
            tw.nl().keyword("table").id(this.getCoreName());
            tw.beginBlock();
                if (this.description)
                    tw.comment(this.description);
                tw.stringAttr("type", RecordDef.recordTypeToString(this.recordType));
                tw.boolOptAttr("cloudenabled", this.cloudEnabled);
                tw.boolOptAttr("cloudpartiallyenabled", this.cloudPartiallyEnabled);
                tw.boolOptAttr("exported", this._isExported);
                tw.boolAttr("persistent", this.persistent);

                var dumpList = (id:string, b:FieldBlock) => {
                    if (b.stmts.length === 0) return;
                    tw.id(id);
                    tw.beginBlock();
                        b.forEach((f:RecordField) => f.writeDef(tw));
                    tw.endBlock();
                }
                dumpList("keys", this.keys);
                dumpList("fields", this.values);
            tw.endBlock();
        }

        public notifyChange() {
            super.notifyChange();

            // we are editing data structure definitions! Must ensure to remove all stale state.
            if (Runtime.theRuntime)
                Runtime.theRuntime.resetData();
        }

        static parse(p:Parser)
        {
            var r = new RecordDef();
            p.addDecl(r);
            r._initalizeFromParser(p);
        }

        public _initalizeFromParser(p:Parser)
        {
            this.setStableName(p.consumeLabel());
            this.setName(p.parseId());
            this.persistent = true;

            function encode(s:string) {
                return Util.base64Encode(Util.toUTF8(s)).replace(/[^A-Za-z0-9]/g, "a")
            }

            p.parseBraced(() => {
                var parseFields = (lst:FieldBlock, keys:boolean) => {
                    p.shift();
                    var usedNames = {}
                    var desc = ""
                    p.parseBraced(() => {
                        if (p.got(TokenType.Comment)) {
                            desc += p.shift().data + "\n";
                            return
                        }

                        var lbl = p.consumeLabel().pop(); // TODO XXX - is this correct?
                        var nm = p.parseId();
                        var tp = p.parseTypeAnnotation();
                        var r = new RecordField(nm, tp, keys, desc)
                        desc = ""
                        if (/_/.test(lbl)) lbl = null;
                        if (lbl) {
                            r.setStableName(lbl)
                        } else if (this.getStableName()) {
                            // try to pick deterministic names; we used to have bugs here and there are scripts floating
                            // around with id on the record but not on all the fields
                            r.setStableName(this.getStableName() + encode(r.getName()))
                            if (usedNames[r.getStableName()]) r.setStableName(r.getStableName() + Object.keys(usedNames).length)
                            usedNames[r.getStableName()] = true
                        }
                        lst.push(r);
                    });
                }

                if (p.gotKey("tableGuid")) p.shift();
                else if (p.gotKey("type")) {
                    var tp = RecordDef.recordTypeFromString(p.parseString());
                    if (tp)
                        this.recordType = tp;
                } else if (p.gotKey("cloudenabled")) {
                    this.cloudEnabled = p.parseBool();
                } else if (p.gotKey("cloudpartiallyenabled")) {
                    this.cloudPartiallyEnabled = p.parseBool();
                } else if (p.gotKey("persistent")) {
                    this.persistent = p.parseBool();
                } else if (p.gotKey("exported")) {
                    this._isExported = p.parseBool();
                } else if (p.got(TokenType.Comment)) {
                    this.description += p.shift().data + "\n";
                } else if (p.gotId("keys")) {
                    parseFields(this.keys, true);
                } else if (p.gotId("fields")) {
                    parseFields(this.values, false);
                }
            });

            // try to pick deterministic names; for legacy broken scripts
            if (this.persistent && !this.getStableName())
                this.setStableName("B" + encode(this.getName()))
            if (this.cloudEnabled)
                this.persistent = true;
            if (this.cloudPartiallyEnabled) {
                this.persistent = true;
                this.cloudEnabled = true;
            }

            this.fixupFields();
        }

        static recordPersistenceToString(v:RecordPersistence, service:boolean):string
        {
            switch (v) {
            case RecordPersistence.Temporary: return "temporary";
            case RecordPersistence.Local: return service ? "server-local" : "local";
            case RecordPersistence.Cloud: return service ? "fully replicated" :"replicated";
            case RecordPersistence.Partial: return "partially replicated";
            default: Util.die();
            }
        }

        static recordTypeToString(v:RecordType):string
        {
            switch (v) {
            case RecordType.Object: return "Object";
            case RecordType.Table:  return "Table";
            case RecordType.Index:  return "Index";
            case RecordType.Decorator: return "Decorator";
            default: Util.die();
            }
        }

        static recordTypeFromString(s:string):RecordType
        {
            var v = RecordType[s];
            if (v === undefined) return undefined;
            if (RecordDef.recordTypeToString(v) != s) return undefined;
            return v;
        }

        canBeOffloaded(): boolean { return true; }


        static GetIcon(rt: AST.RecordType):string
        {
            switch (rt) {
                case AST.RecordType.Object:
                    return "svg:PageCurl,white";
                case AST.RecordType.Table:
                    return "svg:ThreeColumn,white";
                case AST.RecordType.Decorator:
                    return "svg:Clover,white";
                case AST.RecordType.Index:
                    return "svg:BulletList,white";
                default: Util.die();
            }
        }

        static colorByPersistence(icon: string, pers: AST.RecordPersistence): string {
            if (!Script.isCloud) {
                if (pers === RecordPersistence.Cloud)
                    return icon.replace(/,white$/, ",cyan");
                else if (pers === RecordPersistence.Local)
                    return icon.replace(/,white$/, ",gold");
                else
                    return icon;
            }
            else {
            if (pers === RecordPersistence.Cloud)
                return icon.replace(/,white$/, ",cyan");
            else if (pers === RecordPersistence.Partial)
                return icon.replace(/,white$/, ",powderblue");
            else if (pers === RecordPersistence.Local)
                return icon.replace(/,white$/, ",gold");
            else
                return icon;
            }
        }

    }


}
