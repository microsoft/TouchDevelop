TDev.Browser.detect();

if (typeof module != "undefined" && module.exports) {
    module.exports = TDev;
    TDev.RT.Node.setup();
} else {
    TDev.Ticker.disable()
    TDev.Util.initGenericExtensions();
    TDev.RT.RTValue.initApis();
}

TDev.AST.Lexer.init();
TDev.api.initFrom();

if (typeof window != "undefined" && window.tdAfterLoadCallback) {
    var f = window.tdAfterLoadCallback;
    delete window.tdAfterLoadCallback;
    f(TDev);
}
