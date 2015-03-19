// This file contains no external references. It is meant to be used both by the
// TouchDevelop code (in [editor/external.ts], most likely) and by actual
// implementations of external editors.

module TDev {
    export module External {
        export interface SavedScript {
            scriptText: string;
            editorState: string;
            baseSnapshot: string;
        }

        // The pending merge data, if any.
        export interface PendingMerge {
            base: SavedScript;
            theirs: SavedScript;
        }

        export enum MessageType {
            Init,
            Metadata, AckMetadata,
            Save, AckSave,
            Compile, AckCompile,
            Merge
        };

        export interface Message {
            type: MessageType;
        }

        export interface Message_Init extends Message {
            type: MessageType; // == MessageType.Init
            script: SavedScript;
            merge?: PendingMerge;
        }

        export interface Message_Save extends Message {
            type: MessageType; // == MessageType.Save
            script: SavedScript;
        }
    }
}
