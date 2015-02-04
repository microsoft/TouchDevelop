///<reference path='refs.ts'/>

module TDev.RT.Cordova
{
    export function setup(f:()=>void)
    {
        document.addEventListener("deviceready", () => {
            f();
        }, false)
    }
}
