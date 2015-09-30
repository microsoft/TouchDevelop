/// <reference path='../typings/node/node.d.ts' />

'use strict';

import * as td from './td';
import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as child_process from 'child_process';

var isConsole = false;

export interface DeploymentFile {
    path: string;
    // either url or content is present
    url?: string;
    content?: string;
    sourceName?: string;
    kind?: string;
    isUnused?: boolean;
}

export interface DeploymentInstructions {
    meta: any;
    files: DeploymentFile[];
    error?: string;
}


function buildInstructions(testopt = {}) {
    if (!testopt) throw new Error("bad compiler settings");
    
    var instr: DeploymentInstructions = {
        meta: {},
        files: []
    }

    for (let fn of fs.readdirSync(__dirname)) {
        if (!/\.js$/.test(fn)) continue;
        var text = fs.readFileSync(path.join(__dirname, fn), "utf8");
        instr.files.push({
            path: "script/" + fn,
            content: text
        })
    }
    
        instr.files.push({
            path: "package.json",
            content: fs.readFileSync(path.join(__dirname, "..", "package.json"), "utf8")
        })
        
    instr.files.push({
        path: "script/compiled.js",
        content: "require(\"./tdlite.js\");\n"
    })
    
    return instr;
}

var target:string;

async function deployAsync()
{
    var ins = buildInstructions()
    console.log("upload ", JSON.stringify(ins).length + " chars")
    let r = td.createRequest(target + "/deploy")
    r.setMethod("post");
    r.setContentAsJson(ins);
    var resp = await r.sendAsync();
    console.log(resp.statusCode());
}

function showLogs(msgs: td.LogMessage[], skipcat = "") {
    function levelToClass(level: number) {
        if (level <= td.App.ERROR) return "error";
        else if (level <= td.App.WARNING) return "warning";
        else if (level <= td.App.INFO) return "info";
        else if (level <= td.App.DEBUG) return "debug";
        else return "noisy";
    }

    var res = [];
    msgs.filter(msg => !!msg).forEach((lvl, index) => {
        if (isConsole && index >= 30) {
            if (index == 30) console.log("... use less to see more ...")
            return
        }
        
        var msg = lvl.msg;
        var txt = msg

        if (lvl.meta && lvl.meta.contextId) {
            txt += " [" + lvl.meta.contextId + ": " + Math.round(lvl.meta.contextDuration) + "ms]"
        }

        txt = (lvl.elapsed ? (lvl.elapsed + '> ') : '')
            + (lvl.category && lvl.category != skipcat ? (lvl.category + ': ') : '')
            + txt;

        console.log(txt);
    });
}

async function shellAsync()
{
    var resp = await td.createRequest(target + "/combinedlogs").sendAsync();
    showLogs(resp.contentAsJson()["logs"], "shell");    
}

async function statsAsync()
{
    var resp = await td.createRequest(target + "/stats").sendAsync();
    console.log(resp.contentAsJson());    
}

async function logAsync()
{
    var resp = await td.createRequest(target + "/info/applog").sendAsync();
    for (let w of resp.contentAsJson()["workers"]) {
        console.log("---------", w.worker)
        if (w.body.applog)
            showLogs(w.body.applog);    
    } 
}

function main() {
    if ((<any>process.stdout).isTTY) {
        isConsole = true;
    }
    target = process.env["TD_UPLOAD_TARGET"];
    if (!target) {
        console.log("need TD_UPLOAD_TARGET=https://somewhere.com/-tdevmgmt-/seCreTc0deheRE")
        return
    }

    var cmds: any = {
        "deploy    deploy JS files": deployAsync,
        "shell     see shell logs": shellAsync,
        "log       see application logs": logAsync,
        "stats     see various shell stats": statsAsync,
    }

    for (let n of Object.keys(cmds)) {
        let k = n.replace(/\s.*/, "");
        if (process.argv[2] == k) {
            cmds[n](process.argv.slice(3))
            return
        }
    }


    console.log("usage: node remote.js command")
    console.log("Commands:")
    for (let n of Object.keys(cmds)) {
        console.log(n);
    }
}

main();

