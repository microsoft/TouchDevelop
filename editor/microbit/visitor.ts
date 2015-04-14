///<reference path='../refs.ts'/>

module TDev {

  export module Microbit {

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
              return this.visitCall(env, n10.name, n10.args);
            case "singletonRef":
              return this.visitSingletonRef(env, (<J.JSingletonRef> n).name);
            case "localDef":
              var n1 = <J.JLocalDef> n;
              return this.visitLocalDef(env, n1.name, <any> n1.type, n1.id);
            case "localRef":
              var n11 = <J.JLocalRef> n;
              return this.visitLocalRef(env, n11.name, <any> n11.localId);
            case "exprHolder":
              return this.visitExprHolder(env, (<J.JExprHolder> n).tree);
            case "exprStmt":
              return this.visitExprStmt(env, (<J.JExprStmt> n).expr);
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
              return this.visitAction(env, n7.name, n7.inParameters, n7.outParameters, n7.body);
            case "app":
              return this.visitApp(env, (<J.JApp> n).decls);
            case "library":
              return this.visitLibrary(env, (<J.JLibrary> n).scriptName);
          }
          throw "Unsupported node: "+n.nodeType;
      }

      public visitNumberLiteral(env: T, v: number): U                     { throw "Not implemented"; }
      public visitStringLiteral(env: T, v: string): U                     { throw "Not implemented"; }
      public visitBooleanLiteral(env: T, v: boolean): U                   { throw "Not implemented"; }
      public visitOperator(env: T, op: string): U                         { throw "Not implemented"; }
      public visitPropertyRef(
        env: T,
        name: string,
        parent: string): U                                                { throw "Not implemented"; }
      public visitCall(env: T, name: string, args: J.JExpr[]): U          { throw "Not implemented"; }
      public visitSingletonRef(env: T, name: string): U                   { throw "Not implemented"; }
      public visitLocalDef(
        env: T,
        name: string,
        id: string,
        type: string): U                                                  { throw "Not implemented"; }
      public visitLocalRef(env: T, name: string, id: string): U           { throw "Not implemented"; }
      public visitExprHolder(env: T, expr: J.JExpr): U                    { throw "Not implemented"; }
      public visitExprStmt(env: T, expr: J.JExpr): U                      { throw "Not implemented"; }
      public visitInlineActions(
        env: T,
        expr: J.JExpr,
        actions: J.JInlineAction[]): U                                    { throw "Not implemented"; }
      public visitWhile(env: T, cond: J.JExprHolder, body: J.JStmt[]): U  { throw "Not implemented"; }
      public visitFor(
        env: T,
        index: J.JLocalDef,
        bound: J.JExprHolder,
        body: J.JStmt[]): U                                               { throw "Not implemented"; }
      public visitComment(env: T, c: string): U                           { throw "Not implemented"; }
      public visitIf(
        env: T,
        cond: J.JExprHolder,
        thenBranch: J.JStmt[],
        elseBranch: J.JStmt[],
        isElseIf: boolean): U                                             { throw "Not implemented"; }
      public visitInlineAction(env: T,
        reference: J.JLocalDef,
        inParams: J.JLocalDef[],
        outParams: J.JLocalDef[],
        body: J.JStmt[]): U                                               { throw "Not implemented"; }
      public visitAction(
        env: T,
        name: string,
        inParams: J.JLocalDef[],
        outParams: J.JLocalDef[],
        body: J.JStmt[]): U                                               { throw "Not implemented"; }
      public visitApp(env: T, decls: J.JDecl[]): U                        { throw "Not implemented"; }
      public visitLibrary(env: T, name: string): U                        { throw "Not implemented"; }
    }
  }

}

// vim: set ts=2 sw=2 sts=2:
