///<reference path='refs.ts'/>

module TDev {
    export var PrevScript:string = undefined;
    export var Script:AST.App;

    export function setGlobalScript(s:AST.App) {
        //Util.log(">>>> setGlobalScript("+s+")");
        Script = s;
    }

    export class CoreApi
    {
        public Number:Kind;
        public String:Kind;
        public Boolean:Kind;
        public Event: Kind;
        public EventBinding: Kind;
        public Action: Kind;
        public Color:Kind;
        public Unknown:Kind;
        public Nothing: Kind;
        public Picture: Kind;
        public Sound: Kind;
        public JsonObject: Kind;
        public Task:ParametricKind;
        public Collection:ParametricKind;
        public Ref:ParametricKind;
        public App:Kind;
        public Box: Kind;
        public Dom: Kind;
        public CloudData: Kind;
        public Editor: Kind;
        public TupleProp:IProperty;
        public AssignmentProp:IProperty;
        public EqualsProp:IProperty;
        public AsyncProp:IProperty;
        public FunProp:IProperty;
        public StringConcatProp:IProperty;
        public PlaceholderThing:AST.SingletonDef;
        public AndProp:Property;
        public OrProp:Property;
        public NotProp:Property;

        public refPropPrefix = "\u25C8";

        public currentPlatform : PlatformCapability = PlatformCapability.None;
        public currentPlatformImpl: ImplementationStatus = ImplementationStatus.Web;

        private stmtUsageData:{ [s:string]: TokenUsage } = {};

        public stmtUsage(id:string):TokenUsage
        {
            if (!this.stmtUsageData.hasOwnProperty(id))
                this.stmtUsageData[id] = new TokenUsage(this);
            return this.stmtUsageData[id];
        }

        public allStmtUsage():TokenUsage[]
        {
            return Object.keys(this.stmtUsageData).map(k => this.stmtUsageData[k])
        }

        constructor(api:Api)
        {
            this.Number = api.getKind("Number");
            this.String = api.getKind("String");
            this.Boolean = api.getKind("Boolean");
            this.Color = api.getKind("Color");
            this.Event = api.getKind("Event");
            this.EventBinding = api.getKind("Event Binding");
            this.Action = api.getKind("Action");
            this.Unknown = api.getKind("Unknown");
            this.Nothing = api.getKind("Nothing");
            this.App = api.getKind("App");
            this.Box = api.getKind("Box");
            this.Dom = api.getKind("Dom");
            this.CloudData = api.getKind("Cloud Data");
            this.Picture = api.getKind("Picture")
            this.Sound = api.getKind("Sound")
            this.Editor = api.getKind("Editor")
            this.JsonObject = api.getKind("Json Object");
            this.Task = <ParametricKind> api.getKind("Task");
            this.Collection = <ParametricKind> api.getKind("Collection");
            this.Ref = <ParametricKind> api.getKind("Ref");
            this.TupleProp = this.Unknown.getProperty(",");
            this.AssignmentProp = this.Unknown.getProperty(":=");
            this.EqualsProp = this.Number.getProperty("=");
            this.AsyncProp = this.Unknown.getProperty("async");
            this.FunProp = this.Unknown.getProperty("fun");
            this.AndProp = <Property>this.Boolean.getProperty("and");
            this.OrProp = <Property>this.Boolean.getProperty("or");
            this.NotProp = <Property>this.Boolean.getProperty("not");
            this.StringConcatProp = <Property>this.String.getProperty("\u2225");
        }
    }

    export class Api
    {
        private _kinds:any = {};
        private _singletons:any = {};
        private _singletonList:AST.SingletonDef[] = [];
        private _kindList:Kind[] = [];
        public core:CoreApi;
        public operatorKeys:any = {};
        public eventMgr:AST.EventMgr;
        public restoreFlags = false; // for genStub
        public addHelpTopics:any = () => {}

        public rt_start = "";
        public rt_stop = "";

        public getKind(name:string) : Kind
        {
            return this._kinds[name];
        }

        public getThing(name:string) : AST.SingletonDef
        {
            return this._singletons[name];
        }

        public getKinds() : Kind[] { return this._kindList; }

        public cleanup()
        {
            this.getKinds().forEach(k => {
                if (k instanceof ParametricKind) {
                    (<ParametricKind>k).cleanup()
                }
            })
        }

        public getSingletons() : AST.SingletonDef[] { return this._singletonList; }

        static runtimeName(s:string)
        {
            switch (s) {
            case "": return "x";

            case "Number":
            case "String":
            case "Boolean":
            case "Location":
            case "Math":
            case "Event":
            case "arguments":
            case "break":
            case "case":
            case "catch":
            case "continue":
            case "debugger":
            case "default":
            case "delete":
            case "do":
            case "else":
            case "finally":
            case "for":
            case "function":
            case "if":
            case "in":
            case "instanceof":
            case "new":
            case "return":
            case "switch":
            case "this":
            case "throw":
            case "try":
            case "typeof":
            case "var":
            case "void":
            case "while":
            case "with":
                return s + "_";

            default: return s.replace(/ (?=[A-Z])/g, "").replace(/[ -]/g, "_");
            }
        }

        private mkSpecialProp(name:string, prio:number)
        {
            var mkParam = (name:string) => { return { name: name, kind: "Unknown" }; }
            return {
                name: name,
                help: "",
                flags: "",
                infixPriority: prio,
                result: mkParam("result"),
                inParameters: [mkParam("left"), mkParam("right")] };
        }

        public md_addKind(k:Kind)
        {
            this._kindList.push(k);
            this._kinds[k.getName()] = k;
        }

        public initFrom()
        {
            new ThingSetKind("code", lf("Lists actions defined in the current script"), () => !TDev.Script ? [] : TDev.Script.actions(), "\u25b7");
            new ThingSetKind("data", lf("Lists global variables defined in the current script"), () => !TDev.Script ? [] : TDev.Script.variables(), "\u25f3");
            new ThingSetKind("art", lf("Lists pictures, sounds, etc. defined in the current script"), () => !TDev.Script ? [] : TDev.Script.resources(), "\u273f");
            new ThingSetKind(AST.libSymbol, lf("Lists libraries referenced by the current script"), () => !TDev.Script ? [] : TDev.Script.libraries(), AST.libSymbol);
            new ThingSetKind("records", lf("Lists objects, tables and indexes defined in the current script"), () => !TDev.Script ? [] : TDev.Script.records(), AST.recordSymbol);

            (<any>TDev).md_initApis();

            var invl = Kind.md_make(0, "Unknown", "an unknown value");
            function specProp(name:string, prio:number) {
                var mkp = (n:string) => PropertyParameter.md_make(n, invl);
                var p = Property.md_make(1, invl, name, "", prio == 98 || prio == 2.5 ? [mkp("arg")] : [mkp("left"), mkp("right")], invl)
                p._infixPriority = prio;
            }
            specProp(":=", 1);
            specProp(",", 2);
            specProp("async", 98);
            specProp("fun", 2.5);
            invl.isData = true;

            this.core = new CoreApi(this);
            this._kindList.forEach((k:Kind) => { k.initProperties(); });

            this.initSingletons();
            this.initSpecialApply();
            this.eventMgr = new AST.EventMgr();
            this.eventMgr.init();

            this.getKinds().forEach(k => {
                if (k instanceof ParametricKind) {
                    (<ParametricKind>k).markInitial()
                }
            })
        }

