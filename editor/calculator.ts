///<reference path='refs.ts'/>

module TDev
{
    export enum DragPhase
    {
        Begin,
        Move,
        ReleaseDrag,
        ReleaseTap
    }

    export interface FindResult {
        property: IProperty;
        index: number;
    }

    export class Calculator
        extends StmtEditor
    {
        constructor() {
            super()
            this.insertFn = (s:string) => { this.insertOp(s, true) };
            this.searchApi = new SearchApi(this);
            this.selectionStartMarker = new CalcSelectionMarker(true, this);
            this.selectionEndMarker = new CalcSelectionMarker(false, this);
            this.renderer.shortNameHeuristics = true;
        }
        private insertFn:(s:string)=>void;
        private buttons:CalcButton[] = [];
        private topButtons:CalcButton[] = [];
        public expr:AST.ExprHolder = null;
        public stmt:AST.Stmt;
        public cursorPosition = 0;
        private wasSelectedBeforeTap = false;
        private renderer = new EditorRenderer();
        private displayElts:HTMLElement[] = [];
        public currentIntelliItems: IntelliItem[] = [];
        private intelliPredictor = new IntelliPredictor();
        public searchApi:SearchApi;
        private undoMgr:UndoMgr;
        private autoNameLocals:any = {};
        private showPerfectLine = false;
        public autoLocal:AST.LocalDef = null;
        public selectionStart = -1;
        public selectionEnd = -1;
        private keyboardSelectionLeft = false;
        private selectionStartMarker:CalcSelectionMarker;
        private selectionEndMarker:CalcSelectionMarker;
        private cursorPosBeforeSelection = -1;
        private isElse = false;
        private lastHideTime = 0;
        private lastOpenBracePos = -1;
        private specialKeypadOn = 0;
        private boxMode = false;
        private noExpr = false;
        private inlineEditAt = -1;
        private inlineEditToken:AST.Token;
        private onNextDisplay:()=>void = null;
        private wrenchUndo = false;

        public isInlineEditing() { return this.visualRoot.getFlag("inline-editing"); }

        private expressionDisplay = div("line");
        private calcTopButtons = div("calcButtonsTop");
        private calcButtonsRight = div("calcButtonsRight");
        private calcMessage = div("errorMessage");
        private searchDiv = div("stmtEditorSide");
        private apiHelpDiv = div("calcApiHelp");
        private templateLine = divId("calcGoalLine", "calcTemplate");
        public enableNewPredictor = false;
        private calcDebugging = div("calcDebug");
        private suggestedAssignment = false;
        private inPropertyPosition = false;

        private tokenPlaceholder:HTMLElement;
        private lastTapTime = 0;
        private lastBackspaceTime = 0;
        private showAsync = true;

        // tutorial support
        public hasGoal:boolean;
        private storeVarName:string;
        public forceLoopLocalName:string;
        private currentInstruction:TutorialInstruction;
        private intelliInsertProperty:IProperty;

        static keypadWidth = 13;
        static keypadHeight = 3;

        static keypadWidthP = 7;
        static keypadWidthPh = 5;

        public init(p:Editor)
        {
            super.init(p);

            this.undoMgr = TheEditor.undoMgr;
            this.calcMessage.id = "calcMessage";
            this.expressionDisplay.id = "expressionDisplay";

            var begX = 0, begY = 0;
            var handler = new DragHandler(this.expressionDisplay,
                (tp:string, dx:number, dy:number, bx:number, by:number) => {
                    if (tp == "drag") {
                        var off = Util.offsetIn(this.expressionDisplay, elt("root"));
                        begX = bx - off.x;
                        begY = by - off.y;
                        this.handleExpressionTap(begX, begY, DragPhase.Begin);
                    } else if (tp == "move") {
                        this.handleExpressionTap(begX + dx, begY + dy, DragPhase.Move);
                    } else if (tp == "release") {
                        this.handleExpressionTap(begX + dx, begY + dy, bx ? DragPhase.ReleaseTap : DragPhase.ReleaseDrag);
                    }
                });
            handler.moveElt = false;

            this.topButtons = Util.range(0, 7).map(() => new CalcButton());

            this.buttons = Util.range(0, Calculator.keypadWidth * Calculator.keypadHeight).map(() => new CalcButton());

            this.searchApi.init(p);
            this.setupKeys();

            this.templateLine.withClick(() => {
                if (TheEditor.stepTutorial)
                    TheEditor.stepTutorial.needHelp();
            })
        }

        static keypadW()
        {
            return SizeMgr.phoneMode ? Calculator.keypadWidthPh :
                   SizeMgr.portraitMode ? Calculator.keypadWidthP : Calculator.keypadWidth;
        }

        private setupKeys()
        {
            var mkKeys = (beg:number, w:number) => {
                var res = []
                this.keyBlock(beg, w).forEach((k, i) => {
                    if (i > 0 && i % w == 0) res.push(document.createElement("br"));
                    res.push(k.getButton());
                });
                return res;
            }
            this.calcButtonsRight.setChildren(mkKeys(0, Calculator.keypadW()));
        }

        private keyBlock(column:number, len:number, row = 0, lines = Calculator.keypadHeight)
        {
            var res:CalcButton[] = [];
            var w = Calculator.keypadW();
            var pos = column + row * w;
            for (var i = 0; i < lines; ++i) {
                for (var k = 0; k < len; ++k) {
                    res.push(this.buttons[pos++]);
                }
                pos += w - len;
            }
            return res;
        }

        public newVar()
        {
            this.cursorPosition = 0;
            this.insertOp(":=");
            this.inlineEdit(this.expr.tokens[0]);
            // TheEditor.refreshDecl();
        }

        static buttonWidth = 100;
        static buttonHeight = 100;
        private setButtonSize()
        {
            var w = SizeMgr.editorWindowWidth;
            var h = SizeMgr.windowHeight;
            // calcButtonSize = Math.round(topFontSize * 100 / 24);
            Calculator.buttonWidth = Math.floor(w / Calculator.keypadW() - 2.5);
            Calculator.buttonHeight = (h * (SizeMgr.portraitMode ? 0.40 : 0.45) / (Calculator.keypadHeight + 1));
            if (Calculator.buttonHeight > Calculator.buttonWidth)
                Calculator.buttonHeight = Calculator.buttonWidth;

            this.apiHelpDiv.style.width = (SizeMgr.phoneMode ? 5 : 7) * (Calculator.buttonWidth + 2) + "px";
        }

        public applySizes()
        {

            this.setButtonSize();
            var setSize = (c:CalcButton) => c.setSize(Calculator.buttonWidth, Calculator.buttonHeight);
            this.buttons.forEach(setSize);
            this.topButtons.forEach(setSize);

            // expressionDisplay.style.height = SizeMgr.calcExpressionDisplaySize + "px";
            // expressionDisplay.style.width = SizeMgr.calcWidth - 26 + "px";
        }

        public tokenIdxAt(x:number, y:number, mode = 0)
        {
            var idx = this.expr.tokens.length;

            for (var i = 0; i < this.displayElts.length; ++i) {
                var e = this.displayElts[i];
                var idx0 = (<any>e).cursorIndex;
                if (idx0 === undefined) continue;

                // Util.log("check: " + e.offsetLeft + " " + e.offsetTop + " sz: " + e.offsetWidth + " " + e.offsetHeight);

                var xx = e.offsetLeft + e.offsetWidth;
                var xm = e.offsetLeft + e.offsetWidth / 2;
                var yy = e.offsetTop + e.offsetHeight;

                if (mode > 0)
                    xm = xx;

                var lowerHalf = false;

                if (e.offsetHeight > SizeMgr.topFontSize * 2 &&
                    e.offsetTop + e.offsetHeight / 2 <= y && y <= yy)
                    lowerHalf = true;

                if (y <= yy && (lowerHalf || xm <= x) && x <= xx) {
                    idx = idx0;
                    break;
                }

                if ((y <= yy && x <= xx) || y < e.offsetTop) {
                    var marg = 0.7*SizeMgr.topFontSize
                    if (mode == 1 && ((x - e.offsetLeft) < marg || (xx - x) < marg))
                        // too close to the edge for token editing
                        return -1;
                    if (idx0 == 0) idx = 0;
                    else idx = idx0 - 1;
                    break;
                }
            }

            return idx;
        }

        private handleExpressionTap(x:number, y:number, phase:DragPhase)
        {
            if (!this.expr) return;

            if (this.searchApi.visible) {
                this.searchApi.dismissing();
                // apperently, dismissing() can close us
                if (!this.expr) return;
            }

            var selIdx = this.tokenIdxAt(x, y, 1);
            if (selIdx >= this.expr.tokens.length)
                selIdx = -1;
            var editIdx = this.tokenIdxAt(x, y, 2);
            var idx = this.tokenIdxAt(x, y);

            //Util.log("tap: x={0} y={1} phase={2} tm={3}", x,y,phase,Util.now())

            if (phase == DragPhase.Begin) {
                this.cursorPosition = idx;
                this.wasSelectedBeforeTap = this.inSelectionMode();
                this.unselect();
            } else if (phase == DragPhase.Move) {
                if (idx != this.cursorPosition) {
                    this.selectionStart = Math.min(idx, this.cursorPosition);
                    this.selectionEnd = Math.min(Math.max(idx, this.cursorPosition) + 1, this.expr.tokens.length);
                    this.reselect();
                }
                return;
            } else if (phase == DragPhase.ReleaseTap) {
                var now = Util.now();
                var doubleTap = (now - this.lastTapTime < 500);
                this.lastTapTime = now;

                if (!this.wasSelectedBeforeTap && this.launchPlaceholderPicker(this.expr.tokens[editIdx])) {
                    // picker was launched, don't do anything
                    return
                } else if (selIdx >= 0 && !this.wasSelectedBeforeTap) {
                    this.selectionStart = selIdx;
                    this.selectionEnd = selIdx + 1;
                    this.cursorPosition = this.selectionEnd;
                    if (this.isPlaceholderToken(this.expr.tokens[selIdx]))
                        this.deleteSelectedTokens();
                } else if (doubleTap) {
                    if (this.expr.tokens.length == 0)
                        TheEditor.selector.startSelection()
                    else {
                        idx = this.tokenIdxAt(x, y, 2);
                        if (idx == this.expr.tokens.length) idx--;
                        if (idx < 0) this.unselect();
                        else {
                            this.selectionStart = idx;
                            this.selectionEnd = idx + 1;
                            this.cursorPosition = this.selectionEnd;
                            if (this.isPlaceholderToken(this.expr.tokens[idx]))
                                this.deleteSelectedTokens();
                        }
                    }
                }
                this.wasSelectedBeforeTap = false;
            } else if (phase == DragPhase.ReleaseDrag) {
                this.wasSelectedBeforeTap = false;
            } else {
                Util.die();
            }

            this.hideBottomScroller();
            this.display();
        }

        private resetState()
        {
            Ticker.dbg("Calculator.resetState")

            this.autoNameLocals = {};
            this.wrenchUndo = false;
            this.autoLocal = null;
            this.stmt = null;
            this.unselect();
            if (!this.expr) return;
            this.expr = null;
            this.searchDiv.removeSelf();
            this.hideBottomScroller();
            this.searchApi.resetState();
            this.searchApi.setVisible(false);
            this.showPerfectLine = false;
            this.hasGoal = false;
            this.currentInstruction = null;
            this.intelliInsertProperty = null;
            if (Script)
                Script.clearRecompiler();
            elt("leftPaneContent").setFlag("in-calculator", false)
        }

        public bye()
        {
            this.lastHideTime = Util.now();
            if (this.searchApi.visible)
                this.searchApi.dismissing();

            this.checkNextDisplay();
            console.log("about to resetstate");
            this.resetState();
            TheEditor.sideKeyFocus = false;
            TDev.Collab.setTemporaryPullSuppression(false);
        }

        public displayTokenPlaceholder(it:IntelliItem, terms:string[])
        {
            var toks = []
            if (it) {
                toks.push(it.getLongName());
            } else {
                if (this.inPropertyPosition)
                    toks.push("\u200A\u2192\u00A0")
            }
            this.tokenPlaceholder.setChildren(toks);
            Util.highlightWords(this.tokenPlaceholder, terms);
        }

        private fullDisplay()
        {
            TheEditor.refreshDecl();
            if (this.stmt) {
                this.edit(this.stmt);
                this.display();
            }
        }

        private fixCursorPosition()
        {
            if (this.cursorPosition < 0) this.cursorPosition = 0;
            if (this.cursorPosition > this.expr.tokens.length) this.cursorPosition = this.expr.tokens.length;
        }

        public checkNextDisplay()
        {
            var r = this.onNextDisplay;
            this.onNextDisplay = null;
            if (r) { r(); return true; }
            return false;
        }

        private typeCheck()
        {
            // There are two kind of pseudo-statements that need to be
            // type-checked on their own: record fields and action parameters
            // (both behave pretty much the same way).
            var a = TheEditor.currentAction();
            if (this.stmt instanceof AST.RecordField ||
                this.stmt instanceof AST.ActionParameter)
            {
                AST.TypeChecker.tcFragment(this.stmt.calcNode());
            } else if (a) {
                AST.TypeChecker.tcAction(a, false, this.expr);
            }
        }

        public display()
        {
            if (this.expr == null) return;

            if (this.checkNextDisplay()) return;

            if (this.searchApi.visible && this.searchApi.dismissing()) return;

            this.typeCheck();

            // this is a bit overzelous, but most likely if we display it, we'll edit it
            this.notifyChange(false);

            // var hasChanges = this.saveUndo();
            // if (hasChanges) TheEditor.live.poke();

            this.autoRename();

            // Check parse errors
            var errs = [];
            if (this.stmt.getError() != null) {
                var calcErr = div("calcError")
                Browser.setInnerHTML(calcErr, this.renderer.errorHTML(this.stmt));
                errs.push(calcErr)
            } else if (this.expr.hint && !TheEditor.stepTutorial) {
              errs.push(div("calcError", "\u270e " + this.expr.hint));
            }
            this.calcMessage.setChildren(errs);

            // Initialize arrays for storing HTML elements
            //  An array of HTML elements to be shown under
            //  this.expressionDisplay (<div class="line" id="expressionDisplay" />)
            var toks:HTMLElement[] = [];
            //  An array of HTML elements whose index correspond to those of tokens.
            this.displayElts = []

            this.fixCursorPosition();
            var tokens = this.expr.tokens;

            if ((this.stmt instanceof AST.RecordField || this.stmt instanceof AST.ActionParameter)
                && tokens.length == 0)
            {
                TheEditor.dismissSidePane();
                return;
            }

            var introE:HTMLElement;
            var outroE:HTMLElement;
            var st = (s:string, nb:string = "") => AST.proMode ? span("greyed", s) : (nb ? span("kw", nb) : null)

            if (this.stmt instanceof AST.For) {
                var iname = (<AST.For>this.stmt).boundLocal.getName()
                //introE = span("", [span("kw", "for "), span("greyed", "("), span("kw", "var "), span("greyed", iname + " = 0; " + iname + " < ")])
                if (AST.proMode) {
                    introE = span("", [span("kw", "for "), span("greyed", "("), span("kw", "var "), span("greyed", iname + " < ")])
                    outroE = span("greyed", " ) {")
                } else {
                    introE = span("", [span("kw", "for "), span("", " 0 ≤ " + iname + " < ")])
                    outroE = span("kw", " do")
                }
            } else if (this.stmt instanceof AST.Foreach) {
                if (AST.proMode) {
                    introE = span("", <any[]>[span("kw", "for each "), span("greyed", "("), span("kw", "var "),
                                span("greyed", (<AST.Foreach>this.stmt).boundLocal.getName()), span("kw", " in ")]);
                    outroE = span("greyed", " ) {")
                } else {
                    introE = span("", <any[]>[span("kw", "for each "),
                                span("", (<AST.Foreach>this.stmt).boundLocal.getName()), span("kw", " in ")]);
                    outroE = span("kw", " do")
                }
            } else if (this.stmt instanceof AST.Box) {
                introE = span("kw", "boxed ")
                outroE = st("{")
            } else if (this.stmt instanceof AST.While) {
                introE = span("", [span("kw", "while "), st("( ")])
                outroE = st(" ) {", " do")
            } else if (this.stmt instanceof AST.Where) {
                introE = span("", span("kw", "where "))
            } else if (this.stmt instanceof AST.ExprStmt) {
                if ((<AST.ExprStmt>this.stmt).isVarDef())
                    introE = span("kw",  "var ")
                if (this.isElse)
                    introE = span("kw",  "else ")
                if (this.stmt instanceof AST.InlineActions &&
                    (<AST.InlineActions>this.stmt).implicitAction())
                    outroE = st(" {", " do")
            } else if (this.stmt instanceof AST.If) {
                if ((<AST.If>this.stmt).isElseIf)
                    introE = span("", [st("} "), span("kw", "else if "), st("( ")])
                else
                    introE = span("", [span("kw", "if "), st("( ")])
                outroE = st(" ) {", " then")
            } else if (this.stmt instanceof AST.OptionalParameter) {
                introE = span("", [span("kw", "with "), span("", (<AST.OptionalParameter>this.stmt).getName() + " = ")])
            } else if (this.stmt instanceof AST.ActionParameter) {
                var ch = (<AST.ActionHeader> this.stmt.parent).children();
                if (this.stmt == ch[ch.length - 1])
                    outroE = st(")", "")
                else
                    outroE = st(",", "")
            } else {
            }

            if (introE) {
                (<any> introE).cursorIndex = 0;
                toks.push(introE);
                this.displayElts.push(introE);
            }

            // This place holder is to show auto-completion results at the current cursor position.
            this.tokenPlaceholder = span("tokenPlaceholder", "");

            var inlineEditor = null;

            tokens.forEach((t, i) => {
                // Get a HTML element corresponding to the current token
                var elt:HTMLElement;
                if (i == this.inlineEditAt) {
                    // disable dod while in calculator
                    if (this.expressionDisplay.parentElement)
                        this.expressionDisplay.parentElement.draggable = false;
                    this.inlineEditAt = -1;
                    this.inlineEditToken = t;
                    elt = this.inlineEditElement(t);
                    inlineEditor = elt;
                } else {
                    elt = this.renderer.tokenElement(t);
                }
                (<any> elt).cursorIndex = i + 1;
                t.renderedAs = elt;
                if (i >= this.selectionStart && i < this.selectionEnd)
                    elt.setFlag("selected", true);
                if (i == this.cursorPosition)
                    toks.push(this.tokenPlaceholder);
                this.displayElts.push(elt);
                toks.push(elt);
            });

            if (this.cursorPosition == tokens.length)
                toks.push(this.tokenPlaceholder);

            // Render the outro part
            if (outroE) {
                (<any> outroE).cursorIndex = tokens.length + 1;
                this.displayElts.push(outroE);
                toks.push(outroE);
            }

            var curs = div("calcCursor", "|");
            //(<any> curs).cursorIndex = cursorPosition;

            toks.forEach((e:HTMLElement, i:number) => {
                if (e == inlineEditor) return;
                e.className += " calcToken";
                var nxt = toks[i + 1];
                var spc = / $/.test(e.textContent) || (nxt && /^ /.test(nxt.textContent));
                if (spc)
                    // Add padding after this element if needed
                    e.className += " calcSpaceAfter";
            });
            if (toks.length == 1) {
                var e = span("calcInvisible", ".");
                toks.push(e);
                this.displayElts.push(e);
            }
            this.expressionDisplay.setChildren(toks);

            // Highlight the selected part
            if (this.selectionStart >= 0) {
                this.selectionStartMarker.position();
                this.selectionEndMarker.position();
                this.expressionDisplay.appendChildren([this.selectionStartMarker.cursor, this.selectionEndMarker.cursor]);
            }
            // If there's no selection, append a cursor to be rendered.
            else {
                var pos = this.screenPos(this.cursorPosition);
                curs.style.left = pos.x + "px";
                curs.style.top = pos.y + "px";
                this.expressionDisplay.appendChild(curs);
            }

            if (inlineEditor && inlineEditor.focusEditor) inlineEditor.focusEditor();
            this.expressionDisplay.setFlag("inline-editing", !!inlineEditor)
            this.visualRoot.setFlag("inline-editing", !!inlineEditor)

            // Setup intelli buttons (including input forms and available buttons on the calculator)
            this.setupIntelliButtons();

            this.restoreLeftKeypad(true);
            TheEditor.selector.positionButtonRows();

            var visualRootOverlay = divId('calcOverlay', '').withClick(() => TheEditor.dismissModalPane());
            this.visualRoot.appendChild(visualRootOverlay);

            Util.setTimeout(10, () => TheEditor.updateTutorial())
        }

        public reselect()
        {
            this.displayElts.forEach((t, i) => {
                t.setFlag("selected", (i >= this.selectionStart && i < this.selectionEnd));
            });
        }


        public screenPos(tokIdx:number, before = false)
        {
            var pos = {x:5, y:0};
            var cursorAfter:HTMLElement = this.displayElts.filter((e) => (<any>e).cursorIndex == tokIdx)[0];
            if (!cursorAfter) {
                cursorAfter = this.displayElts[0];
                before = true;
            }
            if (!cursorAfter) return pos;

            var withSpace = /calcSpaceAfter/.test(cursorAfter.className);

            pos.y = cursorAfter.offsetTop;

            if (before) {
                pos.x = cursorAfter.offsetLeft;
            } else {
                pos.x = cursorAfter.offsetLeft + cursorAfter.offsetWidth;
                if (withSpace)
                    pos.x -= SizeMgr.topFontSize * 0.5;
            }

            pos.x = Util.boundTo(0, pos.x, this.expressionDisplay.clientWidth - 5)
            return pos;
        }

        public getDisplayHeight() { return this.expressionDisplay.offsetHeight }

        private moveCursor(dir:number)
        {
            this.cursorPosBeforeSelection = -1;
            this.cursorPosition += dir;
            if (this.inSelectionMode()) {
                if (this.keyboardSelectionLeft) {
                    if (this.cursorPosition >= this.selectionEnd) {
                        this.unselect();
                    } else {
                        this.selectionStart = this.cursorPosition;
                    }
                } else {
                    if (this.cursorPosition <= this.selectionStart) {
                        this.unselect();
                    } else {
                        this.selectionEnd = this.cursorPosition;
                    }
                }
            }
            this.hideBottomScroller();
            this.display();
        }

        private kbdSelection(dir:number)
        {
            if (this.inSelectionMode()) {
                this.moveCursor(dir);
            } else {
                if (dir < 0) {
                    if (this.cursorPosition == 0) return;
                    this.keyboardSelectionLeft = true;
                    this.toggleSelection();
                } else {
                    if (this.cursorPosition == this.expr.tokens.length) return;
                    this.keyboardSelectionLeft = false;
                    this.cursorPosition += 1;
                    this.toggleSelection();
                }

            }
        }

        public nodeTap(n:AST.AstNode)
        {
            return false;

            /*TheEditor.dismissSidePane();
            return true;

            if (n instanceof AST.Stmt) {
                if (n == stmt) {
                    TheEditor.dismissSidePane();
                    return true;
                }
            }

            return false;
            */
        }

        public undo()
        {
            tick(Ticks.calcUndo)

            if (this.expr == null) return false;

            // save the current state (overriding any previous identical state)
            this.saveUndo();
            // and discard it
            this.undoMgr.popCalcState();

            // this is the new state
            var s = this.undoMgr.popCalcState();

            if (!s) {
                this.saveUndo(); // make sure the stack is not empty
                TheEditor.dismissSidePane(); // last undo is hiding the calculator
                return true;
            }

            var node = AST.Parser.parseExprHolder(s.expr);
            this.deleteTokens(0, this.expr.tokens.length);
            this.insertTokens(node.tokens);
            this.cursorPosition = s.cursorPosition;
            this.unselect();
            this.display();
            return true;
        }

        private saveUndo()
        {
            var prev = this.undoMgr.peekCalcState();
            var curr =
                {
                    expr: this.expr.serialize(),
                    cursorPosition: this.cursorPosition
                };
            if (!!prev && prev.expr == curr.expr) {
                prev.cursorPosition = this.cursorPosition;
                return false;
            } else {
                this.undoMgr.pushCalcState(curr);
                return true;
            }
        }

        public isActive() { return this.expr != null; }

        private setupIntelliProfile()
        {
            this.showAsync = asyncEnabled;
            if (!TheEditor.widgetEnabled("async")) {
                this.showAsync = false;
            }
        }

        public editedStmt():AST.Stmt { return this.stmt; }

        private importTokens()
        {
        }

        private exportTokens()
        {
        }

        public edit(s:AST.Stmt) : void
        {
            tick(Ticks.calcEdit)

            // disable collab pulls
            TDev.Collab.setTemporaryPullSuppression(true);

            this.wrenchUndo = false;
            this.setButtonSize();
            this.setupIntelliProfile();

            var wasActive = Util.now() - this.lastHideTime < 500;

            this.undoMgr.clearCalc();
            this.stmt = s;
            this.boxMode = s instanceof AST.Box;
            this.noExpr = this.boxMode

            Ticker.dbg("Calc.edit0");
            elt("leftPaneContent").setFlag("in-calculator", true)

            if (s instanceof AST.Foreach) {
                var loc = (<AST.Foreach>s).boundLocal;
                if (/^e\s*\d*$/.test(loc.getName()))
                    this.autoLocal = loc;
            }

            s.setupForEdit()

            var ch = Util.childNodes(s.renderedAs);
            this.isElse = s.renderedAs.getFlag("elseDoNothing") || s.renderedAs.getFlag("elseIf");
            ch[0] = this.expressionDisplay;
            var len = 1; // <br>
            if (ch[2] && /Message$/.test(ch[2].className)) {
                len++;
                if (ch[3] && "errorBr" === ch[3].className) len++;
            }
            ch.splice(1, len, this.calcMessage);
            if (TheEditor.stepTutorial) {
                this.templateLine.setChildren([])
                this.templateLine.style.display = "none";
                ch.splice(1, 0, this.templateLine)
            }
            if (this.enableNewPredictor) {
                ch.push(this.calcDebugging);
            }
            s.renderedAs.setChildren(ch);

            Ticker.dbg("Calc.edit1");

            var c = s.calcNode();
            if (!c) return;
            if (c == this.expr) {
                this.importTokens()
                return;
            }
            this.expr = c;
            if (this.expr.isPlaceholder())
                this.expr.tokens = [];
            this.importTokens()
            this.cursorPosition = this.expr.tokens.length;
            // Position the cursor right after the colon so that suggestions for
            // types appear right away.
            if (s instanceof AST.RecordField || s instanceof AST.ActionParameter)
                this.cursorPosition = 1;

            Ticker.dbg("Calc.edit2");

            this.setupCalcElements(!wasActive);

            this.unselect();
            this.setupKeys();
            this.setupKeypad();
            this.display();

            TheEditor.showStmtEditor(this);

            this.searchApi.visible = true;
            this.restoreLeftKeypad(false);
            Util.setTimeout(1, () => this.searchApi.setSize());

            var optionsParm = this.getOptionsParameter()
            if (optionsParm && !(<AST.OptionalParameter>this.stmt).getName())
                this.editOptional(optionsParm)

            // Edit the record name right away, that's all we can do anyhow.
            if (s instanceof AST.RecordNameHolder) {
                this.inlineEdit(this.expr.tokens[0]);
            }

            /*
            if (wasActive)
                Util.showPanel(expressionDisplay);
            else
                Util.showPanel(visualRoot);
            */
        }

        private setupCalcElements(slideIn:boolean)
        {
            this.calcTopButtons.removeSelf();
            this.calcButtonsRight.removeSelf();
            this.searchApi.visualRoot.removeSelf();

            if (TheEditor.autoHide()) {
            } else {
                this.searchDiv.setChildren([this.searchApi.visualRoot]);
                this.searchDiv.removeSelf();
                elt("stmtEditorLeftTop").setChildren([this.searchDiv]);
            }

            this.searchApi.queueNavRefresh();
            // searchApi.refresh();
            this.visualRoot = div("stmtEditor" + (slideIn ? " showFromBelow" : ""), this.calcTopButtons, div("calcButtonsClear"), this.calcButtonsRight, div("calcButtonsClear"));
            this.visualRoot.style.left = "0px";
            this.visualRoot.style.right = "0";
            this.visualRoot.style.width = "auto";
            this.hideBottomScroller();
        }

        private deleteSelectedTokens()
        {
            this.deleteTokens(this.selectionStart, this.selectionEnd - this.selectionStart);
            this.cursorPosBeforeSelection = -1;
            this.cursorPosition = this.selectionStart;
            this.unselect();
        }

        private backspace(isDel = false)
        {
            tick(Ticks.calcBackspace);
            if (this.stmt instanceof AST.RecordNameHolder)
                return;

            var now = Util.now();
            var quick = (now - this.lastBackspaceTime) < 500;
            this.lastBackspaceTime = now;

            if (this.inSelectionMode()) {
                this.deleteSelectedTokens();
                this.display();
            } else {
                if ((isDel && this.expr.tokens.length == this.cursorPosition) ||
                    (!quick && this.expr.tokens.length == 0)) {
                    TheEditor.selector.deleteSelection();
                    TheEditor.dismissSidePane();
                    return;
                }

                if (isDel) {
                    if (this.cursorPosition == this.expr.tokens.length) return;
                } else {
                    if (this.cursorPosition == 0) return;
                    this.cursorPosition--;
                }
                this.deleteTokens(this.cursorPosition, 1);
                this.display();
            }
        }

        // property getSideTab() => searchApi;

        public handleKey(e:KeyboardEvent) : boolean
        {
            if (this.onNextDisplay && (e.keyName == "Esc" || (e.keyName == "Enter" && !e.fromTextArea))) {
                this.display();
                return true;
            }

            if (!this.expr) return false;

            if (e.fromTextArea) return false;
            if (ModalDialog.currentIsVisible()) return false;

            if (this.searchApi.visible && this.searchApi.handleKey(e))
                return true;

            var prevOp = "";
            var prev: AST.Token;
            var prevLit : AST.Literal;
            if (this.cursorPosition > 0) {
                prev = this.expr.tokens[this.cursorPosition - 1];
                if (prev instanceof AST.Operator) {
                    prevOp = (<AST.Operator>prev).data;
                }

                if (prev instanceof AST.Literal)
                    prevLit = <AST.Literal>prev;
            }

            if (!e.fromTextBox && e.keyCode == 8) {
                this.backspace();
                return true;
            }

            if (e.fromTextBox) return false;

            switch (e.keyName) {
            case "Left":
                this.moveCursor(-1);
                break;
            case "Right":
                this.moveCursor(+1);
                break;
            case "Home":
                this.moveCursor(-1000);
                break;
            case "End":
                this.moveCursor(+1000);
                break;
            case "Enter":
                if (this.cursorPosition == 0 && this.expr.tokens.length > 0)
                    TheEditor.selector.addCallback(-1)();
                else
                    TheEditor.selector.addCallback(2)();
                break;
            case "Del":
                this.backspace(true);
                break;
            case "Esc":
                if (this.searchApi.visible)
                    this.display();
                else if (this.inSelectionMode()) {
                    this.unselect();
                    this.display();
                }
                else
                    TheEditor.dismissSidePane();
                break;
            case "Up":
                TheEditor.moveEditorCarret(-1);
                break;
            case "Down":
                TheEditor.moveEditorCarret(+1);
                break;
                //TheEditor.dismissSidePane(); return false; // make the editor handle the key

            case "Shift-Left":
                this.kbdSelection(-1);
                break;
            case "Shift-Right":
                this.kbdSelection(+1);
                break;

            case "Tab":
                this.searchApi.show();
                break;

            default:
                if (e.fromTextBox) return false;
                var c = String.fromCharCode(e.charCode);
                switch (c) {
                case "0":
                case "1":
                case "2":
                case "3":
                case "4":
                case "5":
                case "6":
                case "7":
                case "8":
                case "9":
                case "(":
                case ")":
                case ",":
                    this.insertOp(c);
                    break;
                case "!":
                    this.insertOp("not");
                    break;
                case "&":
                    this.insertOp("and");
                    break;
                case "|":
                    if (prevOp == "or" && TheEditor.widgetEnabled("stringConcatProperty"))
                        this.replaceOp("\u2225", prev);
                    else
                        this.insertOp("or");
                    break;
                case ".":
                    if ((/[0-9]/.test(prevOp) && !TheEditor.widgetEnabled("integerNumbers")) || !this.inPropertyPosition)
                        this.insertOp(".");
                    else
                        this.searchApi.show();
                    break;
                case ':':
                    this.insertOp(":=");
                    break;
                case "/":
                    if (prevOp == "/" && this.expr.tokens.length == 1) {
                        this.deleteTokens(0, 1);
                        TheEditor.selector.changeStmtType("//");
                    } else {
                        this.insertOp("/");
                    }
                    break;
                case ">":
                    if (prevOp == "-") {
                        this.backspace()
                        this.searchApi.show()
                    } else {
                        this.insertOp(">");
                    }
                    break;
                case "=":
                    switch (prevOp) {
                    case "<":
                        this.replaceOp("\u2264", prev);
                        break;
                    case ">":
                        this.replaceOp("\u2265", prev);
                        break;
                    case "not":
                        this.replaceOp("\u2260", prev);
                        break;
                    case ":=":
                        // do nothing
                        break;
                    default:
                        this.insertOp("=");
                        break;
                    }
                    break;
                case "'":
                case '"':
                    if (this.canInlineEdit(prev))
                        this.inlineEdit(prev)
                    else
                        this.insertString();
                    break;
                case ";":
                    TheEditor.selector.addCallback(+1)();
                    break;
                case "^":
                    this.moveCursor(-1000);
                    break;
                case "$":
                    this.moveCursor(+1000);
                    break;
                default:
                    if (api.operatorKeys[c]) {
                        this.insertOp(c);
                        break;
                    } else if (/^[a-zA-Z\?]$/.test(c)) {
                        tick(Ticks.calcKeyboardSearch);
                        this.searchApi.show(c);
                        return true;
                    } else {
                        return false;
                    }
                }
            }

            tick(Ticks.calcSpecialKey)

            return true;
        }

        private insertAssignmentOp()
        {
            var numArgs = 1;

            if (!!this.expr.parsed) {
                var act = this.expr.parsed.anyCalledAction()
                if (!!act && act.hasOutParameters())
                    numArgs = act.getOutParameters().length;
            }

            this.addMissingArgsCore(numArgs);
            this.insertToken(AST.mkOp(":="));
        }

        private addMissingArgsCore(numArgs:number)
        {
            var a = TDev.TheEditor.currentAction();
            while (numArgs-- > 0) {
                var name = a.nameLocal("x", this.autoNameLocals);
                this.autoNameLocals[name] = true;
                if (this.cursorPosition > 0 && this.expr.tokens[this.cursorPosition - 1].getText() != ",")
                    this.insertToken(AST.mkOp(","));
                this.insertToken(AST.mkThing(name));
            }
        }

        private addMissingArgs(n:number)
        {
            var idx = -1;
            this.expr.tokens.some((t:AST.Token, i:number) => {
                if (t.getText() == ":=") { idx = i; return true }
                return false
            });
            if (idx >= 0) {
                this.cursorPosition = idx;
                this.addMissingArgsCore(n);
            }
            this.unselect();
            this.wrenchUndo = true
            this.display();
        }

        public insertOp(o:string, topLevel = false) : void
        {
            if (o == null || o == undefined || o == "") return;

            if (topLevel) {
                if (/^[0-9\.]$/.test(o)) tick(Ticks.calcNumber);
                else if (/^[(),-]$/.test(o)) tick(Ticks.calcDedicatedOp);
                else if (o == "not") tick(Ticks.calcNot);
                else if (o == "async") tick(Ticks.calcAsync);
                else if (o == "return") tick(Ticks.codeReturn);
                else if (o == "break") tick(Ticks.codeBreak);
                else if (o == "continue") tick(Ticks.codeContinue);
                else if (o == "show") tick(Ticks.codeShow);
                else if (o == "true" || o == "false") tick(Ticks.calcTrueFalse);
            }

            var keepKeypad = /^[0-9\.-]$/.test(o);

            var pos = this.lastOpenBracePos;
            this.lastOpenBracePos = -1;

            var prevTok = this.expr.tokens[this.cursorPosition - 1]
            var prev2Tok = this.expr.tokens[this.cursorPosition - 2]
            if (/^[0-9\-]$/.test(o) &&
                prevTok && prevTok.getOperator() == "0" &&
                (!prev2Tok || !/^[0-9\.]$/.test(prev2Tok.getOperator()))) {
                this.cursorPosition--;
                this.deleteTokens(this.cursorPosition, 1);
            }


            if (o == "(" && pos > 0 && pos < this.expr.tokens.length) {
                this.cursorPosition = pos;
            } else {
                var n:AST.Token = AST.mkOp(o);
                if (o == "true" || o == "false")
                    n = AST.mkLit(o == "true");

                if (this.cursorPosition == 0 && o == ":=") {
                    this.insertAssignmentOp();
                } else {
                    this.insertToken(n);
                }
            }

            if (this.specialKeypadOn && !keepKeypad)
                this.switchToNormalKeypad();
            this.display();
        }

        private replaceOp(o:string, prev:AST.Token) : void
        {
            var idx = this.expr.tokens.indexOf(prev)
            if (idx >= 0) {
                this.unselect();
                this.cursorPosition = idx;
                this.deleteTokens(this.cursorPosition, 1);
            }
            this.insertOp(o);
        }

        private inlineEditFieldName(l: AST.FieldName) {
            var inp = HTML.mkTextInput("text", lf("rename"));
            inp.id = "nameLocal";
            inp.classList.add("colonAfter");
            inp.style.width = ((l.data.length + 5) * 0.45) + "em";
            inp.value = l.data;

            this.onNextDisplay = () => {
                this.inlineEditToken = null;
                if (this.expr == null) return;
                l.data = TheEditor.tutorializeName(inp.value);
                if (TheEditor.autoHide())
                    this.switchToNormalKeypad();
                this.display();
            };

            var wrapper = div("", inp, ": ");
            (<any>wrapper).focusEditor = () => {
                Util.setKeyboardFocus(inp);
            };
            wrapper.style.display = "inline";
            return wrapper;
        }

        private inlineLiteralEditor(l: AST.Literal) {
            var literalEditor: LiteralEditor;
            if (/^bitmatrix$/.test(l.languageHint)) literalEditor = new BitMatrixLiteralEditor(this, l);
            else literalEditor = new TextLiteralEditor(this, l);
            return literalEditor;
        }

        private inlineEditString(l:AST.Literal)
        {
            var editor = TheEditor;
            var literalEditor = this.inlineLiteralEditor(l);

            this.onNextDisplay = () => {
                this.inlineEditToken = null;
                if (this.expr == null) return;
                l.data = literalEditor.value();
                if (editor.autoHide())
                    this.switchToNormalKeypad();
                this.display();
                editor.selector.positionButtonRows();
                if (this.stmt instanceof AST.RecordNameHolder)
                    editor.dismissSidePane();
            };

            return literalEditor.editor();
        }

        private inlineEditDecl(l:AST.Decl)
        {
            var inp = HTML.mkTextInput("text", lf("rename"));
            inp.id = "nameLocal";
            inp.style.width = ((l.getName().length + 5) * 0.45) + "em";
            inp.value = l.getName();
            (<any>inp).focusEditor = () => {
                Util.setKeyboardFocus(inp);
            };

            this.onNextDisplay = () => {
                this.inlineEditToken = null;
                if (this.expr == null) return;
                var a = TDev.TheEditor.currentAction();

                var v0 = TheEditor.tutorializeName(inp.value)

                if (l.getName() == v0 || !a || /^\s*$/.test(v0)) {
                    this.fullDisplay()
                    return
                }

                var v1 = l instanceof AST.LocalDef ? a.nameLocal(v0) : Script.freshName(v0)
                var renamed = false

                var finish = () => {
                    renamed = true
                    l.setName(v1)
                    if (!(l instanceof AST.LocalDef))
                        TheEditor.queueNavRefresh();
                    this.fullDisplay()
                }

                if (v0 != v1 && l instanceof AST.LocalDef)
                    v1 = v0;
                finish()
            };

            return inp;
        }

        private canInlineEdit(t:AST.Token)
        {
            if (!t) return false

            return typeof t.getLiteral() == "string" ||
                   t.getThing() instanceof AST.LocalDef ||
                   (t.getProperty() && t.getProperty().canRename());
        }

        private inlineEditElement(t:AST.Token):HTMLElement
        {
            Ticker.dbg("inlineEditElt");

            if (t instanceof AST.FieldName) {
                return this.inlineEditFieldName(<AST.FieldName>t);
            } else if (typeof t.getLiteral() == "string") {
                return this.inlineEditString(<AST.Literal>t);
            } else if (t.getThing() instanceof AST.LocalDef) {
                return this.inlineEditDecl(<AST.Decl>t.getThing());
            } else if (t.getProperty() instanceof AST.PropertyDecl) {
                return this.inlineEditDecl(<any>t.getProperty());
            }

                // TheEditor.keyMgr.register("Esc", function() { cancelIt = true; m.dismiss(); return true });
                //TheEditor.keyMgr.register("Enter", () => { m.dismiss(); return true });

            Util.log("no edit for at {0} for {1} - {2} {3}", this.expr.tokens.indexOf(t), this.expr.serialize(), t.nodeType(), t.getThing())

            Util.check(false, "no-edit");
            return div(null);
        }

        public inlineEdit(l:AST.Token)
        {
            this.unselect();
            if (this.checkNextDisplay()) return;
            this.inlineEditAt = this.expr.tokens.indexOf(l);
            this.display();
        }

/*
        private editNumber(tk: TokenKind)
        {
            // Look for the whole number expression
            var numberRegExp = /^[0-9\.]$/;
            var numChars: string[] = [];
            var toks = tk.par.expr.tokens;
            var beg = tk.par.cursorPosition;
            var end = tk.par.cursorPosition;
            for (end = beg; end < toks.length; end++)
                if (!(toks[end] instanceof AST.Operator)
                        || !numberRegExp.test((<AST.Operator>toks[end]).data))
                    break;
            end--;
            for (beg = beg - 1; beg >= 0; beg--)
                if (!(toks[beg] instanceof AST.Operator)
                        || !numberRegExp.test((<AST.Operator>toks[beg]).data))
                    break;
            beg++;

            var c = new NumberCharm();
            c.init(toks.slice(beg, end + 1));

            c.onUpdate = (toks: AST.Token[]) => {
                if (c.getLastTokens() === null) {
                    if (c.getInitialTokens() !== null) {
                        this.deleteTokens(beg, c.getInitialTokens().length);
                    }
                } else {
                    this.deleteTokens(beg, c.getLastTokens().length);
                }
                var cursorPosition = beg;
                toks.forEach((t) => {
                    this.expr.tokens.splice(cursorPosition++, 0, t);
                });
                this.notifyChange();
                this.display();
            };

            c.onEntered = () => {
                if (c.getLastTokens() !== null) {
                    this.cursorPosition = beg + c.getLastTokens().length;
                }
                this.display();
            };

            c.onCancelled = () => {
                if (c.getLastTokens() !== null) {
                    this.deleteTokens(beg, c.getLastTokens().length);
                    c.getInitialTokens().forEach((t) => {
                        this.expr.tokens.splice(beg, 0, t);
                    });
                    this.notifyChange();
                }
                this.display();
            };

            var posLeft = Util.offsetIn(toks[beg].renderedAs, elt("scriptEditor"));
            var posRight = Util.offsetIn(toks[end].renderedAs, elt("scriptEditor"));
            var x = (posLeft.x + (posRight.x + toks[end].renderedAs.clientWidth)) / 2;
            x -= c.getWidth() / 2;
            var y = posLeft.y + SizeMgr.topFontSize * 1.5 + 5;
            var w = c.getWidth();
            var add = 14;
            if (x + w + add > SizeMgr.windowWidth) {
                x = SizeMgr.windowWidth - add - w;
            }
            c.show(x, y);
        }
*/

/*
        private editColor(th: AST.ThingRef)
        {
            var c = new ColorCharm();
            c.init(th.loc.tokens.slice(th.loc.beg + th.loc.len));

            c.onUpdate = (toks: AST.Token[]) => {
                if (c.getLastTokens() === null) {
                    if (c.getInitialTokens() !== null) {
                        this.deleteTokens(this.cursorPosition, c.getInitialTokens().length);
                    }
                } else {
                    this.deleteTokens(this.cursorPosition, c.getLastTokens().length);
                }
                var cursorPosition = this.cursorPosition;
                toks.forEach((t) => {
                    this.expr.tokens.splice(cursorPosition ++, 0, t);
                });
                this.notifyChange();
                this.display();
            };

            c.onEntered = () => {
                if (c.getLastTokens() !== null) {
                    this.cursorPosition += c.getLastTokens().length;
                }
                this.display();
            };

            c.onCancelled = () => {
                if (c.getLastTokens() !== null) {
                    this.deleteTokens(this.cursorPosition, c.getLastTokens().length);
                    c.getInitialTokens().forEach((t) => {
                        this.expr.tokens.splice(this.cursorPosition, 0, t);
                    });
                }
                this.notifyChange();
                this.display();
            };

            var origElt = th.renderedAs;
            var pos = Util.offsetIn(origElt, elt("scriptEditor"));
            pos.y += SizeMgr.topFontSize * 1.5 + 5;
            var w = c.getWidth();
            var add = 14;
            if (pos.x + w + add > SizeMgr.windowWidth) {
                pos.x = SizeMgr.windowWidth - add - w;
            }
            c.show(pos.x, pos.y);
        }
*/

        private insertString()
        {
            var prev = this.expr.tokens[this.cursorPosition - 1];
            if (prev instanceof AST.Literal) {
                var lit = <AST.Literal>prev;
                if (typeof lit.data == "string") {
                    this.inlineEdit(lit);
                    return;
                }
            }

            tick(Ticks.calcInsertString);
            var n = AST.mkLit("");
            this.insertToken(n);
            this.unselect();
            this.display();
            this.inlineEdit(n);
        }

        private autoFixup()
        {
            var info = this.expr.assignmentInfo();

            if (!!info && info.missingArguments > 0 &&
                info.targets.every((t:AST.Expr) =>
                    t instanceof AST.ThingRef && this.autoNameLocals.hasOwnProperty(t.getText())))
            {
                this.addMissingArgs(info.missingArguments);
                return true;
            }

            return false;
        }

        private autoRenameLocal(src:AST.LocalDef, l:AST.LocalDef)
        {
            var a = TDev.TheEditor.currentAction();
            if (a && src) {
                var nm = src.getName();
                var k = src.getKind();
                if ((!nm || src == l) && k.isData && k != api.core.Unknown) nm = src.getKind().getStemName();
                var currStem = l.getName().replace(/[0-9]+$/, "");
                if (!!nm && nm.replace(/[0-9]+$/, "") != currStem) {
                    var newName = a.nameLocal(nm, this.autoNameLocals);
                    // if we don't get the full hit, remove trailing numbers
                    if (newName != nm)
                        newName = a.nameLocal(nm.replace(/[0-9]+$/, ""), this.autoNameLocals);
                    l.rename(newName);
                }
            }
            this.autoNameLocals[l.getName()] = true;
        }

        private autoRename()
        {
            if (this.autoLocal && this.autoLocal.getKind() != api.core.Unknown) {
                this.autoRenameLocal(this.autoLocal, this.autoLocal);
            }

            if (this.expr.tokens.length < 3) return;

            var info = this.expr.assignmentInfo();

            if (!!info) {
                var locals:AST.LocalDef[] = info.targets.map((t:AST.Expr) => {
                    if (t instanceof AST.ThingRef && this.autoNameLocals.hasOwnProperty(t.getText()))
                        return this.getLocals().filter((l:AST.LocalDef) => l.getName() == t.getText())[0];
                    else
                        return undefined;
                });

                this.autoNameLocals = {};
                locals.forEach((l:AST.LocalDef, i:number) => {
                    if (l)
                        this.autoRenameLocal(info.sources[i], l);
                });
            }
        }

        public onIntelliScroll()
        {
            if (!this.searchApi.visible) {
                TheEditor.hideVideo();
                this.searchApi.setVisible(true);
                if (TheEditor.autoHide()) {
                    elt("rightPane").setChildren([this.searchApi.visualRoot]);
                    TheEditor.showSidePane();
                } else {
                    this.searchDiv.style.height = "100%";
                }
            }
        }

        private restoreLeftKeypad(anim = true)
        {
            if (this.searchApi.visible) {
                this.searchApi.setVisible(false);
                if (TheEditor.autoHide()) {
                    TheEditor.hideSidePane();
                } else {
                    var v = this.calcButtonsRight.offsetHeight
                    this.searchDiv.style.height = SizeMgr.windowHeight - v + "px";
                }
            }
        }

        private setupMiscKeypad()
        {
            this.specialKeypadOn = 2;

            var ops = this.keyBlock(0, 3, 2, 1);
            ops[0].setText("(", "", this.insertFn);
            ops[1].setText(")", "", this.insertFn);
            ops[2].setText(",", "", this.insertFn);

            var bools = this.keyBlock(1, 1);
            bools[0].setText("true", "", this.insertFn);
            bools[1].setText("false", "", this.insertFn);

            var empty = this.keyBlock(2, 2, 0, 2);
            empty.forEach((b) => b.clear())
            if (this.showAsync)
                empty[2].setText("async", "", () => this.asyncAwait(), "1em")

            var strs = this.keyBlock(0, 1);
            strs[0].setText("\"abc\"", lf("string"), () => this.insertString());
            strs[1].setText("not", lf("logical negation"), this.insertFn);

            this.regKeypadKey(this.keyBlock(4, 1)[1]);

            TheEditor.updateTutorial();
        }

        private regKeypadKey(b:CalcButton)
        {
            b.setTextEx("OK", lf("regular keypad"), Ticks.calcBtnNormalKeypad, () => this.switchToNormalKeypad());
            b.setIntelli();
        }

        private setupNumKeypad()
        {
            var pm = SizeMgr.portraitMode;
            var ph = SizeMgr.phoneMode;
            this.specialKeypadOn = 1;

            var numBtns = this.keyBlock(ph ? 0 : 1, 3);
            for (var i = 0; i < 9; ++i)
                numBtns[i].setText(i + 1 + "", "", this.insertFn);

            var numAdd = this.keyBlock(ph ? 3 : 4, 1);
            numAdd[0].setText("0", "", this.insertFn);
            if (TheEditor.widgetEnabled("integerNumbers"))
                numAdd[1].clear()
            else numAdd[1].setText(".", lf("decimal dot"), this.insertFn);
            numAdd[2].setText("-", lf("negation"), this.insertFn);

            if (!ph) {
                var miscButtons = this.keyBlock(5, 1);

                miscButtons[0].setText("true", "", this.insertFn);
                miscButtons[1].setText("false", "", this.insertFn);
                if (!pm) miscButtons[2].clear();

                miscButtons = this.keyBlock(0, 1);
                miscButtons[0].setText("\"abc\"", lf("string"), () => this.insertString());
                miscButtons[1].setText("not", lf("logical negation"), this.insertFn);
                if (pm)
                    this.regKeypadKey(miscButtons[2]);
                else
                    miscButtons[2].clear();
            } else {
                miscButtons = this.keyBlock(4, 1);
                this.regKeypadKey(miscButtons[1]);
                miscButtons[2].clear();
            }

            TheEditor.updateTutorial();
        }

        private switchToNumberKeypad()
        {
            tick(Ticks.calcSwitchToNumber);
            this.setupNumKeypad();
        }

        private switchToMiscKeypad()
        {
            tick(Ticks.calcSwitchToNumber);
            this.setupMiscKeypad();
        }

        private switchToNormalKeypad()
        {
            tick(Ticks.calcSwitchToNormal);
            this.setupKeypad();
            this.setupIntelliButtons();
            TheEditor.updateTutorial();
        }

        private asyncAwait()
        {
            this.insertOp("async")
        }

        private setupKeypad()
        {
            var pm = SizeMgr.portraitMode;
            var ph = SizeMgr.phoneMode;

            if (!pm) this.setupNumKeypad();
            this.specialKeypadOn = 0;

            if (this.noExpr) {
                this.buttons.forEach((b) => b.clear())
                return;
            }

            var editBtns = this.keyBlock(ph ? 4 : pm ? 6 : 12, 1);
            editBtns[0].setImage("svg:backspace,black,clip=80", lf("backspace"), Ticks.calcBtnBackspace, () => { this.backspace() });
            editBtns[1].setImage("svg:undo,black", lf("undo"), Ticks.calcBtnUndo, () => this.undo());

            if (ph) {
                editBtns = this.keyBlock(0, 5, 2, 1);
                editBtns[0].setTextEx("123", lf("number entry"), Ticks.calcBtnNumberKeypad, () => this.switchToNumberKeypad());
                editBtns[1].setTextEx("\"(,)\"", "\"...\", not, true", Ticks.calcBtnMiscKeypad, () => this.switchToMiscKeypad());
                editBtns[2].clear();
            } else {
                editBtns = this.keyBlock(pm ? 0 : 6, 7, 2, 1);

                if (pm) {
                    editBtns[0].setTextEx("123", "\"...\", not, true", Ticks.calcBtnNumberKeypad, () => this.switchToNumberKeypad());
                } else {
                    editBtns[0].clear();
                }

                editBtns[1].setText("(", "", this.insertFn);
                editBtns[2].setText(")", "", this.insertFn);
                editBtns[3].setText(",", "", this.insertFn);
                if (this.showAsync)
                    editBtns[4].setText("async", "", () => this.asyncAwait(), "1em")
                else
                    editBtns[4].clear();
            }

            var cursorKeys = this.keyBlock(ph ? 3 : pm ? 5 : 11, 2, 2, 1);
            cursorKeys[0].setImage("svg:cursorLeft,black", lf("move cursor"), Ticks.calcMoveCursorLeft, () => this.moveCursor(-1));
            cursorKeys[1].setImage("svg:cursorRight,black", lf("move cursor"), Ticks.calcMoveCursorRight, () => this.moveCursor(+1));

            this.restoreLeftKeypad(false);
        }


        public insertThing(d:AST.Decl)
        {
            this.lastOpenBracePos = -1;
            this.insertToken(AST.mkThing(d.getName()));
            if (d instanceof AST.SingletonDef)
                (<AST.SingletonDef> d).usage.localCount += 10;
            this.unselect();
            this.display();
        }

        private getFunToken():AST.Operator
        {
            var res:AST.Operator = null

            this.expr.tokens.forEach((t, i) => {
                if (i <= this.cursorPosition && t.getFunArgs()) res = <AST.Operator>t
            })

            return res
        }

        private getLocals() : AST.LocalDef[]
        {
            var res:AST.LocalDef[] = []
            this.expr.tokens.forEach((t, i) => {
                if (i <= this.cursorPosition && t.getFunArgs()) {
                    var cl = (<AST.Operator>t).call
                    if (cl) {
                        var fa = cl.funAction
                        if (fa)
                            res.pushRange(fa.inParameters)
                    }
                }
            })

            var locs = this.expr.locals.concat(res)
            locs = locs.filter(loc => !loc.isSynthetic)
            return locs;
        }

        private findDefault(p:PropertyParameter)
        {
            if (TheEditor.intelliProfile && TheEditor.intelliProfile.hasFlag("nodefaults"))
                return [AST.mkPlaceholder(p)]

            return AST.Fixer.findDefault(p, this.getLocals().filter(l => !l.isOut))
        }

        private removePlaceholder()
        {
            var pos = this.cursorPosition
            if (this.isPlaceholderToken(this.expr.tokens[pos - 1])) {
                this.deleteTokens(pos - 1, 1);
                this.cursorPosition--;
            } else if (this.isPlaceholderToken(this.expr.tokens[pos])) {
                this.deleteTokens(pos, 1);
            }
        }

        private insertToken(tok:AST.Token)
        {
            if (this.inSelectionMode()) this.deleteSelectedTokens();
            this.fixCursorPosition();
            this.removePlaceholder();
            this.expr.tokens.splice(this.cursorPosition++, 0, tok);
            this.notifyChange();
        }

        private insertTokens(instoks:AST.Token[])
        {
            if (this.inSelectionMode()) this.deleteSelectedTokens();
            this.fixCursorPosition();
            this.removePlaceholder();
            instoks.forEach((t) => {
                this.expr.tokens.splice(this.cursorPosition, 0, t);
                this.cursorPosition++;
            });
            this.notifyChange();
        }

        private deleteTokens(start:number, len:number)
        {
            this.expr.tokens.splice(start, len);
            this.notifyChange();
        }

        private notifyChange(clearWrench = true)
        {
            Ticker.dbg("Calculator.notifyChange");
            if (clearWrench) {
                this.exportTokens()
                this.wrenchUndo = false;
            }
            this.stmt.notifyChange();
        }

        private handlePropReplacement(p:IProperty)
        {
            var getProp = (off:number):IProperty => {
                var tok = this.expr.tokens[this.cursorPosition + off]
                return tok ? tok.getProperty() : null;
            }

            var before = getProp(-1);
            if (before && before.parentKind == p.parentKind && before.getResult().getKind() != p.parentKind)
                this.cursorPosition--;

            var after = getProp(0);
            if (after && !p.getResult().getKind().getProperty(after.getName())) {
                var len = 1;
                // paramter #0 is 'this'
                if (after.getParameters().length > 1 && p.getParameters().length == 1) {
                    var balance = 0;
                    for (var i = this.cursorPosition + 1; i < this.expr.tokens.length; ++i) {
                        var tok = this.expr.tokens[i];
                        if (tok.getOperator() == "(") balance++;
                        if (balance == 0) break; // no parameters present after all
                        if (tok.getOperator() == ")") balance--;
                        len++;
                        if (balance == 0) break; // the end
                    }
                }
                this.deleteTokens(this.cursorPosition, len);
            }
        }

        private pickGlobalAsync(k:Kind, nameHint:string) : Promise
        {
            var r = new PromiseInv();
            var m = new ModalDialog();
            var gotValue = false;

            m.onDismiss = () => {
                if (!gotValue)
                    this.display();
            };


            function finish(toks:AST.Token[])
            {
                gotValue = true;
                m.dismiss();
                r.success(toks);
            }

            var boxes = []

            var d = new DeclEntry("new global variable");
            d.description = "of type " + k.toString();

            var tipBox = null

            boxes.push(d.mkBox().withClick(() => {
                var d = new AST.GlobalDef();
                var propName = Script.freshName(nameHint || k.getStemName());
                d.setName(propName);
                d.setKind(k);

                TheEditor.undoMgr.clearCalc();
                TheEditor.undoMgr.pushMainUndoState();
                Script.addDecl(d);
                //TS9
                finish(<any>[AST.mkThing("data"), AST.mkPropRef(propName)]);
                TheEditor.dismissSidePane();
                TheEditor.queueNavRefresh();
            }));

            this.recordCandidates(false).forEach(l => {
                var d = new DeclEntry("new field of " + l.getName())
                d.description = "of type " + k.toString()
                var nameHintHere = nameHint

                var box = d.mkBox()

                if (this.currentInstruction && l.getName() == this.currentInstruction.promoteToFieldOf) {
                    tipBox = box;
                    nameHintHere = this.currentInstruction.promoteToFieldNamed;
                }

                box.withClick(() => {
                    var rk = <AST.RecordEntryKind>l.getKind();
                    var fld = rk.record.values.mkField(nameHintHere || k.getStemName(), k);
                    rk.record.values.push(fld);
                    rk.record.notifyChange();
                    TheEditor.undoMgr.clearCalc();
                    TheEditor.undoMgr.pushMainUndoState();

                    var toks = []
                    if (l instanceof AST.LocalDef)
                        toks.push(AST.mkLocalRef(l))
                    else
                        toks.push(AST.mkThing("data"), AST.mkPropRef(l.getName()))
                    toks.push(AST.mkPropRef(fld.getName()))
                    finish(toks)
                    TheEditor.dismissSidePane();
                    TheEditor.queueNavRefresh();
                })

                if (l.getName() == AST.modelSymbol)
                    boxes.unshift(box)
                else
                    boxes.push(box)
            })

            Script.variables().forEach((l) => {
                if (l.isBrowsable() && l.getKind() == k) {
                    boxes.push(DeclRender.mkBox(l).withClick(() => {
                        //TS9
                        finish(<any>[AST.mkThing("data"), AST.mkPropRef(l.getName())]);
                    }))
                }
            });

            /*
            d = new DeclEntry("nothing; i'll do it myself");
            d.color = "#E72A59";
            d.description = "you will need to fix the code";
            boxes.push(d.mkBox().withClick(() => {
                finish([AST.mkPlaceholderByKind(k)])
            }));
            */

            m.choose(boxes, { header: "Bind to:" });

            if (this.currentInstruction) {
                if (!tipBox) {
                    TipManager.setTip({
                        tick: Ticks.chooseCancel,
                        title: lf("tap there"),
                        description: lf("go back"),
                    })
                } else {
                    TipManager.setTip({
                        el: tipBox,
                        title: lf("tap there"),
                        description: lf("we need a new field"),
                    })
                }
            }

            return r;
        }

        public insertProp(p:IProperty, insertRecv = false)
        {
            this.lastOpenBracePos = -1;
            p.getUsage().localCount += 10;
            if (p.getInfixPriority() > 0) {
                this.insertOp(p.getName());
            } else {
                this.handlePropReplacement(p);

                var toks = [];
                var parms = p.getParameters();
                if (insertRecv) {
                    if (p.parentKind.isData) {
                        toks.pushRange(this.findDefault(parms[0]));
                    } else if (p.parentKind instanceof AST.LibraryRefKind) {
                        var ns: string;
                        if ((<IPropertyWithNamespaces>p).getNamespaces && (ns = (<IPropertyWithNamespaces>p).getNamespaces()[0])) {
                            toks.push(AST.mkThing(ns));
                        } else {
                            toks.push(AST.mkThing(AST.libSymbol))
                            toks.push(AST.mkPropRef((<AST.LibraryRefKind>p.parentKind).lib.getName()))
                        }    
                    } else {
                        toks.push(AST.mkThing(p.parentKind.singleton.getName()));
                    }
                }
                var propRef = AST.mkPropRef(p.getName())
                toks.push(propRef);

                var tok0 = this.expr.tokens[this.cursorPosition];
                var newCursorPos = -1;
                var lambdaIds:AST.LocalDef[] = []

                var len = parms.length
                if (AST.OptionalParameter.optionsParameter(p))
                    len--;
                var implicitAction = AST.InlineActions.implicitActionParameter(p)
                if (implicitAction)
                    len--;

                if (len > 1 && (!tok0 || tok0.getOperator() != "(" && parms.length > 1)) {
                    toks.push(AST.mkOp("("));
                    this.lastOpenBracePos = this.cursorPosition + toks.length;
                    for (var i = 1; i < len; ++i) {
                        if (i > 1) toks.push(AST.mkOp(","));
                        var k = parms[i].getKind()
                        if (k.isAction && (!AST.proMode || (<ActionKind>k).getOutParameters().length != 1)) {
                            var nm = TheEditor.currentAction().nameLocal(parms[i].getName());
                            if (this.currentInstruction && this.currentInstruction.inlineActionNames) {
                                var our = this.currentInstruction.inlineActionNames[lambdaIds.length]
                                if (our) nm = our.getName()
                            }
                            var loc = AST.mkLocal(nm, k);
                            lambdaIds.push(loc);
                            toks.push(AST.mkThing(loc.getName()));
                        } else {
                            toks.pushRange(this.findDefault(parms[i]));
                        }
                    }
                    newCursorPos = this.cursorPosition + toks.length;
                    toks.push(AST.mkOp(")"));
                }

                this.insertTokens(toks);
                if (newCursorPos > 0)
                    this.cursorPosition = newCursorPos;

                this.unselect();

                if (p.getCategory() == PropertyCategory.Action)
                    this.autoFixup();

                this.turnIntoInlineActions(lambdaIds, implicitAction);

                this.display();
            }
        }

        private ensureIsInlineActions():AST.InlineActions
        {
            if (! (this.stmt instanceof AST.ExprStmt)) return null

            if (! (this.stmt instanceof AST.InlineActions)) {
                var exprStmt = <AST.ExprStmt>this.stmt;
                var block = <AST.CodeBlock>exprStmt.parent;
                var stmts = block.children();
                var idx = stmts.indexOf(exprStmt);
                var inl = new AST.InlineActions();
                inl.expr = exprStmt.expr;
                stmts[idx] = inl;
                block.setChildren(<any[]>stmts);
                this.stmt = inl;
                TheEditor.selector.selectedStmt = inl;
            }

            return <AST.InlineActions>this.stmt
        }


        private turnIntoInlineActions(lambdaIds:AST.LocalDef[], implicitAction:PropertyParameter)
        {
            if (lambdaIds.length == 0 && !implicitAction) return;

            var inl = this.ensureIsInlineActions()

            if (!inl) return

            lambdaIds.forEach((nm) => {
                var ia = AST.InlineAction.mk(nm);
                inl.actions.push(ia);
                var k = <ActionKind> nm.getKind()
                if (k instanceof ActionKind && k.getOutParameters().length == 1) {
                    var outP = k.getOutParameters()[0]
                    var toks:AST.Token[] = [AST.mkThing(outP.getName(), true), AST.mkOp(":=")]
                    toks.pushRange(this.findDefault(outP));
                    (<AST.ExprStmt>ia.body.stmts[0]).expr.tokens = toks
                }
            })

            var hasImplicit = inl.actions.stmts.some(s => (<AST.InlineAction>s).isImplicit)

            if (implicitAction && !hasImplicit) {
                var nm = AST.mkLocal("_body_", implicitAction.getKind());
                nm.isSynthetic = true;
                var ia = AST.InlineAction.mk(nm);
                ia.isImplicit = true
                inl.actions.push(ia);
            }

            TheEditor.initIds(this.stmt, false)
            AST.TypeChecker.tcAction(TheEditor.currentAction(), false, this.expr);
            this.fullDisplay()
        }

        private mkIntelliItem(sc:number, t:Ticks)
        {
            var e = new IntelliItem();
            e.tick = t;
            e.score = sc;
            this.currentIntelliItems.push(e);
            return e;
        }

        private literalEdit(l:AST.Literal)
        {
            if (typeof l.data == "string") {
                var e = this.mkIntelliItem(1.01e20, Ticks.calcEditString);
                if (l instanceof AST.FieldName || l instanceof AST.RecordName)
                    e.nameOverride = lf("rename");
                else e.nameOverride = lf("edit");
                e.descOverride = lf("change contents");
                e.cbOverride = () => { this.inlineEdit(l) };
            } else if (typeof l.data == "boolean") {
                var e = this.mkIntelliItem(1.01e20, Ticks.calcSwapBoolean);
                var v = l.data ? "false" : "true";
                e.nameOverride = v;
                e.descOverride = lf("swap");
                e.cbOverride = () => { this.replaceOp(v, l) };
            }
        }

        private promoteMult()
        {
            var nextTok = this.expr.tokens[this.cursorPosition];
            var isAssign = nextTok && nextTok.getOperator() == ":=";
            return isAssign || this.inSelectionMode() ? 1e20 : 1e-200;
        }

        private thingEdit(t:AST.ThingRef)
        {
            if (!!t.def && t.def.nodeType() == "localDef" ) {
                var mod = TheEditor.currentAction().modelParameter
                if (mod && mod.local == t.def)
                    return;

                var promoteMult = this.promoteMult();
                var e = this.mkIntelliItem(1.01 * promoteMult, Ticks.calcRenameLocal);
                e.nameOverride = lf("rename");
                e.descOverride = lf("set local variable name");
                e.cbOverride = () => { this.inlineEdit(t) };

                if (t.def.getKind().hasContext(KindContext.GlobalVar) && TheEditor.widgetEnabled('promoteRefactoring')) {
                    var e = this.mkIntelliItem(0.9 * promoteMult, Ticks.calcPromoteIntoGlobal);
                    e.nameOverride = lf("promote to data");
                    e.descOverride = lf("to global var");
                    e.cbOverride = () => { this.promoteLocal(t, null) };

                    if (this.recordCandidates(false).length > 0) {
                        e = this.mkIntelliItem(0.89 * promoteMult, Ticks.calcPromoteIntoField);
                        e.nameOverride = lf("promote to field");
                        e.descOverride = lf("of an object");
                        e.cbOverride = () => { this.promoteToField(t) };
                    }
                }
            }

/*
            if (TDev.dbg) {
                if (!!t.def && t.def.nodeType() == "singletonDef") {
                    if (t.data == "colors") {
                        var e = this.mkIntelliItem(1e40, Ticks.calcPickColor);
                        e.nameOverride = lf("pick color");
                        e.descOverride = lf("from palette");
                        e.cbOverride = () => { this.editColor(t) };
                    }
                }
            }
*/
        }

        static sortDecls(arr:any[]) : any[]
        {
            arr = arr.slice(0);
            arr.sort((a, b) => a.getName().toLowerCase().localeCompare(b.getName().toLowerCase()))
            return arr;
        }

        private intelliAssign()
        {
            if (this.suggestedAssignment) return;

            if (this.inSelectionMode() || this.expr.tokens.some((i) => (<any> i).data === ":=")) {
                // there's already assignment; don't offer another
            } else {
                var e = this.mkIntelliItem(1.1e20, Ticks.calcInsertAssignment);
                e.nameOverride = ":="
                e.descOverride = "assignment";
                e.cbOverride = () => { this.insertOp(":="); };
                this.suggestedAssignment = true;
            }
        }

        private intelliReplacementSingletonKind() : Kind
        {
            var prevTok = this.expr.tokens[this.cursorPosition - 2];
            var getKind = (t:AST.Token) => {
                if (t) {
                    var df = t.getThing();
                    if (df instanceof AST.GlobalDef) {
                        var k = df.getKind();
                        if (df.getName() == "colors")
                            return k;
                    }
                }
                return null;
            }

            return getKind(prevTok);
        }

        private intelliNew(off:number, q:number)
        {
            if (this.stmt instanceof AST.RecordNameHolder)
                return;

            var e = this.mkIntelliItem(q, Ticks.calcNewLine);
            e.nameOverride = lf("new line");
            e.descOverride = off < 0 ? lf("new stmt above") : lf("new stmt below");
            e.cbOverride = TheEditor.selector.addCallback(off);
        }

        private addFieldButtons() {
            if (!(this.stmt instanceof AST.RecordField))
                return;
            var f = <AST.RecordField> this.stmt;

            if (TheEditor.widgetEnabled("findReferences")) {
                var e1 = this.mkIntelliItem(1.9e20, Ticks.calcFindRefs);
                e1.nameOverride = lf("find references");
                e1.descOverride = lf("find references to this field");
                e1.cbOverride = () => {
                    TheEditor.findRefs(f.def(), f);
                };
            }

            if (f.commentBlock.children().length == 0) {
                var e2 = this.mkIntelliItem(1.9e20, Ticks.calcFindRefs);
                e2.nameOverride = lf("add comment");
                e2.descOverride = lf("add comment for this field");
                e2.cbOverride = () => {
                    var c = new AST.FieldComment(f);
                    c.text = "";
                    f.commentBlock.setChildren([c]);
                    TheEditor.editNode(c);
                };
            }
        }

        private addBreakpoint() {
            if (this.stmt instanceof AST.RecordField)
                return;
            if (!TheEditor.widgetEnabled('toggleBreakpoint') || !TheEditor.debugSupported())
                return;

            var e = this.mkIntelliItem(-1.2e20, Ticks.debuggerToggleBreakpoint);
            e.nameOverride = lf("toggle breakpoint");
            e.descOverride = lf("break in debugger");
            e.iconOverride = "svg:breakpoint,red";
            e.colorOverride = "white";
            e.cbOverride = () => {
                var ctx = this.stmt.debuggerRenderContext;
                if (ctx) {
                    if (!ctx.isBreakPoint) TheEditor.addBreakpoint(this.stmt);
                    else TheEditor.removeBreakpoint(this.stmt);
                }
            };
        }

        private addGoTo(defn:AST.Decl)
        {
            if (!TheEditor.widgetEnabled('gotoNavigation')) return;

            var name = lf("go to");
            if (this.currentIntelliItems.some((i:IntelliItem) => i.nameOverride == name)) return;

            if (defn instanceof AST.LibExtensionAction)
                defn = (<AST.LibExtensionAction>defn).shortcutTo

            var e = this.mkIntelliItem(0.9 * this.promoteMult(), Ticks.calcGoToDef);
            e.nameOverride = name;
            e.descOverride = defn.getName();
            e.cbOverride = () => {
                if (defn instanceof AST.LibraryRefAction) {
                    TheEditor.dismissSidePane()
                    LibraryRefProperties.editLibrary((<AST.LibraryRefAction>defn).parentLibrary(), () => {}, defn.getStableName())
                } else {
                    TheEditor.renderDecl(defn);
                }
            };

            if (defn instanceof AST.LibraryRefAction)
                return // find refs doesn't work yet for lib actions

            name = lf("find references");
            if (this.currentIntelliItems.some((i:IntelliItem) => i.nameOverride == name)) return;

            e = this.mkIntelliItem(0.899 * this.promoteMult(), Ticks.calcFindRefs);
            e.nameOverride = name;
            e.descOverride = defn.getName();
            e.cbOverride = () => {
                TheEditor.findRefs(defn)
            };
        }

        private launchPlaceholderPicker(tok:AST.Token)
        {
            if (tok && tok.getThing() instanceof AST.PlaceholderDef) {
                var pl = <AST.PlaceholderDef>tok.getThing()
                if (pl.getKind().getRoot() == api.core.Ref) {
                    this.cursorPosition = this.expr.tokens.indexOf(tok) + 1
                    this.newFieldData(<ParametricKind>pl.getKind(), pl.label)
                    return true;
                }
            }
            return false;
        }

        private newFieldData(placeholderKind:ParametricKind, nameHint:string)
        {
            this.pickGlobalAsync(placeholderKind.parameters[0], nameHint).done(toks => {
                if (!toks) return;
                toks.push(AST.mkPropRef(api.core.refPropPrefix + "ref"))
                this.insertTokens(toks)
            })
        }

        private addRegularButtons(placeholderDef:AST.PlaceholderDef)
        {
            var k = new TokenKind(this);
            k.run();

            // Approximate test for determining whether we should show
            // suggestions.
            if ((this.stmt instanceof AST.RecordField || this.stmt instanceof AST.ActionParameter) &&
                !(k.primaryKind instanceof MultiplexKind) || this.stmt instanceof AST.RecordNameHolder)
            {
                return;
            }

            var profile = TheEditor.intelliProfile;
            var placeholderKind = placeholderDef ? placeholderDef.getKind() : null

            if (placeholderKind && placeholderKind.getRoot() == api.core.Ref) {
                var e = this.mkIntelliItem(1.1e40, Ticks.calcBindGlobal);
                e.nameOverride = lf("new field/data")
                e.descOverride = lf("create binding")
                e.cbOverride = () => this.newFieldData(<ParametricKind>placeholderKind, placeholderDef.label)
            }

            this.addBreakpoint(); // allows to set breakpoint outside of the debugger

            if (!placeholderKind && k.primaryKind != null) {
                this.inPropertyPosition = true;

/*
                if (false && k.primaryKind === api.core.Number) {
                    var e = this.mkIntelliItem(1e40, Ticks.calcPickNumber);
                    e.nameOverride = lf("pick number")
                    e.descOverride = lf("by drag and drop");
                    e.cbOverride = () => { this.editNumber(k); };
                }
*/

                var s: IProperty[] = k.primaryKind.listProperties().slice(0);
                if (k.primaryKind instanceof AST.LibraryRefKind)
                    s = s.filter(p => !(<AST.LibraryRefAction>p)._extensionAction);
                var downgradeConcat = false;
                if (k.definition != null)
                    this.addGoTo(k.definition);

                var kk = this.intelliReplacementSingletonKind();
                if (kk)
                    s.pushRange(kk.listProperties().filter((p:IProperty) => p.getResult().getKind() == k.primaryKind))

                k.secondaryKinds.forEach((kk:Kind) => {
                    s.pushRange(kk.listProperties().filter((p:IProperty) => p.getInfixPriority() > 0));
                });
                if (k.refKind) {
                    k.refKind.listProperties().forEach(p => {
                        if (!p.isBrowsable()) return;

                        var v = p.getUsage().count() + 1e-20;
                        var n = p.getName().slice(1)
                        if (n == "ref" && /^TD164/.test(this.expr.getError()))
                            v = 1e50;
                        var e = this.mkIntelliItem(v, Ticks.calcIntelliPropertyPrimary);
                        e.prop = p;
                        e.noButton = n == "get" || n == "set" || (!k.refIsCloud && n == "confirmed")
                    })
                }

                var isNothing = (k.primaryKind == api.core.Nothing || !k.primaryKind.isData) && k.secondaryKinds.length == 0;
                if (!isNothing && s.indexOf(api.core.StringConcatProp) < 0 && TheEditor.widgetEnabled("stringConcatProperty")) {
                    s.push(api.core.StringConcatProp); // always available
                    downgradeConcat = true;
                }
                
                s = s.filter(p => p.isBrowsable() && (!profile || profile.hasProperty(p)));                
                s = Calculator.sortDecls(s);

                s.forEach((p: IProperty) => {
                    if (p.getInfixPriority() > 0 && p.getParameters().length == 1) {
                        // unary prefix operator; skip
                    } else {
                        var v = p.getUsage().count() + 1e-20;
                        if (p == api.core.StringConcatProp && downgradeConcat)
                            v /= 5;
                        if (p.forwardsToStmt() instanceof AST.RecordField)
                            v += 1e10;
                        var e = this.mkIntelliItem(v, Ticks.calcIntelliPropertyPrimary);
                        if (p.getInfixPriority())
                            e.nameOverride = Renderer.opName(p.getName())
                        e.prop = p;
                        e.noButton = !p.showIntelliButton()
                    }
                });
            } else {
                var maxScore = 1;
                var singl: AST.SingletonDef[] = Calculator.sortDecls(api.getSingletons().filter(sg => sg.isBrowsable() && (!profile || profile.hasDecl(sg)) ));
                var skill = AST.blockMode ? 1 : AST.legacyMode ? 2 : 3;
                var libSingl: IntelliItem = null;
                var dataSingl: IntelliItem = null;
                singl.forEach((s:AST.SingletonDef) => {
                    var sc = s.usage.count() + 1e-20;
                    sc *= s.usageMult();
                    var e = this.mkIntelliItem(sc, Ticks.calcIntelliSingleton);
                    if (sc > maxScore) maxScore = sc;
                    if (skill < s.getKind().minSkill) e.score *= 1e-10;
                    e.decl = s;
                    if (s.getName() == AST.libSymbol)
                        libSingl = e;
                    else if (s.getName() == "data")
                        dataSingl = e;
                });

                var libs = Script.libraries().filter(l => l.isBrowsable()).map(l => {
                    var sc = l.getUsage().count() + 50;
                    var e = this.mkIntelliItem(sc, Ticks.calcIntelliLibrary)
                    this.currentIntelliItems.pop()
                    if (sc > maxScore) maxScore = sc;
                    e.prop = l;
                    e.isAttachedTo = l.parentKind;
                    return e;
                })
                libs.sort((a, b) => b.score - a.score)
                // always show all libraries in block/legacy mode
                var maxLibs = (AST.blockMode || AST.legacyMode) ? 1e6 : 5;
                if (libs.length > maxLibs) libs = libs.slice(0, maxLibs)
                else if (libSingl) libSingl.score *= 1e-10;
                this.currentIntelliItems.pushRange(libs)

                var locals = this.getLocals()

                locals.sort((a:AST.LocalDef, b:AST.LocalDef) => b.lastUsedAt - a.lastUsedAt);
                var score = maxScore * 4;
                locals.forEach((s:AST.LocalDef) => {
                    // outAssign is set by tutorial engine for legacy tutorials
                    if (s.isBrowsable() && (!s.isHiddenOut || TheEditor.widgetEnabled("outAssign"))) {
                        var e = this.mkIntelliItem(score, Ticks.calcIntelliLocal);
                        score *= 0.7;
                        e.decl = s;
                    }
                });

                // if enough space, expand data variables
                var vars = Script.variables().filter(r => r.isBrowsable());
                var maxDatas = Math.min(vars.length, (AST.blockMode || AST.legacyMode) ? 5 : 3);
                var datas = vars.map(r => {
                    var sc = r.getUsage().count() + 40;
                    var e = this.mkIntelliItem(sc, Ticks.calcIntelliResource)
                    this.currentIntelliItems.pop()
                    e.isAttachedTo = r.parentKind;
                    e.prop = r;
                    return e;                    
                });
                datas.sort((a, b) => b.score - a.score);
                if (datas.length > maxDatas) datas = datas.slice(0, maxDatas)
                else if (dataSingl) dataSingl.score *= 1e-10;
                this.currentIntelliItems.pushRange(datas);
            }
        }

        private copyTokens(isCut : boolean = false)
        {
            var toks = this.expr.tokens.slice(this.selectionStart, this.selectionEnd);
            var expr = AST.Parser.emptyExpr();
            expr.tokens = toks;
            TheEditor.clipMgr.copy({
                type: "tokens",
                data: expr.serialize(),
                scriptId : (Script ? Script.localGuid : Util.guidGen()),
                isCut : isCut
            });
        }

        private promoteToParameter()
        {
            this.extractTokens(true)
        }

        private extractTokens(toParameter = false)
        {
            if (!this.expr) return;

            if (!this.inSelectionMode()) return;

            var oops = false;
            var extractedKind = null
            var name =
                this.selectionSearch(null, this.expr.parsed, (e, parm) => {
                    if (e.loc.len - 2 > this.selectionEnd - this.selectionStart)
                        return null; // too big

                    var k = e.getKind();
                    extractedKind = k;
                    if (!!k && !k.hasContext(KindContext.Parameter)) {
                        oops = true;
                        HTML.showErrorNotification(lf("cannot extract values of type {0}", k));
                        return "blah";
                    }

                    if (!toParameter && (<AST.Call>e).runAsAsync) {
                        oops = true;
                        HTML.showErrorNotification(lf("cannot extract under async/await"));
                        return "blah";
                    }

                    var name = null;
                    if (!name) name = this.parameterName(parm);
                    if (name == "_this_" || name == "this" || name == "self") name = null;
                    if (!name && k) name = k.getStemName();
                    return name;
                });

            if (oops) return;

            if (!name) name = "x";

            this.undoMgr.pushMainUndoState();
            this.undoMgr.clearCalc();

            var act = TheEditor.currentAction()
            var v = act.nameLocal(name);
            var toks = this.expr.tokens.slice(this.selectionStart, this.selectionEnd);

            if (toParameter) {
                if (!extractedKind) {
                    Util.check(false, "no kind")
                    return
                }
                var blk = act.header.inParameters
                var param = <AST.ActionParameter>blk.emptyStmt()
                blk.push(param)
                param.local.setName(v)
                param.local.setKind(extractedKind)
                blk.notifyChange()
                this.deleteSelectedTokens();
                this.insertToken(AST.mkThing(v, true));

                var repl = new AddArgument(act, toks)
                repl.run()
            } else {
                toks.splice(0, 0, AST.mkThing(v), AST.mkOp(":="));
                var stmt = AST.Parser.emptyExprStmt();
                stmt.expr.tokens = toks;
                this.deleteSelectedTokens();
                this.insertToken(AST.mkThing(v, true));
                TheEditor.selector.addBeforeSelected(stmt);
            }
            this.fullDisplay();
        }

        private parameterName(parm:PropertyParameter)
        {
            return !parm || parm.parentProperty.getInfixPriority() > 0 ? null : parm.getName();
        }

        private uncomment()
        {
            if (!this.stmt) return
            var bl = this.stmt.innerBlocks()
            if (bl.length == 0) return

            TheEditor.undoMgr.clearCalc();
            TheEditor.undoMgr.pushMainUndoState();

            var parBl = <AST.CodeBlock>this.stmt.parent
            var ch = parBl.children().slice(0)
            var idx = ch.indexOf(this.stmt)
            var inner = bl[0].stmts
            bl.slice(1).forEach(bb => {
                if (!bb.isBlockPlaceholder())
                    inner.pushRange(bb.stmts)
            })
            inner = inner.filter(f => !(f instanceof AST.ForeachClause))
            ch.spliceArr(idx, 1, inner)
            parBl.setChildren(ch)
            parBl.notifyChange()
            TheEditor.dismissSidePane()
        }

        private simplify(forReal:boolean)
        {
            var maxScore = 0;
            var maxExpr:AST.Expr = null;

            var rec = (e:AST.Expr, parm:PropertyParameter, isTop:boolean) => {

                var keepTop = (e.calledProp() == api.core.AssignmentProp);
                if (e instanceof AST.Call) {
                    var c = <AST.Call>e;
                    var params = !c.prop() ? [] : c.prop().getParameters();
                    for (var i = 0; i < c.args.length; ++i) {
                        rec(c.args[i], params[i], keepTop);
                    }
                }

                if (isTop || !e.loc) return;

                var score = e.loc.len;

                if (!!e.referencedData()) score = 0;
                else if (!!e.calledAction()) {
                    if (e.calledAction().getOutParameters().length == 1) score += 1000;
                    else score = 0;
                } else {
                    var prop = e.calledProp();
                    if (!!prop && prop.getInfixPriority() == 0) score += 90;
                    if (prop == api.core.TupleProp) score = 0;
                }

                if (e instanceof AST.Call && (<AST.Call>e).runAsAsync)
                    score = 0;

                var k = e.getKind();
                if (!!k && !k.hasContext(KindContext.Parameter)) {
                    score = 0;
                }

                if (score == 0) return;

                if (e instanceof AST.Literal) {
                    var len = e.getText().length;
                    if (len < 25) score = 0;
                    else score += len;
                } else {
                    if (e.loc.len <= 1) score = 0;
                }

                var remLen = this.expr.tokens.length - e.loc.len;

                if (remLen <= 2)
                    score = 0;
                else if (score > 0)
                    score += e.loc.len * remLen / 10;

                if (score > 0 && !!this.parameterName(parm)) score += 100;

                if (score > maxScore) {
                    maxScore = score;
                    maxExpr = e;
                }
            };

            rec(this.expr.parsed, null, true);

            if (!forReal)
                return !!maxExpr;

            this.unselect();

            if (!maxExpr) return false;

            // this way the user will see what's happening
            this.selectionStart = maxExpr.loc.beg;
            this.selectionEnd = maxExpr.loc.beg + maxExpr.loc.len;
            this.display();
            Util.setTimeout(300, () => this.extractTokens());
            return true;
        }

        private recordCandidates(onlyGlobal:boolean):any[]
        {
            var res = []

            var isRecordKind = (kk:Kind) =>
            {
                var k = <AST.RecordEntryKind>kk;
                if (!(k instanceof AST.RecordEntryKind)) return false;
                if (!k.record || k.record.recordType != AST.RecordType.Object) return false;
                if (k.record.parentLibrary() && !k.record.parentLibrary().isThis()) return false
                return true;
            }

            if (!onlyGlobal)
                this.getLocals().forEach((l) => {
                    if (!l.isOut && isRecordKind(l.getKind()))
                        res.push(l);
                });

            Script.variables().forEach((v) => {
                if (isRecordKind(v.getKind()))
                    res.push(v);
            });

            return res;
                    //res.push([AST.mkThing(l.getName(), true)])
                    //res.push([AST.mkThing("data"), AST.mkPropRef(v.getName())])
        }

        private promoteToField(t:AST.Token)
        {
            var boxes = []
            var m = new ModalDialog();
            var tipBox = null
            this.recordCandidates(t.getProperty() instanceof AST.GlobalDef).forEach((c) => {
                var box = DeclRender.mkBox(c).withClick(() => {
                    m.dismiss();
                    this.promoteLocal(t, c);
                })

                if (this.currentInstruction && c.getName() == this.currentInstruction.promoteToFieldOf) {
                    tipBox = box;
                }

                boxes.push(box)
            });
            m.choose(boxes);

            if (this.currentInstruction) {
                if (!tipBox) {
                    TipManager.setTip({
                        tick: Ticks.chooseCancel,
                        title: lf("tap there"),
                        description: lf("go back"),
                    })
                } else {
                    TipManager.setTip({
                        el: tipBox,
                        title: lf("tap there"),
                        description: lf("we need a new field"),
                    })
                }
            }
        }

        private promoteLocal(t:AST.Token, fieldExpr:any)
        {
            if (!this.expr) return;
            this.checkNextDisplay();
            var prom = new VarPromoter(fieldExpr);
            var pos = this.expr.tokens.indexOf(t);
            if (pos < 0) return;
            this.cursorPosition = pos + 1;
            if (t.getProperty() instanceof AST.GlobalDef)
                pos--;
            prom.run(this.expr.tokens.slice(pos, this.cursorPosition))
            this.cursorPosition++;
            this.unselect();
            this.display();
        }

        public cutHandler()
        {
            if (!this.inSelectionMode()) return;
            tick(Ticks.calcCut)
            this.copyTokens(true);
            this.deleteSelectedTokens();
            this.display();
        }

        public copyHandler()
        {
            if (!this.inSelectionMode()) return;
            tick(Ticks.calcCopy)
            this.copyTokens();
            this.unselect();
            this.display();
        }

        private isPlaceholderToken(tok:AST.Token)
        {
            return tok && tok.getThing() instanceof AST.PlaceholderDef
        }

        private addSelectionButtons()
        {
            var toks = this.expr.tokens.slice(this.selectionStart, this.selectionEnd);
            var isPlaceholder = toks.length == 1 && this.isPlaceholderToken(toks[0])

            var mk = (name:string, longDesc:string, t:Ticks, fn:()=>void) => {
                var e = this.mkIntelliItem(1e20, t);
                e.nameOverride = name;
                e.descOverride = longDesc;
                e.cbOverride = fn;
            }
            if (!isPlaceholder && this.stmt.allowSimplify())
                mk(lf("extract to var"), lf("into local"), Ticks.calcExtract, () => { this.extractTokens(); });

            if (!this.biggerSelection()) {
                mk(lf("unselect"), lf("clear selection"), Ticks.calcUnselect, () => this.toggleSelection())
            } else {
                mk(lf("extend"), lf("select more"), Ticks.calcExtend, () => this.toggleSelection())
            }

            if (!isPlaceholder && !toks.some((t) => t.getThing() instanceof AST.LocalDef))
                mk(lf("replace all in script"), lf("global replace"), Ticks.calcReplaceInScript, () => this.replaceToks(toks, ReplacementScope.Script))
            mk(lf("replace all in function"), lf("in this function"), Ticks.calcReplaceInAction, () => this.replaceToks(toks, ReplacementScope.Action))
            // TODO replace all in selection

            if (AST.proMode || toks.every(t => /^[0-9]$/.test(t.getOperator()) || !!t.getLiteral())) {
                mk(lf("extract to parameter"), lf("abstract over"), Ticks.calcPromoteToParameter, () => { this.promoteToParameter(); });
            }
        }

        private copiedTokens() : AST.Token[]
        {
            var paste = TheEditor.clipMgr.paste()
            if (!paste) return null;

            if (paste.type == "tokens") {
                return AST.Parser.parseExprHolder(paste.data).tokens;
            }

            if (paste.type == "block") {
                var b = AST.Parser.parseStmt(paste.data);
                var stmts = [b];
                if (b instanceof AST.Block)
                    stmts = (<AST.Block>b).stmts;
                if (stmts.length == 1 && stmts[0] instanceof AST.ExprStmt)
                    return (<AST.ExprStmt>stmts[0]).expr.tokens
            }

            return null;
        }

        private replaceToks(toks:AST.Token[], scope:ReplacementScope, demote = false)
        {
            this.checkNextDisplay();

            var repl = new Replacer();
            repl.src = toks;
            repl.scope = scope;

            var m = new ModalDialog();

            function finish() {
                if (m.visible) m.dismiss();
                TheEditor.undoMgr.clearCalc();
                TheEditor.undoMgr.pushMainUndoState();
                repl.execute();
                repl.removeDeclIfNotUsed();
                TheEditor.dismissSidePane();
                TheEditor.queueNavRefresh();
            }

            var boxes:HTMLElement[] = []
            var copied = this.copiedTokens();
            if (copied) {
                var d = new DeclEntry(lf("stuff you copied"))
                d.icon = "svg:paste,white";
                d.color = "#0a0";
                var b = d.mkBox();
                Browser.setInnerHTML((<any>b).theDesc, this.renderer.renderTokens(copied));
                boxes.push(b.withClick(() => {
                    repl.dst = copied;
                    finish();
                }));
            }

            var decl = repl.findDecl();
            var baseName = decl ? decl.getName() : "x";

            d = new DeclEntry(lf("new local"));
            d.color = "#E72A59";
            d.description = lf("local variable {0}", TheEditor.currentAction().nameLocal(baseName, {}));

            var withNewLocal = () => {
                repl.beforeAction = (a) => {
                    repl.dst = [AST.mkThing(a.nameLocal(baseName, {}), true)]
                };
                finish();
            }

            boxes.push(d.mkBox().withClick(withNewLocal));

            if (demote) {
                withNewLocal();
                return;
            }

            if (scope == ReplacementScope.Action || scope == ReplacementScope.Selection) {
                var locs = this.getLocals()
                locs.sort(Util.nameCompare);
                locs.forEach((l) => {
                    if (l.isBrowsable() && !l.isOut) {
                        boxes.push(DeclRender.mkBox(l).withClick(() => {
                            repl.dst = [AST.mkLocalRef(l)];
                            finish();
                        }))
                    }
                })
            }

            Script.variables().forEach((l) => {
                if (l.isBrowsable()) {
                    boxes.push(DeclRender.mkBox(l).withClick(() => {
                        repl.dst = [AST.mkThing("data"), AST.mkPropRef(l.getName())];
                        finish();
                    }))
                }
            });

            if (!copied) {
                d = new DeclEntry("need anything else?");
                d.description = "copy to clipboard first!";
                d.icon = "svg:Question,white";
                boxes.push(d.mkBox().withClick(() => {
                    ModalDialog.info("copy to clipboard first",
                        "To replace an expression A with an expression B, first enter or find expression B, select it, copy to clipboard. " +
                        "Then find expression A, select it, and press \"replace all in ...\" button.");
                }));
            }

            m.choose(boxes, { header: "Replace with:" });
        }

        public pasteTokens()
        {
            Ticker.dbg("Calculator.pasteTokens");
            var node = TheEditor.clipMgr.paste();
            if (!node || node.type != "tokens") return;
            if (this.inSelectionMode()) this.deleteSelectedTokens();
            var exprStmt = <AST.ExprStmt> AST.Parser.parseStmt(node.data);
            this.insertTokens(exprStmt.expr.tokens);
            this.unselect();
            this.display();
        }

        private fixIt()
        {
            var tokens = AST.Fixer.getFix(this.expr)
            if (!tokens)
                return
            this.deleteTokens(0, this.expr.tokens.length)
            this.insertTokens(tokens)
            this.unselect()
            this.wrenchUndo = true
            this.display()
        }

        public fixItAnimation(cb:()=>void)
        {
            return () => {
                var expr = this.expr
                if (!expr) return
                Util.setTimeout(240, () => {
                    if (expr == this.expr) cb()
                })
                Util.coreAnim("wrenchCode", 300, <HTMLElement>this.expressionDisplay.parentNode)
            }
        }

        private fixItButtons()
        {
            var info = this.expr.assignmentInfo();

            var widget = TheEditor.widgetEnabled('fixItButton')

            if (widget && this.expr.hasFix) {
                TheEditor.selector.setupWrench("wrench", lf("fix it"), Ticks.btnTryFix, this.fixItAnimation(() => this.fixIt()))
            } else if (widget && !!info && info.missingArguments > 0) {
                TheEditor.selector.setupWrench("wrench", lf("add args"), Ticks.calcAddMissingArgs, this.fixItAnimation(() => this.addMissingArgs(info.missingArguments)))
            } else if (widget && this.wrenchUndo) {
                TheEditor.selector.setupWrench("undo", lf("undo fix"), Ticks.btnUndoFix, () => this.undo())
            } else {
                TheEditor.selector.clearWrench()
            }


            if (/^TD158:/.test(this.expr.getError())) {
                var e = this.mkIntelliItem(1e20, Ticks.calcFixItAtomic);
                e.nameOverride = lf("make function non-atomic")
                e.descOverride = lf("fix it");
                e.cbOverride = () => {
                    TheEditor.undoMgr.clearCalc();
                    TheEditor.undoMgr.pushMainUndoState();
                    TheEditor.currentAction().isAtomic = false;
                    TheEditor.currentAction().notifyChange();
                    TheEditor.dismissSidePane();
                    TheEditor.queueNavRefresh();
                };
            }

            var ann = this.stmt.annotations
            if (ann && ann.length) {
                ann.forEach(a => {
                    if (a.ops)
                        a.ops.forEach(op => {
                            var e = this.mkIntelliItem(1e20, Ticks.pluginRunAnnotationOperation)
                            e.nameOverride = op.header
                            e.descOverride = op.description
                            e.colorOverride = "#0af";
                            e.cornerIcon = "plug,#0af";
                            e.iconOverride = "svg:plug,white"
                            e.cbOverride = () => {
                                Plugins.runAnnotationOp(a, op)
                            };
                        })
                })
            }
        }

        private propertyEdit(p:AST.PropertyRef)
        {
            if (p.prop instanceof AST.PropertyDecl) {
                if (!p.prop.canRename()) return;

                this.tokenEditDone = true;
                var e = this.mkIntelliItem(1.01 * this.promoteMult(), Ticks.calcRenameProperty);
                e.nameOverride = lf("rename");
                e.descOverride = lf("set name");
                e.cbOverride = () => { this.inlineEdit(p) };
            }
        }

        private tokenEditDone = false;
        private tokenEdit(op:AST.Token)
        {
            if (op instanceof AST.Literal) {
                this.tokenEditDone = true;
                this.literalEdit(<AST.Literal>op);
            } else if (op instanceof AST.ThingRef) {
                this.tokenEditDone = true;
                this.thingEdit(<AST.ThingRef>op);
            } else if (op instanceof AST.PropertyRef) {
                this.propertyEdit(<AST.PropertyRef>op);
            } else if (op instanceof AST.Operator) {
                this.operatorEdit(<AST.Operator>op);
            }
        }

        private operatorEdit(op:AST.Operator)
        {
        }

        private editArt(art:AST.GlobalDef)
        {
            var m = new ModalDialog();

            var isSound = art.getKind() == api.core.Sound

            var converter = (s: Browser.ArtInfo) => {
                return s.mkSmallBoxNoClick().withClick(() => {
                    m.dismiss();
                    s.getJsonAsync().done(() => {
                        art.url = isSound ? s.art.wavurl : s.art.pictureurl
                        art.setName(s.art.name);
                        art.notifyChange()
                        this.display()
                        TheEditor.notifyTutorial("editArtDone")
                    }, e => {
                        TheEditor.notifyTutorial("editArtDone")
                    });
                });
            };

            var queryAsync = (terms: string) => Meta.searchArtAsync(terms, isSound ? "sound" : "picture")
                    .then((itms: Browser.ArtInfo[]) => itms.map(itm => converter(itm)).filter(itm => itm != null));
            m.choose([], { queryAsync: queryAsync,
                           searchHint: lf("Type to search..."),
                           initialEmptyQuery: true,
                           initialQuery: art.getName()
                        });

            if (TheEditor.stepTutorial && TheEditor.stepTutorial.waitingFor == "editArt") {
                Calculator.searchTip(elt("chooseSearch"), art)
            }
            TheEditor.notifyTutorial("editArt")
        }

        private unfoldLambda()
        {
            this.undoMgr.pushMainUndoState();
            this.undoMgr.clearCalc();

            var inl = this.ensureIsInlineActions()
            var tok = this.getFunToken()
            var fa = tok.call.funAction
            var loc = tok.call.loc

            this.cursorPosition = loc.beg
            var init = this.expr.tokens.slice(loc.beg + 1, loc.beg + loc.len)
            this.deleteTokens(loc.beg, loc.len)
            fa.name.setName(TheEditor.currentAction().nameLocal("lambda")) // TODO use parameter name
            this.insertToken(AST.mkLocalRef(fa.name))
            inl.actions.push(fa);
            (<AST.ExprStmt>fa.body.stmts[0]).expr.tokens = [<AST.Token>AST.mkLocalRef(fa.outParameters[0]), AST.mkOp(":=")].concat(init)
            TheEditor.initIds(inl)
            this.fullDisplay()
        }

        private foldLambda(forReal:boolean)
        {
            if (this.stmt.nodeType() != "exprStmt")
                return false

            var bl = this.stmt.parentBlock()
            if (!bl || bl.stmts.length != 1)
                return false
            var inl = <AST.InlineAction>bl.parent
            if (!(inl instanceof AST.InlineAction))
                return false
            if (inl.outParameters.length != 1)
                return false

            if (!forReal) return true

            var toks = this.expr.tokens.slice(0)
            if (toks[1] && toks[0] instanceof AST.ThingRef && toks[1].getOperator() == ":=")
                toks = toks.slice(2)

            toks.unshift(AST.mkFunOp(inl.inParameters.map(p => p.getName())))

            var outer = <AST.InlineActions> inl.parentBlock().parent
            var outerToks = outer.expr.tokens
            var replTok = outerToks.filter(t => t.getThing() == inl.name)[0]
            if (!replTok)
                return false

            var idx = outerToks.indexOf(replTok)

            this.undoMgr.pushMainUndoState();
            this.undoMgr.clearCalc();

            var trgToks = outer.expr.tokens

            trgToks.splice(idx, 1)
            toks.forEach(t => trgToks.splice(idx++, 0, t))

            var idx2 = outer.actions.stmts.indexOf(inl)
            outer.actions.stmts.splice(idx2, 1)

            outer.notifyChange()

            TheEditor.dismissSidePane()

            return true
        }

        private specialEditButtons(placeholderDef:AST.PlaceholderDef)
        {
            if (this.stmt instanceof AST.If && (<AST.If>this.stmt).isTopCommentedOut()) {
                var e = this.mkIntelliItem(1.9e20, Ticks.calcSimplify);
                e.nameOverride = lf("uncomment")
                e.descOverride = lf("run it after all");
                e.lowSearch = true
                e.cbOverride = () => { this.uncomment() };
            } else if (TheEditor.widgetEnabled('stripBlock') && !(this.stmt instanceof AST.InlineActions) && this.stmt.innerBlocks().length > 0) {
                var e = this.mkIntelliItem(0.9e20, Ticks.calcStrip);
                e.nameOverride = lf("strip '{0}'", this.stmt.forSearch().replace(/ .*/, ""))
                e.descOverride = lf("pull out to block level");
                e.lowSearch = true
                e.cbOverride = () => { this.uncomment() };
            }

            if (TheEditor.widgetEnabled('simplify') && !placeholderDef && !this.inSelectionMode() &&
                this.stmt.allowSimplify() && this.simplify(false)) {
                var e = this.mkIntelliItem(0.9e20, Ticks.calcSimplify);
                e.nameOverride = lf("simplify")
                e.lowSearch = true
                e.descOverride = lf("current expression");
                e.cbOverride = () => { this.simplify(true) };
            }

            if (TheEditor.widgetEnabled('lambda') && this.getFunToken()) {
                var e = this.mkIntelliItem(0.89e20, Ticks.calcSimplify);
                e.nameOverride = lf("unfold lambda")
                e.descOverride = "";
                e.lowSearch = true
                e.cbOverride = () => { this.unfoldLambda() };
            }

            if (TheEditor.widgetEnabled('lambda') && AST.proMode && this.foldLambda(false)) {
                var e = this.mkIntelliItem(0.89e20, Ticks.calcSimplify);
                e.nameOverride = lf("fold lambda")
                e.descOverride = "";
                e.lowSearch = true
                e.cbOverride = () => { this.foldLambda(true) };
            }

            if (this.expr.getKind() instanceof AST.RecordEntryKind && TheEditor.widgetEnabled('gotoNavigation')) {
                var k = <AST.RecordEntryKind> this.expr.getKind();

                var e = this.mkIntelliItem(0.89e20, Ticks.calcGoToDef);
                e.nameOverride = lf("go to");
                e.descOverride = k.record.getName();
                e.cbOverride = () => { TheEditor.renderDecl(k.record) };
            }

            this.tokenEditDone = false;

            if (this.cursorPosition > 0 && this.selectionLength() <= 1) {
                var op = this.expr.tokens[this.cursorPosition - 1];
                if (op instanceof AST.Literal || op instanceof AST.Operator) {
                    this.tokenEdit(op);
                } else if (op instanceof AST.ThingRef) {
                    if (this.expr.tokens.slice(0, this.cursorPosition).every(t => t.getOperator() == "," || !!t.getLocalDef())) {
                        this.intelliAssign();
                    }
                    this.tokenEdit(op);
                } else if (op instanceof AST.PropertyRef) {
                    var prop = (<AST.PropertyRef> op).prop;
                    var call = prop ? AST.mkFakeCall(<AST.PropertyRef>op) : null
                    if (call && call.allowAssignment() &&
                        !((<AST.PropertyRef>op).call && (<AST.PropertyRef>op).call.loc.beg > 0)) {
                        this.intelliAssign();
                    }

                    var cacc = call ? call.calledExtensionAction() || call.calledAction() : null
                    if (cacc) this.addGoTo(cacc)
                    else if (!!prop && this.expr.tokens[this.cursorPosition - 2] && this.expr.tokens[this.cursorPosition - 2].getThing() instanceof AST.SingletonDef) {
                        var decl = prop.forwardsTo();
                        //if (decl && prop.getCategory() == PropertyCategory.Data && !(<AST.GlobalDef>decl).isResource) {
                            //this.intelliAssign();
                        //}

                        if (!!decl) this.addGoTo(decl);

                        if (decl instanceof AST.GlobalDef &&
                            this.recordCandidates(true).length > 0 &&
                            TheEditor.widgetEnabled('promoteRefactoring')) {

                            e = this.mkIntelliItem(0.89 * this.promoteMult(), Ticks.calcPromoteIntoField);
                            e.nameOverride = lf("promote to field");
                            e.descOverride = lf("of an object");
                            e.cbOverride = () => { this.promoteToField(op) };
                        }

                        if (decl instanceof AST.GlobalDef && TheEditor.widgetEnabled('promoteRefactoring')) {
                            e = this.mkIntelliItem(0.9 * this.promoteMult(), Ticks.calcDemoteIntoLocal);
                            e.nameOverride = lf("demote to var");
                            e.descOverride = lf("change (back) to local");
                            var globalToks = this.expr.tokens.slice(this.cursorPosition - 2, this.cursorPosition);
                            e.cbOverride = () => { this.replaceToks(globalToks, ReplacementScope.Action, true) };
                        }

                        if (decl instanceof AST.GlobalDef && (<AST.GlobalDef>decl).isResource &&
                                (decl.getKind() == api.core.Picture || decl.getKind() == api.core.Sound) &&
                                TheEditor.widgetEnabled("searchArtRefactoring")) {
                            e = this.mkIntelliItem(1.01e20, Ticks.calcEditArt);
                            e.nameOverride = decl.getKind() == api.core.Sound ? lf("replace sound") : lf("replace picture")
                            e.descOverride = lf("search art");
                            e.cbOverride = () => this.editArt(<AST.GlobalDef>decl)
                        }
                    }
                    this.tokenEdit(op);
                }

                if (this.currentIntelliItems.length < 6) {
                    this.intelliNew(+1, -1);
                }
            }

            if (!this.tokenEditDone && this.selectionLength() <= 1) {
                var op2 = this.expr.tokens[this.cursorPosition];
                if (op2) this.tokenEdit(op2);
            }

            if (TheEditor.widgetEnabled("makeAsyncRefactoring")) {
                var addAwait = this.expr.tokens.some((tt) => {
                    var t = <AST.PropertyRef>tt;
                    if (!(t instanceof AST.PropertyRef)) return false;
                    return !!(t.call && t.call.loc.beg == this.cursorPosition &&
                              !t.call.runAsAsync && t.prop.getFlags() & PropertyFlags.Async)
                })
                if (addAwait) {
                    var e = this.mkIntelliItem(1.01e20, Ticks.calcIntelliAsync)
                    e.nameOverride = "async";
                    e.descOverride = lf("make call async");
                    e.cbOverride = () => { this.insertOp("async") };
                }
            }

            // decide when to show "store in var". We used to hide it when the rhs was a local but this breaks tutorials
            // instead, we'll bump down the priority in that case.
            if (this.stmt instanceof AST.ExprStmt &&
                (this.expr.tokens.length > 0))
            {
                if (this.expr.tokens.every((t) => !t.getError()) &&
                    (this.expr.getKind().hasContext(KindContext.Parameter) ||
                     (this.expr.parsed.anyCalledAction() &&
                      this.expr.parsed.anyCalledAction().hasOutParameters())))
                {
                    var score = this.expr.tokens[0].getThing() instanceof AST.LocalDef ? this.promoteMult() * 1.0 : 1.1e20;
                    var e = this.mkIntelliItem(score, Ticks.calcStoreInVar);
                    e.nameOverride = lf("store in var");
                    e.descOverride = lf("new variable");
                    e.cbOverride = () => {
                        var suggestedName = this.storeVarName
                        this.storeVarName = null
                        this.unselect();
                        this.cursorPosition = 0;
                        this.insertOp(":=");
                        this.cursorPosition = 1;
                        if (suggestedName && this.expr.tokens[0].getThing() instanceof AST.LocalDef)
                            this.expr.tokens[0].getThing().setName(suggestedName)
                        this.display()
                        // this.inlineEdit(this.expr.tokens[0]);
                    };
                } else if (this.cursorPosition == 0) {
                    this.intelliAssign();
                }
            }

            if (TheEditor.currentAction() && TheEditor.currentAction().isCompilerTest() &&
                !this.stmt.errorIsOk && this.stmt.getError()) {
                var e = this.mkIntelliItem(1.2e20, Ticks.calcStoreInVar);
                e.nameOverride = lf("is OK");
                e.descOverride = lf("mark as OK");
                e.cbOverride = () => {
                    var stmt = new AST.Comment();
                    stmt.text = "E: " + this.stmt.getError().replace(/:.*/, "")
                    TheEditor.selector.injectBelow(stmt);
                };
            }

            this.addOptionalParameterOperations()
        }

        private addChangeOptionalButton()
        {
            var optionsParm = this.getOptionsParameter()
            if (optionsParm) {
                var e = this.mkIntelliItem(1.2e20, Ticks.calcAddOptionalParameter)
                e.nameOverride = lf("change optional");
                e.descOverride = lf("parameter name");
                e.cbOverride = () => this.editOptional(optionsParm)
            }
        }

        private editOptional(optionsParm:PropertyParameter)
        {
            this.pickOptionalParameterAsync(optionsParm, false)
                .then(rf => this.setOptionalParameter(rf))
                .done();
        }

        private getOptionsParameter():PropertyParameter
        {
            if (this.stmt.parent && this.stmt.parent.parent instanceof AST.InlineActions)
                return (<AST.InlineActions>this.stmt.parent.parent).getOptionsParameter()
        }

        private addOptionalParameterOperations()
        {
            var topCall = this.expr.topCall()
            var topProp = topCall ? topCall.getCalledProperty() : null
            var optionsParm = AST.OptionalParameter.optionsParameter(topProp)
            if (optionsParm && this.stmt instanceof AST.ExprStmt) {
                var e = this.mkIntelliItem(1.2e20, Ticks.calcAddOptionalParameter)
                e.imageOverride = "svg:Setting,#5A5AFF,clip=100"
                e.nameOverride = lf("add optional");
                e.descOverride = lf("add optional");
                e.cbOverride = () => this.pickOptionalParameterAsync(optionsParm)
                    .then(rf => this.addOptionalParameter(rf))
                    .done();
            }

            this.addChangeOptionalButton()
        }

        private addOptionalParameter(rf:AST.RecordField)
        {
            if (!rf) return
            var inl = this.ensureIsInlineActions()
            if (!inl) return

            var toEdit = this.stmt

            if (rf.dataKind.isAction) {
                var ia = AST.InlineAction.mk(AST.mkLocal(rf.getName(), rf.dataKind))
                ia.isOptional = true
                inl.actions.push(ia)
                toEdit = ia.body.stmts[0]
            } else {
                var opt = AST.OptionalParameter.mk(rf.getName())
                var pp = rf.bogusPropertyParameter()
                opt.expr.tokens.pushRange(this.findDefault(pp))
                inl.actions.push(opt)
                toEdit = opt
            }

            TheEditor.initIds(this.stmt, false)
            AST.TypeChecker.tcAction(TheEditor.currentAction(), false);
            inl.sortOptionals()
            TheEditor.refreshDecl();
            TheEditor.editNode(toEdit)
        }

        private setOptionalParameter(rf:AST.RecordField)
        {
            if (!rf) return
            if (!(this.stmt instanceof AST.OptionalParameter)) return

            var opt = <AST.OptionalParameter>this.stmt
            opt.recordField = null
            opt._opt_name = rf.getName()

            if (this.expr.tokens.length == 0)
                opt.expr.tokens.pushRange(this.findDefault(rf.bogusPropertyParameter()))

            opt.notifyChange()

            AST.TypeChecker.tcAction(TheEditor.currentAction(), false);
            (<AST.InlineActions>opt.parent.parent).sortOptionals()
            this.fullDisplay()
        }

        private pickOptionalParameterAsync(parm:PropertyParameter, includeActions = true)
        {
            var res = new PromiseInv()
            var result = null

            var m = new ModalDialog()
            var boxes = []
            parm.getKind().listProperties().forEach(p => {
                var fwd = p.forwardsToStmt()
                if (fwd instanceof AST.RecordField &&
                    (includeActions || !(<AST.RecordField>fwd).dataKind.isAction))
                    boxes.push(DeclRender.mkBox(<any>fwd).withClick(() => {
                        result = fwd
                        m.dismiss()
                    }))
            })

            m.onDismiss = () => res.success(result)
            m.choose(boxes, { header: lf("Optional parameter:") })

            return res
        }

        private selectionLength() { return this.selectionEnd - this.selectionStart; }

        private addBoxButtons()
        {
            // Clear the highlighting.
            LayoutMgr.instance.setCurrentId("");

            // If the cursor is not at the boxed syntax, ...
            if (!this.boxMode) {
                var s = this.stmt;
                if (s instanceof AST.ExprStmt
                        && (<AST.ExprStmt>s).expr.parsed instanceof AST.Call) {
                    var call = (<AST.Call>(<AST.ExprStmt>s).expr.parsed);
                    if (call.args[0] instanceof AST.ThingRef) {
                        var thingRef = <AST.ThingRef>call.args[0];
                        if (thingRef.data === "box" && thingRef.def instanceof AST.SingletonDef) {
                            // Highlight the boxes by AST node id.
                            LayoutMgr.instance.setCurrentId(s.stableId);
                        }
                    }
                }
                return;
            }

            function scanForProperty(s:AST.Stmt) {
                var expr = s.calcNode();
                var res:IProperty = null;

                if (expr)
                    expr.tokens.forEach((t:AST.Token) => {
                        if (t instanceof AST.PropertyRef) {
                            var p = (<AST.PropertyRef>t).prop;
                            if (p && p.parentKind == api.core.Box && /^set /.test(p.getName())) {
                                res = p;
                            }
                        }
                    })

                return res;
            }

            LayoutMgr.instance.setCurrentId(this.stmt.stableId);

            // This is not the newest result but there's no problem.
            // (there's no chance that boxed statement is selected right after the script change.)
            var box = LayoutMgr.instance.findFirstBoxByNodeId(this.stmt.stableId);
            if (box === null) return;

            var pcTable = box.pcTable;
            var linesWithBoxUpdates: string[] = [];
            for (var index in pcTable)
                linesWithBoxUpdates.push(pcTable[index]);

            var usedProperties: any = {};

            linesWithBoxUpdates.forEach((id) => {
                var res = Script.findAstNodeById(id);
                if (res && res.node instanceof AST.Stmt) {
                    var decl = scanForProperty(<AST.Stmt>res.node)
                    if (decl) {
                        var e = this.mkIntelliItem(1e20, Ticks.calcGoToBoxProperty);
                        e.prop = decl;
                        e.nameOverride = decl.getName().slice(4)
                        e.descOverride = lf("existing property");
                        usedProperties[decl.getName()] = true;
                        e.cbOverride = () => {
                            var loc = CodeLocation.fromNodeId(id);
                            if (!loc) return;
                            TheEditor.goToLocationAndEdit(loc);
                        };
                    }
                }
            })

            api.core.Box.listProperties().forEach((prop: IProperty) => {
                if (!usedProperties[prop.getName()] && /^set /.test(prop.getName())) {
                    var e = this.mkIntelliItem(0.9e20, Ticks.calcAddBoxProperty);
                    e.prop = prop;
                    e.nameOverride = prop.getName().slice(4)
                    e.descOverride = lf("new property");
                    e.cbOverride = () => {
                        TheEditor.selector.addCallback(2)();
                        this.insertProp(prop, true);
                    };
                }
            })
        }

        public getTokenBeforeCursor()
        {
            if (!this.expr) return null;
            if (this.cursorPosition == 0) return null;
            return this.expr.tokens[this.cursorPosition - 1]
        }

        public getSingletonBeforeCursor()
        {
            var tok = this.getTokenBeforeCursor()
            if (tok) {
                var t = tok.getThing()
                if (t instanceof AST.SingletonDef) return <AST.SingletonDef>t;
            }
            return null;
        }


        private setupIntelliButtons()
        {
            this.inPropertyPosition = false;
            this.suggestedAssignment = false;
            this.currentIntelliItems = [];

            //this.intelliPredictor.initGoalState(this.expr, this.stmt, this.cursorPosition, this.enableNewPredictor?this.calcDebugging:null, this.enableNewPredictor);
            this.addBoxButtons();
            this.elseIfButton();
            this.addFieldButtons();

            if (!this.noExpr) {
                var placeholderDef:AST.PlaceholderDef = null;
                var prevTok = this.expr.tokens[this.cursorPosition - 1]
                var nameHint:string = null
                if (this.isPlaceholderToken(prevTok))
                    placeholderDef = <AST.PlaceholderDef>prevTok.getThing()

                if (this.inSelectionMode())
                    this.addSelectionButtons();
                else
                    this.addRegularButtons(placeholderDef)

                this.fixItButtons();
                this.specialEditButtons(placeholderDef);
            }

            this.addParamterStringValuesButtons();

            if (this.currentIntelliItems.length == 0) {
                var item = this.mkIntelliItem(0, Ticks.noEvent);
                item.nameOverride = lf("... nothing to see here ...");
                item.descOverride = lf("expression has type 'Nothing'");
            }

            if (!this.specialKeypadOn)
                this.bindIntelliButtons(0);
            this.searchApi.displayPlaceholder();

            this.setupHelp()
            this.setupTopButtons();
        }

        private renderHelp(find:FindResult)
        {
            var sig = []
            find.property.getParameters().forEach((p, i) => {
                if (i == 0) return; // this parameter

                if (sig.length == 0) sig.push("(");
                else sig.push(", ");
                if (i == find.index)
                    sig.push(span("calcApiHelpCurrentParameter", p.getName()));
                else
                    sig.push(p.getName());
                sig.push(" : " + p.getKind().toString())
            });
            if (sig.length > 0)
                sig.push(")");

            sig.unshift(find.property.getName())

            var resK = find.property.getResult().getKind();
            if (resK != api.core.Nothing) {
                sig.push(" returns ");
                sig.pushRange(resK.getHtmlName())
            }

            if (sig.length > 0)
                sig.push(" -- ")

            var translate = find.property instanceof AST.LibraryRefAction
            sig.push(this.renderHelpCore(find.property.getDescription(), translate))

            return sig
        }

        private renderHelpCore(desc:string, translate:boolean)
        {
            var md = new MdComments();
            var elt = HTML.span("md-inline")
            desc = desc.replace(/{hints:[^}]+}/g, "")
            desc = desc.replace(/\n/g, " ")
            desc = desc.replace(/^\s+/, "")
            desc = desc.replace(/\s+$/, "")
            if (translate)
                desc = lf_static(desc, !!Util.translationToken)
            Browser.setInnerHTML(elt, md.formatInline(desc));
            return elt
        }

