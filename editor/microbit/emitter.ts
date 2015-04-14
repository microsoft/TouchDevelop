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

    var knownMicrobitCalls: { [index: string]: string } = {
      "on": "microbit_register",
      "wait": "wait",
      "set led": "microbit_set_led",
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
        return H.mangle(name, id);
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

      public visitCall(env: EmitterEnv, name: string, args: J.JExpr[]) {
        var receiver = args[0];

        var f = isMicrobitLibrary(args[0])
          ? knownMicrobitCalls[name]
          : this.visit(env, receiver)+"::"+name;

        args = args.splice(1);
        var argsCode = args.map(a => this.visit(env, a));
        return f + "(" + argsCode.join(", ") + ")";
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

        var bodyText = [
          outParams.length ? H.mkDecl(outParams[0]) : "",
          this.visitMany(indent(env), body),
          H.mkReturn(inParams, outParams),
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
