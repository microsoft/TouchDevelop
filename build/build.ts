///<reference path='../../External/TypeScript/node.d.ts'/>
///<reference path='../rt/promise.ts'/>


module TDev {

/*
import fs = module('fs');
import util = module('util');
import path = module('path');
import crypto = module('crypto');
import child_process = module('child_process');
*/

var fs = require('fs');
var util = require('util');
var path = require('path');
var crypto = require('crypto');
var child_process = require('child_process');

var pathRoot = undefined;
var verbose = true;

function toPromise(nodeF:(f:any) => void)
{
    return new Promise((onSuccess: (v: any) => any, onError: (v: any) => any, onProgress: (v: any) => any) => {
        nodeF((err, data) => {
            if (err) onError(err);
            else onSuccess(data);
        })
    });
}

function readFileAsync(filename:string)
{
    return toPromise((f) => fs.readFile(filename, "utf8", f))
}

function writeFileAsync(filename:string, content:string)
{
    return toPromise((f) => fs.writeFile(filename, content, "utf8", f))
}

function sha1(s:string)
{
    var shasum = crypto.createHash('sha1');
    shasum.update(s);
    return shasum.digest('hex');
}

function unlink(fn:string) {
    if (fs.existsSync(fn))
        fs.unlinkSync(fn);
}


class Source
{
    static srcByName:any = {}
    static get(name:string)
    {
        var lname = name.toLowerCase()
        var r:Source = Source.srcByName[lname]
        if (!r)
            Source.srcByName[lname] = r = new Source(name)
        return r;
    }

    public deps : Source[];
    public prjName : string;
    public exists:boolean;
    public hash:string;
    public prjDep:Source;
    public prj:Project;

    constructor(public path:string)
    {
        this.exists = fs.existsSync(path)
    }

    findDepsAsync() : Promise
    {
        var r = Promise.as();

        if (this.deps) return r;
        this.deps = []

        var setDep = (name:string) => {
            if (!this.prjDep && fs.existsSync(name)) {
                this.prjDep = Source.get(name);
                r = r.then(() => this.prjDep.findDepsAsync());
            }
        }

        this.prjName = this.path.replace(/\.d\.ts$/, "")
        if (this.prjName == this.path)
            this.prjName = null;

        if (this.prjName) {
            setDep(this.prjName + ".ts");
        }

        if (!this.exists) return r;


        var dir = path.dirname(this.path);
        r = r
            .then(() => readFileAsync(this.path))
            .then((s:string) => {
                this.hash = sha1(s);
                var lines = s.split("\n");
                lines.forEach((l) => {
                    var r = /^[\s\uFEFF]*\/\/\/\s*[<(]\s*reference\s*path=['"]([^'"]*)['"]/.exec(l);
                    if (r && r[1]) {
                        var p = path.resolve(dir, r[1]);
                        this.deps.push(Source.get(p))
                    }
                });
                return Promise.join(this.deps.map((s) => s.findDepsAsync()));
            });

        return r
        // .then(() => { console.log(this.path + " : " + this.deps.map(p => p.path).join(" ")) })
    }
}

function now() { return new Date().getTime() }
function strcmp(a:string, b:string) {
    if (a < b) return -1;
    else if (a > b) return 1;
    else return 0;
}

class Project {
    public prjDeps:Project[];
    public deps:Source[];
    public mainFile:Source;
    public name:string;
    public shortName:string;
    public isExternal = false;
    public noConcat = false;
    public prelude:string;
    public compileAsModule:boolean;
    public runIt:boolean;
    public concatTrg:string;
    private id:number;

    static maxCpus = 3;
    static curCpus = 0;
    static waitForCpu()
    {
        if (Project.curCpus < Project.maxCpus) {
            Project.curCpus++;
            return Promise.as();
        } else {
            return new Promise((onSuccess: (v: any) => any, onError: (v: any) => any, onProgress: (v: any) => any) => {
                function check() {
                    if (Project.curCpus < Project.maxCpus) {
                        Project.curCpus++;
                        onSuccess(undefined);
                    } else {
                        setTimeout(check, 50);
                    }
                }
                check();
            });
        }

    }

    building:PromiseInv;

    private getOuputName()
    {
        if (this.isExternal)
            return path.resolve(path.dirname(this.name), "../" + path.basename(this.name + ".js"));
        else
            return this.name + ".js";
    }

    private mkBuildPromise()
    {
        return new Promise((onSuccess: (v: any) => any, onError: (v: any) => any, onProgress: (v: any) => any) => {
            console.log("[build] " + this.shortName + " " + path.dirname(this.name));
            var start = now();
            var args = [pathRoot + "/External/TypeScript/tsc.js", 
                        "--target", "ES5",
                        "--module", "commonjs",
                        this.compileAsModule ? "--outDir" : "--out", this.compileAsModule ? path.dirname(this.name) : this.name + ".js",
                        "--declaration", 
                        this.mainFile.path]
            //console.log(args)
            var p = child_process.spawn("node", args, { stdio: "inherit" });
            p.on("exit", (code) => {
                Project.curCpus--;
                if (this.isExternal) {
                    fs.renameSync(this.name + ".js", this.getOuputName());
                }
                if (code === 0) {
                    readFileAsync(this.name + ".d.ts").done((filecontent) => {
                        this.target.hash = sha1(filecontent);
                        var t = now() - start;
                        console.log("[done] " + this.shortName + " [" + t + "ms]");
                        onSuccess(code);
                    })
                } else {
                    console.log("[ERROR] " + this.shortName);
                    onError(undefined);
                }
            });
        });
    }
   
    buildAsync():Promise
    {
        var mkPromise = () =>
            Promise.join(this.prjDeps.map((p) => p.buildAsync()))
            .then(() => {
                    // console.log(this.name + ": " + this.deps.map((s) => s.path).join("\n    "))
                    var depsFile = this.name + '.deps';
                    var existingDeps = "";
                    if (fs.existsSync(depsFile)) {
                        existingDeps = fs.readFileSync(depsFile, "utf8");
                    }

                    var newDeps = sha1(this.deps.map((s) => s.hash).join("\n"));
                    fs.writeFileSync(depsFile + ".txt", this.deps.map((s) => s.path + ": " + s.hash).join("\n"), "utf8");
                    if (newDeps == existingDeps) {
                        console.log("[up-to-date] " + this.shortName)
                        return Promise.as();
                    } else {
                        unlink(depsFile);
                        return Project.waitForCpu()
                            .then(() => this.mkBuildPromise())
                            .then((code) => {
                                if (code === 0) {
                                    fs.writeFileSync(depsFile, newDeps, "utf8");
                                }
                            });
                    }
            })
            .then(() => this.concatTrg ? this.concatAsync(this.concatTrg) : Promise.as())
            .then(() => {
                if (this.runIt) {
                    console.log("[run] " + this.concatTrg)
                    require(this.concatTrg)
                }
            })
            .done(v => this.building.success(v), e => this.building.error(e))

        if (!this.building) {
            this.building = new PromiseInv()
            setTimeout(mkPromise, 1)
        }
        return this.building;
    }

    private isClean = false;

    cleanAsync():Promise
    {
        if (this.isClean) return Promise.as();
        this.isClean = true;
        console.log("[clean] " + this.shortName);
        return Promise.join(this.prjDeps.map((p) => p.cleanAsync())).then(() => {
            unlink(this.name + ".deps");
            unlink(this.name + ".deps.txt");
            unlink(this.name + ".d.ts");
            unlink(this.name + ".js");
            unlink(this.getOuputName())
        });
    }

    concatAsync(trg:string):Promise
    {
        // the bang in /*! */ makes the comment stay around after minification
        var total = "\uFEFF'use strict';\r\n/*! Copyright (C) Microsoft Corporation.  All rights reserved. */\r\n";
        if (this.prelude) {
            total += fs.readFileSync(this.prelude, "utf8").replace(/^\uFEFF/, "");
        }
        var visited = {};

        if (verbose) console.log("[collecting] " + trg);
        var go = (p:Project) => {
            if (visited[p.name]) return;
            visited[p.name] = 1;
            if ((p != this && p.noConcat) || ((p.isExternal || /jsonapi/.test(p.name)) && !/noderunner/.test(trg))) {
                if (verbose) console.log("   skipping " + p.name + ".js (external)");
                return;
            }
            p.prjDeps.forEach(go);

            if (p == this && /(noderunner|editor)/.test(this.name)) {
                if (verbose) console.log("   + build/pkgshell.js");
                total += fs.readFileSync(win8("build/pkgshell.js"), "utf8").replace(/^\uFEFF/, "");
            }

            total += fs.readFileSync(p.getOuputName(), "utf8").replace(/^\uFEFF/, "");
            if (verbose) console.log("   + " + p.name + ".js");
            if (/ast.refs$/.test(p.name)) {
                if (verbose) console.log("   + build/api.js");
                total += fs.readFileSync(win8("build/api.js"), "utf8").replace(/^\uFEFF/, "");

                if (verbose) console.log("   + build/langs.js");
                total += fs.readFileSync(win8("build/langs.js"), "utf8").replace(/^\uFEFF/, "");
            }
        }
        go(this);

        console.log("[concat] " + trg + " " + total.length + " chars");

        return writeFileAsync(trg, total);
    }
    static currId = 0;
    static get(s:Source)
    {
        if (s.prj) return s.prj;
        else return new Project(s);
    }

    constructor(public target:Source)
    {
        target.prj = this;
        this.name = target.prjName;
        this.id = Project.currId++;
        this.isExternal = /browser$/.test(this.name);
        this.noConcat = /shell.[^\/\\]+$/.test(this.name)

        this.deps = [];
        var visited = {}
        var visit = (s:Source) => {
            if (visited[s.path]) return;
            visited[s.path] = true;
            this.deps.push(s);
            s.deps.forEach(visit)
        }
        visit(this.target.prjDep)

        this.mainFile = this.target.prjDep;
        this.prjDeps = this.deps.filter((s) => s != this.mainFile && !!s.prjDep).map(Project.get);

        this.shortName = this.mainFile.path.slice(pathRoot.length + 6);
        this.deps.push(this.target.prjDep)
        this.deps.sort((a, b) => strcmp(a.path, b.path))
        // console.log(this.name + ": " + this.prjDeps.map((p) => p.name).join(", "));
    }
}

Promise.errorHandler = (ctx, err) => {
    console.log(err);
    console.log("FATAL ERROR");
    process.exit(1);
};

var cmd = process.argv[2]
interface Target { decls:string; target:string; runIt?:boolean; prelude?:string; compileAsModule?:boolean; }

var start = now();
var targets = <Target[]>[
    { decls: "genStubs/genmeta.d.ts", target: "genStubs/gm.js", prelude: "genStubs/nodefix.js", compileAsModule: true, runIt: true },
    { decls: "editor/refs.d.ts", target: "main.js" },
    { decls: "cssPrefixes/addCssPrefixes.d.ts", target: "cssPrefixes/addPref.js", runIt: true },
    { decls: "runner/refs.d.ts", target: "runtime.js" },
    { decls: "mc/refs.d.ts", target: "mcrunner.js" },
    { decls: "officemix/refs.d.ts", target: "officemix.js" },
    { decls: "noderunner/runner.d.ts", target: "noderunner.js", prelude: "genStubs/nodefix.js", compileAsModule: true },
    { decls: "nodeclient/client.d.ts", target: "nodeclient.js", prelude: "genStubs/nodefix.js", compileAsModule: true },
    { decls: "shell/shell.d.ts", target: "shell/server.js", prelude: "genStubs/nodefix.js", compileAsModule: true },
    { decls: "shell/package.d.ts", target: "shell/runpackage.js", prelude: "genStubs/nodefix.js", compileAsModule: true, runIt: true },
]

pathRoot = path.resolve("../..", ".");

console.log("[start] " + pathRoot);

function win8(s:string) { return path.resolve(pathRoot + "/win8", s) }

function buildPrj(t:Target) {
    var prj = Project.get(Source.get(win8(t.decls)))
    if (t.prelude)
        prj.prelude = win8(t.prelude);
    prj.compileAsModule = t.compileAsModule;
    prj.runIt = t.runIt
    prj.concatTrg = win8(t.target)
    if (cmd == "clean")
        return prj.cleanAsync().then(() => {
            unlink(prj.concatTrg);
        });
    else
        return prj.buildAsync()
}

Promise.join(targets.map((t) => Source.get(win8(t.decls)).findDepsAsync()))
.then(() => buildPrj(targets[0]))
.then(() => Promise.join(targets.slice(1).map(buildPrj)))
.done(() => {
    if (cmd == "clean") {
        unlink("build.js");
        unlink("api.js");
        unlink("pkgshell.js");
    }
    console.log("[all-done] " + (now() - start) + "ms");
});



}
