///<reference path='refs.ts'/>

module TDev.AppExport
{
    var defaultRelId = "2519907933017944621-a342078e.30b5.4a5e.ac57.0326ee53fdc3-68865"

    function deleteWebAppAsync(id:string) {
        return Cloud.deleteWebAppAsync(id)
            .then((resp: string) => {
                return JSON.parse(resp);
            }, e => {
                if (e.status == 502)
                    return { message: "Could not delete app. " + Cloud.onlineInfo() };
                else if (e.status == 503)
                    return { message: "Could not delete app. Did you post a lot recently? Please try again later." };
                else if (e.status == 403)
                    return { message: "Access denied; your access token might have expired. Please return to the main hub and then try again." };
                else if (e.status == 400)
                    return { message: "Cloud precondition violated (" + e.errorMessage + ")" };
                else
                    throw e;
            });
    }

    function createWebAppAsync(
        id: string,
        name: string,
        previewUrl: boolean = false
        ) {
        var jsName = (<any>window).mainJsName
        if (jsName == "./main.js") jsName = undefined;
            // jsName = "https://az31353.vo.msecnd.net/app/2520232682052641738-138b4cfc.c1d2.471a.b5b3.a17e6e09c611-46113/c/main.js";
        return Cloud.postWebAppAsync(id, previewUrl, {
            name: name,
            jsUrl: jsName
        })
            .then((resp: string) => {
                return JSON.parse(resp);
            }, e => {
                if (e.status == 502)
                    return { message: "Could not create app. " + Cloud.onlineInfo() };
                else if (e.status == 503)
                    return { message: "Could not create app. Did you post a lot recently? Please try again later." };
                else if (e.status == 403)
                    return { message: "Access denied; your access token might have expired. Please return to the main hub and then try again." };
                else if (e.status == 400)
                    return { message: "Cloud precondition violated (" + e.errorMessage + ")" };
                else
                    throw e;
            });
    }

    function createAppAsync(
        id: string,
        appPlatform: string,
        title: string,
        author: string,
        description: string,
        termsOfUse: string,
        privacyStatement: string,
        logoDataUrl: string,
        isGame : boolean,
        apiKeys: any
        ) {
        var logo = Util.splitDataUrl(logoDataUrl);
        return Cloud.postAppAsync(id, appPlatform, {
            compiled: 1,
            termsofuse: termsOfUse,
            title: title,
            author: author,
            description: description,
            privacystatement: privacyStatement,
            logocontent: logo ? logo.content : null,
            logocontenttype: logo ? logo.contentType : null,
            apikeys: apiKeys,
            game : isGame,
            jsUrl: (<any>window).mainJsName
        })
            .then((resp: string) => {
                return JSON.parse(resp);
            }, e => {
                if (e.status == 502)
                    return { message: "Could not create app. " +  Cloud.onlineInfo() };
                else if (e.status == 503)
                    return { message: "Could not create app. Did you post a lot recently? Please try again later." };
                else if (e.status == 403)
                    return { message: "Access denied; your access token might have expired. Please return to the main hub and then try again." };
                else if (e.status == 400)
                    return { message: "Cloud precondition violated (" + e.errorMessage + ")" };
                else
                    throw e;
            });
    }

    export function getExportScriptsTokenAsync(): Promise { // string
        var tok = localStorage["export_scripts_access_token"]
            if (tok) return Promise.as(tok)
            return TDev.RT.EditorServices.getTokenAsync("Export your scripts")
            .then(tok => {
                localStorage["export_scripts_access_token"] = tok
                    return tok
        })
    }

    export function createWebApp(id: string) {
        if (Cloud.anonMode(lf("exporting HTML5 web apps"))) return;

        var m0 = new ModalDialog();
        var progressBar0 = HTML.mkProgressBar();
        m0.add(progressBar0);
        m0.add(div("wall-dialog-header", storeLogo("html5")));
        m0.add(div("wall-dialog-body", div('', "loading app metadata...")));
        progressBar0.start();

        Promise.delay(1000, // initially, delay served for testing; but then without it, it would just look like the screen flickering too much (often too fast)
            () => Cloud.getWebAppAsync(id)).then(data =>
            {
                if (!Script) return

                progressBar0.stop();
                m0.dismiss();

                if (data.message) {
                    ModalDialog.info("export to app", "You cannot export to app: " + data.message);
                    return;
                }

                var m = new ModalDialog();
                var progressBar = HTML.mkProgressBar();

                var msg = div('', "");
                var previewUrlMsg = div('', "");
                var nameInput = HTML.mkTextInput("text", lf("app name")); nameInput.value = data.name; nameInput.maxLength = 100;

                var errorDiv = div('validation-error');
                var buttonsDiv = div("wall-dialog-buttons");
                var createBtn = null;
                var deleteBtn = null;

                function previewUrl() {
                    previewUrlMsg.setChildren(['Computing URL...']);
                    progressBar.start();
                    var name = nameInput.value;
                    createWebAppAsync(id, name, true).then((res) => {
                        progressBar.stop();
                        if (res && res.redirect) {
                            previewUrlMsg.setChildren([div('wall-dialog-body', "URL: " + res.redirect), div('wall-dialog-body', res.message)]);
                        } else {
                            previewUrlMsg.setChildren([div('wall-dialog-body', "Error: " + res.message)]);
                        }
                    }).done();
                }
                var nameInputAuto = KeyboardAutoUpdate.mkInput(nameInput, () => previewUrl());
                nameInput.onkeyup = () => {
                    nameInputAuto.keypress();
                };
                function addShare(url:string, name:string)
                {
                    var lnk = RT.Link.mk(url, RT.LinkKind.hyperlink)
                    lnk.set_title("my web app \"" + name + "\"")
                    RT.ShareManager.addShareButtons(m, lnk, {
                        header: "share your web app!",
                        noDismiss: true
                    })
                }
                function createApp() {
                    createBtn.removeSelf();
                    hideLegalEtc();
                    msg.setChildren(['Creating Web App...']);
                    progressBar.start();
                    var name = nameInput.value;
                    createWebAppAsync(id, name).then((res) => {
                        progressBar.stop();
                        if (res && res.redirect) {
                            msg.setChildren([]);
                            Browser.setInnerHTML(msg, "Your Web App is ready: " +
                                "<a target='_blank' href='http://tdev.ly/" + res.id + "'>http://tdev.ly/" + res.id + "</a>" +
                                "<div class='smallText' style='margin-top:0.8em'>To delete the Web App later, go back to this dialog for the same installed published script.</div>");
                            addShare("http://tdev.ly/" + res.id, name)
                        } else {
                            msg.setChildren([div('wall-dialog-header', "Sorry, the app could not be created. "), res ? res.message : ""]);
                        }
                        buttonsDiv.setChildren([HTML.mkButton(lf("close"), () => {
                            m.dismiss();
                        })]);
                    }).done();
                }
                function deleteApp() {
                    deleteBtn.removeSelf();
                    msg.setChildren(['Deleting Web App...']);
                    progressBar.start();
                    deleteWebAppAsync(id).then((res) => {
                        progressBar.stop();
                        if (res && res.deleted) {
                            msg.setChildren([]);
                            Browser.setInnerHTML(msg, "Your Web App has been deleted!");
                        } else {
                            msg.setChildren([div('wall-dialog-header', "Sorry, the app could not be deleted. "), res ? res.message : ""]);
                        }
                        buttonsDiv.setChildren([HTML.mkButton(lf("close"), () => {
                            m.dismiss();
                        })]);
                        hideLegalEtc();
                    }).done();
                }
                function link(text: string, lnk: string) {
                    return HTML.mkA("", Cloud.getServiceUrl() + lnk, "_blank", text);
                }

                function hideLegalEtc() {
                    if (legalDiv) {
                        legalDiv.style.display = "none";
                        detailsButtonDiv.style.display = "none";
                        detailsDiv.style.display = "none";
                        weWillCreate.style.display = "none";
                    }
                }

                m.add(div("wall-dialog-header", storeLogo("html5")));
                if (data.existingRedirect) {
                    var url = "http://tdev.ly/" + data.existingId
                    buttonsDiv.setChildren([
                        HTML.mkButton(lf("cancel"), () => {
                            m.dismiss();
                        }),
                        HTML.mkButton(lf("open web app"), () => {
                            window.open(url)
                        }),
                        deleteBtn = HTML.mkButton(lf("delete"), () => {
                            deleteApp();
                        })
                    ]);

                    m.add(div("wall-dialog-body", lf("This script already has an associated web app:")));
                    m.add(div("wall-dialog-body", HTML.mkA("", url, "_blank", url)));
                    var progressBarDiv = div("", progressBar); progressBarDiv.style.position = "relative"; m.add(progressBarDiv);
                    m.add(div("wall-dialog-body", msg));
                    m.add(buttonsDiv);
                    m.add(errorDiv);
                    addShare(url, data.name)
                }
                else {
                    var iAgree = false;
                    var weWillCreate = null;
                    var iAgreeInput = HTML.mkCheckBox(lf("I agree"), b => {
                        iAgree = b;
                    });
                    buttonsDiv.setChildren([
                        HTML.mkButton(lf("cancel"), () => {
                            m.dismiss();
                        }),
                        createBtn = HTML.mkButton(lf("agree to terms and create"), () => {
                            /*
                            if (!iAgree) {
                                msg.setChildren(['You must agree before you can create an app.']);
                                return;
                            } */
                            createApp();
                        })
                    ]);

                    m.add(weWillCreate =
                        div("wall-dialog-body", "We will create a Web App for your script, so anyone with a link can run it. " +
                                        "This feature is still in Preview. "));

                    var detailsDiv = div(null,
                        div("wall-dialog-header", lf("app details")),
                        div("wall-dialog-body", lf("The information below will be stored on touchdevelop.com and embedded in the generated app; you can come back later and update or remove the stored information.")),
                        div("wall-dialog-header", lf("name")),
                        div("wall-dialog-body",
                        [
                           div('', 'The web app URL will contain a URL-compatible form of your user nickname and the web app name.'),
                           div('', nameInput),
                           div('', previewUrlMsg),
                        ]))
                    detailsDiv.style.display = "none";
                    var detailsButtonDiv = div(null, HTML.mkCheckBox(lf("show additional options"), b => {
                        detailsDiv.style.display = b ? "block" : "none";
                    }))
                    var legalDiv = Cloud.mkLegalDiv();
                    m.add(legalDiv);
                    // m.add(iAgreeInput);
                    var progressBarDiv = div("", progressBar); progressBarDiv.style.position = "relative"; m.add(progressBarDiv);
                    m.add(div("wall-dialog-body", msg));
                    m.add(errorDiv);
                    m.add(buttonsDiv);
                    m.add([detailsButtonDiv, detailsDiv])
                }

                m.setScroll();
                m.show();
                previewUrl();
            }, e =>
            {
                progressBar0.stop();
                m0.dismiss();
            }).done();

        m0.show();
    }

    function storeLogo(name: string)
    {
        return ScriptIcons.getWinLogo(name, 3, '#ff0');
    }

    function iterNodes(e:Node, f:(v:Node)=>void)
    {
        while (e) {
            f(e)
            if (e.firstChild)
                iterNodes(e.firstChild, f)
            e = e.nextSibling
        }
    }

    var mgmtCert = null

    function getManagementCerificate()
    {
        if (mgmtCert) return Util.jsonClone(mgmtCert)

        var mgmt = window.localStorage["azure_management_certificate"]
        if (mgmt) {
            return (mgmtCert = JSON.parse(mgmt))
        }

        return null
    }

    function clearManagementCertificate()
    {
        mgmtCert = null
        delete window.localStorage["azure_management_certificate"]
    }

    function askManagementCerificateAsync() : Promise
    {
        var m = new ModalDialog();
        m.add(div('wall-dialog-header', lf("azure management certificate")));
        m.addHTML(
            lf("Paste your certificate here. If you don't have an Azure subscription, <a href='http://www.youtube.com/watch?v=YE4u55oNjmw' target='_blank'>here is a 2 minute video</a> with instructions.") +
            lf("Once you get the subscription you can <a href='http://go.microsoft.com/fwlink/?LinkId=254432' target='_blank'>generate the certificate</a>."))
        var save = false
        m.add(div("wall-dialog-body", HTML.mkCheckBox(lf("save certificate in the browser"), (v) => {
            save = v
        })))
        var err = div(null)
        m.add(err)

        var res = new PromiseInv();

        var elt = HTML.mkTextArea("scriptText");
        m.add(elt)
        m.addOk(lf("import"), () => {
            try {
                var parser = new DOMParser();
                var doc = parser.parseFromString(elt.value, "application/xml");
                var subs = []
                iterNodes(doc.firstChild, e => {
                    var attr = (n:string) => e.attributes.getNamedItem(n).value
                    if ((<Element>e).tagName == "Subscription") {
                        subs.push({
                            subscriptionId: attr("Id"),
                            subscriptionName: attr("Name"),
                            managementCertificate: attr("ManagementCertificate"),
                        })
                    }
                })
                if (subs.length > 1)
                    err.setChildren("there is more than one subscription; delete entries for the ones you don't want")
                else if (subs.length == 0)
                    err.setChildren("no <Subscription> elements found")
                else {
                    var ret = subs[0]
                    mgmtCert = ret
                    if (save)
                        window.localStorage["azure_management_certificate"] = JSON.stringify(ret)
                    m.dismiss()
                    res.success(ret)
                }
            } catch (e) {
                err.setChildren(lf("error parsing xml: {0}", e.message));
            }
        })
        m.show();

        return res;
    }

    function manualImportCustomSiteAsync(): Promise {
        var m = new ModalDialog();
        m.add(div('wall-dialog-header', lf("custom node server deployment")));
        m.addHTML(
            lf("Enter your node server's location and key here to publish scripts to it.")
            )
        var err = div(null)
        m.add(err)

        m.add(div('', lf("name (e.g. production):")));
        var res = new PromiseInv();
        var name = HTML.mkTextInput("text", lf("web site name"));
        m.add(name)
        m.add(div('', lf("url (e.g. http://localhost:4242):")));
        var url = HTML.mkTextInput("url", lf("web site url"));
        m.add(url)
        m.add(div('', lf("key (printed out by your node server on startup):")));
        var key = HTML.mkTextInput("text", lf("web site key"));
        m.add(key)
        m.addOk("import", () => {
            try {
                if (!/^http(s?):\/\//.test(url.value)) {
                    throw new Error(lf("Please provide a proper http(s) url (e.g. http://localhost:4242)"));
                }
                if (!/\/$/.test(url.value)) {
                    url.value = url.value + "/";
                }
                var wa = <Azure.WebsiteAuth> {
                    deploymentKey: key.value,
                    key: 'custom:' + name.value,
                    website: name.value,
                    webspace: 'custom',
                    destinationAppUrl: url.value
                };
                Azure.storeWebsiteAuth(wa)
                res.success(setDeploymentWebsiteAsync(wa))
            } catch (e) {
                err.setChildren(e.message);
            }
        })
        m.show();

        // populate data from local editor if any
        if (LocalShell.mgmtUrl("")) {
            name.value = "local";
            url.value = LocalShell.url() || "";
            key.value = LocalShell.deploymentKey() || "";
        }

        return res;
    }

    function manualPublishProfileImportAsync() : Promise
    {
        var m = new ModalDialog();
        m.add(div('wall-dialog-header', lf("azure publish profile import")));
        m.addHTML(
            lf("Paste your .PublishSettings file here. You can get it by first creating an Azure Website and then clicking on 'Download the publish profile' in 'quick glance' section on the right of the DASHBOARD tab.")
        )
        var err = div(null)
        m.add(err)

        var res = new PromiseInv();

        var elt = HTML.mkTextArea("scriptText");
        m.add(elt)
        m.addOk("import", () => {
            try {
                var wa = importPublishXML(null, elt.value)
                if (!wa) throw new Error(lf("no publish profile info found"))
                wa.websocketsEnabled = true;
                Azure.storeWebsiteAuth(wa)
                res.success(setDeploymentWebsiteAsync(wa))
            } catch (e) {
                err.setChildren(lf("error parsing xml: {0}", e.message));
            }
        })
        m.show();

        return res;
    }

    function deployEndpoint(path:string) {
        var m = /\/(\d+-[a-f0-9\.]+-[^\/]+)\//.exec(baseUrl)
        if (m)
            return Cloud.getPrivateApiUrl("deploy/" + path + "?releaseid=" + m[1])
        m = /noderunner=(\d+)/.exec(document.URL)
        if (m)
            return "http://localhost:" + m[1] + "/api/deploy/" + path
        else
            return Cloud.getPrivateApiUrl("deploy/" + path)
    }

    export function mgmtRequestAsync(wa:Azure.WebsiteAuth, path:string, data?:any) : Promise
    {
        var url = wa.destinationAppUrl + "-tdevmgmt-/" + wa.deploymentKey + "/" + path
        if (data === undefined) return Util.httpGetJsonAsync(url);
        else return Util.httpPostRealJsonAsync(url, data)
    }

    var allWebspaces = {
        eastuswebspace: "East US",
        westuswebspace: "West US",
        northcentraluswebspace: "North Central US",
        northeuropewebspace: "North Europe",
        westeuropewebspace: "West Europe",
        eastasiawebspace: "East Asia",
    }
    var currentWebSpace = "westuswebspace"

    function importPublishXML(wa:Azure.WebsiteAuth, xml:string)
    {
        var parser = new DOMParser();
        var doc = parser.parseFromString(xml, "application/xml");
        iterNodes(doc.firstChild, e => {
            var attr = (n:string) => {
                var a = e.attributes.getNamedItem(n)
                return a ? a.value : null
            }
            if ((<Element>e).tagName == "publishProfile" && attr("publishMethod") == "FTP") {
                if (wa == null) {
                    wa = {
                        key: "",
                        website: "",
                        webspace: "unknown",
                        destinationAppUrl: attr("destinationAppUrl")
                    }
                    wa.key = "profile:" + wa.destinationAppUrl
                    wa.website = wa.destinationAppUrl.replace(/^http(s?):\/\//, "").replace(/\.azurewebsites/, "").replace(/\.(net|com|org)$/, "")
                }
                wa.userPWD = attr("userPWD")
                wa.userName = attr("userName")
                wa.publishUrl = attr("publishUrl")
            }
        })
        return wa
    }

    function isRightShellVersionAsync(wa:Azure.WebsiteAuth)
    {
        return mgmtRequestAsync(wa, "stats")
            .then(resp => {
                if (resp && resp.shellVersion >= Runtime.shellVersion) {
                    wa.checkedShellVersion = resp.shellVersion
                    Azure.storeWebsiteAuth(wa)
                    return true
                } else return false
            })
    }

    function isDeployError(resp:any)
    {
        if (!resp) return false

        if (resp.status != 200) {
            var info = resp.response
            if (typeof info != "string") info = JSON.stringify(info)
            if (info === undefined) info = resp.errorMessage;
            ModalDialog.info(lf("deployment error"), info)
            return true
        }
        return false
    }

    function setDeploymentWebsiteAsync(wa:Azure.WebsiteAuth)
    {
        return setDeploymentWebsiteAsyncCore(wa)
            .then(y => y ? deployLocalWebappAsync(Script, wa) : null)
    }

    function getAzureConfigAsync(wa:Azure.WebsiteAuth)
    {
        if (wa.webspace == "custom") 
            return mgmtRequestAsync(wa, "getconfig")
        var cert = getManagementCerificate()
        if (!cert) return needCertAsync();

        cert.webspace = wa.webspace
        cert.website = wa.website
        return Util.httpPostJsonAsync(deployEndpoint("getazureconfig"), cert).then(resp => resp.response)
    }

    function needCertAsync()
    {
        var m = ModalDialog.info(lf("missing certificate"), lf("you need to setup management certificate first"), lf("ok, will do!"))
        var r = new PromiseInv()
        m.onDismiss = () => r.success(null)
        return r
    }

    function setDeploymentWebsiteAsyncCore(wa:Azure.WebsiteAuth)
    {
        if (!Script) return Promise.as()

        if (!wa.everUsed) {
            var rinner = new PromiseInv()
            ModalDialog.ask(lf("are you sure you want to overwrite the website at {0}?", wa.destinationAppUrl),
                                lf("overwrite"), () => {
                                    wa.everUsed = true
                                    Azure.storeWebsiteAuth(wa)
                                    rinner.success(setDeploymentWebsiteAsync(wa))
                                })
            return rinner
        }

        var m = new ModalDialog()
        m.add(div("wall-dialog-header", lf("preparing website")))
        var msg = div("wall-dialog-body")
        var question = div("wall-dialog-body")
        m.add(msg)
        m.add(question)
        m.show()

        var didRedeploy = false

        var getProfile = () => {
            if (wa.userPWD) return Promise.as()
            else {
                var cert = getManagementCerificate()
                if (!cert)
                    return needCertAsync()
                cert.webspace = wa.webspace
                cert.website = wa.website
                msg.setChildren(lf("asking azure for publish profile"))
                return Util.httpPostJsonAsync(deployEndpoint("getpublishxml"), cert).then(xml => {
                    if (isDeployError(xml)) return
                    importPublishXML(wa, xml.response)
                    Azure.storeWebsiteAuth(wa)
                })
            }
        }

        var mkFtp = () => { return {
                publishUrl: wa.publishUrl,
                userName: wa.userName,
                userPWD: wa.userPWD
        } }


        var checkVersion = () => {
            msg.setChildren(lf("probing deployment version..."))
            return isRightShellVersionAsync(wa).then(yes => {
                if (yes) {
                    if (Script)
                        Script.editorState.deployWebsite = wa.key;
                    m.dismiss()
                    return <any>true
                } else if (didRedeploy) {
                    msg.setChildren(lf("things don't look good; the website is not responding correctly despite redeployment"))
                    return false
                } else {
                    msg.setChildren(lf("invalid version detected; redeploying..."))
                    return redeploy()
                }
            })
        }

        var final = resp => {
            wa.deploymentKey = resp.deploymentKey;
            Azure.storeWebsiteAuth(wa)
            return checkVersion()
        }

        var redeploy = () => {
            didRedeploy = true
            msg.setChildren(lf("redeploying shell..."));
            return getProfile()
                .then(() => wa.userPWD ? Util.httpPostJsonAsync(deployEndpoint("deploytdconfig"), mkFtp()) : null)
                .then(resp => {
                    if (isDeployError(resp)) return
                    if (resp && resp.config && resp.config.deploymentKey) return final(resp.config)
                    else {
                        msg.setChildren(lf("couldn't redeploy: {0}", resp ? resp.response : ""))
                    }
                })
        }


        if (wa.webspace === 'custom') {
            return Promise.as().then(() => {
                Azure.storeWebsiteAuth(wa)
                return checkVersion()
            });
        }

        if (wa.deploymentKey)
            return checkVersion()


        return getProfile().then(() => {
                if (!wa.userPWD) {
                    msg.setChildren(lf("couldn't deploy - cannot get publish profile"))
                    return Promise.as(false)
                }
                msg.setChildren(lf("getting config..."));
                return Util.httpPostJsonAsync(deployEndpoint("gettdconfig"), mkFtp())
                .then(resp => {
                    if (resp.config && resp.config.deploymentKey)
                        return final(resp.config)
                    else
                        return redeploy()
                })
            })
    }

    function askAsync(d:HTMLElement, q:string, ok:string):Promise
    {
        var r = new PromiseInv()
        d.setChildren([div(null, q),
            div("wall-dialog-buttons",
                HTML.mkButton(lf("cancel"), () => {
                    d.setChildren([])
                    r.success(false)
                }),
                HTML.mkButton(ok, () => {
                    d.setChildren([])
                    r.success(true)
                }))])
        return r
    }

    function mkNavBtn(icon:string, color:string, name:any, desc:any = null)
    {
        var icn = div("navImg", HTML.mkImg("svg:" + icon));
        icn.style.backgroundColor = color;
        var innerElt = div("navItemInner", icn, div("navContent",
            div("navName", name),
            div("navDescription", desc)))
        var elt = HTML.mkButtonElt("navItem", innerElt);

        return elt;
    }

    function websiteBox(wa:Azure.WebsiteAuth)
    {
        if (!wa)
            return div(null, "<none>")

        return mkNavBtn("GlobeAS,white", "#08f", wa.website, wa.destinationAppUrl);
    }

    function websiteAuthFromAzure(a:any)
    {
        var wa:Azure.WebsiteAuth = {
            key: "",
            webspace: a.WebSpace,
            website: a.Name,
            destinationAppUrl: "https://" + a.Name + ".azurewebsites.net/",
        }
        wa.key = "azure:" + wa.webspace + ":" + wa.website
        return wa
    }

    function chooseWebsiteCoreAsync(azureResults: any[]): Promise {
        var r = new PromiseInv()
        var m = new ModalDialog()

        var auths = Azure.getWebsiteAuths()

        if (azureResults)
            azureResults.forEach(a => {
                var wa = websiteAuthFromAzure(a)
                if (!auths[wa.key])
                    auths[wa.key] = wa
            })

        var keys = Object.keys(auths).map(k => auths[k])
        keys.sort((a, b) => Util.stringCompare(a.website, b.website))

        // populate data from local editor if any
        if (LocalShell.mgmtUrl("")) {
            var wa = <Azure.WebsiteAuth> {
                deploymentKey: LocalShell.deploymentKey(),
                key: 'custom:local',
                website: 'local',
                webspace: 'custom',
                destinationAppUrl: LocalShell.url()
            };
            keys.splice(0, 0, wa);
        }

        var boxes = keys.map(wa =>
            websiteBox(wa)
                .withClick(() => {
                m.dismiss()
                r.success(setDeploymentWebsiteAsync(wa))
            })
            )

        if (getManagementCerificate()) {
            if (!azureResults)
                boxes.push(mkNavBtn("Download,#aaa", "white", lf("get website list from azure"),
                                        lf("using your imported management certificate"))
                            .withClick(() => {
                                            m.dismiss()
                                            r.success(chooseWebsiteAsync(true))
                                        }))

            boxes.push(mkNavBtn("Add,#aaa", "white", lf("create new azure website"),
                                    lf("using your imported management certificate"))
                        .withClick(() => {
                                        m.dismiss()
                                        r.success(createWebsiteAsync())
                                    }))
        }


        boxes.push(mkNavBtn("DownloadPage,#aaa", "white", lf("import .PublishSettings"),
                                lf("find 'Download the publish profile' in Azure portal"))
                    .withClick(() => {
                                    m.dismiss()
                                    r.success(manualPublishProfileImportAsync())
                                }))

        boxes.push(mkNavBtn("DownloadPage,#aaa", "white", lf("add custom website"),
            lf("run your own node server and deploy from here"))
            .withClick(() => {
                m.dismiss()
                                    r.success(manualImportCustomSiteAsync())
                                }))

        m.choose(boxes, { })

        return r
    }

    export function deployApiAsync(path:string, opts:any)
    {
        var cert = getManagementCerificate()
        if (!cert) {
            needCertAsync()
            return new PromiseInv(); // never finish
        }
        Object.keys(opts).forEach(k => cert[k] = opts[k])
        return Util.httpPostJsonAsync(deployEndpoint(path), cert)
    }

    export function deployApi(path:string, opts:any)
    {
        deployApiAsync(path, opts).then(resp => console.log(resp)).done()
    }

    function chooseWebsiteAsync(mergeAzure = false):Promise
    {
        // if (Object.keys(Azure.getWebsiteAuths()).length == 0) mergeAzure = true;

        if (mergeAzure) {
            var cert = getManagementCerificate()
            if (!cert)
                return askManagementCerificateAsync().then(() => chooseWebsiteAsync(true));

            var loading = ModalDialog.info(lf("loading..."), lf("loading website list from Azure"), lf("stop"))
            var cancel = false
            loading.onDismiss = () => { cancel = true };

            return Util.httpPostJsonAsync(deployEndpoint("listwebsites"), cert).then(resp => {
                if (cancel) return
                loading.dismiss()

                // remove old azure web sites
                var auths = Azure.getWebsiteAuths()
                Object.keys(auths).forEach(ws => {
                    if (auths[ws].webspace !== 'custom') delete auths[ws];
                });
                Azure.storeWebsiteAuths(auths);

                // show new list
                return chooseWebsiteCoreAsync(resp.websites)
            }, err => chooseWebsiteCoreAsync(null))
        } else
            return chooseWebsiteCoreAsync(null)
    }

    function createWebsiteAsync()
    {
        var sub = getManagementCerificate()
        var m = new ModalDialog()
        var r = new PromiseInv()
        var createStorageCb = HTML.mkCheckBox(lf("create azure storage")); HTML.setCheckboxValue(createStorageCb, true);
        var createServiceBusCb = HTML.mkCheckBox(lf("create azure service bus")); HTML.setCheckboxValue(createServiceBusCb, true);

        m.add(div("wall-dialog-header", lf("create azure website")))

        var err = div(null)
        m.add(err)

        var siteName = HTML.mkTextInput("text", lf("website name"))

        m.add(div("wall-dialog-body", "https://", siteName, ".azurewebsites.net/"))

        var creating = false

        m.add(div("wall-dialog-body",
                Object.keys(allWebspaces).map(k =>
                    HTML.mkButton(lf("create in {0}", allWebspaces[k]), () => {
                        if (creating) return

                        if (!/^[a-z0-9A-Z\-]+$/.test(siteName.value))
                            err.setChildren(lf("bad site name"))
                        else {
                            sub.webspace = k
                            sub.website = siteName.value
                            err.setChildren(lf("creating, please wait..."))
                            creating = true
                            Util.httpPostJsonAsync(deployEndpoint("createwebsite"), sub).done(resp => {
                                if (resp.status == 200) {
                                    tick(Ticks.appsCreateAzureWebsite)

                                    var wa = websiteAuthFromAzure(resp.response)
                                    wa.everUsed = true
                                    Azure.storeWebsiteAuth(wa)

                                    var variables = []

                                    // add some secrets for use by the website
                                    var secrets = ["TOKEN_SECRET"]
                                    secrets.forEach(s =>
                                        variables.push({
                                            Name: s,
                                            Value: Random.uniqueId(32),
                                        }))

                                    err.setChildren(lf("creating services..."))
                                    var jobs : any = {};
                                    if (HTML.getCheckboxValue(createStorageCb))
                                        jobs.storage =
                                        deployApiAsync("createstorage", { webspace: wa.webspace, name: wa.website })
                                            .then(resp => {
                                                if (resp.status != 202) {
                                                    err.setChildren(lf("problem creating storage account: {0}", resp.response))
                                                    return new PromiseInv()
                                                }
                                                var cnt = 0;
                                                var findStorageAsync = () => {
                                                    return Promise.delay(1000)
                                                        .then(() => deployApiAsync("getstoragekeys", { name: wa.website }))
                                                        .then(resp => {
                                                            if (resp.status == 404 && cnt++ < 10)
                                                                return findStorageAsync()
                                                            if (resp.status == 200)
                                                                return resp.response

                                                            err.setChildren(lf("cannot get storage keys: {0}:{1}", resp.status, resp.response))
                                                            return new PromiseInv()
                                                        })
                                                }
                                                return findStorageAsync()
                                            })
                                            .then(str => {
                                                var m = /<Primary>([^<]+)<\/Primary>/.exec(str)
                                                if (m) {
                                                    variables.push({
                                                        Name: "AZURE_STORAGE_ACCOUNT",
                                                        Value: wa.website
                                                    })
                                                    variables.push({
                                                        Name: "AZURE_STORAGE_ACCESS_KEY",
                                                        Value: m[1]
                                                    })
                                                    return Promise.as()
                                                } else {
                                                    err.setChildren(lf("cannot find storage keys: {0}", str))
                                                    return new PromiseInv()
                                                }
                                            });
                                    if (HTML.getCheckboxValue(createServiceBusCb))
                                        jobs.namespace =
                                            deployApiAsync("createnamespace", { webspace: wa.webspace, name: wa.website })
                                            .then(resp => {
                                                if (resp.status != 200 || !resp.response.DefaultKey) {
                                                    err.setChildren(lf("cannot create service bus: {0}", resp.response))
                                                    return new PromiseInv()
                                                } else {
                                                    variables.push({
                                                        Name: "AZURE_SERVICEBUS_NAMESPACE",
                                                        Value: wa.website
                                                    })
                                                    variables.push({
                                                        Name: "AZURE_SERVICEBUS_ACCESS_KEY",
                                                        Value: resp.response.DefaultKey
                                                    })
                                                    return Promise.as()
                                                }
                                            })
                                    Promise.join(jobs)
                                    .then(() =>
                                        deployApiAsync("setazureconfig", {
                                            webspace: wa.webspace,
                                            website: wa.website,
                                            config: {
                                                AppSettings: variables,
                                                WebSocketsEnabled: true
                                            } }))
                                    .then(resp => {
                                        if (resp.status != 200) {
                                            err.setChildren(lf("cannot set config: ") + resp.response)
                                            return new PromiseInv()
                                        }
                                        wa.websocketsEnabled = true;
                                        m.dismiss()
                                        r.success(setDeploymentWebsiteAsync(wa))
                                    })
                                    .done()

                                } else {
                                    creating = false
                                    var strResp = resp.response
                                    if (typeof strResp != "string") strResp = JSON.stringify(strResp)
                                    if (resp.status == 400)
                                        err.setChildren(lf("invalid host name"))
                                    else if (resp.status == 409 && /ExtendedCode.:.03001/.test(strResp))
                                        err.setChildren(lf("limit exceeded! too many free websites in a region"))
                                    else if (resp.status == 409 && /ExtendedCode.:.54001/.test(strResp))
                                        err.setChildren(lf("website with this name already exists"))
                                    else
                                        err.setChildren(lf("code: {0}, info: {1}", resp.status, resp.response))
                                }
                            })
                        }
                    }))))

        m.add(div('wall-dialog-body', createStorageCb));
        m.add(div('wall-dialog-body', createServiceBusCb));

        m.addOk("cancel");
        m.show()

        return r
    }

/*
    export function ensureAzureDeploymentAsync()
    {
        var fail = () =>
                ModalDialog.infoAsync(lf("deployment failed"),
                            lf("please go to script properties and tap the [Azure] button"));

        var wa = Azure.getWebsiteAuthForApp(Script)
        if (!wa) return fail()

        return deployLocalWebappAsync(wa).then(v => v ? v : fail(), err => fail())
    }
*/

    export function setupAzure()
    {
        var sub = getManagementCerificate()
        var m = new ModalDialog()

        m.add(div('wall-dialog-header', "export to azure web site"));
        m.addHTML(lf("<a href='http://azure.microsoft.com/en-us/services/websites/' target='_blank'>Azure web sites</a> let you deploy and scale modern websites and web apps in seconds."));
        var err = div(null)
        m.add(err)

        if (sub) {
            m.add(div("wall-dialog-body", "active subscription: " + sub.subscriptionName + " ",
                            HTML.mkButton(lf("forget"), () => {
                                m.dismiss()
                                clearManagementCertificate()
                                setupAzure()
                            })))

        } else
            m.add(div("wall-dialog-body", "no active subscription ",
                            HTML.mkButton(lf("setup"), () => {
                                m.dismiss()
                                askManagementCerificateAsync().done(() => {
                                    setupAzure()
                                })
                            })))

        var wa = Azure.getWebsiteAuthForApp(Script)

        var changeWebsite = () => {
            m.dismiss()
            chooseWebsiteAsync().done(y => {
                if (y) setupAzure()
            }, err => {
                    if (err) isDeployError(err)
                })
        }

        var btn = HTML.mkButton(lf("change"), changeWebsite)
        btn.style.cssFloat = "right"

        m.add(div("wall-dialog-body",
                "current website: ", btn, div("whiteField", websiteBox(wa).withClick(changeWebsite))))

                /*
                !wa ? null : HTML.mkButton(lf("validate"), () => {
                    m.dismiss()
                    setDeploymentWebsiteAsync(wa).done(y => {
                        setupAzure()
                    })
                }),
                */

        if (wa) {
            m.add(div("wall-dialog-buttons",
                HTML.mkButton(lf("proxy"), () => proxySetup(wa)),
                HTML.mkButton(lf("environment"), () => envSetup(wa)),
                HTML.mkButton(lf("shell"), () => {
                    HTML.showProgressNotification(lf("loading shell logs"), true);
                    mgmtRequestAsync(wa, "combinedlogs")
                        .done(resp => {
                            var logs: LogMessage[] = [];
                            logs.push(RT.App.createInfoMessage('------- server internal logs -------'));
                            logs = logs.concat(resp.logs || []);
                            TDev.RT.App.showLog(logs);
                        });
                }),
                HTML.mkButton(lf("crashes"), () => {
                    HTML.showProgressNotification(lf("loading server crashes"), true);
                    mgmtRequestAsync(wa, "info/crashes")
                        .done(resp => {
                            var crashes = resp.crashes
                            if (resp.workers) {
                                crashes = []
                                resp.workers.forEach(r => {
                                    if (r.body && r.body.crashes)
                                        crashes.pushRange(r.body.crashes)
                                })
                            }
                            showCrashes(crashes)
                        });
                }),
                []))
        }

        m.add(div("wall-dialog-buttons",
            !wa ? null : HTML.mkButton(lf("deploy"), () => {
                m.dismiss()
                deployLocalWebappAsync(Script, wa)
                    .done(y => AppExport.showStatus(wa),
                        err => setDeploymentWebsiteAsync(wa).then(y => AppExport.showStatus(wa), err => isDeployError(err))
                    );
            }),

            HTML.mkButton(lf("dismiss"), () => {
                m.dismiss()
            })))

        m.show()
    }

    function envSetup(wa: Azure.WebsiteAuth)
    {
        getAzureConfigAsync(wa).then(cfg => {
            var m = new ModalDialog();
            m.addButtons({
                update: () => {
                    var newVars = []
                    var newS = ""
                    var numErr = 0
                    elt.value.split(/\r?\n/).forEach(line => {
                        if (/^\s*$/.test(line)) return
                        if (/^#/.test(line)) return
                        var m = /^([A-Z0-9a-z_]+)=(.*)/.exec(line)
                        if (m) {
                            newVars.push({
                                Name: m[1],
                                Value: m[2]
                            })
                        } else {
                            newS += "# Syntax error in the line below:\n"
                            numErr++
                        }
                        newS += line + "\n"
                    })
                    if (numErr > 0) {
                        elt.value = newS
                        return
                    }
                    if (wa.webspace == "custom") {
                        mgmtRequestAsync(wa, "setconfig", { AppSettings: newVars })
                        .done(() => {
                            ModalDialog.info(lf("config set!"), lf("things are good"))
                        })
                        return
                    }

                    deployApiAsync("setazureconfig", { webspace: wa.webspace, website: wa.website,
                        config: {
                            AppSettings: newVars,
                        } })
                    .done(resp => {
                        if (resp.status != 200) {
                            ModalDialog.info(lf("cannot set config"), resp.response)
                        } else {
                            // ignore errors from "exit" - it's likely to seem to have failed
                            mgmtRequestAsync(wa, "exit").done(() => {}, () => {})
                            ModalDialog.info(lf("config set!"), lf("things are good"))
                        }
                    })
                },
                cancel: () => m.dismiss()
            })
            var elt = HTML.mkTextArea("scriptText");
            elt.value = cfg.AppSettings.map(v => v.Name + "=" + v.Value).join("\n")
            m.add(elt)
            m.show();
            m.stretchDown(elt);
            m.stretchWide();
        })
        .done()
    }

    function proxySetup(wa: Azure.WebsiteAuth)
    {
        var existing = []
        Util.values(Azure.getWebsiteAuths()).forEach(wd => {
            if (wa.destinationAppUrl == wd.destinationAppUrl) {
                var m = /\/proxy\/([a-z0-9\-]+)$/.exec(wd.deploymentKey)
                if (m) existing.push(m[1])
            }
        })

        var prx = new ModalDialog();
        prx.add(div("wall-dialog-header", lf("proxy for devices")))
        if (existing.length == 0)
            prx.add(div("wall-dialog-body",
                lf("You don't have any proxies setup yet.")))
        else {
            prx.add(div("wall-dialog-body",
                lf("You have the following proxies setup: {0}", existing.join(", "))))

            prx.addHTML(lf("On device '{0}', apply the following instructions.", existing.peek()))
            addRunLocalInstructions(prx, "-c " + wa.destinationAppUrl + "-tdevmgmt-/" + wa.deploymentKey + "/ctrl/" + existing.peek())
        }


        var nameInput = HTML.mkTextInput("text", lf("device name")); nameInput.maxLength = 100;
        nameInput.placeholder = "device name"
        var problem = div(null)
        prx.add(div("wall-dialog-body", lf("Create new device proxy: "), nameInput, HTML.mkButton(lf("create"),
            () => {
                if (!/^[a-z0-9\-]+$/.test(nameInput.value))
                    problem.setChildren([lf("Only lower-case letters, numbers and dashes allowed in proxy name.")])
                else if (/\/proxy/.test(wa.deploymentKey))
                    problem.setChildren([lf("You cannot setup a proxy from another proxy.")])
                else {
                    Azure.storeWebsiteAuth({
                        key: wa.key + ":" + nameInput.value,
                        webspace: "custom",
                        website: wa.website + " :: " + nameInput.value,
                        destinationAppUrl: wa.destinationAppUrl,
                        everUsed: true,
                        deploymentKey: wa.deploymentKey + "/proxy/" + nameInput.value,
                        websocketsEnabled: true,
                    })
                    proxySetup(wa)
                }
            }), problem))

        prx.addOk(lf("dismiss"))
        prx.show()
    }

    export function showStatus(wa: Azure.WebsiteAuth) {
        var m = new ModalDialog();
        var sml = div("floatingSmilie", ":)")
        m.add(sml)
        Util.setTimeout(1500, () => {
        sml.setChildren(";)")
            Util.setTimeout(600, () => {
            sml.setChildren(":)")
            })
        })
        wa.destinationAppUrl = wa.destinationAppUrl.replace(/\/*$/, "/")
        m.add(div("wall-dialog-header", lf("hooray! your web site is deployed")));
        m.add(div('share-url', HTML.mkA('', wa.destinationAppUrl, 'tdwebapp', wa.destinationAppUrl)));
        m.addOk("close", () => {
            m.dismiss();
        });
        m.show();
    }

    function showCrashes(crashes:any[])
    {
        var m = new ModalDialog()
        var boxes = crashes.map(c => {

            var nameBlock = div("sdName", c.msg);
            var hd = div("sdNameBlock", nameBlock);
            var icon = div("sdIcon", HTML.mkImg("svg:trash,white"));
            icon.style.background = "#ccff00";

            var numbers = div("sdNumbers");
            var addInfoInner = div("sdAddInfoInner", Util.timeSince(c.time/1000) + " at " + c.url);
            var pubId = div("sdAddInfoOuter", addInfoInner);
            var res = div("sdHeaderOuter", div("sdHeader", icon, div("sdHeaderInner", hd, pubId, numbers)));
            return res
                .withClick(() => {
                    m.dismiss()
                    TheEditor.showStackTrace(c.stack)
                })
        })
        m.choose(boxes)
    }

    export function getCommonOptions(app: AST.App, more:AST.Apps.DeploymentOptions)
    {
        var relId = defaultRelId
        var m = /\/(\d+-[a-f0-9\.]+-[^\/]+)\//.exec(baseUrl)
        if (m) relId = m[1]
        var relOverride = ""
        m = /deploymentRelID=(\d+-[a-f0-9\.]+-[a-z0-9]+)/i.exec(document.URL)
        if (m)
            relOverride = m[1]
        var options: AST.Apps.DeploymentOptions = {
            userId: Cloud.getUserId(),
            relId: relOverride || relId,
            baseUrl: baseUrl,
            azureSite: Azure.getDestinationAppUrl(app),
            apiKeys: {},
            failOnError: true,
        };
        if (!relOverride && /\/localhost[:\/]/.test(baseUrl))
            options.downloadLocalFilesFrom = baseUrl
        Object.keys(more).forEach(k => options[k] = more[k])

        return options
    }

    export function addRunLocalInstructions(m : ModalDialog, cmd : string = "") {
        m.addHTML("<b>how to run TouchDevelop locally</b>")
        m.addHTML("<ol>" +
            "<li>" + lf("install {0}", "<a href='http://nodejs.org/' target='_blank'>node.js</a>") + "</li>" +
            "<li>" + lf("create a new empty folder and open a command prompt in it") + "</li>" +
            "<li>" + lf("run the following commands:") + "</li></ol>");

        var npm = HTML.mkTextArea("shell")
        npm.value = "npm install -g http://aka.ms/touchdevelop.tgz\ntouchdevelop " + cmd
        npm.readOnly = true;
        Util.selectOnFocusTextArea(npm);
        m.add(npm);
    }

    export function deployCordova(app: AST.App, baseScriptId: string) {
        if (Cloud.anonMode(lf("export to cordova app"))) return;

        if (!/^http:/.test(baseUrl)) {
            var info = ModalDialog.info(lf("need local editor"),
                lf("To export and build Cordova apps you need to run TouchDevelop from your machine."), "")
            addRunLocalInstructions(info);
            info.addOk("ok", null, "", [
                HTML.mkButton(lf("long version"), () => Editor.goToTopic("export to Cordova"))
            ])
            return
        }

        if (!LocalShell.mgmtUrl("")) {
            var info = ModalDialog.info(lf("deployment key missing"),
                lf("We don't know the key to talk to local TouchDevelop server. Did you paste the link correctly?"))
            info.add(Editor.mkHelpLink("export to Cordova"))
            addRunLocalInstructions(info);
            return
        }

        var cordovaOptions = app.editorState.cordova || TDev.AST.Apps.cordovaDefaultOptions();
        // test if user allowed to export app
        if (baseScriptId && baseScriptId != "unknown") {
            if (cordovaOptions.canExport === undefined) {
                ProgressOverlay.lockAndShowAsync(lf("preparing export (one time setup)"))
                    .then(() => Cloud.getPublicApiAsync(baseScriptId + "/canexportapp/" + Cloud.getUserId()))
                    .done((res: JsonCanExportApp) => {
                        cordovaOptions.canExport = !!res.canExport;
                        app.editorState.cordova = cordovaOptions;
                        ProgressOverlay.hide();
                        deployCordova(app, baseScriptId);
                    }, e => {
                        ProgressOverlay.hide();
                        ModalDialog.info(lf("export to app failed"),
                            lf("We could not query the status of the script. Are you connected to internet?"))
                            .add(Editor.mkHelpLink("export to cordova"))
                    return;
                    });
                return;
            }
            else if (!cordovaOptions.canExport) {
                ModalDialog.info(lf("export not allowed by authors"),
                    lf("We're sorry, one or more authors from the base script have dissallowed the export of this script."))
                    .add(Editor.mkHelpLink("export to cordova"))
            return;
            }
        }

        var v = new TDev.AST.PlatformDetector();
        v.requiredPlatform = PlatformCapability.CordovaApp;
        v.run(app);
        if (v.errors) {
            ModalDialog.ask(lf("Your script uses features not supported in Cordova. Do you want to change the platform to detect those features?"), lf("set platform to Cordova app"), () => {
                app.setPlatform(PlatformCapability.CordovaApp);
                TheEditor.dismissSidePane();
                TheEditor.queueNavRefresh();
            });
            return;
        }

        internalDeployCordova(app, baseScriptId, cordovaOptions);
    }

    function internalDeployCordova(app: AST.App, baseScriptId: string, cordovaOptions : TDev.AST.Apps.CordovaOptions) {

        var dir = app.localGuid + "/cordova"
        var options = getCommonOptions(app, {
            cordova: cordovaOptions,
            filePrefix: dir + "/www/"
        })
        // compile first,
        AST.TypeChecker.tcApp(app)
        var compiled = AST.Compiler.getCompiledScript(app, {
            packaging: true,
            artResolver: function (u) { return ArtUtil.artUrl(u, false); },
            javascript: true,
            scriptId: options.scriptId,
            authorId: options.userId,
            scriptGuid: app.localGuid,
            azureSite: options.azureSite,
        });

        var md = new ModalDialog();
        md.add(div('wall-dialog-header', lf("export to cordova app")));
        md.addHTML(lf("<a href='http://cordova.apache.org/' target='_blank'>Apache Cordova</a> let you build cross-platform mobile applications."));

        md.add(div('wall-dialog-body', Object.keys(options.cordova.platforms).map(p => {
            var platform = options.cordova.platforms[p];
            var buildCb = HTML.mkCheckBox(p, (v) => platform.build = v, !!platform.build); buildCb.style.display = 'inline-block';
            return buildCb;
        })));

        var domainInput = HTML.mkTextInput("text", lf("com.app.awesome.my")); domainInput.value = options.cordova.domain; domainInput.maxLength = 256; domainInput.classList.add("wall-dialog-field-input");
        var webInput = HTML.mkTextInput("text", lf("app web site")); webInput.value = options.cordova.website; webInput.maxLength = 256; webInput.classList.add("wall-dialog-field-input");
        var emailInput = HTML.mkTextInput("text", lf("author email")); emailInput.value = options.cordova.email; emailInput.maxLength = 256; emailInput.classList.add("wall-dialog-field-input");

        md.add(div('wall-dialog-body', span("wall-dialog-field-label", lf("app reverse domain (required)")), domainInput));

        var apiKeys = compiled.packageResources.filter(r => r.kind == "key");
        var keyInputs = [];
        if (apiKeys.length > 0) {
            var online = Cloud.isOnline();
            apiKeys.forEach((pk: PackageResource) => {
                var keyInput = HTML.mkTextInput("text", lf("Enter the api key (required)"));
                keyInput.value = options.apiKeys[pk.url] || "";
                keyInput.maxLength = 256;
                keyInput.classList.add("wall-dialog-field-block");
                keyInput.setAttribute("data-api-key-url", pk.url);
                keyInput.readOnly = online;
                keyInputs.push(keyInput);
                md.add(div("wall-dialog-body", HTML.mkA("", pk.url, '_blank', pk.url), keyInput));
            });
            if (online && keyInputs.some(ki => !ki.value)) {
                Cloud.getUserApiKeysAsync()
                    .done((keys: TDev.RT.JsonKey[]) => {
                        var values: StringMap<string> = {};
                        keys.forEach(k => values[k.uri] = k.value);
                        keyInputs.forEach(ki => {
                            if (!ki.value) ki.value = values[ki.getAttribute("data-api-key-url")] || "";
                            ki.readOnly = false;
                        });
                    }, e => {
                        keyInputs.forEach(ki => { ki.readOnly = false; });
                    });
            }
        }

        md.add(div('wall-dialog-buttons',
            HTML.mkButton(lf("build"), () => {
                tick(Ticks.cordovaBuild);

                options.cordova.website = webInput.value || "";
                options.cordova.email = emailInput.value || "";
                options.cordova.domain = domainInput.value || "";
                keyInputs.forEach(ki => { options.apiKeys[ki.getAttribute('data-api-key-url')] = ki.value });
                app.editorState.cordova = options.cordova;

                md.dismiss();
                buildCordovaAsync(app, dir, options);
            }),
            HTML.mkButton(lf("dismiss"), () => {
                md.dismiss();
            })
        ));

        md.add(div('wall-dialog-header', lf("more options...")));
        md.add(div('wall-dialog-body', span("wall-dialog-field-label", lf("author web site")), webInput));
        md.add(div('wall-dialog-body', span("wall-dialog-field-label", lf("author email")), emailInput));

        md.setScroll();
        md.show();

        if (!webInput.value || !emailInput.value || !domainInput.value) {
            if (!webInput.value) webInput.readOnly = true;
            if (!emailInput.value) emailInput.readOnly = true;
            if (!domainInput.value) domainInput.readOnly = true;
            Cloud.getUserSettingsAsync().then((settings: TDev.Cloud.UserSettings) => {
                if (settings && settings.website && !webInput.value) webInput.value = settings.website;
                if (!domainInput.value) domainInput.value = "com.app." + Cloud.getUserId();
                if (settings && settings.email && !emailInput.value) emailInput.value = settings.email;
            }, e => { })
            .done(() => {
                webInput.readOnly = false;
                emailInput.readOnly = false;
                domainInput.readOnly = false;
            });
        }
    }

    var jimpInstalled = false;
    function buildCordovaAsync(app: AST.App, dir: string, options: AST.Apps.DeploymentOptions) : Promise {
        var md = new ModalDialog();
        md.add(div('wall-dialog-header', lf("cordova export")));
        var progressDiv = div('wall-dialog-body', lf("exporting your script to cordova apps...")); md.add(progressDiv);
        var cmdDiv = div('wall-dialog-body'); md.add(cmdDiv);
        md.add(div('wall-dialog-buttons',
                HTML.mkButton(lf("open build folder"), () => LocalShell.mgmtRequestAsync("plugin/open", { url: dir })),
                HTML.mkButton(lf("close"), () => md.dismiss())
            ));
        md.addLog();
        var logger = TDev.RT.App.create_logger("cordova");

        var cancelled = false;
        md.onDismiss = () => {
            cancelled = true;
        }
        md.fullWhite();
        md.setScroll();
        md.show();

        var instructions: AST.Apps.DeploymentInstructions;
        function status(cmd: string) {
            cmdDiv.setChildren([">" + cmd]);
            logger.info(cmd);
        }

        function cli(descr: string, command: string, cwd: string = undefined, ignoreErrors = false): Promise {
            if (cancelled) return new PromiseInv();
            status(command);
            return LocalShell.mgmtRequestAsync(cwd ? "plugin/shell" : "runcli", {
                command: command,
                cwd: cwd
            }).then(resp => {
                if (resp.code) logger.info(lf("{0} exited with {1}", command, resp.code));
                if (resp.stdout) logger.debug(resp.stdout);
                if (resp.stderr) {
                    if (ignoreErrors) logger.debug(resp.stderr);
                    else logger.error(resp.stderr);
                }
                return resp;
            });
        }

        function mkDir(path:string, mode: string) {
            if (cancelled) return new PromiseInv();
            if (!path) return Promise.as();
            logger.debug('mkdir "' + path + '"');
            return LocalShell.mgmtRequestAsync("plugin/mkdir", {
                minVersion: Runtime.shellVersion,
                name: path.replace('\\','/'),
                mode: mode
            });
        }

        function writeFiles(files: TDev.AST.Apps.DeploymentFile[]) {
            if (cancelled) return new PromiseInv();

            files = files.filter(f => !!f);
            if (files.length == 0) return Promise.as();

            files.forEach(f => logger.debug(lf("writing {0}", f.path)));
            return LocalShell.mgmtRequestAsync("writefiles", {
                minVersion: Runtime.shellVersion,
                files: files
            }).then(resp => {
                if (resp.status != "ok") {
                    logger.error(resp.message)
                    return new PromiseInv();
                }
            })
        }

        function reverseDomain(web: string) {
            var parts = /^(https?:\/\/)?([^\/]+)\/?/i.exec(web);
            if (!parts || !parts[2]) return "com.insert.your.domain.here";
            else {
                return parts[2].split('.').reverse().join('.');
            }
        }

        var configXml: string[] = [
'<?xml version="1.0" encoding="utf-8"?>',
            Util.fmt('<widget id="{0:q}" version="0.0.1" xmlns="http://www.w3.org/ns/widgets" xmlns:cdv="http://cordova.apache.org/ns/1.0">',
                options.cordova.domain || reverseDomain(options.cordova.website)),
Util.fmt('    <name>{0:q}</name>',  Script.getName()),
'    <description>',
Util.htmlEscape(Script.getDescription()),
'    </description>',
options.cordova.email || options.cordova.website ? Util.fmt('    <author email="{0:q}" href="{1:uri}"></author>', options.cordova.email, options.cordova.website) : "",
'    <content src="index.html" />',
'    <access origin="*" />',
'    <preference name="windows-target-version" value="8.1" />',
];

        return LocalShell.mgmtRequestAsync("stats")
        .then(resp => {
            if (!resp) throw new Error("cannot talk to local proxy") // unlikely
        }, err => {
            if (err.status == 403)
                throw new Error(lf("the deployment key was rejected by the local proxy"))
            else {
                addRunLocalInstructions(md);
                throw new Error(lf("the local proxy doesn't seem to be running"))
            }
        })
        .then(() => AST.Apps.getDeploymentInstructionsAsync(app, options))
        .then((ins: AST.Apps.DeploymentInstructions) => {
            instructions = ins;
            return cli(lf("checking cordova..."), "cordova --version", undefined, true);
        }).then(resp => resp.code == 0 && /4\./.test(resp.stdout) ? Promise.as() :
            cli(lf("installing cordova..."), "npm install -g cordova"))
        .then(() => {
            var runNpm = !jimpInstalled;
            jimpInstalled = true;
            return runNpm ? cli(lf("installing jimp..."), "npm install jimp") : Promise.as();
        }).then(() => mkDir(dir, "777"))
        .then(() => cli(lf("creating project"), "cordova create " + dir, undefined, true))
        .then(() => Promise.sequentialMap(Object.keys(instructions.cordova.platforms),
            platform => cli(lf("adding platforms"), "cordova platform add " + platform, dir, true)))
        .then(() => Promise.sequentialMap(instructions.cordova.plugins,
            plugin => cli(lf("adding plugins"), "cordova plugin add " + plugin, dir)))
        // first write icon and generate all needed icons
        .then(() => writeFiles(instructions.files.filter(f => !f.isUnused)))
        .then(() => {
            var ficon = instructions.files.filter(f => /^icon$/i.test(f.sourceName))[0]
            var fsplash = instructions.files.filter(f => /^splash$/i.test(f.sourceName))[0];
            if (!ficon && !fsplash) return Promise.as();
            else {
                // fetch mime type of images
                status("creating icons and splash screens");
                if (ficon)
                    ficon.path = dir + "/res/icon.png";
                if (fsplash)
                    fsplash.path = dir + "/res/screen/splash.jpeg";
                var targetIcons : any[] = [];
                var targetSplash: any[] = [];
                Object.keys(instructions.cordova.platforms)
                    .forEach(p => {
                        var pa = instructions.cordova.platforms[p];
                        configXml.push(Util.fmt('    <platform name="{0:q}">', p));
                        if(ficon)
                            targetIcons = targetIcons.concat(pa.icons.map(icon => {
                                configXml.push(Util.fmt('        <icon src="{0}" {1}{2}/>', icon.src,
                                    !icon.density ? Util.fmt('width="{0}" height="{1}"', icon.width, icon.height || icon.width) : " ",
                                    icon.density ? Util.fmt('density="{0}"', icon.density) : " "
                                    ));
                                return <any>{
                                        path: dir + "/" + icon.src,
                                        width: icon.width,
                                        height: icon.height || icon.width
                                    }
                            }))
                        if (fsplash && pa.splash) {
                            targetSplash = targetSplash.concat(pa.splash.map(icon => {
                                configXml.push(Util.fmt('        <splash src="{0}" {1}{2}/>', icon.src,
                                    !icon.density ? Util.fmt('width="{0}" height="{1}"', icon.width, icon.height || icon.width) : " ",
                                    icon.density ? Util.fmt('density="{0}"', icon.density) : " "
                                    ));
                                return <any>{
                                    path: dir + "/" + icon.src,
                                    width: icon.width,
                                    height: icon.height || icon.width
                                }
                            }))
                        }
                        configXml.push('    </platform>');;
                    })
                return writeFiles([ficon, fsplash])
                    .then(() => ficon ? LocalShell.mgmtRequestAsync("resizeimages", {
                        minVersion: Runtime.shellVersion,
                        src: ficon.path,
                        files: targetIcons
                    }) : Promise.as())
                    .then(() => fsplash ? LocalShell.mgmtRequestAsync("resizeimages", {
                        minVersion: Runtime.shellVersion,
                        src: fsplash.path,
                        files: targetSplash
                    }) : Promise.as());
            }
        })
        .then(() => {
            configXml.push('</widget>')
            var xml = configXml.join("\n");
            return writeFiles([{ path: dir + "/config.xml", content: xml}]);
        })
        .then(() => Promise.sequentialMap(instructions.cordova.runs, run => cli(lf("building and launching apps"), "cordova run " + run, dir, true)))
        .then(() => {
            status(lf("Hooray! build completed!"));
        }, e => {
            var msg = e.message || (e + "")
            status(lf("build error: {0}", msg));
        });
    }

    export function deployLocalWebappAsync(app:AST.App, wa:Azure.WebsiteAuth)
    {
        if (!wa) return Promise.wrapError("no auth")

        var options = getCommonOptions(app, {
            compileServer: true,
            filePrefix: "static/",
        })

        var md = ModalDialog.info(lf("deploying script"), lf("installing dependencies, this might take some minutes..."), lf("stop"))

        return AST.Apps.getDeploymentInstructionsAsync(app, options)
        .then((ins:AST.Apps.DeploymentInstructions) =>
            mgmtRequestAsync(wa, "deploy", {
                minVersion: Runtime.shellVersion,
                files: ins.files
            }).then(resp => {
                md.dismiss()
                if (resp.status == "ok") {
                    tick(Ticks.appsDeployWebsite)
                } else {
                    ModalDialog.info(lf("deployment error - check logs"), resp.message)
                    return new PromiseInv();
                }
            }))
    }

    export function testDeployment(id:string, options:AST.Apps.DeploymentOptions)
    {
        AST.loadScriptAsync(World.getAnyScriptAsync, id)
        .then((resp:AST.LoadScriptResult) => {
            console.log(resp)
            var opts = getCommonOptions(Script, options || {});
            opts.failOnError = false
            return AST.Apps.getDeploymentInstructionsAsync(Script, opts)
                .then(r => {
                    setGlobalScript(resp.prevScript)
                    return r
                })
        })
        .then((ins:AST.Apps.DeploymentInstructions) => {
            console.log(ins)
        })
        .done()
    }

}
