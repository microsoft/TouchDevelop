///<reference path='refs.ts'/>

module TDev.AST.Thumb
{
    interface EmitResult {
        stack: number;
        opcode: number;
        error?: string;
        errorAt?: string;
    }

    var badNameError = emitErr("opcode name doesn't match", "<name>")

    class Instruction
    {
        public name:string;
        public args:string[];
        public friendlyFmt:string;

        constructor(format:string, public opcode:number, public mask:number)
        {
            Util.assert((opcode & mask) == opcode)

            this.friendlyFmt = format.replace(/\$\w+/g, m => {
                if (encoders[m])
                    return encoders[m].pretty
                return m
            })

            var words = tokenize(format)
            this.name = words[0]
            this.args = words.slice(1)
        }

        emit(bin:Binary, tokens:string[]):EmitResult
        {
            if (tokens[0] != this.name) return badNameError;
            var r = this.opcode;
            var j = 1;
            var stack = 0;

            for (var i = 0; i < this.args.length; ++i) {
                var formal = this.args[i]
                var actual = tokens[j++].toLowerCase()
                if (/^\$/.test(formal)) {
                    var enc = encoders[formal]
                    var v = null
                    if (enc.isRegister) {
                        v = registerNo(actual);
                        if (v == null) return emitErr("expecting register name", actual)
                    } else if (enc.isImmediate) {
                        actual = actual.replace(/^#/, "")
                        v = bin.parseOneInt(actual);
                        if (v == null) {
                            return emitErr("expecting number", actual)
                        } else {
                            if (this.opcode == 0xb000) // add sp, #imm
                                stack = v / 4;
                            else if (this.opcode == 0xb080) // sub sp, #imm
                                stack = -(v / 4);
                        }
                    } else if (enc.isRegList) {
                        if (actual != "{") return emitErr("expecting {", actual);
                        v = 0;
                        while (tokens[j] != "}") {
                            actual = tokens[j++];
                            if (!actual)
                                return emitErr("expecting }", tokens[j - 2])
                            var no = registerNo(actual);
                            if (no == null) return emitErr("expecting register name", actual)
                            v |= (1 << no);
                            if (this.opcode == 0xb400) // push
                                stack++;
                            else if (this.opcode == 0xbc00) // pop
                                stack--;
                            if (tokens[j] == ",") j++;
                        }
                        actual = tokens[j++]; // skip close brace
                    } else if (enc.isLabel) {
                        actual = actual.replace(/^#/, "")
                        if (/^[+-]?\d+$/.test(actual)) {
                            v = parseInt(actual, 10)
                        } else {
                            v = bin.getRelativeLabel(actual)
                            if (v == null) {
                                if (bin.finalEmit)
                                    return emitErr("unknown label", actual)
                                else
                                    v = 42
                            }
                        }
                    } else {
                        Util.die()
                    }
                    if (v == null) return emitErr("didn't understand it", actual); // shouldn't happen
                    v = enc.encode(v)
                    if (v == null) return emitErr("argument out of range or mis-aligned", actual);
                    Util.assert((r & v) == 0)
                    r |= v;
                } else if (formal == actual) {
                    // skip
                } else {
                    return emitErr("expecting " + formal, actual)
                }
            }

            if (tokens[j]) return emitErr("trailing tokens", tokens[j])

            return {
                stack: stack,
                opcode: r,
            }
        }

        toString()
        {
            return this.friendlyFmt;
        }
    }

    export interface AssemblyError
    {
        ctx:string;
        message:string;
    }

    export class Binary
    {
        constructor()
        {
        }

        public baseOffset:number;
        public finalEmit:boolean;
        private lines:string[];
        private currLineNo:number;
        private currLine:string;
        private errorCtx = "";
        public errors:AssemblyError[] = [];
        public buf:number[];
        private labels:StringMap<number> = {};
        private stackpointers:StringMap<number> = {};
        private stack = 0;

        private emitShort(op:number)
        {
            Util.assert(0 <= op && op <= 0xffff);
            this.buf.push(op);
        }

        private location()
        {
            return this.buf.length * 2;
        }

        public parseOneInt(s:string)
        {
            var mul = 1
            while (m = /^([^\*]*)\*(.*)$/.exec(s)) {
                var tmp = this.parseOneInt(m[1])
                if (tmp == null) return null;
                mul *= tmp;
                s = m[2]
            }

            if (/^-/.test(s)) {
                mul *= -1;
                s = s.slice(1)
            }

            var v:number = null

            var m = /^0x([a-f0-9]+)$/i.exec(s)
            if (m) v = parseInt(m[1], 16)

            m = /^0b([01]+)$/i.exec(s)
            if (m) v = parseInt(m[1], 2)

            m = /^(\d+)$/i.exec(s)
            if (m) v = parseInt(m[1], 10)

            m = /^(\w+)@(\d+)$/.exec(s)
            if (m) {
                if (mul != 1)
                    this.directiveError("multiplication not supported with saved stacks");
                if (this.stackpointers.hasOwnProperty(m[1]))
                    v = 4 * (this.stack - this.stackpointers[m[1]] + parseInt(m[2]))
                else
                    this.directiveError("saved stack not found")
            }

            if (v == null && this.labels.hasOwnProperty(s)) {
                v = this.labels[s] + this.baseOffset
            }

            if (v == null || isNaN(v)) return null;

            return v * mul;
        }

        public getRelativeLabel(s:string)
        {
            if (!this.labels.hasOwnProperty(s))
                return null
            return this.labels[s] - (this.location() + 4);
        }

        private align(n:number)
        {
            Util.assert(n == 2 || n == 4 || n == 8 || n == 16)
            while (this.location() % n != 0)
                this.emitShort(0);
        }

        private directiveError(msg:string)
        {
            this.errors.push({
                ctx: this.errorCtx,
                message: lf("Directive error: {0} at {1} (@{2})", msg, this.currLine, this.currLineNo)
            })
        }

        private emitString(l:string)
        {
            function byteAt(s:string, i:number) { return (s.charCodeAt(i) || 0) & 0xff }

            var m = /^\s*.\w+\s+(".*")\s*$/.exec(l)
            var s:string;
            if (!m || !(s = parseString(m[1]))) {
                this.directiveError("expecting string")
            } else {
                this.align(4);
                // l.length + 1 to NUL terminate
                for (var i = 0; i < l.length + 1; i += 2) {
                    this.emitShort( (byteAt(s, i*2+1) << 8) | byteAt(s, i*2) )
                }
            }
        }

        private parseNumber(words:string[]):number
        {
            var v = this.parseOneInt(words.shift())
            if (v == null) return null;
            return v;
        }

        private parseNumbers(words:string[])
        {
            words = words.slice(1)
            var nums:number[] = []
            while (true) {
                var n = this.parseNumber(words)
                if (n == null) {
                    this.directiveError("cannot parse number at " + words[0])
                    break;
                } else
                    nums.push(n)

                if (words[0] == ",") {
                    words.shift()
                } else if (words[0] == null) {
                    break;
                } else {
                    this.directiveError("expecting number, got " + words[0])
                    break;
                }
            }
            return nums
        }

        private emitSpace(words:string[])
        {
            var nums = this.parseNumbers(words);
            if (nums.length == 1)
                nums.push(0)
            if (nums.length != 2)
                this.directiveError("expecting one or two numbers")
            else if (nums[0] % 2 != 0)
                this.directiveError("only even space supported")
            else {
                var f = nums[1] & 0xff;
                f = f | (f << 8)
                for (var i = 0; i < nums[0]; i += 2)
                    this.emitShort(f)
            }
        }
        
        private handleDirective(l:string, words:string[])
        {
            var expectOne = () => {
                if (words.length != 2)
                    this.directiveError("expecting one argument");
            }

            var num0 = this.parseOneInt(words[1]);

            switch (words[0]) {
                case ".ascii":
                case ".asciz":
                case ".string":
                    this.emitString(l);
                    break;
                case ".align":
                    expectOne();
                    if (num0 != null) {
                        if (num0 == 0) return;
                        if (num0 <= 4) {
                            this.align(1 << num0);
                        } else {
                            this.directiveError("expecting 1, 2, 3 or 4 (for 2, 4, 8, or 16 byte alignment)")
                        }
                    } else this.directiveError("expecting number");
                    break;
                case ".balign":
                    expectOne();
                    if (num0 != null) {
                        if (num0 == 1) return;
                        if (num0 == 2 || num0 == 4 || num0 == 8 || num0 == 16) {
                            this.align(num0);
                        } else {
                            this.directiveError("expecting 2, 4, 8, or 16")
                        }
                    } else this.directiveError("expecting number");
                    break;
                case ".hword":
                case ".short":
                case ".2bytes":
                    this.parseNumbers(words).forEach(n => {
                        // we allow negative numbers
                        if (-0x8000 <= n && n <= 0xffff)
                            this.emitShort(n & 0xffff)
                        else
                            this.directiveError("expecting int16")
                    })
                    break;
                case ".word":
                case ".4bytes":
                    this.parseNumbers(words).forEach(n => {
                        // we allow negative numbers
                        if (-0x80000000 <= n && n <= 0xffffffff) {
                            this.emitShort(n & 0xffff)
                            this.emitShort((n >> 16) & 0xffff)
                        } else {
                            this.directiveError("expecting int32")
                        }
                    })
                    break;

                case ".skip":
                case ".space":
                    this.emitSpace(words);
                    break;

                // The usage for this is as follows:
                // push {...}
                // @stackstart locals   ; locals := sp
                // ...
                // ldr r0, [pc, locals@3] ; load local number 3
                // ...
                // @stackempty locals ; expect an empty stack here
                case "@stackstart":
                    expectOne();
                    this.stackpointers[words[1]] = this.stack;
                    break;

                case "@stackempty":
                    if (this.stackpointers[words[1]] == null)
                        this.directiveError("no such saved stack")
                    else if (this.stackpointers[words[1]] != this.stack)
                        this.directiveError("stack mismatch")
                    break;

                case ".section":
                case ".global":
                    this.stackpointers = {};
                    this.stack = 0;
                    break;

                case ".text":
                case ".cpu":
                case ".fpu":
                case ".eabi_attribute":
                case ".code":
                case ".file":
                case ".thumb_func":
                case ".type":
                    break;

                case "@":
                    // @ sp needed
                    break;

                default:
                    if (/^\.cfi_/.test(words[0])) {
                        // ignore
                    } else {
                        this.directiveError("unknown directive")
                    }
                    break;
            }
        }

        private handleInstruction(words:string[])
        {
            for (var i = 0; i < instructions.length; ++i) {
                var op = instructions[i].emit(this, words)
                if (!op.error) {
                    this.stack += op.stack;
                    if (this.stack < 0)
                        this.directiveError("stack underflow")
                    this.emitShort(op.opcode);
                    return;
                }
            }

            var w0 = words[0].toLowerCase().replace(/s$/, "").replace(/[^a-z]/g, "")

            var msg = lf("Error assembling: {0} (@{1})\n", this.currLine, this.currLineNo)
            var possibilities = instructions.filter(i => i.name == w0 || i.name == w0 + "s")
            if (possibilities.length > 0) {
                possibilities.forEach(i => {
                    var err = i.emit(this, words)
                    msg += lf("   Maybe: {0} ({1} at '{2}')\n", i.toString(), err.error, err.errorAt)
                })
            }

            this.errors.push({ message: msg, ctx: this.errorCtx })
        }

        private iterLines()
        {
            this.currLineNo = 0;
            this.lines.forEach(l => {
                this.currLineNo++;
                this.currLine = l;

                var words = tokenize(l)
                if (!words) return;

                var m = /^([\.\w]+):$/.exec(words[0])
                
                if (m) {
                    if (this.finalEmit) {
                        var curr = this.labels[m[1]]
                        if (curr == null)
                            Util.die()
                        Util.assert(curr == this.location())
                    } else {
                        if (this.labels.hasOwnProperty(m[1]))
                            this.directiveError("label redefinition")
                        else
                            this.labels[m[1]] = this.location();
                    }
                    words.shift();
                }

                if (/^[\.@]/.test(words[0])) {
                    this.handleDirective(l, words);
                } else {
                    this.handleInstruction(words);
                }

            })
        }

        public emit(text:string)
        {
            init();

            Util.assert(this.buf == null);

            this.lines = text.split(/\n/);
            this.buf = [];
            this.labels = {};
            this.iterLines();

            if (this.errors.length > 0)
                return;

            this.buf = [];
            this.finalEmit = true;
            this.iterLines();
        }
    }

    function registerNo(actual:string)
    {
        if (!actual) return null;
        switch (actual) {
            case "pc": actual = "r15"; break;
            case "lr": actual = "r14"; break;
            case "sp": actual = "r13"; break;
        }
        var m = /^r(\d+)$/.exec(actual)
        if (m) {
            var r = parseInt(m[1], 10)
            if (0 <= r && r < 16)
                return r;
        }
        return null;
    }

    interface Encoder {
        name: string;
        pretty: string;
        encode: (v:number) => number;
        isRegister: boolean;
        isImmediate: boolean;
        isRegList: boolean;
        isLabel: boolean;
    }

    var instructions:Instruction[];
    var encoders:StringMap<Encoder>;

    function tokenize(line:string):string[]
    {
        line = line.replace(/[\[\]\!\{\},]/g, m => " " + m + " ")
        var words = line.split(/\s/).filter(s => !!s)
        if (!words[0]) return null
        if (/^;/.test(words[0])) return null
        for (var i = 1; i < words.length; ++i) {
            if (/^;/.test(words[i]))
                return words.slice(0, i);
        }
        return words
    }
    
    function init()
    {
        if (instructions) return;

        encoders = {};
        var addEnc = (n:string, p:string, e:(v:number) => number) => {
            var ee = { 
                name:n, 
                pretty:p, 
                encode:e, 
                isRegister: /^\$r\d/.test(n), 
                isImmediate: /^\$i\d/.test(n),
                isRegList: /^\$rl\d/.test(n),
                isLabel: /^\$l[a-z]/.test(n),
            }
            encoders[n] = ee
            return ee
        }

        var inrange = (max:number, v:number, e:number) => {
            if (Math.floor(v) != v) return null;
            if (v < 0) return null;
            if (v > max) return null;
            return e;
        }

        // Registers
        // $r0 - bits 2:1:0
        // $r1 - bits 5:4:3
        // $r2 - bits 7:2:1:0
        // $r3 - bits 6:5:4:3
        // $r4 - bits 8:7:6
        // $r5 - bits 10:9:8

        addEnc("$r0", "R0-7", v => inrange(7, v, v))
        addEnc("$r1", "R0-7", v => inrange(7, v, v << 3))
        addEnc("$r2", "R0-15", v => inrange(15, v, (v & 7) | ((v & 8) << 4)))
        addEnc("$r3", "R0-15", v => inrange(15, v, v << 3))
        addEnc("$r4", "R0-7", v => inrange(7, v, v << 6))
        addEnc("$r5", "R0-7", v => inrange(7, v, v << 8))

        // Immdiates:
        // $i0 - bits 7-0
        // $i1 - bits 7-0 * 4
        // $i2 - bits 6-0 * 4
        // $i3 - bits 8-6
        // $i4 - bits 10-6
        // $i5 - bits 10-6 * 4
        // $i6 - bits 10-6, 0 is 32
        // $i7 - bits 10-6 * 2

        addEnc("$i0", "#0-255", v => inrange(255, v, v))
        addEnc("$i1", "#0-1020", v => inrange(255, v/4, v >> 2))
        addEnc("$i2", "#0-510", v => inrange(127, v/4, v >> 2))
        addEnc("$i3", "#0-7", v => inrange(7, v, v << 6))
        addEnc("$i4", "#0-31", v => inrange(31, v, v << 6))
        addEnc("$i5", "#0-124", v => inrange(31, v/4, (v >> 2) << 6))
        addEnc("$i6", "#1-32", v => v == 0 ? null : v == 32 ? 0 : inrange(31, v, v << 6))
        addEnc("$i7", "#0-62", v => inrange(31, v/2, (v >> 1) << 6))

        addEnc("$rl0", "{R0-7,...}", v => inrange(255, v, v))
        addEnc("$rl1", "{LR,R0-7,...}", v => (v & 0x4000) ? inrange(255, (v & ~0x4000), 0x100 | (v&0xff)) : inrange(255, v, v))
        addEnc("$rl2", "{PC,R0-7,...}", v => (v & 0x8000) ? inrange(255, (v & ~0x8000), 0x100 | (v&0xff)) : inrange(255, v, v))

        var inrangeSigned = (max:number, v:number, e:number) => {
            if (Math.floor(v) != v) return null;
            if (v < -(max+1)) return null;
            if (v > max) return null;
            var mask = (max << 1) | 1
            return e & mask;
        }

        addEnc("$la", "LABEL", v => inrange(255, v/4, v >> 2))
        addEnc("$lb", "LABEL", v => inrangeSigned(127, v/2, v >> 1))
        addEnc("$lb11", "LABEL", v => inrangeSigned(1023, v/2, v >> 1))

        instructions = []
        var add = (name, code, mask) => {
            instructions.push(new Instruction(name, code, mask))
        }

        //add("nop",                   0xbf00, 0xffff);  // we use mov r8,r8 as gcc

        add("adcs  $r0, $r1",        0x4140, 0xffc0);
        add("add   $r2, $r3",        0x4400, 0xff00);
        add("add   $r5, pc, $i1",    0xa000, 0xf800);
        add("add   $r5, sp, $i1",    0xa800, 0xf800);
        add("add   sp, $i2",         0xb000, 0xff80);
        add("adds  $r0, $r1, $i3",   0x1c00, 0xfe00);
        add("adds  $r0, $r1, $r4",   0x1800, 0xfe00);
        add("adds  $r5, $i0",        0x3000, 0xf800);
        add("adr   $r5, $la",        0xa000, 0xf800);
        add("ands  $r0, $r1",        0x4000, 0xffc0);
        add("asrs  $r0, $r1",        0x4100, 0xffc0);
        add("asrs  $r0, $r1, $i6",   0x1000, 0xf800);
        add("bics  $r0, $r1",        0x4380, 0xffc0);
        add("bkpt  $i0",             0xbe00, 0xff00);
        add("blx   $r3",             0x4780, 0xff87);
        add("bx    $r3",             0x4700, 0xff80);
        add("cmn   $r0, $r1",        0x42c0, 0xffc0);
        add("cmp   $r0, $r1",        0x4280, 0xffc0);
        add("cmp   $r2, $r3",        0x4500, 0xff00);
        add("cmp   $r5, $i0",        0x2800, 0xf800);
        add("eors  $r0, $r1",        0x4040, 0xffc0);
        add("ldmia $r5!, $rl0",      0xc800, 0xf800);
        add("ldmia $r5, $rl0",       0xc800, 0xf800);
        add("ldr   $r0, [$r1, $i5]", 0x6800, 0xf800);
        add("ldr   $r0, [$r1, $r4]", 0x5800, 0xfe00);
        add("ldr   $r5, [pc, $i1]",  0x4800, 0xf800);
        //add("ldr   $r5, $la",        0x4800, 0xf800);
        add("ldr   $r5, [sp, $i1]",  0x9800, 0xf800);
        add("ldrb  $r0, [$r1, $i4]", 0x7800, 0xf800);
        add("ldrb  $r0, [$r1, $r4]", 0x5c00, 0xfe00);
        add("ldrh  $r0, [$r1, $i7]", 0x8800, 0xf800);
        add("ldrh  $r0, [$r1, $r4]", 0x5a00, 0xfe00);
        add("ldrsb $r0, [$r1, $r4]", 0x5600, 0xfe00);
        add("ldrsh $r0, [$r1, $r4]", 0x5e00, 0xfe00);
        add("lsls  $r0, $r1",        0x4080, 0xffc0);
        add("lsls  $r0, $r1, $i4",   0x0000, 0xf800);
        add("lsrs  $r0, $r1",        0x40c0, 0xffc0);
        add("lsrs  $r0, $r1, $i6",   0x0800, 0xf800);
        add("mov   $r0, $r1",        0x4600, 0xffc0);
        //add("mov   $r2, $r3",        0x4600, 0xff00);
        add("movs  $r0, $r1",        0x0000, 0xffc0);
        add("movs  $r5, $i0",        0x2000, 0xf800);
        add("muls  $r0, $r1",        0x4340, 0xffc0);
        add("mvns  $r0, $r1",        0x43c0, 0xffc0);
        add("negs  $r0, $r1",        0x4240, 0xffc0);
        add("nop",                   0x46c0, 0xffff); // mov r8, r8
        add("orrs  $r0, $r1",        0x4300, 0xffc0);
        add("pop   $rl2",            0xbc00, 0xfe00);
        add("push  $rl1",            0xb400, 0xfe00);
        add("rev   $r0, $r1",        0xba00, 0xffc0);
        add("rev16 $r0, $r1",        0xba40, 0xffc0);
        add("revsh $r0, $r1",        0xbac0, 0xffc0);
        add("rors  $r0, $r1",        0x41c0, 0xffc0);
        add("sbcs  $r0, $r1",        0x4180, 0xffc0);
        add("sev",                   0xbf40, 0xffff);
        add("stmia $r5!, $rl0",      0xc000, 0xf800);
        add("str   $r0, [$r1, $i5]", 0x6000, 0xf800);
        add("str   $r0, [$r1, $r4]", 0x5000, 0xfe00);
        add("str   $r5, [sp, $i1]",  0x9000, 0xf800);
        add("strb  $r0, [$r1, $i4]", 0x7000, 0xf800);
        add("strb  $r0, [$r1, $r4]", 0x5400, 0xfe00);
        add("strh  $r0, [$r1, $i7]", 0x8000, 0xf800);
        add("strh  $r0, [$r1, $r4]", 0x5200, 0xfe00);
        add("sub   sp, $i2",         0xb080, 0xff80);
        add("subs  $r0, $r1, $i3",   0x1e00, 0xfe00);
        add("subs  $r0, $r1, $r4",   0x1a00, 0xfe00);
        add("subs  $r5, $i0",        0x3800, 0xf800);
        add("svc   $i0",             0xdf00, 0xff00);
        add("sxtb  $r0, $r1",        0xb240, 0xffc0);
        add("sxth  $r0, $r1",        0xb200, 0xffc0);
        add("tst   $r0, $r1",        0x4200, 0xffc0);
        add("udf   $i0",             0xde00, 0xff00);
        add("uxtb  $r0, $r1",        0xb2c0, 0xffc0);
        add("uxth  $r0, $r1",        0xb280, 0xffc0);
        add("wfe",                   0xbf20, 0xffff);
        add("wfi",                   0xbf30, 0xffff);
        add("yield",                 0xbf10, 0xffff);

        add("beq   $lb",             0xd000, 0xff00);
        add("bne   $lb",             0xd100, 0xff00);
        add("bcs   $lb",             0xd200, 0xff00);
        add("bcc   $lb",             0xd300, 0xff00);
        add("bmi   $lb",             0xd400, 0xff00);
        add("bpl   $lb",             0xd500, 0xff00);
        add("bvs   $lb",             0xd600, 0xff00);
        add("bvc   $lb",             0xd700, 0xff00);
        add("bhi   $lb",             0xd800, 0xff00);
        add("bls   $lb",             0xd900, 0xff00);
        add("bge   $lb",             0xda00, 0xff00);
        add("blt   $lb",             0xdb00, 0xff00);
        add("bgt   $lb",             0xdc00, 0xff00);
        add("ble   $lb",             0xdd00, 0xff00);
        add("bhs   $lb",             0xd200, 0xff00); // cs
        add("blo   $lb",             0xd300, 0xff00); // cc

        add("b     $lb11",           0xe000, 0xf800);
        add("bal   $lb11",           0xe000, 0xf800);

    }

    function parseString(s:string)
    {
        var toks = AST.Lexer.tokenize(s)
        if (toks.length != 1 ||
            toks[0].category != AST.TokenType.String)
            return null
        return toks[0].data
    }

    function emitErr(msg:string, tok:string)
    {
        return {
            stack: null,
            opcode: null,
            error: msg,
            errorAt: tok
        }
    }

    export function testOne(op:string, code:number)
    {
        var b = new Binary()
        b.emit(op)
        Util.assert(b.buf[0] == code)
    }

    function expectError(asm:string)
    {
        var b = new Binary();
        b.emit(asm);
        if (b.errors.length == 0) {
            Util.oops("ASMTEST: expecting error for: " + asm)
        }
        // console.log(b.errors[0].message)
    }

    export function tohex(n:number)
    {
        if (n < 0 || n > 0xffff)
            return ("0x" + n.toString(16)).toLowerCase()
        else
            return ("0x" + ("000" + n.toString(16)).slice(-4)).toLowerCase()
    }

    function expect(disasm:string)
    {
        var exp = []
        var asm = disasm.replace(/^([0-9a-fA-F]{4})\s/gm, (w, n) => {
            exp.push(parseInt(n, 16))
            return ""
        })

        var b = new Binary();
        b.emit(asm);
        if (b.errors.length > 0) {
            console.log(b.errors[0].message)
            Util.oops("ASMTEST: not expecting errors")
        }

        if (b.buf.length != exp.length)
            Util.oops("ASMTEST: wrong buf len")
        for (var i = 0; i < exp.length; ++i) {
            if (b.buf[i] != exp[i])
                Util.oops("ASMTEST: wrong buf content, exp:" + tohex(exp[i]) + ", got: " + tohex(b.buf[i]))
        }
    }

    export function test()
    {
        expectError("lsl r0, r0, #8");
        expectError("push {pc,lr}");
        expectError("push {r17}");
        expectError("mov r0, r1 foo");
        expectError("movs r14, #100");
        expectError("push {r0");
        expectError("push lr,r0}");
        expectError("pop {lr,r0}");
        expectError("b #+11");
        expectError("b #+102400");
        expectError("bne undefined_label");
        expectError(".foobar");

        expect(
            "0200    lsls    r0, r0, #8\n" +
            "b500    push    {lr}\n" +
            "2064    movs    r0, #100        ; 0x64\n" +
            "b401    push    {r0}\n" +
            "bc08    pop     {r3}\n" +
            "b501    push    {r0, lr}\n" +
            "4770    bx      lr\n" +
            "0000    .balign 4\n" +
            "e6c0    .word   -72000\n" +
            "fffe\n" )

        expect(
            "4291       cmp     r1, r2\n" +
            "d100       bne     l6\n" +
            "e000       b       l8\n" +
            "1840   l6: adds    r0, r0, r1\n" +
            "4718   l8: bx      r3\n")

        expect(
            "         @stackstart base\n" +
            "b403     push    {r0, r1}\n" +
            "         @stackstart locals\n" +
            "9801     ldr     r0, [sp, locals@1]\n" +
            "b401     push    {r0}\n" +
            "9802     ldr     r0, [sp, locals@1]\n" +
            "bc01     pop     {r0}\n" +
            "         @stackempty locals\n" +
            "9901     ldr     r1, [sp, locals@1]\n" +
            "9102     str     r1, [sp, base@0]\n" +
            "         @stackempty locals\n" +
            "b082     sub     sp, #8\n" +
            "         @stackempty base\n")
    }

}
