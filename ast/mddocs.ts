///<reference path='refs.ts'/>

module TDev.AST.MdDocs {

    var topicCore:string;
    var topicName:string;
    export var preexistingArtIds:StringMap<string> = {};
    var lastTopic:string;
    var currBox:string;

    export function info() {
        return JSON.stringify({
        }, null, 1)
    }

    var macroMap = {
        "videoptr": "video",
        "section": "section",
        "breadcrumbtitle": "short",
        "parenttopic": "parent",
    }

    export function formatText(s:string)
    {
        var warnS = ""
        function warn(m:string)
        {
            if (topicName != lastTopic) {
                console.log("*** " + topicName)
                lastTopic = topicName
            }
            warnS += "WARN: " + m + "\n"
            console.log("WARN: " + m)
        }

        s = s.replace(/\t/g, " ")
        s = s.replace(/\[([^\n\[\]]*)\]\s*\(([\w\/\-]+)\)/g, (f, name, lnk) => {
            if (!name)
                name = lnk.replace(/.*\//, "")
            lnk = lnk.replace(/^\/td/, "/ts")
            lnk = "/microbit" + lnk
            return "[" + name + "](" + lnk + ")"
        })
        s = s.replace(/\{([\/\w\*]+)(:([^{}]*))?\}/g, (full, macro, dummy, arg) => {
            macro = macro.toLowerCase()
            if (macro == "vimeo") {
                macro = "videoptr"
                arg = "vimeo/" + arg
            }
            if (macro == "sig") {
                var m = arg.split(/->/);
                var act:Action = null;
                Script.librariesAndThis().forEach(l => {
                    if (l.getName() == m[0])
                        act = act || l.getPublicActions().filter(a => a.getName() == m[1])[0]
                })
                if (act) {
                    return quoteCode(converter.renderSig(act))
                } else {
                    warn("cannot find lib action: " + arg)
                    return full;
                }
            } else if (macro == "decl") {
                var d = TDev.Script.things.filter(t => t.getName() == arg)[0]
                if (!d) {
                    warn("no such decl: " + arg)
                    return full;
                }
                else
                    return mkSnippet([d])
            } else if (macro == "fullsig") {
                warn("unsupported macro: " + macro)
                return full;
            } else if (macro == "topic") {
                topicName = arg
                topicCore = ("/" + arg).replace(/(\/(td|functions))+\//g, "/").replace(/\/(activity|quiz|quiz.answer(s|)|challenges|tutorial)$/, "")
                if (!topicCore) topicCore = topicName
                topicCore = topicCore.replace(/^\//, "").toLowerCase()
                return ""
            } else if (macro == "box") {
                if(!arg) arg = "box"
                var mm = /([^:]+):(.*)/.exec(arg)
                var tp = mm ? mm[1] : arg
                var title = mm ? mm[2] : ""
                currBox = null
                if (tp == "card")
                    return "## " + title
                else if (tp == "screen")
                    return ""
                else if (title)
                    title = tp + ": " + title
                else
                    title = tp
                currBox = title
                return "###~ " + title
            } else if (macro == "hide") {
                currBox = "hide"
                return "###~ hide"
            } else if (macro == "/box" || macro == "/hide") {
                if (currBox) {
                    currBox = null
                    return "###~"
                }
                return ""
            } else if (macroMap.hasOwnProperty(macro)) {
                return "### @" + macroMap[macro] + " " + (arg || "") + "\n"
            } else if (macro == "pic" || macro == "pici") {
                var args = arg.split(/:/)
                var r0 = Script.resources().filter(r => MdComments.shrink(r.getName()) == MdComments.shrink(args[0]))[0]
                var artId = ""
                if (r0) {
                    var mm = /([a-z]+)$/.exec(r0.url)
                    if (mm) artId = mm[1]
                }
                if (!artId && /^[a-z]+$/.test(args[0])) {
                    artId = args[0]
                }

                if (!artId)
                    warn("missing picture: " + arg)
                
                var preName = preexistingArtIds[artId]
                
                if (!preName) {
                    warn("unknown picture: " + arg)
                    return "(picture " + args[0] + ")"
                }

                return "![](/static/mb/" + preName + ")"

            } else {
                warnS += "MACRO: " + macro
                return full;
            }
        })
        // s = s.replace(/\s+/g, " ").trim()

        if (/^\* /.test(s))
            return s + "\n" + warnS
        return "\n" + s + "\n" + warnS + "\n"
    }

    function quoteCode(s:string)
    {
        return "\n```\n" + s.trim() + "\n```\n\n";
    }

    function mkSnippet(stmts:Stmt[])
    {
        return quoteCode(converter.renderSnippet(stmts))
    }

    function extractStmts(stmts:Stmt[])
    {
        var output = "";

        for (var i = 0; i < stmts.length; ) {
            var cmt = stmts[i].docText()

            if (cmt != null) {
                var m;
                if ((m = /^\s*(\{code\}|````)\s*$/.exec(cmt)) != null) {
                    var j = i + 1;
                    var seenStmt = false;
                    while (j < stmts.length) {
                        if (/^\s*(\{\/code\}|````)\s*$/.test(stmts[j].docText()))
                            break;
                        j++;
                    }
                    output += mkSnippet(stmts.slice(i + 1, j));
                    i = j + 1;
                } else {
                    output += formatText(cmt);
                    i++;
                }
            } else {
                var j = i;
                while (j < stmts.length) {
                    if (stmts[j].docText() != null) break;
                    j++;
                }
                output += mkSnippet(stmts.slice(i, j));
                i = j;
            }
        }

        return output
    }

    var converter:Converter;

    export function toMD(app:App)
    {
        converter = new Converter(app)
        converter.run() // prep etc

        var header = "# " + app.getName() + "\n\n" + app.getDescription() + "\n\n"
        var body = extractStmts(app.mainAction().body.stmts)
        return (header + body).replace(/\n\n+/g, "\n\n")
    }
}
