///<reference path='refs.ts'/>

module TDev {


    export module Collab {


        // ------------------ revisionservice collaboration API

        export interface CollaborationInfo {
            owner: string;
            ownerScriptguid: string;
            group: string;
            session: string;
            meta: string;
        }

        export function getSessionOwner(session: string): string {
            return session.substr(0, session.indexOf("0"));
        }


        export function getCollaborationsAsync(group: string): Promise { // CollaborationInfo[]
            var userid = Cloud.getUserId();
            if (!userid) return undefined;
            return Revisions.getRevisionServiceTokenAsync().then((token) => {
                if (Cloud.isOffline()) return Promise.wrapError("Cloud is offline");
                var url = Revisions.revisionservice_http() + "/collaborations/" + group
                    + "?user=" + userid + "&access_token=" + encodeURIComponent(token);
                return Util.httpRequestAsync(url, "GET", undefined).then((s) => {
                    var a = JSON.parse(s);
                    if (Array.isArray(a))
                        return a.filter(j => (typeof j === "object"));
                });
            });
        }

        /*export function getCollaborationAsync(owner: string, scriptguid: string): Promise { // CollaborationInfo
            var sessionid = Revisions.astsessionid(owner, scriptguid);
            return Revisions.getRevisionServiceTokenAsync().then((token) => {
                if (Cloud.isOffline()) return Promise.wrapError("Cloud is offline");
                var url = Revisions.revisionservice_http() + "/" + sessionid + "/collaboration"
                    + "?user=" + owner + "&access_token=" + encodeURIComponent(token);
                return Util.httpRequestAsync(url, "GET", undefined).then((s) => {
                    var x = JSON.parse(s);
                    if (typeof x === "object")
                        return <CollaborationInfo> x;
                });
            });
        }*/

        export function startCollaborationAsync(scriptGuid: string, script: string, group: string): Promise { // session id
            TDev.tick(Ticks.collabStartCollaboration);
            var userid = Cloud.getUserId();
            if (!userid) return undefined;
            var sessionid = Revisions.make_astsessionid(userid);
            var ci = <CollaborationInfo> {};
            ci.owner = userid;
            ci.group = group;
            ci.ownerScriptguid = scriptGuid;
            ci.session = sessionid;
            ci["script"] = script;
            return Revisions.getRevisionServiceTokenAsync().then((token) => {
                if (Cloud.isOffline()) return Promise.wrapError("Cloud is offline");
                var url = Revisions.revisionservice_http() + "/" + sessionid + "/collaboration"
                    + "?user=" + userid + "&access_token=" + encodeURIComponent(token);
                return Util.httpRequestAsync(url, "PUT", JSON.stringify(ci)).then(
                (s) => Editor.updateEditorStateAsync(scriptGuid, (st) => {
                                    st.collabSessionId = sessionid;
                                    st.groupId = this.publicId;
                                }),
                (e) => {
                    if (typeof (e) == "object" && e.errorMessage.indexOf("already in group") != -1)
                        ModalDialog.info(lf("can't add twice"), lf("this script has already been added to a group."));
                    else if(typeof (e) == "object" && e.errorMessage.indexOf("invalid group") != -1)
                        ModalDialog.info(lf("cannot add script to group"), lf("could not access this group."));
                    else if (typeof (e) == "object" && e.errorMessage.indexOf("not a group member") != -1)
                        ModalDialog.info(lf("cannot add script to group"), lf("you are not a member of this group."));
                    else
                        throw e;
                });
            });
        }

        export function stopCollaborationAsync(sessionid: string): Promise { // void
            TDev.tick(Ticks.collabStopCollaboration);
            var userid = Cloud.getUserId();
            if (!userid) return undefined;
            var owner = Collab.getSessionOwner(sessionid);
            return Revisions.getRevisionServiceTokenAsync().then((token) => {
                if (Cloud.isOffline()) return Promise.wrapError("Cloud is offline");
                var url = Revisions.revisionservice_http() + "/" + sessionid + "/collaboration"
                    + "?user=" + userid + "&access_token=" + encodeURIComponent(token);
                return Util.httpRequestAsync(url, "DELETE", undefined).then((s) => {
                    return;
                });
            });
        }


        /// -------- push and pull enable/disable


        // temporary pull suppression (initially false, controlled from editor while editing in calculator or other buffers)
        var pullIsTemporarilySuppressed: boolean = false;
        export function getTemporaryPullSuppression(): boolean {
            return pullIsTemporarilySuppressed;
        }
        export function setTemporaryPullSuppression(val: boolean) {
            if (pullIsTemporarilySuppressed == val) return;
            pullIsTemporarilySuppressed = val;
            if (ready && !val && delayed_pull) {
                // when suppression is over, pull now
                processAstTable();
            }
        }

        // automatic push  (initially true, setting is persisted on disk)
        var enable_automatic_push;
        export function getAutomaticPushEnabled(): boolean {
            return enable_automatic_push;
        }
        export function setAutomaticPushEnabled(val: boolean) {
            if (enable_automatic_push == val) return;
            enable_automatic_push = val;
            if (ready && val && delayed_push)
                // when turned on, push now
                pushAstToCloud();
        }

        // automatic pull  (initially true, setting is persisted on disk)
        var enable_automatic_pull;
        export function getAutomaticPullEnabled(): boolean {
            return enable_automatic_pull;
        }
        export function setAutomaticPullEnabled(val: boolean) {
            if (enable_automatic_pull == val) return;
            enable_automatic_pull = val;
            if (ready && val && delayed_pull) {
                // when turned on, pull now
                processAstTable();
            }
        }


        /// ---------- chat & presence interface


        export function registerChangeHandler(handler: () => void) {
            changehandler = handler;
        }
        var changehandler: () => void;



        export function getConnectedUsers(): Revisions.Participant[]{
            if (!AstSession || !AstSession.loaded || AstSession.faulted)
                return [];
            return AstSession.user_get_presence();
        }


        export function postMessage(message: string) {
            TDev.tick(Ticks.collabPostChatMessage);
            if (!AstSession || !AstSession.loaded || AstSession.faulted)
                return;
            var uid = AstSession.user_create_item(ct_chatentry, [], []).uid;
            var userfield = AstSession.user_get_lval(ct_chattable_user, [uid], [])
            var timestampfield = AstSession.user_get_lval(ct_chattable_timestamp, [uid], [])
            var contentfield = AstSession.user_get_lval(ct_chattable_content, [uid], [])
            AstSession.user_modify_lval(userfield, Cloud.getUserId());
            AstSession.user_modify_lval(timestampfield, new Date().toISOString());
            AstSession.user_modify_lval(contentfield, message);
            AstSession.user_push();
        }

        // This function is called by ast.ts, who notifies us when a new
        // statement becomes active. There's nothing to do if collaboration
        // isn't active.
        export function onActivation(stmt: AST.IStableNameEntry) {
            if (!AstSession || !AstSession.loaded || AstSession.faulted || !getAutomaticPushEnabled())
                return;

            var action = TheEditor.currentAction();
            // Happens when editing, say, a record definition, which _is_ an
            // [AST.Stmt] but isn't an action per se.
            if (!action)
                return;

            var stmtName: string = stmt ? stmt.getStableName() : "";
            var actionName: string = action.getStableName();

            var myNumber = AstSession.getMemberNumber();
            if (myNumber === -1) {
                Util.log("Session not active yet! Not pushing info");
                return;
            }

            var ct_lastedit = AstSession.user_get_lval(ct_participantindex_lastedit, [], [myNumber.toString()]);
            var ct_stmtname = AstSession.user_get_lval(ct_participantindex_stmtname, [], [myNumber.toString()]);
            var ct_actionname = AstSession.user_get_lval(ct_participantindex_actionname, [], [myNumber.toString()]);
            AstSession.user_modify_lval(ct_lastedit, new Date().toISOString());
            AstSession.user_modify_lval(ct_stmtname, stmtName);
            AstSession.user_modify_lval(ct_actionname, actionName);
            AstSession.user_push();
        }

        export interface IMessage {
            uid: string;
            user: string;
            timestamp: Date;
            content: string;
            confirmed: boolean;
        }

        export interface IParticipantInfo {
            lastEdit: Date;
            stmtName: string;
            actionName: string;
            sessionId: number;
        }

        var msg_expiration_msec = 15 * 60 * 1000;

        export function getLastTenMessages(): IMessage[]{
            if (!AstSession || !AstSession.loaded || AstSession.faulted)
                return [];
            var items = AstSession.user_get_items_in_domain(ct_chatentry).sort((a, b) => a.compareTo(b));
            var msgarray = [];
            var currenttime = new Date().getTime();
            for (var i = 0; i < items.length; i++) {
                if (i < items.length - 10)
                    AstSession.user_delete_item(items[i]); // delete all but 10 last messages
                else {
                    var msg = <IMessage>{};
                    msg.uid = items[i].uid;
                    var ukeys = [items[i].uid];
                    var lkeys = [];
                    var timestampfield = AstSession.user_get_lval(ct_chattable_timestamp, ukeys, lkeys);
                    var userfield = AstSession.user_get_lval(ct_chattable_user, ukeys, lkeys);
                    var contentfield = AstSession.user_get_lval(ct_chattable_content, ukeys, lkeys);
                    msg.user = AstSession.user_get_value(userfield);
                    msg.timestamp = new Date(AstSession.user_get_value(timestampfield));
                    msg.content = AstSession.user_get_value(contentfield);
                    msg.confirmed = AstSession.user_is_datum_confirmed(items[i]);

                    if (currenttime - msg.timestamp.getTime() > msg_expiration_msec)
                        AstSession.user_delete_item(items[i]);
                    else
                        msgarray.push(msg);
                }
            }
            return msgarray;
        }

        function getParticipantInfo(aSessionId): IParticipantInfo {
            var lastEditLval = AstSession.user_get_lval(ct_participantindex_lastedit, [], [aSessionId.toString()]);
            var stmtNameLval = AstSession.user_get_lval(ct_participantindex_stmtname, [], [aSessionId.toString()]);
            var actionNameLval = AstSession.user_get_lval(ct_participantindex_actionname, [], [aSessionId.toString()]);

            // Abort if this is an empty entry.
            var d = AstSession.user_is_defaultvalue;
            if (d(lastEditLval) && d(stmtNameLval) && d(actionNameLval))
                return null;

            var lastEdit = AstSession.user_is_defaultvalue(lastEditLval)
                ? null
                : new Date(AstSession.user_get_value(lastEditLval));
            var stmtName = AstSession.user_get_value(stmtNameLval);
            var actionName = AstSession.user_get_value(actionNameLval);

            return {
                lastEdit: lastEdit,
                stmtName: stmtName,
                actionName: actionName,
                sessionId: aSessionId
            }
        }

        function clearParticipantInfo(aSessionId) {
            var lastEditLval = AstSession.user_get_lval(ct_participantindex_lastedit, [], [aSessionId.toString()]);
            var stmtNameLval = AstSession.user_get_lval(ct_participantindex_stmtname, [], [aSessionId.toString()]);
            var actionNameLval = AstSession.user_get_lval(ct_participantindex_actionname, [], [aSessionId.toString()]);

            AstSession.user_modify_lval(lastEditLval, "");
            AstSession.user_modify_lval(stmtNameLval, "");
            AstSession.user_modify_lval(actionNameLval, "");
        }

        export function getActiveParticipants(): IParticipantInfo[] {
            var connectedUserSet: StringMap<boolean> = {};
            getConnectedUsers().forEach((x: Revisions.Participant) => connectedUserSet[x.sessionId] = true);

            var r: IParticipantInfo[] = [];
            var entries = AstSession.user_get_entries_in_indexdomain(ct_participantindex);
            entries.forEach(function (e) {
                var sessionId = parseInt(e.lkeys[0]);
                if (!(sessionId in connectedUserSet))
                    return;

                var info = getParticipantInfo(sessionId);
                if (!info)
                    return;

                if (!info.lastEdit || (Date.now() - info.lastEdit.getTime()) > msg_expiration_msec) {
                    clearParticipantInfo(sessionId);
                } else {
                    r.push(info);
                }
            });
            // Don't forget to push our changes (i.e. outdated messages that we
            // removed from the index!).
            AstSession.user_push();
            return r;
        }

        export function getLastActivity(aUserId): IParticipantInfo {
            var mostRecent = null;
            this.getConnectedUsers().forEach(u => {
                if (u.userId == aUserId) {
                    var info = getParticipantInfo(u.sessionId);
                    if (mostRecent == null || info.lastEdit && mostRecent.lastEdit < info.lastEdit)
                        mostRecent = info;
                }
            });
            return mostRecent;
        }

        // cloud types for snap chat

        var ct_chatentry = Revisions.Parser.MakeDomain("chat", Revisions.Parser.DOMAIN_DYNAMIC, []);
        var ct_chattable = Revisions.Parser.MakeDomain("chattable", Revisions.Parser.DOMAIN_STATIC, [ct_chatentry]);
        var ct_chattable_user = Revisions.Parser.MakeProperty("user", ct_chattable, "string");
        var ct_chattable_timestamp = Revisions.Parser.MakeProperty("timestamp", ct_chattable, "string");
        var ct_chattable_content = Revisions.Parser.MakeProperty("content", ct_chattable, "string");

        // cloud types for participant

        var ct_participantindex_key = Revisions.Parser.MakeDomain("participant", Revisions.Parser.DOMAIN_BUILTIN, []);
        var ct_participantindex = Revisions.Parser.MakeDomain("participantindex", Revisions.Parser.DOMAIN_STATIC, [ct_participantindex_key]);
        var ct_participantindex_lastedit = Revisions.Parser.MakeProperty("lastedit", ct_participantindex, "string");
        var ct_participantindex_stmtname = Revisions.Parser.MakeProperty("stmtname", ct_participantindex, "string");
        var ct_participantindex_actionname = Revisions.Parser.MakeProperty("actionname", ct_participantindex, "string");

        // cloud types for AST merging

        var cloudtype_delta = Revisions.Parser.MakeDomain("delta", Revisions.Parser.DOMAIN_DYNAMIC, []);
        var cloudtype_deltatable = Revisions.Parser.MakeDomain("deltatable", Revisions.Parser.DOMAIN_STATIC, [cloudtype_delta]);
        var cloudtype_pre = Revisions.Parser.MakeProperty("pre", cloudtype_deltatable, "ast");
        var cloudtype_post = Revisions.Parser.MakeProperty("post", cloudtype_deltatable, "ast");
        var cloudtype_merge = Revisions.Parser.MakeProperty("merge", cloudtype_deltatable, "ast");
        var cloudtype_desc = Revisions.Parser.MakeProperty("desc", cloudtype_deltatable, "string");
        var cloudtype_stats = Revisions.Parser.MakeProperty("stats", cloudtype_deltatable, "string");



        /// ---------------- hooks that are called from editor

        // called when a new Script is loaded into the Editor
        export function setCollab(astsession: string) {
            if (!astsession) {
                Util.log(">>> Stop Collab! " + Script);
                astSessionSlot.disconnect(false, "collab turned off");
                ready = false;
                loadPromise = undefined;
                readyPromise = undefined;
            }
            else {
                var userid = Cloud.getUserId(); // TODO prompt sign in?
                if (userid) {
                    Util.log(">>> Start Collab! " + astsession);
                    var desc = getAstSessionDescriptor(astsession);
                    ready = false;
                    var p = readyPromise = new PromiseInv();
                    loadPromise = new PromiseInv();
                    prevCloudAst = currentCloudAst = undefined;
                    enable_automatic_pull = true;
                    enable_automatic_push = true;
                    astSessionSlot.connect(desc); // calls afterLoad() once file is loaded, before it connects
                }
            }
        }

        export var readyPromise: PromiseInv;
        export var loadPromise: PromiseInv;

        // called immediately after the file is loaded
        function afterload(): Promise {

            if (AstSession.faulted) {
                // skip rest of loading - just be done with it, so the automatic reload can trigger
                readyPromise.success(undefined);
                loadPromise.success(false);
            }

            else {

                if (loaduserdata()) {
                    TDev.tick(Ticks.collabResume);
                    Util.log(">>> Resuming collab from file " + astdesc(currentCloudAst));
                    ready = true;
                    // we are resuming from saved state
                    TDev.TheEditor.undoMgr.pullIntoEditor().then(() => {
                        readyPromise.success(undefined);
                        loadPromise.success(false);
                    });
                } else {
                    TDev.tick(Ticks.collabFirstLoad);
                    // need to get initial version from revision server
                    loadPromise.success(true);
                }
            }

            return Promise.as();
        }



        function loaduserdata(): boolean {
            var pc = Collab.AstSession.user_get_userdata("asts");
            if (!pc)
                return false;
            prevCloudAst = pc[0];
            currentCloudAst = (pc.length > 1) ? pc[1] : pc[0];
            enable_automatic_pull = Collab.AstSession.user_get_userdata("enable_automatic_pull");
            enable_automatic_push = Collab.AstSession.user_get_userdata("enable_automatic_push");
            return true;
        }
        function saveuserdata() {
            Collab.AstSession.user_set_userdata("asts",
                astEquals(prevCloudAst,currentCloudAst) ? [currentCloudAst] : [prevCloudAst, currentCloudAst],
                (pc, newpc) => (pc && newpc && pc.length == newpc.length && astEquals(pc[0], newpc[0]) && (!pc[1] || astEquals(pc[1], newpc[1])))
                );
            Collab.AstSession.user_set_userdata("enable_automatic_pull", enable_automatic_pull);
            Collab.AstSession.user_set_userdata("enable_automatic_push", enable_automatic_push);
        }


        //// -------------- global state

        export var enableUndo = false;
        export var AstSession: TDev.Revisions.ClientSession = undefined;

        // sync control
        export var ready = false;
        export var currentCloudAst: string[];
        var prevCloudAst: string[];
        var numberUnconfirmedDeltas = 0;

        // flags indicating presence of suppressed pushes or pulls
        var delayed_pull = false;
        var delayed_push = false;






        export function astEquals(ast1: string[], ast2: string[]):boolean {
            return ast1[0] == ast2[0] || ast1[1] === ast2[1];
        }

        function randomsuffix(): string {
            var d = new Date();
            var ms = d.getMilliseconds();
            return String.fromCharCode("a".charCodeAt(0) + ms % 26) + String.fromCharCode("a".charCodeAt(0) + Math.floor(ms / 26) % 26);
        }

        export function astdesc(ast: string[]): string {
            return ast[0] + "(" + ast[1].length + ")";
        }

        function onDoorBell() {

            if (!AstSession) {
                return;
            }

            if (AstSession.marooned) {
                var s = AstSession;
                AstSession.log("discard cache because it is marooned");
                Script.editorState.collabSessionId = undefined;
                ModalDialog.infoAsync("Project Discontinued", "This project has been discontinued. You can continue to edit the script, but it will no longer synchronize with other team members.")
                    .thenalways(() => TDev.TheEditor.goToHubAsync()).done();
                astSessionSlot.disconnect(true, "project discontinued"); // deletes the file from disk
            }
            else if (AstSession.faulted) {
                AstSession.log("local cache is corrupted - deleting");
                ModalDialog.infoAsync("Cache Corrupted", "Sorry... we encountered a problem with the stored project state. Please try again to get the latest state from the server.")
                    .thenalways(() => TDev.TheEditor.goToHubAsync()).done();
                return astSessionSlot.disconnect(true, "cache corrupted"); // deletes the file from disk
            }
            else {

                //TODO detect permission problems as well

                if (!AstSession.user_yield() && ready)
                    return;

                processAstTable();

                if (changehandler)
                    changehandler();
            }
        }


        export function recordAst(ast: string) : any {

            Util.assert(ready);

            TDev.tick(Ticks.collabRecordAst);

            var newast  = [randomsuffix(), ast];

            if (astEquals(currentCloudAst, newast))
                return currentCloudAst;

            Util.log(">>> recordAst " + astdesc(newast));
            currentCloudAst = newast;
            saveuserdata();


            var wentout = pushAstToCloud();

            if (!wentout) {
                  //TODO : make pending changes visible
                //AstSession.user_push();
               // AstSession.user_modify_lval(AstSession.user_get_lval(ct_participantindex_blockedpushes, [], [AstSession.getMemberNumber().toString()]), "A1");

            }
            else {
                // clear unsaved changes
            }

            return newast;
        }

        export function pushAstToCloud(): boolean {

            Util.assert(ready);

            if (!enable_automatic_push || numberUnconfirmedDeltas >= 2) {
                delayed_push = true;
                return false;
            }

            delayed_push = false;
            numberUnconfirmedDeltas++;

            if (!astEquals(prevCloudAst, currentCloudAst)) {
                var desc = astdesc(prevCloudAst) + ", " + astdesc(currentCloudAst);

                Util.log(">>> pushAstToCloud: " + desc);

                var item = AstSession.user_create_item(cloudtype_delta, [], []);
                AstSession.user_modify_lval(AstSession.user_get_lval(cloudtype_pre, [item.uid], []), prevCloudAst);
                AstSession.user_modify_lval(AstSession.user_get_lval(cloudtype_post, [item.uid], []), currentCloudAst);
                AstSession.user_modify_lval(AstSession.user_get_lval(cloudtype_desc, [item.uid], []), desc);

                prevCloudAst = currentCloudAst;
                saveuserdata();

                AstSession.user_push();
            }

            return true;
        }

        export function processAstTable() {

            var items = AstSession.user_get_items_in_domain(cloudtype_delta).sort((a, b) => a.compareTo(b));

            if (items.length < 1) {
                Util.assert(!ready);
                Util.log(">>> processAstTable (not ready)");
                return; // have not received initial prefix from server yet
            }
            else if (!ready) {
                Util.log(">>> processAstTable first time, (" + items.length + ")");
            } else
                Util.log(">>> processAstTable (" + items.length + ")");


            var pos = 0;
            var cur = items[pos];
            var cloud_ast = AstSession.user_get_value(AstSession.user_get_lval(cloudtype_merge, [cur.uid], []));
            Util.assert(cloud_ast);
            var lkeys = [];

            // go through unmerged confirmed delta entries; delete all but last, and enter merge results
            var pos = 1;
            while (pos < items.length && AstSession.user_is_datum_confirmed(items[pos])) {
                AstSession.user_delete_item(items[pos - 1]);
                var ukeys = [items[pos].uid];
                var merge_lval = AstSession.user_get_lval(cloudtype_merge, ukeys, lkeys);
                var stats_lval = AstSession.user_get_lval(cloudtype_stats, ukeys, lkeys);
                Util.assert(!AstSession.user_get_value(merge_lval));
                var pre = AstSession.user_get_value(AstSession.user_get_lval(cloudtype_pre, ukeys, lkeys));
                var post = AstSession.user_get_value(AstSession.user_get_lval(cloudtype_post, ukeys, lkeys));
                cloud_ast = mergeAsts(pre, post, cloud_ast,
                    (data) => AstSession.user_modify_lval(stats_lval, JSON.stringify(data)));
                AstSession.user_modify_lval(merge_lval, cloud_ast);
                pos++;
            }

            numberUnconfirmedDeltas = items.length - pos;

            // if  automatic pull is off, this is all and we stop here
            if (ready && (!enable_automatic_pull || pullIsTemporarilySuppressed)) {
                delayed_pull = true;
                return;
            } else
                delayed_pull = false;

            // go through unconfirmed delta entries
            while (pos < items.length) {
                Util.assert(!AstSession.user_is_datum_confirmed(items[pos]));
                var ukeys = [items[pos].uid];
                var pre = AstSession.user_get_value(AstSession.user_get_lval(cloudtype_pre, ukeys, lkeys));
                var post = AstSession.user_get_value(AstSession.user_get_lval(cloudtype_post, ukeys, lkeys));
                cloud_ast = mergeAsts(pre, post, cloud_ast);
                pos++;
            }

            if (!ready) {

                // first time
                currentCloudAst = cloud_ast;
                prevCloudAst = cloud_ast;
                saveuserdata();
                ready = true;
                Util.log(">>> collab is ready " + astdesc(currentCloudAst));
                TDev.TheEditor.undoMgr.pullIntoEditor().then(() => {
                    readyPromise.success(undefined);
                });

            } else {

                // merge with local delta (prev,current)
                var m = mergeAsts(prevCloudAst, currentCloudAst, cloud_ast);
                if (!astEquals(prevCloudAst, cloud_ast)) {
                    prevCloudAst = cloud_ast;
                    saveuserdata();
                }
                if (!astEquals(currentCloudAst, m)) {
                    currentCloudAst = m;
                    saveuserdata();
                }

                TDev.TheEditor.undoMgr.pullIntoEditor();
            }

            // potentially push things that were delayed earlier
            if (delayed_push)
                pushAstToCloud();
        }


        /// ------------------- the actual merge function

        export var testMode = true;

        function versionname(ast: string[]) {
            var full = ast[0];
            var pos = full.indexOf("=");
            return (pos != -1) ? full.substr(0, pos) : full;
        }

        function mergeAsts(o_ast: string[], a_ast: string[], b_ast: string[], datacollector?: (IMergeData) => void) {

            //  take shortcuts based on merge function equivalences
            if (astEquals(o_ast, b_ast)     // easy merge: deltas are consecutive edits
                || astEquals(b_ast, a_ast))  // easy merge: identical change
            {
                return a_ast;
            }

            var os = o_ast[1];
            var bs = b_ast[1];
            var as = a_ast[1];

            TDev.tick(Ticks.collabRealMerge);

            var name = randomsuffix();
            var mergedesc = "m(" + versionname(o_ast) + "," + versionname(a_ast) + "," + versionname(b_ast) + ")";

            var timer1 = Util.perfNow();

            var b = (<any>TDev).AST.Parser.parseScript(bs);
            var o = (<any>TDev).AST.Parser.parseScript(os);
            var a = (<any>TDev).AST.Parser.parseScript(as);

            

            // (<any>TDev).AST.TypeChecker.tcApp(t1);
            //  (<any>TDev).AST.TypeChecker.tcApp(t2);
            // (<any>TDev).AST.TypeChecker.tcApp(t3);
            //  (<any>TDev).AST.TypeChecker.tcApp(t4);

            //var bss = b.serialize();
            //var oss = o.serialize();
            //var ass = a.serialize();
            //if (t1ss !== t1s) debugger;
            //if (t2ss !== t2s) debugger;
            //if( t3ss !== t3s) debugger;
            //if( t4ss !== t4s) debugger;

            (<any>TDev).TheEditor.initIds(b);
            (<any>TDev).TheEditor.initIds(o);
            (<any>TDev).TheEditor.initIds(a);

            var timer2 = Util.perfNow();

            //console.log(">> merging: \n" + t3.serialize() + "\n---------\n" + t4.serialize() + "\n-----------\n" + t2.serialize());

            var merged = (<any>TDev).AST.Merge.merge3(o, a, b, datacollector);
            var mergeds = merged.serialize();

            Util.assert(merged.things.length > 0 || a.things.length == 0 || b.things.length == 0);

            // TODO XXX - do we need to update the ancestors somehow?


            //console.log(">> merging: \n" + t3.serialize() + "\n---------\n" + t4.serialize() + "\n-----------\n" + t2.serialize());

            // if we are in testing mode, record results and test equivalences
            if (testMode)
                var record = JSON.stringify({ "O": os, "A": as, "B": bs, "actual": mergeds });


            return [name + "=" + mergedesc, mergeds];
        }



        // session context functions

        var astSessionSlot = new Revisions.Slot(
            <Revisions.ISessionContext>
            {
                url_ws: () => Revisions.revisionservice_http().replace("http", "ws"),
                url_http: Revisions.revisionservice_http,
                tokensource: Revisions.getRevisionServiceTokenAsync,
                clearCachedData: clearCachedData,
                updateStatus: updateStatus,
                createSession: createSession,
                onDoorBell: onDoorBell,
                afterload: afterload
            },
            () => AstSession,
            (cs?: TDev.Revisions.ClientSession) => {
                AstSession = cs;
                ready = false;
                currentCloudAst = undefined;
                prevCloudAst = undefined;
            }
            );

        function updateStatus() {
        }

        function clearCachedData() {
        }

        function createSession(original: Revisions.ISessionParams): Revisions.ClientSession {
            var si = new Revisions.ClientSession(original.servername, original.localname, original.user);
            si.permissions = "";
            si.title = "";
            si.script = "";
            si.readonly = false;
            si.user = original.user;
            return si;
        }

        function getAstSessionDescriptor(session: string): Revisions.ISessionParams {
            var desc = <Revisions.ISessionParams> {};
            desc.servername = session;
            desc.localname = session;
            desc.permissions = "";
            desc.readonly = false;
            desc.title = "";
            desc.user = Cloud.getUserId();
            desc.nodeserver = "";
            desc.script = "";
            return desc;
        }


    }


}
