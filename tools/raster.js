var url = 'http://localhost:4242/editor/local/blockly/render.html?id=hgmgxx';
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
                console.log('metrics:' + JSON.stringify(metrics, null, 2));
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
                console.log('size: ' + JSON.stringify(page.viewportSize))
                page.open(url, render);
            } else { 
                console.log('rendering...')
                page.render('build/blocks.png');
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
