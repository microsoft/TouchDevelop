///<reference path='refs.ts'/>

module TDev.Hex
{
    var getCacheTableAsync = () => Storage.getTableAsync("ArtCache");
    var maxItems = 5 

    function setValueAsync(t:Storage.Table, k:string, v:string)
    {
        var st = {}
        st[k] = v
        return t.setItemsAsync(st)
    }

    function storeHexInfoAsync(sha:string, entry:string)
    {
        var key = "hex-" + sha
        return getCacheTableAsync()
        .then((table:Storage.Table) => {
            var setPr = setValueAsync(table, key, entry)
            return table.getValueAsync("hex:keys")
            .then(currKeys => {
                if (!currKeys) currKeys = "[]"
                var lst = JSON.parse(currKeys)
                lst.push(key)
                if (lst.length > maxItems) {
                    lst = lst.slice(-maxItems)
                    setPr = setPr
                        .then(() => table.getKeysAsync())
                        .then((keys:string[]) => {
                            var del = {}
                            keys.forEach(k => {
                                if (/^hex-/.test(k) && lst.indexOf(k) == -1) {
                                    Util.log("delete " + k)
                                    del[k] = null;
                                }
                            })
                            return table.setItemsAsync(del)
                        })
                }
                return setPr
                    .then(() => setValueAsync(table, "hex:keys", JSON.stringify(lst)))
            })
        })
    }

    function loadHexInfoAsync(sha:string)
    {
        var key = "hex-" + sha
        return getCacheTableAsync()
        .then((table:Storage.Table) => table.getValueAsync(key))
    }


    function downloadHexInfoAsync(extInfo:AST.Bytecode.ExtensionInfo)
    {
        var hexurl = Cloud.config.primaryCdnUrl + "/compile/" + extInfo.sha
        return Util.httpGetTextAsync(hexurl + ".hex")
            .then(text => text,
                  e => Cloud.postPrivateApiAsync("compile/extension", { data: extInfo.compileData })
                    .then(() => {
                        var r = new PromiseInv();
                        var tryGet = () => Util.httpGetJsonAsync(hexurl + ".json")
                            .then(json => {
                                if (!json.success)
                                    ModalDialog.showText(JSON.stringify(json, null, 1), lf("Compilation error"));
                                else
                                    r.success(Util.httpGetTextAsync(hexurl + ".hex"))
                            },
                            e => Util.setTimeout(1000, tryGet))
                        tryGet();
                        return r;
                    }))
            .then(text =>
                Util.httpGetJsonAsync(hexurl + "-metainfo.json")
                    .then(meta => {
                        meta.hex = text.split(/\r?\n/)
                        return meta
                    }))
    }

    function getHexInfoAsync(extInfo:AST.Bytecode.ExtensionInfo)
    {
        if (!extInfo.sha)
            return Promise.as(null)

        if (AST.Bytecode.isSetupFor(extInfo))
            return Promise.as(null)

        Util.log("get hex info: " + extInfo.sha)

        return loadHexInfoAsync(extInfo.sha)
            .then(res => {
                if (res) {
                    Util.log("get from world: " + res.length)
                    var meta = JSON.parse(res)
                    meta.hex = decompressHex(meta.hex)
                    return Promise.as(meta)
                }
                else
                    return downloadHexInfoAsync(extInfo)
                        .then(meta => {
                            var origHex = meta.hex
                            meta.hex = compressHex(meta.hex)
                            var store = JSON.stringify(meta)
                            meta.hex = origHex
                            return storeHexInfoAsync(extInfo.sha, store)
                                    .then(() => meta)
                        })
            })
    }

