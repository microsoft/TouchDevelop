///<reference path='refs.ts'/>

module TDev.Random {

    var sha256_k = new Uint32Array([
           0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
           0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
           0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
           0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
           0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
           0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
           0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
           0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
           ])

    function rotr(v:number, b:number)
    {
        return (v >>> b) | (v << (32 - b));
    }

    function sha256round(hs:Uint32Array, w:Uint32Array)
    {
        Util.assert(hs.length == 8);
        Util.assert(w.length == 64);

        for (var i = 16; i < 64; ++i) {
            var s0 = rotr(w[i-15], 7) ^ rotr(w[i-15], 18) ^ (w[i-15] >>> 3);
            var s1 = rotr(w[i-2], 17) ^ rotr(w[i-2], 19) ^ (w[i-2] >>> 10);
            w[i] = (w[i-16] + s0 + w[i-7] + s1) | 0;
        }

        var a = hs[0];
        var b = hs[1];
        var c = hs[2];
        var d = hs[3];
        var e = hs[4];
        var f = hs[5];
        var g = hs[6];
        var h = hs[7];

        for (var i = 0; i < 64; ++i) {
            var s1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)
            var ch = (e & f) ^ (~e & g)
            var temp1 = h + s1 + ch + sha256_k[i] + w[i]
            var s0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)
            var maj = (a & b) ^ (a & c) ^ (b & c)
            var temp2 = s0 + maj

