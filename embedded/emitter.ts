///<reference path='refs.ts'/>

module TDev {

  export module Embedded {

    import J = AST.Json
    import H = Helpers

    // --- Environments

    export interface EmitterEnv extends H.Env {
      indent: string;
    }

    export function emptyEnv(): EmitterEnv {
      return {
        indent: "",
        ident_of_id: {},
        id_of_ident: {},
      };
    }

    export function indent(e: EmitterEnv) {
      return {
        indent: e.indent + "  ",
        ident_of_id: e.ident_of_id,
        id_of_ident: e.id_of_ident,
      };
    }


    // --- The code emitter.

    export class Emitter extends JsonAstVisitor<EmitterEnv, string> {

      // Output "parameters", written to at the end.
      public prototypes = "";
      public code = "";
      public prelude = "";

      private libraryMap: H.LibMap = {};

      private imageLiterals = [];

      // All the libraries needed to compile this [JApp].
      constructor(
        private libRef: J.JCall,
        public libName: string,
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
        return env.indent+"// "+c.replace("\n", "\n"+env.indent+"// ");
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

      public visitExprHolder(env: EmitterEnv, locals: J.JLocalDef[], expr: J.JExprHolder) {
        var decls = locals.map(d => {
          var x = H.defaultValueForType(this.libraryMap, d.type);
          return this.visit(env, d) + (x ? " = " + x : "") + ";";
        });
        return decls.join("\n"+env.indent) +
          (decls.length ? "\n" + env.indent : "") +
          this.visit(env, expr);
      }

      public visitLocalRef(env: EmitterEnv, name: string, id: string) {
        // In our translation, referring to a TouchDevelop identifier never
        // requires adding a reference operator (&). Things passed by reference
        // are either:
        // - function pointers (a.k.a. "handlers" in TouchDevelop lingo), for
        //   which C and C++ accept both "f" and "&f" (we hence use the former)
        // - arrays, strings, user-defined objects, which are in fact of type
        //   "shared_ptr<T>", no "&" operator here.
        return H.mangleUnique(env, name, id);
      }

      public visitLocalDef(env: EmitterEnv, name: string, id: string, type: J.JTypeRef) {
        return H.mkType(env, this.libraryMap, type)+" "+H.mangleUnique(env, name, id);
      }

      // Allows the target to redefine their own string type.
      public visitStringLiteral(env: EmitterEnv, s: string) {
        return 'touch_develop::mk_string("'+s.replace(/["\\\n]/g, c => {
          if (c == '"') return '\\"';
          if (c == '\\') return '\\\\';
          if (c == "\n") return '\\n';
        }) + '")';
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
        var indexCode = this.visit(env, index) + " = 0";
        var testCode = H.mangleDef(env, index) + " < " + this.visit(env, bound);
        var incrCode = "++"+H.mangleDef(env, index);
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
          elseBranch ? this.visitMany(indent(env), elseBranch) + "\n" : "",
          elseBranch ? env.indent + "}" : ""
        ].join("");
      }

      private resolveCall(env: EmitterEnv, receiver: J.JExpr, name: string) {
        if (!receiver)
          return null;

        // Is this a call in the current scope?
        var scoped = H.isScopedCall(receiver);
        if (scoped)
          if (this.libRef)
            // If compiling a library, no scope actually means the library's
            // scope. This step is required to possibly find a shim. This means
            // that we may generate "lib::f()" where we could've just written
            // "f()", but since the prototypes have been written out already,
            // that's fine.
            return this.resolveCall(env, this.libRef, name);
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
          if (s != null) {
            // Call to a built-in C++ function
            if (!s.length)
              throw new Error("Library author: some (compiled) function is trying to call "+name+" "+
                "which is marked as {shim:}, i.e. for simulator purposes only.\n\n"+
                "Hint: break on exceptions in the debugger and walk up the call stack to "+
                "figure out which action it is.");
            return s;
          } else {
            // Actual call to a library function
            return H.manglePrefixedName(env, n, name);
          }
        }

        return null;
      }

      // Some conversions cannot be expressed using the simple "enums" feature
      // (which maps a string literal to a constant). This function transforms
      // the arguments for some known specific C++ functions.
      private specialTreatment(f: string, actualArgs: J.JExpr[]) {
        if (f == "micro_bit::createImage") {
          var x = H.isStringLiteral(actualArgs[0]);
          if (!x)
            throw new Error("create image takes a string literal only");
          var r = "literals::bitmap"+this.imageLiterals.length;
          var code = f+"("+r+"_w, "+r+"_h, "+r+")";
          this.imageLiterals.push(x);
          return code;
        } else {
          return null;
        }
      }

