## ARM Thumb assembler support

### Usage

* define a TD function taking up to 4 parameters
* add a comment at the top saying: `{shim:myfunction}`
* this will define assembly function at label `myfunction:`
* do not define `myfunction` label yourself
* use `app->thumb` to define the body of the function
* remember to do a `bx lr` or `pop {lr}` at the end
* parameters are in `r0` to `r3`; return value goes in `r0`
* you can call runtime functions, for example `bl micro_bit::showNumber` will work

### Supported instructions

The following instructions are supported:

```
adcs  Rd, Rn
add   Rd, Rn
add   Rd, pc, #0-1020
add   Rd, sp, #0-1020
add   sp, #0-510
adds  Rd, #0-255
adds  Rd, Rn, #0-7
adds  Rd, Rn, Rm
adr   Rd, LABEL
ands  Rd, Rn
asrs  Rd, Rn
asrs  Rd, Rn, #1-32
bics  Rd, Rn
bkpt  #0-255
cmn   Rd, Rn
cmp   Rd, #0-255
cmp   Rd, Rn
eors  Rd, Rn
ldmia Rd!, {Rn,...}
ldmia Rd, {Rn,...}
ldr   Rd, [Rn, #0-124]
ldr   Rd, [Rn, Rm]
ldr   Rd, [pc, #0-1020]
ldr   Rd, [sp, #0-1020]
ldrb  Rd, [Rn, #0-31]
ldrb  Rd, [Rn, Rm]
ldrh  Rd, [Rn, #0-62]
ldrh  Rd, [Rn, Rm]
ldrsb Rd, [Rn, Rm]
ldrsh Rd, [Rn, Rm]
lsls  Rd, Rn
lsls  Rd, Rn, #0-31
lsrs  Rd, Rn
lsrs  Rd, Rn, #1-32
mov   Rd, Rn
movs  Rd, #0-255
movs  Rd, Rn
muls  Rd, Rn
mvns  Rd, Rn
negs  Rd, Rn
nop
orrs  Rd, Rn
pop   {PC,Rd,...}
push  {LR,Rd,...}
rev   Rd, Rn
rev16 Rd, Rn
revsh Rd, Rn
rors  Rd, Rn
sbcs  Rd, Rn
sev
stmia Rd!, {Rn,...}
str   Rd, [Rn, #0-124]
str   Rd, [Rn, Rm]
str   Rd, [sp, #0-1020]
strb  Rd, [Rn, #0-31]
strb  Rd, [Rn, Rm]
strh  Rd, [Rn, #0-62]
strh  Rd, [Rn, Rm]
sub   sp, #0-510
subs  Rd, #0-255
subs  Rd, Rn, #0-7
subs  Rd, Rn, Rm
svc   #0-255
sxtb  Rd, Rn
sxth  Rd, Rn
tst   Rd, Rn
udf   #0-255
uxtb  Rd, Rn
uxth  Rd, Rn
wfe
wfi
yield
```

And branch instructions:

```
bx    Rd
blx   Rd
bl    LABEL
b     LABEL
```

Conditional branches:

```
bmi   LABEL
bne   LABEL
bpl   LABEL
bvc   LABEL
bvs   LABEL
bal   LABEL
bcc   LABEL
bcs   LABEL
beq   LABEL
bge   LABEL
bgt   LABEL
bhi   LABEL
bhs   LABEL
ble   LABEL
blo   LABEL
bls   LABEL
blt   LABEL
```

### Registers

Generally speaking, stick to `R0-R7` plus `PC`, `SP` and `LR`. `R8-R13` will
work with a few instructions but not many.

### GCC

GCC, prior to 5.0 (including the 4.9 shipped with Yotta), uses legacy assembly
syntax when emitting ARM Thumb1 (i.e., for `-mcortex-m0`).  This assembly will
not work with the TD inline assembler without fixing it up. In particular, GCC
insists on skipping the `s` suffix if `adds`, `subs` etc.  GCC 5.0 is reported
to have `-masm-syntax-unified` which can be used together with with `-S`.


### See also

[Thumb 16-bit Instruction Set Quick Reference Card](http://infocenter.arm.com/help/topic/com.arm.doc.qrc0006e/QRC0006_UAL16.pdf)
is very useful.

