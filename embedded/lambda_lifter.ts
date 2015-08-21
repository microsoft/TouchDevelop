///<reference path='refs.ts'/>

module TDev {

  export module Embedded {

    import J = AST.Json
    import H = Helpers

    function extend (e: string[], x: string) {
      e.push(x);
    }

    function contains (e: string[], x: string) {
      return e.indexOf(x) >= 0;
    }

    class Lifter extends JsonAstVisitor<string[], void> {

      public as: J.JInlineAction[] = [];

      public visitMany(e, ss: J.JNode[]) {
        ss.forEach((x) => this.visit(e, x));
      }

      // That's where we do the in-place modification.
      public visit(env, e: J.JNode) {
        if (e.nodeType == "inlineActions") {
          var e1 = <J.JInlineActions> e;
          var lifted: string[] = [];
          e1.actions.forEach((a: J.JInlineAction) => {
            try {
              this.visit([], a);
              this.as.push(a);
              lifted.push(a.reference.id);
            } catch (e) {
              // Can't lift because it captures variables.
            }
          });
          e1.actions = e1.actions.filter((a: J.JInlineAction) => lifted.indexOf(a.reference.id) < 0);
          e1.expr.locals = e1.expr.locals.filter((l: J.JLocalDef) => lifted.indexOf(l.id) < 0);
          if (e1.actions.length == 0)
            e.nodeType = "exprStmt";
        } else {
          super.visit(env, e);
        }
      }

      // [InlineActions] are just at the level of statements.
      public visitExpr(env, e: J.JNode) {
      }

      public visitExprStmt(env, expr: J.JExprHolder) {
        this.visit(env, expr);
      }

      public visitExprHolder(env, locals: J.JLocalDef[], tree: J.JExpr, tokens: J.JToken[]) {
        locals.forEach((x: J.JLocalDef) => extend(env, x.id));
        tokens.forEach((x: J.JToken) => {
          if (x.nodeType == "localRef" && !contains(env, <any> (<J.JLocalRef> x).localId))
            throw {};
        });
      }

      public visitContinue(env) {
      }

      public visitReturn(env) {
      }

      public visitBreak(env) {
      }

      public visitInlineActions(env, e: J.JExprHolder, actions: J.JInlineAction[]) {
        this.visit(env, e);
        this.visitMany(env, actions);
      }

      public visitInlineAction(env, r, i, o, body: J.JStmt[]) {
        var e = [];
        i.forEach((x: J.JLocalDef) => extend(e, x.id));
        o.forEach((x: J.JLocalDef) => extend(e, x.id));
        this.visitMany(e, body);
      }

      public visitWhile(env, cond, body: J.JStmt[]) {
        this.visitMany(env, body);
      }

      public visitIf(env, cond, thenBranch: J.JStmt[], elseBranch: J.JStmt[], isElseIf) {
        this.visitMany(env, thenBranch);
        this.visitMany(env, elseBranch || []);
      }

      public visitFor(env, index, bound, body: J.JStmt[]) {
        extend(env, index.id);
        this.visitMany(env, body);
      }

      public visitComment(env, c) {
      }

      public visitAction(
        env,
        name: string,
        id: string,
        inParams: J.JLocalDef[],
        outParams: J.JLocalDef[],
        body: J.JStmt[],
        isPrivate: boolean)
      {
        if (H.isShimBody(body) == null) {
          // No shim <==> function we compile
          var e = [];
          inParams.forEach((x: J.JLocalDef) => extend(e, x.id));
          // Out-params are assignable, hence in scope.
          outParams.forEach((x: J.JLocalDef) => extend(e, x.id));
          this.visitMany(e, body);
        }
      }

      public visitLibrary(env, name) {
      }

      public visitApp(e, decls: J.JDecl[]) {
        this.visitMany(e, decls);
      }

      public visitGlobalDef(e, n, t) {
      }

      public visitRecord(e, n, k, f) {
      }
    }

    // This function modifies in-place the AST it visits to lift all closures
    // (a.k.a. [JInlineAction]'s) out into top-level function definitions
    // (a.k.a. [JAction]'s). It assumes that these closures contain no free
    // variables, i.e. that closure-conversion has been performed already.
    export function lift(a: J.JApp) {
      var l = new Lifter();
      l.visit([], a);
      var lambdas = l.as.map((a: J.JInlineAction): J.JAction => {
        var name = a.reference.name;
        return {
          nodeType: "action",
          id: a.reference.id,
          // The name needs to be unique, since it's going to be generated as a
          // global (whose names are kept "as is"). So cram in the unique-id in
          // there.
          name: name+a.reference.id,
          inParameters: a.inParameters,
          outParameters: a.outParameters,
          isPrivate: false,
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
