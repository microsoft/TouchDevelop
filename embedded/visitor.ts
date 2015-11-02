///<reference path='refs.ts'/>

module TDev {

  export module Embedded {

    import J = AST.Json

    export class JsonAstVisitor<T, U> {
      public visit(env: T, n: J.JNode): U {
          switch (n.nodeType) {
            case "numberLiteral":
              return this.visitNumberLiteral(env, (<J.JNumberLiteral> n).value);
            case "booleanLiteral":
              return this.visitBooleanLiteral(env, (<J.JBooleanLiteral> n).value);
            case "stringLiteral":
              return this.visitStringLiteral(env, (<J.JStringLiteral> n).value);
            case "operator":
              return this.visitOperator(env, (<J.JOperator> n).op);
            case "propertyRef":
              var n9 = <J.JPropertyRef> n;
              return this.visitPropertyRef(env, n9.name, <any> n9.parent);
            case "call":
              var n10 = <J.JCall> n;
              return this.visitCall(env, n10.name, n10.args, n10.typeArgs, n10.parent, n10.callType);
            case "singletonRef":
              return this.visitSingletonRef(env, (<J.JSingletonRef> n).name);
            case "globalDef":
              var n13 = <J.JGlobalDef> n;
              return this.visitGlobalDef(env, n13.name, n13.type, n13.comment);
            case "localDef":
              var n1 = <J.JLocalDef> n;
              return this.visitLocalDef(env, n1.name, n1.id, n1.type, n1.isByRef);
            case "localRef":
              var n11 = <J.JLocalRef> n;
              return this.visitLocalRef(env, n11.name, <any> n11.localId);
            case "exprHolder":
              var n16 = <J.JExprHolder> n;
              return this.visitExprHolder(env, n16.locals, n16.tree, n16.tokens);
            case "exprStmt":
              var ex = <J.JExprStmt> n;
              var tr = ex.expr.tree;
              // I don't understand why we skip the JExprHolder node here. I
              // assume that the JExprHolder node is useless in case the
              // "expression" is a return node? Is that meant to signify that
              // this is a hack to avoid adding new varieties of statements?
              switch (tr.nodeType) {
                case "show":
                  var nshow = <J.JShow> tr;
                  return this.visitShow(env, nshow.expr);
                case "break":
                  return this.visitBreak(env);
                case "continue":
                  return this.visitContinue(env);
                case "return":
                  var nret = <J.JReturn> tr;
                  return this.visitReturn(env, nret.expr);
                default:
                  return this.visitExprStmt(env, ex.expr);
              }
            case "inlineActions":
              var n8 = <J.JInlineActions> n;
              return this.visitInlineActions(env, n8.expr, n8.actions);
            case "while":
              var n3 = <J.JWhile> n;
              return this.visitWhile(env, n3.condition, n3.body);
            case "for":
              var n4 = <J.JFor> n;
              return this.visitFor(env, n4.index, n4.bound, n4.body);
            case "comment":
              return this.visitComment(env, (<J.JComment> n).text);
            case "if":
              var n5 = <J.JIf> n;
              return this.visitIf(env, n5.condition, n5.thenBody, n5.elseBody, n5.isElseIf);
            case "inlineAction":
              var n6 = <J.JInlineAction> n;
              return this.visitInlineAction(env, n6.reference, n6.inParameters, n6.outParameters, n6.body);
            case "action":
              var n7 = <J.JAction> n;
              return this.visitAction(env, n7.name, n7.id, n7.inParameters, n7.outParameters, n7.body, n7.isPrivate);
            case "app":
              return this.visitApp(env, (<J.JApp> n).decls);
            case "library":
              return this.visitLibrary(env, (<J.JLibrary> n).scriptName);
            case "art":
              var n12 = <J.JArt> n;
              return this.visitArt(env, n12.name, n12.type, n12.url, n12.comment);
            case "data":
              var n14 = <J.JData> n;
              return this.visitData(env, n14.name, n14.type, n14.comment);
            case "record":
              var n15 = <J.JRecord> n;
              return this.visitRecord(env, n15.name, n15.keys, n15.fields, n15.isExported);
          }
          throw new Error("Unsupported node: "+n.nodeType);
      }

      public visitNumberLiteral(env: T, v: number): U                     { throw new Error("Not implemented"); }
      public visitStringLiteral(env: T, v: string): U                     { throw new Error("Not implemented"); }
      public visitBooleanLiteral(env: T, v: boolean): U                   { throw new Error("Not implemented"); }
      public visitOperator(env: T, op: string): U                         { throw new Error("Not implemented"); }
      public visitPropertyRef(
        env: T,
        name: string,
        parent: string): U                                                { throw new Error("Not implemented"); }
      public visitCall(
        env: T,
        name: string,
        args: J.JExpr[],
        typeArgs: J.JTypeRef[],
        parent: J.JTypeRef,
        callType: string): U                                              { throw new Error("Not implemented"); }
      public visitSingletonRef(env: T, name: string): U                   { throw new Error("Not implemented"); }
      public visitLocalDef(
        env: T,
        name: string,
        id: string,
        type: J.JTypeRef,
        isByRef: boolean): U                                              { throw new Error("Not implemented"); }
      public visitLocalRef(env: T, name: string, id: string): U           { throw new Error("Not implemented"); }
      public visitExprHolder(
        env: T,
        locals: J.JLocalDef[],
        expr: J.JExpr,
        tokens: J.JToken[]): U                                            { throw new Error("Not implemented"); }
      public visitExprStmt(env: T, expr: J.JExpr): U                      { throw new Error("Not implemented"); }
      public visitReturn(env: T, expr: J.JExpr): U                        { throw new Error("Not implemented"); }
      public visitShow(env: T, expr: J.JExpr): U                          { throw new Error("Not implemented"); }
      public visitBreak(env: T): U                                        { throw new Error("Not implemented"); }
      public visitContinue(env: T): U                                     { throw new Error("Not implemented"); }
      public visitInlineActions(
        env: T,
        expr: J.JExprHolder,
        actions: J.JInlineAction[]): U                                    { throw new Error("Not implemented"); }
      public visitWhile(env: T, cond: J.JExprHolder, body: J.JStmt[]): U  { throw new Error("Not implemented"); }
      public visitFor(
        env: T,
        index: J.JLocalDef,
        bound: J.JExprHolder,
        body: J.JStmt[]): U                                               { throw new Error("Not implemented"); }
      public visitComment(env: T, c: string): U                           { throw new Error("Not implemented"); }
      public visitIf(
        env: T,
        cond: J.JExprHolder,
        thenBranch: J.JStmt[],
        elseBranch: J.JStmt[],
        isElseIf: boolean): U                                             { throw new Error("Not implemented"); }
      public visitInlineAction(env: T,
        reference: J.JLocalDef,
        inParams: J.JLocalDef[],
        outParams: J.JLocalDef[],
        body: J.JStmt[]): U                                               { throw new Error("Not implemented"); }
      public visitAction(
        env: T,
        name: string,
        id: string,
        inParams: J.JLocalDef[],
        outParams: J.JLocalDef[],
        body: J.JStmt[],
        isPrivate: boolean): U                                            { return this.visitDecl(env, name); }
      public visitApp(env: T, decls: J.JDecl[]): U                        { throw new Error("Not implemented"); }
      public visitLibrary(env: T, name: string): U                        { return this.visitDecl(env, name); }
      public visitArt(
        env: T,
        name: string,
        type: J.JTypeRef,
        url: string,
        comment: string): U                                               { return this.visitGlobalDef(env, name, type, comment); }
      public visitData(
        env: T,
        name: string,
        type: J.JTypeRef,
        comment: string): U                                               { return this.visitGlobalDef(env, name, type, comment); }
      public visitGlobalDef(
        env: T,
        name: string,
        type: J.JTypeRef,
        comment: string): U                                               { return this.visitDecl(env, name); }
      public visitRecord(
        env: T,
        name: string,
        keys: J.JRecordKey[],
        fields: J.JRecordField[],
        isExported: boolean): U                                           { return this.visitDecl(env, name); }
      public visitDecl(
        env: T,
        name: string): U                                                  { throw new Error("Not implemented"); }
    }
  }

}

// vim: set ts=2 sw=2 sts=2:
