meta version "v2.2,js,ctx,refs,localcloud,unicodemodel,allasync,upperplex";
meta name "microsoft translator";
meta icon "ABC";
meta color "#ff007fff";
meta rootId "xTkkHOLgUbsRNST53ixdf2Zp";
meta isLibrary "yes";
meta allowExport "yes";
meta hasIds "yes";
meta platform "current";
meta parentIds "";
// A library to use the Microsoft Translator with your own API keys
#WBvfZFL26VDIN0a5
action create_request(#KAe29sETMJsINTxx url: String, #blb9uA3Sgtthmm92 method: String, #xmhRn5zZlGQHnOGh authorize: Boolean) returns(#jihVu6mC9pJVqbqs request: Web_Request) {
  #xQu7haSwNqQLGp3X $request := web→create_request($url);
  #AaiYSXkNuvc9WPN2 if $authorize then {
    #x6YcJzH0hYARoS5I code→authenticate();
    #dl06SPI2MA1cSzid code→set_authorization($request);
  }
  #WnD9QfU0LNDrGYwF $request→set_method($method);
  meta private;
}
#Q8WChfbPvnIoqNlR
action set_authorization(#NXDFlSPsBFFrLklD request: Web_Request) {
  #aYWeJubpV6gJ5dm5 $request→set_header("Authorization", "Bearer " ∥ data→access_token→access_token);
  meta private;
  meta sync;
}
#dJaLcmAsFTPE4U3t
var access_token : OAuth_Response {
  transient = true;
}
#O1Qays1MgV7QxB3U
action authenticate() returns(#e9eUI1ysdXUjiQOL authenticated: Boolean) {
  #xZrLQ3UQ4D4kOdZf if data→access_token→is_invalid `or` data→access_token→access_token→is_invalid then {
    #QCK9z5vbwmjOfSH2 data→logger→debug("refreshing token...");
    #fgSfoNOW5NnFrBWX $url := "https://datamarket.accesscontrol.windows.net/v2/OAuth2-13";
    #UmfmIQ4vys5svORL $token_req := records→token_req→create;
    #GG2E4mwGkT7ZvcZb $token_req→grant\_type := "client_credentials";
    #xNhQnukZJ2CW4CcO $token_req→scope := "http://api.microsofttranslator.com";
    #LLh1r4TGTenR4hv6 $token_req→client\_secret := data→client_secret;
    #YIF5FXR2QMjHUVrC $token_req→client\_id := data→client_id;
    #ziC7lAKT4D2E6sL4 $request := code→create_request($url, "POST", false);
    #V9JBtYRc3yukukQB $content := code→to_query_string($token_req→to_json);
    #Ai5bweSWVLYrS8iZ $request→set_content($content);
    #AAVNn7k5vdzJe941 $request→set_header("Content-type", "application/x-www-form-urlencoded");
    #tdE9XoFmg3iVgpNt $response := $request→send;
    #AVMrrxyM4saI2DRZ if $response→status_code = 200 then {
      #x1Q3pc9OsZsTAzhU $js := $response→content_as_json;
      #kx17OIZ3gfyzOciL $redirect_url := "https://localhost.com/#access_token=" ∥ web→encode_uri_component($js→string("access_token")) ∥ "&expires_in=" ∥ $js→string("expires_in");
      #xzuVmtGBJgMdj5ZV data→access_token := web→oauth_token_from_url($redirect_url);
      #gw8vTx4sWDSzHfxy if `not` data→access_token→is_invalid then {
        #xlq4kTq45Z6RYeww skip;
      }
      else {
        #YEuWHz4b2uE8JTK7 data→logger→error("failed to parse access token");
      }
    }
    else {
      #xBO37O2WaN5FCa0G data→logger→error("failed getting access token: " ∥ $response→status_code);
      #UHpLxrBWt2SNHrpq data→logger→debug($response→content);
    }
  }
  #yIkbuJ09znxgGiYA $authenticated := `not` data→access_token→is_invalid `and` `not` data→access_token→access_token→is_invalid;
}
#BdGhpbmca
table token_req {
  type = "Object";
  persistent = false;
  fields {
    #xNvRk6uO3qe4b7NM grant\_type : String
    #xOGLTJrwar4ilIZT client\_id : String
    #Ohht9sGfuo5fWQuG client\_secret : String
    #ADCC4J9J687lrEmn scope : String
  }
}
#xlo3lXVUpHZLn6zj
action to_query_string(#Clbkea30uJc3Hpuv params: Json_Object) returns(#JQjsrEacnw99WPrX query: String) {
  #L27st4x03996sps0 $query := "";
  #WDBI7mlt50hMbJ0K foreach s2 in $params→keys
  do {
    #g1TGY9kDRji4M8if if `not` $query→is_empty then {
      #xwhjxta4s24cD29C $query := $query ∥ "&";
    }
    #CziIqMLM3t3oJNqV $query := $query ∥ web→url_encode($s2) ∥ "=" ∥ web→url_encode($params→string($s2));
  }
  meta private;
  meta sync;
}
#Xj4gUaJhZ3wIKWoo
action send_request(#MTf5lEcGQCh9ZyVR request: Web_Request) returns(#xQDhIm1iVy71C1NV response: Web_Response) {
  #N1VUTBZHW44clbJK $response := $request→send;
  #R93Kx4IwX9epRJv9 data→logger→debug("status: " ∥ $response→status_code);
  #nr9zRC3QyU5myQW7 if $response→status_code = 400 then {
    #S2HTfYS2Eb0r4qNt data→logger→debug("token expired");
    #wwkqvpGEwfpltRyY data→access_token := invalid→oauth_response;
    #xQ8wybveCc9hkBbG $authenticated := code→authenticate();
    #xy4wTmFCisPkaPfM if $authenticated then {
      #QhjbUgx84phu9n5w code→set_authorization($request);
      #M2Ns4BjlLLXQ8Xpk $response := $request→send;
      #x8H24Idrh9ulfqey data→logger→debug("status (refresh): " ∥ $response→status_code);
    }
  }
  meta private;
}
#R9Gz9YMNmhPOJVL3
action test_authenticate() {
  #HFTp9M2cAjhNxTmA data→access_token := invalid→oauth_response;
  #hoc04nqlx4roJUwi code→init("TouchDevelopTranslator", "<need>");
  #wwx4PHT450FXuF4w code→authenticate;
  #PxFDwocNp04V04C0 contract→assert( `not` data→access_token→access_token→is_empty, "");
  meta private;
  meta test;
}
#LAQ2MOnqfdHODlZH
action translate(#pXkiJcUggrYubexl text: String, #HYPUMQWxPRaIFtGK from: String, #rW6vTzZT3DpcbnV9 to: String, #w5YJ39y9b7Nqr6yy html: Boolean) returns(#M9TztsRgCXf3KOcj translated: String) {
  #GAq2mG3SO41Jg6fp // Translates the given text to the given language
  #tDwwuMvvDGCw0M2K code→check_credentials;
  #wN6Lw40Bc2ty0Cdc contract→requires( `not` $to→is_empty, "missing target language");
  #iPOgRiZKVB1rkQ9g $type := "text/plain";
  #UcbZlgZIyAwX4nPE if $html then {
    #L32ftXCwR5d2Rc2I $type := "text/html";
  }
  #newwl0ZDRQvuyc3B $url := "http://api.microsofttranslator.com/v2/Http.svc/Translate?text=" ∥ web→encode_uri_component($text) ∥ "&to=" ∥ $to ∥ "&contentType=" ∥ $type;
  #bdaXa63mMV12WbqA if `not` $from→is_empty then {
    #xT5AbB2JPGvT37ug $url := $url ∥ "&from=" ∥ $from;
  }
  #teOHWvqYZAqr6MyO $request := code→create_request($url, "get", true);
  #fVI0le4DsBlK3993 $response := code→send_request($request);
  #rJRqJkXkzIzyewrw // <string>....
  #OA4e8KrR2vKEwBGq if $response→status_code = 200 then {
    #V7UZnc2LCU1JWhuX $xml := $response→content;
    #ssLUe72mV6jz2JB8 $xml := $xml→replace_regex("<[^>]*>", "");
    #nrpOAKoEka29Guyw $xml := $xml→replace("&lt;", "<");
    #ahkDlK0i5IStBJpr $xml := $xml→replace("&gt;", ">");
    #avpbiiEDMnXyAc5c $xml := $xml→replace("&amp;", "&");
    #exCFV3UwY5Vd7WCz $translated := $xml;
  }
  else {
    #rTglS8Wk83BrWLCF $translated := invalid→string;
  }
}
#oCr8aw8pOj2fBkkW
action test_translate() {
  #OKs40mZzYnlqBFhb data→access_token := invalid→oauth_response;
  #MQ7hPkBD6uTF2QbG code→init("TouchDevelopTranslator", "<need>");
  #jxPRwrfIgWmd2PYP $translated := code→translate("<input type=\'text\'>Hello</input> and the operator is << &lt;", "en", "es", true);
  #mgCt4w0u2bi1lyS7 $translated→post_to_wall;
  meta private;
  meta test;
}
#KtPnwxbdInYC0OE0
action init(#mBaZVdcHoSe6Jggp client_id: String, #JrXcAnokVl4E7Cwm client_secret: String) {
  #SZiHtvu5jnMF4ySS // Initializes the credentials needed to call the Microsoft Translator APIs. If not provided, the ``MICROSOFT_TRANSLATOR_CLIENT_ID`` and ``MICROSOFT_TRANSLATOR_CLIENT_SECRET`` server setting are used.
  #WNIeQLnds6TGW3gq if $client_id→is_empty then {
    #S8fckXqEvmiROWHV $client_id := app→server_setting("MICROSOFT_TRANSLATOR_CLIENT_ID", false);
  }
  #xPuCs6ijTo4iNphC if $client_secret→is_empty then {
    #xx0dQ9AlmAm4T4Zf $client_secret := app→server_setting("MICROSOFT_TRANSLATOR_CLIENT_SECRET", false);
  }
  #RtRWxGLzDSaZZi7S data→client_id := $client_id;
  #xWSO1wYVXBcbJglO data→client_secret := $client_secret;
  #gslIWt674cX6nEqq data→logger := app→create_logger("translator");
  #xj8yG0WB02i4WTf5 data→logger→debug("client id: " ∥ data→client_id);
}
#xld1znHowQymmkqL
var client_id : String {
  transient = true;
}
#rC21G2AX6GNuyXL2
var client_secret : String {
  transient = true;
}
#MHIhVzI8bp35DIFe
action check_credentials() {
  #xS2rTvqEikRG7DhP contract→assert( `not` data→client_id→is_empty `and` `not` data→client_secret→is_empty, "missing credentials, did you call `init`?");
  meta private;
  meta sync;
}
#UG19palqmljKZP8v
var logger : App_Logger {
  transient = true;
}
#Rl0MlL74NfZdY9cK
action example() {
  #TLadcxlCrsfWgfAx // This library allows to send translation requests to the Microsoft Translator services.
  #NsbgZnu6uk4Aa2jK // ## configuration
  #Zn1BFzV0QTtCM3Lh // The ``init`` action takes the ``MICROSOFT_TRANSLATOR_CLIENT_ID`` and ``MICROSOFT_TRANSLATOR_CLIENT_SECRET`` server setting from the environment.
  #sTvfmbX4n3tphiTX code→init("", "");
  #OU3fHWN4wO7rRseH // ### translations
  #CNoXAC2WOJJxgboa // To translate a string, provide the input language (leave empty to let translator guess), the target language and whether the text is html.
  #ZxBegHGvOlk4Fx22 $translated := code→translate("hello", "en", "fr", false);
  meta private;
}


