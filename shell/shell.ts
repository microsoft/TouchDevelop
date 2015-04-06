///<reference path='../typings/node/node.d.ts'/>

import fs = require('fs');

var fileLog: (msg: string) => void = undefined;
if (process.env["TD_SHELL_LOG_FILE"]) {
    var logPath = process.env["TD_SHELL_LOG_FILE"];
    fileLog = (msg) => {
        var fl = fs.openSync(logPath, "a");
        var b = new Buffer(msg + '\r\n');
        fs.writeSync(fl, b, 0, b.length, 0);
        fs.closeSync(fl);
    }
}

import url = require('url');
import http = require('http');
import https = require('https');
import path = require('path');
import zlib = require('zlib');
import util = require('util');
import crypto = require('crypto');
import child_process = require('child_process');
import os = require('os');
import events = require('events');
import net = require("net");

var config:any;
var currentReqNo = 0;
var inAzure = false;
var controllerUrl = "";
var isNpm = false;
var inNodeWebkit = false;
var dataDir : string = ".";
var useFileSockets = false;
var allowEditor = false;
var numWorkers = 1;
var blobChannel = "";

function dataPath(p : string) : string {
  p = p || "";
  return dataDir ? path.join(dataDir, p) : p;
}

function userHome() : string {
  return process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
}

interface TdState {
    downloadedFiles:StringMap<string>;
    numDeploys:number;
    deployedId:string;
}

var tdstate:TdState;

interface LogMessage {
    timestamp: number;
    msg: string;
}

class Logger {
    logIdx = -1;
    logMsgs:LogMessage[] = [];
    logSz = 1000;
    
    constructor(public name : string, public level:number)
    {}

    addMsg(s:string)
    {
        var m = {
            timestamp: Date.now(),
            msg: s
        }
        if (fileLog) fileLog(s);
        if (!inAzure) console.log(s)
        if (this.logIdx >= 0) {
            this.logMsgs[this.logIdx++] = m;
            if (this.logIdx >= this.logSz) this.logIdx = 0;
        } else {
            this.logMsgs.push(m);
            if (this.logMsgs.length >= this.logSz)
                this.logIdx = 0;
        }
    }

    log(...args:any[])
    {
        this.addMsg(util.format.apply(null, args))
    }

    getMsgs():any[]
    {
        var i = this.logIdx;
        var res = [];
        var wrapped = false;
        if (i < 0) i = 0;
        var n = Date.now()
        while (i < this.logMsgs.length) {
            var m = this.logMsgs[i]
            var diff = ("00000000" + (n - m.timestamp)).slice(-7).replace(/(\d\d\d)$/, (m) => "." + m);
            res.push({
                timestamp: m.timestamp,
                msg: m.msg,
                elapsed: diff,
                level: this.level,
                category: "shell",
            })
            if (++i == this.logMsgs.length && !wrapped) {
                wrapped = true;
                i = 0;
            }
            if (wrapped && i >= this.logIdx) break;
        }
        res.reverse()
        return res;
    }
}

var error = new Logger("error", 3)
var info = new Logger("info", 6)
var debug = new Logger("debug", 7)

class ApiRequest {
    data:any = {}
    cmd:string[] = [];
    reqNo = ++currentReqNo;

    constructor(public req:http.ServerRequest, public resp:http.ServerResponse)
    {
    }

    forwardToWorkers()
    {
        var respArr = []
        var numReqs = 1

        var oneUp = () => {
            if (--numReqs == 0) this.ok({ workers: respArr })
        }

        workers.forEach((w, i) => {
            var thisResp:any = {
                worker: w.description(),
            }
            respArr[i] = thisResp

            if (!w.child) {
                thisResp.code = -1
                return
            }

            var u = w.getUrl()
            u.method = this.req.method
            u.headers = this.req.headers
            u.path = this.req.url

            numReqs++
            var creq = http.request(u, cres => {
                thisResp.code = cres.statusCode
                cres.setEncoding("utf8")
                var s = ""
                cres.on("data", d => s += d)
                cres.on("end", () => {
                    try {
                      thisResp.body = JSON.parse(s)
                    } catch (e) {
                      thisResp.body = s
                    }
                    oneUp()
                })
            })
            creq.on("error", err => {
                thisResp.code = -1
                thisResp.body = err.message || (err + "")
                oneUp()
            })
            if (Object.keys(this.data))
                creq.end(JSON.stringify(this.data))
            else creq.end()
        })
        oneUp()
    }

    error(code:number, text:string)
    {
        info.log("HTTP error " + code + ": " + text)
        this.resp.writeHead(code, { 'Content-Type': 'text/plain' })
        this.resp.write(text, "utf8")
        this.resp.end()
    }

    setCors()
    {
        this.resp.setHeader('Access-Control-Allow-Origin', "*");
        this.resp.setHeader('Access-Control-Allow-Methods', 'GET,PUT,POST');
        this.resp.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        this.resp.setHeader('Access-Control-Expose-Headers', 'ErrorMessage');
    }

    processMgmt()
    {
        var cmd = this.cmd
        if (this.data.minVersion && config.shellVersion < this.data.minVersion) {
            this.error(400, "shell version is too old")
            return
        }
        if (mgmt.hasOwnProperty(cmd[0])) {
            mgmt[cmd[0]](this);
        } else {
            this.error(404, "no such api " + cmd[0])
        }
    }

    handleMgmt(cmd:string[])
    {
        var buf = ""

        var final = () => {
            try {
                this.cmd = cmd;
                this.data = JSON.parse(buf || "{}")
                this.processMgmt()
            } catch (e) {
                this.exception(e)
            }
        }

        var req = this.req
        if (req.method == "POST" || req.method == "PUT") {
            req.setEncoding('utf8');
            req.on('data', (chunk) => { buf += chunk });
            req.on('end', final);
        } else {
            final()
        }
    }

    ok(r:any)
    {
        this.resp.writeHead(200, { 'Content-Type': 'application/json; encoding=utf-8' })
        this.resp.write(JSON.stringify(r), "utf8")
        this.resp.end()
    }

    exception(e:any)
    {
        saveState()
        var msg = "exception: " + e.toString() + " " + e.stack
        error.log(msg)
        this.error(500, msg) // TODO remove
    }

    pluginCb(passData = false)
    {
        return (err, data) => {
            if (err) this.ok({ error: err + "" })
            else if (passData)
                this.ok({ data: data })
            else
                this.ok({ })
        }
    }
}

function downloadStream(u:string, f:(str:any)=>void)
{
    var p:any = url.parse(u);

    https.get(p, (res:http.ClientResponse) => {
        if (res.statusCode == 200) {
            f(res)
        } else {
            var msg = "error downloading file " + u + "; HTTP " + res.statusCode
            console.error(msg)
            f(null)
        }
    });
}

function downloadFile(u:string, f:(err:any, s:NodeBuffer, h?:any)=>void)
{
    var p:any = url.parse(u);

    p.headers = {
        "Accept-Encoding": "gzip"
    }

    var mod:any = http
    if (p.protocol == "https:")
        mod = https

    debug.log('download ' + u);
    mod.get(p, (res:http.ClientResponse) => {
        if (res.statusCode == 302) {
            downloadFile(res.headers['location'], f);
            (<any>res).end();
        } else if (res.statusCode == 200) {
            if (/gzip/.test(res.headers['content-encoding'])) {
                var g:events.EventEmitter = zlib.createUnzip(undefined);
                (<any>res).pipe(g);
            } else {
                g = res;
                // (<any>res).setEncoding('utf8');
            }

            var bufs = []
            g.on('data', (c) => {
                if (typeof c === "string")
                    bufs.push(new Buffer(c, "utf8"))
                else
                    bufs.push(c)
            });

            g.on('end', () => {
                var total = Buffer.concat(bufs)
                f(null, total, (<any>res).headers)
            })

        } else {
            var msg = "error downloading file " + u + "; HTTP " + res.statusCode
            error.log(msg)
            f(msg, null)
        }
    }).on("error", e => {
        var msg = "error downloading file " + u + "; " + e
        error.log(msg)
        f(msg, null)
    })
}

function downloadJson(u:string, f:(err:any, d:any)=>void)
{
    downloadFile(u, (err, b) => {
        if (err) f(err, null)
        else {
            try {
                var d = JSON.parse(b.toString("utf8"))
            } catch (err) {
                f(err, null)
                return
            }
            f(null, d)
        }
    })
}

interface StringMap<T>
{
    [index:string] : T;
}

