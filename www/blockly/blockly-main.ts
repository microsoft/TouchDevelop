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
        }
    }

    function post(message: External.Message) {
        if (!outer)
            console.error("Invalid state");
        outer.postMessage(message, origin);
    }

    // ---------- Revisions

    function mergeIfNeeded(message: External.Message_Init) {
        if (message.merge) {
            console.log("[merge] merge request, base = "+message.merge.base.baseSnapshot +
                ", theirs = "+message.merge.theirs.baseSnapshot +
                ", mine = "+message.script.baseSnapshot);
        }
        currentVersion = message.script.baseSnapshot;
        console.log("[revisions] current version is "+currentVersion);
    }

    // ---------- UI functions

    interface EditorState {
        lastSave: Date;
    }

    function loadEditorState(s: string): EditorState {
        try {
            return JSON.parse(s);
        } catch (e) {
            return { lastSave: null };
        }
    }

    function saveEditorState(s: EditorState): string {
        return JSON.stringify(s);
    }

    function setupEditor(message: External.Message_Init) {
        var state = loadEditorState(message.script.editorState);

        Blockly.inject(document.querySelector("#editor"), {
            toolbox: document.querySelector("#blockly-toolbox")
        });
        console.log("Loading", text);
        var text = message.script.scriptText || "<xml></xml>";
        var xml = Blockly.Xml.textToDom(text);
        Blockly.Xml.domToWorkspace(Blockly.mainWorkspace, xml);

        console.log("[loaded] version from " + state.lastSave);
    }

    function setupButtons() {
        document.querySelector("#command-save").addEventListener("click", () => {
            var xml = Blockly.Xml.workspaceToDom(Blockly.mainWorkspace);
            var text = Blockly.Xml.domToPrettyText(xml);
            console.log("Saving", text);
            var message: External.Message_Save = {
                type: External.MessageType.Save,
                script: {
                    scriptText: text,
                    editorState: saveEditorState({
                        lastSave: new Date()
                    }),
                    baseSnapshot: currentVersion,
                },
            };
            post(message);
        });
        document.querySelector("#command-compile").addEventListener("click", () => {
            post({ type: External.MessageType.Compile });
        });
    }
}

