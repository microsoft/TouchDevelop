///<reference path='blockly.d.ts'/>
///<reference path='../../ast/jsonInterfaces.ts'/>

///////////////////////////////////////////////////////////////////////////////
//                A compiler from Blocky to TouchDevelop                     //
///////////////////////////////////////////////////////////////////////////////

import J = TDev.AST.Json;
import B = Blockly;

// A series of utility functions for constructing various J* AST nodes.
module Helpers {
  function assert(x: boolean) {
    if (!x)
      throw "Assertion failure";
  }

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
      parent: <any> p, // again, [jsonInterfaces.ts] is lying about what [JTypeRef] actually is
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

  // Generates a local definition for [x] at type [t]; this is not enough to
  // properly define a variable, though (see [mkDefAndAssign]).
  export function mkDef(x: string, t: string): J.JLocalDef {
    return {
      nodeType: "localDef",
      id: null,
      name: x,
      type: <any> t, // the interface is a lie
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
  export function mkDefAndAssign(x: string, t: string, e: J.JExpr): J.JStmt {
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

function inferType(b: B.Block): J.JTypeRef {
  throw "TODO";
}

///////////////////////////////////////////////////////////////////////////////
// Expressions
//
// Expressions are now directly compiled as a tree. This requires knowing, for
// each property ref, the right value for its [parent] property.
///////////////////////////////////////////////////////////////////////////////

function compileNumber(b: B.Block): J.JExpr {
  return Helpers.mkNumberLiteral(parseInt(b.getFieldValue("NUM")));
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


function compileArithmetic(b: B.Block): J.JExpr {
  var bOp = b.getFieldValue("OP");
  var left = b.getInputTargetBlock("A");
  var right = b.getInputTargetBlock("B");
  return Helpers.mkSimpleCall(opToTok[bOp], [compileExpression(left), compileExpression(right)]);
}

function compileVariableGet(b: B.Block): J.JExpr {
  return Helpers.mkLocalRef(b.getFieldValue("VAR"));
}

function compileText(b: B.Block): J.JExpr {
  return Helpers.mkStringLiteral(b.getFieldValue("TEXT"));
}

function compileBoolean(b: B.Block): J.JExpr {
  return Helpers.mkBooleanLiteral(b.getFieldValue("BOOL") == "TRUE");
}

function compileNot(b: B.Block): J.JExpr {
  var e = compileExpression(b.getInputTargetBlock("BOOL"));
  return Helpers.mkSimpleCall("not", [e]);
}

function compileExpression(b: B.Block): J.JExpr {
  switch (b.type) {
    case "math_number":
      return compileNumber(b);
    case "math_arithmetic":
    case "logic_operation":
    case "logic_compare":
      return compileArithmetic(b);
    case "logic_boolean":
      return compileBoolean(b);
    case "logic_negate":
      return compileNot(b);
    case "variables_get":
      return compileVariableGet(b);
    case "text":
      return compileText(b);
  }
  throw (b.type + " is not an expression block or is not supported");
  // unreachable
  return null;
}

///////////////////////////////////////////////////////////////////////////////
// Statements
///////////////////////////////////////////////////////////////////////////////

function compileControlsIf(b: B.ControlsIfBlock): J.JStmt[] {
  var stmts: J.JIf[] = [];
  for (var i = 0; i <= b.elseifCount_; ++i) {
    var cond = compileExpression(b.getInputTargetBlock("IF"+i));
    var thenBranch = compileStatements(b.getInputTargetBlock("DO"+i));
    stmts.push(Helpers.mkSimpleIf(Helpers.mkExprHolder([], cond), thenBranch));
    if (i > 0)
      stmts[stmts.length - 1].isElseIf = true;
  }
  if (b.elseCount_) {
    stmts[stmts.length - 1].elseBody = compileStatements(b.getInputTargetBlock("ELSE"));
  }
  return stmts;
}

function compileControlsFor(b: B.Block): J.JStmt[] {
  var bVar = b.getFieldValue("VAR");
  var bFrom = b.getInputTargetBlock("FROM");
  var bTo = b.getInputTargetBlock("TO");
  var bBy = b.getInputTargetBlock("BY");
  var bDo = b.getInputTargetBlock("DO");

  // TODO: use an actual for-loop when bFrom = 0 and bBy = 1
  return [
    // var VAR: Number = FROM
    Helpers.mkDefAndAssign(bVar, "Number", compileExpression(bFrom)),
    // while
    Helpers.mkWhile(
      // VAR <= TO
      Helpers.mkExprHolder([],
        Helpers.mkSimpleCall("≤", [Helpers.mkLocalRef(bVar), compileExpression(bTo)])),
      // DO
      compileStatements(bDo).concat([
        Helpers.mkExprStmt(
          Helpers.mkExprHolder([],
            // VAR :=
            Helpers.mkSimpleCall(":=", [Helpers.mkLocalRef(bVar),
              // VAR + BY
              Helpers.mkSimpleCall("+", [Helpers.mkLocalRef(bVar), compileExpression(bBy)])])))]))
  ];
}

function compilePrint(b: B.Block): J.JStmt {
  var text = compileExpression(b.getInputTargetBlock("TEXT"));
  return Helpers.mkExprStmt(Helpers.mkExprHolder([], Helpers.mkSimpleCall("post to wall", [text])));
}

function compileStatements(b: B.Block): J.JStmt[] {
  var stmts: J.JStmt[] = [];
  while (b) {
    switch (b.type) {
      case 'controls_if':
        stmts = stmts.concat(compileControlsIf(<B.ControlsIfBlock> b));
        break;

      case 'controls_for':
        stmts = stmts.concat(compileControlsFor(b));
        break;

      case 'text_print':
        stmts.push(compilePrint(b));
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
    var body = compileStatements(b);
    var name = "main"+(i == 0 ? "" : i);
    return Helpers.mkAction(name, body);
  });
  return Helpers.mkApp(options.name, options.description, actions);
}

function compile(b: B.Workspace, options: CompileOptions): J.JApp {
  return compileWorkspace(b, options);
}
