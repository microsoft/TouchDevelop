///<reference path='refs.ts'/>

module TDev.Browser {

    export var TheHub: Hub;

    export interface HubSection {
        title: string; // localized            
    }

    var editorModes: StringMap<Cloud.EditorMode>;
    var themes: StringMap<Cloud.ClientTheme>;
    
    function initThemes() {
        if (editorModes && themes) return;
        
        editorModes = {
            'block': {
                id: 'block',
                name: lf("beginner"),
                descr: lf("Drag and drop blocks, simplified interface, great for beginners!"),
                astMode: 1,
                artId: 'brfljsds',
                widgets: {
                    // edit
                    addNewButton: true,
                    undoButton: true,
                    changeSkillLevel: true,
                    // refactoring
                    promoteRefactoring: true,
                    fixItButton: true,
                    splitScreen: false,
                    splitScreenOnLoad: true,
                    searchArtRefactoring: true,
                    calcSearchArt: true,
                    scriptPropertiesIcons: true,
                    // statements
                    stringConcatProperty: true,
                    show: true,
                    "return": true,
                    // sections
                    dataSection: true,
                    artSection: true,
                    librariesSection: true,
                    // ui
                    wallScreenshot: true,
                    wallHeart: true,
                    startTutorialButton: true,
                    nextTutorialsList: true,
                    // hub
                    hubTutorials: true,
                    hubLearn: true,
                    hubShowcase: true,
                    publicationComments: true,
                    translateComments: true,

                    whileConditionDefault: "true",
                    forConditionDefault: "5",
                    ifConditionDefault: "true",

                    scriptSocialLinks: true,
                    scriptEmail: true,
                    scriptAddToChannel: true,
                }
            },
            'classic': {
                id: 'classic',
                name: lf("coder"),
                descr: lf("Edit code as text, more options, for aspiring app writers!"),
                artId: 'ehymsljr',
                astMode: 2,
                widgets: {
                    // edit
                    addNewButton: true,
                    undoButton: true,
                    // refactoring
                    promoteRefactoring: true,
                    fixItButton: true,
                    splitScreen: true,
                    searchArtRefactoring: true,
                    calcSearchArt: true,
                    tokenRefactoring: true,
                    // misc
                    changeSkillLevel: true,
                    // edit
                    copyPaste: true,
                    selectStatements: true,
                    selectExpressions: true,
                    // features
                    actionSettings: true,
                    publishAsHidden: true,
                    // refactoring
                    simplify: true,
                    // ui
                    splitButton: true,
                    uploadArtInSearchButton: true,
                    calcApiHelp: true,
                    sideRunButton: true,
                    tutorialGoToPreviousStep: true,
                    helpLinks: true,
                    wallScreenshot: true,
                    wallHeart: true,
                    wallStop: true,
                    nextTutorialsList: true,
                    codeSearch: true,
                    // section
                    dataSection: true,
                    eventsSection: true,
                    pagesSection: true,
                    artSection: true,
                    librariesSection: true,
                    scriptProperties: true,
                    objectsSection: true,
                    decoratorsSection: true,
                    scriptPropertiesIcons: true,
                    scriptPropertiesSettings: true,
                    scriptPropertiesPropertyAtomic: true,
                    scriptPropertiesManagement: true,
                    databaseSection: true,
                    persistanceRadio: true,
                    // statements
                    comment: true,
                    foreach: true,
                    boxed: true,
                    stringConcatProperty: true,
                    show: true,
                    "return": true,
                    "break": true,
                    "continue": true,
                    // hub
                    hubTutorials: true,
                    hubLearn: true,
                    hubShowcase: true,
                    hubTopAndNew: true,
                    hubScriptUpdates: true,
                    hubUsers: true,
                    hubChannels: true,
                    notifyAppReloaded: true,
                    startTutorialButton: true,
                    publicationComments: true,
                    translateComments: true,
                    outAssign: true,

                    scriptSocialLinks: true,
                    scriptPrintScript: true,
                    scriptPrintTopic: true,
                    scriptEmail: true,
                    scriptAddToChannel: true,
                }
            },
            'pro': {
                id: 'pro',
                name: lf("expert"),
                artId: 'indivfwz',
                descr: lf("'Javascripty' curly braces, all the tools, for experienced devs!"),
                astMode: 3,
                widgets: {
                    // edit
                    addNewButton: true,
                    undoButton: true,
                    // refactoring
                    promoteRefactoring: true,
                    fixItButton: true,
                    splitScreen: true,
                    searchArtRefactoring: true,
                    calcSearchArt: true,
                    makeAsyncRefactoring: true,
                    tokenRefactoring: true,
                    // misc
                    changeSkillLevel: true,
                    // edit
                    copyPaste: true,
                    selectStatements: true,
                    selectExpressions: true,
                    // features
                    actionSettings: true,
                    publishAsHidden: true,
                    // refactoring
                    simplify: true,
                    // ui
                    splitButton: true,
                    uploadArtInSearchButton: true,
                    calcApiHelp: true,
                    sideRunButton: true,
                    tutorialGoToPreviousStep: true,
                    helpLinks: true,
                    wallScreenshot: true,
                    wallHeart: true,
                    wallStop: true,
                    // section
                    dataSection: true,
                    eventsSection: true,
                    artSection: true,
                    librariesSection: true,
                    scriptProperties: true,
                    scriptPropertiesSettings: true,
                    scriptPropertiesPropertyAtomic: true,
                    scriptPropertiesUseCppCompiler: true,
                    databaseSection: true,
                    // statements
                    comment: true,
                    foreach: true,
                    boxed: true,
                    show: true,
                    "return": true,
                    "break": true,
                    "continue": true,
                    stringConcatProperty: true,
                    //navigation
                    codeSearch: true,
                    findReferences: true,
                    gotoNavigation: true,
                    // refactorings
                    stripBlock: true,
                    // debugging
                    toggleBreakpoint: true,
                    debugButton: true,
                    // ui
                    publishDescription: true,
                    sendPullRequest: true,
                    scriptStats: true,
                    userSocialTab: true,
                    scriptConvertToDocs: true,
                    scriptConvertToTutorial: true,
                    nextTutorialsList: true,
                    // sections
                    testsSection: true,
                    actionTypesSection: true,
                    pagesSection: true,
                    objectsSection: true,
                    decoratorsSection: true,
                    // script lifecycle
                    updateButton: true,
                    editLibraryButton: true,
                    errorsButton: true,
                    logsButton: true,
                    deployButton: true,
                    // ui
                    pluginsButton: true,
                    runTestsButton: true,
                    scriptPropertiesManagement: true,
                    scriptPropertiesIcons: true,
                    scriptPropertiesExport: true,
                    scriptPropertiesPlatform: true,
                    scriptPropertiesInstrumentation: true,
                    scriptPropertiesData: true,
                    wallLogsButton: true,
                    scriptPropertiesPropertyCloud: true,
                    stringEditFullScreen: true,
                    persistanceRadio: true,
                    awaitClock: true,
                    // language
                    async: true,
                    testAction: true,
                    lambda: true,
                    // hub
                    commentHistory: true,
                    scriptPullChanges: true,
                    scriptDiffToBase: true,
                    scriptHistoryTab: true,
                    scriptInsightsTab: true,
                    notifyAppReloaded: true,
                    showTemporaryNotice: true,
                    githubLinks: true,
                    hubLearn: true,
                    hubShowcase: true,
                    hubTopAndNew: true,
                    hubScriptUpdates: true,
                    hubUsers: true,
                    hubMyArt: true,
                    hubChannels: true,
                    publicationComments: true,
                    translateComments: true,
                    outAssign: true,

                    scriptSocialLinks: true,
                    scriptPrintScript: true,
                    scriptPrintTopic: true,
                    scriptEmail: true,
                    scriptAddToChannel: true,
                }
            }
        }

        themes = {
            'expert': {
                name: lf("Expert"),
                description: lf("All options turned on"),
                editorMode: editorModes['pro']
            },
            'minecraft': {
                name: "Minecraft",
                description: lf("Learn to code with Minecraft"),
                logoArtId: 'eopyzwpm',
                tutorialsTopic: 'minecrafttutorials',
                scriptSearch: '#minecraft',
                scriptTemplates: ['blankminecraft', 'blankcreeper'],
                noAnimations: true,
                editorMode: {
                    id: 'minecraft',
                    name: lf("minecraft"),
                    descr: lf("Drag and drop blocks, simplified interface, great for beginners!"),
                    astMode: 2,
                    artId: 'brfljsds',
                    widgets: {
                        // edit
                        addNewButton: true,
                        undoButton: true,
                        changeSkillLevel: true,
                        async: true,
                        // refactoring                    
                        updateButton: true,
                        promoteRefactoring: true,
                        fixItButton: true,
                        splitScreen: false,
                        splitScreenOnLoad: true,
                        // searchArtRefactoring: true,
                        // calcSearchArt: true,
                        scriptProperties: true,
                        scriptPropertiesIcons: true,
                        // statements
                        copyPaste: true,
                        selectStatements: true,
                        stringConcatProperty: true,
                        show: true,
                        "return": true,
                        gotoNavigation: true,
                        // sections
                        dataSection: true,
                        // artSection: true,
                        librariesSection: true,
                        // ui
                        wallScreenshot: true,
                        wallHeart: true,
                        startTutorialButton: true,
                        nextTutorialsList: true,
                        // hub
                        hubTutorials: true,
                        // hubShowcase : true,
                        publicationComments: true,
                        translateComments: true,

                        whileConditionDefault: "true",
                        whileBodyDefault: "skip; minecraft->pause(20);",
                        forConditionDefault: "5",
                        ifConditionDefault: "true",

                        scriptSocialLinks: true,
                        scriptAddToChannel: true,
                    }
                }
            },
            'rpi': {
                name: "Raspberry Pi",
                description: lf("Learn to code with Raspberry Pi"),
                logoArtId: 'eopyzwpm',
                tutorialsTopic: 'minecraftpitutorials',
                scriptTemplates: ['blankminecraftpi'],
                noAnimations: true,
                lowMemory: true,
                editorMode: editorModes['block'],
            },
            'arduino': {
                name: "Arduino",
                description: lf("Program Arduino boards"),
                logoArtId: 'kzajxznr',
                wallpaperArtId: 'kzajxznr',
                tutorialsTopic: 'arduinotutorials',
                scriptSearch: '#arduino',
                scriptTemplates: ['blankarduino', 'blankesplore'],
                intelliProfileId: 'kbmkc',
                editorMode: editorModes['classic'],
            },
            'engduino': {
                name: "Engduino",
                description: lf("Programming the Engduino"),
                logoArtId: 'qmjzqlkc',
                wallpaperArtId: 'qmjzqlkc',
                scriptSearch: '#engduino',
                scriptTemplates: ['blankengduino'],
                intelliProfileId: 'kbmkc',
                editorMode: editorModes['classic'],
            },
            'microbit': {
                name: 'BBC micro:bit',
                description: ' ',
                scriptSearch: '#microbit',
                scriptTemplates: ['blankmicrobit'],
                intelliProfileId: 'upfje',
                editorMode: {
                    id: 'microbit',
                    name: 'Micro Bit',
                    descr: lf("Micro Bit mode!"),
                    astMode: 2,
                    widgets: {
                        hubTutorials: true,
                        addNewButton: true,
                        undoButton: true,
                        promoteRefactoring: true,
                        copyPaste: true,
                        comment: true,
                        dataSection: true,
                        gotoNavigation: true,
                        splitScreenOnLoad: true,
                        updateButton: true,
                        forceMainAsAction: true,
                        singleReturnValue: true,
                        integerNumbers: true,
                        codeSearch: true,
                        librariesSection: true,
                        scriptPropertiesSettings: true,
                        editorRunOnLoad: true,
                        whileConditionDefault: "true",
                        whileBodyDefault: "skip; basic->pause(20);",
                        forConditionDefault: "5",
                        "return": true,
                        "break": true,
                        scriptPrintScript: true,
                        scriptPrintTopic: true,
                        tutorialGoToPreviousStep: true,
                    }
                },
            },
            'restricted': {
                name: "Restricted",
                description: lf("Opinionated restricted mode"),
                scriptTemplates: ['blank'],
                intelliProfileId: 'lyusma',
                editorMode: {
                    id: 'restricted',
                    name: lf("restricted"),
                    descr: lf("Restricted mode!"),
                    astMode: 2,
                    widgets: {
                        addNewButton: true,
                        undoButton: true,
                        promoteRefactoring: true,
                        fixItButton: true,
                        copyPaste: true,
                        comment: true,
                        dataSection: true,
                        objectsSection: true,
                        gotoNavigation: true,
                        splitScreenOnLoad: true,
                        updateButton: true,
                        forceMainAsAction: true,
                        singleReturnValue: true,
                        integerNumbers: true,
                        codeSearch: true,
                        librariesSection: true,
                        scriptPropertiesSettings: true,
                        editorRunOnLoad: true,
                        calcApiHelp: true,
                        scriptPropertiesUseCppCompiler: true,
                        whileConditionDefault: "true",
                        whileBodyDefault: "skip; basic->pause(20);",
                        forConditionDefault: "5",
                        "return": true,
                        "break": true,
                        awaitClock: true,
                        tutorialGoToPreviousStep: true,
                        scriptPrintScript: true,
                        scriptPrintTopic: true,
                    }
                },
            },
            'restrictedteacher': {
                name: "Restricted Teacher",
                description: lf("Opinionated restricted mode"),
                scriptTemplates: ['blank', 'blankdocs'],
                intelliProfileId: 'lyusma',
                editorMode: {
                    id: 'restrictedteacher',
                    name: lf("teacher"),
                    descr: lf("Restricted teacher mode!"),
                    astMode: 2,
                    widgets: {
                        addNewButton: true,
                        undoButton: true,
                        promoteRefactoring: true,
                        copyPaste: true,
                        comment: true,
                        dataSection: true,
                        objectsSection: true,
                        gotoNavigation: true,
                        splitScreenOnLoad: true,
                        updateButton: true,
                        forceMainAsAction: true,
                        singleReturnValue: true,
                        integerNumbers: true,
                        codeSearch: true,
                        librariesSection: true,
                        scriptProperties: true,
                        scriptPropertiesSettings: true,
                        scriptPropertiesUseCppCompiler: true,
                        editorRunOnLoad: true,
                        calcApiHelp: true,
                        whileConditionDefault: "true",
                        whileBodyDefault: "skip; basic->pause(20);",
                        forConditionDefault: "5",
                        "return": true,
                        "break": true,
                        scriptHistoryTab: true,
                        tutorialGoToPreviousStep: true,
                        awaitClock: true,
                        scriptPrintScript: true,
                        scriptPrintTopic: true,                    
                    
                        // for docs
                        artSection: true,
                        selectStatements: true,
                    
                        // teacher specific
                        scriptDiffToBase: true,
                        scriptConvertToTutorial:true,
                        socialNetworks: true,
                        socialNetworkvideoptr: true,
                        socialNetworkart: true,
                        socialNetworkbbc: true,
                        publishAsHidden: true,
                        computingAtSchool: true,
                        splitScreen: true,
                        splitButton: true,
                        actionSettings: true,
                        calcSearchArt: true,
                        searchArtRefactoring: true,
                        editLibraryButton: true,
                        scriptEmail: true,
                        publicationComments: true,
                    }
                },
            },
            'restrictededitor': {
                name: "Restricted Editor",
                description: lf("Opinionated restricted mode"),
                scriptTemplates: ['blank', 'blankdocs'],
                editorMode: {
                    id: 'restricteditor',
                    name: lf("editor"),
                    descr: lf("Restricted editor mode!"),
                    astMode: 2,
                    widgets: {
                        addNewButton: true,
                        undoButton: true,
                        promoteRefactoring: true,
                        copyPaste: true,
                        comment: true,
                        dataSection: true,
                        gotoNavigation: true,
                        updateButton: true,
                        forceMainAsAction: true,
                        singleReturnValue: true,
                        integerNumbers: true,
                        codeSearch: true,
                        librariesSection: true,
                        scriptProperties: true,
                        scriptPropertiesSettings: true,
                        scriptPropertiesUseCppCompiler: true,
                        scriptPropertiesPropertyAtomic: true,
                        editorRunOnLoad: true,
                        calcApiHelp: true,
                        whileConditionDefault: "true",
                        whileBodyDefault: "skip; basic->pause(20);",
                        forConditionDefault: "5",
                        artSection: true,
                        "return": true,
                        "break": true,
                        splitScreenOnLoad: false,
                        findReferences: true,
                        selectStatements: true,
                        stringEditFullScreen: true,
                        objectsSection: true,
                        decoratorsSection: true,
                        persistanceRadio: true,
                        databaseSection: true,
                        scriptPropertiesManagement: true,
                        hideMyScriptHeader: true,
                        scriptHistoryTab: true,
                        tutorialGoToPreviousStep: true,
                        awaitClock: true,
                
                        //MORE
                    
                        // teacher specific
                        scriptDiffToBase: true,
                        scriptConvertToTutorial:true,
                        socialNetworks: true,
                        socialNetworkvideoptr: true,
                        socialNetworkart: true,
                        socialNetworkbbc: true,
                        publishAsHidden: true,
                        computingAtSchool: true,
                        splitScreen: true,
                        splitButton: true,
                        actionSettings: true,
                        calcSearchArt: true,
                        searchArtRefactoring: true,
                        editLibraryButton: true,
                        scriptPrintScript: true,
                        scriptPrintTopic: true,
                        scriptEmail: true,
                        publicationComments: true,
                
                        // editor specific                  
                        publishDescription: true,
                        scriptPullChanges: true,
                        testAction: true,
                        testsSection: true,
                        tokenRefactoring: true,
                        selectExpressions: true,
                        scriptConvertToDocs: true,
                    }
                }
            }
        }
    }

