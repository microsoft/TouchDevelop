meta version "v2.2,js,ctx,refs,localcloud,unicodemodel,allasync,upperplex";
meta name "node jwt simple";
meta icon "Key";
meta color "#ff007fff";
meta rootId "Jae77NgzoEIYwx9oEPXUhTVP";
meta isLibrary "yes";
meta allowExport "yes";
meta hasIds "yes";
meta platform "network,npm,shell";
meta parentIds "axwi";
#JTlZCjNrOiwQJTTA
action encode(#geRSITsxzTzZA5hg payload: Json_Object, #pfgYnD3MZ89uVXAU secret: String, #xIjzIMbpnLwyTQbv algorithm: String) returns(#mEHz4M4CXjxN2ps2 jwt: String) {
  #xkDaRAJufNVWnhoA // {hints:algorithm:RS256,HS256,HS384,HS512}
  #wnlOCfktdJMFFthe // Create JWT token using given signing/HMAC key.
  #Q8FEX2dNP0Wwqr8Z app→javascript("local", "jwt = jwt_simple.encode(payload.value(), secret, algorithm)");
  meta sync;
}
#CMvpc3uWcyFzb1QX
action \_init() {
  #bOE74GLQ2sjSqdGx app→import("npm", "jwt-simple", "0.2.*");
  meta private;
  meta sync;
}
#C4pmWtBVdkz5vFF9
action decode(#N7grNmCrUr3hTJIu jwt: String, #p8fgVAsOavNriUOZ pub_key: String) returns(#M32PUA35aL9N6pwK payload: Json_Object) {
  #Unj8J2gOI8KOARrS // Decode a JWT token using specified public key (or HMAC secret)
  #JonDVEgoAkSdYZX9 app→javascript("local", "var tmp = jwt_simple.decode(jwt, pub_key)\nif (tmp) payload = lib.JsonObject.wrap(tmp)");
  meta sync;
}
#zWCdns2HNtZhLo4N
action example() {
  #kUPbTE2Jw4a2UgDs // Encodes and decodes JSON Web Tokens, see http://self-issued.info/docs/draft-ietf-oauth-json-web-token.html
  #xz9Dvuy8GcX4Hcbx // ### generating tokens
  #FoHpFtVGLgZKRaNO data→secret := app→server_setting("TOKEN_SECRET", false);
  #TNC8aic7nLMdMrTP $jsb := web→create_json_builder;
  #ED1A7xnJ0IYGQE4D $jsb→set_string("iss", "My website");
  #xtkJ71IU41foNAJN $jsb→set_string("sub", "<some user>");
  #XQESROk2Po8uwEea $jsb→set_number("iat", math→floor(time→now→milliseconds_since_epoch / 1000));
  #xtR0DEtv46Pn47Tv $buf := bits→create_buffer(16);
  #pqjTMG6OvjU1f4Z6 $buf→fill_random;
  #aBrGEvyNMLjMe1rS $jsb→set_string("jti", $buf→to_string("hex"));
  #xmzt2kWMh1kJUW1L $jsb→set_string("aud", "<who is it for>");
  #Vxi5tY7Kt2di4N7p $custom_token := code→encode($jsb→to_json, data→secret, "HS256");
  #zPfY4lFu80pExWTL app→server_response→set_content($custom_token);
  #UrnRQ7kDHhli5OM5 // ### checking tokens
  #GwKJzygQ4oxbrOxK $payload := code→decode(app→server_request→query("access_token"), data→secret);
  #A7kvm2qXmzJFaNo5 if $payload→is_invalid `or` `not` $payload→string("aud")→equals("<who is it for>") then {
    #eRlPioLT1aP7zQeS app→server_response→set_status_code(403);
  }
  else {
    #FiP8KULltMgw44xL $userid := $payload→string("sub");
    #vXe39vbSon9FHG6i // ...process request...
  }
  meta private;
  meta sync;
}
#axOpN2wJegQFUS4I
var secret : String {
  transient = true;
}
#xB5aUf7roa4Oac7d
action decode_no_verify(#xZw5EK4qZLJmK2E5 jwt: String) returns(#xgF54ID9a4T2N2oD payload: Json_Object) {
  #MBXeyu2mZZkMnyyB // Decode a JWT token without verifying anything
  #ZR7e1iwOMxaNw3SS app→javascript("local", "var tmp = jwt_simple.decode(jwt, \"\", true)\nif (tmp) payload = lib.JsonObject.wrap(tmp)");
  meta sync;
}


