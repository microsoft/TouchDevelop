module TDev {

    export module Microbit {

        export class JsonAstVisitor<T, U> {
            public visitNodeRef(env: T, n: JNodeRef): U { throw "Not implemented" }
            public visitTypeRef(env: T, n: JTypeRef): U { throw "Not implemented"; }
            public visitGenericTypeInstance(env: T, n: JGenericTypeInstance): U { return this.visitTypeRef(n); }
            public visitUserType(env: T, n: JUserType): U { return this.visitTypeRef(n); }
            public visitLibraryType(env: T, n: JLibraryType): U { return this.visitUserType(n); }
            public visitNode(env: T, n: JNode): U { throw "Not implemented"; }
            public visitDecl(env: T, n: JDecl): U { return this.visitNode(n); }
            public visitToken(env: T, n: JToken): U { return this.visitNode(n); }
            public visitExpr(env: T, n: JExpr): U { return this.visitToken(n); }
            public visitOperator(env: T, n: JOperator): U { return this.visitToken(n); }
            public visitPropertyRef(env: T, n: JPropertyRef): U { return this.visitToken(n); }
            public visitStringLiteral(env: T, n: JStringLiteral): U { return this.visitExpr(n); }
            public visitBooleanLiteral(env: T, n: JBooleanLiteral): U { return this.visitExpr(n); }
            public visitNumberLiteral(env: T, n: JNumberLiteral): U { return this.visitExpr(n); }
            public visitLocalRef(env: T, n: JLocalRef): U { return this.visitExpr(n); }
            public visitPlaceholder(env: T, n: JPlaceholder): U { return this.visitExpr(n); }
            public visitSingletonRef(env: T, n: JSingletonRef): U { return this.visitExpr(n); }
            public visitCall(env: T, n: JCall): U { return this.visitExpr(n); }
            public visitExprHolder(env: T, n: JExprHolder): U { return this.visitNode(n); }
            public visitStmt(env: T, n: JStmt): U { return this.visitNode(n); }
            public visitComment(env: T, n: JComment): U { return this.visitStmt(n); }
            public visitFor(env: T, n: JFor): U { return this.visitStmt(n); }
            public visitForeach(env: T, n: JForeach): U { return this.visitStmt(n); }
            public visitCondition(env: T, n: JCondition): U { return this.visitNode(n); }
            public visitWhere(env: T, n: JWhere): U { return this.visitCondition(n); }
            public visitWhile(env: T, n: JWhile): U { return this.visitStmt(n); }
            public visitIf(env: T, n: JIf): U { return this.visitStmt(n); }
            public visitBoxed(env: T, n: JBoxed): U { return this.visitStmt(n); }
            public visitExprStmt(env: T, n: JExprStmt): U { return this.visitStmt(n); }
            public visitInlineActions(env: T, n: JInlineActions): U { return this.visitExprStmt(n); }
            public visitInlineAction(env: T, n: JInlineAction): U { return this.visitNode(n); }
            public visitOptionalParameter(env: T, n: JOptionalParameter): U { return this.visitNode(n); }
            public visitActionBase(env: T, n: JActionBase): U { return this.visitDecl(n); }
            public visitActionType(env: T, n: JActionType): U { return this.visitActionBase(n); }
            public visitAction(env: T, n: JAction): U { return this.visitActionBase(n); }
            public visitPage(env: T, n: JPage): U { return this.visitActionBase(n); }
            public visitEvent(env: T, n: JEvent): U { return this.visitActionBase(n); }
            public visitLibAction(env: T, n: JLibAction): U { return this.visitActionBase(n); }
            public visitLibAbstractType(env: T, n: JLibAbstractType): U { return this.visitDecl(n); }
            public visitLibActionType(env: T, n: JLibActionType): U { return this.visitActionBase(n); }
            public visitGlobalDef(env: T, n: JGlobalDef): U { return this.visitDecl(n); }
            public visitArt(env: T, n: JArt): U { return this.visitGlobalDef(n); }
            public visitData(env: T, n: JData): U { return this.visitGlobalDef(n); }
            public visitLibrary(env: T, n: JLibrary): U { return this.visitDecl(n); }
            public visitBinding(env: T, n: JBinding): U { return this.visitNode(n); }
            public visitTypeBinding(env: T, n: JTypeBinding): U { return this.visitBinding(n); }
            public visitActionBinding(env: T, n: JActionBinding): U { return this.visitBinding(n); }
            public visitResolveClause(env: T, n: JResolveClause): U { return this.visitNode(n); }
            public visitRecord(env: T, n: JRecord): U { return this.visitDecl(n); }
            public visitRecordField(env: T, n: JRecordField): U { return this.visitNode(n); }
            public visitRecordKey(env: T, n: JRecordKey): U { return this.visitRecordField(n); }
            public visitLocalDef(env: T, n: JLocalDef): U { return this.visitNode(n); }
            public visitApp(env: T, n: JApp): U { return this.visitNode(n); }
            public visitPropertyParameter(env: T, n: JPropertyParameter): U { throw "Not implemented"; }
            public visitProperty(env: T, n: JProperty): U { throw "Not implemented"; }
            public visitTypeDef(env: T, n: JTypeDef): U { throw "Not implemented"; }
            public visitApis(env: T, n: JApis): U { throw "Not implemented"; }
        }
    }

}
