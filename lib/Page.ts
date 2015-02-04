///<reference path='refs.ts'/>
module TDev { export module RT {
    //? A page on a wall
    //@ ctx(general,gckey)
    export class Page
        extends RTValue
    {
        // we currently cannot serialize this guy properly
        constructor() {
            super()
        }

        public page:WallPage;

        static mk(p:WallPage)
        {
            if (!p) return undefined;
            var r = new Page();
            r.page = p;
            return r;
        }

        //? Sets a handler that runs when the page is popped.
        //@ ignoreReturnValue
        public on_navigated_from(handler: Action): EventBinding {
            return this.page.onNavigatedFrom.addHandler(handler);
        }

        //? Gets a value indicating if the page is equal to the other
        public equals(other:Page) : boolean { return this.page === other.page; }

        //? Does nothing.
        //@ hidden
        public post_to_wall() : void
        {
            // Do nothing by design.
            //
            // Cf.
            // Microsoft.TouchDevelop.Language.DataReprs.PageRepr#PostToWall(Interpreter)
            // in Microsoft.TouchDevelop.Language\DataReprs\PageRepr.cs
        }
    }
} }
