/// <reference path='../typings/node/node.d.ts' />

'use strict';

import * as td from './td';
import * as assert from 'assert';

type JsonObject = td.JsonObject;
type JsonBuilder = td.JsonBuilder;

var clone = td.clone;

var logger: td.AppLogger;
var nodemailer:any;

export interface ISendOptions {
    html?: string;
    bcc?: string;
    cc?: string;
    replyto?: string;
}


async function exampleAsync() : Promise<void>
{
    // This library provides a simple access to sending email directly from the current machine. This may or may not work, and it may be considered spam.
    // {imports}
    // ### configuration
    // Call the `init` action in your web service `_init` action.
    await initAsync();
    // ### simple usage
    // Use the ``send`` action to send a simple text email.
    await sendAsync("to@example.com", "from@example.com", "Hi!", "This is my first email through SendGrid.");
}


/**
 * Initializes the nodemailer library with the direct transport.
 */
export async function initAsync() : Promise<void>
{
    logger = td.createLogger("nodemailer");
    nodemailer = require('nodemailer').createTransport();
}

/**
 * Sends a text email.
 */
export async function sendAsync(to: string, from: string, subject: string, text: string, options_: ISendOptions = {}) : Promise<void>
{
    assert(!!to, "missing to");
    assert(!!from, "missing from");
    assert(!!subject, "missing subject");
    logger.debug("sending email");

    await new Promise(resume => {
        var opts = options_
        var payload:any = {
          to : to,
          from : from,
          subject: subject,
          text: text,
          html: opts.html,
          replyTo: opts.replyto
        };
        if (opts.bcc) payload.bcc = opts.bcc.split(';');
        if (opts.cc) payload.cc = opts.cc.split(';');
        nodemailer.sendMail(payload, (err, json) => {
          if (err) throw new Error("nodemailer error: " + err)     
          resume();
        });
    });
}


