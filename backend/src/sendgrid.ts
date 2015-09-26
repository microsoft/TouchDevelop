/// <reference path='../typings/node/node.d.ts' />

'use strict';

import * as td from 'td';
import * as assert from 'assert';

type JsonObject = td.JsonObject;
type JsonBuilder = td.JsonBuilder;

var clone = td.clone;
var logger: td.AppLogger;
var sendgrid:any;


export interface ISendOptions {
    html?: string;
    bcc?: string;
    cc?: string;
    replyto?: string;
}


async function exampleAsync() : Promise<void>
{
    // This library provides a simple access to [SendGrid](http://sendgrid.com/home).
    // {imports}
    // ### configuration
    // Call the `init` action in your web service `_init` action. You will need to configure the ``SENDGRID_API_USER`` and ``SENDGRID_API_KEY`` environment variables to point to your SendGrid username and api key.
    await initAsync("", "");
    // ### simple usage
    // Use the ``send`` action to send a simple text email.
    await sendAsync("to@example.com", "from@example.com", "Hi!", "This is my first email through SendGrid.");
}

/**
 * Initializes the SendGrid library. If empty, reads the api user and api key from the ``SENDGRID_API_USER`` and ``SENDGRID_API_KEY`` server settings.
 */
export async function initAsync(apiUser: string = "", apiKey: string = "") : Promise<void>
{
    if (apiUser == "") {
        apiUser = td.serverSetting("SENDGRID_API_USER", false);
    }
    if (apiKey == "") {
        apiKey = td.serverSetting("SENDGRID_API_KEY", false);
    }
    logger = td.createLogger("sendgrid");
    sendgrid  = require('sendgrid')(apiUser, apiKey);
}

/**
 * Sends a text email.
 */
export async function sendAsync(to: string, from: string, subject: string, text: string, options: ISendOptions = {}) : Promise<void>
{
    assert(to != "", "missing to");
    assert(from != "", "missing from");
    assert(subject != "", "missing subject");
    logger.debug("sending email");
    await new Promise(resume => {
        var opts = options
        var payload:any = {
          to : to,
          from : from,
          subject: subject,
          text: text,
          html: opts.html,
          replyto: opts.replyto
        };
        if (opts.bcc) payload.bcc = opts.bcc.split(';');
        if (opts.cc) payload.cc = opts.cc.split(';');
        sendgrid.send(payload, (err, json) => {
          if (err) throw new Error("sendgrid error: " + err)     
          resume();
        });
    });
}
