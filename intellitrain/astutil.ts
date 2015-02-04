///<reference path='../editor/refs.ts'/>


module TDev.AST.Json {

    export class NodeVisitor {

        /// visitor methods based on nodeType to override in specialized visitors
        public visit_exprHolder(holder: JExprHolder): any { return this.visit_node(holder); }
        public visit_stringLiteral(lit: JStringLiteral): any { return this.visit_expr(lit); }
        public visit_numberLiteral(lit: JNumberLiteral): any { return this.visit_expr(lit); }
        public visit_booleanLiteral(lit: JBooleanLiteral): any { return this.visit_expr(lit); }
        public visit_call(call: JCall): any { return this.visit_expr(call); }
        public visit_localRef(local: JLocalRef): any { return this.visit_expr(local); }
        public visit_exprStmt(node: JExprStmt): any { return this.visit_stmt(node); }
        public visit_inlineAction(action: JInlineAction): any { return this.visit_node(action); }
        public visit_inlineActions(actions: JInlineActions): any { return this.visit_exprStmt(actions); }
        public visit_boxed(boxed: JBoxed): any { return this.visit_stmt(boxed); }
        public visit_singletonRef(singleton: JSingletonRef): any { return this.visit_expr(singleton); }
        public visit_if(node: JIf): any { return this.visit_stmt(node); }
        public visit_propertyRef(property: JPropertyRef): any { return this.visit_token(property); }
        public visit_localDef(local: JLocalDef): any { return this.visit_node(local); }
        public visit_action(action: JAction): any { return this.visit_actionBase(action); }
        public visit_comment(comment: JComment): any { return this.visit_stmt(comment); }
        public visit_operator(op: JOperator): any { return this.visit_token(op); }
        public visit_while(stmt: JWhile): any { return this.visit_stmt(stmt); }
        public visit_for(stmt: JFor): any { return this.visit_stmt(stmt); }
        public visit_foreach(stmt: JForeach): any { return this.visit_stmt(stmt); }
        public visit_where(clause: JWhere): any { return this.visit_condition(clause); }
        public visit_typeRef(type: JTypeRef): any { return null; }
        public visit_placeholder(p: JPlaceholder): any { return this.visit_expr(p); }
        public visit_page(p: JPage): any { return this.visit_actionBase(p); }
        public visit_event(e: JEvent): any { return this.visit_actionBase(e); }
        public visit_libAction(la: JLibAction): any { return this.visit_actionBase(la); }
        public visit_art(art: JArt): any { return this.visit_globalDef(art); }
        public visit_data(data: JData): any { return this.visit_globalDef(data); }
        public visit_library(lib: JLibrary): any { return this.visit_decl(lib); }
        public visit_typeBinding(type: JTypeBinding): any { return this.visit_binding(type); }
        public visit_actionBinding(action: JActionBinding): any { return this.visit_binding(action); }
        public visit_resolveClause(r: JResolveClause): any { return this.visit_node(r); }
        public visit_record(r: JRecord): any { return this.visit_decl(r); }
        public visit_recordField(rf: JRecordField): any { return this.visit_node(rf); }
        public visit_recordKey(rk: JRecordKey): any { return this.visit_recordField(rk); }
        public visit_app(app: JApp): any { return this.visit_node(app); }
        public visit_propertyParameter(p: JPropertyParameter): any { return null; }
        public visit_property(p: JProperty): any { return null; }
        public visit_typeDef(td: JTypeDef): any { return null; }
        public visit_apis(apis: JApis): any { return null; }


