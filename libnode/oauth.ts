///<reference path='refs.ts'/>

module TDev.RT.Node {

    export var storeOAuthHTML =
"<!DOCTYPE html>\n" +
"<html>\n" +
"<head>\n" +
"    <meta charset='utf-8' />\n" +
"    <meta http-equiv='X-UA-Compatible' content='IE=edge' /> \n" +
"    <meta name='viewport' content='width=320, initial-scale=1, maximum-scale=1, user-scalable=0'/>\n" +
"    <title>Authorization finished</title>\n" +
"</head>\n" +
"<body id='root'>\n" +
"  <div style='font-size: 14px; color:#444; font-family: sans-serif; line-height: 1.5em; width: 310px; margin: 2em auto;'>\n" +
"    <h1>authorization finished</h1>\n" +
"    <p>\n" +
"        You can close this page. \n" +
"        The web app should resume in a different tab or window.\n" +
"    </p>\n" +
"  </div>\n" +
"  <script type='text/javascript'>\n" +
"     var a = window.localStorage['oauth_redirect'];\n" +
"     var b = [];\n" +
"     var now = new Date().getTime();\n" +
"     if (a)\n" +
"         JSON.parse(a).forEach(function (e) {\n" +
"             if (now - e.time < 10 * 60 * 1000) b.push(e); // remove anything older than 10 minutes\n" +
"         });        \n" +
"     b.push({redirect_url: window.location.href, time: now, user_id: 'web-app' });\n" +
"     window.localStorage.setItem('oauth_redirect', JSON.stringify(b));\n" +
"     if (window.opener) window.opener.postMessage(b, document.URL.replace(/(.*:\\/\\/[^\\/]+).*/, function(a,b){return b}));\n" +
"     setTimeout(window.close, 3000);\n" +
"  </script>\n" +
"</body>\n" +
"</html>\n";

}
