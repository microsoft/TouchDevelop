///<reference path='refs.ts'/>

module TDev
{
    export class NumberCharm {
        
        private initialNumberString: string;
        private currentNumber: number;
        private log10: number;
        
        private initialTokens: AST.Token[] = null;
        private lastTokens: AST.Token[] = null;

        public getInitialTokens(): AST.Token[] 
        {
            return this.initialTokens === null ? null : this.initialTokens.slice(0);
        }
        public getLastTokens(): AST.Token[]
        {
            return this.lastTokens === null ? null : this.lastTokens.slice(0);
        }

        // Metrics
        public getWidth(): number { return 240; }
        public getHeight(): number { return 80; }
        private getCursorWidth(): number { return SizeMgr.topFontSize * 3 / 2; }
        private cursorBorderWidth = 4;

        // Callbacks
        public onUpdate = null;
        public onEntered = null;
        public onCancelled = null;

        // Event handler
        private timeoutHandler = null;

        public init(toks: AST.Token[]) {

            var numChars: string[] = [];
            for (var i = 0; i < toks.length; i ++)
                numChars.push((<AST.Operator>toks[i]).data);

            this.initialNumberString = numChars.join("");
            this.currentNumber = parseFloat(this.initialNumberString);

            this.log10 = this.currentNumber === 0 ?
                0 : Math.floor(Math.log(this.currentNumber) * Math.LOG10E);

            this.initialTokens = toks.slice(0);
        }

        private createScales(): HTMLElement[]
        {
            var scales: HTMLElement[] = [];

            var delta = Math.pow(10, this.log10);
            var min = this.currentNumber - delta, max = this.currentNumber + delta;

            var createScale = (value: string): HTMLElement => {
                var scaleValue = span("value", value);
                var scale = div("scale", [scaleValue, div("scaleLine")]);
                var v = parseFloat(value);
                var x = (((max - v) * 0 + (v - min) * 240) / (max - min));
                if (x < 20 || x > 220) scaleValue.style.display = "none";
                scale.style.left = x + "px";
                return scale;
            };

            // Create a scale which is the closest to the current center value.
            var rulerValue:string;
            if (this.log10 >= 0) {
                var p = Math.pow(10, this.log10);
                rulerValue = (Math.floor(this.currentNumber / p) * p).toString();
            } else {
                var s = this.currentNumber.toString();
                rulerValue = s.substr(0, s.indexOf(".") + 1 - this.log10);
            }
            scales.push(createScale(rulerValue));

            // Create scales which have smaller values than the current center.
            var decValue = rulerValue;
            while (true) {
                if (this.log10 >= 0) {
                    var p = Math.pow(10, this.log10);
                    decValue = (parseFloat(decValue) - p).toString();
                } else {
                    decValue = this.decrement(decValue);
                }
                if (parseFloat(decValue) < min) break;
                scales.push(createScale(decValue));
            }

            // Create scales which have larger values than the current center.
            var incValue = rulerValue;
            while (true) {
                if (this.log10 >= 0) {
                    var p = Math.pow(10, this.log10);
                    incValue = (parseFloat(incValue) + p).toString();
                } else {
                    incValue = this.increment(incValue);
                }
                if (parseFloat(incValue) > max) break;
                scales.push(createScale(incValue));
            }

            return scales;
        }

        public show(x: number, y: number) {

            var originalLeft = (this.getWidth()/2 - this.getCursorWidth()/2 - this.cursorBorderWidth) + "px";
            var originalTop = (this.getHeight() - this.getCursorWidth() - this.cursorBorderWidth*2 - 3) + "px";

            var innerCursor = div("");
            innerCursor.style.pixelWidth = this.getCursorWidth();
            innerCursor.style.pixelHeight = this.getCursorWidth();

            var cursor = div("cursor", innerCursor);
            cursor.style.left = originalLeft;
            cursor.style.top = originalTop;
            cursor.style.pixelWidth = this.getCursorWidth();
            cursor.style.pixelHeight = this.getCursorWidth();

            var scales = div("scales", this.createScales());

            var numberBox = div("numberBox charm", [div("ruler"), div("mainLine"), scales, cursor]);
            numberBox.style.left = x + "px";
            numberBox.style.top = y + "px";

            var diff = 0;

            // TSBUG - move inline and see what happens
            var ccb = (e:string, dx:number, dy:number) => {
                var pos = Util.offsetIn(cursor, numberBox);
                diff = pos.x + this.getCursorWidth()/2 - this.getWidth()/2;
                if (e === "move") {
                    if (this.timeoutHandler === null) {
                        this.timeoutHandler = () => {
                            if (this.timeoutHandler === null) {
                                return;
                            }
                            this.currentNumber += diff * Math.pow(10, this.log10) / this.getWidth();
                            scales.removeAllChildren();
                            scales.appendChildren(this.createScales());
                            this.update();
                            Util.setTimeout(50, this.timeoutHandler);
                        };
                        Util.setTimeout(10, this.timeoutHandler);
                    }
                } else if (e === "release") {
                    this.timeoutHandler = null;
                    cursor.style.left = originalLeft;
                    cursor.style.top = originalTop;
                }
            }

            new DragHandler(cursor, ccb);

            var m = new ModalDialog();
            m.opacity = 0;
            var cancelIt = false;
            m.onDismiss = () => {
                var a = TDev.TheEditor.currentAction();
                if (!cancelIt && !!a) {
                    if (this.onEntered !== null)
                        this.onEntered();
                } else {
                    if (this.onCancelled !== null)
                        this.onCancelled();
                }
                this.timeoutHandler = null;
            };
            m.showBare(numberBox);

            TheEditor.keyMgr.register("Esc", () => {
                cancelIt = true;
                m.dismiss();
                return true;
            });
            TheEditor.keyMgr.register("Enter", () => {
                m.dismiss();
                return true;
            });
        }
        
        private update() {
            var i = this.initialNumberString.indexOf(".");
            var numString: string;

            // Updating an integer value
            if (i < 0) {
                numString = Math.round(this.currentNumber).toString();
            }
            // Updating a float value
            else {
                numString = this.currentNumber.toString();
                var j = numString.indexOf(".");
                var lengthAfterDot = this.initialNumberString.length - i - 1;
                if (j + 1 + lengthAfterDot >= numString.length) {
                    numString +=
                        new Array(j + 1 + lengthAfterDot - numString.length).join('0');
                } else {
                    numString = numString.substr(0, j + 1 + lengthAfterDot);
                }
            }

            var toks: AST.Token[] = [];
            for (var i = 0; i < numString.length; i ++)
                toks.push(AST.mkOp(numString.charAt(i)));
            if (this.onUpdate !== null) {
                this.onUpdate(toks);
            }
            this.lastTokens = toks;
        }

        private delta(x: string, increment: boolean): string {
            var minus = x.charAt(i) === "-";
            if (parseFloat(x) == 0) {
                return (increment ? "" : "-")
                    + x.substring(minus ? 1 : 0, x.length - 1)
                    + "1";
            }
            for (var i = x.length - 1; i >= 0; i--) {
                var digit = x.charAt(i);
                if (digit != "-" && digit != ".") {
                    var d = parseInt(digit);
                    d = (increment === minus) ? d - 1 : d + 1;
                    var newDigit = (d < 0 ? 9 : (d >= 10 ? 0 : d)).toString();
                    x = x.substr(0, i) + newDigit + x.substr(i + 1);
                    if (d >= 0 && d < 10) break;
                }
            }
            return x;
        }

        private increment(x: string): string { return this.delta(x, true); }
        private decrement(x: string): string { return this.delta(x, false); }
    }
}
