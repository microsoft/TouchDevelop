///<reference path='refs.ts'/>

// The main driver for C++ compilation: for each program, loads the libraries it
// depends on, compiles said libraries, compiles the main program, and stitches
// the various part together.

module TDev {
  import J = AST.Json

  export module Embedded {

    import H = Helpers

    // Assuming all library references have been resolved, compile either the
    // main app or one of said libraries.
    function compile1(libs: J.JApp[], a: J.JApp): { prototypes: string; code: string; prelude: string; libName: string } {
      var i = libs.indexOf(a);
      var libRef: J.JCall = null;
      if (i >= 0) {
        libRef = H.mkLibraryRef(libs[i].name);
      }

      try {
        lift(a);
        var libName = i >= 0 ? H.mangleName(libs[i].name) : null;
        var e = new Emitter(libRef, libName, libs);
        e.visit(i >= 0 ? indent(emptyEnv) : emptyEnv, a);
        return e;
      } catch (e) {
        console.error("Compilation error", e);
        throw e;
      }
    }

    // Compile an entire program, including its libraries.
    export function compile(a: J.JApp): Promise { // of string
      // We need the library text for all the libraries referenced by this
      // script.
      var libraries = a.decls.filter((d: J.JDecl) => d.nodeType == "library");
      var textPromises = libraries.map((j: J.JDecl) => {
        var pubId = (<J.JLibrary> j).libIdentifier;
        return AST.loadScriptAsync(World.getAnyScriptAsync, pubId).then((resp: AST.LoadScriptResult) => {
          var s = Script;
          Script = resp.prevScript;
          return Promise.as(J.dump(s));
        });
      });
      return Promise.join(textPromises).then((libs: J.JApp[]) => {
        var compiled = libs.concat([a]).map((a: J.JApp) => compile1(libs, a));
        var wrapNamespaceIf = (x: { libName: string }, s: string) => {
          if (x.libName != null)
            return "namespace "+x.libName+" {\n"+
              s+
            "\n}";
          else
            return s;
        };
        return Promise.as(
                  compiled.map(x => x.prelude)
          .concat(compiled.map(x => wrapNamespaceIf(x, x.prototypes)))
          .concat(compiled.map(x => wrapNamespaceIf(x, x.code)))
          .filter(x => x != "")
          .join("\n")
        );
      });
    }
  }
}

// vim: set ts=2 sw=2 sts=2:
