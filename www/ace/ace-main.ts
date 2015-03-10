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

    window.addEventListener("message", (event) => {
        if (!(event.origin in allowedOrigins))
            return;

        if (!outer)
            outer = event.source;

        receive(<External.Message>event.data);
    });

    function receive(message: External.Message) {
        log("[message] "+message.type);

        switch (message.type) {
            case External.MessageType.Init:
                setupEditor();
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

    function setupEditor() {
        var editor = ace.edit("editor");
        editor.setTheme("ace/theme/twilight");
        editor.getSession().setMode("ace/mode/c_cpp");

        log("[end] setupEditor");
    }

    function setupButtons() {
        document.querySelector("#command-save").addEventListener("click", () => {
            post({ type: External.MessageType.Save });
        });
        document.querySelector("#command-compile").addEventListener("click", () => {
            post({ type: External.MessageType.Compile });
        });
    }
}
