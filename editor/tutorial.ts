///<reference path='refs.ts'/>

module TDev
{
    export class TutorialInstruction {
        public decl:AST.Decl;
        public stmt:AST.Stmt;
        public targetName:string;
        public targetKind:Kind;
        public addButton: Ticks;
        public calcButton: Ticks;
        public calcIntelli: Ticks;
        public label: string;
        public addToken:AST.Token;
        public addToken2:AST.Token; // used when inserting library token
        public delToken:AST.Token;
        public addAfter:AST.Token;
        public isOpStmt:boolean;
        public localName:string;
        public editString:string;
        public isEnumVal: boolean;
        public languageHint: string;
        public showTokens:AST.Token[];
        public stmtToInsert:AST.Stmt;
        public toInlineActions:boolean;
        public diffSize:number;
        public promoteToFieldNamed:string;
        public promoteToFieldOf:string;
        public storeInVar:string;
        public inlineActionNames:AST.LocalDef[];
    }

    function reorderDiffTokens(toks:AST.Token[])
    {
        function skipDeletes(p:number) {
            while (p < toks.length && toks[p + 1] == null)
                p += 2;
            return p
        }

        function moveToken(trg:number, src:number) {
            if (src == trg) return
            Util.assert(trg < src)
            var t0 = toks[src + 0]
            var t1 = toks[src + 1]
            toks.splice(src, 2)
            toks.splice(trg, 0, t0, t1)
        }

        if (toks[0] instanceof AST.FieldName && toks[1] == null) {
            var p = skipDeletes(2)
            if (toks[p + 1] instanceof AST.FieldName) {
                moveToken(2, p)
                return
            }
        }

        var assignmentPos = -1
        for (var i = 0; i < toks.length; i += 2) {
            if (toks[i] == null && toks[i + 1].getOperator() == ":=")
                assignmentPos = i
        }
        
        if (assignmentPos > 0) {
            var dels:AST.Token[] = []
            var adds:AST.Token[] = []
            var keeps:AST.Token[] = []
            for (var i = 0; i < assignmentPos + 2; i += 2) {
                if (toks[i] == null) adds.push(toks[i], toks[i + 1])
                else if (toks[i + 1] == null) dels.push(toks[i], toks[i + 1])
                else keeps.push(toks[i], toks[i + 1])
            }

            if (keeps.length == 0) {
                var newTokens = adds.concat(dels).concat(toks.slice(assignmentPos + 2))
                toks.splice(0, toks.length)
                toks.pushRange(newTokens)
                return
            }

        }

        for (var i = 0; i < toks.length; i += 2) {
            if (toks[i + 1] == null) {
                var p = skipDeletes(i + 2)
                if (toks[i] instanceof AST.PropertyRef &&
                    toks[p + 1] instanceof AST.PropertyRef) {
                    moveToken(i, p)
                    return
                }
            }
        }
    }

    export class Step {
        public text: string;
        public autorunDone = false;

        constructor(public parent:StepTutorial, public data:AST.Step)
        {
        }

        public hasStar()
        {
            return !this.data.autoMode;
        }

        public element(hint : boolean) : HTMLElement {
            var docs = this.parent.renderDocs(this.data.docs)
            var e = div(null)
            Browser.setInnerHTML(e, docs);
            if (!hint) MdComments.attachVideoHandlers(e, true);
            var t = e.innerText || "";
            if (t.length > 4096) t = t.substr(0, 4096);
            this.text = t;
            return e;
        }

        public showDiff()
        {
            var r = new Renderer()
            r.showDiff = true
            var s = r.dispatch(this.data.template)
            var d = div("diffOuter")
            Browser.setInnerHTML(d, s);

            var m = new ModalDialog()
            m.add(d)
            Util.setupDragToScroll(d)
            d.style.maxHeight = (SizeMgr.windowHeight * 0.8) / SizeMgr.topFontSize + "em";
            m.fullWhite()
            m.show()
        }

        public show()
        {
            var e = this.element(true);
            if (dbg)
                e.appendChild(HTML.mkButton(lf("diff (dbg)"), () => this.showDiff()))
            TheEditor.setStepHint(e)
            this.autorunDone = false;
        }

        public nextInstruction():TutorialInstruction
        {
            var matching = Script.things.filter(a => this.data.matchesDecl(a))

            var op:TutorialInstruction = null;

            if (matching.length == 0) {
                var toRename:AST.Decl;
                if (this.data.template instanceof AST.Action) {
                    if ((<AST.Action>this.data.template).isPage())
                        toRename = Script.actions().filter(a => /^show(\s*\d*)/.test(a.getName()))[0]
                    else
                        toRename = Script.actions().filter(a => /^do stuff(\s*\d*)/.test(a.getName()))[0]
                } else if (this.data.template instanceof AST.RecordDef) {
                    toRename = Script.records().filter(r => r.recordType == (<AST.RecordDef>this.data.template).recordType && /^thing\s*\d*/i.test(r.getCoreName()))[0]
                } else if (this.data.template instanceof AST.GlobalDef) {
                    toRename = Script.variables().filter(r => /^v\s*\d*/.test(r.getName()))[0]
                }
                if (toRename)
                    this.parent.renameIndex[this.data.declName()] = toRename
                else {
                    toRename = this.parent.renameIndex[this.data.declName()]
                    if (toRename && Script.things.indexOf(toRename) < 0)
                        toRename = null
                }
                op = new TutorialInstruction()
                if (toRename) {
                    op.decl = toRename
                    op.stmt = toRename instanceof AST.Action ? (<AST.Action>toRename).header :
                              toRename instanceof AST.RecordDef ? (<AST.RecordDef>toRename).recordNameHolder :
                              toRename instanceof AST.GlobalDef ? (<AST.GlobalDef>toRename) : null
                    op.targetName = this.data.declName()
                } else {
                    if (this.data.template instanceof AST.Action) {
                        var act = <AST.Action>this.data.template
                        op.addButton = act.isPage() ? Ticks.sideAddPage : Ticks.sideAddAction;
                        op.label = lf("we need a new {0}", act.isPage() ? lf("page") : lf("function"));
                    } else if (this.data.template instanceof AST.RecordDef) {
                        var rec = <AST.RecordDef>this.data.template
                        if (rec.recordType == AST.RecordType.Table) {
                            op.addButton = Ticks.sideAddTable;
                            op.label = lf("we need a new table")
                        } else if (rec.recordType == AST.RecordType.Index) {
                            op.addButton = Ticks.sideAddIndex;
                            op.label = lf("we need a new index")
                        } else if (rec.recordType == AST.RecordType.Decorator) {
                            op.addButton = Ticks.sideAddDecorator;
                            op.label = lf("we need a new decorator")
                        } else {
                            op.addButton = Ticks.sideAddObject;
                            op.label = lf("we need a new object")
                        }
                    } else if (this.data.template instanceof AST.GlobalDef) {
                        var glb = <AST.GlobalDef>this.data.template
                        op.addButton = Ticks.sideAddVariable
                        op.label = lf("we need to a new variable")
                    } else {
                        Util.oops("declaration type not supported in tutorial")
                    }
                }
                return op;
            }

            // TODO handle case when matching.length > 1

            var currAction = matching[0]

            AST.Diff.templateDiff(currAction, this.data.template, {
                approxNameMatching: true,
                placeholderOk: true,
                tutorialMode: true,
                preciseStrings: this.data.preciseStrings,
                tutorialCustomizations: this.parent.customizations
            })

            function lookupLocal(name:string)
            {
                if (currAction instanceof AST.Action)
                    return (<AST.Action>currAction).allLocals.filter(l => l.getName() == name)[0]
                else
                    return null
            }

            function localKind(name:string)
            {
                var l = lookupLocal(name)
                if (l) return l.getKind()
                else return api.core.Unknown
            }

            // we currently cannot recover from this; have them delete the statement
            function differentLoopVars(stmt:AST.Stmt)
            {
                var alt = stmt.diffAltStmt
                if (!alt) return false
                var v0 = stmt.loopVariable()
                var v1 = alt.loopVariable()
                return (v0 && v1 && v0.getName() != v1.getName())
            }

            function findFirst(stmt:AST.Stmt)
            {
                if (op) return;

                if (stmt instanceof AST.Block) {
                    var b = <AST.Block>stmt
                    b.stmtsWithDiffs().forEach(findFirst)
                    return;
                }

                if (stmt.diffStatus == 1) {
                    var lastCurr = null
                    var past = false
                    var firstCurr = null;
                    (<AST.Block>stmt.parent).stmtsWithDiffs().forEach(s => {
                        if (s == stmt) past = true
                        var curr = s.diffAltStmt
                        if (s.diffStatus < 0) curr = s;
                        else if (curr && curr.diffStatus < 0) curr = null;
                        if (curr) {
                            if (past && !firstCurr) firstCurr = curr;
                            if (!past) lastCurr = curr;
                        }
                    })

                    op = new TutorialInstruction();

                    if (firstCurr && firstCurr.isPlaceholder()) lastCurr = firstCurr;
                    if (lastCurr && lastCurr.isPlaceholder()) {
                        op.stmt = lastCurr
                        op.stmtToInsert = stmt
                        if (stmt instanceof AST.InlineActions)
                            op.toInlineActions = true
                        op.showTokens = [null, AST.mkOp(stmt.nodeType())]
                        return
                    }

                    if (lastCurr) {
                        if (stmt.nodeType() == "elseIf" && lastCurr instanceof AST.If) {
                            var prevBody = (<AST.If>lastCurr).rawElseBody
                            if (prevBody && prevBody.stmts[0] && prevBody.stmts[0].isPlaceholder()) {
                                op.stmt = prevBody.stmts[0]
                                op.stmtToInsert = stmt
                                op.showTokens = [null, AST.mkOp("if")]
                                return;
                            }
                        }
                        op.stmt = lastCurr
                        op.calcButton = Ticks.btnAddDown
                        op.label = lf("add line below")
                    } else if (firstCurr) {
                        op.stmt = firstCurr
                        op.calcButton = Ticks.btnAddUp
                        op.label = lf("add line above")
                    } else if (stmt.parent instanceof AST.ParameterBlock) {
                        var blk = <AST.ParameterBlock>stmt.parent
                        var act = <AST.ActionHeader>blk.parent
                        if (blk == act.outParameters)
                            op.calcButton = Ticks.sideActionAddOutput
                        else
                            op.calcButton = Ticks.sideActionAddInput
                        op.stmt = act.diffAltStmt
                        op.label = lf("need a parameter")
                    } else if (stmt instanceof AST.RecordField) {
                        op.calcButton = (<AST.RecordField>stmt).isKey ? Ticks.recordAddKey : Ticks.recordAddValue
                        op.label = lf("need a field")
                    }
                    return;
                } else if (stmt.diffStatus < 0) {
                    if (stmt.isPlaceholder())
                        return;
                    op = new TutorialInstruction()
                    op.stmt = stmt;
                    op.calcButton = Ticks.btnCut
                    op.label = lf("need to delete this")
                    return;
                } else if (differentLoopVars(stmt)) {
                    op = new TutorialInstruction()
                    op.stmt = stmt.diffAltStmt;
                    op.calcButton = Ticks.btnCut;
                    op.label = lf("need to delete this")
                    return;
                } else {
                    var eh = stmt.calcNode()
                    if (eh && eh.diffTokens) {
                        var d = eh.diffTokens
                        reorderDiffTokens(d)
                        Util.assert(!op)
                        op = new TutorialInstruction()
                        op.stmt = stmt.diffAltStmt
                        var i = 0;
                        var localAssignment = false
                        var isVarDef = stmt instanceof AST.ExprStmt && (<AST.ExprStmt>stmt).isVarDef()
                        var isLocal = (t:AST.Token) => t && t.getThing() instanceof AST.LocalDef;
                        var firstTok = Util.even(d).filter(t => t != null)[0]

                        var promoteToFieldOf = ""
                        var promoteToGlobal = false
                        var promoteToName = ""

                        var lookupDecl = (n:string) => Script.things.filter(t => t.getName() == n)[0];

                        if (stmt instanceof AST.InlineActions) {
                            op.inlineActionNames = (<AST.InlineActions>stmt).actions.stmts.map(s => (<AST.InlineAction>s).name)
                        }

                        if (stmt instanceof AST.ExprStmt &&
                            eh.tokens.length >= 4 &&
                            eh.tokens[2].getOperator() == ":=" &&
                            eh.parsed.getCalledProperty() == api.core.AssignmentProp)
                        (() => {
                            var trg = (<AST.Call>eh.parsed).args[0]
                            var refDat = trg.referencedData()
                            var refFld = trg.referencedRecordField()
                            var promoteKind = null
                            if (refDat && !lookupDecl(refDat.getName())) {
                                promoteToGlobal = true
                                promoteToName = refDat.getName()
                                promoteKind = refDat.getKind()
                            } else if (refFld) {
                                var fldOn = (<AST.Call>trg).args[0].getThing()
                                if (fldOn instanceof AST.LocalDef) {
                                    var fldOnLocal = (<AST.Action>currAction).allLocals.filter(l => l.getName() == fldOn.getName())[0]
                                    if (fldOnLocal) {
                                        var fldRec = fldOnLocal.getKind()
                                        if (fldRec.getRecord() && !fldRec.getProperty(refFld.getName())) {
                                            promoteToFieldOf = fldOn.getName()
                                            promoteToName = refFld.getName()
                                            promoteKind = refFld.dataKind
                                        }
                                    }
                                }
                            }

                            if (promoteToName) {
                                TheEditor.intelliProfile.incr("promoteRefactoring")

                                if (d[0] == null &&
                                    d[2] == null &&
                                    d[4] == null) {
                                    i = 6;
                                } else {
                                    var currCall = (<AST.ExprStmt>stmt.diffAltStmt).calcNode().parsed
                                    if (currCall.getCalledProperty() == api.core.AssignmentProp) {
                                        var th = (<AST.Call>currCall).args[0].getThing()
                                        if (th instanceof AST.LocalDef &&
                                            th.getName() == promoteToName &&
                                            th.getKind().toString() == promoteKind.toString())
                                        {
                                            op.promoteToFieldNamed = promoteToName
                                            op.promoteToFieldOf = promoteToGlobal ? "data" : promoteToFieldOf
                                            op.addToken = AST.mkOp(":=");
                                            op.addAfter = (<AST.Call>currCall).args[0]
                                        }
                                    }
                                }
                            }
                        })();

                        if ((isVarDef || promoteToName) && firstTok && firstTok.getOperator() == ":=") {
                            op.addAfter = null
                            op.delToken = firstTok
                            return;
                        }

                        if (op.promoteToFieldNamed) {
                            return
                        }

                        if (isVarDef &&
                            d.length >= 4 &&
                            d[0] == null && isLocal(d[1]) &&
                            d[2] == null && d[3].getOperator() == ":=") {
                            localAssignment = true;
                            i = 4;
                        }
                        if (isVarDef &&
                            (<AST.ExprStmt>stmt.diffAltStmt).isVarDef() &&
                            d.length >= 6 &&
                            d[4] && d[5] && d[4].getOperator() == ":=") {

                            var locAdd = d[1];
                            var locRem = d[2];

                            var ok = true
                            if (!locAdd && !locRem) {
                                locAdd = d[3]
                                locRem = d[0]
                            } else {
                                if (d[0] || d[3]) ok = false;
                            }

                            if (ok && isLocal(locAdd) && isLocal(locRem)) {
                                op.addAfter = locRem
                                op.localName = locAdd.getThing().getName()
                                op.addToken = locAdd
                                return;
                            }
                        }

                        op.showTokens = d.slice(i)
                        var placeholderKind:Kind = null
                        for (; i < d.length; i += 2) {
                            if (d[i]) op.addAfter = d[i]
                            if (d[i + 1] == null) {
                                if (typeof d[i].getLiteral() == "string" &&
                                    d[i + 3] &&
                                    typeof d[i + 3].getLiteral() == "string") {
                                    var lv = d[i + 3].getLiteral()
                                    if (d[i] instanceof AST.FieldName)
                                        op.localName = lv
                                    else {
                                        op.editString = lv
                                        op.isEnumVal = (<AST.Expr>d[i + 3]).enumVal != null
                                        op.languageHint = (<AST.Expr>d[i + 3]).languageHint;
                                    }
                                    op.addToken = d[i + 3]
                                } else if (d[i].getThing() instanceof AST.PlaceholderDef && !d[i + 2]) {
                                    // the next token will delete the placeholder def
                                    placeholderKind = d[i].getThing().getKind()
                                    continue;
                                } else {
                                    var j = i + 2
                                    var lastOk = i
                                    while (j < d.length) {
                                        if (d[j] != null && d[j + 1] != null)
                                            break;
                                        if (d[j + 1] == null) lastOk = j;
                                        j += 2
                                    }
                                    op.addAfter = null
                                    op.delToken = d[lastOk]
                                }
                                return;
                            } else if (d[i] == null) {
                                if (typeof d[i + 1].getLiteral() == "string" &&
                                    d[i + 2] &&
                                    typeof d[i + 2].getLiteral() == "string") {
                                    op.editString = d[i + 1].getLiteral()
                                    op.addToken = d[i + 1]
                                    op.addAfter = d[i + 2]
                                    op.isEnumVal = (<AST.Expr>d[i + 1]).enumVal != null
                                } else {
                                    if (placeholderKind &&
                                        placeholderKind.getRoot() == api.core.Ref &&
                                        d[i + 1].getThing() instanceof AST.LocalDef &&
                                        d[i + 3].getProperty() &&
                                        !localKind(d[i + 1].getThing().getName()).getProperty(d[i + 3].getProperty().getName()))
                                    {
                                        op.promoteToFieldNamed = d[i + 3].getProperty().getName()
                                        op.promoteToFieldOf = d[i + 1].getThing().getName()
                                    }

                                    op.addToken = d[i + 1]
                                    if (d[i + 2] == null && d[i + 3] != null)
                                        op.addToken2 = d[i + 3]
                                }
                                return;
                            }
                        }
                        if (localAssignment) {
                            op.addAfter = null // beginning
                            op.addToken = d[1]
                            op.addToken2 = d[3]
                            op.showTokens = d
                            op.storeInVar = d[1].getText()
                            return;
                        }
                        if (promoteToName) {
                            op.addAfter = null // beginning
                            op.addToken = d[1]
                            op.addToken2 = d[3]
                            op.showTokens = d
                            op.storeInVar = promoteToName
                            return;
                        }
                        op = null // undo
                    }
                }

                var arr = stmt.children()
                for (var i = 0; i < arr.length; ++i) {
                    if (arr[i] instanceof AST.Stmt) findFirst(<AST.Stmt>arr[i])
                }
            }

            function setPers(rp:AST.RecordPersistence) {
                op = new TutorialInstruction()
                op.calcButton =
                    rp == AST.RecordPersistence.Local ? Ticks.recordPersLocal :
                    rp == AST.RecordPersistence.Cloud ? Ticks.recordPersCloud :
                                                        Ticks.recordPersTemporary;
                op.label = lf("set persistance to ") + AST.RecordDef.recordPersistenceToString(rp, Script.isCloud);
            }

            if (this.data.template instanceof AST.Action) {
                if ((<AST.Action>currAction).isAtomic != (<AST.Action>this.data.template).isAtomic) {
                    TheEditor.intelliProfile.incr("actionSettings")
                    op = new TutorialInstruction()
                    op.calcButton = Ticks.actionPropAtomic
                    op.stmt = (<AST.Action>currAction).header
                    op.label = lf("make the function ") + ((<AST.Action>this.data.template).isAtomic ? lf("atomic") : lf("non-atomic"))
                } else {
                    findFirst((<AST.Action>this.data.template).header)
                }
            } else if (this.data.template instanceof AST.RecordDef) {
                var rec = <AST.RecordDef>this.data.template
                var rec0 = <AST.RecordDef>currAction
                var rp = rec.getRecordPersistence()
                if (rp != rec0.getRecordPersistence()) {
                    setPers(rp);
                    op.stmt = rec0.recordPersistence
                } else {
                    findFirst(rec.keys)
                    findFirst(rec.values)
                }
            } else if (this.data.template instanceof AST.GlobalDef) {
                var glb = <AST.GlobalDef>this.data.template
                var glb0 = <AST.GlobalDef>currAction
                var rp = glb.getRecordPersistence()
                if (rp != glb0.getRecordPersistence()) {
                    setPers(rp);
                } else if (glb.getKind().toString() != glb0.getKind().toString()) {
                    op = new TutorialInstruction();
                    op.targetKind = glb.getKind()
                }
            } else {
                Util.oops("")
            }

            if (!op && this.data.command == "change") {
                AST.visitExprHolders(currAction, (stmt, eh) => {
                    if (op) return
                    eh.tokens.forEach(t => {
                        var call = t.getCall()
                        if (call && call.referencedData() && call.referencedData().getName() == this.data.commandArg) {
                            TheEditor.intelliProfile.incr("searchArtRefactoring");
                            op = new TutorialInstruction();
                            op.stmt = stmt
                            op.addAfter = t
                            op.addToken = t
                            op.calcIntelli = Ticks.calcEditArt
                            op.label = lf("customize the art!")
                        }
                    })
                })
            }

            if (op) {
                op.diffSize = AST.Diff.diffSize(this.data.template)
                op.decl = currAction;
                if (!op.stmt) {
                    if (currAction instanceof AST.RecordDef) {
                        op.stmt = (<AST.RecordDef>currAction).values
                    } else if (currAction instanceof AST.GlobalDef) {
                        op.stmt = (<AST.GlobalDef>currAction)
                    }
                }
            }

            if (op && op.addToken && op.addToken.getOperator()) {
                var opprop = api.core.Unknown.getProperty(op.addToken.getOperator())
                if (opprop && opprop.getInfixPriority() == api.opStmtPriority) {
                    TheEditor.intelliProfile.incr(opprop.getName())
                    op.isOpStmt = true;
                }
            }

            if (op && op.addToken && op.addToken.getLocalDef() && op.addToken.getLocalDef().isHiddenOut)
                TheEditor.intelliProfile.incr("outAssign")


            return op
        }
    }

