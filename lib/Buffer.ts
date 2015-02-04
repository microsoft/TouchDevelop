///<reference path='refs.ts'/>

module TDev.RT {
    //? Contains binary data
    //@ stem("buf")
    export class Buffer
        extends RTValue
    {
        public buffer:Uint8Array; // this may also be CanvasPixelData
        public imageData:ImageData;

        static fromString(s:string, encoding:string)
        {
            function bin(b:string) {
                if (!b) return undefined;
                return Buffer.fromTypedArray(Util.stringToUint8Array(b))
            }

            function hex(s: string) {
                var prev = -1
                var buf: Uint8Array = null;
                var len = 0;

                for (var iter = 0; iter < 2; ++iter) {
                    for (var i = 0; i < s.length; ++i) {
                        var c = s.charCodeAt(i);
                        var v = 0;
                        if (48 <= c && c <= 57)
                            v = c - 48;
                        else if (97 <= c && c <= 102)
                            v = c - 97 + 10;
                        else if (65 <= c && c <= 70)
                            v = c - 65 + 10;
                        else if (/^[\s\r\n-,.=]$/.test(s.charAt(i)))
                            continue;
                        else
                            return undefined;
                        if (prev == -1)
                            prev = v * 16;
                        else {
                            prev += v;
                            if (buf) buf[len++] = prev;
                            else len++;
                            prev = -1;
                        }
                    }
                    if (buf) return Buffer.fromTypedArray(buf)
                    prev = -1;
                    buf = new Uint8Array(len);
                    len = 0;
                }
            }

            switch (encoding) {
            case "base64":
                return bin(Util.base64Decode(s))
            case "hex":
                return hex(s);
            case "binary":
                return bin(s);
            case "utf8":
                return bin(Util.toUTF8(s))
            case "utf16le":
                return bin(Util.toUTF16LE(s))
            default:
                return undefined;
            }
        }

        static fromImageData(id:ImageData)
        {
            var r = Buffer.fromTypedArray(<any>id.data)
            r.imageData = id
            return r;
        }

        static fromTypedArray(a:Uint8Array)
        {
            var r = new (<any> Buffer)(); //TS9
            r.buffer = a;
            return r;
        }

        static mk(size:number)
        {
            return this.fromTypedArray(new Uint8Array(size));
        }

        private needSubarray()
        {
            // IE doesn't support subarray() method on CanvasPixelData
            // Node.js doesn't have it on Buffer
            if (this.buffer.subarray) return;
            var newBuf = new Uint8Array(this.buffer.length)
            for (var i = 0; i < newBuf.length; ++i) newBuf[i] = this.buffer[i];
            this.buffer = newBuf
            this.imageData = null
        }

        //? Read a binary number at `offset`
        //@ [format].deflStrings("int8", "uint8", "int16", "uint16", "int32", "uint32")
        //@ [endian].deflStrings("le", "be")
        public read_number(offset:number, format:string, endian:string) : number
        {
            var v = 0;
            var b = this.buffer
            var max = 0
            var size = 1

            if (endian == "le") {
                switch (format) {
                case "int8":
                    max = 127
                case "uint8":
                    v = b[offset];
                    break;
                case "int16":
                    max = 32767
                case "uint16":
                    size = 2
                    v = (b[offset + 1] << 8) + b[offset];
                    break;
                case "int32":
                    max = 2147483647
                case "uint32":
                    size = 4
                    v = b[offset + 3] * (1 << 24) + (b[offset + 2] << 16) + (b[offset + 1] << 8) + b[offset];
                    break;
                default:
                    Util.userError(lf("unknown number format: {0}", format));
                }
            } else if (endian == "be") {
                switch (format) {
                case "int8":
                    max = 127
                case "uint8":
                    v = b[offset];
                    break;
                case "int16":
                    max = 32767
                case "uint16":
                    size = 2
                    v = (b[offset] << 8) + b[offset + 1];
                    break;
                case "int32":
                    max = 2147483647
                case "uint32":
                    size = 4
                    v = b[offset] * (1 << 24) + (b[offset + 1] << 16) + (b[offset + 2] << 8) + b[offset + 3];
                    break;
                default:
                    Util.userError(lf("unknown number format: {0}", format));
                }
            } else {
                Util.userError(lf("unknown number endian: {0}", endian));
            }

            if (offset < 0 || offset + size > b.length)
                Util.userError(lf("offset outside of range: {0} (buffer length {1})", offset, b.length))

            if (v === undefined || isNaN(v)) return undefined

            if (max && v > max)
                v = v - max * 2 - 2;

            return v
        }

        //? Write a binary number `value` at `offset`
        //@ [format].deflStrings("int8", "uint8", "int16", "uint16", "int32", "uint32")
        //@ [endian].deflStrings("le", "be")
        public write_number(value:number, offset:number, format:string, endian:string)
        {
            var v = value
            var b = this.buffer
            var min = 0
            var max = 0
            var size = 0;

            if (Math.floor(v) != v)
                Util.userError(lf("number {0} is fractional", v))

            switch (format) {
            case "int8":   size = 1; min = -0x80;       max = 0x7f;       break;
            case "uint8":  size = 1; max =  0xff;                         break;
            case "int16":  size = 2; min = -0x8000;     max = 0x7fff;     break;
            case "uint16": size = 2; max =  0xffff;                       break;
            case "int32":  size = 4; min = -0x80000000; max = 0x7fffffff; break;
            case "uint32": size = 4; max =  0xffffffff;                   break;
            default:
                Util.userError(lf("unknown number format: {0}", format));
            }


            if (v < min || v > max)
                Util.userError(lf("number {0} is outside range of {1}", v, format))

            v |= 0;

            if (endian == "be") {
                for (var i = size - 1; i >= 0; i--) {
                    b[offset + i] = (v & 0xff)
                    v >>= 8;
                }
            } else if (endian == "le") {
                for (var i = 0; i < size; ++i) {
                    b[offset + i] = (v & 0xff)
                    v >>= 8;
                }
            } else {
                Util.userError(lf("unknown number endian: {0}", endian));
            }
        }

        //? Set byte at `index` to `value`
        //@ writesMutable
        public set(index:number, value:number):void
        {
            this.buffer[index] = value;
        }

        //? Get byte at `index`
        //@ readsMutable
        public at(index:number):number
        {
            return this.buffer[index];
        }

        //? Return the number of bytes in the buffer
        //@ robust
        public count():number
        {
            return this.buffer.length;
        }

        //? Return a new buffer consiting of the current and `other` in sequence
        public concat(other:Buffer) : Buffer
        {
            var r = Buffer.mk(this.count() + other.count())
            r.copy_from(0, this)
            r.copy_from(this.count(), other)
            return r
        }

        //? Creates a read-write view of the current buffer.
        //@ writesMutable
        public sub_buffer(start:number, length:number) : Buffer
        {
            var len = this.count()
            start = Util.intBetween(0, start, len)
            length = Util.intBetween(0, length, len - start)

            if (start == 0 && length == len) return this;

            this.needSubarray();
            return Buffer.fromTypedArray(this.buffer.subarray(start, start + length));
        }

        //? Fills the buffer with random values
        //@ writesMutable
        public fill_random()
        {
            Random.bytes(this.buffer);
        }

        //? Sets all bytes in buffer to `value`
        //@ writesMutable
        public fill(value:number)
        {
            var buf = this.buffer
            for (var i = 0; i < buf.length; ++i)
                buf[i] = value;
        }

        //? Copies all bytes from `source` to current buffer at `offset`
        //@ writesMutable
        public copy_from(target_offset:number, source:Buffer)
        {
            var dst = this.buffer;
            var src = source.buffer;
            var len = Math.min(src.length, this.count() - target_offset)
            if (target_offset == 0)
                for (var i = 0; i < len; ++i)
                    dst[i] = src[i];
            else
                for (var i = 0; i < len; ++i)
                    dst[target_offset + i] = src[i];
        }

        //? Copies all bytes from `source` to current buffer at `offset`
        //@ readsMutable
        public clone()
        {
            var res = Buffer.mk(this.count())
            res.copy_from(0, this)
            return res;
        }

        //? Convert the buffer to a string
        //@ [encoding].deflStrings("base64", "hex", "binary", "utf8", "utf16le")
        //@ readsMutable
        public to_string(encoding:string):string
        {
            function hex(inp:Uint8Array) {
                var hexDigits = "0123456789abcdef";
                var len = inp.length;
                var res = "";
                for (var i = 0; i < len; ++i) {
                    var v = inp[i]
                    res += hexDigits[(v>>4)&0xf] + hexDigits[v&0xf];
                }
                return res;
            }

            function utf16(inp:Uint8Array) {
                if (inp.length & 1) return undefined;
                var len = inp.length
                var res = ""
                for (var i = 0; i < len; i += 2)
                    res += String.fromCharCode(inp[i] | (inp[i+1]<<8));
                return res;
            }

            switch (encoding) {
            case "base64":
                return Util.base64EncodeBytes(<any>this.buffer);
            case "hex":
                return hex(this.buffer);
            case "binary":
                return Util.uint8ArrayToString(this.buffer);
            case "utf8":
                Util.userError(lf("utf8 not implemented yet; sorry"));
                // TODO
                return undefined;
            case "utf16le":
                return utf16(this.buffer);
            default:
                return undefined;
            }
        }
    }
}
