///<reference path='../typings/node/node.d.ts'/>

module TDev {

/*
import fs = module('fs');
import path = module('path');
*/

var fs = require('fs');
var path = require('path');

function readFile(filename:string)
{
    return fs.readFileSync(filename, "utf8").replace(/^\uFEFF/, "");
}

function writeFile(filename:string, text:string) {
    if (text.charAt(0) != '\uFEFF') text = '\uFEFF' + text;
    fs.writeFileSync(filename, text, "utf8");
}

function forEachFile(folderName:string, f:(fn:string)=>void)
{
    fs.readdirSync(folderName).forEach((s) => f(path.join(folderName, s)));
}

function echo(s:string)
{
    console.log(s)
}

var braceBalance = (s:string) =>
    s.replace(/[^{]/g, "").length - s.replace(/[^}]/g, "").length;

var prefixedProperties = /^(transform|transition|animation|box-sizing|column-)[-a-z]*$/;
var prefixes = ["webkit", "moz"];

var addPrefixToContent = (pref:string, cont:string) =>
    (<any>cont).replace(/( )([-a-z]+)([ ;:]|$)/g, function (str, a, b, c) {
        if (prefixedProperties.test(b))
            return a + "-" + pref + "-" + b + c;
        else
            return str;
    });

echo("*** START CSS");
forEachFile("..\\css", function (s) {
    var bn = s.replace(/\.css$/, "");
    if (bn == s) return;


    var origFile = readFile(s);
    var lines = origFile.replace(/\r/g, "").split("\n");
    while (lines[lines.length - 1] == "")
        lines.pop();
    var out = "";
    var keyframes = null;
    var keyframeBalance = 0;

    for (var i = 0; i < lines.length; ++i) {
        var line = lines[i];
        line = line.replace(/\s*\/\*CSSpref\*\/.*/, "");

        var kfRes = /^\s*@keyframes (.*)/.exec(line);

        if (kfRes) {
            keyframes = kfRes[1] + " ";
            keyframeBalance = braceBalance(line);
        } else if (keyframes !== null) {
            keyframes += line + " ";
            keyframeBalance += braceBalance(line);
            if (keyframeBalance == 0) {
                line += "   /*CSSpref*/";
                var cont = keyframes.replace(/\s+/g, " ");
                keyframes = null;
                prefixes.forEach(function (pref) {
                    line += " @-" + pref + "-keyframes " + addPrefixToContent(pref, cont);
                });
            }
        }

        var res = /^(\s*)([\-a-z]*)\s*:(.*)/.exec(line);

        if (!!res) {
            var spc = res[1];
            var propname = res[2];
            var content = res[3];

            if (prefixedProperties.test(propname)) {
                line += "                      /*CSSpref*/";
                prefixes.forEach(function (pref) {
                    line += "  -" + pref + "-" + propname + ":" + addPrefixToContent(pref, content);
                });
            }
        }

        out += line + "\r\n";
    }

    if (out != origFile) {
        echo("update " + s);
        writeFile(s, out);
    }
});
echo("*** END CSS");

}

