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
    }, {
        name: "Blockly editor",
        description: "Great block-based environment!",
        id: "blockly",
        origin: "http://localhost:4242",
        path: "/editor/local/blockly/editor.html"
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
                        World.getInstalledHeaderAsync(this.guid).then((header: Cloud.Header) => {
                            var scriptText = message.script.scriptText;
                            var editorState = message.script.editorState;
                            header.scriptVersion.baseSnapshot = message.script.baseSnapshot;
                            // Writes into local storage.
                            World.updateInstalledScriptAsync(header, scriptText, editorState, false, "").then(() => {
                                // FIXME define and send Message_SaveAck with param local
                                console.log("[external] script saved properly");
                            });
                            // Schedules a cloud sync; set the right state so
                            // that [scheduleSaveToCloudAsync] writes the
                            // baseSnapshot where we can read it back.
                            localStorage["editorScriptToSaveDirty"] = this.guid;
                            TheEditor.scheduleSaveToCloudAsync().then(() => {
                                // FIXME send Message_SaveAck with cloud param +
                                // last save date
                                var newBaseVersion = ScriptEditorWorldInfo.baseSnapshot;
                                console.log("[external] new base version ", newBaseVersion);
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

        export interface ScriptData {
            guid: string;
            scriptText: string;
            editorState: string;
            scriptVersionInCloud: string;
            baseSnapshot: string;
        };

        // The [scriptVersionInCloud] name is the one that's used by [world.ts];
        // actually, it hasn't much to do, really, with the script version
        // that's in the cloud. It's more of an unused field (in the new "lite
        // cloud" context) that we use to store extra information attached to
        // the script.
        export function loadAndSetup(editor: ExternalEditor, data: ScriptData) {
            // The [scheduleSaveToCloudAsync] method on [Editor] needs the
            // [guid] field of this global to match for us to read back the
            // [baseSnapshot] field afterwards.
            ScriptEditorWorldInfo = <EditorWorldInfo>{
                guid: data.guid,
                baseId: null,
                baseUserId: null,
                status: null,
                version: null,
                baseSnapshot: null,
            };

            // Clear leftover iframes.
            var iframeDiv = document.getElementById("externalEditorFrame");
            iframeDiv.setChildren([]);

            // Load the editor; send the initial message.
            var iframe = document.createElement("iframe");
            iframe.addEventListener("load", function () {
                TheChannel = new Channel(editor, iframe, data.guid);
                var extra = JSON.parse(data.scriptVersionInCloud || "{}");
                TheChannel.post({
                    type: MessageType.Init,
                    script: {
                        scriptText: data.scriptText,
                        editorState: data.editorState,
                        baseSnapshot: data.baseSnapshot,
                    },
                    merge: ("mine" in extra) ? extra : null
                });
            });
            iframe.setAttribute("src", editor.origin + editor.path);
            iframeDiv.appendChild(iframe);
        }
    }
}
