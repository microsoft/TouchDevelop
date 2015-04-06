///<reference path='refs.ts'/>

module TDev
{
    export class SizeDesc
    {
        public elt:HTMLElement;
        public top:number;

        constructor(public stmt:AST.Stmt) {
            this.elt = this.stmt.renderedAs;
            this.top = Util.offsetIn(this.elt, TheEditor.codeInner).y;
        }
    }

    export class Selector
        extends SideTab
    {
        public codeButtons:HTMLElement[] = [];
        private topButtonRow:HTMLElement;
        private topLeftButtonRow:HTMLElement;
        private extractedName:HTMLInputElement;
        private bottomButtonRow:HTMLElement;
        private bottomLeftButtonRow:HTMLElement;
        private buttonsAround:HTMLElement;
        private selectionBlock:AST.Block;
        private selectionBegin = 0;
        private selectionEnd = 0;
        private tops:SizeDesc[] = [];
        private scrollCont:HTMLElement;
        private directAdd = false;
        private useCodeButtons = false;
        private displayDoubleTapHint = false;
        public codeView:HTMLElement;
        public selectedStmt:AST.Stmt;
        private selectionActive = false;
        private multiStmtSelectionActive = false;
        private dragMode = false;
        private sideKeyFocus = false;
        private topDrag:DragMarker;
        private bottomDrag: DragMarker;
        private breakpointBtn: HTMLElement;

        constructor() {
            super()
        }
        public somethingSelected() { return this.selectionActive; }
        public nonActionSelected() { return this.selectionActive && !(this.selectedStmt instanceof AST.ActionHeader); }
        public phoneNarrow() { return true }

        static insertionButtons() {
            return [
                { name: "if", desc: lf("conditional"), tick: Ticks.codeIf,
                        node: "if \\u0001need_Boolean\\u003Acondition then { }" },
                { name: "for",  desc: lf("repeat code"), tick: Ticks.codeFor,
                        node: "for 0 <= i < \\u0001need_Number do { }" },
                { name: "while", desc: lf("simple loop"), tick: Ticks.codeWhile,
                        node: "while \\u0001need_Boolean\\u003Aloop_condition do { }" },
                { name: "for each", desc: lf("repeat on collection"),  tick: Ticks.codeForEach,
                        node: "foreach e in \\u0001need_Collection\\u005bString\\u005d\\u003Acollection do { }" },
                { name: "boxed", desc: lf("UI widget"), tick: Ticks.codeBoxed,
                        node: "do box { }" },
                ];
        }

        public init(e:Editor)
        {
            super.init(e);
            this.codeView = e.codeInner;
        }

        private isSelected(n:AST.Stmt)
        {
            for (var i = this.selectionBegin; i <= this.selectionEnd; ++i)
                if (this.selectionBlock.stmts[i] == n) return true;
            return false;
        }

        public edit(n:AST.AstNode) {
            return TheEditor.editNode(n, false); // TODO XXX - why did we set refreshIds=true here previously?
        }

        private addAt(j:number, bl:AST.Block)
        {
            var ch = bl.stmts.slice(0);
            if (j < ch.length && ch[j].isPlaceholder()) {
                this.edit(ch[j]);
                return; // no need to insert a new one
            } else if (j > 0 && ch[j-1].isPlaceholder()) {
                this.edit(ch[j-1]);
                return; // likewise
            }

            var n = bl.emptyStmt();
            if (AST.isElseIf(bl.stmts[j])) {
                n = AST.Parser.parseStmt(Selector.insertionButtons()[0].node);
                (<AST.If>n).isElseIf = true;
            }
            TheEditor.initIds(n, true)
            ch.splice(j, 0, n);
            bl.setChildren(ch);
            // TheEditor.refreshDecl();
            this.edit(n);
            // For new record fields, just like for [var] declarations, we edit
            // the field name right away.
            if (n instanceof AST.RecordField || n instanceof AST.ActionParameter)
                TheEditor.calculator.inlineEdit(TheEditor.calculator.expr.tokens[0]);
        }

        public addCallback(off:number, stmt = null, t = Ticks.noEvent)
        { return () => {
            tick(t);
            TheEditor.getSpyManager().onAddNear(stmt);
            if (!stmt) {
                if (off <= 0) stmt = this.selectionBlock.stmts[this.selectionBegin];
                else stmt = this.selectionBlock.stmts[this.selectionEnd];
                if (stmt instanceof AST.FieldComment)
                    stmt = stmt.parent.parent
            }

            var idx = stmt.parentBlock().stmts.indexOf(stmt);
            if (off < 0) off = 0;
            if (off == 2) {
                off = 1;
                var prim = stmt.primaryBody();
                if (prim != null) {
                    this.addAt(0, prim);
                    return;
                }
            }
            this.addAt(idx + off, stmt.parent);
        };
        }

        public deleteButton()
        {
            return div(null, HTML.mkButtonTick(lf("delete"), Ticks.btnCut, () => {
                this.deleteSelection();
                TheEditor.dismissSidePane();
            }))
        }

        public deleteSelection()
        {
            if (!!this.selectionBlock.immutableReason) {
                HTML.showErrorNotification(this.selectionBlock.immutableReason);
                return;
            }
            TheEditor.getSpyManager().onDelete(this.selectionBlock);
            this.copyOutSelection().forEach(s => {
                s.onDelete();
            });
            var ch = this.selectionBlock.stmts.slice(0);
            ch.splice(this.selectionBegin, this.selectionEnd - this.selectionBegin + 1);
            var needInit = false
            if (ch.length == 0 && !this.selectionBlock.allowEmpty()) {
                ch.push(this.selectionBlock.emptyStmt());
                needInit = true
            }
            this.selectedStmt = this.selectionBlock.stmts[Math.max(this.selectionBegin - 1, 0)];
            this.selectionBlock.setChildren(ch);
            if (needInit)
                TheEditor.initIds(this.selectionBlock)
            this.selectionBlock.notifyChange()
        }

        private cutSelection()
        {
            this.copySelection(true);
            this.deleteSelection();
            this.unselect();
        }

        private copySelection(isCut : boolean = false)
        {
            if (!this.canCopyPaste()) return;

            var ch = this.copyOutSelection();
            if (ch.length == 0) return;

            ch = ch.map((s:AST.Stmt) => {
                // strip 'where' and 'with x :='
                if (s instanceof AST.Where || s instanceof AST.OptionalParameter)
                    return AST.mkExprStmt(s.calcNode())
                if (s instanceof AST.InlineAction)
                    return null
                return s
            }).filter(s => !!s)

            /*if (ch.length == 1 && ch[0] instanceof AST.ExprStmt) {
                TheEditor.clipMgr.copy({ type: "tokens", data: (<AST.ExprStmt>ch[0]).expr.serialize() });
            } else*/ {
                var block = new AST.CodeBlock();
                block.stmts = ch; // don't use setChildren(), that would override the parent
                TheEditor.clipMgr.copy({ type: "block", data: block.serialize(), scriptId: (Script ? Script.localGuid : Util.guidGen()), isCut: isCut });
            }
        }

        private toggleBreakpointHandler() {
            return () => TheEditor.toggleBreakpoint(this.selectedStmt);
        }

        private setupButtons(isfresh: boolean) : HTMLElement {
            var extractedName = isfresh ? "do stuff" : this.extractedName.value;

            var mkBtn = (lbl:string, key:string, tck:Ticks, f:()=>void) => {
                var b = HTML.mkButtonTick(lbl, tck, f)
                KeyboardMgr.instance.btnShortcut(b, key)
                return b
            }

            var btn:HTMLElement;
            var btns = <HTMLElement[]>[
              div("commentHeader", span("commentHeaderSlash kw", "block"), TDev.text(" editing")),
              div("selHeader", lf("clipboard")),
                    mkBtn(lf("cut selection"), "Ctrl-X, Shift-Del", Ticks.codeCutSelection, () => { this.cutSelection() }),
                    btn = mkBtn(lf("copy selection"), "Ctrl-C, Ctrl-Ins", Ticks.codeCopySelection, () => { this.copySelection(); this.unselect() }),
                    mkBtn(lf("delete selection"), "Del", Ticks.codeDeleteSelection, () => { this.deleteSelection(); this.unselect() })
            ];

            if (this.selectionBlock instanceof AST.CodeBlock) {
                btns.push(
                  div("selHeader", lf("extract selection into action")),
                     this.extractedName = HTML.mkTextInput("text", lf("action name")),
                     mkBtn("extract", "Ctrl-E", Ticks.codeExtractAction, () => { this.extract() }));

                btns.push(div("selHeader", lf("surround with")));
                this.extractedName.value = Script.freshName(extractedName);

                Selector.insertionButtons().forEach(ib =>
                    btns.push(HTML.mkButton(ib.name, () => {
                        TDev.Browser.EditorSoundManager.intellibuttonClick();
                        this.surround(ib.node)();
                    })))

                btns.push(HTML.mkButton(lf("comment out"), () => {
                    TDev.Browser.EditorSoundManager.intellibuttonClick();
                    this.surround("if false then { }")();
                }))
            }

            this.setChildren(btns);
            return btn;
        }

        public startSelection() : void
        {
            if (!this.selectedStmt || !this.selectionBlock || !this.canCopyPaste()) return;

            this.multiStmtSelectionActive = true;

            var prevStmt = this.selectedStmt;
            TheEditor.resetSidePane();
            this.selectedStmt = prevStmt;
            TheEditor.showSideTab(this, true);

            this.scrollCont = TheEditor.codeInner;

            this.hideCodeButtons();
            EditorRenderer.setActive(this.selectedStmt, true);

            this.selectionActive = true;

            var btn = this.setupButtons(true);

            this.setupDrags();

            // needed on android to prevent keyboard popping up
            Util.setTimeout(50, () => btn.focus());
        }

        private extract()
        {
            var stmts = this.copyOutSelection();

            var callPlaceholder = this.replaceSelectionWithPlaceholder();

            var extracted = AST.Parser.emptyBlock();
            extracted.setChildren(stmts);

            var extr = new AST.Extractor(extracted,
                                         TDev.TheEditor.currentAction(),
                                         callPlaceholder,
                                         Script.freshName(this.extractedName.value));
            extr.run();
            TheEditor.initIds(extr.extractedAction)
            Script.addDecl(extr.extractedAction);
            TheEditor.queueNavRefresh();
            TheEditor.typeCheckNow();
            TheEditor.dismissSidePane();
            var elt = callPlaceholder.renderedAs;
            if (elt) Util.coreAnim("blinkLocation", 1000, elt);
        }

        public copyOutSelection() { return this.selectionBlock ? this.selectionBlock.stmts.slice(this.selectionBegin, this.selectionEnd + 1) : []; }

        private replaceSelectionWithPlaceholder()
        {
            var ch = this.selectionBlock.stmts.slice(0);
            var placeHolder = AST.Parser.emptyExprStmt();
            TheEditor.initIds(placeHolder, true)
            ch.splice(this.selectionBegin, this.selectionEnd - this.selectionBegin + 1, placeHolder);
            this.selectionBlock.setChildren(ch);
            return placeHolder;
        }

        private surround(node:string)
        { return () => {
            tick(Ticks.codeSurround)
            var ch0 = this.copyOutSelection();
            var placeHolder = this.replaceSelectionWithPlaceholder();
            var n = AST.Parser.parseStmt(node);
            this.changeStmtTypeCore(n, placeHolder);
            n.primaryBody().setChildren(ch0);
            this.edit(n);
        }
        }

        public changeStmtType(node:string)
        {
            var n = AST.Parser.parseStmt(node);
            this.changeStmtTypeCore(n, this.selectedStmt);
            //this.initIdVisitor.dispatch(n); // TODO XXX - is this the right place?
            this.edit(n);
        }

        public changeStmtTypeCore(n:AST.Stmt, at:AST.Stmt)
        {
            var a = TDev.TheEditor.currentAction();
            if (!!a) {
                for (var pr in n) {
                    if ((<any> n)[pr] instanceof AST.LocalDef) {
                        var l = <AST.LocalDef> (<any> n)[pr];
                        var nn = TheEditor.calculator.forceLoopLocalName;
                        if (!nn) nn = a.nameLocal(l.getName());
                        TheEditor.calculator.forceLoopLocalName = null;
                        l.rename(nn);
                    }
                }
            }
            var ch = at.parentBlock().stmts.slice(0);
            var idx = ch.indexOf(at);
            var len = 1;
            if (!at.isPlaceholder()) { idx++; len = 0; }
            ch.splice(idx, len, n);
            at.parentBlock().setChildren(ch);
        }

        public setup(stmt:AST.Stmt)
        {
            this.setSelected(stmt);
            this.selectionActive = true;
            this.multiStmtSelectionActive = false;
        }

        public setSelected(stmt:AST.Stmt)
        {
            this.hideCurrent();
            this.selectedStmt = stmt;

            if (!stmt) return;

            this.selectionBlock = <AST.Block>stmt.parent;
            if (!this.selectionBlock || this.selectionBlock instanceof AST.App) {
                this.selectionBegin = 0;
                this.selectionEnd = -1;
            } else {
                this.selectionBegin = this.selectionBlock.stmts.indexOf(stmt);
                this.selectionEnd = this.selectionBegin;
            }
            this.setLineFlag(this.selectedStmt, "carret", true);
        }

        public addBeforeSelected(n:AST.Stmt)
        {
            var ch = this.selectionBlock.stmts.slice(0);
            var idx = ch.indexOf(this.selectedStmt);
            if (idx < 0) return;
            ch.splice(idx, 0, n);
            this.selectionBlock.setChildren(ch);
        }

        public hideCurrent()
        {
            if (!!this.selectedStmt)
                this.setLineFlag(this.selectedStmt, "carret", false);
        }

        public showCurrent()
        {
            this.setSelected(TheEditor.firstIfMissing(this.selectedStmt));
        }

        private unselect()
        {
            TheEditor.dismissSidePane();
        }

        public recomputeSelection()
        {
            var beginParents = [];
            for (var beg = this.topDrag.currentNode; beg != null; beg = beg.parent)
                beginParents.push(beg);
            var endNode = this.bottomDrag.currentNode;
            while (!!endNode && beginParents.indexOf(endNode.parent) < 0)
                endNode = endNode.parent;

            if (!endNode) this.emptySelection();
            else {
                if (!(endNode.parent instanceof AST.Block))
                    endNode = endNode.parent;
                if (!endNode.parent) this.emptySelection();
                else {
                    var idx = beginParents.indexOf(endNode.parent);
                    this.selectionBlock = <AST.Block> endNode.parent;
                    this.selectionBegin = this.selectionBlock.stmts.indexOf(beginParents[idx - 1]);
                    this.selectionEnd = this.selectionBlock.stmts.indexOf(endNode);
                }

                if (this.selectionEnd < this.selectionBegin)
                    this.emptySelection();
                else
                    this.applySelection();
            }
        }

        private emptySelection()
        {
            this.selectionBegin = -1;
            this.selectionEnd = -1;
            this.applySelection();
        }

        private applySelection()
        {
            var elseIfs = [];

            this.tops.forEach((s:SizeDesc) => {
                if (elseIfs.indexOf(s.stmt) >= 0) return;
                var v = this.isSelected(s.stmt);
                s.elt.setFlag("selected", v);
                if (v)
                    s.elt.setFlag("current", false)
                var st = s.stmt;
                /*
                if (this.isSelected(st)) {
                    while (st instanceof AST.If) {
                        st = (<AST.If> st).elseIfNode;
                        elseIfs.push(st);
                        if (!st) break;
                        st.renderedAs.setFlag("selected", v);
                    }
                }
                */
            });
        }

        private setupDrags()
        {
            // TheEditor.refreshDecl();
            this.setSizes();
            this.applySelection();

            this.codeButtons = [];
            this.topDrag = new DragMarker(true, this);
            this.bottomDrag = new DragMarker(false, this);
            this.repositionMarkers();
            this.dragMode = true;
        }

        public repositionMarkers()
        {
            if (this.selectionBegin < 0) {
                this.unselect();
                return;
            }

            var p = Util.offsetIn(this.selectionBlock.stmts[this.selectionBegin].renderedAs, this.codeView);
            var x0 = p.y;
            var endElt = this.selectionBlock.stmts[this.selectionEnd].renderedAs;
            if (!endElt) {
                this.unselect();
                return;
            }
            if ((<HTMLElement> endElt.parentNode).className == "elseIfHolder")
                endElt = <HTMLElement>endElt.parentNode;
            p = Util.offsetIn(endElt, this.codeView);
            var x1 = p.y + endElt.offsetHeight;
            this.topDrag.position(x0);
            this.bottomDrag.position(x1);


            /*
            var overlap = (x0 + btnH) - x1 + 5;
            if (overlap > 0) {
               x0 -= overlap / 2;
               x1 += overlap / 2;
            }
            */

            // for up button: find first stmt below it, for down first above
            // then extend selection based on these two
            // update selected className, do not redraw everything


            /*
            var missingSize = hh - bottomPos - 10;
            var spacer = div(null);
            spacer.style.height = missingSize + "px";
            codeView.appendChild(spacer);
            codeButtons.push(spacer);
            */
        }

        public findNodeAt(pos:number)
        {
            for (var i = 0; i < this.tops.length; ++i)
                if (this.tops[i].top > pos) break;
            if (i > 0) i--;
            return this.tops[i].stmt;
        }

        private setSizes()
        {
            var desc = (s:AST.AstNode) =>
            {
                if (s instanceof AST.Stmt) {
                    if (!(s instanceof AST.Block) && (<AST.Stmt>s).renderedAs)
                        this.tops.push(new SizeDesc(<AST.Stmt>s));
                    s.children().forEach(desc);
                }
            }

            this.tops = [];
            TheEditor.lastDecl.children().forEach(desc);
        }

        private selectionUp()
        {
            var p = this.selectionBlock.parent;
            if (!p) return;
            var gp = p.parentBlock();
            if (!gp) return;
            this.selectionBegin = gp.stmts.indexOf(p);
            this.selectionEnd = this.selectionBegin;
            this.selectionBlock = gp;
        }

        private updateSelection()
        {
            this.applySelection();
            this.repositionMarkers();
        }

        public pasteCode()
        {
            tick(Ticks.codePaste)

            var node = TheEditor.clipMgr.paste();
            if (!!node) {
                //Util.log(">>> pasting from "+node.scriptId+((node.scriptId == Script.localGuid) ? " (me)" : "")+(node.isCut ? " (cut)" : " (copied)"));
                var calc = TheEditor.calculator;
                if (node.type == "tokens" && calc.isActive()) {
                    calc.pasteTokens()
                    return;
                }

                if (node.type == "decls") {
                    TheEditor.pasteNode();
                } else if (node.type == "block" || node.type == "tokens") {
                    if (!this.canCopyPaste()) return;

                    var stmt = AST.Parser.parseStmt(node.data);
                    // refresh the IDs in stmt if pasted data
                    // (1) came from another script, or
                    // (2) was *copied* instead of cut
                    if(node.scriptId != Script.localGuid || !node.isCut) {
                        TheEditor.initIds(stmt, true);
                    }
                    if (!stmt) return;
                    var stmts = [stmt];
                    if (stmt instanceof AST.Block)
                        stmts = (<AST.Block>stmt).stmts;
                    if (stmts.length == 0)
                        stmts.push(this.selectionBlock.emptyStmt());
                    else if (this.selectionBlock instanceof AST.ConditionBlock)
                        stmts = stmts.filter((s) => s instanceof AST.ExprStmt).map((s:any) => AST.mkWhere(s.expr));
                    else if (this.selectionBlock instanceof AST.FieldBlock)
                        stmts = stmts.filter(s => s instanceof AST.RecordField)
                    else // If not a [FieldBlock], then [RecordField]'s are not allowed
                        stmts = stmts.filter(s => !(s instanceof AST.RecordField))

                    var ch = this.selectionBlock.stmts.slice(0);
                    var selLen = this.selectionEnd - this.selectionBegin + 1
                    if (this.multiStmtSelectionActive || (selLen == 1 && ch[this.selectionBegin].isPlaceholder()))
                        ch.spliceArr(this.selectionBegin, selLen, stmts);
                    else
                        ch.spliceArr(this.selectionEnd + 1, 0, stmts);
                    this.selectionBlock.setChildren(ch);

                    // Specific adjustments for records: avoid duplicate names,
                    // and make sure the [isKey] parameter is set consistently.
                    if (this.selectionBlock instanceof AST.FieldBlock) {
                        var fb = <AST.FieldBlock> this.selectionBlock;
                        stmts.forEach(s => {
                            var rf = <AST.RecordField> s;
                            rf.isKey = fb.isKeyBlock();
                            rf.setName(fb.mkUniqName(rf.getName()));
                        });
                    }

                }
            }
            this.unselect();
        }

        public injectBelow(node:AST.Stmt)
        {
            var nodes:AST.Stmt[] = [node];
            if (node instanceof AST.Block)
                nodes = (<AST.Block>node).stmts;

            var ch = this.selectionBlock.stmts.slice(0);
            var curr = this.copyOutSelection();

            if (!this.multiStmtSelectionActive && curr.length == 1) {
                var innerBlocks = curr[0].children().filter((n) => n instanceof AST.Block);
                if (innerBlocks[0]) {
                    var innerBlock = <AST.Block>innerBlocks[0];
                    innerBlock.setChildren(nodes.concat(innerBlock.stmts));
                    this.unselect();
                    return;
                }
            }

            if (curr.length == 1 && curr[0].isPlaceholder())
                ch.spliceArr(this.selectionBegin, 1, nodes);
            else
                ch.spliceArr(this.selectionEnd + 1, 0, nodes);
            this.selectionBlock.setChildren(ch);
            this.unselect();
        }

        public getStmtIntelliItems() : IntelliItem[]
        {
            var res:IntelliItem[] = [];
            var add = (ib:any) => {
                var it = new IntelliItem();
                it.nameOverride = ib.name;
                if (ib.name == "for each") it.nameOverride = "foreach"; // easier search
                it.descOverride = ib.desc;
                if (ib.node && !ib.usageKey) {
                    var stmt = AST.Parser.parseStmt(ib.node)
                    ib.usageKey = stmt.nodeType()
                }
                it.usageKey = ib.usageKey;
                var cbHandler = () => {
                    tick(ib.tick)
                    api.core.stmtUsage(ib.usageKey).localCount += 10;
                    this.changeStmtType(ib.node);
                }
                it.cbOverride = cbHandler;
                it.score = -1;
                res.push(it);
            }

            add({ name: "var", desc: lf("new variable"), node: "", usageKey: "var" });
            res.peek().cbOverride = () => {
                tick(Ticks.codeNewVar)
                TheEditor.calculator.newVar()
            };
            Selector.insertionButtons().forEach(add);
            if (this.editor.widgetEnabled("comment"))
                add({ name: lf("// comment"), desc: lf("insert comment"), node: "//" });

            return res;
        }

        public positionButtonRows()
        {
            if (!this.selectionBlock || !this.topButtonRow || !this.selectedStmt) return;

            this.topButtonRow.className = "code-button-row " + (TheEditor.calculator.inSelectionMode() ? "tokenSelection" : "lineSelection");
            this.topButtonRow.style.width = "auto";

            var btnHeight = this.topButtonRow.offsetHeight;
            var overlap = 0.2 * SizeMgr.topFontSize;
            var h = this.buttonsAround.offsetHeight;
            var pp = Util.offsetIn(this.buttonsAround, this.codeView);
            this.topButtonRow.style.top = pp.y - btnHeight + overlap + "px";
            this.topLeftButtonRow.style.top = pp.y - btnHeight + overlap + "px";
            this.bottomButtonRow.style.top = pp.y + h - overlap + "px";
            this.bottomLeftButtonRow.style.top = pp.y + h - overlap + "px";

            var xx = pp.x - SizeMgr.topFontSize * 1.5;
            this.topLeftButtonRow.style.left = xx + "px";
            this.bottomLeftButtonRow.style.left = xx + "px";

            var disableAdd = this.selectedStmt.isPlaceholder() || this.selectionBlock.immutableReason || !this.selectionBlock.allowAdding();
            var inlineEditMode = TheEditor.calculator.isInlineEditing() && !!elt("inlineEditCloseBtn");
            Util.childNodes(this.topButtonRow, this.topLeftButtonRow, this.bottomButtonRow, this.bottomLeftButtonRow).forEach((e:HTMLElement) => {
                e.setFlag("disabled",
                        TheEditor.isDebuggerMode() || inlineEditMode ||
                        ((<any>e).enableForPlaceholder && !disableAdd) ||
                        ((<any>e).disableForPlaceholder && disableAdd) ||
                        this.selectionBlock.immutableReason);
            });
            var disableBreakpoints = !this.selectedStmt || (this.selectedStmt.nodeType() === "comment") || (!TheEditor.isDebuggerMode() && Script.annotatedBy !== AST.AnnotationMode.Crash);
            if (this.breakpointBtn) this.breakpointBtn.setFlag("disabled", disableBreakpoints);
        }

        public canCopyPaste()
        {
            return (this.selectionBlock instanceof AST.CodeBlock ||
                    this.selectedStmt instanceof AST.OptionalParameter ||
                    this.selectionBlock instanceof AST.FieldBlock)
                && !(this.selectedStmt instanceof AST.FieldComment)
                && !TheEditor.isDebuggerMode()
                && TheEditor.widgetEnabled("copyPaste");
        }

        public setupCodeButtons() : void
        {
            this.hideCodeButtons();

            this.selectedStmt = TheEditor.firstIfMissing(this.selectedStmt);
            var stmt = this.selectedStmt;
            if (!stmt) return;
            this.setLineFlag(stmt, "carret", true);
            if (!this.selectionActive) return;

            this.topButtonRow = div("code-button-row");
            this.topLeftButtonRow = div("code-button-row-left");
            this.bottomLeftButtonRow = div("code-button-row-left");
            this.bottomButtonRow = div("code-button-row");
            this.codeButtons.push(this.topButtonRow, this.topLeftButtonRow, this.bottomButtonRow, this.bottomLeftButtonRow);
            this.codeView.appendChildren([this.topButtonRow, this.topLeftButtonRow, this.bottomButtonRow, this.bottomLeftButtonRow]);

            this.buttonsAround = EditorRenderer.setActive(stmt, true);

            function mkBtn(s:string, lbl:string, key:string, tck:Ticks, f:()=>void, up = true) {
                var lbl0 = null;
                var lbl1 = null;
                if (up) { lbl0 = div("code-button-desc", lbl); }
                else { lbl1 = div("code-button-desc", lbl); }
                var img0 = div("code-button-frame", HTML.mkImg(s))
                var img1 = null;
                if (lbl == "cut" || lbl == "copy") {
                    img0.className += " lineSelection";
                    img1 = div("code-button-frame", HTML.mkImg(s.replace("black", "#85B100")))
                    img1.className += " tokenSelection";
                }
                var b0 = HTML.mkButtonElt("code-button", lbl0, img0, img1, lbl1);
                (<any>b0).disableForPlaceholder = tck == Ticks.btnAddUp || tck == Ticks.btnAddDown;
                HTML.setTickCallback(b0, tck, () => {
                    TDev.Browser.EditorSoundManager.intellibuttonClick();
                    f();
                })
                TheEditor.keyMgr.btnShortcut(b0, key);
                return b0;
            }

            function mkBtnDown(s:string, lbl:string, key:string, tck:Ticks, f:()=>void) {
                return mkBtn(s, lbl, key, tck, f, false)
            }

            if (this.selectionBlock) {
                var calc = TheEditor.calculator;
                if (this.canCopyPaste()) {
                    this.topButtonRow.setChildren([
                        mkBtn("svg:paste,black", lf("paste"), "Ctrl-V, Shift-Ins", Ticks.btnPaste, () => {
                            this.pasteCode()
                        }),
                        mkBtn("svg:copy,black", lf("copy"), "Ctrl-C, Ctrl-Ins", Ticks.btnCopy, () => {
                            if (calc.inSelectionMode()) {
                                calc.copyHandler()
                            } else {
                                this.copyCode();
                            }
                        }),
                        mkBtn("svg:cut,black", lf("cut"), "Ctrl-X, Shift-Del", Ticks.btnCut, () => {
                            if (calc.inSelectionMode()) {
                                calc.cutHandler()
                            } else {
                                this.cutCode();
                            }
                        })
                    ]);
                } else {
                    this.topButtonRow.setChildren([
                        mkBtn("svg:trash,black", lf("delete"), "Ctrl-X, Shift-Del", Ticks.btnCut, () => {
                            this.cutCode();
                        })
                    ]);
                }

                var moveLeft:HTMLElement = null;

                if (stmt.isLastChild() &&
                    stmt.parentBlock().parent.parentBlock() != null &&
                    stmt.isExecutableStmt()) {

                    var act = TheEditor.currentAction();
                    if (act && (stmt.parent == act.getPageBlock(true) || stmt.parent == act.getPageBlock(false))) {}
                    else if (stmt.parent.parent instanceof AST.InlineAction) {}
                    else if (TheEditor.stepTutorial) {}
                    else {
                        moveLeft = mkBtnDown("svg:ArrowDownL,black", lf("move left"), "Ctrl-L", Ticks.btnMoveLeft, () => {
                                            tick(Ticks.codeMoveLeft);
                                            this.moveOut()
                                    });
                        (<any>moveLeft).enableForPlaceholder = true;
                    }
                }

                this.breakpointBtn = null
                if (stmt.isExecutableStmt() && TheEditor.debugSupported())
                    this.breakpointBtn = mkBtn("svg:breakpoint,red,clip=-150", lf("breakpoint"), "Ctrl+B", Ticks.btnBreakpoint, this.toggleBreakpointHandler());

                this.topLeftButtonRow.setChildren([
                    mkBtn("svg:add,black", lf("add"), "Ctrl-Enter", Ticks.btnAddUp, this.addCallback(-1, null, Ticks.codeAddAbove)),
                    this.breakpointBtn
                ]);
                this.bottomLeftButtonRow.setChildren([moveLeft, mkBtnDown("svg:add,black", lf("add"), "-Enter", Ticks.btnAddDown, this.addCallback(1, null, Ticks.codeAddBelow))]);

                var t = HelpTopic.findById(this.selectedStmt.helpTopic())
                HelpTopic.contextTopics = t ? [t] : [];

                var wrenchDiv = div("inlineBlock wrench-button")
                this.setupWrench = (style, lbl, t, cb) =>
                        wrenchDiv.setChildren([ mkBtnDown("svg:" + style + ",white", lbl, "", t, cb) ]);
                this.clearWrench = () => wrenchDiv.setChildren([])

                this.bottomButtonRow.setChildren([
                    wrenchDiv,
                    this.canCopyPaste() ?
                        mkBtnDown("svg:select,black", lf("select"), " Shift-Up, Down", Ticks.btnSelect, () => {
                            this.startSelection();
                        }) : null
                ]);
            }

            this.positionButtonRows();
        }

        public clearWrench : () => void = () => {};
        public setupWrench : (style:string, lbl:string, t:Ticks, cb:()=>void) => void;

        public cutCode()
        {
            tick(Ticks.codeCut);
            this.cutSelection()
        }

        public copyCode()
        {
            tick(Ticks.codeCopy);
            this.copySelection();
            this.unselect()
        }

        private moveOut()
        {
            var stmt = this.selectedStmt;
            if (!stmt.isLastChild()) return;
            var par = stmt.parentBlock();
            var newCh = par.stmts.filter((x) => x != stmt);
            if (newCh.length == 0 && !par.allowEmpty())
                newCh.push(par.emptyStmt());
            par.setChildren(newCh);
            var newPar = par.parent.parentBlock();
            newCh = newPar.stmts.slice(0);
            var idx = newCh.indexOf(par.parent);
            newCh.splice(idx + 1, 0, stmt);
            newPar.setChildren(newCh);
            TheEditor.calculator.bye();
            this.edit(stmt);
        }

        private hideCodeButtons()
        {
            this.codeButtons.forEach((b:any) => {
                b.removeSelf();
            });
            this.codeButtons = [];
        }

        public clear()
        {
            if (this.selectedStmt)
                EditorRenderer.setActive(this.selectedStmt, false);
            this.selectionActive = false;
            this.multiStmtSelectionActive = false;
            this.dragMode = false;
            this.hideCodeButtons();
        }

        private setLineFlag(s:AST.Stmt, name:string, v:boolean)
        {
            var n = s.renderedAs;
            if (!n) return;
            n = <HTMLElement>n.firstChild;
            if (!n) return;
            n.setFlag(name, v);
        }

        private moveByPage(d:number)
        {
            this.setSizes();
            var desc = this.tops.filter((s:SizeDesc) => s.stmt == this.selectedStmt)[0];
            if (!desc) return null;
            var targetPos = desc.top;
            var pageSize = TheEditor.codeInner.clientHeight * 0.9;
            var newDesc = desc;
            if (d < 0) {
                targetPos -= pageSize;
                newDesc = this.tops.filter((s:SizeDesc) => s.top >= targetPos)[0];
            } else {
                targetPos += pageSize;
                for (var i = 0; i < this.tops.length; ++i) {
                    if (this.tops[i].top >= targetPos) break;
                    newDesc = this.tops[i];
                }
            }
            if (!newDesc) return null;
            return newDesc.stmt;
        }

        private moveByLine(d:number)
        {
            var seenCurr = false;
            var prev:AST.Stmt = null;
            var next:AST.Stmt = null;

            var act = TheEditor.currentAction();
            if (!act) return null;

            var desc = (s:AST.AstNode) =>
            {
                if (s instanceof AST.Stmt) {
                    if (!(s instanceof AST.Block)) {
                        if (s == this.selectedStmt) seenCurr = true;
                        else {
                            var st = <AST.Stmt>s;
                            if (st.renderedAs) {
                                if (seenCurr) {
                                    if (next == null) next = st;
                                } else {
                                    prev = st;
                                }
                            }
                        }
                    }
                    s.children().forEach(desc);
                }
            }
            desc(act.header);

            if (!seenCurr) return null; // something odd is going on

            var r = next;
            if (d < 0) r = prev;
            return r;
        }

        public moveCarret(d:number)
        {
            var newNode:AST.Stmt = null;
            this.selectedStmt = TheEditor.firstIfMissing(this.selectedStmt);

            if (Math.abs(d) < 2) {
                newNode = this.moveByLine(d);
            } else {
                newNode = this.moveByPage(d);
            }

            if (!newNode) return;
            this.setSelected(newNode);
            Util.ensureVisible(this.selectedStmt.renderedAs, TheEditor.codeInner);
        }

        public extendCarret(dir:number)
        {
            if (this.dragMode) {
                if (dir < 0) {
                    if (this.selectionBegin <= 0)
                        this.selectionUp();
                    else
                        this.selectionBegin--;
                } else {
                    if (this.selectionEnd + 1 >= this.selectionBlock.stmts.length)
                        this.selectionUp();
                    else
                        this.selectionEnd++;
                }
                this.updateSelection();
            } else {
                this.startSelection();
            }
        }

        public bye()
        {
            this.clear();
            //if (!!scrollCont)
            //    scrollCont.removeEventListener("scroll", this, false);
        }
    }

    export class DragMarker
    {
        private topPos:number;
        private handle:HTMLElement;
        private handler:DragHandler;
        currentNode:AST.Stmt;

        constructor(public isTop:boolean, public parent:Selector)
        {
            this.handle = div("codeMarker " + (this.isTop ? "codeMarkerTop" : "codeMarkerBottom"), SVG.getHorizontalCursorMarker());
            this.currentNode = this.parent.selectedStmt;

            this.parent.codeButtons.push(this.handle);
            this.parent.codeView.appendChild(this.handle);
            this.handler = new DragHandler(this.handle, (e,x,y) => { this.extend(e, x, y); });
            this.handler.lockX = true;
        }


        position(p:number)
        {
            this.topPos = p;
            p -= SizeMgr.topFontSize * 2.1;
            var s = this.handle.style;
            //s.right = "0px";
            s.top = p + "px";
        }

        private extend(evt:string, dx:number, dy:number)
        {
            var n = this.parent.findNodeAt(this.topPos + dy);
            if (evt == "release") {
                this.parent.repositionMarkers();
                return;
            }

            if (n == this.currentNode) return;
            this.currentNode = n;
            this.parent.recomputeSelection();
        }
    }



    export class SelectorEditor
        extends StmtEditor
    {
        private stmt:AST.Stmt;

        constructor() {
            super()
        }

        public editedStmt():AST.Stmt { return this.stmt; }

        public edit(ss:AST.Stmt)
        {
            tick(Ticks.editTapBelow)
            this.stmt = ss;
            TheEditor.showStmtEditor(this);
        }

        public bye()
        {
        }
    }
}
