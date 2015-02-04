///<reference path='refs.ts'/>

module TDev
{
    export class CommentEditor
        extends StmtEditor
    {
        private stmt:AST.Comment;
        private text:HTMLTextAreaElement;
        private restartCursorPos = -1;

        constructor() {
            super()
        }

        public editedStmt():AST.Stmt { return this.stmt; }

        public edit(ss:AST.Stmt)
        {
            tick(Ticks.sideCommentInit)
            Util.assert(ss instanceof AST.Comment);
            var s = <AST.Comment> ss;
            this.stmt = s;

            var res = HTML.mkAutoExpandingTextArea()
            //res.div.className += " calcStringEdit";
            res.textarea.value = s.text;
            this.text = res.textarea;
            this.text.placeholder = "Write comment here, use markdown syntax!"

            this.stmt.renderedAs.withClick(() => { });

            this.stmt.renderedAs.setChildren(res.div)
            this.stmt.renderedAs.draggable = false;
            res.onUpdate = () => TheEditor.selector.positionButtonRows();
            res.update()
            Util.setKeyboardFocusTextArea(this.text);
            if (this.restartCursorPos >= 0) {
                try {
                    this.text.setSelectionRange(this.restartCursorPos, this.restartCursorPos);
                } catch (e) { }
                this.restartCursorPos = -1;
            }

            api.core.stmtUsage("comment").localCount += 10;

            TheEditor.showStmtEditor(this);
        }
        
        public handleKey(e:KeyboardEvent) : boolean
        {
            if (e.keyName == "Esc") {
                TheEditor.dismissSidePane();
                return true;
            }

            if (e.keyName == "Backspace" && this.text.selectionStart == 0) {
                if (this.text.value == "") {
                    TheEditor.selector.deleteSelection();
                    TheEditor.dismissSidePane();
                    return true;
                } else {
                    var par = <AST.CodeBlock>this.stmt.parent;
                    var idx = par.stmts.indexOf(this.stmt)
                    if (idx > 0 && par.stmts[idx - 1] instanceof AST.Comment) {
                        // merge comments
                        var prev = <AST.Comment>par.stmts[idx - 1];
                        this.restartCursorPos = prev.text.length + 1;
                        prev.text += " " + this.text.value;
                        TheEditor.selector.deleteSelection();
                        TheEditor.editNode(prev);
                        return true;
                    }
                }
            }

            return false;
        }

        public bye()
        {
            if (!this.stmt) return;
            var newText = this.text.value.replace(/^\s+|\s+$/g, "");
            newText = newText.replace(/\r\n/g, "\n");
            newText = newText.replace(/\r/g, "\n");
            if (/\n/.test(newText)) {
                var lines = newText.split(/\n/).filter((s) => !!s);
                this.stmt.text = lines[0];
                var newStmts:AST.Stmt[] = [this.stmt]
                lines.slice(1).forEach((l) => {
                    var c = new AST.Comment()
                    c.text = l
                    newStmts.push(c)
                    TheEditor.initIds(c)
                });
                var bl = <AST.CodeBlock>this.stmt.parent;
                var idx = bl.stmts.indexOf(this.stmt)
                newStmts = bl.stmts.slice(0, idx).concat(newStmts.concat(bl.stmts.slice(idx + 1)));
                bl.setChildren(newStmts)
            } else {
                this.stmt.text = newText;
            }
            this.stmt.notifyChange();
            this.stmt = null;
        }
    }
}
