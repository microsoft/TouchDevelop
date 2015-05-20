///<reference path='blockly.d.ts'/>
///<reference path='../../ast/jsonInterfaces.ts'/>

///////////////////////////////////////////////////////////////////////////////
//                A compiler from Blocky to TouchDevelop                     //
///////////////////////////////////////////////////////////////////////////////

import J = TDev.AST.Json;
import B = Blockly;

// A series of utility functions for constructing various J* AST nodes.
module Helpers {
  // Digits are operators...
  export function mkDigit(x: string): J.JOperator {
    return mkOp(x);
  }

  export function mkNumberLiteral(x: number): J.JNumberLiteral {
    return {
      nodeType: "numberLiteral",
      id: null,
      value: x
    };
  }

  export function mkBooleanLiteral(x: boolean): J.JBooleanLiteral {
    return {
      nodeType: "booleanLiteral",
      id: null,
      value: x
    };
  }

  export function mkStringLiteral(x: string): J.JStringLiteral {
    return {
      nodeType: "stringLiteral",
      id: null,
      value: x
    };
  }

  export function mkOp(x: string): J.JOperator {
    return {
      nodeType: "operator",
      id: null,
      op: x
    };
  }

  // A map from "classic" [JPropertyRef]s to their proper [parent].
  var knownPropertyRefs: { [index: string]: string } = {
    "post to wall": "String",
    ":=": "Unknown",
  };
  ["=", "≠", "<", "≤", ">", "≥", "+", "-", "/", "*"].forEach(x => knownPropertyRefs[x] = "Number");
  ["and", "or", "not"].forEach(x => knownPropertyRefs[x] = "Boolean");

  export function mkPropertyRef(x: string, p: string): J.JPropertyRef {
    return {
      nodeType: "propertyRef",
      id: null,
      name: x,
      parent: mkTypeRef(p),
    };
  }

  export function mkCall(name: string, parent: J.JTypeRef, args: J.JExpr[]): J.JCall {
    return {
        nodeType: "call",
        id: null,
        name: name,
        parent: parent,
        args: args,
        isExtensionMethod: false,
    };
  }

  var librarySymbol = "♻";
  var libraryName = "micro:bit";
  var librarySingleton = mkSingletonRef(librarySymbol);

  function mkSingletonRef(name: string): J.JSingletonRef {
    return {
      nodeType: "singletonRef",
      id: null,
      name: name.toLowerCase(),
      type: mkTypeRef(name)
    };
  }

  // A library "♻ foobar" is actually a call to the method "foobar" of the
  // global singleton object "♻".
  export function mkLibrary(name: string): J.JCall {
    return mkCall(name, mkTypeRef(librarySymbol), [librarySingleton]);
  }

  // Call function [name] from the standard device library with arguments
  // [args].
  export function stdCall(name: string, args: J.JExpr[], isExtensionMethod?: boolean): J.JCall {
    if (isExtensionMethod) {
      return mkCall(name, mkTypeRef("call"), args);
    } else {
      return mkCall(name, mkTypeRef(libraryName), [<J.JExpr> mkLibrary(libraryName)].concat(args));
    }
  }

  // Call a function from the Math library. Apparently, the Math library is a
  // different object than other libraries, so its AST representation is not the
  // same. Go figure.
  export function mathCall(name: string, args: J.JExpr[]): J.JCall {
    return mkCall(name, mkTypeRef("Math"), [<J.JExpr> mkSingletonRef("Math")].concat(args));
  }

  export function mkGlobalRef(name: string): J.JCall {
    return mkCall(name, mkTypeRef("data"), [mkSingletonRef("data")]);
  }

  // Assumes its parameter [p] is in the [knownPropertyRefs] table.
  export function mkSimpleCall(p: string, args: J.JExpr[]): J.JExpr {
    assert(knownPropertyRefs[p] != undefined);
    return mkCall(p, mkTypeRef(knownPropertyRefs[p]), args);
  }

  export function mkTypeRef(t: string): J.JTypeRef {
    // The interface is a lie -- actually, this type is just string.
    return <any> t;
  }

  export function mkLTypeRef(t: string): J.JTypeRef {
    return <any> JSON.stringify(<J.JLibraryType> { o: t, l: <any> "__DEVICE__" });
  }

  export function mkGTypeRef(t: string): J.JTypeRef {
    return <any> JSON.stringify(<J.JGenericTypeInstance> { g: t });
  }

  export function mkVarDecl(x: string, t: J.JTypeRef): J.JData {
    return {
      nodeType: "data",
      id: null,
      name: x,
      type: t,
      comment: "",
      isReadonly: false,
      isTransient: false,
      isCloudEnabled: false,
    };
  }

  // Generates a local definition for [x] at type [t]; this is not enough to
  // properly define a variable, though (see [mkDefAndAssign]).
  export function mkDef(x: string, t: J.JTypeRef): J.JLocalDef {
    return {
      nodeType: "localDef",
      id: null,
      name: x,
      type: t
    };
  }

  // Generates a reference to bound variable [x]
  export function mkLocalRef(x: string): J.JLocalRef {
    return {
      nodeType: "localRef",
      id: null,
      name: x,
      localId: null // same here
    }
  }

  // [defs] are the variables that this expression binds; this means that this
  // expression *introduces* new variables, whose scope runs until the end of
  // the parent block (see comments for [JExprHolder]).
  export function mkExprHolder(defs: J.JLocalDef[], tree: J.JExpr): J.JExprHolder {
    return {
      nodeType: "exprHolder",
      id: null,
      tokens: null,
      tree: tree,
      locals: defs,
    };
  }

  // Injection of expressions into statements is explicit in TouchDevelop.
  export function mkExprStmt(expr: J.JExprHolder): J.JExprStmt {
    return {
      nodeType: "exprStmt",
      id: null,
      expr: expr,
    };
  }

  // Refinement of the above function for [J.JInlineActions], a subclass of
  // [J.JExprStmt]
  export function mkInlineActions(actions: J.JInlineAction[], expr: J.JExprHolder): J.JInlineActions {
    return {
      nodeType: "inlineActions",
      id: null,
      actions: actions,
      expr: expr,
    };
  }

  export function mkWhile(condition: J.JExprHolder, body: J.JStmt[]): J.JWhile {
    return {
      nodeType: "while",
      id: null,
      condition: condition,
      body: body
    };
  }

  export function mkFor(index: string, bound: J.JExprHolder, body: J.JStmt[]): J.JFor {
    return {
      nodeType: "for",
      id: null,
      index: mkDef(index, mkTypeRef("Number")),
      body: body,
      bound: bound
    };
  }

  export function mkComment(text: string): J.JComment {
    return {
      nodeType: "comment",
      id: null,
      text: text
    };
  }

  // An if-statement that has no [else] branch.
  export function mkSimpleIf(condition: J.JExprHolder, thenBranch: J.JStmt[]): J.JIf {
    return {
      nodeType: "if",
      id: null,
      condition: condition,
      thenBody: thenBranch,
      elseBody: null,
      isElseIf: false,
    };
  }

  // This function takes care of generating an if node *and* de-constructing the
  // else branch to abide by the TouchDevelop representation (see comments in
  // [jsonInterfaces.ts]).
  export function mkIf(condition: J.JExprHolder, thenBranch: J.JStmt[], elseBranch: J.JStmt[]): J.JIf[] {
    var ifNode = mkSimpleIf(condition, thenBranch)

    // The transformation into a "flat" if / else if / else sequence is only
    // valid if the else branch it itself such a sequence.
    var fitForFlattening = elseBranch.length && elseBranch.every((s: J.JStmt, i: number) =>
      s.nodeType == "if" && (i == 0 || (<J.JIf> s).isElseIf)
    );
    if (fitForFlattening) {
      var first = <J.JIf> elseBranch[0];
      assert(!first.isElseIf);
      first.isElseIf = true;
      return [ifNode].concat(<J.JIf[]> elseBranch);
    } else {
      ifNode.elseBody = elseBranch;
      return [ifNode];
    }
  }

  export function mkAssign(x: J.JExpr, e: J.JExpr): J.JStmt {
    var assign = mkSimpleCall(":=", [x, e]);
    var expr = mkExprHolder([], assign);
    return mkExprStmt(expr);
  }

  // Generate the AST for:
  //   [var x: t := e]
  export function mkDefAndAssign(x: string, t: J.JTypeRef, e: J.JExpr): J.JStmt {
    var def: J.JLocalDef = mkDef(x, t);
    var assign = mkSimpleCall(":=", [mkLocalRef(x), e]);
    var expr = mkExprHolder([def], assign);
    return mkExprStmt(expr);
  }

  export function mkInlineAction(
    body: J.JStmt[],
    isImplicit: boolean,
    reference: J.JLocalDef,
    inParams: J.JLocalDef[] = [],
    outParams: J.JLocalDef[] = []): J.JInlineAction
  {
    return {
      nodeType: "inlineAction",
      id: null,
      body: body,
      inParameters: inParams,
      outParameters: outParams,
      locals: null,
      reference: reference,
      isImplicit: isImplicit,
      isOptional: false,
    }
  }

  export function mkAction(
    name: string,
    body: J.JStmt[],
    inParams: J.JLocalDef[] = [],
    outParams: J.JLocalDef[] = []): J.JAction
  {
    return {
      nodeType: "action",
      id: null,
      name: name,
      body: body,
      inParameters: inParams,
      outParameters: outParams,
      isPrivate: false,
      isOffline: false,
      isQuery: false,
      isTest: false,
      isAsync: true,
      description: "Action converted from a Blockly script",
    };
  }

  export function mkApp(name: string, description: string, decls: J.JDecl[]): J.JApp {
    return {
      nodeType: "app",
      id: null,

      textVersion: "v2.2,js,ctx,refs,localcloud,unicodemodel,allasync,upperplex",
      jsonVersion: "v0.1,resolved",

      name: name+" (converted)",
      comment: description,
      autoIcon: "",
      autoColor: "",

      platform: "current",
      isLibrary: false,
      allowExport: true,
      showAd: false,
      hasIds: false,
      rootId: "TODO",
      decls: decls,
      deletedDecls: <any> [],
    };
  }
}

import H = Helpers;

///////////////////////////////////////////////////////////////////////////////
// Miscellaneous utility functions
///////////////////////////////////////////////////////////////////////////////

// Mutate [a1] in place and append to it the elements from [a2].
function append <T> (a1: T[], a2: T[]) {
  a1.push.apply(a1, a2);
}

// A few wrappers for basic Block operations that throw errors when compilation
// is not possible. (The outer code catches these and highlights the relevant
// block.)

// Internal error (in our code). Compilation shouldn't proceed.
function assert(x: boolean) {
  if (!x)
    throw new Error("Assertion failure");
}

module Errors {

  export interface CompilationError {
    msg: string;
    block: B.Block;
  }

  var errors: CompilationError[] = [];

  export function report(m: string, b: B.Block) {
    errors.push({ msg: m, block: b });
  }

  export function clear() {
    errors = [];
  }

  export function get() {
    return errors;
  }

}

///////////////////////////////////////////////////////////////////////////////
// Types
//
// We slap a very simple type system on top of Blockly. This is needed to ensure
// we generate valid TouchDevelop code (otherwise compilation from TD to C++
// would not work).
///////////////////////////////////////////////////////////////////////////////

enum Type { Number = 1, Boolean, String, Image, Unit };

// Infers the expected type of an expression by looking at the untranslated
// block and figuring out, from the look of it, what type of expression it
// holds.
//
// XXX this is redundant since this information should be on blocks already --
// make sure all blocks have the right "setCheck" calls and discard this
// function.
function inferType(e: Environment, b: B.Block): Type {
  if (b.type in stdCallTable)
    return stdCallTable[b.type].f.type;

  switch (b.type) {
    case "math_number":
    case "math_op2":
    case "math_op3":
    case "math_arithmetic":
      return Type.Number;
    case "logic_operation":
    case "logic_compare":
    case "logic_boolean":
    case "logic_negate":
      return Type.Boolean;
    case "text":
      return Type.String;
    case "device_build_image":
    case "device_build_big_image":
      return Type.Image;
    case "variables_get":
      var binding = lookup(e, b.getFieldValue("VAR"));
      if (binding)
        return binding.type;
      else
        return null;
  }
  return null;
}

function toTdType(t: Type) {
  switch (t) {
    case Type.Number:
      return H.mkTypeRef("Number");
    case Type.Boolean:
      return H.mkTypeRef("Boolean");
    case Type.String:
      return H.mkTypeRef("String");
    case Type.Image:
      return H.mkLTypeRef("image");
    case Type.Unit:
      throw new Error("Cannot convert unit");
  }
}

///////////////////////////////////////////////////////////////////////////////
// Expressions
//
// Expressions are now directly compiled as a tree. This requires knowing, for
// each property ref, the right value for its [parent] property.
///////////////////////////////////////////////////////////////////////////////

function extractNumber(b: B.Block) {
  return parseInt(b.getFieldValue("NUM"));
}

function compileNumber(e: Environment, b: B.Block): J.JExpr {
  return H.mkNumberLiteral(extractNumber(b));
}

var opToTok: { [index: string]: string } = {
  // POWER gets a special treatment because there's no operator for it in
  // TouchDevelop
  "ADD": "+",
  "MINUS": "-",
  "MULTIPLY": "*",
  "DIVIDE": "/",
  "EQ":  "=",
  "NEQ": "≠",
  "LT":  "<",
  "LTE": "≤",
  "GT": ">",
  "GTE": "≥",
  "AND": "and",
  "OR": "or",
};


function compileArithmetic(e: Environment, b: B.Block, t: Type): J.JExpr {
  var bOp = b.getFieldValue("OP");
  var left = b.getInputTargetBlock("A");
  var right = b.getInputTargetBlock("B");
  var args = [compileExpression(e, left, t), compileExpression(e, right, t)];
  if (bOp == "POWER")
    return H.mathCall("pow", args);
  else
    return H.mkSimpleCall(opToTok[bOp], args);
}

function compileMathOp2(e: Environment, b: B.Block): J.JExpr {
  var op = b.getFieldValue("op");
  var x = compileExpression(e, b.getInputTargetBlock("x"), Type.Number);
  var y = compileExpression(e, b.getInputTargetBlock("y"), Type.Number);
  return H.mathCall(op, [x, y]);
}

function compileMathOp3(e: Environment, b: B.Block): J.JExpr {
  var x = compileExpression(e, b.getInputTargetBlock("x"), Type.Number);
  return H.mathCall("abs", [x]);
}

function compileVariableGet(e: Environment, b: B.Block, t?: Type): J.JExpr {
  var name = b.getFieldValue("VAR");
  var binding = lookup(e, name);
  assert(binding != null);
  if (t != null && t != binding.type)
    throw new Error("Type mismatch");
  return isCompiledAsLocal(binding) ? H.mkLocalRef(name) : H.mkGlobalRef(name);
}

function compileText(e: Environment, b: B.Block): J.JExpr {
  return H.mkStringLiteral(b.getFieldValue("TEXT"));
}

function compileBoolean(e: Environment, b: B.Block): J.JExpr {
  return H.mkBooleanLiteral(b.getFieldValue("BOOL") == "TRUE");
}

function compileNot(e: Environment, b: B.Block): J.JExpr {
  var expr = compileExpression(e, b.getInputTargetBlock("BOOL"), Type.Boolean);
  return H.mkSimpleCall("not", [expr]);
}

function defaultValueForType(t: Type): J.JExpr {
  switch (t) {
    case Type.Boolean:
      return H.mkBooleanLiteral(false);
    case Type.Number:
      return H.mkNumberLiteral(0);
    case Type.String:
      return H.mkStringLiteral("");
  }
  throw new Error("No default value for type");
}

// [t] is the expected type; in case the block was actually not there (i.e.
// [b == null]), we may be able to provide a default value.
function compileExpression(e: Environment, b: B.Block, t: Type): J.JExpr {
  // Happens if we couldn't infer the type for a variable.
  if (t == null)
    throw new Error("No type for subexpression");

  if (b == null)
    return defaultValueForType(t);

  if (t != inferType(e, b))
    throw new Error("Type mismatch");

  switch (b.type) {
    case "math_number":
      return compileNumber(e, b);
    case "math_op2":
      return compileMathOp2(e, b);
    case "math_op3":
      return compileMathOp3(e, b);
    case "math_arithmetic":
    case "logic_compare":
      return compileArithmetic(e, b, Type.Number);
    case "logic_operation":
      return compileArithmetic(e, b, Type.Boolean);
    case "logic_boolean":
      return compileBoolean(e, b);
    case "logic_negate":
      return compileNot(e, b);
    case "variables_get":
      return compileVariableGet(e, b, t);
    case "text":
      return compileText(e, b);
    case 'device_build_image':
        return compileBuildImage(e, b, false);
    case 'device_build_big_image':
        return compileBuildImage(e, b, true);
    default:
      if (b.type in stdCallTable)
        return compileStdCall(e, b, stdCallTable[b.type]);
      else {
        console.error("Unable to compile expression: "+b.type);
        return defaultValueForType(t);
      }
  }
}

///////////////////////////////////////////////////////////////////////////////
// Environments
///////////////////////////////////////////////////////////////////////////////

// Environments are persistent.

interface Environment {
  bindings: Binding[];
}

interface Binding {
  name: string;
  type: Type;
  isForVariable?: boolean;
  incompatibleWithFor?: boolean;
}

function isCompiledAsLocal(b: Binding) {
  return b.isForVariable && !b.incompatibleWithFor;
}

function extend(e: Environment, x: string, t: Type): Environment {
  assert(lookup(e, x) == null);
  return {
    bindings: [{ name: x, type: t }].concat(e.bindings)
  };
}

function lookup(e: Environment, n: string): Binding {
  for (var i = 0; i < e.bindings.length; ++i)
    if (e.bindings[i].name == n)
      return e.bindings[i];
  return null;
}

var empty: Environment = {
  bindings: []
};

///////////////////////////////////////////////////////////////////////////////
// Statements
///////////////////////////////////////////////////////////////////////////////

function compileControlsIf(e: Environment, b: B.IfBlock): J.JStmt[] {
  var stmts: J.JIf[] = [];
  for (var i = 0; i <= b.elseifCount_; ++i) {
    var cond = compileExpression(e, b.getInputTargetBlock("IF"+i), Type.Boolean);
    var thenBranch = compileStatements(e, b.getInputTargetBlock("DO"+i));
    stmts.push(H.mkSimpleIf(H.mkExprHolder([], cond), thenBranch));
    if (i > 0)
      stmts[stmts.length - 1].isElseIf = true;
  }
  if (b.elseCount_) {
    stmts[stmts.length - 1].elseBody = compileStatements(e, b.getInputTargetBlock("ELSE"));
  }
  return stmts;
}

function isClassicForLoop(bBy: B.Block, bFrom: B.Block) {
  return bBy.type.match(/^math_number/) && extractNumber(bBy) == 1 &&
    bFrom.type.match(/^math_number/) && extractNumber(bFrom) == 0;
}

function compileControlsFor(e: Environment, b: B.Block): J.JStmt[] {
  var bVar = b.getFieldValue("VAR");
  var bFrom = b.getInputTargetBlock("FROM");
  var bTo = b.getInputTargetBlock("TO");
  var bBy = b.getInputTargetBlock("BY");
  var bDo = b.getInputTargetBlock("DO");

  var binding = lookup(e, bVar);
  assert(binding.isForVariable);

  if (isClassicForLoop(bBy, bFrom) && !binding.incompatibleWithFor)
    // In the perfect case, we can do a local binding that declares a local
    // variable. There is also a leftover global variable by the same name that
    // we don't use. XXX optimize and flag that one for removal?
    return [H.mkFor(bVar, H.mkExprHolder([], compileExpression(e, bTo, Type.Number)), compileStatements(e, bDo))];
  else
    return [
      // VAR = FROM
      H.mkAssign(H.mkGlobalRef(bVar), compileExpression(e, bFrom, Type.Number)),
      // while
      H.mkWhile(
        // VAR <= TO
        H.mkExprHolder([],
          H.mkSimpleCall("≤", [H.mkGlobalRef(bVar), compileExpression(e, bTo, Type.Number)])),
        // DO
        compileStatements(e, bDo).concat([
          H.mkExprStmt(
            H.mkExprHolder([],
              // VAR :=
              H.mkSimpleCall(":=", [H.mkGlobalRef(bVar),
                // VAR + BY
                H.mkSimpleCall("+", [H.mkGlobalRef(bVar), compileExpression(e, bBy, Type.Number)])])))]))
    ];
}

function compileControlsRepeat(e: Environment, b: B.Block): J.JStmt {
  var bound = compileExpression(e, b.getInputTargetBlock("TIMES"), Type.Number);
  var body = compileStatements(e, b.getInputTargetBlock("DO"));
  return H.mkFor("__unused_index", H.mkExprHolder([], bound), body);
}

function compileWhile(e: Environment, b: B.Block): J.JStmt {
  var cond = compileExpression(e, b.getInputTargetBlock("COND"), Type.Boolean);
  var body = compileStatements(e, b.getInputTargetBlock("DO"));
  return H.mkWhile(H.mkExprHolder([], cond), body);
}

function compileForever(e: Environment, b: B.Block): J.JStmt {
  var bBody = b.getInputTargetBlock("HANDLER");
  var body = compileStatements(e, bBody);
  return mkCallWithCallback(e, "forever", [], body);
}

function compilePrint(e: Environment, b: B.Block): J.JStmt {
  var text = compileExpression(e, b.getInputTargetBlock("TEXT"), Type.String);
  return H.mkExprStmt(H.mkExprHolder([], H.mkSimpleCall("post to wall", [text])));
}

function compileSet(e: Environment, b: B.Block): J.JStmt {
  var bVar = b.getFieldValue("VAR");
  var bExpr = b.getInputTargetBlock("VALUE");
  var binding = lookup(e, bVar);
  var expr = compileExpression(e, bExpr, binding.type);
  var ref = isCompiledAsLocal(binding) ? H.mkLocalRef(bVar) : H.mkGlobalRef(bVar);
  return H.mkExprStmt(H.mkExprHolder([], H.mkSimpleCall(":=", [ref, expr])));
}

function compileStdCall(e: Environment, b: B.Block, func: StdFunc) {
  var args = func.args.map((x: Param) => {
    var f = b.getFieldValue(x.name);
    if (f) {
      assert(x.type == Type.String);
      return H.mkStringLiteral(f);
    } else
      return compileExpression(e, b.getInputTargetBlock(x.name), x.type)
  });
  return H.stdCall(func.f.name, args, func.isExtensionMethod);
}

function compileStdBlock(e: Environment, b: B.Block, f: StdFunc) {
  return H.mkExprStmt(H.mkExprHolder([], compileStdCall(e, b, f)));
}

function compileComment(e: Environment, b: B.Block): J.JStmt {
  var arg = compileExpression(e, b.getInputTargetBlock("comment"), Type.String);
  assert(arg.nodeType == "stringLiteral");
  return H.mkComment((<J.JStringLiteral> arg).value);
}

function mkCallWithCallback(e: Environment, f: string, args: J.JExpr[], body: J.JStmt[]): J.JStmt {
  var def = H.mkDef("_body_", H.mkGTypeRef("Action"));
  return H.mkInlineActions(
    [ H.mkInlineAction(body, true, def) ],
    H.mkExprHolder(
      [ def ],
      H.stdCall(f, args)));
}

function compileButtonEvent(e: Environment, b: B.Block): J.JStmt {
  var bBody = b.getInputTargetBlock("HANDLER");
  var name = H.mkStringLiteral(b.getFieldValue("NAME"));
  var body = compileStatements(e, bBody);
  return mkCallWithCallback(e, "on button pressed", [name], body);
}

function compileBuildImage(e: Environment, b: B.Block, big: boolean): J.JCall {
  var state = "";
  var rows = 5;
  var columns = big ? 10 : 5;
  for (var i = 0; i < rows; ++i) {
    if (i > 0)
      state += '\n';
    for (var j = 0; j < columns; ++j) {
      if (j > 0)
        state += ' ';
      state += /TRUE/.test(b.getFieldValue("LED" + j + i)) ? "1" : "0";
    }
  }
  return H.stdCall("make image", [H.mkStringLiteral(state)]);
}

interface Param {
  type: Type;
  name: string;
}

var p = (x: string, t: Type) => ({ type: t, name: x });

// A typed description of each function from the "device library". This would
// probably be more readable with a DSL, but let's use that for now. Each entry
// in [stdCallTable] is as follows:
// - the key is the name of the Blockly.Block that we compile into a device call;
// - [f] is a pair of the TouchDevelop function name and its Blockly return type;
// - [args] is a list of pairs of name and a Blockly type; the name is taken to
//   be either the name of a Blockly field value or, if not found, the name of a
//   Blockly input block; if a field value is found, then the type must be
//   [String]
// - [isExtensionMethod] is a flag so that instead of generating a TouchDevelop
//   call like [f(x, y...)], we generate the more "natural" [x → f (y...)]
interface StdFunc {
  f: Param;
  args: Param[];
  isExtensionMethod?: boolean
}

// XXX this is also redundant since, again, we should be able to recover that
// information by looking at the input block / field value to infer that
var stdCallTable: { [blockType: string]: StdFunc } = {
  device_clear_display: {
    f: p("clear screen", Type.Unit),
    args: []
  },
  device_show_number: {
    f: p("show number", Type.Unit),
    args: [ p("number", Type.Number) ]
  },
  device_show_letter: {
    f: p("show letter", Type.Unit),
    args: [ p("letter", Type.String) ]
  },
  device_pause: {
    f: p("pause", Type.Unit),
    args: [ p("pause", Type.Number) ]
  },
  device_print_message: {
    f: p("print string", Type.Unit),
    args: [ p("message", Type.String), p("pausetime", Type.Number) ]
  },
  device_plot: {
    f: p("plot", Type.Unit),
    args: [ p("x", Type.Number), p("y", Type.Number) ]
  },
  device_unplot: {
    f: p("unplot", Type.Unit),
    args: [ p("x", Type.Number), p("y", Type.Number) ]
  },
  device_point: {
    f: p("point", Type.Boolean),
    args: [ p("x", Type.Number), p("y", Type.Number) ]
  },
  device_heading: {
    f: p("compass heading", Type.Number),
    args: []
  },
  device_make_StringImage: {
    f: p("make string image", Type.Image),
    args: [ p("NAME", Type.String) ]
  },
  device_scroll_image: {
    f: p("scroll image", Type.Unit),
    args: [ p("sprite", Type.Image), p("x", Type.Number), p("delay", Type.Number) ],
    isExtensionMethod: true
  },
  device_show_image_offset: {
    f: p("show image", Type.Unit),
    args: [ p("sprite", Type.Image), p("x", Type.Number), p("y", Type.Number) ],
    isExtensionMethod: true
  },
  device_get_button: {
    f: p("button is pressed", Type.Boolean),
    args: [ p("NAME", Type.String) ]
  },
  device_get_acceleration: {
    f: p("acceleration", Type.Number),
    args: [ p("NAME", Type.String) ]
  },
  device_get_digital_pin: {
    f: p("digital read pin", Type.Number),
    args: [ p("name", Type.String) ]
  },
  device_set_digital_pin: {
    f: p("digital write pin", Type.Unit),
    args: [ p("name", Type.String), p("value", Type.Number) ]
  },
  device_get_analog_pin: {
    f: p("analog read pin", Type.Number),
    args: [ p("name", Type.String) ]
  },
  device_set_analog_pin: {
    f: p("analog write pin", Type.Unit),
    args: [ p("name", Type.String), p("value", Type.Number) ]
  },
  device_get_brightness: {
    f: p("brightness", Type.Number),
    args: []
  },
  device_set_brightness: {
    f: p("set brightness", Type.Unit),
    args: [ p("value", Type.Number) ]
  },
}

function compileStatements(e: Environment, b: B.Block): J.JStmt[] {
  if (b == null)
    return [];

  var stmts: J.JStmt[] = [];
  while (b) {
    try {
      switch (b.type) {
        case 'controls_if':
          append(stmts, compileControlsIf(e, <B.IfBlock> b));
          break;

        case 'controls_for':
          append(stmts, compileControlsFor(e, b));
          break;

        case 'text_print':
          stmts.push(compilePrint(e, b));
          break;

        case 'variables_set':
          stmts.push(compileSet(e, b));
          break;

        case 'device_comment':
          stmts.push(compileComment(e, b));
          break;

        case 'device_forever':
          stmts.push(compileForever(e, b));
          break;

        case 'controls_repeat_ext':
          stmts.push(compileControlsRepeat(e, b));
          break;

        case 'device_while':
          stmts.push(compileWhile(e, b));
          break;

        case 'device_button_event':
          stmts.push(compileButtonEvent(e, b));
          break;

        default:
          if (b.type in stdCallTable)
            stmts.push(compileStdBlock(e, b, stdCallTable[b.type]));
          else
            console.log("Not generating code for (not a statement / not supported): "+b.type);
      }
    } catch (e) {
      Errors.report(e+"", b);
    }
    b = b.getNextBlock();
  }
  return stmts;
}

///////////////////////////////////////////////////////////////////////////////

// Top-level definitions for compiling an entire blockly workspace

interface CompileOptions {
  name: string;
  description: string;
}

function isHandlerRegistration(b: B.Block) {
  return b.type == "device_button_event";
}

// Find the parent (as in "scope" parent) of a Block. The [parentNode_] property
// will return the visual parent, that is, the one connected to the top of the
// block.
function findParent(b: B.Block) {
  var candidate = b.parentBlock_;
  if (!candidate)
    return null;
  var isActualInput = false;
  candidate.inputList.forEach((i: B.Input) => {
    if (i.name && candidate.getInputTargetBlock(i.name) == b)
      isActualInput = true;
  });
  return isActualInput && candidate || null;
}

// This function only considers assignments, not dereferences, to infer the type
// of variables. This is ok: what we want is essentially convince ourselves that
// we always *write* values of the correct type in the variable, as *reads* are
// checked later on when type-checking expressions, where the expected type is
// propagated down.
function mkEnv(w: B.Workspace): Environment {
  // The to-be-returned environment.
  var e = empty;

  // First pass: collect loop variables, and mark them as such.
  w.getAllBlocks().forEach((b: B.Block) => {
    if (b.type == "controls_for") {
      var x = b.getFieldValue("VAR");
      // It's ok for two loops to share the same variable.
      if (lookup(e, x) == null)
        e = extend(e, x, Type.Number);
      lookup(e, x).isForVariable = true;
    }
  });

  // Auxiliary check: check that all references to a for-bound variable are in
  // scope
  var variableIsScoped = (b: B.Block, name: string): boolean => {
    if (!b)
      return false;
    else if (b.type == "controls_for" && b.getFieldValue("VAR") == name)
      return true;
    else
      return variableIsScoped(findParent(b), name);
  };

  // This is really a dumb way to do type-inference, but well, I don't expect
  // users to write terribly complicated programs (famous last words?).
  var notInferred = 0;
  var oneRound = () => {
    var notInferred = 0;
    // Second pass: try to infer the type of each binding if we can. If a loop
    // variable is assigned elsewhere, flag it, because it means we won't be
    // able to compile it as a TouchDevelop for-loop.
    w.getAllBlocks().forEach((b: B.Block) => {
      if (b.type == "variables_set") {
        // If this is something we won't know how to compile, don't bother. Error
        // will be flagged later.
        var t = inferType(e, b.getInputTargetBlock("VALUE"));
        if (t == null) {
          notInferred++;
          return;
        }

        // Add a binding, if needed. The strategy is "first type we can infer
        // wins". Again, errors will be flagged later when compiling an
        // assignment.
        var x = b.getFieldValue("VAR");
        var binding = lookup(e, x);
        if (!binding)
          e = extend(e, x, t);
        else if (binding && binding.isForVariable)
          binding.incompatibleWithFor = true;
      } else if (b.type == "variables_get") {
        var x = b.getFieldValue("VAR");
        var binding = lookup(e, x);
        // Because of the order of the traversal in [getAllBlocks()]
        assert(binding != null);
        if (binding.isForVariable && !variableIsScoped(b, x))
          binding.incompatibleWithFor = true;
      }
    });
    return notInferred;
  };

  // Fixpoint computation.
  while (notInferred != (notInferred = oneRound()));

  return e;
}

function compileWorkspace(b: B.Workspace, options: CompileOptions): J.JApp {
  var decls: J.JDecl[] = [];
  var e = mkEnv(b);
  e.bindings.forEach((b: Binding) => {
    if (!isCompiledAsLocal(b)) {
      decls.push(H.mkVarDecl(b.name, toTdType(b.type)));
    }
  });

  // [stmtsHandlers] contains calls to register event handlers. They must be
  // executed before the code that goes in the main function, as that latter
  // code may block, and prevent the event handler from being registered.
  var stmtsHandlers: J.JStmt[] = [];
  var stmtsMain: J.JStmt[] = [];
  b.getTopBlocks(true).forEach((b: B.Block) => {
    if (isHandlerRegistration(b))
      append(stmtsHandlers, compileStatements(e, b));
    else
      append(stmtsMain, compileStatements(e, b));
  });

  decls.push(H.mkAction("main", stmtsHandlers.concat(stmtsMain), [], []));

  return H.mkApp(options.name, options.description, decls);
}

function compile(b: B.Workspace, options: CompileOptions): J.JApp {
  Errors.clear();
  return compileWorkspace(b, options);
}

// vim: set ts=2 sw=2 sts=2:
