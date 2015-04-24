///<reference path='refs.ts'/>

module TDev
{
    export class CalcButton
    {
        public _theButton:HTMLButtonElement = <HTMLButtonElement>document.createElement("button");
        private _help = div("calcButtonHelp", "");
        private _inner:HTMLElement;
        private _innerText:string;
        private _cb: (s: string) => void;
        private _tick: Ticks;
        public intelliItem:IntelliItem;

        constructor() {
            this.init();
        }

        private init()
        {
            this._theButton.className = "calcButton";
            this._theButton.setChildren([this._inner, this._help]);
            Util.clickHandler(this._theButton, () => this.onClick());
        }

        // these 3 methods feature the calculator, they should be overriden to provide calculator-free behavior
        public getDefaultWidth(): number {
            return Calculator.buttonWidth;
        }

        public getDefaultHeight(): number {
            return Calculator.buttonHeight;
        }

        public sanityCheck(): boolean {
            return !!TheEditor.calculator.expr;
        }

        public getButton():HTMLButtonElement
        {
            this._theButton.style.backgroundImage = ''; // clear any image
            this._theButton.setChildren([this._inner, this._help]);
            this.setSize(this.getDefaultWidth(), this.getDefaultHeight());
            // for some reason this is required by iPad - the event handlers seem to be unhooked by this
            Util.clickHandler(this._theButton, () => this.onClick());
            return this._theButton;
        }

        public getText() { return this._innerText }

        private onClick()
        {
            if (!this.sanityCheck())
                return;
            if (this._tick) tick(this._tick);
            TDev.Browser.EditorSoundManager.intellibuttonClick();
            if(!!this._cb) this._cb(this._innerText);
        }

        private setHelp(s:string)
        {
            this._help.setChildren([document.createTextNode(s)]);
        }

        public setBackgroundImage(url: string) {
            if (!Browser.lowMemory) {
                this._theButton.style.backgroundImage = HTML.cssImage(url.replace(Cloud.config.cdnUrl + "/pub/", Cloud.config.cdnUrl + "/thumb/"));
                this._theButton.style.backgroundSize = 'cover';
            }
        }

        private setCallback(t:Ticks, f:(s:string)=>void)
        {
            this._cb = f;
            this._theButton.id = "btn-" + Ticker.tickName(t);
            this._tick = t;
        }

        public setImage(url:string, h:string, t:Ticks, f:(s:string)=>void)
        {
            this.intelliItem = null;
            this.setCallback(t, f);
            this.setHelp(h);
            this._innerText = null;
            this._inner = HTML.mkImg(url);
            this._theButton.className = "calcButton";
            this.getButton();
        }

        public clear() {
            this.setText("", "", null);
            HTML.setRole(this._theButton, "presentation");
        }

        public clearIntelli()
        {
            this.clear();
            this.setIntelli();
            this.setCallback(Ticks.noEvent, this._cb)
        }

        public setIntelli()
        {
            this._theButton.className = "calcButton calcIntelliButton"
        }

        public setHtml(s:HTMLElement, h:string, f:(s:string)=>void)
        {
            this.intelliItem = null;
            this.setHelp(h);
            this._innerText = "";
            this._inner = s;
            HTML.setRole(this._theButton, "");
            this.getButton();
            this.setCallback(Ticks.noEvent, f)
        }

        public setText(s:string, h:string, f:(s:string)=>void, sz:string = null)
        {
            return this.setTextEx(s, h, Ticks.noEvent, f, sz)
        }

        public setTextEx(s:string, h:string, t:Ticks, f:(s:string)=>void, sz:string = null)
        {
            this.intelliItem = null;
            this.setCallback(t, f);
            this.setHelp(h);
            this._innerText = s;
            this._inner = div("calcOp", s);
            if (!sz) sz = "1.2em";
            this._inner.style.fontSize = sz;
            this._theButton.className = "calcButton";
            HTML.setRole(this._theButton, "");
            this.getButton();
        }

        public setSize(w:number, h:number)
        {
           this._theButton.style.width = w + "px";
           this._theButton.style.height = h + "px";
        }

        private style() { return this._theButton.style; }
    }
}


