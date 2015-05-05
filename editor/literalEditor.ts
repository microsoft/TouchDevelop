///<reference path='refs.ts'/>

module TDev
{
    export class LiteralEditor {       
        public constructor(public calculator : Calculator, public literal: AST.Literal) { }

        public element(): HTMLElement { return Util.abstract(); }
        public value(): string { return Util.abstract();}
    }

    export class TextLiteralEditor extends LiteralEditor {
        private res: HTML.AutoExpandingTextArea;
        constructor(public calculator: Calculator, public literal: AST.Literal) {
            super(calculator, literal);

            var opts: HTML.AutoExpandingTextAreaOptions = { showDismiss: true };
            if (Browser.isDesktop && TheEditor.widgetEnabled("stringEditFullScreen"))
                opts.editFullScreenAsync = (t) => EditorHost.editFullScreenAsync(
                    literal.languageHint ? 'inline.' + literal.languageHint : '', t);
            this.res = HTML.mkAutoExpandingTextArea(opts)
            this.res.div.className += " calcStringEdit";
            this.res.textarea.value = literal.data;
            this.res.div.id = "stringEdit";

            this.res.dismiss.id = "inlineEditCloseBtn";
            this.res.onDismiss = () => this.calculator.checkNextDisplay();

            (<any>this.res.div).focusEditor = () => {
                this.res.update();
                Util.setKeyboardFocusTextArea(this.res.textarea);
            };

            this.res.onUpdate = () => {
                TheEditor.selector.positionButtonRows();
            };
        }

        public element(): HTMLElement { return this.res.div; }
        public value(): string {
            return this.res.textarea.value;
        }
    }
}


