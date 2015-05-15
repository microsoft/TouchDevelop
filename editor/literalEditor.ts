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
            this.res.onDismiss = () => {
                this.dismissed();
                this.calculator.checkNextDisplay();
            }

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
        public dismissed() { }
    }

    export class BitMatrixLiteralEditor extends LiteralEditor {
        private root: HTMLElement;
        private table: HTMLElement;
        private plusBtn: HTMLElement;
        private minusBtn: HTMLElement;
        private rows: number;
        private frames: number;
        private bitCells: HTMLElement[];
        private animTable: HTMLTableElement;
        private animToken: number;
        private animCells: HTMLElement[];
        private dialog: ModalDialog;

        constructor(public calculator: Calculator, public literal: AST.Literal) {
            super(calculator, literal);

            this.plusBtn = HTML.mkRoundButton("svg:add,black", lf("add frame"), Ticks.noEvent,() => {
                var v = this.serialize(this.frames + 1);
                this.updateTable(v);
            });
            this.minusBtn = HTML.mkRoundButton("svg:minus,black", lf("remove frame"), Ticks.noEvent,() => {
                if (this.frames > 1) {
                    var v = this.serialize(this.frames - 1);
                    this.updateTable(v);
                }
            });
            this.table = div('bitmatrices');
            this.animTable = <HTMLTableElement>document.createElement("table");
            this.animTable.className = 'bitmatrix bitpreview';
            this.animCells = [];
            Util.range(0, 5).forEach(i => {
                var row = HTML.tr(this.animTable, 'bitrow');
                HTML.td(row, 'index');
                for (var j = 0; j < 5; ++j) {
                    this.animCells[i * 5 + j] = HTML.td(row, 'bit');
                    this.animCells[i * 5 + j].appendChild(div(''));
                }
            });
            this.root = div('bitmatrix', div('btns', this.animTable, this.plusBtn, this.minusBtn), this.table);
            
            this.updateTable(literal.data);
        }

        public dismissed() {
            if (this.animToken) clearInterval(this.animToken);
        }

        private updateTable(data: string) {

            data = (data || "").trim();
            var bits = data.split(/[\s\r\n]+/).map(s => parseInt(s));
            if (bits.length <= 1) {
                this.rows = 5;
                this.frames = 1;
            } else {
                this.rows = data.split('\n').length;
                this.frames = Math.floor(bits.length / (this.rows * this.rows));
            }

            this.bitCells = [];
            if (this.animToken) clearInterval(this.animToken);
            this.table.setChildren(Util.range(0, this.frames).map(frame => {
                var table = document.createElement('table');
                table.className = 'bitmatrix';
                table.style.width = SizeMgr.phoneMode ? '16em' : SizeMgr.portraitMode ? '13em' : '15em';
                table.withClick(() => { });

                var hrow = HTML.tr(table, 'bitheader');
                HTML.td(hrow, '');
                for (var j = 0; j < this.rows; ++j) {
                    HTML.td(hrow, 'index').innerText = j.toString();
                }

                // bit matrix
                Util.range(0, this.rows).forEach(i => {
                    var row = HTML.tr(table, 'bitrow');
                    HTML.td(row, 'index').innerText = i.toString();
                    Util.range(frame * this.rows, this.rows).forEach(j => {
                        var cell = HTML.td(row, 'bit');
                        cell.title = "(" + j + ", " + i + ")";
                        var k = i * this.frames * this.rows + j;
                        this.bitCells[k] = cell;
                        cell.setFlag('on', !!bits[k]);
                        cell.withClick(() => {
                            cell.setFlag('on', !cell.getFlag('on'));
                        });
                        cell.appendChild(div(''));
                    });
                });

                return table;
            }));

            this.animate();

            if (!this.dialog) {
                this.dialog = new ModalDialog();
                this.dialog.add(this.root);
                this.dialog.fullWhite();
                this.dialog.stretchWide();
                this.dialog.setScroll();
                this.dialog.onDismiss = () => this.calculator.checkNextDisplay();
                this.dialog.show();
            }
        }

        private animate() {
            var af = 0;
            this.animToken = window.setInterval(() => {
                for (var i = 0; i < 5; ++i) {
                    for (var j = 0; j < 5; ++j)
                        this.animCells[i * 5 + j].setFlag('on', this.bitCells[i * this.frames * this.rows + af * this.rows + j].getFlag('on'));
                }
                af = (af + 1) % this.frames;
            }, 400);
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


