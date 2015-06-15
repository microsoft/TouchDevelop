///<reference path='refs.ts'/>

module TDev.AST
{
    export interface StepInfo {
        actionName: string;
        stcheckpoint?: boolean;
        command?: string;
        commandArg?: string;
        docs: string;
    }

    export interface TutorialInfo
    {
        title?: string;
        description?: string;
        startDocs?: string;
        finalDocs?: string;
        steps: StepInfo[];
        translations?: StringMap<string>; // locale -> script id
    }

    export interface TranslatedTutorialInfo extends TutorialInfo {
        manual?: boolean;
    }

    export interface TutorialCustomizations
    {
        stringMapping: StringMap<string>;
        artMapping: StringMap<string>;
    }

    class SyntacticMethodFinder
        extends NodeVisitor
    {
        calledActions:StringMap<boolean> = {};

        visitAstNode(n:AstNode) { this.visitChildren(n); }
        visitExprHolder(eh:ExprHolder)
        {
            eh.tokens.forEach((t, i) => {
                if (t.getText() == "code" &&
                    eh.tokens[i + 1] instanceof PropertyRef)
                    this.calledActions[eh.tokens[i + 1].getText()] = true
            })
        }
    }

    class DeclFinder
        extends ExprVisitor
    {
        usedDecls:StringMap<Decl> = {};

        use(d:Decl)
        {
            if (!d) return
            if (!this.usedDecls.hasOwnProperty(d.getCoreName())) {
                this.usedDecls[d.getCoreName()] = d
                this.dispatch(d)
            }
        }

        useKind(k:Kind)
        {
            this.use(k.getRecord())
        }

        visitRecordField(r:RecordField)
        {
            this.useKind(r.dataKind)
            super.visitRecordField(r)
        }

        visitActionParameter(r:ActionParameter)
        {
            this.useKind(r.getKind())
            super.visitActionParameter(r)
        }

        visitCall(c:Call)
        {
            var a = c.calledExtensionAction() || c.calledAction()
            if (a && a.parentLibrary().isThis()) {
                this.use(a)
            } else {
                this.use(c.referencedRecord())
                this.use(c.referencedData())
                this.use(c.referencedLibrary())
            }
            super.visitCall(c)
        }
    }

