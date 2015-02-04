///<reference path='../editor/refs.ts'/>

module TDev.IntelliTrain {

    class TokenVisitor extends TDev.AST.Json.NodeVisitor {
        constructor(private element: HTMLElement) {
            super();
        }

        public show(s: any) {
            var span = document.createElement('span');
            span.innerText = s;
            span.className = "token";
            this.element.appendChild(span);
        }

        public visit_token(tok: TDev.AST.Json.JToken) {
            this.show(tok.nodeType);
        }

        public visit_stringLiteral(lit: TDev.AST.Json.JStringLiteral): any {
            this.show(lit.value);
        }
        public visit_numberLiteral(lit: TDev.AST.Json.JNumberLiteral): any {
            this.show(lit.value);
        }
        public visit_booleanLiteral(lit: TDev.AST.Json.JBooleanLiteral): any {
            this.show(lit.value);
        }
        public visit_localRef(local: TDev.AST.Json.JLocalRef): any {
            this.show(local.name);
        }
        public visit_singletonRef(singleton: TDev.AST.Json.JSingletonRef): any {
            this.show(singleton.name);
        }
        public visit_propertyRef(property: TDev.AST.Json.JPropertyRef): any {
            this.show(property.name);
        }
        public visit_localDef(local: TDev.AST.Json.JLocalDef): any {
            this.show(local.name);
        }
        public visit_operator(op: TDev.AST.Json.JOperator): any {
            this.show(op.op);
        }


        public visitScript(id: string) {
            var script = TDev.Util.httpRequestAsync("http://www.touchdevelop.com/api/" + id + "/webast");
            script.done((v) => {
                var rval = JSON.parse(v);
                if (rval) {
                    var traverser = new TDev.AST.Json.VisitTokens();
                    traverser.traverse_pre(rval, this);
                }
            },
                (e) => { this.element.innerText = e });

        }
    }
}