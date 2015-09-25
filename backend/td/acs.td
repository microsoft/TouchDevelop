meta version "v2.2,js,ctx,refs,localcloud,unicodemodel,allasync,upperplex";
meta name "acs";
meta color "#ffa1caf1";
meta rootId "He2dwRNHqyxljrvjXoxKRyfp";
meta isLibrary "yes";
meta allowExport "yes";
meta hasIds "yes";
meta platform "current";
meta parentIds "";
#NHWrdUFw49AZ2B2J
action init(#xvfnGmcP4KkRvY8k options\u003f: * Options) {
  #T6q6ce20jpXb6uBp // Initializes the service. If not provided as arguments, reads the ``user name``, ``password`` and ``orgid`` from the ``ACS_USERNAME``, ``ACS_PASSWORD`` and ``ACS_ORG_ID`` server settings.
  #HdGFa4lAHYtWnYmt if $options\u003f→user_name→is_empty then {
    #HlAMfHaBBX2Q62pD $options\u003f→user_name := app→server_setting("ACS_USERNAME", false);
  }
  #W6z0WwsXdYQDpq8I if $options\u003f→password→is_empty then {
    #VK4vfn4evaCV6FaO $options\u003f→password := app→server_setting("ACS_PASSWORD", false);
  }
  #LCh2r7lynKead1lY if $options\u003f→orgid→is_empty then {
    #IgyZZoOXhppAS21c $options\u003f→orgid := app→server_setting("ACS_ORG_ID", false);
  }
  #UjIzawCx477kpvod data→\_username := $options\u003f→user_name;
  #xvEQq40Gv5bzm5fu data→\_password := $options\u003f→password;
  #SwCDXc1S2W29tG4L data→\_org_id := $options\u003f→orgid;
  #MHt8fVaAvW22ToX4 data→logger := app→create_logger("acs");
  #tn2lotuXz8wxL8fF code→refresh_token;
}
#xGpONab3VP5bdmhj
var \_username : String {
  transient = true;
}
#dazxkiDOWgTEeajP
var \_password : String {
  transient = true;
}
#B4MgNQbFjdHk3J4A
var \_org_id : String {
  transient = true;
}
#vI28pKxGvJ6wQsYu
action refresh_token() {
  #B7g0x5AjTugGTTZ2 if data→\_token→is_empty then {
    #IE2TBfHjw2qeDshU data→logger→info("resfreshing token");
    #azurzkjE5x3UaNm5 $request := web→create_request("https://cvsservices.accesscontrol.windows.net/WRAPv0.9/");
    #VHk66Wv2DFIB7VU4 $request→set_method("post");
    #nHNTyl4t2r4Ys56W $request→set_content("wrap_name=" ∥ web→encode_uri_component(data→\_username) ∥ "&wrap_password=" ∥ web→encode_uri_component(data→\_password) ∥ "&wrap_scope=" ∥ web→encode_uri_component("https://coreservice.centralvalidation.com"));
    #kgmrng4U37q6HXBt $request→set_header("Content-Type", "application/x-www-form-urlencoded");
    #BiY2ZhoaImWB6fEk $response := $request→send;
    #nGUn2zUqQPYCJzjG data→logger→debug("refresh: " ∥ $response→status_code);
    #SyyolAYMuIvRRk3X if $response→status_code = 200 then {
      #ZUp2u1FLOnVqpsWi data→logger→debug("content: " ∥ $response→content);
      #l3iT6wIwrj4W8BPG $m := $response→content→@match("wrap_access_token=([^&]+)");
      #RgRa44KV243Z9FjY data→\_token := web→decode_uri_component($m→at(1));
      #ORBCXzZ2xb9b4wUH data→logger→debug("token: " ∥ data→\_token);
    }
  }
  meta private;
}
#Tu7zax2fZKH5WeX2
var logger : App_Logger {
  transient = true;
}
#aCB42NWXeNwBJD4h
var \_token : String {
  transient = true;
}
#CNNu0ojQs6I35tHk
action validate_picture(#FOMkng4UVdUsDbMr id: String, #If3lTAKzmfmqzCTf picture_url: String, #x4pV8VAE9W0IqLJ8 callback_url: String) returns(#f2pYe9foaKco4D2b job_id: String) {
  #VQ4cbPbMUZQqypv2 // Schedules an image validate job. url must point to a publically available image.
  #wSBIkAv2thj65ubf contract→requires( `not` $id→is_empty, "missing id");
  #JpeOEG2LtGwVobI5 contract→requires( `not` $picture_url→is_empty, "missing url");
  #F9bEVp0klBTgOrtb code→refresh_token;
  #wFlyNncTUnHEXm2A $contentType := 1;
  #xVUhzQ84zA87OT5b $dataRepresentation := 1;
  #iUKftqJCN2l54syK $job_id := code→validate($id, $contentType, $dataRepresentation, $picture_url, $callback_url);
}
#umU90GppP2x8R4tD
action create_request(#xkUQ0rlke4G2h5b2 path: String, #meoa4WDSn7EUjaX6 payload: Json_Builder) returns(#YxNgQKfWCKzfMCmq request: Web_Request) {
  #T5Lw18Ur9kfNPdNv $request := web→create_request("https://coreservice.centralvalidation.com" ∥ $path);
  #aGJ24KOtDszHE9Y1 $request→set_header("Authorization", "WRAP access_token=\"" ∥ data→\_token ∥ "\"");
  #grrfZONB4TCqCkgO $request→set_header("OrgId", data→\_org_id);
  #MbqMAgTevJTA6gqt $request→set_header("Host", "coreservice.centralvalidation.com");
  #xUFZoZG2ns7tpZOV $request→set_method("post");
  #yhDzu2LW52nTlADe $request→set_content_as_json($payload→to_json);
  #JJGspFu0NwMUhb9L $request→set_header("Accept", "application/json");
  meta private;
  meta sync;
}
#lbopBdtn4O2A2NrN
action read_results(#M9BCJmluqi7mo1H7 js: Json_Object, #xhAhQro9dQPOIE45 res: String_Map) {
  #xDJ21tzMT0f9FWUv $results := $js→field("ResultCollection");
  #kGMG6OFxBrrrUxzg foreach js2 in $results
  do {
    #x2gNnojWBG42jhlP $id := $js2→string("ContentId");
    #pwkI62lHLYRifkEz $violations := $js2→number("ViolationCount");
    #O5iQS8hMIU4xVHJD data→logger→debug($id ∥ " -> " ∥ $violations ∥ " violations");
    #M4P9ILW4xtj8SOwp $res→set_at($id, $violations→to_string);
  }
  meta private;
  meta sync;
}
#hqzzkXf86A4Ua3h4
action details(#vCv1Zh742JVXJJBq job_id: String) returns(#uCuCiJjCjnDuraVx status_code: Number, #pXzMAoGAz1tDb5rk res: String_Map) {
  #GJT245HPsW8A5nhU // Gets the details on the given job. If ``status code`` is ``3602``, the result is not ready yet. Anything else than ``3000`` is an error.
  #yC5k7uXhau1JxNY5 code→refresh_token;
  #tca2dAbMjEIhhmOe data→logger→info("details on " ∥ $job_id);
  #HLpOv236azMJ8jOR $jsb := web→create_json_builder;
  #gDiPYdZCVFWfI5f3 $jsb→set_string("JobId", $job_id);
  #xg5UMsN9coIdkxV4 $jsb→set_string("OrgId", data→\_org_id);
  #xVANuz8EpBKc4wDv $request := code→create_request("/Content/GetDetails", $jsb);
  #shH0AXyNS3m2dGxa $response := $request→send;
  #N2uYIuqFEqLx48aU data→logger→debug($response→content);
  #LqxKxZtYSlqRjB17 $status_code := 0;
  #nXas1Tvtjk0uEjK2 $res := invalid→string_map;
  #bpFNCOEaHqcGS3Cd if $response→status_code = 200 then {
    #WJt3mFFf6KKVkrgZ $js := $response→content_as_json;
    #Xe9w2l9kMT8sS2fY $js := web→json($js→to_string);
    #WL1BYSVrUMFf7gFI $status_code := $js→field("Status")→number("Code") + $status_code + $status_code;
    #nbgYf9KhJ6YlMosC data→logger→debug("scan status: " ∥ $status_code);
    #xBNqqE33TGcvMQ8t if $status_code = 3000 then {
      #vwb7ZJ3HmvfwdMBo $res := collections→create_string_map;
      #HyOmHl2YHz4vsRLt code→read_results($js, $res);
    }
  }
  else { #x4pO2lZl8oAB6qxI if $response→status_code = 401 then {
    #V2aXgvUHwekPYL4h data→logger→debug("token expired, refreshing");
    #tMJpub2Jb5Nh5AQu data→\_token := "";
    #sHoEf3Fxy8NKI5f1 $status_code, $res := code→details($job_id);
  }
  else { } } 
}
#mgSetHsXHNBIKtUe
action validate(#xO2MqCRE2AaOhjLR id: String, #x4pMh24ZMjujdFXL contentType: Number, #sh2ukXx2URLWtk48 dataRepresentation: Number, #VHHNTWVew44C3jVw value: String, #jTmrzfz2U1Qo2DiZ callback_url: String) returns(#xikUnz9JNXG4rIIs job_id: String) {
  #bt8UI8F9jMyON7z6 contract→requires( `not` $id→is_empty, "missing id");
  #xGk278xG4CeZczSh $job_id := invalid→string;
  #yM2l33rBKusx3XJS $payload := web→json("{\n   \"RequestId\":\"TODO\",\n   \"ContentCollection\":[\n      {\n         \"ContentId\":\"TODO\",\n         \"ContentType\":1,\n         \"DataRepresentation\":1,\n         \"Value\":\"TODO\",\n         \"Metadata\":[\n            {\n               \"Key\":\"RunImageClassifier\",\n               \"Value\":\"True\"\n            },\n            {\n               \"Key\":\"SupressFaceDetection\",\n               \"Value\":\"True\"\n            }\n         ],\n         \"PolicyCodes\":[],\n         \"LanguageCodes\":[],\n         \"Descriptors\":[]\n      }\n   ],\n   \"Metadata\":[{\"Key\":\"ReviewEnabled\",\"Value\":\"False\"},{\"Key\":\"Realtime\",\"Value\":\"False\"},{\"Key\":\"SuppressEmptyReview\",\"Value\":\"False\"}   ],\n   \"OrgId\":0\n}")→to_json_builder;
  #IfBOyCfvPuq4LhQG $payload→set_string("RequestId", $id);
  #zBnNvYTTwYIwhcUE $payload→set_string("OrgId", data→\_org_id);
  #NcIyFRRb6EzJZeqH $content := $payload→field("ContentCollection")→at(0);
  #xVGAS0X0GoPl02Se $content→set_string("ContentId", $id);
  #EfZBB55pEnrR8MLd $content→set_number("ContentType", $contentType);
  #mncJQUD7boG1GyIV $content→set_number("DataRepresentation", $dataRepresentation);
  #gpSvDHJY3h8KFmlC $content→set_string("Value", $value);
  #uxawdhYGxeyjgwXZ if $contentType ≠ 1 then {
    #H9HVQN7xF4DXw6BU $content→field("Metadata")→clear;
  }
  #x2QuqkJWNDz4cO7F if `not` $callback_url→is_empty then {
    #smUO8q6gu3Y2CfCg $jsb := web→json("{ \"Key\": \"CallbackEndpoint\" }")→to_json_builder;
    #wHk6Mo1EGLrRAPKl $jsb→set_string("Value", $callback_url);
    #takIJo5yxB4RpwaW $payload→field("Metadata")→add($jsb→to_json);
  }
  #xWXB5f00ruTGgJCG data→logger→debug("payload: " ∥ $payload→serialize);
  #SBqPkWxb3u0WiVpr $path := "/Content/Validate";
  #UnBgR63eZW21llfc $request := code→create_request($path, $payload);
  #xmxB1e2XVQZ71PuA $response := $request→send;
  #xuDwYmvt6iBOQqXT data→logger→debug("status: " ∥ $response→status_code);
  #oFZhjR3GVKV5kokj if $response→status_code = 200 then {
    #Vxknr4vK5covC6PY data→logger→debug($response→content);
    #cJ8zH6rZ2WaCer04 $js := $response→content_as_json;
    #gs4N2Qt0XtPB5AcA $js := web→json($js→to_string);
    #aGMb3IYrK6d1lp82 $status_code := $js→field("Status")→number("Code");
    #H3HAFnrHQxZMvo0U data→logger→debug("internal status: " ∥ $status_code);
    #MDA3isNMn21pLYVp if $status_code = 3000 then {
      #GxoVuXOdF9UlvQKo $job_id := $js→string("JobId");
      #VrmcKhNVEvx424A9 data→logger→debug("jobid: " ∥ $job_id);
    }
  }
  else { #xY44jsE2uPtBggPU if $response→status_code = 401 then {
    #JqzrB1Fd9cEGqpGb data→logger→debug("token expired, refreshing");
    #xgFF4woaFoyahSF2 data→\_token := "";
    #xEQdkRlVviLqs30i $job_id := code→validate_picture($id, $value, $callback_url);
  }
  else { } } 
  meta private;
}
#muvaSZv2aNiji9nE
action validate_text(#NxG0g8o8ldf0He4K id: String, #AihhZDrTWwo9l2Eq text: String, #xayeLuVotwgtTuTN callback_url: String) returns(#jjg6ZSNsdrbuJvKW job_id: String) {
  #mrZjQqFd2uvzYBRO // Schedules a text validation job.
  #ZwV719P4224ACEwv contract→requires( `not` $id→is_empty, "missing id");
  #ZFpe06PDIND4tqNJ contract→requires( `not` $text→is_empty, "missing text");
  #P9uHo0LdiKxAEcex code→refresh_token;
  #buOyTxFcmG9Rt1zX $job_id := code→validate($id, 0, 0, $text, $callback_url);
}
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
#JxvX9sSm1OfLs3To
action example() {
  #xVbodHJD7zdHkDxL // This library allows to sanitize text and picture using the Microsoft ACS service.
  #cElpoHaLGPKHgOcS // ### setup
  #qdXEVDbXlXteZ4cl // Call the `init` action within your web site ``_init`` action to initialize the service.
  #xZZoyZjxUJUgqBN0 // Initializes the service. If not provided as arguments, reads the ``user name``, ``password`` and ``orgid`` from the ``ACS_USERNAME``, ``ACS_PASSWORD`` and ``ACS_ORG_ID`` server settings.
  #cXsqrQ3d09BeREof code→init;
  #x223XyhONvKun4b4 // ### validation
  #zQpHioA4aOID1p0i // All validation methods take a _optional_ callback url that will be invoked by ACS when the results are ready. Keep the jobid around, it's useful later to give feedback.
  #t8J9uWFLTIZhBEnH // * validate text
  #YDPAQd8ZvkvzJwAf $job_id := code→validate_text("unique id", "the text to validate", "the result callback");
  #Ea4ZDGEAd2ad4wSi // * validate a picture
  #xeKFQwJwYr6pzelP $job_id2 := code→validate_picture("picture id", "url to the picture", "the callback url");
  #tEAD4ibH8acDnuLk // ### validation callback
  #XBXoXoMAgRwcwT71 // ACS will issue a ``POST`` with a JSON payload to your callback url. You can then parse the results as follow:
  #kMJGProgzdpvnjvN // {hide}
  #KkXryLZa4OQB9X3l $payload := web→json("");
  #RIPYQhI2ox2qi2Vy // {/hide}
  #Mqn1ljsv26fTugC7 $results := code→parse_results($payload);
  #SKv89Qkjiw1zBaea foreach vr in $results
  do {
    #hA9OXahM4xRDOvkT // each result contains the ``id`` and the ``status``. A status other than 3000 is a failure or violation.
    #kHQOZf0NsUEkBEGC app→log($vr→id ∥ ": " ∥ $vr→status);
  }
  #dDlg0S0UPgG8z4zd // ### feedback
  #x9Gq63OgsR1jGr7P // When you make the decision on a reported assets, you can send a feedback to help improve ACS.
  #vYkYcW6TJxwVNite // * In this example, we accepted the report (see `code->feedback` for more info)
  #scrEOwbTqR3YqCjv code→feedback($job_id, "accept");
  meta private;
}
#eFDbB8q7RULQBxGH
action parse_results(#KpMWyZVq407ftWKV payload: Json_Object) returns(#YGocWlFGUvH4dDZp results: Collection[ * Validation_Result]) {
  #zD4umi9TSOJcrVrp // Parses the acs results and returns the list of validation results. Any status other than ``3000`` indicates an error.
  #g5ihXvIF00BPC8eV contract→requires( `not` $payload→is_invalid, "missing payload");
  #mvHU4Tfcr4fgSJmw $results := records→Validation_Result→create_collection;
  #xXBe4Uah04Fpf1Ie $jsresults := $payload→field("Results");
  #fClSVhEUK4ld0cpF foreach jsr in $jsresults
  do {
    #Hv0K3Ta5Uk4asnsM $vr := records→Validation_Result→create;
    #xhW3hhiIArUpgSy1 $vr→id := $jsr→string("Id");
    #S223rDg9L6t23L7a $vr→status := $jsr→number("Status");
    #VhVk1nYGTkxV3fye $vr→info := $jsr;
  }
  meta sync;
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
#aaPuncZKJiBxWET2
action feedback(#ichMeWN4D1AsNDoT job_id: String, #XRqXLLzW146K2pYP decision: String) returns(#Lobpg07d0PEdnvPr status_code: Number) {
  #kF7mdgKQ2QKCB6xI // Sends a feedback to ACS about the outcome of the decision for the job.
  #FGrrKgIi4EIT5DuG // {action:ignoreReturn}
  #natel5aC9iAO6mVS // {hints:decision:accept,wrong interpretation, wrong application,unavailable}
  #gmy522bVdA68RMP2 // * ``accept`` The reported violation on the content is correct.
  #VoFifoyUls01wv9d // * ``wrong interpretation`` The reported violation on the content is incorrect due to interpretation of policy. Tenant does not accept CVS's response as they believe the content policy was applied very conservatively by CVS or that type of content is allowed in tenant's particular business scenario
  #WKJesuGAmIEtl9v1 // * ``wrong application`` The violation on the content is rejected due to application of policy. Tenant does not accept CVS's response as they believe the content was incorrectly flagged/failed or an error was made by CVS
  #DCkcoSnOOvDtA95X // * ``unavailable`` The violation on the content is rejected because the content is no longer available.
  #g4c4Yto24qWWoY2r data→logger→debug("feedback for " ∥ $job_id ∥ ": " ∥ $decision);
  #Qk8V5DeVKY1tPiQT $actionType := 0;
  #yLJFA4hJBL31TcR7 if $decision→equals("accept") then {
    #bijHhPp8J8F4eJgE $actionType := 1;
  }
  else { #LzB2FGGTv2bIuUNb if $decision→equals("wrong interpretation") then {
    #Ww2Lq8Z4q4uWk3G5 $actionType := 2;
  }
  else { #q31pjFJgKYfeTSfP if $decision→equals("wrong application") then {
    #jdgo9SX42trm7PMp $actionType := 3;
  }
  else { #WTxzghgYbcMoKSbw if $decision→equals("unavailable") then {
    #aphp1u6nLxUN1bpI $actionType := 4;
  }
  else {
    #dgiAt2BaJWoXVA4A contract→assert(false, "invalid decision value");
  }
  } } } 
  #hJLRm4kz96THcXnk $payload := web→create_json_builder;
  #ErBX2hV4ZIHZmVqT $payload→set_number("ActionType", $actionType);
  #TIUb8zn6us2y8OiF $payload→set_string("JobId", $job_id);
  #gvEIUOEsG4eWSrPz $payload→set_string("OrgId", data→\_org_id);
  #x6EatS4Qs1q5Vz6s code→refresh_token;
  #xAxeJO9BrGclHzOJ $path := "/Feeback/JobAction";
  #sLN6lS0io85TIOem $request := code→create_request($path, $payload);
  #yF4yd6BrL5IPKcHU $response := $request→send;
  #NRH7sEvZTdpzkU5I $status_code := $response→status_code;
}


