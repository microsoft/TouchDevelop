///<reference path='refs.ts'/>

module TDev.Cookies {
    export interface CookieInfo {
        IsConsentRequired: boolean;
        CookieName: string;
        MinimumConsentDate: string;
        Markup: string;
        Js: string[];
        Css: string[];
    }

    export function shouldShowBannerAsync(): Promise { // CookieInfo
        return Util.httpGetJsonAsync(`https://uhf.microsoft.com/${navigator.language}/shell/api/mscc?sitename=touchdevelop&domain=touchdevelop.com&mscc_eudomain=true`)
    }

    export function initAsync(): Promise {
        return shouldShowBannerAsync()
            .then(info => {
                info.Css.forEach(css => {
                    var link = document.createElement('link');
                    link.rel = 'stylesheet';
                    link.href = css;
                    document.head.appendChild(link);
                })
                var d = div('info');
                d.style.position = 'absolute';
                d.style.bottom = `2rem`;
                d.style.left = '1rem';
                d.innerHTML = info.Markup;
                elt("root").appendChild(d);
                return Promise.join(info.Js.map(js => TDev.HTML.jsrequireAsync(js)));
            })
            .then(() => { }, e => {
                Util.reportError('cookie', e);
            })
    }
}