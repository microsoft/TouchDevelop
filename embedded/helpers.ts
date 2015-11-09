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

      var operatorTable = {
        // http://en.cppreference.com/w/cpp/language/operator_precedence
        "boolean::not": { prio: 3, right: false, op: "!" },
        "number::/": { prio: 5, right: true, op: "/" },
        "number::*": { prio: 5, right: false, op: "*" },
        "number::+": { prio: 6, right: false, op: "+" },
        "number::-": { prio: 6, right: true, op: "-" },
        "number::<": { prio: 8, right: false, op: "<" },
        "number::≤": { prio: 8, right: false, op: "<=" },
        "number::>": { prio: 8, right: false, op: ">" },
        "number::≥": { prio: 8, right: false, op: ">=" },
        "number::≠": { prio: 9, right: false, op: "!=" },
        "number::=": { prio: 9, right: false, op: "==" },
        "boolean::and": { prio: 13, right: false, op: "&&" },
        "boolean::or": { prio: 14, right: false, op: "||" },
      };

      export function lookupOperator(op: string) {
        return operatorTable[op];
      }

      export interface GlobalNameMap {
        libraries: StringMap<StringMap<string>>;
        program: StringMap<string>;
      }

      // Our name environments. We have two behaviors for names:
      // - global names (global variables, functions and types) are unique
      //   within a TouchDevelop library; once mapped to C++ identifiers, they
      //   may conflict; they are resolved using the pair (library, name).
      // - local names are not unique; they are, however, assigned a unique
      //   TouchDevelop id; they are thus resolved by their id.
      export interface Env {
        // Contains [true] if this C++ identifier has been used already.
        // Populated at the beginning
        usedNames: StringMap<boolean>;

        // The names allocated to local variables in the current module.
        localNames: StringMap<string>;

        // Read-only. Used at the beginning to populate [usedNames] and to
        // resolve global names.
        globalNameMap: GlobalNameMap;

        // The name of the current library. If provided, the names from the
        // current module will be looked up in globalNameMap.libraries[l],
        // otherwise, in globalNameMap.program.
        libName: string;

        indent: string;

        // The current precedence level.
        priority: number;

        // A table of id's that have been promoted to ref-counted types (because
        // they were captured by a closure). Modified in an imperative manner.
        promotedIds: StringMap<boolean>;
      }

      export function setPriority(e: Env, p: number): Env {
        return {
          usedNames: e.usedNames,
          localNames: e.localNames,
          globalNameMap: e.globalNameMap,
          libName: e.libName,
          priority: p,
          indent: e.indent,
          promotedIds: e.promotedIds,
        };
      }

      export function priority(e: Env): number {
        return e.priority;
      }

      export function resetPriority(e: Env): Env {
        return setPriority(e, 16);
      }

      export function indent(e: Env): Env {
        return {
          usedNames: e.usedNames,
          localNames: e.localNames,
          globalNameMap: e.globalNameMap,
          libName: e.libName,
          priority: e.priority,
          indent: e.indent + "  ",
          promotedIds: e.promotedIds,
        };
      }

      export function markPromoted(e: Env, id: string) {
        e.promotedIds[id] = true;
      }

      export function isPromoted(e: Env, id: string) {
        return e.promotedIds[id];
      }

      export function emptyEnv(g: GlobalNameMap, libName: string): Env {
        var usedNames: StringMap<boolean> = {};
        var m = libName ? g.libraries[libName] : g.program;
        Object.keys(m).forEach((tdIdent: string) => {
          var cppIdent = m[tdIdent];
          usedNames[cppIdent] = true;
        });
        return {
          usedNames: usedNames,
          localNames: {},
          globalNameMap: g,
          libName: libName,
          indent: "",
          priority: 16,
          promotedIds: {},
        };
      }

      export function currentMap(e: Env) {
        return e.libName ? e.globalNameMap.libraries[e.libName] : e.globalNameMap.program;
      }

      // Converts a string into a valid C++ identifier. Unsafe unless you're
      // positive there won't be conflicts.
      export function mangle(name: string) {
        var candidate = name.replace(/\W/g, "_");
        if (candidate in cppKeywords)
          candidate += "_";
        else if (candidate.match(/^\d/))
          candidate = "_" + candidate;
        return candidate;
      }

      export function freshName(usedNames: StringMap<boolean>, name: string) {
        var i = 0;
        var suffix = <any> "";
        while (mangle(name+suffix) in usedNames)
          suffix = i++;
        return mangle(name+suffix);
      }

      // Return a unique name for a LOCAL, based on a user-provided, non-unique
      // name and a TouchDevelop-generated, unique id. The name is guaranteed to
      // be free of conflicts with other identifiers in the current library.
      export function resolveLocal(env: Env, name: string, id: string) {
        if (id in env.localNames)
          return env.localNames[id];

        var n = freshName(env.usedNames, name);
        env.usedNames[n] = true;
        env.localNames[id] = n;
        return n;
      }

      export function resolveLocalDef(env: Env, d: J.JLocalDef) {
        return resolveLocal(env, d.name, d.id);
      }

      export function resolveLocalRef(env: Env, d: J.JLocalRef) {
        return resolveLocal(env, d.name, <any> d.localId);
      }

      function resolveGlobalLN(env: Env, l: string, n: string) {
        // If the name has not been
        // pre-allocated, we assume it's a name of a pre-defined method that won't
        // cause a conflict (e.g.  "collection::index_of").
        if (n in env.globalNameMap.libraries[l])
          return env.globalNameMap.libraries[l][n];
        else
          return mangle(n);
      }

      // Resolve a global name from a library.
      export function resolveGlobalL(env: Env, l: string, n: string) {
        return mangle(l)+"::"+resolveGlobalLN(env, l, n);
      }

      // Resolve a global name from the current scope.
      export function resolveGlobal(e: Env, n: string) {
        // Same as above: if it's not found, it's probably one of the built-in
        // types which we don't track in our conflict resolution map because, as
        // crazy as TouchDevelop is, it doesn't define yet the types "Number$"
        // and "Number@".
        var m = currentMap(e);
        if (n in m)
          return m[n];
        else
          return n;
      }

      export function shouldPromoteToRef(e: Env, t: J.JTypeRef, isByRef: boolean) {
        return typeof t == "string" && isByRef;
      }


      // --- Helper functions.
      // For constructing / modifying AST nodes.

      export interface LibMap { [id: string]: string }

      export interface Type {
        lib: string;
        user: boolean;
        type: string;
        args: Type[];
      }

      function resolveStructuredTypeRef(libMap: LibMap, t: any): Type {
        if (typeof t == "string") {
          // Simple, flat type, e.g. "Number"
          return {
            lib: null,
            user: false,
            type: t,
            args: []
          };
        } else {
          if (!(t.o || t.g))
            throw new Error("Unsupported type reference");
          // Sophisticated type (prefixed by a library, or parameterized).
          return {
            lib: t.l ? libMap[t.l] : "",
            user: !!t.o,
            type: t.o || t.g,
            args: t.a && t.a.length
              ? t.a.map((x: J.JTypeRef) => resolveStructuredTypeRef(libMap, x))
              : []
          };
        }
      }

      // Resolve a type reference to either "t" (no scope for this type) or
      // "l::t" (reference to a library-defined type). If the former case, lib
      // is the empty string; in the latter case, lib is "l".
      export function resolveTypeRef(libMap: LibMap, typeRef: J.JTypeRef): Type {
        var s = <any> typeRef;
        if (s.length && s[0] == "{")
          return resolveStructuredTypeRef(libMap, JSON.parse(s));
        else
          return resolveStructuredTypeRef(libMap, s);
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

      function toCppType (env: Env, t: Type): string {
        var args = t.args.map((t: Type) => toCppType(env, t));
        var n = t.lib ? resolveGlobalLN(env, t.lib, t.type) : resolveGlobal(env, t.type);
        var r =
          (t.lib ? mangle(t.lib) + "::" : "") +
          (t.user ? "user_types::" : "") +
          n +
          (args.length ? "<" + args.join(", ") + ">" : "");
        return r;
      }

      export function mkType(env: Env, libMap: LibMap, type: J.JTypeRef) {
        return toCppType(env, resolveTypeRef(libMap, type));
      }

      export function mkParam(env: Env, libMap: LibMap, p: J.JLocalDef) {
        return mkType(env, libMap, p.type)+" "+resolveLocalDef(env, p);
      }

      export function mkSignature(env: Env, libMap: LibMap, name: string, inParams: J.JLocalDef[], outParams: J.JLocalDef[], isLambda=false) {
        if (outParams.length > 1)
          throw new Error("Not supported (multiple return parameters)");
        var retType = outParams.length ? mkType(env, libMap, outParams[0].type) : "void";
        var args = "(" + inParams.map(p => mkParam(env, libMap, p)).join(", ") + ")";
        if (isLambda)
          // Let the compiler infer the return type.
          return "[=] "+args+" mutable";
        else
          return retType + " " + name + args;
      }

      export function findTypeDef(env: Env, libMap: LibMap, inParams: J.JLocalDef[], outParams: J.JLocalDef[]) {
        if (!inParams.length && !outParams.length)
          return "Action";
        else if (inParams.length == 1 && !outParams.length)
          return "Action1<"+mkType(env, libMap, inParams[0].type)+">";
        else
          return mkSignature(env, libMap, "", inParams, outParams);
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

      export function isSingletonRef(e: J.JExpr): string {
        return (
          e.nodeType == "singletonRef" &&
          (<J.JSingletonRef> e).name
        );
      }

      export function isRecordConstructor(name: string, args: J.JExpr[]) {
        return (
          name == "create" &&
          args.length == 1 && args[0].nodeType == "call" &&
          <any> (<J.JCall> args[0]).parent == "records" &&
          (<J.JCall> args[0]).args.length == 1 &&
          isSingletonRef((<J.JCall> args[0]).args[0]) == "records"
        );
      }

      export function isEnumLiteral(e: J.JExpr): string {
        return (
          e.nodeType == "stringLiteral" &&
          (<J.JStringLiteral> e).enumValue
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

      export function isInvalidRecord(name: string, args: J.JExpr[]) {
        return (
          name == "invalid" &&
          args.length == 1 &&
          args[0].nodeType == "call" &&
          (<any> (<J.JCall> args[0]).parent) == "records" &&
          isSingletonRef((<J.JCall> args[0]).args[0]) == "records");
      }

      export function isInitialRecordAssignment(locals: J.JLocalDef[], expr: J.JExpr) {
        return (
          locals.length == 1 &&
          expr.nodeType == "call" &&
          (<J.JCall> expr).name == ":=" &&
          (<J.JCall> expr).args.length == 2 &&
          (<J.JCall> expr).args[1].nodeType == "call" &&
          isRecordConstructor(
            (<J.JCall> (<J.JCall> expr).args[1]).name,
            (<J.JCall> (<J.JCall> expr).args[1]).args) &&
          (<J.JCall> expr).args[0].nodeType == "localRef" &&
          (<J.JLocalRef> (<J.JCall> expr).args[0]).localId == <any> locals[0].id
        );
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
