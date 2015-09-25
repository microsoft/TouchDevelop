meta version "v2.2,js,ctx,refs,localcloud,unicodemodel,allasync,upperplex";
meta name "sendgrid";
meta icon "UpBox";
meta color "#ff007fff";
meta rootId "K7YIFEZ7R9iUN1cMBdDXL8GP";
meta iconArtId "ggvvhwai";
meta isLibrary "yes";
meta allowExport "yes";
meta hasIds "yes";
meta platform "network,npm,shell";
meta parentIds "";
#xNPzRhnuh6QhXwA9
action example() {
  #J2pHjBuCyoZ7SKmN // This library provides a simple access to [SendGrid](http://sendgrid.com/home).
  #Bw2xidz2RZZvGBtZ // {imports}
  #UmKUlIH1Am7QUcoD // ### configuration
  #ZR7IzVSP4r7vN5YE // Call the `init` action in your web service `_init` action. You will need to configure the ``SENDGRID_API_USER`` and ``SENDGRID_API_KEY`` environment variables to point to your SendGrid username and api key.
  #x1eSK8LkjKwV7N0c code→init("", "");
  #Vkb6X3arVrmYDA24 // ### simple usage
  #wf5JMfqF0XvMADdQ // Use the ``send`` action to send a simple text email.
  #ydq6NzD46Zwt0ZRO code→send("to@example.com", "from@example.com", "Hi!", "This is my first email through SendGrid.");
  meta private;
}
#AaeEdueH4SILZASo
action init(#a7P2MrYCakxR0Rvf api_user: String, #hGCW4CHm0UxTep1D api_key: String) {
  #EVSfu9O3iP2QXsLV // Initializes the SendGrid library. If empty, reads the api user and api key from the ``SENDGRID_API_USER`` and ``SENDGRID_API_KEY`` server settings.
  #vcVrbXY4wiqOjYLo if $api_user→is_empty then {
    #xg50IRlZfIxo0LDV $api_user := app→server_setting("SENDGRID_API_USER", false);
  }
  #xAow0mxqFEAbgfQH if $api_key→is_empty then {
    #MFxizqUEKSvD2SQg $api_key := app→server_setting("SENDGRID_API_KEY", false);
  }
  #mBhHwP2xPS9YBXXX data→logger := app→create_logger("sendgrid");
  #xJKnYfQHbENO3OdG app→import("npm", "sendgrid", "1.6.*");
  #BsuCcyHfi7FobWz9 app→javascript("local", "s.d.sendgrid  = require(\'sendgrid\')(api_user, api_key);");
}
#uey140KraZwDkmUa
action send(#fdiYRUTYiX5upzKN to: String, #xnWfBB2M0zkOz0CC from: String, #kXUSeEUuphgsfXhr subject: String, #KTI0DSh3MmQqHUsB text: String, #kXU5pndPTm2df5Q8 options\u003f: * Send_Options) {
  #xsFwRf8PxUH3OkTq // Sends a text email.
  #OUehX0gMQ3atNc0j contract→requires( `not` $to→is_empty, "missing to");
  #xTDLMYWvkrWsccqA contract→requires( `not` $from→is_empty, "missing from");
  #fK9JUbIo0CzqCPMy contract→requires( `not` $subject→is_empty, "missing subject");
  #NZT331XzGPG846kO data→logger→debug("sending email");
  #dOJFEEC8gNOG48He app→javascript_async("local", "var opts = options.to_json().value();\nvar payload = {\n  to : to,\n  from : from,\n  subject: subject,\n  text: text,\n  html: opts.html,\n  replyto: opts.replyto\n};\nif (opts.bcc) payload.bcc = opts.bcc.split(\';\');\nif (opts.cc) payload.cc = opts.cc.split(\';\');\ns.d.sendgrid.send(payload, lib.protect(s, function(err, json) {\n  if (err) TDev.Util.userError(\"sendgrid error: \" + err)     \n  resume();\n}));");
}
#BdGhpbmca
table Send_Options {
  type = "Object";
  exported = true;
  persistent = false;
  fields {
    #aFBxC4K20NsoCnPn html : String
    #b4JNNWO7shXISzI2 bcc : String
    #x76fHIAOq44bT20Y cc : String
    #ENyyKtvU4sTetP44 replyto : String
  }
}
#EJcew91egblZC7zB
var logger : App_Logger {
  transient = true;
}


