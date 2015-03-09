///<reference path='refs.ts'/>

module TDev {
    export interface ExternalEditor {
        // Both these two fields are for our UI
        name: string;
        description: string;
        // An internal ID
        id: string;
        // A URL that points to the inner iframe to be displayed in lieu of the
        // original TouchDevelop editor.
        root: string;
    }

    export var externalEditors: ExternalEditor[] = [ {
        name: "Ace Editor",
        description: "A test editor",
        id: "ace",
        root: "http://localhost:4242"
    } ];

    // Assumes that [id] is a valid external editor id.
    export function editorById(id: string): ExternalEditor {
        var r = externalEditors.filter(x => x.id == id);
        Util.assert(r.length == 1);
        return r[0];
    }
}
