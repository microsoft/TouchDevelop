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

    export class Emitter extends JsonAstVisitor<EmitterEnv, string> {

      public visitMany(e: EmitterEnv, ss: J.JNode[]) {
        var code = [];
        ss.forEach((s: J.JNode) => { code.push(this.visit(e, s)) });
        return code.join("\n");
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
        ].join("\n");
        var head = H.mkSignature(name, inParams, outParams);
        return head + "\n{\n" + body + "\n}\n";
      }

      public visitApp(e: EmitterEnv, decls: J.JDecl[]) {
        // We need forward declarations for all user-defined functions (they're,
        // by default, mutually recursive in TouchDevelop).
        var forwardDeclarations = decls.map((f: J.JDecl) => {
          if (f.nodeType == "action")
            return H.mkSignature(f.name, (<J.JAction> f).inParameters, (<J.JAction> f).outParameters)+";";
          else
            return null;
        }).filter(x => x != null);

        // Compile all the top-level functions, collecting code for handlers as
        // we go. [visitAction] generates a complete function declaration
        var userFunctions = decls.map((d: J.JDecl) => {
          if (d.nodeType == "action") {
            return this.visit(e, d);
          } else if (!(d.nodeType == "library" && d.name == "microbit")) {
            throw "Untranslated declaration" + d;
          }
          return null;
        });

        return forwardDeclarations.concat(userFunctions).join("\n");
      }
    }
  }
}

// vim: set ts=2 sw=2 sts=2:
