meta version "v2.2,js,ctx,refs,localcloud,unicodemodel,allasync,upperplex";
meta name "indexed store";
meta rootId "jneRG5DYdNE1u4WTIofu6hjn";
meta isLibrary "yes";
meta allowExport "yes";
meta hasIds "yes";
meta platform "current";
meta parentIds "";
#sZIRurSNMRRrLPeC
action create_store(#YExDbvPXtkm1PT9t container: ♻ cached_store → container, #xT2297Q5Y1IFgc1r kind: String, #xq8ioAFiuqqo5pPo options\u003f: * create_store_options) returns(#KwOQwWgXhHEfwyEM store: * store) {
  #brFtZS0sdYQjk1IW $store := records→store→create;
  #JzAAtVyfti8jM0e3 $store→container := $container;
  #WeRRY45yvPd1VO7P $store→kind := $kind;
  #ZtVDXJaaSGJDbgqx $store→indices := create→Collection_of→\u2339index;
  #v4HaYoueb54ZGcSp $store→client := $options\u003f→table_client;
  #UmHFXYcldXJ9pVh2 if $store→client→is_invalid then {
    #X3vCrzYqeIrOO23u $store→client := data→client;
  }
  #KNz2ww3J4wvOr8KZ code→create_index($store, "*", `fun:entry` "all");
  #jZqGTqiTfrV2ieZp records→stores_by_kind_index→at($kind)→store := $store;
}
#IWov4sPl2dNin0H3 meta import cached_store {
  pub "wjsh"
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
  #UxG9494ug1ELQ6wY resolve azure_blob_storage = ♻ azure_blob_storage with {
  }
  #sVMd4tf8x2B9HO1s resolve node_crypto = ♻ node_crypto with {
  }
  #DJvx5HIaLAZnics4 resolve redis = ♻ redis with {
  }
  #jUHkM4oB4Fr4G4HB resolve parallel = ♻ parallel with {
  }
}
#xpcj2t36O1kJSfKM meta import azure_blob_storage {
  pub "ypmve"
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
#J2YPQiGsxpDdOPOg meta import node_crypto {
  pub "qhlpe"
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
    action `async` random_bytes(size: Number) returns(strong_data: Buffer)
    action `sync` DEFAULT\_ENCODING() returns(default_encoding: String)
    action `sync` create_hmac(algorithm: String, key: String) returns(hmac: ♻ node_crypto → hmac)
    action `sync` create_DiffieHellmanWithPrime(prime: Buffer) returns(DiffieHellman: ♻ node_crypto → DiffieHellman)
    action `async` pseudo_random_bytes(size: Number) returns(non\u002dstrong_data: Buffer)
    action `sync` update_hash_string(hash: ♻ node_crypto → hash, hash_data: String)
    action `async` new_guid() returns(guid: String)
  }
}
#BdGhpbmca
table store {
  type = "Object";
  exported = true;
  persistent = false;
  fields {
    #x2475X4YCtTV4tFf container : ♻ cached_store → container
    #xY8v5gzBC5XB24Om kind : String
    #Iq42L422QrmoKQ6I indices : Collection[ * index]
    #xiyrKMqBxripK6Q5 client : ♻ azure_table → client
  }
}
#xp7rkM2zn82O2jkz
action create_index(#cKgH9gfa0Npk2IlO store: * store, #ccKpTbZvFIj9nnya name: String, #u08ftaqXAGsc48Ls to_key: * to_key) returns(#A7FCP3luaIP5auDy index: * index) {
  #s8W3f2MDciIEzMy9 // Make it possible to get all elements `e` sharing `to key(e)`
  #x5qrp0HVynITwh0S // {action:ignoreReturn}
  #a6TRPn70W98aaoQI $index := records→index→create;
  #lQuFExLIK4YktPoD $index→parent := $store;
  #MnVnd9Ylq8AZCtLL $index→name := $name;
  #kz7bAgoc2kzeoxN2 $index→key := $to_key;
  #thDMMRWcJ4nwzVkO $name2 := "idx" ∥ $store→kind ∥ $index→name;
  #wTkV6UhaYQ441s7B if $index→name→equals("*") then {
    #deSsm4hZu3P7jUch $name2 := "idxall";
  }
  #xpD98O42Vu3q5I0B $index→@table := $store→client→create_table_if_not_exists($name2);
  #KLk5dyQQkAmpz2Z4 $store→indices→add($index);
}
#C4IOb8f8l6MxwATk
table index {
  type = "Object";
  persistent = false;
  fields {
    #QofkZ55H0DxHeZw4 parent : * store
    #x8cNKPqSyRJLWiDY name : String
    #ye3EeUnq0vujANwY key : * to_key
    #xKCntvgjCrZhdNGL @table : ♻ azure_table → @table
  }
}
#mns2uXQlUALP7jTC
action `type` to_key(#FPQQd1iNhyh19HbI entry: Json_Builder) returns(#p2Kni2wmfpdab49W key: String) {
  #GLy54S9dS3XKH2Ws skip;
  meta sync;
}
#McXLlnqJuaX474r7
action insert(#mCP64RlzJrgk8Q0d store: * store, #ZHYIZPs2MsX9b96U bld: Json_Builder) {
  #Xrug6e0EVTbaqEc7 $bld→set_string("kind", $store→kind);
  #dhl1gA1v9HXrl4yG $id := $bld→string("id");
  #CktfB9G4bSBppIO5 $bld→field("pub")→set_string("id", $id);
  #MKotvro3XUvfcqi7 $bld→field("pub")→set_string("kind", $store→kind);
  #xwNMYLKk7t7HXzuq $timestamp := $bld→field("pub")→number("time");
  #Gj58EajDEkxB46jg if $timestamp→is_invalid `or` $timestamp = 0 then {
    #pokg612N2pbW7RB4 $timestamp := @\u267b→cached_store→now_seconds;
    #ZricFoBON313OzqX $bld→field("pub")→set_number("time", $timestamp);
  }
  #xzNvvAF63uZy13kS $indexId := 10000000000 - $timestamp ∥ "." ∥ @\u267b→azure_table→create_random_id(8);
  #vtxfGPj32INetllg @\u267b→parallel→@for($store→indices→count, $@action);
  #xZQZgnXyt3yLV141 where @action(x: Number) {
    #hq6InhAOTrRNWTYA $index := $store→indices→at($x);
    #aD0f2ndqFlMt6KN3 $key := $index→key→run($bld);
    #sXFj2D256x7Q6xaI contract→assert( `not` $key→is_invalid, $id ∥ ": " ∥ $index→name ∥ " invalid");
    #An97mt4MgQPcNghR if `not` $key→is_empty then {
      #wJJwXIytrd49hQ4o $entity := @\u267b→azure_table→create_entity($key, $indexId);
      #f8gZ37G8OvAT3fiS $entity→set_string("pub", $id);
      #mF5aYaA5i3cwOt9R // conflict may happen here on connection restart
      #zErGotreyQ3oHjct $index→@table→insert_entity($entity→to_json, "or merge");
    }
  }
  #s7VPerGYldY85yGk $bld→set_string("indexId", $indexId);
  #xUE8aEXhYQkbp1KF $new_entry := $bld→to_json;
  #MhzrPIEft649oQuR $store→container→update($id, $update);
  #xKgtrSpI7RGdVTen where update(entry: Json_Builder) {
    #tPDoJExpq7ckZYj4 $prev_kind := $entry→string("kind");
    #b8QiATFP62sB7Pcl if $prev_kind→is_invalid `or` $prev_kind→equals("reserved") then {
      #dxLKUGS2zDgOIZCD $prev := $entry→field("pub");
      #UO507zzvF3FIDNUR code→copy_json($new_entry, $entry);
      #fdnvj47wbWEtdIWT // This is in case we incremented some counters before the publication was finalized.
      #OWsfGgDaOsWAB4Im if `not` $prev→is_invalid then {
        #vIbwkSPP0sS4wv4v code→copy_json($prev→to_json, $entry→field("pub"));
        #brCVhb4F4nMyJ4wC $entry→field("pub")→set_string("kind", $store→kind);
      }
    }
    else { #UOcM5hpue6fM3TTP if $entry→string("indexId")→equals($indexId) then {
      #Ry6wcg1gsCzBWRLc data→logger→debug("mis-reported azure error inserting for " ∥ $id);
    }
    else {
      #RvIlk4CQpysO4CdI contract→assert(false, "conflict inserting " ∥ $id);
    }
    } 
  }
}
#xtoRbTn24UlkdQzJ meta import azure_table {
  pub "ylpec"
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

    action `async` create_client(options\u003f: ♻ azure_table → Init_Options) returns(client: ♻ azure_table → client)
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
    action `async` assume_tables_exists()
    action `sync` create_reverse_log_id() returns(id: String)
    action `async` try_delete_entity(@table: ♻ azure_table → @table, entity: Json_Object) returns(ok: Boolean)
  }
}
#ORHdnJf39wS3QR1k
action fetch(#PC4tNgRlBBWuzAw8 index: * index, #adE4q4VbRjDXK4Ju key: String, #CRbkVEmi99sDG5G4 options: Json_Object) returns(#L9F2eXWzy14hYrSH fetch_result: * fetch_result) {
  #Ik4vPkwv4TQLd0mK $table_query := $index→@table→create_query→partition_key_is($key);
  #bR2iScQvRghultKb $entities := code→execute_table_query($table_query, $options);
  #ESLj25W50wHzzVcZ $ids := create→Collection_of→String;
  #xwUhFuwxrVFV0wHP foreach js in $entities→items
  do {
    #u8Jl9uXhLl46zAWd $ids→add($js→string("pub"));
  }
  #xys6aPkyRXVEIXEk $fetch_result := code→fetch_json_objects($index→parent, $ids);
  #TB8BO96KoIcyMWIb $fetch_result→continuation := $entities→continuation;
}
#c5PJWSgTdm6B2Qmk meta import redis {
  pub "wktma"
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
  }
}
#x2qy4UhtpGhKaz0C meta import parallel {
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
#xsC0xu2IrRSjsOuP
action get_index(#DGyUwm8ZqhlVrGxz store: * store, #TMbFilWF74RrZpW4 name: String) returns(#CLlTutoXjRO0ZQg4 index: * index) {
  #xefsuEcE04vdwXL8 $index := records→index→invalid;
  #x1xCmDCaA6IX0f7r foreach index2 in $store→indices
  do {
    #xMn0Qbt7ILOFpVEH if $index2→name→equals($name) then {
      #Q9Row4WW4QZY4btD $index := $index2;
    }
  }
  meta sync;
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
#SXjkbIJIM0GVPEe0
action single_fetch_result(#xg5P2FplpnJfynYi store: * store, #XCbcJ1aUUZa77urJ obj: Json_Object) returns(#xwNUJDpySoDALbHz fetch_result: * fetch_result) {
  #oG65wHACN5OyyAFi $coll := create→Collection_of→Json_Object;
  #ITnk44Fu93UPAHAn $coll→add($obj);
  #oEu2oNdhTzm8aR9c $fetch_result := records→fetch_result→create;
  #y8TQS3DFALF1yjHr $fetch_result→items := $coll→to_json;
  meta sync;
}
#x8R4l8T2PrIFjLEW
action generate_id(#WEGrxsIeIDYY1i4U store: * store, #w3U9eAhSeREHHurD min_name_length: Number) returns(#K2Z4l3Dsghmt2hFA id: String) {
  #rPO3e0HZMfMxJJvE $entry := web→json("{ kind: \"reserved\", pub: { kind: \"reserved\" } }")→to_json_builder;
  #mZo6SLrHNychjWyc $id := $store→container→insert_unique($entry, $min_name_length);
}
#Nv2slJ54rjxMhuCX
action copy_json(#I4igol58eZm3ZkOF js: Json_Object, #k4bjckRh4BSZhCPx jsb: Json_Builder) {
  #sksKQayMbBGnixtd foreach key in $js→keys
  do {
    #NYnYKmPsyMn4RdJe $jsb→set_field($key, $js→field($key));
  }
  meta sync;
}
#UeJ8g2Jguo5ollgU
action get_count(#OSNho6KQkSSR5NRJ options: Json_Object) returns(#xpT5j7phfr4waS6Q count: Number) {
  #xMN5aCO6aTMBaCx5 $count := $options→number("count");
  #FE0WrRobQYdxMs25 if $count→is_invalid then {
    #PZ1SidxnO81AFLRI $count := 25;
  }
  #xNYsbYUWKrAO4LnC $count := math→clamp(1, 500, $count);
  meta private;
  meta sync;
}
#aXGvSL46phqNnGAA
action fetch_json_objects(#eymfITB4qaWoSeR4 store: * store, #y1Vfu4strrqVn01R ids: Collection[String]) returns(#yTQbXCT430l4nY2C fetch_result: * fetch_result) {
  #Nhzla2mCaMvoWlMF $entries := $store→container→get_many($ids);
  #nZKC5imzLi4KqTYl $coll := create→Collection_of→Json_Object;
  #xxr24cf0c7maH0TE for 0 ≤ i < $ids→count do {
    #xki44QHxB2sPNFJH $entry := $entries→at($i);
    #YSD8s7jKhmm6kbUT if `not` $entry→kind→equals("null") `and` `not` $entry→string("kind")→equals("reserved") then {
      #TK6QrxDWdVKaclnM $coll→add($entry);
    }
  }
  #ds029rT9ZVAoWK2W $fetch_result := records→fetch_result→create;
  #zxVkN2g67aLDI4qc $fetch_result→items := $coll→to_json;
  meta private;
}
#eiBPxXhSXi3ZLYXK
action fetch_from_id_list(#UWNFOSZc0ki6On2V store: * store, #kjwZgpMeo4Lu2wFg ids: Collection[String], #Huchzzjrm6scfk1A options: Json_Object) returns(#xgsp2SCsjIo08Qgq fetch_result: * fetch_result) {
  #v2UNfPJC6GCUG4GX if `not` $options→is_invalid then {
    #x7rzj34AmOMypnXv $start := $options→number("continuation");
    #RFHYd367mP6tky7U if $start→is_invalid then {
      #xtn4Q4oyDdsAOn4D $start := 0;
    }
    #xX8g2lAHBrUUbhta $end := $start + code→get_count($options);
    #hmYOjG8u7J9SfLC8 $coll := $ids→slice($start, $end);
    #mrMe25L0yAsAULwI $fetch_result := code→fetch_json_objects($store, $coll);
    #kSUdzRLxYh7wsb9C if $end < $ids→count then {
      #ZVXgXMOz7HiJLWz5 $fetch_result→continuation := $end→to_string;
    }
  }
  else {
    #WH2qsmx2c1h7cP7c $fetch_result := code→fetch_json_objects($store, $ids);
  }
}
#gsoP4ayQgAMYLr8w
action reserve_id(#n86yxQaWNSDJSVCM store: * store, #vxu3xqgghDqQbOg1 id: String) {
  #EO5QwmuD74hhI8be $entry := web→json("{ kind: \"reserved\", pub: { kind: \"reserved\" } }")→to_json_builder;
  #tEuue28AksChO2yT $entry→set_string("id", $id);
  #teqciGbX4SRgPAqz $entry→field("pub")→set_string("id", $id);
  #xtWJcDz7DGg5txN4 $ok := $store→container→try_insert($id, $entry);
}
#xtOLVO6YOkQazhe9
action execute_table_query(#q94ZCF03yy7wjIQr table_query: ♻ azure_table → table_query, #OE7EfGPThtKY4KI8 options: Json_Object) returns(#bDrIS2hChdPUqMXp entities: * fetch_result) {
  #oRYbOe8koqL75yAU $res_query := $table_query→continue_at($options→string("continuation"));
  #PyqUOuJA21Vvr2Gy $res_query := $res_query→page_size(code→get_count($options));
  #x6UWOpFLkSWiqxv2 $entities2 := $res_query→fetch_page;
  #LbJFfMtdt10RHttq $entities := records→fetch_result→create;
  #BOpKSaQAtU8OFBIW $entities→items := $entities2→items;
  #CLgzJ1hAkE8Kx2J8 $entities→continuation := $entities2→continuation;
}
#MiNWqy6iHmewckER
action fetch_all(#x8L65OClaj9SnA8C index: * index, #YXCoNjX6ZaQjLDnT key: String) returns(#xyAY1dgaIFK5tyc5 items: Json_Object) {
  #JhM90Hgz5mFwxFBg $opts := web→json("{ \"count\": 1000 }")→to_json_builder;
  #Y6zW9vImJjZnpx3i $fetch_result := $index→fetch($key, $opts→to_json);
  #ZtmFth8LBPgKJUVu if `not` $fetch_result→continuation→is_empty then {
    #anzGXOlbr5dLcYsu $coll := create→Collection_of→Json_Object;
    #x0iRW8TdHzPA3rNv $coll→add($fetch_result→items);
    #e5V2iyKso6N4q725 while `not` $fetch_result→continuation→is_empty do {
      #PCUOXQ0UFPpfzPMC $opts→set_string("continuation", $fetch_result→continuation);
      #oz9K6ir1VAsOA0di $fetch_result := $index→fetch($key, $opts→to_json);
      #jGb6IYguFLYvBx2N $coll→add($fetch_result→items);
    }
    #xpFGUMfhoqap2Meq $jsb := web→create_json_builder;
    #JlMOUP9aiNxZEug0 foreach js2 in $coll
    do {
      #I7y1vXyCER10CrPI foreach js3 in $js2
      do {
        #qH6BupKAW4gzKB6J $jsb→add($js3);
      }
    }
    #yFRDFm93Xxd5LomB $fetch_result→items := $jsb→to_json;
  }
  #Sf1RFaOo72oFy2IB $items := $fetch_result→items;
}
#Jhq1sZ6l8vqRBLef
action delete(#vECn1niCzllfEahB store: * store, #dvWX2W73lwMV82Hi delid: String) returns(#DHWLXp4DACfkBmpc delok: Boolean) {
  #FspWDEUKHq20uyV0 $delentry := create→Ref_of→Json_Builder;
  #N64oGamou5O8ndfM $store→container→update($delid, $update2);
  #KJNcxUGkr7eE8YHi where update2(entry: Json_Builder) {
    #Lfxz2IfyPio94XP9 $kind := $entry→string("kind");
    #px3WhgdQkXKVuBWH if `not` $kind→equals("reserved") then {
      #xIY1ukuTsumG8Yqt $delentry→\u25c8set($entry→clone);
      #b4FKRK43cZpFO2hL if data→hard_delete then {
        #p5ivu1zkiTZEx7Yj foreach fld in $entry→keys
        do {
          #q2YNuP2xqyPCIkJr if $fld→equals("indexId") `or` $fld→equals("id") then {
            #xViMpf6LfuzqF9mc skip;
          }
          else {
            #xJJ3tULk5iAVmWfZ $entry→remove_field($fld);
          }
        }
      }
      else {
        #MANChe4bsf3P4r6V $entry→set_string("origkind", $kind);
        #xja0vfiHuRPMZEFT $jsb2 := $entry→field("pub");
        #xZqyKrK2BoBxO9Uo if `not` $jsb2→is_invalid then {
          #obuDI9HacbXXDCsR $jsb2→set_string("kind", "reserved");
        }
      }
      #Gnv22eFvNHCGeiwK $entry→set_string("kind", "reserved");
      #xajTY4DDFOC959PU $entry→set_number("deletetime", @\u267b→cached_store→now_seconds);
    }
    else {
      #OkAvIsYoBf4UA27z $delentry→\u25c8set(web→create_json_builder);
    }
  }
  #e8Q44bM4k4RPGAKc $bld := $delentry→\u25c8get;
  #VDAW83WOpgPdrjQS if `not` $bld→is_invalid `and` $bld→contains_key("kind") then {
    #u7pF60rL5bmvPFb3 $id2 := $bld→string("indexId");
    #mGc0fTfU157uKAy2 @\u267b→parallel→@for($store→indices→count, $@action);
    #x7LiYqpPGlU72LC7 where @action(x: Number) {
      #yASJtg3NZB6IwMzR $index := $store→indices→at($x);
      #KYRLo0wf0JVrwJdo $key := $index→key→run($bld);
      #x6048A86SSqng0t2 if false then {
        #x3woFhC2D05F5RHb contract→assert( `not` $key→is_invalid, $id ∥ ": " ∥ $index→name ∥ " invalid");
      }
      #W6E72AG7DAlxcICN if `not` $key→is_invalid `and` `not` $key→is_empty then {
        #K0HaPsJSEAGrD3Mx $entity := @\u267b→azure_table→create_entity($key, $id2);
        #I6Rx6nGmswmYzd5y $ok := $index→@table→try_delete_entity($entity→to_json);
        #yCUO3NjCTz4Jklhj if `not` $ok then {
          #j0oYxCSbpWBnhXTc data→logger→debug("failed to remove idx entry: " ∥ $id2 ∥ " - " ∥ $key ∥ " at  idx " ∥ $index→name ∥ " of " ∥ $store→kind);
        }
      }
    }
    #xoiva4I5VSq2heOV $delok := true;
  }
  else {
    #Pi6qecXwAy4FKLbr $delok := false;
  }
}
#BVGhpbmcgaW5kZXga
table stores_by_kind {
  type = "Index";
  persistent = false;
  keys {
    #PfHdynLvkE6jeeD7 name : String
  }
  fields {
    #x6CT3VgKqnnSZ8ZI store : * store
  }
}
#A4E68rzYw5353LHD
action store_by_kind(#DORtyvSMZqCkbzVL kind: String) returns(#UcrY0fMDrbXfRJo5 store: * store) {
  #nw9ui6gMcOie59wS $store := records→stores_by_kind_index→at($kind)→store;
  meta sync;
}
#eenNGu5KotpyRDix
action for_all_batched(#xXlnxUnNB4mKYkev index: * index, #AhaCdAhGwT2lX1bT key: String, #qh2BE2D21k6haZE9 batch: Number, #LMvcSx7tSU1g2kEe process: Json_Action) {
  #S4x2r0Am0Lan43X9 $opts := web→json("{ \"count\": 200 }")→to_json_builder;
  #nol8RJvfWLtmtzIJ if $batch > 0 then {
    #X1qQ7LFE64jmmWzU $opts→set_number("count", $batch);
  }
  #e4QuzHxxx951irYA $fetch_result := $index→fetch($key, $opts→to_json);
  #K2T4VPWd2Abs4uPa $process→run($fetch_result→items);
  #xalQivpOWTqr49R7 while `not` $fetch_result→continuation→is_empty do {
    #x1k804DJn6hmo8FG $opts→set_string("continuation", $fetch_result→continuation);
    #e2VgJ7EQKGHZNU86 $fetch_result := $index→fetch($key, $opts→to_json);
    #fAHKI2tU2Pkt0EQS $process→run($fetch_result→items);
  }
}
#SBroZxZPeUV4dPLz
var logger : App_Logger {
  transient = true;
}
#lte5hsg9VcwHxIsR
action init(#xy28bb9prhBhPMyw table_client: ♻ azure_table → client) {
  #QDge6Pph8XwRRzn4 if data→logger→is_invalid then {
    #gRKx1fEk10TSPZjA data→logger := app→create_logger("idxstore");
  }
  #xt4ZtrK4nNAd4yFm data→client := $table_client;
  #SbKNDsTIV22cHpyl data→hard_delete := true;
  meta sync;
}
#TR42mFge5l2JKnk9
var client : ♻ azure_table → client {
  transient = true;
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
#NDquqDDf4qb64vSI
var hard_delete : Boolean {
  transient = true;
}
#QDG84nFFhG0lr8KU
action create_custom_index(#s50a6tIXiHBDeF4c store: * store, #e2qPSfY3LJDNkDS8 name: String, #xlJfFW4M8HNFXxCT @table: ♻ azure_table → @table) returns(#JWSaK4APnHr1HCfP index: * index) {
  #e5RdQOw46XPJdX1x // Make it possible to get all elements `e` sharing `to key(e)`
  #xvjFYrVDiq17Qzb7 // {action:ignoreReturn}
  #x43uw222tW9392XE $index := records→index→create;
  #QrzsebFFjKySSbjs $index→parent := $store;
  #nBItWyict2cA9NI8 $index→name := $name;
  #kCVFlXVAv4eo2bFd $index→key→\u25c8set( `fun:entry` "");
  #b7KY0jFZyIFI8xK8 $index→@table := $@table;
  #pxqgF07k0rNU5NZc $store→indices→add($index);
}
#o6glgEZlIcYzw2Le
action reindex(#x7IMvb2A7Gol4ST0 store: * store, #M8rhk1Sb6btaQ5bf pubid: String, #xtu2hsbo3SbMyeSk update: Action1[Json_Builder]) {
  #xc9NzPYPuF2wqUOr $before := create→Ref_of→Json_Builder;
  #xlL6jOiHleZWeyt1 $after := create→Ref_of→Json_Builder;
  #xzbK8m958s2U11nD $store→container→update($pubid, $update2);
  #l9Qe0JnDQKqZMtcL where update2(entry: Json_Builder) {
    #SwTUrdGAXvFL12La $before→\u25c8set($entry→clone);
    #kfb8Wc2uNgIXdW8w $update→run($entry);
    #ia2t9zmfHfmexqU6 $after→\u25c8set($entry→clone);
  }
  #cVgNRwLgBaC9DcSn $id2 := $before→\u25c8get→string("indexId");
  #sH7kw22HRr9u8jeN contract→assert($after→\u25c8get→string("indexId")→equals($id2), "");
  #X9qeJDXCM1tAOdj1 @\u267b→parallel→@for($store→indices→count, $@action);
  #xe2St8jJ6M9HMGGu where @action(x: Number) {
    #x6xBlYnb2zMnr7tI $index := $store→indices→at($x);
    #WRnKHdF1EU5i50qe $before_key := code→or_empty($index→key→run($before→\u25c8get));
    #z5g8lgbcqYRbLOc4 $after_key := code→or_empty($index→key→run($after→\u25c8get));
    #YTdKNER9O2Hy8Tu0 if `not` $before_key→equals($after_key) then {
      #yMmkwK9fG71VG34L if `not` $before_key→is_empty then {
        #xlgDJME8lTC3ZLyM $entity := @\u267b→azure_table→create_entity($before_key, $id2);
        #o161ygQWKKU4PeSd $ok := $index→@table→try_delete_entity($entity→to_json);
      }
      #xXwQjYCtcUUef8k2 if `not` $after_key→is_invalid then {
        #LMQYNBFZ2z0KU9fc $entity := @\u267b→azure_table→create_entity($after_key, $id2);
        #xV3mNpIySCB5g9mS $entity→set_string("pub", $pubid);
        #FNa7wV8p2PTzYUXc $index→@table→insert_entity($entity→to_json, "or replace");
      }
    }
  }
}
#v803HZPwqZX4oZ9B
action or_empty(#AGkbjnYsAtGzNR1q s: String) returns(#TfJ6iVC7x8d42rcG r: String) {
  #jCTllN41ykhZ1b0I if $s→is_invalid then {
    #XDV9Yhwz8N92IOpc $r := "";
  }
  else {
    #ydzaMYbxY7cenruX $r := $s;
  }
  meta private;
  meta sync;
}


