///<reference path='refs.ts'/>


module TDev.AST.ExprParser
{
        export var infixProps:any = null;

        function getInfixProperty(o:string)
        {
            if (infixProps == null) {
                infixProps = {}
                var api = TDev.api;
                [api.core.Number, api.core.Boolean, api.core.String, api.core.Unknown].forEach(function (k:Kind) {
                    k.listProperties().forEach(function (p:IProperty) {
                        if (p.getInfixPriority() > 0 && !infixProps[p.getName()])
                            infixProps[p.getName()] = p;
                    });
                });
            }
            if (/^fun:/.test(o)) o = "fun"
            return infixProps[o];
        }

        var isDigit = (c:string) => /^[0-9]$/.test(c);

        function mkComma(op0:StackOp)
        {
            var r = new StackOp();
            r.copyFrom(op0);
            r.type = "operator";
            r.infixProperty = getInfixProperty(",");
            r.op = ",";
            return r;
        }

        function mkZero(op0:StackOp)
        {
            var r = new StackOp();
            r.copyFrom(op0);
            r.type = "literal";
            r.expr = mkLit(0.0);
            r.expr.loc = r;
            return r;
        }

        export function parse0(tokens:Token[])
        {
            var dt:string;
            var res:StackOp[] = [];

            for (var i = 0; i < tokens.length; ++i) {
                tokens[i].clearError();
            }

            for (var i = 0; i < tokens.length; ++i) {
                var t = tokens[i];
                var r = new StackOp();
                r.type = t.nodeType();
                r.tokens = tokens;
                r.beg = i;
                r.len = 1;
                res.push(r);
                switch (r.type) {
                    case "literal":
                    case "thingRef":
                        // r.expr = AstNode.mk({ type: r.type, data: (<any> t).data });
                        r.expr = <Expr>t;
                        r.expr.loc = r;
                        break;
                    case "propertyRef":
                        r.propertyRef = <PropertyRef>t;
                        break;
                    case "operator":
                        dt = t.getText();
                        if (/^[0-9\.]$/.test(dt)) {
                                var seenDot = false;
                                var num = "";
                                var c = "";

                                while (i < tokens.length) {
                                    if (tokens[i].nodeType() !== "operator")
                                        break;
                                    c = tokens[i].getText();
                                    if (isDigit(c)) {
                                        num += c;
                                    } else if (c === "." && !seenDot) {
                                        num += c;
                                        seenDot = true;
                                    } else break;
                                    i++;
                                }

                                r.len = i - r.beg;
                                i--;

                                if (num === ".") {
                                    r.markError(lf("TD142: expecting a digit before or after the dot"));
                                    num = "0.0";
                                }

                                r.type = "literal";
                                var lit = mkLit(parseFloat(num));
                                lit.stringForm = num
                                r.expr = lit
                                r.expr.loc = r;
                        } else {
                            if (dt === "(" || dt === ")")
                                r.prioOverride = -1;
                            else
                                r.infixProperty = getInfixProperty(dt);
                            if (!r.prio())
                                r.markError(lf("TD143: unknown operator {0}", dt)); // shouldn't happen
                            r.op = dt;
                        }
                        break;
                    default:
                        Util.die();
                        break;
                }
            }

            return res;
        }

        export function parse1(tokens0:Token[])
        {
            var tokens = parse0(tokens0);
            var currentTok = 0;

            function expect(op:string)
            {
                var loc:StackOp = null;
                if (currentTok >= tokens.length)
                    loc = tokens.peek();
                else
                    loc = tokens[currentTok];

                if (currentTok >= tokens.length || loc.op !== op) {
                    loc.markError(lf("TD144: it seems you're missing '{0}', try adding it", op));
                    return false;
                }
                else {
                    currentTok++;
                    return true;
                }
            }

            function reduceOps(stack:StackOp[], minPrio:number) {
                if (minPrio == 4 || minPrio == 98) minPrio++; // priority 4 and 98 binds right

                var top = stack.pop();

                while (stack.length > 0 && stack.peek().prio() >= minPrio) {
                    var curOp = stack.pop();
                    var leftArg = stack.pop();
                    Util.assert(!!leftArg.expr);
                    var prop = curOp.infixProperty;
                    var args = [leftArg.expr, top.expr];
                    if (prop.getInfixPriority() > 0 && prop.getParameters().length === 1) {
                        args = [top.expr];
                    }
                    var endLoc = top.beg + top.len;
                    var newTop = new StackOp();
                    newTop.tokens = top.tokens;
                    top = newTop;
                    var pr = PropertyRef.mkProp(curOp.infixProperty)
                    top.expr = mkCall(pr, args);
                    var op = curOp.tokens[curOp.beg]
                    if (op instanceof Operator) {
                        (<Operator>op).call = <Call>top.expr
                        pr.fromOp = <Operator>op
                    }
                    top.beg = leftArg.beg;
                    top.len = endLoc - top.beg;
                    Util.assert(!isNaN(top.len));
                    top.expr.loc = top;
                }

                stack.push(top);
            }

            function parseCallArgs(firstArg:Expr) : Expr[]
            {
                var args:AstNode[] = [];

                var t = tokens[currentTok];
                if (!t)
                    return [firstArg];

                if (t.op === "(") {
                    currentTok++;
                    t = tokens[currentTok];

                    if (!t) {
                        expect(")")
                        return [firstArg]
                    }
                } else if (t.expr) {
                    t.markError(lf("TD145: there seem to be an operator (like '+', '(' or ',') missing here"));
                    // and keep going
                } else {
                    return [firstArg]
                }


                if (!!t && t.op == ")") {
                    currentTok++;
                    return [firstArg];
                }
                var e = parseParenFree(false);
                args = e.flatten(TDev.api.core.TupleProp);
                expect(")");

                return [firstArg].concat(<Expr[]>args);
            }

            function parseParenFree(isTop:boolean):Expr
            {
                var stack:StackOp[] = [];

                while (currentTok < tokens.length) {
                    var prev = stack.peek();
                    var op = tokens[currentTok++];
                    var prevExpr = prev != null ? prev.expr : null;

                    if (op.expr !== null) {
                        if (prev != null && prev.prio() === 0) {
                            op.markError(lf("TD145: there seem to be an operator (like '+', '(' or ',') missing here"));
                            stack.push(mkComma(op));
                        }
                        stack.push(op);
                    } else if (op.prio() > 0) {
                        if (prevExpr === null && op.op === "-") {
                            op.prioOverride = 98;
                            prev = mkZero(op);
                            stack.push(prev);
                        }

                        if (op.op === "not" || op.op == "async" || op.op == "await" 
                            || /^fun:/.test(op.op) || op.prio() == 0.5) {
                            if (prevExpr === null) {
                                prev = mkZero(op);
                                stack.push(prev);
                            } else {
                                op.markError(lf("TD146: we didn't expect '{0}' here", op.op))
                            }
                        }

                        if (!prev || !prev.expr) {
                            op.markError(lf("TD147: we didn't expect '{0}' here", op.op));
                            if (op.op == ",") {
                                stack.push(mkZero(op));
                                reduceOps(stack, op.prio());
                                stack.push(op);
                            }
                        } else {
                            reduceOps(stack, op.prio());
                            stack.push(op);
                        }
                    } else if (op.type === "propertyRef") {
                        // prefix property?
                        if (!prevExpr) {
                            if (stack.length > 1 && stack[stack.length - 2].expr !== null) {
                                var stackTop = stack.pop()
                                stackTop.markError(lf("TD148: we didn't expect {0} here",
                                                        stackTop.op ? "'" + stackTop.op + "'" : lf("this")))
                                prevExpr = stack.peek().expr;
                                // and continue with normal parsing
                            } else {
                                op.markError(lf("TD149: property needs an expression in front"));
                                continue;
                            }
                        } else {
                            var end = op.beg + op.len;
                            op.beg = prev.beg;
                            op.len = end - op.beg;
                            stack.pop();
                        }

                        var args = parseCallArgs(prevExpr);
                        op.expr = mkCall(op.propertyRef, args);
                        op.expr.loc = op;
                        var prevTok = tokens[currentTok - 1];
                        op.len = prevTok.beg + prevTok.len - op.beg;
                        Util.assert(!isNaN(op.len));
                        stack.push(op);

                    } else if (op.prio() < 0) {
                        if (op.op === "(") {
                            if (prevExpr) {
                                op.markError(lf("TD150: cannot call the thing before '('"));
                                stack.push(mkComma(op));
                            }
                            var nl = new StackOp();
                            nl.expr = parseParenFree(false);
                            nl.expr.loc = nl;
                            nl.copyFrom(op);
                            stack.push(nl);
                            if (!expect(")")) {
                                op.markError(lf("TD151: unclosed '('"));
                            }
                            var lasttok = tokens[currentTok - 1]
                            nl.len = lasttok.beg + lasttok.len - op.beg;
                        } else if (op.op === ")") {
                            if (isTop) {
                                op.markError(lf("TD152: unexpected ')'"));
                            } else {
                                currentTok--;
                                break;
                            }
                        }
                    } else {
                        // doesn't happen?
                        op.markError(lf("TD153: parse error"));
                    }
                }


                while (stack.length > 0) {
                    if (stack.peek().expr === null) {
                        stack.peek().markError(lf("TD154: the operator needs something after it"));
                        if (/^fun:/.test(stack.peek().op)) {
                            stack.push(mkZero(stack.peek()))
                            break
                        } else {
                            stack.pop();
                        }
                    } else {
                        break;
                    }
                }

                reduceOps(stack, 1);

                var t = stack.peek();
                if (!t || !t.expr)
                    return <Expr>mkPlaceholderThingRef();
                else
                    return t.expr;
            }

            return parseParenFree(true);
        }
}
