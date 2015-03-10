// This file contains no external references. It is meant to be used both by the
// TouchDevelop code (in [editor/external.ts], most likely) and by actual
// implementations of external editors.

module TDev {
    export module External {
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
    }
}
