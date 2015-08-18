///<reference path='refs.ts'/>

module TDev
{
    export class RecordDefProperties
        extends CodeView
        implements KindBoxModel
    {
        private theRecord:AST.RecordDef;
        constructor() {
            super()
            this.recordnamediv = div("varHalf",
                                    div("formHint", lf("record name:")),
                                    this.recordName);
            this.kindContainer = VariableProperties.mkKindContainer(this);
            this.recordName.addEventListener("change", () => this.nameUpdated())
        }

        private recordName = HTML.mkTextInputWithOk("text", lf("Enter a name"));
        private recordnamediv:HTMLElement;
        private formRoot = div("varProps");
        private recordType = div(null);
        private kindContainer:HTMLElement;
        private fields = div(null);
        private renderer = new TDev.EditorRenderer();
        private mkKey = div("inline-block");
        private mkVal = div("inline-block");
        private mkAct = div("inline-block");
        private exported: HTMLElement;
        public getTick() { return Ticks.viewRecordInit; }

        public nodeType() { return "recordDef"; }

        public init(e:Editor)
        {
            super.init(e);
            this.recordName.id = "renameBox2";
            this.exported = HTML.mkTickCheckBox(
                Ticks.recordExported,
                lf("exported from this library"),
                (checked: boolean) => {
                    this.theRecord._isExported = checked;
                }
            );
        }

        private isActive() { return !!this.theRecord; }

        public kindBoxHeader() { return lf("decorator target"); }

        public editedStmt():AST.Stmt { return this.theRecord ? this.theRecord.values : null; }

        public syncAll(tc:boolean, origtype:AST.RecordType = undefined)
        {
            this.theRecord.fixupFields(origtype);
            this.recordName.value = this.theRecord.getCoreName();

            if (tc) {
                AST.TypeChecker.tcApp(Script);
                TheEditor.queueNavRefresh();
            }

            if (this.theRecord.recordType === AST.RecordType.Decorator)
                this.recordnamediv.setChildren([div("varHalf", [div("formHint", lf("target kind:")), this.kindContainer])]);
            else
                this.recordnamediv.setChildren(<any[]>[div("formHint", lf("record name:")), this.recordName]);

            this.mkKey.setChildren([this.mkField(true)]);
            this.mkVal.setChildren([this.mkField(false)]);
            this.mkAct.setChildren([this.mkAction()]);
            this.recordType.setChildren([
                    this.mkTypeBox(
                        this.theRecord.recordType,
                        this.theRecord.getRecordPersistence()
                    )
            ]);

            HTML.setCheckboxValue(this.exported, this.theRecord.isExported());

            (<any>this.kindContainer).refresh();

            this.fields.setChildren([this.renderer.declDiv(this.theRecord)]);
            this.renderer.attachHandlers();

            var rt = this.theRecord.recordType;

            this.exported.style.display = rt == AST.RecordType.Object && Script.isLibrary ? "block" : "none";

            this.theRecord.notifyChange(); // just in case

            if (tc)
                TheEditor.updateTutorial()
        }

        private mkAction() {
            if (this.theRecord.recordType != AST.RecordType.Object) return null;

            var b = HTML.mkButtonTick(lf("add function"), Ticks.recordAddAction,() => {
                this.commit();
                // create fresh action
                var decl = this.editor.freshAsyncAction();
                this.editor.addNode(decl);
                // add this parameter
                var header = decl.header;
                var blk = header.inParameters;
                var empt = blk.emptyStmt("this", this.theRecord.entryKind);
                this.editor.initIds(empt, true)
                var newCh = blk.stmts.concat([empt]);
                blk.setChildren(newCh);

                decl.notifyChange();                
                this.editor.typeCheckNow();
                this.editor.refreshDecl();
                this.editor.queueNavRefresh();
            });
            return b;
        }

        private mkField(key:boolean)
        {
            var terminology = (key ? this.theRecord.getKeyTerminology() : this.theRecord.getValueTerminology());
            if (!terminology) return null;

            var b = HTML.mkButtonTick(lf("add {0}", terminology), key ? Ticks.recordAddKey : Ticks.recordAddValue, () => {
                this.commit();
                var blk = key ? this.theRecord.keys : this.theRecord.values;
                var stmt = blk.emptyStmt()
                if (!stmt) {
                    var x = this.theRecord.cloudEnabled ? lf("replicated tables") : this.theRecord.persistent ? lf("persistent tables") : lf("tables");
                    TDev.ModalDialog.info(lf("No can do"),
                      lf("Links have to lead to other {0}. You don't have any other {0} defined at the moment.", x));
                    return;
                }
                var newCh = blk.stmts.concat([stmt]);
                blk.setChildren(newCh);
                this.syncAll(true);

                // Jump directly into the field definition and edit its name.
                TheEditor.editNode(stmt);
                TheEditor.calculator.inlineEdit(TheEditor.calculator.expr.tokens[0]);
            });
            return b;
        }

        public mkTypeBox(rt:AST.RecordType, cloud?:AST.RecordPersistence)
        {
            var pers = (cloud !== undefined && (rt == AST.RecordType.Index || rt == AST.RecordType.Table)) ? AST.RecordDef.recordPersistenceToString(cloud, Script.isCloud) + " " : "";
            var e = new DeclEntry(pers + AST.RecordDef.recordTypeToString(rt).toLowerCase());
            e.icon = DeclRender.colorByPersistence(AST.RecordDef.GetIcon(rt), cloud !== undefined ? cloud : AST.RecordPersistence.Temporary);
            e.description = RecordDefProperties.GetDescription(rt, cloud, Script.isCloud);
            var d = e.mkBox();
            d.className += " recordTypeDescription";
            return d;
        }

        static GetPersistenceDescription(thing: string, pers: AST.RecordPersistence, service: boolean): string {
            if (!service) {
                if (pers == AST.RecordPersistence.Temporary)
                    return lf("A temporary {0} is not saved between runs.", thing);
                else if (pers == AST.RecordPersistence.Local)
                    return lf("A local {0} is automatically saved to local storage, but never shared with other devices.", thing);
                else if (pers == AST.RecordPersistence.Cloud)
                    return lf("A replicated {0} is automatically saved in the cloud and shared between devices.", thing);
                else
                    return "";
            } else {
                if (pers == AST.RecordPersistence.Temporary)
                    return lf("A temporary {0} is local to the connection, and discarded when the connection ends.", thing);
                else if (pers == AST.RecordPersistence.Local)
                    return lf("A server-local {0} is saved in cloud storage, and never cached on clients.", thing);
                else if (pers == AST.RecordPersistence.Cloud)
                    return lf("A fully replicated {0} is saved in cloud storage, and fully cached on clients.", thing);
                else if (pers == AST.RecordPersistence.Partial)
                    return lf("A partially replicated {0} is saved in cloud storage, and fully cached on clients.", thing);
                else
                    return "";
            }
        }


        static GetDescription(rt: AST.RecordType, pers:AST.RecordPersistence, service:boolean): string {
            switch (rt) {
                case AST.RecordType.Object:
                    return "Objects store data values in fields. \nYou can create new objects at any time. \nObjects are automatically disposed of if you don't store them anywhere. \nObjects can be stored in data variables, in records, or in object collections.";
                case AST.RecordType.Table:
                    var desc = "A table stores records as rows, with data values appearing in columns. \n";
                    if (pers !== undefined)
                        return desc + RecordDefProperties.GetPersistenceDescription("table", pers, service);
                    else
                        return desc + "You can add new rows, and you can iterate over rows. \n" +
                                      "Rows remain in the table until you delete them, or until you delete a linked row. \n";
                case AST.RecordType.Decorator:
                    return "A decorator attaches extra fields to target objects.";
                case AST.RecordType.Index:
                    var desc = "An index stores records that are indexed by key fields. \n";
                    if (pers !== undefined)
                        return desc + RecordDefProperties.GetPersistenceDescription("index", pers, service);
                    else
                        return desc + "There is always exactly one index entry for each key combination. \n" +
                        "You need not create entries before using them. \nTo remove an entry, clear all of its fields. \n";
                default: Util.die();
            }
        }


        // kind container methods

        public getContexts():KindContext
        {
            return KindContext.GcKey;
        }
        public getKind() {
            var theKey = <AST.RecordField> this.theRecord.keys.stmts[0];
            return (theKey) ? theKey.dataKind : api.getKind("Sprite");
        }
        public immutableReason():string { return null; }
        public setKind(k:Kind)
        {
            var theKey = new AST.RecordField("target", k, true);
            this.theRecord.keys.setChildren([theKey]);
            this.syncAll(true);
        }

        public nodeTap(s:AST.Stmt)
        {
            if (s instanceof AST.RecordField) {
                // Clear the error message because we don't re-render the record
                // at this stage...
                var recordFieldStmt = s.renderedAs.parentNode.parentNode;
                var node = (<HTMLElement>recordFieldStmt).getElementsByClassName("errorMessage")[0];
                if (node)
                    node.parentNode.removeChild(node);
                // ... then let the calculator do its job.
                return false;
            }
            // Clicking on the [RecordKind] shows up the [RecordEditor], this is
            // handled by editor's [nodeTap].  All other cases handled by the
            // calculator.
            return false;
        }

        public renderCore(a:AST.Decl) { return this.load(<AST.RecordDef>a); }

        static cloudstatePersistenceLabels = [{
                name: "temporary",
                tick: Ticks.recordPersTemporary
            }, {
                name: "local",
                tick: Ticks.recordPersLocal
            }, {
                name: "replicated",
                tick: Ticks.recordPersCloud
            }];

        static servicePersistenceLabels = [{
            name: "temporary",
            tick: Ticks.recordPersTemporary
            }, {
                name: "server-local",
                tick: Ticks.recordPersLocal
            }];

        static cloudlibraryPersistenceLabels  = [{
            name: "temporary",
            tick: Ticks.recordPersTemporary
            }, {
                name: "server-local",
                tick: Ticks.recordPersLocal
            }, {
                name: "fully replicated",
                tick: Ticks.recordPersCloud
            }, {
                name: "partially replicated",
                tick: Ticks.recordPersPartial
            }];
        static cloudlibraryVarPersistenceLabels = [{
            name: "temporary",
            tick: Ticks.recordPersTemporary
        }, {
            name: "server-local",
                tick: Ticks.recordPersLocal
            }, {
                name: "replicated",
                tick: Ticks.recordPersCloud
            }];


        private load(a:AST.RecordDef) :void
        {
            this.theRecord = null;
            TheEditor.dismissSidePane();
            this.theRecord = a;

            this.formRoot.className += " recordProperties";


            this.formRoot.setChildren([
                                  Editor.mkHelpLink("records"),
                                  this.exported,
                                  this.fields,
                                  this.mkKey,
                                  this.mkVal,
                                  this.mkAct,
                                  ]);

            this.editor.displayLeft([this.formRoot]);
            this.syncAll(false);
        }

        private nameUpdated()
        {
            if (this.theRecord.getCoreName() != this.recordName.value) {
                this.theRecord.setName(Script.freshName(this.recordName.value));
                this.syncAll(true)
            }
        }

        public commit()
        {
            if (!this.theRecord || !Script) return;

            if (this.theRecord.getCoreName() != this.recordName.value)
                this.theRecord.setName(Script.freshName(this.recordName.value));
            this.theRecord._isExported = HTML.getCheckboxValue(this.exported);
            Script.notifyChangeAll();
            TheEditor.queueNavRefresh();
        }
    }
}
