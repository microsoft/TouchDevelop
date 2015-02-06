///<reference path='../typings/node/node.d.ts'/>
///(reference path='shell.d.ts'/)

import fs = require('fs');
import child_process = require('child_process');
import crypto = require('crypto');

function main() {
    var files = [ 'build/shell.js', 'shell/iisnode.yml', 'shell/web.config' ]
    var obj = {}
    var sha = {}
    files.forEach(f => {
        var fc = fs.readFileSync(f, "utf8")
        obj[f] = fc
        var h = crypto.createHash('sha256')
        h.update(fc, "utf8")
        sha[f] = h.digest("hex").toLowerCase()
    })
    fs.writeFileSync("build/pkgshell.js",
        "var TDev;\n" +
        "TDev.pkgShell = " + JSON.stringify(obj, null, 2) + ";\n" +
        "TDev.pkgShellSha = " + JSON.stringify(sha, null, 2) + ";\n"
        )

    console.log("*** pkgshell.js written")


    var ff = fs.readFileSync("build/shell.js", "utf8")
    ff = ff.replace(/^\uFEFF/, "#!/usr/bin/env node\n")
    ff = ff.replace(/\r/g, "")
    ff = ff.replace(/^\s*var isNpm =.*$/m, "var isNpm = true;")
    var npm = "shell/npm/"
    if (!fs.existsSync(npm + "bin"))
        fs.mkdirSync(npm + "bin");
    fs.writeFileSync(npm + "bin/touchdevelop.js", ff, "utf8")
    var m = /static shellVersion = (\d+)/.exec(fs.readFileSync("rt/rt.ts", "utf8"))
    var pkg = JSON.parse(fs.readFileSync(npm + "package-in.json", "utf8"))
    var buildNo = process.env.CCNetNumericLabel || "0"
    pkg.version = "0." + m[1] + "." + buildNo
    //console.log(process.env)
    fs.writeFileSync(npm + "package.json", JSON.stringify(pkg, null, 2), "utf8")
    child_process.exec("npm pack .", {
        cwd: npm,
        encoding: "utf8",
    }, <any>((err, stderr:string, stdout:string) => {
        stderr = stderr.replace(/\n$/, "")
        stdout = stdout.replace(/\n$/, "")
        if (stdout)
            console.log("npm pack: " + stdout)
        if (stderr)
            console.log("npm pack: " + stderr)
        var fn = pkg.name + "-" + pkg.version + ".tgz"
        fs.renameSync(npm + fn, "build/touchdevelop.tgz")
    }))

}

main();
