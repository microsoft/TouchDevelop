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

        // The metadata that we save about a script. Stored as a string (JSON).
        interface SavedScriptState {
            editorState: string;
            baseVersion: string;
        }

        var emptyState: SavedScriptState = { editorState: "", baseVersion: null };
        var emptyScript = "";

        export class Channel {
            constructor(
                private editor: ExternalEditor,
                private iframe: HTMLIFrameElement,
                public guid: string) {
            }

            public post(message: Message) {
                this.iframe.contentWindow.postMessage(message, this.editor.origin);
            }

            public receive(event) {
                console.log("[outer message]", event);
                if (event.origin != this.editor.origin)
                    return;

                switch ((<Message> event.data).type) {
                    case MessageType.Save: {
                        var message = <Message_Save> event.data;
                        World.getInstalledHeaderAsync(this.guid).then(header => {
                            var script = message.text;
                            var state: SavedScriptState = {
                                editorState: message.state,
                                baseVersion: null,
                            };
                            World.setInstalledScriptAsync(header, script, "", null, JSON.stringify(state)).then(() => {
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

        // The [scriptVersionInCloud] name is the one that's used by [world.ts];
        // actually, it hasn't much to do, really, with the script version
        // that's in the cloud. It's more of an unused field (in the new "lite
        // cloud" context) that we use to store extra information attached to
        // the script.
        export function loadAndSetup(editor: ExternalEditor, scriptText: string, guid: string, scriptVersionInCloud: string) {
            // Clear leftover iframes.
            var iframeDiv = document.getElementById("externalEditorFrame");
            iframeDiv.setChildren([]);

            var iframe = document.createElement("iframe");
            iframe.addEventListener("load", function () {
                var script: string = scriptText || emptyScript;
                var state: SavedScriptState = scriptVersionInCloud ? JSON.parse(scriptVersionInCloud) : emptyState;
                TheChannel = new Channel(editor, iframe, guid);
                TheChannel.post({
                    type: MessageType.Init,
                    text: script,
                    state: state
                });
            });
            iframe.setAttribute("src", editor.origin + editor.path);
            iframeDiv.appendChild(iframe);
        }
    }
}
