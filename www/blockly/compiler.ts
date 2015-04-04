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

  export function mkOp(x: string): J.JOperator {
    return {
      nodeType: "operator",
      id: "TODO",
      op: x
    };
  }

  // Generates a local definition for [x] at type [t]; this is not enough to
  // properly define a variable, though (see [mkDefAndAssign]).
  export function mkDef(x: string, t: string): J.JLocalDef {
    return {
      nodeType: "localDef",
      id: "TODO",
      name: x,
      type: <any> t, // the interface is a lie
    };
  }

  // Generates a reference to bound variable [x]
  export function mkLocalRef(x: string): J.JLocalRef {
    return {
      nodeType: "localRef",
      id: "TODO",
      name: x,
      localId: null // same here
    }
  }

  // TouchDevelop conflates variable binding and series of tokens. So every series
  // of tokens is flagged with the variables that are introduced at this stage.
  // This is not the traditional notion of binding, though: the variable's scope
  // is not limited to the tokens, but rather extends until the end of the parent
  // block.
  export function mkExprHolder(defs: J.JLocalDef[], toks: J.JToken[]): J.JExprHolder {
    return {
      nodeType: "exprHolder",
      id: "TODO",
      tokens: toks,
      tree: null,
      locals: defs,
    };
  }

  // Injection of expressions into statements is explicit in TouchDevelop.
  export function mkExprStmt(expr: J.JExpr): J.JStmt {
    return {
      nodeType: "exprStmt",
      id: "TODO",
      expr: expr,
    };
  }

  export function mkWhile(condition: J.JToken[], body: J.JStmt[]): J.JStmt {
    return {
      nodeType: "while",
      id: "TODO",
      condition: mkExprHolder([], condition),
      body: body
    };
  }

  // Generate the AST for:
  //   [var x: t := e]
  export function mkDefAndAssign(x: string, t: string, e: J.JToken[]): J.JStmt {
    var def: J.JLocalDef = mkDef(x, t);
    var toks = (<J.JToken[]> [
      mkLocalRef(x),
      mkOp(":="),
    ]).concat(e);
    var expr = mkExprHolder([def], toks);
    return mkExprStmt(expr);
  }

  export function mkAction(name: string, body: J.JStmt[]): J.JAction {
    return {
      nodeType: "action",
      id: "TODO",
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

  export function mkApp(name: string, description: string, actions: J.JAction[]) {
    return {
      nodeType: "app",
      id: "TODO",

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
// Expressions are compiled (per the hybrid AST model) into a series of tokens.
// Furthermore, we return the expression's precedence so that the caller knows
// whether to wrap the expression in parentheses or not.
///////////////////////////////////////////////////////////////////////////////

interface Expr {
  tokens: J.JToken[];
  prec: number;
}

function compileNumber(b: B.Block): J.JOperator[] {
  var n = b.getFieldValue("NUM")+"";
  var toks: J.JOperator[] = [];
  for (var i = 0; i < n.length; ++i)
    toks.push(Helpers.mkOp(n[i]));
  return toks;
}

var precedenceTable: { [index: string]: number } = {
  "*": 1,
  "/": 1,
  "+": 2,
  "-": 2,
};

// Convert a blockly "OP" field into a TouchDevelop operator.
// TODO: unary minus, power
var opToTok: { [index: string]: string } = {
  "ADD": "+",
  "MINUS": "-",
  "MULTIPLY": "*",
  "DIVIDE": "/",
  "POWER": "",
};

function wrapParentheses(e: J.JToken[]): J.JToken[] {
  return [<J.JToken> Helpers.mkOp("(")].concat(e).concat([Helpers.mkOp(")")]);
}

function compileArithmetic(b: B.Block): Expr {
  var bOp = b.getFieldValue("OP");
  if (bOp == "POWER")
    throw "TODO";
  var prec = precedenceTable[opToTok[bOp]];
  var op = Helpers.mkOp(opToTok[bOp]);
  var left = compileExpression(b.getInputTargetBlock("A"));
  var right = compileExpression(b.getInputTargetBlock("B"));
  // All our operators are left-associative, phew!
  var leftTokens = left.prec > prec ? wrapParentheses(left.tokens) : left.tokens;
  var rightTokens = right.prec >= prec ? wrapParentheses(right.tokens) : right.tokens;
  return {
    prec: prec,
    tokens: leftTokens.concat([op]).concat(rightTokens)
  };
}

function compileExpression(b: B.Block): Expr {
  switch (b.type) {
    case "math_number":
      return {
        tokens: compileNumber(b),
        prec: 0
      };
    case "math_arithmetic":
      return compileArithmetic(b);
  }
  throw (b.type + " is not an expression block or is not supported");
  // unreachable
  return null;
}

///////////////////////////////////////////////////////////////////////////////
// Statements
///////////////////////////////////////////////////////////////////////////////

function compileControlsIf(b: B.ControlsIfBlock): J.JStmt {
  throw "Not implemented";
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
    Helpers.mkDefAndAssign(bVar, "Number", compileExpression(bFrom).tokens),
    // while
    Helpers.mkWhile(
      // VAR <
      [<J.JToken> Helpers.mkLocalRef(bVar), Helpers.mkOp("<=")]
      // TO
        .concat(compileExpression(bTo).tokens),
      // DO
      compileStatements(bDo).concat([
        Helpers.mkExprStmt(Helpers.mkExprHolder([], [
          // VAR :=
          <J.JToken> Helpers.mkLocalRef(bVar), Helpers.mkOp(":=")
          // BY
        ].concat(compileExpression(bBy).tokens).concat([
          // + VAR
          Helpers.mkOp("+"), Helpers.mkLocalRef(bVar)
        ])))
      ])
    )
  ];
}

function compileStatements(b: B.Block): J.JStmt[] {
  var stmts: J.JStmt[] = [];
  while (b) {
    switch (b.type) {
      case 'controls_if':
        // stmts.push(compileControlsIf(<B.ControlsIfBlock> b));
        break;

      case 'controls_for':
        stmts = stmts.concat(compileControlsFor(b));
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
