///<reference path='../rt/typings.d.ts'/>
///<reference path='../build/browser.d.ts'/>
///<reference path='../build/rt.d.ts'/>
///<reference path='../build/ast.d.ts'/>
///<reference path='../build/libnode.d.ts'/>
///<reference path='../build/embedded.d.ts'/>
///<reference path='../typings/node/node.d.ts'/>
///<reference path='jsonapi.ts'/>

import fs = require('fs');
import url = require('url');
import http = require('http');
import https = require('https');
import path = require('path');
import zlib = require('zlib');
import crypto = require('crypto');
import querystring = require('querystring');
import child_process = require('child_process');
import net = require('net');
import events = require('events');

export interface RestConfig {
    clientKey:string;
}

export var jsPath = '@@RELEASED_FILE@@';
export var relId = 'local';
export var verbose = false;
export var slave = false;
var reqId = 0;
var restConfig:RestConfig;

var authKey = "";
var liteStorage = process.env['TDC_LITE_STORAGE'] || "";
var apiEndpoint = process.env['TDC_API_ENDPOINT'] || "https://www.touchdevelop.com/api/";
var accessToken = process.env['TDC_ACCESS_TOKEN'] || "";
var ccfg = TDev.Cloud.config;

class ApiRequest
{
    data:any;
    spaces = 0;
    startTime = Date.now();
    startCompute:number;
    _isAuthorized = false;
    addInfo = "";
    args:string;

    constructor(public request:http.ServerRequest, public response:http.ServerResponse)
    {
    }

    ok(resJson:any)
    {
        var res:string;
        if (this.spaces)
            res = JSON.stringify(resJson, null, this.spaces)
        else
            res = JSON.stringify(resJson);
        if (verbose || slave) {
            TDev.Util.log(TDev.Util.fmt("{0} [{1}] /{2} OK, {3} bytes, {4} + {5} s",
                    this.request.url,
                    this.addInfo,
                    this.data && this.data.id || "",
                    res.length,
                        Math.round(this.startCompute - this.startTime)/1000,
                        Math.round(Date.now() - this.startCompute)/1000
            ))
        }

        this.text(res, "application/json")
    }

    text(s:string, contentType = "text/plain")
    {
        this.response.writeHead(200, { 
            'Content-Type': contentType,
            'X-TouchDevelop-RelID': ccfg.relid || "none",
        })
        this.response.end(s, "utf-8")
    }

    html(s:string) { this.text(s, "text/html") }

    deployErr(exn:any)
    {
        this.ok({ status: 500, response: exn.toString() })
    }

    err(exn:any)
    {
        reportBug("apiRequest" 
            + (this.data && this.data.id ? ":" + this.data.id : "")
            + (this.request ? " U:" + this.request.url : "")
            + " A:" + this.addInfo
        , exn);
        this.response.writeHead(400, "Exception");
        this.response.end();
    }

    wrap(f:(v:any)=>any)
    {
        return (v) => {
            try {
                return f(v)
            } catch (e) {
                this.err(e);
            }
        };
    }

    errHandler()
    {
        return (err) => this.err(err);
    }

    authorized()
    {
        if (this._isAuthorized);
            return true;
        console.log("unauthorized request to %s", this.request.url);
        this.response.writeHead(403, "Not authorized");
        this.response.end();
        return false;
    }

    notFound()
    {
        this.response.writeHead(404, { "Content-Type": "text/plain" });
        this.response.end("Not found.", "utf-8")
    }

    azurePost(path:string, postData:any, f:(code:number, v:any)=>void, isBus = false)
    {
        if (!this.data || !/^[0-9a-f\-]+$/.test(this.data.subscriptionId)) {
            this.deployErr("bad subscriptionId")
            return
        }
        var opts = <any> url.parse("https://management.core.windows.net/" + this.data.subscriptionId + "/services" + path)
        opts.pfx = new Buffer(this.data.managementCertificate, "base64")
        if (/^v0\.10\./.test(process.version) || /^v0\.8\./.test(process.version))
            opts.agent = new https.Agent(opts);
        var buf = new Buffer(0)
        opts.headers = {
          "x-ms-version": isBus ? "2013-03-01" : "2012-10-10",
          "Content-Type": "application/json; charset=utf-8",
          "Accept": "application/json",
          "Content-Length": buf.length
        }
        if (postData) {
            if (typeof postData == "string") {
                opts.headers['Content-Type'] = 'text/xml'
                buf = new Buffer(postData, "utf8")
            } else {
                buf = new Buffer(JSON.stringify(postData), "utf8")
            }

            if (isBus) {
                opts.method = 'PUT';
                //opts.headers['Content-Type'] = "application/atom+xml"
            } else {
                opts.method = 'POST';
            }
        }

        opts.headers['Content-Length'] = buf.length

        if (verbose)
            console.log("Azure " + path)

        var req = https.request(opts, (res:http.ClientResponse) => {
            var code = res.statusCode
            if (verbose) {
                console.log(path + ": " + code)
            }

            res.setEncoding("utf8")

            var data = ""
            res.on("data", function(d) { data += d })
            res.on("end", function(err) {
                var j = <any>data
                try {
                    j = JSON.parse(data)
                } catch (e) {}
                if (verbose) {
                    console.log(j)
                }
                f(code, j)
            })
        })

        req.on("error", this.errHandler())

        req.write(buf);
        req.end();
    }

    wsBroken() {
        if (!isName(this.data.website)) {
            this.err("bad website name")
            return true
        }
        if (!isName(this.data.webspace))
              //!allWebspaces.hasOwnProperty(this.data.webspace.toLowerCase())
        {
            this.err("bad webspace name")
            return true
        }
        return false
    }
}

function statsResp(ar:ApiRequest) {
    ar.spaces = 2;
    ar.ok(<TDev.StatsResponse> {
        memory: process.memoryUsage(),
        uptime: process.uptime(),
        jsFile: jsPath,
        nodeVersion: process.version,
        argv: process.argv,
        numRequests: reqId,
    })
}

function renderHelpTopicAsync(ht:TDev.HelpTopic, blockLinks = false, forweb = false)
{
    var res = "";
    var md = new TDev.MdComments(new TDev.CopyRenderer());
    md.useSVG = false;
    md.showCopy = false;
    md.useExternalLinks = true;
    md.blockExternalLinks = blockLinks;
    md.forWeb = forweb;
    if (forweb)
        md.relativeLinks = true
    return ht.renderAsync(md).then((text) => {
        return "<h1>" + TDev.Util.htmlEscape(ht.json.name) + "</h1>"
               + text;
    })
}

function htmlFrame(title:string, content:string, css = true)
{
    return "<!DOCTYPE html>\n" +
           "<html><head><meta charset=\"utf-8\" />\n" +
           "<title>" + TDev.Util.htmlEscape(title) + "</title>\n" +
           "<meta http-equiv=\"X-UA-Compatible\" content=\"IE=edge\" />\n" +
           "<body>\n" +
           (css ? TDev.CopyRenderer.css : "") +
           content +
           "</body></html>\n";
}

function prettyScript(tcRes:TDev.AST.LoadScriptResult, printLibs:boolean)
{
    var prettyScript = "";

    tcRes.parseErrs.forEach((pe) => {
        prettyScript += "<div class='parse-error'>Parse error:<br>\n" + TDev.Util.formatText(pe.toString()) + "</div>\n";
    });

    var rend = new TDev.CopyRenderer();
    prettyScript += rend.dispatch(TDev.Script);

    if (printLibs) {
        tcRes.errLibs.forEach((l) => {
            prettyScript += "<h4 class='lib-errors'>Errors in library " + TDev.Util.htmlEscape(l.getName()) + "</h4>";
            l.orderedThings().forEach((th) => {
                if (th.hasErrors())
                    prettyScript += rend.dispatch(th);
            });
        });
    }

    return prettyScript;
}

function parseScript(ar:ApiRequest, f:(tcRes:TDev.AST.LoadScriptResult)=>void)
{
    var r = <TDev.ParseRequestBase>ar.data;
    var libsById:any = {}
    r.libraries.forEach((s) => libsById[s.id] = s.script);
    libsById[""] = r.script;

    TDev.AST.reset();
    TDev.AST.loadScriptAsync((s) => {
        // console.log("fetch " + s + " - " + (libsById[s] ? "OK" : "boo"))
        return TDev.Promise.as(libsById[s])
    }).done(ar.wrap(f), ar.errHandler())
}

function getScriptFeatures()
{
    var fd = new TDev.AST.FeatureDetector()
    fd.includeCaps = true
    fd.dispatch(TDev.Script)
    return fd.features
}

var libroots:any = null
function getAstInfo(flags:TDev.StringMap<string>)
{
    var r = TDev.AST.FeatureDetector.astInfo(TDev.Script, libroots, flags)
    var sh = crypto.createHash("sha256")
    sh.update(r.bucketId)
    r.bucketId = sh.digest("base64").slice(0, 20)
    return r;
}

var cachedLibroots = {}
function getAstInfoWithLibs(ar:ApiRequest, opts:TDev.StringMap<string>)
{
    var missing = {}
    var numMissing = 0
    var resolve = (s:string) => {
        if (cachedLibroots.hasOwnProperty(s))
            return cachedLibroots[s]
        missing[s] = 1
        numMissing++
        return s
    }

    var r = TDev.AST.FeatureDetector.astInfo(TDev.Script, resolve, opts)

    var finish = () => {
        var sh = crypto.createHash("sha256")
        sh.update(r.bucketId)
        r.bucketId = sh.digest("base64").slice(0, 20)
        ar.ok(r)
    }

    if (numMissing == 0)
        finish()
    else
        TDev.Promise.join(Object.keys(missing).map(k =>
            (/^[a-z]+$/.test(k) ?
                TDev.Util.httpGetJsonAsync(apiEndpoint + encodeURIComponent(k) + accessToken).then(v => v, err => null)
            : TDev.Promise.as(null))
            .then(resp => {
                if (resp && resp.rootid)
                    cachedLibroots[k] = resp.rootid
                else
                    cachedLibroots[k] = k
            })))
        .then(() => {
            r = TDev.AST.FeatureDetector.astInfo(TDev.Script, resolve, opts)
            finish()
        })
        .done();
}

function compress(data:any)
{
    TDev.AST.reset();

    var itms = data.items
    console.log("         %s/%s  : %d edits, %s", data.userid, data.guid, itms.length, data.lastStatus)
    itms.reverse()
    var edits = itms.map((it, i) => { return {
        seqNo: i,
        time: it.time,
        scriptId: it.scriptstatus ==  "published" ? it.scriptid : null,
        historyId: it.historyid,
        script: it.script
    } })
    edits = edits.filter(e => !!e.script)
    if (edits.length > 0) {
        TDev.AST.Diff.computeMicroEdits(edits)
        TDev.AST.Diff.sanityCheckEdits(edits)
    }
    data.items = edits
}

//
// Azure deployment
//

// from http://msdn.microsoft.com/en-us/library/azure/dn236427.aspx
// they don't seem to provide an API to query this...
var allWebspaces = {
    eastuswebspace: "East US",
    westuswebspace: "West US",
    northcentraluswebspace: "North Central US",
    northeuropewebspace: "North Europe",
    westeuropewebspace: "West Europe",
    eastasiawebspace: "East Asia",
}

interface FtpOptions {
    userName: string;
    userPWD: string;
    publishUrl: string;
    //operation: string; // "get" or "put" at the moment
    //filename: string;
    //filecontent?: string; // for "put"
}

function doFtp(ar:ApiRequest, operation:string, filename:string, filecontent:string, f)
{
    var opts = <FtpOptions> (ar.data || {})

    var u = url.parse(opts.publishUrl)
    var client = <any>net.connect({
        host: u.hostname,
        port: u.port || 21,
    })
    var phase = 0
    var connOpt:any = null

    client.on('data', dat => {
        var s = dat.toString()

       // if (verbose) console.log(s) // debug
       //console.log(s)

        if (/^530/.test(s)) {
            client.end()
            phase = 100
            f(s, "")
        }

        if (/^220/.test(s) && phase == 0) {
            phase = 1
            client.write("USER " + opts.userName + "\r\n");
            client.write("PASS " + opts.userPWD + "\r\n");
        }
        if (/^230/.test(s) && phase == 1) {
            client.write("CWD " + u.pathname + "\r\n")
            phase = 2
        }
        if (/^250/.test(s) && phase == 2) {
            // client.write("TYPE I\r\n")
            client.write("PASV\r\n")
            phase = 3
        }
        if (/^227/.test(s) && phase == 3) {
            var m = /\((\d+),(\d+),(\d+),(\d+),(\d+),(\d+)\)/.exec(s)
            connOpt = {
                host: m[1] + "." + m[2] + "." + m[3] + "." + m[4],
                port: parseInt(m[5])*256 + parseInt(m[6])
            }

            //console.log(operation + " " + filename)

            if (operation == "put") {
                client.write("STOR " + filename + "\r\n")
                phase = 4
            } else if (operation == "get") {
                client.write("RETR " + filename + "\r\n")
                phase = 5
            } else {
                f("bad operation " + operation, null)
                phase = 100
            }
        }

        if (/^550/.test(s) && phase == 5) {
            phase = 100;
            client.end();
            f(null, "")
        }

        if (/^150/.test(s) && phase == 4) {
            phase = 6;

            var c2 = <any>net.connect(connOpt)
            c2.setEncoding("utf8")
            c2.on("connect", () => {
                c2.write(filecontent)
                c2.end()
            })
        }

        if (/^150/.test(s) && phase == 5) {
            phase = 100; // don't wait for 226

            var c2 = <any>net.connect(connOpt)
            c2.setEncoding("utf8")
            var bufs = []
            c2.on("data", dat => bufs.push(dat))
            c2.on("end", () => {
                f(null, bufs.join(""))
                c2.end()
                client.end()
            })
        }

        if (/^226/.test(s) && phase == 6) {
            client.end()
            f(null, null)
        }
    })
}

export interface DeployReq {
    subscriptionId: string; // guid
    managementCertificate: string; // base64 encoded

    // for /listwebsites
    // nothing

    // for /createwebsite, /getpublishxml
    webspace?: string;
    website?: string;
}

function isName(s:string)
{
    return /^[a-zA-Z0-9\-_]+$/.test(s)
}

var deployHandlers = {
    "webspaces": (ar:ApiRequest) => {
        ar.ok({
            webspaces: Object.keys(allWebspaces).map(k => {
                return {
                    webspace: k,
                    geoRegion: allWebspaces[k],
                    // Plan: "VirtualDedicatedPlan"
                }
            })
        })
    },

    "createwebsite": (ar:ApiRequest) => {
        if (ar.wsBroken()) return

        var ws = ar.data.webspace
        var wsGeo = allWebspaces[ws]
        var siteName = ar.data.website
        var req = {
          HostNames: [ siteName + ".azurewebsites.net"] ,
          Name: siteName,
          WebSpaceToCreate: {
            GeoRegion: wsGeo,
            Name: ws,
            Plan: "VirtualDedicatedPlan"
          }
        }
        ar.azurePost("/WebSpaces/" + ws + "/sites", req, (code, resp) => {
            ar.ok({
                status: code,
                response: resp,
            })
        })
    },

    "getnamespace": (ar:ApiRequest) => {
        ar.azurePost("/ServiceBus/Namespaces/" + ar.data.name, null, (code, resp) => {
            ar.ok({
                status: code,
                response: resp,
            })
        }, true)
    },

    "getstorage": (ar:ApiRequest) => {
        ar.azurePost("/storageservices/" + ar.data.name, null, (code, resp) => {
            ar.ok({
                status: code,
                response: resp,
            })
        }, true)
    },

    "getstoragekeys": (ar:ApiRequest) => {
        ar.azurePost("/storageservices/" + ar.data.name + "/keys", null, (code, resp) => {
            ar.ok({
                status: code,
                response: resp,
            })
        }, true)
    },

    "createstorage": (ar:ApiRequest) => {
        var wsGeo = allWebspaces[ar.data.webspace] || ar.data.region
        var req = '<?xml version="1.0" encoding="utf-8"?>' +
                  '<CreateStorageServiceInput xmlns="http://schemas.microsoft.com/windowsazure">' +
                  '<ServiceName>' + ar.data.name + '</ServiceName>' +
                  '<Description>Created for Touch Develop website.</Description>' +
                  '<Label>' + new Buffer(ar.data.name, "utf8").toString("base64") + '</Label>' +
                  '<Location>' + wsGeo + '</Location>' +
                  '</CreateStorageServiceInput>';
        ar.azurePost("/storageservices", req, (code, resp) => {
            ar.ok({
                status: code,
                response: resp,
            })
        })
    },

    "createnamespace": (ar:ApiRequest) => {
        var wsGeo = allWebspaces[ar.data.webspace] || ar.data.region
        var req = {
            Region: wsGeo
        }
        ar.azurePost("/ServiceBus/Namespaces/" + ar.data.name, req, (code, resp) => {
            ar.ok({
                status: code,
                response: resp,
            })
        }, true)
    },

    "listwebsites": (ar:ApiRequest) => {
        ar.azurePost("/WebSpaces", null, (code, spaces) => {
            if (code != 200 || !spaces.forEach) {
                ar.ok({
                    status: code,
                    response: spaces,
                    websites: [],
                })
                return
            }

            var results = []
            var left = 0
            spaces.forEach(s => {
                left++;
                ar.azurePost("/WebSpaces/" + s.Name + "/sites", null, (subcode, resp) => {
                    if (subcode == 200)
                        resp.forEach(site => {
                            results.push(site)
                        })
                    if (--left == 0) {
                        ar.ok({
                            status: code,
                            websites: results,
                        })
                    }
                })
            })
        })
    },


    "getpublishxml": (ar:ApiRequest) => {
        if (ar.wsBroken()) return

        ar.azurePost("/WebSpaces/" + ar.data.webspace + "/sites/" + ar.data.website + "/publishxml", null, (code, resp) => {
            ar.ok({
                status: code,
                response: resp
            })
        })
    },

    "getazureconfig": (ar:ApiRequest) => {
        if (ar.wsBroken()) return

        ar.azurePost("/WebSpaces/" + ar.data.webspace + "/sites/" + ar.data.website + "/config", null, (code, resp) => {
            ar.ok({
                status: code,
                response: resp
            })
        })
    },

    "setazureconfig": (ar:ApiRequest) => {
        if (ar.wsBroken()) return

        ar.azurePost("/WebSpaces/" + ar.data.webspace + "/sites/" + ar.data.website + "/config", ar.data.config, (code, resp) => {
            ar.ok({
                status: code,
                response: resp
            })
        }, true)
    },

    "ensureWebsocketsEnabled": (ar: ApiRequest) => {
        if (ar.wsBroken()) return

        ar.azurePost("/WebSpaces/" + ar.data.webspace + "/sites/" + ar.data.website + "/config", null, (code, resp) => {
            resp["WebSocketsEnabled"] = true
            ar.azurePost("/WebSpaces/" + ar.data.webspace + "/sites/" + ar.data.website + "/config", resp, (code, resp) => {
                ar.ok({
                    status: code,
                    response: resp
                })
           }, true)
        })
    },

    "gettdconfig": (ar:ApiRequest) => {
        doFtp(ar, "get", "tdconfig.json", null, (err, cont) => {
            if (cont) ar.ok({ status: 200, config: JSON.parse(cont) })
            else ar.ok({ status: 404, config: null })
        })
    },

    "deploytdconfig": (ar:ApiRequest) => {
        doFtp(ar, "get", "tdconfig.json", null, (err, cont) => {
            var oldCfg:any = {}
            if (cont) {
                try {
                    oldCfg = JSON.parse(cont)
                } catch (e) {}
            }

            var cfg = {
                deploymentKey: oldCfg.deploymentKey || crypto.randomBytes(20).toString("hex"),
                jsFile: jsPath,
                timestamp: Date.now(),
                timestampText: new Date().toString(),
                shellVersion: ar.data.shellVersion || TDev.Runtime.shellVersion,
            }
            var files = ar.data.pkgShell || (<any>TDev).pkgShell
            var names = Object.keys(files)
            var sendOne = (i:number) => {
                if (i < names.length) {
                    doFtp(ar, "put", names[i], files[names[i]], (err, cont) => {
                        if (err) ar.deployErr(err);
                        else sendOne(i+1)
                    })
                } else {
                    doFtp(ar, "put", "tdconfig.json", JSON.stringify(cfg, null, 4), (err, cont) => {
                        if (err) ar.deployErr(err);
                        else ar.ok({ status: 200, config: cfg })
                    })
                }
            }
            sendOne(0)

        })
    },
}

function handleQuery(ar:ApiRequest, tcRes:TDev.AST.LoadScriptResult) {
    var r = <TDev.QueryRequest>ar.data;

    var m = /^([^?]*)(\?(.*))?/.exec(r.path)
    var opts:any = m[3] ? querystring.parse(m[3]) : {}
    if (opts.format)
        ar.spaces = 2;
    var hr = ar.response
    var html = (content:string, css = true) => {
        ar.html(htmlFrame(TDev.Script.getName(), content, css))
    }
    ar.addInfo = m[1];

    function detect(unreach) {
        var v = new TDev.AST.PlatformDetector();
        if (opts.req)
            v.requiredPlatform = TDev.AST.App.fromCapabilityList(opts.req.split(/,/))
        v.includeUnreachable = unreach
        v.run(TDev.Script);
        return {
            platforms: TDev.AST.App.capabilityString(v.platform).split(",").filter(s => !!s),
            errors: v.errors
        }
    }

    switch (m[1]) {
    /*
    case "crash":
        throw new Error("induced crash")
        break;
    */

    case "webast":
        ar.ok(TDev.AST.Json.dump(TDev.Script))
        break;

    case "string-art":
        var rmap = []
        TDev.Script.resources().forEach(r => {
            var v = r.stringResourceValue()
            if (v != null)
                rmap.push({ name: r.getName(), value: v })
        })
        ar.ok(rmap)
        break;

    case "pretty":
        html(prettyScript(tcRes, !!opts.libErrors))
        break;

    case "pretty-docs":
    case "docs":
        renderHelpTopicAsync(TDev.HelpTopic.fromScript(TDev.Script)).done(top => html(top))
        break;

    case "raw-docs":
        renderHelpTopicAsync(TDev.HelpTopic.fromScript(TDev.Script), true, true).done(top => ar.ok({
            body: top,
            template: "docs", // TODO get from script text
        }))
        break;

    case "raw-docs-official":
        renderHelpTopicAsync(TDev.HelpTopic.fromScript(TDev.Script), false, true).done(top => ar.ok({
            body: top,
            template: "docs", // TODO get from script text
        }))
        break;

    case "docs-info":
        TDev.HelpTopic.fromScript(TDev.Script).docInfoAsync().done(resp => ar.ok(resp))
        break;

    case "tutorial-info":
        ar.ok(TDev.AST.Step.tutorialInfo(TDev.Script))
        break;

    case "platforms":
        ar.ok({
            numErrors: tcRes.numErrors,
            reachable: detect(false),
            everything: detect(true)
        })
        break;

    case "features":
        ar.ok({
            features: getScriptFeatures()
        })
        break;

    case "libinfo":
        getAstInfoWithLibs(ar, opts)
        break;

    case "astinfo":
        ar.ok(getAstInfo(opts))
        break;

    case "text":
        ar.text(TDev.Script.serialize())
        break;

    case "compile":
        TDev.Script.setStableNames();
        var cs = TDev.AST.Compiler.getCompiledScript(TDev.Script, {
                packaging: true,
                scriptId: r.id
        });

        ar.ok({ compiled: cs.getCompiledCode(),
                resources: cs.packageResources })
        break;

    case "hexcompile":
        TDev.Hex.cliCompileAsync(TDev.Script, r.id)
        .done(v => {
            v.name = TDev.Script.getName()
            delete v.csource
            ar.ok(v)
        }, ar.errHandler())
        break;

    case "webapp":
        TDev.Script.setStableNames();
        var cs = TDev.AST.Compiler.getCompiledScript(TDev.Script, {
                scriptId: r.id
        });
        ar.ok({ compiled: cs.getCompiledCode() });
        break;

    case "package": (() => {
            var user = ""
            if (opts.token) {
                var jwt = decodeJWT(opts.token, "Export your scripts")
                if (jwt.tdUser)
                    user = "/" + encodeURIComponent(jwt.tdUser)
                else {
                    ar.ok({ error: jwt.error || "bad token" })
                    return
                }
            }
            TDev.AST.Apps.getDeploymentInstructionsAsync(TDev.Script, {
                relId: relId,
                scriptId: r.id,
                runtimeFlags: opts.flags,
            }).done(ins => ar.ok(ins))
        })();
        break;

    case "nodepackage":
        TDev.AST.Apps.getDeploymentInstructionsAsync(TDev.Script, {
            relId: relId,
            scriptId: r.id,
            filePrefix: "static/",
            compileServer: true,
            skipClient: true,
            azureSite: "http://localhost",
            runtimeFlags: opts.flags,
        }).done(ins => ar.ok(ins))
        break;

    default:
        ar.notFound();
        break;
    }
}

