var window;
if (typeof window == "undefined")
  window = {};
if (typeof window.location == "undefined")
  window.location = {};
window.isWebWorker = true;
var document;
if (typeof document == "undefined")
  document = {};
window.document = document;
if (typeof window.navigator == "undefined")
  window.navigator = self.navigator;

self.onmessage = function (e) {
  var d = e.data;

  if (typeof d != "object")
    return;


  if (d.op == "load") {
    if (/^\.\//.test(d.url) || /^https:\/\/az31353\.vo\.msecnd\.net\//.test(d.url)) {
      console.log("loading " + d.url)
      importScripts(d.url)
    }
  }
};
