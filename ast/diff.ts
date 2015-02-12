///<reference path='refs.ts'/>

module TDev.AST.Diff {

    export interface Options
    {
        approxNameMatching?:boolean;
        placeholderOk?:boolean;
        tutorialMode?:boolean;
        preciseStrings?:StringMap<boolean>;
        useStableNames?:boolean;
    }

    class RandomIdSetter
        extends NodeVisitor
    {
        private lastId:string;
        private definedLocals:any = {};
        public keep = false;

        public makeId(defl:string)
        {
            if (this.keep && defl) return (this.lastId = defl);
            return (this.lastId = uniqueAstId(16))
        }

        public visitLocalDef(l:LocalDef) {
            // skip; should be handled already
        }

        public setDeclId(d:Decl)
        {
            if (d instanceof RecordDef && d.getStableName() && !/_/.test(d.getStableName())) {
                d.stableId = d.getStableName();
            } else if (!this.keep || !d.stableId) {
                d.stableId = this.makeId(d.stableId);
            }
        }

        public visitDecl(d:Decl)
        {
            this.setDeclId(d)
            this.visitChildren(d);
        }

        public visitLibraryRef(l:LibraryRef)
        {
            l.getPublicActions().forEach(a => {
                this.visitAction(a)
            })
            super.visitLibraryRef(l);
        }

        public visitExprHolder(eh:ExprHolder)
        {
            var locs:LocalDef[] = []
            eh.tokens.forEach(t => {
                var tt = t.getThing()
                if (tt instanceof LocalDef) {
                    var l = <LocalDef>tt
                    Util.assert(!!l.stableId)
                    if (locs.indexOf(l) < 0 && !this.definedLocals.hasOwnProperty(l.stableId))
                        locs.push(l)
                }
            })
            eh.definedLocals = locs
            locs.forEach((l, i) => this.defineLocal(l, this.lastId + "L" + i))

            this.makeId(null); // just in case
        }

        public visitStmt(s:Stmt)
        {
            s.stableId = this.makeId(s.stableId);
            this.visitChildren(s);
        }

        public visitInlineActions(n:InlineActions)
        {
            n.stableId = this.makeId(n.stableId);
            this.dispatch(n.actions)
            this.dispatch(n.expr)
        }

        public visitInlineAction(n:InlineAction)
        {
            n.stableId = this.makeId(n.stableId);
            this.defineLocal(n.name, n.stableId + "B0");
            n.inParameters.concat(n.outParameters).forEach((p, i) => {
                this.defineLocal(p, n.stableId + "P" + i);
            })
            this.visitChildren(n)
        }

        public visitForeach(n:Foreach)
        {
            n.stableId = this.makeId(n.stableId);
            this.defineLocal(n.boundLocal, n.stableId + "B0");
            this.visitChildren(n)
        }

        public visitFor(n:For)
        {
            n.stableId = this.makeId(n.stableId);
            this.defineLocal(n.boundLocal, n.stableId + "B0");
            this.visitChildren(n)
        }

        private defineLocal(l:LocalDef, id:string)
        {
            this.definedLocals[id] = true;
            l.stableId = id
        }

        public visitAction(a:Action)
        {
            this.setDeclId(a)
            this.definedLocals = {}
            a.getInParameters().concat(a.getOutParameters()).forEach((p, i) => {
                this.defineLocal(p.local, a.stableId + "P" + i);
            })
            if (a.modelParameter)
                this.defineLocal(a.modelParameter.local, a.stableId + "PM")

            // assign some ids
            a.allLocals.forEach(l => { if (!l.stableId) l.stableId = this.makeId(null) })

            this.visitChildren(a)
        }

        public visitRecordField(d:RecordField)
        {
            d.stableId = !d.getStableName() || /_/.test(d.getStableName()) ? this.makeId(d.stableId) : d.getStableName();
            this.visitChildren(d);
        }
    }

    class DiffFeatureDetector
        extends FeatureDetector
    {
        constructor(private options:Options)
        {
            super();
        }

        static approxName(s:string)
        {
            return s.toLowerCase().replace(/\s/g, "")
        }

        visitThingRef(t:ThingRef)
        {
            super.visitThingRef(t)
            if (t.def instanceof LocalDef)
                this.use("local:" + t.def.getName())
        }

        visitLiteral(l:Literal)
        {
            super.visitLiteral(l)
            var d = l.data
            switch (typeof d) {
            case "string":
                this.use("stringLiteral:" + d)
                var len = (<string>d).length
                this.use("stringLiteralLen10:" + Math.round(len/10))
                this.use("stringLiteralLen100:" + Math.round(len/100))
                break;
            case "number":
                this.use("numberLiteral:" + d.toString());
                break;
            case "boolean":
                this.use(d ? "true" : "false");
                break;
            }
        }

        visitCall(c:Call)
        {
            super.visitCall(c)

            var act = c.calledExtensionAction()
            if (!act) act = c.calledAction()
            if (act instanceof LibraryRefAction) {
                //var lib = this.libroots[act.parentLibrary().getId()]
                this.use("libact:" + act.getName())
                return
            }

            var fld = c.referencedRecordField()
            if (fld) {
                if (this.options.approxNameMatching)
                    this.use("decl:" + DiffFeatureDetector.approxName(fld.getName()))
                else
                    this.use("decl:" + fld.stableId)
                return
            }

            var p = c.prop()
            if (p.parentKind instanceof RecordEntryKind || p.parentKind instanceof RecordDefKind) {
                this.use("recordProp:" + p.getName())
            }

            var decl = c.prop().forwardsTo()
            if (decl) {
                if (this.options.approxNameMatching)
                    this.use("decl:" + DiffFeatureDetector.approxName(decl.getName()))
                else
                    this.use("decl:" + decl.stableId)
            }
        }

        visitOperator(op:Operator)
        {
            this.use("op:" + op.data)
        }

        visitComment(c:Comment)
        {
            c.text.split(/\s+/).forEach(s => {
                this.use("commentWord:" + s)
            })
        }

        kind(k:Kind) : string
        {
            return k.toString()
        }

        visitRecordField(r:RecordField)
        {
            super.visitRecordField(r)
            this.use("recordFieldName:" + r.getName())
            this.use("recordFieldKind:" + this.kind(r.dataKind))
        }

        static run(n:AstNode, opt:Options):any
        {
            var d = new DiffFeatureDetector(opt)
            d.dispatch(n)
            return d.features
        }

        static cmp(a:any, b:any)
        {
            var ka = Object.keys(a)
            var similarity = 0
            var dissimilarity = 0
            for (var i = 0; i < ka.length; ++i) {
                var k = ka[i]
                var va = a[k]
                var vb = 0
                if (b.hasOwnProperty(k)) {
                    vb = b[k]
                    similarity += Math.min(va, vb)
                }
                dissimilarity += Math.abs(va - vb)
            }

            var ka = Object.keys(b)
            for (var i = 0; i < ka.length; ++i) {
                var k = ka[i]
                if (!a.hasOwnProperty(k)) {
                    dissimilarity += b[k]
                }
            }

            return similarity - dissimilarity/2
        }

        static updateSize(a:any, b:any, tutorialMode:boolean)
        {
            var ka = Object.keys(a)
            var similarity = 0
            var dissimilarity = 0
            for (var i = 0; i < ka.length; ++i) {
                var k = ka[i]
                var va = a[k]
                var vb = 0
                if (b.hasOwnProperty(k)) {
                    vb = b[k]
                    similarity += Math.min(va, vb)
                }
                dissimilarity += Math.abs(va - vb)
            }

            var ka = Object.keys(b)
            for (var i = 0; i < ka.length; ++i) {
                var k = ka[i]
                if (!a.hasOwnProperty(k)) {
                    dissimilarity += b[k]
                }
            }

            //if (!tutorialMode)
                return dissimilarity

            /*
            if (2*dissimilarity > similarity)
                return 2*dissimilarity - similarity;
            else
                return 1 / ((similarity - dissimilarity) + 2);
            */
        }
    }

    function classify(d:AstNode) {
        var r = d.nodeType();
        switch (r) {
        case "action":
            var a = <Action>d;
            if (a.isEvent())
                return "event:" + a.eventInfo.type.category;
            if (a.isPage())
                return "page";
            break;
        case "globalDef":
            return (<GlobalDef>d).isResource ? "art" : "data";
        }

        return r;
    }

    function setId(t:AstNode, id:string)
    {
        t.stableId = id;
        if (t instanceof RecordField) {
            var f = <RecordField>t
            if (!f.def().persistent)
                f.setStableName(id);
        } else if (t instanceof RecordDef) {
            if (!(<RecordDef>t).persistent)
                (<RecordDef>t).setStableName(id);
        }
    }

    function matchDecls(older:App, newer:App, opts:Options)
    {
        var olderByStable = Util.toDictionary(older.things, t => t.getStableName())
        var olderByName = Util.toDictionary(older.things, t => t.getName())
        var assignedIds:any = {}

        var missing = newer.things.filter(t => {
            var ot:Decl = null
            if (opts.useStableNames && t.getStableName() && !newer.syntheticIds[t.getStableName()] &&
                olderByStable.hasOwnProperty(t.getStableName()))
                ot = olderByStable[t.getStableName()]
            if (!ot && olderByName.hasOwnProperty(t.getName()))
                ot = olderByName[t.getName()]
            if (ot && classify(ot) == classify(t)) {
                setId(t, ot.stableId);
                assignedIds[ot.stableId] = true;
                delete olderByName[t.getName()];
                return false;
            } else {
                return true;
            }
        })

        var olderClassified = Util.groupBy<Decl>(older.things.filter(t => !assignedIds[t.stableId]), classify)
        var newerClassified = Util.groupBy<Decl>(missing, classify)

        var getFeatures = Util.memoizeHashed((d:Decl) => d.stableId, (d) => DiffFeatureDetector.run(d, opts))

        Object.keys(newerClassified).forEach(k => {
            var ns:Decl[] = newerClassified[k]
            var os:Decl[] = olderClassified[k]
            if (!os) return;
            var matches = []
            ns.forEach(n => {
                var fn = getFeatures(n)
                os.forEach(o => {
                    var score = DiffFeatureDetector.cmp(getFeatures(o), fn)
                    if (score > 0)
                        matches.push({
                            score: score,
                            n: n,
                            o: o,
                        })
                })
            })
            matches.sort((a, b) => b.score - a.score)
            matches.forEach(m => {
                if (assignedIds[m.o.stableId] || assignedIds[m.n.stableId])
                    return;
                setId(m.n, m.o.stableId);
                assignedIds[m.o.stableId] = true;
            })
        })
    }

    interface StmtMatch {
        score: number;
        o: Stmt;
        n: Stmt;
    }

