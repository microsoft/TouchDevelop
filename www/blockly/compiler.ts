///<reference path='blockly.d.ts'/>
///<reference path='../../ast/jsonInterfaces.ts'/>

///////////////////////////////////////////////////////////////////////////////
//                A compiler from Blocky to TouchDevelop                     //
///////////////////////////////////////////////////////////////////////////////

// TODO:
// - loops: repeat n times, repeat, forever, simplified for loop
// - logic: on/off
// - basic, led, images, input: adapt API

import J = TDev.AST.Json;
import B = Blockly;

function assert(x: boolean) {
  if (!x)
    throw "Assertion failure";
}

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
  var librarySingleton: J.JSingletonRef = {
    nodeType: "singletonRef",
    id: null,
    name: librarySymbol,
    type: mkTypeRef(librarySymbol)
  };

  // A library "♻ foobar" is actually a call to the method "foobar" of the
  // global singleton object "♻".
  export function mkLibrary(name: string): J.JCall {
    return mkCall(name, mkTypeRef(librarySymbol), [librarySingleton]);
  }

  // Call function [name] from the standard microbit library with arguments
  // [args].
  export function stdCall(name: string, args: J.JExpr[]): J.JCall {
    return mkCall(name, mkTypeRef("microbit"), [<J.JExpr> mkLibrary("microbit")].concat(args));
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

// Infers the expected type of an expression by looking at the untranslated
// block and figuring out, from the look of it, what type of expression it
// holds.
function inferType(e: Environment, b: B.Block): J.JTypeRef {
  switch (b.type) {
    case "math_number":
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

function compileNumber(e: Environment, b: B.Block): J.JExpr {
  return H.mkNumberLiteral(parseInt(b.getFieldValue("NUM")));
}

var opToTok: { [index: string]: string } = {
  "ADD": "+",
  "MINUS": "-",
  "MULTIPLY": "*",
  "DIVIDE": "/",
  //"POWER": "", // TODO
  "EQ":  "=",
  "NEQ": "≠",
  "LT":  "<",
  "LTE": "≤",
  "GT": ">",
  "GTE": "≥",
  "AND": "and",
  "OR": "or",
};


function compileArithmetic(e: Environment, b: B.Block): J.JExpr {
  var bOp = b.getFieldValue("OP");
  var left = b.getInputTargetBlock("A");
  var right = b.getInputTargetBlock("B");
  return H.mkSimpleCall(opToTok[bOp], [compileExpression(e, left), compileExpression(e, right)]);
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
  var expr = compileExpression(e, b.getInputTargetBlock("BOOL"));
  return H.mkSimpleCall("not", [expr]);
}

function compileCall(e: Environment, b: B.DefOrCallBlock): J.JExpr {
  var f = b.getFieldValue("NAME");
  var args = b.arguments_.map((x: any, i: number) => {
    return compileExpression(e, b.getInputTargetBlock("ARG"+i));
  });
  return H.mkCall(f, H.mkTypeRef("code"), args);
}

function compileButtonPressed(e: Environment, b: B.Block): J.JExpr {
  return compileStdCall(e, b, "button pressed", ["id"]);
}

function compileOnOff(e: Environment, b: B.Block): J.JExpr {
  return H.mkNumberLiteral(b.getFieldValue("STATE") == "ON" ? 1 : 0);
}

function compileExpression(e: Environment, b: B.Block): J.JExpr {
  switch (b.type) {
    case "math_number":
      return compileNumber(e, b);
    case "math_arithmetic":
    case "logic_operation":
    case "logic_compare":
      return compileArithmetic(e, b);
    case "logic_boolean":
      return compileBoolean(e, b);
    case "logic_negate":
      return compileNot(e, b);
    case "variables_get":
      return compileVariableGet(e, b);
    case "text":
      return compileText(e, b);
    case "microbit_button_pressed":
      return compileButtonPressed(e, b);
    case "microbit_logic_onoff_states":
      return compileOnOff(e, b);
    case "procedures_callreturn":
      return compileCall(e, <B.DefOrCallBlock> b);
  }
  throw (b.type + " is not an expression block or is not supported");
  // unreachable
  return null;
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
    var cond = compileExpression(e, b.getInputTargetBlock("IF"+i));
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

function compileControlsFor(e: Environment, b: B.Block): J.JStmt[] {
  var bVar = b.getFieldValue("VAR");
  var bFrom = b.getInputTargetBlock("FROM");
  var bTo = b.getInputTargetBlock("TO");
  var bBy = b.getInputTargetBlock("BY");
  var bDo = b.getInputTargetBlock("DO");

  var e1 = extend(e, { name: bVar, type: H.mkTypeRef("Number") });

  // TODO: use an actual for-loop when bFrom = 0 and bBy = 1
  return [
    // var VAR: Number = FROM
    H.mkDefAndAssign(bVar, H.mkTypeRef("Number"), compileExpression(e, bFrom)),
    // while
    H.mkWhile(
      // VAR <= TO
      H.mkExprHolder([],
        H.mkSimpleCall("≤", [H.mkLocalRef(bVar), compileExpression(e1, bTo)])),
      // DO
      compileStatements(e1, bDo).concat([
        H.mkExprStmt(
          H.mkExprHolder([],
            // VAR :=
            H.mkSimpleCall(":=", [H.mkLocalRef(bVar),
              // VAR + BY
              H.mkSimpleCall("+", [H.mkLocalRef(bVar), compileExpression(e1, bBy)])])))]))
  ];
}

function compileControlsRepeat(e: Environment, b: B.Block): J.JStmt {
  var bound = compileExpression(e, b.getInputTargetBlock("TIMES"));
  var body = compileStatements(e, b.getInputTargetBlock("DO"));
  return H.mkFor("__unused_index", H.mkExprHolder([], bound), body);
}

function compileControlsWhileUntil(e: Environment, b: B.Block): J.JStmt {
  var until = b.getFieldValue('MODE') == 'UNTIL';
  var cond = compileExpression(e, b.getInputTargetBlock("BOOL"));
  var body = compileStatements(e, b.getInputTargetBlock("DO"));
  var finalCond = until ? H.mkSimpleCall("not", [cond]) : cond;
  return H.mkWhile(H.mkExprHolder([], finalCond), body);
}

function compileForever(e: Environment, b: B.Block): J.JStmt {
  return H.mkWhile(
    H.mkExprHolder([], H.mkBooleanLiteral(true)),
    compileStatements(e, b.getInputTargetBlock("DO")));
}

function compilePrint(e: Environment, b: B.Block): J.JStmt {
  var text = compileExpression(e, b.getInputTargetBlock("TEXT"));
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

function compileStdCall(e: Environment, b: B.Block, f: string, inputs: string[]) {
  var args = inputs.map(x => compileExpression(e, b.getInputTargetBlock(x)));
  return H.stdCall(f, args);
}

function compileStdBlock(e: Environment, b: B.Block, f: string, inputs: string[]) {
  return H.mkExprStmt(H.mkExprHolder([], compileStdCall(e, b, f, inputs)));
}

function compileComment(e: Environment, b: B.Block): J.JStmt {
  var arg = compileExpression(e, b.getInputTargetBlock("comment"));
  assert(arg.nodeType == "stringLiteral");
  return H.mkComment((<J.JStringLiteral> arg).value);
}

function compileEvent(e: Environment, b: B.Block): J.JStmt {
  var bId = b.getInputTargetBlock("ID");
  var bBody = b.getInputTargetBlock("HANDLER");
  var id = compileExpression(e, bId);
  var body = compileStatements(e, bBody);
  var def = H.mkDef("_body_", H.mkGTypeRef("Action"));
  return H.mkInlineActions(
    [ H.mkInlineAction(body, true, def) ],
    H.mkExprHolder(
      [ def ],
      H.stdCall("on", [id])));

}

function compileStatements(e: Environment, b: B.Block): J.JStmt[] {
  var stmts: J.JStmt[] = [];
  var append = <T> (a: T[], es: T[]) => a.push.apply(a, es);
  while (b) {
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
        // This function also return a possibly-extended environment.
        e = r.env;
        break;

      case 'microbit_comment':
        stmts.push(compileComment(e, b));
        break;

      case 'microbit_forever':
        stmts.push(compileForever(e, b));
        break;

      case 'controls_repeat_ext':
        stmts.push(compileControlsRepeat(e, b));
        break;

      case 'controls_whileUntil':
        stmts.push(compileControlsWhileUntil(e, b));
        break;

      case 'microbit_set_led':
        stmts.push(compileStdBlock(e, b, "set led", ["id", "brightness"]));
        break;

      case 'microbit_wait':
        stmts.push(compileStdBlock(e, b, "busy wait ms", ["VAL"]));
        break;

      case 'microbit_scroll':
        stmts.push(compileStdBlock(e, b, "scroll", ["ARG"]));
        break;

      case 'microbit_event':
        stmts.push(compileEvent(e, b));
        break;


      default:
        throw (b.type + " is not a statement block or is not supported");
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

function compileWorkspace(b: B.Workspace, options: CompileOptions): J.JApp {
  var stmts: J.JStmt[] = [];
  b.getTopBlocks(true).forEach((b: B.Block) => {
    // TODO: wrap in "on event start" if outer block is not of type event.
    // Each "on ..." event handler is compiled in its own empty environment.
    // This is akin to a function definition.
    stmts = stmts.concat(compileStatements(empty, b));
  });

  var def: J.JLocalDef = H.mkDef("errno", H.mkTypeRef("Number"));
  var assign = H.mkSimpleCall(":=", [H.mkLocalRef("errno"), H.mkNumberLiteral(0)]);
  var expr = H.mkExprHolder([def], assign);
  stmts.push(H.mkExprStmt(expr));

  var action = H.mkAction("main", stmts, [], [def]);

  return H.mkApp(options.name, options.description, [ action ]);
}

function compile(b: B.Workspace, options: CompileOptions): J.JApp {
  return compileWorkspace(b, options);
}

// vim: set ts=2 sw=2 sts=2:
