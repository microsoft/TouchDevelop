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


    // --- The code emitter.

    export class Emitter extends JsonAstVisitor<EmitterEnv, string> {

      // Output "parameters", written to at the end.
      public prototypes = "";
      public code = "";
      public prelude = "";

      private libraryMap: { [id: string]: string } = {};

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

      public visitBreak(env: EmitterEnv) {
        return env.indent + "break;";
      }

      public visitContinue(env: EmitterEnv) {
        return env.indent + "continue;";
      }

      public visitShow(env: EmitterEnv, expr: J.JExpr) {
        // TODO hook this up to "post to wall" handling if any
        return env.indent + "serial.print(" + this.visit(env, expr) + ");";
      }

      public visitReturn(env: EmitterEnv, expr: J.JExpr) {
        return env.indent + H.mkReturn(this.visit(env, expr));
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
        return '"'+s.replace(/["\\\n]/g, c => {
          if (c == '"') return '\\"';
          if (c == '\\') return '\\\\';
          if (c == "\n") return '\\n';
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
        if (!receiver)
          return null;

        // Is this a call in the current scope?
        var scoped = H.isScopedCall(receiver);
        if (scoped)
          if (this.libRef)
            // If compiling a library, no scope actually means the library's scope.
            return this.resolveCall(this.libRef, name);
          else
            // Call to a function from the current script.
            return H.mangleName(name);

        // Is this a call to a library?
        var n = H.isLibrary(receiver);
        if (n) {
          // I expect all libraries and all library calls to be properly resolved.
          var lib = this.libs.filter(l => l.name == n)[0];
          var action = lib.decls.filter((d: J.JDecl) => d.name == name)[0];
          var s = H.isShimBody((<J.JAction> action).body);
          if (s)
            // Call to a built-in C++ function
            return s;
          else
            // Actual call to a library function
            return H.mangleLibraryName(n, name);
        }

        return null;
      }

      public visitCall(env: EmitterEnv,
        name: string,
        args: J.JExpr[],
        parent: J.JTypeRef,
        callType: string)
      {
        var mkCall = (f: string, skipReceiver: boolean) => {
          var actualArgs = skipReceiver ? args.slice(1) : args;
          var argsCode = actualArgs.map(a => {
            var k = H.isEnumLiteral(a);
            if (k)
              return k+"";
            else
              return this.visit(env, a)
          });
          return f + "(" + argsCode.join(", ") + ")";
        };

        // The [JCall] node has several, different, often unrelated purposes.
        // This function identifies (tentatively) the different cases and
        // compiles each one of them into something that makes sense.

        // 1) A call to a function, either in the current scope, or belonging to
        // a TouchDevelop library. Resolves to a C++ function call.
        var resolvedName = this.resolveCall(args[0], name);
        if (resolvedName)
          return mkCall(resolvedName, true);

        // 2) A call to the assignment operator on the receiver. C++ assignment.
        else if (name == ":=")
          return this.visit(env, args[0]) + " = " + this.visit(env, args[1]);

        // 3) Reference to a variable in the global scope. Not mangling the name
        // with the [id], since i) we don't have that id right and ii) globals
        // are unique (I think?).
        else if (args.length && H.isSingletonRef(args[0]) == "data")
          return this.mangleScopedName(name);

        // 4) Extension method, where p(x) is represented as x→ p. In case we're
        // actually referencing a function from a library, go through
        // [resolveCall] again, so that we find the shim if any.
        else if (callType == "extension") {
          var t = JSON.parse(<any> parent);
          var prefixedName = t.l
            ? this.resolveCall(H.mkLibraryRef(this.libraryMap[t.l]), name)
            : this.mangleScopedName(name);
          return mkCall(prefixedName, false);
        }

        // 5) Field access for an object.
        else if (callType == "field")
          return this.visit(env, args[0]) + "->" + H.mangleName(name);

        // 6) Reference to a built-in library method, e.g. Math→ max
        else if (args.length && H.isSingletonRef(args[0]))
          return H.isSingletonRef(args[0]) + "::" + mkCall(H.mangleName(name), true);

        // 7) Instance method (e.g. Number's > operator, for which the receiver
        // is the number itself)
        else
          return (<any> parent)+"::"+mkCall(H.mangleName(name), false);
      }

      public visitSingletonRef(e, n: string) {
        return n;
      }

      private mangleScopedName(n: string) {
        if (this.libRef)
          return H.mangleLibraryName(this.libRef.name, n);
        else
          return H.mangleName(n);
      }

      public visitGlobalDef(e: EmitterEnv, name: string, type: J.JTypeRef) {
        return e.indent + H.mkType(type) + " " + this.mangleScopedName(name) + ";";
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
        if (H.isShimBody(body))
          return null;

        var env2 = indent(env);
        var bodyText = [
          outParams.length ? env2.indent + this.visit(env2, outParams[0]) + ";" : "",
          this.visitMany(env2, body),
          outParams.length ? env2.indent + H.mkReturn(H.mangleDef(outParams[0])) : "",
        ].filter(x => x != "").join("\n");
        var head = H.mkSignature(this.mangleScopedName(name), inParams, outParams);
        return head + " {\n" + bodyText + "\n}";
      }

      // This function runs over all declarations. After execution, the three
      // member fields [prelude], [prototypes] and [code] are filled accordingly.
      public visitApp(e: EmitterEnv, decls: J.JDecl[]) {
        // Some parts of the emitter need to lookup library names by their id
        decls.forEach((x: J.JDecl) => {
          if (x.nodeType == "library") {
            var l: J.JLibrary = <J.JLibrary> x;
            this.libraryMap[l.id] = l.name;
          }
        });

        // We need forward declarations for all functions (they're,
        // by default, mutually recursive in TouchDevelop).
        var forwardDeclarations = decls.map((f: J.JDecl) => {
          if (f.nodeType == "action" && H.willCompile(<J.JAction> f))
            return H.mkSignature(this.mangleScopedName(f.name), (<J.JAction> f).inParameters, (<J.JAction> f).outParameters)+";";
          else if (f.nodeType == "data")
            return this.visit(e, f);
          else
            return null;
        }).filter(x => x != null);

        // Compile all the top-level functions.
        var userFunctions = decls.map((d: J.JDecl) => {
          if (d.nodeType == "action" && H.willCompile(<J.JAction> d)) {
            return this.visit(e, d);
          } else if (d.nodeType == "art" && d.name == "prelude.cpp") {
            this.prelude += (<J.JArt> d).value;
          } else {
            // The typical library has other stuff mixed in (pictures, other
            // resources) that are used, say, when running the simulator. Just
            // silently ignore these.
            return null;
          }
          return null;
        }).filter(x => x != null);

        // By convention, because we're forced to return a string, write the
        // output parameters in the member variables.
        this.prototypes = forwardDeclarations.join("\n");
        this.code = userFunctions.join("\n");

        // [embedded.ts] now reads the three member fields separately and
        // ignores this return value.
        return this.prelude + "\n" + forwardDeclarations.concat(userFunctions).join("\n");
      }
    }
  }
}

// vim: set ts=2 sw=2 sts=2:
