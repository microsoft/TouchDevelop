/// <reference path='../typings/node/node.d.ts' />

'use strict';

import * as td from 'td';
import * as assert from 'assert';

var jwt_simple = require('jwt-simple');

type JsonObject = td.JsonObject;
type JsonBuilder = td.JsonBuilder;


/**
 * {hints:algorithm:RS256,HS256,HS384,HS512}
 * Create JWT token using given signing/HMAC key.
 */
export function encode(payload: JsonObject, secret: string, algorithm: string) : string
{
    return jwt_simple.encode(payload, secret, algorithm)
}

/**
 * Decode a JWT token using specified public key (or HMAC secret)
 */
export function decode(jwt: string, pubKey: string) : JsonObject
{
    return jwt_simple.decode(jwt, pubKey)
}

/**
 * Decode a JWT token without verifying anything
 */
export function decodeNoVerify(jwt: string) : JsonObject
{
    return jwt_simple.decode(jwt, "", true)
}


