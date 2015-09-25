meta version "v2.2,js,ctx,refs,localcloud,unicodemodel,allasync,upperplex";
meta name "tdlite.search";
meta icon "Stacks";
meta color "#ffffffff";
meta rootId "XB5qSeVEwxml5HD8J4KyBklY";
meta iconArtId "qlndrnnm";
meta isLibrary "yes";
meta hasIds "yes";
meta platform "network,npm,shell";
meta parentIds "";
// Search support for tdlite. #node #azure #restify #rest #api
#TxC4jYtB4eCbqkvK
action init() {
  #p0Y5Cel6CoLi2eqV data→logger := app→create_logger("search");
  #wAEewFRXPH71QFZq code→init_art_search_index;
  #E2h04yJMqdlEXV43 code→init_docs_search_index;
  #i1XfwIQLLqio4Klu code→init_pub_search_index;
}
#eCcSdXIJwZ4CgSCU meta import azure_search {
  pub "wqkkc"
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
    action `async` init(options\u003f: ♻ azure_search → Options)
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
#xkSm2N5FGyxIt9oM meta import parallel {
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
#iXPcrpnb5DABoHb2
var logger : App_Logger {
  transient = true;
}
#vnFqTWAZZLXXPzKD
action init_art_search_index() {
  #pLb8M4ANhDKEk3ZZ $schema := @\u267b→azure_search→create_index_definition("art1", "id");
  #EbwjyIPwAlwou3cp $name := $schema→add_field("name", "Edm.String");
  #xigwgOHcAekgmSkF $descr := $schema→add_field("description", "Edm.String");
  #i3rigR7TXizuwbqH $type := $schema→add_field("type", "Edm.String");
  #xSqZI4f9Xzlen1V2 $type→set_searchable(false);
  #EsmEpyMgfbxfrhgy $type→set_filterable(true);
  #pugG9jAj6kEmGcJq $userid := $schema→add_field("userid", "Edm.String");
  #x6ZDMVQ01BsYCnVW $userid→set_filterable(true);
  #fqxpDsg8wArpE6Sk $username := $schema→add_field("username", "Edm.String");
  #xgka6hfpEWnkGNfa $time_field := $schema→add_field("time", "Edm.Int32");
  #xXbLX0Knx6s92yWX $sprite := $schema→add_field("sprite", "Edm.Boolean");
  #lwDAWU7J51g373mL $sprite→set_filterable(true);
  #pyDzHf0aV6kjM1e8 $imaggatags := $schema→add_field("tags", "Edm.String");
  #LzL4Qdg7TuRzpl93 $imaggatags→set_retrievable(false);
  #hQ3vmF2mc9S5zDVl $score := $schema→add_field("score", "Edm.Double");
  #vkZFpLXoMOWyK0dU $profile := $schema→add_scoring_profile("editorpics");
  #Zz6lTb0lqagGXrYI $profile→set_weight($schema→key_field, 10);
  #DeTeQxaoZk9T4cZJ $profile→set_weight($name, 5);
  #iAurAIkucwCLVdeh $profile→set_weight($descr, 4);
  #wJnM2SXgfR0TDiD4 $profile→set_weight($imaggatags, 1);
  #wFNqxoVC8h6Z2cbv $profile→add_magnitude($score, 5, "linear", 0, 10, true);
  #x2CWWan1r5J43HAq $schema→add_CORS_origin("*");
  #OwbgljDkB5PJ3Omt data→art_index := $schema→create_or_update;
  #JNmizvRqrS0qV7gd contract→assert( `not` data→art_index→is_invalid, "");
  meta private;
}
#BHN6KRctywsEKFMo
var art_index : ♻ azure_search → Index {
  transient = true;
}
#x4njRAkkCRlG4xzm
action init_docs_search_index() {
  #xowlKzDqH8I6bpo5 $schema := @\u267b→azure_search→create_index_definition("docs1", "id");
  #e9kbL4OF3ylMiP2P $schema→add_CORS_origin("*");
  #AQ1hSqsWzByIpY0e $title := $schema→add_field("title", "Edm.String");
  #T41xalTBCsJ1orxp $description := $schema→add_field("description", "Edm.String");
  #pj3PrlULiGTg4CRW $body := $schema→add_field("body", "Edm.String");
  #KjRvBViDMTfcIhlS $version := $schema→add_field("version", "Edm.String");
  #djMgpdEdCjqOVYIS $version→set_filterable(true);
  #tfaIom3UnDacQJas $version→set_retrievable(false);
  #pfJFxJq08zFArGEC $version→set_searchable(false);
  #OmLr3PLg1gexcw2I $locale := $schema→add_field("locale", "Edm.String");
  #FBp1Uoy7ttQ4AUz0 $locale→set_filterable(true);
  #GD2GNsvLoPK29lKG $locale→set_searchable(false);
  #nAUgvQ9BiDBI44PA $priority := $schema→add_field("priority", "Edm.Int32");
  #ScZNxM4i2rcVELYB $priority→set_retrievable(false);
  #O7rBdzfuZPJ97BD7 $priority→set_searchable(false);
  #cdTrBvPcJymCAfd5 $profile := $schema→add_scoring_profile("prioritized");
  #x73sNjlnRlYPon9H $profile→set_weight($schema→key_field, 10);
  #Cl9v9eZcBESFsrPg $profile→set_weight($title, 100);
  #xSVUkqEJyQt3vTyY $profile→set_weight($description, 50);
  #e0AYdBX2fxMbEosq $profile→set_weight($body, 10);
  #xLSIm2ZSic1gBzpb $profile→add_magnitude($priority, 2, "linear", 0, 0, false);
  #cE2JtBS2iwbbvEiY data→docs_index := $schema→create_or_update;
  #FbXqDIq2B4YNKeFe contract→assert( `not` data→docs_index→is_invalid, "");
  meta private;
}
#KGkU4YssB4LD5x4c
var docs_index : ♻ azure_search → Index {
  transient = true;
}
#xgROJ2MgGo2SSejw
action create_art_update() returns(#fzHU3ViqUuqBppb8 batch: ♻ azure_search → Batch_Update) {
  #fDvhLY4MQGIYkNwG // Creates a batch update instance that can be used to update the ``art`` index.
  #QyT1srmW7CY2oELK $batch := data→art_index→create_batch_update;
  meta sync;
}
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
#LADz26H4DbpDhf6I
action create_art_entry(#Vb3HkRTGKnW2qDRX id: String, #xzzvwA2vTwXZ4rl5 options\u003f: * Art_Entry) returns(#a4PeyGZJko0sz7B4 entry: * Art_Entry) {
  #fNpR0idSW4v8Ng7S // Creates an art entry to be indexed
  #KXDZ8uj3PsT1243O contract→requires( `not` $id→is_empty, "missing art id");
  #QhiUX9F6hCeBJEAV contract→requires($options\u003f→id→is_empty, "id already specified");
  #XlwVT90i72V2Q2r6 $entry := $options\u003f;
  #WodfXD4p3mcpAHHL $entry→id := $id;
  meta sync;
}
#v5y4CY8aagnlShap
action index_docs() {
  #PMqOGzMnOO99qdEw $jsversion := @\u267b→touchdevelop_cloud→get_json("language/version");
  #u5PMr5QNoBEctXBX $version := $jsversion→string("releaseid");
  #gDw0UfMRcCEJQYTg data→logger→debug("current version: " ∥ $version);
  #venkChsrTAJ2TiqG $topics := @\u267b→touchdevelop_cloud→get_json("doctopics");
  #QYhaGwiJVdzY4HbI data→logger→debug("received topics: " ∥ $topics→count);
  #sMtZ3lqxd89kCuKY $update := data→docs_index→create_batch_update;
  #opPYHt1ERzTUKweN @\u267b→parallel→for_batched($topics→count, 32, $item_action, $batch_action);
  #fnFxSjSKa4vDtoO4 where item_action(x: Number) {
    #xH8gOt3HedD4wNx6 $topic := $topics→at($x);
    #vbf2BlyeQiBy4Vep code→index_doc($topic, $update, $version);
  }
  #A4P7TMIQloQu6wBw where batch_action() {
    #hvelKi2tLUxxI2eY code→apply_batch_update($update);
  }
}
#tR0hE3zy2oNFRZql meta import touchdevelop_cloud {
  pub "sljse"
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
        #Zu4ZXv5BaY72usb2 service_root : String
      }
    }
    type Batch

    action `async` get(path: String, options\u003f: ♻ touchdevelop_cloud → Api_Options) returns(res: Web_Response)
    action `async` post(path: String, body: Json_Object, options\u003f: ♻ touchdevelop_cloud → Api_Options) returns(res: Web_Response)
    action `async` create_batch(options\u003f: ♻ touchdevelop_cloud → Api_Options) returns(batch: ♻ touchdevelop_cloud → Batch)
    action `sync` add_request(batch: ♻ touchdevelop_cloud → Batch, path: String, etag: String, options\u003f: ♻ touchdevelop_cloud → Api_Options)
    action `sync` create_url(path: String, options: ♻ touchdevelop_cloud → Api_Options) returns(url: String)
    action `async` test()
    action `sync` create_path(path: String, options: ♻ touchdevelop_cloud → Api_Options) returns(url: String)
    action `async` send(batch: ♻ touchdevelop_cloud → Batch) returns(responses: Collection[ ♻ touchdevelop_cloud → Batch_Response])
    action `async` list(path: String, options\u003f: ♻ touchdevelop_cloud → Api_Options) returns(list: ♻ touchdevelop_cloud → Item_List)
    action `async` next(list: ♻ touchdevelop_cloud → Item_List) returns(items: Json_Object)
    action `async` all(list: ♻ touchdevelop_cloud → Item_List) returns(items: Json_Object)
    action `sync` set_options(options\u003f: ♻ touchdevelop_cloud → Options)
    action `async` get_json(path: String, options\u003f: ♻ touchdevelop_cloud → Api_Options) returns(res: Json_Object)
  }
}
#uX6AxqDT5m9ok1jy
action apply_batch_update(#plwifWA3aAD6256x update: ♻ azure_search → Batch_Update) {
  #xSXG4S1FY7tA6a9u $status_code := $update→send;
  #xrF0jvlG2IyZXFwY data→logger→info("update ( " ∥ $update→action_count ∥ " actions): " ∥ $status_code);
  #gRlZ6zL2lBR9O8Dx $update→reset;
  meta private;
}
#Z41guUfKx9Qm2SnV
action index_doc(#i6MWGl5uRY4eMQQR topic: Json_Object, #IYErB2UT2faDvKw8 update: ♻ azure_search → Batch_Update, #At2Fvf8cZnxjJiE9 version: String) {
  #p4QYIvzKewtTmm4Z $id := $topic→string("id");
  #k1UniSd7NLtxJ1P3 $scriptId := $topic→string("scriptId");
  #x8nJHszIrq9vFZ41 data→logger→debug("indexing " ∥ $id ∥ " --> " ∥ $scriptId);
  #itNfX4hQxtV6nlI9 $doc := $update→upload($id);
  #kdHYOeBx1wg3ILvf $doc→set_string("title", $topic→string("name"));
  #iAsEUCz4hqBp90dC $doc→set_string("description", $topic→string("description"));
  #rK8MoFKYLY7o3zVs $doc→set_string("version", $version);
  #a2hAoyQnOuqCqGM7 $doc→set_string("locale", "en");
  #KiSsAT7wa2ZBuOYC if `not` $scriptId→is_empty then {
    #D6pjW4NMiMy9jbYv $docs_info := @\u267b→touchdevelop_cloud→get_json($scriptId ∥ "/docs-info");
    #ZT6mlZPWfuokMDrR if `not` $docs_info→is_invalid then {
      #eunY99Z1kz15VI2n $body := "";
      #LNKJdt2eHXUzmo3c foreach div in $docs_info→field("body")
      do {
        #J4NAnX8GO4ZZv3zU $body := $body ∥ "\\n" ∥ $div→to_string→replace_regex("<[^>]*>", " ");
      }
      #xXOBV08Aop9wWI2K $doc→set_string("body", $body);
    }
    else {
      #k37DKxVOZiTAEDHo data→logger→warning("failed to retrieve docs for " ∥ $id);
    }
  }
  meta private;
}
#TqUExktjmSiWx672
action example() {
  #ry4qotYnhgJa73ko // ### indices
  #xRDzGBxKlP5akMEp // There are 3 indexes in the current implementation:
  #xPniv7WZU5RpoSTZ // * ``pubs``, all publications
  #z2AcdTbZkqTIhJQK // * ``art``, specialized index for pictures and sounds. Used for in-editor art search.
  #qQA6CEF7O2nBT1CT // * ``docs``, specialized index for documentation
  #O2qemhD2uoz6T4fH // ### init and setup
  #XWzVX6eItV0loIzl // This library assumes that the ``azure search`` library has been intialized. The ``touchdevelop cloud`` library may also be initialized to point to a different cloud.
  #aSok4MfLu1iNNSgT // Simply call the ``init`` action to create the indexes.
  #GPRgpF4qyEgNDJw5 code→init;
  #weleXxDYWOs6apNZ // ### indexing docs
  #StcJgU6hxBSnSgAw // Simply call ``index docs`` to index a new set of documentation when a new version is live.
  #DrlAX517o6wwhFNN code→index_docs;
  #cUUwkUO2lKoYs5eE // ### indexing art
  #jiemxnjfigxysqO8 // Indexing (create, update, delete) can be batched.
  #xFKvFTxXTyC0GPKp // * create a batch update.
  #Sd3vLH6F9e3ZMZK0 $batch := code→create_art_update;
  #sC7qCZSvDmi9S4WA // * create or updatet an art entry
  #lYGDcXFT99xgkUP6 $entry := code→create_art_entry("uniqueid");
  #mWxamYOyA3ic2evw where name := "some picture";
  #WgVN1PZyMP92aAfS where description := "a description";
  #cqmbVRo27cpN2i2x $entry→upsert_art($batch);
  #z82KJZIrIKOT9fzc // * delete an entry
  #j6mU94i4IoGp285w $batch→delete("uniqueid");
  #Sx8FkRSbxGHzBZjk // * send the batch
  #Vpuqw2AsEI42CKoj $status_code := $batch→send;
  #p2l8QcseMMmedXqY // * clear the batch before uploading again
  #yoH1Z3v5Cf94CB0t $batch→reset;
  #moKEKXZJUlkbZNtF // ### indexing publications
  #xRJqiwxc6O3v8I2d // Use the ``to pub entry`` helper to convert a publication json payload into a pub entry; then proceed as with the art search.
  #TXvO2SgwJb6J4UPQ // ### searching publications
  #tHXsJFFdJOo9s29H $query := code→to_pub_query("pubs1", "script", "hello #docs ~@eijl feature:library");
  #xOf4pAZoM0H8TEgC $search := $query→to_search;
  meta private;
}
#UEdAUafYOyiuCEPs
action upsert_art(#C6hGE80qZIi0yJUY @this: * Art_Entry, #sx3BH7fjOv5AxwWD batch: ♻ azure_search → Batch_Update) {
  #yr6MORTAMe1aK98C // Upserts the art entry in the batch update
  #Fm6CCB4MGukK2ocH $doc := $batch→upload($@this→id);
  #E32md0ioTynXRYZY $doc→copy_from($@this→to_json);
  meta sync;
}
#oSkD36RC9a6W43dN
action init_pub_search_index() {
  #nPh2wP0ya3rU2Sz6 $schema := @\u267b→azure_search→create_index_definition("pubs1", "id");
  #C5cnj7FMU5Ol9AY2 $kind := $schema→add_field("kind", "Edm.String");
  #K7wXYcrudUODMArt $kind→set_filterable(true);
  #zDCdWcFGWPms4xjP $kind→set_sortable(false);
  #DyRie4L5H14xDfdX $kind→set_facetable(false);
  #Cha2BpTHqYRxCN59 $kind→set_searchable(false);
  #YM2OSIupmKs9G8IA $score := $schema→add_field("score", "Edm.Int32");
  #TDOdn1Alxr2BJ8S5 $score→set_filterable(true);
  #iHXBcRLAFSTZ44C0 $score→set_facetable(false);
  #xBUWVRx4nkSLQIl2 $score→set_sortable(true);
  #idORX6wzbLMyHEIb $score→set_searchable(false);
  #xUXQp2N0YoovookS $name := $schema→add_field("name", "Edm.String");
  #jzXjkGAvVXj4P622 $name→set_suggestions(true);
  #NeZtx3mWdjeItg78 $description := $schema→add_field("description", "Edm.String");
  #AZVP6wlP7kZp1Fe3 $editor := $schema→add_field("editor", "Edm.String");
  #wxbn5ioqq2g0ip0V $editor→set_filterable(true);
  #xKe1ccMzsu9cdw3v $editor→set_searchable(false);
  #PzONxqfmTdyPdn7v $editor→set_sortable(false);
  #xwIFEqeJynYeWKaV $body := $schema→add_field("body", "Edm.String");
  #vKjYJ4SV2HiZw9SC $body→set_retrievable(false);
  #pEYZ2B0tR3RV6fNZ $userid := $schema→add_field("userid", "Edm.String");
  #kjFZ3v8RcT2khmVw $userid→set_filterable(true);
  #xDicZ1PsWTif0BhA $username := $schema→add_field("username", "Edm.String");
  #x4d5jsq2enuDGiaW $time2 := $schema→add_field("time", "Edm.Int32");
  #w5KHtlFR2G3HeK4D $time2→set_filterable(true);
  #zYYTj6iz4cjFTpKr $time2→set_facetable(true);
  #eqg8LxpIm4ra2XeI $features := $schema→add_field("features", "Collection(Edm.String)");
  #xIb3SXGZUc40U9ES $features→set_filterable(true);
  #myjgr1cxaPCW8FOD $features→set_sortable(false);
  #x042sNRMZ5bxIWIC $features→set_searchable(true);
  #xFyPvxyFziI5hygl $hashes := $schema→add_field("hashes", "Collection(Edm.String)");
  #xW0M2H4SnV8pS8qj $hashes→set_filterable(true);
  #hDS39O0JJXpdddLN $hashes→set_sortable(false);
  #F7SZxytVl5m60Bm1 $hashes→set_searchable(true);
  #JcF45wyxZ7whZ2Of $art_kind := $schema→add_field("artkind", "Edm.String");
  #xWTasUeJ8U0RH5nh $art_kind→set_filterable(true);
  #aQpxDR5h8d5ETsFL $art_kind→set_searchable(false);
  #fpTHpeHNFO5rrhta $art_kind→set_sortable(false);
  #B4eUAv8BN8RZ0gwJ $art_type := $schema→add_field("arttype", "Edm.String");
  #wdPLvyTsObsMqAiu $art_type→set_filterable(true);
  #VCIoXEEyhAZSPxAJ $art_type→set_searchable(false);
  #xnsiUC06Iit8WtjA $art_type→set_sortable(false);
  #daOGf2ALgrnMoi2V $profile := $schema→add_scoring_profile("pubs");
  #c6dhXVkYa0GYy1Cq $profile→set_weight($schema→key_field, 10);
  #KU9PFgYJ5YPuSvdA $profile→set_weight($userid, 10);
  #b1mRm30We5oghrrU $profile→set_weight($username, 30);
  #XQLD5xjlUfUOspUI $profile→set_weight($name, 100);
  #JzvC4pAdIxAiX46N $profile→set_weight($description, 50);
  #Z1MCSAbguwKPq4By $profile→set_weight($body, 5);
  #Wnghxyliqh3fH7Vg $profile→set_weight($hashes, 20);
  #QW2YIBgQ0t2NGsY4 $profile→set_weight($features, 20);
  #gNtM3oUTSbx1X1Gy $schema→add_CORS_origin("*");
  #A5r6VbfgoCrawxER data→pubs_index := $schema→create_or_update;
  #Z43kUdYNtZyvzrOp contract→assert( `not` data→pubs_index→is_invalid, "");
  meta private;
}
#wZU5VyeEL2dNarho
var pubs_index : ♻ azure_search → Index {
  transient = true;
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
#R7ddnLvOHIDg7kYQ
action create_pub_entry(#JFH3WTJI6GLfUFrK id: String, #a4hqyKfbzIYAGDut options\u003f: * Pub_Entry) returns(#TG3u0WLZhgUdWfwK entry: * Pub_Entry) {
  #e4rt2s2truusemDN // Creates an art entry to be indexed
  #FH4iCFDDjAYwAz4M contract→requires( `not` $id→is_empty, "missing art id");
  #iwTWl4ZKNA1voINm contract→requires($options\u003f→id→is_empty, "id already specified");
  #EzRAPZB18SuF2k7a if $options\u003f→hashes→is_invalid then {
    #UiZvWJxevIrouNZU $options\u003f→hashes := collections→create_string_collection;
  }
  #xUeenAHeiiuQzTap if $options\u003f→features→is_invalid then {
    #xIyteEc5d6OcBFo7 $options\u003f→features := collections→create_string_collection;
  }
  #oScHLFxn2bFo6oS2 $options\u003f→id := $id;
  #ulABTjwPTrRAGlsW `return` $options\u003f;
  meta sync;
}
#n4SAThEL4pToS961
action upsert_pub(#xIbjUo3IbYqi8QDE @this: * Pub_Entry, #Nug4WUtUj0mJ4Imw batch: ♻ azure_search → Batch_Update) {
  #xMLOH9tYFWvKnd2f // Upserts the pub entry in the batch update
  #xxgUBfRQ7aMKsXQK $doc := $batch→upload($@this→id);
  #FgoUahIg0Mk4p5BM $doc→copy_from($@this→to_json);
  #hnEQTfNWNM3IT6m4 if false then {
    #LvGGttSXQdCP6qPG data→logger→debug("upsert pub: " ∥ $@this→to_json→format(2));
  }
  meta sync;
}
#xAxFU4TTSMo0zNIY
action create_pubs_update() returns(#xeBnsUS8OQ8uBPMC batch: ♻ azure_search → Batch_Update) {
  #q7U439ACP12Hp6Os // Creates a batch update instance that can be used to update the ``pubs`` index.
  #H5aTfifGJBAJFjO9 $batch := data→pubs_index→create_batch_update;
  meta sync;
}
#xi5Q3Pj5Y9dXwTbI
action statistics() returns(#ARBtUfhDzGjn12je res: Json_Object) {
  #AHqVipn4iPdFGF66 // Collects various statistics about the search indexes
  #Ib4eBw5stwHtWJGj $coll := create→Collection_of→\u267bazure_search\u200a\u2192\u00a0Index;
  #xGjKoqvMm9sfFRYm $coll→add(data→docs_index);
  #kztjhaAbQqPxk22p $coll→add(data→art_index);
  #xvbdBsegFh4hDh7W $coll→add(data→pubs_index);
  #QpJIuEGpJdlJxDVB $jsres := web→create_json_builder;
  #uijccdfyLZETMqfv @\u267b→parallel→@for($coll→count, $@action);
  #FhIpxEY9YvJDa161 where @action(x: Number) {
    #zwS4FgT8S2uvmrUc $index := $coll→at($x);
    #mf0glbG5m2I4JOgb $document_count, $storage_size := $index→statistics;
    #eno3gm0Qm73RmrBR $jsb2 := web→create_json_builder;
    #oizIp4MhhDJYYCcP $jsb2→set_number("docs", $document_count);
    #xuruqO2awYFxTu4n $jsb2→set_number("storage", $storage_size);
    #UZQctJ45nngnH9Lk $jsres→set_builder($index→index_name, $jsb2);
  }
  #XCyP4vLnpwjySHLT $res := $jsres→to_json;
}
#fLbjXPWp0pNblHuh
action clean_code(#tM68c7B9GDIkz4TB text: String) returns(#I8MlwesCYGl5e40S out: String) {
  #L29V8M2ubFaaKUXl // Removes unwanted characters, spurious whitespaces
  #cMCJB4vsVl2Ne4yj if $text→is_invalid `or` $text→is_empty then {
    #B52FLUTkCtUq0VmF `return` "";
  }
  else {
    #d0sgjTZxAhZZh5H4 // statement ids
    #m4NqbG3T6jCgoCNo $text := $text→replace_regex("#[a-zA-Z0-9]{12,}", "\n");
    #qqBVs24X5KkaWfJa // string resources
    #jP7kN5Z37A3JNKAm $text := $text→replace_regex("\"data:text/plain;base64,[^\"]+", "");
    #xYQtUwpS6B14IRv4 // html tags
    #y7mWD44DZxnjxYA5 $text := $text→replace_regex("<[^>]>", "");
    #ulLyjrxewvySoThS $text := $text→replace_regex("[^a-zA-Z0-9-+*/@_=\\.,\\s\"\"\':\\\\]", " ");
    #t0RXpbqLZB5sxFUi // spurious spaces
    #su0pBiBKon5m6XS3 $text := $text→replace_regex(" {2,}", " ");
    #d8mGVbyaLYTNvAqc if $text→count > 16384 then {
      #lNSG1xLrzxacrU7e $text := $text→substring(0, 16384);
    }
    #xpiAUoQ648yIXJD1 // make it all lower case
    #R8JQhgwIerGJ24vG $text := $text→to_lower_case;
    #KnOvsE5Klmz3gHIH `return` $text;
  }
  meta private;
  meta sync;
}
#CYJcPklLZoTI2iQz
action to_pub_entry(#XivCqDWK6tmXiPGD pub: Json_Object, #CVehyeMA4gUwPFOf body: String, #quUvR9SURjgE6d3C features: Collection[String], #jmZEdStJUCObltQc score: Number) returns(#HcwqAfovSPKwWLeA r: * Pub_Entry) {
  #hCDS9sNwcAKzcYag // Creates an indexable entry from a publication
  #xzddAqV3x1YfUsn2 $entry := code→create_pub_entry($pub→string("id"));
  #n8gPMwvzu622eeXP where kind := $pub→string("kind");
  #LGjUJAyLuI7Zb2vy where score := $score;
  #gIlhmHgbnZZoaj2j where userid := code→or_empty($pub→string("userid"));
  #ALux7Qy6CMttoNgo where username := code→or_empty($pub→string("username"))→to_lower_case;
  #PMpU39X1gEe4bboZ where body := code→clean_code($body);
  #lqwaq9YuGwa2qP6o where features := $features→map_to→String( `fun:elt` $elt→to_lower_case);
  #wkM1GkxTVisb4Vuh where time := $pub→number("time");
  #sUfU8mzZ8NrlKa87 // if not specified, assign editor to touchdevelop
  #nu4Sml0wBK3C8cK4 // some pubs have a name or description
  #nN2AohBwDUXd2CnM $entry→name := code→clean_query($pub→string("name"));
  #xAGq2CsGDKu8lqgt $entry→description := code→clean_query($pub→string("description"));
  #kxTcdugTLveBSt43 // specific indexing
  #xTm1NDcG5cDQwP28 if $entry→kind→equals("user") then {
    #dlTpqjWF3Ud4pj09 $entry→description := code→clean_query($pub→string("about"));
  }
  else { #EHeY2MN7i0HYQckS if $entry→kind→equals("group") then {
    #vMdS61CAmA1uaBZZ $entry→description := $entry→description ∥ " " ∥ code→clean_query($pub→string("school"));
  }
  else { #SgumyXC4GJD5TA0r if $entry→kind→equals("art") then {
    #CNMZdBD2V9rKS4Kv if $pub→contains_key("arttype") then {
      #A9ctrSfPD9Pjq4G4 $entry→arttype := $pub→string("arttype");
    }
    #x3fzlgSCeAnGgiEk if $pub→contains_key("wavurl") then {
      #xgeSlOvpR8dy4WPQ $entry→artkind := "sound";
    }
    else { #It1EGDPvYbrF6RxA if $pub→contains_key("pictureurl") then {
      #gaINJeO2z4P70FVm $entry→artkind := "picture";
    }
    else {
      #yQjSTCbSSswpn00y $entry→artkind := "document";
    }
    } 
  }
  else { #xgfKmQxGVsBim6AC if $entry→kind→equals("script") then {
    #xvtn8qVE0vUeZSbN $entry→editor := $pub→string("editor");
    #xMJPDKIJ9EY9oWRz if code→or_empty($entry→editor)→is_empty then {
      #KBAngQyolrEbd3IV $entry→editor := "touchdevelop";
    }
  }
  else { } } } } 
  #xsBPD1wvXyHxvwCg $entry→hashes := $entry→description→matches("#[a-zA-Z0-9]+")→map_to→String( `fun:elt` $elt→replace_regex("#", ""));
  #NypRXWs9O3jvSQA0 `return` $entry;
  meta sync;
}
#CSqQDLGceipZIPUd
action hashes(#anFikLePGYqgIisd description: String) returns(#VrE1ioEGFwywWtbQ hs: Collection[String]) {
  #qKvKCcyUVwTZHfWu // Extracts hashtags from description
  #kbzzv3n4Ue2MyKXE $hs := $description→matches("#[a-ZA-Z0-9]");
  meta private;
  meta sync;
}
#OZFB9mqiPsUt4M11
action or_empty(#oGvQY68rW6J9P8yZ s: String) returns(#ljX1XrqwQ8zHzAHU r: String) {
  #iEZWHjE9h68zpK6y if $s→is_invalid then {
    #N4ROulWykqPZ1LuB $r := "";
  }
  else {
    #L1Vm0H5Rt7MLQSHR $r := $s;
  }
  meta private;
  meta sync;
}
#HRf7zUVpbiFEXJ9O
action to_pub_query(#xwD8zfZSkz7lvMqq index: String, #xnkj7MFV4adhRInx kind: String, #B7U7uPCl27t9fru8 text: String) returns(#p6MJkCUVxNj3JlSU query: * Pub_Query) {
  #s3AIfwBvcgYpv4en // Parses the search text and returns a structured search query.
  #xWJsdoPCWxcL5EWM $query := records→Pub_Query→create;
  #xcZJESm84uzrXweC $query→index := $index;
  #xErUwJnEb0tdkiFs $query→kind := $kind;
  #xP28wrScJvsLB4I1 $query→orderby := "score desc, time desc";
  #vz5GWCsJeAaKvKvc $query→select := "id,kind,name,score,time";
  #PzGWYhSv6c4IEzvD $query→users := collections→create_string_map;
  #ZhXOWwhOBHcc6392 $query→features := collections→create_string_map;
  #j4WJmQWosUfXpEXg $query→hashes := collections→create_string_map;
  #xLCDGt379lms2zK7 // parse text...
  #mpifT8SzTFN4QiIc $body := collections→create_string_collection;
  #TGeXSmaWCg9X1qQj foreach word in $text→split(" ")→@where( `fun:elt` `not` $elt→is_empty)
  do {
    #AGOBGltV5Ke8T4rs $key, $val := code→parse_property($word);
    #ZiMpXfjqCWvWCO16 if $key→equals("userid") then {
      #xr8gAhPsbR8FKKvu $query→users→set_at($val, "true");
    }
    else { #upm6CgPlRLvhMi7r if $key→equals("feature") then {
      #LKNEXC4fvddJ3n9i $query→features→set_at($val, "true");
    }
    else { #YtWpcWChcvVwPn8J if $key→equals("libraries") then {
      #wf0EwdS325X9Nux2 $query→features→set_at("libraries", $val→to_boolean→to_string→to_lower_case);
    }
    else { #QBhYOuYCPlgnRwCK if $key→equals("scoring") then {
      #GLy8MUNdGjVWhUTf $query→scoring_profile := $val;
    }
    else { #x2lPvYxs1l2xOBGf if $key→equals("kind") then {
      #cgJE3POMSEUwf1Ou $query→kind := $val;
    }
    else {
      #zUmTASwRw4N6RsFg $m := $word→@match("(\\~)?([#@*])([a-zA-Z0-9_\\.]+)");
      #xEOlTfWh9ZYqte06 if $m→count > 0 then {
        #VfyTgmPHkwFjSwtf $enabled := ($m→at(1)→is_invalid)→to_string;
        #AH7jSxGCV0jfxHXr $op := $m→at(2);
        #aT4jp74zhPxSMLA3 $val := $m→at(3);
        #Ule94nMRfMEDis3G if $op→equals("#") then {
          #JVmF491NMpg2ieal $query→hashes→set_at($val, $enabled);
        }
        else { #xTzGY4Dft2KWLLe1 if $op→equals("@") then {
          #EQcEPawrdR156hrW $query→users→set_at($val, $enabled);
        }
        else { #xv0z9OcdTScvLrYL if $op→equals("*") then {
          #S3shqOJqfSzcHlYD $query→features→set_at($val, $enabled);
        }
        else { } } } 
      }
      else {
        #UgvnY7PZK46KTFdq $body→add($word);
      }
    }
    } } } } 
  }
  #GzFDqLGjB7mKRJKZ $query→body := $body→join(" ");
  meta sync;
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
#z5ekSLI401FuzopO
action to_search(#xJVEoRzyRoI25i2y @this: * Pub_Query) returns(#ZqMWMFalpQNTuN0x search: String) {
  #YyFDLNBlONRCCY22 // Creates the OData search request
  #Swm3YSQ4GwogVcoR $search := "*";
  #Ak8uZUcEis3FsaE9 if `not` $@this→body→is_empty then {
    #C7mfrQQ2bLhpMEbm if $@this→body→is_match_regex("[+*\\-|\")(]") then {
      #LpRT2AjnA5wdALi4 $search := $@this→body;
    }
    else {
      #aY5U6DMOV9bnbL7z $search := code→clean_query($@this→body)→split(" ")→map_to→String( `fun:elt` $elt ∥ "*")→join("+");
    }
  }
  meta sync;
}
#x0zgGEAQkdth4KtC
action to_filter(#xiexpQ3M6mDCK5p1 @this: * Pub_Query) returns(#xn7ygyMSR4H2kylB filter: String) {
  #bDC7K42Y835eM2iN // Creates the OData filter
  #wZxh6vjlo2rt0jRO $coll := collections→create_string_collection;
  #xMJYbspMmS2is8p4 if `not` $@this→kind→is_empty then {
    #h9J8q3PtTKUnuk83 $coll→add("kind eq \'" ∥ $@this→kind ∥ "\'");
  }
  #xHzr5bUGyVsKaYIA $included_users := collections→create_string_collection;
  #zEcHeCHSSMqMtBZi foreach user in $@this→users
  do {
    #M1gSnvHm7SZ4iNKK if $@this→users→at($user)→to_boolean then {
      #x8U402FXZ9MChBeF $included_users→add($user);
    }
    else {
      #p4Xn4eN3TYPil0s4 $coll→add("userid ne \'" ∥ code→clean_query($user) ∥ "\'");
    }
  }
  #xqHKADgMipceTiHw if $included_users→count > 0 then {
    #PuboMw09of6dQ9Sk $coll→add("(" ∥ $included_users→map_to→String( `fun:elt` "userid eq \'" ∥ $elt ∥ "\'")→join(" or ") ∥ ")");
  }
  #Nu2uEkEPRX2aCJ2P foreach feature in $@this→features
  do {
    #ge2wFkjic20rLWrn if $@this→features→at($feature)→equals("true") then {
      #XGwu8nn1g8WQtIW2 $coll→add("features/any(t: t eq \'" ∥ code→clean_query($feature) ∥ "\')");
    }
    else {
      #mCDLqRzlHHV46bRY $coll→add("features/all(t: t ne \'" ∥ code→clean_query($feature) ∥ "\')");
    }
  }
  #eGUeIkwTHncaL4vj foreach hash in $@this→hashes
  do {
    #KRqzOvJ2x222RJBR if $@this→hashes→at($hash)→equals("true") then {
      #pS2oOYXoCjvV5lVE $coll→add("hashes/any(t: t eq \'" ∥ code→clean_query($hash) ∥ "\')");
    }
    else {
      #eOh12Mtv0YUrb0l6 $coll→add("hashes/all(t: t ne \'" ∥ code→clean_query($hash) ∥ "\')");
    }
  }
  #x0LgrHH5ut6z7GLR $filter := $coll→join(" and ");
  meta sync;
}
#xnb7dcJbJ8auX2e0
action to_url(#LkBMniUb9cuqZjac @this: * Pub_Query) returns(#vJTVD1i4OADI0IZD url: String) {
  #sn6UPe16s46uvUje // Creates an Azure search url (``/indexes/..../docs?search...``) for this query.
  #GpShSfK3xhhDpROX $url := "/indexes/" ∥ $@this→index ∥ "/docs?";
  #xAoy7EGwkShObk7w $url := $url ∥ "search=" ∥ web→encode_uri_component($@this→to_search);
  #AkcWaGH13HtVWoux if `not` $@this→orderby→is_empty then {
    #PAOhjCJetocGQjLE $url := $url ∥ "&$orderby=" ∥ web→encode_uri_component($@this→orderby);
  }
  #jKGqoRQdxv3Vzmo4 if `not` $@this→select→is_empty then {
    #Jj5bAWaPgsaeJMOV $url := $url ∥ "&$select=" ∥ web→encode_uri_component($@this→select);
  }
  #NX7RQQsQccmyqJXR if $@this→@skip > 0 then {
    #V58E7cu27Zi01HOa $url := $url ∥ "&$skip=" ∥ $@this→@skip;
  }
  #r4S4z4cyyZtzZFfr if $@this→@top > 0 then {
    #rtzk16SqGAafV8dl $url := $url ∥ "&$top=" ∥ $@this→@top;
  }
  #gLfANYowSux1cLu9 $filter := $@this→to_filter;
  #H2J29wtuuXr1gGUM if `not` $filter→is_empty then {
    #xkeFmIOQUfsCbgQ3 $url := $url ∥ "&$filter=" ∥ web→encode_uri_component($filter);
  }
  #gHJHyIamxRstiaM3 if `not` $@this→scoring_profile→is_empty then {
    #CXuYU8ZEKn05M5im $url := $url ∥ "&scoringProfile=" ∥ web→encode_uri_component($@this→scoring_profile);
  }
  #QEWCoryezbUiMI0m $url := $url ∥ "&api-version=2015-02-28";
  meta sync;
}
#cYakRn4Ob26XOqvy
action is_empty(#UiaTj3G5DSSqr2Eo @this: * Pub_Query) returns(#l7ss41DSBF8MfBGz empty: Boolean) {
  #SVLXuzTu6Srl1wkx // Gets a value indicating if there is any filtering in the search request.
  #aeuk0CfUnfDsbsOZ $empty := $@this→body→is_empty `and` $@this→features→count = 0 `and` $@this→users→count = 0 `and` $@this→hashes→count = 0;
  meta sync;
}
#p4bCQ3YWyOspYHnI
action parse_property(#xtOUbo2o5nAo0qlM text: String) returns(#HwUnugF1DDj41QX7 key: String, #ynUFmDSCVr2nu4nj value: String) {
  #xVvytB3OcHsg48wL $x := $text→index_of(":", 0);
  #xPLcR6QUzPZ4fUXS if $x > - 1 then {
    #pq7jbTpqRN8bYtvo $key := $text→substring(0, $x);
    #MtHlAtxds0jBjek4 $value := $text→substring($x + 1, $text→count - $x - 1);
  }
  else {
    #hADPK4WjVsUCMowS $key := "";
    #W9G62xZ7i3B6E97e $value := "";
  }
  meta private;
  meta sync;
}
#yxUf4p5MXUHWerVr
action clean_query(#WD8IWpUEIqGctt2C text: String) returns(#fZuxon7cpoYlXSsj out: String) {
  #P8pnN8OIz76tRO4f // Removes unwanted characters, spurious whitespaces
  #xjUQyTbNTxcHClN6 if $text→is_invalid `or` $text→is_empty then {
    #spwqUEv448JlNDJc $out := "";
  }
  else {
    #uDDqWkxlHq24nEaR $out := $text→replace_regex("[^a-zA-Z0-9#@*~ ]", "");
    #vi2lhUAiO4kBRZlJ $out := $out→to_lower_case;
  }
  meta private;
  meta sync;
}
#AbTht2q9BFglThbT
action to_pub_query_test() {
  #qMQO7GdnPKtCwFUr $coll := "test\n@user\n#hash\n*feature\n~@notuser ~#nothash ~*feature\ntwo words" →split("\n");
  #jiQyYBjcucyFAJXV foreach s in $coll
  do {
    #y4Ta4bqe6eFxXIr1 $query := code→to_pub_query("pubs1", "script", $s);
    #mxuVXRKZnJnjgi9P $search := $query→to_search;
    #ZljtsaurqzUa1Ecy $filter := $query→to_filter;
    #xyYQ8ym4xAJ4Xo8r $url := $query→to_url;
    #vqvZi4p4sIXstQbO app→log($s ∥ " -> " ∥ $search);
    #E5WJIPuv7oW7Bc4P app→log($s ∥ " -> " ∥ $filter);
    #GpTC46XElTXLyscM app→log($s ∥ " -> " ∥ $url);
    #eMgjuur2mGJUaL5w skip;
  }
  #k9d1ZLFfQQNVfaJ0 skip;
  meta private;
  meta sync;
  meta test;
}
#xRfFXnXYzH8q8TOJ
var document_mimetypes\u002ejson : String {
  is\_resource = true;
  url = "data:text/plain;base64,eyAKICAiaW1hZ2UvanBlZyI6ICJqcGciLAogICJpbWFnZS9wbmciOiAicG5nIiwKICAiYXVkaW8vd2F2IjogIndhdiIsCiAgInRleHQvY3NzIjogImNzcyIsCiAgImFwcGxpY2F0aW9uL2phdmFzY3JpcHQiOiAianMiLAogICJ0ZXh0L3BsYWluIjogInR4dCIsCiAgImFwcGxpY2F0aW9uL3BkZiI6ICJwZGYiLAogICJhcHBsaWNhdGlvbi92bmQub3BlbnhtbGZvcm1hdHMtb2ZmaWNlZG9jdW1lbnQud29yZHByb2Nlc3NpbmdtbC5kb2N1bWVudCI6ICJkb2N4IiwKICAiYXBwbGljYXRpb24vdm5kLm9wZW54bWxmb3JtYXRzLW9mZmljZWRvY3VtZW50LnNwcmVhZHNoZWV0bWwuc2hlZXQiOiAieGxzeCIsCiAgImFwcGxpY2F0aW9uL3ZuZC5vcGVueG1sZm9ybWF0cy1vZmZpY2Vkb2N1bWVudC5wcmVzZW50YXRpb25tbC5wcmVzZW50YXRpb24iOiAicHB0eCIKfQo=";
  transient = true;
}