    export class MultiTimer
    {
        private timeoutId:any;
        private version = 1;
        public running = false;

        constructor(private callback:()=>void)
        {
        }

        public poke()
        {
            if (!this.running)
                this.start(1);
        }

        public stop()
        {
            ++this.version;
            if (this.timeoutId)
                window.clearTimeout(this.timeoutId);
            this.timeoutId = null
            this.running = false;
        }

        public start(ms:number)
        {
            this.stop()
            var v = this.version;
            this.running = true;
            this.timeoutId = Util.setTimeout(ms, () => {
                if (v == this.version) {
                    this.running = false;
                    this.callback();
                }
            })
        }
    }

    export class StepTutorial
    {
        private steps: Step[];
        private stepsPerAction:any;
        private currentStep = -1;
        public mdcmt:MdComments;
        private stepShown = false;
        public waitingFor:string;
        private timer: MultiTimer = new MultiTimer(() => TipManager.showScheduled())
        private goalTimer: MultiTimer;
        private maxProgressDelay = 8000;
        private prevDiffSize = -1;
        private stepStartTime: number;
        public disableUpdate = false;
        private fromReply = false;
        private finalCountdown = false;
        private finalHTML:string;
        private initialHTML:string;
        private showInitialStep:boolean;
        public expectingSearch = 0;
        public goalTips = 0;
        private initialMode = true;
        private recoveryMode = false;
        private needHelpCount = 0;
        private lastModalDuration:number = undefined;
        private seenDoItYourself = false;
        public renameIndex:StringMap<AST.Decl> = {};
        private progressId:string;
        public hasValidators = false;
        public hourOfCode = false;
        private translatedTutorial: TDev.AST.TranslatedTutorialInfo = undefined;
        public customizations:AST.TutorialCustomizations;

        constructor(private app:AST.App, private topic:HelpTopic, firstTime: boolean, private guid:string)
        {
            this.progressId = this.topic.json.id;
            this.steps = AST.Step.splitActions(app).map(s => new Step(this, s))

            var act = this.stepsPerAction = {}
            this.steps.forEach((a, i) => {
                var baseName = a.data.declName()
                if (a.data.validator)
                    this.hasValidators = true;
                if (!act.hasOwnProperty(baseName))
                    act[baseName] = []
                act[baseName].push(i)
            })

            this.showInitialStep = firstTime;
            this.hourOfCode = /#hourOfCode/i.test(this.topic.json.text || "");

            this.resetCustomizations()

            var skipActions:StringMap<boolean> = {}

            TheEditor.intelliProfile.loadFrom(app, true)

            if (this.isEnabled()) {
                var rend = new Renderer();
                rend.hideErrors = true;
                this.mdcmt = new MdComments(rend, null);
                this.mdcmt.showCopy = false;
                this.mdcmt.blockExternalLinks = app.blockExternalLinks;

                this.goalTimer = new MultiTimer(() => {
                    if (!this.disableUpdate && !this.initialMode)
                        TheEditor.calculator.goalTip()
                })

                this.currentStep = Script.editorState.tutorialStep || 0;
               // if (this.steps.slice(0, this.currentStep + 1).some(s => s.data.hintLevel == "semi"))
                //    this.seenDoItYourself = true;
                Script.editorState.tutorialNumSteps = this.steps.length;

                this.finalHTML = this.getHTML("final");
                this.initialHTML = this.getHTML("main") || ("<h2>" + Util.htmlEscape(this.app.getName()) + "</h2>");

                if (firstTime) {
                    this.stepStartTime = new Date().getTime();
                    this.postProgress();
                }
            }

        }

        private resetCustomizations()
        {
            this.customizations = { stringMapping: {}, artMapping: {} }
        }

        public updateProfile(ip:AST.IntelliProfile)
        {
            if (this.steps.some(s => !!s.data.addDecl || s.data.addsAction)) {
                ip.incr("addNewButton")
                ip.incr("dataSection");
            }
        }

        public renderDocs(code:AST.Stmt[]):string
        {
            var prev = Script
            try {
                setGlobalScript(this.app)
                return this.mdcmt.extractStmts(code)
            } finally {
                setGlobalScript(prev)
            }
        }

