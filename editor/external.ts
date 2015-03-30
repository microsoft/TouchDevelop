///<reference path='refs.ts'/>

module TDev {
    export interface ExternalEditor {
        // Both these two fields are for our UI
        name: string;
        description: string;
        // Unique
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
                // The notification that the script has been successfully saved
                // to cloud may take a while to arrive; the user may have
                // discarded the editor in the meanwhile.
                if (!this.iframe || !this.iframe.contentWindow)
                    return;
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
                                console.log("[external] script saved properly");
                                this.post(<Message_SaveAck>{
                                    type: MessageType.SaveAck,
                                    where: SaveLocation.Local,
                                    status: Status.Ok,
                                });
                            });
                            // Schedules a cloud sync; set the right state so
                            // that [scheduleSaveToCloudAsync] writes the
                            // baseSnapshot where we can read it back.
                            localStorage["editorScriptToSaveDirty"] = this.guid;
                            TheEditor.scheduleSaveToCloudAsync().then((response: Cloud.PostUserInstalledResponse) => {
                                // Reading the code of [scheduleSaveToCloudAsync], an early falsy return
                                // means that a sync is already scheduled.
                                if (!response)
                                    return;

                                if (response.numErrors) {
                                    this.post(<Message_SaveAck>{
                                        type: MessageType.SaveAck,
                                        where: SaveLocation.Cloud,
                                        status: Status.Error,
                                        error: (<any> response.headers[0]).error,
                                    });
                                    // Couldn't sync! Chances are high that we need to do a merge.
                                    // Because [syncAsync] is not called on a regular basis when an
                                    // external editor is open, we need to trigger the download of
                                    // the newer version from the cloud *now*.
                                    World.syncAsync().then(() => {
                                        World.getInstalledScriptVersionInCloud(this.guid).then((json: string) => {
                                            var m: PendingMerge = JSON.parse(json || "{}");
                                            if ("theirs" in m) {
                                                this.post(<Message_Merge>{
                                                    type: MessageType.Merge,
                                                    merge: m
                                                });
                                            } else {
                                                console.log("[external] cloud error was not because of a due merge");
                                            }
                                        });
                                    });
                                    return;
                                }

                                var newCloudSnapshot = response.headers[0].scriptVersion.baseSnapshot;
                                console.log("[external] accepted, new cloud version ", newCloudSnapshot);
                                // Note: currently, [response.retry] is always false. The reason is,
                                // every call of us to [updateInstalledScriptAsync] is immediately
                                // followed by a call to [scheduleSaveToCloudAsync]. Furthermore,
                                // the latter function has its own tracking mechanism where updates
                                // are delayed, and it sort-of knows if it missed an update and
                                // should retry. In that case, it doesn't return until the second
                                // update has been processed, and we only get called after the cloud
                                // is, indeed, in sync. (If we were to offer external editors a way
                                // to decide whether to save to cloud or not, then this would no
                                // longer be true.)
                                this.post(<Message_SaveAck>{
                                    type: MessageType.SaveAck,
                                    where: SaveLocation.Cloud,
                                    status: Status.Ok,
                                    newBaseSnapshot: newCloudSnapshot,
                                    cloudIsInSync: !response.retry,
                                });
                            });
                        });
                        break;
                    }

                    case MessageType.Quit:
                        TheEditor.goToHub("list:installed-scripts:script:"+this.guid+":overview");
                        TheChannel = null;
                        break;

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
            iframe.setAttribute("sandbox", "allow-scripts allow-same-origin");
            iframe.addEventListener("load", function () {
                TheChannel = new Channel(editor, iframe, data.guid);
                var extra = JSON.parse(data.scriptVersionInCloud || "{}");
                TheChannel.post(<Message_Init>{
                    type: MessageType.Init,
                    script: {
                        scriptText: data.scriptText,
                        editorState: data.editorState,
                        baseSnapshot: data.baseSnapshot,
                    },
                    merge: ("theirs" in extra) ? extra : null
                });
            });
            iframe.setAttribute("src", editor.origin + editor.path);
            iframeDiv.appendChild(iframe);
        }
    }
}
