meta version "v2.2,js,ctx,refs,localcloud,unicodemodel,allasync,upperplex";
meta name "test web service";
meta icon "Stacks";
meta color "#fffdee00";
meta rootId "mqpIMLvQVb0DrV6XG4LtUJRG";
meta iconArtId "wyfreugv";
meta isLibrary "yes";
meta allowExport "yes";
meta isCloud "yes";
meta hasIds "yes";
meta platform "network,npm,shell";
meta parentIds "";
// An blank web api using Node.JS and Restify. #node #azure #restify
#hkdJk0PY0mCLXVbl
action \_init() {
  #xrP4wNnbTdmGwj01 data→logger := app→create_logger("myweb");
  #QtAxoIsTyVwfk6G5 if false then {
    #R4zTMYLikaTZBrfz @\u267b→raygun→init;
    #GLzrZJ42jMseQLrv where `optional` save_report(json: Json_Object) {
      #GnjQuHeIVFB409fH $jsb := $json→to_json_builder;
      #ZSJwy0gW0QCO09Q5 $jsb→remove_field("logMessages");
      #IF2LVe8lTnWi7CrG app→log("SAVE: " ∥ $jsb→to_json→format(2));
      #YnfbdqUMwt4OoJll time→sleep(0.1);
    }
  }
  #xRJBjuFudnEyenZ7 if false then {
    #xJLmhq2fsKPUquCQ @\u267b→application_insights→init;
    #q93YioINi22OeFT9 @\u267b→loggly→init;
    #xYBa7fJU4f4ro8fo where global_tags := "ticktest";
  }
  #caGoQKL5l7xqC7eK code→init_restify;
  #Cd5DxpesZUO8bvRu data→logger→info("started...");
  #QLouxdglVFCsghd3 for 0 ≤ i < 0 do {
    #f8aytes3OFbdUPWz for 0 ≤ j < 1000 do {
      #VKOACQLMfAzr9ukN $buf := code→do_stuff3($j);
      #zACUEIcgf8CdCplW $s := $buf→sha256;
      #xyT5fXpfyOkAAYpX box→on_tapped($handler);
      #j3zLWJrkeE41iQO2 where handler() {
        #N5Y3nq2ZLn4cqljh `return` ;
      }
      #xVnuVaQ8wLWUdsCp for 0 ≤ k < 12 do {
        #kVjR4MZomtm4qUin `break` ;
      }
      #pluTLQ7QfyCuEFh7 $hash := @\u267b→node_crypto→create_hash("sha256");
      #cPoaidlf393Eo5wL $hash→update_hash($buf);
      #XAwHEw63EyoZjLzB $s2 := $hash→digest_hash→to_string("hex");
      #Cv5s1QBwJKFG5gZy if $s→equals($s2) then {
        #xbWwbIs6215NddTe skip;
      }
      else {
        #xC4rM42NwspxSSKA data→logger→error("fail: " ∥ $buf→to_string("hex") ∥ " : " ∥ $s ∥ " " ∥ $s2);
      }
    }
  }
  #C8dxxL52EnNrUc2z data→logger→info("test ok");
}
#xCPW1fPlwCImehlf meta import parallel {
  pub "fncvb"
  usage {
    type queue

    action `async` @for(count: Number, @action: Number_Action)
    action `async` for_batched(count: Number, batch_count: Number, item_action: Number_Action, batch_action: Action)
    action `sync` schedule(q: ♻ parallel → queue, task: Action)
    action `sync` create_queue(max_running: Number) returns(queue: ♻ parallel → queue)
    action `async` wait_for_empty(q: ♻ parallel → queue)
    action `async` for_json(js: Json_Object, @action: Json_Action)
  }
}
#M44H2RZY7ciRZjMB
var logger : App_Logger {
  transient = true;
}
#ydGSRyHpvO06Fhj0
action init_restify() {
  #xjDRnL9TIWXxijYc $server := @\u267b→restify→server;
  #XUV4L0d09amiI3DY $server→use(@\u267b→restify→authorization_parser);
  #jqy1pK7b4gOMxpY1 $server→pre(@\u267b→restify→sanitize_path);
  #MDl5Uf4i479WeeBS $server→use(@\u267b→restify→CORS);
  #svYlugOrG38VF48L $server→use(@\u267b→restify→body_parser);
  #sC14pFiP9o84Uu2F $server→use(@\u267b→restify→gzip_response);
  #p3Z2VxSonb7hvSWl $server→use(@\u267b→restify→query_parser);
  #w38zFTspeupLceny $server→use(@\u267b→restify→conditional_request);
  #grb2W2ODN9W9EdiO code→init_routes();
  meta private;
}
#t5EqAgqSAsZYMyNi meta import restify {
  pub "sfzpe"
  usage {

    action `async` `type` Request_Handler(req: ♻ restify → Request, res: ♻ restify → Response)
    #xLPhdjOebDT8w77X
    table Throttle_Options {
      type = "Object";
      exported = true;
      persistent = false;
      fields {
        #xo6LfV0hyAQtz675 rate : Number
        #yZ2QZAfeW3W74JA1 burst : Number
        #JUlNvDq7Hm9cTUAG ip : Boolean
        #w2h4dcf4I5K5h7kn xff : Boolean
        #RO3Sx6iTt4WsVBm6 username : Boolean
        #VbsYnDvr3t4Xr4VA maxKeys : Number
        #w25h9R5LKJnWiBNu tokensTable : ♻ restify → Tokens_Table
      }
    }
    #xdeuBx505IsZ6eEI
    table Serve_Static_Options {
      type = "Object";
      exported = true;
      persistent = false;
      fields {
        #NfWLVJBBbHvtMqkl default : String
        #KvIMj1sEoAwQCf22 maxAge : Number
      }
    }
    #mqEMUbizkEp6naSD
    table CORS_Options {
      type = "Object";
      exported = true;
      persistent = false;
      fields {
        #xMYYV6C3eS7PWsfQ origins : String
        #z5HdpFdSi792e1OX credentials : Boolean
        #Fw1D0A9ZfeMCf5c3 headers : String
      }
    }
    #w2zTzWkfMf01yOko
    table Body_Parser_Options {
      type = "Object";
      exported = true;
      persistent = false;
      fields {
        #mhaHCLobgUgMrv72 maxBodySize : Number
        #xr4fKleNd4wHHP1l mapParams : Boolean
        #st0ir2vLTxbLTQWB mapFiles : Boolean
        #z5ah2mZWb8c5FmTM overrideParams : Boolean
      }
    }
    #xv4yZciZi2wFoqpM
    table Send_Options {
      type = "Object";
      exported = true;
      persistent = false;
      fields {
        #svWYln7UIackFIpB status : Number
      }
    }
    #BVGhpbmca
    table HTTP_Status_Codes {
      type = "Object";
      exported = true;
      persistent = false;
      fields {
        #BVGhpbmcaMjAwIE9L @200_OK : Number
        #BVGhpbmcaMjAxIENyZWF0ZWQa @201_Created : Number
        #BVGhpbmcaMzAwIE11bHRpcGxlIENob2ljZXMa @300_Multiple_Choices : Number
        #BVGhpbmcaMzAxIE1vdmVkIFBlcm1hbmVudGx5 @301_Moved_Permanently : Number
        #BVGhpbmcaMzAyIE1vdmVkIFRlbXBvcmFyaWx5 @302_Moved_Temporarily : Number
        #BVGhpbmcaMzAzIFNlZSBPdGhlcgaa @303_See_Other : Number
        #BVGhpbmcaMzA0IE5vdCBNb2RpZmllZAaa @304_Not_Modified : Number
        #BVGhpbmcaMzA3IFRlbXBvcmFyeSBSZWRpcmVjdAaa @307_Temporary_Redirect : Number
        #BVGhpbmcaNDAwIEJhZCBSZXF1ZXN0 @400_Bad_Request : Number
        #BVGhpbmcaNDAxIFVuYXV0aG9yaXplZAaa @401_Unauthorized : Number
        #BVGhpbmcaNDAyIFBheW1lbnQgUmVxdWlyZWQa @402_Payment_Required : Number
        #BVGhpbmcaNDAzIEZvcmJpZGRlbgaa @403_Forbidden : Number
        #BVGhpbmcaNDA0IE5vdCBGb3VuZAaa @404_Not_Found : Number
        #BVGhpbmcaNDA1IE1ldGhvZCBOb3QgQWxsb3dlZAaa @405_Method_Not_Allowed : Number
        #BVGhpbmcaNDA4IFJlcXVlc3QgVGltZW91dAaa @408_Request_Timeout : Number
        #BVGhpbmcaNDA5IENvbmZsaWN0 @409_Conflict : Number
        #BVGhpbmcaNDEwIEdvbmUa @410_Gone : Number
        #BVGhpbmcaNDEyIFByZWNvbmRpdGlvbiBGYWlsZWQa @412_Precondition_Failed : Number
        #BVGhpbmcaNDEzIFJlcXVlc3QgRW50aXR5IFRvbyBMYXJnZQaa @413_Request_Entity_Too_Large : Number
        #BVGhpbmcaNDE1IFVuc3VwcG9ydGVkIE1lZGlhIFR5cGUa @415_Unsupported_Media_Type : Number
        #BVGhpbmcaNDE4IEltIGEgdGVhcG90 @418_Im_a_teapot : Number
        #BVGhpbmcaNDIyIFVucHJvY2Vzc2FibGUgRW50aXR5 @422_Unprocessable_Entity : Number
        #BVGhpbmcaNDIzIExvY2tlZAaa @423_Locked : Number
        #BVGhpbmcaNDI0IEZhaWxlZCBEZXBlbmRlbmN5 @424_Failed_Dependency : Number
        #BVGhpbmcaNDI1IFVub3JkZXJlZCBDb2xsZWN0aW9u @425_Unordered_Collection : Number
        #BVGhpbmcaNDI5IFRvbyBNYW55IFJlcXVlc3Rz @429_Too_Many_Requests : Number
        #BVGhpbmcaNTAwIEludGVybmFsIFNlcnZlciBFcnJvcgaa @500_Internal_Server_Error : Number
        #BVGhpbmcaNTAxIE5vdCBJbXBsZW1lbnRlZAaa @501_Not_Implemented : Number
        #BVGhpbmcaNTAzIFNlcnZpY2UgVW5hdmFpbGFibGUa @503_Service_Unavailable : Number
      }
    }
    type Request
    type Response
    type Tokens_Table
    type Server
    type Middleware
    type Error

    action `sync` use(server: ♻ restify → Server, mid: ♻ restify → Middleware)
    action `sync` get(server: ♻ restify → Server, path: String, @then: ♻ restify → Request_Handler)
    action `sync` post(server: ♻ restify → Server, path: String, @then: ♻ restify → Request_Handler)
    action `sync` server() returns(server: ♻ restify → Server)
    action `sync` send(res: ♻ restify → Response, content: String, options\u003f: ♻ restify → Send_Options)
    action `sync` status(res: ♻ restify → Response, status: Number)
    action `sync` is(req: ♻ restify → Request, type: String) returns(r: Boolean)
    action `sync` accepts(req: ♻ restify → Request, types: String) returns(type: String)
    action `sync` put(server: ♻ restify → Server, path: String, @then: ♻ restify → Request_Handler)
    action `sync` del(server: ♻ restify → Server, path: String, @then: ♻ restify → Request_Handler)
    action `sync` head(server: ♻ restify → Server, path: String, @then: ♻ restify → Request_Handler)
    action `sync` pre(server: ♻ restify → Server, mid: ♻ restify → Middleware)
    action `sync` CORS(options\u003f: ♻ restify → CORS_Options) returns(mid: ♻ restify → Middleware)
    action `sync` conditional_request() returns(mid: ♻ restify → Middleware)
    action `sync` route(server: ♻ restify → Server, method: String, path: String, @then: ♻ restify → Request_Handler)
    action `sync` json(res: ♻ restify → Response, content: Json_Object, options\u003f: ♻ restify → Send_Options)
    action `sync` next(res: ♻ restify → Response)
    action `sync` next_error(res: ♻ restify → Response, error: ♻ restify → Error)
    action `sync` address(server: ♻ restify → Server) returns(address: String)
    action `sync` gzip_response() returns(mid: ♻ restify → Middleware)
    action `sync` header(req: ♻ restify → Request, name: String) returns(value: String)
    action `sync` is_secure(req: ♻ restify → Request) returns(r: Boolean)
    action `sync` is_chunked(req: ♻ restify → Request) returns(r: Boolean)
    action `sync` is_keep_alive(req: ♻ restify → Request) returns(r: Boolean)
    action `sync` set_header(res: ♻ restify → Response, name: String, value: String)
    action `sync` body_parser(options\u003f: ♻ restify → Body_Parser_Options) returns(mid: ♻ restify → Middleware)
    action `sync` throttle(options\u003f: ♻ restify → Throttle_Options) returns(middleware: ♻ restify → Middleware)
    action `sync` date_parser(clock_skew: Number) returns(middleware: ♻ restify → Middleware)
    action `sync` serve_static(directory: String, options\u003f: ♻ restify → Serve_Static_Options) returns(middleware: ♻ restify → Middleware)
    action `sync` query_parser() returns(middleware: ♻ restify → Middleware)
    action `sync` authorization_parser() returns(middleware: ♻ restify → Middleware)
    action `sync` jsonp() returns(middleware: ♻ restify → Middleware)
    action `sync` body_as_json(req: ♻ restify → Request) returns(body: Json_Object)
    action `sync` id(req: ♻ restify → Request) returns(id: String)
    action `sync` param(req: ♻ restify → Request, name: String) returns(value: String)
    action `sync` opts(server: ♻ restify → Server, path: String, @then: ♻ restify → Request_Handler)
    action `sync` patch(server: ♻ restify → Server, path: String, @then: ♻ restify → Request_Handler)
    action `sync` to_string(ser: ♻ restify → Server) returns(s: String)
    action `sync` sanitize_path() returns(middleware: ♻ restify → Middleware)
    action `sync` body(req: ♻ restify → Request) returns(body: String)
    action `sync` send_error(res: ♻ restify → Response, status: Number, message: String)
    action `sync` all(server: ♻ restify → Server, @then: ♻ restify → Request_Handler)
    action `sync` method(req: ♻ restify → Request) returns(method: String)
    action `sync` url(req: ♻ restify → Request) returns(url: String)
    action `sync` query(req: ♻ restify → Request) returns(query: Json_Object)
    action `sync` redirect(res: ♻ restify → Response, status_code: Number, url: String)
    action `sync` send_status(res: ♻ restify → Response, status_code: Number)
    action `sync` charset(res: ♻ restify → Response, encoding: String)
    action `sync` route_regex(server: ♻ restify → Server, method: String, path_regex: String, @then: ♻ restify → Request_Handler)
    action `async` read_body_as_buffer(req: ♻ restify → Request) returns(body: Buffer)
    action `sync` headers(req: ♻ restify → Request) returns(headers: Json_Object)
    action `sync` server_url(req: ♻ restify → Request) returns(url: String)
    action `sync` html(res: ♻ restify → Response, content: String, options\u003f: ♻ restify → Send_Options)
    action `sync` send_text(res: ♻ restify → Response, content: String, content_type: String, options\u003f: ♻ restify → Send_Options)
    action `sync` send_buffer(res: ♻ restify → Response, content: Buffer, content_type: String, options\u003f: ♻ restify → Send_Options)
    action `sync` finished(res: ♻ restify → Response) returns(done: Boolean)
    action `sync` http() returns(codes: ♻ restify → HTTP_Status_Codes)
    action `sync` remote_ip(req: ♻ restify → Request) returns(ip: String)
    action `sync` disable_ticks()
    action `sync` send_custom_error(res: ♻ restify → Response, status: Number, message: String)
  }
}
#BAgGEgpLOhr1a4MF
action init_routes() {
  #DdRcAlUx4fXaKiJk $server := @\u267b→restify→server;
  #mGfp9bfCnw5z8WPD $server→get("/", $@then);
  #I85zmFj6uN69G2k2 where @then(req: ♻ restify → Request, res: ♻ restify → Response) {
    #x9v0by2TEguzyW0Q $res→send(app→server_setting("PORT", false));
  }
  #atoR3fT8SF1C31qD $server→get("/id", $@then);
  #HyWRmeULmI2St2DB where @then(req: ♻ restify → Request, res: ♻ restify → Response) {
    #SzsvJOFxTqzdVKNM $res→send(app→server_setting("TD_WORKER_ID", false));
  }
  #Vs7U29e8kH0T6l64 $server→get("/meta", $@then);
  #zp4YucX7cqFX4HCM where @then(req: ♻ restify → Request, res: ♻ restify → Response) {
    #Yzbwm7irDaW22Com $res→json(web→json(app→server_setting("TD_DEPLOYMENT_META", false)));
  }
  #D8XdD4qfF4YL6Aph $server→get("/ip", $@then);
  #KxKekHAFuKo4XbkK where @then(req: ♻ restify → Request, res: ♻ restify → Response) {
    #xFE4GNGngdLqO7l2 $res→send($req→remote_ip);
  }
  #ymUrRfgBWMi6MAww $server→get("/print", $@then);
  #cvqctp2X657vaaQP where @then(req: ♻ restify → Request, res: ♻ restify → Response) {
    #VzXnp83slmunFWKc data→logger→debug("before");
    #Ptdux4w3zk6BhD6A $res→send_text("Hello world!", "text/plain");
    #xyW3g45RctgSXbvF data→logger→debug("after");
  }
  #xjgge4qkSa3w6AOn $server→get("/crash", $@then);
  #FFpJ6dm7fH4jMOG2 where @then(req: ♻ restify → Request, res: ♻ restify → Response) {
    #IxUqHvfG1oZX26VY code→do_stuff2;
    #O94OBWgpAnnZUPJJ $res→send(app→server_setting("PORT", false));
  }
  #x3YXaF6xFV4fe4Vc $server→get("/log", $@then);
  #xE80B4RaC0RhMFtD where @then(req: ♻ restify → Request, res: ♻ restify → Response) {
    #uA2T9T4P4OvDF8md app→javascript("local", "setTimeout(function() {\n   lib.App.logException(new Error(\"foo\"))\n}, 100)");
    #xJEtI8HsuNOv23WO $res→send(app→server_setting("PORT", false));
  }
  #x0zVmzleAtpic1eb $server→get("/loop", $@then);
  #xpwmGXDeRFA5Olem where @then(req: ♻ restify → Request, res: ♻ restify → Response) {
    #oJ6DKv1QxIr9iY6O app→javascript("local", "var num = 0;\nsetInterval(function() {\n  if (++num > 3) { \n     throw new Error(\"num \" + num)\n  }\n}, 1000)");
    #YeweuykTwrbb6cBn $res→send(app→server_setting("PORT", false));
  }
  #DsjWsMk2e42IS1BK $server→get("/crash2", $@then);
  #XsSg22WBMBvvBXw4 where @then(req: ♻ restify → Request, res: ♻ restify → Response) {
    #BIeqQcjZjucJ15V3 $ref := create→Ref_of→Task_of→Nothing;
    #xD8tzRQB1Wel4zXt @\u267b→parallel→@for(3, $@action);
    #gLxnNAfSeG2mVcZQ where @action(x: Number) {
      #xoss9Y2LAhVkryoP time→sleep(0.1);
      #YAi6Z0IT3pdNA57m if $x = 2 then {
        #xkivHFwk36hEX1Dp $ref→\u25c8set( `async` code→crash_js);
      }
    }
    #xH31AMekhSEir7Io $ref→\u25c8get→await;
    #sy7KE5z4L5xdHP3W $res→send(app→server_setting("PORT", false));
  }
  #t3SncZuF8OJvUqSU $server→get("/crash3", $@then);
  #mFDD6QTU22VspApy where @then(req: ♻ restify → Request, res: ♻ restify → Response) {
    #bX8kjf5yO2NiQ4Qw app→javascript_async("local", "lib.protect(s, function() {  setTimeout(function() { throw new Error(\"blah\") }, 2000) })()");
  }
  #uHNfIHIVCkAXeAk3 $server→get("/:user/info", $@then);
  #QzELzYySlp4qTWos where @then(req: ♻ restify → Request, res: ♻ restify → Response) {
    #XXSD6QRnT3CxDwsR $jsb := web→create_json_builder;
    #qM9yA8OsPUtF3ku6 $jsb→set_string("name", $req→param("user"));
    #kw6tq23ICc3XL3Dq $res→json($jsb→to_json);
  }
  #YK481bS38W0tBV3t $logger := app→create_logger("shout");
  meta private;
}
#bciKRFYkzd7x8wYO
action do_stuff() {
  #ebC4IPOWc8sS2De9 time→sleep(0.1);
  #kxD2wYUz5aOpNgtc code→some_more_init;
  #MGOYiuxvj9DChg9Q while false do {
    #wNb8Rb8QIM42qgCM time→sleep(0.01);
    #xZ2Egx9P2eE7728g $r := code→fib(27);
    #YPrQwe9IMvIawlif $jsb := web→create_json_builder;
    #vD5EE5GAtc7fiviS app→javascript("local", "jsb.item = process.memoryUsage()");
    #yXrxs9ohzEfXUISe data→logger→info("fib 30 = " ∥ $jsb→serialize);
  }
  #xmA4wjvJ9GvJ9nPM for 0 ≤ i < 0 do {
    #zIiS0Jw2s8r4iyis data→logger→info("some very long message some very long message some very long message some very long message some very long message some very long message some very long message some very long message some very long message some very long message some very long message some very long message some very long message some very long message some very long message some very long message some very long message some very long message some very long message some very long message some very long message some very long message some very long message some very long message some very long message some very long message some very long message some very long message some very long message some very long message some very long message some very long message some very long message some very long message some very long message some very long message some very long message some very long message some very long message some very long message some very long message some very long message some very long message some very long message some very long message some very long message some very long message some very long message some very long message some very long message some very long message some very long message some very long message some very long message some very long message some very long message some very long message some very long message some very long message some very long message some very long message some very long message some very long message ");
  }
  #G7sqZLGR0a8PBLsj skip;
  meta private;
}
#x8XQvbfFlPtROwUP
action fib(#VB3lKZSTOjd40lGe p: Number) returns(#DzaonFsAkexOGzdL r: Number) {
  #LdeEaiTVFWJvrh1E if $p < 2 then {
    #bHFp19kFhyfztMSM $r := $p;
  }
  else {
    #mkyLpD8yteCMmbgo $r := code→fib($p - 1) + code→fib($p - 2);
  }
  meta private;
  meta sync;
}
#gsPZPx2UV7riZLnc meta import cached_store {
  pub "yhjxa"
  usage {

    action `async` `type` update_json(entry: Json_Builder)
    #Spddu0xP2iOY2SL0
    table create_options {
      type = "Object";
      exported = true;
      persistent = false;
      fields {
        // Do not use Redis cache for this container (for example, because the entries are too big).
        #IePHYSycQLbNNiNO no_cache : Boolean
        // Blob container access level.
        // {hints:private,hidden,public}
        #LlczXp2THwomk4Uc access : String
        // If non-zero entries are cached in memory for given number of seconds.
        // {hints:1,5,10}
        #isxo1KsBt8t2QMyT in_memory_cache_seconds : Number
        // How long to keep entries in redis. 0 - forever.
        // {hints:10,60,600,3600}
        #lWau2JFr5mjWbcRM redis_cache_seconds : Number
        // Use a different blob service.
        #PVxGDOL887ZiDwK9 blob_service : ♻ azure_blob_storage → Blob_Service
        #dx4d4sjKuF7BiuWb no_blob_storage : Boolean
      }
    }
    type container

    action `async` create_container(name: String, options\u003f: ♻ cached_store → create_options) returns(container: ♻ cached_store → container)
    action `async` init()
    action `async` try_insert(container: ♻ cached_store → container, name: String, data_: Json_Builder) returns(ok: Boolean)
    action `async` update(container: ♻ cached_store → container, name: String, update: ♻ cached_store → update_json)
    action `async` get(container: ♻ cached_store → container, name: String) returns(entry: Json_Object)
    action `async` insert_unique(container: ♻ cached_store → container, data_: Json_Builder, min_id_length: Number) returns(id: String)
    action `sync` fresh_short_id(len: Number) returns(id: String)
    action `async` insert_at_hash(container: ♻ cached_store → container, entry: Json_Builder) returns(id: String)
    action `async` name(container: ♻ cached_store → container) returns(name: String)
    action `async` get_many(container: ♻ cached_store → container, names: Collection[String]) returns(entries: Collection[Json_Object])
    action `async` blob_container(container: ♻ cached_store → container) returns(blob_cont: ♻ azure_blob_storage → Container)
    action `async` now() returns(ms: Number)
    action `async` now_seconds() returns(sec: Number)
    action `async` seq_id() returns(id: Number)
    action `async` inv_seq_id() returns(id: Number)
    action `sync` logger_() returns(log: App_Logger)
    action `async` just_insert(container: ♻ cached_store → container, name: String, data_: Json_Builder)
  }
  #DpwhdcCgxrCE2r29 resolve azure_blob_storage = ♻ azure_blob_storage with {
  }
  #fvdgFwHBgeRCAh5f resolve node_crypto = ♻ node_crypto with {
  }
  #TFmu4i4vHxdak180 resolve redis = ♻ redis with {
  }
  #kMA58OGaoDMVWXfW resolve parallel = ♻ parallel with {
  }
}
#xczFmmFkDnvUZszL meta import azure_blob_storage {
  pub "oppr"
  usage {
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
    type Blob_Service
    type Container
    type Blob_Info

    action `sync` init()
    action `sync` create_random_id(size: Number) returns(id: String)
    action `sync` create_blob_service(options\u003f: ♻ azure_blob_storage → Create_Service_Options) returns(blob_service: ♻ azure_blob_storage → Blob_Service)
    action `async` create_container_if_not_exists(blob_service: ♻ azure_blob_storage → Blob_Service, container_name: String, permission: String) returns(container: ♻ azure_blob_storage → Container)
    action `async` create_block_blob_from_local_file(container: ♻ azure_blob_storage → Container, blob_name: String, file_path: String) returns(result: ♻ azure_blob_storage → Blob_Info)
    action `async` create_block_blob_from_text(container: ♻ azure_blob_storage → Container, blob_name: String, text: String, options\u003f: ♻ azure_blob_storage → Create_Options) returns(result: ♻ azure_blob_storage → Blob_Info)
    action `async` get_blob_to_file(container: ♻ azure_blob_storage → Container, blob_name: String, file_path: String) returns(result: ♻ azure_blob_storage → Blob_Info)
    action `async` get_blob_to_text(container: ♻ azure_blob_storage → Container, blob_name: String, options\u003f: ♻ azure_blob_storage → Get_Options) returns(info: ♻ azure_blob_storage → Blob_Info)
    action `async` delete_blob(container: ♻ azure_blob_storage → Container, blob_name: String)
    action `async` get_blob_to_buffer(container: ♻ azure_blob_storage → Container, blob_name: String, options\u003f: ♻ azure_blob_storage → Get_Options) returns(result: ♻ azure_blob_storage → Blob_Info, buf: Buffer)
    action `async` set_service_properties(blob_service: ♻ azure_blob_storage → Blob_Service, properties: Json_Object) returns(result: Json_Object, response: Json_Object)
    action `async` set_cors_properties(blob_service: ♻ azure_blob_storage → Blob_Service, allowed_origins: String, allowed_methods: String, allowed_headers: String, exposed_headers: String, max_age_in_seconds: Number) returns(success: Boolean)
    action `async` service_properties(blob_service: ♻ azure_blob_storage → Blob_Service) returns(result: Json_Object, response: Json_Object)
    action `sync` etag(inf: ♻ azure_blob_storage → Blob_Info) returns(etag: String)
    action `sync` last_modified(inf: ♻ azure_blob_storage → Blob_Info) returns(lastmod: DateTime)
    action `sync` content_md5(inf: ♻ azure_blob_storage → Blob_Info) returns(md5: Buffer)
    action `async` list_blobs(container: ♻ azure_blob_storage → Container, prefix: String) returns(blobs: Collection[ ♻ azure_blob_storage → Blob_Info])
    action `sync` name(inf: ♻ azure_blob_storage → Blob_Info) returns(blob_name: String)
    action `sync` get_blob_url(container: ♻ azure_blob_storage → Container, blob_name: String, expires: Number) returns(blob_url: String)
    action `sync` generate_random_id(blob_service: ♻ azure_blob_storage → Blob_Service) returns(id: String)
    action `async` get_blob_properties(container: ♻ azure_blob_storage → Container, blob_name: String) returns(info: ♻ azure_blob_storage → Blob_Info)
    action `sync` succeded(inf: ♻ azure_blob_storage → Blob_Info) returns(ok: Boolean)
    action `sync` text(inf: ♻ azure_blob_storage → Blob_Info) returns(text: String)
    action `sync` error(inf: ♻ azure_blob_storage → Blob_Info) returns(message: String)
    action `sync` url(container: ♻ azure_blob_storage → Container) returns(url: String)
    action `async` create_block_blob_from_url(container: ♻ azure_blob_storage → Container, blob_name: String, url: String, options\u003f: ♻ azure_blob_storage → Create_Options) returns(result: ♻ azure_blob_storage → Blob_Info)
    action `sync` generate_shared_access_signature(container: ♻ azure_blob_storage → Container, blob_name: String, permissions: String, minutes: Number) returns(blobSAS: String)
    action `sync` set_log_level(blob_service: ♻ azure_blob_storage → Blob_Service, level: String)
    action `async` delete_container(blob_service: ♻ azure_blob_storage → Blob_Service, container_name: String)
    action `async` create_block_blob_from_buffer(container: ♻ azure_blob_storage → Container, blob_name: String, buffer: Buffer, options\u003f: ♻ azure_blob_storage → Create_Options) returns(result: ♻ azure_blob_storage → Blob_Info)
    action `async` create_gzipped_block_blob_from_buffer(container: ♻ azure_blob_storage → Container, blob_name: String, buffer: Buffer, options\u003f: ♻ azure_blob_storage → Create_Options) returns(result: ♻ azure_blob_storage → Blob_Info)
    action `sync` storage_account(blob_service: ♻ azure_blob_storage → Blob_Service) returns(name: String)
    action `sync` service(container: ♻ azure_blob_storage → Container) returns(svc: ♻ azure_blob_storage → Blob_Service)
  }
}
#xCF7vJiKwa1bVEtR meta import node_crypto {
  pub "oevpc"
  usage {
    type credentials
    type hash
    type hmac
    type cipher
    type decipher
    type sign
    type verify
    type DiffieHellman

    action `sync` get_ciphers() returns(ciphers: Collection[String])
    action `sync` get_hashes() returns(hashes: Collection[String])
    action `sync` create_credentials(details: Json_Object) returns(credentials: ♻ node_crypto → credentials)
    action `sync` create_hash(algorithm: String) returns(hash: ♻ node_crypto → hash)
    action `sync` update_hash(hash: ♻ node_crypto → hash, hash_data: Buffer)
    action `sync` digest_hash(hash: ♻ node_crypto → hash) returns(digest: Buffer)
    action `sync` update_hmac(hmac: ♻ node_crypto → hmac, hmac_data: Buffer)
    action `sync` digest_hmac(hmac: ♻ node_crypto → hmac) returns(digest: Buffer)
    action `sync` create_cipher(algorithm: String, password: Buffer) returns(cipher: ♻ node_crypto → cipher)
    action `sync` create_cipher_iv(algorithm: String, key: Buffer, iv: Buffer) returns(iv_cipher: ♻ node_crypto → cipher)
    action `sync` update_cipher(cipher: ♻ node_crypto → cipher, _data: Buffer) returns(enciphered: Buffer)
    action `sync` final(cipher: ♻ node_crypto → cipher) returns(cipher_final: Buffer)
    action `sync` set_auto_padding(cipher: ♻ node_crypto → cipher)
    action `sync` create_decipher(algorithm: String, password: Buffer) returns(decipher: ♻ node_crypto → decipher)
    action `sync` create_decipher_iv(algorithm: String, key: Buffer, iv: Buffer) returns(iv_decipher: ♻ node_crypto → decipher)
    action `sync` update_decipher(decipher: ♻ node_crypto → decipher, _data: Buffer) returns(deciphered: Buffer)
    action `sync` final_(decipher: ♻ node_crypto → decipher) returns(decipher_final: Buffer)
    action `sync` set_auto_padding_(decipher: ♻ node_crypto → decipher)
    action `sync` create_sign(algorithm: String) returns(sign: ♻ node_crypto → sign)
    action `sync` update_sign(sign: ♻ node_crypto → sign, sign\_data: Buffer)
    action `sync` sign_(sign: ♻ node_crypto → sign, private_key: String) returns(signature: Buffer)
    action `sync` create_verify(algorithm: String) returns(verify: ♻ node_crypto → verify)
    action `sync` update_verify(verify: ♻ node_crypto → verify, verify_data: Buffer)
    action `sync` verify_(verify: ♻ node_crypto → verify, object: String, signature: Buffer) returns(valid: Boolean)
    action `sync` create_DiffieHellman(prime_length: Number) returns(DiffieHellman: ♻ node_crypto → DiffieHellman)
    action `sync` generate_keys(DiffieHellman: ♻ node_crypto → DiffieHellman) returns(public_key: Buffer)
    action `sync` compute_secret(DiffieHellman: ♻ node_crypto → DiffieHellman, other_public_key: Buffer) returns(shared_secret: Buffer)
    action `sync` get_prime(DiffieHellman: ♻ node_crypto → DiffieHellman) returns(DH_prime: Buffer)
    action `sync` get_generator(DiffieHellman: ♻ node_crypto → DiffieHellman) returns(generator: Buffer)
    action `sync` get_public_key(DiffieHellman: ♻ node_crypto → DiffieHellman) returns(public_key: Buffer)
    action `sync` get_private_key(DiffieHellman: ♻ node_crypto → DiffieHellman) returns(private_key: Buffer)
    action `sync` set_public_key(DiffieHellman: ♻ node_crypto → DiffieHellman, public_key: Buffer)
    action `sync` set_private_key(DiffieHellman: ♻ node_crypto → DiffieHellman, private_key: Buffer)
    action `sync` get_DiffieHellman(group_name: String) returns(DiffieHellman: ♻ node_crypto → DiffieHellman)
    action `async` pbkdf2(password: String, salt: String, iterations: Number, keylen: Number) returns(derived_key: String)
    action `async` random_bytes(size: Number) returns(strong_data: Buffer)
    action `sync` DEFAULT\_ENCODING() returns(default_encoding: String)
    action `sync` create_hmac(algorithm: String, key: String) returns(hmac: ♻ node_crypto → hmac)
    action `sync` create_DiffieHellmanWithPrime(prime: Buffer) returns(DiffieHellman: ♻ node_crypto → DiffieHellman)
    action `async` pseudo_random_bytes(size: Number) returns(non\u002dstrong_data: Buffer)
    action `sync` update_hash_string(hash: ♻ node_crypto → hash, hash_data: String)
    action `async` new_guid() returns(guid: String)
  }
}
#xA95P1gPt7Mxw0I4 meta import redis {
  pub "yuazc"
  usage {
    type Client

    action `async` create_client(host: String, port: Number, password: String) returns(client: ♻ redis → Client)
    action `async` set(client: ♻ redis → Client, key: String, value: String)
    action `async` get(client: ♻ redis → Client, key: String) returns(value: String)
    action `async` send_command(client: ♻ redis → Client, command: String, args: Json_Object) returns(result: Json_Object)
    action `async` sadd(client: ♻ redis → Client, key: String, value: String) returns(added: Number)
    action `async` scard(client: ♻ redis → Client, key: String) returns(count: Number)
    action `async` smembers(client: ♻ redis → Client, key: String) returns(members: Json_Object)
    action `async` multi(client: ♻ redis → Client) returns(multi: ♻ redis → Client)
    action `async` exec(client: ♻ redis → Client) returns(js: Json_Object)
    action `async` eval(client: ♻ redis → Client, @script: String, keys: Collection[String], args: Collection[String]) returns(value: Json_Object)
    action `async` mget(client: ♻ redis → Client, keys: Collection[String]) returns(values: Json_Object)
    action `async` setpx(client: ♻ redis → Client, key: String, value: String, px: Number)
    action `async` server_time(client: ♻ redis → Client) returns(millis: Number)
    action `async` cached_time(client: ♻ redis → Client) returns(millis: Number)
    action `async` incr(client: ♻ redis → Client, key: String) returns(newvalue: Number)
    action `async` setnx(client: ♻ redis → Client, key: String, value: String) returns(ok: Boolean)
    action `async` publish(client: ♻ redis → Client, channel: String, value: String)
    action `async` wait_on(client: ♻ redis → Client, channel: String, timeout: Number) returns(message: String)
    action `async` info(client: ♻ redis → Client) returns(info: Json_Object)
    action `async` del(client: ♻ redis → Client, key: String) returns(removed: Boolean)
    action `async` is_status_late(client: ♻ redis → Client) returns(late: Boolean)
  }
}
#jc09anLkBe5wgW2x meta import raygun {
  pub "sxkx"
  usage {
    #BVGhpbmca
    table Options {
      type = "Object";
      exported = true;
      persistent = false;
      fields {
        #K3wczhabgw7o4wJC api_key : String
        #J3NqozyJp1k43sYp version : String
        #N3W417bSw0gWY34s @private : Boolean
        #HP2dryz9DRL5wcyE save_report : Json_Action
      }
    }

    action `async` init(options\u003f: ♻ raygun → Options)
  }
}
#RJFeKivKy42gj26K
action some_more_init() {
  #EW194weY8hMAPebL @\u267b→cached_store→init;
  meta private;
}
#XjedcLWO4yv89HUO
action do_stuff2() {
  #j325Ni4SLI6fRr4Y code→some_more_init;
  #FoWY9QgeOWehJM4w 12;
  meta private;
}
#I0eADY5tqvyVL84o meta import loggly {
  pub "aidug"
  usage {
    #BdGhpbmca
    table Options {
      type = "Object";
      exported = true;
      persistent = false;
      fields {
        // Loggly token; if empty, ``LOGGLY_TOKEN`` is used.
        #RAXgxV0uECzkkl9Z token : String
        // Loggly subdomain; if empty `LOGGLY_SUB_DOMAIN` is used
        #chjdHxLXLSMJaYlo subdomain : String
        // Semi-colon separated list of tags
        #x3BL1W1iFawrEzjY global_tags : String
        // Interval in seconds between bulk uploads
        #VQxrE3f4lNoKE6fB upload_interval : Number
        // Messages on this and lower levels will be logged; defaults to 7 (everything)
        #OmNPxjOpBP6tE8yz min_level : Number
      }
    }

    action `async` init(options\u003f: ♻ loggly → Options)
    action `sync` set_min_level(level: Number)
  }
}
#nYI3WQsjiaCgOotr
action crash_js() {
  #rDqyfeiprkaZ1Loz app→javascript_async("local", "  setTimeout(function() { throw new Error(\"blah\") }, 100)");
  meta private;
}
#ou6BmyKwMI1zvq9k
action do_stuff3(#x4VHXuFj0mIUGfHM j: Number) returns(#zQpZXoBo1KrOOdk2 buf2: Buffer) {
  #xIXF4hBfmGlJluJV $buf := bits→create_buffer($j);
  #ANKcdjTB9SCCnd8M $buf→fill_random;
  #O4USFJG9zep4tybI `return` $buf;
  meta private;
  meta sync;
}
#JI89dppxk0rOWyZH
action die_after_a_minute() {
  #xMTsNknIGs1Rv03j time→sleep(65);
  #Icqn2Y8lfRSjSQBa app→javascript("local", "var arr = []\ns.d.arr = arr\nfor (var i = 0; true; i++) {\n  arr.push(new Buffer(128000))\n}");
  meta private;
}


