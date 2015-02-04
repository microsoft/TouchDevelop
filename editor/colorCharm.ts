///<reference path='refs.ts'/>

module TDev
{
    export class ColorCharm {

        // Preset color table
        private colorTable = {
            accent: "#3f3",
            /* subtle: "", */
            chrome: "#222",
            /* foreground: "", */
            /* background: "", */
            black: "#000000",
            blue: "#0000FF",
            brown: "#A52A2A",
            cyan: "#00FFFF",
            "dark gray": "#A9A9A9",
            gray: "#808080",
            green: "#008000",
            "light gray": "#D3D3D3",
            magenta: "#FF00FF",
            orange: "#FFA500",
            purple: "#800080",
            red: "#FF0000",
            pink: "#FFCBDB",
            /* transparent: "#00FFFFFF", */
            white: "#FFFFFF",
            yellow: "#FFFF00",
            sepia: "#704214"
        };

        // HTML elements
        private palettes:any;
        private colorBox: HTMLElement;
        private inp = HTML.mkTextInput("text", lf("color"));
        private colorPreviewBox = div("colorPreviewBox");
        private paletteSelector = div("paletteSelector");
        private hsbCursor = div("hsbCursor cursor");
        private hsbSquare = div("hsbSquare");
        private hueCursor = div("hueCursor cursor");
        private hueSlider = div("hueSlider");

        // Status
        private selectedPalette: string;
        private initialColor: string = null;
        private initialTokens: AST.Token[] = null;
        private hsb = { hue: 0, saturation: 255, value: 255 };
        private lastColor: string = null;
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
        public getWidth(): number { return 314; }
        private getCursorWidth(): number { return SizeMgr.topFontSize * 1.5; }
        private cursorBorderWidth = 4;

        // Callbacks
        public onUpdate = null;
        public onEntered = null;
        public onCancelled = null;

        // Look for the current value
        public init(toks: AST.Token[]) {

            if (toks.length <= 0
                    || toks[0].nodeType() !== "propertyRef")
                return;

            var params = { toks: toks, index: 2, value: NaN };
            var parseFloatTokens = (params:any) => {
                var s = "";
                for (var i = params.index; i < params.toks.length; i++) {
                    var ch = (<AST.Operator> params.toks[i]).data;
                    if (ch === "," || ch === ")") {
                        params.index = i;
                        params.value = parseFloat(s);
                        return;
                    }
                    s += ch;
                }
                params.value = NaN;
            };

            var numTokens = 0;
            var propertyName = (<AST.PropertyRef> toks[0]).data;
            switch (propertyName) {
                case "is light theme":
                    // Do nothing
                    break;
                case "from rgb":
                    parseFloatTokens(params);
                    var r = params.value;
                    params.index++;
                    parseFloatTokens(params);
                    var g = params.value;
                    params.index++;
                    parseFloatTokens(params);
                    var b = params.value;
                    this.initialColor = "#" + this.floatsToRgb(r, g, b);
                    numTokens = params.index + 1;
                    break;
                case "from argb":
                    parseFloatTokens(params);
                    var a = params.value;
                    params.index++;
                    parseFloatTokens(params);
                    var r = params.value;
                    params.index++;
                    parseFloatTokens(params);
                    var g = params.value;
                    params.index++;
                    parseFloatTokens(params);
                    var b = params.value;
                    this.initialColor = "#"
                        + this.fillZero((a * 255).toString(16), 2)
                        + this.floatsToRgb(r, g, b);
                    numTokens = params.index + 1;
                    break;
                case "from hsb":
                case "from ahsb":
                    // not implemented yet.
                    break;
                case "linear gradient":
                    break;
                case "rand":
                case "random":
                    numTokens = 1;
                    this.initialColor = "random";
                    break;
                default:
                    this.initialColor = propertyName;
                    numTokens = 1;
                    break;
            }

            if (numTokens === 0) {
                this.initialTokens = [];
            } else {
                this.initialTokens = toks.slice(0, numTokens);
            }
        }

        private initPresetPalette():HTMLElement {
            var tables:HTMLElement[] = [];
            for (var colorName in this.colorTable)
            {
                var presetColor = div("presetColor");
                var htmlColor = this.colorIntToHtml(this.parseColorCode(colorName));
                presetColor.style.color = htmlColor;
                presetColor.style.backgroundColor = htmlColor;
                presetColor.title = colorName;
                presetColor.withClick(e => {
                    var colorName = (<MouseEvent> e).srcElement.getAttribute("title");
                    this.update(colorName);
                });
                tables.push(presetColor);
            }
            return div("palette presetPalette", tables);
        }

        private initHsbPalette(): HTMLElement {
            var hsbBeforeDrag = { hue: 0, saturation: 255, value: 255 };

            var hsbTimeoutHandler = null;
            var handler = (e:string, dx:number, dy:number) => {
                if (e === "drag") {
                    var origPos = Util.offsetIn(this.hsbSquare, this.colorBox);
                    var pos = Util.offsetIn(this.hsbCursor, this.colorBox);
                    hsbBeforeDrag.saturation = pos.x - origPos.x + this.getCursorWidth()/2;
                    hsbBeforeDrag.value = pos.y - origPos.y + this.getCursorWidth()/2;
                } else if (e === "move") {
                    this.hsb.saturation = hsbBeforeDrag.saturation + dx;
                    this.hsb.value = 255 - (hsbBeforeDrag.value + dy);
                    hsbTimeoutHandler = () => {
                        if (hsbTimeoutHandler === null) {
                            return;
                        }
                        this.updateOnHsbInput();
                        Util.setTimeout(50, hsbTimeoutHandler);
                    }
                    Util.setTimeout(10, hsbTimeoutHandler);
                } else {
                    hsbTimeoutHandler = null;
                }
            };
            new DragHandler(this.hsbCursor, handler);

            var hueTimeoutHandler = null;
            var handler = (e:string, dx:number, dy:number) => {
                if (e === "drag") {
                    var origPos = Util.offsetIn(this.hueSlider, this.colorBox);
                    var pos = Util.offsetIn(this.hueCursor, this.colorBox);
                    hsbBeforeDrag.hue = pos.y - origPos.y + this.getCursorWidth()/2;
                } else if (e === "move") {
                    this.hsb.hue = hsbBeforeDrag.hue + dy;
                                    this.updateOnHsbInput();
                    hueTimeoutHandler = () => {
                        if (hueTimeoutHandler === null) {
                            return;
                        }
                        this.updateOnHsbInput();
                        Util.setTimeout(50, hueTimeoutHandler);
                    }
                    Util.setTimeout(10, hueTimeoutHandler);
                } else {
                    hueTimeoutHandler = null;
                }
            }
            new DragHandler(this.hueCursor, handler);

            this.hsbCursor.style.pixelWidth = this.getCursorWidth();
            this.hsbCursor.style.pixelHeight = this.getCursorWidth();
            this.hueCursor.style.pixelHeight = this.getCursorWidth();

            return div(
                "palette hsbPalette",
                [this.hsbCursor, this.hsbSquare, this.hueCursor, this.hueSlider]);
        }

        public show(x: number, y: number) {

            // Construct an input box
            var colorInputBox = div("colorInputBox", <any[]>[this.colorPreviewBox, this.inp]);
            var updateOnTextInput_ = () => this.updateOnTextInput();
            this.inp.onkeyup = updateOnTextInput_;
            this.inp.onpaste = <any>updateOnTextInput_;
            Util.onInputChange(this.inp, updateOnTextInput_);

            // Construct palletes.
            this.palettes = {
                "Preset": this.initPresetPalette(),
                "HSB": this.initHsbPalette()
            }

            // Construct a palette selector
            for (var name in this.palettes) {
                var selector = span("paletteChoice", name);
                this.paletteSelector.appendChild(selector);
                selector.withClick(e => {
                    var src = (<MouseEvent> e).srcElement;
                    var name = src.childNodes[0].textContent;
                    this.selectPalette(name);
                });
            }

            // Construct the whole form
            this.colorBox = div(
                "colorBox charm",
                [colorInputBox,
                    this.paletteSelector,
                    this.palettes["Preset"],
                    this.palettes["HSB"]]);
            this.colorBox.style.left = x + "px";
            this.colorBox.style.top = y + "px";

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
            };
            m.showBare(this.colorBox);

            TheEditor.keyMgr.register("Esc", () => { cancelIt = true; m.dismiss(); return true });
            TheEditor.keyMgr.register("Enter", () => { m.dismiss(); return true });

            this.inp.value = this.initialColor;
            var isPreset: boolean = false;
            var c = this.parseColorCode(this.initialColor);
            if (c < 0) {
                isPreset = true;
            } else {
                for (var colorName in this.colorTable)
                    if (colorName === this.initialColor) {
                        isPreset = true;
                    }
                this.colorPreviewBox.style.backgroundColor = this.colorIntToHtml(c);
            }
            this.selectPalette(isPreset ? "Preset" : "HSB");

