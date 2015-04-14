///<reference path='../refs.ts'/>

module TDev {

  export module Microbit {

    import J = AST.Json

    export interface NamedAction {
      name: string;
      action: J.JInlineAction;
    }

    // A list of "inline actions" whose name has been mangled to be globally
    // unique. A call to register these has been generated already: the function
    // body should now be written out somewhere.
    export interface EmitterEnv {
      handlers: NamedAction[];
      indent: string;
    }

    // The environment is mutated in-place, this seems to be easier for the code
    // generator, since we don't need to track identifiers or anything.
    export var emptyEnv: EmitterEnv = {
      handlers: [],
      indent: "",
    };

    module Helpers {
      var kStringType = "shared_ptr<string>";

      // For input parameters of functions, we pass scalar values by copy, and
      // strings and arrays by reference (using [shared_ptr]s). For output
      // parameters of functions, because of the caller-allocates TouchDevelop
      // convention, we must pass references to scalar values, but keep the
      // [shared_ptr]'s as-is, because they already achieve the desired semantics.
      export function mkType(t: J.JTypeRef, isOut: boolean) {
        var t1: string = <any> t;
        var amp = isOut ? "&" : "";
        switch (t1) {
          case "number":
            return "int"+amp;
          case "string":
            return kStringType;
          case "boolean":
            return "bool"+amp;
          default:
            throw "Unsupported type: " + t1;
        }
        // unreachable
        return null;
      }

      export function mkParam(p: J.JLocalDef, isOut: boolean) {
        return mkType(p.type, isOut)+" "+p.name;
      }

      export function mkSignature(name: string, inParams: J.JLocalDef[], outParams: J.JLocalDef[]) {
        return [
          "void ", name, "(",
          inParams.map(p => mkParam(p, false)).join(", "),
          outParams.map(p => mkParam(p, true)).join(", "),
          ")",
        ].join("");
      }

      var c = 0;
      export function mkHandlerName() {
        return "__handler"+(c++);
      }

      export function indent(e: EmitterEnv) {
        return {
          indent: e.indent + "  ",
          handlers: e.handlers
        };
      }
    }

    import H = Helpers

    export interface CodeEnv {
      code: string;
      env: EmitterEnv;
    }

    export class Emitter extends JsonAstVisitor<EmitterEnv, CodeEnv> {

      public visitStmts(e: EmitterEnv, ss: J.JStmt[]) {
        var code = [];
        var ce = ss.reduce((e: EmitterEnv, s: J.JStmt) => {
          var ce = this.visit(e, s);
          code.push(ce.code);
          return ce.env;
        }, e);
        return { env: e, code: code.join("\n") };
      }

      public visitAction(
        env: EmitterEnv,
        name: string,
        inParams: J.JLocalDef[],
        outParams: J.JLocalDef[],
        body: J.JStmt[])
      {
        var e2 = H.indent(e2);
        // Discarding the environment (end-of-scope)
        var bodyText = this.visitStmts(e2, body).code;
        var head = H.mkSignature(name, inParams, outParams);
        return { env: env, code: head + "\n{\n" + body + "\n}\n" };
      }

      public visitApp(e: EmitterEnv, decls: J.JDecl[]) {
        // We need forward declarations for all user-defined functions (they're,
        // by default, mutually recursive in TouchDevelop).
        var forwardDeclarations1 = decls.map((f: J.JDecl) => {
          if (f.nodeType == "action")
            return H.mkSignature(f.name, (<J.JAction> f).inParameters, (<J.JAction> f).outParameters)+";";
          else
            return null;
        }).filter(x => x != null);

        // Compile all the top-level functions, collecting code for handlers as
        // we go. [visitAction] generates a complete function declaration
        var userFunctions = decls.map((d: J.JDecl) => {
          if (d.nodeType == "action") {
            return this.visit(e, d).code;
          } else if (!(d.nodeType == "library" && d.name == "microbit")) {
            console.log("Untranslated declaration", d);
          }
          return null;
        });

        // The environment has been mutated and contains the handlers that we
        // ought to generate. Since at this stage handlers cannot capture
        // variables, we just compile them as top-level functions. We generate
        // forward-declarations too so that there's no scoping issues.
        var forwardDeclarations2 = e.handlers.map((f: NamedAction) => {
          return H.mkSignature(f.name, f.action.inParameters, f.action.outParameters)+";";
        });
        var handlers = e.handlers.map((f: NamedAction) => {
          return this.visitAction(e, f.name, f.action.inParameters, f.action.outParameters, f.action.body).code;
        });

        return {
          env: e,
          code: forwardDeclarations1.concat(forwardDeclarations2).concat(userFunctions).concat(handlers).join("\n")
        };
      }
    }
  }
}
