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

  export function mkPropertyRef(x: string): J.JPropertyRef {
    return {
      nodeType: "propertyRef",
      id: null,
      name: x,
      parent: null,
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

  // TouchDevelop conflates variable binding and series of tokens. So every series
  // of tokens is flagged with the variables that are introduced at this stage.
  // This is not the traditional notion of binding, though: the variable's scope
  // is not limited to the tokens, but rather extends until the end of the parent
  // block.
  export function mkExprHolder(defs: J.JLocalDef[], toks: J.JToken[]): J.JExprHolder {
    return {
      nodeType: "exprHolder",
      id: null,
      tokens: toks,
      tree: null,
      locals: defs,
    };
  }

  // Injection of expressions into statements is explicit in TouchDevelop.
  export function mkExprStmt(expr: J.JExpr): J.JStmt {
    return {
      nodeType: "exprStmt",
      id: null,
      expr: expr,
    };
  }

  export function mkWhile(condition: J.JToken[], body: J.JStmt[]): J.JStmt {
    return {
      nodeType: "while",
      id: null,
      condition: mkExprHolder([], condition),
      body: body
    };
  }

  export function mkSimpleIf(condition: J.JToken[], thenBranch: J.JStmt[]): J.JIf {
    return {
      nodeType: "if",
      id: null,
      condition: mkExprHolder([], condition),
      thenBody: thenBranch,
      elseBody: null,
      isElseIf: false,
    };
  }

  // This function takes care of generating an if node *and* de-constructing the
  // else branch to abide by the TouchDevelop representation (see comments in
  // [jsonInterfaces.ts]).
  export function mkIf(condition: J.JToken[], thenBranch: J.JStmt[], elseBranch: J.JStmt[]): J.JIf[] {
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
// Expressions are compiled (per the hybrid AST model) into a series of tokens.
// Furthermore, we return the expression's precedence so that the caller knows
// whether to wrap the expression in parentheses or not.
///////////////////////////////////////////////////////////////////////////////

interface Expr {
  tokens: J.JToken[];
  prec: number;
}

function compileNumber(b: B.Block): Expr {
  var n = b.getFieldValue("NUM")+"";
  var toks: J.JOperator[] = [];
  for (var i = 0; i < n.length; ++i)
    toks.push(Helpers.mkOp(n[i]));
  return {
    tokens: toks,
    prec: 0
  };
}

// 0 is for atomic tokens
var precedenceTable: { [index: string]: number } = {
  "*": 1,
  "/": 1,
  "+": 2,
  "-": 2,
  "<": 3,
  "<=": 3,
  ">": 3,
  ">=": 3,
  "=": 4,
  "!=": 4,
};

// Convert a blockly "OP" field into a TouchDevelop operator.
var opToTok: { [index: string]: string } = {
  "ADD": "+",
  "MINUS": "-",
  "MULTIPLY": "*",
  "DIVIDE": "/",
  //"POWER": "", // TODO
  "EQ":  "=",
  "NEQ": "!=",
  "LT":  "<",
  "LTE": "<=",
  "GT": ">",
  "GTE": ">=",
};

function wrapParentheses(e: J.JToken[]): J.JToken[] {
  return [<J.JToken> Helpers.mkOp("(")].concat(e).concat([Helpers.mkOp(")")]);
}

function compileArithmetic(b: B.Block): Expr {
  var bOp = b.getFieldValue("OP");
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

function compileVariableGet(b: B.Block): Expr {
  return {
    tokens: [Helpers.mkLocalRef(b.getFieldValue("VAR"))],
    prec: 0
  };
}

function compileText(b: B.Block): Expr {
  return {
    tokens: [Helpers.mkStringLiteral(b.getFieldValue("TEXT"))],
    prec: 0
  };
}

function compileExpression(b: B.Block): Expr {
  switch (b.type) {
    case "math_number":
      return compileNumber(b);
    case "math_arithmetic":
    case "logic_compare":
      return compileArithmetic(b);
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
  for (var i = 0; i <= (b.elseIfCount_ || 0); ++i) {
    var cond = compileExpression(b.getInputTargetBlock("IF"+i)).tokens;
    var thenBranch = compileStatements(b.getInputTargetBlock("DO"+i));
    stmts.push(Helpers.mkSimpleIf(cond, thenBranch));
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

function compilePrint(b: B.Block): J.JStmt {
  var text = compileExpression(b.getInputTargetBlock("TEXT")).tokens;
  var tokens = text.concat([
    Helpers.mkPropertyRef("post to wall"),
  ]);
  return Helpers.mkExprStmt(Helpers.mkExprHolder([], tokens));
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
