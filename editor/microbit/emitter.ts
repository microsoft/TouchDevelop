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

      // To stay as close as possible to the usual TouchDevelop semantics, we
      // pass scalar values by copy, and strings and arrays by reference (using
      // [shared_ptr]s).
      export function mkType(t: J.JTypeRef) {
        var t1: string = <any> t;
        switch (t1) {
          case "number":
            return "int";
          case "string":
            return kStringType;
          case "boolean":
            return "bool";
          default:
            throw "Unsupported type: " + t1;
        }
        // unreachable
        return null;
      }

      export function mkParam(p: J.JLocalDef) {
        return mkType(p.type)+" "+p.name;
      }

      export function mkSignature(name: string, inParams: J.JLocalDef[], outParams: J.JLocalDef[]) {
        if (outParams.length > 1)
          throw "Not supported (multiple return parameters)";
        var retType = outParams.length ? mkType(outParams[0].type) : "void";
        return [
          retType, name, "(",
          inParams.map(mkParam).join(", "),
          ")",
        ].join("");
      }

      var c = 0;
      export function mkHandlerName() {
        return "__handler"+(c++);
      }

      // Generate the return instruction for the function with said parameters.
      // Currently uses [return], but XXX will change later when in CPS.
      export function mkReturn(inParams: J.JLocalDef[], outParams: J.JLocalDef[]) {
        if (!outParams.length)
          return "";
        return "return "+outParams[0].name+";";
      }

      export function mkDecl(d: J.JLocalDef) {
        return mkParam(d)+";";
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

//       public visitInlineActions(env: EmitterEnv, e: J.JExpr, actions: J.JInlineAction[]) {
//       }

      public visitAction(
        env: EmitterEnv,
        name: string,
        inParams: J.JLocalDef[],
        outParams: J.JLocalDef[],
        body: J.JStmt[])
      {
        if (outParams.length > 1)
          throw "Not supported (multiple return parameters)";

        var env2 = H.indent(env);
        var bodyText = [
          outParams.length ? H.mkDecl(outParams[0]) : "",
          // Discarding the environment (end-of-scope)
          this.visitStmts(env2, body).code,
          H.mkReturn(inParams, outParams),
        ].join("\n");
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
