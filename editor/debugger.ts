///<reference path='refs.ts'/>

module TDev
{

    export class BreakpointCollector extends AST.NodeVisitor {
        public bps: Hashtable = Hashtable.forStrings();

        visitApp(node: AST.App) {
            AST.Compiler.annotateWithIds(node);
            super.visitApp(node);
        }

        visitAstNode(n: AST.AstNode) {
            this.visitChildren(n);
        }

        visitDecl(d: AST.Decl) {
            this.visitChildren(d);
        }

        visitStmt(stmt: AST.Stmt) {
            if (stmt.debuggerRenderContext.isBreakPoint) this.bps.set(stmt.stableId, stmt.stableId);
            super.visitStmt(stmt);
        }

        static collect(app: AST.App) : Hashtable {
            var collector = new BreakpointCollector();
            collector.dispatch(app);
            return collector.bps;
        }
    }


    export class DbgButton extends CalcButton {
        constructor() {
            super();
        }

        public getDefaultWidth(): number {
            return ScriptDebuggerControl.buttonWidth;
        }

        public getDefaultHeight(): number {
            return ScriptDebuggerControl.buttonHeight;
        }

        public sanityCheck(): boolean {
            return TheEditor.isDebuggerMode();
        }
    }

    export class DbgVarView {
        public _theArea = div(null);
        private _theTable: HTMLElement;
        private renderer = new EditorRenderer(); // steal a renderer somewhere?

        constructor() {
            Util.setupDragToScroll(this._theArea);
            this._theTable = div("debuggerVarTable")
            this._theArea.setChildren([this._theTable]);
        }

        public setSize(w: number, h: number) {
            this._theArea.style.width = w + "px";
            this._theArea.style.height = h + "px";
        }

        public clear() {
            this._theTable.setChildren([]);
        }

        public addVar(name: string, val: any) {
            this._theTable.appendChildren(this.mkRow(name, val));
        }

        private mkRow(name: string, val: any, child = false) {
            var vShow = this.showValue(val);
            if (!vShow) return null;

            var row = div("debuggerVarTableRow");
            var k = div("debuggerVarTableLeftElement", name);
            var v = div("debuggerVarTableRightElement", vShow);
            var ret = [row];
            var arrow = "\u200A\u2192\u00A0";

            if (!child) row.classList.add("debuggerTopVar")

            if (val && val.debuggerChildren && !child) {
                var children = val.debuggerChildren();
                var childDisplay = div(null);
                childDisplay.style.display = 'none';

                var addChild = (key, child) => {
                    var childView = this.mkRow(arrow + key, child, true);
                    if (child && child.debuggerChildren) {
                        var trg = <HTMLElement>childView[0].firstChild;
                        trg.withClick(() => {
                            trg.withClick(() => { });
                            var childViewNew = this.mkRow(key, child);
                            childDisplay.appendChildren(childViewNew);
                            KeyboardMgr.triggerClick(<HTMLElement>childViewNew[0].firstChild)
                            childViewNew[0].scrollIntoView(true);
                        });
                        trg.classList.add("debuggerVarTableClickable");
                    }
                    childDisplay.appendChildren(childView);
                }

                if (Array.isArray(children)) {
                    (<any[]>children).forEach((child, ix) => addChild("at(" + ix + ")", child))
                } else if (children && typeof children === 'object') {
                    Object.keys(children).forEach(key => addChild(key, children[key]))
                }
                ret.push(childDisplay);
                k.classList.add("debuggerVarTableClickable");
                k.withClick(() => {
                    if (childDisplay.style.display == 'none') {
                        childDisplay.style.display = 'block';
                        k.scrollIntoView(true);
                    } else childDisplay.style.display = 'none';
                });
            }

            row.appendChildren([k, v]);
            return ret;
        }

        public setContents(vars: Hashtable) {
            var dsp = this.getBox().style.display;
            this.getBox().style.display = "none";
            vars.forEach((k, v) => {
                this.addVar(v.name, v.value);
            });
            this.getBox().style.display = dsp;
        }

        public getBox() {
            return this._theArea;
        }
        
        public showValue(val: any) {
            var dived = s => div(null, s);
            var rawdived = s => {
                var dv = div(null);
                Browser.setInnerHTML(dv, s);
                return dv;
            }

            switch (typeof val) {
                case "number":
                    return dived(val + "").withClick(() => tickArg(Ticks.debuggerValueClicked, "primitive"));
                case "string":
                    var lit = new AST.Literal();
                    lit.data = val;
                    var rep = this.renderer.dispatch(lit);
                    return rawdived(rep).withClick(() => {
                        tickArg(Ticks.debuggerValueClicked, "primitive");
                        ModalDialog.showText(val);
                    });
                case "boolean":
                    var lit = new AST.Literal();
                    lit.data = val;
                    var rep = this.renderer.dispatch(lit);
                    return rawdived(rep).withClick(() => tickArg(Ticks.debuggerValueClicked, "primitive"));
                case "undefined":
                    return dived("[invalid]").withClick(() => tickArg(Ticks.debuggerValueClicked, "invalid"));
                default:
                    if (val === null) {
                        Util.log("null value in debugger");
                        return dived("[null]").withClick(() => tickArg(Ticks.debuggerValueClicked, "null"));
                    } else if (val instanceof RT.RecordEntry) {
                        return (<RT.RTValue>val).debuggerDisplay(() => tickArg(Ticks.debuggerValueClicked, "record"));
                    } else if (val instanceof RT.RTValue) {
                        return (<RT.RTValue>val).debuggerDisplay(() => tickArg(Ticks.debuggerValueClicked, val.rtType()));
                    } else {
                        Util.log("unknown value in debugger");
                        return dived(JSON.stringify(val)).withClick(() => tickArg(Ticks.debuggerValueClicked, "unknown"));
                    }
                    break;
            }
        }
    }

    export class ScriptDebuggerControl extends StmtEditor {
        private buttons: DbgButton[] = [];
        private dbgButtons = div("calcButtonsTop");

        static keypadWidth = 5;
        static virtualKeypadWidth = 10; // = Calculator.keypadWidth; // mimic the calculator
        static keypadHeight = 1;

        static keypadWidthP = 4;
        static virtualKeypadWidthP = 7; // = Calculator.keypadWidthP; // mimic the calculator
        static keypadWidthPh = 4;
        static virtualKeypadWidthPh = 5; // = Calculator.keypadWidthP; // mimic the calculator

        public init(p: Editor) {
            this.buttons = Util.range(0, ScriptDebuggerControl.keypadWidth * ScriptDebuggerControl.keypadHeight).map(() => new DbgButton());
            this.setupKeys();
            this.setupKeypad();
            this.setupCalcElements(true);
            this.applySizes();
        }

        private setupKeys() {
            this.dbgButtons.setChildren(this.buttons.reverse().slice(0, ScriptDebuggerControl.keypadW()).map(it => it.getButton()));
            this.buttons.reverse(); // reverse back
            this.applySizes();
        }

        public applySizes() {

            this.setButtonSize();
            var setSize = (c: DbgButton) => c.setSize(ScriptDebuggerControl.buttonWidth, ScriptDebuggerControl.buttonHeight);
            this.buttons.forEach(setSize);

        }

        static buttonWidth = 100;
        static buttonHeight = 100;
        private setButtonSize() {
            var w = SizeMgr.editorWindowWidth;
            var h = SizeMgr.windowHeight;

            ScriptDebuggerControl.buttonWidth = Math.floor(w / ScriptDebuggerControl.virtualKeypadW() - 2.5);
            ScriptDebuggerControl.buttonHeight = (h * 0.45 / (ScriptDebuggerControl.keypadHeight + 3));
            if (ScriptDebuggerControl.buttonHeight > ScriptDebuggerControl.buttonWidth)
                ScriptDebuggerControl.buttonHeight = ScriptDebuggerControl.buttonWidth;
        }

        static virtualKeypadW() {
            return SizeMgr.phoneMode ? ScriptDebuggerControl.virtualKeypadWidthPh :
                SizeMgr.portraitMode ? ScriptDebuggerControl.virtualKeypadWidthP : ScriptDebuggerControl.virtualKeypadWidth;
        }

        static keypadW() {
            return SizeMgr.phoneMode ? ScriptDebuggerControl.keypadWidthPh :
                SizeMgr.portraitMode ? ScriptDebuggerControl.keypadWidthP : ScriptDebuggerControl.keypadWidth;
        }

        private setupKeypad() {
            var pm = SizeMgr.portraitMode;
            var ph = SizeMgr.phoneMode;

            var buttons = this.buttons;
            var self = this;

            
            buttons[0].setTextEx("wall", "go back", Ticks.debuggerGotoWall, () => TheEditor.gotoWall());
            buttons[1].setTextEx("stack", "show", Ticks.debuggerShowStack, () => TheEditor.showStackTraceAgain(false));
            buttons[2].setTextEx("current", "go to", Ticks.debuggerGotoCurrent, () => TheEditor.showRunningStmt());
            buttons[3].setTextEx("log", "console", Ticks.debuggerAppLog, () => TheEditor.showAppLog(Script));
            buttons[4].setTextEx("?", "help", Ticks.debuggerHelp, () => TheEditor.showDebuggingHelp());
        }

        private setupCalcElements(slideIn: boolean) {
            this.dbgButtons.removeSelf();

            this.visualRoot = div("stmtEditor" + (slideIn ? " showFromBelow" : ""), this.dbgButtons, div("calcButtonsClear"));
            this.visualRoot.style.left = "0px";
            this.visualRoot.style.right = "0";
            this.visualRoot.style.width = "auto";
        }
    }

    // TODO t-mikhab: all this class is a huge TODO right now
    export class ScriptDebuggerEditor
        extends StmtEditor
    {
        constructor() {
            super()
        }
        private varview: DbgVarView = new DbgVarView();

        public expr:AST.ExprHolder = null;
        public stmt:AST.Stmt;

        private lastHideTime = 0;
        private dbgViewer = div("calcButtonsTop");

        static keypadWidth = 7;
        static virtualKeypadWidth = 13; // = Calculator.keypadWidth; // mimic the calculator
        static keypadHeight = 1;
        static varHeight = 3;

        static keypadWidthP = 7;
        static virtualKeypadWidthP = 7; // = Calculator.keypadWidthP; // mimic the calculator
        static keypadWidthPh = 5;
        static virtualKeypadWidthPh = 5; // = Calculator.keypadWidthP; // mimic the calculator

        public init(p:Editor)
        {
            super.init(p);
            this.setupKeys();
        }

        static virtualKeypadW() {
            return SizeMgr.phoneMode ? ScriptDebuggerEditor.virtualKeypadWidthPh :
                SizeMgr.portraitMode ? ScriptDebuggerEditor.virtualKeypadWidthP : ScriptDebuggerEditor.virtualKeypadWidth;
        }

        static keypadW()
        {
            return SizeMgr.phoneMode ? ScriptDebuggerEditor.keypadWidthPh :
                   SizeMgr.portraitMode ? ScriptDebuggerEditor.keypadWidthP : ScriptDebuggerEditor.keypadWidth;
        }

        private setupKeys()
        {
            this.dbgViewer.setChildren([this.varview.getBox()]);
            this.applySizes();
        }

        static buttonWidth = 100;
        static buttonHeight = 100;
        private setButtonSize()
        {
            var w = SizeMgr.editorWindowWidth;
            var h = SizeMgr.windowHeight;

            ScriptDebuggerEditor.buttonWidth = Math.floor(w / ScriptDebuggerEditor.virtualKeypadW() - 2.5);
            ScriptDebuggerEditor.buttonHeight = (h * 0.45 / (ScriptDebuggerEditor.varHeight + 1));
            if (ScriptDebuggerEditor.buttonHeight > ScriptDebuggerEditor.buttonWidth)
                ScriptDebuggerEditor.buttonHeight = ScriptDebuggerEditor.buttonWidth;
        }

        public applySizes()
        {
            this.setButtonSize();
            this.varview.setSize(ScriptDebuggerEditor.buttonWidth * ScriptDebuggerEditor.keypadW(), ScriptDebuggerEditor.buttonHeight * ScriptDebuggerEditor.varHeight);
        }

        private resetState()
        {
            this.stmt = null;
            if (!this.expr) return;
            this.expr = null;
        }

        public bye()
        {
            this.lastHideTime = Util.now()
            this.resetState();
            TheEditor.sideKeyFocus = false;
        }

        private addBreakpoint() {
            TheEditor.addBreakpoint(this.stmt);
            this.edit(this.stmt);
            this.display();
        }

        private removeBreakpoint() {
            TheEditor.removeBreakpoint(this.stmt);
            this.edit(this.stmt);
            this.display();
        }

        public display()
        {
            if (this.expr == null) return;
        }

        public isActive() { return this.expr != null; }

        public showVarName(val: any) {
            return val.getName && val.getName();
        }

        public edit(s:AST.Stmt) : void // the user just clicked on a line
        {
            tick(Ticks.debuggerShowValues);
            this.setButtonSize();

            var wasActive = Util.now() - this.lastHideTime < 500;

            this.stmt = s;

            if (this.stmt instanceof AST.Comment) return;

            var c = s.calcNode();
            if (!c) return;
            if (c == this.expr) return;
            this.expr = c;

            this.setupCalcElements(!wasActive);

            this.varview.clear();
            var varFinder = new AST.VariableFinder();
            varFinder.traverse(s, true);
            
            var currentAction = TheEditor.currentAction();

            // the hashtable prevents dupes
            var vars: Hashtable = Hashtable.forStrings();
            var appendGlobalDecl = (g) => {
                var realName = "$" + g.stableName;
                var val = TheEditor.currentRt.debuggerQueryGlobalValue(realName);
                var nm = this.showVarName(g);
                vars.set(realName, { name: nm, value: val });
            };

            var stack = TheEditor.getStackTrace();
            var currentStackFrame = stack.filter(frame => frame && frame.name === currentAction.getName())[0];

            if (currentStackFrame) {
                var appendLocalDecl = (l: AST.LocalDef) => {
                    var name = l.getName();
                    var val = TheEditor.currentRt.debuggerQueryLocalValue(currentAction.stableId, name, currentStackFrame);

                    if (val === undefined) {
                        var param = currentAction.getOutParameters().map((e, ix) => [e, ix]).filter(pair => (<any>pair[0]).getName() === name)[0];
                        if (param) val = TheEditor.currentRt.debuggerQueryOutValue(<number>param[1], currentStackFrame);
                    }

                    var nm = this.showVarName(l);
                    vars.set(currentAction.stableId + ":" + name, { name: nm, value: val });
                };

                varFinder.readLocals.forEach(appendLocalDecl);
                varFinder.writtenLocals.forEach(appendLocalDecl);
            }

            varFinder.readGlobals.forEach(appendGlobalDecl);
            varFinder.writtenGlobals.forEach(appendGlobalDecl);

            this.varview.setContents(vars);

            this.setupKeys();
            this.display();

            TheEditor.showStmtEditor(this);
        }

        private setupCalcElements(slideIn:boolean)
        {
            this.dbgViewer.removeSelf();

            this.visualRoot = div("stmtEditor" + (slideIn ? " showFromBelow" : ""), this.dbgViewer, div("calcButtonsClear"));
            this.visualRoot.style.left = "0px";
            this.visualRoot.style.right = "0";
            this.visualRoot.style.width = "auto";
        }
        
        public handleKey(e:KeyboardEvent) : boolean
        {
            if (!this.expr) return false;

            if (e.fromTextArea) return false;
            if (ModalDialog.currentIsVisible()) return false;

            if (e.fromTextBox) return false;

            switch (e.keyName) {
                case "Esc":
                    TheEditor.dismissSidePane();
                    break;
                case "Up":
                    TheEditor.moveEditorCarret(-1);
                    break;
                case "Down":
                    TheEditor.moveEditorCarret(+1);
                    break;
                default:
                    break;
            }

            tickArg(Ticks.debuggerKeyboardEvent, e.keyName);

            return true;
        }

        static mkSorryMsg() {
            return div(null,
                div(null, "You cannot edit the script in debugger mode, sorry."),
                document.createElement("br"),
                div(null, "If you want to edit the script, first exit debugger mode by pressing the \"exit\" button."));
        }
    }



    export class ScriptDebuggerNonEditor
        extends SideTab {

        constructor() {
            super()
        }
        public init(e: Editor) {
            super.init(e);
        }

        public edit(ss: AST.Stmt) {
            this.setChildren([ScriptDebuggerEditor.mkSorryMsg()]);
        }

        public bye() {
        }
    }

}
