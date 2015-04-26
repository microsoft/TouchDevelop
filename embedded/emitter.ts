///<reference path='refs.ts'/>

module TDev {

  export module Embedded {

    import J = AST.Json
    import H = Helpers

    // --- Environments

    export interface EmitterEnv {
      indent: string;
    }

    export var emptyEnv: EmitterEnv = {
      indent: "",
    };

    function indent(e: EmitterEnv) {
      return {
        indent: e.indent + "  ",
      };
    }


    // --- Pattern-matching.
    // Because there's no pattern-matching in TypeScript, these slightly
    // cumbersome functions match on the node types, and either return [null] or
    // the thing we were looking for. The pattern is written as a comment to the
    // function.

    // JCall { args: [ JSingletonRef { name = ♻ } ], name = NAME } -> NAME
    function isLibrary(e: J.JExpr): string {
      return (
        e.nodeType == "call" &&
        (<J.JCall> e).args[0].nodeType == "singletonRef" &&
        (<J.JSingletonRef> (<J.JCall> e).args[0]).name == H.librarySymbol &&
        (<J.JCall> e).name || null
      );
    }

    // JSingletonRef { name = "code" } -> true
    function isScopedCall(e: J.JExpr): boolean {
      return (
        e.nodeType == "singletonRef" &&
        (<J.JSingletonRef> e).name == "code" || null
      );
    }

    // [ JExprStmt { expr: JExprHolder { tree: JStringLiteral { value: VALUE }}}, ... ] -> VALUE
    function isShimBody(body: J.JStmt[]): string {
      var nonComments = body.filter((x: J.JStmt) => x.nodeType != "comment");
      // If only we had that wonderful thing called pattern-matching...
      var value =
        nonComments.length &&
        nonComments[0].nodeType == "exprStmt" &&
        (<J.JExprStmt> nonComments[0]).expr.nodeType == "exprHolder" &&
        (<J.JExprHolder> (<J.JExprStmt> nonComments[0]).expr).tree.nodeType == "stringLiteral" &&
        (<J.JStringLiteral> (<J.JExprHolder> (<J.JExprStmt> nonComments[0]).expr).tree).value;
      var matches = value && value.match(/^shim:(.*)/);
      if (matches)
        return matches[1];
      else
        return null;
    }

    // JStringLiteral { value: VALUE } -> VALUE
    function isStringLiteral(x: J.JNode) {
      return x.nodeType == "stringLiteral" && (<J.JStringLiteral> x).value || null;
    }


    // --- Helper functions.
    // For constructing / modifying AST nodes.

    function mkNumberLiteral (x: number): J.JNumberLiteral {
      return {
        nodeType: "numberLiteral",
        id: null,
        value: x
      };
    }

    function mangleLibraryName(l, n) {
      return H.mangleName(l)+"_"+H.mangleName(n);
    }

    // Rewrites arguments for some selected C++ functions. For instance, as we
    // don't have enums, the constant string "left" needs to be translated into
    // the right number constant.
    function translateArgsIfNeeded(call: string, args: J.JExpr[]) {
      switch (call) {
        case "embedded_button_pressed":
          if (isStringLiteral(args[0]) == "left")
            return [mkNumberLiteral(1)];
          else if (isStringLiteral(args[0]) == "right")
            return [mkNumberLiteral(2)];
          throw new Error(call+": unknown button");
      }
      return args;
    }


    // --- The code emitter.

    export class Emitter extends JsonAstVisitor<EmitterEnv, string> {

      // Output "parameters", written to at the end.
      public prototypes = "";
      public code = "";

      // All the libraries needed to compile this [JApp].
      constructor(
        private libRef: J.JCall,
        private libs: J.JApp[]
      ) {
        super();
      }

      public visitMany(e: EmitterEnv, ss: J.JNode[]) {
        var code = [];
        ss.forEach((s: J.JNode) => { code.push(this.visit(e, s)) });
        return code.join("\n");
      }

      public visitComment(env: EmitterEnv, c: string) {
        return "// "+c.replace("\n", "\n"+env.indent+"// ");
      }

      public visitExprStmt(env: EmitterEnv, expr: J.JExpr) {
        return env.indent + this.visit(env, expr)+";";
      }

      public visitExprHolder(env: EmitterEnv, expr: J.JExprHolder) {
        return this.visit(env, expr);
      }

      public visitLocalRef(env: EmitterEnv, name: string, id: string) {
        // In our translation, referring to a TouchDevelop identifier never
        // requires adding a reference operator (&). Things passed by reference
        // are either:
        // - function pointers (a.k.a. "handlers" in TouchDevelop lingo), for
        //   which C and C++ accept both "f" and "&f" (we hence use the former)
        // - arrays, strings, user-defined objects, which are in fact of type
        //   "shared_ptr<T>", no "&" operator here.
        return H.mangle(name, id);
      }

      public visitLocalDef(env: EmitterEnv, name: string, id: string, type: J.JTypeRef) {
        return H.mkType(type)+" "+H.mangle(name, id);
      }

      public visitStringLiteral(env: EmitterEnv, s: string) {
        return '"'+s.replace(/"\\/, c => {
          if (c == '"') return '\\"';
          if (c == '\\') return '\\\\';
        }) + '"';
      }

      public visitNumberLiteral(env: EmitterEnv, n: number) {
        return n+"";
      }

      public visitBooleanLiteral(env: EmitterEnv, b: boolean) {
        return b+"";
      }

      public visitWhile(env: EmitterEnv, cond: J.JExprHolder, body: J.JStmt[]) {
        var condCode = this.visit(env, cond);
        var bodyCode = this.visitMany(indent(env), body);
        return env.indent + "while ("+condCode+") {\n" + bodyCode + "\n" + env.indent + "}";
      }

      public visitFor(env: EmitterEnv, index: J.JLocalDef, bound: J.JExprHolder, body: J.JStmt[]) {
        var indexCode = this.visit(env, index) + " = 1";
        var testCode = H.mangleDef(index) + " <= " + this.visit(env, bound);
        var incrCode = "++"+H.mangleDef(index);
        var bodyCode = this.visitMany(indent(env), body);
        return (
          env.indent + "for ("+indexCode+"; "+testCode+"; "+incrCode+") {\n" +
            bodyCode + "\n" +
          env.indent + "}"
        );
      }

      public visitIf(
          env: EmitterEnv,
          cond: J.JExprHolder,
          thenBranch: J.JStmt[],
          elseBranch: J.JStmt[],
          isElseIf: boolean)
      {
        return [
          env.indent, isElseIf ? "else " : "", "if (" + this.visit(env, cond) + "){\n",
          this.visitMany(indent(env), thenBranch) + "\n",
          env.indent, "}",
          elseBranch ? " else {\n" : "",
          elseBranch ? this.visitMany(indent(env), elseBranch) + "\n": "",
          elseBranch ? env.indent + "}" : ""
        ].join("");
      }

      private resolveCall(receiver: J.JExpr, name: string) {
        // Is this a call in the current scope?
        var scoped = isScopedCall(receiver);
        if (scoped)
          if (this.libRef)
            // If compiling a library, no scope actually means the library's scope.
            return this.resolveCall(this.libRef, name);
          else
            // Call to a function from the current script.
            return H.mangleName(name);

        // Is this a call to a library?
        var n = isLibrary(receiver);
        if (n) {
          // I expect all libraries and all library calls to be properly resolved.
          var lib = this.libs.filter(l => l.name == n)[0];
          var action = lib.decls.filter((d: J.JDecl) => d.name == name)[0];
          var s = isShimBody((<J.JAction> action).body);
          if (s)
            // Call to a built-in C++ function
            return s;
          else
            // Actual call to a library function
            return mangleLibraryName(n, name);
        }

        // Something else (e.g. operator)
        return null;
      }

      public visitCall(env: EmitterEnv, name: string, args: J.JExpr[]) {
        var receiver = args[0];
        args = args.splice(1);

        var resolvedName = this.resolveCall(receiver, name);
        args = translateArgsIfNeeded(resolvedName, args);

        var mkCall = (f: string) => {
          var argsCode = args.map(a => this.visit(env, a));
          return f + "(" + argsCode.join(", ") + ")";
        };

        if (resolvedName)
          return mkCall(resolvedName);
        else if (name == ":=")
          return this.visit(env, receiver) + " = " + this.visit(env, args[0]);
        else
          throw new Error("Unknown call: "+name);
      }

      private mangleActionName(n: string) {
        if (this.libRef)
          return mangleLibraryName(this.libRef.name, n);
        else
          return H.mangleName(n);
      }

      public visitAction(
        env: EmitterEnv,
        name: string,
        inParams: J.JLocalDef[],
        outParams: J.JLocalDef[],
        body: J.JStmt[])
      {
        if (outParams.length > 1)
          throw new Error("Not supported (multiple return parameters)");
        if (isShimBody(body))
          return null;

        var env2 = indent(env);
        var bodyText = [
          outParams.length ? env2.indent + this.visit(env2, outParams[0]) + ";" : "",
          this.visitMany(env2, body),
          outParams.length ? env2.indent + H.mkReturn(H.mangleDef(outParams[0])) : "",
        ].filter(x => x != "").join("\n");
        var head = H.mkSignature(this.mangleActionName(name), inParams, outParams);
        return head + " {\n" + bodyText + "\n}";
      }

      public visitApp(e: EmitterEnv, decls: J.JDecl[]) {
        // We need forward declarations for all functions (they're,
        // by default, mutually recursive in TouchDevelop).
        var forwardDeclarations = decls.map((f: J.JDecl) => {
          if (f.nodeType == "action" && !isShimBody((<J.JAction> f).body))
            return H.mkSignature(this.mangleActionName(f.name), (<J.JAction> f).inParameters, (<J.JAction> f).outParameters)+";";
          else
            return null;
        }).filter(x => x != null);

        // Compile all the top-level functions.
        var userFunctions = decls.map((d: J.JDecl) => {
          if (d.nodeType == "action") {
            return this.visit(e, d);
          } else if (!(d.nodeType == "library" && d.name == "embedded")) {
            throw new Error("Untranslated declaration" + d);
          }
          return null;
        }).filter(x => x != null);

        // By convention, because we're forced to return a string, write the
        // output parameters in the member variables.
        this.prototypes = forwardDeclarations.join("\n");
        this.code = userFunctions.join("\n");

        return forwardDeclarations.concat(userFunctions).join("\n");
      }
    }
  }
}

// vim: set ts=2 sw=2 sts=2:
