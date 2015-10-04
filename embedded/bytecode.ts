///<reference path='refs.ts'/>

module TDev.AST.Bytecode
{
    interface FuncInfo {
        type: string;
        args: number;
        idx: number;
    }

    interface OpcodeInfo {
        stack: number;
        idx: number;
    }

    var opcodeInfo:StringMap<OpcodeInfo>;
    var funcInfo:StringMap<FuncInfo>;
    var hex:string[];

    function setup()
    {
        var inf = (<any>TDev).bytecodeInfo
        opcodeInfo = inf.opcodes;
        funcInfo = inf.functions;
        hex = inf.hex;
    }

    function isRefKind(k:Kind)
    {
        Util.assert(k != null)
        Util.assert(k != api.core.Unknown)
        var isSimple = k == api.core.Number || k == api.core.Boolean
        return !isSimple
    }

    function isRefExpr(e:Expr)
    {
        if (typeof e.getLiteral() == "string" && e.enumVal != null)
            return false;
        if (typeof e.getLiteral() == "number")
            return false;
        return isRefKind(e.getKind())
    }

    function lookupFunc(name:string)
    {
        if (/^uBit\./.test(name))
            name = name.replace(/^uBit\./, "micro_bit::").replace(/\.(.)/g, (x, y) => y.toUpperCase())
        return funcInfo[name]
    }


    export class Opcode
    {
        arg0:any;
        arg1:number;
        index:number;
        info:string;

        constructor(public name:string, public darg:number)
        {
        }

        size()
        {
            if (this.name == "LABEL")
                return 0;

            if (this.arg1 != null)
                return 3;
            else if (this.arg0 != null)
                return 2;
            return 1;
        }

        emitTo(bin:Binary)
        {
            if (!this.info) {
                if (typeof this.arg0 == "string")
                    this.info = JSON.stringify(this.arg0)
                else if (typeof this.arg0 == "number")
                    this.info = this.arg0 + ""
                else this.info = "";
            }

            if (this.info.length > 60)
                this.info = this.info.slice(0, 60) + "..."

            bin.comment("0x" + this.index.toString(16) + ": " + this.name + " " + this.darg + (this.info ? " " + this.info : ""));

            if (this.name == "LABEL")
                return;

            var inf = opcodeInfo[this.name]

            Util.assert(0 <= this.darg && this.darg <= 255)

            bin.push(inf.idx | ((this.darg & 0xff) << 8))

            if (this.arg0 == null) return
            if (this.arg0 instanceof Opcode)
                bin.push((<Opcode>this.arg0).index)
            else if (this.arg0 instanceof Procedure)
                bin.push((<Procedure>this.arg0).index)
            else if (typeof this.arg0 == "number")
                bin.push(this.arg0)
            else if (typeof this.arg0 == "string") {
                Util.assert(!!bin.strings[this.arg0])
                bin.push(bin.strings[this.arg0])
            } else Util.oops("bad arg0: " + this.arg0)

            if (this.arg1 == null) return
            if (typeof this.arg1 == "number")
                bin.push(this.arg1)
            else Util.oops("bad arg1: " + this.arg1)
        }

        stackOffset()
        {
            if (this.name == "LABEL") return 0

            if (this.name == "UCALLPROC")
                return -this.darg;
            if (this.name == "UCALLFUNC")
                return -this.darg + 1;

            var inf = opcodeInfo[this.name]
            Util.assert(inf.stack != null)
            return inf.stack
        }
    }

    export class Location
    {
        isarg = false;

        constructor(public index:number, public def:Decl = null)
        {
        }

        isRef()
        {
            return this.def && isRefKind(this.def.getKind())
        }

        emitStore(proc:Procedure)
        {
            if (this.isarg)
                Util.oops("store for arg")

            var c = this.isRef() ? "STLOCREF" : "STLOC"
            if (this.def instanceof GlobalDef)
                c = c.replace(/LOC/, "GLB")
            proc.emit(c, this.index)
        }

        emitLoad(proc:Procedure)
        {
            var c = this.isRef() ? "LDLOCREF" : "LDLOC"
            if (this.def instanceof GlobalDef)
                c = c.replace(/LOC/, "GLB")
            else if (this.isarg)
                c = c.replace(/LOC/, "ARG")
            proc.emit(c, this.index)
        }

        emitClrIfRef(proc:Procedure)
        {
            Util.assert(!this.isarg)
            Util.assert(!(this.def instanceof GlobalDef))
            if (this.isRef())
                proc.emit("CLRLOCREF", this.index)
        }
    }

    export class Procedure
    {
        numArgs = 0;
        hasReturn = false;
        currStack = 0;
        maxStack = 0;
        action:Action;

        body:Opcode[] = [];
        locals:Location[] = [];
        args:Location[] = [];
        index:number;

        lastop():Opcode
        {
            return this.body.peek()
        }

        size(idx:number)
        {
            this.index = idx;
            idx += 3;
            this.body.forEach(o => {
                o.index = idx;
                idx += o.size();
            })
            return idx - this.index;
        }

        mkLocal(def:LocalDef = null)
        {
            var l = new Location(this.locals.length, def)
            this.locals.push(l)
            return l
        }

        emitCall(name:string)
        {
            var inf = lookupFunc(name)
            Util.assert(!!inf, "unimplemented function: " + name)

            var opcode = "CALL" + inf.args
            if (inf.type == "F") opcode += "FUNC"
            else if (inf.type == "P") opcode += "PROC"
            else Util.oops("invalid call type " + inf.type)

            if (!this.lastop() || this.lastop().name != "REFMASK")
                opcode = "FLAT" + opcode

            var op = this.emit(opcode, inf.idx)
            op.info = name;
        }

        emitTo(bin:Binary)
        {
            bin.comment("\n\n// 0x" + this.index.toString(16) + ": FUNC " + (this.action ? this.action.getName() : "(inline)"))
            bin.push(0x4201);
            bin.push(this.locals.length);
            bin.push(this.maxStack);
            this.body.forEach(o => o.emitTo(bin))
        }

        emitJmp(trg:Opcode, name = "JMP"):Opcode
        {
            var op = this.emit(name);
            op.arg0 = trg
            return op
        }

        mkLabel():Opcode
        {
            return new Opcode("LABEL", 0)
        }

        emitOp(op:Opcode)
        {
            this.body.push(op)
        }

        emit(name:string, darg = 0):Opcode
        {
            var op = new Opcode(name, darg)
            this.currStack += op.stackOffset();
            Util.assert(this.currStack >= 0);
            if (this.currStack > this.maxStack)
                this.maxStack = this.currStack;
            this.emitOp(op)
            return op
        }
    }

    export class Binary
    {
        procs:Procedure[] = [];
        globals:Location[] = [];
        buf:number[] = [];
        csource = "";

        stringSeq:StringMap<number> = {};
        nextStringId = 0;
        strings:StringMap<number> = {};

        patchHex()
        {
            var myhex = hex.slice(0)
            var i = 0;
            for (; i < myhex.length; ++i) {
                if (/^:10....000108010842424242010801083ED8E98D/.test(myhex[i]))
                    break;
            }

            Util.assert(i < myhex.length)
            var i0 = i;
            var ptr = 0
            var togo = 32000 / 8;
            while (ptr < this.buf.length) {
                if (myhex[i] == null) Util.die();
                var m = /^:10(..)(..)00(.*)(..)$/.exec(myhex[i])
                if (!m) { i++; continue; }
                Util.assert(i == i0 || /^0+$/.test(m[3]))


                var bytes = [0x10, parseInt(m[1], 16), parseInt(m[2], 16), 0]
                for (var j = 0; j < 8; ++j) {
                    bytes.push((this.buf[ptr] || 0) & 0xff)
                    bytes.push((this.buf[ptr] || 0) >>> 8)
                    ptr++
                }

                var chk = 0
                var r = ":"
                bytes.forEach(b => chk += b)
                bytes.push((-chk) & 0xff)
                bytes.forEach(b => r += ("0" + b.toString(16)).slice(-2))
                myhex[i] = r.toUpperCase();
                i++;
                togo--;
            }

            while (togo > 0) {
                if (myhex[i] == null) Util.die();
                var m = /^:10(..)(..)00(.*)(..)$/.exec(myhex[i])
                if (!m) { i++; continue; }
                Util.assert(/^0+$/.test(m[3]))
                myhex[i] = "";
                i++;
                togo--;
            }

            return myhex.filter(l => !!l);
        }

        emitString(s:string, needsSeqId = true):number
        {
            this.strings[s] = 0;
            if (needsSeqId) {
                if (!this.stringSeq.hasOwnProperty(s))
                    this.stringSeq[s] = this.nextStringId++;
                return this.stringSeq[s];
            } else return -1;
        }

        comment(s:string)
        {
            this.csource += "\n// " + s + "\n"
        }

        push(n:number)
        {
            this.buf.push(n)
            this.csource += "0x" + ("000" + n.toString(16)).slice(-4) + ", "
        }

        serialize()
        {
            Util.assert(this.csource == "");

            this.comment("start");
            this.push(0x4202);
            this.push(this.globals.length);
            this.push(this.nextStringId);
            this.push(0); // future use
            this.push(0);
            this.push(0);

            var idx = this.buf.length;
            this.procs.forEach(p => {
                idx += p.size(idx);
            })
            Object.keys(this.strings).forEach(s => {
                this.strings[s] = idx;
                idx += Math.ceil((s.length + 1) / 2)
            })
            this.procs.forEach(p => {
                Util.assert(this.buf.length == p.index);
                p.emitTo(this);
            })
            function byteAt(s, i) { return (s.charCodeAt(i) || 0) & 0xff }
            Object.keys(this.strings).forEach(s => {
                Util.assert(this.buf.length == this.strings[s]);
                var len = Math.ceil((s.length + 1) / 2)
                this.comment("String: " + JSON.stringify(s))
                for (var i = 0; i < len; ++i) {
                    this.push( (byteAt(s, i*2+1) << 8) | byteAt(s, i*2) )
                }
            })
        }
    }

    export class ReachabilityVisitor
        extends PreCompiler
    {
        useAction(a:Action)
        {
            if (/{shim:.*}/.test(a.getDescription()))
                return
            super.useAction(a)
        }
    }

    export class Compiler
        extends NodeVisitor 
    {
        public binary = new Binary();
        private proc:Procedure;

        constructor(private app:App)
        {
            super()
        }

        private shouldCompile(d:Decl)
        {
            return d.visitorState === true;
        }

        private run()
        {
            setup();
            var pre = new ReachabilityVisitor({});
            pre.run(this.app)

            this.app.librariesAndThis().forEach(l => {
                if (l.isThis()) {
                    l.resolved.libraries().forEach(lr => 
                        lr.getPublicActions().forEach((la : LibraryRefAction) => {
                            la._compilerInfo = la.template
                        }))
                } else {
                    var ress = Util.toDictionary(<ResolveClause[]>l.resolveClauses.stmts, r => r.formalLib.getName())
                    l.resolved.libraries().forEach(lr => {
                        var acts = Util.toDictionary(<ActionBinding[]>ress[lr.getName()].actionBindings.stmts, a => a.formal.getName())
                        lr.getPublicActions().forEach((la : LibraryRefAction) => {
                            if (!acts[la.getName()]) return
                            var act = acts[la.getName()].actual
                            if (act instanceof LibraryRefAction && (<LibraryRefAction>act).template)
                                la._compilerInfo = (<LibraryRefAction>act).template
                            else
                                la._compilerInfo = act
                        })
                    })
                }
                this.prepApp(l.resolved)
            })

            this.app.librariesAndThis().forEach(l => {
                this.compileApp(l.resolved)
            })

            while (this.finals.length > 0) {
                var f = this.finals.shift()
                f()
            }
        }

        public compile()
        {
            this.run()
            this.binary.serialize()
            var hex = this.binary.patchHex().join("\r\n") + "\r\n"
            var r = 
                "#include \"BitVM.h\"\n" +
                "namespace bitvm {\n" +
                "const uint16_t bytecode[32000] __attribute__((aligned(0x20))) = {\n" + 
                this.binary.csource + "\n}; }\n"
            return {
                dataurl: "data:application/x-microbit-hex;base64," + Util.base64Encode(hex),
                csource: r
            }
        }

        visitAstNode(n:AstNode)
        {
            this.visitChildren(n);
        }

        handleAssignment(e:Call)
        {
            Util.assert(e._assignmentInfo.targets.length == 1)
            var trg = e.args[0]
            var src = e.args[1]
            var refSuff = isRefKind(e.args[1].getKind()) ? "REF" : ""

            if (trg.referencedRecordField()) {
                this.dispatch((<Call>trg).args[0])
                this.dispatch(src)
                this.proc.emit("STFLD" + refSuff, this.fieldIndex(trg.referencedRecordField()))
            } else if (trg.referencedData()) {
                this.dispatch(src);
                this.globalIndex(trg.referencedData()).emitStore(this.proc);
            } else if (trg.referencedLocal()) {
                this.dispatch(src);
                this.localIndex(trg.referencedLocal()).emitStore(this.proc);
            } else {
                Util.oops("bad assignment: " + trg.nodeType())
            }
        }

        visitBreak(b:Call)
        {
            this.proc.emitJmp(b.topAffectedStmt._compilerBreakLabel);
        }

        visitContinue(b:Call)
        {
            this.proc.emitJmp(b.topAffectedStmt._compilerContinueLabel);
        }

        visitReturn(r:Call)
        {
            if (r.topRetLocal) {
                this.dispatch(r.args[0]);
                this.localIndex(r.topRetLocal).emitStore(this.proc);
            }
            this.proc.emitJmp(r.topAffectedStmt._compilerBreakLabel)
        }

        emitMask(args:Expr[])
        {
            Util.assert(args.length <= 8)
            var m = 0
            args.forEach((a, i) => {
                if (isRefExpr(a))
                    m |= (1 << i)
            })
            if (m != 0) {
                this.proc.emit("REFMASK", m)
            }
        }

        emitAsString(e:Expr)
        {
            this.dispatch(e)
            var kn = e.getKind().getName().toLowerCase()
            if (kn == "string") {}
            else if (kn == "number" || kn == "string") {
                this.proc.emitCall(kn + "::to_string")
            } else {
                Util.oops("don't know how to convert " + kn + " to string")
            }
        }

        emitImageLiteral(s:string)
        {
            if (!s)
                s = "0 0 0 0 0\n0 0 0 0 0\n0 0 0 0 0\n0 0 0 0 0\n0 0 0 0 0\n";

            var x = 0;
            var w = 0;
            var h = 0;
            var lit = "";
            for (var i = 0; i < s.length; ++i) {
                switch (s[i]) {
                case "0": lit += "\u0000"; x++; break;
                case "1": lit += "\u0001"; x++; break;
                case " ": break;
                case "\n":
                    if (w == 0)
                        w = x;
                    else if (x != w)
                        // Sanity check
                        throw new Error("Malformed string literal");
                    x = 0;
                    h++;
                    break;
                default:
                    throw new Error("Malformed string literal");
                }
            }

            if (x > 0) h++; // non-terminated last line

            this.emitInt(w);
            this.emitInt(h);
            var op = this.proc.emit("LDPTR");
            op.arg0 = lit;
            this.binary.emitString(lit, false);
        }

        handleActionCall(e:Call)
        {
            var aa = e.calledExtensionAction() || e.calledAction()
            var args = e.args.slice(0)
            if (args[0].getKind() instanceof ThingSetKind || 
                args[0].referencedLibrary() || 
                (args[0] instanceof ThingRef && (<ThingRef>args[0]).namespaceLibraryName())) 
            {

                args.shift()
            }

            Util.assert(args.length == aa.getInParameters().length)

            var a:Action = aa._compilerInfo || aa
            var shm = /{shim:([^{}]*)}/.exec(a.getDescription())
            var hasret = !!aa.getOutParameters()[0]

            if (shm && shm[1] == "TD_NOOP") {
                Util.assert(!hasret)
                return
            }

            if (shm && /^micro_bit::(createImage|showAnimation|plotImage)$/.test(shm[1])) {
                Util.assert(args[0].getLiteral() != null)
                this.emitImageLiteral(args[0].getLiteral())
                args.shift()
                args.forEach(a => this.dispatch(a))
                // fake it, so we don't get assert down below and mask is correct
                args = [<Expr>mkLit(0), mkLit(0), mkLit(0)].concat(args)
            } else {
                args.forEach(a => this.dispatch(a))
            }

            this.emitMask(args)

            if (shm) {
                var msg = "{shim:" + shm[1] + "} from " + a.getName()
                if (!shm[1])
                    Util.oops("called " + msg)

                var inf = lookupFunc(shm[1])

                if (!inf)
                    Util.oops("no such " + msg)

                if (!hasret) {
                    Util.assert(inf.type == "P", "expecting procedure for " + msg);
                } else {
                    Util.assert(inf.type == "F", "expecting function for " + msg);
                }
                Util.assert(args.length == inf.args, "argument number mismatch: " + args.length + " vs " + inf.args + " in " + msg)

                this.proc.emitCall(shm[1])
            } else {
                var op = this.proc.emit(hasret ? "UCALLFUNC" : "UCALLPROC", args.length)
                op.arg0 = this.procIndex(a);
                op.info = a.getName()
                Util.assert(!!op.arg0)
            }
        }

        visitCall(e:Call)
        {
            var p = e.getCalledProperty()
           
            if (p == api.core.AssignmentProp) {
                this.handleAssignment(e)
                return
            }

            var emitCall = (name:string, args:Expr[]) => {
                args.forEach(a => this.dispatch(a))
                this.emitMask(args)
                this.proc.emitCall(name);
            }

            var pkn = p.parentKind.getRoot().getName()

            if (p.parentKind.getRoot() == api.core.Collection &&
                isRefKind(p.parentKind.getParameter(0)))
                pkn = "RefCollection";

            if (e.args.length == 1 && p.getName() == "is invalid") {
                this.dispatch(e.args[0])
                this.proc.emit("ISNULL")
            } else if (e.referencedData()) {
                this.globalIndex(e.referencedData()).emitLoad(this.proc)
            } else if (e.referencedLibrary()) {
                // TODO
            } else if (e.args[0] && e.args[0].referencedRecord()) {
                var rrec = e.args[0].referencedRecord()
                if (p.getName() == "create") {
                    this.emitInt(rrec._compilerInfo.refsize);
                    this.emitInt(rrec._compilerInfo.size);
                    this.proc.emitCall("record::mk");
                } else if (p.getName() == "invalid") {
                    this.proc.emit("LDZERO")
                } else {
                    Util.oops("unhandled record operation: " + p.getName())
                }
            } else if (e.referencedRecordField()) {
                this.dispatch(e.args[0])
                this.proc.emit("LDFLD" + (isRefKind(e.getKind()) ? "REF" : ""), 
                               this.fieldIndex(e.referencedRecordField()))
            } else if (p.parentKind instanceof RecordEntryKind) {
                if (p.getName() == "equals") {
                    emitCall("number::eq", e.args)
                } else {
                    Util.oops("unhandled entry record operation: " + p.getName())
                }
            } else if (e.calledAction() || e.calledExtensionAction()) {
                this.handleActionCall(e);
            } else if (pkn == "Invalid") {
                this.proc.emit("LDZERO")
            } else if ((e.getKind().getRoot() == api.core.Collection && e.args[0].getCalledProperty() &&
                        e.args[0].getCalledProperty().getName() == "Collection of")) {
                this.proc.emitCall(isRefKind(e.getKind().getParameter(0)) ? "refcollection::mk" : "collection::mk");
            } else if (p == api.core.StringConcatProp) {
                this.emitAsString(e.args[0]);
                this.emitAsString(e.args[1]);
                this.proc.emit("REFMASK", 3)
                this.proc.emitCall("string::concat_op");
            } else {
                var args = e.args.slice(0)
                if (args[0].getThing() instanceof SingletonDef)
                    args.shift()
                var nm = pkn.toLowerCase() + "::" + Embedded.Helpers.mangle(p.getName())
                var inf = lookupFunc(nm)
                if (!inf) {
                    nm = pkn.toLowerCase() + "::" + p.runtimeName()
                    inf = lookupFunc(nm)
                }

                if (nm == "contract::assert") {
                    Util.assert(typeof args[1].getLiteral() == "string")
                    this.dispatch(args[0])
                    var op = this.proc.emit("LDPTR");
                    op.arg0 = args[1].getLiteral()
                    this.binary.emitString(op.arg0, false)
                    this.proc.emitCall(nm)
                    return
                }

                if (inf) {
                    if (e.getKind() == api.core.Nothing) {
                        Util.assert(inf.type == "P", "expecting procedure for " + nm);
                    } else {
                        Util.assert(inf.type == "F", "expecting function for " + nm);
                    }
                    Util.assert(args.length == inf.args, "argument number mismatch: " + args.length + " vs " + inf.args)
                    emitCall(nm, args);
                } else {
                    Util.oops("function not found: " + nm)
                }
            }
        }

        visitExprHolder(eh:ExprHolder)
        {
            if (eh.isPlaceholder())
                this.proc.emit("NOOP");
            else
                this.dispatch(eh.parsed)
        }

        emitInt(v:number)
        {
            Util.assert(v != null);

            var n = Math.floor(v)
            var isNeg = false
            if (n < 0) {
                isNeg = true
                n = -n
            }
            if (n == 0)
                this.proc.emit("LDZERO")
            else if (n <= 255)
                this.proc.emit("LDCONST8", n)
            else if (n <= 0xffff) {
                var op = this.proc.emit("LDCONST16");
                op.arg0 = n
            } else {
                var op = this.proc.emit("LDCONST32");
                op.arg0 = n & 0xffff
                op.arg1 = (n >>> 16) & 0xffff
            }
            if (isNeg)
                this.proc.emit("NEG");
        }

        visitLiteral(l:Literal)
        {
            if (l.data === undefined) return
            if (typeof l.data == "number") {
                this.emitInt(l.data)
            } else if (typeof l.data == "string") {
                if (l.enumVal != null) {
                    if (/^-?\d+$/.test(l.enumVal)) {
                        this.emitInt(parseInt(l.enumVal))
                    } else {
                        var inf = lookupFunc(l.enumVal)
                        if (!inf)
                            Util.oops("unhandled enum val: " + l.enumVal)
                        if (inf.type == "E")
                            this.proc.emit("LDENUM", inf.idx)
                        else if (inf.type == "F" && inf.args == 0)
                            this.proc.emitCall(l.enumVal)
                        else
                            Util.oops("not valid enum: " + l.enumVal)
                    }
                } else if (l.data == "") {
                    this.proc.emitCall("string::mkEmpty");
                } else {
                    var id = this.binary.emitString(l.data)
                    var op = this.proc.emit("LDSTRREF", id);
                    op.arg0 = l.data
                }
            }
            else if (typeof l.data == "boolean") {
                this.proc.emit("LDCONST8", l.data ? 1 : 0)
            }
            else {
                Util.oops("invalid literal emit " + l.data) // TODO
            }
        }

        private finals:(()=>void)[] = [];

        emitInlineAction(inl:InlineAction)
        {
            var locs = AST.Compiler.computeCapturedLocals(inl);
            var inlproc = new Procedure()
            this.binary.procs.push(inlproc);

            var refs  = locs.capturedLocals.filter(l => isRefKind(l.getKind()))
            var flats = locs.capturedLocals.filter(l => !isRefKind(l.getKind()))

            var caps = refs.concat(flats)

            this.emitInt(refs.length)
            this.emitInt(caps.length)
            var op = this.proc.emit("LDCONST16")
            op.arg0 = inlproc
            this.proc.emitCall("action::mk")

            caps.forEach((l, i) => {
                this.localIndex(l).emitLoad(this.proc)
                this.proc.emit("STCLO", i)
            })

            Util.assert(inl.inParameters.length == 0)

            this.finals.push(() => {
                this.proc = inlproc

                this.proc.args = caps.map((p, i) => {
                    var l = new Location(i, p);
                    l.isarg = true
                    return l
                })

                locs.allLocals.forEach(l => {
                    l._lastWriteLocation = null;
                    if (caps.indexOf(l) == -1)
                        this.proc.mkLocal(l)
                })

                var ret = this.proc.mkLabel()
                inl._compilerBreakLabel = ret;
                this.dispatch(inl.body);
                this.proc.emitOp(ret)

                Util.assert(this.proc.currStack == 0)

                this.proc.locals.forEach(l => l.emitClrIfRef(this.proc))
                this.proc.emit("RET0")
            })
        }

        visitThingRef(t:ThingRef)
        {
            var d = t.def
            if (d instanceof LocalDef) {
                if (d._lastWriteLocation instanceof InlineAction) {
                    this.emitInlineAction(<InlineAction>d._lastWriteLocation)
                } else {
                    this.localIndex(d).emitLoad(this.proc);
                }
            } else if (d instanceof SingletonDef) {
                // nothing
            }
            else {
                Util.oops("invalid thing: " + d ? d.nodeType() : "(null)")
            }
        }

        visitAnyIf(i:If)
        {
            if (i.isTopCommentedOut())
                return

            if (!i.branches)
                return

            i.branches.forEach((b, k) => {
                if (!b.condition) {
                    this.dispatch(b.body)
                } else {
                    this.dispatch(b.condition)
                    var fwd = this.proc.emit("JMPZ");
                    this.dispatch(b.body)
                    fwd.arg0 = this.proc.emit("LABEL");
                }
            })
        }

        globalIndex(l:GlobalDef):Location
        {
            return this.binary.globals.filter(n => n.def == l)[0]
        }

        fieldIndex(l:RecordField):number
        {
            Util.assert(l._compilerInfo.idx != null);
            return l._compilerInfo.idx;
        }

        procIndex(a:Action):Procedure
        {
            return this.binary.procs.filter(n => n.action == a)[0]
        }

        localIndex(l:LocalDef, noargs = false):Location
        {
            return this.proc.locals.filter(n => n.def == l)[0] ||
                   (noargs ? null : this.proc.args.filter(n => n.def == l)[0])
        }

        visitFor(f:For)
        {
            var upper = this.proc.mkLocal()
            this.dispatch(f.upperBound);
            upper.emitStore(this.proc);

            var idx = this.localIndex(f.boundLocal);
            this.proc.emit("LDZERO");
            idx.emitStore(this.proc);

            var top = this.proc.emit("LABEL");
            var brk = this.proc.mkLabel();
            idx.emitLoad(this.proc);
            upper.emitLoad(this.proc);
            this.proc.emitCall("number::lt");
            this.proc.emitJmp(brk, "JMPZ");

            var cont = this.proc.mkLabel();
            f._compilerBreakLabel = brk;
            f._compilerContinueLabel = cont;
            this.dispatch(f.body)

            this.proc.emitOp(cont);
            idx.emitLoad(this.proc);
            this.proc.emit("LDCONST8", 1);
            this.proc.emitCall("number::plus");
            idx.emitStore(this.proc);
            Util.assert(this.proc.currStack == 0);
            this.proc.emitJmp(top);
            this.proc.emitOp(brk);
        }

        visitForeach(f:Foreach)
        {
            //TODO
            Util.oops("foreach emit")
        }

        visitWhile(n:While)
        {
            var top = this.proc.emit("LABEL");
            var brk = this.proc.mkLabel()
            this.dispatch(n.condition)
            this.proc.emitJmp(brk, "JMPZ");

            n._compilerBreakLabel = brk;
            n._compilerContinueLabel = top;
            this.dispatch(n.body)

            this.proc.emitJmp(top);
            this.proc.emitOp(brk);
        }

        visitInlineActions(i:InlineActions)
        {
            i.normalActions().forEach(a => a.name._lastWriteLocation = a)
            this.visitExprStmt(i)
        }

        visitExprStmt(es:ExprStmt)
        {
            if (es.isPlaceholder()) return

            this.dispatch(es.expr);
            var k = es.expr.parsed.getKind()
            if (k == api.core.Nothing)
                Util.assert(this.proc.currStack == 0)
            else {
                Util.assert(this.proc.currStack == 1)
                if (isRefKind(k))
                    this.proc.emit("POPREF")
                else
                    this.proc.emit("POP")
            }
        }

        visitCodeBlock(b:CodeBlock)
        {
            b.stmts.forEach(s => {
                this.dispatch(s);
                Util.assert(this.proc.currStack == 0);
            })
        }

        visitAction(a:Action)
        {
            this.proc = this.procIndex(a);

            var ret = this.proc.mkLabel()
            a._compilerBreakLabel = ret;
            this.dispatch(a.body)
            this.proc.emitOp(ret)

            Util.assert(this.proc.currStack == 0)

            /*
            // clear all globals for memory debugging
            if (this.proc.index == 0) {
                this.binary.globals.forEach(g => {
                    if (g.isRef()) {
                        this.emitInt(0);
                        g.emitStore(this.proc);
                    }
                })
            }
            */

            var retl = a.getOutParameters()[0]
            if (retl) {
                this.localIndex(retl.local).emitLoad(this.proc)
                this.proc.locals.forEach(l => l.emitClrIfRef(this.proc))
                this.proc.emit("RET1")
            } else {
                this.proc.locals.forEach(l => l.emitClrIfRef(this.proc))
                this.proc.emit("RET0")
            }
        }

        visitGlobalDef(g:GlobalDef)
        {
            var x = new Location(this.binary.globals.length, g)
            this.binary.globals.push(x)
        }

        visitLibraryRef(l:LibraryRef)
        {
            // skip
        }

        visitRecordDef(r:RecordDef)
        {
            Util.assert(r.recordType == RecordType.Object);

            var refs = r.getFields().filter(f => isRefKind(f.dataKind))
            var flats = r.getFields().filter(f => !isRefKind(f.dataKind))

            r._compilerInfo = { size: refs.length + flats.length, refsize: refs.length }

            refs.concat(flats).forEach((f, i) => {
                f._compilerInfo = { idx: i }
            })
        }

        prepAction(a:Action)
        {
            var p = new Procedure()
            this.proc = p;
            p.action = a;
            this.binary.procs.push(p)

            var inparms = a.getInParameters().map(p => p.local)
            this.proc.args = inparms.map((p, i) => {
                var l = new Location(i, p);
                l.isarg = true
                return l
            })

            visitStmts(a.body, s => {
                if (s instanceof ExprStmt) {
                    var ai = (<ExprStmt>s).expr.assignmentInfo()
                    if (ai) {
                        ai.targets.forEach(t => {
                            var loc = t.referencedLocal()
                            var idx = inparms.indexOf(loc)
                            if (loc && idx >= 0) {
                                var curr = this.localIndex(loc, true)
                                if (!curr) {
                                    var l = this.proc.mkLocal(loc)
                                    this.proc.args[idx].emitLoad(this.proc)
                                    l.emitStore(this.proc)
                                }
                            }
                        })
                    }
                }
            })


            // this includes in and out parameters; we filter out the ins
            a.allLocals.forEach(l => {
                l._lastWriteLocation = null;
                if (inparms.indexOf(l) == -1)
                    this.proc.mkLocal(l)
            })
        }

        dump(lst:Decl[])
        {
            lst.forEach(t => {
                if (this.shouldCompile(t))
                    this.dispatch(t)
            })
        }

        prepApp(a:App)
        {
            a.allActions().forEach(a => {
                if (!this.shouldCompile(a)) return
                this.prepAction(a)
            })

            this.dump(a.libraries())
            this.dump(a.variables())
            this.dump(a.resources())
            this.dump(a.records())
        }

        compileApp(a:App)
        {
            this.dump(a.allActions().filter(a => !a.isActionTypeDef()))
        }

        visitApp(a:App)
        {
            Util.oops("")
        }

        visitComment(c:Comment)
        {
            // do nothing
        }

        visitStmt(s:Stmt)
        {
            Util.oops("unhandled stmt: " + s.nodeType())
        }
    }
}
