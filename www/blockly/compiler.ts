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
    };
  }

  var librarySymbol = "♻";
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
      return mkCall(name, mkTypeRef("device"), [<J.JExpr> mkLibrary("device")].concat(args));
    }
  }

  // Call a function from the Math library. Apparently, the Math library is a
  // different object than other libraries, so its AST representation is not the
  // same. Go figure.
  export function mathCall(name: string, args: J.JExpr[]): J.JCall {
    return mkCall(name, mkTypeRef("Math"), [<J.JExpr> mkSingletonRef("Math")].concat(args));
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

  export function mkGTypeRef(t: string): J.JTypeRef {
    return <any> JSON.stringify(<J.JGenericTypeInstance> { g: t });
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

  export function mkApp(name: string, description: string, actions: J.JAction[]): J.JApp {
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
      decls: actions,
      deletedDecls: <any> [],
    };
  }
}

import H = Helpers;

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

// Infers the expected type of an expression by looking at the untranslated
// block and figuring out, from the look of it, what type of expression it
// holds.
function inferType(e: Environment, b: B.Block): J.JTypeRef {
  switch (b.type) {
    case "math_number":
    case "math_number1":
    case "math_arithmetic":
      return H.mkTypeRef("Number");
    case "logic_operation":
    case "logic_compare":
    case "logic_boolean":
    case "logic_negate":
      return H.mkTypeRef("Boolean");
    case "text":
      return H.mkTypeRef("String");
    case "variables_get":
      return lookup(e, b.getFieldValue("VAR")).type;
  }
  return H.mkTypeRef("Unknown");
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


function compileArithmetic(e: Environment, b: B.Block, t: string): J.JExpr {
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
  var x = compileExpression(e, b.getInputTargetBlock("x"), "Number");
  var y = compileExpression(e, b.getInputTargetBlock("y"), "Number");
  return H.mathCall(op, [x, y]);
}

function compileMathOp3(e: Environment, b: B.Block): J.JExpr {
  var x = compileExpression(e, b.getInputTargetBlock("x"), "Number");
  return H.mathCall("abs", [x]);
}

function compileVariableGet(e: Environment, b: B.Block): J.JExpr {
  var name = b.getFieldValue("VAR");
  assert(lookup(e, name) != null);
  return H.mkLocalRef(name);
}

function compileText(e: Environment, b: B.Block): J.JExpr {
  return H.mkStringLiteral(b.getFieldValue("TEXT"));
}

function compileBoolean(e: Environment, b: B.Block): J.JExpr {
  return H.mkBooleanLiteral(b.getFieldValue("BOOL") == "TRUE");
}

function compileNot(e: Environment, b: B.Block): J.JExpr {
  var expr = compileExpression(e, b.getInputTargetBlock("BOOL"), "Boolean");
  return H.mkSimpleCall("not", [expr]);
}

function compileCall(e: Environment, b: B.DefOrCallBlock): J.JExpr {
  var f = b.getFieldValue("NAME");
  var args = b.arguments_.map((x: any, i: number) => {
    return compileExpression(e, b.getInputTargetBlock("ARG"+i));
  });
  return H.mkCall(f, H.mkTypeRef("code"), args);
}

function defaultValueForType(t: string): J.JExpr {
  switch (t) {
    case "Boolean":
      return H.mkBooleanLiteral(false);
    case "Number":
      return H.mkNumberLiteral(0);
    case "String":
      return H.mkStringLiteral("");
  }
  return null;
}

// [t] is the expected type; in case the block was actually not there (i.e.
// [b == null]), we may be able to provide a default value.
function compileExpression(e: Environment, b: B.Block, t?: string): J.JExpr {
  if (b == null)
    return defaultValueForType(t);

  switch (b.type) {
    case "math_number":
      return compileNumber(e, b);
    case "math_op2":
      return compileMathOp2(e, b);
    case "math_op3":
      return compileMathOp3(e, b);
    case "math_arithmetic":
    case "logic_compare":
      return compileArithmetic(e, b, "Number");
    case "logic_operation":
      return compileArithmetic(e, b, "Boolean");
    case "logic_boolean":
      return compileBoolean(e, b);
    case "logic_negate":
      return compileNot(e, b);
    case "variables_get":
      return compileVariableGet(e, b);
    case "text":
      return compileText(e, b);
    case "procedures_callreturn":
        return compileCall(e, <B.DefOrCallBlock> b);
    case 'device_build_image':
        return compileBuildImage(e, b, false);
    case 'device_build_big_image':
        return compileBuildImage(e, b, true);
    default:
      if (b.type in stdCallTable)
        return compileStdCall(
          e, b,
          stdCallTable[b.type].f,
          stdCallTable[b.type].args,
          stdCallTable[b.type].isExtensionMethod
        );
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
  type: J.JTypeRef;
}

function extend(e: Environment, b: Binding): Environment {
  assert(lookup(e, b.name) == null);
  return {
    bindings: [b].concat(e.bindings)
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
    var cond = compileExpression(e, b.getInputTargetBlock("IF"+i), "Boolean");
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

  var e1 = extend(e, { name: bVar, type: H.mkTypeRef("Number") });

  if (isClassicForLoop(bBy, bFrom))
    return [H.mkFor(bVar, H.mkExprHolder([], compileExpression(e, bTo, "Number")), compileStatements(e1, bDo))];
  else
    return [
      // var VAR: Number = FROM
      H.mkDefAndAssign(bVar, H.mkTypeRef("Number"), compileExpression(e, bFrom, "Number")),
      // while
      H.mkWhile(
        // VAR <= TO
        H.mkExprHolder([],
          H.mkSimpleCall("≤", [H.mkLocalRef(bVar), compileExpression(e1, bTo, "Number")])),
        // DO
        compileStatements(e1, bDo).concat([
          H.mkExprStmt(
            H.mkExprHolder([],
              // VAR :=
              H.mkSimpleCall(":=", [H.mkLocalRef(bVar),
                // VAR + BY
                H.mkSimpleCall("+", [H.mkLocalRef(bVar), compileExpression(e1, bBy, "Number")])])))]))
    ];
}

function compileControlsRepeat(e: Environment, b: B.Block): J.JStmt {
  var args = [compileExpression(e, b.getInputTargetBlock("TIMES"), "Number")];
  var body = compileStatements(e, b.getInputTargetBlock("DO"));
  return mkCallWithCallback(e, "repeat", args, body);
}

function compileWhile(e: Environment, b: B.Block): J.JStmt {
  var cond = compileExpression(e, b.getInputTargetBlock("COND"), "Boolean");
  var body = compileStatements(e, b.getInputTargetBlock("DO"));
  return H.mkWhile(H.mkExprHolder([], cond), body);
}

function compileForever(e: Environment, b: B.Block): J.JStmt {
  return mkCallWithCallback(e, "forever", [], compileStatements(e, b.getInputTargetBlock("DO")));
}

function compilePrint(e: Environment, b: B.Block): J.JStmt {
  var text = compileExpression(e, b.getInputTargetBlock("TEXT"), "String");
  return H.mkExprStmt(H.mkExprHolder([], H.mkSimpleCall("post to wall", [text])));
}

function compileSetOrDef(e: Environment, b: B.Block): { stmt: J.JStmt; env: Environment } {
  var bVar = b.getFieldValue("VAR");
  var bExpr = b.getInputTargetBlock("VALUE");
  var expr = compileExpression(e, bExpr);
  var binding = lookup(e, bVar);
  if (binding) {
    // Assignment. It's ok if we assign an expression of the wrong type, as
    // TouchDevelop will flag it as an error.
    return {
      env: e,
      stmt: H.mkExprStmt(H.mkExprHolder([], H.mkSimpleCall(":=", [H.mkLocalRef(bVar), expr])))
    };
  } else {
    // Definition
    var t = inferType(e, b);
    var e1 = extend(e, { name: bVar, type: t });
    return {
      env: e1,
      stmt: H.mkDefAndAssign(bVar, t, expr)
    };
  }
}

function compileStdCall(e: Environment, b: B.Block, f: string, inputs: string[], isExtensionMethod?: boolean) {
  var args = inputs.map(x => {
    var f = b.getFieldValue(x);
    if (f)
      return H.mkStringLiteral(f);
    else
      return compileExpression(e, b.getInputTargetBlock(x))
  });
  return H.stdCall(f, args, isExtensionMethod);
}

function compileStdBlock(e: Environment, b: B.Block, f: string, inputs: string[], isExtensionMethod?: boolean) {
  return H.mkExprStmt(H.mkExprHolder([], compileStdCall(e, b, f, inputs, isExtensionMethod)));
}

function compileComment(e: Environment, b: B.Block): J.JStmt {
  var arg = compileExpression(e, b.getInputTargetBlock("comment"), "String");
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
  return mkCallWithCallback(e, "when button is pressed", [name], body);
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

// [key] id of a block
// [f] function from the library it compiles to
// [args] either a field value or, if not found, an input target block; field
//  values are compiled to string, while input target blocks follow the
//  expression compilation scheme
// [isExtensionMethod] compile [f(x, y...)] into [x → f (y...)]
var stdCallTable: { [blockName: string]: { f: string; args: string[]; isExtensionMethod?: boolean }} = {
  device_clear_display:           { f: "clear screen",          args: [] },
  device_show_letter:             { f: "show letter",           args: ["letter"] },
  device_pause:                   { f: "pause",                 args: ["pause"] },
  device_print_message:           { f: "print string",          args: ["message", "pausetime"] },
  device_plot:                    { f: "plot",                  args: ["x", "y"] },
  device_unplot:                  { f: "unplot",                args: ["x", "y"] },
  device_point:                   { f: "point",                 args: ["x", "y"] },
  device_heading:                 { f: "heading",               args: [] },
  device_make_StringImage:        { f: "make string image",     args: ["NAME"] },
  device_scroll_image:            { f: "scroll image",          args: ["sprite", "x", "delay"],   isExtensionMethod: true },
  device_show_image_offset:       { f: "show image",            args: ["sprite", "x", "y"],       isExtensionMethod: true },
  device_get_button:              { f: "button is pressed",     args: ["NAME"] },
  device_get_acceleration:        { f: "acceleration",          args: ["NAME"] },
  device_get_digital_pin:         { f: "digital read pin",      args: ["name"] },
  device_set_digital_pin:         { f: "digital write pin",     args: ["name", "value"] },
  device_get_analog_pin:          { f: "analog read pin",       args: ["name"] },
  device_set_analog_pin:          { f: "analog write pin",      args: ["name", "value"] },
  device_get_brightness:          { f: "brightness",            args: [] },
  device_set_brightness:          { f: "set brightness",        args: ["value"] },
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
          var r = compileSetOrDef(e, b);
          stmts.push(r.stmt);
          // This function also returns a possibly-extended environment.
          e = r.env;
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
            stmts.push(compileStdBlock(
              e, b,
              stdCallTable[b.type].f,
              stdCallTable[b.type].args,
              stdCallTable[b.type].isExtensionMethod)
            );
          else
            console.log("Not generating code for (not a statement / not supported): "+b.type);
      }
    } catch (e) {
      console.error("Could not compile", b, "error", e);
    }
    b = b.getNextBlock();
  }
  return stmts;
}

function compileFunction(e: Environment, b: B.DefOrCallBlock): J.JAction {
  // currently broken
  var fName = b.getFieldValue("NAME");
  var inParams: J.JLocalDef[] = [];
  var outParams: J.JLocalDef[] = [];
  e = b.arguments_.reduce((e: Environment, name: string) => {
    var t = H.mkTypeRef("Unknown");
    inParams.push(H.mkDef(name, t));
    return extend(e, { name: name, type: t });
  }, e);

  var body = compileStatements(e, b.getInputTargetBlock("STACK"));
  return H.mkAction(fName, body, inParams, outParams);
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

function compileWorkspace(b: B.Workspace, options: CompileOptions): J.JApp {
  // [stmtsHandlers] contains calls to register event handlers. They must be
  // executed before the code that goes in the main function, as that latter
  // code may block, and prevent the event handler from being registered.
  var stmtsHandlers: J.JStmt[] = [];
  var stmtsMain: J.JStmt[] = [];
  b.getTopBlocks(true).forEach((b: B.Block) => {
    if (isHandlerRegistration(b))
      append(stmtsHandlers, compileStatements(empty, b));
    else
      append(stmtsMain, compileStatements(empty, b));
  });

  var action = H.mkAction("main", stmtsHandlers.concat(stmtsMain), [], []);

  return H.mkApp(options.name, options.description, [ action ]);
}

function compile(b: B.Workspace, options: CompileOptions): J.JApp {
  return compileWorkspace(b, options);
}

// vim: set ts=2 sw=2 sts=2:
