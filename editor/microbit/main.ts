///<reference path='../refs.ts'/>

module TDev {
  import J = AST.Json


  export module Microbit {

    interface ResolvedLibrary {
      isShim: boolean;
      ast: J.JApp;
    }

    // Assuming all library references have been resolved, compile either the
    // main app or one of said libraries.
    function compile1(libs: J.JApp[], a: J.JApp): { prototypes: string; code: string } {
      lift(a);
      var e = new Emitter(libs);
      e.visit(emptyEnv, a);
      return e;
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
        var prototypes = [];
        var code = [];
        libs.concat([a]).forEach((a: J.JApp) => {
          var r = compile1(libs, a);
          if (r.prototypes)
            prototypes.push(r.prototypes);
          if (r.code)
            code.push(r.code);
        });
        return Promise.as(prototypes.join("\n") + "\n\n" + code.join("\n"));
      });
    }
  }
}

// vim: set ts=2 sw=2 sts=2:
