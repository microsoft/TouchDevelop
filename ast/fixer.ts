///<reference path='refs.ts'/>

module TDev.AST.Fixer
{
    function flatten(e0:Expr):Token[]
    {
        var r:Token[] = []

        function pushOp(c:string) {
            r.push(mkOp(c))
        }

        function call(e:Call, outPrio:number) {
            if (e.savedFix)
                e = e.savedFix

            if (e.propRef.fromOp && e.propRef.fromOp.getFunArgs()) {
                r.push(e.propRef.fromOp)
                rec(e.args[1], -1)
                return
            }

            var p = e.getCalledProperty()
            var infixPri = p.getInfixPriority() || 0

            if (infixPri) {
                if (p.getName() == "-" && e.args[0].getLiteral() === 0.0) {
                    pushOp(p.getName())
                    rec(e.args[1], 98)
                    return
                }

                if (infixPri < outPrio) pushOp("(");
                if (e.args.length == 1) {
                    pushOp(p.getName())
                    rec(e.args[0], infixPri)
                } else {
                    var bindLeft = infixPri != 4 && infixPri != 98
                    rec(e.args[0],  bindLeft ? infixPri : infixPri + 0.1)
                    pushOp(p.getName())
                    rec(e.args[1], !bindLeft ? infixPri : infixPri + 0.1)
                }
                if (infixPri < outPrio) pushOp(")");
            } else {
                rec(e.args[0], 1000)
                r.push(mkPropRef(p.getName()))
                if (e.args.length > 1) {
                    pushOp("(")
                    e.args.slice(1).forEach((ee, i) => {
                        if (i > 0) pushOp(",")
                        rec(ee, -1)
                    })
                    pushOp(")")
                }
            }
        }

        function rec(e:Expr, prio:number) {
            if (e instanceof Call)
                call(<Call>e, prio)
            else if (typeof e.getLiteral() === "number")
                Util.numberToStringNoE(e.getLiteral()).split("").forEach(pushOp)
            else r.push(e)
        }

        rec(e0, -1)

        return r
    }

    function staticPropRef(s:string, p:string) 
    {
        return [<AST.Token> AST.mkThing(s), AST.mkPropRef(p)]
    }

    function findDefaultCore(p:PropertyParameter)
    {
        var defl = p.getDefaultValue();
        if (!!defl) return defl;
        var k = p.getKind();
        switch (k.getName()) {
        case "Number": return [AST.mkOp("0")];
        case "String": return [AST.mkLit("")];
        case "Boolean": return [AST.mkLit(false)];
        case "Color": return AST.proMode ? null : staticPropRef("colors", "random");
        }
        if (k.isAction) {
            var ak = <ActionKind>k
            var pp = ak.getOutParameters()
            if (pp.length == 1) {
                return [AST.mkFunOp(ak.getInParameters().map(p => p.getName()))].concat(findDefaultCore(pp[0]) || [AST.mkPlaceholder(pp[0])])
            }
        }
        return null;
    }

    export function tokenize(toks:AST.Token[]) : AST.Token[] 
    {
        return toks.collect((t:AST.Token) => {
            if (t instanceof AST.Literal) return flatten(<Literal>t)
            else return [t];
        });
    }

    export function findDefault(p:PropertyParameter, locals:LocalDef[])
    {
        var r = findDefaultCore(p);
        if (!r) {
            var numChoices = 0
            if (!AST.proMode)
                Script.variables().forEach((g) => {
                    if (g.getKind() == p.getKind()) {
                        numChoices++
                        r = [AST.mkThing("data"),
                             AST.mkPropRef(g.getName())];
                    }
                });
            locals.forEach((l:AST.LocalDef) => {
                if (l.getKind() == p.getKind()) {
                    numChoices++
                    r = [AST.mkThing(l.getName())];
                }
            });
            if (AST.proMode && numChoices > 1)
                r = null
        }
        if (!r) {
            r = [AST.mkPlaceholder(p)];
        }
        return tokenize(r);
    }

    export function getFix(eh:ExprHolder):Token[]
    {
        if (!eh.hasFix || !eh.parsed) return null

        return flatten(eh.parsed)
    }


}
