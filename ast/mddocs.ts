///<reference path='refs.ts'/>

module TDev.AST.MdDocs {

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

    function formatText(s:string)
    {
        var warnS = ""
        function warn(m:string)
        {
            warnS += "WARN: " + m + "\n"
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
