///<reference path='refs.ts'/>

module TDev
{
    export class CodeLocation
    {
        public scrollPos:number;
        public score:number;
        public stmt:AST.Stmt;
        public isSearchResult = false;
        public isCurrAction = false;
        public isLibrary = false;
        public nameOverride:string;

        constructor(public decl:AST.Decl) {
        }
        public similar(other:CodeLocation) { return this.decl == other.decl && Math.abs(this.scrollPos - other.scrollPos) < 500; }

        public nodeType() { return this.decl.nodeType(); }
        public getName() { return this.decl.getName(); } // for sorting

        public mkBox()
        {
            if (!this.stmt) return DeclRender.mkBox(this.decl);

            var res = DeclRender.mkBoxEx(this.decl, this.isLibrary ? "codeLocationLib" :
                                                      this.isCurrAction ? "codeLocationCurr" : "codeLocation");
            var descDiv = <HTMLElement> (<any>res).theDesc;
            Browser.setInnerHTML(descDiv, TheEditor.auxRenderer.dispatch(this.stmt));

            if (this.nameOverride)
                (<HTMLElement>(<any>res).theName).setChildren([ this.nameOverride ])

            return res;
        }

        public toJson():any
        {
            return {
                nodeType: this.decl.nodeType(),
                name: this.decl.getName(),
                scrollPos: this.scrollPos
            }
        }

        public rebind() { return CodeLocation.fromJson(this.toJson()); }

        static fromJson(j:any)
        {
            if (!j) return null;
            var nt = j.nodeType;
            var name = j.name;
            var decl:AST.Decl;
            if (nt == "app") decl = Script;
            else decl = Script.things.filter((t:AST.Decl) => t.nodeType() == nt && t.getName() == name)[0];
            if (!decl) return null;
            var r = new CodeLocation(decl);
            r.scrollPos = j.scrollPos;
            return r;
        }
      
        static fromNodeId(id:string, lib:string = null)
        {
            if (!id) return null;
            var app = Script
            if (lib == "this") lib = null;
            if (lib) {
                var l0 = Script.libraries().filter(l => l.getStableName() == lib)[0]
                if (l0 && l0.resolved)
                    app = l0.resolved
                else
                    return null
            }
            var res = app.findAstNodeById(id, true);
            if (!res) return null;

            var node = res.stmt

            if (node instanceof AST.Decl) {
                loc = new CodeLocation(<AST.Decl>node);
                loc.isSearchResult = true;
                loc.isLibrary = !!lib
                return loc;
            }

            if (node instanceof AST.Stmt) {
                var loc = new CodeLocation(res.decl);
                loc.stmt = node
                loc.isSearchResult = true;
                loc.isLibrary = !!lib
                return loc;
            }

            return null;
        }
    }
}
