///<reference path='refs.ts'/>


//declare var Windows:any;

module TDev.Login
{
    export function show(hash: string = null): boolean {
        // Cloud.isOnline should be checked prior to call this api
        if (/skipLogin/.test(document.URL)) {
            HTML.showErrorNotification("skipLogin specified; won't login")
            return false;
        }

        var addParameters = "";
        var m = /u=\w+/.exec(document.URL);
        if (m)
            addParameters = "&" + m[0];

        var hereUrl = window.location.href;
        if (/^x-wmapp/.test(hereUrl)) hereUrl = "https://www.touchdevelop.com/app/current.error#wp8login";
        hereUrl = hereUrl.replace(/#modal.*/, "");
        if (hash)
            hereUrl = hereUrl.replace(/#.*/, "") + "#" + hash
        var url = Cloud.getServiceUrl() + "/oauth/dialog?response_type=token&client_id=" +
            encodeURIComponent("webapp") +
            "&redirect_uri=" + encodeURIComponent(hereUrl) +
            "&identity_provider=" + encodeURIComponent(Cloud.getIdentityProvider() || "") +
            "&state=" + encodeURIComponent(Cloud.oauthStates()[0]) + addParameters;
        ProgressOverlay.show("signing in...")
        Util.navigateInWindow(url);

        return true;
    }
}