interface FileEntry {
    path:string;
    url?:string;
    content?:string;
    updated?:boolean;
}

function mkDirP(path: string, mode = "777", cb? : () => void) {
    var elts = path.split(/\/|\\/)
    // we might have gotten a race here if we used async
    var mk = (i: number) => {
        if (i > 0) {
            var p = elts.slice(0, i).join("/")
            if (!fs.existsSync(p)) {
                mk(i - 1)
                fs.mkdirSync(p, mode)
            }
        }
    }
    mk(elts.length - 1)
    if (cb) cb();
}

function processFileEntry(fe:FileEntry, f)
{
    var state = tdstate.downloadedFiles

    fe.path = fe.path.replace(/\\/g, "/")

    if (fe.url && state[fe.path] === fe.url) {
        f(null)
        return
    }

    var prevUrl = state[fe.path]
    mkDirP(fe.path);

    state[fe.path] = "undefined://"
    saveState()

    var final = err => {
        if (!err) {
            state[fe.path] = fe.url
            saveState()
        }
        f(err)
    }

    if (fe.content) {
        var h = crypto.createHash("sha256")
        h.update(new Buffer(fe.content, "utf8"))
        fe.url = "sha256://" + h.digest("hex")
        if (fe.url != prevUrl)
            fe.updated = true
        debug.log('writefile: ' + fe.path + ' ' + fe.url);
        fs.writeFile(fe.path, fe.content, "utf8", final)
    } else {
        fe.updated = true
        downloadFile(fe.url, (err, s) => {
            if (err) f(err)
            else {
                debug.log('writefile: ' + fe.path);
                fs.writeFile(fe.path, s, null, final)
            }
        })
    }
}

function lazyRequire(pkg: string, finish: (md: any) => void) {
    try {
        var md = require(pkg.split('@')[0]);
        finish(md);
    }
    catch (e) {
        executeNpm(["install", pkg], function () {
            var md = require(pkg.split('@')[0]);
            finish(md);            
        });
    }
}

function executeNpm(args:string[], finish:()=>void)
{
    // NPM_JS_PATH defined in Azure Web Apps
    var p = process.env["NPM_JS_PATH"] || path.join(path.dirname(process.execPath), "node_modules/npm/bin/npm-cli.js")
    if (!fs.existsSync(p))
        p = path.join(path.dirname(process.execPath).replace("/bin", "/lib"), "node_modules/npm/bin/npm-cli.js")
    if (!fs.existsSync(p))
        p = process.execPath.replace(/nodejs.*/, "npm/1.4.10/node_modules/npm/bin/npm-cli.js")
    info.log("running npm, " + p)
    child_process.execFile(process.execPath, [p].concat(args), {}, (err, stdout, stderr) => {
        if (err)
            error.log("npm failure: " + err)
        if (stdout)
            info.log("npm install output: " + stdout)
        if (stderr)
            error.log("npm install error: " + stderr)
        finish()
    })
}

var pythonEnv: any = undefined;
function initPython(force: boolean, finish: (err?: string) => void) {
    var pythonExe = "python.exe";
    if (pythonEnv) {
        info.log('python virtual environment already setup...');
        finish();
        return;
    }
    var virtualEnvDir = null;
    var pathSep = process.platform == "win32" ? ";" : ":";
    function setEnv() {
        pythonEnv = {};
        if (virtualEnvDir) {
            pythonEnv.VIRTUAL_ENV = virtualEnvDir;
            pythonEnv.PYTHONHOME = '';
            pythonEnv.PATH = path.join(virtualEnvDir, "Scripts") + pathSep + process.env["PATH"]
        }
    }
    function done() {
        setEnv();
        finish();
    }

    function pythonVersion(next: (err,stdout) => void) {
        child_process.exec("python --version", (err,stdout,stderr) => {
            if (!err && stdout) info.log(stdout.toString())
            next(err,stdout);
        })
    }
    function findPython(next : () => void) {
        pythonVersion((err,stdout) => {
            if (err) {
                // python is typically not added to the PATH in windows
                if (/^win/.test(process.platform)) {
                    debug.log('python not found, searching...')
                    var pythonPath;
                    if (process.env["PYTHONHOME"] && fs.existsSync(process.env["PYTHONHOME"])) pythonPath = process.env["PYTHONHOME"];
                    else if (fs.existsSync("C:\\Python27\\python.exe")) pythonPath = "C:\\Python27\\";
                    else if (fs.existsSync("D:\\Python27\\python.exe")) pythonPath = "D:\\Python27\\";
                    else if (fs.existsSync("E:\\Python27\\python.exe")) pythonPath = "E:\\Python27\\";
                    if (pythonPath) {
                        info.log('found python at ' + pythonPath);
                        var pathEnv = <string>process.env["PATH"];
                        if (pathEnv && pathEnv.indexOf(pythonPath) < 0) {
                            debug.log('adding python to PATH');
                            process.env["PYTHONHOME"] = pythonPath
                            process.env["PATH"] = pathEnv + pathSep + pythonPath + pathSep + path.join(pythonPath, "Scripts")
                            pythonVersion((err2,stdout2) => {
                                if(err2) error.log('could not find python.exe. make sure the python installation folder is added to the path');
                                next();
                            });
                            return;
                        }
                    }
                }

                // python not found
                error.log('could not find python.exe, did you install python?');
            }

            next();
        });
    }
    function mkVirtualEnv(pyDir : string) {
        // install virtualenv if needed.
        child_process.execFile("pip", ["install", "virtualenv"], {}, (e, so, se) => {
            child_process.execFile("python", ["-m", "virtualenv", "--verbose", pyDir], {}, (err, stdout, stderr) => {
                if (stdout) debug.log(stdout.toString())
                if (stderr) info.log(stderr.toString())
                // even if virtualenv failed, we might still be able to work
                if (!err)
                    virtualEnvDir = pyDir;
                setEnv();
                checkPip();
            });
        });
    }
    function checkPip() {
        runCommand({ command: "pip --version", cwd: virtualEnvDir }, (res) => {
            if (res.stdout) debug.log(res.stdout);
            if (res.stderr) info.log(res.stderr);
            if (res.code) {
                info.log('pip not installed, installing...');
                installPip();
            }
            else {
                info.log("pip installed, skipping...");
                done();
            }
        });
    }
    function installPip() {
        downloadFile('https://bootstrap.pypa.io/get-pip.py', (e, buf) => {
            if (e) finish('error while download get-pip.py: ' + e);
            else {
                debug.log('writing get-pip.py');
                fs.writeFileSync(path.join(virtualEnvDir + '/get-pip.py'), buf, 'utf-8');
                runCommand({ command: "python get-pip.py", cwd: virtualEnvDir }, (res) => {
                    if (res.stdout) debug.log(res.stdout);
                    if (res.stderr) error.log(res.stderr);
                    if (res.code) finish("pip installation failed: " + res.code);
                    else done();
                });
            }
        });
    }

    findPython(() => {
        var pyDir = dataPath("py");
        var ready = fs.existsSync(pyDir);
        if (ready && !force) {
            info.log('found existing python virtual environment at ' + pyDir);
            virtualEnvDir = pyDir;
            done();
            return;
        }
        info.log("creating Python virtual environment...");
        mkVirtualEnv(pyDir);
    });
}

function executePip(args: string[], finish: () => void) {
    var p = "pip " + args.join(" ");
    info.log("install python packages...");
    child_process.exec(p, {
        env: pythonEnv
    }, (err, stdout, stderr) => {
        if (err) error.log("pip failure: " + err)
            if (stdout) info.log(stdout.toString())
            if (stderr) error.log(stderr.toString())
            finish()
        })
}

function deploy(d:any, cb:(err:any,resp:any) => void, isScript = true)
{
    var numFiles = 1
    var hadExn = false
    var runNpm = false
    var runPython = false
    var runPip = false

    info.log("starting deployment")

    var finish = () => {
        if (!isScript) {
            cb(null, { status: "ok" })
            return
        }

        try {
            reloadScript()
            scriptLoadPromise.done(() => cb(null, { status: "ok" }),
                err => {
                    handleError(err)
                    cb(err, null)
                })
        } catch (e) {
            handleError(e)
            cb(e, null)
        }
    }

    var oneUp = () => {
        if (numFiles == 0 || --numFiles == 0) {
            if (runNpm) {
                runNpm = false
                executeNpm(["install"], oneUp)
            } else if (runPython) {
                runPython = false;
                initPython(runPip, oneUp);
            } else if (runPip) {
                runPip = false
                executePip(["install", "-r", "requirements.txt"], oneUp)
            } else {
                finish()
            }
        }
    }

    if (isScript) {
        tdstate.numDeploys = (tdstate.numDeploys || 0) + 1
        tdstate.deployedId = ""
        saveState()
    }

    debug.log("deploy: " + JSON.stringify(d.files.map(f => f.path)));

    d.files.forEach(fe => {
        numFiles++
        processFileEntry(fe, err => {
            if (isScript && fe.path == "package.json" && fe.updated)
                runNpm = true
            else if (isScript && fe.path == "requirements.txt") {
                runPython = true
                runPip = fe.updated
            }
            if (hadExn) saveState();
            else if (err) {
                hadExn = true
                cb(err, null)
            } else {
                oneUp()
            }
        })
    })

    oneUp()
}

export interface RunCliOptions {
    command: string;
    args?: string[];
    stdin?: string;
    streamStdin?: boolean;
    cwd?: string;
    env?: any;
}

function clone<T>(obj: T): T {
    var r = new (<any>obj).constructor
    for (var k in obj) {
        if (obj.hasOwnProperty(k))
            r[k] = obj[k]
    }
    return <T>r
}

function createProcess(d:RunCliOptions)
{
    var isWin = /^win/.test(os.platform())
    debug.log("running: " + (d.cwd || "") + ">" + d.command + (d.args ? (" " + d.args.join(" ")) : ""))
    var env = clone(d.env || process.env);
    if (pythonEnv) Object.keys(pythonEnv).forEach(k => env[k] = pythonEnv[k]);
    var proc = child_process.spawn(d.args ? d.command : isWin ? "cmd" : "sh", d.args || [isWin ? "/c" : "-c", d.command], {
        cwd: d.cwd || undefined,
        env: env,
    })

    //proc.stdin.setEncoding("utf8")
    proc.stdout.setEncoding("utf8")
    proc.stderr.setEncoding("utf8")

    return proc
}

function runCommand(d:RunCliOptions, f) {
    var proc = createProcess(d)

    proc.stdin.write(d.stdin || "", "utf8");
    proc.stdin.end();

    var stdout = ""
    var stderr = ""

    proc.stdout.on("data", data => {
        process.stdout.write(data)
        stdout += data
    })

    proc.stderr.on("data", data => {
        process.stdout.write(data)
        stderr += data
    })

    proc.on("exit", code => {
        f({
            code: code,
            stdout: stdout,
            stderr: stderr,
        })
    })
}

function deployAr(ar:ApiRequest, isScript:boolean)
{
    var final = (err, resp) => {
        if (err) ar.ok({ status: "error", message: err + "" })
        else ar.ok(resp)
    }

    if (isScript && blobChannel) {
        var n = Math.round((Date.now()/1000))
        var did = crypto.randomBytes(8).toString("hex")
        var id = (100000000000 - n) + "." + crypto.randomBytes(8).toString("hex")
        setBlobJson(id, ar.data, err => {
            if (err) ar.exception(err)
            else
                setBlobJson("000ch-" + blobChannel, { 
                    blob: id, 
                    time: n,
                    did: did,
                }, err => {
                    if (err) ar.exception(err)
                    else {
                        blobDeployCallback = final
                        checkUpdate()
                    }
                })
        })
        return
    }

    if (!isScript)
        tdstate.downloadedFiles = {}

    deploy(ar.data, final, isScript)
}

var socketCmds:StringMap<(ws, data)=>void> = {
    shell: (ws, data) => {
        data.cwd = dataPath(data.cwd); // map to userhome if needed
        var proc = createProcess(data)

        socketCmds['kill'](ws, data)

        ws.currProc = proc
        debug.log('process ' + ws.currProc.pid);

        proc.stdin.write(data.stdin || "", "utf8");

        if (!data.streamStdin)
            proc.stdin.end()

        proc.stdout.on("data", data => {
            process.stdout.write(data)
            ws.sendJson({ op: "stdout", data: data })
        })

        proc.stderr.on("data", data => {
            process.stdout.write(data)
            ws.sendJson({ op: "stderr", data: data })
        })

        proc.on("exit", code => {
            ws.currProc = null
            ws.sendJson({ op: "exit", code: code })
        })

        proc.on("error", err => {
            ws.currProc = null
            ws.sendError(err)
        })
    },

    stdin: (ws, data) => {
        if (ws.currProc)
            ws.currProc.write(data.data || "", "utf8")
        else
            ws.sendError("no child process")
    },

    kill: (ws, data) => {
        if (ws.currProc && ws.currProc.pid) {
            debug.log('killing process ' + ws.currProc.pid);
            ws.currProc.kill("SIGKILL")
            ws.currProc = null
        }

        if (ws.currSock) {
            debug.log('closing socket')
            ws.currSock.destroy()
            ws.currSock = null
        }

        if (ws.serialPort) {
            debug.log('closing serialport');
            try { ws.serialPort.close(); } catch (e) { }
            ws.serialPort = null;
        }
    },

    log: (ws, data) => {
        logListeners.push(ws)
    },

    serial: (ws, data) => {
        socketCmds['kill'](ws, data)
        lazyRequire("serialport@1.6.1", function (serialport) {
            debug.log('opening serial ' + data.name);
            if (data.options.delimiter) data.options.parser = serialport.parsers.readline(data.options.delimiter);
            ws.serialPort = new serialport.SerialPort(data.name, data.options);
            ws.serialPort.on("open", function () {
                debug.log('serial: ' + data.name + ' connected');
                ws.sendJson({ op: "connected" })
            });
            ws.serialPort.on('data', function (data) {
                debug.log('serial: recv ' + JSON.stringify(data));
                ws.sendJson({ op: "recv", data: data })
            });
            ws.serialPort.on("error", err => {
                error.log('serial error: ' + JSON.stringify(err));
                ws.serialPort = null
                ws.sendError(err)
            })
        });
    },

    connect: (ws, data) => {
        socketCmds['kill'](ws, data)
        ws.currSock = net.connect(data.options, () => {
            ws.currSock.setEncoding("utf8")
            ws.sendJson({ op: "connected" })
        })

        ws.currSock.on("data", data => {
            ws.sendJson({ op: "recv", data: data })
        })

        ws.currSock.on("error", err => {
            ws.currSock = null
            ws.sendError(err)
        })
    },

    send: (ws, data) => {
        if (ws.currSock)
            ws.currSock.write(data.data, "utf8")
        else if (ws.serialPort) {
            debug.log('serial write: ' + data.data);
            ws.serialPort.write(data.data);
        }
        else
            ws.sendError("no socket open")
    },
}


var logListeners = []
function sendLogMsg(json) {
    logListeners = logListeners.filter(w => w.readyState == WebSocket.OPEN)
    var payload = JSON.stringify(json)
    logListeners.forEach(w => w.send(payload))
}
var logTransport = {
    log: (level : number, category : string, msg: string, meta?: any) => {
        if (logListeners.length == 0) return
        sendLogMsg({
            op: "logmsg",
            level: level,
            category: category,
            msg: msg,
            meta: meta
        })
    },

    logException: (err: any, meta? : any) => {
        if (logListeners.length == 0) return
        sendLogMsg({
            op: "logexception",
            err: err + "",
            meta: meta,
        })
    },
}

function mgmtSocket(ws)
{
    ws.sendJson = j => ws.send(JSON.stringify(j))
    ws.sendError = err => ws.sendJson({ op: "error", message: err + "" })

    ws.on("message", (msg) => {
        var cmd = JSON.parse(msg.data)
        if (socketCmds.hasOwnProperty(cmd.op))
            socketCmds[cmd.op](ws, cmd)
        else
            ws.sendJson({ error: "unknown command " + cmd.op })
    })

    ws.on("close", () => {
        socketCmds["kill"](ws, {})
    })
}

var pluginCmds: StringMap<(ar: ApiRequest) => void> = {
    mkdir: ar => mkDirP(dataPath(path.join(ar.data.name, "dummy")), ar.data.mode,() => { ar.pluginCb()(undefined, undefined); }),
    writeFile: ar => {
        mkDirP(dataPath(ar.data.name));
        return fs.writeFile(dataPath(ar.data.name), ar.data.data, "utf8", <any>ar.pluginCb())
    },
    readFile: ar => fs.readFile(dataPath(ar.data.name), "utf8", ar.pluginCb(true)),
    readDir: ar => fs.readdir(dataPath(ar.data.name), ar.pluginCb(true)),
    writeFiles: ar => {
        ar.data.files.forEach((f: FileEntry) => f.path = dataPath(f.path));
        deployAr(ar, false);
    },
    shell: ar => {
        ar.data.cwd = dataPath(ar.data.cwd);
        runCommand(ar.data, r => ar.ok(r))
    },
    open: ar => openUrl(ar.data.url,() => ar.ok({})),
    pythonEnv: ar => initPython(false,(err?) => {
        if (err) ar.exception(err)
        else ar.ok({})
    }),
    seriallist: ar => {
        lazyRequire("serialport@1.6.1", function (serialport) {
            serialport.list((err, data) => {
                if (err) ar.exception(err);
                else ar.ok(data);
            });
        });
    }
}

function hasAutoUpdate() {
    return process.env["TD_AUTO_UPDATE_ENABLED"] === "true"
}


var mgmt:StringMap<(ar:ApiRequest)=>void> = {
    config: ar => {
        ar.ok(config)
    },

    stats: ar => {
        ar.ok({
            shellVersion: config.shellVersion,
            shellSha: shellSha(),
            autoUpdate: hasAutoUpdate(),
            memory: process.memoryUsage(),
            uptime: process.uptime(),
            nodeVersion: process.version,
            argv: process.argv,
            numRequests: currentReqNo,
            numDeploys: tdstate.numDeploys,
        })
    },

    autoupdate: ar => {
        if (hasAutoUpdate()) {
            fs.writeFile(__filename, ar.data.shell, "utf8", err => {
                if (err)
                    ar.exception(err)
                else {
                    info.log("updated shell, restarting")
                    ar.ok({ status: "ok" })
                    setTimeout(() => process.exit(0), 1000) // restart shortly
                }
            })
        } else {
            ar.ok({ error: "auto update not enabled" })
        }
    },

    info: ar => ar.forwardToWorkers(),

    logs: ar => {
        ar.ok({
            shellVersion: config.shellVersion,
            error: error.getMsgs(),
            info: info.getMsgs(),
            debug: debug.getMsgs(),
        })
    },

    combinedlogs: ar => {
        var msgs = error.getMsgs().concat(info.getMsgs()).concat(debug.getMsgs())
        msgs.sort((a, b) => b.timestamp - a.timestamp)
        ar.ok({
            shellVersion: config.shellVersion,
            logs: msgs,
        })
    },

    exit: ar => {
        nodeExit()
        ar.ok({ msg: "This probably won't make it out." })
    },

    runcli: ar => {
        runCommand(ar.data, r => ar.ok(r))
    },

    plugin: ar => {
        if (pluginCmds.hasOwnProperty(ar.cmd[1]))
            pluginCmds[ar.cmd[1]](ar)
        else
            ar.error(404, "plugin api missing")
    },

    writefiles: ar => deployAr(ar, false),

    deploy: ar => deployAr(ar, true),

    ctrlresp: ar => {
        for (var i = 0; i < pendingProxyEntries.length; ++i) {
            var pe = pendingProxyEntries[i]
            if (pe.postBackId == ar.cmd[1]) {
                pendingProxyEntries.splice(i, 1)

                pe.ar.resp.writeHead(ar.data.code, ar.data.headers)
                var dd = ar.data.data
                if (typeof dd != "string")
                    dd = JSON.stringify(dd)
                pe.ar.resp.end(dd, "utf8")

                ar.ok({})
                return
            }
        }
        ar.error(404, "no more")
    },

    proxy: ar => {
        var id = ar.cmd[1]
        var pb = crypto.randomBytes(20).toString("hex")
        var ent = new ProxyEntry(ar, pb, ar.cmd[1], {
            data: ar.data,
            cmd: ar.cmd.slice(2),
            postBack: "/-tdevmgmt-/" + config.deploymentKey + "/ctrlresp/" + pb
        })
        pendingProxyEntries.push(ent)
        for (var i = 0; i < pendingContollers.length; ++i) {
            var f = pendingContollers[i]
            if (f()) {
                pendingContollers.splice(i, 1)
                return
            }
        }
    },

    ctrl: ar => {
        if (scanProxyQueue(ar)) return
        else {
            var fn = () => scanProxyQueue(ar)
            pendingContollers.push(fn)
            setTimeout(() => {
                var idx = pendingContollers.indexOf(fn)
                if (idx >= 0) {
                    pendingContollers.splice(idx, 1)
                    ar.resp.writeHead(204)
                    ar.resp.end()
                }
            }, 30000)
        }
    },

    savecache: ar => {
        fs.writeFile(dataPath("offlinecache.json"), JSON.stringify(ar.data), "utf8", err => {
            if (err) ar.exception(err)
            else ar.ok({})
        })
    },

    resizeimages: ar => {
        var Jimp = require('jimp');
        var src = ar.data.src;
        var todo = ar.data.files.length;

        function crop(img, x, y, w, h) {
            var bitmap = [];
            var data = img.bitmap.data;
            img.scan(x, y, w, h, function (_x, _y, idx) {
                bitmap.push(data[idx]);
                bitmap.push(data[idx+1]);
                bitmap.push(data[idx+2]);
                bitmap.push(data[idx+3]);
            });
            img.bitmap.data = new Buffer(bitmap);
            img.bitmap.width = w;
            img.bitmap.height = h;
        }

        function onedone() {
            todo--;
            if (todo == 0) {
                ar.ok({});
            }
        }

        fs.exists(src, srcexists => {
            if (!srcexists) {
                ar.ok({ status: "error", message: src + ' does not exist' });
                return;
            }
            ar.data.files.forEach(target => {
                var img = new Jimp(src, () => {
                    var w = img.bitmap.width;
                    var h = img.bitmap.height;
                    var tw = target.width;
                    var th = target.height;
                    if (w/tw > h/th) {
                        var dx = Math.floor((w - h*tw/th) / 2);
                        crop(img, dx, 0, w - 2*dx, h)
                    } else {
                        var dy = Math.floor((h - w*th/tw) / 2);
                        crop(img, 0, dy, w, h-2*dy)
                    }
                    img.resize(tw, th);
                    mkDirP(target.path);
                    img.write(target.path, () => onedone());
                });
            });
        });
    },

    getconfig: ar => {
        if (!blobChannel) {
            ar.error(400, "get config only available when deployed via azure storage")
            return
        }

        getBlobJson("000cfg-" + blobChannel, (err, cdata) => {
            if (!cdata) cdata = { AppSettings: [] }
            ar.ok(cdata)
        })
    },

    setconfig: ar => {
        if (!blobChannel) {
            ar.error(400, "set config only available when deployed via azure storage")
            return
        }

        getBlobJson("000cfg-" + blobChannel, (err, cdata) => {
            if (!cdata) cdata = {}
            Object.keys(ar.data).forEach(k => cdata[k] = ar.data[k])
            setBlobJson("000cfg-" + blobChannel, cdata, err => {
                if (err) {
                    ar.exception(err)
                    return
                }

                getBlobJson("000ch-" + blobChannel, (err, data) => {
                    if (err) {
                        ar.exception(err)
                        return
                    }
                    data.did = crypto.randomBytes(8).toString("hex")
                    setBlobJson("000ch-" + blobChannel, data, err => {
                        if (err)
                            ar.exception(err)
                        else
                            ar.ok(cdata)
                    })
                })
            })
        })
    },
}

export interface ProxyRequest {
    data:any;
    cmd:string[];
    postBack:string;
}

class ProxyApiRequest
    extends ApiRequest
{
    postBackUrl:string;

    constructor(controller:string, d:any)
    {
        super(null, null)
        this.data = d.data
        this.cmd = d.cmd
        var pp = url.parse(controller)
        this.postBackUrl = pp.protocol + "//" + pp.host + d.postBack
        debug.log("PROXY " + this.cmd.join("/"))
    }

    setCors() {}

    error(code:number, text:string)
    {
        info.log("HTTP (proxied) error " + code + ": " + text)
        this.postBack({
            code: code,
            headers: { 'Content-Type': 'text/plain' },
            data: text
        })
    }

    ok(r:any)
    {
        this.postBack({
            code: 200,
            headers: { 'Content-Type': 'application/json; encoding=utf-8' },
            data: r
        })
    }

    postBack(d:any)
    {
        var opts:any = url.parse(this.postBackUrl)
        opts.method = 'POST'
        var req = (/^https/.test(this.postBackUrl) ? <any>https : http).request(opts)
        req.write(JSON.stringify(d), "utf8")
        req.end()
    }

    execute()
    {
        try {
            this.processMgmt()
        } catch (e) {
            this.exception(e)
        }
    }
}

function scanProxyQueue(ar:ApiRequest)
{
    var id = ar.cmd[1]
    var seenOld = 0

    var past = Date.now() - 600000 // 10min timeout
    pendingProxyEntries = pendingProxyEntries.filter(pe => pe.timestamp > past)

    for (var i = 0; i < pendingProxyEntries.length; ++i) {
        var pe = pendingProxyEntries[i]
        if (pe.id == id) {
            pe.id = "--processing--"
            ar.ok(pe.preq)
            return true
        }
    }
    return false
}

var pendingProxyEntries:ProxyEntry[] = []
var pendingContollers:any[] = [];

class ProxyEntry {
    public timestamp:number;

    constructor(public ar:ApiRequest, public postBackId:string, public id:string, public preq:ProxyRequest)
    {
        this.timestamp = Date.now();
    }
}


function saveState()
{
    fs.writeFileSync(dataPath("tdstate.json"), JSON.stringify(tdstate))
}

function getMime(filename:string)
{
    var ext = path.extname(filename).slice(1)
    switch (ext) {
        case "txt": return "text/plain";
        case "html":
        case "htm": return "text/html";
        case "css": return "text/css";
        case "ts": return "text/plain";
        case "js": return "application/javascript";
        case "jpg":
        case "jpeg": return "image/jpeg";
        case "png": return "image/png";
        case "ico": return "image/x-icon";
        case "manifest": return "text/cache-manifest";
        case "json": return "application/json";
        case "svg": return "image/svg+xml";
        default: return "application/octet-stream";
    }
}

var app;
var needsStop = false
var scriptLoadPromise : any;
var rootDir = ""

function loadScript(f)
{
    scriptLoadPromise.done(f)
}

function reloadScript()
{
    scriptLoadPromise = loadScriptCoreAsync();
}

function findFreePort(cb:(p:number)=>void) {
  var port = Math.floor(Math.random() * 50000 + 10000)
  var tester = net.createServer()
  tester.on("error", err => findFreePort(cb))
  tester.listen(port, err => {
    tester.once('close', () => cb(port))
    tester.close()
  })
}

var logException = (msg:string) => {}

class Worker {
    public socketPath: string;
    public port: number;
    public child: child_process.ChildProcess
    public isready: boolean;

    public shutdown()
    {
        setTimeout(() => {
                if (this.child) this.child.kill()
                setTimeout(() => {
                    if (this.child) this.child.kill("SIGKILL")
                }, 5000)
            }, 30000)
    }

    public description()
    {
        return "port:" + (this.socketPath || this.port) + ", pid:" + (this.child ? this.child.pid : "?")
    }

    public init(cb:()=>void)
    {
        info.log("worker start " + this.description())
        this.child.on("exit", code => {
            info.log("worker exit " + code + " : " + this.description())
            this.child = null
            this.isready = false
        })

        this.child.on("error", err => {
            error.log(err.message || err)
            this.child = null
            this.isready = false
        })

        this.child.stderr.setEncoding("utf8")
        this.child.stderr.on("data", d => {
            info.log("CHILD_ERR: " + d.replace(/\n$/, ""))
        })

        this.child.stdout.setEncoding("utf8")
        this.child.stdout.on("data", d => {
            debug.log(d.replace(/\n$/, ""))
        })

        var ping = () => {
            var u = this.getUrl()
            u.path = "/-tdevmgmt-/" + config.deploymentKey + "/ready"
            var creq = http.request(u, cres => {
                if (cres.statusCode == 200) {
                    if (!this.isready) {
                        info.log("worker ready, " + this.description())
                        this.isready = true
                        cb()
                    }
                } else {
                    setTimeout(ping, 1000)
                }
            })
            creq.on("error", err => {
                setTimeout(ping, 1000)
            })
            creq.end()
        }
        ping()
    }

    public getUrl():any
    {
        if (this.socketPath)
            return { socketPath: this.socketPath }
        else
            return {
                hostname: "127.0.0.1",
                port: this.port
            }
    }
}

var workers:Worker[] = []

function startWorker(cb0, cb)
{
    var isWin = /^win/.test(os.platform())

    var w = new Worker()

    var env = JSON.parse(JSON.stringify(process.env))
    Object.keys(additionalEnv).forEach(k => env[k] = additionalEnv[k])

    var fin = () => {
        debug.log("forking child script, " + w.description())

        w.child = child_process.fork("./script/compiled.js", [], {
            env: env,
            silent: true,
        })
        w.init(cb)

        cb0(w)
    }

    if (useFileSockets) {
        var sockPath = "tdsh." + crypto.randomBytes(16).toString("hex")
        env.PORT = isWin ? "\\\\.\\pipe\\" + sockPath : "/tmp/." + sockPath
        w.socketPath = env.PORT
        fin()
    } else {
        findFreePort(num => {
            w.port = num
            env.PORT = w.port
            fin()
        })
    }
}

function loadScriptCoreAsync()
{
    if (numWorkers < 0) {
        numWorkers = Math.round(os.cpus().length * -numWorkers)
    }
    numWorkers = Math.round(numWorkers)
    if (numWorkers <= 0) numWorkers = 1

    var newWorkers:Worker[] = []

    var numW = numWorkers
    var oneUp = () => {
        if (--numW == 0) {
            workers.forEach(w => w.shutdown())
            workers = newWorkers
        }
    }

    for (var i = 0; i < numWorkers; ++i)
        startWorker(w => newWorkers.push(w), oneUp)

    return {
        then: f => f(),
        done: f => f()
    }
}

var loadedModules:any = {}

function loadModule(name:string, f:(mod)=>void)
{
    if (loadedModules.hasOwnProperty(name))
        f(loadedModules[name])
    else {
        var finish = () => {
            var mod = require(name)
            loadedModules[name] = mod
            debug.log("module " + name + " loaded")
            f(mod)
        }

        if (fs.existsSync(rootDir + "/node_modules/" + name))
            finish()
        else
            executeNpm(["install", name], finish)
    }
}

function loadWsModule(f:()=>void)
{
}

var lastCtrlResponse = Date.now();
var numControllers = 0;
var maxControllers = 2;

function nodeExit()
{
    // process.exit(1) doesn't seem to work, at least on RPI
    process.kill(process.pid, "SIGTERM")
}

function checkRespawn()
{
    setTimeout(() => {
        if (Date.now() - lastCtrlResponse > 40000) {
            error.log("cannot connect to controller for 40s; exiting")
            nodeExit()
        } else {
            checkRespawn()
        }
    }, 20000)
}

function connectToContoller(controller:string)
{
    var req;

    if (numControllers >= maxControllers) return
    numControllers++

    var opts:any = url.parse(controller)
    opts.agent = false

    var respawn = () => {
        if (Date.now() - lastCtrlResponse > 40000) {
            error.log("cannot connect to controller for 40s; exiting")
            nodeExit()
        } else {
            if (numControllers == 0)
                connectToContoller(controller);
            setTimeout(() => connectToContoller(controller), Math.random()*5000)
            setTimeout(() => connectToContoller(controller), Math.random()*5000)
        }
    }


    var dbg = (s) => console.log(s)

    try {
        if (/^https/.test(controller)) {
            req = https.request(opts)
        } else {
            req = http.request(opts)
        }
    } catch (exn) {
        error.log("exception when creating ctrl request: " + exn)
        nodeExit()
    }

    dbg("start ctrl " + controller)
    req.end()
    var added = 1
    var gotSomeResponse = false

    req.on("response", resp => {
        numControllers -= added
        added = 0
        if (resp.statusCode == 204) {
            dbg("response 204")
            lastCtrlResponse = Date.now();
            respawn()
        } else if (resp.statusCode == 200) {
            dbg("response 200")
            lastCtrlResponse = Date.now();
            respawn()

            var dat = ""
            resp.setEncoding("utf8")
            resp.on("data", d => dat += d)
            resp.on("end", () => {
                var pr = new ProxyApiRequest(controller, JSON.parse(dat))
                dbg("execute")
                pr.execute()
            })
        } else {
            error.log("invalid controller response: " + resp.statusCode)
            respawn()
        }
    })

    req.on("error", err => {
        numControllers -= added
        added = 0
        error.log("ctrl error: " + err)
        respawn()
    })
}

var editorCache:any;

