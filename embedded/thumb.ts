///<reference path='refs.ts'/>

module TDev.AST.Thumb
{
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

        emit(tokens:string[])
        {
            if (tokens[0] != this.name) return null;
            var r = this.opcode;
            var j = 1;

            for (var i = 0; i < this.args.length; ++i) {
                var formal = this.args[i]
                var actual = tokens[j++].toLowerCase()
                if (/^\$/.test(formal)) {
                    var enc = encoders[formal]
                    var v = null
                    if (enc.isRegister) {
                        v = registerNo(actual);
                    } else if (enc.isImmediate) {
                        actual = actual.replace(/^#/, "")
                        var mul = 1
                        while (m = /^(\d+)\*(.*)$/.exec(actual)) {
                            mul *= parseInt(m[1])
                            actual = m[2]
                        }
                        var m = /^\d+$/.exec(actual)
                        if (m)
                            v = mul * parseInt(actual)
                    } else if (enc.isRegList) {
                        if (actual != "{") return null;
                        v = 0;
                        while (tokens[j] != "}") {
                            var no = registerNo(tokens[j++])
                            if (no == null) return null;
                            v |= (1 << no);
                        }
                        j++; // skip close brace
                    } else if (enc.isLabel) {
                        actual = actual.replace(/^#/, "")
                        if (/^[+-]?\d+$/.test(actual)) {
                            v = parseInt(actual)
                        } else {
                            // TODO
                            return null
                        }
                    } else {
                        Util.die()
                    }
                    if (v == null) return null;
                    v = enc.encode(v)
                    if (v == null) return null;
                    Util.assert((r & v) == 0)
                    r |= v;
                } else if (formal == actual) {
                    // skip
                } else {
                    return null
                }
            }

            if (tokens[j]) return null

            return r
        }

        toString()
        {
            return this.friendlyFmt;
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
        if (m) return parseInt(m[1])
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
        line = line.replace(/[\[\]\!\{\}]/g, m => " " + m + " ")
        var words = line.split(/[\s,]/).filter(s => !!s)
        if (!words[0]) return null
        if (/^;/.test(words[0])) return null
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
        add("mov   $r2, $r3",        0x4600, 0xff00);
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

    function assemble(text:string)
    {
        init();

        var buf = []

        text.split(/\n/).forEach(l => {
            var words = tokenize(l)
            if (!words) return;

            for (var i = 0; i < instructions.length; ++i) {
                var op = instructions[i].emit(words)
                if (op != null) {
                    buf.push(op)
                    return;
                }
            }

            var w0 = words[0].toLowerCase().replace(/s$/, "").replace(/[^a-z]/g, "")

            var msg = lf("Error encoding: {0}\n", l)
            var possibilities = instructions.filter(i => i.name == w0 || i.name == w0 + "s")
            if (possibilities.length > 0) {
                possibilities.forEach(i => msg += lf("   Maybe: {0}\n", i.toString()))
            }
            console.log(msg)
        })

        // console.log(buf.map(Bytecode.tohex).join(", "))

        return buf;

    }

    export function testOne(op:string, code:number)
    {
        var buf = assemble(op)
        Util.assert(buf[0] == code)
    }

    export function test()
    {
        init();
        assemble(
            "lsls r0, r0, #8\n" +
            "push {lr}\n" +
            "mov r0, r1\n" +
            "movs r0, #100\n" +
            "push {r0}\n" +
            "push {lr,r0}\n" +
            "pop {lr,r0}\n" +
            "b #+12\n" +
            "bne #-12\n" +
            ""
            )
    }
}


