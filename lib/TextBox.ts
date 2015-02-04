///<reference path='refs.ts'/>
module TDev.RT {
    //? A text box
    //@ stem("tb") ctx(general,gckey,walltap)
    export class TextBox
        extends RTValue
    {
        public _text : string = undefined;
        private _icon : Picture = undefined;
        private _font_size : number = undefined;
        private _background : Color = undefined;
        private _foreground : Color = undefined;
        private _border: Color = undefined;
        private _el: HTMLElement;
        private box: BoxBase;

        static mk(text : string, font_size : number) : TextBox
        {
            var tb = new TextBox();
            tb._text = text;
            tb._font_size = font_size;
            return tb;
        }

        //? Gets the text
        //@ readsMutable
        public text() : string { return this._text; }

        //? Sets the text
        //@ writesMutable
        public set_text(text: string, s:IStackFrame): void { this._text = text; this.updateOnWall(s, this.box); }

        //? Gets the icon picture (max 173x173)
        //@ readsMutable
        public icon() : Picture { return this._icon; }

        //? Sets the icon picture (max 96 x 96)
        //@ writesMutable
        //@ embedsLink("TextBox", "Picture")
        public set_icon(pic: Picture, s: IStackFrame): void { this._icon = pic; this.updateOnWall(s, this.box); }

        //? Gets the font size
        //@ readsMutable
        public font_size() : number { return this._font_size; }

        //? Sets the font size (small = 14, normal = 15, medium = 17, medium large = 19, large = 24, extra large = 32, extra extra large = 54, huge = 140
        //@ writesMutable
        //@ [size].defl(19)
        public set_font_size(size: number, s: IStackFrame): void { this._font_size = size; this.updateOnWall(s, this.box); }

        //? Gets the background color
        //@ readsMutable
        public background() : Color { return this._background; }

        //? Sets the background color
        //@ writesMutable
        //@ [color].deflExpr('colors->background')
        public set_background(color: Color, s: IStackFrame): void { this._background = color; this.updateOnWall(s, this.box); }

        //? Gets the foreground color
        //@ readsMutable
        public foreground() : Color { return this._foreground; }

        //? Sets the foreground color
        //@ writesMutable
        //@ [color].deflExpr('colors->foreground')
        public set_foreground(color: Color, s: IStackFrame): void { this._foreground = color; this.updateOnWall(s, this.box); }

        //? Gets the border color
        //@ readsMutable
        public border() : Color { return this._border; }

        //? Sets the border color
        //@ writesMutable
        //@ [color].deflExpr('colors->foreground')
        public set_border(color: Color, s: IStackFrame): void { this._border = color; this.updateOnWall(s, this.box); }

        public getViewCore(s: IStackFrame, b:BoxBase): HTMLElement
        {
            this._el = div('wall-text');
            this.box = b;
            this.updateOnWall(s, b);
            return this._el;
        }


        private updateOnWall(s:IStackFrame, b:BoxBase) {
            var el = this._el;
            if (!el) return;

            el.setChildren([]);
            var style = el.style;
            style.margin = '0.5em';
            if (this._background) {
                style.backgroundColor = this._background.toHtml();
            }
            else {
                style.backgroundColor = '#F0F0F0';
            }
            if (this._foreground) {
                style.color = this._foreground.toHtml();
            } else {
                style.color = null;
            }
            if (this._border) {
                style.border = "3px solid " + this._border.toHtml();
            } else {
                style.border = null;
            }

            if (this._icon) {
                var pel = div('', this._icon.getViewCore(s, b));
                pel.style.display = 'inline';
                pel.style.margin = '8px 8px 8px 8px';
                el.appendChild(pel);
            }

            var txt = div('', this._text);
            txt.style.display = 'inline';
            txt.style.margin = '8px 8px 8px 8px';
            txt.style.verticalAlign = 'top';
            if (this._font_size) {
                txt.style.fontSize = (this._font_size / 20.0 * 0.8).toFixed(1) + "em";
            }
            el.appendChild(txt);

            b.RefreshOnScreen();
        }

        //? Posts the textbox to the wall
        //@ readsMutable
        public post_to_wall(s:IStackFrame) : void { super.post_to_wall(s) }
    }
}
