///<reference path='../../editor/messages.ts'/>
///<reference path='../../typings/ace/ace.d.ts'/>

module TDev {

    function log (message: string) {
        document.getElementById("log").textContent += message + "\n";
    }

    var allowedOrigins = {
        "http://localhost:4242": null,
        "http://www.touchdevelop.com": null,
    };

    // Both of these are written once when we receive the first (trusted)
    // message.
    var outer: Window = null;
    var origin: string = null;
    // Also written once at initialization-time.
    var editor: AceAjax.Editor = null;

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
                break;
        }
    }

    function post(message: External.Message) {
        if (!outer)
            console.error("Invalid state");
        outer.postMessage(message, origin);
    }

    function setupEditor(message: External.Message_Init) {
        editor = ace.edit("editor");
        editor.setTheme("ace/theme/twilight");
        editor.getSession().setMode("ace/mode/c_cpp");
        editor.setValue(message.text);
        editor.clearSelection();

        log("[end] setupEditor");
    }

    function setupButtons() {
        document.querySelector("#command-save").addEventListener("click", () => {
            var message: External.Message_Save = {
                type: External.MessageType.Save,
                text: editor.getValue(),
                state: ""
            };
            post(message);
        });
        document.querySelector("#command-compile").addEventListener("click", () => {
            post({ type: External.MessageType.Compile });
        });
    }
}