        private getHTML(name:string)
        {
            var final = this.app.actions().filter(a => a.getName() == name)[0]
            if (final) {
                return this.renderDocs(final.body.stmts)
            } else {
                return null;
            }
        }

        private getRunDelay()
        {
            var factor = this.hasValidators ? 1 : 2;
            return this.getProgressDelay() * factor;
        }

        private getProgressDelay()
        {
            return Math.min(500 + this.currentStep * 1000, this.maxProgressDelay)
        }

        public needHelp() {
            this.disableUpdate = false;
            
            if (!this.initialMode) {
                this.needHelpCount++;
                this.recoveryMode = true;
            }
            this.update()
        }

        public startAsync() : Promise {
            return this.translateAsync(Util.getTranslationLanguage())
                .then(() => {
                    if (this.showInitialStep) {
                        this.showInitialStep = false;
                        return this.firstStepAsync();
                    }
                    return this.stepStartedAsync();
                });
        }

        public dump():string
        {
            var r = ""
            this.steps.forEach((s, i) => {
                r += "STEP " + i + "\n"
                r += s.data.docs.map(s => s.serialize()) + s.data.template.serialize()
                r += "===================================================================\n"
            })
            return r
        }

        private postProgress(duration: number = undefined, text = undefined) {
            var help = this.currentStep > 0 ? this.needHelpCount : undefined;
            this.needHelpCount = 0;
            var goalTips = this.currentStep > 0 ? this.goalTips : undefined;
            this.goalTips = 0;
            var modalDuration = this.currentStep > 0 ? this.lastModalDuration : undefined;
            this.lastModalDuration = undefined
            if (modalDuration) modalDuration /= 1000;
            var playDuration = this.currentStep > 0 ? TheEditor.lastPlayDuration() : undefined;

            Cloud.postPrivateApiAsync("progress", {
                progressId: this.progressId,
                index: this.currentStep,
                duration: duration,
                text: text,
                helpCalls: help,
                goalTips: goalTips,
                modalDuration: modalDuration,
                playDuration: playDuration,
            }).done(undefined,() => { }); // don't wait, don't report error

            var data = <{ [id: string]: Cloud.Progress; }>{};
            var n = Math.round(Util.now() / 1000)
            var prog = {
                guid: this.guid,
                index: this.currentStep,
                lastUsed: n,
                numSteps: this.steps.length,
                completed: this.currentStep >= this.steps.length ? n : undefined
            };
            data[this.progressId] = prog;
            Cloud.storeProgress(data);
            Cloud.postPendingProgressAsync().done();

            // create a new tracking pixel and add it to the tree
            var trackUrl = this.topic.pixelTrackingUrl();
            if (trackUrl) {
                var anon = this.loadAnonymousId();
                if (anon) {
                    trackUrl += "?scriptid=" + this.progressId + "&index=" + prog.index + "&total=" + prog.numSteps + "&completed=" + !!prog.completed + "&time=" + prog.lastUsed + "&anonid=" + anon;
                    var pixel = <HTMLImageElement> document.createElement("img");
                    pixel.className = "tracking-pixel";
                    pixel.src = trackUrl;
                    pixel.onload = (el) => pixel.removeSelf();
                    pixel.onerror = (el) => pixel.removeSelf();
                    elt("root").appendChild(pixel);
                }
            }

            // pushing directly into event hubs
            var eventHubsInfo = this.topic.eventHubsTracking();
            if (eventHubsInfo) {
                var anon = this.loadAnonymousId();
                if (anon) {
                    var url = 'https://' + eventHubsInfo.namespace + '.servicebus.windows.net/' + eventHubsInfo.hub + '/publishers/' + anon + '/messages?timeout=60&api-version=2014-01';
                    var token = eventHubsInfo.token;
                    var payload = {
                        anonid: anon,
                        scriptid: this.progressId,
                        index: prog.index,
                        total: prog.numSteps,
                        completed: !!prog.completed,
                        time: prog.lastUsed
                    }
                    this.postEventHubsData(url, token, payload, 5);
                }
            }
        }

        private postEventHubsData(url: string, token: string, payload: any, retry : number) {
            Util.log('event hubs: ' + url);
            Util.log('event hubs token: ' + token);

            var tryAgain = () => {
                if (client.status != 401 && --retry > 0) {
                    Util.log('retrying events hub');
                    Util.setTimeout(1000 * (10 - retry),() => this.postEventHubsData(url, token, payload, retry));
                }
            }

            try {
                var client = new XMLHttpRequest();
                client.open('POST', url);
                client.setRequestHeader('Authorization', token);
                client.setRequestHeader("Content-Type", 'application/atom+xml;type=entry;charset=utf-8');
                client.ontimeout = tryAgain;
                client.onerror = tryAgain;
                client.send(JSON.stringify(payload));
            }
            catch (e) {
                Util.reportError("tutorialeventhubs", e, false);
            }
        }

        private loadAnonymousId(): string {
            if (!Script || !this.topic.json) return "";

            var anon = Script.editorState.tutorialAnonymousId;
            if (!anon) {
                var ids = JSON.parse(localStorage["tutorialAnonymousIds"] || "{}");
                anon = ids[this.topic.json.userid];
                if (!anon) {
                    anon = Script.editorState.tutorialAnonymousId = ids[this.topic.json.userid] = Util.guidGen();
                    localStorage["tutorialAnonymousIds"] = JSON.stringify(ids);
                }
            }
            return anon;
        }

        public showDiff()
        {
            var s = this.steps[this.currentStep]
            if (s) s.showDiff()
        }

        private stepCompleted(skipUpdate = false) {
            var step = this.steps[this.currentStep];
            if (step && step.hasStar())
                TDev.Browser.EditorSoundManager.tutorialStepFinished();

            if (this.currentStep + 1 <= this.steps.length) {
                this.currentStep = this.currentStep + 1;
                Script.editorState.tutorialStep = this.currentStep;

                var now = new Date().getTime();
                var duration = (now - this.stepStartTime) / 1000;
                this.stepStartTime = now;
                var text = step ? ((step.data.command ? ("*" + step.data.command + "* ") : "") + step.text) : undefined;
                this.postProgress(duration, text);
            }

            if (this.currentStep >= this.steps.length) {
                TheEditor.removeTutorialLibs();
                TipManager.setTip(null);
                this.stepShown = false;
                if (!skipUpdate) {
                    this.update();
                }
                return;
            }
            this.stepShown = false
            this.prevDiffSize = -1;
            if (!skipUpdate) {
                this.stepStartedAsync().done(() => {
                    this.timer.start(500);
                    this.update();
                });
            }
        }

        private modalTime(start:number)
        {
            this.lastModalDuration = Util.now() - start
        }

        private nowPublish()
        {
            TheEditor.leaveTutorial(); // always leave tutorial

            // not generally signed in
            if (!Cloud.getUserId() || !Cloud.isOnline() || !Cloud.canPublish() || !Script) return;

            // author explicitely wanted to skip step
            if (!this.topic || /none/i.test(this.topic.nextTutorials()[0]))
                return;

            World.getInstalledHeaderAsync(Script.localGuid).done((h: Cloud.Header) => {
                if (h.status == "published") return Promise.as();

                var screenshotDataUri = TheEditor.lastScreenshotUri();
                var start = Util.now()
                var m = new ModalDialog();
                this.disableUpdate = true;

                m.add(div('wall-dialog-header', lf("you did it!")));
                m.addHTML(lf("Publish your script, so that everyone can run it."))
                m.add(div('wall-dialog-buttons',
                    HTML.mkButton(lf("publish"), () => {
                        this.disableUpdate = false;
                        ScriptNav.publishScript(dbg ? false : true, uploadScreenshot ? screenshotDataUri : undefined)
                    this.update()
                }),
                    HTML.mkButton(lf("maybe later"), () => {
                        this.disableUpdate = false;
                        m.dismiss();
                    })
                    ));

                var uploadScreenshot = true;
                var uploadScreenshotCheck = HTML.mkCheckBox(lf("upload screenshot"), b => uploadScreenshot = b, uploadScreenshot);
                if (screenshotDataUri) {
                    var previewImage = HTML.mkImg(screenshotDataUri);
                    previewImage.setAttribute('class', 'publishScreenshot');
                    m.add(previewImage);
                    m.add(div('wall-dialog-body', uploadScreenshotCheck));
                    m.setScroll();
                }

                m.fullWhite();

                var d = Cloud.mkLegalDiv()
                d.style.marginTop = "1em";
                d.style.opacity = "0.6";
                m.add(d);
                m.show();
            });
        }

        private addHocFinishPixel(m : ModalDialog) {
            // add tracking pixel to dialog
            if (this.hourOfCode) {
                m.add(HTML.mkImg('https://code.org/api/hour/finish_touchdevelop.png', 'tracking-pixel'));
            }
        }