var tdKey = (
"-----BEGIN PUBLIC KEY-----\n" +
"MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEAweLfmQya+jN+J0m0ND26\n" +
"PwmKPiH2w1RhRA35Xw5+wVG9/zrYqojjxNjSwabL3iBH7V6kTkXov+geCupuBfZM\n" +
"DJ6b5Zyi0p9ViENMJ4gUWMG4VRd9V5skjFCPqLNftFUIz6u9ykEB4jQCnThfJMgM\n" +
"+FtzJq4MlmtE/7SWqfMMfPwLQXAH2niIpvq79+PjsvI/vcVYV4pAlyOMD6gssUxh\n" +
"3j5pFiKaHYGZPIaLO5bvepaQLg7KKV+Cazsj4XV8f6t5uLJx/C70Lh1uUqBe8qU7\n" +
"s6piZ96mak29/W3BGKZrLXgVscyJJjLk66UzFHCIhloP5+GK91lHA8PA/zq2/TyR\n" +
"2l6hE3cgsFcFzre8vPgsQ2qWXxgVCPse7AzmWHLqFk/AYpL5YhAW5mnsCdlZUZt1\n" +
"j/SQkRu0pq8Uv6Etsg91F9DioCyZTLmsKkEzpJPH0XTq3h8WIpVetjADiKP9hC0H\n" +
"PMwlYg0uB8l51VU0zaRRNZKeHBQ8S3KwbHFdNn5pukiletr0aFxa9pDJT67Rtd6q\n" +
"dzKerg5XV7bMjQZS+bjp+8RWIa5gs1JCgyJRfJVdFpNRb15hbI0PN/BR8GnQ43RE\n" +
"EpRqpk/SIyK5AIXPgi1/fWTp6DXUzzZkkqiHnxf1q0ExVzI//m9vk6zNP9KH7J0i\n" +
"BxK05vwhxw4gzuY+lYUqWGECAwEAAQ==\n" +
"-----END PUBLIC KEY-----\n")

function decodeJWT(token:string, aud:string)
{
    if (typeof token != "string") return { error: "invalid token type " + typeof token }

    var parts = token.split('.')
    var decode = (n:number) => new Buffer(parts[n].replace(/-/g, "+").replace(/_/g, "/"), "base64")
    if (parts.length != 3) return { error: "invalid token" }

    try {
        var hd = JSON.parse(decode(0).toString())
        var body = JSON.parse(decode(1).toString())
        if (hd.typ != "JWT" || hd.alg != "RS256")
            return { error: "unsupported token algorithm" }
    } catch (e) {
        return { error: "invalid token (JSON)" }
    }


    try {
        var ok = (<any>crypto).createVerify("RSA-SHA256")
            .update(parts[0] + "." + parts[1])
            .verify(tdKey, decode(2))
        if (!ok)
            return { error: "invalid token signature" }
        else if (aud != body.aud)
            return { error: "wrong token scope, expecting " + aud }
        else {
            var m = /^u-([a-z]+)@touchdevelop.com$/.exec(body.sub)
            if (!m)
                return { error: "invalid 'sub'" }
            body.tdUser = m[1]
            return body
        }
    } catch (e) {
        return { error: "token verification error" }
    }
}

var apiHandlers = {
    "deps": (ar:ApiRequest) => {
        var r = <TDev.DepsRequest>ar.data;
        var res = <TDev.DepsResponse> { libraryIds: [] };
        TDev.Script = TDev.AST.Parser.parseScript(r.script);
        TDev.Script.libraries().forEach((lib) => {
            var id = lib.getId()
            if (id && res.libraryIds.indexOf(id) < 0) res.libraryIds.push(id);
        });
        ar.ok(res);
    },

    "css": (ar:ApiRequest) => {
        ar.ok(<TDev.CssResponse> { 
            css: TDev.CopyRenderer.css,
            relid: ccfg.relid,
        })
    },

    "oauth": (ar:ApiRequest) => {
        var hr = ar.response
        ar.html(TDev.RT.Node.storeOAuthHTML)
    },

    "stats": statsResp,

    "docs": (ar:ApiRequest) => {
        var r = <TDev.DocsRequest>ar.data;
        if (!r || !r.topic) r = { topic: ar.args }
        var ht = TDev.HelpTopic.findById(r.topic);
        ar.addInfo = r.topic;
        if (!ht) {
            ar.notFound();
            return;
        }
        var j = ht.json
        renderHelpTopicAsync(ht).done(top => {
            var resp = <TDev.DocsResponse> {
                prettyDocs: top,
                title: j.name,
                scriptId: j.id,
                description: j.description,
                icon: j.icon,
                iconbackground: j.iconbackground,
                iconArtId: j.iconArtId,
                time: j.time,
                userid: j.userid
            }
            ar.ok(resp)
        })
    },

    "compresshistory": (ar:ApiRequest) => {
        compress(ar.data)
        ar.ok(ar.data)
    },

    "language": (ar:ApiRequest) => {
        var r = <TDev.LanguageRequest>ar.data;
        if (!r || !r.path) r.path = ar.args
        var m = /^([^?]*)(\?(.*))?/.exec(r.path)
        var opts:any = m[3] ? querystring.parse(m[3]) : {}
        if (opts.format)
            ar.spaces = 2;
        var hr = ar.response
        ar.addInfo = m[1];
        switch (m[1]) {
        case "version":
            ar.ok({
                textVersion: TDev.AST.App.currentVersion,
                releaseid: relId,
                relid: ccfg.relid,
                tdVersion: ccfg.tdVersion,
            });
            break;

        case "webast":
            ar.text(TDev.AST.Json.docs)
            break;

        case "apis":
            ar.ok(TDev.AST.Json.getApis())
            break;

        case "shell.pkg":
            ar.ok((<any>TDev).pkgShell)
            break;

        case "shell.js":
            ar.text((<any>TDev).pkgShell['server.js'], "application/javascript")
            break;

        case "touchdevelop-rpi.sh":
            ar.text(
                "cd /home/pi\n" +
                "mkdir TouchDevelop\n" +
                "cd TouchDevelop\n" +
                "wget http://node-arm.herokuapp.com/node_latest_armhf.deb\n" +
                "sudo dpkg -i node_latest_armhf.deb\n" +
                "sudo npm install -g http://aka.ms/touchdevelop.tgz\n" +
                "wget -O $HOME/TouchDevelop/TouchDevelop.png https://www.touchdevelop.com/images/touchdevelop72x72.png\n" +
                "wget -O $HOME/Desktop/TouchDevelop.desktop https://www.touchdevelop.com/api/language/touchdevelop.desktop\n");
            break;

        // linux desktop shortcut, mainly for raspberry pi
        case "touchdevelop.desktop":
            ar.text(
                "[Desktop Entry]\n" +
                "Encoding=UTF-8\n" +
                "Version=1.0\n" +
                "Name=TouchDevelop\n" +
                "GenericName=Microsoft Touch Develop\n" +
                "Path=/home/pi/TouchDevelop\n" +
                "Exec=touchdevelop --cli --internet\n" +
                "Terminal=true\n" +
                "Icon=/home/pi/TouchDevelop/TouchDevelop.png\n" +
                "Type=Application\n" +
                "Categories=Programming;Games\n" +
                "Comment=Code your Pi using Touch Develop!");
            break;

        default:
            ar.notFound();
            break;
        }
    },

    "query": (ar:ApiRequest) => {
        if (ar.data) ar.addInfo += ",p=" + ar.data.path + ","
        parseScript(ar, (tcRes) => handleQuery(ar, tcRes))
    },

    "q": (ar:ApiRequest) => {
        var m = /^([a-z]+)\/(.*)/.exec(ar.args)
        if (m) {
            ar.data = { path: m[2], id: m[1] }
            TDev.AST.reset();
            ar.addInfo += ",p=" + ar.data.path + ","
            TDev.AST.loadScriptAsync(getScriptAsync, m[1]).done(ar.wrap(tcRes => handleQuery(ar, tcRes)), ar.errHandler())
        } else {
            ar.notFound()
        }
    },

    "query2": (ar:ApiRequest) => {
        TDev.AST.reset();
        if (ar.data) ar.addInfo += ",p=" + ar.data.path + ","
        TDev.AST.loadScriptAsync(getScriptAsync, ar.data.id).done(ar.wrap(tcRes => handleQuery(ar, tcRes)), ar.errHandler())
    },

    "addids": (ar:ApiRequest) => {
        var r = <TDev.AddIdsRequest>ar.data;
        TDev.AST.stableReset(r.id || r.script)
        var res = TDev.AST.Diff.assignIds(r.baseScript || "", r.script)
        ar.ok({ withIds: res.text })
    },

    "parse": (ar:ApiRequest) => {
        var r = <TDev.ParseRequest>ar.data;
        parseScript(ar, (tcRes) => {
            var res:TDev.ParseResponse = {
                numErrors: tcRes.numErrors,
                numLibErrors: tcRes.numLibErrors,
                status: tcRes.status,
                artIds: [],
                meta: TDev.Script.toMeta(),
            }

            if (r.prettyText) {
                res.prettyText = TDev.AST.App.sanitizeScriptTextForCloud(TDev.Script.serialize())
                ar.addInfo += "text,";
            }

            if (r.prettyScript) {
                res.prettyScript = prettyScript(tcRes, r.prettyScript >= 2);
                ar.addInfo += "pretty,";
            }

            if (r.prettyDocs) {
                var ht = TDev.HelpTopic.fromScript(TDev.Script);
                renderHelpTopicAsync(ht).done(top => res.prettyDocs = top);
                ar.addInfo += "docs,";
            }

            if (r.features)
                res.features = getScriptFeatures()

            if (r.requiredPlatformCaps) {
                var v = new TDev.AST.PlatformDetector();
                v.requiredPlatform = r.requiredPlatformCaps;
                v.run(TDev.Script);
                res.platformErrors = v.errors;
                res.platformCaps = v.platform;
                v = new TDev.AST.PlatformDetector();
                v.includeUnreachable = true;
                v.run(TDev.Script);
                res.platformAllCaps = v.platform;
                ar.addInfo += "caps,";
            }

            TDev.Script.librariesAndThis().forEach(l => {
                if (l.resolved)
                    l.resolved.resources().forEach(v => {
                        var id = TDev.Cloud.getArtId(v.url)
                        if (id)
                            res.artIds.push(id)
                    })
            })

            //TDev.AST.Diff.assignIds("", ar.data.script)

            if (r.compile && res.numErrors == 0) {
                TDev.Script.setStableNames();
                var opts:TDev.AST.CompilerOptions = r.compilerOptions || {}
                opts.packaging = true
                opts.authorId = r.userId
                opts.scriptId = r.id
                var cs = TDev.AST.Compiler.getCompiledScript(TDev.Script, opts)
                res.compiledScript = cs.getCompiledCode();
                res.packageResources = cs.packageResources;
                ar.addInfo += "compile,";
                if (/TDev\.Util\.syntaxError\(/.test(res.compiledScript)) {
                    res.numErrors++;
                    res.status += "\noops, syntax error invocation in compiled script";
                }
            }
            if (r.optimize && res.numErrors == 0) {
                TDev.Script.setStableNames();
                var cs = TDev.AST.Compiler.getCompiledScript(TDev.Script, {
                    packaging: true,
                    authorId: r.userId,
                    scriptId: r.id,
                    inlining: true,
                    okElimination: true,
                    blockChaining: true,
                    commonSubexprElim: true,
                    constantPropagation: true
                });
                res.compiledScript = cs.getCompiledCode();
                res.numInlinedCalls = cs.optStatistics.inlinedCalls;
                res.numInlinedFunctions = cs.optStatistics.inlinedFunctions;
                res.numOkEliminations = cs.optStatistics.eliminatedOks;
                res.numActions = cs.optStatistics.numActions;
                res.numStatements = cs.optStatistics.numStatements;
                res.termsReused = cs.optStatistics.termsReused;
                res.constantsPropagated = cs.optStatistics.constantsPropagated;
                res.reachingDefsTime = cs.optStatistics.reachingDefsTime;
                res.inlineAnalysisTime = cs.optStatistics.inlineAnalysisTime;
                res.usedAnalysisTime = cs.optStatistics.usedAnalysisTime;
                res.constantPropagationTime = cs.optStatistics.constantPropagationTime;
                res.availableExprsTime = cs.optStatistics.availableExpressionsTime;
                res.compileTime = cs.optStatistics.compileTime;
                res.packageResources = cs.packageResources;
                ar.addInfo += "optimize,";
            }


            function scriptText() {
                return TDev.AST.App.sanitizeScriptTextForCloud(TDev.Script.serialize().replace(/\n+/g, "\n"));
            }

            // r.testIds = true

            if (r.testIds) {
                TDev.Script.hasIds = true
                new TDev.AST.InitIdVisitor(false).dispatch(TDev.Script)
                var text = TDev.Script.serialize()
                var app2 = TDev.AST.Parser.parseScript(text)
                new TDev.AST.InitIdVisitor(false).expectSet(app2)
                TDev.AST.TypeChecker.tcScript(app2, true)
                var j = TDev.AST.Json.dump(app2)


                var textJ = TDev.AST.Json.serialize(j, false)
                var prevText = app2.serialize()
                var app3 = TDev.AST.Parser.parseScript(textJ)
                TDev.AST.TypeChecker.tcScript(app3, true)
                var newText = app3.serialize()

                if (prevText != newText) {
                    console.log("serialzation mismatch: " + r.id);
                    fs.writeFileSync("during-serialization.txt", "ID: " + r.id + "\n" + textJ);
                    fs.writeFileSync("before-serialization.txt", prevText);
                    fs.writeFileSync("after-serialization.txt", newText);
                    process.exit(1)
                }


                ar.ok(res)
            } else if (r.testAstSerialization) {
                ar.addInfo += "astTest,";
                var currText = scriptText();
                var j = TDev.AST.Json.dump(TDev.Script);
                var jt = JSON.stringify(j);
                r.script = TDev.AST.Json.serialize(JSON.parse(jt));
                parseScript(ar, (tcRes) => {
                    var newText = scriptText();
                    if (currText != newText) {
                        console.log("serialzation mismatch");
                        fs.writeFileSync("during-serialization.txt", jt);
                        fs.writeFileSync("before-serialization.txt", currText);
                        fs.writeFileSync("after-serialization.txt", newText);
                        process.exit(1);
                    }
                    ar.ok(res);
                })
            } else {
                ar.ok(res);
            }
        })
    },
}

function setCors(resp:http.ServerResponse)
{
    resp.setHeader('Access-Control-Allow-Origin', "*");
    resp.setHeader('Access-Control-Allow-Methods', 'GET,PUT,POST');
    resp.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function handleApi(req:http.ServerRequest, resp:http.ServerResponse)
{
    var buf = "";

    setCors(resp);

    var ar = new ApiRequest(req, resp);

    function final() {
        try {
            ar.startCompute = Date.now();
            var u = url.parse(req.url);
            var uu = u.pathname.replace(/^\//, "");
            var qs = querystring.parse(u.query)

            if (/^-tdevmgmt-\//.test(uu)) {
                ar.ok({})
                return
            }

            if (authKey && qs['access_token'] != authKey) {
                resp.writeHead(403)
                resp.end("Bad auth")
                return
            }

            uu = uu.replace(/^api\//, "");
            ar.data = buf ? JSON.parse(buf) : {};
            var firstWord = uu.replace(/\/.*/, "");

            var h = apiHandlers[firstWord];
            ar.args = uu.replace(/^[^\/]+\//, "")

            var mm = /^deploy\/(.*)/.exec(uu)
            if (mm) {
                uu = mm[1]
                h = deployHandlers[uu]
            }

            if (uu == "deploy") {
                var pp = ar.data.path.replace(/\?.*/, "")
                var origData = ar.data
                h = deployHandlers[pp]
                // if (!h) h = ar => ar.ok({ status: 404, path: pp, data: origData })
                ar.data = JSON.parse(ar.data.body)
            }

            if (h) {
                h(ar);
            } else {
                resp.writeHead(404, "No such api");
                resp.end("No such api", "utf-8");
            }
        } catch (err) {
            ar.err(err);
        }
    }

    if (req.method == "OPTIONS") {
        resp.writeHead(200, "OK");
        resp.end();
    } else if (req.method == 'POST' || req.method == "PUT") {
        req.setEncoding('utf8');
        req.on('data', (chunk) => { buf += chunk });
        req.on('end', final);
    } else {
        final()
    }
}

function downloadFile(u:string, f:(s:string)=>void)
{
    var p = url.parse(u);


    https.get(u, (res:http.ClientResponse) => {
        if (res.statusCode == 200) {
            if (/gzip/.test(res.headers['content-encoding'])) {
                var g: events.EventEmitter = zlib.createUnzip(undefined);
                (<any>res).pipe(g);
            } else {
                g = res;
                res.setEncoding('utf8');
            }

            var d = "";
            g.on('data', (c) => { d += c });
            g.on('end', () => {
                console.log("DOWNLOAD %s", u);
                f(d)
            })

        } else {
            console.error("error downloading file");
            console.error(res);
        }
    });
}

function reportBug(ctx: string, err: any) {
    if (!slave)
        console.error(err);

    var bug = TDev.Ticker.mkBugReport(err, ctx);
    if (!slave)
        console.error(TDev.Ticker.bugReportToString(bug));
    bug.exceptionConstructor = "NJS " + bug.exceptionConstructor;
    bug.tdVersion = ccfg.tdVersion

    console.log("POSTING CRASH", bug)

    TDev.Util.httpPostRealJsonAsync(apiEndpoint + "bug" + accessToken, bug)
        .done(() => {}, err => {
            console.error("cannot post bug: " + err.message);
        })
}


function startServer(port:number)
{
    http.createServer((req, resp) => {
        try {
            reqId++;
            if (verbose)
                console.log('%s %s', req.method, req.url);
            handleApi(req, resp);
        } catch (err) {
            reportBug("noderunner", err);
        }
    }).listen(port, 'localhost');

    console.log("listening on localhost:%d; things are good", port);
}

function randomInt(max:number) : number {
    return Math.floor(Math.random()*max)
}

function permute<T>(arr:T[])
{
    for (var i = 0; i < arr.length; ++i) {
        var j = randomInt(arr.length)
        var tmp = arr[i]
        arr[i] = arr[j]
        arr[j] = tmp
    }
}

function compressFile(inpF:string, outpF:string)
{
    var d:any = {}
    try {
        var data = fs.readFileSync(inpF, "utf-8");
        d = JSON.parse(data)
        // if (d.lastStatus == "deleted") return;
        compress(d)
        if (!d.items || d.items.length == 0) return;
        fs.writeFile(outpF,  JSON.stringify(d, null, 2), "utf-8", err => {
            if (err) console.error(err)
        })
    } catch (e) {
        console.error("error: %s, %s/%s, %s, lastNo:%d", inpF, d.userid, d.guid, d.lastStatus, TDev.AST.Diff.lastSeqNo)
        console.error(e.message)
        console.error(e.stack)
    }
}

function compressDir(inpD:string, outpD:string)
{
    var inp = fs.readdirSync(inpD)
    var checked = false
    inp.forEach(fn => {
        if (!/\.json$/.test(fn)) return;
        if (fs.existsSync(outpD + "/" + fn))
            return;
        if (!checked && !fs.existsSync(outpD))
            fs.mkdirSync(outpD)
        checked = true
        compressFile(inpD + "/" + fn, outpD + "/" + fn)
    })
}

function compressDirs(dirs:string[])
{
    console.log("COMPRESS " + dirs.join(" "))
    dirs.forEach(uu => {
        if (/^[a-z]+\/[0-9a-f-]+$/.test(uu)) {
            compressFile("everyone/" + uu + ".json", "compressed/" + uu + ".json")
        } else {
            var src = "everyone/" + uu
            if (fs.existsSync(src))
                compressDir(src, "compressed/" + uu)
        }
    })
}

function addAstInfo(ids:string[])
{
    libroots = JSON.parse(fs.readFileSync("libroots.json", "utf-8"))
    Object.keys(libroots).forEach(k => {
        var m = /^([^:]*):([^:]*)/.exec(libroots[k])
        if (m) {
            libroots[k] = m[1] + ":" + m[2]
        }
    })

    ids.forEach(id => {
        var scr = fs.readFileSync("text/" + id, "utf8")
        TDev.AST.reset();
        var done = false
        TDev.AST.loadScriptAsync((s) => TDev.Promise.as(s == "" ? scr : null)).done(() => done = true)
        if (!done) throw "oops";
        var nf:any = getAstInfo({})
        fs.writeFileSync("astinfo/" + id + ".json", JSON.stringify(nf))
    })
}

function addIds(ids:string[])
{
    ids.forEach(combined => {
        var twoIds = combined.split(/:/)
        var baseText = twoIds[0] ? fs.readFileSync("ids/" + twoIds[0], "utf8") : ""
        var currText = fs.readFileSync("text/" + twoIds[1], "utf8")
        var res = TDev.AST.Diff.assignIds(baseText, currText)

        var inf = res.info.newApp
        inf.numDel = res.info.oldApp.numDel
        inf.numOldStmts = res.info.oldApp.numStmts

        inf.size = inf.numAdd + inf.numDel + 4*inf.totalChangedRatio
        inf.relSize = inf.size / (inf.numStmts + inf.numOldStmts)
        inf.baseId = twoIds[0] || null
        inf.scriptId = twoIds[1]

        var nums = [
            inf.size,
            inf.relSize,
            inf.numStmts,
            inf.numOldStmts,
            inf.numMatched,
            inf.numAdd,
            inf.numDel,
            inf.numChanged,
            inf.totalChangedRatio,
            inf.numHighlyChanged,
        ]
        console.log("ADDIDS " + combined.replace(/:/,",") + "," + nums.join(","))
        console.log("JSON " + JSON.stringify(inf))
        fs.writeFileSync("ids/" + twoIds[1], res.text)
    })
}

// http://stackoverflow.com/a/12646864
function shuffleArray(array) {
    for (var i = array.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
    return array;
}

// node --expose-gc --max-old-space-size=2000 noderunner mergetest [startIndex] > output.csv
function mergetest(args:string[])
{
    //var timeout = 10000
    var startIndex = 1
    var dirs = ["../ids"]
    if(!args || args.length < 1) args = ["1"]

    var temp = parseInt(args[0])
    var pos = 0
    if(temp) {
        startIndex = temp
        pos = 1
    }

    var temp2 = args.slice(pos)
    if(temp2 && temp2.length > 0) dirs = temp2

    var totalTime = 0
    var avgTime = 0
    var numFail = 0

    var slow = [
50965,
15053,
15055,
15078,
15077,
9812,
9843,
30401,
49589,
5672,
2641
    ];

    var assoc = [
["iusha", "hleu"],
["xomyb", "emjs"],
["tukg", "jjgja"],
["ilhmihli", "psbbbbwr"],
["ezmtmnzs", "ujjk"],
["slsrqxzd", "iqtxvxwy"],
["lyzhwowl", "xjaza"],
["skhl", "iggha"],
["upcmgyef", "mzlhzzcl"],
["fgcn", "bmlw"],
["djlca", "yrmx"],
["kbrwwnri", "wwjtnynr"],
["ykvv", "kfllbuxi"],
["zacq", "qcme"],
["ayfja", "tvim"],
["bdfhqjve", "uajggmbz"],
["qewhvmsc", "srewiqhg"],
    ];

    /*var unseenMap = {}
    unseen.forEach(x => {
        unseenMap[x] = true
    })

    var badMap = {}
    bad.forEach(x => {
        badMap[x] = true
    })

    var counts = {}
    test.forEach(x => {
        var count = counts[x]
        if(!count) count = 0
        counts[x] = count+1
    })

    var unseen = {}
    for(var i = 1; i <= 105076; i++) {
        if(!counts[i]) unseen[i] = true
    }

    console.log("var unseen = [")
    Object.keys(unseen).forEach(x => {
        if(unseen[x]) console.log(""+x+",")
    })
    console.log("]\n")

    console.log("var dups = [")
    Object.keys(counts).forEach(x => {
        if(counts[x] > 1) console.log(""+x+",")
    })
    console.log("]")

    notfound.forEach(x => {
        TDev.ScriptCache.getScriptAsync(x).then(y => {
            console.log("script "+x+":\n"+y.substr(0,32))
        })
    })*/

    // fail = hjqb
    // slow = 17007
    dirs.forEach(dir => {
        var info2:any = JSON.parse(fs.readFileSync(dir+"/shortinfo.json", "utf-8"))
        /*info2.forEach(script => {
            var keys = Object.keys(script)
            keys.forEach(key => {
                if(key=="name" || key=="id" || key=="baseid") return
                else delete script[key]
            })
        })
        fs.writeFileSync(dir+"/shortinfo.json", JSON.stringify(info2, null, "\t"))
        return*/
        var info = info2.map(x => [x.id,x.name])
        info2 = null // free the massive JSON object
        //console.log("Testing scripts in \""+dir+"\": "+info.length)
        console.log(["success","index","total","id","name","length","time","avg","diff","failed","error"].join("\t"))
        //console.log(info[0])
        if(startIndex == -1) info.reverse();
        else if(startIndex == -3 || startIndex == -4) shuffleArray(info);
        info.reduce((prev,script,ix) => {
            var i = (startIndex == -1) ? info.length-ix-1 : ix;
            var id = script[0]
            var name = script[1]
            var previd = undefined
            var prevname = undefined
            if(prev) {
                previd = prev[0]
                prevname = prev[1]
            }
            //if(!unseenMap[i+1]) return;
            //if(!badMap[i+1] || i+1 <= 104001) return;
            if((startIndex > 0 && i+1 < startIndex)
            || (startIndex == -2 && slow.indexOf(i+1) < 0)
            || (startIndex == -3 && !prev)
            || (startIndex == -4 && !prev)) return script;
            var text = ""
            var text2 = ""
            var mergeTime = 0
            var mergedText = ""
            var success = true
            var error = ""
            var diffAmnt = 0
            var diff = false
            try {
                var getApp = (id:string) => {
                    text = fs.readFileSync(dir+"/"+id, "utf-8")
                    var app = TDev.AST.Parser.parseScript(text)
                    TDev.AST.TypeChecker.tcApp(app)
                    new TDev.AST.InitIdVisitor(false).dispatch(app)
                    return app;
                };
                var app = getApp(id);
                var app2 = undefined;
                if(startIndex == -3 || startIndex == -4) app2 = getApp(previd);

                var start = new Date().getTime()
                var merged = undefined
                if(startIndex == -3) {
                    merged = <TDev.AST.App>TDev.AST.Merge.merge3(app2,app,app2);
                } else if(startIndex == -4) {
                    merged = <TDev.AST.App>TDev.AST.Merge.merge3(app2,app2,app);
                } else {
                    merged = <TDev.AST.App>TDev.AST.Merge.merge3(app,app,app);
                }
                var end = new Date().getTime()

                mergeTime = end-start
                totalTime += mergeTime
                avgTime = totalTime/(i+1)

                TDev.AST.TypeChecker.tcApp(merged)
                mergedText = merged.serialize()

                var str1 = app.serialize().replace(/\s*/g,"")
                var str2 = merged.serialize().replace(/\s*/g,"")
                diff = (str1 != str2)
                diffAmnt = str1.length - str2.length
                if(diff) numFail++ // TODO XXX - do we want this?
            } catch(err) {
                if(err.message != TDev.AST.Merge.badAstMsg) diff = true
                error = ""+err
                success = false
                numFail++
            }

            if(true || diff) { // TODO XXX - get rid of
                /*var b = false
                merged.things.forEach((x,i) => {if(merged.things[i].serialize().length != app.things[i].serialize().length) {b = true; console.log(" > "+i)}})
                if(!b) {
                    app.things = []
                    merged.things = []
                    if(app.serialize().length != merged.serialize().length) console.log(">> ")
                }*/
                console.log([success,(i+1),info.length,id].concat((startIndex == -3 || startIndex == -4) ? [previd] : []).concat([name,text.length,mergeTime,avgTime,"("+diffAmnt+")",numFail,error]).join("\t"))
            } else if((i+1)%100 == 0) {
                console.log(">"+(i+1))
            }

            TDev.AST.reset();
            global.gc();

            return script;
        }, undefined)
    })
}

function td2tsOpts() {
    var f = fs.readFileSync("c:/dev/temp/apiinfo.json", "utf8")
    return {
        text: "",
        useExtensions: true,
        apiInfo: JSON.parse(f)
    }
}

function tsall(files:string[])
{
    var used = {}
    var opts = td2tsOpts()
    fs.readdirSync("dls").forEach(fn => {
        console.log(fn)
        var t = fs.readFileSync("dls/" + fn, "utf8")
        opts.text = t
        var r = TDev.AST.td2ts(opts)
        var tt = r.text.replace(/".*?"/g, "STR").replace(/[^a-zA-Z]/g, "")
        //if (used[tt]) return;
        used[tt] = 1

        fs.writeFileSync("tss/" + fn + ".ts", r.text)
        // fs.writeFileSync("apis.json", JSON.stringify(r.apis, null, 2))
        //console.log("out.ts and apis.json written")
    })
}

function ts(files:string[])
{
    var t = fs.readFileSync(files[0], "utf8")
    var opts = td2tsOpts()
    opts.text = t
    var r = TDev.AST.td2ts(opts)
    fs.writeFileSync("out.ts", r.text)
    // fs.writeFileSync("apis.json", JSON.stringify(r.apis, null, 2))
}

function mddocs(files:string[])
{
    var info = files.shift()
    TDev.AST.MdDocs.preexistingArtIds = JSON.parse(fs.readFileSync(info, "utf8"))

    files.forEach(f => {
        var t = fs.readFileSync(f, "utf8")
        TDev.AST.reset();
        TDev.AST.loadScriptAsync((s) => TDev.Promise.as(s == "" ? t : null));
        var md = TDev.AST.MdDocs.toMD(TDev.Script)
        var mdF = f.replace(/\.td$/, "").replace(/$/, ".md").replace(/src\//, "md/")
        fs.writeFileSync(mdF, md)
        // console.log("written", mdF)
    })
    fs.writeFileSync("info.json", TDev.AST.MdDocs.info())
}

function featureize(dirs:string[])
{
    libroots = JSON.parse(fs.readFileSync("libroots.json", "utf-8"))
    Object.keys(libroots).forEach(k => {
        var m = /^([^:]*):([^:]*)/.exec(libroots[k])
        if (m) {
            libroots[k] = m[1] + ":" + m[2]
        }
    })

    console.log("FEATURIZE " + dirs.join(" "))
    dirs.forEach(uu => {
        var userEntry = {
            uid: "",
            slots: [],
        }

        var existing:any = {}
        var m = /([^\/]+)$/.exec(uu)
        userEntry.uid = m[1]
        var jsonName = "feat/" + userEntry.uid + ".json"
        if (fs.existsSync(jsonName)) {
            userEntry = JSON.parse(fs.readFileSync(jsonName, "utf-8"))
            existing = {}
            userEntry.slots.forEach(s => existing[s.guid] = 1)
        }

        fs.readdirSync(uu).forEach(fn => {
            var m = /([^\/]+)\.json$/.exec(fn)
            if (!m) return
            if (existing.hasOwnProperty(m[1])) return

            //console.log("process "+ m[1])

            var data = JSON.parse(fs.readFileSync(uu + "/" + fn, "utf-8"))
            var slotEntry = {
                guid: data.guid,
                name: "",
                baseid: "",
                entries: []
            }
            userEntry.slots.push(slotEntry)
            //userEntry.uid = data.userid

            data.items.reverse()
            var features:TDev.MultiSet = {}
            if (data.items[0] && data.items[0].scriptstatus == "unpublished")
                slotEntry.baseid = data.items[0].scriptid
            slotEntry.entries = data.items.map(i => {
                TDev.AST.reset();
                TDev.AST.loadScriptAsync((s) => TDev.Promise.as(s == "" ? i.script : null));
                var nf:any = getAstInfo({})
                var diff = TDev.Util.msSubtract(nf.features, features)
                features = nf.features
                nf.features = diff
                //nf.historyid = i.historyid
                nf.time = i.time
                if (i.scriptstatus == "published") nf.pubid = i.scriptid
                if (i.scriptname) slotEntry.name = i.scriptname
                return nf
            }).filter(v => Object.keys(v.features).length > 0 || v.pubid)
        })

        fs.writeFileSync(jsonName, JSON.stringify(userEntry, null, 1))
    })
}

function scrubFiles(files:string[])
{
    files.forEach(file => {
        if (/^[a-z]*$/.test(file)) {
            var pref = "compressed/" + file
            scrubFiles(fs.readdirSync(pref).map(f => pref + "/" + f))
        } else {
            try {
                var entry = JSON.parse(fs.readFileSync(file, "utf8"))
                TDev.AST.Diff.scrub(entry.items)
                var dst = file.replace(/compressed/, "scrub")
                fs.writeFileSync(dst, JSON.stringify(entry, null, 2), "utf-8")
            } catch (e) {
                console.error("error: " + file + ": " + e.message)
            }
        }
    })
}

function compressJson()
{
    var u = JSON.parse(fs.readFileSync("users.json", "utf8")).map(e => e.id)
    permute(u)
    // u.sort()

    var threadsAvail = 4;
    var numUsers = 10;
    var startTime = Date.now()

    var cursor = 0;

    function spawnNew() {
        if (threadsAvail <= 0) return;
        if (cursor > u.length) return;

        threadsAvail--;

        var args = u.slice(cursor, cursor + numUsers);
        var c0 = cursor
        cursor += numUsers

        var proc = child_process.spawn("node", ["noderunner0", "compress"].concat(args),
            { stdio: 'pipe' })

        var logFile = "logs/" + Date.now() + "." + cursor + ".txt"
        var logStream = fs.createWriteStream(logFile)

        proc.stdout.pipe(logStream)
        proc.stderr.pipe(logStream)

        proc.on('close', (code) => {
            console.log("     at %d, %d ms/entry", c0, Math.round((Date.now() - startTime) / (c0 + numUsers)))
            if (code)
                console.log("exit code: " + code)
            logStream.end()
            threadsAvail++;
            spawnNew()
        })
    }

    fs.createReadStream("noderunner.js").pipe(fs.createWriteStream("noderunner0.js"));
    setTimeout(() => {
        while (threadsAvail > 0) spawnNew();
    }, 1000)
}

var scriptCache:TDev.StringMap<string> = {}
var scriptCacheSize = 0

function getScriptAsync(id:string)
{
    if (scriptCache.hasOwnProperty(id)) return TDev.Promise.as(scriptCache[id])

    if (!/^[a-z]+$/.test(id)) return null

    if (verbose)
        console.log("fetching script " + id)

    var p = liteStorage ? 
        TDev.Util.httpGetTextAsync(apiEndpoint + id + "/text" + accessToken + "&original=true")
        : TDev.Util.httpGetTextAsync("https://www.touchdevelop.com/api/" + encodeURIComponent(id) + "/text?original=true&ids=true")

    return p.then(text => {
            if (text) {
                scriptCacheSize += text.length
                if (scriptCacheSize > 10000000) {
                    scriptCacheSize = text.length
                    scriptCache = {}
                }
                scriptCache[id] = text
            }
            return text
        })
}

// This function exercises the ARM compile service. It randomizes the input so
// as not to hit Michał's cache that sits in-between us and the ARM compile
// service. The variable [nruns] controls the number of requests we send for
// each script.
// It also exercises the bitvm compiler (once) for each script.
function compilerTest() {
    var tdUplKey = process.env['TD_UPLOAD_KEY'] || process.env['TD_UPLOAD_LITE_KEY']
    if (!tdUplKey) {
        console.log('tests for microbit.co.uk, skipping')
        return;
    }
    if (/touchdevelop/.test(apiEndpoint) && tdUplKey) {
        var mm = /^(http.*\/)(\?access_token=.*)/.exec(tdUplKey)
        if (mm) {
            apiEndpoint = mm[1] + "api/"
            accessToken = mm[2]
            liteStorage = "yes"
        }
    }
    TDev.Cloud.config.primaryCdnUrl = "https://microbit0.blob.core.windows.net"

    console.log("COMPILER TEST");
    var tests = {
        bqutuo: {}, // pac man runaway
        htdcbb: {}, // two-player pong (reversed and fixed)
        rwadai: { skipBitVm: true }, // clock demo
        xhfhgq: {}, // bitvm test1
    };
    var nruns = 1;
    window.localStorage.setItem("access_token", accessToken.replace("?access_token=", ""));
    TDev.Cloud.config.rootUrl = apiEndpoint.replace("/api/", "");
    var theApp:TDev.AST.App;
    Object.keys(tests).forEach((pubId: string) => {
        var name;
        var displayId = pubId;
        var logMsg = (s: string) => name+" ("+displayId+"): "+s;
        TDev.Cloud.getPublicApiAsync(pubId).then((j: TDev.JsonScript) => {
            if (pubId != j.updateid)
                console.log(logMsg("found newer version: "+j.updateid));
            displayId = j.updateid;
            return TDev.Util.httpGetTextAsync(TDev.Cloud.getPublicApiUrl(j.updateid+"/text"));
        }).then((text: string) => {
            return TDev.Embedded.parseScript(text);
        }).then((a: TDev.AST.App) => {
            name = a.getName();
            theApp = a;
            console.log(logMsg("parsing → touchdevelop ✓"));
            if (tests[pubId].skipBitVm) {
                console.log(logMsg("skipping bitvm"));
                return TDev.Promise.as();
            } else {
                console.log(logMsg("touchdevelop → hex (bitvm) ✓"));
                return TDev.Hex.cliCompileAsync(theApp);
            }
        }).then((cpp: string) => {
            console.log(logMsg("touchdevelop → cpp ✓"));

            var fakeGuid = "d9b98ebe-3bf9-4f73-9452-459e59f2dbf5";
            var r = [];
            for (var i = 0; i < nruns; ++i)
                r.push(TDev.Cloud.postUserInstalledCompileAsync(fakeGuid, cpp+"\n// "+Math.random(), { name: name }));
            return TDev.Promise.join(r);
        }).then(jsons => {
            jsons.forEach(json => {
                if (!json)
                    console.log(logMsg("no response from ARM cloud"));
                if (!json.success) {
                    console.log(TDev.Embedded.makeOutMbedErrorMsg(json));
                    console.log(logMsg("compilation failure"));
                    process.exit(1);
                }
            });
            console.log(logMsg("cpp → hex (arm cloud) ×"+nruns+" ✓"));
        }, (e) => {
            console.log(logMsg("compilation failure"));
            console.log(e.stack);
            process.exit(1);
        }).done();
    });
}

export function globalInit()
{
    TDev.Browser.isNodeJS = true;
    TDev.Browser.isHeadless = true;
    TDev.Browser.loadingDone = true;
    TDev.Browser.detect();

    TDev.RT.Node.setup();
    TDev.Util.logSz = 300;

    TDev.Promise.errorHandler = reportBug;

    TDev.Ticker.fillEditorInfoBugReport = (b:TDev.BugReport) => {
        try {
            b.currentUrl = "runner";
            b.scriptId = "";
            b.userAgent = "node runner";
            b.resolution = "";
            b.jsUrl = jsPath;
        } catch (e) {
            debugger;
        }
    };

    // process.on('uncaughtException', (err) => reportBug("uncaughtException", err));

    var mm = /\/(\d\d\d\d\d\d\d\d\d+-[a-f0-9\.]+-[a-z0-9]+)\//.exec(jsPath)
    relId = mm ? mm[1] : "local"

    if (process.env.TD_RELEASE_ID)
        relId = process.env.TD_RELEASE_ID

    var file = process.argv[2];
    var serverPort = 0;

    if (!file) {
        //console.log("usage: node noderunner.js file.td");
        //console.log("usage: node noderunner.js 8080 [silent|slave]");
        //console.log("usage: node noderunner.js (and restconfig.js exists)");
        //return;
        serverPort = process.env.PORT || 1337;
    }

    if (/^\d+$/.test(file)) {
        serverPort = parseInt(file);
        if (process.argv[3] == 'silent') {
            verbose = false;
        }

        if (process.argv[3] == 'slave') {
            verbose = false;
            slave = true;
            var lastReqId = 0;
            setInterval(() => {
                if (lastReqId == reqId) {
                    process.exit(0);
                }
                lastReqId = reqId;
            }, 1000*600);
        }
    }

    //TDev.Cloud.lite = !!liteStorage;

    TDev.AST.Lexer.init();
    TDev.HelpTopic.getScriptAsync = getScriptAsync;
    TDev.api.initFrom();

    authKey = process.env['TDC_AUTH_KEY'] || ""

    // make sure we show *something* for crashes
    TDev.RT.App.startLogger();

    if (serverPort) {
        startServer(serverPort)
    } else if (process.argv[2] == "compress") {
        if (process.argv[3] == "all")
            compressJson()
        else
            compressDirs(process.argv.slice(3))
    } else if (process.argv[2] == "scrub") {
        scrubFiles(process.argv.slice(3))
    } else if (process.argv[2] == "feat") {
        featureize(process.argv.slice(3))
    } else if (process.argv[2] == "astinfo") {
        addAstInfo(process.argv.slice(3))
    } else if (process.argv[2] == "addids") {
        addIds(process.argv.slice(3))
    } else if (process.argv[2] == "mergetest") {
        mergetest(process.argv.slice(3))
    } else if (process.argv[2] == "compilertest") {
        compilerTest();
    } else if (process.argv[2] == "ts") {
        ts(process.argv.slice(3))
    } else if (process.argv[2] == "tsall") {
        tsall(process.argv.slice(3))
    } else if (process.argv[2] == "mddocs") {
        mddocs(process.argv.slice(3))
    } else {
        console.log("invalid usage")
    }
}

globalInit();
