///<reference path='refs.ts'/>

module TDev {


    export module Revisions {


        declare var io;

        // ---------- revisionservice urls

        export function revisionservice_http(): string {
            return revision_service_url;
        }

        var revision_service_url: string = "https://storage.touchdevelop.com/sessions";

        export function parseUrlParameters(url: string) {
            if (/altrevserv3/.test(url))
                revision_service_url = "http://localhost:843/sessions3";
            else if (/altrevserv2/.test(url))
                revision_service_url = "http://localhost:843/sessions2";
            else if (/altrevserv1/.test(url))
                revision_service_url = "http://localhost:843/sessions1";
            else if (/altrevserv/.test(url))
                revision_service_url = "http://localhost:843/sessions";
            else if (/simrevserv1/.test(url))
                revision_service_url = "http://127.0.0.1:82/sessions1";
            else if (/simrevserv/.test(url))
                revision_service_url = "http://127.0.0.1:82/sessions";
            else if (/revserv=/.test(url)) {
                var myRe = new RegExp("revserv=([^?&#]+)", "i");
                var myArray = myRe.exec(url);
                revision_service_url = "https://" + myArray[1] + "/sessions";
            }
        }

        // ---------- revisionservice session identifiers and permissions


        export function localsessionid(scriptguid: string) {
            return "L" + scriptguid;
        }
        export function nodesessionid(guid: string): string {
                return "userid" + "0pn" + letterify(guid)
            }
        export function justmesessionid(userid: string, guid: string): string {
                return userid + "0pr" + letterify(guid)
            }
        export function everyonesessionid(author: string, scriptname: string) {
            return author + "0pu" + scripthash(author, scriptname);
        }
        export function make_astsessionid(userid:string) {
            return userid + "0pa" + letterify(Util.guidGen());
        }


        export function scripthash(author: string, title: string) {
            return letterify(author + title);
        }

        export function publicpermission(script?: string): string {
            return "users:*=W" + (script ? " scripts:" + (script) : "");
        }
        export function broadcastpermission(script?: string): string {
            return "users:*=R" + (script ? " scripts:" + (script) : "");
        }
        export function privatepermission(script?: string): string {
            return "users:" + (script ? " scripts:" + (script) : "");
        }

        export function letterify(s: string): string {
            var n = Math.floor(Math.abs(Util.getStableHashCode(s)));
            var c = "";
            while (n > 0) {
                var d = n % 26;
                n = Math.floor(n / 26);
                c = c + String.fromCharCode(97 + d)
            }
            return c;
        }

        // ---------- revisionservice authentication tokens

        // get cached token, or fresh token from touchdevelop.com
        export function getRevisionServiceTokenAsync(forcefreshtoken:boolean = false): Promise {
            var token = getRevisionServiceToken(forcefreshtoken);
            if (token)
                return Promise.wrap(token);
            else
                return refreshRevisionServiceTokenAsync();
        }

        // get cached token, or undefined
        function getRevisionServiceToken(forcefreshtoken: boolean = false) {
            var expires = parseInt(window.localStorage["rs_token_expires"] || "0");
            if (forcefreshtoken || expires > 0 && Date.now() + 600 > expires) {
                setRevisionServiceToken(undefined);
                return undefined;
            }
            return window.localStorage["rs_access_token"];
        }

        function setRevisionServiceToken(token: string, expires_in = 0) {
            if (!token) {
                Util.log('revision service access token expired');
                window.localStorage.removeItem("rs_access_token");
                window.localStorage.removeItem("rs_token_expires");
            }
            else {
                Util.log('received revision service token (expires in ' + (expires_in * 1000).toString() + 'ms)');
                window.localStorage["rs_access_token"] = token;
                if (expires_in > 0)
                    window.localStorage["rs_token_expires"] = Date.now() + expires_in * 1000;
                else window.localStorage.removeItem("rs_token_expires");
            }
        }

        function refreshRevisionServiceTokenAsync(): Promise {
            if (Cloud.isOffline()) return Promise.wrapError(lf("cloud is offline"));

            return Cloud.authenticateAsync(lf("cloud data"))
                .then((authenticated) => {
                    if (authenticated) {
                        var userid = Cloud.getUserId();
                        var tdtoken = Cloud.getAccessToken();
                        Util.log('asking TD server for revision service access token');
                        var tokenserviceurl = "https://www.touchdevelop.com/api/" + userid + "/storage/access_token?access_token=" + tdtoken;
                        return Util.httpRequestAsync(tokenserviceurl, "POST", undefined).then(
                            (text) => {
                                var json = JSON.parse(text);
                                var token = json["access_token"];
                                var expires_in = json["expires_in"];
                                setRevisionServiceToken(token, expires_in);
                                return token;
                            },
                            (error) => {
                                Util.log('could not get revision service token, web request failed');
                                return Promise.wrapError("Failed to receive revision service token");
                            }
                            );
                    } else {
                        Util.log('could not get revision service token, user not signed in');
                        return Promise.wrapError("User not signed in");
                    }
                });
        }

        // ----------- revision service API

        // query server for session info
        export function getServerInfoAsync(id: string): Promise { // json
            return Revisions.getRevisionServiceTokenAsync().then(
                (token) => {
                    if (Cloud.isOffline()) return Promise.wrapError("Cloud is offline");
                    var url = Revisions.revisionservice_http() + "/" + id + "/info?user=" + Cloud.getUserId() + "&access_token=" + encodeURIComponent(token);
                    return Util.httpRequestAsync(url, "GET", undefined).then(
                        (response) => RT.JsonObject.mk(response, RT.Time.log),
                        (error) => undefined
                        );
                },
                (error) => undefined
                );
        }

        // query server for existing sessions
        export function queryMySessionsOnRevisionServerAsync(rt: Runtime, filter_based_on_current_script = false): Promise {
            var userid = Cloud.getUserId();
            return getRevisionServiceTokenAsync().then((token) => {
                if (Cloud.isOffline()) return Promise.wrapError("Cloud is offline");

                var url = revisionservice_http() + "?user=" + userid + "&access_token=" + encodeURIComponent(token);

                if (filter_based_on_current_script) {
                    url = url + "&guidhash=" + encodeURIComponent(letterify(rt.sessions.getScriptGuid()))
                    + "&scripthash=" + encodeURIComponent(scripthash(rt.sessions.getScriptAuthor(), rt.sessions.getScriptName()));
                }

                return Util.httpRequestAsync(url, "GET", undefined).then((s) => {
                    var json = JSON.parse(s);
                    var sessions = new Array<RT.CloudSession>();
                    for (var f in json)
                        if (json.hasOwnProperty(f)) {
                            var cs = new RT.CloudSession();
                            cs._id = f;
                            if (!cs.validate())
                                continue;
                            cs.serverinfo = <Revisions.ServerJson> json[f];
                            cs._title = cs.serverinfo.title;
                            cs._permissions = ""; // not meant for creating fresh sessions
                            sessions.push(cs);
                        }
                    return sessions;
                });
            });
        }

        // query local storage for cached sessions
        export function queryCachedSessionsAsync(filter_based_on_current_script: boolean, rt: Runtime): Promise // of CloudSession[]
        {
            var sessions: RT.CloudSession[] = [];
            var confirmedsessions: RT.CloudSession[] = [];
            return Storage.getTableAsync("Sessions").then((table) => {
                return table.getValueAsync("%").then(
                    (val: string) => {
                        var sessionlist = (val || "").split(" ");
                        sessionlist.forEach((id) => {
                            var cs = new RT.CloudSession();
                            cs._id = id;
                            if (cs.validate()) {
                                if (filter_based_on_current_script) {
                                    var privatehash = letterify(rt.sessions.getScriptGuid());
                                    var scripthash = Revisions.scripthash(rt.sessions.getScriptAuthor(), rt.sessions.getScriptName());

                                    if (cs.tag === "pr" && cs.guidhash != privatehash)
                                        return;
                                    if (cs.tag === "pu" && cs.guidhash != scripthash)
                                        return;
                                    if (cs.tag === "pn")
                                        return;
                                    if (cs.tag[0] === "c" && cs.guidhash[0] === "s" && cs.guidhash.lastIndexOf(scripthash, 1) !== 1)
                                        return;
                                }
                                sessions.push(cs);
                            }
                        });
                        var keys = sessions.map((s, idx, arr) => s._id + "/S");
                        return table.getItemsAsync(keys).then(
                            (results) => {
                                for (var i = 0; i < sessions.length; i++) {
                                    var cs = sessions[i];
                                    var val = results[keys[i]];
                                    if (val) {
                                        var json = JSON.parse(val);
                                        Util.assert(cs._id === json.servername);
                                        Util.assert(cs._id === json.localname);
                                        cs.localname = cs._id;
                                        cs._title = json.description;
                                        cs._permissions = json.permissions;
                                        cs.membernumber = json.membernumber;
                                        cs.enable_sync = json.enable_sync;
                                        confirmedsessions.push(cs);
                                    }
                                    else {
                                        //SEBTODO remove entries pointing to non-existing sessions from stored list
                                    }
                                }
                                return confirmedsessions;
                            });
                    });
            });
        }

        // delete session locally and on server
        export function deleteSessionAsync(desc: ISessionParams, rt:Runtime): Promise {

            var tasks = [];

            tasks.push(Slot.deleteSessionFileAsync(rt.sessions, desc));

            // delete on server
            if (!desc.nodeserver && desc.servername) {
                var pos = desc.servername.indexOf("0");
                if (pos > 3 && pos < desc.servername.length - 4 && desc.servername.substr(0, pos) == Cloud.getUserId()) {
                    tasks.push(Slot.queueSessionWork(desc.localname, "deleting session on server", () =>
                        getRevisionServiceTokenAsync().then((token) => {
                            if (Cloud.isOffline()) return Promise.wrapError("Cloud is offline");
                            var url = revisionservice_http() + "/" + desc.servername + "?user=" + Cloud.getUserId() + "&access_token=" + encodeURIComponent(token);
                            var deleteonserver = Util.httpRequestAsync(url, "DELETE", undefined);
                            return deleteonserver;
                        })));
                }
            }

            return Promise.join(tasks);
        }