            Util.setKeyboardFocus(this.inp);
        }

        public selectPalette(paletteName: string) {
            for (var i = 0; i < this.paletteSelector.childNodes.length; i++) {
                var selector = <HTMLElement>this.paletteSelector.children[i];
                if (selector.childNodes[0].textContent == paletteName)
                    selector.classList.add("active");
                else
                    selector.classList.remove("active");
            }
            for (var name in this.palettes) {
                var palette = this.palettes[name];
                if (paletteName == name)
                    palette.style.display = "block";
                else
                    palette.style.display = "none";
            }
            this.selectedPalette = paletteName;
            this.updateOnTextInput();
        }

        private updateOnTextInput() {
            if (this.selectedPalette === "HSB") {
                var c = this.parseColorCode(this.inp.value);
                if (c < 0) {
                    return;
                }
                var newHsb = this.colorIntToHsb(c);
                if (!isNaN(newHsb.hue))
                    this.hsb.hue = newHsb.hue;
                this.hsb.saturation = newHsb.saturation;
                this.hsb.value = newHsb.value;
                this.updateOnHsbInput();
            } else {
                this.update(this.inp.value);
            }
        }

        private updateOnHsbInput() {

            var inRange = (x: number, y: number, z: number): number =>
                x < y ? y : (x > z ? z : x);
            this.hsb.hue = inRange(this.hsb.hue, 0, 255);
            this.hsb.saturation = inRange(this.hsb.saturation, 0, 255);
            this.hsb.value = inRange(this.hsb.value, 0, 255);

            var origPos:Position, pos:Position;

            // Set position of the cursor in the square
            origPos = Util.offsetIn(this.hsbSquare, this.colorBox);
            pos = Util.offsetIn(this.hsbCursor, this.colorBox);
            this.hsbCursor.style.left = (this.hsb.saturation + origPos.x - this.getCursorWidth()/2 - this.cursorBorderWidth) + "px";
            this.hsbCursor.style.top = ((255 - this.hsb.value) + origPos.y - this.getCursorWidth()/2 - this.cursorBorderWidth) + "px";

            // Set position of the cursor in the hue slider
            origPos = Util.offsetIn(this.hueSlider, this.colorBox);
            pos = Util.offsetIn(this.hueCursor, this.colorBox);
            this.hueCursor.style.left = origPos.x + "px";
            this.hueCursor.style.top = (this.hsb.hue + origPos.y - this.getCursorWidth()/2 - this.cursorBorderWidth) + "px";

            // Update background color of the square and the hue cursor
            var hueColor = "#" + this.hsbToRgb({
                hue: this.hsb.hue, saturation: 255, value: 255
            });
            this.hsbSquare.style.backgroundColor = hueColor;
            this.hueCursor.style.backgroundColor = hueColor;

            // Update background color of the cursor and the preview box
            var color = "#" + this.hsbToRgb(this.hsb);
            this.hsbCursor.style.backgroundColor = color;
            this.update(color);
        }

        // Create new tokens to be inserted
        private update(color: string) {

            if (color === this.lastColor) return;
            this.inp.value = color;

            var c = this.parseColorCode(color);
            this.colorPreviewBox.style.backgroundColor = this.colorIntToHtml(c);

            var toks: AST.Token[] = null;

            if (this.inp.value == "random") {
                toks = [AST.mkPropRef("random")];
            } else {
                for (var colorName in this.colorTable) {
                    if (colorName === color) {
                        toks = [AST.mkPropRef(colorName)];
                        break;
                    }
                }
            }

            if (toks == null) {
                var r = ((c >> 16) & 0xff) / 0xff;
                var g = ((c >> 8) & 0xff) / 0xff;
                var b = (c & 0xff) / 0xff;
                var addOps = (x: number, toks: AST.Token[]) => {
                    if (x === 0) {
                        toks.push(AST.mkOp("0"));
                    } else if (x === 1) {
                        toks.push(AST.mkOp("1"));
                    } else {
                        var xInt = Math.round(x * 255);
                        var sShortened = "";
                        var s = x.toString();
                        for (var i = 0; i < s.length; i++) {
                            var ch = s[i];
                            toks.push(AST.mkOp(ch));
                            sShortened += ch;

                            // Cut off nonsense string
                            if (ch !== "." &&
                                xInt === Math.round(parseFloat(sShortened) * 255))
                                break;
                        }
                    }
                };
                toks = [AST.mkPropRef("from rgb")];
                toks.push(AST.mkOp("("));
                addOps(r, toks);
                toks.push(AST.mkOp(","));
                addOps(g, toks);
                toks.push(AST.mkOp(","));
                addOps(b, toks);
                toks.push(AST.mkOp(")"));
            }

            if (this.onUpdate !== null) {
                this.onUpdate(toks);
            }
            this.lastTokens = toks;
            this.lastColor = color;
        }

