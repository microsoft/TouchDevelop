module TDev {
    export enum BrowserSoftware {
        unknown,
        ie10,
        ieOld,
        android2,
        android4,
        chrome,
        firefox,
        safari,
        silk,
        opera,
    }
    export module Browser {
        export var isTouchDevice: boolean;
        export var isMobile;
        export var isCellphone: boolean;
        export var isTablet: boolean;
        export var isDesktop: boolean;
        export var isMobileSafari: boolean;
        export var isGecko: boolean;
        export var isTrident: boolean;
        export var isWebkit: boolean;
        export var isAndroid: boolean;
        export var isMacOSX: boolean;
        export var isWindows8plus: boolean;
        export var browser: BrowserSoftware;
        export var browserVersion: number;
        export var mobileWebkit: boolean;
        export var touchStart: boolean;
        export var win8: boolean;
        export var cordova: boolean;
        export var builtinTouchToPan: boolean;
        export var canLogin: boolean;
        export var cscript: boolean;
        export var useConsoleLog: boolean;
        export var brokenColumns: boolean;
        export var assumeMouse: boolean;
        export var brokenGradient: boolean;
        export var brokenDeviceMotion: boolean;
        export var deviceMotion: boolean;
        export var deviceOrientation: boolean;
        export var stillLoading: boolean;
        export var platformCaps: any[];
        export var browserShortName: string;
        export var startTimestamp: number;
        export function getCssPrefix(): string;
        export function check(isIndex: boolean): void;
    }
}
