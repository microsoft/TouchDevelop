///<reference path='refs.ts'/>
module TDev.RT {
    //? A cloud data session
    //@ ctx(general) stem("session") cap(cloudData) serializable
    export class CloudSession
        extends RTValue {

        // the unique identifier for the session.
        public _id: string;

        // immutable information about this session
        public _title: string;
        public _permissions: string;

        // additional "soft" information about this session

        public position: number;     // used for sorting list in displayed dialog

        // filled in by server queries
        public serverinfo: Revisions.ServerJson;

        // link to ClientSession
        public sessionimpl: Revisions.ClientSession;

        // filled in by storage queries
        public localname: string;    // name for cache entry
        public membernumber: number; // member number on server
        public enable_sync: boolean;    // sync is enabled

        // info that is derived from _id
        public ownerid: string;
        public tag: string; //(pr|pu|cr|cw|cp)
        public guidhash: string;

        public authtoken:string;

        public isJustMeSession(): boolean { return this.tag === "pr"; }
        public isEveryoneSession(): boolean { return this.tag === "pu"; }
        public isBroadcastSession(): boolean { return this.tag === "cr"; }
        public isShareableSession(): boolean { return this.tag === "cw"; }
        public isPrivateSession(): boolean { return this.tag === "cp"; }
        public isNodeSession(): boolean { return this.tag === "pn"; }

        // used for assigning icon to session
        public type(): string {
            if (this.isBroadcastSession()) return "broadcast";
            if (this.isEveryoneSession() || this.isShareableSession()) return "public";
            return "";
        }

        constructor() {
            super()
        }

        public toString(): string {
            return lf("cloud session: ") + this._id + (this._title ? "(" + this._title + ")" : "");
        }

        public static fromDescriptor(desc: Revisions.ISessionParams) {
            if (!desc) return undefined;
            var s = new CloudSession();
            s._id = desc.servername;
            s._title = desc.title;
            s._permissions = desc.permissions;
            return s.validate() ? s : undefined;
        }

        // parse unique id (check validity and extract info)
        public validate(): boolean {
            var pos = this._id.indexOf("0");
            if (pos > 3 && pos < this._id.length - 4) {
                this.ownerid = this._id.substr(0, pos);
                this.tag = this._id.substr(pos + 1, 2);
                this.guidhash = this._id.substr(pos + 3);
                return (/^[a-z]{3,}$/.test(this.ownerid) && /^[a-z]+$/.test(this.guidhash) && /^(pr|pu|cr|cw|cp|pn)$/.test(this.tag));
            }
            else
                return false;
        }

        // these tags are used for crs/cws/crs sessions to narrow down the target script
        public static makeScriptTag(author: string, scriptname: string) {
            return (author + "xx" + Revisions.letterify(scriptname) + "xx");
        }

        public static makeScriptIdentifier(scriptid: string, authorid: string) {
            return scriptid + "@" + authorid;
        }

        //? Checks if this cloud session is the same as another one
        public equals(other: CloudSession): boolean { return this._id === other._id; }

        //? Gets a string that uniquely identifies this cloud session; other users can connect by using this string.
        public id(): string { return this._id; }

        //? Gets a string that describes this cloud session
        public title(): string { return this._title; }

        //? Gets information about the user that owns this session
        public owner(): User { return User.mk(this.ownerid); }

        //? Indicates if the current user owns this session
        //@ returns(boolean)
        public is_owned(s: IStackFrame) { //: boolean {
            return s.rt.sessions.getUserId() === this.ownerid;
            //Bazaar.userIdAsync(r.rt).done(userId => r.resumeVal(userId === this.ownerid));
        }

        //? Displays the session description on the wall.
        public post_to_wall(s: IStackFrame) {
            s.rt.postBoxedHtml(
                CloudData.formatCloudSessionInfo(this, false, false, true),
                s.pc,
                this
                );
        }

        //? Query server about current state of this session. You must be the authenticated owner.
        //@ async returns(JsonObject)
        //@ dbgOnly
        public server_info(r: ResumeCtx) {

            if (this.isNodeSession())
                Util.userError(lf("cannot get session info for deployed cloud libraries"), r.rt.current.pc);
            if (this.ownerid !== r.rt.sessions.getUserId())
                Util.userError(lf("not permitted: must be session owner"), r.rt.current.pc);
            if (this.isNodeSession())
                Util.userError(lf("cannot query node sessions server info"));

            var promise = Revisions.getServerInfoAsync(this._id);
            promise.then((result) => r.resumeVal(result));

           // unrelated: testing attribute code
           // Revisions.setLocalSessionAttributeAsync("test", "42", r.rt).then(() => {
           //     var x = Revisions.getLocalSessionAttributeAsync("test", r.rt);
           //});

            return promise.done();
        }
    }

    //? Cloud session management
    //@ cap(cloudData) skill(2)
    export module CloudData {



        // ---- static formatters

        //? Gets the currently active session. When the script starts, this is always the just-me session.
        export function current_session(i: IStackFrame): CloudSession {
            return i.rt.sessions.getCurrentSession().getCloudSession();
        }

        //? Clear the local cache of the current session (discarding unsynced changes) and get fresh data from server
        //@ dbgOnly
        //@ async returns(CloudSession)
        export function rebuild_cache(r: ResumeCtx): void {
            r.rt.sessions.resetCurrentSession().then((s: CloudSession) => { r.resumeVal(s); });
        }


        //? Clear all data of the currently active session.
        //@ writesMutable
        export function clear_all_data(i: IStackFrame): void {
            return i.rt.sessions.clearCurrentSession();
        }


        //? Export a JSON representation of all the cloud data
        //@ dbgOnly
        export function to_json(s: IStackFrame): JsonObject {
            var ctx = new JsonExportCtx(s, true);
            var json = s.rt.compiled._exportJson(s.rt.datas["this"], ctx);
            return JsonObject.wrap(json);
        }

        //? Import a JSON representation of the cloud data
        //@ dbgOnly
        //@ writesMutable
        export function from_json(jobj: JsonObject, s: IStackFrame) {
            var json = jobj.value();
            var ctx = new JsonImportCtx(s);
            s.rt.compiled._importJson(s.rt.datas["this"], ctx, json);
        }

        //? Deprecated: always equal to current session.
        //@ obsolete
        export function last_session(s: IStackFrame): CloudSession {
            return s.rt.sessions.getCurrentSession().getCloudSession();
        }

        //? Gets the just-me session, in which cloud data is shared between devices by the same user.
        export function just_me_session(s: IStackFrame): CloudSession {

            return CloudSession.fromDescriptor(s.rt.sessions.getJustMeSessionDescriptor());

        }
        //? `validator(token)` should return user id (eg, `"fb:123456"`) or `""` in case token is invalid
        //@ dbgOnly
        //@ writesMutable
        export function set_token_validator(validator:StringConverter<string>, s:IStackFrame) {
            s.rt.authValidator = validator
        }

        //? Authenticate against your deployed cloud library. Returns false if the authentication fails or the connection times out.
        //@ dbgOnly uiAsync returns(boolean)
        //@ writesMutable
        export function authenticate(access_token: string, r: ResumeCtx) {
            r.rt.authAccessToken = access_token
            if (!access_token)
                r.resumeVal(false)
            else
                r.rt.queryServiceAsync("-internal-/me", {})
                .done(resp => {
                    if (resp.userid) {
                        r.rt.authUserId = resp.userid
                        r.resumeVal(true)
                    } else {
                        r.resumeVal(false)
                    }
                }, err => {
                    r.resumeVal(false)
                })

            /*
            r.rt.sessions.setAccessToken(access_token);
            r.rt.sessions.connectCurrent(r.rt.sessions.getNodeSessionDescriptor("tbd"));
            var cs = r.rt.sessions.getCurrentSession();
            cs.log("waiting for auth");
            var decided = false;
            Util.setTimeout(30 * 1000, () => {
                if (!decided) {
                    decided = true;
                    r.resumeVal(false);
                }
            });
            r.rt.sessions.addDoorbellListener(() => {
                if (decided)
                    return false;
                if (cs.receivedstatus) {
                    decided = true;
                    r.resumeVal(!!cs.clientUserId);
                    return false;
                }
                return true; // keep listening
            });
            */
        }




        //? Gets the everyone-session, in which cloud data is shared by everyone running this script.
        export function everyone_session(s: IStackFrame): CloudSession {
            return CloudSession.fromDescriptor(s.rt.sessions.getEveryoneSessionDescriptor());
        }