        private getParameterStringValuesAtCursor()
        {
            if (this.stmt instanceof AST.OptionalParameter &&
                this.expr.tokens.slice(0, this.cursorPosition).every(t => t.getLiteral() || t.isDigit()))
            {
                var rf = (<AST.OptionalParameter>this.stmt).recordField
                if (rf) return rf.bogusPropertyParameter()
            }

            var results:FindResult[] = []
            this.findCallAndArg(this.expr.parsed, results);
            var r0 = results[0];
            if (r0) {
                return r0.property.getParameters()[r0.index];
            }
            return undefined;
        }

        private addParamterStringValuesButtons()
        {
            var pp = this.getParameterStringValuesAtCursor();
            if (!pp) return
            var stringValues = pp.getStringValues()
            if (!stringValues || stringValues.length <= 1) return
            var picStringValues = Browser.lowMemory ? {} : (pp.getStringValueArtIds() || {});
            stringValues.forEach((s, i) => {
                var e = this.mkIntelliItem(1e8 - i, Ticks.calcInsertStringParamterValue);
                var isNum = pp.getKind() == api.core.Number

                e.nameOverride = isNum ? s + "" : Util.fmt('"{0}"', s);
                e.descOverride = "insert";
                e.iconOverride = "svg:NumberedList,white";
                e.colorOverride = "rgb(0, 204, 153)";
                var spic = picStringValues[s];
                if (spic) {
                    e.imageOverride = Cloud.artUrl(spic, true);
                    e.descOverride = e.nameOverride;
                }
                e.cbOverride = () => {
                    this.unselect();
                    var toks = this.expr.tokens
                    var isDigit = (t:AST.Token) => t && t.isDigit()
                    if (isNum) {
                        while (this.cursorPosition > 0 && isDigit(toks[this.cursorPosition - 1]))
                            this.cursorPosition--
                        var end = this.cursorPosition
                        while (isDigit(toks[end])) end++
                        this.deleteTokens(this.cursorPosition, end - this.cursorPosition)
                        this.insertTokens(AST.Fixer.tokenize([AST.mkLit(parseFloat(s))]))
                    } else {
                        if (toks[this.cursorPosition] instanceof AST.Literal) {
                            this.cursorPosition++;
                        }
                        if (toks[this.cursorPosition - 1] instanceof AST.Literal) {
                            this.cursorPosition--;
                            this.deleteTokens(this.cursorPosition, 1);
                        }

                        this.insertToken(AST.mkLit(s));
                    }
                    this.display();
                };
            })
        }

        private setupHelp()
        {
            var topics: HelpTopic[] = [];
            var results: FindResult[] = []
            var didIt = false

            var addTopic = (id:string) => {
                if (!id) return;
                var t = HelpTopic.findById(id)
                if (t) topics.push(t);
            }

            var setHelp = (args:any) => {
                didIt = true
                this.apiHelpDiv.setChildren(div("calcApiHelpInner", args));
                if (TheEditor.widgetEnabled("calcApiHelp"))
                    this.apiHelpDiv.appendChild(
                        div('calcApiHelpMore', lf("help...")).withClick(() => TheEditor.displayHelp())
                    );
            }

            this.findCallAndArg(this.expr.parsed, results);
            results.forEach((r) => {
                if (r.property instanceof AST.LibraryRefAction) {
                    var libAct = <AST.LibraryRefAction>r.property
                    if (libAct.parentLibrary().resolved)
                        topics.push(HelpTopic.forLibraryAction(libAct))
                }
                addTopic(r.property.helpTopic())
                if (r.property.getFlags() & PropertyFlags.IsObsolete)
                    addTopic("obsolete")
            })
            this.expr.tokens.forEach((t) => {
                var p = t.getProperty();
                if (p) addTopic(p.helpTopic())
            })

            var tok = this.expr.tokens[this.cursorPosition - 1];
            if (!(tok instanceof AST.ThingRef))
                tok = this.expr.tokens[this.cursorPosition];
            if (tok instanceof AST.ThingRef) {
                var th = <AST.ThingRef>tok;
                if (th.def) {
                    addTopic(th.def.getKind().getName())
                    if (results.length == 0)
                        setHelp(th.def.getName() + " -- " + th.def.getDescription())
                }
            }

            if (results.length > 0) {
                setHelp(this.renderHelp(results[0]))
            } else if (this.stmt instanceof AST.OptionalParameter) {
                var opt = (<AST.OptionalParameter>this.stmt).recordField
                if (opt && opt.getDescription())
                    setHelp(this.renderHelpCore(opt.getName() + " -- " + opt.getDescription(), true))
            }

            if (!didIt) setHelp("")

            addTopic(this.stmt.helpTopic());
            HelpTopic.contextTopics = topics;
        }

        private bindIntelliButtons(offset:number)
        {
            var items = this.sortedIntelliItems();
            var usedProfile = (<any>items).usedProfile;
            var keys = this.keyBlock(SizeMgr.portraitMode ? 0 : 6, SizeMgr.phoneMode ? 4 : 6, 0, 2);
            var cleared = false;
            var keyNum = keys.length - 1;
            var maxPages = (SizeMgr.phoneMode || TheEditor.stepTutorial) ? 3 : 2;
            var origItems = items
            items = items.slice(0, maxPages * keyNum - 1)

            if (this.currentInstruction) {
                var tok = this.currentInstruction.addToken
                if (tok && tok.getProperty()) {
                    var isInsert = (it:IntelliItem) => it.prop == tok.getProperty()
                    if (items.filter(isInsert).length == 0) {
                        var it0 = origItems.filter(isInsert)[0]
                        if (it0) {
                            items.pop()
                            items.push(it0)
                        }
                    }
                }
            }

            var pages = Math.ceil((items.length + 1) / keyNum);

            var curPage = offset / keyNum + 1;

            for (var i = 0; i < keyNum; ++i) {
                if (i + offset < items.length)
                    items[i+offset].apply(keys[i], i + offset);
                else
                    keys[i].clearIntelli();
            }

            if (curPage == pages) {
                var search = pages == 1 ? keys[keys.length - 1] : keys[keys.length - 2];
                search.setImage("svg:Search,#5A5AFF,clip=100", lf("more"), Ticks.calcNextIntelliPageSearch,
                              () => {
                                    if (this.searchApi.visible) {
                                        this.searchApi.cancel();
                                        this.bindIntelliButtons(0);
                                    } else {
                                        this.searchApi.show("", false);
                                    }
                              })
                search.setIntelli();
            }

            if (pages > 1) {
                var last = keys.peek();
                last.setImage("svg:" + (pages == curPage ? "ChapBack" : "Forward") + ",#5A5AFF,clip=125",
                              (pages == curPage ? lf("rewind ") : lf("more ")) + curPage + "/" + pages,
                              Ticks.calcNextIntelliPage,
                              () => {
                                    tickN(Ticks.calcNextIntelliPage0, curPage)
                                    this.bindIntelliButtons(pages == curPage ? 0 : offset + keyNum)
                                    TheEditor.updateTutorial()
                              })
                last.setIntelli();
            }
        }

        private setupTopPaging()
        {
            var stmtItems = TheEditor.selector.getStmtIntelliItems();

            var calcw = Math.min(7, Calculator.keypadW());
            var pageSize = calcw - 1;
            var firstPageSize = AST.blockMode
                ? Math.min(pageSize, 4) // var, if, for, while
                : pageSize;

            var firstPage:IntelliItem[] = stmtItems.slice(0);
            var usage = (a:IntelliItem) => api.core.stmtUsage(a.usageKey).count();
            if (TheEditor.intelliProfile)
                firstPage = stmtItems.filter(it => (usage(it) >= 1) || TheEditor.intelliProfile.hasKey(it.usageKey))

            if (firstPage.length > firstPageSize) {
                var cmpStmt = (a:IntelliItem, b:IntelliItem) => usage(b) - usage(a);
                firstPage.sort(cmpStmt);
                firstPage = firstPage.slice(0, firstPageSize);
                firstPage = stmtItems.filter(it => firstPage.indexOf(it) >= 0)
            }

            var remainingItems = stmtItems.filter(it => firstPage.indexOf(it) < 0);
            var pages:IntelliItem[][] = [];

            var currPage = 0;
            var pages = Util.chopArray(remainingItems, firstPageSize);
            pages.unshift(firstPage);

            var setupTop = ():void => {
                var page = pages[currPage];
                for (var i = 0; i < pageSize; ++i) {
                    var btn = this.topButtons[i];
                    if (page[i])
                        page[i].apply(btn, -1);
                    else {
                        btn.clear();
                        btn._theButton.className = "calcButton calcStmtButton"
                    }
                }

                var next = this.topButtons[pageSize];

                next.setImage("svg:Forward,#5A5AFF,clip=125", lf("more"),
                            Ticks.calcNextIntelliTopPage,
                          () => {
                                currPage++;
                                if (currPage >= pages.length)
                                    currPage = 0;
                                setupTop();
                                TheEditor.updateTutorial()
                          })
                next._theButton.className = "calcButton calcStmtButton"
            }
            this.calcTopButtons.setChildren(this.topButtons.slice(0, calcw).map((b) => b.getButton()));
            setupTop();
        }

        private setupTopButtons()
        {
            if (this.cursorPosition == 0 /*this.stmt.isPlaceholder()*/) {
                this.setupTopPaging();
            } else {
                this.calcTopButtons.setChildren([this.apiHelpDiv]);
            }

            TheEditor.adjustCodeViewSize(this.stmt);
        }

        private sortedIntelliItems() : IntelliItem[]
        {
            var items0 = this.currentIntelliItems.filter(ii => ii.score > 0);
            var usedProfile = false;
            if (TheEditor.intelliProfile) {
                var prof = TheEditor.intelliProfile;
                var numKept = 0;
                var numSkipped = 0;
                items0 = items0.filter(it => {
                    if (it.prop) {
                        if (prof.hasProperty(it.prop)) {
                            numKept++;
                            return true;
                        } else {
                            numSkipped++;
                            return false;
                        }
                    }
                    if (it.decl) {
                        if (prof.hasDecl(it.decl)) {
                            numKept++;
                            return true;
                        } else {
                            numSkipped++;
                            return false;
                        }
                    }
                    return true;
                })

                // if nothing is left, disable profiling
                if (numSkipped > 0) {
                    if (numKept == 0)
                        items0 = this.currentIntelliItems;
                    else
                        usedProfile = true;
                }
            }

            var items = items0.filter((it:IntelliItem) => {
                if (it.noButton) return false;
                if (it.prop) return Script.canUseProperty(it.prop)
                if (it.decl instanceof AST.SingletonDef)
                    return it.decl.getName() == "art" ||
                           it.decl.getKind().listProperties().some((p) => Script.canUseProperty(p))
                return true;
            })
            this.intelliPredictor.scoreIntelliItems(items, this.cursorPosition);
            (<any>items).usedProfile = usedProfile;
            return items;
        }

        public hideBottomScroller()
        {
            // searchApi.dismiss();
        }


        //
        // Selection
        //

        public inSelectionMode() { return this.selectionStart >= 0; }

        public unselect()
        {
            this.selectionStart = -1;
            this.selectionEnd = -1;
            this.keyboardSelectionLeft = false;
            if (this.cursorPosBeforeSelection >= 0)
                this.cursorPosition = this.cursorPosBeforeSelection;
            this.cursorPosBeforeSelection = -1;
        }

        private findBiggerSelection(e:AST.Expr) : any
        {
            return this.selectionSearch(null, e,
                (e, parm) => {
                    if (e.loc.len == this.selectionEnd - this.selectionStart) return null; // no extension
                    return { beg: e.loc.beg, end: e.loc.beg + e.loc.len };
                });
        }

        private hasCursor(e:AST.Expr)
        {
            if (!e.loc) return false;
            var diff = this.cursorPosition - e.loc.beg;
            return diff >= 0 && diff <= e.loc.len;
        }

        private findCallAndArg(e:AST.Expr, res:FindResult[])
        {
            if (e instanceof AST.Call) {
                var c = <AST.Call>e;
                var argWithCursor = null;
                c.args.forEach((ee) => {
                    if (this.hasCursor(ee))
                        argWithCursor = ee;
                })

                if (argWithCursor)
                    this.findCallAndArg(argWithCursor, res);

                var idx = c.args.indexOf(argWithCursor);

                if (!argWithCursor && c.loc) {
                    var d = this.cursorPosition - (e.loc.beg + e.loc.len);
                    if (d == 0 || d == -1) {
                        var prevTok = <AST.Operator> this.expr.tokens[this.cursorPosition - 1];
                        if (prevTok instanceof AST.Operator && (prevTok.data == "," || prevTok.data == "(")) {
                            idx = c.args.length;
                            // skip the implicit _body_ argument
                            if (c.args[idx - 1] instanceof AST.ThingRef &&
                                c.args[idx - 1].getLocalDef() &&
                                c.args[idx - 1].getLocalDef().isSynthetic)
                                idx--;
                        }
                    }
                }

                var prop = c.prop();
                if (!prop || prop.getInfixPriority() > 0) {}
                else res.push({ property: prop, index: idx })
            }
        }

        private selectionSearch(parm:PropertyParameter, e:AST.Expr, f:(e:AST.Expr, parm:PropertyParameter)=>any) : any
        {
            if (e instanceof AST.Call) {
                var c = <AST.Call>e;
                var params = !c.prop() ? [] : c.prop().getParameters();
                for (var i = 0; i < c.args.length; ++i) {
                    var r = this.selectionSearch(params[i], c.args[i], f);
                    if (!!r) return r;
                }
            }

            if (!e.loc) return null;

            var s0 = e.loc.beg;
            var s1 = s0 + e.loc.len;

            if (s0 > this.selectionStart) return null;
            if (s1 < this.selectionEnd) return null;
            return f(e, parm);
        }

        private biggerSelection()
        {
            var bigger = this.findBiggerSelection(this.expr.parsed);
            if (!bigger && (this.selectionStart > 0 || this.selectionEnd < this.expr.tokens.length)) {
                bigger = { beg: 0, end: this.expr.tokens.length }
            }
            return bigger;
        }

        private toggleSelection()
        {
            if (!this.inSelectionMode()) {
                if (this.expr.tokens.length == 0) return;
                this.cursorPosBeforeSelection = this.cursorPosition;
                if (this.cursorPosition == 0)
                    this.cursorPosition++;
                this.selectionStart = this.cursorPosition - 1;
                this.selectionEnd = this.cursorPosition;
                if (this.keyboardSelectionLeft)
                    this.cursorPosition--;
            } else {
                var bigger = this.biggerSelection();
                if (!bigger)
                    this.unselect();
                else {
                    this.selectionStart = bigger.beg;
                    this.selectionEnd = bigger.end;
                    this.cursorPosition = this.selectionEnd;
                }
            }
            this.display();
        }


        private elseIfButton()
        {
            if (!(this.stmt instanceof AST.If)) return;
            if (this.inSelectionMode()) return;
            var ifStmt = <AST.If>this.stmt;
            var stmts = ifStmt.parentBlock().stmts
            var prevStmt = <AST.If> stmts[stmts.indexOf(ifStmt) - 1]
            if (!ifStmt.isElseIf && prevStmt instanceof AST.If) {
                var e = this.mkIntelliItem(1.01e20, Ticks.calcElseIf);
                e.nameOverride = lf("else if");
                e.descOverride = lf("turn into");
                e.cbOverride = () => {
                    if (!prevStmt.rawElseBody.isBlockPlaceholder()) {
                        ModalDialog.info(lf("sorry, no can do"), lf("'else' of the preceeding 'if' must be empty"))
                    } else {
                        ifStmt.isElseIf = true;
                        this.fullDisplay()
                    }
                };
            }

            if (ifStmt.isElseIf) {
                var e = this.mkIntelliItem(1.01e20, Ticks.calcUnElseIf);
                e.nameOverride = lf("if");
                e.descOverride = lf("remove else");
                e.cbOverride = () => {
                    ifStmt.isElseIf = false;
                    this.fullDisplay()
                };
            }
        }

        public goalHTML()
        {
            if (!this.hasGoal) return null;
            return this.templateLine.outerHTML;
        }

        public goalTip()
        {
            if (TipManager.isVisible()) return;
            if (!this.expr) return;
            if (!this.hasGoal) return;
            TheEditor.stepTutorial.goalTips++;
            TipManager.setTip({
                el: this.templateLine,
                title: lf("code the goal line"),
                description: lf("or tap to get help"),
                forceBottom: true,
            })
        }

        static searchTip(e:HTMLElement, fw:AST.GlobalDef)
        {
            var examples = []
            if (/background/i.test(fw.getName()))
                examples = ["moon", "desert", "jungle", "island", "landscape", "background"]
            else if (fw.getKind() == api.core.Picture)
                examples = ["cat", "dog", "monster", "pumpkin", "alien", "unicorn", "ball", "fruit"]
            else if (fw.getKind() == api.core.Sound)
                examples = ["laser", "scream", "explosion", "meow", "piano", "bark", "moo", "bell"]
            Random.permute(examples)
            examples.unshift(fw.getName())
            examples = examples.filter((e, i) => examples.indexOf(e) == i)
            TipManager.setTip({
                el: e,
                title: lf("search here for {0}", fw.getKind().toString().toLowerCase()),
                description: lf("ex: ") + examples.slice(0, Browser.isMobile ? 3 : 6).join(", "),
            })
        }

        public applyInstruction(ins:TutorialInstruction)
        {
            this.hasGoal = false;
            this.storeVarName = null;
            this.forceLoopLocalName = null;
            this.currentInstruction = ins;

            if (!ins) {
                if (this.showPerfectLine) {
                    this.templateLine.style.display = "block";
                    Browser.setInnerHTML(this.templateLine, Renderer.tdiv("calcTemplateInner",
                        lf("<b>this line is perfect!</b> let's move on")))
                } else {
                    this.templateLine.style.display = "none";
                    Browser.setInnerHTML(this.templateLine, "");
                }
                TheEditor.selector.positionButtonRows();
                return;
            }

            this.showPerfectLine = true;


            if (ins.showTokens) {
                this.templateLine.style.display = "block";
                Browser.setInnerHTML(this.templateLine, Renderer.tdiv("calcTemplateInner",
                  lf("goal:") + " <span class='goalTokens'>" + this.renderer.renderDiffTokens(ins.showTokens) + "</span>"));
                this.hasGoal = true;
            } else {
                this.templateLine.style.display = "none";
                this.templateLine.setChildren([])
            }
            TheEditor.selector.positionButtonRows();

            var pos = this.expr.tokens.indexOf(ins.delToken || ins.addAfter) + 1
            // if (ins.delToken) pos++;
            var setF = TipManager.scheduleTip;

            if (pos > this.cursorPosition &&
                ins.addToken &&
                ins.addToken.getOperator() &&
                this.expr.tokens.slice(this.cursorPosition, pos).every(t => t.getOperator() == ins.addToken.getOperator()))
            {
                pos = this.cursorPosition
            }

            var inKeypad = (n:number) =>
            {
                if (SizeMgr.portraitMode) {
                    if (n == 4) {
                        if (SizeMgr.phoneMode && this.specialKeypadOn == 1)
                            n = 0;
                        else
                            return true;
                    }
                    if (n == 2 && !SizeMgr.phoneMode)
                        n = 1;
                    if (n == 3) {
                        if (SizeMgr.phoneMode) n = 2;
                        else n = 0;
                    }
                    if (this.specialKeypadOn != n) {
                        setF({
                            tick: n == 0 ? Ticks.calcBtnNormalKeypad :
                                  n == 1 ? Ticks.calcBtnNumberKeypad :
                                           Ticks.calcBtnMiscKeypad,
                            title: lf("tap there"),
                            description: lf("we need different keypad")
                        })
                        return false;
                    }
                }
                return true;
            }

            var apiSearchVisible = () => {
                if (TheEditor.autoHide() && TheEditor.sidePaneVisibleNow()) {
                    TipManager.setTip({
                        tick: Ticks.calcSearchBack,
                        title: lf("tap there"),
                        description: lf("need to edit elsewhere")
                    })
                    return true
                }

                return false
            }

            var inCursorPosition = () => {
                if (pos == this.cursorPosition - 1 && this.isPlaceholderToken(this.expr.tokens[pos]))
                    return true;
                if (pos != this.cursorPosition) {
                    if (!inKeypad(4)) return false;
                    setF({
                        tick: pos < this.cursorPosition ? Ticks.calcMoveCursorLeft : Ticks.calcMoveCursorRight,
                        title: lf("tap there"),
                        description:
                          pos < this.cursorPosition ? lf("move the cursor left") : lf("move the cursor right")
                    })
                    return false;
                } else return true;
            }

            var inPosition = () => {
                if (apiSearchVisible()) return false
                return inCursorPosition();
            }

            if (ins.delToken) {
                setF = TipManager.setTip;
                if (!inPosition()) return;
                setF({
                    tick: Ticks.calcBtnBackspace,
                    title: lf("backspace this"),
                    description: lf("let's change this"),
                })
                return;
            }

            var intelliFilter:(c:IntelliItem) => boolean;
            var btnFilter:(b:CalcButton) => boolean;

            var declMatch = (tmpl:string, act:AST.Decl) => {
                if (!tmpl || !act) return false
                return tmpl == act.getName()
            }

            if (ins.stmtToInsert || ins.isOpStmt) {
                if (apiSearchVisible()) return
                if (ins.isOpStmt && !inPosition()) return;

                var ntype = ins.isOpStmt ? ins.addToken.getOperator() : ins.stmtToInsert.nodeType()
                if (ntype == "elseIf") ntype = "if"
                if (ntype == "foreach" || ntype == "for") {
                    var loc = ins.stmtToInsert.loopVariable()
                    if (loc)
                        this.forceLoopLocalName = loc.getName()
                }
                btnFilter = b => b.intelliItem && b.intelliItem.usageKey == ntype

                var trg = this.topButtons.filter(btnFilter)[0]
                if (trg) {
                    setF({
                        el: trg._theButton,
                        title: lf("tap there"),
                        description: lf("insert statement")
                    })
                    return;
                } else if (intelliFilter) {
                    setF({
                        tick: Ticks.calcNextIntelliTopPage,
                        title: lf("tap there"),
                        description: lf("show more options")
                    })
                    return;
                }
            } else if (ins.addToken) {
                var label = lf("insert {0}", ins.addToken)
                var th = ins.addToken.getThing()
                var op = ins.addToken.getOperator()
                var prop = ins.addToken.getProperty()
                var fw = prop ? prop.forwardsTo() : null

                if (!ins.calcIntelli && fw instanceof AST.GlobalDef && (<AST.GlobalDef>fw).isResource) {
                    if (!inCursorPosition()) return;
                    if (Script.resources().length == 0)
                        setF = TipManager.setTip;

                    Calculator.searchTip(elt("apiSearchBox"), <AST.GlobalDef>fw)
                    this.searchApi.prepopulate = fw.getName()
                    this.searchApi.artKind = fw.getKind();
                    TheEditor.stepTutorial.expectingSearch = 1;
                    return;
                }

                if (apiSearchVisible()) return

                if (ins.addToken2) {
                    if (th && th.getName() == AST.libSymbol && ins.addToken2.getProperty()) {
                        th = null
                        prop = ins.addToken2.getProperty()
                        label = lf("insert {0}", prop.getName())
                    }
                }

                if (ins.storeInVar && !this.getLocals().some(l => declMatch(ins.storeInVar, l))) {
                    intelliFilter = c => c.tick == Ticks.calcStoreInVar;
                    label = lf("store the value in a variable");
                    setF = TipManager.setTip;
                    inPosition = () => true; // always OK
                    this.storeVarName = ins.storeInVar;
                    th = null;
                }

                if (ins.localName && this.inlineEditToken == ins.addAfter) {
                    TipManager.setTip({
                        el: elt("nameLocal"),
                        title: lf("type: ") + ins.localName,
                        description: lf("tap (←) when done"),
                    })
                    return;
                }

                if (ins.editString && this.inlineEditToken == ins.addAfter) {
                    TipManager.setTip({
                        el: elt("inlineEditCloseBtn"),
                        title: lf("type: ") + ins.editString,
                        description: lf("tap here when done"),
                    })
                    return;
                }

                if (!inPosition()) return;

                if (ins.calcIntelli) {
                    intelliFilter = c => c.tick == ins.calcIntelli
                    label = ins.label
                    setF = TipManager.setTip;
                } else if (ins.promoteToFieldNamed) {
                    intelliFilter = c => c.tick == Ticks.calcBindGlobal ||
                        (ins.promoteToFieldOf == "data" ?
                            c.tick == Ticks.calcPromoteIntoGlobal :
                            c.tick == Ticks.calcPromoteIntoField);
                    label = lf("need a new field here");
                    setF = TipManager.setTip;
                } else if (ins.localName) {
                    intelliFilter = c => c.nameOverride == lf("rename");
                    label = lf("need a different name here")
                    setF = TipManager.setTip;
                } else if (ins.editString) {
                    intelliFilter = c => c.nameOverride == lf("edit");
                    label = lf("need a different string here")
                    setF = TipManager.setTip;
                } else if (th != null) {
                    intelliFilter = c => declMatch(th.getName(), c.decl)
                } else if (prop != null) {
                    //var fwName = ""
                    //if (prop.forwardsTo())
                    //    fwName = prop.forwardsTo().getName()
                    intelliFilter = c => c.prop && c.prop.getName() == prop.getName();
                   // == prop || prop instanceof SimpleProperty
                    //c.prop.forwardsTo() && c.prop.forwardsTo().getName() == fwName);
                } else if (op != null) {
                    if (/^[0-9\.\-]$/.test(op)) {
                        if (!inKeypad(1)) return;
                        btnFilter = b => !b.intelliItem && b.getText() == op;
                    } else if (op == "not") {
                        if (!inKeypad(2)) return;
                        btnFilter = b => !b.intelliItem && b.getText() == op;
                    } else if (/^[(),]$/.test(op)) {
                        if (!inKeypad(3)) return;
                        btnFilter = b => !b.intelliItem && b.getText() == op;
                    } else if (op == ":=") {
                        intelliFilter = c => c.nameOverride == ":=";
                    } else {
                        intelliFilter = c => c.prop && c.prop.getName() == op;
                    }
                } else if (ins.addToken instanceof AST.Literal) {
                    var v = (<AST.Literal>ins.addToken).data
                    if (v === true || v === false) {
                        if (!inKeypad(2)) return;
                        btnFilter = b => !b.intelliItem && b.getText() == (v ? "true" : "false");
                    } else if (typeof v == "string") {
                        if (!inKeypad(2)) return;
                        btnFilter = b => !b.intelliItem && b.getText() == "\"abc\"";
                    }
                }

                if (intelliFilter) {
                    if (!inKeypad(0)) return;
                    btnFilter = b => b.intelliItem && intelliFilter(b.intelliItem);
                }

                if (btnFilter) {
                    var trg = this.buttons.filter(btnFilter)[0]
                    if (trg) {
                        setF({
                            el: trg._theButton,
                            title: lf("tap there"),
                            description: label,
                        })
                        return;
                    } else if (intelliFilter) {
                        setF({
                            tick: Ticks.calcNextIntelliPage,
                            title: lf("tap there"),
                            description: lf("show more options")
                        })
                        return;
                    }
                }
            }

            TipManager.setTip(null)
        }

    }


    export class TokenKind
    {
        public primaryKind : Kind = null;
        public refKind : Kind = null;
        public refIsCloud = false;
        public secondaryKinds : Kind[] = [];
        public definition : AST.Decl = null;

        constructor(public par:Calculator) {
        }
        private setKind(k:Kind)
        {
            if (!k || k == api.core.Unknown) return;

            if (this.primaryKind == null) this.primaryKind = k;
            else if (this.primaryKind == k || this.secondaryKinds.indexOf(k) >= 0) {}
            else {
                if (!this.primaryKind.isData)
                    return; // just stick to primary kind for singletons
                this.secondaryKinds.push(k);
            }
        }

        private find(e:AST.Expr)
        {
            var cursorPosition = this.par.cursorPosition;
            var endPoint = cursorPosition + 1;
            if (!!e.loc) endPoint = e.loc.beg + e.loc.len;

            if (e.nodeType() == "call" && endPoint >= cursorPosition) {
                var c = <AST.Call> e;

                if (endPoint == cursorPosition && !!c.prop() && c.prop().getInfixPriority() == 0) {
                    var decl = c.prop().forwardsTo();
                    if (!!decl) this.definition = decl;
                    this.setKind(c.getKind());
                }

                c.args.forEach((a) => this.find(a));
            }

            if (endPoint == cursorPosition)
                this.setKind(e.getKind());
        }

        public run()
        {
            var cursorPosition = this.par.cursorPosition;
            if (cursorPosition == 0) return;

            var op = this.par.expr.tokens[cursorPosition - 1];
            switch (op.nodeType()) {
            case "literal":
            case "thingRef":
                this.setKind(op.getKind());
                break;

            case "propertyRef":
                var pp = <AST.PropertyRef> op;
                var cc = AST.mkFakeCall(pp)
                if (cc.allowRefUse()) {
                    var rcf = cc.referencedRecordField()
                    var gd = cc.referencedData()
                    if (rcf) {
                        this.refKind = rcf.fieldKind
                        this.refIsCloud = rcf.def().cloudEnabled
                    }
                    if (gd) {
                        this.refKind = api.core.Ref.createInstance([gd.getKind()])
                    }
                }

                if (!!pp.prop && pp.prop.getParameters().length == 1) {
                    this.setKind(pp.prop.getResult().getKind());
                } else {
                    return;
                }
                break;

            case "operator":
                var o = <AST.Operator> op;
                if (/^[0-9\.]$/.test(o.data)) {
                    this.setKind(api.core.Number);
                } else if (o.data == ")") {
                } else {
                    return;
                }
                break;
            }

            this.find(this.par.expr.parsed);
        }
    }

    export enum ReplacementScope
    {
        Selection,
        Action,
        Script
    }

    export class AddArgument
        extends AST.NodeVisitor
    {
        constructor(public action:AST.Action, public parameter:AST.Token[])
        {
            super()
        }

        visitExprHolder(eh:AST.ExprHolder)
        {
            var ins = (i:number, toks:AST.Token[]) => {
                toks.forEach(t =>
                    eh.tokens.splice(i++, 0, t))
            }

            var replFrom = (start:number) => {
                for (var i = start; i < eh.tokens.length; ++i) {
                    var t = eh.tokens[i];
                    if (!t.getProperty()) continue;
                    if (t.getProperty().forwardsTo() != this.action) continue;

                    var toks = Replacer.cloneToks(this.parameter)
                    var newStart = i + 1
                    if (eh.tokens[i + 1] && eh.tokens[i + 1].getOperator() == "(") {
                        var balance = 0;
                        i++;
                        while (i < eh.tokens.length) {
                            var tt = eh.tokens[i]
                            if (tt.getOperator() == "(") balance++
                            if (tt.getOperator() == ")") balance--
                            if (balance == 0) break;
                            i++;
                        }
                        if (i > newStart + 1)
                            toks.unshift(AST.mkOp(","))
                        ins(i, toks)
                    } else {
                        toks.unshift(AST.mkOp("("))
                        toks.push(AST.mkOp(")"))
                        ins(i + 1, toks)
                    }
                    replFrom(newStart)
                    break;
                }
            }

            replFrom(0)
        }

        visitAstNode(node:AST.AstNode)
        {
            this.visitChildren(node)
        }

        public run()
        {
            Script.allActions().forEach((a) => {
                this.dispatch(a);
                a.notifyChange();
            })
        }
    }

    export class Replacer
        extends AST.NodeVisitor
    {
        public src:AST.Token[];
        public dst:AST.Token[];
        public scope = ReplacementScope.Action;

        static cloneToks(toks:AST.Token[])
        {
            var eh = new AST.ExprHolder();
            eh.tokens = toks;
            var eh1 = AST.Parser.parseExprHolder(eh.serialize());
            return eh1.tokens;
        }

        replace(prefix:AST.Token[], match:AST.Token[], suffix:AST.Token[]) : AST.Token[]
        {
            return prefix.concat(Replacer.cloneToks(this.dst)).concat(suffix);
        }

        beforeAction(a:AST.Action)
        {
        }

        afterAction(a:AST.Action)
        {
        }

        visitExprHolder(eh:AST.ExprHolder)
        {
            if (eh.tokens.length == 0) return;

            var lastMatch = 0;
            var didSomething = true;

            while (didSomething) {
                var toks = eh.tokens;
                didSomething = false;
                for (var i = lastMatch; i < toks.length; ++i) {
                    var match = true;
                    for (var j = 0; j < this.src.length; ++j) {
                        if (!toks[i + j] || !toks[i + j].eq(this.src[j])) {
                            match = false;
                            break;
                        }
                    }

                    if (match) {
                        lastMatch = i + this.src.length;
                        eh.tokens = this.replace(toks.slice(0, i), toks.slice(i, lastMatch), toks.slice(lastMatch))
                        didSomething = true;
                        break;
                    }
                }
            }
        }

        visitAstNode(node:AST.AstNode)
        {
            this.visitChildren(node)
        }

        public execute()
        {
            if (this.scope == ReplacementScope.Selection) {
                var a = TheEditor.currentAction();
                this.beforeAction(a);
                TheEditor.selector.copyOutSelection().forEach((s) => {
                    this.dispatch(s);
                })
                this.afterAction(a);
                a.notifyChange();
            } else {
                var actions = [TheEditor.currentAction()];
                if (this.scope == ReplacementScope.Script)
                    actions = Script.allActions();

                actions.forEach((a) => {
                    this.beforeAction(a);
                    this.dispatch(a);
                    this.afterAction(a);
                    a.notifyChange();
                })
            }
        }

        public findDecl() : AST.Decl
        {
            var toks = this.src;

            if (toks.length == 1 || toks[0].getThing() instanceof AST.LocalDef)
                return toks[0].getThing();

            if (toks.length == 2 && toks[1].getProperty() instanceof AST.Decl)
                return <any> toks[1].getProperty();

            return null;
        }

        public removeDeclIfNotUsed()
        {
            var d = this.findDecl();
            if (!(d instanceof AST.PropertyDecl)) return;
            var finder = new AST.DeclRefFinder(d);
            finder.dispatch(Script);
            if (!finder.found) {
                Script.deleteDecl(d);
                TheEditor.queueNavRefresh();
            }
        }
    }

    // compute the top-level goal properties can be null, or a string.
    class GoalState extends AST.NodeVisitor {

        // used during compute
        public globalOnly: boolean;

        public goalWindow: string[] = [];
        public windowSize = 3;

        public isFull(): boolean {
            return this.goalWindow.length >= this.windowSize;
        }

        public unshift(goal: string) {
            this.goalWindow.unshift(goal);
        }
        public pushGoal(goal: string) {
            if (this.goalWindow.length >= this.windowSize) {
                this.goalWindow.shift();
            }
            this.goalWindow.push(goal);
        }


        /// dispatcher for goal computation

        public compute(stmt: AST.Stmt): string {
            var goal = this.dispatch(stmt);
            if (goal == "a:Unknown") return null;
            return goal;
        }

        public visitLiteral(lit: AST.Literal): any {
            return "a:" + lit.getKind().getName();
        }
        public visitThingRef(thing: AST.ThingRef): any {
            return "a:" + IntelliPredictor.normalizedKindName(thing.getKind());
        }

        public visitCall(call: AST.Call): any {
            var prop = call.prop();
            var propName = prop.getName();
            if (propName == ":=") {
                return this.dispatch(call.args[1]);
            }
            var result = prop.getResult();
            if (result) {
                var resultKind = result.getKind();
                var rkname = IntelliPredictor.normalizedKindName(resultKind);
                if (rkname != "Nothing") {
                    return "a:" + rkname;
                }
            }
            return "prop:" + IntelliPredictor.normalizedKindName(prop.parentKind) + ":" + prop.getName();
        }

        public visitInlineActions(ia: AST.InlineActions) {
            var goal = this.visitExprStmt(ia);
            return goal;
        }

        public visitExpr(expr: AST.Expr): any {
            return null;
        }

        public visitStmt(stmt: AST.Stmt): any {
            return null;
        }

        public visitExprHolder(stmt: AST.ExprHolder) {
            return this.dispatch(stmt.parsed);
        }
        public visitExprStmt(stmt: AST.ExprStmt) {
            return this.dispatch(stmt.expr.parsed);
        }
    }

    export class VarPromoter
        extends Replacer
    {
        private lvalue = false;

        constructor(private fieldExpr:any) {
            super()
        }

        public run(toks:AST.Token[])
        {
            this.src = toks;
            var decl = this.findDecl();

            if (decl instanceof AST.LocalDef) {
            } else if (decl instanceof AST.GlobalDef) {
                this.scope = ReplacementScope.Script;
            } else {
                return; // ??
            }

            TheEditor.undoMgr.clearCalc();
            TheEditor.undoMgr.pushMainUndoState();

            if (this.fieldExpr) {
                var k = <AST.RecordEntryKind>this.fieldExpr.getKind();
                var fld = k.record.values.mkField(decl.getName(), decl.getKind());
                k.record.values.push(fld);
                var propName = fld.getName();
                k.record.notifyChange();

                if (this.fieldExpr instanceof AST.LocalDef) {
                    this.dst = [AST.mkThing(this.fieldExpr.getName(), true)];
                } else if (this.fieldExpr instanceof AST.GlobalDef) {
                    this.dst = [AST.mkThing("data"), AST.mkPropRef(this.fieldExpr.getName())]
                } else {
                    Util.assert(false);
                }
                this.dst.push(AST.mkPropRef(propName));
                this.execute();
                this.removeDeclIfNotUsed();

            } else {
                var d = new AST.GlobalDef();
                d.setName(propName = Script.freshName(decl.getName()));
                d.setKind(decl.getKind());
                Script.addDecl(d);

                this.dst = [AST.mkThing("data"), AST.mkPropRef(propName)];
                this.execute();
            }

            TheEditor.dismissSidePane();
            TheEditor.queueNavRefresh();
        }

        replace(prefix:AST.Token[], match:AST.Token[], suffix:AST.Token[]) : AST.Token[]
        {
            var r = super.replace(prefix, match, suffix);
            if (this.lvalue) r.push(AST.mkOp(")"));
            return r;
        }
    }

    export class CalcSelectionMarker
    {
        public cursor:HTMLElement = div("calcCursorMarker", SVG.getVerticalCursorMarker());
        private handler:DragHandler;
        private x:number;
        private y:number;
        private disabled = false;

        constructor(public isBeg:boolean, public parent:Calculator) {
            this.init();
        }

        private tokPos() { return this.isBeg ? this.parent.selectionStart : this.parent.selectionEnd }

        private init()
        {
            this.handler = new DragHandler(this.cursor, (e,x,y,t) => { this.extend(e, x, y, t); });
        }

        public position()
        {
            var pos = this.parent.screenPos(this.isBeg ? this.tokPos() + 1 : this.tokPos(), this.isBeg);
            this.x = pos.x;
            this.y = pos.y + SizeMgr.topFontSize * 0.5;
            var s = this.cursor.style;
            s.left = pos.x - 1.5 * SizeMgr.topFontSize + "px";
            s.top = pos.y + "px";
        }

        private extend(evt:string, dx:number, dy:number, tap:any)
        {
            if (evt == "drag") {
                this.disabled = false;
            }

            if (this.disabled) return;

            var tok = this.parent.tokenIdxAt(this.x + dx, this.y + dy);
            if (evt == "release") {
                if (tap || this.parent.selectionStart >= this.parent.selectionEnd) {
                    if (tok >= 0)
                        this.parent.cursorPosition = tok;
                    this.parent.unselect();
                }
                this.parent.display();
                return;
            }

            var yy = this.y + dy;
            if (yy < -SizeMgr.topFontSize*2 || yy > this.parent.getDisplayHeight() + SizeMgr.topFontSize) {
                tick(Ticks.codeStartSelection);
                TheEditor.selector.startSelection();
                this.disabled = true
                return
            }

            // Util.log(Util.fmt("x:{0} dx:{1} y:{2} dy:{3}", this.x, dx, this.y, dy))
            if (tok != this.tokPos()) {
                if (this.isBeg)
                    this.parent.selectionStart = tok;
                else
                    this.parent.selectionEnd = tok;
                this.parent.reselect();
            }
        }
    }


    class IntelliPredictor {

        static defaultClassifier = "{}";

        private predictor = new Predictor(JSON.parse(IntelliPredictor.defaultClassifier));
        private enableNewPrediction: boolean;

        constructor() {
        }

        private ensureInit(debugElement: HTMLElement,  enableNewPrediction: boolean) {
            var maxPathLength = 3;

            if (enableNewPrediction) {
                if (!this.enableNewPrediction) {
                    // turned on now, recompute
                    this.fullProb = null;
                }
            }
            this.enableNewPrediction = enableNewPrediction;

            if (this.fullProb) return;

            var probs:IntelliTrain.IFrequencies = {};


            if (enableNewPrediction) {
                var kinds = TDev.api.getKinds().slice(0);

                for (var i = 1; i <= maxPathLength; i++) {
                    this.computePathFreq(i, kinds);
                }

                kinds.forEach(from => {
                    if (!this.hasUserProps(from)) {
                        var fromName = IntelliPredictor.normalizedKindName(from);
                        kinds.forEach(to => {
                            if (!this.hasUserProps(to)) {
                                var toName = IntelliPredictor.normalizedKindName(to);
                                var sum = 0;
                                for (var j = 0; j <= maxPathLength; j++) {
                                    sum += this.probPath(from, to, j);
                                }
                                if (sum > 0) {
                                    probs[fromName + ":" + toName] = sum;
                                }
                            }
                        });
                    }
                });
            }
            probs["UserRecord:UserRecord"] = IntelliPredictor.pStop;
            probs["UserRecord:Nothing"] = .2;
            probs["UserRecord:Number"] = .2;
            probs["UserRecord:String"] = .2;
            probs["UserRecord:Boolean"] = .2;
            this.fullProb = probs;
        }

        private goalState = new GoalState();
        private tokenState: TokenState;
        static maxGoals = 100;
        private selectedType: string;
        private sortedGoals: { prediction: string; probability: number }[];
        private debugElement: HTMLElement; // null if we don't want debugging

        private fillGoalWindow(stmt:AST.Stmt) {
            var currentStmt = stmt;
            while (!!currentStmt) {
                if (this.goalState.isFull()) break;
                var parent = currentStmt.parent;
                if (parent instanceof AST.Block) {
                    var block = <AST.Block>parent;
                    var me = block.stmts.indexOf(currentStmt);
                    for (var i = me - 1; i >= 0; i--) {
                        var pred = block.stmts[i];
                        this.findGoal(pred);
                        if (this.goalState.isFull()) break;
                    }
                }
                else if (parent instanceof AST.ActionHeader) {
                    var action = <AST.ActionHeader>parent;
                    if (action.action.isPage()) {
                        var init = action.action.getPageBlock(true);
                        if (init && init.isDescendant(stmt)) {
                            this.goalState.unshift("start:pageinit");
                        }
                        else {
                            this.goalState.unshift("start:pagebody");
                        }
                    }
                    else if (action.action.isEvent()) {
                        this.goalState.unshift("start:" + action.getName());
                    }
                    else {
                        if (action.getName() == "main") {
                            this.goalState.unshift("start:main");
                        }
                        else {
                            this.goalState.unshift("start:action");
                        }
                    }
                }
                else if (parent instanceof AST.InlineActions) {
                    var goal = this.goalState.compute(parent);
                    if (goal) {
                        this.goalState.unshift("start:" + goal);
                        break;
                    }
                }
                currentStmt = parent;
            }

        }
        public initGoalState(expr: AST.ExprHolder, stmt: AST.Stmt, cursorIndex: number, debugElement: HTMLElement, enableNewPrediction: boolean)
        {
            this.ensureInit(debugElement, enableNewPrediction);

            this.goalState.goalWindow = [];
            this.debugElement = debugElement;
            var topGoalDist: IntelliTrain.IFrequencies;

            if (debugElement) {
                debugElement.setChildren([]);
            }
            this.tokenState = new TokenState(expr.tokens, (d) => this.predictor.nestedGoalPrediction(d));

            if (stmt instanceof AST.If) {
                topGoalDist = { "a:Boolean": 1 };
            }
            else if (stmt instanceof AST.While) {
                topGoalDist = { "a:Boolean": 1 };
            }
            else if (stmt instanceof AST.Where) {
                topGoalDist = { "a:Boolean": 1 };
            }
            else if (stmt instanceof AST.For) {
                topGoalDist = { "a:Number": 1 };
            }
            else if (stmt instanceof AST.Foreach) {
                topGoalDist = { "a:Enumerator": 1 };
            }
            else {
                this.fillGoalWindow(stmt);
                if (debugElement) {
                    debugElement.appendChildren(this.goalState.goalWindow.map(s => div("", text(s))));
                }
                topGoalDist = this.predictor.topGoalPrediction(this.goalState.goalWindow);
                this.tokenState.analyze(topGoalDist);

                // now use last top selected type to modify the topGoalDist
                topGoalDist = this.predictor.modifyBySelectedType(this.goalState.goalWindow, topGoalDist, this.tokenState.lastTopSelectedTypes);
            }
            // analyze again, TODO: optimize that
            this.tokenState.analyze(topGoalDist);

            var currentGoal = this.tokenState.goal[cursorIndex];
            this.selectedType = this.tokenState.selectedType[cursorIndex];
            if (currentGoal) {
                this.sortedGoals = this.predictor.sorted(currentGoal, IntelliPredictor.maxGoals);
                if (debugElement) {
                    debugElement.appendChild(div("", text("-----Predicted goal----")));
                    debugElement.appendChildren(this.sortedGoals.map(kv => div("", text(kv.prediction + " : " + this.formatProb(kv.probability)))));
                }
            }
            if (debugElement) {
                debugElement.appendChild(div("", text("-----Selected Kind : " + this.tokenState.selectedType[cursorIndex])));
                debugElement.appendChild(div("", text("-----Last selected Kind : " + JSON.stringify(this.tokenState.lastTopSelectedTypes))));
            }
        }


        private formatProb(p: number): string {
            return (Math.floor(p * 10000000) / 10000000).toString();
        }

        private findGoal(stmt: AST.Stmt) {
            var goal = this.goalState.compute(stmt);
            if (goal) {
                this.goalState.unshift(goal);
            }
        }

        static pStop = 0.75;

        private probPath(from: Kind, to: Kind, k: number): number {
            var fromname = IntelliPredictor.normalizedKindName(from);
            var toname = IntelliPredictor.normalizedKindName(to);
            if (k <= 0) {
                if (from == to) {
                    if (fromname == "Nothing") {
                        return 1;
                    }
                    return IntelliPredictor.pStop;
                }
                if (from.isEnumerable() && toname == "Enumerator") {
                    return IntelliPredictor.pStop;
                }
                return 0;
            }
            var freq = this.pathFreq[k];
            if (freq) {
                var prob = freq[fromname + ":" + toname];
                if (prob) return prob;
            }
            return 0;
        }

        private pathFreq: IntelliTrain.IFrequencies[] = [];
        private fullProb: IntelliTrain.IFrequencies;

        private hasUserProps(k: Kind): boolean {
            switch (k.getName()) {
                case 'data':
                case 'code':
                case 'records':
                case TDev.AST.recordSymbol:
                case 'lib':
                case TDev.AST.libSymbol:
                case 'art':
                    return true;
                default:
                    return false;
            }
        }

        private computePathFreq(k: number, kinds:Kind[]) {
            if (k == 0) return;
            // assume k-1 has been computed
            var kFreq = this.pathFreq[k] = <IntelliTrain.IFrequencies>{};

            kinds.forEach(from => {
                var fromname = IntelliPredictor.normalizedKindName(from);
                if (!this.hasUserProps(from) && fromname != "Nothing") {
                    kinds.forEach(target => {
                        if (!this.hasUserProps(target)) {
                            var sum = 0;
                            from.listProperties().forEach(p => {
                                var pname = p.getName();
                                var pprob = this.predictor.relativePropProb(fromname + ":" + pname);
                                if (pprob > 0) {
                                    var rest = this.probPath(p.getResult().getKind(), target, k - 1);
                                    sum += pprob * rest;
                                }
                            });
                            var prob = (1 - IntelliPredictor.pStop) * sum;
                            kFreq[fromname + ":" + IntelliPredictor.normalizedKindName(target)] = prob;
                        }
                    });
                }
            });
        }

        private getPathProb(fname: string, tname: string): number {
            var p = this.fullProb[fname + ":" + tname];
            if (p > 0) return p;
            return 0;
        }

        private scoreLibraryRef(lib: AST.LibraryRef) :number {
            var sum = 0;
            var total = 1;
            lib.getPublicActions().forEach(a => {
                total++;
                sum += this.getPathsToGoalsProbFrom(IntelliPredictor.normalizedKindName(a.getResult().getKind()));
            });
            return sum/total;
        }

        private scoreRecordRef(rec: AST.RecordDef): number {
            var sum = 0;
            var total = 1;
            rec.getProperties().forEach(p => {
                sum += this.scorePropertyVsGoals(p);
            });
            return sum;
        }

        private getPathsToGoalsProbFrom(from: string, squareGoal = true): number {
            var sum = 0;
            // look at top 10-20 goals
            for (var i = 0; i < this.sortedGoals.length; i++) {
                var goal = this.sortedGoals[i];
                var sp = goal.prediction.split(':');
                var goalType = sp[1];
                // make goal probability more important and also scales down vs. property frequencies
                var prob = (goal.probability) * (this.getPathProb(from, goalType));
                if (squareGoal) {
                    prob = prob * goal.probability;
                }
                sum += prob;
            }
            return sum;
        }

        private scoreUserItems(k: Kind, squareGoal = true): number {
            var sum = 0;
            var total = 1;
            k.listProperties().forEach(p => {
                total++;
                sum += this.getPathsToGoalsProbFrom(IntelliPredictor.normalizedKindName(p.getResult().getKind()), squareGoal);
            });
            return sum / total;
        }

        private scoreLibSymbol(k: Kind): number {
            var sum = 0;
            var total = 1;
            k.listProperties().forEach(p => {
                var l = <AST.LibraryRef>p;
                total++;
                sum += this.scoreLibraryRef(l);
            });
            return sum / total;
        }

        private scoreRecordSymbol(k: Kind): number {
            var sum = 0;
            var total = 1;
            k.listProperties().forEach(p => {
                var r = <AST.RecordDef>p;
                total++;
                sum += this.scoreRecordRef(r);
            });
            return sum / total;
        }

        static normalizedKindName(k:Kind): string {
            if (k instanceof AST.RecordEntryKind) return "UserRecord";
            if (k instanceof AST.RecordDefKind) return "UserRecord";
            return k.getName();
        }

        private scorePropertyVsGoals(p: IProperty): number {
            var sum = 0;
            var pname = p.getName();
            var kname = IntelliPredictor.normalizedKindName(p.parentKind);
            if (p.isField) {
                // no probability
                var record = <AST.RecordEntryKind>p.parentKind;
                var total = record.record.getFields().length + record.record.getKeyFields().length;
                var pProb = 1 / total;
            }
            else {
                var pProb = this.predictor.relativePropProb(kname + ":" + pname);
            }
            // look at top 10-20 goals
            for (var i = 0; i < this.sortedGoals.length; i++) {
                var goal = this.sortedGoals[i];
                var sp = goal.prediction.split(':');
                var goalType = sp[1];
                if (goalType) {
                    if (goalType == kname && sp[2] == pname) {
                        // just use the goal probability?
                        // add goal boost by not using probability of property
                        //sum += goal.probability * (this.predictor.relativePropProb(goalType + ":" + pname)) * this.getPathProb(goalType, goalType);
                        sum += goal.probability * this.getPathProb(goalType, goalType);
                    }
                    else {
                        sum += (goal.probability) * pProb * (this.getPathProb(IntelliPredictor.normalizedKindName(p.getResult().getKind()), goalType));
                        //sum += typeProb * (goal.probability) * (this.getPathProb(p.getResult().getKind().getName(), goalType));
                    }
                }
            }
            return sum;
        }

        private scorePropertyGoalFrequencies(k: Kind): number {
            var sum = 0;
            k.listProperties().forEach(p => {
                sum += this.scorePropertyVsGoals(p);
            });
            return sum;
        }

        public scoreIntelliItems(items: IntelliItem[], cursor: number) {
            if (this.enableNewPrediction) {
                var localRecencyFactor = 1;
                items.forEach(item => {
                    if (item.prop) {
                        if (item.prop instanceof AST.LibraryRef) {
                            item.score = 1.5 * this.scoreLibraryRef(<AST.LibraryRef>item.prop);
                        }
                        else if (item.prop instanceof AST.GlobalDef) {
                            item.score = this.getPathsToGoalsProbFrom(IntelliPredictor.normalizedKindName(item.prop.getResult().getKind()));
                        }
                        else if (item.prop instanceof AST.LibraryRefAction) {
                            item.score = this.getPathsToGoalsProbFrom(IntelliPredictor.normalizedKindName(item.prop.getResult().getKind()));
                        }
                        else if (item.prop instanceof AST.Action) {
                            item.score = this.getPathsToGoalsProbFrom(IntelliPredictor.normalizedKindName(item.prop.getResult().getKind()));
                        }
                        else {
                            var p = item.prop;
                            if (this.tokenState.allowOperator(p, cursor)) {
                                item.score = this.scorePropertyVsGoals(p);
                            }
                            else {
                                item.score = 0;
                            }
                        }
                    }
                    else if (item.decl) {
                        var k = item.decl.getKind();
                        var kname = IntelliPredictor.normalizedKindName(k);

                        if (item.decl instanceof AST.LocalDef) {
                            var lkind = item.decl.getKind();
                            if (lkind instanceof AST.RecordDefKind) {
                                item.score = localRecencyFactor * this.scorePropertyGoalFrequencies(lkind);
                            }
                            else if (lkind instanceof AST.RecordEntryKind) {
                                item.score = localRecencyFactor * this.scorePropertyGoalFrequencies(lkind);
                            }
                            else {
                                item.score = localRecencyFactor * this.getPathsToGoalsProbFrom(kname);
                            }
                            localRecencyFactor *= 0.95;
                            // locals need a boost
                            item.score = 10 * item.score;
                        }
                        else {
                            switch (kname) {
                                case 'code':
                                    item.score = 0.3 * this.scoreUserItems(k);
                                    break;
                                case 'data':
                                case 'art':
                                    item.score = 0.3 * this.scoreUserItems(k, false);
                                    break;
                                case 'invalid':
                                    // penalize
                                    var typeProb = this.predictor.typeProb(kname);
                                    item.score = 0.25 * typeProb * this.scorePropertyGoalFrequencies(k);
                                    break;
                                case TDev.AST.libSymbol:
                                    // expand
                                    item.score = this.scoreLibSymbol(k);
                                    break;
                                case 'records':
                                    item.score = 2 * this.scoreRecordSymbol(k);
                                    break;
                                default:
                                    var typeProb = (this.predictor.typeProb(kname));
                                    item.score = typeProb * this.scorePropertyGoalFrequencies(k);
                                    break;
                            }
                        }
                    }
                    else {
                    }
                });
            }
            items.sort((a, b) => b.score - a.score);
            if (this.enableNewPrediction) {
                if (this.debugElement) {
                    this.debugElement.appendChild(div("", text("-----Predicted items----")));
                    this.debugElement.appendChildren(items.map(kv => {
                        var name = (kv.prop) ? kv.prop.getName() : (kv.decl) ? kv.decl.getName() : "unknown";
                        return div("", text(name + " : " + this.formatProb(kv.score)));
                    }));
                }
            }
        }

    }
    class Predictor {

        constructor(public classifier: IntelliTrain.IClassifier) {
        }

        public propProb(prop: string) : number {
            var f = this.classifier.propFreq.counts[prop];
            if (!f) { f = 0.01; }
            return f / this.classifier.propFreq.total;
        }

        public typeProb(type: string) : number {
            if (!type) return 0.001;
            var f = this.classifier.typeFreq.counts[type];
            if (!f) { f = 0.01; }
            return f / this.classifier.typeFreq.total;
        }

        public relativePropProb(prop: string) : number {
            var f = this.classifier.propFreq.counts[prop];
            if (!f) {
                f = 0.01;
            }
            // choice of overall frequency across methods or just within type
            var tp = prop.split(":");
            if (tp[0]) {
                var total = this.classifier.typeFreq.counts[tp[0]];
                if (total > 0) {
                    return f / total;
                }
            }
            return f / this.classifier.propFreq.total;
        }

        public sorted(freq: IntelliTrain.IFrequencies, max = 100): { prediction: string; probability: number }[] {
            var result = [];
            Object.keys(freq).forEach(k => result.push({ prediction: k, probability: freq[k]}));
            result.sort((a, b) => b.probability - a.probability);
            var result = result.slice(0, max);
            return result;
        }

        public topGoalPrediction(window: string[]): IntelliTrain.IFrequencies {
            var freq:IntelliTrain.IFrequencies = {};
            var n = window.length;
            window.forEach(g => {
                var factor = 1 / this.classifier.topGoals.histoA.counts[g];
                if (isNaN(factor)) factor = 1;
                factor = factor / n;
                var counts = this.classifier.topGoals.correlations[g];
                if (counts) {
                    var tmp:IntelliTrain.IFrequencies = {};
                    Predictor.add(tmp, counts.counts);
                    Predictor.mul(tmp, factor);
                    Predictor.add(freq, tmp);
                }
            });
            this.removePastWindowFromPrediction(window, freq);
            return freq;
        }

        private removePastWindowFromPrediction(window:string[], freq: IntelliTrain.IFrequencies) {
            // remove current window items from predictor
            window.forEach(g => {
                var sp = g.split(":");
                if (sp[0] == "prop") {
                    freq[g] = 0;
                }
                else if (sp[0] == "start" && sp[1] == "prop") {
                    freq[g.slice(6)] = 0;
                }
            });
            // also remove a:Number, as it is too common
            //freq["a:Number"] = 0.001;
            // make sure we have some "a:Nothing"
        }

        public nestedGoalPrediction(outer: IntelliTrain.IFrequencies): IntelliTrain.IFrequencies {
            return { "a:Number": .5, "a:String": .25, "a:Boolean": .25 };
        //    var freq = {};
        //    Object.keys(outer).forEach(outerGoal => {
        //        var factor = outer[outerGoal] / this.classifier.nestedGoals.histoA.counts[outerGoal];
        //        if (isNaN(factor)) {
        //            factor = 1;
        //        }
        //        var counts = this.classifier.nestedGoals.correlations[outerGoal];
        //        if (counts) {
        //            var tmp = {};
        //            Predictor.add(tmp, counts.counts);
        //            Predictor.mul(tmp, factor);
        //            Predictor.add(freq, tmp);
        //        }
        //    });
        //    return freq;
        }

        public modifyBySelectedType(window:string[], topGoal: IntelliTrain.IFrequencies, lastSelected: IntelliTrain.IFrequencies): IntelliTrain.IFrequencies {
            var freq:IntelliTrain.IFrequencies = {};
            var scale = 0.5;
            Predictor.add(freq, topGoal);
            Predictor.mul(freq, scale);
            var keys = Object.keys(lastSelected);
            keys.forEach(g => {
                var key = "selected:" + g;
                var factor = (1-scale) / this.classifier.topGoals.histoA.counts[key];
                if (isNaN(factor)) factor = (1- scale);
                factor = factor / keys.length;
                var counts = this.classifier.topGoals.correlations[key];
                if (counts) {
                    var tmp:IntelliTrain.IFrequencies = {};
                    Predictor.add(tmp, counts.counts);
                    Predictor.mul(tmp, factor);
                    Predictor.add(freq, tmp);
                }
            });
            this.removePastWindowFromPrediction(window, freq);
            return freq;
        }

        static add(target: IntelliTrain.IFrequencies, source: IntelliTrain.IFrequencies) {
            Object.keys(source).forEach(k => {
                var value = source[k];
                if (target[k]) {
                    target[k] = target[k] + value;
                }
                else {
                    target[k] = value;
                }
            });
        }

        static mul(target: IntelliTrain.IFrequencies, n: number) {
            Object.keys(target).forEach(k => {
                var value = target[k];
                target[k] = value * n;
            });

        }

        static top(from: IntelliTrain.IFrequencies): { token: string; value: number; }[] {
            var elems = [];
            Object.keys(from).forEach((token) => {
                elems.push({ token: token, value: from[token] });
            });
            elems.sort((a, b) => b.value - a.value);
            return elems;
        }

    }

    interface ICallingContext {
        prop: string;
        isLocal: boolean;
        type: Kind;
        args: Kind[];
        index: number;
        open_parens: number;
    }

    interface IFixContext {
        precedence: number;
        goal: any;
        resultType: string;
    }
    interface IGoalContext {
        start: number;
        goal: IntelliTrain.IFrequencies;
        fixContext: IFixContext[];
    }

    class TokenState extends AST.NodeVisitor {

        public propStack: ICallingContext[] = [];
        public fixContext: IGoalContext[] = [];
        public currentSelectedType: string = null;
        private lastPos = -1;
        public selectedType: string[] = [];
        public goal: IntelliTrain.IFrequencies[] = [];
        public fixContexts: IFixContext[][] = [];

        public nestedParenthesis: number[] = [];
        public lastTopSelectedTypes :IntelliTrain.IFrequencies;

        constructor(private tokens: AST.Token[],
            private guessNestedGoal: (parent: IntelliTrain.IFrequencies) => IntelliTrain.IFrequencies) {
            super();
        }


        public visitToken(tok: AST.Token) {
            throw "missing token specialization";
        }

        public visitLiteral(lit: AST.Literal): any {
            var k = lit.getKind();
            if (k) {
                this.currentSelectedType = k.getName();
            }
        }
        public visitThingRef(thing: AST.ThingRef): any {
            this.currentSelectedType = IntelliPredictor.normalizedKindName(thing.getKind());
        }
        public visitPropertyRef(property: AST.PropertyRef): any {
            var p = property.prop;
            switch (p.getCategory()) {

                case PropertyCategory.Action:
                    var resultType = p.getResult().getKind();
                    var tokenContext;
                    var params = p.getParameters();
                    if (params.length > 0) {
                        // looks like this "this" argument is "code" or "lib"
                        this.propStack.push({ prop: p.getName(), type: resultType, args: params.map(p => p.getKind()), index: 1, open_parens: 0, isLocal: true });
                        this.currentSelectedType = null; // need to see parentheses
                    }
                    else {
                        this.currentSelectedType = resultType.getName();
                    }
                    break;

                case PropertyCategory.Builtin:
                    var params = p.getParameters();
                    if (params.length <= 1) { // implicit this parameter is always 1st parameter
                        var rtype = p.getResult().getKind();
                        this.currentSelectedType = rtype.getName();
                    }
                    else {
                        this.propStack.push({
                            prop: p.getName(),
                            type: p.getResult().getKind(),
                            args: params.map(p => p.getKind()),
                            index: 1, open_parens: 0, isLocal: false
                        });
                        this.currentSelectedType = null; // need to see parentheses
                    }
                    break;

                case PropertyCategory.Data:
                    this.currentSelectedType = p.getResult().getKind().getName();
                    break;
                case PropertyCategory.Library:
                    this.currentSelectedType = p.getResult().getKind().getName();
                    break;
                case PropertyCategory.Record:
                    this.currentSelectedType = p.getResult().getKind().getName();
                    break;

            }
                //// deal with lvalues?
                //switch (property.name) {
                //    case 'get':
                //        // selected type does not change
                //        return;
                //    case 'confirmed':
                //    case 'invalid row':
                //        this.currentSelectedType = "Boolean";
                //        return;
                //    case 'count':
                //        this.currentSelectedType = "Number";
                //        return;
                //    case 'set':
                //    case 'clear':
                //    case 'post to wall':
                //        this.currentSelectedType = "Nothing";
                //        return;
                //    case 'add':
                //        this.currentSelectedType = null;
                //        this.propStack.push({ prop: property.name, type: "Number", args: ["Number"], index: 0, open_parens: 0, isLocal: false });
                //        return;
                //    case 'singleton':
                //    case 'add row':
                //        var rtype = this.getRecordAtType(parent);
                //        this.currentSelectedType = rtype;
                //        return;
                //    case 'row at':
                //    case 'at':
                //        this.currentSelectedType = null;
                //        var rtype = this.getRecordAtType(parent);
                //        this.propStack.push({ prop: property.name, type: rtype, args: ["Number"], index: 0, open_parens: 0, isLocal: false });
                //        return;
                //    case 'test and set':
                //        this.currentSelectedType = null;
                //        var rtype = "Nothing";
                //        this.propStack.push({ prop: property.name, type: rtype, args: [parent], index: 0, open_parens: 0, isLocal: false });
                //        return;

                //}
                //throw ("unknown property " + property.name);
        }

        private guessGoal(parent: IntelliTrain.IFrequencies): any {
            this.nestedParenthesis.push(this.lastPos);
            if (this.guessNestedGoal) {
                return this.guessNestedGoal(parent);
            }
            return null;
        }
        private resultType(goal: IGoalContext): string {
            if (goal.fixContext.length > 0) {
                return goal.fixContext[0].resultType;
            }
            return this.currentSelectedType;
        }


        public visitOperator(op: AST.Operator): any {

            switch (op.data) {
                case '(':
                    var parentGoal = this.lastIncompleteGoal(this.fixContext.peek());
                    var newGoal = { start: this.lastPos, goal: <IntelliTrain.IFrequencies> {}, fixContext: [] };
                    this.fixContext.push(newGoal); // new fix context
                    var prop = this.propStack.peek();
                    this.currentSelectedType = "Initial";
                    if (prop) {
                        if (prop.open_parens == 0) {
                            if (prop.index < prop.args.length) {
                                newGoal.goal["a:" + prop.args[prop.index]] = 1;
                            }
                            else {
                                newGoal.goal["a:Number"] = 1; // buggy code, pretend
                            }
                        }
                        else {
                            // guess a new goal!
                            // TODO:
                            newGoal.goal = this.guessGoal(parentGoal);
                        }
                        prop.open_parens++;
                    }
                    else {
                        newGoal.goal = this.guessGoal(parentGoal);
                    }
                    break;

                case ')':
                    // don't remove the top context
                    var topFix = this.fixContext.length > 1 ? this.fixContext.pop() : this.fixContext.peek();
                    if (!topFix) break;
                    this.currentSelectedType = this.resultType(topFix);
                    var prop = this.propStack.peek();
                    if (prop) {
                        if (--prop.open_parens == 0) {
                            // pop prop
                            this.propStack.pop();
                            this.currentSelectedType = IntelliPredictor.normalizedKindName(prop.type);
                        }
                        else {
                        }
                    }
                    else {
                    }
                    break;

                case ',':
                    var topFix = this.fixContext.peek();
                    topFix.fixContext = [];
                    topFix.goal = {};
                    var prop = this.propStack.peek();
                    if (prop) {
                        prop.index++;
                        if (prop.args.length > prop.index) {
                            topFix.goal["a:" + prop.args[prop.index]] = 1;
                        }
                        else {
                            topFix.goal["a:Nothing"] = 1;
                            // parse error
                        }
                    }
                    else {
                        topFix.goal["a:Nothing"] = 1;
                    }
                    this.currentSelectedType = "Initial";
                    break;

                case ':=':
                    var topFix = this.fixContext.peek();
                    topFix.fixContext = [];
                    topFix.goal = {};
                    topFix.goal["a:Nothing"] = 1;
                    this.currentSelectedType = "Initial";
                    break;

                case '0':
                case '1':
                case '2':
                case '3':
                case '4':
                case '5':
                case '6':
                case '7':
                case '8':
                case '9':
                case '.':
                    this.currentSelectedType = "Number";
                    break;

                case '+':
                    this.pushFix(10, "a:Number", "Number", "Number:+");
                    break;
                case '-':
                    if (this.currentSelectedType == "Number") {
                        this.pushFix(10, "a:Number", "Number", "Number:-");
                    }
                    else {
                        // prefix
                        this.pushFix(30, "a:Number", "Number", "Number:u-");
                    }
                    break;
                case 'not':
                    this.pushFix(3.5, "a:Boolean", "Boolean", "Boolean:not");
                    break;
                case 'and':
                    this.pushFix(3, "a:Boolean", "Boolean", "Boolean:and");
                    break;
                case 'or':
                    this.pushFix(2, "a:Boolean", "Boolean", "Boolean:or");
                    break;
                case '*':
                    this.pushFix(20, "a:Number", "Number", "Number:*");
                    break;
                case '/':
                    this.pushFix(20, "a:Number", "Number", "Number:/");
                    break;
                case '=':
                case '\u2260': // "!="
                case '<':
                case '\u2264': // "<="
                case '>':
                case '\u2265': // ">="
                    this.pushFix(5, "a:Number", "Boolean", "Number:" + op.data);
                    break;
                case '\u2225': // "||"
                    this.pushFix(6, "a:String", "String", "String:\u2225");
                    break;

                case 'async':
                case 'await':
                    // skip
                    break;

                default:
                    //throw "Unknown operator " + op.data;
                    break;
            }
        }


        private pushFix(precedence: number, goal: any, resultType: string, opProp: string) {
            var topFix = this.fixContext.peek();
            while (topFix.fixContext.length > 0 && topFix.fixContext.peek().precedence >= precedence) {
                topFix.fixContext.pop();
            }
            topFix.fixContext.push({ goal: goal, precedence: precedence, resultType: resultType });
            this.currentSelectedType = "Initial";
        }


        public analyze(topGoal: IntelliTrain.IFrequencies): any {
            this.propStack = [];
            this.fixContext = [];
            this.currentSelectedType = "Initial";
            this.selectedType = [];
            this.goal = [];
            this.nestedParenthesis = [];

            this.fixContext.push({ start: 0, goal: topGoal, fixContext: [] });
            for (var i = 0; i < this.tokens.length; i++) {
                this.lastPos = i;
                this.recordPosInfo(i);
                var token = this.tokens[i];
                this.dispatch(token);
            }
            this.recordPosInfo(this.tokens.length);
            if (this.fixContext.length == 1) {
                this.lastTopSelectedTypes = {};
                if (this.currentSelectedType) {
                    this.lastTopSelectedTypes[this.currentSelectedType] = 1;
                }
            }
            else {
                var fix = this.fixContext[1];
                this.lastTopSelectedTypes = fix.goal;
            }
        }


        private recordPosInfo(i: number) {
            this.selectedType[i] = this.currentSelectedType;
            var topFix = this.fixContext.peek();
            this.goal[i] = this.lastIncompleteGoal(topFix);
            this.fixContexts[i] = topFix?topFix.fixContext.slice(0):[];
        }

        private lastIncompleteGoal(context: IGoalContext): IntelliTrain.IFrequencies {
            if (!context) {
                return {};
            }
            var pos = context.fixContext.length - 1;
            while (pos >= 0 && context.fixContext[pos].goal == "a:" + this.currentSelectedType) {
                pos--;
            }
            if (pos < 0) {
                return context.goal;
            }
            var result:IntelliTrain.IFrequencies = {};
            result[context.fixContext[pos].goal] = 1;
            return result;
        }

        public allowOperator(op: IProperty, pos: number): boolean {
            var opprec = op.getInfixPriority();
            if (opprec == 0) return true;
            var opType = IntelliPredictor.normalizedKindName(op.parentKind);
            var selectedType = this.selectedType[pos];

            var fixContext = this.fixContexts[pos];

            for (var i = fixContext.length - 1; i >= 0; i--) {
                var f = fixContext[i];
                if (f.precedence < opprec) {
                    if (selectedType == opType) return true;
                    return false;
                }
                selectedType = f.resultType;
            }
            return opType == selectedType;
        }
    }

}
