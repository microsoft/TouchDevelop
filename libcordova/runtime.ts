///<reference path='refs.ts'/>

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
    }
}
