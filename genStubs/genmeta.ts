///<reference path='../../External/TypeScript/node.d.ts'/>
///<reference path='../rt/typings.d.ts'/>

import fs = require("fs");
import path = require("path");
import child_process = require("child_process")

var errCnt = 0;
export var TDev:any = {};
var kindInit = "";
var parametricInit = "\n// properties of generic kinds\n";
var parametricFinal = "\n// initialization of generic kinds\n";
var propInit = "";
var fileCnt = 0;
var usageCounts:any = {}
var helpCache:any = {}
var topicList = {}

var prelude = 
  "var TDev; TDev = TDev || {};\n" +
  "TDev.md_initApis = function md_initApis() {\n" +
  "   'use strict';\n" +
  "   var self;\n" + 
  "   var multiplex;\n" + 
  "   var mkKind = TDev.Kind.md_make;\n" + 
  "   var mkProp = TDev.Property.md_make;\n" + 
  "   var mkArg = TDev.PropertyParameter.md_make;\n" + 
  "   var k_Nothing = mkKind(10000, 'Nothing', 'Represents no value of interest');\n" +
  "   k_Nothing.md_isData();\n" +
  "\n" +
  "// Kind definitions\n" +
  "";

var interlude = "\n\n// Property definitions\n";

var helpDefinitions = "\n\n// Help definitions\n";

var postlude = "\n}\n";

interface IScript
{
    name:string;
    id:string;
    apis:string[];
    totalTokens:number;
    props:string[];
    missingApis:number;
}

function loadText(filename:string)
{
    return fs.readFileSync(filename, "utf8").replace(/^\uFEFF/, "");
}

function loadJson(filename:string)
{
    return JSON.parse(loadText(filename));
}

function saveText(filename:string, text:string) {
    if (text.charAt(0) != '\uFEFF') text = '\uFEFF' + text;
    var s = fs.existsSync(filename) ? fs.statSync(filename) : null;
    if (s && (s.mode & 0x80) == 0) {
        console.log("running tf edit " + filename);
        var proc = child_process.spawn("tf", ["edit", filename], { stdio: 'inherit' });
        proc.on("exit", () => {
            var s = fs.statSync(filename);
            if (s && (s.mode & 0x80) == 0) {
                console.log("overriding mode on " + filename);
                fs.chmodSync(filename, '644');
            }
            fs.writeFileSync(filename, text, "utf8");
        });
    } else {
        fs.writeFileSync(filename, text, "utf8");
    }
}

function unquote(s:string) {
    var ss = s.replace(/_/g, " ").replace(/([a-z])([A-Z])/g, (m, a, b) => a + " " + b).trim();
    switch (ss) {
        case "Date Time": return "DateTime";
        case "Text Box": return "TextBox";

        default: return ss;
    }
}

function hashify(s:string)
{
    return s.replace(/[^a-zA-Z0-9]/g, "").toLowerCase()
}

function processFile(filename:string)
{
    var help = null;
    var jsAttrs:string[] = [];
    var currLine = 0;
    var currKind = "";
    var hashPref = "";
    var propUsage = {};
    var isBuiltin = false;
    var isData = false;
    var attr_kindClass = null;
    var attr_returns = null;
    var attr_name = null;
    var kind_params = null;
    var method_type_params = null;

    function err(msg:string) {
        console.log("%s(%d): %s", filename, currLine, msg);
        errCnt++;
    }

    function kindRef(s:string) {
        s = s.trim();
        switch (s) {
            case "number": return "k_Number_";
            case "string": return "k_String_";
            case "boolean": return "k_Boolean_";
            case "void": return "k_Nothing";
            default:
                if (method_type_params) {
                    var idx = method_type_params.indexOf(s)
                    if (idx >= 0) return "multiplex.getParameter(" + idx + ")";
                }
                if (kind_params) {
                    var idx = kind_params.indexOf(s)
                    if (idx >= 0) return currKind + ".getParameter(" + idx + ")";
                }
                var m = /^([^<>]*)<(.*)>$/.exec(s);
                if (m) {
                    var pref = kindRef(m[1]);
                    var args = m[2].split(/,\s*/);
                    if (pref == currKind && JSON.stringify(args) == JSON.stringify(kind_params))
                        return pref;
                    return pref + ".createInstance([" + args.map(kindRef).join(", ") + "])";
                }

                return "k_" + s;
        }
    }


    loadText(filename).split('\n').forEach((line:string, idx:number) => {
        var q = JSON.stringify;
        currLine = idx + 1; // for reasons unknown editors start counting lines at 1
        function wrLine(isKind:boolean, ln:string) {
            if (isKind)
                kindInit += ln + "\n";
            else if (kind_params)
                parametricInit += ln + "\n";
            else
                propInit += ln + "\n";
        }

        function attrLine(line:string, front = false) {
            while (true) {
                var m = /^\s*([^\s\(\)]+(\(("[^"]*"|'[^']*'|[^\(\)])*\))?),?\s*/.exec(line)
                if (m) {
                    line = line.slice(m[0].length);
                    var cl = m[1];
                    m = /^\[([^\]]+)\]\./.exec(cl)
                    if (m)
                        cl = "arg(" + q(unquote(m[1])) + ").md_" + cl.slice(m[0].length);
                    m = /^(parametric|ctx|cap|stub|name|flow|onlyOn)\(([^\)"']*)\)$/.exec(cl);
                    if (m)
                        cl = m[1] + "(" + m[2].split(/,\s*/).map(q).join(", ") + ")";
                    if (!/\)$/.test(cl)) cl += "()";

                    m = /^name\((".*")\)$/.exec(cl);
                    if (m) {
                        attr_name = JSON.parse(m[1]);
                        continue;
                    }

                    m = /^returns\(([^\)]+)\)$/.exec(cl);
                    if (m) {
                        attr_returns = m[1];
                        continue;
                    }

                    if (cl == 'isAction()') attr_kindClass = "action";
                    if (/^parametric\(/.test(cl)) {
                        kind_params = cl.replace(/^parametric\(/, "").replace(/["')]/g, "").split(/,\s*/)
                        if (attr_kindClass != "action")
                            attr_kindClass = "parametric";
                    }
                    var aa = "self.md_" + cl + ";"
                    if (front) jsAttrs.unshift(aa);
                    else jsAttrs.push(aa);
                } else {
                    if (line.trim())
                        err("cannot understand '" + line + "'")
                    break;
                }
            }
        }

        function flushAttrs(isKind:boolean) {
            jsAttrs.forEach((l) => wrLine(isKind, l));
            help = null;
            jsAttrs = [];
            attr_kindClass = null;
            attr_name = null;
            attr_returns = null;
        }


        line = line.replace(/\r/, "");

        var m = /^\s*\/\/\?(.*)/.exec(line);
        if (m) {
            if (help != null)
                err("multiple help lines specified");
            help = m[1].trim();
            translationHelpStrings[help] = 1
        }
        
        m = /^\s*\/\/@@(.*)/.exec(line);
        if (m) jsAttrs.push(m[1].trim());
        else {
            m = /^\s*\/\/@(.*)/.exec(line);
            if (m) attrLine(m[1].trim());
        }

        if (help != null) {
            m = /^\s*export (class|module) ([A-Za-z0-9_]+)(<[A-Za-z0-9_, ]+>)?(?: |$)/.exec(line);
            if (!m)
                m = /^\s*(module) [A-Za-z0-9_\.]+\.([A-Za-z0-9_]+)(<[A-Za-z0-9_, ]+>)?(?: |$)/.exec(line);
            if (m) {
                kind_params = null;
                isBuiltin = m[2] == "Number_" || m[2] == "Boolean_" || m[2] == "String_";
                isData = m[1] == "class" || isBuiltin;
                if (isData) attrLine("isData", true);
                if (m[3])
                    attrLine("parametric(" + m[3].replace(/[<>]/g, "") + ")");
                currKind = kindRef(m[2]);
                if (kind_params)
                    parametricFinal += currKind + ".initProperties();\n";
                var actionArg = attr_kindClass ? ", '" + attr_kindClass + "'" : "";
                var cnt = 0;
                var tdname = unquote(m[2])
                propUsage = {};
                if (usageCounts[tdname]) {
                    cnt = usageCounts[tdname].usage_count;
                    propUsage = usageCounts[tdname].properties;
                }
                topicList[hashPref = hashify(tdname)] = 1
                wrLine(true, "var " + currKind + " = self = mkKind(" + cnt + ", " + q(unquote(m[2])) + ", " + q(help) + actionArg + ");");
                flushAttrs(true);

                if (isData) {
                    tdname = "is invalid";
                    wrLine(false, "self = mkProp(" + (propUsage[tdname] || 0) + ", " + currKind + ", " 
                            + q(tdname) + ", \"Returns true if the current instance is useless\", [], k_Boolean_);")
                    wrLine(false, "self.md_runOnInvalid();");
                    wrLine(false, "self.md_cap('none');");
                }
            }

            m = /^\s*(export function|public) ([A-Za-z0-9_]+)\s*(<(.*)>)?\(([^\(\)]*)\)(?:\s*:\s*([^=\{\/]*))?/.exec(line);
            if (m) {
                var nameS = m[2]
                var typeArgsS = m[4]
                var argsS = m[5]
                var retTypeS = m[6]
                method_type_params = null;

                argsS = argsS.replace(/(<[^>]*),/g, (a,x) => x + "%")
                var args = argsS.split(/,\s*/).filter((s) => !!s).map(s => s.replace(/%/g, ","));
                while (args.length > 0 && /type_[A-Z]+\s*:\s*any/.test(args[args.length-1])) {
                    args.pop();
                }
                if (args.length > 0 && /:\s*ResumeCtx/.test(args[args.length-1])) {
                    args.pop();
                    attrLine("resumes", true);
                } else if (args.length > 0 && /:\s*IStackFrame/.test(args[args.length -1])) {
                    args.pop();
                    attrLine("needsFrame", true);
                }

                if (isBuiltin) args.shift();

                var retType = attr_returns || retTypeS || "void";
                
                if (typeArgsS) {
                    wrLine(false, "multiplex = TDev.MultiplexRootProperty.md_make_kind();")
                    method_type_params = typeArgsS.split(/,\s*/)
                    wrLine(false, "multiplex.md_parametric(" + method_type_params.map(q).join(",") + ");")
                }
                var sargs = args.map((arg) => {
                    var mm = /(.*):(.*)/.exec(arg);
                    if (!mm) {
                        err("invalid argument: '" + arg + "' in '" + argsS + "'");
                        return "";
                    } else {
                        return "mkArg(" + q(unquote(mm[1].trim())) + ", " + kindRef(mm[2]) + ")";
                    }
                })
                var tdname = unquote(nameS);
                if (attr_name) {
                    jsAttrs.push("self.md_jsName(\"" + nameS + "\");")
                    tdname = attr_name;
                }
                topicList[hashify(hashPref + tdname)] = 1
                var mkArgs = (propUsage[tdname] || 0) + ", " + currKind + ", " + q(tdname) + ", " + q(help) + ", " + 
                              "[" + sargs.join(", ") + "], " + kindRef(retType)
                if (typeArgsS) {
                    wrLine(false, "self = TDev.MultiplexRootProperty.md_make_prop(multiplex, " + mkArgs + ");")
                } else {
                    wrLine(false, "self = mkProp(" + mkArgs + ");")
                }
                flushAttrs(false);
            }
        }
    })

    if (help)
        err("unflushed //?");
    if (jsAttrs.length)
        err("unflushed //@");
}

var translationStrings = {}
var translationHelpStrings = {}

function processLf(filename:string)
{
    if (!/\.ts$/.test(filename)) return
    if (/\.d\.ts$/.test(filename)) return

    loadText(filename).split('\n').forEach((line:string, idx:number) => {
        function err(msg:string) {
            console.log("%s(%d): %s", filename, idx, msg);
            errCnt++;
        }

        while (true) {
            var newLine = line.replace(/\blf(_va)?\s*\(\s*(.*)/, (all, a, args) => {
                var m = /^("([^"]|(\\"))+")\s*[\),]/.exec(args)
                if (m) {
                    try {
                        var str = JSON.parse(m[1])
                        translationStrings[str] = 1
                    } catch (e) {
                        err("cannot JSON-parse " + m[1])
                    }
                } else {
                    if (!/util\.ts$/.test(filename))
                        err("invalid format of lf() argument: " + args)
                }
                return "BLAH " + args
            })
            if (newLine == line) return;
            line = newLine
        }
    })
}

export function genStubs()
{
    console.log("*** Start");
    usageCounts = loadJson("../json/usage_count.json");

    var libPath = "../lib/"

    fs.readdirSync(libPath).forEach((fn) => {
        fileCnt++;
        processFile(path.join(libPath, fn));
    })

    var srcPaths = ["lib", "rt", "storage", "ast", "editor", "libwab", "libwinRT", "libnode", "nodeclient"]
    srcPaths.forEach(pth => {
        fs.readdirSync("../" + pth).forEach((fn) => {
            fileCnt++;
            processLf(path.join("../" + pth, fn));
        })
    })

    Object.keys(translationHelpStrings).forEach(k => translationStrings[k] = 1)
    var tr = Object.keys(translationStrings)
    tr.sort()
    /*
    tr.forEach(s => {
        if (translationHelpStrings.hasOwnProperty(s)) {
            console.log("common: " + s)
        }
    })
    */
    fs.writeFileSync("localization.json", JSON.stringify({ strings: tr }, null, 1))

    helpDefinitions += "TDev.api.addHelpTopics(" + loadText("../help.cache") + ")\n\n";
    helpDefinitions += "TDev.AST.Json.docs = " + JSON.stringify(loadText("../ast/jsonInterfaces.ts").replace(/\r/g, "")) + ";\n";
    helpDefinitions += "TDev.webappHtml = " + JSON.stringify(loadText("../webapp.html").replace(/\r/g, "")) + ";\n";

    saveText("api.js", prelude + kindInit + interlude + parametricInit + parametricFinal + propInit + helpDefinitions + postlude);
    fs.writeFileSync("topiclist.json", JSON.stringify(topicList, null, 2))

    console.log("*** Stop; " + fileCnt + " files");
    if (errCnt > 0) {
        console.log("%d errors", errCnt);
        process.exit(1);
    }
}


genStubs();