        // ----------- functions for safe loading/unloading of sessions w/ local persistence

        export interface ISessionParams {
           nodeserver: string;
           servername: string;
           localname: string;
           user: string;
           permissions: string;
           title: string;
           script: string;
           readonly: boolean;
        }

        export interface ISessionContext {
            url_ws(): string;
            url_http(): string;
            tokensource(forcefreshtoken: boolean): Promise;
            clearCachedData();
            updateStatus();
            createSession(params: ISessionParams): Revisions.ClientSession;
            afterload(): Promise;
            onDoorBell();
        }

        // encapsulate local storage interaction for sessions
        export class Slot {

            constructor(
                public context: ISessionContext,
                public getCurrent: () => Revisions.ClientSession,
                public setCurrent: (val?: Revisions.ClientSession) => void
            ) { }

            // mechanisms for preventing concurrent async operations on the same session
            private static slots = {}; // localname -> slot
            private static busysessions = {};  // localname -> promise

            public connect(desc: ISessionParams, loadonly=false): Promise {  // void, completes when session loaded
                var cs = this.getCurrent();
                if (cs) {
                    if (cs.servername === desc.servername
                        && cs.localname === desc.localname
                        && (cs.user === desc.user || cs.user === "")) {
                        // session already current.
                        if (cs.script !== desc.script || cs.readonly !== desc.readonly || cs.user !== desc.user) {
                            // change requires fresh connection
                            cs.script = desc.script;
                            cs.readonly = desc.readonly;
                            cs.user = desc.user;
                            if (cs.loaded && (cs.servername != "")) {
                                cs.disconnect();
                                cs.try_reconnect_in(1000);
                            }
                        }
                        this.context.updateStatus();
                        return cs.loadtask;
                    }
                    this.disconnect(false, "unload previous session");
                }
                // check if another slot has the same session open
                if (desc.localname) {
                    var openedby = Slot.slots[desc.localname];
                    openedby && openedby.disconnect(false, "opening session in different context");
                }
                // connect
                cs = this.context.createSession(desc);
                this.setCurrent(cs);
                if (cs.localname) Slot.slots[cs.localname] = this;
                cs.user_set_doorbell(() => this.context.onDoorBell());
                var loadtask = this.loadSessionAsync(cs);
                return loadtask;
            }

            public disconnect(deletelocalstorage: boolean, msg: string): Promise {
                var cs = this.getCurrent();
                if (!cs) return Promise.as();
                cs.user_unlink();
                cs.user_set_doorbell(() => undefined);
                this.setCurrent(undefined);
                if (cs.localname && Slot.slots[cs.localname] === this)
                    Slot.slots[cs.localname] = undefined;
                var p = Slot.queueSessionWork(cs.localname, "unloading session" + (msg ? " ("+msg+")" : ""), () => {
                    var promise = cs.closeAsync(deletelocalstorage);
                    promise.done();
                    return promise;
                });
                this.context.clearCachedData();
                this.context.updateStatus();
                return p;
            }

            private loadSessionAsync(session: ClientSession): Promise {
                Util.assert(session !== undefined);
                Util.assert(session.loadtask === undefined);
                var loadtask = Slot.queueSessionWork(session.localname, "loading session", () => session.loadAsync(() => this.context.afterload()));
                loadtask.thenalways(() => {
                    this.context.updateStatus();
                    if (session.loaded) {
                        if (session.servername != "")
                            return session.connect(this.context.url_ws(), (needfreshtoken) => this.context.tokensource(needfreshtoken));
                    }
                    else
                        session.log("!! failure while loading session");
                }).done();
                this.context.clearCachedData();
                this.context.updateStatus();
                return loadtask;
            }

            public static createSessionFileAsync(context: ISessionContext, desc: ISessionParams): Promise { // ClientSession
                Util.assert(desc.localname && !Slot.slots[desc.localname]);
                var s = context.createSession(desc);
                return Slot.queueSessionWork(desc.localname, "creating session", () => {
                    return s.loadAsync().then(() => s.closeAsync(false)).then(() => s, () => undefined);
                });
            }

            public static deleteSessionFileAsync(context:ISessionContext, desc: ISessionParams): Promise
            {
                // check if this session is open in some slot - if so, delete by closing it
                var openedby = desc.localname && Slot.slots[desc.localname];
                if (openedby)
                   return openedby.disconnect(true);

                // delete by opening and then closing
                var s = context.createSession(desc);
                return Slot.queueSessionWork(desc.localname, "deleting session cache", () => {
                    return s.loadAsync().then(() => s.closeAsync(true));
                });
            }

            public static queueSessionWork(localname: string, description: string, work: () => Promise): Promise
            {
                var waitfor = Slot.busysessions[localname];
                if (waitfor === undefined)
                    waitfor = Promise.wrap(undefined);
                else
                    Util.log("[" + localname + "] queued " + description);
                waitfor = waitfor.then(() => {
                    Util.log("[" + localname + "] started " + description);
                    return work().then((x) => {
                        Slot.busysessions[localname] = undefined;
                        Util.log("[" + localname + "] finished " + description);
                        return x;
                    }, (e) => {
                        Slot.busysessions[localname] = undefined;
                            Util.log("[" + localname + "] unsuccessfully terminated  " + description);
                        });
                });
                Slot.busysessions[localname] = (!!waitfor._state) ? undefined : waitfor;
                return waitfor;
            }
        }



        export class Sessions implements ISessionContext {

            public rt: Runtime;

            public url_http(): string { return (this.current_nodeserver || revisionservice_http()); }
            public url_ws(): string { return this.url_http().replace("http", "ws"); }

            public tokensource(forcefreshtoken:boolean): Promise {
                if (this.current_nodeserver)
                    return Promise.as(this._authtoken || "token");
                else
                    return Revisions.getRevisionServiceTokenAsync(forcefreshtoken);
            }
            public _authtoken: string; //HACK
            public setAccessToken(token: string) {
                this._authtoken = token;
            }


            constructor(public wsServer: WebSocketServerWrapper = undefined) { }

            public isNodeServer(): boolean { return this.wsServer !== undefined; }
            public isNodeClient(): boolean { return this.current_nodeserver && this.wsServer === undefined; }

            public hasNodeConnection(): boolean {
                return this.current_nodeserver && this.CurrentSession !== undefined && (<NodeSession>this.CurrentSession).hasNodeConnection();
            }

            public nodeConnectionPending(): boolean { return false }

            public afterload():Promise { return undefined; }

            // ---------- current script context

            private current_userid: string;
            private current_scriptguid: string;
            private current_scriptname: string;
            private current_script: string;
            private current_scriptauthor: string;
            private current_nodeserver: string;

            public getUserId() { return this.current_userid; }
            public getScriptGuid() { return this.current_scriptguid; }
            public getScriptAuthor() { return this.current_scriptauthor; }
            public getScriptName() { return this.current_scriptname; }
            public getScript() { return this.current_script; }
            public getNodeServer() { return this.current_nodeserver; }

            public setEditorScriptContext(user, guid, title, basescript, author) {
                this.current_userid = user;
                this.current_scriptguid = guid;
                this.current_scriptname = title;
                this.current_scriptauthor = author;
                this.current_script = TDev.RT.CloudSession.makeScriptIdentifier(basescript, author);
            }



            public refreshFinalScriptContext(): boolean {  // returns true if there were any changes

                var changed;

                var userid = Cloud.getUserId() || "";
                var scriptguid = this.rt.host ? this.rt.host.currentGuid : this.current_scriptguid;
                var scriptname = this.rt.compiled.scriptTitle;
                var scriptauthor = this.rt.compiled.authorId || "";
                var basescript = this.rt.compiled && this.rt.compiled.baseScriptId || "";
                var script = TDev.RT.CloudSession.makeScriptIdentifier(basescript, scriptauthor);
                var nodeserver = this.rt.compiled.azureSite;

                if ((!nodeserver && this.current_userid !== userid)
                    || this.current_script != script
                    || this.current_scriptguid != scriptguid
                    || this.current_scriptname != scriptname
                    || this.current_nodeserver != nodeserver) {

                    changed = true;

                    //if ((this.CurrentSession || this.LocalSession) && !this.rt.isStopped())
                    //    this.rt.stopAsync();

                    this.currentSessionSlot.disconnect(false, "script context changed");
                    this.localSessionSlot.disconnect(false, "script context changed");
                }

                this.current_userid = userid;
                this.current_scriptguid = scriptguid;
                this.current_scriptname = scriptname;
                this.current_scriptauthor = scriptauthor;
                this.current_script = script;
                this.current_nodeserver = nodeserver;

                return changed;
            }


            public clearScriptContext(includinglocal: boolean): Promise {

                var tasks = [];
                tasks.push(this.currentSessionSlot.disconnect(false, "clear script context"));
                if (includinglocal) tasks.push(this.localSessionSlot.disconnect(false, "clear script context"));

                this.current_userid = undefined;
                this.current_scriptguid = undefined;
                this.current_scriptname = undefined;
                this.current_script = undefined;
                this.current_scriptauthor = undefined;
                this.current_nodeserver = undefined;

                return Promise.join(tasks);
            }


            // ---------- current sessions

            // the current cloud session
            public CurrentSession: ClientSession = undefined;

            // the local session
            public LocalSession: ClientSession = undefined;

            // get the current cloud or node session
            public getCurrentSession(): ClientSession {
                Util.assert(this.CurrentSession !== undefined);
                return this.CurrentSession;
            }

