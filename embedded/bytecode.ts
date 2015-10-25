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
    push {rA} pop {rB} -> mov rB, rA ?
    str X; ldr X -> str X
    */

    interface FuncInfo {
        name: string;
        type: string;
        args: number;
        value: number;
    }

    var funcInfo:StringMap<FuncInfo>;
    var hex:string[];
    var hexStartAddr:number;
    var hexStartIdx:number;
    var dirtyLines = 0;

    function swapBytes(str:string)
    {
        var r = ""
        for (var i = 0; i < str.length; i += 2)
            r = str[i] + str[i + 1] + r
        Util.assert(i == str.length)
        return r
    }

    function fillValues(jsinf:any)
    {
        funcInfo = {};
        var funs:FuncInfo[] = jsinf.functions;

        Object.keys(jsinf.enums).forEach(k => {
            funcInfo[k] = {
                name: k,
                type: "E",
                args: 0,
                value: jsinf.enums[k]
            }
        })

        dirtyLines = 1;

        for (var i = hexStartIdx + 1; i < hex.length; ++i) {
            var m = /^:10(....)00(.{16})/.exec(hex[i])

            if (!m) continue;

            dirtyLines++;

            var s = hex[i].slice(9)
            while (s.length >= 8) {
                var inf = funs.shift()
                if (!inf) return;
                funcInfo[inf.name] = inf;
                inf.value = parseInt(swapBytes(s.slice(0, 8)), 16) & 0xfffffffe
                s = s.slice(8)
            }
        }

        Util.die();
    }

    function setup()
    {
        if (funcInfo) return; // already done

        var inf = (<any>TDev).bytecodeInfo
        hex = Cloud.isFota() ? inf.fotahex : inf.hex;

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

        if (!hexStartAddr)
            Util.oops("No hex start")

        fillValues(inf)
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

    export function lookupFunctionAddr(name:string)
    {
        var inf = lookupFunc(name)
        if (inf)
            return inf.value - hexStartAddr
        return null
    }

    export function tohex(n:number)
    {
        if (n < 0 || n > 0xffff)
            return ("0x" + n.toString(16)).toLowerCase()
        else
            return ("0x" + ("000" + n.toString(16)).slice(-4)).toLowerCase()
    }


    export class Location
    {
        isarg = false;

        constructor(public index:number, public def:Decl = null)
        {
        }

        toString()
        {
            var n = ""
            if (this.def) n += this.def.getName()
            if (this.isarg) n = "ARG " + n
            if (this.isRef()) n = "REF " + n
            if (this.isByRefLocal()) n = "BYREF " + n
            return "[" + n + "]"
        }

        isRef()
        {
            return this.def && isRefKind(this.def.getKind())
        }

        refSuff()
        {
            if (this.isRef()) return "Ref"
            else return ""
        }
        

        isByRefLocal()
        {
            return this.def instanceof LocalDef && (<LocalDef>this.def).isByRef()
        }

        emitStoreByRef(proc:Procedure)
        {
            Util.assert(this.def instanceof LocalDef)

            if (this.isByRefLocal()) {
                this.emitLoadLocal(proc);
                proc.emit("pop {r1}");
                proc.emitCallRaw("bitvm::stloc" + (this.isRef() ? "Ref" : "")); // unref internal
            } else {
                this.emitStore(proc)
            }
        }

        asmref(proc:Procedure)
        {
            if (this.isarg) {
                var idx = proc.args.length - this.index - 1
                return "[sp, args@" + idx + "] ; " + this.toString()
            } else {
                var idx = this.index
                return "[sp, locals@" + idx + "] ; " + this.toString()
            }
        }

        emitStoreCore(proc:Procedure)
        {
            proc.emit("str r0, " + this.asmref(proc))
        }

        emitStore(proc:Procedure)
        {
            if (this.isarg)
                Util.oops("store for arg")

            if (this.def instanceof GlobalDef) {
                proc.emitInt(this.index)
                proc.emitCall("bitvm::stglb" + this.refSuff(), 0); // unref internal
            } else {
                Util.assert(!this.isByRefLocal())
                if (this.isRef()) {
                    this.emitLoadCore(proc);
                    proc.emitCallRaw("bitvm::decr");
                }
                proc.emit("pop {r0}");
                this.emitStoreCore(proc)
            }
        }

        emitLoadCore(proc:Procedure)
        {
            proc.emit("ldr r0, " + this.asmref(proc))
        }

        emitLoadByRef(proc:Procedure)
        {
            if (this.isByRefLocal()) {
                this.emitLoadLocal(proc);
                proc.emitCallRaw("bitvm::ldloc" + this.refSuff())
                proc.emit("push {r0}");
            } else this.emitLoad(proc);
        }

        emitLoadLocal(proc:Procedure)
        {
            if (this.isarg && proc.argsInR5) {
                Util.assert(0 <= this.index && this.index < 32)
                proc.emit("ldr r0, [r5, #4*" + this.index + "]")
            } else {
                this.emitLoadCore(proc)
            }
        }

        emitLoad(proc:Procedure, direct = false)
        {
            if (this.def instanceof GlobalDef) {
                proc.emitInt(this.index)
                proc.emitCall("bitvm::ldglb" + this.refSuff(), 0); // unref internal
            } else {
                Util.assert(direct || !this.isByRefLocal())
                this.emitLoadLocal(proc);
                proc.emit("push {r0}");
                if (this.isRef() || this.isByRefLocal()) {
                    proc.emitCallRaw("bitvm::incr");
                }
            }
        }

        emitClrIfRef(proc:Procedure)
        {
            // Util.assert(!this.isarg)
            Util.assert(!(this.def instanceof GlobalDef))
            if (this.isRef() || this.isByRefLocal()) {
                this.emitLoadCore(proc);
                proc.emitCallRaw("bitvm::decr");
            }
        }
    }

    export class Procedure
    {
        numArgs = 0;
        hasReturn = false;
        action:Action;
        argsInR5 = false;
        seqNo:number;
        lblNo = 0;
        label:string;

        prebody = "";
        body = "";
        locals:Location[] = [];
        args:Location[] = [];

        toString()
        {
            return this.prebody + this.body
        }

        mkLocal(def:LocalDef = null)
        {
            var l = new Location(this.locals.length, def)
            this.locals.push(l)
            return l
        }

        peepHole()
        {
            /* TODO
               TODO remember that used labels are instructions, push{r0} lbl: pop{r0} cannot be eliminated
            var res = []
            for (var i = 0; i < this.body.length; ++i) {
                var op = this.body[i]
                var op2 = this.body[i + 1]

                if (op2) {
                    if (op.name == "push {r0}" && op2.name == "pop {r0}") {
                        i++;
                        continue
                    }

                    if (op.name == "B" && op.arg0 == op2) {
                        continue; // skip B to next instruction
                    }
                }

                res.push(op)
            }

            this.body = res
            */
        }

        expandOpcodes()
        {
            this.peepHole()
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

        emitCallRaw(name:string)
        {
            this.emit("bl " + name + " ; (raw)")
        }

        emitCall(name:string, mask:number)
        {
            var inf = lookupFunc(name)
            Util.assert(!!inf, "unimplemented function: " + name)

            Util.assert(inf.args <= 4)

            // TODO check on the order, optimize?
            if (inf.args >= 4)
                this.emit("pop {r3}");
            if (inf.args >= 3)
                this.emit("pop {r2}");
            if (inf.args >= 2)
                this.emit("pop {r1}");
            if (inf.args >= 1)
                this.emit("pop {r0}");

            var numMask = 0

            if (inf.type == "F" && mask != 0) {
                // reserve space for return val
                // TODO use @startstack
                this.emit("push {r0}");
            }

            if (mask & (1 << 0)) {
                numMask++
                this.emit("push {r0}");
            }
            if (mask & (1 << 1)) {
                numMask++
                this.emit("push {r1}");
            }
            if (mask & (1 << 2)) {
                numMask++
                this.emit("push {r2}");
            }
            if (mask & (1 << 3)) {
                numMask++
                this.emit("push {r3}");
            }

            Util.assert((mask & ~0xf) == 0)

            this.emit("bl " + name)

            if (inf.type == "F") {
                if (mask == 0)
                    this.emit("push {r0}");
                else {
                    this.emit("str r0, [sp, #4*" + numMask + "]")
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

        emitJmp(trg:string, name = "JMP")
        {
            if (name == "JMPZ") {
                this.emit("pop {r0}");
                this.emit("cmp r0, #0")
                this.emit("bne #0") // this is to *skip* the following 'b' instruction; bne itself has a very short range
            } else if (name == "JMPNZ") {
                this.emit("pop {r0}");
                this.emit("cmp r0, #0")
                this.emit("beq #0")
            } else if (name == "JMP") {
                // ok
            } else {
                Util.oops("bad jmp");
            }

            this.emit("b " + trg)
        }

        mkLabel(root:string):string
        {
            return "." + root + "." + this.seqNo + "." + this.lblNo++;
        }

        emitLbl(lbl:string)
        {
            this.emit(lbl + ":")
        }

        emit(name:string)
        {
            this.body += asmline(name)
        }

        emitMov(v:number)
        {
            Util.assert(0 <= v && v <= 255)
            this.emit("movs r0, #" + v)
        }

        emitAdd(v:number)
        {
            Util.assert(0 <= v && v <= 255)
            this.emit("adds r0, #" + v)
        }

        emitLdPtr(lbl:string, push = false)
        {
            Util.assert(!!lbl)
            this.emit("movs r0, " + lbl + "@hi   ; ldptr " + lbl)
            this.emit("lsls r0, r0, #8")
            this.emit("adds r0, " + lbl + "@lo   ; endldptr");
            if (push)
                this.emit("push {r0}")
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
                this.emitMov(n)
            } else if (n <= 0xffff) {
                this.emitMov((n >> 8) & 0xff)
                this.emit("lsls r0, r0, #8")
                this.emitAdd(n & 0xff)
            } else {
                this.emitMov((n >> 24) & 0xff)
                this.emit("lsls r0, r0, #8")
                this.emitAdd((n >> 16) & 0xff)
                this.emit("lsls r0, r0, #8")
                this.emitAdd((n >> 8) & 0xff)
                this.emit("lsls r0, r0, #8")
                this.emitAdd((n >> 0) & 0xff)
            }
            if (isNeg) {
                this.emit("neg r0, r0")
            }

            if (!keepInR0)
                this.emit("push {r0}")
        }

        stackEmpty()
        {
            this.emit("@stackempty locals");
        }

        pushLocals()
        {
            Util.assert(this.prebody == "")
            this.prebody = this.body
            this.body = ""
        }

        popLocals()
        {
            var suff = this.body
            this.body = this.prebody

            var len = this.locals.length

            if (len > 0) this.emit("movs r0, #0")
            this.locals.forEach(l => {
                this.emit("push {r0} ; loc")
            })
            this.emit("@stackmark locals")

            this.body += suff

            Util.assert(0 <= len && len < 127);
            if (len > 0) this.emit("add sp, #4*" + len + " ; pop locals " + len)
        }
    }

    export class Binary
    {
        procs:Procedure[] = [];
        globals:Location[] = [];
        buf:number[];
        csource = "";

        strings:StringMap<string> = {};
        stringsBody = "";
        lblNo = 0;

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

            Util.assert(this.buf.length < 32000)

            var i = hexStartIdx;
            var ptr = 0
            var togo = 32000 / 8;
            while (ptr < this.buf.length) {
                if (myhex[i] == null) Util.die();
                var m = /^:10(..)(..)00(.*)(..)$/.exec(myhex[i])
                if (!m) { i++; continue; }
                Util.assert(i <= hexStartIdx + dirtyLines || /^0+$/.test(m[3]))


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

        addProc(proc:Procedure)
        {
            this.procs.push(proc)
            proc.seqNo = this.procs.length
            proc.label = "_" + (proc.action ? proc.action.getName().replace(/[^\w]/g, "") : "inline") + "_" + proc.seqNo
        }


        stringLiteral(s:string)
        {
            var r = "\""
            for (var i = 0; i < s.length; ++i) {
                // TODO generate warning when seeing high character ?
                var c = s.charCodeAt(i) & 0xff
                var cc = String.fromCharCode(c)
                if (cc == "\\" || cc == "\"")
                    r += "\\" + cc
                else if (cc == "\n")
                    r += "\\n"
                else if (c <= 0xf)
                    r += "\\x0" + c.toString(16)
                else if (c < 32 || c > 127)
                    r += "\\x" + c.toString(16)
                else
                    r += cc;
            }
            return r + "\""
        }
         
        emitLiteral(s:string)
        {
            this.stringsBody += s + "\n"
        }

        emitString(s:string):string
        {
            if (this.strings.hasOwnProperty(s))
                return this.strings[s]

            var lbl = "_str" + this.lblNo++
            this.strings[s] = lbl;
            this.emitLiteral(".balign 4");
            this.emitLiteral(lbl + "meta: .short 0xffff, " + s.length)
            this.emitLiteral(lbl + ": .string " + this.stringLiteral(s))
            return lbl
        }

        emit(s:string)
        {
            this.csource += asmline(s)
        }

        serialize()
        {
            Util.assert(this.csource == "");

            this.emit("; start");
            this.emit(".short 0x4205");
            this.emit(".short " + this.globals.length);
            this.emit(".space 12"); // future use and 16 byte alignment

            this.procs.forEach(p => {
                this.csource += "\n"
                this.csource += p.body
            })

            this.csource += this.stringsBody
        }

        addSource(meta:string, blob:Uint8Array)
        {
            var metablob = Util.stringToUint8Array(Util.toUTF8(meta))
            var totallen = metablob.length + blob.length

            if (totallen > 40000) {
                return false;
            }

            this.emit(".balign 16");
            this.emit(".short 0x1441");
            this.emit(".short 0x2f0e");
            this.emit(".short 0x2fb8");
            this.emit(".short 0xbba2");
            this.emit(".short " + metablob.length);
            this.emit(".short " + blob.length);
            this.emit(".short 0"); // future use
            this.emit(".short 0"); // future use

            var str = "_stored_program: .string \""

            var addblob = (b:Uint8Array) => {
                for (var i = 0; i < b.length; ++i) {
                    var v = b[i] & 0xff
                    if (v <= 0xf)
                        str += "\\x0" + v.toString(16)
                    else
                        str += "\\x" + v.toString(16)
                }
            }

            addblob(metablob)
            addblob(blob)

            str += "\""

            this.emit(str)

            return true;
        }

        static extractSource(hexfile:string)
        {
            var metaLen = 0
            var textLen = 0
            var toGo = 0
            var buf:number[];
            var ptr = 0;
            hexfile.split(/\r?\n/).forEach(ln => {
                var m = /^:10....0041140E2FB82FA2BB(....)(....)(....)(....)(..)/.exec(ln)
                if (m) {
                    metaLen = parseInt(swapBytes(m[1]), 16)
                    textLen = parseInt(swapBytes(m[2]), 16)
                    toGo = metaLen + textLen
                    buf = <any>new Uint8Array(toGo)
                } else if (toGo > 0) {
                    m = /^:10....00(.*)(..)$/.exec(ln)
                    var k = m[1]
                    while (toGo > 0 && k.length > 0) {
                        buf[ptr++] = parseInt(k[0] + k[1], 16)
                        k = k.slice(2)
                        toGo--
                    }
                }
            })
            Util.assert(toGo == 0 && ptr == buf.length)
            var bufmeta = new Uint8Array(metaLen)
            var buftext = new Uint8Array(textLen)
            for (var i = 0; i < metaLen; ++i)
                bufmeta[i] = buf[i];
            for (var i = 0; i < textLen; ++i)
                buftext[i] = buf[metaLen + i];
            // iOS Safari doesn't seem to have slice() on Uint8Array
            return {
                meta: Util.fromUTF8Bytes(<any>bufmeta),
                text: buftext
            }
        }

        assemble()
        {
            Thumb.test(); // just in case
            var b = new Thumb.Binary();
            b.lookupExternalLabel = lookupFunctionAddr;
            // b.throwOnError = true;
            b.emit(this.csource);
            if (b.errors.length > 0) {
                var userErrors = ""
                b.errors.forEach(e => {
                    var m = /^user(\d+)/.exec(e.scope)
                    if (m) {
                        // This generally shouldn't happen, but it may for certin kind of global 
                        // errors - jump range and label redefinitions
                        var no = parseInt(m[1])
                        var proc = this.procs.filter(p => p.seqNo == no)[0]
                        if (proc && proc.action)
                            userErrors += lf("At function " + proc.action.getName() + ":\n")
                        else
                            userErrors += lf("At inline assembly:\n")
                        userErrors += e.message
                    }
                })

                if (userErrors) {
                    ModalDialog.showText(userErrors, lf("errors in inline assembly"))
                } else {
                    throw new Error(b.errors[0].message)
                }
            } else {
                this.buf = b.buf;
            }
        }
    }

    export class ReachabilityVisitor
        extends PreCompiler
    {
        useAction(a:Action)
        {
            if (a.getShimName() != null && !a._compilerInlineBody) {
                a.body.stmts.forEach(s => {
                    var str = AST.getEmbeddedLangaugeToken(s)
                    if (str && (<ExprStmt>s).expr.parsed.getCalledProperty().getName() == "thumb") {
                        a._compilerInlineBody = s;
                    }
                })
                if (!a._compilerInlineBody)
                    return
            }
            super.useAction(a)
        }
    }

    export class Compiler
        extends NodeVisitor 
    {
        public binary = new Binary();
        private proc:Procedure;
        private numStmts = 1;

        constructor(private app:App)
        {
            super()
        }

        private shouldCompile(d:Decl)
        {
            return d.visitorState === true;
        }

        public run()
        {
            setup();

            if (AST.TypeChecker.tcApp(this.app) > 0) {
                HTML.showProgressNotification(lf("Your script has errors! Just saving the source."))
                return;
            }

            var prev = Script
            try {
                Script = this.app
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
            } finally {
                Script = prev;
            }
        }

        public serialize(shortForm:boolean, metainfo:string, blob:Uint8Array)
        {
            shortForm = false; // this doesn't work yet
            var src = "";

            if (this.binary.procs.length == 0) {
                shortForm = true // which is great in case there are errors in the program
            } else {
                this.binary.serialize()
                src = this.binary.csource
            }
            var sourceSaved = this.binary.addSource(metainfo, blob);
            this.binary.assemble()

            var res = {
                dataurl: null,
                csource: src,
                sourceSaved: sourceSaved
            }

            if (!this.binary.buf)
                return res;

            var hex = this.binary.patchHex(shortForm).join("\r\n") + "\r\n";
            res.dataurl = "data:application/x-microbit-hex;base64," + Util.base64Encode(hex)
            return res;
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
                this.localIndex(trg.referencedLocal()).emitStoreByRef(this.proc);
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
                case "0": lit += "0,"; x++; break;
                case "1": lit += "1,"; x++; break;
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


            var lbl = "_img" + this.binary.lblNo++

            this.binary.emitLiteral(".balign 4");
            this.binary.emitLiteral(lbl + ": .short 0xffff")
            this.binary.emitLiteral("        .byte " + w + ", " + h)
            if (lit.length % 4 != 0)
                lit += "42" // pad
            this.binary.emitLiteral("        .byte " + lit)
            this.proc.emitLdPtr(lbl, true);
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

            Util.assert(args.length == a.getInParameters().length)

            if (a != aa) {
                var params = a.getParameters().slice(-a.getInParameters().length)
                params.forEach(p => {
                    var sv = p.getStringValues()
                    if (!sv) return
                    var emap = (<any>sv).enumMap
                    if (emap) {
                        var v = emap[args[0].getStringLiteral()]
                        Util.assert(v != null)
                        args[0].enumVal = v;
                    }
                })
            }

            var shm = a.getShimName();
            var hasret = !!aa.getOutParameters()[0]

            if (shm == "TD_NOOP") {
                Util.assert(!hasret)
                return
            }

            if (/^micro_bit::(createImage|createReadOnlyImage|showAnimation|showLeds|plotLeds)$/.test(shm)) {
                Util.assert(args[0].getLiteral() != null)
                this.emitImageLiteral(args[0].getLiteral())
                args.shift()
                args.forEach(a => this.dispatch(a))
                // fake it, so we don't get assert down below and mask is correct
                args = [<Expr>mkLit(0)].concat(args)
            } else {
                args.forEach(a => this.dispatch(a))
            }

            if (shm == "TD_ID") {
                Util.assert(args.length == 1)
                // argument already on stack
                return;
            }


            if (shm != null) {
                var mask = this.getMask(args)
                var msg = "{shim:" + shm + "} from " + a.getName()
                if (!shm)
                    Util.oops("called " + msg + " (with empty {shim:}")

                var inf = lookupFunc(shm)

                if (a._compilerInlineBody) {
                    Util.assert(!inf);
                    funcInfo[shm] = {
                        name: shm,
                        type: hasret ? "F" : "P",
                        args: a.getInParameters().length,
                        idx: 0,
                        value: 0
                    }
                    try {
                        this.proc.emitCall(shm, mask)
                    } finally {
                        delete funcInfo[shm]
                    }
                } else {
                    if (!inf)
                        Util.oops("no such " + msg)

                    if (!hasret) {
                        Util.assert(inf.type == "P", "expecting procedure for " + msg);
                    } else {
                        Util.assert(inf.type == "F", "expecting function for " + msg);
                    }
                    Util.assert(args.length == inf.args, "argument number mismatch: " + args.length + " vs " + inf.args + " in " + msg)

                    this.proc.emitCall(shm, mask)
                }
            } else {
                this.proc.emit("bl " + this.procIndex(a).label)
                if (args.length > 0) {
                    var len = args.length
                    Util.assert(0 <= len && len < 127);
                    this.proc.emit("add sp, #4*" + len)
                }
                if (hasret)
                    this.proc.emit("push {r0}");
            }
        }

        emitLazyOp(op:string, arg0:Expr, arg1:Expr)
        {
            this.dispatch(arg0)

            var lblEnd = this.proc.mkLabel("lazy")

            if (op == "and") {
                this.proc.emitJmp(lblEnd, "JMPZ")
            } else if (op == "or") {
                this.proc.emitJmp(lblEnd, "JMPNZ")
            } else {
                Util.die()
            }

            this.dispatch(arg1)
            this.proc.emit("pop {r0}")
            this.proc.emitLbl(lblEnd);
            this.proc.emit("push {r0}")
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

            if (e.args.length == 1 && p.getName() == "is invalid") {
                this.dispatch(e.args[0])
                this.proc.emitCall("bitvm::is_invalid", this.getMask(e.args));
            } else if (e.referencedData()) {
                this.globalIndex(e.referencedData()).emitLoad(this.proc)
            } else if (e.referencedLibrary()) {
                this.emitInt(0)
            } else if (e.calledAction() || e.calledExtensionAction()) {
                this.handleActionCall(e);
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
                this.proc.emitCall("bitvm::ldfld" + (isRefKind(e.getKind()) ? "Ref" : ""), 0); // internal unref
            } else if (p.parentKind instanceof RecordEntryKind) {
                if (p.getName() == "equals") {
                    emitCall("number::eq", e.args)
                } else {
                    Util.oops("unhandled entry record operation: " + p.getName())
                }
            } else if (pkn == "Invalid") {
                this.emitInt(0);
            } else if ((e.getKind().getRoot() == api.core.Collection && e.args[0].getCalledProperty() &&
                        e.args[0].getCalledProperty().getName() == "Collection of")) {
                var argK = e.getKind().getParameter(0)
                if (argK == api.core.String)
                    this.proc.emitInt(3);
                else if (isRefKind(argK))
                    this.proc.emitInt(1);
                else
                    this.proc.emitInt(0);
                this.proc.emitCall("collection::mk", 0);
            } else if (p == api.core.StringConcatProp) {
                this.emitAsString(e.args[0]);
                this.emitAsString(e.args[1]);
                this.proc.emitCall("string::concat_op", 3);
            } else if (pkn == "Boolean" && /^(and|or)$/.test(p.getName())) {
                Util.assert(e.args.length == 2)
                this.emitLazyOp(p.getName(), e.args[0], e.args[1])
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
                    var lbl = this.binary.emitString(args[1].getLiteral())
                    this.proc.emitLdPtr(lbl, true)
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
            var ai = eh.assignmentInfo()
            if (ai && ai.definedVars)
                ai.definedVars.forEach(l => {
                    if (l.isByRef()) {
                        var li = this.localIndex(l)
                        li.emitClrIfRef(this.proc) // in case there was something already there
                        this.proc.emitCallRaw("bitvm::mkloc" + li.refSuff())
                        li.emitStoreCore(this.proc)
                    }
                })
            if (eh.isPlaceholder())
                this.proc.emit("nop");
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
                    var lbl = this.binary.emitString(l.data)
                    this.proc.emitLdPtr(lbl + "meta", false);
                    this.proc.emitCallRaw("bitvm::stringData")
                    this.proc.emit("push {r0}");
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
            var inlproc = new Procedure()
            inlproc.argsInR5 = true
            this.binary.addProc(inlproc);
            var isRef = (l:LocalDef) => l.isByRef() || isRefKind(l.getKind())

            var refs  = inl.closure.filter(l => isRef(l))
            var flats = inl.closure.filter(l => !isRef(l))

            var caps = refs.concat(flats)

            this.emitInt(refs.length)
            this.emitInt(caps.length)
            this.proc.emitLdPtr(inlproc.label, true);
            this.proc.emitCall("action::mk", 0)

            caps.forEach((l, i) => {
                this.emitInt(i)
                this.localIndex(l).emitLoad(this.proc, true) // direct load
                this.proc.emitCall("bitvm::stclo", 0)
                // already done by emitCall
                // this.proc.emit("push {r0}");
            })

            Util.assert(inl.inParameters.length == 0)

            this.finals.push(() => {
                this.proc = inlproc

                this.proc.args = caps.map((p, i) => {
                    var l = new Location(i, p);
                    l.isarg = true
                    return l
                })

                inl.allLocals.forEach(l => {
                    l._lastWriteLocation = null;
                    if (caps.indexOf(l) == -1)
                        this.proc.mkLocal(l)
                })

                this.proc.emit(".section code");
                this.proc.emit(".balign 4");
                this.proc.emitLbl(this.proc.label);
                this.proc.emit(".short 0xffff, 0x0000   ; action literal");
                this.proc.emit("@stackmark inlfunc");
                this.proc.emit("push {r5, lr}");
                this.proc.emit("adds r5, r1, #0");
                this.proc.pushLocals();

                var ret = this.proc.mkLabel("inlret")
                inl._compilerBreakLabel = ret;
                this.dispatch(inl.body);
                this.proc.emitLbl(ret)

                this.proc.popLocals();
                this.proc.emit("pop {r5, pc}");
                this.proc.emit("@stackempty inlfunc");
            })
        }

        visitThingRef(t:ThingRef)
        {
            var d = t.def
            if (d instanceof LocalDef) {
                if (d._lastWriteLocation instanceof InlineAction) {
                    this.emitInlineAction(<InlineAction>d._lastWriteLocation)
                } else {
                    this.localIndex(d).emitLoadByRef(this.proc);
                }
            } else if (d instanceof SingletonDef) {
                this.emitInt(0)
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

            var afterall = this.proc.mkLabel("afterif");

            i.branches.forEach((b, k) => {
                if (!b.condition) {
                    this.dispatch(b.body)
                } else {
                    this.dispatch(b.condition)
                    var after = this.proc.mkLabel("else");
                    this.proc.emitJmp(after, "JMPZ");
                    this.dispatch(b.body)
                    this.proc.emitJmp(afterall)
                    this.proc.emitLbl(after)
                }
            })

            this.proc.emitLbl(afterall)
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

            var top = this.proc.mkLabel("fortop")
            this.proc.emitLbl(top);
            var brk = this.proc.mkLabel("forbrk");
            idx.emitLoad(this.proc);
            upper.emitLoad(this.proc);
            this.proc.emitCall("number::lt", 0);
            this.proc.emitJmp(brk, "JMPZ");

            var cont = this.proc.mkLabel("forcnt");
            f._compilerBreakLabel = brk;
            f._compilerContinueLabel = cont;
            this.dispatch(f.body)

            this.proc.emitLbl(cont);
            idx.emitLoad(this.proc);
            this.emitInt(1);
            this.proc.emitCall("number::plus", 0);
            idx.emitStore(this.proc);
            this.proc.stackEmpty();
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
            var top = this.proc.mkLabel("whiletop")
            this.proc.emitLbl(top);
            var brk = this.proc.mkLabel("whilebrk")
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
            if (k == api.core.Nothing) {
                this.proc.stackEmpty();
            } else {
                if (isRefKind(k))
                    // will pop
                    this.proc.emitCall("bitvm::decr", 0);
                else
                    this.proc.emit("pop {r0}");
                this.proc.stackEmpty();
            }
        }

        visitCodeBlock(b:CodeBlock)
        {
            this.proc.stackEmpty();

            b.stmts.forEach(s => {
                this.numStmts++;
                this.dispatch(s);
                this.proc.stackEmpty();
            })
        }

        visitAction(a:Action)
        {
            this.numStmts++;

            this.proc = this.procIndex(a);

            if (a.getShimName() != null) {
                var body = AST.getEmbeddedLangaugeToken(a._compilerInlineBody)
                Util.assert(body != null)
                Util.assert(body.getStringLiteral() != null)
                this.proc.emit(body.getStringLiteral())
                this.proc.emit("@stackempty func");
                this.proc.emit("@scope");
                return
            }

            var ret = this.proc.mkLabel("actret")
            a._compilerBreakLabel = ret;
            this.dispatch(a.body)
            this.proc.emitLbl(ret)

            this.proc.stackEmpty();

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
                var li = this.localIndex(retl.local);
                Util.assert(!li.isByRefLocal())
                li.emitLoadCore(this.proc)
            }

            this.proc.popLocals();
            this.proc.emit("pop {pc}");
            this.proc.emit("@stackempty func");
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
            this.binary.addProc(p)

            var shimname = a.getShimName()
            if (shimname != null) {
                Util.assert(!!a._compilerInlineBody)

                this.proc.label = shimname

                this.proc.emit(".section code");
                this.proc.emitLbl(this.proc.label);
                this.proc.emit("@scope user" + p.seqNo)
                this.proc.emit("@stackmark func");
                return
            }


            var inparms = a.getInParameters().map(p => p.local)
            this.proc.args = inparms.map((p, i) => {
                var l = new Location(i, p);
                l.isarg = true
                return l
            })

            this.proc.emit(".section code");
            this.proc.emitLbl(this.proc.label);
            this.proc.emit("@stackmark func");
            this.proc.emit("@stackmark args");
            this.proc.emit("push {lr}");

            this.proc.pushLocals();

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

    function lintThumb(act:Action, asm:string)
    {
        setup();

        var shimname = act.getShimName();

        var b = new Thumb.Binary();
        if (lookupFunc(shimname))
            b.pushError(lf("app->thumb inline body not allowed in {shim:{0}} (already defined in runtime)", shimname))
        if (!/^\w+$/.test(shimname))
            b.pushError(lf("invalid characters in shim name: {shim:{0}}", shimname))
        if (act.getInParameters().length > 4)
            b.pushError(lf("inline shims support only up to 4 arguments"));

        if (b.errors.length > 0)
            return b.errors;

        var code =
            ".section code\n" +
            "@stackmark func\n" +
            shimname + ":\n" +
            "@scope user\n" +
            asm + "\n" +
            "@stackempty func\n" +
            "@scope\n"

        b.lookupExternalLabel = lookupFunctionAddr;
        b.throwOnError = false;
        b.inlineMode = true;
        b.emit(code)

        return b.errors;
    }

    TypeChecker.lintThumb = lintThumb;

    function asmline(s:string)
    {
        if (!/(^\s)|(:$)/.test(s))
            s = "    " + s
        return s + "\n"
    }
}
