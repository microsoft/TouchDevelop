var page = require('webpage').create();
page.open('http://localhost:4242/editor/local/blockly/render.html?id=hgmgxx', function () {
    var tryRender = function () {
        var ready = page.evaluate(function () {
            return !!document.getElementById('blocklyDiv').getAttribute('data-ready');
        });
        if (ready) {
            page.render('blocks.png');
            phantom.exit();
        } else {
            console.log('page not ready...')
            setTimeout(tryRender, 1000);
        }
    };
    tryRender();
});