    var firstTime = true;
    export function compile(app : AST.App, showSource = false)
    {
        var times = ""
        var startTime = Util.now();

        times += Util.fmt("; type check before compile {0}ms\n", startTime - TheEditor.compilationStartTime);
        var guid = app.localGuid
        var st = TheEditor.saveStateAsync()
            .then(() => Promise.join([World.getInstalledScriptAsync(guid), World.getInstalledHeaderAsync(guid)]))
            .then(r => {
                var hd:Cloud.Header = r[1]
                var text:string = r[0]

                var meta = JSON.stringify(World.stripHeaderForSave(hd))

                var lzma = (<any>window).LZMA;

                if (!lzma)
                    return [meta, Util.stringToUint8Array(Util.toUTF8(text))]

                var newMeta = {
                    compression: "LZMA",
                    headerSize: meta.length,
                    textSize: text.length
                }
                return lzmaCompressAsync(meta + text)
                    .then(cbuf => [JSON.stringify(newMeta), cbuf])
            })
            .then(r => {
                var saveDone = Util.now()
                times += Util.fmt("; save time {0}ms\n", saveDone - startTime);
                return r;
            })


        var extensionStart = Util.now();

        var extInfo = AST.Bytecode.getExtensionInfo(app);
        if (extInfo.errors) {
            ModalDialog.info(lf("Errors compiling glue.cpp extensions"), extInfo.errors)
            return;
        }

        getHexInfoAsync(extInfo)
        .done(meta => {
            AST.Bytecode.setupFor(extInfo, meta)

            var realCompileStartTime = Util.now();
            times += Util.fmt("; glue.cpp extesion handling {0}ms\n", realCompileStartTime - extensionStart);

            var c = new AST.Bytecode.Compiler(app)
            try {
                c.run()
            } catch (e) {
                if (e.bitvmUserError) {
                    ModalDialog.info(e.message,
                        lf("If you're using any special library, please contact the author. Otherwise contact BBC micro:bit support."))
                } else {
                    if (app != Script)
                        // Script is automatically attached
                        e.bugAttachments = [app.serialize()]
                    Util.reportError("bitvm compile", e, false);

                    if (dbg)
                        ModalDialog.showText(e.stack)
                    else
                        HTML.showErrorNotification(lf("Oops, something happened! If this keeps happening, contact BBC micro:bit support."))
                }

                return
            }

            var compileStop = Util.now();

            times += Util.fmt("; to assembly {0}ms\n", compileStop - realCompileStartTime);

            st.then(r => {
                var asmStart = Util.now();
                var res = c.serialize(!firstTime, r[0], r[1])
                times += Util.fmt("; assemble time {0}ms\n", Util.now() - asmStart);

                if (showSource)
                    ModalDialog.showText(times + res.csource)

                if (!res.sourceSaved) {
                    HTML.showWarningNotification("program compiled, but without the source; to save for later use the 'save' button")
                }

                firstTime = false

                if (res.data) {
                    var fn = Util.toFileName("microbit-" + app.getName(), 'script') + ".hex";
                    HTML.browserDownloadText(res.data, fn, res.contentType);
                }
            })
            .done(() => {},
            e => {
                Util.reportError("bitvm download", e, false);
                if (dbg)
                    ModalDialog.showText(e.stack)
                else
                    HTML.showErrorNotification(lf("Oops, something happened! If this keeps happening, contact BBC micro:bit support."))
            })
        })
    }

    function decompressHex(hex:string[])
    {
        var outp:string[] = []

        for (var i = 0; i < hex.length; i++) {
            var m = /^([@!])(....)$/.exec(hex[i])
            if (!m) {
                outp.push(hex[i])
                continue;
            }

            var addr = parseInt(m[2], 16)
            var nxt = hex[++i]
            var buf = ""

            if (m[1] == "@") {
                buf = ""
                var cnt = parseInt(nxt, 16)
                while (cnt-- > 0) {
                    buf += "\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0"
                }
            } else {
                buf = atob(nxt)
            }

            Util.assert(buf.length > 0)
            Util.assert(buf.length % 16 == 0)

            for (var j = 0; j < buf.length; ) {
                var bytes = [0x10, (addr >> 8) & 0xff, addr & 0xff, 0]
                addr += 16;
                for (var k = 0; k < 16; ++k) {
                    bytes.push(buf.charCodeAt(j++))
                }

                var chk = 0
                for (var k = 0; k < bytes.length; ++k)
                    chk += bytes[k]
                bytes.push((-chk) & 0xff)

                var r = ":"
                for (var k = 0; k < bytes.length; ++k) {
                    var b = bytes[k] & 0xff
                    if (b <= 0xf)
                        r += "0"
                    r += b.toString(16)
                }
                outp.push(r.toUpperCase())
            }
        }

        return outp
    }

    function compressHex(hex:string[])
    {
        var outp:string[] = []

        for (var i = 0; i < hex.length; i += j) {
            var addr = -1;
            var outln = ""
            var j = 0;
            var zeroMode = false;

            while (j < 500) {
                var m = /^:10(....)00(.{32})(..)$/.exec(hex[i + j])
                if (!m)
                    break;

                var h = m[2]
                var isZero = /^0+$/.test(h)
                var newaddr = parseInt(m[1], 16)
                if (addr == -1) {
                    zeroMode = isZero;
                    outp.push((zeroMode ? "@" : "!") + m[1])
                    addr = newaddr - 16;
                } else {
                    if (isZero != zeroMode)
                        break;

                    if (addr + 16 != newaddr)
                        break;
                }

                if (!zeroMode)
                    outln += h;

                addr = newaddr;
                j++;
            }

            if (j == 0) {
                outp.push(hex[i])
                j = 1;
            } else {
                if (zeroMode) {
                    outp.push(j.toString(16))
                } else {
                    var bin = ""
                    for (var k = 0; k < outln.length; k += 2)
                        bin += String.fromCharCode(parseInt(outln.slice(k, k + 2), 16))
                    outp.push(btoa(bin))
                }
            }
        }

        return outp;
    }
}
