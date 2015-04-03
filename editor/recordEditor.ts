///<reference path='refs.ts'/>

module TDev
{
    export class RecordEditor
        extends SideTab
    {
        private record:AST.RecordDef;
        private recordKind:AST.RecordKind;

        private persistenceRadio: HTML.RadioGroup;
        private persistenceDiv: HTMLElement;

        constructor(private recordProperties: RecordDefProperties) {
            super()
        }

        public init(e:Editor)
        {
            super.init(e);
        }

        public editedStmt():AST.Stmt
        {
            return this.record ? this.record.recordPersistence : null
        }

        public edit(s:AST.Stmt)
        {
            // [s] is either a [RecordKind] or a [RecordPersistenceKind]. Both
            // have a [parentDef] property.
            this.record = (<any> s).parentDef;

            var kindbox = div("kindBox");
            var entries;
            var selectEntry = (rt: AST.RecordType) => {
                entries.forEach(e => {
                    if (e.type == rt)
                        e.node.setFlag("selected", true);
                    else
                        e.node.setFlag("selected", false);
                });
            };
            var mkEntry = (rt: AST.RecordType) => {
                var r = this.recordProperties;
                return {
                    type: rt,
                    node: r.mkTypeBox(rt).withClick(() => {
                        this.setRecordType(rt);
                        selectEntry(rt);
                    })
                };
            };
            entries = [
                mkEntry(AST.RecordType.Object),
                mkEntry(AST.RecordType.Decorator),
                mkEntry(AST.RecordType.Table),
                mkEntry(AST.RecordType.Index),
            ];
            var rt = this.record.recordType;
            selectEntry(rt);
            kindbox.setChildren(entries.map(e => e.node));

            // Record persistence
            this.persistenceDiv = div("");
            this.persistenceRadio = HTML.mkRadioButtons(
                Script.isCloud ? (Script.isLibrary ? RecordDefProperties.cloudlibraryPersistenceLabels : RecordDefProperties.servicePersistenceLabels)
                : RecordDefProperties.cloudstatePersistenceLabels);
            this.persistenceRadio.onchange = () => {
                if (this.record.getRecordPersistence() != this.persistenceRadio.current)
                    this.setRecordType(undefined);
            };
            this.syncPersistenceRadio();
            var persistenceLabel = div("varLabel", lf("record persistence"));
            this.persistenceDiv.setChildren([
                persistenceLabel,
                this.persistenceRadio.elt,
            ]);

            var defbuttons = ActionProperties.copyCutRefs(
                "the current record definition",
                this.record
            );
            defbuttons.className += " defbuttons";

            this.setChildren([
                div("varLabel", lf("record category")),
                kindbox,
                this.persistenceDiv,
                div("varLabel", lf("record definition")),
                defbuttons,
            ]);

            if (s instanceof AST.RecordPersistenceKind)
                persistenceLabel.scrollIntoView();
        }

        private syncPersistenceRadio() {
            var rt = this.record.recordType;
            this.persistenceRadio.change(this.record.getRecordPersistence());
            this.persistenceDiv.style.display = (rt != AST.RecordType.Index && rt != AST.RecordType.Table) ? "none" : "block";
        }

        // This function has two purposes. If called with [undefined], it
        // updates our underlying [RecordDef] so that its [cloudEnabled],
        // [cloudPartiallyEnabled] and [persistent] fields reflect the current
        // user choice in the UI. If called with a new record type, it updates
        // the UI with a legal record type / record persistence combination and
        // also updates the underlying [RecordDef].
        private setRecordType(rt: AST.RecordType) {
            var cloud = this.persistenceRadio.current;
            var origtype = this.record.recordType;
            if (rt === undefined)
                rt = origtype;

            if (rt != AST.RecordType.Index && rt != AST.RecordType.Table)
                cloud = AST.RecordPersistence.Temporary;

            if (cloud == AST.RecordPersistence.Cloud) {
                if (Cloud.anonMode(lf("using cloud data"))) return;
                if (!(PlatformCapabilityManager.current() & PlatformCapability.CloudData))
                    cloud = AST.RecordPersistence.Local;
            }

            this.record.recordType = rt;
            this.record.cloudEnabled = cloud == AST.RecordPersistence.Cloud || cloud == AST.RecordPersistence.Partial;
            this.record.cloudPartiallyEnabled = cloud == AST.RecordPersistence.Partial;
            this.record.persistent = (cloud == AST.RecordPersistence.Local || cloud == AST.RecordPersistence.Cloud || cloud == AST.RecordPersistence.Partial);
            this.record.clearPropertyCaches();

            this.recordProperties.syncAll(true, origtype);
            this.syncPersistenceRadio();
        }

        public bye()
        {
            this.record = null;
            TheEditor.refreshDecl();
        }
    }
}
