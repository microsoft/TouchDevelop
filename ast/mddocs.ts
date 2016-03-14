///<reference path='refs.ts'/>

module TDev.AST.MdDocs {

    var topicCore:string;
    var topicName:string;

    var artNames:StringMap<NameInfo> = {};

    interface NameInfo {
        topics:string[];
        name:string;
        id:string;
    }

    var artCount:StringMap<number> = {};

    class Writer extends AST.TokenWriter
    {
        public uniqueId(id:string)
        {
            return this;
        }

        constructor()
        {
            super()
            this.unicodeOps = false;
            this.indentLevel++;
            this.nl()
        }

        public quoted()
        {
            return "\n```" + this.finalize(true) + "\n```\n\n";
        }

        public comment(s:string)
        {
            this.op("//").space().write(formatText(s).trim()).nl();
            return this
        }
    }

    export function info() {
        var arr = Object.keys(artNames).map(k => artNames[k])
        arr.sort((a, b) => b.topics.length - a.topics.length)
        return JSON.stringify({
            pics: arr
        }, null, 1)
    }

    function formatText(s:string)
    {
        var warnS = ""
        function warn(m:string)
        {
            warnS += "WARN: " + m + "\n"
            console.log("WARN: " + m)
        }

        s = s.replace(/\s+/g, " ").trim()
        s = s.replace(/^\{([\w\*]+)(:([^{}]*))?\}/g, (full, macro, dummy, arg) => {
            if (macro == "sig") {
                var m = arg.split(/->/);
                var act:Action = null;
                Script.librariesAndThis().forEach(l => {
                    if (l.getName() == m[0])
                        act = act || l.getPublicActions().filter(a => a.getName() == m[1])[0]
                })
                if (act) {
                    var tw = new Writer()
                    act.writeHeader(tw)
                    return tw.quoted()
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
                console.log("*** " + topicName)
                return ""
            } else if (macro == "pic") {
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
                
                if (!artNames.hasOwnProperty(artId)) {
                    artCount[topicCore] = (artCount[topicCore] || 0) + 1
                    artNames[artId] = {
                        topics: [],
                        name: topicCore + "-" + (artCount[topicCore] - 1),
                        id: artId,
                    }
                }
                artNames[artId].topics.push(topicName)

                return "![](/img/" + artNames[artId].name + ".png)"

            } else {
                warnS += "MACRO: " + macro
                return full;
            }
        })

        if (/^\* /.test(s))
            return s + "\n" + warnS
        return "\n" + s + "\n" + warnS + "\n"
    }

    function mkSnippet(stmts:Stmt[])
    {
        var tw = new Writer()
        stmts.forEach(s => s.writeTo(tw))
        return tw.quoted()
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

    export function toMD(app:App)
    {
        var header = "# " + app.getName() + "\n\n" + app.getDescription() + "\n\n"
        var body = extractStmts(app.mainAction().body.stmts)
        return (header + body).replace(/\n\n+/g, "\n\n")
    }
}
