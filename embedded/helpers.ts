///<reference path='refs.ts'/>

module TDev {

  export module Embedded {

    import J = AST.Json

    export module Helpers {
      export var librarySymbol = "♻";

      var kStringType = "shared_ptr<string>";
      var kImageType = "MicrobitImage*";

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

      export function mkNumberLiteral (x: number): J.JNumberLiteral {
        return {
          nodeType: "numberLiteral",
          id: null,
          value: x
        };
      }

      export function mangleLibraryName(l, n) {
        return mangleName(l)+"_"+mangleName(n);
      }

      // To stay as close as possible to the usual TouchDevelop semantics, we
      // pass scalar values by copy, and strings and arrays by reference (using
      // [shared_ptr]s).
      export function mkType(t: J.JTypeRef) {
        var t1: string = <any> t;
        switch (t1) {
          case "Number":
            return "int";
          case "String":
            return kStringType;
          case "Boolean":
            return "bool";
          default:
            try {
              var t2 = JSON.parse(t1);
              if (t2.o == "image")
                return kImageType;
            } catch (e) {
            }
        }
        return mangleName(t1);
      }

      export function mkParam(p: J.JLocalDef) {
        return mkType(p.type)+" "+mangleDef(p);
      }

      export function mkSignature(name: string, inParams: J.JLocalDef[], outParams: J.JLocalDef[]) {
        if (outParams.length > 1)
          throw new Error("Not supported (multiple return parameters)");
        var retType = outParams.length ? mkType(outParams[0].type) : "void";
        return [
          retType, " ", name, "(",
          inParams.map(mkParam).join(", "),
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
    }
  }
}

// vim: set ts=2 sw=2 sts=2:
