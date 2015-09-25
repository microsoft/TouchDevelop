/// <reference path='../typings/node/node.d.ts' />

'use strict';

import * as td from 'td';
import * as assert from 'assert';
import * as fs from 'fs';
import * as util from 'util';
import * as zlib from 'zlib';
import * as crypto from 'crypto';

var azure_storage = require("azure-storage");

type JsonObject = td.JsonObject;
type JsonBuilder = td.JsonBuilder;

var clone = td.clone;


var logSeqNo: number = 0;
var instanceId: string = "";
var logger: td.AppLogger;


const transientErrors = [500, 501, 502, 503, 'ETIMEDOUT', 'ECONNRESET', 'EADDRINUSE', 'ESOCKETTIMEDOUT', 'ECONNREFUSED'];

export class BlobService
{
    public handle:any;
    public tdAccount:string;

    tdError(err:any, msg:string)
    {
        if (!err) return;
        
        if (transientErrors.indexOf(err.code) !== -1 || transientErrors.indexOf(err.statusCode) !== -1) {
            err.statusCode = 503; // for restify etc
            err.tdSkipReporting = true; // skip reporting
            logger.measure("503@" + this.tdAccount, 1000)
        }
    
        if (!err.tdMeta) err.tdMeta = {};
        err.tdMeta.func = msg || "";
        throw err;
    }
    
    tdError404(err:any, msg:string)
    {
      if (err && !/does not exist/.test(err + "")) this.tdError(err, msg);
    }

    /**
     * All blobs reside in a container. This method creates a new container with permission 'hidden,' 'private,' or 'public.'
     * {hints:permission:private,hidden,public}
     */
    public async createContainerIfNotExistsAsync(containerName: string, permission: string) : Promise<Container>
    {
        let blob_service = this.handle;
        let container: Container;
        log("create container");
        await new Promise(resume => {
            var opts = {}
            if (permission == "hidden" || permission == "blob")
              opts = {publicAccessLevel:'blob'}
            else if (permission == "public")
              opts = {publicAccessLevel:'container'}
            
            blob_service.createContainerIfNotExists(containerName, opts, (error,res,resp) => {
               this.tdError(error, "create container");
               container = new Container(this, containerName,  res)
               resume();
            });
        });
        log("container created");
        return container;
    }

    /**
     * Specifies the service properties. See http://msdn.microsoft.com/en-us/library/azure/hh452235.aspx
     */
    public async setServicePropertiesAsync(properties: JsonObject) : Promise<[JsonObject, JsonObject]>
    {
        let result: JsonObject;
        let response: JsonObject;
        logger.debug("settings properties: " + JSON.stringify(properties));
        await new Promise(resume => {
            this.handle.setServiceProperties(properties, (error,res,resp) => {
                this.tdError(error, "set service properties");    
                result = res;
                response = resp;
                resume();
            });
        });
        return <[{},{}]>[result, response]
    }

    /**
     * Sets the CORS options for the service
     * {hints:allowed origins:*}
     * {hints:allowed headers:*}
     * {hints:exposed headers:*}
     */
    public async setCorsPropertiesAsync(allowedOrigins: string, allowedMethods: string, allowedHeaders: string, exposedHeaders: string, maxAgeInSeconds: number) : Promise<boolean>
    {
        let success: boolean;
        let props = ({Cors: { CorsRule: [ {  } ] } });
        let corsRule = props["Cors"]["CorsRule"][0];
        corsRule["AllowedOrigins"] = stringToJsarray(allowedOrigins);
        corsRule["AllowedMethods"] = stringToJsarray(allowedMethods);
        corsRule["AllowedHeaders"] = stringToJsarray(allowedHeaders);
        corsRule["ExposedHeaders"] = stringToJsarray(exposedHeaders);
        if (maxAgeInSeconds <= 0) {
            maxAgeInSeconds = 600;
        }
        corsRule["MaxAgeInSeconds"] = maxAgeInSeconds;
        logger.debug("setting cors");
        let [result, response] = await this.setServicePropertiesAsync(clone(props));
        success = result["isSuccessful"];
        return success;
    }

    /**
     * Specifies the service properties. See http://msdn.microsoft.com/en-us/library/azure/hh452235.aspx
     */
    public async servicePropertiesAsync() : Promise<[JsonObject, JsonObject]>
    {
        let result: JsonObject;
        let response: JsonObject;
        await new Promise(resume => {
            /*JS*/
            this.handle.getServiceProperties((error,res,resp) => {
                this.tdError(error, "service properties");
                result = res;
                response = resp;
                resume();
            });
        });
        return <[{},{}]>[result, response]
    }

    /**
     * Generate an random block id prefix
     */
    public generateRandomId() : string
    {
        return this.handle.generateBlockIdPrefix()
    }

