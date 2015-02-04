///<reference path='refs.ts'/>
module TDev.RT {
    //? A page button on the wall
    //@ ctx(general,gckey,walltap)
    export class PageButton
        extends RTValue
        implements IPageButton
    {
        constructor() {
            super()
        }

        private _icon :string;
        private _text :string;
        private _page :Page;
        private _element:HTMLElement;

        static mk(icon : string, text : string, page : Page)
        {
            var pb = new PageButton();
            pb._icon = icon;
            pb._text = text;
            pb._page = page;
            return pb;
        }

        //? Gets the page hosting this button
        public page() : Page { return this._page; }

        //? Gets a value indicating if both instances are equal
        public equals(page_button:PageButton) : boolean { return this === page_button; }

        //? Pushes this button on the wall
        public post_to_wall(s:IStackFrame) : void
        {
            // Does nothing by design.
        }

        //? Gets the icon name
        //@ readsMutable
        public icon() : string { return this._icon; }

        //? Gets the text
        //@ readsMutable
        public text() : string { return this._text; }

        public getElement() : HTMLElement {
            if (!this._element) {
                this._element = HTML.mkButtonElt("topMenu-button", [
                    div("topMenu-button-frame", PageButtonManager.getIconElement(this._icon)),
                    div("topMenu-button-desc", this._text)
                ]);
                this._element.style.display = 'inline-block';
            }
            return this._element;
        }
    }
}