    function matchBlocks(oldStmts:Stmt[], newStmts:Stmt[], opts:Options)
    {
        oldStmts.forEach(s => {
            s.diffFeatures = DiffFeatureDetector.run(s, opts)
        })
        newStmts.forEach((s, i) => {
            s.diffFeatures = DiffFeatureDetector.run(s, opts)
            // adding statements at the bottom should be cheaper
            if (opts.tutorialMode)
                s.diffFeatures.positionWeight = (newStmts.length - i) / newStmts.length;
            else
                s.diffFeatures.positionWeight = 0
        })
        var getFeatures = (s:Stmt) => {
            if (!s) return {}
            return s.diffFeatures
        }

        var cmp = (a:Stmt, b:Stmt) => {
            var off = 0
            if (a && b && classify(a) != classify(b) && (!opts.placeholderOk || !a.isPlaceholder()))
                off = 1e20
            var fa = getFeatures(a)
            var fb = getFeatures(b)
            if (!a)
                off += fb.positionWeight;
            return DiffFeatureDetector.updateSize(fa, fb, opts.tutorialMode) + off
        };

        var diff = minimalUpdateDistance(oldStmts, newStmts, null, cmp)

        var firstAdded = -1;
        for (var i = 0; i < diff.length; i += 2) {
            if (diff[i]) {
                if (diff[i].isPlaceholder() && firstAdded != -1) {
                    diff[firstAdded] = diff[i];
                    diff[i] = null;
                    firstAdded = -1;
                }
                if (diff[i+1]) firstAdded = -1;
            } else {
                if (firstAdded == -1) firstAdded = i;
            }
        }

        for (var i = 0; i < diff.length; i += 2) {
            if (diff[i] && diff[i+1])
                setId(diff[i+1], diff[i].stableId)
        }

        var oldById = Util.toDictionary(oldStmts, (s) => s.stableId)
        newStmts.forEach(s => {
            var oldStmt = oldById[s.stableId]
            if (oldStmt)
                matchStmts(oldStmt, s, opts)
        })
    }

    function matchStmts(o:AstNode, n:AstNode, opts:Options)
    {
        if (!n || !o) return;

        if (classify(n) != classify(o)) return;

        if (o instanceof Block) {
            matchBlocks((<Block>o).stmts, (<Block>n).stmts, opts)
        } else {
            setId(n, o.stableId);
            var ch0 = o.children()
            var ch1 = n.children()
            ch0.forEach((oo, i) => {
                if (oo instanceof Stmt && ch1[i] instanceof Stmt)
                    matchStmts(<Stmt>oo, <Stmt>ch1[i], opts)
            })

            if (o instanceof LibraryRef) {
                var actByName = Util.toDictionary((<LibraryRef>o).getPublicActions(), a => a.getName());
                (<LibraryRef>n).getPublicActions().forEach(a => {
                    var aa = <LibraryRefAction> actByName[a.getName()]
                    if (aa) setId(a, aa.stableId)
                })
            }
        }
    }

    function matchActions(older:App, newer:App, opts:Options)
    {
        var oldById = Util.toDictionary(older.things, t => t.stableId)

        var th:Decl[] = []
        newer.things.forEach(a => {
            a.diffAltDecl = null
            var old = oldById[a.stableId]
            if (!old) return;
            a.diffAltDecl = old
            th.push(a)
        })

        th.forEach(a => {
            if (!(a instanceof Action))
                matchStmts(a.diffAltDecl, a, opts)
        })

        th.forEach(a => {
            if (a instanceof Action)
                matchStmts(a.diffAltDecl, a, opts)
        })
    }

    export function setLongIds(a:AstNode)
    {
        var s = new RandomIdSetter()
        s.dispatch(a)
    }

    function prepApp(a:App) {
        a.isTopLevel = true;
        TypeChecker.tcScript(a, true);
        setLongIds(a)
    }

    function matchIds(older:App, newer:App, opts:Options)
    {
        prepApp(older)
        prepApp(newer)
        matchPreped(older, newer, opts)
    }

    function matchPreped(older:App, newer:App, opts:Options)
    {
        matchDecls(older, newer, opts)
        matchActions(older, newer, opts)

        var s = new RandomIdSetter()
        s.keep = true
        s.dispatch(newer) // reset ids on locals
    }

    export function randTest()
    {
        for (var i =0;i<10;++i) {
            var a = Random.uint32() + ""
            var b = Random.uint32() + ""
            medTest(a,b)
        }
    }

    export function medTest(s:string, t:string)
    {
        var res = minimalEditDistance(s.toUpperCase().split(""),
                                      t.toLowerCase().split(""),
                                      (a, b) => a.toUpperCase() == b.toUpperCase())

        var toStr = () => {
            var p = ""
            for (var i = 0; i < res.length; i += 2) {
                if (res[i] && res[i+1])
                    p += "=" + res[i] + res[i+1]
                else if (res[i])
                    p += "-" + res[i]
                else
                    p += "+" + res[i+1]
            }

            return p;
        }

        var r0 = toStr();
        res = minimalUpdateDistance(s.toUpperCase().split(""),
                                    t.toLowerCase().split(""),
                                    "",
                                    (a, b) => a=="" || b=="" ? 1 : a.toLowerCase() == b.toLowerCase() ? 0 : 2)
        var r1 = toStr();

        if (r0 != r1) {
            console.log(r0)
            console.log(r1)
        }
    }

    // returns an array R of minimal length, such that
    //   even(R) without nulls == s
    //   odd(R) without nulls == t
    //   forall even i. R[i] && R[i+1] ==> eq(R[i], R[i+1])
    //
    export function minimalEditDistance<T>(s:T[], t:T[], eq:(a:T,b:T)=>boolean) : T[]
    {
        var m = s.length
        var n = t.length
        var d = new Array(m + 1)
        for (var i = 0; i <= m; ++i) {
            d[i] = new Array(n + 1)
            d[i][0] = i
        }
        for (var j = 0; j <= n; ++j) {
            d[0][j] = j;
        }
        for (var j = 0; j < n; ++j) {
            for (var i = 0; i < m; ++i) {
                if (eq(s[i], t[j])) {
                    d[i+1][j+1] = d[i][j];
                } else {
                    var del = d[i][j+1] + 1
                    var ins = d[i+1][j] + 1
                    var sub = d[i][j] + 2
                    d[i+1][j+1] = Math.min(del, ins, sub)
                }
            }
        }

        var res:T[] = []

        var i = m - 1
        var j = n - 1
        var lastDel = false
        while (i >= 0 || j >= 0) {
            var curr = d[i+1][j+1]
            if (i >= 0 && j >= 0 && eq(s[i], t[j]) && curr == d[i][j]) {
                res.push(t[j])
                res.push(s[i])
                i--;
                j--;
            } else {
                var isDel = i >= 0 && curr == d[i][j+1] + 1
                var isIns = j >= 0 && curr == d[i+1][j] + 1
                if (isDel && lastDel) isIns = false;
                if (isIns && !lastDel) isDel = false;
                if (isDel) {
                    res.push(null)
                    res.push(s[i])
                    i--;
                    lastDel = true;
                } else if (isIns) {
                    res.push(t[j])
                    res.push(null)
                    j--;
                    lastDel = false;
                } else {
                    Util.assert(curr == d[i][j] + 2)
                    res.push(t[j])
                    res.push(null)
                    res.push(null)
                    res.push(s[i])
                    i--;
                    j--;
                    lastDel = true;
                }
            }
        }

        res.reverse();
        return res;
    }

    export function minimalUpdateDistance<T>(s:T[], t:T[], zero:T, cmp:(a:T,b:T)=>number) : T[]
    {
        var m = s.length
        var n = t.length
        var d = new Array(m + 1)
        var ss = s.map(e => cmp(e, zero))
        var tt = t.map(e => cmp(zero, e))
        for (var i = 0; i <= m; ++i) {
            d[i] = new Array(n + 1)
            d[i][0] = i == 0 ? 0 : (d[i-1][0] + ss[i-1])
        }
        for (var j = 0; j <= n; ++j) {
            d[0][j] = j == 0 ? 0 : (d[0][j-1] + tt[j-1])
        }
        for (var j = 0; j < n; ++j) {
            for (var i = 0; i < m; ++i) {
                var del = d[i][j+1] + ss[i]
                var ins = d[i+1][j] + tt[j]
                var sub = d[i][j] + cmp(s[i], t[j])
                var su2 = d[i][j] + ss[i] + tt[j]
                d[i+1][j+1] = Math.min(del, ins, sub)
            }
        }

        var res:T[] = []

        var i = m - 1
        var j = n - 1
        var lastDel = false
        while (i >= 0 || j >= 0) {
            var curr = d[i+1][j+1]
            if (i >= 0 && j >= 0 && curr == d[i][j] + cmp(s[i], t[j])) {
                res.push(t[j])
                res.push(s[i])
                i--;
                j--;
            } else {
                var isDel = i >= 0 && curr == d[i][j+1] + ss[i]
                var isIns = j >= 0 && curr == d[i+1][j] + tt[j]
                if (isDel && lastDel) isIns = false;
                if (isIns && !lastDel) isDel = false;
                if (isDel) {
                    res.push(null)
                    res.push(s[i])
                    i--;
                    lastDel = true;
                } else if (isIns) {
                    res.push(t[j])
                    res.push(null)
                    j--;
                    lastDel = false;
                } else {
                    Util.assert(curr == d[i][j] + ss[i] + tt[j])
                    res.push(t[j])
                    res.push(null)
                    res.push(null)
                    res.push(s[i])
                    i--;
                    j--;
                    lastDel = true;
                }
            }
        }

        res.reverse();
        return res;
    }

    function stmtsEq(a:Stmt, b:Stmt)
    {
        return a.stableId && a.stableId == b.stableId; // && a.nodeType() == b.nodeType();
    }

    function clearDiff(s:Stmt)
    {
        if (s) {
            s.diffAltStmt = null;
            s.diffStatus = undefined;
            s.diffStmts = null;
        }
    }

    function addDiffStmt(newer:Stmt, older:Stmt)
    {
        if (!newer.diffStmts) newer.diffStmts = []
        newer.diffStmts.push(older)
    }

    export function diffSize(decl:Decl):number
    {
        var size = 0

        function desc(s:AstNode, justSize:boolean)
        {
            if (s instanceof Block) {
            } else if (s instanceof Decl) {
            } else if (s instanceof Stmt) {
                var df = (<Stmt>s).diffStatus
                if (df < 0) {
                    size += 2
                    return
                }
                if (df > 0) {
                    size += 1;
                    justSize = true;
                }
            } else if (s instanceof ExprHolder) {
                var eh = <ExprHolder>s
                if (justSize) {
                    size += eh.tokens.length * 2
                } else if (eh.diffTokens) {
                    var d = eh.diffTokens
                    for (var i = 0; i < d.length; i += 2) {
                        // insert
                        if (d[i] == null)
                            size += 1
                        // remove
                        if (d[i + 1] == null)
                            size += 0.1;
                    }
                }
                return;
            } else {
                return;
            }

            var arr = s.children()
            for (var i = 0; i < arr.length; ++i)
                desc(arr[i], justSize)
        }

        desc(decl, false)

        return size
    }

    /*
    export function similaritySize(decl:Decl):number
    {
        var size = 0

        function desc(s:AstNode)
        {
            if (s instanceof Block) {
            } else if (s instanceof Decl) {
            } else if (s instanceof Stmt) {
                if ((<Stmt>s).diffStatus) {
                    size -= 0.1;
                    return;
                }
                size += 1;
            } else if (s instanceof ExprHolder) {
                var eh = <ExprHolder>s
                if (eh.diffTokens) {
                    var d = eh.diffTokens
                    for (var i = 0; i < d.length; i += 2)
                        if (d[i] != null && d[i + 1] != null)
                            size += 1
                        else
                            size -= 0.01;
                } else {
                    size += eh.tokens.length
                }
                return;
            } else {
                return;
            }

            var arr = s.children()
            for (var i = 0; i < arr.length; ++i)
                desc(arr[i])
        }

        desc(decl)

        return size
    }
    */

    function isArt(d:Decl) {
        return d instanceof GlobalDef && (<GlobalDef>d).isResource
    }

    function diffRatio(eh:ExprHolder)
    {
        function measure(t:Token)
        {
            return Math.min(t.getText().length, 5) + 1
        }

        var dt = eh.diffTokens
        var lenCommon = 0
        var lenDiff = 0
        for (var i = 0; i < dt.length; i += 2) {
            if (dt[i] && dt[i+1])
                lenCommon += measure(dt[i])
            else if (dt[i])
                lenDiff += measure(dt[i])
            else
                lenDiff += measure(dt[i+1])
        }
        if (!lenDiff) return 0
        return lenDiff / (lenDiff + lenCommon)
    }


