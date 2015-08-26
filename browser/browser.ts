module TDev {
    export var dbg = false;
    export var isBeta = false;
    
    export enum BrowserSoftware {
        unknown   ,
        ie10      ,
        ie11      ,
        ieOld     ,
        android2  ,
        android4  ,
        chrome    ,
        firefox   ,
        safari    ,
        silkOld   ,
        silk,
        opera     ,
        nodeJS    ,
        maxthon   ,
        bb10      ,
    }

    export module Browser {
        export var isNodeJS = false;
        export var isHeadless = false;
        export var isTouchDevice = false;
        export var isMobile: boolean = undefined;
        export var isCellphone = false;
        export var isTablet = false;
        export var isDesktop = false;
        export var isMobileSafari = false;
        export var isMobileSafariOld = false;
        export var isGecko = false;
        export var isTrident = false;
        export var isWebkit = false;
        export var isAndroid = false;
        export var isMacOSX = false;
        export var isWindows8plus = false;
        export var isRaspberryPiDebian = false;
        export var isCompiledApp = false;
        export var isWP8app = false;
        export var isHosted = false;
        export var browser = BrowserSoftware.unknown;
        export var browserVersion = 0;
        export var browserVersion2 = 0; // not set for pinned iOS apps; look at webkitVersion instead
        export var webkitVersion = 0;
        export var isEmbedded = false;
        export var canIndexedDB = false;
        export var canWebSql = false;
        export var canMemoryTable = true;
        export var hasHardwareBack = false;
        export var localProxy = false;
        export var noAnimations = false;
        export var noStorage = false;

        export var isGenStubs = false;
        export var mobileWebkit = false;
        export var touchStart = false;
        export var webRunner = false;
        export var webAppImplicit = false;
        export var webAppBooster = false;
        export var inCordova = false;
        export var inEditor = false;
        export var builtinTouchToPan = false;
        export var canLogin = true;
        export var canWriteLocalStorage: boolean;
        export var cscript = false;
        export var useConsoleLog = false;
        export var brokenColumns = false;
        export var assumeMouse = false;
        export var brokenGradient = false;
        export var deviceMotion = false;
        export var deviceOrientation = false;
        export var deviceHeading = false;
        export var audioDataUrls = true;
        export var audioWav = false;
        export var compilerInlining = false;
        export var compilerOkElimination = true; // always on
        export var compilerBlockChaining = false;
        export var brokenBackButton = false;
        export var brokenResize = false;
        export var screenshots = false;
        export var setInnerHTML = function (el: HTMLElement, html: string) { el.innerHTML = html; }
        export var dragAndDrop = false;
        export var videoTracks = true;
        export var directionAuto = true;
        export var notifyBackToHost = false;
        export var logToHost = false;
        export var noNetwork = false;
        export var lowMemory = false;

        export var loadingDone = false;

        export var platformCaps: string[] = []
        export var browserShortName = "unknown";

        export var startTimestamp = 0;

        function browserName(s:BrowserSoftware)
        {
            var n = (<any>BrowserSoftware)[s]
            return !n || s == BrowserSoftware.unknown ? "unknownBrowser" : n;
        }

        function setBrowserVersion(name:string)
        {
            var userAgent = window.navigator.userAgent;
            var idx = userAgent.indexOf(name + "/");
            if (idx >= 0) {
                var verNo = userAgent.slice(idx + name.length + 1);
                browserVersion = parseInt(verNo);
            }

            var m = userAgent.match(/Version\/(\d+)\./);
            if (m) browserVersion2 = parseInt(m[1]);
        }

        export function detect() {
            var url = document ? document.URL : "";
            if (/dbg=[1t]/.test(url) || (window && window.localStorage && window.localStorage["dbg"])) dbg = true;
            if (/nodbg/.test(url)) dbg = false;           
            if ((<any>window).betaFriendlyId || dbg || /localhost/.test(url) || /consolelog/.test(url))
                isBeta = true;
            if (/nobeta/.test(url)) isBeta = false;
            Browser.useConsoleLog = isBeta && !!console && !!console.log;
            
            startTimestamp = new Date().getTime(); // no Util here
            
            if ((<any>window).touchDevelopExec || (<any>window).mcefQuery || (<any>window).cordova) {
                isHosted = true;
                Browser.screenshots = true;
            }

            if ((<any>window).isNodeJS) {
                isNodeJS = true
                isHeadless = true
            }

            if ((<any>window).localProxy || isNodeJS) {
                localProxy = true
            }

            if ((<any>window).cordova)
                inCordova = true;

            var userAgent = isNodeJS ? "NodeJS" : window.navigator.userAgent;
            var addCap = (c: string) => {
                platformCaps.push(c)
            }

            if (!isNodeJS) {
                webRunner = !!(<any>window).webRunner;
                webAppImplicit = !!(<any>window).webAppImplicit;
                deviceMotion = !!(<any>window).DeviceMotionEvent;
                deviceOrientation = !!(<any>window).DeviceOrientationEvent;
                deviceHeading = deviceOrientation;
            }

            var flags = ((<any>window).runtimeFlags || "").split(/,/)
            if (flags.indexOf("notifyBack") >= 0)
                notifyBackToHost = true;
            if (flags.indexOf("logToHost") >= 0)
                logToHost = true;
            if (flags.indexOf("noNetwork") >= 0)
                noNetwork = true;

            if (/Silk|Kindle/.test(userAgent)) {
                if (/ Android [123]\./.test(userAgent))
                    browser = BrowserSoftware.silkOld;
                else
                    browser = BrowserSoftware.silk;
                isTablet = true;
            } else if (/ Trident\/[7-9]/.test(userAgent)) {
                browser = BrowserSoftware.ie11;
                isMobile = / IEMobile\//.test(userAgent);
                if (isMobile) isCellphone = true;
                else if (window.navigator.msMaxTouchPoints) isTablet = true;
                else isDesktop = true;
                hasHardwareBack = isCellphone;
                isTrident = true;
            } else if (/Maxthon\//.test(userAgent)) {
                browser = BrowserSoftware.maxthon;
            } else if (/ Android /.test(userAgent)) {
                if (/ Chrome\//.test(userAgent)) {
                    browser = BrowserSoftware.chrome;
                    setBrowserVersion("Chrome");
                }
                else if (/ Android [123]\./.test(userAgent)) browser = BrowserSoftware.android2;
                else browser = BrowserSoftware.android4;

                if (/ Mobile /.test(userAgent)) isCellphone = true;
                else isTablet = true;
                isAndroid = true;
                hasHardwareBack = true;
            } else if (/ Chrome\//.test(userAgent)) {
                browser = BrowserSoftware.chrome;
                setBrowserVersion("Chrome");
                isDesktop = true;
            } else if (/ MSIE 1[0-9]/.test(userAgent)) {
                browser = BrowserSoftware.ie10;
                isMobile = / IEMobile\//.test(userAgent);
                if (isMobile) isCellphone = true;
                else if (window.navigator.msMaxTouchPoints) isTablet = true;
                else isDesktop = true;
                hasHardwareBack = isCellphone;
                isTrident = true;
            } else if (/ MSIE [2-9]/.test(userAgent)) {
                browser = BrowserSoftware.ieOld;
                isDesktop = true;
                isTrident = true;
            } else if (/BB10/.test(userAgent)) {
                browser = BrowserSoftware.bb10;
                isMobile = true;
                isCellphone = true;
            } else if (/\(iPad/.test(userAgent)) {
                browser = BrowserSoftware.safari;
                setBrowserVersion("Version");
                isTablet = true;
                addCap("iPad");
            } else if (/\(iPhone/.test(userAgent)) {
                browser = BrowserSoftware.safari;
                setBrowserVersion("Version");
                isCellphone = true;
                addCap("iPhone");
            } else if (/\(iPod/.test(userAgent)) {
                browser = BrowserSoftware.safari;
                setBrowserVersion("Version");
                isCellphone = true;
                addCap("iPod");
            } else if (/Safari/.test(userAgent)) {
                browser = BrowserSoftware.safari;
                setBrowserVersion("Version");
                isDesktop = true;
            } else if (/ Firefox\//.test(userAgent)) {
                browser = BrowserSoftware.firefox;
                setBrowserVersion("Firefox");
                if (/Mobile/.test(userAgent)) isCellphone = true;
                else if (/Tablet/.test(userAgent)) isTablet = true;
                else isDesktop = true;
                isAndroid = /Android/.test(userAgent);
                isGecko = true;
            } else if (/Opera\//.test(userAgent)) {
                browser = BrowserSoftware.opera;
            } else if (/NodeJS/.test(userAgent)) {
                browser = BrowserSoftware.nodeJS;
                useConsoleLog = true;
            }
            if (isTrident && !inCordova) {
                if (/^x-wmapp/.test(document.URL)) {
                    isWP8app = true;
                    addCap("wp8app");
                }
            }

            if (inCordova)
                addCap("cordova")

            if (isTrident) {
                videoTracks = false; // needs to be emulated
                directionAuto = false;
            }

            if (/lowMemory/.test(url)) lowMemory = true;
            if (/noAnim/.test(url)) noAnimations = true;

            isTouchDevice = isCellphone || isTablet;
            if (isMobile === undefined)
                isMobile = isTouchDevice;
            isWebkit = /WebKit/.test(userAgent);
            if (isWebkit) {
                var m = userAgent.match(/WebKit\/(\d+)\./);
                if (m) webkitVersion = parseInt(m[1]);
            }
            isMacOSX = /Macintosh/.test(userAgent);
            if (/Windows NT (6.[2-9]|[789])/.test(userAgent))
                isWindows8plus = true;
            mobileWebkit = isWebkit && isMobile;
            if (!isMobile) assumeMouse = true;

            //builtinTouchToPan = (browser == BrowserSoftware.chrome || browser == BrowserSoftware.firefox || browser == BrowserSoftware.ie10 || browser == BrowserSoftware.ie11);
            builtinTouchToPan = true;
            isMobileSafari = (browser == BrowserSoftware.safari && isMobile)
            if (isMobileSafari) {
                var m = userAgent.match(/Safari\/([^.]*)/);
                isMobileSafariOld = (!browserVersion || browserVersion < 8) &&
                    m && m.length > 1 && parseInt(m[1]) < 7534; // actually checking for Safari version that came with iOS 5; we do have evidence that iOS 4 doesn't work (Storage broken)
            }

            if (isMobileSafari && !/Safari/.test(userAgent) && !(<any>window.navigator).standalone) {
                isEmbedded = true;
            }
            if ((browser == BrowserSoftware.ie10 || browser == BrowserSoftware.ie11) && !window.applicationCache) {
                isEmbedded = true;
            }

            var w = <any>window;
            if (w.indexedDB || w.mozIndexedDB || w.msIndexedDB) // do not check for w.webkitIndexedDB, as it might be reported as present, but doesn't work
            {
                canIndexedDB = true;
            }
            if (w.openDatabase || Browser.inCordova) { // cordova: device might still be loading websql library
                canWebSql = true;
            }


            if (isMobile && browser == BrowserSoftware.safari && /CriOS/.test(userAgent)) {
                browser = BrowserSoftware.chrome;
                setBrowserVersion("CriOS");
            }

            if (isWebkit) {
                if (!isMobileSafari)
                    brokenColumns = true;
                if (isAndroid)
                    brokenGradient = true;
            }

            if (isDesktop) {
                deviceMotion = false;
                deviceOrientation = false;
            }

            if (isMobileSafari && webkitVersion >= 537) { // iOS 7
                brokenBackButton = true;
                brokenResize = true;
            }

            // raspberry pi
            if (/Linux armv7/.test(userAgent)) {
                isRaspberryPiDebian = true;
                noAnimations = true;
                noStorage = true; // I/O very slow
                lowMemory = true; // limited amount of memory
            }

            browserShortName = browserName(browser);
            if (isWP8app) browserShortName += ".wp8app";
            else if (isCellphone) browserShortName += ".phone";
            else if (isTablet) browserShortName += ".tablet";
            else browserShortName += ".desktop";
            if (inCordova) browserShortName += ".cordova";
            addCap(browserShortName)
            addCap(browserName(browser))
            if (isCellphone) addCap("cellphone");
            if (isTablet) addCap("tablet");
            if (isTouchDevice) addCap("touch");
            if (isMobile) addCap("mobile");
            if (isMacOSX) addCap("macOSX");
            if (assumeMouse) addCap("assumeMouse");
            if (isWindows8plus) { addCap("win"); addCap("win8plus"); }
            if (isAndroid) addCap("android");
            if (/X11/.test(userAgent)) addCap("x11");
            if (/Windows NT 5.1/.test(userAgent)) { addCap("win"); addCap("winXP"); }
            if (/Windows NT 6.0/.test(userAgent)) { addCap("win"); addCap("winVista"); }
            if (/Windows NT 6.1/.test(userAgent)) { addCap("win"); addCap("win7"); }
            if (webAppBooster) { addCap("webAppBooster"); }
            if (isMobileSafari || (isMobile && (browser == BrowserSoftware.ie10 || browser == BrowserSoftware.ie11))) { audioDataUrls = false; }

            if (mobileWebkit)
                touchStart = true;

            canWriteLocalStorage = false;

            if (typeof window == "object" && typeof window.localStorage == "object" && window.localStorage.removeItem)
                try
                {
                    var s = startTimestamp + "";
                    window.localStorage["test"] = s;
                    if (window.localStorage["test"] == s) {
                        canWriteLocalStorage = true;
                        window.localStorage.removeItem("test");
                    }
                } catch (e) { } // observed to fail in "Private Browsing" of (mobile) Safari

            if (isWP8app) {
                audioDataUrls = true; // through wab
                screenshots = true; // through wab
                audioWav = true;
            }

            dragAndDrop = !isNodeJS && !Browser.isMobile && document && document.createElement && 'draggable' in document.createElement('span');
            // compiler policies from cloud performance benchmarks
            /*switch (browser) {
                    case BrowserSoftware.android4:
                    case BrowserSoftware.chrome:
                        compilerInlining = true;
                        break;
                    case BrowserSoftware.ie10:
                    case BrowserSoftware.ie11:
                        compilerInlining = true;
                        compilerBlockChaining = true;
                        break;
                    case BrowserSoftware.firefox:
                        compilerBlockChaining = true;
                        break;
            }*/
        }

        var getServiceUrl = () => <string>((<any>window).rootUrl);
        interface UnsupportedMessage {
            problemHTML: string;
            fixHTML: string;
        }
        function unsupportedMessage(what = "TouchDevelop", path = "")
        {
            /*
            var recommendedBrowser = "";
            if (isWindows8plus) recommendedBrowser = "Please use Internet Explorer 10 or better.";
            else if (!isTouchDevice) recommendedBrowser = "Please upgrade to Windows 8 with Internet Explorer 10 or better.";
            */

            var message = (problemHTML: string, fixHTML: string = undefined) => <UnsupportedMessage>{ problemHTML: problemHTML, fixHTML: fixHTML };
            var genericMessage = (problemHTML: string, upgradedBrowserName: string = undefined) => message(problemHTML, upgradedBrowserName ?
                "<p>Follow these easy steps to run " + what + " on your device:</p>" +
                "<ol class='light'><li>open <b>" + upgradedBrowserName + "</b></li><li>navigate to <u>touchdevelop.com" + path + "</u></li></ol>" +
                "<p>You can copy&amp;paste the link into " + upgradedBrowserName + ".</p>" : undefined);

            if (isEmbedded)
                return genericMessage("<p>It seems you're running TouchDevelop inside of another app.</p>", "your regular internet browser");

            // only firefox supported
            var olderAndroidMessage = (problemHTML: string) => message(problemHTML,
                "<p>Follow these easy steps to run " + what + " on Android:</p>" +
                "<ol class='light'><li><b>try to install the latest <a href='market://details?id=org.mozilla.firefox&hl=en'>Firefox Browser</a></b> from the Google Play Store</li>" +
                "<li>open <u>touchdevelop.com" + path + "</u> in the Chrome Browser</li></ol>" +
                "<p>You can copy&amp;paste the link into Firefox.</p>");

            // chrome, firefox, opera
            var chromeAndroidMessage = (problemHTML: string) => message(problemHTML,
                "<p>Follow these easy steps to run " + what + " on Android:</p>" +
                "<ol class='light'><li><b>install the latest <a href='market://details?id=com.android.chrome&hl=en'>Chrome Browser</a> or <a href='market://details?id=org.mozilla.firefox&hl=en'>Firefox Browser</a> or <a href='market://details?id=com.opera.browser&hl=en'>Opera Browser</a> </b> from the Google Play Store</li>" +
                "<li>open <u>touchdevelop.com" + path + "</u> in the Chrome Browser</li></ol>" +
                "<p>You can copy&amp;paste the link into the installed browser.</p>");

            var upgradeMessage = (problemHTML: string) => message(problemHTML,
                "<p>Follow these easy steps to run " + what + " on your device:</p>" +
                "<ol class='light'><li>upgrade your browser to the latest version</li><li>navigate to <u>touchdevelop.com" + path + "</u></li></ol>" +
                "<p>You can copy&amp;paste the link into your upgraded browser.</p>");

            switch (browser) {
            case BrowserSoftware.ieOld:
                // this is really handled in index.html already
                return message("TouchDevelop Wep App does not work with Internet Explorer versions earlier than 10.");

            case BrowserSoftware.silkOld:
                return message("TouchDevelop Wep App does not work with the Silk browser in Kindle Fire 1st Gen. Please upgrade to Kindle Fire 2nd Gen or Kindle Fire HD."); // and there's probably nothing the user can do about it

            case BrowserSoftware.opera:
                return genericMessage("TouchDevelop Wep App does not work with Opera. Please use Internet Explorer 10+, Chrome or Firefox.", "one of the suggested browsers");

            case BrowserSoftware.safari:
                if (isMobileSafariOld)
                    return upgradeMessage("Please upgrade to the latest version of iOS / Safari.");
                if (isMacOSX && browserVersion2 < 6)
                    return genericMessage("Safari 5 and older are not supported. Please upgrade Safari or <a href='http://www.google.com/mac/'>install Chrome</a> or <a href='http://www.mozilla.org/en-US/firefox/new/'>Firefox</a>.", "the upgraded browser");
                if (isTouchDevice) break;
                if (isMacOSX) break;
                return genericMessage("TouchDevelop Wep App is not supported in Safari on a PC. Please use Internet Explorer 10 or better, Chrome or Firefox.", "one of the suggested browsers");

            case BrowserSoftware.android2:
                return olderAndroidMessage("<p>TouchDevelop might require a newer version of Android.</p>"); // and there's probably nothing the user can do about it

            case BrowserSoftware.android4:
                return chromeAndroidMessage("<p>TouchDevelop Wep App is not supported in the stock Android browser.<p/>");

            case BrowserSoftware.firefox:
                if (browserVersion < 16)
                    return upgradeMessage("<p>You are using an outdated version of Firefox.</p>");
                // the latest versions of Firefox mobile on Android look pretty good
                if (isAndroid && browserVersion < 29)
                    return upgradeMessage("<p>Please upgrade to the latest version of Firefox for Android.</p>");
                break;

            case BrowserSoftware.chrome:
                if (isMobileSafari && browserVersion < 38)
                    return upgradeMessage("<p>You are using an outdated version of Chrome.</p>");
                if (isMobile && browserVersion < 19)
                    return chromeAndroidMessage("<p>You are using an outdated browser.</p>");
                if (!isMobile && browserVersion < 21)
                    return upgradeMessage("<p>You are using an outdated version of Chrome.</p>");
                break;

            case BrowserSoftware.ie10:
                break;

            case BrowserSoftware.bb10:
                break;

            case BrowserSoftware.maxthon:
            case BrowserSoftware.unknown:
                return genericMessage("<p>TouchDevelop is not supported in the current browser.</p>", "<a href='https://www.touchdevelop.com/app/.browsers#supported'>a supported browser</a>");
            }

            if (!canWriteLocalStorage) {
                if (browser == BrowserSoftware.safari)
                    return message("<p>You are running Safari in Private Mode or Private Browsing. TouchDevelop does not support this mode, as TouchDevelop needs to maintain a database of installed scripts, but Private Mode or Private Browsing does not allow the use of databases.</p>",
                        "<p><b>Please disable Private Mode or Private Browsing, and then try again.</b></p>" +
                        "<ul>" +
                        "<li>In iOS 6, open 'Settings', select 'Safari', and turn 'Private Browsing' off.</li>" +
                        "<li>In iOS 7, 8 and 8.1, open 'Safari', tap on the Bookmarks button, then tap on the 'Private' button in the lower left corner of the screen.</li>" +
                        "</ul>");
                else
                    return genericMessage("<p>Your browser does not seem to allow storing data.</p>", "regular internet browser");
            }

            // detect whether a resilient database was ever used
            canMemoryTable = !window.localStorage["disableMemoryTable"];

            // note that on WP8, if Internet Explorer is configured to disallow "storing files", then IndexedDB is not available --- however, this does not actually matter for the Windows Phone app, as it uses its own database backend
            // in some configrations, we will use an in-memory database instead
            if (!canWebSql && !canIndexedDB && !isWP8app && !canMemoryTable) {
                if (browser == BrowserSoftware.ie10 || browser == BrowserSoftware.ie11)
                    return genericMessage("<p>You are running Internet Explorer in the InPrivate mode. TouchDevelop does not support this mode, as TouchDevelop needs to maintain a database of installed scripts, but the InPrivate mode does not allow the use of databases.</p>",
                        "a regular Internet Explorer window");
                else
                    return genericMessage("<p>Your browser does not seem to support databases.</p>",
                        "<a href='https://www.touchdevelop.com/app/.browsers#supported'>a supported browser </a>");
            }

            return null;
        }

        export function supportMemoryTable(value: boolean) {
            if (value) {
                if (canWriteLocalStorage) window.localStorage.removeItem('disableMemoryTable');
                canMemoryTable = true;
            }
            else {
                if (canWriteLocalStorage) window.localStorage["disableMemoryTable"] = "1";
                canMemoryTable = false;
            }
        }

        function browsersHtml()
        {
            var url = (<any>window).browsersUrl;
            if (url) window.location.href = (<any>window).browsersUrl;
        }

        function supportedBrowsers(descriptionHTML: string, fixHTML: string = undefined) {
            var e = document.getElementById("browserMessage");
            if (e) {
                var happy = (<any>window).browserSupported;
                e.innerHTML = (happy ? "" : fixHTML ? "<p>There is only a slight problem:</p>" : "<p>There is a problem:</p>") + descriptionHTML;
                if (happy)
                    e.style.color = "green";
                if (fixHTML) {
                    e = document.getElementById("browserAlmost");
                    if (e)
                        e.innerHTML = "<p>You are almost there!</p>";
                    e = document.getElementById("browserFix");
                    if (e)
                        e.innerHTML = fixHTML;
                }
            }
            e = document.getElementById("userAgent");
            if (e) e.innerText = "User Agent: " + window.navigator.userAgent;
        }

        function reportBrowser(browser:string)
        {
          try {
            if ((<any>window).tdlite)
                return

            var serviceUrl = getServiceUrl();
            if (!serviceUrl) return;

            if (window.localStorage) {
                if (window.localStorage["browserReported"]) return;
                try {
                    window.localStorage["browserReported"] = "1";
                } catch (e) { } // observed to fail in "Private Browsing" of (mobile) Safari
            }

            var now = new Date();
            var userAgent = window.navigator.userAgent;
            var dateStr = now.getFullYear() + "." + (now.getMonth() + 1) + "." + now.getDate();
            var se: { [x: string]: number } = {};
            se["browser." + browser] = 1;
            var ticksReq = {
                dateStr: dateStr,
                sessionEvents: se,
                platform: <any[]>[],
                jsUrl: (<any>window).mainJsName
            }

            var client = new XMLHttpRequest();
            client.open("POST", serviceUrl + "/api/ticks");
            client.send(JSON.stringify(ticksReq));

            if (browser == "unknown") {
              var msg = "Unsupported-" + browser;
              var bug = {
                  exceptionConstructor: msg,
                  exceptionMessage: msg,
                  context: "detection",
                  currentUrl: "",
                  scriptId: "",
                  stackTrace: "browserNotSupported",
                  sourceURL: "",
                  line: -1,
                  eventTrace: "",
                  userAgent: userAgent,
                  resolution: "",
                  jsUrl: (<any>window).mainJsName,
                  timestamp: now.getTime(),
                  platform: <any[]>[],
              };
              var client = new XMLHttpRequest();
              client.open("POST", serviceUrl + "/api/bug");
              client.send(JSON.stringify(bug));
            }
          } catch (e) {
          }
        }

        function statusMsg(m: string) {
            var f = (<any>window).statusMsg;
            if (f) f(m);
        }

        export function check(isIndex:boolean, what: string = undefined, path: string = undefined)
        {
            if ((<any>window).isNodeJS) {
                detect()
                return
            }

            statusMsg("browser detector started");
            var userAgent = window.navigator.userAgent;
            if (/ IEMobile\/[3-9]/.test(userAgent)) {
                statusMsg("IEMobile userAgent: " + userAgent);
                if (isIndex) {
                    reportBrowser("IEMobile");
                    browsersHtml();
                } else {
                    supportedBrowsers("<p>The TouchDevelop Web App doesn't work on Windows Phone 7.</p>",
                        "<p>Please get the free <a href='http://windowsphone.com/s?appId=fe08ccec-a360-e011-81d2-78e7d1fa76f8'>TouchDevelop app from the Windows Phone Store</a> instead.</p>");
                }
            } else if (/ MSIE [6789]/.test(userAgent)) {
                statusMsg("IEx userAgent: " + userAgent);
                if (isIndex) {
                    if (/ MSIE 9/.test(userAgent)) reportBrowser("IE9");
                    else reportBrowser("IE8-");
                    browsersHtml();
                } else {
                    supportedBrowsers("<p>TouchDevelop doesn't work with Internet Explorer 9 or earlier.<p/>",
                                      '<p>You can upgrade your browser to <a href="http://windows.microsoft.com/en-us/internet-explorer/downloads/ie-10/worldwide-languages">Internet Explorer 10</a> if you are running Windows 7, ' +
                                      'or upgrade your operating system to <a href="http://windows.microsoft.com/en-US/windows/buy">Windows 8</a> which comes with Internet Explorer 10, or try the latest version of Chrome or Firefox.</p>');
                }
            } else {
                statusMsg("browser detector processing");
                detect();
                var um = unsupportedMessage(what, path);

                if (!um || /ignoreAgent/.test(document.URL) || inCordova) {
                    statusMsg("browser detector success: " + browserShortName);
                    (<any>window).browserSupported = true;
                    if (isIndex)
                        reportBrowser(browserShortName);
                    else
                        supportedBrowsers("<p>Your browser is supported.</p>");
                } else {
                    statusMsg("browser detector failed: " + browserShortName);
                    if (isIndex) {
                        reportBrowser(browserShortName);
                        browsersHtml();
                    } else {
                        supportedBrowsers(um.problemHTML, um.fixHTML);
                    }
                }
            }
        }
    }
}
