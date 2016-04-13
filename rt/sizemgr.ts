///<reference path='refs.ts'/>
module TDev {
    export var snapView = false;

    export module SizeMgr
    {
        export var topFontSize = 24;
        export var windowHeight = 800;
        export var windowWidth = 1300;
        export var wallWindowWidth = 1300;
        export var editorWindowWidth = 1300;
        export var portraitMode = false;
        export var phoneMode = false;
        export var devicePixelRatio = 1;
        export var hubFontSize = 30;
        export var lastOrientationLockTime = 0;
        export var splitScreen = false;
        export var splitScreenRequested = false;
        var phoneSimulationW = -1;
        var phoneSimulationH = -1;
        var previousHeight = 0;
        var previousWidth = 0;

        var savedPortraitWidth = 320;
        var savedPortraitHeight = 460;

        function setupPhoneSimulation()
        {
            if (phoneSimulationW >= 0) return;

            var m = /phone=([\d\.]+)(x([\d\.]+))?/.exec(window.document.URL);
            if (m) {
                phoneSimulationW = parseFloat(m[1]);
                var h = m[3];
                if (!h) h = m[1];
                phoneSimulationH = parseFloat(h);
            } else {
                phoneSimulationW = 0;
                phoneSimulationH = 0;
            }
        }

        export function earlyInit()
        {
            phoneMode = Browser.isCellphone || /phone=([\d\.]+)/.test(window.document.URL);
        }

        export function canSplitScreen()
        {
            return !phoneMode && !portraitMode && windowWidth*1.2 > windowHeight;
        }

        export function setSplitScreen(isSplit:boolean)
        {
            splitScreenRequested = isSplit;
            var newSplit = splitScreenRequested && canSplitScreen()
            if (newSplit != splitScreen) {
                splitScreen = newSplit
                applySizes(true)
            }
        }

        export function applySizes(force = false)
        {
            setupPhoneSimulation();

            var h = window.innerHeight;
            var w = window.innerWidth;


            if (Browser.isTrident && Browser.isCellphone) {
                if (w < h) {
                    devicePixelRatio = window.screen.width / w;
                } else {
                    // as funny as it sounds, it doesn't swap width/height when rotating device
                    devicePixelRatio = window.screen.height / w;
                }
            }

            // Util.log("innerHeight {0} screenHeight {1} {2}x{3} outerHeight {4}x{5}", window.innerHeight, window.screen.height, window.screen.availWidth, window.screen.availHeight, window.outerWidth, window.outerHeight);
            Ticker.dbg("resize(prev w={0} h={1}, curr w={2} h={3})", previousWidth, previousHeight, w, h)

            if (!force && previousHeight > 0) {
                if (Browser.isTouchDevice && Math.abs(w - previousWidth) < 30 && Math.abs(previousHeight - h) > 1) {
                    if (Util.now() - lastOrientationLockTime > 600) {
                        // it seems like a keyboard popping up; just ignore it
                        //if (Browser.mobileWebkit) window.scrollTo(0,1);
                        return;
                        //h = previousHeight;
                        //w = previousWidth;
                    }
                }
            }

            if (Browser.brokenResize) {
                if (w < h) {
                    if (h <= 300) {
                        w = savedPortraitWidth;
                        h = savedPortraitHeight;
                        Ticker.dbg("brokenResize, fixing up to {0}x{1}", w, h)
                    } else {
                        savedPortraitWidth = w;
                        savedPortraitHeight = h;
                    }
                }
            }


            if (Browser.browser == BrowserSoftware.safari && Browser.isCellphone) {
                if (350 < h && h <= 416) h = 417;
                // Fix for letter-box iPhone 5 when pinned to home screen
                //if (window.screen.height == 568) {
                //    (<any>document.querySelector("meta[name=viewport]")).content="width=320.1";
                //}
            }

            if (Browser.mobileWebkit) {
                Util.setTimeout(100, () => { window.scrollTo(0,1) });
            }


            var origW = w;
            var origH = h;

            var applySim = (w:number, simW:number) =>
                simW <= 0 ? w : simW <= 2 ? simW * w : simW;

            w = applySim(w, phoneSimulationW);
            h = applySim(h, phoneSimulationH);

            if (!force && h == previousHeight && w == previousWidth) return;

            previousHeight = h;
            previousWidth = w;

            // in desktop, we lower the threshold so that TD goes into portrait mode when it is docked on a side of the scrreen
            var portraitThreshold = Browser.isDesktop ? 0.9 : 1.2;
            portraitMode = w * portraitThreshold < h;

            if (Browser.isCellphone)
                phoneMode = true;

            if (phoneSimulationW > 0) {
                phoneMode = true;
            }

            splitScreen = splitScreenRequested && canSplitScreen()
            if (phoneMode || splitScreen) portraitMode = true;

            Util.log("view:" + (portraitMode ? " portrait" : " landscape") + (phoneMode ? " phone" : "") + (splitScreen ? " split" : "") + " size:" + w + "x" + h);

            var statusBarSize = 0;

            windowHeight = h;
            windowWidth = w;

            if (splitScreen) {
                editorWindowWidth = windowWidth / 1.618;
                wallWindowWidth = windowWidth - editorWindowWidth;
            } else {
                editorWindowWidth = windowWidth;
                wallWindowWidth = windowWidth;
            }

            topFontSize = Math.floor(Math.min(h / 25, editorWindowWidth / (phoneMode ? 25 : portraitMode ? 36 : 55)));
            if (splitScreen)
                wallWindowWidth -= 0.15*topFontSize // for the border

            var zoom = window.localStorage["zoomFactor"]
            if (zoom && parseFloat(zoom)) {
                topFontSize = Math.round(topFontSize * Util.between(0.3, parseFloat(zoom), 2))
            }

            elt("root").style.height = h + "px";
            if (phoneSimulationW > 0)
                elt("root").style.width = w + "px";

            if (!Browser.isMobile) topFontSize = Math.max(topFontSize / 2, Math.min(topFontSize * 2, 16)); // allow zooming;

            elt("root").style.fontSize = topFontSize +"px";

            var rootClass = portraitMode ? "portrait" : "landscape";
            if (phoneMode) rootClass += " phone";
            if (splitScreen) rootClass += " split";
            if (Browser.assumeMouse) rootClass += " assume-mouse";
            if (Browser.assumeMouse
                && Browser.browser != BrowserSoftware.ie10
                && Browser.browser != BrowserSoftware.ie11)
                    rootClass += " assume-notouch";
            if (topFontSize <= 12) rootClass += " tinyFont";
            if (topFontSize <= 18) rootClass += " smallFont";
            rootClass += " rootClass";
            if (Browser.brokenColumns)
                rootClass += " brokenColumns";
            elt("root").className = rootClass;

            var rootStyle = elt("root").style;
            if (phoneSimulationW > 0) {
                rootStyle.left = (origW - w) / 2 + "px";
                rootStyle.top = (origH - h) / 2 + "px";
                rootStyle.background = "#fff";
                document.body.style.background = "#666";
            }
            
            if (currentScreen)
                currentScreen.applySizes();
        }

        export function getColumnWidth():number {

            return this.portraitMode ? (window.innerWidth - (2 * this.topFontSize /* margins */))
                                     : (18.5 /* matches default.css */ * this.topFontSize);


        }

    }
}