    export module EditorSettings {
        export var AST_BLOCK = 1;
        export var AST_LEGACY = 2;
        export var AST_PRO = 3;        

        export function showFeedbackBox() {
            var link = (text: string, lnk: string) =>
                HTML.mkButton(text,
                    () => { window.location.href = lnk });

            if (ModalDialog.current && !ModalDialog.current.canDismiss) {
                window.open(Cloud.getServiceUrl());
                return;
            }

            var relId = "(local)";
            var mtch = /-(\d+)\//.exec(Ticker.mainJsName)
            if (mtch) relId = mtch[1];

            var m = new ModalDialog();
            m.fullWhite();
            m.add(div("wall-dialog-header", Runtime.appName));
            if (Cloud.config.tdVersion)
                m.add(div("wall-dialog-body", lf("Web app version {0}.", Cloud.config.tdVersion)));
            else
                m.add(div("wall-dialog-body", lf("Running against cloud services v{0}.", relId)));
            var legalButtons = Cloud.config.legalButtons.map(b => link(lf_static(b.name, true), b.url));
            var btns: HTMLElement;
            m.add(btns = div("wall-dialog-buttons",
                Cloud.getUserId() ? HTML.mkButton(lf("Sign out"), () => TheEditor.logoutDialog()) : undefined,
                legalButtons
                ));

            if (EditorSettings.widgets().githubLinks) {
                btns.appendChild(HTML.mkButton(lf("changes"),() => {
                    HTML.showProgressNotification(lf("downloading change log..."))
                    Util.httpGetJsonAsync((<any>window).mainJsName.replace(/main.js$/, "buildinfo.json"))
                        .then(t => RT.Web.browseAsync("http://github.com/Microsoft/TouchDevelop/commits/" + t.commit))
                        .done();
                }));
                btns.appendChild(
                    link(lf("GitHub"), "https://github.com/Microsoft/TouchDevelop")
                    );
            }
            
            if (Cloud.lite && ["upload", "admin", "view-bug", "root-ptr", "gen-code", "internal", "global-list"].some(perm => Cloud.hasPermission(perm))) {
                m.add(div("wall-dialog-header", lf("internal")));
                var versionInfo = HTML.mkTextArea()
                versionInfo.rows = 4;
                versionInfo.style.fontSize = "0.8em";
                versionInfo.style.width = "100%";
                versionInfo.value = lf("Loading version info...")

                Cloud.getPrivateApiAsync("stats/dmeta")
                    .done(resp => {
                        var tm = (n: number) => Util.isoTime(n) + " (" + Util.timeSince(n) + ")"
                        versionInfo.value =
                        lf("Web App version: {0} {1} /{2}", Cloud.config.releaseLabel, Cloud.config.tdVersion, Cloud.config.relid) + "\n" +
                        lf("Service deployment: {0}", tm(resp.deploytime)) + "\n" +
                        lf("Service activation: {0}", tm(resp.activationtime));
                    })
                m.add(div("wall-dialog-body", versionInfo))
                m.add(div("wall-dialog-body", [
                    (Cloud.hasPermission("internal") ? HTML.mkButton(lf("my scripts"), () => { Util.setHash("#list:installed-scripts") }) : null),
                    (Cloud.hasPermission("internal") ? HTML.mkButton(lf("create script"), () => { TemplateManager.createScript() }) : null),
                    // (Cloud.hasPermission("user-mgmt") ? HTML.mkButton(lf("abuse reports"), () => { Util.setHash("#list:installed-scripts:abusereports") }) : null),
                    (Cloud.hasPermission("user-mgmt") ? HTML.mkButton(lf("abuse review"), () => { AbuseReview.show() }) : null),
                    (Cloud.hasPermission("admin") ? HTML.mkButton(lf("API config"), () => { editApiConfig() }) : null),
                    (Cloud.hasPermission("admin") ? HTML.mkButton(lf("permission review"), () => { permissionReview() }) : null),
                    (Cloud.hasPermission("stats") ? HTML.mkButton(lf("stats"), () => { stats() }) : null),
                    (Cloud.hasPermission("admin") ? HTML.mkButton(lf("mbedint"), () => { mbedintUpdate() }) : null),
                    (Cloud.hasPermission("global-list") ? HTML.mkButton(lf("pointer review"), () => { pointerReview() }) : null),
                    (Cloud.hasPermission("root") ? HTML.mkAsyncButton(lf("clear videos"), () => clearVideosAsync("")) : null),
                    (Cloud.hasPermission("gen-code") ? HTML.mkButton(lf("generate codes"), () => {
                        var m = new ModalDialog()
                        var perm = HTML.mkTextInput("text", "")
                        var count = HTML.mkTextInput("text", "")
                        var credit = HTML.mkTextInput("text", "")
                        var desc = HTML.mkTextInput("text", "")
                        var numuses = HTML.mkTextInput("text", "")
                        perm.value = "preview"
                        count.value = "1"
                        credit.value = "1"
                        numuses.value = "1"
                        m.add(div("wall-dialog-body",
                            lf("Permissions (preview, educator, moderator, staff): "), perm,
                            lf("Number of codes: "), count,
                            lf("Credit for each code: "), credit,
                            lf("Number of uses for each code: "), numuses,
                            lf("Code description (purpose): "), desc,
                            HTML.mkAsyncButton(lf("generate"), () => {
                                var data = {
                                    count: parseInt(count.value),
                                    credit: parseInt(credit.value) * parseInt(numuses.value),
                                    singlecredit: parseInt(credit.value),
                                    permissions: perm.value.replace(/[,\s]+/g, ","),
                                    description: desc.value,
                                }
                                var items = []
                                var getsome = count => {
                                    if (count == 0) {
                                        ModalDialog.showText(items.join("\n"), lf("your codes"))
                                        return
                                    }
                                    data.count = Math.min(count, 100)
                                    count -= data.count
                                    TDev.Cloud.postPrivateApiAsync("generatecodes", data)
                                        .then(r => {
                                            HTML.showProgressNotification(lf("generating, {0} to go", count))
                                            items.pushRange(r.items)
                                            getsome(count)
                                        }, e => Cloud.handlePostingError(e, lf("generate codes")))
                                }
                                if (!data.count) HTML.wrong(count)
                                else if (!data.singlecredit) HTML.wrong(credit)
                                else if (!data.credit) HTML.wrong(numuses)
                                else if (!data.permissions) HTML.wrong(perm)
                                else if (!data.description) HTML.wrong(desc)
                                else 
                                    ModalDialog.ask(
                                        lf("Creating this code will let up to {0} users into the system.", data.count * data.credit),
                                        lf("create codes"),
                                        () => getsome(data.count))

                                return Promise.as()
                            })))
                        m.show()
                    }) : null)
                ]))
                if (Cloud.hasPermission("global-list")) {
                    m.add(div("wall-dialog-header", lf("global lists")));
                    m.add(div("wall-dialog-body", [
                        HTML.mkButton(lf("users"), () => { Util.setHash("#list:users") }),
                        HTML.mkButton(lf("scripts"), () => { Util.setHash("#list:new-scripts") }),
                        HTML.mkButton(lf("art"), () => { Util.setHash("#list:art") }),
                        HTML.mkButton(lf("pointers"), () => { Util.setHash("#list:pointers")}),
                        HTML.mkButton(lf("page map"), () => { Browser.TheHub.showPointers() }),
                        HTML.mkButton(lf("releases"), () => { Util.setHash("#list:releases" + (Cloud.config.relid ? ":release:" + Cloud.config.relid : "")) }),
                        HTML.mkButton(lf("art review"), () => { Browser.ArtInfo.artReview() }),
                    ]))
                }
                if (Cloud.hasPermission("script-promo")) {
                    m.add(div("wall-dialog-header", lf("manage promos")));
                    var promoDiv = div("wall-dialog-body", HTML.mkButton(lf("NEW"), () => {
                        ModalDialog.info(lf("creating..."), "")
                        var app = new AST.App(null)
                        app.setName("promo holder " + (Random.uint32() % 10000))
                        app.comment = "#promoholder"
                        Cloud.postPrivateApiAsync("scripts", {
                            text: app.serialize(),
                            name: app.getName(),
                            description: app.comment
                        })
                        .then(resp => {
                            TheApiCacheMgr.store(resp.id, resp)
                            TheHost.getScriptInfoById(resp.id).editPromo()
                        })
                        .done()
                    }))
                    m.add(promoDiv)
                    Cloud.getPrivateApiAsync("config/promo")
                        .then(resp => {
                            var tags = (resp.autotags || []).concat((resp.tags || []))
                            var addtags = [];
                            (resp.addlangs || []).forEach(l => {
                                tags.forEach(t => {
                                    if (resp.addlangs.indexOf(t) < 0)
                                        addtags.push(t + "@" + l)
                                })
                            })
                            tags.concat(addtags).forEach(t => {
                                promoDiv.appendChild(
                                    HTML.mkButton(t, () => { Util.setHash("#list:promo-scripts/" + t) }))
                            })
                        })
                        .done()
                }
                m.setScroll();
            }

            var users = Object.keys(Cloud.litePermissions).filter(k => /^signin-/.test(k)).map(k => k.replace(/signin-/, ""))

            if (users.length > 0) {
                m.add(div("wall-dialog-header", lf("sign in as:")));
                var usersDiv = div("wall-dialog-body")
                m.add(usersDiv)
                users.map(u => TheApiCacheMgr.getAsync(u, true).done(r => {
                    if (r) {
                        usersDiv.appendChild(HTML.mkButton(r.name, () => Editor.loginAs(r.id)))
                    }
                }))
            }

            m.show();
        }
        
        function clearVideosAsync(cont: string) : Promise {
            return Cloud.getPrivateApiAsync("videos" + (cont ? "?continuation=" + cont : ""))
                .then((videos: JsonList) => Promise.join(
                    videos.items.map(video => Cloud.deletePrivateApiAsync(video.id).then(() => { }, () => { Util.log('failed to delete video ' + video.id) }))
                        .concat(videos.continuation ? clearVideosAsync(videos.continuation) : Promise.as())));
        }

        export function editApiConfig()
        {
            ModalDialog.editText(lf("API name"), "config/settings", name => {
                var r = Cloud.getPrivateApiAsync(name)
                r.then(resp => EditorHost.editFullScreenAsync("resp.json", JSON.stringify(resp, null, 2)))
                .then(val => {
                    var r = RT.JsonObject.mk(val, (err) => {
                        ModalDialog.info(lf("parse error"), err)
                    })
                    if (r && r.value()) {
                        var str = JSON.stringify(r.value(), null, 1)
                        if (str.length > 300) str = str.slice(0, 300) + "...";
                        ModalDialog.ask(str, "update", () => {
                            Cloud.postPrivateApiAsync(name, r.value()).done()
                        })
                    }
                })
                .done()
                return r
            })
        }