            h = g
            g = f
            f = e
            e = d + temp1
            d = c
            c = b
            b = a
            a = temp1 + temp2
        }

        hs[0] += a
        hs[1] += b
        hs[2] += c
        hs[3] += d
        hs[4] += e
        hs[5] += f
        hs[6] += g
        hs[7] += h
    }

    export function sha256buffer(buf:Uint8Array)
    {
        var h = new Uint32Array(8);
        h[0] = 0x6a09e667
        h[1] = 0xbb67ae85
        h[2] = 0x3c6ef372
        h[3] = 0xa54ff53a
        h[4] = 0x510e527f
        h[5] = 0x9b05688c
        h[6] = 0x1f83d9ab
        h[7] = 0x5be0cd19

        var work = new Uint32Array(64);

        var chunkLen = 16 * 4;

        function addBuf(buf:Uint8Array) {
            var end = buf.length - (chunkLen - 1)
            for (var i = 0; i < end; i += chunkLen) {
                for (var j = 0; j < 16; j++) {
                    var off = (j << 2) + i
                    work[j] = (buf[off] << 24) | (buf[off + 1] << 16) | (buf[off + 2] << 8) | buf[off + 3]
                }
                sha256round(h, work)
            }
        }

        addBuf(buf)

        var padSize = 64 - (buf.length + 9) % 64
        if (padSize == 64) padSize = 0
        var endPos = buf.length - (buf.length % chunkLen)
        var padBuf = new Uint8Array((buf.length - endPos) + 1 + padSize + 8)
        var dst = 0
        while (endPos < buf.length) padBuf[dst++] = buf[endPos++]
        padBuf[dst++] = 0x80
        while (padSize-- > 0)
            padBuf[dst++] = 0x00
        var len = buf.length * 8
        dst = padBuf.length
        while (len > 0) {
            padBuf[--dst] = len & 0xff
            len >>= 8
        }

        addBuf(padBuf)

        var res = ""
        for (var i = 0; i < h.length; ++i)
            res += ("000000000" + h[i].toString(16)).slice(-8)

        return res.toLowerCase()
    }

    export function sha256string(s:string)
    {
        return sha256buffer(Util.stringToUint8Array(Util.toUTF8(s)))
    }

    export class RC4 {
        private rc4_buf:Uint8Array;
        private rc4_i = 0;
        private rc4_j = 0;

        constructor()
        {
            this.rc4_buf = new Uint8Array(256);
            for (var i = 0; i < 256; ++i)
                this.rc4_buf[i] = i;
        }

        public getBytes(arr:Uint8Array)
        {
            var rc4_i = this.rc4_i
            var rc4_j = this.rc4_j
            var rc4_buf = this.rc4_buf

            for (var i = 0; i < arr.length; ++i) {
                rc4_i = (rc4_i + 1) & 0xff;
                rc4_j = (rc4_j + rc4_buf[rc4_i]) & 0xff;

                var tmp = rc4_buf[rc4_i]
                var tmp2 = rc4_buf[rc4_j]
                rc4_buf[rc4_i] = tmp2
                rc4_buf[rc4_j] = tmp

                arr[i] = rc4_buf[(tmp + tmp2) & 0xff];
            }

            this.rc4_i = rc4_i
            this.rc4_j = rc4_j
        }

        public addEntropy(key:Uint8Array)
        {
            var rc4_buf = this.rc4_buf
            var j = 0;
            for (var i = 0; i < 256; ++i) {
                j = (j + rc4_buf[i] + key[i % key.length]) & 0xff;
                var tmp = rc4_buf[i]
                rc4_buf[i] = rc4_buf[j]
                rc4_buf[j] = tmp
            }

            // drop 4k of output
            bytes(new Uint8Array(4096))
        }

        // '4' and '2' are repeated, so we have only alpha-numeric characters in ids
        static idChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz012345678942"
        public uniqueId(len = 24)
        {
            // 12 is about 64 bits; this gives 1/1M chance of collision on 1M entries
            // 24 is about 128 bits; this gives 1/1000B chance of collision on 10000B entries
            var buf = new Uint8Array(len)
            this.getBytes(buf)
            var r = ""
            for (var i = 0; i < buf.length; ++i)
                r += RC4.idChars.charAt(buf[i] & 63)
            return r.replace(/^[0-9]/, "x"); // it should better start with a letter
        }
    }

    var rc4:RC4;
    var saveScheduled = false;
    var u32_8:Uint8Array;
    var u32_32:Uint32Array;

    export var strongEntropySource : (buf:Uint8Array)=>void = null;

    function addEntropy(key:Uint8Array)
    {
        rc4.addEntropy(key)
    }

    function scheduleSave()
    {
        if (saveScheduled || strongEntropySource) return;
        saveScheduled = true;
        Util.setTimeout(1000, () => {
            saveScheduled = false;
            saveState();
        })
    }

    function setup()
    {
        if (rc4) return;

        rc4 = new RC4()

        u32_8 = new Uint8Array(4);
        u32_32 = new Uint32Array(u32_8.buffer);

        var key = new Uint8Array(64);
        for (var i = 0; i < key.length; ++i)
            key[i] = (Math.random() * 0x100) & 0xff;
        addEntropy(key);

        var needsMoreEntropy = true;
        var wc = (<any>window).crypto
        try {
            if (wc && wc.getRandomValues) {
                wc.getRandomValues(key);
                addEntropy(key);
                needsMoreEntropy = false;
            }
        } catch (exn) {
            // this tends to fail on some versions of Firefox with Permission denied exception
        }

        if (needsMoreEntropy) {
            if (strongEntropySource) {
                strongEntropySource(key);
                addEntropy(key);
            } else {
                addEntropy64(window.localStorage["entropy"]);

                if (!window.localStorage["gotCloudEntropy"])
                    // most likely we get entropy from InstalledHeaders; no need to ask
                    Util.setTimeout(1000, () => {
                        if (!window.localStorage["gotCloudEntropy"])
                            Cloud.getRandomAsync().done(addCloudEntropy, err => { });
                    })
            }
        }

        scheduleSave();
    }

    export function bytes(arr:Uint8Array)
    {
        setup();
        bytes_internal(arr);
        scheduleSave();
    }

    function bytes_internal(arr:Uint8Array)
    {
        rc4.getBytes(arr)
    }

    export function uint32():number
    {
        setup();
        bytes_internal(u32_8);
        scheduleSave();
        return u32_32[0];
    }

    var m32 = 1 / 0x100000000;
    var m64 = 1 / 0x10000000000000000;

    export function normalized()
    {
        return uint32() * m32 + uint32() * m64;
    }

    function saveState()
    {
        setup();
        if (strongEntropySource) return;
        var state = new Uint8Array(8*4);
        bytes_internal(state);
        window.localStorage["entropy"] = Util.base64EncodeBytes(<any>state);
    }

    export function addCloudEntropy(buf:string)
    {
        if (buf) {
            addEntropy64(buf);
            saveState();
            window.localStorage["gotCloudEntropy"] = "yes";
        }
    }

    function addEntropy64(buf:string)
    {
        if (!buf) return;
        var strbuf = Util.base64Decode(buf);
        if (!strbuf) return;
        setup();
        addEntropy(Util.stringToUint8Array(strbuf))
        scheduleSave();
    }

    export function uniqueId(len = 24)
    {
        setup()
        var r = rc4.uniqueId(len)
        scheduleSave()
        return r
    }

    export function permute<T>(arr:T[])
    {
        for (var i = 0; i < arr.length; ++i) {
            var j = uint32() % arr.length
            var tmp = arr[i]
            arr[i] = arr[j]
            arr[j] = tmp
        }
    }

    export function pick<T>(arr:T[]):T
    {
        if (arr.length == 0) return null;
        return arr[uint32() % arr.length];
    }

}