            // get the local session used to persist data locally
            public getLocalSession(): ClientSession {
                if (!this.isNodeServer()) {
                    Util.assert(this.LocalSession !== undefined);
                    return this.LocalSession;
                } else {
                    Util.assert(this.CurrentSession !== undefined);
                    return this.CurrentSession;
                }
            }

            // get last session that was connected (deprecated - always same as current)
            public getLastSession(): ClientSession { return this.CurrentSession; }



            private currentSessionSlot: Slot =
            new Slot(this, () => this.CurrentSession, (cs?: ClientSession) => this.CurrentSession = cs);
            private localSessionSlot: Slot =
            new Slot(this, () => this.LocalSession, (cs?: ClientSession) => this.LocalSession = cs);


            //----------  session descriptors

            public getJustMeSessionDescriptor(): ISessionParams {
                if (!this.current_userid) return undefined;
                return this.getCloudSessionDescriptor(
                    justmesessionid(this.current_userid, this.current_scriptguid),
                    "just-me session for script \"" + this.current_scriptname + "\"",
                    privatepermission()
                );
            }

            public getNodeSessionDescriptor(user:string): ISessionParams {
                var desc = this.getCloudSessionDescriptor(
                    nodesessionid(this.current_scriptguid),
                    "node session for script \"" + this.current_scriptname + "\"",
                    publicpermission(this.current_script)
                    );
                desc.user = user;
                return desc;
            }

            public getEveryoneSessionDescriptor(): ISessionParams {
                return this.getCloudSessionDescriptor(
                    everyonesessionid(this.current_scriptauthor, this.current_scriptname),
                    "everyone session for script \"" + this.current_scriptname + "\"",
                    publicpermission(this.current_script)
                    );
            }

            public getLocalSessionDescriptor(): ISessionParams {
                var desc = <ISessionParams>{};
                desc.servername = "";
                desc.localname = localsessionid(this.current_scriptguid);
                desc.user = "";
                desc.title = "";
                desc.permissions = "";
                desc.script = this.current_script;
                desc.readonly = false;
                desc.nodeserver = "";
                return desc;
            }

            public getCloudSessionDescriptor(servername: string, title: string, permissions: string): ISessionParams {
                var isnode = servername.indexOf("0pn") != -1;
                var owner = servername.substr(0, servername.indexOf("0"));
                var desc = <ISessionParams>{};
                desc.servername = servername;
                desc.user = this.current_userid;
                desc.title = title;
                desc.script = this.current_script;
                desc.permissions = permissions;
                desc.nodeserver = this.current_nodeserver;
                desc.localname = (!isnode && Browser.isNodeJS) ? undefined : servername;
                desc.readonly = !isnode && (owner !== this.current_userid) && (servername.indexOf("0cr") != -1);
                return desc;
            }


            // management functions on sessions

            public disconnect() {
                this.currentSessionSlot.disconnect(false, "disconnect");
                this.localSessionSlot.disconnect(false, "disconnect");
            }

            public unlink() {
                if (this.CurrentSession)
                    this.CurrentSession.user_unlink();
                if (this.LocalSession)
                    this.LocalSession.user_unlink();
            }

            public scriptRestarted() {

                this.refreshFinalScriptContext();

            }

            public scriptStarted(author: string) {

                this.refreshFinalScriptContext();

            }

            public createSession(original: ISessionParams): ClientSession {
                var si = original.nodeserver ?
                    (this.isNodeServer() ?
                    <ClientSession> new ServerSession(original.nodeserver, original.servername, original.localname, original.user,
                        this.rt, this.wsServer) :
                    <ClientSession> new NodeSession(original.nodeserver, original.servername, original.localname, original.user)) :
                    new ClientSession(original.servername, original.localname, original.user);
                si.permissions = original.permissions;
                si.title = original.title;
                si.script = original.script;
                si.readonly = original.readonly;
                si.user = original.user;
                return si;
            }

            public connectCurrent(desc: ISessionParams) : Promise { // void, completes when session loaded

                var isnodesession = desc.servername.indexOf("0pn") != -1;

                Util.assert(isnodesession == !!this.current_nodeserver, "must not mix cloud/node sessions");
                Util.assert(isnodesession || !!this.current_userid, "must be signed in to connect cloud session");
                Util.assert(!this.isNodeServer() || isnodesession, "can only use node session on server");

                return this.currentSessionSlot.connect(desc);
            }


            public enable_script_session_mgt(): boolean {
                return Cloud.getUserId() && !!this.current_userid && !!this.current_scriptguid && !!this.current_scriptauthor;
            }



            // called before running the script
            public ensureSessionLoaded(): Promise {

                var sign_in = (this.current_userid || !this.rt.compiled.hasCloudData || this.current_nodeserver)
                    ? Promise.as()
                    : Cloud.authenticateAsync(lf("cloud data"));

                return sign_in.thenalways(() => {

                    this.refreshFinalScriptContext();

                    var loadlocal: Promise;
                    var loadcurrent: Promise;

                    // load local session
                    if (this.rt.compiled.hasLocalData && !this.isNodeServer()) {
                        loadlocal = this.localSessionSlot.connect(this.getLocalSessionDescriptor()).thenalways(() => {
                            if (this.LocalSession && this.LocalSession.faulted) {
                                Util.check(false, "local data corrupted - resetting");
                                this.localSessionSlot.disconnect(true, "delete due to faulted load");
                                this.localSessionSlot.connect(this.getLocalSessionDescriptor());
                            }
                        });
                    } else {
                        this.localSessionSlot.disconnect(false, "no local data");
                        loadlocal = Promise.as();
                    }

                    // load cloud session
                    if (this.current_nodeserver || this.rt.compiled.hasCloudData) {
                        if (!this.current_nodeserver && !this.current_userid)
                            loadcurrent = Promise.wrapError("cannot run this script without first signing in");
                        else if (!this.current_scriptguid || !this.current_scriptname || !this.current_scriptauthor || !this.current_script)
                            Util.oops("cannot determine script info: runtime lacks information");
                        else {
                            var session = this.current_nodeserver ?
                                this.getNodeSessionDescriptor("") :
                                (this.CurrentSession || this.getJustMeSessionDescriptor());
                            loadcurrent = this.connectCurrent(session);
                        }
                    }
                    else {
                        this.currentSessionSlot.disconnect(false, "no cloud session");
                        loadcurrent = Promise.as();
                    }

                    this.updateStatus();

                    return Promise.join([loadlocal, loadcurrent]);
                });
            }

            // called immediately before execution to re-check that everything is set up as it should be
            public readyForExecution(): boolean {

                if (this.refreshFinalScriptContext()) {
                    Util.check(false, "script info changed between loading and execution");
                    return false;
                }
                if (this.rt.compiled.hasCloudData && !this.current_nodeserver && !this.current_userid) {
                    //Util.check(false, "using cloud data but not signed in");
                    return false;
                }
                if (this.rt.compiled.hasLocalData && !this.isNodeServer() && !(this.LocalSession && this.LocalSession.loaded))
                {
                    Util.check(false, "failed to load local session");
                    return false;
                }
                if ( (this.rt.compiled.hasCloudData || (this.rt.compiled.hasLocalData && this.isNodeServer()))
                     && !(this.CurrentSession && this.CurrentSession.loaded)) {
                    Util.check(false, "failed to load cloud session");
                    return false;
                }
                if (this.LocalSession && this.LocalSession.faulted) {
                    Util.check(false, "error loading local session from disk");
                    return false;
                }
              //  if (this.current_nodeserver && !(this.CurrentSession && this.CurrentSession.loaded)) {
              //      Util.check(false, "failed to load node session");
              //      return false;
              //  }
                return true;
            }

            public stopAsync(): Promise {
                return Promise.as(); // sessions are kept open on client
            }

            public receive_operation(p: Packet) {
                if (!this.current_nodeserver)
                    throw new Error("should not be called for unexported apps");
            }

            public resetCurrentSession(): Promise {
                var session = this.CurrentSession;
                if (!session)
                    return;
                var desc = this.getCloudSessionDescriptor(session.servername, session.title, session.permissions);
                this.currentSessionSlot.disconnect(true, "reset current session");
                return this.currentSessionSlot.connect(desc);
            }

            public clearCurrentSession() {

                if (!this.CurrentSession) return;
                this.CurrentSession.user_clear_all();
                this.clearCachedData();
            }


            // read/write attributes of the local session
            public getLocalSessionAttributeAsync(key: string, rt: Runtime): Promise //string
            {
                Util.assert(!this.isNodeServer(), "cannot access attributes on server");
                return this.get_attribute_lval(key, rt).then((lval) => RT.Conv.fromCloud("string", this.LocalSession.user_get_value(lval)));
            }
            public setLocalSessionAttributeAsync(key: string, value: string, rt: Runtime): Promise //void
            {
                Util.assert(!this.isNodeServer(), "cannot access attributes on server");
                var op = RT.Conv.toCloud("string", value, false);
                return this.get_attribute_lval(key, rt).then((lval) => this.LocalSession.user_modify_lval(lval, op));
            }
            private get_attribute_lval(key: string, rt: Runtime): Promise //Revisions.LVal
            {
                var waitfor = this.LocalSession ? Promise.as() : this.localSessionSlot.connect(this.getLocalSessionDescriptor());
                return waitfor.then(() => this.LocalSession.user_get_lval(Revisions.Parser.MakeProperty(key, "attributes[]", "string"), [], []));
            }

            // ---------- functions for node server

             // Queue an incoming http rest request in the async queue
            public queueRestRequest(sr: RT.ServerRequest) {
                sr._onStop = new PromiseInv();
                (<any> this.rt).dispatchServerRequest(sr, sr._onStop).then((res) => { }, (err) => {
                    RT.App.log("404 " + sr.method().toUpperCase() + " " + sr.url())
                    var resp = sr.getNodeRequest().tdResponse
                    resp.writeHead(404, "API Error")
                    resp.end(err.message)
                });
            }

