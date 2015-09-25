meta version "v2.2,js,ctx,refs,localcloud,unicodemodel,allasync,upperplex";
meta name "redis";
meta icon "PieChart";
meta color "#ffffffff";
meta rootId "xscwQ2oQHcTGZT8f07wR0P9U";
meta iconArtId "srkxkiju";
meta isLibrary "yes";
meta allowExport "yes";
meta hasIds "yes";
meta platform "network,npm,shell";
meta parentIds "";
// A library to write redis cloud services. #node #azure
#NUQz2kJVJLPjqWjL
action init() {
  #akgH4bXTO91ZMh65 // Imports the redis module
  #I8rkv9WN7SzvlXfB if data→logger→is_invalid then {
    #y5O9hHi0gzc2X4wA data→logger := app→create_logger("redis");
    #qm3gMUra8b0YlnYL app→import("npm", "redis", "https://microbit0.blob.core.windows.net/files/npm0/redis-0.12.1-tls.tgz");
    #gs7FDIaYcW62uFbg data→logger→info("initialized");
  }
  meta private;
}
#BdGhpbmca
table Client {
  type = "Object";
  persistent = false;
  fields {
    #lj2emsZeUCgf4pPA last_time_sync : Number
    #tbqROeEC4YWiZM0g time_delta : Number
    #I6gekf0EaEWZwuCG last_cached_time_reading : Number
    #sN2igoNe2tl4cPad hostid : String
    #klnoRU0TDUiAUXz3 last_status_report : DateTime
  }
}
#mKGLVW5IuAuDa9w4
action create_client(#u7JjyFbt5nLr20sm host: String, #xIDyI3V4CQdV71Fr port: Number, #YSTpZRhpjBksufqO password: String) returns(#xVb5pZfLidWMW9vZ client: * Client) {
  #xNNLKUFkdP0ng9oX // Creates a redis client and authenticates using the password
  #o5pzCvu3ruoUgPoa if $host→is_empty then {
    #oe2qPniSCXSCq8qI $host := app→server_setting("REDIS_HOST", false);
  }
  #i9AoEoZhzYNTQwUk $usetls := false;
  #i1COU4VLviLwQCHs if $port = 0 then {
    #xRLtUCzyrK61Bkqf $s := app→server_setting("REDIS_SECURE_PORT", true);
    #AvcYDkoKRAcBmmN2 if $s→is_invalid `or` $s→is_empty then {
      #jcH98pS7NGXXaTYz $port := app→server_setting("REDIS_PORT", false)→to_number;
    }
    else {
      #FbsxEeEXMV2O1FGK $port := $s→to_number;
      #xCEhfn6G4IVdPyuY $usetls := true;
    }
  }
  #rLc2a3Mid46pzBPM if $password→is_empty then {
    #bF0g47Zno9vIaqmJ $password := app→server_setting("REDIS_PASSWORD", false);
  }
  #xOpz3pQaKdDQgGcP code→init;
  #aUfQccDeItz0p0oX $client := records→Client→create;
  #V5jXbnWdjNSY4Yk4 $client→hostid := $host→replace_regex("\\..*", "");
  #McY2pxX69KTt1V7e $logger := data→logger;
  #iIMEQ9e5Pb90ozhb app→javascript_async("local", "client.mkClient = function() {\n  var c;\n  if (usetls) {\n      logger.debug(\"creating secure connection to \" + host)\n      c = redis.createClient({\n          tls: { port: port, host: host }\n      });\n  } else {\n      logger.debug(\"creating plain connection to \" + host)\n      c = redis.createClient(port, host);\n  }\n  c.auth(password)\n  return c\n}\nclient.redisClient = client.mkClient()\nresume()");
  #fcI9cjjYIF4l6m98 data→logger→debug("created client");
  #kmNHDbbxo674lsYG // should this be optional?
  #RdJSKoO4x4bmX4Cd `async` code→status_report_loop($client);
}
#yN8VemEVzH0SAl9q
action set(#QAEPJvF7a3YLEzcM client: * Client, #Rr2NGcCyFmgRhNZK key: String, #X21hp0DXd0OP3k2a value: String) {
  #UhNJmDmU3Ce9TWm1 // Set key to hold the string value. If key already holds a value, it is overwritten, regardless of its type.
  #RFZ5BhMGLHkSF7TV $result := $client→send_command2("set", $key, $value);
}
#wWnZiNccEd0nguDK
action get(#xYLRADuq0B7wuGPs client: * Client, #xwhJZk7LuH5VFa7S key: String) returns(#faQKeJEaSf9yH8eG value: String) {
  #ySJWXc3TNiq4spgL // Get the value of ``key``. If the ``key`` does not exist the special value `invalid` is returned. An error is returned if the value stored at key is not a `string`, because ``get`` only handles string values.
  #rDixIIFgUHqjCi6W $result := $client→send_command1("get", $key);
  #hcCnD0oZ0IdC4418 if `not` $result→is_invalid then {
    #K6RCQKyKpzZVOsq4 $value := $result→to_string;
  }
  else {
    #MOdF32M8kt6cutBT $value := invalid→string;
  }
}
#IFxZb3Dc69HHJglq
action example() {
  #x3gXtir2Te3xVv1x // A wrapper for the [node.js redis module](https://github.com/mranney/node_redis).
  #xNxeawzFHxDIwhmn // ### configuration
  #YOOvI4D2qVY7spFp // Open and store a client with the connection information, host, port and password.
  #wMHh6ueV3hdeeT6B // If blank, the library will use the ``REDIS_HOST``, ``REDIS_PORT`` and ``REDIS_PASSWORD`` server settings instead.
  #xE62cRveqcAzSWOx $client := code→create_client("", 0, "");
  #tSwoGq45EavI4xBT // ### commands
  #hEiZxYBahslXOnzh // In its simplest form, you can use redis as a key-value store for strings.
  #WbfjsmTBHayzSGwh $client→set("key", "value");
  #xGficB4ccFizuGoD $value := $client→get("key");
  #xnPI2wHplFO7Wsqg // You can also manipulate sets
  #xew89PmaytWXe28x $added := $client→sadd("composers", "Mozart");
  #U2WpNeuTq6ayXcBw $added := $client→sadd("composers", "Bach");
  #N2Stn3PoIdRzSV4f $count := $client→scard("composers");
  #rK5Yq48p0qsxbVCl // ### other commands
  #mrcu94xb2SH19H1e // You can issue any [redis command](http://redis.io/commands) using ``send command``.
  #kC68O29wAqPhAZ3a $args := web→json_array→to_json_builder;
  #toB9ekCcfVbjUrXc $args→add("key" →to_json);
  #g8bIKIfMX8wTtUgQ $args→add("value" →to_json);
  #x3FNMSk1OdWlC2jh $result := $client→send_command("append", $args→to_json);
  #eR5LsfpWhvlXd9un // ### multi commands
  #Y9adLH3KfFUbZFsd $multi := $client→multi;
  #xHBmH2auBooeIQJz $madd := $multi→sadd("key", "Yay");
  #hfKVczm3d2Km23YP $multi_r := $multi→exec;
  meta private;
}
#hlbkpYsaBILtgMMj
action send_command(#iqrbm3zVDWVggIgc client: * Client, #x9yJuASsRbcA5423 command: String, #hnu6WWzoDYggXPUz args: Json_Object) returns(#eP3PNTLwHUiDOQgE result: Json_Object) {
  #xy0bJZmwywFCBu6d // Executes a redis command. See [redis commands](http://redis.io/commands) for an extensive list.
  #jqEiHqEM5LcGfJ2T $command := $command→trim(" \t")→to_lower_case;
  #pwupoLjJ4L8RJcgi $startTime := data→logger→logger_duration;
  #uGdU5oxmJqMTsX7f app→javascript_async("local", "//console.log(\"send: \" + command)\n//console.log(args.value())\nclient.redisClient[command](args.value(), lib.protect(s, function(err,res) {\n  if (err) TDev.RT.App.log(\'redis: error \' + err);\n  result = lib.JsonObject.wrap(res);\n  resume();\n}));");
  #iBwvgdudOB0HoHU5 code→time_op_core($client, $startTime, "command");
}
#xgpVRkgw2p82P9Q3
action sadd(#QYuPQPG6dfwbhfSc client: * Client, #ZRDvqV2qk1U5xzGb key: String, #HGOOJY7hRKt2Tdly value: String) returns(#MhnrHx8zSGarYlrf added: Number) {
  #x8lGHCBnWrgxHVXy // Set key to hold the string value. If key already holds a value, it is overwritten, regardless of its type.
  #AqFoV4nHJ5ia55TE $added := 0;
  #xOTR7UIBSib2csK7 $result := $client→send_command2("sadd", $key, $value);
  #xyMFjk2frjdo8fqd if `not` $result→is_invalid then {
    #xbMWf1z0nT6aN5Q5 $added := $result→to_number;
  }
}
#xX6g9z1Rkm69N2lc
action scard(#c5MkYfbbaEJFMCqk client: * Client, #yZiiNPM5DoKNHLwg key: String) returns(#yOamcz4v64lsgaMO count: Number) {
  #SZrBvsBsY3FM5u8p // Returns the set cardinality (number of elements) of the set stored at key.
  #xrQn43qPSsijSrFx $count := 0;
  #SlHesPcxnb5YaeVS $result := $client→send_command("scard", $key→to_json);
  #yWBiRD4fst46mzHu if `not` $result→is_invalid then {
    #kSkJFH4AUdi2zaBb $count := $result→to_number;
  }
}
#Z3NmtEBIIUcLUNVt
action smembers(#yI9HnNRH8iU20PTr client: * Client, #x51DHjrl4ACehTgm key: String) returns(#xb1z7rkIKaH38TIu members: Json_Object) {
  #BctqIVu0YyVRgjow // Returns the set cardinality (number of elements) of the set stored at key.
  #C9kmdB2cJ9tzcVG7 $members := $client→send_command1("smembers", $key);
}
#MK34k4c9ZgRBrlB7
action multi(#obVewn4QepGyqGXY client: * Client) returns(#ZC3KSPkLDD3E2kxz multi: * Client) {
  #aFZEz8dIKm0FxMf5 // Creates a multi command client.
  #rzpbBPKXi5eOCdUe $multi := records→Client→create;
  #NRuuKrAo1ZYeI4rU app→javascript("local", "multi.redisClient = client.redisClient.multi();");
}
#R0aGKFBoHeCElKg4
action exec(#KCXUpV3sJtWFMxWN client: * Client) returns(#cQUz6E0ED84r0ZUl js: Json_Object) {
  #x35PVjXf1R3YdfMQ // Executes the commands stored in a multi action.
  #amqSNjZRMYM4V4gJ $js := $client→send_command("exec", web→json_object);
}
#xB3MufRuuLOJmLCN
var logger : App_Logger {
  transient = true;
}
#lO2W2fTxDYEqXP2L
action eval(#voYVNVhYTmjgJzY6 client: * Client, #zY2zlaJ3eWYANnGu @script: String, #cAaBd7D321forDA4 keys: Collection[String], #I6l1CY0AkBBpUn27 args: Collection[String]) returns(#xNbSvxuLERzKApH2 value: Json_Object) {
  #uhsJdcKsYDfVRmXp // Executes given LUA `script` on `keys` passing `args`
  #gG3cTacJAERjTlTJ $jsb := web→json_array→to_json_builder;
  #x9UYeSEc1J6ScclU app→javascript("local", "value = lib.JsonObject.wrap([script, keys.a.length].concat(keys.a).concat(args.a))");
  #jWB5RHcRNjTZ2cUT $value := $client→send_command("eval", $value);
}
#ZhWRvIEMs9qztxgI
action mget(#GR2aO8ks7pmgT8Pk client: * Client, #vMRnyjBdtj47Dra3 keys: Collection[String]) returns(#rQ4b2R5DGdyCDu54 values: Json_Object) {
  #xfi10eq5cn9j2mgP // Get the values of all ``keys``.
  #xzJ6j0I4LBcV2Hlb $values := $client→send_command("mget", $keys→to_json);
}
#USGn20wHAlIh7MQa
action setpx(#MA9jeBCk2uCcWinZ client: * Client, #f6XU7zo992163PHg key: String, #misDiFEkKLT3qpCI value: String, #SQCXvA8aqkcMbln8 px: Number) {
  #w0rMjWQSQxUgc0Sa // Set key to hold the string value. The key will expire in `px` milliseconds.
  #xqmwo4ZJ2TD6bZEL $jsb := web→json_array→to_json_builder;
  #yHGmmxDWJaqzTOM4 $jsb→add($key→to_json);
  #YWfoOVSJT337wYua $jsb→add($value→to_json);
  #xEMHbq44K48pNRgh $jsb→add("PX" →to_json);
  #BxYJnIftCm8ERic6 $jsb→add($px→to_json);
  #be3mPbJJ5ZfqY42r $result := $client→send_command("set", $jsb→to_json);
}
#TvYor67a5Ihc1chy
action server_time(#xdyyBTLV7zDim9RF client: * Client) returns(#zJTxHjZgPT70JuQE millis: Number) {
  #GdO2xH4hCFiaXauA // Get the current server time - milliseconds since epoch.
  #xFFllvYszczyrBLm $result := $client→send_command("time", web→json_array);
  #BZKiXTZsLbqNuw2C $x := $result→at(0)→to_number * 1000 + $result→at(1)→to_number * 0.001;
  #HaC7I2WWAnnBXuI2 $millis := math→round($x);
}
#xlPGTQVF23kC8ayX
action cached_time(#NHffeWxKsSSZBBN4 client: * Client) returns(#f2kKnF9IvcRUWBT4 millis: Number) {
  #TmzosVf254rk870r // Get the current server time - milliseconds since epoch. Approximated and synced every 5s; also it never decreases.
  #vLg1dapGCLj6kIs0 $now := time→now→milliseconds_since_epoch;
  #GIuY6K19SAqGVTU7 if $now - $client→last_time_sync > 5000 then {
    #xb87webQs2PYiNkT $millis2 := code→server_time($client);
    #qc98xqGPusDA3cVR $client→time_delta := $millis2 - $now;
    #lqJP2Xk8H87SB7p7 $client→last_time_sync := $now;
  }
  #QEbcFjedsTcdrJAy $millis := $now + $client→time_delta;
  #e1le2Q27g7O0ZXnd if $millis ≤ $client→last_cached_time_reading then {
    #yYsPsGTdxyl5NW73 // Someone moved the clock backward.
    #sDTf9HUgoTdqLkbM $millis := $client→last_cached_time_reading;
  }
  else {
    #Tay8DH2LDyEr5a9O $client→last_cached_time_reading := $millis;
  }
}
#f2yxtoo23cpgSZEE
action incr(#KXSeTjCxNDnpHNi8 client: * Client, #x7fyh5qklipppypg key: String) returns(#M42GiY2ty94GgHbz newvalue: Number) {
  #EHA80Y3F3z0on4pO // Increment `key` by one and returns new value.
  #dQblkvXMSjPOHLDx $newvalue := $client→send_command1("incr", $key)→to_number;
}
#xzEr4P2uMBR5ekAT
action setnx(#FYRHIjm2ICIpwQCj client: * Client, #xBWVsyUk30mpDwjl key: String, #EhR9GJfdnA91A5xT value: String) returns(#yCOE76nPUeBzK3rP ok: Boolean) {
  #xRvjVrZDKIQE0pIk // Set key to hold the string value if the key doesn't exists.
  #xdxFYiscFY13jqh4 $result := $client→send_command3("set", $key, $value, "NX")→to_string;
  #X7ZTieWxQJN7Qz4Z $ok := `not` $result→is_invalid `and` $result→equals("OK");
}
#a44utuCM5WuurPGB
action publish(#n4n0HTXFYYVvhGmt client: * Client, #b6aRohZIayFrpR44 channel: String, #ahVcS7SFCv6TWcGU value: String) {
  #x29sV4jQ3RjYMk6t // Send message on given channel
  #EmthQX4hBnUAgRn4 $result := $client→send_command2("publish", $channel, $value);
}
#b4qPxreSwLvaiLxf
action send_command2(#bxqVbRzGwPv2i4sG client: * Client, #xGjM1VSJPGz5qFdh command: String, #f2ycqChN09VWndZl arg0: String, #xHKvSMoyQcDDL4ak arg1: String) returns(#RkfXa2yh1znaFfK0 result: Json_Object) {
  #I5E4BAGhEM4fnVW9 $startTime := data→logger→logger_duration;
  #H2ZdipvMaseIlHnH app→javascript_async("local", "if (arg0 == null || arg1 == null) lib.userError(\"arguments are undefined\");\nclient.redisClient[command]([arg0, arg1], lib.protect(s, function(err,res) {\n  if (err) TDev.RT.App.log(\'redis: error \' + err);\n  result = lib.JsonObject.wrap(res);\n  resume();\n}));");
  #GyjJj4aA4qMMa654 code→time_op_core($client, $startTime, "command");
  meta private;
}
#x9prO8zo0TqdXn7t
action send_command1(#x9XSZIuIJDbKOPcZ client: * Client, #pKPvx2v13w2QIg4M command: String, #xePQgyceC27oJgii arg0: String) returns(#lFl06i2kohyrVU4p result: Json_Object) {
  #M6EryqVqMZmHWed4 $startTime := data→logger→logger_duration;
  #x0qpwY7I4BcfY8w2 app→javascript_async("local", "if (arg0 == null) lib.userError(\"arguments are undefined\");\nclient.redisClient[command]([arg0], lib.protect(s, function(err,res) {\n  if (err) TDev.RT.App.log(\'redis: error \' + err);\n  result = lib.JsonObject.wrap(res);\n  resume();\n}));");
  #NUBCF7ZtqWfEJ1aI code→time_op_core($client, $startTime, "command");
  meta private;
}
#Wztqn3hkyIP6Q4G8
action send_command3(#Xii58zz45tyAFpCd client: * Client, #KfoQyVeCZm2dmF2X command: String, #CQd3zX11WKIKS64T arg0: String, #x05LLqLknMyiPrBF arg1: String, #xVStactMVgUAtb20 arg2: String) returns(#xaQJR6IpMuTfTqX1 result: Json_Object) {
  #v5A317Kl4EhIZBsp $startTime := data→logger→logger_duration;
  #xw4H55pMUkD2Ie1j app→javascript_async("local", "if (arg0 == null || arg1 == null || arg2 == null) lib.userError(\"arguments are undefined\");\nclient.redisClient[command]([arg0, arg1, arg2], lib.protect(s, function(err,res) {\n  if (err) TDev.RT.App.log(\'redis: error \' + err);\n  result = lib.JsonObject.wrap(res);\n  resume();\n}));");
  #mV5Q1EiPGwJkj8QV code→time_op_core($client, $startTime, "command");
  meta private;
}
#xSAZn6dp2b3tF4T0
action wait_on(#xn1Fk78pNnLnP7to client: * Client, #z54XeJRH2Rjs69OY channel: String, #YwHhvX2CS3pPcP4w timeout: Number) returns(#xNZcV2crQlAg9JDq message: String) {
  #xj4WSxx6LWZYcjGq // Waits for a message on a given channel for a given number of seconds (0 - infinite)
  #wGBpJ56MXY5Ezjtu app→javascript_async("local", "var done = false;\nvar listener = lib.protect(s, function(msg) {\n   if (done) return;\n   done = true;\n   message = msg;\n   var lst = client.subs[channel];\n   var idx = lst.indexOf(listener);\n   if (idx >= 0) lst.splice(idx, 1)\n   if (lst.length == 0) {\n     delete client.subs[channel];\n     client.subClient.unsubscribe(channel);\n   }\n   resume()\n})\n\nif (!client.subClient) {\n  client.subs = {};\n  client.subClient = client.mkClient();\n  client.subClient.on(\"message\", lib.protect(s, function(ch, msg) {\n    if (Array.isArray(client.subs[ch]))\n      client.subs[ch].slice(0).forEach(function (l) { l(msg) });\n  }))\n}\n\nif (!client.subs.hasOwnProperty(channel)) {\n  client.subClient.subscribe(channel);\n  client.subs[channel] = [];\n}\n\nclient.subs[channel].push(listener);\nif (timeout) {\n  setTimeout(lib.protect(s, function() {\n     listener(undefined);\n  }), timeout * 1000);\n}");
}
#tdsAoQPmP3gEI0a7
action time_op_core(#jjwyO5Wd2n02FEYm client: * Client, #x5tRtvZD1HunMsHY start: Number, #N24NqEZK2cydvMse id: String) {
  #e44WSMcXkmV4OJgq $delta := data→logger→logger_duration - $start;
  #G9SX6TkNUGB7NBoA data→logger→measure($id ∥ "@" ∥ $client→hostid, $delta);
  meta private;
  meta sync;
}
#xUhsVhb1X74QARJf
action info(#H5E6boadRAThgTDC client: * Client) returns(#N8baabxGN4Est2FY info: Json_Object) {
  #BkyrncsjmAeE7EGe $redis := web→create_json_builder;
  #OIYeyt0xy9m1k2BE $redis_text := $client→send_command("info", web→json_array)→to_string;
  #U82JP2Pu2nRN4M9G $dummy := $redis_text→replace_regex_with_converter("(\\w+):(.*)", $lambda);
  #bsJ6NgMtQ6Vrz2Gr where lambda(elt: Collection[String]) returns (result: String) {
    #RBNTjHiuUedwGqIB $x := $elt→at(2)→to_number;
    #jvV2KVT0VTEnn48j if $x→is_invalid then {
      #BH32cW2JtxNiHZSx $redis→set_string($elt→at(1), $elt→at(2));
    }
    else {
      #DA3QZvsva99UxbiA $redis→set_number($elt→at(1), $x);
    }
    #MXDvHWHEf81l4akv $result := "";
  }
  #JbJMS7qmMfCHRSHa $info := $redis→to_json;
}
#egBK2TNxXG6NgtBf
action status_report_loop(#UC694jxwcqSDpoib client: * Client) {
  #xHBxPH8nLdVo9cRj while true do {
    #I3rOGQ4aw29xmrZD time→sleep(30 + math→random_range(0, 10));
    #DbLB2WSP4iYV6SAR $info := $client→info;
    #xbBeRdI2y1PEh5kB $client→last_status_report := time→now;
    #dTiriD19rF42NM8G $load := $info→number("used_cpu_avg_ms_per_sec") / 10;
    #J6TKza3Eao9U1k3b data→logger→measure("load-perc@" ∥ $client→hostid, $load);
    #x1eTGi82T7Smn8Rh data→logger→measure("memory-gb@" ∥ $client→hostid, $info→number("used_memory") / (1024 * 1024 * 1024));
  }
  meta private;
}
#Sphdv96caUok41Db
action del(#gYl5ZyHXStjC7hJe client: * Client, #zNGPJ4ZSZPBDKdRB key: String) returns(#Ux2A4OcTxAa7hd9F removed: Boolean) {
  #xUAW9HvNFiAABcAW // Removes ``key`` from database. Returns ``true`` if it was there.
  #x7g1u4iQGxifepYU // {action:ignoreReturn}
  #HfW27SxjzB79YH7q $result := $client→send_command1("del", $key)→to_number;
  #WNSlzYqE8M81fM0K if $result = 1 then {
    #yT3nzjegGkI6xgGJ `return` true;
  }
  else {
    #jA1urp44w4HU54C6 `return` false;
  }
}
#WkTxtD9ruJbf7qGf
action is_status_late(#GHZV7sruxnqxE7SZ client: * Client) returns(#tI3EJIjDvwsgYbNz late: Boolean) {
  #YNYMAsMY5huVe4od // Check if the status report is late (most likely the connection to redis is down)
  #PsvkNRbF022SbI5s `return` time→now→subtract($client→last_status_report) > 60;
}


