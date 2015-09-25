meta version "v2.2,js,ctx,refs,localcloud,unicodemodel,allasync,upperplex";
meta name "touchdevelop cloud";
meta color "#ff008000";
meta rootId "rsE9T5HGjD2kp8zet1wkiC2v";
meta iconArtId "qlndrnnm";
meta isLibrary "yes";
meta allowExport "yes";
meta hasIds "yes";
meta platform "current";
meta parentIds "";
// A library to use the TouchDevelop Cloud Services. #rest
#hUQaBXHY3qu9jooP
action get(#daP8WqPmWbzlE2Bw path: String, #VgC6D1689YOwE4rP options\u003f: * Api_Options) returns(#OkDAaniFOFUsKTNi res: Web_Response) {
  #JBeCusdEzXlIhpIv // Perms a GET operation on the given path.
  #dCZwbFYjH1QBjtQa contract→requires( `not` $path→is_empty, "missing path");
  #yvWWz7j3dfOXrDJ4 code→init;
  #C3I8UcpQ29rYVCZp $url := code→create_url($path, $options\u003f);
  #x84Zh6XKvEyyQfGo $request := web→create_request($url);
  #RszdJu2WWnwWfmCc $res := $request→send;
  #J0OTNA6PXSybTyo8 data→logger→debug($url ∥ " -> " ∥ $res→status_code);
}
#e2bt7X3mdXZPERU7
action post(#FvhJiW2v06zvVXvn path: String, #b04740aetTlg5EFD body: Json_Object, #RjISzxIdzck9UQtG options\u003f: * Api_Options) returns(#xw9BygkaO1qo1RNg res: Web_Response) {
  #FLH4UKbYkZs376WA // POST request to the cloud
  #bvGUk2e1vv6zkOFC contract→requires( `not` $path→is_empty, "missing path");
  #lwfEymCe6SCaZVCL code→init;
  #fBD8q3dG909gtCOm $url := code→create_url($path, $options\u003f);
  #OtrBj4XANup9Tr3G $request := web→create_request($url);
  #xd4ybH7j5rkyXkzq $request→set_method("post");
  #xjfz12uTE9U4Fq9o $request→set_content_as_json($body);
  #SVYwTKKZUmF212Rz $res := $request→send;
  #xms0DMXyepJFZjsg data→logger→debug($url ∥ " -> " ∥ $res→status_code);
}
#Oyb1FOt6eynANaYr
action create_batch(#fo3v3SXePlpgAgro options\u003f: * Api_Options) returns(#ENzQEaD5bYhnzE6e batch: * Batch) {
  #rpinjw472R40IBXh // Queries the cloud api with a batch of requests
  #iGIhoeb24s4yR1Kb code→init;
  #z2Ugny6h6A1OCxdK $batch := records→Batch→create;
  #OkeMhYA3MU2csHyX $batch→options := $options\u003f;
  #jctpa4Rk4d659bYm $batch→requests := records→Batch_Request→create_collection;
  meta sync;
}
#xA2NH2E4LBwIfmI1
var logger : App_Logger {
  transient = true;
}
#vImQg80dgvzyT5to
action init() {
  #zta25ZIrjkEwTAM7 if data→logger→is_invalid then {
    #bpUpRVpOWIIEQtuc data→logger := app→create_logger("td");
    #EkHNETGWApwpY80w data→service_options := records→Options→create;
    #BUjEriCi7JOhcNN2 data→service_options→service_root := "https://www.touchdevelop.com/";
  }
  meta private;
  meta sync;
}
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
#Wemps2CEApQvJ6TR
action add_request(#OYj38iuQ1qoDQBek batch: * Batch, #f4Ly1gCVeqPCjFaR path: String, #OYhp18h67set4ShS etag: String, #pC28UQrO0oyTACVB options\u003f: * Api_Options) {
  #D2gCgsVs4MTjpOM1 // Adds a request to the batch
  #eJRMDziajAkaFJIk $req := records→Batch_Request→create;
  #cFJ3lqukgMfFWkew $req→relative\_url := code→create_path($path, $options\u003f);
  #vpWp2dATqalUCha5 $req→If\u002dNone\u002dMatch := $etag;
  #G9ZRyPCp1oxr4Ayy $batch→requests→add($req);
  meta sync;
}
#xUDIBVV0J4b7BefV
action create_url(#ZKnsYAqZn3xsw32D path: String, #xlKfvWah9XxBi8Ui options: * Api_Options) returns(#kXHgv5vcQg0jeFbQ url: String) {
  #wOSompWntJ28E203 // Creates an API call url with the given options
  #x94BQ1D0P4IuDzcd $url := data→service_options→service_root ∥ "api/";
  #rNu2Qq0AgLigy3Om $url := $url ∥ code→create_path($path, $options);
  meta sync;
}
#RDlggD6Ob32M5FQm
action example() {
  #ktsKF5yd3wxztIDe // This library allows to query the [TouchDevelop Cloud APIs](https://www.touchdevelop.com/help/cloudservices).
  #GExMI2sUuOo0KIe2 // * GET requests
  #dSYxqSHaHMnrRevR $res := code→get("me");
  #SqF2khYKh7jcaOPi // * POST requests
  #e5ewCP6nJQeSHNOE $res := code→post("me/settings", web→json("..."));
  #okQSAwFbOHnZsEGS // * batch requests
  #eJklG5JyTh5lOoNd $batch := code→create_batch;
  #O9Sn5ccb5ShaFgQ2 // * iterating lists
  #q3ZKMPNSmJzjXtla $list := code→list("me/scripts");
  #ah3DQiUrAecxAJzp $items := $list→next;
  #LPBzp2zTnOGRqPC2 while $items→count > 0 do {
    #ZsutLtyDPIFGqnoX // do something with items
    #EE7148Tbujh9b6yO $items := $list→next;
  }
  meta private;
}
#Qmt2tS0TcvIxaimQ
action test() {
  #N4z18iWyc0pGW6D5 $res := code→get("pboj");
  #esa8JxYbMRqihKeu $res→post_to_wall;
  #zwRQzTsaPJ5arhSs $batch := code→create_batch;
  #xmjgRWYDktntqrj4 $coll2 := "pboj,ajlk" →split(",");
  #uL1gh40Ebu32SU3M foreach s in $coll2
  do {
    #zlFX8LLTU3CZX7pf $batch→add_request($s, "");
  }
  #xRwc6Xe29U20KtpL $responses := $batch→send;
  #Ttc14ROYFtxu3s1z $responses→post_to_wall;
  #A2IJRRwqaqniGBnr $list := code→list("kxgsoldh/users");
  #P2Yz2y4oUrohwJCQ $items := $list→all;
  #aDWVZQ77d7AOSGlM $items→post_to_wall;
  #KsG3U0hhnPWarg6p code→list("ajlk/scripts")→all→post_to_wall;
  meta test;
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
#vnyxRcpSK62Mbz8b
action create_path(#RbhNBXuw9MEln1LL path: String, #hqHE9D5ZJ5eOwYTu options: * Api_Options) returns(#xfE4SeIY1u2veISZ url: String) {
  #ZIDIIKZ7sTSrxvJr // Creates an API query url with the given options.
  #Q99hxnQP0Hc9rr0S $url := "";
  #FK1CL8175kwS2GXk if `not` $path→is_empty then {
    #KnVQlUtGwRbZXciY $url := $path→trim_start("/");
  }
  #I68LqZ7vAkVDjuqv $d := collections→create_string_collection;
  #LxS251fC7tHdSRPU if $options→access_token→is_empty then {
    #xu2iVyAxb8Xno4Wn $options→access_token := data→service_options→access_token;
  }
  #xynFBZjCowo1OA3y if `not` $options→access_token→is_empty then {
    #xXIHV4yPYmUOtMM5 $d→add("access_token=" ∥ web→encode_uri_component($options→access_token));
  }
  #xE42JZ7KrjukxGjl if $options→count > 0 then {
    #IPlBedHQ9OHP2upR $d→add("count=" ∥ $options→count);
  }
  #wCzKHkXHiFHLh4dT if $options→apply_updates then {
    #VPmxh3HzO7yMNWsl $d→add("applyupdates=true");
  }
  #Qsjv9rulNrzF5A4a if `not` $options→continuation→is_invalid `and` `not` $options→continuation→is_empty then {
    #AhLXEJskZKTTHyPh $d→add("continuation=" ∥ web→encode_uri_component($options→continuation));
  }
  #M2r1OHBXxHbsdySP if $d→count > 0 then {
    #xFc522Lyei5i6oez $url := $url ∥ "?" ∥ $d→join("&");
  }
  meta sync;
}
#xlU2Uvc504RGyzSS
table Batch {
  type = "Object";
  persistent = false;
  fields {
    #JxD5Jhev7VJTEAkD options : * Api_Options
    #tqX53DJ2XPC4ARaf requests : Collection[ * Batch_Request]
  }
}
#CGkCf0p2xCFxxN5i
action send(#EV6wodRq4cBLwr8y batch: * Batch) returns(#yZTF1nc6zkdmviQe responses: Collection[ * Batch_Response]) {
  #KWBMmJFT46fw8MT0 // Sends the requests in batch and process the responses.
  #wzB5xMznZ5yzT39C $responses := records→Batch_Response→create_collection;
  #x24rb4ubMDPm2i2T if $batch→requests→count > 0 then {
    #aLxmRYTO3x3JQsI7 $url := code→create_url("", $batch→options);
    #bFDBGashKD0CZucg $request := web→create_request($url);
    #WHzoWw49qVvwZycx $request→set_method("post");
    #w3LXPsMyjI1Ckkay $jsb := web→create_json_builder;
    #KP27r3GwMQ13JYbi $jsb2 := web→create_json_builder;
    #P41ExXGCEqRgzH24 foreach s in $batch→requests
    do {
      #zS6rH7944QobBkQv $jsb2→add($s→to_json);
    }
    #UoQ2BnV2AU4elhsK $jsb→set_builder("array", $jsb2);
    #ucUSri3T6oK5Wot4 $request→set_content_as_json($jsb→to_json);
    #PfltnJRYVZ8snldf $res := $request→send;
    #Jc3MpOWlepuvlqza data→logger→debug($url ∥ " -> " ∥ $res→status_code);
    #xFO5mUvMTzKKvToq if $res→status_code = 200 then {
      #toTeKe68p6QgbZIC foreach js3 in $res→content_as_json→field("array")
      do {
        #zmQ9DUXzysseAZ2F $item := records→Batch_Response→create_from_json($js3);
        #xN3Hr1i42JT77lKq $responses→add($item);
      }
    }
  }
}
#w2scDEBvYVPoNtd3
action list(#p3Bc5uo8SyVHvNYZ path: String, #ks2pAoBi4ePz1kX1 options\u003f: * Api_Options) returns(#TLU7u8hBrNJ8zL33 list: * Item_List) {
  #E8dfU9wM4ULD46AF $list := records→Item_List→create;
  #ktfeAIKJJoP4zhq1 $list→path := $path;
  #OEBUS5flJjEj4PIV $list→options := $options\u003f;
  #ws0UiKYBL5cVeydv $list→ids := collections→create_string_map;
  meta sync;
}
#fjq2VHqB63BToqH5
table Item_List {
  type = "Object";
  exported = true;
  persistent = false;
  fields {
    #Fa3FOfqAO6DxIHEK path : String
    #y12564JoMZvAmeTX options : * Api_Options
    #eUVTBb2ApHWyRj0h current : Web_Response
    #E4pHfgariDwCGPHt ids : String_Map
    #axOslE3aUs4Ii12m items : Json_Object
  }
}
#vKtC8S7sZ4m3rX6q
action next(#xLTKMZUV5NZIzNjJ list: * Item_List) returns(#RVReiIco2YwfhoMm items: Json_Object) {
  #ceBWEk3P5ah09mi7 // Gets the next batch of items from the list. Empty of no items.
  #xRO6BuNhNleBhUO9 $list→items := web→json_array;
  #mM4PemPvH4PfW1RZ if `not` $list→options→continuation→is_invalid then {
    #n4q3n8G41v83D2vk $list→current := code→get($list→path, $list→options);
    #wAPO7TRMUPHSphQ3 $js := $list→current→content_as_json;
    #RHqYy1fHpId0B0gy if `not` $js→is_invalid then {
      #xnRwmeitft2b8Pnw $list→options→continuation := $js→string("continuation");
      #oJ5TPFxxAWaLd4l6 $jsitems := $js→field("items");
      #kfGhn7F45lpHZLd2 if `not` $jsitems→is_invalid then {
        #NlspzOb3MPQBd2O8 $uitems := web→json_array→to_json_builder;
        #l9cwUCskQaZ0ElpW foreach item in $jsitems
        do {
          #JlKYlNj9X6fSJGyu $id := $item→string("id");
          #i2a4YO1rfaCLIl87 if $id→is_invalid then {
            #K5EPOvpXpbyfcYQU $uitems→add($item);
          }
          else { #DwP2DHEAH2Fg7lFh if $list→ids→at($id)→is_invalid then {
            #ws5G242qBzanY5s4 $list→ids→set_at($id, $id);
            #pMmoHH8vJz24cL2K $uitems→add($item);
          }
          else { } } 
        }
        #nTHfhmqRwCeIgiUM $list→items := $uitems→to_json;
      }
    }
  }
  #HocOxPQ1AyCnJ7VV if $list→items→is_invalid then {
    #R2yS4ZOYeO3jvoI4 $list→items := web→json_array;
  }
  #aoXO8gnEttI0p2BD $items := $list→items;
}
#ulTLugOT56CECrF2
action all(#BEfOMq129FrcDVK4 list: * Item_List) returns(#Fldh0K5JpeTQ9dem items: Json_Object) {
  #gWZX035UqKeR3CKY // Loads all the remining list items
  #Zz9Oo2iaESBdNxAr $jsb := web→create_json_builder;
  #Rxf0FFoeQhNMt5x2 $chunk := $list→next;
  #jpyw6iJz0wvbwWZY while $chunk→count > 0 do {
    #xihjhOO2nK0UVGt1 foreach js in $chunk
    do {
      #EewptOlUL20XWlvb $jsb→add($js);
    }
    #QUbbXRCo50gTJNhp $chunk := $list→next;
  }
  #kOz3o2Jn9Lo50oIq $items := $jsb→to_json;
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
#Jm51o1okdTOQAV9p
var service_options : * Options {
  transient = true;
}
#EBIeJnN6KRgPxqjk
action set_options(#ICZSP3cSe66mbgwu options\u003f: * Options) {
  #W0Bxzds6ln19mQkw // Specify custom options for the service
  #viYdFWAOLsvbnysf code→init;
  #ReWALrJdSE20JUB6 data→service_options := $options\u003f;
  #TrsBooXTZJUoSfqt if `not` data→service_options→service_root→is_empty then {
    #ZBP7vobhvwMtPmRH data→service_options→service_root := data→service_options→service_root→trim_end("/") ∥ "/";
  }
  meta sync;
}
#wDdWXscq6hoA73e5
action get_json(#LC4eC2nV84CRT1qA path: String, #MnClaFl12Uwnbte3 options\u003f: * Api_Options) returns(#SoXIb9EicTVIvsei res: Json_Object) {
  #RmbhnyRY1hNFB5ex // Perms a GET operation on the given path.
  #S5r3i4g3iDGLZ6lo $res := code→get($path, $options\u003f)→content_as_json;
}


