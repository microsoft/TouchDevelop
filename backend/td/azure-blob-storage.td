meta version "v2.2,js,ctx,refs,localcloud,unicodemodel,allasync,upperplex";
meta name "azure blob storage";
meta color "#ffffffff";
meta rootId "cGSm0HNHoUBjRPJgn3iqphgo";
meta iconArtId "defdwglt";
meta isLibrary "yes";
meta allowExport "yes";
meta hasIds "yes";
meta platform "network,npm,shell";
meta parentIds "";
#kyQ0Zb0T5KlpDc28
action init() {
  #xaoocAs1O9UGFUPd data→logger := app→create_logger("blobs");
  #p0BnSa42Jk3jGZfA app→import("npm", "azure-storage", "0.4.x");
  #K87UG2nKWnLzoku5 app→import("npm", "fs", "");
  #jaG8qzteRK1n9P49 app→import("npm", "util", "");
  #Wyrjcmc432vQ8iP2 app→import("npm", "zlib", "");
  #V41m8JB7e2so14yD // Create a HTTP Agent with reuse:
  #JThOanffVIVNmh2Q app→javascript("local", "s.d.agentSSL = lib.Node.mkAgent(\"https:\")\ns.d.agentSSL.maxSockets = 50;");
  #f8LC45LFXbXNW1m2 data→log_seq_no := 1000000;
  #xt4z8fXkpTmqj2ii data→instance_id := code→create_random_id(6);
  meta sync;
}
#B7t2nxXby04kPmBZ
var log_seq_no : Number {
  transient = true;
}
#Ckwt8e92TLyFcYSD
var instance_id : String {
  transient = true;
}
#xMnei2f5D68bdFvO
action create_random_id(#CI0T48tyej8eCIUa size: Number) returns(#pu2hk10YfWS3IXhy id: String) {
  #uRCeWqDKIt2q0SJ2 // Creates a random id.
  #voHPa0pHUZL4PeVb $buf := bits→create_buffer($size * 2);
  #n2HL4442gTbbmY1i $buf→fill_random;
  #rThbat5cHBIgm1RS $s := $buf→to_string("base64")→replace_regex("[^a-zA-Z]", "");
  #bV3LKFqb62Bt2Xb4 if $s→count < $size then {
    #OtdzSj4GxsJ7m0aW // this is very unlikely
    #oC3iQUuJCsHm1FQD $id := code→create_random_id($size);
  }
  else {
    #R90DNaB44hM4AU4b $id := $s→substring(0, $size);
  }
  meta sync;
}
#qx1LVoMuc4B8rtke
action log(#ncBU5lMg2ZA3n6pN message: String) {
  #bawuozFH2VXd13Bg // Logs a message to the console.
  #epY2y2n6ESp8NFhe data→logger→info($message);
  meta private;
  meta sync;
}
#xPho4dgpgPNt568n
action create_blob_service(#AcVg2vmYdsS4BRtY options\u003f: * Create_Service_Options) returns(#xbAGaCIGWuhiVvd8 blob_service: * Blob_Service) {
  #xh67VoyyalpvXLX2 // Creates a 'BlobService,' an object that lets you work with containers and blobs.
  #GQd5jp141sPiwyM4 $logger := data→logger;
  #sh6dVartUNZ1dqX4 app→javascript("local", "var opt = options.to_json().value();\nif (opt[\'storage account\']) {\n    blob_service = azure_storage.createBlobService(opt[\'storage account\'], opt[\'storage access key\']);\n    blob_service.tdAccount = opt[\'storage account\'];\n} else {\n    blob_service = azure_storage.createBlobService();\n    blob_service.tdAccount = process.env.AZURE_STORAGE_ACCOUNT;\n}\nvar retryOperations = new azure_storage.LinearRetryPolicyFilter(10, 1000);\nblob_service = blob_service.withFilter(retryOperations);\n\nvar svc = blob_service;\n// hack to keep sockets open (EADDRINUSE error)\nvar prev = svc._buildRequestOptions;\nsvc._buildRequestOptions = function (wr, bd, opt, cb) {\n  prev.apply(this, [wr, bd, opt, function (err, opts) {\n     if (opts) {\n       opts.agent = s.d.agentSSL;\n       if (opt.timeoutIntervalInMs)\n          opts.timeout = opt.timeoutIntervalInMs; \n     }\n     cb(err, opts);\n  }]);\n};\n\nvar  transientErrors = [500, 501, 502, 503, \'ETIMEDOUT\', \'ECONNRESET\', \'EADDRINUSE\', \'ESOCKETTIMEDOUT\', \'ECONNREFUSED\'];\n\nsvc.tdError = function (err, msg) {\n    if (!err) return;\n    \n    if (transientErrors.indexOf(err.code) !== -1 || transientErrors.indexOf(err.statusCode) !== -1) {\n        err.statusCode = 503; // for restify etc\n        err.tdSkipReporting = true; // skip reporting\n        logger.measure(\"503@\" + blob_service.tdAccount, 1000)\n    }\n\n    if (!err.tdMeta) err.tdMeta = {};\n    err.tdMeta.func = msg || \"\";\n    throw err;\n};\n\nsvc.tdError404 = function (err, msg) {\n  if (err && !/does not exist/.test(err + \"\")) svc.tdError(err, msg);\n};");
  meta sync;
}
#BdGhpbmca
table Blob_Service {
  type = "Object";
  persistent = false;
}
#MSIHblLfjDLqFIxK
action create_container_if_not_exists(#XrXO6FKga3eSJzEe blob_service: * Blob_Service, #rpZEIp8Toxx3plzS container_name: String, #xOwhpJNqK08yJrRV permission: String) returns(#x6HlpFmPwEQ4VcCC container: * Container) {
  #BURB1Es4PTWhRZfv // All blobs reside in a container. This method creates a new container with permission 'hidden,' 'private,' or 'public.'
  #UCGCVfvCUToruSKQ // {hints:permission:private,hidden,public}
  #FpZ4gczeNb48pyj3 code→log("create container");
  #K7cT8GNNoL2SJwft app→javascript_async("local", "var opts = {}\nif (permission == \"hidden\" || permission == \"blob\")\n  opts = {publicAccessLevel:\'blob\'}\nelse if (permission == \"public\")\n  opts = {publicAccessLevel:\'container\'}\n\nblob_service.createContainerIfNotExists(container_name, opts, lib.protect(s,function(error,res,resp){\n   blob_service.tdError(error, \"create container\");\n   container = { svc: blob_service, name: container_name,  result: res }\n   resume();\n}));");
  #YeI6TTDgRsqcYa8C code→log("container created");
}
#R9h9V5KEn3IXtWT3
action create_block_blob_from_local_file(#QXfCHSfR1YLwM5vI container: * Container, #WQ8z9tbaP9KQGxRq blob_name: String, #ohcQrFJ2sB5KmM9l file_path: String) returns(#B0y0B4WfSCoVKnJN result: * Blob_Info) {
  #ksCIcXwqqYp7JjRu // Creates a new block blob and uploads the contents of a file located at `file path`.
  #jpPsk2NqxkTP5DFj app→javascript_async("local", "container.svc.createBlockBlobFromLocalFile(container.name,blob_name, file_path,lib.protect(s,function(error, res, resp){\n  container.svc.tdError(error, \"create blob from file\");\n  result=res;\n  resume();\n}));");
}
#eUNDXDevVwiyDfWM
action create_block_blob_from_text(#xfl4YLRLdVDUYO11 container: * Container, #mW0ELsdfJMiw8xJO blob_name: String, #WsRRBR0OFT1DAkex text: String, #xpZ9wVHXrQRlS4EZ options\u003f: * Create_Options) returns(#bmhVvAGFbJ4lKUdr result: * Blob_Info) {
  #gBbeyybISu22zMXA // Creates a new block blob and uploads the contents of a string.
  #xjyVI5Yks2hYKtPE $opts := code→prep_options($options\u003f);
  #pIZwmYsTiBfJezYn app→javascript_async("local", "container.svc.createBlockBlobFromText(container.name,blob_name, text,opts.value(), lib.protect(s,function(error, res, resp){\n  if (!opts.value().justTry) container.svc.tdError(error, \"create blob from text\");\n  if(error){\n     result = { error: error + \"\" }\n  }\n  else{\n        result=res;\n   }\nresume();\n}));");
  #H7gmCpiK07wF7i4c $container→time_op($opts, "put");
}
#TNWCDH2mAShlMC4E
action get_blob_to_file(#xDstP7cvAmmS4JLM container: * Container, #x6aiuuUTiVgHyUmf blob_name: String, #bO7BEAGae398o1yo file_path: String) returns(#Mnue4EQfe6WQx49O result: * Blob_Info) {
  #xl9X2PAkHHxE2Zh2 // Writes the blob contents to a file. The `result` will contain information about the blob, including ETag information.
  #NNs3jH1TDbIJMFBl app→javascript_async("local", "container.svc.getBlobToLocalFile(container.name,blob_name,file_path,lib.protect(s,function(error,res,resp){\nif (!opts.value().justTry) container.svc.tdError404(error, \"get blob to file\");\n        if(lib.checkAndLog(error)) {\n        result=res;\n}\nresume();\n}));");
}
#Ny2HDejxDDGfFA60
action get_blob_to_text(#xTkNj2rJMH6wNZXk container: * Container, #bE1D4wrtF0xXr9v5 blob_name: String, #lzjoTHfQjhgHdF59 options\u003f: * Get_Options) returns(#xQPZA85XdrNgZfZ3 info: * Blob_Info) {
  #c7iATXRZYYk4GZdX // Writes the blob contents to a string. The `result` will contain information about the blob, including ETag information.
  #zAlHXE4jq2bY48bN $opts := code→prep_get_options($options\u003f);
  #xsZRItuZLmFtkdCX app→javascript_async("local", "container.svc.getBlobToText(container.name, blob_name, opts.value(), \nlib.protect(s,function(error,txt,res,resp){\nif (!opts.value().justTry) container.svc.tdError404(error, \"get blob to buffer\");\n    if(error){\n        if (/does not exist/.test(error + \"\")) { \n          info = { error: \"404\" }\n        }\n        else {\n           lib.checkAndLog(error);\n           info = { error: error + \"\" }\n        }\n    }\n    else{\n        info=res;\n        res.text = txt;\n    }\nresume();\n}));");
  #bXKe2Y2A25dvWNTw $container→time_op($opts, "get");
}
#sRp22SBUrUTAgzqx
action delete_blob(#LqEwbyuIRgka7qiF container: * Container, #lsLknrkfJmhq8PKc blob_name: String) {
  #iIoXhN2tHFkvqITm // Deletes a blob.
  #xn4rgT0rp3MUE2FP app→javascript_async("local", "container.svc.deleteBlob(container.name,blob_name,lib.protect(s,function(error,resp){\n   container.svc.tdError404(error, \"delete blob\");\n   resume();\n}));");
}
#WLzdzt4p7tgwHylv
table Container {
  type = "Object";
  persistent = false;
}
#Gvg4weoBzKt7HFvf
table Blob_Info {
  type = "Object";
  persistent = false;
}
#L2bnEAFhsnHFfV2e
action example() {
  #ZTgamrKGVGIztd4f // This library provides access to the Azure Blob Storage library, a utility used for storing large amounts of unstructured data that can be accessed from anywhere in the world via HTTP or HTTPS. A single blob can be hundreds of gigabytes in size.
  #m5EnLXUAS716FxlR // Common uses of Blob storage include:
  #xrNGHjKzImo83zyf // * Serving images or documents directly to a browser
  #rh8wlEzz8hGhXrrl // * Storing files for distributed access
  #btIiYhTuUkoWHLiJ // * Streaming video and audio
  #OJ2ACXU2yzKGjQcL // * Performing secure backup and disaster recovery
  #VRIHXOj43lOQheMH // * Storing data for analysis by an on-premises or Azure-hosted service
  #x9y7Walt8W64WdH8 // {imports}
  #x2RyLKe26hA45Qrj // ### usage
  #xXxifO8E0JMRef2j // You can use Blob storage to expose data publicly to the world or privately for internal application storage.
  #YyXQV82a7pIJ5aPw // For full documentation, go to this link: http://azure.microsoft.com/en-us/documentation/articles/storage-dotnet-how-to-use-blobs/
  #X8Br3hGlauLf29tx $blob_service := code→create_blob_service;
  #xA3JxR72g223lmLY // The BlobService object lets you work with containers and blobs. The above code creates a BlobService object.
  #oYmJUCuprl9O37Bf // When using blob services, containers, or blobs, ensure that each object's name does not contain any spaces or other illegal JavaScript characters.
  #zniJ7U2ehJAQlOaX $container := $blob_service→create_container_if_not_exists("mycontainer", "public");
  #M0M5SsozXlvLor4Y // All blobs reside in a container. This method creates a new container with permission 'hidden,' 'private,' or 'public.'
  #E4Vwp1HljWIHHj8N // * Public permission: A reference to a `public` container will return a list of all blobs present within the container.
  #jESHHwDqilFgVoyt // * Private permission: A reference to a blob object within a `private` container may be used to retrieve the contents of that blob object.
  #zOOkiRxjYgC1fc5t // * Hidden permission: Access to a `hidden` container will prevent other users from accessing blob objects within that container.
  #xxNbDhdlCMRjNIYD $blob := $container→create_block_blob_from_text("blob1", "blob information");
  #xvy4WadzjHAv8WSG // Creates a new block blob and uploads the contents of a string - in this example, the string `blob information`.
  #ljsJ7wqh9VS9bMAT $blob2 := $container→create_block_blob_from_local_file("blob2", "static/foobar.txt");
  #r5HokOpHa778QGTz // Creates a new block blob and uploads the contents of a file located at `file path` - in this example, the file `static/foobar.txt`.
  #L9CubB1i3yiWpsRp $result := $container→get_blob_to_text("blob1");
  #iDxiCw9ljVaKNTCr // Writes the blob contents to a string. The `result` will contain information about the blob, including ETag information.
  #o2xGa87EAzR1Zd92 $result2 := $container→get_blob_to_file("blob2", "static/foo/bar2.txt");
  #IghoxtcM8LX4WFRr // Writes the blob contents to a file. The `result` will contain information about the blob, including ETag information.
  #xohb4ftxLUljs9gz code→delete_blob($container, "blob");
  #xqJ8z8k2ZsFE7sqV // Finally, to delete a blob, call `deleteBlob`. The above example deletes the blob named `blob`.
  #qnlEFkAKxzCV42LY $result4 := code→create_block_blob_from_buffer($container, "buffer blob", bits→string_to_buffer("Hello world!", "utf8"));
  #XmKe6ThXyR8qsIk4 // Creates a new block blob with contents equal to `buffer`.
  #RArdVx6EdyFaq1DP $result3, $buf := code→get_blob_to_buffer($container, "buffer blob");
  #sKUBAEyRkK5qCcXX // Writes the blob contents to a file. The `result` will contain information about the blob, including ETag information.
  meta private;
}
#V4I51rGQmPEuX0fH
action get_blob_to_buffer(#X0Cs3gmF2LDMzppD container: * Container, #XdFNRRKBKLr7YL0p blob_name: String, #bpZtI4QhFdnmph87 options\u003f: * Get_Options) returns(#DYVcuhvNxKzS7ZzE result: * Blob_Info, #hBaOsBfgXYs7tmxL buf: Buffer) {
  #y8JlZdNEsn1mhGdx // Writes the blob contents to a file. The `result` will contain information about the blob, including ETag information.
  #O0BGO5L4HaDMzQ57 $opts := code→prep_get_options($options\u003f);
  #vtcN6QQc8E4hzdKD app→javascript_async("local", "var rs = container.svc.createReadStream(container.name,blob_name,opts.value(),lib.protect(s,function(error,res,resp){\nif (!opts.value().justTry) container.svc.tdError404(error, \"get blob to buffer\");\n        if(lib.checkAndLog(error)) {\n       result = res;\n} else {\n    resume();\n}\n}));\nvar bufs = []\nrs.on(\"data\",lib.protect(s,function(d) {\n  bufs.push(d);\n}))\nrs.on(\"end\",lib.protect(s,function() {\n  var total = Buffer.concat(bufs)\n  buf = lib.Buffer.fromNodeBuffer(total)\n  resume()\n}))");
  #QO6Ld3c8wen058wP $container→time_op($opts, "get");
}
#P2p4KAE1gmT2ehVd
var logger : App_Logger {
  transient = true;
}
#OgUPSFQH1nzQYiS5
action set_service_properties(#xrxpnnf2GTl7j0ZU blob_service: * Blob_Service, #AZezQ4Ht2YkM3f3Y properties: Json_Object) returns(#Lb7MelQ8I3QaYo4G result: Json_Object, #qTla8QMQh0NROq1k response: Json_Object) {
  #N2B5oOlE3ski8LE8 // Specifies the service properties. See http://msdn.microsoft.com/en-us/library/azure/hh452235.aspx
  #K44Rr4XIPrZnIR5u data→logger→debug("settings properties: " ∥ $properties→serialize);
  #olowovBYe5f0i2c1 app→javascript_async("local", "blob_service.setServiceProperties(properties.value(),lib.protect(s,function(error,res,resp){\n    blob_service.tdError(error, \"set service properties\");    \n    result = TDev.RT.JsonObject.wrap(res);\n    response = TDev.RT.JsonObject.wrap(resp);\n    resume();\n}));");
}
#Mullq69XR40JZm7S
action set_cors_properties(#uHfI7ESbcWi9PvOR blob_service: * Blob_Service, #SON2GIFLpYa4cn34 allowed_origins: String, #ljUKTJxUMvZi4iKm allowed_methods: String, #kyn3XBz7RjUJ1ChE allowed_headers: String, #FP88L1znMj2pdiiA exposed_headers: String, #xau9LM5H4GDS8MUv max_age_in_seconds: Number) returns(#xk82dwRYh2ANSvIR success: Boolean) {
  #NhJz4l0f5P2CA47M // Sets the CORS options for the service
  #x3Ljty924bZgYu0F // {hints:allowed origins:*}
  #m7UVq2HsQPlJhZHI // {hints:allowed headers:*}
  #Oxtd3M9P0H4TXHnv // {hints:exposed headers:*}
  #YVE1Otf2QzMe2ygc $props := web→json("{Cors: { CorsRule: [ {  } ] } }")→to_json_builder;
  #rI8dpDWC9hQXNjy4 $corsRule := $props→field("Cors")→field("CorsRule")→at(0);
  #l43kmknLsAUk507G $corsRule→set_field("AllowedOrigins", code→string_to_jsarray($allowed_origins));
  #xxLA5a2JmeMo0mXr $corsRule→set_field("AllowedMethods", code→string_to_jsarray($allowed_methods));
  #BqtwwZySGpeIWY9s $corsRule→set_field("AllowedHeaders", code→string_to_jsarray($allowed_headers));
  #wcq2gOtNFi2m46N0 $corsRule→set_field("ExposedHeaders", code→string_to_jsarray($exposed_headers));
  #exQCSra5Hsr4ydZx if $max_age_in_seconds ≤ 0 then {
    #mx9jrP15CmdUwR0w $max_age_in_seconds := 600;
  }
  #fXpb0uBSmPjyL8ih $corsRule→set_number("MaxAgeInSeconds", $max_age_in_seconds);
  #W5HziTNLmCMijYOS data→logger→debug("setting cors");
  #xFn22fsst5otAgoo $result, $response := $blob_service→set_service_properties($props→to_json);
  #ZlW1oE9hLFM9Ty2g $success := $result→boolean("isSuccessful");
}
#xzNyVMlIVubK2Rfg
action string_to_jsarray(#Tx9T7sA8GsgEPG7Q list: String) returns(#MZWMQFzFS92zs7tC js: Json_Object) {
  #QWeH8MT78ffaX4cD $jsb := web→json_array→to_json_builder;
  #D3nMDjEVYvPdEBhH if `not` $list→is_empty then {
    #xrxMB62NzHDuyqjb foreach s in $list→split(",")
    do {
      #xoq5nrprIzCsM7e4 $jsb→add($s→to_json);
    }
  }
  #x6Z7gixyO6nQAqsE $js := $jsb→to_json;
  meta private;
  meta sync;
}
#sF6Sp2bZH3KjZaBg
action service_properties(#jlDnheqsGRgILEsj blob_service: * Blob_Service) returns(#xvdaGBtdUKta2Cwo result: Json_Object, #HC2ts7yPsoChXahN response: Json_Object) {
  #T1bjDKs1XNbxvC9D // Specifies the service properties. See http://msdn.microsoft.com/en-us/library/azure/hh452235.aspx
  #gnQuKf5PSjKnB7i3 app→javascript_async("local", "blob_service.getServiceProperties(lib.protect(s,function(error,res,resp){\n    blob_service.tdError(error, \"service properties\");\n    result = TDev.RT.JsonObject.wrap(res);\n    response = TDev.RT.JsonObject.wrap(resp);\n    resume();\n}));");
}
#r1psDY7jVwgMLp33
action etag(#Jow5c5HF9yhix4iN inf: * Blob_Info) returns(#xCzxO6SdqiEsoSOv etag: String) {
  #bMdM1qUTEIAyZoyH // Get the `ETag` of a blob.
  #H4mfTg1b96OKb9lS app→javascript("local", "etag = inf.etag");
  meta sync;
}
#pv3kzn2XnfvF85E2
action last_modified(#ugwx2v17M0H2VxCr inf: * Blob_Info) returns(#ekSwlAc6IGjKxIIN lastmod: DateTime) {
  #uviuILnN8FHIRkhj // Get the last modification time of a blob.
  #MJOQumALWz2n11mw app→javascript("local", "lastmod = lib.DateTime.mk(new Date(inf.lastModified))");
  meta sync;
}
#gB70vX0SuLUHJBZt
action content_md5(#ohGriyEPlPEHscKm inf: * Blob_Info) returns(#lTIVCWp1DQHrS59r md5: Buffer) {
  #j6VLQzpWuf6TndOL // Get the MD5 checksum of the blob.
  #n6r557yKYlrlPWxM app→javascript("local", "md5 = lib.Buffer.fromNodeBuffer(new Buffer(inf.contentMD5, \"base64\"))");
  meta sync;
}
#D2i8yNkl6dPQBzsF
action list_blobs(#re1KoaodcZq4sGb0 container: * Container, #GthBDubzECWPTWLv prefix: String) returns(#w25Ufcqnwn6UcMf7 blobs: Collection[ * Blob_Info]) {
  #dL4j8vyh8XuUzRSc // Lists all blobs with names staring with `prefix` in a container.
  #TtobVoBYGZcmpjeZ app→javascript_async("local", "var allres=[];\nfunction getMore(cont) {\ncontainer.svc.listBlobsSegmentedWithPrefix(\ncontainer.name, prefix||null, cont, lib.protect(s,function(error,resp){\n   container.svc.tdError(error, \"list blobs\");\nlib.App.log(\"res: \" + util.inspect(resp.entries[0]))\nresp.entries.forEach(function(ent) {\n   allres.push({\n      container: container.name,\n      name: ent.name,\n      etag: ent.properties.etag,\n      lastModified: ent.properties[\'last-modified\'],\n      contentMD5: ent.properties[\'content-md5\'],\n   })\n})\nif (resp.continuationToken) getMore(resp.continuationToken)\nelse {\n  blobs = lib.Collection.mk(allres);\n  resume();\n}\n}));\n}\n\ngetMore(null)\n");
}
#vnJ4GQLLieVXcRWg
action name(#oiLYeyOmEUE4Uk2K inf: * Blob_Info) returns(#vwd0J6IPTvdzGJ2d blob_name: String) {
  #W65vhbLT4EOV2wpm // Get the name of a blob.
  #vPg2x7pzf7fPXCbs app→javascript("local", "blob_name = inf.name");
  meta sync;
}
#Q8ibdhJ7lljypEX0
action get_blob_url(#Zho02ljE0mDlIksl container: * Container, #iGMOzpGkpkd3l8Vp blob_name: String, #GIoNnhMzprbEOkDO expires: Number) returns(#jjhocSL1COF5TNE6 blob_url: String) {
  #p6cMuPgNiBDi4gpV // Retreives a blob url with an optional expiration policy if ``expires`` is greater than 0. ``expires`` is expressed in **minutes**.
  #viZuNgrhd8fuOizL app→javascript("local", "var options = { };\nif (expires > 0)\n  options.AccessPolicy = { Expiry : azure.date.minutesFromNow(expires) } \nblob_url = container.svc.getBlobUrl(container.name, blob_name, options);");
  meta sync;
}
#q2QEam8oG7mFGKD6
action generate_random_id(#x2jyUqJE25G83evo blob_service: * Blob_Service) returns(#CPF7k0u5FyQxjRZv id: String) {
  #UeAjVIk6vdvJIHZX // Generate an random block id prefix
  #WU4Rd6tP9UF4CLBF app→javascript("local", "id = blob_service.generateBlockIdPrefix()");
  meta sync;
}
#tUosUN5jI00waCe0
action get_blob_properties(#v5Xbuka054Zg42aN container: * Container, #D2fjPTANIb44TeZG blob_name: String) returns(#foaaewev2hUZgvxj info: * Blob_Info) {
  #E6k9tkkImR77jUXA app→javascript_async("local", "container.svc.getBlobProperties(container.name,blob_name,lib.protect(s,function(error,resp){\n    if(!error){\n         info = {\n      container: container.name,\n      name: blob_name,\n      etag: resp.etag,\n      lastModified: resp[\'last-modified\'],\n      contentMD5: resp[\'content-md5\'],\n         }\n    }\n    resume();\n}));");
}
#iHC6eb4Gq9W11AUq
action do_stuff() {
  #Pnv0hhzU4AquID1E skip;
  meta private;
  meta sync;
}
#eQ9ksqF8mc5ykZ0k
table Create_Options {
  type = "Object";
  exported = true;
  persistent = false;
  fields {
    #v2t1qjT74Nc5nEeS etag : String
    #zNv4AFwkrDTt7NE6 force_new : Boolean
    #JEQEgLG1XiOpoNTc just_try : Boolean
    #S4e80DX2Kc4HnE96 contentType : String
    #lqupeQTDrct300uA contentEncoding : String
    #xLEc1tc4MYZOowJi cacheControl : String
    #x7sLNi86uuIjZYsp contentDisposition : String
    #Ve2cFqb2VAgtpj7i timeoutIntervalInMs : Number
    #xRIj6RoUu0DC9f1I smartGzip : Boolean
  }
}
#QPitLBfBpmjgXD0a
action succeded(#DjbqQj2Mms20aKPp inf: * Blob_Info) returns(#i7yx2BrbIi4FLJ2w ok: Boolean) {
  #sUfXt2GJcwTZkDMk // Checks if blob update succeeded. Can only be false when optional parameter `just try` is set.
  #LbDc2ChgXy640sTu app→javascript("local", "ok = !inf.error");
  meta sync;
}
#xBr0Jd3UB2oWJAsx
action text(#x1Av4iknE71KSPYB inf: * Blob_Info) returns(#tplyjU7eCHi9XDKR text: String) {
  #x2RYgeAZB9voR0z1 // Get the `ETag` of a blob.
  #jS38vPKoPtzBaodc app→javascript("local", "text = inf.text");
  meta sync;
}
#FUb3T8gDuZ7ZOQPx
action error(#v2oHkM6PGCtfS8IH inf: * Blob_Info) returns(#xTKvZnrVXzs6vEuv message: String) {
  #pq81N2UZGBMZFUet // Get the error message if not `->succeded`
  #ou28t8Iexcub3x46 app→javascript("local", "message = inf.error");
  meta sync;
}
#xeA4XM1CrMyOAVhK
action invalid_to_empty(#h2mOHbg5SbMGP0Fo etag: String) returns(#S9iCijUEmNljzHsc etag2: String) {
  #t2NjD8lJbZwFO84c if $etag→is_invalid then {
    #gqP2SWNW4yLFjBcw $etag := "";
  }
  #lED6syv0fDt0n0YO $etag2 := $etag;
  meta private;
  meta sync;
}
#xAYpAzlBfzDT57H9
action url(#D75DSRBAE2lWyeBo container: * Container) returns(#EcoXYTHu62003nbA url: String) {
  #bE3aOxOemToeBpiH // Gets the URL of the container.
  #BlA3ROzuRC7TGTRt app→javascript("local", "if (!container.url)\n  container.url = container.svc.getUrl(container.name);\nurl = container.url");
  meta sync;
}
#dm1lYDPeEZqwzttG
action create_block_blob_from_url(#T3NZ0vFYhGe4L1p6 container: * Container, #jpa64bUKjZeIWDzQ blob_name: String, #xRRGSlBtWUQpeaZh url: String, #bzubXiMIqil2JUg8 options\u003f: * Create_Options) returns(#RBs1pawA717rPr0I result: * Blob_Info) {
  #hZhRq4RfujIT1PT8 // Creates a new block blob with contents downloaded from given `url`.
  #uea5LbMSYuKAYq3R $opts := code→prep_options($options\u003f);
  #x7aO99UxX43Wg2Uo app→javascript_async("local", "lib.Node.httpRequestStreamAsync(url)\n  .then(lib.protect(s, function(urlResp) {\n      opts = opts.value()\n      if (!opts.contentType) opts.contentType = urlResp.headers[\'content-type\'];\n      var ws = container.svc.createWriteStreamToBlockBlob(\n        container.name, \n        blob_name, \n        opts,\n        lib.protect(s, function(error, res, resp) {\n           container.svc.tdError(error, \"create blob from URL\");\n           result = res;\n           resume();\n        }));\n      urlResp.pipe(ws);\n  }))\n  .done()\n");
}
#FuOAl6xnBXL2L2KB
action prep_options(#sA2MIX57IzMHW6ih options\u003f: * Create_Options) returns(#FQTUj4x77qv0AnHh opts: Json_Builder) {
  #YseccWqHw7F9UKI2 if $options\u003f→timeoutIntervalInMs = 0 then {
    #xQv3HN4LGwtsYZ3J $options\u003f→timeoutIntervalInMs := invalid→number;
  }
  #xy8shBV05d2oacgN $opts := $options\u003f→to_json→to_json_builder;
  #WYB7uqcre50hhAgA $opts→set_builder("accessConditions", web→create_json_builder);
  #oBnWg68neKTJCeuJ $etag := code→invalid_to_empty($options\u003f→etag);
  #oBixcHjeEYfkwOOe if `not` $etag→is_empty then {
    #HNMpjXPif7Q6gc2G $opts→field("accessConditions")→set_string("if-match", $etag);
  }
  #f4GmzLVMbp5rOVqF if $options\u003f→force_new then {
    #xo3tM7YgX36xnY4B $opts→field("accessConditions")→set_string("if-none-match", "*");
  }
  #aPEmD4F422OId7Wn $opts→set_number("startTime", data→logger→logger_duration);
  #AFfPdEU47Q2oPr1b $opts→set_boolean("justTry", $options\u003f→just_try);
  meta private;
  meta sync;
}
#mvPq0Mmn4Xa0r92e
action generate_shared_access_signature(#MwhgYbux6fe3QsGX container: * Container, #YcA2twK5HQX7Cxmw blob_name: String, #gNepnWM3BVCUXecU permissions: String, #JhExYJAzhGhDugG4 minutes: Number) returns(#MyfdCGRvdb7R0ucN blobSAS: String) {
  #CvWZGNDFrMj5rZdE app→javascript("local", "var expiryDate = new Date();\nexpiryDate.setMinutes(expiryDate.getMinutes() + minutes);\n\nvar sharedAccessPolicy = {\n  AccessPolicy: {\n    Permissions: permissions,\n    Expiry: expiryDate\n  },\n};\n\nblobSAS = container.svc.generateSharedAccessSignature(container.name, blob_name,sharedAccessPolicy);");
  meta sync;
}
#BVGhpbmca
table Get_Options {
  type = "Object";
  exported = true;
  persistent = false;
  fields {
    #MGcXNRSlXoeJkOtU timeoutIntervalInMs : Number
    // Don't crash even when the error is not 404.
    #IUVE9PFdu914Fjjt just_try : Boolean
  }
}
#EBJIew8wTUOl2C7L
action prep_get_options(#dBcoj3x2GYnciwgw options\u003f: * Get_Options) returns(#YddAIImO66eqN2df opts: Json_Builder) {
  #JmOo2Z4nqWtOJsi4 if $options\u003f→timeoutIntervalInMs = 0 then {
    #LDg739pypo6qaED2 $options\u003f→timeoutIntervalInMs := invalid→number;
  }
  #xREsatoyLUCYK5v4 $opts := $options\u003f→to_json→to_json_builder;
  #xzxvwrHgnR0XEEG6 $opts→set_number("startTime", data→logger→logger_duration);
  #PgpEHGpDLZ8yhwuS $opts→set_boolean("justTry", $options\u003f→just_try);
  meta private;
  meta sync;
}
#EzWR36CU2TrGhT6p
action set_log_level(#OVGF42Dh5Q2HZr8T blob_service: * Blob_Service, #BNbxM2CxJU2lpn5g level: String) {
  #uMDrDzw0NOblyR5A // Set log level to 'debug' or 'info'
  #LSNARz1zTeiKbtq2 app→javascript("local", "blob_service.logger.level = level;");
  meta sync;
}
#rOyvuzBLHgaor4h4
action delete_container(#dVdYJ62u6yEZkY8y blob_service: * Blob_Service, #M8VDDXtB3V1lEsyw container_name: String) {
  #XbGE88ycGGqsoFL9 // Permanently removes the container. It cannot be undone.
  #MkrIxcYvAiuPTTl9 code→log("delete container: " ∥ $container_name);
  #WBfc7ocWMnkzTmEn app→javascript_async("local", "blob_service.deleteContainer(container_name,\nlib.protect(s,function(error,res,resp){\n   blob_service.tdError(error, \"delete container\");\n   resume();\n}));");
  #Ji22TP1FCqtRRS04 code→log("container deleted");
}
#IZ4323htAs2zhTpL
action create_block_blob_from_buffer(#UYIitVvIcJTfQWiR container: * Container, #xLL9MuZK0bl0qllp blob_name: String, #z48CJ23ehCoQ5Tjq buffer: Buffer, #WS8HfNblUJDGpK86 options\u003f: * Create_Options) returns(#lm9tPNjYo44eVXho result: * Blob_Info) {
  #ZzK5E5IlKij2TmDa // Creates a new block blob and uploads the contents of a buffer.
  #xsccISUNf8eYpt1C contract→requires($buffer→count > 0, "cannot create empty blob.");
  #BGpcmnSl2awA6Sv0 $opts := code→prep_options($options\u003f);
  #Tib6OPulUqRLBWQi app→javascript_async("local", "var buf = buffer.toNodeBuffer();\ncontainer.svc._putBlockBlob(container.name, blob_name, buf, null, buf.length, opts.value(),\nlib.protect(s,function(error, res, resp){\n  if (!opts.value().justTry) container.svc.tdError(error, \"create blob from buffer\");\n  if(error){\n     result = { error: error + \"\" }\n  }\n  else{\n        result=res;\n   }\nresume();\n}));");
  #x1kSgXCM82PUygEp $container→time_op($opts, "put");
}
#jcCKxpzRxS8XcJJg
action create_gzipped_block_blob_from_buffer(#JlohNWuq4lDlT7D2 container: * Container, #jk1wAXo2qqoFMOEZ blob_name: String, #zgdeERjX2t0U5OS0 buffer: Buffer, #Wm41sP0GA46Eb7JB options\u003f: * Create_Options) returns(#UtbGS9O8mB8ZB748 result: * Blob_Info) {
  #QnKr16OeaU4Ao3lk // Creates a new block blob with the buffer gzipped. `smartGzip` option will disable compression of images etc.
  #jLSp2OWiFmU7amf2 if `not` $options\u003f→smartGzip `or` $options\u003f→contentType→is_match_regex("(text/|javascript|xml|font/ttf)") then {
    #o82yhiJaoN3mPo30 $opts := code→prep_options($options\u003f);
    #CVpoSJFjtbDVmbvn app→javascript_async("local", "      opts = opts.value()\n      opts.contentEncoding = \"gzip\"\n      if (!opts.contentType) opts.contentType = \"text/plain\";\n      var ws = container.svc.createWriteStreamToBlockBlob(\n        container.name, \n        blob_name, \n        opts,\n        lib.protect(s, function(error, res, resp) {\n           container.svc.tdError(error, \"create gzipped blob\");\n           result = res;\n           resume();\n        }));\n      \n      var str = zlib.createGzip()\n      str.pipe(ws);\n      str.end(buffer.toNodeBuffer())");
    #xcciY9oPa9KPgUrY $container→time_op($opts, "put");
  }
  else {
    #L688Lv2Hy3aG8ri3 $result := code→create_block_blob_from_buffer($container, $blob_name, $buffer, $options\u003f);
  }
}
#kLrtsjf3o25bmOu0
table Create_Service_Options {
  type = "Object";
  exported = true;
  persistent = false;
  fields {
    #ih2TiVe4vvPGWpyp storage_account : String
    #xB2wuYLYGiM4yw3h storage_access_key : String
  }
}
#xDdXOhIX5uwvyu7T
action time_op(#d979ITPNw8UTfO2s container: * Container, #pdiv1TyE281PSsa2 opts: Json_Builder, #HpsmufJu4wWKfTL6 id: String) {
  #apk71qDl71AjRb3j $start := $opts→number("startTime");
  #GcJocQyTjMlNR2SB code→time_op_core($container, $start, $id);
  meta private;
  meta sync;
}
#SCiKSh1f2RINq5LQ
action storage_account(#NlQvC7X2LQgVGvIi blob_service: * Blob_Service) returns(#Ah8fUKp7P0sbIb7A name: String) {
  #U8fzwxn0CD6ozL3u // Storage account name for this service
  #eMMj4EuOnT2bwzI9 app→javascript("local", "name = blob_service.tdAccount");
  meta sync;
}
#xQY4q6S82jkgdmC7
action service(#a3wbxs0D87Hgauoz container: * Container) returns(#u3ZiQ4EdPswYYvd2 svc: * Blob_Service) {
  #xT42Zgrvzy1d7MxH // Gets the service of the container.
  #YGdXEXz6GLU2Efi7 app→javascript("local", "svc = container.svc");
  meta sync;
}
#NsQlcDLbHBps42be
action time_op_core(#eq4Pb8T7kQF578YY container: * Container, #qGiGCRYgRBQU4Wzl start: Number, #YZFncmIsW51OmEz7 id: String) {
  #UD5lG48PLbHGiunG $delta := data→logger→logger_duration - $start;
  #DQ4dymHcQ0pkFOoe data→logger→measure($id ∥ "@" ∥ $container→service→storage_account, $delta);
  meta private;
  meta sync;
}


