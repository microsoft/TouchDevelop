meta version "v2.2,js,ctx,refs,localcloud,unicodemodel,allasync,upperplex";
meta name "azure table";
meta icon "Stacks";
meta color "#ff007fff";
meta rootId "xiPPHDCeFus2KPct2CMC8vGy";
meta isLibrary "yes";
meta allowExport "yes";
meta hasIds "yes";
meta platform "network,npm,shell";
meta parentIds "";
// Wraps azure-table-node module.
#main
action create_client(#kREmuTDOOUZADiWj options\u003f: * Init_Options) returns(#xWoHbMO1ymGPNv0s client: * client) {
  #x2rpUf4vMnBA1W4V // Create a client for Azure table service. The account options default to environment variables ``AZURE_STORAGE_ACCOUNT`` and ``AZURE_STORAGE_ACCESS_KEY``.
  #ubq2axN2DbLj9niH if data→logger→is_invalid then {
    #xeGYdEIiX2nFutBJ data→logger := app→create_logger("tables");
    #wRtVvhx3xPjwU5Wx app→import("npm", "azure-table-node", "1.4.x");
    #FZ02iPU8wmxUx432 app→import("npm", "util", "");
    #CdxE885o4a46bbsd data→log_seq_no := 1000000;
    #tfouVlrM5LwBi2Tr data→instance_id := code→create_random_id(6);
    #CnVNV72Wa4Q6LPYF data→logger→info("initialized");
  }
  #rReEE2MiN9wVx1am if $options\u003f→storage_account→is_empty then {
    #ZQmXxTX0gg2fRnk2 $options\u003f→storage_account := app→server_setting("AZURE_STORAGE_ACCOUNT", false);
  }
  #jFXdZi64TLrfRGVK if $options\u003f→storage_access_key→is_empty then {
    #eODdR8fiuN40jB10 $options\u003f→storage_access_key := app→server_setting("AZURE_STORAGE_ACCESS_KEY", false);
  }
  #l2oi1z2p6qjJi6s6 $copts := $options\u003f→to_json;
  #xkgj2n0sN4r7Xx51 // Setup azure client
  #qk8hY7D7KRKy4EMF app→javascript("local", "var azureTable = require(\'azure-table-node\');\n\nvar opts = {}\nvar agent = lib.Node.mkAgent(\"https:\")\n\nvar co = copts.value()\nif (co.timeout) opts.timeout = co.timeout;\nif (co.retries) opts.retry = { retries: co.retries };\n\n  var account = co[\'storage account\']\n  var key = co[\'storage access key\']\n  opts.accountName = account\n  opts.accountUrl = \'https://\' + account + \'.table.core.windows.net/\'\n  opts.accountKey = key\n\nopts.agent = agent\ns.d.removeTypes = function removeTypes(e) { return e }\n\nclient = azureTable.createClient(opts);\nclient.tdAccount = account;");
  meta sync;
}
#BdGhpbmca
table @table {
  type = "Object";
  persistent = false;
}
#lyADNKfzx04n32bb
action create_table_if_not_exists(#UN4yGftW26pLg0Bc client: * client, #hst2r13cAOQHLpC2 name: String) returns(#xdFZYbwfIahF31CX @table: * @table) {
  #o2D6i7ezgtz0pLSJ // Creates a new table if there is not already a table with the same name
  #EfN8raNzq423TOFC if `not` data→assume_tables_exists\_ then {
    #o2hgjZv8q62hKnSZ data→logger→debug("create table " ∥ $name);
    #Bwujt8UGFVOwyNn5 app→javascript_async("local", "client.createTable(name, {ignoreIfExists: true}, lib.protect(s,function(error, result) {\n  if (error)\n    TDev.Util.userError(\"cannot create table \" + error.message)\n  else\n    table = {name:name,client:client}\n  resume()\n}))");
  }
  else {
    #HJ2U3oBvQaqk9vhi data→logger→debug("would create table " ∥ $name);
    #tDEC3LIe4X3wzKPP app→javascript_async("local", "table = {name:name,client:client}\nresume();");
  }
}
#iuLggaX4ae79qi7LM5a8Xehi
action prep_entity(#jWcdUq0P14i2k9rV js: Json_Object) returns(#tWdSwBFMCLjVjN9o res: Json_Object) {
  #WIOTyD2Oi9LHYsRR code→check_partition_or_row_key($js→string("PartitionKey"));
  #nRLVdn0kjcP1C8lN code→check_partition_or_row_key($js→string("RowKey"));
  #DkiBV3s8dXnuIV9G foreach key in $js→keys
  do {
    #X3LpD4HG4sPoVSTp contract→assert($key→is_match_regex("^[a-zA-Z0-9_]+$"), "invalid characters in field name: " ∥ $key);
  }
  #GAa1xbmpaaYOkC4X $res := $js;
  meta private;
  meta sync;
}
#ba5xbubDhKu4uk2m
action table_op_core(#T9CgPMV866Vkcf0r @table: * @table, #xemD0QbKSCbj5eWL op: String, #XerKuKCU07yYNXAH entity: Json_Object, #i43cVAduRjj4pou2 with_etag: Boolean) returns(#NjL4KwU0fHBlXMU1 error: String) {
  #W8Wpb2Au8IUYGGL2 $start := data→logger→logger_duration;
  #ycCNszWx0iYlFCTX app→javascript_async("local", "var cb = lib.protect(s, function(err) {\n  if (err) {\n     if (err.statusCode == 412 || err.statusCode == 409) error = \"normal:\" + err.code\n     else if (err.message) error = err.message;\n     else error = util.inspect(err);\n  }     \n  else error = \"\";\n  //lib.App.log(\"table: stop \" + suff + \" \" + error)\n  resume()\n})\nvar ent=entity.value()\n//var suff = op + \" \" + ent.PartitionKey + \"/\" + ent.RowKey\n//lib.App.log(\"table: start \" + suff)\n\nif (with_etag && !ent.__etag)\n  table.client[op](table.name, ent, {force:true}, cb)\nelse\n  table.client[op](table.name, ent, cb)");
  #Bt4tdSQQmdpOOpo1 code→time_op_core($@table, $start, "write");
  meta private;
}
#kbd60p952lVkac4LlZbSsoR6
action table_op(#Q32h47LCcDw2pnsy @table: * @table, #Bp9B2DOCaCPzEPnU op: String, #zeJktsNQiEEjk9DW entity: Json_Object, #MSjeRMgAQ4ZkwW45 with_etag: Boolean) {
  #PPVu7312a08BZpjH $err := $@table→table_op_core($op, code→prep_entity($entity), $with_etag);
  #qdws44js4xM3wnMn contract→assert($err→is_empty, $op ∥ " failed: " ∥ $err);
  meta private;
}
#E5vskVxRHrxVcmrRaF2tlHua
action try_table_op(#b0pXAcRo6IFySOQ9 @table: * @table, #AKe7UPCsImS6Gfvr op: String, #ReLY859e7OlkkYHL entity: Json_Object, #xP3EldoYE16umg94 with_etag: Boolean) returns(#y6bm5mLiy1dk0uU0 ok: Boolean) {
  #xaqjkVJxpjXSS2hO $err := $@table→table_op_core($op, code→prep_entity($entity), $with_etag);
  #i3fMjxmTL6YCMi1W if $err→is_empty then {
    #x20pfJPQHvNhwPWw $ok := true;
  }
  else {
    #aJCvFne05YcS4u2u if `not` $err→is_match_regex("^normal:") then {
      #aA2ylfKzthVWWxw9 data→logger→info($op ∥ " failed: " ∥ $err);
    }
    #kYanXfHmXvs833Ca $ok := false;
  }
  meta private;
}
#aafp5CN1bNv2Gn5mkjDGqv5G
action insert_entity(#JLAxwIToum7aLWbk @table: * @table, #SIX3k8ATc3FyWRK3 entity: Json_Object, #ww6fKEphAmFjcsZ6 when_present: String) {
  #CNFt0rQXvX9RV1gZ // Insert an entity into a table (can merge or replace when its already present)
  #xheDSIB94sck2vzs // {hints:when present:,or merge,or replace}
  #peTVAjdRhyb8c762 $op := "";
  #PuMpW13mjIXLcKq0 if $when_present→equals("") then {
    #y4atAUnfm5H5lVNJ $op := "insertEntity";
  }
  else { #iWY0hEJa40SrYdOy if $when_present→equals("or merge") then {
    #TSavEMSw5BXAlvAT $op := "insertOrMergeEntity";
  }
  else { #G0l4Qp49uQUvN4xA if $when_present→equals("or replace") then {
    #xvOq54SxfcqKo3fT $op := "insertOrReplaceEntity";
  }
  else {
    #x441tY0IuHRi2mWK contract→assert(false, "wrong \'when present\' mode");
  }
  } } 
  #IU633vPXk3rilDCI $@table→table_op($op, $entity, false);
}
#vTIX2vJDwEDfstnKclNhUS2Q
action update_entity(#xBWGaVenDV1fLykR @table: * @table, #euvCujcCPpPJVTpk entity: Json_Object, #Arow5SjuDtSJWeei mode: String) {
  #hnFyaI35yBukAPNP // Update an existing entity in a table (can merge with existing fields or completely replace it)
  #l2QuxBSYXiAHFqiu // {hints:mode:merge,replace}
  #F02uuFIRjzjMwJeR $op := code→get_update_op($mode);
  #dKV98DMfVgXKHSwM $@table→table_op($op, $entity, true);
}
#x8055BCvdVvceSYWGUgC4JCA
action try_update_entity(#yyWZMQkNEZm6c0Dm @table: * @table, #GMcePk96KohzjXBL entity: Json_Object, #xoRLWkdVBk5KsqRb mode: String) returns(#PywFtmwmPMOD7K66 ok: Boolean) {
  #Ib23YWQG4ggPT80c // Try to update an existing entity in a table (can merge with existing fields or completely replace it)
  #xIBTGjLYsRhhEFHw // {hints:mode:merge,replace}
  #bQMwHUBIPtCUxyRR $op := code→get_update_op($mode);
  #APRUUkD41wx4Gfph $ok := $@table→try_table_op($op, $entity, true);
}
#KT5hZyWC84Ln49FcrUqL3yZC
action get_update_op(#noTOu6TMp0bf34wW mode: String) returns(#WgBomCfZTJAW7cTy op: String) {
  #Dx8m82262T4EGH3n $op := "";
  #tqNrK9wP2zDSfyTi if $mode→equals("merge") then {
    #nOSMI5b4M3D3ISRK $op := "mergeEntity";
  }
  else { #TNF53nQjmBDfHplo if $mode→equals("replace") then {
    #HGw3FE9bvp4xb412 $op := "updateEntity";
  }
  else {
    #by4Nnhvh8R85WTb0 contract→assert(false, "not a valid update mode");
  }
  } 
  meta private;
  meta sync;
}
#ntMeOA89z2DzUxigNZRnoUwa
action delete_entity(#z9wvTChgTrRRykRt @table: * @table, #sX69MaU8WuQXmMFZ entity: Json_Object) {
  #xYmZl9u4GjPfKIt3 // Remove an existing entity from a table
  #NWmCaHtZN1l5xBGy $@table→table_op("deleteEntity", $entity, true);
}
#OHPtQp2xnSn4EwlCZ612E8aZ
action create_entity(#xAP597aNtm9nRPXe PartitionKey: String, #io4QPS0TEU6TsQWF RowKey: String) returns(#xXMhzkHHYhTPCVbf entity: Json_Builder) {
  #l99fmMAMdgDatOud // Creates an entity with just a partition key and a row key
  #xhOOwL4xjGuxYpdg $entity := web→create_json_builder;
  #xVcb7EdeN8u2Ewgn $entity→set_string("PartitionKey", $PartitionKey);
  #GxeWVd576Qe2VnDf $entity→set_string("RowKey", $RowKey);
  meta sync;
}
#KWcE7q3dLjdYiLYkEYbveLds
action delete_table(#xhgoPxPrJjKmBesV @table: * @table) {
  #qEhzhOZ4XJMtHz1c // Remove an existing table
  #w75I6lWqq3A6f4wG data→logger→debug("delete table " ∥ $@table);
  #kzMhEiOsDWEC2ysc $err := $@table→table_static_op_core("deleteTable");
  #hwJyhxeL3co7s9Fb contract→assert($err→is_empty, "delete table failed: " ∥ $err);
}
#x2tF4IukPIjXpd0rW2x2vICy
action table_static_op_core(#OPeTSNR9W4knVgmu @table: * @table, #x3yuOAM7NvE6zJ4a op: String) returns(#Hbrcj4cc2XhpGSV4 error: String) {
  #TCAqSoTdzNv3yNRn $start := data→logger→logger_duration;
  #hmzghAorluP4tKbx app→javascript_async("local", "table.client[op](table.name, lib.protect(s, function(err) {\n  if (err) error = err + \"\";\n  else error = \"\";\n  resume()\n}))");
  #GcsNckx2jxbyYyYM code→time_op_core($@table, $start, "write");
  meta private;
}
#qYgW8IhJ8mnaOA3THHCsMYlz
table table_query {
  type = "Object";
  persistent = false;
  fields {
    #ayT1cueCrnDFvC4V82BNBxd4 @table : * @table
    #gsZQ3MBSsCNn5u2Y only_top : Number
  }
}
#t7D9tiyQZSJUHhWfc23kwTtR
action create_query(#xVRq4vY28X0kTbuv @table: * @table) returns(#x4yg9MXHP4nN17J1 query: * table_query) {
  #xCUYUrPLHpV8z4R9 // Initializes a table query
  #fSR02sHzBQnza0kn $query := records→table_query→create;
  #BWJfzTLvpFtaLEJE $query→init_query($@table);
  meta sync;
}
#b0gaUvGq4hq79YZXSrtajZbl
action init_query(#J2s0ri8maCr3hPEW query: * table_query, #x2rB8GuXcg0T7utc @table: * @table) {
  #xyKHGVoMdRfgfPOm $query→@table := $@table;
  #CTVE38HvKy2UH1Gy $query→only_top := math→\u221e\u208a;
  #KjDXURh0mM2vz4iX app→javascript("local", "query.query = azure_table_node.Query.create();\nquery.azureTable = table;");
  meta private;
  meta sync;
}
#XytLHTKyX275Vdj2AelpOyw4
action @top(#xfaEoiVL7CwA7ylZ query: * table_query, #pKTDkDBFBG94OwgL count: Number) returns(#PsXcSbA06dsXZg2b res_query: * table_query) {
  #ijiBtIYPzRDbuYEY // Return at most `count` elements.
  #k6642pMCyPX0po8E $query→only_top := $count;
  #wnpuE0tuydtFy4K4 $res_query := $query→page_size($count);
  meta sync;
}
#NXl9pQ60qlZsV3ZfQmBamYMt
action partition_key_is(#jxV2cu2d0pCi6098 query: * table_query, #R1V64Rj2b4nMgQDd PartitionKey: String) returns(#I7fFA2Hfej9nP38W res_query: * table_query) {
  #x8bJTE44qrTt2qq2 $res_query := $query→@where("PartitionKey", "==", $PartitionKey);
  meta sync;
}
#AMvV08YXxvnytOfSPeHEbri9
action expr_core(#o9OSyELTYhkvEz4c query: * table_query, #jccPIrqo98Q5qijd op: String, #ATuqS8pMLY8SXA64 field: String, #o49jSJ2p9YdmU4Tc comparison: String, #zbhG9eQB2Ee5RJaG argument: String) {
  #xEdsmXUpqd4fX6xb app→javascript("local", "query.query = query.query[op](field, comparison, argument);");
  meta private;
  meta sync;
}
#rYqohs4UpraUgQRGBEnTgKpv
action @and(#lhPoyucD6SE9T4ci query: * table_query, #xfM9W54f4R41QByu field: String, #EUZul6hYpRXKwLOz comparison: String, #xRp6O6aBvS98xwZL argument: String) returns(#pKcMxZB86LVs27OD res_query: * table_query) {
  #xzMQlk1f7kp02NNL // Adds AND clause to the query. Cannot be first.
  #ET70ZpZ2gj04WVyq // {hints:comparison:==,!=,<,>,<=,>=}
  #MrLEgdqTCUZbnlAd $query→expr_core("and", $field, $comparison, $argument);
  #tJTZwt29cF9wxXuY $res_query := $query;
  meta sync;
}
#yXqdJTQpjwQIZBuEaBhjAyzZ
action get_entity(#wTVEGcKoF2V9sPTZ @table: * @table, #go08CcATV7Y6UC0O PartitionKey: String, #x43YB9ZZayzhgIeF RowKey: String) returns(#md9Lj6ZWkgxD2Z8N result: Json_Object) {
  #xknuzKrcDjTuqeZ2 // Retrieve a specific entity from a table; returns invalid if missing
  #mykcYCJmRyeJcFkV $start := data→logger→logger_duration;
  #mOxU9p42EFe3qZUz app→javascript_async("local", "table.client.getEntity(table.name, PartitionKey, RowKey,\nlib.protect(s, function(err, ent) {\n  if (err) {\n     if (err.statusCode == 404) {}\n     else lib.checkAndLog(err);\n  } else if (ent) {\n      result = lib.JsonObject.wrap(s.d.removeTypes(ent)); \n  }\n  resume()\n}))");
  #xhnm4G0EkDnDjgyQ code→time_op_core($@table, $start, "read");
}
#QhApK5pA1PPBgvzW0qPKYA2K
action page_size(#xpz214Hmok2FccR7 query: * table_query, #xR2Rl0Vg8FGwGxkw count: Number) returns(#ZcPihmuLI5yh1KYg res_query: * table_query) {
  #n7h32ZVXgVnXpQk5 // Don't return more than `count` elements at the same time.
  #c1JkRE2uLXyYI5Qq app→javascript("local", "query.limitTo = count;\nres_query = query;");
  meta sync;
}
#RbANiRNrToZnw9qbPOHuuzk4
action fetch_all(#Zb3nCphLmBGV7SaV query: * table_query) returns(#xknakEiotDsdIoXo entities: Json_Object) {
  #x04w62bml2S3ywwo // Fetch all (or `->top`) results of the query.
  #xf2M3UGPg6ao3p43 $coll := create→Collection_of→Json_Object;
  #x24eaRkJBls6iKyA $has_more := true;
  #RIfmCA1b2UMpKrkf while $has_more do {
    #VZPQ6isznb4dBtYR $entities2, $token := $query→fetch_core;
    #xMOBJH6i2P1zaHXs foreach js in $entities2
    do {
      #gYRzxX93mD84d92L if $coll→count < $query→only_top then {
        #vKgFwSXzOwmWGMSk $coll→add($js);
      }
    }
    #yGFjNyczqQaMnliV if $token→is_empty `or` $coll→count ≥ $query→only_top then {
      #plgnQEBtGbE6gVaE $has_more := false;
    }
    else {
      #x4ySmP0wZzEYI7Qp $query := $query→continue_at($token);
    }
  }
  #J4sb04I1yzhAPEx7 // Reset continuation token.
  #e7JCjFf2DUAO244K $query := $query→continue_at("");
  #neJ9YFnqxsx12Edx $entities := $coll→to_json;
}
#OaUgvB0N9wpJWI69XlxMxljc
action create_log_id() returns(#qdZsqsmabS8ArtVU id: String) {
  #cAM0PodrwMnRHfA9 // Creates a log id (in decreasing order)
  #kU4bAlEu7jXlusFh $x := 20000000000000 - time→now→to_json→to_number;
  #mZxqgoTromajxi4m data→log_seq_no→\u25c8add(1);
  #xnJDgQKEcmX43mkC $id := $x ∥ "." ∥ data→log_seq_no ∥ "." ∥ data→instance_id;
  meta sync;
}
#no4VNFqDBB1IQjOr8KB4Am8E
var log_seq_no : Number {
  transient = true;
}
#Qqh8ajE92y2FqIxH4u1EyJjF
action create_random_id(#KWTv2658aOP5bG6A size: Number) returns(#CAgrjkjQiMEG3Ktp id: String) {
  #xjIMX9PgVall4Nc5 // creates a random id
  #xVEMWRDP7Ew0ePKd $buf := bits→create_buffer($size * 2);
  #ZEzGxDRtBbe4OcxQ $buf→fill_random;
  #jHfWQ6Hfpv12dpy0 $s := $buf→to_string("base64")→replace_regex("[^a-zA-Z]", "");
  #xNqevvUokiS1caXj if $s→count < $size then {
    #Rcpj44P2XXJj417z // this is very unlikely
    #GIn9c8di7j9djt4u $id := code→create_random_id($size);
  }
  else {
    #aUkYwo4KM23Jqb7j $id := $s→substring(0, $size);
  }
  meta sync;
}
#uuHdHRSu4qHmMYa0yV2vQj4i
var instance_id : String {
  transient = true;
}
#dNwt32a1VG8Ouh2gn5iLuWtJ
action example() {
  #snAClOAeMqMniiYD // This library gives access to the [Azure Storage Service](http://azure.microsoft.com/en-us/documentation/articles/storage-nodejs-how-to-use-table-storage/).
  #FDiImqq3GeeU42Ew // ### initializing the library
  #LYeqaCOUZsDLhmIL // The azure module will read the environment variables ``AZURE_STORAGE_ACCOUNT`` and ``AZURE_STORAGE_ACCESS_KEY``, or ``AZURE_STORAGE_CONNECTION_STRING`` for information required to connect to your Azure storage account.
  #q94isAdMM4JRNI23 $client := code→create_client;
  #Lb2fpsZukUDOcV80 // ### working with tables
  #ZfiFHBgv2CSHBuiU // You first need to create a table, or get a handle to it, if it already exists.
  #idIYA9aQWd8sJFBC // * create a table
  #Tko5lCw2c2CFCQnj $@table := $client→create_table_if_not_exists("table0");
  #ryMklbcv2f4rOryN // * create an entity
  #xwxohN55K31f2Hk5 $entity := code→create_entity("testpartition0", "testrow0");
  #x1Li4FBLbC2sqbGB // * set any properties you want in the entity
  #xyiN5Dr5KXkEtH1T $entity→set_string("name0", "value0");
  #eu6fvSlepUD0qVWx // * insert the entity into your table. The second parameter can be "", "or merge", or "or replace".
  #lpHC8xK01MX2BKoP $@table→insert_entity($entity→to_json, "");
  #opIqymh3hGaX9Wkf // * retrieve an entity based on partition key and row key
  #EKimYsat9gQdvM80 $retrieved_entity := code→get_entity($@table, "testpartition0", "testrow0");
  #uUhwOQkXzxhato4L // * try to update an entity, will return true if the update succeeded. The third parameter can be either "merge", or "replace". "merge" will merge the two entities, taking all properties from both. "replace" will remove any properties present in the original entity and only use properties from the new entity.
  #Up5Xpoh1FUs2FiHc $ok := code→try_update_entity($@table, $retrieved_entity, "merge");
  #hU4AqtWp47p6TpAY // * update an entity
  #qTTXurunDW2hr2hv code→update_entity($@table, $retrieved_entity, "merge");
  #KbzKI312uKZo6dIa // * delete an entity
  #xJkKCvHxpiFUHoMK code→delete_entity($@table, $entity→to_json);
  #wrbUeUxz23x8PO3i // * delete a table
  #u3DOxPSTseBdjx4z code→delete_table($@table);
  #xSGRd0PxhwuVe5Kq // ### querying a table
  #kKJshf0XyWK1zB91 // * first initialize the query
  #x2t3iGHZxaYYZ6cL $query := code→create_query($@table);
  #PqJCt9z3mOHfC9IF // * then add to the query
  #xVbNFU4gRXXJmbjA // * query based on partition key
  #nIA9VSSYPSJS2xOL $res_query := $query→partition_key_is("testpartitionkey1");
  #G4zBMFw9wd2CM81U // * use 'and', 'where', or 'or' to add to the query like so
  #nWexSYcre5ZOhAV8 $res_query2 := $query→@and("RowKey", "<", "5");
  #BITSiJLvKuiaP7WF // * All comparisons are string comparisons
  #Mia0KYso0etK4pFK // * then pass your final res query to `fetch all` to execute the query. This will return a JSON object with all the entities that fit the query
  #e4WDB0O5hFcCfqE2 $entities := code→fetch_all($res_query2);
  meta private;
}
#a2pH26EAvC1GTeKb
action check_partition_or_row_key(#LNs6SlzY2m1sEZMx s: String) {
  #lMkyGUVLNH8uEoKZ contract→assert( `not` $s→is_invalid, "Partition/RowKey must be present");
  #nJfouFQxzT903NPI contract→assert( `not` $s→is_empty, "Partition/RowKey must be non-empty");
  #wyR3cni5iZq02bR8 contract→assert( `not` $s→is_match_regex("[\\/\\\\\\?#]"), "Partition/RowKey cannot contain \\ / ? #");
  meta private;
  meta sync;
}
#xo6I56mWIGxkW4ik
var logger : App_Logger {
  transient = true;
}
#xKscS1hp8iJmTxpF
action @where(#LSTNymuL22jETFAF query: * table_query, #xyWNdHvrejgeR9D1 field: String, #Vjn0jKW2B4LW2jYV comparison: String, #uvsaZzwFCKwVfMWK argument: String) returns(#WZ9A7W7mZlVmOEsV res_query: * table_query) {
  #tAhcEgZaJeE9rNPv // Adds a clause to the query. Has to be first.
  #iOJKIJLReuYDihiz // {hints:comparison:==,!=,<,>,<=,>=}
  #ViZ5bEIOnvd2fHlg $query→expr_core("where", $field, $comparison, $argument);
  #LA09ZD4D6S8VAUwr $res_query := $query;
  meta sync;
}
#HpQKVed1KG3Q4MDm
action @or(#bEagY763p112LtcI query: * table_query, #C99q4GJBGoMDervl field: String, #xn8l3vgr6T3MgWp0 comparison: String, #EfFIKBBir8apZQAP argument: String) returns(#wSNWj6GoJdDCRzoY res_query: * table_query) {
  #vVkh7Bx2NWMeeCbe // Adds OR clause to the query. Cannot be first.
  #x4oVymF271l595sE // {hints:comparison:==,!=,<,>,<=,>=}
  #xW4xBTBkt48Hxzrt $query→expr_core("or", $field, $comparison, $argument);
  #Xf2yhSUbPcT12XSe $res_query := $query;
  meta sync;
}
#PBLzcpZQjoXOe7d3
action continue_at(#cKx8zICCT86vQuSD query: * table_query, #BNtCC4szHkcC9A3o token: String) returns(#h8DnJJjAwr5KeBrC res_query: * table_query) {
  #mi52uiKOHjiJkhzh // Restart a query at `token`.
  #Wrfuixp0izhQh5q1 app→javascript("local", "if (token)\n  query.continuation = token.split(/\\//);\nres_query = query;");
  meta sync;
}
#S7lfKMHxL9DUW2De
action fetch_core(#xjdhN2C0e3sH9U39 query: * table_query) returns(#W0p2ogWljGMKpOsk entities: Json_Object, #vAy7H4J38g0Ax1Ce token: String) {
  #xh7RHDkzlfGQ0FwG $start := data→logger→logger_duration;
  #z46ZM2gln4SJ3A8V app→javascript_async("local", "query.azureTable.client.queryEntities(query.azureTable.name, query, lib.protect(s, function(err, res, cont) {\n  if (err)\n    TDev.Util.userError(\"error executing query on azure table \" + query.azureTable + \": \" + err);\n  entities = lib.JsonObject.wrap(res);\n  token = cont ? cont.join(\"/\") : \"\"\n    resume();\n}));");
  #ZYmoDcgZvtFKeOnm code→time_op_core($query→@table, $start, "read");
  meta private;
}
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
#xdlKTDBvZg1uAdxQ
action with_etags(#Xb1gjqiqh3M6jVKu query: * table_query) returns(#dn1veTKHscTkpYcn res_query: * table_query) {
  #xoFsnC46UDTgTkO7 // Include `__etag` field to each returned entry.
  #cCrCMSSvmyCctSog app→javascript("local", "query.forceEtags = true;\nres_query = query;");
  meta sync;
}
#pt9Ipk4wShYgh2ms
action fetch_page(#xkPBjvl6qgGRknj5 query: * table_query) returns(#aXpNl4ro9AjYPPVo entities: * query_result) {
  #DkTs6wURc4NPdB00 // Fetch one page (~1000 or `->page size`) results of the query, and allow for continuation.
  #xxeV2FLMrncA944W $items, $token := $query→fetch_core;
  #R0saE210q8ClKvpH $entities := records→query_result→create;
  #pn8QOzJHg7nHcX2n $entities→items := $items;
  #twxe2C7SjELHNhS0 $entities→continuation := $token;
}
#HQ4PHVYQWf7t4obA
action try_insert_entity(#cvmI3uEsK3Z4Hap7 @table: * @table, #kc0xEX2KYfjPaMo1 entity: Json_Object) returns(#lCf69MnuAKJNFSZb ok: Boolean) {
  #xEPhGEYgc4I4e5Li // Try adding a new entity into a table
  #xk6yhTSaTVygH4W4 $ok := $@table→try_table_op("insertEntity", $entity, false);
}
#bbQMUSuXsSS1KsfC
action assume_tables_exists() {
  #xGyDUcGrUYbyUshw // Assume tables already exists for `create table if not exists`
  #nx0EKYPKuuBZ37r2 data→assume_tables_exists\_ := true;
  meta sync;
}
#MzHh2rut9zEvSxhP
var assume_tables_exists\_ : Boolean {
  transient = true;
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
#GZBIxF45KDW8iZUS
action create_reverse_log_id() returns(#PFEpk31rfhVObrMS id: String) {
  #dacEETwcNZCBz8mP // Creates a log id (in increasing order)
  #B98dcElhWLxIIBs8 $x := time→now→milliseconds_since_epoch;
  #ItfnwogbZtPkaUs0 data→log_seq_no→\u25c8add(1);
  #VFjSEY3QcbZ4K2bR $id := $x ∥ "." ∥ data→log_seq_no ∥ "." ∥ data→instance_id;
  meta sync;
}
#ysj98n2v2M5bn28k
action try_delete_entity(#x78Q2ZXhzPsKhEFt @table: * @table, #PP2jHAbZzPVEl1wo entity: Json_Object) returns(#T8kXimgySfOoe2Ta ok: Boolean) {
  #L11lys9eClBYIZp4 // Try to remove an existing entity from a table
  #z2vY8avSqcbjDEp2 $ok := $@table→try_table_op("deleteEntity", $entity, true);
}
#BVGhpbmcgdGFibGUa
table client {
  type = "Object";
  persistent = false;
}
#lsNNYP1r3B5j41D4
action time_op_core(#ij8cSEA4HGLh0FLl @table: * @table, #r7e9OisJrVQJmGR9 start: Number, #ySTo4JWsPstDTM2u id: String) {
  #bG2d4ONMjk2oF2k5 $delta := data→logger→logger_duration - $start;
  #xO2HbTXSmbrWq6Ah data→logger→measure($id ∥ $@table→suffix, $delta);
  meta private;
  meta sync;
}
#xK9uVPe3xpqZk4uW
action suffix(#eKIrcmAlQyOy2L4C @table: * @table) returns(#dOfgqzu7LJOTSnou pref: String) {
  #TzGZOln2OO1HZaDz app→javascript("local", "pref = \"@\" + table.client.tdAccount");
  meta private;
  meta sync;
}
#Lu2XGSdplyhGl2FH
action try_insert_entity_ext(#bBQQcAeNt5wc4Rfa @table: * @table, #x58q43cmqIQDdXxk entity: Json_Object, #xcjSsbXjEl4Lq809 when_present: String) returns(#RNUXZhNZ6FPjBDJN ok: Boolean) {
  #InnGEUuZuQzhneaa // Insert an entity into a table (can merge or replace when its already present)
  #JJDGLOY0VSQQ9rz0 // {hints:when present:,or merge,or replace}
  #rVg7tS4TQFGmqpjg $op := "";
  #xmFR6fqJcAMTXfsI if $when_present→equals("") then {
    #IoD2j6NwJSAS2JNe $op := "insertEntity";
  }
  else { #pHyCLu6MtQW37DD5 if $when_present→equals("or merge") then {
    #MsIiQ32JooFW8Z5I $op := "insertOrMergeEntity";
  }
  else { #xQMS3CV12iL8RNCP if $when_present→equals("or replace") then {
    #WJ7asO8Tz3xe1vSE $op := "insertOrReplaceEntity";
  }
  else {
    #bsM2OmJj2JoYnSqI contract→assert(false, "wrong \'when present\' mode");
  }
  } } 
  #KWr30e3HgSjNpcjW `return` $@table→try_table_op($op, $entity, false);
}


