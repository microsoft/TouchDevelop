///<reference path='refs.ts'/>

//declare var self:any;

module TDev.Plugins {
    var pluginsBySlot:StringMap<Plugin> = {}
    var pluginWorker:Worker = null;

    export interface PluginOperation extends RT.AstAnnotationOp
    {
        icon?: string;
        buttonScope?: string;
    }

    class Plugin
    {
        public slotId = Random.uniqueId(8);
        public name:string;
        public operations:PluginOperation[] = [];
        public intelliProfile : AST.IntelliProfile = undefined;
        public scriptInfo:Browser.ScriptInfo;
        public everRegistered = false;
        public buttonGuid = "";

        public uninstall()
        {
            delete pluginsBySlot[this.slotId]
            if (this.buttonGuid) return

            pluginWorker.postMessage({
                tdOperation: "uninstall",
                slotId: this.slotId,
            })
        }

        public runOperationAsync(op:PluginOperation) : Promise
        {
            if (this.buttonGuid) {
                return executeButtonPluginAsync(this.scriptInfo, op.opid);
            } else {
                pluginWorker.postMessage({
                    tdSlotId: this.slotId,
                    op: "run_operation",
                    opid: op.opid
                })
                return Promise.as();
            }
        }
    }

    class PluginRequest
    {
        constructor(public data:any, public plugin:Plugin)
        {
        }

        public respond(resp:any)
        {
            if (!resp.status) resp.status = "ok"
            resp.id = this.data.id;
            resp.tdSlotId = this.plugin.slotId;
            pluginWorker.postMessage(resp)
        }

        public error(msg:string)
        {
            Util.log("plugin error (" + this.plugin.name + "): " + msg)
            this.respond({ status: "error", message: msg })
        }


        op_current_script_ast() {
            this.respond({
                id: Script.localGuid,
                ast: AST.Json.dump(Script)
            })
        }

        op_current_script_id() {
            this.respond({
                script_id: Script.localGuid
            })
        }

        op_annotate_ast() {
            TheEditor.clearAnnotations(this.plugin.slotId)
            TheEditor.injectAnnotations(this.data.annotations.map(a => { return <RT.AstAnnotation>{
                id: a.id + "",
                category: a.category + "",
                message: a.message + "",
                ops: (a.ops || []).map(op => { return <RT.AstAnnotationOp>{
                    opid: op.opid + "",
                    header: op.header + "",
                    description: op.description + "",
                } }),
                pluginRef: this.plugin.slotId
            }}))
            TheEditor.refreshDecl()
            if (this.data.annotations.length > 0)
                TheEditor.searchFor(":plugin")
            this.respond({ })
        }

        op_progress() {
            HTML.showProgressNotification(this.plugin.name + ": " + this.data.message)
            this.respond({ })
        }

        op_info() {
            HTML.showPluginNotification(this.plugin.name + ": " + this.data.message)
            this.respond({ })
        }

        op_plugin_crashed() {
            HTML.showErrorNotification(lf("plugin crashed: ") + this.data.message)
            this.plugin.uninstall()
        }

        op_register_operations() {
            this.plugin.operations = this.data.operations.map(op => { return <PluginOperation>{
                header: op.header + "",
                description: op.description + "",
                opid: op.opid + "",
                icon: /^[a-z0-9A-Z]+$/.test(op.icon) ? op.icon : "plug",
                buttonScope: op.buttonScope ? op.buttonScope + "" : "",
            } })
            if (!this.plugin.everRegistered) {
                showPluginUI()
                this.plugin.everRegistered = true
            }
            this.respond({ })
        }

        op_goto() {
            AST.Json.setStableId(Script)
            var id = this.data.astid
            var loc = CodeLocation.fromNodeId(id)
            if (loc) {
                TheEditor.goToLocation(loc);
                this.respond({ status: "found" })
            } else {
                this.respond({ status: "not-found" })
            }
        }

        // TODO
        // callback on every top-level change
        // query if script has errors
        // modal dialog with markdown
        // replace a list of stmts in a block with a differnet list (fix it)
    }

    export function stopAllPlugins()
    {
        Util.values(pluginsBySlot).forEach(p => p.uninstall())
        pluginsBySlot = {}
    }

    function handlePluginMessage(e:MessageEvent)
    {
        var d = e.data
        if (typeof d != "object") {
            Util.log("wrong plugin message: " + d)
            return
        }

        if (!Script) return; // TODO make sure we kill the plugins for unloaded scripts

        if (!e.data.tdSlotId) {
            Util.log("no slot id in plugin message")
            return
        }
        var p = pluginsBySlot[e.data.tdSlotId]

        if (!p) {
            Util.log("no plugin with slot id " + e.data.tdSlotId)
            return
        }

        var r = new PluginRequest(d, p)

        try {
            if (r["op_" + d.op])
                r["op_" + d.op]()
            else
                r.error("no such command: " + d.op)
        } catch (e) {
            r.error("exception: " + e)
        }
    }

    function runBackgroundPluginAsync(si:Browser.ScriptInfo)
    {
        if (!pluginWorker) {
            var r = new PromiseInv()

            var base = /http:\/\/localhost[:\/]/.test(baseUrl) ? "./" : baseUrl

            pluginWorker = new Worker(base == "./" ? "worker.js" :
                        "https://www.touchdevelop.com/app/?releaseid=2519967637668242448-920d9e58.a88e.4fa8.bcd1.9be5ba29da9f-workerjs" );
            pluginWorker.onmessage = (e) => {
                if (e.data.tdStatus == "ready") {
                    pluginWorker.onmessage = Util.catchErrors("handlePluginMsg", handlePluginMessage)
                    r.success(runBackgroundPluginAsync(si))
                }
            }
            pluginWorker.postMessage({
                op: "load",
                url: base + "browser.js"
            })
            pluginWorker.postMessage({
                op: "load",
                url: base + "main.js"
            })
            return r
        }


        var guid = si.getCloudHeader() ? Promise.as(si.getGuid()) :
            Browser.TheApiCacheMgr.getAsync(si.publicId, true)
                .then((info: JsonScript) => World.installPublishedAsync(si.publicId, info.userid))
                .then((hd:Cloud.Header) => hd.guid)

        return guid.then((g:string) => AST.loadScriptAsync(World.getAnyScriptAsync, g))
            .then((resp:AST.LoadScriptResult) => {
                Script.setStableNames();
                var cs = AST.Compiler.getCompiledScript(Script, { })
                Script = resp.prevScript

                var p = new Plugin()
                p.scriptInfo = si
                p.name = si.getTitle()

                pluginsBySlot[p.slotId] = p

                pluginWorker.postMessage({
                    tdOperation: "install",
                    slotId: p.slotId,
                    entropy: Random.uniqueId(128),
                    precompiled: cs.getCompiledCode()
                })
            })
    }

    function showPluginUI()
    {
        var plugins = Util.values(pluginsBySlot)
        plugins.stableSortObjs((a, b) => Util.stringCompare(a.name, b.name))
        var boxes = []
        var m = new ModalDialog()

        var addNew = () => {
            var e = new DeclEntry("start more plugins")
            e.makeIntoAddButton();
            e.description = "install plugins in this script"
            var ee = e.mkBox();
            HTML.setTickCallback(ee, Ticks.pluginAddMore, () => {
                m.dismiss()
                choosePlugin()
            });
            boxes.push(ee)
        }
        addNew()

        TheEditor.queueNavRefresh()

        plugins.forEach(p => {
            var box = p.scriptInfo.mkSmallBoxNoClick()
            box.className += " pluginHeader";
            var stopbtn = HTML.mkRoundButton("svg:cancel,black", lf("stop"), Ticks.pluginStop, () => {
                var ids = Script.editorState.buttonPlugins
                if (p.buttonGuid && ids) delete ids[p.buttonGuid]
                p.uninstall()
                TheEditor.refreshIntelliProfile();
                TheEditor.queueNavRefresh()
                m.dismiss()
            });
            box = ScriptNav.addSideButton(box, stopbtn);
            boxes.push(box)

            p.operations.forEach(op => {
                var e = new DeclEntry(op.header)
                e.classAdd += " pluginOp";
                e.icon = "svg:" + op.icon + ",white"
                e.color = "#0af"
                e.description = op.description
                var ee = e.mkBox();
                HTML.setTickCallback(ee, Ticks.pluginRunOperation, () => {
                    p.runOperationAsync(op).done();
                    m.dismiss()
                });
                boxes.push(ee)
            })
        })

        m.choose(boxes)
    }

    export function getPluginButtons(scope:string) : HTMLElement[]
    {
        var btns:HTMLElement[] = []

        Util.values(pluginsBySlot).forEach(p => {
            p.operations.forEach(op => {
                if (op.buttonScope == scope) {
                    var pluginid = Util.htmlEscape(op.header.replace(/\s/, '').toLowerCase());
                    var b = HTML.mkRoundButton("svg:" + op.icon + ",black", op.header, Ticks.sideButtonPlugin, () => {
                        TheEditor.notifyTutorial("plugin:" + pluginid);
                        p.runOperationAsync(op).done();
                    })
                    b.id +=  pluginid // syntax expected by tutorial {stcmd:plugin:<pluginid>}
                    b.className += " navItem-button"
                    btns.push(b)
                }
            })
        })

        return btns
    }

    export function getPluginIntelliProfile() : AST.IntelliProfile { // undefined if no profile is defined.
        var profile : AST.IntelliProfile = null;
        Util.values(pluginsBySlot)
            .filter(p => !!p.intelliProfile)
            .forEach(p => {
                if (!profile) profile = new AST.IntelliProfile();
                profile.merge(p.intelliProfile);
            });
        return profile;
    }

    export function installButtonPluginAsync(id:string)
    {
        var getHeader:Promise

        if (Util.values(pluginsBySlot).some(p => p.buttonGuid == id))
            return Promise.as()

        if (/-/.test(id))
            getHeader = World.getInstalledHeaderAsync(id)
        else
            getHeader = Browser.TheApiCacheMgr.getAsync(id, true)
                .then((json:JsonScript) => World.installPublishedAsync(json.updateid, json.userid))

        var si:Browser.ScriptInfo;

        return getHeader
            .then(hd => {
                if (!hd || hd.status == "deleted")
                    return null

                if (Util.values(pluginsBySlot).some(p => p.buttonGuid == hd.guid))
                    return null

                si = Browser.TheHost.createInstalled(hd)
                return si.getScriptTextAsync()
            })
            .then(text => {
                if (!text) return

                var app = AST.Parser.parseScript(text)
                // extract buttons
                var btns = app.actions().filter(a => a.isButtonPlugin())

                var p = new Plugin()
                p.scriptInfo = si
                p.name = si.getName()
                p.buttonGuid = si.getGuid()
                pluginsBySlot[p.slotId] = p

                if (!Script.editorState.buttonPlugins)
                    Script.editorState.buttonPlugins = {}
                Script.editorState.buttonPlugins[si.getGuid()] = 1

                btns.forEach(btn => {
                    var ico = /{icon:([a-z]+)}/.exec(btn.getDescription());
                    p.operations.push(<PluginOperation> {
                        opid: btn.getName(),
                        header: btn.getName(),
                        description: btn.getInlineHelp(),
                        buttonScope: "script",
                        icon: ico ? ico[1] : app.iconName(),
                    })
                })
                // extract profile
                var profileAction = app.actions().filter((a : AST.Action) => a.isPrivate && a.getName() == "supported apis")[0];
                if (profileAction) {
                    Util.log('loading intelliprofile for plugin {0}', p.name);
                    AST.TypeChecker.tcApp(app);
                    p.intelliProfile = new AST.IntelliProfile();
                    p.intelliProfile.allowAllLibraries = true;
                    p.intelliProfile.loadFrom(profileAction, false);
                }
            })
    }

    function choosePlugin()
    {
        Meta.chooseScriptAsync({
            searchPath: "scripts?count=60&q=" + encodeURIComponent("#scriptPlugin "),
            filter: (si:Browser.ScriptInfo) => {
                return /#scriptPlugin/i.test(si.getDescription())
            },
            header: lf("choose a plugin"),
            initialEmptyQuery: true,
        }).then(si => {
            if (!Script || !si) return;

            if (/#backgroundPlugin/i.test(si.getDescription())) {
                runBackgroundPluginAsync(si).done()
                return
            }

            if (/#buttonPlugin/i.test(si.getDescription())) {
                installButtonPluginAsync(si.getAnyId())
                .then(() => TheEditor.refreshIntelliProfile())
                .done(() => showPluginUI())
                return
            }

            return executeButtonPluginAsync(si, "plugin")
        }).done();
    }

    function executeButtonPluginAsync(si:Browser.ScriptInfo, actionName:string)
    {
        var guid = Script.localGuid;
        return TheEditor.saveStateAsync()
            .then(() => { setGlobalScript(null); })
            .then(() => ProgressOverlay.lockAndShowAsync(lf("loading plugin")))
            .then(() => {
                if (si.getCloudHeader())
                    return TheEditor.loadScriptAsync(si.getCloudHeader(), true);
                else
                    return Browser.TheApiCacheMgr.getAsync(si.publicId, true)
                        .then((info: JsonScript) => TheEditor.loadPublicScriptAsync(si.publicId, info.userid, true));
            })
            .then(() => {
                var f = Script.actions().filter(a => !a.isPrivate && a.getName() == actionName)[0]
                if (!f) {
                    ModalDialog.info(lf("errors in plugin"), lf("no public '{0}' action", actionName))
                    TheEditor.reload();
                } else if (!f.isButtonPlugin() && !f.isPlugin()) {
                    ModalDialog.info(lf("errors in plugin"), lf("'{0}' has unsupported signature", actionName))
                    TheEditor.reload();
                } else {
                    var k = f.getInParameters()[0].getKind()
                    TheEditor.forceReload = true;
                    if (k == api.core.Editor) {
                        setupEditorObject(guid)
                        TheEditor.host.canEdit = false
                        TheEditor.runAction(f, [TheEditor.rtEditor])
                    } else {
                        TheEditor.runAction(f, [guid]);
                    }
                }
            })
    }

    export function setupEditorObject(guid:string, headless = true)
    {
        TheEditor.rtEditor = new RT.Editor(TheEditor.currentRt, headless)
        TheEditor.currentRt.runningPluginOn = guid;
    }

    export function runAnnotationOp(ann:RT.AstAnnotation, op:RT.AstAnnotationOp)
    {
        var plugin = pluginsBySlot[ann.pluginRef]
        if (!plugin) return
        pluginWorker.postMessage({
            tdSlotId: plugin.slotId,
            op: "run_operation",
            opid: op.opid
        })
    }

    export function runPlugin()
    {
        if (Object.keys(pluginsBySlot).length > 0)
            showPluginUI()
        else
            choosePlugin()
    }


}
