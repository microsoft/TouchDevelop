var http = require('http');
var port = process.env.HTTP_PORT || 1337;
http.createServer(function (req, res) {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Hello World\n' + process.version + "\n" + JSON.stringify(process.env, null, 2));
}).listen(port);
