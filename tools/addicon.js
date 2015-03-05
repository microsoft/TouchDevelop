var fs = require('fs')

var faPath = 'c:/dev/temp/Font-Awesome'
var svgTs = 'rt/svg.ts'

var icons = {}
var currIcon = ""

var ic = process.argv[2]
if (!ic) {
  console.log("usage: node addicon.js iconname")
  process.exit(1)
}

fs.readFileSync(faPath + "/css/font-awesome.css", "utf8").split(/\n/).forEach(function (line) {
  var m = /^\.fa-(\S+):before/.exec(line)
  if (m) currIcon = m[1]
  m = /content: "\\(....)"/.exec(line)
  if (currIcon && m) {
    icons[currIcon] = m[1]
    currIcon = ""
  }
})

if (!icons.hasOwnProperty(ic)) {
  var r = new RegExp(ic)
  console.log("No such icon: " + ic + ", similar icons:")
  console.log(Object.keys(icons).filter(function(k) { return r.test(k) }).join(", "))
  process.exit(1)
}


var svg = {}
fs.readFileSync(faPath + "/fonts/fontawesome-webfont.svg", "utf8").split(/\n/).forEach(function (line) {
  var m = /^<glyph unicode="\&#x(....);".*d="([^"]+)"/.exec(line)
  if (m) svg[m[1]] = m[2]
})

var theSVG = svg[icons[ic]]
if (!theSVG) {
  console.log("css is there but not svg!")
  process.exit(1)
}

var output = ""
var state = 0
fs.readFileSync(svgTs, "utf8").split(/\n/).forEach(function (line) {
  if (/var fontAwesomeIconsByDaveGandy/.test(line)) state = 1
  if (state == 1 && /^\s*\}/.test(line)) {
    state = 2
    output += "        " + JSON.stringify(ic) + ": " + JSON.stringify(theSVG) + ",\n"
  }
  output += line + "\n"
})

output = output.replace(/\n+$/, "\n")

fs.writeFileSync(svgTs, output)