        private initSpecialApply()
        {
            this.core.Number.isBuiltin = true;
            this.core.String.isBuiltin = true;
            this.core.Boolean.isBuiltin = true;

            this.core.Unknown.isError = () => true;
            this.core.Nothing._contexts = 0;

            var rt = (<any> TDev).RT;
            if (!rt) return;

            var missingProps = []
            this._kindList.forEach((k:Kind) => {
                var hasProp = (p:string, o:any) => o != undefined && p in o;
                var n = k.runtimeName();
                if (rt.hasOwnProperty(n)) {
                    var c = rt[n];
                    if ("rt_start" in c) {
                        this.rt_start += "lib." + n + ".rt_start(rt);\n";
                    }
                    if ("rt_stop" in c) {
                        this.rt_stop += "lib." + n + ".rt_stop(rt);\n";
                    }
                    if ("picker" in c) {
                        k.picker = "lib." + n + ".picker()";
                    }
                    if (hasProp("get_enumerator", c.prototype)) k._hasEnumerator = true;
                }
            });

            RT.RTValue.initApis()
            missingProps.forEach((f) => f())
        }

        private initSingletons()
        {
            this._kindList.forEach((k:Kind) => {
                k.initSingleton();
                if (!!k.singleton) {
                    this._singletons[k.singleton.getName()] = k.singleton;
                    this._singletonList.push(k.singleton);
                }
            });
            var maxUsage = this._kindList.map((k:Kind) => !k.singleton ? 0 : k.usage_count).max() + 1;
            this._kindList.forEach((k:Kind) => {
                if (k.usage_count < 0) k.usage_count = maxUsage;
                if (!!k.singleton) {
                    k.singleton.usage.apiFreq = k.usage_count / maxUsage;
                }
            });
            this.core.PlaceholderThing = AST.mkSingletonDef("$skip", this.core.Unknown);
            this._singletons[this.core.PlaceholderThing.getName()] = this.core.PlaceholderThing;
            //this.core.App.singleton._isBrowsable = false;
            this.core.PlaceholderThing._isBrowsable = false;
        }


        public asyncReport()
        {
            var byReason:StringMap<string> = {}
            this.getKinds().forEach(k => {
                if (k instanceof ThingSetKind) return;
                k.listProperties().forEach(p => {
                    var pp = <Property>p
                    if (!pp.asyncReason) return
                    var r = pp.asyncReason()
                    if (!r) return
                    if (!byReason.hasOwnProperty(r))
                        byReason[r] = "\n*** " + r + "\n"
                    byReason[r] += "      " + p.parentKind.toString() + "->" + p.getName() + "\n"
                })
            })
            console.log(Object.keys(byReason).map(k => byReason[k]).join(""))
        }
    }

    export var api = new Api();

    export class ApiNode
    {
        constructor(public _name:string) {
        }
        public getName() { return this._name; }
        public toString() { return this.getName(); }
    }

    export enum KindContext {
        None            = 0x0000,

        Parameter       = 0x0001,    // is also local and out parameter
        GlobalVar       = 0x0002,    // can be used as Temporary global variable or field of a Temprorary object
        CloudField      = 0x0004,    // can appear as a field in a cloud/local table/index

        IndexKey        = 0x0010,    // can appear as key in any index,
        GcKey           = 0x0020,    // can appear as a decorator target
        RowKey          = 0x0040,    // can appear as a row key in a local or cloud index, or as a link in a table

        WallTap         = 0x0100,
        Enumerable      = 0x0200,    // provides enumeration
        Json            = 0x0400,    // support json export/import

        General         = KindContext.Parameter | KindContext.GlobalVar,

        //ParametricPropagateMask = KindContext.Json |

        ArtResource     = 0x04000000,    // additional, not in WP
    }


    // keep in sync with PlatformCapability.cs
    export enum PlatformCapability
    {
        None = 0, // applies mapping for service capability
        Accelerometer =         0x00000001,
        Calendar =              0x00000002,
        Camera =                0x00000004,
        Compass =               0x00000008,
        Gyroscope =             0x00000010,
        Home =                  0x00000020,
        Location =              0x00000040,
        Maps =                  0x00000080,
        Media =                 0x00000100,
        Microphone =            0x00000200,
        Motion =                0x00000400,
        Contacts =              0x00000800,
        Phone =                 0x00001000,
        Radio =                 0x00002000,
        Orientation =           0x00004000,
        Search =                0x00008000,
        Translation =           0x00010000,
        // webonly
        EditorOnly =            0x00040000,
        MusicAndSounds =        0x00080000,
        Network =               0x00100000,
        Hawaii =                0x00200000,
        Tiles =                 0x00400000,
        Proximity =             0x00800000,
        Speech =                0x01000000,
        CloudData =             0x02000000,
        Bluetooth =             0x04000000,
        CloudServices =         0x08000000,

        // Current
        Npm =                   0x20000000,
        Cordova =               0x40000000,
        Shell =                 0x80000000,

        Current =               0x10000000, // equivalent to capabilities of current device, for editor settings

        AnyWeb =
           Location
           | Maps
           | Search
           | Translation
           | EditorOnly
           | MusicAndSounds
           | Network
           | Hawaii
           | CloudData
           | CloudServices
           ,

        WindowsPhone =
            Accelerometer
            | Calendar
            | CloudServices
            | Compass
            | Contacts
            | Gyroscope
            | Location
            | Maps
            | Media
            | Microphone
            | Motion
            | Phone
            | Radio
            | Orientation
            | Search
            | Translation
            | Tiles
            | MusicAndSounds
            | Network
            | Hawaii
            ,

        iOS =
            Accelerometer
            | CloudServices
            | Compass
            | Gyroscope
            | Location
            | Maps
            | Orientation
            | Search
            | Translation
            | MusicAndSounds
            | Network
            ,

        Android =
            Accelerometer
            | Camera
            | CloudServices
            | Compass
            | Gyroscope
            | Location
            | Maps
            | Microphone
            | Orientation
            | Search
            | Speech
            | Translation
            | MusicAndSounds
            | Network
            ,

        AppStudio =
            Accelerometer
            | MusicAndSounds
            ,

        AzureWebSite =
            Npm
            | Network
            | Shell,

        CordovaApp =
            Accelerometer
            | Compass
            | Gyroscope
            | Location
            | Orientation
            | MusicAndSounds
            | Network
            | Phone
            | Cordova,

        AnyClient =
           CloudServices
           | Location
           | Maps
           | Search
           | Translation
           ,

        All = ((-1)|0) & ~Current,
    }

    export module PlatformCapabilityManager {
        var _cap: PlatformCapability;
        // dynamically computes the current platform capabilities (mostly useful for the web)
        export function current(): PlatformCapability {
            if (!_cap) {
                _cap = PlatformCapability.AnyWeb;
                if (TDev.RT.DeviceOrientation.isHeadingSupported()) _cap |= PlatformCapability.Compass;
                if (TDev.RT.DeviceOrientation.isOrientationSupported()) _cap |= PlatformCapability.Orientation;
                if (TDev.RT.DeviceMotion.isSupported()) _cap |= PlatformCapability.Accelerometer;
                if (TDev.RT.DeviceMotion.isGyroscopeSupported()) _cap |= PlatformCapability.Gyroscope;
                if (TDev.RT.UserMediaManager.isSupported()) _cap |= PlatformCapability.Camera;
                if (TDev.RT.Languages.isSpeechSupported()) _cap |= PlatformCapability.Speech;
                if (TDev.RT.AudioContextManager.isMicrophoneSupported()) _cap |= PlatformCapability.Microphone;
                if (Browser.isWP8app) _cap |= PlatformCapability.Phone;
                if (Browser.isNodeJS) _cap |= PlatformCapability.Npm;
                if (Browser.localProxy) _cap |= PlatformCapability.Shell;
                if ((<any>TDev.RT).Wab)
                    _cap |= AST.App.fromCapabilityList((<any>TDev.RT).Wab.getSupportedCapabilities());
            }
            return _cap;
        }
    }

    export enum ImplementationStatus
    {
        None                = 0x00000000,

        Pauses              = 0x00000001,
        UsesStackFrame      = 0x00000002,

        Web                 = 0x00000010,
        Wab                 = 0x00000040,
        WebAll              = ImplementationStatus.Web | ImplementationStatus.Wab
    }


    export class Kind
        extends ApiNode
    {
        public isPrivate:boolean;
        public isObsolete: boolean;
        public isDbgOnly:boolean;
        public isBetaOnly:boolean;
        public isAction:boolean;
        public isSerializable:boolean;
        public generalCapabilities:PlatformCapability = PlatformCapability.None;
        public generalFlags = PropertyFlags.None;
        public _isImmutable = false;

        public minSkill = 0; 
        public _stemName:string;
        public isData:boolean;
        public isBuiltin:boolean;
        public _contexts:KindContext = KindContext.None;

        static currentId = 0;
        public _id:number;

        public getStemName() { return this._stemName || this.getName().toLowerCase(); }
        public getRoot():Kind { return this }
        public kill() { Util.abstract() }
        public getParameterCount() { return 0 }
        public getParameter(idx:number):Kind { return undefined }

        constructor(name:string, public _help:string) {
            super(name)
            this._id = ++Kind.currentId;
        }

        public runtimeName()
        {
            return Api.runtimeName(this.getName())
        }

        public matches(other:AST.AstNode)
        {
            if (other instanceof AST.RecordDef)
                return this.equals((<AST.RecordDef>other).entryKind)
        }

        public equals(other:Kind)
        {
            return this == other;
        }

        public helpTopic()
        {
            return Util.tagify(this._name);
        }

        public isUserDefined() { return false }
        public isExtensionEnabled() { return false }
        public isImmutable() { return this._isImmutable }

        // 1 block, 2 coder, 3 pro
        public md_skill(sk: number) { this.minSkill = sk; }
        public md_stem(n: string) { this._stemName = n; }
        public md_obsolete() { this.isObsolete = true; }
        public md_isData() { this.isData = true; }
        public md_private() { this.isPrivate = true; }
        public md_builtin() { this.isBuiltin = true; this.isSerializable = true; }
        public md_walltap() { this._contexts |= KindContext.General|KindContext.WallTap; }
        public md_enumerable() { this._contexts |= KindContext.General|KindContext.Enumerable; }
        public md_icon(name:string) { this._icon = "svg:" + name + ",white"; }
        public md_dbgOnly() { this.isDbgOnly = true; if (!dbg) this.isPrivate = true }
        public md_betaOnly() { this.isBetaOnly = true; if (!isBeta) this.isPrivate = true }
        public md_serializable() { this.isSerializable = true; }

        public md_robust() { this.generalFlags |= PropertyFlags.Robust }
        public md_idempotent() { this.generalFlags |= PropertyFlags.Idempotent }

        private md_oops(msg:string)
        {
            throw new Error(msg + " at " + this.getName())
        }

        public md_cap(...caps:string[]) {
            this.generalCapabilities |= Property.getPlatform(caps, (s) => this.md_oops(s));
        }

        public md_immutable() { this._isImmutable = true }

        public md_ctx(...ctxs:string[])
        {
            for (var i = 0; i < ctxs.length; ++i)
                switch (ctxs[i]) {
                    case "none": this._contexts = KindContext.None; break;
                    case "general": this._contexts |= KindContext.General; break;
                    //case "local": this._contexts |= KindContext.Parameter; break;
                    //case "global": this._contexts |= KindContext.GlobalVar; break;
                    //case "field": this._contexts |= KindContext.LocalField; break;
                    case "indexkey": this._contexts |= KindContext.IndexKey; break;
                    case "gckey": this._contexts |= KindContext.GcKey; break;
                    //This should not be set for any built in type.
                    //case "rowkey": this._contexts |= KindContext.RowKey; break;
                    case "json": this._contexts |= KindContext.Json; break;
                    case "walltap": this._contexts |= KindContext.WallTap; break;
                    case "enumerable": this._contexts |= KindContext.Enumerable; break;
                    case "cloudfield": this._contexts |= KindContext.CloudField; break;
                    default:
                        this.md_oops("unknown context " + ctxs[i]);
                }
        }

        static md_make(usage_count:number, name:string, help:string, kindClass = null)
        {
            var k:Kind;

            if (kindClass == "action") {
                k = new ActionKind(name, help);
            } else if (kindClass == "parametric") {
                k = new ParametricKind(name, help);
                k._contexts = KindContext.General;
            } else {
                k = new Kind(name, help);
                k._contexts = KindContext.General;
            }
            k.usage_count = usage_count;
            api.md_addKind(k);
            return k;
        }

        public initProperties()
        {
            var maxUsage = this._propList.map((p:Property) => p._usage_count).max() + 1;
            this._propList.forEach((p:Property) => {
                p.getUsage().apiFreq = p._usage_count / maxUsage;
            });
        }

        public getContexts() { return this._contexts; }
        public hasContext(k:KindContext) {
            return !k || !!(this.getContexts() & k);
        }
        public usage_count:number;
        //public elementKind:Kind;
        public _hasEnumerator = false;
        public hasEnumerator() { return this._hasEnumerator }
        public isError() { return false; }
        public listPriority() { return this.isBuiltin ? 10 : 0; }
        public picker:string;

        public getRecord() { return null; }

        static defaultValueDescription(k:Kind)
        {
            switch (k.getName()) {
            case "Number": return "0";
            case "String": return "\"\"";
            case "Boolean": return "false";
            case "DateTime": return "01/01/0000 00:00:00";
            default: return "the invalid value";
            }
        }

        private _propByName:any = {};
        private _propList:Property[] = [];
        public singleton:AST.SingletonDef;

        public icon(): string { return this._icon; }
        private _icon = "";

        public getHelp(account = true):string { return lf_static(this._help, account); }
        public shortName():string { return null; }

        public md_addProperty(p:Property)
        {
            this._propList.push(p);
            this._propByName[p.getName()] = p;
            p._addFlags(this.generalFlags);
            // p.getUsage().apiFreq = p._usage_count / maxUsage;
        }

        public initSingleton()
        {
            if (!this.isData) {
                this._contexts = KindContext.None;
                this.singleton = AST.mkSingletonDef(this.getName().toLowerCase(), this);
            }
        }

        public getProperty(name:string) : IProperty
        {
            return this._propByName.hasOwnProperty(name) ? this._propByName[name] : null;
        }

        public listProperties() : IProperty[]
        {
            return this._propList;
        }

        public toString() : string
        {
            return this.getName();
        }

        public isEnumerable() {
           //return !!this.elementKind || (!!this.getProperty("at") && !!this.getProperty("count"));
           return this.hasContext(KindContext.Enumerable);
        }

        public getDescription() { return this.getHelp(); }

        private toJson() { return this.getName(); }

        public getPropPrefix() : string
        {
            var par = this.toString();
            if (this.isData) par = "(" + par + ")";
            else par = par.toLowerCase();
            return par;
        }

        public serialize()
        {
            var tw = AST.TokenWriter.forStorage();
            tw.kind(null, this)
            return tw.finalize(true)
        }

        public parentLibrary():AST.LibraryRef { return null }
    }

    export class UnresolvedKind
        extends Kind
    {
        constructor(name:string)
        {
            super(name, "a type yet unknown")
        }

        public isUserDefined() { return true }
        public isError() { return true }
    }

    export class KindVariable
        extends Kind
    {
        constructor(name:string, public parent:ParametricKind)
        {
            super(name, "a type parameter")
        }
    }

    export class ParametricKind
        extends Kind
    {
        public parameters:Kind[];
        public root:ParametricKind;
        private generated:ParametricKind[];
        private generatedInitialSize = 0;
        private propsInstantiated:boolean;
        private parameterPrefixes:string[];

        constructor(name:string, help:string) {
            super(name, help)
            this.root = this;
            this.propsInstantiated = true;
            this.generated = [];
        }

        public matches(other:AST.AstNode)
        {
            return super.matches(other) || this.parameters.some(p => p.matches(other))
        }

        public cleanup()
        {
            if (this.generated) {
                if (this.generatedInitialSize == 0)
                    this.generated = []
                else
                    this.generated.splice(this.generatedInitialSize, this.generated.length);
            }
        }

        public markInitial()
        {
            if (!this.parameterPrefixes)
                this.parameterPrefixes = this.parameters.map(_ => "of")
            this.generatedInitialSize = this.generated.length;
        }

        public subst(k:Kind):Kind
        {
            if (k instanceof KindVariable) {
                var idx = this.root.parameters.indexOf(k);
                if (idx >= 0) return this.parameters[idx];
                else return k;
            }

            if (k instanceof ParametricKind) {
                var pk = <ParametricKind>k
                var newArgs = pk.parameters.map(x => this.subst(x))
                for (var i = 0; i < newArgs.length; ++i)
                    if (newArgs[i] != pk.parameters[i])
                        break;
                if (i < newArgs.length)
                    return pk.createInstance(newArgs);
            }

            return k;
        }

        public hasEnumerator():boolean { return this.root == this ? super.hasEnumerator() : this.root.hasEnumerator() }
        public getRoot():Kind { return this.root }
        public getParameterCount() { return this.parameters.length }

        public getSignature()
        {
            return this.root == this ? this.root.parameterPrefixes.map(p => " " + p + " ...").join("") : "";
        }

        public getName()
        {
            if (this == this.root) return this._name;

            var res = this._name
            for (var i = 0; i < this.parameters.length; ++i) {
                res += " " + this.root.parameterPrefixes[i] + " " + this.parameters[i].getName()
            }
            return res
        }

        public createInstance(args:Kind[])
        {
            if (this.parameters.length == 0) return this.root;
            if (this.root != this) return this.root.createInstance(args);

            var r = this.generated.filter((g) => {
                for (var i = 0; i < args.length; ++i)
                    if (!g.parameters[i].equals(args[i])) return false;
                return true;
            })[0]

            if (r) return r;

            r = Util.clone(this);
            (<any>r)._propList = [];
            (<any>r)._propByName = {};
            r.propsInstantiated = false;

            r.parameters = args;
            this.generated.push(r);
            return r
        }

        public listProperties()
        {
            this.instantiateProps()
            return super.listProperties()
        }

        public getProperty(n:string)
        {
            this.instantiateProps()
            return super.getProperty(n)
        }

        private instantiateProps()
        {
            if (this.propsInstantiated) return
            this.propsInstantiated = true

            this.root.listProperties().forEach((p:Property) => {
                if (p.availableOnlyOn && p.availableOnlyOn.indexOf(this.parameters[0]) < 0)
                    return;
                this.md_addProperty(p.substFor(this))
            })
        }

        public getParameter(idx:number)
        {
            return this.parameters[idx];
        }

        public getParameterPrefix(idx:number)
        {
            return this.root.parameterPrefixes[idx];
        }

        public md_parametric(...argNames:string[])
        {
            this.parameters = argNames.map(n => new KindVariable(n, this))
        }

        public md_parameterPrefixes(...argNames:string[])
        {
            this.parameterPrefixes = argNames
        }

        public listPriority() { return this.root.getName() == "Collection" ? 5 : 0; }

        public isError() { return this.parameters.some(p => p != api.core.Nothing && (!p.hasContext(KindContext.Parameter) || p.isError())) }

        public getContexts()
        {
            var ctx = super.getContexts();
            if ((ctx & KindContext.Json) && this.parameters.some(p => !p.hasContext(KindContext.Json)))
                ctx = ctx & ~KindContext.Json;
            return ctx;
        }
    }

    export class ActionKind
        extends ParametricKind
    {
        private _isAtomic:boolean;

        constructor(name:string, help:string) {
            super(name, help)
            this.parameters = [];
            this.isAction = true;
            this._isAtomic = false;
        }

        public md_isAction() { }
        public md_isAtomic() { this._isAtomic = true; }
        public isImmutable() { return true }

        public icon()
        {
            return "svg:Bolt,white";
        }

        public getInParameters():PropertyParameter[]
        {
            return this.getProperty("run").getParameters().slice(1);
        }

        public getOutParameters():PropertyParameter[]
        {
            var app = this.getProperty("run");
            if (app.getResult().getKind() == api.core.Nothing)
                return [];
            return [app.getResult()];
        }

        public getSignature()
        {
            var s = this.getInParameters().map((p:PropertyParameter) => p.getName() + ":" + p.getKind()).join(", ");
            var outParm = this.getOutParameters()[0]
            var resKind = outParm ? outParm.getKind() : null;
            if (!resKind || resKind == api.core.Nothing) {
                return "(" + s + ")";
            } else {
                if (s != "")
                    return "(" + s + ") : " + resKind.toString();
                else
                    return "() : " + resKind.toString();
            }
        }

        public isAtomic() { return this._isAtomic; }

        public initProperties()
        {
            super.initProperties()

            var prop = <Property>this.getProperty("run")
            prop.md_resumes();
            if (!this.isAtomic())
                prop.md_async();
        }
    }

    export class UserActionKind
        extends ActionKind
    {
        constructor(public userAction:AST.Action)
        {
            super(userAction.getName(), userAction.getDescription())
            this._contexts = KindContext.General;
            this.isData = true;
            this.md_addProperty(new UserActionRunProperty(this))

            var invl = Property.md_make(0, this, "is invalid", "Returns true if the current instance is useless", [], api.core.Boolean)
            invl.md_runOnInvalid();
            this.md_addProperty(invl);
        }

        public isAtomic()
        {
            return this.userAction.isAtomic;
        }

        public getOutParameters():PropertyParameter[]
        {
            return this.userAction.getOutParameters().map(p => this.userAction.mkPP(p.getName(), p.getKind()));
        }

        public getName():string
        {
            return this.userAction.getName()
        }

        public isUserDefined() { return true }

        private deleted:boolean;

        public kill()
        {
            this.deleted = true;
        }

        public isError()
        {
            return super.isError() || this.deleted || this.userAction.deleted;
        }

        public parentLibrary()
        {
            return this.userAction.parentLibrary()
        }

        public listPriority() { return 4; }
    }

    export class ThingSetKind
        extends Kind
    {
            // TSBUG: replace any with IProperty[]
        constructor(name:string, help:string, public getProps:()=>any, public _theShortName:string) {
            super(name, help)
            this.usage_count = -1;
            api.md_addKind(this);
        }
        public listProperties() : IProperty[]
            { return this.getProps().map(Property.withParent(this)); }

        public getHelp():string { return this._help; }
        public shortName() { return this._theShortName; }

        public getProperty(name:string) : IProperty
        {
            var a = this.getProps().filter((a:IProperty) => a.getName() == name);
            if (!a[0])
                return undefined;
            return Property.withParent(this)(a[0]);
        }

        public initSingleton()
        {
            super.initSingleton();
            this.singleton.usageMult = () => {
                if (this.getProps().length > 0) return 1; else return 1e-10;
            };
        }
    }

    export interface MultiplexTypeArg
    {
        ofKind:Kind;
        idx:number;
        prefix:string;
    }

    export class MultiplexKind
        extends Kind
    {
        constructor(public args:MultiplexTypeArg[])
        {
            super("Unfinished Type", "not fully specified generic API")
        }

        public parentProp:Property;

        private getKinds() { return Script.getKinds().filter(k => k.isData) } // && (k.isUserDefined() || !/ Collection/.test(k.getName()))

        static argsFor(k:Kind):MultiplexTypeArg[]
        {
            if (!(k instanceof ParametricKind)) return []
            //var pk = <ParametricKind>k
            return Util.range(0, k.getParameterCount()).map(i => { return {
                ofKind: k,
                idx: i,
                prefix: i == 0 ? "" : (<ParametricKind>k).getParameterPrefix(i) + " "
            } })
        }

        public createFinal(k:Kind):Property
        {
            var args = [k]
            var p = this.parentProp
            while (!(p instanceof MultiplexRootProperty)) {
                var mp = <MultiplexProperty>p
                args.push(mp.forKind)
                p = (<MultiplexKind>mp.parentKind).parentProp
            }
            args.reverse()
            var idx = 0
            // TODO don't return null
            var parseType:()=>Kind = () => {
                var a = args[idx++]
                if (a instanceof ParametricKind) {
                    var pk = <ParametricKind>a
                    if (pk.getRoot() != pk) return pk;
                    return pk.createInstance(Util.range(0, pk.getParameterCount()).map(_ => parseType()))
                } else return a
            }
            var rp = (<MultiplexRootProperty>p)
            var res = rp.instanceFor(this, k, (<MultiplexKind>rp.getResult().getKind()).args.map(_ => parseType()))
            res.getParameters()[0]._kind = this;
            return res
        }

        static propName(k:Kind)
        {
            var n = ""
            if (k.parentLibrary() && !k.parentLibrary().isThis())
                n += AST.libSymbol + k.parentLibrary().getName() + "\u200A\u2192\u00A0" + k.getName()
            else if (k.isUserDefined())
                n += AST.recordSymbol + k.getName()
            else
                n += k.getRoot().getName()
            // We also need the suffix (e.g. the "of" in "Collection of").
            if (k.getParameterCount() > 0)
                n += " " + (<ParametricKind>k).getParameterPrefix(0)
            return n
        }

        public getNameFor(k:Kind)
        {
            return this.args[0].prefix + MultiplexKind.propName(k)
        }

        private mkProp(args1:MultiplexTypeArg[], k:Kind)
        {
            var argsN = args1
            if (k.getParameterCount() > 0)
                argsN = MultiplexKind.argsFor(k).concat(argsN)

            if (argsN.length == 0)
                return this.createFinal(k)

            return new MultiplexProperty(k, this, new MultiplexKind(argsN))
        }

        public getProperty(name:string):IProperty
        {
            var k = this.getKinds().filter(k => this.getNameFor(k) == name)[0]
            if (k) return this.mkProp(this.args.slice(1), k)
        }

        public listProperties() : IProperty[]
        {
            var args1 = this.args.slice(1)
            return this.getKinds().map(k => this.mkProp(args1, k))
        }
    }

    export enum PropertyCategory
    {
        Builtin,
        Action,
        Data,
        Library,
        Record
    }

    export enum PropertyFlags
    {
        None = 0x0000,
        RunOnInvalidArguments = 0x0001,
        IsObsolete = 0x0002,
        IsHidden = 0x0004,
        IsPrivate = 0x0008,
        NeedsTracing = 0x0010,
        NeedsTracing2 = 0x0020,
        NeedsTimestamping = 0x0040,
        NeedsTimestamping2 = 0x0080,
        HasPauseContinue = 0x0100,
        HasPauseContinue2 = 0x0200,
        IsDebugOnly = 0x0400,
        Preserves = 0x0800,
        Async = 0x1000,
        IsBetaOnly = 0x2000,
        Robust = 0x4000,
        Idempotent = 0x8000,
        NoCanvas = 0x10000,
        HideIntelliButton = 0x20000,
        IgnoreReturnValue = 0x40000,
        DocsOnly = 0x80000,

        NonBrowsable = PropertyFlags.IsObsolete | PropertyFlags.IsHidden | PropertyFlags.IsPrivate,
    }

    // keep in sync with ApiGenerator/Program.cs
    export enum ParameterFlags
    {
        None = 0x0000,
        WritesMutable = 0x0001,
        ReadsMutable = 0x0002,
    }

    export interface IImport {
        manager: string;
        name: string;
        version: string;
    }

    export interface IProperty
    {
        getName():string;
        getDescription(skip?:boolean):string;
        getSignature():string;
        getInfixPriority():number;
        getCategory():PropertyCategory;
        getParameters():PropertyParameter[];
        getResult():PropertyParameter;
        getFlags(): PropertyFlags;
        getImports(): IImport[];
        forwardsTo():AST.Decl;
        forwardsToStmt():AST.Stmt;
        parentKind:Kind;
        getCapability():PlatformCapability;
        getExplicitCapability():PlatformCapability;
        runtimeName():string;
        helpTopic():string;
        usageKey():string;
        isBeta():boolean;
        canRename(): boolean;
        deleted: boolean;


        // compilation
        shouldPauseInterperter():boolean;
        isImplemented():boolean;
        isImplementedAnywhere():boolean;
        getSpecialApply():string;
        isKey?:boolean;
        isField?: boolean;

        // tracing
        needsSpecialTracing(): boolean;
        needsTracing(): boolean;
        needsTimestamping(): boolean;
        hasPauseContinue(): boolean;

        // intellisense support
        isBrowsable():boolean;
        getUsage():TokenUsage;
        lastMatchScore:number;
        useFullName:boolean;
        canCacheSearch():boolean;
        getArrow():string;
        showIntelliButton():boolean;
    }

    export interface IPropertyWithCache
        extends IProperty
    {
        cacheShort:string;
        cacheLong:string;
    }

    export class Property
        extends ApiNode
        implements IProperty
    {
        private flags: PropertyFlags;
        private _runtimeName:string;
        public deleted: boolean;
        private _imports: IImport[];

        constructor(public parentKind:Kind, name:string, public _help:string, parms:PropertyParameter[], retType:Kind)
        {
            super(name);
            this.flags = 0;
            parms.unshift(PropertyParameter.md_make("this", parentKind))
            this._inParameters = parms;
            this._usage_count = 0;
            this._result = PropertyParameter.md_make("result", retType);
            this._platform = this.parentKind ? this.parentKind.generalCapabilities : PlatformCapability.None;
            this._usage = new TokenUsage(this);

            for (var i = 0; i < parms.length; ++i) parms[i].parentProperty = this;
            this._result.parentProperty = this;
        }

        public substFor(par:ParametricKind)
        {
            return this.substForInternal(par, null)
        }

        public substForInternal(par:ParametricKind, mk:(pp:PropertyParameter[], rk:Kind)=>Property)
        {
            var params = this._inParameters.slice(1).map(p => p.substFor(par))
            var rk = par.subst(this._result.getKind())
            var r = mk ? mk(params, rk) : new Property(par, this._name, this._help, params, rk);
            params.forEach(p => { p.parentProperty = r })
            r._inParameters[0]._flags = this._inParameters[0]._flags;
            r.flags = this.flags;
            r._runtimeName = this._runtimeName;
            r._infixPriority = this._infixPriority;
            r._specialApply = this._specialApply;
            r._implStatus = this._implStatus;
            return r;
        }

        static md_make(usage_count:number, parentKind:Kind, name:string, help:string, parms:PropertyParameter[], retType:Kind)
        {
            var p = new Property(parentKind, name, help, parms, retType);
            p._usage_count = usage_count;
            parentKind.md_addProperty(p);
            return p;
        }

        public runtimeName()
        {
           return this._runtimeName || Api.runtimeName(this.getName())
        }

        private topicCache:string;
        public helpTopic()
        {
            if (!this.topicCache)
                this.topicCache = Util.tagify(this.parentKind.helpTopic() + " " + (this._runtimeName || this.getName()));
            return this.topicCache;
        }

        public usageKey()
        {
            return this.helpTopic();
        }

        public canRename() { return false; }

        public _addFlags(f:PropertyFlags)
        {
            this.flags |= f;
        }

        public md_async() {
            if (this._implStatus & ImplementationStatus.Pauses) this.flags |= PropertyFlags.Async;
            else this.md_oops("async specified on method with no ResumeCtx")
        }

        private _asyncReason:string;

        // Give reason why something has ResumeCtx but not 'async' annotation

        // needs user to be authenticated
        public md_authAsync() { this._asyncReason = "auth"; }
        // displays UI (modal dialog, built-in phone dialog etc)
        public md_uiAsync() { this._asyncReason = "ui"; }
        // is usually really fast
        public md_quickAsync() { this._asyncReason = "quick"; }
        // related to Picture.loadFirst
        public md_picAsync() { this._asyncReason = "pic"; }
        // the first call may be slow but remaining ones are fast; type may provide pre-load method
        public md_cachedAsync() { this._asyncReason = "cached"; }

        // other reasons are:
        //    the real 'async' annotation
        //    'obsolete' annotation
        //    'stub' annotation

        public asyncReason()
        {
            if (!(this._implStatus & ImplementationStatus.Pauses))
                return null;
            if (this._asyncReason) return this._asyncReason;
            if (this.getFlags() & PropertyFlags.Async) return "async";
            if (this.getFlags() & PropertyFlags.IsObsolete) return "obsolete";
            if (!this.isImplemented()) return "unimplemented";
            return "todo";
        }

        public md_runOnInvalid() { this.flags |= PropertyFlags.RunOnInvalidArguments; }
        public md_obsolete() { this.flags |= PropertyFlags.IsObsolete|PropertyFlags.IsHidden; }
        public md_hidden() { this.flags |= PropertyFlags.IsHidden; }
        public md_private() { this.flags |= PropertyFlags.IsPrivate; }
        public md_ignoreReturnValue() { this.flags |= PropertyFlags.IgnoreReturnValue; }
        public md_dbgOnly() { this.flags |= PropertyFlags.IsDebugOnly; }
        public md_docsOnly() { this.flags |= PropertyFlags.DocsOnly; }
        public md_betaOnly() { this.flags |= PropertyFlags.IsBetaOnly; }
        public md_preserves() { this.flags |= PropertyFlags.Preserves; } // inverse of tempers
        public md_tandre2() { this.flags |= PropertyFlags.NeedsTracing2|PropertyFlags.NeedsTimestamping2|PropertyFlags.HasPauseContinue2; }
        public md_trace2() { this.flags |= PropertyFlags.NeedsTracing2; }
        public md_timestamp2() { this.flags |= PropertyFlags.NeedsTimestamping2; }
        public md_hasPauseContinue2() { this.flags |= PropertyFlags.HasPauseContinue2; }
        public md_tandre() { this.flags |= PropertyFlags.NeedsTracing|PropertyFlags.NeedsTimestamping; }
        public md_trace() { this.flags |= PropertyFlags.NeedsTracing; }
        public md_timestamp() { this.flags |= PropertyFlags.NeedsTimestamping; }
        public md_hasPauseContinue() { this.flags |= PropertyFlags.HasPauseContinue; }
        public md_robust() { this.flags |= PropertyFlags.Robust; }
        public md_nonRobust() { this.flags &= ~PropertyFlags.Robust; }
        public md_idempotent() { this.flags |= PropertyFlags.Idempotent; }
        public md_noCanvas() { this.flags |= PropertyFlags.NoCanvas; }
        public md_jsName(n:string) { this._runtimeName = n; }
        public md_infixPriority(n:number) {
            this._infixPriority = n;
            api.operatorKeys[this.getName()] = 1;
        }
        public md_inlineApply(n:string) { this._specialApply = n; }
        public md_flow(n: string) { }

        public md_writesMutable() { this._inParameters[0].md_writesMutable(); }
        public md_readsMutable() { this._inParameters[0].md_readsMutable(); }
        public md_allocates() { this.getResult().md_writesMutable(); }
        public availableOnlyOn:Kind[];
        public md_onlyOn(...s: string[]) { this.availableOnlyOn = s.map(ss => api.getKind(ss)) }
        public md_import(manager: string, name: string, version: string) {
            if (!this._imports) this._imports = [];
            this._imports.push({ manager: manager, name: name, version: version || "*" });
        }
        public md_oldName(s:string) {
            var pref = this.parentKind.getName() + "->"
            if (/->/.test(s))
                s = Util.capitalizeFirst(s)
            else
                s = pref + s
            if (Util.startsWith(s, pref))
                AST.propRenames[s] = this.getName()
            else {
                var m = /(.*)->(.*)/.exec(s)
                var k = api.getKind(m[1])
                if (!k) this.md_oops("no such kind: " + m[1])
                AST.crossKindRenames[k.getName().toLowerCase() + "->" + m[2]] = this.parentKind.getName().toLowerCase() + "->" + this.getName()
            }
        }
        public getImports() { return this._imports; }

        private md_oops(msg:string)
        {
            throw new Error(msg + " at " + this.parentKind.toString() + "->" + this.getName())
        }

        public md_stub(...platforms:string[]) {
            this._implStatus = this._implStatus & ~ImplementationStatus.WebAll;
            for (var i = 0; i < platforms.length; ++i)
                switch (platforms[i]) {
                    case "wab": this._implStatus |= ImplementationStatus.Wab; break;
                    case "": break;
                    default: this.md_oops("unknown platform for stub " + platforms[i])
                }
        }

        static getPlatform(caps:string[], oops:(s:string)=>void)
        {
            var r = 0;
            for (var i = 0; i < caps.length; ++i) {
                if (caps[i] == "none") continue;
                var c = AST.App.capabilityByName(caps[i])
                if (c != PlatformCapability.None)
                    r |= c;
                else
                    oops("unknown platform cap " + caps[i]);
            }
            return r;
        }

        public md_cap(...caps:string[]) {
            if (this._md_cap_set) this.md_oops("cap() called twice; use cap(foo,bar) instead")
            this._md_cap_set = true;
            this._platform = Property.getPlatform(caps, (s) => this.md_oops(s));
            this._explicitPlatform = this._platform;
        }

        public md_embedsLink(from:string, to:string) {}


        public md_resumes() { this._implStatus |= ImplementationStatus.Pauses }
        public md_needsFrame() { this._implStatus |= ImplementationStatus.UsesStackFrame }

        public md_arg(name:string) {
            if (name == "result") return this.getResult();
            var r = this._inParameters.filter((p) => p.getName() == name)[0];
            if (!r) {
                Util.log("wrong annotations: parameter '" + name + "' doesn't exist on " + this.parentKind.toString() + "->" + this.getName());
                return PropertyParameter.md_make(name, this.parentKind);
            }
            return r;
        }


        public canCacheSearch() { return true }

        public getFlags() { return this.flags; }

        public _infixPriority = 0;
        public _usage_count:number;
        private _result:PropertyParameter;
        private _inParameters:PropertyParameter[];
        private _platform:PlatformCapability;
        private _explicitPlatform:PlatformCapability = PlatformCapability.None;
        private _md_cap_set:boolean;

        public getInfixPriority() { return this._infixPriority; }
        public getCapability():PlatformCapability { return this._platform }
        public getExplicitCapability():PlatformCapability { return this._explicitPlatform }

        // compilation
        public shouldPauseInterperter():boolean { return !!(this._implStatus & ImplementationStatus.Pauses) }
        public isImplemented():boolean { return !!(this._implStatus & api.core.currentPlatformImpl) }
        public isImplementedAnywhere():boolean { return !!(this._implStatus & ImplementationStatus.WebAll) }
        public getSpecialApply():string { return this._specialApply; }

        // tracing
        public needsSpecialTracing() {
            var mask = PropertyFlags.NeedsTracing2|PropertyFlags.NeedsTimestamping2|PropertyFlags.HasPauseContinue2;
            return (this.getFlags() & mask) == mask;
        }
        public needsTracing() {
            return !!(this.getFlags() & (PropertyFlags.NeedsTracing | PropertyFlags.NeedsTracing2))
        }
        public needsTimestamping() {
            return !!(this.getFlags() & (PropertyFlags.NeedsTimestamping | PropertyFlags.NeedsTimestamping2))
        }
        public hasPauseContinue() {
            return !!(this.getFlags() & (PropertyFlags.HasPauseContinue | PropertyFlags.HasPauseContinue2))
        }

        static withParent(par:Kind)
        {
            return (p:IProperty) => {
                p.parentKind = par;
                return p;
            }
        }
        public _implStatus:ImplementationStatus = ImplementationStatus.WebAll;
        public _isOverridden:boolean;
        public _specialApply : string;
        public isKey: boolean;

        // intellisense support
        private _usage:TokenUsage;
        public getUsage():TokenUsage { return this._usage; }
        public lastMatchScore:number;
        public useFullName:boolean;

        public getResult() { return this._result; }
        public getParameters() { return this._inParameters; }
        public getHelp(account = true):string { return lf_static(this._help, account); }
        public isBeta():boolean { return (this.parentKind && this.parentKind.isBetaOnly) || !!(this.getFlags() & PropertyFlags.IsBetaOnly); }
        public getDescription(skip?:boolean):string {
            var h = this.getHelp(!skip);
            if ((this.parentKind && this.parentKind.isDbgOnly) || this.getFlags() & PropertyFlags.IsDebugOnly)
                h = "[**dbg**] " + h;
            else if (this.isBeta())
                h = "[**beta**] " + h;
            if (this.flags & PropertyFlags.IsObsolete)
                h = "[**obsolete**] " + h;
            if (!this.isImplementedAnywhere())
                h = "[**not implemented**] " + h;
            return h
        }
        public getCategory() { return PropertyCategory.Builtin; }
        private isQuick() { return false; }
        public forwardsTo() : AST.Decl { return null; }
        public forwardsToStmt() : AST.Stmt { return null; }
        public isBrowsable() {
            return ((this.flags & PropertyFlags.NonBrowsable) == 0 &&
                    (!this.parentKind.isPrivate) &&
                    ((this.flags & PropertyFlags.DocsOnly) == 0 || !Script || Script.isDocsTopic()) &&
                    (dbg || !(this.flags & PropertyFlags.IsDebugOnly)) &&
                    (isBeta || !(this.flags & PropertyFlags.IsBetaOnly)));
        }

        public showIntelliButton() { return !(this.flags & PropertyFlags.HideIntelliButton) }

        static getSignatureCore(pp:IProperty) : string
        {
            var s = pp.getParameters().slice(1).map((p:PropertyParameter) => p.getName()).join(", ");
            var resKind = pp.getResult().getKind();
            if (!resKind || resKind == api.core.Nothing) {
                return "(" + s + ")";
            } else {
                if (s != "")
                    return "(" + s + ") : " + resKind.toString();
                else if (resKind == api.core.Unknown)
                    return "";
                else
                    return " : " + resKind.toString();
            }
        }

        public getSignature():string { return Property.getSignatureCore(this); }

        public getName() : string
        {
            if (this.useFullName) return this.parentKind.getPropPrefix() + this.getArrow() + this._name;
            else return this._name;
        }

        public isRefMethod()
        {
            return this.parentKind.getRoot() == api.core.Ref && this._name.slice(0, 1) == api.core.refPropPrefix;
        }

        public getArrow()
        {
            if (this.isRefMethod())
                return "\u200A\u2192\u200A"
            return "\u200A\u2192\u00A0"
        }
    }

    class UserActionRunProperty
        extends Property
    {
        constructor(public parentActionKind:UserActionKind)
        {
            super(parentActionKind, "run", parentActionKind.userAction.getDescription(), [], api.core.Nothing)
        }

        public getFlags()
        {
            return this.parentActionKind.isAtomic() ? PropertyFlags.None : PropertyFlags.Async;
        }

        public getResult()
        {
            return this.parentActionKind.userAction.getResult()
        }

        public getParameters()
        {
            var act = this.parentActionKind.userAction
            var parms = act.getParameters().slice(1)
            parms.unshift(act.mkPP("this", this.parentKind))
            return parms
        }
    }

    export class UnresolvedProperty
        extends Property
    {
        constructor(par:Kind, name:string) {
            super(par, name, "i cannot find " + name + " on " + par.toString(), [], api.core.Unknown)
        }
    }

    export class PropertyParameter
        extends ApiNode
    {
        constructor(name:string, kind:Kind) {
            super(name)
            this._kind = kind;
        }

        static md_make(name:string, kind:Kind)
        {
            return new PropertyParameter(name, kind);
        }

        public md_defl(v:any)
        {
            this.getDefaultValue = () => [AST.mkLit(v)];
        }

        public md_deflExpr(s:string)
        {
            this.getDefaultValue = () => AST.Parser.parseExprHolder(s).tokens;
        }

        public md_lang(s:string)
        {
            this.languageHint = s
        }

        public setDeflStrings(v:string[])
        {
            this._stringValues = v;
            if (!this.hasOwnProperty('getDefaultValue')) {
                this.getDefaultValue = () => [AST.mkLit(
                    this.getKind() == api.core.Number ?
                    parseFloat(v[0]) :
                    this.getKind() == api.core.Boolean ?
                    v[0] == "true" : v[0]
                )];
            }
        }

        public setDeflStringArtIds(v: StringMap<string>)
        {
            this._stringValueArtIds = v;
        }

        public md_deflStrings(...v:string[])
        {
            this.setDeflStrings(v)
        }

        public md_writesMutable() { this._flags |= ParameterFlags.WritesMutable }
        public md_readsMutable() { this._flags |= ParameterFlags.ReadsMutable }

        public _kind:Kind;
        public parentProperty:IProperty;
        public languageHint:string;
        private _stringValues: string[];
        private _stringValueArtIds: StringMap<string>;
        public _flags:ParameterFlags = 0;

        public getKind() { return this._kind || api.core.Nothing; }
        public getFlags() { return this._flags }
        public getDefaultValue():AST.Token[] { return null; }
        public getStringValues():string[]
        {
            return this._stringValues;
        }
        public getStringValueArtIds(): StringMap<string> {
            return this._stringValueArtIds;
        }

        public substFor(par:ParametricKind):PropertyParameter
        {
            var r = new PropertyParameter(this.getName(), par.subst(this._kind))
            r._stringValues = this._stringValues;
            r._stringValueArtIds = this._stringValueArtIds;
            r._flags = this._flags;
            return r
        }
    }

    export class MultiplexRootProperty
        extends Property
    {
        private _multiResult:PropertyParameter;

        constructor(private _parametricKind:ParametricKind,
                    parentKind:Kind, name:string, desc:string, parms:PropertyParameter[], retType:Kind)
        {
            super(parentKind, name, desc, parms, retType)

            var mk = new MultiplexKind(MultiplexKind.argsFor(this._parametricKind))
            mk.parentProp = this;
            this._multiResult = new PropertyParameter("result", mk)
        }

        static md_make_kind()
        {
            var k = new ParametricKind("MultiplexAPI", "");
            k.md_parameterPrefixes("", "", "", "", "")
            k._contexts = KindContext.General;
            k.md_isData()
            return k
        }

        static md_make_prop(k:ParametricKind, usage_count:number, parentKind:Kind, name:string, desc:string, parms:PropertyParameter[], retType:Kind)
        {
            var p = new MultiplexRootProperty(k, parentKind, name, desc, parms, retType)
            p._usage_count = usage_count;
            parentKind.md_addProperty(p);
            return p;
        }

        public getParameters():PropertyParameter[] { return [super.getParameters()[0]] }
        public getResult() { return this._multiResult }

        public instanceFor(parK:MultiplexKind, k:Kind, args:Kind[]):Property
        {
            var par = this._parametricKind.createInstance(args)
            var r = super.substForInternal(par, (pp, rk) =>
                new MultiplexProperty(k, parK, rk, pp));
            (<MultiplexProperty>r).savedArgs = args
            return r
        }

        public substFor(par:ParametricKind, mk:(pp:PropertyParameter[], rk:Kind)=>Property = null)
        {
            return super.substForInternal(par, (pp, rk) =>
                new MultiplexRootProperty(this._parametricKind, par, this._name, this._help, pp, rk))
        }
    }

    export class MultiplexProperty
        extends Property
    {
        constructor(public forKind:Kind, parentKind:MultiplexKind, retKind:Kind, pp:PropertyParameter[] = [])
        {
            super(parentKind, "", forKind.getHelp(false), pp, retKind)
            if (retKind instanceof MultiplexKind)
                (<MultiplexKind>retKind).parentProp = this;
            this.getUsage().globalCount = forKind.usage_count;
        }

        public getName()
        {
            return (<MultiplexKind>this.parentKind).getNameFor(this.forKind)
        }

        public savedArgs:Kind[];
    }


    export class TokenUsage
    {
        public globalCount = 0;
        public localCount = 0;
        private lastUsed = 0;
        public apiFreq = 0; // normalized to 0-1 range

        public count()
        {
            return this.localCount * 5 + this.globalCount + this.apiFreq * 20;
        }

        constructor(public parent:any) {
        }
    }

}
