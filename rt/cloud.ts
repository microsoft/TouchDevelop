///<reference path='refs.ts'/>
module TDev.Cloud {

    export var lite = false;
    export var litePermissions:StringMap<boolean> = {};

    export interface EditorWidgets {
        // edit
        addNewButton?: boolean;
        undoButton?: boolean;
        copyPaste?: boolean;
        selectStatements?: boolean;

        // refactoring
        calcSearchArt?: boolean;
        promoteRefactoring?: boolean;
        searchArtRefactoring?: boolean;
        makeAsyncRefactoring?: boolean;
        fixItButton?: boolean;
        shareScriptToGroup?: boolean;
        splitScreen?: boolean; // split screen button
        splitScreenOnLoad?: boolean;
        simplify?: boolean;
        moveToLibrary?: boolean;
        stripBlock?: boolean;

        //navigation
        codeSearch?: boolean;
        findReferences?: boolean;
        gotoNavigation?: boolean;

        // misc
        groupAllowExportApp?: boolean;
        changeSkillLevel?: boolean;
        forceMainAsAction?: boolean;
        singleReturnValue?: boolean;
        integerNumbers?: boolean;

        // features
        actionSettings?: boolean;
        publishAsHidden?: boolean;

        // ui
        splitButton?: boolean;
        uploadArtInSearchButton?: boolean;
        calcApiHelp?: boolean;
        sideRunButton?: boolean;
        tutorialGoToPreviousStep?: boolean;
        helpLinks?: boolean;

        // sections
        dataSection?: boolean;
        eventsSection?: boolean;
        artSection?: boolean;
        librariesSection?: boolean;
        scriptPropertiesSettings?: boolean;
        testsSection?: boolean;
        actionTypesSection?: boolean;
        pagesSection?: boolean;
        recordsSection?: boolean;

        // language
        comment?: boolean;
        foreach?: boolean;
        boxed?: boolean;
        async?: boolean;
        testAction?: boolean;
        lambda?: boolean;
        stringConcatProperty?: boolean;

        // debugging
        toggleBreakpoint?: boolean;
        debugButton?: boolean;
        
        socialNetworks?: boolean;
        socialNetworkyoutube?: boolean;
        socialNetworkvimeo?: boolean;
        socialNetworkvine?: boolean;
        socialNetworkinstagram?: boolean;
        socialNetworktwitter?: boolean;
        socialNetworkart?: boolean;
        
        // hub
        scriptAddToChannel?: boolean;
        scriptConvertToDocs?: boolean;
        scriptPrintScript?: boolean;
        scriptPrintTopic?: boolean;
        notifyAppReloaded?: boolean;
        showTemporaryNotice?: boolean;
        hubChannels?: boolean;
        hubScriptUpdates?: boolean;
        hubUsers?: boolean;
        publishDescription?: boolean;
        sendPullRequest?: boolean;
        publishToComputingAtSchools?: boolean;
        scriptStats?: boolean;
        userSocialTab?: boolean;
        commentHistory?: boolean;
        scriptPullChanges?: boolean;
        scriptDiffToBase?: boolean;
        scriptHistoryTab?: boolean;
        scriptInsightsTab?: boolean;
        githubLinks?: boolean;
        hubSocialTiles?: boolean;
        hubTopAndNew?: boolean;
        hubTags?: boolean;
        hubMyArt?: boolean;
        hubLearn?: boolean;
        hubTutorials?: boolean;
        hubShowcase?: boolean;
        hubSocial?: boolean;
        startTutorialButton?: boolean;
        translateComments?: boolean;
        searchHelp?: boolean;
        hideMyScriptHeader?: boolean;

        // script lifecycle
        updateButton?: boolean;
        editLibraryButton?: boolean;
        errorsButton?: boolean;
        logsButton?: boolean;
        deployButton?: boolean;

        // ui
        pluginsButton?: boolean;
        runTestsButton?: boolean;
        scriptPropertiesManagement?: boolean;
        scriptPropertiesIcons?: boolean;
        scriptPropertiesExport?: boolean;
        scriptPropertiesPlatform?: boolean;
        scriptPropertiesInstrumentation?: boolean;
        scriptPropertiesData?: boolean;
        wallLogsButton?: boolean;
        scriptPropertiesPropertyCloud?: boolean;
        scriptPropertiesPropertyAllowExport?: boolean;
        scriptPropertiesPropertyAtomic?: boolean;
        stringEditFullScreen?: boolean;
        persistanceRadio?: boolean;
        wallScreenshot?: boolean;
        wallHeart?: boolean;
        wallStop?: boolean;
        nextTutorialsList?: boolean;

        editorRunOnLoad?: boolean;

        // statement defaults
        ifConditionDefault?: string;
        forConditionDefault?: string;
        whileConditionDefault?: string;
    }

    export interface EditorMode {
        id?: string;
        name: string;
        descr: string;
        artId?: string;
        // 1 : block, 2: legacy, 3: pro
        astMode?: number;
        widgets: EditorWidgets;                
    }

    export interface ClientTheme {
        name: string;
        description: string;
        logoArtId?: string;

        locale?: string;
        wallpaperArtId?: string;

        tutorialsTopic?: string; // topics of tutorial pages
        intelliProfileId?: string; // script containing supported apis

        scriptSearch?: string; // seed when searching script

        editorMode?: EditorMode;
        scriptTemplates?: string[];

        noAnimations?: boolean;
        lowMemory?: boolean;
    }

    export interface ClientConfig {
        workspaceUrl: string;
        searchUrl: string;
        searchApiKey: string;
        rootUrl: string;
        liteVersion: string;
        shareUrl: string;
        cdnUrl: string;
        translateCdnUrl: string;
        translateApiUrl: string;
        hashtag: string;

        tdVersion?: string;
        releaseid?: string;
        relid?: string;
        releaseLabel?: string;
        anonToken?: string;

        theme?: ClientTheme;
        
        tutorialAvatarArtId?: string;
    }

    export var config: ClientConfig = {
        searchApiKey: "E43690E2B2A39FEB68117546BF778DB8", // touchdevelop web app query key in portal 
        searchUrl: "https://tdsearch.search.windows.net",
        cdnUrl: "https://az31353.vo.msecnd.net",
        translateCdnUrl: "https://tdtutorialtranslator.blob.core.windows.net",
        translateApiUrl: "https://tdtutorialtranslator.azurewebsites.net/api",
        workspaceUrl: null,
        rootUrl: "https://www.touchdevelop.com",
        shareUrl: "http://tdev.ly",
        hashtag:"#TouchDevelop",
        liteVersion: null,
    }

    export function isArtUrl(url : string) : boolean {
        if (!url) return false;
        var pubUrl = config.cdnUrl + "/pub/";
        return url.substr(0, pubUrl.length) == pubUrl
            || /\.\/art\//i.test(url) // exported apps
            || /^http:\/\/cdn.touchdevelop.com\/pub\//i.test(url); // legacy
    }

    export function artCssImg(id: string, thumb = false): string {
        return HTML.cssImage(Cloud.artUrl(id, thumb));
    }

    export function artUrl(id: string, thumb = false): string {
        return id ? HTML.proxyResource(Util.fmt("{0}/{1}/{2:uri}", Cloud.config.cdnUrl, thumb ? "thumb" : "pub", id)) : undefined;
    }
    
    export function setPermissions(perms:string = null)
    {
        if (perms !== null)
            localStorage['litePermissions'] = perms;
        litePermissions = {};
        (localStorage['litePermissions'] || "").split(",").forEach(t => {
            if (t)
                litePermissions[t] = true
        })
    }

    export function hasPermission(perm:string)
    {
        return litePermissions.hasOwnProperty(perm) || litePermissions.hasOwnProperty("admin")
    }

    export function isRestricted()
    {
        return !!lite;
    }

    export function isUserRestricted()
    {
        return !!lite && !Cloud.hasPermission("root-ptr");
    }

    export function getServiceUrl() { return config.rootUrl; }

    export function mkLegalDiv() {
        var link = (text: string, lnk: string) =>
            HTML.mkA(null, getServiceUrl() + lnk, "_blank", text);
        return div("wall-dialog-body", div("smallText",
                lf("Publishing is subject to our "),
                link(lf("terms of use"), "/terms-of-use"),
                lf(". Please read our information about "), link(lf("privacy and cookies"), "/privacy"), "."))
    }

    export var authenticateAsync = (activity:string, redirect = false, dontRedirect = false): Promise =>
    { // boolean

        if (!Cloud.isAccessTokenExpired()) return Promise.as(true);

        function loginAsync() {
            var loginUrl = Cloud.getServiceUrl() + "/oauth/dialog?response_type=token&"
                + "client_id=webapp"
                + "&identity_provider=" + encodeURIComponent(Cloud.getIdentityProvider() || "");
            return TDev.RT.Web.oauth_v2_async(loginUrl, "touchdevelop")
                .then((or: TDev.RT.OAuthResponse) => {
                    if (or.is_error()) return false;
                    else {
                        var id = or.others().at('id');
                        var oldid = Cloud.getUserId();
                        if (oldid && id != oldid) {
                            // TODO: error message.
                            return false;
                        }
                        Cloud.setUserId(or.others().at('id'));
                        Cloud.setAccessToken(encodeURIComponent(or.access_token()));
                        Cloud.setIdentityProvider(or.others().at('identity_provider'));
                        return true;
                    }
                });
        }

        return Cloud.isOnlineWithPingAsync()
            .then((isOnline : boolean) => {
                if (!isOnline) return Promise.as(false);

                var prevHash = (window.location.hash || "#").replace(/#/, "");
                var login = (<any>TDev).Login;
                if (login) {
                    if (!login.show || dontRedirect)
                        login = null;
                    if (!redirect && (!prevHash || /^(hub|list:.*:user:me:)/.test(prevHash)))
                        login = null;
                }

                var r = new PromiseInv();

                var m = new ModalDialog();
                m.addHTML(
                    Util.fmt("<h3>{0:q} requires sign&nbsp;in</h3>", activity) +
                    (!(<any>TDev).TheEditor ? "" :
                      "<p class='agree'>" +
                      lf("After you sign in we will back up and sync scripts between your devices.") +
                      "</p>")
                    )
                m.fullWhite();
                var ignoreDismiss = false;
                m.add(div("wall-dialog-buttons",
                    HTML.mkButton(lf("maybe later"), () => { m.dismiss() }, "gray-button"),
                    HTML.mkButton(lf("sign in"), () => {
                        ignoreDismiss = true;
                        m.dismiss()
                        if (login) login.show();
                        else loginAsync().done(v => r.success(v))
                    }, "green-button")));
                m.onDismiss = () => {
                    if (!ignoreDismiss) r.success(false);
                };
                m.show();

                return r;
            })
    }

    export function anonMode(activity:string, restart:()=>void = null, redirect = false)
    {
        if (Cloud.isOffline()) {
            Cloud.showModalOnlineInfo(lf("{0} requires online access", activity))
            return true;
        }
        if (Cloud.getUserId()) return false;
        Cloud.authenticateAsync(activity, redirect).done((ok) => {
            if (ok && restart) restart();
        })
        return true;
    }

    export function parseAccessToken(h: string, onStateError : () => void, onUserError: () => void ): boolean {
        var stateMatch = h.match(/.*&state=([^&]*)/);
        var state = stateMatch ? stateMatch[1] : "";
        if (Cloud.oauthStates().indexOf(decodeURIComponent(state)) == -1) {
            onStateError();
            return false;
        }

        var token = h.match(/.*#access_token=([^&]*)/)[1];
        var m = h.match(/.*&identity_provider=([^&]*)/);
        var identityProvider = m ? decodeURIComponent(m[1]) : undefined;
        var id = h.match(/.*&id=([^&]*)/)[1];
        var expires = parseInt((h.match(/.*&expires_in=([^&]*)/)||["0","0"])[1]);
        var oldid = Cloud.getUserId();
        if (oldid && id != oldid) {
            onUserError();
            return false;
        }

        if (/.*[#&]dbg=true/.test(h))
            window.localStorage.setItem("dbg",  "true")
        else
            window.localStorage.removeItem("dbg");
        Cloud.setUserId(id);
        Cloud.setIdentityProvider(identityProvider || "");
        Cloud.setAccessToken(token);
        return true;
    }

    export function hasAccessToken() : boolean {
        return !!getAccessToken();
    }
    export function getAccessToken() : string {
        return window.localStorage.getItem("access_token");
    }
    export function isAccessTokenExpired() : boolean {
        return !hasAccessToken() || !!window.localStorage.getItem("access_token_expired");
    }
    export function accessTokenExpired() : void {
        window.localStorage.setItem("access_token_expired",  "1")
    }
    export function setAccessToken(token : string) : void {
        window.localStorage.removeItem("access_token_expired");
        if (!token) window.localStorage.removeItem("access_token");
        else window.localStorage.setItem("access_token",  token)
    }
    export var getUserId = () => window.localStorage.getItem("userid");

    export var currentReleaseId = "";
    export function getWorldId(): string {
        var worldId = window.localStorage.getItem("worldId");
        if (!worldId) window.localStorage.setItem("worldId",  worldId = "$webclient$-" + Util.guidGen())
        return worldId;
    }
    export function oauthStates() {
        var a = JSON.parse(window.localStorage.getItem("oauth_states") || "[]");
        if (a.length == 0) a = [Random.normalized().toString()];
        window.localStorage.setItem("oauth_states",  JSON.stringify(a))
        return a;
    }
    export function setUserId(id : string) {
        if (!id)
            window.localStorage.removeItem("userid");
        else
            window.localStorage.setItem("userid",  id)
    }
    export function getIdentityProvider()  {
        return window.localStorage.getItem("identity_provider");
    }
    export function setIdentityProvider(id : string) {
        if (!id)
            window.localStorage.removeItem("identity_provider");
        else
            window.localStorage.setItem("identity_provider",  id)
    }
    export interface Progress {
        guid?: string;
        index?: number;
        completed?: number;
        numSteps?: number;
        lastUsed?: number;
    }
    export interface Progresses {
        [id: string]: Progress;
    }

    function mergeProgress(oldData: Progresses, data: Progresses) {
        oldData = JSON.parse(JSON.stringify(oldData))
        Object.keys(data).forEach(id => {
            var oldProgress = oldData[id] || <Progress>{};
            var progress = data[id];
            if (oldProgress.index === undefined || oldProgress.index <= progress.index) {
                if (progress.guid) oldProgress.guid = progress.guid;
                oldProgress.index = progress.index
                if (progress.completed && (oldProgress.completed === undefined || oldProgress.completed > progress.completed)) oldProgress.completed = progress.completed;
                oldProgress.numSteps = progress.numSteps;
                oldProgress.lastUsed = progress.lastUsed;
            }
            oldData[id] = oldProgress;
        });
        return oldData
    }

    export function storeProgress(data: Progresses) {
        var newData = mergeProgress(loadPendingProgress(), data);
        window.localStorage.setItem("progress",  JSON.stringify(newData))
        window.localStorage.setItem("total_progress", JSON.stringify(mergeProgress(loadProgress(), data)));
    }

    function clearPendingProgress(data: Progresses) {
        var oldData = loadPendingProgress();
        Object.keys(data).forEach(id => {
            var oldProgress = oldData[id];
            var progress = data[id];
            var uploaded = oldProgress && (!oldProgress.guid || !progress.guid || oldProgress.guid == progress.guid) &&
                (oldProgress.index === undefined || progress.index === undefined || oldProgress.index <= progress.index) &&
                (oldProgress.completed === undefined || progress.completed === undefined || oldProgress.completed <= progress.completed);                
            if (uploaded) {
                delete oldData[id];
            }
        });
        window.localStorage.setItem("progress",  JSON.stringify(oldData))
    }

    export function loadProgress() {
        return loadPendingProgress("total_progress")
    }

    function loadPendingProgress(name = "progress") {
        return <Progresses>JSON.parse(window.localStorage.getItem(name) || "{}");
    }

    export function isOffline() : boolean {
        return !isOnline();
    }
    export function isOnline() : boolean {
        var b = !TDev.Browser.noNetwork && (TDev.Browser.isNodeJS || window.navigator.onLine) && isTouchDevelopOnline();
        // randomly turns off connectivity
        if (TDev.dbg && b && isChaosOffline() && TDev.RT.Math_.random(10) < 4)
            b = false;
        return b;
    }
    export function isOnlineWithPingAsync() : Promise { // of boolean
        if (!isOnline()) return Promise.as(false);
        return pingAsync();
    }

    export var transientOfflineMode = false;
    export function isTouchDevelopOnline() : boolean {
        return !window.localStorage.getItem('offline_mode') && !transientOfflineMode;
    }
    export function setTouchDevelopOnline(value: boolean) {
        if (value)
            window.localStorage.removeItem('offline_mode');
        else
            window.localStorage.setItem('offline_mode',  "true")
    }
    export function isChaosOffline() : boolean {
        return !!window.localStorage.getItem('chaos_offline_mode');
    }
    export function setChaosOffline(value: boolean) {
        if (!value)
            window.localStorage.removeItem('chaos_offline_mode');
        else
            window.localStorage.setItem('chaos_offline_mode',  "true")
    }
    export function offlineErrorAsync(): Promise {
        var msg = isTouchDevelopOnline() ? "offline mode is on" : "force offline mode is on";
        return new Promise((onSuccess, onError, onProgress) => {
            var e = new Error(msg);
            (<any>e).status = 502;
            onError(e);
        });
    }
    export function canPublish()
    {
        return getUserId() != "paema";
    }
    export function onlineInfo(): string {
        if (Cloud.isOffline()) {
            var msg = lf("You appear to be offline. ") + (isTouchDevelopOnline()
                ? lf("Please connect to the internet.")
                : lf("Please go to the settings in the main hub to disable offline mode."));
            return msg;
        }
        else {
            return lf("You are online.");
        }
    }
    export function showOnlineInfoProgess() {
        HTML.showProgressNotification(onlineInfo(), true);
    }
    export function showModalOnlineInfo(title : string) {
        ModalDialog.info(title, onlineInfo());
    }
    var appendAccessToken = (url: string) => {
        return (url + (/\?/.test(url) ? "&" : "?") + "access_token=" + getAccessToken()
          + "&world_id=" + encodeURIComponent(Cloud.getWorldId()) 
          + "&release_id=" + encodeURIComponent(Cloud.currentReleaseId) 
          + "&user_platform=" + encodeURIComponent(Browser.platformCaps.join(","))
          + "&anon_token=" + encodeURIComponent(Cloud.config.anonToken || ""));
    }
    export function getPublicApiUrl(path: string) : string {
        //getServiceUrl() + "/api/" + path;
        return appendAccessToken(getServiceUrl() + "/api/" + path);
    }
    export function getPrivateApiUrl(path: string) : string {
        return appendAccessToken(getServiceUrl() + "/api" + (path == null ? "" : "/" + path));
    }
    export function getScriptTextAsync(id: string) : Promise {
        return Util.httpGetTextAsync(getPublicApiUrl(encodeURIComponent(id) + "/text?original=true"))
            .then(text => {
                if (/^.*upperlex/.test(text)) return text
                else
                    return Util.httpGetTextAsync(getPublicApiUrl(encodeURIComponent(id) + "/text?original=true&ids=true"))
            })
    }
    export function getPrivateApiAsync(path: string) : Promise {
        return Util.httpGetJsonAsync(getPrivateApiUrl(path));
    }
    export function getPublicApiAsync(path: string) : Promise {
        return Util.httpGetJsonAsync(getPublicApiUrl(path));
    }
    export function postPrivateApiAsync(path:string, req:any) : Promise {
        return Util.httpPostJsonAsync(getPrivateApiUrl(path), req);
    }
    export function deletePrivateApiAsync(path: string): Promise {
        return Util.httpRequestAsync(Cloud.getPrivateApiUrl(path), "DELETE");
    }
    export function deletePublicationAsync(id: string): Promise {
        return Util.httpRequestAsync(Cloud.getPrivateApiUrl(id), "DELETE");
    }
    export function getRandomAsync() : Promise {
        return Util.httpGetTextAsync(getPublicApiUrl("random"));
    }
    export interface Version {
        instanceId: string;
        version: number;
        time: number;
        // LITE
        baseSnapshot: string;
    }
    export function isVersionNewer(version1: Version, version2: Version): boolean {
        if (typeof version1 === "object" && typeof version2 === "object")
        {
            if (version1.instanceId == version2.instanceId)
                return version1.version > version2.version || version1.version == version2.version && version1.time > version2.time;
            else
                return version1.time > version2.time;
        }
        return false;
    }

    export interface Header {
        guid: string;
        name: string;
        scriptId: string;
        scriptTime:number;
        updateId: string;
        updateTime:number;
        scriptVersion: Version;
        meta: any;
        capabilities: string;
        flow: string;
        sourcesThatNeedToBeGrantedAccess: string;
        userId: string;
        status: string;
        hasErrors: boolean;
        //libraryDependencies: string[];
        publishAsHidden:boolean;
        recentUse: number; // seconds since epoch
        // For compatibility reasons with previous cloud entries, we need to
        // adopt the view that [editor == undefined] means "default
        // TouchDevelop" editor, while anything else means "external editor".
        editor?: string;
        pendingMerge?: string;
    }
    export interface AskSomething {
        title: string;
        picture?: string;
        message: string;
        linkName?: string;
        linkUrl?: string;
    }
    export interface InstalledHeaders {
        headers: Header[];
        newNotifications: number;
        notifications: boolean;
        email: boolean;
        emailNewsletter: boolean;
        emailNotifications: boolean;
        profileIndex: number;
        profileCount: number;
        time: number;
        askBeta?:boolean;
        askSomething?:AskSomething;
        minimum?: string;
        random?:string;
        v?: number;
        user?: any;
        blobcontainer?: string;
    }
    export interface InstalledBodies {
        bodies: Body[];
        recentUses: RecentUse[];
    }
    export interface UserSettings {
        nickname?: string;
        aboutme?: string;
        website?: string;
        notifications?: boolean;
        notifications2?: string;
        picturelinkedtofacebook?: boolean;
        realname?: string;
        gender?: string;
        howfound?: string;
        culture?: string;
        yearofbirth?: number;
        programmingknowledge?: string;
        occupation?: string;
        emailnewsletter2?: string;
        emailfrequency?: string;
        email?: string;
        location?: string;
        twitterhandle?: string;
        githubuser?: string;
        minecraftuser?: string;
        editorMode?: string;
        school?: string;
        wallpaper?: string;
        permissions?: string;
        credit?: number;
    }
    export function getUserInstalledAsync() : Promise // of InstalledHeaders
    {
        return getPrivateApiAsync("me/installed");
    }
    export function getUserInstalledLongAsync(v?: number, m?: boolean) : Promise // of InstalledHeaders
    {
        return getPrivateApiAsync("me/installedlong" + (v ? "?v=" + v + (m ? "&m=1" : "") : ""));
    }
    export interface RecentUse {
        guid: string;
        recentUse: number; // seconds since epoch
    }
    // See the [Header] type for more comments.
    export interface Body {
        guid: string;
        name: string;
        scriptId: string;
        updateId: string;
        scriptVersion: Version;
        meta: string;
        capabilities: string;
        flow: string;
        sourcesThatNeedToBeGrantedAccess: string;
        userId: string;
        status: string;
        hasErrors: boolean;
        //libraryDependencies: string[];
        script: string;
        editorState: string;
        recentUse: number; // seconds since epoch
        editor?: string;
    }

    export interface BatchResponse
    {
        code: number;
        body: any;
        ETag: string;
        reqid?: string;
    }
    export interface BatchResponses
    {
        code: number;
        array: BatchResponse[];
    }

    export interface PostUserInstalledResponse {
        v?: number;
        delay: number;
        numErrors?: number;
        headers?: Header[];
        // true if a newer version of the script has been written between the moment we sent the
        // data to the cloud and the moment it came back; the client code should re-attempt to save
        retry?: boolean;
    }

    export interface PostApiGroupsBody {
        name: string;
        description: string;
        school?:string;
        grade?:string;
        allowexport: boolean;
        allowappstatistics: boolean;
        userplatform: string[];
        isclass?: boolean;
    }
    export interface PostApiGroupsResponse {
        id: string;
    }
    export interface ApiGroupCodeResponse {
        code: string; // can be null; in particular, is null initially
        expiration: number; // can be null; in particular, is null initially; in seconds since 1970
    }
    export interface ApiGroupCodeRequest {
        expiration?: number;
            // in seconds since 1970; if present, cannot be in the past or more than a year in the future;
            // defaults to 14 days into the future if null or not present
    }

    export function getUserInstalledBodyAsync(guid: string) : Promise // of InstalledBodies
    {
        return getPrivateApiAsync("me/installed/" + guid);
    }
    export function postUserInstalledAsync(installedBodies: InstalledBodies) : Promise // of PostUserInstalledResponse
    {
        return Util.httpPostJsonAsync(getPrivateApiUrl("me/installed"), installedBodies);
    }
    export function postUserInstalledPublishAsync(guid:string, hidden:boolean, scriptVersion:string, meta?:any) : Promise // of InstalledBodies
    {
        var url = "me/installed/" + guid + "/publish?hidden=" + (hidden ? "true" : "false")
        if (scriptVersion)
            url += "&scriptversion=" + encodeURIComponent(scriptVersion)
        if (!meta) meta = {}
        var mergeIds = meta.parentIds
        if (mergeIds)
            url += "&mergeids=" + encodeURIComponent(mergeIds)
        return Util.httpPostJsonAsync(getPrivateApiUrl(url), Cloud.lite ? meta : "")
    }
    export function postUserInstalledCompileAsync(guid:string, cppSource:string, meta:any = {}) : Promise
    {
        var r = new PromiseInv()
        var pollUrl = ""
        var poll = () => {
            Util.httpGetJsonAsync(pollUrl).done(
                json => {
                    HTML.showProgressNotification(lf("compilation finished"));
                    json.url = pollUrl;
                    r.success(json)
                },
                err => Util.setTimeout(1000, poll))
        }

        HTML.showProgressNotification(lf("compiling..."));
        Util.httpPostJsonAsync(getPrivateApiUrl("me/installed/" + guid + "/compile"), {
            config: "proto",
            source: cppSource,
            meta: meta
        })
        .then(resp => {
            // HTML.showProgressNotification(lf("program accepted, compiling"));
            pollUrl = resp.statusurl
            poll()
        })
        .done()

        return r
    }

    export function postApiBatch(bundle: any) : Promise // of BatchResponses
    {
        return Util.httpPostJsonAsync(getPrivateApiUrl(null), bundle);
    }
    export function postBugReportAsync(bug: BugReport) : Promise // of void
    {
        return Util.httpPostJsonAsync(getPrivateApiUrl("bug"), bug);
    }
    export function postTicksAsync(ticks:any) : Promise // of void
    {
        return Util.httpPostJsonAsync(getPrivateApiUrl("ticks"), ticks);
    }
    export function postNotificationsAsync() : Promise // of void
    {
        return Util.httpPostJsonAsync(getPrivateApiUrl("me/notifications"), "");
    }
    export interface PushNotificationRequestBody {
           // Push notification URL;
           // our cloud code will recognize by the URL what the target is. The URL must be understood by System.Uri.TryCreate
           subscriptionuri: string;
           versionminor: number; // minor OS version, e.g. 0
           versionmajor: number; // major OS version, e.g. 4
    }
    export function postNotificationChannelAsync(body: PushNotificationRequestBody) : Promise // of void
    {
        return Util.httpPostJsonAsync(getPrivateApiUrl("me/notificationchannel"), body);
    }
    export function getUserApiKeysAsync(): Promise {
        return Util.httpGetJsonAsync(getPrivateApiUrl("me/keys"));
    }

    export function recentUserSettings():UserSettings
    {
        var s = localStorage['cachedSettings']
        if (s) return JSON.parse(s)
        return null
    }

    export function getUserSettingsAsync(): Promise {
        return Util.httpGetJsonAsync(getPrivateApiUrl("me/settings?format=short"))
            .then(sett => {
                // this is for the non-webapp part of the website in case it needs it
                if (sett) localStorage["cachedSettings"] = JSON.stringify(sett)
                return sett
            })
    }

    export function postUserSettingsAsync(body: UserSettings) : Promise // of void
    {
        return Util.httpPostJsonAsync(getPrivateApiUrl("me/settings"), body);
    }
    export interface AppApiKey
    {
        id : string;
        name : string;
        url : string;
        help: string;
        value : string;
    }
    export function getAppAsync(id:string, appPlatform : string) : Promise // of json
    {
        return Util.httpGetJsonAsync(getPrivateApiUrl(id + "/" + appPlatform + "app"));
    }
    export function postAppAsync(id:string, appPlatform : string, data:any) : Promise // of string
    {
        return Util.httpPostTextAsync(getPrivateApiUrl(id + "/" + appPlatform + "app"), JSON.stringify(data));
    }
    export function getWebAppAsync(id:string) : Promise // of json
    {
        return Util.httpGetJsonAsync(getPrivateApiUrl(id + "/webapp"));
    }
    export function postWebAppAsync(id: string, previewUrl: boolean, data: any): Promise // of string
    {
        return Util.httpPostTextAsync(getPrivateApiUrl(id + "/webapp" + (previewUrl ? "?previewUrl=true" : "")), JSON.stringify(data));
    }
    export function deleteWebAppAsync(id: string): Promise // of string
    {
        return Util.httpDeleteAsync(getPrivateApiUrl(id + "/webapp"));
    }
    export function postAskBetaAsync(accept:boolean) : Promise // of string
    {
        return Util.httpPostTextAsync(getPrivateApiUrl("/me/askbeta?accept=" + accept), "");
    }
    export function postAskSomethingAsync(accept: boolean): Promise // of string
    {
        return Util.httpPostTextAsync(getPrivateApiUrl("/me/asksomething?accept=" + accept), "");
    }
    // ping the server to test if it is online
    // and there is no funny filtering happening
    // this is costly so needs to be used wisely
    export function pingAsync(): Promise // of boolean
    {
        if (/http:\/\/localhost/i.test(document.URL)) return Promise.as(true); // does not work for localhost

        var v = TDev.RT.Math_.random(0xffffff).toString();
        var url = getPublicApiUrl("ping?value=" + encodeURIComponent(v));
        return new Promise((onSuccess: (v: any) => any, onError: (v: any) => any, onProgress: (v: any) => any) => {
            var client: XMLHttpRequest;
            function ready() {
                if (client.readyState == 4)
                    onSuccess(client.status == 200 && client.responseText === v);
            }
            client = new XMLHttpRequest();
            client.onreadystatechange = ready;
            client.open("GET", url);
            client.send();
        });
    }
    export function postPendingProgressAsync() {
        if (!getUserId() || !hasAccessToken() || isOffline()) return Promise.as();
        var data = loadPendingProgress();
        if (Object.keys(data).length == 0) return Promise.as();
        Util.log('progress: ' + JSON.stringify(data));
        return Cloud.postPrivateApiAsync("me/progress", data)
            .then(
                () => clearPendingProgress(data),
                () => { }); // clear relevant progress records on success, otherwise swallow error
    }

    export function postCommentAsync(id: string, text:string): Promise { // JsonComment
        var req = { kind: "comment", text: text, userplatform: Browser.platformCaps };
        return Cloud.postPrivateApiAsync(id + "/comments", req)
    }
}
