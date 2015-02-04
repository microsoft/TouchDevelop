///<reference path='refs.ts'/>

module TDev
{
    export class EditorRenderer
        extends Renderer
    {
        private stmts = <AST.Stmt[]> [];
        private nodeActions = [];
        private currentId = 0;

        constructor(private noHooks = false)
        {
            super()
            this.mdComments = new MdComments(new Renderer());
            this.mdComments.showCopy = false;
            this.mdComments.designTime = true;
        }


        public addModelFieldHint()
        {
            return Renderer.tdiv("hintMessage inlineHint", lf("To add page data, create a local var and tap 'promote to field'."))
        }

        public stmt(n:AST.Stmt, args:string, f:(e:HTMLElement)=>void = undefined, blockNode:AST.Stmt = null)
        {
            if (this.isAux) return args;


            var id = "stmt-" + this.currentId++;

            if (!this.noHooks) {
                n.renderedAs = null;
                n.renderedAsId = id;
                this.stmts.push(n);
                if (!!f) {
                    this.nodeActions.push(() => {
                        var n = document.getElementById(id);
                        f(n);
                    });
                }
            }

            var depth = 0;
            for (var p = blockNode || n; !!p; p = p.parent)
                depth++;
            depth = (Math.floor((depth - 3) / 2)) % 4;

            var dbgCtx = n.debuggerRenderContext;

            if (dbgCtx.isBreakPoint) {
                var breakPointRender = Renderer.tdiv("breakpoint codeleftmark", SVG.getIconSVGCore("breakpoint,red"));
                args = args + breakPointRender;
            }
            if (dbgCtx.isOnStackTrace) {
                var callStackRender = Renderer.tdiv("callstackmark codeleftmark", SVG.getIconSVGCore("stackPoint,blue"));
                args = args + callStackRender;
            }
            if (dbgCtx.isCurrentExecPoint) {
                var currentPointRender = Renderer.tdiv("callstackmark codeleftmark", SVG.getIconSVGCore("currentPoint,green"));
                args = args + currentPointRender;
            }

            // This is where the small bubbleheads go to indicate who's
            // currently editing this line.
            args += Renderer.tdiv("stmtParticipants", Renderer.tdiv("stmtParticipantsOverflowBox", ""));

            return Util.fmt("<div id='{0}' class='stmt {3}' data-nest='{2}'>{1}{4}</div>", id, args, depth, this.diffClass(n) + this.stmtClass(blockNode || n), this.diffMoveMarker(n));
        }

        static setActive(n:AST.Stmt, v:boolean)
        {
            var e = n.renderedAs;

            if (e)
                e.setFlag("current", v)

                /*

            var par = <HTMLElement> e.parentNode
            if (par.className == "elseIfHolder" && par.firstChild == e) {
                e = par;
            }

            var f = e;
            while (!!f) {
                if (f.className == "line") {
                    f.setFlag("current", v);
                    break;
                }
                f = <HTMLElement>f.firstChild;
            }

            f = e;
            while (!!f) {
                if (f.className == "elseIfHolder") {
                    f = <HTMLElement>f.firstChild;
                    f.setFlag("current", v);
                    f = <HTMLElement>f.nextSibling;
                } else {
                    if (f.className == "stmt") {
                        f.setFlag("current", v);
                    }
                    break;
                }
            }
            */

            Collab.onActivation(n);

            return e;
        }

        public attachHandlers()
        {
            var dod = Browser.dragAndDrop ? new DragAndDropContext() : undefined;
            this.stmts.forEach((s) => {
                var e = <HTMLElement> document.getElementById(s.renderedAsId);
                (<any>e).node = s;
                s.renderedAs = e;
                var head = true;
                var prevLines:HTMLElement[] = []

                var numBlocks = 0
                if (dod)
                    for (var ch = <HTMLElement>e.firstChild; ch; ch = <HTMLElement>ch.nextSibling)
                        if (/^block/.test(ch.className))
                            numBlocks++
                if (numBlocks) {
                    var blockCh = s.innerBlocks()
                    while (blockCh.length > numBlocks)
                        blockCh.shift()
                }


                for (var ch = <HTMLElement>e.firstChild; ch; ch = <HTMLElement>ch.nextSibling) {
                    if (ch.tagName.toUpperCase() == "BR") continue;
                    if (/^(line|hintMessage|errorMessage)/.test(ch.className)) {
                        if (head)
                            ch.withClick(() => TheEditor.nodeTap(s, true, false))
                        else
                            ch.withClick(() => TheEditor.nodeTap(s, true, true))
                        prevLines.push(ch)
                    } else if (/callstackmark/.test(ch.className)) {
                        ch.withClick(() => TheEditor.showStackFrame(s));
                    } else {
                        head = false;
                    }

                    if (blockCh && /^block/.test(ch.className)) {
                        if (blockCh[0])
                            prevLines.forEach(l => {
                                (<any>l).node = blockCh[0]
                                dod.attachDragOverHandlers(blockCh[0], l)
                            })
                        blockCh.shift()
                        prevLines = []
                    }
                }
                e.withClick((args:MouseEvent) => {
                    TheEditor.nodeTap(s, false);
                });
                if (dod && s.nodeType() != "actionHeader") {
                    dod.attachDragStartEndHandlers(s, e);
                    dod.attachDragOverHandlers(s, e);
                }
            });
            this.nodeActions.forEach((f) => f());
            this.stmts = [];
            this.nodeActions = [];
        }

        public tokenElement(n:AST.Token) : HTMLElement
        {
            var inner = <string> this.dispatch(n);
            var elt = document.createElement("span");
            Browser.setInnerHTML(elt, inner);
            var c = elt.firstChild;
            if (c instanceof HTMLElement) {
                elt.removeChild(c);
                return <HTMLElement>c;
            } else {
                return elt;
            }
        }

        public renderStmt(s:AST.Stmt):HTMLElement
        {
            var res = div(null);
            if (s instanceof AST.Block)
                Browser.setInnerHTML(res, this.renderBlock(<AST.Block>s));
            else
                Browser.setInnerHTML(res, this.dispatch(s));
            return res;
        }

        public declDiv(d:AST.Decl):HTMLElement
        {
            var r = div('decl');
            Browser.setInnerHTML(r, this.dispatch(d));
            return r;
        }

        public renderLibSignatures(n:AST.LibraryRef)
        {
            var r = div(null);

            var renderParam = (n:AST.ActionParameter) => this.id(n.getName()) + this.op(":") + this.id(n.getKind().toString());

            if (n.resolved) {
                var sigs = ""
                var md = new MdComments();
                var thingsByName = Util.toDictionary(n.resolved.things, a => a.getName())
                n.getPublicKinds().forEach(k => {
                    if (k.getRecord())
                        sigs += Renderer.tdiv("action-sig", this.dispatch((<AST.RecordDef>thingsByName[k.getRecord().getName()])))

                })
                n.getPublicActions().forEach((a) => {
                    var inner = this.kw(AST.legacyMode ? "action " : "function ") + Util.htmlEscape(a.getName());
                    if (a.hasInParameters())
                        inner += "(" + a.getInParameters().map(renderParam).join(", ") + ")";
                    if (a.hasOutParameters()) {
                        inner += this.kw("returns");
                        inner += " (" + a.getOutParameters().map(renderParam).join(", ") + ")";
                    }

                    var ln = "";

                    var aa = <AST.Action>thingsByName[a.getName()]
                    var help = aa ? aa.getInlineHelp() : ""
                    if (help)
                        ln += Renderer.tdiv("stmt stmt-comment", this.tline(Renderer.tdiv("md-comment",  md.formatText(help))))

                    ln += this.tline(inner)
                    sigs += Renderer.tdiv('action-sig', super.stmt(a, ln));
                });
                Browser.setInnerHTML(r, super.stmt(n, this.tline(this.kw("signature")) + Renderer.tdiv("block", sigs)));
            }

            return r;
        }

        public renderExprHolder(e:AST.ExprHolder, tokens:AST.Token[]):string
        {
            var res = super.renderExprHolder(e, tokens)

            if (e.isAwait)
                res = "<div class='codeAwait'>" + SVG.getIconSVGCore("clock2,black,clip=40") + "</div>" + res;

            return res
        }


        public visitComment(n:AST.Comment)
        {
            var inner = ""
            if (n.text.trim())
                inner += Renderer.tdiv("line", Renderer.tdiv("md-comment", this.mdComments.formatText(n.text)))
            else
                inner += this.tline("<span class='comment'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>")
            return this.stmt(n, inner + this.possibleError(n));
        }

    }

    class DragAndDropContext {
        private sourceStmt: TDev.AST.Stmt;
        private sourceElement: HTMLElement;
        private targetElement: HTMLElement;

        constructor() {
        }

        static findParent(el: HTMLElement) {
            while (el) {
                if ((<any>el).node) return el;
                el = el.parentElement;
            }
            return undefined;
        }

        static cancel(e: DragEvent) : boolean {
            if (e.preventDefault) e.preventDefault();
            return false;
        }

        private handleDragEnter(s: TDev.AST.Stmt, e: DragEvent) {
            if (e.dataTransfer.types[0] == 'Files') return;

            var el = DragAndDropContext.findParent(<HTMLElement>e.target);
            if (el) {
                if (this.targetElement) {
                    this.targetElement.classList.remove('node-drop-bottom');
                }
                Util.log('drag enter: ' + el.id);
                el.classList.add('node-drop-bottom');
                e.dataTransfer.dropEffect = 'move';
                this.targetElement = el;
                return DragAndDropContext.cancel(e);
            }
        }

        private handleDragLeave(e: DragEvent) {
            var el = <HTMLElement>e.target;
            if ((<any>el).node) {
                Util.log('drag leave: ' + el.id);
                el.classList.remove('node-drop-bottom');
                if (el == this.targetElement)
                    this.targetElement = undefined;
            }
        }

        public attachDragStartEndHandlers(stmt : TDev.AST.Stmt, r: HTMLElement) {
            r.draggable = true;
            r.addEventListener('dragstart', (e) => {
                e.stopPropagation();
                Util.log('drag start: ' + r.id);
                tick(Ticks.dodStart);
                e.dataTransfer.setData('Text', r.id);
                e.dataTransfer.dropEffect = 'move';
                r.classList.add('node-dragged');
                this.sourceStmt = stmt;
                this.sourceElement = r;
                return false;
            }, false);
            r.addEventListener('dragend', (e) => {
                Util.log('drag end: ' + r.id);
                r.classList.remove('node-dragged');
                this.sourceStmt = undefined;
                this.sourceElement = undefined;
                if (this.targetElement) {
                    this.targetElement.classList.remove('node-drop-bottom');
                    this.targetElement = undefined;
                }
            }, false);
        }

        public attachDragOverHandlers(stmt: TDev.AST.Stmt, r: HTMLElement) {
            r.addEventListener('dragover', function (e) {
                if (e.dataTransfer.types[0] != 'Files') {
                    if (e.preventDefault) e.preventDefault(); // Necessary. Allows us to drop.
                    e.dataTransfer.dropEffect = 'move';  // See the section on the DataTransfer object.
                    return false;
                }
            }, false);
            r.addEventListener('dragenter', e => this.handleDragEnter(stmt, e), false);
            r.addEventListener('dragleave', e => this.handleDragLeave(e), false);
            r.addEventListener('drop', (e) => {
                Util.log('drag drop: ' + r.id);
                if (this.sourceElement && this.targetElement) {
                    this.sourceElement.classList.remove('node-dragged');
                    this.targetElement.classList.remove('node-drop-bottom');
                    var targetNode = (<any>this.targetElement).node;
                    if (targetNode) {
                        if (e.stopPropagation) e.stopPropagation();
                        if (this.sourceStmt && targetNode && this.sourceStmt != targetNode) {
                            if (targetNode instanceof AST.Block) {
                                var block = <AST.Block>targetNode;
                                var pos = 0
                            } else if (targetNode instanceof AST.Stmt) {
                                block = (<AST.Stmt>targetNode).parentBlock()
                                if (block)
                                    pos = block.stmts.indexOf(<AST.Stmt>targetNode) + 1
                            }

                            var isSelfParent = false
                            for (var pp:AST.Stmt = block; pp; pp = pp.parent)
                                if (pp == this.sourceStmt)
                                    isSelfParent = true

                            if (!isSelfParent && this.sourceStmt.parentBlock() && block && block.allowAdding() && block.allowAddOf(this.sourceStmt)) {
                                TheEditor.undoMgr.clearCalc();
                                TheEditor.undoMgr.pushMainUndoState();
                                var oldBlock = this.sourceStmt.parentBlock()
                                var idx = oldBlock.stmts.indexOf(this.sourceStmt)
                                if (idx >= 0) {
                                    oldBlock.stmts.splice(idx, 1)
                                    if (block == oldBlock && idx < pos)
                                        pos--
                                    if (oldBlock != block && !oldBlock.allowEmpty() && oldBlock.stmts.length == 0) {
                                        oldBlock.setChildren([oldBlock.emptyStmt()])
                                        TheEditor.initIds(oldBlock)
                                    }
                                    oldBlock.notifyChange()
                                }

                                var prev = block.stmts[pos - 1]
                                if (prev && prev.isPlaceholder())
                                    block.stmts[pos - 1] = this.sourceStmt
                                else
                                    block.stmts.splice(pos, 0, this.sourceStmt)
                                block.newChild(this.sourceStmt)
                                block.notifyChange()

                                TheEditor.dismissSidePane()
                                TheEditor.refreshDecl()
                                tick(Ticks.dodDrop);
                            } else {
                                Util.coreAnim("shakeTip", 500, r);
                                tick(Ticks.dodWrongTarget);
                            }
                        }
                    }
                }
                this.sourceElement = undefined;
                this.sourceStmt = undefined;
                if (e.preventDefault()) e.preventDefault();
                return false;
            }, false);
        }

    }
}