        private openHocFinish() {
            window.open("https://code.org/api/hour/finish", "hourofcode", "menubar=no,status=no,titlebar=no,location=no,scrollbars=no,toolbar=no,width=500,height=550", true);
        }

        private keepTinkering(advertise :boolean) {
            TipManager.setTip(null);

            if (!Script) return;

            // when running in office mix, notify host that the tutorial was completed
            if (advertise && Script.editorState && Script.editorState.tutorialId) {
                Util.log("tutorial complete: " + Script.editorState.tutorialId);
                var msg = RT.JsonObject.wrap({ kind: "tutorialComplete__Send", tutorialId: Script.editorState.tutorialId });
                RT.Web.post_message_to_parent(Cloud.config.rootUrl, msg, null);
                RT.Web.post_message_to_parent("http://localhost:15669", msg, null);
            }

            this.stepShown = true;
            var m = new ModalDialog();
            var willHourOfCodeFinal = false;
            var willNowPublish = false;

            m.onDismiss = () => {
                if (Script) {
                    TheEditor.saveStateAsync({ forReal: true }).done(() => {
                        if (willNowPublish)
                            this.nowPublish();
                        else if (willHourOfCodeFinal)
                            this.openHocFinish();
                    })
                }
            }

            if (this.finalHTML) {
                var finalDiv = m.addHTML(this.finalHTML);
                MdComments.attachVideoHandlers(finalDiv, true);
                if (this.translatedTutorial) StepTutorial.addTranslatedDocs(m, finalDiv, !!this.translatedTutorial.manual, this.translatedTutorial.finalDocs);
            } else {
                m.add(this.createStars());
                m.add(div('wall-dialog-header', lf("Well done!")));
                m.add(div('wall-dialog-body', lf("You just created an awesome app! You can keep customizing it as much as you want or even share it with your friends.")));
            }


            m.add(div('wall-dialog-buttons', HTML.mkButton(lf("keep editing"),() => {
                willNowPublish = true;
                m.dismiss();
            })));
            if (this.hourOfCode)
                m.add(div('wall-dialog-body hoc-notice',
                    span('hoc-link', lf("get my Hour of Code™ certificate")).withClick(() => {
                        tick(Ticks.hourOfCodeFinal);
                        this.openHocFinish();
                    })                
                ));

            if (Browser.EditorSettings.widgets().nextTutorialsList) {
                var nextTutorials = this.topic.nextTutorials();
                if (!/none/i.test(nextTutorials[0])) {
                    m.add(div('wall-dialog-header', lf("next tutorials...")));
                    var loadingMoreTutorials = div('wall-dialog-box', lf("loading..."));
                    m.add(loadingMoreTutorials);
                    Browser.TheHub.tutorialsByUpdateIdAsync()
                        .done(progs => {
                            loadingMoreTutorials.removeSelf();
                            var moreTutorials = <HTMLUListElement>createElement('ul', 'tutorial-list');

                            var tutLength = 8 - (moreTutorialsId ? 1 : 0);
                            var allTutorials = HelpTopic.getAllTutorials();
                            var theme = Browser.EditorSettings.currentTheme;
                            var score = (ht: HelpTopic) => {
                                var sc = 0;
                                if (this.hourOfCode && ht.isHourOfCode()) sc += 100;
                                if (/jetpack/i.test(ht.id)) sc += 25;
                                if (/jump/i.test(ht.id)) sc += 20;
                                if (progs[ht.updateKey()]) sc -= 50;
                                if (theme && theme.scriptSearch) sc += ht.hashTags().indexOf(theme.scriptSearch) > -1 ? 200 : 0;
                                return sc;
                            };
                            allTutorials.stableSort((a, b) => {
                                var sca = score(a); var scb = score(b); return sca > scb ? 1 : sca < scb ? -1 : 0;
                            });
                            while (nextTutorials.length < tutLength && allTutorials.length > 0) {
                                var tut = allTutorials.pop()
                                nextTutorials.push(tut.id);
                            }
                            nextTutorials.forEach(tutid =>
                                moreTutorials.appendChild(createElement('li', '', Browser.TheHub.tutorialTile(tutid, (h) => { m.dismiss() }))));
                            var moreTutorialsId = this.topic.moreTutorials();
                            if (moreTutorialsId)
                                moreTutorials.appendChild(createElement('li', '', Browser.TheHub.topicTile(moreTutorialsId, lf("More"))));
                            m.add(div('wall-dialog-body', moreTutorials));
                        }, e => {
                            loadingMoreTutorials.setChildren([lf("Oops, we could not load your progress.")]);
                        });
                }
            }

            this.addHocFinishPixel(m);
            m.fullWhite();
            m.setScroll();
            m.show();
        }

        private translateAsync(to : string) : Promise { // of TranslatedTutorialInfo
            if (this.translatedTutorial) return Promise.as(this.translatedTutorial);
            if (!to || /^en(-us)?$/i.test(to) || Cloud.isOffline() || !Cloud.config.translateCdnUrl || !Cloud.config.translateApiUrl) return Promise.as(undefined);

            tick(Ticks.tutorialTranslateScript, to);
            var tutorialId = this.topic.json.id;
            return ProgressOverlay.lockAndShowAsync(lf("translating tutorial..."))
                .then(() => {
                Util.log('loading tutorial translation from blob');
                var blobUrl = HTML.proxyResource(Cloud.config.translateCdnUrl + "/translations/" + to + "/" + tutorialId);
                return Util.httpGetJsonAsync(blobUrl).then((blob) => {
                    this.translatedTutorial = blob;
                    return this.translatedTutorial;
                }, e => {
                        // requestion translation
                        Util.log('requesting tutorial translation');
                        var url = HTML.proxyResource(Cloud.config.translateApiUrl + '/translate_tutorial?scriptId=' + tutorialId + '&to=' + to);
                        return Util.httpGetJsonAsync(url).then((js) => {
                            this.translatedTutorial = js.info;
                            return this.translatedTutorial;
                        }, e => {
                            Util.log('tutorial translation failed, ' + e);
                            return this.translatedTutorial = { steps: [] };
                        });
                    });
                }).then(() => ProgressOverlay.hide(), e => () => ProgressOverlay.hide());
        }

        private firstStepAsync() {
            var r = new PromiseInv();

            this.disableUpdate = true;
            TipManager.setTip(null);
            var m = new ModalDialog();
            var start = Util.now()

            m.onDismiss = () => {
                this.disableUpdate = false;
                this.modalTime(start)
                r.success(this.stepStartedAsync());
            }

            m.add(this.createStars(false));
            var initialDiv = m.addHTML(this.initialHTML);
            MdComments.attachVideoHandlers(initialDiv, true);
            if (this.translatedTutorial)
                StepTutorial.addTranslatedDocs(m, initialDiv, !!this.translatedTutorial.manual, this.translatedTutorial.startDocs);

            m.fullWhite();
            m.add(div('wall-dialog-buttons',
                Util.delayButton(HTML.mkButton(lf("let's get started!"), () => m.dismiss()), 1000)
                ));
            // add tracking pixel to dialog + notice
            if (this.hourOfCode) {
                m.addHTML("<div class='hoc-notice'>The 'Hour of Code™' is a nationwide initiative by Computer Science Education Week and Code.org to introduce millions of students to one hour of computer science and computer programming.</div>");
                m.add(HTML.mkImg('https://code.org/api/hour/begin_touchdevelop.png', 'tracking-pixel'));
            }
            m.setScroll();
            m.show();

            return r;
        }

        private youCanGoFasterAsync()
        {
            var r = new PromiseInv()
            var m = new ModalDialog()
            m.addHTML(lf("<h3>now, do it yourself!</h3>"))
            m.addHTML(lf("From now on we just show you the code that you need to write, in the goal line. It looks like this:"))
            var d = div(null);
            Browser.setInnerHTML(d, TheEditor.calculator.goalHTML());
            d.style.margin = "1.5em";
            m.add(d)
            m.addHTML(lf("Try finding the buttons yourself. If you get stuck, tap on the goal line."));
            Util.delayButton(m.addOk(lf("ok, got it!")), 1500)
            m.fullWhite()
            m.onDismiss = () => {
                this.disableUpdate = false;
                this.update();
                r.success(null)
            };
            TipManager.setTip(null);
            this.disableUpdate = true
            m.show()
            return r
        }
        

        private youAreOnYourOwnAsync() {
            var r = new PromiseInv()
            var m = new ModalDialog()
            m.addHTML(lf("<h3>no more tips!</h3>"))
            m.addHTML(lf("From now on we won't show you the code to write. Follow the instructions and tap run when you think you are done."))
            m.addHTML(lf("Try tweaking your code until you get it right. If you get stuck, tap the tutorial bar."));
            Util.delayButton(m.addOk(lf("ok, let's roll!")), 1500)
            m.fullWhite()
            m.onDismiss = () => {
                this.disableUpdate = false;
                this.update();
                r.success(null)
            };
            TipManager.setTip(null);
            this.disableUpdate = true
            m.show()
            return r
        }

