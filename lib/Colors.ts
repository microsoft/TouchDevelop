///<reference path='refs.ts'/>
module TDev.RT {
    //? New or built-in colors
    export module Colors
    {

        //? Gets the accent color in the current theme
        export function accent(): Color { return Color.fromHtml("#3BA818"); }

        //? Gets the subtle color in the current theme (light gray)
        export function subtle(): Color { return light_gray(); }

        //? Gets the chrome color in the current theme (control background)
        export function chrome(): Color { return Color.fromHtml("#FFDDDDDD"); }

        //? Gets the foreground color in the current theme
        export function foreground(s: IStackFrame): Color {
            var p = s && s.rt.getCurrentPage();
            return p ? Color.fromHtml(p.fgColor) : foreground_os();
        }

        //? Gets the background color in the current theme
        export function background(s: IStackFrame): Color {
            var p = s && s.rt.getCurrentPage();
            return p ? Color.fromHtml(p.bgColor) : background_os();
        }

        // default for foreground as set by os (on phones, these are replaced by function boostcolors)
        export function foreground_os(): Color { return black(); }
        export function background_os(): Color { return white(); }

        //? Indicates if the user is using a light theme in their phone
        export function is_light_theme(s: IStackFrame): boolean { return background(s).r > 128; }

        //? Creates a color from the red, green, blue channels (0.0-1.0 range)
        export function from_rgb(red: number, green: number, blue: number): Color { return Color.fromArgbF(1, red, green, blue); }

        //? Creates a color from the alpha, red, green, blue channels (0.0-1.0 range)
        export function from_argb(alpha: number, red: number, green: number, blue: number): Color { return Color.fromArgbF(alpha, red, green, blue); }

         //? Gets the color that has the ARGB value of #FFFFCBDB
        export function pink(): Color { return Color.fromHtml("#FFFFCBDB"); }
       
        //? Gets the color that has the ARGB value of #FF000000
        export function black(): Color { return Color.fromHtml("#FF000000"); }

        //? Gets the color that has the ARGB value of #FF0000FF
        export function blue(): Color { return Color.fromHtml("#FF0000FF"); }

        //? Gets the color that has the ARGB value of #FFA52A2A
        export function brown(): Color { return Color.fromHtml("#FFA52A2A"); }

        //? Gets the color that has the ARGB value of #FF00FFFF
        export function cyan(): Color { return Color.fromHtml("#FF00FFFF"); }

        //? Gets the color that has the ARGB value of #FFA9A9A9
        export function dark_gray(): Color { return Color.fromHtml("#FFA9A9A9"); }

        //? Gets the color that has the ARGB value of #FF808080
        export function gray(): Color { return Color.fromHtml("#FF808080"); }

        //? Gets the color that has the ARGB value of #FF008000
        export function green(): Color { return Color.fromHtml("#FF00FF00"); }

        //? Gets the color that has the ARGB value of #FFD3D3D3
        export function light_gray(): Color { return Color.fromHtml("#FFD3D3D3"); }

        //? Gets the color that has the ARGB value of #FFFF00FF
        export function magenta(): Color { return Color.fromHtml("#FFFF00FF"); }

        //? Gets the color that has the ARGB value of #FFFFA500
        export function orange(): Color { return Color.fromHtml("#FFFFA500"); }

        //? Gets the color that has the ARGB value of #FF800080
        export function purple(): Color { return Color.fromHtml("#FF800080"); }

        //? Gets the color that has the ARGB value of #FFFF0000
        export function red(): Color { return Color.fromHtml("#FFFF0000"); }

        //? Gets the color that has the ARGB value of #00FFFFFF
        export function transparent(): Color { return Color.fromHtml("#00FFFFFF"); }

        //? Gets the color that has the ARGB value of #FFFFFFFF
        export function white(): Color { return Color.fromHtml("#FFFFFFFF"); }

        //? Gets the color that has the ARGB value of #FFFFFF00
        export function yellow(): Color { return Color.fromHtml("#FFFFFF00"); }

        //? Gets the color that has the ARGB value of #FF704214
        export function sepia(): Color { return Color.fromHtml("#FF704214"); }

        //? Computes an intermediate color
        //@ [c1].deflExpr('colors->background') [c2].deflExpr('colors->foreground')
        export function linear_gradient(c1: Color, c2: Color, alpha: number): Color
        {
            var r1 = RTValue.normalize(alpha);
            var r2 = 1 - r1;
            return Color.fromArgbF(
                        c1.A() * r1 + c2.A() * r2,
                        c1.R() * r1 + c2.R() * r2,
                        c1.G() * r1 + c2.G() * r2,
                        c1.B() * r1 + c2.B() * r2);
        }

        //? Renamed to 'random'
        //@ hidden
        //@ tandre
        export function rand(): Color { return random(); }

        //? Picks a random color
        //@ tandre
        export function random(): Color { return Color.fromArgbF(1.0, Random.normalized(), Random.normalized(), Random.normalized()); }

        //? Picks a color from a color wheel where the hue is between 0 and 1.
        export function wheel(hue : number) : Color { return Colors.from_hsb(hue, 1, 1); }

        //? Creates a color from the hue, saturation, brightness channels (0.0-1.0 range)
        //@ [saturation].defl(1) [brightness].defl(1)
        export function from_hsb(hue: number, saturation: number, brightness: number): Color
        {
            return from_ahsb(1.0, hue, saturation, brightness);
        }

        //? Creates a color from the alpha, hue, saturation, brightness channels (0.0-1.0 range)
        //@ [alpha].defl(1) [saturation].defl(1) [brightness].defl(1)
        export function from_ahsb(alpha: number, hue: number, saturation: number, brightness: number): Color
        {
            return from_ahsbByte(
                Color.normalizeToByte(alpha),
                Color.normalizeToByte(hue),
                Color.normalizeToByte(saturation),
                Color.normalizeToByte(brightness)
                );
        }

        export function from_ahsbByte(alpha: number, hue: number, saturation: number, brightness: number): Color
        {
            var r = brightness;
            var g = brightness;
            var b = brightness;
            if (saturation !== 0) {
                var max = brightness;
                var dif = brightness * saturation / 255;
                var min = brightness - dif;

                var h = hue * 360 / 255;

                if (h < 60) {
                    r = max;
                    g = h * dif / 60 + min;
                    b = min;
                }
                else if (h < 120) {
                    r = -(h - 120) * dif / 60 + min;
                    g = max;
                    b = min;
                }
                else if (h < 180) {
                    r = min;
                    g = max;
                    b = (h - 120) * dif / 60 + min;
                }
                else if (h < 240) {
                    r = min;
                    g = -(h - 240) * dif / 60 + min;
                    b = max;
                }
                else if (h < 300) {
                    r = (h - 240) * dif / 60 + min;
                    g = min;
                    b = max;
                }
                else if (h <= 360) {
                    r = max;
                    g = min;
                    b = -(h - 360) * dif / 60 + min;
                }
                else {
                    r = 0;
                    g = 0;
                    b = 0;
                }
            }

            return Color.fromArgb(alpha, Color.capByte(r), Color.capByte(g), Color.capByte(b));
        }
    }
}
