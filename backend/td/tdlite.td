meta version "v2.2,js,ctx,refs,localcloud,unicodemodel,allasync,upperplex";
meta name "tdlite";
meta icon "Bolt";
meta color "#ff007fff";
meta rootId "IMEKgv2Kwk84iabrAFkoIbVb";
meta iconArtId "lymzxufx";
meta allowExport "yes";
meta isCloud "yes";
meta hasIds "yes";
meta platform "network,npm";
meta parentIds "";
#xQ4njbX5KC6Stm5H
action \_init() {
  #xh7gqc28P6hl504U data→rewrite_version := 220;
  #rnQLOhhyBwBvHAEv $reinit := true;
  #x9AWMOOx8vdgyvHU data→logger := app→create_logger("tdlite");
  #yWzUgrI4ghxM4bpS data→throttle_disabled := code→or_empty(app→server_setting("DISABLE_THROTTLE", true))→equals("true");
  #xn86h2QqEnwh6SbA data→disable_search := code→or_empty(app→server_setting("DISABLE_SEARCH", true))→equals("true");
  #bU1uZohkB7MZ8qSq data→my_channel := code→with_default(app→server_setting("TD_BLOB_DEPLOY_CHANNEL", true), "local");
  #xgMAtG0jkRdn3jt4 data→deploy_channels := code→with_default(app→server_setting("CHANNELS", false), data→my_channel)→split(",");
  #xuOimE6W2GHjaM4p data→template_suffix := code→or_empty(app→server_setting("TEMPLATE_SUFFIX", true));
  #zUUKknKW9CsYUkBX data→full_TD := false;
  #X7oGlnJXkDrIqdPz data→initial_approvals := data→my_channel→equals("test");
  #aCtqrVax2ZSmRq1J skip;
  #YJdTh4EGqSIQPFk3 if code→has_setting("LOGGLY_TOKEN") then {
    #wq4I3DaIfOuXI4e2 @\u267b→loggly→init;
    #HoGarB5SKbmu4jGf where global_tags := app→server_setting("LOG_TAG", false);
  }
  #xd4MAz3rdTOGfnRu if code→has_setting("RAYGUN_API_KEY") then {
    #Yqwo9njO7OS7p3UD @\u267b→raygun→init;
    #hgxBMZCPIXd2g4eY where @private := `not` data→full_TD;
    #RScKOrReGzQzjiH8 where `optional` save_report(json: Json_Object) {
      #xWgGOHQ2jERgFjug $blob_name := code→or_empty($json→string("reportId"));
      #Xy2kV4JrVSAXsv4q if `not` $blob_name→is_empty then {
        #xzQifVkCO8exm2Ya $enc_report := code→encrypt($json→serialize, "BUG");
        #nSWrlVCjZCSBAw4h $result4 := data→crash_container→create_block_blob_from_text($blob_name, $enc_report);
      }
    }
  }
  #Ohn2H1meMJUeji8V if false then {
    #x85P4rH7qdghJKxa if code→has_setting("APPINSIGHTS_INSTRUMENTATION_KEY") then {
      #xH8dAn5tgz4W74c2 @\u267b→application_insights→init;
    }
  }
  #awHmk2Rjl4p5gYHO if code→has_setting("LIBRATO_TOKEN") then {
    #udREYG48Iz9FLQ8w $lib_source := code→with_default(app→server_setting("RoleInstanceId", true), "local");
    #xjnOMahbglviUmnZ @\u267b→librato_node→init;
    #TIFZJmIbFmYAfQsf where period := 60000;
    #gkpRRuWPZMOGc4TI where aggregate := true;
    #eCmwR1SpL4Vajwqj `async` code→status_report_loop;
  }
  #Gt6cD7QsHtSqyjm2 skip;
  #YjOXH2LFB0pWn72a data→mbed_version := 2;
  #FdwpiA9yap3TswCm data→mbed_cache := true;
  #x5VRPzc7PVoP8SdZ data→release_version_prefix := "0.0";
  #E1qy48tzTbTOZfW9 skip;
  #uo0A8EhcsuhSUYnF $creds := code→or_empty(app→server_setting("BASIC_CREDS", true));
  #xXScCPSh3b1g3Ygm if `not` $creds→is_empty then {
    #Y9MmQILKV5jo25gO data→basic_creds := "Basic " ∥ bits→string_to_buffer($creds, "utf8")→to_string("base64");
  }
  #LquUZC15dj4hpbSK data→table_client := @\u267b→azure_table→create_client;
  #uEVj9I0kcM8l5TXm where timeout := 10000;
  #NeNeqnxph8HnP64q where retries := 10;
  #zjtcv0byY397KNK6 @\u267b→azure_blob_storage→init;
  #xHr8tkZNjSd1AcUI data→blob_service := @\u267b→azure_blob_storage→create_blob_service;
  #gK2Ijpgmy22aUk4Z data→workspace_container := create→Collection_of→\u267bcached_store\u200a\u2192\u00a0container;
  #xn4lyhHI5LzeDr4p data→redis_client := @\u267b→redis→create_client("", 0, "");
  #pAsDi58hvfC4ilab data→main_release_name := code→with_default(app→server_setting("MAIN_RELEASE_NAME", true), "current");
  #XrDH41OkyzCUeFHX if $reinit then {
    #x5n52BnoBqyuPKLm $success := data→blob_service→set_cors_properties("*", "GET,HEAD,OPTIONS", "*", "ErrorMessage,x-ms-request-id,Server,x-ms-version,Content-Type,Cache-Control,Last-Modified,ETag,Content-MD5,x-ms-lease-status,x-ms-blob-type", 3600);
  }
  else {
    #xyUYzbmZgsbC2Lhf @\u267b→azure_table→assume_tables_exists;
  }
  #WjpK0dL5A4ivyDKb if code→has_setting("KRAKEN_API_SECRET") then {
    #MiH4Eru1Z5o9FXe8 @\u267b→kraken→init("", "", "won\'t give you", "my azure account", "nope");
  }
  #dqM2cA45IDmbwxnn @\u267b→mbedworkshop_compiler→init;
  #UgoElPKx2oz2PUP4 @\u267b→mbedworkshop_compiler→set_verbosity("debug");
  #FEWRZqEOLH8RGsr3 skip;
  #KftkIcvWbWYon4QZ data→has_https := app→server_setting("SELF", false)→starts_with("https:");
  #xNOg3Xw4XKsUQxtc if code→has_setting("SENDGRID_API_KEY") then {
    #H660aAL4sWMZQIPj data→use_sendgrid := true;
    #xDXtPxEsTLsfGHhh @\u267b→sendgrid→init("", "");
  }
  #TtrVViSAkY1GqTzZ @\u267b→nodemailer→init;
  #xvuwledv2yH245iO skip;
  #laBHw54PhNoksXyv @\u267b→azure_search→init;
  #L4a5cc7qlu2fp0y2 where allow_409 := true;
  #l8owNgPQ6VI44KRf @\u267b→touchdevelop_cloud→set_options;
  #AfeKdia1SLY4aNQs where service_root := app→server_setting("SELF", false);
  #aUsBzLJcn5Xf845A where access_token := app→server_setting("TDC_ACCESS_TOKEN", false)→replace_regex(".*=", "");
  #xqh8TI9SyZTDSiqo @\u267b→tdlite_search→init;
  #N2X7gp2DQRUJX0jg if code→has_setting("MICROSOFT_TRANSLATOR_CLIENT_SECRET") then {
    #DKHWpMfEvtHVq3at @\u267b→microsoft_translator→init("", "");
  }
  #blGQTglpDaMUQsiY $time_delta := data→redis_client→cached_time - time→now→milliseconds_since_epoch;
  #xhtq6tOKMcWL1sdA data→logger→info("time difference to redis instance: " ∥ $time_delta ∥ "ms");
  #lUoodyK9WdprHcm2 if false then {
    #xMFnfi81UktkmAad data→logger→info(data→redis_client→send_command("info", web→json_array)→serialize);
  }
  #rVvm1B6OkLrmVPId skip;
  #qJN7xR4B3MlkKhWN data→token_secret := app→server_setting("TOKEN_SECRET", false);
  #qvymShvnyrpdWK33 @\u267b→cached_store→init;
  #Lu5X3VzCXLjP4MTi @\u267b→indexed_store→init(data→table_client);
  #FNUyXGZ2RJoTakVa @\u267b→cached_store→logger_→set_verbosity("info");
  #ryvBQIRvmQXfUIlD skip;
  #xi4Ac9cKSdH0YzUk code→\_init_0;
  #ZEW4ymALWk6Zcz94 skip;
  #c2DmPe55TntCOsAd if code→has_setting("LIBRATO_TOKEN") then {
    #xuOCTFLVWmrrXdcG `async` code→failure_report_loop;
  }
  #Y0FZK2xiZdMZdBFR data→empty_request := code→build_api_request("/api");
  #t7efGXbA1bZYX2NZ data→admin_request := code→build_api_request("/api");
  #hrf0KjHmXKyHCTxa data→admin_request→userinfo→json := web→json("{ \"groups\": {} }");
  #mjWjiIdCMA1LrkHf skip;
  #Jmj4uH1zLDr1uo6g data→@self := app→server_setting("SELF", false)→to_lower_case;
  #MZX1oFuyNE6dhEZt data→my_host := data→@self→@match("^https?://([^/]+)")→at(1)→to_lower_case;
  #GyR2ZutOA6d3g6jZ data→non_self_redirect := code→or_empty(app→server_setting("NON_SELF_REDIRECT", true));
  #SljF2Y7qcdIVDxql skip;
  #fxkk1SjXPLXo2R7b $server := @\u267b→restify→server;
  #GIVmhQFHYk0vUjyN $server→use(@\u267b→restify→body_parser);
  #aUUk024kuKMnzNgg $server→use(@\u267b→restify→query_parser);
  #b2gXcxSJwGYe60uR $server→use(@\u267b→restify→gzip_response);
  #Ra9Q6mpWhWa2rX8J $cors := @\u267b→restify→CORS;
  #hvrf0ML2BfGzqQqi where credentials := true;
  #zA4uyF4266lLniSd where headers := "ErrorMessage";
  #ZzbqtEEUDc2KXI2v $server→use($cors);
  #AhQUJ73YhaegMz6b @\u267b→restify→disable_ticks;
  #kjRrjreRehdOd24U code→\_init_acs;
  #jPgbkIUFR7CXoh1n skip;
  #sq2JdmLh6864PP5U $server→get("/api/ping", $then5);
  #mxwkI1WippzIXVe4 where then5(req: ♻ restify → Request, res: ♻ restify → Response) {
    #Au9cqIbKAm1QPFmh code→handle_https($req, $res);
    #qAMgN2zNHY7qTotM if `not` $res→finished then {
      #hPEwwUQp8RodQRaU $res→send(code→or_empty($req→query→string("value")));
    }
  }
  #iWQmZ8iU4cTODF46 $server→get("/api/ready/:userid", $then5);
  #ZD4ZKbJfEKBX9Mcr where then5(req: ♻ restify → Request, res: ♻ restify → Response) {
    #b5qR0MuoBJx3sEmW code→handle_https($req, $res);
    #xMvFnjdEjIQgufyx $throttle_key := code→sha256($req→remote_ip) ∥ ":ready";
    #IzRDN72mqXY2Powe if code→throttle_core($throttle_key, 1) then {
      #FlmeCo5PJThRVj2m $res→send_error(@\u267b→restify→http→@429_Too_Many_Requests, "");
    }
    else {
      #Gq9nvyta4qTaq9Kz $uid := $req→param("userid");
      #a2BX1N9IIRI2tE3K $entry2 := code→get_pub($uid, "user");
      #rnZIFwb82gZvrJkP if $entry2→is_invalid then {
        #HeMQRR9C15HbxomC if code→throttle_core($throttle_key, 100) then {
          #bhQ9HjxEWF7zpz31 $res→send_error(@\u267b→restify→http→@429_Too_Many_Requests, "");
        }
        else {
          #PYT0Jzy1Y15KyXel $res→send_error(@\u267b→restify→http→@404_Not_Found, "Missing");
        }
      }
      else { #TjlXX27JvpE0sIHg if code→or_false($entry2→boolean("awaiting")) then {
        #YqsxM7M9ph2ij8H1 $res→json(web→json("{ \"ready\": false }"));
      }
      else {
        #xIk1Kef4tIj2Iz48 $res→json(web→json("{ \"ready\": true }"));
      }
      } 
    }
  }
  #yAvhbwI2jxn6i1xq code→\_init_login;
  #t64cgJLV2beQ4iOb // ## batch api here
  #dowNHjHO28Nkq92v $server→post("/api", $@then);
  #AC28JX3Zb42bcqLF where @then(req: ♻ restify → Request, res: ♻ restify → Response) {
    #xW9Uu6AdnVszGNQ9 code→perform_routing($req, $res);
  }
  #yIieieKj1lX6Kgqw $server→route_regex("OPTS", ".*", $then4);
  #jboyqQeBqo8XCxd2 where then4(req: ♻ restify → Request, res: ♻ restify → Response) {
    #FlvkJ4zHG1kOksSJ $res→set_header("Access-Control-Allow-Headers", "Accept, Accept-Version, Content-Type, Origin, X-TD-Access-Token, X-TD-World-ID, X-TD-Release-ID, X-TD-User-Platform, Authorization");
    #SxRRQ4imsuTjkywj $res→set_header("Access-Control-Allow-Credentials", "true");
    #kVMWu92OUxZQMqiA $res→set_header("Access-Control-Max-Age", "3600");
    #xQ7fVl3DePjJBCE4 $res→set_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, HEAD, OPTIONS");
    #xToCV9XquUIrgwqz $res→send_status(200);
  }
  #kIHi4VXotQ8kI1KV $server→all($@then);
  #xSoRO9RL1fJLWjHt where @then(req: ♻ restify → Request, res: ♻ restify → Response) {
    #QbypLjGfF20iMx5T if $req→url→starts_with("/api/") then {
      #oRGACR5oPQn5Bd4s code→perform_routing($req, $res);
    }
    else {
      #Dc6XecXc5qPuroyJ code→handle_basic_auth($req, $res);
      #xGMZPUyeLxWWmAET if `not` $res→finished `and` `not` $req→method→equals("GET") then {
        #x1LkyrrP35m8jfil $res→send_error(@\u267b→restify→http→@405_Method_Not_Allowed, "");
      }
      #TijKdkQ6NoEa6nHz if `not` $res→finished then {
        #gnTnXKOh5XgBm2My if $req→url→starts_with("/app/") then {
          #VRb9ipFz2nxCU05K code→serve_release($req, $res);
        }
        else { #xfcu2AZs89Uvk0kE if $req→url→starts_with("/favicon.ico") then {
          #HlA3Zn0qOhjcPYBx if data→favicon_ico→is_invalid then {
            #xkHVnbk2GvaPdPWg $result, data→favicon_ico := data→files_container→get_blob_to_buffer("favicon.ico");
          }
          #VNT2rKnyIApXbI4S $res→send_buffer(data→favicon_ico, "image/x-icon");
        }
        else { #CsmQbGspDKozVAdY if $req→url→starts_with("/verify/") then {
          #dJpRLO8ah19KG9Wg code→handle_email_verification($req, $res);
        }
        else {
          #xiDwR4KE02Ls2gz4 code→serve_pointer($req, $res);
        }
        } } 
      }
    }
  }
  #KW7OEQKOf3JFt6V0 data→logger→debug("librato email: " ∥ app→server_setting("LIBRATO_EMAIL", false));
  #lf4nvnkrDQdwX11U if false then {
    #hQaxeDf2C0ojmqqi @\u267b→websocket_server→listen("/api/socket", $handler);
    #CjKoSEeV02SSeg0L where handler(request: ♻ websocket_server → Request) {
      #b1PD4dpF8DRS1BRc $api_request := code→build_api_request($request→path);
      #etFFX89yE293RED6 code→validate_token($api_request);
      #YhTluLQJW42XqEd8 if $api_request→status = 200 then {
        #xvm7Vc3Rj4KMUZfK $socket := $request→accept;
        #Apyp4OyPAAVsVuAU while $socket→ready_state→equals("open") do {
          #Luhd64U7BMuuMbKT $msg := $socket→receive;
          #ZdHIerd25ahKIWMJ if $msg→is_error then {
            #xPUI4OTK6x5qS5Go $socket→close;
          }
          else {
            #Nkw5IR8djuOZa6M7 $js := $msg→json;
            #xp9hzCgUlcNYYotj if $js→is_invalid then {
              #nXm9vp684C3MYHuw data→logger→debug("closing socket from " ∥ $api_request→userid);
              #xNpdpceZrPzewQqc $socket→close;
            }
            else {
              #YxytD5ST8BfI4oCD data→logger→debug("handling sock " ∥ $js→string("reqid"));
              #IlZTiezh0PE2gbiQ `async` code→handle_socket_request($js, $api_request, $socket);
            }
          }
        }
      }
      else {
        #imCKzDo9gzRQbgCm $request→reject;
      }
    }
  }
}
#B6MMXIDaeSKH37qL meta import azure_table {
  pub "ywyie"
  usage {
    #Gg8Zzqp0ug2p1UoC
    table query_result {
      type = "Object";
      exported = true;
      persistent = false;
      fields {
        #UXfPIOMyIFwHo6uq items : Json_Object
        #xJTK2a7004dORIYJ continuation : String
      }
    }
    #BVGhpbmca
    table Init_Options {
      type = "Object";
      exported = true;
      persistent = false;
      fields {
        #TejS7R2HodS2Gh4Y timeout : Number
        #s2wvcaZ9VIU87IF2 retries : Number
        #UmP7ZqTqF16MfNGn storage_account : String
        #xIQ8CV195SXDFjYB storage_access_key : String
      }
    }
    type client
    type @table
    type table_query

    action `sync` create_client(options\u003f: ♻ azure_table → Init_Options) returns(client: ♻ azure_table → client)
    action `async` create_table_if_not_exists(client: ♻ azure_table → client, name: String) returns(@table: ♻ azure_table → @table)
    action `async` insert_entity(@table: ♻ azure_table → @table, entity: Json_Object, when_present: String)
    action `async` update_entity(@table: ♻ azure_table → @table, entity: Json_Object, mode: String)
    action `async` try_update_entity(@table: ♻ azure_table → @table, entity: Json_Object, mode: String) returns(ok: Boolean)
    action `async` delete_entity(@table: ♻ azure_table → @table, entity: Json_Object)
    action `sync` create_entity(PartitionKey: String, RowKey: String) returns(entity: Json_Builder)
    action `async` delete_table(@table: ♻ azure_table → @table)
    action `sync` create_query(@table: ♻ azure_table → @table) returns(query: ♻ azure_table → table_query)
    action `sync` @top(query: ♻ azure_table → table_query, count: Number) returns(res_query: ♻ azure_table → table_query)
    action `sync` partition_key_is(query: ♻ azure_table → table_query, PartitionKey: String) returns(res_query: ♻ azure_table → table_query)
    action `sync` @and(query: ♻ azure_table → table_query, field: String, comparison: String, argument: String) returns(res_query: ♻ azure_table → table_query)
    action `async` get_entity(@table: ♻ azure_table → @table, PartitionKey: String, RowKey: String) returns(result: Json_Object)
    action `sync` page_size(query: ♻ azure_table → table_query, count: Number) returns(res_query: ♻ azure_table → table_query)
    action `async` fetch_all(query: ♻ azure_table → table_query) returns(entities: Json_Object)
    action `sync` create_log_id() returns(id: String)
    action `sync` create_random_id(size: Number) returns(id: String)
    action `sync` @where(query: ♻ azure_table → table_query, field: String, comparison: String, argument: String) returns(res_query: ♻ azure_table → table_query)
    action `sync` @or(query: ♻ azure_table → table_query, field: String, comparison: String, argument: String) returns(res_query: ♻ azure_table → table_query)
    action `sync` continue_at(query: ♻ azure_table → table_query, token: String) returns(res_query: ♻ azure_table → table_query)
    action `sync` with_etags(query: ♻ azure_table → table_query) returns(res_query: ♻ azure_table → table_query)
    action `async` fetch_page(query: ♻ azure_table → table_query) returns(entities: ♻ azure_table → query_result)
    action `async` try_insert_entity(@table: ♻ azure_table → @table, entity: Json_Object) returns(ok: Boolean)
    action `sync` assume_tables_exists()
    action `sync` create_reverse_log_id() returns(id: String)
    action `async` try_delete_entity(@table: ♻ azure_table → @table, entity: Json_Object) returns(ok: Boolean)
    action `async` try_insert_entity_ext(@table: ♻ azure_table → @table, entity: Json_Object, when_present: String) returns(ok: Boolean)
  }
}
#nzXHXknRu0elGWBQ
var install_slots_table : ♻ azure_table → @table {
  transient = true;
}
#dk9yaRn3HwGEXct9 meta import azure_blob_storage {
  guid "b2e64606-ce9b-4667-e4d5-a0d2e3a4f23d"
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
#o2aTIlTQFgP2JY0w
action fetch_query(#SDvT4lwMTQGeDLVs query: ♻ azure_table → table_query, #jBgxH8ixOpo9ZJ9e req: ♻ restify → Request) returns(#wuBpirJAGfaaxjXC entities: Json_Object) {
  #t82ZGn2zyGFEWZN3 $query := $query→continue_at($req→query→string("continuation"));
  #DE61ZM21Kr5nSyu2 $count := $req→query→number("count");
  #nPfYyKA0O22yrYb2 if `not` $count→is_invalid then {
    #xwdqUa9i5uLPdMaV $query := $query→@top($count);
  }
  #inTBV9x41600M29Y $entities := $query→fetch_page→to_json;
  meta private;
}
#xU4JDtiYvWJMNZME meta import parallel {
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
#h6p8c22F2Qmh46VT meta import node_crypto {
  pub "gkumc"
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
    action `sync` create_cipher_iv(algorithm: String, key: Buffer, iv: Buffer) returns(cipher: ♻ node_crypto → cipher)
    action `sync` update_cipher(cipher: ♻ node_crypto → cipher, _data: Buffer) returns(enciphered: Buffer)
    action `sync` final(cipher: ♻ node_crypto → cipher) returns(cipher_final: Buffer)
    action `sync` set_auto_padding(cipher: ♻ node_crypto → cipher)
    action `sync` create_decipher(algorithm: String, password: Buffer) returns(decipher: ♻ node_crypto → decipher)
    action `sync` create_decipher_iv(algorithm: String, key: Buffer, iv: Buffer) returns(decipher: ♻ node_crypto → decipher)
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
    action `sync` random_bytes(size: Number) returns(strong_data: Buffer)
    action `sync` DEFAULT\_ENCODING() returns(default_encoding: String)
    action `sync` create_hmac(algorithm: String, key: String) returns(hmac: ♻ node_crypto → hmac)
    action `sync` create_DiffieHellmanWithPrime(prime: Buffer) returns(DiffieHellman: ♻ node_crypto → DiffieHellman)
    action `async` pseudo_random_bytes(size: Number) returns(non\u002dstrong_data: Buffer)
    action `sync` update_hash_string(hash: ♻ node_crypto → hash, hash_data: String)
    action `async` new_guid() returns(guid: String)
  }
}
#Z69cdQT8bighVeks
action save_script(#eGNrk3C6exEuQ8LX userid: String, #xf4Tux4cffuyK4vZ body: * pub_body) returns(#BB9TpMkmjWCUB8C4 new_slot: Json_Object) {
  #WJ3Q240YbHQwpt6h code→progress("save 0");
  #gUzK2t92GPHA3pmJ $body_builder := $body→to_json→to_json_builder;
  #liaJuamHoisc12at $body→@script := invalid→string;
  #xroKr8EFHzrmQdQm $body→editorState := invalid→string;
  #cklxb4hJfOcxdN4I $body_json := $body→to_json;
  #lmb1gDWfOF6C2I1e contract→assert($body_json→serialize→count < 10000, "too large header");
  #kTQamLhnxsnAJlGE $slot_json := data→install_slots_table→get_entity($userid, $body→guid);
  #xZREa0hWA14ubk8c $updated_slot := @\u267b→azure_table→create_entity($userid, $body→guid);
  #H78i0PaWpHZbWs9I skip;
  #x3wGRiU2Hv24LWRm code→progress("save 1");
  #xEhy9dFNY77F1OZj $id2 := 20000000000000 - data→redis_client→cached_time ∥ "." ∥ $userid ∥ "." ∥ @\u267b→azure_table→create_random_id(12);
  #C8EVXqu05RqaMDm9 $new := false;
  #f46Q2h62PI5Yq4R1 $prevBlob := "";
  #xbuAxXJ8ce1Zb2sA if $slot_json→is_invalid then {
    #fhymYuliCDfPqlRG $new := true;
    #G8y4bE17jkO7xra2 $s2 := code→or_empty($body→userId);
    #kcBrzioDcbvr7Pxy $source := "@fork";
    #xgBzE6BZUhtV2U4I if $s2→is_empty `or` $s2→equals($userid) then {
      #xOHOO4jX3F8l25i8 $source := "@fresh";
    }
    #UXVOiTpelW2Gq9dD data→logger→tick("New_slot" ∥ $source);
  }
  else {
    #kp5rcHy2uRxp1q4m $prevBlob := $slot_json→string("currentBlob");
    #lSziMT1gnNviHPak $updated_slot := $slot_json→to_json_builder;
  }
  #bc6GnY8fNMlsvof1 data→logger→tick("SaveScript");
  #ZL9pZUJ7ZsWPcwiC $body_builder→set_string("slotUserId", $userid);
  #taxkZNal7lSFtF32 foreach s in $body_json→keys
  do {
    #XLi72OruZuE8AAjD if `not` $s→equals("scriptVersion") then {
      #udYLBZPryfO8HmqK $updated_slot→set_field($s, $body_json→field($s));
    }
  }
  #xzfA2heZBgu2wUNH if $body_json→contains_key("meta") then {
    #Fo16bBbDF2Sb7OiE $updated_slot→set_string("meta", $body_json→field("meta")→serialize);
  }
  else {
    #gICjLiGfF2OofIYp $updated_slot→set_string("meta", "{}");
  }
  #qaZXB99qGuiJu6F6 $updated_slot→set_string("currentBlob", $id2);
  #kkdDIsse5F25CHFX $updated_json := $updated_slot→to_json;
  #Q6oUhJ42MxZcPgrL $versionOK := $body→status→equals("deleted") `or` $prevBlob→equals($body→scriptVersion→baseSnapshot) `or` $body→scriptVersion→baseSnapshot→equals("*");
  #FiyJltsuEVHhQ3WP if $versionOK then {
    #C8V6zvykx6ImZBFV code→progress("save 2");
    #xST6R9zreu236rz0 code→workspace_for_user($userid)→just_insert($id2, $body_builder);
    #a00rT0DSRnYM44d3 code→progress("save 3");
    #xg0DKqqfpsdFItB6 if $new then {
      #xjv3W6gPX31qrAGK $versionOK := data→install_slots_table→try_insert_entity($updated_json);
    }
    else {
      #BpRkUYEalm8KO2KV $versionOK := data→install_slots_table→try_update_entity($updated_json, "merge");
    }
    #jxdEO4N310G0vNyh if `not` $versionOK then {
      #aysaB2sM2f2ktNq0 $result := data→install_slots_table→get_entity($userid, $body→guid);
      #iLrm4w2lIwIxCzkl if `not` $result→is_invalid `and` code→or_empty($result→string("currentBlob"))→equals($id2) then {
        #cSV8sIMnxy5bmaS4 data→logger→debug("fixing up wrong result from azure table insert, " ∥ $userid ∥ " " ∥ $body→guid ∥ " " ∥ $id2);
        #fs2JICKwbQtX5B5U $versionOK := true;
      }
    }
  }
  #xyHWRoRUfZv3neqI if $versionOK then {
    #YxIzMXeg8oBH1JLA code→progress("save 4");
    #ayI4SUX4X76QW90j $hist := records→pub_installed_history→create;
    #eGY0so3n5dQPl12w $hist→historyid := $id2;
    #M48d8JMTo21cCCAw $hist→scriptstatus := $body→status;
    #h44A5J7rCOgvK2wi $hist→scriptname := $body→name;
    #xsoGTXOknhLcaRUP $hist→scriptdescription := "";
    #nNzWtgAvL2l0s6h8 $hist→kind := "installedscripthistory";
    #flZ1zBxUzljy8me3 $hist→isactive := false;
    #XXeLnmA3nSsBoRzG $hist→time := $body→scriptVersion→time;
    #MCTiDkeMkxEw2ySS $hist→@meta := $updated_slot→string("meta");
    #eOaXFrzYERUUhijC $hist→scriptsize := code→or_empty($body_builder→string("script"))→count;
    #CdtzXttFmfq8cJ4u $jsb := $hist→to_json→to_json_builder;
    #Zb4dAU5kVnxlO5IY $jsb→set_string("PartitionKey", $userid ∥ "." ∥ $body→guid);
    #KMy2b4G6VOmDyunW $jsb→set_string("RowKey", $hist→historyid);
    #DQjx2B3rBVm0zbJq data→history_table→insert_entity($jsb→to_json, "or merge");
    #xq4JcgPm8mtGO7vZ code→progress("save 5");
    #tzLdZAjGHOu4mTwS $new_slot := code→header_from_slot($updated_json)→to_json;
  }
  else {
    #xsLWKbr3HRhfDcE6 $new_slot := web→json("{\"error\":\"out of date\"}");
    #xV4TlOE2ZIP1joea data→logger→debug("collision on " ∥ $userid ∥ "/" ∥ $body→guid ∥ " " ∥ $prevBlob ∥ " vs " ∥ $body→scriptVersion→baseSnapshot);
  }
  meta private;
}
#tqYhgxCdvggLJGrw
var logger : App_Logger {
  transient = true;
}
#H86ZKqudJ4AcZMwR meta import cached_store {
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
  #mPYdCJY9xXzAmxnS resolve azure_blob_storage = ♻ azure_blob_storage with {
  }
  #xVG8m40APMyp18fC resolve node_crypto = ♻ node_crypto with {
  }
  #vm8RO5Ibc4yoO14B resolve redis = ♻ redis with {
  }
  #njnRy42FH8yGIzfx resolve parallel = ♻ parallel with {
  }
}
#HrkprhGgYIvmaHCi
var workspace_container : Collection[ ♻ cached_store → container] {
  transient = true;
}
#xpxKpl5IYV0yw2Je meta import redis {
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
#xYAR5zNmbwq1peMx
var pubs_container : ♻ cached_store → container {
  transient = true;
}
#p4AKfhSi3uYl2mCJ meta import indexed_store {
  pub "whexa"
  usage {

    action `sync` `type` to_key(entry: Json_Builder) returns(key: String)
    #BdGhpbmca
    table store {
      type = "Object";
      exported = true;
      persistent = false;
      fields {
        #x2475X4YCtTV4tFf container : ♻ cached_store → container
        #xY8v5gzBC5XB24Om kind : String
        #Iq42L422QrmoKQ6I indices : Collection[ ♻ indexed_store → index]
        #xiyrKMqBxripK6Q5 client : ♻ azure_table → client
      }
    }
    #odWwF3ebztwLLGnS
    table fetch_result {
      type = "Object";
      exported = true;
      persistent = false;
      fields {
        #rZmS4gVW1AL2wCgH continuation : String
        #Nl2weRJ19WkFxOib v : Number
        #xsgNK2AaG2niCJ5I items : Json_Object
      }
    }
    #BVGhpbmca
    table create_store_options {
      type = "Object";
      exported = true;
      persistent = false;
      fields {
        #EJmhbjcA2uAeMHkH table_client : ♻ azure_table → client
      }
    }
    type index

    action `async` create_store(container: ♻ cached_store → container, kind: String, options\u003f: ♻ indexed_store → create_store_options) returns(store: ♻ indexed_store → store)
    action `async` create_index(store: ♻ indexed_store → store, name: String, to_key: ♻ indexed_store → to_key) returns(index: ♻ indexed_store → index)
    action `async` insert(store: ♻ indexed_store → store, bld: Json_Builder)
    action `async` fetch(index: ♻ indexed_store → index, key: String, options: Json_Object) returns(fetch_result: ♻ indexed_store → fetch_result)
    action `sync` get_index(store: ♻ indexed_store → store, name: String) returns(index: ♻ indexed_store → index)
    action `sync` single_fetch_result(store: ♻ indexed_store → store, obj: Json_Object) returns(fetch_result: ♻ indexed_store → fetch_result)
    action `async` generate_id(store: ♻ indexed_store → store, min_name_length: Number) returns(id: String)
    action `sync` copy_json(js: Json_Object, jsb: Json_Builder)
    action `async` fetch_from_id_list(store: ♻ indexed_store → store, ids: Collection[String], options: Json_Object) returns(fetch_result: ♻ indexed_store → fetch_result)
    action `async` reserve_id(store: ♻ indexed_store → store, id: String)
    action `async` execute_table_query(table_query: ♻ azure_table → table_query, options: Json_Object) returns(entities: ♻ indexed_store → fetch_result)
    action `async` fetch_all(index: ♻ indexed_store → index, key: String) returns(items: Json_Object)
    action `async` delete(store: ♻ indexed_store → store, delid: String) returns(delok: Boolean)
    action `sync` store_by_kind(kind: String) returns(store: ♻ indexed_store → store)
    action `async` for_all_batched(index: ♻ indexed_store → index, key: String, batch: Number, process: Json_Action)
    action `sync` init(table_client: ♻ azure_table → client)
    action `async` create_custom_index(store: ♻ indexed_store → store, name: String, @table: ♻ azure_table → @table) returns(index: ♻ indexed_store → index)
    action `async` reindex(store: ♻ indexed_store → store, pubid: String, update: Action1[Json_Builder])
  }
  #vTOhCDJlnp45ANlH resolve cached_store = ♻ cached_store with {
  }
  #x9qWhdu2OERCoHTA resolve azure_blob_storage = ♻ azure_blob_storage with {
  }
  #ZVj89ukDimloiuco resolve node_crypto = ♻ node_crypto with {
  }
  #xPafR4Qr7FEkQJv2 resolve azure_table = ♻ azure_table with {
  }
  #HtBHR43h1SWqMDj6 resolve redis = ♻ redis with {
  }
  #jESjPSL47bWBXHd5 resolve parallel = ♻ parallel with {
  }
}
#dngJeZPXk4eJ3QKB
table api_request {
  type = "Object";
  persistent = false;
  fields {
    #cUX5TlUyvpOA2c2a method : String
    #xeZLDxjOxS7kdFc4 root : String
    #eeklaZbkHitzYF23 root_pub : Json_Object
    #xtiKzaoCrWMX5uPb root_id : String
    #Sf7tKvs2H13I721G verb : String
    #zzHuP6jKIT4cmHBK query_options : Json_Object
    #SojX4q8E13ts9CFc body : Json_Object
    #IfFCVqTO265fEFVx userid : String
    #dNfqT2aQ3JEiHIEm argument : String
    #x5IUvYBoGzAq5ndJ sub_argument : String
    #xitbxXgUH1plomH1 sub_sub_argument : String
    #g2IWd4Us4rFcQrN4 status : Number
    #wjfUmSsj2kihiuLb response : Json_Object
    #RVLc44qrZdV70fRP response_content_type : String
    #ADLo2dj62Jt60s6y is_upgrade : Boolean
    #xZEQDaiJmBBvcjcy upgrade_tasks : Collection[Task[Nothing]]
    #WvUSJaSB5m8aybn2 orig_url : String
    #vKJ31tcLqBTVls5r start_time : Number
    #AvPKupVqekm8TYO6 throttle_ip : String
    #rGH7HQK0O5Dq63wt route : * route
    #VdSs64S96pJoOrln is_top_level : Boolean
    #CzNgKMsiY91bMrey headers : String_Map
    #yW7MQlQOJ1iCqmFW userinfo : * apireq_user_info
    #kmok9mW30DeRCYsh is_cached : Boolean
  }
}
#kBt2VI4flyHEZAJe
var scripts : ♻ indexed_store → store {
  transient = true;
}
#f4W9SjZp2UGz8LAW
var comments : ♻ indexed_store → store {
  transient = true;
}
#xnjQLLfPVtTCBKaR
action \_init_0() {
  #hWuTfLOEBRAKnuR6 $table_client_ws := code→spec_table_client("WORKSPACE");
  #xkjzpHKZYV4BxBH3 $table_client_hist := code→spec_table_client("WORKSPACE_HIST");
  #aRbOI4nG4pp94jyX $not_table_client := code→spec_table_client("NOTIFICATIONS");
  #j34PE9erUyBe6rTY data→install_slots_table := $table_client_ws→create_table_if_not_exists("installslots");
  #xJvzFoyTfx73fO4V data→history_table := $table_client_hist→create_table_if_not_exists("historyslots");
  #C86wvVWrhQWwn4DV data→update_slot_table := data→table_client→create_table_if_not_exists("scriptupdates");
  #xg3YPfUAvF9ZIs7y data→tokens_table := data→table_client→create_table_if_not_exists("tokens");
  #kbWtYZBTGVQhNzAZ data→script_text := @\u267b→cached_store→create_container("scripttext");
  #tx2tYnYwYLz5072v where access := "private";
  #gKDADFIrKO7AeqmJ data→pubs_container := @\u267b→cached_store→create_container("pubs");
  #llyeQMi4N5Ce7tby data→settings_container := @\u267b→cached_store→create_container("settings");
  #Uw6w6TxOgpLdxNG2 where in_memory_cache_seconds := 5;
  #ktfQky7qvgS26nFP data→cache_rewritten := @\u267b→cached_store→create_container("cacherewritten");
  #dxq24jlTUb8AGIMd where in_memory_cache_seconds := 15;
  #MFbcwtwCu6nfIQQ1 where redis_cache_seconds := 3600;
  #wKKnNYmtjGmvG5mz data→cache_compiler := @\u267b→cached_store→create_container("cachecompiler");
  #adKZuowwaUVdVvuZ where redis_cache_seconds := 600;
  #a2RUuYwjXe4sghC4 data→passcodes_container := @\u267b→cached_store→create_container("passcodes");
  #Vo53RS2zhJpcAWy9 where no_cache := true;
  #Z89bvRgasVzNDT7U data→art_container := data→blob_service→create_container_if_not_exists("pub", "hidden");
  #SHrY2CF266fuSrTK data→aac_container := data→blob_service→create_container_if_not_exists("aac", "hidden");
  #bGrhEwqu0gJ9fNVn data→video_container := data→blob_service→create_container_if_not_exists("cachevideo", "hidden");
  #IcCDzILha4lz9F5R data→td_deployments := data→blob_service→create_container_if_not_exists("tddeployments", "private");
  #VuUJKeVtToePwxyr data→thumb_containers := create→Collection_of→\u2339thumb_container;
  #ZcCd4YfnJLddeYX5 code→add_thumb_container(128, "thumb");
  #x4rZJewPCxC2goEM code→add_thumb_container(512, "thumb1");
  #HwO8qe90oyIUuXWc code→add_thumb_container(1024, "thumb2");
  #jNFExC2G7jyR4fN7 data→notifications_table := $not_table_client→create_table_if_not_exists("notifications2");
  #TKb2HgvzyA3wvhK1 data→app_container := data→blob_service→create_container_if_not_exists("app", "hidden");
  #oD14PX4G4Mo4tO2p data→files_container := data→blob_service→create_container_if_not_exists("files", "hidden");
  #uQaddzxokC8m17HK data→compile_container := data→blob_service→create_container_if_not_exists("compile", "hidden");
  #o8tlw4RRXRMe0N6T data→crash_container := data→blob_service→create_container_if_not_exists("crashes2", "private");
  #quDBJhj9yMncQuwA data→cached_api_container := @\u267b→cached_store→create_container("cachedapi");
  #xRixfiFmeIhdtSW7 where in_memory_cache_seconds := 5;
  #IjNCNcXYSa4eWqZX where redis_cache_seconds := 600;
  #nBpfk0RRhS5Junji where no_blob_storage := true;
  #s2ZO8rTVthQ2IkJE for 0 ≤ j < 4 do {
    #hlz5PtCVKxgBRbDz $blob_service_ws := @\u267b→azure_blob_storage→create_blob_service;
    #bfmd9jSO9mzx3H97 where storage_account := app→server_setting("WORKSPACE_BLOB_ACCOUNT" ∥ $j, false);
    #IuemgOcOaKtFGa45 where storage_access_key := app→server_setting("WORKSPACE_BLOB_KEY" ∥ $j, false);
    #Fi5cxld8j6IIXzeF `async` $blob_service_ws→set_cors_properties("*", "GET,HEAD,OPTIONS", "*", "*", 3600);
    #pOC2G2g6Ja2Fzc40 $container := @\u267b→cached_store→create_container("workspace");
    #xO461v5I04220Ymn where no_cache := true;
    #G2uPJ4snVPJ7ixJh where access := "hidden";
    #FXd34Mwg8UQiT6PP where blob_service := $blob_service_ws;
    #xWjnqOVeSIljtLDW data→workspace_container→add($container);
  }
  #OZUiFLL1tnkXVgPR code→\_init_audit;
  #ULr51fGeEv8giUh4 // ## General
  #IvneoiJ97CdRwrS0 code→add_route("POST", "", "", $handler4);
  #aZuJ2d33agIWY4QL where no_size_check := true;
  #CUlwaY17febdv05y where handler4(req: * api_request) {
    #u4rvLZJfEN4tnLOl code→perform_batch($req);
  }
  #xyLh4x7ptLzq0j2Q code→\_init_ticks;
  #xnBurF4MJlvfOwmc code→\_init_bugs;
  #xyTWjpZhP4tAiNA2 // # Init different publication kinds
  #tX81lgmI6ncloGIk code→\_init_admin;
  #pVIv2gKj5WJRsx4U code→\_init_scripts;
  #wEB9jURcQyRCd8M2 code→\_init_promo;
  #FF8npoMKGQyozjSK code→\_init_comments;
  #cllAuP0Q12cMcZvV code→\_init_groups;
  #yyYOQj8PTE1OWaBY code→\_init_tags;
  #xBdjwknfBmZLN4sf code→\_init_art;
  #V2W7LouZozHifKFI code→\_init_screenshots;
  #LkgivpDtzQ9L360j code→\_init_reviews;
  #xR0Nq4BpTR6ys4Pd code→\_init_users;
  #h3xJFGUhshVMFrHK code→\_init_subscriptions;
  #xblspHxJmmBJK4xs code→\_init_releases;
  #NR73y1R4bUtNz48Q code→\_init_abusereports;
  #obvRgz2woZxPR8t1 code→\_init_channels;
  #LQYGuH94WwQQkc7c code→\_init_pointers;
  #X4ryhG2Y5z1CmC4v code→\_init_config;
  #DPhGFESTzyiSc2VX code→\_init_embed_thumbnails;
  #GqzgEfLjhmYD8ht2 code→\_init_vimeo;
  #At4Ts6Auj2HlD6Dy code→\_init_progress;
  #xTf1bXubIlZSeLgR code→\_init_runtime;
  #BxMsCD5Tn4H4NML4 // ## and other stuff
  #n1HuHSo58apaXG42 code→\_init_search;
  #tRrhf24owRIeVTyY code→\_init_import;
  #QJsaUjuutCqV2cgc code→\_init_workspaces;
  meta private;
}
#xkEkzu14oEkM1QzB
var users : ♻ indexed_store → store {
  transient = true;
}
#xQx1W0TC8uGQPxKc
table route {
  type = "Index";
  persistent = false;
  keys {
    #xlebv0Asw1ycEXfr method : String
    #qMJysJHLHPoaBMSg root : String
    #xvsah4YVyluyfPyT verb : String
  }
  fields {
    #seLjSky5rGD3gElw handler : * api_req_handler
    #xcnAED1rCu28eu25 options : * route_options
  }
}
#nMVCHBxTBEDYIiJd
action `type` api_req_handler(#x2pQ2QANEuEnk515 req: * api_request) {
  #CGIVsI20aiUjE8nt skip;
}
#fRTbhbPizsUnCfHw
action add_route(#mW0I0JPQj18pX6L2 method: String, #eBGbXlb6TfMIdIMv root: String, #i1ELUdS271lOYvlo verb: String, #RoXGCyBY1jro86Pn handler: * api_req_handler, #mRgeyyeFSXHtox3m options\u003f: * route_options) {
  #xdygSHaKxJ25YMxo // {hints:method:GET,POST,PUT,DELETE}
  #aL4pU5grYPaGZI7T $route := records→route_index→at($method, $root, $verb);
  #x4Vvn0nRfd9uGbP1 $route→options := $options\u003f;
  #xfXmY1UxqzOs3QPX if $options\u003f→no_size_check `or` $method→equals("GET") `or` $method→equals("DELETE") then {
    #F0nSsnRM76ZBPATh $route→handler := $handler;
  }
  else {
    #xQJDAGJeJm2jdOj9 $route→handler→\u25c8set($t);
    #Y0vwolynWOo8Dgfj where t(req: * api_request) {
      #DEEI563knZDfETC4 $size := 0;
      #x7zuuNKN9HcdDUTV if `not` $req→body→is_invalid then {
        #LO3jcWSn9c31yawq if `not` $options\u003f→size_check_excludes→is_empty then {
          #L8FLHqrLc4TZ71jh $jsb := $req→body→to_json_builder;
          #DnP8BnorQeN0q8PR $jsb→remove_field($options\u003f→size_check_excludes);
          #tNvrCI4Pj5Hpq28P $size := $jsb→serialize→count;
        }
        else {
          #Urmg22Xd54ePBsmK $size := $req→body→serialize→count;
        }
      }
      #E85GeitFfJvixPOm if $size > 20000 then {
        #LUzXxYJN5Cssb4ZL $req→status := @\u267b→restify→http→@413_Request_Entity_Too_Large;
      }
      else {
        #Qos8IobvFHoC08Ov $handler→run($req);
      }
    }
  }
  meta private;
  meta sync;
}
#qQBDdQVd4sSA7sF8
action or_empty(#A3G9TCGVn1Q30CBx s: String) returns(#dKKf7SMKY9y8GqHr r: String) {
  #xIZFhJdkggzrxaWQ if $s→is_invalid then {
    #xCe4n6YfbmKkYBAL $r := "";
  }
  else {
    #eVx4LRcBxvviR2xI $r := $s;
  }
  meta private;
  meta sync;
}
#pwI7WL4IGx1ZYw5i
action perform_routing(#fVpksRYj88vGqDVu req: ♻ restify → Request, #Mn0haQWQO1LFyqWP res: ♻ restify → Response) {
  #xUTPvWNj3eao2pAu $api_request := code→build_api_request($req→url);
  #Gguv5cULUdX132Cw $api_request→method := $req→method;
  #DiCYBXI2ndbaPfWb $api_request→body := $req→body_as_json;
  #oIKOk3DjY6E6E9tS if false then {
    #Dhhx8iClIINer1Kq data→logger→debug("api req: " ∥ $api_request→to_json→serialize);
  }
  #ezQV2L46sH0uTqJm code→validate_token($api_request, $req);
  #xaQx0Xa68RKCY1l8 if $api_request→userid→is_empty then {
    #N6ROB2hye6UhFUkV $api_request→throttle_ip := code→sha256($req→remote_ip);
  }
  #nQKrkXpGXhgUYvnn if `not` $api_request→is_cached `and` $api_request→userinfo→token→is_invalid then {
    #xnQisBsGegtlHv8R code→handle_basic_auth($req, $res);
  }
  else {
    #xQpaKJraoSVlkkJn code→handle_https($req, $res);
  }
  #X79G6jdPlU4BB5bH if `not` $res→finished then {
    #iOCDtu36cWawsEeN $upgrade_token := $api_request→query_options→string("upgrade");
    #EpogcQbEfaK84j0V $api_request→is_upgrade := `not` $upgrade_token→is_invalid `and` $upgrade_token→equals(data→token_secret);
    #pSH3NjXppTSTUCsa $api_request→is_top_level := true;
    #dheOCeCshDmjncNt if $api_request→status = 200 then {
      #xr3NoycfKwqelQ2R if $api_request→is_cached then {
        #Ql14yjurzwZmQhNs if `not` code→handled_by_cache($api_request) then {
          #WWApOTp0pDnHLhmF code→store_cache($api_request);
        }
      }
      else {
        #u6tlol5oTqVuJKlI code→throttle($api_request, "apireq", 2);
        #xTeFtW5oQgiK4TMD code→perform_single_request($api_request);
      }
    }
    #xYz517dRJdyvsDwr code→send_response($api_request, $req, $res);
  }
  meta private;
}
#WpL5itL9BaNtzN6d
action lookup_route(#AaYag4y6qcSHXPHT api_request: * api_request, #xQyor7zTuuzp5MIQ root: String, #SIy9NTgcSLHEWp7i verb: String) {
  #JJUeSmiIG89l6FpC if $api_request→route→is_invalid then {
    #xgEH1JuzbpFOaOqx $route := records→route_index→at($api_request→method, $root, $verb);
    #CekfIaKR78F7ApJR if `not` $route→handler→is_invalid then {
      #cndKGFhDHJI0dUef $api_request→route := $route;
    }
  }
  meta private;
  meta sync;
}
#generated750
table pub_script {
  type = "Object";
  persistent = false;
  fields {
    #oSNiVb5AgyGbuKY0 kind : String
    #k2B7SDLXw9LjSYH4 time : Number
    #x1AGHWWrWsf6FJB1 id : String
    #oM2Oc4gbcWnxaSNB baseid : String
    #ai9giIcpJhH7JZMM url : String
    #WddpiXbEnCjEFJis name : String
    #FEMFUurjGVUmc7DE description : String
    #nX2ZMXumc2q9SdYQ userid : String
    #Xc2dtPhp1IU4Hn20 username : String
    #x3mkFQHeYZNr655h userscore : Number
    #lOVrHUnpxyx0xRVf userhaspicture : Boolean
    #Gfl4hI5YANmA0vXG icon : String
    #xoY6bZL4oOdImgmz iconbackground : String
    #M8kndOgG0vQ1SAY2 iconurl : String
    #BplZKWHhc4GUEXvU positivereviews : Number
    #xbhRgKUoZ47y2NFh cumulativepositivereviews : Number
    #xXrmPTEJPHgF5tSz subscribers : Number
    #o0BKTAttgqDpJTcq comments : Number
    #xUzmmyJE5hL2FBGL screenshots : Number
    #FKgSgvMxC3vtToWT platforms : Collection[String]
    #I12hQABTNw5A2GMJ capabilities : Collection[String]
    #WedI1tra2Rdd3SGV flows : Collection[String]
    #I4PEcUh7TlG8ZfLa haserrors : Boolean
    #xpDaAOJeHwCyil5O rootid : String
    #V7ExJwHP5W2kLFe7 updateid : String
    #HgA4Ars9i1a9AQml updatetime : Number
    #fgxV7AiM3PEXUhDr ishidden : Boolean
    #rvDBFYP2gl0AWSck islibrary : Boolean
    #ewKorKJa9hCaPOgy userplatform : Collection[String]
    #j1d1nVEURc2hlo98 installations : Number
    #AHfSoWQXlSmDFNNE runs : Number
    #Wy2mFwquRmYsjSSo art : Number
    #xCyuIaaF7RG9qPCi toptagids : Collection[String]
    #KqFn4RxHiDVd5ruw screenshotthumburl : String
    #hl1ydA4uGAogF1jq screenshoturl : String
    #JC8dtCuPaqENCvMs mergeids : Collection[String]
    #xYoI0X4WLWV22A1k editor : String
    #D3WMgpqZMQL5nsoD @meta : Json_Object
    #Q9Uf2HOkUFHYHqHx iconArtId : String
    #x2yiNtDvHTeGOiOu splashArtId : String
    #ItnHE75ig3E5P543 raw : String
    #GBUiAXbYgnM3txsF scripthash : String
    #xoMSjntUNJ32mye8 sourceid : String
    #x9lmxzqRRmVh5Pes updateroot : String
    #aKBSL5YHKZs5riK2 unmoderated : Boolean
    #Y4gNWOejuN26xzh2 noexternallinks : Boolean
    #KLI87OrvaLNDfnq1 promo : Json_Object
  }
}
#ehbXvqtCgQbkl647
action any_list(#z7MDT16a2Hq8fsVW store: ♻ indexed_store → store, #xWqRHpp5bHTIn8fz req: * api_request, #QqpOL9aXuokyuIOS idx_name: String, #t7oIE8UfWmDyOQg2 key: String) {
  #SmwYIS5JQpOGN8ia $entities := $store→fetch_and_resolve($req, $idx_name, $key);
  #htlzkk9ShNvHJJFJ code→build_list_response($entities, $req);
  meta private;
}
#xqwrcwgKc8ftED2v
action alias_route(#sFN6sF9rxN0k6Jek method: String, #xY7cNiWb3mOYCKzK copy: String, #baxL6dnSy2Z9lh54 src: String) {
  #xEkLI7umMP8K0Oc2 $dst := records→route_index→at($method, $copy, "");
  #Om4h2v3VYasmXkt9 $route := records→route_index→at($method, $src, "");
  #EQS7573iLIsl3V2y $dst→handler := $route→handler;
  #x9fgL83zG1V2sJp4 $dst→options := $route→options;
  meta private;
  meta sync;
}
#xVk0ATZjFJCst3Sd
action with_default(#rX9lSZkCYirRPNfI s: String, #GefZ6fqZfIh0D7Im defl: String) returns(#DcPYSuwKVnD0Drzf r: String) {
  #N2Iw7etGlRopQDqn if $s→is_invalid `or` $s→is_empty then {
    #yayoJOZjGF1pPXXr $r := $defl;
  }
  else {
    #lsLAglzfmjKYxfXa $r := $s;
  }
  meta private;
  meta sync;
}
#generated738
table pub_comment {
  type = "Object";
  persistent = false;
  fields {
    #xIPb0w0eMfF4c6UZ kind : String
    #kb8A4RUEJu1b4GLd time : Number
    #kAwNutuyuo1Xxen7 id : String
    #V4g48nHWow6O2suC url : String
    #aZzkiRje8joQ5oYe text : String
    #DQZ3RjWzkBBqi6d2 userid : String
    #Ur2OCIhgl44Q2MAA username : String
    #vFkMxVUkABazueeS userscore : Number
    #sMYTu6BUJo5YgK8Y userhaspicture : Boolean
    #AJU2zNjAO9IAMPNy userplatform : Collection[String]
    #pQGKHpoMqTi0Kjar publicationid : String
    #x4kmYTap4i6lybIa publicationname : String
    #GGRd1kwhVdjrA9m9 publicationkind : String
    #dfIhUbpn1pgIj2p6 nestinglevel : Number
    #xW0d2w1BopjRuzAa positivereviews : Number
    #KFovyGB29Eex8dl2 subscribers : Number
    #evQsj7UdTClRf9AK comments : Number
    #Ve9f3MZHinbuPvkE assignedtoid : String
    #bfUp1jF2YAUcEUrO resolved : String
  }
}
#generated936
table pub_user {
  type = "Object";
  persistent = false;
  fields {
    #C2OAX69ZOUu9f2gc kind : String
    #QdpZvlUPjprVup9C id : String
    #s2JE34cBba9PE2ku url : String
    #xfI9en7YOJoU44g2 name : String
    #tLlsmxq9vLN04Mqn haspicture : Boolean
    #Mvq4Qb2ddAC2vAy2 time : Number
    #CMwqL2x2NnW57jBz about : String
    #xVJrbbccnHf1Up6A features : Number
    #uiKJQpV0bN8VWeC5 activedays : Number
    #ei9BT9y2hPoKf88V receivedpositivereviews : Number
    #mKDMMu6gOElJ0Y0J subscribers : Number
    #x6pIr5C6k0Hw2DgS score : Number
    #xVF2IRXNbvMZ4FM2 isadult : Boolean
  }
}
#generated315
table pub_header {
  type = "Object";
  persistent = false;
  fields {
    #ROkyVyIWfqJ5EprO guid : String
    #VQy4x414n3Pu95Pz name : String
    #x4J9aFQ7sj2OI3JG scriptId : String
    #sioybmQEj08iv4EV scriptTime : Number
    #x96tkR4mwW843Pea updateId : String
    #H83cZW1Xd76dPIAs updateTime : Number
    #qac5EqpTDtusmErW userId : String
    #MbCqARdyPvdkXQWJ status : String
    #niGDpFp2y6xBV8nJ scriptVersion : * pub_version
    #nxJbiqyqu6rj3690 hasErrors : String
    #mfsZ8tpJpPdBmj4T recentUse : Number
    #pS8ftIHNUKE9jgFD editor : String
    #LrwU4P07pW31qIiE @meta : Json_Object
  }
}
#generated765
table pub_headers {
  type = "Object";
  persistent = false;
  fields {
    #moHI314z3yBJspV4 newNotifications : Number
    #sYAfTlF4Z4EbieE7 notifications : Boolean
    #No2pM8A2iEaa24y2 email : Boolean
    #xDo7sAp8Fqqd2a45 emailNewsletter : Boolean
    #hxBVo9Zmu4qydP5s emailNotifications : Boolean
    #IhExOgmlTjpQqicK profileIndex : Number
    #TDwIkTjmN7iDVa2i profileCount : Number
    #hgTLJPikNE0f2m43 time : Number
    #x2RfSc3WNZYjR6OG askBeta : Boolean
    #XeBG9IH2usL5x0aj askSomething : String
    #OCzPcREf8muq46F8 betaSettings : Boolean
    #W3Q7udd6LGK7MzuX random : String
    #YQ8Dj6fpfQn6YLEz minimum : String
    #LSd4HupUiM0GUj5H v : Number
    #EkM0wSJDSEz2zUFx user : * pub_user
    #ncmdqhbcUGDcEnDp headers : Collection[ * pub_header]
    #OOiLDcz72qJBBYjk blobcontainer : String
  }
}
#UG4hcSsLJutvgpTt
action hash_password(#Kcm26UALPS2kZjVw salt: String, #CTZm9Tlw6I9mhBUN pass: String) returns(#wmmD4TA9j6RbMQDt hashed: String) {
  #xjyZmgcfktH0y9T5 if $salt→is_empty then {
    #YTkNE5UJ1wlIMlNo $salt := @\u267b→node_crypto→random_bytes(8)→to_string("hex");
  }
  else {
    #LTKkPF2Kkrcg4pAl $salt := $salt→replace_regex("\\$.*", "");
  }
  #xeMQJuyQd2bV0V6W skip;
  #Xsqut4YhJMcY9jD9 $hashed := $salt ∥ "$$" ∥ code→sha256($salt ∥ code→or_empty($pass));
  meta private;
  meta sync;
}
#PJ9Y4ZPIqCkJ4O7x
var token_secret : String {
  transient = true;
}
#MNyrP4nzI2cJyhmv
action generate_token(#vJuK4WD4sdhVkmo7 user: String, #DeR940PU3EMSfr71 reason: String, #xMYFZIe9uLW8Q3MX client\_id: String) returns(#x7EgNlxQu0dCyZRM custom_token: String, #M2St97L7eHMdhAZD td_cookie: String) {
  #Hsh8cMCzHMDD2xCG $token := records→token→create;
  #jWBi28D8lIJH5g84 $token→PartitionKey := $user;
  #xyRECK3LoHRpVbhb $token→RowKey := @\u267b→azure_blob_storage→create_random_id(32);
  #cew9Bdivmbif4VB5 $token→time := code→now_seconds;
  #xPJ8VskelWS6QBRs $token→reason := $reason;
  #uD47bwfeClciXo3r $token→version := 2;
  #Owdf3kJVYQTqf86K if `not` code→or_empty($client\_id)→equals("no-cookie") then {
    #WZu81wuyPT80bF1R $token→cookie := @\u267b→azure_blob_storage→create_random_id(32);
  }
  #od4NcOFrytoRMlxU data→pubs_container→update($user, $update);
  #Ul64Q4XzNUFGQHoh where update(entry: Json_Builder) {
    #N1vr7tjO2FTpi7HB $entry→set_number("lastlogin", code→now_seconds);
  }
  #jLeSSIuzhEHzKqlU data→tokens_table→insert_entity($token→to_json, "or merge");
  #ZIkHYyRIuYk2KwYH $custom_token := code→token_string($token);
  #Qu6OAaNQRQpsBYPf $td_cookie := $token→cookie;
  meta private;
}
#xuwaSkW5IR68PAd2
action now_seconds() returns(#r4CdRpBUm3v8UeVi value: Number) {
  #m6B7P4z2nz5XKoNn $value := math→floor(data→redis_client→cached_time / 1000);
  meta private;
}
#S4X6hH2mYl9fABfR
action get_pub(#zm263hqnLapbbk24 id: String, #xNnkRwkTfJdy2HY2 kind: String) returns(#ekMPER52Xw44lnLZ entry2: Json_Object) {
  #xzuvPF2VFJjpC6s0 if code→non_empty($id) then {
    #ANS9DnqsiPLEWPoj $entry2 := data→pubs_container→get($id);
    #fq69POrICxMQSqwx if $entry2→is_invalid `or` `not` code→or_empty($entry2→string("kind"))→equals($kind) then {
      #YjoEAGVUOo7m9UmD $entry2 := invalid→json_object;
    }
  }
  else {
    #rsZCVxnD2EzY2MnM $entry2 := invalid→json_object;
  }
  meta private;
}
#xS92lif2kjDyywtR
action non_empty(#yQqFb2wjwcuEtEOK id: String) returns(#xZTcuA5DzwFHT1DE b: Boolean) {
  #wjlqUpOdQIY0zE61 $b := `not` $id→is_invalid `and` `not` $id→is_empty;
  meta private;
  meta sync;
}
#I9CSdORLSTTGZDZA
action perform_single_request(#mBHtK4pha3wMrCxF api_request: * api_request) {
  #Vqc2IMvR2UNjJxAt data→logger→new_context;
  #WmAbOsMDwsKwmnCa if $api_request→status = 200 `and` $api_request→root→equals("me") then {
    #HYTx4c0a5lEZv5N1 if $api_request→userid→is_empty then {
      #UiXBFKdKe8ZxWK0S $api_request→status := @\u267b→restify→http→@401_Unauthorized;
    }
    else {
      #Xki0q0E9WHmCnuim $api_request→root := $api_request→userid;
    }
  }
  #wuvVgJ5bVUCysWZN if $api_request→status = 200 then {
    #A8x49kiS9ypJLZXA code→lookup_route($api_request, $api_request→root, $api_request→verb);
    #GzGtKHWCRp1rJXqu if `not` $api_request→verb→is_empty then {
      #b8of9ylaRqg3O0mx code→lookup_route($api_request, $api_request→root, "*");
    }
    #UNy2T97oJjqpqx9t if $api_request→route→is_invalid `and` `not` $api_request→root→is_empty then {
      #xHh34VksuGRNHWfy $pub := data→pubs_container→get($api_request→root);
      #mSj9igjIJ4Ju2bbD if $pub→is_invalid `or` $pub→string("kind")→equals("reserved") then {
        #XAigxz7DwgllE2w4 skip;
      }
      else {
        #kBzdkF4RzPiYwMlW $api_request→root := "*" ∥ $pub→string("kind");
        #VRYS9rMfMHQN1Byv $api_request→root_pub := $pub;
        #hFYR4CdU4t0Zy6t7 $api_request→root_id := $pub→string("id");
        #xape751ieMMKpUYL code→lookup_route($api_request, "*" ∥ $pub→string("kind"), $api_request→verb);
        #rqPzik0UnUNRDZk1 code→lookup_route($api_request, "*pub", $api_request→verb);
        #LMRTFjCGcsc0Ve5q if $api_request→verb→is_empty then {
          #x6WxErqC6D5NN6BO skip;
        }
        else {
          #LEdEJXjQ1d8C7QE4 code→lookup_route($api_request, "*" ∥ $pub→string("kind"), "*");
        }
      }
    }
    #QORjN8lleAKd15Gd skip;
    #VEz11zSXhUBActjM if $api_request→route→is_invalid then {
      #ADOd2k4kYGLzL2FT code→throttle($api_request, "apireq", 3);
      #kIYo4rgIHuaTpZKP $api_request→status := 404;
    }
    else {
      #FBQxYS8LXYwR0zsX $api_request→route→handler→run($api_request);
    }
    #RXIl1epqIlPw7r0V $cat := "ApiGet";
    #W9w0l7BlgrgGbPzx if $api_request→root→is_empty then {
      #hqV2t76uWLdhy2PK $cat := "ApiBatch";
    }
    else { #GAWmEF6ZDRaSM7AR if $api_request→verb→equals("installedlong") `or` $api_request→root→equals("notificationslong") `or` $api_request→verb→equals("notificationslong") then {
      #xpy3lAGlEAB5YTwi $cat := "ApiPoll";
    }
    else { #Kdv8QZG2uHhhpGbt if `not` $api_request→method→equals("GET") then {
      #WYAX2Ii1faLCM3z2 $cat := "ApiPost";
    }
    else { #v1Oy5vvsvJidXqS1 if `not` $api_request→is_top_level then {
      #MIQj1HOxVimOBJUj $cat := "ApiInner";
    }
    else { } } } } 
    #iDC4Doj7CJEfOYuC $ev_args := web→create_json_builder;
    #WgrxwSfLSdYtgKRc $path := $api_request→method ∥ " /api/";
    #x6VJ4CJL8YSpZOkb if `not` $api_request→route→is_invalid then {
      #Gfdb4EBRefbg04Ya $path := $path ∥ $api_request→route→root;
      #f71C890qeGh0mzfh if `not` $api_request→route→verb→is_empty then {
        #dnbIQkKphqohtlGE $path := $path ∥ "/" ∥ $api_request→route→verb;
      }
    }
    else {
      #xuI9tVvy9llSye4b $path := $path ∥ "*" ∥ $api_request→status;
    }
    #bYM1M5HTALmy1m3C $ev_args→set_string("rawURL", code→sanitze($api_request→orig_url));
    #p2j95S1xdpqyUMe5 $ev_args→set_string("user", $api_request→userid);
    #kT7Q0CGd8K4PmseA $ev_args→set_string("cat", $cat);
    #C4Q74X1nWBKBQnGG $ev_args→set_number("statusCode", $api_request→status);
    #GrZjthmH0uwedAGk if false then {
      #OOAve38yk2qujkno data→logger→custom_tick($path, $ev_args→to_json);
    }
    #I5jec6xcbPhpSw1f data→logger→measure($cat ∥ "@" ∥ $path, data→logger→context_duration);
  }
  meta private;
}
#rWqjeFz1UUu0QAX9
action send_response(#L0WM7CmTHRLMofE9 api_request: * api_request, #T22ORV5yKk13Oeui req: ♻ restify → Request, #MbJsXM4C8byYyHDN res: ♻ restify → Response) {
  #x4ssjTdUfcKGgG8u if $api_request→status ≠ 200 then {
    #xMCEj4NIzeZYt6KG if $api_request→status = @\u267b→restify→http→@401_Unauthorized then {
      #xHsTaHIxAA4cUA8x $res→send_error(@\u267b→restify→http→@403_Forbidden, "Invalid or missing ?access_token=...");
    }
    else { #hRnnvAzcwP6jIfaK if $api_request→status = @\u267b→restify→http→@402_Payment_Required then {
      #xAJON7M3qH9u60tM $res→send_custom_error(@\u267b→restify→http→@402_Payment_Required, "Your account is not authorized to perform this operation.");
    }
    else {
      #NafyNfiyPkWs2YFB $res→send_error($api_request→status, "");
    }
    } 
  }
  else { #SVpCX4TYJhjM4zhC if $api_request→response→is_invalid then {
    #xynu3tuR17udD9HM contract→assert(false, "response unset");
  }
  else {
    #NnDJm4Z1cBBCaYgd $etag := code→compute_etag_of_json($api_request→response);
    #K5XEENXy7fxd2InH if $api_request→method→equals("GET") `and` code→or_empty($req→header("If-None-Match"))→equals($etag) then {
      #xWXElwsQQrscZoVI $res→send_error(@\u267b→restify→http→@304_Not_Modified, "");
      #xjxc1yy0sIxy56hT `return` ;
    }
    #tJDmfwiWinR36Xtl $res→set_header("ETag", $etag);
    #xEn94TRF2w6TqjXf if `not` $api_request→is_cached then {
      #NGjbEfFZ9QfeJTzW $res→set_header("Cache-Control", "no-cache, no-store");
    }
    #mvUMEDjig8F7UIwf if `not` $api_request→headers→is_invalid then {
      #yOXIyNxDSeAsWOqQ foreach hd in $api_request→headers→keys
      do {
        #jh5A7Nv60TavAJTb $res→set_header($hd, $api_request→headers→at($hd));
      }
    }
    #x9h11SWEIHSA6vFY if $api_request→response→kind→equals("string") then {
      #xta42x24s1YjnuRO $res→set_header("X-Content-Type-Options", "nosniff");
      #VVGJiK8ztwraVPiu $res→send_text($api_request→response→to_string, code→with_default($api_request→response_content_type, "text/plain"));
    }
    else {
      #uD7psdMBu6c7gz1a $res→json($api_request→response);
    }
  }
  } 
  meta private;
  meta sync;
}
#EWf7lE0fwUm02plK
action perform_batch(#Ny72XCB7nn82QWgh req: * api_request) {
  #xud3LsysK9nCe7HV $req_arr := $req→body→field("array");
  #pQIkHv4OJypE1NuN if $req_arr→is_invalid `or` $req_arr→count > 50 `or` `not` $req→is_top_level then {
    #d4bG4sDlLqHaEsLv $req→status := @\u267b→restify→http→@400_Bad_Request;
  }
  else {
    #xphjU8i6VmW4CZj2 $resps := $req_arr→to_json_builder→to_collection;
    #NcZS2mgFIRCQRUmA @\u267b→parallel→@for($req_arr→count, $@action);
    #TaaQDgADKMEsxSKP where @action(x: Number) {
      #G4LDgumdTWr8dMTj $inp_req := $resps→at($x);
      #UoqGyKWCYq4Y9a4t $resp := code→perform_batched_request($inp_req, $req, false);
      #jo2k2bLp3xBYSLot $resps→set_at($x, $resp);
    }
    #xxHjJD5rxOYKneNI $jsb := web→create_json_builder;
    #x1jc2vCqKdbcBzWe $jsb→set_number("code", 200);
    #x8EyVXvwLAehCawS $jsb→set_field("array", $resps→to_json);
    #rICPk6Yxh6HlrD5r $req→response := $jsb→to_json;
  }
  meta private;
}
#NtI4npIq0PPfoe0q
action parse_url(#ndzdcvYZA6eTt2Lg url: String) returns(#CmDzpSAjCm4oxclr path: String, #xtXipr2e2dH32o37 query: Json_Object) {
  #hs1DfF2EvDUQ1tKt app→import("npm", "querystring", "");
  #JSA6uJHYnWn1SAfV app→javascript("local", "var m = /^([^?]*)\\?(.*)/.exec(url)\nif (m) {\n    path = m[1]\n    query = querystring.parse(m[2])\n} else { path = url; query = {} }\npath = path.replace(/^\\//, \"\")\nquery = lib.JsonObject.wrap(query) ");
  meta private;
  meta sync;
}
#Kz6AvREHFeiUeb6i
action perform_batched_request(#RYMg7chxXgjSuWOu inp_req: Json_Builder, #nTXgGltmQcWiK1sH req: * api_request, #xhUeacytQDO0QTxl allow_post: Boolean) returns(#Srcjrr7kip2E30wP resp: Json_Builder) {
  #SDgIeNi622Ad2oEH $api_request := code→build_api_request(code→with_default($inp_req→string("relative_url"), "/no-such-url"));
  #pZ9Xd6LtxRy85Una $api_request→method := code→with_default($inp_req→string("method"), "GET")→to_upper_case;
  #xe2tIp75LF0nkwIX $api_request→userid := $req→userid;
  #YUoYgf01xrzfEHpr $api_request→userinfo := $req→userinfo;
  #UuUDYYOciye1e0Gy skip;
  #xPoQj4GB5kUtd9VI $api_request→is_upgrade := $req→is_upgrade;
  #GSq8yCuecduLS2vl if `not` $allow_post then {
    #xobIuEe2rC3aA8Ja if `not` $api_request→method→equals("GET") then {
      #Ql542KWrjWxUW5J9 $api_request→status := @\u267b→restify→http→@405_Method_Not_Allowed;
    }
  }
  #lGeyzAWqxCm4zrCr if $api_request→status = 200 then {
    #xZVzBMeMNagTAcDa code→perform_single_request($api_request);
  }
  #x3hXF1uiMoMDxtaO $resp := web→create_json_builder;
  #ebTZT0MqRdivywyr $resp→set_number("code", $api_request→status);
  #cl6yI1fWMEaP2JnT if $api_request→status = 200 then {
    #LTG4wQShlNUlKsir $etag := code→compute_etag_of_json($api_request→response);
    #xeqQV4NnCgQ57s6F $s := $inp_req→string("If-None-Match");
    #HkGJS6x7VsD4NKUX if `not` $s→is_invalid `and` $s→equals($etag) then {
      #wl6kxU9c5qc0J5eP $resp→set_number("code", @\u267b→restify→http→@304_Not_Modified);
    }
    else {
      #np4sCe3chnPKsF6N $resp→set_string("ETag", $etag);
      #SVixK3voF3vBtAXe $resp→set_field("body", $api_request→response);
    }
  }
  meta private;
}
#vl57DlLzAxz7vDxO
action resolve_scripts(#hIzjhD7mOUB4iJoZ entities: ♻ indexed_store → fetch_result, #xJleukdoJ9bK7giD req: * api_request, #x20AKD9dShq7Plyf forSearch: Boolean) {
  #dlf1jJT2Y4hI42Cl $apply_updates := $req→query_options→boolean("applyupdates");
  #s2wlm8C59kyDOo74 $single_result := false;
  #rvwBTAUSHVDGyWPi if $apply_updates then {
    #vbhRj689IW2cRH4L $updates := collections→create_string_map;
    #LsdRYsYB6XCcP9ez $updates→set_at("", "1");
    #Pct9N4R0TCag6JqZ $entities→items := $entities→items→to_collection→@where($lambda)→to_json;
    #SPkuf52Cvo17myCy where lambda(elt: Json_Object) returns (result: Boolean) {
      #qzwXanLLhzCpD2Z4 if `not` $elt→field("pub")→boolean("ishidden") then {
        #WxX5VWN1LCK07e3L $key := code→or_empty($elt→string("updateKey"));
        #UswII4R7Y7ozSUw6 if $updates→at($key)→is_invalid then {
          #eiyfrI0aUkzZDNp5 $updates→set_at($key, "1");
          #qLgEWAYyIAYlfDGD `return` true;
        }
      }
      #az5iHs2ZDDd5ZXHF `return` false;
    }
  }
  else { #olD0qvja7EPnwvFT if $entities→items→count = 1 then {
    #x4VY2zDwJzH4afgX $single_result := $req→root_id→equals($entities→items→at(0)→string("id"));
  }
  else { } } 
  #cQx9Iua7F54PwUtB // 
  #odc3miqAhhuDo4vz $update_objs := create→Collection_of→Json_Object;
  #pm5Md72jgDfeDT2N $srcmapping := web→create_json_builder;
  #wsJh2y7f4gpedjn3 $srcitems := $entities→items→to_collection;
  #wIqAkSpqT7ocnitB $update_ids := $srcitems→map_to→String( `fun:elt` code→with_default($elt→string("updateKey"), "***"));
  #jXaCA9KGEOMy2PEz $update_objs := data→pubs_container→get_many($update_ids);
  #EbjkKmGZzxDglbKi if $apply_updates then {
    #zG3AaOoFJ5RNgp72 $coll2 := $update_objs→map_to→String( `fun:elt` code→with_default($elt→string("scriptId"), "***"));
    #Xv5ms1LPf0Fh3oDg $include_abuse := true;
    #PkeDQSAX54Zq21er if $forSearch then {
      #tF232ocMX1JxA2sj $include_abuse := code→caller_has_permission($req, "global-list");
    }
    #MO575NQO632VMdAG $entities→items := data→pubs_container→get_many($coll2)→@where( `fun:elt` code→is_good_pub($elt, "script") `and` ($include_abuse `or` code→is_abuse_safe($elt)))→to_json;
    #YoIkzbYcyXXnG0rD if $forSearch then {
      #lsydV1cEy0Rw3uBY $srcitems→@reverse;
      #drB6FqmGBS9HD42a foreach js2 in $srcitems
      do {
        #xu5pkdI6q8IWtzPz $srcmapping→set_string($js2→string("updateKey"), $js2→string("id"));
      }
    }
  }
  #VfuTpl9tVWHtUKhe // 
  #HMnksGAmalKMuHXf code→add_username_etc($entities);
  #kiOwfqXpYtMlFQv1 // 
  #Ijy4ipPXBXwEqtBq $see_hidden := code→has_permission($req→userinfo→json, "global-list");
  #e0Nr3HDSPPUbKSp6 $coll := create→Collection_of→\u2339pub_script;
  #hLUvr27E2UcsOVrz for 0 ≤ i < $entities→items→count do {
    #kr8yZOzlqAhSoMpT $js := $entities→items→at($i);
    #xhWsf8Cd0CgPv8LZ $@script := records→pub_script→create_from_json($js→field("pub"));
    #Juv55sPAZ4l4XKrZ $@script→unmoderated := code→or_false($@script→unmoderated);
    #bxompIcx3SqQDNK5 $@script→noexternallinks := `not` code→has_permission($js→field("*userid"), "external-links");
    #L4XMQw6dAVHG4Xmc $see_it := $see_hidden `or` $@script→userid→equals($req→userid);
    #xN5z5uBIt60YtmSK skip;
    #VW69dYHMF9UaNbfC if $@script→ishidden then {
      #xDfqDY2akjWcz4KR if $@script→unmoderated `and` $single_result then {
        #uMVoygJPfje3lMuH $single_result := code→caller_shares_group_with($req, $js→field("*userid"));
      }
      #X0G9iI4c90HhjkoZ $see_it := $see_it `or` $single_result `or` code→caller_is_facilitator_of($req, $js→field("*userid"));
      #EO7QA5wJ6IylNJW9 $see_it := $see_it `or` ($req→root_id→equals("promo-scripts") `and` `not` $@script→unmoderated);
    }
    else { #qzW6V8fABna2UbxK if $@script→unmoderated then {
      #tTnfB1qH4p29Pp7J $see_it := $see_it `or` code→caller_shares_group_with($req, $js→field("*userid"));
    }
    else {
      #TEtkU4wzj0EMOVpu $see_it := true;
    }
    } 
    #qkVp9qzyr2uLsdat if `not` $see_it then {
      #SyL0oz21gQA4qXfe `continue` ;
    }
    #zQQkMYkl6RncKCoX if $forSearch then {
      #Y7Md2fHiiQPAMZnA $@script→sourceid := code→with_default($srcmapping→string($js→string("updateKey")), $@script→id);
    }
    else {
      #XNRtq474QKWR0WB8 $@script→sourceid := invalid→string;
    }
    #nXu2eAs8paH2m2Z0 if $@script→is_invalid then {
      #MD02C6ADeWAy13q6 data→logger→error("wrong json: " ∥ $js→serialize);
    }
    #AnZTVA7y4XZfNU5x if $@script→@meta→is_invalid then {
      #VHfHukd4goQoA56T $@script→@meta := web→json("{}");
    }
    #DlcsAd1wUTpNNJ1d $@script→promo := $js→field("promo");
    #wh92zWdFrchO2pVO $coll→add($@script);
    #ITNfnwiVHmKUc7ex if $@script→rootid→is_empty then {
      #GGOD0FkiHv4yr2SG $@script→rootid := $@script→id;
    }
    #Ei7lsIAU9Qv7eWXE $update_obj := $update_objs→at($i);
    #Y4BPigMeznHdILCo if $update_obj→is_invalid then {
      #xAUkGJBGqRieNPLZ $update_obj := web→json("{}");
    }
    #xdVKLy9FPAuhXP2B if $update_obj→contains_key("scriptTime") then {
      #ITKg62ph47zmMroY $@script→updateid := $update_obj→string("scriptId");
      #PyFTvl2PN9KPYKxm $@script→updatetime := $update_obj→number("scriptTime");
    }
    else {
      #xvvXY7EufAV84bre $@script→updateid := $@script→id;
      #xVS8vCbHsJrdGx14 $@script→updatetime := $@script→time;
    }
    #kbBCv2UiXbb42x03 $@script→updateroot := $update_obj→string("id0");
    #FBSLMN4ZoM4R3koC if $@script→updateroot→is_invalid then {
      #uWsemDzWVRqZECO2 $@script→updateroot := code→with_default($update_obj→string("scriptId"), $@script→id);
    }
    #GPGh5uPBz5fT32SF if $update_obj→contains_key("pub") `and` $update_obj→field("pub")→contains_key("positivereviews") then {
      #suVI9PKIPFH0qvil $count := $update_obj→field("pub")→number("positivereviews");
      #Z8oP79PAxXj4PRSG $@script→positivereviews := $count;
      #ZG4d7HWGkcN4KgW0 $@script→cumulativepositivereviews := $count;
    }
  }
  #s4vEYs3EahC30Y1S $entities→items := $coll→to_json;
  meta private;
}
#xdMreww64ro8veVz
action resolve_users(#u9IHcBUgVcknfSDW entities: ♻ indexed_store → fetch_result, #Qynvkk1kiKRIGVDC req: * api_request) {
  #xxwvcamod95ZilPS $coll := create→Collection_of→\u2339pub_user;
  #BAGJ0d7mpMyyOgBo if code→or_false($req→query_options→boolean("imported")) then {
    #aTCDsm6N4QvVhZEa $entities→items := $entities→items→to_collection→@where( `fun:elt` code→or_empty($elt→string("login"))→is_empty)→to_json;
  }
  #bPbJ2aklVc8xKHTX foreach jsb in $entities→items
  do {
    #ds4GaR9XOCzPKA0K $user := records→pub_user→create;
    #sdkoOyzRdKJ6B2UK $coll→add($user);
    #Pm2E6TuXyMdVXXYX $user→from_json($jsb→field("pub"));
    #MaOC74NJXVXiQTGO $user→id := $jsb→string("id");
    #QpfIkkwwmpfHhXsk $user→kind := $jsb→string("kind");
    #xlvaQyT4JP27EJWg if `not` data→full_TD then {
      #xMc4DcIOWuaTRPNU $user→time := 0;
    }
    #LJdLctkST0eYXShb $user→isadult := code→has_permission($jsb, "adult");
  }
  #kkfBsuEYOwF48tf9 $entities→items := $coll→to_json;
  meta private;
  meta sync;
}
#BdGhpbmcgdGFibGUa
table pub_version {
  type = "Object";
  persistent = false;
  fields {
    #AlNotlaiDSnZcz82 instanceId : String
    #Ke5EJzByp2z45Z2B baseSnapshot : String
    #xcAMANCrXvackC92 time : Number
    #xaGNKbxsVmH5qPED version : Number
  }
}
#xtYAgzgB2Nl2ZUce
table pub_body {
  type = "Object";
  persistent = false;
  fields {
    #Ie9v85ke4Ucmbjyu guid : String
    #ZNYI39uaGH1OC2KI name : String
    #x4sGWrpKPR8BiHA8 scriptId : String
    #iQzcZNdyRr4I8jcp userId : String
    #kbkugX5vf6bAxi0q status : String
    #WlgcPQq0ZoHtpMde scriptVersion : * pub_version
    #DotgxRrLnBK3NJY6 recentUse : Number
    #Td5SqmOq2TTrrzOY @script : String
    #x3EbfwLc14bUgF5v editorState : String
    #dWkcBDnooOphK5Yq editor : String
    #xdnBgP1PJRU21nCl @meta : Json_Object
  }
}
#BdGhpbmca
table installed_result {
  type = "Object";
  persistent = false;
  fields {
    #kecG5DzZ6NmnsRBN delay : Number
    #dORR2B0VwqnW5dhO numErrors : Number
    #vsgozCve04zCtdyb headers : Collection[Json_Object]
  }
}
#xMnv0hEPf6AvfCnl
action \_init_workspaces() {
  #xPVRK90hw8YP13VW code→add_route("GET", "*user", "installed", $handler2);
  #J3s4lVcAy2x1GiGK where handler2(req: * api_request) {
    #J5aku5VuAZLW9kND code→me_only($req);
    #KzcbkC7t2klSVGYK if $req→status = 200 then {
      #H5YrFcXzwdSxkzgg code→get_installed($req, false);
    }
  }
  #OHc5u3kmj5bgANSs code→add_route("GET", "*user", "installedlong", $handler2);
  #x4Km9eZyXc02mrUl where handler2(req: * api_request) {
    #VBnktDiOQ55lonQy code→me_only($req);
    #Ii2Xhc7PdMVSbwYP if $req→status = 200 then {
      #xQdXynZc12UahdDi code→get_installed($req, true);
    }
  }
  #zOC1hawrpJ2f6E6w code→add_route("POST", "*user", "installed", $handler2);
  #G2RofGNvMpLNfKjh where no_size_check := true;
  #SKYCJuE8kvqHC45q where handler2(req: * api_request) {
    #bdixysy8ozQZvb4n code→me_only($req);
    #VjwYwD9rkozo2WTI if $req→status = 200 then {
      #ZgyGz5ewEJDcP71X code→post_installed($req);
    }
  }
  #glpJfQ4keGZa8svw code→add_route("DELETE", "*user", "installed", $handler2);
  #xHdHP3f3UEzi6KgV where handler2(req: * api_request) {
    #hhoU4TxRWUejUnpM code→me_only($req);
    #VO6og1uq0wQDn7qv if $req→status = 200 then {
      #xl5NL44K7M6i2Q97 $result := data→install_slots_table→get_entity($req→root_id, $req→argument);
      #frJm2qL5BIYfbn3Y if $result→is_invalid then {
        #OQCBaibnb6E5QD4w $req→status := @\u267b→restify→http→@404_Not_Found;
      }
      else {
        #IEEZE5oja4iEP2Rc code→delete_history($req, $req→argument);
        #Cl6W2jiEUNuWY8bv code→poke_sub_channel("installed:" ∥ $req→root_id);
        #iIzgmBhiKKymDK8k $req→response := web→json("{}");
      }
    }
  }
  #ZwPeLWszE3wWuTts data→email_keyid := "EMAIL";
  #Ci7MYoD8XrvbE43r code→add_route("POST", "*user", "settings", $handler2);
  #X4JV6l9FkuhE942E where handler2(req: * api_request) {
    #fybt6MGAlM0Nrxxq $logcat := "admin-settings";
    #OEdbBn4dcicmCvlX $update_own := false;
    #hvt4LJIFwTfzkzGd if $req→root_id→equals($req→userid) then {
      #YizcUJggqXWmYo0i code→check_permission($req, "adult");
      #W7o8CXYXI3zD0HRC if $req→status = 200 then {
        #xRFZQTK5rfyHNBgK code→throttle($req, "settings", 120);
        #AZu9FkVGRqPRO7L9 $logcat := "user-settings";
        #mrKtsMDvG8nshD6q $update_own := true;
      }
    }
    else {
      #xP4tHterE77wHtII code→check_facilitator_permission($req, $req→root_id);
    }
    #reF2eCSPwON2F5mv if $req→status = 200 then {
      #UwUfwSfWrMtQDFO3 $nick := code→or_empty($req→body→string("nickname"))→replace_regex("[^a-zA-Z0-9]", "")→to_lower_case;
      #et52Jb4hB5MqACdG code→refresh_settings;
      #B8YGGEALZA85KoX9 if $nick→is_match_regex(data→the_service_settings→blockedNicknameRx) then {
        #A43ua6ftWBqHFKa2 code→check_permission($req, "official");
      }
    }
    #x4Kp529ct21sKzG1 if $req→status = 200 then {
      #YEar0ANBMpHEiDcs $bld := data→pubs_container→update_and_upsert($req, $update);
      #xthFumvhEQwVB4QQ where update(entry: Json_Builder) {
        #FvlNNAmxklbhVwDz $sett := code→build_settings($entry→to_json);
        #WM9jejPxsBfo5rg8 $new_email := $req→body→string("email");
        #ESiWXKpjqeRRrfnh if `not` $new_email→is_invalid then {
          #lhb9DDEQo3aJ5WNn if $update_own then {
            #Tn0ji7cwbkD19hyg if $sett→emailverified then {
              #Jo9g1P0Qqwts63Up $sett→previousemail := $sett→email;
            }
            #gCl8341LvsjjoPVQ $sett→emailverified := false;
            #wHZVQLaiPDwyE6E0 $sett→email := $new_email;
            #pSQJdj817J7trXYd $id := @\u267b→azure_blob_storage→create_random_id(16)→to_lower_case;
            #T8aROJ5meU4fyT3d $entry→set_string("emailcode", $id);
            #oK7kQS0vP2RL8k4W if $new_email→is_match_regex("^[^@]+@[^@]+$") then {
              #NCMvYV4PeV0lyU5M `async` @\u267b→nodemailer→send($new_email, data→the_service_settings→emailFrom, "email verification on " ∥ data→my_host, "Please follow the link below to verify your new email address on " ∥ data→my_host ∥ "\n\n      " ∥ data→@self ∥ "verify/" ∥ $req→root_id ∥ "/" ∥ $id ∥ "\n\nThanks!");
            }
          }
          else {
            #bqF5U2cVHBAEyJZJ $sett→email := $new_email;
            #pi2Os4WYug44vWQH $sett→emailverified := true;
            #xvTjdvzNyVkoW2ca $sett→previousemail := "";
            #OwfKPXsX2hPyNMIv $entry→set_string("emailcode", "");
          }
        }
        #P9Sxy2DIBqJ8Axgp $settings := $sett→to_json→to_json_builder;
        #pqIIpKPMbRa2Bz2h code→set_fields($settings, $req→body, "aboutme\nculture\neditorMode\nemailfrequency\nemailnewsletter2\ngender\nhowfound\nlocation\nnickname\nnotifications\nnotifications2\noccupation\npicture\npicturelinkedtofacebook\nprogrammingknowledge\nrealname\nschool\ntwitterhandle\nwallpaper\nwebsite\nyearofbirth");
        #rtRRGEWVreQ8HJdb foreach k in "culture\nemail\npreviousemail\ngender\nlocation\noccupation\nprogrammingknowledge\nrealname\nschool" →split("\n")
        do {
          #xlm9DPTnr76HMXzU $val := $settings→string($k);
          #X2xDhVWzdMQ0hNU4 if `not` code→or_empty($val)→is_empty then {
            #xtnYK1Y38budLbfB $settings→set_string($k, code→encrypt($val, data→email_keyid));
          }
        }
        #xz8ql5DEKW159OM2 $value := $settings→to_json;
        #djUnLB2Jd2gziQ44 $entry→set_field("settings", $value);
        #czsCpW7y2NGjWYXC $sett := records→pub_user_settings→create_from_json($value);
        #vtjP0DGKricbYxhs $sett→nickname := $sett→nickname→substring(0, 25);
        #x70aMFzujVPAN8YP $entry→field("pub")→set_string("name", $sett→nickname);
        #PJLZt3DIBiNz8e6f $entry→field("pub")→set_string("about", $sett→aboutme);
        #LnRrOyoJtfou8eXq $req→response := $settings→to_json;
      }
      #E0bY1aa3vPEAG6Ef code→audit_log($req, $logcat);
      #xB5MkbdmIzx4kvXw where oldvalue := $req→root_pub;
      #xWigws1eazJumH4J where newvalue := $bld→to_json;
    }
  }
  #EwRsQZSdQiJRrpog data→settings_options_json := web→json(art→settings_options);
  #CeenEolrvzxiulwW code→add_route("GET", "*user", "settings", $handler2);
  #xk1BwTMk7SLWvZGD where handler2(req: * api_request) {
    #luoA2fqts2vRh8Dy if $req→root_id→equals($req→userid) then {
      #MN2NrW28vDkTs4FI skip;
    }
    else {
      #x1se9Gd9nj75Rq1K code→check_facilitator_permission($req, $req→root_id);
    }
    #eVwf8VG9Vcp4KdsV if $req→status = 200 then {
      #pZhYpJ8s6DJW4gfU if `not` $req→userid→equals($req→root_id) then {
        #iTrGIkBchagjIBMt code→audit_log($req, "view-settings");
      }
      #wNswS42Ezr5PrrJN $jsb := code→build_settings($req→root_pub)→to_json→to_json_builder;
      #kX9WD8piqzgXxZB9 if `not` code→or_empty($req→query_options→string("format"))→equals("short") then {
        #oOnp4zzMueVl9ZrQ code→copy_json(data→settings_options_json, $jsb);
      }
      #ExKUXWQt5Hmut2RR $req→response := $jsb→to_json;
    }
  }
  meta private;
  meta sync;
}
#BSwH8qogU7qQBmmN
action header_from_slot(#albkRCERa7o1Bzsh js: Json_Object) returns(#q6vXfboipKCF2ayD pub_header: * pub_header) {
  #xBIjD6QHh033KlhE $pub_header := records→pub_header→create;
  #xlnp50XEjRa60jnQ $is_deleted := $js→string("status")→equals("deleted");
  #xa0HeHnCqNwrgCGS if $is_deleted then {
    #L2TJyhjGMYPJOl00 $pub_header→from_json(web→json("{}"));
    #SszFAJwa7bEAbVL2 $pub_header→status := $js→string("status");
    #sLEDYby5nhY42Ges $pub_header→guid := $js→string("guid");
  }
  else {
    #tZ9tZyBu3ikmkaFm $pub_header→from_json($js);
    #xGbLRbNVZMdVAcxT $pub_header→@meta := web→json(code→with_default($js→string("meta"), "{}"));
  }
  #x0eQeu1eFB4kIWFR $pub_header→scriptVersion := records→pub_version→create;
  #apbJ3W44o8ntrLUP $pub_header→scriptVersion→instanceId := "cloud";
  #XEE5ADzEE0mSGysB $pub_header→scriptVersion→baseSnapshot := code→with_default($js→string("currentBlob"), "18561817817178.deleted.foobar");
  #xFjZFUoco18wuuYa $pub_header→scriptVersion→version := 1;
  #MgMiRpY4kC46eYWt $ms := 20000000000000 - $pub_header→scriptVersion→baseSnapshot→replace_regex("\\..*", "")→to_number;
  #RtetK6XgGt9TbpUV $pub_header→scriptVersion→time := math→round($ms / 1000);
  meta private;
  meta sync;
}
#xC9bZ0WkEOIUmpy4
action get_installed(#J6wsW02BNmM7PSPH req: * api_request, #OyJr1YSim7uWOMSt long: Boolean) {
  #Ub0FOqJTM696Rdhn if $req→argument→is_empty then {
    #xkam72aJyF2Vi38R $v := code→long_poll("installed:" ∥ $req→root_id, $long, $req);
    #VeBMiZrsgNq4ZyVk if $req→status = 200 then {
      #t4EdvYjJhmK4dIFA if $long then {
        #x2onkm2bfCNfGqXx // re-get for new notifiacation count if any
        #L61jnLIzeDU1NQso $req→root_pub := code→get_pub($req→root_id, "user");
      }
      #jvmU88bmxMD3aUcI $entities := data→install_slots_table→create_query→partition_key_is($req→root_id)→fetch_all;
      #rMxrAG3kIUoEQXOQ $res := records→pub_headers→create;
      #plt4L2xx0E32FldW $res→blobcontainer := code→workspace_for_user($req→userid)→blob_container→url ∥ "/";
      #rJnw2HS0DuCv2aTF $res→time := code→now_seconds;
      #Ginr9UTR6zZ3xAFi $res→random := @\u267b→node_crypto→random_bytes(16)→to_string("base64");
      #xhmyRMd3ze0tau8c $res→headers := create→Collection_of→\u2339pub_header;
      #xZgAVAuaNljRcDBV $res→newNotifications := code→or_zero($req→root_pub→number("notifications"));
      #xMskiJ2pI75UwxmR $res→notifications := $res→newNotifications > 0;
      #x4NR52Rvi4BDMOfK $res→v := $v;
      #Zk1oLRj0tykDULET foreach js in $entities
      do {
        #vpVU9tp4jhDu4Uix $res→headers→add(code→header_from_slot($js));
      }
      #xID8nQ75BhCDw2rG $req→response := $res→to_json;
    }
  }
  else {
    #zib7kA1NBHPQXGBA // ### specific slot
    #owqXgfkEx1NPjROW if $req→sub_argument→equals("history") then {
      #O0R6wpnk5MW5BHEL code→get_installed_history($req);
    }
    else {
      #pMDwAnrf1SS7Ek5T $result := data→install_slots_table→get_entity($req→root_id, $req→argument);
      #U24jGp1un1TlMWoR if $result→is_invalid then {
        #tMRWEbv21Xhq30ZJ $req→status := 404;
      }
      else {
        #ZCj7pG4CvW2lPWIA $req→response := code→header_from_slot($result)→to_json;
      }
    }
  }
  meta private;
}
#vE4Ik5KUTkIUt7vA
action post_installed(#qUGomNWJSNbWS4S2 req: * api_request) {
  #u7ZCWf4de2OjT2xh $installed_result := records→installed_result→create;
  #srpVrOlq5Tf7Y2TP $installed_result→delay := 10;
  #zLSaeHKjHgJnFtGW $installed_result→headers := create→Collection_of→Json_Object;
  #fbsq2BYdu6VH2kDv if $req→argument→is_empty then {
    #Mat7OtTq60ivTM2B $bodies := $req→body→field("bodies");
    #k9t7WqQGlgSzxaOU if `not` $bodies→is_invalid then {
      #fYxfjEx5D10S4sJN foreach body in $bodies
      do {
        #hcVznTeI2Ubzg96K $pub_body := records→pub_body→create;
        #z6cR6rAsyvxiYup9 $pub_body→from_json($body);
        #x8hwj2wYBkFLYXo8 $item := code→save_script($req→root_id, $pub_body);
        #WDSCfQAG0FW992UB if $item→contains_key("error") then {
          #AP8u5Gf2Wr0Qaxp8 $installed_result→numErrors→\u25c8add(1);
        }
        #Ssdzk6NTKuyV1WhO $installed_result→headers→add($item);
        #LIAI3kY7MGj265YE $req→verb := "installedbodies";
      }
    }
    #MqOuVaIz2RoXXRRl $uses := $req→body→field("recentUses");
    #Gz6l9px87G3CgQ0b if `not` $uses→is_invalid then {
      #DC2e5FLlDgeSivhR foreach use in $uses
      do {
        #x04ZROtvTcL5z30Z $entity := @\u267b→azure_table→create_entity($req→root_id, code→or_empty($use→string("guid")));
        #xLAeV6OA3u9XYp2j $entity→set_number("recentUse", $use→number("recentUse"));
        #K3PP6OczEO8nCFvh $ok := data→install_slots_table→try_update_entity($entity→to_json, "merge");
        #gVO52tdT2MVM832y if `not` $ok then {
          #xfuPrv2IScIp9EOY $installed_result→numErrors→\u25c8add(1);
        }
        #xuGPhKU2SmRZD42u $req→verb := "installedrecent";
      }
    }
    #N8irbscUNo8qPZ6I code→poke_sub_channel("installed:" ∥ $req→root_id);
    #fnRiVaHGX7Q5PvM3 $req→response := $installed_result→to_json;
  }
  else {
    #VyQBpVvKuACB3BaB $req→verb := $req→sub_argument;
    #j4FpMtPPV1PI8QdX if $req→sub_argument→equals("compile") then {
      #xMT4Vv5qDfAx0hDd code→mbed_compile($req);
    }
    else { #rgR3djK4GAtEu2x9 if $req→sub_argument→equals("publish") then {
      #GyNoBA4p4dk2Y7PX code→can_post($req, "script");
      #K08TpMQdJTXwul4k if $req→status = 200 then {
        #Do4ud49xHmTCz0i3 $uid := $req→root_id;
        #srp4hqhFGux7uE3m code→publish_script($req);
        #BMxehzS3k0kVzmb1 code→progress("publish - poke");
        #xmyhdgv1i93XpUuI code→poke_sub_channel("installed:" ∥ $uid);
      }
    }
    else {
      #feilk34pQHWf8gmU $req→status := @\u267b→restify→http→@400_Bad_Request;
    }
    } 
  }
  #HZ25odrc3stgRYbz skip;
  meta private;
}
#PWOPmXNbUEtndDU4
action build_api_request(#WBfOL2Lxi7om3Svx url: String) returns(#gz5u4gVjzvdQ0B66 api_req: * api_request) {
  #Xn4uodsensJciRJH $api_req := records→api_request→create;
  #B6Ka3g2lJuJzWhd4 $api_req→orig_url := $url;
  #d4zYq2tDC2gEVh8d $path, $query := code→parse_url($url);
  #DeyZ0WqU62eqhrBv $strings := $path→split("/");
  #OIkeTv8YgRJRNjib if $strings→count > 0 `and` $strings→at(0)→equals("api") then {
    #vvKAQCwUCzzZlwPL $strings→remove_at(0);
  }
  #mzuTsxl8PZhQvoqA if $strings→count > 0 `and` $strings→at(0)→equals("cached") then {
    #FSkcmR4FWc7aq04p $strings→remove_at(0);
    #h6Pnmjm4csWpJHVY $api_req→is_cached := true;
  }
  #vPk70Bse9bbHKm6p $api_req→method := "GET";
  #nvg0LA4S3i21nj1f $api_req→root := code→or_empty($strings→at(0));
  #qUEEVFYSdHJUiYBO $api_req→verb := code→or_empty($strings→at(1));
  #hyt3MbSuoSgNr9Za $api_req→argument := code→or_empty($strings→at(2));
  #eSbZKdHl2mlCPyoH $api_req→sub_argument := code→or_empty($strings→at(3));
  #bwEFJpCwICN2YnqS $api_req→sub_sub_argument := code→or_empty($strings→at(4));
  #x2vhFyejnhOelPDe $api_req→query_options := $query;
  #UsqDfYKU144btItl $api_req→status := 200;
  #P4z1A2FiAv5fsvaC $api_req→userinfo := records→apireq_user_info→create;
  #RJFXfdFTT7YmJwUp $api_req→userinfo→permission_cache := web→create_json_builder;
  #OfoqzRRMI0qwqY2b $api_req→body := web→json_object;
  meta private;
  meta sync;
}
#generated367
table pub_user_settings {
  type = "Object";
  persistent = false;
  fields {
    #V04CbGZjo1yAqGxS nickname : String
    #tB05zCgfsaiTZ4KY aboutme : String
    #gBbT0CiTxlXJCxfC website : String
    #EGiB4cxzTBrjmcyG notifications : Boolean
    #xTsWSiXrumStGN72 notifications2 : String
    #vXb834lub1yiSnhq picturelinkedtofacebook : String
    #cX3T8EUCDBAFNX3q picture : String
    #hIFeoVqghdlbcdA9 gender : String
    #dG7eOvI2yEZTv36G realname : String
    #rDQy64GVtZlQRADf yearofbirth : Number
    #eLmmyYeJSaYXWbRG location : String
    #xgJMSLvhehK93f77 culture : String
    #DxSddz6B30rGGsCu howfound : String
    #xo2AqGkTPajfMjVz programmingknowledge : String
    #xZYFTXlqw2wo4B1y occupation : String
    #CYSrzonp2eZ5z4N0 twitterhandle : String
    #DADhot8xEC3Pi2RY email : String
    #xnnkg0FqnxMkTZT0 emailverificationsent : Boolean
    #x97Pe4uSnDWUKivK emailverified : Boolean
    #x2K90H966LROzEcB emailnewsletter2 : String
    #x4690NW91czz2TIL emailfrequency : String
    #ggQyDocD12lUT0Ks editorMode : String
    #Duu8GiOBIA9x5hY8 school : String
    #xWA9hvLTYr2qNo1Q wallpaper : String
    #ELjy8Z1A4maphAKD permissions : String
    #aO4Nuc7zJOmG4VA5 credit : Number
    #ftwCwlpaVuth31xH userid : String
    #xMLgKzHChUUIbnF4 previousemail : String
  }
}
#Ti2d6BmmftMmeOaf
action build_settings(#ZqZQMBmw2Gv44Xd6 user_json: Json_Object) returns(#xzsycauL60qMJVOO r: * pub_user_settings) {
  #P4178zZTqeLHUrl4 $settings := records→pub_user_settings→create;
  #uPzte4mbG11meoNu $user := records→pub_user→create;
  #sw8q94BvUT6pjcLG $user→from_json($user_json→field("pub"));
  #jtFfT41dU7A4dFUq $js := $user_json→field("settings");
  #xL0iWCBkAgyLv41a if `not` $js→is_invalid then {
    #mQvpMOWqaBSqmfPb $jsb := $js→to_json_builder;
    #eYzowwGpevwteQPq foreach kk in $jsb→keys
    do {
      #x1ySnZ2DsBc4ONZW $vv := $jsb→string($kk);
      #eR2daQNAMxtO9xVm if code→or_empty($vv)→starts_with("EnC$") then {
        #xAkY9P2kfy7G5qwW $jsb→set_string($kk, code→decrypt($vv));
      }
    }
    #GHCQmaCafO8VuvSj $settings→from_json($jsb→to_json);
  }
  #x7DHxIWSEtGkHKnR $settings→userid := $user_json→string("id");
  #xR11fxFZdQ7Am73N $settings→nickname := $user→name;
  #D5nhhfVE8eny9x1C $settings→aboutme := $user→about;
  #ok3wmZvRhCu1R4p5 code→refresh_settings;
  #tEm4YD0TZ0A4kGEf $perms := web→create_json_builder;
  #Kiv7B14z1eJrrte4 foreach s in code→or_empty($user_json→string("permissions"))→split(",")
  do {
    #yKoD52452hxioyJr if `not` $s→is_empty then {
      #xCGUfWxjqz4PwCwV $perms→set_number($s, 1);
      #r40sL5zxG4sqKQgT $js2 := data→settings_permissions→field($s);
      #ozdjj2v24eRsDyqb if `not` $js2→is_invalid then {
        #eAIjYhvj7ZEQUXE1 $perms→copy_from($js2);
      }
    }
  }
  #xZ247vWFC0HWiCv0 $settings→permissions := "," ∥ $perms→keys→join(",") ∥ ",";
  #K62sA38GSkLHLCaK $settings→credit := code→or_zero($user_json→number("credit"));
  #CpS6S4b4whL7xrPI `return` $settings;
  meta private;
}
#c0VC6zSCSwYnH5v1
var settings_options : String {
  is\_resource = true;
  url = "data:text/plain;base64,ewpub3RpZmljYXRpb25zMm9wdGlvbnM6IFsKIm5vIiwKInllcyIKXSwKZ2VuZGVyb3B0aW9uczogWwoibWFsZSIsCiJmZW1hbGUiCl0sCnllYXJvZmJpcnRob3B0aW9uczogWwoyMDAyLAoyMDAxLAoyMDAwLAoxOTk5LAoxOTk4LAoxOTk3LAoxOTk2LAoxOTk1LAoxOTk0LAoxOTkzLAoxOTkyLAoxOTkxLAoxOTkwLAoxOTg5LAoxOTg4LAoxOTg3LAoxOTg2LAoxOTg1LAoxOTg0LAoxOTgzLAoxOTgyLAoxOTgxLAoxOTgwLAoxOTc5LAoxOTc4LAoxOTc3LAoxOTc2LAoxOTc1LAoxOTc0LAoxOTczLAoxOTcyLAoxOTcxLAoxOTcwLAoxOTY5LAoxOTY4LAoxOTY3LAoxOTY2LAoxOTY1LAoxOTY0LAoxOTYzLAoxOTYyLAoxOTYxLAoxOTYwLAoxOTU5LAoxOTU4LAoxOTU3LAoxOTU2LAoxOTU1LAoxOTU0LAoxOTUzLAoxOTUyLAoxOTUxLAoxOTUwLAoxOTQ5LAoxOTQ4LAoxOTQ3LAoxOTQ2LAoxOTQ1LAoxOTQ0LAoxOTQzLAoxOTQyLAoxOTQxLAoxOTQwLAoxOTM5LAoxOTM4LAoxOTM3LAoxOTM2LAoxOTM1LAoxOTM0LAoxOTMzLAoxOTMyLAoxOTMxLAoxOTMwLAoxOTI5LAoxOTI4LAoxOTI3LAoxOTI2LAoxOTI1LAoxOTI0LAoxOTIzLAoxOTIyLAoxOTIxLAoxOTIwLAoxOTE5LAoxOTE4LAoxOTE3LAoxOTE2LAoxOTE1LAoxOTE0LAoxOTEzLAoxOTEyLAoxOTExLAoxOTEwLAoxOTA5LAoxOTA4LAoxOTA3LAoxOTA2LAoxOTA1LAoxOTA0LAoxOTAzLAoxOTAyLAoxOTAxLAoxOTAwLAoxODk5LAoxODk4LAoxODk3LAoxODk2LAoxODk1Cl0sCmN1bHR1cmVvcHRpb25zOiBbCiJhZi1aQSIsCiJzcS1BTCIsCiJnc3ctRlIiLAoiYW0tRVQiLAoiYXItRFoiLAoiYXItQkgiLAoiYXItRUciLAoiYXItSVEiLAoiYXItSk8iLAoiYXItS1ciLAoiYXItTEIiLAoiYXItTFkiLAoiYXItTUEiLAoiYXItT00iLAoiYXItUUEiLAoiYXItU0EiLAoiYXItU1kiLAoiYXItVE4iLAoiYXItQUUiLAoiYXItWUUiLAoiaHktQU0iLAoiYXMtSU4iLAoiYXotQ3lybC1BWiIsCiJhei1MYXRuLUFaIiwKImJhLVJVIiwKImV1LUVTIiwKImJlLUJZIiwKImJuLUJEIiwKImJuLUlOIiwKImJzLUN5cmwtQkEiLAoiYnMtTGF0bi1CQSIsCiJici1GUiIsCiJiZy1CRyIsCiJjYS1FUyIsCiJ6aC1DTiIsCiJ6aC1TRyIsCiJ6aC1ISyIsCiJ6aC1NTyIsCiJ6aC1UVyIsCiJjby1GUiIsCiJoci1IUiIsCiJoci1CQSIsCiJjcy1DWiIsCiJkYS1ESyIsCiJwcnMtQUYiLAoiZHYtTVYiLAoibmwtQkUiLAoibmwtTkwiLAoiZW4tQVUiLAoiZW4tQloiLAoiZW4tQ0EiLAoiZW4tMDI5IiwKImVuLUlOIiwKImVuLUlFIiwKImVuLUpNIiwKImVuLU1ZIiwKImVuLU5aIiwKImVuLVBIIiwKImVuLVNHIiwKImVuLVpBIiwKImVuLVRUIiwKImVuLUdCIiwKImVuLVVTIiwKImVuLVpXIiwKImV0LUVFIiwKImZvLUZPIiwKImZpbC1QSCIsCiJmaS1GSSIsCiJmci1CRSIsCiJmci1DQSIsCiJmci1GUiIsCiJmci1MVSIsCiJmci1NQyIsCiJmci1DSCIsCiJmeS1OTCIsCiJnbC1FUyIsCiJrYS1HRSIsCiJkZS1BVCIsCiJkZS1ERSIsCiJkZS1MSSIsCiJkZS1MVSIsCiJkZS1DSCIsCiJlbC1HUiIsCiJrbC1HTCIsCiJndS1JTiIsCiJoYS1MYXRuLU5HIiwKImhlLUlMIiwKImhpLUlOIiwKImh1LUhVIiwKImlzLUlTIiwKImlnLU5HIiwKImlkLUlEIiwKIml1LUxhdG4tQ0EiLAoiaXUtQ2Fucy1DQSIsCiJnYS1JRSIsCiJ4aC1aQSIsCiJ6dS1aQSIsCiJpdC1JVCIsCiJpdC1DSCIsCiJqYS1KUCIsCiJrbi1JTiIsCiJray1LWiIsCiJrbS1LSCIsCiJxdXQtR1QiLAoicnctUlciLAoic3ctS0UiLAoia29rLUlOIiwKImtvLUtSIiwKImt5LUtHIiwKImxvLUxBIiwKImx2LUxWIiwKImx0LUxUIiwKImRzYi1ERSIsCiJsYi1MVSIsCiJtay1NSyIsCiJtcy1CTiIsCiJtcy1NWSIsCiJtbC1JTiIsCiJtdC1NVCIsCiJtaS1OWiIsCiJhcm4tQ0wiLAoibXItSU4iLAoibW9oLUNBIiwKIm1uLU1OIiwKIm1uLU1vbmctQ04iLAoibmUtTlAiLAoibmItTk8iLAoibm4tTk8iLAoib2MtRlIiLAoib3ItSU4iLAoicHMtQUYiLAoiZmEtSVIiLAoicGwtUEwiLAoicHQtQlIiLAoicHQtUFQiLAoicGEtSU4iLAoicXV6LUJPIiwKInF1ei1FQyIsCiJxdXotUEUiLAoicm8tUk8iLAoicm0tQ0giLAoicnUtUlUiLAoic21uLUZJIiwKInNtai1OTyIsCiJzbWotU0UiLAoic2UtRkkiLAoic2UtTk8iLAoic2UtU0UiLAoic21zLUZJIiwKInNtYS1OTyIsCiJzbWEtU0UiLAoic2EtSU4iLAoiZ2QtR0IiLAoic3ItQ3lybC1CQSIsCiJzci1DeXJsLU1FIiwKInNyLUN5cmwtQ1MiLAoic3ItQ3lybC1SUyIsCiJzci1MYXRuLUJBIiwKInNyLUxhdG4tTUUiLAoic3ItTGF0bi1DUyIsCiJzci1MYXRuLVJTIiwKIm5zby1aQSIsCiJ0bi1aQSIsCiJzaS1MSyIsCiJzay1TSyIsCiJzbC1TSSIsCiJlcy1BUiIsCiJlcy1WRSIsCiJlcy1CTyIsCiJlcy1DTCIsCiJlcy1DTyIsCiJlcy1DUiIsCiJlcy1ETyIsCiJlcy1FQyIsCiJlcy1TViIsCiJlcy1HVCIsCiJlcy1ITiIsCiJlcy1NWCIsCiJlcy1OSSIsCiJlcy1QQSIsCiJlcy1QWSIsCiJlcy1QRSIsCiJlcy1QUiIsCiJlcy1FUyIsCiJlcy1VUyIsCiJlcy1VWSIsCiJzdi1GSSIsCiJzdi1TRSIsCiJzeXItU1kiLAoidGctQ3lybC1USiIsCiJ0em0tTGF0bi1EWiIsCiJ0YS1JTiIsCiJ0dC1SVSIsCiJ0ZS1JTiIsCiJ0aC1USCIsCiJiby1DTiIsCiJ0ci1UUiIsCiJ0ay1UTSIsCiJ1ay1VQSIsCiJoc2ItREUiLAoidXItUEsiLAoidWctQ04iLAoidXotQ3lybC1VWiIsCiJ1ei1MYXRuLVVaIiwKInZpLVZOIiwKImN5LUdCIiwKIndvLVNOIiwKInNhaC1SVSIsCiJpaS1DTiIsCiJ5by1ORyIKXSwKY3VsdHVyZW5hbWVzOiBbCiJBZnJpa2FhbnMgKFNvdXRoIEFmcmljYSkiLAoiQWxiYW5pYW4gKEFsYmFuaWEpIiwKIkFsc2F0aWFuIChGcmFuY2UpIiwKIkFtaGFyaWMgKEV0aGlvcGlhKSIsCiJBcmFiaWMgKEFsZ2VyaWEpIiwKIkFyYWJpYyAoQmFocmFpbikiLAoiQXJhYmljIChFZ3lwdCkiLAoiQXJhYmljIChJcmFxKSIsCiJBcmFiaWMgKEpvcmRhbikiLAoiQXJhYmljIChLdXdhaXQpIiwKIkFyYWJpYyAoTGViYW5vbikiLAoiQXJhYmljIChMaWJ5YSkiLAoiQXJhYmljIChNb3JvY2NvKSIsCiJBcmFiaWMgKE9tYW4pIiwKIkFyYWJpYyAoUWF0YXIpIiwKIkFyYWJpYyAoU2F1ZGkgQXJhYmlhKSIsCiJBcmFiaWMgKFN5cmlhKSIsCiJBcmFiaWMgKFR1bmlzaWEpIiwKIkFyYWJpYyAoVS5BLkUuKSIsCiJBcmFiaWMgKFllbWVuKSIsCiJBcm1lbmlhbiAoQXJtZW5pYSkiLAoiQXNzYW1lc2UgKEluZGlhKSIsCiJBemVyaSAoQ3lyaWxsaWMsIEF6ZXJiYWlqYW4pIiwKIkF6ZXJpIChMYXRpbiwgQXplcmJhaWphbikiLAoiQmFzaGtpciAoUnVzc2lhKSIsCiJCYXNxdWUgKEJhc3F1ZSkiLAoiQmVsYXJ1c2lhbiAoQmVsYXJ1cykiLAoiQmVuZ2FsaSAoQmFuZ2xhZGVzaCkiLAoiQmVuZ2FsaSAoSW5kaWEpIiwKIkJvc25pYW4gKEN5cmlsbGljLCBCb3NuaWEgYW5kIEhlcnplZ292aW5hKSIsCiJCb3NuaWFuIChMYXRpbiwgQm9zbmlhIGFuZCBIZXJ6ZWdvdmluYSkiLAoiQnJldG9uIChGcmFuY2UpIiwKIkJ1bGdhcmlhbiAoQnVsZ2FyaWEpIiwKIkNhdGFsYW4gKENhdGFsYW4pIiwKIkNoaW5lc2UgKFNpbXBsaWZpZWQsIFBSQykiLAoiQ2hpbmVzZSAoU2ltcGxpZmllZCwgU2luZ2Fwb3JlKSIsCiJDaGluZXNlIChUcmFkaXRpb25hbCwgSG9uZyBLb25nIFMuQS5SLikiLAoiQ2hpbmVzZSAoVHJhZGl0aW9uYWwsIE1hY2FvIFMuQS5SLikiLAoiQ2hpbmVzZSAoVHJhZGl0aW9uYWwsIFRhaXdhbikiLAoiQ29yc2ljYW4gKEZyYW5jZSkiLAoiQ3JvYXRpYW4gKENyb2F0aWEpIiwKIkNyb2F0aWFuIChMYXRpbiwgQm9zbmlhIGFuZCBIZXJ6ZWdvdmluYSkiLAoiQ3plY2ggKEN6ZWNoIFJlcHVibGljKSIsCiJEYW5pc2ggKERlbm1hcmspIiwKIkRhcmkgKEFmZ2hhbmlzdGFuKSIsCiJEaXZlaGkgKE1hbGRpdmVzKSIsCiJEdXRjaCAoQmVsZ2l1bSkiLAoiRHV0Y2ggKE5ldGhlcmxhbmRzKSIsCiJFbmdsaXNoIChBdXN0cmFsaWEpIiwKIkVuZ2xpc2ggKEJlbGl6ZSkiLAoiRW5nbGlzaCAoQ2FuYWRhKSIsCiJFbmdsaXNoIChDYXJpYmJlYW4pIiwKIkVuZ2xpc2ggKEluZGlhKSIsCiJFbmdsaXNoIChJcmVsYW5kKSIsCiJFbmdsaXNoIChKYW1haWNhKSIsCiJFbmdsaXNoIChNYWxheXNpYSkiLAoiRW5nbGlzaCAoTmV3IFplYWxhbmQpIiwKIkVuZ2xpc2ggKFJlcHVibGljIG9mIHRoZSBQaGlsaXBwaW5lcykiLAoiRW5nbGlzaCAoU2luZ2Fwb3JlKSIsCiJFbmdsaXNoIChTb3V0aCBBZnJpY2EpIiwKIkVuZ2xpc2ggKFRyaW5pZGFkIGFuZCBUb2JhZ28pIiwKIkVuZ2xpc2ggKFVuaXRlZCBLaW5nZG9tKSIsCiJFbmdsaXNoIChVbml0ZWQgU3RhdGVzKSIsCiJFbmdsaXNoIChaaW1iYWJ3ZSkiLAoiRXN0b25pYW4gKEVzdG9uaWEpIiwKIkZhcm9lc2UgKEZhcm9lIElzbGFuZHMpIiwKIkZpbGlwaW5vIChQaGlsaXBwaW5lcykiLAoiRmlubmlzaCAoRmlubGFuZCkiLAoiRnJlbmNoIChCZWxnaXVtKSIsCiJGcmVuY2ggKENhbmFkYSkiLAoiRnJlbmNoIChGcmFuY2UpIiwKIkZyZW5jaCAoTHV4ZW1ib3VyZykiLAoiRnJlbmNoIChNb25hY28pIiwKIkZyZW5jaCAoU3dpdHplcmxhbmQpIiwKIkZyaXNpYW4gKE5ldGhlcmxhbmRzKSIsCiJHYWxpY2lhbiAoR2FsaWNpYW4pIiwKIkdlb3JnaWFuIChHZW9yZ2lhKSIsCiJHZXJtYW4gKEF1c3RyaWEpIiwKIkdlcm1hbiAoR2VybWFueSkiLAoiR2VybWFuIChMaWVjaHRlbnN0ZWluKSIsCiJHZXJtYW4gKEx1eGVtYm91cmcpIiwKIkdlcm1hbiAoU3dpdHplcmxhbmQpIiwKIkdyZWVrIChHcmVlY2UpIiwKIkdyZWVubGFuZGljIChHcmVlbmxhbmQpIiwKIkd1amFyYXRpIChJbmRpYSkiLAoiSGF1c2EgKExhdGluLCBOaWdlcmlhKSIsCiJIZWJyZXcgKElzcmFlbCkiLAoiSGluZGkgKEluZGlhKSIsCiJIdW5nYXJpYW4gKEh1bmdhcnkpIiwKIkljZWxhbmRpYyAoSWNlbGFuZCkiLAoiSWdibyAoTmlnZXJpYSkiLAoiSW5kb25lc2lhbiAoSW5kb25lc2lhKSIsCiJJbnVrdGl0dXQgKExhdGluLCBDYW5hZGEpIiwKIkludWt0aXR1dCAoU3lsbGFiaWNzLCBDYW5hZGEpIiwKIklyaXNoIChJcmVsYW5kKSIsCiJpc2lYaG9zYSAoU291dGggQWZyaWNhKSIsCiJpc2ladWx1IChTb3V0aCBBZnJpY2EpIiwKIkl0YWxpYW4gKEl0YWx5KSIsCiJJdGFsaWFuIChTd2l0emVybGFuZCkiLAoiSmFwYW5lc2UgKEphcGFuKSIsCiJLYW5uYWRhIChJbmRpYSkiLAoiS2F6YWtoIChLYXpha2hzdGFuKSIsCiJLaG1lciAoQ2FtYm9kaWEpIiwKIksnaWNoZSAoR3VhdGVtYWxhKSIsCiJLaW55YXJ3YW5kYSAoUndhbmRhKSIsCiJLaXN3YWhpbGkgKEtlbnlhKSIsCiJLb25rYW5pIChJbmRpYSkiLAoiS29yZWFuIChLb3JlYSkiLAoiS3lyZ3l6IChLeXJneXpzdGFuKSIsCiJMYW8gKExhbyBQLkQuUi4pIiwKIkxhdHZpYW4gKExhdHZpYSkiLAoiTGl0aHVhbmlhbiAoTGl0aHVhbmlhKSIsCiJMb3dlciBTb3JiaWFuIChHZXJtYW55KSIsCiJMdXhlbWJvdXJnaXNoIChMdXhlbWJvdXJnKSIsCiJNYWNlZG9uaWFuIChGb3JtZXIgWXVnb3NsYXYgUmVwdWJsaWMgb2YgTWFjZWRvbmlhKSIsCiJNYWxheSAoQnJ1bmVpIERhcnVzc2FsYW0pIiwKIk1hbGF5IChNYWxheXNpYSkiLAoiTWFsYXlhbGFtIChJbmRpYSkiLAoiTWFsdGVzZSAoTWFsdGEpIiwKIk1hb3JpIChOZXcgWmVhbGFuZCkiLAoiTWFwdWR1bmd1biAoQ2hpbGUpIiwKIk1hcmF0aGkgKEluZGlhKSIsCiJNb2hhd2sgKE1vaGF3aykiLAoiTW9uZ29saWFuIChDeXJpbGxpYywgTW9uZ29saWEpIiwKIk1vbmdvbGlhbiAoVHJhZGl0aW9uYWwgTW9uZ29saWFuLCBQUkMpIiwKIk5lcGFsaSAoTmVwYWwpIiwKIk5vcndlZ2lhbiwgQm9rbeVsIChOb3J3YXkpIiwKIk5vcndlZ2lhbiwgTnlub3JzayAoTm9yd2F5KSIsCiJPY2NpdGFuIChGcmFuY2UpIiwKIk9yaXlhIChJbmRpYSkiLAoiUGFzaHRvIChBZmdoYW5pc3RhbikiLAoiUGVyc2lhbiIsCiJQb2xpc2ggKFBvbGFuZCkiLAoiUG9ydHVndWVzZSAoQnJhemlsKSIsCiJQb3J0dWd1ZXNlIChQb3J0dWdhbCkiLAoiUHVuamFiaSAoSW5kaWEpIiwKIlF1ZWNodWEgKEJvbGl2aWEpIiwKIlF1ZWNodWEgKEVjdWFkb3IpIiwKIlF1ZWNodWEgKFBlcnUpIiwKIlJvbWFuaWFuIChSb21hbmlhKSIsCiJSb21hbnNoIChTd2l0emVybGFuZCkiLAoiUnVzc2lhbiAoUnVzc2lhKSIsCiJTYW1pLCBJbmFyaSAoRmlubGFuZCkiLAoiU2FtaSwgTHVsZSAoTm9yd2F5KSIsCiJTYW1pLCBMdWxlIChTd2VkZW4pIiwKIlNhbWksIE5vcnRoZXJuIChGaW5sYW5kKSIsCiJTYW1pLCBOb3J0aGVybiAoTm9yd2F5KSIsCiJTYW1pLCBOb3J0aGVybiAoU3dlZGVuKSIsCiJTYW1pLCBTa29sdCAoRmlubGFuZCkiLAoiU2FtaSwgU291dGhlcm4gKE5vcndheSkiLAoiU2FtaSwgU291dGhlcm4gKFN3ZWRlbikiLAoiU2Fuc2tyaXQgKEluZGlhKSIsCiJTY290dGlzaCBHYWVsaWMgKFVuaXRlZCBLaW5nZG9tKSIsCiJTZXJiaWFuIChDeXJpbGxpYywgQm9zbmlhIGFuZCBIZXJ6ZWdvdmluYSkiLAoiU2VyYmlhbiAoQ3lyaWxsaWMsIE1vbnRlbmVncm8pIiwKIlNlcmJpYW4gKEN5cmlsbGljLCBTZXJiaWEgYW5kIE1vbnRlbmVncm8gKEZvcm1lcikpIiwKIlNlcmJpYW4gKEN5cmlsbGljLCBTZXJiaWEpIiwKIlNlcmJpYW4gKExhdGluLCBCb3NuaWEgYW5kIEhlcnplZ292aW5hKSIsCiJTZXJiaWFuIChMYXRpbiwgTW9udGVuZWdybykiLAoiU2VyYmlhbiAoTGF0aW4sIFNlcmJpYSBhbmQgTW9udGVuZWdybyAoRm9ybWVyKSkiLAoiU2VyYmlhbiAoTGF0aW4sIFNlcmJpYSkiLAoiU2Vzb3RobyBzYSBMZWJvYSAoU291dGggQWZyaWNhKSIsCiJTZXRzd2FuYSAoU291dGggQWZyaWNhKSIsCiJTaW5oYWxhIChTcmkgTGFua2EpIiwKIlNsb3ZhayAoU2xvdmFraWEpIiwKIlNsb3ZlbmlhbiAoU2xvdmVuaWEpIiwKIlNwYW5pc2ggKEFyZ2VudGluYSkiLAoiU3BhbmlzaCAoQm9saXZhcmlhbiBSZXB1YmxpYyBvZiBWZW5lenVlbGEpIiwKIlNwYW5pc2ggKEJvbGl2aWEpIiwKIlNwYW5pc2ggKENoaWxlKSIsCiJTcGFuaXNoIChDb2xvbWJpYSkiLAoiU3BhbmlzaCAoQ29zdGEgUmljYSkiLAoiU3BhbmlzaCAoRG9taW5pY2FuIFJlcHVibGljKSIsCiJTcGFuaXNoIChFY3VhZG9yKSIsCiJTcGFuaXNoIChFbCBTYWx2YWRvcikiLAoiU3BhbmlzaCAoR3VhdGVtYWxhKSIsCiJTcGFuaXNoIChIb25kdXJhcykiLAoiU3BhbmlzaCAoTWV4aWNvKSIsCiJTcGFuaXNoIChOaWNhcmFndWEpIiwKIlNwYW5pc2ggKFBhbmFtYSkiLAoiU3BhbmlzaCAoUGFyYWd1YXkpIiwKIlNwYW5pc2ggKFBlcnUpIiwKIlNwYW5pc2ggKFB1ZXJ0byBSaWNvKSIsCiJTcGFuaXNoIChTcGFpbiwgSW50ZXJuYXRpb25hbCBTb3J0KSIsCiJTcGFuaXNoIChVbml0ZWQgU3RhdGVzKSIsCiJTcGFuaXNoIChVcnVndWF5KSIsCiJTd2VkaXNoIChGaW5sYW5kKSIsCiJTd2VkaXNoIChTd2VkZW4pIiwKIlN5cmlhYyAoU3lyaWEpIiwKIlRhamlrIChDeXJpbGxpYywgVGFqaWtpc3RhbikiLAoiVGFtYXppZ2h0IChMYXRpbiwgQWxnZXJpYSkiLAoiVGFtaWwgKEluZGlhKSIsCiJUYXRhciAoUnVzc2lhKSIsCiJUZWx1Z3UgKEluZGlhKSIsCiJUaGFpIChUaGFpbGFuZCkiLAoiVGliZXRhbiAoUFJDKSIsCiJUdXJraXNoIChUdXJrZXkpIiwKIlR1cmttZW4gKFR1cmttZW5pc3RhbikiLAoiVWtyYWluaWFuIChVa3JhaW5lKSIsCiJVcHBlciBTb3JiaWFuIChHZXJtYW55KSIsCiJVcmR1IChJc2xhbWljIFJlcHVibGljIG9mIFBha2lzdGFuKSIsCiJVeWdodXIgKFBSQykiLAoiVXpiZWsgKEN5cmlsbGljLCBVemJla2lzdGFuKSIsCiJVemJlayAoTGF0aW4sIFV6YmVraXN0YW4pIiwKIlZpZXRuYW1lc2UgKFZpZXRuYW0pIiwKIldlbHNoIChVbml0ZWQgS2luZ2RvbSkiLAoiV29sb2YgKFNlbmVnYWwpIiwKIllha3V0IChSdXNzaWEpIiwKIllpIChQUkMpIiwKIllvcnViYSAoTmlnZXJpYSkiCl0sCmhvd2ZvdW5kb3B0aW9uczogWwoiZnJpZW5kIiwKIndlYiIsCiJ0ZWFjaGVyIiwKIm90aGVyIgpdLApwcm9ncmFtbWluZ2tub3dsZWRnZW9wdGlvbnM6IFsKIm5vbmUiLAoic29tZSIsCiJzZWxmLXRhdWdodCIsCiJmb3JtYWwgY2xhc3NlcyIKXSwKb2NjdXBhdGlvbm9wdGlvbnM6IFsKInN0dWRlbnQiLAoidGVhY2hlciIsCiJzb2Z0d2FyZSBkZXZlbG9wZXIiLAoib3RoZXIiCl0sCmVtYWlsbmV3c2xldHRlcjJvcHRpb25zOiBbCiJubyIsCiJ5ZXMiCl0sCmVtYWlsZnJlcXVlbmN5b3B0aW9uczogWwoibmV2ZXIiLAoiaG91cmx5IiwKImV2ZXJ5IDQgaG91cnMiLAoiZGFpbHkiLAoid2Vla2x5IiwKIm1vbnRobHkiCl0KfQ==";
  transient = true;
}
#WdxobtBMcqvb4l0e
action copy_json(#WHmE2pjCqfMNlGcc js: Json_Object, #xHUNNMypZLwivo3W jsb: Json_Builder) {
  #xI6qd54ulKP6zMNT foreach key in $js→keys
  do {
    #F1GgSya6uGpXGJ2j $jsb→set_field($key, $js→field($key));
  }
  meta private;
  meta sync;
}
#PB6zxT18vugpWSS4
var settings_options_json : Json_Object {
  transient = true;
}
#esRwud41rcA12Io9
action publish_script(#DToY7grH8jGPhAyH req: * api_request) {
  #xQmKUfIdk2DOQUuK code→progress("start publish, ");
  #x4ZXn32dn5woylh5 $publish_result := records→publish_result→create;
  #ueGFqSR2qEXUSIdn $publish_result→bodies := create→Collection_of→Json_Object;
  #x7MUyKT1viay0CPp skip;
  #xlyTopgU3b2O1LF8 $slot_json := data→install_slots_table→get_entity($req→userid, $req→argument);
  #SloyIj9S9P4y7c5b $pub_version := records→pub_version→create;
  #xP4Yryj7X6rIv2VN $pub_version→from_json(web→json($req→query_options→string("scriptversion")));
  #FvAIfj90RdokBoWj if $slot_json→is_invalid then {
    #pH9EmuKwafKKF1f9 $req→status := @\u267b→restify→http→@404_Not_Found;
  }
  else { #x5JXz7pG52fdbFbr if `not` $slot_json→string("currentBlob")→equals($pub_version→baseSnapshot) then {
    #pa4jOcNxm8eVDQos $req→status := @\u267b→restify→http→@409_Conflict;
  }
  else { } } 
  #EVR5bqYoFPOpy0ps skip;
  #HxOGGC1WIW2Z92xU if $req→status = 200 then {
    #gSI4GFFWZfIp948g $pub_script := records→pub_script→create;
    #UksqW3aBoPlWLOYP $pub_script→userid := $req→userid;
    #oiwHXiP0B4hyI59l $pub_script→ishidden := $req→query_options→boolean("hidden");
    #NHUVSm28z0WIQFcz $pub_script→unmoderated := `not` code→caller_has_permission($req, "adult");
    #x6luioeRalRx7y9l $mergeids := $req→query_options→string("mergeids");
    #fKO8SqSIFWQPwiGq if `not` $mergeids→is_invalid then {
      #P8fXQh0Tfkpv6nSz $pub_script→mergeids := $mergeids→split(",");
    }
    else {
      #xXKhjsVUFkSAwK9w $pub_script→mergeids := collections→create_string_collection;
    }
    #LlvbZUEBVdsK75C2 $body := code→workspace_for_user($req→userid)→get($pub_version→baseSnapshot);
    #aWn84KGYgiJEPkdC $pub_script→baseid := code→or_empty($body→string("scriptId"));
    #ylJo6J2L7Jl7MabE $req→root_pub := invalid→json_object;
    #iwqpdmTsrg7CWN44 $req→root_id := "";
    #AnfArEVY67bcgQ5K if `not` $pub_script→baseid→is_empty then {
      #w8P90qDC4qsYD4xO $base_json := code→get_pub($pub_script→baseid, "script");
      #h7EqgYAZzhlLWAXd if `not` $base_json→is_invalid then {
        #RfEnolG6dsBgY4Y6 $req→root_pub := $base_json;
        #JcHRRUzqM3gxjY6n $req→root_id := $pub_script→baseid;
        #DV5Q1KtxjVoqgY4Z $pub_script→rootid := code→with_default($base_json→field("pub")→string("rootid"), $pub_script→baseid);
      }
    }
    #o4qYGoQdsCuyQkAK $pub_script→time := code→now_seconds;
    #olarI5igg3NKfz2S $pub_script→name := code→with_default($req→body→string("name"), "unnamed");
    #eeiPJeoSHckchnkU $pub_script→description := code→or_empty($req→body→string("comment"));
    #MNuPAAG9jNJdgVtJ $pub_script→icon := code→or_empty($req→body→string("icon"));
    #K0BBO45B4bqj47Es $pub_script→iconbackground := code→with_default($req→body→string("color"), "#FF7518");
    #hnU2g792OLEFwnzK $pub_script→platforms := code→or_empty($req→body→string("platform"))→split(",");
    #r3hRGzNJssZqxOn2 $pub_script→islibrary := code→or_empty($req→body→string("isLibrary"))→equals("yes");
    #TeCaLLiDBYdDpw4V $pub_script→userplatform := code→get_user_platforms($req);
    #NzLv2N24bYeTl8I6 $pub_script→capabilities := collections→create_string_collection;
    #xYR273XeQNmwIg6o $pub_script→flows := collections→create_string_collection;
    #hg1206LhzF3nj1Li $pub_script→editor := code→or_empty($slot_json→string("editor"));
    #XDxacr7pFn2sqBcW $pub_script→iconArtId := $req→body→string("iconArtId");
    #Sms7o5WFq6oDbmqm $pub_script→splashArtId := $req→body→string("splashArtId");
    #vFADspbqIi03W6UA $pub_script→@meta := $req→body→field("meta");
    #zTolIxLGcs97T29K skip;
    #aT1egfUWr9yfyesk $jsb := web→create_json_builder;
    #kDAXamhOElHVzEor $jsb→set_string("currentBlob", $pub_version→baseSnapshot);
    #BjWKNCscJoshK1jr code→publish_script_core($pub_script, $jsb, $body→string("script"), $req);
    #KVJ4t3HuwWLOPlmB // 
    #RQgKdG0liDcBcdur $slot_builder := $slot_json→to_json_builder;
    #NNeYeqMgQbx7390s $slot_builder→set_string("status", "published");
    #p2PWV7rdnJzyDr64 $slot_builder→set_string("scriptId", $pub_script→id);
    #ABWkgFL0oCy3kZuk $slot_builder→set_string("userId", $pub_script→userid);
    #o5zvjJcMW4u4Uswa $slot_builder→remove_field("__etag");
    #tn1qjAVgWwbas1Tc $new_slot := $slot_builder→to_json;
    #uyh5XcQJJHsrS8La data→install_slots_table→update_entity($new_slot, "merge");
    #Q0UQkDLYO32aGVWF $publish_result→bodies→add(code→header_from_slot($new_slot)→to_json);
    #xfeNPZZGXykqIzDM $req→response := $publish_result→to_json;
  }
  meta private;
}
#yTDK9uNsCz6y04V0
table publish_result {
  type = "Object";
  persistent = false;
  fields {
    #xbxkBDo0PFUXTwfQ bodies : Collection[Json_Object]
  }
}
#XsXPQICgwRwi3Ox2
var script_text : ♻ cached_store → container {
  transient = true;
}
#MxO8Iek2JxTuU8qj
action resolve_comments(#xVCt4YMWYcSNJUVs entities: ♻ indexed_store → fetch_result) {
  #LR7Ay7xLDtmYwso9 code→add_username_etc($entities);
  #xK3agfUKgYIBvU1t $coll := create→Collection_of→\u2339pub_comment;
  #jQkRdvTVUWxKCzsf foreach jsb in $entities→items
  do {
    #xkd5cKpOBXiI3rXy $comment := records→pub_comment→create_from_json($jsb→field("pub"));
    #FYEttqbakTD6lwLZ $coll→add($comment);
  }
  #xTl9HMiyMzT5Zvik $entities→items := $coll→to_json;
  meta private;
}
#v22NLhTwqITEo2jl
action get_user_platforms(#waeA3k5uphd5XNLX req: * api_request) returns(#TLjrJGMLQqX4Lq1V platforms: Collection[String]) {
  #AYtYrRFKxCoj29yc if `not` data→full_TD then {
    #YXFE8jjH1p8lLXls `return` create→Collection_of→String;
  }
  #xh4s2kzmylODnWfO `return` code→with_default($req→query_options→string("user_platform"), "unknown")→split(",");
  meta private;
  meta sync;
}
#vBYwK8LK1Wah3aFp
action post_comment(#xldcfjbhumdA2urY req: * api_request) {
  #ePOQuMaGC3hnCmuP $base_kind := $req→root_pub→string("kind");
  #UGEBNbKuSBEQMnaA if `not` $base_kind→is_match_regex("^(comment|script|group|screenshot|channel)$") then {
    #gHtoi6t8FPaN422W $req→status := @\u267b→restify→http→@412_Precondition_Failed;
  }
  else {
    #FHZlixPldGvNpjxL $comment := records→pub_comment→create;
    #tQs0MVti4XKG3hU4 $comment→text := $req→body→string("text");
    #BOAJD2rIV6eF49ci $comment→userplatform := code→get_user_platforms($req);
    #gS4vcaS44ynnh18Y $comment→userid := $req→userid;
    #MBi5s7ykTZDlpZLs $comment→time := code→now_seconds;
    #wnU0sggqVJl9K4DR $comment→publicationid := $req→root_id;
    #SDy4WQ44Kc3UhPjA $comment→publicationkind := $base_kind;
    #iI51wLhJKOhg0zvK if $base_kind→equals("comment") then {
      #es8LlQXwLy4U63BH $comment→nestinglevel := $req→root_pub→field("pub")→number("nestinglevel") + 1;
      #O5Z4jdR8Lp2PD7yj $comment→publicationname := $req→root_pub→field("pub")→string("publicationname");
    }
    else {
      #ttt1vjR4dnycWbDm $comment→nestinglevel := 0;
      #azldEFQkCqP2buzC $comment→publicationname := code→or_empty($req→root_pub→field("pub")→string("name"));
    }
    #OCMF2bR2ExZRlPjv $jsb := web→create_json_builder;
    #CaeXjgSMOUqlmRkv $jsb→set_field("pub", $comment→to_json);
    #xbYRBTrQ6YbOXMEk code→generate_id($jsb, 10);
    #PhNb2UXFaubDeiRx data→comments→insert($jsb);
    #LxNVqgOsVxKm5Zju code→update_comment_counters($comment);
    #eCIYuMcr5PM2kpcC code→store_notifications($req, $jsb, "");
    #BJ5hk2NPy2HqZosq code→scan_and_search($jsb);
    #Bpo4XneRDMnnp4BZ // ### return comment back
    #BiYR4NERb52mIroz data→comments→return_one_pub($jsb→to_json, $req);
  }
  meta private;
}
#KX7pRgvqP7cIdi8p
action add_username_etc(#xN0XmJS6se4rtuvg entities: ♻ indexed_store → fetch_result) {
  #DSzwOuoUynxLnsvL $coll := code→add_username_etc_core($entities→items);
  #FxEHJY927S0XKjcs $entities→items := $coll→to_json;
  meta private;
}
#xxpgGX2DE9pXc4mB
action increment(#OSauN63yAXfdo3SF entry: Json_Builder, #G8UFyvc43u09BImP counter: String, #yjtTDommASOJ4aU0 delta: Number) {
  #x0MazM4TN3WBwFtu $base_pub := $entry→field("pub");
  #tgROrTxjDCh1UWSR if $base_pub→is_invalid then {
    #mDs2C1309wFz4YQw $base_pub := web→create_json_builder;
    #h2DRdxslvTFX72Ej $entry→set_builder("pub", $base_pub);
    #dDmkT9HGf4brEWRy $entry→set_string("kind", "reserved");
  }
  #AZHMYct6UM0TJYmH $x := $base_pub→number($counter);
  #v76ILXAYmuAem9WX if $x→is_invalid then {
    #x3slVXDKm7t2nnUe $x := 0;
  }
  #JfY2PeoqubiIEeKL $base_pub→set_number($counter, $x + $delta);
  meta private;
  meta sync;
}
#BMMps8zhqaXMXL0m
action compute_etag_of_json(#jpn8oSYT721jrlxG resp: Json_Object) returns(#Z8hXc1yjhUDjKSq5 etag: String) {
  #Sihkb9ho3sI4acJN $hash := @\u267b→node_crypto→create_hash("md5");
  #wX4fqka105DchSkW $hash→update_hash_string($resp→serialize);
  #g2GrboFYUIU46Bcl $etag := $hash→digest_hash→to_string("base64");
  meta private;
  meta sync;
}
#cdOjd1VPKCtaadLR
var update_slot_table : ♻ azure_table → @table {
  transient = true;
}
#l9Mv5kPtaBGQ6ohJ
table update_entry {
  type = "Object";
  persistent = false;
  fields {
    #pKPdDAyId3HVlWMh PartitionKey : String
    #MTuBY05SVWX05GnC RowKey : String
    #mZgG1T2tt1eOkMTx pub : String
    #Di6AVB6KKkmRLFqf time : Number
  }
}
#xjWmXbPHAHjFEvV9
var update_slots : ♻ indexed_store → store {
  transient = true;
}
#generated593
table pub_review {
  type = "Object";
  persistent = false;
  fields {
    #oiUjz4ncGqZNmEdF kind : String
    #TOj8ZN9Tv4Mirn52 time : Number
    #BTnHaaaU2L1Vb5UW id : String
    #TtEKz4Zz4jTBXwbp userid : String
    #iW4KcaFkYVHY2NBv username : String
    #kNFbiQi2WzUfhAn9 userscore : Number
    #Ck25bDAwOnB8deFr userhaspicture : Boolean
    #bNED32i0yyQgKjeR userplatform : Collection[String]
    #x0coq0wgVXFFngDq publicationid : String
    #x2LliHs2Of7sP2jG publicationname : String
    #KBp2rD6Jbrf3ZQqb publicationkind : String
    #y0rZsQDIMQ2B7wPZ publicationuserid : String
    #WFH7GGLKJaFxhMcn ispositive : Boolean
  }
}
#x3FXmJAJO5lu3RkN
action `type` resolution_callback(#olCv9K205kZJ9Of0 fetch_result: ♻ indexed_store → fetch_result, #Hj8NJEVLmA1VYZgK api_request: * api_request) {
  #xLnL4IN3jVlE27V6 skip;
}
#BdGhpbmcgaW5kZXga
table store_additions {
  type = "Decorator";
  persistent = false;
  keys {
    #ikAJpMNNwHH0kGbm target : ♻ indexed_store → store
  }
  fields {
    #xw2tNUvg62gYzaSg resolve : * resolution_callback
  }
}
#lbizVNcoGFw92qCZ
action set_resolve(#ooTCRfuX7NNoOdw1 store: ♻ indexed_store → store, #xMq2fcD2suE0W7sf resolution_callback: * resolution_callback, #xs9DCqOYyoq1ERhJ options\u003f: * resolve_options) {
  #DsFbKVBCyCag3ssQ if $options\u003f→anon_list then {
    #rGJK4noJ10ehEEId $options\u003f→anon_search := true;
  }
  #YT8lgGWhdIL1jz7x $store_additions := records→store_decorator→at($store);
  #cw1MMWU0PDPwjsjb $store_additions→resolve := $resolution_callback;
  #Ubxc9uTEh2t8Q64t code→add_route("GET", "*" ∥ $store→kind, "", $handler6);
  #qxHPTVzucbL4jBO6 where handler6(req: * api_request) {
    #x9o6wvoQE4hVckhf $fetch_result := $store→single_fetch_result($req→root_pub);
    #TLGMik7M4phP6C4v $store_additions→resolve→run($fetch_result, $req);
    #C0Jq7AKysKFCuh0r $req→response := $fetch_result→items→at(0);
    #c4Q7Y2UoFFBgc7Dz if $req→response→is_invalid then {
      #AwQlG0mP6BIZQ3bg $req→status := @\u267b→restify→http→@402_Payment_Required;
    }
  }
  #DWNsEeQJNA2VwOTE $store→create_index("all", `fun:entry` "all");
  #zQjrP3P1tf3kP4zI $plural := $store→kind ∥ "s";
  #xsGi3LfGfKf1ORBw if $plural→equals("arts") then {
    #xrqZ2wPvjUirTdVV $plural := "art";
  }
  #HktAcw3ZGr6Kzbui code→add_route("GET", $plural, "", $handler);
  #PCxmXy2RIiCdSmoV where handler(req: * api_request) {
    #WMIUqPzMl7mfm6VY $q := code→or_empty($req→query_options→string("q"));
    #tDs1kBg90NyFej9B if $q→is_empty then {
      #TlKO4fsFkEcrh3PX if `not` $options\u003f→anon_list then {
        #LhHY6ISotQVl79lM code→check_permission($req, "global-list");
      }
      #qrSmnfhZKLTtH4uu if $req→status = 200 then {
        #YdbdJzKj9w4y23Hv $store→any_list($req, "all", "all");
      }
    }
    else {
      #B74Irmu6ERv424Qa if `not` $options\u003f→anon_search then {
        #d8U6mEdWICg2QLjV code→check_permission($req, "global-list");
      }
      #xnaVn4kc8k4iJuO7 if $req→status = 200 then {
        #xn43e2O6AazMWwI2 code→execute_search($store→kind, $q, $req);
      }
    }
  }
  #l3v24LprMtlioNeT if $options\u003f→by_userid then {
    #S7RF44E4CK2VKbDx // ### by posting user
    #H3wRQAW3K4Ez6giL $store→create_index("userid", `fun:entry` $entry→field("pub")→string("userid"));
    #jnWaKhNacgb5UZLd $pub_plural := $plural;
    #i4tDyOAuykDbhonc if $pub_plural→equals("groups") then {
      #TMvDUEmjnj4wUSJU $pub_plural := "owngroups";
    }
    #qt6e9Y6IpQg4TU70 code→add_route("GET", "*user", $pub_plural, $handler);
    #HL5xO75PjhQIr2kC where handler(req: * api_request) {
      #ijwDdDlVYAVG8qAA $store→any_list($req, "userid", $req→root_id);
    }
  }
  #rxqLdHZ5ZqM6ljEM if $options\u003f→by_publicationid then {
    #bp3hkAJB2K2MLeXJ // ### by parent publication
    #TDS5LjMx73kira8H $plural_pub := $plural;
    #W4rXKiMyoLQpSlpr if $plural_pub→equals("subscriptions") then {
      #fYzL0bpjj4o1iAHt $plural_pub := "subscribers";
    }
    #AHupGJPWllVkjys4 if $plural_pub→equals("auditlogs") then {
      #RaVTsdGBuF44sHkH $plural_pub := "pubauditlogs";
    }
    #SsoJX8sK1IUj4D64 $store→create_index("publicationid", `fun:entry` $entry→field("pub")→string("publicationid"));
    #qjqTMOHg3pO3Z2Zi code→add_route("GET", "*pub", $plural_pub, $handler);
    #wzOnFX7syLQNO1CA where handler(req: * api_request) {
      #Ukbwo2X6508bvNpx if $req→root_pub→string("kind")→equals("group") `and` $req→root_pub→field("pub")→boolean("isclass") then {
        #xFgrP8VDiX2PTZOc if $req→userid→is_empty then {
          #acJvo3dkONBWVj7b $req→status := @\u267b→restify→http→@401_Unauthorized;
        }
        else { #lkYe8oRL2o3NRBz1 if `not` $req→userinfo→json→field("groups")→contains_key($req→root_pub→string("id")) then {
          #wEGWMCOHXbrTpaHK code→check_permission($req, "global-list");
        }
        else { } } 
      }
      #ekG7wK5odw3bwMY9 if $req→status = 200 then {
        #QcKqiIu0vUW4h3g9 $store→any_list($req, "publicationid", $req→root_id);
      }
    }
  }
  meta private;
}
#e4b2W3zHJayM2gRH
table resolve_options {
  type = "Object";
  persistent = false;
  fields {
    #FPEi7U85y9ykdGIt by_userid : Boolean
    #fUIjJGtZvSTvMLgn by_publicationid : Boolean
    #m8HC3TQYvJzUs5GQ anon_list : Boolean
    #BOBpeDL4o0H6ghPF anon_search : Boolean
  }
}
#xCwNOQeT8S6tO26r
var reviews : ♻ indexed_store → store {
  transient = true;
}
#tbBNrXmtoYDceWlp
action resolve_reviews(#xK4lA1zEwNx3xMr4 entities: ♻ indexed_store → fetch_result) {
  #w2MQR1bXaTkgqW0f code→add_username_etc($entities);
  #K0tE9fAnQbgpfkWj $coll := create→Collection_of→\u2339pub_review;
  #wA7Wzsk3iAXDYlxr foreach jsb in $entities→items
  do {
    #s7w2GacS6RD4c3Q0 $review := records→pub_review→create_from_json($jsb→field("pub"));
    #DcBys35G6OWypYzP $coll→add($review);
  }
  #lOXfYA1KOPPXEgaF $entities→items := $coll→to_json;
  meta private;
}
#xCOZAfMfN4Gdzkrx
action get_user_reviewed(#hcmfOfXfdglc00Db req: * api_request) {
  #ioZHTvjH2XPmnJPw $pub := data→pubs_container→get($req→argument);
  #xEfjbEIkQ4581JoU if $pub→is_invalid then {
    #ZMsXxo2bZ8OnLqvT $req→status := 404;
  }
  else {
    #QbQ9GtqPYajuTsiB $id := $pub→string("id");
    #y2Floir4coghpdWU if $pub→string("kind")→equals("script") then {
      #aIZ25z4gb4Jsdh0f $id := $pub→string("updateKey");
    }
    #QAMfpbn58NkKU0iP $review_pointer := code→get_pub("r-" ∥ $id ∥ "-" ∥ $req→root_id, "pubpointer");
    #URDksiBhF6T87O3U if $review_pointer→is_invalid then {
      #tXxToR0YJsEHp91Q $req→status := 404;
    }
    else {
      #LOE7TaNGyDGjmNMl $req→response := data→reviews→get_one_pub($review_pointer→string("pointer"), $req);
      #J3BZkZDr4RY0E8eB if $req→response→is_invalid then {
        #xLbbsryWkJynZAfv $req→status := 404;
      }
    }
  }
  meta private;
}
#Wgjh3aYAxByv1r7E
action fetch_and_resolve(#x17x1u4bf4G22Up0 store: ♻ indexed_store → store, #R2IjtoFF6ZP1fInf req: * api_request, #xOL1yUE4HB8XNfON idx_name: String, #B5btzrzCTSfq04iK key: String) returns(#CvYuAmwzaAWWC3L7 entities: ♻ indexed_store → fetch_result) {
  #nZ6p4ShXNtaAr7vU $entities := $store→get_index($idx_name)→fetch($key, $req→query_options);
  #kdNVoRpluPd7ScC9 records→store_decorator→at($store)→resolve→run($entities, $req);
  meta private;
}
#cGzcsLJ9i57Kpjvf
action post_review(#x2EIqg324tIP0oSz req: * api_request) {
  #n9vBzPHyupqns4bi $base_kind := $req→root_pub→string("kind");
  #pkm1Ach5e00soet7 if `not` $base_kind→is_match_regex("^(comment|script|channel)$") then {
    #oLiisWRBt4vEaYuA $req→status := @\u267b→restify→http→@412_Precondition_Failed;
  }
  else {
    #xRq24Qv4aWETtyr2 $pubid := $req→root_id;
    #gjgY6dfld6FXyScE if $base_kind→equals("script") then {
      #L4elB174SoCrRVZz $pubid := $req→root_pub→string("updateKey");
    }
    #ZiR08VuEX8K62hoa skip;
    #M617YXDSboMfjYD8 $review := records→pub_review→create;
    #xIVgFFL47MO4NPH4 $review→id := data→reviews→generate_id(10);
    #G1oI580XetbFGGmL $review→userplatform := code→get_user_platforms($req);
    #xAzA10Mrsah7dKLJ $review→userid := $req→userid;
    #q2mRXKeD7CwOiQNP $review→time := code→now_seconds;
    #xmpTl7yk7AlG5xI5 $review→publicationid := $req→root_id;
    #zj0Lm0pTToJcnZZV $review→publicationkind := $base_kind;
    #Leq57BqPH1mrW1jH $review→publicationname := code→or_empty($req→root_pub→field("pub")→string("name"));
    #rfysPcHsuVC38SHL $review→publicationuserid := code→or_empty($req→root_pub→field("pub")→string("userid"));
    #dIrMIQgU2MiLbrHn $review→ispositive := true;
    #x5eJ2uqaxnaaDjxm $jsb := code→update_review_counts($review, $pubid, $req);
    #Fh4PfCDnkvONs4J9 if $req→status = 200 then {
      #xf97oLYQRxy70J5b // ### return heart back
      #xksyx2zhzZK9hT6n code→store_notifications($req, $jsb, "");
      #G6rKKZgv1xEa6TL0 data→reviews→return_one_pub($jsb→to_json, $req);
    }
  }
  meta private;
}
#WRNrDyPhegJ9OdxN
action return_one_pub(#xB4PprmpqSAb4TYF store: ♻ indexed_store → store, #xroiii2Cu9Uu24T0 obj: Json_Object, #q7fUfgLvqZrUCo4o api_request: * api_request) {
  #xudBpbIpGHXhVfP0 $api_request→response := $store→resolve_one_pub($obj, $api_request);
  #xqfRNO4Z4in5Eh3Y if $api_request→response→is_invalid then {
    #xGDob8XvtLtGahhF $api_request→status := @\u267b→restify→http→@402_Payment_Required;
  }
  meta private;
}
#x0tTq9cQkqwD8kzp
action get_one_pub(#iuIFKp4ocBzoN5KM store: ♻ indexed_store → store, #Q6R4VT7P45mPbO7P id: String, #pex76oddf4nVVr3U api_request: * api_request) returns(#oN4izuwiwaGGTYyU js: Json_Object) {
  #xL2QNVJUjtzHbfi2 $obj := code→get_pub($id, $store→kind);
  #rWeWWSw3DIR6JS84 if $obj→is_invalid then {
    #PmdTU4yAbTd3Fzfz $js := $obj;
  }
  else {
    #n46l21CgTCHNm3er $js := $store→resolve_one_pub($obj, $api_request);
  }
  meta private;
}
#SwEA7isfMlhpSsMe
action generate_id(#hU9VJ4YUALhVvrPv jsb: Json_Builder, #eWbtNgKyJpKIXoPf min_name_length: Number) {
  #xZPDYgKh7KcPPBbU $jsb→set_string("id", data→comments→generate_id($min_name_length));
  meta private;
}
#HA4O6VVknGDDDpqP
var empty_request : * api_request {
  transient = true;
}
#generated615
table pub_art {
  type = "Object";
  persistent = false;
  fields {
    #Nm5zlmJdNcpC1PrT kind : String
    #m3MYRN2h4cmkoRCe time : Number
    #GxRjvIjgpdtttF6l id : String
    #KTxeOF4eMVlu2JQx name : String
    #Xvp1QLS8tZ4ZzYEf description : String
    #xxJ3gR1C23bkCD8d url : String
    #ELRctgzCshS4Bs09 userid : String
    #xq5hE4DFisDNmK0O username : String
    #LOkyLF9PiyC4lgu1 userscore : Number
    #IGv0jCFsAuV7X5Hb userhaspicture : Boolean
    #tkY7cjEWmCtpEy2Y userplatform : Collection[String]
    #x8w0XODqBjc2G44G flags : Collection[String]
    #Lp9xErMVcmrLi2ex pictureurl : String
    #xwlWsSp4wVegEQC3 thumburl : String
    #QFl7I4xQKfxsztbW mediumthumburl : String
    #w23HCybVisyrHGPW wavurl : String
    #Mk3oejmJ0rdBL9fD aacurl : String
    #lLoT25WzHtHF4tmr contenttype : String
    #w9moHu5JfmuOt2ZX bloburl : String
    #goWrsi35rh5GJw0v arttype : String
    #MhxZ3lf1C8NmmuRl filehash : String
  }
}
#oXJQKe4H41SOcHMl
action resolve_art(#xjHzgoI3d62dXdVF entities: ♻ indexed_store → fetch_result, #d8PQxp9XN2wpzJmu req: * api_request) {
  #xMXUcWvS7hoUyDiK code→add_username_etc($entities);
  #tX7TGAoez4EWBJdB $coll := create→Collection_of→\u2339pub_art;
  #WJJZ8VBZfumPk4yh skip;
  #MlBz5GdSboAeQVLb foreach jsb in $entities→items
  do {
    #FKWWbGtMN5mhzamw $pub_art := records→pub_art→create_from_json($jsb→field("pub"));
    #QaHal3iqgtPGXzbw $coll→add($pub_art);
    #AF1v7bw25AMGR3l2 if $pub_art→flags→is_invalid then {
      #x45Ad4H3d0kSAPOv $pub_art→flags := collections→create_string_collection;
    }
    #z1RMGJKuGiPSQ2lH $id := "/" ∥ $pub_art→id;
    #kGNtBfgujwXefsQ4 $pub_art→contenttype := $jsb→string("contentType");
    #xpfCJPjrik0WnMSG if $req→is_upgrade then {
      #xNSn2ZObdoF4Vh2g $req→queue_upgrade_task( `async` code→redownload_art($jsb));
    }
    #t7xQlMx4CCD9yf64 if $jsb→boolean("isImage") then {
      #xeJOo2LFD2Wkya8V $pub_art→pictureurl := data→art_container→url ∥ $id;
      #iH3dr5uZ7Lq30lKQ $pub_art→thumburl := data→thumb_containers→at(0)→container→url ∥ $id;
      #Qn2D3hI9eh3ClpDq $pub_art→mediumthumburl := data→thumb_containers→at(1)→container→url ∥ $id;
      #UCpQ3oWRDQv26hTI $pub_art→bloburl := $pub_art→pictureurl;
      #t3XRjQTXaX2QqxK9 $pub_art→arttype := "picture";
    }
    else { #dyx48angY15XVPQ9 if code→or_empty($pub_art→arttype)→is_empty `or` $pub_art→arttype→equals("sound") then {
      #JOQmukXzy71YL1po $pub_art→wavurl := data→art_container→url ∥ $id;
      #sF3YVqrMrhDDGs10 if code→or_false($jsb→boolean("hasAac")) then {
        #Br53EpdvfWLl0jRM $pub_art→aacurl := data→aac_container→url ∥ $id ∥ ".m4a";
      }
      else {
        #lMlXCuiX0l2D9nTy $pub_art→aacurl := "";
      }
      #QYO9p9NLiHCGv28f $pub_art→bloburl := code→with_default($pub_art→aacurl, $pub_art→wavurl);
      #P9eUJpB95RpfDdAE $pub_art→arttype := "sound";
    }
    else {
      #O20SuiOmj7mProvB $pub_art→bloburl := data→art_container→url ∥ "/" ∥ $jsb→string("filename");
    }
    } 
  }
  #xFb4sJt7XM2Xr0O4 $req→await_upgrade_tasks;
  #dWQevlN4NEuvJ2bF $entities→items := $coll→to_json;
  meta private;
}
#YXzwiEH3x2QhSV8t
var arts : ♻ indexed_store → store {
  transient = true;
}
#MlB4tMGtNx4LlBxL
action post_art(#qdX3cICHftvXzsEB req: * api_request) {
  #gvZ4oTpafIYQeHQN $ext := code→get_art_extension($req→body→string("contentType"));
  #jKbufsicO33I4MG1 code→can_post($req, "art");
  #yEAnxMRYWMg8WmHv code→check_permission($req, "post-art-" ∥ $ext);
  #XVW1nxTfkAqNxne8 if $req→status ≠ 200 then {
    #Lrckf4S7orH9HBmt `return` ;
  }
  #v6zeNjwIrELWom4G $pub_art := records→pub_art→create;
  #i6x6vOSs3nD0JEID $pub_art→name := code→or_empty($req→body→string("name"));
  #pZAi3GmcSjts0jvs $pub_art→description := code→or_empty($req→body→string("description"));
  #qB9Y4qha58b1XbGg $pub_art→userplatform := code→get_user_platforms($req);
  #GRGPbyU5XSPKGxXr $pub_art→userid := $req→userid;
  #r1NoBJoEBuh5Cpgj $pub_art→time := code→now_seconds;
  #hu3aSnERuo7xteSd $jsb := web→create_json_builder;
  #yfdVHbf297f44Nto $jsb→set_field("pub", $pub_art→to_json);
  #XeVQd0ZqxXVjRpu2 data→logger→tick("PubArt");
  #QwRCSdAkLOAKxhF9 $jsb→set_string("kind", "art");
  #g8mcH7fiBUZ3dqJY code→post_art\u002dlike($req, $jsb);
  #xIWzO2CCvV5TUfag if $jsb→contains_key("existing") then {
    #x9HrrWL97UaHj3Aq data→arts→return_one_pub($jsb→field("existing")→to_json, $req);
    #cZrhUMWaxHN0PfoF `return` ;
  }
  #Azul1XgyY8LRQOi9 if $req→status = 200 then {
    #sTnipP3E6fctTF62 data→arts→insert($jsb);
    #YW2FQXRbBijyYyKL code→store_notifications($req, $jsb, "");
    #r86zW4gicozZoyXk code→upsert_art($jsb);
    #xH2XY1iNqn2dHWWK code→scan_and_search($jsb);
    #MkN4Gs967NcGQcfv where skip_search := true;
    #h9VlF6hco1PkUZ2o // ### return art back
    #HDfk4MXBdCPjl8iR data→arts→return_one_pub($jsb→to_json, $req);
  }
  meta private;
}
#Ff2a0XR1kJSSGfTz meta import kraken {
  pub "crao"
  usage {
    #BdGhpbmca
    table optimize_options {
      type = "Object";
      exported = true;
      persistent = false;
      fields {
        #XkWDQmhHd2QFGkEi width : Number
        #xfSRJFif0f12WhRc height : Number
        #ZcfomcKDnK0ujfxR resize_strategy : String
        #nMstq2lSwdq9fGdd lossy : Boolean
        #yvfbq9Gvu2RKio0r quality : Number
        #kS2DWZhfKAvvlnXS webp : Boolean
        #DVrCnTv0zBGIo7vl callback_url : String
        #IrIyfalGIBwHg69V retries : Number
      }
    }

    action `sync` init(api_key: String, api_secret: String, azure_account: String, azure_key: String, azure_container: String)
    action `async` optimize_picture_url_to_blob(picture_url: String, path: String, options\u003f: ♻ kraken → optimize_options) returns(id_or_url: String)
    action `async` optimize_picture_url(picture_url: String, options\u003f: ♻ kraken → optimize_options) returns(id_or_url: String)
  }
}
#xnrrJCpe2WL1JfgV
var art_container : ♻ azure_blob_storage → Container {
  transient = true;
}
#zGzbGEHz2UVry4Oi
action get_art_extension(#dX2uunoAakJgxlMo content_type: String) returns(#a2bKFv9wQAr9ahu4 ext: String) {
  #A7MpFYwBdqjUq9ep $ext := code→or_empty(data→art_content_types→string($content_type));
  meta private;
  meta sync;
}
#xLltw2BSrzTbnq9R
table thumb_container {
  type = "Object";
  persistent = false;
  fields {
    #rJZRJTgEK0snXY2r name : String
    #YEpqaKC5WumAcolX container : ♻ azure_blob_storage → Container
    #UBuNBTPuC6inE3eh size : Number
  }
}
#xYZquf62hWkFEXgU
var thumb_containers : Collection[ * thumb_container] {
  transient = true;
}
#E2ltEbmRsstKJ4m0
var blob_service : ♻ azure_blob_storage → Blob_Service {
  transient = true;
}
#REW1hRZsaC4sSyJz
action add_thumb_container(#bsBknTl4UVZm4q8A size: Number, #bfzBazOWPCHcs9Fi name: String) {
  #x401cwhqy9ZxgLH1 $thumb_container2 := records→thumb_container→create;
  #ihvgzN5OWyG2LBFX $thumb_container2→size := $size;
  #ANB2pyDOkjS2GZHG $thumb_container2→name := $name;
  #XGbCzOoMX9MKSLcN $thumb_container2→container := data→blob_service→create_container_if_not_exists($thumb_container2→name, "hidden");
  #Iz42zrKHz60FJvUi data→thumb_containers→add($thumb_container2);
  meta private;
}
#xbfCA39eSwczuvRI meta import restify {
  guid "d3f590eb-fe8e-4c2d-e893-87a4b46e5830"
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
#pKUVVg5SSiNxNgQa
action import_comment(#DajfOIHNPe3RWPla req: * api_request, #E1FWIA8Hz2bU88vX body: Json_Object) {
  #t6gsknWVyLLd1FVo $comment := records→pub_comment→create;
  #TJHn98rdsNPYr5mI $comment→from_json(code→remove_derived_properties($body));
  #NuiKTuCdo5Om2Fty skip;
  #r8cvPiY6QGG3VN5r $jsb := web→create_json_builder;
  #ei9o95DDDl4OioVb $jsb→set_field("pub", $comment→to_json);
  #q6EA9Gp9wjR6JrFx $jsb→set_string("id", $comment→id);
  #a99z1yfVPyb1f21D data→comments→insert($jsb);
  #A3fERrcNoB8U2AbG code→scan_and_search($jsb);
  #lYvq0me2fUuIH9py where skip_scan := true;
  #xh4nJtqE19VRt6Pn code→update_comment_counters($comment);
  meta private;
}
#oyjTBKyGvmczstPf
action update_comment_counters(#EDVrI4lLpCK8zg3z comment: * pub_comment) {
  #sPBthpbiw8U7eHw4 // ### update comment count
  #oq17LvQAS41Cqed7 data→pubs_container→update($comment→publicationid, $update);
  #L8wO118CTDiQSLSV where update(entry: Json_Builder) {
    #xrFbM94p29omKyqZ code→increment($entry, "comments", 1);
  }
  meta private;
}
#burOOgngEHzNmS1C
action import_art(#xR46I0gXJCpomjgO req: * api_request, #Bq2ZkxxJ22CNtyr1 body: Json_Object) {
  #Y19O468eCZ4H4iBD $pub_art := records→pub_art→create;
  #a3iAVZHKHAlarWTi $pub_art→from_json(code→remove_derived_properties($body));
  #zvjdfk2tYpowCW42 $content_type := "";
  #sWAD82oNutOjcEYX $r := code→or_empty($pub_art→pictureurl);
  #UE29bET3oooYPDAX if `not` $r→is_empty then {
    #xRqL2tfyu63uCtAy $wreq := web→create_request($r);
    #VtdhbNCx12P7Kdx9 $wreq→set_method("head");
    #D3OT8wMKXKWDfXcs $response := $wreq→send;
    #RSKLRpHAUWsb3rEa if $response→status_code = 200 then {
      #xmAAW15ev2CPlL2D $content_type := $response→header("content-type");
    }
    else {
      #xB5LhvpPCABG6qi2 data→logger→error("cannot HEAD art resource: " ∥ $r);
      #x2OPm2i7AAKq5blM $req→status := 404;
    }
  }
  else { #xfzj8q2vxa1X0F9T if `not` code→or_empty($pub_art→wavurl)→is_empty then {
    #gcn4V8K2dHORUY3L $content_type := "audio/wav";
    #ViWuyrEGchpJgM4o $r := $pub_art→wavurl;
  }
  else {
    #YtBL5W0fhd9o1ikC data→logger→error("bad art import: " ∥ $body→serialize);
    #snEJP9QYCukga8KG $req→status := 500;
  }
  } 
  #o6cVsLjWvsGsuY0l data→logger→debug("content type: " ∥ $content_type ∥ " for " ∥ $pub_art→id);
  #a5LHc2XgN3pJvYJP if $req→status = 200 then {
    #SJ6q51pNw7SDOWCh $jsb := web→create_json_builder;
    #Zv2iZjk05zeIyorg $jsb→set_field("pub", $pub_art→to_json);
    #xPRLtpMsLC1wslpn $jsb→set_string("id", $pub_art→id);
    #KREzuoy0Kt3JFEge code→fix_art_props($content_type, $jsb);
    #Uy6VGz9gkF8fDlv3 // 
    #moOuR2YY5JTTV3Kr $fn := $pub_art→id;
    #CC9hq0BvtPoRd4sx $result3 := data→art_container→copy_url_to_blob($fn, $r);
    #arFRMA5VEn4Gu4oW if $result3→is_invalid then {
      #DI6WCwlXNN0dTZQH data→logger→error("cannot download art blob: " ∥ $pub_art→to_json→serialize);
      #qFpsSKVf2NJ4AczP $req→status := 500;
    }
    else { #vdK2s2X23rUa2GRr if `not` $result3→succeded then {
      #kL0BL3injpi269t4 data→logger→error("cannot create art blob: " ∥ $pub_art→to_json→serialize);
      #xwVa1zLyo9byV3ZR $req→status := 500;
    }
    else { #Vtup84GTEKBTRnVq if $jsb→boolean("isImage") then {
      #FDGQ2lkPQIgRvYqM $result4 := data→thumb_containers→at(0)→container→copy_url_to_blob($fn, code→with_default($pub_art→thumburl, $r));
      #epFBzT1UkXBD78wH $result5 := data→thumb_containers→at(1)→container→copy_url_to_blob($fn, code→with_default($pub_art→mediumthumburl, $r));
      #xrNk2J7drb43BRIr if $result5→is_invalid `or` $result4→is_invalid then {
        #rXnSdUQ23NYqk27z data→logger→error("cannot download art blob thumb: " ∥ $pub_art→to_json→serialize);
        #sltVdrgGc0FIHdf5 $req→status := 404;
      }
      else { #F4Kdn75SUTQDJaUq if `not` $result4→succeded `or` `not` $result5→succeded then {
        #pNeXQpTT6GVxaNKw data→logger→error("cannot create art blob thumb: " ∥ $pub_art→to_json→serialize);
        #F9Y9UZNNVM0FuT8u $req→status := 500;
      }
      else { } } 
      #tXM4t6cTnnDBehFG skip;
    }
    else { #QHN1ymMqxSf0szUc if `not` code→or_empty($pub_art→aacurl)→is_empty then {
      #WQNghAubzh4pfqXa $result4 := data→aac_container→copy_url_to_blob($pub_art→id ∥ ".m4a", $pub_art→aacurl);
      #xQFbEs22Bm52AxwQ data→logger→debug("copy audio url OK for " ∥ $pub_art→id);
      #xpL9yHhgTJ7Xzvxx if $result4→is_invalid `or` `not` $result4→succeded then {
        #Cp08v9GCg0xnxTxm data→logger→error("cannot create art blob aac: " ∥ $pub_art→to_json→serialize);
        #xm1w8DGvsJQ5Oe0f $req→status := 500;
      }
      else {
        #kf10bb4w4iUfM4iS $jsb→set_boolean("hasAac", true);
      }
    }
    else { } } } } 
    #slhZksDau2SF0DIk // 
    #xoo4GQdYYzSZBcDq if $req→status = 200 then {
      #MzHVMyr0JD5T0qCA data→arts→insert($jsb);
      #HgSurNgs8Fe0tDfN code→upsert_art($jsb);
      #QbOZ6ECnyQ5RKB4b data→logger→debug("insert OK " ∥ $pub_art→id);
    }
  }
  meta private;
}
#lDJnkjrWB55TfsUi
action fix_art_props(#qhhio4akhDk31SWL content_type: String, #fUfEoq6zQjDbSs6a jsb: Json_Builder) {
  #MHZdG5N4vMCX2kJ2 $ext := code→get_art_extension($content_type);
  #rqQhKiQJBOjWzw0B $jsb→set_string("ext", $ext);
  #hmbq2i8JW6d5x4Rk $jsb→set_string("contentType", $content_type);
  #AdS0cSO52q2epUVN $arttype := "blob";
  #xY4qtADg6hJwiqW6 if $ext→equals("jpg") `or` $ext→equals("png") then {
    #xjbDjsisSl9FWcgU $arttype := "picture";
  }
  else { #HA1i9aJMUxvWs2E6 if $ext→equals("wav") `or` $ext→equals("mp3") `or` $ext→equals("aac") then {
    #fnbWng92asg1Tjsz $arttype := "sound";
  }
  else { #QwKJNhER5TfjTB02 if $ext→equals("js") `or` $content_type→is_match_regex("^text/") then {
    #BOfnDAyadouGjSRG $arttype := "text";
  }
  else { #Eg5zjKsUFTD7q9HB if $ext→equals("mp4") then {
    #xWUI43EDYgVliLlY $arttype := "video";
  }
  else { } } } } 
  #tv2AyTP2KmnsxR3x if $ext→is_empty then {
    #m3zdjyDEiR0R54dw $arttype := "";
  }
  #xRlhDrpooHEyLBP2 $jsb→set_boolean("isImage", $arttype→equals("picture"));
  #oeE0plWtBLAvmzfB $jsb→set_string("arttype", $arttype);
  #PsToKzcDVw4MJL3u $jsb→field("pub")→set_string("arttype", $arttype);
  meta private;
  meta sync;
}
#s4udPtiLlaEm2hGf
var aac_container : ♻ azure_blob_storage → Container {
  transient = true;
}
#MMELPkJCVbBy49vb
action insert_script(#jWqu3BeEZgAljwqz jsb: Json_Builder, #hRQLkDDoIMcuNDo2 pub_script: * pub_script, #suzPNT6KqKCRqI5e script_text: String, #xC2rQUQhlwbAHdLT is_import: Boolean) {
  #xnKfNtGddNueqZjV $pub_script→scripthash := code→sha256($script_text)→substring(0, 32);
  #x6SW4vdpEPpPkhD5 $jsb→set_field("pub", $pub_script→to_json);
  #yKHBzga4cJUX2V3U // 
  #Jy0SzVVfJu2UkyBJ $updateKey := code→sha256($pub_script→userid ∥ ":" ∥ $pub_script→rootid ∥ ":" ∥ $pub_script→name);
  #c1Yv5pCUlgDa6WzO $update_entry := records→update_entry→create;
  #xjLHTMa94IVm3mJp $update_entry→PartitionKey := $updateKey;
  #H8JELZDwdKZA4m0i $update_entry→pub := $pub_script→id;
  #SNH4XNbk29YcLXCp $update_entry→time := $pub_script→time;
  #S71Z3yXUvr53ibyj // 
  #xlZ50SLG5yR8pGML $jsb→set_string("updateKey", $updateKey);
  #xZmkhapfkBhjVmXD data→scripts→insert($jsb);
  #NI65GqV7qw70u3XM $update_entry→RowKey := $jsb→string("indexId");
  #xma726cWBbNOfCZZ // 
  #xuezewA6wjMJnFrf $body_builder := $pub_script→to_json→to_json_builder;
  #aGs5dfViA2Nia4Q5 $body_builder→set_string("text", $script_text);
  #eNr4NDnGDVqf8Kwj code→progress("publish - about to just insert");
  #p1fldXIJSWIPfZEY data→script_text→just_insert($pub_script→id, $body_builder);
  #xlcZxp63TjqWuvA4 // 
  #H0tGCtRf4PuMdm28 $upslot := code→get_pub($updateKey, "updateslot");
  #mygJE1trvimAl8Bf if $upslot→is_invalid then {
    #xZjy4vPT4t2OfOOD $jsb2 := web→create_json_builder;
    #AuuaOrt0rquSsFXC $jsb2→set_field("pub", web→json("{ positivereviews: 0 }"));
    #Tjjp34rm7ZIIc626 $jsb2→set_string("id", $updateKey);
    #ActVJTeEiJ0v2O9Y $jsb2→set_string("id0", $update_entry→pub);
    #b4CbOdpt5YPgXDRL $jsb2→set_string("scriptId", $update_entry→pub);
    #xkVphBCziNszzYOl $jsb2→set_number("scriptTime", $update_entry→time);
    #z9lbiMABX4OiMEVh code→progress("publish - about to update");
    #xAI23X9CIKopfHyl data→update_slots→insert($jsb2);
  }
  #d7g50symHMiXjZXi $jsb→set_string("text", $script_text);
  #MLcs1kcWxJsHI1cI if `not` $pub_script→ishidden then {
    #yKYJFmFnh4bz742v code→progress("publish - about to update insert");
    #wORZKx5NV1gelNyu data→update_slot_table→insert_entity($update_entry→to_json, "or merge");
    #xGoc6i2MyQaq78QJ code→progress("publish - about to update insert2");
    #ve2XjWappPfsozy0 data→pubs_container→update($updateKey, $update2);
    #ft32DB2xCWhefduj where update2(entry: Json_Builder) {
      #baF1UpWNMIzv7U2G if `not` $entry→contains_key("id0") then {
        #xwTisipitAlC0zBj $entry→set_string("id0", code→with_default($entry→string("scriptId"), $update_entry→pub));
      }
      #xb1yJoJA3oA3K1eD $entry→set_string("scriptId", $update_entry→pub);
      #xQk5ycZWP4R8bWpT $entry→set_number("scriptTime", $update_entry→time);
    }
  }
  #ePuOxKs4JX82oSWW code→scan_and_search($jsb);
  #nd5slMbYd2KVhicj where skip_search := $pub_script→ishidden;
  #iDiLn8EJ2YfvRKPB where skip_scan := $is_import;
  meta private;
}
#ukHd8TDl4FT2DuVK
action import_script(#Bar4N8thT3zRHP2I req: * api_request, #p7PxZuxvF9EVDnuw body: Json_Object) {
  #JTGBBNDyPkyGBz4V $pub_script := records→pub_script→create;
  #ygpPfpyASdDfb6tg $pub_script→from_json(code→remove_derived_properties($body));
  #Vy20ZPsuICIH1qFh $pub_script→screenshotthumburl := "";
  #DYd64KPvYi0RHjnr $pub_script→iconurl := "";
  #pnWT90ROlaTqvwkK $pub_script→screenshoturl := "";
  #oBgTgSF5XU9nRueZ $pub_script→capabilities := create→Collection_of→String;
  #JyFLOHXCIhtYRgeK $pub_script→flows := create→Collection_of→String;
  #oLCLkQH1byqAiDYi $pub_script→toptagids := create→Collection_of→String;
  #ltJA9DTUKWgZqL92 $pub_script→updateid := "";
  #wQzKFZWnQgMzuHJS $pub_script→updatetime := 0;
  #xszn8VBZJOobITI9 $pub_script→baseid := code→or_empty($pub_script→baseid);
  #qYl8VPkW4B4WKRkU $pub_script→positivereviews := 0;
  #wm24b2GzhYajgS5N $pub_script→cumulativepositivereviews := 0;
  #PlWJSKMwPUH8dPXv $pub_script→screenshots := 0;
  #RnYmG4uG4jCZivzh if $pub_script→baseid→is_empty `or` $pub_script→rootid→is_empty then {
    #xQ484puMUPChg2a3 $pub_script→rootid := $pub_script→id;
  }
  #xOrLBb8ZfBgMKRR9 skip;
  #AUHcHKhff6rb9Lki $jsb := web→create_json_builder;
  #xwsvlgCb17LdXeZ0 $jsb→set_string("id", $pub_script→id);
  #tZlyAyKoFhJ6QTsf code→insert_script($jsb, $pub_script, $body→string("text"), true);
  meta private;
}
#XAttVp32LPCDaUaY
action import_anything(#Cu5xE2Rc5vfQuDdl req: * api_request) {
  #AVmWGr9ZPzJu6Jfo $coll := $req→body→to_collection;
  #YGawxP0iGvZoL0kn @\u267b→parallel→@for($coll→count, $@action);
  #iE00PPOnCqQ6PZtV where @action(x: Number) {
    #fcTO2O1sGn2YFUsI $js := $coll→at($x);
    #xDYcI6lhbvHeWAto $api_request := code→import_one_anything($js);
    #QPPFXpZF6LkdrRPv $coll→set_at($x, $api_request→status→to_json);
  }
  #Pi19K813euSyG7NA $req→response := $coll→to_json;
  meta private;
}
#x82BNG2AoC9IHEoV
action import_user(#xl5S8ZMJkjeJae78 req: * api_request, #gG4nWSFcVzEt8Zip body: Json_Object) {
  #zptit4S2bZ4L2M2C $user := records→pub_user→create;
  #n0FxQms2JcSemmZP $user→from_json($body);
  #mPrfH1QD7QLt9kIf $user→url := "";
  #IYhI32oJwym5vMs4 $user→features := 0;
  #tF8GbSr4aIxJLPki $user→activedays := 0;
  #MGPHKmdF7H2W2DA4 $user→subscribers := 0;
  #tHRgd2XhAPNav5su $user→receivedpositivereviews := 0;
  #O38eJeuWv6xg2tLh $user→score := 0;
  #NI4UFpPFbtUYwXb8 $user→haspicture := false;
  #xhLtIJbEWnlXE4kE skip;
  #TZycFIUbZOhdugKL $jsb := web→create_json_builder;
  #LE54aulffS3funry $jsb→set_field("pub", $user→to_json);
  #lQBJ26qT34tmS4LG $jsb→set_string("id", $user→id);
  #x27dmiapgXPiaRAN $jsb→set_string("secondaryid", @\u267b→cached_store→fresh_short_id(12));
  #DFKrutCRem1FHbKZ data→users→insert($jsb);
  meta private;
}
#pe42MLZcMRBjXcu6
action copy_url_to_blob(#xoI6tOlcGv9flTNf Container: ♻ azure_blob_storage → Container, #z3BzmlQjHbL5DrR8 id: String, #x1AM2dS8BiApGi82 url: String) returns(#xEofz4xo6pbse8eT result3: ♻ azure_blob_storage → Blob_Info) {
  #lR2yC9KvtsZ9L32b $url := $url→replace("az31353.vo.msecnd.net", "touchdevelop.blob.core.windows.net");
  #UQhFHBcFkajh9BBA app→javascript("local", "");
  #Vc6i6b6uSrZYKh92 $dl_failure := false;
  #xLk3KktmxeD1s2i6 for 0 ≤ i < 3 do {
    #pFMyt1BWQm9DRkxc if $result3→is_invalid `and` `not` $dl_failure then {
      #OKhn4leSkC7ysU6p $request := web→create_request($url);
      #s51CNFQixHR2alSC if $i > 0 then {
        #xqiE2fJq8IWgMJOC $request→set_header("Connection", "close");
      }
      #l5RbsTuVGRBxMu0P $task := `async` $request→send;
      #ifCPyeFNsZiNIjo3 $response := $task→await_at_most(15);
      #sIqOEvsZUklZDVkn if $response→is_invalid then {
        #jckYU4mWkbBmCWiT data→logger→info("timeout downloading " ∥ $url);
      }
      else { #r949Iapm8uxanun1 if $response→status_code = 200 then {
        #sITmUGtE3Lg4dRqW $buf := $response→content_as_buffer;
        #waPKqirhEpK7tsC7 $result3 := $Container→create_block_blob_from_buffer($id, $buf);
        #AcsUhyVgNIbDiUcg where contentType := $response→header("Content-type");
        #wsMv0LoF38XO9GAB where timeoutIntervalInMs := 3000;
        #MdnjcJNYiAs922ad $err := "";
        #MKEhdXaXibc2jz44 if `not` $result3→succeded then {
          #KK28ZZi3n8KUMeY1 $err := " ERROR: " ∥ $result3→error;
        }
        #GBVAcxNH0Z4WoUWw if false then {
          #ws8gqwLAPMpV2acR data→logger→debug("copy url for " ∥ $Container→url ∥ "/" ∥ $id ∥ $err);
        }
      }
      else { #ENjdg1XpB2WdQY56 if $response→status_code = 404 then {
        #EFqL75zXNirHJB09 $dl_failure := true;
      }
      else {
        #eBzY1tEJGQj2FLwD data→logger→info("error downloading " ∥ $url ∥ " status " ∥ $response→status_code);
      }
      } } 
    }
  }
  meta private;
}
#generated907
table pub_tag {
  type = "Object";
  persistent = false;
  fields {
    #xt8RQxQVUJp4G0dr kind : String
    #sIIM7FrgwGR6364v time : Number
    #SifVsonZodANK441 id : String
    #GgQRrR3TLBimcp4u url : String
    #B5ZKZwVAmn7rtCzz name : String
    #hfbpKFPnl1Ys9yr2 category : String
    #UHqEmzrZ8cH9uzxL description : String
    #NVINEYZOjNDlRgnf instances : Number
    #LbGP5DI3P3gohlaz topscreenshotids : Collection[String]
  }
}
#generated197
table pub_group {
  type = "Object";
  persistent = false;
  fields {
    #nVYUox4aABv7sy5R kind : String
    #YGMWuywnUf92hr8i time : Number
    #IKmuXpBtSCs9Ke05 id : String
    #xZnyMRN0KmBK2Hf2 name : String
    #vJTujABIzUbZyXfM pictureid : String
    #myVNJ1UMxHR80qoF allowexport : Boolean
    #m0hEjAKc1kTj6y24 allowappstatistics : Boolean
    #aUIltqvk7jiTk6q7 isrestricted : Boolean
    #xj46tDiVW5T62ZKY isclass : Boolean
    #xqW76Rt4jiXaw48a description : String
    #R0hgF93y21jUtdrp school : String
    #H2DdO5wp0Fwy24Rk grade : String
    #BC3uYv4WN5SswetK url : String
    #tkqXMXlfp3VIs0Dk userid : String
    #GfUMwmZ6o8G36Gmj username : String
    #AejOQbjHPUXjhKs5 userscore : Number
    #npcK3js9JBGKcd2U userhaspicture : Boolean
    #QavlyFTpNXz6gPDD userplatform : Collection[String]
    #xKFaqtfkG6FdB4KI positivereviews : Number
    #XkLtdhD6YoiNgGLz subscribers : Number
    #qCrSnvkGSj3WjL0t comments : Number
  }
}
#generated473
table pub_screenshot {
  type = "Object";
  persistent = false;
  fields {
    #j6CmEqH46yBURrcF kind : String
    #En65wUf53lFJs2Pk time : Number
    #MAck7MSJqH34o9Oa id : String
    #gu40bisUWX23s9ka url : String
    #xpCbsJY90dSRFn2s userid : String
    #vh7ZzWTxk5gSCML2 username : String
    #xgrKFNpvqO5JQotj userscore : Number
    #mv4wHrXlp2FYfz41 userhaspicture : Boolean
    #W8sw22ZGwLrVXRQA userplatform : Collection[String]
    #j0R4Lzje4PguNOPC publicationid : String
    #a0xpCwTt0Ngj75qf publicationname : String
    #xUbSoqAMfK4uhUXI publicationkind : String
    #gux02rmxG8VqPvPA pictureurl : String
    #qv5wo02pTklKm4vS thumburl : String
  }
}
#RUOGBfIvnLFZBtwT
action remove_derived_properties(#kzd2LlIe4Fqa6DSv body: Json_Object) returns(#TmXVx4D4gTdu1fQD body2: Json_Object) {
  #WJoY4addIpdrcQqo $jsb2 := $body→to_json_builder;
  #xf5pq4NkzkrRhHfj foreach fld in "username,url" →split(",")
  do {
    #YkdW2zQLKFmNXamo $jsb2→set_string($fld, "");
  }
  #xtGQD4bqQJSOdapL foreach fld2 in "userscore,positivereviews,comments,subscribers" →split(",")
  do {
    #oiloOJAPW1Ed7CLR $jsb2→set_number($fld2, 0);
  }
  #GYSkHEFhuKiG63od $body := $jsb2→to_json;
  #D4oO84w72X5UKoCf $body2 := $body;
  meta private;
  meta sync;
}
#DaWgsBuzZGTdcgPs
action import_group(#waj3FvIIB5b2uImI req: * api_request, #bZG3Bo529msYeDVr body: Json_Object) {
  #xd4JsWGNcmuXCacW $grp := records→pub_group→create;
  #xx2F9eG42sUsLSnW $grp→from_json(code→remove_derived_properties($body));
  #tzrqbj2ZwNxZMi7n skip;
  #ADtDjx2B61DRO6vg $jsb := web→create_json_builder;
  #xhhTPsbv5yCNrVKw $jsb→set_field("pub", $grp→to_json);
  #IwbagE9C81gsv9fk $jsb→set_string("id", $grp→id);
  #xiDDLlVN61OvC9Sh data→groups→insert($jsb);
  #j0RUYr5pnzwEJ4rt code→scan_and_search($jsb);
  #Rjzkht25fL6LJxwc where skip_scan := true;
  meta private;
}
#x0G8Oma2JKKqPZRy
var groups : ♻ indexed_store → store {
  transient = true;
}
#QiW3iEhjujoX1FjK
action import_tag(#gfEk8h0oWIAjGyzy req: * api_request, #pVpn47QEVdm6GD50 body: Json_Object) {
  #FUOsAwmaUgkwjL22 $grp := records→pub_group→create;
  #allB2B2kSZRXLR3J $grp→from_json(code→remove_derived_properties($body));
  #FMDUrj2rU6ulaG4K skip;
  #MDp1zzzBUF03ynem $jsb := web→create_json_builder;
  #Kxc5nvB70HQzj2z4 $jsb→set_field("pub", $grp→to_json);
  #x1umJ6MDpjfeJxRP $jsb→set_string("id", $grp→id);
  #ov25nmyGs7uZdoy5 data→tags2→insert($jsb);
  meta private;
}
#boQmrpnpIKtTcfSZ
var tags2 : ♻ indexed_store → store {
  transient = true;
}
#SvIYvh6mG79F98Ju
action resolve_tags(#x6W9wztx8t18pbo0 entities: ♻ indexed_store → fetch_result) {
  #ksUIqsCHC34rTtiR $coll := create→Collection_of→\u2339pub_tag;
  #yHiKfBWkigo3rls3 foreach jsb in $entities→items
  do {
    #wPFq7GUrHzsJ0byv $tag := records→pub_tag→create_from_json($jsb→field("pub"));
    #GfYcc2kp71PhEJ38 $tag→topscreenshotids := create→Collection_of→String;
    #T9mH2jv8kQTlqIv4 $coll→add($tag);
  }
  #xoQOolrv3mVS1MNI $entities→items := $coll→to_json;
  meta private;
  meta sync;
}
#BSsz23usyKUON16p
action import_screenshot(#H8zl9auisxEfF5Q4 req: * api_request, #BfQ69wTMYptP5i8K body: Json_Object) {
  #CEkfcqUwHVtCfekC $screenshot := records→pub_screenshot→create;
  #k3vhdk5kKG2FmjIy $screenshot→from_json(code→remove_derived_properties($body));
  #Hb6vvPzqr5uQajdd $r := code→or_empty($screenshot→pictureurl);
  #x8uhsjBFkrI02vYd $jsb := web→create_json_builder;
  #y4q9ZlD1wJOhvyOR $jsb→set_field("pub", $screenshot→to_json);
  #ynn1YLLSTteOcb00 $jsb→set_string("id", $screenshot→id);
  #JIJ0BoBsKLAMfSxL code→fix_art_props("image/jpeg", $jsb);
  #l4rLWWRrTXH4vFRH // 
  #fvVUKlqBZZI86L4G $fn := $screenshot→id;
  #irlH4Gq5QdyV4O2Q $result3 := data→art_container→copy_url_to_blob($fn, $r);
  #ALENybzyFdB12XAi if $result3→is_invalid `or` `not` $result3→succeded then {
    #C5aOxKnCrJaPsx8v data→logger→error("cannot create ss blob: " ∥ $screenshot→to_json→serialize);
    #BwjtJ3tvDnvczySz $req→status := 500;
  }
  #MnrOJ9eRfXnLAGBO skip;
  #psWn3zgQSpYgvqDg if $req→status = 200 then {
    #x6Yeu4Z9sQHyt5oK $result4 := data→thumb_containers→at(0)→container→copy_url_to_blob($fn, code→with_default($screenshot→thumburl, $r));
    #VxHFptw2pvy2oDLv if $result4→is_invalid then {
      #KPpp28N34Eh28JvH data→logger→error("cannot download ssblob thumb: " ∥ $screenshot→to_json→serialize);
      #aLDdfk4fpeUOQE5D $req→status := 404;
    }
    else { #QgLBayOgfyZ9XcIf if `not` $result4→succeded then {
      #IORJPjJ5df1zRBVf data→logger→error("cannot create ssblob thumb: " ∥ $screenshot→to_json→serialize);
      #zNCxWKXVAMKgVsdo $req→status := 500;
    }
    else { } } 
  }
  #dvWVIFGLcW3eYwGu // 
  #xFYymwilun4hBCsP if $req→status = 200 then {
    #Brwsk0TQnToSP2PQ data→screenshots→insert($jsb);
    #j0wfz69hcUaexMBO data→logger→debug("insert OK " ∥ $screenshot→id);
    #JdZPs4LkCSGTvDOg code→update_screenshot_counters($screenshot);
  }
  meta private;
}
#ZYvJ4KLTPQpWsrKk
action \_init_scripts() {
  #xuf72HQy3zkLkHF2 data→update_slots := @\u267b→indexed_store→create_store(data→pubs_container, "updateslot");
  #fIhKIVCtBhXIYd1l data→scripts := @\u267b→indexed_store→create_store(data→pubs_container, "script");
  #vngEQifhIWW0h1f8 data→scripts→set_resolve($resolution_callback);
  #nljvW4Wxq1tssmFv where by_userid := true;
  #MriZJdrIDWx1IEH2 where anon_search := true;
  #ZIeZHgi23Qs3l2u2 where resolution_callback(fetch_result: ♻ indexed_store → fetch_result, api_request: * api_request) {
    #fBx2lwqB226bERSQ code→resolve_scripts($fetch_result, $api_request, false);
  }
  #xnULPVs1US72x6LK // ### all
  #xxDMELE72aCMnAyQ code→add_route("GET", "language", "*", $handler3);
  #mCP3gSqaRz4JDX1Z where handler3(req: * api_request) {
    #iRInjGUL7mNmazIN code→throttle($req, "tdcompile", 20);
    #yNBxGX43pJYL5VsN if $req→status = 200 then {
      #W2RGYUyDYStaInee $s := $req→orig_url→replace_regex("^/api/language/", "");
      #Pac6neXdt69wPpPO code→forward_to_cloud_compiler($req, "language/" ∥ $s);
    }
  }
  #DPz9wbrD9b7IiVPd code→add_route("GET", "doctopics", "", $handler3);
  #vCIXWw8uBfqcI31X where handler3(req: * api_request) {
    #xKBMwku2wfYQNIYm $resp := code→query_cloud_compiler("doctopics");
    #BahDUOsV41ppqfgH $req→response := $resp→field("topicsExt");
  }
  #xeYYgPYuDhe2h8Iw code→add_route("GET", "*script", "*", $handler3);
  #tgn246EHEV12Le72 where handler3(req: * api_request) {
    #xeQEPvV6Mq1HoRSu $is_td := code→or_empty($req→root_pub→field("pub")→string("editor"))→is_empty;
    #C24PefRNxT9z9M7b if `not` $is_td then {
      #xa2UXaaXGCsii9vs $req→status := @\u267b→restify→http→@405_Method_Not_Allowed;
    }
    else {
      #xEihAgJyqpnnt4eg code→throttle($req, "tdcompile", 20);
      #MV5T4QAyxxG02kP1 if $req→status = 200 then {
        #v3cYCXeVYiNtRf9S $path := $req→orig_url→replace_regex("^/api/[a-z]+/", "");
        #xCSbRre34KAoJo9W code→forward_to_cloud_compiler($req, "q/" ∥ $req→root_id ∥ "/" ∥ $path);
      }
    }
  }
  #x0mgNbAhR1Ct2xFa code→add_route("POST", "scripts", "", $handler3);
  #D6cxPf4Joe2WIr0V where size_check_excludes := "text";
  #VtOoZjDVzfBSkXXZ where handler3(req: * api_request) {
    #UCfn4PBTwLhEg2D4 code→can_post($req, "direct-script");
    #yDhORPmU8Mk0Ng4h if $req→status = 200 `and` code→or_empty($req→body→string("text"))→count > 100000 then {
      #xDwrzulv9qmSFxsm $req→status := @\u267b→restify→http→@413_Request_Entity_Too_Large;
    }
    #buAFS47Dz7WkjXWU skip;
    #w7jYJXdx2dgiD1oW $raw_src := code→or_empty($req→body→string("raw"));
    #VuRQM8QybSAEpFY2 if $req→status = 200 `and` `not` $raw_src→is_empty then {
      #sj7nQmkOW2YmAahI code→check_permission($req, "post-raw");
    }
    #p4o2NmAg1ZOxZSGD $forceid := code→or_empty($req→body→string("forceid"));
    #lUMVay7E9LDsG74u if $req→status = 200 `and` `not` $forceid→is_empty then {
      #x8tZ49lNEowroVsp code→check_permission($req, "pub-mgmt");
    }
    #atwm3DbSecaAfRgt skip;
    #WVY5pcbF9Q3vfC72 if $req→status = 200 then {
      #qfxt8a4NHcs2mwXU $scr := records→pub_script→create;
      #x7Ukzy0zrnVbGpYF $entry3 := code→get_pub($req→body→string("baseid"), "script");
      #QZFE8m42i46EYL2I if `not` $entry3→is_invalid then {
        #X0awCqG1yviPm9w5 $scr→baseid := $entry3→string("id");
        #hRCiJ8mhmPp6d2c3 $scr→rootid := $entry3→field("pub")→string("rootid");
      }
      #dBGpt7NS4uWZJSNJ $scr→userid := $req→userid;
      #x27XSEgv2u8oF4Te $scr→mergeids := create→Collection_of→String;
      #HFcb6bB4SQYKycFZ if $req→body→contains_key("mergeids") then {
        #WcI4RNDqM1u8mFmF $scr→mergeids→from_json($req→body→field("mergeids"));
      }
      #UfeUbq2I1Tio6L8a $scr→name := code→with_default($req→body→string("name"), "unnamed");
      #l7ZsnROf2mBCgc6G $scr→description := code→or_empty($req→body→string("description"));
      #GZZM4WdNRlqQOe9C $scr→iconbackground := code→with_default($req→body→string("iconbackground"), "#FF7518");
      #kOPkt5WxE68dgcyP $scr→islibrary := code→or_false($req→body→boolean("islibrary"));
      #xwynw6dG1iqcGxIn $scr→ishidden := code→or_false($req→body→boolean("ishidden"));
      #WqOHxTn14s38U2c2 $scr→userplatform := code→get_user_platforms($req);
      #IaCz4rDd4Jn5Yv9R $scr→capabilities := collections→create_string_collection;
      #xv9HGtLToeE4hd2E $scr→flows := collections→create_string_collection;
      #j276KR0P72ZFNd8f $scr→editor := code→or_empty($req→body→string("editor"));
      #GDC3RH5JWNlu4y1s $scr→@meta := $req→body→field("meta");
      #F0p4mF1eYXh27gsz $scr→iconArtId := $req→body→string("iconArtId");
      #j2qY7tLYECkyLN9U $scr→splashArtId := $req→body→string("splashArtId");
      #Q2d9QL7cTo1GSKTc $scr→raw := $raw_src;
      #MXr6P8DNJy4NxBNg $scr→unmoderated := `not` code→caller_has_permission($req, "adult");
      #xhD4pLNgQiKz2ZNe skip;
      #ddDi02CvJJ4N7H2N $jsb := web→create_json_builder;
      #xDLmBvrr1mwAemUu if `not` $forceid→is_empty then {
        #xQtqb6CZfzTnf3mJ $jsb→set_string("id", $forceid);
      }
      #GXtgnHPsg317Nb5j code→publish_script_core($scr, $jsb, $req→body→string("text"), $req);
      #xixlOA93pATitvBG data→scripts→return_one_pub($jsb→to_json, $req);
    }
  }
  #UrIb7vjtqtZXV737 code→add_route("POST", "*script", "", $handler4);
  #xGyXddpIW5GBWmxb where handler4(req: * api_request) {
    #t4s6aZQcUREagPK7 $unmod := $req→body→boolean("unmoderated");
    #R8Xq4RJwUYg37gIf if `not` $unmod→is_invalid then {
      #M1sBfqn4kZ834nEA code→check_facilitator_permission($req, $req→root_pub→field("pub")→string("userid"));
      #mHw5ZqbDSN2Qzi6E if $req→status = 200 then {
        #EI2YPzTbE14TEWc1 data→pubs_container→update($req→root_id, $update2);
        #EfkuIHazYkb9uPjP where update2(entry: Json_Builder) {
          #kyFhSLKqMVv4pUON $entry→field("pub")→set_boolean("unmoderated", $unmod);
        }
        #tRdjD2mCQeECof7t if `not` $unmod then {
          #Sk8MQ3lWZafvuFrl code→send_notification($req→root_pub, "moderated", invalid→json_object);
        }
        #OFmeVmouQFkojkX2 $req→response := web→json("{}");
      }
    }
    else {
      #JaGVJatA2r05qcsB $req→status := @\u267b→restify→http→@400_Bad_Request;
    }
  }
  #CUWzHWwWzi2RE1cf code→add_route("POST", "*script", "meta", $handler3);
  #CjWd8kNv6vWbBtgE where handler3(req: * api_request) {
    #LEC20kAT9yu9vJn2 if `not` code→caller_has_permission($req, "script-promo") then {
      #x7gE5VS3gpvv2iwh code→check_pub_permission($req);
    }
    #gyI7fdzIgVSLyk24 code→can_post($req, "script-meta");
    #oqvyjxN5DvpB4d0h if $req→status = 200 then {
      #xBCLkxVCJaetxoSV data→pubs_container→update($req→root_id, $update);
      #MGShNo5hJ9lUAZ5I where update(v: Json_Builder) {
        #Z2SN8XDgsrCJP7X5 $@meta := $v→field("pub")→field("meta");
        #W3DuhNdxCcYYfmdU if $@meta→is_invalid then {
          #xF4Dz5ZVGEPzQ9tg $@meta := web→create_json_builder;
        }
        else {
          #yHej0pItjWwu9C6c $@meta := $@meta→clone;
        }
        #KhKR1HyDTmPFnE8z code→copy_json($req→body, $@meta);
        #JwHM8mSaMfwyN42k foreach k in $@meta→keys
        do {
          #xiQwkZwW6HfcNw4I if $@meta→field($k)→kind→equals("null") then {
            #i88WsoQ2b8AVxJAu $@meta→remove_field($k);
          }
        }
        #pkGXpnKGrdIXox2n if $@meta→serialize→count > 10000 then {
          #E5r628lIp0iWwF2p $req→status := @\u267b→restify→http→@413_Request_Entity_Too_Large;
        }
        else {
          #mxQa2iNAWntFXLwp $v→field("pub")→set_builder("meta", $@meta);
          #EdJ2PRJ42kax60BS $req→response := $@meta→to_json;
        }
      }
      #w6LGls4fF3CqxNFH if `not` $req→root_pub→field("promo")→is_invalid then {
        #xuIgFhvF24ZM4LBY code→flush_api_cache("promo");
      }
    }
  }
  #Aml6V9H9ayiRshvo code→add_route("GET", "*script", "text", $handler6);
  #RX2xJ2dgrQWhppMD where handler6(req: * api_request) {
    #xYUhTR0Z3OMK0T7q if code→can_see_rootpub_script($req) then {
      #HJo8WAzGhd9sCuNu $entry2 := data→script_text→get($req→root_id);
      #nu4SA8lorwWN5wNK $req→response := $entry2→string("text")→to_json;
    }
    else {
      #Yyync3Pol99DAykk $req→status := @\u267b→restify→http→@402_Payment_Required;
    }
  }
  #t27kr8fvhM0qyqo2 code→add_route("GET", "*script", "canexportapp", $handler6);
  #xAOnsdT1ALMmu7Gm where handler6(req: * api_request) {
    #neRMxwlsxxnTJx1z $req→response := web→json("{ canExport: false, reason: \"App export not supported in Lite.\" }");
  }
  #bY6bzhNAh0Cu4GGO code→add_route("GET", "*script", "base", $handler6);
  #x2GUDxLDgvuUCG6v where handler6(req: * api_request) {
    #K4bZ1m3AwQnzciJo $base_id := $req→root_pub→field("pub")→string("baseid");
    #xTSfI99zrhPVUGhR if $base_id→is_empty then {
      #KauDvUt4EghncowY $req→status := 404;
    }
    else {
      #eZpYMJwvUr3TFWYA $req→response := data→scripts→get_one_pub($base_id, $req);
      #GPXO9a2D6Z14dgZm if $req→response→is_invalid then {
        #s9gZgGGsGYJ3GXjX $req→status := 404;
      }
    }
  }
  #xRGZTNk6CHQTdySO skip;
  #dohkxW5FP4i2Gxy2 code→add_route("GET", "showcase-scripts", "", $handler2);
  #xedPAP1WicXjnaVw where handler2(req: * api_request) {
    #nyqUO2PwOgtSwH9h if time→now→subtract(data→last_showcase_dl) > 20 then {
      #xBxyrEX7gDTIaok5 $js := web→download_json("https://tdshowcase.blob.core.windows.net/export/current.json");
      #fBuGlgogGMCsGwy6 data→showcase_ids := create→Collection_of→String;
      #xcJ47slMeYA6jOp8 if `not` $js→is_invalid then {
        #whFvYVDB32fSaPRp data→showcase_ids→from_json($js→field("ids"));
      }
      #RKOczJoGItwr8PQh data→last_showcase_dl := time→now;
    }
    #xmqU9EYAewtNEEGx $entities := data→scripts→fetch_from_id_list(data→showcase_ids, $req→query_options);
    #RlpJYUMxshXnsZiG records→store_decorator→at(data→scripts)→resolve→run($entities, $req);
    #R4OgB0OEWItYLFh2 code→build_list_response($entities, $req);
  }
  #MBkTbpyxuOkhzlyQ code→alias_route("GET", "featured-scripts", "showcase-scripts");
  #ImFzex6jS8vlbtt5 code→alias_route("GET", "new-scripts", "scripts");
  #NIDYgUI5FNAeI0im code→alias_route("GET", "top-scripts", "scripts");
  #tnQgIkVoaWbVnAQf // ### by base
  #PfQFMkRlLhj2RVfC data→scripts→create_index("baseid", `fun:entry` code→with_default($entry→field("pub")→string("baseid"), "-"));
  #jR4KR0qwC15NleG7 code→add_route("GET", "*script", "successors", $handler);
  #VtXvwbxFbxMiD6hU where handler(req: * api_request) {
    #xVZSyFnXdC2pvrQ2 data→scripts→any_list($req, "baseid", $req→root_id);
  }
  #eopQWdkhDRWjuKZ5 data→scripts→create_index("scripthash", `fun:entry` $entry→field("pub")→string("scripthash"));
  #UjjoUOK2JKUUZMDU code→add_route("GET", "scripthash", "*", $handler);
  #SuF4KeFeN9bYpre4 where handler(req: * api_request) {
    #ev1LTfyjEgE6Itrw data→scripts→any_list($req, "scripthash", $req→verb);
  }
  #AHHo5Nrc4CJzPPOj data→scripts→create_index("updatekey", `fun:entry` $entry→string("updateKey"));
  #XWn1er2MipqqkLdK code→add_route("GET", "*script", "updates", $handler);
  #f9ZHVPxk2mgGdrlC where handler(req: * api_request) {
    #U5lrPeARsE1E6SNG data→scripts→any_list($req, "updatekey", $req→root_pub→string("updateKey"));
  }
  #FxvIrT8ubx0VOZno data→scripts→create_index("rootid", `fun:entry` $entry→field("pub")→string("rootid"));
  #JKS27MareRLubKww code→add_route("GET", "*script", "family", $handler);
  #DMcd66IdMZZKsBT6 where handler(req: * api_request) {
    #TVpfhabnVL4G0rCG data→scripts→any_list($req, "rootid", $req→root_pub→field("pub")→string("rootid"));
  }
  #GbA59zUWKkLkifVH code→add_route("GET", "*script", "cardinfo", $handler);
  #NmZxRq4VJrSf4yib where handler(req: * api_request) {
    #OGCui38D26ngsYco $jsb := code→get_card_info($req, $req→root_pub);
    #EmV4gXewAW2PKF6t $req→response := $jsb→to_json;
  }
  #xSpW6Io4S4SQ83cB code→add_route("POST", "admin", "reindexscripts", $handler5);
  #xddJCeGp7gWrym0Z where handler5(req: * api_request) {
    #jgGfilm43Zbj30zp code→check_permission($req, "operator");
    #IhyFC5l78L2X9XP6 if $req→status = 200 then {
      #WMiwpPPD8FtyGeJA `async` data→scripts→get_index("all")→for_all_batched("all", 50, $process);
      #xvO7wKAHjujfnChU where process(json: Json_Object) {
        #x4kL9seyQXjqFTe5 @\u267b→parallel→for_json($json, $@action);
        #Qrliyh0xnUgBo7TE where @action(json: Json_Object) {
          #TFlOAlA0KMzFQS2W $pub := $json→field("pub");
          #xWPFSa0Yy7wZH4k6 $r := code→or_false($pub→boolean("noexternallinks"));
          #Fh3tkik6x6lvka4n if `not` $r then {
            #s2HOx2UeElp2DLnj $userjson := code→get_pub($pub→string("userid"), "user");
            #dnr2XvW4yXWW3P79 if `not` code→has_permission($userjson, "external-links") then {
              #D46m3JGme48uIfWU data→logger→debug("noexternallink -> true on " ∥ $json→string("id"));
              #xJr4LSawse80Ilj1 data→scripts→container→update($json→string("id"), $update);
              #x2x2hnITH1zUL6b6 where update(entry: Json_Builder) {
                #Z8RqBVK4ySSHX2s0 $entry→field("pub")→set_boolean("noexternallinks", true);
              }
            }
          }
        }
      }
      #M8sNfjVWfMwrV32r $req→response := web→json("{}");
    }
  }
  meta private;
}
#DpMNVR61bgwhLw64
action \_init_comments() {
  #xmqgXh4nJ7aRDdPe data→comments := @\u267b→indexed_store→create_store(data→pubs_container, "comment");
  #Q9m31ikm2M2OTt8k data→comments→set_resolve($resolution_callback2);
  #UGvnS9FitPqnpeLV where by_userid := true;
  #ipR2XuhRgXIgCija where by_publicationid := true;
  #oPAy7sGwJU5hAPFU where resolution_callback2(fetch_result: ♻ indexed_store → fetch_result, api_request: * api_request) {
    #qwlAW77FG2m6DrHt code→resolve_comments($fetch_result);
  }
  #diCuHWuZSgOnxxNd code→add_route("POST", "*pub", "comments", $handler2);
  #x8ab8vs6LPKIyhDR where handler2(req: * api_request) {
    #PHO2hwvkPiKxo6ul code→can_post($req, "comment");
    #pMc2tzvbygxir0e0 if $req→status = 200 then {
      #kuNABTz4SML97pEb code→post_comment($req);
    }
  }
  #aNkj43O2a39t4Q3I code→add_route("GET", "*pub", "comments", $handler);
  #rB6if2da7v21eikZ where handler(req: * api_request) {
    #xv2cRfVUBWQCw77c if $req→status = 200 then {
      #xMd21XR8Bx3Z2jXa // optimize the no-comments case
      #nQPpt7KN1lbxj0UO if code→or_zero($req→root_pub→field("pub")→number("comments")) = 0 then {
        #ImHzsO9XDzqXAIJc $req→response := web→json("{\"continuation\":\"\",\"items\":[],\"kind\":\"list\"}");
      }
      else {
        #J9j7hpSWJW7b3tg6 data→comments→any_list($req, "publicationid", $req→root_id);
      }
    }
  }
  meta private;
}
#xzo6qtSYZSR1XREn
action \_init_groups() {
  #RyfqShEkvRv2hLQo data→groups := @\u267b→indexed_store→create_store(data→pubs_container, "group");
  #dE4aMg3TkLldavSD data→groups→set_resolve($resolution_callback2);
  #osOssrPuKAwXXxEL where by_userid := true;
  #JoyAhp4ZRYH2KVX4 where resolution_callback2(fetch_result: ♻ indexed_store → fetch_result, api_request: * api_request) {
    #uXu5wNtuQk33QUo7 $has_global_list := code→caller_has_permission($api_request, "global-list");
    #vTq8hImvNvE0NulS if `not` $has_global_list `and` $api_request→userid→is_empty then {
      #F2R3tv9e64xJnkSZ $fetch_result→items := web→json("[]");
      #hDwXa1Ogdbyj9GaG `return` ;
    }
    #pV09OFi2zDweVfhW code→add_username_etc($fetch_result);
    #iFuliTopuLDU2w0y $coll := create→Collection_of→\u2339pub_group;
    #XbjlixGiXAjenFez $grps := $api_request→userinfo→json→field("groups");
    #QtxTfrR2AJtVyK4e foreach jsb in $fetch_result→items
    do {
      #z6LCZtOEychim6vo $grp := records→pub_group→create_from_json($jsb→field("pub"));
      #enoJ62ZwhPeLbhP6 if `not` $has_global_list `and` $grp→isclass `and` `not` $grps→contains_key($grp→id) `and` `not` code→with_default($api_request→query_options→string("code"), "none")→equals(code→or_empty($jsb→string("code"))) then {
        #m504fFT38PbL7Zh5 // skip, no permission
      }
      else {
        #TkNfnXky441c69eh $coll→add($grp);
      }
    }
    #ZWd7LsKQLAh70ybS $fetch_result→items := $coll→to_json;
  }
  #xdFsTi8h2wNJ4kjJ code→add_route("POST", "groups", "", $handler);
  #j6cfZmUq2H92KWts where handler(req: * api_request) {
    #mgqEUT462ytc874B code→can_post($req, "group");
    #X4XBOGU0kDphO4ee if $req→status = 200 then {
      #dEn0E21uxt4WUn4o $js2 := $req→userinfo→json→field("settings");
      #sHaym2SdBHvq2UfS if `not` $js2→boolean("emailverified") then {
        #fSuzN2wrNh1Wu49n $req→status := @\u267b→restify→http→@405_Method_Not_Allowed;
      }
    }
    #gNA8vzCl4rbTtlLD if $req→status = 200 then {
      #xVl1QAb1TK0nV6wt $body := $req→body;
      #Ae5w6tyUJFy8tP4f $group := records→pub_group→create;
      #iWGQT48H8egarwml $group→name := code→with_default($body→string("name"), "unnamed");
      #M2ehPz2nuI04CSD4 $group→isclass := code→or_false($body→boolean("isclass"));
      #GqYVXU6eN8fr1UD2 code→set_group_props($group, $body);
      #xFGGfNmtHjeL4zsg $group→userid := $req→userid;
      #BDxiP2O2NNqH4mR9 $group→userplatform := code→get_user_platforms($req);
      #BGtr2AW4eMlQo9a4 $group→isrestricted := true;
      #LCDjKxmZt7Zjl6P8 $jsb := web→create_json_builder;
      #tkgA8886YTBQJdh0 $jsb→set_field("pub", $group→to_json);
      #lFF2X5zgZtdmEktS code→generate_id($jsb, 8);
      #qkmK3pzS36Ewff71 data→groups→insert($jsb);
      #BZdStTVjh0wRS9zO code→audit_log($req, "create-group");
      #bBTDoCiCLo3uU0Ut where subjectid := $req→userid;
      #PfwEFR5FRdiYksxo where publicationid := $jsb→string("id");
      #WDB40Sk5VhaUzImu where publicationkind := "group";
      #Fw538nYEWBNGOvgQ where newvalue := $jsb→to_json;
      #m4zbK3C8fx7c4fTH code→add_user_to_group($group→userid, $jsb→to_json, records→api_request→invalid);
      #jY4GC1MsvIO24uhH code→store_notifications($req, $jsb, "");
      #zJnEhIIUT3QiQJl6 code→scan_and_search($jsb);
      #LK0ywGi1Z4lVkFPR // re-fetch user to include new permission
      #luYHamYkVmTEDQj5 code→set_req_user_id($req, $req→userid);
      #xaX762VNAJpBNb4Q data→groups→return_one_pub($jsb→to_json, $req);
    }
  }
  #TlWWnIkjt21hO94v code→add_route("POST", "*group", "", $handler);
  #xNcYIExLZHfBBWhE where handler(req: * api_request) {
    #v8U4FyFr40SuSYk5 code→check_group_permission($req);
    #x2LMnGi9cIrs13RG if $req→status = 200 then {
      #MUbRA360yAoZ2sVB $needs_reindex := false;
      #VgcNTCYUDqeBuwcX $user := code→or_empty($req→body→string("userid"));
      #j2Dj05jMySzqDKk2 if $user→equals($req→root_pub→field("pub")→string("userid")) then {
        #gj7QK7kvALzksUcT $user := "";
      }
      #K058f2ti9coIitek if `not` $user→is_empty then {
        #SlblTYlcgn7cj0LR $new_owner := code→get_pub($user, "user");
        #uV3AhfGutX4W0mt8 if $new_owner→is_invalid `or` `not` code→has_permission($new_owner, "post-group") `or` `not` $new_owner→field("groups")→contains_key($req→root_id) then {
          #xPNShdbmu9v2S6Ak $req→status := @\u267b→restify→http→@412_Precondition_Failed;
          #TIvk4cIHQWWOwiSo `return` ;
        }
        #U6jKDshC1457oFr3 data→groups→reindex($req→root_id, $update10);
        #E9TXbGzE0kd5RMP6 where update10(v: Json_Builder) {
          #xOOy0QvSpVHVnANp $v→field("pub")→set_string("userid", $user);
        }
        #xtqKZ8uNYQobnTuI code→reindex_groups($new_owner);
        #z2r2TCCpBmUXDrJE code→reindex_groups($req→userinfo→json);
      }
      #OPKR5olTkPBWoj3R data→pubs_container→update_and_upsert($req, $update5);
      #GO0bQNzk9aQ7lLfJ where update5(entry: Json_Builder) {
        #Z97eI6dqaf17cJ6O $group := records→pub_group→create_from_json($entry→field("pub")→to_json);
        #I7vqOLDc3OMqElLx code→set_group_props($group, $req→body);
        #EdQiZWUEpltt0BZZ $entry→set_field("pub", $group→to_json);
      }
      #D25xCwt1pnhjwi4A $req→response := web→json("{}");
    }
  }
  #xF51IDwGBCopgL4b code→add_route("GET", "*group", "code", $handler2);
  #Hgo4KPjMm9KE1ROw where handler2(req: * api_request) {
    #lI2Rf0D3AGmOjzxh code→check_group_permission($req);
    #xYocXWzqQo2E9kyG if $req→status = 200 then {
      #CaPFj2AEBCEL9dbV $s := code→or_empty($req→root_pub→string("code"));
      #xk9CTDo5he2NPiMr $jsb2 := web→create_json_builder;
      #AYK4waPplSqRkFjG $jsb2→set_string("code", $s);
      #EWLkTi1oG54sQkr7 $jsb2→set_number("expiration", code→now_seconds + 365 * 24 * 3600);
      #aZh28w4lIxHpMiWD $req→response := $jsb2→to_json;
    }
  }
  #KFXuApEVxWcdZd2E code→add_route("GET", "*user", "code", $handler4);
  #hrgRs2q2iJF9Ze4h where handler4(req: * api_request) {
    #TRw4rsqp4q8OxqTO $pass_id := code→normalize_and_hash($req→argument);
    #dEknK7n6z3KNuTn6 $code_obj := data→passcodes_container→get($pass_id);
    #KsfOfpUKRfM9H4kZ if $code_obj→is_invalid `or` $code_obj→string("kind")→equals("reserved") then {
      #f1Q4NA4IfX4omODZ $req→status := @\u267b→restify→http→@404_Not_Found;
    }
    else {
      #aFR5OcJBqoEQ0SC5 $kind := $code_obj→string("kind");
      #NC022Z3G3xIduYBt $jsb3 := web→create_json_builder;
      #xZpTGBc1NBSsG103 if $kind→equals("userpointer") then {
        #VFw2qSDVzQdrz9FP skip;
      }
      else { #PnIHErd50jnZSITL if $kind→equals("activationcode") then {
        #iB8266j12qexht88 if $code_obj→number("credit") ≤ 0 then {
          #xrtww17DqAyN4V3u $jsb3→set_string("verb", "SpentActivationCode");
        }
        else {
          #xpaJshYv8gguWvJ4 $jsb3→set_string("verb", "ActivationCode");
          #xqn3SpzJr7klaUIM $crd := $code_obj→number("singlecredit");
          #RL5epd2NPGx8zyFo if `not` $crd→is_invalid `and` $code_obj→number("orig_credit") ≠ $crd then {
            #moIRQXfAelKar2YT $jsb3→set_string("verb", "MultiActivationCode");
          }
          #l2MA1w3La16Usbi9 $jsb3→set_string("permissions", code→or_empty($code_obj→string("permissions")));
          #xKhBI3co53tqlBvH $jsb3→set_number("credit", code→or_zero($code_obj→number("singlecredit")));
        }
      }
      else { #ejN9rUiB9Ug86NZG if $kind→equals("groupinvitation") then {
        #eSk2g3CxAK6ppcdY $jsb3→set_string("verb", "JoinGroup");
        #KOS2dkJkwMp2bBb8 $jsb3→set_string("data", $code_obj→string("groupid"));
      }
      else { } } } 
      #xgSeH9wUsPD01z3h if $jsb3→contains_key("verb") then {
        #SVMW2K17rAJtLg9u $req→response := $jsb3→to_json;
      }
      else {
        #VgdgEJqayvNSdK4l $req→status := @\u267b→restify→http→@404_Not_Found;
      }
    }
  }
  #Avg23URJuK8qS1H0 code→add_route("GET", "*group", "approvals", $handler6);
  #xlO30PjcTqs0yB65 where handler6(req: * api_request) {
    #vg3SedJCHht4JHiW code→check_group_permission($req);
    #X1NjLzqJyHD37r67 if $req→status = 200 then {
      #x5l4IpOrWH3Tzq0c $js := $req→root_pub→field("approvals");
      #vWM84hghZkzqHF1f if $js→is_invalid then {
        #sLqe2K0o4cQ7ymzU $js := web→json("[]");
      }
      #aVslbIINd8B4PBK5 $req→response := $js;
    }
  }
  #ya3eQXofXxsdPPfy code→add_route("POST", "*user", "code", $handler4);
  #xirC492fBYSJFj45 where handler4(req: * api_request) {
    #Cefk7uZc1AM4uE7I code→me_only($req);
    #sJTKBiRsYGptFuEk if $req→status = 200 then {
      #Ax26pIjkr2IthTSb $pass_id := code→normalize_and_hash($req→argument);
      #dYipgZmWclZ2OlIz $code_obj := data→passcodes_container→get($pass_id);
      #gIC97tXDdTLUkQo9 if $code_obj→is_invalid `or` $code_obj→string("kind")→equals("reserved") then {
        #rm6o6cWgvW2LbWBj $req→status := 404;
      }
      else {
        #E815aUy219YZGEaJ $kind := $code_obj→string("kind");
        #xrOZGc9bMnS2sLoi $jsb3 := web→create_json_builder;
        #rqSikeu45ZU2YGCM if $kind→equals("userpointer") then {
          #X08a89t36kCDpSAD $req→status := 404;
        }
        else { #xJ9nmFChFXjx1oVn if $kind→equals("activationcode") then {
          #FiIeYsCk6LXt1E68 $crd := $code_obj→number("singlecredit");
          #YnbDukZG4Oh5lfod if `not` $crd→is_invalid `and` $code_obj→number("orig_credit") ≠ $crd then {
            #CNIh9oFim5AvN4iT $req→status := @\u267b→restify→http→@409_Conflict;
          }
          else { #WvnO412uL1isCAV9 if $code_obj→number("credit") > 0 then {
            #YktTgw4g0BD9ZfTl code→apply_code($req→root_pub, $code_obj, $pass_id, $req);
            #wXWAcEpUMv34sum2 $req→response := web→json("{}");
          }
          else {
            #fspgKJPXqdVzqTtA $req→status := @\u267b→restify→http→@409_Conflict;
          }
          } 
        }
        else { #fSo1JmqcovKL9Bip if $kind→equals("groupinvitation") then {
          #fEgT4Ku0RcEnSEjg $group_json := code→get_pub($code_obj→string("groupid"), "group");
          #aNR6WhBIMVu5A4HB if $group_json→is_invalid then {
            #x6kIZFKqQoAXrwaF $req→status := 404;
          }
          else {
            #Cg8EdM52IYpxQyjp $grp := records→pub_group→create_from_json($group_json→field("pub"));
            #FltadCbiZeKgcLjY if $grp→isclass then {
              #C2zMlKRFvXyVGDRL code→add_group_approval($group_json, $req→root_pub);
              #i4ogyt9T5eaMM8Np $req→response := web→json("{ \"status\": \"waiting\" }");
            }
            else {
              #dWY99p1UwxiPXWDe code→add_user_to_group($req→root_id, $group_json, $req);
              #XqbrqthqlE4kIE5q $req→response := web→json("{ \"status\": \"joined\" }");
            }
          }
        }
        else { } } } 
      }
    }
  }
  #rtFnYWl24Emlg6lq code→add_route("POST", "*group", "code", $handler2);
  #q4JmxJmr2Ul3NWby where handler2(req: * api_request) {
    #TwF0SU2oml1DEUe8 code→check_group_permission($req);
    #zwKshntcXAv8YVkL if $req→status = 200 then {
      #fKYW1wCLdbpNY12H $gr_code := code→or_empty($req→root_pub→string("code"));
      #xwNnJAT48DNrIabW if `not` $gr_code→is_empty then {
        #xXAYrmmz8L46xsaA data→passcodes_container→update(code→normalize_and_hash($gr_code), $update);
        #cGQ7fKqPoZHIfHJE where update(entry: Json_Builder) {
          #bUb4av1pBXs1N2Sb $entry→set_string("kind", "reserved");
        }
      }
      #ibHg4653d4OAnNpH $num_code := "";
      #XEPqDGFLdgbBM6JG for 0 ≤ i < 12 do {
        #qm4YjpZyAbplzlgc if false then {
          #xhJ455NHjUwfgFog if $i > 0 `and` math→mod($i, 4) = 0 then {
            #nvYXCrbWwdvU274g $num_code := $num_code ∥ " ";
          }
        }
        #e4KfLvuIThmDhc9e $num_code := $num_code ∥ math→random_range(0, 9);
      }
      #rLVb3RcWyhiY0KHN $gr_code := $num_code;
      #WEPlHc7r7l32c2v9 $hashed := code→normalize_and_hash($gr_code);
      #wgcrRfeHnrcaJq9M data→passcodes_container→update($hashed, $update3);
      #r65a3BIRn2yyyzLF where update3(entry: Json_Builder) {
        #qsNiChXL4DSR7ysy $entry→set_string("kind", "groupinvitation");
        #q0FqxQ7HOQfiZCie $entry→set_string("groupid", $req→root_id);
        #QvXR60MczT2n2JUj $entry→set_number("time", code→now_seconds);
      }
      #vWibVe8QWokDUolW data→pubs_container→update($req→root_id, $update4);
      #njbFb08QADud4q3w where update4(entry: Json_Builder) {
        #GeZbdVy4GAOE6wkd $entry→set_string("code", $gr_code);
      }
      #rKH4VmLBV9K3GY5p $req→response := web→json("{}");
    }
  }
  #xw6MLYgt79onup4e code→add_route("DELETE", "*group", "code", $handler2);
  #bJPPwvMpVxKB4fgZ where handler2(req: * api_request) {
    #He4wvm4VYV2lKoy6 code→check_group_permission($req);
    #iZa3gnY4PY0U25S1 if $req→status = 200 then {
      #x9o41N8x2H5ZA7OG $s := code→normalize_and_hash($req→root_pub→string("code"));
      #fbBznNc1C2rrH2Z2 if $s→is_empty then {
        #yBiHXXzTUlmryPH0 $req→status := 404;
      }
      else {
        #VfIqzOsx4ZswMJt3 data→passcodes_container→update($s, $update);
        #wGBP6Xh72ffOxDJc where update(entry: Json_Builder) {
          #xvqcwAEwzSz35Uaw $entry→set_string("kind", "reserved");
        }
        #CFhgPL04crz80nvY data→pubs_container→update($req→root_id, $update2);
        #y3mCfgBbxHmCyEdm where update2(entry: Json_Builder) {
          #Bk0sVsQflkLol7gV $entry→remove_field("code");
        }
        #xH4ImdRbASAzdOs2 $req→response := web→json("{}");
      }
    }
  }
  #x1B3Es5sdE7RXjcf data→group_memberships := @\u267b→indexed_store→create_store(data→pubs_container, "groupmembership");
  #mPT5bmAiduPVEWiL data→group_memberships→set_resolve($resolution_callback2);
  #Qpiroyd9mNrNA8Bq where resolution_callback2(fetch_result: ♻ indexed_store → fetch_result, api_request: * api_request) {
    #CZ64uiz0FW5yP1zl if $api_request→userid→is_empty then {
      #jGOYHPeI5z0uA19N $fetch_result→items := web→json("[]");
      #UTtII0tLS4PKlNpV `return` ;
    }
    #qabdecFhQRj2v0Ya $grps := $api_request→userinfo→json→field("groups");
    #xsogYdkOaQm1wu2N $has_global_list := code→caller_has_permission($api_request, "global-list");
    #KCFekz23KLWksxHl skip;
    #x1CfVjT7yFVEo7RH $field := "publicationid";
    #X2JeXZ61CFCo6HvG $store := data→groups;
    #x24IXgmx4u4G0oMg if $api_request→verb→equals("users") then {
      #LpTpbyxWCxMYACjG $field := "userid";
      #W7L2aczahf2Vw59A $store := data→users;
    }
    #RxsIZ71Aw7IaGOkW if `not` $has_global_list then {
      #gI9E7MwJgWjP2MAb $fetch_result→items := $fetch_result→items→to_collection→@where( `fun:elt` $grps→contains_key($elt→field("pub")→string("publicationid")))→to_json;
    }
    #xppmrCyorJ2jUULU $pubs := code→follow_pub_ids($fetch_result→items, $field, $store→kind);
    #ESAF0RWBYFb3ZRGK $fetch_result→items := $pubs→to_json;
    #J8E4KhsM1k3CTaGw records→store_decorator→at($store)→resolve→run($fetch_result, $api_request);
  }
  #O3aCtfcl3JpGmhFw data→group_memberships→create_index("userid", `fun:entry` $entry→field("pub")→string("userid"));
  #YWcBjZU0LsudiTe8 code→add_route("POST", "admin", "reindexgroups", $handler5);
  #xFnWVUh0wM2nOxlu where handler5(req: * api_request) {
    #p5f8VjvXB4AAw8tU code→check_permission($req, "operator");
    #Zpw3SdpMAuCfg5iL if $req→status = 200 then {
      #xb0A1zmB4PmQLdS4 `async` data→users→get_index("all")→for_all_batched("all", 20, $process);
      #wdfOCj8VXuHL294F where process(json: Json_Object) {
        #q0r7vxKeNXGFymPz @\u267b→parallel→for_json($json, $@action);
        #a2hANa8k0Aa5Xdkg where @action(json: Json_Object) {
          #o7Ie2JYhOxadNtRF code→reindex_groups($json);
        }
      }
      #QJ6oBZZKeDudtylH $req→response := web→json("{}");
    }
  }
  #SV8xRKKGwIMjdk0h code→add_route("GET", "*user", "groups", $handler3);
  #YlOtBCPN2sp4G82J where handler3(req: * api_request) {
    #xM4mHWVI2p8OMrFA if $req→argument→is_empty then {
      #xhClc4CycSB6oWUe data→group_memberships→any_list($req, "userid", $req→root_id);
    }
    else {
      #pb34xCWkoTdrz4TM $entry2 := code→get_pub($req→argument, "group");
      #vYQfeRgtD1j1cy44 if $entry2→is_invalid then {
        #xgSps67pU2y4ekR5 $req→status := 404;
      }
      else {
        #xqj444b2C94gjqnA $s2 := "gm-" ∥ $req→root_id ∥ "-" ∥ $entry2→string("id");
        #EvTfl4YIWyg6HnhQ $entry3 := code→get_pub($s2, "groupmembership");
        #rUsLgkEhxHvf99SA if $entry3→is_invalid then {
          #Ga4dZ7WH4Qm2jWvf $req→status := 404;
        }
        else {
          #cyyzxYLvt2RTd7wh data→group_memberships→return_one_pub($entry3, $req);
        }
      }
    }
  }
  #zk5K52uSFqY0nfRk code→add_route("POST", "*user", "groups", $handler3);
  #pXztltxgd4lF5hnN where handler3(req: * api_request) {
    #xHP59FlhaUFkcxn1 $entry2 := code→get_pub($req→argument, "group");
    #gyv8tLA6ejgaKmRB if $entry2→is_invalid then {
      #w22FF4tv1QKNe63Y $req→status := 404;
    }
    else {
      #b9IjgcX1GIYprqG8 $gr := records→pub_group→create_from_json($entry2→field("pub"));
      #xkCu43rYDdze7jtT $asked_to_join := code→json_array_index_of($entry2→field("approvals"), $req→root_id) ≥ 0;
      #cW8qU7wPLdE9zTPu if $asked_to_join `and` $gr→isclass `and` code→with_default($gr→userid, "???")→equals($req→userid) then {
        #d9i8oUSCodEmODQB // OK, this is an approval.
        #xK06DFlmj6QO4qJj if code→or_false($req→root_pub→boolean("awaiting")) then {
          #uiPlQzOhbqOdodAd code→audit_log($req, "approve-user");
          #IBP2ylvT50sQ9K4D where subjectid := $req→root_id;
          #xq0Q6mEZ2Tj1EPUV where publicationid := $gr→id;
          #xKk8IesMOPN4JZwh where publicationkind := "group";
          #fo06wYMYYpb8iF5z data→pubs_container→update($req→root_id, $update7);
          #sTlOu2UP49OJ2d5Y where update7(entry: Json_Builder) {
            #xM1dA4TCEgd4Y04z $entry→remove_field("awaiting");
          }
        }
        #KMIz6LARmWZCIcUD data→pubs_container→update($gr→id, $update9);
        #xDZTa7MP81inqLPf where update9(entry: Json_Builder) {
          #GVulOiOOeGLHixUM $jsb4 := $entry→field("approvals");
          #x4mhmBR3GDv7t2gQ $idx := code→json_array_index_of($jsb4→to_json, $req→root_id);
          #R4zu1aGhauWZ93eP if $idx ≥ 0 then {
            #ptlClCPz2SQD122N $jsb4→remove_at($idx);
          }
        }
        #xM2TzTxZDuTrrOpB code→send_notification($entry2, "groupapproved", $req→root_pub);
      }
      else {
        #nEO294IUSIRZBFKn code→me_only($req);
        #xGZH558K1HQeLs4g if $gr→isrestricted then {
          #iwQ1ZFf34LPJrtHy code→check_permission($req, "user-mgmt");
        }
      }
      #jcO0lnWENIT6gIc8 if $req→status = 200 then {
        #x6m89IY2M4AwlSk2 code→add_user_to_group($req→root_id, $entry2, $req);
        #ciiZUkBSOTL8v1e8 $req→response := web→json("{}");
      }
    }
  }
  #bEX1u6lsW6FvOrD8 code→add_route("DELETE", "*user", "groups", $handler3);
  #MkaH68or7gRNG5iE where handler3(req: * api_request) {
    #erAjuw4rH7fNixlG $entry2 := code→get_pub($req→argument, "group");
    #ni92lyXnP4FvrW39 if $entry2→is_invalid then {
      #xKQWWHps4ALApnGb $req→status := 404;
    }
    else {
      #BetaGy04BrHE3VBI $grid := $entry2→string("id");
      #m4lVRoLlmQ0GinkQ code→me_only($req);
      #bbU4BrS40nU6QlkY if $req→status = 200 `and` $req→root_id→equals($entry2→field("pub")→string("userid")) then {
        #xNMvEdzC7VVBhltf // Cannot remove self from the group.
        #Ss6IlLSh9IOPf931 $req→status := @\u267b→restify→http→@412_Precondition_Failed;
      }
      #b2mgh3uFnFiuGgGr if $req→status = 200 then {
        #Tjg4GhHEMfU3tVjW $memid := "gm-" ∥ $req→root_id ∥ "-" ∥ $grid;
        #xvXqXru5MTUOnhnV $entry4 := code→get_pub($memid, "groupmembership");
        #xwof4ucr5bWkYWKh if $entry4→is_invalid then {
          #KcmfiuHP8Ve2Yt6a $req→status := 404;
        }
        else {
          #HIOqfmnGhi2EWgEX $delok := code→delete($entry4);
          #tPvLqD12Fft22yW0 data→pubs_container→update($req→root_id, $update6);
          #sa3W203QCOS093Bl where update6(entry: Json_Builder) {
            #jrcsKrLsjy2kZvkd code→set_builder_if_missing($entry, "groups")→remove_field($grid);
          }
          #FABuxk7q4IihZ940 code→audit_log($req, "leave-group");
          #FCBVwLGY42O3g7wf where subjectid := $req→root_id;
          #L0i0q9JqE7qq49rY where publicationid := $grid;
          #wQLO0IZn2ZNCLGlx where publicationkind := "group";
          #Q2bBVXzNWulla5vC $req→response := web→json("{}");
        }
      }
    }
  }
  #l8rvogRi2lz5tbUo data→group_memberships→create_index("publicationid", `fun:entry` $entry→field("pub")→string("publicationid"));
  #RzQkb1eq2nh9PXtq code→add_route("GET", "*group", "users", $handler3);
  #fFAQE482L1vc6hkx where handler3(req: * api_request) {
    #NMTnJ4THRWSnW49L data→group_memberships→any_list($req, "publicationid", $req→root_id);
  }
  meta private;
}
#So4RiXXDRG10c548
action \_init_tags() {
  #zw5F5D5oAn4Dxdmb data→tags2 := @\u267b→indexed_store→create_store(data→pubs_container, "tag");
  #pqBmedKOixZq2ibM data→tags2→set_resolve($resolution_callback2);
  #xyPYNsUY5jLjZjT2 where resolution_callback2(fetch_result: ♻ indexed_store → fetch_result, api_request: * api_request) {
    #Sz2xNb0MbgkK1gPW code→resolve_tags($fetch_result);
  }
  #nOx4K2Lf0VYVZMkU code→add_route("GET", "*script", "tags", $handler);
  #QnQB2gJ1ln3BFCNs where handler(req: * api_request) {
    #iV6Ydwg06s7dYklg $req→response := web→json("{ \"items\": [] }");
  }
  meta private;
}
#toGibKikuMGlOe0C
action \_init_art() {
  #Ibp70tO5iLKSge2z data→art_content_types := web→json("{ \n  \"image/jpeg\": \"jpg\",\n  \"image/png\": \"png\",\n  \"image/svg+xml\": \"svg\",\n  \"audio/wav\": \"wav\",\n  \"text/css\": \"css\",\n  \"application/javascript\": \"js\",\n  \"text/plain\": \"txt\",\n  \"application/pdf\": \"pdf\",\n  \"application/vnd.openxmlformats-officedocument.wordprocessingml.document\": \"docx\",\n  \"video/mp4\": \"mp4\",\n  \"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet\": \"xlsx\",\n  \"application/vnd.openxmlformats-officedocument.presentationml.presentation\": \"pptx\"\n}\n");
  #GYgEhN5Nv3hf4yd5 data→arts := @\u267b→indexed_store→create_store(data→pubs_container, "art");
  #k3rb14OkasTARn7b data→arts→set_resolve($resolution_callback2);
  #aqcMmO00NDUUY4wP where by_userid := true;
  #xGnvme83IcHS41PQ where anon_search := true;
  #lXLtKvsBJFAnRTt2 where resolution_callback2(fetch_result: ♻ indexed_store → fetch_result, api_request: * api_request) {
    #xxKRBSQ4rOFvf4Zt code→resolve_art($fetch_result, $api_request);
  }
  #QhYhfAg6HizCS1Fa code→add_route("POST", "art", "", $handler2);
  #ZcNj2J4GonzJnKeW where size_check_excludes := "content";
  #CPSpLGpMwZdbnMs2 where handler2(req: * api_request) {
    #U0VngiLRxC92d6IY code→post_art($req);
  }
  #Ky4vA2MS21a0MVLV code→add_route("GET", "*script", "art", $handler);
  #XlHD8D5VHrAqwICB where handler(req: * api_request) {
    #xxGu34RWC702fia5 // TODO implement /<scriptid>/art
    #ODQFwBgR2FDciy7Q $req→response := web→json("{ \"items\": [] }");
  }
  #PDb88EkzOmDXLrrS data→arts→create_index("filehash", `fun:entry` code→or_empty($entry→field("pub")→string("filehash")));
  #xIDczxjFuiPkQB75 code→add_route("GET", "arthash", "*", $handler);
  #xIiNW1rMiU3Iw3SC where handler(req: * api_request) {
    #ZSSwWLNLPXcdpPMg data→arts→any_list($req, "filehash", $req→verb);
  }
  meta private;
}
#Mi30Yl4xoSTOn4Rw
action \_init_screenshots() {
  #mBJYI0SRSdQ8Kv54 data→screenshots := @\u267b→indexed_store→create_store(data→pubs_container, "screenshot");
  #RYFkOxELLEwp2rHt data→screenshots→set_resolve($resolution_callback2);
  #ZHt5Zhq9Kqhd49zr where by_userid := true;
  #xNv4qcoGvTvWv1tx where by_publicationid := true;
  #g1BW4WiQgYpnlMfG where resolution_callback2(fetch_result: ♻ indexed_store → fetch_result, api_request: * api_request) {
    #LRrTStjg2tZrAiOP code→resolve_screenshot($fetch_result, $api_request);
  }
  #wruZq8E8ojXoESGe code→add_route("POST", "screenshots", "", $handler2);
  #BvUWB76Ww4rE6zE8 where size_check_excludes := "content";
  #xswQd0XF2Aye484w where handler2(req: * api_request) {
    #iiQ6iVhI81wBnNhL code→can_post($req, "screenshot");
    #mN2fvn5T2iEUr4dA if $req→status = 200 then {
      #xDgXeLXMGAhNRn4O code→post_screenshot($req);
    }
  }
  meta private;
}
#eXKqPmF6sfj5e4D3
action \_init_reviews() {
  #QqPmp63QAeyhDdGX data→reviews := @\u267b→indexed_store→create_store(data→pubs_container, "review");
  #B4PgnMOwvZA03dvy data→reviews→set_resolve($resolution_callback2);
  #xblzE26laWcrcLp7 where by_userid := true;
  #L32ULVhPLjhGDphD where resolution_callback2(fetch_result: ♻ indexed_store → fetch_result, api_request: * api_request) {
    #QvzKf88ubR40FohC code→resolve_reviews($fetch_result);
  }
  #XlGNQ4kvTubSxmM7 // ### by parent publication
  #WEpO4tEL2ax9pdF5 data→reviews→create_index("pubid", `fun:entry` $entry→string("pubid"));
  #uN6P5jAjjyF47mry code→add_route("GET", "*pub", "reviews", $handler);
  #kgtf3Vwu4FlkFujB where handler(req: * api_request) {
    #xx9NqQArHJeR4kp1 $id := $req→root_id;
    #T4NzaSylrST4S9wz if $req→root_pub→string("kind")→equals("script") then {
      #xJOL2EgcUbV8ZF2S $id := code→with_default($req→root_pub→string("updateKey"), $id);
    }
    #Su424vWs6jg2V5nC data→reviews→any_list($req, "pubid", $id);
  }
  #F1qnVRtdMetouST2 // ### by author of publication getting heart (not in TD)
  #o6ATaAWT420KA9FE data→reviews→create_index("publicationuserid", `fun:entry` $entry→field("pub")→string("publicationuserid"));
  #xb3s4T0m8nq14b0T code→add_route("GET", "*user", "receivedreviews", $handler);
  #xdtj2wWr804yIopB where handler(req: * api_request) {
    #wTguPeSux40SXg9U data→reviews→any_list($req, "publicationuserid", $req→root_id);
  }
  #LPXzWQzKg8rVEIWY code→add_route("GET", "*user", "reviewed", $handler);
  #P21jTxpXujGdLky0 where handler(req: * api_request) {
    #zVg99Whq1uzdg1oe code→get_user_reviewed($req);
  }
  #bkIGrlTeD7g0D1gb code→add_route("POST", "*pub", "reviews", $handler2);
  #VL6Ka67lktoH6sLB where handler2(req: * api_request) {
    #HVvkJC294m282Dqa code→can_post($req, "review");
    #YFkhIFJ8krRfC90G if $req→status = 200 then {
      #Ai2WeAbJjpTqwMwg code→post_review($req);
    }
  }
  #hjDhSqZJveoTR8Ud code→add_route("DELETE", "*review", "", $handler3);
  #Vuoy5vIGpmfBxr67 where handler3(req: * api_request) {
    #ftPICrEfPTQJLyC4 if code→delete_review($req→root_pub) then {
      #K7azGJ9aWfyIoNOK $req→response := web→json("{}");
    }
    else {
      #lHspyIe5r6RaSbwv $req→status := @\u267b→restify→http→@409_Conflict;
    }
  }
  meta private;
}
#FL0V9dNsgx8iPGkQ
action \_init_users() {
  #xctS2NBeJijR28Is data→users := @\u267b→indexed_store→create_store(data→pubs_container, "user");
  #WNf3Ran8P7FVBnPK data→users→set_resolve($resolution_callback3);
  #BcuCDRGTDxApBR04 where resolution_callback3(fetch_result: ♻ indexed_store → fetch_result, api_request: * api_request) {
    #naTvvZUkCJMoYxM1 code→resolve_users($fetch_result, $api_request);
  }
  #Gj3uiCp02PBz0kro data→users→create_index("seconadaryid", `fun:entry` code→or_empty($entry→string("secondaryid")));
  #xP3PvRtOBa6Rbkbi code→add_route("GET", "secondaryid", "*", $handler5);
  #YSPwPVV4p5SJfvKo where handler5(req: * api_request) {
    #EIDCT1sWkGsAiB5o code→check_permission($req, "user-mgmt");
    #JYDac0aFqLI2pzjC if $req→status = 200 then {
      #uDBNrYieqEhelBv1 data→users→any_list($req, "secondaryid", $req→verb);
    }
  }
  #Q588vuozn2M3go8P // ### all
  #og7HvqR81yTQknzG code→add_route("POST", "*user", "permissions", $handler);
  #xaSe6Jo1S82IqjMx where handler(req: * api_request) {
    #Thnc9pcz9IMVrdhV code→check_mgmt_permission($req, "user-mgmt");
    #vnV8pyLeW72pjNlD if $req→status = 200 then {
      #PrPCOu44u8Tyh1b9 $perm := $req→body→string("permissions");
      #TABniwNE53to14uj if `not` $perm→is_invalid then {
        #kyWYOz04nMjA8fGp $perm := code→normalize_permissions($perm);
        #jyRKnAsbVmi524DY code→check_permission($req, "root");
        #G8oKHt7wZ3AB5Ya4 if $req→status ≠ 200 then {
          #xO3Fr4iOv9HIooma `return` ;
        }
        #xHDMELHRAdPsoz8h code→audit_log($req, "set-perm");
        #vAnd8LcVMTInMRtB where data := $perm;
        #UJJLzXrz3m3X8V4z if code→is_alarming($perm) then {
          #cjLJOtOqafMIadUY code→audit_log($req, "set-perm-high");
          #MVa10dbHm5izEvyC where data := $perm;
        }
        #nuOivSUwzpbCBI2A data→pubs_container→update_and_upsert($req, $update);
        #cWRYFvvFrnKGAELh where update(entry: Json_Builder) {
          #VMPcHRpgHhiveKW9 $entry→set_string("permissions", $perm);
          #A800m90x1FPdS2Vn code→send_permission_notification($req, $entry);
        }
      }
      #rf86T2MmK1Liz75J $credit := $req→body→number("credit");
      #inghCT8qNvb1fCzk if `not` $credit→is_invalid then {
        #yv7TrnALpj85tOSz code→audit_log($req, "set-credit");
        #RNFbn4OVyY3lkTWK where data := $credit→to_string;
        #uIr6Lh5L3IPRM786 data→pubs_container→update_and_upsert($req, $update);
        #QYwO4ApCkT0xW9uy where update(entry: Json_Builder) {
          #rVNNOHzaspc51mKY $entry→set_number("credit", $credit);
          #Dzqhl72L0jnu08vj $entry→set_number("totalcredit", $credit);
        }
      }
      #xbw9Mw4DndXr4H2B $req→response := web→json("{}");
    }
  }
  #x1QTUQ91IdwOVk47 code→add_route("GET", "*user", "permissions", $handler);
  #o4cUAfBjQ4bNEAf7 where handler(req: * api_request) {
    #xUu4k7dq2H4xmndv code→check_mgmt_permission($req, "user-mgmt");
    #M2Bo1eyOx7Q8fnvo if $req→status = 200 then {
      #vaHLyfa2Om8HJ1EJ $jsb := web→create_json_builder;
      #x9F54hwNhur4sq3A foreach s in "permissions,login" →split(",")
      do {
        #m2h48vpL5776jl9h $jsb→set_string($s, code→or_empty($req→root_pub→string($s)));
      }
      #nDMSeZNEZnJ6AfIA foreach s in "credit,totalcredit,lastlogin" →split(",")
      do {
        #xL4FT0O8bRV4UjFW $jsb→set_number($s, code→or_zero($req→root_pub→number($s)));
      }
      #Xbp51LvvWEyYztwC $req→response := $jsb→to_json;
    }
  }
  #datphYN0IebPQMqL code→add_route("POST", "logout", "", $handler3);
  #a93yntrmBrg7wd6X where handler3(req: * api_request) {
    #DyNEChc1GF46ib1t if `not` $req→userid→is_empty then {
      #NGfKwxkfpIleVIks if $req→body→boolean("everywhere") then {
        #Aa7xHrBSWMYltmAy $entities := data→tokens_table→create_query→partition_key_is($req→userid)→fetch_all;
        #dVcLD2nRxXUNsJPD @\u267b→parallel→@for($entities→count, $@action);
        #lcXWHofljPGkAO40 where @action(x: Number) {
          #x9Qddu9nOqltNXtT $json := $entities→at($x);
          #pTwt6ivLHCGeFFlR // TODO: filter out reason=admin?
          #wGvRpLRNMXBpssVW $token := records→token→create_from_json($json);
          #fNdW6DHpcsXrOxEX data→tokens_table→delete_entity($token→to_json);
          #xTUj4erfKeTbUMAv data→redis_client→setpx("tok:" ∥ code→token_string($token), "", 500);
        }
      }
      else {
        #PZnHiPM5jQuWZiKD data→tokens_table→delete_entity($req→userinfo→token→to_json);
        #WKuULriqzFyZUp1r data→redis_client→setpx("tok:" ∥ code→token_string($req→userinfo→token), "", 500);
      }
      #JwTa3WmPN6MNZQU3 $req→response := web→json("{}");
      #WauLOYwcCImam12m $req→headers := collections→create_string_map;
      #sSyCGhZYKbEY3AhO $s4 := code→wrap_access_token_cookie("logout")→replace_regex("Dec 9999", "Dec 1971");
      #tmAzGADJKGOFJ2ok $req→headers→set_at("Set-Cookie", $s4);
    }
    else {
      #WmanAeXgH89cg3lF $req→status := @\u267b→restify→http→@401_Unauthorized;
    }
  }
  #fkpMVfzBSB4wlpgS // This is for test users for load testing nd doe **system accounts**
  #CSlQk2ibFgmU2kAw code→add_route("POST", "users", "", $handler3);
  #XhNOguyHZFvIrlJE where handler3(req: * api_request) {
    #xcTJjydve2QMw2NP code→check_permission($req, "root");
    #ZFZ482L5icjdeZCE if $req→status = 200 then {
      #qeClWyj22c3U2Oug $opts := $req→body;
      #eX2gg1E6ZAxm2cN5 $pub_user := records→pub_user→create;
      #Q4MT2U8OBR22kD20 $pub_user→name := code→with_default($opts→string("name"), "Dummy" ∥ math→random(100000));
      #mK90FgrUYs0ZXAn9 $pub_user→about := code→with_default($opts→string("about"), "");
      #cjMla2D6YVWVUnJX $pub_user→time := code→now_seconds;
      #x4ztkHmHF823am1f $jsb := web→create_json_builder;
      #xBoZQmXFjZ4aNvde $jsb→set_field("pub", $pub_user→to_json);
      #gs8VbPlv0S4s4WS5 $jsb→set_field("settings", web→json("{}"));
      #YyNS6tdXu7u6LjH3 $jsb→set_string("permissions", ",preview,");
      #RDDlXNFNyEMSVnHW $jsb→set_string("secondaryid", @\u267b→cached_store→fresh_short_id(12));
      #DCA4FaSsawpFInvH if false then {
        #qzatUBUHI9efpdOV $jsb→set_string("password", code→hash_password("", $opts→string("password")));
      }
      #BYAewISmDzXErUE3 code→generate_id($jsb, 4);
      #Ih8ldJo2yh0NXKC6 data→users→insert($jsb);
      #n0y3CgNXRelvS4HX $pass2 := @\u267b→word_password→generate;
      #xjEgxEcsER8X9Gf8 $req→root_id := $jsb→string("id");
      #p9hSLLjg6rgbB3X6 $req→root_pub := $jsb→to_json;
      #FyrFDgLZkqNZY1mW code→set_password($req, $pass2, "");
      #VBTxo4Vt4Sf6lCAR $jsb3 := data→users→resolve_one_pub($req→root_pub, $req)→to_json_builder;
      #MlMguEMNvna41Htu $jsb3→set_string("password", $pass2);
      #xGzsn11jpgjaHzOU $req→response := $jsb3→to_json;
    }
  }
  #XlPcReJIgMU276wb code→add_route("POST", "*user", "addauth", $handler);
  #KswkXESX2CC21Bt3 where handler(req: * api_request) {
    #O8VL09PupDDcMNzs $token_js := $req→userinfo→token;
    #xmyqY1kYTEMFKh8T if `not` code→or_empty($req→body→string("key"))→equals(data→token_secret) then {
      #or2ooFpzUmFpBIMp $req→status := @\u267b→restify→http→@403_Forbidden;
    }
    else { #JZSEz9qQoD89uoKS if $token_js→is_invalid then {
      #SVTCNLVMW4nmhS28 $req→status := @\u267b→restify→http→@404_Not_Found;
    }
    else {
      #IKp9gL226gD4YOeI $s2 := $token_js→reason;
      #e2fNwyPuYFlxo5eY if $s2→starts_with("id/") then {
        #U71ZKS4ihv6gmltw data→passcodes_container→update($s2, $update2);
        #geH9y2NAiacm20u4 where update2(entry: Json_Builder) {
          #HqSo70pvYe6LLLMG $entry→set_string("userid", $req→root_id);
        }
        #QBIJ2S0UH52ak5zX $req→response := web→json("{}");
      }
      else {
        #ZNVAyB629on1fiyS $req→status := @\u267b→restify→http→@400_Bad_Request;
      }
    }
    } 
  }
  #Gi93sKV4Pzj8cmX5 code→add_route("POST", "*user", "swapauth", $handler);
  #ZMLiRO9vJtu8KMFR where handler(req: * api_request) {
    #cY4Xv7taD0OtbiH3 code→check_permission($req, "root");
    #Z41fH2IkiBNTeJym if $req→status ≠ 200 then {
      #I8m1favm2rsyk1Oi `return` ;
    }
    #gb2XQqc4w9oRlRrw if $req→root_id→equals($req→argument) then {
      #r6tnLeAzuO34aXcj $req→status := @\u267b→restify→http→@412_Precondition_Failed;
      #hh2azANiHAkUyC4a `return` ;
    }
    #wBCrposR6FRbsWW5 $other_user := code→get_pub($req→argument, "user");
    #vir45DqFNqbCNp2H if $other_user→is_invalid then {
      #HBBQB3CPCtkvBEzj $req→status := @\u267b→restify→http→@404_Not_Found;
      #x47jWx2tWEfMmAWc `return` ;
    }
    #qGLyMX8DPqUdkUXp $root_pass_id := $req→root_pub→string("login");
    #kOcezCKm1Ab2OHtE $root_pass := data→passcodes_container→get($root_pass_id);
    #x43faYBJLnvjOdtm $other_pass_id := $other_user→string("login");
    #zlUdpmxgKmO7dWMl $other_pass := data→passcodes_container→get($other_pass_id);
    #n5U93DeAi6bDNbLf if $root_pass→is_invalid `or` $other_pass→is_invalid then {
      #AU6uoM2NtRisnwoX $req→status := @\u267b→restify→http→@424_Failed_Dependency;
      #Yb04cf2EwkMIHkxS `return` ;
    }
    #bdixDOqZxpydRJ97 data→passcodes_container→update($root_pass_id, $update4);
    #VovYD6aYNzYiRbzl where update4(entry: Json_Builder) {
      #FCAr7yeY4aPeyuYD $entry→set_string("userid", $other_user→string("id"));
    }
    #UHQrlGrfAYXhrX9G data→passcodes_container→update($other_pass_id, $update4);
    #uz56nh2fHd9lpRs3 where update4(entry: Json_Builder) {
      #z2MALyUG2QaQnm2x $entry→set_string("userid", $req→root_id);
    }
    #j2KyBAAGAv00ZLvh data→pubs_container→update($req→root_id, $update5);
    #J7MdHgqxh8XqTF8l where update5(entry: Json_Builder) {
      #Nlk4zrCbkU4W4L7m $entry→set_string("login", $other_pass_id);
    }
    #DIZU2DnzcpvYOWbS data→pubs_container→update($other_user→string("id"), $update5);
    #gkbEWXEu6gue1Rf3 where update5(entry: Json_Builder) {
      #Kj0kIoY5B4vSt1UQ $entry→set_string("login", $root_pass_id);
    }
    #xz8LA5K30MqnklUi $jsb4 := web→create_json_builder;
    #FoLLlBPdYk7wPtjJ $jsb4→set_field("oldrootpass", $root_pass);
    #Fhh1Bb9B4LjiVkau $jsb4→set_field("oldotherpass", $other_pass);
    #ifBoDTcwH8F2lqyr $req→response := $jsb4→to_json;
  }
  #CgbZKNP9OVSQyBP1 code→add_route("POST", "*user", "token", $handler4);
  #i1Em8qnNx6fZ72mt where handler4(req: * api_request) {
    #LAEMGRN4JVGIjAL6 code→check_permission($req, "signin-" ∥ $req→root_id);
    #tL1ygN0X48VqLViF if $req→status = 200 then {
      #XjlqfUF4pPM5Dl02 $resp := web→create_json_builder;
      #xe4e0mlU7yqVXRW2 $custom_token, $cookie := code→generate_token($req→root_id, "admin", "webapp2");
      #a6Q2XijyPc2zyuOl if `not` $cookie→is_empty then {
        #AclPCkKHvcqXAhY4 if $req→headers→is_invalid then {
          #VqLh1n8J7Qyf74vo $req→headers := collections→create_string_map;
        }
        #kc5h4UPcDwdBsSO0 $req→headers→set_at("Set-Cookie", code→wrap_access_token_cookie($cookie));
      }
      else {
        #M6mfd0am8Cv2MyRD contract→assert(false, "no cookie in token");
      }
      #x6IUVhspwvNOtVPo code→audit_log($req, "signin-as");
      #xkDksMNVkw2j3om0 where data := code→sha256($custom_token)→substring(0, 10);
      #mr2jCSWFhQHfJk6X $resp→set_string("token", $custom_token);
      #z4mfaa4BuFIx2zxD $req→response := $resp→to_json;
    }
  }
  #xEW1p6vktBwEoMD2 code→add_route("DELETE", "*user", "", $handler3);
  #YU8jSHHUbpTbUJiY where handler3(req: * api_request) {
    #KJvf6Y7pGtVH8w7f code→check_delete_permission($req);
    #xYBO7iLsdBFdw83L // Level4 users cannot be deleted; you first have to downgrade their permissions.
    #yvsTFZCuj0haGloJ if $req→status = 200 `and` code→has_permission($req→root_pub, "level4") then {
      #f6p2lxYwE6TMwNiY $req→status := @\u267b→restify→http→@402_Payment_Required;
    }
    #NdnLgL9b4K36DwDz if $req→status = 200 then {
      #a2DFce21D2hRhGmM $res_query := data→install_slots_table→create_query→partition_key_is($req→root_id);
      #qpMl1kUR5CB58IA7 @\u267b→parallel→for_json($res_query→fetch_all, $action2);
      #anvwMG8kcRj8KkSz where action2(json: Json_Object) {
        #n4YPmyn831979fQb code→delete_history($req, $json→string("RowKey"));
      }
      #Oe1wLlm2BGhO3wrp code→delete_all_by_user(data→comments, $req→root_id, $req);
      #xtKLhn6Z0X9R9dwp code→delete_all_by_user(data→arts, $req→root_id, $req);
      #xUZE6UN2Cje6sdXH code→delete_all_by_user(data→scripts, $req→root_id, $req);
      #OgmrYWE2KY4S39Uf code→delete_all_by_user(data→pointers, $req→root_id, $req);
      #KhTnsa6ePrF7lNZH code→delete_all_by_user(data→screenshots, $req→root_id, $req);
      #sfydCB2nk5TZ17v4 code→delete_all_by_user(data→reviews, $req→root_id, $req);
      #JCC9W4w305h4Ceq2 // TODO We leave groups alone - rethink.
      #iOkuwhNZyuCE3VqA // Bugs, releases, etc just stay
      #NwjNxcTqhOoEx94P $delok := code→delete($req→root_pub);
      #w4pz22ssu2tQyGiT code→audit_log($req, "delete");
      #V7OP1xAsrG0D2KAz where oldvalue := $req→root_pub;
      #ORW3c5spZuGjS5Oe $req→response := web→json("{ \"msg\": \"have a nice life\" }");
    }
  }
  #j5P6irVI0q4x25sA code→add_route("GET", "*user", "resetpassword", $handler3);
  #DlF4sYH9L0OWHmoI where handler3(req: * api_request) {
    #HBAcpdFXKuWJHd4u code→check_facilitator_permission($req, $req→root_id);
    #ujMVLiBfxJzNWm0d if $req→status = 200 then {
      #xOGH4zvay47rm4Cw $jsb2 := web→create_json_builder;
      #Tlg10nA5NHcxxqW3 $coll2 := math→range(0, 10)→map_to→String( `fun:elt` @\u267b→word_password→generate);
      #tnzB92TG5NlW4DzM $jsb2→set_field("passwords", $coll2→to_json);
      #BPqmk7iWnsgIaoWq $req→response := $jsb2→to_json;
    }
  }
  #x9Yq9MnGab4EjOYh code→add_route("POST", "*user", "resetpassword", $handler3);
  #yRxqIPP4CIrXcoLC where handler3(req: * api_request) {
    #WOmAr8Vi0hS3298m code→check_facilitator_permission($req, $req→root_id);
    #HYq82WA7T8g4GKxx if $req→status = 200 then {
      #BraDyk8mebhJpU7L $pass := code→or_empty($req→body→string("password"));
      #ziKLgkE0Z1AR2wbG $prev_pass := code→or_empty($req→root_pub→string("login"));
      #xmsv0pWxdMjMqgEC if $pass→count < 10 then {
        #xAyAwr1VUx1nzFB6 $req→status := @\u267b→restify→http→@412_Precondition_Failed;
      }
      else { #U3iaahgnQH9pmb3i if `not` $prev_pass→starts_with("code/") then {
        #xb3a7564fOLhmsxb $req→status := @\u267b→restify→http→@405_Method_Not_Allowed;
      }
      else {
        #lVaJx855yY06XZGI code→set_password($req, $pass, $prev_pass);
      }
      } 
    }
  }
  #naavM4MkSGSzKzMw code→add_route("POST", "updatecodes", "", $handler6);
  #V4JbhrRnextvNn40 where handler6(req: * api_request) {
    #xGZ682dsMRuy2LqN code→check_permission($req, "root");
    #Y1o8UzXrlDAC4SVz if $req→status ≠ 200 then {
      #MMLFYodZcw9ncuVi `return` ;
    }
    #sqlsw9hnyhkYaSUB $codes := $req→body→field("codes");
    #taU8QeE4RZSGzQ26 @\u267b→parallel→for_batched($codes→count, 50, $item_action, $batch_action);
    #RL2qQ8L3XMlSl9Sm where item_action(x: Number) {
      #LpIIg2f04ysBuhEL $s5 := $codes→at($x)→to_string;
      #yOntUDnpsbw2wBf9 data→passcodes_container→update(code→normalize_and_hash($s5), $update6);
      #xlHl0yEvYVjBaCpS where update6(entry: Json_Builder) {
        #JKYJtzRG9dzKBbrO contract→assert($entry→string("permissions")→contains(","), "");
        #EeyFjqwPcb9T8Y04 $entry→set_string("permissions", $req→body→string("permissions"));
      }
    }
    #xBiMIFgLihe5k3Ur where batch_action() {
      #qrTeS38jwfEJzcPK skip;
    }
    #DZVp4Hr4HWwTT2Sp $req→response := web→json("{}");
  }
  #Hg0vbEqxdxk3kQd8 code→add_route("POST", "generatecodes", "", $handler2);
  #xMjBv1fKazP9tKZT where handler2(req: * api_request) {
    #x1YF8uReEsABWqUw $perm := code→normalize_permissions($req→body→string("permissions"));
    #HERPB6GPlV9wCmsC $grps := code→or_empty($req→body→string("groups"));
    #aWvF4RhAQbI6Yu4j $addperm := "";
    #VsnCrSjeKIwU0Zom if `not` $grps→is_empty then {
      #IhpL4CLg1nzsi64S $addperm := ",user-mgmt";
    }
    #m3GD1NuxK59T23DK if $perm→is_empty then {
      #awOSJ7J0z5kIgfzK $perm := "educator";
    }
    #gTGelWvRkoTSWs8e if code→is_alarming($perm) then {
      #kpvkCTPdLv70Sv0r $req→status := @\u267b→restify→http→@402_Payment_Required;
    }
    #xKEDjus2JX4W1y4T $num_codes := $req→body→number("count");
    #xJxfB2fqMsrXqNWu if $num_codes > 1000 then {
      #xhBWkltoHVFpK3OS $req→status := @\u267b→restify→http→@413_Request_Entity_Too_Large;
    }
    #xZKNwZyHRGonwpxW code→check_permission($req, "gen-code," ∥ $perm ∥ $addperm);
    #xqQxOoksGI4onRsc if $req→status = 200 then {
      #j4B25t1sL48R3O81 $coll := create→Collection_of→String;
      #gDs7WW2Tw6laBszv $credit := $req→body→number("credit");
      #bjHTDN7KiMG8Yyp0 code→audit_log($req, "generatecodes");
      #T1DErOKvZvWi1NBh where data := $num_codes ∥ "x" ∥ $credit ∥ $perm;
      #ff3hLJte74LdP1Ls where newvalue := $req→body;
      #UEQaHOXU0h4TA4sv @\u267b→parallel→@for($num_codes, $@action);
      #XnSIcn02HmGl2IrW where @action(x: Number) {
        #NU4uHPm28RG4GAUs $id := @\u267b→cached_store→fresh_short_id(12);
        #il1D1aas85SrNfBU if $req→body→contains_key("code") then {
          #xGrRQpnNtEqxPEZk $id := $req→body→string("code");
        }
        #tA7Sw9IODLKTOMR9 $s3 := code→normalize_and_hash($id);
        #xolN39JTnpe87NIB data→passcodes_container→update($s3, $update3);
        #tzhW0qNiyXJK27dm where update3(entry: Json_Builder) {
          #piGIH6ofHAswBBFE $entry→set_string("kind", "activationcode");
          #gAWhECPWN4zq5k4I $entry→set_string("userid", $req→userid);
          #nGtTxz94HGADtony if `not` $perm→is_empty then {
            #I5BluO50qLD8IDN2 $entry→set_string("permissions", $perm);
          }
          #sbfZ4s04X6G08b4J $entry→set_string("groups", $grps);
          #PuGHxYk6LiqB2vHv $entry→set_number("orig_credit", $credit);
          #t4VuXDPXzADXIB7l $entry→set_number("credit", $credit);
          #HDvEaXhzHeGhnQqK $entry→set_number("time", code→now_seconds);
          #IboAcF4oFhBtXt2s $entry→set_string("description", code→or_empty($req→body→string("description")));
          #Uu9YxI9vv6yqQ4Hl if $req→body→contains_key("singlecredit") then {
            #xppq5SRXOTfg2tYW $entry→set_number("singlecredit", $req→body→number("singlecredit"));
          }
        }
        #ZMVw6222Fhp40Jrf $coll→add($id);
      }
      #t2a6FwjcuyOtmrnl $fetch_result := data→scripts→single_fetch_result(web→json("{}"));
      #ESLocIIJv7ZvfrgR $fetch_result→items := $coll→to_json;
      #u4AU8BKsIINz0ctA $req→response := $fetch_result→to_json;
    }
  }
  #dBQFQ3SPEWl9grzH code→add_route("POST", "admin", "reindexusers", $handler5);
  #xKfpTkoWgPnMvgur where handler5(req: * api_request) {
    #x3wDo3qulvylBU8v code→check_permission($req, "operator");
    #rgeyMyQ8kBNYgRXQ if $req→status = 200 then {
      #S2Yd0yeOqFARmJmR `async` data→users→get_index("all")→for_all_batched("all", 50, $process);
      #hfYLTY2Wvrj5Rpvl where process(json: Json_Object) {
        #D7kOYDLbKhQ5zHfT @\u267b→parallel→for_json($json, $@action);
        #lz8jNpkCIbNZ74GZ where @action(json: Json_Object) {
          #WzIGZHrcr1f3XWsN $userid := $json→string("id");
          #XeUTiuSGUgT6x47i $js2 := $json→field("settings");
        }
      }
      #c84yxMx9CwopaunY $req→response := web→json("{}");
    }
  }
  meta private;
}
#aMQVH30Sk3b139mG
action \_init_import() {
  #qT8Az4q2PlqF0iyW code→add_route("GET", "logcrash", "", $handler);
  #Ktx8AvB0tfoSKwaq where handler(req: * api_request) {
    #zMpbrngjTOppSqBS code→crash_and_burn;
  }
  #xaPIGnifuRu4ywc8 code→add_route("GET", "tdtext", "*", $handler7);
  #dwT7S97qo21OSqot where handler7(req: * api_request) {
    #u7t0qhlgFPp8fC1R if $req→verb→is_match_regex("^[a-z]+$") then {
      #mVXiSYdQ8W0IwTTK $s := web→download("https://www.touchdevelop.com/api/" ∥ $req→verb ∥ "/text?original=true");
      #sXY4J4yGssdHGl9h $req→response := $s→to_json;
    }
    else {
      #OwfqisaiFfA4j45m $req→status := @\u267b→restify→http→@400_Bad_Request;
    }
  }
  #xUMlQiACPDjfMlfp code→add_route("POST", "import", "", $handler7);
  #GQrGsxQdcJxUDuiU where handler7(req: * api_request) {
    #oHpIX2ev4nWgloh9 code→check_permission($req, "root");
    #ZbwcBL0FWEs4miK0 if $req→status = 200 then {
      #qsmNueXicgqISE8E if data→import_running then {
        #cVbcJM1BSt83azsU $req→status := @\u267b→restify→http→@503_Service_Unavailable;
      }
      else {
        #uIzBOM5E3D1JYR59 data→import_running := true;
        #rMVazISfHEZow1QR code→import_anything($req);
        #DA2Knhj4CASv8cpL data→import_running := false;
      }
    }
  }
  #GzkmMmhrfoD0rAbL code→add_route("POST", "recimport", "*", $handler8);
  #IYGj4skyptKo0bM9 where handler8(req: * api_request) {
    #liO8Bw0b94aCKiXn code→check_permission($req, "root");
    #zvO21iNjbrNX0DS6 $id := $req→verb;
    #DKQgpRSDpuxnUXp4 if $req→status = 200 `and` `not` $id→is_match_regex("^[a-z]+$") then {
      #IFZamCpxbb5Ftfrx $req→status := @\u267b→restify→http→@412_Precondition_Failed;
    }
    #sEK2aMkyH6yqQRcy if $req→status = 200 then {
      #xJrsqFr2VVT4RMUQ $resp := records→rec_import_response→create;
      #xUwZbZPh8lX4UJ4i $resp→ids := web→create_json_builder;
      #ilnX2bbDs373WFbE $resp→force := code→or_false($req→query_options→boolean("force"));
      #vSKIOveo5CYFJEEj $resp→fulluser := code→or_false($req→query_options→boolean("fulluser"));
      #IXpBGTKRLxb24TVV code→import_rec($resp, $id);
      #PDpJAI5DR5IFeTfq $req→response := $resp→to_json;
    }
  }
  #aLO44JC9Q7CcINlE code→add_route("POST", "importdocs", "", $handler3);
  #RKCaoi8e4QQtTDX9 where handler3(req: * api_request) {
    #tU2i5EwA8mwfeXZU code→check_permission($req, "root");
    #tAu427JoubvN09GZ if $req→status = 200 then {
      #GmOCej9ols6Ouhwn code→import_doctopics($req);
    }
  }
  #tKB8R2BSzPAQE1Y5 code→add_route("GET", "importsync", "", $handler8);
  #ZLKAXDAVv4TAzu6j where handler8(req: * api_request) {
    #xxM3pK5vXjBBDj9H $key := $req→query_options→string("key");
    #wwR4YNCZCDKI54hy if `not` $key→is_invalid `and` $key→equals(app→server_setting("LOGIN_SECRET", false)) then {
      #oj8cGu1OD3qaYAlH if data→import_running then {
        #BMiX1tasrZ4Eq2mb $req→status := @\u267b→restify→http→@503_Service_Unavailable;
      }
      else {
        #zS4z2aZo18S4XDn7 data→import_running := true;
        #fIggv3z2AdcPrOF2 code→import_from_publogger($req);
        #ldbeqIZinqM4Dimd data→import_running := false;
      }
    }
    else {
      #Pnt9SRcpGDZ4lpWX $req→status := @\u267b→restify→http→@402_Payment_Required;
    }
  }
  meta private;
  meta sync;
}
#NKq0kR1Buylv6HId
var screenshots : ♻ indexed_store → store {
  transient = true;
}
#sBylyXcSL4GCLMa2
action resolve_screenshot(#wodv0I1nCL0Ua2WZ entities: ♻ indexed_store → fetch_result, #zePE2gS7dPDvuV2I req: * api_request) {
  #xoGfc6IwfnTR0sRl code→add_username_etc($entities);
  #EtXzd4j8fBZ4sgEm $coll := create→Collection_of→\u2339pub_screenshot;
  #qVmLfXWU0ha826eL foreach js in $entities→items
  do {
    #x1KZCEAVU2kWDlCC $screenshot := records→pub_screenshot→create_from_json($js→field("pub"));
    #akX3mq7dgwFBy9h6 $coll→add($screenshot);
    #iq2pzHY7E7TlAIiM $id := "/" ∥ $screenshot→id;
    #elsvc1f44DZj2iM6 $screenshot→pictureurl := data→art_container→url ∥ $id;
    #Ui2iVsqQLCAXJMYA $screenshot→thumburl := data→thumb_containers→at(0)→container→url ∥ $id;
    #AmhUqW5DJsKgDvoR if $req→is_upgrade then {
      #ILJX85RbF1SL8gt2 $req→queue_upgrade_task( `async` code→redownload_screenshot($js));
    }
  }
  #gvE4XoeWpqfqUZje $req→await_upgrade_tasks;
  #xEhOrNq8t6HdZDaE $entities→items := $coll→to_json;
  meta private;
}
#ArXsf5J2vvLfQmt5
action update_screenshot_counters(#ZekToWOgG0ORJSxX screenshot: * pub_screenshot) {
  #VO5hThcx25Rt0wC2 data→pubs_container→update($screenshot→publicationid, $update);
  #c38HgV3roHZsOJZl where update(entry: Json_Builder) {
    #xKmrdLoEUb9z7MT9 code→increment($entry, "screenshots", 1);
  }
  meta private;
}
#dxze6Yl9bzIxk4P2
action or_zero(#xlEJ8rq1Rhmuyh2l s: Number) returns(#pVbhRyfShDI2LQjO r: Number) {
  #vULJUhrucQo4jWjc if $s→is_invalid then {
    #NSzHvlJZkEfmzjZs $r := 0;
  }
  else {
    #xM204mUxncsyjiKU $r := $s;
  }
  meta private;
  meta sync;
}
#xTrbd94lWxAZ8VC5
action clear_script_counts(#vVuZai0WsZ9PAQhg @script: * pub_script) {
  #HxPQuP5pveER10k2 $@script→screenshots := 0;
  #kkW2WhHJlMFNeg6N $@script→comments := 0;
  #RCDJ3q426O5iRfPA data→pubs_container→update($@script→id, $update);
  #UAnaAP0yIq5z21J2 where update(entry: Json_Builder) {
    #IjBRiB23THZXp4Es $entry→field("pub")→set_number("screenshots", 0);
    #d1pLJiM3AeSMssW3 $entry→field("pub")→set_number("comments", 0);
  }
  meta private;
}
#LBlGd3BO1v5CTUS7
action build_list_response(#Gn3tI2XKdRYitPJO entities: ♻ indexed_store → fetch_result, #x4eHvVLox2Eru2nu req: * api_request) {
  #MnSzyuEsTyK3M0tn $bld := $entities→to_json→to_json_builder;
  #cRHQ4xze3PK0YxVe $bld→set_string("kind", "list");
  #ZZQX5CMg3vzc3xeW $etags := $req→query_options→string("etagsmode");
  #HPSVVyHoCyR8M2bI if $etags→is_invalid then {
    #tUQlfc6hGkoHTRcx skip;
  }
  else { #ELfqDZK8gpVBeQq7 if $etags→equals("includeetags") `or` $etags→equals("etagsonly") then {
    #oEnkjHSQqIJQq5KO $coll := $entities→items→to_collection→map_to→Json_Builder($lambda);
    #eaorCx5btjGeMBmo where lambda(elt: Json_Object) returns (result: Json_Builder) {
      #rUgloA0Hy29ImCat $result := web→create_json_builder;
      #otD6oJV1W5ubmOje $result→set_string("id", $elt→string("id"));
      #x3dRobmALtt43Q87 $result→set_string("kind", $elt→string("kind"));
      #uwWuNtFgitN4TCN4 $result→set_string("ETag", code→compute_etag_of_json($elt));
    }
    #xKgrts2qbvEgSmcJ $bld→set_field("etags", $coll→to_json);
    #owRbo09t5WkuBQZi if $etags→equals("etagsonly") then {
      #ElGhZPIKUbWx3hND $bld→remove_field("items");
    }
  }
  else { } } 
  #ArbOilOx9X3Kj3mc $req→response := $bld→to_json;
  meta private;
  meta sync;
}
#cOImG46mf8vpiBoE
var last_showcase_dl : DateTime {
  transient = true;
}
#Imc7eZ1BaCrZ8UyX
var showcase_ids : Collection[String] {
  transient = true;
}
#GUCCpa3arf45f38f
action redownload_art(#a9ab414FK3eYBLxf jsb: Json_Object) {
  #loVLD6Y54S257pBT $urlbase := "https://touchdevelop.blob.core.windows.net/";
  #s0xLaVZlxCT09DCJ $urlbase := "http://cdn.touchdevelop.com/";
  #q4AiESXFIQhuPP45 $id := $jsb→string("id");
  #xIXyYU7DuKj4mCA3 $filename := $id;
  #NBbJ75ExVTOvCoxO $result3 := data→art_container→copy_url_to_blob($filename, $urlbase ∥ "pub/" ∥ $id);
  #rncE00aB0xST2ULd if $jsb→boolean("isImage") then {
    #xawD4Nbr07h00mjp $result := data→thumb_containers→at(0)→container→copy_url_to_blob($filename, $urlbase ∥ "thumb/" ∥ $id);
    #OzoM7egt84TR5P1Z if $result→is_invalid then {
      #kYNVg47wKFtlcwzR $result := data→thumb_containers→at(0)→container→copy_url_to_blob($filename, $urlbase ∥ "pub/" ∥ $id);
    }
    #KTNPjqQNwm2ST6Ph if $jsb→string("kind")→equals("art") then {
      #K4l8kQwdhg24MgyQ $result := data→thumb_containers→at(1)→container→copy_url_to_blob($filename, $urlbase ∥ "thumb1/" ∥ $id);
      #hN3a4UY87j2egnaA if $result→is_invalid then {
        #EQ7V34zTJIDhZrbS $result := data→thumb_containers→at(1)→container→copy_url_to_blob($filename, $urlbase ∥ "pub/" ∥ $id);
      }
    }
  }
  else {
    #nR3uW5wUOWnc3Jjd $result2 := data→aac_container→copy_url_to_blob($id ∥ ".m4a", $urlbase ∥ "aac/" ∥ $id ∥ ".m4a");
  }
  meta private;
}
#EWbLnpz8Gk4lXUQ8
action post_screenshot(#TED94mbuubX4OgeD req: * api_request) {
  #tGOZJDbTidzbPt2b $base_kind := $req→root_pub→string("kind");
  #BpJCAPJI03dC2oYW if `not` $base_kind→is_match_regex("^(script)$") then {
    #pKGMTxcUFY0calVJ $req→status := @\u267b→restify→http→@412_Precondition_Failed;
  }
  else {
    #xnNcRHUuOSzwQmLC $screenshot := records→pub_screenshot→create;
    #nPvlYqvvZTiR1Ug2 $screenshot→userplatform := code→get_user_platforms($req);
    #x1z4RFPMlXHRYSp8 $screenshot→userid := $req→userid;
    #GwxqMD254CvBYDY3 $screenshot→time := code→now_seconds;
    #sjndbjoWQic1p4Wo $screenshot→publicationid := $req→root_id;
    #l7qvioMBglv2uKu8 $screenshot→publicationkind := $base_kind;
    #BjPqxnQpTFPa1Wh9 $screenshot→publicationname := code→or_empty($req→root_pub→field("pub")→string("name"));
    #K4VSqH2wBBRmdDwx $jsb := web→create_json_builder;
    #yuR8gOjgaGhtzv75 $jsb→set_field("pub", $screenshot→to_json);
    #eC00tAp4QH3KlWgy code→post_art\u002dlike($req, $jsb);
    #xhKV73SJfrTHaiTa if $req→status = 200 then {
      #x8mgnyyzDq5LylDV data→screenshots→insert($jsb);
      #p2S2H0llbS24U8sT code→update_screenshot_counters($screenshot);
      #L25MqX4H0ZvHjgBz code→store_notifications($req, $jsb, "");
      #xX2I00K7PaDdGwFo // ### return screenshot
      #pf0zggHOUtRrWhIP data→screenshots→return_one_pub($jsb→to_json, $req);
    }
  }
  meta private;
}
#xUJM8AD9ur4BBkHa
action post_art\u002dlike(#SgrR0vh1RYkv0Ibx req: * api_request, #REXCM5kGfJw07FaE jsb: Json_Builder) {
  #Z2A4NYtJhzJgH3dI $content_type := $req→body→string("contentType");
  #xvYPbCr8CqCwYIWY code→fix_art_props($content_type, $jsb);
  #OArNC9E0VWTyU3rv $ext := $jsb→string("ext");
  #hXmjT3hSrg4gXiOg $enc := code→with_default($req→body→string("contentEncoding"), "base64");
  #xtgOiCe4modkeDrG if `not` ($enc→equals("base64") `or` $enc→equals("utf8")) then {
    #H9jOosgHNM2pl9xZ $req→status := @\u267b→restify→http→@412_Precondition_Failed;
  }
  else { #xo0qimd318rQSXMP if $ext→is_empty then {
    #rXP2fBWmhmUlBdQk $req→status := @\u267b→restify→http→@415_Unsupported_Media_Type;
  }
  else {
    #v0650EXsK1PUiTTo $buf := bits→string_to_buffer($req→body→string("content"), $enc);
    #opCRpgI2V9PoNRFN $size_limit := 1 * 1024 * 1024;
    #uWveZPXRmqqSsux5 $arttype := $jsb→string("arttype");
    #xH8oSp01OOq2sMrX if $arttype→equals("blob") then {
      #Pc3Rj7ix5vI2HSSq $size_limit := 8 * 1024 * 1024;
    }
    else { #aJXFMYfiV3c6iJRu if $arttype→equals("video") then {
      #PeUaqGhAcnIIg8dh $size_limit := 8 * 1024 * 1024;
    }
    else { } } 
    #W8pbZU2dM6Q2Z4yH if $buf→is_invalid then {
      #lHWbMBbNldYqN1qU $req→status := @\u267b→restify→http→@400_Bad_Request;
    }
    else { #OU5w1ykhpQJkQBsP if $buf→count > $size_limit then {
      #x1a9Hpi7nYFQ5nQN $req→status := @\u267b→restify→http→@413_Request_Entity_Too_Large;
    }
    else {
      #ugRwR7kHon1wo14Z $hash := @\u267b→node_crypto→create_hash("sha256");
      #xP5wrFAWdGqv1xEi $hash→update_hash($buf);
      #NmWxeKunmxKDNENv $sha := $hash→digest_hash→to_string("hex")→to_lower_case→substring(0, 32);
      #n3vB4ehwPxbNuNHe $jsb→field("pub")→set_string("filehash", $sha);
      #p2BRNpWpPNi8hvHn if code→or_empty($jsb→string("kind"))→equals("art") `and` `not` code→or_false($req→body→boolean("forcenew")) then {
        #AtAwzwqX74Iy6KGz $fetch_result := data→arts→get_index("filehash")→fetch($sha, web→json("{}"));
        #u7zD72BYZnXbR9Kd $existing := $fetch_result→items→at(0);
        #xXgxW2U617yXAFn8 if `not` $existing→is_invalid then {
          #xyZHIIZMCq4FYUuy $jsb→set_field("existing", $existing);
          #eG8tsaZsbn6ju2bH `return` ;
        }
      }
      #sKnrswewfWrTaCAd code→generate_id($jsb, 8);
      #TKldBEV4PCTFsLoK $filename := $jsb→string("id");
      #kKVfKajlNkIreLNm if $arttype→equals("blob") `or` $arttype→equals("text") then {
        #hSwGlbXfy5GuZX8q $s := code→or_empty($jsb→field("pub")→string("name"))→replace_regex("[^a-zA-Z0-9]+", "-")→replace_regex("^-+", "")→replace_regex("-+$", "");
        #bjITMwpVXPukUIZw $filename := $filename ∥ "/" ∥ code→with_default($s, "file") ∥ "." ∥ $ext;
      }
      #xw2neH14LF2u2h24 $jsb→set_string("filename", $filename);
      #SFnQGJU3oTLyw2Rw $result := data→art_container→create_gzipped_block_blob_from_buffer($filename, $buf);
      #DT4GpBDqZcW9HbKy where force_new := true;
      #SMHsOHZ2t7Vr7jY7 where contentType := $content_type;
      #ebuHGFG0kyQXHCzU where cacheControl := "public, max-age=900";
      #x2c69bD9jththk41 where smartGzip := true;
      #J74iroCPg4D7W0IF if `not` $result→succeded then {
        #DipmSIu03Ex4ZS8w $req→status := @\u267b→restify→http→@424_Failed_Dependency;
      }
      else { #BkcJKrQHaAV3jRrP if $jsb→boolean("isImage") then {
        #AbtHybqyo4WpJUcB $url := data→art_container→url ∥ "/" ∥ $filename;
        #xns0CEOS4D2pIktQ @\u267b→parallel→@for(data→thumb_containers→count, $@action);
        #xfY4gKLsr682U6AO where @action(i: Number) {
          #FdKf9AQ7P0gFV1EQ $thumb_container := data→thumb_containers→at($i);
          #np17Z4H4JBlRu9Nb $temp_thumb_url := @\u267b→kraken→optimize_picture_url($url);
          #qbgVzAs12e2hpjD6 where width := $thumb_container→size;
          #x2ifpz1u90fGVd22 where height := $thumb_container→size;
          #rMcHoHi5uSyrKzUW where resize_strategy := "auto";
          #Iw4NgQmXGP2Kcqkj where lossy := true;
          #lG4FswBvaUuG2hhg where quality := 60;
          #ivSZNTCDkpS6T994 if `not` $temp_thumb_url→is_invalid then {
            #zYx4axNU4fY8OlaD $result2 := $thumb_container→container→create_block_blob_from_url($filename, $temp_thumb_url);
            #SZz7gqOtfNbMc2jK where force_new := true;
            #vQz22bz2MeweRCQo where contentType := $content_type;
            #xnVGHax99KA6chXX where cacheControl := "public, max-age=900";
            #xk2y09Ym3joXLINv where timeoutIntervalInMs := 3000;
            #XTdk1wbbCvR9eLEq if `not` $result2→succeded then {
              #w2b4122oaQdH2DCc $req→status := @\u267b→restify→http→@424_Failed_Dependency;
            }
          }
          else {
            #whp34xsp4ynS9bSL $req→status := @\u267b→restify→http→@400_Bad_Request;
          }
        }
      }
      else { } } 
    }
    } 
  }
  } 
  meta private;
}
#FXO4dH6tZwXm4r5a
action queue_upgrade_task(#n2T2xWNsZzt51TDC req: * api_request, #kjaYOQt2cXkwZSDu task: Task[Nothing]) {
  #x7SIsyYXoqPLQoJu if $req→upgrade_tasks→is_invalid then {
    #Tqrh7KF40WYLbELj $req→upgrade_tasks := create→Collection_of→Task_of→Nothing;
  }
  #orMPnFM9gCJm1SQQ $req→upgrade_tasks→add($task);
  meta private;
  meta sync;
}
#tvWfYlvwnNV68mZp
action await_upgrade_tasks(#xGrUyfdckaIkRfBp req: * api_request) {
  #x7Z4Ujc2ZJb52Sl5 if `not` $req→upgrade_tasks→is_invalid then {
    #WHeyAwn4fvx81bTT foreach task2 in $req→upgrade_tasks
    do {
      #glAN6qApH83a6sz6 $task2→await;
    }
  }
  meta private;
}
#dFlL6q6ZnFJX0FWd
action redownload_screenshot(#EeN7qjTqTEt8Gq81 js: Json_Object) {
  #z1YMkHwAXRxR7UYK code→redownload_art($js);
  #PlLUPBQo4YMb8zYZ data→pubs_container→update($js→string("id"), $update);
  #Val4X5P9NAy8ia2r where update(entry: Json_Builder) {
    #DGspqWrkmZltjqYJ code→fix_art_props("image/jpeg", $entry);
  }
  meta private;
}
#X72LqbIjkd0ZGxjE
action import_review(#Yt7lpW2CO21TeOLP req: * api_request, #W1Ps4w2jRmqrn42Z body: Json_Object) {
  #iGckD4nueMnPOFfa $review := records→pub_review→create;
  #sWrr0R4weCdwwHvD $review→from_json(code→remove_derived_properties($body));
  #Z38djvggn9uAFjFB skip;
  #xjR0oBQinh1u5h26 $pubid := $review→publicationid;
  #p2JSXiswZqaS91oJ $entry := data→pubs_container→get($pubid);
  #Zp0F25G9TOq5KPZJ if code→is_good_entry($entry) then {
    #x2JMV4XFjOIaOf1H if $entry→string("kind")→equals("script") then {
      #BrHYiyNhB9Scp9Yd $pubid := $entry→string("updateKey");
    }
    #PYzqWG1QsfxTlnjn $review→publicationuserid := $entry→field("pub")→string("userid");
    #xE4GDSs4kuLToP9x $jsb := code→update_review_counts($review, $pubid, $req);
    #TX8hz0RxUPlps4UD if $req→status = 409 then {
      #dDWrfFaPX84S1GTI data→reviews→reserve_id($review→id);
      #ykd4BVSCV7E2s9sn $req→status := @\u267b→restify→http→@410_Gone;
    }
  }
  else {
    #WjHRnGkyZKTGyhlB $req→status := 404;
  }
  meta private;
}
#fFayLITLkL4WpUhu
action update_review_counts(#x4HiRqFftgmibTVS review: * pub_review, #I3amJqSbnHM5Y75u pubid: String, #hBtvhqglJULnMCFN req: * api_request) returns(#VvCVMkSbjazB0jCy jsb: Json_Builder) {
  #m4vV7GRV5TQeSgTv contract→assert( `not` $pubid→is_empty, "");
  #ewznEUYZOg3VP4IS $jsb := web→create_json_builder;
  #QB4jKSLFlI74zec6 $jsb→set_field("pub", $review→to_json);
  #yC2I13tqQ2PxNB59 $jsb→set_string("pubid", $pubid);
  #zCCvQuMJlClLYd42 $jsb→set_string("id", $review→id);
  #XnEyk6oJehXeRqik $key := "r-" ∥ $pubid ∥ "-" ∥ $review→userid;
  #xTiOMJZXOKHP3B13 $jsb→set_string("ptrid", $key);
  #Y48PIbRwY4Nb5IWd $jsb→set_string("pubid", $pubid);
  #C408Rzte1axbjPgU $ok := code→try_insert_pub_pointer($key, $review→id);
  #AxA1SKUfeX7q6lAj if $ok then {
    #xHrWvs7PtnPTtr2a if false then {
      #xrclpaiSyLi2Cguf data→logger→debug("review: " ∥ $jsb→serialize);
    }
    #xgTmoodqtHWJw92A data→reviews→insert($jsb);
    #FoJ0Do2RtRyBhRyt // ### update heart count
    #YQkx2o3rqGSxnBRE data→pubs_container→update($pubid, $update);
    #T3A2QmTbSNUyTD4e where update(entry: Json_Builder) {
      #eMk6x7E4ow9Dz4HU code→increment($entry, "positivereviews", 1);
    }
    #x0kSQs3st2VbJns7 data→pubs_container→update($review→publicationuserid, $update);
    #rxPkYsbq8HH2HTCb where update(entry: Json_Builder) {
      #nfTuNTbrRhR7Sk3R code→increment($entry, "receivedpositivereviews", 1);
    }
  }
  else {
    #xg7tzWvsrZ4pYiG2 $req→status := @\u267b→restify→http→@409_Conflict;
  }
  meta private;
}
#zvrzeAE2irR4j1o4
action import_from_publogger(#XDmLCNwzvagqRsQ8 req: * api_request) {
  #xnCBFy4nyuASetus $entry := data→pubs_container→get("cfg-lastsync");
  #X2elenGG655znsPe $start := 0;
  #NCjUK9YSY9Lp46vq if `not` $entry→is_invalid then {
    #x0kzIaK66pRJnGtl $start := $entry→number("start");
  }
  #IaYzoGD3E424RW7w $resp := web→create_json_builder;
  #mHT1zDx2KK4Vjf1z $coll2 := create→Collection_of→Json_Object;
  #J8hRt22dVtWbDxBV $continuation := "&fake=blah";
  #FzHUA4h1SbxINOe4 $last_time := create→Ref_of→Number;
  #xq1IzjlZzVX492t8 $last_time→\u25c8set($start);
  #O2j8QmHncbR1SOdu while `not` $continuation→is_empty do {
    #y4SkIveH5V9VZhxi data→logger→info("download from publogger: " ∥ $start ∥ " : " ∥ $continuation);
    #xCBkftBTbWvmNjFr $js2 := web→download_json("http://tdpublogger.azurewebsites.net/syncpubs?count=30&start=" ∥ $start ∥ $continuation);
    #cugabTwJF28q0aZb @\u267b→parallel→for_json($js2→field("items"), $@action);
    #xoouAJmdLqKWjMeh where @action(json: Json_Object) {
      #x4MmO1xP38DInNM0 $last_time→\u25c8set($json→number("notificationtime"));
      #SO0B6wReFvoA6BR1 code→import_download_publication($json→string("id"), $resp, $coll2);
    }
    #YIyklQxgOPzF5j4c $cont := code→or_empty($js2→string("continuation"));
    #CINTW4KzmaMmV4HJ if $coll2→count > 30 `or` $cont→is_empty then {
      #hqSsC8Nqma2MQghu $continuation := "";
    }
    else {
      #hfKXWLIHNsCgQmMA $continuation := "&continuation=" ∥ $cont;
    }
  }
  #fkIJmWy5GNTCe3Gm foreach js4 in $coll2
  do {
    #IqpKOEBSoqqYmVF2 $api_request := code→import_one_anything($js4);
    #Be2HS2GMXCh070QL $resp→set_number($js4→string("id"), $api_request→status);
  }
  #dV6LE6G36yAHw53h data→pubs_container→update("cfg-lastsync", $update);
  #KtA2ElHve7dnyPUC where update(entry: Json_Builder) {
    #q5Fyug5LIx0c6Jsz $r := code→or_zero($entry→number("start"));
    #Z4eTqHqBjD33LCZy $entry→set_number("start", math→max($r, $last_time→\u25c8get));
  }
  #fW5qdII8ebrI5tu4 $req→response := $resp→to_json;
  meta private;
}
#x42LCexnSf5FTz0W
action import_one_anything(#Ec9xTbwRxhl0W51D js: Json_Object) returns(#xKtfmtqhAUm0N4gf api_request: * api_request) {
  #x3UvUn8QJuKwScFB $entry := data→pubs_container→get($js→string("id"));
  #M171zPEgbNX2fJUM $api_request := records→api_request→create;
  #xLN3ARDAQWlxRrt7 $api_request→status := 200;
  #sNzZkTk8PnKT63nN if `not` code→is_good_entry($entry) then {
    #x6YDoSu42u28XOJf $kind := $js→string("kind");
    #bhXIr2U4MdSF47dK if $kind→equals("script") then {
      #pH2gc936uJZkvuxd code→import_script($api_request, $js);
    }
    else { #zTCv094I44fg4xTn if $kind→equals("art") then {
      #x4X47OL1zLAhwJFU code→import_art($api_request, $js);
    }
    else { #tNeD3BzmJV0FM41h if $kind→equals("review") then {
      #erwk6njB82IE1yTA code→import_review($api_request, $js);
    }
    else { #UWT12o7wbbJSHB58 if $kind→equals("user") then {
      #gTiJJ2g6Ab6P995u code→import_user($api_request, $js);
    }
    else { #x04I4NQEHNj57nSu if $kind→equals("comment") then {
      #hCanIJSuuQBH7YT4 code→import_comment($api_request, $js);
    }
    else { #fOKfkppV2KCop9EH if $kind→equals("tag") then {
      #YaKGvvUFxZVMP8GM code→import_tag($api_request, $js);
    }
    else { #qehEY6hqx4Y8XiRk if $kind→equals("group") then {
      #ooap8mBINjqu4g0o code→import_group($api_request, $js);
    }
    else { #r3dTxXnCTUcaMkyo if $kind→equals("screenshot") then {
      #ryOGfOQVA0gh81Mu code→import_screenshot($api_request, $js);
    }
    else {
      #K4FzksSNYsilQpQR $api_request→status := @\u267b→restify→http→@422_Unprocessable_Entity;
    }
    } } } } } } } 
    #H4vbyo4zrS2GELDE data→logger→info("import " ∥ $kind ∥ " /" ∥ $js→string("id") ∥ ": " ∥ $api_request→status);
  }
  else {
    #hPqw2tu2mylwBUHO $api_request→status := @\u267b→restify→http→@409_Conflict;
  }
  meta private;
}
#wXXm7aKS3Hx66HzT
action import_download_publication(#Q8UJrF0r7JYMvgIf id: String, #WokYRcwdCaO7dAjh resp: Json_Builder, #MZVBtDypXG2bZovh coll2: Collection[Json_Object]) {
  #QHOs0wErp28aLgUL $existing_entry := data→pubs_container→get($id);
  #rYKprFo6mlGz4spV if `not` code→is_good_entry($existing_entry) then {
    #McWCswUR6WWn3E80 $url := "https://www.touchdevelop.com/api/" ∥ $id;
    #xTSIN3YgAzsJA0zN $js := web→download_json($url);
    #bjoS9R6oUYvbjerE if $js→is_invalid then {
      #xmeELSgUnVcpXMRE $resp→set_number($id, 404);
    }
    else { #Era5faSxmkN7A7Qz if $js→string("kind")→equals("script") then {
      #UNf2VXwRWVCEmVgw $jsb := $js→to_json_builder;
      #JIcLKx0iB9aMBUkz if `not` $js→string("rootid")→equals($id) then {
        #urEC5mmqmDQvrcOw $js3 := web→download_json($url ∥ "/base");
        #DSxojPcLUrChqfnk $jsb→set_string("baseid", $js3→string("id"));
      }
      else {
        #mnk7ibJJv2FVvxJ9 $jsb→set_string("baseid", "");
      }
      #kg2jlTSJE1SLYSKm $s2 := web→download($url ∥ "/text?original=true&ids=true");
      #wnZUaGcxjc6rEK13 $jsb→set_string("text", $s2);
      #EldRKgA3D2I9UAbk $coll2→add($jsb→to_json);
    }
    else { #G4Bd59Qvnwhu0Dzc if $js→string("kind")→is_match_regex("^(runbucket|run|webapp)$") then {
      #asfvdI2HDBybczAr skip;
    }
    else {
      #nr3hcMiFuvyuTqIb $coll2→add($js);
    }
    } } 
  }
  meta private;
}
#hVMTp46Qp2XieaXA
var import_running : Boolean {
  transient = true;
}
#BVGhpbmca
table route_options {
  type = "Object";
  persistent = false;
  fields {
    #xoFf824kGzNCTD2v no_size_check : Boolean
    #xZXB6O7J2b3na15F size_check_excludes : String
    #TVQD6ca3fKYafcKM cache_key : String
  }
}
#rMTwzWQRQIeBiPQf
action is_good_entry(#xqt527wPfRyByDcr entry: Json_Object) returns(#olo52fSwL6E4jaYh b: Boolean) {
  #E9cfDnlpeAQ2ybSw $b := `not` $entry→is_invalid `and` `not` $entry→string("kind")→equals("reserved");
  meta private;
  meta sync;
}
#ovZI2Q1DBNvvKaqb
action is_good_pub(#knRaBsibX0u296Hq entry: Json_Object, #hKLFxqKhB2X6Nv4e kind: String) returns(#Ob4YAm50aMP4OA8t b: Boolean) {
  #kLfyUQFGHm5ItAbC $b := `not` $entry→is_invalid `and` code→or_empty($entry→string("kind"))→equals($kind);
  meta private;
  meta sync;
}
#BpxE3tTtC92tP1qU
var history_table : ♻ azure_table → @table {
  transient = true;
}
#generated959
table pub_installed_history {
  type = "Object";
  persistent = false;
  fields {
    #xTpP3zf760S3jaCO kind : String
    #sQLpatG7DNQ4tZWt time : Number
    #XxvFK2r2EabIQbbh historyid : String
    #cITYDadjvDC1Eo2B scriptstatus : String
    #r66S5MoZKlTbju1b scriptname : String
    #rAXSIylX2PBT9eXA scriptdescription : String
    #DRqRZEEskyBKWgr9 scriptid : String
    #rUroFQaPxLbP3DIt isactive : Boolean
    #kiw8AvePTRGHTMZg @meta : String
    #Mldp12aRkDJA8N3P scriptsize : Number
  }
}
#Qo7USMKTk5i4pUVS
action get_installed_history(#cQqZykPnLO2m70Yo req: * api_request) {
  #J3d80Eoif49vhpPl $scriptGuid := $req→root_id ∥ "." ∥ $req→argument;
  #au4cRVhJYFxq7wtf $res_query := data→history_table→create_query→partition_key_is($scriptGuid);
  #xp3fafEUQe4Pjvd2 $entities2 := @\u267b→indexed_store→execute_table_query($res_query, $req→query_options);
  #F7FblpY21lMaQgVP $coll := create→Collection_of→\u2339pub_installed_history;
  #xZNY1W29H3wB08P4 $coll→from_json($entities2→items);
  #Un3s66tJwftsjary $entities2→items := $coll→to_json;
  #xrd3GpFuQsT20EMl $req→response := $entities2→to_json;
  meta private;
}
#Hb7fkR7nRZMzd81J
action \_init_subscriptions() {
  #h21Xr86lLMvV2WmF data→subscriptions := @\u267b→indexed_store→create_store(data→pubs_container, "subscription");
  #dC9eQdjRMGkipIzv data→subscriptions→set_resolve($resolution_callback2);
  #CSuHXSsBoZUc9b2T where by_userid := true;
  #haViGZ11K76WyRWr where by_publicationid := true;
  #xo28pz5enQJnMTDj where resolution_callback2(fetch_result: ♻ indexed_store → fetch_result, api_request: * api_request) {
    #Hg6OaymoI8OgXFOK $field := "userid";
    #x0EJORFeUsOHgaJo if $api_request→verb→equals("subscriptions") then {
      #q2pJy5F5mUyojYOd $field := "publicationid";
    }
    #IyApgvxsjVqV0VNf $users := code→follow_pub_ids($fetch_result→items, $field, "user");
    #NKu3Y3OSBrOkSUrh $fetch_result→items := $users→to_json;
    #oBKGYjRsQ5O6hxXw code→resolve_users($fetch_result, $api_request);
  }
  #L8WlxdoG0eNI1un4 // Note that it logically should be ``subscribers``, but we use ``subscriptions`` for backward compat.
  #WT89kksH3hsMzznn code→add_route("POST", "*user", "subscriptions", $handler2);
  #CVsyUhJ49Kiqtv4m where handler2(req: * api_request) {
    #RtvtUJHoiKEJ55ng code→can_post($req, "subscription");
    #Hxx26JEhlJ6gG8HG if $req→status = 200 then {
      #xixABvfQ5tG4PiIY code→add_subscription($req→userid, $req→root_id);
      #eQjRXQeVeZVTUqOa $req→response := web→json("{}");
    }
  }
  #mc3Hsfwl73xtYmPS code→add_route("DELETE", "*user", "subscriptions", $handler2);
  #EvhFMKIYocNvxBlz where handler2(req: * api_request) {
    #HpXGSQr2PLL4vJ3P code→can_post($req, "subscription");
    #nyjXJ03aYNpGchTB if $req→status = 200 then {
      #Rbdcl3fUH5XsvK1p code→remove_subscription($req→userid, $req→root_id);
      #xCqvKLDged2ftxaS $req→response := web→json("{}");
    }
  }
  #xDaZ5wNKMdHxO6aI code→add_route("GET", "*pub", "notifications", $handler);
  #xB5iIcAuU6NV8YUq where handler(req: * api_request) {
    #xKL4zSqNrullYYaq code→get_notifications($req, false);
  }
  #Kfl132icHvIozxVm code→add_route("GET", "notifications", "", $handler);
  #v23XkdtVMPz9xKJz where handler(req: * api_request) {
    #gxwxbfnfsg24KzgL $req→root_id := "all";
    #YjF2DLiU9y1umeip code→get_notifications($req, false);
  }
  #RC12sjdt423XV8Cw code→add_route("GET", "*pub", "notificationslong", $handler);
  #xgdTC8W3kT1VKbDz where handler(req: * api_request) {
    #mF4C5BJDSFqS5TZf code→get_notifications($req, true);
  }
  #x66TNZ5pCmrd1fEB code→add_route("GET", "notificationslong", "", $handler);
  #nvzbM2Qwvka5sFG6 where handler(req: * api_request) {
    #WJHMEDQCbsbHbtme $req→root_id := "all";
    #zWL3jZP8j0VTOETP code→get_notifications($req, true);
  }
  #IVzsDDh1Cv9DZW5d code→add_route("POST", "*user", "notifications", $handler3);
  #xENHny7PztT4Yzbz where handler3(req: * api_request) {
    #FSTVPmvitroFKy86 code→me_only($req);
    #HVB4I5ACr2Tnq1dE if $req→status = 200 then {
      #TTUMuXhlRElbJCmp $res_query2 := data→notifications_table→create_query→partition_key_is($req→root_id)→@top(1);
      #l22gsRMd9ZUhQCal $entities2 := $res_query2→fetch_page;
      #oq7FUkfr1y4jxWzy $js := $entities2→items→at(0);
      #x9v9oJDG0S2vZGTX $top_not := "";
      #vNZVO3NAt4Pstyui if `not` $js→is_invalid then {
        #pjNhBYBA7VAJuIy5 $top_not := $js→string("RowKey");
      }
      #xWYFoforQzEjwJN7 $resp := web→create_json_builder;
      #x7AB22Ty5W1wYBfY $resp→set_string("lastNotificationId", code→or_empty($req→root_pub→string("lastNotificationId")));
      #Hj2FOzXoGo0rcTTJ data→pubs_container→update($req→root_id, $update);
      #zidcdR3dHAWC3V4n where update(entry: Json_Builder) {
        #mAipMOgFMA2sTldQ $entry→set_string("lastNotificationId", $top_not);
        #wGlH4PIup4Tk2K4o $entry→set_number("notifications", 0);
      }
      #tzxQyu1quQcQ6reB $req→response := $resp→to_json;
    }
  }
  meta private;
}
#x2Ha23IA29KuMJWL
var subscriptions : ♻ indexed_store → store {
  transient = true;
}
#QhL0wa2CVpTYYIWj
table pub_subscription {
  type = "Object";
  persistent = false;
  fields {
    #hMXuA4y8czcUSKG7 kind : String
    #kpet5wDT9P3XpkF3 time : Number
    #hxyBFk8NJlpxw94J id : String
    #xg4gkzmS6Zca7UaW userid : String
    #xn4Gb4cp6jCrghOh username : String
    #tJRtGFeeOBGdfehI userscore : Number
    #kAPUWQm7b3V5jslf userhaspicture : Boolean
    #rD3GFgH34DLYSAZ7 publicationid : String
    #PHkUpP67zjixjzig publicationname : String
    #DKYi320nQHIW9o5u publicationkind : String
  }
}
#A4KGFvKQCxfIs2F2
table pub_notification {
  type = "Object";
  persistent = false;
  fields {
    #L4cr4ORAto78FCON kind : String
    #xWNg8gLR60DigfjS time : Number
    #mN0x2xScLFn0tK9K id : String
    #bYR5VZaGz5P0LRGF notificationkind : String
    #AG61zOOkJMBy40Ce userid : String
    #Nb9iYgQG21MJ84u5 publicationid : String
    #xYkpMszBKoqSsoP2 publicationname : String
    #y3hw2eCYBtLdkhOM publicationkind : String
    #KOD44XZsHjNTu4c7 supplementalid : String
    #IAuN8QaOZ6Vrd3cI supplementalkind : String
    #HB8Xb861X1PBI4OF supplementalname : String
  }
}
#WUyDpb10LcdAttfm
action store_notifications(#DsqFbqB6yN1yGdvA req: * api_request, #mSnNnrA1hBoVClJo jsb: Json_Builder, #JUyUPpW7sQzjxwCK subkind: String) {
  #bzMv6veTwAqkGi13 $pub := $jsb→field("pub");
  #PW48Jb7vmHbTYaNN $userid := $pub→string("userid");
  #G2TveBnCS8XcmHtQ $pubkind := $pub→string("kind");
  #zJPr1JUxkCpL8lKm data→logger→tick("New_" ∥ $pubkind);
  #pjDBZdnKQXIFaWsJ if $pubkind→equals("abusereport") then {
    #ppsBQTFRyOOa0cMT $userid := $pub→string("publicationuserid");
  }
  #ZEGpwC3944jaM8cl $to_notify := collections→create_string_map;
  #ByOpI8xB4YFay7bL if `not` $pubkind→equals("review") then {
    #rNEVcg4BeGh2Czm0 foreach sub in data→subscriptions→get_index("publicationid")→fetch_all($userid)
    do {
      #vQ82YBxWuxaJYOcE $to_notify→set_at($sub→field("pub")→string("userid"), "subscribed");
    }
    #xUipssQFmBLSTQI8 foreach gr_json in code→get_user\'s_groups($userid)
    do {
      #xul4szFMpvt9fb76 $gr := records→pub_group→create_from_json($gr_json→field("pub"));
      #NuGkcKKT3bqnU6Rb if $gr→isclass `and` `not` $gr→userid→equals($userid) then {
        #xtyrV8FygBAj4tGu $to_notify→set_at($gr→userid, "class");
      }
      #x04wl1fyyJHp1fzC if `not` $pubkind→equals("abusereport") then {
        #Xa2dbe0craBjSRLY $to_notify→set_at($gr→id, "group");
      }
    }
  }
  #GEDVSbj3hgYqwHLs if `not` $req→root_pub→is_invalid then {
    #xeFl1CQRJwqpT3j0 $parent_userid := $req→root_pub→field("pub")→string("userid");
    #He40PjQJxchxhxXU $parent_kind := $req→root_pub→string("kind");
    #xAdkhPaApu6SvVrz if `not` $parent_userid→equals($userid) then {
      #H9C7wxt2kqF2bdo8 if $pubkind→equals("script") then {
        #xwQsJANDGyR9fZWF $to_notify→set_at($parent_userid, "fork");
      }
      else { #DpozGcemCvihLO61 if $pubkind→equals("comment") then {
        #QBoQRB6S2PVSx6Qb if $parent_kind→equals("comment") then {
          #G8kRXI8lUMUMIIVD $to_notify→set_at($parent_userid, "reply");
        }
        else {
          #whylmGh9jAnbHUP8 $to_notify→set_at($parent_userid, "onmine");
        }
      }
      else {
        #dJ2qhzOSG5YGMHHe $to_notify→set_at($parent_userid, "onmine");
      }
      } 
    }
  }
  #AXo4io8hpOeF5byy $to_notify→set_at("all", "all");
  #ypEwA8Fq2ZeGNliU skip;
  #WhOShIn2Zo2Gmigr if $to_notify→count > 0 then {
    #xMRkn94iwZ4AvymJ $notification := records→pub_notification→create;
    #xVY6jjZHwkLhr3vX $notification→kind := "notification";
    #jbwCa42CR2pRslF4 $notification→id := @\u267b→cached_store→inv_seq_id→to_string;
    #xlfQtWz9LtACUZia $notification→time := $pub→number("time");
    #YasVQeRhsEUYZ1rs $notification→publicationid := $pub→string("id");
    #x9tmyHxV4p0zxlQL $notification→publicationkind := $pubkind;
    #DSCIEfsLiPWumDN4 $notification→publicationname := code→or_empty($pub→string("name"));
    #g8ig34Lo5cLo4mRG if `not` $req→root_pub→is_invalid then {
      #jUMCs2dl5hjPbEz9 $notification→supplementalid := $req→root_pub→string("id");
      #ArfVnPR6oatO759j $notification→supplementalkind := $req→root_pub→string("kind");
      #rZl4wSfgdgQ1UwSG $notification→supplementalname := code→or_empty($req→root_pub→field("pub")→string("name"));
    }
    #TRf8UnCe5OtXf1YK $notification→userid := $userid;
    #x169cgMaTrDrQiI6 skip;
    #ptwPA9oVL9GCtLZO $jsb2 := $notification→to_json→to_json_builder;
    #pBH3RszfSQdijEc9 $jsb2→set_string("RowKey", $notification→id);
    #fmnmJ0sbjgaqxYBu skip;
    #Pq0D7uAlT70pq865 $ids := $to_notify→keys;
    #xKnbcd6iDb2ZdevI @\u267b→parallel→@for($ids→count, $@action);
    #tLrHC2yQ0tzaXfkG where @action(x: Number) {
      #xN9h2STgUjQPAXW4 $id := $ids→at($x);
      #xi8GhQfWkc0uJdMk $jsb3 := $jsb2→clone;
      #xmqu5uwXSe4E94jL $jsb3→set_string("PartitionKey", $id);
      #NDe4KW4RcHsMbrIQ $jsb3→set_string("notificationkind", $to_notify→at($id));
      #qxWRqfXZGegbjZXp data→notifications_table→insert_entity($jsb3→to_json, "or merge");
      #nJQGk5ET3Mk0TuJ2 if `not` $id→equals("all") then {
        #x2xMP4wnL4vnY8F1 data→pubs_container→update($id, $update);
        #v9Dr4Bzj30ALklDB where update(entry: Json_Builder) {
          #i8rkUah4K8tL42UP $num := code→or_zero($entry→number("notifications"));
          #a00HbawaKpqP6YU5 $entry→set_number("notifications", $num + 1);
        }
      }
      #j1Wl7QT6TOxd1GWZ code→poke_sub_channel("notifications:" ∥ $id);
      #x22gSNBnBqgWm9BC code→poke_sub_channel("installed:" ∥ $id);
    }
  }
  meta private;
}
#fOzBdi1xP0qYD19A
var notifications_table : ♻ azure_table → @table {
  transient = true;
}
#Ru5xc2koDFxiTeF2
table pub_release {
  type = "Object";
  persistent = false;
  fields {
    #aA22YFIhRPaWTjLL kind : String
    #mg8RZKCApJ2U1sGl time : Number
    #xOBd4UfT330s2O4g id : String
    #Yk2RVaZcd0SHzWOl releaseid : String
    #NKOglLuJ5uyxj81A userid : String
    #rH69gjmJW8G7nCmU username : String
    #xWyv3hPEdUIF2EE8 userscore : Number
    #xlBHky5s45W2fzOE userhaspicture : Boolean
    #Vs5ZdNaFT2lhQ73o labels : Collection[ * release_label]
    #xm3ofs24HturO71o commit : String
    #IMyOkG7ep81iT4BM branch : String
    #KUT6RTai8beAj133 buildnumber : Number
    #nbNhfxDP4vupZ34x version : String
    #xeNWZAzpY0Ng9PJn name : String
  }
}
#IG4e2GTm1EADflV7
action \_init_releases() {
  #dz50iobRr1uNH4de data→curr_client_config := records→client_config→create;
  #Kg3Erid26QkTXQuR data→curr_client_config→searchApiKey := app→server_setting("AZURE_SEARCH_CLIENT_KEY", false);
  #HkYltQy2eJVZ4yiu data→curr_client_config→searchUrl := "https://" ∥ app→server_setting("AZURE_SEARCH_SERVICE_NAME", false) ∥ ".search.windows.net";
  #IbMbtk3FUg4NxM9t data→curr_client_config→rootUrl := app→server_setting("SELF", false)→replace_regex("/$", "");
  #Kb3rbiGejLvOUZVU data→curr_client_config→apiUrl := data→curr_client_config→rootUrl ∥ "/api";
  #tPJqsx2JtYYfYm2y // TODO client config: per user
  #hYVS02ey3OsQaBK4 data→curr_client_config→workspaceUrl := data→workspace_container→at(0)→blob_container→url ∥ "/";
  #JADx07B4LRqB4HXr data→curr_client_config→liteVersion := data→release_version_prefix ∥ ".r" ∥ data→rewrite_version;
  #u4xYXM6pX3aAYoyg data→curr_client_config→shareUrl := data→curr_client_config→rootUrl;
  #AQZ1UiqXEOoumQv5 data→curr_client_config→cdnUrl := data→pubs_container→blob_container→url→replace_regex("/pubs$", "");
  #NsMXryaxnxzEOjzz data→curr_client_config→primaryCdnUrl := code→with_default(app→server_setting("CDN_URL", true), data→curr_client_config→cdnUrl);
  #Z2EoeXz8Gnm4iFlK data→curr_client_config→altCdnUrls := collections→create_string_collection;
  #zIShJ5w5V4AieIz3 data→curr_client_config→altCdnUrls→add(data→pubs_container→blob_container→url→replace_regex("/pubs$", ""));
  #I4ui95ARrutzvoxG data→curr_client_config→altCdnUrls→add(data→curr_client_config→primaryCdnUrl);
  #iKj6cVM3e4V2EeWS data→curr_client_config→anonToken := data→basic_creds;
  #xY2TB5j56UJmi44l code→add_route("GET", "clientconfig", "", $handler);
  #tRMuBO6VGIg1nNQQ where handler(req: * api_request) {
    #fnpCdtNiFeuYDjCV $req→response := data→curr_client_config→to_json;
  }
  #xWQhulhdbqPRH2DR skip;
  #xeyzQ1TsxES8XPDQ data→releases := @\u267b→indexed_store→create_store(data→pubs_container, "release");
  #f1RB9LcKZyxr8ifR data→releases→set_resolve($resolution_callback2);
  #S2nqmtKWMlgw40tx where by_userid := true;
  #xDqFrndaE42xAVCz where resolution_callback2(fetch_result: ♻ indexed_store → fetch_result, api_request: * api_request) {
    #ZZ71a0NqBELoC1Nq code→add_username_etc($fetch_result);
    #ccUJSk7vcQ8gE2iF $coll := create→Collection_of→\u2339pub_release;
    #VQ2Pv4gITLqUZWfY $labels := records→release_label→create_collection;
    #lgfl7l6lWMtjmeyc $entry3 := data→settings_container→get("releases");
    #rVO44UDwg6uqt67a if `not` $entry3→is_invalid `and` `not` $entry3→field("ids")→is_invalid then {
      #mjpSSK0cWfhkoXJk $js := $entry3→field("ids");
      #W8bTNyX4gDsn9inn foreach k in $js→keys
      do {
        #ycEeeLUYnnEPkYlB $labels→add(records→release_label→create_from_json($js→field($k)));
      }
    }
    #CD4cbphQfBEJh4JH foreach jsb in $fetch_result→items
    do {
      #rp9WD3Oizt4b792R $rel := records→pub_release→create_from_json($jsb→field("pub"));
      #eqmPsn8R7vJuYGQT $rel→labels := $labels→@where( `fun:elt` $elt→releaseid→equals($rel→releaseid));
      #jU7ALPrjO3lRpqh4 $ver := code→or_empty($rel→version);
      #G3i8o4jXGXYeyzxs if $ver→is_empty then {
        #m1IY6O2J4T6FiADk $rel→name := $rel→releaseid→replace_regex(".*-", "");
      }
      else {
        #SsmqiynYszsHz1sc $rel→name := code→with_default($rel→branch, $rel→releaseid→replace_regex(".*-\\d*", "")) ∥ " " ∥ $ver;
      }
      #OTaYbTd2vX4pF2PE $coll→add($rel);
    }
    #ZeJZNn1WaWpkFtKF $fetch_result→items := $coll→to_json;
  }
  #sSpiEMPsYc6P2oJv code→add_route("POST", "releases", "", $handler2);
  #okXnm8F5Y8I0Taup where handler2(req: * api_request) {
    #AVKOFpMj1QiuDJf2 code→check_permission($req, "upload");
    #KSo9Nk06snEGkcbT if $req→status = 200 then {
      #xbGT7VmFNsZQRO9G $rel := records→pub_release→create;
      #Zk7jDKfi7V3D4lop $rel→userid := $req→userid;
      #vXGmTkTGPblj1GJ6 $rel→time := code→now_seconds;
      #xHUIWnzUWPmhSe9m $rel→releaseid := $req→body→string("releaseid");
      #xOFehheWAKkvZvvX $rel→commit := code→or_empty($req→body→string("commit"));
      #WlsXF1WlE3kOh9ie $rel→branch := code→or_empty($req→body→string("branch"));
      #W418se2zmIT4q8xL $rel→buildnumber := code→or_zero($req→body→number("buildnumber"));
      #fZd8E5EmwbZMx65x if code→looks_like_release_id($rel→releaseid) then {
        #djVmI8tctAcvW2lA data→settings_container→update("releaseversion", $update2);
        #pPvJnxbSNsHYlykn where update2(entry: Json_Builder) {
          #kvqh87jEU4Bj8522 $x := code→or_zero($entry→number(data→release_version_prefix)) + 1;
          #yPAoePZwLA2dVZa2 $entry→set_number(data→release_version_prefix, $x);
          #IXlElZnRNbFHwZCX $rel→version := data→release_version_prefix ∥ "." ∥ $x ∥ "." ∥ $rel→buildnumber;
        }
        #YvmfySYroFsGF4dG $key := "rel-" ∥ $rel→releaseid;
        #Hgn7xJTz5cZYM9uq $jsb := web→create_json_builder;
        #NZCboBFZfZ2e5GEV $jsb→set_field("pub", $rel→to_json);
        #SERCeYXllpFx4gYk code→generate_id($jsb, 5);
        #ByE4m2OeHT2nWg5P $ok := code→try_insert_pub_pointer($key, $jsb→string("id"));
        #NDYFrqRMEpM1qNJd if $ok then {
          #LaqwWP9C0jK28nkI data→releases→insert($jsb);
          #sCyrUL249EJkut38 data→releases→return_one_pub($jsb→to_json, $req);
        }
        else {
          #O1mQ6NW1vVLDsBUa $entry := code→get_pointed_pub($key, "release");
          #yOlJuReaOYvhsDZ0 data→releases→return_one_pub($entry, $req);
        }
      }
      else {
        #x65TkIopJlk3HnkV $req→status := @\u267b→restify→http→@412_Precondition_Failed;
      }
    }
  }
  #y9AUJsBrc5DC6VDT code→add_route("POST", "*release", "files", $handler2);
  #g3KzL4juXSX0yJza where size_check_excludes := "content";
  #xC9eTk16dGM106Mr where handler2(req: * api_request) {
    #jtXx241W4OPLLusZ code→check_permission($req, "upload");
    #OxxQtFWPyQjjdkBR if $req→status = 200 then {
      #dqRRZ5Ge7rPFnxSp $rel := records→pub_release→create_from_json($req→root_pub→field("pub"));
      #r3m7Mwotg1g2cn9m $body := $req→body;
      #vkYGRMd7gPSDneRe $buf := bits→string_to_buffer($body→string("content"), $body→string("encoding"));
      #jGJkW43l8oBriA8g $request := web→create_request(data→files_container→url ∥ "/overrideupload/" ∥ $body→string("filename"));
      #xfO1aIxKyvsgJjsI $response := $request→send;
      #r1qj2ZcwfTtksBmq if $response→status_code = 200 then {
        #hJL0bJDvYrTTmgDm $buf := $response→content_as_buffer;
      }
      #mRkWefmHfP2dRwJv $result := data→app_container→create_block_blob_from_buffer($rel→releaseid ∥ "/" ∥ $body→string("filename"), $buf);
      #ixLvgc11Y3rG7fXT where contentType := $body→string("contentType");
      #Clq4faRdrpZ92XKG $result := data→app_container→create_gzipped_block_blob_from_buffer($rel→releaseid ∥ "/c/" ∥ $body→string("filename"), $buf);
      #xDstNWRlFXIF2aeI where contentType := $body→string("contentType");
      #S04LEhAo9wQA9KTY where cacheControl := "public, max-age=31556925";
      #j2pNnlqUn4CPwDRi where smartGzip := true;
      #nu2BZi9HqrIVOrrU $req→response := web→json("{ \"status\": \"ok\" }");
    }
  }
  #m2dlLXxH4I7Ui4yy code→add_route("POST", "*release", "label", $handler2);
  #p6cEmk3oRxhEAdZu where handler2(req: * api_request) {
    #EASVyLV9FEWRNUIg $name := code→or_empty($req→body→string("name"));
    #LZqhEEGaB4ruodwa if `not` code→is_known_release_name($name) then {
      #qmuISQMiuCOv0y3V $req→status := @\u267b→restify→http→@412_Precondition_Failed;
    }
    #xOuQ2eusrfY4i4nV if $req→status = 200 then {
      #XiD0O5B1nzHKgWtu code→check_permission($req, "lbl-" ∥ $name);
    }
    #xKf2Fjod02j4L1f2 if $req→status = 200 then {
      #xvGgCn8SYrYtjwBn $rel := records→pub_release→create_from_json($req→root_pub→field("pub"));
      #GtjOd74UhoCqTFzd $lab := records→release_label→create;
      #xaSHkG4V7sDZHoYt $lab→name := $name;
      #vDnfuwLlH7IC9cMc $lab→time := code→now_seconds;
      #TbtY2abG2ZGtuHZ8 $lab→userid := $req→userid;
      #tA2J3gE66EfO19VM $lab→releaseid := $rel→releaseid;
      #Tc92xRklDwrqGgC0 $lab→relid := $rel→id;
      #P4dAktgxWuUTcUq8 $lab→numpokes := 0;
      #S45qk2CFnGAxvJtO code→audit_log($req, "lbl-" ∥ $lab→name);
      #XFA8OtqmKZxyBzDm data→settings_container→update("releases", $update);
      #jsa2ElGkgqsYp5wP where update(entry: Json_Builder) {
        #AxYpusL7IpAsRZno $jsb2 := $entry→field("ids");
        #iJdnUu7sBCSaWrtt if $jsb2→is_invalid then {
          #xrDoZQHentjGnn28 $jsb2 := web→create_json_builder;
          #TVBgBohE4b4pFvjb $entry→set_builder("ids", $jsb2);
        }
        #Soo1LHGEYoOGUJGo $jsb2→set_field($lab→name, $lab→to_json);
        #x97tIfeU0H54cZjH code→bare_increment($entry, "updatecount");
      }
      #Q72k7AHpPmlIK3Pi if $name→equals("cloud") then {
        #tsyxjTL9Nb6teDbD `async` code→poke_release($name, 15);
        #dYjJssnSfTyohP8d `async` code→deploy_compile_service($rel, $req);
      }
      #GGxOfC7qLDd0FeBS $req→response := web→json("{}");
    }
  }
  #D8Aj0rjvqhph7aSX code→add_route("POST", "upload", "files", $handler2);
  #BA2XkLzVvnojk0CB where size_check_excludes := "content";
  #dnPhJmucpWyBAarh where handler2(req: * api_request) {
    #ydMpmq5uQQzVJs31 if code→or_empty($req→body→string("filename"))→to_lower_case→starts_with("override") then {
      #ndvNDiyxMOalGuwL code→check_permission($req, "root");
    }
    else {
      #AcFu32D0XFE0PReo code→check_permission($req, "web-upload");
    }
    #iZf2hKCL4UborMDx if $req→status = 200 then {
      #IjRx42voCW5OXM3I $body := $req→body;
      #uZcXTVPDWgrX7Ruu $buf := bits→string_to_buffer($body→string("content"), $body→string("encoding"));
      #URb2OZo3FRArwvRQ $result := data→files_container→create_gzipped_block_blob_from_buffer($body→string("filename"), $buf);
      #ef6OJ55aCd2D4hq3 where contentType := $body→string("contentType");
      #xLoBT0Wrwpjkg85k where cacheControl := "public, max-age=3600";
      #NLznuc0sjVxWaBQw where smartGzip := true;
      #EB63vvG3Fn544tTj $req→response := web→json("{ \"status\": \"ok\" }");
    }
  }
  #ZjfuLz08Ggda9VEp skip;
  meta private;
}
#IhFUmsrMETze7F42
var releases : ♻ indexed_store → store {
  transient = true;
}
#S2H83D8BFvbr4shI
action check_permission(#OP1CzfYmuGZ49ILB req: * api_request, #EAPOPsCQzviDpikt perm: String) {
  #QksYr5J41b2Wpgp5 if $req→userid→is_empty then {
    #xfGt6H8Pq29NL7gz $req→status := @\u267b→restify→http→@401_Unauthorized;
  }
  else { #QB4SXVYzbcidsjxm if `not` code→has_permission($req→userinfo→json, $perm) then {
    #gPlhgWX5FlJ24Jih $req→status := @\u267b→restify→http→@402_Payment_Required;
  }
  else { } } 
  meta private;
  meta sync;
}
#rSJrPMBqFBn5nouC
var app_container : ♻ azure_blob_storage → Container {
  transient = true;
}
#qSF8JsMpj7hQ1QkS
var settings_container : ♻ cached_store → container {
  transient = true;
}
#jn2FSt8XPBxLOgd3
action looks_like_release_id(#ukah9DcvcORswXr5 s: String) returns(#I0qMcm6sdnX3vVBI b: Boolean) {
  #A934b3RlDM3c4vz4 $b := $s→is_match_regex("^\\d\\d\\d\\d\\d\\d\\d\\d\\d\\d[a-zA-Z\\d\\.\\-]+$");
  meta private;
  meta sync;
}
#xvnh2Jt50QFZcSQi
action serve_release(#v9h46bKKut9T4P2o req: ♻ restify → Request, #Cd56Q82bkxccHcb1 res: ♻ restify → Response) {
  #o6gCV5X7I9CBRkvo $coll := $req→url→@match("^([^\\?]+)(\\?.*)$");
  #aFMCPciR28ghaYDr $fn := $req→url;
  #HYqTlLaiuNiJCpK1 $query := "";
  #xf6zwF86lfD2TBbi if `not` $coll→at(1)→is_invalid then {
    #Gdpnb4oq26lFE8zs $fn := $coll→at(1);
    #t4k5WLiDAcCRW4xa $query := $coll→at(2);
  }
  #sd2koFxlGKpIGmVM $fn := $fn→replace_regex("^/app/", "");
  #BO7BtchwTWrLdQL6 if $fn→ends_with("/") then {
    #KepkVhg4wSPHAGWS $res→redirect(301, "/app/" ∥ $fn→replace_regex("/+$", "") ∥ $query);
    #IdKRmIl0na10baI7 `return` ;
  }
  #ELGnuqpwd02O9f0M $rel := data→main_release_name;
  #NxvFGE6taLv14qQN if code→is_known_release_name($fn) then {
    #xwbOZTFFGVbTCmf9 $rel := $fn;
    #lmGQ6f0b3sjKwX4G $fn := "";
  }
  #IroCzQKRTK8NSxo2 $rel := code→with_default($req→query→string("releaseid"), code→with_default($req→query→string("r"), $rel));
  #xdvyLw57t23iYcaU skip;
  #xioxuFldplYuSPMi $relid := "";
  #yfrY2uy24xo4wsY4 if code→looks_like_release_id($rel) then {
    #xowFcTXl2qVBNR5V $relid := $rel;
  }
  else {
    #xfU2VT3WxxrQ6f0j $entry := data→settings_container→get("releases");
    #CRuUIeLqv7YCesi3 $js := $entry→field("ids")→field($rel);
    #ZdugMo3HicXPYRta if $js→is_invalid then {
      #k4w5LgmKb6VTMyo5 $entry3 := code→get_pub($rel, "release");
      #PCwoqwbLOsU1Udqn if $entry3→is_invalid then {
        #Hj2k1Xo4V5qQyNQt $res→send_error(404, "no such release: " ∥ $rel);
      }
      else {
        #xLmyzXVQbchDMfpf $relid := $entry3→field("pub")→string("releaseid");
      }
    }
    else {
      #NidT8PL6k2qNatxT $relid := $js→string("releaseid");
    }
  }
  #kDaZWeI1BJo4nYZl if `not` $relid→is_empty then {
    #aQHandiBT6hsx057 if $fn→equals("") then {
      #qNKIniS2lcc2w1xx code→rewrite_and_cache($rel, $relid, "index.html", "text/html", $res, $rewrite);
      #AdwJ4wLPCcrMWKG6 where rewrite(text: String) returns (result: String) {
        #sPKniXCEloR2TSkY $ver := "";
        #iqI5w9vrwh1n2sYA $shortrelid := "";
        #SIjPKfQmS4ZRZix4 $relpub := code→get_pointed_pub("rel-" ∥ $relid, "release");
        #Zot4C6U8qBy2snIq $prel := records→pub_release→create_from_json($relpub→field("pub"));
        #bSexn2bj46FHKB4f $ccfg := code→client_config_for_release($prel);
        #YHKa7CHzdPdrYC6Y $ccfg→releaseLabel := $rel;
        #xYe0Pc2gJbebsfMc $ver := code→or_empty($relpub→field("pub")→string("version"));
        #t4isTtqwl5zPq9xb $shortrelid := $relpub→string("id");
        #WxjbMuGnaSeqb54u if data→basic_creds→is_empty then {
          #yQvA6DHsvmLLkfnE $text := $text→replace("data-manifest=\"\"", "manifest=\"app.manifest?releaseid=" ∥ web→encode_uri_component($rel) ∥ "\"");
        }
        else { #Ddb4siRE2X61zz3q if false then {
          #E4cLdWDe5D8Vd0L7 $text := $text→replace("data-manifest=\"\"", "manifest=\"app.manifest?releaseid=" ∥ web→encode_uri_component($rel) ∥ "&anon_token=" ∥ web→encode_uri_component(data→basic_creds) ∥ "\"");
        }
        else { } } 
        #bWZAC5mTL6i2cdXB $suff := "?releaseid=" ∥ web→encode_uri_component($relid) ∥ "\"";
        #gtld984J6Zl5Onu4 $text := $text→replace("\"browsers.html\"", "\"browsers.html" ∥ $suff);
        #x0zwX5Yiy732iWM8 $text := $text→replace("\"error.html\"", "\"error.html" ∥ $suff);
        #G5YxzwK2bi7W4pG6 $text := $text→replace("\"./", "\"" ∥ data→curr_client_config→primaryCdnUrl ∥ "/app/" ∥ $relid ∥ "/c/");
        #tt8C7nMU1K7ZNxoR $verPref := "var tdVersion = \"" ∥ $ver ∥ "\";\n" ∥ "var tdConfig = " ∥ $ccfg→to_json→format(2) ∥ ";\n";
        #RaqmCEiM4jOFMed9 $text := $text→replace("var rootUrl = ", $verPref ∥ "var tdlite = \"url\";\nvar rootUrl = ");
        #In8d3FZUtxcjRqAM if `not` $rel→equals("current") then {
          #azwfbryg4bdMo7y1 $text := $text→replace("betaFriendlyId = \"\"", "betaFriendlyId = \"beta " ∥ code→with_default($ver, $relid→replace_regex(".*-", "")) ∥ "\"");
        }
        #pPLfDs6eWlPgMmQU $result := $text;
      }
    }
    else { #sHvVzi5yOYpxU5ys if $fn→equals("app.manifest") then {
      #NWKGhN9Cj5oovu5N code→rewrite_and_cache($rel, $relid, $fn, "text/cache-manifest", $res, $rewrite);
      #xHpOGnQqenHhXJTg where rewrite(text: String) returns (result: String) {
        #V4uIxBoUkj2d4AIg $text := $text→replace("./", data→curr_client_config→primaryCdnUrl ∥ "/app/" ∥ $relid ∥ "/c/");
        #w4a2uCbyjvUlpcOn $text := $text ∥ "\n# " ∥ data→rewrite_version ∥ "\n";
        #kACtPwnuf5a35EM4 $result := $text;
      }
    }
    else { #rSKfjaUX2KWOprBP if $fn→equals("error.html") `or` $fn→equals("browsers.html") then {
      #LMqEl8hApDiNmtoq code→rewrite_and_cache($rel, $relid, $fn, "text/html", $res, $rewrite);
      #wiphVG22FZ2iB2cs where rewrite(text: String) returns (result: String) {
        #h2lRLKz0lZpc0lP2 $text := $text→replace("\"./", "\"" ∥ data→curr_client_config→primaryCdnUrl ∥ "/app/" ∥ $relid ∥ "/c/");
        #R0X6JE2L826e9Uf4 $result := $text;
      }
    }
    else {
      #xQzp0tvDY99Grq4x $res→send_error(404, "get file from CDN");
    }
    } } 
  }
  meta private;
}
#mGzoAruxZoC1DNif
action is_known_release_name(#x8itpe5q1xBhZkMX fn: String) returns(#k28p83SWKyjas4TZ b: Boolean) {
  #ti8xJ0s16nSzSp8h $b := $fn→is_match_regex("^(beta|current|latest|cloud)$");
  meta private;
  meta sync;
}
#ovqVtSfRVZstMFsX
var cache_rewritten : ♻ cached_store → container {
  transient = true;
}
#plE65ci8Lv4eu3Yu
var rewrite_version : Number {
  transient = true;
}
#cGN6ctkhwabO72Xj
action rewrite_and_cache(#WRa971UKMqh4YUT9 rel: String, #xU3A6GUtMH0PaWM2 relid: String, #kAzeY33vODdbtnDG src_file: String, #XNkxKhDi3eKK6Vv2 content_type: String, #uXubKI4Ij6vTv1C1 res: ♻ restify → Response, #o8f3wbcSErvn4sRD rewrite: * string_transformer) {
  #xGrzv0QJDLputn8E $path := $relid ∥ "/" ∥ $rel ∥ "/" ∥ data→my_channel ∥ "/" ∥ $src_file;
  #kUp0FHf8Hw4BXBMv $entry2 := data→cache_rewritten→get($path);
  #xSWm7Uj8zvrW9TQo if $entry2→is_invalid `or` $entry2→number("version") ≠ data→rewrite_version then {
    #YpNithXYzESvtgMa $lock := code→acquire_cache_lock($path);
    #Vwx24cczFO2pgBOQ if $lock→is_empty then {
      #xDEgENpt5Uy6IlNp code→rewrite_and_cache($rel, $relid, $src_file, $content_type, $res, $rewrite);
      #xOciVCXCvtS9GX9n `return` ;
    }
    #ZwyZ0SYnnAtDBiwy skip;
    #U1XIAm6y6ZIHxID4 $info := data→app_container→get_blob_to_text($relid ∥ "/" ∥ $src_file);
    #USpwQol8le2Z2BUu if $info→succeded then {
      #xPbrMRd1JdMkGAZJ $text := $rewrite→run($info→text);
      #cajQVkHGo6t9FLX1 data→cache_rewritten→update($path, $update);
      #szWeGxvLC5RiVbxP where update(entry: Json_Builder) {
        #xOx4pq6oHwDT87YG $entry→set_number("version", data→rewrite_version);
        #xcl0OzGBq4G6AY08 $entry→set_string("text", $text);
      }
      #lkWv4xmDSqGcExS8 $res→send_text($text, $content_type);
    }
    else {
      #BFqSVQVF02wVRUWC $res→send_error(404, "missing file");
    }
    #tH8ac4SZyiwXFdXe code→release_cache_lock($lock);
  }
  else {
    #BFyrQjOIeH641uEs $res→send_text($entry2→string("text"), $content_type);
  }
  #gzbyLJmkZEZ2ZxPU data→logger→measure("ServeApp@" ∥ $src_file, data→logger→context_duration);
  meta private;
}
#QG7GuQMTAu4jw8lz
action `type` string_transformer(#CvyQ9lZwxKU0qhAX text: String) returns(#L7eEC7j92YzU6g9O result: String) {
  #xe7Ei3fDQp9BRn6W skip;
}
#bs2OKPOLHgh1h3E2
table release_label {
  type = "Object";
  persistent = false;
  fields {
    #BK7LPACiUlmdNVkY name : String
    #D9KaXhoYRZl2OvTD userid : String
    #lNapgurlOo0yPaqH time : Number
    #xpO64K0pXHVhOIwi releaseid : String
    #XUfr6SudHmKHYV8D relid : String
    #KJLpLHR5aeXxdMkS numpokes : Number
  }
}
#cf3kaoGW1WZm2j1e
var tokens_table : ♻ azure_table → @table {
  transient = true;
}
#gs34dnUC9iE2urkP
var redis_client : ♻ redis → Client {
  transient = true;
}
#NCnKlDNZx0sW28qs
table token {
  type = "Object";
  persistent = false;
  fields {
    #KEr92PRcNs7N1e36 PartitionKey : String
    #Voi94e1G1cg6gbic RowKey : String
    #xStEZ1I7HTi368GA time : Number
    #aKjLHx4UvtR05Wo2 reason : String
    #xUxlbMUP1HRCDgp9 cookie : String
    #xFietCXfZtNk2K0G version : Number
  }
}
#Pa7rwbp03hv7stOe
action validate_token(#MSpxyj43Z9v2eJJq req: * api_request, #pnVyxZsfmxcTwF2A rreq: ♻ restify → Request) {
  #yVuhm24vNx7oPF76 code→refresh_settings;
  #IU1pX6yXDoVaTrY8 if $req→is_cached then {
    #TQcjFrwsZDakfVh2 `return` ;
  }
  #xJ01h9HiMqYbSAaX $token := code→with_default($rreq→header("x-td-access-token"), $req→query_options→string("access_token"));
  #qH2Gy3aaxfmHFpzb if `not` $token→is_invalid `and` `not` $token→equals("null") `and` `not` $token→equals("undefined") then {
    #Tf29kz7lJLvtdscf $token_js := invalid→json_object;
    #ajdWKLzgajUplUaK if $token→starts_with("0") `and` $token→count < 100 then {
      #iotonk77lEGyCk4D $value := data→redis_client→get("tok:" ∥ $token);
      #wUAtsQMuqhTnx1b6 if $value→is_invalid `or` $value→is_empty then {
        #etO8MTl6ghBHg45r $coll := $token→@match("^0([a-z]+)\\.([A-Za-z]+)$");
        #uFrmf7LK4WZ64drC if $coll→count > 1 then {
          #xKacM9VCnNlVRES5 $token_js := data→tokens_table→get_entity($coll→at(1), $coll→at(2));
          #VESOgxxMNIilsOOI if `not` $token_js→is_invalid then {
            #t2Pf3UVHiT4wpIcs data→redis_client→setpx("tok:" ∥ $token, $token_js→serialize, 1000 * 1000);
          }
        }
      }
      else {
        #NXc149TeclqgcPuM $token_js := web→json($value);
      }
    }
    #x6XT4AX4TgW2466E if $token_js→is_invalid then {
      #jd4YkAPgGG6cEcSn $req→status := @\u267b→restify→http→@401_Unauthorized;
    }
    else {
      #HzjlLNQyo71mvGRB $token2 := records→token→create_from_json($token_js);
      #qe40f32NR5Rr7JU5 if code→or_zero($token2→version) < 2 then {
        #xW2uZP32Mkz9R42c $req→status := @\u267b→restify→http→@401_Unauthorized;
        #yw1d5hfwrXfspPyp `return` ;
      }
      #PbMNfcPj7klF4ExY if `not` code→or_empty($token2→cookie)→is_empty then {
        #o8W1rwsXttE2MjA2 $ok := code→or_empty($rreq→header("cookie"))→contains("TD_ACCESS_TOKEN2=" ∥ $token2→cookie);
        #EvqP2ncRmeQD5BDT if `not` $ok then {
          #SQ8yqO4L5ct3Xkpn $req→status := @\u267b→restify→http→@401_Unauthorized;
          #xlOwAEKLDCWVvdnZ data→logger→info("cookie missing, user=" ∥ $token2→PartitionKey);
          #YSryMrcHlavk4WvZ `return` ;
        }
        #xkddL814iCzKFFJr $r := code→or_empty($rreq→header("referer"));
        #Sn8FO4Lge6mSF7ng if $r→starts_with("http://localhost:") `or` $r→starts_with(data→@self ∥ "app/") then {
          #ABQbuEl6zu5ECuvv skip;
        }
        else {
          #wJeINZpRe5lHYs0y $req→status := @\u267b→restify→http→@401_Unauthorized;
          #CTox4P1d4rfTgpeo data→logger→info("bad referer: " ∥ $r ∥ ", user = " ∥ $token2→PartitionKey);
          #EF0wICYBjyzpIMi7 `return` ;
        }
        #CtpyUb24xmDR2aQn // minimum token expiration - 5min
        #xvbej1b9GKPyT0Ef if `not` code→or_empty($token2→reason)→equals("code") `and` code→or_zero(data→the_service_settings→tokenExpiration) > 300 `and` code→now_seconds - $token2→time > data→the_service_settings→tokenExpiration then {
          #xfpmoF2MSsiXFX87 // Token expired
          #D1L6UNypPrRzNBII $req→status := @\u267b→restify→http→@401_Unauthorized;
          #FBxSrdNdPPk4iMcj `return` ;
        }
      }
      #e23gdkHRUl4yNjPa $uid := $token2→PartitionKey;
      #xz2fL9hC1qHxcLwc code→set_req_user_id($req, $uid);
      #c4rtm20NgyJC5aYJ if $req→status = 200 `and` code→or_false($req→userinfo→json→boolean("awaiting")) then {
        #iSJpQT9uEK4K0B0U $req→status := @\u267b→restify→http→@418_Im_a_teapot;
      }
      #xTfYgzvp0sVaZC2r if $req→status = 200 then {
        #xJVAP6d5UHeTyIpR $req→userinfo→token := $token2;
        #xSaJrXD0e4nCXn3Q $req→userinfo→ip := $rreq→remote_ip;
        #xr3RZYdSO6C86BEZ $uid2 := code→or_empty($req→query_options→string("userid"));
        #wVG2UuH4sKgLiFpk if `not` $uid2→is_empty `and` code→has_permission($req→userinfo→json, "root") then {
          #DUXLKO8BzdJKExA9 code→set_req_user_id($req, $uid2);
        }
      }
    }
  }
  meta private;
}
#Tbm2gne23kp41FVM
action token_string(#qB8ZvlDwqYXf29EZ token: * token) returns(#O9i1kMSAUcN5S77c custom_token: String) {
  #z08PWKs8DoKcvMrG $custom_token := "0" ∥ $token→PartitionKey ∥ "." ∥ $token→RowKey;
  meta private;
  meta sync;
}
#Mq12lTA738i4eCCU
table pub_audit_log {
  type = "Object";
  persistent = false;
  fields {
    #EfOaaLY4TVt39QuL kind : String
    #NNrS8KFRdXu2Z7Mn time : Number
    #x2yHMDAZojJKFeU2 type : String
    #xkQLsDSjyoxgk372 userid : String
    #g32EnPepUJ4442AZ subjectid : String
    #tej99CNSRh6fIkZS publicationid : String
    #IYwwAgv4s2Xt4ZZW publicationkind : String
    #tP4D6m2qzz2sAGed data : String
    #xIp8Y36eJOJreQU6 oldvalue : Json_Object
    #NlROPT4EaGb3ANvc newvalue : Json_Object
    #xg66TOs2zGEdhsMh ip : String
    #sRXFMGz7R1ByvKT2 tokenid : String
  }
}
#WDGhT6kmlSr29jYx
action audit_log(#jeWf9fwybvjr4g8V req: * api_request, #xpRBhdxBxaj9S5J7 type: String, #hao9D2Q6NTi7W55Q options\u003f: * pub_audit_log) {
  #G4H5P1aoQGpe0nuq $msg := $options\u003f;
  #fiF8gXPfNBepMef9 $msg→time := code→now_seconds;
  #xXksP8ai86EF6IKM if $msg→userid→is_empty then {
    #l2av4bHqmIGSqagr $msg→userid := $req→userid;
  }
  #EEtlGHa4l9W1GqqI $pubkind := "";
  #KyR2knDCz5BctBem if `not` $req→root_pub→is_invalid then {
    #fGJtpUS3l4lcSBxf $pubkind := code→or_empty($req→root_pub→string("kind"));
  }
  #uLvXzabqHP3krFDX if $pubkind→equals("user") `and` $msg→subjectid→is_empty then {
    #MD6cgsFoCnxhK2be $msg→subjectid := $req→root_id;
  }
  #xAb5EnwdizCxZ4MW if $msg→publicationid→is_empty then {
    #EzGSjCsPZ7703X4c $msg→publicationid := $req→root_id;
    #xx4QMK4YsnZdJ1hz $msg→publicationkind := $pubkind;
    #FyUUiE7xHo52Ynkv if $msg→subjectid→is_empty `and` `not` $pubkind→is_empty then {
      #v2wqYsIYmjF2318X $msg→subjectid := code→or_empty($req→root_pub→field("pub")→string("userid"));
    }
  }
  #LLJkATf6lPWuDOV7 if `not` $req→userinfo→token→is_invalid then {
    #Dy2Z22dBlji4J5b5 $msg→tokenid := code→sha256(code→token_string($req→userinfo→token))→substring(0, 10);
  }
  #CNYMvfvTruy55ubX $msg→type := $type;
  #P26s8cEmI1ivmyVa $msg→ip := code→encrypt($req→userinfo→ip, "AUDIT");
  #eZZtPMDwwtjciOiT if false then {
    #bIX2Ss0NlJMHEBng $msg→oldvalue := code→encrypt_json($msg→oldvalue, "AUDIT");
    #ntMRkIqKGZdrhc7D $msg→newvalue := code→encrypt_json($msg→newvalue, "AUDIT");
  }
  #Fqfr0r2TOJUQUIOV $jsb := web→create_json_builder;
  #yXEylb8sNOGH2OE8 $jsb→set_string("id", @\u267b→azure_table→create_log_id);
  #tJhJOpelcSTRtEHR $jsb→set_field("pub", $msg→to_json);
  #AiixNfZCNpeuhXua data→audit_store→insert($jsb);
  meta private;
}
#z6XUM1faf8nSK6mz
action throttle(#VzPTPmcX0ZA6TXwf req: * api_request, #NeQKg2KfzNiVtFHW kind: String, #Amh27LpRat64UGNW token_cost_\u005bs\u005d: Number) {
  #iyar8DithAgm3S2a if `not` data→throttle_disabled `and` $req→status = 200 then {
    #X8YJgNiacwMeo94U if code→caller_has_permission($req, "unlimited") then {
      #LyZq452wMcGnEOtQ `return` ;
    }
    #S81LoqNjmiCy7oA8 $drop := code→throttle_core(code→with_default($req→userid, $req→throttle_ip) ∥ ":" ∥ $kind, $token_cost_\u005bs\u005d);
    #ATrrmjCcDcgKjkjl if $drop then {
      #yk1Yy24lXZckUIUC $req→status := @\u267b→restify→http→@429_Too_Many_Requests;
    }
  }
  meta private;
}
#lng5KjCLOTzVprpg
var files_container : ♻ azure_blob_storage → Container {
  transient = true;
}
#rlnZop9z2a8wYgA7
table pub_webfile {
  type = "Object";
  persistent = false;
  fields {
    #xJA9X4ILfvRLEYbI kind : String
    #Fk5rIiEgsl28lAsr time : Number
    #y52y7jB7hpr44UbD id : String
    #Sq48CdgonfFyxTny userid : String
    #ok2pbIU3tVGXyjKV username : String
    #TcdctK09vx2FYiZf userscore : Number
    #Tq7Zsd75vTfCF7du userhaspicture : Boolean
    #Cuali53O6iX7scv0 userplatform : Collection[String]
    #VLXAl21yfsVuczUC filename : String
    #xifZJZ5K9KvH575J contenttype : String
    #sx0YoK4fTFi5f8VJ labels : Collection[String]
    #oowLgz4riWaYy4uy rawurl : String
  }
}
#G55pnk15U1zaTThM
action rewrite_and_cache_pointer(#DbgaWv5IgPbcIvwl id: String, #zuk5WQXpQtQktoOI res: ♻ restify → Response, #MXI270jy07Ad5Og7 rewrite: Action1[Json_Builder]) {
  #RJq7ESPtPIdARJ3o $path := "ptrcache/" ∥ data→my_channel ∥ "/" ∥ $id;
  #xtqWk4tbc5iUIJci $entry2 := data→cache_rewritten→get($path);
  #bZJIQc1biLLCED4X $ver := code→get_cloud_relid(true);
  #i43T47TG9O4KYPUj skip;
  #PpUHxc6kBWsiKPef $@event := "ServePtr";
  #ccOSEwRpQhZlGHF3 $cat := "other";
  #yejbj6nrW2gLUCaF if $id→equals("ptr-home") then {
    #TdnZx3dgETF6VQRK $cat := "home";
  }
  else { #Qu8JP2dR7OKVS52F if $id→starts_with("ptr-preview-") then {
    #Fne0m1eMat9b3INy $cat := "preview";
  }
  else { } } 
  #odf42AyvPPHMj7k9 if $entry2→is_invalid `or` `not` $entry2→string("version")→equals($ver) `or` (code→or_zero($entry2→number("expiration")) > 0 `and` $entry2→number("expiration") < code→now_seconds) then {
    #xlR0f5qQu2KBDRS4 $lock := code→acquire_cache_lock($path);
    #c5iia7Ewm1ZuJ8TB if $lock→is_empty then {
      #JoUedcw1XaamPXhB code→rewrite_and_cache_pointer($id, $res, $rewrite);
      #AFA97aZZLIc40hGV `return` ;
    }
    #DdLcVQNltoZdQsDJ skip;
    #wdq93F1y6VYJgyFN code→cache_cloud_compiler_data($ver);
    #CpqP40A1Zb2VJGq7 skip;
    #l5JVVcUlPMQBDis3 $jsb := web→create_json_builder;
    #xtOU1LUVNR44iucY $jsb→set_string("contentType", "text/html");
    #xw2W3OQE1j4Ra4LC $jsb→set_string("version", $ver);
    #FbHeiZYoPOrJlR7c $jsb→set_number("expiration", code→now_seconds + math→random_range(2000, 3600));
    #b4zhsjfb6IH93Sh2 $jsb→set_number("status", 200);
    #PaakPpEtXiGGjaMI $rewrite→run($jsb);
    #bjvtYgmmJ22LRCr7 $entry2 := $jsb→to_json;
    #xpsiKVxt8xtxXakS skip;
    #lLUwwMvHoberJd2d if $jsb→string("version")→equals($ver) then {
      #SFSXuC0upaRzaKTU data→cache_rewritten→update($path, $update);
      #x62QIdYNCNWxZjW9 where update(entry: Json_Builder) {
        #elN6FwFswVOgBAeG code→copy_json($entry2, $entry);
      }
    }
    #Tsw5UTDKlSm4GUxP code→release_cache_lock($lock);
    #Dev6oVqcAG3A5HS1 $@event := "ServePtrFirst";
  }
  #xm2svvibtwronpaS skip;
  #GrwAxLhzhTxjy3ta if $res→finished then {
    #xBYdmEgTsClN6jG7 `return` ;
  }
  #qjaFUO5XB78wGdv4 $redir := code→or_empty($entry2→string("redirect"));
  #xfgYVsA0DakCD9fk if $redir→is_empty then {
    #LR12J8D4oFyy2H2y $status := code→or_zero($entry2→number("status"));
    #dVhMl64xniSd3f9H if $status = 0 then {
      #SB7CVpkvN2KpZpUb $status := 200;
    }
    #g1QDAtoeTVOIO204 if false then {
      #a16JvDE2ki373STm $res→set_header("X-TDlite-cache", $@event);
    }
    #HNIt2y2R9tAWCWho $res→send_text($entry2→string("text"), $entry2→string("contentType"));
    #gkfYedXmTEAf1DGy where status := $status;
    #p3X3tctVg9ETLDTA if code→or_false($entry2→boolean("error")) then {
      #WKSPeVjMNSS2dayX $cat := "error";
    }
    #IG0OaARPuIx2MWfp data→logger→debug("serve ptr2: " ∥ $@event ∥ " " ∥ $cat ∥ " " ∥ $path);
    #zIqspmwR6nRsrNd0 data→logger→measure($@event ∥ "@" ∥ $cat, data→logger→context_duration);
  }
  else {
    #xCvk30xcI9QAIOiU $res→redirect(302, $redir);
  }
  meta private;
}
#xpW52Q2ECo44OhMQ
action serve_pointer(#CPOvj7oIo4QZiwjr req: ♻ restify → Request, #Sk1MR0q9JN7ktvr5 res: ♻ restify → Response) {
  #xxRWXjKimlUgCYya $lang := code→handle_language($req, $res, true);
  #F6EIBjhlW79n5UwV $fn := $req→url→replace_regex("\\?.*", "")→replace_regex("^/", "")→replace_regex("/$", "")→to_lower_case;
  #IIlGg1C7U9lQ4gAa if $fn→is_empty then {
    #amhbrEQwrqDvng4i $fn := "home";
  }
  #qCRjZKHiMYlbKwPq $id := code→path_to_ptr($fn);
  #I2fGMzgv0Ny6472E $path_lang := code→or_empty($id→@match("@([a-z][a-z])$")→at(1));
  #ejpRV0XtmiwhY52R if `not` $path_lang→is_empty then {
    #dYB34Ofcnskemhi9 if $path_lang→equals(data→the_service_settings→defaultLang) then {
      #v2PQgAhXS4C4t4Y0 $id := $id→replace_regex("@..$", "");
      #sCfWVx9SyExjIn71 $lang := "";
    }
    else {
      #uknitQzchfXN6eEy $lang := "@" ∥ $path_lang;
    }
  }
  #MHt1AATOPWfLYXxI if `not` data→template_suffix→is_empty `and` data→the_service_settings→envrewrite→contains_key($id→replace_regex("^ptr-", "")) then {
    #qG7vhSI7dLDleQzr $id := $id ∥ data→template_suffix;
  }
  #PWowXuRwy8RciRXJ $id := $id ∥ $lang;
  #oWpWq4vTzJgxrest skip;
  #yzx1KrjL6M34RRRB code→rewrite_and_cache_pointer($id, $res, $lambda);
  #xg8fTR38QudyZv39 where lambda(v: Json_Builder) {
    #CA1U4FmMsKX2TH3x $pubdata := web→create_json_builder;
    #ImBeeWW8RJZa1MFb $templatename := "templates/official-s";
    #wcCuKyocTHHujCuk $msg := "";
    #xrS2X0mj2C6CDdjf $v→set_string("redirect", "");
    #buRFbZVCZKKqf4U3 $v→set_string("text", "");
    #f8bS42DeHdNfrwLm $v→set_boolean("error", false);
    #xiCCLvJTKVgiWYq6 $pubdata→set_string("webpath", $fn);
    #xkEVNvG2mS2eg5Fw $pubdata→set_string("ptrid", $id);
    #iBS0e1NmCEbQfgjB $existing := code→get_pub($id, "pointer");
    #qIHfNtX5s5MkI54t if $existing→is_invalid `and` $id→is_match_regex("@[a-z][a-z]$") then {
      #i7PrNkoTB4oEUofq $existing := code→get_pub($id→replace_regex("@..$", ""), "pointer");
    }
    #xNMijZ0NEPo0zf1q if $existing→is_invalid then {
      #Mi12d91xTfp0t5es if false `and` $fn→starts_with("docs/") then {
        #TMrpp4VBL2c1fMBo $docid := $fn→replace_regex("^docs/", "");
        #FLd3gNV9PgBiuADt $doctopic := data→doctopics_by_topicid→field($docid);
        #wQ9lNGpKmvO4oKr8 if `not` $doctopic→is_invalid then {
          #DGNRbnk4eULLs4XL $pubdata := $doctopic→to_json_builder;
          #xtC7k4lZ4f2EWmwJ $html := code→topic_list($doctopic, "", "");
          #auDlnxdaVhg19MQF $pubdata→set_string("topiclist", $html);
          #WGPeVBu8VMbYUyN4 $resp := code→query_cloud_compiler($fn);
          #Wn1rFl78K8hwm4Sc if `not` $resp→is_invalid then {
            #VjiH4vMvgZ7X5yxE $pubdata→set_string("body", $resp→string("prettyDocs"));
          }
          else {
            #NVPEiQVSyb5GmlpF $msg := "Rendering docs failed";
          }
        }
        else {
          #v3hNwAdsvr3sOCck $msg := "No such doctopic";
        }
      }
      else { #G6c6ZQoYjlDEFSwh if $fn→starts_with("u/") then {
        #P1tFybW26D4P3Mw3 $v→set_string("redirect", $fn→replace_regex("^u/", "/usercontent/"));
        #hSmrgXojva6vW6w3 `return` ;
      }
      else { #xnGy5pveDz5zbELQ if $fn→starts_with("preview/") then {
        #J8cHH8dip0y73YDP $docid := $fn→replace_regex("^preview/", "");
        #UaeqkbffJKY4noIc $done, $templatename, $msg := code→render_script($docid, $v, $pubdata);
        #YdRuFNqmOBUDI2wf if $done then {
          #jQVrBoScKBZ17iWb `return` ;
        }
      }
      else { #cXrws9qF1qiq6LkD if $fn→is_match_regex("^[a-z]+$") then {
        #LxXhLGGWiV4ik4Rj $entry := data→pubs_container→get($fn);
        #vNEKvgzcmQEV4pnd if $entry→is_invalid `or` code→with_default($entry→string("kind"), "reserved")→equals("reserved") then {
          #MIULIfgEX52IUzgJ $msg := "No such publication";
        }
        else {
          #xopjeLYqtyFootL4 $v→set_string("redirect", "/app/#pub:" ∥ $entry→string("id"));
          #Zx6mo74RxxFEy7nH `return` ;
        }
      }
      else {
        #TrwtL40N44O5jziT $msg := "No such pointer";
      }
      } } } 
    }
    else {
      #ZTNlHCdJ9OwpQw9e $ptr := records→pub_pointer→create_from_json($existing→field("pub"));
      #vB765J6R3VaCbnf1 if code→or_empty($ptr→redirect)→is_empty then {
        #ARic5U0uIoyl3vs5 if code→or_empty($ptr→artid)→is_empty then {
          #RVJbqyry4yhH6NUd $scriptid := $ptr→scriptid;
          #zQdSYby5JXIwTEmG $done, $templatename, $msg := code→render_script($ptr→scriptid, $v, $pubdata);
          #DapQ6CPuVrUTslJs if $done then {
            #jnMFIHf2GIP1OpTO `return` ;
          }
          #IfhMI27aAbSilhI5 $path := $ptr→parentpath;
          #sLzxeVIxXbV5lkKE $breadcrumb := $ptr→breadcrumbtitle;
          #WrKJCYDoH0QXpAUm $sep := "&nbsp;&nbsp;»&nbsp; ";
          #xJLbkuapxXZNqk2H for 0 ≤ i < 5 do {
            #svGHfm5WlFaaSBQR $par_json := code→get_pub(code→path_to_ptr($path), "pointer");
            #xJQTpDOhJuQJaffH if $par_json→is_invalid then {
              #dYpmdDHGHC70kD3I `break` ;
            }
            #AuHJx4lU6o6Ad2eF $parptr := records→pub_pointer→create_from_json($par_json→field("pub"));
            #rxUI2UOVW2uwXxMS $breadcrumb := "<a href=\"" ∥ code→html_quote("/" ∥ $parptr→path) ∥ "\">" ∥ $parptr→breadcrumbtitle ∥ "</a>" ∥ $sep ∥ $breadcrumb;
            #xy3TvlKk5qC9AGdP $path := $parptr→parentpath;
          }
          #JrAGhOCoulXE2Y6v $breadcrumb := "<a href=\"/home\">Home</a>" ∥ $sep ∥ $breadcrumb;
          #KQXXWDg264el4g2s $pubdata→set_string("breadcrumb", $breadcrumb);
        }
        else {
          #uykGakZsjCplaJDF $cont := code→or_empty($ptr→artcontainer);
          #WO2gBDxpGCSCZS4r $cont := "";
          #xKlIIoGZqyitoLM8 if data→thumb_containers→@where( `fun:elt` $elt→name→equals($cont))→count = 0 then {
            #kt9RtAqiroIQxVCU $cont := "pub";
          }
          #Kzoyhsx5hg4SYoLi $v→set_string("redirect", data→curr_client_config→primaryCdnUrl ∥ "/" ∥ $cont ∥ "/" ∥ $ptr→artid);
          #UPSLb0aPbbsIkvEH `return` ;
        }
      }
      else {
        #ltHspO27JpjJjf2d $v→set_string("redirect", $ptr→redirect);
        #BPW7Bv2Dad6GStpR `return` ;
      }
    }
    #xPOwBupfsfMltFnV skip;
    #wx4A2e2DhSO2xakF $pubdata→set_string("css", data→doctopics_css);
    #Lw8HQaBrjia4PJxM $pubdata→set_string("rootUrl", data→curr_client_config→rootUrl);
    #xxTe6wHdUEfxOtuZ if `not` $msg→is_empty then {
      #f4CGrNOEcWIGneDB $templatename := "templates/official-s";
    }
    #P2rl5sf9fnHa4TPd $templ_text := code→get_template_text($templatename ∥ data→template_suffix, $lang);
    #qkP44wc3JkgyjoqX if $msg→is_empty `and` $templ_text→count < 100 then {
      #xbZQru3byPLd5MeZ $msg := $templ_text;
    }
    #Lwe6NGvLc4Zh1fA0 if $templ_text→count < 100 then {
      #xpRMLK41jdDWnyBz $v→set_string("text", $msg);
      #x13d7uFihxHj720Y $v→set_string("version", "no-cache");
    }
    else {
      #Peqxe0igG3t1b2Da if `not` $msg→is_empty then {
        #K5Zudv2uTOTL2pVK if false then {
          #gxa4DuvvlF3gHJg1 $v→set_string("version", "no-cache");
        }
        #fcTLc7cqL2LgAvSN $v→set_number("expiration", code→now_seconds + 5 * 60);
        #x57luSjktZj72x4o if $msg→starts_with("No such ") then {
          #VFBipLANIS2OrwKB $pubdata→set_string("name", "Sorry, the page you were looking for doesn’t exist");
          #KviL1nT6czlV4pIU $v→set_number("status", 404);
        }
        else {
          #aUvHkWdRNKWJhka0 $pubdata→set_string("name", "Whoops, something went wrong.");
          #izRoHoA0R2fB9g49 $v→set_number("status", 500);
        }
        #bCMi44L9bR2tILG8 $pubdata→set_string("body", code→html_quote("Error message: " ∥ $msg));
        #SFQMoOKWLf2CJeRq $v→set_boolean("error", true);
        #x955JcfvK9GhyrN2 $text := code→simple_pointer_cache("error-template", $lang);
        #iVck8A08ecZ4H2rJ if $text→count > 100 then {
          #OmhWvSJhOYiL4hbe $templ_text := $text;
        }
      }
      #CNgFSSXxCt8r6Z6Y $v→set_string("text", @\u267b→tdlite_docs→format($templ_text, $pubdata));
    }
  }
  meta private;
}
#hGqoW4XmcDTnba0n meta import server_auth {
  guid "7aebe9fd-4bd2-4d43-b27e-1ef3a2496fb8"
  usage {

    action `async` `type` make_url_callback(req: ♻ restify → Request, p: ♻ server_auth → oauth_request) returns(url: String)

    action `async` `type` make_user_info(profile: Json_Object) returns(info: ♻ server_auth → User_Info)

    action `async` `type` get_profile(req: ♻ restify → Request, p: ♻ server_auth → oauth_request) returns(profile: Json_Object)

    action `async` `type` make_jwt(profile: ♻ server_auth → User_Info, oauth_req: ♻ server_auth → oauth_request) returns(jwt: Json_Builder)

    action `async` `type` get_data(key: String) returns(value: String)

    action `async` `type` set_data(key: String, value: String)

    action `async` `type` pre_dialog(req: ♻ restify → Request, res: ♻ restify → Response)

    action `async` `type` get_provider_template() returns(template: String)

    action `async` `type` error_callback(res: ♻ restify → Response, msg: String)
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
        #TTmhSVZ1yy49CTVS \_client\_oauth : ♻ server_auth → client_oauth
        #eJtqudH2eBoc1bnM \_info : ♻ server_auth → User_Info
      }
    }
    #FxqhQupnFJxSRTiG
    table Provider_Options {
      type = "Object";
      exported = true;
      persistent = false;
      fields {
        #xp6NtFZ1QXkcIauL make_custom_token : ♻ server_auth → make_user_info
      }
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
    #HumOMfpsJuidLPxO
    table Init_Options {
      type = "Object";
      exported = true;
      persistent = false;
      fields {
        #i2vBgt28layvSxIe pre_dialog : ♻ server_auth → pre_dialog
        #Py4AkhEc34EYTjPT make_jwt : ♻ server_auth → make_jwt
        #xsy8g9IDrOeQOvjV get_data : ♻ server_auth → get_data
        #n6TWsvrZL0XpsYwd set_data : ♻ server_auth → set_data
        #TqHdNfOe1TLCq9f5 federation_master : String
        #GjBXQ888k5AuBKsq federation_targets : String
        #KV72gq9UpIvZDZKS @self : String
        #ONxoqGvFgx2kXpJK request_email : Boolean
        #HcOMOwJ4k0Ju5Jcj get_provider_template : ♻ server_auth → get_provider_template
        #xzpey544mPHc6OW1 error_callback : ♻ server_auth → error_callback
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

    action `sync` init(options\u003f: ♻ server_auth → Init_Options)
    action `sync` to_query_string(params: Json_Object) returns(query: String)
    action `sync` add_azure_ad_client_only(options\u003f: ♻ server_auth → Provider_Options)
    action `sync` add_live_id(options\u003f: ♻ server_auth → Provider_Options)
    action `sync` decode_token(token: String) returns(tok: Json_Object)
    action `sync` add_facebook(options\u003f: ♻ server_auth → Provider_Options)
    action `sync` add_google(options\u003f: ♻ server_auth → Provider_Options)
    action `sync` add_edmodo(options\u003f: ♻ server_auth → Provider_Options)
    action `sync` add_azure_ad(options\u003f: ♻ server_auth → Provider_Options)
    action `sync` validate_oauth_parameters(req: ♻ restify → Request, res: ♻ restify → Response)
    action `sync` options() returns(auth_options: ♻ server_auth → Init_Options)
    action `async` user_info_by_state(state: String) returns(info: ♻ server_auth → User_Info)
    action `sync` setup_restify_server()
    action `sync` provider_links(query: Json_Object) returns(links2: Json_Builder)
  }
  #WvxJ23dNjLwKrJW5 resolve restify = ♻ restify with {
  }
  #cdvQJg0SAuJ2Eerx resolve node_jwt_simple = ♻ node_jwt_simple with {
  }
}
#xMkR7ZFaVazTySF6 meta import node_jwt_simple {
  guid "4d60d629-04a8-4f8e-f17b-5766ab38c0a9"
  usage {

    action `sync` encode(payload: Json_Object, secret: String, algorithm: String) returns(jwt: String)
    action `sync` decode(jwt: String, pub_key: String) returns(payload: Json_Object)
    action `sync` decode_no_verify(jwt: String) returns(payload: Json_Object)
  }
}
#ifdiJvsjgpzoZv4x
var enter_code\u002ehtml : String {
  is\_resource = true;
  url = "data:text/plain;base64,PHNjcmlwdD4KZnVuY3Rpb24gb25jb2RlKCkgewogIHZhciBpbnAgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgiY29kZSIpCiAgc2V0dXJsKCImdGRfc3RhdGU9IiArIGVuY29kZVVSSUNvbXBvbmVudChpbnAudmFsdWUpKQp9CmZ1bmN0aW9uIG9udGVhY2hlcigpIHsKICBzZXR1cmwoIiZ0ZF9zdGF0ZT10ZWFjaGVyIikKfQoKKGZ1bmN0aW9uKCkgewogIHZhciBtID0gL3ZhbGlkYXRlZF9jb2RlPShbXj8mXSspLy5leGVjKHVybCkKICBpZiAobSkgewogICAgbG9jYWxTdG9yYWdlWyd2YWxpZGF0ZWRfY29kZSddID0gbVsxXQogICAgd2luZG93LmxvY2F0aW9uID0gd2luZG93LmxvY2F0aW9uLmhyZWYucmVwbGFjZSgiL29hdXRoL2RpYWxvZyIsICIvb2F1dGgvbG9naW4iKQogIH0KfSgpKQo8L3NjcmlwdD4KPGRpdiBzdHlsZT0nbWFyZ2luOiAwIGF1dG87IHdpZHRoOiAzMTBweDsgIHRleHQtYWxpZ246IGNlbnRlcjsnPgo8aDEgc3R5bGU9J2ZvbnQtc2l6ZTozZW07IGZvbnQtd2VpZ2h0Om5vcm1hbDsnPkVudGVyIGNvZGU8L2gxPgo8ZGl2IHN0eWxlPSdjb2xvcjpyZWQ7IG1hcmdpbjogMWVtIDAnPkBNU0dAPC9kaXY+CjxpbnB1dCB0eXBlPSJ0ZXh0IiBpZD0iY29kZSIgY2xhc3M9ImNvZGUiLz48YnIvPgo8YSBocmVmPSIjIiBjbGFzcz0icHJvdmlkZXIiIG9uY2xpY2s9Im9uY29kZSgpIj5HbzwvYT48YnIvPgo8YSBocmVmPSIjIiBvbmNsaWNrPSJvbnRlYWNoZXIoKSI+SSdtIGFuIGFkdWx0PC9hPjxici8+CjwvZGl2PgoK";
  transient = true;
}
#MPtmVqflH72qfAuS
var template\u002ehtml : String {
  is\_resource = true;
  url = "data:text/plain;base64,PCFET0NUWVBFIGh0bWw+CjxodG1sPgo8aGVhZD4KPG1ldGEgbmFtZT0idmlld3BvcnQiIGNvbnRlbnQ9IndpZHRoPTMyMC4xIiAvPgo8bWV0YSBodHRwLWVxdWl2PSJYLVVBLUNvbXBhdGlibGUiIGNvbnRlbnQ9IklFPWVkZ2UiIC8+Cjx0aXRsZT5TaWduIGluPC90aXRsZT4KPHN0eWxlPgppbnB1dC5jb2RlLAoucHJvdmlkZXIgewogICBwYWRkaW5nOiAwLjdlbTsKICAgdGV4dC1kZWNvcmF0aW9uOiBub25lOwogICB3aWR0aDogMzEwcHg7CiAgIGRpc3BsYXk6IGJsb2NrOwogICBtYXJnaW46IDAgYXV0bzsKICAgZm9udC1zaXplOiAxNnB4OwogICBmb250LWZhbWlseTogaW5oZXJpdDsKICAgYm94LXNpemluZzogYm9yZGVyLWJveDsKfQoucHJvdmlkZXIgewogIGNvbG9yOiB3aGl0ZTsKICBiYWNrZ3JvdW5kOiAjMjk4NkUwOwp9Cjwvc3R5bGU+Cjxib2R5IGlkPSdyb290JyBzdHlsZT0nZm9udC1zaXplOjE2cHg7IGZvbnQtZmFtaWx5OnNhbnMtc2VyaWY7Jz4KPHNjcmlwdD4KQEpTQAo8L3NjcmlwdD4KCkBCT0RZQAo8L2JvZHk+CjwvaHRtbD4K";
  transient = true;
}
#xc2MV4DcVvKUOww4
action \_init_login() {
  #USFD9g4Lg43ychrU $jsb := web→create_json_builder;
  #qiJw2hvPmm7o1FGX $jsb→set_string("activate", art→template\u002ehtml→replace("@BODY@", art→activate\u002ehtml));
  #xCjK3QCOYsvZZUuL $jsb→set_string("kidcode", art→template\u002ehtml→replace("@BODY@", art→enter_code\u002ehtml));
  #xC2iCIpy9dWZTkaG $jsb→set_string("kidornot", art→template\u002ehtml→replace("@BODY@", art→kid_or_not\u002ehtml));
  #LG62gUJlMI85HeMD $jsb→set_string("newuser", art→template\u002ehtml→replace("@BODY@", art→newuser\u002ehtml));
  #XQTIRY2RN5iEA3Gj $jsb→set_string("agree", art→template\u002ehtml→replace("@BODY@", art→agree\u002ehtml));
  #vrQJ0cN3b6XUk1qx $jsb→set_string("usercreated", art→template\u002ehtml→replace("@BODY@", art→user\u002dcreated\u002ehtml));
  #Mw6tw2nN9X4reRWm $jsb→set_string("providers", "");
  #i4xhpPYxMei7U1cC data→login_html := $jsb→to_json;
  #qOD90n3xAWZGk6bb skip;
  #xZJMbRHJzkyPsoaO @\u267b→server_auth→init;
  #MWx7y5CVQJwNp2bn where `optional` make_jwt(profile: ♻ server_auth → User_Info, oauth_req: ♻ server_auth → oauth_request) returns (jwt: Json_Builder) {
    #vSHIrVwMnR8dYUOi $url2 := code→login_federated($profile, $oauth_req);
    #v4JDK2ktkmhhKFcf $url3, $cook := code→strip_cookie($url2);
    #hxm2U7QLQBqpjpfF $jsb2 := web→json("{ \"headers\": {} }")→to_json_builder;
    #VUyVnzvSHvyYu4kq if `not` $cook→is_empty then {
      #dB3nYPb8xvkIsFGv $jsb2→field("headers")→set_string("Set-Cookie", $cook);
    }
    #xaN5gBp72leDpEZm $jsb2→set_string("http redirect", $url3);
    #gQmqzmDyjgDTOeT4 `return` $jsb2;
  }
  #qMgBEo2LVFKwQByH where `optional` get_data(key: String) returns (value: String) {
    #pvG24zbmC6c2YegT $value := data→redis_client→get("authsess:" ∥ $key);
  }
  #HvIF9hmNPyBQrWkM where `optional` set_data(key: String, value: String) {
    #xDamc0UT6PwKtr1Z $minutes := 30;
    #q490Mqi9jMY288WE data→redis_client→setpx("authsess:" ∥ $key, $value, $minutes * 60 * 1000);
  }
  #xEeM4SE4AiN42HXL where federation_master := code→or_empty(app→server_setting("AUTH_FEDERATION_MASTER", true));
  #NMdSpewr4GDsmSil where federation_targets := code→or_empty(app→server_setting("AUTH_FEDERATION_TARGETS", true));
  #CYPQ2WTMAZ8vXbPp where @self := app→server_setting("SELF", false)→replace_regex("/$", "");
  #d4kf2LklXBP4LPDt where request_email := true;
  #IJlxsTlzojsMUfj9 where redirect_on_error := "/#loginerror";
  #jRhh7pqZuUrwA5nn if code→has_setting("AZURE_AD_CLIENT_SECRET") then {
    #wLur5rS0dv8mxKug @\u267b→server_auth→add_azure_ad;
  }
  #cCiX4QZk28gecHlx if code→has_setting("LIVE_CLIENT_SECRET") then {
    #s7F1L290oP6hAa4c @\u267b→server_auth→add_live_id;
  }
  #HNBQTp9eOGvx2oT8 if code→has_setting("GOOGLE_CLIENT_SECRET") then {
    #xtqCRCJ9dW0SBm8r @\u267b→server_auth→add_google;
  }
  #BF4mobYuPfkV43QV if code→has_setting("FACEBOOK_CLIENT_SECRET") then {
    #xTMuR9jU83pWIJY9 @\u267b→server_auth→add_facebook;
  }
  #jBijo8IgxoAv24E3 @\u267b→restify→server→get("/user/logout", $@then);
  #Ir4MCos3SyuVK2AW where @then(req: ♻ restify → Request, res: ♻ restify → Response) {
    #yAB6K53Z0F2OmB03 $res→redirect(302, "/signout");
  }
  #MeV8vM489Gm8YUXp @\u267b→restify→server→get("/oauth/providers", $then2);
  #xPtYM66GTH8TXW2i where then2(req: ♻ restify → Request, res: ♻ restify → Response) {
    #wzQbWlA8mPibhplh @\u267b→server_auth→validate_oauth_parameters($req, $res);
    #qOvyk7J0Qi9rjqs0 code→handle_basic_auth($req, $res);
    #hp656H1ZXF9ivuMx if `not` $res→finished then {
      #xffkN6oNENhOQGlx $links := @\u267b→server_auth→provider_links($req→query);
      #aBSDmMOwNNNhHRjR $lang2 := code→handle_language($req, $res, true);
      #Tp7vUHaliUcQcfH5 $html := code→get_login_html("providers", $lang2);
      #xTjW05K4B0Pik3uV foreach k in $links→keys
      do {
        #WuycEzNiHonhTWRs $html := $html→replace("@" ∥ $k ∥ "-url@", $links→string($k));
      }
      #jRYpHoH23P7dgLfn $res→html($html);
    }
  }
  #I4RCTLy9XHnVKgE5 @\u267b→restify→server→get("/oauth/dialog", $then3);
  #fUmAin2QbYeXbWhB where then3(req: ♻ restify → Request, res: ♻ restify → Response) {
    #DrsXWO9yXaa9bDUX $session_string := code→or_empty(@\u267b→server_auth→options→get_data→run(code→or_empty($req→query→string("td_session"))));
    #YpqRbct2KCCy9EkV $session := records→login_session→create;
    #y0RaLJltIRGRFjZn $session→state := @\u267b→cached_store→fresh_short_id(16);
    #IetoyqJoyIEjhtVm if `not` $session_string→is_empty then {
      #KV08TmyO2PHqZGPV $session := records→login_session→create_from_json(web→json($session_string));
    }
    #x3G4QNul7C14Ujmi if $session→userid→is_empty then {
      #YHAdW2fxZ9bCs2h2 @\u267b→server_auth→validate_oauth_parameters($req, $res);
    }
    #dVZOKBGDTLQY6QDi code→handle_basic_auth($req, $res);
    #CFv8Bo4Jfsbo1tP2 code→login_create_user($req, $session, $res);
    #Ibyx8t4z4C4iMTEI if `not` $res→finished then {
      #gIypWrtjDjzkBK1s $access_code := code→or_empty($req→query→string("td_state"));
      #ZHxdu4kXhHzUTOpm if $access_code→equals("teacher") then {
        #NGsxwuuci2FZoT6y $query := $req→url→replace_regex("^[^\\?]*", "");
        #jIfat94x4ds34ZaK $url := $req→server_url ∥ "/oauth/providers" ∥ $query;
        #ELCIccDs2pCzySen $res→redirect(303, $url);
      }
      else { #xFgUKLtXOMTXZyEI if $access_code→equals(data→token_secret) `and` `not` $session→userid→is_empty then {
        #xFRr7t6ne1zhzGb4 // **this is to be used during initial setup of a new cloud deployment**
        #KS9WPO4wLNHRuizj data→pubs_container→update($session→userid, $update4);
        #TcdURFVncT2Xycka where update4(entry: Json_Builder) {
          #xVhp4t5lTEBk4W5T code→json_add($entry, "credit", 1000);
          #J7CCTTzpX2FnSLzp code→json_add($entry, "totalcredit", 1000);
          #iM4It3qbwwrGMNLi $entry→set_string("permissions", ",admin,");
        }
        #ChYQjXqVQxUXWP6l code→access_token_redirect($res, $session→redirect_uri);
      }
      else {
        #xE1DD85vM4NJ1Ape code→login_handle_code($access_code, $res, $req, $session);
      }
      } 
    }
  }
  #QEDCYDzB08K6Dduo @\u267b→restify→server→get("/oauth/gettoken", $then3);
  #czXpDRfBNG7X4kni where then3(req: ♻ restify → Request, res: ♻ restify → Response) {
    #nU86qfz6PDTZmQoJ $s3 := $req→server_url ∥ "/oauth/login?state=foobar&response_type=token&client_id=no-cookie&redirect_uri=" ∥ web→encode_uri_component($req→server_url ∥ "/oauth/gettokencallback") ∥ "&u=" ∥ web→encode_uri_component(code→or_empty($req→query→string("u")));
    #dzC5A7g57YfTt46V $res→redirect(303, $s3);
  }
  #xOVHH1tq722XXglF @\u267b→restify→server→get("/oauth/gettokencallback", $then3);
  #xUiu1nBtoTHW94KX where then3(req: ♻ restify → Request, res: ♻ restify → Response) {
    #FO6uCNVQMgcglmtO $new := "<p>Your access token is below. Only paste in applications you absolutely trust.</p>\n<pre id=\"token\">\nloading...\n</pre>\n<p>You could have added <code>?u=xyzw</code> to get access token for a different user (given the right permissions).\n</p>\n<script>\nsetTimeout(function() {\nvar h = document.location.href.replace(/oauth\\/gettoken.*access_token/, \"?access_token\").replace(/&.*/, \"\");\ndocument.getElementById(\"token\").textContent = h;\n}, 100)\n</script>";
    #SXcQzeNfQRdTX3t6 $res→html(art→template\u002ehtml→replace("@JS@", "")→replace("@BODY@", $new));
  }
  #RtBBG3pF1H2TIwI8 if false then {
    #HRMgjkGcT2uAcnDH code→add_route("GET", "*user", "rawtoken", $handler4);
    #h9F5qhRAYBSYWhKU where handler4(req: * api_request) {
      #JYZDgURyO4syTKKw if `not` $req→userinfo→token→cookie→is_empty then {
        #AJ5q4Se7e2ZnfOyy // Only cookie-less (service) tokens allowed here.
        #PLh2w6bhi0CYCou7 $req→status := @\u267b→restify→http→@418_Im_a_teapot;
      }
      #uBIs72JgkTqF1fxy code→check_permission($req, "root");
      #Ll32qMVoWJzzKV4X if $req→status = 200 then {
        #Kmln3L3oyfdfcO2L $custom_token, $cookie := code→generate_token($req→root_id, "admin", "no-cookie");
        #NKCyUnv9NvBu1WjR contract→assert($cookie→is_empty, "no cookie expected");
        #mhIsVjrKL5T5aCDO code→audit_log($req, "rawtoken");
        #a429R2zeROcQ5t2c where data := code→sha256($custom_token)→substring(0, 10);
        #Pk0Nv2gv26LydZqd $req→response := (data→@self ∥ "?access_token=" ∥ $custom_token)→to_json;
      }
    }
  }
  meta private;
}
#dYG1bZIUILjMVYeB
var passcodes_container : ♻ cached_store → container {
  transient = true;
}
#F01DokXIerGxD478
action normalize_and_hash(#q6q1pkfY2mjtGcgl access_code: String) returns(#MG0Fp3prDnklTXm4 s: String) {
  #Cs5oE6EkQX8GgXpE $s := code→or_empty($access_code)→to_lower_case→replace_regex("\\s", "");
  #TMsFt6P8APHVesDm if `not` $s→is_empty then {
    #O86gE9TAKl3VP4RI $s := "code/" ∥ code→sha256($s);
  }
  meta private;
  meta sync;
}
#xElZeDh54Rttgdsb
action json_add(#u4olzicz5Au2Z2El entry: Json_Builder, #eowFGdy4Sus2Otis counter: String, #Lyjb1RwoqYs6yhSJ delta: Number) {
  #q69Q9kakYmKxL9bE $x2 := code→or_zero($entry→number($counter)) + $delta;
  #NtTpYuBFyCkY92dg $entry→set_number($counter, $x2);
  meta private;
  meta sync;
}
#C5rggcEp4B4SNtbl
var activate\u002ehtml : String {
  is\_resource = true;
  url = "data:text/plain;base64,PHNjcmlwdD4KZnVuY3Rpb24gb25jb2RlKCkgewogIHZhciBpbnAgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgiY29kZSIpCiAgc2V0dXJsKCImdGRfc3RhdGU9IiArIGVuY29kZVVSSUNvbXBvbmVudChpbnAudmFsdWUpKQp9CihmdW5jdGlvbigpIHsKICB2YXIgY2QgPSBsb2NhbFN0b3JhZ2VbJ3ZhbGlkYXRlZF9jb2RlJ107CiAgaWYgKGNkKSB7CiAgICAgbG9jYWxTdG9yYWdlWyd2YWxpZGF0ZWRfY29kZSddID0gIiI7CiAgICAgc2V0dXJsKCImdGRfc3RhdGU9IiArIGVuY29kZVVSSUNvbXBvbmVudChjZCkpCiAgfQp9KCkpCjwvc2NyaXB0Pgo8ZGl2IHN0eWxlPSdtYXJnaW46IDAgYXV0bzsgd2lkdGg6IDMxMHB4OyAgdGV4dC1hbGlnbjogY2VudGVyOyc+CjxoMSBzdHlsZT0nZm9udC1zaXplOjNlbTsgZm9udC13ZWlnaHQ6bm9ybWFsOyc+V2Ugc3RpbGwgbmVlZCBhIGNvZGU8L2gxPgo8ZGl2IHN0eWxlPSdjb2xvcjpyZWQ7IG1hcmdpbjogMWVtIDAnPkBNU0dAPC9kaXY+CjxpbnB1dCB0eXBlPSJ0ZXh0IiBpZD0iY29kZSIgY2xhc3M9ImNvZGUiLz48YnIvPgo8YSBocmVmPSIjIiBjbGFzcz0icHJvdmlkZXIiIG9uY2xpY2s9Im9uY29kZSgpIj5HbzwvYT48YnIvPgo8ZGl2IHN0eWxlPSdjb2xvcjojOTk5Oyc+WW91IGFyZSBsb2dnZWQgaW4sIGJ1dCB5b3Ugc3RpbGwgbmVlZCB0byBwcm92aWRlIGFuIGFjdGl2YXRpb24gY29kZS48L2Rpdj4KPC9kaXY+Cg==";
  transient = true;
}
#NHuPHtdkA9vQSelH
action or_false(#uR0jYzvBErDTaUwA s: Boolean) returns(#Sxf7OoixGG070jsh r: Boolean) {
  #SdI2yNX6tStNhgKh if $s→is_invalid then {
    #gUiEIdq7XGx58abj $r := false;
  }
  else {
    #X5C5kiZbsh9vQAIZ $r := $s;
  }
  meta private;
  meta sync;
}
#MGM525ijxq8IPNr4
action check_group_permission(#xu54Y8h8ggYCDtwv req: * api_request) {
  #I6ajPM4YzyI1nqQm if $req→userid→equals($req→root_pub→field("pub")→string("userid")) then {
    #FX7HhF4SuLxkepfD skip;
  }
  else {
    #IdAdyT6viZgzWMLe code→check_permission($req, "pub-mgmt");
  }
  meta private;
  meta sync;
}
#m2LIO4oVeVRkUKZT
table login_session {
  type = "Object";
  persistent = false;
  fields {
    #x526kN2XTbJVgmhB state : String
    #zzgKgOSmZdQRV56D userid : String
    #FI9BWHW4Tr0mVGSE redirect_uri : String
    #me9uXFyrwDmonXeS groupid : String
    #rDbT8HQ4zcB19nzF passwords : Collection[String]
    #OZtb9xOEYlSZjeRK pass : String
    #RX93CNKDk6FANav4 owner_id : String
    #B2BtJNbe04Lh2RbE terms_ok : Boolean
    #Gc2LfncqCJSiX0mh code_ok : Boolean
  }
}
#xtM2Mqa3QQb0jn44 meta import word_password {
  pub "adnog"
  usage {

    action `async` example()
    action `sync` generate() returns(pass: String)
  }
}
#doK8mENTbchNFONF
var newuser\u002ehtml : String {
  is\_resource = true;
  url = "data:text/plain;base64,PHNjcmlwdD4KdmFyIHNlc3Npb24gPSAiJnRkX3Nlc3Npb249QFNFU1NJT05AIjsKZnVuY3Rpb24gb25jb2RlKCkgewogICAgdmFyIGlucCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJjb2RlIikKICAgIHNldHVybCgiJnRkX3N0YXRlPSIgKyBlbmNvZGVVUklDb21wb25lbnQoaW5wLnZhbHVlKSArIHNlc3Npb24pCn0KCmZ1bmN0aW9uIGZvcmdvdGNvZGUoKSB7CiAgdmFyIGYgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZm9yZ290JykKICBmLnN0eWxlLmZvbnRTaXplID0gJzEuNWVtJzsKICBmLmlubmVySFRNTCA9ICdHbyBhc2sgeW91ciB0ZWFjaGVyIHRvIHJlc2V0IHlvdXIgY29kZS4nOwp9CgpmdW5jdGlvbiBub2NvZGUoKSB7CiAgdmFyIGYgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgna2lkY29kZScpCiAgZi5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnOwogIGYgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbmV3dXNlcicpCiAgZi5zdHlsZS5kaXNwbGF5ID0gJ2Jsb2NrJzsKfQoKZnVuY3Rpb24gcGFzc3dvcmRvayhuKSB7CiAgdmFyIGlucCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJmaXJzdG5hbWUiKQogIGlmICghaW5wLnZhbHVlIHx8IGlucC52YWx1ZS5sZW5ndGggPCAzKSB7CiAgICBpbnAuc3R5bGUuYm9yZGVyQ29sb3IgPSAicmVkIgogICAgcmV0dXJuCiAgfQogIHNldHVybCgiJnRkX3VzZXJuYW1lPSIgKyBlbmNvZGVVUklDb21wb25lbnQoaW5wLnZhbHVlKSArICImdGRfcGFzc3dvcmQ9IiArIGVuY29kZVVSSUNvbXBvbmVudChuKSArIHNlc3Npb24pCn0KCmRvY3VtZW50Lm9ucmVhZHkgPSBmdW5jdGlvbigpIHsKfQo8L3NjcmlwdD4KPGRpdiBzdHlsZT0nbWFyZ2luOiAwIGF1dG87IHdpZHRoOiAzMTBweDsgIHRleHQtYWxpZ246IGNlbnRlcjsnPgoKPGRpdiBpZD0na2lkY29kZSc+CjxoMSBzdHlsZT0nZm9udC1zaXplOjNlbTsgZm9udC13ZWlnaHQ6bm9ybWFsOyc+RG8geW91IGhhdmUga2lkIGNvZGU/PC9oMT4KPGRpdiBzdHlsZT0nY29sb3I6cmVkOyBtYXJnaW46IDFlbSAwJz5ATVNHQDwvZGl2Pgo8aW5wdXQgdHlwZT0idGV4dCIgaWQ9ImNvZGUiIGNsYXNzPSJjb2RlIi8+PGJyLz4KPGEgaHJlZj0iIyIgY2xhc3M9InByb3ZpZGVyIiBvbmNsaWNrPSJvbmNvZGUoKSI+SGVyZSBpdCBnb2VzITwvYT48YnIvPgo8ZGl2IGlkPSdmb3Jnb3QnPgo8YSBocmVmPSIjIiBvbmNsaWNrPSJmb3Jnb3Rjb2RlKCkiPkkgZm9yZ290IG15IGtpZCBjb2RlPC9hPjxici8+CjwvZGl2Pgo8YSBocmVmPSIjIiBvbmNsaWNrPSJub2NvZGUoKSI+SSBuZXZlciBnb3QgYSBraWQgY29kZTwvYT48YnIvPgo8L2Rpdj4KCjxkaXYgaWQ9J25ld3VzZXInIHN0eWxlPSdkaXNwbGF5Om5vbmUnPgo8aDEgc3R5bGU9J2ZvbnQtc2l6ZTozZW07IGZvbnQtd2VpZ2h0Om5vcm1hbDsnPlRlbGwgdXMgeW91ciBmaXJzdCBuYW1lPC9oMT4KPGlucHV0IHR5cGU9InRleHQiIGlkPSJmaXJzdG5hbWUiIHBsYWNlaG9sZGVyPSdGaXJzdCBOYW1lJyBjbGFzcz0iY29kZSIvPjxici8+CjxkaXY+CkFuZCBub3cgcGljayBhIDQtd29yZCBwYXNzd29yZCB5b3UnbGwgdXNlIGluIGZ1dHVyZS4KPC9kaXY+CjwhLS0gVE9ETyBvbmx5IHNob3cgcGFzc3dvcmRzIG9uY2UgdGhlcmUgaXMgMyBsZXR0ZXJzIGluIHRoZSBmaXJzdG5hbWUgZmllbGQgLS0+CjxkaXYgaWQ9J3Bhc3N3b3Jkcyc+CkBQQVNTV09SRFNACjwvZGl2Pgo8L2Rpdj4KCjwvZGl2Pgo=";
  transient = true;
}
#hsWq7wbqMoJblqOs
action create_new_user(#v1i4mrlqPCcGnpyL username: String, #k632Mk124TQWZ34Y email: String, #Y4RfJXf0wsqMSfEp profile_id: String, #L3mhoojXG6ISQitm perms: String, #x6URFTGpyqa3OWor realname: String, #fEEy4hc2IXt2Uzbx awaiting: Boolean) returns(#zIPxi9KjJRgkkGZf r: Json_Builder) {
  #FKEijVyb6ErnHDPa $r := web→create_json_builder;
  #a2v8bBqGwAR4Y2cR $pub_user := records→pub_user→create;
  #kqq2nNRlU8EF1eRN $pub_user→name := $username;
  #RGYEtEJN22lOZm7T $settings := records→pub_user_settings→create;
  #xG5ytODp9p4eLBAX $settings→email := code→encrypt($email, data→email_keyid);
  #xJ9HWGjetav0YbWq $settings→realname := code→encrypt($realname, data→email_keyid);
  #x6g7edNnLORB0LdF $settings→emailverified := `not` code→or_empty($settings→email)→is_empty;
  #hdRcwgm3NTAKQ6QL $r→set_field("pub", $pub_user→to_json);
  #G5WUVF0BYgVpMAci $r→set_field("settings", $settings→to_json);
  #phju78PQrvV4NZZG $r→set_string("login", $profile_id);
  #vQYm1wACnhhvx7eN $r→set_string("permissions", $perms);
  #xTXI3RCElz1GCktb $r→set_string("secondaryid", @\u267b→cached_store→fresh_short_id(12));
  #LsPhCyt44Dzb3uQ5 if $awaiting then {
    #gtyYM21vOW0Tch9t $r→set_boolean("awaiting", $awaiting);
  }
  #YJm31Sz8S54FsEg2 $dictionary := code→set_builder_if_missing($r, "groups");
  #xuA2wGsCETzdaByZ $dictionary2 := code→set_builder_if_missing($r, "owngroups");
  #x9dMlaodE4SzRkYL code→generate_id($r, 8);
  #cBHQn4SH7GignXG5 data→users→insert($r);
  #d0KZQwuaY2p06jjw data→passcodes_container→update($profile_id, $update);
  #TG01AKmxxgBDWQNd where update(entry: Json_Builder) {
    #Qz1tlvuKGSkK8rxN $entry→set_string("kind", "userpointer");
    #xgbH4VYw7M62tH7Z $entry→set_string("userid", $r→string("id"));
  }
  #xIqF4kU8qBOPQ1q3 code→send_permission_notification(data→empty_request, $r);
  meta private;
}
#epexZGUf2p6JwkVm
action get_redirect_url(#Xd8J2FA9xMY249jq user2: String, #RaXhhzMvV8i647DX req: ♻ restify → Request) returns(#ZmtpjSoyJGOTsVD7 url: String) {
  #nmGMq8YEgBXnRTMc $jsb := web→create_json_builder;
  #d2EitbW9O7U9yaUL $custom_token, $cookie := code→generate_token($user2, "code", $req→query→string("client_id"));
  #jM7cDLtVXQqBjJ0I $jsb→set_string("access_token", $custom_token);
  #zMGdJv2QeTRuO2NH $jsb→set_string("state", $req→query→string("state"));
  #cAtXgjmq0NdL4z0s $jsb→set_string("id", $user2);
  #Dnij7JMfQxQ42219 if `not` $cookie→is_empty then {
    #teqbAindPeAgZCTG $jsb→set_string("td_cookie", $cookie);
  }
  #hObKgJSE2CEsEelk $url := $req→query→string("redirect_uri") ∥ "#" ∥ @\u267b→server_auth→to_query_string($jsb→to_json);
  meta private;
}
#fEEhI5WwkVgdF6em
var user\u002dcreated\u002ehtml : String {
  is\_resource = true;
  url = "data:text/plain;base64,PHNjcmlwdD4KICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7CiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgid2VyZWRvbmUiKS5zdHlsZS5kaXNwbGF5ID0gImJsb2NrIjsKICB9LCAyMDAwKQo8L3NjcmlwdD4KCjxkaXYgc3R5bGU9J21hcmdpbjogMCBhdXRvOyB3aWR0aDogMzEwcHg7ICB0ZXh0LWFsaWduOiBjZW50ZXI7Jz4KPGgxIHN0eWxlPSdmb250LXNpemU6M2VtOyBmb250LXdlaWdodDpub3JtYWw7Jz5XZWxjb21lLCBATkFNRUA8L2gxPgo8cD5Zb3VyIHBhc3N3b3JkIGlzOjwvcD4KPHAgc3R5bGU9J2ZvbnQtc2l6ZToxLjVlbScgY2xhc3M9J3Bhc3N3b3JkJz5AUEFTU1dPUkRAPC9wPgo8cD5SZW1lbWJlciBpdCE8L3A+CjxwPgo8YSBzdHlsZT0nZGlzcGxheTpub25lJyBpZD0nd2VyZWRvbmUnIGhyZWY9IkBVUkxAIiBjbGFzcz0icHJvdmlkZXIiPkdvdCBpdCE8L2E+CjwvcD4KPC9kaXY+Cg==";
  transient = true;
}
#Z9kSB5qytdNVFgeQ
action html_quote(#Iq2XmwOaxVEsoWzF td_username: String) returns(#eHb5cRDHQarNW8xG new: String) {
  #VoAaeh8awOpQNJle $new := $td_username→replace("&", "&amp;")→replace("<", "&lt;")→replace(">", "&gt;")→replace("\"", "&quot;")→replace("\'", "&#39;");
  meta private;
  meta sync;
}
#x7l9iGU2WzwSJ45o
action login_federated(#Q3qX95AWORDGPPF5 profile: ♻ server_auth → User_Info, #xfQH6z1RAznnNsTB oauth_req: ♻ server_auth → oauth_request) returns(#xtW3CV6iQSNuh3qU url: String) {
  #s7VJoXJRyhWy6lPa $coll := $profile→id→@match("([^:]*):(.*)");
  #xDzS2YF2FnQtXO8E $provider := $coll→at(1);
  #xXGiAx5Vq65RY5RI $provider_user_id := $coll→at(2);
  #RM3HnEPuT4B290GU $profile_id := "id/" ∥ $provider ∥ "/" ∥ code→encrypt_id($provider_user_id, "SOCIAL0");
  #xCSoKR2242mnFYxA data→logger→debug("profileid: " ∥ $profile→id ∥ " enc " ∥ $profile_id);
  #azSgQ71eUjaRwC4f $modern_id := $profile_id;
  #rZzCYlvMJFInhxvB $entry2 := data→passcodes_container→get($profile_id);
  #rSN2ikrjaiHKHTcB // ## Legacy profiles
  #xceefsXL0HUOkFAT if false then {
    #pqR0r444zqGPfmpn if $entry2→is_invalid then {
      #zeawHBGVwusqpelU $legacy_id := "id/" ∥ $provider ∥ "/" ∥ code→sha256($provider_user_id);
      #yFQMjhtJL9QrhiTa $entry := data→passcodes_container→get($legacy_id);
      #gO2ve0xadSfgW2Vu if code→is_good_pub($entry, "userpointer") `and` `not` code→get_pub($entry→string("userid"), "user")→is_invalid then {
        #mLL9bZ6KUoIJkZor $entry2 := $entry;
        #xJt21s5EZJj8ZaRG $profile_id := $legacy_id;
      }
    }
    #T84FnhuuN2ENJVTZ if $entry2→is_invalid then {
      #anYgWhMd1JE4MC3T $legacy_id := "id/" ∥ $provider ∥ "/" ∥ $provider_user_id→replace(":", "/");
      #moUzTXd0yhJZ0gPd $entry := data→passcodes_container→get($legacy_id);
      #oSV5zxo0kZzgr2gA if code→is_good_pub($entry, "userpointer") `and` `not` code→get_pub($entry→string("userid"), "user")→is_invalid then {
        #QpmZDZ3q16RiUEff $entry2 := $entry;
        #mDcr8Z84OJGT02IA $profile_id := $legacy_id;
      }
    }
    #fcUEJyMffniGdcVa // If we have a legacy pointer, update it
    #HxsB2wHvi2WoFEnj if `not` $modern_id→equals($profile_id) `and` `not` $entry2→is_invalid then {
      #xign3WgjwmAeCx9E data→passcodes_container→update($modern_id, $update);
      #SXz1NXFaN2XRA5n5 where update(entry: Json_Builder) {
        #u97OX6lo29zsODyM $entry→copy_from($entry2);
      }
    }
  }
  #N8aC9t97hW2ZLMC1 skip;
  #VoVZ4FHwm6PdVZ2I $jsb := invalid→json_builder;
  #xzxPqDoEgRmThRW4 if code→is_good_pub($entry2, "userpointer") then {
    #wccP32veKIzLqQJ9 $entry3 := code→get_pub($entry2→string("userid"), "user");
    #mmLT1Bf3ctwzYH2h if `not` $entry3→is_invalid then {
      #zcvCxIow82u1dWJ8 $jsb := $entry3→to_json_builder;
      #gLWQArK9mOOaiBJ0 if `not` code→or_empty($jsb→string("login"))→equals($profile_id) then {
        #l4z4nicW8VZqKwoZ data→pubs_container→update($jsb→string("id"), $update2);
        #phkBBWMo1JNtBph0 where update2(entry: Json_Builder) {
          #IjjI52qQsrBbTHDx $entry→set_string("login", $profile_id);
        }
        #cckHKD0fPq3GFoQP $jsb→set_string("login", $profile_id);
      }
    }
  }
  #QmJvOpVcTXqJx66S if $jsb→is_invalid then {
    #yPcwCPBu5wwgULJv $email := $profile→email;
    #FKTbg2J67Qbu68f2 $username := $profile→name→replace_regex("\\s.*", "");
    #djqcZu4PtLXcXMgX if $provider→equals("google") then {
      #xoFaWg65AeGHQnMf // New Google accounts blocked for now.
      #KJC2n4mTORRQsxhG `return` "/";
    }
    #pm740GL4AK5efa3T data→logger→tick("PubUser@federated");
    #xuIkwb7KOw4w07D4 $jsb := code→create_new_user($username, $email, $profile_id, "", $profile→name, false);
  }
  else {
    #uE9EmKAjDOG29YZ1 data→logger→tick("Login@federated");
    #xBTu3EgHgVqk5AdR $uid_override := code→with_default($oauth_req→\_client\_oauth→u, $jsb→string("id"));
    #mEEE4SnL2xwpThoT if `not` $uid_override→equals($jsb→string("id")) then {
      #faU2muPdvbfWDrbx data→logger→info("login with override: " ∥ $jsb→string("id") ∥ "->" ∥ $uid_override);
      #y4UEpKs2m4KHcbqQ if code→has_permission($jsb→to_json, "signin-" ∥ $uid_override) then {
        #a07d2gtM67LkA5lP $entry4 := code→get_pub($uid_override, "user");
        #M2tOn4CH06MgsLxU if `not` $entry4→is_invalid then {
          #lAL74nCgp3Y6f9Nl data→logger→debug("login with override OK: " ∥ $jsb→string("id") ∥ "->" ∥ $uid_override);
          #lFbBQLq4RmbaJGPj $jsb := $entry4→to_json_builder;
        }
      }
    }
  }
  #grUoRwVBhKLMD6zH $user := $jsb→string("id");
  #Xkvii12ZjfmnnrSt $token, $cookie := code→generate_token($user, $profile_id, $oauth_req→\_client\_oauth→client\_id);
  #iCOm22XuX8WA5zxm skip;
  #xhLZIvnuK3uCPqzz $redirect_url := $profile→redirect_prefix→replace("TOKEN", web→encode_uri_component($token)) ∥ "&id=" ∥ $user;
  #xTp8h4ykYj2SHiAg if `not` $cookie→is_empty then {
    #xDI38IbpfT2fc6R2 $redirect_url := $redirect_url ∥ "&td_cookie=" ∥ $cookie;
  }
  #MRFzVO2kUDKScvxv code→refresh_settings;
  #LBwSHfin6KzQ6s0D $session := records→login_session→create;
  #DMIRoC1WQP1OvZ0z $session→terms_ok := code→or_empty($jsb→string("termsversion"))→equals(data→the_service_settings→termsversion);
  #KSVpDkPSETTIhJn2 $session→code_ok := `not` code→or_empty($jsb→string("permissions"))→is_empty;
  #xtuDMfE4bP5JvJEr if `not` $session→terms_ok `or` `not` $session→code_ok then {
    #B8EFbGlYbl2YFyIF $session→state := @\u267b→cached_store→fresh_short_id(16);
    #o5A4nO6QNqOZ23Ic $session→userid := $user;
    #g2LLmF0A2P0EafiW $session→redirect_uri := $redirect_url;
    #xy414ob4FhpFdT3N @\u267b→server_auth→options→set_data→run($session→state, $session→to_json→serialize);
    #xFO5E0xnhebmhM9n $redirect_url := "/oauth/dialog?td_session=" ∥ web→encode_uri_component($session→state);
  }
  #xqcZgMlMp1Lu9HyY `return` $redirect_url;
  meta private;
}
#kog9WHCflDwHNTG3
action login_create_user(#SI9XbVfZ4qz82DT6 req: ♻ restify → Request, #RCX2c0kMlttzBcdY session: * login_session, #h0hpwp1m55Kukk7k res: ♻ restify → Response) {
  #qVK9knbvFnRJuhUH $td_username := $req→query→string("td_username");
  #GM08P1ZrtC52EZ90 if `not` $res→finished `and` `not` $session→groupid→is_empty `and` `not` code→or_empty($td_username)→is_empty then {
    #mADO9ySB6fMIgLp2 if $session→redirect_uri→is_empty then {
      #xq2mKxwqIszQjKik $group_json := code→get_pub($session→groupid, "group");
      #NUXC3IYZr70vhwok $session→pass := $session→passwords→at(code→or_zero($req→query→number("td_password")));
      #ZZM2OrsUKPjyqFgU if $session→pass→is_invalid then {
        #hVtZxEKXw3BvTkrt $session→pass := $session→passwords→at(0);
      }
      #kcOxtaEPqLYJqwDN // this can go negative; maybe we should reject it in this case?
      #xV40n0TOEflnHsbW data→pubs_container→update($session→owner_id, $update);
      #rq43Cj0yJeCSqRGs where update(entry: Json_Builder) {
        #AEUOZb7Gdy5oBYxl code→json_add($entry, "credit", - 1);
      }
      #xZ0iNShSH8vU2N9r data→logger→tick("PubUser@code");
      #fEhUoH2NZjqTjLeB $jsb := code→create_new_user($td_username, "", code→normalize_and_hash($session→pass), ",student,", "", data→initial_approvals);
      #nwJ7a4fB8G2a0jOC $user2 := $jsb→string("id");
      #lLqcdD100k5r0Ui5 skip;
      #JwUlrTbyCnhDGhfO code→audit_log(code→build_audit_api_request($req), "user-create-code");
      #xbIjBPhdNFvQYsOo where userid := $session→owner_id;
      #jBjwmJVl4CbAIm44 where subjectid := $user2;
      #xSuxjIIvidq0MWJB where publicationid := $session→groupid;
      #niwSQfKng8ZwS80h where publicationkind := "group";
      #S3nz123sqqo1EuMB where newvalue := $jsb→to_json;
      #RXtRB2xUo6aEqewZ if data→initial_approvals then {
        #I44CJQFm6toUBGme code→add_group_approval($group_json, $jsb→to_json);
      }
      else {
        #xMFwoWmwhLHO53B0 code→add_user_to_group($user2, $group_json, records→api_request→invalid);
      }
      #Jl1FmNY3X1DQpyBB $session→redirect_uri := code→get_redirect_url($user2, $req);
      #hTR26rgE92jfiWyK @\u267b→server_auth→options→set_data→run($session→state, $session→to_json→serialize);
    }
    #xZTzZYnHvmFErXyv $url, $cook := code→strip_cookie($session→redirect_uri);
    #h0H911WKBs7apzub if `not` $cook→is_empty then {
      #xDdTnkQrGSBcLBMG $res→set_header("Set-Cookie", $cook);
    }
    #lxBVJKTUh2SiKxzq $lang := code→handle_language($req, $res, false);
    #xwpWD633V8XFq6VL $html := code→get_login_html("usercreated", $lang)→replace("@URL@", $url);
    #W5uZoj52jLJXUJBi $html := $html→replace("@USERID@", $session→userid);
    #vDl1Ajhz05AbSGGB $html := $html→replace("@PASSWORD@", $session→pass);
    #gktNckRAHWtYvSr5 $html := $html→replace("@NAME@", code→html_quote($td_username));
    #s8szY4sOHKbBxrkX code→set_html_headers($res);
    #HcZbq5DJubocz3pu $res→html($html);
  }
  meta private;
}
#PRUq4iMCPW4YJj47
action login_handle_code(#xaG7DML2MCsKDPVy access_code: String, #YmMY40uHFR0bAQP2 res: ♻ restify → Response, #rJ0QqmrL8gpTSu7m req: ♻ restify → Request, #gFN04VJayu40s5LR session: * login_session) {
  #xXfZn15nknthcQxq $pass_id := code→normalize_and_hash($access_code);
  #EWp8kTQAIv7OBGEv $msg := "";
  #UptDvnllQ8paEcAP if $pass_id→is_empty `or` $access_code→equals("kid") then {
    #JF4aqzuKWQyl1ytj skip;
  }
  else {
    #LQhzsmjgh422x0id if code→throttle_core(code→sha256($req→remote_ip) ∥ ":code", 10) then {
      #FjwFqpNv5es8uuH6 // TODO this should be some nice page
      #AbimvO4pT0nk2B6m $res→send_error(@\u267b→restify→http→@429_Too_Many_Requests, "Too many login attempts");
      #AGTkKBJ1Mj12Byhy `return` ;
    }
    #kJH26zm0peSKpAvZ $code_obj := data→passcodes_container→get($pass_id);
    #fOPf25fVxwdS7RkG if $code_obj→is_invalid `or` $code_obj→string("kind")→equals("reserved") then {
      #d5LOvr6IMWkTNWB1 $msg := "Whoops! The code doesn\'t seem right. Keep trying!";
    }
    else {
      #oToJpOyvnTVAMucg $kind := $code_obj→string("kind");
      #xv38Ys0ixv7QZi3b if $kind→equals("userpointer") then {
        #vVnOtLbVq2looT8N $user_json := code→get_pub($code_obj→string("userid"), "user");
        #xiU9lG2tEBFgQ29n if `not` $session→userid→is_empty then {
          #xEI2hHJoQtv8rC04 $msg := "We need an activation code here, not user password.";
        }
        else { #imAe3RYDJRfayE4z if $user_json→is_invalid then {
          #xyi5p4IooOaDEH4G $msg := "The user account doesn\'t exist anymore.";
        }
        else {
          #vHyWsuwHcx0s4Dcn data→logger→tick("Login@code");
          #jS49bhaEiFGSINXg code→access_token_redirect($res, code→get_redirect_url($user_json→string("id"), $req));
        }
        } 
      }
      else { #tfw5CNxjmJVzcpRO if $kind→equals("activationcode") then {
        #A9XTapao7p1k9AWD if $session→userid→is_empty then {
          #JVKTEDAktAegvFhI // The code shouldn't be entered here, let's save it for future.
          #tXqa4QyPSEDfNlah $query := $req→url→replace_regex("^[^\\?]*", "");
          #zMe05W10lpFJyNOg $url := $req→server_url ∥ "/oauth/dialog" ∥ $query→replace("&td_state=", "&validated_code=");
          #x2KZSdTyMjxsj5gY $res→redirect(303, $url);
        }
        else { #xiaGNMNyOtg2S9PA if $code_obj→number("credit") ≤ 0 then {
          #TfrppQCY5gHmTv7o $msg := "This code has already been used.";
        }
        else {
          #ThhbBuBLpUYTyXE3 $userjson := code→get_pub($session→userid, "user");
          #OoP2FL0hMUW0s4U6 code→apply_code($userjson, $code_obj, $pass_id, code→build_audit_api_request($req));
          #f0QJaf4VCjPk7K2S code→access_token_redirect($res, $session→redirect_uri);
        }
        } 
      }
      else { #tOnbNmC9J07kcvYA if $kind→equals("groupinvitation") then {
        #xW6WZro74hHCXT1Q $group_json := code→get_pub($code_obj→string("groupid"), "group");
        #hJkMI1LQxmTAbxt1 if `not` $session→userid→is_empty then {
          #tVXLLjzaAl2yKpfp $msg := "We need an activation code here, not group code.";
        }
        else { #xX6gQoYAurA7ms48 if $group_json→is_invalid then {
          #xfA4p9fyWjWUFVBV $msg := "Group gone?";
        }
        else {
          #xetIMhfRU6M8L4F7 $session→owner_id := $group_json→field("pub")→string("userid");
          #W7qb4pGrCvmp9TKX $group_owner := code→get_pub($session→owner_id, "user");
          #xfdgwHFtT6tMK0N1 if code→or_zero($group_owner→number("credit")) ≤ 0 then {
            #b1C99swwk16hPRAI $msg := "Group owner is out of activation credits.";
          }
          else {
            #rRHnHEgcoENodUkH $session→groupid := $group_json→string("id");
            #rS4ZqfXpS45miHCQ $session→passwords := math→range(0, 10)→map_to→String( `fun:elt` @\u267b→word_password→generate);
            #V7qOPSsXlltXUIP8 @\u267b→server_auth→options→set_data→run($session→state, $session→to_json→serialize);
          }
        }
        } 
      }
      else {
        #jbprO4wEldDmlSpp $msg := "This code cannot be entered here. Sorry.";
      }
      } } 
    }
  }
  #r0t2j2WGnD1zQfMs skip;
  #WGb8pxHxKmEQU3tD if `not` $res→finished then {
    #YHpqNtCPk6jCZX5N code→refresh_settings;
    #xzGPuMR5V8laN6sS $inner := "kidornot";
    #E0RhD8sBHLOh0jNI if $access_code→equals("kid") then {
      #UOOe5qqS684ULPDo $inner := "kidcode";
    }
    #QXJn6u6mwSyMyoQK if `not` $session→passwords→is_invalid then {
      #rfy56GV0EW4j7cOk $links := "";
      #Z0STUkVwJLBAd9lI for 0 ≤ i < $session→passwords→count do {
        #GGBYiBLCtzlw5pVJ $links := $links ∥ "<button type=\"button\" class=\"button provider\" href=\"#\" onclick=\"passwordok(" ∥ $i ∥ ")\">" ∥ $session→passwords→at($i) ∥ "</button><br/>\n";
      }
      #kV2VDerotSRlp5EM $lang2 := code→handle_language($req, $res, true);
      #sprpe12YB2V4kSCa $inner := code→get_login_html("newuser", $lang2)→replace("@PASSWORDS@", $links)→replace("@SESSION@", $session→state);
      #rCAJVuB2i5fRAk09 code→set_html_headers($res);
      #Cb2MEVYk8xNvm1Td $res→html($inner→replace("@MSG@", $msg));
      #vkOzX918RUY2Trw3 `return` ;
    }
    else { #XEGwyFq41ikNCSG5 if `not` $session→userid→is_empty then {
      #t2Py9av4G5Q2eKml $termsversion := code→or_empty($req→query→string("td_agree"));
      #uZvNVN5VFvmcYy6w if $termsversion→equals("noway") then {
        #xj7BGkB40Mg4TYpM @\u267b→server_auth→options→set_data→run($session→state, "{}");
        #fTuJ2o2boM5VY6DC if `not` $session→userid→is_empty then {
          #HRmACjs02kciXRxU $del_entry := code→get_pub($session→userid, "user");
          #kVOyV2UidNRtwEmM if `not` $del_entry→is_invalid `and` code→or_empty($del_entry→string("termsversion"))→is_empty `and` code→or_empty($del_entry→string("permissions"))→is_empty then {
            #hV4rsSA4AxAgy8mr $delok := code→delete($del_entry);
            #xL9VM2nYdcx4VYJN data→pubs_container→update($session→userid, $update);
            #ZCLUmxTU00q6AxR6 where update(entry: Json_Builder) {
              #xkvn42O7RB4WS5bU $entry→set_field("settings", web→json("{}"));
              #xBqyw6slHTAwuRd5 $entry→set_field("pub", web→json("{}"));
              #xorLLMj1R3JjJoLD $entry→set_string("login", "");
              #aTcl21Isw8frrrtm $entry→set_string("permissions", "");
            }
          }
        }
        #uOPpBmpt2SW4o4Tt $res→redirect(302, "/");
        #cGbOnKyMoR6o5w23 `return` ;
      }
      #x1uQX2fr297gWWZk if `not` $session→terms_ok `and` $termsversion→equals(data→the_service_settings→termsversion) then {
        #JDLybWh0Ss6yp8m3 $session→terms_ok := true;
        #zmyKz2JHZruexS3c @\u267b→server_auth→options→set_data→run($session→state, $session→to_json→serialize);
        #lSZHXn8urDL6jyQP if `not` $termsversion→is_empty then {
          #pgNwP00si9Qe4DSr data→pubs_container→update($session→userid, $update4);
          #EXBoRT6IlGNtcBZi where update4(entry: Json_Builder) {
            #SFbaZVLWCmu8hwGM $entry→set_string("termsversion", $termsversion);
          }
        }
        #N2hFWyPo2XbNapPF code→audit_log(code→build_audit_api_request($req), "user-agree");
        #AJB26fpw2C9PLK2t where userid := $session→userid;
        #C2Z4sJicjy8YXjcr where subjectid := $session→userid;
        #x5mmp8DxRuph2UOE where data := $termsversion;
        #xB9LWKCrqqIw9v2S where newvalue := code→get_pub($session→userid, "user");
      }
      #lJNAucV4Vnyx1OLK if `not` $session→terms_ok then {
        #gfxtp5M2cvCdUIBc $inner := "agree";
      }
      else { #w9LDstgFjOaHe2ot if `not` $session→code_ok then {
        #ac2skaErnZEJTEoG $inner := "activate";
      }
      else {
        #xjpZjALLp7L9xM2U $res→redirect(303, $session→redirect_uri);
      }
      } 
    }
    else { } } 
    #BndizQd3vqx7jxz6 if `not` $res→finished then {
      #FtQR4PZOzo2WPzCN $agreeurl := "/oauth/dialog?td_session=" ∥ web→encode_uri_component($session→state) ∥ "&td_agree=" ∥ web→encode_uri_component(data→the_service_settings→termsversion);
      #xAR7YgHkMfiLxW8Z $disagreeurl := "/oauth/dialog?td_session=" ∥ web→encode_uri_component($session→state) ∥ "&td_agree=noway";
      #QSrMyz9muMD4z5sJ $lang2 := code→handle_language($req, $res, true);
      #qQQSma6jzdS2Ph6w $res→html(code→get_login_html($inner, $lang2)→replace("@MSG@", $msg)→replace("@AGREEURL@", $agreeurl)→replace("@DISAGREEURL@", $disagreeurl));
    }
  }
  meta private;
}
#x7DyrLw3zfhy0WJ6
action set_group_props(#NOgcttTfiR42K7ad group: * pub_group, #TdiQnLyTKTxfSPdt body: Json_Object) {
  #WTQmSIRIqTX21hmZ $bld := $group→to_json→to_json_builder;
  #WGCjl1Umt4kTIOuO code→set_fields($bld, $body, "description\nschool\ngrade\nallowappstatistics\nallowexport\nisrestricted\npictureid");
  #lxhc1IH2nUMT7iig $group→from_json($bld→to_json);
  meta private;
  meta sync;
}
#bdULBu80zazAhksa
var group_memberships : ♻ indexed_store → store {
  transient = true;
}
#xscBne7m6vJJBgeQ
table pub_group_membership {
  type = "Object";
  persistent = false;
  fields {
    #F9gGym30a4BI77Jf kind : String
    #ODAy2264bfSZjwrR time : Number
    #gFVgP8g0ggEkyKLX id : String
    #SmQRjFT20ate4U1W userid : String
    #ruN9jTkg9jDm3nu4 username : String
    #puNxfYshfjD7N3E4 userscore : Number
    #xhm2vGjTss9UGIr1 userhaspicture : Boolean
    #P8Gg4Ypwrs7g0igk publicationid : String
  }
}
#SQ6S0R22vpzDd7Z1
action add_user_to_group(#xy1HrgZJXlDrDpxB userid: String, #aQXDRFr2loNbJ5Hy gr: Json_Object, #npjk80W6RFsi8OSQ audit_req: * api_request) {
  #TB2iyEKnaTryGlij $sub := records→pub_group_membership→create;
  #q9EyCqIK5usmS0ow $sub→id := "gm-" ∥ $userid ∥ "-" ∥ $gr→string("id");
  #xlzc7U8GaKdHpzLb $sub→userid := $userid;
  #k453rpZvKk16KSGa $sub→time := code→now_seconds;
  #Dr3nUgPZTzxWZ7dm $sub→publicationid := $gr→string("id");
  #xJsY04ByoeBEFMDP $jsb := web→create_json_builder;
  #NQOHz5pT4GiQlwbK $jsb→set_field("pub", $sub→to_json);
  #w2jxSs0ndD4me4rM $jsb→set_string("id", $sub→id);
  #kJDsAJbnlBcAsY44 data→group_memberships→insert($jsb);
  #a36tShalWc6gB3dx $pub := $gr→field("pub");
  #PvfBjBMSgD1wvDF6 if $pub→boolean("isclass") then {
    #FmpjnYBeJCL12aZ8 data→pubs_container→update($userid, $update);
    #uqeR6Ki4zHxRK1aN where update(entry: Json_Builder) {
      #I4JKxadRw3yg9Vq3 $grps := code→set_builder_if_missing($entry, "groups");
      #xoNqS4xbzPhC26QN $grps→set_number($gr→string("id"), 1);
      #qYljZqGh5R3vqgFh if $pub→string("userid")→equals($userid) then {
        #x45EeAqgaaC44ChW $dictionary := code→set_builder_if_missing($entry, "owngroups");
        #AKsV2cdRwhsD8V4P $dictionary→set_number($gr→string("id"), 1);
      }
    }
  }
  #aarxAvIHYy5VMmNc if `not` $audit_req→is_invalid then {
    #ycEdTc4KrhGyWrUu code→audit_log($audit_req, "join-group");
    #HkT9DrRIak1Gfho7 where userid := $pub→string("userid");
    #IIVbDGt4aMGPF4gC where subjectid := $userid;
    #aCRZ5sBy7GHQOtY4 where publicationid := $gr→string("id");
    #K2R4lb0cEcH4DYVW where publicationkind := "group";
  }
  meta private;
}
#uUQ6ZmNCZwKYxQz7
var basic_creds : String {
  transient = true;
}
#INxkSE8WgiTGCpmq
action handle_basic_auth(#UY9Kx2RuqoWoiXlm req: ♻ restify → Request, #idfjpe4XNimpPa2G res: ♻ restify → Response) {
  #xN47AAfCdu66PdvQ if $res→finished then {
    #TA4v2t8VkRfMtW28 `return` ;
  }
  #cEEIi44DE6TjgwnR code→set_html_headers($res);
  #xJroBjNFjHtYCOzK code→handle_https($req, $res);
  #xPHq4HTnl7vFL3XA if `not` data→non_self_redirect→is_empty `and` `not` $res→finished then {
    #VOi2RUoyHOZrELGj if `not` $req→header("host")→to_lower_case→equals(data→my_host) then {
      #UfQ74I5Nuut1pHxm if data→non_self_redirect→equals("soon") then {
        #zZJppjCFzfIe6jEI $res→html(art→not_found\u002ehtml);
        #ALaZ4VmEn3CCy6il where status := 404;
      }
      else { #ogM2l9yLinxIgWXw if data→non_self_redirect→equals("self") then {
        #GzChZY4RU77WTWO1 $res→redirect(@\u267b→restify→http→@301_Moved_Permanently, data→@self→replace_regex("/$", "") ∥ $req→url);
      }
      else {
        #rLfxLmLwLC1F014T $res→redirect(@\u267b→restify→http→@302_Moved_Temporarily, data→non_self_redirect);
      }
      } 
    }
  }
  #dywKe1uByfEzKDdW if `not` $res→finished `and` `not` data→basic_creds→is_empty then {
    #JBECyGMueAW0h5mn if code→or_empty($req→query→string("anon_token"))→equals(data→basic_creds) then {
      #E5utLIlR6fJlg2BK // OK
    }
    else {
      #PKfrGmP1Vevi7IWu $value := $req→header("authorization");
      #xhcJ3zpppkbSjog3 if $value→is_invalid `or` `not` $value→equals(data→basic_creds) then {
        #xL0xIx1DXqCOLfUv $res→set_header("WWW-Authenticate", "Basic realm=\"TD Lite\"");
        #VF52bLbj7eHNW7aQ $res→send_error(401, "Authentication required");
      }
    }
  }
  meta private;
  meta sync;
}
#YJhymHmdiaVdlRWN
table pub_abusereport {
  type = "Object";
  persistent = false;
  fields {
    #tS41VeyMLJu4jtwX kind : String
    #WHKmn6xNYl2Qg2mI time : Number
    #C2QYnAE7wLG04g8K id : String
    #xL2V8pMBumdzO7Y2 text : String
    #RKT4EoVgY5wqMiCM userid : String
    #hfTZTFM3ZNw9K3uY username : String
    #xHsFmhTI9D2nIoKj userscore : Number
    #xLO5cPG0MZ4Fw4LG userhaspicture : Boolean
    #xtaKxU1LJbnV2qnk userplatform : Collection[String]
    #x1MaYoRV7eHGvL57 publicationid : String
    #nbFQm50DC4AYS2eZ publicationname : String
    #NyJD2QuE2F3MhsjT publicationkind : String
    #k5iKHV9Tnqid4BF6 publicationuserid : String
    #pYvqGPGfswq6HN5V resolution : String
  }
}
#lSIp2v964xrt2eh2
action \_init_abusereports() {
  #xhXzAKPGjrd2a2Fl data→abuse_reports := @\u267b→indexed_store→create_store(data→pubs_container, "abusereport");
  #pUhOLMbxWcw1OCnm data→abuse_reports→set_resolve($resolution_callback2);
  #OQYdA5X444IGyqr3 where by_userid := true;
  #f24DCthnEY8n49Bi where by_publicationid := true;
  #ceqyHklvR8xcZh3s where resolution_callback2(fetch_result: ♻ indexed_store → fetch_result, api_request: * api_request) {
    #FpYoSWG2NTWxYl9h $users := code→follow_pub_ids($fetch_result→items, "publicationuserid", "");
    #dbOiLXlVYYG6om24 $with_users := code→add_username_etc_core($fetch_result→items);
    #zD74QVxoJ5Rt4j4V $coll := create→Collection_of→\u2339pub_abusereport;
    #xUbp42omnqeWzivO $x := 0;
    #xa3nhqBdObIUavf6 foreach jsb in $with_users
    do {
      #LzKzxmaOeOmTPh4Z if $jsb→field("pub")→string("userid")→equals($api_request→userid) `or` code→caller_is_facilitator_of($api_request, $users→at($x)) `or` code→caller_is_facilitator_of($api_request, code→unsafe_to_json($jsb→field("*userid"))) then {
        #tK7DZrU2FTkQ37Dx $report := records→pub_abusereport→create_from_json(code→unsafe_to_json($jsb→field("pub")));
        #EquOR0gN9gsaHeiY $report→text := code→decrypt($report→text);
        #j2wSQWbPB86n9Gmv $coll→add($report);
      }
      #R488B06r9iKlYgMf $x := $x + 1;
    }
    #NjL08B29hkCYnP9R $fetch_result→items := $coll→to_json;
  }
  #EWN442MbXzixzstA data→abuse_reports→create_index("publicationuserid", `fun:entry` $entry→field("pub")→string("publicationuserid"));
  #HK5VRFQLlx1UK2Ti code→add_route("GET", "*user", "abuses", $handler3);
  #gkynJw1YSsdSQVtx where handler3(req: * api_request) {
    #x3ZTz7Hxd5FNwXqF data→abuse_reports→any_list($req, "publicationuserid", $req→root_id);
  }
  #yq1N4UDhZGlWU4cx code→add_route("POST", "*abusereport", "", $handler);
  #udFnEo82SP0MBDo8 where handler(req: * api_request) {
    #x4F0VtA8uGMFDMEn $pub := $req→root_pub→field("pub");
    #oxA1H7z3pL2yCQ2n code→check_facilitator_permission($req, $pub→string("publicationuserid"));
    #U24gyXoMJO6r5Fu4 if $req→status = 200 then {
      #Pn4wTLhV9plF35c4 $res := $req→body→string("resolution");
      #xQWyq92QrgeRMnAT data→pubs_container→update($req→root_id, $update);
      #KO4l6CQKfFOex2ZA where update(entry: Json_Builder) {
        #x1FRSOyMqaj4kt5O code→set_fields($entry→field("pub"), $req→body, "resolution");
      }
      #moXIwjJTxx4nV4pe data→pubs_container→update($pub→string("publicationid"), $update2);
      #lnKZXuHcz5r866pL where update2(entry: Json_Builder) {
        #GLiZPE7rZKwgEEve $entry→set_string("abuseStatus", $res);
        #xvubAGw43mnf1lD1 $entry→remove_field("abuseStatusPosted");
      }
      #UZ4ypmrUzx1wUWnW $req→response := web→json("{}");
    }
  }
  #jWeX6c2f308oj25a code→add_route("POST", "*pub", "abusereports", $handler2);
  #HxQEZ0JF4GLn8TNc where handler2(req: * api_request) {
    #xop5bosFcLHwDM7T code→can_post($req, "abusereport");
    #xJpAnveSTcg4xxRI if $req→status = 200 then {
      #WqWqt9Z8zPcgFQGX code→post_abusereport($req);
    }
  }
  #GhE34f1cbkGX3jgA code→add_route("DELETE", "*pub", "", $handler4);
  #mM8JG7cTHysd5dUG where handler4(req: * api_request) {
    #NRYHCEJsd25Kwy4v if code→can_be_admin_deleted($req→root_pub) then {
      #xp21u2TSPuz5nTxL code→check_delete_permission($req);
      #BPCmZMn2dm0ONcr8 if $req→status = 200 then {
        #Re4Gt1MhF4cFa0M2 code→audit_log($req, "delete");
        #tRTYoADIz7tTRP75 where oldvalue := code→audit_delete_value($req→root_pub);
        #kzP1neFXUvWmOQvr code→delete_pub_rec($req→root_pub);
        #mCdYRxe0wtRtuzFG $req→response := web→json("{}");
      }
    }
    else {
      #YV2KsxqouJVbyOtD $req→status := @\u267b→restify→http→@405_Method_Not_Allowed;
    }
  }
  #Bw6wjirk6oSmc5Hf code→add_route("GET", "*pub", "candelete", $handler4);
  #GLVlYs0VuojRQiUH where handler4(req: * api_request) {
    #QZOUVLHyUgGGwTfV $resp := records→candelete_response→create;
    #lnVDDRmHILzRyN7v $pub := $req→root_pub→field("pub");
    #obM7VosHmIQYTZ5H $resp→publicationkind := $req→root_pub→string("kind");
    #mICMPBiyHs9Qv42N $resp→publicationname := code→with_default($pub→string("name"), "/" ∥ $req→root_id);
    #YaD4SrolZ5l5IOPI $resp→publicationuserid := code→get_author($pub);
    #QR5ZsnJ94tXaIujO $resp→candeletekind := code→can_be_admin_deleted($req→root_pub) `or` code→has_special_delete($req→root_pub);
    #xaHwJbnZmbyinUvt $reports := data→abuse_reports→get_index("publicationid")→fetch($req→root_id, web→json("{\"count\":10}"));
    #OE9dBJ2d2v4WWcDs $resp→hasabusereports := $reports→items→count > 0 `or` `not` $reports→continuation→is_empty;
    #xLXG0bc2s6DCBFwA if $resp→candeletekind then {
      #mwt2zWC3ItUVb1QQ code→check_delete_permission($req);
      #xIAHbnCN4rhtAvS9 if $req→status = 200 then {
        #gRXciM2tkJB7OhuL $resp→candelete := true;
        #xI9Afn74I3DZR7Av if $resp→publicationuserid→equals($req→userid) then {
          #XSatd04AGIPiCwCs code→check_facilitator_permission($req, $resp→publicationuserid);
          #CrfOTHZ4YYesaF9O if $req→status = 200 then {
            #BnzL4odFTpCgwVBC $resp→canmanage := true;
          }
          else {
            #x9o1GdaX2HpinQt7 $resp→canmanage := false;
            #P3JO4CuM202zpofP $req→status := 200;
          }
        }
        else {
          #rWXR5fGOhIXrVv62 $resp→canmanage := true;
        }
      }
      else {
        #h0Ev0yksY3t6l0bR $resp→candelete := false;
        #eF8BrJm21jBF2EmZ $req→status := 200;
      }
    }
    #TVn9JEUInk46a2Am $req→response := $resp→to_json;
  }
  meta private;
}
#TOrfXkRP4VVvZsra
var abuse_reports : ♻ indexed_store → store {
  transient = true;
}
#Uh8H24PQoI8gWL7n
action check_facilitator_permission(#P6OIJ05Sy25DQSlR req: * api_request, #xMXfrIDBzrsgXr34 subject_userid: String) {
  #wbwGcQZuly5ACEqL if $req→userid→is_empty then {
    #BTJj2EDKtulDX7ii $req→status := @\u267b→restify→http→@401_Unauthorized;
  }
  #yjtzGuCuz2xsYp2q if $req→status = 200 then {
    #xoRNvPc1g62cxFzW $userjs := code→get_pub($subject_userid, "user");
    #iV3bbmv0Ivu7yBUi if $userjs→is_invalid then {
      #xgGGuwy9T2jYxLdn code→check_permission($req, "root");
      #qh2fpfGKofx173pO `return` ;
    }
    #TZ8reOCNhul42eaM if `not` code→caller_is_facilitator_of($req, $userjs) then {
      #QoaUNUvAAC4muJGn $req→status := @\u267b→restify→http→@402_Payment_Required;
    }
    else {
      #dn12d19hl2tBhLhD // You need to have all of subject's permission to delete their stuff.
      #RJiyTWziCwVFjEba code→check_permission($req, code→get_permission_level($userjs));
    }
  }
  meta private;
}
#WdxyTuJlzmOQfl6G
action follow_pub_ids(#LYrZjc5hMUlUcO1l fetch_result: Json_Object, #MbCF6hNihZ7r2Nk8 field: String, #rO2k0xhz6GPiz404 kind: String) returns(#XuPVInbUjBjyTVH4 pubs: Collection[Json_Object]) {
  #crwY7uzdkyAdMR4r $ids := create→Collection_of→String;
  #xweHoaTIQ1CJ21ks foreach js in $fetch_result
  do {
    #x1It4zsiGBQ4YZhS $s := $js→field("pub")→string($field);
    #W83qfGOGiB2LkB82 $ids→add($s);
  }
  #ucM25vbsPfEo1JTt $pubs := data→pubs_container→get_many($ids);
  #fEesyXVpnsNE4RVt if `not` $kind→is_empty then {
    #z8Nwbf4UW8Q9Zvth $pubs := $pubs→@where( `fun:elt` code→is_good_pub($elt, $kind));
  }
  else {
    #jTTTlVJP0ihVAX1Y $pubs := $pubs→map_to→Json_Object($lambda);
    #VmDbAwF46LrSggGe where lambda(elt: Json_Object) returns (result: Json_Object) {
      #tQ3Hmn1WdBqEm2CD if $elt→is_invalid `or` $elt→string("kind")→equals("reserved") then {
        #yiHlWfrueiaPXiYh `return` invalid→json_object;
      }
      else {
        #WXfSqnj9q2zkYj8D `return` $elt;
      }
    }
  }
  meta private;
}
#ok48Ka5MY5fGIG88
action delete_pub_rec(#xTRAph9h2PkFhC4z del_entry: Json_Object) {
  #ZCfhJfFlex2MsRZ4 if $del_entry→string("kind")→equals("review") then {
    #UCvPqPSd678dsdcG $delok3 := code→delete_review($del_entry);
  }
  else {
    #ZvidgtwOM47fonEC $delok := code→delete($del_entry);
    #EyKpJ2BOW6Xp92Y4 if $delok then {
      #xFaw6xxp3LRH4AG2 // TODO handle updateId stuff for scripts
      #Y9GwR8r3SPLz2kx0 // TODO delete comments on this publication
      #Uw99AYc1pyK4xju3 // TODO update comment counts
      #xvA0uUng990FXJ4C $kind := $del_entry→string("kind");
      #OuXrgUOGxg3T4mQK $entryid := $del_entry→string("id");
      #xUicAKUVOJ12e2Ek if $kind→equals("group") then {
        #riLynUwcx5LTaYlD $memberships := data→group_memberships→get_index("publicationid")→fetch_all($entryid);
        #HV1jgQ4UkOrRPpEe @\u267b→parallel→for_json($memberships, $action2);
        #z19rL3hZ9cDG4nhW where action2(json: Json_Object) {
          #xcaCGwS5mCm7iCQQ $uid := $json→field("pub")→string("userid");
          #L2U9nWAoaE1LJSsG $delok2 := code→delete($json);
          #xjJ2PPp01FbKBKoD data→pubs_container→update($uid, $update6);
          #FSMwA6hNLWbkXWxA where update6(entry: Json_Builder) {
            #jd5QljnQUMgLvANe code→set_builder_if_missing($entry, "groups")→remove_field($entryid);
            #xV25AyBQgPxElNow code→set_builder_if_missing($entry, "owngroups")→remove_field($entryid);
          }
        }
      }
      else { #a37tC4ekRIGbpBIM if $kind→equals("pointer") then {
        #rLMSQMcKdNZJVHZG code→clear_ptr_cache($entryid);
      }
      else { #C3aUbJvrFSuMF5mR if $kind→equals("script") then {
        #mOGJkJOhamTvDsc2 data→script_text→update($entryid, $update);
        #v5Fn4R1Rny64W4d5 where update(entry: Json_Builder) {
          #RVGOPXqNl7eRx7E9 foreach fld in $entry→keys
          do {
            #TXm4WssSN4EbrC4h $entry→remove_field($fld);
          }
        }
      }
      else { #xjJuxuY4GZ475Ph3 if $kind→equals("art") `or` $kind→equals("screenshot") then {
        #xrteORPfPzxxBUsj data→art_container→delete_blob($entryid);
        #c7yEbwP42fbwBG5Y foreach thumb_container in data→thumb_containers
        do {
          #xcqkrZjpm9XxtDfy $thumb_container→container→delete_blob($entryid);
        }
      }
      else { } } } } 
      #x9FhI7cgJiPuxj2y $abuses := data→abuse_reports→get_index("publicationid")→fetch_all($entryid);
      #VneIan95HNAUYehk @\u267b→parallel→for_json($abuses, $@action);
      #WOfQZOxALLcUY9TV where @action(json: Json_Object) {
        #Rgb98cpjm3CYBk4m data→pubs_container→update($json→string("id"), $update3);
        #WFizZwgbTKibHszY where update3(entry: Json_Builder) {
          #nTfpUlaQBXHdZ4qW $entry→field("pub")→set_string("resolution", "deleted");
        }
      }
      #xZ86fDQH0uu4rdio skip;
    }
  }
  meta private;
}
#tqY2DZjPTc2RhdXJ
action me_only(#ZwrZoxsJlzyB1dLm req: * api_request) {
  #PWEVNnoiAKVwQhcv if `not` $req→root_id→equals($req→userid) then {
    #BzkaXuyMDNK9sigh code→check_mgmt_permission($req, "me-only");
  }
  meta private;
  meta sync;
}
#qDWK2hPlhtA3PRln
action normalize_permissions(#IuFmxZLK6AFvIxLv perm: String) returns(#xcqosTe92lKEbEVe perm2: String) {
  #xKzS6rpexLBQdL6x $perm := code→or_empty($perm)→replace_regex(",+", ",");
  #suBl3Bk1ef8fDelt if $perm→is_empty then {
    #q8rlHesdFIYJaQ17 $perm2 := "";
  }
  else {
    #B1q8LhH9hN5V5HRE if `not` $perm→starts_with(",") then {
      #LM5aKXkwY47IpCDN $perm := "," ∥ $perm;
    }
    #jsV4ksRCt5YtQazw if `not` $perm→ends_with(",") then {
      #L6lVwXglc7Ypk962 $perm := $perm ∥ ",";
    }
    #j7Xlfb9Z299uQMys $perm2 := $perm;
  }
  meta private;
  meta sync;
}
#prkXU64oCqKu6ZxE
action mbed_compile(#hB6uU4tIvnHumcBS req: * api_request) {
  #tw5ZRue5v6oy2JTx $compile_req := records→compile_req→create_from_json($req→body);
  #Biv20OHQ1fjuWTp4 $name := "my script";
  #DpFmsmkAYRi2o4z1 if `not` $compile_req→@meta→is_invalid then {
    #r5a7dAIR7dVZWCva $name := code→with_default($compile_req→@meta→string("name"), $name);
  }
  #xDLjHz6LZQLChamc $name := $name→replace_regex("[^a-zA-Z0-9]+", "-");
  #YdwGjZmIPpIs66po $cfg := data→settings_container→get("compile");
  #S1zoe02Pmxcvv8S4 $sha := code→sha256($compile_req→to_json→serialize ∥ "/" ∥ data→mbed_version ∥ "/" ∥ $cfg→number("__version"))→substring(0, 32);
  #nvGblslGR3jBxQLW $info := data→compile_container→get_blob_to_text($sha ∥ ".json");
  #RrP89Ec326J2QZ82 $compile_resp := records→compile_resp→create;
  #xFC41L8OpQwA8g1T $compile_resp→statusurl := data→compile_container→url ∥ "/" ∥ $sha ∥ ".json";
  #bWJxsql4C5Bc4XYE data→logger→info("mbed compile: " ∥ $compile_resp→statusurl);
  #JHG4Kq26nIYei3OW $hit := false;
  #xStGyPVu9fQSsB42 if $info→succeded then {
    #DyF8TNqJVNV2a5iM $js := web→json($info→text);
    #x1bHVMSI8vE2fkS3 if data→mbed_cache `and` $js→boolean("success") then {
      #xUoMfTNh68Laq1nL $hit := true;
    }
    else {
      #xwL4iCY7solt8Nwf data→compile_container→delete_blob($sha ∥ ".json");
      #tPV7Ci4g5e4G8NjE data→logger→tick("MbedCacheHitButRetry");
    }
  }
  #YfRcA3CUxGZ0Dggu if $hit then {
    #VYrg9FNCBnzamKwx data→logger→tick("MbedCacheHit");
    #ewQOTVefbjYEtFbF $req→response := $compile_resp→to_json;
  }
  else { #TLwmb8YYAO210VI9 if $cfg→field($compile_req→config)→is_invalid then {
    #xuhZgzu3hJm9UEoD $req→status := @\u267b→restify→http→@412_Precondition_Failed;
  }
  else {
    #e8225XCc2mSyEQvC if $compile_req→source→count > 200000 then {
      #JD5KplGAZuWkDPlA $req→status := @\u267b→restify→http→@413_Request_Entity_Too_Large;
    }
    #lPGTLjC6DL3EMnLY $numrepl := create→Ref_of→Number;
    #u4eVEWeKDbKBEpsH $src := $compile_req→source→replace_regex_with_converter("#(\\s*include\\s+[<\"]([a-zA-Z0-9/\\.\\-]+)[\">]|if\\s+|ifdef\\s+|else\\s+|elif\\s+|line\\s+)?", $lambda);
    #WCpHpcN4Z8C9TC2Z where lambda(elt: Collection[String]) returns (result: String) {
      #l35A8wmQGnsVOMB4 $body := code→or_empty($elt→at(1));
      #x8LuMirZcbw9wd0s if $elt→count > 1 `and` `not` $body→is_empty then {
        #j29k9M8W2y4wViWr $result := "#" ∥ $body;
      }
      else {
        #o1NyLAsA6W42wo9E $result := "\\x23";
        #tJ4njRzihMtkDHWi $numrepl→\u25c8add(1);
      }
    }
    #xU4yFeWCqBFlYr0c $src := $src→replace("%:", "\\x25\\x3A");
    #xfMPu9665JkXcs62 if $numrepl→\u25c8get > 0 then {
      #iEKz9PSfewZ9OLHm data→logger→info("replaced some hashes, " ∥ $src→substring(0, 500));
    }
    #DxVelQyByhH1ykac code→throttle($req, "compile", 20);
    #f9gE7lpjVWz7sqMh if $req→status = 200 then {
      #xrZYl4BEOy2sMu5Y $is_fota := false;
      #xQg2NCvFYE06Yn8Q if $compile_req→config→ends_with("-fota") then {
        #VN2X7BrisxbTHnPJ $is_fota := true;
        #GSzEaRiORzX7nQ3p $compile_req→config := $compile_req→config→replace_regex("-fota$", "");
      }
      #xbJJcOPHYNdZqueM $json := $cfg→field($compile_req→config);
      #yM6S9rV4W7bz3xbN if $json→is_invalid then {
        #IIRCL20OWluVkzjZ $req→status := @\u267b→restify→http→@404_Not_Found;
        #rGHbK4hGniZQEo5Q `return` ;
      }
      #xtdSNLqy2RH6RuWo $ccfg := records→compiler_config→create_from_json($json);
      #xC5DLPc3KGKAyJxX if $is_fota then {
        #cyjlg2bXynR1Wl2o $ccfg→target\_binary := code→or_empty($ccfg→target\_binary)→replace("-combined", "");
      }
      #PjL1qhkxh8NjQIWg if code→or_empty($ccfg→repourl)→is_empty then {
        #xpooV72ZmHpsx2ns $req→status := @\u267b→restify→http→@404_Not_Found;
        #xwVtP4uSC3F7rrHx `return` ;
      }
      #UoPzuUX6M2VctrQR $ccfg→hexfilename := $ccfg→hexfilename→replace("SCRIPT", $name);
      #b0BB6X1NGEpw0mA3 if `not` code→or_empty($ccfg→internalUrl)→is_empty then {
        #GOb2HGISnqqh51gd if code→or_empty($compile_req→repohash)→is_match_regex("^[\\w.\\-]+$") `and` $compile_req→repohash→count < 60 then {
          #ReBgbizSyqFuce3k $ccfg→repourl := $compile_req→repohash;
        }
        #NcWY06tPzSqRtQ0q if $ccfg→repourl→is_match_regex("^[a-f0-9]+$") `and` $ccfg→repourl→count = 64 then {
          #jawYmWtP0O4iKuhK // OK, looks like image ID
        }
        else {
          #xjqYgqKq443BuDZO $tags := data→settings_container→get("compiletag");
          #cYBzEX90iY4RR5RT if $tags→is_invalid then {
            #lChzj9mpAFaLzWw7 $tags := web→json("{}");
          }
          #faXbwG4MhVNSkg52 $imgcfg := $tags→field($compile_req→config ∥ "-" ∥ $ccfg→repourl);
          #oWcDhkUn12B40mCz if $imgcfg→is_invalid then {
            #wMLx4LkJjUDDCSQf $imgcfg := $tags→field($ccfg→repourl);
          }
          #mxkszKaVEGlmL8jz if $imgcfg→is_invalid then {
            #PBU99aiCApPG8Sx7 $imgcfg := "" →to_json;
          }
          #x7kDg6ZjJ42mRnG2 $imgid := code→or_empty($imgcfg→to_string);
          #PkC66zm2lL5Fm2UB if $imgid→is_empty then {
            #qbijkTYsxWv6Ehxc data→logger→info("cannot find repo: " ∥ $ccfg→repourl);
            #d2YzRmciBdDJXKI0 $req→status := @\u267b→restify→http→@404_Not_Found;
            #xrkEOA0o3bbgfI2z `return` ;
          }
          #w6t4Asuw48HStSB5 data→logger→debug("found image: " ∥ $ccfg→repourl ∥ " -> " ∥ $imgid);
          #j2boXcL3OUD4pb4i $ccfg→repourl := $imgid;
        }
        #f6XQMccuR2l4tXlF $jsb := web→create_json_builder;
        #BPzFgWnoRXTzKlsU $jsb→set_string("maincpp", $src);
        #xpgrsquJZN2a4dR2 $jsb→set_string("op", "build");
        #OzGETTIY4kdXJDl5 $jsb→set_string("image", $ccfg→repourl);
        #Q4srjOBZrZnNj4G0 `async` code→mbedint_download($sha, $jsb, $ccfg);
        #om1mq2pQOhZUpkDF $req→response := $compile_resp→to_json;
      }
      else { #fSNjTV6sOxrori1x if code→or_empty($ccfg→target\_binary)→is_empty then {
        #YHbkAheRBwHBcJ9d $req→status := @\u267b→restify→http→@404_Not_Found;
      }
      else {
        #E9GRZHVAhVo5kgGk if code→or_empty($compile_req→repohash)→is_match_regex("^[\\w.\\-]+$") then {
          #zq9GI0ikVHU92Nha $ccfg→repourl := $ccfg→repourl→replace_regex("#.*", "#" ∥ $compile_req→repohash);
        }
        #rrERCnwg09VPZxJ6 data→logger→debug("compile at " ∥ $ccfg→repourl);
        #VphfehnnMnad84Rf $compile := @\u267b→mbedworkshop_compiler→create_compilation($ccfg→platform, $ccfg→repourl, $ccfg→target\_binary);
        #TOSGk8OvBR8quO1s $compile→replace_files→set_at("/source/main.cpp", $src);
        #XU06FjdFJH0BhUlh $started := $compile→start;
        #j2QDqpEwJuKJnTq3 if `not` $started then {
          #rBpKcwjouAKge3Mx data→logger→tick("MbedWsCompileStartFailed");
          #mSPUBqjnp9c6k9XV $req→status := @\u267b→restify→http→@424_Failed_Dependency;
        }
        else {
          #ITQ2Yw7WcC7EDDSh `async` code→mbedws_download($sha, $compile, $ccfg);
          #xkZ4LArU6Ap4DsD0 $req→response := $compile_resp→to_json;
        }
      }
      } 
    }
  }
  } 
  meta private;
}
#khI5kToLth4yuke1
table compile_req {
  type = "Object";
  persistent = false;
  fields {
    #SwQoxUnnXMKFa3FR config : String
    #eIZPByxqhQ9flW6x source : String
    #FKifih1B6pA4uIhS @meta : Json_Object
    #FyAzYSIgtTW7gfYG repohash : String
  }
}
#xDp9f2yM4KzTnCuS
action sha256(#ddWz2f3buZ9KBRfx hash_data: String) returns(#oF2gyfqoPVfpOlbT sha: String) {
  #UYRa8K885aQftF4r $hash := @\u267b→node_crypto→create_hash("sha256");
  #RJryE4ZQFpAdvV9p $hash→update_hash_string($hash_data);
  #ZL2jKjkyv4OO0Mgo $sha := $hash→digest_hash→to_string("hex")→to_lower_case;
  meta private;
  meta sync;
}
#ghUgIN1i4jyNBplH
var compile_container : ♻ azure_blob_storage → Container {
  transient = true;
}
#xGdrCTiGP4Wa2bzC
table compile_resp {
  type = "Object";
  persistent = false;
  fields {
    #GenlBHRdS8AQOxnf statusurl : String
  }
}
#No6lksdjLlmHM2SD
table compile_status {
  type = "Object";
  persistent = false;
  fields {
    #KC3FGonGfH6JBLkz success : Boolean
    #nGLhFKoFQ4lRrxJO hexurl : String
    #fGOKER0CF2RmMvJt mbedresponse : Json_Builder
    #xXAT6tiJh5Av6hQt messages : Collection[Json_Object]
  }
}
#IHQKO1XyG70T8zNx
action handle_https(#x1Y8B9iamJ5Xki21 req: ♻ restify → Request, #JW9BQQvfJP1Z4WPJ res: ♻ restify → Response) {
  #ykwURe0AfYrcxVO6 if data→has_https `and` `not` $req→is_secure `and` `not` $req→server_url→starts_with("http://localhost:") then {
    #plPEuJzJ03OpWoeX $res→redirect(302, $req→server_url→replace_regex("^http", "https") ∥ $req→url);
  }
  meta private;
  meta sync;
}
#xm4qoTn5b6XLMhqg
action set_fields(#zPrUerwAetR4aaEz bld: Json_Builder, #wu2aTW7yrW7opgYe body: Json_Object, #vg8cwcwOsJghPNTG fields: String) {
  #xpeX74TrDoQE0uYP foreach fld in $fields→split("\n")
  do {
    #Wa6UT2u4OLnXyoRF if $body→contains_key($fld) `and` $body→field($fld)→kind→equals($bld→field($fld)→kind) then {
      #Jqmlu2RIt45E0x8m $bld→set_field($fld, $body→field($fld));
    }
  }
  meta private;
  meta sync;
}
#KKMwD373fXY1Oeli
action add_subscription(#q8AMVYyY86z3CBFK follower: String, #limHzh3TIRKpAnqG celebrity: String) {
  #dJTogBdU2JZ7L69s $sub := records→pub_subscription→create;
  #bR3rNw7AkS9zzlb2 $sub→id := "s-" ∥ $follower ∥ "-" ∥ $celebrity;
  #bghhkhkbfke7LcZZ if `not` $follower→equals($celebrity) `and` code→get_pub($sub→id, "subscription")→is_invalid then {
    #u8SdhgGbJ65ZjjT9 $sub→userid := $follower;
    #EfIj4NO4h5YsC4jc $sub→time := code→now_seconds;
    #fHpEs8LLro9uc6Az $sub→publicationid := $celebrity;
    #wQxo1qoiJ4BS6zCX $sub→publicationkind := "user";
    #hxlQVDjIfLlBiGDj $jsb := web→create_json_builder;
    #xXwZKfKDlh4xQrK0 $jsb→set_field("pub", $sub→to_json);
    #xgDbTBlIloBYVzt2 $jsb→set_string("id", $sub→id);
    #UAIGfUvm5L0YFXTH data→subscriptions→insert($jsb);
    #x4SV7QUMPnmwFyIt data→pubs_container→update($sub→publicationid, $update);
    #aWZOIvzYcnBOEUIq where update(entry: Json_Builder) {
      #xvkETAG9dUk5ZMlU code→increment($entry, "subscribers", 1);
    }
  }
  meta private;
}
#Afnf4myQThxPYh2m
action can_be_admin_deleted(#QcYuB4VjZw8niCkW jsonpub: Json_Object) returns(#xcHhjw3sYgEGsbmS b: Boolean) {
  #vjJjz9iAVsvYcR49 $b := $jsonpub→string("kind")→is_match_regex("^(art|screenshot|comment|script|group|publist|channel|pointer)$");
  meta private;
  meta sync;
}
#Ak117Irq3T7uAYvH
action check_delete_permission(#T1e9VqVpHBv7purj req: * api_request) {
  #yqsYWSXlJDOj9dCV $pub := $req→root_pub→field("pub");
  #AxgbZqefg10GJVlY $authorid := $pub→string("userid");
  #xHYovrHeGQyHhOWG if $pub→string("kind")→equals("user") then {
    #xUSFFk2vQebLl2nZ $authorid := $pub→string("id");
  }
  #Zujbk2xHsZDqPo30 if `not` $authorid→equals($req→userid) then {
    #cAaWAWuZ05KnPN9p code→check_facilitator_permission($req, $authorid);
  }
  meta private;
}
#x4UdYwCEo58ZBPYm
table candelete_response {
  type = "Object";
  persistent = false;
  fields {
    #jthzacfv7qtSQTot publicationkind : String
    #xoyJ4sJSHOCa3yOI publicationname : String
    #xhNck4o24YuMSedh publicationuserid : String
    #Hp4Z3IcKJ3Mklrm1 candeletekind : Boolean
    #lZ9g4e2fyWsyKHTV candelete : Boolean
    #Sy8l4lIcyqLllI0Z hasabusereports : Boolean
    #fU4NneksbOKESgQW canmanage : Boolean
  }
}
#iVBxFXknsgvp57v5
action can_post(#xdEt5y7lk3itLhPY req: * api_request, #OEBmJ6PPCyvjRCmY kind: String) {
  #jL2p7y7XT69VzIzx if $req→userid→is_empty then {
    #CDDJdJcQQTTW6ox1 $req→status := @\u267b→restify→http→@401_Unauthorized;
  }
  else {
    #H3zo7xutPguGdRDD code→check_permission($req, "post-" ∥ $kind);
    #nBhpMgcaQcwAShSM if $req→status = 200 then {
      #x3TrQ7BvL2Rqr8b6 if code→caller_has_permission($req, "post-raw") `or` code→caller_has_permission($req, "unlimited") then {
        #T6jwUk3gR89iYSQ2 // no throttle
      }
      else {
        #HMz6k1fGMMH2ERx4 code→throttle($req, "pub", 60);
      }
    }
  }
  meta private;
}
#lVl8VKgkqROB8JJW
action get_user\'s_groups(#liBtVcYzL9KFo15c subject_userid: String) returns(#IsasSMsilyDqGngo groups: Collection[Json_Object]) {
  #xFuBNF7jlNpypwVm $fetch_result := data→group_memberships→get_index("userid")→fetch_all($subject_userid);
  #Wulwa58xMVdv9mJA $groups := code→follow_pub_ids($fetch_result, "publicationid", "group");
  meta private;
}
#xWNYvyPbv3Eyoqvy
action remove_subscription(#sQUWXFb5HruRcKV1 follower: String, #wkpUpk84MfNyvBGT celebrity: String) {
  #L5QG3y8cMdSIRMyS $subid := "s-" ∥ $follower ∥ "-" ∥ $celebrity;
  #eE6CnmKILf09ZZcj $entry2 := code→get_pub($subid, "subscription");
  #xYwSo8y78FBwnoke if `not` $entry2→is_invalid then {
    #hciEnAR0BPRrNWFF $delok := code→delete($entry2);
    #xn2obR5LPzTEBaIO if $delok then {
      #w4mKVyuMsMx5Waaf data→pubs_container→update($celebrity, $update);
      #YCrXJjwfL1r88BIC where update(entry: Json_Builder) {
        #xRnUsHMIBIIzcFgd code→increment($entry, "subscribers", - 1);
      }
    }
  }
  meta private;
}
#xVsvwicL6nVdiP9W
action delete(#D0R9ew4blTHC4cis del_entry: Json_Object) returns(#yTsOEpRfWx032izV delok: Boolean) {
  #YxJECewFJ4wa2PGq if $del_entry→is_invalid `or` $del_entry→string("kind")→equals("reserved") then {
    #MsoK2GIseLGiqh2m $delok := false;
  }
  else {
    #xK3WI5v2qSDfLBXG $store := @\u267b→indexed_store→store_by_kind($del_entry→string("kind"));
    #LWXn7Mq3YibjkRN4 if $store→is_invalid then {
      #ZMuMWoczxpft9Umr $store := data→scripts;
    }
    #I2nEnV27LJ8kCbhY $delok := $store→delete($del_entry→string("id"));
  }
  meta private;
}
#OH4uNtINN5wnDv8P
action get_notifications(#xcL87A3zdlUVpi2F req: * api_request, #jzEXOSTDqunKZXRj long: Boolean) {
  #xUWCBjH9ER4gO6ib if $req→root_id→equals("all") then {
    #h7q8sRL2v0Dcq4bk code→check_permission($req, "global-list");
  }
  else { #RKlH7sGRql2PPoXI if $req→root_pub→string("kind")→equals("group") then {
    #rlBJGq20HonNvtL3 $pub := $req→root_pub→field("pub");
    #nNEbauX0ABSP9x4K if $pub→boolean("isclass") then {
      #KHpIpg4iew7FIIKb $b := $req→userinfo→json→field("groups")→contains_key($pub→string("id"));
      #HP5m5hF07wcTpUkR if `not` $b then {
        #p2vfJI4LtOxMPPpY code→check_permission($req, "global-list");
      }
    }
  }
  else {
    #UhQGem700bMVoY1p code→me_only($req);
  }
  } 
  #Y1jMMJN4sEFfCBq1 if $req→status ≠ 200 then {
    #tLzZ7YE7b98pNOuL `return` ;
  }
  #OSPaNwDmM9hVEHb2 $v := code→long_poll("notifications:" ∥ $req→root_id, $long, $req);
  #xVNLUpLX2l18U9TN if $req→status = 200 then {
    #pFNSxleZAz4b2u3L $res_query := data→notifications_table→create_query→partition_key_is($req→root_id);
    #KAlLR2e5E4P5HyI2 $entities := @\u267b→indexed_store→execute_table_query($res_query, $req→query_options);
    #hJc2Q7FXPI7x6t93 $coll := create→Collection_of→\u2339pub_notification;
    #lDrZ3k9Sb4NyLhES $coll→from_json($entities→items);
    #IEhddKqrRHkB1Fre $entities→items := $coll→to_json;
    #jprRcbgTGrsg1wDN $entities→v := $v;
    #Y9nAJd3Bx7Nzas8q $req→response := $entities→to_json;
  }
  meta private;
}
#xVqIILAMGorocxI4
action poke_sub_channel(#XPCq4Uv8iUyZe3mB channel: String) {
  #G1JMYdRvgd8O8gLH $s := math→random(1000000000)→to_string;
  #sbNgfOQ34I2ySajV data→redis_client→set($channel, $s);
  #fn92BCzkWHlVO2gF data→redis_client→publish($channel, $s);
  meta private;
}
#XanzBQ5gXwvNqRij
action get_sub_channel(#NCqj6vCIKA4Sog4j ch: String) returns(#PJL08DZZQJh82eYq v: Number) {
  #Xpp1jHfZiQiYjTYM $value := data→redis_client→get($ch);
  #gtiuM7rjiQaIiF74 if $value→is_invalid then {
    #I4KlimPAnz24YFqp $value := math→random(1000000000)→to_string;
    #xZxQmuR3uBZlW6Wf data→redis_client→set($ch, $value);
  }
  #xiiH61PLwYF2Ocd0 $v := $value→to_number;
  meta private;
}
#QjCgvNMRW42pujKs
action long_poll(#xK5WewHxuXA4f2M8 ch: String, #FpS8OG0yIyEXtQpv long: Boolean, #AChZePODYCBHcJbe req: * api_request) returns(#xEhcHXkm2WMb9y8k v: Number) {
  #KhqQU5bIjMIR4mk0 $v := code→get_sub_channel($ch);
  #Y9ShRzpiEJPwMdkW if $long `and` code→or_zero($req→query_options→number("v")) = $v then {
    #Lf0vDmyQx2z1iiK1 data→logger→context_pause;
    #xufb4Mn4XSEzFcR4 $message := data→redis_client→wait_on($ch, 30);
    #hkPOndC5DLUPzqH1 data→logger→context_resume;
    #YY05Zo46XDyEajaV if $message→is_invalid then {
      #rct4reOKnmvhKSAl $req→status := 204;
    }
    else {
      #C5cRjJKf176sk3du $v := code→get_sub_channel($ch);
    }
  }
  #yhTI47kvHrf2Gbw2 skip;
  meta private;
}
#t8jPirU1sb4RQtP4 meta import websocket_server {
  pub "agbfc"
  usage {

    action `async` `type` Request_Handler(request: ♻ websocket_server → Request)
    type Request

    action `async` listen(path: String, handler: ♻ websocket_server → Request_Handler)
    action `sync` origin(req: ♻ websocket_server → Request) returns(url: String)
    action `sync` path(req: ♻ websocket_server → Request) returns(path: String)
    action `sync` accept(req: ♻ websocket_server → Request) returns(socket: Web_Socket)
    action `sync` reject(req: ♻ websocket_server → Request)
    action `sync` remote_address(req: ♻ websocket_server → Request) returns(address: String)
    action `sync` query(req: ♻ websocket_server → Request) returns(query: Json_Object)
  }
}
#DG6wSG7kat3iaG8G
action handle_socket_request(#ndc4940coQq3WHAK js: Json_Object, #R2T6mCs5jQ8sVzM4 api_request: * api_request, #vJg9b58gcWlwKQAw socket: Web_Socket) {
  #DlEJrXgS5oIr12S7 $id := $js→string("reqid");
  #YSLC1t7Gig27hksi $resp := code→perform_batched_request($js→to_json_builder, $api_request, true);
  #xTlkCMvq8EEZhI3P $resp→set_string("reqid", $id);
  #VrIdYt9CdO0TR7HD $socket→send_json($resp→to_json);
  meta private;
}
#CEFahVfFak1FNT2s meta import raygun {
  guid "47f30244-e280-4515-ccce-b25f2c33aae1"
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
#QDqOJ3P9Fxi2xLbQ meta import loggly {
  guid "416bb265-788b-471a-1278-ac7c3a1ed894"
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
#x4MEAhyMFyl9EcWe
action throttle_core(#g2QlqtXf7aWLzh4v throttle_key: String, #m22ic3JGIZE0w7hE token_cost_\u005bs\u005d: Number) returns(#VDLxUO4Ql3aeKygf drop: Boolean) {
  #V4wf670i2bhQAtha $keys := collections→create_string_collection;
  #imJiY7CWWrisDnvF $keys→add("throttle:" ∥ $throttle_key);
  #cE2kWuJKdWiI441i $args := collections→create_string_collection;
  #V0bx1ZIB228xTb4P $args→add(data→redis_client→cached_time ∥ "");
  #RxiEckHEp7qkVJ2Y if data→throttle_disabled then {
    #xG03o4gmmv35VK8d // still simulate throttling at 1/1000 of rate (redis writes); below we ignore the result anyway
    #NH40o0gqwtFhr8OX $args→add($token_cost_\u005bs\u005d ∥ "");
  }
  else {
    #Z5HYTFQ68JIhJAsI $args→add($token_cost_\u005bs\u005d * 1000 ∥ "");
  }
  #x2Omi35qLeETCy4R // accumulate tokens for up N seconds
  #N88sAtlQAA8w6jdr $accumulation_seconds := 3600;
  #xgEe148hfwDSoG4i $args→add(($accumulation_seconds * 1000) ∥ "");
  #DlR4AILEo86RHCu1 // return wait times of up to 10000ms
  #yIGxxEZgT9eIzpTc $args→add("10000");
  #xbsrlNWlQg9EXxnw $value := data→redis_client→eval("local now     = ARGV[1]\nlocal rate    = ARGV[2] or 1000   -- token cost (1000ms - 1 token/seq)\nlocal burst   = ARGV[3] or 3600000    -- accumulate for up to an hour\nlocal dropAt  = ARGV[4] or 10000  -- return wait time of up to 10s; otherwise just drop the request\n\nlocal curr = redis.call(\"GET\", KEYS[1]) or 0\nlocal newHorizon = math.max(now - burst, curr + rate)\nlocal sleepTime  = math.max(0, newHorizon - now)\n\nif sleepTime > tonumber(dropAt) then\n  return -1\nelse\n  redis.call(\"SET\", KEYS[1], newHorizon)\n  return sleepTime\nend", $keys, $args);
  #x2OMqnw4UOoCjuzW $sleep_time := $value→to_number;
  #blN2jFu89tc24owE if data→throttle_disabled then {
    #YiccQd9n4PoTbxtL $sleep_time := 0;
  }
  #LZmHh672nhwfUeUw $drop := false;
  #gmYUVqIzAUT4hT7O if $sleep_time < 0 then {
    #pAESW9qGvCSBqThV $drop := true;
  }
  else { #Uvj8ucfJ8MwaxWJR if $sleep_time > 0 then {
    #xCFTTFHnBEJfUY3D time→sleep($sleep_time / 1000);
  }
  else { } } 
  meta private;
}
#k3IsxgESqcckHNt1
action has_special_delete(#xXfKOqf2923fNSlH jsonpub: Json_Object) returns(#lvfZc6B5nC1wGyus b: Boolean) {
  #xF6UyBjbvmSt64NS $b := $jsonpub→string("kind")→is_match_regex("^(review|user)$");
  meta private;
  meta sync;
}
#xhfsAeCb4IZj3OHa
action try_delete_pub_pointer(#HMS6PjDgbXUaNYiR key: String) returns(#mz0V4tcB68V3oS6E ok: Boolean) {
  #ejJ7Hz3UIYAuM2qF $ref := create→Ref_of→Boolean;
  #eSoVix8NVVzc7g12 data→pubs_container→update($key, $update);
  #Cl3fYgRhMAL23dHk where update(entry: Json_Builder) {
    #E6DK4Gw0DEIDYTxt if code→or_empty($entry→string("kind"))→equals("pubpointer") then {
      #TIbX9d5rLWd7M6fs $entry→set_string("kind", "reserved");
      #xdBjQ5rrZlH1O4OK $ref→\u25c8set(true);
    }
    else {
      #xzkWKQdE0tdPGSI8 $ref→\u25c8set(false);
    }
  }
  #efv8N91U4cprWWLU $ok := $ref→\u25c8get;
  meta private;
}
#wVE9O9DmdESJbN15
action try_insert_pub_pointer(#nnY1EW4L8QeY3o6T key: String, #Cj11O4uUVcBXoujK points_to: String) returns(#T1Pr5frAH16YriHW ok: Boolean) {
  #xvndoYc0l9s5Sz1S $ref := create→Ref_of→Boolean;
  #CR06LKlHrvwL9VVB data→pubs_container→update($key, $update);
  #LVb6mRGsH5mNJ1WA where update(entry: Json_Builder) {
    #yPh2kiWCTk1h9gJK if code→with_default($entry→string("kind"), "reserved")→equals("reserved") then {
      #xN2sTwppNfO06Gj8 $entry→set_string("kind", "pubpointer");
      #Kwt0Wb2I4J5VPnTg $entry→set_string("pointer", $points_to);
      #YGb2irMkqZzq5jc1 $entry→set_string("id", $key);
      #xnKS6QeReEpYH98A $ref→\u25c8set(true);
    }
    else {
      #Mq3mM3ouw4WahX5B $ref→\u25c8set(false);
    }
  }
  #vKvDtq4gfLSKioce $ok := $ref→\u25c8get;
  meta private;
}
#qf522W7LH49Ho3rL
table bug_report {
  type = "Object";
  persistent = false;
  fields {
    #xQz1t4eypTIkfJYB exceptionConstructor : String
    #xp6t86zMtI5B3It0 exceptionMessage : String
    #kPwTbsiLNsn2jpdl context : String
    #w6pwCKNYyfuIdseC currentUrl : String
    #U1BSDHesQvUAogS3 worldId : String
    #FoNPVo56F3yYBeai kind : String
    #QY8h7CXP4nHxXz0y scriptId : String
    #xMCfdKNTxY4kl2AR stackTrace : String
    #GIrctpl2JxPkkUWE sourceURL : String
    #FMI7LYDXbEGs4rOA line : Number
    #WjBiuYn8lflVLoeH eventTrace : String
    #At87zV2mWnRcS7uz userAgent : String
    #vsxnpE32wvFurGDG resolution : String
    #TIVPl0jlvNu1BuWp jsUrl : String
    #VW47wtrIOR431rGt timestamp : Number
    #ACS6Ai22uLiSe19a platform : Collection[String]
    #xxmuKBPpjrQ8ehCT attachments : Collection[String]
    #eE1u499NN7TL50DZ tdVersion : String
    #YREi59RNwO0QOBha logMessages : Json_Object
    #pYsG4IrprB9c5ECv reportId : String
  }
}
#JbLBQYZ44KOaO1jW
var mbed_version : Number {
  transient = true;
}
#pi87sGkwah3QQ0GY
var release_version_prefix : String {
  transient = true;
}
#rAba5jiKi115ae8m
action get_pointed_pub(#xJCKUE7Ok505KOgK key: String, #xosfRJHVymZbfnT5 kind: String) returns(#I8Gw5K8FE2U40dYJ entry: Json_Object) {
  #X1HfwujOYKKNAppE $ptr := code→get_pub($key, "pubpointer");
  #UZn2Kk2BJQ3b2Guq if $ptr→is_invalid then {
    #zC2TN1YRIAHUUNZ1 $entry := invalid→json_object;
  }
  else {
    #kXsNVyJeTo30qR37 $entry := code→get_pub($ptr→string("pointer"), $kind);
  }
  meta private;
}
#KzZvfrmqhIGDsRlE
var crash_container : ♻ azure_blob_storage → Container {
  transient = true;
}
#kb5azQQrn04X78tY
action sanitze(#VXQblD92imzNm2FN s: String) returns(#sUc80KxaTYRJn40k value: String) {
  #gKXC42W5XcWtgNEa $value := $s→replace_regex("access_token=.*", "[snip]");
  meta private;
  meta sync;
}
#xnYtNDDLJISLz1B8
action sanitize_json(#vDaRjSP0aiUYh1Fj jsb: Json_Builder) {
  #AhPJACbUcwDR1qMf foreach k in $jsb→keys
  do {
    #xyaGFjRxUd0dQHxp $v := $jsb→field($k);
    #PiyPoDMw42OQp8UY if $v→kind→equals("string") then {
      #TTVLooe8sAZuF57s $jsb→set_string($k, code→sanitze($v→to_string));
    }
    else { #pWyaFo236csntJvi if $v→kind→equals("object") then {
      #y8ySKKtg1qA43mmc code→sanitize_json($v);
    }
    else { } } 
  }
  meta private;
  meta sync;
}
#KgcNXHHfZ9ymYOfL
action crash_and_burn() {
  #aB0z2jwBTPaSy7Ls contract→assert(false, "/api/logcrash (OK)");
  meta private;
  meta sync;
}
#kSic6EYQsZjAcUKw
action \_init_bugs() {
  #fJOhL9BUkOb8Kn5d code→add_route("GET", "bug", "*", $handler);
  #iQV8mukYLb0szBiW where handler(req: * api_request) {
    #kjeo46F9AqGFuCUr code→check_permission($req, "view-bug");
    #IVjxXTnzAXU4Job9 if $req→status = 200 then {
      #oOgoJWGdEyNrlo6W $info := data→crash_container→get_blob_to_text($req→verb);
      #QhPqkDDc5ApA3dF2 if $info→succeded then {
        #v9O0iJM5xC6v0Pwp $js3 := web→json(code→decrypt($info→text));
        #KyhhmYEJC6DygEtg $req→response := $js3;
      }
      else {
        #yiR2FJ5CNAdVH3A2 $req→status := @\u267b→restify→http→@404_Not_Found;
      }
    }
  }
  #i0hj2NF5oWbQzhoW code→add_route("POST", "bug", "", $handler5);
  #HPVDqYLLtYtot2tz where no_size_check := true;
  #RsmQd4TudELaxCIH where handler5(req: * api_request) {
    #znyck4Je4SAjP4vE $report := records→bug_report→create_from_json($req→body);
    #iwwZFDc4Dc5ndaiy $jsb := web→json("{ \"details\": { \"client\": { }, \"error\": { \"stackTrace\": [] }, \"environment\": { }, \"request\": { \"headers\": {} }, \"user\": { }, \"context\": { } } }")→to_json_builder;
    #F1InR3lGQbmjxNam $timestamp := $report→timestamp;
    #gG2rCli5D9LV3z0t app→javascript("local", "jsb.item[\"occurredOn\"] = new Date(timestamp);");
    #wb0rtbXuslxzVUEd $det := $jsb→field("details");
    #xhlPTe6mB8M5XuTe $det→set_string("machineName", code→or_empty($report→worldId));
    #P6414iYyuK8BJnKR $det→set_string("version", code→or_empty($report→tdVersion));
    #ruYboxXt1yxfC64f $det→field("request")→field("headers")→set_string("User-Agent", code→or_empty($report→userAgent));
    #b52VLP4NvEMLszzS if data→full_TD then {
      #pL7ie3olRVRi8q2w $det→field("user")→set_string("identifier", $req→userid);
    }
    #iHGPu86AosgpiIYS $det→field("error")→set_string("message", code→with_default($report→exceptionConstructor, "Error"));
    #eY4GK65rSwuZxUbV $det→field("error")→set_string("innerError", code→or_empty($report→exceptionMessage));
    #LJpxgFawi74Aopo3 $report→reportId := "BuG" ∥ 20000000000000 - data→redis_client→cached_time ∥ @\u267b→azure_table→create_random_id(10);
    #Xtru4FLSuz7Ur1nA $js2 := $report→to_json;
    #Fj1IiScnXQ2GXaQx $enc_report := code→encrypt($js2→serialize, "BUG");
    #x0x8aHzq2FnjCMUO $result4 := data→crash_container→create_block_blob_from_text($report→reportId, $enc_report);
    #A8dDRp4MQ2tHhJQE $js := $js2→to_json_builder;
    #xtFJ4ph4G6x8vCsS $js→remove_field("eventTrace");
    #P9Q40d29rqHy6VnF $js→remove_field("logMessages");
    #xFj2SYev2ekYXpTj $js→remove_field("attachments");
    #g4obmiIQ9Ua3Y92m $det→set_builder("userCustomData", $js);
    #vBJlh6KxAImMGV6O $trace := $det→field("error")→field("stackTrace");
    #QS98CN3bC8FcfIDp $s := code→or_empty($report→stackTrace)→replace_regex_with_converter("^[^@\\s]*:\\d+", $lambda);
    #fiF7P4yOw0RzF6wv where lambda(elt: Collection[String]) returns (result: String) {
      #xAfXf4o0O040GDUz $result := "   at " ∥ $elt→at(0);
    }
    #o1gnGa2INFf6kQOC $s := $s→replace_regex_with_converter("^([^@\\s]*)@(.*)", $lambda);
    #g430bzq5jJvf5ldJ where lambda(elt: Collection[String]) returns (result: String) {
      #xjR8KiEkMKwIqdL1 $result := "   at " ∥ $elt→at(1) ∥ " (" ∥ $elt→at(2) ∥ ")";
    }
    #Y4oqpF2cvFCl7BWU $s := $s→replace_regex_with_converter(" at (\\S+?):([\\d:]+)$", $lambda);
    #UGmrW9oGAWJvpe2d where lambda(elt: Collection[String]) returns (result: String) {
      #Zm7keJrARL0YE23o $result := " at nofn (" ∥ $elt→at(1) ∥ ":" ∥ $elt→at(2) ∥ ")";
    }
    #jxlhnbd88lJW5mcU $s := $s→replace_regex_with_converter(" at (\\S+)[^(]*(\\((\\S+?):([\\d:]+)\\))?", $lambda);
    #cAIT2lrLs7I97hS9 where lambda(elt: Collection[String]) returns (result: String) {
      #utEjo4B5pY0L0g5l $st := web→create_json_builder;
      #X0sK2VDiwpSyj3FK $st→set_string("methodName", $elt→at(1));
      #P22XnNDUSZ4uVWFH $st→set_string("fileName", code→with_default($elt→at(3), "unknown"));
      #WSin4U38KhqAYvbj $st→set_number("lineNumber", code→with_default($elt→at(4), "1")→replace_regex(":.*", "")→to_number);
      #RqtHGssTwqVeEQlb $trace→add($st→to_json);
      #l8t8sHu1peptkXjX $result := "";
    }
    #VmWQ9JVjcXpyJaka if $trace→count = 0 then {
      #yx8uCtpy4OQLjEWA $st := web→create_json_builder;
      #COsNe87RDLDAt08Y $st→set_number("lineNumber", code→or_zero($report→line));
      #S1cpmqbMmJ8omtCe $trace→add($st→to_json);
    }
    else {
      #YKuYNbBD2s0OT41K foreach jsb2 in $trace
      do {
        #MraCpwJCcGb3HrBj $grps := code→or_empty($jsb2→string("methodName"))→@match("^([^\\.]+)\\.(.*)");
        #RnkuE7nT3PsG1tRv if $grps→count > 2 then {
          #OsLqPiXX2CjTHJQF $jsb2→set_string("className", $grps→at(1));
          #xNkzGGZp7S0vmMCX $jsb2→set_string("methodName", $grps→at(2));
        }
        else {
          #QFV4gwfEvVUY6OSx $jsb2→set_string("className", "X");
        }
      }
    }
    #xXjBSl1CmJT9NMxi data→logger→info("stored crash: " ∥ $report→reportId);
    #lQ9a2pWojAg82amU if code→or_empty($report→tdVersion)→is_empty then {
      #dd1V9BWwFgtBJU23 // Skip reporting of errors from local builds.
    }
    else {
      #xMpZgKh9Mzm8I2i3 code→sanitize_json($jsb);
      #gCNBp2G2t2Tn1Jxv $creq := web→create_request("https://api.raygun.io/entries");
      #CYElXsEo3X3PywA0 $creq→set_header("X-ApiKey", app→server_setting("RAYGUN_API_KEY2", false));
      #KBIsO9L4ZREiNpyk $creq→set_method("post");
      #vYDo2QSZ1GowozPO $creq→set_content_as_json($jsb→to_json);
      #BOjJhLtPB55Y8cZ4 $response := $creq→send;
      #xb12ZGuOvPyhBcUz data→logger→debug("raygun: " ∥ $response ∥ "");
    }
    #VfNGR6lvG79iHnxM $req→response := web→json("{}");
  }
  meta private;
  meta sync;
}
#sHIBgD0QJ4fm293Z
action salt_filename(#XjtqPBH7vaMFLr9T plain: String) returns(#lzAUG32Br2ApT7ck salted: String) {
  #mQC2KY8nc3K0DOc6 $salted := $plain ∥ code→sha256("filesalt:" ∥ data→token_secret ∥ $plain)→substring(0, 20);
  meta private;
  meta sync;
}
#zpmBq2JjXAtrscBW
action deploy_compile_service(#UAx5fSo1kM9N7HO9 rel: * pub_release, #hDubu2xlzXZZAH16 req: * api_request) {
  #xJEMDjD6edt8CZPk // TODO include access token for the compile service
  #qO9fcffqJwbwtRkD $cfg := web→create_json_builder;
  #t25AgIyJYYgkqFy3 $client_config := code→client_config_for_release($rel);
  #csyTdhrBjvyg3oK7 $cfg→set_string("TDC_AUTH_KEY", app→server_setting("TDC_AUTH_KEY", false));
  #xR2w3TbQNugC6PZi $cfg→set_string("TDC_ACCESS_TOKEN", app→server_setting("TDC_ACCESS_TOKEN", false));
  #xAWyMvlmAmRNCnzJ $cfg→set_string("TDC_LITE_STORAGE", data→crash_container→url→replace_regex("/[^/]+$", ""));
  #A1n97wirXzR4r2eq $cfg→set_string("TDC_API_ENDPOINT", $client_config→rootUrl ∥ "/api/");
  #NAGEtl4K7kkQTBkF $cfg→set_string("TD_RELEASE_ID", $rel→releaseid);
  #eNYxH4197ab2Aha5 $cfg→set_string("TD_CLIENT_CONFIG", $client_config→to_json→serialize);
  #ScahBZ4BNxkg8Dgx $js_src := "";
  #NXSe6std4BQ4WH5E foreach k in $cfg→keys
  do {
    #TAFSQARJ2ksElo0u $js_src := $js_src ∥ "process.env." ∥ $k ∥ " = " ∥ $cfg→field($k)→serialize ∥ ";\n";
  }
  #mFuMy3cwKkVcnAOn $js_src := $js_src ∥ "require(\"./noderunner.js\");\n";
  #QsE0r510XtyekYJE $jsb := web→json("{ \"files\": [ {\n  \"path\": \"script/compiled.js\"\n}, {\n  \"path\": \"script/noderunner.js\"\n}] }")→to_json_builder;
  #vyhhZcgXpOS2ke6P $file := web→create_json_builder;
  #fKSnGoS8toMjOFtr $jsb→field("files")→at(0)→set_string("content", $js_src);
  #G0qPcq802si4UZYu $jsb→field("files")→at(1)→set_string("url", data→app_container→url ∥ "/" ∥ $rel→releaseid ∥ "/c/noderunner.js");
  #rN7xGXAAoMZoenVF if false then {
    #iad4krIjA9H2dvjF data→logger→debug("cloud JS: " ∥ $jsb→to_json→format(2));
  }
  #JAJ2heLZyAvNBjij skip;
  #mfy2WAC8v58B1PRa $request := web→create_request(app→server_setting("TDC_ENDPOINT", false) ∥ "deploy");
  #Wu79UcThRYG52WLm $request→set_method("post");
  #mx0phAdBnwEQw3hv $request→set_content_as_json($jsb→to_json);
  #mLGG8z2s7zRiPSs5 $response := $request→send;
  #VmveTZG7R4uQmJUX data→logger→info("cloud deploy: " ∥ $response);
  #HT9crX6wAo887WaH skip;
  #CPKy0vEaLCMPbPCW $requestcfg := web→create_request(app→server_setting("TDC_ENDPOINT", false) ∥ "setconfig");
  #x3KAxN1irb4h0XeO $requestcfg→set_method("post");
  #blPLVvjcYwCaOUCV $requestcfg→set_content_as_json(web→json("{\"AppSettings\":\n  [\n     {\"Name\":\"TD_RESTART_INTERVAL\",\"Value\":\"900\"}\n  ]\n}"));
  #xq59z79uO2dSiERC $response2 := $requestcfg→send;
  #dQs1JueoZDnv2WyN data→logger→info("cloud deploy cfg: " ∥ $response2);
  #ZHP2P10CNy9W9wGR skip;
  #Tbc2jbo024CZ07jB // ### give it time to come up and reindex docs
  #vHsWtrDNGwAM9Jt2 // TODO enable this back
  #x6DVZglchiQo4rAW if false then {
    #uZtaigcRFafwFgfE time→sleep(60);
    #EglpWaEp065tNkGi code→import_doctopics($req);
    #aJ24vmgq8Bi94vnc @\u267b→tdlite_search→index_docs;
    #xkIol40tmwUNtmus data→logger→info("docs reindexed");
  }
  meta private;
}
#GWe6TjmwH1LKlTgz
action forward_to_cloud_compiler(#ffF21FsukVk4p5hM req: * api_request, #xULyfbWb1dCnMKeu api: String) {
  #t4jrXAdgwCYvgJRd $resp := code→query_cloud_compiler($api);
  #NUwEI9cdcy2db7QE if $resp→is_invalid then {
    #s2dwJvzE4wGAyC2c $req→status := @\u267b→restify→http→@400_Bad_Request;
  }
  else {
    #EwRM97c25nsk2Feg $req→response := $resp;
  }
  meta private;
}
#U4UdDNXOd8be2AF4
table pub_channel {
  type = "Object";
  persistent = false;
  fields {
    #u3ZIzZscMnmVPPT3 kind : String
    #Xer4bJ4XGo22tPX8 time : Number
    #J6O5IDcK1slDpKLp id : String
    #xO2HrMIpeJbp7Uy0 name : String
    #jdoGBDPqRmSMoXth pictureid : String
    #xRNINX5qRoy7RChP description : String
    #cWuxP9Y7JMEW2Pw8 userid : String
    #UwVcMsirQfQYsHK2 username : String
    #yFWfbFhCpcEO6YVw userscore : Number
    #xT8acsQB462HjTwD userhaspicture : Boolean
    #QMt0Vaah9SZjfD5S userplatform : Collection[String]
    #LgAeJK6DvjtgJLEE positivereviews : Number
    #xJBvNO8PrKBmFQgt subscribers : Number
    #LOLv1SFZvnEP8Vnl comments : Number
  }
}
#GOV2abFMO9zthOxy
action \_init_channels() {
  #tk29PKO8JLH4qhCx data→channels := @\u267b→indexed_store→create_store(data→pubs_container, "channel");
  #yw5cxovtHdA3Bjzg data→channels→set_resolve($resolution_callback2);
  #a4WrxNQmY6EYG1UZ where by_userid := true;
  #IR2UX7S9tAddbn2Z where anon_search := true;
  #xC7T9M2icIDuG6ED where resolution_callback2(fetch_result: ♻ indexed_store → fetch_result, api_request: * api_request) {
    #lNjTb3KkaLgdO4I3 code→add_username_etc($fetch_result);
    #TZSf1We46X0jxjES $coll := create→Collection_of→\u2339pub_channel;
    #LGGE10kjAZ5i4CLY foreach jsb in $fetch_result→items
    do {
      #xUE4326EWYJR0vAJ $grp := records→pub_channel→create_from_json($jsb→field("pub"));
      #V4GQvbrqVD6qrimj $coll→add($grp);
    }
    #x4XduTVUZwn41G4I $fetch_result→items := $coll→to_json;
  }
  #H1eMp1W6zqyDTEGL code→add_route("POST", "channels", "", $handler);
  #xjmAZqub0YbUXUaJ where handler(req: * api_request) {
    #yNNaYFAVXdZd1v3C code→can_post($req, "channel");
    #xcmY2nPL64PJOKz9 if $req→status = 200 then {
      #l5JewDs6abQpZZxw $body := $req→body;
      #rdf9uaBxZbiCMyYe $lst := records→pub_channel→create;
      #GT7xx3NXqUg1JAsJ $lst→name := code→with_default($body→string("name"), "unnamed");
      #omHi3v2DFE78QN87 code→set_channel_props($lst, $body);
      #x7Azo1ruNNmaAZUP $lst→userid := $req→userid;
      #xU4QoHlgZaGrTOAS $lst→userplatform := code→get_user_platforms($req);
      #tH1N5mY1hQqDB42c $jsb := web→create_json_builder;
      #UAPDDK2jCf2iaPJZ $jsb→set_field("pub", $lst→to_json);
      #B7F60wA440sLp5PT code→generate_id($jsb, 8);
      #v2e2XP5BAvndtHly data→channels→insert($jsb);
      #cikefJ9bMMRZDS4u code→store_notifications($req, $jsb, "");
      #Tt9hyHqD5OXNRrob code→scan_and_search($jsb);
      #xvc76VJfgyrCvkPf data→channels→return_one_pub($jsb→to_json, $req);
    }
  }
  #DFAkq4KSUSBjP0Tm code→add_route("POST", "*channel", "", $handler);
  #DUfp7HyCjA4ySN53 where handler(req: * api_request) {
    #f2IOgZveAa3NdaMP code→check_channel_permission($req, $req→root_pub);
    #FwdE1g6heHjzTXq5 if $req→status = 200 then {
      #Rk8DmTy5pTB2Ig1i data→pubs_container→update_and_upsert($req, $update5);
      #EsPJL4FF5Y6Ecvpt where update5(entry: Json_Builder) {
        #GtzEHNpK8AsDZffB $lst := records→pub_channel→create_from_json($entry→field("pub")→to_json);
        #x1UjkU8teoA8Rs6V code→set_channel_props($lst, $req→body);
        #DjdFaWm14RALEPHZ $entry→set_field("pub", $lst→to_json);
      }
      #xiHpWgJLy2kT4mTR $req→response := web→json("{}");
    }
  }
  #ZDCIJIWByXMQRi02 data→channel_memberships := @\u267b→indexed_store→create_store(data→pubs_container, "channelmembership");
  #vBObkyYG4VHOQUWv data→channel_memberships→set_resolve($resolution_callback2);
  #ZbEdzzVIldZahfGN where resolution_callback2(fetch_result: ♻ indexed_store → fetch_result, api_request: * api_request) {
    #Ia04LtRpmlmjCuZ2 $store := data→scripts;
    #kai2JSy2Moygu21L if $api_request→verb→equals("channels") then {
      #K7fsT6AVfkIoZS7y $store := data→channels;
      #xsDovdk2ds7ICYF6 $fetch_result→items := code→follow_pub_ids($fetch_result→items, "channelid", $store→kind)→to_json;
    }
    else {
      #eIgBkeVUCcJ47gva $pubs := code→follow_ids($fetch_result→items, "updateKey", "updateslot");
      #khzL3osykkLCsHNS $fetch_result→items := code→follow_ids($pubs→to_json, "scriptId", "script")→to_json;
      #x33Z8C1YUaCU2YKu $opts := $api_request→query_options;
      #hIIOTAQjpII7dReW // ?applyupdates=true no longer needed - already applied - perf opt
      #xd84KyQAr4oc4EEm app→javascript("local", "delete opts.value()[\'applyupdates\']");
    }
    #SWy6j7MfpEBiC9Mq records→store_decorator→at($store)→resolve→run($fetch_result, $api_request);
  }
  #NUvGGEALGkSk28sZ data→channel_memberships→create_index("channelid", `fun:entry` $entry→field("pub")→string("channelid"));
  #vEAwXdWxcCQgVeq3 data→channel_memberships→create_index("updatekey", `fun:entry` code→or_empty($entry→string("updateKey")));
  #OUG3etCRsJW3J0ev data→channel_memberships→create_index("channelsof", `fun:entry` code→or_empty($entry→string("channelsof")));
  #jXU9WBWtdUqylJIy code→add_route("GET", "*script", "channels", $handler3);
  #aNqZ4QJoT7EzNXEw where handler3(req: * api_request) {
    #VSLIg2nu4z4sBUUk $key := $req→root_pub→string("updateKey");
    #VmMJs2pp4tz2YFRf if $req→argument→is_empty then {
      #fhF46J7PG9necVr2 data→channel_memberships→any_list($req, "updatekey", $key);
    }
    else {
      #vI4NZJaOn0h44kQs $entry2 := code→get_pub($req→argument, "channel");
      #l5pfpVQm24Akan3Q if $entry2→is_invalid then {
        #YLBQ46Scaty4XDeR $req→status := 404;
      }
      else {
        #ylatVH78l3zmnCiV $s2 := "gm-" ∥ $key ∥ "-" ∥ $entry2→string("id");
        #lJtEFat2WE8493SO $entry3 := code→get_pub($s2, "channelmembership");
        #ootmmUCPd4EmUNqF if $entry3→is_invalid then {
          #KsoLLkwfT9Fn5Cg4 $req→status := 404;
        }
        else {
          #Ixole4BE6d6yGsEc data→channel_memberships→return_one_pub($entry3, $req);
        }
      }
    }
  }
  #TJFInrZeVJDN7d2z code→add_route("GET", "*script", "channelsof", $handler3);
  #Wn61vtWdg9l1nJHw where handler3(req: * api_request) {
    #Am6FGni2rWQKSTEB if $req→argument→equals("me") then {
      #eb3P5Q64fAOElyVW $req→argument := $req→userid;
    }
    #xK71RHgmmyykqgB5 $user_js := code→get_pub($req→argument, "user");
    #SSN0sdiT1St3xweP if $user_js→is_invalid then {
      #fjXAX7J4skgrMvVn $req→status := 404;
    }
    else {
      #iXLYNDgmFjGw0L1A $key := $req→root_pub→string("updateKey");
      #xHvD4CHgeIwJiByg data→channel_memberships→any_list($req, "channelsof", $key ∥ ":" ∥ $user_js→string("id"));
    }
  }
  #Tzem42HP6upCo5Sy code→add_route("POST", "*script", "channels", $handler3);
  #QVStpY1B9FhAC92R where handler3(req: * api_request) {
    #KM5YVpbIGxSCCtZt $memid, $list_js := code→channel_op($req);
    #qxcjPRLh5ihZr0PH if `not` $memid→is_empty then {
      #fQ1URKX4zZpUmwps $mem_json := code→get_pub($memid, "channelmembership");
      #SheBccjG708IgBal if $mem_json→is_invalid then {
        #Dt4hPSdtn6MrdTIA $jsb2 := web→json("{ \"pub\": { } }")→to_json_builder;
        #p7iIAaDAdpCo6YdK $jsb2→set_string("id", $memid);
        #xmrptsrYlHVW3c88 $key := $req→root_pub→string("updateKey");
        #TOg6MaSKKTqhRXJw $jsb2→set_string("updateKey", $key);
        #VKCAjBwwHc4hpSJI $jsb2→set_string("scriptid", $req→root_pub→string("id"));
        #wvLCqxnFysM4hKl0 $jsb2→set_string("channelsof", $key ∥ ":" ∥ $list_js→field("pub")→string("userid"));
        #oPh8H46I3c4zcJov $jsb2→field("pub")→set_string("channelid", $list_js→string("id"));
        #ttm8hSxl6Eun328E data→channel_memberships→insert($jsb2);
      }
      #UanZWljPo7x8BsZ1 $req→response := web→json("{}");
    }
  }
  #xK5oubuqOGHpTS6Y code→add_route("DELETE", "*script", "channels", $handler3);
  #PAN6BcqW1GOj8Rpr where handler3(req: * api_request) {
    #xHPVvqPLmFM9mCtx $memid, $list_js := code→channel_op($req);
    #xCoAvRhZDvku3E5U if `not` $memid→is_empty then {
      #xhTyzA4Rj4Q8tOct $mem_json := code→get_pub($memid, "channelmembership");
      #x6C3hVpI7258UlUH if $mem_json→is_invalid then {
        #C1IgbdMskKfVCs0m $req→status := 404;
      }
      else {
        #GjEAMCdTsntbU9lH $delok := code→delete($mem_json);
        #xf1SEkUM8nl4csfx $req→response := web→json("{}");
      }
    }
  }
  #OyrAS7h8WKMSvFq5 code→add_route("GET", "*channel", "scripts", $handler3);
  #uOO4dt57zSbxwpZ2 where handler3(req: * api_request) {
    #IqoL42OAAfcEryA4 data→channel_memberships→any_list($req, "channelid", $req→root_id);
  }
  meta private;
}
#zglWAA5DN5Nh2rS4
var channels : ♻ indexed_store → store {
  transient = true;
}
#cf92fEBhjKGgiZxn
action set_channel_props(#t624A8oKptK7iPqE lst: * pub_channel, #TawzfWsQYmahYUb7 body: Json_Object) {
  #xdwQGbnF0iTWVShZ $bld := $lst→to_json→to_json_builder;
  #ou2Mmk8uREGIMwSR code→set_fields($bld, $body, "description\npictureid");
  #BmXJSP8NVnZVCvSl $lst→from_json($bld→to_json);
  meta private;
  meta sync;
}
#hHaWS01A5aNuXsaw
action check_channel_permission(#lR5Koz188UI7UWtq req: * api_request, #nDMePwua2T9556yH list_js: Json_Object) {
  #U2oXeyh3jH2RqlKX if $req→userid→equals($list_js→field("pub")→string("userid")) then {
    #okB9qpURXZpYTKTa skip;
  }
  else {
    #N2exzELRGLscbUwv code→check_permission($req, "pub-mgmt");
  }
  meta private;
  meta sync;
}
#pj9K5986o6QDyQJg
var channel_memberships : ♻ indexed_store → store {
  transient = true;
}
#xLUHDJkB8LoFwTxx
action follow_ids(#TtxV7HhnAzx6n6Fy fetch_result: Json_Object, #TCp5p8ak7VUzlk4h field: String, #H46PmXlz1vF1325r kind: String) returns(#k6ABXoVGYXOADA4Z pubs: Collection[Json_Object]) {
  #ZyLLitBCJA4MAM1d $ids := create→Collection_of→String;
  #TZyH79Gx24GGLWbZ foreach js in $fetch_result
  do {
    #SLFAgWuHG3Sj4Qit $s := $js→string($field);
    #w6r9xmz3ADtSesZu $ids→add($s);
  }
  #jLbN4WL2B2t0z6d1 $pubs := data→pubs_container→get_many($ids)→@where( `fun:elt` code→is_good_pub($elt, $kind));
  meta private;
}
#M5vyN58ozuUJaSRF
action channel_op(#nuquyUzUWHZusjcc req: * api_request) returns(#xCaCFRJDLzuviZWN memid: String, #x20mkQ2oK25VtgUW list_js: Json_Object) {
  #l8Vi79wCQRyTdrDs $memid := "";
  #gz04YWLiagYicsJy $list_js := code→get_pub($req→argument, "channel");
  #vOQYYdXi1lmS5YbH if $list_js→is_invalid then {
    #lKd4mqnNTXZMOZ3g $req→status := 404;
  }
  else {
    #kGG62o14Vs2eGle0 code→check_channel_permission($req, $list_js);
    #xXvGoxTYwYAK239K if $req→status = 200 then {
      #xAifUxZv0RSmsT5C $key := $req→root_pub→string("updateKey");
      #taukhr3Z15WaBkOT $memid := "gm-" ∥ $key ∥ "-" ∥ $list_js→string("id");
    }
  }
  meta private;
}
#szVeYIYLnejeqBxw meta import librato_node {
  guid "696c22cb-34a3-4c77-cf67-e9d2fcc2ca8b"
  usage {
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

    action `async` init(options\u003f: ♻ librato_node → Options)
  }
}
#xzvMRTQJxzLkGixC
table rec_import_response {
  type = "Object";
  persistent = false;
  fields {
    #xypZ5IIw1nDaKM7c problems : Number
    #rlZL2Ym0ftZg1aIo imported : Number
    #xr23WFpgA24H7WJv present : Number
    #Lboi3KEK2LGXZgo1 attempts : Number
    #SCkztOqDRRYjo1TN ids : Json_Builder
    #xmoHSswE1odEVurC force : Boolean
    #N7LAqkYuQw9uWxeg fulluser : Boolean
  }
}
#RABMUfbRmZUX42XK
action import_rec(#hUaV8iq56jake6dH resp: * rec_import_response, #A2d6Wq4eWR52fTkO id: String) {
  #xq44XNi9ZYwQZQR1 $resp→attempts→\u25c8add(1);
  #nn4HqUKIPb7g2UHW $full := $resp→fulluser;
  #WPnnsM3aUA4Gtrj6 $resp→fulluser := false;
  #JhxlmHukEPxu79Sg skip;
  #g2FDEd9xPK5SjbfZ if code→or_empty($id)→is_empty `or` $resp→ids→contains_key($id) then {
    #fbM2gzJV6rb7hSD1 skip;
  }
  else {
    #xZA5jCTzbSmKTLJD $resp→ids→set_number($id, 0);
    #JXwak0wMxCKoJlr7 $is_there := code→is_good_entry(data→pubs_container→get($id));
    #nZdzmQnbuvPvwmlb if $is_there `and` `not` $resp→force `and` `not` $full then {
      #e2SkYZwb2GHD3ujP $resp→ids→set_number($id, 409);
      #ET4k7Dg6Zn24KchY $resp→present→\u25c8add(1);
    }
    else {
      #xoA0xv8IOjGIxkTx $tdapi := "https://www.touchdevelop.com/api/";
      #vlZOcFR0p4my1D67 $js := web→download_json($tdapi ∥ $id);
      #p7ML5zDxF9FpeO7V if $js→is_invalid then {
        #U97dxkA5so9pHcD2 $resp→problems→\u25c8add(1);
      }
      else {
        #XUQtAmO5r5jjy8W7 $coll := create→Collection_of→Task_of→Nothing;
        #iN24YjEGVAl3LJoC $coll→add( `async` code→import_rec($resp, $js→string("userid")));
        #XzmW2apIeqnDxivz $kind := $js→string("kind");
        #x901AbKKwxbU749n if $kind→equals("script") then {
          #F3MsEH25yqzteZb2 $jsb := $js→to_json_builder;
          #HzkpIdpWcl1QGmbL if `not` $js→string("rootid")→equals($js→string("id")) then {
            #xUo9jNGUIgQ6axW9 $js2 := web→download_json($tdapi ∥ $id ∥ "/base");
            #ffpcfgGyByj8XX8z if `not` $js2→is_invalid then {
              #Gf4uubdS2UkYgdyw $jsb→set_string("baseid", $js2→string("id"));
            }
          }
          #RzZrNnMs3E9WL15d code→import_rec($resp, $jsb→string("baseid"));
          #z2Z4O7x6fw22wEt2 $s := web→download($tdapi ∥ $id ∥ "/text?original=true&ids=true");
          #koCYVJMQREMQHdp5 $jsb→set_string("text", code→with_default($s, "no text"));
          #EnpryEH25nfkeZd8 $js := $jsb→to_json;
        }
        #ShEkiXdi2jex7plo skip;
        #wcEmLRNUBTuJhVBR if `not` $is_there then {
          #x5AYRc4kd45tZsWK $api_request := code→import_one_anything($js);
          #xndgSzAELQNxUluV if $api_request→status = 200 then {
            #xuq1waOEkfBZQukQ $resp→imported→\u25c8add(1);
          }
          else {
            #ApXlGw7TFn4b0A7n $resp→problems→\u25c8add(1);
          }
        }
        #mM5tvT1MuoAWyyNS skip;
        #G2rB27pVItfrY664 if $kind→equals("script") then {
          #XQtsxeY0RCogq1Sv foreach js3 in $js→field("librarydependencyids")
          do {
            #PZEV8lkWUF439ED9 $coll→add( `async` code→import_rec($resp, $js3→to_string));
          }
          #xYnyoDxcuyd6tqQn foreach js3 in $js→field("mergeids")
          do {
            #vMxWrCjgbloNn2hZ $coll→add( `async` code→import_rec($resp, $js3→to_string));
          }
        }
        #k4j4rbvDuMmVPmUy skip;
        #xRaTmLvQzyViPczi $coll→add( `async` code→import_deps($resp, $js, $tdapi, $id, "art"));
        #KLeLXRwgRGCi8XQZ $coll→add( `async` code→import_deps($resp, $js, $tdapi, $id, "comments"));
        #cV4OyhzIzRiM88Ar foreach task in $coll
        do {
          #J0Xk8SxLBpsMYr3e $task→await;
        }
        #RNGX22vE0ULueiw7 $resp→ids→set_number($id, 200);
        #d4qWjSv0G2aI6trE if $full `and` $kind→equals("user") then {
          #AJkTnK2MNAKCL1ZY `async` code→import_user_scripts($resp, $tdapi, $id);
        }
      }
    }
  }
  meta private;
}
#nwypPQdy2ZJOkJ9w
action import_deps(#hW43z2biCGZTAiqa resp: * rec_import_response, #e15mLO4jO4SyYP9Z js: Json_Object, #iM6WVkzCZ4mSrAlW tdapi: String, #xT3ektqG2FCDWyEJ id: String, #AseJJYbGpuq66eLL kind: String) {
  #dFZLjqO2zyLVD54V if code→or_zero($js→number($kind)) > 0 then {
    #wTYzaxIrvJAXArOw $js4 := web→download_json($tdapi ∥ $id ∥ "/" ∥ $kind ∥ "?count=1000");
    #TokHu8j9DEqdP7K4 @\u267b→parallel→for_json($js4→field("items"), $@action);
    #rl434l7MWZYVY0ew where @action(json: Json_Object) {
      #C2bN5froL1k9KvIO code→import_rec($resp, $json→string("id"));
    }
  }
  meta private;
}
#SkqBk4Uhg1r2xFB2
action import_user_scripts(#NiF5zfBrpylAPL5M resp: * rec_import_response, #xMg3KV3R3iAwKs35 tdapi: String, #xra7vVia2GwB4m2G id: String) {
  #hgQhS0pHIFrwCCIu $keep_going := true;
  #Eh7TXnT7u2Q2xjgh $cont := "";
  #YL0OX94BxVQqO2gc while $keep_going do {
    #iYxyPFTJMOs3UhzT $js4 := web→download_json($tdapi ∥ $id ∥ "/scripts?applyupdates=true&count=50" ∥ $cont);
    #xDIL42rjC7pQZkk5 @\u267b→parallel→for_json($js4→field("items"), $@action);
    #bhJNtDit24W0nrdc where @action(json: Json_Object) {
      #q6pQc1CPY8cchFNL code→import_rec($resp, $json→string("id"));
    }
    #BR4IBXo8Fomuqhc1 $r := code→or_empty($js4→string("continuation"));
    #DPBsHmzcHkgH0Lmj data→logger→info("import batch for " ∥ $id ∥ " cont= " ∥ $r);
    #xQlBv87R7f5ycsjd if `not` $r→is_empty then {
      #I93Tt354Ngj4utR1 $cont := "&continuation=" ∥ $r;
    }
    else {
      #pUBpCoh4Dl3pYOa2 $keep_going := false;
    }
  }
  meta private;
}
#XDIDml7fsHiaYsdp meta import tdlite_search {
  guid "6e73be78-b4c0-4573-77cd-7a739a2396b2"
  usage {
    #BVGhpbmca
    table Art_Entry {
      type = "Object";
      exported = true;
      persistent = false;
      fields {
        #mwPrcMh6gq12Lxsl id : String
        #CDTXL42iVW1gxd2e name : String
        #LACRnHHsLIEv4UfJ description : String
        #O63LP0lKxLcZFllF type : String
        #CdRg5v1eI56BDLrR userid : String
        #A2O3AEmTQEBdH24t username : String
        #DOZ9iVmMCsmEe8EF time : Number
        #O8bEv8MQCVmQAEN7 sprite : Boolean
        #C4WCmXAFtRMQXz6J tags : String
        #LZdRwQyQt5Acct26 score : Number
      }
    }
    #xkdODOIH4JYOTJDX
    table Pub_Entry {
      type = "Object";
      exported = true;
      persistent = false;
      fields {
        #eDSRvAaD7SJoP8Fr id : String
        #xjqjHLKGwpT2t0Y5 kind : String
        #SUU4oT6HPH8492c7 score : Number
        #nXPPjxV422XiNE6g name : String
        #xGf8ehxa4TMf7CWb description : String
        #m316Mf2wZuTMLy6z userid : String
        #FBwBqsTOd2dZVuwT username : String
        #fMoxhur5ShZCJOs2 body : String
        #y9InZW15ZqfMVrw7 hashes : Collection[String]
        #ohnNK096BJe2WqUU features : Collection[String]
        #wNP0HRWfW98cYOhS time : Number
        #xpFunK2q64NOusp2 editor : String
        #eYqERQiWRKuTehlj artkind : String
        #xqcZULae5yslHWSs arttype : String
      }
    }
    #okmK1o1TN1pVIb9E
    table Pub_Query {
      type = "Object";
      exported = true;
      persistent = false;
      fields {
        #emJSMcaTofyJHJwY kind : String
        #fF5lzej7mwF4AIRL body : String
        #WgToeJQsW2PQDWKE users : String_Map
        #KyEeogLb7ayksMGW features : String_Map
        #e8af25iXkHWAeW45 hashes : String_Map
        #xW6T8Rm2pOj8Kgk8 index : String
        #RTdGlpMD1oHGnOEg orderby : String
        #xdP52UAQ2nX5bEy0 select : String
        #Lwtpm8wAZLS88tET scoring_profile : String
        #BbMjaW4Gs6ygkwrR @skip : Number
        #T4DzylgAuNJuvEP3 @top : Number
      }
    }

    action `async` init()
    action `sync` create_art_update() returns(batch: ♻ azure_search → Batch_Update)
    action `sync` create_art_entry(id: String, options\u003f: ♻ tdlite_search → Art_Entry) returns(entry: ♻ tdlite_search → Art_Entry)
    action `async` index_docs()
    action `sync` upsert_art(@this: ♻ tdlite_search → Art_Entry, batch: ♻ azure_search → Batch_Update)
    action `sync` create_pub_entry(id: String, options\u003f: ♻ tdlite_search → Pub_Entry) returns(entry: ♻ tdlite_search → Pub_Entry)
    action `sync` upsert_pub(@this: ♻ tdlite_search → Pub_Entry, batch: ♻ azure_search → Batch_Update)
    action `sync` create_pubs_update() returns(batch: ♻ azure_search → Batch_Update)
    action `async` statistics() returns(res: Json_Object)
    action `sync` to_pub_entry(pub: Json_Object, body: String, features: Collection[String], score: Number) returns(r: ♻ tdlite_search → Pub_Entry)
    action `sync` to_pub_query(index: String, kind: String, text: String) returns(query: ♻ tdlite_search → Pub_Query)
    action `sync` to_search(@this: ♻ tdlite_search → Pub_Query) returns(search: String)
    action `sync` to_filter(@this: ♻ tdlite_search → Pub_Query) returns(filter: String)
    action `sync` to_url(@this: ♻ tdlite_search → Pub_Query) returns(url: String)
    action `sync` is_empty(@this: ♻ tdlite_search → Pub_Query) returns(empty: Boolean)
  }
  #xL425yv7wLzTP1cb resolve azure_search = ♻ azure_search with {
  }
  #JIWJBIG9wKK2ozEW resolve parallel = ♻ parallel with {
  }
  #ZR9YSP9txFF46bsw resolve touchdevelop_cloud = ♻ touchdevelop_cloud with {
  }
}
#xBixa2RQuRVlDYnd meta import azure_search {
  pub "ilcvc"
  usage {
    #BVGhpbmca
    table Options {
      type = "Object";
      exported = true;
      persistent = false;
      fields {
        #WbpPTavV3XYENAQf service_name : String
        #xQdHjpoFK4iKIgyz api_key : String
        #J4Vffn1xdLaOmNsv version : String
        #tuW0Q69Dxu4z3w8n allow_409 : Boolean
      }
    }
    type Index_Definition
    type Index
    type Batch_Update
    type Field_Definition
    type Scoring_Profile

    action `async` create_or_update(schema: ♻ azure_search → Index_Definition) returns(index: ♻ azure_search → Index)
    action `sync` create_batch_update(index: ♻ azure_search → Index) returns(update: ♻ azure_search → Batch_Update)
    action `sync` upload(update: ♻ azure_search → Batch_Update, key: String) returns(doc: Json_Builder)
    action `sync` merge(update: ♻ azure_search → Batch_Update, key: String) returns(doc: Json_Builder)
    action `sync` delete(update: ♻ azure_search → Batch_Update, key: String)
    action `async` send(update: ♻ azure_search → Batch_Update) returns(status_code: Number)
    action `sync` init(options\u003f: ♻ azure_search → Options)
    action `async` delete_index(index: ♻ azure_search → Index) returns(deleted: Boolean)
    action `sync` create_request(path: String) returns(request: Web_Request)
    action `async` statistics(index: ♻ azure_search → Index) returns(document_count: Number, storage_size: Number)
    action `sync` action_count(update: ♻ azure_search → Batch_Update) returns(count: Number)
    action `sync` create_index_definition(index_name: String, key_name: String) returns(schema: ♻ azure_search → Index_Definition)
    action `sync` add_field(schema: ♻ azure_search → Index_Definition, name: String, type: String) returns(field: ♻ azure_search → Field_Definition)
    action `sync` set_searchable(field: ♻ azure_search → Field_Definition, value: Boolean)
    action `sync` set_filterable(field: ♻ azure_search → Field_Definition, value: Boolean)
    action `sync` set_sortable(field: ♻ azure_search → Field_Definition, value: Boolean)
    action `sync` set_facetable(field: ♻ azure_search → Field_Definition, value: Boolean)
    action `sync` set_suggestions(field: ♻ azure_search → Field_Definition, value: Boolean)
    action `sync` set_retrievable(field: ♻ azure_search → Field_Definition, value: Boolean)
    action `sync` index_builder(schema: ♻ azure_search → Index_Definition) returns(jsb: Json_Builder)
    action `sync` add_CORS_origin(schema: ♻ azure_search → Index_Definition, origin: String)
    action `sync` update_builder(update: ♻ azure_search → Batch_Update) returns(jsb: Json_Builder)
    action `async` index_definition(index_name: String) returns(schema: Json_Object)
    action `async` indexe_definitions() returns(schema: Json_Object)
    action `sync` add_scoring_profile(index: ♻ azure_search → Index_Definition, name: String) returns(profile: ♻ azure_search → Scoring_Profile)
    action `sync` set_weight(profile: ♻ azure_search → Scoring_Profile, field: ♻ azure_search → Field_Definition, weight: Number)
    action `sync` add_magnitude(profile: ♻ azure_search → Scoring_Profile, field: ♻ azure_search → Field_Definition, boost: Number, interpolation: String, boosting_range_start: Number, boosting_range_end: Number, constant_boost_beyond_range: Boolean)
    action `sync` set_function_aggregation(profile: ♻ azure_search → Scoring_Profile, type: String)
    action `sync` key_field(schema: ♻ azure_search → Index_Definition) returns(key: ♻ azure_search → Field_Definition)
    action `sync` reset(update: ♻ azure_search → Batch_Update)
    action `sync` get(schema: ♻ azure_search → Index_Definition) returns(index: ♻ azure_search → Index)
    action `sync` index_name(@this: ♻ azure_search → Index) returns(name: String)
    action `sync` key_name(@this: ♻ azure_search → Index) returns(name: String)
  }
}
#cJioj69JoQlHxyts meta import touchdevelop_cloud {
  guid "2962bb8e-5324-4fdd-446c-956698cf688f"
  usage {
    #BVGhpbmca
    table Batch_Request {
      type = "Object";
      exported = true;
      persistent = false;
      fields {
        #wigqF3FHB48iuL8t relative\_url : String
        #FteyT8BwWSvhjIs1 If\u002dNone\u002dMatch : String
      }
    }
    #MsIvI1F2qeLRyARp
    table Batch_Response {
      type = "Object";
      exported = true;
      persistent = false;
      fields {
        #XWl9goo96uNBNqkq code : Number
        #DK8M4h12OyzVV2bW body : Json_Object
        #pOVn80bSeXkKqNaJ ETag : String
      }
    }
    #xdR83jQW4knY4URp
    table Api_Options {
      type = "Object";
      exported = true;
      persistent = false;
      fields {
        #xucoSMWOCXnVGBWi access_token : String
        #xIQuuEq2xLTR1bqA count : Number
        #UqCAIEbUSAZr4WPV apply_updates : Boolean
        #xd9nDlwlfGFaDZIr continuation : String
      }
    }
    #fjq2VHqB63BToqH5
    table Item_List {
      type = "Object";
      exported = true;
      persistent = false;
      fields {
        #Fa3FOfqAO6DxIHEK path : String
        #y12564JoMZvAmeTX options : ♻ touchdevelop_cloud → Api_Options
        #eUVTBb2ApHWyRj0h current : Web_Response
        #E4pHfgariDwCGPHt ids : String_Map
        #axOslE3aUs4Ii12m items : Json_Object
      }
    }
    #z2OoPRk1tTeHAhMa
    table Options {
      type = "Object";
      exported = true;
      persistent = false;
      fields {
        // Specific service url
        #Zu4ZXv5BaY72usb2 service_root : String
        #EJwXX2VS90FUBbyX access_token : String
      }
    }
    type Batch

    action `async` get(path: String, options\u003f: ♻ touchdevelop_cloud → Api_Options) returns(res: Web_Response)
    action `async` post(path: String, body: Json_Object, options\u003f: ♻ touchdevelop_cloud → Api_Options) returns(res: Web_Response)
    action `sync` create_batch(options\u003f: ♻ touchdevelop_cloud → Api_Options) returns(batch: ♻ touchdevelop_cloud → Batch)
    action `sync` add_request(batch: ♻ touchdevelop_cloud → Batch, path: String, etag: String, options\u003f: ♻ touchdevelop_cloud → Api_Options)
    action `sync` create_url(path: String, options: ♻ touchdevelop_cloud → Api_Options) returns(url: String)
    action `async` test()
    action `sync` create_path(path: String, options: ♻ touchdevelop_cloud → Api_Options) returns(url: String)
    action `async` send(batch: ♻ touchdevelop_cloud → Batch) returns(responses: Collection[ ♻ touchdevelop_cloud → Batch_Response])
    action `sync` list(path: String, options\u003f: ♻ touchdevelop_cloud → Api_Options) returns(list: ♻ touchdevelop_cloud → Item_List)
    action `async` next(list: ♻ touchdevelop_cloud → Item_List) returns(items: Json_Object)
    action `async` all(list: ♻ touchdevelop_cloud → Item_List) returns(items: Json_Object)
    action `sync` set_options(options\u003f: ♻ touchdevelop_cloud → Options)
    action `async` get_json(path: String, options\u003f: ♻ touchdevelop_cloud → Api_Options) returns(res: Json_Object)
  }
}
#spRAAgNSIkD32HsQ
action search_index_art(#DO3UScJ4G8fCzhwB pub: * pub_art) returns(#xiqdj4eOu8aorXg1 entry: ♻ tdlite_search → Art_Entry) {
  #DyENaock6ne3J2eU $tp := "picture";
  #GHT1Rl9AnotUJ7Uz if code→or_empty($pub→pictureurl)→is_empty then {
    #KU4AM4i5cqBOG9Yi $tp := "sound";
  }
  #Tq5KSnheESs6ffLZ $spr := false;
  #be8Dp2BS2xfqSch4 if `not` $pub→flags→is_invalid then {
    #PtGUHiguuUBSAH58 $spr := $pub→flags→contains("transparent");
  }
  #xIZ9SNlqoXkOcyhl $entry := @\u267b→tdlite_search→create_art_entry($pub→id);
  #k1mUW8S3blJHY20N where name := $pub→name;
  #UgYMHTLpz8A3lUzn where description := $pub→description;
  #toGCO3sUEyIoBYx9 where type := $tp;
  #r9NS0VZIgVIEUy0R where userid := $pub→userid;
  #tn0xIj8HxiUzLFZB where username := $pub→username;
  #aIIkltzpQmF6X3Ly where sprite := $spr;
  meta private;
  meta sync;
}
#Xcs4ADMWDbrifLBw
action add_username_etc_core(#jqw2BCrdxO2cNkKn entities: Json_Object) returns(#Epo9V1CNQO2C4rbT coll2: Collection[Json_Builder]) {
  #NyfAFO2cWcAve4i2 $users := code→follow_pub_ids($entities, "userid", "");
  #Rb9OWXHZwlGMx4LY $coll2 := create→Collection_of→Json_Builder;
  #FmzTYzN7dWfR83oy for 0 ≤ i < $entities→count do {
    #YbAhl7ceawOtAZKX $user_js := $users→at($i);
    #ANt9viTCiwK5pJwl $user := records→pub_user→create;
    #yp8EmSfvViyFf8rm $root := $entities→at($i)→to_json_builder;
    #RovJI1mLXZ3Ri2kl $coll2→add($root);
    #hk4PCAFBNDb16Fyc if `not` $user_js→is_invalid then {
      #nVZqkR7FjHvygQmx $user→from_json($user_js→field("pub"));
      #z8a7NTv3frp3s8rU $root→set_field("*userid", $user_js);
    }
    #OuD3k354XlmA3Jsu $pub := $root→field("pub");
    #Q7ESA2eyc6XQ5BHg $pub→set_string("id", $root→string("id"));
    #zJS2u1wDmy1bsqkz $pub→set_string("kind", $root→string("kind"));
    #JyHQ2kptlIli6lb5 $pub→set_boolean("userhaspicture", $user→haspicture);
    #eQ39mU9kDn9seyYC $pub→set_string("username", $user→name);
    #Mgw6d5X91eO8D4p9 $pub→set_number("userscore", $user→score);
    #xbklZn5jYmEm1jFM if `not` data→full_TD then {
      #gaHva4zyzroblOVP $pub→set_field("userplatform", web→json("[]"));
    }
  }
  meta private;
}
#Sa3TbGm3cFq0c4s2
action upsert_art(#o0A0d9b4tp12KovN obj: Json_Builder) {
  #xsv2KxV2YxqVaOoI if data→disable_search then {
    #dWQBNBAhewSS9Jkj `return` ;
  }
  #enUZSjAFRU4PcdvB $batch := @\u267b→tdlite_search→create_art_update;
  #ieb5LOK1piKkZCAp $coll2 := code→add_username_etc_core(data→arts→single_fetch_result($obj→to_json)→items);
  #pUmalHoF8q6qjG2M $pub := records→pub_art→create_from_json($coll2→at(0)→field("pub")→to_json);
  #mre5zES5kJmvN24d code→search_index_art($pub)→upsert_art($batch);
  #p7v21r34pD6RYBcX `async` $batch→send;
  #kvTTgRufmHMeNAEB skip;
  #YnbsDlw5VSJ8J7pn code→scan_and_search($obj);
  #W6oW2RyA9wWDmnJR where skip_scan := true;
  meta private;
}
#oQeXxo9E8c3nZJjJ
action import_doctopics(#Yst4FtWSNHbryz2b req: * api_request) {
  #vQ2E7IIbGT2xcO2U code→cache_cloud_compiler_data(code→get_cloud_relid(true));
  #D4MEoSiZ2WIpCK7k $ids := data→doctopics→to_collection→map_to→String( `fun:elt` code→or_empty($elt→string("scriptId")))→@where( `fun:elt` `not` $elt→is_empty);
  #T3uKYqrZE7E242Po $fetch_result := data→scripts→fetch_from_id_list($ids, invalid→json_object);
  #n1t4IIckqS8GCfYC $jsb := web→create_json_builder;
  #LodKvVrI762IRH3A foreach s in $ids
  do {
    #xwIdhfWWXpRrttgn $jsb→set_boolean($s, true);
  }
  #BvQBUCHEjo5OEcKh foreach js in $fetch_result→items
  do {
    #xlo5GmwqHLKUbWhi $jsb→remove_field($js→string("id"));
  }
  #Aof9aMZKlmwbt0di skip;
  #xviONLrGt2Kjp2DK $resp := records→rec_import_response→create;
  #O80SlATOhhkr1LWN $resp→ids := web→create_json_builder;
  #vedHoC8AIZ8diQb7 $ids := $jsb→keys;
  #NLM870BXkd27Nd5u @\u267b→parallel→@for($ids→count, $@action);
  #gRMXWrU3kisnaniV where @action(x: Number) {
    #GSd4d4hgjk2ip63s code→import_rec($resp, $ids→at($x));
  }
  #zu8clGZ4GO2cWNey $req→response := $resp→to_json;
  meta private;
}
#mHcsue2tj4eYOpdp
action \_init_search() {
  #xf5BXBF3eX44O3R8 code→add_route("GET", "search", "", $handler3);
  #MqHGyuYnSG40oYDd where handler3(req: * api_request) {
    #x8H5pMRXVHp6plDf // this may be a bit too much to ask
    #n421BKBh3OvJrwT7 code→check_permission($req, "global-list");
    #xHgRsi8iI8cLpdO4 if $req→status = 200 then {
      #bhH85jAkR6dDYBu9 code→execute_search("", code→or_empty($req→query_options→string("q")), $req);
    }
  }
  #ab2cAwECG4949rdw code→add_route("POST", "search", "reindexdocs", $handler3);
  #I56RxPU92jjpA2W3 where handler3(req: * api_request) {
    #xjUWCMIMChU6eZLl code→check_permission($req, "operator");
    #xwkDlTke3XUehvJF if $req→status = 200 then {
      #ljvismXtUUjG5sdm `async` @\u267b→tdlite_search→index_docs;
      #AL5gy2ZF9HupbWpK $req→response := web→json("{}");
    }
  }
  #FMbpQPRrRfjfacPz code→add_route("POST", "art", "reindex", $handler);
  #b4Mrw0nuxkmyn05Q where handler(req: * api_request) {
    #SyJXlUycMqgw41F7 code→check_permission($req, "operator");
    #szzuyyJrqv4DnSIe if $req→status = 200 then {
      #es9bOKongQgWXewf `async` data→arts→get_index("all")→for_all_batched("all", 100, $process);
      #dL2l7f2XrrxpL44J where process(json: Json_Object) {
        #GVD2J2uPaBNchykm $batch := @\u267b→tdlite_search→create_art_update;
        #tog7pyFI5uHBVlTc foreach js in code→add_username_etc_core($json)
        do {
          #zC3wkAFywWFKo8Tz $pub := records→pub_art→create_from_json($js→field("pub")→to_json);
          #FVjkBPTPYp4QKIoP code→search_index_art($pub)→upsert_art($batch);
        }
        #xjhyepy4B4qFkjeX $status_code := $batch→send;
        #vvNad8rGj1QTkM38 data→logger→debug("reindex art, status: " ∥ $status_code);
      }
      #x9QpWIlkM1KYWx2j $req→status := @\u267b→restify→http→@201_Created;
    }
  }
  #ofU0NoPvSTEzExRO code→add_route("POST", "pubs", "reindex", $handler);
  #LCFGGmi6eagI5w8V where handler(req: * api_request) {
    #QXG2UeD2qkPB2aYz code→check_permission($req, "operator");
    #KIaRAQCJr362k4RT if $req→status = 200 then {
      #pDmqM2LjUQV0suWh `async` code→reindex_store(data→arts, $req);
      #C5AsbfdilBqM8djF `async` code→reindex_store(data→comments, $req);
      #Zbuj49jEoh5ne8yD `async` code→reindex_store(data→scripts, $req);
      #rvKFKwSjIfeifD79 `async` code→reindex_store(data→users, $req);
      #M2xEEV6vRcWN2BPJ `async` code→reindex_store(data→channels, $req);
      #LT4NiyYQj1nbmOiL `async` code→reindex_store(data→groups, $req);
      #AID35EcJEDrzLvqk `async` code→reindex_store(data→pointers, $req);
      #xWwB9xzlfS2Ae6aj $req→status := @\u267b→restify→http→@201_Created;
    }
  }
  meta private;
  meta sync;
}
#LiLEErFM0nfOhqcF
action reindex_store(#iOeAJ90eIH5oRkcq store: ♻ indexed_store → store, #x5nIc7oA48VqgHyt req: * api_request) {
  #UwnDNRbf2n9DcF9Y $store→get_index("all")→for_all_batched("all", 100, $process);
  #nHF95f1wMTKP92Af where process(json: Json_Object) {
    #VvwAFE2hUfVaGjan $batch := @\u267b→tdlite_search→create_pubs_update;
    #eXwgBwYKhd8Me4hi $fetch_result := $store→single_fetch_result($json);
    #xr8JjMVHHdp2b04X $fetch_result→items := $json;
    #kh2qXBomeTWbcCZI records→store_decorator→at($store)→resolve→run($fetch_result, data→admin_request);
    #t8hVZJ2apJmH09uQ $fieldname := "id";
    #tCa7YJFA4mFy7GsA $is_ptr := $store→kind→equals("pointer");
    #x3CO1k12hyVfGyNz if $is_ptr then {
      #xdSaVhqGbQza9Pyj $fieldname := "scriptid";
    }
    #JaCYOmEQyssGxKN6 if $store→kind→equals("script") `or` $is_ptr then {
      #N9yYLCZKBwutwgG2 $coll := $json→to_collection→map_to→String( `fun:elt` code→or_empty($elt→field("pub")→string($fieldname)))→@where( `fun:elt` `not` $elt→is_empty);
      #FBOJpVMGyGBxPFGy $bodies := web→create_json_builder;
      #ksmvVLxknVs2v1ZH $entries := data→script_text→get_many($coll);
      #l0rKctxjayzhhb9J foreach js2 in $entries
      do {
        #JIILt64YTf3coHnQ if $js2→contains_key("id") then {
          #vRwtbXNvT2J8H4IM $bodies→set_string($js2→string("id"), $js2→string("text"));
        }
      }
      #xecls2zesk1HEqAQ foreach pub in $fetch_result→items
      do {
        #xvA2j6v5jb4Ix0vd if `not` $pub→boolean("ishidden") then {
          #guGTahxBQgIpYrki $body := code→or_empty($bodies→string(code→or_empty($pub→string($fieldname))));
          #iaG6nZSzR4H2uE6Y $entry := @\u267b→tdlite_search→to_pub_entry($pub, $body, code→pub_features($pub), 0);
          #rS4u4xhxEfkiFc7f $entry→upsert_pub($batch);
        }
      }
    }
    else {
      #JIgs7Pah5f8Q2qlu foreach pub in $fetch_result→items
      do {
        #IEW727K8nZvdwnOA $entry2 := @\u267b→tdlite_search→to_pub_entry($pub, code→with_default($pub→string("text"), ""), code→pub_features($pub), 0);
        #SE7UYlWLduW2S0qF $entry2→upsert_pub($batch);
      }
    }
    #aeHj232zYp55qKol $status_code := $batch→send;
    #wEFkg67xq4WC4oPZ data→logger→debug("reindex pubs, status: " ∥ $status_code);
  }
  meta private;
}
#eiaymE0w5Yz4s6nh
action update_and_upsert(#x0ivHyxdhyTtznz2 container: ♻ cached_store → container, #xM2QQuxCQxz7eBOo req: * api_request, #xLCU4bHOp8hvwqtl update: Action1[Json_Builder]) returns(#teDerrwxWiVxiyhr bld: Json_Builder) {
  #Y4n0ia9pwFbQOkAD // {action:ignoreReturn}
  #s1E3hbbmuTtYNTHA $last := create→Ref_of→Json_Builder;
  #jL40tNT46tp24KX7 $container→update($req→root_id, $update2);
  #xvUdLQeF2IPa4KKd where update2(entry: Json_Builder) {
    #iqSsYQdtOnJf5Zwc $update→run($entry);
    #S7QGIzWvrw9INXsz $last→\u25c8set($entry);
  }
  #eGAx7R5156QweVgt code→scan_and_search($last→\u25c8get);
  #BkhRHT8CcWHh7p2p $bld := $last→\u25c8get;
  meta private;
}
#xraGeCcNbPkn7n99
table client_config {
  type = "Object";
  persistent = false;
  fields {
    #lFbkkHPlVBLgjnIr workspaceUrl : String
    #MwtZlCqYPaEKkfDK searchUrl : String
    #VjjUk5jzt4sQQoWS searchApiKey : String
    #IVrxORlsfvmiabUA apiUrl : String
    #X17NqHgrtUxJTCpz rootUrl : String
    #O2hT4vAEESpuao64 liteVersion : String
    #x44Q48XNl899gMGN tdVersion : String
    #im4cWJ9pndpLcNIU releaseid : String
    #wfMsgn9DA5RwpYhw relid : String
    #xP8OkMBTILj9BzJJ releaseLabel : String
    #xyI6zdbNtWF1tW2I shareUrl : String
    #Ro0jVAfxjc96AtfP cdnUrl : String
    #aqMKa4Y2U81LY4nr anonToken : String
    #xlfiQDvNEhmXySqz primaryCdnUrl : String
    #xwDmhNER7gTBqIkY altCdnUrls : Collection[String]
  }
}
#duoBAytbWv4h843P
var cloud_relid : String {
  transient = true;
}
#e1AWMdJUSGSC7FXb
action query_cloud_compiler(#PBwRv7jsA9csHvXi api: String) returns(#xxMwdTOEAPCPpcwp resp: Json_Object) {
  #sT3qvm7FUbjWo74k $js := invalid→json_object;
  #x8NhvcVpZRiKFRrO $can_cache := $api→is_match_regex("^[\\w\\/]+$");
  #fd1g5pMy8x3GQYdu if $can_cache then {
    #uGYvpWtvXxtQn2zT $js := data→cache_compiler→get($api);
  }
  #u6R4eLFHvy18epPX $ver := code→get_cloud_relid(false);
  #g8G2ChrifLrjbMbd if `not` $js→is_invalid `and` $js→string("version")→equals($ver) then {
    #daRZCe3AsrjY4YOr $resp := $js→field("resp");
  }
  else {
    #GKRzQaLJVrtgEDQS $url := app→server_setting("TDC_ENDPOINT", false)→replace_regex("-tdevmgmt-.*", "") ∥ $api ∥ "?access_token=" ∥ app→server_setting("TDC_AUTH_KEY", false);
    #q4Ybfa3Ili22OOME $request := web→create_request($url);
    #svnD0fvv9EYcoCJ0 data→logger→debug("cloud compiler: " ∥ $api);
    #K0lYd2axzzTmfqVb $response := $request→send;
    #Mq7FjIU7Li6kb6or if $response→status_code = 200 then {
      #xX6mCRbv1bivkCbq if $response→header("content-type")→starts_with("application/json") then {
        #LA3H2bhjNjt3NsIF $resp := $response→content_as_json;
      }
      else {
        #RDg9x956TDiaVTbX $resp := $response→content→to_json;
      }
    }
    else {
      #xlC6IjegAb7jt8Ge $resp := invalid→json_object;
      #bJABWHA4pEFZv2Yg $can_cache := false;
    }
    #R3Qq1qdMQJO959QL data→logger→debug($response→header_names→to_json→serialize);
    #K3RZYxV3vqDInMFz if $can_cache `and` $response→header("X-TouchDevelop-RelID")→equals($ver) then {
      #M4tG12F2BUTghUV0 $jsb := web→create_json_builder;
      #lh1KVNJdNrO4255o $jsb→set_string("version", $ver);
      #Q4fZiNKyEF3AZmTt if `not` $resp→is_invalid then {
        #x3FiF0BlP2R8aCRk $jsb→set_field("resp", $resp);
      }
      #NByGwaKwsLdzbco4 data→cache_compiler→just_insert($api, $jsb);
    }
  }
  meta private;
}
#uog4JUnliQiyEDBs
var doctopics : Json_Object {
  transient = true;
}
#k52qKOeMCJvT7alQ
action cache_cloud_compiler_data(#iEut0zhBCOTspR2X ver: String) {
  #httkxbIKlts4CdNc if `not` data→cloud_relid→equals($ver) then {
    #jtqBRbygEMsZ8Eau $resp2 := `async` code→query_cloud_compiler("css");
    #zAdmKAKOLW7YLKjk data→doctopics := code→query_cloud_compiler("doctopics")→field("topicsExt");
    #qfEE0yNI3EoCY1Vb $jsb := web→create_json_builder;
    #xtKmV54GijzY9YxK foreach js in data→doctopics
    do {
      #mvAbcHH6CDlQuTW7 $jsb→set_field($js→string("id"), $js);
    }
    #UmfpTdch5jrzrllS data→doctopics_by_topicid := $jsb→to_json;
    #Q34TWB7lt822wFXN data→doctopics_css := $resp2→await→string("css");
    #FlhAo6Xlm4L0Bds3 data→cloud_relid := $ver;
  }
  meta private;
}
#HlkRv59flbQw4aKn
var doctopics_by_topicid : Json_Object {
  transient = true;
}
#mEXPdIjGuwtDOvMU
var doctopics_css : String {
  transient = true;
}
#qgIUJTR7pHj4i0gF
var curr_client_config : * client_config {
  transient = true;
}
#fnyUmoVd6L2GFeOh
action client_config_for_release(#xSTkK7dzjvguutVC prel: * pub_release) returns(#xFCx2jMUJSZidC5H ccfg: * client_config) {
  #Zrt9Z9UP4yCErwXM $ccfg := records→client_config→create_from_json(data→curr_client_config→to_json);
  #dRfZOEtT4XKAgWsB $ccfg→tdVersion := $prel→version;
  #Ea9Rb4eQgb2iRh29 $ccfg→releaseid := $prel→releaseid;
  #KAKJntpBpRANVJgj $ccfg→relid := $prel→id;
  meta private;
  meta sync;
}
#NpyejBWqqVhoYyjv
action topic_link(#yveGzqgGTpHxsV3n doctopic: Json_Object) returns(#Jry3B2KkvDhxru3s s: String) {
  #ASYkkfVWomfH1JOt $s := "<a href=\'/docs/" ∥ $doctopic→string("id") ∥ "\'>" ∥ code→html_quote($doctopic→string("name")) ∥ "</a>";
  meta private;
  meta sync;
}
#Ea4qF5NUjVjYG1Qh
action topic_list(#eL4cY5t7nwi6HLlR doctopic: Json_Object, #j8UujJ5xywcsWFvU childId: String, #rXr4cJ2bMZ2CYOZT childRepl: String) returns(#c6GnsusA4JhiYogr html: String) {
  #qC2ja0LgyA4Iv3eP $html := "<li class=\'active\'>" ∥ code→topic_link($doctopic);
  #x2CsF4WDTSrFwydj $children := $doctopic→field("childTopics");
  #NLBPdBn52WIuSQro if `not` $children→is_invalid `and` $children→count > 0 then {
    #x1wzG30Djfdjvmwe $html := $html ∥ "<ul class=\'nav\'>";
    #u5x0glwI4plidWp7 foreach js in $children
    do {
      #WyBWNwqb0BquHCV1 $id := $js→to_string;
      #SkCGTdjeeAmR5y8M if $id→equals($childId) then {
        #H46hgqqT0b2Pl1D1 $html := $html ∥ $childRepl;
      }
      else {
        #TkQPGAri2q24oqfr if $childId→is_empty then {
          #QBcCF1LkZzu2p4c3 $html := $html ∥ "<li>";
        }
        else {
          #xRb4X5W8tL255oOd $html := $html ∥ "<li class=\'hidden-xs\'>";
        }
        #L2s0D2g8MxIW25ti $html := $html ∥ code→topic_link(data→doctopics_by_topicid→field($id)) ∥ "</li>\n";
      }
    }
    #tbH8LCILGX8RTgdY $html := $html ∥ "</ul>";
  }
  #xUMbQLjfnIk1hijB $html := $html ∥ "</li>\n";
  #mUAQcJn1UIIWeUex $r := code→or_empty($doctopic→string("parentTopic"));
  #PM1FOJpMObl3LM1J if `not` $r→is_empty then {
    #qkQiyYM6pi2EQDSI $html := code→topic_list(data→doctopics_by_topicid→field($r), $doctopic→string("id"), $html);
  }
  meta private;
  meta sync;
}
#HvsU4ilZqic6Z13g
action check_pub_permission(#xQM6r44bvKIdYBcx req: * api_request) {
  #bTzSn5rgx3z4ZrWc if $req→userid→equals($req→root_pub→field("pub")→string("userid")) then {
    #jPDT185vJgvFOyVH skip;
  }
  else {
    #cHDQLMeQAIfGg6v9 code→check_permission($req, "pub-mgmt");
  }
  meta private;
  meta sync;
}
#x21o1SKdiaP2evlC
action \_init_pointers() {
  #hPUVORZMHnN20c4b skip;
  #jivD2oo5THH0woj2 // TODO cache compiler queries (with ex)
  #XGNxgefYS4biQ3mS data→pointers := @\u267b→indexed_store→create_store(data→pubs_container, "pointer");
  #VNNRIwCblZ4G4uih data→pointers→set_resolve($resolution_callback2);
  #wAsCsQOzVoZk1xaU where by_userid := true;
  #yUzSzd8YcGLo8jn7 where resolution_callback2(fetch_result: ♻ indexed_store → fetch_result, api_request: * api_request) {
    #JCu51jQveP4v3n4L code→add_username_etc($fetch_result);
    #xXz4kB48x1wKG08i $coll := create→Collection_of→\u2339pub_pointer;
    #zUjT2yO7HX5UYkXS foreach jsb in $fetch_result→items
    do {
      #GZ9oAddNHbXonUU0 $ptr := records→pub_pointer→create_from_json($jsb→field("pub"));
      #xqNNn7925aJIhUHW $coll→add($ptr);
    }
    #xIRvZLylkvkfr2Ip $fetch_result→items := $coll→to_json;
  }
  #qC645GXA4PM7F37i code→add_route("POST", "pointers", "", $handler);
  #xfCh6pKbZJyIy9iC where handler(req: * api_request) {
    #nhCBEyklTlIG2rcq code→can_post($req, "pointer");
    #R5Uy3fz2kWJhAfY2 if $req→status = 200 then {
      #Q8Lf7v2E3oqnJrzK $body := $req→body;
      #LXe42dec0k4EVQTD $ptr := records→pub_pointer→create;
      #J24RHONX0uoeNmRV $ptr→path := code→or_empty($body→string("path"))→replace_regex("^/+", "");
      #qJmgFsiQ8lzRsdkk $ptr→id := code→path_to_ptr($ptr→path);
      #mIG45M23FBoRcMF7 $matches := $ptr→path→@match("^usercontent/([a-z]+)$");
      #bEILU2VgVb22KP7K if $matches→at(1)→is_invalid then {
        #CUOA3m1hz78zXGk5 if $ptr→path→starts_with("users/" ∥ $req→userid ∥ "/") then {
          #UE94fFjcEDR872jZ code→check_permission($req, "custom-ptr");
        }
        else {
          #OUXmUvQzakPfRMhx code→check_permission($req, "root-ptr");
          #Q88hShQRwAO4lUqW if $req→status = 200 `and` `not` code→has_ptr_permission($req, $ptr→id) then {
            #xxvuPLfj9LG1DuRu $req→status := @\u267b→restify→http→@402_Payment_Required;
          }
        }
      }
      else {
        #iYAwbudOZxg2Y8Or $entry2 := code→get_pub($matches→at(1), "script");
        #xxMvhz1mmhQjLV7V if $entry2→is_invalid `or` `not` $entry2→field("pub")→string("userid")→equals($req→userid) then {
          #xtX0JV8xskfccbe4 code→check_permission($req, "root-ptr");
        }
      }
      #xDRTGOYk5K9lUiLa if $req→status = 200 `and` `not` $ptr→path→is_match_regex("^[\\w/\\-@]+$") then {
        #SFTPbv7bb2auhrEH $req→status := @\u267b→restify→http→@412_Precondition_Failed;
      }
      #xhhVZiiVSe0bZ4kJ if $req→status = 200 then {
        #xiHZomyCvY7bs3Nt $existing := code→get_pub($ptr→id, "pointer");
        #klZLtTJ3S4UA2v76 if `not` $existing→is_invalid then {
          #wVNh1DmiuOAxOZJq $req→root_pub := $existing;
          #JZQaJUJW2gD6q5FY $req→root_id := $existing→string("id");
          #XbVRgSWxJrBU2arD code→update_pointer($req);
        }
        else {
          #EqHZ63l4ETMcUi0w $ptr→userid := $req→userid;
          #qqIJ2iF2WVT4FDPj $ptr→userplatform := code→get_user_platforms($req);
          #A6G9ZVTgwRDG81OI $jsb := web→create_json_builder;
          #XQ1aBsaUCbeWiQHt $jsb→set_string("id", $ptr→id);
          #g0wnyVbqydA92Dmj $jsb→set_field("pub", $ptr→to_json);
          #GXnSFYYM6TuSHcpI code→set_pointer_props($jsb, $body);
          #MV5yc2leczLI2QX3 data→pointers→insert($jsb);
          #yGcKUGKLkhysTpjP code→store_notifications($req, $jsb, "");
          #TpyfAPPoV9yROCKH code→scan_and_search($jsb);
          #QS4EtI41kxD5wiSZ code→clear_ptr_cache($ptr→id);
          #h63cstDe30einZe0 code→audit_log($req, "post-ptr");
          #UTjQkoWQXwGD0xOD where newvalue := $jsb→to_json;
          #f8Rd4EeOHXaSCWlf data→pointers→return_one_pub($jsb→to_json, $req);
        }
      }
    }
  }
  #ph69VtjKbJelcoeo code→add_route("POST", "*pointer", "", $handler);
  #Z7R0IqTHx2yp4bPx where handler(req: * api_request) {
    #PycXysaug6oqMafE code→update_pointer($req);
  }
  #UB2I2HiGe4i1kDGQ @\u267b→tdlite_docs→init($expand_info);
  #qGwFadUu1X8P8SR4 where expand_info(v: Json_Builder) {
    #bnz9gIH4tITtRzUf $wp := code→or_empty($v→string("webpath"));
    #DsWt4O9K8x4N97nF if `not` $wp→is_empty then {
      #xfsFVzmrW7KLUlxg $ptr_id := code→path_to_ptr($wp→replace_regex("^/", ""));
      #xe92QQBWZwNfTUwG $v→set_string("ptrid", $ptr_id);
      #bBshqv648NSvdqa8 $entry := code→get_pub($ptr_id, "pointer");
      #Mg2q4yvD2cKTwioS if `not` $entry→is_invalid then {
        #xJo0GC3Bap8asFOJ $s := $entry→field("pub")→string("scriptid");
        #S2JiM4AcDxrR1dqq if `not` code→or_empty($s)→is_empty then {
          #NqFLiNImL1sv1eex $v→set_string("id", $s);
        }
      }
    }
    #xKzX2G2GMmgp9Nnz $pub_obj := code→get_pub($v→string("id"), "script");
    #xnR4SO4zygg9W6b7 if `not` $pub_obj→is_invalid then {
      #x4XKwFL4AoV7p8g4 $v→set_boolean("isvolatile", true);
      #rJgGsrIkZJEz32nz $jsb2 := code→get_card_info(data→empty_request, $pub_obj);
      #EI51pTB1ezzk52ye // use values from expansion only if there are not present in v
      #MEgGEhDCjIuIzKTs $jsb2→copy_from($v→to_json);
      #xnyN46yw4h9ZhzKu $v→copy_from($jsb2→to_json);
    }
    #rrPCCkkONEE1c7QQ $promotag := code→or_empty($v→string("promotag"));
    #I9T1NXyQbxhpEmoF if `not` $promotag→is_empty then {
      #dXc5xL29Kl2Vadm5 $api_req := code→build_api_request("/api/promo-scripts/all?count=50");
      #yA2ePQQj9cNCLAEo $entities := data→scripts→fetch_and_resolve($api_req, "promo", $promotag);
      #RbrFBwChDX0zKWKV $v→set_field("promo", $entities→items);
    }
  }
  #HuD6AzwXegzrIKXg code→add_route("POST", "admin", "reindexpointers", $handler5);
  #BDxBVqvhY8i4rtb4 where handler5(req: * api_request) {
    #gFw2Ov744Uciweh7 code→check_permission($req, "operator");
    #q86OCw2F1e3382Uz if $req→status = 200 then {
      #C7cUPqeJVrbtrmPJ `async` data→pointers→get_index("all")→for_all_batched("all", 50, $process);
      #IvFQUu22758zkPxg where process(json: Json_Object) {
        #xLNZlSWlireUB2yH @\u267b→parallel→for_json($json, $@action);
        #g4R6N9IaSrOlZHdH where @action(json: Json_Object) {
          #tBPNRbRq3o5y6chF $ref := create→Ref_of→Json_Object;
          #QcpWvGNrsxmWLeWa data→pointers→container→update($json→string("id"), $update);
          #r4qUClm90b0mueel where update(entry: Json_Builder) {
            #qVoQvih2qWXdlEBL code→set_pointer_props($entry, web→json("{}"));
            #x7GeBAcYjXnPFoju $ref→\u25c8set($entry→to_json);
          }
          #sdaqqelUURZCj2H4 code→audit_log($req, "reindex-ptr");
          #Z86qAtnYckZ4uqu4 where oldvalue := $json;
          #ieRB6oFZBsV6JMAW where newvalue := $ref→\u25c8get;
        }
      }
      #gSkp4krcJBr50Epr $req→response := web→json("{}");
    }
  }
  meta private;
}
#MO28o2DvjWSQTlJP
var pointers : ♻ indexed_store → store {
  transient = true;
}
#dUHt7a3fa2Jy4lae
table pub_pointer {
  type = "Object";
  persistent = false;
  fields {
    #xH9CFSakYcwGs55l kind : String
    #SaNCjNAS2f70ssPb time : Number
    #cQ4JkkJp6iUB4Nux id : String
    #GkrbncOYZhJo0Qpo path : String
    #qbLF6jnzgdmlJnn3 scriptid : String
    #zZv2UcsBW7s2PR1y artid : String
    #HF2S4qyv5A5MT4CW redirect : String
    #PM8YamM2haocnsC1 description : String
    #BVldKfu2QwGUZp7c userid : String
    #KLKqN8NGXLrmlCeV username : String
    #lgZYlLreA978YDAI userscore : Number
    #xgZMzh9dTDpD5ssV userhaspicture : Boolean
    #Gdvrb2nOU2OSfNcG userplatform : Collection[String]
    #SBCs4Xsj5gEJDY5a comments : Number
    #ZJWXWkZuRtW4WkEE artcontainer : String
    #ZdIzIBaf4GwxPVF4 parentpath : String
    #qs2y122H9C14OLtE scriptname : String
    #dYZyWDA0E11mEY1J breadcrumbtitle : String
  }
}
#zYc2kMHTeCQ2IbqX
action set_pointer_props(#Mw4DCXMK2yAwiYH3 ptr: Json_Builder, #RouXsaO9EhcRuKeT body: Json_Object) {
  #tPoJik6lz2OS4ser $pub := $ptr→field("pub");
  #JBsG12UXmvpFO5f0 $empty := records→pub_pointer→create→to_json;
  #GBXjUAbvm7ceVMS3 foreach k in $empty→keys
  do {
    #c8BcMxhnhGMEMmtN if `not` $pub→contains_key($k) then {
      #OTlBD6BK3i2QHHKF $pub→set_field($k, $empty→field($k));
    }
  }
  #hNbtJLqrHH8FOqWt code→set_fields($pub, $body, "description\nscriptid\nredirect\nartid\nartcontainer");
  #tuH0HbwFpehDJvYJ $pub→set_string("parentpath", "");
  #OEWMYJsAWRi21a7p $pub→set_string("scriptname", "");
  #EJ9fkGgtouS448KN $sid := code→get_pub($pub→string("scriptid"), "script");
  #zWyuLuwNo46uXon2 if $sid→is_invalid then {
    #kbY7bwwr2HKc5G0O $pub→set_string("scriptid", "");
  }
  else {
    #xt2FValpZnlC02ar $pub→set_string("scriptname", $sid→field("pub")→string("name"));
    #UcFK1Wb7n7J82JAr data→pubs_container→update($sid→string("id"), $update);
    #A1acqYlQAyBWWD4q where update(entry: Json_Builder) {
      #MrVA280l6m2CFISW $entry→set_string("lastPointer", $pub→string("id"));
    }
    #xODCmdZxajIF8CdE $entry := data→script_text→get($sid→string("id"));
    #C2TNhD3IGXm3Wz4V $parent_topic := invalid→json_object;
    #sgCkjAUMzTqJIe7x if `not` $entry→is_invalid then {
      #xPv2HuOQH2j6J8RZ $coll := code→or_empty($entry→string("text"))→@match("{parent[tT]opic:([\\w/@\\-]+)}");
      #ucLTdZwRGS1wwy49 $r := code→or_empty($coll→at(1));
      #URUJ7R4BwFtKrMpc if `not` $r→is_empty then {
        #lafoHrJAUBhn4Uam $parent_topic := code→get_pub(code→path_to_ptr($r), "pointer");
      }
      #zJgGHciLQlMW8IQK $coll := code→or_empty($entry→string("text"))→@match("{bread[Cc]rumb[tT]itle:([^{}]+)}");
      #jhJaJLG6J0F1o8Wg $pub→set_string("breadcrumbtitle", code→with_default($coll→at(1), $pub→string("scriptname")));
    }
    #dgOGNsJPtEt9n11J if $parent_topic→is_invalid then {
      #xdbfv9ehvplUBkgc $currid := $pub→string("path");
      #X9ZV1mFc3USDeHQ3 for 0 ≤ i < 5 do {
        #dtt3F3F8unreVmis $currid := $currid→replace_regex("[^/]*$", "")→replace_regex("/$", "");
        #yMgFH5NfVoS2moQI if $currid→is_empty then {
          #VgoFnAwrmAxBMYZb `break` ;
        }
        #FIEhhSz2SpU6kFHI $parent_topic := code→get_pub(code→path_to_ptr($currid), "pointer");
        #YIKJIYoDUmeKRDDQ if `not` $parent_topic→is_invalid then {
          #HqQTNdXJ22p5xlsS `break` ;
        }
      }
    }
    #HRVhlC8VGoRgO2nD if `not` $parent_topic→is_invalid then {
      #x44F8KcbMXUhFX92 $parent_redir := code→or_empty($parent_topic→field("pub")→string("redirect"));
      #NDLkqi0BukUo2ABo if `not` $parent_redir→is_empty then {
        #dkI4sQ7AYvqMVAob $parent_topic := code→get_pub(code→path_to_ptr($parent_redir), "pointer");
      }
    }
    #xnWYCyhjWR976xmK if `not` $parent_topic→is_invalid then {
      #rShB5RzMtNZv6y8z $pub→set_string("parentpath", $parent_topic→field("pub")→string("path"));
    }
  }
  #s1rEMd4krvqpfXEs $sid := code→get_pub($pub→string("artid"), "art");
  #x4Kg8s8hOIFslZ67 if $sid→is_invalid then {
    #ZRC2oiw52a2ihCGg $pub→set_string("artid", "");
  }
  #j6l2zrshHHqQqHIl $s := code→or_empty($pub→string("redirect"));
  #y2n3oAaNi7Ox1jmr if `not` $s→is_match_regex("^/[a-zA-Z0-9/\\-@]+$") then {
    #WA2hzbfeGBlvNMbn $pub→set_string("redirect", "");
  }
  meta private;
}
#JLih5nYF4cErXbM9
action publish_script_core(#eS6uJy5gt4izK2Zq pub_script: * pub_script, #LsJYLmbiVxEkct4r jsb: Json_Builder, #x8BuC2uL8U64ak9D body: String, #XQwwFGIl9PnWi20T req: * api_request) {
  #GXQNea1zbOoyEUZm if `not` $jsb→contains_key("id") then {
    #vQyjumdLBV9yWrRU code→progress("publish - gen id, ");
    #gQTa0IZcV8ULJHeH if $pub_script→ishidden then {
      #IXHAq6uOtcd4Kqau code→generate_id($jsb, 10);
    }
    else {
      #gZu8i8grG1HFmq0u code→generate_id($jsb, 6);
    }
  }
  #SY85tWTQcOVpQZZQ code→progress("publish - gen id done");
  #Rkv5nnK42U8PoZD8 $pub_script→id := $jsb→string("id");
  #jH2MQJRcbkl461Aq if $pub_script→rootid→is_empty then {
    #vb1Vyg8vr7ENwH50 $pub_script→rootid := $pub_script→id;
  }
  #pO6vvUEZS2yHeLzJ // 
  #k9HC4TfMe7EXyVr8 code→insert_script($jsb, $pub_script, $body, false);
  #xrN5vE12nHEYVzl2 $jsb2 := $jsb→clone;
  #u13okPo3NeVIqErL $jsb2→remove_field("text");
  #xxKNjA0IJjROaKvk $scr := $jsb2→to_json;
  #A8SWe2eiZ7JMxIxA code→audit_log($req, "publish-script");
  #edxII2Jd6o2s6rEq where subjectid := $scr→field("pub")→string("userid");
  #EZH742wgLDLY45c0 where publicationid := $scr→string("id");
  #KV6isFF1YTf8rJCV where publicationkind := "script";
  #AMcfnkkVFc3YotNO where newvalue := $scr;
  #sIHEror8t3exl52c code→progress("publish - inserted");
  #xpFDIX27TBy4rL8u if $pub_script→description→contains("#docs") then {
    #VBcfiTHfwHWQm10D data→logger→tick("CreateHashDocsScript");
  }
  #L0vZNVtsJqO4jgGV if `not` $pub_script→ishidden then {
    #Xi8xAK27EklSEdUI code→store_notifications($req, $jsb, "");
    #y0ZnsxYU4APyA8FN code→progress("publish - notified");
  }
  else {
    #qQCzyqOqEQMGK7Sj data→logger→tick("New_script_hidden");
  }
  meta private;
}
#FqDD41OKzS6Nc6nc
action update_pointer(#QNqu3Hp6lkYLpcsN req: * api_request) {
  #xQ0p0jS8VNLUmM9o if $req→userid→equals($req→root_pub→field("pub")→string("userid")) then {
    #lQQKGntL4ez42Uth skip;
  }
  else {
    #u7eN4Z6gC1NgHfRk code→check_permission($req, "root-ptr");
    #qItWOAOd7SVr36uO if $req→status = 200 `and` `not` code→has_ptr_permission($req, $req→root_id) then {
      #dgmSgYUm4OdLoBY4 $req→status := @\u267b→restify→http→@402_Payment_Required;
    }
  }
  #qV2KMMMBM9d2HUet if $req→status = 200 then {
    #TYnnJWzhxt5jgvKu $bld := data→pubs_container→update_and_upsert($req, $update5);
    #sVI2psn2rX8y9Y3c where update5(entry: Json_Builder) {
      #Yxu1Cd9VJYmNZX32 code→set_pointer_props($entry, $req→body);
    }
    #kcc2I4aqqHm2meur code→audit_log($req, "update-ptr");
    #xD4VyyHX3P1GL0fN where oldvalue := $req→root_pub;
    #xZhyS42YsGAX98Ek where newvalue := $bld→to_json;
    #Dokf54SLqQmbeN2p code→clear_ptr_cache($req→root_id);
    #sCGOABp5rsip0Ctr data→pointers→return_one_pub($bld→to_json, $req);
  }
  meta private;
}
#xpE89ODGticQ4qkp
action poke_release(#h9KlPiWI2QBY3zgI rel_label: String, #WyKtoUuCzNsB5K8B delay: Number) {
  #rl44Z84ZQjmp6IjA time→sleep($delay);
  #eWpLOe42InNFeN2G data→settings_container→update("releases", $update);
  #c3osHsL46uycnakz where update(entry: Json_Builder) {
    #dkzOZIFl2G45g4YN $jsb := $entry→field("ids")→field($rel_label);
    #rc4RdZtCGaYiFyed $jsb→set_number("numpokes", $jsb→number("numpokes") + 1);
  }
  meta private;
}
#oqRo3VeKTwVykTqP
action get_cloud_relid(#NTRNaick60Pds5aQ include_ver: Boolean) returns(#eiNpzu4sdVkhHCYF ver: String) {
  #Suipw9iUeJ5yvIQP $entry := data→settings_container→get("releases");
  #KgfD2aQEWJQaMM3a $js := $entry→field("ids")→field("cloud");
  #xHw2n5ehjHq07SOd $ver := $js→string("relid");
  #IsrqYDxjlArpYKnw if $include_ver then {
    #FKw0Mn2vwCZJ5DF8 $ver := $ver ∥ "." ∥ data→rewrite_version ∥ "." ∥ $js→string("numpokes");
  }
  meta private;
}
#zLklOmpgrAmRzT3Y
action path_to_ptr(#h6TJe7haAAXg2XgG fn: String) returns(#TRaeYEbBx5TgpQaj s: String) {
  #xzuXbrONoPuy8Uvy if code→or_empty($fn)→is_empty then {
    #pGmowbV5dAadJPz2 `return` "";
  }
  #pkRUtokS3BZmz8MW $s := "ptr-" ∥ $fn→replace_regex("^/+", "")→replace_regex("[^a-zA-Z0-9@]", "-")→to_lower_case;
  meta private;
  meta sync;
}
#jubsJFdmDxVNs1BI
action get_template_text(#AgERnS2B5YaCqtm6 templatename: String, #yfvdgk4bfeLAw0IP lang: String) returns(#xRNFSRgXofUmqIQB r: String) {
  #icShX7P9So0ZS74z $id := code→path_to_ptr($templatename→replace_regex(":.*", ""));
  #S1cMaCu23WRu5nvJ $entry3 := invalid→json_object;
  #huPTftZDsVlXWik4 if $entry3→is_invalid then {
    #FtlLRcvS5FzbtFuF $entry3 := code→get_pub($id ∥ $lang, "pointer");
  }
  #GDnJhayg8hwaXXdS if $entry3→is_invalid `and` `not` $lang→is_empty then {
    #x2YdMq358ZrWpbhL $entry3 := code→get_pub($id, "pointer");
  }
  #iAtlW5PSKD4qPnAx if $entry3→is_invalid then {
    #HlIxTWElTz2bxD6i `return` "Template pointer leads to nowhere";
  }
  else {
    #JdNQm02A9qKE4aAz $templid := $entry3→field("pub")→string("scriptid");
    #F4GuKCBrazyV2a2J $scriptjs := code→get_pub($templid, "script");
    #y7nsKgXMq5KD71FM if $scriptjs→is_invalid then {
      #Vd4b9k34kZ4UEx82 `return` "Template script missing";
    }
    else { #C28wOQpqfmCbaxYr if code→or_empty($scriptjs→field("pub")→string("raw"))→equals("html") then {
      #yHELX2DaKtSdXuYy $text_obj := data→script_text→get($scriptjs→string("id"));
      #U18uhzvSq673oSw4 if $text_obj→is_invalid then {
        #k5cJ8pvgrIMH8pBC `return` "Script text not found.";
      }
      else {
        #KzeXx4oarrsxfmog `return` $text_obj→string("text");
      }
    }
    else {
      #FiSe2P6tvpzL78vh `return` "Template has to be raw html";
      #jI9L1OvP1TtrJD5a if false then {
        #IOA9PD4E6TNm7Nvx $resp3 := code→query_cloud_compiler("q/" ∥ $scriptjs→string("id") ∥ "/string-art");
        #rnB72dd6SnvOzKDN if $resp3→is_invalid then {
          #Cr4d2NPXl5a9drln `return` "Extracting strings from template failed";
        }
        else {
          #A8K4b6tqANx74RlK $arts := $resp3→to_collection;
          #SAG3xCRmFbdXr48w $artid := $templatename→replace_regex("^[^:]*:?", "");
          #retX3bmnDt7HAYHq if `not` $artid→is_empty then {
            #DVlHFRemlKjHncMo $arts := $arts→@where( `fun:elt` $elt→string("name")→equals($artid));
          }
          #y879Dqd9wkLPmYxz if $arts→count = 0 then {
            #kyh53f1Gnby26yrp `return` "No art matching template name (if any)";
          }
          else {
            #V7cbxdHaDFzeeU15 `return` $arts→at(0)→string("value");
          }
        }
      }
    }
    } 
  }
  meta private;
}
#yqTvmC5pc4jBOxyW
action clear_ptr_cache(#xiwTHbWamqeKftT3 id: String) {
  #xhpy5iPJEwXEPorE if false then {
    #xkWRHuWt8UYuQ2Ug data→cache_rewritten→update("ptrcache/" ∥ $id, $update);
    #xa2ZNfKPQBbqleaa where update(entry: Json_Builder) {
      #xBi4y36XLqcxnY7T $entry→set_string("version", "outdated");
    }
  }
  #xe3KW22KAtedBtwH foreach chname in data→deploy_channels
  do {
    #FJH2QUIwQm4IOUio data→cache_rewritten→update("ptrcache/" ∥ $chname ∥ "/" ∥ $id, $update);
    #mweYZSs2akCGlp07 where update(entry: Json_Builder) {
      #xT0D8tXaFw6trVRy $entry→set_string("version", "outdated");
    }
    #xC4uOVAUP8pdunk9 if `not` $id→is_match_regex("@\\w+$") then {
      #YCmGnshaErom0E7e code→refresh_settings;
      #Q749Lv4m41Jpo4ky foreach lang in data→the_service_settings→langs→keys
      do {
        #emD2ncgUdwwToQCI data→cache_rewritten→update("ptrcache/" ∥ $chname ∥ "/" ∥ $id ∥ "@" ∥ $lang, $update);
        #YSUu2bdB79KlY4OY where update(entry: Json_Builder) {
          #xjL1X4P9DvPT40St $entry→set_string("version", "outdated");
        }
      }
    }
  }
  #XoossLz9GSKY4Ei2 if $id→starts_with("ptr-templates-") then {
    #ww6qJ1FpOPUXQCNe code→poke_release("cloud", 0);
  }
  meta private;
}
#S2GdatsT92WEH21l
action render_script(#xdUfAHBERYluQF27 scriptid: String, #xWVuvRW4xXkHPt60 v: Json_Builder, #B9DCaeG4gAmAmGa1 pubdata: Json_Builder) returns(#EnlolqbLr5x42IpP done: Boolean, #xIVKUW4BG4Pe9B8c templatename: String, #LhzUeAp7VJgM5AoI msg: String) {
  #pw4OwdWk9utOQtS4 $done := false;
  #xK6LBoWyUkPid2pD $msg := "";
  #oG7q4A6Cg9zL6DPz $templatename := "";
  #xRifGuNz6nTg7yu9 $scriptjs := code→get_pub($scriptid, "script");
  #CAGe2AlMIhcjrw4k if `not` $scriptjs→is_invalid then {
    #OzwujD6slim8ePjg $editor := code→or_empty($scriptjs→field("pub")→string("editor"));
    #g6k8BVfRU4pBI8PF $raw := code→or_empty($scriptjs→field("pub")→string("raw"));
    #b3gUpaphKMJzc04T skip;
    #ftJSWk2lsD4gxpB2 if $raw→equals("html") then {
      #xORUqzDPwhiLXH95 $entry := data→script_text→get($scriptjs→string("id"));
      #qMnSLWPKpp7VWO4e $v→set_string("text", $entry→string("text"));
      #TjekmDsVqx4n1RSP $done := true;
    }
    else { #HeazgM6PPo9Gv21G if $editor→is_empty then {
      #QSmaaVha55lriW1J $pubdata→copy_from($scriptjs→field("pub"));
      #cDNT9lUIJJ9S9ENr $pubdata→set_string("scriptId", $scriptjs→string("id"));
      #qWyttPMgqi9lc8M0 $userid := $scriptjs→field("pub")→string("userid");
      #wLyIHtDn9IMq792q $userjs := code→get_pub($userid, "user");
      #WPng6bltWZ4Vm22R $username := "User " ∥ $userid;
      #XXdPRTjLQ4hcHZJy $allowlinks := "";
      #xF489SFAus3Purml if code→has_permission($userjs, "external-links") then {
        #vtlL7o8d28CW73iJ $allowlinks := "-official";
      }
      #WR2mfJ4o0vdKNsdJ $resp2 := code→query_cloud_compiler("q/" ∥ $scriptjs→string("id") ∥ "/raw-docs" ∥ $allowlinks);
      #xETAiG5VJKAs8cGI if `not` $resp2→is_invalid then {
        #swxrgjPbRPUzQ209 $official := code→has_permission($userjs, "root-ptr");
        #x28VM2VopIwMgvwL if `not` $userjs→is_invalid then {
          #FT39fDP6MkmmDg2k $username := code→with_default($userjs→field("pub")→string("name"), $username);
        }
        #BldFIlnoEtI8DPZB $pubdata→set_string("username", $username);
        #s5C5RmjUVQEwvhbR $pubdata→set_string("userid", $userid);
        #xa34plXFkFY3jPDA $pubdata→set_string("body", $resp2→string("body")→replace_regex("^<h1>[^<>]+</h1>", "")→replace_regex("<h2>", "<h2 class=\"beta\">")→replace_regex("<h3>", "<h3 class=\"gamma\">"));
        #RNjZuXR5zIItEAjd $desc := $pubdata→string("description");
        #bdBgW4qR2i2P7AXe $pubdata→set_string("hashdescription", $desc);
        #obyMx09gUUhOC8f2 $pubdata→set_string("description", $desc→replace_regex("#\\w+", ""));
        #oe7Yqr5mU0iMkh4j $pubdata→set_string("doctype", "Documentation");
        #eCNmbBS6oGuka2ew $pubdata→set_number("time", $scriptjs→field("pub")→number("time"));
        #jpXTR4cxnqFA7WBS $doctype := code→with_default($pubdata→string("ptrid")→@match("ptr-([a-z]+)-")→at(1), "");
        #leNgLbC3eILcEOpS if `not` $official `and` `not` $doctype→is_match_regex("^(users|usercontent|preview|)$") then {
          #pySpLUUV8IpYncp9 $official := true;
        }
        #NaMuixIJOqqp4Dpb code→refresh_settings;
        #NfrG32AAWKKHvnCW $path_config := data→the_service_settings→paths→field($doctype);
        #xlWbALAvNM7AKpqT if `not` $path_config→is_invalid then {
          #n2tPbre1g3tqAfDw $pubdata→copy_from($path_config);
        }
        #lJ3J2v4yG80Jk6d4 if $official then {
          #FPZrpn9zEmWnyBUJ $s := code→or_empty($desc→@match("#(page\\w*)")→at(1))→to_lower_case;
          #w2QnfXrJoRQ2hWnV if $s→is_empty then {
            #s8DMmJobZQ294wfb $templatename := "templates/official-s";
          }
          else {
            #nfmRCYCwa3XeV2xP $templatename := "templates/" ∥ $s ∥ "-s";
          }
        }
        else {
          #x2vbiPsITFyLnb22 $templatename := "templates/users-s";
        }
      }
      else {
        #Wz1zsfQ6bydOVNwl $msg := "Rendering failed";
      }
    }
    else {
      #Z49Bf6KWFoAJ2gX6 $msg := "Unsupported doc script editor";
    }
    } 
  }
  else {
    #QpgPdwUFELrBmCpY $msg := "Pointed script not found";
  }
  meta private;
}
#S0x2XuNPJtWsBQA2
var cache_compiler : ♻ cached_store → container {
  transient = true;
}
#xj6mGNSr6mg46aMA
var art_content_types : Json_Object {
  transient = true;
}
#zfHJ2DH1BTcuZdtN
action \_init_config() {
  #LJGSjl7jwixcizs4 code→add_route("GET", "config", "*", $handler2);
  #xCJ1XWRs4I8j4kQc where handler2(req: * api_request) {
    #OpiiaA5MZjL0k3CU if $req→verb→equals("promo") then {
      #fmWDTU6l6OZdRWA1 code→check_permission($req, "script-promo");
    }
    else {
      #ewb0d42RibKDdwLP code→check_permission($req, "root");
    }
    #I4v46ibV1IVtsCpd if $req→status = 200 then {
      #lQHtlYDIRm6v4K1W $entry := data→settings_container→get($req→verb);
      #x8KethKPB4UqXabN if $entry→is_invalid then {
        #x4lBcs7xO99W67io $req→response := web→json("{}");
      }
      else {
        #MzWOTEdARUq4K3SF $req→response := $entry;
      }
    }
  }
  #YAd4JrLvMSYXOgcI code→add_route("POST", "config", "*", $handler2);
  #y4HoL5xXMKDeLyTZ where handler2(req: * api_request) {
    #xu2EL4DwylIi0pxP code→check_permission($req, "root");
    #NlFbfeJzMYHldGIC if $req→status = 200 `and` `not` $req→verb→is_match_regex("^(compile|settings|promo|compiletag)$") then {
      #xnjE02wwjwnad8wi $req→status := @\u267b→restify→http→@404_Not_Found;
    }
    #yAIJ4nqvARYSFZB0 if $req→status = 200 then {
      #uLELLNKfGD4JdGFv code→audit_log($req, "update-settings");
      #xv6Rnj2YsE5aCuTv where subjectid := $req→verb;
      #x9rwJZt2a9hiXGkD where oldvalue := data→settings_container→get($req→verb);
      #xVL8Zg7YX7c45q2e where newvalue := $req→body;
      #GAUrS0HqNiw5M2i4 data→settings_container→update($req→verb, $update);
      #McTEznOP1nK2wccJ where update(entry: Json_Builder) {
        #x0Ut6J2OsRO1NuWz code→copy_json($req→body, $entry);
        #GJ9GOJz3iwWMOv5X $entry→set_string("stamp", @\u267b→azure_table→create_log_id);
      }
    }
    #i5NAuU7iDceUNgR8 $req→response := web→json("{}");
  }
  meta private;
  meta sync;
}
#qE4XoZGjSvH4bp2m
table compiler_config {
  type = "Object";
  persistent = false;
  fields {
    #RwS8c9FMVgZH3SHq repourl : String
    #xvhRnqRYCDrpY73o platform : String
    #pJHAR9y2JdXME6Ji hexfilename : String
    #xD4EZ6145Sp5YnYA hexcontenttype : String
    #x220dQrfpoYJElWY target\_binary : String
    #cYq0IFaYU2wkN6rk internalUrl : String
  }
}
#hemzbmnNe6Vs2oO4
action execute_search(#Wu7cDHbSVzNT4KPR kind: String, #A3tUiPhzv4X92K4f q: String, #ew1ISDW2E4yhmzzb req: * api_request) {
  #x2MX7fgLLuYfGBAl $query := @\u267b→tdlite_search→to_pub_query("pubs1", $kind, $q);
  #ZqxLnAp6biguZISR $request := @\u267b→azure_search→create_request($query→to_url);
  #FilE7YGcExpnXEo3 $response := $request→send;
  #hVL3ld5oEEE01plr $js := $response→content_as_json;
  #ykQRvaYcAfM6xLRI $ids := create→Collection_of→String;
  #FcKcYwKf18mVCzL7 if $js→field("value")→is_invalid then {
    #x2Si5V3IJfls6p8t data→logger→debug("js: " ∥ $js→format(2));
  }
  #gyQs25LMOIg2au3z foreach js2 in $js→field("value")
  do {
    #SnHT0M72nWFgoMdb $ids→add($js2→string("id"));
  }
  #xWXcpy54anY3CkuE $fetch_result2 := data→scripts→fetch_from_id_list($ids, $req→query_options);
  #WzCUcSvbvJx1WPxg $jsons := $fetch_result2→items→to_collection;
  #xmeVsJuqYH2aQj4u if `not` code→caller_has_permission($req, "global-list") then {
    #ZfD6MJ8QdLsatGTT $jsons := $jsons→@where( `fun:elt` code→is_abuse_safe($elt));
  }
  #xPXPccPHveXGsm41 $bykind := web→create_json_builder;
  #BT9eV4b0RevEA47s foreach ent in $jsons
  do {
    #btguXq9vyf5XT4L2 $lst := $bykind→field($ent→string("kind"));
    #Bnq8J4JTNRtHaoyR if $lst→is_invalid then {
      #Q03fGTie4A3hapz9 $lst := web→json("[]")→to_json_builder;
      #iwo1BnQQqNJfwOtv $bykind→set_builder($ent→string("kind"), $lst);
    }
    #NQdN4uITxIajs437 $lst→add($ent);
  }
  #iEd8LSuQn3i1ouuj $byid := web→create_json_builder;
  #hVM8QKY2Rup7w9Dh foreach knd in $bykind→keys
  do {
    #UK2arnbp8F0B9X8B $fetch_result2→items := $bykind→field($knd)→to_json;
    #ZfvCj2abGyuhwqHi $store := @\u267b→indexed_store→store_by_kind($knd);
    #K2t4fGZVCoOsk4Kg $fld := "id";
    #xVjjqs18F9vZQVLa if $knd→equals("script") then {
      #aTYR9MZHRtKlJ1L7 code→resolve_scripts($fetch_result2, $req, true);
      #CN2RiQMpyLzMLuug $fld := "sourceid";
    }
    else {
      #CbaC4DW2U9ZwltTi records→store_decorator→at($store)→resolve→run($fetch_result2, $req);
    }
    #sBPUVlryv1XpyPbe foreach s in $fetch_result2→items
    do {
      #F2wZKFc2aWKQAP7w $byid→set_field($s→string($fld), $s);
    }
  }
  #kJZ002oiSaFs0250 $fetch_result2→items := $ids→map_to→Json_Builder( `fun:elt` $byid→field($elt))→@where( `fun:elt` `not` $elt→is_invalid)→to_json;
  #YHPGdC3S12Bhy1rr code→build_list_response($fetch_result2, $req);
  meta private;
}
#xwcD4SaoneITgS3t
action has_setting(#IeQDa2bQ2ooP224L key: String) returns(#d6SeUrlp3oXpYFWl has_setting: Boolean) {
  #qBKGXcpmhjIg2KDF $has_setting := `not` code→or_empty(app→server_setting($key, true))→is_empty;
  meta private;
  meta sync;
}
#qLHy9v9KzGcc7tkr
var has_https : Boolean {
  transient = true;
}
#v6Sn47yYJ8AbXtYW
action set_password(#opJSX6ie4WalsAo3 req: * api_request, #xDt4ZTxXNEUqIKFC pass: String, #FVJI9aMNPV7OH6fz prev_pass: String) {
  #eSxpkWIv8fr4sn2m $pass := code→normalize_and_hash($pass);
  #to9MwfBPxHpMEO4X if code→or_empty($prev_pass)→is_empty then {
    #C69Fkn2cQxM6GbEM $prev_pass := $pass;
  }
  #xoNwo2Km3pKGQm8j $ok := create→Ref_of→Boolean;
  #tE4Ve245RdSJO4pq data→passcodes_container→update($pass, $update);
  #EZ2WxYyE7xAhZiyQ where update(entry: Json_Builder) {
    #uXpFqg2OAbG8KcdA $kind := code→or_empty($entry→string("kind"));
    #EuDy444d7tb4XWCT if $kind→is_empty `or` $kind→equals("reserved") then {
      #bLsAA7ynasq2vMe4 $entry→set_string("kind", "userpointer");
      #xXZ3VDX8HXSk5jQ2 $entry→set_string("userid", $req→root_id);
      #KDQwTbw7DAAO5VQN $ok→\u25c8set(true);
    }
    else {
      #SCUgiySpSkK5zWu4 $ok→\u25c8set(false);
    }
  }
  #xNQaob5Wnr6q23z0 if $ok→\u25c8get then {
    #C44pkxKCB3AJgfDT data→pubs_container→update($req→root_id, $update);
    #lpy2X9oelHbu2jbu where update(entry: Json_Builder) {
      #xZ1lkdKNtqeFoLTD $entry→set_string("login", $pass);
    }
    #xGeMH9pL0nrHc2t1 if `not` $prev_pass→equals($pass) then {
      #Ea6FvXqfu9XLj57W data→passcodes_container→update($prev_pass, $update);
      #xjya94wIVPuESByR where update(entry: Json_Builder) {
        #xhHaNT8kQcP3YBGY $entry→set_string("kind", "reserved");
      }
    }
    #X34qjgtlPzr1I88B $req→response := web→json("{}");
  }
  else {
    #xabKBYraOdzGF7DQ $req→status := @\u267b→restify→http→@400_Bad_Request;
  }
  meta private;
}
#wTamvrfAOW7h49g2
var throttle_disabled : Boolean {
  transient = true;
}
#UfQ7tds7kRSNmjWp
var table_client : ♻ azure_table → client {
  transient = true;
}
#bRdrv2fTGQf4TKaP
action progress(#x44h2UsthCkwTYTC message: String) {
  #xONWd4V4eRxz2TbW if false then {
    #x6U2IbRZHBfOPa5U data→logger→debug($message);
  }
  meta private;
  meta sync;
}
#xZ4DKYKoPFuENYFt
action workspace_for_user(#HdaFrlMhFw69F4ig userid: String) returns(#xWODsmpTUswRz4N1 container: ♻ cached_store → container) {
  #Gs4tVFE5haLKMFao $container := data→workspace_container→at(math→mod($userid→at($userid→count - 1)→to_unicode, data→workspace_container→count));
  meta private;
  meta sync;
}
#cjHVPW7p2Hx5HzAF
action cpu_load() returns(#xzE3tfHJ0PatM4l6 load: Number) {
  #JBaLAt9kegDcz0wZ app→javascript_async("local", "require(\"child_process\").execFile(\"wmic\", [\"cpu\", \"get\", \"loadpercentage\"], function (err, res) {\n  var arr = [];\n  if (res)\n    res.replace(/\\d+/g, function(m) { arr.push(parseFloat(m)) });\n  load = 0;\n  arr.forEach(function(n) { load += n });\n  load = load / arr.length;\n  resume();\n});");
  meta private;
}
#xxSpnbbB4dnWd2sw
action status_report_loop() {
  #Zw5BHcAb6mRfwgmN while true do {
    #nbdaDYxPFxqrYrpP time→sleep(30 + math→random_range(0, 10));
    #alMUrGVMPGtowDvn $value := code→cpu_load;
    #YMbjy2N02RUZi4Oy data→logger→measure("load-perc", $value);
  }
  meta private;
}
#xXS27xOUC3u4YqNk
action spec_table_client(#xPdZF27s4BesZKx4 pref: String) returns(#xdEKFIqAyKJOyOnY table_client: ♻ azure_table → client) {
  #ZGclBLyWRcTqA80W $table_client := @\u267b→azure_table→create_client;
  #tsiezybY2dWCDSQj where timeout := 10000;
  #xdpgF2VYfD22O4K2 where retries := 10;
  #D4XMyd2IgyumnFMn where storage_account := app→server_setting($pref ∥ "_ACCOUNT", false);
  #rvBpMsXvoaGpzCpj where storage_access_key := app→server_setting($pref ∥ "_KEY", false);
  meta private;
}
#B3aHyPCRxN2E33d5
action bare_increment(#xjenKidjQEAmUxXI entry: Json_Builder, #xJjOKvdiQ2Q8iG1H key: String) {
  #DTFXeoA9OhzY7CxQ $entry→set_number($key, code→or_zero($entry→number($key)) + 1);
  meta private;
  meta sync;
}
#j42xXo12i6NijmFR
var my_channel : String {
  transient = true;
}
#nOqut2rBPzWD2cSd
var my_host : String {
  transient = true;
}
#S8qye2ZntrkahxtF
var non_self_redirect : String {
  transient = true;
}
#JD96kYo8yNyKbMAT
var not_found\u002ehtml : String {
  is\_resource = true;
  url = "data:text/plain;base64,PCFET0NUWVBFIGh0bWw+CjxodG1sPgo8aGVhZD4KPG1ldGEgbmFtZT0idmlld3BvcnQiIGNvbnRlbnQ9IndpZHRoPTMyMC4xIiAvPgo8bWV0YSBodHRwLWVxdWl2PSJYLVVBLUNvbXBhdGlibGUiIGNvbnRlbnQ9IklFPWVkZ2UiIC8+Cjx0aXRsZT5Ob3QgZm91bmQ8L3RpdGxlPgo8Ym9keSBpZD0ncm9vdCcgc3R5bGU9J2ZvbnQtc2l6ZToxNnB4OyBmb250LWZhbWlseTpzYW5zLXNlcmlmOyc+CjxkaXYgc3R5bGU9J21hcmdpbjogMCBhdXRvOyB3aWR0aDogMzEwcHg7ICB0ZXh0LWFsaWduOiBjZW50ZXI7Jz4KPGgxIHN0eWxlPSdmb250LXNpemU6M2VtOyBmb250LXdlaWdodDpub3JtYWw7Jz5IVFRQIDQwNDwvaDE+CjxwPlRoZSBwYWdlIHlvdSd2ZSByZXF1ZXN0ZWQgY2Fubm90IGJlIGZvdW5kLjwvcD4KPC9kaXY+CjwvYm9keT4KPC9odG1sPgo=";
  transient = true;
}
#fnSqLfJ72BRby4Yj
var disable_search : Boolean {
  transient = true;
}
#xHovUcvXxKq4jtqA
action delete_all_by_user(#kOuIXPz6a99lxnug store: ♻ indexed_store → store, #CPjQWBT6mdUE12VP id: String, #FtxjVo6AcTXyVPcM req: * api_request) {
  #xRMnPfWfflT6B930 $log_delete := `not` $store→kind→equals("review");
  #hRPi87R9UBZ4k1Nn $store→get_index("userid")→for_all_batched($id, 50, $process);
  #u4omt7tHpIIarwgi where process(json: Json_Object) {
    #JpviB0WihfSPq244 @\u267b→parallel→for_json($json, $action2);
    #PA60Y24Wj81VY3gj where action2(json: Json_Object) {
      #x4jNZxi4YVZf463m if $log_delete then {
        #xqOKc2KwQBGFah5u code→audit_log($req, "delete-by-user");
        #o33xuIJArng8Cy0q where publicationid := $json→string("id");
        #ZHd6XdjJ8btMQrXb where oldvalue := code→audit_delete_value($json);
        #dZ7FbqRrshiub1gI where publicationkind := $json→string("kind");
      }
      #Mor95H2TXCCAFnsc code→delete_pub_rec($json);
    }
  }
  meta private;
}
#vWs5L12ndCABjxNG
action delete_review(#boa8OxBP4mFI2d0I js: Json_Object) returns(#EVkcSeGjNQSj1iIZ delok2: Boolean) {
  #x2dqqSQ648C4VahL $pubid := code→or_empty($js→string("pubid"));
  #CLXuJnEfSL2ggyIK contract→assert( `not` $pubid→is_empty, "");
  #S3ADrQgKvC4nA28O $ok2 := code→try_delete_pub_pointer($js→string("ptrid"));
  #VbkJa3BlzVcJm7Cb if $ok2 then {
    #FhP9nFhAZdIGR4ig $delok := code→delete($js);
    #TkgSDsmc4zSJHNyh if $delok then {
      #p5JVK4T3GPxl3DO3 data→pubs_container→update($pubid, $update);
      #e39LglHT1sArKDta where update(entry: Json_Builder) {
        #xFmIK2AUm6pJFBrw code→increment($entry, "positivereviews", - 1);
      }
      #xgwUqNt64KIgWXFX data→pubs_container→update($js→field("pub")→string("publicationuserid"), $update);
      #jmVlXpXpnpu9gBYR where update(entry: Json_Builder) {
        #xa6Ipuc4GzhcQzvL code→increment($entry, "receivedpositivereviews", - 1);
      }
      #TKTK2i0bNtx47Dsh `return` true;
    }
  }
  #DGIL6Tqr23LfrT10 `return` false;
  meta private;
}
#h3pFR7O3UxpgVbw1
var deployment_meta : Json_Object {
  transient = true;
}
#qDlB2Czk3P3odSbS
action has_permission(#xj4zBAlkYdDLnoKl userjs: Json_Object, #gGQd1GGTJcZrKO7C perm: String) returns(#n0I2xP83UJyaJ354 ok2: Boolean) {
  #jcDfh4eXKWBduVcd if $userjs→is_invalid then {
    #x0rCyZ4EIMBWU4hP `return` false;
  }
  #d4MTBfdQICK0o6l9 if code→or_empty($perm)→is_empty then {
    #f3dSJgk1AW8ULCeJ `return` true;
  }
  #gffAnf2aU6HeUVsf if $perm→contains(",") then {
    #FL7f2AgPKfvqqkp3 foreach oneperm in $perm→split(",")
    do {
      #w4Phgu0rERODGVHf if `not` $oneperm→is_empty then {
        #xPvitRyI9xvwT5j8 if `not` code→has_permission($userjs, $oneperm) then {
          #dcR0M6hyPNtf8MLy `return` false;
        }
      }
    }
    #UAH8Ls3QbFuXEgci `return` true;
  }
  #tJakZo2WuWAC2QvV $lev := code→or_empty($userjs→string("permissions"));
  #IPHki4ZLtjOm21CI foreach s in $lev→split(",")
  do {
    #YNysxqMK3HtIrYZX if `not` $s→is_empty then {
      #hqsMnv3BX2BeeNAi if false then {
        #xxQTyDIk7WwQ4YYI data→logger→debug("check " ∥ $s ∥ " for " ∥ $perm ∥ " against " ∥ data→settings_permissions→format(2));
      }
      #ovJSWws1rZf2Q1RE if $s→equals($perm) `or` $s→equals("admin") then {
        #xpRX2fADDN1yob3O `return` true;
      }
      #KZ1WYPXHeDrhXPKs $js := data→settings_permissions→field($s);
      #R8qADCiSXart6lJI if `not` $js→is_invalid `and` $js→contains_key($perm) then {
        #DqFtoF2OqRaeq2J9 `return` true;
      }
    }
  }
  #atvEi5qeneagYCuE `return` false;
  meta private;
  meta sync;
}
#ysahB4sL9ZJocQ8v
var td_deployments : ♻ azure_blob_storage → Container {
  transient = true;
}
#xm3LicdI12gYNzDU
var last_settings_check : Number {
  transient = true;
}
#xVU8tPyTwAWaU2D6
var settings_permissions : Json_Object {
  transient = true;
}
#ZNU9RXzYM2nYGoJh
action refresh_settings() {
  #joCywJLIUR2oSPxR $now := time→now→milliseconds_since_epoch;
  #riVgNQSUEbJ42UyY if $now - data→last_settings_check > 5000 then {
    #xFLPpYEaYkzhRpjn while data→last_settings_check < 0 do {
      #z4cAmwM5hmchjxSP time→sleep(0.1);
    }
    #xy2EzSQvcKEE2SHL $now := time→now→milliseconds_since_epoch;
    #MP59094MNTq1mJhC if $now - data→last_settings_check > 5000 then {
      #SnE0r2JmDwXOQoui data→last_settings_check := - 1;
      #ndv2RM95AC1RDlCq $entry2 := data→settings_container→get("settings");
      #p92tPE95A4MyFbLj if $entry2→is_invalid then {
        #DKF0EgQPey8LIbih $entry2 := web→json("{ \"permissions\": {} }");
      }
      #ALmNh4zNvtiDyWkj $perm_map := $entry2→field("permissions")→to_json_builder;
      #fXLGe22w9ORCccOA $num_added := 1;
      #x2qcIyiUIUXxeO44 while $num_added > 0 do {
        #MvZZTsTlKMR4iM41 $num_added := 0;
        #qV4FjVw0VwSmRyyt foreach perm in $perm_map→keys
        do {
          #wFNGVjvTuljhkfAH $currperm := $perm_map→field($perm);
          #cxokYJ0JWY44tJkc foreach perm2 in $perm_map→field($perm)→keys
          do {
            #ZTRrlZAk9yh5Gp4L $otherperm := $perm_map→field($perm2);
            #NkJQW9S9Celxk4o2 if `not` $otherperm→is_invalid then {
              #BtZgjCj5K2FJvJgL foreach perm3 in $otherperm→keys
              do {
                #U2b1Zaz1CtWQSFIe if `not` $currperm→contains_key($perm3) then {
                  #GeD44M8oRkUYBCG4 $currperm→set_number($perm3, 1);
                  #xzBjHfk3aSF1bk3r $num_added := $num_added + 1;
                }
              }
            }
          }
        }
      }
      #D4u44nGply6ux4au $jsb := web→json("{\n  \"paths\": {},\n  \"blockedNicknameRx\": \"official|touchdevelop\",\n  \"accounts\": {},\n  \"termsversion\": \"v1\",\n  \"emailFrom\": \"noreply@touchdevelop.com\",\n  \"tokenExpiration\": 0,\n  \"defaultLang\": \"en\",\n  \"langs\": {},\n  \"envrewrite\": {},\n  \"alarmingEmails\": []\n}")→to_json_builder;
      #VgFSYo10TZMTPE3R $jsb→copy_from($entry2);
      #TBEl3xoCiRkdnekv data→the_service_settings := records→service_settings→create_from_json($jsb→to_json);
      #TFmMMkl1I77FAgmH data→last_settings_check := $now;
      #S0d212jysIJajizO data→settings_permissions := $perm_map→to_json;
      #x9YsQpeucdOJTHdS skip;
    }
  }
  meta private;
}
#rDPl9waGl258LdOy
action pub_features(#HBP51M0FrrKYsxW5 pub: Json_Object) returns(#ezGcgeYpnsr6Ewfj features2: Collection[String]) {
  #xe8y5Lk3L20pgF2s $features := create→Collection_of→String;
  #ChvgfiU4MScrWfiZ if $pub→string("kind")→equals("script") then {
    #l84oqsLX2cOW342k if $pub→boolean("islibrary") then {
      #xAcxw9CfK4gKpSx0 $features→add("library");
    }
  }
  #tlA8Z4NjCFO4RR3b `return` $features;
  meta private;
  meta sync;
}
#xlnjgw9JMIzTTjSQ
var main_release_name : String {
  transient = true;
}
#x9378UPMAhtr4jmL
var mbed_cache : Boolean {
  transient = true;
}
#E5Sqh6Zvg02zluYu
var favicon_ico : Buffer {
  transient = true;
}
#Odb2FJcpUy834uNv
action \_init_embed_thumbnails() {
  #C9B2CLOS9OibVyAA data→embed_thumbnails := @\u267b→cached_store→create_container("embedthumbnails");
  #CqcqC67F4beHSDe2 where in_memory_cache_seconds := 120;
  #rfYFawdz8uHJ261E @\u267b→restify→server→get("/thumbnail/:size/:provider/:id", $@then);
  #MX2LYrvIYMyepwaP where @then(req: ♻ restify → Request, res: ♻ restify → Response) {
    #ael0YsJlMGu5nSrW $referer := code→or_empty($req→header("referer"))→to_lower_case;
    #xffS3q4yHhGiHA4b if $referer→is_empty `or` $referer→starts_with(data→@self) `or` $referer→starts_with("http://localhost:") then {
      #f6fqRbVwBpXBqiID // ok, referer checked
    }
    else {
      #RMvv1a8vpF6UbB8T $res→send_custom_error(@\u267b→restify→http→@402_Payment_Required, "Bad referer");
      #Q7q1i96pe2e11DU2 `return` ;
    }
    #DR2gz8iSNTOpQKTR $provider := $req→param("provider");
    #xOkfGnJdnWdbzPte $id := $req→param("id");
    #xenuuatX29ceRLTM $path := $provider ∥ "/" ∥ $id;
    #G6a69WPLNxTw4D04 $entry := data→embed_thumbnails→get($path);
    #xPdH2v7tL4TtnZuS if $entry→is_invalid then {
      #znobFzN62KCoUgHk $drop := code→throttle_core(code→sha256($req→remote_ip) ∥ ":thumb", 10);
      #XwSZNbkwUJdT4Ews if $drop then {
        #ZQfc2d1duWBiStGX $res→send_error(@\u267b→restify→http→@429_Too_Many_Requests, "Too many thumbnail reqs");
        #q2o2uWKLkziae4CD `return` ;
      }
      #ord2wHJdl7LsWun8 if $provider→equals("vimeo") then {
        #cQEKRT9zoGmK4cXI if `not` $id→is_match_regex("^[0-9]+$") then {
          #xrtCi9XxUDzKrf4n $res→send_error(@\u267b→restify→http→@412_Precondition_Failed, "Bad video id");
          #Urc32FeAkFcBrtQ7 `return` ;
        }
        #JJMttFOq9Dr6n2WV $js := web→download_json("https://vimeo.com/api/oembed.json?url=" ∥ web→encode_uri_component("https://vimeo.com/" ∥ $id));
        #rwo94r5wi0soWDhL if $js→is_invalid then {
          #uyoszy40eWiTP5Vf $res→send_error(@\u267b→restify→http→@404_Not_Found, "");
          #I8f93d7cbBmUhT1e `return` ;
        }
        #xhNCzMGZnv4JPBne $jsb := web→create_json_builder;
        #x117P84mbHpU8HeK $jsb→set_field("info", $js);
        #SIji09nSjaETe2C4 $ok := data→embed_thumbnails→try_insert($path, $jsb);
        #RvX0SoGDaWZnb5T9 $entry := $jsb→to_json;
      }
      else {
        #oGVnEXeOHSJPa66K $res→send_error(@\u267b→restify→http→@405_Method_Not_Allowed, "invalid provider");
        #jZww2mTq24VbwQxD `return` ;
      }
    }
    #Vo4n36CI4p22Jabl $sz := code→or_zero(code→with_default($req→param("size"), "0")→to_number);
    #vTQRrxwcM0T2dO32 if $sz ≤ 0 then {
      #vgDvaCoHVOxMz7CH $sz := 512;
    }
    #kMjAZYeJQbfXO2CJ $url := $entry→field("info")→string("thumbnail_url");
    #seEZ9292mX5seZ20 $url := $url→replace_regex("_\\d+\\.", "_" ∥ $sz ∥ ".");
    #vGThvaxGCSeYCjpW $res→redirect(301, $url);
  }
  #XUns6J2KejmmS94J @\u267b→restify→server→get("/embed/.*", $@then);
  #xJoaK0T79IrQ2MiZ where @then(req: ♻ restify → Request, res: ♻ restify → Response) {
    #hfRL74Q1LYoiG21H $id := $req→url→replace_regex("\\?.*", "")→replace_regex("^/embed/", "");
    #T8LGmugXegGT8uNz if $id→is_match_regex("^[a-z0-9\\-/]+$") then {
      #xX2LexBJrn0iiXjS $templ := "<!doctype html>\n<html lang=\"en\">\n<head>\n  <meta charset=\"utf-8\">\n  <title>Video</title>\n</head>\n<body>\n  <video controls autoplay preload=auto poster=\"{SELF}{ID}/thumb\" style=\'width:100%;height:100%\'>\n    <source src=\"{SELF}{ID}/sd\" type=\"video/mp4\">\n    Video not supported.\n  </video>\n</body>\n</html>\n";
      #xMOQVrZxodK3Bnzb $s := $templ→replace("{SELF}", data→@self)→replace("{ID}", $id);
      #J0ZOXoXoostmGgQm $res→html($s);
    }
    else {
      #xUjeSLcQAH7aTLS4 $res→send_error(@\u267b→restify→http→@404_Not_Found, "Bad id");
    }
  }
  meta private;
}
#xw66F2265uPDy75l
var @self : String {
  transient = true;
}
#w5Mqq5YqQgCYR7Kr
var embed_thumbnails : ♻ cached_store → container {
  transient = true;
}
#x02VUs4YIm5R2HtY
action \_init_admin() {
  #xf8WZ2VLLisYExo4 data→deployment_meta := web→json(code→with_default(app→server_setting("TD_DEPLOYMENT_META", true), "{}"));
  #Z3EY7e7NCrFph5uT code→add_route("GET", "stats", "dmeta", $handler4);
  #xyRePUV3eD0qWC0G where handler4(req: * api_request) {
    #xTvG2qQM0VETg5qo $req→response := data→deployment_meta;
  }
  #mFc22iSFSrr8dRh1 code→add_route("GET", "admin", "stats", $handler2);
  #tmiMMWAETHt5FRPv where handler2(req: * api_request) {
    #gv269T6CPCd2IW7w code→check_permission($req, "operator");
    #xjHZbJyXauswmduj if $req→status = 200 then {
      #w75th432bNmhOmlU $jsb := web→create_json_builder;
      #xCzxbPr8cjliXioA foreach s in "RoleInstanceID\nTD_BLOB_DEPLOY_CHANNEL\nTD_WORKER_ID\nTD_DEPLOYMENT_ID" →split("\n")
      do {
        #GRWsnfjVGwCsfE2c if `not` $s→is_empty then {
          #vcdcm2TIFawydvv6 $jsb→set_string($s, code→or_empty(app→server_setting($s, true)));
        }
      }
      #mRglAOGVTAtXCFTZ $jsb→set_field("search", @\u267b→tdlite_search→statistics);
      #x33n1v4ijMlwNWGb $jsb→set_field("dmeta", data→deployment_meta);
      #d44pdKEY5tCqyad0 $jsb→set_number("load", code→cpu_load);
      #CqIP4Xz2aG59oNGc $redis := data→redis_client→info;
      #PPz3bKtgjhPX8a0a $jsb→set_field("redis", $redis);
      #lpCjhGZ4Mr2RCYpM if code→or_false($req→query_options→boolean("text")) then {
        #I8urjU1VUiyup2mM $s2 := $jsb→string("RoleInstanceID") ∥ ": load " ∥ $jsb→field("load")→serialize ∥ " redis load: " ∥ $redis→number("used_cpu_avg_ms_per_sec") / 10 ∥ " req/s: " ∥ $redis→number("instantaneous_ops_per_sec") ∥ "\n";
        #x5GiY16Kf8rqaP2F $req→response := $s2→to_json;
      }
      else {
        #jOUEY3XjAdl8ELp4 $req→response := $jsb→to_json;
      }
    }
  }
  #CoB8PF8ZpaGnWcZy code→add_route("GET", "admin", "deploydata", $handler5);
  #P4S6TmE2EIyJ4Feq where handler5(req: * api_request) {
    #piOwaPiFxB9TD9lb code→check_permission($req, "root");
    #vvjzx8kAMLHafXI3 if $req→status = 200 then {
      #EvK12lJMeW2s4T1m $ch := code→with_default($req→argument, data→my_channel);
      #yqvAjDbMLDo3Im0o $req→response := web→json(data→td_deployments→get_blob_to_text("000ch-" ∥ $ch)→text);
    }
  }
  #QUkr6uRUMhCAwjBt code→add_route("POST", "admin", "copydeployment", $handler5);
  #SPRwr0Ggb54xMIAA where handler5(req: * api_request) {
    #ON1I1lJ9wpbiKI2d code→audit_log($req, "copydeployment");
    #uQ2P1JioOrrpXq5T where data := $req→argument;
    #lYulG9T6F44gMZW4 code→copy_deployment($req, $req→argument);
  }
  #EYeUAkh9iRyKO45c code→add_route("POST", "admin", "restart", $handler5);
  #npD3faqNq1DmoDeu where handler5(req: * api_request) {
    #kIw550zwVLo5DbV8 code→audit_log($req, "copydeployment");
    #xAid5fRyxc5iYjho where data := "restart";
    #YTI349HBzH7cBkPr code→copy_deployment($req, data→my_channel);
  }
  #E1vSkCJ44qRHKd0j code→add_route("GET", "admin", "raw", $handler2);
  #oM32JJ7XKjlrN3fk where handler2(req: * api_request) {
    #jTNYBTO2Iw1IvCBI code→check_permission($req, "root");
    #xdjNQgE73amK2556 if $req→status = 200 then {
      #xIN4RsJUbP9qRWb2 $entry := data→pubs_container→get($req→argument);
      #etNLqwUXh9JYduFG if $entry→is_invalid then {
        #MAv4Se7Mfm9jwD54 $entry := web→json("{ \"code\": \"four oh four\" }");
      }
      #MjjCb6CDw23iaaXK $req→response := $entry;
    }
  }
  #Jy68GbIibIndjEmb code→add_route("GET", "admin", "rawblob", $handler2);
  #RsEcozYJu7k00AeT where handler2(req: * api_request) {
    #x7dnDVV3kcqSVT8N code→check_permission($req, "root");
    #aVRbNdEHEY7CxsWr if $req→status = 200 then {
      #Zl3aPr5olp7eeg6g $info := data→pubs_container→blob_container→get_blob_to_text($req→argument);
      #xrFP3kYk4G4F9afb if $info→succeded then {
        #byu5yKCNhe4pq5kC $req→response := $info→text→to_json;
      }
      else {
        #xwNiPz1w30vpX2XR $req→response := $info→error→to_json;
      }
    }
  }
  #pEtsD0erTgcHOwwJ code→add_route("GET", "admin", "rawcode", $handler2);
  #xicvXgaEmsPSaOLv where handler2(req: * api_request) {
    #myDthVu8Xuppaw0d code→check_permission($req, "root");
    #HXqRZIcd2VVffZG7 if $req→status = 200 then {
      #HFtTpuZZBBXlVVad $cd := $req→argument;
      #VCEBsBo7TUxO8xnD if $cd→count < 64 then {
        #vafh7SronVQp8BOR $cd := code→sha256($cd);
      }
      #vL0H9up4kuDb3JpK $entry := data→passcodes_container→get("code/" ∥ $cd);
      #XOF2ygg8lMBzDTVK if $entry→is_invalid then {
        #nL7KPxIJAbhe1bpp $entry := web→json("{ \"status\": \"four oh four\" }");
      }
      #HNl1l7U4j06eWHji $req→response := $entry;
    }
  }
  #MrQAgEteOOsLq2hT code→add_route("POST", "admin", "opcode", $handler2);
  #xpCkWmwkrbSgkXU7 where handler2(req: * api_request) {
    #zN2598yjkGssTgK2 code→check_permission($req, "root");
    #xGVg6y7LwJZis3t2 if $req→status = 200 then {
      #sBZktgftcX4gWPX7 $cd := $req→body→string("code");
      #ikj2QPkaQILnpuiY $entry := data→passcodes_container→get($cd);
      #mqoPAdhJ1KP6N4qr if $entry→is_invalid then {
        #xIx1L6SWUETaBm7j $entry := web→json("{ \"status\": \"four oh four\" }");
      }
      else { #jpCLGUUlyLyjQKLN if code→or_empty($req→body→string("op"))→equals("delete") then {
        #xOeFQ3X1D6N92tmR data→passcodes_container→update($cd, $update);
        #zbbYdZjSgD2x4dlO where update(entry: Json_Builder) {
          #rSDq0Fwj2apYmdlc foreach s4 in $entry→keys
          do {
            #f2LpSQU2rtdJWgwz $entry→remove_field($s4);
          }
          #xt8IVrFytGdCOwCJ $entry→set_string("kind", "reserved");
        }
      }
      else { } } 
      #q4yJa83eP0Jud4A1 $req→response := $entry;
    }
  }
  #lHjr25DiocIFaqt2 code→add_route("POST", "admin", "mbedint", $handler);
  #W7W1jBakn3bH2Puw where handler(req: * api_request) {
    #zrfE9N7VOJoIeGzq code→check_permission($req, "root");
    #SrJIyF74k12DBp0P if $req→status = 200 then {
      #EFqNlcDkKgYTFRgw $ccfg := records→compiler_config→create_from_json(data→settings_container→get("compile")→field($req→argument));
      #x4V3c4sDZY4L6vaI $jsb2 := $req→body→to_json_builder;
      #DFsf4fkVbVwYfac2 $response2 := code→mbedint_request($ccfg, $jsb2);
      #yrf4QDa0pTs88RKb $req→response := $response2→content_as_json;
    }
  }
  meta private;
  meta sync;
}
#RDhHtfqaDeUDWxqI
action \_init_progress() {
  #xCd9a46S69qrYcs2 code→add_route("POST", "*user", "progress", $handler2);
  #xb89lzVmy3pKnMM7 where handler2(req: * api_request) {
    #xXkys9ivi4ThuAVn code→me_only($req);
    #OFVTBfRWVTcjz4ce if $req→status = 200 then {
      #uaPrklox7VeMwvh0 $req→response := web→json("{}");
    }
  }
  meta private;
  meta sync;
}
#VpxZ0YOb7KHV1oyP meta import acs {
  pub "emcjc"
  usage {
    #BVGhpbmca
    table Options {
      type = "Object";
      exported = true;
      persistent = false;
      fields {
        #xl0KU07iiWY1B2Qy user_name : String
        #w4GpdOUxvSzmbq5B password : String
        #YEvTNf1x0k2jMxlS orgid : String
      }
    }
    #zbCVGRebOX2qelU5
    table Validation_Result {
      type = "Object";
      exported = true;
      persistent = false;
      fields {
        #M1nNBE7HNrrJ6ydM id : String
        #IXXaGRDJ8UgNXuF4 status : Number
        #xYl2o3WYpjkX3Bv1 info : Json_Object
      }
    }

    action `async` init(options\u003f: ♻ acs → Options)
    action `async` validate_picture(id: String, picture_url: String, callback_url: String) returns(job_id: String)
    action `async` details(job_id: String) returns(status_code: Number, res: String_Map)
    action `async` validate_text(id: String, text: String, callback_url: String) returns(job_id: String)
    action `sync` parse_results(payload: Json_Object) returns(results: Collection[ ♻ acs → Validation_Result])
    action `async` feedback(job_id: String, decision: String) returns(status_code: Number)
  }
}
#xU8FHgeFQ1OJbtUa
var acs_callback_token : String {
  transient = true;
}
#EsIGuNxvKj4wQ6a5
var acs_callback_url : String {
  transient = true;
}
#pXVOOeecpcM59ngg
action \_init_acs() {
  #xJCKcQDMMJ2M7EBe if false `and` code→has_setting("ACS_PASSWORD") then {
    #x11d3W1S0Q3rQwMi data→acs_callback_token := code→sha256(data→token_secret ∥ ":acs");
    #xORa2Vgh4Pwt2j45 data→acs_callback_url := data→@self ∥ "api/acscallback?token=" ∥ data→acs_callback_token ∥ "&anon_token=" ∥ web→encode_uri_component(data→basic_creds);
    #oTUJIZccSGaCCneh @\u267b→acs→init;
  }
  #taDSqkqVTK2rqGKQ code→add_route("POST", "acscallback", "", $handler2);
  #xhFwi0cCpv6tP26m where handler2(req: * api_request) {
    #G2omfhOYZMCQQ6lS if code→with_default($req→query_options→string("token"), "none")→equals(data→acs_callback_token) then {
      #ygvahASZaH6PNUc0 $jobid := code→or_empty($req→body→string("JobId"));
      #aedxTqiYeEKZumXs $results := $req→body→field("Results");
      #Vw58I2HvGIE03yPb foreach stat in $results
      do {
        #x5cF13DCvcwWGBDz if $stat→string("Status")→equals("3000") then {
          #J6UeOF09X1ZEy6mH $pubid := $stat→string("Id");
          #xAHQwFwfbFcWpQQ4 if $stat→boolean("Safe") then {
            #dcey1zB4Em65pA5y data→logger→debug("acsok: " ∥ $stat→format(2));
            #co57PkXbF24d4NrQ data→pubs_container→update($pubid, $update);
            #CXCwDn9xAw7qz3Cm where update(entry: Json_Builder) {
              #WojkXMxMB227qE4T $entry→set_string("acsJobId", $jobid);
            }
          }
          else {
            #TkTMq42glTW8GFDx data→logger→info("acsflag: " ∥ $stat→format(2));
            #PbhGIVQM45p42sih data→pubs_container→update($pubid, $update);
            #qVYaexm9hOdYrDG2 where update(entry: Json_Builder) {
              #XMbEvx01snIt4akz $entry→set_field("acsFlag", $stat);
              #GZHbYtJq9o6e8cYu $entry→set_string("acsJobId", $jobid);
            }
            #ROMYkJNMKe9ZmQqy code→refresh_settings;
            #ysM3nxRLIAPWw83h $uid := code→or_empty(data→the_service_settings→accounts→string("acsreport"));
            #pNDElIfQFUq7lMvp if `not` $uid→is_empty then {
              #DUdGhMnkDTa754Yi code→set_req_user_id($req, $uid);
              #jlrHq84Q1e8vian2 $req→root_pub := data→pubs_container→get($pubid);
              #x2UD19XvvOjRrsaV if code→is_good_entry($req→root_pub) then {
                #ObKjPjo2NhFGCX3j $jsb := web→create_json_builder;
                #sMaE35vji9mB8vrB $jsb→set_string("text", "ACS flagged, policy codes " ∥ $stat→field("PolicyCodes")→serialize);
                #khGxOEocPNpObaP2 $req→body := $jsb→to_json;
                #gYHGQbdFANFXnfSX $req→root_id := $pubid;
                #JEVYM424aXEsaJ2K code→post_abusereport($req);
              }
            }
          }
        }
        else {
          #DWAY6rfm8SWjFmcs data→logger→warning("bad results from ACS: " ∥ $req→body→format(2));
        }
      }
      #xAaDU24KH0MzvCzG $req→response := web→json("{}");
    }
    else {
      #ifIutzHS03XuNSB4 data→logger→debug("acs, wrong token: " ∥ $req→query_options→serialize);
      #CjGi8E2Ex3d1RP2f $req→status := @\u267b→restify→http→@402_Payment_Required;
    }
  }
  meta private;
}
#V2odcEDzZ1YLdJpn
action acs_validate_pub(#A0igmr897AhyXG7J jsb: Json_Builder) {
  #YA2HEHetWhZiYt8M if data→acs_callback_url→is_empty then {
    #fOsqXcWIeR0rs61H `return` ;
  }
  #i4vhUWcs9wRw1TKZ if false then {
    #rLIkAdPaBTSYNdIk // We get the jobid back in callback anyways; no point storing it.
    #Y9M5cE9m0A4AfwV4 data→pubs_container→update($jsb, $update);
    #BCDGoOs7nyoKqFNS where update(entry: Json_Builder) {
      #xlJ8gVGlTojFOxwp $entry→set_string("acsJobId", $job_id);
    }
  }
  meta private;
  meta sync;
}
#xFJNN1BpjhBS59TF
var kid_or_not\u002ehtml : String {
  is\_resource = true;
  url = "data:text/plain;base64,PHNjcmlwdD4KZnVuY3Rpb24gb25raWQoKSB7CiAgd2luZG93LmxvY2F0aW9uID0gc2V0dXJsKCImdGRfc3RhdGU9a2lkIikKfQpmdW5jdGlvbiBvbnRlYWNoZXIoKSB7CiAgd2luZG93LmxvY2F0aW9uID0gc2V0dXJsKCImdGRfc3RhdGU9dGVhY2hlciIpCn0KPC9zY3JpcHQ+CjxkaXYgc3R5bGU9J21hcmdpbjogMCBhdXRvOyB3aWR0aDogMzEwcHg7ICB0ZXh0LWFsaWduOiBjZW50ZXI7Jz4KPGgxIHN0eWxlPSdmb250LXNpemU6M2VtOyBmb250LXdlaWdodDpub3JtYWw7Jz5XaG8gYXJlIHdlIGRlYWxpbmcgd2l0aD88L2gxPgo8YSBocmVmPSIjIiBjbGFzcz0icHJvdmlkZXIiIG9uY2xpY2s9Im9ua2lkKCkiPkknbSBhIGtpZDwvYT48YnIvPgo8YSBocmVmPSIjIiBjbGFzcz0icHJvdmlkZXIiIG9uY2xpY2s9Im9udGVhY2hlcigpIj5JJ20gYW4gYWR1bHQ8L2E+PGJyLz4KPC9kaXY+Cg==";
  transient = true;
}
#sGcofgqRd9NQyDe2
var login_html : Json_Object {
  transient = true;
}
#J5Vfeu6VDfqceYee
action simple_pointer_cache(#VJbih2A9wR4xhdlu url_path: String, #bAE5EvuA4BujN35n lang: String) returns(#ncsKe8oi3VaWyxjN text: String) {
  #c4JdzaDOaD1uH0rL $version_marker := "simple3";
  #RLaWdKGAwrNFVtmS $url_path := $url_path ∥ data→template_suffix;
  #xEbKgsqp1jzUoP2u $id := code→path_to_ptr($url_path);
  #JCczsa4Stt6rNlay $path := "ptrcache/" ∥ data→my_channel ∥ "/" ∥ $id ∥ $lang;
  #q84Pwve2tSYKOewV $entry2 := data→cache_rewritten→get($path);
  #xKUEQOzzxn2qH7U8 if $entry2→is_invalid `or` `not` code→or_empty($entry2→string("version"))→equals($version_marker) then {
    #M4n8u0h4heGT6E4e $jsb2 := web→create_json_builder;
    #y06scK1y2k0Gl0mW $jsb2→set_string("version", $version_marker);
    #xOZvttFos6FAOoqw $r := code→get_template_text($url_path, $lang);
    #lPT6W4coIodPjH2z $jsb2→set_string("text", code→or_empty($r));
    #x65Ss21Lc4DzzUKf $entry2 := $jsb2→to_json;
    #jAmKGjyrmcL4utUC data→cache_rewritten→update($path, $update);
    #RUPbSu5FtakgAgN5 where update(entry: Json_Builder) {
      #RTe7SBNnoL3GMBuP code→copy_json($entry2, $entry);
    }
  }
  #Sfx8vmHiI8WjQ29a `return` code→or_empty($entry2→string("text"));
  meta private;
}
#oeXagRwpqbwwxJqX
action get_login_html(#q9fs27Kbp4f4nIlR inner: String, #ATfC6wlW1SUTnaGz lang: String) returns(#JZFAsR2fbPijH3IQ text2: String) {
  #pbgvTlcp7UO8hhVi $text := code→simple_pointer_cache("signin/" ∥ $inner, $lang);
  #IUywZp0wM3MDYaps if $text→count < 100 then {
    #ZYyXKJwA84AaJegV $text := data→login_html→string($inner);
  }
  #xGR7G4CsTHe2axp2 $text := $text→replace("@JS@", art→login\u002ejs);
  #xl4cUOCSysD3ZJ0M `return` $text;
  meta private;
}
#Ef2QHFEqopA2bO5h
var login\u002ejs : String {
  is\_resource = true;
  url = "data:text/plain;base64,ZnVuY3Rpb24gc2V0dXJsKHApIHsKICB2YXIgdXJsID0gd2luZG93LmxvY2F0aW9uLmhyZWYucmVwbGFjZSgvIy4qLywgIiIpLnJlcGxhY2UoL1wmdGRfKHVzZXJuYW1lfHBhc3N3b3JkfHN0YXRlKT1bXj8mXSovZywgIiIpCiAgd2luZG93LmxvY2F0aW9uLmhyZWYgPSB1cmwgKyBwCn0KCmZ1bmN0aW9uIHNldHN0YXRlKHMpIHsKICAgIHNldHVybCgiJnRkX3N0YXRlPSIgKyBlbmNvZGVVUklDb21wb25lbnQocykpCn0KCmZ1bmN0aW9uIGNoZWNrcmVhZHkoZikKewogICAgdmFyIHVzZXJpZCA9ICJAVVNFUklEQCI7CiAgICB2YXIgZG9uZSA9IGZhbHNlOwogICAgaWYgKHVzZXJpZCAmJiAhL15ALy50ZXN0KHVzZXJpZCkpIHsKICAgICAgICBzZXRJbnRlcnZhbChmdW5jdGlvbigpIHsKICAgICAgICAgICAgaWYgKGRvbmUpIHJldHVybgogICAgICAgICAgICAkLmdldCgiL2FwaS9yZWFkeS8iICsgdXNlcmlkKS50aGVuKGZ1bmN0aW9uKHIpIHsKICAgICAgICAgICAgICBpZiAociAmJiByLnJlYWR5KSB7CiAgICAgICAgICAgICAgICAgIGRvbmUgPSB0cnVlOwogICAgICAgICAgICAgICAgICBmKCk7CiAgICAgICAgICAgICAgfQogICAgICAgICAgICB9KQogICAgICAgIH0sIDIwMDApCiAgICB9IGVsc2UgewogICAgICAgIGYoKTsKICAgIH0KfQ==";
  transient = true;
}
#nz5bZ5ukGc4Q4mAm
action post_abusereport(#rZuGm3ANZnfCfzt9 req: * api_request) {
  #xxjeZxdU5cImd3bO $base_kind := $req→root_pub→string("kind");
  #LhVj2PHbQiz2i4JS if `not` code→can_have_abuse_report($base_kind) then {
    #ct3wn0NQrwDiLMw6 $req→status := @\u267b→restify→http→@412_Precondition_Failed;
  }
  else {
    #C2aAqC12WXFukGRE $report := records→pub_abusereport→create;
    #GRc3l6A6d03EYqnG $report→text := code→encrypt($req→body→string("text"), "ABUSE");
    #L11MhtHRl2bT76Kq $report→userplatform := code→get_user_platforms($req);
    #SJJ4rO09pBGwLnr5 $report→userid := $req→userid;
    #xBT5NuhgkmQd8hVt $report→time := code→now_seconds;
    #xc04rBzxpfpPpfRx $report→publicationid := $req→root_id;
    #nR4q30Zfb419mK2i $report→publicationkind := $base_kind;
    #hA1CfQv8hutbZY2e $pub := $req→root_pub→field("pub");
    #ZtCMaO4xRtz3M43K $report→publicationname := code→or_empty($pub→string("name"));
    #x2BzL8CSMdyz6j1y $report→publicationuserid := code→get_author($pub);
    #Z2shBj92TssbnMsV $jsb := web→create_json_builder;
    #poNFVk5AL1iWRZnN $jsb→set_field("pub", $report→to_json);
    #xd9jRwwpnK6oweTZ code→generate_id($jsb, 10);
    #SE9XxiZaku8hHhpx data→abuse_reports→insert($jsb);
    #wzQDYX9hO22UjNmV data→pubs_container→update($report→publicationid, $update);
    #ga4vyoCvO04wlNoX where update(entry: Json_Builder) {
      #WA62UoWXonO9sPi0 if code→or_empty($entry→string("abuseStatus"))→is_empty then {
        #CfwRGi2z3yvb5h0s $entry→set_string("abuseStatus", "active");
      }
      #X2pMuxx3wvJgCldQ $entry→set_string("abuseStatusPosted", "active");
    }
    #m1JREHKLuEirOF9V code→store_notifications($req, $jsb, "");
    #UT4SxtT63E7QIGib data→abuse_reports→return_one_pub($jsb→to_json, $req);
  }
  meta private;
}
#x7kBw2KawjCft4xf
action scan_and_search(#Ce2vbmq9keKLqpai obj: Json_Builder, #xoNy1TLACiUUT1RV options\u003f: * scan_and_search_options) {
  #a5KNxfLzoqs6ePCi if data→disable_search then {
    #mv5Q23cwYWPcgHLx $options\u003f→skip_search := true;
  }
  #CXtex4qYP3BTGhIW if data→acs_callback_url→is_empty `or` `not` code→can_have_abuse_report($obj→string("kind")) then {
    #xlsfp1vWcNoVZ4GZ $options\u003f→skip_scan := true;
  }
  #qMSKyN6TJT21NVCz if $options\u003f→skip_scan `and` $options\u003f→skip_search then {
    #xT32BaHJ24uh4FFm `return` ;
  }
  #iGPj7hbxrV4EZB6q data→logger→debug("inserting pub into search: " ∥ $obj→string("id"));
  #m2zq6bVsknd52dTK skip;
  #EmkNKolGCMA4J2AO $store := @\u267b→indexed_store→store_by_kind($obj→string("kind"));
  #nS3u6nDSTbZas4Dr $fetch_result := $store→single_fetch_result($obj→to_json);
  #zUo2r5e1EtkhTvtw records→store_decorator→at($store)→resolve→run($fetch_result, data→admin_request);
  #LdxoZKGGEx1rafw4 $pub := $fetch_result→items→at(0);
  #x3gTbsbXSl5SKwMC $body := code→or_empty(code→with_default($pub→string("text"), $obj→string("text")));
  #gfOnsKiixZMMerfj if $body→is_empty `and` $store→kind→equals("script") then {
    #xk5ChLrPYSipryT2 $entry2 := data→script_text→get($pub→string("id"));
    #f2k9D2FmCvyCG3mT if `not` $entry2→is_invalid then {
      #brXqLUJRnzFcz9sN $body := $entry2→string("text");
    }
  }
  #cB3dYNNEguRIzEjB if $store→kind→equals("pointer") then {
    #xwV2vdKO7ig5DzZK $scrid := code→or_empty($pub→string("scriptid"));
    #yxmySz3gNJXz49BR if `not` $scrid→is_empty then {
      #I7qs2HIDHIZ7HDzW $entry2 := data→script_text→get($scrid);
      #xw4fL9NraUXo7Wuj if `not` $entry2→is_invalid then {
        #oUDLDgWUhMBqT8RB $body := $entry2→string("text");
      }
    }
  }
  #sVeVtZ0yf49QH7OC // ## search
  #VAMT7Ik6vNnZX4ef if `not` $options\u003f→skip_search then {
    #x0OQkvlFhx9wZn44 $batch := @\u267b→tdlite_search→create_pubs_update;
    #x9rx7irr1OPA2ceL $entry := @\u267b→tdlite_search→to_pub_entry($pub, $body, code→pub_features($pub), 0);
    #x4jfe2zLeoFLsASL $entry→upsert_pub($batch);
    #jAh6YvhTy2uV2IvN `async` $batch→send;
  }
  #IopQeUojBNc3cL2t // ## scan
  #Qw1zPrE6qWnskvXz if `not` $options\u003f→skip_scan then {
    #C1V8lx6fqCiIUKu6 $text := $body;
    #xhB40w16eWfwJImp foreach fldname in "name\ndescription\nabout\ngrade\nschool" →split("\n")
    do {
      #yrREqauz62fsoDha $text := $text ∥ " " ∥ code→or_empty($pub→string($fldname));
    }
    #xx0lio4yei2BnUtA `async` @\u267b→acs→validate_text($pub→string("id"), $text, data→acs_callback_url);
    #v32YLCUUnep1iDCj $picurl := code→or_empty($pub→string("pictureurl"));
    #xuFiV8ZSjC6a8rC2 if `not` $picurl→is_empty then {
      #XyDkXi698NiQ7Bsd `async` @\u267b→acs→validate_picture($pub→string("id"), $picurl, data→acs_callback_url);
    }
  }
  meta private;
}
#s0r5ybEcCe0Z7Rv0
table scan_and_search_options {
  type = "Object";
  persistent = false;
  fields {
    #kRmhv80ubX7s4j24 skip_search : Boolean
    #MDaYN2Xf1wf4XoN3 skip_scan : Boolean
  }
}
#tKZuNmQGISqMvkQW
action get_author(#xvX9iW9Da6dsXbGM pub: Json_Object) returns(#iU521j0vUGElwI2A author2: String) {
  #x7IDBVwBGe95sm4t $author := $pub→string("userid");
  #xU9DCcyf2zCR74R8 if $pub→string("kind")→equals("user") then {
    #Sa8lurhU5El0wdwD $author := $pub→string("id");
  }
  #TQ47RFFcNOHJFMuD `return` $author;
  meta private;
  meta sync;
}
#mf6kj4y3jQZoKMpP
action can_have_abuse_report(#kComuUTVOYLW8sw3 base_kind: String) returns(#xMvPmtRAgwWdqxU4 can_abuse2: Boolean) {
  #b1Dzu1C8vfN3R2ZG $can_abuse := $base_kind→is_match_regex("^(art|comment|script|screenshot|channel|group|user)$");
  #CrxuW74yfSSY8oFk `return` $can_abuse;
  meta private;
  meta sync;
}
#xzD5a2ryvIax4qta
action set_html_headers(#a3Xt43dax6x4qjTs res: ♻ restify → Response) {
  #trALK9iS0TztDt2z $res→set_header("Cache-Control", "no-cache, no-store");
  #U5pAcDfL4QaXagRB $res→set_header("X-Frame-Options", "DENY");
  #EHGs5De4ZBUIw7Vu $res→set_header("X-XSS-Protection", "1");
  #kYrr1EaZ76SSAKhD $res→set_header("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  #niLj72nl9z0TLzG7 $res→set_header("X-Content-Type-Options", "nosniff");
  meta private;
  meta sync;
}
#rVTPehL52o72LfB6
var agree\u002ehtml : String {
  is\_resource = true;
  url = "data:text/plain;base64,PGRpdiBzdHlsZT0nbWFyZ2luOiAwIGF1dG87IHdpZHRoOiAzMTBweDsgIHRleHQtYWxpZ246IGNlbnRlcjsnPgo8aDEgc3R5bGU9J2ZvbnQtc2l6ZTozZW07IGZvbnQtd2VpZ2h0Om5vcm1hbDsnPkxlZ2FsIHN0dWZmPC9oMT4KPHA+QWdyZWUgdG8gdGVybXMgYW5kIGNvbmRpdGlvbnM/PC9wPgo8YSBocmVmPSJAQUdSRUVVUkxAIiBjbGFzcz0icHJvdmlkZXIiPkFncmVlPC9hPjxici8+CjwvZGl2Pgo=";
  transient = true;
}
#xUJYDK7S2WyhTjHn
action \_init_ticks() {
  #bw2B7VGM4plex2LC code→add_route("POST", "ticks", "", $handler5);
  #y7OrHrT8W255HPo0 where no_size_check := true;
  #x6IcVzfn5xEaYZgR where handler5(req: * api_request) {
    #JGkec6HW5WmbNHcw $js := $req→body→field("sessionEvents");
    #HAsPr6St0OgieCIE if `not` $js→is_invalid then {
      #xMgOI6dMSDphxTbc foreach ev_name in $js→keys
      do {
        #xXe2j04wCsEsNXqL if $ev_name→starts_with("browser.") then {
          #sx88aNIMTvv1aQ7f data→logger→tick($ev_name→replace("browser.", "NewWebApp@"));
        }
        else { #xZ6XWv4b6oQc4KG0 if $ev_name→is_match_regex("^(calcEdit|coreRun)(\\|.*)?$") then {
          #y7dUMZHkXJLf3VDd $jsb := web→create_json_builder;
          #xyppc6h4u9ZtXoGs $jsb→set_number("repeat", math→clamp(0, 100, $js→number($ev_name)));
          #qj2mTQaTG3uCNeO9 data→logger→custom_tick($ev_name→replace_regex("\\|.*", ""), $jsb→to_json);
        }
        else { } } 
      }
    }
    #jAgUu7E32Afuu2hp $req→response := web→json("{}");
  }
  meta private;
  meta sync;
}
#N6pAszgf7hv5NN5p meta import tdlite_docs {
  guid "7835a8d7-083a-44ef-c30e-d9ab6779c868"
  usage {

    action `async` format(templ: String, pubdata: Json_Builder) returns(expanded2: String)
    action `sync` init(expand_info: Action1[Json_Builder])
  }
}
#xkagyG3HVDvz6UL2
action two_digits(#qw31u4Y2nounK2tv p: Number) returns(#kqLUMV81e8hUM8kH r: String) {
  #hltONxjH6A0f2fk9 $s := "0" ∥ $p;
  #lW6gfQvEiCu4nXMV `return` $s→substring($s→count - 2, 2);
  meta private;
  meta sync;
}
#PLgPnZ3Y4kVH14Gq
action get_card_info(#uCft69Nm88ddMPSY req: * api_request, #RQxZ84Z5yB4L2pEU pub_json: Json_Object) returns(#kILOlq0B10eSSfrI jsb2: Json_Builder) {
  #xSTwnI2HG2VE1B3r $js3 := data→scripts→resolve_one_pub($pub_json, $req);
  #B6hjdDzYEHoDQTh3 if $js3→is_invalid then {
    #UgwPua4f0qbpjFIi `return` web→create_json_builder;
  }
  #JW364KroL2NFV4xS $scr := records→pub_script→create_from_json($js3);
  #ef46769cRIdkIiQN $jsb := $js3→to_json_builder;
  #m2s1C4CJtFd0lzjO $jsb→set_string("description", $scr→description→replace_regex("#docs", ""));
  #PhLh4CmAP9kW3HNZ $vimeo := $scr→@meta→string("vimeo");
  #hBW9BVrsZJyCjr9u if `not` $vimeo→is_invalid then {
    #xz0TIxcGRUG3LTPO // TODO use thumbnail cache
    #FeP8hNHFSkBa86L9 $js2 := web→download_json("https://vimeo.com/api/oembed.json?url=https%3A//vimeo.com/" ∥ $vimeo);
    #xQmd31lfQYgqK44d $jsb→set_string("vimeo", $vimeo);
    #KrmA5REQfXeChb2R $jsb→set_string("fullpicture", $js2→string("thumbnail_url"));
    #SirCrQ55PkB54P4Z $jsb→set_string("thumbnail", $js2→string("thumbnail_url")→replace_regex("_\\d+\\.", "_512."));
    #V2wwDAcMhyKmzyL9 if false then {
      #xyzqnY8zAMt7szAK $s2 := "<iframe src=\"https://player.vimeo.com/video/{vimeo}\" width=\"500\" height=\"281\" frameborder=\"0\" webkitallowfullscreen mozallowfullscreen allowfullscreen></iframe>" →replace("{vimeo}", $vimeo);
    }
  }
  #a5TdVeOT1umv43ZW $artid := code→or_empty($scr→@meta→string("art"));
  #vAO4bK4qi5QOdKql if `not` $artid→is_empty then {
    #x0zYj4nIes04NPTL $jsb→set_string("fullpicture", data→curr_client_config→primaryCdnUrl ∥ "/pub/" ∥ $artid);
    #RAFwAESGSxArVghU $jsb→set_string("thumbnail", data→curr_client_config→primaryCdnUrl ∥ "/thumb1/" ∥ $artid);
  }
  #GxWuvkme2Qkl4Az2 if $scr→editor→equals("blockly") then {
    #lKpVVA4tYsXfAbxd $jsb→copy_from(web→json("{ \n  \"editorname\": \"Block Editor\", \n  \"editor\": \"blocks\",\n  \"editorhtml\": \"Microsoft Block Editor\"\n}"));
  }
  else {
    #zNiQBfdBZe5qEjQ2 $jsb→copy_from(web→json("{ \n  \"editorname\": \"Touch Develop\", \n  \"editor\": \"touchdevelop\",\n  \"editorhtml\": \"Microsoft Touch Develop\"\n}"));
  }
  #EPgExLgMiW4NSSKd $jsb→set_number("timems", $scr→time * 1000);
  #xEwetA2EfBf2FecZ $jsb→set_string("realid", $scr→id);
  #A4CA0K6jbQHawOlk $dt := $jsb→time("timems");
  #B1mE7Sm5ofL75fbO $jsb→set_string("humantime", $dt→year ∥ "-" ∥ code→two_digits($dt→month) ∥ "-" ∥ code→two_digits($dt→day) ∥ " " ∥ code→two_digits($dt→hour) ∥ ":" ∥ code→two_digits($dt→minute));
  #OFYZ6J3oZaNIn5gd `return` $jsb;
  meta private;
}
#Rj4ubZD5k4zWTcMe
var deploy_channels : Collection[String] {
  transient = true;
}
#IGDTZbnoChQWD9CM
action encrypt(#olLl65482ClDwlKE val: String, #JRz9HBsQyxWff7ea keyid: String) returns(#x4MjLoVAEQNTXgsN s2: String) {
  #xnyGCBGKXpXR5nv0 if code→or_empty($val)→is_empty then {
    #SJpQYQNPWgQkXDE2 `return` $val;
  }
  #ypKhPD3AmncaMBIi $keyid := $keyid ∥ "0";
  #KclkOkyoOGUb04PO $key2 := code→prep_encryption_key($keyid);
  #U4FvdMheIAFSqfbS if $key2→is_invalid then {
    #sDdH3zOAv5VFOFZe $keyid := $keyid ∥ data→my_channel;
    #xYu2eEvGIc4ZkhnC $key2 := code→prep_encryption_key($keyid);
    #hwm4V8Utc8EHCqeb if $key2→is_invalid then {
      #xhq4U74xH2Wwoxr8 `return` $val;
    }
  }
  #xKYQcVI4MfiPugQq $iv := @\u267b→node_crypto→random_bytes(16);
  #qPv0UL1PyD34S6TO $iv_cipher := @\u267b→node_crypto→create_cipher_iv("aes256", $key2, $iv);
  #Z8wUHcxVzOLe4BzD $enciphered := $iv_cipher→update_cipher(bits→string_to_buffer($val, "utf8"));
  #Ka5UsWD5UlgvWBC2 $cipher_final := $iv_cipher→final;
  #cx5XaZgaGk1s4cv6 $s := $enciphered→concat($cipher_final)→to_string("base64");
  #xu99ijoRWjnCThSo `return` "EnC$" ∥ $keyid ∥ "$" ∥ $iv→to_string("base64") ∥ "$" ∥ $s;
  meta private;
  meta sync;
}
#J1XewG5stTG75K7B
action prep_encryption_key(#MuqrDNcbsRtaKAli keyid: String) returns(#HRf0MKYSwHcHexBF key3: Buffer) {
  #Mfqp4bG1frgwPj4m $key := code→or_empty(app→server_setting("ENCKEY_" ∥ $keyid, true));
  #omiMf7GMKf6rlWaV if $key→is_empty then {
    #WVnAuIPpXvfBrcNp `return` $key3;
  }
  #OkWr3lwWhcOQwuhq $hash := @\u267b→node_crypto→create_hash("sha256");
  #r4yiH0bFjWVpzGY7 $hash→update_hash_string($key);
  #mmSdXM3eXr9ops3y $key2 := $hash→digest_hash;
  #xb7PloOhZxw4hrup `return` $key2;
  meta private;
  meta sync;
}
#i4YpWtD0jU4MiYBZ
action decrypt(#xaM0U58nPfSRS4Yb val: String) returns(#n1O1NzqyQki1wjIY s2: String) {
  #Zjqaay0683ZBopgv if code→or_empty($val)→is_empty then {
    #Svm2riLemXpXOFHW `return` "";
  }
  #sHZWRJ1cHwYga28W $coll := $val→split("$");
  #T44Z2n8DDW0AV2gg if $coll→count = 4 `and` $coll→at(0)→equals("EnC") then {
    #ejLv1jnTbGP0kSVi $key2 := code→prep_encryption_key($coll→at(1));
    #xKRkLruSsxpKCVis if $key2→is_invalid then {
      #Kx5yOzJ2PyVXVtkY `return` $val;
    }
    #XsgGiVQ9UkAynL6l $iv := bits→string_to_buffer($coll→at(2), "base64");
    #erSZq2V2kQQRd4XU $iv_decipher := @\u267b→node_crypto→create_decipher_iv("aes256", $key2, $iv);
    #AC1K79Af9IFne8BQ $deciphered := $iv_decipher→update_decipher(bits→string_to_buffer($coll→at(3), "base64"));
    #x8zjWd7uiBBs5IuD $decipher_final := $iv_decipher→final_;
    #LEHzVdiB8uqlaMXL $buf := $deciphered→concat($decipher_final);
    #x4zGkVnYyRWnVfa4 app→javascript("local", "s2 = buf.toNodeBuffer().toString(\"utf8\")");
  }
  else {
    #ovCheZ4l4uwzd77R `return` $val;
  }
  meta private;
  meta sync;
}
#GZmjsTqBRaOtgwCc
var email_keyid : String {
  transient = true;
}
#j3x466EXySNpQw16
var full_TD : Boolean {
  transient = true;
}
#KEdh6sUKofjbj60U
action copy_deployment(#gYUWjYze7qpoW4o2 req: * api_request, #wPD6LAi9ch4V89Tb target: String) {
  #x4oMfnKVUXV6xmzK code→check_permission($req, "root");
  #znIlQK2Qi7MNNApI if $req→status = 200 then {
    #KqILGU1E5B0SRTmH $jsb2 := web→json(data→td_deployments→get_blob_to_text("000ch-" ∥ data→my_channel)→text)→to_json_builder;
    #LpX0J6fF2JbTb6cU $jsb2→set_string("did", @\u267b→cached_store→fresh_short_id(12));
    #xiuieufU944eU9ps $req→response := $jsb2→to_json;
    #xrnkukutisxeP22s $result := data→td_deployments→create_block_blob_from_text("000ch-" ∥ $target, $req→response→serialize);
    #kSPeaKYzCC5GOSig where contentType := "application/json;charset=utf8";
    #vxpCbaJ8a3pSI8Ik if `not` $result→succeded then {
      #fXANYT4xZZpaC47s $req→status := 400;
    }
  }
  meta private;
}
#eB8j4GlrJ1qfPW97
action check_mgmt_permission(#aAhdt9Iy3uc25FiX req: * api_request, #kIZwaBk6ZFBMXTII add_perm: String) {
  #Qxiq10oBW78TqCV2 if $req→status = 200 then {
    #TLAwpgn7Yn254mGc $perm := code→get_permission_level($req→root_pub) ∥ "," ∥ $add_perm;
    #PZZ4NGqpjyvcHVbU code→check_permission($req, $perm);
  }
  meta private;
  meta sync;
}
#RYP8opPbpQmNlfnu
action send_permission_notification(#mpyr7zh5KU4O13qR req: * api_request, #xzRWV7gsuyTxHrq8 r: Json_Builder) {
  #O688AgzzWMenF45v if code→is_alarming($r→string("permissions")) then {
    #P4bKD2NyJLpWjOv3 code→refresh_settings;
    #xCyiZZkCXoELr6p3 if `not` $r→contains_key("settings") then {
      #Tf404pqs1vU8B7gU $r→set_field("settings", web→json("{}"));
    }
    #PhlqA14W5s11euSE $name := code→with_default(code→decrypt($r→field("settings")→string("realname")), $r→field("pub")→string("name"));
    #BbyRJLWtAuEDH06L $subj := "[TDLite] permissions for " ∥ $name ∥ " set to " ∥ $r→string("permissions");
    #RAHXjiI9tZim74cR $body := "By code.";
    #FRiofOel7etwZFMl if `not` $req→userid→is_empty then {
      #xVF4nl9f54mvtWlp $entry2 := $req→userinfo→json;
      #JpI6mkSr4dXqHM2p $body := "Permissions set by: " ∥ $entry2→field("pub")→string("name") ∥ " " ∥ data→curr_client_config→shareUrl ∥ "/" ∥ $req→userid;
    }
    #MV4yRqOAdYC7XjFZ $body := $body ∥ "\n\nTarget user: " ∥ data→curr_client_config→shareUrl ∥ "/" ∥ $r→string("id");
    #VY3j14Og7RBNTPp6 @\u267b→parallel→for_json(data→the_service_settings→alarmingEmails, $@action);
    #kcjSZae377m0i6sd where @action(json: Json_Object) {
      #pmpZDBihV3WYKKkZ $email := $json→to_string;
      #VczEceIkFQfuBE2i @\u267b→sendgrid→send($email, "noreply@touchdevelop.com", $subj, $body);
    }
  }
  meta private;
}
#crv3tnIqnW3jZRxI meta import sendgrid {
  guid "602342ea-179e-4079-c3ca-bdc300713796"
  usage {
    #BdGhpbmca
    table Send_Options {
      type = "Object";
      exported = true;
      persistent = false;
      fields {
        #aFBxC4K20NsoCnPn html : String
        #b4JNNWO7shXISzI2 bcc : String
        #x76fHIAOq44bT20Y cc : String
        #ENyyKtvU4sTetP44 replyto : String
      }
    }

    action `async` init(api_user: String, api_key: String)
    action `async` send(to: String, from: String, subject: String, text: String, options\u003f: ♻ sendgrid → Send_Options)
  }
}
#Wt4NTfDEIGXDvIvA
var use_sendgrid : Boolean {
  transient = true;
}
#U1PrYQVSWc5MFba4
action apply_code(#ogmvMUG42Xcy5D4T userjson: Json_Object, #QF2IQepv84zt2lYe code_obj: Json_Object, #qeMpXpHJcuv5mzwU pass_id: String, #xB47dAq42kIqyCi3 audit_req: * api_request) {
  #xyF2l9CAThEiUkbL $userid := $userjson→string("id");
  #pX1Us92YTVcVEAed $credit := $code_obj→number("credit");
  #BkTrEVNDhsLm3aXF $single_credit := $code_obj→number("singlecredit");
  #GiCV6wrqDdem4ksJ if `not` $single_credit→is_invalid then {
    #BhGdwRRNbGS0XG2l $credit := math→min($credit, $single_credit);
  }
  #JJdEc0cpEKJ6WQMP $perm := code→with_default($code_obj→string("permissions"), "preview,");
  #SOR75FjUI2ooxz6t data→pubs_container→update($userid, $update4);
  #GMT1qgg2h6nU14W4 where update4(entry: Json_Builder) {
    #fddt0dTz47MjuRIl code→json_add($entry, "credit", $credit);
    #gM4Uzs5The04464V code→json_add($entry, "totalcredit", $credit);
    #N742hJ2gfgbdQayF if `not` code→has_permission($entry→to_json, $perm) then {
      #dzndfbVuVO5L1twl $existing := code→normalize_permissions(code→or_empty($entry→string("permissions")));
      #YyCR2JDffzCGYUGb $entry→set_string("permissions", $existing ∥ "," ∥ $perm);
    }
    #xxq4Tin2kWXsptjL if code→or_empty($entry→string("firstcode"))→is_empty then {
      #oq2OSEFQ2XyUXTzS $entry→set_string("firstcode", $pass_id);
    }
    #nJ2Q8Re9YgceANxc code→send_permission_notification(data→empty_request, $entry);
  }
  #f4nfeKIIpxUT1YYb data→passcodes_container→update($pass_id, $update5);
  #TFbx2vpDe4wh84RX where update5(entry: Json_Builder) {
    #PG5DSlljV53Iekvn $entry→set_number("credit", $entry→number("credit") - $credit);
  }
  #cqLBlOsL0xylXaZ6 code→audit_log($audit_req, "apply-code");
  #jlvhauPrYatkywk9 where userid := $code_obj→string("userid");
  #ZqMbxI1c0tE03Bv9 where subjectid := $userjson→string("id");
  #GPe37C7MaHfm7P6b where publicationid := $pass_id→replace_regex("^code/", "");
  #xUteytviV9diDzQ7 where publicationkind := "code";
  #Vzl59DWQZWLk0X2B where oldvalue := $code_obj;
  #xPN80Ht9yPXedbop foreach grpid in code→or_empty($code_obj→string("groups"))→split(",")
  do {
    #Oe1rBOYs5OmTJU1X if `not` $grpid→is_empty then {
      #WxjJ5aN54Lu9tqAR $grp := code→get_pub($grpid, "group");
      #oDrktjB75lN2JHLo if `not` $grp→is_invalid then {
        #x6EG0cH1ZTZYa1gS code→add_user_to_group($userid, $grp, $audit_req);
      }
    }
  }
  meta private;
}
#x7txUCBnSpMEIlky
action is_alarming(#YowQxOC1YHCMTyX1 perm: String) returns(#xBforS2sTCTOBiQg is_alarming2: Boolean) {
  #KVmfps1IA2Y2cYC5 $jsb := web→create_json_builder;
  #d0Fha5ouTKSzkEKL $jsb→set_string("permissions", "non-alarming");
  #z2JnnLNgXTBKyTTC $is_alarming := `not` code→has_permission($jsb→to_json, $perm);
  #hIJYo042752RtMfo `return` $is_alarming;
  meta private;
  meta sync;
}
#RJiNhoMsuOOh2Nk0
action encrypt_id(#GlohbrzplSl5zu1a val: String, #qIKGUdO7cdxS14xW keyid: String) returns(#CXW6YDgJ2pcrtA4r s2: String) {
  #kLlf40j1ZnbfKztm $key2 := code→prep_encryption_key($keyid);
  #arskp8NbqDoinWOO if $key2→is_invalid `or` code→or_empty($val)→is_empty then {
    #xbTk65ulY4uIyBYq `return` $val;
  }
  #GSqjOhkBOiP2uCpL $cipher := @\u267b→node_crypto→create_cipher("aes256", $key2);
  #c7NNDTecCxYaHIcU $enciphered := $cipher→update_cipher(bits→string_to_buffer($val, "utf8"));
  #AIGjV29rJgUbNLRn $cipher_final := $cipher→final;
  #Zj5FGmct67G7MP7K $s := $enciphered→concat($cipher_final)→to_string("hex");
  #FK2az9swNjkqDyon `return` $keyid ∥ "-" ∥ $s;
  meta private;
  meta sync;
}
#Sarnwn4AkKW4VOgS
action access_token_redirect(#xYJvaPUy2OI5MPlL res: ♻ restify → Response, #xHvBnrQXsQvG9c21 url2: String) {
  #x2BYYsbqXpHc4u03 $url3, $cook := code→strip_cookie($url2);
  #dolPX2456e5TG6tJ if `not` $cook→is_empty then {
    #zZnab6N6BkJhf19Z $res→set_header("Set-Cookie", $cook);
  }
  #AB5OvdUTjx14GVHw $res→redirect(303, $url3);
  meta private;
  meta sync;
}
#buh2SWWSrB4JBMt0
action wrap_access_token_cookie(#bnMoTopSmG4LIjUJ cookie: String) returns(#I2pNFzE4MuCQtLSi value2: String) {
  #k0T5RWYLDGS94Y7X $value := "TD_ACCESS_TOKEN2=" ∥ $cookie ∥ "; Secure; HttpOnly; Path=/; " ∥ "Domain=" ∥ data→@self→replace_regex("/$", "")→replace_regex(".*/", "") ∥ "; Expires=Fri, 31 Dec 9999 23:59:59 GMT";
  #CTZl0J8CBJ2BUsIN `return` $value;
  meta private;
  meta sync;
}
#daibqWgYrLG6o7VW
action strip_cookie(#GgONolyI0yarZkGt url2: String) returns(#dQcd4uGwzLKFHJLd url: String, #xv6gfAR5iH2Br3MJ cook: String) {
  #lICQesNJyOm2fu5I $coll := $url2→@match("&td_cookie=([\\w.]+)$");
  #xtu530MT4Z4UKUdf $cookie := $coll→at(1);
  #ladu1k75cEir4dZ2 $cook := "";
  #OADRsf9HbOkslA5j if `not` $cookie→is_invalid then {
    #g4l4gZ9dpNnDflIP $url2 := $url2→substring(0, $url2→count - $coll→at(0)→count);
    #l11hbSgQh6bEEKAQ $cook := code→wrap_access_token_cookie($cookie);
  }
  #LqpMC42HW7DVDr94 $url := $url2;
  meta private;
  meta sync;
}
#os4ZLb0iahGPwJfI
var admin_request : * api_request {
  transient = true;
}
#EvY9jQL22xR0o7yh
action resolve_one_pub(#LWcLZiK5mbixYP84 store: ♻ indexed_store → store, #chnEn8KvH4WPHaE2 obj: Json_Object, #xktnE9rj5043WUiC api_request: * api_request) returns(#K9nGcE8rydLMGjQg js: Json_Object) {
  #bNIIXV1z0u2cEkOA $fetch_result := $store→single_fetch_result($obj);
  #LtB720NTParCn4nY records→store_decorator→at($store)→resolve→run($fetch_result, $api_request);
  #Bn3e3J6MIZeTU1dQ $js := $fetch_result→items→at(0);
  meta private;
}
#dg7xKp6xE4v35m4F
action set_builder_if_missing(#T9c5Mtd7UvAa7c7V entry: Json_Builder, #xEumgG2aDn4Kyyn6 key: String) returns(#aqexV4HybBiFzWMg dictionary: Json_Builder) {
  #SXxHB4J4ZA7a101e $dict := $entry→field($key);
  #Y6rG6GHB4xGqfqEn if $dict→is_invalid then {
    #Rho1uQkW7D4OFa4f $dict := web→create_json_builder;
    #mjQtXb2T1ibPT12W $entry→set_builder($key, $dict);
  }
  #P0Ui8xCIiP7mFwF3 `return` $dict;
  meta private;
  meta sync;
}
#j3akhM4nJ6eueqS2
table apireq_user_info {
  type = "Object";
  persistent = false;
  fields {
    #FioDhHGfuyQsJh2L id : String
    #e2XNjoLlYAbSPlxW token : * token
    #xnyqu72tz24Tv9zl json : Json_Object
    #zXZSJaqyK6qzBRBK permission_cache : Json_Builder
    #uFVtHQyk2ZeoQD04 ip : String
  }
}
#xN3fwqWQkJxsSMrq
action set_req_user_id(#UFdC3irWqDYfRvX7 req: * api_request, #dhXJGeyHEQWAFPzq uid: String) {
  #ggU4qunvjc2FV2bA $userjs := code→get_pub($uid, "user");
  #Rzs5lVLT3GJj244V if $userjs→is_invalid then {
    #xiymqmBsGoyp2Pb4 $req→status := @\u267b→restify→http→@401_Unauthorized;
    #hWp1rP7NIezSz2u7 data→logger→info("accessing token for deleted user, " ∥ $uid);
  }
  else {
    #xnqScl6eaWqCOtx5 $req→userid := $uid;
    #hRBJSJfU1OaZ4fQg $req→userinfo→id := $uid;
    #PZZ7J640BoqqfrNu $req→userinfo→json := $userjs;
    #P4mz33H4c0kCh5DW data→logger→set_context_user($uid);
  }
  meta private;
}
#oJpY7smVKkKN332A
action caller_is_facilitator_of(#SBiOFY4roldIccmk req: * api_request, #YBJwnQkBXs1RhZGV subject_json: Json_Object) returns(#Ji3M2a6iLcOi7bR1 is_facilitator: Boolean) {
  #ZhzQuwlP9oVJkVgl if $req→equals(data→admin_request) then {
    #OAyt4z4CEBITqMr2 `return` true;
  }
  #xUbxyikEU2XxBmEi if $req→userid→is_empty `or` $subject_json→is_invalid then {
    #xhOz1i2oW7vGIUAy `return` false;
  }
  #OC0rbtqvKgmmaoz3 $caller_json := $req→userinfo→json;
  #Zv4GxxbU7vi0Glcp if code→has_permission($caller_json, "any-facilitator") then {
    #SicourtpnioYrNA1 `return` true;
  }
  #pjJIcfN25dvqA9jD if `not` code→has_permission($caller_json, "adult") `or` code→has_permission($subject_json, "adult") then {
    #VgfRkEh4qFlEeaxM `return` false;
  }
  #H6yCAw6PWJPlpctL $owngrps := $caller_json→field("owngroups");
  #HZvUGu9JvZMgGVyx foreach grpid in $subject_json→field("groups")→keys
  do {
    #xervsjlLgXMCxh9l if $owngrps→contains_key($grpid) then {
      #KRELWidjdfS338W5 `return` true;
    }
  }
  #Zfv1UXJNpsjCiCmD `return` false;
  meta private;
  meta sync;
}
#hbWIk7lGvGDwnRG2
action caller_shares_group_with(#T63cIhhWZySfNl2I req: * api_request, #B2QZAQBnL0NTAr3A subject_json: Json_Object) returns(#A24LRmXEv9YkIxdv is_facilitator: Boolean) {
  #RwmMhkSZlz4m45bL if $req→equals(data→admin_request) then {
    #gS4T2BzivzlowWwB `return` true;
  }
  #x0A5kIqhiPu9mtvv if $req→userid→is_empty `or` $subject_json→is_invalid then {
    #gc70g2AYcQYdq0OQ `return` false;
  }
  #xFZj1EjKtugCtmtx $caller_json := $req→userinfo→json;
  #xYtrSa7O02g2Ps1s if code→has_permission($caller_json, "any-facilitator") then {
    #KmZBhMHQTXSBRj16 `return` true;
  }
  #vGzBZ2cq2veab4IP $caller_grps := $caller_json→field("groups");
  #Pl4JNnuns7wMop3o foreach grpid in $subject_json→field("groups")→keys
  do {
    #uYbJD0T52QnN4XOj if $caller_grps→contains_key($grpid) then {
      #YEThF7GWpxOqbzbY `return` true;
    }
  }
  #VZeOO0BcSblbNcHv `return` false;
  meta private;
  meta sync;
}
#fSIjUV4wzuoKpkdv
action unsafe_to_json(#IjGbrOHUj4AeZFOf jsb: Json_Builder) returns(#TRLyboVIb66bHSye js: Json_Object) {
  #QnRoR3LOR3L7n4Q3 app→javascript("local", "if (jsb)\n  js = lib.JsonObject.wrap(jsb.value())");
  meta private;
  meta sync;
}
#xVV2KkcqtQxPYQx0
action is_abuse_safe(#w4WsnUk8okYHQkOe elt: Json_Object) returns(#xFockFJZg4gwIFdN b2: Boolean) {
  #cQ35c3S87zm1kAf6 $b := `not` code→or_empty($elt→string("abuseStatus"))→equals("active");
  #YgYcLH1DBqRJalT7 `return` $b;
  meta private;
  meta sync;
}
#v6yhZcI5E2DzE9NO
action caller_has_permission(#s4277CDSXYAo43yh req: * api_request, #xBH442TFd8QZOSu8 perm: String) returns(#Ckdlm0QHboVR2IJE has_perm: Boolean) {
  #KlUtwBhwg4XYh4YN if $req→equals(data→admin_request) then {
    #xsu2r3VHWIaSe3HT `return` true;
  }
  #WemiKQKMvpB6ziXG if $req→userid→is_empty then {
    #LCnlnuP4F2dnKSoC `return` false;
  }
  #bfh22h252C65WQU9 `return` code→has_permission($req→userinfo→json, $perm);
  meta private;
  meta sync;
}
#xumXnbH2BPWZGqiJ
table service_settings {
  type = "Object";
  persistent = false;
  fields {
    #qktSibSbpsDwdF4O paths : Json_Object
    #wLOT93UhDuUNZHaA emailFrom : String
    #j2lcNbjhLAV9V2v8 accounts : Json_Object
    #WGljoy4aOTVWdyzg alarmingEmails : Json_Object
    #xQaVaOAZjA5NI5nk termsversion : String
    #zUaV5fsNc9KhWABS blockedNicknameRx : String
    #XDz7Q5e7AyFYEMJt tokenExpiration : Number
    #Hicv9zRzRopkR1kG defaultLang : String
    #WULw1ZnAmZXaexIe langs : Json_Object
    #ZaNwJtmvDF8cKmLJ envrewrite : Json_Object
  }
}
#ud4bBFP9MbSyoJ2E
var the_service_settings : * service_settings {
  transient = true;
}
#ch8SG9bmXg7c0IRN
action handle_email_verification(#xdyldPVlvzEgqB1c req: ♻ restify → Request, #brZMUk0ypM21jLLN res: ♻ restify → Response) {
  #uDJwwRs4EssBXX7Z $coll := $req→url→@match("^/verify/([a-z]+)/([a-z]+)");
  #bodAlHCJUu2sevKG $user_js := code→get_pub($coll→at(1), "user");
  #xOWPVhr3gYRMVE3d $msg := "";
  #xuNV4BnGdxQwEFWv if $user_js→is_invalid then {
    #WckS4BMt93xrFphs $msg := "Cannot verify email - no such user.";
  }
  else { #keukx12oEla21Jfq if `not` code→or_empty($user_js→string("emailcode"))→equals($coll→at(2)) then {
    #xqUdyGMQ4V1DOz0w $msg := "Cannot verify email - invalid or expired code.";
  }
  else {
    #TJEaC9YKPAYvem9i $msg := "Thank you, your email was updated.";
    #DHLqVxaEdCzuSYdP data→pubs_container→update($user_js→string("id"), $update2);
    #G4zJt3iHeLzV96IQ where update2(entry: Json_Builder) {
      #MipYox8p0gLfbqiT $jsb := $entry→field("settings");
      #xI4sfHYms9Bi7b34 $jsb→set_boolean("emailverified", true);
      #NQUDuzKjGt7eaOA9 $jsb→set_string("previousemail", "");
      #HqUoJZV0lUNjNnPq $entry→set_string("emailcode", "");
    }
  }
  } 
  #kCzYq1EnMDkDCRf6 $res→send_text($msg, "text/plain");
  meta private;
}
#f49gziVxiQFi42wU
var audit_container : ♻ cached_store → container {
  transient = true;
}
#TjzQ7OHsQIVTl2HG
var audit_store : ♻ indexed_store → store {
  transient = true;
}
#XK3zDw5lwK3h0Eqm
action \_init_audit() {
  #mF03CDRDRFWJTsj7 $audit_table_client := code→spec_table_client("AUDIT_BLOB");
  #PSpa1HSftBWR5I9m $audit_blob_service := @\u267b→azure_blob_storage→create_blob_service;
  #U5OO4GJT8c4fOZww where storage_account := app→server_setting("AUDIT_BLOB_ACCOUNT", false);
  #x2iLa4ceHeJwqhcP where storage_access_key := app→server_setting("AUDIT_BLOB_KEY", false);
  #xmWOFyMuL2MOh9tR data→audit_container := @\u267b→cached_store→create_container("audit");
  #S86fTUvmRF4C2HdS where blob_service := $audit_blob_service;
  #epkL8Ruo80d8Ft58 data→audit_store := @\u267b→indexed_store→create_store(data→audit_container, "auditlog");
  #PuVZm3ruLAOpfRSr where table_client := $audit_table_client;
  #a8tR6VMFuMwTeo30 $store := data→audit_store;
  #xGvn2ZMXAKD5ez0J records→store_decorator→at($store)→resolve→\u25c8set($t);
  #N08wxgLma2zhmQN4 where t(fetch_result: ♻ indexed_store → fetch_result, api_request: * api_request) {
    #s3p9cWIEsvLMcPkM code→check_permission($api_request, "audit");
    #DjtPmcn2bdVqkIbo if $api_request→status = 200 then {
      #NpDUFG75MC48Yg8k $coll := create→Collection_of→\u2339pub_audit_log;
      #UiKqYvfIdnVvs689 foreach jsb in $fetch_result→items
      do {
        #EMD2V0Pl6a0sKZlp $msg := records→pub_audit_log→create_from_json($jsb→field("pub"));
        #r9GXui9IEmpoB2t4 $msg→ip := code→decrypt($msg→ip);
        #xs8qYE8yJjtq1C1g $coll→add($msg);
      }
      #NGHB1YkB3cWhH7JT $fetch_result→items := $coll→to_json;
    }
    else {
      #hG8JYn3zgHw22Gj0 $fetch_result→items := web→json("[]");
    }
  }
  #hT17wH3qLkfILvno $store→create_index("all", `fun:entry` "all");
  #UpufnttP0KVtc9dY code→add_route("GET", "audit", "", $handler);
  #uP1EccpclTvpyjrB where handler(req: * api_request) {
    #xebC1CzO22Mk3Gy4 code→check_permission($req, "audit");
    #KSFr9t5H6gEsiFvn if $req→status = 200 then {
      #r3wOSo65wzJy5jXw $store→any_list($req, "all", "all");
    }
  }
  #uTpaXSwAtDJlhfOm code→audit_index("userid");
  #Urj1kE79j7FB7XFu code→audit_index("publicationid");
  #y5z1R6mGFxl0FZeN code→audit_index("subjectid");
  #d1C87Q4ju5wd4evn code→audit_index("type");
  meta private;
}
#x6DGupt5SsDscNML
action encrypt_json(#hqPMhxbC2LJd4Qvx js: Json_Object, #x4aYxEJVUDKgX5SO keyid: String) returns(#ExsUcQJ2ix3EI3hP js2: Json_Object) {
  #aySoj4egWDLdGqBd if `not` $js→is_invalid then {
    #DyOBsvzWsSpME4bC $js := code→encrypt($js→serialize, $keyid)→to_json;
  }
  #wN1O12YrWnPxQqIa `return` $js;
  meta private;
  meta sync;
}
#WK95DgkGHnWoCwLM
action audit_delete_value(#v1Dl7VIpU4vi2CGW js: Json_Object) returns(#Ev8OG1cP3vesnvmG oldval2: Json_Object) {
  #zSsnYE6qrKmADPJu if $js→string("kind")→equals("script") then {
    #QkZabbb1vxUDko2z $entry2 := data→script_text→get($js→string("id"));
    #xqZpQsRXRELPGT81 $jsb2 := $js→to_json_builder;
    #pY0hqlWpouRk8mVI $jsb2→set_string("text", code→encrypt($entry2→string("text"), "AUDIT"));
    #xS48mZN8fJJ2CmK0 $js := $jsb2→to_json;
  }
  #xOiSa27dH5dcoQoE `return` $js;
  meta private;
}
#xG8oz5PfY5aRrfUZ
action build_audit_api_request(#qJWEiS4catUMXjUQ req: ♻ restify → Request) returns(#gm5QNY1Up323Z8uu api_req2: * api_request) {
  #xWrvxNtu03j2pVNY $api_req := code→build_api_request("/api");
  #AQfllANLWXruIlMD $api_req→userinfo→ip := $req→remote_ip;
  #Y5GosMDQXrSBsJiO `return` $api_req;
  meta private;
  meta sync;
}
#Lcm7tVyDPu6FA4gv
action audit_index(#rAjkdRRJCvHj8HRU field: String) {
  #bOyoZXjs7e8QzB2u $store := data→audit_store;
  #k9514qRz2qgQkQxY $store→create_index($field, `fun:entry` $entry→field("pub")→string($field));
  #G4QrINGtdJKLZEDr code→add_route("GET", "audit", $field, $handler);
  #MrnrVg0LVYXIPHJJ where handler(req: * api_request) {
    #McofBf0lb4CR4pPW code→check_permission($req, "audit");
    #xfzTKElrSf5PeMnN if $req→status = 200 then {
      #CvjcowH8BuKMdJ2t $store→any_list($req, $field, $req→argument);
    }
  }
  meta private;
}
#fMttS5lb27LNZEVN
action can_see_rootpub_script(#uA7AXTjAJ7jgFuMX req: * api_request) returns(#c4KNGMTri2m4BE3U see_it2: Boolean) {
  #Ix8HF2Z8vQIczGWx if code→has_permission($req→userinfo→json, "global-list") then {
    #oUJrPxXyYsgTW4Rz `return` true;
  }
  #D8pVMBqnQR1j2Gd7 $scr := records→pub_script→create_from_json($req→root_pub→field("pub"));
  #LxatLI4CsY6F7Onl if `not` code→or_false($scr→unmoderated) `or` $scr→userid→equals($req→userid) then {
    #xVGq1Fv9rlStju2r `return` true;
  }
  else {
    #Z7D4mNOebklqY5ST $entry4 := code→get_pub($scr→userid, "user");
    #k2Zi5Z41k5pP7eMZ `return` code→caller_shares_group_with($req, $entry4);
  }
  meta private;
}
#HK4UlhaPoxJ3MX0e
action delete_history(#xl9G76SpOVKdDfdr req: * api_request, #rCCyV3u4Xao4SJaF guid: String) {
  #CUuKvqZVp145wJDZ $result := data→install_slots_table→get_entity($req→root_id, $guid);
  #V0PJEVXziwsMrhBT if $result→is_invalid then {
    #CUPKkfALe0qsT3kY `return` ;
  }
  #A2pzRkd925vagp5m $entity := @\u267b→azure_table→create_entity($req→root_id, $guid);
  #nEhc2246bJC43X74 $entity→set_string("guid", $guid);
  #BiTj8uE44pX9GFxG $entity→set_string("status", "deleted");
  #Kp1vd7Ba9Itr8xiV data→install_slots_table→insert_entity($entity→to_json, "or replace");
  #ls6ai2W2fyo8L1QM skip;
  #Szho6i9tpVbSDeKF $ws_container := code→workspace_for_user($req→root_id);
  #bfVg0Eitxtlbqz2n $scriptGuid := $req→root_id ∥ "." ∥ $guid;
  #xmFFPHSIXAWZCCC3 $res_query := data→history_table→create_query→partition_key_is($scriptGuid);
  #CjryYsz5AOgCOb4i @\u267b→parallel→for_json($res_query→fetch_all, $@action);
  #l2t4Y3QIbFZr5s4O where @action(json: Json_Object) {
    #x0CWygSR62ddMGeu data→history_table→delete_entity($json);
    #UXlyid1TKCi7vOk6 $ws_container→blob_container→delete_blob($json→string("historyid"));
  }
  meta private;
}
#SupVh3oPGB61OLQm
action send_notification(#GcK4pDVxAkgZTqv4 about: Json_Object, #KvQRqdxDU2TM7eIq notkind: String, #ERs3cY3HBH2dVJcu suplemental: Json_Object) {
  #xldJ00Mja4ndTgnJ $notification := records→pub_notification→create;
  #xhDyZMbaj2A08xNr $notification→kind := "notification";
  #cBzw8vv5eE12sHQU $notification→id := @\u267b→cached_store→inv_seq_id→to_string;
  #eq4Jr61KOiYXtn6a $pub := $about→field("pub");
  #uLEWe922yCyoXE6n $notification→time := $pub→number("time");
  #W7ACqlhCSzUu2PBF $notification→publicationid := $pub→string("id");
  #xUlRuu4RfXttwPDw $notification→publicationkind := $pub→string("kind");
  #uBEE17441kChEenP $notification→publicationname := code→or_empty($pub→string("name"));
  #cpDggPCCvl2NGbq3 $notification→userid := $pub→string("userid");
  #atcRW03AxVttrzkG if $notkind→equals("groupapproved") then {
    #YB7k9Ey5F3twxvyq $notification→userid := $suplemental→string("id");
  }
  #xU2KpfQpG5Mqj6Am $notification→notificationkind := $notkind;
  #CqsGkI39MTbJrXDA if `not` $suplemental→is_invalid then {
    #q6a9LwZhKYQYFu6j $notification→supplementalid := $suplemental→string("id");
    #xiFkLVydYK4FLefK $notification→supplementalkind := $suplemental→string("kind");
    #NmBarji47mHBpM21 $notification→supplementalname := $suplemental→field("pub")→string("name");
  }
  #XPhhOUOS4TTWZ3o4 $target := $notification→userid;
  #xQ2jCj6Kz00upBkP $jsb2 := $notification→to_json→to_json_builder;
  #H9eeU4H4lBx8tTSf $jsb2→set_string("PartitionKey", $target);
  #ghqB5i01IjmVo3D2 $jsb2→set_string("RowKey", $notification→id);
  #QnkNOZwW4AX44sH9 data→notifications_table→insert_entity($jsb2→to_json, "or merge");
  #zVT08shg1U3cw53h data→pubs_container→update($target, $update);
  #uKKTnMLq2e3sQSGa where update(entry: Json_Builder) {
    #HVu9SSqCIo4blB9F code→json_add($entry, "notifications", 1);
  }
  #SNVhmpo2jhVZNstj code→poke_sub_channel("notifications:" ∥ $target);
  #MSUJPWI86MkfPqrf code→poke_sub_channel("installed:" ∥ $target);
  meta private;
}
#cIh6SO2Fz7nF9lps meta import nodemailer {
  guid "3e71b12e-1fc2-45d2-7f70-c91c245ad389"
  usage {
    #BdGhpbmca
    table Send_Options {
      type = "Object";
      exported = true;
      persistent = false;
      fields {
        #aFBxC4K20NsoCnPn html : String
        #b4JNNWO7shXISzI2 bcc : String
        #x76fHIAOq44bT20Y cc : String
        #ENyyKtvU4sTetP44 replyto : String
      }
    }

    action `async` init()
    action `async` send(to: String, from: String, subject: String, text: String, options\u003f: ♻ nodemailer → Send_Options)
  }
}
#ICDicGsdQ8ZcRuQb meta import mbedworkshop_compiler {
  pub "skhza"
  usage {
    #BVGhpbmca
    table Options {
      type = "Object";
      exported = true;
      persistent = false;
      fields {
        // Password associated to the account
        #KexhiZxwlTQViwU6 apikey : String
        // Service end point
        #BXsSiATo8zQvXQqK apiurl : String
        #x4opC46262RpzsPi github_api_key : String
      }
    }
    #ds5iqVcSJP5lnc6z
    table Compilation_Request {
      type = "Object";
      exported = true;
      persistent = false;
      fields {
        #vsyQAt0B3YXPSrxp clearcache : Boolean
        #Xe661SqIEx2Pzq28 repo : String
        #HSH1TrC6niIJ40OP target : String
        #xqy5qMxEx7Hwffjr replace_files : String_Map
        #qK9RGw0OE5PoyAPz task_id : String
        #ZIeWvYMQUPF2e0Lw target_binary : String
      }
    }
    #xxf5ydBoZL54ErUR
    table Compilation_Result {
      type = "Object";
      exported = true;
      persistent = false;
      fields {
        #O06YzGQCoPao4Mox payload : Json_Object
        #l46XBq6wXQg5aaek completed : Boolean
        #OKsKosOpROPiX5Sc success : Boolean
        #sovutSJGRvMrrxl4 binary : String
        #Jzz4eUpYHD2n6t3u time_taken : Number
      }
    }

    action `sync` create_compilation(target: String, repo: String, target_binary: String) returns(request: ♻ mbedworkshop_compiler → Compilation_Request)
    action `sync` init(options\u003f: ♻ mbedworkshop_compiler → Options)
    action `async` start(request: ♻ mbedworkshop_compiler → Compilation_Request) returns(success: Boolean)
    action `async` download(task: ♻ mbedworkshop_compiler → Compilation_Result, request2: ♻ mbedworkshop_compiler → Compilation_Request) returns(bytes: Buffer)
    action `async` example()
    action `async` status(compilation: ♻ mbedworkshop_compiler → Compilation_Request, block: Boolean) returns(result: ♻ mbedworkshop_compiler → Compilation_Result)
    action `sync` set_verbosity(level: String)
  }
}
#gzjR9OXXtrlZAU6K
action \_init_vimeo() {
  #xEUFGNVFQWS8MZcj data→video_store := @\u267b→indexed_store→create_store(data→pubs_container, "video");
  #diK8e2jZ0H4rQcSt data→video_store→set_resolve($resolution_callback3);
  #X47a3oHImJNUGEql where resolution_callback3(fetch_result: ♻ indexed_store → fetch_result, api_request: * api_request) {
    #Mt376TZaYuWud2fD $coll := create→Collection_of→\u2339pub_video;
    #aF25LgerZORYrvez foreach js in $fetch_result→items
    do {
      #xuCdCe8OwYAVaqGY $vid := records→pub_video→create_from_json($js→field("pub"));
      #PQS82y5GPWjZ7NTI $vid→sdvideourl := data→curr_client_config→primaryCdnUrl ∥ "/cachevideo/" ∥ $vid→blobid ∥ "-sd";
      #wgQtFGJKvYjnYhB4 $vid→thumb128url := data→curr_client_config→primaryCdnUrl ∥ "/cachevideo/" ∥ $vid→blobid ∥ "-thumb128";
      #M9frqDOMOTfNe7f6 $vid→thumb512url := data→curr_client_config→primaryCdnUrl ∥ "/cachevideo/" ∥ $vid→blobid ∥ "-thumb512";
      #quDWieX2LERCJGZ5 $coll→add($vid);
    }
    #oHsYsRaO4h49zj21 $fetch_result→items := $coll→to_json;
  }
  #EnJLdVNyILrS3ZMk code→add_route("DELETE", "*video", "", $handler);
  #Kw2SZzUdC2OXutcD where handler(req: * api_request) {
    #L3h2JxT4zC3L5yiJ code→check_permission($req, "root-ptr");
    #TopDM1UwIjxMKL7t if $req→status = 200 then {
      #q04B4jCXsGG2DxM4 $delok := code→delete($req→root_pub);
      #DPG07q8FDnhJD4Zy $req→response := web→json("{}");
    }
  }
  #xvaoOeovxkP2081z @\u267b→restify→server→get("/vimeo/:id/:endpoint", $@then);
  #Gvl2ynlma6vsvoj2 where @then(req: ♻ restify → Request, res: ♻ restify → Response) {
    #rp9SixQ18LYlOrtQ $referer := code→or_empty($req→header("referer"))→to_lower_case;
    #hus14G1NMgym2TZ2 if $referer→is_empty `or` $referer→starts_with(data→@self) `or` $referer→starts_with("http://localhost:") then {
      #gJ5tDfW0bnI48YH2 // ok, referer checked
    }
    else {
      #x42BjGJN7FDPYbAE $res→send_custom_error(@\u267b→restify→http→@402_Payment_Required, "Bad referer");
      #Hc6gj6595eyB4GsH `return` ;
    }
    #ISjjICsPbodvY9pR $id := $req→param("id");
    #GbLQBnTrOa6SGoCg if `not` $id→is_match_regex("^\\d+$") then {
      #JtjwvFl00HJVT5Xa $res→send_error(@\u267b→restify→http→@400_Bad_Request, "Bad ID");
      #argCDxi274vSaexz `return` ;
    }
    #ALK2Jk5QXUmqi20U $endpoint := $req→param("endpoint");
    #mK1iEzKJNa6MArpQ if `not` $endpoint→is_match_regex("^(sd|thumb512|thumb128)$") then {
      #XAxthNLdyGAK0CtH $res→send_error(@\u267b→restify→http→@404_Not_Found, "Bad endpoint");
      #Mx2nzzKHuLDKPV4Y `return` ;
    }
    #CmyXoBE7a3JVYHTV $entry := code→get_pub("vimeo-" ∥ $id, "video");
    #IyIjM3JXMyWjYtzm if $entry→is_invalid then {
      #x74p46i1Q1nKCyB1 $drop := code→throttle_core(code→sha256($req→remote_ip) ∥ ":video", 10);
      #DNNn0LrGVK9xx00V if $drop then {
        #G5sK83UodVEnnvo2 $res→send_error(@\u267b→restify→http→@429_Too_Many_Requests, "Too many video reqs");
        #l5J9JMUU94242NsY `return` ;
      }
      #xcy3NvuWZHrix4Mg $request := web→create_request("https://api.vimeo.com/videos/" ∥ web→encode_uri_component($id));
      #PjHO2GD2oYIoMMgV $request→set_header("Authorization", "Bearer " ∥ app→server_setting("VIMEO_API_TOKEN", false));
      #fB6wtszFHW8eXHln $response := $request→send;
      #ysr1xEZLqPkMv0sO if $response→status_code ≠ 200 then {
        #xEVryiwPf4Vfgdbt $res→send_custom_error(@\u267b→restify→http→@424_Failed_Dependency, "No such vimeo video?");
        #ze3ZrfW7mWNAGbti data→logger→info("failed vimeo download: " ∥ $response ∥ ": " ∥ $response→content);
        #fQl21XamMkZmWz49 `return` ;
      }
      #xG2b4gl9SoKt9IBB $vimeo_payload := $response→content_as_json;
      #NYGpw2bh6O4ApJcd if `not` $vimeo_payload→field("user")→string("uri")→equals("/users/" ∥ app→server_setting("VIMEO_USER", false)) then {
        #xLOF32dn6FAPUCRl $res→send_error(@\u267b→restify→http→@402_Payment_Required, "Invalid video user");
        #qngMGNJTnf2hCR0k `return` ;
      }
      #qSD40GsCYcaCiWih $pub_video := records→pub_video→create;
      #W46mClsb5VW8UZ4e $pub_video→blobid := @\u267b→azure_blob_storage→create_random_id(20)→to_lower_case;
      #h8o2TwH8bqDBZGAb $pub_video→provider := "vimeo";
      #iq0nRXAPR5SkWnko $pub_video→providerid := $id;
      #xEeq3n1ylq6G3Gpe if false then {
        #EVixAEIiFh7m8b86 $pub_video→time := $vimeo_payload→string("modified_time");
      }
      #EMRP4uTxLXmrm7Aw $thumburl := $vimeo_payload→field("pictures")→field("sizes")→at(0)→string("link");
      #IznXALQBSZ0MYIQG $sd_desc := $vimeo_payload→field("download")→to_collection→@where( `fun:elt` $elt→string("quality")→equals("sd"))→at(0);
      #xqy6bXb9KVXavf2L if $sd_desc→number("size") > 4 * 1024 * 1024 then {
        #Ue9er32Lo5aGTXDY $res→send_error(@\u267b→restify→http→@413_Request_Entity_Too_Large, "Video too large");
        #xhK0X2boAzfApblr `return` ;
      }
      #xqxdPtA9vI7ncMbF $request2 := web→create_request($sd_desc→string("link"));
      #I0NykxIAlFiakJpT $response2 := $request2→send;
      #xW22wDTXA0v3rQMV contract→assert($response2→status_code = 302, "Bad status from vimeo: " ∥ $response2);
      #QQeKK2iLHGAPC4sB $vidurl := $response2→header("Location");
      #oYVT9ikpc2VDdBJu $task := `async` data→video_container→create_block_blob_from_url($pub_video→blobid ∥ "-thumb512", $thumburl→replace_regex("_[\\dx]+\\.jpg", "_512.jpg"));
      #iaWNFFmeDXaKxzZz $task2 := `async` data→video_container→create_block_blob_from_url($pub_video→blobid ∥ "-thumb128", $thumburl→replace_regex("_[\\dx]+\\.jpg", "_128.jpg"));
      #lDzEKX6O8rPzUGAA $task3 := `async` data→video_container→create_block_blob_from_url($pub_video→blobid ∥ "-sd", $vidurl);
      #x6NQhIfzfDGkvrZe $jsb2 := web→create_json_builder;
      #W2ULebwxiyaeq69e $jsb2→set_field("pub", $pub_video→to_json);
      #wvSZ1odp1zExVUbA $jsb2→set_string("id", "vimeo-" ∥ $id);
      #pmHvPqxKf4nUKwLJ $jsb2→set_string("thumburl", $thumburl);
      #QZSf44F2GS0k7Bo3 $Blob_Info := $task→await;
      #ZzJbiyvT36pUEgYP $Blob_Info := $task2→await;
      #RejT62UGuX6aQwHq $Blob_Info := $task3→await;
      #N7RTiXeuj400u66U data→video_store→insert($jsb2);
      #VsqCDjX74z802d8l $entry := $jsb2→to_json;
    }
    #I2WSwQSRECRebX15 $blobid := $entry→field("pub")→string("blobid");
    #DLlD82HKH4toio82 $res→set_header("Access-Control-Allow-Origin", "*");
    #i9ZwpcSLyMFKuQaf $res→redirect(@\u267b→restify→http→@302_Moved_Temporarily, data→curr_client_config→primaryCdnUrl ∥ "/cachevideo/" ∥ $blobid ∥ "-" ∥ $endpoint);
  }
  meta private;
}
#GjShdkylbTZCfsSD
var video_container : ♻ azure_blob_storage → Container {
  transient = true;
}
#wUUmKw1AlCxAI8BG
table pub_video {
  type = "Object";
  persistent = false;
  fields {
    #xASYjsuAxXOzxues kind : String
    #BrepAOnuHAjPCcsR time : Number
    #OnfCeYC80OuNos87 id : String
    #yvKzWSstMxl29jzX provider : String
    #aq2lYC2B2mY0822g providerid : String
    #xqHmbiuysXPe7JAs blobid : String
    #hFVJ2lXy4vK4Pb7O sdvideourl : String
    #LOTLA4ownp0uqHv8 thumb512url : String
    #solJRZZxbnMwSDxZ thumb128url : String
  }
}
#xszvNh4bFoDENt82
var video_store : ♻ indexed_store → store {
  transient = true;
}
#RBCbxzxzD5faAP53
action get_permission_level(#e1tZN6yGzvTpmZRI userjs: Json_Object) returns(#DMDMHqxFUew33xiv lastperm2: String) {
  #xwafQvwRopnvkcf0 $lastperm := "level0";
  #ypxnoX3fKwPfVWI4 for 0 ≤ i < 7 do {
    #xOoLI5h8ikH2YIyI if code→has_permission($userjs, "level" ∥ $i) then {
      #n9gHZ8RsDCWmAYnC $lastperm := "level" ∥ $i;
    }
    else {
      #aF4dCnVU83DuFcL4 `break` ;
    }
  }
  #jLl5pn0Cdvh1WQMe `return` $lastperm;
  meta private;
  meta sync;
}
#hL6JqeBPydshG80v meta import microsoft_translator {
  pub "xufj"
  usage {

    action `async` authenticate() returns(authenticated: Boolean)
    action `async` translate(text: String, from: String, to: String, html: Boolean) returns(translated: String)
    action `async` init(client_id: String, client_secret: String)
  }
}
#ognqALYGrfttmJ4a
action \_init_runtime() {
  #CTRdf1pYEAK56bZL code→add_route("POST", "runtime", "translate", $handler);
  #HW4dj0X2h8hDy9CX where handler(req: * api_request) {
    #FxELWGRVdb2ytl4Y // TODO figure out the right permission here and throttle
    #MHwFnKbTZMRMHau3 code→check_permission($req, "root-ptr");
    #xx22CVLorulxy2Mr if $req→status ≠ 200 then {
      #JN9KclNPYfMPb8AU `return` ;
    }
    #g2gOl5eiuRqrVTmt $text := code→or_empty($req→body→string("html"));
    #xGSk8JlsFYYFvAa5 $ishtml := true;
    #IpR9SOMaamRuIWv9 if $text→is_empty then {
      #m5v1JJ3rG3SQQIMa $text := code→or_empty($req→body→string("text"));
      #EADVrDkX2z3hE2T9 $ishtml := false;
    }
    #Z1ykPSAf2JvtxrbQ $jsb := web→create_json_builder;
    #ujdX2z032uBPRzTa if $text→is_empty then {
      #hQxoZ9INEJzPVCaA $jsb→set_string("translated", "");
    }
    else {
      #xcb6GJx2jFSXZPHt $translated := @\u267b→microsoft_translator→translate($text, code→or_empty($req→body→string("from")), code→or_empty($req→body→string("to")), $ishtml);
      #acPr5aHOPV4RB0Rt if $translated→is_invalid then {
        #xXMaD2q79Ot54D2n $req→status := @\u267b→restify→http→@424_Failed_Dependency;
      }
      else {
        #qWeisXpsXfpgYL6q $jsb→set_string("translated", $translated);
      }
    }
    #aUXZiHsmUz2p3q2A $req→response := $jsb→to_json;
  }
  meta private;
  meta sync;
}
#xe4B75M6pP5Bhslo
action handle_language(#lxvXVNJRkoFhT7ZK req: ♻ restify → Request, #cTPWeG6JYtchJ5SZ res: ♻ restify → Response, #PRBNOr3o5F8J2aHl set_cookie: Boolean) returns(#WaHUP0vvlV0qqgoL lang2: String) {
  #I7bKjAzaMxVLIfX3 code→refresh_settings;
  #h7TLkOal51nHgO26 $lang := data→the_service_settings→defaultLang;
  #QJE7lrRY4FNFdgyW foreach s in code→or_empty($req→header("Accept-Language"))→split(",")
  do {
    #xxD122Ix94ktgCZJ $header_lang := code→or_empty($s→@match("^\\s*([a-z][a-z])")→at(1));
    #m6o1PIqkSoVVJdAn if data→the_service_settings→langs→contains_key($header_lang) then {
      #OXFkY5r44YmX1mzZ $lang := $header_lang;
      #u6kB5HBuOBthQ8KQ `break` ;
    }
  }
  #x2kJ4reVFFKcHRW4 $cookie_lang := code→or_empty(code→or_empty($req→header("Cookie"))→@match("TD_LANG=([a-z][a-z])")→at(1));
  #qqEo5Kp2jiBBAZQk if data→the_service_settings→langs→contains_key($cookie_lang) then {
    #smw4JFEu4V0VWFkT $lang := $cookie_lang;
  }
  else {
    #xCgVKg2gXt02hitH // Cookie conflicts with access token cookie
    #AXz43o3mTPU0c5IF if false then {
      #xeUke2x9TdPUs0K3 if $set_cookie then {
        #Vv2oMqwvmweqhg9Y $value := "TD_LANG=" ∥ $lang ∥ "; Secure; Path=/; " ∥ "Domain=" ∥ data→@self→replace_regex("/$", "")→replace_regex(".*/", "") ∥ "; Expires=Fri, 31 Dec 9999 23:59:59 GMT";
        #UyU2aWqn2HVMnTSM $res→set_header("Set-Cookie", $value);
      }
    }
  }
  #LGPrHSc605aCIZra if $lang→equals(data→the_service_settings→defaultLang) then {
    #jjygXHF04B1HjQm1 $lang := "";
  }
  else {
    #ZJRLFZpMu6Qb7e2m $lang := "@" ∥ $lang;
  }
  #s7ECQ4QHHSjkVy6C `return` $lang;
  meta private;
}
#xRHd8cULRp4UhHk3
action has_ptr_permission(#Jizu2B7RPPH7HonA req: * api_request, #y8jjzg7MZgvL44ya currptr: String) returns(#EgGtPwGQtyzRE4mi b2: Boolean) {
  #kqEfEmVGm0c2pW4B $currptr := $currptr→replace_regex("@..$", "");
  #XSa4iJtLEEWbK7jF while `not` $currptr→is_empty do {
    #xqIbgZWRsYFij2cC if code→caller_has_permission($req, "write-" ∥ $currptr) then {
      #Q9zsBOngX4qS29bh `return` true;
    }
    else {
      #xs1Mq4KbrXOulYgR $newptr := $currptr→replace_regex("-[^\\-]*$", "");
      #JY7MkhtJpK2n2LZx if $newptr→equals($currptr) then {
        #xeu7oKAg47Mre29B `return` false;
      }
      else {
        #l2PjY9Gp6CSCJN2X $currptr := $newptr;
      }
    }
  }
  #L4ESty6xVzTcN9JA `return` false;
  meta private;
  meta sync;
}
#AZqMSpsdzbvFJxAI
action mbedws_download(#xb0u29X6luVnIVcE sha: String, #Pyg22LzDZVXJrgZh compile: ♻ mbedworkshop_compiler → Compilation_Request, #o7yFX6lHnGxNWoYm ccfg: * compiler_config) {
  #xHLHh4Z7yJzFR7qz data→logger→new_context;
  #i1F8FrA2i2WK4Ydg $task := $compile→status(true);
  #iJjN7czhG1SfBEDu // TODO: mbed seems to need a second call
  #u2BdvkoTeLVxr2lL time→sleep(1);
  #IYzoHzjizmjNw2h2 $task := $compile→status(false);
  #tqZjDEvdIVtYwxpO $st := records→compile_status→create;
  #VIKKMeghKjI49NzP data→logger→measure("MbedWsCompileTime", data→logger→context_duration);
  #Xf1Uj9Ll5gYQ4tPT $st→success := $task→success;
  #yBkNuuEG4E1BNx2W // Just in case...
  #lQ5x0X1GvL6p2H47 $s := $task→payload→serialize→replace_regex("\\w+@github.com", "[...]@github.com");
  #pWhdR4od72fx8YQ6 $st→mbedresponse := web→json($s)→to_json_builder;
  #x4cnG7yg4KNq7RSA if $task→success then {
    #abpyFdVNwdJUFfXK $bytes := $task→download($compile);
    #xl0HOU2b8VPFy1eT if $bytes→count = 0 then {
      #cbQvaeoeyo62sJlb $st→success := false;
      #eKjL7OiTNg4uLiP4 data→logger→tick("MbedEmptyDownload");
    }
    else {
      #xbfBUhY3tbb64l8e $st→hexurl := data→compile_container→url ∥ "/" ∥ $sha ∥ "/" ∥ $ccfg→hexfilename;
      #pCm374n8KG0NleJS $result := data→compile_container→create_gzipped_block_blob_from_buffer($sha ∥ "/" ∥ $ccfg→hexfilename, $bytes);
      #Rwu6F8xhZ2TJSch4 where contentType := $ccfg→hexcontenttype;
      #xN6WRwJiBeZAq0cm data→logger→tick("MbedHexCreated");
    }
  }
  #C29gTO56H49Z6b8N $result2 := data→compile_container→create_block_blob_from_text($sha ∥ ".json", $st→to_json→serialize);
  #qAXsjt0zOLONANoc where contentType := "application/json; charset=utf-8";
  meta private;
}
#Si89oLdTxqKVM2MD
action mbedint_download(#jo3bKVsc2s4xpRLg sha: String, #LoSTtD5QsJQZpyBu jsb2: Json_Builder, #ZfNvJrHE22k4lUIX ccfg: * compiler_config) {
  #hFNPHWYFAUvAAfZS data→logger→new_context;
  #WkWT9Z0ysBJcFCw4 $jsb2→set_string("hexfile", "source/" ∥ $ccfg→target\_binary);
  #s4bT9aFc2vzMBVZp $jsb2→set_string("target", $ccfg→platform);
  #x9q2NswRw1kf5XcO $response := code→mbedint_request($ccfg, $jsb2);
  #xsTp3OFJqd0jGtZ0 $resp_json := $response→content_as_json;
  #dMvcy6P04T7jzSey $st := records→compile_status→create;
  #gtdyWCYNqspsvOUl data→logger→measure("MbedIntCompileTime", data→logger→context_duration);
  #JZ4gx6TLkk6ZYiYf // Just in case...
  #wDz9snVOfTf67Itd if $response→status_code ≠ 200 `or` $resp_json→is_invalid then {
    #PcVX2shX9bWJL3zc code→set_mbedresponse($st, "Code: " ∥ $response→status_code);
  }
  else {
    #UgWHAPUzVWgPxm9o $hexfile := $resp_json→string("hexfile");
    #x4iv6HR9RO1crY2B $msg := code→or_empty($resp_json→string("stderr")) ∥ code→or_empty($resp_json→string("stdout"));
    #q89lvRyylI4wBfy1 if $hexfile→is_invalid then {
      #bKuFVMXyQHRtMqzj code→set_mbedresponse($st, code→with_default($msg, "no hex"));
    }
    else {
      #frKygh8JFcWyKkLN $st→success := true;
      #cOkbiCfYgdjGO0ub $st→hexurl := data→compile_container→url ∥ "/" ∥ $sha ∥ "/" ∥ $ccfg→hexfilename;
      #FuBOUM4qodVoSBxF $result := data→compile_container→create_gzipped_block_blob_from_buffer($sha ∥ "/" ∥ $ccfg→hexfilename, bits→string_to_buffer($hexfile, "utf8"));
      #esd2WjDS1OWyrzLN where contentType := $ccfg→hexcontenttype;
      #jdGLRVqNUI2BpLjR data→logger→tick("MbedHexCreated");
    }
  }
  #xMiDai1cFZaRHMQR $result2 := data→compile_container→create_block_blob_from_text($sha ∥ ".json", $st→to_json→serialize);
  #HRmBDmldDbuE9eg3 where contentType := "application/json; charset=utf-8";
  meta private;
}
#gjb5sIJDDbIOLO4e
action set_mbedresponse(#UeAmkT42S9GPbyHS st: * compile_status, #NbJzdyXBgbIZKaRr msg: String) {
  #qDZD1tIvRA2S7bgU $jsb := web→json("{ \"result\": {} }")→to_json_builder;
  #x06P84LtAphNQn6z $jsb→field("result")→set_string("exception", $msg);
  #FbA1wguZw1qG3dCE $st→mbedresponse := $jsb;
  meta private;
  meta sync;
}
#x7fIbRyZBrYd1tew
action mbedint_request(#xwM8pzFzn2bMzh8L ccfg: * compiler_config, #Jh4vFB1wzjg6sjEV jsb2: Json_Builder) returns(#i4Q2oieDsggUhDVi response2: Web_Response) {
  #ER7xlMXTnv7y7VvI $jsb2→set_string("requestId", @\u267b→azure_table→create_random_id(128));
  #x2xrc4RIAo4vKACm $request := web→create_request($ccfg→internalUrl);
  #t0OAP1NGJa414nWP $iv := @\u267b→node_crypto→random_bytes(16);
  #SLuD44azHEbHvhez $key := bits→string_to_buffer(app→server_setting("MBEDINT_KEY", false), "hex");
  #K9Rd5EPDkG0fwc6h $cipher := @\u267b→node_crypto→create_cipher_iv("aes256", $key, $iv);
  #orx6FPq6878yvi47 $request→set_header("x-iv", $iv→to_string("hex"));
  #gT9uH7tnUZXRzf1r $enciphered := $cipher→update_cipher(bits→string_to_buffer($jsb2→serialize, "utf8"));
  #xHjNQRmP1CUdsRaf $cipher_final := $cipher→final;
  #j5iQXv32hmmmE2Qj $request→set_content_as_buffer($enciphered→concat($cipher_final));
  #rFfaCOJz0OV4N2n2 $request→set_method("post");
  #XoqjYOvJ46xxjcrr $response := $request→send;
  #x4kb7NCq2FtWeKNU $buf := $response→content_as_buffer;
  #xVIPgD8O4afRt359 $inpiv := $response→header("x-iv");
  #F6nQdkuS9eQqx0Wk if $response→status_code = 200 then {
    #C1FexCXgFbFMRz2F app→javascript("local", "var ciph = require(\'crypto\').createDecipheriv(\"AES256\", key.toNodeBuffer(), new Buffer(inpiv, \"hex\"));\nvar dat = ciph.update(buf.toNodeBuffer(), null, \"utf8\") + ciph.final(\"utf8\");\nresponse._content = dat;\n");
  }
  #xvOQG6zS5Xf448aK `return` $response;
  meta private;
}
#G3GYBxVEBVcVpthr
var promos_table : ♻ azure_table → @table {
  transient = true;
}
#HZNtrunE5Kiu4ZCW
action \_init_promo() {
  #mYd4p65mdLJbqsmU data→promos_table := data→table_client→create_table_if_not_exists("promos");
  #xC5pAbRcEICXwNW5 data→scripts→create_custom_index("promo", data→promos_table);
  #xRAGeIZ55Q4xOzCf code→add_route("GET", "promo-scripts", "*", $handler7);
  #GGET377WsblftWkS where cache_key := "promo";
  #pmLl0CbsxaAP2vn4 where handler7(req: * api_request) {
    #hqzE6tugErrLOMQH code→any_list(data→scripts, $req, "promo", $req→verb);
  }
  #mp39f9DsHHZNSctV code→add_route("GET", "promo", "config", $handler8);
  #xCelyRiXBbTSQc2o where handler8(req: * api_request) {
    #XJaXEqLcNnwmfQbZ code→check_permission($req, "script-promo");
    #TGrtWLdHVnodkmp2 if $req→status ≠ 200 then {
      #pm6p1nkS48ew5tH0 `return` ;
    }
    #qTay2n2hu7yj9nbN $req→response := data→settings_container→get("promo");
  }
  #Q6zD84dlyUCqxY9F code→add_route("GET", "*script", "promo", $handler5);
  #x1WsHDGfRl42ZrFv where handler5(req: * api_request) {
    #gF3zWmWbpKCpxpbO code→check_permission($req, "script-promo");
    #Jba508ljrgWYIj42 if $req→status ≠ 200 then {
      #mr3vM4ia2R8cZJBV `return` ;
    }
    #TsShV04zp8Zrplm2 $req→response := code→get_promo($req);
  }
  #Q7WgrFaFp7k1hjU1 code→add_route("POST", "*script", "promo", $handler5);
  #c1zMuMKMbEfOIbdS where handler5(req: * api_request) {
    #xZBMmqr6i6AfhgVl code→check_permission($req, "script-promo");
    #UfvvUq2YQRrJDLQy if $req→status ≠ 200 then {
      #atyxI5C8soWgTBIF `return` ;
    }
    #p2K554HkHdRWOWMJ $promo := code→get_promo($req);
    #OgSXx3GJn2LhTCWl $old_promo_id := code→or_empty($req→root_pub→string("promoId"));
    #MHxBpq7932mQl72A if `not` $old_promo_id→is_empty then {
      #nPJq9x3SxGFj372l @\u267b→parallel→for_json($promo→field("tags"), $@action);
      #VuAtv3cL4alk4KTO where @action(json: Json_Object) {
        #s4gZjrGFQITYOCpN $entity := @\u267b→azure_table→create_entity($json→to_string, $old_promo_id);
        #c7L3PHFwIyLfxuSV $ok := data→promos_table→try_delete_entity($entity→to_json);
      }
    }
    #tFggLqBshfarFB4G $jsb2 := $promo→to_json_builder;
    #DRQPDNdWr7dL1WSf $jsb2→copy_from($req→body);
    #zktWb2psyF7E8jgo $coll := create→Collection_of→String;
    #L4yXex8VnDMal5Wb $new_tags := $jsb2→field("tags");
    #TCNXz3SGUBGHkJ5D if $new_tags→count > 0 then {
      #x9MmdiJuIOarZscB $d := collections→create_string_map;
      #xCPXQXoJcX1MLD1i foreach jsb3 in $new_tags
      do {
        #QpseZq8DXYJsOqdq $d→set_at($jsb3→to_string, "1");
      }
      #B8KZIP0AhSgyAIcA $d→set_at("all", "1");
      #e3mnWV90eShRU4Jb if false then {
        #xmk5IyGl1D3IFbpX $pub_script := records→pub_script→create_from_json($req→root_pub→field("pub"));
        #huqaOSpth05k13R2 $coll→add($pub_script→editor);
        #al4Tkijek7gCZUPc $d→set_at(code→with_default($pub_script→editor, "touchdevelop"), "1");
        #BgzpkoJG8s3mmf0Y if $pub_script→description→contains("#docs") then {
          #ks7rBvk4r3uJb8eY $d→set_at("docs", "1");
        }
      }
      #Q9odQYUhO9uIenFU $jsb2→set_field("tags", $d→keys→to_json);
    }
    #AocySAA2PWlRLkm6 $promo := $jsb2→to_json;
    #S0OxnLbRL96CEBcv $offset_hours := math→round(math→clamp( - 200000, 200000, code→or_zero($promo→number("priority"))));
    #PsXp6Cul9azLr2hE $newtime := math→round($req→root_pub→field("pub")→number("time") + $offset_hours * 3600);
    #XrCaZ9vOlRrUxdMo $new_id := (10000000000 - $newtime) ∥ "." ∥ $req→root_id;
    #zATz42hO3a33OBMS data→pubs_container→update($req→root_id, $update3);
    #W8QfpnJGH5SwnDGC where update3(entry: Json_Builder) {
      #kf7ks2PZRBh8UJni $entry→set_field("promo", $promo);
      #nrXI3rJfoRddG4G8 $entry→set_string("promoId", $new_id);
    }
    #t3wcYJ4kG944nRg0 $js := $promo→field("tags");
    #x47rPUf5w8DxGCLv if code→json_array_index_of($js, "hidden") > 0 then {
      #z7svhdzT5Rt9neNp $js := web→json("[\"hidden\"]");
    }
    else { #H2D21Gv1mesSGN4x if code→json_array_index_of($js, "preview") > 0 then {
      #x7s534yvdcCPGZWT $js := web→json("[\"preview\"]");
    }
    else { } } 
    #xE4ZCvwrZLrOA00P @\u267b→parallel→for_json($js, $@action);
    #gyq7cm2v51sD7uuQ where @action(json: Json_Object) {
      #gjtJQhm4rQQ94Nql $entity := @\u267b→azure_table→create_entity($json→to_string, $new_id);
      #xI4JCz2elsCAL4v6 $entity→set_string("pub", $req→root_id);
      #f41IbqYyLNA7hX42 data→promos_table→insert_entity($entity→to_json, "or merge");
    }
    #oYVLr42Zpg9UD5hr code→flush_api_cache("promo");
    #NDYm23W1wKpGuTds $req→response := $promo;
  }
  meta private;
}
#wx2ukRkuyE2vLVix
action reindex_groups(#cMg9BSUJYuXwxsc6 json: Json_Object) {
  #xPi9Wr4cMN1hW4U1 $userid := $json→string("id");
  #e9221W4JbOhsLXTb $groups := code→get_user\'s_groups($userid);
  #xdtKXEIfAHFO8glo $grps := web→create_json_builder;
  #SuvfCEJdA4gku5aM $owngrps := web→create_json_builder;
  #liD23dVzSRGyQJ40 foreach js in $groups
  do {
    #nEjJ3Es4v82SuziC $grp := records→pub_group→create_from_json($js→field("pub"));
    #Vluy60rQZjHeNiOp if $grp→isclass then {
      #mSgmX4pTQSvlbDvd $grps→set_number($grp→id, 1);
      #zhNiEf451kVPeR4V if $grp→userid→equals($userid) then {
        #xnMBmPF4sMoowDr8 $owngrps→set_number($grp→id, 1);
      }
    }
  }
  #xjkT0pyX4cCc1HFT data→pubs_container→update($userid, $update7);
  #nHY41MRmBHA2cPQS where update7(entry: Json_Builder) {
    #nPV9DtXd7nwhc4WM $entry→set_builder("groups", $grps);
    #u3bBUCTYmfTBr3bC $entry→set_builder("owngroups", $owngrps);
  }
  #BwjuY4qTAzBZJxyK data→logger→debug("reindex grps: " ∥ $userid ∥ " -> " ∥ $grps→serialize);
  meta private;
}
#KJctGtFtLMJmQ2qz
var cached_api_container : ♻ cached_store → container {
  transient = true;
}
#ynsLaC4cLqq6oNN2
action handled_by_cache(#x1kbR7FdnOEOoTQT api_request: * api_request) returns(#RyPvP4j52W9k3U5Z handled: Boolean) {
  #xy2ANvfgpjJYNUoL $entry := data→cached_api_container→get($api_request→orig_url);
  #GhC7kNRvXfuhDIxz if $entry→is_invalid then {
    #xyKad4Yg0RuYEmNi `return` false;
  }
  #sCmqKTkdM61khkzZ $keyname := code→or_empty($entry→string("cachekey"));
  #HbfOIsfMbfpb6RzR if $keyname→is_empty then {
    #XyxqIHtp1PXSgbqJ `return` false;
  }
  #xjh1yi6tegSmKHjK $key := data→cached_api_container→get("@" ∥ $keyname);
  #a42oehoUbZFTedli if $key→is_invalid `or` `not` $key→string("value")→equals($entry→string("cachekeyvalue")) then {
    #xyobU48Sg62KfdSJ `return` false;
  }
  #r7tvjrnWOIFMW26V $api_request→response := $entry→field("response");
  #NWmAfoGDix54VmEk $api_request→status := $entry→number("status");
  #hPN1q4f4yPmwcvFD `return` true;
  meta private;
}
#RB4n4GN0j04Y276P
action store_cache(#xxIJFKTsRdjdJEiG api_request: * api_request) {
  #N0uHO1TOzYkNozur if `not` $api_request→method→equals("GET") then {
    #xWUWAa8yGSQ7gGUc $api_request→status := @\u267b→restify→http→@405_Method_Not_Allowed;
    #aBzP2wrlBT0yQS86 `return` ;
  }
  #SWQpo43kXe9T27K9 code→throttle($api_request, "apireq", 10);
  #oSPb5XXC1t8msntH if $api_request→status = @\u267b→restify→http→@429_Too_Many_Requests then {
    #x0OtftbmNf2uHAWj `return` ;
  }
  #KwpW0Up4oqw9dXyc // 
  #xvdw7QHQZqCc2gss code→perform_single_request($api_request);
  #xQl0ptWt1mUaib4b // 
  #M05H4zjNXOFcOw2n $thekey := $api_request→route→options→cache_key;
  #Z6H2ETNQDAOaPPw2 if $thekey→is_empty then {
    #wsx7N7Rp5evmV69k $api_request→status := @\u267b→restify→http→@404_Not_Found;
    #qovLum2SKXJ2w2oX `return` ;
  }
  #xL2bfRjSKQxFpBze $jsb := web→create_json_builder;
  #T6KxF7gJCufMO7Vl $verkey := data→cached_api_container→get("@" ∥ $thekey);
  #v15CLqtw1ZnanKI9 if $verkey→is_invalid then {
    #xF2mDfmsnPuWGTXk $jsb→set_string("cachekeyvalue", code→flush_api_cache($thekey));
  }
  else {
    #pkpHnLUdYRQmbFvx $jsb→set_string("cachekeyvalue", $verkey→string("value"));
  }
  #VuamCQ6ZcyXmACKk $jsb→set_string("cachekey", $thekey);
  #ZqecUBzKSC482H0a $jsb→set_number("status", $api_request→status);
  #tvW5236Uhp2qgs7U if $api_request→status = 200 then {
    #zr2rrxB93lhdq3xT $jsb→set_field("response", $api_request→response);
  }
  #xblAbLhxpI3QXlpW data→cached_api_container→just_insert($api_request→orig_url, $jsb);
  #xIAOaLiOFWpgRWjO // TODO store etag/other headers?
  meta private;
}
#ak5tNe85HkvOToMd
action flush_api_cache(#KK4qrIaDj33I6MM6 s: String) returns(#ErokZ91HEAbv3Lfv val: String) {
  #AUZ8o40fb6RChKth // {action:ignoreReturn}
  #xd26n4S4kn5TbUrO $jsb2 := web→create_json_builder;
  #tlo67C4ptg07lANk $value := @\u267b→azure_table→create_random_id(10);
  #RJ7UdI2R82RkqSJB $jsb2→set_string("value", $value);
  #NvO7rbKn0e7nkCBR data→cached_api_container→just_insert("@" ∥ $s, $jsb2);
  #RXx7bKe2M3tYkBdi `return` $value;
  meta private;
}
#jnbL09ngz0wYlMOJ
var template_suffix : String {
  transient = true;
}
#DEE0kzFhITFi256J
action acquire_cache_lock(#yOOn24p1VZZlPOUl path: String) returns(#RM20vF7no5I2I2PF b2: String) {
  #wX6ut7jzharK2wFf // This lock is for API calls that are cached. It's only for performance. When there are many calls to /X happening at the same time, and /X is flushed out of cache, normally multiple workers would start to re-compute /X, and then they would all save the cache (possibly fighting over it). With this lock, only one of them will, and the others will wait (or retry).
  #RWiBRucVjnv9Hocb $timeout := 10;
  #xb7EFCwMDPJvGyw6 $args := ("key,self,EX," ∥ $timeout ∥ ",NX")→split(",");
  #xrDlroJxBdKntXCx $item := "lock:" ∥ $path;
  #L42rL9xqlXrZfFQ2 $args→set_at(0, $item);
  #EPQSwe6s6htlZWON $s := data→redis_client→send_command("set", $args→to_json)→to_string;
  #xL3z3aBCJxgHvPVI if code→or_empty($s)→equals("OK") then {
    #hJLZ42yDt4VWsjTA data→logger→debug("got cache lock: " ∥ $item);
    #xCFu1toU1Iu8aBGr `return` $item;
  }
  #PLpMfEO8b4Gl1Mu0 data→logger→debug("failed cache lock: " ∥ $item);
  #xv22nzk3IkEGFQHv for 0 ≤ i < $timeout * 2 do {
    #xRDG4woVtQh286JO time→sleep(0.5);
    #TdP3vTT31nF5hE9s if data→redis_client→get($item)→is_invalid then {
      #xT4pkMAJbXy4jExU `break` ;
    }
  }
  #X0tDMqpMv9DXDfm4 data→logger→debug("failed cache lock, wait finished: " ∥ $item);
  #kQyjv9xC78JG4Q1B `return` "";
  meta private;
}
#xwKNAEXTAteN8jgi
action release_cache_lock(#i86YSC1pkL8tT1tP lock: String) {
  #xEyuXIj2wn127Otv data→redis_client→del($lock);
  meta private;
}
#xYp6C54d4T0cJgOn
action get_promo(#xin3HpETUBdrNnjO req: * api_request) returns(#xeRgktcnJUdIQdUK js3: Json_Object) {
  #xsBFKA4mcbJ3vEzb $js2 := $req→root_pub→field("promo");
  #x23940b4WHqzD1Kw if $js2→is_invalid then {
    #CpBiZ365TV8JBy4D $jsb := web→json("{ \"tags\": [], \"priority\": 0 }")→to_json_builder;
    #xY3N1V6gJTFjh0Qv $last_ptr := code→get_pub($req→root_pub→string("lastPointer"), "pointer");
    #xym2CtoitHPncRgS if `not` $last_ptr→is_invalid then {
      #Hqao854t946Xxcvq $jsb→set_string("link", "/" ∥ $last_ptr→field("pub")→string("path"));
    }
    #mTDh4L0VKLZ4oynG $js2 := $jsb→to_json;
  }
  #P57WbSq93cDyfvsX `return` $js2;
  meta private;
}
#NRC6w3Ep4DeC2hYW
action json_array_index_of(#e7oFD491E53ffAGO js: Json_Object, #cCauPb8pgsnXM4sd id: String) returns(#wual11HOAoN0J6zX idx: Number) {
  #CzXzdLRsa4C2Wkuh if $js→is_invalid `or` `not` $js→kind→equals("array") then {
    #zZMxTTVAefaTDrqM `return` - 1;
  }
  #x6ldHidVhhob3MJO $x := 0;
  #N5o3aW45m73MtfbF foreach js2 in $js
  do {
    #RsnVkJBo8YJ24wYl if $js2→to_string→equals($id) then {
      #xJMl8ayW5gFGBeVl `return` $x;
    }
    #w08JWRS32G0tT8Ue $x := $x + 1;
  }
  #Nfr6bFQcnoQJrAyt `return` - 1;
  meta private;
  meta sync;
}
#fHkfbCXgwftahLLX
action add_group_approval(#qGPElJKO3QN8uBYf group_json: Json_Object, #qWrm4WMdaXMRg0kV user_json: Json_Object) {
  #btaqgsmSJkT8VOOU $grpid := $group_json→string("id");
  #xC00wllNsXXEmPYM $userid := $user_json→string("id");
  #KYIZqJZy673Si0N3 data→pubs_container→update($grpid, $update7);
  #TY4LPFjtNSh6hM0N where update7(entry: Json_Builder) {
    #LOANdoPpVoSi2TAa $appr := $entry→field("approvals");
    #Kv1LmYw7Qr28K0Cn if $appr→is_invalid then {
      #KiKc7GfflDjEe3Zy $appr := web→json("[]")→to_json_builder;
      #HU4rPx1EZ2hk70uN $entry→set_builder("approvals", $appr);
    }
    #tmjSKOuT8KDFGT4s $idx2 := code→json_array_index_of($appr→to_json, $userid);
    #Je4irMfdmA4Dnrjt if $idx2 ≥ 0 then {
      #Rhhe3PLuM3WP95N8 $appr→remove_at($idx2);
    }
    #osBkFn2Btu3L9KON if $appr→count > 200 then {
      #Bx4dbkgXlG2953M6 $appr→remove_at(0);
    }
    #xhFXk0QFY47A4i3u $appr→add($userid→to_json);
  }
  #XkBGzflTaUEsfyV5 code→send_notification($group_json, "groupapproval", $user_json);
  meta private;
}
#eYC04KFsrZDTp6Ho
action failure_report_loop() {
  #FmnIXFeCH6hxkR0G $container := data→blob_service→create_container_if_not_exists("blobwritetest", "private");
  #EXJdp2JnpBcEiFTs $@table := data→table_client→create_table_if_not_exists("tablewritetest");
  #riPNXhCITOdGRFqu while true do {
    #OGs62OEN5dVOs40k time→sleep(300 + math→random_range(0, 100));
    #x8ANYN8WlF44NPqT `async` code→check_search;
    #vryt2Ry9yepveaLQ time→sleep(30);
    #fW02vXeZqMYBUMdq `async` code→do_failure_checks($container, $@table);
  }
  meta private;
}
#VVw0iCpe6mtaUnL0
var last_search_report : DateTime {
  transient = true;
}
#AaEVQFRssbOeik8S
action check_search() {
  #xEkmL2KzhfXbLfC4 $res := @\u267b→tdlite_search→statistics;
  #WmhQxSSxcyifNXia data→last_search_report := time→now;
  meta private;
}
#DKNuvoElTz5bvt4m
action do_failure_checks(#HrjDqllPrghpd21z container: ♻ azure_blob_storage → Container, #ZLHlExwBt2rFuLZQ @table: ♻ azure_table → @table) {
  #j61nQkc3P9WtoneK if time→now→subtract(data→last_search_report) > 100 then {
    #xHWfvXYEfiWmBV0i data→logger→tick("Failure@search");
  }
  #xa3pfd4N3W0WGWZI if data→redis_client→is_status_late then {
    #xIlgkRxXJf1vOD9I data→logger→tick("Failure@redis");
  }
  #dKjEE45mnkGcva4H $result2 := $container→create_block_blob_from_text(math→random(1000) ∥ "", "foobar");
  #I7K9d2ZmFsnVAhZ4 where just_try := true;
  #uYsfSoQMcqhMOxZQ if `not` $result2→succeded then {
    #KJWdUCzhxEdKTS5L data→logger→tick("Failure@blob");
  }
  #UDtImT05MMqZ2Pzr $entity := @\u267b→azure_table→create_entity(math→random(1000) ∥ "", "foo");
  #Ss34OpKzbEZPCeiA $ok := $@table→try_insert_entity_ext($entity→to_json, "or replace");
  #xsP9LmYobfPpU7Xs if `not` $ok then {
    #RjTgeOplHSy2VsHc data→logger→tick("Failure@table");
  }
  meta private;
}
#rZRl5qQr21ygDvnT
var initial_approvals : Boolean {
  transient = true;
}


