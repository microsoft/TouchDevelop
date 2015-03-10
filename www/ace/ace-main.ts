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

    // Written once when we receive the first (trusted) message.
    var outer: Window = null;
    // Also written once at initialization-time.
    var editor: AceAjax.Editor = null;

    window.addEventListener("message", (event) => {
        if (!(event.origin in allowedOrigins))
            return;

        if (!outer)
            outer = event.source;

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
        // FIXME
        outer.postMessage(message, "*");
    }

    function setupEditor(message: External.Message_Init) {
        editor = ace.edit("editor");
        editor.setTheme("ace/theme/twilight");
        editor.getSession().setMode("ace/mode/c_cpp");
        editor.setValue(message.text);

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
