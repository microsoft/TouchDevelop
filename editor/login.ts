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
            encodeURIComponent("webapp3") +
            "&redirect_uri=" + encodeURIComponent(hereUrl) +
            "&identity_provider=" + encodeURIComponent(Cloud.getIdentityProvider() || "") +
            "&state=" + encodeURIComponent(Cloud.oauthStates()[0]) + addParameters;
        ProgressOverlay.show(lf("signing in..."))
        Util.navigateInWindow(url);

        return true;
    }

    export function migrate()
    {
        ProgressOverlay.show(lf("migrating account..."))

        var migrationToken = ""
        Util.httpPostRealJsonAsync("https://next.touchdevelop.com/api/migrationtoken", { 
            access_token:  decodeURIComponent(TDev.Cloud.getAccessToken()) 
        }).then(tok => {
            migrationToken = "&u=" + encodeURIComponent(tok.migrationtoken)
        }, e => { })
        .then(() => {
            World.cancelSync();
            Cloud.setAccessToken(undefined);
            Util.navigatingAway = true; // prevent oneTab error
            window.onunload = () => { }; // clearing out the onunload event handler; the regular one would write to stuff to storage again
            return TheEditor.resetWorldAsync()
        })
        .then(() => {
            Login.show("hub", migrationToken)
        })
        .done()
    }
}
