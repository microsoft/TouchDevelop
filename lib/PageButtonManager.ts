///<reference path='refs.ts'/>
module TDev.RT {
    export module PageButtonManager {
        var _iconSymbols: any = {
            "add": "add",
            "back": "back",
            "cancel": "cancel",
            "check": "check",
            "close": "cancel",
            "delete": "delete",
            "download": "download",
            "edit": "edit",
            "favs.addto": "heart",
            "favs": "star",
            "feature.camera": "camera",
            "feature.email": "email",
            "feature.search": "search",
            "feature.settings": "settings",
            "feature.video": "video",
            "folder": "folder",
            "minus": "subtract",
            "new": "newpage",
            "next": "forward",
            "questionmark": "question",
            "refresh": "recycle",
            "save": "save",
            "share": "sharethis",
            "stop": "stop",
            "sync": "cycle",
            "transport.ff": "forward",
            "transport.pause": "pause",
            "transport.play": "play",
            "transport.rew": "rewind",
            "upload": "upload"
        };

        export var getIconElement = (name: string): HTMLElement => {
            var symbol = _iconSymbols[name];
            if (!symbol)
                return span('', name.slice(0, 1));
            else
                return HTML.mkImg('svg:' + symbol + ",black")
        }
    }
}
