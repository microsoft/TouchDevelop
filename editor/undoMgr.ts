///<reference path='refs.ts'/>

module TDev {

    export class UndoState {
        public savedApp: IndexedString[];
        public loc: CodeLocation;

        public parse(): AST.App {
            return AST.Parser.parseScript(
                this.savedApp.map((e) => e.s).join("\n")
                );
        }

        public toJson() {
            var usedEntries: any = {}
            return {
                savedApp:
                this.savedApp.map((e: IndexedString) => {
                        if (usedEntries[e.idx + ""]) {
                            return { idx: e.idx, s: null }
                        } else {
                            usedEntries[e.idx + ""] = 1;
                            return e;
                        }
                    }),
                loc: !this.loc ? null : this.loc.toJson()
            };
        }

        static fromJson(par: UndoMgr, j: any) {
            var r = new UndoState();
            var entries: any = {}
            r.savedApp =
            j.savedApp.map((e: any) => {
                    if (typeof e == "string")
                        return { idx: par.nextId(), s: e }
                    else if (e.s !== null) {
                        var ee = { idx: par.nextId(), s: e.s }
                        entries[e.idx + ""] = ee;
                        return ee;
                    } else return entries[e.idx + ""];
                });
            r.loc = CodeLocation.fromJson(j.loc);
            return r;
        }

        static eq(l: UndoState, r: UndoState): boolean {
            var app1 = l.savedApp;
            var app2 = r.savedApp;
            if (app1.length != app2.length) return false;
            for (var i = 0; i < app1.length; ++i)
                if (app1[i].idx != app2[i].idx) return false;
            return true;
        }
    }

    export class UndoMgr {
        public sent = [];
        private refreshUndoState = undefined;
        private refreshUndoScript = undefined;
        //private refreshLock = false;
        private maxUndo = 20;
        private mainStates: UndoState[] = [];
        private blockPush = 0;
        private calcStates = [];
        private currentIdx = 1;
        private logMsg = "";
        private fakeAppDecl =
          {
            serialize: () => Script.serializeFinal(),
            nodeType: () => "fakeAppDecl",
            getName: () => "app"
          }

        public currentId() { return this.currentIdx; }
        public nextId() { return this.currentIdx++; }

        private updateCache(d: AST.Decl) {
            var cache = d.cachedSerialized;
            if (!cache)
                cache = d.cachedSerialized = { idx: 0, s: null }

            if (cache.idx > 0) return false;

            var newS: string;

            if (d instanceof AST.App) newS = (<AST.App>d).serializeMeta();
            else newS = d.serialize()

            if (cache.idx < 0 && newS === cache.s) {
                cache.idx = -cache.idx;
                this.logMsg += d.getName() + ":hit ";
                return false;
            } else {
                cache.s = newS;
                cache.idx = this.nextId();
                this.logMsg += d.getName() + ":upd ";
                return true;
            }
        }

        public checkCaches() {
            var err = ""

            var check = (d: AST.Decl) => {
                var cache = d.cachedSerialized;
                if (!cache || cache.idx < 0) return;

                var newS: string;

                if (d instanceof AST.App) newS = (<AST.App>d).serializeMeta();
                else newS = d.serialize()

                if (newS !== cache.s) {
                    err += " [mismatch: " + d.nodeType() + " " + d.getName() + "]"
                    debugger;
                }
            }

            check(Script);
            Script.things.forEach(check);
            // This one is always updated; no need to check
            // check(<AST.Decl>this.fakeAppDecl);

            return err;
        }

        private createSavedApp() {
            var res = []
            var updateNum = 0;

            var add = (d: AST.Decl) => {
                if (this.updateCache(d)) updateNum++;
                var c = d.cachedSerialized;
                res.push({ idx: c.idx, s: c.s });
            }

            add(Script);
            Script.things.forEach(add);
            var appDecl = <AST.Decl>this.fakeAppDecl;
            // always update this
            if (appDecl.cachedSerialized && appDecl.cachedSerialized.idx > 0)
                appDecl.cachedSerialized.idx = -appDecl.cachedSerialized.idx;
            add(appDecl);

            Ticker.dbg("UndoMgr.createSavedApp " + this.logMsg);
            this.logMsg = "";

            return res;
        }

        public getScriptSource() {
            if (this.mainStates.length == 0) return "";
            var u = this.mainStates.peek();
            return u.savedApp.map((e) => e.s).join("").replace(/\n+/g, "\n");
        }

        private recordAst() {
            if (!Collab.AstSession) {
                return;
            }
            if (!Collab.ready) {
                return;
            }

            if (Script.things.length > 0) {
                var ast = Script.serialize(); // TODO XXX - not efficient
                this.last_editor_version = Collab.recordAst(ast);
            } else {
                // prevent deletion of last thing
                this.pullIntoEditor(true);
            }
        }

          /* private pushUndoToLog(ast1: string, ast2: string) {

            if (!Collab.currentCloudAst) {
                return;
            }

            Collab.pushUndoToLog(ast1, ast2);
        }



        public refreshFromLog(): Promise {

            //if (this.refreshLock)
            //    return Promise.as();

            var isUndo = !!this.refreshUndoState;
            if (isUndo) {
                //console.log("UNDO 1 -----------");
                //console.log(UndoScript);
                //console.log("UNDO 2 -----------");
                //console.log(this.refreshUndoScript);
                //console.log("-----------");
                //this.pushToLog(UndoScript, this.refreshUndoScript);
                var lastS = this.mainStates.peek();
                var last = lastS ? lastS.savedApp.map((e) => e.s).join("\n") : undefined;
                //this.refreshLock = true;
                this.pushUndoToLog(this.refreshUndoScript, (last ? last : this.refreshUndoScript));
            }
            else {
                //this.refreshLock = true;
                this.pushToLog(true);
            }

            return this.pullIntoEditor(isUndo);
        }
        */

        private previouspull: Promise = Promise.as();

        private last_editor_version: any = undefined;


        public pullIntoEditor(force: boolean = false): Promise {

            return this.previouspull = this.previouspull.thenalways(() => {

                if (!Collab.AstSession) {
                    return;
                }

                if (this.last_editor_version && !force && Collab.astEquals(Collab.currentCloudAst, this.last_editor_version)) {
                    //this.refreshLock = false;
                    return Promise.as();
                }


                // TODO XXX - is this efficient?
                //if (Collab.currentCloudAst[1] == Script.serialize()) {
                //this.refreshLock = false;
                //    return Promise.as();
                //}

                var newast = Collab.currentCloudAst;

                Util.log(">>> pullIntoEditor " + Collab.astdesc(newast));

                //this.refreshLock = false; // TODO XXX - is it okay to unlock here?

                return TheEditor.loadScriptTextAsync(ScriptEditorWorldInfo, newast[1], TheEditor.serializeState(), false).then(
                    () => {
                        // if (!isUndo) {
                        TheEditor.renderDefaultDecl(true, true);
                        TheEditor.queueNavRefresh();

                        this.last_editor_version = newast;

                        //  } else {
                        //     if (!this.refreshUndoState.loc || // may happen when replaying a tutorial
                        //         !TheEditor.loadLocation(this.refreshUndoState.loc.rebind(), false))
                        //         TheEditor.renderDefaultDecl();
                        //     TheEditor.undoLoaded();
                        //     this.refreshUndoState = null;
                        //      this.refreshUndoScript = null;
                        //  }
                    });
            });
        }

        public pushMainUndoState(disableLog= false) {
            //Util.log(">>> pushMainUndoState()");
            if (!disableLog) {
                this.recordAst();
            }

            Ticker.dbg("UndoMgr.pushMain");
            if (this.blockPush > 0) return;

            try {
                this.blockPush++;

                var u = new UndoState();
                u.savedApp = this.createSavedApp();

                u.loc = TheEditor.currentLocation();
                var prev = this.mainStates.peek();
                if (!!prev && UndoState.eq(prev, u)) {
                    if (!!u.loc) {
                        prev.loc = u.loc;
                        this.observeChange();
                    }
                    return;
                }

                if (this.mainStates.length > this.maxUndo) {
                    for (var i = 1; i < this.mainStates.length; ++i)
                        this.mainStates[i - 1] = this.mainStates[i];
                    this.mainStates[i - 1] = u;
                } else {
                    this.mainStates.push(u);
                }
                this.observeChange();
                // TODO XXX - we disable autosave for the collaborative editing demo
                if (!TDev.Collab.enableUndo) TheEditor.scheduleSaveToCloudAsync(true).done();
            } finally {
                this.blockPush--;
            }
        }

        public applyMainUndoStateAsync(u: UndoState) {
            this.blockPush++;
            try {
                return this.reloadUndoStateAsync(u);
            } finally {
                this.blockPush--;
            }
        }

        public popMainUndoStateAsync() {
            if (this.mainStates.length == 0) return Promise.as();
            this.pushMainUndoState(true);
            this.blockPush++;
            try {
                this.mainStates.pop(); // pop the original state
                var u = this.mainStates.pop();
                return this.reloadUndoStateAsync(u);
            } finally {
                this.blockPush--;
            }
        }

        private reloadUndoStateAsync(u: UndoState) {
            if (TDev.Collab.enableUndo && !!this.refreshUndoState) return Promise.as(); // nothing
            if (!u || !u.savedApp) return Promise.as(); // nothing to do
            var script = u.savedApp.map((e) => e.s).join("\n");
            Util.assert(script && script.charAt(0) != '{');
            this.refreshUndoState = u;
            this.refreshUndoScript = script;
            //if (TDev.Collab.enableUndo) return this.refreshFromLog();
            return TheEditor.loadScriptTextAsync(ScriptEditorWorldInfo, script, TheEditor.serializeState()).then(() => {
                if (!u.loc || // may happen when replaying a tutorial
                    !TheEditor.loadLocation(u.loc.rebind()))
                    TheEditor.renderDefaultDecl();
                TheEditor.undoLoaded();
            });
        }

        public clear() {
            this.mainStates = [];
            this.calcStates = [];
            this.onStateChange = null;
        }

        public toJson() {
            return {
                states: this.mainStates.map((s: UndoState) => s.toJson()),
                calcStates: this.calcStates
            };
        }

        private load(j: any) {
            this.mainStates = (j.states || []).map((j: any) => UndoState.fromJson(this, j));
            this.calcStates = j.calcStates || [];
        }


        public clearCalc() {
            this.calcStates = [];
        }

        public pushCalcState(s: any) {
            this.recordAst();
            this.calcStates.push(s);
        }

        public peekCalcState() { return this.calcStates.peek(); }
        public popCalcState() { return this.calcStates.pop(); }

        public setStateChange(onStateChange: (state: UndoState) => void) {
            this.onStateChange = onStateChange;
            if (!!this.onStateChange) {
                if (this.mainStates.length == 0) this.pushMainUndoState();
                this.observeChange();
            }
        }
        private onStateChange: (state: UndoState) => void = null;
        private observeChange() {
            TheEditor.live.poke();
            if (!!this.onStateChange && this.mainStates.length > 0) {
                var s = this.mainStates.peek();
                this.onStateChange(s);
            }
        }
    }
}
