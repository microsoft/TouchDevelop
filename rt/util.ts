///<reference path='refs.ts'/>

module TDev {
    export var debuggerExceptions = false;
    export var forceLocalStorage = false;
    export var withTracing = false;
    export var dbg = false;
    export var isBeta = false;
    export var asyncEnabled = true;
    export var isWebWorker = false;

    export interface StringMap<T>
    {
        [index:string] : T;
    }

    export interface StringSet
    {
        [index:string] : boolean;
    }

    export interface MultiSet
    {
        [index:string] : number;
    }

    export interface LogMessage {
        timestamp: number;
        elapsed?: string;
        level: number;
        category: string;
        msg: string;
        meta?: any; // custom data associated to event
    }

    export function enumToString(enumType: any, theEnum: any): string {
        // legacy enums and new typescript enums
        var ret = enumType[theEnum];
        if (!ret) throw new Error("Cannot convert enum to string: " + theEnum);
        return ret;
    }

    export function nullify(v: any) {
        // == null returns true for both null and undefined
        return (v == null) ? null : v;
    }

    // used like this:
    // var smth = coalesce(x)(_=> _.y)(_=> _.z)(_=> _.a)();
    // instead of this:
    // var smth = x && x.y && x.y.z && x.y.z.a;
    export function coalesce(v: any) {
        return (f?: (any) => any) => {
            if (f && (v != null)) return coalesce(f(v));
            else if (!f) return v;
            else return coalesce(null);
        };
    }

    /*here is a fully typeable version (not sure if we can use generics right now):
    interface Coalesced<T> {
        <U>(f : (x: T) => U) : Coalesced<U>;
        () : T;
    }

    export function coalesce<T>(v: T) {
        function re<U> (f?: (x: T) => U) {
            if (f && (v != null)) return coalesce(f(v));
            else if (!f) return v;
            else return coalesce(null);
        };

        return <Coalesced<T>>re;
    }

    This basically checks everything type-wise, including the corner cases
    */

    export function tweetify(text: string): string
    {
        if (!text) return text;
        if (text.length > 140) return text.substr(0, 140) + '...';
        return text;
    }

    export function elt(name:string):HTMLElement
    {
        return document.getElementById(name);
    }

    export function span(cl: string, kw: any)
    {
        return createElement("span", cl, kw);
    }

    export function createElement(tag: string, cl: string = null, kw: any = null)
    {
        var elt:HTMLElement = document.createElement(tag);
        if (cl)
            elt.className = cl;
        if (typeof kw === "string")
            elt.appendChild(document.createTextNode(kw));
        else
            elt.appendChildren(kw);
        return elt;
    }

    export function text(s:string)
    {
        return document.createTextNode(s);
    }

    export function img(cl: string, src: string, alt: string) : HTMLImageElement
    {
        var elt: HTMLImageElement = <HTMLImageElement> document.createElement("img");
        if (cl)
            elt.className = cl;
        elt.src = src;
        elt.alt = alt;
        return elt;
    }

    export function spanDirAuto(txt: any): HTMLElement {
        return dirAuto(span('', txt));
    }

    export function dirAuto(el: HTMLElement): HTMLElement {
        if (el) {
            if (Browser.directionAuto)
                el.setAttribute('dir', 'auto');
            else {
                var t = el.innerText;
                var dir = /^[\s\.;:(+0-9]*[\u0591-\u07FF\uFB1D-\uFDFD\uFE70-\uFEFC]/i.test(t) ? "rtl" : "ltr";
                el.setAttribute('dir', dir);
            }
        }
        return el;
    }

    export function div(cl:string, ...children:any[]):HTMLElement {
        var elt = <HTMLDivElement>document.createElement("div");
        if (cl)
            elt.className = cl;
        elt.appendChildren(children.filter(e => e != undefined));
        return elt;
    }

    export function divId(id:string, cls:string, ...args:any[])
    {
        var d = div(cls, args);
        d.id = id;
        return d;
    }
}

module TDev.Debug {
    export function whenSet(f : ()=>void)
    {
        f();
    }
}

module TDev{

    export interface DataUrl
    {
        contentType: string; // mime type
        content: string; // base64 encoded data
    }

    export interface IGetName
    {
        getName():string;
    }

    export module HttpLog {
        export var enabled = false;
        var theLog = []
        var startTime = 0

        export function log(req:any) {
            req.timestamp = Date.now()
            if (/^[\{\[]/.test(req.contentText)) {
                req.contentJson = JSON.parse(req.contentText)
                delete req.contentText
            }
            req.method = req.method.toUpperCase()
            if (Util.startsWith(req.url, Cloud.getServiceUrl())) {
                req.url = req.url.slice(Cloud.getServiceUrl().length).replace(/.access_token=.*/, "")
            }
            if (!startTime) startTime = req.timestamp
            req.relativeTime = req.timestamp - startTime
            theLog.push(Util.jsonClone(req))
        }

        export function show() {
            theLog.forEach(e => console.log(e))
            return theLog
        }
    }

  export module Util {

    export var eventLogging = false;
    export var mouseLogging = false;
    export var cloudRun = false;
    export var cloudRunwHeapOpt = false;

    export function wordLength(s:string)
    {
        var max = 0
        s.split(/(\s+|-)/).forEach(w => max = Math.max(w.length, max))
        return max
    }

    export function timeSince(time:number)
    {
        var now = Util.now();
        time *= 1000;
        var diff = (now - time) / 1000;
        if (isNaN(diff)) return ""

        if (diff < -30) {
            diff = -diff;
            if (diff < 60) return lf("in a few seconds");
            if (diff < 2 * 60) return lf("in a minute");
            if (diff < 60 * 60) return lf("in {0} minute{0:s}", Math.floor(diff / 60));
            if (diff < 2 * 60 * 60) return lf("in an hour");
            if (diff < 60 * 60 * 24) return lf("in {0} hour{0:s}", Math.floor(diff / 60 / 60))
            if (diff < 60 * 60 * 24 * 30) return lf("in {0} day{0:s}", Math.floor(diff / 60 / 60 / 24))
            if (diff < 60 * 60 * 24 * 365) return lf("in {0} month{0:s}", Math.floor(diff / 60 / 60 / 24 / 30))
            return lf("in {0} year{0:s}", Math.floor(diff / 60 / 60 / 24 / 365))
        } else {
            if (diff < 0) return lf("now");
            if (diff < 10) return lf("a few seconds ago");
            if (diff < 60) return lf("{0} second{0:s} ago", Math.floor(diff))
            if (diff < 2 * 60) return lf("a minute ago");
            if (diff < 60 * 60) return lf("{0} minute{0:s} ago", Math.floor(diff / 60))
            if (diff < 2 * 60 * 60) return lf("an hour ago");
            if (diff < 60 * 60 * 24) return lf("{0} hour{0:s} ago", Math.floor(diff / 60 / 60))
            if (diff < 60 * 60 * 24 * 30) return lf("{0} day{0:s} ago", Math.floor(diff / 60 / 60 / 24))
            if (diff < 60 * 60 * 24 * 365) return lf("{0} month{0:s} ago", Math.floor(diff / 60 / 60 / 24 / 30))
            return lf("{0} year{0:s} ago", Math.floor(diff / 60 / 60 / 24 / 365))
        }
    }

    export function toAbsoluteUrl(url:string):string
    {
        if (/^http(s)?:/i.test(url))
            return url;

        var a = <HTMLAnchorElement> document.createElement('a');
        a.href = url;
        return a.href;
    }

    export function httpGetJsonAsync(filename:string) : Promise {
        return httpGetTextAsync(filename).then((s) => JSON.parse(s));
    }

    export function forEachResponseHeader(client: XMLHttpRequest, action: (name: string, value: string) => void ) {
        var headers = client.getAllResponseHeaders();
        if (headers) {
            headers = headers.replace(/^\s*/, ''); // observed in IE11 Private Mode, first header might have a spurious new line
            headers.split('\r\n').forEach(line => {
                var i = line.indexOf(': ');
                if (i > 0) action(line.substr(0, i), line.substr(i + 2));
            });
        }
    }
    export function decodeErrorMessage(errorMessage: string) {
        if (errorMessage) errorMessage = decodeURIComponent(errorMessage.replace(/[+]/g," "));
        return errorMessage;
    }
    function networkError(client: XMLHttpRequest, meth: string, filename: string) {
        var e = new Error(Util.fmt("cannot {0} '{1}'; status={2}", meth, filename, client.status));
        (<any>e).status = client.status;
        try {
          (<any>e).errorMessage = decodeErrorMessage(client.getResponseHeader("ErrorMessage")); // this doesn't seem to work because of CORS
        } catch(e) {}
        if ((<any>e).errorMessage == undefined) {
            (<any>e).errorMessage = client.responseText;
        }
        if (client.status == 404 || client.status == 403 || client.status == 409 || client.status == 400) {
            // these are not network connectivity problems
        } else {
            (<any>e).isNetworkError = 1;
        }
        return e;
    }

    export function httpGetTextAsync(filename:string) : Promise
    {
        return httpRequestAsync(toAbsoluteUrl(filename), "get", undefined)
    }

    // the cloud is giving 400 if the content type is set correctly for many APIs
    export function httpPostRealJsonAsync(url:string, body: any) : Promise {
        return httpRequestAsync(url, "POST", JSON.stringify(body), "application/json;charset=UTF-8").then((s) => s ? JSON.parse(s) : {});
    }

    export function parseJsonWithHack(s:string):any
    {
        if (!s) return {}

        try {
            return JSON.parse(s)
        } catch (e) {
            return JSON.parse(s.replace(/":NaN,"/g, '":0,"'))
        }
    }

    export function httpPostJsonAsync(url:string, body: any) : Promise {
        return httpRequestAsync(url, "POST", JSON.stringify(body),
            Cloud.lite ? "application/json;charset=UTF-8" : "text/plain;charset=UTF-8").then((s) => s ? parseJsonWithHack(s) : {});
    }

    export function httpPostTextAsync(url:string, body: string) : Promise {
        return httpRequestAsync(url, "POST", body);
    }

    export function httpDeleteAsync(url:string) : Promise {
        return httpRequestAsync(url, "DELETE");
    }

    export var httpRequestAsync = (url:string, method:string = "GET", body:string = undefined, contentType:string = null) : Promise => {
        // TODO: clean up dependency between cloud and Util
        if (Cloud.isOffline()) return Cloud.offlineErrorAsync();

        return new Promise((onSuccess: (v: any) => any, onError: (v: any) => any, onProgress: (v: any) => any) => {
            var client:XMLHttpRequest;
            var resolved = false
            function innerSuccess() {
                onSuccess(client.responseText);
            }
            function innerError() {
                onError(networkError(client, method, url));
            }
            function ready() {
                if (resolved) return // Safari/iOS likes to call this thing more than once

                if (client.readyState == 4) {
                    resolved = true
                    if (client.status == 200)
                        innerSuccess();
                    else
                        innerError();
                }
            }

            if (HttpLog.enabled)
                HttpLog.log({
                    url: url,
                    method: method,
                    contentText: body,
                    headers: contentType ? [{ name: "Content-Type", value: contentType }] : []
                })

            client = new XMLHttpRequest();
            client.onreadystatechange = ready;
            client.open(method, url);
            if (contentType)
                client.setRequestHeader("Content-Type", contentType)
            if (body === undefined)
                client.send();
            else
                client.send(body);
        });
    }

    export function betaCheck(cond:boolean, msg = "")
    {
        if (isBeta) check(cond, msg);
    }

    export function check(cond:boolean, msg = "")
    {
        try {
            if (!cond)
                throw Error("check failed: " + msg);
        } catch (e) {
            try {
                reportError("check", e, false);
            } catch (e) {
            }
        }
        return cond;
    }

    export function assert(cond:boolean, msg = "")
    {
        if (!cond)
            throw Error("assertion failed: " + msg);
    }

    export function assertCode(cond:boolean)
    {
        if (!cond) {
            var e = Error("assertion failed");
            (<any>e).includeSource = true;
            throw e;
        }
    }

    export function die()
    {
        throw Error("OOPS");
    }

    export function oops(msg:string, attachments:string[] = null)
    {
        var err = new Error("OOPS: " + msg);
        if (attachments) (<any>err).bugAttachments = attachments
        throw err;
    }

    export function abstract():any
    {
        oops("this method should have been overriden");
        return undefined;
    }

    export function initHtmlExtensions()
    {
        if (window.performance && window.performance.now)
            Util.perfNow = () => window.performance.now();
        else
            Util.perfNow = () => Date.now();

        Promise.errorHandler = Util.reportError;
        Promise.checkHandler = msg => Util.check(false, msg)

        var pelt = <Element> (<any>Element).prototype;

        pelt.removeAllChildren = function () {
            while (this.hasChildNodes()) {
                this.removeChild(this.firstChild);
            }
        };

        pelt.removeSelf = function () {
            if (!!this.parentNode)
                this.parentNode.removeChild(this);
        };

        pelt.setFlag = function (name:string, v:boolean) {
            this.setAttribute("data-" + name, v ? "yes" : "no");
        };

        pelt.getFlag = function (name:string) {
            var s = this.getAttribute("data-" + name);
            if (!s || s == "no") return false;
            else return true;
        };

        pelt.appendChildren = function (children) {
            var th = this;
            if (!children) return;
            if (Array.isArray(children))
                for (var i = 0; i < children.length; ++i)
                    th.appendChildren(children[i]);
            else if (typeof children === "string")
                th.appendChild(text(children));
            else
                th.appendChild(children);
        };

        pelt.setChildren = function (children) {
            this.removeAllChildren();
            this.appendChildren(children);
        };

        pelt.setChildrenIfNeeded = function (children) {
            if (Array.isArray(children) && children.length == this.childNodes.length) {
                var ok = true;
                for (var i = 0; i < children.length; ++i) {
                    if (this.childNodes[i] !== children[i]) {
                        ok = false;
                        break;
                    }
                }
                if (ok) return;
            }
            this.removeAllChildren();
            this.appendChildren(children);
        };

        pelt.setPosition = function (x, y, w, h) {
            var accentBox = this;
            accentBox.style.left = x + "px";
            accentBox.style.top = y + "px";
            if (w)
                accentBox.style.width = w + "px";
            if (h)
                accentBox.style.height = h + "px";
        };

        pelt.offsetPosition = function () {
            return {
                top: this.offsetTop,
                bot: this.offsetTop + this.offsetHeight,
                left: this.offsetLeft,
                right: this.offsetLeft + this.offsetWidth,
                width: this.offsetWidth,
                height: this.offsetHeight
            };
        };

        setupTimeoutZero();

        // for IE default is 10; property also exists in V8
       (<any> Error).stackTraceLimit = 64;


       // does HTML need to be sanitized?
       if (!!window.toStaticHTML && Browser.win8)
           Browser.setInnerHTML = (el, html) => {
                el.innerHTML = window.toStaticHTML(HTML.sanitizeHTML(html));
           }
       else
           Browser.setInnerHTML = (el, html) => {
                el.innerHTML = HTML.sanitizeHTML(html);
           }
    }

    var zeroTimeoutFunctions:any[];
    var zeroTimeoutName = "tdev-zero-timeout-message";

    function setZeroTimeout(cb:()=>void)
    {
        zeroTimeoutFunctions.push(() => {
            if (eventLogging)
                Util.log("executing zero timeout " + cb.toString());
            try {
                cb();
            } catch (err) {
                Util.reportError("zero-timeout-" + cb.toString(), err);
            }
        })
        window.postMessage(zeroTimeoutName, "*");
    }

    function setupTimeoutZero()
    {
        zeroTimeoutFunctions = [];
        window.addEventListener("message", (ev:any) => {
            if (ev.source == window && ev.data == zeroTimeoutName) {
                ev.stopPropagation();
                while (zeroTimeoutFunctions.length > 0) {
                    var f = zeroTimeoutFunctions.shift();
                    f();
                }
            }
        }, true);
    }

    export function initGenericExtensions()
    {
        var arr = Array.prototype;
        arr.peek = function () { return this.length === 0 ? undefined : this[this.length - 1]; }
        arr.collect = function (fn) {
            var res = [];
            for (var i = 0; i < this.length; ++i) {
                var tmp = fn(this[i]);
                for (var j = 0; j < tmp.length; ++j) {
                    res.push(tmp[j]);
                }
            }
            return res;
        };
        arr.pushRange = function (other) {
          for (var i = 0; i < other.length; ++i)
            this.push(other[i]);
        };

        /*
        arr.maxBy = function (f) {
            if (this.length == 0) return undefined;
            var max = f(this[0]);
            var maxE = this[0];
            for (var i = 1; i < this.length; ++i) {
                var v = f(this[i]);
                if (v > max) {
                    max = v;
                    maxE = this[i];
                }
            }
            return maxE;
        };
        arr.minBy = function (f) {
            if (this.length == 0) return undefined;
            var min = f(this[0]);
            var minE = this[0];
            for (var i = 1; i < this.length; ++i) {
                var v = f(this[i]);
                if (v < min) {
                    min = v;
                    minE = this[i];
                }
            }
            return minE;
        };
        */
        arr.max = function () { return Math.max.apply(null, this); }
        arr.min = function () { return Math.min.apply(null, this); }
        arr.spliceArr = function (f, t, a) {
            return Array.prototype.splice.apply(this, [f, t].concat(<any>a));
        }

        arr.stableSortObjs = function (cmp) {
            for (var i = 0; i < this.length; ++i)
                this[i].__stableSortIdx = i;
            this.sort((a, b) => {
                var r = cmp(a, b)
                if (r == 0) return a.__stableSortIdx - b.__stableSortIdx;
                else return r;
            })
            for (var i = 0; i < this.length; ++i)
                delete this[i].__stableSortIdx;
        }

        arr.stableSorted = function (cmp) {
            var idx = new Array(this.length)
            for (var i = 0; i < idx.length; ++i)
                idx[i] = i
            var t = this
            idx.sort((a, b) => {
                var r = cmp(t[a], t[b])
                if (r == 0) return a - b;
                else return r;
            })
            for (var i = 0; i < idx.length; ++i)
                idx[i] = t[idx[i]]
            return idx
        }

        arr.stableSort = function (cmp) {
            var idx = this.stableSorted(cmp)
            for (var i = 0; i < this.length; ++i)
                this[i] = idx[i]
        }

        arr.clear = function () {
            return this.splice(0, this.length);
        }

        var str = (<any> String).prototype;
        str.startsWith = function (str:string) { this.slice(0, str.length) == str; }
        str.endsWith = function (str:string) { this.slice(-str.length) == str; }

        // these are used in the compiler-generated code
        str.count = function() { return this.length; }
        str.at = function(idx:number) { return this.charAt(idx); }
    }

    export function intersectArraysVA<T>(arrays:T[][]):T[]
    {
        if (!arrays.length) return []

        arrays.sort((a, b) => a.length - b.length)
        var res = []
        arrays[0].forEach(e => {
            for (var i = 1; i < arrays.length; ++i)
                if (arrays[i].indexOf(e) < 0) return;
            res.push(e)
        })
        return res;
    }

    export function concatArraysVA<T>(arrays:T[][]):T[]
    {
        var res:T[] = []
        for (var i = 0; i < arrays.length; ++i) {
            var a = arrays[i]
            for (var j = 0; j < a.length; ++j)
                res.push(a[j])
        }
        return res;
    }

    export function concatArrays<T>(...arrays:T[][]):T[]
    {
        return concatArraysVA(arrays)
    }

    export function startsWith(s:string, pref:string)
    {
        if (!pref) return true;
        if (!s || s.length < pref.length) return false;
        return s.slice(0, pref.length) == pref;
    }

      export function stableSum(v: number[]): number {
          // Kahan summation algorithm
          var sum = 0.0;
          var c = 0.0; // A running compensation for lost low-order bits.
          for (var i = 0; i < v.length; i++) {
              var y = v[i] - c;
              var t = sum + y;
              c = (t - sum) - y;
              sum = t;
          }
          return sum;
      }

    export function initCscript()
    {
        Browser.cscript = true;

        var arr = Array.prototype;
        arr.map = function (f:any) {
            var res = [];
            for (var i = 0; i < this.length; ++i) {
                var tmp = f(this[i], i);
                res.push(tmp);
            }
            return res;
        };
        arr.forEach = function (f:any) {
            for (var i = 0; i < this.length; ++i) {
                f(this[i], i);
            }
        };
        arr.filter = function (f:any) {
            var res = [];
            for (var i = 0; i < this.length; ++i) {
                if (f(this[i], i))
                    res.push(this[i]);
            }
            return res;
        };

        var obj = <any>Object.prototype;
        obj.create = function (o:any) {
            function F() {}
            F.prototype = o;
            return new F();
        };

        Object.keys = function (o:any) {
            var res = []
            for (var k in o) {
                if (o.hasOwnProperty(k))
                    res.push(k)
            }
            return res;
        }
    }

    export function values<T>(o:StringMap<T>):T[]
    {
        return Object.keys(o).map(k => o[k])
    }

    export function userError(msg:string, pc = "", statusCode?:number) : any
    {
        var e = new Error(msg);
        (<any>e).programCounter = pc;
        (<any>e).isUserError = true;
        if (statusCode)
            (<any>e).statusCode = 500;
        throw e;
    }

    export function syntaxError(msg:string, declName:string) : any
    {
        var e = new Error(msg);
        (<any>e).syntaxErrorDeclName = declName;
        (<any>e).isUserError = true;
        throw e;
    }

    export function indexCheck(i: number, length: number): number
    {
        i = Math.floor(i);
        if (i < 0 || i >= length)
            Util.userError("index " + i + " out of bounds (collection size: " + length + ")");
        return i;
    }

    export function isOOB(i: number, length: number): boolean
    {
        i = Math.floor(i);
        return (i < 0 || i >= length);
    }

    export function notImplementedYet(s:IStackFrame, apiName:string) : any
    {
        if (s.rt.devMode)
            Util.userError(apiName + " not implemented yet");
        return undefined;
    }

    export function notSupported(s:IStackFrame, apiName:string) : any
    {
        if (s.rt.devMode)
            Util.userError(apiName + " is not supported in this version of TouchDevelop");
        return undefined;
    }

    export function guidGen()
    {
        function f() { return (Random.uint32()|0x10000).toString(16).slice(-4); }
        return f()+f()+"-"+f()+"-4"+f().slice(-3)+"-"+f()+"-"+f()+f()+f();
    }

    export function guidToAlpha(guid: string): string {
        var nohyphens = guid.replace(/-/g, 'z');
        var nonumbers = nohyphens.replace(/[0-9]/g, s => {
               var digit = s.charCodeAt(0) - ("0".charCodeAt(0)) + ("m".charCodeAt(0));
               return String.fromCharCode(digit)
        });
        return nonumbers;
    }

    export var colors = [
        "#F4BBFF", // electric lavender
        "#FF91A4", // salmon
        "#FF00FF", // magenta
        "#E3256B", // razzmatazz
        "#800080", // purple
        "#9955BB", // deep lilac
        "#A52A2A", // brown
        "#B7410E", // rust
        "#E25822", // flame
        "#FF0038", // carmine red
        "#FF2800", // red
        "#FF7518", // pumpkin
        "#FFA500", // orange
        "#FFDF00", // golden yellow
        "#FDEE00", // aureolin
        "#DAA520", // goldenrod
        "#EEDC82", // flax
        "#F5DEB3", // wheat
        "#008080", // teal
        "#00008B", // dark blue
        "#007FFF", // azure
        "#A1CAF1", // baby blue eyes
        "#90EE90", // light green
        "#008000", // green
        "#66FF00",  // bright green
        "#00CC99", // carribean green
        "#004B49", // deep jungle green
        "#85BB65", // dollar bill

        "#ffffff" // white
    ];

    export function svgGravatar(id : string) : string
    {
        var advance = (hash:number, v:number) => ((hash << 16) + (hash << 6) + v - hash) << 0;
        var hash = 0;
        for (var i = 0; i < id.length; ++i) {
            hash = advance(hash, id.charCodeAt(i))
        }

        var svg = "";
        for (var x = 0; x < 2; ++x) {
            for (var y = 0; y < 2; ++y) {
                hash = advance(hash, 0)
                var n = hash & 0xffff;
                var idx = n%(colors.length-1);
                if (n > 30000)
                    svg += Util.fmt("<circle fill='white' stroke-width='5' stroke='{0}' r='20.5' cx='{1}' cy='{2}'/>", colors[idx], 25+50*x, 25+50*y)
                else
                    svg += Util.fmt("<circle fill='{0}' r='23' cx='{1}' cy='{2}'/>", colors[idx], 25+50*x, 25+50*y)
            }
        }
        return SVG.svgBoilerPlate('0 0 100 100', svg);
    }


    // http://www.rise4fun.com/Bek/base64encode
    export function base64Encode(_input : string) : string
    {
        function _base64(_x : number) : number { return ((_x <= 0x19) ? (_x + 0x41) : ((_x <= 0x33) ? (_x + 0x47) : ((_x <= 0x3D) ? (_x - 0x4) : ((_x == 0x3E) ? 0x2B : 0x2F)))); };
        var result = new Array();
        var _q = 0x0;
        var _r = 0x0;
        for (var _i = 0; _i < _input.length; _i++) {
            var _x = _input.charCodeAt(_i);
            if ((_x > 0xFF)) {
                //throw { name: 'InvalidCharacter' };
                return undefined;
            }
            else if ((_q == 0x0)) {
                result.push(String.fromCharCode(_base64((_x >> 0x2))));
                _q = 0x1;
                _r = ((_x & 0x3) << 0x4);
            }
            else if ((_q == 0x1)) {
                result.push(String.fromCharCode(_base64((_r | (_x >> 0x4)))));
                _q = 0x2;
                _r = ((_x & 0xF) << 0x2);
            }
            else if ((_q == 0x2)) {
                result.push(String.fromCharCode(_base64((_r | (_x >> 0x6))), _base64((_x & 0x3F))));
                _q = 0x0;
                _r = 0x0;
            }
        }
        if ((_q == 0x1)) {
            result.push(String.fromCharCode(_base64(_r), 0x3D, 0x3D));
        }
        else if ((_q == 0x2)) {
            result.push(String.fromCharCode(_base64(_r), 0x3D));
        }
        return result.join('');
    }

    export function base64EncodeBytes(_input : number[]) : string
    {
        function _base64(_x : number) : number { return ((_x <= 0x19) ? (_x + 0x41) : ((_x <= 0x33) ? (_x + 0x47) : ((_x <= 0x3D) ? (_x - 0x4) : ((_x == 0x3E) ? 0x2B : 0x2F)))); };
        var result = new Array();
        var _q = 0x0;
        var _r = 0x0;
        for (var _i = 0; _i < _input.length; _i++) {
            var _x = _input[_i];
            if ((_x > 0xFF)) {
                //throw { name: 'InvalidCharacter' };
                return undefined;
            }
            else if ((_q == 0x0)) {
                result.push(String.fromCharCode(_base64((_x >> 0x2))));
                _q = 0x1;
                _r = ((_x & 0x3) << 0x4);
            }
            else if ((_q == 0x1)) {
                result.push(String.fromCharCode(_base64((_r | (_x >> 0x4)))));
                _q = 0x2;
                _r = ((_x & 0xF) << 0x2);
            }
            else if ((_q == 0x2)) {
                result.push(String.fromCharCode(_base64((_r | (_x >> 0x6))), _base64((_x & 0x3F))));
                _q = 0x0;
                _r = 0x0;
            }
        }
        if ((_q == 0x1)) {
            result.push(String.fromCharCode(_base64(_r), 0x3D, 0x3D));
        }
        else if ((_q == 0x2)) {
            result.push(String.fromCharCode(_base64(_r), 0x3D));
        }
        return result.join('');
    }

    // this will take lower 8 bits from each character
    export function stringToUint8Array(input:string)
    {
        var len = input.length;
        var res = new Uint8Array(len)
        for (var i = 0; i < len; ++i)
            res[i] = input.charCodeAt(i) & 0xff;
        return res;
    }

    export function uint8ArrayToString(input:Uint8Array)
    {
        var len = input.length;
        var res = ""
        for (var i = 0; i < len; ++i)
            res += String.fromCharCode(input[i]);
        return res;
    }

    //http://www.rise4fun.com/Bek/Cbl
    export function base64Decode(_input: string): string
    {
        function _D(_x : number) : number { return ((_x == 0x2F) ? 0x3F : ((_x == 0x2B) ? 0x3E : ((_x <= 0x39) ? (_x + 0x4) : ((_x <= 0x5A) ? (_x - 0x41) : (_x - 0x47))))); };

        function _Bits(m:number, n:number, c:number):number
        {
            var mask = 0;
            for (var i = 0; i <= (m - n); i++) { mask = (mask << 1) + 1; }
            return (c >> n) & mask;
        };
        var result = new Array();
        var _q0 = true;
        var _q1 = false;
        var _q2 = false;
        var _q3 = false;
        var _q4 = false;
        var _q5 = false;
        var _r = 0x0;
        var rx = new RegExp("^([A-Za-z0-9+/=])$");
        for (var _i = 0; _i < _input.length; _i++) {
            var _x = _input.charCodeAt(_i);
            if ((!String.fromCharCode(_x).match(rx) || ((_x == 0x3D) && (_q0 || _q1)) || ((_x == 0x3D) && !(_r == 0x0)) || (!(_x == 0x3D) && _q4) || _q5)) {
                // throw { name: 'InvalidInput' };
                return undefined;
            }
            else if (_q0) {
                _r = (_D(_x) << 0x2);
                _q0 = false;
                _q1 = true;
                _q2 = false;
                _q3 = false;
                _q4 = false;
                _q5 = false;
            }
            else if (_q1) {
                result.push(String.fromCharCode((_r | _Bits(0x5, 0x4, _D(_x)))));
                _r = ((_D(_x) & 0xF) << 0x4);
                _q0 = false;
                _q1 = false;
                _q2 = true;
                _q3 = false;
                _q4 = false;
                _q5 = false;
            }
            else if (_q2) {
                if ((_x == 0x3D)) {
                    _r = 0x0;
                    _q0 = false;
                    _q1 = false;
                    _q2 = false;
                    _q3 = false;
                    _q4 = true;
                    _q5 = false;
                }
                else {
                    result.push(String.fromCharCode((_r | _Bits(0x5, 0x2, _D(_x)))));
                    _r = ((_D(_x) & 0x3) << 0x6);
                    _q0 = false;
                    _q1 = false;
                    _q2 = false;
                    _q3 = true;
                    _q4 = false;
                    _q5 = false;
                }
            }
            else if (_q3) {
                if ((_x == 0x3D)) {
                    _r = 0x0;
                    _q0 = false;
                    _q1 = false;
                    _q2 = false;
                    _q3 = false;
                    _q4 = false;
                    _q5 = true;
                }
                else {
                    result.push(String.fromCharCode((_r | _D(_x))));
                    _r = 0x0;
                    _q0 = true;
                    _q1 = false;
                    _q2 = false;
                    _q3 = false;
                    _q4 = false;
                    _q5 = false;
                }
            }
            else if (_q4) {
                _r = 0x0;
                _q0 = false;
                _q1 = false;
                _q2 = false;
                _q3 = false;
                _q4 = false;
                _q5 = true;
            }
        }
        if (!(_q0 || _q5)) {
            //throw { name: 'InvalidInput' };
            return undefined;
        }
        return result.join('');
    }

    export function splitDataUrl(url: string) : DataUrl {
        if (!!url) {
            var match = /^data:([^;]+);base64,/.exec(url);
            if (!!match)
                return {
                    contentType: match[1],
                    content: url.substr(match[0].length)
                };
        }
        return null;
    }

    export function base64EncodeToBase64(url: string, mimeType: string): string {
        var prefix = 'data:' + mimeType + ';base64,';
        if (!!url && TDev.RT.String_.starts_with(url, prefix))
            return url.substr(prefix.length);
        return undefined;
    }

    export function decodeDataURL(url: string, mimeType: string = null): Uint8Array {
        if (!mimeType) {
            var m = url.match(/^data:([^;]+);base64,/);
            if (!m) return undefined;
            mimeType = m[1];
        }
        var prefix = 'data:' + mimeType + ';base64,';
        var binaryEncoded = url.substr(prefix.length);
        var binary = atob(binaryEncoded);
        var arrayBuffer = new ArrayBuffer(binary.length)
        var array = new Uint8Array(arrayBuffer);
        for (var i = 0; i < binary.length; i++)
            array[i] = binary.charCodeAt(i) & 0xff;
        return array;
    }

    function hex1(a : number){
        var h = a & 0xF;
        h = (h <= 9 ? h + 48 : h + 55);
        return h;
    };

    function hex2(a0 : number, a1 : number){
        var h = (a1 >> (4 * a0)) & 0xF;
        h = (h <= 9 ? h + 48 : h + 55);
        return h;
    };

    var entities : any = undefined;
    var entitiesRx : RegExp = undefined;

    // http://www.rise4fun.com/Bek/SGu
    export function htmlUnescape(_w : string) : string {
        if (!_w) return _w;

        if (!entities) {
            entities = {};
            //entities['quot']='"';
            //entities['apos']=''';
            //entities['amp']='&';
            //entities['lt']='<';
            //entities['gt']='>';
            entities['nbsp'] = ' ';
            entities['iexcl'] = '¡';
            entities['cent'] = '¢';
            entities['pound'] = '£';
            entities['curren'] = '¤';
            entities['yen'] = '¥';
            entities['brvbar'] = '¦';
            entities['sect'] = '§';
            entities['uml'] = '¨';
            entities['copy'] = '©';
            entities['ordf'] = 'ª';
            entities['laquo'] = '«';
            entities['not'] = '¬';
            entities['shy'] = '­';
            entities['reg'] = '®';
            entities['macr'] = '¯';
            entities['deg'] = '°';
            entities['plusmn'] = '±';
            entities['sup2'] = '²';
            entities['sup3'] = '³';
            entities['acute'] = '´';
            entities['micro'] = 'µ';
            entities['para'] = '¶';
            entities['middot'] = '·';
            entities['cedil'] = '¸';
            entities['sup1'] = '¹';
            entities['ordm'] = 'º';
            entities['raquo'] = '»';
            entities['frac14'] = '¼';
            entities['frac12'] = '½';
            entities['frac34'] = '¾';
            entities['iquest'] = '¿';
            entities['times'] = '×';
            entities['divide'] = '÷';
            entities['Agrave'] = 'À';
            entities['Aacute'] = 'Á';
            entities['Acirc'] = 'Â';
            entities['Atilde'] = 'Ã';
            entities['Auml'] = 'Ä';
            entities['Aring'] = 'Å';
            entities['AElig'] = 'Æ';
            entities['Ccedil'] = 'Ç';
            entities['Egrave'] = 'È';
            entities['Eacute'] = 'É';
            entities['Ecirc'] = 'Ê';
            entities['Euml'] = 'Ë';
            entities['Igrave'] = 'Ì';
            entities['Iacute'] = 'Í';
            entities['Icirc'] = 'Î';
            entities['Iuml'] = 'Ï';
            entities['ETH'] = 'Ð';
            entities['Ntilde'] = 'Ñ';
            entities['Ograve'] = 'Ò';
            entities['Oacute'] = 'Ó';
            entities['Ocirc'] = 'Ô';
            entities['Otilde'] = 'Õ';
            entities['Ouml'] = 'Ö';
            entities['Oslash'] = 'Ø';
            entities['Ugrave'] = 'Ù';
            entities['Uacute'] = 'Ú';
            entities['Ucirc'] = 'Û';
            entities['Uuml'] = 'Ü';
            entities['Yacute'] = 'Ý';
            entities['THORN'] = 'Þ';
            entities['szlig'] = 'ß';
            entities['agrave'] = 'à';
            entities['aacute'] = 'á';
            entities['acirc'] = 'â';
            entities['atilde'] = 'ã';
            entities['auml'] = 'ä';
            entities['aring'] = 'å';
            entities['aelig'] = 'æ';
            entities['ccedil'] = 'ç';
            entities['egrave'] = 'è';
            entities['eacute'] = 'é';
            entities['ecirc'] = 'ê';
            entities['euml'] = 'ë';
            entities['igrave'] = 'ì';
            entities['iacute'] = 'í';
            entities['icirc'] = 'î';
            entities['iuml'] = 'ï';
            entities['eth'] = 'ð';
            entities['ntilde'] = 'ñ';
            entities['ograve'] = 'ò';
            entities['oacute'] = 'ó';
            entities['ocirc'] = 'ô';
            entities['otilde'] = 'õ';
            entities['ouml'] = 'ö';
            entities['oslash'] = 'ø';
            entities['ugrave'] = 'ù';
            entities['uacute'] = 'ú';
            entities['ucirc'] = 'û';
            entities['uuml'] = 'ü';
            entities['yacute'] = 'ý';
            entities['thorn'] = 'þ';
            entities['yuml'] = 'ÿ';

            entitiesRx = new RegExp('&(' + Object.keys(entities).join('|') + ');', 'gim');
        }
        _w = _w.replace(entitiesRx, (m, args) => { return entities[args]; })

        function _IsDecDig(_x){return ((0x30 <= _x) && (_x <= 0x39));};
        function _F(_x,_y){return ((0xA * _x) + (_y - 0x30));};
        function _D1(_x){return ((_x % 0xA) + 0x30);};
        function _D2(_x){return (((_x / 0xA) % 0xA) + 0x30);};
        function _D3(_x){return (((_x / 0x64) % 0xA) + 0x30);};
        function _D4(_x){return (((_x / 0x3E8) % 0xA) + 0x30);};
        function _D5(_x){return (((_x / 0x2710) % 0xA) + 0x30);};
        function _IsHexDig(_x){return (((0x30 <= _x) && (_x <= 0x39)) || ((0x41 <= _x) && (_x <= 0x46)));};
        function _Fx(_x,_y){return ((_x << 0x4) | (_IsDecDig(_y) ? (_y - 0x30) : (_y - 0x37)));};
        function _H1(_x){return (_IsDec((_x & 0xF)) ? ((_x & 0xF) + 0x30) : ((_x & 0xF) + 0x37));};
        function _IsDec(_x){return ((0x0 <= _x) && (_x <= 0x9));};
        function _H2(_x){return (_IsDec(((_x >> 0x4) & 0xF)) ? (((_x >> 0x4) & 0xF) + 0x30) : (((_x >> 0x4) & 0xF) + 0x37));};
        function _H3(_x){return (_IsDec(((_x >> 0x8) & 0xF)) ? (((_x >> 0x8) & 0xF) + 0x30) : (((_x >> 0x8) & 0xF) + 0x37));};
        function _H4(_x){return (_IsDec(((_x >> 0xC) & 0xF)) ? (((_x >> 0xC) & 0xF) + 0x30) : (((_x >> 0xC) & 0xF) + 0x37));};
        var result = new Array();
        var _q = 0x0;
        var _d = 0x0;
        for (var _i = 0; _i < _w.length; _i++) {
        var _c = _w.charCodeAt(_i);
        if (((_q == 0x0) && (_c == 0x26))){
        _q = 0x26;
        }
        else if ((_q == 0x0)){
        result.push(String.fromCharCode(_c));
        }
        else if (((_q == 0x26) && (_c == 0x23))){
        _q = 0x23;
        }
        else if (((_q == 0x26) && (_c == 0x61))){
        _q = 0x61;
        }
        else if (((_q == 0x26) && (_c == 0x71))){
        _q = 0x71;
        }
        else if (((_q == 0x26) && (_c == 0x6C))){
        _q = 0x6C;
        }
        else if (((_q == 0x26) && (_c == 0x67))){
        _q = 0x67;
        }
        else if (((_q == 0x26) && (_c == 0x26))){
        result.push(String.fromCharCode(0x26));
        }
        else if ((_q == 0x26)){
        result.push(String.fromCharCode(0x26, _c));
        _q = 0x0;
        }
        else if (((_q == 0x23) && (_c == 0x58))){
        _q = 0x58;
        }
        else if (((_q == 0x23) && (_c == 0x26))){
        result.push(String.fromCharCode(0x26, 0x23));
        _q = 0x26;
        }
        else if (((_q == 0x23) && _IsDecDig(_c))){
        _q = 0x1;
        _d = (_c - 0x30);
        }
        else if ((_q == 0x23)){
        result.push(String.fromCharCode(0x26, 0x23, _c));
        _q = 0x0;
        }
        else if (((_q == 0x1) && _IsDecDig(_c))){
        _q = 0x2;
        _d = _F(_d,_c);
        }
        else if (((_q == 0x1) && (_c == 0x3B))){
        result.push(String.fromCharCode(_d));
        _q = 0x0;
        _d = 0x0;
        }
        else if (((_q == 0x1) && (_c == 0x26))){
        result.push(String.fromCharCode(0x26, 0x23, _D1(_d)));
        _q = 0x26;
        _d = 0x0;
        }
        else if ((_q == 0x1)){
        result.push(String.fromCharCode(0x26, 0x23, _D1(_d), _c));
        _q = 0x0;
        _d = 0x0;
        }
        else if (((_q == 0x2) && _IsDecDig(_c))){
        _q = 0x3;
        _d = _F(_d,_c);
        }
        else if (((_q == 0x2) && (_c == 0x3B))){
        result.push(String.fromCharCode(_d));
        _q = 0x0;
        _d = 0x0;
        }
        else if (((_q == 0x2) && (_c == 0x26))){
        result.push(String.fromCharCode(0x26, 0x23, _D2(_d), _D1(_d)));
        _q = 0x26;
        _d = 0x0;
        }
        else if ((_q == 0x2)){
        result.push(String.fromCharCode(0x26, 0x23, _D2(_d), _D1(_d), _c));
        _q = 0x0;
        _d = 0x0;
        }
        else if (((_q == 0x3) && _IsDecDig(_c))){
        _q = 0x4;
        _d = _F(_d,_c);
        }
        else if (((_q == 0x3) && (_c == 0x3B))){
        result.push(String.fromCharCode(_d));
        _q = 0x0;
        _d = 0x0;
        }
        else if (((_q == 0x3) && (_c == 0x26))){
        result.push(String.fromCharCode(0x26, 0x23, _D3(_d), _D2(_d), _D1(_d)));
        _q = 0x26;
        _d = 0x0;
        }
        else if ((_q == 0x3)){
        result.push(String.fromCharCode(0x26, 0x23, _D3(_d), _D2(_d), _D1(_d), _c));
        _q = 0x0;
        _d = 0x0;
        }
        else if (((_q == 0x4) && _IsDecDig(_c) && (_F(_d,_c) <= 0xFFFF))){
        _q = 0x5;
        _d = _F(_d,_c);
        }
        else if (((_q == 0x4) && (_c == 0x3B))){
        result.push(String.fromCharCode(_d));
        _q = 0x0;
        _d = 0x0;
        }
        else if (((_q == 0x4) && (_c == 0x26))){
        result.push(String.fromCharCode(0x26, 0x23, _D4(_d), _D3(_d), _D2(_d), _D1(_d)));
        _q = 0x26;
        _d = 0x0;
        }
        else if ((_q == 0x4)){
        result.push(String.fromCharCode(0x26, 0x23, _D4(_d), _D3(_d), _D2(_d), _D1(_d), _c));
        _q = 0x0;
        _d = 0x0;
        }
        else if (((_q == 0x5) && (_c == 0x3B))){
        result.push(String.fromCharCode(_d));
        _q = 0x0;
        _d = 0x0;
        }
        else if (((_q == 0x5) && (_c == 0x26))){
        result.push(String.fromCharCode(0x26, 0x23, _D5(_d), _D4(_d), _D3(_d), _D2(_d), _D1(_d)));
        _q = 0x26;
        _d = 0x0;
        }
        else if ((_q == 0x5)){
        result.push(String.fromCharCode(0x26, 0x23, _D5(_d), _D4(_d), _D3(_d), _D2(_d), _D1(_d), _c));
        _q = 0x0;
        _d = 0x0;
        }
        else if (((_q == 0x58) && (_c == 0x26))){
        result.push(String.fromCharCode(0x26, 0x23, 0x58));
        _q = 0x26;
        }
        else if (((_q == 0x58) && _IsHexDig(_c))){
        _q = 0x6;
        _d = _Fx(0x0,_c);
        }
        else if ((_q == 0x58)){
        _q = 0x0;
        result.push(String.fromCharCode(0x26, 0x23, 0x58, _c));
        _d = 0x0;
        }
        else if (((_q == 0x6) && _IsHexDig(_c))){
        _q = 0x7;
        _d = _Fx(_d,_c);
        }
        else if (((_q == 0x6) && (_c == 0x3B))){
        result.push(String.fromCharCode(_d));
        _q = 0x0;
        _d = 0x0;
        }
        else if (((_q == 0x6) && (_c == 0x26))){
        result.push(String.fromCharCode(0x26, 0x23, 0x58, _H1(_d)));
        _q = 0x26;
        _d = 0x0;
        }
        else if ((_q == 0x6)){
        result.push(String.fromCharCode(0x26, 0x23, 0x58, _H1(_d), _c));
        _q = 0x0;
        _d = 0x0;
        }
        else if (((_q == 0x7) && _IsHexDig(_c))){
        _q = 0x8;
        _d = _Fx(_d,_c);
        }
        else if (((_q == 0x7) && (_c == 0x3B))){
        result.push(String.fromCharCode(_d));
        _q = 0x0;
        _d = 0x0;
        }
        else if (((_q == 0x7) && (_c == 0x26))){
        result.push(String.fromCharCode(0x26, 0x23, 0x58, _H2(_d), _H1(_d)));
        _q = 0x26;
        _d = 0x0;
        }
        else if ((_q == 0x7)){
        result.push(String.fromCharCode(0x26, 0x23, 0x58, _H2(_d), _H1(_d), _c));
        _q = 0x0;
        _d = 0x0;
        }
        else if (((_q == 0x8) && _IsHexDig(_c))){
        _q = 0x9;
        _d = _Fx(_d,_c);
        }
        else if (((_q == 0x8) && (_c == 0x3B))){
        result.push(String.fromCharCode(_d));
        _q = 0x0;
        _d = 0x0;
        }
        else if (((_q == 0x8) && (_c == 0x26))){
        result.push(String.fromCharCode(0x26, 0x23, 0x58, _H3(_d), _H2(_d), _H1(_d)));
        _q = 0x26;
        _d = 0x0;
        }
        else if ((_q == 0x8)){
        result.push(String.fromCharCode(0x26, 0x23, 0x58, _H3(_d), _H2(_d), _H1(_d), _c));
        _q = 0x0;
        _d = 0x0;
        }
        else if (((_q == 0x9) && (_c == 0x3B))){
        result.push(String.fromCharCode(_d));
        _q = 0x0;
        _d = 0x0;
        }
        else if (((_q == 0x9) && (_c == 0x26))){
        result.push(String.fromCharCode(0x26, 0x23, 0x58, _H4(_d), _H3(_d), _H2(_d), _H1(_d)));
        _q = 0x26;
        _d = 0x0;
        }
        else if ((_q == 0x9)){
        result.push(String.fromCharCode(0x26, 0x23, 0x58, _H4(_d), _H3(_d), _H2(_d), _H1(_d), _c));
        _q = 0x0;
        _d = 0x0;
        }
        else if (((_q == 0x6C) && (_c == 0x74))){
        _q = 0x4C;
        }
        else if (((_q == 0x6C) && (_c == 0x26))){
        result.push(String.fromCharCode(0x26, 0x6C));
        _q = 0x26;
        }
        else if ((_q == 0x6C)){
        result.push(String.fromCharCode(0x26, 0x6C, _c));
        _q = 0x0;
        }
        else if (((_q == 0x4C) && (_c == 0x3B))){
        result.push(String.fromCharCode(0x3C));
        _q = 0x0;
        }
        else if (((_q == 0x4C) && (_c == 0x26))){
        result.push(String.fromCharCode(0x26, 0x6C, 0x74));
        _q = 0x26;
        }
        else if ((_q == 0x4C)){
        result.push(String.fromCharCode(0x26, 0x6C, 0x74, _c));
        _q = 0x0;
        }
        else if (((_q == 0x67) && (_c == 0x74))){
        _q = 0x47;
        }
        else if (((_q == 0x67) && (_c == 0x26))){
        result.push(String.fromCharCode(0x26, 0x67));
        _q = 0x26;
        }
        else if ((_q == 0x67)){
        result.push(String.fromCharCode(0x26, 0x67, _c));
        _q = 0x0;
        }
        else if (((_q == 0x47) && (_c == 0x3B))){
        result.push(String.fromCharCode(0x3E));
        _q = 0x0;
        }
        else if (((_q == 0x47) && (_c == 0x26))){
        result.push(String.fromCharCode(0x26, 0x67, 0x74));
        _q = 0x26;
        }
        else if ((_q == 0x47)){
        result.push(String.fromCharCode(0x26, 0x67, 0x74, _c));
        _q = 0x0;
        }
        else if (((_q == 0x71) && (_c == 0x75))){
        _q = 0x75;
        }
        else if (((_q == 0x71) && (_c == 0x26))){
        result.push(String.fromCharCode(0x26, 0x71));
        _q = 0x26;
        }
        else if ((_q == 0x71)){
        result.push(String.fromCharCode(0x26, 0x71, _c));
        _q = 0x0;
        }
        else if (((_q == 0x75) && (_c == 0x6F))){
        _q = 0x6F;
        }
        else if (((_q == 0x75) && (_c == 0x26))){
        result.push(String.fromCharCode(0x26, 0x71, 0x75));
        _q = 0x26;
        }
        else if ((_q == 0x75)){
        result.push(String.fromCharCode(0x26, 0x71, 0x75, _c));
        _q = 0x0;
        }
        else if (((_q == 0x6F) && (_c == 0x74))){
        _q = 0x74;
        }
        else if (((_q == 0x6F) && (_c == 0x26))){
        result.push(String.fromCharCode(0x26, 0x71, 0x75, 0x6F));
        _q = 0x26;
        }
        else if ((_q == 0x6F)){
        result.push(String.fromCharCode(0x26, 0x71, 0x75, 0x6F, _c));
        _q = 0x0;
        }
        else if (((_q == 0x74) && (_c == 0x3B))){
        result.push(String.fromCharCode(0x22));
        _q = 0x0;
        }
        else if (((_q == 0x74) && (_c == 0x26))){
        result.push(String.fromCharCode(0x26, 0x71, 0x75, 0x6F, 0x74));
        _q = 0x26;
        }
        else if ((_q == 0x74)){
        result.push(String.fromCharCode(0x26, 0x71, 0x75, 0x6F, 0x74, _c));
        _q = 0x0;
        }
        else if (((_q == 0x61) && (_c == 0x6D))){
        _q = 0x6D;
        }
        else if (((_q == 0x61) && (_c == 0x70))){
        _q = 0x50;
        }
        else if (((_q == 0x61) && (_c == 0x26))){
        result.push(String.fromCharCode(0x26, 0x61));
        _q = 0x26;
        }
        else if ((_q == 0x61)){
        result.push(String.fromCharCode(0x26, 0x61, _c));
        _q = 0x0;
        }
        else if (((_q == 0x6D) && (_c == 0x70))){
        _q = 0x70;
        }
        else if (((_q == 0x6D) && (_c == 0x26))){
        result.push(String.fromCharCode(0x26, 0x61, 0x6D));
        _q = 0x26;
        }
        else if ((_q == 0x6D)){
        result.push(String.fromCharCode(0x26, 0x61, 0x6D, _c));
        _q = 0x0;
        }
        else if (((_q == 0x70) && (_c == 0x3B))){
        result.push(String.fromCharCode(0x26));
        _q = 0x0;
        }
        else if (((_q == 0x70) && (_c == 0x26))){
        result.push(String.fromCharCode(0x26, 0x61, 0x6D, 0x70));
        _q = 0x26;
        }
        else if ((_q == 0x70)){
        result.push(String.fromCharCode(0x26, 0x61, 0x6D, 0x70, _c));
        _q = 0x0;
        }
        else if (((_q == 0x50) && (_c == 0x6F))){
        _q = 0x4F;
        }
        else if (((_q == 0x50) && (_c == 0x26))){
        result.push(String.fromCharCode(0x26, 0x61, 0x70));
        _q = 0x26;
        }
        else if ((_q == 0x50)){
        result.push(String.fromCharCode(0x26, 0x61, 0x70, _c));
        _q = 0x0;
        }
        else if (((_q == 0x4F) && (_c == 0x73))){
        _q = 0x53;
        }
        else if (((_q == 0x4F) && (_c == 0x26))){
        result.push(String.fromCharCode(0x26, 0x61, 0x70, 0x6F));
        _q = 0x26;
        }
        else if ((_q == 0x4F)){
        result.push(String.fromCharCode(0x26, 0x61, 0x70, 0x6F, _c));
        _q = 0x0;
        }
        else if (((_q == 0x53) && (_c == 0x3B))){
        result.push(String.fromCharCode(0x27));
        _q = 0x0;
        }
        else if (((_q == 0x53) && (_c == 0x26))){
        result.push(String.fromCharCode(0x26, 0x61, 0x70, 0x6F, 0x73));
        _q = 0x26;
        }
        else if ((_q == 0x53)){
        result.push(String.fromCharCode(0x26, 0x61, 0x70, 0x6F, 0x73, _c));
        _q = 0x0;
        }
        else if (true){
        _q = 0x0;
        _d = 0x0;
        }
        }
        if ((_q == 0x0)){
        }
        else if ((_q == 0x26)){
        result.push(String.fromCharCode(0x26));
        }
        else if ((_q == 0x23)){
        result.push(String.fromCharCode(0x26, 0x23));
        }
        else if ((_q == 0x58)){
        result.push(String.fromCharCode(0x26, 0x23, 0x58));
        }
        else if ((_q == 0x1)){
        result.push(String.fromCharCode(0x26, 0x23, _D1(_d)));
        }
        else if ((_q == 0x2)){
        result.push(String.fromCharCode(0x26, 0x23, _D2(_d), _D1(_d)));
        }
        else if ((_q == 0x3)){
        result.push(String.fromCharCode(0x26, 0x23, _D3(_d), _D2(_d), _D1(_d)));
        }
        else if ((_q == 0x4)){
        result.push(String.fromCharCode(0x26, 0x23, _D4(_d), _D3(_d), _D2(_d), _D1(_d)));
        }
        else if ((_q == 0x5)){
        result.push(String.fromCharCode(0x26, 0x23, _D5(_d), _D4(_d), _D3(_d), _D2(_d), _D1(_d)));
        }
        else if ((_q == 0x6)){
        result.push(String.fromCharCode(0x26, 0x23, 0x58, _H1(_d)));
        }
        else if ((_q == 0x7)){
        result.push(String.fromCharCode(0x26, 0x23, 0x58, _H2(_d), _H1(_d)));
        }
        else if ((_q == 0x8)){
        result.push(String.fromCharCode(0x26, 0x23, 0x58, _H3(_d), _H2(_d), _H1(_d)));
        }
        else if ((_q == 0x9)){
        result.push(String.fromCharCode(0x26, 0x23, 0x58, _H4(_d), _H3(_d), _H2(_d), _H1(_d)));
        }
        else if ((_q == 0x6C)){
        result.push(String.fromCharCode(0x26, 0x6C));
        }
        else if ((_q == 0x4C)){
        result.push(String.fromCharCode(0x26, 0x6C, 0x74));
        }
        else if ((_q == 0x67)){
        result.push(String.fromCharCode(0x26, 0x67));
        }
        else if ((_q == 0x47)){
        result.push(String.fromCharCode(0x26, 0x67, 0x74));
        }
        else if ((_q == 0x71)){
        result.push(String.fromCharCode(0x26, 0x71));
        }
        else if ((_q == 0x75)){
        result.push(String.fromCharCode(0x26, 0x71, 0x75));
        }
        else if ((_q == 0x6F)){
        result.push(String.fromCharCode(0x26, 0x71, 0x75, 0x6F));
        }
        else if ((_q == 0x74)){
        result.push(String.fromCharCode(0x26, 0x71, 0x75, 0x6F, 0x74));
        }
        else if ((_q == 0x61)){
        result.push(String.fromCharCode(0x26, 0x61));
        }
        else if ((_q == 0x6D)){
        result.push(String.fromCharCode(0x26, 0x61, 0x6D));
        }
        else if ((_q == 0x70)){
        result.push(String.fromCharCode(0x26, 0x61, 0x6D, 0x70));
        }
        else if ((_q == 0x50)){
        result.push(String.fromCharCode(0x26, 0x61, 0x70));
        }
        else if ((_q == 0x4F)){
        result.push(String.fromCharCode(0x26, 0x61, 0x70, 0x6F));
        }
        else if ((_q == 0x53)){
        result.push(String.fromCharCode(0x26, 0x61, 0x70, 0x6F, 0x73));
        }
        else if (true){
        }
        return result.join('');
    }


    // http://www.rise4fun.com/Bek/xfL
    export function htmlEscape(_input: string)
    {
        if (!_input) return _input; // null, undefined, empty string test

        var result = new Array();
        var _HS = false;
        var _r = 0x0;
        for (var _i = 0; _i < _input.length; _i++) {
            var _x = _input.charCodeAt(_i);
            if (!_HS) {
                if (String.fromCharCode(_x).match(/^([\x20\x21\x23-\x25\x28-\x3B\x3D\x3F-\x7E\xA1-\xAC\xAE-\u036F])$/)) {
                    result.push(String.fromCharCode(_x));
                }
                else {
                    if ((_x == 0x22)) {
                        result.push(String.fromCharCode(0x26, 0x71, 0x75, 0x6F, 0x74, 0x3B));
                    }
                    else {
                        if ((_x == 0x26)) {
                            result.push(String.fromCharCode(0x26, 0x61, 0x6D, 0x70, 0x3B));
                        }
                        else {
                            if ((_x == 0x3C)) {
                                result.push(String.fromCharCode(0x26, 0x6C, 0x74, 0x3B));
                            }
                            else {
                                if ((_x == 0x3E)) {
                                    result.push(String.fromCharCode(0x26, 0x67, 0x74, 0x3B));
                                }
                                else {
                                    if ((_x < 0x10)) {
                                        result.push(String.fromCharCode(0x26, 0x23, 0x58, hex2(0x0, _x), 0x3B));
                                    }
                                    else {
                                        if ((_x < 0x100)) {
                                            result.push(String.fromCharCode(0x26, 0x23, 0x58, hex2(0x1, _x), hex2(0x0, _x), 0x3B));
                                        }
                                        else {
                                            if ((_x < 0x1000)) {
                                                result.push(String.fromCharCode(0x26, 0x23, 0x58, hex2(0x2, _x), hex2(0x1, _x), hex2(0x0, _x), 0x3B));
                                            }
                                            else {
                                                if (((0xD800 <= _x) && (_x <= 0xDBFF))) {
                                                    if ((((_x >> 0x6) & 0xF) == 0xF)) {
                                                        result.push(String.fromCharCode(0x26, 0x23, 0x58, 0x31, 0x30, hex2(0x0, (_x >> 0x2))));
                                                        _HS = true;
                                                        _r = (_x & 0x3);
                                                    }
                                                    else {
                                                        result.push(String.fromCharCode(0x26, 0x23, 0x58, hex2(0x0, ((_x >> 0x6) + 0x1)), hex2(0x0, (_x >> 0x2))));
                                                        _HS = true;
                                                        _r = (_x & 0x3);
                                                    }
                                                }
                                                else {
                                                    if ((((0xDC00 <= _x) && (_x <= 0xDFFF)) || (_x == 0xFFFF) || (_x == 0xFFFE))) {
                                                        //throw { name: 'InvalidInput' };
                                                        return undefined;
                                                    }
                                                    else {
                                                        result.push(String.fromCharCode(0x26, 0x23, 0x58, hex2(0x3, _x), hex2(0x2, _x), hex2(0x1, _x), hex2(0x0, _x), 0x3B));
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
            else if (true) {
                if (((0xDC00 <= _x) && (_x <= 0xDFFF))) {
                    result.push(String.fromCharCode(hex1(((_r << 0x2) | ((_x >> 0x8) & 0x3))), hex2(0x1, _x), hex2(0x0, _x), 0x3B));
                    _HS = false;
                    _r = 0x0;
                }
                else {
                    return undefined;
                    // throw { name: 'InvalidInput' };
                }
            }
        }
        if (_HS) {
            return undefined;
            // throw { name: 'InvalidInput' };
        }
        return result.join('');
    }

    export function formatText(s:string) { return htmlEscape(s).replace(/&#XA;/g, "<br/>\n").replace(/ /g, "&#x2005;"); }

      export function selectOnFocusTextArea(elt: HTMLTextAreaElement) {
          elt.onfocus = () => {
              elt.select();
          };
          elt.onmouseup = () => false;
      }

    export function selectOnFocus(elt: HTMLInputElement) {
        elt.onfocus = () => {
            elt.select();
        };
        elt.onmouseup = () => false;
    }

    export function setKeyboardFocusTextArea(elt:HTMLTextAreaElement, selectAll = false)
    {
        elt.focus();
        try {
            elt.setSelectionRange(selectAll ? 0 : elt.value.length, elt.value.length);
        } catch (e) { }
    }

    export function setKeyboardFocus(elt:HTMLInputElement, selectAll = false)
    {
        elt.focus();
        if (elt.type === "text" || elt.type === "number")
            try {
                elt.setSelectionRange(selectAll ? 0 : elt.value.length, elt.value.length);
            } catch (e) { }
    }

    export function hideKeyboard()
    {
        var active:any = document.activeElement;


            /*
            var inp = HTML.mkTextInput("text");
            elt("root").appendChild(inp);
            Util.setTimeout(1, () => {
                inp.focus();
                Util.setTimeout(1, () => {
                    inp.style.display = "none";
                    Util.setTimeout(1, () => {
                        inp.removeSelf();
                    });
                });
            });
            */

        if (active && active.blur) {
            if (Browser.isAndroid) {
                active.readonly = "readonly";
                active.disabled = "true";
                Util.setTimeout(10, () => {
                    active.blur();
                    active.removeAttribute("readonly");
                    active.removeAttribute("disabled");
                });
            } else {
                active.blur();
            }
        }
    }

    export function offsetIn(elt:HTMLElement, par:HTMLElement):Position
    {
        var x = 0;
        var y = 0;
        while (!!elt) {
            if (elt == par) break;
            x += elt.offsetLeft + elt.clientLeft - elt.scrollLeft;
            y += elt.offsetTop + elt.clientTop - elt.scrollTop;
            elt = <HTMLElement>elt.offsetParent;
        }

        return {x:x, y:y};
    }

    export function children(...elts:HTMLElement[]) : HTMLElement[]
    {
        var res:HTMLElement[] = [];
        elts.forEach(function (elt) {
            var cn = elt.children;
            for (var i = 0; i < cn.length; ++i)
                res.push(<HTMLElement>cn[i]);
        });
        return res;
    }

    export function childNodes(...elts:HTMLElement[]) : HTMLElement[]
    {
        var res:HTMLElement[] = [];
        elts.forEach(function (elt) {
            var cn = elt.childNodes;
            for (var i = 0; i < cn.length; ++i)
                res.push(<HTMLElement>cn[i]);
        });
        return res;
    }


    var transformPropertyName = "";
    var perspectivePropertyName = "";
    export function setTransform(e:HTMLElement, t:string, origin:string = undefined, perspective : string = undefined)
    {
        var style:any = e.style;

        if (!transformPropertyName) {
            if (style["transform"] !== undefined)
                transformPropertyName = "transform";
            else
                ["Webkit", "ms", "Moz", "O"].forEach(function (pref) {
                    var tt = pref + "Transform";
                    if (!transformPropertyName && style[tt] !== undefined) {
                        transformPropertyName = tt;
                        perspectivePropertyName = pref + "Perspective";
                    }
                });
            if (!transformPropertyName) {
                transformPropertyName = "transform";
                perspectivePropertyName = "perspective";
            }
        }

        if (origin !== undefined)
            style[transformPropertyName + "Origin"] = origin;
        if (perspective !== undefined)
            style[perspectivePropertyName] = perspective;
        style[transformPropertyName] = t;
    }

    export function id(e: any): any { return e; }
    export function doNothing(...pars : any[]): any { };

    var logMsgs:LogMessage[] = [];
    export var logSz = 200;
    var logIdx = -1;

    export function time(msg:string, f:()=>void, dontDoIt = false)
    {
        if (dontDoIt)
            f();
        else {
            var ts = TDev.RT.Perf.start(msg);
            f();
            TDev.RT.Perf.stop(ts);
        }
    }

    export function now() { return Date.now(); }
    export var startupTime = now();
    export var perfNow:()=>number;

    export var externalLog:(s:string)=>void = null;

    export var remoteLogEndpoint = ""

    var remoteLogConnection = null
    var remoteLogConnecting = false

    function handleRemoteLog(m:string)
    {
        if (!remoteLogEndpoint) return

        if (!remoteLogConnecting) {
            remoteLogConnecting = true
            var conn = new WebSocket(remoteLogEndpoint)
            conn.onopen = () => {
                console.log("Remote log connection opened")
                remoteLogConnection = conn
                getLogMsgs().forEach(m => conn.send(m.elapsed + ": " + m.msg))
            }
            conn.onclose = () => {
                console.log("Remote log connection closed")
                remoteLogConnection = null
            }
            conn.onerror = function () {
                console.log("Remote log connection error")
                remoteLogConnection = null
            }
        }

        if (remoteLogConnection)
            remoteLogConnection.send(m)
    }

    export function log(f:string, ...args:any[])
    {
        var msg = fmt_va(f, args);
        var n = now()
        var diff = (now() - startupTime) / 1000;
        var m = fmt_va("{0:f04.3}: {1}", [diff, msg]);

        var lm:LogMessage = {
            timestamp: n,
            level:
                /^log:/.test(f) ? 6 :
                /^crash/i.test(f) ? 3
                    : 7,
            category: "tdlog",
            msg: msg
        }

        if (logIdx >= 0) {
            logMsgs[logIdx++] = lm;
            if (logIdx >= logSz) logIdx = 0;
        } else {
            logMsgs.push(lm);
            if (logMsgs.length >= logSz)
                logIdx = 0;
        }

        if (!/^(DBG|TICK): /.test(f))
            Ticker.tick(Ticks.dbgLogEvent, msg.slice(0, 200));

        if (Browser.cscript) {
          //  WScript.Echo("LOG: " + m);
        } else if (Browser.useConsoleLog) {
            //if (/^TICK/.test(f))
            if (isWebWorker)
                console.log("WORK-TD-LOG: " + m);
            else
                console.log("TD-LOG: " + m);
        }

        if (Browser.logToHost)
            Util.externalNotify("LOG: " + m)

        handleRemoteLog(m)
        if (externalLog) externalLog(m);

        if (!Browser.loadingDone && /debugMsg/.test(document.URL)) {
            var e = elt("statusMsg");
            if (e)
                Browser.setInnerHTML(e, Util.formatText(m) + "</br>" + e.innerHTML)
        }

    }

    export var dbglog = log; // these are not supposed to be checked in

    export function elapsed(start: number, end: number) {
        return ("00000000" + (end - start)).slice(-7).replace(/(\d\d\d)$/, (k) => "." + k)
    }

    export function getLogMsgs():LogMessage[]
    {
        var i = logIdx;
        var res = [];
        var wrapped = false;
        if (i < 0) i = 0;
        var n = now()
        while (i < logMsgs.length) {
            var c = Util.clone(logMsgs[i])
            c.elapsed = Util.elapsed(c.timestamp, n);
            res.push(c);
            if (++i == logMsgs.length && !wrapped) {
                wrapped = true;
                i = 0;
            }
            if (wrapped && i >= logIdx) break;
        }
        return res;
    }

    export function externalNotify(msg: string) {
        var w = <any>window;
        // the standard "if (w.external.notify)" doesn't work
        if (w && w.external && "notify" in w.external)
            w.external.notify(msg);
    }

    export function showLog(ld:HTMLElement)
    {
        Util.log("show log");

        var res = getLogMsgs().map((m) => "<div class='logMsg'>" + Util.formatText(m.msg) + "</div>\n");
        res.reverse();
        Browser.setInnerHTML(ld, res.join(""));
    }

    export function jsonEq(a:any, b:any) : boolean
    {
        switch (typeof a) {
        case "string":
        case "number":
        case "boolean":
            return a === b;
        }

        if (a === b) return true;
        if (a === null || a === undefined ||
            b === null || b === undefined) return false;

        if (Array.isArray(a)) {
            if (Array.isArray(b)) {
                if (a.length != b.length) return false;
                for (var i = 0; i < a.length; ++i)
                    if (!jsonEq(a[i], b[i])) return false;
                return true;
            } else return false;
        }

        for (var p in b)
            if (b.hasOwnProperty(p) && !a.hasOwnProperty(p))
                return false;

        for (var p in a) {
            if (a.hasOwnProperty(p)) {
                if (!b.hasOwnProperty(p)) return false;
                if (!jsonEq(a[p], b[p])) return false;
            }
        }

        return true;
    }

    export function range(from:number, length:number)
    {
        var res = <number[]>[];
        for (var i = 0; i < length; ++i) res.push(i + from);
        return res;
    }

    export function iterHtml(e:HTMLElement, f:(n:HTMLElement)=>boolean)
    {
        if (!(e instanceof HTMLElement)) return;
        if (f(e)) return;
        for (var i = 0; i < e.childNodes.length; ++i) {
            var node = <HTMLElement> e.childNodes[i];
            iterHtml(node, f)
        }
    }

    export function highlightWords(e:Node, terms:string[], keepCache = false)
    {
        if (e instanceof Text) {
            var d = (<Text> e).data;
            var lc = d.toLowerCase();
            var res = [];
            var prev = 0;
            for (var i = 0; i < lc.length; ++i) {
                for (var j = 0; j < terms.length; ++j) {
                    if (terms[j].length == 0) continue;
                    if (lc.slice(i, i + terms[j].length) == terms[j]) {
                        var t0 = document.createTextNode(d.slice(prev, i));
                        var t1 = span("highlight", d.slice(i, i + terms[j].length));
                        res.push(t0);
                        res.push(t1);
                        i += terms[j].length;
                        prev = i;
                        i--;
                        break;
                    }
                }
            }
            if (prev == 0) return;

            res.push(document.createTextNode(d.slice(prev, d.length)));
            var par = <any>e.parentNode;
            if (keepCache && !par.originalCache) par.originalCache = par.innerHTML;
            e.parentNode.replaceChild(span(null, res), e);

        } else if (e instanceof HTMLElement) {
            var ee = <any>e;
            if (keepCache && ee.originalCache) ee.innerHTML = ee.originalCache;
            for (var i = 0; i < e.childNodes.length; ++i) {
                var node = <HTMLElement> e.childNodes[i];
                highlightWords(node, terms);
            }
        }
    }

    export function animationProperty()
    {
        if (Browser.isWebkit) return "webkitAnimation";
        if (Browser.isGecko) return "MozAnimation";
        return "animation";
    }

    export function cancelAnim(elt:HTMLElement)
    {
        elt.style[animationProperty()] = "";
    }

    export function coreAnim(name:string, duration:number, elt:HTMLElement, andThen = undefined) : HTMLElement
    {
        var evtName = Browser.isWebkit ? "webkitAnimationEnd" : "animationend";
        var propName = animationProperty();
        var oldOpacity = elt.style.opacity;

        var callbackExecuted = false;

        var f:()=>void = Util.catchErrors("animationEnd " + name, function() {
            if (callbackExecuted) return;
            callbackExecuted = true;
            window.clearTimeout(id);
            elt.removeEventListener(evtName, f);
            elt.style[propName] = "";
            elt.style.opacity = oldOpacity;
            if (andThen) andThen();
        });

        var id = Util.setTimeout(duration + 300, f);

        elt.addEventListener(evtName, f);
        var remove = () => { elt.removeSelf(); }
        if (/^fadeOut/.test(name)) {
            elt.style.opacity = "0";
            if (!andThen) andThen = remove;
        }
        elt.style[propName] = name + " " + duration + "ms";
        // elt.style[propName + "Duration"] = duration + "ms";

        return elt;
    }

    export function delayButton(b:HTMLElement, time = 3000) : HTMLElement
    {
        b.style.opacity = "0";
        b.style.visibility = "hidden";
        Util.setTimeout(time, () => {
            b.style.visibility = "";
            Util.fadeIn(b, () => {
                b.style.opacity = '1';
                Util.setTimeout(2000, () => Util.coreAnim("blinkLocation", 4000, b));
            })
        });
        return b;
    }

    export function animAsync(name:string, duration:number, elt:HTMLElement) {
        return new Promise((onSuccess: (v: any) => any, onError: (v: any) => any, onProgress: (v: any) => any) => {
            coreAnim(name, duration, elt, () => onSuccess(null));
        });
    }

    var easeOut = " cubic-bezier(0.1, 0.9, 0.2, 1)";
    export function showPopup(elt:HTMLElement, andThen = undefined) { return coreAnim("showPopup" + easeOut, 300, elt, andThen); }
    export function hidePopup(elt:HTMLElement, andThen = undefined) { return coreAnim("fadeOut", 100, elt, andThen); }
    export function fadeIn(elt:HTMLElement, andThen = undefined) { return coreAnim("fadeIn", 150, elt, andThen); }
    export function fadeOut(elt:HTMLElement, andThen = undefined) { return coreAnim("fadeOut", 150, elt, andThen); }
    export function showLeftPanel(elt:HTMLElement, andThen = undefined) { return coreAnim("showLeftPanel" + easeOut, 250, elt, andThen); }
    export function showRightPanel(elt:HTMLElement, andThen = undefined) { return coreAnim("showRightPanel" + easeOut, 250, elt, andThen); }
    export function showBottomPanel(elt:HTMLElement, andThen = undefined) { return coreAnim("showBottomPanel" + easeOut, 150, elt, andThen); }
    /*
    export function hidePanel(elt:HTMLElement, andThen = undefined) { return coreAnim("hidePanel", elt, andThen); }
    */

    /*
    export function hidePanel(elt:HTMLElement, andThen = undefined)
    {
        if (Browser.win8) {
            WinJS.UI.executeAnimation(
                elt,
                [<any> {
                    property: "-ms-transform",
                    delay: 0,
                    duration: 150,
                    timing: "cubic-bezier(0.8, 0.1, 0.9, 0.5)",
                    from: "translate(0px, 0px)",
                    to: "translate(100px, 0px)"
                },
                {
                    property: "opacity",
                    delay: 0,
                    duration: 150,
                    timing: "linear",
                    from: 1,
                    to: 0
                }]).done(function() { if (andThen) andThen(); });
        } else {
            if (andThen) andThen();
        }
    }
    */


    function stopEvent()
    {
        var e = <KeyboardEvent>this;
        // e.keyCode = 0;
        e.stopPropagation();
        e.preventDefault();
        return false;
    }

    function geckoKeyName(code:number)
    {
        switch (code) {
        case 0x0D: return "Enter";
        case 0x21: return "PageUp";
        case 0x22: return "PageDown";
        case 0x23: return "End";
        case 0x24: return "Home";
        case 0x25: return "Left";
        case 0x26: return "Up";
        case 0x27: return "Right";
        case 0x28: return "Down";
        case 0x2D: return "Insert";
        case 0x2E: return "Del";
        case 0x08: return "Backspace";
        case 0x11: return "Control";
        default: return null;
        }
    }

    export function normalizeKeyEvent(e:KeyboardEvent)
    {
        var keyName = e.key;

        if ((<any>e).keyIdentifier)
            keyName = (<any>e).keyIdentifier;
        switch (e.keyCode) {
        case 27: keyName = "Esc"; break;
        case 9: keyName = "Tab"; break;
        case 32: keyName = "Space"; break;
        default:
            if (Browser.isGecko && geckoKeyName(e.keyCode)) {
                keyName = geckoKeyName(e.keyCode);
            } else {
                var s = String.fromCharCode(e.keyCode);
                if (/^[A-Z0-9]$/.test(s))
                    keyName = s;
            }
            break;
        }

        switch (keyName) {
        case "U+007F":
            // Chrome seems to send this keyIdentifier for the [.] key
            if (!e.charCode) keyName = "Del";
            break;
        case "U+0008": keyName = "Backspace"; break;
        case "U+0020": keyName = "Space"; break;
        case "Insert": keyName = "Ins"; break;
        case "PageDown": keyName = "PgDn"; break;
        case "PageUp": keyName = "PgUp"; break;
        }

        if (e.altKey) keyName = "Alt-" + keyName;
        if (e.ctrlKey) keyName = "Ctrl-" + keyName;
        if (e.shiftKey) keyName = "Shift-" + keyName;
        e.keyName = keyName;

        // HTML.showProgressNotification("key: " +keyName);

        var srcElt = (<any> e.srcElement);
        if (!srcElt) srcElt = (<any>e).originalTarget;
        try {
            var srcType = !srcElt ? "" : srcElt.type;
            e.fromTextBox = e.fromTextBox || srcType == "text" || srcType == "textarea" || srcElt.className == "wall-textbox";
            e.fromTextArea = e.fromTextArea || srcType == "textarea";
        } catch (e) {
            // firefox doesn't like access .type on certain elements (throws access denied exceptions)
        }
        if (srcElt && e.fromTextBox) LayoutMgr.instance.FlagTypingActivity(srcElt.getAttribute("id"));

        e.stopIt = stopEvent;
    }

    export function keyEventString(e:KeyboardEvent, additionalChars = "")
    {
        if (!e.fromTextBox) {
            var s = String.fromCharCode(e.charCode);
            if (/^[A-Za-z0-9]$/.test(s) || additionalChars.indexOf(s) >= 0) return s;
        }
        return "";
    }

    export interface HTMLElementWithValue extends HTMLElement
    {
        value:string;
    }

    export function onInputChange(e:HTMLElementWithValue, f:(s:string)=>void)
    {
        var current = e.value
        e.addEventListener("input", () => {
            if (e.value != current) {
                current = e.value
                f(current)
            }
        })
    }

    export function boundTo(low:number, x:number, high:number)
    {
        if (x < low) x = low;
        if (x > high) x = high;
        return x;
    }

    export function between(low:number, x:number, high:number) { return boundTo(low, x, high) }
    export function intBetween(low:number, x:number, high:number) { return Math.round(boundTo(low, x, high)) }

    export function fmt_va(f:string, args:any[]) : string
    {
        if (args.length == 0) return f;
        return (<any>f).replace(/\{([0-9]+)(\:[^\}]+)?\}/g, function (s:string, n:string, spec:string) : string {
            var v = args[parseInt(n)];
            var r = "";
            var fmtMatch = /^:f(\d*)\.(\d+)/.exec(spec);
            if (fmtMatch) {
                var precision = parseInt(fmtMatch[2])
                var len = parseInt(fmtMatch[1]) || 0
                var fillChar = /^0/.test(fmtMatch[1]) ? "0" : " ";
                var num = (<number>v).toFixed(precision)
                if (len > 0 && precision > 0) len += precision + 1;
                if (len > 0) {
                    while (num.length < len) {
                        num = fillChar + num;
                    }
                }
                r = num;
            } else if (spec == ":x") {
                r = "0x" + v.toString(16);
            } else if (v === undefined) r = "(undef)";
            else if (v === null) r = "(null)";
            else if (v.toString) r = v.toString();
            else r = v + "";
            if (spec == ":a") {
                if (/^\s*[euioah]/.test(r.toLowerCase()))
                    r = "an " + r;
                else if (/^\s*[bcdfgjklmnpqrstvwxz]/.test(r.toLowerCase()))
                    r = "a " + r;
            } else if (spec == ":s") {
                if (v == 1) r = ""
                else r = "s"
            } else if (spec == ":q") {
                r = Util.htmlEscape(r);
            } else if (spec == ":jq") {
                r = Util.jsStringQuote(r);
            } else if (spec == ":uri") {
                r = encodeURIComponent(r);
            } else if (spec == ":url") {
                r = encodeURI(r);
            } else if (spec == ":%") {
                r = (v * 100).toFixed(1).toString() + '%';
            }
            return r;
        });
    }

    export function fmt(f:string, ...args:any[]) { return fmt_va(f, args); }


    export function ensureVisible(node:HTMLElement, parent:HTMLElement = undefined, margin:number = undefined)
    {

        if (!parent) {
            parent = <HTMLElement>node.parentNode;
            if(!parent) return;
            while (!(<any>parent).scrollEnabled) {
                parent = <HTMLElement>parent.parentNode;
                if (!parent) return;
            }
        }

        if (!margin) margin = 5;
        if (margin < 1) margin = parent.clientHeight * margin;
        var pos = offsetIn(node, parent);
        var y0 = pos.y;
        var y1 = pos.y + node.offsetHeight;
        var target = parent.scrollTop;
        if (target < y1 - parent.clientHeight + margin)
            target = y1 - parent.clientHeight + margin;
        if (target > y0 - margin)
            target = y0 - margin;
        parent.scrollTop = target;
        // HACK HACK HACK: for some reason, the scrollTop is reset some time after this thing is called.
        if (Browser.isMobileSafari)
            Util.setTimeout(500, () => { parent.scrollTop = target; });
    }

    export function flatClone(obj:any)
    {
        var r:any = {}
        Object.keys(obj).forEach((k) => { r[k] = obj[k] })
        return r;
    }

    export function sendErrorReport(bug:BugReport, willReload = false)
    {
        try {
            var bb = Util.flatClone(bug);
            bb.eventTrace = "";
            Util.log(Ticker.bugReportToString(bb))
        } catch (e) {
            debugger;
        }
        if (willReload) {
            try {
                window.localStorage["storedBug"] = JSON.stringify(bug);
                return;
            } catch (e) {
                debugger;
            }
        }

        Cloud.postBugReportAsync(bug).done(() => { }, e => undefined); // ignore errors
    }

    var recentBugReports:any = {}

    export function sendPendingBugReports()
    {
        var b = window.localStorage["storedBug"];
        if (b) {
            window.localStorage["storedBug"] = "";
            try {
                sendErrorReport(JSON.parse(b));
            } catch (e) {
                debugger;
            }
        }
    }

    export var navigatingAway = false;
    export function navigateInWindow(url:string)
    {
        window.location.href = url;
        navigatingAway = true;
    }

    export function isError(err: any, f: (any) => boolean) {
        return err && (f(err) || (typeof err == "object" && Object.keys(err).some(k => err[k] && f(err[k]))));
    }
    export function getErrorInfo(err: any) {
        var res = undefined;
        if (err) {
            if (err.constructor && err.code != undefined) res = err.constructor.name + " code " + err.code + ": " + err.message;
            else if (err.name) res = err.name;
            else if (typeof err == "object")
                Object.keys(err).forEach(k => {
                    if (res == undefined) res = getErrorInfo(err[k]);
                });
            if (err.databaseOrigin) res += "; origin: " + err.databaseOrigin;
        }
        return res;
    }
    export function reportError(ctx:string, err:any, fatal = true)
    {
        if (Runtime.handleUserError(err))
            return;

        var bug = Ticker.mkBugReport(err, ctx);

        // the time check is to prevent infinite reload loop
        var willReload = fatal;
        var lastBugReload = window.localStorage["lastBugReload"];
        if (lastBugReload && now() - lastBugReload < 30 * 1000)
            willReload = false;

        if (dbg)
            willReload = false;

        if (isError(err, e => e.isNetworkError)) {
            HTML.showProgressNotification(lf("we're having network connectivity problems..."));
            willReload = false;
            return;
        }

        var hashBug = Ticker.bugReportForHash(bug);
        var lastTime = recentBugReports[hashBug];
        if (lastTime && now() - lastTime < 5 * 60 * 1000) {
            // sent recently, don't send again
        } else {
            sendErrorReport(bug, willReload);
            if (Object.keys(recentBugReports).length > 30)
                recentBugReports = {}
            recentBugReports[hashBug] = now();
        }

        if (isError(err, e => e.isDatabaseError)) {
            // TSBUG: remove following useless line to trip typechecker
            if (false) { var m = ModalDialog.info("", ""); }
            if (!willReload) {
                Util.navigateInWindow((<any>window).errorUrl + "#storage," + encodeURIComponent(getErrorInfo(err)));
                return;
            }
        }

        if (willReload && !Storage.showTemporaryWarning()) {
            try {
                var msg = bug.exceptionMessage;
                if (!msg) msg = "OOPS";
                window.localStorage["lastExceptionMessage"] = msg;
                window.localStorage["lastBugReload"] = now();
                window.location.reload();
                return;
            } catch (e) {
                debugger;
            }
        }

        try {
            if (fatal || dbg) {
                var msgText = Util.formatText(dbg ? bug.exceptionMessage : "Something went wrong; please reload the webpage.");
                var dmsg = div("errorNotification");
                Browser.setInnerHTML(dmsg, msgText);
                elt("root").appendChild(dmsg);
                Util.setTimeout(5000, function() { dmsg.removeSelf() });
            }
        } catch (e) {
            // well, if that doesn't work, what can we do...
            debugger;
        }
    }

    export function catchErrors(ctx:string, f:any) { return function() {
        if (eventLogging)
            Util.log("catching errors in " + ctx);
        try {
            return f.apply(this, arguments);
        } catch (e) {
            if (Browser.isHeadless)
                Promise.errorHandler(ctx, e)
            else
                reportError(ctx, e);
            return undefined;
        }
    }; }

    export function setTimeout(ms:number, cb:()=>void):number
    {
        if (ms == 0 && zeroTimeoutFunctions) {
            setZeroTimeout(cb);
            return -1;
        } else {
            return window.setTimeout(function () {
                if (eventLogging)
                    Util.log("executing timeout " + ms + " / " + cb.toString());
                try {
                    cb();
                } catch (err) {
                    Util.reportError("timeout-" + ms + "-" + cb.toString(), err);
                }
            }, ms);
        }
    }


    var FNV1_prime_32 = 16777619;
    var FNV1_basis_32 = 2166136261 | 0;

    // known as Encoding.Unicode in CLR
    export function toUTF16LE(str:string)
    {
        var res = "";
        if (!str) return res;
        for (var i = 0; i < str.length; ++i) {
            var code = str.charCodeAt(i);
            res += String.fromCharCode(code & 0xff)
            res += String.fromCharCode((code >> 8) & 0xff);
        }
        return res;

    }

    export function toUTF8(str:string)
    {
        var res = "";
        if (!str) return res;
        for (var i = 0; i < str.length; ++i) {
            var code = str.charCodeAt(i);
            if (code <= 0x7f) res += str.charAt(i);
            else if (code <= 0x7ff) {
                res += String.fromCharCode(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
            } else {
                if (0xd800 <= code && code <= 0xdbff) {
                    var next = str.charCodeAt(++i);
                    if (!isNaN(next))
                        code = 0x10000 + ((code - 0xd800) << 10) + (next - 0xdc00);
                }

                if (code <= 0xffff)
                    res += String.fromCharCode(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
                else
                    res += String.fromCharCode(0xf0 | (code >> 18), 0x80 | ((code >> 12) & 0x3f), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
            }

        }
        return res;
    }

    // aaaarg... the stupid JS doesn't have integer multiplication
    // for explanations see:
    // http://stackoverflow.com/questions/3428136/javascript-integer-math-incorrect-results (second answer)
    // (but the code below doesn't come from there; I wrote it myself)
    export function intMult(a:number, b:number) {
        return (((a & 0xffff) * (b >>> 16) + (b & 0xffff) * (a >>> 16)) << 16) + ((a & 0xffff) * (b & 0xffff));
    }

    export function getStableHashCodeBytes(bytes:string)
    {
        var hc = FNV1_basis_32;
        if (bytes) {
            for (var i = 0; i < bytes.length; ++i)
                hc = intMult(hc, FNV1_prime_32) ^ bytes.charCodeAt(i);
        }
        return hc;
    }

    export function getStableHashCode(str:string)
    {
        return getStableHashCodeBytes(toUTF16LE(str));
    }


    export function isntNull(o:any) { return o !== null && o !== undefined; }

    export function capitalizeFirst(s:string) { return s.slice(0, 1).toUpperCase() + s.slice(1); }

    export function tagify(name:string) {
        return name.replace(/([^a-zA-Z0-9])([a-z])/g, (m, a, b) => a + b.toUpperCase()).replace(/[^a-zA-Z0-9]/g, "");
    }
    export function toHashTag(name:string) { return "#" + tagify(name); }

    export function getHashTags(s:string)
    {
        var r:string[] = []
        s.replace(/#(\w+)/g, (m, h) => { r.push(h); return "" })
        return r
    }

    export function jsStringQuote(s:string)
    {
        return s.replace(/[^A-Z0-9a-z .!?_\-$]/g,
                (c) => {
                    var h = c.charCodeAt(0).toString(16);
                    return "\\u" + "0000".substr(0, 4 - h.length) + h;
            });
    }

    export function jsStringLiteral(s:string)
    {
        return "\"" + jsStringQuote(s) + "\"";
    }

    export function canvasToBlob(canvas: HTMLCanvasElement, blobName : string = null) : Blob {
        if ((<any>canvas).mozGetAsFile) {
            var blob = (<any>canvas).mozGetAsFile(blobName || 'img.png', 'image/png');
            return blob;
        }
        if (canvas.msToBlob) return canvas.msToBlob();

        var dataUrl = canvas.toDataURL('image/png');
        var bytes = decodeDataURL(dataUrl, 'image/png');
        // try creating blog using constructor
        try {
            var blob = new (<any>Blob)([bytes], { type: 'image/png' });
            return blob;
        }
        catch (e) {
            return null;
        }
    }


    export function stringCompare(an:string, bn:string)
    {
        if (an == bn) return 0;
        if (an < bn) return -1;
        return 1;
    }

    export function nameCompare(a:IGetName, b:IGetName)
    {
        return stringCompare(a.getName(), b.getName());
    }

    export function jsonClone<T>(obj:T):T
    {
        return <T>JSON.parse(JSON.stringify(obj))
    }

    export function clone<T>(obj:T):T
    {
        var r = new (<any>obj).constructor
        for (var k in obj) {
            if (obj.hasOwnProperty(k))
                r[k] = obj[k]
        }
        return <T>r
    }


    export function chopArray<T>(arr:T[], chunkSize:number):T[][]
    {
        var res:T[][] = []
        for (var i = 0; i < arr.length; i += chunkSize)
            res.push(arr.slice(i, i + chunkSize))
        return res
    }

    export function unique<T>(arr: T[], f:(t:T)=>string) : T[]
    {
        var v : T[] = [];
        var r: { [index: string]: any; } = {}
        arr.forEach(e => {
            var k = f(e)
            if (!r.hasOwnProperty(k)) {
             r[k] = null;
             v.push(e);
            }
        })
        return v;
    }

    export function groupBy<T>(arr:T[], f:(t:T)=>string) : StringMap<T[]>
    {
        var r: StringMap<T[]> = {}
        arr.forEach(e => {
            var k = f(e)
            if (!r.hasOwnProperty(k)) r[k] = []
            r[k].push(e)
        })
        return r
    }

    export function toDictionary<T>(arr:T[], f:(t:T)=>string) : StringMap<T>
    {
        var r: StringMap<T> = {}
        arr.forEach(e => { r[f(e)] = e })
        return r
    }

    export interface ArrayLike<T> {
        [index: number]: T;
        length: number;
    }

    export function toArray<T>(a:ArrayLike<T>):T[]
    {
        var r:T[] = []
        for (var i = 0; i < a.length; ++i)
            r.push(a[i])
        return r
    }

    export function indexOfMatching<T>(arr:T[], f:(t:T) => boolean):number
    {
        for (var i = 0; i < arr.length; ++i)
            if (f(arr[i])) return i;
        return -1;
    }

    export function memoize<T>(f:(s:string)=>T) : (s:string)=>T
    {
        var cache:any = {}
        return (s:string) => {
            if (cache.hasOwnProperty(s)) return cache[s]
            return (cache[s] = f(s))
        }
    }

    export function memoizeHashed<A,B>(h:(e:A)=>string, f:(e:A)=>B) : (e:A)=>B
    {
        var cache:any = {}
        return (e:A) => {
            var s = h(e)
            if (cache.hasOwnProperty(s)) return cache[s]
            return (cache[s] = f(e))
        }
    }

    export function even<T>(arr:T[]) : T[]
    {
        var r = []
        for (var i = 0; i < arr.length; i += 2)
            r.push(arr[i])
        return r
    }

    export function odd<T>(arr:T[]) : T[]
    {
        var r = []
        for (var i = 1; i < arr.length; i += 2)
            r.push(arr[i])
        return r
    }

    export function repeatString(s:string, n:number)
    {
        return Array(n + 1).join(s)
    }

    export function numberToStringNoE(v:number)
    {
        var s = v.toString()
        var m = /^([+\-])?(\d)(\.(\d*))?[eE]([+\-])?(\d+)$/.exec(s)
        if (!m) return s

        var sign = m[1] || ""
        var pref = m[2]
        var suff = m[4] || ""
        var esign = m[5]
        var exp = parseInt(m[6])
        if (esign == "-") {
            return sign + "0." + repeatString("0", exp - 1) + pref + suff
        } else {
            var add = exp - suff.length
            if (add < 0) {
                return sign + pref + suff.slice(0, exp) + "." + suff.slice(add)
            } else {
                return sign + pref + suff + repeatString("0", add)
            }
        }
    }


    export function msSubtract(a:MultiSet, b:MultiSet) : MultiSet {
      var r:MultiSet = {}
      Object.keys(a).forEach(function(k) {
        var d = 0
        if (b.hasOwnProperty(k)) d = b[k]
        var n = a[k] - d
        if (n > 0) r[k] = n
      })
      return r
    }

    export function msAdd(a:MultiSet, b:MultiSet) : MultiSet {
      var r:MultiSet = {}
      Object.keys(a).forEach(function(k) {
        var d = 0
        if (b.hasOwnProperty(k)) d = b[k]
        r[k] = a[k] + d
      })
      Object.keys(b).forEach(function(k) {
        if (!a.hasOwnProperty(k))
          r[k] = b[k]
      })
      return r
    }

    export function setAdd(a:StringSet, b:StringSet) : StringSet
    {
        var r:StringSet = {}
        Object.keys(a).forEach(v => r[v] = true)
        Object.keys(b).forEach(v => r[v] = true)
        return r
    }

    export function setAddTo(a:StringSet, b:StringSet) : void
    {
        Object.keys(b).forEach(v => a[v] = true)
    }

    export function setIntersect(a:StringSet, b:StringSet) : StringSet
    {
        var r:StringSet = {}
        Object.keys(a).forEach(v => { if (b.hasOwnProperty(v)) r[v] = true })
        return r
    }

    export var onSetHash: (s:string, replace:boolean) => void;
    export var onGoBack: () => void;

    export function setHash(s:string, replace = false)
    {
        s = s.replace(/^#/, "")
        Util.setTimeout(1, () => onSetHash(s, replace))
        //window.location.hash = s;
    }

    export function goBack()
    {
        onGoBack();
    }


    export var translationDebug = false
    export var translations:StringMap<string> = {
        // testing
        // "run": "uruchom", "my scripts": "moje skrypty", "debug": "odpluskwiaj", "undo": "cofnij",
    }

    export function enableTranslationTracking(local = false)
    {
        translationTracker = {}
        if (local) {
            translationScheduled = true
            localTranslationTracking = true
        }
    }

    export function dumpTranslationFreqs()
    {
        var lst = Object.keys(translationTracker)
        lst.sort((a, b) => translationTracker[b] - translationTracker[a])
        var words = 0
        var str = ""
        lst.forEach(e => {
            words += e.split(/\s+/).filter(s => !!s).length
            str += JSON.stringify(e).slice(1).replace(/"$/, "") + "\n"
        })
        str = "# words: " + words + ", texts: " + lst.length + "\n" + str
        return str
    }

    var translationTracker:StringMap<number>;
    var lastTranslationUpload = 0
    var translationScheduled = false
    var translationSending = false
    export var translationToken = "";
    export var localTranslationTracking = false;

    function scheduleTranslations()
    {
        translationScheduled = true
        Util.setTimeout(10000, () => {
            translationScheduled = false
            translationSending = true
            var toSend = translationTracker
            translationTracker = {}
            Util.httpPostRealJsonAsync("https://touchdeveloptranslator.azurewebsites.net/api/Svc/submit",
                {
                    freqs: toSend,
                    lang: getTranslationLanguage(),
                    token: translationToken,
                }).done(resp => {
                    translationSending = false
                    if (Object.keys(translationTracker).length > 0 && !translationScheduled)
                        scheduleTranslations()
                }, err => {})
        })
    }

    export function _localize(msg:string, account:boolean)
    {
        if (translationTracker && account) {
            //if (!translationTracker.hasOwnProperty(msg))
            //    Util.log("LOCAL: " + msg)
            translationTracker[msg] = (translationTracker[msg] || 0) + 1
            if (!translationScheduled && !translationSending)
                scheduleTranslations()
        }

        if (translations.hasOwnProperty(msg))
            return translations[msg]
        return msg
    }

    export var _languageData: (l:string) => void;

    var translationLang: string = null;

    export function seeTranslatedText(value?: boolean): boolean {
        if (value !== undefined) {
            if (!value) window.localStorage.setItem("skipTranslatedText", "1");
            else window.localStorage.removeItem("skipTranslatedText");
            return !value;
        } else {
          return !window.localStorage.getItem("skipTranslatedText");
        }
    }

    export function getTranslationLanguage()
    {
        return translationLang;
    }

    export var sForPlural = true;

    export function loadUserLanguageSetting() {
        var ln = getUserLanguageSetting();
        if (ln) {
            setTranslationLangauge(ln); return true;
        }
        else return false;
    }
    export function getUserLanguageSetting() {
        return window.localStorage.getItem("userLocale") || "";
    }
    export function setUserLanguageSetting(culture: string, reloadIfNeeded = false) {
          var locale = culture || "";
          var currentLocale = getUserLanguageSetting();
          if (currentLocale != locale) {
              window.localStorage.setItem("userLocale", locale);
              seeTranslatedText(true);
              if(reloadIfNeeded)
                  Util.setTimeout(500, () => window.location.reload());
          }
    }

    export function setTranslationLangauge(ln:string)
    {
        ln = ln.slice(0, 2)
        if (ln == "zh") ln = "zh-CHS"

        sForPlural = ln == "en" || ln == "es" || ln == "pt" || ln == "de" || ln == "fr";

        translationLang = ln
        translations = {}
        if (_languageData)
            _languageData(ln)
    }

    export function setTranslationTable(tr:any)
    {
        translations = tr
    }

    export function _setLangaugeArray(keys:string[], trans:string[])
    {
        translations = {}
        trans.forEach((t, i) => {
            if (t)
                translations[keys[i]] = t
        })
    }
  }

  var numStatic = 1
  export function lf_static(format:string, account:boolean):string
  {
      //if (account)
      //    if (numStatic++ % 1000 == 0) debugger;

      if (Util.translationDebug)
          return Util._localize(format, account).toUpperCase()
      else
          return Util._localize(format, account);
  }

  export function lf_va(format:string, args:any[]):string
  {
      var lfmt = Util._localize(format, true)

      if (!Util.sForPlural && lfmt != format && /\d:s\}/.test(lfmt)) {
          lfmt = lfmt.replace(/\{\d+:s\}/g, "")
      }

      if (Util.translationDebug)
          return Util.fmt_va(lfmt, args).toUpperCase()
      else
          return Util.fmt_va(lfmt, args);
  }

  export function lf(format:string, ...args:any[]):string { return lf_va(format, args); }


    export class Lock
    {
        private waiting:Function[] = [];
        private acquired = false;

        public acquire(f:()=>void)
        {
            if (this.acquired) {
                this.waiting.push(f);
            } else {
                this.acquired = true;
                f();
            }
        }

        public release()
        {
            Util.assert(this.acquired);
            if (this.waiting.length > 0) {
                var f = this.waiting.shift();
                f();
            } else {
                this.acquired = false;
            }
        }
    }

    export interface Position { x:number; y:number; }


    export class RefreshTimer
    {
        tick:number;

        constructor(public interval:number, public callback:()=>void)
        {
            this.tick = 0;
        }

        restart()
        {
            this.tick++;
            var tick0 = this.tick;
            Util.setTimeout(this.interval, () => {
                if (tick0 == this.tick) {
                    this.callback();
                }
            });
        }
    }

    export class KeyboardAutoUpdate
    {
        version = 0;
        lastValue: string = null;
        updateValue: string = null;
        // make it slightly slower on phones, faster on desktop
        public delay = Browser.isDesktop ? 300 : Browser.isCellphone ? 800 : 500;

        constructor(private read : () => string, public update:(s:string)=>void)
        {
        }

        static mkInput(textbox: HTMLInputElement, update: (s: string) => void ) : KeyboardAutoUpdate
        {
            var kb = new KeyboardAutoUpdate(() => textbox.value, update);
            return kb;
        }

        static mkTextArea(textbox: HTMLTextAreaElement, update: (s: string) => void ) : KeyboardAutoUpdate
        {
            var kb = new KeyboardAutoUpdate(() => textbox.value, update);
            return kb;
        }

        public keypress()
        {
            var searchValue = this.read();
            if (searchValue == this.lastValue) return;

            var v = ++this.version;
            this.lastValue = searchValue;

            if (!this.update) return;
            if (this.delay <= 0) {
                this.update(searchValue);
            } else {
                Util.setTimeout(this.delay, () => {
                    //Util.log("autokeyboard - update: uv " + v + ", cv " + this.version + ", " + searchValue + ", " + this.read());
                    if  (v == this.version && this.update && searchValue == this.read()) {
                        this.update(searchValue);
                    }
                });
            }
        }

        public resultsCurrent(s:string):boolean
        {
            //Util.log("autokeyboard - current: cv " + this.version + ", " + (this.textbox.value == s));
            return this.read() == s;
        }
    }

    export interface CsvParseError {
        line: number;
        column: number;
        message: string;
    }

    export interface CsvFile {
        headers: string[];
        records: string[][];
    }

    //RFC 4180 compliant Csv Parser
    export class CsvParser {
        private m_text: string;
        private m_pos = 0;
        private m_line = 1;
        private m_col = 1;
        private m_errors: CsvParseError[];
        private file: CsvFile;
        private m_separator: number;

        private space = ' '.charCodeAt(0);
        private comma = ','.charCodeAt(0);
        private semiColumn = ';'.charCodeAt(0);
        private doubleQuote = '"'.charCodeAt(0);
        private cr = '\r'.charCodeAt(0);
        private lf = '\n'.charCodeAt(0);
        private tab = '\t'.charCodeAt(0);
        private dot = '.'.charCodeAt(0);
        private backwack = '\\'.charCodeAt(0);

        public parse(text: string, separator : string): CsvFile {
            if (!text) return null;

            this.m_text = text;
            this.m_errors = [];
            this.file = { headers: [], records: [] };
            this.m_pos = 0;
            this.m_line = 1;
            this.m_col = 1;
            this.m_separator = (separator) ? separator.charCodeAt(0) : 0;

            try {
                if (!this.parseHeader())
                    return null;
                if (this.atEnd())
                    return this.file;
                this.parseRecords();
                return this.file;
            }
            catch (e) {
                return null;
            }
        }

        private atEnd() { return this.m_text.length == this.m_pos; }
        private peek(): number {
            if (this.atEnd()) return -1;
            return this.m_text.charCodeAt(this.m_pos);
        }

        private read(): number {
            if (this.atEnd()) {
                this.fail("end of file.");
                throw new Error();
            }
            if (this.m_text.charCodeAt(this.m_pos) === this.lf) {
                this.m_line++;
                this.m_col = 1;
            }
            return this.m_text.charCodeAt(this.m_pos++);
        }

        private expected(expectedToken: string) {
            this.fail("expecting: " + expectedToken);
        }

        private fail(message: string) {
            this.m_errors.push({ line: this.m_line, column: this.m_col, message: message });
        }

        private parseHeader(): boolean {
            var firstName = this.parseField();
            if (firstName == null)
                return false;
            this.file.headers.push(firstName);
            this.inferSeparator();
            while (this.peek() === this.m_separator) {
                if (!this.parseSeparator())
                    return false;
                var nextName = this.parseField();
                if (nextName == null)
                    return false;
                this.file.headers.push(nextName);
            }
            return this.parseCRLF();
        }
        private inferSeparator() {
            if (this.m_separator == 0 && !this.atEnd()) {
                var c = this.peek();
                if(c == this.comma || c == this.semiColumn || c == this.tab)
                    this.m_separator = c;
            }
        }
        private parseSeparator(): boolean {
            var c = this.read();
            if (c != this.m_separator) {
                this.expected(String.fromCharCode(this.m_separator));
                return false;
            }
            this.eatWhitespace();
            return true;
        }

        private eatWhitespace() {
            while (!this.atEnd() && this.peek() == this.space)
                this.read();
        }

        private parseCRLF(): boolean {
            this.eatWhitespace();
            this.eatCR();
            return this.parseLF();
        }
        private parseLF(): boolean {
            var c = this.read();
            if (c != this.lf) {
                this.expected("<LF>");
                return false;
            }
            return true;
        }
        private eatCR() {
            if (!this.atEnd() && this.peek() == this.cr)
                this.read();
        }
        private parseRecords(): boolean {
            if (!this.parseRecord())
                return false;
            while (!this.atEnd()) {
                if (!this.parseCRLF())
                    return false;
                if (this.atEnd())
                    break;
                if (!this.parseRecord())
                    return false;
            }
            return true;
        }

        private parseRecord(): boolean {
            var record = [];
            var firstField = this.parseField();
            if (firstField == null)
                return false;
            record.push(firstField);
            this.inferSeparator();
            while (!this.atEnd() && this.peek() === this.m_separator) {
                if (!this.parseSeparator())
                    return false;
                var nextField = this.parseField();
                if (nextField == null)
                    return false;
                record.push(nextField);
            }
            this.file.records.push(record);
            return true;
        }
        private parseField(): string {
            if (this.peek() == this.doubleQuote)
                return this.parseEscaped();
            return this.parseNonescaped();
        }
        private parseNonescaped(): string {
            var data = [];
            while (!this.atEnd() && !this.isSeparatorOrCRLF(this.peek())) {
                data.push(String.fromCharCode(this.read()));
            }
            return data.join('');
        }
        private isSeparatorOrCRLF(val: number) : boolean {
            return val === this.m_separator || val === this.cr || val === this.lf;
        }
        static isTextData(val: number): boolean {
            return val == 0x20 || val == 0x21 || (val >= 0x23 && val <= 0x2b) || (val >= 0x2D && val <= 0x7e);
        }
        static isEscaped(val: number): boolean {
            return CsvParser.isTextData(val) || val == 0x2c || val == 0xD || val == 0xa;
        }
        private parseEscaped(): string {
            var data = [];
            if (!this.parseDoubleQuote())
                return null;
            while (!this.atEnd()) {
                var c = this.read();
                if (c == this.doubleQuote) { // ""
                    if (this.peek() == this.doubleQuote)
                        data.push(String.fromCharCode(this.read()));
                    else break;
                } else if (c == this.backwack) { // \"
                    if (this.peek() == this.doubleQuote)
                        data.push(String.fromCharCode(this.read()));
                }
                else
                    data.push(String.fromCharCode(c));
            }
            return data.join('');
        }

        private parseDoubleQuote(): boolean {
            this.eatWhitespace();
            var c = this.read();
            if (c != this.doubleQuote) {
                this.expected("<DoubleQuote>");
                return false;
            }
            return true;
        }
    }


    export class Set<T>
    {
        private _list:T[] = [];

        public add(e:T)
        {
            if (!this.contains(e))
                this._list.push(e)
        }

        public contains(e:T)
        {
            return this._list.indexOf(e) >= 0;
        }

        public elts():T[]
        {
            return this._list
        }

        public length() { return this._list.length; }
    }


    // Compute the longest common subsequence
    //   [equal] is a comparison function that returns [true] if two [T]'s are
    //     equal
    //   [l1] and [l2] are two lists of [T]
    export class Lcs<T>
    {
        private table: T[][] = [];

        constructor (
            private equal: (x: T, y: T) => boolean,
            private l1: T[],
            private l2: T[]
        ) {
            for (var i = -1; i < l1.length; ++i)
                this.table[i] = [];
        }

        private lcs_m(i: number, j: number) {
            if (this.table[i][j] !== undefined) {
                return this.table[i][j];
            } else {
                var r = this.lcs_i(i, j);
                this.table[i][j] = r;
                return r;
            }
        }

        private lcs_i(i: number, j: number) {
            var c1: T = this.l1[i];
            var c2: T = this.l2[j];

            if (i == -1 || j == -1) {
                return [];
            } else if (this.equal(c1, c2)) {
                return this.lcs_m(i-1, j-1).concat([c1]);
            } else {
                var lcs1 = i > 0 ? this.lcs_m(i-1, j) : [];
                var lcs2 = j > 0 ? this.lcs_m(i, j-1) : [];
                return lcs1.length > lcs2.length ? lcs1 : lcs2;
            }
        }

        public lcs() {
            return this.lcs_i(this.l1.length - 1, this.l2.length - 1);
        }
    }
}
