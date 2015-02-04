///<reference path='refs.ts'/>
module TDev.RT {
    //? A argb color (alpha, red, green, blue)
    //@ stem("c") icon("color") immutable ctx(general,indexkey,walltap,cloudfield,json) serializable
    //@ robust
    export class Color
        extends RTValue
    {
        // 0-255
        public r: number;
        public g: number;
        public b: number;
        public a: number;

        constructor() {
            super()
        }

        static fromArtUrl(url: string) { return Promise.wrap(Color.fromHtml(url)); }

        static fromArgb(a: number, r: number, g: number, b: number)
        {
            var c = new Color();
            c.a = a;
            c.r = r;
            c.g = g;
            c.b = b;
            return c;
        }

        static capByte(n: number): number
        {
            var c: number = Math.floor(n);
            if (c < 0) return 0;
            else if (c > 255) return 255;
            return c;
        }

        static normalizeToByte(n: number): number
        {
            if (n < 0) n = 0;
            else if (n > 1) n = 1;
            return Math.floor(n * 255 + 0.499999);
        }

        static fromArgbF(a: number, r: number, g: number, b: number)
        {
            var c = new Color();
            c.a = Color.normalizeToByte(a);
            c.r = Color.normalizeToByte(r);
            c.g = Color.normalizeToByte(g);
            c.b = Color.normalizeToByte(b);
            return c;
        }

        static fromHtml(c: string)
        {
            if (c[0] == "#") c = c.substr(1);
            var n = parseInt(c, 16);
            var r = new Color();
            if (c.length == 3 || c.length == 4) {
                r.b = (n & 0xf) * 0x11;
                r.g = ((n >> 4) & 0xf) * 0x11;
                r.r = ((n >> 8) & 0xf) * 0x11;
                r.a = ((n >> 12) & 0xf) * 0x11;
            } else if (c.length == 6 || c.length == 8) {
                r.b = (n & 0xff)
                r.g = ((n >> 8) & 0xff);
                r.r = ((n >> 16) & 0xff);
                r.a = ((n >> 24) & 0xff);
            }

            if (c.length == 3 || c.length == 6) r.a = 255;

            return r;
        }

        static fromInt32(n: number)
        {
            n = Math.round(n);
            var r = new Color();
            r.b = (n & 0xff)
            r.g = ((n >> 8) & 0xff);
            r.r = ((n >> 16) & 0xff);
            r.a = ((n >> 24) & 0xff);
            return r;
        }

        //? Gets the normalized alpha value (0.0-1.0)
        public A(): number { return this.a / 255.0; }

        //? Gets the normalized red value (0.0-1.0)
        public R(): number { return this.r / 255.0; }

        //? Gets the normalized green value (0.0-1.0)
        public G(): number { return this.g / 255.0; }

        //? Gets the normalized blue value (0.0-1.0)
        public B(): number { return this.b / 255.0; }

        //? Checks if the color is equal to the other
        public equals(other: Color): boolean { return this.r == other.r && this.g == other.g && this.b == other.b && this.a == other.a; }

        //? Composes a new color using alpha blending
        public blend(other: Color): Color
        {
            var caAlpha = other.A();
            var cbAlpha = this.A() * (1 - caAlpha);
            return Color.fromArgbF(caAlpha + cbAlpha,
                             other.R() * caAlpha + this.R() * cbAlpha,
                             other.G() * caAlpha + this.G() * cbAlpha,
                             other.B() * caAlpha + this.B() * cbAlpha);
        }

        //? Creates a new color by changing the alpha channel from 0 (transparent) to 1 (opaque).
        public make_transparent(alpha: number): Color
        {
            if (alpha == 1 && this.a == 255) return this;
            var a = Color.normalizeToByte(alpha)
            if (a == this.a) return this;
            return Color.fromArgb(a, this.r, this.g, this.b);
        }

        //? Makes a darker color by a delta between 0 and 1.
        //@ [delta].defl(0.1)
        public darken(delta: number): Color
        {
            return Color.fromArgbF(this.A(), this.R() - delta, this.G() - delta, this.B() - delta);
        }

        //? Makes a lighter color by a delta between 0 and 1.
        //@ [delta].defl(0.1)
        public lighten(delta: number): Color
        {
            return Color.fromArgbF(this.A(), this.R() + delta, this.G() + delta, this.B() + delta);
        }

        public toInt32()
        {
            return ((this.a << 24) | (this.r << 16) | (this.g << 8) | this.b) >>> 0;
        }

        public toJsonKey(): any { return this.toInt32(); }

        public keyCompareTo(other: any): number
        {
            var o: Color = other;
            var diff = this.r - o.r;
            if (diff) return diff;
            diff = this.b - o.b;
            if (diff) return diff;
            diff = this.g - o.g;
            if (diff) return diff;
            diff = this.a - o.a;
            return diff;
        }

        public toString() : string
        {
            var h = this.toInt32().toString(16);
            return "#" + "00000000".substr(0, 8 - h.length) + h;
        }

        public getViewCore(s: IStackFrame, b: BoxBase): HTMLElement
        {
            var d = div("item");
            d.style.backgroundColor = this.toHtml();
            var t = div("item-subtitle", Util.fmt('alpha:{0:f1.3}, red:{1:f1.3}, green:{2:f1.3}, blue:{3:f1.3}',
                            this.A(), this.R(), this.G(), this.B()));
            t.style.textAlign = 'center';
            t.style.color = ((this.r + this.g + this.b) * this.A()) > 300 ? 'black' : 'white';
            d.appendChild(t);
            return d;
        }

        private htmlCache:string;

        public toHtml() : string
        {
            if (this.htmlCache) return this.htmlCache;

            if (this.a == 0xff) {
                var h = (this.toInt32() & 0xffffff).toString(16);
                this.htmlCache = "#" + "000000".substr(0, 6 - h.length) + h;
            }
            else
                this.htmlCache = Util.fmt("rgba({0}, {1}, {2}, {3})", this.r, this.g, this.b, Math_.round_with_precision(this.a / 0xff, 6));
            return this.htmlCache;
        }

        public getShortStringRepresentation(): string {
            return this.toHtml();
        }

        public exportJson(ctx: JsonExportCtx): any {
            // return a string
            return this.toHtml();
        }
        public importJson(ctx: JsonImportCtx, json: any): RT.RTValue {
            Util.oops("should not call immutable instance for importing");
            return undefined;
        }
        static mkFromJson(ctx: JsonImportCtx, json: any): RT.RTValue {
            if (typeof (json) === "string") {
                var c = Color.fromHtml(json);
                return c;
            } else {
                return undefined;
            }
        }

        public debuggerDisplay(clickHandler: () => any) {
            // this is the old code:
            // return span(null, this.toHtml()).withClick(clickHandler);

            var tempSpan: HTMLElement;
            tempSpan = span(null, "R: " + this.r + " G: " + this.g + " B: " + this.b).withClick(clickHandler);

            var s: string;
            for (s = (this.toInt32() & 0xffffff).toString(16); s.length < 6; s = "0" + s) { }
            tempSpan.style.backgroundColor = "#" + s;

            if ((this.r + this.g + this.b) / 3 < 100) {
                tempSpan.style.color = "white";
            }

            return tempSpan;
        }

        //? Convert color to HTML syntax (either #FF002A or rgba(255, 0, 42, 0.5) when A is non-1)
        public to_html() : string
        {
            return this.toHtml();
        }

        //? Gets the hue component of the color.
        public hue(): number
        {
            return this.toHsb().x() / 255;
        }

        //? Gets the saturation component of the color.
        public saturation(): number
        {
            return this.toHsb().y() / 255;
        }

        //? Gets the brightness component of the color.
        public brightness(): number
        {
            return this.toHsb().z() / 255;
        }

        private toHsb() : Vector3
        {
            var max = Math.max(this.r, Math.max(this.g, this.b));
            if (max <= 0)
                return Vector3.mk(0, 0, 0);

            var min = Math.min(this.r, Math.min(this.g, this.b));
            var dif = max - min;
            var hue = 0;

            if (max > min) {
                if (this.g === max) {
                    hue = (this.b - this.r) / dif * 60 + 120;
                }
                else if (this.b === max) {
                    hue = (this.r - this.g) / dif * 60 + 240;
                }
                else if (this.b > this.g) {
                    hue = (this.g - this.b) / dif * 60 + 360;
                }
                else {
                    hue = (this.g - this.b) / dif * 60;
                }
                if (hue < 0) {
                    hue = hue + 360;
                }
            }
            else {
                hue = 0;
            }

            hue *= 255 / 360;
            var saturation = (dif / max) * 255;
            var brightness = max;

            return Vector3.mk(hue, saturation, brightness);
        }

        //? Prints the value to the wall
        public post_to_wall(s:IStackFrame) : void { super.post_to_wall(s) }
    }
}
