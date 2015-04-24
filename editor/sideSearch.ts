///<reference path='refs.ts'/>

module TDev
{
    export class SearchTab
        extends SideTab
    {
        constructor() {
            super()
        }
        public icon() { return "svg:search,black"; }
        public name() { return "results"; }
        public keyShortcut() { return "Ctrl-F"; }
        private lastSearchValue = "";
        private lastHistoryVersion = 0;
        private lastSelectedIdx = -1;
        private lastEntryCount = -1;
        private wasSelected:any = {};
        private locations:CodeLocation[] = [];
        private version = 1;

        public phoneFullScreen() { return true }

        public selectFirst()
        {
            var entry = this.htmlEntries[0];
            if (entry)
                KeyboardMgr.triggerClick(entry);
        }

        public select(ix: number) {
            var entry = this.htmlEntries[ix];
            if (entry)
                KeyboardMgr.triggerClick(entry);
        }

        public getTick() { return Ticks.sideSearch; }

        public navigatedTo()
        {
            super.navigatedTo();
            this.navRefreshPending = true; // we want to always refresh
        }

        public refreshCore()
        {
            this.setupList();
            this.visualRoot.setChildren([this.scrollRoot]);
        }

        public init(e:Editor)
        {
            super.init(e);
        }

        public searchKey()
        {
            if (this.lastSearchValue != TheEditor.searchBox.value) {
                this.lastSearchValue = TheEditor.searchBox.value;
                if (!this.lastSearchValue) {
                    TheEditor.backToScript();
                    return;
                }
                this.setupList();
                this.highlightCarret();
            }
        }

        private setupList()
        {
            var terms:string[] = [];
            var refNames:string[] = [];
            var refOp = false;
            var bangOp = false;
            var specialCommand = "";

            TheEditor.setupSearchButton()

            AST.Lexer.tokenize(this.lastSearchValue).forEach((t:AST.LexToken) => {
                var add = (tt) => {
                    if (!!tt) {
                        if (refOp)
                            refNames.push(tt);
                        else if (bangOp)
                            specialCommand = tt;
                        else
                            terms.push(tt.toLowerCase());
                    }
                    refOp = false;
                    bangOp = false;
                }
                switch (t.category) {
                case AST.TokenType.Op:
                    if (t.data == "?")
                        refOp = true;
                    else if (t.data == ":")
                        bangOp = true;
                    else if (/^[a-zA-Z]/.test(t.data))
                        add(t.data);
                    break;
                case AST.TokenType.Id:
                case AST.TokenType.String:
                case AST.TokenType.Keyword:
                    add(t.data)
                    break;
                }
            });

            var fullName = terms.join("");
            var entries:CodeLocation[] = [];
            var stmtFilter = (s:AST.Stmt) => true;
            var nameOverride : (s:AST.Stmt) => string = null;

            var refs:AST.AstNode[] = refNames.map((t:string) => {
                var m = /^(.*)->(.*)$/.exec(t)
                var fieldName = null
                if (m) {
                    t = m[1]
                    fieldName = m[2]
                }
                var th:AST.AstNode = Script.things.filter((th:AST.Decl) => th.getName() == t)[0]
                if (fieldName == null)
                    return th;
                if (th instanceof AST.RecordDef) {
                    th = (<AST.RecordDef>th).getFields().filter(e => e.getName() == fieldName)[0];
                }
                return th
            });

            if (refs.length > 0) {
                if (refs.some((t) => !t)) {
                    this.setChildren(this.htmlEntries = []);
                    return;
                }
                // needed to fixup property refs
                AST.TypeChecker.tcApp(Script);
            }

            var maxEntries = 50;

            var addResult = (decl:AST.Decl) =>
            {
                var codeSearch = (stmt:AST.Stmt) =>
                {
                    if (stmt instanceof AST.Block) {
                        var b = <AST.Block>stmt;
                        b.stmts.forEach(codeSearch);
                    } else {
                        var score = 0

                        if (stmtFilter(stmt)) {
                            var fs = stmt.forSearch();

                            if (stmt.getError()) fs += " " + stmt.getError()
                            if (stmt.calcNode() && stmt.calcNode().hint) fs += " " + stmt.calcNode().hint
                            if (stmt.annotations && stmt.annotations.length > 0) fs += " " + stmt.annotations.map(a => a.message).join(" ")

                            score = IntelliItem.matchString(fs, terms, 0.1, 0.1, 0.01);

                            if (score > 0 && refs.length > 0) {
                                refs.forEach((rf:AST.Decl) => {
                                    if (score > 0 && !stmt.matches(rf))
                                        score = 0;
                                });
                            }
                        }

                        if (score > 0) {
                            var loc = new CodeLocation(decl);
                            var currAct = TheEditor.lastDecl == decl;
                            if (currAct)
                                loc.isCurrAction = true;
                            else
                                score *= 0.01;
                            loc.score = score;
                            loc.stmt = stmt;
                            loc.isSearchResult = true;
                            if (nameOverride)
                                loc.nameOverride = nameOverride(stmt);
                            entries.push(loc);
                        }

                        if (stmt instanceof AST.ExprStmt) {
                            if (stmt instanceof AST.InlineActions)
                                codeSearch((<AST.InlineActions>stmt).actions)
                        } else {
                            var ch = stmt.children();
                            for (var i = 0; i < ch.length; ++i)
                                if (ch[i] instanceof AST.Stmt) codeSearch(<AST.Stmt>ch[i]);
                        }
                    }
                }

                {
                    var prop = decl.propertyForSearch();
                    var score = 0;
                    if (!prop) {
                        var it = new IntelliItem();
                        it.decl = decl;
                        score = it.match(terms, fullName);
                    } else
                        score = IntelliItem.matchProp(prop, terms, fullName);

                    if (refs.length > 0) {
                        refs.forEach((rf:AST.Decl) => {
                            if (score > 0 && !decl.matches(rf))
                                score = 0;
                        });
                    }

                    if (!stmtFilter(decl))
                        score = 0;

                    if (score > 0) {
                        var loc = new CodeLocation(decl);
                        loc.isSearchResult = true;
                        loc.score = score;
                        entries.push(loc);
                    }
                }

                if (decl instanceof AST.App) return

                decl.children().forEach(ch => {
                    if (ch instanceof AST.Stmt)
                        codeSearch(<AST.Stmt>ch)
                })
            }

            specialCommand = specialCommand.toLowerCase()

            if (!specialCommand && refs.length == 0) {
                var stkM = /^StK([a-zA-Z0-9]+)$/.exec(terms[0])
                if (stkM && stkM[1].length % 8 == 0) {
                    var frames = AST.decompressStack(stkM[1])
                    if (frames.length > 0) {
                        AST.Compiler.annotateWithIds(Script)
                        TheEditor.overrideStackTrace(frames)
                        specialCommand = "stack"
                        terms.shift()
                    } else {
                        HTML.showProgressNotification(lf("Stack trace not understood."))
                    }
                }
            }

            function locMatches(loc:CodeLocation, doScore = false) {
                if (terms.length > 0) {
                    var str = loc.decl.getName() + " ";
                    if (loc.stmt) str += loc.stmt.forSearch();
                    var score = IntelliItem.matchString(str, terms, 0.1, 0.1, 0.01);
                    if (score <= 0) return false;
                    if (doScore) loc.score = score;
                }
                return true;
            }

            if (specialCommand == "stack" || specialCommand == "s") {
                var stack = TheEditor.getStackTrace()
                stack.forEach((s:IStackFrame, i:number) => {
                    var lib = s.d ? s.d.libName : null
                    var loc = CodeLocation.fromNodeId(s.pc, lib)
                    if (!loc) {
                        var decl = Script.things.filter((d) => d.getName() == s.name)[0];
                        if (!decl) return;
                        loc = new CodeLocation(decl);
                        loc.isSearchResult = true;
                    }
                    if (!locMatches(loc)) return;

                    loc.score = 1/i; // keep the order
                    entries.push(loc)
                })
            } else if (specialCommand == "recent" || specialCommand == "r") {
                this.locations.forEach((loc, i) => {
                    loc.score = 1/i;
                    if (!locMatches(loc, true)) return;
                    loc.isSearchResult = true;
                    entries.push(loc);
                })
            } else {
                if (specialCommand == "e" || specialCommand == "errors")
                    nameOverride = (s) => s.getError();
                else if (specialCommand == "h" || specialCommand == "hints")
                    nameOverride = (s) => s.calcNode() ? s.calcNode().hint : null;
                else if (specialCommand == "p" || specialCommand == "plugin")
                    nameOverride = (s) => s.annotations && s.annotations[0] ? s.annotations[0].message : null
                else if (specialCommand == "m" || specialCommand == "message")
                    nameOverride = (s) => s.getError()
                        || (s.calcNode() ? s.calcNode().hint : null)
                        || (s.annotations && s.annotations[0] ? s.annotations[0].message : null);

                if (nameOverride)
                    stmtFilter = (s) => !!nameOverride(s)

                addResult(Script);
                Script.orderedThings().forEach(addResult)
            }

            if (this.lastEntryCount != entries.length) {
                this.lastSelectedIdx = -1;
                this.wasSelected = {};
            }
            this.lastEntryCount = entries.length;

            var cmpScore = (a:CodeLocation, b:CodeLocation) => b.score - a.score;
            entries.stableSortObjs(cmpScore);

            var hasMore = false;
            if (entries.length > maxEntries) {
                entries = entries.slice(0, maxEntries);
                hasMore = true;
            }

            var items:HTMLElement[] = [];
            var allTerms = terms.concat(refNames);

            entries.forEach((e:CodeLocation, idx:number) => {
                var b = e.mkBox();
                if (allTerms.length > 0)
                    Util.highlightWords(b, allTerms);
                if (this.lastSelectedIdx == idx && this.version == this.lastHistoryVersion) {
                    b.setFlag("selected", true);
                    b.setFlag("was-selected", true);
                }
                else if (this.wasSelected[idx])
                    b.setFlag("was-selected", true);
                b.withClick(() => {
                    if (e.stmt)
                        tick(Ticks.sideSearchGoToStmt);
                    else
                        tick(Ticks.sideSearchGoToDecl);
                    this.lastSelectedIdx = -1;
                    TheEditor.goToLocation(e);
                    items.forEach((x:HTMLElement) => x.setFlag("selected", false));
                    b.setFlag("selected", true);
                    b.setFlag("was-selected", true);
                    this.wasSelected[idx] = true;
                    this.lastSelectedIdx = idx;
                    this.lastHistoryVersion = this.version;
                });
                items.push(b);
            });
            if (hasMore) items.push(IntelliItem.thereIsMore());

            this.htmlEntries = items;

            this.setChildren(items);
        }


        public rebind()
        {
            this.locations = this.locations.map((l:CodeLocation) => l.rebind()).filter((l) => !!l);
        }

        public saveLocation()
        {
            var curr = TheEditor.currentLocation();
            if (!curr) return;


            var first = this.locations[0];
            if (first && first.similar(curr)) {
                this.locations[0] = curr;
            } else {
                this.version++;
                this.locations.unshift(curr);
            }

            if (this.locations.length > 100)
                this.locations = this.locations.slice(0, 50);
            //this.queueNavRefresh();

            /*
            var last = this.locations[this.currentIdx];
            if (!!last && last.similar(curr)) {
                this.locations[this.currentIdx] = curr;
            } else {
                this.version++;
                this.locations.splice(this.currentIdx + 1);
                this.currentIdx = this.locations.length;
                this.locations.push(curr);
                this.queueNavRefresh();
            }
            */
        }

        public reset()
        {
            super.reset();
            this.locations = [];
        }

    }

}
