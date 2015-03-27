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

        // [Quit] has no attached data, so not defining a special interface
        export enum MessageType {
            Init,
            Metadata, MetadataAck,
            Save, SaveAck,
            Compile, CompileAck,
            Merge, Quit
        };

        export enum Status {
            Ok, Error
        };

        export enum SaveLocation {
            Local, Cloud
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

        export interface Message_SaveAck extends Message {
            type: MessageType; // == MessageType.SaveAck
            where: SaveLocation;
            status: Status;
            error?: string; // non-null iff status == Error
            newBaseSnapshot?: string; // non-null iff status == Ok && where == Cloud
            cloudIsInSync?: boolean; // true if the version we just wrote in the cloud
                                     // is the latest version currently stored locally
        }

        export interface Message_Merge extends Message {
            type: MessageType; // == MessageType.Merge
            merge: PendingMerge;
        }
    }
}
