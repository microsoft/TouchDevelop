///<reference path='refs.ts'/>

module TDev
{
    export class InlineActionEditor
        extends SideTab
    {
        private inl:AST.InlineAction;
        constructor() {
            super()
        }
        public getTick() { return Ticks.sideInlineActionInit; }

        public init(e:Editor)
        {
            super.init(e);
        }

        public edit(ss:AST.Stmt)
        {
            this.inl = null;

            if (ss instanceof AST.InlineAction)
                this.inl = <AST.InlineAction>ss;
            else Util.die();

            this.setChildren([ 
                          TheEditor.selector.deleteButton()
                          ]);
        }

        public commit()
        {
            this.inl.notifyChange();
        }

        public bye()
        {
            this.commit();
            TheEditor.refreshDecl();
        }
    }
}


