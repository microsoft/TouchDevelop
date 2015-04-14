///<reference path='../refs.ts'/>

module TDev {

  export module Microbit {

    import J = AST.Json

    export module Helpers {
      var kStringType = "shared_ptr<string>";

      // Compute a unique name from a user-provided name and a
      // TouchDevelop-generated unique id.
      function mangle(name: string, id: string) {
          return name + id;
      }

      export function mangleDef(d: J.JLocalDef) {
          return mangle(d.name, d.id);
      }

      export function mangleRef(d: J.JLocalRef) {
          return mangle(d.name, <any> d.localId);
      }

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
    }
  }
}
