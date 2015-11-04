///<reference path='refs.ts'/>

module TDev.AST.Apps {
    export interface CordovaPlatformOptions {
        build: boolean;
        runs: string[];
    }

    export interface CordovaOptions {
        email: string;
        website: string;
        domain: string;
        platforms: TDev.StringMap<CordovaPlatformOptions>;
        canExport?: boolean;
    }

    export function cordovaDefaultOptions() : CordovaOptions {
        var opts = <CordovaOptions>{
            email: "",
            website: "",
            domain: "",
            platforms: {}
        }
        Object.keys(cordovaPlatforms).forEach(p => {
            if (!!cordovaPlatforms[p].build) {
                opts.platforms[p] = <CordovaPlatformOptions>{
                    build: !!cordovaPlatforms[p].build,
                    runs: cordovaPlatforms[p].runs || [p]
                }
            }
        });
        return opts;
    }

    export interface DeploymentOptions
    {
        relId?: string;
        downloadLocalFilesFrom?: string;
        compileServer?: boolean;
        skipClient?: boolean;
        userId?: string;
        scriptId?: string;
        filePrefix?: string;
        baseUrl?: string;
        azureSite?: string;
        cordova?: CordovaOptions;
        runtimeFlags?: string;
        failOnError? : boolean;
    }

    export interface DeploymentFile
    {
        path: string;
        // either url or content is present
        url?: string;
        content?: string;
        sourceName?: string;
        kind?: string;
        isUnused?: boolean;
    }

    export interface JsonCordovaImage {
        src: string;
        width: number;
        height?: number;
        density?: string;
    }

    export interface JsonCordovaPlatform {
        build?: boolean;
        res?: string;
        runs?: string[];
        icons: JsonCordovaImage[];
        splash?: JsonCordovaImage[];
    }

    export interface CordovaInstructions
    {
        email?: string;
        website?: string;
        domain?: string;

        plugins: string[];
        platforms: TDev.StringMap<JsonCordovaPlatform>;
        runs: string[];
    }

    export interface DeploymentInstructions
    {
        meta: any;
        files: DeploymentFile[];
        packageResources?: PackageResource[];
        cordova?: CordovaInstructions;
        error? : string;
    }

    export function getDeploymentInstructionsAsync(app:AST.App, options:DeploymentOptions) : Promise
    {
        var html:string = (<any>TDev).webappHtml;

        if (!options.userId) options.userId = "unknown"
        if (!options.filePrefix) options.filePrefix = ""
        var isCloud = options.compileServer && (options.skipClient || app.isCloud);
        var opts: CompilerOptions = {
            packaging: true,
            javascript: true,  // always on for compiled web apps
            scriptId: options.scriptId,
            authorId: options.userId,
            scriptGuid: app.localGuid,
            azureSite: options.azureSite,
        }

        var setProp = (s:string, v:string) => {
            html = html.replace(s.replace(/{.*}/, ""), Util.fmt(s, v))
        }

        html = html.replace("precompiled.js?a=", "precompiled.js")

        var instructions: AST.Apps.DeploymentInstructions = {
            meta: {},
            files : []
        };

        if (!isCloud) {
            var head = Object.keys(app.imports.clientScripts).map(url => {
                if (/\.css$/i.test(url)) return Util.fmt('<link rel="stylesheet" href="{0:url}">', url);
                if (/\.js$/i.test(url)) return Util.fmt('<script type="text/javascript" src="{0:url}"></script>', url);
            });
            html = html.replace("</head>", "    " + head.join("\n    ") + "\n</head>")
        }

        if (options.cordova) {
            html = html.replace("</head>", "    <script src='cordova.js'></script>\n</head>")
            instructions.cordova = <CordovaInstructions>{
                plugins: [],
                platforms: {},
                runs: []
            }
        }

        setProp("<title>{0:q}</title>", app.getName())
        setProp('property="og:title" content="{0:q}"', app.getName())
        //setProp('property="og:url" content="{0:q}"', wa.destinationAppUrl)
        // TODO og:image

        setProp('var userId = "{0:jq}"', options.userId)
        // TODO setProp('var userName = "{0:jq}"', "")
        setProp('var webAppName = "{0:jq}"', app.getName())
        setProp('var webAppGuid = "{0:jq}"', app.localGuid)
        setProp('var runtimeFlags = "{0:jq}"', options.runtimeFlags || "")

        var theBase = Cloud.config.cdnUrl + "/app/" + options.relId + "/c/";


        AST.TypeChecker.tcApp(app)
        var compiled = AST.Compiler.getCompiledScript(app, opts)

        var errs = ""
        app.librariesAndThis().forEach(lib => {
            if (!lib.resolved)
                errs += "Unresolved library: " + lib.getName() + "\n"
            else
                lib.resolved.things.forEach(t => {
                    if (t.hasErrors())
                        errs += "Errors in " + lib.getName() + "->" + t.getName() + "\n"
                })
        })
        if (errs) {
            instructions.error = errs
            if (options.failOnError) {
                ModalDialog.info(lf("compilation errors"), errs)
                return new PromiseInv()
            }
        }

        instructions.packageResources = compiled.packageResources;
        var clientCode = ""

        if (isCloud) {
            Util.assert(opts.javascript, "javascript should have been on");
            clientCode = "var TDev; if (!TDev) TDev = {}; TDev.isWebserviceOnly = true;"
        } else {
            clientCode = compiled.getCompiledCode();
            if (options.cordova) {
                Util.assert(opts.javascript, "javascript should have been on");
                instructions.files.push({
                    path: options.filePrefix + "cordovaPlugins.json",
                    content: JSON.stringify(compiled.imports.cordovaPlugins, null, 2)
                });
                Object.keys(options.cordova.platforms).forEach(p => {
                    if (options.cordova.platforms[p].build) {
                        instructions.cordova.platforms[p] = cordovaPlatforms[p]
                        options.cordova.platforms[p].runs.forEach(run => instructions.cordova.runs.push(run));
                    }
                });
                instructions.cordova.plugins =
                    Object.keys(compiled.imports.cordovaPlugins)
                    .map(k => k + (!k || /^https?:\/\//.test(k) || /^\*?$/.test(compiled.imports.cordovaPlugins[k]) ? "" : "@" + compiled.imports.cordovaPlugins[k]));
            }
            compiled.packageResources.forEach(pr => {
                instructions.files.push({
                    path: options.filePrefix + pr.packageUrl.replace(/^\.\//, ""),
                    url: HTML.proxyResource(pr.url),
                    content: pr.content,
                    kind: pr.kind,
                    type: pr.type,
                    sourceName: pr.sourceName,
                    isUnused: pr.usageLevel === 0,
                })
                // for sounds, cache multiple versions...
                if (pr.type == "sound") {
                    var mp4 = HTML.patchWavToMp4Url(pr.url);
                    if (pr.url != mp4)
                        instructions.files.push({
                            path: options.filePrefix + pr.packageUrl.replace(/^\.\//, "") + ".m4a",
                            url: mp4,
                            kind: pr.kind,
                            sourceName: pr.sourceName,
                            isUnused: pr.usageLevel === 0,
                        })
                }
            })
            if (app.getIconArtId()) {
                instructions.files.push({
                    path: options.filePrefix + 'art/icon',
                    url: Cloud.artUrl(app.getIconArtId()),
                    kind: "art",
                    type: "picture",
                    sourceName:"icon",
                    isUnused: false,
                })
            }
            if (app.splashArtId) {
                instructions.files.push({
                    path: options.filePrefix + 'art/splash',
                    url: Cloud.artUrl(app.splashArtId),
                    kind: "art",
                    type: "picture",
                    sourceName:"splash",
                    isUnused: false,
                })
            }
        }

        if (options.compileServer) {
            opts.packaging = false
            opts.cloud = true
            opts.javascript = true

            compiled = AST.Compiler.getCompiledScript(app, opts)
            var serverCode = compiled.getCompiledCode();

            // update node-webkit/package.json as well
            compiled.imports.npmModules["faye-websocket"] = "0.8.1";

            var pkgJson = {
                name: "td-" + app.getName().replace(/[^a-zA-Z0-9]/g, "-"),
                version: "0.0.0",
                private: true,
                dependencies: compiled.imports.npmModules
            }
            instructions.files.push({
                path: "package.json",
                content: JSON.stringify(pkgJson, null, 2)
            })

            instructions.files.push({
                path: "script/compiled.js",
                content: serverCode,
            })

            var pipPkgs = Object.keys(compiled.imports.pipPackages);
            if (pipPkgs.length > 0) {
                instructions.files.push({
                    path: "requirements.txt",
                    content: pipPkgs.map(pkg => {
                        var r = pkg;
                        var v = compiled.imports.pipPackages[pkg] || "";
                        if (v != "*" && !/^(==|>=)/.test(v)) r += "==" + v;
                        return r;
                    }).join('\n')
                })
                instructions.files.push({
                    path: "runtime.txt",
                    content: "python-2.7"
                });
            }
        }

        instructions.files.push({
            path: options.filePrefix + "precompiled.js",
            content: clientCode,
        })

        instructions.files.push({
            path:  options.filePrefix + "index.html",
            content: html,
        })


        var baseUrl = options.baseUrl

        var addFileAsync = (fn:string, pref?:string) => {
            if (!pref) pref = options.filePrefix
            if (options.downloadLocalFilesFrom) {
                return Util.httpGetTextAsync(options.downloadLocalFilesFrom + fn).then(content => {
                        instructions.files.push({
                            path: pref + fn,
                            content: content
                        });
                    })
            } else {
                instructions.files.push({
                        path: pref + fn,
                        url: theBase + fn
                });
                return Promise.as()
            }
        }

        var lst = ["default.css", "browser.js", "runtime.js"].map(n => addFileAsync(n))
        if (options.compileServer)
            lst.push(addFileAsync("noderuntime.js", "script/"));

        // this code path break cordova
        if (false && options.downloadLocalFilesFrom) {
            lst.push(addFileAsync("error.html"))
            lst.push(addFileAsync("browsers.html"))
        } else {
            // these 2 files are not stored in cdn, they are rewritten in the cloud
            [ "error", "browsers"].forEach(n => instructions.files.push({
                path: options.filePrefix + n + ".html",
                url: Cloud.getServiceUrl() + "/app/." + n + "?releaseid=" + options.relId
            }))
        }

        instructions.meta.isCloud = app.isCloud;

        return Promise.join(lst).then(() => instructions);
    }

    var densitySizes: StringMap<number> = {
        hdpi: 72, ldpi: 36, mdpi: 48, xhdpi: 96, xxhdpi: 144
    };

    var cordovaPlatforms: TDev.StringMap<JsonCordovaPlatform> = {
        "windows": {
            build: true,
            runs: ["windows -- --win", "windows --device -- --phone", "windows -- --phone"],
            res: "windows8",
            icons: [
                { src: "res/windows8/logo.png", width: 150 },
                { src: "res/windows8/smalllogo.png", width: 30 },
                { src: "res/windows8/storelogo.png", width: 50 }
            ],
            splash: [
                { src: "res/screen/windows8/splashscreen.png", width: 620, height: 300 },
            ]
        },
        "ios": {
            build: true,
            icons: [
                //--iOS 8.0 +
                //--iPhone 6 Plus
                { src: "res/ios/icon-60@3x.png", width: 180 },
                //--iOS 7.0 + -- >
                //--iPhone / iPod Touch-- >
                { src: "res/ios/icon-60.png", width: 60 },
                { src: "res/ios/icon-60@2x.png", width: 120 },
                // --iPad-- >
                { src: "res/ios/icon-76.png", width: 76 },
                { src: "res/ios/icon-76@2x.png", width: 152 },
                //--iOS 6.1 -- >
                //--Spotlight Icon-- >
                { src: "res/ios/icon-40.png", width: 40 },
                { src: "res/ios/icon-40@2x.png", width: 80 },
                // --iPhone / iPod Touch-- >
                { src: "res/ios/icon.png", width: 57 },
                { src: "res/ios/icon@2x.png", width: 114 },
                // --iPad-- >
                { src: "res/ios/icon-72.png", width: 72 },
                { src: "res/ios/icon-72@2x.png", width: 144 },
                // --iPhone Spotlight and Settings Icon
                { src: "res/ios/icon-small.png", width: 29 },
                { src: "res/ios/icon-small@2x.png", width: 58 },
                //--iPad Spotlight and Settings Icon
                { src: "res/ios/icon-50.png", width: 50 },
                { src: "res/ios/icon-50@2x.png", width: 100 },
            ],
            splash: [
                { src: "res/screen/ios/Default~iphone.png", width: 320, height: 480 },
                { src: "res/screen/ios/Default@2x~iphone.png", width: 640, height: 960 },
                { src: "res/screen/ios/Default-Portrait~ipad.png", width: 768, height: 1024 },
                { src: "res/screen/ios/Default-Portrait@2x~ipad.png", width: 1536, height: 2048 },
                { src: "res/screen/ios/Default-Landscape~ipad.png", width: 1024, height: 768 },
                { src: "res/screen/ios/Default-Landscape@2x~ipad.png", width: 2048, height: 1536 },
                { src: "res/screen/ios/Default-568h@2x~iphone.png", width: 640, height: 1136 },
                { src: "res/screen/ios/Default-667h.png", width: 750, height: 1334 },
                { src: "res/screen/ios/Default-736h.png", width: 1242, height: 2208 },
                { src: "res/screen/ios/Default-Landscape-736h.png", width: 2208, height: 1242 }
            ]
        },
        "android": {
            build: true,
            icons: [
                { src: "res/android/ldpi.png", density: "ldpi", width: densitySizes["ldpi"] },
                { src: "res/android/mdpi.png", density: "mdpi", width: densitySizes["mdpi"] },
                { src: "res/android/hdpi.png", density: "hdpi", width: densitySizes["hdpi"] },
                { src: "res/android/xhdpi.png", density: "xhdpi", width: densitySizes["xhdpi"] }
            ],
            splash: [
                { src:"res/screen/android/splash-land-hdpi.png", density:"land-hdpi", width: densitySizes["hdpi"] },
                { src: "res/screen/android/splash-land-ldpi.png", density: "land-ldpi", width: densitySizes["ldpi"] },
                { src: "res/screen/android/splash-land-mdpi.png", density: "land-mdpi", width: densitySizes["mdpi"] },
                { src: "res/screen/android/splash-land-xhdpi.png", density: "land-xhdpi", width: densitySizes["xhdpi"] },

                { src: "res/screen/android/splash-port-hdpi.png", density: "port-hdpi", width: densitySizes["hdpi"] },
                { src: "res/screen/android/splash-port-ldpi.png", density: "port-ldpi", width: densitySizes["ldpi"] },
                { src: "res/screen/android/splash-port-mdpi.png", density: "port-mdpi", width: densitySizes["mdpi"] },
                { src: "res/screen/android/splash-port-xhdpi.png", density: "port-xhdpi", width: densitySizes["xhdpi"]}
            ]
        },
        "amazon-fireos": {
            icons: [
                { src: "res/android/ldpi.png", density: "ldpi", width: densitySizes["ldpi"] },
                { src: "res/android/mdpi.png", density: "mdpi", width: densitySizes["mdpi"] },
                { src: "res/android/hdpi.png", density: "hdpi", width: densitySizes["hdpi"] },
                { src: "res/android/xhdpi.png", density: "xhdpi", width: densitySizes["xhdpi"] }
            ]
        },
        "blackberry10": {
            res: "bb10",
            icons: [
                { src: "res/bb10/icon-86.png", width:86 },
                { src: "res/bb10/icon-150.png", width:150 },
            ],
        },
        "firefoxos": {
            res: "ff",
            icons: [
                { src: "res/ff/logo.png", width: 60 }
            ]
        },
        "tizen": {
            icons: [{ src: "res/tizen/icon-128.png", width: 128 }]
        },
    }
}
