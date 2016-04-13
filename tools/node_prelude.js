if (typeof global != "undefined" && typeof document == "undefined") {
  if (!global.TDev)
    global.TDev = { 
      window: { 
        document: { URL: "http://localhost/" },
        isNodeJS: true
      } 
    };
  var TDev      = global.TDev;
  var window    = global.TDev.window;
  var document  = global.TDev.window.document;
}
