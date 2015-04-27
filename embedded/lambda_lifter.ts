///<reference path='refs.ts'/>

module TDev {

  export module Embedded {

    import J = AST.Json
    import H = Helpers

    class Lifter extends JsonAstVisitor<{}, J.JInlineAction[]> {

      public visitMany(e, ss: J.JNode[]) {
        return ss.reduce((as: J.JInlineAction[], s: J.JNode) => {
          return as.concat(this.visit({}, s));
        }, []);
      }

      // That's where we do the in-place modification.
      public visit(env, e: J.JNode) {
        var as = super.visit(env, e);
        if (e.nodeType == "inlineActions")
          e.nodeType = "exprStmt";
        return as;
      }

      // [InlineActions] are just at the level of statements.
      public visitExpr(env, e: J.JNode) {
        return [];
      }

      public visitExprStmt(env, expr) {
          return [];
      }

      public visitInlineActions(env, e: J.JExpr, actions: J.JInlineAction[]) {
        // No need to visit [e], as expressions do not contain [JInlineActions].
        return this.visitMany(env, actions).concat(actions);
      }

      public visitInlineAction(env, r, i, o, body: J.JStmt[]) {
        return this.visitMany(env, body);
      }

      public visitWhile(env, cond, body: J.JStmt[]) {
          return this.visitMany(env, body);
      }

      public visitIf(env, cond, thenBranch: J.JStmt[], elseBranch: J.JStmt[], isElseIf) {
        return this.visitMany(env, thenBranch).concat(this.visitMany(env, elseBranch || []));
      }

      public visitFor(env, index, bound, body: J.JStmt[]) {
          return this.visitMany(env, body);
      }

      public visitComment(env, c) {
        return [];
      }

      public visitAction(
        env,
        name: string,
        inParams: J.JLocalDef[],
        outParams: J.JLocalDef[],
        body: J.JStmt[])
      {
        return this.visitMany(env, body);
      }

      public visitLibrary(env, name) {
        return [];
      }

      public visitApp(e, decls: J.JDecl[]) {
        return this.visitMany(e, decls);
      }
    }

    // This function modifies in-place the AST it visits to lift all closures
    // (a.k.a. [JInlineAction]'s) out into top-level function definitions
    // (a.k.a. [JAction]'s). It assumes that these closures contain no free
    // variables, i.e. that closure-conversion has been performed already.
    export function lift(a: J.JApp) {
      var lambdas = (new Lifter()).visit({}, a).map((a: J.JInlineAction): J.JAction => {
        var name = H.mangleDef(a.reference);
        return {
          nodeType: "action",
          id: a.id,
          name: name,
          inParameters: a.inParameters,
          outParameters: a.outParameters,
          isPrivate: true,
          isOffline: false,
          isQuery: false,
          isTest: false,
          isAsync: false,
          description: "",
          body: a.body
        };
      });
      Array.prototype.push.apply(a.decls, lambdas);
    }
  }
}

// vim: set ts=2 sw=2 sts=2:
