meta version "v2.2,js,ctx,refs,localcloud,unicodemodel,allasync,upperplex";
meta name "server auth";
meta rootId "x4fb1iQsPGHk69OKj55iZ1xG";
meta isLibrary "yes";
meta allowExport "yes";
meta hasIds "yes";
meta platform "current";
meta parentIds "";
#xD2KnDi65MvS2cAZ9AtjpO9E
action init(#w1GmKZkKmOL4BRxZ options\u003f: * Init_Options) {
  #Ouy41kuU6e1z26oz data→global_options := $options\u003f;
  #xhRfy4ySA22atUog if data→global_options→error_callback→is_invalid then {
    #VTTCK4GeEW3MjTyV data→global_options→error_callback→\u25c8set($t3);
    #A2eSkI4LpXN5iz1F where t3(res: ♻ restify → Response, msg: String) {
      #jclGp47KF2o2CxF5 if data→global_options→redirect_on_error→is_empty then {
        #xX6Us42Uaqyj619F $res→send_error(403, $msg);
      }
      else {
        #aCPshHvvjxSUW3sy $res→redirect(302, data→global_options→redirect_on_error);
      }
    }
  }
  #GMiEVBxQof5WwrPF if data→global_options→make_jwt→is_invalid then {
    #QLR156kAhUegEWk4 data→global_options→make_jwt→\u25c8set($lambda);
    #AdRvPtLdIW2jPKot where lambda(profile: * User_Info, oauth_req: * oauth_request) returns (jwt: Json_Builder) {
      #zakUMGmq1pp9jLdE $jwt := web→create_json_builder;
      #hx37B2ALMPyxOeBm $jwt→set_string("sub", $profile→id);
    }
  }
  #qj86ZIXKMoZb2rzi data→logger := app→create_logger("serverauth");
  #rs4k1Pmue8vje2k7 if data→global_options→get_data→is_invalid then {
    #Rxl5pF6LBA3O3LOS data→logger→info("using in-memory (single instance) storage");
    #xvFNYQXVkXtlA32Q $d := collections→create_string_map;
    #tABb2ihC468EQS2d data→global_options→get_data→\u25c8set( `fun:key` $d→at($key));
    #xGzBOXE7Lvs2QEHf data→global_options→set_data→\u25c8set($t);
    #Ty9pXTSD9YB3v1tg where t(key: String, value: String) {
      #Uzmg7Yqnt4n1GaTr $d→set_at($key, $value);
    }
  }
  #oJQMYnwFLf0ZxgDP if data→global_options→pre_dialog→is_invalid then {
    #Yhrf4pyBV487RF0w data→global_options→pre_dialog→\u25c8set($t2);
    #UkD5VxiG46UQy5or where t2(req: ♻ restify → Request, res: ♻ restify → Response) {
      #H2DVqlahGMYHVZT5 // Do nothing.
    }
  }
  #oF7YfDp2LXG6UGuo if `not` code→or_empty(data→global_options→federation_targets)→is_empty then {
    #CDxPTijFCHZaHpcQ data→fed_targets := data→global_options→federation_targets→split(",");
  }
  else {
    #DLYdZjAaXAcVCenl data→fed_targets := create→Collection_of→String;
  }
  #xkvtndChutUUaFRI data→token_secret := app→server_setting("TOKEN_SECRET", false);
  #xNtyK0ojD2RUxgnd code→init_restify;
  #SFODG40l8r8vnBAe data→logger→info("Started");
  meta sync;
}
#xk2Uor7tlm49QtKW02eJ7mtS
action to_query_string(#ptfK0rDmc6Dpz35S params: Json_Object) returns(#QSeUwRyU4C32VUQm query: String) {
  #suRlmo7jzO43D9lo $query := "";
  #xk9LBZ5Q0FoSZQUU foreach k in $params→keys
  do {
    #xe6O4ktxUnOIyQPr $text := $params→string($k);
    #fsunlA8QXEDEl4e4 if `not` code→or_empty($text)→is_empty `and` `not` $k→starts_with("_") then {
      #BCcpii235yXzKUck if `not` $query→is_empty then {
        #x15tMDm3ECou5UWj $query := $query ∥ "&";
      }
      #xIZ5g8mv0idZSRNi $query := $query ∥ web→encode_uri_component($k) ∥ "=" ∥ web→encode_uri_component($text);
    }
  }
  meta sync;
}
#BdGhpbmca
table oauth_request {
  type = "Object";
  exported = true;
  persistent = false;
  fields {
    #kSruwWW2tcLetBy9 state : String
    #Im4AdfBNgBzU2KHk71442ocV client\_id : String
    #xB4kQdKGDF2sp2GDElunehyP redirect\_uri : String
    #agsYI4YzaxX4i7elVuLDs25l scope : String
    #vXlx4PBkxGQLAGNZMckFuRo6 response\_type : String
    #uXrA4dyloZhHoVQDtca104v8 display : String
    #dWtpxLVDGFTEv5MkQh32zsv1 access\_token : String
    #sjG8WSOQZbsxPiqJ nonce : String
    #bxpLdFsHfGT2Nvb4 response\_mode : String
    #A6vsqu3p54zo4g6Z \_provider : String
    #TTmhSVZ1yy49CTVS \_client\_oauth : * client_oauth
    #eJtqudH2eBoc1bnM \_info : * User_Info
  }
}
#vAS7YqRPeyNPXSFT6CJtmPQJ
table token_req {
  type = "Object";
  persistent = false;
  fields {
    #q44N6KsxBDSvzySCPxDztNtR client\_id : String
    #Db4p2Lu02Onk4uDT4hpzlGLH redirect\_uri : String
    #l4CJEvj7XOF2R6pZMEv3mM74 code : String
    #yqQPCshjKVHyCaoGwiMFUAXy client\_secret : String
    #xKbTojsI9hENIL5IjLpdbd46 grant\_type : String
  }
}
#dkz1nxJN2g6fjHNI
action init_restify() {
  #nIz4C3sjtY3IqX7D $server := @\u267b→restify→server;
  #x7rU8UpNk3CUJKdd $server→get("/oauth/login", $@then);
  #x1co2XHEuSWYkzcz where @then(req: ♻ restify → Request, res: ♻ restify → Response) {
    #GxXsNLt8sdzYXR2g code→set_self($req);
    #qAjhUEyi2vKfTBni code→oauth_login($req, $res);
  }
  #suR3MU6kVNccrGud $server→post("/oauth/callback", $then2);
  #rgl2rF7RS9afcZid where then2(req: ♻ restify → Request, res: ♻ restify → Response) {
    #AwlJ4wtZ2Yqvr27S $query := code→from_query_string($req→body);
    #qxjwXSbv6iR9ceTl app→javascript("local", "req.body = query.value()");
    #x9rMZDwnVKfVhFYR $state := code→or_empty($query→string("state"));
    #S6ftk38aW0k3qdvB data→logger→debug("POST at callback: " ∥ $req→body_as_json→serialize);
    #dpgfdrj6iVywVxps code→handle_response($state, $req, $res);
  }
  #RNPSF7Gyg22bRi07 $server→get("/oauth/callback", $@then);
  #FX765XlARqGt6wNv where @then(req: ♻ restify → Request, res: ♻ restify → Response) {
    #Ak9MAIYJzB4KJSCx data→logger→debug("GET at callback: " ∥ $req→query→serialize);
    #dTkyDmfBhYxcu902 code→handle_response($req→query→string("state"), $req, $res);
  }
  #xAesHcpebNAYmmkz if data→debug then {
    #SqbygSzKZrh4wpky $server→get("/oauth/testlogin", $then3);
    #xlTjhf0p7qIl4uOi where then3(req: ♻ restify → Request, res: ♻ restify → Response) {
      #jm7Y4SlXQiwLF7rX $s3 := $req→server_url ∥ "/oauth/login?state=foobar&response_type=token&redirect_uri=" ∥ web→encode_uri_component($req→server_url ∥ "/oauth/testcallback");
      #YKi6sYMt9rhXrvVZ $res→redirect(303, $s3);
    }
    #CpcGv4SxEJeWMX4u $server→get("/oauth/testcallback", $then3);
    #xxrsRxO0H59okkKS where then3(req: ♻ restify → Request, res: ♻ restify → Response) {
      #ju5avnqwcoX1h7t4 $tok := code→decode_token($req→query→string("access_token"));
      #xx5XddX9G4yvw6uc if $tok→is_invalid then {
        #xD8irpy4HPEzHN5v $new := "<script>\nvar h = document.location.href\nvar h2 = h.replace(/#/, \"?\")\nif (h != h2) \n  document.location = h2\n</script>";
        #TgZ1Bg0NJbJACv2J $res→html(art→choose_provider\u002ehtml→replace("@BODY@", $new));
      }
      else {
        #iR4SaKNPfgeC994O // This is evil, but helps IE
        #xD7wPEG0r253NzX9 app→javascript("local", "tok._item = JSON.stringify(tok._item, null, 2)");
        #CbjNfYvamQMmLcRV $res→send($tok→to_string);
      }
    }
  }
  meta private;
  meta sync;
}
#ghTiLMKkCmm4calg meta import restify {
  pub "yfcja"
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
  }
}
#xlYRMDgqm5Zm2RLH
var logger : App_Logger {
  transient = true;
}
#R5FUkFWIGsXzWs4l meta import node_jwt_simple {
  pub "axwi"
  usage {

    action `sync` encode(payload: Json_Object, secret: String, algorithm: String) returns(jwt: String)
    action `sync` decode(jwt: String, pub_key: String) returns(payload: Json_Object)
    action `sync` decode_no_verify(jwt: String) returns(payload: Json_Object)
  }
}
#mF4oTfBPGL8otUeb
var azure_key : String {
  is\_resource = true;
  url = "data:text/plain;base64,LS0tLS1CRUdJTiBSU0EgUFVCTElDIEtFWS0tLS0tCk1JSUJDZ0tDQVFFQXZJcXorNCtFUi92TldMT045eXY4aElZVjczN0pRNnJDbDZYZnpPQzYyOHNlWVVQZjBUYUcKazkxQ0Z4ZWZoemgyM1Y5VGtxK1J0d04xVnMvejU3aE84MmtrekwrY1FIWlgzYk1KRCtHRUdPS1hDRVhVUk43VgpNeVpXTUF1elFvVzl2RmIxazNjUjFSVy9FVy9QK0M4YmIyZENHWGhCWXFQZkh5aW12ejJXYXJYaG50UFNiTTVYCnlTNXY1eUN3NVQvVnV3cXFzaW8zVjh3b29XR01wcDYxeTEyTmhOOGJOVkRRQWtEUE51MkRUOURYQjFnMENlRkkKTnAvS0FTL3FRMktxNlRTdlJISnF4UlI2OFJlell0amU5S0Fxd3F4NGp4bG1WQVF5MFQzK1QrSUFic2sxd1J0VwpEbmRoTzZzMU9zK2RjazVUenlaL2ROT2hmWGdlbGl4TFVRSURBUUFCCi0tLS0tRU5EIFJTQSBQVUJMSUMgS0VZLS0tLS0=";
  transient = true;
}
#BVGhpbmca
table Provider {
  type = "Index";
  persistent = false;
  keys {
    #P0y3WZtNiBzbB86G id : String
  }
  fields {
    #Rx1ULEO9PZXVGhhQ make_login_url : * make_url_callback
    #zvXNz8cSBcBEMZuq get_profile : * get_profile
    #x4ub2TaidfS69AUr make_custom_token : * make_user_info
    #F8E1LaV1AwGL3fOH name : String
    #FLSSmW2OgDDIwlxU order : Number
  }
}
#wx3MS3dVCMOqVG1X
action or_empty(#WRLUkU2aJsTRQJBd s: String) returns(#ho2BB29xW4YKeYl4 r: String) {
  #NPtaz2r44fILza1x if $s→is_invalid then {
    #a5GLR0RKQTs3wmoD $r := "";
  }
  else {
    #AdWkTLLUgagLOuQS $r := $s;
  }
  meta private;
  meta sync;
}
#bpJlgNNNlamsUiPl
action `type` make_url_callback(#pLII2Zk4mU5YvwM3 req: ♻ restify → Request, #kQ8auga9xGFKxKPR p: * oauth_request) returns(#t8SnGIInzzZyFpjc url: String) {
  #FlpiHdKMGKRQY2cw skip;
}
#PIr4G8ePiFbwtgV3
var choose_provider\u002ehtml : String {
  is\_resource = true;
  url = "data:text/plain;base64,PCFET0NUWVBFIGh0bWw+CjxodG1sPgo8aGVhZD4KPG1ldGEgbmFtZT0idmlld3BvcnQiIGNvbnRlbnQ9IndpZHRoPTMyMC4xIiAvPgo8bWV0YSBodHRwLWVxdWl2PSJYLVVBLUNvbXBhdGlibGUiIGNvbnRlbnQ9IklFPWVkZ2UiIC8+Cjx0aXRsZT5TaWduIGluPC90aXRsZT4KPHN0eWxlPgphLnByb3ZpZGVyIHsKICAgcGFkZGluZzogMWVtOwogICB0ZXh0LWRlY29yYXRpb246IG5vbmU7CiAgIGNvbG9yOiB3aGl0ZTsKICAgYmFja2dyb3VuZDogIzI5ODZFMDsKICAgd2lkdGg6IDEyZW07CiAgIGRpc3BsYXk6IGJsb2NrOwogICBtYXJnaW46IDAgYXV0bzsKICAgZm9udC1zaXplOiAxLjJlbTsKfQo8L3N0eWxlPgo8Ym9keSBpZD0ncm9vdCcgc3R5bGU9J2ZvbnQtc2l6ZToxNnB4OyBmb250LWZhbWlseTpzYW5zLXNlcmlmOyc+CjxkaXYgc3R5bGU9J21hcmdpbjogMCBhdXRvOyB3aWR0aDogMzEwcHg7ICB0ZXh0LWFsaWduOiBjZW50ZXI7Jz4KPGgxIHN0eWxlPSdmb250LXNpemU6M2VtOyBmb250LXdlaWdodDpub3JtYWw7Jz5TaWduIGluPC9oMT4KQEJPRFlACjwvZGl2Pgo8L2JvZHk+CjwvaHRtbD4=";
  transient = true;
}
#xAOuz4Emmhih9P8N
action add_azure_ad_client_only(#dYTrGburtCoVr8Eg options\u003f: * Provider_Options) {
  #A4KvuIh1ZuvBEpTC // Setup Azure Active Directory (Office 365 or Corporate) authentication provider. Requires ``AZURE_AD_CLIENT_ID`` env.
  #wRDaB9OSs2vDy2nt // This relies on `art->azure key` being valid and used, but doesn't require client secret (which expires every 2 years).
  #UQR2i02RHSvpbEmH $client_id := app→server_setting("AZURE_AD_CLIENT_ID", false);
  #sCzk7ZeunUN4Fnco $prov := records→Provider_index→at("azureadcl");
  #vtiUP24LiwOfiPXQ $prov→name := "Office 365 or Corporate";
  #yIDEcD9sQ2a1pDsb $prov→make_custom_token := $options\u003f→make_custom_token;
  #gpJyXKbXeASIsOf5 code→setup_provider($prov, $make_url, $get_profile, $default_make_token);
  #WArXDPpVQlxkUYMc where make_url(req: ♻ restify → Request, p: * oauth_request) returns (url: String) {
    #C58pCezeRD6dnD1D $p→client\_id := $client_id;
    #d0jfYE1zyW9gUGW1 $p→response\_type := "id_token";
    #qdRsWWIsPgfj5jrO $p→scope := "openid";
    #gib7gqnEQ5V8g51w $p→nonce := code→create_random_id(12);
    #QJxeV0rZNppBWC0x $p→response\_mode := "form_post";
    #jp24wTYdqYLqKYeY $url := "https://login.windows.net/common/oauth2/authorize?" ∥ code→to_query_string($p→to_json);
  }
  #xlKVOiQTB2MwnuPh where get_profile(req: ♻ restify → Request, p: * oauth_request) returns (profile: Json_Object) {
    #Mvnk3mCva3odT4jN $payload := @\u267b→node_jwt_simple→decode($req→body_as_json→string("id_token"), art→azure_key);
    #eifE5NWDXqKtKBQ0 if $payload→string("nonce")→equals($p→nonce) then {
      #RHsLEGmdg7xeky8S $profile := $payload;
    }
    else {
      #wM2epEfV4vt0NkNf $profile := invalid→json_object;
    }
  }
  #x6whPna4pIFitoj0 where default_make_token(profile: Json_Object) returns (info: * User_Info) {
    #IV2xH2YdbnMMNPTS $info := records→User_Info→create;
    #PrBT7lVu4eYaEY1u $info→id := "ad:" ∥ $profile→string("oid")→replace("-", "")→to_lower_case;
    #xGAH3gO7aWXVe2oR $info→name := $profile→string("name");
    #MJee8sw7YhAwbMii $info→email := $profile→string("unique_name");
  }
  meta sync;
}
#JPZcN0hmQegC5AvK
action setup_provider(#aWI0gGdaDlkrauhB prov: * Provider, #xlXTcL7TsgYf8PhV make_url: * make_url_callback, #HuZgsZSvvk0SF5XQ get_profile: * get_profile, #jqhwq0xhQgsN4ilw default_custom_token: * make_user_info) {
  #p2pnzxmkX9fEn1Ve data→logger→info("adding provider: " ∥ $prov→id);
  #icpn1wS1b0my8zjU $prov→make_login_url := $make_url;
  #vmer8ipY1Ult6DDQ $prov→get_profile := $get_profile;
  #UNIoFDU75Q124i94 if $prov→make_custom_token→is_invalid then {
    #MNTVwmjSgH84G2aT $prov→make_custom_token→\u25c8set($lambda);
    #zqfC43pZhXRYg52X where lambda(profile: Json_Object) returns (info: * User_Info) {
      #tL2M2gQD2QMzqyw3 $inf := $default_custom_token→run($profile);
      #R4HawCRtfleJLtar if `not` $inf→is_invalid `and` code→or_empty($inf→id)→is_empty then {
        #U0veSLr3f1FXHR5w $inf := records→User_Info→invalid;
      }
      #xdxs9F0DVQY9K3SF if `not` $inf→is_invalid then {
        #D1Erm4b2i1no8PZd if code→or_empty($inf→name)→is_empty then {
          #x5AN1fOCYxxVpJeY // isn't this brilliant?!
          #VzKGAdKOQ4YCCo50 $inf→name := "0x" ∥ bits→string_to_buffer($inf→id, "utf8")→sha256→substring(0, 8);
        }
        #xWcXbXZddwQs65bV if $inf→email→is_invalid `or` `not` $inf→email→contains("@") then {
          #DiLpYO24OV2QAPX0 $inf→email := "";
        }
      }
      #N9f5C30aH9xP44ZT `return` $inf;
    }
  }
  #uZn4vLmNYhxg2hS9 $prov→order := records→Provider_index→count;
  meta private;
  meta sync;
}
#HKO2x680U1bR6Bpx
action `type` make_user_info(#TPm43hP0vomLK4ts profile: Json_Object) returns(#xRwpg8EEgsvcAoph info: * User_Info) {
  #DWLizeeXnAfAAVH5 skip;
}
#FxqhQupnFJxSRTiG
table Provider_Options {
  type = "Object";
  exported = true;
  persistent = false;
  fields {
    #xp6NtFZ1QXkcIauL make_custom_token : * make_user_info
  }
}
#vkN3vLdxpjLhV2Hv
action from_query_string(#xwceJztaEJSr2e62 body: String) returns(#k1EvRbAu3ryMMe4L query: Json_Object) {
  #xTOyjcEZWjeE59dG app→javascript("local", "query = lib.JsonObject.wrap(require(\'querystring\').parse(body))");
  meta private;
  meta sync;
}
#QjfLKEVMC3wx9v5H
table client_oauth {
  type = "Object";
  exported = true;
  persistent = false;
  fields {
    #p2xte2fZsYvSXvMX state : String
    #pUic46gpsqClh7V5 client\_id : String
    #mHI4DwRABUtnVrgG redirect\_uri : String
    #IlFgrcJ2bXqnewqt scope : String
    #xHsGNorgHrMxFEOB response\_type : String
    #xY4MpLLzznIIvLLu display : String
    #amDtEIY1rngHSDbU provider : String
    #TfKC2p2ma7QUFBNa td\_state : String
    #bJbUyOdEoO07tFo9 u : String
  }
}
#eGrsCgK1vbmv0wW6
action `type` get_profile(#oQir9EVAzMPJK72u req: ♻ restify → Request, #x7SSIhIgCdGUiFd0 p: * oauth_request) returns(#mcOSzz1jJ1ZvRqOh profile: Json_Object) {
  #XU91DZkbs47TX4yl skip;
}
#p8zFUk27VlSNFWPm
action set_if_empty(#EWfR6DekBDI6zvGK jsb: Json_Builder, #xNtbJxb3DUBJL66r key: String, #DVN3m4heGRdYeNj2 value: String) {
  #K40Nd0HHNTA8bMQf if code→or_empty($jsb→string($key))→is_empty then {
    #S8pn8zrw5ikVzG4e $jsb→set_string($key, $value);
  }
  meta private;
  meta sync;
}
#myVye50B2O4DiFYN
action now() returns(#aJeEnk3XDkkrogX3 value: Number) {
  #Q257QLD89q4EeQgP $value := math→round(time→now→milliseconds_since_epoch / 1000);
  meta private;
  meta sync;
}
#Be08w4s1wOfb5Zk2
var token_secret : String {
  transient = true;
}
#iXZDg4V6uoQdJCWJ
action handle_response(#Qld2aKh4Vxf1v6Ku state: String, #AHSSe5iePlpUD7Un req: ♻ restify → Request, #ATO6pkjkr3YEaz3M res: ♻ restify → Response) {
  #TbZR9zDO2PA69gpI code→set_self($req);
  #NhPijn0N29L4MZtO if $state→contains(",") then {
    #DxI7hvsf0BGcsHH4 $state_words := $state→split(",");
    #xuAx2fjkGt50d70L if data→fed_targets→contains($state_words→at(0)) then {
      #NAdZMs1XLHYOCLa2 $res→redirect(307, "https://" ∥ $state_words→at(0) ∥ $req→url→replace_regex("state=[^&]+", "state=" ∥ web→encode_uri_component($state_words→at(1))));
    }
    else {
      #hDF59Bx5VxD22fwB $res→send_error(403, "invalid fed target");
    }
    #sNAd1Eu2bY4BRqu3 `return` ;
  }
  #xnZ0HKOS94Z3y2XP $s := code→or_empty(data→global_options→get_data→run($state));
  #bNiNvZMp6rwTA4dQ if $s→is_empty then {
    #xf4GGPqpswyFJYj8 $res→send_error(404, "Wrong state");
  }
  else {
    #NcC0eC2yWbr9URkf $oauth_request := records→oauth_request→create_from_json(web→json($s));
    #zTudVa1LoCPHa7Hk $prov := records→Provider_index→at($oauth_request→\_provider);
    #xxMrCadoAUzUOR08 $profile := $prov→get_profile→run($req, $oauth_request);
    #xInxynWYvKJbq3FN if $profile→is_invalid then {
      #rHaEBCnshSkyj95M data→global_options→error_callback→run($res, "Cannot get profile.");
    }
    else {
      #PcJ9D0J4WeIi7ows data→logger→debug("profile: " ∥ $profile→serialize);
      #j0t47jtbVgJapXqY $info := $prov→make_custom_token→run($profile);
      #EpF24isdKn6Jh3nh if $info→is_invalid then {
        #xPixWPY4XT2FoipV data→global_options→error_callback→run($res, "Profile not accepted");
      }
      else {
        #TEmliDIRHrVAyiES data→logger→debug("user info: " ∥ $info→to_json→serialize);
        #kRPJ5ifph4SGp9cP $info→redirect_prefix := code→make_redirect_url($oauth_request, "TOKEN");
        #xLdv24rMYpve36zA $info→state := $state;
        #Ax1XUw74LGIJNolx $jsb := data→global_options→make_jwt→run($info, $oauth_request);
        #Ixevwvk835OhmZWE if $jsb→is_invalid then {
          #fvEZJ6gApSh6bhCs $res→send_error(403, "User info not accepted");
        }
        else {
          #V6bRcTORfBU6BEM2 $token := "";
          #DiM2ERGdsuwql9iv if $jsb→kind→equals("string") then {
            #NfDidLONUEmlxF2Y $oauth_request→\_info := $info;
            #Ukry96IVwmqHwxlx data→global_options→set_data→run($state, $oauth_request→to_json→serialize);
            #V4Apxv4xqjsHX4QQ $res→redirect(303, $jsb→to_string);
          }
          else { #twqcBogcD22d45jX if $jsb→contains_key("http redirect") then {
            #gNRWvi7JtfZWEPyB $oauth_request→\_info := $info;
            #bYQB4ArTfz529New data→global_options→set_data→run($state, $oauth_request→to_json→serialize);
            #pFsCZ3wFZzmcHIa5 $hds := $jsb→field("headers");
            #kVwsqS3XIkp2QvTp if `not` $hds→is_invalid then {
              #URBtXXYZFPRfH7dR foreach hd in $hds→keys
              do {
                #heY4C56RSD28Z1Gn $res→set_header($hd, $hds→string($hd));
              }
            }
            #hudWlrS42KO4miz8 $res→redirect(303, $jsb→string("http redirect"));
          }
          else {
            #Nt5usnCf4NJvAHFz code→set_if_empty($jsb, "iss", data→global_options→@self);
            #WJIUJmQsn25UcbFy code→set_if_empty($jsb, "jti", code→create_random_id(10));
            #eh6xWjh0kP3NhKAh if $jsb→number("iat")→is_invalid then {
              #cMjxncH4DUfD69jx $jsb→set_number("iat", code→now);
            }
            #GnsSk24uhVMhpQd9 $token := @\u267b→node_jwt_simple→encode($jsb→to_json, data→token_secret, "HS256");
            #RvlMYZglYhxP8kit $res→redirect(303, code→make_redirect_url($oauth_request, $token));
          }
          } 
        }
      }
    }
  }
  meta private;
}
#seGlPHvdo1rPeyS1
action add_live_id(#XelKkzs3pmV8gOiM options\u003f: * Provider_Options) {
  #GyFmcCllTiG3Q5GN // Setup Live Connect / Microsoft Account authentication. Requires ``LIVE_CLIENT_ID`` and ``LIVE_CLIENT_SECRET`` env.
  #c0EcVkGr29GsfAta $client_id := app→server_setting("LIVE_CLIENT_ID", false);
  #xrUDIOmmiEkTejfz $client_secret := app→server_setting("LIVE_CLIENT_SECRET", false);
  #x4be9UI8DQMdjZTy $prov := records→Provider_index→at("liveid");
  #gW8hqM8q0S5gxC34 $prov→name := "Microsoft Account";
  #HlAp8cs5sXe2WNYp $prov→make_custom_token := $options\u003f→make_custom_token;
  #gH7b18Ki16gFfWI6 code→setup_provider($prov, $make_url, $get_profile, $default_make_token);
  #x4lXLaxl4czsCroH where make_url(req: ♻ restify → Request, p: * oauth_request) returns (url: String) {
    #Gfnuq3Z2IQDrm6ON $p→client\_id := $client_id;
    #QVCmqxvnuBukItNy if data→global_options→request_email then {
      #IbPhtQAgq0T3hTEM $p→scope := "wl.signin wl.emails";
    }
    else {
      #hnbZDIBmC946Juwq $p→scope := "wl.signin";
    }
    #SUKf2Smqdejfe2jb $p→response\_type := "code";
    #Pk8QUMaUMs8Ljfx1 $url := "https://login.live.com/oauth20_authorize.srf?" ∥ code→to_query_string($p→to_json);
  }
  #i5sVI5u2xxvfCbqO where get_profile(req: ♻ restify → Request, p: * oauth_request) returns (profile: Json_Object) {
    #kUnOakxod3TH7yPM $js := code→get_access\_code($p, $req→query→string("code"), $client_secret, "https://login.live.com/oauth20_token.srf");
    #E2dsNV21IAeN64h7 if $js→is_invalid then {
      #xD2zzZ2kQ9KoaxrA `return` $js;
    }
    #igXmrAuShKNl20x0 $request := web→create_request("https://apis.live.net/v5.0/me?access_token=" ∥ web→encode_uri_component($js→string("access_token")));
    #m72rpBZkKxmUMHVg $response := $request→send;
    #YScQ2aCEbS6XTv8a $profile := $response→content_as_json;
  }
  #COg2nH5Y2VRuwUro where default_make_token(profile: Json_Object) returns (info: * User_Info) {
    #Lewhh5RwA2cw8NF9 $inf := records→User_Info→create;
    #awSlIaq5c8xvq2Ol $inf→id := "live:" ∥ $profile→string("id");
    #ZtCdUMWl2FK2tUF6 $inf→name := $profile→string("name");
    #lTy6i9vzgPJAF2qr $eml := $profile→field("emails");
    #Q3nrzjxQxfRRZiJq if `not` $eml→is_invalid then {
      #L4l9zLxYY8zRDnQg $inf→email := code→or_empty($eml→string("preferred"));
      #prjmu3QdcBmI2WfM if $inf→email→is_empty then {
        #Udyzvbsf2R125lrC $inf→email := $eml→string("account");
      }
    }
    #yqaw1rw6EYzrzJwD `return` $inf;
  }
  meta sync;
}
#C4a3iTighsBe002w
action get_access\_code(#oLxr2xA5E2K8Sh2k p: * oauth_request, #ECejLJvEUDUePnn5 code\_: String, #TGxHC8Dc4OMtQYUZ client_secret: String, #I8TrUC92KQPFPERK url: String) returns(#xymRpuzAVhX8NNqA js: Json_Object) {
  #Is8XlambqforNDSL $token_req := records→token_req→create;
  #kUTRxffsfOUjYGt5 $token_req→from_json($p→to_json);
  #OXkviq4D2Af9HxGt $token_req→code := $code\_;
  #xV2gtRhQgVafWyok $token_req→grant\_type := "authorization_code";
  #xDZroAQLg9UHr2O7 $token_req→client\_secret := $client_secret;
  #G2hN3pa6pPsmyzTY // And now send the request
  #wg3ut29nAt8bVPzs $grant := web→create_request($url);
  #cJ5m6VNIjf81XuNs $grant→set_method("post");
  #vp9U6JUgkTkdmjuv $grant→set_content(code→to_query_string($token_req→to_json));
  #GZ70VJr7LYsyGa5P $grant→set_header("Content-type", "application/x-www-form-urlencoded");
  #vcdgfhpSPJbfh5QT $response := $grant→send;
  #nbRJ7NUqmohgj82F data→logger→debug("auth response: " ∥ $response→status_code ∥ " -> " ∥ $response→content);
  #csJ6qsQrUb9tEPcL if $response→content→starts_with("{") then {
    #xP4Uep6333cl6zb7 $js := $response→content_as_json;
  }
  else {
    #cSJ9apQNDjc1dzJX $js := code→from_query_string($response→content);
  }
  #QBbYvpqEw47BwkXB if `not` $js→is_invalid `and` code→or_empty($js→string("access_token"))→is_empty `and` code→or_empty($js→string("id_token"))→is_empty then {
    #MeBVhYp4nCzkvYot $js := invalid→json_object;
  }
  meta private;
}
#eOdAabEmFyRD3Qgs
action decode_token(#dUJB577aOTyYGllr token: String) returns(#Ey6Oe1pwrztHfLRo tok: Json_Object) {
  #nO6z4QTYQTDb56br // Decode JWT token
  #j44z4IvE02DExm4W if $token→is_invalid `or` `not` $token→is_match_regex(".+\\..+\\.") then {
    #gg9pBvg1G1c3IVZg $tok := invalid→json_object;
  }
  else {
    #HA2nZr2yMMmZX5zG $tok := @\u267b→node_jwt_simple→decode($token, data→token_secret);
  }
  meta sync;
}
#Ai2i0K82UfBwdXTP
action example_\_init() {
  #n2a2oijmI12nmcc6 data→debug := true;
  #btCBwSW2jWC2lvhu if data→debug then {
    #DnpOlyicKl2lGf4x code→setup_restify_server;
    #Oq4Z9LVfgWsGCtyr // 
    #SHJpczOLwEC5L9WT code→init;
    #xKSnig60YnXK90z2 where `optional` make_jwt(profile: * User_Info, oauth_req: * oauth_request) returns (jwt: Json_Builder) {
      #gn2eO1nNA4tSQa5s $jwt := web→create_json_builder;
      #xI6Wd5vMfD37nLgg $jwt→set_string("sub", $profile→id);
      #GSewsJy4h4Yhgfh1 $jwt→set_string("_name", $profile→name);
      #BuyJZfzQhBof2rXF $jwt→set_string("_email", $profile→email);
    }
    #ocsCOHeVoTyMYq85 code→add_azure_ad;
    #XZSAuqjY800p4rjr code→add_live_id;
    #zlPFjT2umpdgyNP6 code→add_facebook;
    #Qg5Vxkthk1cGYlGC code→add_google;
  }
  meta private;
  meta sync;
}
#u6jm29LZlduRONId
var debug : Boolean {
  transient = true;
}
#xq4HyeIKpwNaaMlS
action add_facebook(#tOylZnlke6zSHMEB options\u003f: * Provider_Options) {
  #xDWckCr8mYdsgh02 // Setup Facebook login. Requires ``FACEBOOK_CLIENT_ID`` and ``FACEBOOK_CLIENT_SECRET`` env.
  #KwiTWTn2F9hpsqNd $client_id := app→server_setting("FACEBOOK_CLIENT_ID", false);
  #ATgExE5AbMancgsf $client_secret := app→server_setting("FACEBOOK_CLIENT_SECRET", false);
  #t9VuXeG6Cwau4n2c $prov := records→Provider_index→at("facebook");
  #cDOfPZRxkgTPtQMj $prov→name := "Facebook";
  #jcrXAyo8q0pFEXA1 $prov→make_custom_token := $options\u003f→make_custom_token;
  #Q2QAQCJfkZsWNdm5 code→setup_provider($prov, $make_url, $get_profile, $default_make_token);
  #XrIxIExcwC86eLcO where make_url(req: ♻ restify → Request, p: * oauth_request) returns (url: String) {
    #xkn34lBzcYiJObku $p→client\_id := $client_id;
    #ZxTQuV4Ue9OErlSm if data→global_options→request_email then {
      #xHkRpY21ghn2vU33 $p→scope := "public_profile,email";
    }
    else {
      #ffXe26zRGj230xky $p→scope := "public_profile";
    }
    #x6jDVcqEmfVWCiQX $p→response\_type := "code";
    #UWNE7uH3vPlotw0D $url := "https://www.facebook.com/dialog/oauth?" ∥ code→to_query_string($p→to_json);
  }
  #xXe8rQ7kDFHwG1fM where get_profile(req: ♻ restify → Request, p: * oauth_request) returns (profile: Json_Object) {
    #xMWEj55XENyWRrO4 $js := code→get_access\_code($p, $req→query→string("code"), $client_secret, "https://graph.facebook.com/oauth/access_token");
    #omTRKtDeHVMkRwXg if $js→is_invalid then {
      #xXQoh2NQJeEi14nd `return` $js;
    }
    #EcyotiG2g7gksb26 $request := web→create_request("https://graph.facebook.com/v2.2/me?access_token=" ∥ web→encode_uri_component($js→string("access_token")));
    #hKIdgbYSA72tlv6Z $response := $request→send;
    #RY3oKgZsassxrOUV $profile := $response→content_as_json;
  }
  #x605wtzUaHIq4g3N where default_make_token(profile: Json_Object) returns (info: * User_Info) {
    #xbaOpupYUFHF2qPJ $inf := records→User_Info→create;
    #Mh0uCLfMgtcqwNky $inf→id := "fb:" ∥ $profile→string("id");
    #xLQsmaux3ljH20v8 $inf→name := $profile→string("name");
    #TZAZbiPiTgRb9QDj $inf→email := $profile→string("email");
    #xiJVUVC2JQbe29rM `return` $inf;
  }
  meta sync;
}
#IekjcpfkYMvn8Tu8
action add_google(#xUvF6ekMe813o94Q options\u003f: * Provider_Options) {
  #pJ4XD0Fk6T2wyMSJ // Setup Google login. Requires ``GOOGLE_CLIENT_ID`` and ``GOOGLE_CLIENT_SECRET`` env.
  #x1mTFC8SKaH5wDp1 $client_id := app→server_setting("GOOGLE_CLIENT_ID", false);
  #xwRdRaDdMmwjYUCj $client_secret := app→server_setting("GOOGLE_CLIENT_SECRET", false);
  #XuErmjS2023tJZTm $prov := records→Provider_index→at("google");
  #Y2v2YBsXBF64HILZ $prov→name := "Google";
  #s31NMB75L8GXzjop $prov→make_custom_token := $options\u003f→make_custom_token;
  #a04QTyBTPD4ohvEm code→setup_provider($prov, $make_url, $get_profile, $default_make_token);
  #dM4NepU6kDcpP4nA where make_url(req: ♻ restify → Request, p: * oauth_request) returns (url: String) {
    #TyEMIWdK2Vl24JOW $p→client\_id := $client_id;
    #Koli2X4Pks46f2pq if data→global_options→request_email then {
      #xwRQP1w7FUxRadMS $p→scope := "openid email profile";
    }
    else {
      #xaB4UoShD8XOOzpY $p→scope := "openid profile";
    }
    #feZ1oSmgbPzdRF6i $p→response\_type := "code";
    #fCcD0KtfaT914lBN $url := "https://accounts.google.com/o/oauth2/auth?" ∥ code→to_query_string($p→to_json);
  }
  #sYlyxtOLDGd118PF where get_profile(req: ♻ restify → Request, p: * oauth_request) returns (profile: Json_Object) {
    #u4nRNlceK4Z2E0JV $js := code→get_access\_code($p, $req→query→string("code"), $client_secret, "https://www.googleapis.com/oauth2/v3/token");
    #xBU51L1IkZaxnKj4 if $js→is_invalid then {
      #Bs33uWTiXq56ImcO `return` $js;
    }
    #x4UaST5CqU2CHDzQ $request := web→create_request("https://www.googleapis.com/oauth2/v2/userinfo");
    #fGT3Ha3CKx9fCW2k $request→set_header("Authorization", "Bearer " ∥ $js→string("access_token"));
    #VK0492VEKsiyoX7c $response := $request→send;
    #hyFNeoFRH0Mt1Mm9 // The JWT token doesn't have user's name
    #mXgP7kYMGiKeS6zM if false then {
      #Wqc0CDwdQMNwvR62 $profile := @\u267b→node_jwt_simple→decode_no_verify($js→string("id_token"));
    }
    #zd6QW10GGETmMv1N $profile := $response→content_as_json;
  }
  #I9ap2zu0KfyEzbW8 where default_make_token(profile: Json_Object) returns (info: * User_Info) {
    #yr2iog8dk4cxrbkK $inf := records→User_Info→create;
    #Xk0VmXaWRU8QRnGA $inf→id := "google:" ∥ $profile→string("id");
    #vS02RJ2ceP1uq1Y4 $inf→name := $profile→string("name");
    #tJHPjRJ8FRskZVcl $inf→email := $profile→string("email");
    #qK4LjHA0L8RcyUev `return` $inf;
  }
  meta sync;
}
#j0qXXlA56YNihOOQ
action add_edmodo(#xI2pvcTDvpp62t4L options\u003f: * Provider_Options) {
  #JqzygnrnZxMrKgGi // Setup Edmodo login. Requires ``EDMODO_CLIENT_ID`` and ``EDMODO_CLIENT_SECRET`` env.
  #xHamGEc2NOgtxQ5u $client_id := app→server_setting("EDMODO_CLIENT_ID", false);
  #K4stsIiRjiF2CCRd $client_secret := app→server_setting("EDMODO_CLIENT_SECRET", false);
  #X7I2jQ3LZK5RM5cn $prov := records→Provider_index→at("edmodo");
  #WK079gZfpK4tWeLp $prov→name := "Edmodo";
  #WKBGq4XoQcuS4dCd $prov→make_custom_token := $options\u003f→make_custom_token;
  #fyGr7OxSwRK77BWQ code→setup_provider($prov, $make_url, $get_profile, $default_make_token);
  #JK88hqWE4XnDzP4A where make_url(req: ♻ restify → Request, p: * oauth_request) returns (url: String) {
    #HdPcwmVUYQRSjiTR $p→client\_id := $client_id;
    #y3s8hVT5wCnzaFt3 $p→scope := "basic";
    #fmIoEkX2x7uNgyep $p→response\_type := "code";
    #PzNiA1CbeE24sIVa $url := "https://api.edmodo.com/oauth/authorize?" ∥ code→to_query_string($p→to_json);
  }
  #x444KMYNIPS4x1Jc where get_profile(req: ♻ restify → Request, p: * oauth_request) returns (profile: Json_Object) {
    #nEoH80axI3AACjIG $js := code→get_access\_code($p, $req→query→string("code"), $client_secret, "https://api.edmodo.com/oauth/token");
    #qv0KYXlmjsvy4AIP if $js→is_invalid then {
      #xyLpf7yyrfYa448z `return` $js;
    }
    #sF2mHFdSGmglool4 $request := web→create_request("https://api.edmodo.com/users/me");
    #xAQpuTh4T5FwuG2I $request→set_header("Authorization", "Bearer " ∥ $js→string("access_token"));
    #qMtVMSb2Amb4vS5W $response := $request→send;
    #yfEUTKTavq2uYWxe $request := web→create_request($response→header("Location"));
    #H4AuuGjJvXgXEILc $request→set_header("Authorization", "Bearer " ∥ $js→string("access_token"));
    #xeY9y82zu1Ekyppj $response := $request→send;
    #w8fCVZNPJ6vqJo8f $profile := $response→content_as_json;
  }
  #C894AoFrjxoa6OsS where default_make_token(profile: Json_Object) returns (info: * User_Info) {
    #Rdd9svRDNubajwFq $info := records→User_Info→create;
    #xBmLkWTnzwo1HAJu $info→id := "edmodo:" ∥ $profile→string("id");
    #x7tT6xCzdUYvYxrL $info→name := $profile→string("name");
  }
  meta sync;
}
#HFyLIZonubh7V0A2
action add_azure_ad(#wQBWhInh0pXR0izA options\u003f: * Provider_Options) {
  #xZTL62TLcW41wxR6 // Setup Azure Active Directory (Office 365 or Corporate) authentication provider. Requires ``AZURE_AD_CLIENT_ID`` and ``AZURE_AD_CLIENT_SECRET`` env.
  #QwDyMQx36VD2z0Uf $client_id := app→server_setting("AZURE_AD_CLIENT_ID", false);
  #R30l9iaGv52zB0KT $client_secret := app→server_setting("AZURE_AD_CLIENT_SECRET", false);
  #FamR5bL08bYdva5G $prov := records→Provider_index→at("azuread");
  #xP24d9ElOICOuuXC $prov→name := "Office 365 or Corporate";
  #sqfY2ZrrSvMPahLu $prov→make_custom_token := $options\u003f→make_custom_token;
  #CchHsYVdutEt0Ggd code→setup_provider($prov, $make_url, $get_profile, $default_make_token);
  #dPn8C5aUmL4DvHSz where make_url(req: ♻ restify → Request, p: * oauth_request) returns (url: String) {
    #ygHYbMYvJ93uJbJq $p→client\_id := $client_id;
    #JBjM6q2HPqXepfIQ $p→scope := "openid";
    #xbpfYpSHM5hqUDMh $p→response\_type := "code";
    #DYkCYvFC2E8dZ1mP $p→nonce := code→create_random_id(12);
    #xBynMYpWnx6S5oZs $url := "https://login.windows.net/common/oauth2/authorize?" ∥ code→to_query_string($p→to_json);
  }
  #EEwe4yliuBRWxU1l where get_profile(req: ♻ restify → Request, p: * oauth_request) returns (profile: Json_Object) {
    #x9klxibUX0lDrR45 $js := code→get_access\_code($p, $req→query→string("code"), $client_secret, "https://login.windows.net/common/oauth2/token");
    #HsvVbXfHF8QOYJkJ if $js→is_invalid then {
      #PMMiP2l9M9fit124 `return` $js;
    }
    #b3WYvmUnBo57MhWi data→logger→debug("resp: " ∥ $js→serialize);
    #Jn12wyDbc7qMLyR6 $profile := @\u267b→node_jwt_simple→decode_no_verify($js→string("id_token"));
  }
  #MZNi2pEBs1tRDdlQ where default_make_token(profile: Json_Object) returns (info: * User_Info) {
    #ti64oRegLfrIAUf1 $info := records→User_Info→create;
    #GhtIZxMySCFtFO9P $info→id := "ad:" ∥ $profile→string("oid")→replace("-", "")→to_lower_case;
    #xsGbucbbuixrBOCm $info→name := $profile→string("name");
    #DU73m827hTDQrdGk $info→email := $profile→string("unique_name");
  }
  meta sync;
}
#EWxkSY2gS6WkkyXt
action create_random_id(#RmHvbEp0CXbKEhm7 size: Number) returns(#DK4aavxFrUhVAlWt id: String) {
  #xfFwXgA4mREoFmpP // creates a random id
  #rrTlT6NXmIdG38Pc $buf := bits→create_buffer($size * 2);
  #b9kYeoM4qFo3HXYu $buf→fill_random;
  #jHJ8adzVWU2VyFuD $s := $buf→to_string("base64")→replace_regex("[^a-zA-Z]", "");
  #xv7AiIEe9pMwLWPw if $s→count < $size then {
    #tJ7uEDaIHKm2l2Us // this is very unlikely
    #q26uZVQoBvyNPxNz $id := code→create_random_id($size);
  }
  else {
    #xF72XgHOkPkeMpq8 $id := $s→substring(0, $size);
  }
  meta private;
  meta sync;
}
#HumOMfpsJuidLPxO
table Init_Options {
  type = "Object";
  exported = true;
  persistent = false;
  fields {
    #i2vBgt28layvSxIe pre_dialog : * pre_dialog
    #Py4AkhEc34EYTjPT make_jwt : * make_jwt
    #xsy8g9IDrOeQOvjV get_data : * get_data
    #n6TWsvrZL0XpsYwd set_data : * set_data
    #TqHdNfOe1TLCq9f5 federation_master : String
    #GjBXQ888k5AuBKsq federation_targets : String
    #KV72gq9UpIvZDZKS @self : String
    #ONxoqGvFgx2kXpJK request_email : Boolean
    #HcOMOwJ4k0Ju5Jcj get_provider_template : * get_provider_template
    #xzpey544mPHc6OW1 error_callback : * error_callback
    #xscLztgQD6Gz1SDJ redirect_on_error : String
  }
}
#owEFJt42a4qlPth2
table User_Info {
  type = "Object";
  exported = true;
  persistent = false;
  fields {
    #xdm5WJ86uKC2Rtj2 id : String
    #xO4XkVtRhLIY24JI name : String
    #M4J9nZuDmF5R5uiB email : String
    #LwBxZ4w3riZ5Hk3n redirect_prefix : String
    #y2vrErx1AiYLLWhB state : String
    #IsE2Q2amnSxBoRz5 user_data : String
  }
}
#QicBa94fsgQNTc3a
action `type` make_jwt(#uuNe4nnAPnANQCdv profile: * User_Info, #YI3KMWQP6tueS0cG oauth_req: * oauth_request) returns(#pgCX4MQQ5B4g2k11 jwt: Json_Builder) {
  #y8V5halqjlooMn5L skip;
}
#mKId5CuXfkNzQPy1
var global_options : * Init_Options {
  transient = true;
}
#b4qS2x4tKQ4sQ7q5
action `type` get_data(#Lk2VkwIYEzrq5kUM key: String) returns(#MbWRuh38p2Z5hYRx value: String) {
  #xEARmelaWvTEXYmt skip;
}
#a4RF2sMHJ0r3P2Ux
action `type` set_data(#hAKXiElo5Uar93WR key: String, #lN8dQFetqJHth1AL value: String) {
  #CyhoRYrDzoax7uWf skip;
}
#RcNTgCEEfMaVAPKo
action `type` pre_dialog(#MhFPWvm4z4qQSK8J req: ♻ restify → Request, #xHMRG82mSyQCWWjn res: ♻ restify → Response) {
  #HKfS1WcIVu1126r0 skip;
}
#OiGP143CVzXjsFvH
action oauth_login(#QlC0sVWB6Oe46fvX req: ♻ restify → Request, #UWYkkL3iV994FhXZ res: ♻ restify → Response) {
  #xHOAQiNOVMtWdZSV code→validate_oauth_parameters($req, $res);
  #KDEsjl180M5ddX8Z if `not` $res→finished then {
    #ow2nb8qd26SYkksF data→global_options→pre_dialog→run($req, $res);
  }
  #HXnXSYD1v0s5P8pz $client_oauth := records→client_oauth→create_from_json($req→query);
  #Y7fahpF2KA6Mkn8H data→logger→debug("login: " ∥ $client_oauth→to_json→serialize);
  #ubUGNeU3He3of9sD if `not` $res→finished then {
    #xF44DVpQQvJCFgfV $provider := records→Provider_index→at(code→or_empty($client_oauth→provider));
    #xO9Zi7nFOWU9SgII if $provider→make_login_url→is_invalid then {
      #O6lQ7YGVVHTrtg7J $coll2 := records→Provider_index→copy_to_collection;
      #lWJtiQMztk6my7JE if $coll2→count = 1 then {
        #SAuu3F5qchzKLNci $provider := $coll2→at(0);
      }
      else {
        #eKql0kKSo51N2DY4 $links := code→provider_links($req→query);
        #iqdobaHrJBa38P66 $s := $links→keys→map_to→String($lambda)→join("");
        #mHwrZZebvW35GtUJ where lambda(elt: String) returns (result: String) {
          #BAs5vozxFjTdF838 $client_oauth→provider := $elt;
          #a2r1O4IptnwgieRl $link := $links→string($elt);
          #EAjc9yHp7aOMjbVI `return` "<a class=provider href=\"" ∥ $link ∥ "\">" ∥ $elt ∥ "</a><br>\n";
        }
        #ka323RGBoeRhPBf2 $html := art→choose_provider\u002ehtml→replace("@BODY@", $s);
        #gD2UsJfAtsEeYQqr if `not` data→global_options→get_provider_template→is_invalid then {
          #gqMiaQrTf447v7Wo $s2 := code→or_empty(data→global_options→get_provider_template→run);
          #xcEmeHDiSHtguDyT if `not` $s2→is_empty then {
            #HJDLJGMhZSAs1D3R $html := $s2;
            #EnSI1QN5ObbH4MdK foreach k in $links→keys
            do {
              #a7EK3ikUnjBBJZV1 $html := $html→replace("@" ∥ $k ∥ "-url@", $links→string($k));
            }
          }
        }
        #xBw4GT8Q4DD9wjhO $res→html($html);
      }
    }
    #xqURNP81GkT73Xpx if `not` $provider→make_login_url→is_invalid then {
      #K3gER3mNU4wAV7co $p := records→oauth_request→create;
      #ObjwMtsYewRfvYtn $state := code→create_random_id(12);
      #x6ahl4aeGUMYwSiY $redir := data→global_options→@self ∥ "/oauth/callback";
      #OsyABWFS2ivp2hfq $p→state := $state;
      #f8zDbmLZDIbz2sBr $p→redirect\_uri := $redir;
      #LCB7J5ZB9AzjvQw1 $p→display := "touch";
      #ggfHHS99HM0HQzqW $p→\_provider := $provider→id;
      #rtGT642Qv4frE6l7 $p→\_client\_oauth := $client_oauth;
      #xYponv3WWDmccPJd if `not` data→global_options→federation_master→is_empty then {
        #wwSS2CVFoB8yaN28 $p→redirect\_uri := "https://" ∥ data→global_options→federation_master ∥ "/oauth/callback";
        #xE7HAQyFiftO9Z5E $p→state := data→my_host ∥ "," ∥ $state;
      }
      #xjKCDbSKBbvwWs2i $url := $provider→make_login_url→run($req, $p);
      #z4XU2s4JaqKu2lHh $p→state := $state;
      #n9zL45youjKxBAIv data→global_options→set_data→run($p→state, $p→to_json→serialize);
      #JrhVfvoHvNTIkfRv data→logger→debug("redirect url: " ∥ $url);
      #DS1kuNcE4kcN34PU $res→redirect(303, $url);
    }
  }
  meta private;
}
#xbot4WadoUsnWZDc
action validate_oauth_parameters(#MoY7RSQTH7MsGFzl req: ♻ restify → Request, #V8v0OD8IEaTh4vPN res: ♻ restify → Response) {
  #sV92uG2A4qiJfyog $client_oauth := records→client_oauth→create_from_json($req→query);
  #uB3MWW7ucA3jD8Wv if `not` code→or_empty($client_oauth→response\_type)→equals("token") then {
    #JlIGUPYVWNOpQhvH $res→send_error(400, "Only response_type=token supported.");
  }
  else { #xH2447MDMBhQb03e if code→or_empty($client_oauth→state)→is_empty then {
    #cG4b1vdBWEakFhZy $res→send_error(400, "state= required");
  }
  else {
    #cbxiLz9kDDOwoEWU $url := code→or_empty($client_oauth→redirect\_uri);
    #fcvlhv34I7yz9Ru7 if `not` ($url→starts_with(data→global_options→@self) `or` $url→starts_with("http://localhost:")) then {
      #jKvwvalsrEr7Yxj3 $res→send_error(400, "invalid redirect_uri; expecting it to start with " ∥ data→global_options→@self ∥ " or http://localhost");
    }
    #xgWcVkdopI27Jn2C if code→or_empty($client_oauth→client\_id)→equals("no-cookie") `and` `not` $url→equals(data→global_options→@self ∥ "/oauth/gettokencallback") then {
      #V4qoQHejpXi475WL $res→send_error(400, "invalid no-cookie redirect_uri; expecting it to start with " ∥ data→global_options→@self);
    }
  }
  } 
  meta sync;
}
#shZ5DNOoZq2upQsh
action options() returns(#xHn0bMOeLbz6UBzs auth_options: * Init_Options) {
  #hV42D9gZcUHEpMAy $auth_options := data→global_options;
  meta sync;
}
#BCTPfdcVEhKw8dET
action make_redirect_url(#OiOKqHYBdZd29nJo oauth_request: * oauth_request, #IZ2ECvn35EUUVwvX token: String) returns(#NGcOxO2jg2hG7Ziv url: String) {
  #Kw4q15lJw2QYEGku $hash := web→create_json_builder;
  #v9kdngrVk3TqALLy $client_oauth2 := $oauth_request→\_client\_oauth;
  #bEecZOKeZPuSm2y5 $hash→set_string("access_token", $token);
  #f9HQz7c395BXuApg $hash→set_string("state", $client_oauth2→state);
  #lh7cz268DimnsSe6 $url := $client_oauth2→redirect\_uri ∥ "#" ∥ code→to_query_string($hash→to_json);
  meta private;
  meta sync;
}
#tXmQcMJzh74Jp0yJ
action user_info_by_state(#cPf7nJeK2LeaICN9 state: String) returns(#amGhlmasCxWVjThn info: * User_Info) {
  #xj1Gus6NaPoVyzdZ $s := data→global_options→get_data→run($state);
  #xU8668MTmRpMVf7B if $s→is_invalid `or` $s→is_empty then {
    #gvsEatblyP7hJwyx $info := records→User_Info→invalid;
  }
  else {
    #RgXpbr1qsmRJB6Si $oauth_request := records→oauth_request→create_from_json(web→json($s));
    #j2raWMl424xxABoF $info := $oauth_request→\_info;
  }
}
#TsXlj7cJ11uEtDHC
action setup_restify_server() {
  #iQkWzbygHU69ZcCZ $server := @\u267b→restify→server;
  #AqkPDeEYcH4FEOLF $server→use(@\u267b→restify→authorization_parser);
  #lf2EvtbOQKM9ndYC $server→pre(@\u267b→restify→sanitize_path);
  #b14TYQBfTOfThkdr $server→use(@\u267b→restify→CORS);
  #sU6vG0iljq5z5bEE $server→use(@\u267b→restify→body_parser);
  #gs62NeF1duCHgMbk $server→use(@\u267b→restify→gzip_response);
  #jhnKGmIM9SLft9KW $server→use(@\u267b→restify→query_parser);
  #ofkvRJ3kVLDlChSU $server→use(@\u267b→restify→conditional_request);
  meta sync;
}
#jPaY47iCxKjomAkr
action set_self(#cZBoUv7DZJh2KoAJ req: ♻ restify → Request) {
  #x6lQ4SvMDe40ovQe if data→global_options→@self→is_empty then {
    #vxA8sJjc09vc00IO data→global_options→@self := $req→server_url;
  }
  #kYp4aiz06UbGBVee if data→my_host→is_empty then {
    #zHBjLgxtQi4zP2Tn data→my_host := data→global_options→@self→@match("^[a-z]+://([^/]+)")→at(1)→to_lower_case;
  }
  meta private;
  meta sync;
}
#O4GelthYwNaqdU9A
var fed_targets : Collection[String] {
  transient = true;
}
#TIKfICbNxFW4dtlQ
var my_host : String {
  transient = true;
}
#zjOzn82XoYwGrKGA
action `type` get_provider_template() returns(#wF44erkgjAu22rRw template: String) {
  #qUFhixNl6ONVlmej skip;
}
#xcl9y3vaw4LXwr7k
action `type` error_callback(#w3ZXJYfpdjveo4J5 res: ♻ restify → Response, #Pvgv10GrIPEMQpeh msg: String) {
  #xz2g2SYH3CmRHWlD skip;
}
#tMd1ibU9WSP2EsMj
action provider_links(#bBeJjQFQoMnGJ8wS query: Json_Object) returns(#bg1MD7F0xRr2IeMr links2: Json_Builder) {
  #xBXk8uJGNC4gxb1o $client_oauth := records→client_oauth→create_from_json($query);
  #yQCIgO2c7cbz4E1T $coll2 := records→Provider_index→copy_to_collection;
  #tGl5rp52Zju3jrcQ $links := web→create_json_builder;
  #JEM6qdysgGZEiNFZ foreach elt in $coll2→ordered_by( `fun:elt` $elt→order)
  do {
    #tgE8fP9NsH2uLqfy $client_oauth→provider := $elt→id;
    #CWhNZFeXh47337pc $link := "/oauth/login?" ∥ code→to_query_string($client_oauth→to_json);
    #QxwWgA2GfZuvN15M $links→set_string($elt→id, $link);
  }
  #yHbf4sXFSRJgim0V `return` $links;
  meta sync;
}


