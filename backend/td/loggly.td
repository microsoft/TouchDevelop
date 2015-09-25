meta version "v2.2,js,ctx,refs,localcloud,unicodemodel,allasync,upperplex";
meta name "loggly";
meta icon "Search";
meta color "#ffffffff";
meta rootId "SXIW42WYv3tmJ7HhAV4J2eag";
meta iconArtId "nrpgbcng";
meta isLibrary "yes";
meta allowExport "yes";
meta hasIds "yes";
meta platform "npm";
meta parentIds "";
#VBU6geIZJgz6AFAQ
action init(#tLiB4EydPmrPnuaq options\u003f: * Options) {
  #rFAy6549MKz65X9P // Initializes loggly with the account information. If ``token`` is not provided, the ``LOGGLY_TOKEN`` server setting is used. If ``sub domain`` is not provided, ``LOGGLY_SUB_DOMAIN`` is provided.
  #U0T2bM7snJ4Ta6g2 contract→assert(data→logger→is_invalid, "multiple initialization");
  #dezgUgHRy8zbGwED if $options\u003f→token→is_empty then {
    #pFGVBHdtDRkeZww4 $options\u003f→token := app→server_setting("LOGGLY_TOKEN", false);
  }
  #X42RSMd72brN96NZ if $options\u003f→subdomain→is_empty then {
    #MAc5m0FoFXz26Bwc $options\u003f→subdomain := app→server_setting("LOGGLY_SUB_DOMAIN", false);
  }
  #g5RghHZ9Ti3GGit6 if $options\u003f→upload_interval ≤ 0 then {
    #xIEcBqvMr3ETgRid $options\u003f→upload_interval := 2;
  }
  #lANbeVFxjUCGn0VM if $options\u003f→min_level = 0 then {
    #pn36CFOY99V9fSl7 $options\u003f→min_level := 7;
  }
  #XwapkoxU2hGWDLFY code→set_min_level($options\u003f→min_level);
  #kLhteSZSdDM4lDlU data→logger := app→create_logger("loggly");
  #qOGnrz0VbYRGy1JS $all_tags := $options\u003f→global_tags→split(";");
  #x4OyOoKaTQkU0gXQ $all_tags→add("TouchDevelop");
  #ICnjDsYOZy2D9PRc $global_tags := $all_tags→join(";");
  #w3VgauMfVqbQl8IB app→import("npm", "loggly", "1.0.*");
  #Hy1j35tqtIhz9vDG code→init_proxy($options\u003f→token, $options\u003f→subdomain, $global_tags, $options\u003f→upload_interval);
}
#t8LAgdiLGLY92uO2
var logger : App_Logger {
  transient = true;
}
#xPkK6hcLnnbxkwc3
action example() {
  #tEceZzgOB8hI9h1U // Sends logging messages to [loggly.com](http://www.loggly.com).
  #fusEM6CYWTYmzWTy // ### configuration
  #lQZempI6CZpdn4lF // Set the ``LOGGLY_TOKEN`` and ``LOGGLY_SUB_DOMAIN`` server setting to your token and subdomain.
  #L0BPuApaBycfPyxe code→init();
  #MBwrDedjHPywCs3X where global_tags := "myapp";
  #WrdBR8mTPSSjlTP6 // That's it!
  meta private;
}
#YcUQrsiaaAJe7bVC
action init_proxy(#Ja414jcVXI2hDsrl token: String, #BTaPH4Vw6qAuN5nx subDomain: String, #Ywx5GhsUEo9f60TG globalTags: String, #sOKnNZZbxfdHUihb seconds: Number) {
  #HcYET71NAADp1euK app→javascript("local", "s.d.logglyClient = loggly.createClient({\n    token: token,\n    subdomain: subDomain,\n    tags: globalTags.split(\';\'),\n    json: true,\n    useTagHeader: false,\n  });\ns.d.logglyLogs = [];\nTDev.RT.App.addTransport({\n  log : function(level, cat, msg, meta) {\n      if (level <= s.d.logglyLevel) {\n        s.d.logglyLogs.push({\n          level: level,\n          category: cat,\n          message: msg,\n          meta: meta });\n       }\n  },\n  logException: function(err,meta) {}\n});\n// batching\nsetInterval(function() {\n  if (s.d.logglyLogs.length > 0) {\n    var lgs = s.d.logglyLogs;\n    s.d.logglyLogs = [];\n    var retry = 10;\n    var send = function() {\n       s.d.logglyClient.log(lgs, function (err, result) {\n              if(err) {\n                 if (retry-- > 0 && (err.code == \"ETIMEDOUT\" || err.code == \"ECONNRESET\"))\n                     setTimeout(send, 2000);\n                 else\n                     TDev.RT.App.logException(err);\n              }\n       });\n    }\n    send()\n  }\n}, seconds * 1000);");
  meta private;
  meta sync;
}
#mcXtPDXoV1gBZiJ8
action set_min_level(#sz1h4uYUJg9rnMIV level: Number) {
  #aCx11DX92cxd5uRL // Sets the minimum level of messages to be logged (``debug=7``, ``info=6``, ``warning=4``, ``error=3``)
  #S4lZHG24w207PGPf // {hints:level:6,7,3,4}
  #kMh3eexFZ6sLeBey $level := math→floor($level);
  #x6LiFVlcFX4DPUNd app→javascript("local", "s.d.logglyLevel = level");
  meta sync;
}
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


