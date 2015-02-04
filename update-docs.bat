setlocal
tf edit help.cache
tf edit build\langs.js
node nodeclient updatehelp %1
node nodeclient updatelang %1
