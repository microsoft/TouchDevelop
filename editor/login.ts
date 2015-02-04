///<reference path='refs.ts'/>


//declare var Windows:any;

module TDev.Login
{
    export function show(hash:string = null) : boolean
    {
			// Cloud.isOnline should be checked prior to call this api
            if (/skipLogin/.test(document.URL)) {
                HTML.showErrorNotification("skipLogin specified; won't login")
                return false;
            }

            var addParameters = "";
            var m = /u=\w+/.exec(document.URL);
            if (m)
                addParameters = "&" + m[0];

            if (Browser.win8)
            {
                var url = Cloud.getServiceUrl();
                var startUri = new Windows.Foundation.Uri(url + "/oauth/dialog?response_type=token&client_id=" + encodeURIComponent("win8app") + "&identity_provider=" + encodeURIComponent(Cloud.getIdentityProvider() || "") + addParameters);
                var endUri = new Windows.Foundation.Uri(url + "/oauth/success");
                Windows.Security.Authentication.Web.WebAuthenticationBroker.authenticateAsync(
                    Windows.Security.Authentication.Web.WebAuthenticationOptions.none, startUri, endUri)
                    .done(function (result: any) {
                        if (!!result.responseData)
                        {
                            var response = result.responseData.toString();
                            var match = response.match(/.*#access_token=([^&]*)/);
                            if (match) {
                                var token = match[1];
			                    var id = response.match(/.*&id=([^&]*)/)[1];
	                            var expires = parseInt((response.match(/.*&expires_in=([^&]*)/)||["0","0"])[1]);
		                        match = response.match(/.*&identity_provider=([^&]*)/);
			                    var identityProvider = match ? decodeURIComponent(match[1]) : undefined; 
			                    var oldid = Cloud.getUserId();
			                    if (oldid && id != oldid) {
                                    ModalDialog.info("sign in failed", "sign in with different account not supported at this time"); 
                                    return;
			                    }
                                if (/.*[#&]dbg=true/.test(response))
                                    window.localStorage["dbg"] = true;
                                else
                                    window.localStorage.removeItem("dbg");
                                Cloud.setUserId(id);
                                Cloud.setIdentityProvider(identityProvider || "");
                                Cloud.setAccessToken(token);
                                Browser.TheHost.clearMeAsync(false).done();
                            } else
                                ModalDialog.info("sign in failed", "could not obtain access token from server"); 
                        }
                    }, function (err: any) {
                        ModalDialog.info("sign in failed", "message: " + err.message);
                    });
            }
            else
            {
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
            }

			return true;
        }
}
