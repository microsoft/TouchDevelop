var fs = require("fs");
var font = fs.readFileSync("TDSymbols.woff").toString("base64");
var s = fs.readFileSync("../www/default.css", "utf8").replace(/(@font-face\s*\{[^{}]+TD Symbols[^{}]+src:).*/,
  function(w,p) { return p + "url(data:application/x-font-woff;base64," + font + ");" })
fs.writeFileSync("../www/default.css", s);
var s = fs.readFileSync("../ast/render.ts", "utf8").replace(/(@font-face\s*\{[^{}]+TD Symbols[^{}]+src:).*/,
  function(w,p) { return p + "url(data:application/x-font-woff;base64," + font + ');}\\n"+' })
fs.writeFileSync("../ast/render.ts", s);
