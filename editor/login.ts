///<reference path='refs.ts'/>

//declare var Windows:any;

module TDev.Login
{
    export function show(hash: string = null, addParameters = ""): boolean {
        // Cloud.isOnline should be checked prior to call this api
        if (/skipLogin/.test(document.URL)) {
            HTML.showErrorNotification("skipLogin specified; won't login")
            return false;
        }

        var m = /u=\w+/.exec(document.URL);
        if (m)
            addParameters = "&" + m[0];

        if (Cloud.lite) {
            var uid = Cloud.getUserId()
            if (uid) addParameters = "&u=" + encodeURIComponent(uid)
        }

        var hereUrl = window.location.href;
        if (/^x-wmapp/.test(hereUrl)) hereUrl = "https://www.touchdevelop.com/app/current.error#wp8login";
        hereUrl = hereUrl.replace(/#modal.*/, "");
        if (hash) {
            if (/^\//.test(hash))
                hash = "redirect:" + encodeURIComponent(hash);
            hereUrl = hereUrl.replace(/#.*/, "") + "#" + hash
        }
        var url = Cloud.getServiceUrl() + "/oauth/dialog?response_type=token&client_id=" +
            encodeURIComponent(Cloud.lite ? "webapp2" : "webapp") +
            "&redirect_uri=" + encodeURIComponent(hereUrl) +
            "&identity_provider=" + encodeURIComponent(Cloud.getIdentityProvider() || "") +
            "&state=" + encodeURIComponent(Cloud.oauthStates()[0]) + addParameters;
        ProgressOverlay.show(lf("signing in..."))
        Util.navigateInWindow(url);

        return true;
    }

    export function migrate()
    {
        Util.httpPostRealJsonAsync("https://next.touchdevelop.com/api/migrationtoken", { 
            access_token:  decodeURIComponent(TDev.Cloud.getAccessToken()) 
        }).then(tok => {
            Util.navigateInWindow("https://next.touchdevelop.com/app/#hub:migrate:" + tok.migrationtoken)
        }, e => {
            if (e.status == 409)
                ModalDialog.info(lf("already migrated"), lf("Your account has already been migrated."))
            else throw e;
        }).done()
    }
}
