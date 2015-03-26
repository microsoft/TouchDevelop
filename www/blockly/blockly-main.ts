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
                setupCurrentVersion(<External.Message_Init> message);
                break;

            case External.MessageType.SaveAck:
                saveAck(<External.Message_SaveAck> message);
                break;

            case External.MessageType.Merge:
                promptMerge((<External.Message_Merge> message).merge);
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

    function promptMerge(merge: External.PendingMerge) {
        console.log("[merge] merge request, base = "+merge.base.baseSnapshot +
            ", theirs = "+merge.theirs.baseSnapshot +
            ", mine = "+currentVersion);
        var mkButton = function (label: string, text: string) {
            var b = document.createElement("button");
            b.textContent = "load "+label;
            b.addEventListener("click", () => {
                loadBlockly(text);
            });
            return b;
        };
        var box = document.querySelector("#merge-commands");
        var clearMerge = () => {
            while (box.firstChild)
                box.removeChild(box.firstChild);
        };
        var mineText = saveBlockly();
        var mineButton = mkButton("mine", mineText);
        var theirsButton = mkButton("theirs", merge.theirs.scriptText);
        var baseButton = mkButton("base", merge.base.scriptText);
        var mergeButton = document.createElement("button");
        mergeButton.textContent = "finish merge";
        mergeButton.addEventListener("click", function () {
            currentVersion = merge.theirs.baseSnapshot;
            clearMerge();
            doSave();
        });
        [ mineButton, theirsButton, baseButton, mergeButton ].forEach(button => {
            box.appendChild(button);
            box.appendChild(document.createTextNode(" "));
        });
    }

    function setupCurrentVersion(message: External.Message_Init) {
        currentVersion = message.script.baseSnapshot;
        console.log("[revisions] current version is "+currentVersion);

        if (message.merge)
            promptMerge(message.merge);
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

    function loadBlockly(s: string) {
        var text = s || "<xml></xml>";
        var xml = Blockly.Xml.textToDom(text);
        Blockly.mainWorkspace.clear();
        Blockly.Xml.domToWorkspace(Blockly.mainWorkspace, xml);
    }

    function saveBlockly(): string {
        var xml = Blockly.Xml.workspaceToDom(Blockly.mainWorkspace);
        var text = Blockly.Xml.domToPrettyText(xml);
        return text;
    }

    var dirty = false;

    // Called once at startup
    function setupEditor(message: External.Message_Init) {
        var state = loadEditorState(message.script.editorState);

        Blockly.inject(document.querySelector("#editor"), {
            toolbox: document.querySelector("#blockly-toolbox")
        });
        loadBlockly(message.script.scriptText);
        Blockly.addChangeListener(() => {
            statusMsg("✎ local changes", External.Status.Ok);
            dirty = true;
        });

        window.addEventListener("beforeunload", function (e) {
            if (dirty) {
                var confirmationMessage = "Some of your changes have not been saved. Quit anyway?";
                (e || window.event).returnValue = confirmationMessage;
                return confirmationMessage;
            }
        });

        window.setInterval(() => {
            if (dirty)
                doSave();
        }, 5000);

        console.log("[loaded] cloud version " + message.script.baseSnapshot +
            "(dated from: "+state.lastSave+")");
    }

    function doSave() {
        var text = saveBlockly();
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
        dirty = false;
    }

    function setupButtons() {
        document.querySelector("#command-save").addEventListener("click", () => {
            doSave();
        });
        document.querySelector("#command-compile").addEventListener("click", () => {
            post({ type: External.MessageType.Compile });
        });
    }
}

