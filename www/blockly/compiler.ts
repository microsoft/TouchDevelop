///<reference path='blockly.d.ts'/>
///<reference path='../../ast/jsonInterfaces.ts'/>

///////////////////////////////////////////////////////////////////////////////
//                A compiler from Blocky to TouchDevelop                     //
///////////////////////////////////////////////////////////////////////////////

// Currently remaining items:
// - boolean/ternary
// - remove boolean/null
// - assess which ones of text/* we need
// - loops
// - math
// - decide on our list structure
// - set variable (infer if fresh declaration or assignment)
// - functions

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
  ["=", "≠", "<", "≤", ">", "≥"].forEach(x => knownPropertyRefs[x] = "Number");
  ["and", "or", "not"].forEach(x => knownPropertyRefs[x] = "Boolean");

  export function mkPropertyRef(x: string, p: string): J.JPropertyRef {
    return {
      nodeType: "propertyRef",
      id: null,
      name: x,
      parent: mkTypeRef(p),
    };
  }

  // Assumes its parameter [p] is in the [knownPropertyRefs] table.
  export function mkSimpleCall(p: string, args: J.JExpr[]): J.JExpr {
    return {
        nodeType: "call",
        id: null,
        name: p,
        parent: knownPropertyRefs[p],
        args: args,
    };
  }

  export function mkTypeRef(t: string): J.JTypeRef {
    // The interface is a lie -- actually, this type is just string.
    return <any> t;
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
  export function mkExprStmt(expr: J.JExprHolder): J.JStmt {
    return {
      nodeType: "exprStmt",
      id: null,
      expr: expr,
    };
  }

  export function mkWhile(condition: J.JExprHolder, body: J.JStmt[]): J.JStmt {
    return {
      nodeType: "while",
      id: null,
      condition: condition,
      body: body
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

  export function mkAction(name: string, body: J.JStmt[]): J.JAction {
    return {
      nodeType: "action",
      id: null,
      name: name,
      body: body,
      inParameters: [],
      outParameters: [],
      isPrivate: false,
      isOffline: false,
      isQuery: false,
      isTest: false,
      isAsync: false,
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

function compileControlsIf(e: Environment, b: B.ControlsIfBlock): J.JStmt[] {
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
    // Assignment
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

function compileStatements(e: Environment, b: B.Block): J.JStmt[] {
  var stmts: J.JStmt[] = [];
  var append = <T> (a: T[], es: T[]) => a.push.apply(a, es);
  while (b) {
    switch (b.type) {
      case 'controls_if':
        append(stmts, compileControlsIf(e, <B.ControlsIfBlock> b));
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

      default:
        throw (b.type + " is not a statement block or is not supported");
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

function compileWorkspace(b: B.Workspace, options: CompileOptions): J.JApp {
  var actions = b.getTopBlocks(true).map((b: B.Block, i: number) => {
    var body = compileStatements(empty, b);
    var name = "main"+(i == 0 ? "" : i);
    return H.mkAction(name, body);
  });
  return H.mkApp(options.name, options.description, actions);
}

function compile(b: B.Workspace, options: CompileOptions): J.JApp {
  return compileWorkspace(b, options);
}
