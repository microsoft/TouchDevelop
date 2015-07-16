///<reference path='refs.ts'/>

module TDev.Meta {
    var allowedAsts = {}

    export function astOfAsync(rt:Runtime, name:string) : Promise
    {
        if (!name) return Promise.as(undefined);
        if (name == "api") return Promise.as(AST.Json.getApis());

        var appToDump:AST.App = null;
        var libs = rt.current.libs;
        if (!libs.scriptName || !libs.scriptId) return Promise.as(undefined);

        if (libs.scriptId == libs.topScriptId) {
            if (name == Script.localGuid ||
                (ScriptEditorWorldInfo.status === "published" && name == ScriptEditorWorldInfo.baseId)) {
                appToDump = Script;
            }

            if (!appToDump)
                Script.libraries().forEach((l) => {
                    if (l.pubid && name == l.pubid) appToDump = l.resolved;
                    if (l.guid && name == l.guid) appToDump = l.resolved;
                })

            if (appToDump)
                return Promise.as(AST.Json.dump(appToDump));
        }

        var textPromise:Promise;

        if (/-/.test(name)) {
            textPromise = World.getInstalledScriptAsync(name)
                .then((text) => {
                    if (!text) return undefined;
                    var key = "read/" + libs.scriptName + "/" + name;
                    if (allowedAsts[key] || rt.runningPluginOn == name || rt.tutorialObject == name) return text;
                    var app = AST.Parser.parseScript(text)
                    var r = new PromiseInv();
                    var m = ModalDialog.ask("Script '" + libs.scriptName + "' is trying to read the source code of script '" +
                                                app.getName() + "'", "allow source access",
                                                () => {
                                                    allowedAsts[key] = true;
                                                    r.success(text)
                                                    r = null;
                                                })
                    m.onDismiss = () => {
                        if (r) r.success(undefined);
                        r = null;
                    };
                    return r;
                })
        } else {
            textPromise = ScriptCache.getScriptAsync(name);
        }

        return textPromise.then((text) => {
            var loadIdAsync = (id:string) => {
                if (id == "") return Promise.as(text);
                if (/-/.test(id))
                    return World.getInstalledScriptAsync(id);
                else
                    return ScriptCache.getScriptAsync(id);
            }
            if (!text) return undefined;
            return AST.loadScriptAsync(loadIdAsync).then((tcRes:AST.LoadScriptResult) => {
                try {
                    return AST.Json.dump(Script);
                } finally {
                    setGlobalScript(tcRes.prevScript);
                }
            })
        })
    }

    export function searchArtAsync(terms: string, type: string) { // ArtInfo[]
        if (!terms || Cloud.isOffline()) return Promise.as([]);
        
        if (Cloud.isRestricted()) {
            var url = "art?q=" + encodeURIComponent(terms);
            if (type) url += "&type=" + encodeURIComponent(type);
            return Cloud.getPrivateApiAsync(url)
                .then((result: JsonList) => result.items.map(item => Browser.TheHost.getArtInfoById(item.id)));
        }
        
        var skip = 0;
        var top = 50;
        var indexName = "art1";
        var apiKey = Cloud.config.searchApiKey;
        var serviceUrl = Cloud.config.searchUrl;
        var query = terms.split(' ').map(term => /sound|picture|document/i.test(term) ? undefined : term + "*").filter(s => !!s).join("+");
        var filter = type ? "type eq '" + type + "'" : /sound/i.test(terms) ? "type eq 'sound'" : /picture/i.test(terms) ? "type eq 'picture'" : /document/i.test(terms) ? "type eq 'document'" : undefined;
        var scoringProfile = "editorpics";

        var queryUrl = serviceUrl + "/indexes/" + indexName + "/docs?api-version=2014-07-31-Preview&$select=id,type&search=" + encodeURIComponent(query) + "&$top=" + top;
        if (scoringProfile)
            queryUrl += "&scoringProfile=" + encodeURIComponent(scoringProfile);
        if (filter)
            queryUrl += "&$filter=" + encodeURIComponent(filter);
        if(skip)
            queryUrl += "&$skip=" + skip;
        var request = RT.WebRequest.mk(queryUrl, undefined);
        request.set_header("api-key", apiKey);
        request.set_header("accept", "application/json");
        request.show_notifications(false);
        return request.sendAsync().then((response: RT.WebResponse) => {
            var js = response.content_as_json();
            if (js) {
                var results = js.value();
                if (results && results.value)
                    return results.value.map(result => Browser.TheHost.getArtInfoById(result.id));
            }
            return [];
        });
    }

    export interface ChooseArtPictureOptions {
        title?: string;
        initialQuery?: string;
        buttons?: StringMap<() => void>
    }

    export function chooseArtPictureAsync(options: ChooseArtPictureOptions = {}) { // Promise JsonArt
        return new Promise((onSuccess, onError, onProgress) => {
            var m = new ModalDialog();
            var art: JsonArt = undefined;
            m.onDismiss = () => onSuccess(art);
            var converter = (s: Browser.ArtInfo) => {
                return s.mkSmallBoxNoClick().withClick(() => {
                    s.getJsonAsync()
                    .done(() => {
                        art = s.art;
                        m.dismiss();
                     });
                });
            };
            if (!options.buttons) options.buttons = {};
            var customButtons = [HTML.mkButton(lf("upload picture"), () => {
                m.onDismiss = undefined;
                ArtUtil
                    .uploadPictureDialogAsync()
                    .done((a) => onSuccess(a));
            })]
            if (options.buttons)
                Object.keys(options.buttons)
                    .forEach(k => customButtons.push(HTML.mkButton(k, () => { m.dismiss(); options.buttons[k](); })));

            var queryAsync = (terms: string) => searchArtAsync(terms, "picture")
                .then((itms: Browser.ArtInfo[]) => itms.map(itm => converter(itm)).filter(itm => itm != null));
            m.choose([], {
                queryAsync: queryAsync,
                header: options.title,
                searchHint: lf("Search..."),
                initialQuery: options.initialQuery,
                initialEmptyQuery: !options.initialQuery,
                custombuttons : customButtons
            });
        });
    }

    export interface ChooseListOptions extends ModalChooseOptions {
    }

    export function chooseListAsync(options: ChooseListOptions = {}): Promise {
        var r = new PromiseInv();

        Browser.TheHost.getLocationList("me/channels?count=100",(itms: Browser.BrowserPage[], cont: string) => {
            var m = new ModalDialog();
            var selected = false;
            var converter = (s: Browser.ChannelInfo) => {
                return s.mkSmallBoxNoClick().withClick(() => {
                    selected = true;
                    m.dismiss();
                    r.success(s);
                });
            };

            var boxes = []
            for (var i = 0; i < itms.length; ++i) {
                var p = itms[i];
                if (p instanceof Browser.ChannelInfo) {
                    var s = <Browser.ChannelInfo>p;
                    var b = converter(s);
                    if (!!b) boxes.push(b);
                }
            }

            m.onDismiss = () => {
                if (!selected) r.success(null)
            };
            m.choose(boxes, options)
        }, true);

        return r;
    }

    export interface ChooseGroupOptions extends ModalChooseOptions
    {
    }

    export function chooseGroupAsync(options:ChooseGroupOptions):Promise
    {
        var r = new PromiseInv();

        Browser.TheHost.getLocationList("me/groups?count=100", (itms:Browser.BrowserPage[], cont:string) => {
            var m = new ModalDialog();
            var selected = false;
            var converter = (s : Browser.GroupInfo) => {
                return s.mkSmallBoxNoClick().withClick(() => {
                        selected = true;
                        m.dismiss();
                        r.success(s);
                    });
            };

            var boxes = []
            for(var i = 0; i < itms.length; ++i) {
                var p = itms[i];
                if (p instanceof Browser.GroupInfo) {
                    var s = <Browser.GroupInfo>p;
                    var b = converter(s);
                    if (!!b) boxes.push(b);
                }
            }

            m.onDismiss = () => {
                if (!selected) r.success(null)
            };
            m.choose(boxes, options)
        }, true);

        return r;
    }

    export interface ChooseScriptOptions extends ModalChooseOptions
    {
        searchPath?:string;
        filter?:(s:Browser.ScriptInfo)=>boolean;
        maxItems?:number;
    }

    export function chooseScriptAsync(options:ChooseScriptOptions):Promise
    {
        var r = new PromiseInv();

        Browser.TheHost.getLocationList("recent-scripts", (itms:Browser.BrowserPage[], cont:string) => {
            var m = new ModalDialog();
            var selected = false;

            var converter = (s : Browser.ScriptInfo) => {
                if (!options.filter || options.filter(s))
                    return s.mkSmallBoxNoClick().withClick(() => {
                        selected = true;
                        m.dismiss();
                        r.success(s);
                    });
                else return null;
            };

            var boxes = []
            var maxCount = options.maxItems || 50;
            for(var i = 0; i < itms.length && boxes.length < maxCount; ++i) {
                var p = itms[i];
                if (p instanceof Browser.ScriptInfo) {
                    var s = <Browser.ScriptInfo>p;
                    var b = converter(s);
                    if (!!b) boxes.push(b);
                }
            }

            if (options.searchPath)
                options.queryAsync = (terms : string) => {
                    return new Promise((onSuccess, onError, onProgress) => {
                        Browser.TheHost.getLocationList(options.searchPath + encodeURIComponent(terms),
                            (itms:Browser.BrowserPage[], cont:string) => {
                                var bxs = [];
                                itms.forEach((itm) => {
                                    if (itm instanceof Browser.ScriptInfo) {
                                        var b = converter(<Browser.ScriptInfo>itm);
                                        if (!!b)
                                            bxs.push(b);
                                    }
                                });
                                onSuccess(bxs);
                            }, true);
                    });
                };

            m.onDismiss = () => {
                if (!selected) r.success(null)
            };

            m.choose(boxes, options)
        });

        return r;
    }

    function currentGuids()
    {
        var r = {}
        r[Script.localGuid] = true;
        Script.libraries().forEach((l) => {
            if (l.guid) r[l.guid] = true;
        })
        return r;
    }

    export function pickScriptAsync(rt:Runtime, mode:string, message:string):Promise {
        var options:ChooseScriptOptions = {}
        var libs:any = {}
        var scriptName = ""
        if (rt) {
            libs = rt.current.libs;
            if (!libs.scriptName || !libs.scriptId) return Promise.as(undefined);
            scriptName = libs.scriptName
        } else {
            scriptName = Script.getName() + " (" + Script.localGuid + ")"
        }

        var forbidden = currentGuids()
        options.filter = (s) => !s.getGuid() || !forbidden[s.getGuid()];

        var topHd = "";
        if (mode == "read") {
            topHd = "pick a script for '" + Script.getName() + "' to load:";
            options.filter = null; // any script goes
        } else if (mode == "write") {
            // TODO [new script]
            topHd = "save results of '" + Script.getName() + "' to:";
        } else if (mode == "read-write") {
            topHd = "pick a script for '" + Script.getName() + "' to modify:";
        } else {
            return Promise.as(undefined)
        }

        options.header = [div(null, topHd),
                          div("small", message),
                          div("small", "Current script: " + scriptName)]

        return chooseScriptAsync(options).then((s:Browser.ScriptInfo) => {
            if (!s) return undefined;
            if (s.getGuid()) {
                mode.split(/-/).forEach((k) => {
                    allowedAsts[k + "/" + scriptName + "/" + s.getGuid()] = true;
                })
                return s.getGuid();
            } else return s.publicId;
        })
    }

    function roundTrip(text:string): string
    {
        var app = AST.Parser.parseScript(text)
        return app.serialize()
    }

    export interface PackageScriptOptions {
    }

    export function packageScriptAsync(rt : Runtime, id : string, options : TDev.AST.Apps.DeploymentOptions) {
        if (currentGuids()[id])
            Util.userError(lf("script access denied"));
        if (rt.runningPluginOn != id)
            Util.userError(lf("invalid script id for packaging"))

        return World.getInstalledScriptAsync(id).then(text => {
            if (!text) Util.userError(lf("no such script {0}", id))
            var app1 = AST.Parser.parseScript(text)
            var dep = AppExport.getCommonOptions(app1, <TDev.AST.Apps.DeploymentOptions>options);
            return TDev.AST.Apps.getDeploymentInstructionsAsync(app1, dep);
        });
    }

    export function saveAstAsync(rt:Runtime, id:string, ast:any):Promise {
        if (currentGuids()[id])
            Util.userError(lf("script access denied"));

        var libs = rt.current.libs;
        if (!libs.scriptName || !libs.scriptId)
            Util.userError(lf("cannot determine current script"));

        var key = "write/" + libs.scriptName + "/" + id;
        if (!allowedAsts[key] && rt.runningPluginOn != id)
            Util.userError(lf("permission denied"));

        try {
            var str = AST.Json.serialize(ast);
            var app0 = AST.Parser.parseScript(str)

        } catch (e) {
            Util.userError(lf("invalid AST: {0}", e.message))
        }

        var r = new PromiseInv()

        var saveIt = () => {
            r.success(World.getInstalledHeaderAsync(id).then((hd:Cloud.Header) => {
                if (!hd) Util.userError(lf("no such script {0}", id))
                return World.updateInstalledScriptAsync(hd, str, null)
            }))
        }

        World.getInstalledScriptAsync(id).done(text => {
            if (!text) Util.userError(lf("no such script {0}", id))
            var app1 = AST.Parser.parseScript(text)

            AST.Diff.diffApps(app1, app0);
            var isOk = false
            var m:ModalDialog = ScriptProperties.showDiff(Promise.as(app0), {
                "accept": () => {
                    isOk = true
                    m.dismiss()
                },
                "cancel": () => {
                    isOk = false
                    m.dismiss()
                },
            })
            m.onDismiss = () => {
                if (isOk) saveIt();
                else rt.stopAsync().done();
            }
        })

        return r
    }

    export function deploymentSettingsAsync(rt:Runtime, id:string):Promise
    {
        if (rt.runningPluginOn != id)
            Util.userError(lf("invalid script id for deployment settings"))
        return World.getInstalledEditorStateAsync(id).then(es => {
            if (!es) return null
            var aes:AST.AppEditorState = JSON.parse(es)
            if (!aes.deployWebsite)
                return null
            var obj = Azure.getWebsiteAuth(aes.deployWebsite)
            if (!obj) return null
            return {
                kind: "azure-website",
                webspace: obj.webspace,
                website: obj.website,
                url: obj.destinationAppUrl,
            }
        })
    }
}
