var http = require('http');
var fs = require('fs');
var port = process.env.HTTP_PORT || 1337;
http.createServer(function (req, res) {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    if (req.url == "/log.txt") {
      res.end(fs.readFileSync("log.txt", "utf8"));
    } else {
      res.end('Hello World\n' + process.version + "\n" + JSON.stringify(process.env, null, 2));
    }
}).listen(port);
