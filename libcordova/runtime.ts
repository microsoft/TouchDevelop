///<reference path='refs.ts'/>
var WinJS: any;

module TDev.RT.Cordova
{
    export function setup(deviceready:()=>void)
    {
        document.addEventListener("deviceready", () => deviceready(), false)
        document.addEventListener("backbutton",() => {
            if (!TDev.Runtime.theRuntime ||
                TDev.Runtime.theRuntime.getPageCount() == 1)
                (<any>navigator).app.exitApp();
            else
                Util.goBack();
        }, false);
        
        document.addEventListener('deviceready', () => {
            if(WinJS){
                WinJS.Application.onbackclick = function (e) {
                    if (!TDev.Runtime.theRuntime || TDev.Runtime.theRuntime.getPageCount() == 1)
                        return false;
                    else
                        TDev.Util.goBack();
                    return true; }
            }
        }, false);
    }
}
