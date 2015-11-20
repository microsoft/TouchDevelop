///<reference path='refs.ts'/>

module TDev.Hex
{
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

        return World.getHexInfoAsync(extInfo.sha)
            .then(res => {
                if (res)
                    return lzmaDecompressAsync(Util.stringToUint8Array(atob(res)))
                        .then(str => JSON.parse(str))
                else
                    return downloadHexInfoAsync(extInfo)
                        .then(meta => {
                            return lzmaCompressAsync(JSON.stringify(meta))
                            .then(buf => {
                                var b64 = btoa(Util.uint8ArrayToString(buf))
                                return World.setHexInfoAsync(extInfo.sha, b64)
                                    .then(() => meta)
                            })
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

        var extInfo = AST.Bytecode.getExtensionInfo(app);
        if (extInfo.errors) {
            ModalDialog.info(lf("Errors compiling glue.cpp extensions"), extInfo.errors)
            return;
        }

        getHexInfoAsync(extInfo)
        .done(meta => {
            AST.Bytecode.setupFor(extInfo, meta)

            var realCompileStartTime = Util.now();
            var c = new AST.Bytecode.Compiler(app)
            try {
                c.run()
            } catch (e) {
                if (app != Script)
                    // Script is automatically attached
                    e.bugAttachments = [app.serialize()]
                Util.reportError("bitvm compile", e, false);
                if (dbg)
                    ModalDialog.showText(e.stack)
                else
                    HTML.showErrorNotification(lf("Oops, something happened! If this keeps happening, contact BBC micro:bit support."))
                return
            }

            var compileStop = Util.now();

            times += Util.fmt("; to assembly {0}ms\n", compileStop - realCompileStartTime);

            st.then(r => {
                var saveDone = Util.now()
                times += Util.fmt("; save time {0}ms\n", saveDone - startTime);

                var res = c.serialize(!firstTime, r[0], r[1])
                times += Util.fmt("; assemble time {0}ms\n", Util.now() - saveDone);

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
}