            // ------------ tie state changes to environment

            // cautious yield
            public yieldSession(): boolean {

                var somechanges = false;
                if (this.CurrentSession) {
                    //CurrentSession.log("yield cloud session");
                    var changes = this.CurrentSession.user_yield();
                    if (changes) {
                        this.updateStatus();
                        this.clearCachedData();
                        somechanges = true;
                    }
                }
                if (this.LocalSession) {
                    //LocalSession.log("yield local session");
                    var changes = this.LocalSession.user_yield();
                    if (changes) {
                        this.clearCachedData();
                        somechanges = true;
                    }
                }
                return somechanges;
            }

            // push status updates to recipients
            public updateStatus() {

                if (this.isNodeServer()) return; // no need to display status to user

                if (this.CurrentSession) {
                    if (this.rt.host)
                        this.rt.host.updateCloudState(true, this.CurrentSession.getCloudSession().type(), this.CurrentSession.user_get_connectionstatus(false));
                    TDev.RT.CloudData.refreshSessionInfo(this.CurrentSession);
                }
                else {
                    if (this.rt.host)
                        this.rt.host.updateCloudState(false, "", "");
                }

            }

            // notify recipients of possible changes
            public onDoorBell() {

                // for node clients: eagerly & automatically reset local cache if marooned or faulted
                if (this.isNodeClient() && this.CurrentSession && (this.CurrentSession.marooned || this.CurrentSession.faulted)) {
                    var s = this.CurrentSession;
                    s.log("discard cache because it is " + (s.marooned ? "marooned" : s.faulted ? "faulted" : ""));

                    this.currentSessionSlot.disconnect(true, "reset because " + (s.marooned ? "marooned" : s.faulted ? "faulted" : ""));
                    this.currentSessionSlot.connect(s);
                }

                if (!Browser.isNodeJS) {
                    this.rt.yield_when_possible();
                }
                this.doorbelllisteners = this.doorbelllisteners.filter(listener => listener());
                this.updateStatus();
            }

            private doorbelllisteners = [];

            public addDoorbellListener(listener: () => boolean) {
                this.doorbelllisteners.push(listener);
            }


            public clearCachedData() {
                for (var l in this.registereddatacaches) {
                    if (this.registereddatacaches.hasOwnProperty(l))
                        (<Revisions.IDataCache> this.registereddatacaches[l]).clearCachedData();
                }
            }
            public registerDataCache(key: string, o: Revisions.IDataCache) {
                this.registereddatacaches[key] = o;
            }
            public unregisterDataCache(key: string) {
                delete this.registereddatacaches[key];
            }
            private registereddatacaches = [];




            // ------------------ session management entry points


            public deleteAllLocalDataAsync(scriptguid: string): Promise {

                var localtask = Slot.deleteSessionFileAsync(this, this.getLocalSessionDescriptor());

                if (this.current_nodeserver) {

                    return Promise.join([
                        Slot.deleteSessionFileAsync(this, this.getNodeSessionDescriptor("")),
                        localtask
                    ]);

                } else {

                    var userid = Cloud.getUserId();
                    if (!userid || userid !== this.current_userid || scriptguid !== this.current_scriptguid)
                        return localtask;

                    else {
                        var justmesession = this.getJustMeSessionDescriptor();
                        var everyonesession = this.getEveryoneSessionDescriptor();
                        return Promise.join([
                            Slot.deleteSessionFileAsync(this, justmesession),
                            Slot.deleteSessionFileAsync(this, everyonesession),
                            localtask
                        ]);
                    }
                }
            }

            public createCustomSessionAsync(title: string, type: string): Promise { // of CloudSession

                Util.assert(!!this.current_userid, "must be signed in to create a cloud session");
                Util.assert(!this.current_nodeserver, "cannot create sessions for cloud library");

                var desc = <ISessionParams>{};

                var letter = (permit_all_scripts ? "a" : "s");
                var scripth = (permit_all_scripts ? "" : scripthash(this.current_scriptauthor, this.current_scriptname));
                var guid = letterify(Util.guidGen());
                var id;
                var permit_all_scripts = false; // we cut this feature. It is too confusing. May re-enable in some other way in the future.
                if (type === "shareable") {
                    desc.servername = this.current_userid + "0cw" + letter + scripth + guid;
                    desc.permissions =  publicpermission(permit_all_scripts ? "" : this.current_script);
                }
                else if (type === "broadcast") {
                    desc.servername = this.current_userid + "0cr" + letter + scripth + guid;
                    desc.permissions = broadcastpermission(permit_all_scripts ? "" : this.current_script);
                }
                else {
                    desc.servername = this.current_userid + "0cp" + letter + scripth + guid;
                    desc.permissions = privatepermission(permit_all_scripts ? "" : this.current_script);
                }
                desc.localname = desc.servername;
                desc.readonly = false;
                desc.user = this.current_userid;
                desc.title = title;
                desc.nodeserver = "";
                desc.script = this.current_script;

                return Slot.createSessionFileAsync(this, desc).then((s:ClientSession) => s.getCloudSession());

            }

        }

        // data caches get notified directly to invalidate them
        export interface IDataCache {
            clearCachedData(): void;
        }

        export interface ServerJson {
            id: string;
            title: string;
            participants: number;
            owner: string;
            permissions: string;
            salt: string;
            percentfull: number;
        }

        //export interface OperationRequest {
        //    operationId: number;
        //    service: string;
        //    actionName: string;
        //    params: any;
        //}

        //export interface NodeResponse {
        //    operationResponse?: OperationResponse;
        //    cloudResponse?: CloudResponse;
        //}
        //export interface OperationResponse {
        //    operationId: number;
        //    value: any;
        //}
        //export interface CloudResponse {
        //}

        export enum CloudOperationType {
            UNKNOWN = 0,
            RPC = 1,
            OFFLINE = 2,
        }


        export interface CloudOperation {
            libName: string;
            actionName: string;
            paramNames: string[];
            returnNames: string[];
            args: any[];
            uidcountstart?: number;
            uidcountstop?: number;
            opid?: number;
            res?: any;
            socket?: WebSocket;
            optype: CloudOperationType;
        }

        //export class ClientContext {
        //    constructor(
        //        public serverround: number,
        //        public clientround: number
        //        ) {
        //    }
        //}

        //export class NodePacket {
        //    constructor(
        //        public operations: CloudOperation[],
        //        public effects: Packet[],
        //        public clientContext: ClientContext) {
        //    }
        //    public send(ws: WebSocket) {
        //        console.log('sending to node:')
        //    console.log(JSON.stringify(this));
        //        ws.send(JSON.stringify(this));
        //    }
        //}

       // export interface CloudQItem {
        //    packets: Packet[];
       //     frame: Packet;
       //     request: any;
       //     socket: any;
       //     membernumber: number;
       // }


    }


    export class WebSocketWrapper
    {
        constructor(public server:WebSocketServerWrapper, private request:any, private socket:WebSocket)
        {
        }

        public origin():string
        {
            return this.request.headers['origin'];
        }

        public path():string
        {
            return this.request.url
        }

        public accept():WebSocket
        {
            (<any>this.socket).tdWrapper = this
            this.server._conns.push(this.socket)

            var remove = () => {
                var conns = this.server._conns
                var idx = conns.indexOf(this.socket)
                if (idx >= 0)
                    conns.splice(idx, 1)
            }

            this.onClose(remove)
            this.onError(remove)

            return this.socket
        }

        public reject():void
        {
            this.socket.close()
        }

        public remoteAddress():string
        {
            return (<any>this.socket).remoteAddress
        }

        public onMessage(h:(stringData:string, binaryData:any)=>void)
        {
            this.socket.addEventListener("message", (msg) => typeof msg.data == "string" ? h(msg.data, null) : h(null, msg.data), false)
        }

        public onClose(h:(code:number, reason:string)=>void)
        {
            this.socket.addEventListener("close", ev => h(ev.code, ev.reason), false)
        }

        public onError(h:(err:any)=>void)
        {
            this.socket.addEventListener("error", h, false)
        }

        public mkTdWebSocket(rt:Runtime)
        {
            if (!this.socket)
                this.accept()

            var w = new RT.WebSocket_(this.socket, rt);

            this.onMessage((str, buff) => {
                var data = str
                if (buff)
                    data = RT.Buffer.fromTypedArray(buff)
                w.receiveMessage(RT.WebSocketMessage.mk(data))
            })

            this.onError(ev => {
                var msg = ev.message || (ev + "")
                RT.App.logEvent(RT.App.DEBUG, "ws", "error: " + msg, undefined);
                w.receiveMessage(RT.WebSocketMessage.mkError(msg));
            });

            return w;
        }
    }


    export class WebSocketServerWrapper
    {
        private handlers:any[] = [];
        public _conns:WebSocket[] = [];

        constructor(private WebSocketModule:any)
        {
        }

        public upgradeCallback(request, socket, body)
        {
            var ws = this.WebSocketModule
            if (ws.isWebSocket(request)) {
                var conn = new ws(request, socket, body)
                var r = new WebSocketWrapper(this, request, conn)

                var nextOne = idx => {
                    if (!this.handlers[idx])
                        r.reject()
                    else
                        this.handlers[idx](r, () => nextOne(idx + 1))
                }
                nextOne(0)
            }
        }

        public closeConnections()
        {
            this._conns.forEach(c => c.close())
            this._conns = []
        }

        public addHandler(h:(req:WebSocketWrapper, next:()=>void)=>void):void
        {
            this.handlers.push(h)
        }

        public connections()
        {
            return this._conns;
        }
    }

}
