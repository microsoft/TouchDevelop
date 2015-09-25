meta version "v2.2,js,ctx,refs,localcloud,unicodemodel,allasync,upperplex";
meta name "restify";
meta icon "Space";
meta color "#ff007fff";
meta rootId "HhWaZL6voPt0UGFgUYzJ3jbH";
meta isLibrary "yes";
meta allowExport "yes";
meta hasIds "yes";
meta platform "npm";
meta parentIds "";
// A library to build Restify web sites. #node #restify #azure
#BdGhpbmca
table Server {
  type = "Object";
  persistent = false;
}
#MWmbPcPkPPI8JpkN
action use(#Piqwv5pnNTvC9FF3 server: * Server, #xU0Z9uf6pfKaqQ3z mid: * Middleware) {
  #y4plcsslSjPKJ1CR // Installs a middleware for a given route path.
  #wGrZ4b6dAJnwQ21u app→javascript("local", "server.use(mid)");
  meta sync;
}
#mq24JTXJZWPtjRFz
action `type` Request_Handler(#xH4DaTtskdovgcGt req: * Request, #xeQDXwbaoE8Ha3tL res: * Response) {
  #x6JcfPYVNrPRSK4Y skip;
}
#yjeHSygpVj632yeP
table Middleware {
  type = "Object";
  persistent = false;
}
#FvK6YsJzyadaqznL
action example() {
  #nMhK2MwHZyA52e82 // This library is a thin wrapper around the [node-restify](http://mcavage.me/node-restify/) engine that TouchDevelop uses to route requests in web applications.
  #kYvHfpAd56sajl2P // ## configuring your web app
  #lWne6Ss3mZ2Qu3l4 // Typically, you'll want to setup your routes in the initialization of your web library or ``_init`` action.
  #LXrAumZtWXoDC2s3 // ## application and router
  #CyGLThr4qenVj7mg // * start by creating an Restify server app.
  #om141PB04UHhe9dB $ser := code→server;
  #H5G2u6o2ZqOCx2Z6 // ## routing
  #mi1mz4ggpXP1nd4K // You define routing path using ``get``, ``post``, ... Each function will match the HTTP method. ``all`` matches all methods.
  #rHMCbUpvLnBaHO1L // * define new routes to handle requests
  #eUvrTlKvpj8V0bSa $ser→get("/ping", $@then);
  #NtUnRhZZ64RqccNZ where @then(req: * Request, res: * Response) {
    #vbTQVnlfvfoxcgbl $res→send(time→now→milliseconds_since_epoch→to_string);
  }
  #JqvNBoqUc2yE5kGG // ## middleware
  #Y1Mr3kgweaTL1ZCy // * support for CORS
  #YqMoMTZTQM4NcUCA $ser→use(code→CORS);
  #enfhIjtUWPCxHF9K // * if you want to use `req->query`
  #y2da1i1B7aaRz88W $ser→use(code→body_parser);
  meta private;
  meta sync;
  meta test;
}
#Dp4jwJmteFN2Y12x
action get(#x0hfHcnzbE8gxWsp server: * Server, #xE748Dbp4qRs0rb0 path: String, #WqfVOjXDc2RQ2F2O @then: * Request_Handler) {
  #TK7S9XJYEM31da5O // This function matches the ``GET`` verb
  #x55WXymcw6VTNvST // {hints:path:/}
  #xX2KjXAoBK506OcA $server→route("get", $path, $@then);
  meta sync;
}
#x7dwyG3Cdu4MAAnU
action post(#n9z93dbtRg1oVx62 server: * Server, #SGRPfv32LEgsGa0t path: String, #S789LoXCIfwKJor8 @then: * Request_Handler) {
  #iqFocVeT0PPPpQjK // This function matches the ``POST`` verb
  #Rdhly42ERmLpgroh // {hints:path:/}
  #sKZR8rIp5GsEXnS8 $server→route("post", $path, $@then);
  meta sync;
}
#XMTK3L1Wf3qUG3Vl
action server() returns(#xouJaq7Nh8QXjK2p server: * Server) {
  #Zuh4vE17ZwrNgPFG // Gets the restify root sever instance.
  #stQ7YiXtZ4dyTlmt code→init;
  #Jy4E37UBLKqd4eQ7 app→javascript("local", "server = s.rt.rootRestifyApp");
  meta sync;
}
#TfU4mrMGaUkp2fzt
var logger : App_Logger {
  transient = true;
}
#a2tS6RYVtPW2gFgr
table Request {
  type = "Object";
  persistent = false;
}
#xozjPgw5RWBCTljD
table Response {
  type = "Object";
  persistent = false;
}
#xQ8r1QB4TeDMhIuC
action send(#xZFzPgFO3juHTYzm res: * Response, #xa439ZTNjvEFu8I9 content: String, #O2Oq5ipyQXy4NYf7 options\u003f: * Send_Options) {
  #X349yMfiDU6w6894 // Respond with a string.
  #xoD2A2OGBKMkPqRc app→javascript("local", "delete res.__next\nvar opts = options.to_json().value()\nif (!res.header(\'content-type\')) {\n  res.setHeader(\'content-type\', \'text/plain\');\n  res.charSet(\"utf-8\")\n}\nif (opts.status)\n  res.send(opts.status, content)\nelse\n  res.send(content)");
  meta sync;
}
#kFpZaIDrztJIZYEi
action status(#QTtyjDnyoT2Mjo22 res: * Response, #cfUiiDb4EqNKETuA status: Number) {
  #xkNQQfjeEnPDiXYw // Sets the response statusCode.
  #CtgWeqkqGsTDZpUI // {hints:status:200}
  #ENJkTtJwxMJih02P app→javascript("local", "res.status(status)");
  meta sync;
}
#mGD2r6DP39s2WFo2
action is(#xRLONjOCQwg22Qcq req: * Request, #SPnhkoGsDhvBIvLj type: String) returns(#iqDaI8i4w49SIcpz r: Boolean) {
  #hj1LlyBV3v4l2ekR // 
  #vY0tNOXrOSAzbJtv // Check if the incoming request contains the "Content-Type" header field, and if it matches the give mime type.
  #K2s2XPYud1qeoSWJ // {hints:type:application/json}
  #xyuoox6DOzgSnLZF app→javascript("local", "r = req.is(type)");
  meta sync;
}
#x4N0jRg3seSSOIeA
table Error {
  type = "Object";
  persistent = false;
}
#SO9YPc45JjDWRHvb
action init() {
  #wOr4VJa2gb2yQ4PT if data→logger→is_invalid then {
    #fIHq1RIfRgsZG6At data→logger := app→create_logger("restify");
    #b3i5Y9bIjQIqKqPA app→import("npm", "restify", "3.*");
    #uaea4dbncinf2K21 app→import("npm", "http", "");
    #pksiNhmQdgWNDg95 code→init_proxy(data→logger);
    #b9ngmt4mRXIHnaZc data→http_status := records→HTTP_Status_Codes→create;
    #NW3ElH1TWybUc44v data→http_status→@200_OK := 200;
    #X5zBYcxAG4IUYkKl data→http_status→@201_Created := 201;
    #i4KK5QFVt94w2K2O data→http_status→@300_Multiple_Choices := 300;
    #k53G1f38YgkGBgtL data→http_status→@301_Moved_Permanently := 301;
    #uKE46tC2F4mummmB data→http_status→@302_Moved_Temporarily := 302;
    #nMRxbcJMgMXla8D2 data→http_status→@303_See_Other := 303;
    #U860m2jmDUxlFSrK data→http_status→@304_Not_Modified := 304;
    #smhP6ZptNZX0Za34 data→http_status→@307_Temporary_Redirect := 307;
    #xoWp2404zTcKGweF data→http_status→@400_Bad_Request := 400;
    #trro1ldsM3uCGW14 data→http_status→@401_Unauthorized := 401;
    #oYc5bVHZi4tjeS83 data→http_status→@402_Payment_Required := 402;
    #kqeBWi4OusC8btg4 data→http_status→@403_Forbidden := 403;
    #hPkxzK34Ajqvt5km data→http_status→@404_Not_Found := 404;
    #xWv2LO57KtOxoVYd data→http_status→@405_Method_Not_Allowed := 405;
    #FUeEUeB6CPk0diRz data→http_status→@408_Request_Timeout := 408;
    #M3sou6WEjyueEGn5 data→http_status→@409_Conflict := 409;
    #d2Ns1KRsnEzxouJA data→http_status→@410_Gone := 410;
    #x5kD7D8P9IorSarl data→http_status→@412_Precondition_Failed := 412;
    #hXT2wEw28Oa6PW1t data→http_status→@413_Request_Entity_Too_Large := 413;
    #xY4rPrKg4Xiladwu data→http_status→@415_Unsupported_Media_Type := 415;
    #xeadSmxYLRzTz5yC data→http_status→@418_Im_a_teapot := 418;
    #dqbMetxHOOqwCUdF data→http_status→@422_Unprocessable_Entity := 422;
    #caFzC44TZGkZ9Og2 data→http_status→@423_Locked := 423;
    #EQA40qvHdLkjxVua data→http_status→@424_Failed_Dependency := 424;
    #bj9Ie2OLdQvzsfSQ data→http_status→@425_Unordered_Collection := 425;
    #QusNOA6W1oxUtOc2 data→http_status→@429_Too_Many_Requests := 429;
    #bK5cw0E6Ahzns0fK data→http_status→@500_Internal_Server_Error := 500;
    #QyLtPMJDzUEFa9Ly data→http_status→@501_Not_Implemented := 501;
    #xgvNMYjxg0mGFUor data→http_status→@503_Service_Unavailable := 503;
  }
  meta private;
  meta sync;
}
#eSQWeT3Uv5hD8dio
action accepts(#jBY2V2Y2BrA29V6X req: * Request, #B22DxQGXOoltmMZl types: String) returns(#IvcHsv10Fai2UYgF type: String) {
  #L6EJQkoQ8j2ngn4O // Check if the given types are acceptable, returning the best match when true, or else invalid (in which case you should respond with 406 "Not Acceptable").
  #PEIZzyJ6G1MLNnky // The type value may be a single mime type string (such as "application/json"), the extension name such as "json", a comma-delimited list, or an array. When a list or array is given, the best match (if any) is returned.
  #xWtZ7FDWhqLys0UI // {hints:types:application/json,text/plain}
  #xGQc91tYpHZoS42e app→javascript("local", "type = req.accepts(types)");
  meta sync;
}
#oYqyznJqORsX3EJd
action put(#rAmE6vm7bmJ9qrPq server: * Server, #mdTiUjyhIEl90ych path: String, #Dor2yr4CI7rDVv2g @then: * Request_Handler) {
  #osGk5ODn4d5d9FZO // This function matches the ``PUT`` verb
  #xYJortjE1wYoCsiQ // {hints:path:/}
  #o2tUQ7TUjtWi1hjd $server→route("put", $path, $@then);
  meta sync;
}
#qcaCk1wmanLRz2p0
action del(#U4EeutmQuttA5oqg server: * Server, #xGYYVSeaq0YQvyDP path: String, #x20dr6nBKFCJXkqw @then: * Request_Handler) {
  #hpVBktSn7zjYpNFF // This function matches the `DELETE` verb
  #iymzWGB4y5VEwi2b // {hints:path:/}
  #xL3jNfTwDkz4ucq2 $server→route("del", $path, $@then);
  meta sync;
}
#Sys5eAGCZAQXKLoL
action init_proxy(#JIW9VzIKbc83trlO logger: App_Logger) {
  #DqGpeCp28lrjGju8 $logger→debug("");
  #xXZyinJVp1OPdt4b app→javascript("local", "var server = restify.createServer()\ns.rt.rootRestifyApp = server\ns.rt.requestHandler = lib.protect(s, function(req,res) { \n    server._setupRequest(req, res);\n    return server._handle(req, res);\n})\nserver.use(restify.acceptParser(server.acceptable));\n\ns.rt.restifyErrorResponse = function (e, req, res, route) {\n    if (!e.tdMeta) e.tdMeta = {}\n    e.body = { \n        message: e.message, \n        stack: e.tdMeta.compressedStack,\n//        origStack: typeof e.stack == \"string\" ? e.stack.split(/\\n/) : [],\n        reportId: e.tdMeta.reportId,\n    }\n    if (route && route.name)\n      e.tdMeta.routeName = route.name\n    if (req) {\n      e.tdMeta.reqUrl = req.method + \" \" + (req.url || \"???\").replace(/access_token=.*/, \"[secure]\")\n      e.tdNodeRequest = req\n    }\n    e.tdMeta.interesting = true\n }\n\nserver.on(\"uncaughtException\", function (req, res, route, e) {\n    s.rt.restifyErrorResponse(e, req, res, route)\n    s.rt.handleException(e, null)\n    if (!res.finished) {\n       res.send(500, e)\n    }\n})");
  #x1xP6VMpHDmeJfn3 app→javascript("local", "s.rt.restifyHandlerFactory = function (s, then) { return lib.protect(s, function(req, res, next) {\n  res.__next = next;\n  lib.queueAction(s, then, [req, res], \n    function(st) {\n       var n = res.__next; delete res.__next\n       if (n) n();\n    },\n    function(err,st) {\n       s.rt.restifyErrorResponse(err, req, res, null)\n       lib.logError(err)\n       var n = res.__next; delete res.__next\n       if (n) n(err);\n    })\n}) }");
  meta private;
  meta sync;
}
#XQro0XXWsc2fv9zL
action head(#W8XloRAunLZ7LNht server: * Server, #xjLU4mXV49Gf442a path: String, #qQEWzNDvW0BIDDYd @then: * Request_Handler) {
  #sN8xk7ZjZEDrkUwR // This function matches the ``HEAD`` verb
  #BSj9QdjFH5DWwr5p // {hints:path:/}
  #R98HUc36gbzEfr2P $server→route("head", $path, $@then);
  meta sync;
}
#tyfNn5ZFgnIlSkDK
action pre(#xlLePjDyJxACojRx server: * Server, #N2jiKxKkpIez4wWw mid: * Middleware) {
  #EDWufqdGhLZi2ghe // Installs a middleware before any handler is run.
  #x50IEWSEH1rt5aXx app→javascript("local", "server.pre(mid)");
  meta sync;
}
#tslBjT0V82pVeYeV
action CORS(#rkHO022R215GR8my options\u003f: * CORS_Options) returns(#BztPN7SHpXXiyPlj mid: * Middleware) {
  #PJM4b3XiRHTgFfsN // Supports tacking CORS headers into actual requests (as defined by the spec).
  #UKBAPXh0bpFdQOx4 app→javascript("local", "var o = { }\noptions = options.to_json().value()\nif (options.origins) o.origins = options.origins.split(\';\')\nif (options.credentials) o.credentials = true\nif (options.headers) o.headers = options.headers.split(\';\')\nmid = restify.CORS(o)");
  meta sync;
}
#zf14e1QnofaYdSQJ
action conditional_request() returns(#NNy2jlNdGbDCrkG4 mid: * Middleware) {
  #Tyk74PJFvzo6uwOS // You can use this handler to let clients do nice HTTP semantics with the "match" headers.
  #BDhjj98nmbaGjOrg app→javascript("local", "mid = restify.conditionalRequest()");
  meta sync;
}
#NbFPSNRG87Q8oZq7
action route(#JpdfBJiMDyn4B8k2 server: * Server, #RI3rIsvXSY9O4scA method: String, #xQe2WUBuhnhWAWfj path: String, #QGuqv2H7pa3sFItP @then: * Request_Handler) {
  #xcguyU45OSW54DC3 $method := $method→to_lower_case→trim_start(" \t");
  #LUTUJ8Hd9DN89VdQ contract→requires($method→is_match_regex("^(get|head|opts|post|put|patch|del)$"), "unsupported method");
  #Pcj1GaXezD2THCxY data→logger→debug("mounting " ∥ $method ∥ " " ∥ $path);
  #QLekrK5Lb6ZdCM4P $@then := code→setup_handler($method, $path, $@then);
  #MApKsOVYFwaUo2mV app→javascript("local", "server[method](path, s.rt.restifyHandlerFactory(s, then));");
  meta sync;
}
#oB6j54E1E17vC2iV
action json(#tCUWOlZ4pUatKAWf res: * Response, #xIyVICnOuUUuPghb content: Json_Object, #zun6p8GZiOiuW6od options\u003f: * Send_Options) {
  #Sg0Sc2pd6Ilh54lr // Respond with a JSON payload.
  #Yzzkg77MNoFP0Wxg app→javascript("local", "delete res.__next\nvar body = content ? content.value() : null\nres.charSet(\"utf-8\")\nif (options.status)\n  res.json(options.status, body)\nelse\n  res.json(body)");
  meta sync;
}
#xJ467eQIZmFqIIBI
action next(#AeUNmnxWYV9wilIV res: * Response) {
  #jtcPfLw5a2PRHrSw // Explicitely calls the next handler
  #L6wH5xNwOEz9hOVI app→javascript("local", "var n = res.__next; delete res.__next\nif (n) n()");
  meta sync;
}
#NwRkfNT5tV0ZPYO6
action next_error(#xRJkGXz0a50nEFTM res: * Response, #hXZuSyiWwsg2Rfmj error: * Error) {
  #G1pqiOH3DoWkS8mo // Sends an error back
  #xZFuMMJt8aEx2r2W app→javascript("local", "var n = res.__next; delete res.__next\nif (n) n(error)");
  meta sync;
}
#xn24uPmFAO9K9ajg
action address(#vxOGiChSIBZYEPlx server: * Server) returns(#Ghp0i7uRtB1mFzft address: String) {
  #xW4v3At8CFfOk0DJ app→javascript("local", "address = server.address()");
  meta sync;
}
#AyKiQikVfhAFMEW7
action gzip_response() returns(#oM4t7JCP40lyV0T4 mid: * Middleware) {
  #xZi4SSIQjDjmZOwP // A plugin to gzip the response if the client supports it.
  #SUvUpq3ZtxSLCUsE app→javascript("local", "mid = restify.gzipResponse()");
  meta sync;
}
#eIFKdHknRGeq9B5x
action header(#x4bZr9hfsFgyflQB req: * Request, #qjOheepyMe7Cxhx3 name: String) returns(#hh8YVyA8fq7r5YFx value: String) {
  #SKWyhxceD7OPMdxj // Get the case-insensitive request header key
  #Ul2xlwQG6cUN2vDH app→javascript("local", "value =req.header(name)");
  meta sync;
}
#KMcDJvPWG8AKFbdr
action is_secure(#xP5lXofGRfvLI3eE req: * Request) returns(#gBh2gz6EuoTDlbGa r: Boolean) {
  #jyBj1y6XOdiQoAvw // 
  #x9WJiO0dqqgRwnEo // Check if the incoming request is encrypted (i.e, HTTPS).
  #vGaEDQj3s3Pll0Nx app→javascript("local", "if (req.header(\'x-arr-ssl\') && process.env[\'IISNODE_VERSION\'])\n   req._secure = true;\nif (req.header(\'x-forwarded-proto\') == \"https\" && process.env[\'TD_WORKER_ID\'])\n   req._secure = true;\nr = req.isSecure()");
  meta sync;
}
#eHkOU7XMw72nlM2u
action is_chunked(#dcx8X2oLFfNTB4g0 req: * Request) returns(#RTccvVk7DALvEEgU r: Boolean) {
  #xQBh4XtywsieUXKM // 
  #xSXCXvf79qYg29kZ // Check if the incoming request is chunked.
  #oMmC1o4dGGlUIqJ5 app→javascript("local", "r = req.isChunked()");
  meta sync;
}
#PdHT1r3hXD6ot8zw
action is_keep_alive(#dCqTE4pHDV0JtKUV req: * Request) returns(#xT8cH517UwA5w3Q0 r: Boolean) {
  #OImTIUf9bjIj9irn // 
  #BnG5XO0PtrXoBo1H // Check if the incoming request is keep alive.
  #gzf8U4HRzvpI7QP2 app→javascript("local", "r = req.isKeepAlive()");
  meta sync;
}
#jw0waiwdIzyaTg7a
action set_header(#fOY4OnGT2X1XjgBD res: * Response, #Pjmg9G6G8Ye2g6vJ name: String, #x2UnK1hI3Zh6hx8G value: String) {
  #pUYf0W584fj9pcPw // Sets the header value
  #B6hPNDzfxd67OH1p app→javascript("local", "res.setHeader(name,value)");
  meta sync;
}
#xg2ZxYhbo66WlWjB
action body_parser(#CQbyHoJN0rc27djY options\u003f: * Body_Parser_Options) returns(#P3ulgOJRy40sddrD mid: * Middleware) {
  #ZrLZsTYUliYxItAE // Blocks your chain on reading and parsing the HTTP request body. Switches on ``Content-Type`` and does the appropriate logic. ``application/json``, ``application/x-www-form-urlencoded`` and ``multipart/form-data`` are currently supported.
  #xvyWX67oHeHu4cZ6 app→javascript("local", "mid = restify.bodyParser(options)");
  meta sync;
}
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
    #w25h9R5LKJnWiBNu tokensTable : * Tokens_Table
  }
}
#x5eREPpwVMpD4Fj9
action throttle(#xuw82YsEaJgYOLdM options\u003f: * Throttle_Options) returns(#HznccGk1zVVJGC4U middleware: * Middleware) {
  #IsSriTyMfI7jOnry if $options\u003f→burst = 0 then {
    #w2KG78rLgC2N46YE $options\u003f→burst := 100;
  }
  #SadYKhKMR7BfCzW0 if $options\u003f→rate = 0 then {
    #f4NW8iDtfLAaJM7R $options\u003f→rate := 50;
  }
  #jQbIxZoTm9sH92eR data→logger→debug("throttle options: " ∥ $options\u003f→to_json→format(2));
  #HeXA8GNcBDBQm4t1 app→javascript("local", "middleware = restify.throttle(options.to_json().value())");
  meta sync;
}
#awqytBXX14sZPciR
table Tokens_Table {
  type = "Object";
  persistent = false;
}
#x2KQxt02mkDxOh4h
action date_parser(#x4ycpAyHbMNm0BOi clock_skew: Number) returns(#JyZ7AzA2qT6dbA57 middleware: * Middleware) {
  #ZDt7FGER4TR3K2CO // Parses out the HTTP Date header (if present) and checks for clock skew (default allowed clock skew is 300s, like Kerberos). You can pass in a number, which is interpreted in seconds, to allow for clock skew.
  #G5a8svc5RpFnLqaB // {hints:clock skew:300,60}
  #ZkosZU2LR6G4ReIf app→javascript("local", "middleware = restify.dateParser(clock_skew)");
  meta sync;
}
#hvy0V0vE9ezN56qI
action serve_static(#AO85MM0xZ6DjH5db directory: String, #rQxaq94Z2ira3N3f options\u003f: * Serve_Static_Options) returns(#x506g5fAW4aQMQTv middleware: * Middleware) {
  #Zft1AWSHp6a5zcD5 // The plugin will enforce that all files under ``directory`` are served. The directory served is relative to the process working directory. This module is different than most of the other plugins, in that it is expected that you are going to map it to a route.
  #m3ayPez2D0dbuaHw app→javascript("local", "var o = {\n  directory: directory\n}\nif (options) {\n  if(o.default) o.default = options.default\n  if (o.maxAge) o.maxAge = options.maxAge\n}\nmiddleware = restify.serveStatic(o);");
  meta sync;
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
#BaaoL3IJWOesixQE
action query_parser() returns(#xBRw4GrrVjMC42F7 middleware: * Middleware) {
  #xm0mgCSF29tRmoc6 // Parses the HTTP query string (i.e., ``/foo?id=bar&name=mark``). If you use this, the parsed content will always be available in ``req->query``, additionally ``params`` are merged into ``req->params``.
  #x2LtjvljJ4A2bWr7 app→javascript("local", "middleware = restify.queryParser()");
  meta sync;
}
#UNS93wK1a9CJs92v
action authorization_parser() returns(#Ev5DVaYmzc5eHA41 middleware: * Middleware) {
  #dab7B5hfE2op2RPu // Parses out the ``Authorization`` header as best restify can. Currently only HTTP Basic Auth and [HTTP Signature](https://github.com/joyent/node-http-signature) schemes are supported. When this is used, ``req->authorization`` will be set.
  #PD8GPM164lNctWuf app→javascript("local", "middleware = restify.authorizationParser()");
  meta sync;
}
#TjSMLB2xvq2HS3UR
action jsonp() returns(#ChUgWm5O82oRl2w9 middleware: * Middleware) {
  #N2RtyuTP84Tydi6h // Supports checking the query string for callback or jsonp and ensuring that the content-type is appropriately set if JSONP params are in place. There is also a default ``application/javascript`` formatter to handle this.
  #vD6et9ILALgtXfNJ // You should set the ``query parser`` plugin to run before this, but if you don't this plugin will still parse the query string properly.
  #gyS6UoaOXu6zZRLi app→javascript("local", "middleware = restify.jsonp()");
  meta sync;
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
#I1Q4LKqm4KR2HtuX
action body_as_json(#xELYvzMEP0UPy2gJ req: * Request) returns(#j0TJ211d2Ex2RK78 body: Json_Object) {
  #x72EUkfCUCP948vG // Gets the JSON body of the request. Requires ``body parser``
  #zrsMkyqjH0TGDn3t app→javascript("local", "body = lib.wrapJson(req.body)");
  meta sync;
}
#nTRAjBu67ulDMLPN
action id(#axL0yg5Z6WZTSsNW req: * Request) returns(#i2BsaEOGWFApRAyk id: String) {
  #mAdALmuKzlJEfun4 // Gets the request id
  #T5bxO4DCIKfABF25 app→javascript("local", "id = req.id");
  meta sync;
}
#xHf8BX3LdA3BelDq
action param(#G94jRhsHbpKt5oBB req: * Request, #xFl4pWI8G1fkdGYg name: String) returns(#StfRx1zbrDIdyc97 value: String) {
  #RDdHBbQBLuYkrkOL // Gets the parameter value.
  #Sr7fjHTy77SRzZ8r app→javascript("local", "value = req.params[name]");
  meta sync;
}
#MbwixsX2kjjraycG
action opts(#IC14KvJzQZd7Vdrn server: * Server, #w1ums1CgbfD2gB1p path: String, #Ju4mFW0KMOZguzOV @then: * Request_Handler) {
  #xZgsjuZTCZPF5ReZ // This function matches the ``OPTIONS`` verb
  #xkMMTf2ppCizHex1 // {hints:path:/}
  #Xppi5cYFbcDTebK5 $server→route("opts", $path, $@then);
  meta sync;
}
#b8a9GLQE6a3H6M83
action patch(#OxUpuR4NyY767Mn9 server: * Server, #fRqdbknLtaEhWgQq path: String, #hwlKIvY3dYRfHnqK @then: * Request_Handler) {
  #xuq9daaZakm196A8 // This function matches the ``PATCH`` verb
  #FwlTW45mf0h2nR3E // {hints:path:/}
  #j2suIYhZad2SXy6s $server→route("patch", $path, $@then);
  meta sync;
}
#ghIe7fALTttqoKvY
action to_string(#x432BI525jDrCP2t ser: * Server) returns(#QrtfwjLS2A7SvgGH s: String) {
  #T8BPiSE7qngfSNAG // Gets a string that describes the current server
  #DjkrHVu8gNF1C4gu app→javascript("local", "s = ser.toString()");
  meta sync;
}
#hMo97dMjhKsPfh6C
action sanitize_path() returns(#xcIFZXhBWQopSeuB middleware: * Middleware) {
  #xDXBbMyqso4bmddt // A plugin that cleans up the path
  #vLUGtUJaO3h8Jfv2 app→javascript("local", "middleware = restify.sanitizePath();");
  meta sync;
}
#MoPo74fFgmRwZxIU
action body(#Z9L5sk34agtDWILV req: * Request) returns(#KArs48wMy3mrhedk body: String) {
  #OOfQs2dpX12EzYwe // Gets the body of the request as text. Requires ``body parser``.
  #xfOOkhYXAC86Wi3l app→javascript("local", "body = req.body");
  meta sync;
}
#VJznt3ZFBGXZUsmg
action send_error(#xMZ44ENo8cnlRJbQ res: * Response, #zZ2g1HT7h94owHrw status: Number, #xsddqWmAFai1gzao message: String) {
  #TCqf1f10hyuAvOe7 // Sends an HTTP error
  #xKUqCHRFK8SniVKG // {hints:status:400,401,402,403,404}
  #x4VO0LW9sahsJaLq app→javascript("local", "delete res.__next\nif (!message) message = http.STATUS_CODES[status] || \"code: \" + status\nres.send(status, new Error(message))");
  meta sync;
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
#x142yV34Md7UL8uN
action all(#wmv1yh471PeEcyrN server: * Server, #g6652TO1AJGAKNfB @then: * Request_Handler) {
  #XdV3ci1g0OPKcJae data→logger→debug("mounting catch all handler");
  #Cm63gJpafwielefA $coll := "get|head|opts|post|put|patch|del" →split("|");
  #f8ByvLm3OojbNdY6 foreach meth in $coll
  do {
    #ByzKDMlId5BlszFm code→route_regex($server, $meth, ".*", $@then);
  }
  meta sync;
}
#i52jjfORI8c2mLlw
action method(#xy6fKe4NIOUzu31g req: * Request) returns(#xMfTAIHXy9SHM0i0 method: String) {
  #IpNoW04mKac5BOc1 // Get the method, eg. `GET` or `POST`
  #xFoR8lpXl2eWRyx2 app→javascript("local", "method = req.method");
  meta sync;
}
#HGfUgyNcTA1CsT38
action url(#Gh3OMmsp0W5dwbL5 req: * Request) returns(#xqiKJqCXMMzSJNPc url: String) {
  #xiR4xbIlrYIFNPw2 // Get the path of the request, eg. `/api/post?param=42`
  #xMiabbG36aFyO5p5 app→javascript("local", "url = req.url");
  meta sync;
}
#Af8zGG2ErsjjKhRy
action query(#x2vxxCNHnYY7D1qf req: * Request) returns(#RKkPRIQay6uJ3UOd query: Json_Object) {
  #yA7fGy0oJTuVA2rx // This property is an object containing the parsed query-string (needs `use(query parser)`)
  #PUholZAoefMS90Bk app→javascript("local", "query = lib.JsonObject.wrap(req.query)");
  meta sync;
}
#RSeBaVmhT65YaUst
action redirect(#jMxY4En58rki9pgt res: * Response, #x4rpMIkNVxRV2gQ1 status_code: Number, #H23zepcUxL7HdAv2 url: String) {
  #IQr68sYdoIh4yGhJ // Explicitely calls the next handler
  #ci6AXQ1ZLhj10M54 // {hints:status code:302,301,303}
  #Hxadl2XKbNn5cW0s $res→set_header("Location", $url);
  #x3YTzVQ2lq2DlBap $res→send_status($status_code);
  meta sync;
}
#c6BbiMpGNgqIJ9X3
action send_status(#fudcqLzn9fZ8KH4o res: * Response, #xhUZESzzU4dzJqmm status_code: Number) {
  #hjT3fJIDLA4FzBpp $res→send("");
  #xV5KPCdkShLlPKRt where status := $status_code;
  meta sync;
}
#Dc4Uo5EFiU4Mwk4u
action charset(#xr8kq88diKeYzelw res: * Response, #Cs7vMnNiVr14djt4 encoding: String) {
  #nmxpBpTSr0u16mGq // Sets the response '; charset=...' in Content-Type header.
  #QHFqco2PKS4dktq7 // {hints:charset:utf-8,iso-8859-1}
  #GImFf2RayZDbwVap app→javascript("local", "res.charSet(encoding)");
  meta sync;
}
#mEwxzTb2KfjhI8T2
action route_regex(#lzaPsJDfUjTkxT34 server: * Server, #Vz5BxM2DGypMTyKy method: String, #dAWoQ2468mpBh42d path_regex: String, #FTmd41H628k5HQYq @then: * Request_Handler) {
  #FhVHgGAnX24h92DU $method := $method→to_lower_case→trim_start(" \t");
  #zudMTY4cOjU1gZ4a contract→requires($method→is_match_regex("^(get|head|opts|post|put|patch|del)$"), "unsupported method");
  #l7WTdsPGJxxL6Tpw data→logger→debug("mounting " ∥ $method ∥ " Regex: " ∥ $path_regex);
  #A2LLXyayFqNhX4nn $@then := code→setup_handler($method, $path_regex, $@then);
  #zpyb1P44YohaE7tl app→javascript("local", "server[method](new RegExp(path_regex), s.rt.restifyHandlerFactory(s, then));");
  meta sync;
}
#lyJqo0S8eHSZQbrI
action read_body_as_buffer(#sbMrZA2dzskCbPYV req: * Request) returns(#Hd70jCnPm6UFE2sU body: Buffer) {
  #yl2PEMvQf2eSTQVp // Gets the binary body of the request.
  #xDsTXxk17jzoTwH2 app→javascript_async("local", "var bufs = []\nreq.on(\"data\", function(data) {\n  bufs.push(data)\n})\nreq.on(\"end\", function() {\n  body = lib.Buffer.fromNodeBuffer(Buffer.concat(bufs))\n  resume()\n})");
}
#xq1W2rbglf2LhTOn
action headers(#C6aQIvK3s41Qn0Pi req: * Request) returns(#AtavggXtENyhWNG9 headers: Json_Object) {
  #tX7S2z75MEMOVS3s // Gets all the request headers
  #tnhAnkbKheETXi7O app→javascript("local", "headers = lib.JsonObject.wrap(req.headers)");
  meta sync;
}
#xuOCTu3xqTjZp1b5
action server_url(#xBfCsfGNYI2Gm0rn req: * Request) returns(#X1n4QbhYXyv4cj9E url: String) {
  #nB9ItpeT4FZrhAKg // Get the URL of the server (e.g., ``https://foobar.azurewebsites.net``)
  #mzwRse4YH1XzqveD if $req→is_secure then {
    #sF8bHaX8OHPRVrfU $url := "https://" ∥ $req→header("host");
  }
  else {
    #o0lJg8OKrGrkVRMq $url := "http://" ∥ $req→header("host");
  }
  meta sync;
}
#fqtmegSaI9O9BFry
action html(#eR2i9LQ8Rgo420ju res: * Response, #ooeD7LaT32nGWJhr content: String, #Sk1hzuAgZcQS1keI options\u003f: * Send_Options) {
  #MbUxrYi9FEUAXb35 // Respond with HTML document, bypassing formatters.
  #xIrvLsLa14GXUk57 code→send_text($res, $content, "text/html", $options\u003f);
  meta sync;
}
#GxzEgOHEMgwb3dIo
action send_text(#ZGWhHJRW2MhEftYr res: * Response, #ZV16vURVCGgEb77L content: String, #Rj0zjdb8L2XGJCET content_type: String, #HckTf08cc2JvIlVQ options\u003f: * Send_Options) {
  #K42FxSRl8m5bs5pY // Respond with any text document, bypassing formatters.
  #ouA4Bk95i0cUDGee // {hints:content type:text/plain,text/html,text/css,text/cache-manifest,application/javascript}
  #UZ5CacZJR4VpCmkA app→javascript("local", "delete res.__next\nvar opts = options.to_json().value()\nvar buf = new Buffer(content, \"utf8\");\nres.setHeader(\'content-type\', content_type + \'; charset=utf8\');\nres.setHeader(\'content-length\', buf.length);\nres.writeHead(opts.status || 200);\nres.write(buf);\nres.end();");
  meta sync;
}
#x0dhBBvmjIZzUisy
action send_buffer(#K47rixrNxGVPwYci res: * Response, #malv4GTpKW8Lmdz2 content: Buffer, #MUaGdpL8E2M7hJk5 content_type: String, #rErZJXsHCWTzPQNR options\u003f: * Send_Options) {
  #xdkrM0a7UU0P2pii // Respond with a given buffer.
  #St9E5LRkWDE2Bch0 // {hints:content type:application/octet-stream,image/jpeg,image/png}
  #xRUAZZAaPtoZvw30 app→javascript("local", "delete res.__next\nvar opts = options.to_json().value()\nvar buf = content.toNodeBuffer();\nres.setHeader(\'content-type\', content_type);\nres.setHeader(\'content-length\', buf.length);\nres.writeHead(opts.status || 200);\nres.write(buf);\nres.end();");
  meta sync;
}
#xpCAWqDmeR4AeWCW
action finished(#pVQPG2PR5VKqVepu res: * Response) returns(#sm98FVyNWOfWIvjS done: Boolean) {
  #pk7GWplhoxGqD3u4 // Check if the response was already sent.
  #pmqm0GX5IBqWS1JB app→javascript("local", "done = res.tdFinished || res.finished");
  meta sync;
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
#S60eok1URpElrFGA
action http() returns(#LNj4PIAWOVlPMTTS codes: * HTTP_Status_Codes) {
  #YcK4OnsFVe8yrxdf // Interesting HTTP status codes.
  #STZr3SN34EX229YG code→init;
  #xUsN6y8vpGQduF7u $codes := data→http_status;
  meta sync;
}
#soge4DN43hCSVPQU
var http_status : * HTTP_Status_Codes {
  transient = true;
}
#h2tGRchxd72g7xMi
action setup_handler(#x4LOgjL45i5NGw24 method: String, #L1523wB6bNlSnpNC path: String, #nQ04ZHZAQ4BA9VQ9 @then: * Request_Handler) returns(#e69J3V4Vs0XthbvS then2: * Request_Handler) {
  #xhUD2xjjiYPzyY2r $ref := create→Ref_of→\u2339Request_Handler;
  #xmtwC9JeX2U7Orkr $ref→\u25c8set($t);
  #iiN0l0hRIJrV4fbW where t(req: * Request, res: * Response) {
    #xplOhE2FyDbNUPDU $logger := data→logger;
    #xuzYFMGp2s5rY2Oc $logger→new_context;
    #meUlm6y46GYIB1Xx $url := $req→url→replace_regex("access_token=.*", "[secure]");
    #jS2TFQbEmMT8KEQ0 $id := $method ∥ " " ∥ $path;
    #g1U4XFBiEX2SZUui $logger→debug("start " ∥ $method ∥ " " ∥ $url);
    #j14ZLQuCxbXi42CG app→javascript("local", "var fin = function() {\n  var meta = { rawURL: url, statusCode: res.statusCode }\n  logger.custom_tick(id, lib.JsonObject.wrap(meta), s)\n  res.tdFinished = true;\n}\nif (!res.origEnd) res.origEnd = res.end;\nres.end = function() {\n  res.origEnd.apply(this, arguments);\n  fin();\n}");
    #pS8nMxzYuOSRZvwr $@then→run($req, $res);
  }
  #vvMClbSOZP07PNFU $then2 := $ref→\u25c8get;
  meta private;
  meta sync;
}
#PH6wBG4vCtMfc5YP
action remote_ip(#YLn1bbgx91D0dQDx req: * Request) returns(#xjSWJglKS2tAtyaf ip: String) {
  #p2FjH8PNGp0apBfo // 
  #RxNxmC097Uy1OJoF // Get the IP address of the connecting client.
  #fhtOEqhkcnPh1Coo app→javascript("local", "var fw = req.header(\'x-forwarded-for\')\nif (fw && (process.env[\'IISNODE_VERSION\'] || process.env[\'TD_WORKER_ID\'])) ip = fw\nelse ip = req.connection.remoteAddress + \"\"");
  meta sync;
}
#Rm28JPHs7j84y33W
action disable_ticks() {
  #Kh4KdCoRUA3S2Jq6 $logger := data→logger;
  #L1zJH45RxycB54sx app→javascript("local", "logger.custom_tick = function() {}");
  meta sync;
}
#odfHWh5xItk9nIPd
action send_custom_error(#EELrukt6PrPdpxhQ res: * Response, #rbd692H8SRV5HJ6L status: Number, #xig2IxtmxOGDws2s message: String) {
  #Cic2oVzqvZOEzBww // Sends an HTTP error
  #U34Kc92XPVL2xBCs // {hints:status:400,401,402,403,404}
  #ei5bD0a9SJ2b77n6 if $message→is_invalid then {
    #xgCCm4xeY0bqeQh1 $message := "";
  }
  #CRn7bzC4hbc71GRy contract→requires( `not` $message→contains("\n"), "Head-message cannot contain new lines");
  #qIaWJYx71C447qsj app→javascript("local", "delete res.__next\nif (!message) message = http.STATUS_CODES[status] || \"code: \" + status\nvar buf = new Buffer(JSON.stringify({ message: message }, null, 2), \"utf8\");\nres.writeHead(status, message, { \n  \"Content-Type\": \"application/json;charset=utf8\",\n  \"Content-Length\": buf.length\n })\nres.end(buf);");
  meta sync;
}


