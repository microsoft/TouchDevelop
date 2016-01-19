///<reference path='refs.ts'/>
///<reference path='../typings/jszip/jszip.d.ts'/>
module TDev {
    export module Embedded {
        export function packageApp(name: string, sources: StringMap<string>): string { // datauri
            if (typeof(JSZip) === 'undefined') return undefined;
            
            var zip = new JSZip();

            // IDE support                    
            var vscode = zip.folder(".vscode");
            vscode.file("tasks.json", JSON.stringify(
                {
                    "version": "0.1.0",
                    "command": "yotta",
                    "isShellCommand": true,
                    "args": ["--target","bbc-microbit-classic-gcc"],
                    "tasks": [
                        {
                            "taskName": "build",
                            "args": [],
                            "isBuildCommand": true,
                            "problemMatcher": "$msCompile"
                        }
                    ]
                }, null, "4"));
                    
            // Yotta support
            zip.file("module.json", JSON.stringify(
                {
                    "name": Util.toFileName(name, "microbit-script"),
                    "version": "0.0.0",
                    "keywords": ["microbit"],
                    "dependencies": {
                        "microbit-touchdevelop": "microsoft/microbit-touchdevelop#" + Cloud.microbitGitTag
                    },
                    "bin": "./source",
                }, null, 4))

            
            var source = zip.folder("source");
            Object.keys(sources).forEach(fn => source.file(fn, sources[fn]));
            return "data:application/zip;base64," + zip.generate({ type: "base64" });
        }
    }
}