    export function diffExprs(eh0:ExprHolder, eh1:ExprHolder, opts:Options, f = undefined)
    {
        function tokenDistance(a:Token, b:Token)
        {
            if (!b)
                return 1;
            if (!a) {
                if (/^[0-9\.]$/.test(b.getText()))
                    // used to be "1 -"; not sure what for --MM
                    return 1 + (0.1 / (eh1.tokens.indexOf(b) + 2))
                else
                    return 1 + (0.1 / (eh1.tokens.indexOf(b) + 2))
            }

            if (a.nodeType() != b.nodeType()) return 3;

            if (opts.approxNameMatching) {
                var fa = a.getForwardedDecl()
                var fb = b.getForwardedDecl()
                if (isArt(fa) && isArt(fb) && fa.getKind() == fb.getKind())
                    return 0;

                var pa = a.getProperty()
                var pb = b.getProperty()
                if (pa && pb) {
                    var ka = pa.parentKind
                    var kb = pb.parentKind
                    if (ka && ka == kb && ka.getName() == "Colors" &&
                        /#[a-fA-F0-9]{6}/.test(pa.getDescription(true)) &&
                        /#[a-fA-F0-9]{6}/.test(pb.getDescription(true)))
                        return 0;
                }

                var da = a.getLiteral()
                var db = b.getLiteral()
                if (typeof da === "string" && typeof db === "string") {
                    if (opts.preciseStrings && opts.preciseStrings[db])
                        return (da == db) ? 0 : 3;
                    if ((da == "") == (db == "")) return 0;
                }
            }
            return a.getText() == b.getText() ? 0 : 3;
        }

        eh1.diffTokens = minimalUpdateDistance(eh0.tokens, eh1.tokens, null, f ? f(tokenDistance) : tokenDistance)
    }


    function diffDecls(decl0:Decl, decl1:Decl, opts:Options) {
        var oldById = {}
        var newById = {}

        function clearAndIndex(idx:any, s:AstNode)
        {
            if (s instanceof Decl) {
            } else if (s instanceof Stmt) {
                idx[s.stableId] = s;
                clearDiff(<Stmt>s)
            } else if (s instanceof ExprHolder) {
                (<ExprHolder>s).diffTokens = null;
            } else {
                return;
            }
            var arr = s.children()
            for (var i = 0; i < arr.length; ++i)
                clearAndIndex(idx, arr[i])
        }

        function linkStmts(oldStmt:Stmt, newStmt:Stmt)
        {
            newStmt.diffAltStmt = oldStmt;
            oldStmt.diffAltStmt = newStmt;

            Util.assert(oldStmt.nodeType() == newStmt.nodeType());

            var oo = oldStmt.children()
            var nn = newStmt.children()
            Util.assert(oo.length == nn.length)
            for (var i = 0; i < oo.length; ++i) {
                Util.assert(oo[i].nodeType() == nn[i].nodeType());

                if (oo[i] instanceof ExprHolder) {
                    diffExprs(<ExprHolder>oo[i], <ExprHolder>nn[i], opts)

                    if (!opts.tutorialMode &&
                        oo.length == 1 &&
                        newStmt instanceof ExprStmt &&
                        diffRatio(<ExprHolder>nn[i]) > 0.5) {
                        return false;
                    }
                }
                else if (oo[i] instanceof Block)
                    diffBlocks(<Block>oo[i], <Block>nn[i])
                else if (oo[i] instanceof Stmt)
                    linkStmts(<Stmt>oo[i], <Stmt>nn[i])
                else
                    Util.oops("wrong node type in diff " + oo[i].nodeType())
            }
            return true
        }

        function diffBlocks(older:Block, newer:Block)
        {
            var combined = minimalEditDistance(older.stmts, newer.stmts, stmtsEq)
            var lastNewStmt:Stmt = null
            clearDiff(newer)
            for (var i = 0; i < combined.length; i += 2) {
                var oldStmt = combined[i]
                var newStmt = combined[i+1]

                if (oldStmt && newStmt) {
                    if (oldStmt.isPlaceholder() && oldStmt.nodeType() != newStmt.nodeType()) {
                        newStmt.diffStatus = 1;
                        oldStmt.diffStatus = -1;
                        addDiffStmt(newStmt, oldStmt)
                    } else {
                        if (linkStmts(oldStmt, newStmt)) {
                            newStmt.diffStatus = 0;
                            oldStmt.diffStatus = 0;
                        } else {
                            newStmt.diffAltStmt = null;
                            oldStmt.diffAltStmt = null;
                            newStmt.diffStatus = 2;
                            oldStmt.diffStatus = -1;
                            newStmt.calcNode().diffTokens = null
                            addDiffStmt(newStmt, oldStmt)
                        }
                    }
                } else if (newStmt) {
                    newStmt.diffStatus = 1;
                } else {
                    oldStmt.diffStatus = -1;
                    addDiffStmt(lastNewStmt || newer, oldStmt)
                }

                if (newStmt)
                    lastNewStmt = newStmt
            }
        }

        clearAndIndex(oldById, decl0)
        clearAndIndex(newById, decl1)
        linkStmts(decl0, decl1)

        var diffId = 2;

        Object.keys(newById).forEach(k => {
            var newStmt = newById[k]
            if (newStmt.diffStatus == 2) {
                newStmt.diffStatus = 1
                return
            }
            if (newStmt.diffAltStmt) return;
            var oldStmt = oldById[k]
            if (oldStmt) {
                // moved
                oldStmt.diffStatus = -1
                newStmt.diffStatus = 1
                if (oldStmt.nodeType() == newStmt.nodeType())
                    linkStmts(oldStmt, newStmt)
            } else {
                // really new
                newStmt.diffStatus = 1
            }
        })

        Object.keys(oldById).forEach(k => {
            var oldStmt = oldById[k]
            if (oldStmt.diffAltStmt && oldStmt.diffStatus == -1) {
                oldStmt.diffStatus = -diffId;
                diffId++;
            }
            if (oldStmt.diffStatus === undefined)
                oldStmt.diffStatus = -1;
        })
    }

    export function templateDiff(act:Decl, templ:Decl, opts:Options)
    {
        setLongIds(act)
        setLongIds(templ)
        matchStmts(act, templ, opts)
        diffDecls(act, templ, opts)
    }

    export function diffApps(older:App, newer:App, opts:Options = {})
    {
        matchIds(older, newer, opts);
        var olderD = Util.toDictionary(older.things, t => t.stableId)
        newer.things.forEach(t => {
            var o:Decl = olderD[t.stableId]
            if (o) {
                delete olderD[t.stableId]
                t.diffStatus = 0
                diffDecls(o, t, opts)
            } else {
                visitStmts(t, s => s.diffStatus = 1)
            }
        })
        newer.diffRemovedThings = []
        Object.keys(olderD).forEach(k => {
            var o:Decl = olderD[k]
            newer.diffRemovedThings.push(o)
            visitStmts(o, s => s.diffStatus = -1)
        })
    }

    export interface HistoryEntry
    {
        time: number;
        scriptId: string;
        historyId: string;
        seqNo: number;

        // one of these is present
        script?: string;
        ast?: any;
        updates?: any;
            // "idOfNode": { "field": "newValue", "anotherField": "newValue" }
            // "ifOfRemovedNode": null

        updateSize?:number;
        scriptLines?:string[];
    }

    function indexIds(obj:any)
    {
        var oldById:any = {}

        function findIds(o:any) {
            if (!o) return;
            if (Array.isArray(o)) {
                for (var i = 0; i < o.length; ++i)
                    findIds(o[i])
            } else if (typeof o === "object") {
                if (!o.id) Util.oops("no id for " + JSON.stringify(o))
                if (oldById.hasOwnProperty(o.id)) Util.oops("duplicate id " + o.id)
                oldById[o.id] = o
                var k = Object.keys(o)
                for (var i = 0; i < k.length; ++i)
                    findIds(o[k[i]])
            }
        }
        findIds(obj)

        return oldById
    }

    export function jsonDiff(o0:any, n0:any)
    {
        var oldById = indexIds(o0)
        var updateSet:any = {}

        function compareArrays(n:any[], o:any[])
        {
            for (var i = 0; i < n.length; ++i) {
                if (n[i].id)
                    compare(n[i])
            }

            if (!o || n.length != o.length) return true;

            for (var i = 0; i < n.length; ++i) {
                var id0 = o[i].id || o[i]
                var id1 = n[i].id || n[i]
                if (id0 !== id1) return true;
            }

            return false
        }

        function compare(n:any) {
            if (!n.id) Util.oops("no id on new " + JSON.stringify(n));

            var o:any;
            if (oldById.hasOwnProperty(n.id)) {
                var o = oldById[n.id]
                if (!o)
                    Util.oops("duplicate new id " + n.id)
                oldById[n.id] = null
            } else {
                o = { id: n.id } // start from empty
            }
            var hasUpdate = false;
            var update:any = {}

            var k = Object.keys(n)
            for (var i = 0; i < k.length; ++i) {
                var v = n[k[i]]
                if (v === undefined) continue;
                var ov = o[k[i]]
                if (false && v.id) {
                    compare(v)
                    v = v.id
                }
                if (ov && ov.id) ov = ov.id
                switch (typeof v) {
                    case "string":
                    case "number":
                    case "boolean":
                        if (ov !== v) update[k[i]] = v;
                        break;
                    default:
                        if (Array.isArray(v)) {
                            if (compareArrays(v, ov))
                                update[k[i]] = v.map(vv => vv.id || vv);
                        } else if (v === null) {
                            if (ov !== v) update[k[i]] = v;
                        } else
                            Util.oops("cannot compare " + JSON.stringify(v))
                }
            }

            k = Object.keys(o)
            for (var i = 0; i < k.length; ++i) {
                if (n[k[i]] === undefined && o[k[i]] !== undefined)
                    update[k[i]] = null;
            }

            if (Object.keys(update).length > 0)
                updateSet[n.id] = update
        }
        compare(n0)

        var k = Object.keys(oldById)
        for (var i = 0; i < k.length; ++i) {
            var oo = oldById[k[i]]
            if (oo)
                updateSet[oo.id] = null
        }

        return updateSet
    }

    export var lastSeqNo = 0;
    export function computeMicroEdits(entries:HistoryEntry[])
    {
        function getApp(s:string) {
            var a = AST.Parser.parseScript(s, [])
            prepApp(a)
            return a
        }

        entries.forEach(e => {
            e.updateSize = 0
        })

        lastSeqNo = entries[0].seqNo

        var prevApp = getApp(entries[0].script)
        var prevAst = Json.dumpForDiff(prevApp)
        entries[0].ast = prevAst

        for (var i = 1; i < entries.length; ++i) {
            //console.log("compute: " + i)
            lastSeqNo = entries[i].seqNo
            var newApp = getApp(entries[i].script)
            matchPreped(prevApp, newApp, {})
            var newAst = Json.dumpForDiff(newApp)
            entries[i].updates = jsonDiff(prevAst, newAst)
            prevAst = newAst
            prevApp = newApp

            AST.reset()
            newApp.things.forEach(t => t.diffAltDecl = null)
            newApp.diffAltDecl = null
        }

        entries.forEach(e => {
            e.updateSize = JSON.stringify(e.ast || e.updates).length
            // e.scriptLines = e.script.split(/\r?\n/)
            //delete e.script
        })
    }

    export function applyJsonDiff(base:any, diff:any)
    {
        var byId = indexIds(base)

        var k = Object.keys(diff)
        for (var i = 0; i < k.length; ++i) {
            var id = k[i]
            var upd = diff[id]
            if (upd === undefined) continue;
            var trg = byId[id]
            if (upd === null) {
                if (!trg) Util.oops("apply diff: no target id " + id)
                trg.__deleted = true;
                continue;
            }
            if (!trg) {
                byId[id] = trg = { id: id }
            }
            var kk = Object.keys(upd)
            for (var j = 0; j < kk.length; ++j) {
                var f = kk[j]
                var v = upd[f]
                if (Array.isArray(v) && typeof v[0] === "string")
                    v = v.map(id => {
                        var r = byId[id]
                        if (!r) { r = byId[id] = { id: id } }
                        return r
                    })

                Util.assert(f != "nodeType" || !trg[f])
                trg[f] = v
            }
        }

        var newIds = indexIds(base)
        k = Object.keys(newIds)
        for (var i = 0; i < k.length; ++i) {
            var id = k[i]
            if (newIds[k[i]].__deleted)
                Util.oops("dangling id after diff " + id)
        }
    }

    export function lineDiff(a:string, b:string)
    {
        var res = minimalEditDistance(a.split(/\r?\n/),
                                      b.split(/\r?\n/),
                                      (a, b) => a == b)

        var p = ""
        for (var i = 0; i < res.length; i += 2) {
            if (res[i] != null && res[i+1] != null)
                p += " " + res[i]
            else if (res[i] != null)
                p += "-" + res[i]
            else
                p += "+" + res[i+1]
            p += "\n"
        }

        return p;
    }

    export function sanityCheckEdits(entries:HistoryEntry[])
    {
        var ast = null

        function format(s:string)
        {
            var app = AST.Parser.parseScript(s, [])
            app.isTopLevel = true;
            TypeChecker.tcScript(app, true);
            app.rootId = "none";
            return App.sanitizeScriptTextForCloud( app.serialize() )
        }

        entries.forEach(e => {
            lastSeqNo = e.seqNo
            //console.log("compare: " + e.seqNo)
            if (e.ast) ast = JSON.parse(JSON.stringify(e.ast));
            else applyJsonDiff(ast, e.updates)

            var prevAst = JSON.stringify(ast)

            var pre0 = e.script
            var pre1 = Json.serialize(ast)

            AST.reset()
            var a0 = format(pre0)
            var a1 = format(pre1)

            if (a0 != a1) {
                if (a0.split(/\n/).length < 250) {
                    var diff = lineDiff(a0, a1)
                }
                Util.oops("mismatch!", [diff || "<too big>", a0, a1])
            }

            if (JSON.stringify(ast) != prevAst)
                Util.oops("serialize modified json", [JSON.stringify(ast), prevAst])

            delete e.script;
        })
    }

    export function scrub(entries:HistoryEntry[])
    {
        function desc(e:any, f) {
            if (!e || typeof e != "object") return;
            if (Array.isArray(e)) {
                for (var i = 0; i < e.length; ++i) {
                    desc(e[i], f);
                }
            } else {
                var k = Object.keys(e)
                for (var i = 0; i < k.length; ++i) {
                    var kk = k[i]
                    var v0 = e[kk]
                    var v1 = f(kk, v0)
                    if (v0 !== v1) e[kk] = v1;
                    if (typeof v1 === "object") desc(v1, f)
                }
            }
        }

        function ehField(k:string) {
            return (k == "condition" || k == "expr" || k == "bound" || k == "collection")
        }

        function quote(s:string) {
            return s.toLowerCase().replace(/[ \r\n\t]/g, "")
        }


        function allowString(e:HistoryEntry) {
            if (!e.scriptId) return
            desc([e.ast, e.updates], (k, v) => {
                if (ehField(k)) {
                    Json.shortToTokens(v).forEach(tok => {
                        if (tok.nodeType === "stringLiteral") {
                            allowedStrings[quote(tok.value)] = 1
                            // console.log("ok " + JSON.stringify(tok.value))
                        }
                    })
                }
                return v;
            })
        }

        var allowedStrings:any = {};

        ([
        "TouchDevelop is cool!", "tap to create bubbles", "hello", "hello world", "hello world!"
        ]).forEach(s => {
            allowedStrings[quote(s)] = 1
        })

        var disallowCount = 0;
        var disallowStrings:any = {}

        function checkStrings(e:HistoryEntry) {
            desc([e.ast, e.updates], (k, v) => {
                if (ehField(k)) {
                    var toks = Json.shortToTokens(v)
                    var numSmurf = 0
                    toks.forEach(tok => {
                        if (tok.nodeType === "stringLiteral" && tok.value.length > 3 && !allowedStrings.hasOwnProperty(quote(tok.value))) {
                            if (!disallowStrings.hasOwnProperty(tok.value)) {
                                disallowStrings[tok.value] = "scrub" + disallowCount++
                            }
                            // console.log("remove " + JSON.stringify(tok.value))
                            tok.value = disallowStrings[tok.value]
                            numSmurf++
                        }
                    })
                    var v1 = toks.map(Json.longToShort).join(" ")
                    Util.assert(numSmurf > 0 || v == v1)
                    return v1
                }
                return v;
            })
        }

        entries.forEach(allowString)
        entries.forEach(checkStrings)
    }

    class IdCopier
        extends NodeVisitor
    {
        visitStmt(s:Stmt)
        {
            if (s.diffAltStmt && !s.getStableName())
                s.setStableName(s.diffAltStmt.getStableName())
            this.visitChildren(s)
        }
    }

    export class DiffStat
        extends NodeVisitor
    {
        stats = {
            numStmts: 0,
            numMatched: 0,
            numAdd: 0,
            numDel: 0,
            numChanged: 0,
            totalChangedRatio: 0,
            numHighlyChanged: 0,

            numArtChanges: 0,
            numNumberChanges: 0,
            numStringChanges: 0,
            numCommentChanges: 0,
            numOtherChanges: 0,
        }

        visitBlock(b:Block)
        {
            this.visitChildren(b)
        }

        processDiffTokens(dt:Token[])
        {
            var stringChanges = 0
            var numChanges = 0
            var generalChanges = 0
            var artChanges = 0
            var prevArt = false

            for (var i = 0; i < dt.length; i += 2) {
                if (dt[i] && dt[i+1]) {
                    prevArt = (dt[i] instanceof ThingRef && (<ThingRef>dt[i]).data == "art")
                } else {
                    var tok = dt[i] || dt[i+1]
                    if (tok instanceof Literal && typeof (<Literal>tok).data == "string")
                        stringChanges++
                    else if (tok instanceof Operator && /^[0-9\.]$/.test((<Operator>tok).data))
                        numChanges++
                    else if (prevArt && tok instanceof PropertyRef)
                        artChanges++
                    else
                        generalChanges++
                }
            }

            var st = this.stats
            st.numArtChanges += artChanges
            st.numStringChanges += stringChanges
            if (numChanges) st.numNumberChanges++
            if (generalChanges) st.numOtherChanges++
        }

        visitStmt(s:Stmt)
        {
            var st = this.stats
            if (s.diffAltStmt) {
                st.numMatched++
                if (s instanceof GlobalDef && (<GlobalDef>s).isResource) {
                    if ((<GlobalDef>s.diffAltStmt).url != (<GlobalDef>s).url)
                        st.numArtChanges++
                }
            } else {
                // if (s.diffStatus) console.log(s.diffStatus + " " + s.serialize())

                if (s.diffStatus < 0) st.numDel++
                else if (s.diffStatus > 0) st.numAdd++

                if (s.diffStatus > 0) {
                    if (s instanceof GlobalDef && (<GlobalDef>s).isResource) {
                        st.numArtChanges++
                    } else {
                        st.numOtherChanges++
                    }
                }
            }
            st.numStmts++

            if (s.diffAltStmt &&
                s instanceof Comment)
            {
                if ((<Comment>s).text != (<Comment>s.diffAltStmt).text) {
                    st.numMatched--
                    st.numAdd++
                    st.numDel++
                    st.numCommentChanges++
                }
            }

            var eh = s.calcNode()
            if (eh && eh.diffTokens) {
                st.numChanged++
                var dr = diffRatio(eh)
                st.totalChangedRatio += dr
                if (dr > 0.5) st.numHighlyChanged++

                if (s.diffAltStmt) this.processDiffTokens(eh.diffTokens)
            }

            this.visitChildren(s)
        }

        static run(a:App)
        {
            var ds = new DiffStat()
            ds.dispatch(a)
            return ds.stats
        }
    }

    export interface AssignResult {
        text: string;
        info: any;
    }

    export function assignIds(oldText:string, newText:string):AssignResult
    {
        function prep(s:string)
        {
            var app = AST.Parser.parseScript(s, [])
            app.isTopLevel = true;
            TypeChecker.tcScript(app, true);
            return app;
        }

        var oldApp = prep(oldText)
        var newApp = prep(newText)
        new InitIdVisitor(false).dispatch(oldApp)
        //new InitIdVisitor(false).dispatch(newApp)
        diffApps(oldApp, newApp, {
            useStableNames: true,
            //tutorialMode: true,
        })
        var info = {
            oldApp: DiffStat.run(oldApp),
            newApp: DiffStat.run(newApp)
        }

        var copier = new IdCopier()
        copier.dispatch(newApp)
        new InitIdVisitor(false).dispatch(newApp) // and set the remaining ones
        if (oldText)
            newApp.rootId = oldApp.rootId
        newApp.hasIds = true
        var newTextIds = newApp.serialize()

        var app2 = prep(newTextIds)
        new InitIdVisitor(false).expectSet(app2)

        return {
            text: newTextIds,
            info: info
        }
    }
}
