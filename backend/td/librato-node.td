meta version "v2.2,js,ctx,refs,localcloud,unicodemodel,allasync,upperplex";
meta name "librato node";
meta rootId "zC4GIwTY0Gw2WjMAAo2M4Hyo";
meta isLibrary "yes";
meta allowExport "yes";
meta hasIds "yes";
meta platform "network,npm,shell";
meta parentIds "";
// A library to upload librato measures from node.js #node
#xI32BDmT1f0Focmv
action init(#KBR4ptf0RkHarPHP options\u003f: * Options) {
  #Wfrpr7oYxp8AqYV2 data→logger := app→create_logger("librato");
  #xa8h1j4CGJ42gyNM data→comm_state := web→json("{ \"measures\": {}, \"count\": 0, \"firsttime\": [] }")→to_json_builder;
  #t8XKKo0mTkYlejDj if $options\u003f→email→is_empty then {
    #gSUTxOSHe3OYUjJb $options\u003f→email := app→server_setting("LIBRATO_EMAIL", false);
  }
  #JqHKQT8VCHizHKC4 if $options\u003f→token→is_empty then {
    #EU1vFEjg96jitAft $options\u003f→token := app→server_setting("LIBRATO_TOKEN", false);
  }
  #yDSdos8qvkAkuSt9 data→options := $options\u003f;
  #xd9NKwcMbNj7QEaE $logger := data→logger;
  #YjcUIBWbCqbdAJzV $state := data→comm_state;
  #ahDhz02bDhkf4rrv app→javascript("local", "var everReported = {};\nvar opts = options.to_json().value();\nvar san = function (s) {\n  return s.replace(/[^\\w.:\\-]/g, \"_\").slice(0, 63);\n};\nopts.source = opts.source ? san(opts.source) : undefined;\nvar logMeasure = function(cat, id, val, meta) {\n      var st = state.value();\n      id = opts.prefix + cat + \":\" + id;\n      st.count++;\n      var repeat = meta && meta.repeat ? meta.repeat : 1;\n      if (!st.measures.hasOwnProperty(id)) {\n        var src = opts.source, nm;\n        var m = /(.*)@(.*)/.exec(id);\n        if (m) { \n            nm = m[1]; \n            src = san(m[2]);\n        }  else { \n            nm = id;\n        }\n        nm = san(nm);\n        st.measures[id] = {\n            min: val,\n            max: val,\n            sum: val*repeat,\n            sum_squares: val*val*repeat,\n            count: repeat,\n            name: nm,\n            source: src,\n        };\n        if (!everReported.hasOwnProperty(nm)) {\n            everReported[nm] = true;\n            st.firsttime.push(nm);\n        }\n      } else {\n          var e = st.measures[id];\n          e.max = Math.max(val, e.max);\n          e.min = Math.min(val, e.min);\n          e.count += repeat;\n          e.sum += val * repeat;\n          e.sum_squares += val * val * repeat;\n      }\n\n      if (meta) meta.skipLog = true;\n};\n\nTDev.RT.App.addTransport({\n  logTick: function(cat, id, meta) {\n      logMeasure(cat, id, 1, meta);\n  },\n  logMeasure: logMeasure,\n});");
  #bJFjT2icCIbE27Tr `async` code→send_loop;
  #e5c9Q214eAkiYBFJ data→logger→debug("started...");
}
#BVGhpbmca
table Options {
  type = "Object";
  exported = true;
  persistent = false;
  fields {
    #x16L8kN65iOjaTrU email : String
    #vciKbcIrAUdSxuYd token : String
    // Specify where measurements are coming from
    #xLjNkAf6ZSvr2vbX source : String
    // Upload data every `period` ms, defaults to 60000
    #ih0CiCqGBYWri79I period : Number
    // Add prefix to all metric names
    #d4fenIfoBobk2P11 prefix : String
    #I1pq77ATlI2jw74u aggregate : Boolean
  }
}
#Ff8gJY5IfV0ErwOH
var logger : App_Logger {
  transient = true;
}
#phVnyd45QGQfEo2l
action example() {
  #woIVOZaXDWl5HikB // A libraty to allows to upload measurements and counters to https://www.librato.com/ using https://github.com/goodeggs/librato-node .
  #ogTG2d3lvwrB76gl // {imports}
  #AS0w2Mro0RZP2Nd6 // ### setup
  #dqBfkLVS71abu2d6 // Call the ``init`` function in the server intialization action. If not provided, the email and token are read from the ``LIBRATO_EMAIL`` and ``LIBRATO_TOKEN`` server settings.
  #EqaLwqXYfzNr2MaT code→init;
  meta private;
}
#xw09In61hZVtNwC7
var comm_state : Json_Builder {
  transient = true;
}
#aaI9f1zqp0Y3lILo
var options : * Options {
  transient = true;
}
#F6zA33csiGYs4DpZ
table measurement {
  type = "Object";
  persistent = false;
  fields {
    #x4xLkVIs8ysQ0g3r name : String
    #xtOjbnqR3wrbhKi4 source : String
    #E2QrwaLed0zL9l3D min : Number
    #ky1NTHP7V72Qoz5W max : Number
    #zr2U6vAkZ1TBFuBx count : Number
    #QIkRMnNmPhmoHICe sum : Number
    #xGp7VlUe2WBOnZsz sum\_squares : Number
  }
}
#bZLeLuhKa7nsPlga
action send_loop() {
  #aju3ChQzFJbyVLC6 while true do {
    #faQYM4it4T1JWbEu if data→comm_state→number("count") > 0 then {
      #FKruGtmqQsf4tDFO // we do async to swallow any exceptions
      #BRLCCewrCYFXtXXT `async` code→one_report;
    }
    #xZLGhXzlvCcTxRFb time→sleep(data→options→period / 1000);
  }
  meta private;
}
#bH6yqbC5mVMq84kk
action create_req(#JFTF659mQp3qdGYt path: String) returns(#xz19xd4gqxwi9yRd request: Web_Request) {
  #lVDyaQHHLo8zyVCG $request := web→create_request("https://metrics-api.librato.com/v1/metrics" ∥ $path);
  #xBZln22NJjk1MPu1 $request→set_credentials(data→options→email, data→options→token);
  meta private;
  meta sync;
}
#p4RxEf2SK4D61zo3
action handle_aggregate() {
  #KKyIgyxtzq1q2Rrb if data→options→aggregate then {
    #nBNJ2iAsoFaAdhrX $ftime := data→comm_state→field("firsttime");
    #QmFLc4VpA6iKXYyg if $ftime→count > 0 then {
      #xusXwbk05e7EhxOc data→comm_state→set_field("firsttime", web→json("[]"));
      #yKEF4S3M8em5r7YP foreach elt in $ftime
      do {
        #nzojV9GE9i8VL45a $name := "/" ∥ web→encode_uri_component($elt→to_string);
        #AH7oCBB5XiRLR7Je $request2 := code→create_req($name);
        #Q4UsO2dmqjUAyflQ $curr := $request2→send→content_as_json→to_json_builder;
        #xowuQMvczXDKPbq1 $attr := $curr→field("attributes");
        #hgqW8026fQkx3ncG $b := $attr→boolean("aggregate");
        #j5sS3YB4SmNI6evj if $b→is_invalid `or` `not` $b then {
          #kEFRjGcYGCPd0zGh $attr→set_boolean("aggregate", true);
          #xqA2XGC4anDGhXgN $attr→set_boolean("gap_detection", true);
          #HetR78EccZ5zauKI $attr→set_string("summarize_function", "average");
          #ubrGDKYuI3vhsr28 $curr→set_number("period", math→round(data→options→period / 1000));
          #L2UOf9CA8Wxx8Rpe $request3 := code→create_req($name);
          #bO8JJVUDvmTnQKop $request3→set_content_as_json($curr→to_json);
          #sWrG0RFtOFHG7iff $request3→set_method("put");
          #xnOS6GXveYyZjzQQ $response2 := $request3→send;
          #eg462bWiAJs7RDfp data→logger→debug("set attr: " ∥ $response2);
          #xyzHi4NDCO2r4C7J if $response2→status_code ≠ 204 then {
            #xQb6IJbEDksYsZk8 data→logger→warning("resp: " ∥ $response2→content);
            #nQbGbfvHVCexWg0k data→logger→debug("put: " ∥ $curr→to_json→format(2));
          }
        }
      }
    }
  }
  meta private;
}
#kCWZw9dQ27yoJJDo
action one_report() {
  #J4VN5RcwTlawsvLb $jsb := data→comm_state→field("measures");
  #PVKZEG5Uk306B6w4 data→comm_state→set_field("measures", web→json_object);
  #tDZKsLGBlTMOAjn2 data→comm_state→set_number("count", 0);
  #M2B5K2zoILZhzhtX $jsb2 := web→create_json_builder;
  #V1tNFbsLbt4gJelW $jsb2→set_field("gauges", $jsb→keys→map_to→Json_Builder( `fun:k` $jsb→field($k))→to_json);
  #iomGNS2zpSe99KOx $request := code→create_req("");
  #q3PaTnZBO92dq1NY $request→set_method("post");
  #jSwi9NT0ryyDom97 $json := $jsb2→to_json;
  #x5RTG9xUdJllnbI2 if false then {
    #ClNJn6EJJSNlIdNQ data→logger→debug("POST: " ∥ $json→format(1));
  }
  #CE639byJvokSu7Sa $request→set_content_as_json($json);
  #C5niDZTIEve2VteE $response := $request→send;
  #xjGQeLSQElp0tQVD if $response→status_code ≠ 200 then {
    #VVqHDlxTrBz4BBg8 data→logger→warning("" ∥ $response);
    #BllB07gZXlR3JpyD data→logger→debug($json→format(2));
  }
  #GKbOfjprZ4OGD6xX code→handle_aggregate;
  meta private;
}


