///<reference path='refs.ts'/>

module TDev.AST {

    export class FeatureDetector
        extends NodeVisitor
    {
        public features:StringMap<number> = { script: 1 }
        public stmtCount = 0;
        public libroots:(v:string)=>string;
        public includeCaps = false;
        public anonBrowser = true;

        use(feature:string)
        {
            if (!feature) return;
            var n = this.features[feature] || 0;
            this.features[feature] = n + 1
        }

        visitAstNode(n:AstNode)
        {
            super.visitChildren(n);
        }

        visitExprHolder(eh:ExprHolder)
        {
            super.visitExprHolder(eh);
            if (eh.parsed) this.dispatch(eh.parsed)
        }

        visitCall(c:Call)
        {
            super.visitCall(c);

            var p = c.prop()

            if (this.libroots) {
                var act = c.calledExtensionAction()
                if (!act) act = c.calledAction()
                if (act instanceof LibraryRefAction) {
                    var lib = this.libroots(act.parentLibrary().getId())
                    if (lib) {
                        this.use("l:" + lib + ":" + act.getName())
                    }
                }
            }

            if (c.referencedRecordField() || c.referencedData() || c.calledExtensionAction()) {
            } else if (p.forwardsTo() || p.forwardsToStmt()) {
            } else if (p == api.core.AssignmentProp) {
                this.use("assignment");
            } else if (p == api.core.TupleProp) {
                //TODO need help
                //this.use("actionsWithManyReturnValues");
            } else if (p.parentKind instanceof RecordEntryKind || p.parentKind instanceof RecordDefKind) {
            } else if (p) {
                this.use(p.helpTopic())
                if (p.parentKind)
                    this.use(p.parentKind.helpTopic())
                var cap = p.getCapability()
                if (cap & ~(PlatformCapability.Accelerometer|PlatformCapability.MusicAndSounds))
                    this.anonBrowser = false
                if (this.includeCaps) {
                    if (cap)
                        App.capabilityString(p.getCapability()).split(/,/).forEach(k => {
                            this.use(Util.tagify("cap " + k))
                        })
                }
            }
        }

        visitWhere(w:Where)
        {
            super.visitStmt(w);
            if (w.condition.tokens.length > 1)
                this.use("where")
        }

        visitStmt(s:Stmt)
        {
            super.visitStmt(s);
            if (s instanceof Block) return;
            if (s instanceof ActionHeader) return;

            if (!s.isPlaceholder())
                this.stmtCount++;

            this.use(s.helpTopic())
        }

        visitDecl(d:Decl)
        {
            super.visitChildren(d);
            this.use(d.helpTopic())
        }

        visitApp(a:App)
        {
            super.visitApp(a);
            if (a.isLibrary) this.use("library");
            if (a.isCloud) this.use("cloud");
            if (this.includeCaps && this.anonBrowser)
                this.use("anonBrowser")
        }

        static bucketId(features:StringMap<number>)
        {
            var f = Util.clone(features)
            delete f['assignment']
            delete f['commands']
            delete f['var']
            var kk = Object.keys(f)
            kk.sort(Util.stringCompare)
            return kk.map(k => k + ":" + f[k]).join(",")
        }

        static astInfo(a:App, libroots:(v:string)=>string = null, flags:StringMap<string> = null)
        {
            var fd = new FeatureDetector()
            fd.libroots = libroots
            if (!flags) flags = {}
            if (Runtime.stringToBoolean(flags["caps"]))
                fd.includeCaps = true
            fd.dispatch(a)
            var b = FeatureDetector.bucketId(fd.features)
            fd.features['anystmt'] = fd.stmtCount
            fd.features['anycode'] = a.allActions().length
            return {
                features: fd.features,
                bucketId: b,
            }
        }
    }
}

