/// <reference path='../typings/node/node.d.ts' />

'use strict';

import * as td from 'td';
import * as assert from 'assert';

type JsonObject = td.JsonObject;
type JsonBuilder = td.JsonBuilder;

var accessToken: string;
var clientId: string = "";
var clientSecret: string = "";
var logger: td.AppLogger;


export interface ITokenReq {
    grant_type?: string;
    client_id?: string;
    client_secret?: string;
    scope?: string;
}


async function createRequestAsync(url: string, method: string, authorize: boolean) : Promise<td.WebRequest>
{
    let request:td.WebRequest;
    request = td.createRequest(url);
    if (authorize) {
        await authenticateAsync();
        setAuthorization(request);
    }
    request.setMethod(method);
    return request;
}

function setAuthorization(request:td.WebRequest) : void
{
    request.setHeader("Authorization", "Bearer " + accessToken);
}

export async function authenticateAsync() : Promise<boolean>
{
    let authenticated: boolean;
    if (accessToken == null) {
        logger.debug("refreshing token...");
        let url = "https://datamarket.accesscontrol.windows.net/v2/OAuth2-13";
        let tokenReq:ITokenReq = {};
        tokenReq.grant_type = "client_credentials";
        tokenReq.scope = "http://api.microsofttranslator.com";
        tokenReq.client_secret = clientSecret;
        tokenReq.client_id = clientId;
        let request = await createRequestAsync(url, "POST", false);
        let content = toQueryString(tokenReq);
        request.setContent(content);
        request.setHeader("Content-type", "application/x-www-form-urlencoded");
        let response = await request.sendAsync();
        if (response.statusCode() == 200) {
            let js = response.contentAsJson();
            accessToken = js["access_token"] || null;
            if (accessToken != null) {
            }
            else {
                logger.error("failed to parse access token");
            }
        }
        else {
            logger.error("failed getting access token: " + response.statusCode());
            logger.debug(response.content());
        }
    }
    authenticated = accessToken != null;
    return authenticated;
}

function toQueryString(params: JsonObject) : string
{
    let query: string;
    query = "";
    for (let s2 of Object.keys(params)) {
        if (query != "") {
            query = query + "&";
        }
        query = query + encodeURIComponent(s2) + "=" + encodeURIComponent(params[s2]);
    }
    return query;
}

async function sendRequestAsync(request:td.WebRequest) : Promise<td.WebResponse>
{
    let response:td.WebResponse;
    response = await request.sendAsync();
    logger.debug("status: " + response.statusCode());
    if (response.statusCode() == 400) {
        logger.debug("token expired");
        accessToken = null;
        let authenticated = await authenticateAsync();
        if (authenticated) {
            setAuthorization(request);
            response = await request.sendAsync();
            logger.debug("status (refresh): " + response.statusCode());
        }
    }
    return response;
}

async function testAuthenticateAsync() : Promise<void>
{
    accessToken = null;
    await initAsync("TouchDevelopTranslator", "<need>");
    await authenticateAsync();
    assert(!!accessToken, "");
}

/**
 * Translates the given text to the given language
 */
export async function translateAsync(text: string, from: string, to: string, html: boolean) : Promise<string>
{
    let translated: string;
    checkCredentials();
    assert(to != "", "missing target language");
    let type = "text/plain";
    if (html) {
        type = "text/html";
    }
    let url = "http://api.microsofttranslator.com/v2/Http.svc/Translate?text=" + encodeURIComponent(text) + "&to=" + to + "&contentType=" + type;
    if (from != "") {
        url = url + "&from=" + from;
    }
    let request = await createRequestAsync(url, "get", true);
    let response = await sendRequestAsync(request);
    // <string>....
    if (response.statusCode() == 200) {
        let xml = response.content();
        xml = xml.replace(/<[^>]*>/g, "");
        xml = td.replaceAll(xml, "&lt;", "<");
        xml = td.replaceAll(xml, "&gt;", ">");
        xml = td.replaceAll(xml, "&amp;", "&");
        translated = xml;
    }
    else {
        translated = null;
    }
    return translated;
}

/**
 * Initializes the credentials needed to call the Microsoft Translator APIs. If not provided, the ``MICROSOFT_TRANSLATOR_CLIENT_ID`` and ``MICROSOFT_TRANSLATOR_CLIENT_SECRET`` server setting are used.
 */
export async function initAsync(clientId: string, clientSecret: string) : Promise<void>
{
    if (clientId == "") {
        clientId = td.serverSetting("MICROSOFT_TRANSLATOR_CLIENT_ID", false);
    }
    if (clientSecret == "") {
        clientSecret = td.serverSetting("MICROSOFT_TRANSLATOR_CLIENT_SECRET", false);
    }
    clientId = clientId;
    clientSecret = clientSecret;
    logger = td.createLogger("translator");
    logger.debug("client id: " + clientId);
}

function checkCredentials() : void
{
    assert(clientId != "" && clientSecret != "", "missing credentials, did you call `init`?");
}

async function exampleAsync() : Promise<void>
{
    // This library allows to send translation requests to the Microsoft Translator services.
    // ## configuration
    // The ``init`` action takes the ``MICROSOFT_TRANSLATOR_CLIENT_ID`` and ``MICROSOFT_TRANSLATOR_CLIENT_SECRET`` server setting from the environment.
    await initAsync("", "");
    // ### translations
    // To translate a string, provide the input language (leave empty to let translator guess), the target language and whether the text is html.
    let translated = await translateAsync("hello", "en", "fr", false);
}


