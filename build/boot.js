(function() {

function now() { return new Date().getTime() }
var start = now();

var fs = require('fs');
var path = require('path');
var child_process = require('child_process');


var src = fs.statSync("build.ts");
var dst = fs.existsSync("build.js") ? fs.statSync("build.js") : null;

function startBuilder() {
    require("./build.js");
}

if (!dst || src.mtime.getTime() > dst.mtime.getTime()) {
    var p = child_process.spawn("node", 
           ["../../External/TypeScript/tsc.js",
            "-out", "build.js", "../rt/promise.ts", "build.ts"],
            { stdio: "inherit" });
    p.on("exit", function (code) {
        if (code === 0) {
          console.log("[boot] rebuilt builder [" + (now() - start) + " ms]");
          startBuilder();
        } else {
          console.log("[boot] failed to rebuild builder");
        }
    });
} else {
    console.log("[boot] builder up to date");
    startBuilder();
}

}())
