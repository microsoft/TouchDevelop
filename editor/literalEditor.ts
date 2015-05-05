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

    export class BitMatrixLiteralEditor extends LiteralEditor {
        public editor: HTMLElement;
        private rows: number;
        private columns: number;
        private bitCells: HTMLElement[];

        constructor(public calculator: Calculator, public literal: AST.Literal) {
            super(calculator, literal);

            function tr(parent: HTMLElement, cl: string) {
                var d = document.createElement('tr');
                d.className = cl;
                parent.appendChild(d);
                return d;
            }
            function td(parent: HTMLElement, cl: string) {
                var d = document.createElement('td');
                d.className = cl;
                parent.appendChild(d);
                return d;
            }

            this.editor = document.createElement('table'); this.editor.className = 'bitmatrix';
            this.bitCells = [];
            this.rows = 5;
            this.columns = 5;
            // add coordinates row
            var hrow = tr(this.editor, 'bitheader');
            td(hrow, '');
            for (var j = 0; j < this.columns; ++j) td(hrow, '').innerText = j.toString();

            // bit matrix
            var bits = (literal.data || "").trim().split(/[\s\r\n]+/).map(s => parseInt(s));   
            Util.range(0, this.rows).forEach(i => {
                var row = tr(this.editor, 'bitrow');
                td(row, '').innerText = i.toString();
                Util.range(0, this.columns).forEach(j => {
                    var cell = td(row, 'bit');
                    var k = i * this.columns + j;
                    this.bitCells[k] = cell;
                    cell.setFlag('on', !!bits[k]);
                    cell.withClick(() => {
                        cell.setFlag('on', !cell.getFlag('on'));
                    });
                });
            });
        }

        public element(): HTMLElement {
            return this.editor;
        }

        public value(): string {
            return this.bitCells.map((cell, index) => {
                var s = cell.getFlag("on") ? "1" : "0";
                if (index > 0 && index % this.columns == 0) s += '\n';
                return s;
            }).join(' ');
        }
    }
}