        private fillZero(s: string, length: number): string
        {
            return s.length >= length ?
                    s : new Array(length - s.length + 1).join('0') + s;
        }

        private parseColorCode(c: string): number {
            if (typeof c !== "string") return -1;

            // Preset colors
            for (var colorName in this.colorTable)
                if (colorName === c) {
                    c = this.colorTable[c];
                    break;
                }

            // Remove '#'
            if (c[0] == "#") c = c.substr(1);

            // Test the format
            if (/^[0-9a-fA-F]+$/.test(c) === false)
                return -1;

            // #rgb
            if (c.length == 3) c = "f" + c;

            // #rrggbb
            else if (c.length == 6) c = "ff" + c;

            // #argb
            if (c.length == 4) {
                var coeff = parseInt(c[0], 16) / 15.0;
                var r = (parseInt(c[1], 16) * coeff) << 16;
                var g = (parseInt(c[2], 16) * coeff) << 8;
                var b = (parseInt(c[3], 16) * coeff);
                return r | g | b;
            }

            // #aarrggbb
            else if (c.length == 8) {
                var coeff = parseInt(c.substr(0, 2), 16) / 255;
                var r = (parseInt(c.substr(2, 2), 16) * coeff) << 16;
                var g = (parseInt(c.substr(4, 2), 16) * coeff) << 8;
                var b = (parseInt(c.substr(6, 2), 16) * coeff);
                return r | g | b;
            }
            return -1;
        }

        private colorIntToHtml(c: number): string {
            return "#" + this.fillZero(c.toString(16), 6);
        }

        private colorIntToHsb(c: number) {
            var r = (c >> 16) & 0xff;
            var g = (c >> 8) & 0xff;
            var b = c & 0xff;

            var max = r > g ? (r > b ? r : b) : (b > g ? b : g);
            var min = r > g ? (g > b ? b : g) : (r > b ? b : r);
            var d = max - min;

            var hsb = { hue: 0, saturation: 0, value: 0 };
            hsb.value = max;
            if (max != 0) {
                hsb.saturation = d / max * 255;
                if (r == max) hsb.hue = (g - b) / d;
                else if (g == max) hsb.hue = 2 + (b - r) / d;
                else hsb.hue = 4 + (r - g) / d;
                if (hsb.hue < 0) hsb.hue += 6;
                else if (hsb.hue > 6) hsb.hue -= 6;
                hsb.hue = hsb.hue * 255 / 6;
            }
            return hsb;
        }

        private floatsToRgb(r: number, g: number, b: number): string
        {
            return this.fillZero(Math.round(r * 255).toString(16), 2)
                + this.fillZero(Math.round(g * 255).toString(16), 2)
                + this.fillZero(Math.round(b * 255).toString(16), 2);
        }

        private hsbToRgb(hsb:any): string {
            var hue = hsb.hue, saturation = hsb.saturation, value = hsb.value;

            // Get the color from hue value
            hue = hue * 360 / 255;
            while (hue >= 360 || hue < 0)
                hue += hue >= 360 ? -360 : 360;
            var region = Math.floor(hue / 60);
            var fraction = hue / 60 - region;
            var r:number, g:number, b:number;
            switch (region) {
                case 0: r = 1; g = fraction; b = 0; break;
                case 1: r = 1 - fraction; g = 1; b = 0; break;
                case 2: r = 0; g = 1; b = fraction; break;
                case 3: r = 0; g = 1 - fraction; b = 1; break;
                case 4: r = fraction; g = 0; b = 1; break;
                case 5: r = 1; g = 0; b = 1 - fraction; break;
                default: r = 0; g = 0; b = 0; break;
            }

            // Mix the color with white and black
            if (saturation < 0) saturation = 0; else if (saturation > 255) saturation = 255;
            if (value < 0) value = 0; else if (value > 255) value = 255;
            var f = (x: number, y: number, p: number) => x * p + y * (1 - p);
            r = f(r, 1, saturation / 255); r = f(r, 0, value / 255);
            g = f(g, 1, saturation / 255); g = f(g, 0, value / 255);
            b = f(b, 1, saturation / 255); b = f(b, 0, value / 255);
            return this.floatsToRgb(r, g, b);
        }
    }
}