      public visitCall(env: EmitterEnv,
        name: string,
        args: J.JExpr[],
        parent: J.JTypeRef,
        callType: string)
      {
        var mkCall = (f: string, skipReceiver: boolean) => {
          var actualArgs = skipReceiver ? args.slice(1) : args;
          var s = this.specialTreatment(f, actualArgs);
          if (s)
            return s;
          else {
            var argsCode =
              actualArgs.map(a => {
                var k = H.isEnumLiteral(a);
                if (k)
                  return k+"";
                else
                  return this.visit(env, a)
              });
            return f + "(" + argsCode.join(", ") + ")";
          }
        };

        // The [JCall] node has several, different, often unrelated purposes.
        // This function identifies (tentatively) the different cases and
        // compiles each one of them into something that makes sense.

        // 1) A call to a function, either in the current scope, or belonging to
        // a TouchDevelop library. Resolves to a C++ function call.
        var resolvedName = this.resolveCall(env, args[0], name);
        if (resolvedName)
          return mkCall(resolvedName, true);

        // 2) A call to the assignment operator on the receiver. C++ assignment.
        else if (name == ":=")
          return this.visit(env, args[0]) + " = " + this.visit(env, args[1]);

        // 3) Reference to a variable in the global scope.
        else if (args.length && H.isSingletonRef(args[0]) == "data")
          return H.manglePrefixedName(env, "globals", name);

        // 4) Extension method, where p(x) is represented as x→ p. In case we're
        // actually referencing a function from a library, go through
        // [resolveCall] again, so that we find the shim if any.
        else if (callType == "extension") {
          var t = H.resolveTypeRef(this.libraryMap, parent);
          var prefixedName = t.lib
            ? this.resolveCall(env, H.mkLibraryRef(t.lib), name)
            : H.mangleName(name);
          return mkCall(prefixedName, false);
        }

        // 5) Field access for an object.
        else if (callType == "field")
          return this.visit(env, args[0]) + "->" + H.mangleName(name);

        // 6) Reference to a built-in library method, e.g. Math→ max
        else if (args.length && H.isSingletonRef(args[0]))
          return H.isSingletonRef(args[0]).toLowerCase() + "::" + mkCall(H.mangleName(name), true);

        // 7) Instance method (e.g. Number's > operator, for which the receiver
        // is the number itself). Lowercase so that "number" is the namespace
        // that contains the functions that operate on typedef "Number".
        else {
          var t = H.resolveTypeRef(this.libraryMap, parent);
          return t.type.toLowerCase()+"::"+mkCall(H.mangleName(name), false);
        }
      }

      public visitSingletonRef(e, n: string) {
        if (n == "$skip")
          return "";
        else
          return n;
      }

      public visitGlobalDef(e: EmitterEnv, name: string, t: J.JTypeRef) {
        H.reserveName(e, name);

        var x = H.defaultValueForType(this.libraryMap, t);
        // A reference to a global is already unique (i.e. un-ambiguous).
        // [mkType] calls [mangleName] (NOT [mangleUnique], and so should we).
        return e.indent + H.mkType(e, this.libraryMap, t) + " " + H.mangleName(name) +
          (x ? " = " + x : "") + ";"
      }

      public visitAction(
        env: EmitterEnv,
        name: string,
        id: string,
        inParams: J.JLocalDef[],
        outParams: J.JLocalDef[],
        body: J.JStmt[])
      {
        // This function is always called with H.willCompile == true, meaning
        // it's not a shim.
        if (outParams.length > 1)
          throw new Error("Not supported (multiple return parameters)");

        var env2 = indent(env);
        var bodyText = [
          outParams.length ? env2.indent + this.visit(env2, outParams[0]) + ";" : "",
          this.visitMany(env2, body),
          outParams.length ? env2.indent + H.mkReturn(H.mangleDef(env, outParams[0])) : "",
        ].filter(x => x != "").join("\n");
        // The name of a function is unique per library, so don't go through
        // [mangleUnique].
        var head = H.mkSignature(env, this.libraryMap, H.mangleName(name), inParams, outParams);
        return env.indent + head + " {\n" + bodyText + "\n"+env.indent+"}";
      }

      private compileImageLiterals() {
        if (!this.imageLiterals.length)
          return "";

        return "namespace literals {\n" +
          this.imageLiterals.map((s: string, n: number) => {
            var x = 0;
            var w = 0;
            var h = 0;
            var lit = "{ ";
            for (var i = 0; i < s.length; ++i) {
              switch (s[i]) {
                case "0":
                case "1":
                  lit += s[i]+", ";
                  x++;
                  break;
                case " ":
                  break;
                case "\n":
                  if (w == 0)
                    w = x;
                  else if (x != w)
                    // Sanity check
                    throw new Error("Malformed string literal");
                  x = 0;
                  h++;
                  break;
                default:
                  throw new Error("Malformed string literal");
              }
            }
            h++;
            lit += "}";
            var r = "bitmap"+n;
            return "  int "+r+"_w = "+w+";\n" +
              "  int "+r+"_h = "+h+";\n"+
              "  uint8_t "+r+"[] = "+lit+";\n";
          }).join("\n") +
        "}\n\n";
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

        // Globals are in their own namespace (otherwise they would collide with
        // "math", "number", etc.).
        var globals = decls.map((f: J.JDecl) => {
          var e1 = indent(e)
          if (f.nodeType == "data")
            return this.visit(e1, f);
          else
            return null;
        }).filter(x => x != null);
        var globalsCode = globals.length
          ?  e.indent + "namespace globals {\n" +
            globals.join("\n") + "\n" +
          e.indent + "}\n"
          : "";

        // We need forward declarations for all functions (they're,
        // by default, mutually recursive in TouchDevelop).
        var forwardDeclarations = decls.map((f: J.JDecl) => {
          if (f.nodeType == "action" && H.willCompile(<J.JAction> f)) {
            H.reserveName(e, f.name, f.id);
            return e.indent + H.mkSignature(e, this.libraryMap, H.mangleName(f.name), (<J.JAction> f).inParameters, (<J.JAction> f).outParameters)+";";
          } else {
            return null;
          }
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
        // output parameters in the member variables. Image literals are scoped
        // within our namespace.
        this.prototypes = this.compileImageLiterals() + globalsCode + forwardDeclarations.join("\n");
        this.code = userFunctions.join("\n");

        // [embedded.ts] now reads the three member fields separately and
        // ignores this return value.
        return null;
      }
    }
  }
}

// vim: set ts=2 sw=2 sts=2:
