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

        interface SavedScript {
            state: string;
            text: string;
        }

        var emptyScript: SavedScript = { state: "", text: "" };

        export class Channel {
            constructor(
                private editor: ExternalEditor,
                private iframe: HTMLIFrameElement,
                public guid: string) {
            }

            public post(message: Message) {
                // FIXME: shouldn't use *
                this.iframe.contentWindow.postMessage(message, "*");
            }

            public receive(event) {
                console.log("[outer message]", event);
                if (event.origin != this.editor.origin)
                    return;

                switch ((<Message> event.data).type) {
                    case MessageType.Save: {
                        var message = <Message_Save> event.data;
                        World.getInstalledHeaderAsync(this.guid).then(header => {
                            var script: SavedScript = {
                                state: message.state,
                                text: message.text
                            };
                            World.setInstalledScriptAsync(header, JSON.stringify(script), "").then(() => {
                                // FIXME define and send Message_SaveAck
                                console.log("[external] script saved properly");
                            });
                        });
                        break;
                    }

                    default:
                        console.error("[external] unexpected message type", message.type);
                        break;
                }
            }
        }

        export function loadAndSetup(editor: ExternalEditor, scriptText: string, guid: string) {
            // Clear leftover iframes.
            var iframeDiv = document.getElementById("externalEditorFrame");
            iframeDiv.setChildren([]);

            var iframe = document.createElement("iframe");
            iframe.addEventListener("load", function () {
                var script: SavedScript = scriptText ? JSON.parse(scriptText) : emptyScript;
                TheChannel = new Channel(editor, iframe, guid);
                TheChannel.post({
                    type: MessageType.Init,
                    text: script.text,
                    state: script.state
                });
            });
            iframe.setAttribute("src", editor.origin + editor.path);
            iframeDiv.appendChild(iframe);
        }
    }
}
