var fs = require("fs");
var s = fs.readFileSync("../www/default.css", "utf8").replace(/(@font-face\s*\{[^{}]+TD Symbols[^{}]+src:).*/,
  function(w,p) { return p + "url(data:application/x-font-woff;base64," 
        + fs.readFileSync("TDSymbols.woff").toString("base64") + ");" })
fs.writeFileSync("../www/default.css", s);
