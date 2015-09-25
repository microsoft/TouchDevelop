meta version "v2.2,js,ctx,refs,localcloud,unicodemodel,allasync,upperplex";
meta name "azure search";
meta icon "Stacks";
meta color "#ffffffff";
meta rootId "xvt3gpDweX6MezFxaAo4aGK2";
meta iconArtId "uqndvwfv";
meta isLibrary "yes";
meta allowExport "yes";
meta hasIds "yes";
meta platform "current";
meta parentIds "";
// A library that allows to access the Azure Search services. #azure
#OBdnParhkfnb9m3o
action example() {
  #Ofs6c8moTE6aLrs5 // The [Azure Search](http://msdn.microsoft.com/en-us/library/azure/dn798933.aspx) allows to index and search documents in a scalable way. This library provides the management APIs to create indexes and update documents.
  #KlO9rCpjZ6OWqR5y // ### initialization
  #pxkhgypSXt0z2Bpk // This library expects the ``AZURE_SEARCH_SERVICE_NAME`` and the ``AZURE_SEARCH_API_KEY`` environment variables to be set.
  #xVgivr407mT7d4ar code→init;
  #B9Wsya2QOD8vsriC // ### create or update an index
  #x2R5IQUBpvkAgFah // To create or update an index, start by creating a schema.
  #wH8gnjlmQNiqVbDP $schema := code→create_index_definition("docs", "id");
  #fcCNBc8NflON4LPX // * add fields to the schema
  #PC0ebY45ClaV4h1Q $descr := $schema→add_field("description", "Edm.String");
  #GCMNiPdeovBNiBnp $descr→set_filterable(false);
  #O24ZwFc4FEvRPMY5 // * specify CORS options
  #lUYbR2bMmePrghX3 $schema→add_CORS_origin("*");
  #uohZY6u3Gg12SYUt // When you're ready, create the index!
  #cguYNdyqTScsH27W $index := $schema→create_or_update;
  #pyN3X1TN2eYXy5Cy // ### add or update documents
  #xpRaVR4Vp8Rpx3dy // Documents are always updated in batch. First, create a batch update.
  #am0m8Odv7is3rlIw $update := $index→create_batch_update;
  #Qo9S0kH2c6RY3i60 // Then add your update operations.
  #xZNEyUK33n6dAC78 // * "upsert" a new document
  #d3yeRuB7uU1YbLTg $doc := $update→upload("book1");
  #xh52tLG4Wgrz1SBc // * set any additional fields
  #Nlcs8yEqpvb2mE4T $doc→set_string("descr", "A great book!");
  #xA33V3M6A7EVE2YO // * merge fields into a document
  #x1mRwHHEkj2z29vE $doc2 := $update→merge("book2");
  #fdCBMsc5iqXA7lWM $doc2→set_string("descr", "new description");
  #I2w1brf58Yw7QHZ5 // * delete a document
  #uAWJ4rrt90ii4YhJ $update→delete("old");
  #xKtcReVSGV7SsvX6 // When you are done adding all the actions (<1000 per batch), send them!
  #tiazh8UXSrKBM4PY $status_code := $update→send;
  meta private;
  meta test;
}
#zl2AEBD351x8HnBZ
action create_or_update(#ROTbdxaUzWTaNWuF schema: * Index_Definition) returns(#tBDG8gBGaMlK44hn index: * Index) {
  #ye0ZTeEZ4oj1947w // Creates a new index. If it already exists, it is updated to the new definition.
  #tHNG2cR94DWdKHJo code→log("creating index " ∥ $schema→index_name);
  #Nc4lvMhz2gkYBMQX code→log($schema→index_builder→serialize);
  #vl2as010roOLan4H $request := code→create_request("/indexes/" ∥ web→encode_uri_component($schema→index_name) ∥ "?api-version=" ∥ data→api_version);
  #d12e2pwIuFXrrUQ1 $request→set_content_as_json($schema→index_builder→to_json);
  #a4nx6yXV6UdhN585 $request→set_method("put");
  #j2gwaVwXFIe000Oc $request→set_header("Prefer", "return=representation");
  #BIBn5RYSiyj8VDOl $response := code→send_request($request);
  #uxcEaF0RYlfS95yt $js := $response→content_as_json;
  #xnlkDZ6ahpr4T9Xc if `not` $js→is_invalid then {
    #BKhAGL5K3m7HwPdc code→log($schema→index_name ∥ ": " ∥ $js→serialize);
  }
  #wg5j6uFHrv2DsW1A $created := $response→status_code = 200 `or` $response→status_code = 201 `or` (data→global_options→allow_409 `and` $response→status_code = 409);
  #p1Nqp6xA54xElmg5 if $created then {
    #HvUNdoZY2YyP9bpN $index := $schema→get;
  }
  else {
    #pu9WGPo2fwWuxZ9C code→log("create: " ∥ $response→status_code);
    #dNRdrt5575Z5rRvG $index := records→Index→invalid;
  }
}
#BdGhpbmca
table Batch_Update {
  type = "Object";
  persistent = false;
  fields {
    #ULSqrDJRJgUXRS9V index_name : String
    #nNTaXHfZLE64wFeG key_field_name : String
    #xzYXN4zDJtgPqzbM root : Json_Builder
    #GAZvXT2xi76zWvON value : Json_Builder
  }
}
#qkGxeU0FZHOcSvzb
action create_batch_update(#bl8P2pY6cq13XPP1 index: * Index) returns(#xUOCPjZ8RPDbZ82o update: * Batch_Update) {
  #ZHXpHlAmN48nY80E // Creates an object that allows to add or update multiple documents at once. A single batch may not have more than 1000 actions.
  #op4rbAKTfvBSK7u4 $update := records→Batch_Update→create;
  #m4T1P41mDjBdqI2D $update→index_name := $index→name;
  #xYHq2S62flayHtPU $update→key_field_name := $index→key_field_name;
  #GSumd3QOL6pI0DsN $update→reset;
  meta sync;
}
#tkmjZDyfdVGzjTtb
action upload(#xu0ypwB4sI5fBTU6 update: * Batch_Update, #sXQrt0IXsD56IulK key: String) returns(#YHxPvxz22EAj9ExR doc: Json_Builder) {
  #FiNNYJLhduuze5OI // An upload command is similar to an "upsert" where the document will be inserted if it is new and updated/replaced if it exists. Note that all fields are replaced in the update case.
  #FJZCGbjxEjpMVQ4G contract→requires( `not` $key→is_empty, "missing key");
  #LvtS4aDJ2fP5j4iY $doc := code→add_action($update, "upload", $key);
  meta sync;
}
#TXD95sJCpGLuOXLK
action add_action(#guKpR2DjUHek9KrD update: * Batch_Update, #DWl7dFFZtJkYzyDk @action: String, #EQdYt3ap0IP3fSz2 key: String) returns(#xIS0X5bd5JXghZba doc: Json_Builder) {
  #mQW3gOTMVBTbACri contract→requires($update→action_count ≤ 1000, "too many actions in batch");
  #rQauH4vyoqxP9HO7 contract→assert( `not` $update→value→is_invalid, "");
  #yrapi1aeDnWhkF0I contract→assert( `not` $update→key_field_name→is_invalid, "");
  #xyY8y5HPdsSqdWbU $doc := web→create_json_builder;
  #KgMKSg0xATQh7eQT $doc→set_string("@search.action", $@action);
  #oK8S4Ap0p7MDfUZv $doc→set_string($update→key_field_name, $key);
  #QM38DFg2oOdHWBEG $update→value→add_builder($doc);
  meta private;
  meta sync;
}
#xVpqAm9ZyHcv002f
action merge(#UtcKQqkbHvgKyyk5 update: * Batch_Update, #Sppawu23JfR6XRXh key: String) returns(#ur2yIV4tHYwAkRMv doc: Json_Builder) {
  #XjHsdHuLkVj0fII9 // ``merge`` updates an existing document with the specified fields. If the document doesn't exist, the merge will fail. Any field you specify in a merge will replace the existing field in the document. This includes fields of strings. For example, if the document contains a field "tags" with value ``["budget"]`` and you execute a merge with value ``["economy", "pool"]`` for "tags", the final value of the "tags" field will be ``["economy", "pool"]``. It will not be ``["budget", "economy", "pool"]``.
  #MvOJ4GpZlrGx4h8N $doc := code→add_action($update, "merge", $key);
  meta sync;
}
#b9dl9YDRfeMBTuyA
action delete(#Jut2I11wfaXDt4Zz update: * Batch_Update, #xyCo2358fT4IWBfj key: String) {
  #nkVqSkbACVNEbW4T // ``delete`` removes the specified document from the index. If you want to remove an individual field from a document, use `merge` instead and simply set the field explicitly to `null`.
  #nV9zoZ6iS2qsPUWL $doc := code→add_action($update, "delete", $key);
  meta sync;
}
#z24aRSj058IQlH2J
action send(#Uu34L0998U9pddBf update: * Batch_Update) returns(#onPoHqZVnlUbWEK9 status_code: Number) {
  #uR4wbMCCKkuRVSRY // Sends the batch request
  #T2doHVaxBCjhm1xB code→log("updating (" ∥ $update→action_count ∥ " actions)");
  #io6kBvmlWZGjCH9P $url := "/indexes/" ∥ $update→index_name ∥ "/docs/index?api-version=" ∥ data→api_version;
  #eaNPRF2dwdqZaqRG $request := code→create_request($url);
  #jN4rC5325Jdrli5y $request→set_method("post");
  #xMzTC5biLewVN5B0 $request→set_content_as_json($update→root→to_json);
  #xg4zZPQ2H6vRZfYc $response := code→send_request($request);
  #yldqTfB3etpuehvo $js := $response→content_as_json;
  #ajZrU6h2e1XrNrjv $status_code := $response→status_code;
  #xKAONYnEDC4oqkI1 if $status_code = 200 then {
    #L5RY87hD33XVVTdi $update→value→clear;
  }
  else { #FJAULlHMYI2VR8Fc if $status_code = 207 then {
    #DA6fH4JsW4GUUpkO data→logger→warning("at least one item was not successfully indexed");
    #zGmPJhBJlL54zMFh $jsvalues := $js→field("value");
    #UYVmOa2XmbZrmowz foreach jsvalue in $jsvalues
    do {
      #qeYsGyhUbySqYl7j if `not` $jsvalue→boolean("status") then {
        #N4AA7Cw2gnNTgtmN data→logger→debug($jsvalue→string("key") ∥ ": " ∥ $jsvalue→string("errorMessage"));
      }
    }
  }
  else { #bWufQlc1zMsBIDHP if $status_code = 429 then {
    #kbgb8gbONXv3vsyt code→log("index exceeded quotas");
  }
  else {
    #FlsujJfYPMH86BQ6 code→log("status code: " ∥ $status_code);
    #i5Ti8NObHc2J4od4 if `not` $js→is_invalid then {
      #xHiitfz2kKY4e3Mb data→logger→debug("body: " ∥ $js→serialize);
    }
  }
  } } 
}
#Fe2cvn5yVV22V40A
var api_key : String {
  transient = true;
}
#shTJNurX72vZSffs
var api_version : String {
  transient = true;
}
#xHDLPFzeJRC4SGUo
var service_url : String {
  transient = true;
}
#KP7YQqYMM6hXwKpO
action init(#xkSfPtcMj8XnbDGG options\u003f: * Options) {
  #QG0Iv2Y0qTvhlWZT // Initializes the service with a ``service name`` and an ``api key``. If empty, reads the ``AZURE_SEARCH_SERVICE_NAME`` and the ``AZURE_SEARCH_API_KEY`` environment variables to initialize the search service.
  #Ej01subP9gHcj44q data→logger := app→create_logger("azuresearch");
  #cfXBusnPYqVQH1Mh code→log("init");
  #uKpOyXFCz29ydF45 if $options\u003f→service_name→is_empty then {
    #xvsFmbOmYBEWdPrz $options\u003f→service_name := app→server_setting("AZURE_SEARCH_SERVICE_NAME", false);
  }
  #xjIsQEmwUGaDvYa4 if $options\u003f→api_key→is_empty then {
    #xNQ2YmpUayzYvxfM $options\u003f→api_key := app→server_setting("AZURE_SEARCH_API_KEY", false);
  }
  #Fb72HRCr27ya7FMh if $options\u003f→version→is_empty then {
    #gDzJOuxbjvynh1Q1 $options\u003f→version := "2014-07-31-Preview";
  }
  #OL2C9s6RUD3A89NB data→global_options := $options\u003f;
  #PbsU4CDBlZfZ2OWT data→api_version := $options\u003f→version;
  #Y2Sq9KqKzeY5GCAo data→service_url := "https://" ∥ $options\u003f→service_name ∥ ".search.windows.net";
  #vDjTmIV4Zx4ALh3g data→api_key := $options\u003f→api_key;
  meta sync;
}
#AF7UrvHov8jY5Hzh
action delete_index(#gcFZ6HxCx4UhLmUx index: * Index) returns(#B1389OITGXjoZZne deleted: Boolean) {
  #WAhCl4fw6WT5yszv // Removes an index and associated documents from your Azure Search service. **Requires an admin api key.**
  #xPM7UG6OK45AbQjC $request := code→create_request("/indexes/" ∥ $index→name ∥ "?api-version=" ∥ data→api_version);
  #dn8M4FfXXVsy027i $request→set_method("delete");
  #il2t4T5dbEjmrNPm $response := code→send_request($request);
  #HtUEosPP0BjiVmQ9 $deleted := $response→status_code = 204;
}
#cgaCt9uX4wOOiVEv
action create_request(#xrv71rW6PX0ATUHu path: String) returns(#xcp6JMRX1xE4JTM9 request: Web_Request) {
  #VvvvZQS4lqVonuM2 contract→requires( `not` data→api_key→is_empty, "api key not initialized");
  #mD8xD9QpoPNOXiy9 contract→requires( `not` data→api_version→is_empty, "api version not initialized");
  #Jh7vhaj4iKPQe0W4 $request := web→create_request(data→service_url ∥ $path);
  #xDstf6gGjG9w5tlm $request→set_header("api-key", data→api_key);
  meta sync;
}
#Y4zQgfpIFMpDpQKj
action send_request(#gw8fd9rV1o9dP7KY request: Web_Request) returns(#xxPKRq2jOpKgwUJ8 response: Web_Response) {
  #vPLx71n1mtO2SPAe $response := $request→send;
  #x2ywk52CraiSK8Jj data→logger→debug($request→method ∥ " " ∥ $request→url ∥ " -> " ∥ $response→status_code);
  meta private;
}
#JjyinEofYEzQnYxp
action statistics(#Fgwh2rQZkAY2DxMs index: * Index) returns(#xPilF4QpK74PelOK document_count: Number, #zTw4nE4vLkCiLwoJ storage_size: Number) {
  #mJAhLSiCLdj1NEmO // Gets from Azure Search a document count for the current index plus storage usage. **requires an admin api key**
  #qDAEATEtFoeonzmF $request := code→create_request("/indexes/" ∥ $index→name ∥ "/stats?api-version=" ∥ data→api_version);
  #HPERcwJXt3Pw8qer $response := code→send_request($request);
  #Nk8FEtZRsMDb2Ee3 $js := $response→content_as_json;
  #N72LPjpPNlUW6B49 if $response→status_code = 200 then {
    #sNJ4ZEo4NZWs2XMq $document_count := $js→number("documentCount");
    #MEG8wwzh74P2hDBa $storage_size := $js→number("storageSize");
  }
  else {
    #ZkpiAsaLwYh4infP $document_count := - 1;
    #ehXZaCjm62NDbkMW $storage_size := - 1;
  }
  #IazaBrWczjOGdvr5 code→log($index ∥ "stats: " ∥ $document_count ∥ " docs, " ∥ math→round_with_precision($storage_size / 1000000, 3) ∥ " Mb");
}
#pTFHLqZv6ajU2Gwn
action check_index_name(#iQBIV46JonBu0BTN index_name: String) {
  #Lmk6a25JizgxZjdF contract→requires($index_name→is_match_regex("^[a-z0-9]{2,15}$"), "``name`` must be lower case, have no dashes, and less than 15 characters. ");
  meta private;
  meta sync;
}
#WZJ4964Q2TIlyI7z
action action_count(#xKzi8FArvNHfof0M update: * Batch_Update) returns(#xgEj2p8ziAmD1Eu4 count: Number) {
  #YUBtFvaY2dtyJP0u // Gets the number of update action in this batch
  #hdCN4xt2Vip7fJTH $count := $update→value→count;
  meta sync;
}
#ohucXYDSWMTCOL2D
action log(#wBTKl1y4RUvLffrU message: String) {
  #BBnnogFW52JOOoEY data→logger→info($message);
  meta private;
  meta sync;
}
#n2p7b7xL1CyoLjx4
table Index_Definition {
  type = "Object";
  persistent = false;
  fields {
    #KdJ6diM072cQzQYV value : Json_Builder
    #XdT7ig7bOkW1WSGm index_name : String
    #syPMX0X4fACiHHrb key_field_name : String
    #tEySM3C4lr9aOIg4 \_key : * Field_Definition
  }
}
#RDiDIKb8h2Y6HJQG
action create_index_definition(#SUSRh2EGbjaZrjfH index_name: String, #xD94n0wSDQwsXl2i key_name: String) returns(#xVQst4hrmEz30R3p schema: * Index_Definition) {
  #KBFdVKPz9r2n4f40 // Creates an empty index schema
  #CK1B2SORu6LjoKTF code→check_index_name($index_name);
  #xl3DRl1fT0EBl1Bx contract→requires( `not` $key_name→is_empty, "field key  name missing");
  #rWANUxC1MKgiUwL7 $schema := records→Index_Definition→create;
  #cJY2dCfMQhu36ooR $schema→value := web→create_json_builder;
  #psqIuJWrUSfu7dYH $schema→index_name := $index_name;
  #pooWWj4SwRfuYYVc $schema→key_field_name := $key_name;
  #hCJ7pAlCE26CJfOQ $schema→value→set_string("name", $schema→index_name);
  #mARCoV8IW4kG62RN $fields := web→create_json_builder;
  #Gf1KLT3REYc6I7Ps $fields→add_null;
  #g1ZTJfOrk2M2HdXq $fields→clear;
  #flBW8QI0gO0xoamU $schema→value→set_builder("fields", $fields);
  #PQ05hnt4ND0PkqXq $key := $schema→add_field($key_name, "Edm.String");
  #dpCImEnGXPhHtD58 $key→set_key(true);
  #mpZY94Izt0sXkmCL $schema→\_key := $key;
  meta sync;
}
#r5U4TZ8yhYpJqVc9
action add_field(#mIAr2QvnergQHFjJ schema: * Index_Definition, #WZCiyieCHJasq15W name: String, #oMoqyWLgLyI73QU2 type: String) returns(#z14ROOFKXbqdeKYy field: * Field_Definition) {
  #JpzjYvQbvJxn3bMq // Adds a field to the index schema
  #Yw321crs5xSQy4So // {hints:type:Edm.String,Collection(Edm.String),Edm.Int32,Edm.Double,Edm.Boolean,Edm.DateTimeOffset,Edm.GeographyPoint}
  #yqpy9NnIuhuKinxd $field := records→Field_Definition→create;
  #uymWJSlNciQVSxO2 $field→value := web→create_json_builder;
  #XMzNaB1gw2N4Esgy $schema→value→field("fields")→add_builder($field→value);
  #e9BvUg2om6OwCF2t $type := $type→trim(" \t");
  #xkEJP7BmecFivCpe $field→value→set_string("name", $name);
  #KUyOD1FSisjPmIRw $field→value→set_string("type", $type);
  meta sync;
}
#x02TVEB0b2GDBZrx
table Field_Definition {
  type = "Object";
  persistent = false;
  fields {
    #qJWqGsXOuEsx1f2O value : Json_Builder
  }
}
#xFW2kkaA3Vwewoz8
action set_searchable(#JtBKCiFEypW37X7a field: * Field_Definition, #EJ5AqXg5nWOM2RGd value: Boolean) {
  #Qd594JPz4Y4MLJcy // Marks the field as full-text search-able. This means it will undergo analysis such as word-breaking during indexing. If you set a searchable field to a value like ``"sunny day"``, internally it will be split into the individual tokens ``"sunny"`` and ``"day"``. This enables full-text searches for these terms. Fields of type ``Edm.String`` or ``Collection(Edm.String)`` are searchable by default. Fields of other types cannot be searchable.
  #x5jygdm7JpZ7PAJu // {box:hint}
  #OKq9L2Mys28lKgFC // searchable fields consume extra space in your index since Azure Search will store an additional tokenized version of the field value for full-text searches. If you want to save space in your index and you don't need a field to be included in searches, set searchable to false.
  #YwxYqjb9Q9ocmusT // {/box}
  #kfR0QY20Fhh2EbbZ $field→value→set_boolean("searchable", $value);
  meta sync;
}
#pQMXhFi8AON402Jh
action set_filterable(#xCwHQp2IVwUZrrLx field: * Field_Definition, #xXbPsSO28Pn23OND value: Boolean) {
  #Ato5HNj2zmKoUN2u // Allows the field to be referenced in ``$filter`` queries. filterable differs from `searchable` in how strings are handled. Fields of type ``Edm.String`` or ``Collection(Edm.String)`` that are filterable do not undergo word-breaking, so comparisons are for exact matches only. For example, if you set such a field f to ``"sunny day"``, ``$filter=f eq 'sunny'`` will find no matches, but ``$filter=f eq 'sunny day'`` will. All fields are filterable by default.
  #IfPcW1D4SubahYy4 $field→value→set_boolean("filterable", $value);
  meta sync;
}
#DwbV2njeWr3pxE1F
action set_sortable(#GIIqRajkdGU7r8Xl field: * Field_Definition, #g9Q3jYd3t0kStMj1 value: Boolean) {
  #xdbEbmP4fAzPUzL2 // By default the system sorts results by score, but in many experiences users will want to sort by fields in the documents. Fields of type ``Collection(Edm.String)`` cannot be sortable. All other fields are sortable by default.
  #uRbadATXlAiw3s40 $field→value→set_boolean("sortable", $value);
  meta sync;
}
#Y5So0U6kuja7qcYn
action set_facetable(#ixA2MiTiaLSVM2y4 field: * Field_Definition, #N1cKfmDXmzaOzjAJ value: Boolean) {
  #XZCSsLPHqqk7YTvL // Typically used in a presentation of search results that includes hit count by category (e.g. search for digital cameras and see hits by brand, by megapixels, by price, etc.). This option cannot be used with fields of type ``Edm.GeographyPoint``. All other fields are facetable by default.
  #krrUHJIOpN3RCQrb $field→value→set_boolean("facetable", $value);
  meta sync;
}
#MyPZ4IgZFmxS54zN
action set_suggestions(#iFsze6SyV42ZeZpd field: * Field_Definition, #xMwbl4Hnh8rzvFUa value: Boolean) {
  #RfjI2ExEshMjIi6y // Sets whether the field can be used for auto-complete for type ahead. This can only be set for fields of type ``Edm.String`` or ``Collection(Edm.String)``. suggestions is false by default since it requires extra space in your index.
  #EedMmiyr4Mc1TBl5 // {box:hint}
  #xgUNG7AM5Tngu0U2 // If a field has none of the above attributes set to true (searchable, filterable, sortable, facetable, suggestions) the field is effectively excluded from the inverted index. This option is useful for fields that are not used in queries, but are needed in search results. Excluding such fields from the index improves performance.
  #BNdWeaufzH5tuOWR // {/box}
  #hR47S7bnBHmuyDhh $field→value→set_boolean("suggestions", $value);
  meta sync;
}
#R87L0H1K1XtBp6AN
action set_key(#PAMq4YbJHze2zRl4 field: * Field_Definition, #uOZ81zZ761UKOs3d value: Boolean) {
  #RnOptyqaQKcKtUkC // Marks the field as containing unique identifiers for documents within the index. Exactly one field must be chosen as the key field and it must be of type ``Edm.String``. Key fields can be used to look up documents directly.
  #xtCLKbwImPP2FVpi $field→value→set_boolean("key", $value);
  meta private;
  meta sync;
}
#QB1STQBxYIoFl3M2
action set_retrievable(#T8VVa5sAyV1qbhF4 field: * Field_Definition, #uXIBWaypDg5GIO9w value: Boolean) {
  #c3ESV4PH7ABRYiR5 // Sets whether the field can be returned in a search result. This is useful when you want to use a field (e.g., margin) as a filter, sorting, or scoring mechanism but do not want the field to be visible to the end user. This attribute must be true for key fields.
  #iUirN1GaoxisduPa $field→value→set_boolean("retrievable", $value);
  meta sync;
}
#xHimvrobpD22l6I1
action index_builder(#yBCjmom5hqOfaXx0 schema: * Index_Definition) returns(#ikjbH0hIViMdHopK jsb: Json_Builder) {
  #xzKE1pnavjYzTEWu // Gets the internal JSON representation of the schema.
  #zlG7NkadUVNM52Y6 $jsb := $schema→value;
  meta sync;
}
#sb27GK25Bqq7MSu9
action add_CORS_origin(#RWsJ4IN6j3mMCUcd schema: * Index_Definition, #LIp4txFzT2FBc9rL origin: String) {
  #EKBG9pkoYkU0Q2Jd // Adds an origin that will be granted access to your index. This means that any JavaScript code served from those origins will be allowed to query your index (assuming it provides the correct API key). Each origin is typically of the form ``protocol://<fully-qualified-domain-name>:<port>`` although the ``<port>`` is often omitted.
  #CEpSIQ89idGePM0h // {hints:origin:*}
  #AYQ7vmS2GCgxoPku // {box:hint}
  #xBnlFA6vFz1gX4YD // If you want to allow access to all origins, include ``*``. Note that this is not recommended practice for production search services. However, it may be useful for development or debugging purposes.
  #IohvHz093ImodKf1 // {/box}
  #x1k3WxvP8asY8i2A $cors := $schema→value→field("corsOptions");
  #M19Z58vwaGvnK6j2 if $cors→is_invalid then {
    #xgVhqSxle8b85xU3 $cors := web→create_json_builder;
    #f4rt43tQ6MfkAFNC $value := web→create_json_builder;
    #fmvsxCZke5ESMwlo $value→add_null;
    #PbrZ6Zki40Fw4HSB $value→clear;
    #gPk5pl4Ki05SO5YC $cors→set_builder("allowedOrigins", $value);
    #BDsZV9WfRh4GB2aI $schema→value→set_builder("corsOptions", $cors);
  }
  #jhnebxCV4XNilicT $cors→field("allowedOrigins")→add($origin→to_json);
  meta sync;
}
#xgKImrJcOXg8ISce
action index_schema_test() {
  #mlNHKSFF4VwT04Yp $schema := code→create_index_definition("index", "key");
  #Ic4M1buPNRtCjnAH $field := $schema→add_field("loc", "Collection(Edm.String)");
  #efpueJTB7VlU4wRZ $field→set_searchable(false);
  #kfp4dSOCT0lzR2sL $schema→add_CORS_origin("https://www.contoso.com/");
  #BTb29XTUlIC7LGi3 $schema→add_CORS_origin("https://www.contoso2.com/");
  #q0NbbJrR2343Lufz $profile := $schema→add_scoring_profile("profile");
  #iHyN18SZXX9UIYHV $profile→set_weight($field, 5);
  #Ee4SszBEZOmpGMsA $profile→add_magnitude($field, 5, "linear", 0, 10, true);
  #OFBRuIm5sLqjch4d $profile→set_function_aggregation("minimum");
  #i6A7bnHv3GSxPCur $schema→index_builder→post_to_wall;
  meta private;
  meta sync;
  meta test;
}
#xpsUcmHXLDUah9zi
action update_builder(#pMKLmxnqkRldtsds update: * Batch_Update) returns(#uiEClEW4p38WFEVY jsb: Json_Builder) {
  #xHTZbAjdFl4ZfJOv // Gets the internal JSON representation of the update.
  #NegdQwRNqWpyLy9G $jsb := $update→root;
  meta sync;
}
#cWrRnlX5xFt4hvGX
action index_definition(#cXFZ1AHBrt5Db8xe index_name: String) returns(#HXhP6AqowWR3BPTD schema: Json_Object) {
  #x9Rr0a1mbAoqPD6o // Gets the index definition from Azure Search
  #qIz7xeL89UP62EFj $request := code→create_request("/indexes/" ∥ $index_name ∥ "?api-version=" ∥ data→api_version);
  #xznCAPvq1PQO6SBt $response := $request→send;
  #i45dQIv84jjmpdHF if $response→status_code = 200 then {
    #wKi2P02Zs4hwKKUV $schema := $response→content_as_json;
  }
  else {
    #q7SVaDVd1Qfs52nj $schema := invalid→json_object;
  }
}
#xfZdrlaNnzYTxswq
action indexe_definitions() returns(#GC7Q8ZqiJHSP6Lbq schema: Json_Object) {
  #zeXVInLPZ2NVH2rC // Gets the list of index definitions from Azure Search
  #xo1rNfcPmBdYWoGp $request := code→create_request("/indexes" ∥ "?api-version=" ∥ data→api_version);
  #K0HOZuHCwIGUAwsl $response := $request→send;
  #qa8IqgXzJ80mBfVW if $response→status_code = 200 then {
    #xQGo2t0Da2znaYhl $schema := $response→content_as_json;
  }
  else {
    #PQWZ4AGEIWXZ2Xog $schema := invalid→json_object;
  }
}
#HM13lIHB8tuUpGsE
action add_scoring_profile(#n8LMtnRArcMAV4fI index: * Index_Definition, #Xf4wXvN4mLRqLjBY name: String) returns(#h5Xr1eGjvksttCZ7 profile: * Scoring_Profile) {
  #x13PXlGMdgWPnoQv // Adds a new scoring profile to the index. [read more](http://msdn.microsoft.com/en-us/library/azure/dn798928.aspx)
  #xZ9TuoH7zWHQbGSn contract→requires( `not` $name→is_empty, "name required");
  #ym7eIVca4x8FWeOk $jsprofiles := $index→value→field("scoringProfiles");
  #Ux2pNJ8R8INzOkVO if $jsprofiles→is_invalid then {
    #w0p7jK1XONpeM9sV $jsprofiles := web→create_json_builder;
    #mFKLNd7WuHr6maw2 $jsprofiles→add_null;
    #ygfMqFAkySZnTpOg $jsprofiles→clear;
    #ndaebnnAVckEUDMp $index→value→set_builder("scoringProfiles", $jsprofiles);
  }
  #x4v1NI7xFvw1oY5F $profile := records→Scoring_Profile→create;
  #PEMviM2OTQwXVmKk $profile→value := web→create_json_builder;
  #WI3wtYONqOwi4Y4Z $profile→value→set_string("name", $name);
  #JfSz08ss6X3ZTRKN $jsprofiles→add_builder($profile→value);
  meta sync;
}
#B4YNV73c4iN85zaX
table Scoring_Profile {
  type = "Object";
  persistent = false;
  fields {
    #VnBq5ex4EdurvNhG value : Json_Builder
  }
}
#b5CIzSYjnRH4l2vx
action set_weight(#Y77xl67EEA62tDyt profile: * Scoring_Profile, #xGYVGPHWTiuZ964T field: * Field_Definition, #WmiMoDV7C7O418ZG weight: Number) {
  #xDBf15O2jeUHpNaS // Sets the scoring weight of a **searchable** field. The weight is a relative positive # of instance.
  #B6M2fkgEci5noErb $jstext := $profile→value→field("text");
  #e74HZbOD35dMa2yH if $jstext→is_invalid then {
    #WdEd69BHkmJnGAih $jstext := web→create_json_builder;
    #xIokuhNBDDLGUhGP $jstext→set_builder("weights", web→create_json_builder);
    #dOiCGyJGOnNdPoAF $profile→value→set_builder("text", $jstext);
  }
  #g7v9te9lFRAX9wDH $jsweights := $jstext→field("weights");
  #aQY1BF1M4z4wzK9N $jsweights→set_number($field→value→string("name"), $weight);
  meta sync;
}
#xgBMLgLbMsOiPueY
action add_magnitude(#ZnqRYLazcSVQJw5S profile: * Scoring_Profile, #e0a45MnesR1F1nM1 field: * Field_Definition, #fbbOm4lM7jrHFPr9 boost: Number, #X6qNNZImyq9DocnM interpolation: String, #vkqEpV47uaKi22xP boosting_range_start: Number, #B0dZJlWNKZEYtJwb boosting_range_end: Number, #siQaoJViOeK0GXMd constant_boost_beyond_range: Boolean) {
  #b3cpKTHo3su4V0qt // Adds a magnitude function to the scoring profile for the given field.
  #Ph4TvQ2AGVPJNuuY // {hints:interpolation:linear,constant,quadratic,logarithmic}
  #x5m6LsQ4sSBQ2yuX $name := "magnitude";
  #c36mVwRUGp4ejv7x $jsfunction := code→add_function($profile, $name, $boost, $field, $interpolation);
  #x8lCbFB4KcLQdLG1 $jsmag := web→create_json_builder;
  #nu8BS942PX4dT2pQ $jsfunction→set_builder("magnitude", $jsmag);
  #bP1DRJjFoS6fPThd $jsmag→set_number("boostingRangeStart", $boosting_range_start);
  #qfCspNJd2B3aJZPS $jsmag→set_number("boostingRangeEnd", $boosting_range_end);
  #eCxqTtqhR7KRvXV5 $jsmag→set_boolean("constantBoostBeyondRange", $constant_boost_beyond_range);
  meta sync;
}
#xV4D8J90uIJPaT4a
action add_function(#YUPHwx49NUzAetdn profile: * Scoring_Profile, #uC7dzIlVXi949eZZ name: String, #ZwoDHHeZURJPP9Gg boost: Number, #Y6ATnzkZjSA5k6D5 field: * Field_Definition, #o3ukBjoKzwY7Sc41 interpolation: String) returns(#nH2V2Le9Nzd0i0xz jsfunction: Json_Builder) {
  #qHak6ibiiNx2J3OG $jsfunctions := $profile→value→field("functions");
  #LAsndFCMZwfx5mcH if $jsfunctions→is_invalid then {
    #T4UER02hN12nMJ45 $jsfunctions := web→create_json_builder;
    #HwZE1kqQiQwtW1lg $jsfunctions→add_null;
    #xqlFI8E44PPS7y8m $jsfunctions→clear;
    #PKtBW6fA4mIC23bg $profile→value→set_builder("functions", $jsfunctions);
  }
  #Mgo5lo4NvKMH2YiR $jsfunction := web→create_json_builder;
  #oX47hY7XXg4RP5F9 $jsfunctions→add_builder($jsfunction);
  #RS7Stu1p4O2asX6m $jsfunction→set_string("type", $name);
  #rz8S8NIHpuVG27M4 $jsfunction→set_number("boost", $boost);
  #l6NNZjKnoHRXDeZQ $jsfunction→set_string("fieldName", $field→value→string("name"));
  #hoq55xj9fdF3JzUX $jsfunction→set_string("interpolation", $interpolation);
  meta private;
  meta sync;
}
#xgXdzT4fMmWhwbOX
action set_function_aggregation(#JrTZALBQA776BPfr profile: * Scoring_Profile, #VsJDXpJoUDjbu2RI type: String) {
  #CwQIy6jtlL4tdBul // Applies only when functions are specified.
  #UYf0TnldojrYfNTs // {hints:type:sum,average,minimum,maximum,firstMatching}
  #I9jj9dFRf2jx284k $profile→value→set_string("functionAggregation", $type→to_lower_case→trim(" \t"));
  meta sync;
}
#BdGhpbmcgaW5kZXga
table Index {
  type = "Object";
  persistent = false;
  fields {
    #V86CDcQb84e0lASN name : String
    #xcDqLkQ02EP7YNN5 key_field_name : String
  }
}
#xFH25BcHIBihZWio
action key_field(#vY4O3vQFA2z39vy9 schema: * Index_Definition) returns(#bG7OXU71bD3itkdp key: * Field_Definition) {
  #qpH4kdjT1rPHpjVy // Gets the key field of the index.
  #xeq2yFSjvp2LirmY $key := $schema→\_key;
  meta sync;
}
#FgG7KkNi7CAipVW8
var logger : App_Logger {
  transient = true;
}
#agThRV0eEtEo5nMr
action reset(#xX4YvULiFTAHMdyU update: * Batch_Update) {
  #kM7umbfVaur285mc // Clears all the pending actions from the update.
  #n4RPcFVs88Oqo9Ee $update→root := web→create_json_builder;
  #uSHgh285T9Eshb9Q $update→value := web→create_json_builder;
  #xxfqBYN6Fguto2Fk $update→value→add_null;
  #MyMjNYNiRdL7xeLl $update→value→clear;
  #THB7Wu8Jcupn5EcJ $update→root→set_builder("value", $update→value);
  meta sync;
}
#z10L1ESpoqLr0XWf
action get(#lgVH71aHYsm9vKcm schema: * Index_Definition) returns(#xbWZdF23oSaV7HQi index: * Index) {
  #Gy2PBrv2l1f3bXSD // Gets the index without trying to create it
  #Z1S9DDG2Or6O2axj $index := records→Index→create;
  #U7iV2R92vwP8oNI8 $index→name := $schema→index_name;
  #x7Tc0CmKks2tUnIW $index→key_field_name := $schema→key_field_name;
  meta sync;
}
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
#ncMO4boBDbfQsUZl
action index_name(#RCpLGjVP2xZwJo2I @this: * Index) returns(#cQTUtE2zHCOAXENz name: String) {
  #xkYaEDqV4SuPGLLl // Retreives the index name
  #xgAtLPVHGY7ST51h $name := $@this→name;
  meta sync;
}
#QEj7Xjm8GE5p2W7j
action key_name(#SJjxQ6dAm4XZgfWu @this: * Index) returns(#ZAx53OIExKNojsYD name: String) {
  #PamRxAm3rkSoCq9Z // Gets the key field name
  #LRaPuj9oyXo2who1 $name := $@this→key_field_name;
  meta sync;
}
#E26ZAwMify5DZoY4
var global_options : * Options {
  transient = true;
}


