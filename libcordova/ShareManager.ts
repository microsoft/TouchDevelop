///<reference path='refs.ts'/>
module TDev.RT.Cordova {
    export function ShareManagerInit()
    {
        ShareManager.facebookLike = (text, url, fburl) => null;
        ShareManager.createFacebookLike = () => null;
        ShareManager.createTwitterTweet = () => null;
    }
}
