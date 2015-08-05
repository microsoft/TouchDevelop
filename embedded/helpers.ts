///<reference path='refs.ts'/>

module TDev {

  export module Embedded {

    import J = AST.Json

    export module Helpers {
      export var librarySymbol = "♻";

      var cppKeywords = {
        "alignas": null,
        "alignof": null,
        "and": null,
        "and_eq": null,
        "asm": null,
        "auto": null,
        "bitand": null,
        "bitor": null,
        "bool": null,
        "break": null,
        "case": null,
        "catch": null,
        "char": null,
        "char16_t": null,
        "char32_t": null,
        "class": null,
        "compl": null,
        "concept": null,
        "const": null,
        "constexpr": null,
        "const_cast": null,
        "continue": null,
        "decltype": null,
        "default": null,
        "delete": null,
        "do": null,
        "double": null,
        "dynamic_cast": null,
        "else": null,
        "enum": null,
        "explicit": null,
        "export": null,
        "extern": null,
        "false": null,
        "float": null,
        "for": null,
        "friend": null,
        "goto": null,
        "if": null,
        "inline": null,
        "int": null,
        "long": null,
        "mutable": null,
        "namespace": null,
        "new": null,
        "noexcept": null,
        "not": null,
        "not_eq": null,
        "nullptr": null,
        "operator": null,
        "or": null,
        "or_eq": null,
        "private": null,
        "protected": null,
        "public": null,
        "register": null,
        "reinterpret_cast": null,
        "requires": null,
        "return": null,
        "short": null,
        "signed": null,
        "sizeof": null,
        "static": null,
        "static_assert": null,
        "static_cast": null,
        "struct": null,
        "switch": null,
        "template": null,
        "this": null,
        "thread_local": null,
        "throw": null,
        "true": null,
        "try": null,
        "typedef": null,
        "typeid": null,
        "typename": null,
        "union": null,
        "unsigned": null,
        "using": null,
        "virtual": null,
        "void": null,
        "volatile": null,
        "wchar_t": null,
        "while": null,
        "xor": null,
        "xor_eq ": null,
      };

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

      // Our name environments. We have two behaviors for names:
      // - global names must be left intact (i.e. function "f" is emitted as
      //   function "f"), mostly because libraries are mutually recursive, and
      //   doing a pre-computation of names would most likely be difficult
      //   (also, it's more readable);
      // - local names may be renamed to avoid conflicts with: another local
      //   name, or a global.
      export interface Env {
        // Maps a TouchDevelop id, or a global "left intact" name to the name of
        // a corresponding, valid C++ identifier.
        ident_of_id: { [id: string]: string };
        // Contains [true] if this C++ identifier has been used already.
        id_of_ident: { [ident: string]: boolean };
      }

      // Mark a name as being exported as a GLOBAL, and assert that there's no
      // earlier name collision. If [id] is provided, name will also be
      // registered for local-style, id-based lookup (this is useful for local
      // actions which are lifted as globals but are still refered to with their
      // local id).
      export function reserveName(e: Env, name: string, id?: string) {
        var mangledName = mangleName(name);
        // This should not happen because all the names are reserved in a first
        // pass (we run through function prototypes and global declarations
        // first).
        if (mangledName in e.id_of_ident)
          throw new Error("Internal error: unexpected name collision");
        // This name is no longer available.
        e.id_of_ident[mangledName] = true;
        e.ident_of_id[name] = mangledName;
        if (id)
          e.ident_of_id[id] = mangledName;
      }

      // Compute a unique name for a LOCAL, based on a user-provided name and a
      // TouchDevelop-generated unique id. This function does its best to keep
      // the original name, but uses the id to make sure there's no collisions
      // in the generated code.
      export function mangleUnique(env: Env, name: string, id: string) {
        if (id in env.ident_of_id)
          return env.ident_of_id[id];
        else {
          var i = 0;
          var suffix = <any> "";
          while (mangleName(name+suffix) in env.id_of_ident)
            suffix = i++;
          env.id_of_ident[mangleName(name+suffix)] = true;
          env.ident_of_id[id] = mangleName(name + suffix);
          return mangleName(name + suffix);
        }
      }

      // There's an extra step, which is that we need to convert a name into a
      // valid C++ identifier. You may call this function only when referring to
      // a global whose name is meant to be left intact.
      export function mangleName(name: string) {
        var candidate = name.replace(/\W/g, x => (replacementTable[x] || "_"));
        if (candidate in cppKeywords)
          candidate += "_";
        else if (candidate.match(/^\d/))
          candidate = "_" + candidate;
        return candidate;
      }

      // Convert a prefixed name into a valid C++ identifier. Same as above,
      // only call this directly if you know that [n] is unique (i.e. is a
      // global, whose name is unique).
      export function manglePrefixedName(e: Env, l: string, n: string) {
        if (l)
          return mangleName(l)+"::"+mangleName(n);
        else
          return mangleName(n);
      }

      export function mangleDef(env: Env, d: J.JLocalDef) {
        return mangleUnique(env, d.name, d.id);
      }

      export function mangleRef(env: Env, d: J.JLocalRef) {
        return mangleUnique(env, d.name, <any> d.localId);
      }


      // --- Helper functions.
      // For constructing / modifying AST nodes.

      export interface LibMap { [id: string]: string }

      // Resolve a type reference to either "t" (no scope for this type) or
      // "l::t" (reference to a library-defined type). If the former case, lib
      // is the empty string; in the latter case, lib is "l".
      export function resolveTypeRef(libMap: LibMap, typeRef: J.JTypeRef): { lib: string; type: string } {
        var s = <any> typeRef;
        if (s.length && s[0] == "{") {
          var t = JSON.parse(<any> typeRef);
          if (!(t.o || t.g))
            throw new Error("Unsupported type reference");
          return {
            lib: t.l ? libMap[t.l] : "",
            type: t.o || t.g
          };
        } else {
          return {
            lib: "",
            type: s
          };
        }
      }

      export function defaultValueForType(libMap: LibMap, t1: J.JTypeRef) {
        var t = resolveTypeRef(libMap, t1);
        if (!t.lib && t.type == "Number")
          return "0";
        else if (!t.lib && t.type == "Boolean")
          return "false";
        else if (!t.lib && t.type == "Action")
          return "NULL";
        else
          return null;
      }

      export function mkType(env: Env, libMap: LibMap, type: J.JTypeRef) {
        var t = resolveTypeRef(libMap, type);
        return manglePrefixedName(env, t.lib, t.type);
      }

      export function mkParam(env: Env, libMap: LibMap, p: J.JLocalDef) {
        return mkType(env, libMap, p.type)+" "+mangleDef(env, p);
      }

      export function mkSignature(env: Env, libMap: LibMap, name: string, inParams: J.JLocalDef[], outParams: J.JLocalDef[]) {
        if (outParams.length > 1)
          throw new Error("Not supported (multiple return parameters)");
        var retType = outParams.length ? mkType(env, libMap, outParams[0].type) : "void";
        if (name == "main")
          name = "app_main";
        return [
          retType, " ", name, "(",
          inParams.map(p => mkParam(env, libMap, p)).join(", "),
          ")",
        ].join("");
      }

      // Generate the return instruction for the function.
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
        if (e.nodeType == "singletonRef")
          return (<J.JSingletonRef>e).libraryName;
        return (
          e.nodeType == "call" &&
          (<J.JCall> e).args[0].nodeType == "singletonRef" &&
          (<J.JSingletonRef> (<J.JCall> e).args[0]).name == librarySymbol &&
          (<J.JCall> e).name || null
        );
      }

      export function isEnumLiteral(e: J.JExpr): string {
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

      export function isShim(s: string) {
        var matches = s.match(/^{shim:([^}]*)}\s*$/);
        if (matches)
          return matches[1];
        else
          return null;
      }

      // [ ..., JComment { text: "{shim:VALUE}" }, ... ] -> VALUE
      // Beware:
      // - null means "function has to be compiled in C++ land";
      // - "" means "function does not have to be compiled in C++ land, author
      //   promises that no one will call this function
      // - anything else means "function does not have to be compiled in C++
      //   land, calls to this function to be replaced with the shim"
      export function isShimBody(body: J.JStmt[]): string {
        var ret = null;
        body.forEach((s: J.JStmt) => {
          var shim = s.nodeType == "comment" && isShim((<J.JComment> s).text);
          if (shim || shim === "")
            ret = shim;
        });
        return ret;
      }

      // JStringLiteral { value: VALUE } -> VALUE
      export function isStringLiteral(x: J.JNode) {
        return x.nodeType == "stringLiteral" && (<J.JStringLiteral> x).value;
      }

      export function willCompile (f: J.JAction) {
        return isShimBody(f.body) == null;
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

      export function mkCodeRef() {
        return {
          nodeType: "singletonRef",
          id: null,
          name: "code"
        };
      }
    }
  }
}

// vim: set ts=2 sw=2 sts=2:
