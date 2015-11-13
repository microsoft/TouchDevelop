///<reference path='refs.ts'/>

// The main driver for C++ compilation: for each program, loads the libraries it
// depends on, compiles said libraries, compiles the main program, and stitches
// the various part together.

module TDev {
  import J = AST.Json

  export module Embedded {

    import H = Helpers

    interface StringMap<T> {
      [index: string]: T;
    }

    export function parseScript(text: string): Promise { // of AST.App
      return AST.loadScriptAsync((id: string) => {
        if (id == "")
          return Promise.as(text);
        else
          return World.getAnyScriptAsync(id);
      }, "").then((resp: AST.LoadScriptResult) => {
        // Otherwise, eventually, this will result in our script being
        // saved in the TouchDevelop format...
        var s = Script;
        Script = null;
        // The function writes its result in a global
        return Promise.as(s);
      });
    }

    export function makeOutMbedErrorMsg(json: any) {
      var errorMsg = "unknown error";
      // This JSON format is *very* unstructured...
      if (json.mbedresponse) {
        if (json.messages) {
          var messages = json.messages.filter(m =>
            m.severity == "error" || m.type == "Error"
          );
          errorMsg = messages.map(m => m.message + "\n" + m.text).join("\n");
        } else if (json.mbedresponse.result) {
          errorMsg = json.mbedresponse.result.exception;
        }
      }
      return errorMsg;
    }

    interface EmitterOutput {
      prototypes: string;
      code: string;
      tPrototypes: string;
      tCode: string;
      prelude: string;
    };

    // Assuming all library references have been resolved, compile either the
    // main app or one of said libraries.
    function compile1(globalNameMap: H.GlobalNameMap, libs: J.JApp[], resolveMap: StringMap<string>, a: J.JApp): EmitterOutput
    {
      try {
        var libRef: J.JCall = H.mkLibraryRef(a.name);
        var libName = a.isLibrary ? a.name : null;

        var env = H.emptyEnv(globalNameMap, libName);
        lift(env, a);
        var e = new Emitter(libRef, libs, resolveMap);
        e.visit(env, a);
        return e;
      } catch (e) {
        console.error("Compilation error", e);
        throw e;
      }
    }

    function buildResolveMap(libs: J.JLibrary[]): { [index: string]: string }[] {
      var idToAbsoluteName = {};
      libs.map((l: J.JLibrary) => {
        idToAbsoluteName[l.id] = l.name;
      });
      return libs.map((l: J.JLibrary) => {
        var map: { [i:string]: string } = {};
        l.resolveClauses.map((r: J.JResolveClause) => {
          map[r.name] = idToAbsoluteName[<any> r.defaultLibId];
        });
        return map;
      });
    }

    // When assigning names to function definitions, we must make sure they
    // don't clash with any of the existing symbols. This is not an issue for
    // local variables.
    var reservedNames = [
      // Namespaces from microbit-touchdevelop/MicroBitTouchDevelop.h
      "user_types", "globals", "create", "collection", "touch_develop", "ref",
      "ds1307", "string", "action", "math", "number", "boolean", "bits", "internal_main",

      // Types
      "Number", "Boolean", "String", "ManagedString", "Collection",
      "Collection_of", "Ref", "TdError", "DalAdapter", "MicroBitPin",
    ];

    // Compile an entire program, including its libraries.
    export function compile(a: J.JApp): Promise { // of string
      // We need the library text for all the libraries referenced by this
      // script.
      var libraries = a.decls.filter((d: J.JDecl) => d.nodeType == "library");
      var resolveMap = buildResolveMap(<J.JLibrary[]> libraries);
      var mainResolveMap: StringMap<string> = {};
      var textPromises = libraries.map((j: J.JDecl, i: number) => {
        var pubId = (<J.JLibrary> j).libIdentifier;
        return AST.loadScriptAsync(World.getAnyScriptAsync, pubId).then((resp: AST.LoadScriptResult) => {
          var s = Script;
          Script = resp.prevScript;
          var jApp = J.dump(s);
          mainResolveMap[libraries[i].name] = jApp.name;
          return Promise.as(jApp);
        });
      });
      textPromises.push(Promise.as(a));
      return Promise.join(textPromises).then((everything: J.JApp[]) => {
        // Consider the following situation. The main script binds [libA] as
        // [libA']. The main script binds [libB] as [libB], but [libB] binds
        // [libA] as [libA'']. Right now, the [resolveMap] for [libB] maps
        // [libA] to [libA']. We need to use [mainResolveMap] (which maps
        // [libA'] to [libA'']) to fix [resolveMap] so that it maps [libA''] to
        // [libA].
        Object.keys(resolveMap).forEach((libName: string) => {
          var libMap = resolveMap[libName];
          Object.keys(libMap).forEach((x: string) => {
            libMap[x] = mainResolveMap[libMap[x]];
          });
        });
        // And now the main map for the main script.
        resolveMap.push(mainResolveMap);
        // TouchDevelop allows any name; thus, both "Thing$" and "Thing@" sanitize
        // to "Thing_". We need to disambuigate them. Because there may be
        // references across library to these names, we need to agree on a final
        // name before translating the various libraries.
        var globalNameMap: H.GlobalNameMap = {
          libraries: {},
          program: null,
        };
        everything.forEach((a: J.JApp) => {
          var tdToCpp: StringMap<string> = {};
          var cppToTd: StringMap<boolean> = {};
          // Avoid conflicts by pre-marking reserved names.
          everything.map((a: J.JApp) => H.mangle(a.name)).concat(reservedNames)
            .forEach((x: string) => cppToTd[x] = true);
          a.decls.forEach((d: J.JDecl) => {
            // This is over-conservative, since technically speaking, types and
            // globals are each in their own namespace. Here, we
            // over-approximate and treat things as if everyone were in the same
            // namespace.
            var n = H.freshName(cppToTd, d.name);
            cppToTd[n] = true;
            tdToCpp[d.name] = n;
          });
          // TODO we should be doing the same thing for libraries, in case the
          // user has two libraries that desugar to the same name... not going
          // to happen?
          // This is the "real" name of the library (which may be different from
          // the "known here as"... name).
          if (a.isLibrary)
            globalNameMap.libraries[a.name] = tdToCpp;
          else
            globalNameMap.program = tdToCpp;
        });

        var compiled = everything.map((a: J.JApp, i: number) => compile1(globalNameMap, everything, resolveMap[i], a));
        return Promise.as(
          compiled.map(x => x.prelude)
          .concat(["namespace touch_develop {"])
            .concat(compiled.map(x => x.tPrototypes))
            .concat(compiled.map(x => x.tCode))
            .concat(compiled.map(x => x.prototypes))
            .concat(compiled.map(x => x.code))
          .concat(["}"])
          .filter(x => x != "")
          .join("\n") + "\n" +
          (a.isLibrary
            ? "\nvoid app_main() {\n"+
              "  uBit.display.scroll(\"Error: trying to run a library\");\n"+
              "}\n"
            : "\nvoid app_main() {\n"+
              "  touch_develop::main();\n"+
              "}\n") + "\n\n// vim: sw=2 ts=2"
        );
      });
    }
  }
}

// vim: set ts=2 sw=2 sts=2:
