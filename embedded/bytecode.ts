///<reference path='refs.ts'/>

module TDev.AST.Bytecode
{
    /* Docs:
     *
     * Thumb 16-bit Instruction Set Quick Reference Card
     *   http://infocenter.arm.com/help/topic/com.arm.doc.qrc0006e/QRC0006_UAL16.pdf 
     *
     * ARMv6-M Architecture Reference Manual (bit encoding of instructions)
     *   http://ecee.colorado.edu/ecen3000/labs/lab3/files/DDI0419C_arm_architecture_v6m_reference_manual.pdf
     *
     * The ARM-THUMB Procedure Call Standard
     *   http://www.cs.cornell.edu/courses/cs414/2001fa/armcallconvention.pdf
     *
     * Cortex-M0 Technical Reference Manual: 3.3. Instruction set summary (cycle counts)
     *   http://infocenter.arm.com/help/index.jsp?topic=/com.arm.doc.ddi0432c/CHDCICDF.html
     */

    /*
    TODO Peep-hole optimizations:
    push {rA} pop {rA} -> nothing
    push {rA} pop {rB} -> mov rB, rA
    */

    interface FuncInfo {
        type: string;
        args: number;
        idx: number;
        value: number;
    }

    var funcInfo:StringMap<FuncInfo>;
    var hex:string[];
    var hexStartAddr:number;
    var hexStartIdx:number;

    function swapBytes(str:string)
    {
        var r = ""
        for (var i = 0; i < str.length; i += 2)
            r = str[i] + str[i + 1] + r
        Util.assert(i == str.length)
        return r
    }

    function fillValue(types:string)
    {
        var num = 0
        var pref = ""

        Object.keys(funcInfo).forEach(k => {
            var inf = funcInfo[k]
            if (types.indexOf(inf.type) >= 0) {
                num = Math.max(inf.idx + 1, num)
                if (inf.idx < 2) {
                    var m = /^0x([a-f0-9]{8})$/.exec(k)
                    pref = pref + swapBytes(m[1]).toUpperCase()
                }
            }
        })

        var i = 0;
        var j = -1;
        var data = []
        for (; i < hex.length; ++i) {
            var m = /^:10(....)00(.{16})/.exec(hex[i])
            if (m && m[2] == pref) {
                j = 0;
            }

            if (j >= 0) {
                var s = hex[i].slice(9)
                while (s.length >= 8) {
                    data.push(parseInt(swapBytes(s.slice(0, 8)), 16))
                    s = s.slice(8)
                }
            }

            if (data.length > num) break
        }

        Util.assert(data.length > num)

        Object.keys(funcInfo).forEach(k => {
            var inf = funcInfo[k]
            if (types.indexOf(inf.type) >= 0) {
                inf.value = data[inf.idx]
                if ("PF".indexOf(inf.type) >= 0)
                    inf.value = inf.value & 0xfffffffe
                Util.assert(inf.value != null)
            }
        })
    }

    function setup()
    {
        var inf = (<any>TDev).bytecodeInfo
        funcInfo = inf.functions;
        hex = inf.hex;

        var i = 0;
        var upperAddr = "0000"
        for (; i < hex.length; ++i) {
            var m = /:02000004(....)/.exec(hex[i])
            if (m)
                upperAddr = m[1]
            m = /^:10(....)000108010842424242010801083ED8E98D/.exec(hex[i])
            if (m) {
                hexStartAddr = parseInt(upperAddr + m[1], 16)
                hexStartIdx = i
            }
        }

        fillValue("PFX")
        fillValue("E")
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

        constructor(public name:string, public code:number)
        {
        }

        size()
        {
            if (this.name == "BL")
                return 2;

            if (this.name == "LDPTR")
                return 3;

            if (this.name == "LABEL")
                return 0;

            if (this.code)
                return 1;

            Util.oops("cannot compute size: " + this.name)
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

            bin.commentAt(this.index, this.name + (this.info ? " " + this.info : ""))

            if (this.name == "LABEL")
                return;

            if (this.name == "BL") {
                var off = null
                if (this.arg0 instanceof Procedure)
                    off = (<Procedure>this.arg0).index - (this.index - 2)
                else if (this.arg0.value)
                    off = ((<number>this.arg0.value - hexStartAddr) / 2) - (this.index - 2)
                Util.assert(off != null)
                Util.assert((off|0) == off)
                // we can actually support more but the board has 256k (128k instructions)
                Util.assert(-128*1024 <= off && off <= 128*1024) 

                // note that off is already in instructions, not bytes
                var imm11 = off & 0x7ff
                var imm10 = (off >> 11) & 0x3ff

                if (off & 0xf0000000) {
                    bin.push(0xf400 | imm10)
                } else {
                    bin.push(0xf000 | imm10)
                }
                bin.push(0xf800 | imm11)
                return
            }

            if (this.name == "B") {
                var off = null
                if (this.arg0 instanceof Opcode)
                    off = (<Opcode>this.arg0).index - (this.index - 2)
                Util.assert(off != null)
                Util.assert((off|0) == off)
                Util.assert((off & 0xfffff800) == 0 || (off & 0xfffff800) == 0xfffff800)
                var imm11 = off & 0x7ff
                bin.push(0xe000 | imm11)
                return
            }

            if (this.name == "LDPTR") {
                var idx = null
                if (this.arg0 instanceof Procedure)
                    idx = (<Procedure>this.arg0).index
                else if (typeof this.arg0 == "string")
                    idx = bin.strings[this.arg0]
                else Util.oops("bad arg0: " + this.arg0)
                Util.assert(idx != null)
                Util.assert((idx | 0) == idx)
                Util.assert(0 <= idx && idx <= 0xffff)

                bin.commentAt(this.index, "movs r1, #" + ((idx >> 8) & 0xff))
                bin.push(0x2100 | ((idx >> 8) & 0xff))

                bin.commentAt(this.index + 1, "lsls r1, r1, #8")
                bin.push(0x0209)

                bin.commentAt(this.index + 2, "adds r1, #" + (idx & 0xff))
                bin.push(0x3100 | (idx & 0xff))
                return
            }

            Util.assert(!this.arg0 || this.arg0 instanceof Location)
            Util.assert(!!this.code);

            bin.push(this.code);
        }

        stackOffset()
        {
            if (/^pop\s*\{r[0-9]\}/.test(this.name))
                return -1;
            if (/^push\s*\{r[0-9]\}/.test(this.name))
                return 1;

            return 0;
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

            if (this.def instanceof GlobalDef) {
                proc.emitInt(this.index)
                proc.emitCall("bitvm::stglb" + (this.isRef() ? "Ref" : ""), 0); // unref internal
            } else {
                proc.emit("pop {r0}", 0xbc01);
                var op = proc.emit("STR", 0x9000)
                op.arg0 = this
                op.arg1 = proc.currStack
            }
        }

        emitLoad(proc:Procedure)
        {
            if (this.def instanceof GlobalDef) {
                proc.emitInt(this.index)
                proc.emitCall("bitvm::ldglb" + (this.isRef() ? "Ref" : ""), 0); // unref internal
            } else {
                if (this.isarg && proc.argsInR5) {
                    Util.assert(0 <= this.index && this.index < 32)
                    proc.emit("ldr r0, [r5, #4*" + this.index + "]", 0x6828 | (this.index<<6))
                } else {
                    var op = proc.emit("LDR", 0x9800)
                    op.arg0 = this
                    op.arg1 = proc.currStack
                    proc.emit("push {r0}", 0xb401);
                }
                if (this.isRef())
                    proc.emitCall("bitvm::incr", 0);
            }
        }

        emitClrIfRef(proc:Procedure)
        {
            // Util.assert(!this.isarg)
            Util.assert(!(this.def instanceof GlobalDef))
            if (this.isRef()) {
                var op = proc.emit("LDR", 0x9800)
                op.arg0 = this
                op.arg1 = proc.currStack
                proc.emitCall("bitvm::decr", 0);
            }
        }
    }

    export class Procedure
    {
        numArgs = 0;
        hasReturn = false;
        currStack = 0;
        maxStack = 0;
        action:Action;
        argsInR5 = false;

        body:Opcode[] = [];
        locals:Location[] = [];
        args:Location[] = [];
        index:number;

        mkLocal(def:LocalDef = null)
        {
            var l = new Location(this.locals.length, def)
            this.locals.push(l)
            return l
        }

        size(idx:number)
        {
            this.expandOpcodes();
            this.index = idx;
            idx += 3;
            this.body.forEach(o => {
                o.index = idx;
                idx += o.size();
            })
            return idx - this.index;
        }

        expandOpcodes()
        {
            var res:Opcode[] = []
            this.body.forEach(op => {
                if (op.name == "LOCALS") {
                    if (this.locals.length > 0) {
                        res.push(new Opcode("movs r0, #0", 0x2000))
                        this.locals.forEach(l => {
                            res.push(new Opcode("push {r0}", 0xb401))
                        })
                    }
                    return // don't copy
                } else if (op.name == "POPLOCALS") {
                    if (this.locals.length > 0) {
                        var len = this.locals.length
                        Util.assert(0 <= len && len < 127);
                        res.push(new Opcode("add sp, #4*" + len, 0xb000 | len))
                    }
                    return // no copy
                } else if (op.name == "LDR" || op.name == "STR") {
                    Util.assert(!!op.code)
                    var l:Location = op.arg0
                    var idx:number = op.arg1
                    if (l.isarg) {
                        idx += (this.args.length - l.index - 1) + this.locals.length + 1
                    } else {
                        idx += l.index
                    }
                    Util.assert(0 <= idx && idx < 255);
                    op.name = op.name.toLowerCase() + " r0, [sp, #4*" + idx + "]"
                    op.code |= idx
                } else if (op.name == "B") {
                } else if (op.name == "BL") {
                } else if (op.name == "LDPTR") {
                } else if (op.name == "LABEL") {
                    // do nothing
                } else if (/^[a-z]/.test(op.name)) {
                    // expanded
                } else {
                    Util.oops("unknown opcode macro: " + op.name)
                }
                res.push(op)
            })
            this.body = res
        }

        emitClrs(omit:LocalDef, inclArgs = false)
        {
            var lst = this.locals
            if (inclArgs)
                lst = lst.concat(this.args)
            lst.forEach(p => {
                if (p.def != omit)
                    p.emitClrIfRef(this)
            })
        }

        emitCall(name:string, mask:number)
        {
            var inf = lookupFunc(name)
            Util.assert(!!inf, "unimplemented function: " + name)

            Util.assert(inf.args <= 4)

            if (inf.args >= 4)
                this.emit("pop {r3}", 0xbc08);
            if (inf.args >= 3)
                this.emit("pop {r2}", 0xbc04);
            if (inf.args >= 2)
                this.emit("pop {r1}", 0xbc02);
            if (inf.args >= 1)
                this.emit("pop {r0}", 0xbc01);

            var numMask = 0

            if (inf.type == "F" && mask != 0) {
                // reserve space for return val
                this.emit("push {r0}", 0xb401);
            }

            if (mask & (1 << 0)) {
                numMask++
                this.emit("push {r0}", 0xb401);
            }
            if (mask & (1 << 1)) {
                numMask++
                this.emit("push {r1}", 0xb402);
            }
            if (mask & (1 << 2)) {
                numMask++
                this.emit("push {r2}", 0xb404);
            }
            if (mask & (1 << 3)) {
                numMask++
                this.emit("push {r3}", 0xb408);
            }

            Util.assert((mask & ~0xf) == 0)

            var op = this.emit("BL", 0)
            op.info = name;
            op.arg0 = inf;

            if (inf.type == "F") {
                if (mask == 0)
                    this.emit("push {r0}", 0xb401);
                else {
                    this.emit("str r0, [sp, #4*" + numMask + "]", 0x9000 | numMask)
                }
            }
            else if (inf.type == "P") {
                // ok
            }
            else Util.oops("invalid call type " + inf.type)

            while (numMask-- > 0) {
                this.emitCall("bitvm::decr", 0);
            }
        }

        emitTo(bin:Binary)
        {
            bin.commentAt(this.index, "FUNC " + (this.action ? this.action.getName() : "(inline)"))
            bin.comment(Util.fmt("{0} local(s), maxStack={1}", this.locals.length, this.maxStack))
            this.body.forEach(o => o.emitTo(bin))
        }

        emitJmp(trg:Opcode, name = "JMP"):Opcode
        {
            if (name == "JMPZ") {
                this.emit("bne +2", 0xd100)
            } else if (name == "JMP") {
                // ok
            } else {
                Util.oops("bad jmp");
            }

            var op = this.emit("B", 0xe000); // 0b11100<op>
            op.arg0 = trg
            return op
        }

        mkLabel():Opcode
        {
            return new Opcode("LABEL", 0)
        }

        emitLbl(op:Opcode)
        {
            Util.assert(op.name == "LABEL")
            this.body.push(op)
        }

        emit(name:string, code:number):Opcode
        {
            var op = new Opcode(name, code)
            this.currStack += op.stackOffset();
            Util.assert(this.currStack >= 0);
            if (this.currStack > this.maxStack)
                this.maxStack = this.currStack;
            this.body.push(op)
            return op
        }

        emitInt(v:number, keepInR0 = false)
        {
            Util.assert(v != null);

            var n = Math.floor(v)
            var isNeg = false
            if (n < 0) {
                isNeg = true
                n = -n
            }

            if (n <= 255) {
                this.emit("movs r0, #" + n, 0x2000 | n)
            } else {
                this.emit("ldr r0, [pc, #0]", 0x4800)
                this.emit("b +2", 0xe001)
                this.emit("data " + (n & 0xffff), (n & 0xffff))
                this.emit("data " + ((n>>16) & 0xffff), ((n>>16) & 0xffff))
            }
            if (isNeg) {
                this.emit("neg r0, r0", 0x4240)
            }

            if (!keepInR0)
                this.emit("push {r0}", 0xb401);
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

        isDataRecord(s:string)
        {
            if (!s) return false
            var m = /^:......(..)/.exec(s)
            Util.assert(!!m)
            return m[1] == "00"
        }

        patchHex(shortForm:boolean)
        {
            var myhex = hex.slice(0)

            var i = hexStartIdx;
            var ptr = 0
            var togo = 32000 / 8;
            while (ptr < this.buf.length) {
                if (myhex[i] == null) Util.die();
                var m = /^:10(..)(..)00(.*)(..)$/.exec(myhex[i])
                if (!m) { i++; continue; }
                Util.assert(i == hexStartIdx || /^0+$/.test(m[3]))


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

            if (shortForm) {
                for (var j = 0; j < myhex.length; ++j) {
                    if (!(hexStartIdx <= j && j <= i) && this.isDataRecord(myhex[j]))
                        myhex[j] = "";
                }
            } else {
                while (togo > 0) {
                    if (myhex[i] == null) Util.die();
                    var m = /^:10(..)(..)00(.*)(..)$/.exec(myhex[i])
                    if (!m) { i++; continue; }
                    Util.assert(/^0+$/.test(m[3]))
                    myhex[i] = "";
                    i++;
                    togo--;
                }
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

        commentAt(idx:number, s:string)
        {
            this.comment("0x" + (2*idx).toString(16) + ": " + s)
        }

        comment(s:string)
        {
            if (!/\n$/.test(this.csource))
                this.csource += "\n"
            this.csource += "// " + s + "\n"
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
            this.push(0x4203);
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

        public compile(shortForm:boolean)
        {
            shortForm = false; // this doesn't work yet

            this.run()
            this.binary.serialize()
            var hex = this.binary.patchHex(shortForm).join("\r\n") + "\r\n"
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
            var refSuff = isRefKind(e.args[1].getKind()) ? "Ref" : ""

            if (trg.referencedRecordField()) {
                this.dispatch((<Call>trg).args[0])
                this.emitInt(this.fieldIndex(trg.referencedRecordField()))
                this.dispatch(src)
                this.proc.emitCall("bitvm::stfld" + refSuff, 0); // it does the decr itself, no mask
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

        getMask(args:Expr[])
        {
            Util.assert(args.length <= 8)
            var m = 0
            args.forEach((a, i) => {
                if (isRefExpr(a))
                    m |= (1 << i)
            })
            return m
        }

        emitAsString(e:Expr)
        {
            this.dispatch(e)
            var kn = e.getKind().getName().toLowerCase()
            if (kn == "string") {}
            else if (kn == "number" || kn == "boolean") {
                this.proc.emitCall(kn + "::to_string", 0)
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
            var op = this.proc.emit("LDPTR", 0);
            op.arg0 = lit;
            this.proc.emit("push {r1}", 0xb402);
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


            if (shm) {
                var mask = this.getMask(args)
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

                this.proc.emitCall(shm[1], mask)
            } else {
                var op = this.proc.emit("BL", 0)
                op.arg0 = this.procIndex(a);
                op.info = a.getName()
                Util.assert(!!op.arg0)
                if (args.length > 0) {
                    var len = args.length
                    Util.assert(0 <= len && len < 127);
                    this.proc.emit("add sp, #4*" + len, 0xb000 | len)
                    this.proc.currStack -= len
                }
                this.proc.emit("push {r0}", 0xb401);
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
                this.proc.emitCall(name, this.getMask(args));
            }

            var pkn = p.parentKind.getRoot().getName()

            if (p.parentKind.getRoot() == api.core.Collection &&
                isRefKind(p.parentKind.getParameter(0)))
                pkn = "RefCollection";

            if (e.args.length == 1 && p.getName() == "is invalid") {
                this.dispatch(e.args[0])
                this.proc.emitCall("bitvm:is_invalid", this.getMask(e.args));
            } else if (e.referencedData()) {
                this.globalIndex(e.referencedData()).emitLoad(this.proc)
            } else if (e.referencedLibrary()) {
                // TODO just ignore?
            } else if (e.args[0] && e.args[0].referencedRecord()) {
                var rrec = e.args[0].referencedRecord()
                if (p.getName() == "create") {
                    this.emitInt(rrec._compilerInfo.refsize);
                    this.emitInt(rrec._compilerInfo.size);
                    this.proc.emitCall("record::mk", 0);
                } else if (p.getName() == "invalid") {
                    this.emitInt(0)
                } else {
                    Util.oops("unhandled record operation: " + p.getName())
                }
            } else if (e.referencedRecordField()) {
                this.dispatch(e.args[0])
                this.emitInt(this.fieldIndex(e.referencedRecordField()))
                this.proc.emitCall("bitvm:ldfld" + (isRefKind(e.getKind()) ? "Ref" : ""), 0); // internal unref
            } else if (p.parentKind instanceof RecordEntryKind) {
                if (p.getName() == "equals") {
                    emitCall("number::eq", e.args)
                } else {
                    Util.oops("unhandled entry record operation: " + p.getName())
                }
            } else if (e.calledAction() || e.calledExtensionAction()) {
                this.handleActionCall(e);
            } else if (pkn == "Invalid") {
                this.emitInt(0);
            } else if ((e.getKind().getRoot() == api.core.Collection && e.args[0].getCalledProperty() &&
                        e.args[0].getCalledProperty().getName() == "Collection of")) {
                this.proc.emitCall(isRefKind(e.getKind().getParameter(0)) ? "refcollection::mk" : "collection::mk", 0);
            } else if (p == api.core.StringConcatProp) {
                this.emitAsString(e.args[0]);
                this.emitAsString(e.args[1]);
                this.proc.emitCall("string::concat_op", 3);
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
                    var op = this.proc.emit("LDPTR", 0);
                    op.arg0 = args[1].getLiteral()
                    this.binary.emitString(op.arg0, false)
                    this.proc.emit("push {r1}", 0xb402);
                    this.proc.emitCall(nm, 0)
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
                this.proc.emit("nop", 0x46c0);
            else
                this.dispatch(eh.parsed)
        }

        emitInt(v:number, keepInR0 = false)
        {
            this.proc.emitInt(v, keepInR0)
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
                            this.proc.emitInt(inf.value)
                        else if (inf.type == "F" && inf.args == 0)
                            this.proc.emitCall(l.enumVal, 0)
                        else
                            Util.oops("not valid enum: " + l.enumVal)
                    }
                } else if (l.data == "") {
                    this.proc.emitCall("string::mkEmpty", 0);
                } else {
                    var id = this.binary.emitString(l.data)
                    this.emitInt(id, true);
                    var op = this.proc.emit("LDPTR", 0);
                    op.arg0 = l.data;
                    op = this.proc.emit("BL", 0)
                    op.info = "bitvm::stringLiteral"
                    op.arg0 = lookupFunc(op.info)
                    Util.assert(!!op.arg0)
                }
            }
            else if (typeof l.data == "boolean") {
                this.emitInt(l.data ? 1 : 0)
            }
            else {
                Util.oops("invalid literal emit " + l.data)
            }
        }

        private finals:(()=>void)[] = [];

        emitInlineAction(inl:InlineAction)
        {
            var locs = AST.Compiler.computeCapturedLocals(inl);
            var inlproc = new Procedure()
            inlproc.argsInR5 = true
            this.binary.procs.push(inlproc);

            var refs  = locs.capturedLocals.filter(l => isRefKind(l.getKind()))
            var flats = locs.capturedLocals.filter(l => !isRefKind(l.getKind()))

            var caps = refs.concat(flats)

            this.emitInt(refs.length)
            this.emitInt(caps.length)
            var op = this.proc.emit("LDPTR", 0)
            op.arg0 = inlproc
            this.proc.emit("push {r1}", 0xb402);
            this.proc.emitCall("action::mk", 0)

            caps.forEach((l, i) => {
                this.emitInt(i)
                this.localIndex(l).emitLoad(this.proc)
                this.proc.emitCall("bitvm::stclo", 0)
                op = this.proc.emit("BL", 0)
                this.proc.emit("push {r0}", 0xb401);
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

                this.proc.emit("push {r5, lr}", 0xb520);
                this.proc.emit("mov r5, r1", 0x1d0d);
                this.proc.emit("LOCALS", 0);

                var ret = this.proc.mkLabel()
                inl._compilerBreakLabel = ret;
                this.dispatch(inl.body);
                this.proc.emitLbl(ret)

                Util.assert(this.proc.currStack == 0)

                this.proc.emit("POPLOCALS", 0);
                this.proc.emit("pop {r5, pc}", 0xbd20);
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
                    var after = this.proc.mkLabel();
                    this.proc.emitJmp(after, "JMPZ");
                    this.dispatch(b.body)
                    this.proc.emitLbl(after)
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
            this.proc.emitInt(0);
            idx.emitStore(this.proc);

            var top = this.proc.mkLabel()
            this.proc.emitLbl(top);
            var brk = this.proc.mkLabel();
            idx.emitLoad(this.proc);
            upper.emitLoad(this.proc);
            this.proc.emitCall("number::lt", 0);
            this.proc.emitJmp(brk, "JMPZ");

            var cont = this.proc.mkLabel();
            f._compilerBreakLabel = brk;
            f._compilerContinueLabel = cont;
            this.dispatch(f.body)

            this.proc.emitLbl(cont);
            idx.emitLoad(this.proc);
            this.emitInt(1);
            this.proc.emitCall("number::plus", 0);
            idx.emitStore(this.proc);
            Util.assert(this.proc.currStack == 0);
            this.proc.emitJmp(top);
            this.proc.emitLbl(brk);
        }

        visitForeach(f:Foreach)
        {
            //TODO
            Util.oops("foreach emit")
        }

        visitWhile(n:While)
        {
            var top = this.proc.mkLabel()
            this.proc.emitLbl(top);
            var brk = this.proc.mkLabel()
            this.dispatch(n.condition)
            this.proc.emitJmp(brk, "JMPZ");

            n._compilerBreakLabel = brk;
            n._compilerContinueLabel = top;
            this.dispatch(n.body)

            this.proc.emitJmp(top);
            this.proc.emitLbl(brk);
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
                    // will pop
                    this.proc.emitCall("bitvm::decr", 0);
                else
                    this.proc.emit("pop {r0}", 0xbc01);
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
            this.proc.emitLbl(ret)

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

            this.proc.emitClrs(retl ? retl.local : null, true);

            if (retl) {
                this.localIndex(retl.local).emitLoad(this.proc)
                this.proc.emit("pop {r0}", 0xbc01);
            }

            Util.assert(this.proc.currStack == 0)

            this.proc.emit("POPLOCALS", 0);
            this.proc.emit("pop {pc}", 0xbd00);
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

            this.proc.emit("push {lr}", 0xb500);

            this.proc.emit("LOCALS", 0); // this is only resolved later when we know how many locals there are

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
