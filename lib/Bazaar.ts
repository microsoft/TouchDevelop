///<reference path='refs.ts'/>
module TDev.RT {
    //? Browse and review scripts from the bazaar
    //@ skill(3)
    export module Bazaar
    {
        //? Returns a user object for a specified user id
        //@ cachedAsync returns(User)
        export function user_of(id: string, r: ResumeCtx)
        {
            User.getJsonAsync(id).done(user =>
                r.resumeVal((user && user.kind == "user") ? User.mk(id) : undefined),
                e => r.resumeVal(undefined));
        }

        export function userIdAsync(rt:Runtime) : Promise { // : string
            if (!rt.requiresAuth()) return Promise.as(rt.getUserId())

            return Cloud.authenticateAsync(lf("user identification"))
                .then(() => Cloud.getUserId());
        }

        //? Returns the user object of the current user
        //@ returns(User) authAsync
        export function current_user(r: ResumeCtx)
        {
            userIdAsync(r.rt).done(userId => r.resumeVal(userId ? User.mk(userId) : undefined));
        }

        export function cachedScore(rt: Runtime, score?: number): number {
            var currentScore = rt.datas["this"]["leaderboard_score"] || 0;
            if (score && score > currentScore) {
                rt.datas["this"]["leaderboard_score"] = score;
                currentScore = score;
            }
            return currentScore;
        }

        //? Gets the current score for the current script
        //@ async returns(number)
        //@ tandre hasPauseContinue
        //@ readsMutable
        export function leaderboard_score(r: ResumeCtx) // : number
        {
            var rt = r.rt;
            var currentScore = cachedScore(rt);
            var localScore = () => r.resumeVal(currentScore);

            if (!rt.currentScriptId || !Cloud.isOnline()) {
                localScore();
            } else {
                Cloud.authenticateAsync(lf("leaderboard"))
                     .done((authenticated: boolean) => {
                         if (authenticated) {
                             var url = Cloud.getPrivateApiUrl('me/leaderboardscored/' + rt.currentScriptId);
                             var request = WebRequest.mk(url, undefined);
                             request.sendAsync()
                                 .done((response: WebResponse) => {
                                     var curr = 0;
                                     var json = response.content_as_json();
                                     if (json)
                                         curr = json.number('score');
                                     // max with local score to avoid race in cloud
                                     r.resumeVal(cachedScore(rt, Math.max(currentScore, curr || 0)));
                                 });
                         } else { localScore(); }
                     });
             }
        }

        export function postScoreToOfficeMix(score : number, scriptId: string) {
            // in office mix, always send a score message
            if (Browser.webRunner || Browser.webAppImplicit) {
                var msg = JsonObject.wrap({
                    kind: "leaderboardScore__Send",
                    data: { score: score, scriptId: scriptId }
                });
                Web.post_message_to_parent(Cloud.config.rootUrl, msg, null);
                Web.post_message_to_parent("http://localhost:15669", msg, null);
            }
        }

        //? Posts the current game score to the script leaderboard
        //@ async
        //@ writesMutable
        export function post_leaderboard_score(score: number, r: ResumeCtx) //: void
        {
            var rt = r.rt;
            var currentScore = cachedScore(rt, score);
            if (!rt.currentScriptId || !Cloud.isOnline()) {
                r.resume();
            } else {
                Bazaar.postScoreToOfficeMix(score, rt.currentScriptId);
                Cloud.authenticateAsync(lf("leaderboard"))
                    .done((authenticated: boolean) => {
                        if (authenticated) {
                            var url = Cloud.getPrivateApiUrl(rt.currentScriptId + '/leaderboardscores');
                            var request = WebRequest.mk(url, undefined);
                            request.set_method('post');
                            request.set_content_as_json(JsonObject.mk(JSON.stringify({ kind: "leaderboardscore", score: score || 0, userplatform: Browser.platformCaps }), Util.log));
                            request.sendAsync()
                                .done((response: WebResponse) => {
                                    var json = response.content_as_json();
                                    if (json)
                                        cachedScore(rt, json.number('score'))
                                    r.resume();
                                });
                        }
                    }, e => {
                        // something wrong happened, keep moving
                        r.resume();
                    });
            }
        }

        export function loadLeaderboardItemsAsync(striptId : string): Promise { // HTMLElement
            if (!striptId || !Cloud.isOnline()) return Promise.as([]);
            return Cloud.getPublicApiAsync(striptId + '/leaderboardscores?count=250')
                .then(leaderboards => {
                    return leaderboards.items.map(item => {
                        var userid = item.userid;
                        var username = item.username;
                        var userscore = item.score.toString();
                        var time = Util.timeSince(item.time);
                        var imgDiv = div('leaderboard-img');
                        if (item.userhaspicture)
                            imgDiv.style.backgroundImage = HTML.cssImage(Cloud.getPublicApiUrl(userid + "/picture?type=normal"))
                        else
                            imgDiv.innerHTML = TDev.Util.svgGravatar(userid);
                        var scoreDiv = div('item leaderboard-item', [
                            imgDiv,
                            div('leaderboards-score', userscore),
                            div('leaderboard-center', [
                                div('item-title', username),
                                div('item-subtle', time)
                            ])
                        ]);
                        return scoreDiv;
                    });
                }, e => {
                    return [];
                });
        }

        //? Posts the current game leaderboard to the wall
        //@ cachedAsync
        export function post_leaderboard_to_wall(r: ResumeCtx) //: void
        {
            // TODO this should be cached for page display
            var rt = r.rt;
            if (!rt.currentScriptId) {
                var curr = cachedScore(rt).toString();
                var imgDiv = div('leaderboard-img');
                imgDiv.innerHTML = TDev.Util.svgGravatar('me');
                var leaderboardDiv = div('item leaderboard-item', [
                    imgDiv,
                    div('leaderboards-score', curr),
                    div('leaderboard-center', [
                        div('item-title', lf("Me")),
                        div('item-subtle', lf("Publish your script to get a leaderboard available for all your users.")),
                    ])
                ]);
                r.rt.postBoxedHtml(leaderboardDiv, r.rt.current.pc);
                r.resume();
            } else if (!Cloud.isOnline()) {
                var curr = cachedScore(rt).toString();
                var imgDiv = div('leaderboard-img');
                imgDiv.innerHTML = TDev.Util.svgGravatar('me');
                var leaderboardDiv = div('item leaderboard-item', [
                    imgDiv,
                    div('leaderboards-score', curr),
                    div('leaderboard-center', [
                        div('item-title', lf("Me")),
                        div('item-subtle', lf("Please connect to internet to load the leaderboards.")),
                    ])
                ]);
                r.rt.postBoxedHtml(leaderboardDiv, r.rt.current.pc);
                r.resume();
            } else {
                r.progress(lf("Loading leaderboards..."));
                var leaderboardDiv = div('');
                loadLeaderboardItemsAsync(rt.currentScriptId).done(els => {
                    leaderboardDiv.setChildren(els);
                    rt.postBoxedHtml(leaderboardDiv, r.rt.current.pc);
                    r.resume();
                }, e => {
                    rt.postBoxedText(lf("Oops, could not get the leaderboards. Please check your internet connection."), r.rt.current.pc);
                    r.resume();
                });
            }
        }

        //? three-way merge script texts. Debug only: for testing.
        //@ dbgOnly
        export function merge3(O: string, A: string, B: string): string {

            var t1 = (<any>TDev).AST.Parser.parseScript(O);
            var t2 = (<any>TDev).AST.Parser.parseScript(A);
            var t3 = (<any>TDev).AST.Parser.parseScript(B);

            (<any>TDev).AST.TypeChecker.tcApp(t1);
            (<any>TDev).AST.TypeChecker.tcApp(t2);
            (<any>TDev).AST.TypeChecker.tcApp(t3);

            (<any>TDev).TheEditor.initIds(t1);
            (<any>TDev).TheEditor.initIds(t2);
            (<any>TDev).TheEditor.initIds(t3);

            var merged = (<any>TDev).AST.Merge.merge3(t1, t2, t3);

            return merged.serialize();
        }


        //? Launches the bazaar.
        //@ obsolete
        export function open(): void
        {
            // obsolete, does nothing
        }

        //? Opens the review page for the current script
        //@ obsolete
        export function open_review(): void
        {
            // obsolete, does nothing
        }

        //? Opens the leaderboard for the current script
        //@ obsolete
        export function open_leaderboard(r : ResumeCtx): void
        {
            post_leaderboard_to_wall(r);
        }

        //? Returns an identifier of either the top-level script or the current library
        //@ [which].deflStrings("top", "current")
        export function script_id(which:string, s:IStackFrame) : string
        {
            if (which == "top") return s.libs.topScriptId;
            if (which == "current") return s.libs.scriptId;
            return undefined;
        }

        //? Asks the user to pick a script and return its identifier
        //@ [mode].deflStrings("read", "write", "read-write")
        //@ returns(string) uiAsync
        export function pick_script(mode:string, message:string, r: ResumeCtx)
        {
            r.rt.host.pickScriptAsync(mode, message).done((id) => {
                r.resumeVal(id);
            })
        }

        //? Saves given Abstract Syntax Tree as a script
        //@ uiAsync
        export function save_ast(id:string, script:JsonObject, r: ResumeCtx)
        {
            r.rt.host.saveAstAsync(id, script.value()).done((id) => {
                r.resume()
            })
        }

        //? Returns the Abstract Syntax Tree JSON object for specified script
        //@ [id].deflExpr('bazaar->script_id("current")')
        //@ returns(JsonObject) uiAsync
        export function ast_of(id:string, r: ResumeCtx)
        {
            r.rt.host.astOfAsync(id).done((j) => {
                if (!j) r.resumeVal(undefined);
                else r.resumeVal(JsonObject.wrap(j));
            })
        }

        // returns the app store id if compiled
        export var storeidAsync = (): Promise => { // of string
            var host : any = (<any>window).touchDevelopHost;
            if (host) {
                Util.log("using touchdevelop host");
                var id = host.storeid()||"";
                Util.log("storeid: " + id);
                return Promise.as(id);
            }
            return Promise.as("");
        };

    }
}