        private switchToNormalMode()
        {
            var st = this.steps[this.currentStep]
            if (!st) return false

            this.initialMode = st.data.hintLevel == "full"

            if (this.initialMode) return false

            if (st.data.hintLevel != "semi" || this.seenDoItYourself || ModalDialog.currentIsVisible()) return false;
            var tmpl = TheEditor.calculator.goalHTML()
            if (!tmpl) return false;
            var goal = elt("calcGoalLine");
            // the do it yourself dialog is shown when tapping the goal line
            if (!this.seenDoItYourself && goal) {
                this.seenDoItYourself = true;
                this.disableUpdate = true;
                var tip = <Tip>{
                    title: lf("no more hints!"),
                    description: lf("if you are stuck, tap the goal line"),
                    el: goal,
                    forceBottom: true
                };
                TipManager.setTip(tip);
                Util.setTimeout(10000, () => {
                    if (TipManager.isCurrent(tip)) {
                        this.disableUpdate = false;
                        this.update();
                    }
                })
                return true;
            }
            return false
        }

        private isFirstStep()
        {
            return !this.steps.slice(0, this.currentStep).some(s => s.hasStar())
        }

        private congrats = lf("excellent; great job; awesome; cool; you rock; well done; outstanding; you got it; right on").split(/\s*[;؛]\s*/);
        private stepStartedAsync() {
            var step = this.steps[this.currentStep];
            if (step && step.hasStar()) {
                return new Promise((onSuccess, onError, onProgress) => {
                    this.disableUpdate = true;
                    TipManager.setTip(null);
                    var start = Util.now()
                    var m = new ModalDialog();
                    m.onDismiss = () => {
                        this.disableUpdate = false;
                        this.modalTime(start);
                        TDev.Browser.EditorSoundManager.tutorialStepNew();
                        this.timer.start(500);
                        this.update();
                        onSuccess(undefined);
                    }
                    m.add(this.createStars());
                    if (!this.isFirstStep() && !step.data.avatars && !step.data.noCheers)
                        m.add(dirAuto(div('wall-dialog-header', Util.capitalizeFirst(Random.pick(this.congrats) + '!'))));
                    var elementDiv = div('wall-dialog-body', step.element(false));
                    m.add(elementDiv);

                    if (this.translatedTutorial && this.translatedTutorial.steps[this.currentStep])
                        StepTutorial.addTranslatedDocs(m, elementDiv, !!this.translatedTutorial.manual, this.translatedTutorial.steps[this.currentStep].docs);

                    m.fullWhite();
                    m.setScroll();

                    var previousStep = this.currentStep - 1;
                    while (!!this.steps[previousStep] && !this.steps[previousStep].hasStar())
                        previousStep--;
                    m.add(div('wall-dialog-buttons tutDialogButons',
                        // TODO: mine tutorial locale
                        /-/.test(this.topic.id) ? HTML.mkLinkButton(lf("rewind"),() => { this.replyDialog() }) : null,
                        TheEditor.widgetEnabled("tutorialGoToPreviousStep", true) && previousStep > 0 && this.steps[previousStep].hasStar() ? HTML.mkLinkButton(lf("go to previous step"),() => { this.replyAsync(previousStep).done(() => { m.dismiss(); }); }) : null,
                        HTML.mkButton(lf("let's do it!"), () => m.dismiss())
                        )
                    );

                    if (this.hourOfCode) {
                        // https://docs.google.com/document/d/1d48vn_aN2aImmPkF9TK7xGDu_IVrHzjPXVGVEuv0pGw/pub
                        m.add(div('wall-dialog-body hoc-notice hoc-link', lf("i'm finished with my Hour of Code™")).withClick(() => {
                            tick(Ticks.hourOfCodeDoneStep);
                            m.dismiss();
                            var btns = {};
                            btns[lf("keep editing")] = () => {
                                tick(Ticks.hourOfCodeKeepCoding);
                                this.startAsync().done();
                            };
                            btns[lf("get my certificate")] = () => {
                                tick(Ticks.hourOfCodeConfirm);
                                this.openHocFinish();
                            }
                            ModalDialog.askMany(lf("Are you finished coding?"), lf("You can come back later to TouchDevelop and finish the tutorial!"), btns);
                        }));
                    }

                    m.show();
                });
            } else if (!step) {
                this.keepTinkering(false)
                return Promise.as();
            } else {
                this.disableUpdate = false;
                return Promise.as();
            }
        }

        static addTranslatedDocs(m: ModalDialog, elementDiv: HTMLElement, manualTranslation : boolean, translatedDocs: string) {
            if (translatedDocs) {
                if (manualTranslation) {
                    HTML.pauseVideos(elementDiv);
                    Browser.setInnerHTML(elementDiv, translatedDocs);
                    MdComments.attachVideoHandlers(elementDiv, true);
                } else {
                    var trElementDiv = <HTMLDivElement>div('wall-dialog-body');
                    Browser.setInnerHTML(trElementDiv, translatedDocs);
                    MdComments.attachVideoHandlers(trElementDiv, Util.seeTranslatedText());

                    var trNotice = div('translate-notice', lf("Translations by Microsoft® Translator, tap to see original..."))
                        .withClick(() => {
                            trElementDiv.style.display = 'none';
                            HTML.pauseVideos(trElementDiv);
                            elementDiv.style.display = 'block';
                            Util.seeTranslatedText(false);
                        });
                    trElementDiv.appendChild(trNotice);
                    var elNotice = div('translate-notice', lf("tap to translate with Microsoft® Translator..."))
                        .withClick(() => {
                            elementDiv.style.display = 'none';
                            HTML.pauseVideos(elementDiv);
                            trElementDiv.style.display = 'block';
                            Util.seeTranslatedText(true);
                        });
                    elementDiv.appendChild(elNotice);
                    m.add(trElementDiv);
                    if (Util.seeTranslatedText()) {
                        elementDiv.style.display = 'none';
                        HTML.pauseVideos(elementDiv);
                    }
                    else {
                        trElementDiv.style.display = 'none';
                        HTML.pauseVideos(trElementDiv);
                    }
                }
            }
        }

        private createStars(colors = true) {
            var stars = div('wall-dialog-body tutorialStars');
            var numStars = 0
            var lightStars = [];
            var allStars = [];
            for(var i = -1; i < this.steps.length; ++i) {
                if (i == -1 || this.steps[i].hasStar()) {
                    numStars++;
                    var checkpoint = i > -1 && (this.steps[i].data.stcheckpoint || i == this.steps.length - 1);
                    var completed = colors && i < this.currentStep;
                    var shape = checkpoint ? "award" : "star";
                    var color = completed ? checkpoint ? 'blueviolet' : '#EAC117' : "#ddd";
                    var star = HTML.mkImg('svg:' + shape + ',' + color + ',clip=100');
                    allStars.push(star);
                    if (completed) lightStars.push(star);
                    stars.appendChild(star);
                }
            }

            var maxStars = numStars > 32 ? 24 : 16;
            var rows = Math.ceil(numStars / maxStars);
            var starSize = Math.min(3, 21 / 0.8 / numStars)
            if (rows == 1) {
                Util.childNodes(stars).forEach(e => {
                    e.style.width = starSize + "em"
                    e.style.height = starSize + "em"
                })
            } else {
                var row = Math.ceil(allStars.length / rows);
                starSize = Math.min(2.5, 21 / 0.8 / row)
                stars = div('wall-dialog-body');
                var sk = 0;
                for(var ri = 0; ri < rows; ++ri) {
                    var rowDiv = div('tutorialStars');
                    stars.appendChild(rowDiv);
                    for(var rr = 0; rr < row && sk < allStars.length; ++rr) {
                        var aa = allStars[sk++];
                        aa.style.width = starSize + "em"
                        aa.style.height = starSize + "em"
                        rowDiv.appendChild(aa);
                    }
                }
            }

            if (lightStars.peek())
                Util.coreAnim("pulseStar", 1500, lightStars.peek());
            else {
                var interval = 3000 / numStars;
                var delay = 10;
                allStars.forEach(star => {
                    Util.setTimeout(delay, () => Util.coreAnim("pulseStar", interval * 3, star))
                    delay += interval;
                })
            }

            return stars;
        }

        private stopOverlayHandler = () => {};
        private runOverlay: HTMLElement;
            
        private showRunOverlay(step: Step)
        {
            if (this.runOverlay && this.runOverlay.parentElement) return;
            
            var tip =
               div('tip tip-tl', div('tipInner',
                    div('tipTitle', lf("tap there")),
                    div('tipDescr', lf("to continue coding"))))

            tip.style.bottom = "calc(50% - 3em)";
            tip.style.right = "calc(50% - 3em)";

            this.runOverlay =
                div("modalOverlay" /* , tip */)
            
            this.runOverlay.withClick(() => {
                if (this.runOverlay) {
                    this.runOverlay.removeSelf()
                    this.runOverlay = null;
                }                                
                Runtime.theRuntime.stopAsync().done()
            });
            this.runOverlay.style.backgroundColor = "rgba(255, 255, 79, 0.1)";
            this.runOverlay.style.cursor = "pointer";
            elt("editorContainer").appendChild(this.runOverlay)
            this.stopOverlayHandler = () => {
                if (this.runOverlay) {
                    this.runOverlay.removeSelf()
                    this.runOverlay = null;
                }                                
            }
            Util.setTimeout(3000, () => {
              if (this.runOverlay) this.runOverlay.appendChild(tip)
            })
        }

        public notify(cmd:string)
        {
            var step = this.steps[this.currentStep]

            if (cmd == "showside" || cmd == "hideside") {
                this.update()
                return
            }

            if (cmd == "run") {
                if (this.waitingFor == "validator") {
                    TheEditor.currentRt.validatorAction = step.data.validator
                    TheEditor.currentRt.validatorActionFlags = step.data.validatorArg
                    Plugins.setupEditorObject(Script.localGuid, false)
                    if (SizeMgr.splitScreen)
                        this.showRunOverlay(step)
                    return
                }

                if (SizeMgr.splitScreen) {
                    this.showRunOverlay(step)
                } else {
                    this.scheduleTapRun(step);
                    this.timer.start(this.getRunDelay());
                }

                return;
            }

            if (cmd == "editArtDone" && this.waitingFor == "editArt") {
                this.stepCompleted()
                Util.setTimeout(1000, () => this.update())
                return;
            }

            if (cmd == "runBack" || (SizeMgr.splitScreen && cmd == "runStop")) {
                this.stopOverlayHandler();
                var ed = TheEditor.consumeRtEditor()
                TheEditor.clearAnnotations(undefined)
                if (ed && ed.allAnnotations.length > 0) {
                    AST.Json.setStableId(Script)
                    TheEditor.injectAnnotations(ed.allAnnotations)
                }

                if (this.waitingFor == "run" || (this.waitingFor == "validator" && TheEditor.getRuntimeTutorialState().validated)) {
                    TheEditor.getRuntimeTutorialState().validated = false
                    this.stepCompleted()
                    Util.setTimeout(1000, () => this.update())
                } else {
                    this.update()
                }

                Util.setTimeout(0, () => TheEditor.refreshDecl())
                return;
            }

            if (cmd == "publish") {
                if (this.waitingFor == "publish") {
                    this.stepCompleted()
                    Util.setTimeout(1000, () => this.update())
                } else {
                    this.update();
                }
                return;
            }
            
            if (cmd == "compile") {
                if (this.waitingFor == "compile") {
                    this.stepCompleted()
                    Util.setTimeout(1000, () => this.update())
                } else {
                    this.update();
                }
            }

            if (cmd == "stepCompleted") {
                // force tip display and wait for user to stop whenever he wants
                this.scheduleTapRun(step);
                TipManager.showScheduled();
            }

            if (cmd == "delay") {
                document.getElementById("btn-tutorialNextStep").style.display = "none";
                this.stepCompleted();
                return;
            }

            if (/^plugin:/.test(cmd)) {
                if (this.waitingFor == cmd)
                    // plugin started, waiting to finish
                    this.stepCompleted(true);
                else
                    this.update();
                return;
            }

        }

        private scheduleTapRun(step: Step) {
            if (SizeMgr.splitScreen)
                TipManager.scheduleTip({
                    tick: Ticks.wallStop,
                    title: lf("tap there"),
                    description: lf("to continue coding")
                })
             else
                TipManager.scheduleTip({
                    tick: Ticks.wallBack,
                    title: lf("tap there"),
                    description: lf("to continue coding")
                })
        }

        private toInlineActions(ins:TutorialInstruction)
        {
            Util.setTimeout(1, () => {
                var exprStmt = <AST.ExprStmt>ins.stmt;
                var block = <AST.CodeBlock>exprStmt.parent;
                var idx = block.stmts.indexOf(exprStmt);
                if (idx < 0) return;
                var inl = new AST.InlineActions();
                inl.expr = exprStmt.expr;
                block.setChild(idx, inl)
                TheEditor.initIds(inl)
                if (TheEditor.hasModalPane())
                    TheEditor.nodeTap(inl, true);
                else
                    TheEditor.refreshDecl()
                this.update()
            })
        }

        public isActive() { return !!this.steps[this.currentStep]; }

        static lastTinkering = 0;
        private expectedKind:Kind;
        public update() {
            if (this.disableUpdate) return;
            if (!Script) return;

            if (this.switchToNormalMode()) return;

            var step = this.steps[this.currentStep]
            this.timer.poke();

            if (!step) {
                if (this.stepShown) return;

                TipManager.setTip(null);
                TheEditor.calculator.applyInstruction(null)
                this.stepShown = true;

                var d = div(null);
                Browser.setInnerHTML(d, this.finalHTML || ("<h3>" + lf("Tutorial completed") + "</h3>"));
                TheEditor.setStepHint(d)

                if (!this.finalCountdown) {
                    this.finalCountdown = true;
                    if (Date.now() - StepTutorial.lastTinkering < 30000)
                        return;
                    StepTutorial.lastTinkering = Date.now();
                    var cnt = () => {
                        if (!ModalDialog.currentIsVisible()) {
                            this.keepTinkering(true)
                        } else {
                            Util.setTimeout(500, cnt)
                        }
                    };
                    Util.setTimeout(500, cnt)
                }
                return;
            }

            this.waitingFor = null

            var hasDeclList = () => {
                if (TheEditor.hasModalPane() && !TheEditor.hasDeclList()) {
                    TipManager.setTip({
                        tick: Ticks.calcSearchBack,
                        title: lf("tap there"),
                        description: lf("need to edit elsewhere")
                    })
                    TheEditor.calculator.applyInstruction(null);
                    return false;
                }

                if (!TheEditor.hasDeclList()) {
                    TipManager.setTip({
                        tick: Ticks.editBtnSideSearch,
                        title: lf("tap there"),
                        description: lf("go to list of things in your script")
                    })
                    return false;
                }
                return true
            }

            if (step.data.validator && !TheEditor.getRuntimeTutorialState().validated) {
                if (Script.editorState.tutorialRedisplayed) {
                    TipManager.setTip(null)
                } else {
                    TipManager.setTip({
                        tick: Ticks.sideTutorialRedisplay,
                        title: lf("tap there for instructions"),
                        description: lf("show how to complete this activity")
                    })
                }
                this.waitingFor = "validator"
                if (!ModalDialog.currentIsVisible() && !Script.editorState.tutorialValidated) {
                    Script.editorState.tutorialValidated = true;
                    if (!this.isFirstStep())
                        this.youAreOnYourOwnAsync().done();
                }
                return
            }

            if (step.data.autoMode) {
                if (this.fromReply) {
                    this.fromReply = false;
                    if (SizeMgr.splitScreen && step.data.autoMode == "run" && !step.autorunDone) {
                        this.disableUpdate = true;
                        step.autorunDone = true
                        TheEditor.runMainAction()
                    }
                    this.stepCompleted()
                } else {
                    this.disableUpdate = true;
                    this.replyAsync(this.currentStep + 1).done();
                }
                return
            }

            this.fromReply = false;

            var ins = step.nextInstruction()
            if (ins && ins.toInlineActions) {
                this.toInlineActions(ins);
                return
            }

            if (ins && ins.calcIntelli == Ticks.calcEditArt)
                this.waitingFor = "editArt"

            if (!this.stepShown) {
                step.show()
                this.stepShown = true
            }

            if (ins == null) {
                var complete = () => {
                    TipManager.setTip(null);
                    TheEditor.calculator.applyInstruction(null);
                    this.stepCompleted();
                };
                if (!step.data.command || step.data.command == "none" || step.data.command == "empty") {
                    complete();
                    return;
                }

                TheEditor.calculator.applyInstruction(null)
                
                // when the user is not signed in, we don't want to ask them to sign in to compile
                var cmd = step.data.command;
                if (Cloud.isRestricted() && cmd == "compile" && !Cloud.getUserId())
                    cmd = "run";

                switch (cmd) {
                    case "delay":
                        this.waitingFor = "delay";
                        TipManager.setTip(null);
                        // (<any>TheEditor).hideStmtEditor();
                        // TheEditor.showVideo();
                        TheEditor.resetSidePane();
                        document.getElementById("btn-tutorialNextStep").style.display = "inline-block";
                        Util.setTimeout(3000, () => {
                            TipManager.setTip({
                                tick: Ticks.tutorialNextStep,
                                title: lf("tap here to move on to the next step"),
                                description: lf("move on to the next step"),
                            });
                        });
                        return;
                    case "run":
                        this.waitingFor = "run"
                        TipManager.setTip({
                            tick: TheEditor.calculator.stmt ? Ticks.calcSearchRun : Ticks.codeRun,
                            title: lf("tap there to run your app"),
                            description: this.currentCommandArg() || ""
                        })
                        return;
                    case "publish":
                        if (ScriptEditorWorldInfo.status == "published") {
                            this.stepCompleted()
                            return
                        }
                        if (!hasDeclList()) return;
                        this.waitingFor = cmd;
                        TipManager.setTip({
                            tick: Ticks.sidePublish,
                            title: lf("tap there"),
                            description: lf("publish your script")
                        })
                        return;
                    case "compile":
                        TheEditor.intelliProfile.incr("codeCompile");
                        if (TheEditor.hasModalPane()) {
                            TipManager.setTip({
                                tick: Ticks.calcSearchBack,
                                title: lf("tap there"),
                                description: lf("need to edit elsewhere")
                            })
                            TheEditor.calculator.applyInstruction(null);
                            return false;   
                        }
                        this.waitingFor = "compile"
                        TipManager.setTip({
                            tick: Ticks.codeCompile,
                            title: lf("tap there to compile your app"),
                            description: this.currentCommandArg() || ""
                        })
                        return;                        
                    case "plugin":
                        var pluginId = Util.htmlEscape(this.currentCommandArg().replace(/\s/, '').toLowerCase());
                        this.waitingFor = "plugin:" + pluginId;
                        if (!hasDeclList()) return;
                        if (TheEditor.calculator.stmt) {
                            TipManager.setTip({
                                tick: Ticks.calcSearchBack,
                                title: lf("tap there"),
                                description: lf("need plugin buttons")
                            })
                        } else {
                            TipManager.setTip({
                                tick: Ticks.sideButtonPlugin,
                                tickArg: pluginId,
                                title: lf("tap there to run your app"),
                                description: lf("run the plugin")
                            })
                        }
                        return;
                    default:
                        HTML.showErrorNotification(lf("unknown tutorial step: {0}", cmd))
                        this.stepCompleted()
                        return;
                }
            }

            // HTML.showProgressNotification("ds: " + ins.diffSize + " (prev: " + this.prevDiffSize + ")")

            if (!this.goalTimer.running)
                this.goalTimer.start(15000);

            if (this.prevDiffSize < 0) {
                this.prevDiffSize = ins.diffSize;
            } else {
                var progress = this.prevDiffSize - ins.diffSize
                if (this.recoveryMode && progress >= 1) {
                    this.recoveryMode = false;
                }
                if (progress > 0) {
                    this.prevDiffSize = ins.diffSize;
                    this.goalTimer.start(15000);
                }
            }

            if (this.initialMode || this.recoveryMode)
                this.timer.start(100);
            else
                this.timer.start(100000); // it's really the goal timer that should kick in

            var expS = this.expectingSearch;
            if (expS > 0) this.expectingSearch--;

            if (SizeMgr.splitScreen && !TheEditor.currentRt.isStopped()) {
                this.showRunOverlay(this.steps[this.currentStep]);
                return
            }

            if (ins.addButton) {
                if (!ScriptNav.addAnythingVisible) {
                    if (!hasDeclList()) return;
                    TipManager.setTip({
                        tick: Ticks.sideAddAnything,
                        title: lf("tap there"),
                        description: ins.label
                    })
                } else if (!elt("btn-" + Ticker.tickName(ins.addButton))) {
                    TipManager.setTip({
                        tick: Ticks.sideMoreOptions,
                        title: lf("tap there"),
                        description: lf("We need more options")
                    });
                } else {
                    TipManager.setTip({
                        tick: ins.addButton,
                        title: lf("tap there"),
                        description: ins.label,
                    })
                }
                return
            }

            Util.assert(!!ins.stmt)

            if (ins.decl != TheEditor.lastDecl) {
                if (expS) return;

                if (!hasDeclList()) return
                var switchDecl = () => {
                    if (ins.decl == TheEditor.lastDecl) return;
                    if (TheEditor.scriptNav.htmlForDecl(ins.decl)) {
                        TipManager.setTip({
                            decl: ins.decl,
                            title: lf("tap there"),
                            description: lf("we need to edit another thing"),
                        })
                    } else {
                        TipManager.setTip(null)
                        Util.setTimeout(300, switchDecl)
                    }
                };
                switchDecl()
                return
            }

            var selectorOk = ins.calcButton == Ticks.btnAddDown || ins.calcButton == Ticks.btnAddUp
            var currStmt = TheEditor.editedStmt(selectorOk)

            this.expectedKind = ins.targetKind;

            if (TheEditor.hasModalPane() && 
                (!currStmt || (ins.stmt != currStmt && (currStmt instanceof AST.RecordPersistenceKind || !TheEditor.codeVisible())))) {
                TipManager.setTip({
                    tick: Ticks.calcSearchBack,
                    title: lf("tap there"),
                    description: lf("need to edit elsewhere")
                })
            } else if (ins.stmt != currStmt) {
                if (ins.stmt.renderedAs) {
                    var target = <HTMLElement>ins.stmt.renderedAs.firstChild
                    if (ins.calcButton == Ticks.btnAddDown) {
                        var lastLine = target
                        while (target) {
                            if (target.className == "line")
                                lastLine = target
                            target = <HTMLElement>target.nextSibling
                        }
                        target = lastLine
                    }
                    TipManager.setTip({
                        el: target,
                        title: lf("tap there"),
                        description: lf("select that line")
                    })
                }
            } else if (ins.targetName) {
                var trg = elt("renameBox") || elt("renameBox2")
                if (trg)
                    TipManager.setTip({
                        el: trg,
                        title: lf("type: {0}", ins.targetName),
                        description: lf("tap [ok] when done"),
                    })
                else
                    TipManager.setTip({
                        el: elt("inlineEditCloseBtn"),
                        title: lf("type: {0}", ins.targetName),
                        description: lf("tap here when done"),
                    })
            } else if (ins.targetKind) {
                if (VariableProperties.kindSelectorVisible) {
                    // waiting for notifyKindList()
                    TipManager.setTip(null);
                } else {
                    TipManager.setTip({
                        tick: Ticks.btnChangeKind,
                        title: lf("tap there"),
                        description: lf("need a {0}", ins.targetKind.toString().toLowerCase()),
                    })
                }
            } else if (ins.calcButton) {
                TipManager.setTip({
                    tick: ins.calcButton,
                    title: lf("tap there"),
                    description: ins.label || "",
                })
            } else {
                TheEditor.calculator.applyInstruction(ins)
                return;
            }

            TheEditor.calculator.applyInstruction(null)
        }

        private currentCommandArg(): string {
            var step = this.steps[this.currentStep];
            var commandArg : string = undefined;
            if (step) {
                commandArg = step.data.commandArg;
                if (this.translatedTutorial && this.translatedTutorial.steps[this.currentStep] && this.translatedTutorial.steps[this.currentStep].commandArg)
                    commandArg = this.translatedTutorial.steps[this.currentStep].commandArg
            }
            return commandArg;
        }

        public notifyKindList(elts:HTMLElement[])
        {
            if (!this.expectedKind) {
                TipManager.setTip({
                    tick: Ticks.chooseCancel,
                    title: lf("tap there"),
                    description: lf("go back..."),
                })
                return;
            }
            var el = elts.filter(e => (<any>e).theNode == this.expectedKind)[0]
            TipManager.setTip({
                el: el,
                title: lf("tap there"),
                description: lf("select {0}", this.expectedKind.toString())
            })
        }

        public isEnabled() { return this.steps.length > 0 }

        private replyModalDialog:ModalDialog;

        public replyAsync(stepNo:number) : Promise
        {
            var scr = AST.Step.reply(Script, this.app, this.steps.slice(0, stepNo).map(s => s.data), this.customizations)
            return TheEditor.loadScriptTextAsync(ScriptEditorWorldInfo, scr, JSON.stringify(Script.editorState)).then(() => {
                if (this.replyModalDialog) {
                    this.replyModalDialog.dismiss()
                    this.replyModalDialog = null
                }
                TheEditor.addTutorialValidatorLibrary()
                TheEditor.renderDefaultDecl();
                TheEditor.queueNavRefresh();
                this.currentStep = stepNo ? stepNo - 1 : 0;
                this.disableUpdate = false;
                this.fromReply = true;
                this.update();
            });
        }

        public replyDialog()
        {
            var m = new ModalDialog()
            this.replyModalDialog = m;
            var d = this.topic.render(Browser.TopicInfo.attachCopyHandlers);
            var outer = div("tutReply", div(null,
                HTML.mkButton(lf("diff for current step"), () => this.showDiff())
            ), d)
            m.add(outer)
            Util.setupDragToScroll(outer)
            outer.style.maxHeight = (SizeMgr.windowHeight * 1.2) / SizeMgr.topFontSize + "em";
            m.fullWhite()
            m.show()
        }
    }

}
