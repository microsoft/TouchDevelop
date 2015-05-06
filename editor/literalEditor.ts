///<reference path='refs.ts'/>

module TDev
{
    export class LiteralEditor {       
        public constructor(public calculator : Calculator, public literal: AST.Literal) { }

        public editor(): HTMLElement { return Util.abstract(); }
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

        public editor(): HTMLElement { return this.res.div; }
        public value(): string {
            return this.res.textarea.value;
        }
    }

    export class BitMatrixLiteralEditor extends LiteralEditor {
        private root: HTMLElement;
        private table: HTMLTableElement;
        private plusBtn: HTMLElement;
        private minusBtn: HTMLElement;
        private rows: number;
        private frames: number;
        private bitCells: HTMLElement[];
        private dialog: ModalDialog;

        constructor(public calculator: Calculator, public literal: AST.Literal) {
            super(calculator, literal);

            this.table = document.createElement('table');
            this.table.className = 'bitmatrix';
            this.table.withClick(() => { });
            this.plusBtn = HTML.mkRoundButton("svg:add,black", "add frame", Ticks.noEvent,() => {
                var v = this.serialize(this.frames + 1);
                this.updateTable(v);
            });
            this.minusBtn = HTML.mkRoundButton("svg:minus,black", "remove frame", Ticks.noEvent,() => {
                if (this.frames > 1) {
                    var v = this.serialize(this.frames - 1);
                    this.updateTable(v);
                }
            });
            this.root = div('bitmatrix', this.table, div('btns', this.plusBtn, this.minusBtn));
            
            this.updateTable(literal.data);
        }

        private updateTable(data: string) {
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
            function col(parent: HTMLElement) {
                var d = document.createElement('col');
                parent.appendChild(d);
                return d;
            }

            data = (data || "").trim();
            var bits = data.split(/[\s\r\n]+/).map(s => parseInt(s));
            if (bits.length <= 1) {
                this.rows = 5;
                this.frames = 1;
            } else {
                this.rows = data.split('\n').length;
                this.frames = Math.floor(bits.length / (this.rows * this.rows));
            }

            this.plusBtn.style.display = this.frames < 5 ? 'block' : 'none';
            this.minusBtn.style.display = this.frames > 1 ? 'block' : 'none';

            this.bitCells = [];
            this.table.innerHTML = ""; // clear table and rebuild
            var hrow = tr(this.table, 'bitheader');
            td(hrow, '');
            for (var j = 0; j < this.frames * this.rows; ++j) {
                if (j > 0 && j % this.rows == 0) td(hrow, 'sep');
                td(hrow, 'index').innerText = j.toString();
            }

            // bit matrix
            Util.range(0, this.rows).forEach(i => {
                var row = tr(this.table, 'bitrow');
                td(row, 'index').innerText = i.toString();
                Util.range(0, this.frames * this.rows).forEach(j => {
                    if (j > 0 && j % this.rows == 0) td(row, 'sep');
                    var cell = td(row, 'bit');
                    cell.title = "(" + i + ", " + j + ")";
                    var k = i * this.frames * this.rows + j;
                    this.bitCells[k] = cell;
                    cell.setFlag('on', !!bits[k]);
                    cell.withClick(() => {
                        cell.setFlag('on', !cell.getFlag('on'));
                    });
                    cell.appendChild(div(''));
                });
            });

            if (!this.dialog && (this.frames > 1 ||  SizeMgr.splitScreen || SizeMgr.phoneMode)) {
                this.dialog = new ModalDialog();
                this.dialog.add(this.root);
                this.dialog.fullWhite();
                this.dialog.stretchWide();
                this.dialog.setScroll();
                this.dialog.onDismiss = () => this.calculator.checkNextDisplay();
                this.dialog.show();
            }
        }

        public editor(): HTMLElement {
            return this.dialog ? div('') : this.root;
        }

        private serialize(f: number): string {
            var r = "";
            for (var i = 0; i < this.rows; ++i) {
                if (i > 0) r += "\n";
                for (var j = 0; j < f * this.rows; ++j) {
                    if (j > 0) r += " ";
                    var k = i * this.rows * this.frames + j;
                    var s = j < this.rows * this.frames ? this.bitCells[k].getFlag("on") ? "1" : "0" : "0";
                    r += s;
                }
            }
            return r;
        }

        public value(): string {
            return this.serialize(this.frames);
        }
    }
}