        function csv(l:string[]) {
            return l.map(s => "\"" + (s||"").replace(/[\\"]/g, " ") + "\"").join(",") + "\n"
        }

        function pointerReview()
        {
            ModalDialog.editText(lf("Ignored paths"), "usercontent/,td/,functions/,device/,signin/,templates/", perms => {
                var okpaths = perms.split(/\s*,\s*/).filter(p => !!p)

                var pointers = []
                var loop = (cont) =>
                    Browser.TheApiCacheMgr.getAsync("pointers?count=1000" + cont)
                    .then(resp => {
                        pointers.pushRange(resp.items)
                        if (resp.continuation)
                            loop("&continuation=" + resp.continuation)
                        else fin()
                    })
                    .done()
                var pointerList = ""
                var fin = () => {
                    pointerList += csv(["Path", "User Name", "Description", "Script"])
                    pointers.forEach(p => {
                        if (okpaths.some(pp => p.path.slice(0, pp.length) == pp))
                            return
                        pointerList += csv([p.path, p.username, p.description, p.redirect || p.scriptid])
                    })
                    ModalDialog.showText(pointerList)
                }
                loop("")

                return new PromiseInv()
            })
        }

        function mbedintUpdate()
        {
            ModalDialog.editText(lf("Target:tag"), "gcc:v2", perms => {
                var args = perms.split(/:/)
                return Cloud.postPrivateApiAsync("admin/mbedint/" + args[0], { 
                     op: "update", 
                     args: ["git checkout " + args[1] + ";"]
                })
                .then(r => {
                    var full = r.output.replace(/\x1b\[[0-9;]*m/g, "")
                    var m = ModalDialog.showText("...[snip]...\n" + full.slice(-3000), null, <any>div(null, 
                        HTML.mkButton(lf("full"), () => {
                            ModalDialog.showText(full)
                        }),
                        HTML.mkAsyncButton("save tag " + args[1], () => {
                            var opts = {}
                            opts[args[0] + "-" + args[1]] = r.imageid
                            opts[args[1]] = r.imageid
                            return Cloud.postPrivateApiAsync("config/compiletag", opts)
                            .then(r => r, e => Cloud.handlePostingError(e, ""))
                        }),
                        HTML.mkButton(lf("cancel"), () => {
                            m.dismiss()
                    })))
                }, e => Cloud.handlePostingError(e, ""))
            })
        }

        function stats()
        {
            var fields = {
                "Scripts": "New_script,New_script_hidden",
                "Scripts (public)": "New_script",
                "Scripts (hidden)": "New_script_hidden",
                "#docs": "PubScript_fresh_docs,PubScript_update_docs,PubScript_fork_docs",
                "HTML": "PubScript_fresh_html,PubScript_update_html,PubScript_fork_html",
                "Blocks": "PubScript_fresh_blockly,PubScript_update_blockly,PubScript_fork_blockly",
                "Blocks (fork)": "PubScript_fork_blockly",
                "Blocks (new)": "PubScript_fresh_blockly",
                "TD": "PubScript_fresh_touchdevelop,PubScript_update_touchdevelop,PubScript_fork_touchdevelop",
                "TD (fork)": "PubScript_fork_touchdevelop",
                "TD (new)": "PubScript_fresh_touchdevelop",
                "CK": "PubScript_fresh_codekingdoms,PubScript_update_codekingdoms,PubScript_fork_codekingdoms",
                "CK (fork)": "PubScript_fork_codekingdoms",
                "CK (new)": "PubScript_fresh_codekingdoms",
                "Python": "PubScript_fresh_python,PubScript_update_python,PubScript_fork_python",
                "Python (fork)": "PubScript_fork_python",
                "Python (new)": "PubScript_fresh_python",
                "Resources": "New_art",
                "URLs": "New_pointer",
                "Accounts": "PubUser@federated",
                "Abuse reports": "New_abusereport",
                "Ignored reports": "AbuseSet@ignored",
                "Pub with report deleted": "AbuseSet@deleted",
                "Unignored reports": "AbuseSet@active",
                "Logins": "Login@federated",
                "Hearts": "New_review",
                "/app/ served": "ServeApp@index.html",
                "Homepage served": "ServePtr@home,ServePtrFirst@home",
                "Other page served": "ServePtr@other,ServePtrFirst@other",
                "Usage: TD": "app_editor_touchdevelop",
                "Usage: Blocks": "app_editor_blockly",
                "Usage: CK": "app_editor_codekingdoms",
                "Usage: Python": "app_editor_python",
                "Usage: My Scripts": "app_editor_shell",
                "Mobile: TD": "app_editor_touchdevelop_mobile",
                "Mobile: Blocks": "app_editor_blockly_mobile",
                "Mobile: CK": "app_editor_codekingdoms_mobile",
                "Mobile: Python": "app_editor_python_mobile",
                "Mobile: My Scripts": "app_editor_shell_mobile",
                "New script TD": "app_NewScript_touchdevelop",
                "New script Blocks": "app_NewScript_blockly",
                "New script CK": "app_NewScript_codekingdoms",
                "New script Python": "app_NewScript_python",
                "Simulator Runs": "app_coreRun,app_externalRun",
                "Compiles": "app_coreNativeCompile",
                "WebApp Start": "app_mainInit",
                "Edit Script": "app_browseEdit",
                "Install Script": "app_browseEditInstall",
                "Uninstall Script": "app_browseUninstall",
                "File Save": "app_browseSave",
                "TD Tutorial Start": "Tutorial_step0",
            }

            ModalDialog.editText(lf("How many days back?"), "180", days => {
                var flds = {}
                Object.keys(fields).forEach(k => {
                    fields[k].split(/,\s*/).forEach(f => { flds[f] = 1 })
                })
                return Cloud.postPrivateApiAsync("dailystats", { start: Date.now()/1000-parseInt(days,10)*24*3600, length: 365, fields: Object.keys(flds) })
                .then(resp => {
                    if (resp.length < 1) {
                        ModalDialog.info(lf("sorry"), lf("no data returned"))
                        return;
                    }

                    var res = csv(["Date"].concat(Object.keys(fields)))
                    var addValues = (hd:string, i:number) => {
                        var line = [hd]
                        Object.keys(fields).forEach(k => {
                            var n = 0
                            fields[k].split(/,\s*/).forEach(f => {
                                n += (resp.values[f][i] || 0)
                            })
                            line.push(n.toString())
                        })
                        res += csv(line)
                    }

                    Object.keys(flds).forEach(f => {
                        var sum = 0
                        for (var i = 0; i < resp.length; ++i) {
                            sum += resp.values[f][i]
                        }
                        if (/^app_editor_/.test(f))
                            // convert to minutes
                            sum = Math.round(sum / 6) 
                        resp.values[f][resp.length + 1] = sum
                        resp.values[f][resp.length + 2] = Math.round(sum / resp.length * 100) / 100
                    })

                    for (var i = 0; i < resp.length; ++i) {
                        var tm = new Date((resp.start + i * 24 * 3600) * 1000)
                        var hd = tm.getUTCFullYear() + "-" + (tm.getUTCMonth()+1) + "-" + tm.getUTCDate()
                        addValues(hd, i)
                    }

                    addValues("Total", resp.length + 1)
                    addValues("Avarage", resp.length + 2)
                    addValues("Lifetime total", resp.length)

                    var dataurl = "data:text/csv;base64," + Util.base64Encode(res)
                    HTML.browserDownloadText(res, "stats.csv", "text/csv")

                }, e => Cloud.handlePostingError(e, ""))
            })
        }

        function permissionReview()
        {
            ModalDialog.info(lf("analyzing..."), lf("please wait"))
            var users = []
            var loop = (cont) =>
                Cloud.getPrivateApiAsync("users/admin?count=1000" + cont)
                .then(resp => {
                    users.pushRange(resp.items)
                    HTML.showProgressNotification(lf("got {0} users", users.length))
                    if (resp.continuation)
                        loop("&continuation=" + resp.continuation)
                    else fin()
                })
                .done()
            var userList = ""
            var fin = () => {
                userList += csv(["User ID", "Nickname", "Permission"])
                users.forEach(u => {
                        var per = u.permissions.split(/,/).filter(p => !!p)
                        per.sort()
                        userList += csv([u.id, u.name, per.join(", ")])
                    })
                ModalDialog.showText(userList)
            }
            loop("")
        }

        export function mkCopyrightNote(): HTMLElement {
            var beta = divLike("footer", "beta-note");
            beta.setAttribute("role", "contentinfo");
            var versionId = (<any>window).betaFriendlyId || Cloud.config.tdVersion;
            var versionNote = versionId ? ("<b>" + versionId + "</b> ") : "";

            var copy = lf("© Copyright {0} {1}", new Date().getFullYear(), Runtime.companyCopyright)
            
            var copyrights = "<div class='beta-legal'>" + 
                Cloud.config.legalButtons.map(b => Util.fmt("<span class='beta-underline'>{0:q}</span>", lf_static(b.name, true))).join("&nbsp;|&nbsp;") +
                "&nbsp;&nbsp;" + versionNote +
                "<span class='beta-black'>" + copy + "</span>&nbsp;&nbsp;" +
                "</div>";

            Browser.setInnerHTML(beta, copyrights);

            beta.withClick(EditorSettings.showFeedbackBox);

            return beta;
        }

        export function setThemeFromSettings()
        {
            initThemes();
            var m = /(\?|&)theme=([a-z]+)(#|&|$)/.exec(window.location.href);
            if (m)
                EditorSettings.setTheme(themes[m[2]]);
            else if (Cloud.isRestricted()) {
                var theme = Cloud.hasPermission('full-editor') ? 'restrictededitor' : 
                            Cloud.hasPermission('teacher-editor') ? 'restrictedteacher' : 'restricted';
                EditorSettings.setTheme(themes[theme]);
            }
            else if (Browser.isRaspberryPiDebian) EditorSettings.setTheme(themes['rpi']);
            else EditorSettings.setTheme(undefined);
        }

        export function init() {
            if (window && window.location) {
                Cloud.setPermissions();
                setThemeFromSettings();
            }
        }

        export function initEditorModeAsync() : Promise {
            if (!!editorMode()) return Promise.as();

            var theme = Browser.EditorSettings.currentTheme;
            if (theme && theme.editorMode) {
                Browser.EditorSettings.setEditorMode(theme.editorMode, false);
                return Promise.as();
            }
            return Browser.EditorSettings.showChooseEditorModeAsync();
        }

        export function wallpaper(): string {
            return localStorage.getItem("editorWallpaper") || "";
        }

        export function setWallpaper(id: string, upload: boolean) {
            var previous = EditorSettings.wallpaper();
            if (previous != id) {
                if (!id) localStorage.removeItem("editorWallpaper")
                else localStorage.setItem("editorWallpaper", id);
                if (upload)
                    uploadWallpaper();
                updateWallpaper();
            }
        }

        function updateWallpaper() {
            var id = wallpaper();
            if (!id) {
                var theme = EditorSettings.currentTheme
                if (theme) id = theme.wallpaperArtId;
            }

            [elt("hubRoot"), elt("slRoot")].filter(e => !!e).forEach(e => {
                if (id) {
                    e.style.backgroundImage = Cloud.artCssImg(id);
                    e.style.backgroundRepeat = 'repeat'
                }
                else e.style.backgroundImage = "";
            });
        }

        function uploadWallpaper() {
            var m = wallpaper();
            if (Cloud.getUserId() && Cloud.isOnline()) {
                Util.log('updating wallpaper to ' + m);
                Cloud.postUserSettingsAsync({ wallpaper: m })
                    .done(() => { HTML.showProgressNotification(lf("wallpaper saved"), true); },(e) => { });
            }
        }

        export function loadEditorMode(id: string) {
            initThemes();
            
            if (id === "coder") id = 'classic'; // legacy
            var mode =  editorModes[id] || editorModes['block'];
            if (mode)
                Browser.EditorSettings.setEditorMode(mode, false);
        }

        export function setEditorMode(mode: Cloud.EditorMode, upload: boolean) {
            if (Cloud.isRestricted()) return;

            var previous = localStorage.getItem("editorMode");
            if (previous != mode) {
                localStorage.setItem("editorMode", mode.id);
                currentEditorMode = mode;
                if (upload) uploadEditorMode();
                TheEditor.refreshMode();
            }
        }

        var currentEditorMode: Cloud.EditorMode;
        export function editorMode(): Cloud.EditorMode {
            initThemes();
            if (!currentEditorMode) {
                currentEditorMode = currentTheme && currentTheme.editorMode
                    ? currentTheme.editorMode
                    : editorModes[localStorage.getItem("editorMode") || ""] || editorModes['block']
                TheEditor.refreshMode();
            }
            return currentEditorMode;
        }

        export function widgets(): Cloud.EditorWidgets {
            return editorMode().widgets;
        }

        function uploadEditorMode() {
            var m = localStorage.getItem("editorMode");
            if (Cloud.getUserId() && Cloud.isOnline() && m) {
                Util.log('updating skill level to ' + m);
                Cloud.postUserSettingsAsync({ editorMode:m })
                    .done(() => { HTML.showProgressNotification(lf("skill level saved"), true); },(e) => { });
            }
        }

        export function changeSkillLevelDiv(editor: Editor, tk: Ticks, cls = ""): HTMLElement {
            if (!widgets().changeSkillLevel) return undefined;

            return div(cls, HTML.mkLinkButton(lf("Change skill level!"),() => {
                tick(tk);
                EditorSettings.showChooseEditorModeAsync().done(() => {
                    editor.refreshMode();
                });
            }));
        }

        export function createChooseSkillLevelElements(click?: () => void): HTMLElement[] {
            initThemes();            
            return Util.values(editorModes).map((mode, index) => {
                var pic = div('pic');
                pic.style.background = Cloud.artCssImg(mode.artId, true);
                pic.style.backgroundSize = "cover";

                return div('editor-mode', pic, HTML.mkButton(mode.name,() => {
                    Ticker.rawTick('editorMode' + mode.id);
                    EditorSettings.setEditorMode(mode, true);
                    if (click) click();
                }, 'title'), div('descr', mode.descr));
            });
        }

        export function showChooseEditorModeAsync(preferredMode : string = undefined): Promise {
            TipManager.setTip(null)
            return new Promise((onSuccess, onError, onProgress) => {
                var m = new ModalDialog();
                m.onDismiss = () => onSuccess(undefined);
                m.add(div('wall-dialog-header', lf("choose your coding skill level")));
                m.add(div('wall-dialog-body', lf("We will adapt the editor to your coding skill level. You can change your skill level later in the hub.")));
                m.add(div('wall-dialog-body center', EditorSettings.createChooseSkillLevelElements(() => m.dismiss())));
                m.fullWhite();
                m.show();
            });
        }

        export var currentTheme: Cloud.ClientTheme;
        // call themeIntelliProfileAsync() to populate
        export var currentThemeIntelliProfile: AST.IntelliProfile;
        export function setTheme(theme: Cloud.ClientTheme) {
            Util.log('theme: ' + theme);
            currentTheme = theme;
            currentThemeIntelliProfile = undefined;
            currentEditorMode = undefined;
            updateThemeSettings();
            updateWallpaper();
        }
        export function loadThemeIntelliProfileAsync(): Promise { // of IntelliProfile
            // cache hit
            if (currentThemeIntelliProfile) return Promise.as(currentThemeIntelliProfile);
            // should we load anything?
            if (!currentTheme || !currentTheme.intelliProfileId) return Promise.as(undefined);
            // try loading profile data
            var update = ScriptCache.forcedUpdate(currentTheme.intelliProfileId);
            var p = update ? Promise.as(update.text) : ScriptCache.getScriptAsync(currentTheme.intelliProfileId);
            
            return p.then((text: string) => {
                    if (!text) {
                        Util.log('failed to load intelliprofile script');
                        return undefined;
                    }
                    Util.log('loading intelliprofile for theme');
                    var app = AST.Parser.parseScript(text);
                    AST.TypeChecker.tcApp(app);
                    currentThemeIntelliProfile = new AST.IntelliProfile();
                    currentThemeIntelliProfile.allowAllLibraries = true;
                    currentThemeIntelliProfile.loadFrom(app, false);

                    return currentThemeIntelliProfile;
                }, e => { return Promise.as(undefined) })
        }

        function updateThemeSettings() {
            var theme = EditorSettings.currentTheme;
            if (theme) {
                Browser.noAnimations = !!theme.noAnimations;
                Browser.lowMemory = !!theme.lowMemory;
            } else {
                Browser.noAnimations = false;
                Browser.lowMemory = false;
            }
        }
    }

    export interface ScriptTemplate {
        title: string;
        id: string;
        scriptid:string;
        //tick: Ticks; automatically generated
        icon: string;
        description: string;
        name: string;
        source: string;
        section: string;
        editorMode: number;
        caps?: string;
        baseId?: string;
        baseUserId?: string;
        requiresLogin?: boolean;
        editor?: string;
        updateLibraries?: boolean;
    }

    interface ITutorial {
        title: string;
        // Represents the progress of the script corresponding to that tutorial
        header?: Cloud.Header;
        // The tutorial per se (the terminology in the source code refers to
        // "topic")
        topic: HelpTopic;
        // The app that contains the tutorial
        app?: AST.App;
    }

    export module EditorSoundManager
    {
        var sounds : any = {};

        export var keyboardSounds = /sounds/.test(window.location.href);
        export function intellibuttonClick() { if (keyboardSounds) playSound('aonptkth'); }
        export function tutorialStepNew() { playSound('ncoqavnw', 1); }
        export function tutorialStepFinished() { playSound('sjmgbwrv', 1); }
        export function tutorialStart() { playSound('sjmgbwrv', 1); }

        export function startTutorial() {
            tutorialStart();
        }

        function playSound(id : string, volume : number = 0.2)
        {
            if (Browser.lowMemory) return;

            var snd = <TDev.RT.Sound>sounds[id];
            if(snd) snd.playAsync().done();
            else {
                TDev.RT.Sound.fromArtId(id).done(s => {
                    sounds[id] = s;
                    if (s) {
                        s.set_volume(volume);
                        s.playAsync().done();
                    }
                }, e => {});
            }
        }
    }
    
    export module TemplateManager {        
        export var createEditor : ExternalEditor = {
            company: "",
            name: lf("Create Code"),
            description: lf("Create a new script"),
            origin: "",
            path: "",
            id: "create",
            order: 5,
            logoUrl: "",
        };
        export var importEditor : ExternalEditor = {
            company: "",
            name: lf("Import Code"),
            description: lf("Import a script from a file"),
            origin: "",
            path: "",
            id: "import",
            order: 6,
            logoUrl: "",
        };
        export function chooseEditorAsync() : Promise { // of ScriptTemplate
            return new Promise((onSuccess, onError, onProgress) => {
                var m = new ModalDialog();
                m.onDismiss = () => onSuccess(undefined);

                var editors = [{
                    company: "Microsoft",
                    name: "Touch Develop",
                    description: lf("A beginner friendly editor"),
                    id: "touchdevelop",
                    origin: "",
                    path: "",
                    order: 2,
                }].concat(getExternalEditors());
                
                editors.sort((a, b) => a.order - b.order);
                
                // add import editor
                editors.push(importEditor)
                
                var elts = [];
                editors.forEach((k : ExternalEditor) => {
                    var res = mkEditorBox(k);
                    res.withClick(() => {
                        m.onDismiss = undefined;
                        m.dismiss();
                        onSuccess(k.id);
                    });
                    elts.push(res)
                })
                m.choose(elts, { header: lf("create code with...") });
            });
        }
        
        export function mkEditorBox(k: ExternalEditor): HTMLElement {
            var icon = div("sdIcon");
            var ic = ScriptInfo.editorIcons[k.id];
            icon.style.backgroundColor = ic.background;
            icon.setChildren([HTML.mkImg("svg:" + ic.icon + "," + (ic.color ? ic.color : "white"), '', k.name)]);

            var nameBlock = div("sdName", k.name);
            var hd = div("sdNameBlock", nameBlock);
            var author = div("sdAuthorInner", k.company);
            var addInfo = div("sdAddInfoInner", k.description);
            var res = div("sdHeaderOuter", div("sdHeader", icon, div("sdHeaderInner", hd, div("sdAuthor", author), div("sdAddInfoOuter", addInfo))));
            res.setAttribute("aria-label", k.name);
            return res;
        }
                
        export function createScript() {
            var gotoTemplate = () => {
                chooseScriptFromTemplateAsync()
                    .done(template => {
                        if (template) {
                            var stub: World.ScriptStub = {
                                editorName: "touchdevelop",
                                scriptName: template.name,
                                scriptText: template.source
                            };
                            TheHost.openNewScriptAsync(stub).done();
                        }
                    });
            };
            if (Cloud.isRestricted())
                chooseEditorAsync().done((editor) => {
                    if (!editor) return;
                    if (editor == "import") {
                        ArtUtil.importFileDialog();
                        return;
                    }
                    var p = Promise.as("");
                    if (editor == "touchdevelop")
                        p = Promise.as(ScriptCache.forcedUpdate('nmhibf').text);
                    p.then(src => {
                        var stub: World.ScriptStub = {
                            editorName: editor,
                            scriptName: lf("{0} script", TopicInfo.getAwesomeAdj()),
                            scriptText: src,
                        };
                        return TheHost.openNewScriptAsync(stub);
                    });
                    p.done();
                })
            else
                gotoTemplate();
        }
        
        export function chooseScriptFromTemplateAsync() : Promise { // of ScriptTemplate
            TipManager.setTip(null)

            return new Promise((onSuccess, onError, onProgress) => {
                var m = new ModalDialog();
                var templates = getAvailableTemplates();
                var sections = Util.unique(templates, t => t.section).map(t => t.section);
                var bySection = Util.groupBy(templates, t => t.section);
                m.onDismiss = () => onSuccess(undefined);
                var elts = []
                sections.forEach(k => {
                    if (k != "templates")
                        elts.push(div("modalSearchHeader section", lf_static(k, true)))
                    bySection[k].forEach((template: ScriptTemplate) => {
                        var icon = div("sdIcon");
                        icon.style.backgroundColor = ScriptIcons.stableColorFromName(template.title);
                        // missing icons
                        // icon.setChildren([HTML.mkImg("svg:" + template.icon + ",white")]);

                        var nameBlock = div("sdName", lf_static(template.title, true));
                        var hd = div("sdNameBlock", nameBlock);
                        var addInfo = div("sdAddInfoInner", lf_static(template.description, true));
                        var res = div("sdHeaderOuter", div("sdHeader", icon, div("sdHeaderInner", hd, div("sdAddInfoOuter", addInfo))));

                        res.withClick(() => {
                            m.onDismiss = undefined;
                            m.dismiss();
                                renameScriptFromTemplateAsync(template, false)
                                .done((temp : ScriptTemplate) => onSuccess(temp), e => onSuccess(undefined));
                        });
                        elts.push(res)
                    })
                })
                m.choose(elts, { searchHint: lf("search templates"), header: lf("pick a script template...") });
            });
        }
        
        export function createScriptFromTemplate(template: ScriptTemplate) {
            renameScriptFromTemplateAsync(template, true)
                .then((temp : ScriptTemplate) => {
                if (temp)
                    return TheHost.openNewScriptAsync(<World.ScriptStub>{
                        editorName: temp.editor || "touchdevelop",
                        scriptText: temp.source,
                        scriptName: temp.name
                    }, temp);
                    else
                        return Promise.as();
                })
                .done();
        }
        
        export function expandTemplateName(name: string): string {
            if (name) name = name.replace(/ADJ/g, () => TopicInfo.getAwesomeAdj());
            return name;            
        }

        function renameScriptFromTemplateAsync(template:ScriptTemplate, headless : boolean)  : Promise // of ScriptTemplate
        {
            if (!Cloud.getUserId() && template.requiresLogin) {
                Hub.loginToCreate(template.title, "create:" + template.id)
                return Promise.as(undefined);
            }

            Ticker.rawTick('scriptTemplate_' + template.id);

            template = JSON.parse(JSON.stringify(template)); // clone template
            template.name = expandTemplateName(template.name);

            return TheHost.updateInstalledHeaderCacheAsync()
                .then(() => new Promise((onSuccess, onError, onProgress) => {
                    template.name = TheHost.newScriptName(template.name);
                    if (headless) {
                        onSuccess(template);
                        return;
                    }
                    var nameBox = HTML.mkTextInput("text", lf("Enter a script name..."));
                    nameBox.value = TheHost.newScriptName(template.name)
                    var m = new ModalDialog();
                    m.onDismiss = () => onSuccess(undefined);
                    var create = () => {
                        m.onDismiss = undefined;
                        m.dismiss();
                        template.name = nameBox.value;
                        TheHost.clearAsync(false)
                            .done(() => onSuccess(template), e => onSuccess(undefined))
                    }
                    // no cancel when using #derive:... route
                    if (template.id == "derive")
                        m.onDismiss = create;
                    m.add([
                        div("wall-dialog-header", lf_static(template.title, true)),
                        div("wall-dialog-body", lf_static(template.description, true)),
                        div("wall-dialog-line-textbox", nameBox),
                        //div("wall-dialog-body", lf("Tip: pick a good name for your script.")),
                        div("wall-dialog-buttons", HTML.mkButton(lf("create"), create))
                    ]);
                    m.show();
                }));
        }

        var _templates: ScriptTemplate[];       
        function getAvailableTemplates():ScriptTemplate[]
        {
            if (!_templates) {
                _templates = (<any>TDev).scriptTemplates.filter(t => isBeta || !t.betaOnly);
                _templates.forEach(t => t.source = ScriptCache.forcedUpdate(t.scriptid).text);
            }
            // filter by editor mode
            var currentCap = PlatformCapabilityManager.current();
            var theme = EditorSettings.currentTheme;
            return _templates
                .filter(template => {
                    if (theme && theme.scriptTemplates && theme.scriptTemplates.indexOf(template.id) < 0) return false;
                    if (!template.caps) return true;
                    else {
                        var plat = AST.App.fromCapabilityList(template.caps.split(/,/))
                        return (plat & currentCap) == plat;
                    }
                })
        }        
    }

    export class Hub
        extends Screen {
        constructor() {
            super()
            this.topContainer = div(null, this.logo, this.meBox, this.notificationBox);
            this.topBox = div(null, this.topContainer);
            this.eol = document.createElement("a");
            this.eol.className = "eol";
            this.eol.innerText = "Touch Develop retirement postponed until June 22, 2019.  Sign-in and access to cloud assets to be removed on May 23, 2018. Learn more.";
            this.eol.href = "https://makecode.com/touchdevelop";
            this.theRoot = div("hubRoot", this.bglogo, this.mainContent, this.topBox);
        }
        private mainContent = div("hubContent");
        private logo = div("hubLogo", SVG.getTopLogo());
        private bglogo = div("hubBgLogo", HTML.mkImg("svg:touchDevelop,currentColor", '', '', true));
        private meBox = div("hubMe");
        private eol: HTMLAnchorElement;
        private notificationBox = div("notificationBox");
        private topBox: HTMLElement;
        private topContainer: HTMLElement;
        private theRoot: HTMLElement;
        private visible = false;

        private historyMode = false;
        public vertical = true;

        private afterSections: () => void = null;

        public screenId() { return "hub"; }

        public init() {
            this.theRoot.style.display = "none";
            this.theRoot.id = "hubRoot";
            elt("root").appendChild(this.eol); 
            elt("root")
                .appendChild(this.theRoot);
            this.logo.withClick(() => {
                tick(Ticks.hubAbout);
                Hub.showAbout();
            });
            if (!Browser.mobileWebkit)
                this.mainContent.addEventListener("scroll",() => this.paralax())
            ArtUtil.setupDragAndDrop(document.body);
        }

        public keyDown(e: KeyboardEvent) {
            var s = Util.keyEventString(e);
            if (s && !e.ctrlKey && !e.metaKey) {
                this.hide();
                this.browser().initialSearch = s;
                this.browser().showList("search");
                return true;
            }
            return false;
        }

        private paralax() {
            if (Browser.noAnimations) return;

            if (this.vertical) {
                var dx = -this.mainContent.scrollTop / 10;
                Util.setTransform(this.bglogo, "translate(0px," + dx + "px)")
            } else {
                var dx = -this.mainContent.scrollLeft / 10;
                Util.setTransform(this.bglogo, "translate(" + dx + "px, 0px)")
            }
        }

        private show() {
            if (!this.visible && !Cloud.isRestricted()) {
                this.theRoot.style.display = "block";
                this.visible = true;
                currentScreen = this;
                setGlobalScript(null);
                TheEditor.historyMgr.setHash("hub", "");
                Host.tryUpdate();
            }
        }

        public hide() {
            if (this.visible) {
                TipManager.setTip(null);
                this.theRoot.style.display = "none";
                this.visible = false;
            }
            World.cancelContinuouslySync();
        }

        public applySizes() {
            this.updateSections();
        }

        public syncDone() {
            this.updateSections();
            World.continuouslySyncAsync(false, () =>
                this.showSectionsCoreAsync(true)).done();
        }

        private browser(): Host { return TheHost; }
        
        static legacyTemplateIds: StringMap<string> = {
            turtle: "firststepswithturtle",
            bouncingmonster: "monsterslicertutorial",
            soundboard: "soundboardtutorial",
            lovemenot: "lovemenottutorial",
            fallingrocks: "fallingrockstutorial",
            popper: "bubblepoppertutorial",
            bubbles: "bouncingbubbleswalkthrough",
            shaker: "songshakertutorial",
            tapmania: "tapmaniatutorial",
            cutestvotingapp: "cutestvotingapptutorial",
            mapofthings: "mapofthingstutorial",
            acceleroturtle: "acceleroturtle",
            turtlestrianglespiral: "turtletrianglespiraltutorial",
            turtlefractals: "turtlefractalstutorial",
            turtletree: "turtletreetutorial",
            drawing: "firststepswithdrawing",
            pixels: "pixelstutorial",
            scratchdancingcat: "scratchcattutorial",
            scratchhideandseek: "hideandseekscratchtutorial",
            scratchpong: "scratchpongtutorial",
            quadraticequationsolver: "quadraticequationsolver",
            turtlesphero: "funwithspheroturtle",
            makeybeatbox: "makeymakeybeatboxtutorial",
            esploralevel: "esploraleveltutorial",
            small: "insanelyshorttutorial",
        }
     
        private followOrContinueTutorial(top: HelpTopic, tutorialMode?: string) {
            this.tutorialsByUpdateIdAsync()
                .done(tutorials => {
                var h: AST.HeaderWithState = tutorials[top.updateKey()]
                if (!h || h.status == "deleted") {
                    Util.log('follow, not previous script found, starting new');
                    TopicInfo.followTopic(top, tutorialMode)
                } else {
                    var st = h.editorState;
                    this.browser().createInstalled(h).edit()
                }
            })
        }

        public loadHash(h: string[]) {
            TipManager.update();
            if (h[1] == "logout") {
                // we may be hosed enough that ModalDialog.ask doesn't work anymore
                if (window.confirm(lf("Do you really want to sign out?\nAll your script data and any unsynchronized script changes will be lost.")) == true) {
                    TheEditor.logoutAsync(false).done();
                    return;
                }
            }

            if (h[1] == "signout") {
                TheEditor.logoutDialog()
                return
            }

            if (h[1] == "migrate") {
                Login.show("hub", "&u=" + encodeURIComponent(h[2]))
                return
            }

            if (h[1] == "signin") {
                Login.show(h[2] || (Cloud.isRestricted() ? "list:installed-scripts" : "hub"))
                return
            }

            if (h[1] == 'new') {
                var id = h[2];                
                if (Hub.legacyTemplateIds.hasOwnProperty(id))
                    id = Hub.legacyTemplateIds[id]
                Util.setHash("follow:" + id, true)                
                return
            }

            if (h[1] == 'account-settings') {
                this.afterSections = () => Hub.accountSettings();
            }

            if (h[1] == 'settings') {
                this.afterSections = () => TheEditor.popupMenu();
            }

            if (h[1] == "install-run" && /^\w+$/.test(h[2])) {
                this.browser().clearAsync(true).done(() => {
                    var details = this.browser().getScriptInfoById(h[2])
                    details.run();
                })
                return
            }

            if ((h[1] == "follow" || h[1] == "follow-tile") && /^\w+$/.test(h[2])) {
                // temporary fix
                if (h[2] == 'jumpingbird') h[2] = 'jumpingbirdtutorial';
                Util.log('follow: {0}', h[2]);
                // if specified, force the current editor mode
                EditorSettings.loadEditorMode(h[3]);
                this.browser().clearAsync(true)
                    .done(() => {
                    // try finding built-in topic first
                    var bt = HelpTopic.findById(h[2]);
                    if (bt) {
                        Util.log('found built-in topic ' + bt.id);
                        this.followOrContinueTutorial(bt);
                    }
                    else {
                        ProgressOverlay.show(lf("loading tutorial"),() => {
                            TheApiCacheMgr.getAsync(h[2], true)
                                .then((res: JsonIdObject) => {
                                if (res && res.kind == "script" && res.id != (<JsonScript>res).updateid) {
                                    Util.log('follow topic updated to ' + (<JsonScript>res).updateid);
                                    return TheApiCacheMgr.getAsync((<JsonScript>res).updateid, true);
                                }
                                else return Promise.as(res);
                            })
                                .done(j => {
                                ProgressOverlay.hide();
                                if (j && j.kind == "script") {
                                    Util.log('following ' + j.id);
                                    this.followOrContinueTutorial(HelpTopic.fromJsonScript(j));
                                } else {
                                    Util.log('followed script not found');
                                    Util.setHash(TDev.hubHash);
                                }
                            },
                                e => {
                                    ProgressOverlay.hide();
                                    Util.log('follow route error: {0}, {1}' + h[2], e.message);
                                    Util.setHash(TDev.hubHash);
                                });
                        });
                    }
                });
                return;
            }

            this.showSections();

            switch (h[1]) {
                case "pub": // redirect to list
                    Util.setHash("#list:installed-scripts:pub:" + h[2], true);    
                    return;
                case "create":
                case "derive":
                    Util.setHash("#list:installed-scripts:create:" + h[2], true);
                    return;    
                default:
                    if (TDev.noHub)
                        Util.setHash("#" + TDev.hubHash, true);    
                    break;
            }
            
        }

        private tileClick(t: HTMLElement, f: () => void) {
            t.withClick(() => {
                var p = Util.offsetIn(t, this.theRoot);
                t.style.left = p.x + "px";
                t.style.top = p.y + "px";
                t.removeSelf();
                this.theRoot.appendChild(t);
                Util.coreAnim("fadeSlide", 200, this.mainContent,() => {
                    t.removeSelf();
                    f();
                })
            });
        }

        private layoutTiles(c: HTMLElement, elements: HTMLElement[], noFnBreak = false) {
            var margin = 0.3;
            var maxHeight = 20;
            var rowWidth = 0;
            var maxY = 0;
            var x = 0;
            var y = 0;
            c.setChildren(elements);
            var beforeFirstFnBtn = elements.filter((e) => !(<any>e).fnBtn).peek();
            if (elements.some((e) => (<any>e).tutorialBtn))
                beforeFirstFnBtn = elements.filter((e) => !(<any>e).tutorialBtn).peek();
            if (noFnBreak) beforeFirstFnBtn = null;

            var heightUnit = (7 + margin) / 2;
            elements.forEach((t: HTMLElement, i) => {
                t.style.left = x + "em";
                t.style.top = y + "em";
                var w = 7;
                var h = 2;
                if (/hubTileSize0/.test(t.className)) h = 1;
                if (/hubTileSize[23]/.test(t.className)) w = 11;
                if (/hubTileSize3/.test(t.className)) h = 4;
                h *= heightUnit;
                rowWidth = Math.max(rowWidth, w);
                y += h;
                maxY = Math.max(y, maxY);
                if (t == beforeFirstFnBtn || y > maxHeight || (elements[i + 1] && (<any>elements[i + 1]).breakBefore)) {
                    y = 0;
                    x += rowWidth + margin;
                    rowWidth = 0;
                }
            });
            c.style.height = maxY + 0.2 + "em";
        }

        private mkFnBtn(lbl: string, f: () => void, t = Ticks.noEvent, modal = false, size = 1, ovrLbl = null) {
            var wordLength = Util.wordLength(lbl);
            var words = lbl.split(/\s+/).length;
            var elt = div("hubTile hubTileBtn hubTileSize" + size,
                dirAuto(div("hubTileBtnLabel " + (
                    size <= 1 && wordLength > 18 ? " hubTileBtnLabelTiny" :
                    size <= 1 && (wordLength > 10) ? " hubTileBtnLabelSmall" :
                    wordLength >= 7 || (words >=3 && wordLength > 4) || (size < 3 && lbl.length > 20) || Util.hasCJKChars(lbl) ? " hubTileBtnLabelMedium"
                    : ""), ovrLbl, lbl)));
            (<any>elt).fnBtn = 1;
            var f0 = () => { tick(t); f() };
            if (t)
                elt.id = "btn-" + Ticker.tickName(t)
            if (modal)
                elt.withClick(f0);
            else
                this.tileClick(elt, f0);
            return elt;
        }

        static loginToCreate(name:string, hash:string)
        {
            var m = new ModalDialog();
            m.addHTML(
                Util.fmt(lf("<h3>{0:q} requires sign&nbsp;in</h3>"), name) +
                  "<p class='agree'>" +
                  lf("This tutorial uses cloud data which is shared with other users.") +
                  "</p>"
                )
            m.fullWhite();
            m.add(div("wall-dialog-buttons",
                HTML.mkButton(lf("sign in"), () => {
                    Login.show(hash);
                })));
            m.show();
        }

        public tutorialsByUpdateIdAsync(): Promise // StringMap<AST.HeaderWithState>
        {
            return this.browser().getTutorialsStateAsync().then((headers:AST.HeaderWithState[]) => {
                var res = {}
                headers.forEach(h => {
                    var id = h.editorState.tutorialUpdateKey
                    if (res.hasOwnProperty(id) && res[id].recentUse > h.recentUse)
                        return;
                    res[id] = h
                })
                return res
            })
        }

        private headerByTutorialId:Promise;
        private headerByTutorialIdUpdated:number;

        public topicTile(templateId:string, topDesc:string):HTMLElement
        {
            var tileOuter = div("tutTileOuter tutTileLink")

            var top = HelpTopic.findById("t:" + templateId)

            var tile = div("tutTile")
            tileOuter.setChildren([tile])

            tile.appendChildren([
                div("tutTileLinkLabel",
                    div("tutTileLinkMore", topDesc),
                    div("tutTileLinkTitle", top ? top.json.name : "[missing] " + templateId))
            ])

            tile.withClick(() => {
                Util.setHash("#topic:" + templateId)
            })

            return tileOuter
        }

        // From what I understand, finding a tutorial is all but an easy task.
        // There's a variety of steps involved which I tried to isolate in this
        // function...
        // - [headerByTutorialId] is a promise of a map from tutorial id (e.g.
        //   "t:codingjetpackjumper" to the corresponding [Cloud.Header])
        // - the result of this promise is considered good for three seconds
        //   only, and is renewed after that by re-assigning a fresh promise
        //   into the variable
        // - the result of a call to [HelpTopic.findById]...  may return a
        //   null-ish value in case the tutorial is not in the cache; if this is
        //   the case, we fetch the corresponding tutorial using [TheApiCacheMgr]
        //   and follow the succession of updates to the tutorial.
        // - once this is done, we call [finish]
        // - because we may have found the tutorial we wanted in the process, we
        //   return a new value for [top]
        private findTutorial(templateId: string, finish: (res: { app: AST.App; headers: StringMap<AST.HeaderWithState> }, top: HelpTopic) => void) {
            var top = HelpTopic.findById("t:" + templateId)

            if (!this.headerByTutorialId || Date.now() - this.headerByTutorialIdUpdated > 3000) {
                this.headerByTutorialId = this.tutorialsByUpdateIdAsync();
                this.headerByTutorialIdUpdated = Date.now()
            }

            if (top) {
                Promise.join([Promise.as(null), this.headerByTutorialId]).done(res => finish({ app: res[0], headers: res[1] }, top));
            } else {
                var fetchingId = null
                var fetchId = id => {
                    // Is the pointer structure of [updateid]'s expected to
                    // loop? I assume that we abort in this case?
                    if (fetchingId == id)
                        return;
                    fetchingId = id;
                    TheApiCacheMgr.getAnd(id, (j:JsonScript) => {
                        if (j.updateid && j.id !== j.updateid && j.updatetime > j.time)
                            fetchId(j.updateid);
                        else {
                            top = HelpTopic.fromJsonScript(j);
                            Promise.join([top.initAsync(), this.headerByTutorialId]).done(res => finish({ app: res[0], headers: res[1] }, top));
                        }
                    })
                }

                fetchId(templateId);
            }
        }
        
        // Start a tutorial, with an (optional) header that represents progress,
        // along with an optional function.
        private startTutorial(top: HelpTopic, header: Cloud.Header = null) {
            if (header) {
                this.browser().createInstalled(header).edit();
            } else {
                TopicInfo.followTopic(top);
            }
        }

        private findImgForTutorial(app: AST.App) {
            // XXX it seems that this function is actually unused as [app] is
            // always null?!!
            if (!app) return null;

            var findImg = t => app.resources().filter(r =>
                    r.getKind() == api.core.Picture &&
                    t.test(r.getName()) &&
                    Cloud.isArtUrl(r.url))[0];

            var img = findImg(/screenshot/) || findImg(/background/);

            return img;
        }

        public tutorialTile(templateId:string, f:(startFrom:Cloud.Header)=>void):HTMLElement
        {
            var tileOuter = div("tutTileOuter")

            var startTutorial = (top : HelpTopic, header: Cloud.Header) => {
                Util.log("tutorialTile.start: " + templateId)
                if (f)
                    f(header);
                this.startTutorial(top, header);
            };

            var finish = (res: { app: AST.App; headers: StringMap<AST.HeaderWithState> }, top: HelpTopic) => {
                var isHelpTopic = !!top;
                var tile = div("tutTile")
                tileOuter.setChildren([tile])

                var app:AST.App = res.app
                var progs = res.headers

                var titleText = top.json.name.replace(/ (tutorial|walkthrough)$/i, "");
                var descText = top.json.description.replace(/ #(docs|tutorials|stepbystep)\b/ig, " ")
                descText = descText.replace(/\s+\.$/, "")

                var author = top.fromJson && top.fromJson.userid != "jeiv" ? top.fromJson.username : "Touch Develop";
                var titleDiv;
                tileOuter.appendChildren([
                    div("tutDesc",
                      titleDiv = div("tutDescFirst",
                          div("tutDescTitle", titleText),
                          div(null, descText)),
                        div("tutAuthor", "by " + author).withClick(() => {
                            if (isHelpTopic)
                                Util.setHash("topic:" + templateId);
                            else
                                Util.setHash("script:" + top.json.id);
                        })
                    )
                ])

                var cap = AST.App.fromCapabilityList(top.json.platforms || [])
                if (cap & ~api.core.currentPlatform) {
                    tileOuter.appendChildren([
                        div("tutWarning", HTML.mkImg("svg:Warning,currentColor"))
                    ])
                }


                var img = this.findImgForTutorial(app);
                var imgUrl = img ? img.url : top.json.screenshot;

                if (imgUrl && !Browser.lowMemory) {
                    var picDiv = tile
                    picDiv.style.backgroundColor = '#eee';
                    picDiv.style.backgroundImage = HTML.cssImage(imgUrl);
                    picDiv.style.backgroundRepeat = 'no-repeat';
                    picDiv.style.backgroundPosition = 'center';
                    picDiv.style.backgroundSize = 'cover';
                } else {
                    tile.style.backgroundColor = top.json.iconbackground;
                    var icon = div("tutIcon");
                    icon.setChildren([HTML.mkImg("svg:" + top.json.icon + ",white")]);
                    tile.appendChildren([icon])
                }

                var continueHeader:Cloud.Header = null

                var id = top.updateKey()
                if (progs.hasOwnProperty(id)) {
                    var h:AST.HeaderWithState = progs[id]
                    continueHeader = h
                    var prog = h.editorState

                    var starSpan = span("bold", ((prog.tutorialStep || 0) + 1) + "★");
                    var ofSteps = prog.tutorialNumSteps ? " of " + (prog.tutorialNumSteps + 1) : ""
                    tile.appendChild(div("tutProgress",
                        ((prog.tutorialStep && (prog.tutorialStep == prog.tutorialNumSteps)) ?
                            div("steps", lf("done!"), div("label", starSpan))
                            : div("steps", starSpan, ofSteps, div("label", lf("tutorial progress")))),
                            div("restart", HTML.mkButton(lf("start over"), () => startTutorial(top, null)))))
                }

                titleDiv.withClick(() => startTutorial(top, continueHeader))
                tile.withClick(() => startTutorial(top, continueHeader))
            };

            this.findTutorial(templateId, finish);

            return tileOuter
        }

        private startTutorialButton(t: Ticks)
        {
            var elt = this.mkFnBtn(lf("Tutorials"),() => {
                this.browser().showList(Cloud.config.tutorialsid + "/scripts", { header: lf("tutorials") });
            }, t, true, 3, dirAuto(div("hubTileOver", lf("Create your own apps"))));

            if (!Browser.lowMemory) {
                elt.style.backgroundSize = 'contain';
                elt.style.backgroundImage = Cloud.artCssImg('zxddkvgm');
                elt.style.backgroundRepeat = 'no-repeat';
            }
            elt.className += " tutorialBtn";

            return elt
        }

        private showTutorialTip()
        {
            if (!this.visible) return;
            if (ModalDialog.currentIsVisible()) {
                Util.setTimeout(1000, () => this.showTutorialTip())
                return;
            }
            TipManager.setTip(null)
            TipManager.setTip({
                tick: Ticks.hubFirstTutorial,
                title: lf("tap there"),
                description: lf("we'll guide you step by step"),
                //forceTop: true,
            })
        }

        private addPageTiles(s: string, c: HTMLElement, items: BrowserPage[]) {
            var elements: HTMLElement[] = [];

            if (s == "top" || s == "showcase" || s == "new") {
                items = items.filter((s) => !(s instanceof ScriptInfo) || (<ScriptInfo>s).willWork())
            }

            var tutorialOffset = 0
            function tileSize(k) {
                k += tutorialOffset
                var sz = 1;
                if (k == 0) sz = 3;
                else if (k == 1) sz = 2;
                return sz;
            }

            var scriptSlots = 0
            if (s == "recent" && items.length < 5) {
                scriptSlots = 5 - items.length
                if (EditorSettings.widgets().startTutorialButton) {
                    tutorialOffset++;
                    elements.push(this.startTutorialButton(Ticks.hubFirstTutorial))
                    scriptSlots--;
                }
            }


            items.slice(0, 5).forEach((item, i) => {
                var sz = tileSize(i);
                var t = items[i].mkTile(sz);
                this.tileClick(t, () => {
                    this.hide();
                    if (s == "recent") this.browser().showList("installed-scripts", { item: item });
                    else if (s == "myart") this.browser().showList(Cloud.getUserId() ? "myart" : "art", { item: item });
                    else if (s == "art") this.browser().showList("art", { item: item });
                    else if (s == "users") this.browser().showList("users", { item: item });
                    else if (s == "channels") this.browser().showList("channels", { item: item });
                    else if (s == "showcase") this.browser().showList(Cloud.config.showcaseid + "/scripts", { item: item, header: lf("showcase") });    
                    else if (s == "tutorials") this.browser().showList(Cloud.config.tutorialsid + "/scripts", { item: item, header: lf("tutorials") });    
                    else this.browser().showList(s + "-scripts", { item: item });
                });
                elements.push(t);
            });

            if (scriptSlots && items.length == 0 && EditorSettings.widgets().startTutorialButton) {
                Util.setTimeout(1000, () => this.showTutorialTip())
            }

            while (scriptSlots-- > 0) {
                var oneSlot = this.mkFnBtn(lf("Your script will appear here"),() => {
                    this.showTutorialTip()
                }, Ticks.hubFirstTutorial, true, tileSize(elements.length - tutorialOffset));
                oneSlot.className += " scriptSlot";
                elements.push(oneSlot)
            }

            var beforeFirstFnBtn = null;
            var noFnBreak = false;


            var addFnBtn = (lbl: string, t, f: () =>void , modal = false, size = 1) => {
                elements.push(this.mkFnBtn(lbl, f, t, modal, size));
            }

            if (s == "recent") {
                noFnBreak = true;
                addFnBtn(lf("All my scripts"), Ticks.hubSeeMoreMyScripts,
                    () => { this.hide(); this.browser().showList("installed-scripts") });
                elements.peek().appendChild(div("hubTileSearch", HTML.mkImg("svg:search,white")));
                addFnBtn(lf("Create Script"), Ticks.hubCreateScript, () => { TemplateManager.createScript(); }, true);

                if (EditorSettings.widgets().hubScriptUpdates) {
                    var upd = this.browser().headersWithUpdates();
                    if (upd.length > 0) {
                        var updBtn =
                            this.mkFnBtn(lf("Script Updates"),() => { this.updateScripts() }, Ticks.hubUpdates, true);
                        updBtn.appendChild(div('hubTileCounter', upd.length.toString()));
                        elements.push(updBtn)
                    }
                }
            }
            else if (s == "art" || s == "myart") {
                noFnBreak = true;
                while(elements.length < 5) {
                    var oneSlot = this.mkFnBtn(lf("Your art will appear here"), () => {
                    }, Ticks.hubFirstTutorial, true, tileSize(elements.length));
                    oneSlot.className += " scriptSlot";
                    elements.push(oneSlot)
                }
                addFnBtn(lf("See More"), Ticks.hubSeeMoreArt, () => { this.hide(); this.browser().showList("myart") });
                elements.peek().appendChild(div("hubTileSearch", HTML.mkImg("svg:search,white")));
                addFnBtn(lf("Upload Picture"), Ticks.hubUploadPicture, () => { ArtUtil.uploadPictureDialogAsync({ finalDialog: true }).done() }, true);
                addFnBtn(lf("Upload Sound"), Ticks.hubUploadSound, () => { ArtUtil.uploadSoundDialogAsync().done() }, true);
            }
            else if (s == "channels") {
                noFnBreak = true;
                while (elements.length < 5) {
                    var oneSlot = this.mkFnBtn(lf("Your channel will appear here"),() => {
                    }, Ticks.hubFirstTutorial, true, tileSize(elements.length));
                    oneSlot.className += " scriptSlot";
                    elements.push(oneSlot)
                }

                addFnBtn(lf("See More"), Ticks.hubSeeMoreLists,
                    () => { this.hide(); this.browser().showList("channels") });
                elements.peek().appendChild(div("hubTileSearch", HTML.mkImg("svg:search,white")));
                addFnBtn(lf("Create channel"), Ticks.hubCreateList,
                    () => { this.browser().createChannel(); });
                elements.peek().appendChild(div("hubTileSearch", HTML.mkImg("svg:list,white")));
            } else if (s == "showcase") {
                addFnBtn(lf("See More"), Ticks.hubSeeMoreShowcase,
                () => { this.hide(); this.browser().showList(Cloud.config.showcaseid + "/scripts", { header : lf("showcase")}) });
                elements.peek().appendChild(div("hubTileSearch", HTML.mkImg("svg:search,white")));                
            } else if (s == "tutorials") {
                addFnBtn(lf("See More"), Ticks.hubSeeMoreTutorials,
                () => { this.hide(); this.browser().showList(Cloud.config.tutorialsid + "/scripts", { header : lf("tutorials")}) });
                elements.peek().appendChild(div("hubTileSearch", HTML.mkImg("svg:search,white")));                
            } else {
                //if (items.length > 5)
                // there is almost always more; the list will filter by capabilities, so it may seem short
                addFnBtn(lf("See More"), s == "new" ? Ticks.hubSeeMoreNewScripts :
                                     s == "top" ? Ticks.hubSeeMoreTopScripts :
                                     Ticks.hubSeeMoreCloudOther,
                () => { this.hide(); this.browser().showList(s + "-scripts") });
                elements.peek().appendChild(div("hubTileSearch", HTML.mkImg("svg:search,white")));

                if (s == "top") {
                    addFnBtn(lf("New Scripts"), Ticks.hubSeeMoreNewScripts,
                        () => { this.hide(); this.browser().showList("new-scripts") });
                    elements.peek().appendChild(div("hubTileSearch", HTML.mkImg("svg:star,white")));
                }
            }

            this.layoutTiles(c, elements, noFnBreak);
        }

        private updateScripts()
        {
            var boxes = this.browser().headersWithUpdates().map((h) => {
                var c = HTML.mkCheckBox(h.name);
                (<any>c).scriptGuid = h.guid;
                HTML.setCheckboxValue(c, true);
                return c;
            })

            var update = () => {
                tick(Ticks.hubDoUpdates);
                var byGuid = {}
                var forUpdate:Cloud.Header[] = []
                this.browser().headersWithUpdates().forEach((h) => {
                    byGuid[h.guid] = h
                })
                boxes.forEach((b) => {
                    if (HTML.getCheckboxValue(b)) {
                        var h = byGuid[(<any>b).scriptGuid];
                        if (h) {
                            forUpdate.push(h);
                        }
                    }
                })
                ProgressOverlay.lockAndShow(lf("updating your scripts"), () => {
                    var idx = 0;
                    var promises = []
                    forUpdate.forEach((h) => {
                        promises.push(World.updateAsync(h.guid)
                            .then(() => {
                                ProgressOverlay.setProgress(lf("{0} of {1} done", ++idx, forUpdate.length))
                            }))
                    })
                    Promise.join(promises).done(() => {
                        ProgressOverlay.hide();
                        this.showSections();
                    })
                })
            }

            var m = new ModalDialog();
            m.add(div("wall-dialog-header", lf("{0} script{0:s} to update", boxes.length)))
            if (dbg)
                m.add(div("wall-dialog-buttons",
                        HTML.mkButton(lf("select all"), () => { boxes.forEach((b) => HTML.setCheckboxValue(b, true) ) }),
                        HTML.mkButton(lf("unselect all"), () => { boxes.forEach((b) => HTML.setCheckboxValue(b, false) ) })))
            m.add(HTML.mkModalList(boxes));
            m.add(div("wall-dialog-buttons",
                    HTML.mkButton(lf("cancel"), () => m.dismiss()),
                    HTML.mkButton(lf("update them!"), () => { m.dismiss(); update(); })))
            m.show();
        }

        private showSectionsCoreAsync(skipSync = false)
        {
            return this.browser().clearAsync(skipSync).then(() => {
                this.updateSections();
                if (this.afterSections) {
                    var f = this.afterSections;
                    this.afterSections = null;
                    f();
                }
            });
        }

        private temporaryRequestedSignin = false;
        private showingTemporarySignin = false;
        private showTemporaryNotice() {
            if ((!Storage.temporary || this.showingTemporarySignin) ||
                !EditorSettings.widgets().showTemporaryNotice ||
                ModalDialog.currentIsVisible()) return;

            // if only and not signed in, request to sign in
            if (!this.temporaryRequestedSignin
                && Cloud.isOnline()
                && Cloud.isAccessTokenExpired()) {
                this.temporaryRequestedSignin = true;
                this.showingTemporarySignin = true;
                var d = new ModalDialog();
                d.add(div('wall-dialog-header', lf("Sign in to avoid losing your scripts!")));
                d.add(div('wall-dialog-body', lf("Your browser does not allow Touch Develop to store web site data. This usually happens if run in Private Mode (Safari), in InPrivate mode (Internet Explorer) or your security settings prevent data storage.")));
                d.add(div('wall-dialog-body', lf("When you sign in, Touch Develop will save your scripts in the cloud.")));
                d.add(div("wall-dialog-buttons",
                    HTML.mkButton(lf("skip this"), () => {
                        this.showingTemporarySignin = false;
                        d.canDismiss = true;
                        d.dismiss();
                    }),
                    HTML.mkButton(lf("sign in"), () => {
                        this.showingTemporarySignin = false;
                        if (Login.show()) {
                            d.canDismiss = true;
                            d.dismiss();
                        }
                    })
                ));
                d.fullWhite()
                    d.canDismiss = false;
                d.show();
            } else {
                if (EditorSettings.widgets().showTemporaryNotice)
                    Storage.showTemporaryWarning();
            }
        }

        static userPictureChooser(fbButton:boolean, onUpd:()=>void)
        {
            var preview = <HTMLImageElement> document.createElement("img");
            var placeholder = "https://az31353.vo.msecnd.net/c04/nbpp.png"
            preview.onerror = () => {
                if (preview.src != placeholder && Cloud.isOnline())
                    preview.src = placeholder;
            };
            var error = div("formError");
            var msg = div("formHint");
            var updatePreview = () => {
                preview.src = Cloud.getPrivateApiUrl("me/picture?nocache=" + Util.guidGen())
            }
            updatePreview();
            var chooser = HTML.mkImageChooser((uri) => {
                var img = <HTMLImageElement>HTML.mkImg(uri)
                function onLoad() {
                    var w = img.width;
                    var h = img.height;
                    if (w < 150 || h < 150) {
                        error.setChildren(lf("image too small (we need 150x150px or more)"))
                        return;
                    }

                    // 500px max
                    var f = 500 / Math.max(w, h);

                    if (f > 1) f = 1;
                    var canvas = <HTMLCanvasElement>document.createElement("canvas");
                    canvas.width = Math.floor(w * f);
                    canvas.height = Math.floor(h * f);
                    var ctx = canvas.getContext("2d");
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    uri = canvas.toDataURL('image/jpeg', 0.85);

                    preview.src = uri;
                    msg.setChildren([])
                    error.setChildren([])
                    Cloud.postPrivateApiAsync("me/picture", {
                            content: uri.replace(/^[^,]*,/, ""),
                            contentType: "image/jpeg"
                    }).done(resp => {
                        msg.setChildren(lf("picture changed; it may take a few minutes and a page reload for the changes to show up"));
                        onUpd();
                        updatePreview();
                    }, err => {
                        error.setChildren(lf("failed to upload image"));
                        updatePreview();
                    })
                }

                img.onload = onLoad;
            })

            var widget = div("form-section",
                div("float-right", preview),
                div(null, lf("picture")),
                div(null, chooser),
                error,
                msg,
                HTML.mkButton(lf("remove picture"), () => {
                    Util.httpDeleteAsync(Cloud.getPrivateApiUrl("me/picture")).done(() => {
                        msg.setChildren(lf("picture removed"));
                        updatePreview();
                    })
                }),
                !fbButton ? null :
                HTML.mkButton(lf("get from facebook"), () => {
                    Util.httpPostJsonAsync(Cloud.getPrivateApiUrl("me/settings"), { picturelinkedtofacebook: true }).done(() => {
                        msg.setChildren(lf("picture linked to your facebook profile"));
                        updatePreview();
                    })
                }),
                div("clear"))
            return widget;
        }

        static askToEnableNotifications(finish: () => void = undefined) {
            if (finish)
                finish();
        }

        static accountSettings(notificationsOnly: boolean = false, finish: () => void = undefined) {
            if (Cloud.anonMode(lf("editing user settings"), null, true)) return;

            var d = new ModalDialog();
            var updated = false;
            if (finish === undefined && !notificationsOnly)
                finish = () => {
                    if (updated && !Storage.showTemporaryWarning())
                            Util.setTimeout(500, () => window.location.reload());
                };
            var dialogBody = div(null)
            Browser.setInnerHTML(dialogBody, lf("<h3>loading current settings...</h3>"));
            d.add(dialogBody)
            var err = div("formError");

            var lastDiv;
            var textEntry = (lbl: any, inp: HTMLElement, ...rest: any[]) => {
                dialogBody.appendChild(lastDiv = div("form-section", HTML.label("", HTML.span("input-label", lbl), inp, div("formHint", rest))))
                return inp;
            }

            Util.httpGetJsonAsync(Cloud.getPrivateApiUrl("me/settings")).done((settings) => {
                Browser.setInnerHTML(dialogBody, "")

                var nickname, website, twitterhandle, githubuser, minecraftuser, location, area, aboutme, realname, gender, yearofbirth,
                    howfound, programmingknowledge, occupation, email, emailnewsletter, emailfrequency, pushNotifications,
                    school;

                if (!notificationsOnly) {
                    dialogBody.appendChild(div("formHint", lf("Don't forget to scroll down and tap 'save' when you are done editing!")));

                    dialogBody.appendChild(div("form-title", lf("public profile")));
                    nickname = <HTMLInputElement>textEntry(<any[]>[lf("nickname"), HTML.span("errorSq", "*")], HTML.mkTextInput("text", lf("nickname")),
                        lf("A unique display name for your public profile (at least 8 characters)"));

                    website = <HTMLInputElement>textEntry(lf("website"), HTML.mkTextInput("url", lf("website url")),
                        lf("Enter the URL to your personal website (Example: http://www.northwindtraders.com)"))

                    twitterhandle = <HTMLInputElement>textEntry(lf("twitter handle"), HTML.mkTextInput("text", lf("twitter handle")),
                        lf("Your twitter handle, like @touchdevelop."));

                    githubuser = <HTMLInputElement>textEntry(lf("github user"), HTML.mkTextInput("text", lf("github user")),
                        lf("Your GitHub user."));

                    minecraftuser = <HTMLInputElement>textEntry(lf("Minecraft user"), HTML.mkTextInput("text", lf("minecraft user")),
                        lf("Your Minecraft user."));

                    location = <HTMLInputElement>textEntry(lf("location"), HTML.mkTextInput("text", lf("location")),
                        lf("Where in the world are you?"))

                    area = HTML.mkAutoExpandingTextArea()
                    aboutme = textEntry(lf("about you"), area.div, lf("Enter some information about yourself"))

                dialogBody.appendChild(Hub.userPictureChooser(settings.picturelinkedtofacebook === false, () => { updated = true }))

                dialogBody.appendChild(div("form-title", lf("private profile")));

                    realname = <HTMLInputElement>textEntry(lf("real name"), HTML.mkTextInput("text", lf("real name")),
                        lf("Your full name"));

                    gender = <HTMLSelectElement>textEntry(lf("gender"), HTML.mkComboBox([HTML.mkOption("", "")].concat(settings.genderoptions.map(s => HTML.mkOption(s, s, settings.gender == s)))));

                    yearofbirth = <HTMLSelectElement>textEntry(lf("year of birth"), HTML.mkComboBox([HTML.mkOption("0", "")].concat(settings.yearofbirthoptions.map(year => HTML.mkOption(year + "", year + "", settings.yearofbirth == year)))));

                    howfound = <HTMLSelectElement>textEntry(lf("how found"), HTML.mkComboBox([HTML.mkOption("", "")].concat(settings.howfoundoptions.map(s => HTML.mkOption(s, s, settings.howfound == s)))),
                        lf("How did you discover Touch Develop?"));

                    programmingknowledge = <HTMLSelectElement>textEntry(lf("programming knowledge"), HTML.mkComboBox([HTML.mkOption("", "")].concat(settings.programmingknowledgeoptions.map(s => HTML.mkOption(s, s, settings.programmingknowledge == s)))),
                        lf("What is your level of programming knowledge?"));

                    occupation = <HTMLSelectElement>textEntry(lf("occupation"), HTML.mkComboBox([HTML.mkOption("", "")].concat(settings.occupationoptions.map(s => HTML.mkOption(s, s, settings.occupation == s)))),
                        lf("What is your occupation?"));

                    school = <HTMLInputElement>textEntry(lf("school"), HTML.mkTextInput("text", lf("school")),
                        lf("Enter your school affiliation, if any."));
                }

                dialogBody.appendChild(div("form-title", lf("email and push notifications")));

                if (!notificationsOnly || World._askEmail || World._askToEnableEmailNewsletter || World._askToEnableEmailNotifications)
                {
                    email = <HTMLSelectElement>textEntry(lf("email"), HTML.mkTextInput("text", "you@example.com"));
                    if (settings.email && !settings.emailverified) {
                        var emailError = div("formError2");
                        emailError.setChildren(lf("Your email address has not yet been verified. Please check your inbox."))
                        dialogBody.appendChild(emailError);
                    }
                }

                var emailnewsletterDiv, emailfrequencyDiv, pushNotificationsDiv;

                var t = settings.emailnewsletter2;
                if (notificationsOnly && !t) t = "yes";
                emailnewsletter = <HTMLSelectElement>textEntry(lf("receive email newsletters"), HTML.mkComboBox([HTML.mkOption("", "")].concat(settings.emailnewsletter2options.map(s => HTML.mkOption(s, s, t == s)))),
                    lf("Do you want to receive informational Touch Develop-related newsletters, e.g. about new features and upcoming events?"));
                emailnewsletterDiv = lastDiv;

                var u = settings.emailfrequency;
                if (notificationsOnly && !u) u = "weekly";
                emailfrequency = <HTMLSelectElement>textEntry(lf("receive email notifications"), HTML.mkComboBox([HTML.mkOption("", "")].concat(settings.emailfrequencyoptions.map(s => HTML.mkOption(s, s, u == s)))),
                    lf("Receive email notifications when other people review/take a screenshot of/comment on your scripts, or reply to one of your comments, or when events related to your subscriptions occur."));
                emailfrequencyDiv = lastDiv;

                var v = settings.notifications2;
                if (Runtime.offerNotifications() && !v) v = "yes";
                if (Runtime.offerNotifications() || v) {
                    pushNotifications = <HTMLSelectElement>textEntry(lf("receive push notifications"), HTML.mkComboBox([HTML.mkOption("", "")].concat(settings.notifications2options.map(s => HTML.mkOption(s, s, v == s)))),
                        lf("Receive notifications to your mobile device when other people review / take a screenshot of/comment on your scripts, or reply to one of your comments, or when events related to your subscriptions occur."));
                    pushNotificationsDiv = lastDiv;
                }

                if (notificationsOnly) {
                    emailnewsletterDiv.style.display = "none";
                    emailfrequencyDiv.style.display = "none";
                    if (pushNotificationsDiv) pushNotificationsDiv.style.display = "none";
                    var summary = div("formHint",
                        t == "yes" ? lf("You will get Touch Develop newsletters.") : lf("You will not get Touch Develop newsletters."),
                        "You will get a ", span("emph", u), " email notification digest ", pushNotifications  ? <any[]>["and ", span("emph", v == "yes" ? "mobile" : "no"), " push notifications"] : [], " when users engage with your publications or posts. ",
                        span("emph", lf("Change settings...")));
                    summary.onclick = () => {
                        emailnewsletterDiv.style.display = "block";
                        emailfrequencyDiv.style.display = "block";
                        if (pushNotificationsDiv) pushNotificationsDiv.style.display = "block";
                        summary.style.display = "none";
                    };
                    dialogBody.appendChild(summary);
                }

                dialogBody.appendChild(div("form-section", "")); // spacing
                if (!notificationsOnly) {
                dialogBody.appendChild(div("formHint", lf("Items marked with * are required."),
                    Editor.mkHelpLink("account settings")));
                }
                dialogBody.appendChild(div("formHint", HTML.mkA(null, Cloud.getServiceUrl() + "/privacy", "_blank", lf("Please review our Privacy Statement."))));

                var saveBtn: HTMLElement;
                dialogBody.appendChild(err)
                var progressBar = HTML.mkProgressBar();
                dialogBody.appendChild(div("formRelative", progressBar));
                dialogBody.appendChild(
                    div("wall-dialog-buttons",
                        HTML.mkButton(notificationsOnly ? lf("maybe later") : lf("cancel"), () => { d.dismiss() }),
                        saveBtn = HTML.mkButton(lf("save"), () => {
                            var emailnewsletter2Value = emailnewsletter === undefined ? undefined : emailnewsletter.options[emailnewsletter.selectedIndex].value;
                            var emailfrequencyValue = emailfrequency === undefined ? undefined : emailfrequency.options[emailfrequency.selectedIndex].value;
                            if (isBeta &&
                                (emailnewsletter2Value == "yes" || emailfrequencyValue && emailfrequencyValue != "never") &&
                                email && !email.value)
                            {
                                if (notificationsOnly) {
                                    err.className = "formError2";
                                    err.setChildren(lf("Tap 'maybe later' if you don't want to enter an email address now."));
                                }
                                else
                                {
                                    err.setChildren(lf("You need to enter a valid email address if you want to get emails."));
                                }
                                return;
                            }
                            progressBar.start();
                            saveBtn.setChildren(lf("saving..."));
                            err.setChildren([])
                            Cloud.postUserSettingsAsync({
                                    nickname: nickname === undefined ? undefined : nickname.value,
                                    website: website === undefined ? undefined : website.value,
                                    aboutme: aboutme === undefined ? undefined : area.textarea.value,
                                    notifications2: pushNotifications === undefined ? undefined : pushNotifications.options[pushNotifications.selectedIndex].value,
                                    realname: realname === undefined ? undefined : realname.value,
                                    gender: gender === undefined ? undefined : gender.options[gender.selectedIndex].value,
                                    howfound: howfound === undefined ? undefined : howfound.options[howfound.selectedIndex].value,
                                    yearofbirth: yearofbirth === undefined ? undefined : parseInt(yearofbirth.options[yearofbirth.selectedIndex].value),
                                    programmingknowledge: programmingknowledge === undefined ? undefined : programmingknowledge.options[programmingknowledge.selectedIndex].value,
                                    occupation: occupation === undefined ? undefined : occupation.options[occupation.selectedIndex].value,
                                    emailnewsletter2: emailnewsletter2Value,
                                    emailfrequency: emailfrequencyValue,
                                    email: email === undefined ? undefined : email.value,
                                    location: location === undefined ? undefined : location.value,
                                    twitterhandle: twitterhandle === undefined ? undefined : twitterhandle.value,
                                    githubuser: githubuser === undefined ? undefined : githubuser.value,
                                    minecraftuser: minecraftuser === undefined ? undefined : minecraftuser.value,
                                    school: school ? school.value : undefined,
                                }).done(resp => {
                                    progressBar.stop();
                                    saveBtn.setChildren("save");
                                    if (resp.message)
                                        err.setChildren(resp.message);
                                    else {
                                        if (resp.emailverificationsent) d.onDismiss = undefined;
                                        updated = true;
                                        d.dismiss();
                                        if (resp.emailverificationsent)
                                        {
                                            var m = new ModalDialog();
                                            m.add([
                                                div("wall-dialog-header", lf("email verification")),
                                                div("wall-dialog-body", lf("We sent you a verification email. Please check your inbox."))])
                                            m.addOk(lf("ok"))
                                            m.onDismiss = finish;
                                            m.show();
                                        }
                                    }
                                }, error => {
                                    progressBar.stop();
                                    d.onDismiss = undefined;
                                    d.dismiss();
                                    ModalDialog.info("error", lf("A network error occurred. Your account settings could not be saved. Are you offline?")).onDismiss = finish;
                                })
                        })))

                if (nickname) nickname.value = settings.nickname || "";
                if (website) website.value = settings.website || "";
                if (location) location.value = settings.location || "";
                if (area) { area.textarea.value = settings.aboutme || ""; area.update() }
                if (realname) realname.value = settings.realname || "";
                if (twitterhandle) twitterhandle.value = settings.twitterhandle || "";
                if (githubuser) githubuser.value = settings.githubuser || "";
                if (minecraftuser) minecraftuser.value = settings.minecraftuser || "";
                if (email) email.value = settings.email || "";
                if (school) school.value = settings.school || "";

                World._askEmail = World._askToEnableNotifications = World._askToEnableEmailNewsletter = World._askToEnableEmailNotifications = false;
            });

            d.onDismiss = finish;

            d.fullWhite();
            d.addClass("accountSettings");
            d.setScroll();
            d.show();
        }

        static chooseWallpaper() {
            if (Cloud.anonMode(lf("choosing wallpaper"), null, true)) return;

            tick(Ticks.hubChooseWallpaper);
            var buttons : StringMap<() => void> = {};
            buttons[lf("clear")] = () => EditorSettings.setWallpaper("", true);
            Meta.chooseArtPictureAsync({ title: lf("choose a wallpaper"), initialQuery: "background", buttons: buttons })
                .done((a: JsonArt) => { if (a) EditorSettings.setWallpaper(a.id, true); });
        }
        
        public showSections(skipSync = false)
        {
            this.show();
            this.showTemporaryNotice();
            this.showSectionsCoreAsync(skipSync).done();
        }

        private exportBtn(lbl:string, f:()=>void, t : Ticks):HTMLElement {
            var elt = div("hubTile hubTileBtn hubTileSize1 hubTileWithLogo tutorialBtn",
                dirAuto(div("hubTileBtnLabel hubTileBtnLabelSmall", lbl))
                /* ,div("hubTileSearch hubTileSearchSmall", HTML.mkImg("svg:shoppingcartalt,white"))  FIXME: need icons */
                );
            elt.withClick(() => {
                tick(t);
                f();
            });
            (<any>elt).tutorialBtn = 1;

            return elt;
        }

        private smallBtn(lbl:string, f:()=>void, t : Ticks, tutorial : boolean = false):HTMLElement {
            var lbls = lbl.split(/: /)
            if (lbls[1]) lbl = lbls[1]
            var elt = div("hubTile hubTileBtn hubTileSize0", dirAuto(div("hubTileBtnLabel " + (
                    lbl.length > 30 ? " hubTileBtnLabelTiny"
                    : " hubTileBtnLabelSmall"), lbl)));
            if (lbls[1])
                elt.appendChild(div("hubTileCorner", lbls[0]))
            elt.withClick(() => {
                tick(t);
                f();
            });
            if (tutorial) {
                (<any>elt).tutorialBtn = 1;
                elt.className += " tutorialBtn";
            }
            return elt;
        }

        static showForum()
        {
            Util.setHash("#forum")
        }

        static showAbout() {
            Util.navigateInWindow(Cloud.config.rootUrl);
        }

        private createSkillButton(): HTMLElement {
            var skillTitle = lf("Skill level: {0}     ", EditorSettings.editorMode().name);
            var skill = this.mkFnBtn(skillTitle,() => {
                EditorSettings.showChooseEditorModeAsync().done(() => this.updateSections(), e => this.updateSections());
            }, Ticks.hubChooseSkill, true);
            skill.className += " exportBtn";
            return skill;
        }

        private showLearn(container:HTMLElement)
        {
            function toTutBtn(btn: HTMLElement) {
                btn.className += " tutorialBtn";
                return btn;
            }

            var docsEl: HTMLElement;
            var ccgaEl: HTMLElement;
            var whatsNew: HTMLElement;
            var begginersEl : HTMLElement;
            //var advancedEl:HTMLElement;
            var rate, settings: HTMLElement;
            var searchEl: HTMLElement;
            var elements = [
                this.startTutorialButton(Ticks.hubDocsTutorial),
                docsEl = toTutBtn(this.mkFnBtn(lf("Docs"), () => {
                    Util.navigateNewWindow(Cloud.config.helpPath);
                }, Ticks.hubDocs, true, 2)),
                whatsNew = toTutBtn(this.mkFnBtn(lf("What's new"), () => {
                    Util.navigateNewWindow(Cloud.config.topicPath + "whatsnew");
                }, Ticks.hubDocsWhatsNew, true)),
                begginersEl = toTutBtn(this.mkFnBtn(lf("Getting started"), () => {
                    Util.navigateNewWindow(Cloud.config.topicPath + "gettingstarted");
                }, Ticks.hubBeginnersGettingStarted, true)),
                ccgaEl = toTutBtn(this.mkFnBtn(lf("Teach Creative Coding!"), () => {
                    Util.navigateNewWindow("/ccga");
                }, Ticks.hubCCGA, true)),
                // this button says "Search", which means "search" not "search docs" - "Help" is for that
                searchEl = this.mkFnBtn(lf("Search everything"), () => { this.hide(); this.browser().showList("search"); }, Ticks.hubChatSearch, false),
                this.createSkillButton(),
                settings = this.smallBtn(lf("Settings"), () => {
                    TheEditor.popupMenu()
                }, Ticks.hubSettings)
            ];
            elements = elements.filter((e) => e != null);
            searchEl.appendChild(div("hubTileSearch", HTML.mkImg("svg:search,white")));
            (<any>searchEl).breakBefore = 1;
            docsEl.appendChild(div("hubTileSearch", HTML.mkImg("svg:search,white")));
            whatsNew.appendChild(div("hubTileSearch hubTileSearchSmall", HTML.mkImg("svg:star,white")));
            settings.appendChild(div("hubTileSearch hubTileSearchSmall", HTML.mkImg("svg:settings,white")));

            if (rate) rate.className += " exportBtn";

            this.layoutTiles(container, elements);
        }

        private updateSections()
        {
            var widgets = EditorSettings.widgets();
            var sects : StringMap<HubSection> = {
                "recent": { title: lf("my scripts") },
            };
            if (widgets.hubTutorials)
                sects["tutorials"] = { title: lf("tutorials") };
            if (widgets.hubLearn)
                sects["learn"] = { title: lf("learn") };
            if (widgets.hubChannels)
                sects["channels"] = { title: lf("channels") };
            if (widgets.hubShowcase)
                sects["showcase"] = { title: lf("showcase") };
            if (widgets.hubTopAndNew)
                sects["top"] = { title: lf("top & new") };
            if (widgets.hubMyArt)
                sects["myart"] = { title: lf("my art") };

            if (SizeMgr.portraitMode) {
                this.vertical = true;
            } else {
                // IE has mouse-wheel translation feature that makes horizontal scrolling easier
                // it also makes sense for tablets in landscape mode
                if (Browser.isTrident || (Browser.isTouchDevice && !Browser.isDesktop))
                    this.vertical = false;
                else
                    // everyone else gets vertical
                    this.vertical = true;
            }
            if (/vertical/.test(document.URL)) this.vertical = true;
            if (/horizontal/.test(document.URL)) this.vertical = false;

            Util.resetDragToScroll(this.mainContent);
            if (this.vertical)
                Util.setupDragToScroll(this.mainContent);
            else
                Util.setupHDragToScroll(this.mainContent);

            var tileWidth = 7.3;
            var bigTileWidth = 11.3;

            var sectWidths = { tags: 5*tileWidth, libraries:2*tileWidth, games: 3*tileWidth, misc: 2*tileWidth, 'default': bigTileWidth + 2*tileWidth }

            var sectWidth = (name:string):number => sectWidths['default']

            this.logo.style.display = "";
            this.meBox.style.display = "";

            // h=26em

            var topMargin = 5;
            var sectionHeight = 26;
            var winHeight = SizeMgr.windowHeight / SizeMgr.topFontSize;
            var spaceRemaining = winHeight - topMargin;
            var fontScale = 1.0;

            var requiredWidth = sectWidth('recent') + (this.vertical ? 2 : 8);

            var posLeft = SizeMgr.portraitMode ? 1 : 4;
            var posTop = (spaceRemaining - fontScale*sectionHeight) / 2;

            this.theRoot.setFlag("vertical", this.vertical);

            if (this.vertical) {
                requiredWidth = sectWidth('recent');
                requiredWidth = SizeMgr.phoneMode ? requiredWidth + 2 :
                                SizeMgr.portraitMode ? requiredWidth + 2 :
                                requiredWidth * 2 + 4 + 6;
                fontScale = 1.5;
                posLeft = SizeMgr.portraitMode ? 1 : 3;
                posTop = 5;
            }

            var posLeft0 = posLeft;
            var minScale = SizeMgr.windowWidth / (SizeMgr.topFontSize * requiredWidth);
            if (minScale < fontScale) fontScale = minScale;

            var divs = []

            this.topContainer.removeSelf();
            if (this.vertical) {
                var needHeight = sectionHeight + 3.5;
                if (spaceRemaining < needHeight*fontScale)
                    fontScale = spaceRemaining/needHeight;
                divs.push(this.topContainer);
            } else {
                if (posTop < 0) {
                    fontScale = spaceRemaining / sectionHeight;
                    posTop = (topMargin - 1) / fontScale;
                    posLeft /= fontScale;
                } else {
                    posTop += topMargin - 1;
                }
                this.topBox.setChildren([this.topContainer]);
            }

            this.mainContent.style.fontSize = fontScale + "em";
            SizeMgr.hubFontSize = fontScale * SizeMgr.topFontSize;
            this.mainContent.style.height = SizeMgr.windowHeight + "px";
            var lastHeight = 0;

            Object.keys(sects).forEach((s : string) => {
                var c = div("hubSectionBody");

                var hd : HubSection = sects[s];

                var sd = div("hubSection hubSection-" + s, div("hubSectionHeader", spanDirAuto(hd.title)), c);
                divs.push(sd)
                this.mainContent.appendChild(sd);

                sd.style.top = posTop + "em";
                sd.style.left = posLeft + "em";
                sd.style.width = sectWidth(s) + "em";
                lastHeight = posTop;

                if (this.vertical) {
                    if (!SizeMgr.portraitMode && posLeft == posLeft0)
                        posLeft += sectWidth(s) + 4;
                    else {
                        posTop += sectionHeight + 2;
                        posLeft = posLeft0;
                    }
                } else
                    posLeft += sectWidth(s) + 4;

                if (s == "tutorials")
                    this.browser().getLocationList(Cloud.config.tutorialsid + "/scripts/?count=6",(items, cont) => this.addPageTiles(s, c, items));
                else if (s == "learn")
                    this.showLearn(c);
                else if (s == "myart") {
                    if (Cloud.getUserId())
                        this.browser().getLocationList(Cloud.getUserId() + "/art?count=6", (items, cont) => this.addPageTiles(s, c, items));
                    else {
                        this.addPageTiles(s, c, []);
                    }
                }
                else if (s == "channels") {
                    if (Cloud.getUserId())
                        this.browser().getLocationList(Cloud.getUserId() + "/channels?count=6",(items, cont) => this.addPageTiles(s, c, items));
                    else
                        this.addPageTiles(s, c, []);
                }
                else if (s == "showcase") {
                    this.browser().getLocationList(Cloud.config.showcaseid + "/scripts/?count=6",(items, cont) => this.addPageTiles(s, c, items));
                }    
                else
                    this.browser().getLocationList(s + "-scripts", (items, cont) => this.addPageTiles(s, c, items));
            });

            if (this.vertical) {
                var spc = div("hubSectionSpacer");
                spc.style.top = (lastHeight + sectionHeight) + "em";
                divs.push(spc);
            }

            this.mainContent.setChildren(divs);

            if (Cloud.getUserId()) {
                var uid = this.browser().getUserInfoById("me", "me");
                this.meBox.setChildren([uid.mkSmallBox()]);
                this.browser().addNotificationCounter(this.notificationBox);
            } else {
                var loginBtn = HTML.mkButtonElt("wall-button login-button", SVG.getLoginButton())
                this.meBox.setChildren(loginBtn.withClick(() => {
                    Login.show();
                }))
                this.notificationBox.setChildren([]);
            }
        }

        private docTopics:any[];

        public importDocs()
        {
            var md = new ModalDialog();

            var getTopicsAsync = () => Promise.as(TDev.HelpTopic.getAll().map(t => t.json))

            var btns = div("wall-dialog-buttons",
                HTML.mkButton(lf("import"), () => {
                    var m = /^http.*\/docs\/([a-zA-Z0-9]+)$/.exec(inp.value)
                    if (!m)
                        HTML.wrong(inp)
                    else {
                        var tt = HelpTopic.findById(m[1])
                        if (!tt) {
                            HTML.wrong(inp)
                        } else {
                            md.dismiss()
                            return Util.httpGetTextAsync(Cloud.getPrivateApiUrl("tdtext/" + tt.json.id))
                                .then(text => {
                                    text = text.replace(/{parenttopic:([^{}]+)}/i, 
                                        (r, pt) => "{parentTopic:td/" + pt + "} {topic:td/" + m[1] + "}")
                                    var stub: World.ScriptStub = {
                                        editorName: "touchdevelop",
                                        scriptName: tt.json.name,
                                        scriptText: text,
                                    };
                                    return this.browser().openNewScriptAsync(stub)
                                })
                                .done()
                        }
                    }
                }),
                HTML.mkButton(lf("cancel"), () => md.dismiss()))

            var inp = HTML.mkTextInput("text", "")
            inp.placeholder = "https://www.touchdevelop.com/docs/..."

            md.add(div("wall-dialog-header", lf("import docs")))
            md.add(div(null, inp))
            md.add(btns)

            md.show()
        }

        public showPointers()
        {
            var allPointers:JsonPointer[] = []
            var fetchAsync = (cont:string) =>
                Cloud.getPrivateApiAsync("pointers?count=50" + cont)
                    .then(res => {
                        allPointers.pushRange(res.items)
                        if (res.continuation)
                            return fetchAsync("&continuation=" + res.continuation)
                    })

            var m = ModalDialog.info(lf("page map"), lf("loading..."), "")
            m.fullWhite()
            m.setScroll()

            fetchAsync("")
                .then(() => {
                    allPointers = allPointers.filter(p => !/^ptr-usercontent-/.test(p.id))
                    allPointers.sort((a, b) => Util.stringCompare(a.id, b.id))
                    var html = ""
                    allPointers.forEach(p => {
                        html += Util.fmt("<a href='{0:q}' target='_blank'>{0:q}</a> {1:q} {2:q}<br/>\n", "/" + p.path, 
                            p.redirect ? "-> " + p.redirect : "", p.description)
                    })
                    m.empty()
                    m.addHTML(html).style.fontSize = "0.8em"
                    m.addOk()
                })
                .done()
        }

    }
}
