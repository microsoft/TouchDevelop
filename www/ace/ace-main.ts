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

        processMessage(<External.Message>event.data);
    });

    function processMessage(message: External.Message) {
        log("[message] "+message.type);

        switch (message.type) {
            case External.MessageType.Init:
                setupEditor();
                break;
        }
    }

    function setupEditor() {
        var editor = ace.edit("editor");
        editor.setTheme("ace/theme/twilight");
        editor.getSession().setMode("ace/mode/c_cpp");

        log("[end] setupEditor");
    }

}
