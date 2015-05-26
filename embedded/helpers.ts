///<reference path='refs.ts'/>

module TDev {

  export module Embedded {

    import J = AST.Json

    export module Helpers {
      export var librarySymbol = "♻";

      var replacementTable = {
        "<": "lt",
        "≤": "leq",
        "≠": "neq",
        "=": "eq",
        ">": "gt",
        "≥": "geq",
        "+": "plus",
        "-": "minus",
        "/": "div",
        "*": "times",
      };

      export function mangleName(name: string) {
        return name.replace(/\W/g, x => (replacementTable[x] || "_"));
      }

      // Compute a unique name from a user-provided name and a
      // TouchDevelop-generated unique id.
      export function mangle(name: string, id: string) {
          return mangleName(name) + "_" + mangleName(id);
      }

      export function mangleDef(d: J.JLocalDef) {
          return mangle(d.name, d.id);
      }

      export function mangleRef(d: J.JLocalRef) {
          return mangle(d.name, <any> d.localId);
      }


      // --- Helper functions.
      // For constructing / modifying AST nodes.

      export function mangleLibraryName(l, n) {
        if (l)
          return mangleName(l)+"::"+mangleName(n);
        else
          return mangleName(n);
      }

      export interface LibMap { [id: string]: string }

      // Resolve a type reference to either "t" (no scope for this type) or
      // "l::t" (reference to a library-defined type). If the former case, lib
      // is the empty string; in the latter case, lib is "l".
      export function resolveTypeRef(libMap: LibMap, typeRef: J.JTypeRef): { lib: string; type: string } {
        var s = <any> typeRef;
        if (s.length && s[0] == "{") {
          var t = JSON.parse(<any> typeRef);
          if (!t.o)
            throw new Error("Unsupported type reference");
          return {
            lib: t.l ? libMap[t.l] : "",
            type: t.o
          };
        } else {
          return {
            lib: "",
            type: s
          };
        }
      }

      export function mkType(libMap: LibMap, type: J.JTypeRef) {
        var t = resolveTypeRef(libMap, type);
        return mangleLibraryName(t.lib, t.type);
      }

      export function mkParam(libMap: LibMap, p: J.JLocalDef) {
        return mkType(libMap, p.type)+" "+mangleDef(p);
      }

      export function mkSignature(libMap: LibMap, name: string, inParams: J.JLocalDef[], outParams: J.JLocalDef[]) {
        if (outParams.length > 1)
          throw new Error("Not supported (multiple return parameters)");
        var retType = outParams.length ? mkType(libMap, outParams[0].type) : "void";
        return [
          retType, " ", name, "(",
          inParams.map(p => mkParam(libMap, p)).join(", "),
          ")",
        ].join("");
      }

      // Generate the return instruction for the function.  Currently uses
      // [return], but XXX will change later when in CPS. Possibly parameterized
      // over whether we're in an atomic action or not.
      export function mkReturn(exprCode: string) {
        return "return "+exprCode+";";
      }

      // --- Pattern-matching.
      // Because there's no pattern-matching in TypeScript, these slightly
      // cumbersome functions match on the node types, and either return [null] or
      // the thing we were looking for. The pattern is written as a comment to the
      // function.

      // JCall { args: [ JSingletonRef { name = ♻ } ], name = NAME } -> NAME
      export function isLibrary(e: J.JExpr): string {
        return (
          e.nodeType == "call" &&
          (<J.JCall> e).args[0].nodeType == "singletonRef" &&
          (<J.JSingletonRef> (<J.JCall> e).args[0]).name == librarySymbol &&
          (<J.JCall> e).name || null
        );
      }

      export function isEnumLiteral(e: J.JExpr): number {
        return (
          e.nodeType == "stringLiteral" &&
          (<J.JStringLiteral> e).enumValue
        );
      }

      export function isSingletonRef(e: J.JExpr): string {
        return (
          e.nodeType == "singletonRef" &&
          (<J.JSingletonRef> e).name
        );
      }

      // JSingletonRef { name = "code" } -> true
      export function isScopedCall(e: J.JExpr): boolean {
        return (
          e.nodeType == "singletonRef" &&
          (<J.JSingletonRef> e).name == "code" || null
        );
      }

      // [ ..., JComment { text: "{shim:VALUE}" }, ... ] -> VALUE
      export function isShimBody(body: J.JStmt[]): string {
        var ret = null;
        body.forEach((s: J.JStmt) => {
          var matches = s.nodeType == "comment" && (<J.JComment> s).text.match(/^{shim:([^}]+)}$/);
          if (matches)
            ret = matches[1];
        });
        return ret;
      }

      // JStringLiteral { value: VALUE } -> VALUE
      export function isStringLiteral(x: J.JNode) {
        return x.nodeType == "stringLiteral" && (<J.JStringLiteral> x).value || null;
      }

      export function willCompile (f: J.JAction) {
        return !isShimBody(f.body) && !f.isPrivate;
      }

      /* Some functions for constructing fake "WebAST" nodes when we need them. */
      export function mkLibraryRef(x: string) {
        return {
          nodeType: "call",
          id: null,
          args: [<J.JSingletonRef> {
            nodeType: "singletonRef",
            id: null,
            name: "♻",
          }],
          name: x,
          parent: null,
        }
      }
    }
  }
}

// vim: set ts=2 sw=2 sts=2:
