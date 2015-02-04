///<reference path='refs.ts'/>

module TDev.AST {
    export module Merge {
        //var mergeLog = Util.log;
        var mergeLog = (x) => {return};
        var getTime = () => {return new Date().getTime()};
        var seqTime = [];
        var sccTime = 0;
        var treeTime = [];
        var imTime = 0;
        var oldSeqMerge = false;
        var numChecks = 0;

        export var badAstMsg = "malformed ASTs";

        function enc(s : string) : string {
            return "!"+s
        }

        function dec(s : string) : string {
            return s.substr(1)
        }

        function getStableName(x : Stmt) : string {
            if(x instanceof App) {
                return "***"; // TODO XXX - is this an okay globally-unique symbol for the app ID?
            } else {
                return enc(x.getStableName());
            }
        }

        function setStableName(x : Stmt, name : string) {
            x.setStableName(dec(name));
        }

        function containsId(
            table : { [s:string]:HashNode},
            id : string
        ) : boolean {
            if(table[id]) {
                return true;
            } else {
                return false;
            }
        }

        function containsArrow(
            table : { [s:string]:HashNode},
            id1 : string,
            id2 : string
        ) : boolean {
            var a = table[id1];

            if(oldSeqMerge) {
                if(a && a.successors.indexOf(id2) >= 0) {
                    return true;
                } else {
                    return false;
                }
            } else {
                var b = table[id2];
                if(a && b && a.order < b.order) {
                    return true;
                } else {
                    return false;
                }
            }
        }

        function getNodeHash(sh : HashNode[]) : {[s:string]:HashNode} {
            var result : {[s:string]:HashNode} = {};
            sh.forEach(x => {
                result[x.name] = x;
            });
            return result;
        }

        function getChildren(s : HashNode) : HashNode[] {
            if(!s) return[];

            var stmts : Stmt[] = <Stmt[]>(s.stmt.children().filter(x => x instanceof Stmt));

            if (s.stmt instanceof If &&
                stmts.length == 2 &&
                stmts[1] instanceof CodeBlock &&
                (<CodeBlock>stmts[1]).isBlockPlaceholder())
                stmts.pop()


            //if(s.stmt instanceof Block) {
                return stmts.map(function(x : Stmt, i : number) {
                    return new HashNode(s.name, getStableName(x), [], x);
                });
            /*} else {
                return stmts.map(function(x : Stmt, i : number) {
                    return new HashNode(s.name, s.name+"_"+i, [], x);
                });
            }*/
        }

        export class HashNode {
            public parent : string;
            public name : string;
            public successors : string[];
            public stmt : Stmt;
            public order : number;
            public used : boolean;

            constructor(parent : string, name : string, successors : string[], stmt : Stmt) {
                this.parent = parent;
                this.name = name;
                this.successors = successors;
                this.stmt = stmt;
            }

            public toString() : string {
                return ""+this.name+":("+this.parent+"):["+/*this.successors.join(",")+*/"]"
            }
        }

        function getStmt(table : { [s:string]:HashNode}, key : string) : Stmt {
            if(table[key]) {
                return table[key].stmt;
            } else {
                return null;
            }
        }

        export function getIds(sl : Stmt[], allIds : string[]) : {[s:string]:HashNode} {
            var nodeIndex = 0;
            // returns the flattened list
            function flatten(
                sl : HashNode[],
                table : { [s:string]:HashNode},
                arr : string[]
            ) : string[] {
                return sl.reduce(
                    function(acc2 : string[], x : HashNode, i : number) {
                        //mergeLog("getIds: "+x.name+" => "+x.toString());
                        x.order = nodeIndex++;
                        table[x.name] = null;
                        var theParent : string = undefined;

                        theParent = x.parent;

                        table[x.name] = x;
                        allIds.push(x.name);

                        acc2.push(x.name);
                        return flatten(getChildren(x), table, acc2);
                    },
                    arr
                );
            }

            var result : { [s:string]:HashNode } = {};
            var flat = flatten(sl.map((x : Stmt) => new HashNode(undefined, getStableName(x), [], x)), result, []);
            flat.forEach(function(x,i) {
              result[x].successors = flat.slice(i+1,flat.length)    
            });
            return result;
        }

        function transitiveClosure(
            succMap : { [s : string] : {[t:string] : number } }
        ) {
            var keys = Object.keys(succMap);
            mergeLog(">>> transitive closure: "+keys.length)
            keys.forEach(k => {
                keys.forEach(i => {
                    keys.forEach (j => {
                        succMap[i][j] = succMap[i][j] ||
                            (succMap[i][k] && succMap[k][j]);
                    })
                })
            })
        }

        export function stronglyConnectedComponents(
            succMap : { [s : string] : {[t:string] : number } },
            keys : string[],
            resultAssignment : { [s : string] : number },
            debug = false
        ) : string[][] {
            //if(debug) console.log("SCC: "+keys.length);
            var index = 0;
            var stack = [];
            var stackVals = {};
            var indices = {};
            var lowlink = {};
            var result : string[][] = [];
            var currentComponent : string[] = [];

            keys.forEach(v => {
                if(!indices[v]) strongConnect(v);
            });

            function strongConnect(v : string, depth = 0) {
                //mergeLog("strongConnect("+v+"): "+depth);
                //if(debug) numChecks++;
                indices[v] = index;
                lowlink[v] = index;
                index++;
                stack.push(v);
                stackVals[v] = true;

                // for each edge (v,w) ...
                var temp = succMap[v];
                if(temp) {
                    Object.keys(temp).forEach(w => {
                        //var check = temp[w];
                        //Util.assert(check > 0);
                        //if(check) {
                            // do the following:
                            if(indices[w] == undefined) {
                                strongConnect(w, depth+1);
                                lowlink[v] = Math.min(lowlink[v], lowlink[w]);
                            } else {
            //var sccStart = getTime();
                                //var ind = stack.indexOf(w);
                                var ind = stackVals[w]
            //var sccEnd = getTime();
            //if(debug) sccTime += (sccEnd-sccStart);
                                if(ind >= 0) {
                                    lowlink[v] = Math.min(lowlink[v], indices[w]);
                                }
                            }
                        //}
                    });
                }

                if(lowlink[v] == indices[v]) {
                    currentComponent = [];
                    do {
                        var w = stack.pop();
                        delete stackVals[w];
                        currentComponent.push(w);
                    } while(w != v);
                    result.push(currentComponent);
                }
            }

            result.forEach((comp,index) => {
                comp.forEach(v => {
                    resultAssignment[v] = index;
                });
            });

            return result;
        }

        function initMatrix(
            succMap : { [s : string] : {[t:string] : number } },
            keys : string[],
            init : number = 0
        ) {
            keys.forEach(i => {
                succMap[i] = {};
                /*keys.forEach(j => {
                    succMap[i][j] = init;
                });*/
            });
        }

