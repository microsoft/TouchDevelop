module TDev {
	export module Azure {
		export interface WebsiteAuth
	    {
            key: string;
            webspace: string;
            website: string;
            destinationAppUrl: string;
            everUsed?: boolean;

            publishUrl?: string;
            userName?: string;
            userPWD?: string;
            deploymentKey?: string;
            checkedShellVersion?: number;
            websocketsEnabled?: boolean;
	    }

		export var websiteAuth:StringMap<WebsiteAuth>;

		export function getDestinationAppUrl(app:AST.App)
		{
			loadWebsiteAuth();
            if (!app.editorState) return null
            var wa = websiteAuth[app.editorState.deployWebsite]
            if (wa)
                return wa.destinationAppUrl;
            return null
		}

		export function storeWebsiteAuth(auth:WebsiteAuth)
	    {
	        loadWebsiteAuth();
	        websiteAuth[auth.key] = auth;
            if (/azurewebsites.net/.test(auth.destinationAppUrl)) {
                auth.destinationAppUrl = auth.destinationAppUrl.replace(/^http:/, "https:")
            }
            auth.destinationAppUrl = auth.destinationAppUrl.replace(/\/*$/, "/")
            storeWebsiteAuths(websiteAuth)
	    }

	    export function getWebsiteAuthForApp(app:AST.App):WebsiteAuth
        {
            if (!app || !app.editorState) return null
            return getWebsiteAuth(app.editorState.deployWebsite)
        }

	    export function getWebsiteAuth(name:string):WebsiteAuth
	    {
	        loadWebsiteAuth()
	        if (!name) return null
	        var res = websiteAuth[name]
	        if (res) return res
	        var m = /^azure:([^:]+):([^:]+)/.exec(name)
	        if (m) {
	            res = {
	                key: name,
	                webspace: m[1],
	                website: m[2],
	                destinationAppUrl: "https://" + m[2] + ".azurewebsites.net/"
	            }
	            storeWebsiteAuth(res)
	            return res
	        }
	        return null
	    }

	    function loadWebsiteAuth()
	    {
	        if (!websiteAuth)
	            websiteAuth = JSON.parse(window.localStorage["website_auth"] || "{}")
	    }

        export function storeWebsiteAuths(auths: StringMap<WebsiteAuth>) {
            websiteAuth = undefined;
            window.localStorage.setItem("website_auth", JSON.stringify(auths));
        }

	    export function getWebsiteAuths():StringMap<WebsiteAuth>
	    {
	        loadWebsiteAuth()
	        return Util.jsonClone(websiteAuth);
	    }
	}

}