        //? Waits until the current server state has been received. Returns false if offline, or if time limit is exceeded.
        //@ [timeout].deflExpr(30)
        //@ async returns(boolean)
        //@ writesMutable
        export function wait_for_server(timeout: number, r: ResumeCtx) // : bool
        {
            var ses = r.rt.sessions;
            var cs = ses.getCurrentSession();
            cs.user_yield();
            if (cs.user_get_connectionstatus(false) === "connected")
                r.resumeVal(true);
            else if (timeout === 0)
                r.resumeVal(false);
            else {
                cs.log("issuing fence");
                var decided = false;
                Util.setTimeout(timeout * 1000, () => {
                    if (!decided) {
                        decided = true;
                        r.resumeVal(false);
                    }
                });
                cs.user_issue_fence(() => {
                    if (!decided) {
                        decided = true;
                        r.resumeVal(true);
                    }
                }, !r.isTaskCtx());
            }
        }


        //? Creates a new cloud session owned by the current user.
        //@ [type].defl("shareable") [type].deflStrings("shareable", "private", "broadcast")
        //@ async returns(CloudSession)
        //@ writesMutable
        export function create_session(title: string, type: string, r: ResumeCtx) // : CloudSession
        {
            if (!title)
                Util.userError(lf("must specify title"), r.rt.current.pc);
            if (!/^(shareable|private|broadcast)$/.test(type))
                Util.userError(lf("no such session type"), r.rt.current.pc);

            return r.rt.sessions.createCustomSessionAsync(title, type).then(val => {
                r.resumeVal(val);
            }).done();
        }



        //? Gets a session from a session id
        export function session_of(id: string, title: string, s: IStackFrame): CloudSession {
            var cs = new CloudSession();
            cs._id = id;
            cs._title = title;
            cs._permissions = ""; // indicates we do not want to create fresh
            if (cs.validate() && cs.tag[0] === "c")
                return cs;
            else
                Util.userError(lf("cannot get session from id"), s.pc);
        }


        //? Gets a string that describes the state of the cloud synchronization, and additional details if requested
        export function connection_status(include_extra_details: boolean, s: IStackFrame): string {
            return s.rt.sessions.getCurrentSession().user_get_connectionstatus(include_extra_details);
        }

        //? Returns the participant number within the current session, or -1 if not known yet. Participant numbers are assigned by the server on first connect, starting with 0.
        export function participant_number(s: IStackFrame): number {
            return s.rt.sessions.getCurrentSession().getMemberNumber();
        }

        //? Enable or disable cloud synchronization for the current session
        //@ writesMutable
        export function set_sync_enabled(enable: boolean, s: IStackFrame): void {
            s.rt.sessions.getCurrentSession().user_enable_sync(enable);
        }

        //? Returns a boolean indicating whether cloud synchronization is enabled for the current session
        export function is_sync_enabled(s: IStackFrame): boolean {
            return s.rt.sessions.getCurrentSession().user_sync_enabled();
        }

        export function formatCloudSessionInfo(cloudSession: CloudSession, preselected: boolean, includesserverdata: boolean, showscriptname: boolean, user: RT.User = null): HTMLElement {

            var percentfull = (cloudSession.sessionimpl && cloudSession.sessionimpl.user_get_percent_full()) ? cloudSession.sessionimpl.user_get_percent_full() :
                (cloudSession.serverinfo && cloudSession.serverinfo.percentfull) ? cloudSession.serverinfo.percentfull : 0;
            var percentfullstring = percentfull ? (" (" + percentfull + lf("% full") + ")") : "";
            var title = (!showscriptname && cloudSession.isEveryoneSession()) ? lf("everyone session") :
                (!showscriptname && cloudSession.isJustMeSession()) ? lf("just-me session") :
                (cloudSession._title || (lf("session \"") + cloudSession._id + "\""));  // SEBTODO keep more info about script association, to improve display
            var owner = (cloudSession.ownerid === Cloud.getUserId()) ? lf("I") : user ? (user.name + " (/" + cloudSession.ownerid + ")") : (lf("user /") + cloudSession.ownerid);
            var permissions = (cloudSession.isEveryoneSession() || cloudSession.isShareableSession()) ? lf("everyone can read and modify") :
                (cloudSession.isJustMeSession() || cloudSession.isPrivateSession()) ? lf("only ") + owner + lf(" can read and modify") :
                (lf("only ") + owner + lf(" can modify, but everyone can read"));
            var connected = cloudSession.sessionimpl && cloudSession.sessionimpl.user_is_websocket_open();
            var localname = cloudSession.sessionimpl ? cloudSession.sessionimpl.localname : cloudSession.localname;
            var existence = (includesserverdata || connected)
                ? ((cloudSession.serverinfo || connected)
                ? localname
                ? lf("stored in cloud") + percentfullstring + lf(" and locally cached") //+ (cloudSession.membernumber > -1 ? " (participant number " + cloudSession.membernumber + ")" : "")
                : lf("stored in cloud") + percentfullstring + lf(", not locally cached")
                : localname  //SEBTODO add marooned scenario here
                ? lf("not stored in cloud, local only")
                : lf("not created yet")
                ) + "\n"
                : "";


            var icon = div("navImg", SVG.getCloudSymbol("black", cloudSession.type(), true));
            var titleelt = (preselected) ? HTML.span("bold", title) : HTML.span("", title);
            var information =
                ((owner === lf("I")) ? "" : lf("owned by ") + owner + "\n")
                + permissions + "\n"
                //+ ((cloudSession.tag[0] === "c" && cloudSession.guidhash[0] === "a") ? ("accessible from other scripts\n") : "")
                + /*(cloudSession.isBroadcastSession() || cloudSession.isShareableSession()?*/ (lf("session id: ") + cloudSession._id + "\n")
                + existence;

            return HTML.mkButtonElt("navItem cloudSession",
                div("navItemInner",
                    icon,
                    div("navContent",
                        div("navName", titleelt),
                        div("navDescription", information))));
        }

        var sessionstatusdiv;
        var sessionretrydiv;

        export function refreshSessionInfo(session: Revisions.ClientSession) {
            if (sessionstatusdiv)
                sessionstatusdiv.setChildren([session.user_get_connectionstatus(true)]);
        }

        export function sessionInfoAsync(rt: Runtime) {

            var session = rt.sessions.getCurrentSession();
            var sessioninfo = CloudData.formatCloudSessionInfo(session.getCloudSession(), false, false, false);
            sessioninfo.style.background = "white";


            if (!sessionstatusdiv)
                sessionstatusdiv = div("wall-dialog-body");

            if (!sessionretrydiv)
                sessionretrydiv = div("wall-dialog-body").withClick((e) => session.user_retry_now());

            this.refreshSessionInfo(session);

            var m = new ModalDialog();
            m.add([
                div("wall-dialog-header", lf("current cloud session")),
                sessioninfo,
                div("wall-dialog-header wall-dialog-extra-space", lf("connection status")),
                sessionstatusdiv,
                sessionretrydiv])
            if (session.isMarooned() || session.isClosed() || session.isFaulted()) {
                m.addOk(lf("discard locally cached data, and try again"), () => {
                    rt.sessions.resetCurrentSession();
                    m.dismiss();
                });
                m.addOk(lf("cancel"));
            }
            else
                m.addOk(lf("ok"));

            var retrytimeindicatorinterval = setInterval(() => {
                var msg: string;
                var mr = session.user_get_missing_rounds();
                if (mr) {
                    msg = lf("%0 remaining", mr);
                }
                var rt = session.user_get_next_connection_attempt();
                if (rt) {
                    var secs = Math.floor((rt - 700 - new Date().getTime()) / 1000);
                    var msg = (secs < 1) ? lf("connection attempt in progress...") :
						lf("next connection attempt in %0 seconds", secs.toString());
                }
                sessionretrydiv.setChildren([msg]);
            }, 50);

            m.onDismiss = () => clearInterval(retrytimeindicatorinterval);
            m.show();
        }

        function mkSimpleBtnConfirm(desc:string, f:() =>void )
        {
            var isRed = false

            var btn = HTML.mkButton(desc, () => {
                if (isRed) f();
                else {
                    isRed = true;
                    btn.style.color = 'red'
                    Util.setTimeout(3000, () => {
                        isRed = false;
                        btn.style.color = '';
                    })
                }
            })

            return btn
        }

        export function managementDialog(rt: Runtime): Promise {
            var p = Cloud.getUserId() ? Promise.as() : Cloud.authenticateAsync(lf("cloud data"));
            return p.thenalways((x) => {
                if (Cloud.getUserId())
                    return sessionDialogAsync(undefined, lf("manage cloud sessions"), false, rt);
            });
        }
        export function scriptSessionsDialog(rt: Runtime): Promise {
            var p = Cloud.getUserId() ? Promise.as() : Cloud.authenticateAsync(lf("cloud data"));
            return p.thenalways((x) => {
                if (Cloud.getUserId()) {
                    var s = rt.sessions.getLastSession();
                    return sessionDialogAsync(s && s.getCloudSession(), lf("select cloud session for this script"), true, rt).then((s) => {
                        if (s)
                            return rt.sessions.connectCurrent(rt.sessions.getCloudSessionDescriptor(s._id, s._title, s._permissions));
                        else
                            return undefined;
                    });
                }
            });
        }

        export function sessionDialogAsync(preselectedsession: CloudSession, title: string, specificscript: boolean, rt:Runtime, rctx: ResumeCtx = undefined): Promise // of CloudSession
        {
            var p = new PromiseInv();
            var sessionmap = {};
            var counter = 0;
            var incorporate = (x: CloudSession) => {
                if (sessionmap.hasOwnProperty(x._id)) {
                    var cur = sessionmap[x._id];
                    ["_title", "localname", "serverinfo", "position", "membernumber", "enable_sync"
                    ].forEach((s) => { if (!cur[s]) cur[s] = x[s]; });
                }
                else {
                    x.position = counter++;
                    sessionmap[x._id] = x;
                }
            };

            if (specificscript) {
                incorporate(CloudSession.fromDescriptor(rt.sessions.getJustMeSessionDescriptor()));
                incorporate(CloudSession.fromDescriptor(rt.sessions.getEveryoneSessionDescriptor()));
            }
            if (preselectedsession)
                incorporate(preselectedsession);

            //SEBTODO do queries in parallel, not sequentially

            var dialog = (includesSessionsOnRevisionServer: boolean) => {
                var sessionarray = [];
                for (var x in sessionmap)
                    if (sessionmap.hasOwnProperty(x))
                        sessionarray.push(sessionmap[x]);
                sessionarray.sort((a, b) => (a.position - b.position));

                var m = new ModalDialog();
                var chosenSession = preselectedsession;
                var btns = sessionarray.map((cloudSession: CloudSession, i: number) => {
                    var deleting = false;

                    var cloudSessionElt = CloudData.formatCloudSessionInfo(cloudSession,
                        preselectedsession && cloudSession.equals(preselectedsession),
                        includesSessionsOnRevisionServer,
                        !specificscript);
                    if (specificscript) {
                        cloudSessionElt.withClick(() => {
                            if (!deleting) {
                                chosenSession = cloudSession;
                                m.dismiss();
                            }
                        });
                    }

                    var inuse = (rt.sessions.getLastSession() && rt.sessions.getLastSession().servername === cloudSession.id());
                    var owned = Cloud.getUserId() === cloudSession.ownerid;
                    var cached = !owned && (cloudSession.isBroadcastSession() || cloudSession.isShareableSession());

                    if (owned || (cached && !inuse)) {

                        var deleteElt = HTML.mkButtonElt("navItem", inuse ? "clear" : cached ? "remove" : "delete");
                        var isRed = false;
                        deleteElt.withClick(() => {
                            if (!isRed)
                            {
                                isRed = true;
                                deleteElt.style.color = 'red'
                                Util.setTimeout(3000, () => {
                                    isRed = false;
                                    deleteElt.style.color = '';
                                })
                                return;
                            }
                            if (!inuse)
                                elt.className += " disabledItem";
                            deleting = ! inuse;
                            deleteDiv.removeAllChildren();
                            deleteDiv.appendChildren(div(null, inuse ? "clearing..." : cached ? "removing..." : "deleting..."));
                            var errorhandler = (e: any) => {
                                deleteDiv.removeAllChildren();
                                deleteDiv.appendChildren(div(null, "" + e)); // TODO: Make sure this is a friendly message; consider logging error
                            };

                            if (inuse) {
                                rt.sessions.getCurrentSession().user_clear_all();
                                Util.setTimeout(800, () => deleteDiv.removeAllChildren());
                                //deleteDiv.appendChildren(div(null, "cleared"));
                            }
                            else {
                                Revisions.deleteSessionAsync(rt.sessions.getCloudSessionDescriptor(cloudSession._id, cloudSession._title, cloudSession._permissions), rt).then(() => {
                                    deleteDiv.removeAllChildren();
                                    deleteDiv.appendChildren(div(null, cached ? "removed" : "deleted"));
                                }, errorhandler).done();
                            }
                        });
                        var deleteDiv = div("floatright", deleteElt);
                        var elt = div(null, deleteDiv, div("floatleft", cloudSessionElt), div("clear"));
                        return elt;
                    } else
                        return cloudSessionElt;
                });

                m.setScroll();
                var existingTitleDiv = div("wall-dialog-header", title);
                m.add([existingTitleDiv]);

                if (specificscript) {

                    var createDiv = div("floatright");
                    var addCreateElt = type => {
                        var createElt = HTML.mkButtonElt("wall-button", type);
                        createElt.withClick(() => {
                            var title = createTitle.textarea.value;
                            if (!title) {
                                createMsgDiv.removeAllChildren();
                                createMsgDiv.appendChildren(div(null, lf("must specify title")));
                                return;
                            }
                            rt.sessions.createCustomSessionAsync(createTitle.textarea.value, type).then(session => {
                                chosenSession = session;
                                m.dismiss();
                            }, e => {
                                    createMsgDiv.removeAllChildren();
                                    createMsgDiv.appendChildren(div(null, "" + e)); // TODO: Make sure this is a friendly message; consider logging error
                                }).done();
                        });
                        createDiv.appendChildren(createElt);
                    };
                    addCreateElt("shareable");
                    addCreateElt("private");
                    addCreateElt("broadcast");

                    var connectToShareableElt = HTML.mkButtonElt("wall-button", lf("connect"));
                    connectToShareableElt.withClick(() => {
                        var cs = new CloudSession();
                        cs._id = sharableId.textarea.value;
                        cs._title = ""; // TODO: what about title?
                        cs._permissions = "";
                        if (cs.validate() && cs.tag[0] === "c") {
                            chosenSession = cs;
                            m.dismiss();
                        }
                        else {
                            sharableMsgDiv.removeAllChildren();
                            sharableMsgDiv.appendChildren(div(null, "invalid id"));
                        }
                    });
                    var connectToShareableDiv = div("floatright", connectToShareableElt);


                    var createTitle = HTML.mkAutoExpandingTextArea();
                    createTitle.textarea.placeholder = "title of new session";
                    var createMsgDiv = div("wall-dialog-body");


                    var sharableId = HTML.mkAutoExpandingTextArea();
                    sharableId.textarea.placeholder = "shareable session id";
                    var sharableMsgDiv = div("wall-dialog-body");


                    var createbutton = <HTMLButtonElement> HTML.mkButtonElt("wall-button", lf("create"));
                    var connectbutton = <HTMLButtonElement> HTML.mkButtonElt("wall-button", lf("enter code"));
                    var cancelbutton = <HTMLButtonElement> HTML.mkButtonElt("wall-button", lf("cancel"));

                    var innested = false;

                    var setCreatePaneDisplay = (show: boolean) => {
                        var d = show ? "" : "none";
                        createTitle.div.style.display = d;
                        createDiv.style.display = d;
                        createMsgDiv.style.display = d;
                        createbutton.style.display = (show) ? "none" : "";
                    }
                    var setConnectPaneDisplay = (show: boolean) => {
                        var d = show ? "" : "none";
                        sharableId.div.style.display = d;
                        connectToShareableDiv.style.display = d;
                        sharableMsgDiv.style.display = d;
                        connectbutton.style.display = (show) ? "none" : "";
                    }
                   var setButtonsDisplay = (show: boolean) => {
                        var d = show ? "" : "none";
                        createbutton.style.display = d;
                        connectbutton.style.display = d;
                    }
                    createbutton.withClick(() => {
                        existingTitleDiv.setChildren(["create a new session"]);
                        setCreatePaneDisplay(true);
                        setConnectPaneDisplay(false);
                        m.showorhidelist(false);
                        setButtonsDisplay(false);
                        innested = true;
                    });
                    connectbutton.withClick(() => {
                        existingTitleDiv.setChildren(["enter a session id"]);
                        setCreatePaneDisplay(false);
                        setConnectPaneDisplay(true);
                        m.showorhidelist(false);
                        setButtonsDisplay(false);
                        innested = true;

                    });
                    cancelbutton.withClick(() => {
                        if (innested) {
                            setCreatePaneDisplay(false);
                            setConnectPaneDisplay(false);
                            m.showorhidelist(true);
                            existingTitleDiv.setChildren([title]);
                            setButtonsDisplay(true);
                            innested = false;
                        }
                        else
                            m.dismiss();
                    });

                    setCreatePaneDisplay(false);
                    setConnectPaneDisplay(false);
                    m.showorhidelist(true);

                    m.add([
                        createTitle.div,
                        createDiv,
                        div("clear"),
                        createMsgDiv,
                        sharableId.div,
                        connectToShareableDiv,
                        div("clear"),
                        sharableMsgDiv]);
                }


                var options = {
                    //dontStretchDown: false,
                    searchHint: 'search sessions',
                    noBackground: true,
                    adjustListSize: true,
                    custombuttons: [createbutton, connectbutton, cancelbutton]
                };

                m.choose(btns, options);


                if (!includesSessionsOnRevisionServer) {
                    m.add([div("wall-dialog-body", lf("server unreachable; are you offline?"))]);
                }
                m.onDismiss = () => {
                    p.success(chosenSession);
                };
            };


            HTML.showProgressNotification(lf("Loading sessions..."));
            Revisions.queryCachedSessionsAsync(specificscript, rt).then(sessionsInCache => {
                sessionsInCache.forEach(s => incorporate(s));
            return Revisions.queryMySessionsOnRevisionServerAsync(rt, specificscript).then(sessionsOnRevisionServer => {
                    sessionsOnRevisionServer.forEach(s => incorporate(s));
                    return true;
                }, e => false).then(includesSessionsOnRevisionServer => dialog(includesSessionsOnRevisionServer))
            }).done();


            return p;
        }



        function askSwitchAccessAsync(previoussession: Revisions.ClientSession, session: CloudSession, owner: string, r: ResumeCtx, secondchance: boolean) : Promise {
            // don't ask for private sessions
            if (session.isPrivateSession() || session.ownerid === r.rt.sessions.getUserId()) return Promise.as(session);

            var p = r.rt.host.askSourceAccessAsync(lf("shared cloud data owned by ") + owner,
                lf("and share data in the cloud. ") + owner + lf(" administers the data, and can share it with other users or delete it."), secondchance);

            return p.then((allow) => {
                if (!allow) {
                    var mdp = new PromiseInv();
                    ModalDialog.askMany(lf("Fall-back session"),
                        lf("Because you have indicated that this script should not participate in cloud sessions owned by ") + owner + (", we are using a private just-me session instead."),
                        {
                            ok: () => mdp.success(previoussession.getCloudSession()),
                            reconsider: () => askSwitchAccessAsync(previoussession, session, owner, r, true).then((s) => mdp.success(s))
                        });
                    return mdp;
                }
                return Promise.as(session);
            });
        }

        //? Connect to the given session. The user may be asked to confirm.
        //@ [session].deflExpr('cloud_data->everyone_session') uiAsync
        //@ writesMutable
        export function switch_to_session(session: CloudSession, r: ResumeCtx) {

            var rt = r.rt;

            if (session.ownerid !== rt.sessions.getUserId() && session.tag === "pr")
                Util.userError(lf("cannot connect to a just-me session of another user"));
            if (session.isNodeSession())
                Util.userError(lf("cannot connect to a node session"));

            var ls = rt.sessions.getCurrentSession();
            ls.user_yield();
            if (session._id === ls.servername) {
                r.resumeVal(undefined);
            }
            else
            {
                var p = Promise.as();
                var ownerinfo;
                p = p.then(() => RT.User.getJsonAsync(session.ownerid).then((user) => ownerinfo = user, (e) => ownerinfo = undefined));
                p = p.then(() => {
                    var ownername = ownerinfo ? (ownerinfo.name + " (/" + session.ownerid + ")") : (lf("user /") + session.ownerid);
                    return askSwitchAccessAsync(ls, session, ownername, r, false);
                    });
                p.then(s => {
                    return r.rt.sessions.connectCurrent(r.rt.sessions.getCloudSessionDescriptor(s._id, s._title, s._permissions)).then(() => r.resumeVal(undefined));
                }).done();
            }
        }


        //? Asks the user to choose a session to switch to
        //@ uiAsync
        //@ writesMutable
        export function switch_sessions(r: ResumeCtx) {
            var session = r.rt.sessions.getCurrentSession();
            session.user_yield();
            var p = sessionDialogAsync(session.getCloudSession(), lf("choose a cloud session"), true, r.rt, r);
            p.then((s:CloudSession) => {
                    r.rt.sessions.connectCurrent(r.rt.sessions.getCloudSessionDescriptor(s._id, s._title, s._permissions)).then(() => r.resumeVal(undefined));
            }).done();
        }
    }
}