function cacheError(err:any)
{
    error.log(err + "")
}

function cacheEditor(version:string, manifest:string)
{
    var cache:any = {}

    var ent = (buf, hd) => {
        var tp = hd['content-type']
        var r:any = {
            headers: {
                'Content-Type': tp
            }
        }
        if (/image/.test(tp))
            r.b64Content = buf.toString("base64")
        else
            r.content = buf.toString("utf8")
        return r
    }

    downloadFile(manifest, (err, buf, hd?) => {
        if (err) {
            cacheError(err)
            return
        }
        var text = buf.toString("utf8")
        if (editorCache[manifest] && editorCache[manifest].content == text)
            return

        info.log("caching new version of the editor, " + text.length)
        debug.log(text);

        cache[manifest] = ent(buf, hd)
        var num = 0
        var lines = text.split(/\n/)

        lines.push(manifest.replace(/\.manifest/, ""))
        lines.push(manifest.replace(/\.manifest/, ".error"))
        lines.push(manifest.replace(/\.manifest/, ".browsers"))

        var l0 = lines.filter(l => /\/c\/main.js$/.test(l))[0]
        if (l0) l0 = l0.replace(/main.js$/, "")

        lines.forEach(l => {
            l = l.replace(/^\s+/, "").replace(/\s+$/, "")
            if (/^#/.test(l)) return
            if (!/^http/.test(l)) return
            num++

            downloadFile(l, (err, buf, hd?) => {
                if (err) {
                    cacheError(err)
                    return
                }
                cache[l] = ent(buf, hd)
                if (--num == 0) {
                    Object.keys(cache).forEach(k => editorCache[k] = cache[k])
                    fs.writeFile(dataPath(version + ".json"), JSON.stringify(cache, null, 2), "utf8", (err) => { if (err) cacheError(err) })
                }
            })
        })
    })
}

function proxyEditor(cmds:string[], req, resp)
{
    if (!editorCache) {
        editorCache = {};
        ["current", "beta", "latest"].forEach(v => {
            var editorJson = dataPath(v + ".json");
            if (fs.existsSync(editorJson)) {
                var c = JSON.parse(fs.readFileSync(editorJson, "utf8"))
                Object.keys(c).forEach(k => editorCache[k] = c[k])
            }
        })

        if (!fs.existsSync(dataPath("cdn-cache"))) {
            fs.mkdirSync(dataPath("cdn-cache"))
            fs.mkdirSync(dataPath("cdn-cache/meta"))
        }
    }

    var rel = cmds[0]
    if (!rel) rel = "current"
    var localPath = process.env["TD_LOCAL_EDITOR_PATH"]
    if (rel == "local" && !localPath) rel = "nope"
    if (!/^(current|beta|latest|local|cdn-pub|cdn-thumb|cache|^\d\d\d\d\d\d[\da-z\.-]+)$/.test(rel)) {
        resp.writeHead(404, "Not found")
        resp.end("Not found")
        return
    }

    var file = cmds.slice(1).join("/")
    if (file == "") {
        file = "index.html"
        if (rel == "local" && cmds[1] === undefined) {
            resp.writeHead(301, {
                "Location": "/editor/local/"
            })
            resp.end()
            return
        }
    }

    var cdn = "https://az31353.vo.msecnd.net/"

    var url = cdn + "app/" + rel + "/c/" + file

    var path = "https://www.touchdevelop.com/app/"
    var suff = ""
    var cacheDir = "none"

    if (/^cdn-/.test(rel)) {
        file = encodeURIComponent(cdn + rel.slice(4) + "/" + file)
        rel = "cache"
    }

    if (rel == "current") path += "current"
    else if (rel == "beta") path += "beta"
    else if (rel == "latest") path += "latest"
    else if (rel == "cache") {
        url = decodeURIComponent(file)
        url = url.replace(/[?&]access_token=.*/, "")
        file = url.replace(/^https?:\/\/(www\.|az31353.vo.msecnd.net\/)/, "").replace(/[^a-zA-Z0-9\.\-]/g, "_").slice(0, 64)
        var h = crypto.createHash("sha256")
        h.update(new Buffer(url, "utf8"))
        file += "." + h.digest("base64").replace(/[^a-zA-Z0-9]/g, "").slice(0, 16)
        cacheDir = dataPath("cdn-cache")
    }
    else suff = "?releaseid=" + rel

    var rewrite: (s:string) => string;

    var specRel = rel
    var selfUrl = "http://" + req.headers.host + "/editor"
    var relUrl = selfUrl + "/" + rel + "/"

    var replUrl = (s:string) => s.replace(/https:\/\/az31353.vo.msecnd.net\/app\/\d\d\d[\da-z\.-]+\/(c\/)?/g, relUrl)

    switch (file) {
        case "index.html":
            url = path + suff
            rewrite = s => {
                s = replUrl(s)
                if (rel != "local") {
                    s = s.replace(/manifest="[^"]+"/, "manifest=\"" + selfUrl + "/" + specRel + "/manifest" + "\"")
                    s = (<any>s).replace(/(browsers|error)Url = .*/g, (a, b) => b + "Url = \"" + selfUrl + "/" + specRel + "/" + b + "\"")
                }
                s = s.replace(/localProxy = ".*"/, 'localProxy = "yes"')
                if (rel == "local") {
                    s = s.replace(/betaFriendlyId = ".*"/, "betaFriendlyId = \"(local)\"")
                } else if (specRel == "current") {
                    s = s.replace(/betaFriendlyId = ".*"/, "betaFriendlyId = \"\"")
                }
                return s
            }
            break;
        case "browsers":
        case "error":
        case "manifest":
            url = path + "." + file + suff
            rewrite = replUrl
            break;

        case "offlinecache":
            fs.readFile(dataPath("offlinecache.json"), "utf8", (err, data) => {
                if (err) data = "{}"
                resp.writeHead(200, { 'Content-Type': 'application/json; encoding=utf-8' })
                var d = JSON.parse(data)
                d.entroy = crypto.randomBytes(64).toString("base64")
                resp.end(JSON.stringify(d))
            })
            return;
    }

    if ((rel == "current" || rel == "beta" || rel == "latest") && file == "manifest")
        cacheEditor(rel, url)

    var serveText = (text) => {
        if (!rewrite) rewrite = s => s;
        if (!/^\d/.test(rel)) {
            var m = /https:\/\/az31353.vo.msecnd.net\/app\/(\d\d\d[\da-z\.-]+)/.exec(text)
            if (m) {
                rel = m[1]
                relUrl = selfUrl + "/" + rel + "/"
            }
        }
        resp.end(rewrite(text), "utf8")
    }

    if (rel == "cache" || /^cdn-/.test(rel)) {
        fs.readFile(cacheDir + "/meta/" + file + ".json", "utf8", (err, str) => {
            var sendCached = () => {
                var meta = JSON.parse(str)
                resp.writeHead(200, meta.headers)
                fs.readFile(cacheDir + "/" + meta.filename, null, (err, data) => resp.end(data))
            }

            if (err) {
                downloadFile(url, (err, buff, hd?) => {
                    if (err) {
                        error.log(err)
                        resp.writeHead(404)
                        resp.end(err)
                    } else {
                        debug.log("CACHE " + url)
                        var ctp = hd['content-type']
                        var ext = ctp.replace(/.*\//, "").replace(/[^a-z]/g, "").slice(0, 8)
                        var fn = file + "." + ext
                        fs.writeFile(cacheDir + "/" + fn, buff, null, err => {
                            if (!err) {
                                str = JSON.stringify({
                                    filename: fn,
                                    headers: {
                                        'Content-Type': hd['content-type']
                                    }
                                })
                                fs.writeFile(cacheDir + "/meta/" + file + ".json", str, "utf8", sendCached)
                            }
                        })
                    }
                })
            } else sendCached();
        })
    } else if (rel == "local") {
        var mime = getMime(file)
        var enc = /^text\//.test(mime) ? "utf8" : null

        if (fs.existsSync(localPath + "/www/" + file))
            localPath += "/www"
        else if (fs.existsSync(localPath + "/build/" + file))
            localPath += "/build"

        fs.readFile(localPath + "/" + file, enc, (err, data:any) => {
            if (err) {
                resp.writeHead(404)
                resp.end(err + "")
            } else {
                if (rewrite) data = rewrite(data)
                if (typeof data == "string")
                    data = new Buffer(data, "utf8")
                resp.writeHead(200, {
                    'Content-Type': mime,
                    'Content-Length': data.length
                })
                resp.end(data)
            }
        })

    } else if (editorCache.hasOwnProperty(url)) {
        var c = editorCache[url]
        resp.writeHead(200, c.headers)
        if (c.b64Content)
            resp.end(new Buffer(c.b64Content, "base64"))
        else
            serveText(c.content)
    } else {
        downloadFile(url, (err, buff, hd?) => {
            if (err) {
                error.log(url + " - " + err)
                resp.writeHead(404)
                resp.end("Problem")
            } else {
                resp.writeHead(200, {
                    'Content-Type': hd['content-type']
                })
                if (rewrite) {
                    serveText(buff.toString("utf8"))
                } else {
                    resp.end(buff)
                }
            }
        })
    }
}

function specHandleReq(req, resp)
{
    var ar = new ApiRequest(req, resp);
    try {
        var u = url.parse(req.url);
        var uu = u.pathname
        if (uu == "/") uu = "index.html";
        if (!/^[\/\\]/.test(uu)) uu = "/" + uu
        uu = path.normalize(uu).replace(/^[\/\\]+/, "").replace(/\\/g, "/")

        var cmd = uu.split(/\//)

        if (cmd[0] != "editor")
            debug.log(req.method + " " + req.url)

        if (cmd[0] == "-tdevmgmt-") {
            ar.setCors();
            if (req.method == "OPTIONS") {
                resp.writeHead(200, "OK");
                resp.end();
            } else {
                if (cmd[1] === config.deploymentKey) {
                    ar.handleMgmt(cmd.slice(2))
                } else {
                    ar.error(403, "wrong key")
                }
            }
            return
        } else if (cmd[0] == "editor" && allowEditor) {
            proxyEditor(cmd.slice(1), req, resp)
            return
        } else if (cmd[0] == "favicon.ico" && allowEditor) {
            proxyEditor(["cache", encodeURIComponent("https://www.touchdevelop.com/favicon.ico")], req, resp)
        } else {
            ar.error(404, "No script deployed")
        } 
        
        /*{
            initScript(() => {
                var rt = TDev.Runtime.theRuntime
                if (rt.requestHandler)
                    rt.requestHandler(req, resp)
                else {
                    var local = path.join("static", uu)

                    fs.stat(local, (err, stats) => {
                        if (!err && stats.isFile()) {
                            fs.readFile(local, (err, content) => {
                                resp.writeHead(200, { 'Content-Type': getMime(local) });
                                resp.end(content, "utf-8");
                            })
                        } else {
                            ar.error(404, "File not found; forgot /api ?")
                        }
                    })
                }
            })
        }*/

    } catch (e) {
        ar.exception(e)
    }
}

function pickWorker()
{
    return workers[Math.floor(Math.random() * workers.length)]
}


function forwardWebSocket(req, sock, body)
{
    var w = pickWorker()
    var u = w.getUrl()
    if (u.socketPath)
        u.path = u.socketPath
    var fwd = net.connect(u, () => {
        var hds = req.method + " " + req.url + " HTTP/1.1\r\n"
        Object.keys(req.headers).forEach(h => {
            hds += h + ": " + req.headers[h] + "\r\n"
        })
        hds += "\r\n"
        fwd.write(hds)
        if (body)
            fwd.write(body)
        sock.pipe(fwd)
        fwd.pipe(sock)
    })
}


function handleReq(req, resp)
{
    if (/^\/-tdevmgmt-/.test(req.url))
        specHandleReq(req, resp)
    else if (allowEditor && /^\/(favicon\.ico|editor\/)/.test(req.url))
        specHandleReq(req, resp)
    else if (workers.length == 0)
        specHandleReq(req, resp) // 404
    else {
        var w = pickWorker()
        var u = w.getUrl()
        u.method = req.method
        u.headers = req.headers
        if (u.headers['connection'] == "close")
            delete u.headers['connection'];
        u.path = req.url

        var creq = http.request(u, cres => {
            resp.writeHead(cres.statusCode, cres.headers)
            cres.pipe(resp);
        })

        req.pipe(creq)
    }
}

function handleError(err) {
    if (err.rtProtectHandled)
        return
    error.log("exception (top): " + err.toString() + "\n" + err.stack)
    logException("unhandled exception, forgot lib.protect()? " + err.toString() + "\n" + err.stack)
}

function openUrl(startUrl: string, cb?: () => void) {
    if (!/^[a-z0-9A-Z#=\.\-\\\/%:\?_]+$/.test(startUrl)) {
        error.log("invalid URL to open: " + startUrl)
        return
    }

    var cmds = {
        darwin: "open",
        win32: "start",
        linux: "xdg-open"
    }
    if (/^win/.test(os.platform()) && !/^[a-z0-9]+:\/\//i.test(startUrl))
        startUrl = startUrl.replace('/', '\\');
    else
        startUrl = startUrl.replace('\\', '/');

    var cmd = cmds[process.platform]
    if (cmd) {
        runCommand({ command: cmd + " " + startUrl }, resp => {
        })
    }
    if (cb) cb();
}

function runScript(id:string, start:()=>void, reload:()=>void)
{
    var pkgPath = process.env["TD_PKG_PATH"] || ""

    var getpackage = id => {
        if (!pkgPath && tdstate.deployedId == id) {
            debug.log("starting cached script")
            reload()
        } else downloadJson("https://www.touchdevelop.com/api/" + id + "/" + (pkgPath || "nodepackage"), (err, content) => {
            if (err)
                handleError(err)
            else if (!pkgPath && (!content.meta || !content.meta.isCloud)) {
                handleError("the script is not marked as web service")
            }
            else
                deploy(content, (err, resp) => {
                    if (err) {
                        handleError(err)
                    } else {
                        tdstate.deployedId = id
                        saveState()
                        start()
                    }
                })
        })
    }

    downloadJson("https://www.touchdevelop.com/api/" + id, (err, json) => {
        if (err) handleError(err)
        else if (json.updateid != id && json.updatetime > json.time) {
            info.log("getting updated script /"+ json.updateid)
            getpackage(json.updateid)
        } else {
            info.log("getting original script /"+ id)
            getpackage(id)
        }
    })
}

function respawnLoop()
{
    info.log('starting shell watch...')

    function copy() {
        debug.log("copying touchdevelop.js to local folder...")
        var src = fs.readFileSync(__filename, "utf8")
        fs.writeFileSync("tdserver.js", src, "utf8")
    }

    // process.env["TD_AUTO_UPDATE_ENABLED"] = "true"

    var attempts = 0;

    function startOne() {
        var startTime = Date.now()
        var child = child_process.fork(process.cwd() + "/tdserver.js", process.argv.slice(2))
        child.on("exit", (code) => {
            debug.log("local folder touchdevelop exit, " + code)
            if (code === 0) {
                if (++attempts > 10) {
                    console.error("Too many failures, aborting. Please retry manually.");
                    process.exit();
                } else {
                    debug.log("Failure, retrying in 5s...");
                    setTimeout(startOne, 5000);
                }
            }
        })
    }

    if (!fs.existsSync("tdserver.js"))
        copy();
    startOne();
}

var _shellSha = ""
function shellSha()
{
    if (!_shellSha) {
        var h = crypto.createHash("sha256")
        h.update(fs.readFileSync(__filename))
        _shellSha = h.digest("hex").toLowerCase()
    }

    return _shellSha;
}


var blobSvc;
var containerName = 'tddeployments'
var updateDelay = 3000;
var lastAzureDeployment = "";
var additionalEnv:StringMap<string> = {}
var updateWatchdog = 0;
var blobDeployCallback;

function setBlobJson(name, json, f) {
    blobSvc.createBlockBlobFromText(containerName, name, JSON.stringify(json, null, 2), f)
}

function getBlobJson(name, f) {
    blobSvc.getBlobToText(containerName, name, (err, data) => {
        f(err, data ? JSON.parse(data) : null)
    })
}

function applyConfig(cfg) {
    if (!cfg) return

    if (cfg.AppSettings) {
        cfg.AppSettings.forEach(s => {
            additionalEnv[s.Name] = s.Value
        })
    }
}

function checkUpdate()
{
    var n = Date.now()
    if (n - updateWatchdog < 25000)
        return
    updateWatchdog = n
    var reset = () => {
        if (updateWatchdog == n) updateWatchdog = 0
    }

    getBlobJson("000ch-" + blobChannel, (err, d) => {
        if (d && d.blob && d.did != lastAzureDeployment) {
            info.log("new deployment, " + d.blob)
            getBlobJson("000cfg-" + blobChannel, (err, cfg) => {
                if (!err) applyConfig(cfg)

                getBlobJson(d.blob, (err, data) => {
                    lastAzureDeployment = d.did
                    if (data) {
                        deploy(data, (err, resp) => {
                            var f = blobDeployCallback
                            blobDeployCallback = null
                            if (f) f(err, resp)
                            if (err)
                                error.log("cannot deploy: " + err)
                            else
                                info.log(resp)
                            reset()
                        })
                    } else {
                        error.log("cannot fetch deployment: " + err.message)
                        reset()
                    }
                })
            })
        } else {
            if (err && err.statusCode != 404)
                console.log(err)
            reset()
        }
    })
}

function loadAzureStorage(f)
{
    loadModule("azure-storage", az => {
        if (!blobSvc)
            blobSvc = az.createBlobService()
        blobSvc.createContainerIfNotExists(containerName, err => {
            if (err)
                throw err;
            setInterval(checkUpdate, updateDelay)
        })
        checkUpdate()
        f()
    })
}

function main()
{
    var agent = (<any>http).globalAgent;
    agent.keepAlive = true;
    if (agent.options) agent.options.keepAlive = true;
    agent.keepAliveMsecs = 20000;
    // don't limit maxSockets - they might be long-living

    inAzure = !!process.env.PORT;
    var port = process.env.PORT || 4242;

    rootDir = process.cwd()

    var args = process.argv.slice(2)
    var scriptId = ""
    var internet = inAzure ? true : false
    var useBeta = false;
    var useLatest = false;
    var cli = false;
    var useHome = false;

    inNodeWebkit = fs.existsSync("./app.html");

    var usage = () => {
        console.error("unknown option: " + args[0])

        console.error("Options:")
        console.error("  --controller URL  -- a website controlling this shell (-c)")
        console.error("  --port NUMBER     -- port to listen to (-p)")
        console.error("  --scriptid ID     -- fetch newest version of /ID and run it (-s)")
        console.error("  --cli             -- don't start the browser")
        console.error("  --latest          -- use latest (potentially unstable) TouchDevelop version")
        console.error("  --internet        -- allow connections from outside localhost")
        console.error("  --usehome         -- write all cached files to the user home folder")
        console.error("  --workers NUMBER  -- number of worker servers to start (-w); negative to multiply by number of cores")
        console.error("  NAME=VALUE        -- set environment variable for the script")
        console.error("")
        console.error("Supported environment variable options:")
        console.error("TD_ALLOW_EDITOR         -- set to 'true' to proxy editor at /editor/")
        console.error("TD_LOCAL_EDITOR_PATH    -- serve files from path at /editor/local")
        console.error("TD_BLOB_DEPLOY_CHANNEL  -- deploy from Azure blob storage, using named channel")

        process.exit(1)
    }

    if (!inAzure && !inNodeWebkit && __dirname != process.cwd()) {
        if (isNpm) process.env["TD_ALLOW_EDITOR"] = "true"
        respawnLoop()
        return
    }

    debug.log("starting with " + args.join(" ") + ", pid: " + process.pid)

    while (args.length > 0) {
        switch (args[0]) {
            case "-c":
            case "--controller":
                args.shift()
                controllerUrl = args.shift()
                break;
            case "-w":
            case "--workers":
                args.shift()
                numWorkers = parseFloat(args.shift()) || 1
                break;
            case "-p":
            case "--port":
                args.shift()
                port = parseInt(args.shift())
                break;
            case "-s":
            case "--scriptid":
                args.shift()
                scriptId = args.shift()
                break;
            case "--cli":
                args.shift()
                cli = true
                break
            case "--beta":
                args.shift()
                useBeta = true;
                break
            case "--latest":
                args.shift()
                useLatest = true;
            case "--internet":
                args.shift()
                internet = true
                break
            case "--usehome":
                args.shift();
                useHome = true;
                break;
            default:
                var m = /^([A-Za-z0-9_]+)=(.*)$/.exec(args[0])
                if (m) {
                    debug.log("set " + m[1] + "=" + m[2]);
                    process.env[m[1]] = m[2]
                    args.shift()
                } else {
                    usage()
                }
                break;
        }
    }

    useBeta = true; // always use beta

    if (inNodeWebkit) {
      cli = true;
      process.env['TD_ALLOW_EDITOR'] = true;
      useHome = true;
    }
    if (useHome && userHome()) {
      dataDir = path.join(userHome(), "TouchDevelop");
      mkDirP(path.join(dataDir, 'dummy'));
      info.log('data directory: ' + dataDir);
    }

    debug.log("start, autoupdate=" + hasAutoUpdate())
    var shouldStart = !cli && (isNpm || !!process.env['TD_LOCAL_DROP'] || !!process.env['TD_ALLOW_EDITOR'])

    var tdConfigJson = dataPath("tdconfig.json");
    if (process.env['TD_LOCAL_DROP'] || !fs.existsSync(tdConfigJson)) {
        debug.log("generating initial tdconfig.json")
        config = {
            deploymentKey: crypto.randomBytes(20).toString("hex").toLowerCase(),
            timestamp: Date.now(),
            tiemstampText: new Date().toString(),
            shellVersion: 108
        }
        fs.writeFileSync(tdConfigJson, JSON.stringify(config, null, 2))
    }

    config = JSON.parse(fs.readFileSync(tdConfigJson, "utf8"))

    if (process.env['TD_DEPLOYMENT_KEY']) {
        config.deploymentKey = process.env['TD_DEPLOYMENT_KEY']
    }

    info.log("Deployment key: " + config.deploymentKey);

    var startUrl = undefined;
    if (process.env['TD_ALLOW_EDITOR']) {
        allowEditor = true;
        startUrl = "http://localhost:" + port + "/editor/"
        if (process.env["TD_LOCAL_EDITOR_PATH"]) startUrl += "local";
        else if (useLatest) startUrl += "latest";
        else if (useBeta) startUrl += "beta"
        startUrl += "#td_deployment_key=" + config.deploymentKey
        info.log("Editor URL: " + startUrl);
    }

    if (!startUrl) shouldStart = false;
    if (inAzure) shouldStart = false;
    if (controllerUrl) shouldStart = false;

    process.env['TD_SERVER'] = 'http://localhost:' + port;
    process.env['TD_DEPLOYMENT_KEY'] = config.deploymentKey
    process.env['TD_CONTROLLER_URL'] = controllerUrl

    var tdStateJson = dataPath("tdstate.json")
    if (fs.existsSync(tdStateJson))
        tdstate = JSON.parse(fs.readFileSync(tdStateJson, "utf8"))
    else
        tdstate = { downloadedFiles: {}, numDeploys: 0, deployedId: "" }

    process.on('uncaughtException', handleError)

    var startUp = () => {
        if (internet)
            app.listen(port);
        else
            app.listen(port, "127.0.0.1")

        if (controllerUrl) {
            connectToContoller(controllerUrl);
            checkRespawn();
        }

        if (shouldStart) openUrl(startUrl)
        info.log('touchdevelop local started...')
    }

    var reload = () => {
        if (!tdstate.numDeploys) {
            startUp();
            return
        }
        info.log('reloading script...');
        try {
            reloadScript()
            scriptLoadPromise.done(startUp,
                err => {
                    handleError(err)
                    startUp()
                })
        } catch (e) {
            handleError(e)
            startUp()
        }
    }

    blobChannel = process.env['TD_BLOB_DEPLOY_CHANNEL']

    app = http.createServer(handleReq);
    app.on("upgrade", (req, sock, body) =>
        loadModule("faye-websocket", wsModule => {
            global.WebSocket = wsModule.Client
            if (!wsModule.isWebSocket(req)) {
                sock.end()
                return
            }

            if (req.url.slice(0, 12)  == "/-tdevmgmt-/")
            {
                if (req.url.slice(-config.deploymentKey.length) == config.deploymentKey) {
                    debug.log("starting mgmt socket")
                    mgmtSocket(new wsModule(req, sock, body))
                } else {
                    debug.log("invalid key for socket")
                    sock.end()
                }
            } else if (workers.length > 0) {
                forwardWebSocket(req, sock, body)
            } else {
                sock.end()
            }
        }))

    if (scriptId) {
        shouldStart = false;
        runScript(scriptId, startUp, reload)
    } else {
        if (blobChannel)
            loadAzureStorage(startUp)
        else
            reload()
    }
}

main();
