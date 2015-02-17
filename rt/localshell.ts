///<reference path='refs.ts'/>

module TDev {
    export var baseUrl: string = "./";

    export module LocalShell {
        export function localProxyHandler() {
            return function (cmd, data) {
                if (cmd == "shell") return LocalShell.runShellAsync(data)
                else if (cmd == "socket") 
                    return LocalShell.mgmtRequestAsync("stats")
                        .then(() => { return { url: mgmtUrl("").replace(/^http/, "ws") } })
                else return LocalShell.mgmtRequestAsync("plugin/" + cmd, data)
            };
        }

        export function deploymentKey(): string {
            var mg = mgmtUrl("")
            var m = mg ? mg.match(/^.*?\/-tdevmgmt-\/([a-z0-9]+)$/) : undefined;
            return m ? m[1] : undefined;
        }

        export function url(): string {
            var mg = mgmtUrl("")
            var m = mg ? mg.match(/^(.*?\/)-tdevmgmt-\/[a-z0-9]+$/) : undefined;
            return m ? m[1] : undefined;
        }

        export function mgmtUrl(path: string): string {
            if (path && !/^\//.test(path)) path = "/" + path

            var localProxy = window.localStorage.getItem("local_proxy")
            if (localProxy) {
                var r = localProxy + path
                Util.log('shell: local proxy {0}', r);
                return r
            }

            var tok = window.localStorage.getItem("td_deployment_key")
            if (!tok) {
                Util.log('shell: missing deployment key');
                return null
            }

            var m = /(.*:\/\/[^\/]+\/)/.exec(baseUrl)
            if (!m) {
                Util.log('shell: invalid base url {0}', baseUrl);
                return null
            }

            var r = m[1] + "-tdevmgmt-/" + tok + path
            Util.log('shell: mgmturl {0}', r);
            return r
        }

        export function mgmtRequestAsync(path: string, data?: any): Promise {
            Util.log("shell mgmtRequest " + path)
            if (!data) return Util.httpGetJsonAsync(mgmtUrl(path))
            else return Util.httpPostRealJsonAsync(mgmtUrl(path), data)
        }

        var lastShell: WebSocket = undefined;
        export function runShellAsync(data: any): Promise {
            Util.log('shell run {0}', JSON.stringify(data));
            if (lastShell) {
                Util.log('killing previous shell process');
                lastShell.send(JSON.stringify({ op: "kill" }));
                lastShell.close();
                lastShell = undefined;
            }

            var res = new PromiseInv()
            var wsurl = mgmtUrl("").replace(/^http/, "ws");
            Util.log('shell socket: {0}', wsurl);
            var ws = lastShell = new WebSocket(wsurl);
            Util.log('socket created')
            ws.onopen = () => {
                data = Util.jsonClone(data)
                data.op = "shell"
                ws.send(JSON.stringify(data))
            }
            ws.onerror = e => {
                if (res.isPending())
                    res.error(e);
            }
            ws.onclose = e => {
                if (res.isPending())
                    res.error("shell connection closed")
            }
            var stdout: string[] = []; var stdoutbuf = "";
            var stderr: string[] = []; var stderrbuf = "";
            ws.onmessage = msg => {
                var d = JSON.parse(msg.data)
                if (d.op == "stdout") {
                    stdout.push(d.data)
                    // characters may come letter by letter...
                    stdoutbuf += d.data;
                    if (/\r?\n$/.test(stdoutbuf)) {
                        stdoutbuf.split(/\r?\n/).filter(s => !!s).forEach(s => RT.App.logEvent(RT.App.DEBUG, "", s, undefined))
                        stdoutbuf = ""
                    }
                } else if (d.op == "stderr") {
                    stderr.push(d.data)
                    stderrbuf += d.data;
                    if (/\r?\n$/.test(stderrbuf)) {
                        stderrbuf.split(/\r?\n/).filter(s => !!s).forEach(s => RT.App.logEvent(RT.App.WARNING, "", s, undefined))
                        stderrbuf = ""
                    }
                } else if (d.op == "error") {
                    RT.App.logEvent(RT.App.ERROR, "", d.message, undefined)
                    if (res.isPending())
                        res.error(d.message)
                    ws.close()
                    lastShell = undefined;
                } else if (d.op == "exit") {
                    RT.App.logEvent(d.code == 0 ? RT.App.INFO : RT.App.WARNING, "", "exited with " + d.code, undefined)
                    if (res.isPending())
                        res.success({
                            stdout: stdout.join(""),
                            stderr: stderr.join(""),
                            code: d.code,
                        })
                    ws.close()
                    lastShell = undefined;
                }
            }
            return res
        }
    }
}
