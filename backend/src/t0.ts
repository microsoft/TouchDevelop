/// <reference path='../typings/node/node.d.ts' />

'use strict';

import * as td from './td';

type JsonObject = td.JsonObject;
type JsonBuilder = td.JsonBuilder;

var json = td.json;
var clone = td.clone;

export class ArtEntry
    extends td.JsonRecord
{
    @json public id: number = 0;
    @json public name: string = "";
    @json public description: string = "";

    static createFromJson(o:JsonObject) { let r = new ArtEntry(); r.fromJson(o); return r; }
}

export interface IArtEntry {
    id?: number;
    name?: string;
    description?: string;
}

function main()
{
    var a = ArtEntry.createFromJson({ id: 12, name: "foo" })
    console.log(a.toJson())
}

main()
