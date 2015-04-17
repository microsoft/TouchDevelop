///<reference path='../refs.ts'/>

module TDev {

  export module Microbit {

    import J = AST.Json
    import H = Helpers

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

    function isLibrary(e: J.JExpr) {
      return (
        e.nodeType == "call" &&
        (<J.JCall> e).args[0].nodeType == "singletonRef" &&
        (<J.JSingletonRef> (<J.JCall> e).args[0]).name == H.librarySymbol &&
        (<J.JCall> e).name || null
      );
    }

    function isShimBody(body: J.JStmt[]) {
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

    function isStringLiteral(x: J.JNode) {
      return x.nodeType == "stringLiteral" && (<J.JStringLiteral> x).value || null;
    }

    function mkNumberLiteral (x: number): J.JNumberLiteral {
      return {
        nodeType: "numberLiteral",
        id: null,
        value: x
      };
    }

    // Rewrites arguments for some selected C++ functions. For instance, as we
    // don't have enums, the constant string "left" needs to be translated into
    // the right number constant.
    function translateArgsIfNeeded(call: string, args: J.JExpr[]) {
      switch (call) {
        case "microbit_button_pressed":
          if (isStringLiteral(args[0]) == "left")
            return [mkNumberLiteral(1)];
          else if (isStringLiteral(args[1]) == "right")
            return [mkNumberLiteral(2)];
          throw new Error(call+": unknown button");
      }
      return args;
    }

    export class Emitter extends JsonAstVisitor<EmitterEnv, string> {

      // Output "parameters", written to at the end.
      public prototypes = "";
      public code = "";

      // All the libraries needed to compile this [JApp].
      constructor(
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
          if (c == '"') return '\"';
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

      private lookupLibraryCall(receiver: J.JExpr, name: string) {
        var n = isLibrary(receiver);
        if (!n)
          return;
        // I expect all libraries and all library calls to be properly resolved.
        var lib = this.libs.filter(l => l.name == n)[0];
        var action = lib.decls.filter((d: J.JDecl) => d.name == name)[0];
        var s = isShimBody((<J.JAction> action).body);
        if (s) {
          return s;
        } else {
          // XXX most likely wrong
          return n + "_" + name;
        }
      }

      public visitCall(env: EmitterEnv, name: string, args: J.JExpr[]) {
        var receiver = args[0];
        args = args.splice(1);

        var mkCall = (f: string) => {
          var argsCode = args.map(a => this.visit(env, a));
          return f + "(" + argsCode.join(", ") + ")";
        };

        var resolvedName = this.lookupLibraryCall(receiver, name);
        args = translateArgsIfNeeded(resolvedName, args);

        if (resolvedName)
          return mkCall(resolvedName);
        else if (name == ":=")
          return this.visit(env, receiver) + " = " + this.visit(env, args[0]);
        else
          throw new Error("Unknown call: "+name);
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
        var head = H.mkSignature(name, inParams, outParams);
        return head + " {\n" + bodyText + "\n}";
      }

      public visitApp(e: EmitterEnv, decls: J.JDecl[]) {
        // We need forward declarations for all functions (they're,
        // by default, mutually recursive in TouchDevelop).
        var forwardDeclarations = decls.map((f: J.JDecl) => {
          if (f.nodeType == "action" && !isShimBody((<J.JAction> f).body))
            return H.mkSignature(f.name, (<J.JAction> f).inParameters, (<J.JAction> f).outParameters)+";";
          else
            return null;
        }).filter(x => x != null);

        // Compile all the top-level functions.
        var userFunctions = decls.map((d: J.JDecl) => {
          if (d.nodeType == "action") {
            return this.visit(e, d);
          } else if (!(d.nodeType == "library" && d.name == "microbit")) {
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
