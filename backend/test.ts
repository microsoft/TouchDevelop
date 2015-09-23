// <reference path='typings/bluebird/bluebird.d.ts' />
/// <reference path='typings/node/node.d.ts' />
/// <reference path='node_modules/reflect-metadata/reflect-metadata.d.ts' />

// import * as Promise from 'bluebird' 
// import * as fs from 'fs'

'use strict';

// import * as fs from 'fs';
var fs = require("mz/fs")

require('reflect-metadata');

function logType(target : any, key : string) {
      var t = (<any>Reflect).getMetadata("design:type", target, key);
      console.log(target)
      console.log(key)
      console.log(t)
      console.log(`${key} type: ${t.name}`);
      fs.existsSync("foo");
}

export class Demo{ 
      @logType // apply property decorator
      public attr1 : string;
}


async function startup() {
    var metabasePath = "foo"
 
    if (!(await fs.exists(metabasePath))) {
        await fs.mkdir(metabasePath);
    }
}

startup();