        /// abstract visitors
        public visit_node(node: JNode): any { return null; }
        public visit_token(tok: JToken):any { return this.visit_node(tok); }
        public visit_expr(tok: JExpr):any { return this.visit_token(tok); }
        public visit_stmt(n: JStmt):any { return this.visit_node(n); }
        public visit_stmts(sl: JStmt[]): any { return sl.map(this.visit_stmt); }
        public visit_actionBase(ab: JActionBase): any { return this.visit_decl(ab); }
        public visit_decl(d: JDecl): any { return this.visit_node(d); }
        public visit_condition(c: JCondition): any { return this.visit_node(c); }
        public visit_globalDef(g: JGlobalDef): any { return this.visit_decl(g); }
        public visit_binding(b: JBinding): any { return this.visit_node(b); }

        public dispatch(n: JNode):any {
            var propName = "visit_" + n.nodeType;
            var visitor = this[propName];
            if (visitor) {
                return visitor.apply(this, [n]);
            }
            return null;
        }

    }



    export class VisitTokens extends NodeVisitor {

        public traverse_pre(node: JNode, visitor: NodeVisitor) {
            // visit this
            visitor.dispatch(node);

            this.children(node).forEach(v => this.traverse_pre(v, visitor));
        }

        public children(node: JNode): JNode[]{
            return this.dispatch(node);
        }

        /// visitor methods returning children in left to right order
        public visit_node(node:JNode): any {
            return [];
        }

        public visit_exprHolder(holder: TDev.AST.Json.JExprHolder): any {
            return holder.tokens;
        }

        public visit_exprStmt(node: JExprStmt): any {
            return [node.expr];
        }
        public visit_inlineAction(action: JInlineAction): any {
            return action.body;
        }
        public visit_inlineActions(actions: JInlineActions): any {
            return actions.actions;
        }
        public visit_boxed(boxed: JBoxed): any {
            return boxed.body;
        }
        public visit_singletonRef(singleton: JSingletonRef): any {
            return [];
        }
        public visit_if(node: JIf): any {
            return [<any>node.condition].concat(node.thenBody).concat(node.elseBody);
        }
        public visit_propertyRef(property: JPropertyRef): any {
            return [];
        }
        public visit_localDef(local: JLocalDef): any {
            return [];
        }
        public visit_action(action: JAction): any {
            return action.body;
        }
        public visit_comment(comment: JComment): any { return []; }
        public visit_operator(op: JOperator): any { return []; }
        public visit_while(stmt: JWhile): any {
            return [<any>stmt.condition].concat(stmt.body);
        }
        public visit_for(stmt: JFor): any {
            return [<any>stmt.bound].concat(stmt.body);
        }
        public visit_foreach(stmt: JForeach): any {
            return [<any>stmt.collection].concat(stmt.conditions).concat(stmt.body);
        }
        public visit_where(clause: JWhere): any {
            return [clause.condition];
        }
        public visit_typeRef(type: JTypeRef): any { return []; }
        public visit_placeholder(p: JPlaceholder): any { return []; }
        public visit_page(p: JPage): any {
            return p.initBody.concat(p.displayBody);
        }
        public visit_event(e: JEvent): any { return e.body; }
        public visit_libAction(la: JLibAction): any { return []; }
        public visit_art(art: JArt): any { return []; }
        public visit_data(data: JData): any { return []; }
        public visit_library(lib: JLibrary): any { return []; }
        public visit_typeBinding(type: JTypeBinding): any { return []; }
        public visit_actionBinding(action: JActionBinding): any { return []; }
        public visit_resolveClause(r: JResolveClause): any { return []; }
        public visit_record(r: JRecord): any { return []; }
        public visit_recordField(rf: JRecordField): any { return []; }
        public visit_recordKey(rk: JRecordKey): any { return []; }
        public visit_app(app: JApp): any { return app.decls; }
        public visit_propertyParameter(p: JPropertyParameter): any { return []; }
        public visit_property(p: JProperty): any { return []; }
        public visit_typeDef(td: JTypeDef): any { return []; }
        public visit_apis(apis: JApis): any { return []; }

    }


    export interface IResolver {

        resolve(prop: JPropertyRef): JProperty;
        resolveProp(parent:string, name:string): JProperty;

        returnType(prop: JProperty): string;
    }