    function stripStepIdx(n) {
        return n.replace(/^#(S\.)?\d+(\.\d+)?\s*/, "")
    }

    export var followingTutorial = false;

    export class Step {
        public template:Decl;
        public firstStmt:Stmt;
        public docs:Stmt[];
        public command: string;
        public commandArg: string;
        public validator: string;
        public validatorArg: string;
        public addDecl:Stmt[];
        public addsAction:boolean;
        public autoMode:string;
        public avatars : boolean = false;
        public hintLevel:string;
        public preciseStrings:StringMap<boolean>;

        public stcheckpoint = false;
        public noCheers = false;
        public storder:number;
        public stdelete = 0;
        public showAt:number;
        public hideAt:number;
        public globalIdx:number;
        public printOut:Action; // only some steps have it
        private _actionName:string;

        private computeMeta()
        {
            this.docs.forEach(d => {
                if (d instanceof AST.Comment) {
                    var c = <AST.Comment>d
                    var m = /\{storder:(\d+(\.\d+)?)\}/.exec(c.text)
                    if (m) this.storder = parseFloat(m[1])
                    m = /\{stdelete:(\d+)\}/.exec(c.text)
                    if (m) this.stdelete = parseInt(m[1])
                    if (/\{stcheckpoint\}/.test(c.text))
                        this.stcheckpoint = true;
                    if (/\{stnocheers\}/.test(c.text))
                        this.noCheers = true;
                    if (/\{box:avatar:/.test(c.text))
                        this.avatars = true;
                }
            })
        }

        static tutorialInfo(app:App):TutorialInfo
        {
            var topic = TDev.HelpTopic.fromScript(app);
            var docs = (name) => {
                var act = app.actions().filter(a => a.getName() == name)[0]
                if (act) return Step.renderDocs(act.body.stmts)
                else return undefined
            }

            var tut = <TutorialInfo>{
                title: "<h1>" + TDev.Util.htmlEscape(app.getName() || "") + "</h1>",
                description: "<p>" + TDev.Util.htmlEscape(app.getDescription() || "") + "</p>",
                steps: Step.splitActions(app).map(s => s.jsonInfo()),
                startDocs: docs("main"),
                finalDocs: docs("final"),
            }
            var translations = topic.translations();
            if (translations) tut.translations = translations;
            return tut;
        }

        static renderDocs(stmts:Stmt[])
        {
            var r = new CopyRenderer();
            var md = new MdComments(r);
            md.useSVG = false;
            md.useExternalLinks = true;
            md.showCopy = false;
            return md.extractStmts(stmts)
        }

        private jsonInfo():StepInfo
        {
            return {
                stcheckpoint: this.stcheckpoint ? true : undefined,
                actionName: this.declName(),
                command: this.command,
                commandArg: this.commandArg,
                docs: Step.renderDocs(this.docs)
            }
        }

        public declName()
        {
            return this._actionName;
        }

        public matchesDecl(a:AST.Decl)
        {
            return a.getCoreName() == this.declName() && this.template.nodeType() == a.nodeType()
        }

        static splitActions(app:App):Step[]
        {
            var visibleRecordFields:StringMap<boolean> = {}
            var hashActions:StringMap<boolean> = {}
            var seenAct:StringMap<boolean> = {}
            var nameIdx = 0
            var preciseStrings:StringMap<boolean> = {}
            var problems = ""

            function problem(s:Stmt, p:string) {
                problems += p + "\n"
                if (s) {
                    if (!s.tutorialWarning) s.tutorialWarning = ""
                    s.tutorialWarning += p + "\n"
                }
            }


            function splitAction(combined:Action)
            {
                var steps:Step[] = []
                var currStepIdx = -1
                var dummyStep = new Step();
                dummyStep.preciseStrings = preciseStrings
                dummyStep.showAt = 0;
                dummyStep.hideAt = 1e10;
                var currStep = dummyStep;
                var serialized = combined.serialize()
                var docIndex = false;

                var index = (stmts:AST.Stmt[]) =>
                {
                    var boxNesting = 0
                    var docMode = false
                    stmts.forEach(s => {
                        var isDoc = boxNesting > 0
                        var isCommand = false
                        var isAutoStep = ""
                        var hintLevel = ""
                        s.tutorialWarning = null

                        var ctext = s.docText()

                        if (ctext != null) {
                            if (/^\s*\{box:([^{}]*)\}\s*$/i.test(ctext))
                                boxNesting++;
                            if (/^\s*\{\/box\}\s*$/i.test(ctext))
                                boxNesting--;

                            if (currStepIdx < 0 && /^\s*\{adddecl\}\s*$/i.test(ctext))
                                currStep.addDecl = []

                            var m = /^\s*\{stprecise:(.*)\}\s*$/i.exec(ctext)
                            if (m) {
                                var vs = m[1]
                                if (/^["']/.test(vs)) {
                                    var toks = Lexer.tokenize(vs)
                                    if (toks && toks[0]) vs = toks[0].data
                                }
                                preciseStrings[vs] = true
                            }

                            m = /^\s*\{stnoprofile}\s*$/i.exec(ctext)
                            if (m) {
                                combined._skipIntelliProfile = true;
                            }

                            m = /^\s*\{stauto(:(.*))?}\s*$/i.exec(ctext)
                            if (m)
                                isAutoStep = m[2] || "yes"

                            m = /^\s*\{stcmd:([^:]*)(:(.*))?\}\s*$/i.exec(ctext)
                            if (m) {
                                currStep.command = m[1]
                                currStep.commandArg = m[3] || ""
                                isCommand = true

                                if (currStep.command == "change") {
                                    var found = false
                                    AST.visitExprHolders(combined, (stmt, eh) => {
                                        eh.tokens.forEach(t => {
                                            var call = t.getCall()
                                            if (call && call.referencedData() && call.referencedData().getName() == currStep.commandArg)
                                                found = true
                                        })
                                    })
                                    if (!found)
                                        problem(s, lf("art resource '{0}' not found in current function", currStep.commandArg))
                                }
                            }

                            m = /^\s*\{sthints:([^:]*)\}\s*$/i.exec(ctext)
                            if (m) {
                                hintLevel = m[1]
                            }

                            m = /^\s*\{stvalidator:([^:]*)(:(.*))?\}\s*$/i.exec(ctext)
                            if (m) {
                                currStep.validator = m[1]
                                currStep.validatorArg = m[3] || ""
                                var validAct = app.actions().filter(a => a.getName() == currStep.validator && !a.isPrivate)[0]
                                if (validAct) {
                                    validAct._skipIntelliProfile = true;
                                } else {
                                    problem(s, "public validator function " + currStep.validator + " not found")
                                }
                                isCommand = true
                            }

                            if (!isCommand) {
                                isDoc = true
                            }
                        }

                        if (isDoc) {
                            if (!docMode) {
                                docMode = true;
                                if (currStepIdx >= 0)
                                    currStep = steps[currStepIdx++]
                                else {
                                    steps.push(currStep = new Step());
                                    currStep.firstStmt = s
                                    currStep.preciseStrings = preciseStrings
                                    currStep.docs = []
                                }
                            }

                            if (hintLevel) {
                                currStep.hintLevel = hintLevel
                                hintLevel = ""
                            }

                            if (isAutoStep) {
                                docMode = false
                                currStep.autoMode = isAutoStep
                                if (currStep.docs.length > 0) {
                                    problem(s, "{stauto} step cannot have regular comments attached to it")
                                }
                                if (currStep.validator) {
                                    problem(s, "{stauto} step cannot have a {stvalidator}")
                                }
                            } else {
                                if (currStepIdx < 0)
                                    currStep.docs.push(s)
                                if (docIndex)
                                    s.stepState = currStep
                            }
                        } else {
                            docMode = false
                            if (!isCommand || docIndex)
                                s.stepState = currStep
                            if (currStepIdx < 0 && currStep.addDecl)
                                currStep.addDecl.push(s)
                            s.children().forEach(ch => {
                                if (ch instanceof AST.Block)
                                    index((<AST.Block>ch).stmts)
                            })
                        }
                    })
                }

                var actionName = stripStepIdx(combined.getName())

                var reindexed = (idx:number) => {
                    var act = <Action>Parser.parseDecl(serialized, app);
                    (<any>act).autoGenerated = "yes";
                    act.setName("#S." + idx + " " + actionName)
                    app.addDecl(act)
                    currStepIdx = 0
                    currStep = dummyStep
                    index(act.body.stmts)
                    return act
                }

                index(combined.body.stmts)

                steps.forEach(s => s.computeMeta())
                var steps0 = steps.filter(s => s.storder === undefined)
                var steps1 = steps.filter(s => s.storder !== undefined)
                steps1.stableSortObjs((a, b) => a.storder - b.storder)
                var orderedSteps = steps0.concat(steps1)

                orderedSteps.forEach((s, i) => {
                    s.showAt = i;
                    s._actionName = actionName;
                })
                steps.forEach((s, i) => {
                    var n = s.stdelete || 0
                    while (n-- > 0) {
                        var ss = steps[--i]
                        if (!ss) break; // oops
                        ss.hideAt = s.showAt
                    }
                    if (s.addDecl) s.hideAt = s.showAt
                })
                steps.forEach(s => {
                    if (s.hideAt === undefined)
                        s.hideAt = steps.length;
                })

                var stepStmts:Stmt[] = []
                var prune = (currStep:number, b:AST.Block) => {
                    b.setChildren(b.stmts.filter(s => {
                        var t = <Step>s.stepState
                        if (!t) return false;
                        if (!s.isPlaceholder() && t.showAt == currStep && (!s.parent || stepStmts.indexOf(s.parent.parent) < 0))
                            stepStmts.push(s)
                        return s.isInvisible || t.showAt <= currStep && currStep < t.hideAt;
                    }))
                    b.forEachInnerBlock(b => prune(currStep, b))
                }

                orderedSteps.forEach((s, i) => {
                    var act = reindexed(nameIdx++)
                    stepStmts = []
                    prune(i, act.body)
                    var newDocs = []
                    s.docs.forEach(d => {
                        if (d.docText() == "{stcode}") {
                            newDocs.pushRange(stepStmts)
                        } else newDocs.push(d)
                    })
                    s.docs = newDocs
                    s.template = act

                    if (s.addDecl) {
                        var rec:RecordDef = null
                        var gdecl:GlobalDef = null
                        s.addDecl.forEach(stmt => {
                            if (stmt instanceof ExprStmt) {
                                var p = (<ExprStmt>stmt).expr.parsed
                                if (!p) return;
                                var f = p.referencedRecordField()
                                var d = p.referencedData()
                                if (d && d.isResource) d = null
                                var r0 = rec
                                if (f) {
                                    rec = f.def()
                                    visibleRecordFields[rec.getName() + "->" + f.getName()] = true
                                } else if (p.referencedRecord()) {
                                    rec = p.referencedRecord()
                                } else if (d) {
                                    gdecl = d
                                } else if (p.calledProp() == api.core.AssignmentProp) {
                                    // ok, just ignore
                                } else {
                                    problem(s.firstStmt, "no record or record field to add")
                                }
                                if (r0 && rec != r0)
                                    problem(s.firstStmt, "more than one record in a step")
                            } else {
                                problem(s.firstStmt, "bad stmt type: " + stmt.nodeType())
                            }
                        })

                        if (!rec && !gdecl)
                            problem(s.firstStmt, "no decl to add")

                        if (rec) {
                            var rec2 = <RecordDef>Parser.parseDecl(rec.serialize(), app);
                            s.template = rec2
                            var clean = (f:FieldBlock) => {
                                var newStmts = f.stmts.filter((f:RecordField) =>
                                        visibleRecordFields[f.def().getName() + "->" + f.getName()])
                                f.setChildren(newStmts)
                            }
                            clean(rec2.keys)
                            clean(rec2.values)
                            s._actionName = rec2.getCoreName()
                        } else if (gdecl) {
                            s.template = gdecl
                            s._actionName = gdecl.getCoreName()
                        } else {
                            return
                        }
                    }
                })

                if (orderedSteps.length == 0) return []

                docIndex = true;
                var s0 = orderedSteps[0]
                var forDoc = reindexed(nameIdx++)
                s0.printOut = forDoc

                var resSteps:Step[] = []
                orderedSteps.forEach(s => {
                    seenAct[s._actionName] = true
                    var m = new SyntacticMethodFinder()
                    m.dispatch(s.template)
                    Object.keys(m.calledActions).forEach(name => {
                        if (!seenAct.hasOwnProperty(name)) {
                            seenAct[name] = true
                            var act = app.allActions().filter(a => a.getName() == name)[0]
                            if (act) {
                                resSteps.pushRange(splitAction(act))
                                s.addsAction = true;
                            }
                        }
                    })
                    resSteps.push(s)
                })


                if (problems) HTML.showWarningNotification("tutorial problem: " + problems)

                return resSteps
            }

            function addHeaders(b:AST.Block)
            {
                var acc = []
                var prevStep:Step = b.parent ? b.parent.stepState : null
                var isPage = b.parent instanceof ActionHeader && (<ActionHeader>b.parent).action.isPage()
                if (!isPage && b instanceof AST.CodeBlock) {
                    b.stmts.forEach(s => {
                        if (s.stepState) {
                            var ss = <Step>s.stepState
                            if (ss != prevStep && !s.isPlaceholder()) {
                                prevStep = ss
                                if (prevStep.globalIdx !== undefined) {
                                    var c = new Comment()
                                    c.text = "{internalstepid:" + prevStep.globalIdx + (prevStep.stcheckpoint ? " - checkpoint" : "") + "}"
                                    acc.push(c)
                                }
                            }

                            if (ss.addDecl) {
                                if (s instanceof Comment) {
                                    var cc = <Comment>s
                                    acc.push(s)
                                    if (/^\s*\{adddecl\}\s*$/.test(cc.text)) {
                                        cc.text = "**Add the declaration:**"
                                        cc = new Comment()
                                        cc.text = "{decl:" + ss.template.getName() + "}"
                                        cc.mdDecl = ss.template;
                                        acc.push(cc)
                                    }
                                }
                                return // don't add it
                            }
                        }
                        acc.push(s)
                    })
                    b.setChildren(acc)
                }
                b.forEachInnerBlock(addHeaders)
            }

            var hasMainPage = false

            var stepActions = <AST.Action[]> app.orderedThings(true)
                .filter(a => {
                    if (a instanceof AST.Action) {
                        var n = stripStepIdx(a.getName())
                        if (n != a.getName()) {
                            hashActions[n] = true
                            if (n == "main" && (<Action>a).isPage())
                                hasMainPage = true
                            return true
                        } else return false
                    } else return false
                })

            visitStmts(app, s => {
                s.tutorialWarning = ""
                if (s instanceof Comment) {
                    var t = (<Comment>s).text
                    var m = /^\s*\{template:([^:]*)\}\s*$/i.exec(t)
                    if (m && hasMainPage && m[1] == "empty") {
                        problem(s, "use {template:emptyapp} for tutorials with main page")
                    }
                }
            })

            if (stepActions.length == 0) return [];

            var res = stepActions.collect(splitAction);
            res.forEach((s, i) => s.globalIdx = i)
            res.forEach(s => {
                if (s.printOut) addHeaders(s.printOut.body)
            })

            var maxCount = 4;
            if (!res.every(s => s.hintLevel === undefined)) maxCount = 1e10;

            var currLevel = "full"
            res.forEach(s => {
                if (s.hintLevel) {
                    currLevel = s.hintLevel;
                    maxCount = 1e10;
                }

                s.hintLevel = currLevel
                if (!s.autoMode) maxCount--;
                if (maxCount < 0) currLevel = "semi";

                if (s.validator) s.hintLevel = "free"
            })


            AST.TypeChecker.tcScript(app);
            app.things = app.things.filter(t => !(<any>t).autoGenerated)

            res.forEach(s => {
                if (s.printOut) s.printOut.setName(s._actionName)
            })

            return res;
        }

        static reply(orig:App, app:App, steps:Step[], customizations:TutorialCustomizations)
        {
            var last:StringMap<Decl> = {}
            steps.forEach(s => {
                last[s.declName()] = s.template
            })

            var finder = new DeclFinder()
            Object.keys(last).forEach(n => finder.dispatch(last[n]))

            app.libraries().forEach(l => finder.use(l))

            Object.keys(finder.usedDecls).forEach(n => {
                if (!last.hasOwnProperty(n))
                    last[n] = finder.usedDecls[n]
            })

            var str = Object.keys(last).map(n => last[n].serialize()).join("\n");
            var newApp = Parser.parseScript(str);

            newApp.setName(orig.getName())
            newApp.comment = orig.comment

            AST.TypeChecker.tcScript(newApp);

            AST.visitExprHolders(newApp, (stmt, eh) => {
                eh.tokens = eh.tokens.map(t => {
                    var sl = t.getStringLiteral()
                    if (sl && customizations.stringMapping.hasOwnProperty(sl))
                        return mkLit(customizations.stringMapping[sl])
                    return t
                })
            })
            newApp.resources().forEach(r => {
                if (customizations.artMapping.hasOwnProperty(r.getName())) {
                    var nn = customizations.artMapping[r.getName()]
                    var other = orig.resources().filter(t => t.getName() == nn)[0]
                    if (other && other.getKind() == r.getKind()) {
                        r.setName(nn)
                        r.url = other.url
                        r.comment = other.comment
                    }
                }
            })

            newApp.hasIds = true;
            new AST.InitIdVisitor(false).dispatch(newApp)

            newApp.things.forEach(t => {
                var n = t.getCoreName()
                if (stripStepIdx(n) != n)
                    t.setName(stripStepIdx(n))
                if (t.getName() == "main" && t instanceof Action)
                    (<Action>t).isPrivate = false;
            })
            return newApp.serialize()
        }
    }
}
