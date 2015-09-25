meta version "v2.2,js,ctx,refs,localcloud,unicodemodel,allasync,upperplex";
meta name "tdlite.docs";
meta rootId "T4649oEbQXbC8D4o5H4XpPQ9";
meta isLibrary "yes";
meta allowExport "yes";
meta hasIds "yes";
meta platform "current";
meta parentIds "";
#X5ISKyIK0Jq2Az6P
action format(#Rn84gwgoepicz386 templ: String, #xt19nReS4N8DMUN5 pubdata: Json_Builder) returns(#xN1kD4Os7eVHbb0z expanded2: String) {
  #WjALXh9mQGIzh2ee if `not` $pubdata→number("time")→is_invalid then {
    #OmDcEpZC7t0yXqYk $pubdata→set_number("timems", $pubdata→number("time") * 1000);
    #KPiL4Ef7lOjXTwPR $pubdata→set_string("humantime", code→human_time($pubdata→time("timems")));
  }
  #EI8fFfuIZAauy4o8 skip;
  #EFR4kAVWMIWnGWvm $targets := collections→create_string_map;
  #Xt7yjNFYqHpzQBTy $bodies := collections→create_string_map;
  #hDhL9P040LSh129n $templ := $templ→replace_regex_with_converter("<!--\\s*SECTION\\s+(\\S+)\\s+(\\S+)\\s*-->([^]*?)<!--\\s*END\\s*-->", $lambda);
  #hVSlYpTc9bVpUUun where lambda(elt: Collection[String]) returns (result: String) {
    #hBKxgaXLQCdOE9QM $name := $elt→at(1);
    #jSkSdXtPM4ogFaPU $targets→set_at($name, $elt→at(2));
    #ef6BwjAFL8asX74z $bodies→set_at($name, $elt→at(3));
    #h9CGo6rUWz5BiGHu $result := "";
  }
  #DRfdxrh5QRVrEhtv $body := $pubdata→string("body")→replace_regex("<div class=\'md-para\'>\\s*</div>", "");
  #xXZ71tlBm8L24RJ9 $s := $body→replace_regex("^\\s*<div[^<>]*md-tutorial[^<>]*>", "");
  #cbHk4U76xjTj6MgA if `not` $s→equals($body) then {
    #x5wruZZPuvQDf3s4 $body := $s→replace_regex("</div>\\s*$", "");
  }
  #xqFVIWkvwWPWWcaF $body := $body→replace_regex("<div[^<>]md-tutorial[^<>]*>\\s*</div>", "");
  #i44MiwuvfocvXGXT $sects := $body→split("<hr ");
  #xBeB2Vzr4e4Oolim if $sects→count > 1 `and` $sects→at(0)→trim(" \t\n")→is_empty then {
    #x2vMhRN2zFhMM2mp $sects→remove_at(0);
  }
  else {
    #ylVUFaaK6FmRSdL4 $sname := "main";
    #qQ2lsl9NkLoij7eb if $sects→count = 1 then {
      #Cnchs07pCcz4egLG $sname := "full";
    }
    #U5DAFll4X19OsMej $sects→set_at(0, "data-name=\'" ∥ $sname ∥ "\' data-arguments=\'\' />" ∥ $sects→at(0));
  }
  #xUfFMJfExoxuW3ZG $sinks := web→create_json_builder;
  #xupthI2ZeKz6OTqj foreach s2 in $sects
  do {
    #eiUW4gIpL2bdNbz1 $coll := $s2→@match("[^>]*data-name=\'([^\'\"<>]*)\' data-arguments=\'([^\'\"<>]*)\'[^>]*>([^]*)");
    #xXBL0asSE96RIZL0 $sectjs := web→create_json_builder;
    #CvItxSFPW6igMeYS $name := web→decode_uri_component($coll→at(1));
    #R8oCGI2aRevgQyIa foreach s3 in web→decode_uri_component($coll→at(2))→split(";")
    do {
      #oBBZB0ij0lzNbvlg $s4 := $s3→trim(" \t");
      #xj7cbE0NvHX224cN $coll2 := $s4→@match("^([^=]*)=(.*)");
      #xbT7EuErJnYeLR3A if $coll2→at(1)→is_invalid then {
        #KCkSFtV682oHP9F7 $sectjs→set_string($s4, "true");
      }
      else {
        #hfzCeT9TTRsRtLX6 $sectjs→set_string($coll2→at(1), $coll2→at(2));
      }
    }
    #xUrgGQ4quJ4LGrgH $sectjs→set_string("body", $coll→at(3));
    #cMe3p1ZUGb1z3X78 data→expand_info→run($sectjs);
    #RUTavhY3iDSDRD8s $b := $sectjs→boolean("isvolatile");
    #QnEzKkBEKqCrn5tk if `not` $b→is_invalid `and` $b then {
      #aoMI0fccZnaUAlXG $pubdata→set_boolean("isvolatile", true);
    }
    #xmmpcw4432Bg44Qb foreach fn in $pubdata→keys
    do {
      #FFxsKhSlZxlvwGS3 if `not` $sectjs→contains_key($fn) then {
        #gl9KbvV2KvHIAaww $sectjs→set_field($fn, $pubdata→field($fn)→to_json);
      }
    }
    #G6OvJ8aQ4hvqgWGP $expanded := "";
    #v2uz69FS2kXxva2Z $target := "main";
    #OHcUBTDyhNfH6ZMo $sect_templ := $bodies→at($name);
    #PqGuaAyL2C88IYar if $sect_templ→is_invalid then {
      #J0U9xcJvzatn5qiN $expanded := "<div>section definition missing: " ∥ code→html_quote($name) ∥ "</div>";
    }
    else {
      #oPSS915McDja9EqL $target := $targets→at($name);
      #s8z9WBh10725vfzu $promos := $sectjs→field("promo");
      #XWfRNnh2Lui6I3zd if `not` $promos→is_invalid then {
        #t2awIIBsi4h8zyhf $accum := "";
        #scmFunzKU3KTO7SU foreach promo in $promos
        do {
          #qlYzJpLVzzYwAs8r $jsb := $promo→field("promo");
          #Q1hPPOKuz4ElRn0x if $jsb→is_invalid then {
            #xXtZrNlIwjOuH798 `continue` ;
          }
          #xMDSTsCJ3I445xfM $repl_res := code→fmt($promo, "<li class=\'promo-item\'>\n    <strong>@promo.name@</strong> by @promo.username@, \n    <span class=\'promo-description\'>@promo.description@</span>\n</li>");
          #leqwyKWwRXbmWIWW if `not` code→or_empty($jsb→string("link"))→is_empty then {
            #Ed9ezO44Kvj3hHic $repl_res := code→fmt($promo, "<li class=\'promo-item\'>\n    <a href=\"@promo.link@\">@promo.name@</a> by @promo.username@,\n    <span class=\'promo-description\'>@promo.description@</span>\n</li>");
          }
          #GunZ5onb9NqDkhSo $accum := $accum ∥ $repl_res;
        }
        #FHOirci3P2SF7eIk $sectjs→set_string("body", code→or_empty($sectjs→string("body") ∥ $accum));
      }
      #Yq30Exz6s1gdibHY $expanded := $sect_templ→replace_regex_with_converter("@([a-zA-Z0-9_]+)@", $lambda2);
      #Tj6Dt6kWUd4LEwfA where lambda2(elt: Collection[String]) returns (result: String) {
        #V1Jc0R5GnXl9NyOn $key := $elt→at(1);
        #bM0Qg7NfcZ9rALJW $result := code→or_empty($sectjs→string($key));
        #xhMroNZbRdebZ1CO if `not` $key→is_match_regex("^(body)$") then {
          #xC0m8veLRIsDGpn9 $result := code→html_quote($result);
        }
      }
    }
    #IwEdsgHous5lxJAS $sinks→set_string($target, code→or_empty($sinks→string($target)) ∥ $expanded);
  }
  #L0EkbtmdQFvEmsGA $pubdata→copy_from($sinks→to_json);
  #nyeIlnwO46V0sw2u $expanded := $templ→replace_regex_with_converter("@([a-zA-Z0-9_]+)@", $lambda2);
  #e4TP59GTc1N4ThD4 where lambda2(elt: Collection[String]) returns (result: String) {
    #b17slJmsuZk5ydAa $key := $elt→at(1);
    #ZkrGav0NUGaxrXsB $result := code→or_empty($pubdata→string($key));
  }
  #jfMqZgMwTkhkDjRA `return` $expanded;
}
#xxRstqL2xfX6JOqM
action or_empty(#y8yqqlA5Yt7E9X8k s: String) returns(#N6E5b09Gy7tteiRU r: String) {
  #AOzNcAR4Z0Zfft0l if $s→is_invalid then {
    #LxlHg4kxOfh78Bcs $r := "";
  }
  else {
    #klSz6Zi7ipQ1aM57 $r := $s;
  }
  meta private;
  meta sync;
}
#sRKWkDxtkOxJskdN
action html_quote(#vhhRMODzjpALTtj0 td_username: String) returns(#xj6LKEBLTqF84ByH new: String) {
  #YNnhitFlpLQfmmge $new := $td_username→replace("&", "&amp;")→replace("<", "&lt;")→replace(">", "&gt;")→replace("\"", "&quot;")→replace("\'", "&#39;");
  meta private;
  meta sync;
}
#vNoIB71jSe8pHHs3
action init(#Z4eA8zurQBfo8sEy expand_info: Action1[Json_Builder]) {
  #vitL87ScQDAe3Epu data→expand_info := $expand_info;
  meta sync;
}
#CuTn8q1p46VPKDF3
var expand_info : Action1[Json_Builder] {
  transient = true;
}
#U8fGq4fO6K3ANwLd
action fmt(#bG9E7LrJIdQWCeyU promo: Json_Builder, #pjaMqiI94cv8vYge html: String) returns(#e7jxB2r3M4diX2Qq repl_res2: String) {
  #x7gbDmSgEpQqpdck // {language:html:html}
  #j96h2FVcKzmpAqDR $repl_res := $html→replace_regex_with_converter("@([a-zA-Z0-9_\\.]+)@", $lambda2);
  #sW1zNnn0xedDredX where lambda2(elt: Collection[String]) returns (result: String) {
    #xzyMDVY7blCC4QYq $jsb := $promo;
    #jD5TeSAG442BlEjM foreach fld_name in $elt→at(1)→split(".")
    do {
      #sz8T3iGw2jcVHgXH if $jsb→is_invalid then {
        #xOofkZRjeJqU4wdH `break` ;
      }
      #cAYnlMrTP8ziO4mg $jsb := $jsb→field($fld_name);
    }
    #AuDc9EWeJg5ibpOi if $jsb→is_invalid then {
      #fQ2NnmRAMJskiGks $result := "";
    }
    else {
      #jvjzwyB03NFodNCz $result := code→html_quote(code→or_empty($jsb→to_string));
    }
  }
  #x7G6ugCJnE1XOOra `return` $repl_res;
  meta private;
  meta sync;
}
#DhA1xCkJMZ2UVMFd
action two_digit(#FXvUGFBf3YR9MO4v p: Number) returns(#nPVwgSnYxBV84Vgw s: String) {
  #LTifL5tqFMNfQnDS $s2 := "00" ∥ $p;
  #NlB6V5VtMeVF9Ilg `return` $s2→substring($s2→count - 2, 2);
  meta private;
  meta sync;
}
#y3FVCepuURLAl4Y0
action human_time(#TYpwBgfZz9SI5cGg p: DateTime) returns(#OPlC5nt2kJ1F6tRb s: String) {
  #hVpX3KTTAJXQncQS `return` $p→year ∥ "-" ∥ code→two_digit($p→month) ∥ "-" ∥ code→two_digit($p→day) ∥ " " ∥ code→two_digit($p→hour) ∥ ":" ∥ code→two_digit($p→minute);
  #J8tRu0AINvDXbXDi skip;
  meta private;
  meta sync;
}