    export class WebAPIResolver implements IResolver {

        private apiCache = {};

        constructor(private apis: JApis) {
            apis.types.forEach((t) => {
                var tmap = {};
                this.apiCache[t.name] = tmap;
                t.properties.forEach((p) => {
                    tmap[p.name] = p;
                });
            });
        }

        public resolve(propref: JPropertyRef): JProperty {
            return this.resolveProp(<any>propref.parent, propref.name);
        }

        public resolveProp(parent: string, name: string): JProperty {
            var type = this.apiCache[parent];
            if (type) {
                var prop = type[name];
                return prop;
            }
            return null;
        }

        public returnType(prop: JProperty): string {
            return <any>prop.result.type;
        }

    }

    export interface IScriptResolver {
        dataType(id: JNodeRef): string;
        artType(id: JNodeRef): string;
        action(id: JNodeRef): JActionBase;
        asRecord(propref: JPropertyRef): JRecord;
        resolve(propref: JPropertyRef): JProperty;
        resolveProp(parent: string, name: string): JProperty;
        returnType(prop: JProperty): string;
    }

    export class ScriptResolver implements IScriptResolver {
        constructor(private apis: IResolver) {
        }

        private currentIds;

        public setCurrentScript(script: JApp) {
            this.currentIds = {};

            script.decls.forEach(decl => {
                if (decl.nodeType == "data") {
                    var d = <JData>decl;
                    this.currentIds[d.id] = d.type;
                }
                else if (decl.nodeType == "art") {
                    var art = <JArt>decl;
                    this.currentIds[art.id] = art.type;
                }
                else if (decl.nodeType == "action") {
                    this.addAction(<JAction>decl);
                }
                else if (decl.nodeType == "page") {
                    var p = <JPage>decl;
                    this.addAction(p);
                }
                else if (decl.nodeType == "library") {
                    var lib = <JLibrary>decl;
                    lib.exportedActions.forEach(a => this.addAction(a));
                }
                else if (decl.nodeType == "record") {
                    var rec = <JRecord>decl;
                    this.currentIds[rec.name] = rec;
                }
            });
        }

        private addAction(a: JActionBase) {
            this.currentIds[a.id] = a;
        }

        public dataType(id: JNodeRef): string {
            return this.currentIds[<any>id];
        }
        public artType(id: JNodeRef): string {
            return this.currentIds[<any>id];
        }

        public action(id: JNodeRef): JActionBase {
            return this.currentIds[<any>id];
        }

        public asRecord(propref: JPropertyRef): JRecord {
            var rec = <JRecord>this.currentIds[<any>propref.parent];
            if (rec && rec.nodeType == "record") {
                return rec;
            }
            return null;
        }

        public resolve(propref: JPropertyRef): JProperty {
            if (propref.declId) {
                var cand = this.currentIds[<any>propref.declId];
                if (cand) {
                    // TODO:
                }
            }
            return this.apis.resolve(propref);
        }

        public resolveProp(parent: string, name: string): JProperty {
            return this.apis.resolveProp(parent, name);
        }

        public returnType(prop: JProperty): string {
            return <any>prop.result.type;
        }

        public normalizeType(type: string): string {
            if (type && type.indexOf('{') >= 0) return "UserRecord";

            var rec = <JRecord>this.currentIds[type];
            if (rec && rec.nodeType == "record") {
                return "UserRecord";
            }
            if (type.length > 6) {
                var end = type.slice(type.length - 6);
                if (end == " index") {
                    return this.normalizeType(type.slice(0, type.length - 6));
                }
                if (end == " table") {
                    return this.normalizeType(type.slice(0, type.length - 6));
                }
                if (type.length > 11) {
                    end = type.slice(type.length - 10);
                    if (end == " decorator") {
                        return this.normalizeType(type.slice(0, type.length - 10)) + " decorator";
                    }
                }

            }
            return type;
        }

    }

}
