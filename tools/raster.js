var system = require('system');
var args = system.args;
var url = args[1] || 'http://localhost:4242/editor/local/blockly/render.html?id=hgmgxx';
var output = args[2] || 'build/blocks.png';
var page = require('webpage').create();
var needsResize = true;

function render() {
    var tryRender = function () {
        var ready = page.evaluate(function () {
            return !!document.getElementById('blocklyDiv').getAttribute('data-ready');
        });
        if (ready) {
            if (needsResize) {
                needsResize = false;
                console.log('resizing...')
                var metrics = page.evaluate(function () {
                    return Blockly.mainWorkspace.getMetrics();
                });
                page = require('webpage').create();
                page.viewportSize = { 
                    width: metrics.contentWidth + metrics.contentLeft,
                    height: metrics.contentHeight + metrics.contentTop,
                };
                page.clipRect = {
                    top: metrics.contentTop,
                    left: metrics.contentLeft,
                    width: metrics.contentWidth,
                    height: metrics.contentHeight
                }
                page.open(url, render);
            } else { 
                console.log('rendering to ' + output)
                page.render(output);
                phantom.exit();                                
            }
        } else {
            console.log('.')
            setTimeout(tryRender, 1000);
        }
    };
    tryRender();
}

console.log('loading ' + url);
page.open(url, function () { render(); });
