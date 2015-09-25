meta version "v2.2,js,ctx,refs,localcloud,unicodemodel,allasync,upperplex";
meta name "nodemailer";
meta icon "UpBox";
meta color "#ff007fff";
meta rootId "K7YIFEZ7R9iUN1cMBdDXL8GP";
meta iconArtId "aoxtbxkx";
meta isLibrary "yes";
meta allowExport "yes";
meta hasIds "yes";
meta platform "network,npm,shell";
meta parentIds "";
// Wraps npm nodemailer module. Lets you send email directly from the current machine with the SMTP transport.
#xNPzRhnuh6QhXwA9
action example() {
  #J2pHjBuCyoZ7SKmN // This library provides a simple access to sending email directly from the current machine. This may or may not work, and it may be considered spam.
  #Bw2xidz2RZZvGBtZ // {imports}
  #UmKUlIH1Am7QUcoD // ### configuration
  #ZR7IzVSP4r7vN5YE // Call the `init` action in your web service `_init` action.
  #x1eSK8LkjKwV7N0c code→init();
  #Vkb6X3arVrmYDA24 // ### simple usage
  #wf5JMfqF0XvMADdQ // Use the ``send`` action to send a simple text email.
  #ydq6NzD46Zwt0ZRO code→send("to@example.com", "from@example.com", "Hi!", "This is my first email through SendGrid.");
  meta private;
}
#AaeEdueH4SILZASo
action init() {
  #EVSfu9O3iP2QXsLV // Initializes the nodemailer library with the direct transport.
  #mBhHwP2xPS9YBXXX data→logger := app→create_logger("nodemailer");
  #xJKnYfQHbENO3OdG app→import("npm", "nodemailer", "1.4.*");
  #BsuCcyHfi7FobWz9 app→javascript("local", "s.d.nodemailer  = require(\'nodemailer\').createTransport();");
}
#uey140KraZwDkmUa
action send(#fdiYRUTYiX5upzKN to: String, #xnWfBB2M0zkOz0CC from: String, #kXUSeEUuphgsfXhr subject: String, #KTI0DSh3MmQqHUsB text: String, #kXU5pndPTm2df5Q8 options\u003f: * Send_Options) {
  #xsFwRf8PxUH3OkTq // Sends a text email.
  #OUehX0gMQ3atNc0j contract→requires( `not` $to→is_empty, "missing to");
  #xTDLMYWvkrWsccqA contract→requires( `not` $from→is_empty, "missing from");
  #fK9JUbIo0CzqCPMy contract→requires( `not` $subject→is_empty, "missing subject");
  #NZT331XzGPG846kO data→logger→debug("sending email");
  #dOJFEEC8gNOG48He app→javascript_async("local", "var opts = options.to_json().value();\nvar payload = {\n  to : to,\n  from : from,\n  subject: subject,\n  text: text,\n  html: opts.html,\n  replyTo: opts.replyto\n};\nif (opts.bcc) payload.bcc = opts.bcc.split(\';\');\nif (opts.cc) payload.cc = opts.cc.split(\';\');\ns.d.nodemailer.sendMail(payload, lib.protect(s, function(err, json) {\n  if (err) TDev.Util.userError(\"nodemailer error: \" + err)     \n  resume();\n}));");
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