    /**
     * Set log level to 'debug' or 'info'
     */
    public setLogLevel(level: string) : void
    {
        this.handle.logger.level = level;
    }

    /**
     * Permanently removes the container. It cannot be undone.
     */
    public async deleteContainerAsync(containerName: string) : Promise<void>
    {
        log("delete container: " + containerName);
        await new Promise(resume => {
            this.handle.deleteContainer(containerName, (error,res,resp) => {
               this.tdError(error, "delete container");
               resume();
            });
        });
        log("container deleted");
    }

    /**
     * Storage account name for this service
     */
    public storageAccount() : string
    {
        return this.tdAccount;
    }
}

export class Container
{
    constructor(public svc:BlobService, public name:string, public result:any)
    {
    }

    /**
     * Creates a new block blob and uploads the contents of a string.
     */
    public async createBlockBlobFromTextAsync(blobName: string, text: string, options?: ICreateOptions) : Promise<BlobInfo>
    {
        let container: Container = this;
        let result: BlobInfo;
        let opts = prepOptions(options);
        await new Promise(resume => {
            /*JS*/
            this.svc.handle.createBlockBlobFromText(this.name, blobName, text, opts, (error, res, resp) => {
              if (!opts.justTry) this.svc.tdError(error, "create blob from text");
              if(error){
                 result = new BlobInfo({ error: error + "" })
              }
              else{
                    result = new BlobInfo(res);
               }
            resume();
            });
        });
        container.timeOp(opts, "put");
        return result;
    }

    /**
     * Writes the blob contents to a string. The `result` will contain information about the blob, including ETag information.
     */
    public async getBlobToTextAsync(blobName: string, options?: IGetOptions) : Promise<BlobInfo>
    {
        let info: BlobInfo;
        let opts = prepGetOptions(options);
        await new Promise(resume => {
            this.svc.handle.getBlobToText(this.name, blobName, opts, 
            (error,txt,res,resp) => {
                if (!opts.justTry) this.svc.tdError404(error, "get blob to buffer");
                if(error){
                    if (/does not exist/.test(error + "")) { 
                      info = new BlobInfo({ error: "404" })
                    }
                    else {
                       td.checkAndLog(error);
                       info = new BlobInfo({ error: error + "" })
                    }
                }
                else{
                    info= new BlobInfo(res);
                    res.text = txt;
                }
            resume();
            });
        });
        this.timeOp(opts, "get");
        return info;
    }

    /**
     * Deletes a blob.
     */
    public async deleteBlobAsync(blobName: string) : Promise<void>
    {
        await new Promise(resume => {
            /*JS*/
            this.svc.handle.deleteBlob(this.name, blobName, (error,resp) => {
               this.svc.tdError404(error, "delete blob");
               resume();
            });
        });
    }

    /**
     * Writes the blob contents to a file. The `result` will contain information about the blob, including ETag information.
     */
    public async getBlobToBufferAsync(blobName: string, options?: IGetOptions) : Promise<[BlobInfo, Buffer]>
    {
        let result: BlobInfo;
        let buf:Buffer;
        let opts = prepGetOptions(options);
        await new Promise(resume => {
            var rs = this.svc.handle.createReadStream(this.name, blobName, opts, (error,res,resp) => {
                if (!opts.justTry) this.svc.tdError404(error, "get blob to buffer");
                if (td.checkAndLog(error)) {
                   result = new BlobInfo(res);
                } else {
                    result = new BlobInfo({ error: error + "" })
                   resume();
                }
            });
            var bufs = []
            rs.on("data",d => { bufs.push(d); })
            rs.on("end", () => {
              buf = Buffer.concat(bufs)
              resume()
            })
        });
        this.timeOp(opts, "get");
        return <[BlobInfo, Buffer]>[result, buf]
    }


    /**
     * Gets the URL of the container.
     */
    public url() : string
    {
        if (!this._url)
            this._url = this.svc.handle.getUrl(this.name)
        return this._url;
    }
    private _url:string;

    /**
     * Creates a new block blob with contents downloaded from given `url`.
     */
    public async createBlockBlobFromUrlAsync(blobName: string, url: string, options?: ICreateOptions) : Promise<BlobInfo>
    {
        let result: BlobInfo;
        let opts = prepOptions(options);
        await new Promise(resume => {
            td.httpRequestStreamAsync(url)
              .then(urlResp => {
                  if (!opts.contentType) opts.contentType = urlResp.headers['content-type'];
                  var ws = this.svc.handle.createWriteStreamToBlockBlob(
                    this.name, blobName, opts,
                    (error, res, resp) => {
                       this.svc.tdError(error, "create blob from URL");
                       result = new BlobInfo(res);
                       resume();
                    });
                  urlResp.pipe(ws);
              })
        });
        return result;
    }

    /**
     * Creates a new block blob and uploads the contents of a buffer.
     */
    public async createBlockBlobFromBufferAsync(blobName: string, buffer:Buffer, options?: ICreateOptions) : Promise<BlobInfo>
    {
        let result: BlobInfo;
        assert(buffer.length > 0, "cannot create empty blob.");
        let opts = prepOptions(options);
        await new Promise(resume => {
            var buf = buffer;
            this.svc.handle._putBlockBlob(this.name, blobName, buf, null, buf.length, opts,
                (error, res, resp) => {
                      if (!opts.justTry) this.svc.tdError(error, "create blob from buffer");
                      if(error){
                         result = new BlobInfo({ error: error + "" })
                      }
                      else{
                            result= new BlobInfo(res);
                       }
                    resume();
            });
        });
        this.timeOp(opts, "put");
        return result;
    }

    /**
     * Creates a new block blob with the buffer gzipped. `smartGzip` option will disable compression of images etc.
     */
    public async createGzippedBlockBlobFromBufferAsync(blobName: string, buffer:Buffer, options?: ICreateOptions) : Promise<BlobInfo>
    {
        let result: BlobInfo;
        if ( ! options.smartGzip || /(text\/|javascript|xml|font\/ttf)/.test(options.contentType)) {
            let opts = prepOptions(options);
            await new Promise(resume => {
                      opts.contentEncoding = "gzip"
                      if (!opts.contentType) opts.contentType = "text/plain";
                      var ws = this.svc.handle.createWriteStreamToBlockBlob(
                        this.name, blobName, opts,
                        (error, res, resp) => {
                           this.svc.tdError(error, "create gzipped blob");
                           result = new BlobInfo(res);
                           resume();
                        });
                      
                      var str = zlib.createGzip()
                      str.pipe(ws);
                      str.end(buffer)
            });
            this.timeOp(opts, "put");
        }
        else {
            result = await this.createBlockBlobFromBufferAsync(blobName, buffer, options);
        }
        return result;
    }

    private timeOp(opts: JsonBuilder, id: string) : void
    {
        let start = opts["startTime"];
        this.timeOpCore(start, id);
    }

    /**
     * Gets the service of the this.
     */
    public service() : BlobService
    {
        return this.svc;
    }

    private timeOpCore(start: number, id: string) : void
    {
        let delta = logger.loggerDuration() - start;
        logger.measure(id + "@" + this.service().storageAccount(), delta);
    }
}

export class BlobInfo
{
    constructor(private inf:any) {}

    /**
     * Get the `ETag` of a blob.
     */
    public etag() : string
    {
        return this.inf.etag;
    }

    /**
     * Get the last modification time of a blob.
     */
    public lastModified() : Date
    {
        return new Date(this.inf.lastModified)
    }

    /**
     * Get the MD5 checksum of the blob.
     */
    public contentMd5() : Buffer
    {
        return new Buffer(this.inf.contentMD5, "base64")
    }

    /**
     * Get the name of a blob.
     */
    public name() : string
    {
        return this.inf.name
    }

    /**
     * Checks if blob update succeeded. Can only be false when optional parameter `just try` is set.
     */
    public succeded() : boolean
    {
        return !this.inf.error
    }

    /**
     * Get the text of a blob.
     */
    public text() : string
    {
        return this.inf.text
    }

    /**
     * Get the error message if not `->succeded`
     */
    public error() : string
    {
        return this.inf.message
    }

}

export interface ICreateOptions {
    etag?: string;
    forceNew?: boolean;
    justTry?: boolean;
    contentType?: string;
    contentEncoding?: string;
    cacheControl?: string;
    contentDisposition?: string;
    timeoutIntervalInMs?: number;
    smartGzip?: boolean;
}

export interface IGetOptions {
    timeoutIntervalInMs?: number;
    justTry?: boolean;
}

export interface ICreateServiceOptions {
    storageAccount?: string;
    storageAccessKey?: string;
}


var agentSSL;

export function init() : void
{
    logger = td.createLogger("blobs");

    // Create a HTTP Agent with reuse:
    agentSSL = td.mkAgent("https:")
    agentSSL.maxSockets = 50;

    logSeqNo = 1000000;
    instanceId = createRandomId(6);
}

/**
 * Creates a random id.
 */
export function createRandomId(size: number) : string
{
    let buf = crypto.randomBytes(size * 2)
    let s = buf.toString("base64").replace(/[^a-zA-Z]/g, "");
    if (s.length < size) {
        // this is very unlikely
        return createRandomId(size);
    }
    else {
        return s.substr(0, size);
    }
}

/**
 * Logs a message to the console.
 */
function log(message: string) : void
{
    logger.info(message);
}

