/// <reference path='../typings/node/node.d.ts' />

'use strict';

import * as td from './td';
import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';

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

async function deployAsync()
{
    var ins = buildInstructions()
    console.log("upload ", JSON.stringify(ins).length + " chars")
    let r = td.createRequest(process.env["TD_UPLOAD_TARGET"] + "/deploy")
    r.setMethod("post");
    r.setContentAsJson(ins);
    var resp = await r.sendAsync();
    console.log(resp.statusCode());
}

deployAsync();