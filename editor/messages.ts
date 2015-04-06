// This file contains no external references. It is meant to be used both by the
// TouchDevelop code (in [editor/external.ts], most likely) and by actual
// implementations of external editors.

module TDev {
    export module External {

        // The base class for messages. This is what gets sent via [postMessage].
        // Discriminating on the actual value of the [type] field will tell you
        // which one of the [Message_*] interfaces below you can cast into
        // (TypeScript doesn't, quite regrettably, have sum types.)
        export interface Message {
            type: MessageType;
        }

        export enum MessageType {
            Init,
            Metadata, MetadataAck,
            Save, SaveAck,
            Compile, CompileAck,
            Merge, Quit, // [Quit] has no attached data, so not defining a special interface
            Upgrade
        };

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
            cloudIsInSync?: boolean; // non-null iff status == Ok && where == Cloud
                                     // true means the version we just wrote in
                                     // the cloud is the latest version
                                     // currently stored locally
        }

        export interface Message_Merge extends Message {
            type: MessageType; // == MessageType.Merge
            merge: PendingMerge;
        }

        export interface Message_Compile extends Message {
            type: MessageType; // == MessageType.Compile
            text: any; // string if language == CPlusPlus, TDev.AST.Json.JApp if language == TouchDevelop
            language: Language;
        }

        export interface Message_CompileAck extends Message {
            type: MessageType; // == MessageType.Message_CompileAck
            status: Status;
            error?: string; // non-null iff status == Error
        }

        export interface Message_Upgrade extends Message {
            type: MessageType; // == MessageType.Message_Upgrade
            name: string;
            ast: any // AST.Json.JApp
        }

        // A saved script has some text (this is what ends up published when the
        // user hits "publish"), an associated editor state (doesn't get
        // published), and is saved on top of a cloud-assigned [baseVersion].
        export interface SavedScript {
            scriptText: string;
            editorState: string;
            baseSnapshot: string;
            metadata: Metadata; // Must be set to the correct value every time.
        }

        export interface Metadata {
            name: string;
            description: string;
        }

        // In case local and remote modifications have been posted on top of the same cloud
        // version, the editor needs to merge, and can then save on top of the
        // new cloud version.
        export interface PendingMerge {
            base: SavedScript;
            theirs: SavedScript;
        }

        export enum Status {
            Ok, Error
        };

        export enum SaveLocation {
            Local, Cloud
        };

        export enum Language {
            TouchDevelop, CPlusPlus
        }
    }
}