/**
 * Creates a 'BlobService,' an object that lets you work with containers and blobs.
 */
export function createBlobService(options?: ICreateServiceOptions) : BlobService
{
    let blobService = new BlobService();
    var opt = options;
    let blob_service:any;
    if (opt.storageAccount) {
        blob_service = azure_storage.createBlobService(opt.storageAccount, opt.storageAccessKey);
        blobService.tdAccount = opt.storageAccount;
    } else {
        blob_service = azure_storage.createBlobService();
        blobService.tdAccount = process.env.AZURE_STORAGE_ACCOUNT;
    }

    var retryOperations = new azure_storage.LinearRetryPolicyFilter(10, 1000);
    blob_service = blob_service.withFilter(retryOperations);
    blobService.handle = blob_service;
    
    var svc = blob_service;
    // hack to keep sockets open (EADDRINUSE error)
    var prev = svc._buildRequestOptions;
    svc._buildRequestOptions = function (wr, bd, opt, cb) {
      prev.apply(this, [wr, bd, opt, function (err, opts) {
         if (opts) {
           opts.agent = agentSSL;
           if (opt.timeoutIntervalInMs)
              opts.timeout = opt.timeoutIntervalInMs; 
         }
         cb(err, opts);
      }]);
    };
    
    return blobService;
}

/**
 * This library provides access to the Azure Blob Storage library, a utility used for storing large amounts of unstructured data that can be accessed from anywhere in the world via HTTP or HTTPS. A single blob can be hundreds of gigabytes in size.
 * Common uses of Blob storage include:
 * * Serving images or documents directly to a browser
 * * Storing files for distributed access
 * * Streaming video and audio
 * * Performing secure backup and disaster recovery
 * * Storing data for analysis by an on-premises or Azure-hosted service
 * {imports}
 * ### usage
 * You can use Blob storage to expose data publicly to the world or privately for internal application storage.
 * For full documentation, go to this link: http://azure.microsoft.com/en-us/documentation/articles/storage-dotnet-how-to-use-blobs/
 */
async function exampleAsync() : Promise<void>
{
    let blobService = createBlobService();
    // The BlobService object lets you work with containers and blobs. The above code creates a BlobService object.
    // When using blob services, containers, or blobs, ensure that each object's name does not contain any spaces or other illegal JavaScript characters.
    let container = await blobService.createContainerIfNotExistsAsync("mycontainer", "public");
    // All blobs reside in a container. This method creates a new container with permission 'hidden,' 'private,' or 'public.'
    // * Public permission: A reference to a `public` container will return a list of all blobs present within the container.
    // * Private permission: A reference to a blob object within a `private` container may be used to retrieve the contents of that blob object.
    // * Hidden permission: Access to a `hidden` container will prevent other users from accessing blob objects within that container.
    let blob = await container.createBlockBlobFromTextAsync("blob1", "blob information");
    // Creates a new block blob and uploads the contents of a file located at `file path` - in this example, the file `static/foobar.txt`.
    let result = await container.getBlobToTextAsync("blob1");
    // Writes the blob contents to a file. The `result` will contain information about the blob, including ETag information.
    await container.deleteBlobAsync("blob");
    // Finally, to delete a blob, call `deleteBlob`. The above example deletes the blob named `blob`.
    let result4 = await container.createBlockBlobFromBufferAsync("buffer blob", new Buffer("Hello world!", "utf8"));
    // Creates a new block blob with contents equal to `buffer`.
    let [result3, buf] = await container.getBlobToBufferAsync("buffer blob");
    // Writes the blob contents to a file. The `result` will contain information about the blob, including ETag information.
}

function stringToJsarray(list: string) : JsonObject[]
{
    if (list != "") {
        return list.split(",")
    } else return []
}

function invalidToEmpty(etag: string) : string
{
    let etag2: string;
    if (etag == null) {
        etag = "";
    }
    etag2 = etag;
    return etag2;
}

function prepOptions(options: ICreateOptions) : ICreateOptions
{
    if (!options) options = {}
    if (!options.timeoutIntervalInMs)
        delete options.timeoutIntervalInMs
    let opts = clone(options)
    opts["accessConditions"] = {};
    let etag = invalidToEmpty(options.etag);
    if (etag != "") {
        opts["accessConditions"]["if-match"] = etag;
    }
    if (options.forceNew) {
        opts["accessConditions"]["if-none-match"] = "*";
    }
    opts["startTime"] = logger.loggerDuration();
    return opts;
}

function prepGetOptions(options: IGetOptions) : IGetOptions
{
    if (!options) options = {}
    if (!options.timeoutIntervalInMs)
        delete options.timeoutIntervalInMs
    let opts = clone(options);
    opts["startTime"] = logger.loggerDuration();
    return opts;
}


