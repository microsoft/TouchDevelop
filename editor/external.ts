///<reference path='refs.ts'/>

module TDev {
    export interface ExternalEditor {
        // Both these two fields are for our UI
        name: string;
        description: string;
        // An internal ID
        id: string;
        // The domain root for the external editor.
        origin: string;
        // The path from the domain root to the editor main document.
        path: string;
    }

    export var externalEditors: ExternalEditor[] = [ {
        name: "C++ Editor",
        description: "Directly write C++ code using Ace",
        id: "ace",
        origin: "http://localhost:4242",
        path: "/editor/local/ace/editor.html"
    } ];

    // Assumes that [id] is a valid external editor id.
    export function editorById(id: string): ExternalEditor {
        var r = externalEditors.filter(x => x.id == id);
        Util.assert(r.length == 1);
        return r[0];
    }

    export module External {
        export var TheChannel: Channel = null;

        export class Channel {
            constructor(private editor: ExternalEditor, private iframe: HTMLIFrameElement) {
                this.post({ type: MessageType.Init });
            }

            private post(message: Message) {
                // FIXME: shouldn't use *
                this.iframe.contentWindow.postMessage(message, "*");
            }

            public receive(event) {
                console.log("[external] new message", event);
                if (event.origin != this.editor.origin)
                    return;

                var message = <Message> event.data;
            }
        }

        export function loadAndSetup(editor: ExternalEditor) {
            var iframeDiv = document.getElementById("externalEditorFrame");
            iframeDiv.setChildren([]);
            var iframe = document.createElement("iframe");
            iframe.addEventListener("load", function () {
                TheChannel = new Channel(editor, iframe);
            });
            iframe.setAttribute("src", editor.origin + editor.path);
            iframeDiv.appendChild(iframe);
        }
    }
}
