meta version "v2.2,js,ctx,refs,localcloud,unicodemodel,allasync,upperplex";
meta name "mbedworkshop compiler";
meta rootId "xaO7strJij5TL8JuLfbBJPl8";
meta iconArtId "vllpnxim";
meta isLibrary "yes";
meta allowExport "yes";
meta hasIds "yes";
meta platform "current";
meta parentIds "";
#x8ItX2EZJXqh9F76
action create_compilation(#nEr4MBz3ON1IY90B target: String, #ZpQ6AcYRa3aurySi repo: String, #lnROHp4UgQ55bD1z target_binary: String) returns(#g9O06O7MWhhgSFkl request: * Compilation_Request) {
  #vtJ4KUI2Woqifgcy contract→requires( `not` data→logger→is_invalid, "mbed not initialized");
  #x0mkEFyyNyxWjUm4 contract→requires( `not` $target→is_empty, "missing platform");
  #aOXCBH3wdFCtq6RZ contract→requires( `not` $repo→is_empty, "missing team information");
  #KV1tIEAB2cAhCFaQ data→logger→debug("repo: " ∥ $repo);
  #HgZzyPqlshhga2TY $request := records→Compilation_Request→create;
  #x1CBSNvRQfjnYAQJ $request→target := $target;
  #xBPE60RR9YEyI11d $request→repo := $repo;
  #xUiO3dPoMgzGgoB0 $request→target_binary := $target_binary;
  #xSfQFIpTBJ499XR1 $request→replace_files := collections→create_string_map;
  meta sync;
}
#tSo7noLnRwJKbIZP
action init(#wfrRpxhHG2flB9IY options\u003f: * Options) {
  #AODJat0QzQSm9TIj // Initializes the library
  #kWZwGgm2sknkllKk data→logger := app→create_logger("mbed");
  #ETsjCDVsfFEXmnur if $options\u003f→apikey→is_empty then {
    #sQDZ1VQc4cYR9jyw $options\u003f→apikey := app→server_setting("MBED_API_KEY", false);
  }
  #QD6IBgb8b19rZs12 if $options\u003f→github_api_key→is_empty then {
    #YdPUegleyfiBVLJX $options\u003f→github_api_key := app→server_setting("MBED_GITHUB_API_KEY", true);
    #kRmVO2C2hPVT3Ecr if $options\u003f→github_api_key→is_invalid then {
      #qZMqgeQ2pP5TVsF8 $options\u003f→github_api_key := "";
    }
  }
  #x9EW4Cr9ZTI1FK43 if $options\u003f→apiurl→is_empty then {
    #ExrczJWLN14oMQZg $options\u003f→apiurl := app→server_setting("MBED_API_URL", true);
    #IGKgDJwPyYbansse if $options\u003f→apiurl→is_invalid `or` $options\u003f→apiurl→is_empty then {
      #deK3h2dAHoX5Ih41 $options\u003f→apiurl := "https://mbedworkshop.azure-api.net";
    }
    #e7zhrtw1q2t3YhPE $options\u003f→apiurl := $options\u003f→apiurl→trim_end("/");
  }
  #x1DhSnn57fVQ4IO9 data→options := $options\u003f;
  meta sync;
}
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
#dAJiFU0UYVFtXQQt
var logger : App_Logger {
  transient = true;
}
#XpJmP0PhzFncN2EF
var options : * Options {
  transient = true;
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
#I4ZNDGLKsicUgsqV
action start(#WBkvjVA3muM4HML3 request: * Compilation_Request) returns(#M4b58J8k5RuPvYwk success: Boolean) {
  #dgydROpT8pf2h9ra $url := data→options→apiurl ∥ "/v1/build";
  #gV8S1sIgNO7PpvYr $jsb := web→create_json_builder;
  #vOZhJg2atD2GCfU8 $jsb→set_string("repo", $request→repo);
  #lLADZhToWmlLSk1G $jsb→set_string("target", $request→target);
  #w3q45F14g73eYhx7 $jsb→set_string("target_binary", $request→target_binary);
  #qkd4CF16WyHlk0VH if `not` data→options→github_api_key→is_empty then {
    #TihGtwnjdtMQtbgn $jsb→set_string("github_api_key", data→options→github_api_key);
  }
  #LiZRmMW4r48PiWW2 if $request→clearcache then {
    #sw8DynbAfoVlyeJS $jsb→set_string("clearcache", "true");
  }
  #aHuNgJ3fxiSYhHNe $repl := web→create_json_builder;
  #rzzuME4SQ5w7YT4C $jsb→set_builder("replace_files", $repl);
  #mph54k5JbhAtaxwJ foreach fn in $request→replace_files→keys
  do {
    #k1wiuSbzh2Nm9ime $repl→set_string($fn, bits→string_to_buffer($request→replace_files→at($fn), "utf8")→to_string("base64"));
  }
  #x1HNcjApQ9yVIzCH $req := web→create_request($url);
  #CgRMMT1IS03thOyT $payload := $jsb→to_json;
  #vJFcXWj1tj8jvexY $req→set_content_as_json($payload);
  #x5QaCCfE9UePr90m data→logger→debug($payload→format(2));
  #O2xl1LfMNerwNvS4 $req→set_method("post");
  #oShZa95BQ0dSTnzg $req→set_header("Ocp-Apim-Subscription-Key", data→options→apikey);
  #cWmi1I0w47s4o9f6 data→logger→debug($req ∥ "");
  #fuznTV1813E2Sx5J $response := $req→send;
  #D38R9phXzfhjq9Sp data→logger→debug("compile status: " ∥ $response→status_code);
  #uMW4Y5cdpDEKIjBB if $response→status_code = 201 then {
    #dna9H4o2bDvHXIwv $request→task_id := $response→header("Location");
    #xG2qFXLoV9ObGDvT data→logger→debug("compile task id: " ∥ $request→task_id);
    #YtAraZ4T46289FzJ $success := true;
  }
  else {
    #x1Blizn0hg45u3kA data→logger→warning("compile failed, status: " ∥ $response→status_code ∥ ", content: " ∥ $response→content);
    #SzYThh8JB4svu2tp $success := false;
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
#Uxff2yczUSw9NToS
table Compilation_Message {
  type = "Object";
  persistent = false;
  fields {
    #PvlBren4LMgYkakb type : String
    #FonyUqJS4lhxThvH text : String
    #xfGFtD6UMJnrpU5V @action : String
    #XlRUhW3OAK0nUovd file : String
    #F2jxd8cplF79OeHS percent : Number
  }
}
#ehG4hYoUgGN6D5LW
action download(#MKIE2G1EkxuTshQs task: * Compilation_Result, #x8eg1MB9pSh2JUds request2: * Compilation_Request) returns(#xEWyatWoPekixqvn bytes: Buffer) {
  #aCLtYJHl4ZfLRvJP // If the task is completed and successful, downloads the .hex file
  #Dg4q2Jbvobeimnkh contract→requires($task→completed, "task not completed");
  #hUIvAEFSxs4ImIDr contract→requires($task→success, "task uncessessfull");
  #ke4NaIQGQcfpRRv1 data→logger→debug("downloading " ∥ $task→binary);
  #gs71RgHfin22v5JM $req := web→create_request($task→binary);
  #x9MniKN2HM3Gkkaw data→logger→debug("" ∥ $req);
  #x25JTVckUEXuhsY0 $response := $req→send;
  #pzZ95jNYs2FW2iUi data→logger→debug("res: " ∥ $response→status_code);
  #xTNH2V43SBpDNZDF if $response→status_code = 200 then {
    #N72eQX8vX22qvSvZ $bytes := $response→content_as_buffer;
  }
  else {
    #Bn0F1hHRC69a9Cir data→logger→warning("download failed: " ∥ $response→status_code);
    #xVFc900kmDrnlpoj $bytes := bits→create_buffer(0);
  }
}
#mLrH8uWGzRS4uHmz
action example() {
  #xmqb2IjVN9DWh4X4 // A library to leverage the ARM mbed [compile api](https://developer.mbed.org/handbook/Compile-API).
  #w0SxuWrifxQQtkhF // ### setup
  #BjtNwcsRr120GGAy // Sets the user name and password used to authenticate the API calls. If not provided, uses ``MBED_USER`` and ``MBED_PASSWORD`` server settings.
  #zhuhqKN8W4aOpDC4 code→init;
  #Id7Q2L4HPcSYWfRW // ### starting a compilation
  #geQXeNMmUaPI7j2k // * Create a compilation request for the given ``platform`` and ``repo``
  #jh5b35GhG9jeT4yq $request := code→create_compilation("NRF51822", "https://developer.mbed.org/users/dan/code/pubtest/", "foobar-combined.hex");
  #xiXWMXphOwg1VCcB // * replace repo files with new content
  #UI4fjqCn4BGqjzMA $request→replace_files→set_at("main.cpp", "...");
  #uXOkcMlwZqgRIn1s // * Make sure to test that the compilation started.
  #LYnrt2N2lHxK3mDd if `not` $request→start then {
    #jaBI1mPrjClBfKDI // oopsy, something when wrong
  }
  #JWmH55c2pffBzgd0 // ### polling for the result
  #W3QOz3m2RncJFddD // * use the ``status`` action to track the progress of the task
  #cuasBnNssgy3cG7h $task := $request→status(true);
  #gA27rsRITut4SYiL // ### download the hex file
  #x7E07kqy6YCqNO97 // Upon successful completion, download the ``.hex`` file using ``code->download``.
  #bNj7VHxvVaIBEO8D if $task→success then {
    #YNV6bLvCnKBd9b5i $bytes := $task→download($request);
  }
}
#ayPsRLl0hbtxA1xc
action status(#xNaoshCDxU8OHfxD compilation: * Compilation_Request, #xvDQc73Q6l6sMSWM block: Boolean) returns(#bQJENgjSVW75R21O result: * Compilation_Result) {
  #x2jZRwUR21iQbkJX // Queries the compilation status for a given task
  #N0ij8VyLnDTGvccK contract→requires( `not` $compilation→is_invalid, "missing compilation");
  #sJqG2vuyOKFPpEqD $request := web→create_request($compilation→task_id ∥ "?block=" ∥ $block);
  #aDsL4PeFEda9rlDz $request→set_header("Ocp-Apim-Subscription-Key", data→options→apikey);
  #Cy274Zxhe04HbUQF $response := $request→send;
  #ZdPZb9e2jRxdYtS4 $result := code→read_result($compilation, $response);
}
#HoO5mwqEQJs4SXH6
action read_result(#Uua7AMWMdYu8IQgm compilation: * Compilation_Request, #cHejrxiVMSDxKnDL response: Web_Response) returns(#Bzhkvuk7ykiaMQjO task: * Compilation_Result) {
  #OqgfFJ643mZ5Iw1k $task := records→Compilation_Result→create;
  #n18Wc4XcdZ5WIadM $task→payload := $response→content_as_json;
  #lo6MYuD2fDnEwZtk data→logger→debug("poll: " ∥ $response→status_code);
  #yaBW7jyK4iG1rbcd if $response→status_code = 200 then {
    #qg1NaJzuiYBwMI29 $js := $task→payload→field("result");
    #DBtvOn6HNGmWdTtU data→logger→debug($js→format(2));
    #Sg2ovcKl4lSFEIZ2 if $task→payload→string("task_status")→equals("finished") then {
      #mqbuBewiUO52juWC $task→completed := true;
      #CbkXQCTVYNhmpE9G $task→success := $js→string("compile_status")→equals("Succeeded");
      #xMyO8x7x9RiqWcPL $task→binary := $js→string("binary")→replace_regex("^http:", "https:");
      #efp4rLQ38yo62vZG $task→time_taken := $js→number("seconds");
      #JeNVTg6NfBhnlV7n data→logger→debug("completed, success: " ∥ $task→success);
    }
  }
  else {
    #MDdNksZDmkR8uPCS data→logger→error("poll failed, status: " ∥ $response→status_code ∥ ", content: " ∥ $response→content);
  }
  meta private;
  meta sync;
}
#xasU9RjeyGxberFm
action set_verbosity(#u04g8CKufU0RSdZZ level: String) {
  #UDRztuFsxMWeQF42 // Set the verbosity of log.
  #xOlpQpzP62r0H4a5 // {hints:level:info,debug,warning}
  #ly4NbO21N15EeXXV data→logger→verbosity := $level;
  meta sync;
}


