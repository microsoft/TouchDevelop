///<reference path='refs.ts'/>
module TDev.RT.WinRT {
    export function PageButtonManagerInit()
    {
        // see http://msdn.microsoft.com/en-us/library/windows/apps/jj841126.aspx
        var iconSymbols: any = {
            "add": "109",
            "back": "112",
            "cancel": "10A",
            "check": "10B",
            "close": "10A",
            "delete": "107",
            "download": "118",
            "edit": "104",
            "favs.addto": "1CF",
            "favs": "113",
            "feature.camera": "114",
            "feature.email": "119",
            "feature.search": "11A",
            "feature.settings": "115",
            "feature.video": "116",
            "folder": "188",
            "minus": "108",
            "new": "113", // TODO
            "next": "101",
            "questionmark": "11B",
            "refresh": "149",
            "save": "105",
            "share": "134", // TODO
            "stop": "15B",
            "sync": "117",
            "transport.ff": "101", // TODO
            "transport.pause": "103",
            "transport.play": "102",
            "transport.rew": "100", // TODO
            "upload": "11C"
        };
        PageButtonManager.getIconElement = function (name: string) {
            var span = document.createElement('span');
            span.className = "appBarSymbol";
            var symbol = iconSymbols[name];
            if (symbol)
                span.innerHTML = "&#xE" + symbol + ";";
            else
                span.innerHTML = Util.htmlEscape(name.slice(0, 1));
            return span;
        }
    }
}