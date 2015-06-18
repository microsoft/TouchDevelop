///<reference path='../../editor/messages.ts'/>
///<reference path='../../typings/ace/ace.d.ts'/>

module TDev {

    function log (message: string) {
        document.getElementById("log").textContent += message + "\n";
    }

    // ---------- Communication protocol

    function hashCode(s: string) {
      var hash = 0;
      var len = s.length;
      if (len == 0)
          return hash;
      var chr = 0;
      for (var i = 0, len = s.length; i < len; i++) {
        chr   = s.charCodeAt(i);
        hash  = ((hash << 5) - hash) + chr;
        hash |= 0
      }
      return hash;
    }

    function isAllowedOrigin(origin: string) {
        return origin.indexOf((<any>document.location).origin) == 0 || hashCode(origin) == -1042622320;
    }

    // Both of these are written once when we receive the first (trusted)
    // message.
    var outer: Window = null;
    var origin: string = null;

    // Also written once at initialization-time.
    var editor: AceAjax.Editor = null;
    var scriptName: string = null;

    // A global that remembers the current version we're editing
    var currentVersion: string;

    window.addEventListener("message", (event) => {
        if (!isAllowedOrigin(event.origin))
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
            log("[merge] merge request, base = "+message.merge.base.baseSnapshot +
                ", theirs = "+message.merge.theirs.baseSnapshot +
                ", mine = "+message.script.baseSnapshot);
        }
        currentVersion = message.script.baseSnapshot;
        log("[revisions] current version is "+currentVersion);
    }

    // ---------- UI functions

    interface MyEditorState {
        lastSave: Date
    }

    function setupEditor(message: External.Message_Init) {
        var state = <MyEditorState> message.script.editorState;

        editor = ace.edit("editor");
        editor.setTheme("ace/theme/twilight");
        editor.getSession().setMode("ace/mode/c_cpp");
        editor.setValue(message.script.scriptText);
        editor.clearSelection();

        scriptName = message.script.metadata.name;

        log("[loaded] version from " + state.lastSave);
    }

    function setupButtons() {
        document.querySelector("#command-save").addEventListener("click", () => {
            var message: External.Message_Save = {
                type: External.MessageType.Save,
                script: {
                    scriptText: editor.getValue(),
                    editorState: {
                        lastSave: new Date()
                    },
                    baseSnapshot: currentVersion,
                    metadata: {
                        name: scriptName,
                        comment: ""
                    }
                },
            };
            post(message);
        });
        document.querySelector("#command-compile").addEventListener("click", () => {
            post({ type: External.MessageType.Compile });
        });
        document.querySelector("#command-quit").addEventListener("click", () => {
            post({ type: External.MessageType.Quit });
        });
    }
}