        function printMatrix(m : { [s : string] : {[t:string] : number } }) {
            var str = "";
            Object.keys(m).forEach(j => {
                str += ", "+j;
            });
            mergeLog(str);

            Object.keys(m).forEach(i => {
                str = "";
                Object.keys(m).forEach(j => {
                    str += ", "+m[i][j];
                });
                mergeLog(i+str);
            })
        }

        function tokensToStr(a:Token[]) : string {
            return a.map((x:Token) => x.getText()).join(" ");
        }

        function strToTokens(s:string) : Token[] {
            return s.split(/\s+/).map((y:string) => {var t = new Literal(); t.data = y; return t});
        }

        export function merge3(o:Stmt, a:Stmt, b:Stmt, noprint=false) : Stmt {
            if(!noprint) {
                sccTime = 0;
                imTime = 0;
                seqTime = [0,0,0,0,0,0,0,0,0,0];
                treeTime = [0,0,0,0,0,0,0];
                numChecks = 0;
            }

            /*if(!noprint) {
                myO = o;
                myA = a;
                myB = b;
            }*/

            var start = getTime();
            mergeLog(">>> Merge: "+getTime()+" begin merge3");

            mergeLog(">>> Merge: "+getTime()+" get IDs");

            var lo = [];
            var la = [];
            var lb = [];
            var hashO = getIds([o], lo);
            var hashA = getIds([a], la);
            var hashB = getIds([b], lb);

            function combineTokens(tl:Token[]) : Token[] {
                return TDev.AST.ExprParser.parse0(tl).map(
                    (x:StackOp) => { 
                        if(x.expr) {
                            return <Token>(x.expr);
                        } else {
                            return TDev.AST.mkOp(x.op);
                        }
                    }
                );
            }

            function merge3tokens(eOt:Token[], eAt:Token[], eBt:Token[], combine) : Token[] {
                //mergeLog(">>> merge3tokens: "+tokensToStr(eOt)+"; "+tokensToStr(eAt)+"; "+tokensToStr(eBt));
                var i = 0;
                //var com = combine ? ((x:Token[]) => combineTokens(x)) : ((x:Token[]) => x);
                var com = ((x:Token[]) => x);
                var eO = new ExprHolder(); eO.tokens = com(eOt);
                var eA = new ExprHolder(); eA.tokens = com(eAt);
                var eB = new ExprHolder(); eB.tokens = com(eBt);
                var tmap : { [s : string] : Token } = {};
                var index = 0; // unique id for tokens
                // the following function compares ThingRef tokens by Decl ID,
                // and otherwise uses the default token-distance function
                var f = (tokenDist) => {
                    return (a:Token, b:Token) => {
                        if((!a) || (!b)) {
                            return tokenDist(a,b);
                        // TODO XXX - something is wrong with the following
                        } /*else if((a instanceof ThingRef) && (b instanceof ThingRef)) {
                            console.log(">>> comparing: "+a+", "+b+" -> ");
                                console.log(">>> "+(<ThingRef>a).def.getStableName());
                                console.log(">>> "+(<ThingRef>b).def.getStableName());
                            if((<ThingRef>a).def.getStableName() == (<ThingRef>b).def.getStableName()) {
                                return 0;
                            } else {
                                return 3;
                            }
                        }*/ else {
                            return tokenDist(a,b);
                        }
                    };
                };
                TDev.AST.Diff.diffExprs(eO, eA, {}, f);
                TDev.AST.Diff.diffExprs(eO, eB, {}, f);
                var da = eA.diffTokens;
                var db = eB.diffTokens;
                // compute IDs for the base tokens
                var arrO = [];
                for(var i = 0; i < da.length; i+=2) {
                    if(da[i]) {
                        var name = ""+index;
                        tmap[name] = da[i];
                        index++;
                        arrO.push(name);
                    }
                }
                // compute IDs for the A tokens
                var arrA = [];
                var j = 0; // keeps track of position in base
                for(i = 1; i < da.length; i+=2) {
                    if(da[i]) {
                        if(da[i-1]) {
                            arrA.push(""+j);
                        } else {
                            var name = ""+index;
                            tmap[""+index] = da[i];
                            index++;
                            arrA.push(name);
                        }
                    }

                    if(da[i-1]) j++;
                }
                // compute IDs for the B tokens
                var arrB = [];
                j = 0; // keeps track of position in base
                for(i = 1; i < db.length; i+=2) {
                    if(db[i]) {
                        if(db[i-1]) {
                            arrB.push(""+j);
                        } else {
                            var name = ""+index;
                            tmap[""+index] = db[i];
                            index++;
                            arrB.push(name);
                        }
                    }

                    if(db[i-1]) j++;
                }
                //mergeLog(">>>> O=["+arrO.join(",")+"], A=["+arrA.join(",")+"], B=["+arrB.join(",")+"]");

                function mapper(x:string[]) : App {
                    var v = new App(null); // TODO - use Block
                    v.things = x.map((y:string)=>{
                        var z = new Decl();
                        z.setStableName(y);
                        return z;
                    });
                    return v;
                }

                var result : App = <App>merge3(mapper(arrO),mapper(arrA),mapper(arrB),true);

                return result.things.map((x:Decl)=>tmap[x.getStableName()]);
            }

            var maxDepth = 0;

            function merge3node(
                oN : HashNode,
                aN : HashNode,
                bN : HashNode,
                cmap : { [s : string] : string[] },
                depth = 0
            ) : Stmt {
                // NOTE - oN,aN,bN must agree on the name (stableName)
                maxDepth = Math.max(depth, maxDepth);
                var id;
                if(oN) {
                    id = oN.name;
                } else if(aN) {
                    id = aN.name;
                } else if(bN) {
                    id = bN.name;
                } else {
                    return null;
                }

                //mergeLog("merge3node("+id+"): "+maxDepth);

                // "id" should be defined by now
                var childs = cmap[id];
                if(!childs) {
                    childs = [];
                }

                var newChilds = [];
                //if(!id) {
                //    mergeLog("BAD!"); // TODO - get rid of
                //} else  {
                    newChilds = childs.map(function(x : string) {
                        //mergeLog("  trying: "+x+" : "+[hashO,hashA,hashB].map(y=>y[x]).join(", "));
                        return merge3node(hashO[x], hashA[x], hashB[x], cmap, depth+1);
                    });
                //}

                function getNewChild(index : number) : Stmt {
                    var rc = newChilds[index];
                    if(rc) {
                        return rc;
                    } else {
                        return null;
                    }
                }

                function merge3inputs(f, combine) {
                    var oTok = []; if(oN) oTok = f(oN.stmt);
                    var aTok = []; if(aN) aTok = f(aN.stmt);
                    var bTok = []; if(bN) bTok = f(bN.stmt);

                    return merge3tokens(oTok, aTok, bTok, combine);
                }


                /*
(Stmt)
  -RecordField
  -ResolveClause
  Binding
    -ActionBinding
    -KindBinding

  *(Comment)
  (Block)
    -(CodeBlock)
    -(ConditionBlock)
    -(ParameterBlock)
    -(BindingBlock)
    -(ResolveBlock)
    -(FieldBlock)
    -(InlineActionBlock)
  *(For)
  *(Foreach)
  *(While)
  *(If)
  *(Box)
  *(ExprStmt)
    *(InlineActions)
  *(InlineAction)
  (ForeachClause)
    *(Where)
  -(ActionParameter)
  -(ActionHeader)
  (Decl)
    (PropertyDecl)
      *(GlobalDef)
      *(Action)
      *(RecordDef)
      *(LibraryRef)
    (SingletonDef)
    (PlaceholderDef)
    -(LocalDef)
    -(App)


                   */

                // construct a new node containing newChilds
                function test(x) {
                    var t1 = !oN || (oN.stmt instanceof x);
                    var t2 = !aN || (aN.stmt instanceof x);
                    var t3 = !bN || (bN.stmt instanceof x);
                    return t1 && t2 && t3;
                }

                function getChange(f) {
                    if(!aN && !bN) {
                        return undefined; // TODO - this should never happen?
                    } else if(!aN) {
                        return f(bN.stmt);
                    } else if(!bN) {
                        return f(aN.stmt);
                    } else if(!oN) {
                        return f(aN.stmt);
                    }

                    // at this point, oN.stmt,aN.stmt,bN.stmt are all defined
                    if(f(oN.stmt) == f(aN.stmt)) {
                        return f(bN.stmt);
                    } else {
                        return f(aN.stmt);
                    }
                }
                
                function mergeExprHolder(f) {
                    var temp = new ExprHolder();
                    temp.tokens = merge3inputs(x => f(x).tokens, true);
                    return temp
                }

                var result : Stmt = null;

                var newName = undefined;

                if(test(RecordField)) {
                    var dataKind = getChange(x => (<RecordField>x).dataKind);
                    var isKey = getChange(x => (<RecordField>x).isKey);
                    var nm = getChange(x => (<RecordField>x).getName());
                    result = new RecordField(nm, dataKind, isKey); // TODO - correct args?
                } else if(test(ResolveClause)) {
                    var nm = getChange(x => (<ResolveClause>x).name);
                    result = new ResolveClause(nm);
                    (<ResolveClause>result).kindBindings = <BindingBlock>getNewChild(0); // TODO - check cast?
                    (<ResolveClause>result).actionBindings = <BindingBlock>getNewChild(1);
                    (<ResolveClause>result).defaultLib = getChange(x => (<ResolveClause>x).defaultLib);
                    // TODO - more properties?
                } else if(test(ActionBinding)) {
                    var nm = getChange(x => (<ActionBinding>x).formalName);
                    result = new ActionBinding(nm);
                    (<ActionBinding>result).actualLib = getChange(x => (<ActionBinding>x).actualLib);
                    (<ActionBinding>result).actualName = getChange(x => (<ActionBinding>x).actualName);
                    (<ActionBinding>result).actual = getChange(x => (<ActionBinding>x).actual);
                    (<ActionBinding>result).isExplicit = getChange(x => (<ActionBinding>x).isExplicit);
                } else if(test(KindBinding)) {
                    var nm = getChange(x => (<KindBinding>x).formalName);
                    result = new KindBinding(nm);
                    (<KindBinding>result).actual = getChange(x => (<KindBinding>x).actual);
                    (<KindBinding>result).isExplicit = getChange(x => (<KindBinding>x).isExplicit);
                } else if(test(Binding)) {
                    var nm = getChange(x => (<Binding>x).formalName);
                    result = new Binding(nm);
                    (<Binding>result).isExplicit = getChange(x => (<Binding>x).isExplicit);
                } else if(test(Comment)) {
                    result = new Comment();
                    (<Comment>result).text = tokensToStr(merge3inputs(x => strToTokens((<Comment>x).text), false));
                    //(<Comment>result).text = getChange(x => (<Comment>x).text);
                } else if(test(CodeBlock)) {
                    //mergeLog("CodeBlock");
                    result = new CodeBlock();
                    (<CodeBlock>result).stmts = newChilds;
                    (<CodeBlock>result).flags = getChange(x => (<CodeBlock>x).flags);
                } else if(test(ConditionBlock)) {
                    //mergeLog("ConditionBlock");
                    result = new ConditionBlock();
                    (<ConditionBlock>result).stmts = newChilds;
                } else if(test(ParameterBlock)) {
                    //mergeLog("ParameterBlock");
                    result = new ParameterBlock();
                    (<ParameterBlock>result).stmts = newChilds;
                } else if(test(BindingBlock)) {
                    //mergeLog("BindingBlock");
                    result = new BindingBlock();
                    (<BindingBlock>result).stmts = newChilds;
                } else if(test(ResolveBlock)) {
                    //mergeLog("ResolveBlock");
                    result = new ResolveBlock();
                    (<ResolveBlock>result).stmts = newChilds;
                } else if(test(FieldBlock)) {
                    //mergeLog("FieldBlock");
                    result = new FieldBlock();
                    (<FieldBlock>result).stmts = newChilds;
                    (<FieldBlock>result).parentDef = getChange(x => (<FieldBlock>x).parentDef);
                } else if(test(InlineActionBlock)) {
                    //mergeLog("InlineActionBlock");
                    result = new InlineActionBlock();
                    (<InlineActionBlock>result).stmts = newChilds;
                } else if(test(Block)) {
                    throw Error(badAstMsg);
                    //mergeLog("Block");
                    result = new Block();
                    (<Block>result).stmts = newChilds;
                } else if(test(For)) {
                    //mergeLog("For");
                    result = new For();
                    (<For>result).body = <CodeBlock>getNewChild(0); // TODO - check cast?
                    (<For>result).boundLocal = getChange(x => (<For>x).boundLocal);
                    (<For>result).upperBound = mergeExprHolder(x => (<For>x).upperBound);
                } else if(test(Foreach)) {
                    //mergeLog("Foreach");
                    result = new Foreach();
                    (<Foreach>result).conditions = <ConditionBlock>getNewChild(0); // TODO - check cast?
                    (<Foreach>result).body = <CodeBlock>getNewChild(1);
                    (<Foreach>result).boundLocal = getChange(x => (<Foreach>x).boundLocal);
                    (<Foreach>result).collection = mergeExprHolder(x => (<Foreach>x).collection);
                } else if(test(While)) {
                    //mergeLog("While");
                    result = new While();
                    (<While>result).body = <CodeBlock>getNewChild(0); // TODO - check cast?
                    (<While>result).condition = mergeExprHolder(x => (<While>x).condition);
                } else if(test(OptionalParameter)) {
                    result = new OptionalParameter();
                    (<OptionalParameter>result)._opt_name = getChange(x => (<OptionalParameter>x).getName());
                    (<OptionalParameter>result).expr = mergeExprHolder(x => (<OptionalParameter>x).expr);
                } else if(test(If)) {
                    //mergeLog("If");
                    result = new If();
                    (<If>result).rawThenBody = <CodeBlock>getNewChild(0); // TODO - check cast?
                    var elseBody = <CodeBlock>getNewChild(1);
                    if (!elseBody) {
                        elseBody = Parser.emptyBlock()
                        elseBody.stmts[0].initStableName()
                    }
                    (<If>result).rawElseBody = elseBody;
                    (<If>result).rawCondition = mergeExprHolder(x => (<If>x).rawCondition);
                    (<If>result).isElseIf = getChange(x => (<If>x).isElseIf);
                    (<If>result).displayElse = getChange(x => (<If>x).displayElse);
                } else if(test(Box)) {
                    //mergeLog("Box");
                    result = new Box();
                    (<Box>result).body = <CodeBlock>getNewChild(0); // TODO - check cast?
                } else if(test(InlineActions)) {
                    //mergeLog("InlineActions");
                    result = new InlineActions();
                    (<InlineActions>result).actions = <InlineActionBlock>getNewChild(0); // TODO - check cast?
                    (<InlineActions>result).expr = mergeExprHolder(x => (<InlineActions>x).expr)
                } else if(test(ExprStmt)) {
                    //mergeLog("ExprStmt");
                    result = new ExprStmt();
                    (<ExprStmt>result).expr = mergeExprHolder(x => (<ExprStmt>x).expr)
                } else if(test(InlineAction)) {
                    //mergeLog("InlineAction");
                    result = new InlineAction();
                    (<InlineAction>result).body = <CodeBlock>getNewChild(0); // TODO - check cast?
                    (<InlineAction>result).name = getChange(x => (<InlineAction>x).name);
                    (<InlineAction>result).isOptional = getChange(x => (<InlineAction>x).isOptional);
                    (<InlineAction>result).isImplicit = getChange(x => (<InlineAction>x).isImplicit);
                    (<InlineAction>result).inParameters = getChange(x => (<InlineAction>x).inParameters);
                    (<InlineAction>result).outParameters = getChange(x => (<InlineAction>x).outParameters);
                } else if(test(Where)) {
                    //mergeLog("Where");
                    result = new Where();
                    (<Where>result).condition = mergeExprHolder(x => (<Where>x).condition);
                } else if(test(ForeachClause)) {
                    //mergeLog("ForeachClause");
                    result = new ForeachClause();
                } else if(test(ActionParameter)) {
                    //mergeLog("ActionParameter");
                    result = new ActionParameter(mkLocal(
                        getChange(x => (<ActionParameter>x).getName()),
                        getChange(x => (<ActionParameter>x).getKind())
                        ));
                } else if(test(ActionHeader)) {
                    //mergeLog("ActionHeader");
                    result = new ActionHeader(new Action());
                    (<ActionHeader>result).inParameters = (<ParameterBlock>getNewChild(0)); // TODO - check cast?
                    (<ActionHeader>result).outParameters = (<ParameterBlock>getNewChild(1));
                    (<ActionHeader>result).action.body = (<CodeBlock>getNewChild(2));
                } else if(test(GlobalDef)) {
                    //mergeLog("GlobalDef");
                    result = new GlobalDef();
                    (<GlobalDef>result).readonly = getChange(x => (<GlobalDef>x).readonly);
                    (<GlobalDef>result).comment = getChange(x => (<GlobalDef>x).comment);
                    (<GlobalDef>result).url = getChange(x => (<GlobalDef>x).url);
                    (<GlobalDef>result).isResource = getChange(x => (<GlobalDef>x).isResource);
                    (<GlobalDef>result).isTransient = getChange(x => (<GlobalDef>x).isTransient);
                    (<GlobalDef>result).cloudEnabled = getChange(x => (<GlobalDef>x).cloudEnabled);
                    (<GlobalDef>result).debuggingData = getChange(x => (<GlobalDef>x).debuggingData);
                    (<GlobalDef>result).cloudEnabled = getChange(x => (<GlobalDef>x).cloudEnabled);
                } else if(test(Action)) {
                    //mergeLog("Action");
                    result = new Action();
                    var ah : ActionHeader = (<ActionHeader>getNewChild(0)); // TODO - check cast?
                    (<Action>result).body = ah.action.body;
                    ah.action = (<Action>result);
                    ah.inParameters.parent = result;
                    ah.outParameters.parent = result;
                    (<Action>result).header = ah;
                    (<Action>result).isPrivate = getChange(x => (<Action>x).isPrivate);
                    (<Action>result)._isPage = getChange(x => (<Action>x)._isPage);
                    (<Action>result)._isTest = getChange(x => (<Action>x)._isTest);
                    (<Action>result)._isActionTypeDef = getChange(x => (<Action>x)._isActionTypeDef);
                    (<Action>result).isAtomic = getChange(x => (<Action>x).isAtomic);
                    (<Action>result).eventInfo = getChange(x => (<Action>x).eventInfo);
                    (<Action>result).isOffline = getChange(x => (<Action>x).isOffline);
                    (<Action>result).isQuery = getChange(x => (<Action>x).isQuery);
                    (<Action>result)._isTest = getChange(x => (<Action>x)._isTest);
                    // TODO XXX make sure the following is okay
                    if(getChange(x => (<Action>x).modelParameter)) {
                        (<Action>result).modelParameter = <ActionParameter>ah.inParameters.stmts.shift();
                    }
                } else if(test(RecordDef)) {
                    result = new RecordDef();
                    (<RecordDef>result).keys = (<FieldBlock>getNewChild(0)); // TODO - check cast?
                    (<RecordDef>result).values = (<FieldBlock>getNewChild(1));
                    (<RecordDef>result).description = getChange(x => (<RecordDef>x).description);
                    (<RecordDef>result).recordType = getChange(x => (<RecordDef>x).recordType);
                    (<RecordDef>result).cloudEnabled = getChange(x => (<RecordDef>x).cloudEnabled);
                    (<RecordDef>result).persistent = getChange(x => (<RecordDef>x).persistent);
                    (<RecordDef>result)._isExported = getChange(x => (<RecordDef>x)._isExported);
                    newName = getChange(x => (<RecordDef>x).getCoreName());
                    // TODO - what other things do we need to set here?
                } else if(test(LibraryRef)) {
                    result = new LibraryRef();
                    (<LibraryRef>result).resolveClauses = (<ResolveBlock>getNewChild(0));
                    (<LibraryRef>result).guid = getChange(x => (<LibraryRef>x).guid);
                    (<LibraryRef>result).pubid = getChange(x => (<LibraryRef>x).pubid);
                    (<LibraryRef>result)._publicActions = getChange(x => (<LibraryRef>x)._publicActions);
                    (<LibraryRef>result)._publicKinds = getChange(x => (<LibraryRef>x)._publicKinds);
                    // TODO - what other things do we need to set here?
                } else if(test(PropertyDecl)) {
                    throw Error(badAstMsg);
                    //mergeLog("PropertyDecl");
                    result = new PropertyDecl();
                } else if(test(SingletonDef)) {
                    throw Error(badAstMsg);
                    //mergeLog("SingletonDef");
                    result = new SingletonDef();
                    (<SingletonDef>result)._isBrowsable = getChange(x => (<SingletonDef>x)._isBrowsable);
                } else if(test(PlaceholderDef)) {
                    throw Error(badAstMsg);
                    //mergeLog("PlaceholderDef");
                    result = new PlaceholderDef();
                } else if(test(LocalDef)) {
                    //mergeLog("LocalDef");
                    result = new LocalDef();
                } else if(test(App)) {
                    //mergeLog("App");
                    result = new App(null);
                    (<App>result).rootId = getChange(x => (<App>x).rootId);
                    (<App>result).icon = getChange(x => (<App>x).icon);
                    (<App>result).color = getChange(x => (<App>x).color);
                    (<App>result).comment = getChange(x => (<App>x).comment);
                    (<App>result).iconArtId = getChange(x => (<App>x).iconArtId);
                    (<App>result).splashArtId = getChange(x => (<App>x).splashArtId);
                    App.metaMapping.forEach(k => {
                        result[k] = getChange(x => x[k])
                    });
                    (<App>result).setPlatform(getChange(x => (<App>x).getPlatformRaw()));
                    (<App>result).things = <Decl[]>newChilds;
                    // TODO XXX
                } else if(test(Decl)) {
                    //mergeLog("Decl");
                    result = new Decl();
                    (<Decl>result)._wasTypechecked = getChange(x => (<Decl>x)._wasTypechecked);
                    (<Decl>result).deleted = getChange(x => (<Decl>x).deleted);
                    // TODO - do we need to handle this parent separately?
                    (<Decl>result).wasAutoNamed = getChange(x => (<Decl>x).wasAutoNamed);
                    (<Decl>result).visitorState = getChange(x => (<Decl>x).visitorState);
                    (<Decl>result).diffStatus = getChange(x => (<Decl>x).diffStatus);
                    (<Decl>result).diffAltDecl = getChange(x => (<Decl>x).diffAltDecl);
                } else if(test(Stmt)) {
                    throw Error(badAstMsg);
                    //mergeLog("Stmt");
                    result = new Stmt();
                } else {
                    //mergeLog("<<NONE>>");
                    throw Error(badAstMsg); // TODO - can't merge - what should we do here?
                    //result = new CodeBlock();
                    //(<CodeBlock>result).stmts = newChilds;
                }

                result._kind = getChange(x => x._kind); // TODO XXX

                setStableName(result, id);

                if(newName) result.setName(newName)
                else result.setName(getChange(x => x.getName()));

                newChilds.forEach(function(x:Stmt) {
                    x.parent = result;
                });

                return result;
            }

            mergeLog(">>> Merge: "+getTime()+" init maps");

            var tt = getTime();

            var parentMap : { [s : string] : string } = {};
            var parentTemp : { [s : string] : boolean } = {};
            var added : { [s : string] : boolean } = {};
            var succMap : { [s : string] : {[t:string] : number } } = {};

            // TODO XXX - don't use "for"!
            Object.keys(hashO).forEach(key => { parentMap[key] = null; });
            Object.keys(hashA).forEach(key => { parentMap[key] = null; });
            Object.keys(hashB).forEach(key => { parentMap[key] = null; });

            var tt2 = getTime(); treeTime[0]+=(tt2-tt); tt = tt2; // 0

            mergeLog(">>> Merge: "+getTime()+" step 1");

            // step 1 - perform additions and deletions
            
            Object.keys(parentMap).forEach(x => {
                var intersect = (containsId(hashA,x) &&
                    containsId(hashB,x) && containsId(hashO,x));
                if(
                    !(((containsId(hashA,x) || containsId(hashB,x)) &&
                    !(containsId(hashO,x))) || intersect)
                ) {
                    delete parentMap[x];
                } else if(!intersect) {
                    added[x] = true;
                }
            });

            var tt2 = getTime(); treeTime[1]+=(tt2-tt); tt = tt2; // 1

            //if(!noprint) console.log("added: "+Object.keys(added));

            mergeLog(">>> Merge: "+getTime()+" step 2");

            function applyChanges(f) {
                Object.keys(parentMap).forEach(x => {
                    var pO = hashO[x];
                    var pA = hashA[x];
                    var pB = hashB[x];

                    f(x,parentMap,(pO ? pO.parent : undefined),(pA ? pA.parent : undefined),(pB ? pB.parent : undefined));
                });
            }

            applyChanges((x,parentMap,pO,pA,pB) => { if(pA != pO) {/*console.log("locking: "+x);*/ parentTemp[x]=true;} parentMap[x]=pA });

            applyChanges((x,parentMap,pO,pA,pB) => { if(pB != pA && !parentTemp[x]) parentMap[x]=pB });

            var tt2 = getTime(); treeTime[2]+=(tt2-tt); tt = tt2; // 2

            var roots = [];
            var pk = Object.keys(parentMap)
            pk.forEach(k => {
                var src = parentMap[k];
                var dst = k;
                /*if(!succMap[src] && src) {
                    succMap[src] = {};
                }
                if(!succMap[dst] && dst) {
                    succMap[dst] = {};
                }*/
                if(src && dst) {
                    if(!succMap[src]) succMap[src] = {};
                    succMap[src][dst] = 1;
                }
                if(!src) roots.push(dst);
                // TODO - get rid of:
                //console.log("--- item="+k+", parent="+parentMap[k])
            });

            var tt2 = getTime(); treeTime[3]+=(tt2-tt); tt = tt2; // 3

            var table : { [s : string] : number } = {};
            var conn = stronglyConnectedComponents(succMap, pk, table);

            succMap = null;
            var tt2 = getTime(); treeTime[4]+=(tt2-tt); tt = tt2; // 4

            //mergeLog("strongly connected components: ");
            //mergeLog(table);
            //mergeLog("roots = "+roots.map(x => x+"("+table[x]+")").join(", "));

            function processChildren(cl : string[], done : {[t:string] : boolean }) {
                cl.forEach((x:string) => {
                    //mergeLog("processing: "+x);

                    var pA = hashA[x];
                    var childA = getNodeHash(getChildren(pA));

                    var childAll = Object.keys(childA);
                    //var childAll = Object.keys(succMap).map(k => succMap[x][k] ? k : undefined).filter(k => !!k);
                    //mergeLog("  childs: "+childAll.join(","));
                    //childAll.sort(); // TODO - get rid of

                    childAll.forEach(y => {
                        if(table[x] != table[y] && !done[table[y]]) {
                            if(parentMap[y]) parentMap[y] = x;
                            done[table[y]] = true;
                        }
                    });

                    processChildren(childAll, done);
                });
            }

            var initDone : {[t:string] : boolean } = {};
            conn.forEach(comp => {
                comp.forEach(x => {
                    if(comp.length <= 1) initDone[table[x]] = true;
                });
            });

            var tt2 = getTime(); treeTime[5]+=(tt2-tt); tt = tt2; // 5

            //mergeLog("initDone:");
            //mergeLog(initDone);
            processChildren(roots, initDone);

            //mergeLog(parentMap);

            // step 2 - determine parents
            /*Object.keys(parentMap).forEach(x => {
                var temp;
                if(
                    containsId(hashO,x) && containsId(hashA,x) &&
                    containsId(hashB,x)
                ) {
                    var p1 = hashO[x];
                    var p2 = hashA[x];
                    var p3 = hashB[x];
                    mergeLog("  check 1: ("+p1.parent+" = "+p2.parent+", "+p3.parent+")");
                    if(p1.parent==p2.parent) {
                        temp = p3;
                    } else {
                        temp = p2;
                    }
                } else if(containsId(hashA,x)) {
                    mergeLog("  check 2:");
                    var p2 = hashA[x];
                    temp = p2;
                } else { // containsId(hashB,x)
                    mergeLog("  check 3:");
                    var p3 = hashB[x];
                    temp = p3;
                }
                mergeLog("setting parent of "+x+" to "+temp.parent);
                parentMap[x] = temp.parent;
            });*/

            var tt2 = getTime(); treeTime[6]+=(tt2-tt); tt = tt2; // 6

            mergeLog(">>> Merge: "+getTime()+" step 3: "+Object.keys(parentMap).length);

            // step 3 - determine ordering
            var startX = getTime();
            var childMap : { [s : string] : string[] } = {};

            Object.keys(parentMap).forEach(x => {
                var p = parentMap[x];
                if(childMap[p]) {
                    if(childMap[p].indexOf(x) < 0) {
                        childMap[p].push(x);
                    }
                } else {
                    childMap[p] = [x];
                }
            });

            var tt2 = getTime(); seqTime[0]+=(tt2-tt); tt = tt2; // 0

            function addEdge(theX : string, theY : string, edgeMap : { [s : string] : {[t:string] : number } }, v : number = 1) {
                if(!edgeMap[theY][theX]) {
                    edgeMap[theX][theY] = v;
                }
            }

            Object.keys(childMap).forEach(px => {
                var childs = childMap[px];
                mergeLog(">>> processing children: "+px+": "+getTime());

                // now we want to order "childs"

                ////////////////////////////////////

                var addMap : { [s : string] : HashNode[] } = {};
                var edgeMap : { [s : string] : {[t : string] : number}  } = {};
                initMatrix(edgeMap, childs);

                if(oldSeqMerge) {
                    // part (a) - take the ones where A (left) disagrees
                    //if(ck.length > 2000) throw new Error("Too many children: "+ck.length) // TODO XXX - get rid of
                    mergeLog(">>> part A: "+childs.length);
                    childs.forEach(i => {
                        childs.forEach(j => {
                            if(i != j) {
                                var theX = i;
                                var theY = j;

                                if (
                                    containsArrow(hashA, theX, theY) &&
                                    (
                                        !containsArrow(hashO, theX, theY)
                                        ||
                                        !containsArrow(hashB, theY, theX)
                                    )
                                ) addEdge(theX, theY, edgeMap);

                                //if(theRes != temp) console.log(">>>>>>>>>>>>>>>> theRes != temp: ("+theRes+" != "+temp+"): "+msg);
                            }
                        });
                    });

                    transitiveClosure(edgeMap);

                    mergeLog(">>> part C");
                    // part (c) - take the ones where B (right) disagrees

                    childs.forEach(i => {
                        childs.forEach(j => {
                            if(i != j) {
                                var theX = i;
                                var theY = j;

                                /*if(
                                    containsArrow(hashB, theX, theY) &&
                                    (
                                        containsArrow(hashO, theY, theX) &&
                                        containsArrow(hashA, theY, theX)
                                    )
                                ) {
                                    addEdge(theX, theY, edgeMap);
                                }*/

                                if(
                                    containsArrow(hashB, theX, theY) &&
                                    (
                                        (
                                            containsArrow(hashO, theY, theX) &&
                                            containsArrow(hashA, theY, theX)
                                        ) ||
                                        (
                                            !containsArrow(hashO, theY, theX) &&
                                            !containsArrow(hashA, theY, theX)
                                        )
                                    )
                                ) {
                                    addEdge(theX, theY, edgeMap);
                                }
                            }
                        })
                    });

                    transitiveClosure(edgeMap);

                    mergeLog(">>> part E");
                    // part (e) - add edges from A to B where ordering is unknown

                    childs.forEach(i => {
                        childs.forEach(j => {
                            if(i != j) {
                                var theX = i;
                                var theY = j;

                                if(
                                    (
                                        containsId(hashA, theX) &&
                                        !containsId(hashB, theX)
                                    ) &&
                                    (
                                        containsId(hashB, theY) &&
                                        !containsId(hashA, theY)
                                    )
                                ) {
                                    addEdge(theX, theY, edgeMap);
                                }
                            }
                        })
                    });

                    transitiveClosure(edgeMap);
                } else {
                    // part (a) - take the ones where A (left) disagrees
                    
            var imStart = getTime();
                    // slow
                    var sla = childs.reduce((acc:HashNode[],x:string) => {
                        var y = hashA[x];
                        if(y) {
                            y.used = false;
                            acc.push(y);
                        }
                        return acc;
                    }, []).sort((x,y) => x.order < y.order ? -1 : 1) //.map(x => x.name)

                    var slb = childs.reduce((acc:HashNode[],x:string) => {
                        var y = hashB[x];
                        if(y) {
                            y.used = false;
                            acc.push(y);
                        }
                        return acc
                    }, []).sort((x,y) => x.order < y.order ? -1 : 1) //.map(x => x.name)

                    /*var sla2 = la.filter(x => !!edgeMap[x])
                    var slb2 = lb.filter(x => !!edgeMap[x])
                    var theCheck = (sla2.toString() == sla.toString() && slb2.toString() == slb.toString());
                    if(!theCheck) {
                        console.log("sla = "+sla+"\nsla2 = "+sla2);
                        console.log("slb = "+slb+"\nslb2 = "+slb2);
                    }
                    Util.assert(theCheck);*/
            var imEnd = getTime();
            imTime += (imEnd-imStart);

            var tt2 = getTime(); seqTime[1]+=(tt2-tt); tt = tt2; // 1

                    sla.reduce((prevs:HashNode[],curr:HashNode) => {
                        if(added[curr ? curr.name : undefined]) {
                            prevs.forEach((prev:HashNode) => {
                                if(!addMap[prev ? prev.name : undefined]) addMap[prev ? prev.name : undefined] = [];
                                //addMap[prev].push(curr);
                                addMap[prev ? prev.name : undefined].unshift(curr);
                            })
                        }
                        prevs.push(curr);
                        return prevs;
                    }, [undefined]);
                    slb.reduce((prevs:HashNode[],curr:HashNode) => {
                        if(added[curr ? curr.name : undefined]) {
                            prevs.forEach((prev:HashNode) => {
                                if(!addMap[prev ? prev.name : undefined]) addMap[prev ? prev.name : undefined] = [];
                                //addMap[prev].push(curr);
                                addMap[prev ? prev.name : undefined].unshift(curr);
                            })
                        }
                        prevs.push(curr);
                        return prevs;
                    }, [undefined]);
                    childs = childs.filter(x => !added[x]);

            var tt2 = getTime(); seqTime[2]+=(tt2-tt); tt = tt2; // 2

                    mergeLog(">>> part A: "+childs.length);
                    childs.forEach(i => {
                        childs.forEach(j => {
                            if(i != j) {
                                var theX = i;
                                var theY = j;

                                if (
                                    containsArrow(hashA, theX, theY) &&
                                    (
                                        !containsArrow(hashO, theX, theY)
                                        ||
                                        !containsArrow(hashB, theY, theX)
                                    )
                                ) addEdge(theX, theY, edgeMap, 1);

                                //if(theRes != temp) console.log(">>>>>>>>>>>>>>>> theRes != temp: ("+theRes+" != "+temp+"): "+msg);
                            }
                        });
                    });

            var tt2 = getTime(); seqTime[3]+=(tt2-tt); tt = tt2; // 3

                    mergeLog(">>> part B");
                    // part (c) - take the ones where B (right) disagrees

                    childs.forEach(i => {
                        childs.forEach(j => {
                            if(i != j) {
                                var theX = i;
                                var theY = j;

                                if(
                                    containsArrow(hashB, theX, theY) &&
                                    (
                                        (
                                            containsArrow(hashO, theY, theX) &&
                                            containsArrow(hashA, theY, theX)
                                        )
                                    )
                                ) {
                                    addEdge(theX, theY, edgeMap, 2);
                                }
                            }
                        })
                    });

            var tt2 = getTime(); seqTime[4]+=(tt2-tt); tt = tt2; // 4

                    mergeLog(">>> SCC: "+childs.length);
                    var nums : { [s : string] : number} = {};
                    var comps = stronglyConnectedComponents(edgeMap, childs, nums, (childs.length > 100));

            var tt2 = getTime(); seqTime[5]+=(tt2-tt); tt = tt2; // 5

                    mergeLog(">>> comps");

                    // delete all B edges which are in a non-trivial strongly-connected component,
                    // replacing them with opposing A edges
                    comps.forEach(comp => {
                        if(comp.length <= 1) return; // ignore
                        comp.forEach(x => {
                            comp.forEach(y => {
                                if(edgeMap[x][y] >= 2) {
                                    edgeMap[x][y] = 0
                                    edgeMap[y][x] = 1
                                }
                            })
                        })
                    });

            var tt2 = getTime(); seqTime[6]+=(tt2-tt); tt = tt2; // 6
                }

                ////////////////////////////////////

                //printMatrix(edgeMap);

                mergeLog(">>> sorting");
                childs.sort((a,b) => {
                    if(true || oldSeqMerge) { // TODO XXX - remove
                        if(edgeMap[a][b] > 0) {
                            return -1; 
                        } else if(edgeMap[b][a] > 0) { 
                            return 1;
                        } else {
                            throw "merge exception: ("+a+", "+b+") not ordered";
                        }
                    }
                });

                edgeMap = null;

            var tt2 = getTime(); seqTime[7]+=(tt2-tt); tt = tt2; // 7

                function pop(answer : string[]) {
                    //if(!first && !init) return answer;
                    if(childs.length == 0) return answer;
                    var first = childs.pop();

                    var a = addMap[first];
                    if(a) {
                        // NOTE - var "a" is in backwards order, i.e. the last element should appear
                        // first in the result
                        a.forEach(x => {
                            if(x && !x.used) {
                                x.used = true;
                                answer.unshift(x.name);
                            }
                        });
                        //childs = a.concat(childs);
                    }

                    if(first) answer.unshift(first);

                    return pop(answer);
                }

                if(!oldSeqMerge) {
                    childs.unshift(undefined);
                    childs = pop([]);
                    childMap[px] = childs;
                }

                sla.forEach(x => x.used = false);
                slb.forEach(x => x.used = false);

                addMap = null;
            var tt2 = getTime(); seqTime[8]+=(tt2-tt); tt = tt2; // 8
            });
            var endX = getTime();
            //seqTime += (endX-startX);

            var theTemp : string = undefined;
            delete childMap[theTemp];
            Object.keys(childMap).forEach(x => {
                var childs = childMap[x];
                var s = "";
                if(x == getStableName(o)) {
                    s = "<<ROOT>>";
                }
                mergeLog(">>> Merge: parent="+x+", child="+childs.join(", ")+" | "+s);
            });

            // TODO - childMap can now be used directly
            // to produce the new merged AST

            var end1 = getTime();

            mergeLog(">>> Merge: "+getTime()+" doing node-level merge...");
            //var rtemp = o; // TODO - see the above note
            var rtemp = merge3node(
                new HashNode(undefined, getStableName(o), [], o),
                new HashNode(undefined, getStableName(a), [], a),
                new HashNode(undefined, getStableName(b), [], b),
                childMap
            );

            var end = getTime();
            // TODO XXX - print this?
            if(!noprint) mergeLog(">>> Merge: "+getTime()+" >>> TOTAL TIME: "+(end-start)+", NODE-LEVEL TIME: "+(end-end1)+", seqTime ="+seqTime+" ("+seqTime+"), treeTime = "+treeTime+", sccTime = "+sccTime+", numChecks = "+numChecks);
            return rtemp;
        }


        export var theO = undefined;
        export var theA = undefined;
        export var theB = undefined;
        export var theM = undefined;

        function getApp(text:string) {
            var app = (<any>TDev).AST.Parser.parseScript(text);
            (<any>TDev).AST.TypeChecker.tcApp(app);
            var v = new TDev.AST.InitIdVisitor(false);
            v.dispatch(app);
            return app;
        }

        export function testMerge(idO="yqum", idA="yqum", idB="xspn") {
            (<any>TDev).ScriptCache.getScriptAsync(idO).then(textO =>
                (<any>TDev).ScriptCache.getScriptAsync(idA).then(textA =>
                    (<any>TDev).ScriptCache.getScriptAsync(idB).then(textB => {
                            var table = {};
                            [[idO,textO],[idA,textA],[idB,textB]].forEach(x => {
                                if(!table[x[0]]) {
                                    table[x[0]] = getApp(x[1])
                                }
                            })

                            function doMerge(idO:string, idA:string, idB:string, compareTo:string) {
                                theO = table[idO];
                                theA = table[idA];
                                theB = table[idB];

                                var m = (<any>TDev).AST.Merge.merge3(theO,theA,theB);
                                (<any>TDev).AST.TypeChecker.tcApp(m);
                                theM = m;

                                var success = false;
                                var str = "merge("+idO+","+idA+","+idB+")";
                                if(table[compareTo] && m.serialize().replace(/\s*/g,"") != table[compareTo].serialize().replace(/\s*/g,"")) {
                                    str += (" =/= ");
                                    m.things.forEach((th,i) => {
                                        if(m.things[i].serialize().replace(/\s*/g,"") != table[compareTo].things[i].serialize().replace(/\s*/g,"")) {
                                            console.log("unequal: "+i);
                                        }
                                    });
                                } else {
                                    success = true;
                                    str += (" = ");
                                }
                                console.log(str+""+compareTo+(!success ? " ((FAIL!))" : " (success)"));
                            }

                            console.log("testing merge(x,x,x)");
                            doMerge(idO,idO,idO,idO);
                            doMerge(idA,idA,idA,idA);
                            doMerge(idB,idB,idB,idB);

                            console.log("testing merge(x,y,x)");
                            doMerge(idO,idA,idO,idA);
                            doMerge(idO,idB,idO,idB);
                            doMerge(idA,idB,idA,idB);
                            doMerge(idA,idO,idA,idO);
                            doMerge(idB,idA,idB,idA);
                            doMerge(idB,idO,idB,idO);

                            console.log("testing merge(x,x,y)");
                            doMerge(idO,idO,idA,idA);
                            doMerge(idO,idO,idB,idB);
                            doMerge(idA,idA,idB,idB);
                            doMerge(idA,idA,idO,idO);
                            doMerge(idB,idB,idA,idA);
                            doMerge(idB,idB,idO,idO);
                        }
                    )
                )
            )
        }

        export function basicTest(o:string, a:string, b:string) {
            if(!o) {
                o = 
"meta version \"v2.2,js,ctx,refs,localcloud,unicodemodel,allasync\";\n"+
"meta name \"awe-inspiring script\";\n"+
"meta rootId \"nLWNALhDdDnO6mTvydoNe8aI\";\n"+
"meta allowExport \"yes\";\n"+
"meta platform \"current\";\n"+
"meta parentIds \"\";\n"+
"#main\n"+
"action main() {\n"+
"  #x1QgKIXXV6P3GL4v $x1 := 1;\n"+
"  #nrxemFg0cPs5bQh7 $x2 := 12;\n"+
"}\n"+
"#main2\n"+
"action main2() {\n"+
"  #x1QgKIXXV6P3GL4v1 $x1 := 1;\n"+
"  #nrxemFg0cPs5bQh72 $x2 := 12;\n"+
"  #rpYjyryilrIApEv14 $x4 := 123;\n"+
"}\n"
            }
            if(!a) {
                a = 
"meta version \"v2.2,js,ctx,refs,localcloud,unicodemodel,allasync\";\n"+
"meta name \"awe-inspiring script\";\n"+
"meta rootId \"nLWNALhDdDnO6mTvydoNe8aI\";\n"+
"meta allowExport \"yes\";\n"+
"meta platform \"current\";\n"+
"meta parentIds \"\";\n"+
"#main\n"+
"action main() {\n"+
"  #nrxemFg0cPs5bQh7 $x2 := 12;\n"+
"  #x1QgKIXXV6P3GL4v $x1 := 1;\n"+
"}\n"+
"#main2\n"+
"action main2() {\n"+
"  #x1QgKIXXV6P3GL4v1 $x1 := 1;\n"+
"  #nrxemFg0cPs5bQh72 $x2 := 12;\n"+
"  #rpYjyryilrIApEv03 $x3 := 123;\n"+
"}\n"
            }
            if(!b) {
                b = 
"meta version \"v2.2,js,ctx,refs,localcloud,unicodemodel,allasync\";\n"+
"meta name \"awe-inspiring script\";\n"+
"meta rootId \"nLWNALhDdDnO6mTvydoNe8aI\";\n"+
"meta allowExport \"yes\";\n"+
"meta platform \"current\";\n"+
"meta parentIds \"\";\n"+
"#main\n"+
"action main() {\n"+
"  #x1QgKIXXV6P3GL4v $x1 := 1;\n"+
"  #nrxemFg0cPs5bQh7 $x2 := 12;\n"+
"  #rpYjyryilrIApEv0 $x3 := 123;\n"+
"  #rpYjyryilrIApEv1 $x4 := 123;\n"+
"  #rpYjyryilrIApEv2 $x5 := 123;\n"+
"  #rpYjyryilrIApEv3 $x6 := 123;\n"+
"}\n"+
"#main2\n"+
"action main2() {\n"+
"  #nrxemFg0cPs5bQh72 $x2 := 12;\n"+
"  #x1QgKIXXV6P3GL4v1 $x1 := 1;\n"+
"}\n"
            }

            theO = getApp(o);
            theA = getApp(a);
            theB = getApp(b);

            var m = (<any>TDev).AST.Merge.merge3(theO,theA,theB);
            (<any>TDev).AST.TypeChecker.tcApp(m);
            theM = m;
        }
    }

    class Normalizer
        extends NodeVisitor
    {
        visitStmt(s:Stmt)
        {
            this.visitChildren(s)
        }

        visitCodeBlock(b:CodeBlock)
        {
            var newStmts = []
            var lastPlace = false
            b.stmts.forEach(s => {
                if (s.isPlaceholder() && lastPlace) return
                lastPlace = s.isPlaceholder()
                newStmts.push(s)
            })
            b.stmts = newStmts
            this.visitChildren(b)
        }
    }

    export function mergeScripts(baseText:string, ourText:string, otherText:string)
    {
        var prep = (s:string) => {
            var app = Parser.parseScript(s, [])
            TypeChecker.tcScript(app, true)
            new InitIdVisitor(false).dispatch(app)
            return app
        }

        var baseApp  = prep(baseText)
        var ourApp   = prep(ourText)
        var otherApp = prep(otherText)

        var mergedApp = <App>Merge.merge3(baseApp, ourApp, otherApp)
        mergedApp.parentIds = ourApp.parentIds.slice(0)
        // new Normalizer().dispatch(mergedApp)

        Diff.diffApps(ourApp, mergedApp, { useStableNames: false })

        return mergedApp
    }
}
