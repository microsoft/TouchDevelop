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

    function isMicrobitLibrary(e: J.JExpr) {
      return (
        e.nodeType == "call" &&
        (<J.JCall> e).name == "microbit" &&
        (<J.JCall> e).args[0].nodeType == "singletonRef" &&
        (<J.JSingletonRef> (<J.JCall> e).args[0]).name == H.librarySymbol
      );
    }

    function checkButtonPressedArgs(args: J.JExpr[]) {
      var value = (x: J.JExpr) =>
        (x.nodeType == "stringLiteral" && (<J.JStringLiteral> x).value || "");
      var mkNumberLiteral = (x: number): J.JNumberLiteral => {
        return {
          nodeType: "numberLiteral",
          id: null,
          value: x
        };
      };
      // XXX this will change once we have the actual hardware
      if (value(args[0]) == "left")
        return [mkNumberLiteral(1)];
      else if (value(args[0]) == "right")
        return [mkNumberLiteral(2)];
      else
        throw "Unknown button!";
    }

    var knownMicrobitCalls: { [index: string]: string } = {
      "on": "microbit_register",
      "busy wait ms": "wait_ms",
      "set led": "microbit_set_led",
      "button pressed": "microbit_button_pressed",
    };

    export class Emitter extends JsonAstVisitor<EmitterEnv, string> {

      public visitMany(e: EmitterEnv, ss: J.JNode[]) {
        var code = [];
        ss.forEach((s: J.JNode) => { code.push(this.visit(e, s)) });
        return code.join("\n");
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

      public visitCall(env: EmitterEnv, name: string, args: J.JExpr[]) {
        var receiver = args[0];
        args = args.splice(1);

        var mkCall = (f: string) => {
          var argsCode = args.map(a => this.visit(env, a));
          return f + "(" + argsCode.join(", ") + ")";
        };

        if (isMicrobitLibrary(receiver)) {
          if (!(name in knownMicrobitCalls))
            throw "Unknown microbit call: "+name;
          // Some special-cases.
          if (name == "button pressed") {
            args = checkButtonPressedArgs(args);
          }
          return mkCall(knownMicrobitCalls[name]);
        } else if (name == ":=") {
          return this.visit(env, receiver) + " = " + this.visit(env, args[0]);
        } else {
          throw "Unknown call "+name;
        }
      }

      public visitAction(
        env: EmitterEnv,
        name: string,
        inParams: J.JLocalDef[],
        outParams: J.JLocalDef[],
        body: J.JStmt[])
      {
        if (outParams.length > 1)
          throw "Not supported (multiple return parameters)";

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
          if (f.nodeType == "action")
            return H.mkSignature(f.name, (<J.JAction> f).inParameters, (<J.JAction> f).outParameters)+";";
          else
            return null;
        }).filter(x => x != null);

        // Compile all the top-level functions.
        var userFunctions = decls.map((d: J.JDecl) => {
          if (d.nodeType == "action") {
            return this.visit(e, d);
          } else if (!(d.nodeType == "library" && d.name == "microbit")) {
            throw "Untranslated declaration" + d;
          }
          return null;
        }).filter(x => x != null);

        return forwardDeclarations.concat(userFunctions).join("\n");
      }
    }
  }
}

// vim: set ts=2 sw=2 sts=2:
