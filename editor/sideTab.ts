///<reference path='refs.ts'/>

module TDev
{
    export class SideTab
    {
        public scrollRoot:HTMLElement;
        public visualRoot:HTMLElement;
        public editor:Editor;
        public navRefreshPending:boolean = false;
        public justNavigatedTo = false;
        public getTick() { return Ticks.noEvent; }
        public phoneFullScreen() { return false }
        public phoneNarrow() { return false }
        private scrollPos = 0;

        public htmlEntries:HTMLElement[] = [];
        public carretIdx = 0;

        constructor()
        {
            this.scrollRoot = div("sideTabScroll");
            this.visualRoot = div("sideTabContent", this.scrollRoot);
        }

        public isNav() { return !this.isModal(); }
        private needScroll() { return true; }
        public icon():string { return null; }
        public name():string { return null; }
        public keyShortcut():string { return null; }
        public isModal() { return this.icon() == null; }
        public bye() {}
        public edit(s:AST.Stmt) {}
        public queueNavRefresh()
        {
            this.navRefreshPending = true;
        }

        public editedStmt():AST.Stmt { return null; }

        public rebind()
        {
        }

        public gotKeyboardFocus()
        {
            if (!this.isNav()) return;
            var sel = this.findFirstSelected();
            var idx = this.htmlEntries.indexOf(sel);
            if (idx < 0) idx = 0;
            this.carretIdx = idx;
            this.highlightCarret();
        }

        public moveCarret(d:number)
        {
            this.carretIdx = Util.boundTo(0, this.carretIdx + d, this.htmlEntries.length - 1);
            this.highlightCarret();
        }

        public carretBound() { return 0 }

        public highlightCarret()
        {
            if (TheEditor.sideKeyFocus)
                this.carretIdx = Util.boundTo(this.carretBound(), this.carretIdx, this.htmlEntries.length - 1);
            else
                this.carretIdx = -1;
            this.htmlEntries.forEach((e:HTMLElement, idx:number) => {
                e.setFlag("current", idx == this.carretIdx);
            });
            var e = this.htmlEntries[this.carretIdx];
            if (!!e)
                Util.ensureVisible(e);
        }

        public getStmtUnderCarret()
        {
            return this.htmlEntries[this.carretIdx];
        }

        public onEnter()
        {
            var entry = this.htmlEntries[this.carretIdx];
            if (!entry) return false;
            KeyboardMgr.triggerClick(entry);
            return true;
        }

        public handleCarretKeys(e:KeyboardEvent)
        {
            if (e.fromTextArea) return false;
            switch (e.keyName) {
            case "Up":
                this.moveCarret(-1);
                return true;
            case "PageUp":
                this.moveCarret(-5);
                return true;
            case "Home":
                this.moveCarret(-1000);
                return true;
            case "Down":
                this.moveCarret(1);
                return true;
            case "PageDown":
                this.moveCarret(5);
                return true;
            case "End":
                this.moveCarret(1000);
                return true;
            case "Tab":    
            case "Enter":
                this.onEnter();
                return true;
            }

            return false;
        }

        public handleKey(e:KeyboardEvent)
        {
            if (!this.isNav()) return false;
            if (!TheEditor.sideKeyFocus) return false;

            return this.handleCarretKeys(e);
        }

        public navigatedTo()
        {
            tick(this.getTick());
            this.justNavigatedTo = true;
        }

        private findFirstSelected() : HTMLElement
        {
            return this.htmlEntries.filter((e:HTMLElement) => e.getFlag("selected"))[0];
        }

        public ensureSelectedVisible()
        {
            var node = this.findFirstSelected();
            if (!!node)
                Util.ensureVisible(node, this.scrollRoot, 0.1);
        }

        public refresh()
        {
            if (this.isNav()) {
                this.setScroll();
                this.highlightCarret();
                if (!this.navRefreshPending) return;
                this.navRefreshPending = false;
            }
            this.refreshCore();
            if (this.isNav()) {
                this.setScroll();
                this.highlightCarret();
            }
            this.justNavigatedTo = false;
        }

        public refreshCore() : void
        {
        }

        public saveState()
        {
            if (this.needScroll())
                this.scrollPos = this.scrollRoot.scrollTop || 0;
        }

        private setScroll()
        {
            if (this.needScroll()) {
                this.scrollRoot.scrollTop = this.scrollPos;
                if (!this.navRefreshPending && this.justNavigatedTo) this.ensureSelectedVisible();
            }
        }

        public reset()
        {
            this.scrollPos = 0;
            this.carretIdx = 0;
        }

        public init(e:Editor)
        {
            this.editor = e;
            if (this.needScroll())
                Util.setupDragToScroll(this.scrollRoot);
            if (this.isNav())
                this.scrollRoot.className += " tabNav";
            else
                this.scrollRoot.className += " tabNonNav";
        }

        public setChildren(children:any[])
        {
            this.scrollRoot.setChildrenIfNeeded(children);
        }

        public applySizes()
        {
        }

    }

    export class StmtEditor
    {
        public visualRoot:HTMLElement = div("stmtEditor");
        private editor:Editor;

        public bye() {}
        public nodeTap(s:AST.AstNode) { return false; }
        public edit(s:AST.Stmt) {}

        private rebind()
        {
        }

        public init(e:Editor)
        {
            this.editor = e;
        }

        private setChildren(children:any[])
        {
            this.visualRoot.setChildren(children);
        }

        public applySizes()
        {
        }

        public cutHandler() {}
        public copyHandler() {}

        public getSideTab() : SideTab { return null; }
        public handleKey(e:KeyboardEvent) { return false; }

        public editedStmt():AST.Stmt { return null; }
    }
}
