meta version "v2.2,js,ctx,refs,localcloud,unicodemodel,allasync,upperplex";
meta name "raygun";
meta icon "Bolt";
meta color "#ffff0038";
meta rootId "I2dGxHAZfuTZQV9s6U4B4lKC";
meta iconArtId "entgiksx";
meta isLibrary "yes";
meta allowExport "yes";
meta hasIds "yes";
meta platform "network,npm,shell";
meta parentIds "";
// A library that send crashes to raygun.io .
#blxDYN8PgkoCtNMP
action init(#E41v2BATlL4K7Bmz options\u003f: * Options) {
  #cZqKbllCuQlUskiy // Initializes the raygun client with the given api key. If not provided, the ``RAYGUN_API_KEY`` server setting is used. ``version`` is an optional custom version number in the format ``y.y.y.y``. This version number will be displayed in the dashboard.
  #VEkQxS1sgu1Kca9c contract→requires(data→logger→is_invalid, "double initialization");
  #xvtu3aWID3VeeuG7 data→logger := app→create_logger("raygun");
  #fPBix9OQjr4BN3dv if $options\u003f→api_key→is_empty then {
    #l8pYmdxlDm10b7JH $options\u003f→api_key := app→server_setting("RAYGUN_API_KEY", false);
  }
  #e2piZ2fvSbvUviKI app→import("npm", "raygun", "0.*");
  #DJV5U6nQlMg88kZ2 if `not` $options\u003f→save_report→is_invalid then {
    #EKUQAfVXwX3VqwPV data→pending_reports := web→json("[]")→to_json_builder;
    #yf1o0NhRPJh58jHl `async` code→save_report_loop($options\u003f);
  }
  #NuDqILn0ir2LJTSs $pending := data→pending_reports;
  #eAe5rX3vg1kTzioP $logger := data→logger;
  #xy0yr52LsTw5GGtv app→javascript("local", "var opt = options.to_json().value();\nvar raygunClient = new raygun.Client().init({ apiKey: opt[\"api key\"] });\nvar util = require(\'util\');\nif(opt[\"version\"]) raygunClient.setVersion(opt[\"version\"]);\nTDev.RT.App.addTransport({\n  id: \"raygun\",\n  log : function(level, category, message, meta) {\n    // \"crash\" messages already reported below\n    if (level <= 3 && category != \"crash\") {\n      try { throw new Error(category + \": \" + message); }\n      catch(err) {  raygunClient.send(err, meta); }\n    }\n  },\n  logException : function(err, meta) {\n    logger.debug(\"sending crash: \" + err.message);\n    var req = err.tdNodeRequest\n    if (pending) {\n        var js = TDev.Ticker.mkBugReport(err, \"custom\")\n        pending.item.push(js)\n        if (!meta) meta = {}\n        meta.reportId = js.reportId\n    }\n    if (opt[\'private\']) {\n        raygunClient.user = function() { return \"anon\" };\n        if (req)\n            req = { headers: { \'user-agent\': req.headers[\'user-agent\'] } }\n        if (meta) {\n            meta = TDev.Util.jsonClone(meta);\n            delete meta.contextUser;\n        }\n    } else {\n        raygunClient.user = function() { return meta && meta.contextUser || null };\n    }\n    var msg = raygunClient.send(err, meta, function(resp) {\n        if (resp.statusCode >= 300) {\n          logger.warning(\"raygun resp: \" + resp.statusCode + \", retrying with TD\", s);\n          // raygun module has issues with unicode\n          var r = lib.WebRequest.mk(\"https://api.raygun.io/entries\");\n          r.set_header(\"X-ApiKey\", opt[\'api key\']);\n          r.set_method(\"POST\");\n          r.set_content_as_json(lib.JsonObject.wrap(msg));\n          r.sendAsync().done(function(r){\n              logger.warning(\"TD retry, \" + (r ? r.status_code() : \"X\"), s);\n          }, function(e){\n              logger.warning(\"TD retry, \" + e.message, s);\n          });\n          /*\n          logger.debug(\"raygun req: \" + util.inspect(msg), s);\n          logger.debug(\"raygun reqS: \" + JSON.stringify(msg), s);\n          logger.log(\"debug\", \"raygun req\", lib.JsonObject.wrap(msg), s);\n          resp.setEncoding(\"utf8\");\n          resp.on(\"data\", function(d) { logger.debug(\"raygun msg: \" + d, s) });\n          */\n        }\n    }, req);\n  }\n});");
  #xCaykevzIWMjQHuU data→logger→info("initialized");
}
#KNj8s07L4JUsaPIW
action example() {
  #SlkmGfJVuiNm8WPv // Sends crashes to [raygun.io](http://raygun.io).
  #x2JXgHlpDSllIJef // ### configuration
  #B4WDulYrkL3irCCC // Add this call in your ``_init`` action.
  #dFhoasOdVaZaBc64 code→init;
  #LJJG6A42ASyaTZn4 // The ``init`` action takes the raygun api key. If not specified, the key is read from the ``RAYGUN_API_KEY`` server setting. ``version`` is an optional custom version number in the format ``y.y.y.y``. This version number will be displayed in the dashboard.
  #aMGRATtcNIkFzeDH // ### that's it!
  #J4BW7D5eKSbw2nxj // All unhandled errors are automatically send to raygun after calling ``init``.
  meta private;
}
#dxpGHMqtGh46s9qv
var logger : App_Logger {
  transient = true;
}
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
#hqozb86wK2xuOpsG
var pending_reports : Json_Builder {
  transient = true;
}
#nAmHYcq9O1jIDAhv
action save_report_loop(#mUq9kNdkeGa0oaIX options\u003f: * Options) {
  #nf3iq4C9T9Sm2pv1 while true do {
    #x9x0yfea8xMrI1sI if data→pending_reports→count = 0 then {
      #vAfNlZFbjgPtl7I3 time→sleep(1);
    }
    else {
      #j1mSEbVWqVCo2ex4 $jsb := data→pending_reports→at(0)→to_json;
      #jHjZ5gJ2RNOIXbk0 data→pending_reports→remove_at(0);
      #WDBewPh42zcSm2dD // Note that this may crash. It would kill this loop. This avoids sending error reports about error reports.
      #r1LsAorInpVnqUnM // We don't think this is a problem since workers are restarted every 15 minutes.
      #zP45Vkf6dL6QmNTe $options\u003f→save_report→run($jsb);
    }
  }
  meta private;
}


