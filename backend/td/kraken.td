meta version "v2.2,js,ctx,refs,localcloud,unicodemodel,allasync,upperplex";
meta name "kraken";
meta icon "Shrink";
meta color "#ff007fff";
meta rootId "XhRyn2NDi5ehUjVxTv9hDkFE";
meta isLibrary "yes";
meta allowExport "yes";
meta hasIds "yes";
meta platform "current";
meta parentIds "";
// Library to use the Kraken.io Image Optimizer service.
#xzcoFpQch4Pjw8LI
action init(#i5k27RmzMNHUXR8k api_key: String, #JPSjLoWhyIyaC2GH api_secret: String, #qNQEEzVhKwzAI1fd azure_account: String, #s6wQME34g5p5ciOV azure_key: String, #rNvVnfhVUEI3jpzB azure_container: String) {
  #aZ12e6W4luX3HboK // Initializes the library. If empty, the ``api key`` and ``api secret`` values are read from the server settings ``KRAKEN_API_KEY`` and ``KRAKEN_API_SECRET``. The library is also setup to store the files in an Azure Blob storage container for which you can provide the information through ``AZURE_STORAGE_ACCOUNT`` and ``AZURE_STORAGE_ACCESS_KEY``.
  #xdxfVb6Ygkv89kia contract→requires( `not` $azure_container→is_empty, "");
  #INX4nC6v5YesADAS contract→assert(data→logger→is_invalid, "double initialization");
  #vQrypap3oY4rGl4i data→logger := app→create_logger("kraken");
  #Dzv1v4U98MDzggbx if $api_key→is_empty then {
    #XJYfQk8BaVt2Has5 $api_key := app→server_setting("KRAKEN_API_KEY", false);
  }
  #xlAcWGp2btCAMoyg if $api_secret→is_empty then {
    #d467TAFvx11bncA3 $api_secret := app→server_setting("KRAKEN_API_SECRET", false);
  }
  #ScrN6wf3WYxesc4O if $azure_account→is_empty then {
    #z7huywwZn03nwIPJ $azure_account := app→server_setting("AZURE_STORAGE_ACCOUNT", false);
  }
  #GGelJ5UUuNeoo6Sh if $azure_key→is_empty then {
    #dW5tsZeuA4JCEFKs $azure_key := app→server_setting("AZURE_STORAGE_ACCESS_KEY", false);
  }
  #OxlcxZvwY9wTWh4J data→api_key := $api_key;
  #lkktbHB2uwORfRlL data→api_secret := $api_secret;
  #xBGMgZtWRuSFpSW3 data→azure_account := $azure_account;
  #lRydyu4Yyk0v1d4e data→azure_key := $azure_key;
  #GEJlxl0EGCT8fe4t data→azure_container := $azure_container;
  meta sync;
}
#F88OXKqsnZQ4urwq
var logger : App_Logger {
  transient = true;
}
#dE4bAHpgjxySX2Id
action optimize_picture_url_to_blob(#Q087AmEDPSEbfbd2 picture_url: String, #lvc47Cw04eLV2lVZ path: String, #Gs61bdOqLS45rF8w options\u003f: * optimize_options) returns(#LkoPc6RGnnlgPUvO id_or_url: String) {
  #dQC8wShRbi1yY1mN // Schedules a file to be optimized by the Kraken optimization service.
  #xaKlPsGDVI49xKPB contract→requires( `not` $path→is_empty, "missing path");
  #X7tPQC9hEIeWe742 $payload := code→prepare_request($picture_url, $options\u003f);
  #A70ZA1DK1sMykg4t $store := web→create_json_builder;
  #mGBwdUidA5aQcjbc $payload→set_builder("azure_store", $store);
  #xJt9nVE41jPinEwP $store→set_string("account", data→azure_account);
  #vMgV5VgoDW4fjeaL $store→set_string("key", data→azure_key);
  #aI9x0NaHXl52Nry7 $store→set_string("container", data→azure_container);
  #xl2zLrBarR9A2y2Z $store→set_string("path", $path);
  #eILlCMFzib6eNy2V $url := "https://api.kraken.io/v1/url";
  #d8BdAN5tdwNAGEnu $resp := code→send_request($url, $payload, $options\u003f→retries);
  #fDU66i6xeoKholHt $id_or_url := code→process_response($options\u003f, $resp);
}
#xLbJiMOwfdeACIJ3
var api_secret : String {
  transient = true;
}
#GLSOScFlB8JZCXme
var api_key : String {
  transient = true;
}
#LJPCCygNQpJq5jab
var azure_account : String {
  transient = true;
}
#ezTOSJgGHW4BIQod
var azure_key : String {
  transient = true;
}
#xkSNxk8VKpgIIp9A
var azure_container : String {
  transient = true;
}
#dD2yWkVDfL9E7pB7
action example() {
  #pAqUhC3aVhbx3Fbd // A library that uses the [Kraken](http://kraken.io) image optimization service into Azure blobs.
  #FxLh0lIORH1B3Ado // ### setup
  #Dvqj4W29u2hFAyXA // Initializes the library. If empty, the ``api key`` and ``api secret`` values are read from the server settings ``KRAKEN_API_KEY`` and ``KRAKEN_API_SECRET``. The library is also setup to store the files in an Azure Blob storage container for which you can provide the information through ``AZURE_STORAGE_ACCOUNT`` and ``AZURE_STORAGE_ACCESS_KEY``.
  #xSnRspjNquVYDDFh code→init("", "", "", "", "");
  #YBS4YpbwV3V47JMQ // ### optimize an image url
  #xvtkB4f7Js0HFZ9X // If you already have your raw image accessible through a url, call optimize to blob to send it to Kraken. Turn on each optimization open as needed.
  #Ey3qctHSt0X6OUaT // Below, we turn on lossy 40% quality, webp conversion.
  #ubhIlZK0krhHHgFl $id := code→optimize_picture_url_to_blob("http://url to your image.jpg", "/optimized/abc");
  #xzNZLSUa9kLWFdZO where quality := 40;
  #CGFMllLm0dN2WfgP where webp := true;
  #xrad0R0Il7RF7U5j where lossy := true;
  #x0XpXtIACP8cSOI5 // If successful, the API returns an id if a callback is provided or a url. When Kraken is done processing, it will invoke the callback with that id.
  #vTaq8dUGv2GSOlW5 // Learn more about the resizing options in the [Kraken official docs](https://kraken.io/docs/image-resizing).
  meta private;
}
#xOsR2aXnXM8PmqSj
action send_request(#wLjGUmzajJGKKiim url: String, #VqlXWXAcdNSeK4Xy payload: Json_Builder, #xBoHN9AvWiqJithc retry: Number) returns(#hnupvt1a1vG6gC4m resp: Json_Object) {
  #gFi4TSItIGPOhpH1 $resp := invalid→json_object;
  #l4QtcSgY15iNR7dZ $request := web→create_request($url);
  #gtcSSmyTiGarke5p $request→set_method("POST");
  #lIPVmPx8RXs7XCsY $request→set_content_as_json($payload→to_json);
  #Lrh716Q0QoNWTyLB $response := $request→send;
  #R98EBpneby24C2Ub $res := $response→content_as_json;
  #xkukhwhCBtaUzmJo data→logger→debug("optimize status: " ∥ $response→status_code);
  #M2G7pktW2arSz2Dq if `not` $res→is_invalid then {
    #rpXFS5pRrSAppLWo data→logger→debug("optimized res: " ∥ $res→format(2));
  }
  #wnOunlGlT44tnom8 if $response→status_code = 415 `and` $retry > 0 then {
    #LRhONss3rTBDFGkI data→logger→debug("retrying... " ∥ $retry);
    #M0M9tbwWl2ThFWHn $resp := code→send_request($url, $payload, $retry - 1);
  }
  else { #xUThnKVQ1JvA5bvB if $response→status_code = 200 then {
    #LzZwm4bfP0z2ou24 $resp := $res;
    #K1yV0BuA1muOBpmS data→logger→debug("optimized id: " ∥ $resp);
  }
  else {
    #i3BVgk5UH8wakjwH data→logger→error("failed to krak picture - " ∥ $response→status_code);
  }
  } 
  meta private;
}
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
#TqbnOhDW3dgUzcvj
action prepare_request(#r4A0enGcFdfr2MQB picture_url: String, #KAa4PmGzGgKxtcxO options\u003f: * optimize_options) returns(#xWeCTgWMbyKO4sjF payload: Json_Builder) {
  #y4UW2Yc6RxZcbs8A contract→requires( `not` data→logger→is_invalid, "did you forget to call init?");
  #SbQ93WmpTsqdrNJD contract→requires( `not` $picture_url→is_empty, "missing picture url");
  #NSTn48x5NyT9Sh36 $payload := web→json("{\n  \"auth\": {}\n}")→to_json_builder;
  #Xi7GGK3gE9C68W9h $payload→set_string("url", $picture_url);
  #xW42DT1GSdw1Iu41 if $options\u003f→retries ≤ 0 then {
    #xMpbv2z2t32DOlEK $options\u003f→retries := 2;
  }
  #ROVQf8e4ClNxsg2Q if $options\u003f→callback_url→is_empty then {
    #wZBUz4ubg2oOrbD4 $payload→set_boolean("wait", true);
  }
  else {
    #RdHQL2br427M25kP $payload→set_boolean("wait", false);
    #Z7RWv7N6WHNSwcuH $payload→set_string("callback_url", $options\u003f→callback_url);
  }
  #GhNU1nVjy9yK2wyd if $options\u003f→lossy then {
    #lk7cghMFTxriggYw $payload→set_boolean("lossy", $options\u003f→lossy);
    #htDfhEiFHdSEUSJu if $options\u003f→quality > 0 then {
      #E54C8sSqWxNBqbsg $payload→set_number("quality", $options\u003f→quality);
    }
  }
  #e04T8no9aLty6dpk if $options\u003f→webp then {
    #cKiqOTOj14kvUfzf $payload→set_boolean("webp", true);
  }
  #M5gH46naJ54yvzxQ $resize_strategy := $options\u003f→resize_strategy;
  #GrUUxY9NJZ8G3txz if `not` $resize_strategy→is_empty `and` `not` $resize_strategy→equals("none") then {
    #R2HwSlyUWWRKvifP $resize := web→create_json_builder;
    #xzubyuJQajjBQHm6 $resize→set_string("strategy", $resize_strategy);
    #nDKNDJ075qcPV4NR if $options\u003f→width > 0 then {
      #fR3ZAjAYnzL2aWSN $resize→set_number("width", $options\u003f→width);
    }
    #KtmK1b5AvLkNXlpO if $options\u003f→height > 0 then {
      #sl4Alt4znCRicRyP $resize→set_number("height", $options\u003f→height);
    }
    #kGhOoEWCMGEmKamg $payload→set_builder("resize", $resize);
  }
  #D17xoAwuwjN9PYkn data→logger→debug("optimize: " ∥ $payload→to_json→format(2));
  #hElel2di239eJmzr $auth := $payload→field("auth");
  #j9dfT597wOkIH5xH $auth→set_string("api_key", data→api_key);
  #MjvsSZTv1oRnVUIx $auth→set_string("api_secret", data→api_secret);
  meta private;
  meta sync;
}
#xtxpELzDgFkq8NZp
action optimize_picture_url(#xNtJ62wLwpJgNwqT picture_url: String, #xoClYdFjH3t44Hq4 options\u003f: * optimize_options) returns(#MRuwpR3j8Dlc5lxh id_or_url: String) {
  #zVk13iIbtI78y78J // Schedules a file to be optimized by the Kraken optimization service.
  #imHCPv4W6Kh1Aj0Z $payload := code→prepare_request($picture_url, $options\u003f);
  #bdy32mq2YCak7ZnA $url := "https://api.kraken.io/v1/url";
  #xeaz2mCHwR9pGaGs $resp := code→send_request($url, $payload, $options\u003f→retries);
  #xk2MvjQqveqlYS96 $id_or_url := code→process_response($options\u003f, $resp);
}
#oNMfK5yv2QgIXbw4
action process_response(#MAPFLboVOerqbX48 options\u003f: * optimize_options, #PvQFMySGb53exbPK resp: Json_Object) returns(#o98pxWzQPNK9RUAt id_or_url: String) {
  #i37SQLQ4swaihVGW if $options\u003f→callback_url→is_empty then {
    #y0UoHvtvagNJ7Wg8 if $options\u003f→callback_url→is_empty then {
      #oMu49I8kz2ZzgJXI $id_or_url := $resp→string("kraked_url");
    }
    else {
      #Sg00Ko2XcHaixMXY $id_or_url := $resp→string("id");
    }
  }
  else {
    #xOhLSXobIALiMOMZ $id_or_url := invalid→string;
  }
  meta private;
  meta sync;
}


