///<reference path='refs.ts'/>

module TDev {

  export module Embedded {

    import J = AST.Json
    import H = Helpers

    function assert(x: boolean) {
      if (!x)
        throw new Error("Assert failure");
    }

    // --- The code emitter.

    export class Emitter extends JsonAstVisitor<H.Env, string> {

      // Output "parameters", written to at the end.
      public prototypes = "";
      public code = "";
      public prelude = "";
      // Type stubs. Then, type definitions. To allow for any kind of insane
      // type-level recursion.
      public tPrototypes = "";
      public tCode = "";

      private libraryMap: H.LibMap = {};

      private imageLiterals = [];

      // All the libraries needed to compile this [JApp].
      constructor(
        private libRef: J.JCall,
        private libs: J.JApp[],
        private resolveMap: { [index:string]: string }
      ) {
        super();
      }

      public visitMany(e: H.Env, ss: J.JNode[]) {
        var code = [];
        ss.forEach((s: J.JNode) => { code.push(this.visit(e, s)) });
        return code.join("\n");
      }

      public visitComment(env: H.Env, c: string) {
        return env.indent+"// "+c.replace("\n", "\n"+env.indent+"// ");
      }

      public visitBreak(env: H.Env) {
        return env.indent + "break;";
      }

      public visitContinue(env: H.Env) {
        return env.indent + "continue;";
      }

      public visitShow(env: H.Env, expr: J.JExpr) {
        // TODO hook this up to "post to wall" handling if any
        return env.indent + "serial.print(" + this.visit(env, expr) + ");";
      }

      public visitReturn(env: H.Env, expr: J.JExpr) {
        return env.indent + H.mkReturn(this.visit(env, expr));
      }

      public visitExprStmt(env: H.Env, expr: J.JExpr) {
        return env.indent + this.visit(env, expr)+";";
      }

      public visitInlineActions(env: H.Env, expr: J.JExprHolder, actions: J.JInlineAction[]) {
        var map = {};
        expr.locals.forEach((l: J.JLocalDef) => { map[l.id] = l.name });
        var lambdas = actions.map((a: J.JInlineAction) => {
          var n = H.resolveLocal(env, map[a.reference.id], a.reference.id);
          return (
            env.indent +
            H.findTypeDef(
              "std::function<"+
                  H.mkSignature(env, this.libraryMap, "", a.inParameters, a.outParameters)+
                ">") +
            " "+n+" = "+
            this.visitAction(env, "", n, a.inParameters, a.outParameters, a.body, false, true)+";\n"
          );
        });
        return (lambdas.join("\n")+"\n"+
          env.indent + this.visit(env, expr.tree) + ";");
      }

      public visitExprHolder(env: H.Env, locals: J.JLocalDef[], expr: J.JExpr) {
        if (H.isInitialRecordAssignment(locals, expr))
          return this.visit(env, locals[0])+"(new "+H.mkType(env, this.libraryMap, locals[0].type)+"_)";

        var decls = locals.map(d => {
          // Side-effect: marks [d] as promoted, if needed.
          var decl = this.visit(env, d);
          var defaultValue = H.defaultValueForType(this.libraryMap, d.type);
          var initialValue = !H.isPromoted(env, d.id) && defaultValue ? " = " + defaultValue : "";
          return decl + initialValue + ";";
        });
        return decls.join("\n"+env.indent) +
          (decls.length ? "\n" + env.indent : "") +
          this.visit(env, expr);
      }

      public visitLocalRef(env: H.Env, name: string, id: string) {
        // In our translation, referring to a TouchDevelop identifier never
        // requires adding a reference operator (&). Things passed by reference
        // are either:
        // - function pointers (a.k.a. "handlers" in TouchDevelop lingo), for
        //   which C and C++ accept both "f" and "&f" (we hence use the former)
        // - arrays, strings, user-defined objects, which are in fact of type
        //   "ManagedType<T>", no "&" operator here.
        // However, we now support capture-by-reference. This means that the
        // data is ref-counted (so as to be shared), but assignment and
        // reference operate on the ref-counted data (not on the pointer), so we
        // must add a dereference there.
        var prefix = H.isPromoted(env, id) ? "*" : "";
        return prefix+H.resolveLocal(env, name, id);
      }

      public visitLocalDef(env: H.Env, name: string, id: string, type: J.JTypeRef, isByRef: boolean) {
        var t = H.mkType(env, this.libraryMap, type);
        var l = H.resolveLocal(env, name, id);
        if (H.shouldPromoteToRef(env, type, isByRef)) {
          H.markPromoted(env, id);
          return "Ref<"+ t + "> " + l;
        } else {
          return t + " " + l;
        }
      }

      // Allows the target to redefine their own string type.
      public visitStringLiteral(env: H.Env, s: string) {
        return 'touch_develop::mk_string("'+s.replace(/["\\\n\r]/g, c => {
          if (c == '"') return '\\"';
          if (c == '\\') return '\\\\';
          if (c == "\n") return '\\n';
          if (c == "\r") return '\\r';
        }) + '")';
      }

      public visitNumberLiteral(env: H.Env, n: number) {
        return n+"";
      }

      public visitBooleanLiteral(env: H.Env, b: boolean) {
        return b+"";
      }

      public visitWhile(env: H.Env, cond: J.JExprHolder, body: J.JStmt[]) {
        var condCode = this.visit(env, cond);
        var bodyCode = this.visitMany(H.indent(env), body);
        return env.indent + "while ("+condCode+") {\n" + bodyCode + "\n" + env.indent + "}";
      }

      public visitFor(env: H.Env, index: J.JLocalDef, bound: J.JExprHolder, body: J.JStmt[]) {
        var indexCode = this.visit(env, index) + " = 0";
        var testCode = H.resolveLocalDef(env, index) + " < " + this.visit(env, bound);
        var incrCode = "++"+H.resolveLocalDef(env, index);
        var bodyCode = this.visitMany(H.indent(env), body);
        return (
          env.indent + "for ("+indexCode+"; "+testCode+"; "+incrCode+") {\n" +
            bodyCode + "\n" +
          env.indent + "}"
        );
      }

      public visitIf(
          env: H.Env,
          cond: J.JExprHolder,
          thenBranch: J.JStmt[],
          elseBranch: J.JStmt[],
          isElseIf: boolean)
      {
        var isIfFalse = cond.tree.nodeType == "booleanLiteral" && (<J.JBooleanLiteral> cond.tree).value === false;
        // TouchDevelop abuses "if false" to comment out code. Commented out
        // code is not type-checked, so don't try to compile it. However, an
        // "if false" followed by an "else" is *not* understood to be a comment.
        return [
          env.indent, isElseIf ? "else " : "", "if (" + this.visit(env, cond) + "){\n",
          isIfFalse ? "" : this.visitMany(H.indent(env), thenBranch) + "\n",
          env.indent, "}",
          elseBranch ? " else {\n" : "",
          elseBranch ? this.visitMany(H.indent(env), elseBranch) + "\n" : "",
          elseBranch ? env.indent + "}" : ""
        ].join("");
      }

      private resolveCall(env: H.Env, receiver: J.JExpr, name: string) {
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
            return H.resolveGlobal(env, name);


        // Is this a call to a library?
        var n = H.isLibrary(receiver);
        if (n) {
          // I expect all libraries and all library calls to be properly resolved.
          var key = this.resolveMap[n] || n;
          var lib = this.libs.filter(l => l.name == key)[0];
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
            return H.resolveGlobalL(env, n, name);
          }
        }

        return null;
      }

      // Some conversions cannot be expressed using the simple "enums" feature
      // (which maps a string literal to a constant). This function transforms
      // the arguments for some known specific C++ functions.
      private specialTreatment(e: H.Env, f: string, actualArgs: J.JExpr[]) {
        if (f == "micro_bit::createImage" || f == "micro_bit::showAnimation" || f == "micro_bit::showLeds" || f == "micro_bit::plotLeds") {
          var x = H.isStringLiteral(actualArgs[0]);
          if (x === "")
            x = "0 0 0 0 0\n0 0 0 0 0\n0 0 0 0 0\n0 0 0 0 0\n0 0 0 0 0\n";
          if (!x)
            throw new Error("create image / show animation / plot image takes a string literal only");
          var r = "literals::bitmap"+this.imageLiterals.length;
          var otherArgs = actualArgs.splice(1).map((x: J.JExpr) => this.visit(e, x));
          var code = f+"("+r+"_w, "+r+"_h, "+r+
                (otherArgs.length ? ", "+otherArgs : "")+
                ")";
          this.imageLiterals.push(x);
          return code;
        } else {
          return null;
        }
      }

      private safeGet(x: string, f: string): string {
        // The overload of [->] in [ManagedType] takes care of checking that the
        // underlying object is properly initialized.
        return x+"->"+f;
      }

      public visitCall(env: H.Env,
        name: string,
        args: J.JExpr[],
        typeArgs: J.JTypeRef[],
        parent: J.JTypeRef,
        callType: string,
        typeArgument: string = null)
      {
        var mkCall = (f: string, skipReceiver: boolean) => {
          var actualArgs = skipReceiver ? args.slice(1) : args;
          var s = this.specialTreatment(env, f, actualArgs);
          if (s)
            return s;
          else {
            var argsCode =
              actualArgs.map(a => {
                var k = H.isEnumLiteral(a);
                if (k)
                  return k+"";
                else
                  return this.visit(H.resetPriority(env), a)
              });
            var t = typeArgument ? "<" + typeArgument + ">" : "";
            return f + t + "(" + argsCode.join(", ") + ")";
          }
        };

        // The [JCall] node has several, different, often unrelated purposes.
        // This function identifies (tentatively) the different cases and
        // compiles each one of them into something that makes sense.

        // 0a) Some methods take a type-level argument at the end, e.g.
        // "create -> collection of -> number". TouchDevelop represents this as
        // calling the method "Number" on "create -> collection of". C++ wants
        // the type argument to be passed as a template parameter to "collection of"
        // so we pop the type arguments off and call ourselves recursively with
        // the extra type argument.
        // Extra bonus subtlety: we are able to get the "complete" type argument
        // at the root of the call sequence, but we need skip "intermediate"
        // nodes (that have types such as Collection<T> in there) until we hit
        // the actual code arguments.
        if (<any> parent == "Unfinished Type") {
          var newTypeArg = typeArgument || H.mkType(env, this.libraryMap, typeArgs[0]);
          assert(args.length && args[0].nodeType == "call");
          var call = <J.JCall> args[0];
          return this.visitCall(H.resetPriority(env), call.name, call.args, call.typeArgs, call.parent, call.callType, newTypeArg);
        }

        // 0b) Ha ha! But actually, guess what? For records, it's the opposite,
        // and TouchDevelop writes "÷point -> create".
        if (H.isRecordConstructor(name, args)) {
          // Note: we cannot call new on type definitions from other libraries.
          // So the type we're looking for is always in the current scope's
          // "user_types" namespace.
          var struct_name = "user_types::"+H.resolveGlobal(env, <any> parent)+"_";
          return "ManagedType<"+struct_name+">(new "+struct_name+"())";
        }

        // 1) A call to a function, either in the current scope, or belonging to
        // a TouchDevelop library. Resolves to a C++ function call.
        var resolvedName = this.resolveCall(H.resetPriority(env), args[0], name);
        if (resolvedName)
          return mkCall(resolvedName, true);

        // 2) A call to the assignment operator on the receiver. C++ assignment.
        else if (name == ":=")
          return this.visit(H.resetPriority(env), args[0]) + " = " + this.visit(H.resetPriority(env), args[1]);

        // 3) Reference to a variable in the global scope.
        else if (args.length && H.isSingletonRef(args[0]) == "data")
          return "globals::"+H.resolveGlobal(env, name);

        // 4) Extension method, where p(x) is represented as x→ p. In case we're
        // actually referencing a function from a library, go through
        // [resolveCall] again, so that we find the shim if any.
        else if (callType == "extension") {
          var t = H.resolveTypeRef(this.libraryMap, parent);
          var prefixedName = t.lib
            ? this.resolveCall(H.resetPriority(env), H.mkLibraryRef(t.lib), name)
            : this.resolveCall(H.resetPriority(env), H.mkCodeRef(), name);
          return mkCall(prefixedName, false);
        }

        // 5) Field access for an object.
        else if (callType == "field")
          // TODO handle collisions at the record-field level.
          return this.safeGet(this.visit(H.resetPriority(env), args[0]), H.mangle(name));

        // 6a) Lone reference to a library (e.g. ♻ micro:bit just by itself).
        else if (args.length && H.isSingletonRef(args[0]) == "♻")
          return "";

        // 6b) Reference to a built-in library method, e.g. Math→ max. The
        // first call to lowercase avoids a conflict between Number (the type)
        // and number (the namespace). The second call to lowercase avoids a
        // conflict between Collection_of (the type) and collection_of (the
        // function).
        else if (args.length && H.isSingletonRef(args[0]))
          // Assuming no collisions in built-in library methods.
          return H.isSingletonRef(args[0]).toLowerCase() + "::" + mkCall(H.mangle(name).toLowerCase(), true);

        // 7) Instance method (e.g. Number's > operator, for which the receiver
        // is the number itself). Lowercase so that "number" is the namespace
        // that contains the functions that operate on typedef'd "Number".
        else {
          var t = H.resolveTypeRef(this.libraryMap, parent);
          var op = H.lookupOperator(t.type.toLowerCase()+"::"+name);
          if (op) {
            var needsParentheses = op.prio > H.priority(env);
            var wrap = needsParentheses ? x => "(" + x + ")" : x => x;
            var rightPriority = op.right ? op.prio - 1 : op.prio;
            var leftPriority = op.prio;
            if (args.length == 2)
              return wrap(
                this.visit(H.setPriority(env, leftPriority), args[0]) +
                " " + op.op + " " +
                this.visit(H.setPriority(env, rightPriority), args[1]));
            else {
              assert(args.length == 1);
              return wrap(op.op + this.visit(H.setPriority(env, leftPriority), args[0]));
            }
          } else {
            // We assume no collisions for built-in operators.
            return mkCall(t.type.toLowerCase()+"::"+H.mangle(name), false);
          }
        }
      }

      public visitSingletonRef(e, n: string) {
        if (n == "$skip")
          return "";
        else
          // Reference to "data", "Math" (or other namespaces), that makes no
          // sense. TouchDevelop allows these.
          return "";
      }

      public visitGlobalDef(e: H.Env, name: string, t: J.JTypeRef, comment: string) {
        // TODO: we skip definitions marked as shims, but we do not do anything
        // meaningful when we *refer* to them.
        var s = H.isShim(comment);
        if (s !== null)
          return null;

        var def = comment.match(/{default:([^}]+)}/);

        var x = def ? def[1] : H.defaultValueForType(this.libraryMap, t);
        return e.indent + H.mkType(e, this.libraryMap, t) + " " + H.resolveGlobal(e, name) +
          (x ? " = " + x : "") + ";"
      }

      public visitAction(
        env: H.Env,
        name: string,
        id: string,
        inParams: J.JLocalDef[],
        outParams: J.JLocalDef[],
        body: J.JStmt[],
        isPrivate,
        isLambda=false)
      {
        // This function is always called with H.willCompile == true, meaning
        // it's not a shim.
        if (outParams.length > 1)
          throw new Error("Not supported (multiple return parameters)");

        var env2 = H.indent(env);

        // Properly initializing the outparam with a default value is important,
        // because it guarantees that the function always ends with a proper
        // return statement of an initialized value. (Never returning is NOT an
        // error in TouchDevelop).
        var outParamInitialization = "";
        if (outParams.length > 0) {
          var defaultValue = H.defaultValueForType(this.libraryMap, outParams[0].type);
          var initialValue = defaultValue ? " = " + defaultValue : "";
          outParamInitialization = env2.indent + this.visit(env2, outParams[0]) + initialValue + ";";
        }

        var bodyText = [
          outParamInitialization,
          this.visitMany(env2, body),
          outParams.length ? env2.indent + H.mkReturn(H.resolveLocalDef(env, outParams[0])) : "",
        ].filter(x => x != "").join("\n");
        var head = H.mkSignature(env, this.libraryMap, H.resolveGlobal(env, name), inParams, outParams, isLambda);
        return (isLambda ? "" : env.indent) + head + " {\n" + bodyText + "\n"+env.indent+"}";
      }

      private compileImageLiterals(e: H.Env) {
        if (!this.imageLiterals.length)
          return "";

        return e.indent + "namespace literals {\n" +
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
            return e.indent + "  const int "+r+"_w = "+w+";\n" +
              e.indent + "  const int "+r+"_h = "+h+";\n"+
              e.indent + "  const uint8_t "+r+"[] = "+lit+";\n";
          }).join("\n") +
        e.indent + "}\n\n";
      }

      private typeDecl(e: H.Env, r: J.JRecord) {
        var s = H.isShim(r.comment);
        if (s !== null)
          return null;

        var n = H.resolveGlobal(e, r.name);
        var fields = r.fields.map((f: J.JRecordField) => {
          var t = H.mkType(e, this.libraryMap, f.type);
          return e.indent + "  " + t + " " + H.mangle(f.name) + ";";
        }).join("\n");
        return [
          e.indent + "struct " + n + "_ {",
          fields,
          e.indent + "};",
        ].join("\n");
      }

      private typeStub(e: H.Env, r: J.JRecord) {
        var n = H.resolveGlobal(e, r.name);

        var s = H.isShim(r.comment);
        if (s !== null)
          return e.indent + "typedef "+s+" "+n+";";
        else if (s === "")
          return null;
        else
          return [
            e.indent + "struct " + n + "_;",
            e.indent + "typedef ManagedType<" + n + "_> " + n + ";",
          ].join("\n");
      }

      private wrapNamespaceIf(e: H.Env, s: string) {
        if (e.libName != null)
          return (s.length
            ? "  namespace "+H.mangle(e.libName)+" {\n"+
                s +
              "\n  }"
            : "");
        else
          return s;
      }

      private wrapNamespaceDecls(e: H.Env, n: string, s: string[]) {
        return (s.length
          ? e.indent + "namespace "+n+" {\n"+
              s.join("\n") + "\n" +
            e.indent + "}"
          : "");
      }

      // This function runs over all declarations. After execution, the three
      // member fields [prelude], [prototypes] and [code] are filled accordingly.
      public visitApp(e: H.Env, decls: J.JDecl[]) {
        e = H.indent(e);
        if (e.libName)
          e = H.indent(e);

        // Some parts of the emitter need to lookup library names by their id
        decls.forEach((x: J.JDecl) => {
          if (x.nodeType == "library") {
            var l: J.JLibrary = <J.JLibrary> x;
            this.libraryMap[l.id] = l.name;
          }
        });

        // Compile type "stubs". Because there may be any kind of recursion
        // between types, we first declare the structs, then the resulting
        // ref-counted type (which the TouchDevelop type maps onto):
        //     struct Thing_;
        //     typedef ManagedType<Thing_> Thing;
        var typeStubs = decls.map((f: J.JDecl) => {
          var e1 = H.indent(e)
          if (f.nodeType == "record")
            return this.typeStub(e1, <J.JRecord> f);
          else
            return null;
        }).filter(x => x != null);
        var typeStubsCode = this.wrapNamespaceDecls(e, "user_types", typeStubs);

        // Then, we can emit the definition of the structs (Thing_) because they
        // refer to TouchDevelop types (Thing).
        var typeDefs = decls.map((f: J.JDecl) => {
          var e1 = H.indent(e)
          if (f.nodeType == "record")
            return this.typeDecl(e1, <J.JRecord> f);
          else
            return null;
        }).filter(x => x != null);
        var typeDefsCode = this.wrapNamespaceDecls(e, "user_types", typeDefs);

        // Globals are in their own namespace (otherwise they would collide with
        // "math", "number", etc.).
        var globals = decls.map((f: J.JDecl) => {
          var e1 = H.indent(e)
          if (f.nodeType == "data")
            return this.visit(e1, f);
          else
            return null;
        }).filter(x => x != null);
        var globalsCode = this.wrapNamespaceDecls(e, "globals", globals);

        // We need forward declarations for all functions (they're,
        // by default, mutually recursive in TouchDevelop).
        var forwardDeclarations = decls.map((f: J.JDecl) => {
          if (f.nodeType == "action" && H.willCompile(<J.JAction> f)) {
            return e.indent + H.mkSignature(e, this.libraryMap, H.resolveGlobal(e, f.name), (<J.JAction> f).inParameters, (<J.JAction> f).outParameters)+";";
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
        this.prototypes = this.wrapNamespaceIf(e, globalsCode + "\n" + forwardDeclarations.join("\n"));
        this.code = this.wrapNamespaceIf(e, this.compileImageLiterals(e) + userFunctions.join("\n"));
        this.tPrototypes = this.wrapNamespaceIf(e, typeStubsCode);
        this.tCode = this.wrapNamespaceIf(e, typeDefsCode);

        // [embedded.ts] now reads the three member fields separately and
        // ignores this return value.
        return null;
      }
    }
  }
}

// vim: set ts=2 sw=2 sts=2:
