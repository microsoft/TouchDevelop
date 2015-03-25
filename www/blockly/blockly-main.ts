///<reference path='../../editor/messages.ts'/>

var Blockly: any;

module TDev {

    // ---------- Communication protocol

    var allowedOrigins = {
        "http://localhost:4242": null,
        "http://www.touchdevelop.com": null,
    };

    // Both of these are written once when we receive the first (trusted)
    // message.
    var outer: Window = null;
    var origin: string = null;

    // Also written once at initialization-time.
    var editor = null;

    // A global that remembers the current version we're editing
    var currentVersion: string;

    window.addEventListener("message", (event) => {
        if (!(event.origin in allowedOrigins))
            return;

        if (!outer || !origin) {
            outer = event.source;
            origin = event.origin;
        }

        receive(<External.Message>event.data);
    });

    function receive(message: External.Message) {
        console.log("[inner message]", message);

        switch (message.type) {
            case External.MessageType.Init:
                setupEditor(<External.Message_Init> message);
                setupButtons();
                mergeIfNeeded(<External.Message_Init> message);
                break;

            case External.MessageType.SaveAck:
                saveAck(<External.Message_SaveAck> message);
                break;
        }
    }

    function post(message: External.Message) {
        if (!outer)
            console.error("Invalid state");
        outer.postMessage(message, origin);
    }

    // ---------- Revisions

    function prefix(where: External.SaveLocation) {
        switch (where) {
            case External.SaveLocation.Cloud:
                return("☁  [cloud]");
            case External.SaveLocation.Local:
                return("⌂ [local]");
        }
    }

    function saveAck(message: External.Message_SaveAck) {
        switch (message.status) {
            case External.Status.Error:
                statusMsg(prefix(message.where)+" error: "+message.error, message.status);
                break;
            case External.Status.Ok:
                if (message.where == External.SaveLocation.Cloud) {
                    statusMsg(prefix(message.where)+" successfully saved "+
                        "(from "+currentVersion+" to "+message.newBaseSnapshot+")", message.status);
                    currentVersion = message.newBaseSnapshot;
                } else {
                    statusMsg(prefix(message.where)+" successfully saved", message.status);
                }
                break;
        }
    }

    function mergeIfNeeded(message: External.Message_Init) {
        if (message.merge) {
            console.log("[merge] merge request, base = "+message.merge.base.baseSnapshot +
                ", theirs = "+message.merge.theirs.baseSnapshot +
                ", mine = "+message.script.baseSnapshot);
        } else {
            console.log("[merge] no merge requested");
        }
        currentVersion = message.script.baseSnapshot;
        console.log("[revisions] current version is "+currentVersion);
    }

    // ---------- UI functions

    interface EditorState {
        lastSave: Date;
    }

    function statusMsg(s: string, st: External.Status) {
        var elt = <HTMLElement> document.querySelector("#status");
        if (st == External.Status.Error)
            elt.classList.add("error");
        else
            elt.classList.remove("error");
        elt.textContent = s;
    }

    function loadEditorState(s: string): EditorState {
        return JSON.parse(s || "{ \"lastSave\": null }");
    }

    function saveEditorState(s: EditorState): string {
        return JSON.stringify(s);
    }

    function setupEditor(message: External.Message_Init) {
        var state = loadEditorState(message.script.editorState);

        Blockly.inject(document.querySelector("#editor"), {
            toolbox: document.querySelector("#blockly-toolbox")
        });
        var text = message.script.scriptText || "<xml></xml>";
        var xml = Blockly.Xml.textToDom(text);
        Blockly.Xml.domToWorkspace(Blockly.mainWorkspace, xml);

        console.log("[loaded] cloud version " + message.script.baseSnapshot +
            "(dated from: "+state.lastSave+")");
    }

    function setupButtons() {
        document.querySelector("#command-save").addEventListener("click", () => {
            var xml = Blockly.Xml.workspaceToDom(Blockly.mainWorkspace);
            var text = Blockly.Xml.domToPrettyText(xml);
            console.log("[saving] on top of: ", currentVersion);
            post(<External.Message_Save>{
                type: External.MessageType.Save,
                script: {
                    scriptText: text,
                    editorState: saveEditorState({
                        lastSave: new Date()
                    }),
                    baseSnapshot: currentVersion,
                },
            });
        });
        document.querySelector("#command-compile").addEventListener("click", () => {
            post({ type: External.MessageType.Compile });
        });
    }
}

