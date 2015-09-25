meta version "v2.2,js,ctx,refs,localcloud,unicodemodel,allasync,upperplex";
meta name "cached store";
meta rootId "lujm2mTx1JGDz8KWvyCccAAF";
meta isLibrary "yes";
meta allowExport "yes";
meta hasIds "yes";
meta platform "current";
meta parentIds "";
#E1R7ANTUvYBxJAZZ
action create_container(#xb3NCLKWt2WtA2Vd name: String, #mUEwUCeoEiOoxeNs options\u003f: * create_options) returns(#Cis3TzfLtx5jEI4n container: * container) {
  #UaYNMXvEosIAhVzb code→init;
  #GJpP6VAFjpD7PwaW $container := records→container→create;
  #F2XZonvfiQEqyMiL $container→name := $name;
  #jVdx9ETTOjUwKZnl if $options\u003f→access→equals("") then {
    #XrVa0zgqj5HSVMfU $options\u003f→access := "private";
  }
  #FqI9CInLEz05unq4 if $options\u003f→blob_service→is_invalid then {
    #x7HXT9TYkck78CUj $options\u003f→blob_service := data→blob_service;
  }
  #Bmk91MdlhwVoC9d4 if `not` $options\u003f→no_blob_storage then {
    #xw0vSNGbpY2CX37x $container→blob := $options\u003f→blob_service→create_container_if_not_exists($name, $options\u003f→access);
  }
  #Qr6P4WXoxVTVBICs $container→cache_enabled := `not` $options\u003f→no_cache;
  #cJIXmArKyNhn8Lti $container→cache_validity := $options\u003f→redis_cache_seconds;
  #xxQDHT75WXPj6AJ2 if $options\u003f→in_memory_cache_seconds > 0 then {
    #xUfPOQtatS9T97Lk $container→mem_cache_validity := $options\u003f→in_memory_cache_seconds * 1000;
    #YQkbfmEhXAxoRosW $container→mem_cache := web→create_json_builder;
    #BIIpfvzEzBJBXpur $container→mem_cache_secondary := web→create_json_builder;
    #xPcINZLdjEQur1fN $container→last_mem_swap := time→now→milliseconds_since_epoch;
  }
}
#xnT2K0w09TYjLRaq meta import azure_blob_storage {
  pub "imhj"
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
#BdGhpbmca
table container {
  type = "Object";
  persistent = false;
  fields {
    #fzICexu2TSzgCZ0E name : String
    #OAfcPwnOCAk494rp blob : ♻ azure_blob_storage → Container
    #hlkTPJQCx6jBQ27b cache_enabled : Boolean
    #GTWGgrqIPWFMRopr mem_cache_validity : Number
    #RB2YQorgJ2p3GlVG last_mem_swap : Number
    #xZdZOU83TlCJ2cxo mem_cache : Json_Builder
    #v5c2Kwd1b1aojWey mem_cache_secondary : Json_Builder
    #CZrkGLySbCFWJ7Bk cache_validity : Number
  }
}
#zCNv96KsmbUizuAD
var blob_service : ♻ azure_blob_storage → Blob_Service {
  transient = true;
}
#xcvnQ3QClD4JZ44B
action init() {
  #xN2300f1DdcRODsh if data→blob_service→is_invalid then {
    #GdAqZYWBpaIsLrbT data→blob_service := @\u267b→azure_blob_storage→create_blob_service;
    #Oemm122q2cLlXnmD if false then {
      #xEtuywnPd2rNPED2 data→blob_service→set_log_level("debug");
    }
    #tD2Ly4mPSLbl83mI data→redis_client := @\u267b→redis→create_client("", 0, "");
    #zi2wnNnmTEDYlVcp data→logger := app→create_logger("cache");
    #iqam54jIZfbVdlCI data→blob_timeout := 2000;
    #x7xOyUyGfr4VEXKG data→null_json := web→json("null");
    #cIU1wGyiOHbRFIuI data→bad_words_js := web→json(art→bad_words);
  }
}
#wmVcAr2qF2ublEoF
action try_insert(#tp8EkeTzerFWrGcv container: * container, #R2PZJlKUDgL2Yo3p name: String, #Gl2IwyceBSuq2ezn data_: Json_Builder) returns(#vGIhID8OBlypLUAS ok: Boolean) {
  #V2XCC8LFGtHw2f4a // Try inserting named entry into the cache.
  #eaEow2FGaA7KIlHx $data_→set_number("__version", 1);
  #yfFOU4hYfcM3Des9 $text := $data_→serialize;
  #kb4rFWvqn9mlVtOj $result := $container→blob→create_block_blob_from_text($name, $text);
  #tIFELgFWRWXMnqoD where force_new := true;
  #sIVugsbgSVehRJQI where just_try := true;
  #c7WxkoTJIhsD7kYL where contentType := "application/json; charset=utf-8";
  #gv1X0p9zJk6t217D where timeoutIntervalInMs := data→blob_timeout;
  #o4bAHbXanDKae1El $ok := $result→succeded;
  #Iq9uihRy6B2GH0Ht skip;
  #sHsMj4av8FK5uYEz if $ok then {
    #xL05UJPJm2oSAPZ4 code→save_cache($container, $name, $text, 1);
  }
  else { #A4zpgeIt2oQdELOc if false then {
    #v6z1MFbROZWLU0E2 data→logger→warning("failed to insert: " ∥ $result→error);
  }
  else { } } 
}
#tfUmlSQFFLkidnDo
action `type` update_json(#xfmbUWnAi4kH6bTe entry: Json_Builder) {
  #CgF2GiKDLnO1uf4U skip;
}
#xM95hDpBH9L3aWd2
action update(#syq45eDXNKZTbXkh container: * container, #dzxD3lljEyaNApNe name: String, #oZv2XiX2M4bztF12 update: * update_json) {
  #PsQuYulutgCcO349 // Fetch named entry, run `update` on it, and store the results. Repeat in case of race.
  #eHEDyrLaLQXOQt9f $blob := $container→blob;
  #Wx8MzBSiaCnPeJ9b $retries := 20;
  #xsVXmJ5zFCo9kvMC $sleep_time := 0.1;
  #a53twTGpQGcvznt5 while $retries > 0 do {
    #meFxDIra02wIa4q2 $info := $blob→get_blob_to_text($name);
    #jfz029Bo1MRrBCv4 where timeoutIntervalInMs := data→blob_timeout;
    #xalTPml8Q6ZMGbAm data→logger→debug("got text: " ∥ $name);
    #xjIvwXMxmW1IByEi $text := $info→text;
    #qRdDhbxTimml6F2X $is_new := false;
    #SdTNXAedkTPb9StT if $text→is_invalid `and` $info→error→equals("404") then {
      #x3omKBDmKEaWQq7t $text := "{}";
    }
    #rDvKLCVbg67Jkpih $jsb := web→json($text)→to_json_builder;
    #x1Fk69ZDTmw6UHgM $ver := $jsb→number("__version");
    #WhUf4ofa1vziY9Xm $update→run($jsb);
    #BPapUKL0tIJXeg67 if $ver→is_invalid then {
      #JfUV3p9fpvvrZMyY $ver := 1;
    }
    else {
      #czNBFObqwVDsoup0 $ver := $ver + 1;
    }
    #nXHBnpuUBcytB7Yb $jsb→set_number("__version", $ver);
    #O23c93Y7lguw7gvz $text2 := $jsb→serialize;
    #xD8h6BT284k0zwDi $result := $container→blob→create_block_blob_from_text($name, $text2);
    #xSyhpF0EQWOnmrTf where etag := $info→etag;
    #nu89meAsLm5dld6F where force_new := $is_new;
    #zSIvrmWW2YZh3kll where just_try := true;
    #xkbntQ4BQ6wDFre2 where contentType := "application/json; charset=utf-8";
    #cM2mBQIG2d3yRbtX where timeoutIntervalInMs := data→blob_timeout;
    #aqTZYBV1gZzLx4tg if $result→succeded then {
      #EPfrOT2KgVTFqH9O data→logger→debug("save OK: " ∥ $name);
      #JGayaUqa8van4c3m code→save_cache($container, $name, $text2, $ver);
      #xL5DY49D6KE30rbG data→logger→debug("cache OK: " ∥ $name);
      #avwQavPjURvPd9V9 $retries := - 1;
    }
    else {
      #xDlQTjACgn9jM1iW $retries := $retries - 1;
      #x4F2I6sXxBssw2IE $sleep_time := $sleep_time * (1 + math→random_normalized);
      #yiFPsFtjBst6wClI time→sleep($sleep_time);
      #xSWiDFmOug9Zz1AQ data→logger→info("save FAILED: " ∥ $name ∥ " sleep: " ∥ $sleep_time);
    }
  }
  #CyvFj2ZauNhQKL8R if $retries = 0 then {
    #V51J3kzsGdxWEg1j contract→assert(false, "atomic blob update failed, " ∥ $container→name ∥ "/" ∥ $name);
  }
}
#lrmshrqaVc7fqxUR
action save_cache(#x7bgi07eBYRHmpQV container: * container, #dUxcSiIIUNmgmn1p name: String, #FIOnUS4Wi2tyqOtt val: String, #Z7QQPzVo2ZzlZIGb ver: Number) {
  #gWhIc68fooGkCSc9 code→save_mem_cache($container, $name, $val);
  #Aa3ncsZhiZg9OwDl if $container→cache_enabled then {
    #xkZjA7rnOUC1OVj4 $root := "c:" ∥ $container→name ∥ "/" ∥ $name;
    #xKxRB2qFwZQGJq46 if $container→blob→is_invalid then {
      #zcVLFvJ084BB862l if $container→cache_validity > 0 `and` `not` $name→starts_with("@") then {
        #WH7WtcYqsYqkQa1Q data→redis_client→setpx($root ∥ ":data", $val, $container→cache_validity * 1000);
      }
      else {
        #nFQakRe2k3MlNcbU data→redis_client→set($root ∥ ":data", $val);
      }
    }
    else {
      #eWKstyfWxGH3wma0 $keys := collections→create_string_collection;
      #vAH2ovQkx3jOje6R $keys→add($root ∥ ":version");
      #ZwN42G1i1rMktWd2 $keys→add($root ∥ ":data");
      #IvzeiTBQLvpJZUoN $args := collections→create_string_collection;
      #dZIRaqNxts1tgvgv $args→add($ver→to_string);
      #H27XE5dj0UkP5qpJ $args→add($val);
      #xA6gV1PF8E9kxmUL if $container→cache_validity > 0 then {
        #niX2ydogdmwkQsNs $args→add($container→cache_validity→to_string);
        #d5iTnaVHZ2HwpDKC $value := data→redis_client→eval("local curr = tonumber(redis.call(\'get\', KEYS[1]));\nif not curr then curr = 0 end;\nif curr < tonumber(ARGV[1]) then \n   local ex = tonumber(ARGV[3])\n   redis.call(\'set\', KEYS[2], ARGV[2], \'ex\', ex); \n   redis.call(\'set\', KEYS[1], ARGV[1], \'ex\', ex + 1);\nend", $keys, $args);
      }
      else {
        #kAUCJBsjnz6FiJhd $value := data→redis_client→eval("local curr = tonumber(redis.call(\'get\', KEYS[1]));\nif not curr then curr = 0 end;\nif curr < tonumber(ARGV[1]) then \n   redis.call(\'set\', KEYS[2], ARGV[2]); \n   redis.call(\'set\', KEYS[1], ARGV[1]);\nend", $keys, $args);
      }
    }
    #Vkp2pxtvQT85RPx5 if false then {
      #ciIxDtNLa4TcM464 // watch root:version
      #xrBY2Ts3wUE5gmoh // v = get root:version
      #CsUSbl2qYPKEZXte // if v < ver then
      #h30LHrf5gw4wEvUW // multi
      #pkpZaZzH9isHTUjN // save root:version ver
      #dERPJbVR9oITo7IK // save root:data val
      #BIHS1Y5Cqe95fJGP // exec
      #fR32FVZxoh2QUlmb // if failed repeat
      #r4gnJGN9mQJm992Y // end if
    }
  }
  meta private;
}
#cajgJQ3uebtEemz0
action get(#E41Y9YxwUJvif5po container: * container, #bLi9bxr9lPRdPcF2 name: String) returns(#UhOx6PL4mZJ0dgoC entry: Json_Object) {
  #yk3CcN4JlGUbHUeg // Fetch named entry.
  #CYQtcPgYIiiFdFPK $text := code→get_from_cache($container, $name);
  #asiIFOLNw2b8i4Nc if `not` $text→is_invalid then {
    #qpG6ddz8J3ESaaY7 `return` web→json($text);
  }
  #VeG4UJ4aKwIyy82A if $container→blob→is_invalid then {
    #xezvmiJEUGOJjJQd `return` invalid→json_object;
  }
  #v9FcxPfkj1Ep8Xxn $info := $container→blob→get_blob_to_text($name);
  #PMj4MAdjgDVPRpiU where timeoutIntervalInMs := data→blob_timeout;
  #rCh7s2vcesxTMgmo $text := $info→text;
  #xW7W8xlXN1tapGRa if $text→is_invalid then {
    #DZIpntupJ4rBMV7r $entry := invalid→json_object;
  }
  else {
    #JQsxkJLjFeMHnC8A $entry := web→json($text);
    #xTZYognc0e601Y7E code→save_cache($container, $name, $text, $entry→number("__version"));
  }
}
#PuL2pjKINO1ckVhH
action insert_unique(#xvaaBAXFZtS2LmFU container: * container, #xpm7yyxYoMNSrYjt data_: Json_Builder, #ZFQZhsOKq20n2ugD min_id_length: Number) returns(#FpmrzjHKao2V8rnH id: String) {
  #gqlwX4fDVSNfiML7 // Insert entry at a freshly generated unique id.
  #oCjsL5gGj2mjxQRP $retries := 5;
  #xDJ5I0aeQGPGUz9W $collisions := $retries;
  #b37n4g5D34gS83AP $len := $min_id_length;
  #Gw4ucJfrzcf1DJ00 $id := "";
  #x3mtuUkZxunf9BZ0 while $collisions > 0 do {
    #XmNyDamL4QtHkb7L $id := code→fresh_short_id($min_id_length);
    #IMkad1ai6DggPiNG $data_→set_string("id", $id);
    #xVxNIv04QLiPVUa4 $ok := code→try_insert($container, $id, $data_);
    #jg05I2gt7kdIdew4 if $ok then {
      #mRXT2U43pOs7MR4e $collisions := - 1;
    }
    else { #xJNFWkPWKFGeK7HB if $collisions = 1 then {
      #WUQkcSF7XyesCM3v $collisions := $retries;
      #YC4UWQsv1igFroXp $len := $len + 1;
    }
    else {
      #xSPpa7QGQxd1PxoR $collisions := $collisions - 1;
    }
    } 
  }
}
#GF24w4lPaMMkTCLL
action fresh_short_id(#rRX0HsDtBJR2mw2Q len: Number) returns(#H8Trn0aOeiYujW4C id: String) {
  #QfssohPNXPS2UnFk $id := @\u267b→azure_blob_storage→create_random_id($len * 4)→replace_regex("[^a-zA-Z]", "")→to_lower_case→replace_regex("^[acegikmoqsuwy]*", "")→substring(0, $len);
  #xH26Io4M0DkbXD6R if $id→count < $len `or` code→is_bad_word($id) then {
    #gpJfCXNTl0zvFLuI $id := code→fresh_short_id($len);
  }
  meta sync;
}
#Q2RziPeWiFdvEPNo
action get_from_cache(#lx2vMMnjaj7fR84V container: * container, #CuC0DwmBb0pgtKZ2 name: String) returns(#Kxe97ExBayncJXfr text: String) {
  #ANd4vEfVIdqeU44L $text := invalid→string;
  #YOXhbdUZeBFUAOBI if $container→mem_cache_validity > 0 then {
    #xRVo4hBi4SqMqd0l $now := time→now→milliseconds_since_epoch;
    #qDGDDpUUkV1xvFc4 code→swap_mem_caches($now, $container);
    #x13lAv6PmnS52D0D $v := $container→mem_cache→number($name);
    #W5Kw2Lyc2kd4htQo if $v→is_invalid `or` $now - $v > $container→mem_cache_validity then {
      #BVjov9vnwT0wcXRT $v := $container→mem_cache_secondary→number($name);
      #TV4290FhKj7nMJgv if $v→is_invalid `or` $now - $v > $container→mem_cache_validity then {
        #AQoWiC2jVqPFgiZD skip;
      }
      else {
        #bEkkrUETVYnaCgB6 $text := $container→mem_cache_secondary→string($name ∥ ":data");
      }
    }
    else {
      #pw8IimvYPCI6EbbQ $text := $container→mem_cache→string($name ∥ ":data");
    }
  }
  #PQ72Xk0o4oWQBjyS if $text→is_invalid `and` $container→cache_enabled then {
    #NzkUNWgNArGZjzDy $root := "c:" ∥ $container→name ∥ "/" ∥ $name;
    #dOPIPeI4oeSYsd1x $text := data→redis_client→get($root ∥ ":data");
    #YObNA8IN38x5HRYy if `not` $text→is_invalid then {
      #h3lIkq8pxOkX1MT5 code→save_mem_cache($container, $name, $text);
    }
  }
  meta private;
}
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
#agFHZuujI8F0b222
action insert_at_hash(#QV4ML2nJEJBfD4pa container: * container, #x4nw4AGFOAV4FLP2 entry: Json_Builder) returns(#J4LOg7a1F5QUXZWd id: String) {
  #e2Rsn0IflUCYV5OL // Try inserting named entry into the cache.
  #psouiI0u7yW9h2tv $text := $entry→serialize;
  #FyWHdxHf7WfkbU14 $hash := @\u267b→node_crypto→create_hash("sha256");
  #MLb2M7PkGzN42UD4 $hash→update_hash_string($text);
  #WO45w0pSD7XN43Ht $id := $hash→digest_hash→to_string("hex")→to_lower_case;
  #zw4AwnH8MoogcDK7 $result := $container→blob→create_block_blob_from_text($id, $text);
  #eVf48jFfPcgd97IX where force_new := true;
  #i20WP4Q3MKrNOKcM where just_try := true;
  #zWZCucvRJfZ0HdN4 where contentType := "application/json; charset=utf-8";
  #POq2ZSm9Zkei7rtE where timeoutIntervalInMs := data→blob_timeout;
  #GJMOuS6T2hkjTQbu if $result→succeded then {
    #nuqOuGZ3ELXxd54D code→save_cache($container, $id, $text, 0);
  }
}
#s3mk2o6oRh7Q4Uit meta import node_crypto {
  pub "dhdlrqee"
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
  }
}
#JkJTyNPpqftWqdLR
action name(#xNwGo7jD1hcd5Ke9 container: * container) returns(#qHHTlhCh601Cc4Ib name: String) {
  #Ckm4lyAkkUa6bDmk // Get the name of the blob container.
  #wox4InkLpqxDnq3Z $name := $container→name;
}
#Y35gYZZ3I4NKo20V meta import redis {
  pub "wiefc"
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
  }
}
#ZPP7stMjBfr25VRV
var redis_client : ♻ redis → Client {
  transient = true;
}
#AK8SHzkiX26gqRP2
action get_many(#xx2c3lJr1eOl444G container: * container, #xNi4284Bx9rXelNH names: Collection[String]) returns(#jCkwUzmmyxKT2bHe entries: Collection[Json_Object]) {
  #SeAMGllu6ruw8n9X // Fetch a number of entries at once.
  #aWODPq585rBWQVkz if $names→count > 0 then {
    #BuWe4PaXCkgTYivo $pref := "c:" ∥ $container→name ∥ "/";
    #x83R7GZVYbyvGVe9 $name_map := web→create_json_builder;
    #RjkDYVamid04feDU $idx_map := create→Collection_of→Number;
    #G1V1oEiHnc57KKUK $names_unique := create→Collection_of→String;
    #pnpzhh6VOJZh8cmz foreach name in $names
    do {
      #xnRgSkWU2LlmAviH if $name_map→contains_key($name) then {
        #Lu3v0XNXIeW6uxoV $idx_map→add($name_map→number($name));
      }
      else {
        #BjmvxtahaNr8H4ce $idx_map→add($names_unique→count);
        #x90zXrILJWBOU5KJ $name_map→set_number($name, $names_unique→count);
        #x4wXyw4NZXXoAKMl $names_unique→add($name);
      }
    }
    #x888nIOyLN5mg8hK $names := $names_unique;
    #zTGpA83UGCM8saE7 $values := data→redis_client→mget($names→map_to→String( `fun:elt` $pref ∥ code→or_empty($elt) ∥ ":data"));
    #xS8Wxvk2yYB1Dlxr $coll := create→Collection_of→Task_of→Nothing;
    #ZO4lllNPrTnNe4QF $jsb := $values→to_json_builder;
    #HbWaDEydvw4QbKLw if `not` $container→blob→is_invalid then {
      #aMEuZur6TD42KtMs for 0 ≤ i < $names→count do {
        #VJdV7bkvFs2wasex if $values→at($i)→to_string→is_invalid `and` `not` code→or_empty($names→at($i))→is_empty then {
          #uHWQS947bRGkR3us $task := `async` code→fetch_from_blob($container, $names, $i, $jsb);
          #AuhTPLDZKczxaJeh $coll→add($task);
        }
      }
    }
    #VSBU9Unm1y49O4G4 foreach task2 in $coll
    do {
      #xdjHTmjs43nPzX9X $task2→await;
    }
    #FDJl4dRH0OBbpOIu $entries := create→Collection_of→Json_Object;
    #NIMGkvcuGDqvDiGE foreach idx in $idx_map
    do {
      #oGk0VCD22L2Fhrdg $elt := $jsb→at($idx);
      #xqxsCxUt8pN925cn if $elt→is_invalid `or` $elt→kind→equals("null") then {
        #T2kMqQUG6ulZJv7C $entries→add(data→null_json);
      }
      else {
        #dkQbJRF5tb8OwfJ2 $entries→add(web→json($elt→to_string));
      }
    }
  }
  else {
    #DlqGp7d6BI0P2YJP $entries := create→Collection_of→Json_Object;
  }
}
#xU85LXnNowV6wLA2 meta import parallel {
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
#v920wCnuIncnhBt4
action fetch_from_blob(#s0qdESa2TaIe4RQY container: * container, #R9aS8nWRh7rEw15s names: Collection[String], #CA4gj2r2GeK2XRH8 i: Number, #o10NdaZAwHvC21iu values: Json_Builder) {
  #BVEbaQk5Kk40ov4t $info := $container→blob→get_blob_to_text($names→at($i));
  #Lryw4jY7Gzb9FJNE where timeoutIntervalInMs := data→blob_timeout;
  #xS27uMp2bCjjYEiy if `not` $info→text→is_invalid then {
    #nyyoMz0hYkQSRn61 $values→set_at($i, $info→text→to_json→to_json_builder);
    #xDDOPU4L2QbscWcz $js := web→json($info→text);
    #vklyiU446xKtciNw code→save_cache($container, $names→at($i), $info→text, $js→number("__version"));
  }
  meta private;
}
#pGgR2gxcNtU2hMOF
var logger : App_Logger {
  transient = true;
}
#HtxvpZVP4AcG2oNH
action blob_container(#RfUEQLJl4WJjIwCQ container: * container) returns(#xq7RsA4M7g53zmLz blob_cont: ♻ azure_blob_storage → Container) {
  #ZfzdwmUY44zlyug5 $blob_cont := $container→blob;
}
#MaH6ZsiASK7Egbc7
var blob_timeout : Number {
  transient = true;
}
#jvU8EFT4y3J6Bif1
var null_json : Json_Object {
  transient = true;
}
#jTtRr5bmxTzy2S7e
action swap_mem_caches(#Yb106aacnZ70ra5W now: Number, #eHMD3k7BBGVOb4vy container: * container) {
  #xi07DvDW5Zy7e2HY if $now - $container→last_mem_swap > $container→mem_cache_validity then {
    #ISUzRhmX5fsYibgb $container→mem_cache_secondary := $container→mem_cache;
    #vgoieoGLVPpURPok $container→mem_cache := web→create_json_builder;
    #aEG0RSbMWweeoVdN $container→last_mem_swap := $now;
  }
  meta private;
  meta sync;
}
#hjgByYOgYYTQ4FX2
action is_bad_word(#N4hUkQADagTBplzZ s: String) returns(#mHZzWFQp9to1raQt bad: Boolean) {
  #q4Hr8N4C5sAKSVMX $bad := false;
  #SPVYky0D2fCR67A7 for 0 ≤ j < $s→count - 3 do {
    #U62aWzcZXfwBqmnm $ptr := data→bad_words_js;
    #xfAb8a7O84guFQSB $s2 := $s→substring($j, $s→count - $j);
    #xHrNu0JCZqrrzPJl foreach letter in $s2
    do {
      #ilP9Ci54Ii8slrlF if `not` $ptr→is_invalid then {
        #qClidVn2W0NIGQrr $js := $ptr→field($letter);
        #I5zReHHdHaDoJb81 if `not` $js→is_invalid `and` $js→kind→equals("number") then {
          #zfM7mxbvvvktreDP $bad := true;
        }
        else {
          #Z4zTx4aa1Tgy2tG1 $ptr := $js;
        }
      }
    }
  }
  meta private;
  meta sync;
}
#xKXPdpxg1jvtLNUQ
var bad_words : String {
  is\_resource = true;
  url = "data:text/plain;base64,e2E6e246e2E6e2w6MX0sdTp7czoxfX0scjp7cjp7czp7ZToxfX0sczp7ZToxfX0sczp7czoxfSxoOntvOntsOntlOjF9fX19LGI6e2E6e2w6e2w6e3M6MX19fSxpOnt0OntjOntoOjF9fX0sbzp7bjp7ZTp7cjoxfX0sbzp7YjoxfX0sdTp7bToxLHQ6e3Q6MX0sczp7dDp7eToxfX19LGI6e3c6MX0sZDp7czp7bToxfX19LGM6e2E6e3c6e2s6MX19LGg6e2k6e246e2s6MSxjOjF9fSxvOnthOntkOjF9LGQ6e2U6MX19fSxpOntwOnthOjF9fSxsOntpOnt0OjF9fSxuOnt1Ont0OjF9LHQ6e3M6MSx6OjF9fSxvOntjOntrOjF9LGs6MSxvOntuOjF9LHg6MX0scjp7YTp7cDoxfX0sdTp7bToxLG46e3Q6MX19fSxkOnthOnttOntuOjF9LGc6e286MX19LGk6e2M6e2s6MX0sbDp7ZDp7bzoxfX0sbjp7azoxfSxyOntzOnthOjF9fSxrOntlOjF9fSxsOntjOntrOjF9fSxvOntvOntzOntoOjF9fX0sdTp7Yzp7aDp7ZToxfX19LHk6e2s6e2U6MX19LHY6e2Q6e2E6MX19LGU6e2c6e2c6e286MX19fX0sZjp7dTp7Yzp7azoxfSxrOjEseDoxfSxhOntnOjEsbjp7bjp7eToxfSx5Ont5OjF9fSxpOntnOjF9LHI6e3Q6MX19LGM6e3U6e2s6MX19LGU6e2M6e2s6MSxhOntsOjF9fSxsOntjOntoOjF9fX0sbzp7bzp7azoxfX19LGg6e2U6e2w6e2w6MX0sczp7aDp7ZToxfX0sZTp7YjoxfX0sbzp7YTp7cjoxfSxlOjEsbTp7bzoxfSxyOntlOjEsbjp7eToxfX0sbzp7cjoxfX0sdTp7YzoxLGs6MX0saTp7dDp7dDp7eToxfSx5OjF9fSx5Ont0OjF9fSxqOnthOntwOjF9LGk6e3M6e206MSxpOnttOjF9LHM6MX0sejoxfSx1OntnOntnOntzOjF9fX19LGs6e2E6e3c6e2s6MX0sbjp7azp7eToxfX19LG46e286e2I6MX19LG86e2M6e2s6MX0sbzp7Yzp7aDoxfX19LHU6e206MSxuOnt0OjF9fSxpOntrOntlOjF9LG46e2s6e3k6MX19fSxyOnthOnt1Ont0OjF9fX0seTp7azp7ZToxfX19LGw6e2E6e2I6e2k6e2E6MX19fSxtOntmOnthOntvOjF9fX0sdTp7czp7dDoxfSx0Ont0Ont5OjF9fX0sZTp7czp7Yjp7bzoxfX19LG86e3c6e286e2I6MX19fSxpOnt0OjF9fSxtOntvOntmOntvOjF9fSx1OntmOntmOjF9LHQ6e2g6e2E6MX19fSxpOntsOntmOjF9LGM6e2s6MX0sbjp7Zzp7ZToxfX19fSxuOnthOnt6OntpOjF9LHM6e3Q6e3Q6MX19fSxpOntnOntnOnthOjF9LHU6e3I6MX19LGk6e2c6e3I6MX19fSxvOntiOjF9LGU6e2c6e3I6e286MX19fSx1OntkOntlOjF9fX0scDp7YTp7dzp7bjoxfSxuOnt0Ont5OjF9fSxrOntpOjEseToxfSxjOntrOntpOjEseToxfX19LGU6e246e2k6e3M6MX0sYTp7czoxfSx1OntzOjF9fX0saDp7dTp7Yzp7azoxfSxrOjEscToxfX0saTp7czp7czoxfX0sbzp7bzp7cDoxLGY6MSxuOjF9LHI6e246MX0sbDp7YTp7YzoxLGs6MX19fSxyOntpOntjOntrOjF9fSxvOntuOjF9fSx1OntiOntlOjF9LHM6e3M6e2U6MSxpOjEseToxfX0sbjp7dDp7YToxfX0sdDp7bzoxfSx1OntrOntlOjF9fX0sdDp7aDp7YzoxfX19LHM6e2g6e2k6e3Q6MSx6OjF9LGE6e2c6MX0sbzp7dDp7YToxfX19LGU6e206e2U6e246MX19LHg6MX0sazp7YTp7bjp7azoxfX0sZTp7ZTp7dDoxfX19LGw6e3U6e3Q6MX19LG06e3U6e3Q6MX0sZTp7ZzoxfX0scDp7YTp7YzoxfSx1OntuOntrOjF9fSxpOntjOjF9LG86e286e2s6MX19fSxjOnthOnt0OjEsbjp7azoxfX19LHU6e2M6e2s6MX19fSx0OntlOntlOnt0OntzOjF9LHo6MX19LGk6e3Q6MX0sdTp7cjp7ZDoxfSxzOntoOnt5OjF9fX0sdzp7YTp7dDoxfSx1OntuOnt0OjF9fSxpOntuOntrOjF9fX0sYTp7cjp7ZDoxfX19LHY6e3U6e2w6e3Y6e2E6MX19fSxhOntqOntqOjF9LGc6MX19LHc6e2E6e246e2c6MSxrOjF9fSxoOntvOnthOntyOjF9LHI6e2U6MX19fSxpOntsOntsOnt5OjF9fX0sbzp7cDoxfX0seDp7eDp7eDoxfX0sZTp7Yzp7Yzp7aDp7aToxfX19LG46e2U6e206e2E6MX19fX0sZzp7cjp7bzp7cDp7ZToxfX19LHM6e3A6e286e3Q6MX19fSx1OntyOntvOjF9LGk6e2Q6e286MX19fSxhOnt5OjF9LG86e286e2M6e2g6MX0sazoxfX19LG86e3I6e2c6e3k6MX19fSxxOnt1OntlOnthOntmOjF9LGU6e2Y6MSxyOjF9fX0sdzp7ZTp7aTp7cjoxfX19fSxyOnthOntwOntlOjF9fSxlOntuOntvOntiOjF9fX0sdTp7czp7azp7aToxfX19fSx5OnthOntvOntpOjF9fSxpOntmOntmOnt5OjF9fX19LGk6e2E6e3Q6e2M6e2g6MX19fX0sdTp7azp7YTp7aDoxfSxlOntuOjF9LGk6e246MX0sazoxfX19Cg==";
  transient = true;
}
#crQj2snOmYknjFdE
var bad_words_js : Json_Object {
  transient = true;
}
#jbMj1OkfCEKHR1qT
action or_empty(#x54pBeFB4ANPq0Ve s: String) returns(#crlxMBEUcXeLdeCz r: String) {
  #Plf7PaQ95NL2Pd37 if $s→is_invalid then {
    #MmF5jNH2TNslR1iL $r := "";
  }
  else {
    #GZCq4CBABxh7f0dK $r := $s;
  }
  meta private;
  meta sync;
}
#HzyFyqfGr6SQKnfM
action now() returns(#XfhGteotrzjGq6mo ms: Number) {
  #gswJ4QM2j5MX8Odq $ms := data→redis_client→cached_time;
}
#bEPH8bG83jt7i0eE
action now_seconds() returns(#xcDXNpcTEs22wzvN sec: Number) {
  #JBHp5RyFhbF80ckR $sec := math→round(data→redis_client→cached_time / 1000);
}
#mYH1bPYFky8yRp8t
action seq_id() returns(#gIBWa8omficGeUss id: Number) {
  #yCKgQd5CXCY3l708 // Return a globally sequential number.
  #YSxlHCvRaRsdOca6 $id := data→redis_client→incr("cached-store:seq-id");
  #iAI02QdGKkkVgaMT if $id < 10000000 then {
    #x7pggKeZCAH9hYXA $micros := math→floor(data→redis_client→server_time / 1000) * 1000000;
    #uqTKumsMNvkfWntT data→logger→info("setting seq id for the first time, t=" ∥ $micros→to_string);
    #ICEh5CEyqobVV767 $ok := data→redis_client→setnx("cached-store:seq-id-initial", $micros→to_string);
    #Qb8MOGWQWTN2caUA if $ok then {
      #R7i4ip7CVMCpJkDk data→logger→info("seq id initialized, t=" ∥ $micros→to_string);
      #xcDcUEbrOYfytWsu data→redis_client→set("cached-store:seq-id", $micros→to_string);
      #kstekQ4r418SLB0S $id := $micros;
    }
    else {
      #xoQ02Tc6axAjVAjz data→logger→info("seq id race, t=" ∥ $micros→to_string);
      #KvrN4QBHHpErgTz2 $id := code→seq_id;
    }
  }
}
#x4Qy8tQu43dneC2N
action inv_seq_id() returns(#LKmhoTjYG42V2Gzc id: Number) {
  #l2lAn8TKY1Pg9u3r // Return a globally sequential number in decreasing order.
  #xJj6RH5Qf8ewdC2m $id := 9000000000000000 - code→seq_id;
  #i5S72uGxS257B9EN // Note that 9e15 above is close to max precise integer range of double, so it should not be increased. This is good until around year 2255.
}
#xRcvR9lHX6XxoXHK
action logger_() returns(#UaLkUXFJS2YtI3gz log: App_Logger) {
  #ZZqbctcZ7ObqmkGb $log := data→logger;
  meta sync;
}
#TkagGZFxi0y6Iy4k
action just_insert(#xQzcAefkHEO47iXc container: * container, #Me2KzwxfkssJUCIW name: String, #oOkbZTAPdTPjJ2ft data_: Json_Builder) {
  #x7Skk4sVdkNRYoc2 // Inserting named entry into the cache, overwriting whatever was there.
  #TozeV5iaJV7pbtnE $data_→set_number("__version", 1);
  #KrtK5aZsbBlBeCZY $text := $data_→serialize;
  #AhA41kAOSfJ2SCNP if `not` $container→blob→is_invalid then {
    #q8tOBkjlI4m07vcA $result := $container→blob→create_block_blob_from_text($name, $text);
    #BxAlj7WbQVX7t4JA where force_new := false;
    #Ea3ka9lEaOHnjAIu where contentType := "application/json; charset=utf-8";
    #PBdfjtlCpCcejCIJ where timeoutIntervalInMs := data→blob_timeout;
    #pCsNapde6zJUmj2a $ok := $result→succeded;
  }
  #xYdE8JaqPBPA4OWL code→save_cache($container, $name, $text, 1);
}
#Hbg5EQQsjUqNsV7l
action save_mem_cache(#CmtRBKxW8Hh9tmZK container: * container, #viGzJhG29f8NCoFE name: String, #QmABXLuy88c1We0B val: String) {
  #xKd2je5GFgC314dP if $container→mem_cache_validity > 0 then {
    #z0awrkWUv6fl7lAF $now := time→now→milliseconds_since_epoch;
    #huNY9hT81sGjD7BM code→swap_mem_caches($now, $container);
    #R5Ja1ZqVpROXS0g2 $container→mem_cache→set_number($name, $now);
    #OIPiuCYekW0rL2QF $container→mem_cache→set_string($name ∥ ":data", $val);
  }
  meta private;
  meta sync;
}


