///<reference path='refs.ts'/>
module TDev.RT {
    //? A scene contains layers of parralax backgrounds.
    //@ stem("scene")
    export class BoardBackgroundScene
        extends RTValue {
        private _offsetX : number = 0;
        private _offsetY: number = 0;
        private _layers: BoardBackgroundLayer[] = [];

        constructor(private _board : Board) {
            super();
        }

        //? Gets the view horizontal offset
        //@ readsMutable
        public view_x(): number {
            return this._offsetX;
        }
        //? Sets the view horizontal offset
        //@ writesMutable
        public set_view_x(x: number) {
            if (!isNaN(x))
                this._offsetX = x;
        }
        //? Gets the view vertical offset
        //@ readsMutable
        public view_y(): number {
            return this._offsetY;
        }
        //? Sets the view vertical offset
        //@ writesMutable
        public set_view_y(y: number) {
            if (!isNaN(y))
                this._offsetY = y;
        }

        public sortLayers() {
            this._layers.sort((a, b) => b.distance() - a.distance());
        }

        //? Creates a new layer on the scene. The distance determines the order of rendering and how fast the layer moves
        //@ writesMutable picAsync ignoreReturnValue
        //@ embedsLink("BoardBackgroundScene", "BoardBackgroundLayer")
        //@ returns(BoardBackgroundLayer)
        public create_layer(distance: number, pic: Picture, r: ResumeCtx) {
            pic.loadFirst(r, () => {
                var layer = new BoardBackgroundLayer(this, distance, pic);
                this._layers.push(layer);
                this.sortLayers();
                return layer;
            });
        }

        //? Gets the number of layers in the scene
        //@ readsMutable
        public count() : number { return this._layers.length; }

        //? Gets the layer at the given index
        //@ readsMutable
        public at(index: number): BoardBackgroundLayer { return this._layers[Math.floor(index)]; }

        //? Removes all layers from scene and resets the viewport
        public clear() {
            this._layers = [];
            this._offsetX = this._offsetY = 0;
        }

        public render(w: number, h: number, ctx: CanvasRenderingContext2D) {
            this._layers.forEach(layer => {
                // compute displacement based on distance
                var ox = Math.round(this._offsetX / (1 + layer.distance()));
                var oy = Math.round(this._offsetY / (1 + layer.distance()));

                layer.render(w, h, ctx, ox, oy);
            });
        }

        //? Displays the sprite sheet.
        //@ readsMutable
        public post_to_wall(s: IStackFrame): void {
            super.post_to_wall(s)
        }
    }

    //? A background scene layer
    //@ stem("layer")
    export class BoardBackgroundLayer
        extends RTValue {
        private _repeatX = true;
        private _repeatY = true;
        private _alignX = BoardBackgroundLayer.ARRANGE_LEFT;
        private _alignY = BoardBackgroundLayer.ARRANGE_TOP;

        static ARRANGE_LEFT: number = 1;
        static ARRANGE_RIGHT: number = 2;
        static ARRANGE_TOP: number = 3;
        static ARRANGE_BOTTOM: number = 4;
        static ARRANGE_CENTER: number = 5;

        constructor(private _scene : BoardBackgroundScene, private _distance : number, private _pic : Picture) {
            super();
        }

        //? Gets the picture associated to the layer.
        public picture() { return this._pic; }

        //? Gets the layer distance
        //@ readsMutable
        public distance() { return this._distance; }
        //? Sets the layer distance
        //@ writesMutable
        public set_distance(d: number) {
            if (isNaN(d)) d = 0;

            var d = Math.max(0, d);
            if (this._distance != d) {
                this._distance = d;
                this._scene.sortLayers();
            }
        }

        //? Gets a value indicating how the picture aligns horizontally. The default is `left`.
        //@ readsMutable
        public align_x() { return this._alignX; }
        //? Sets a value indicating how the picture aligns horizontally. The default is `left`.
        //@ [align].deflStrings("right", "left", "center")
        //@ writesMutable
        public set_align_x(align: string) {
            switch (align.trim().toLowerCase()) {
                case "left": this._alignX = BoardBackgroundLayer.ARRANGE_LEFT; break;
                case "right": this._alignX = BoardBackgroundLayer.ARRANGE_RIGHT; break;
                case "center": this._alignX = BoardBackgroundLayer.ARRANGE_CENTER; break;
            }
        }

        //? Gets a value indicating how the picture aligns vertically. The default is `top`.
        //@ readsMutable
        public align_y() { return this._alignY; }
        //? Sets a value indicating how the picture aligns vertically. The default is `top`.
        //@ [align].deflStrings("bottom", "top", "center")
        //@ writesMutable
        public set_align_y(align: string) {
            switch (align.trim().toLowerCase()) {
                case "center": this._alignY = BoardBackgroundLayer.ARRANGE_LEFT; break;
                case "top": this._alignY = BoardBackgroundLayer.ARRANGE_TOP; break;
                case "bottom": this._alignY = BoardBackgroundLayer.ARRANGE_BOTTOM; break;
            }
        }

        //? Gets a value indicating if the background repeats horizontally
        //@ readsMutable
        public repeat_x() { return this._repeatX; }
        //? Sets a value indicating if the background repeats horizontally
        //@ writesMutable
        public set_repeat_x(repeat: boolean) { this._repeatX = !!repeat; }

        //? Gets a value indicating if the background repeats horizontally
        //@ readsMutable
        public repeat_y() { return this._repeatY; }
        //? Sets a value indicating if the background repeats horizontally
        //@ writesMutable
        public set_repeat_y(repeat: boolean) { this._repeatY = !!repeat; }

        public render(w: number, h: number, ctx: CanvasRenderingContext2D, offsetX: number, offsetY: number) {
            var p = this._pic.getCanvas();
            var pw = p.width;
            var ph = p.height;

            if (!pw || !ph) return; // empty image.

            // left, top aligned
            var rx = -offsetX;
            var ry = -offsetY;

            switch (this._alignX) {
                case BoardBackgroundLayer.ARRANGE_RIGHT: rx -= (w+pw); break;
                case BoardBackgroundLayer.ARRANGE_CENTER: rx -= (w+pw) / 2; break;
            }
            switch (this._alignY) {
                case BoardBackgroundLayer.ARRANGE_BOTTOM: ry -= (h+ph); break;
                case BoardBackgroundLayer.ARRANGE_CENTER: ry -= (h+ph) / 2; break;
            }

            rx %= w; if (rx < 0) rx += w;
            ry %= h; if (ry < 0) ry += h;

            // avoid subpixel aliasing
            rx = Math.floor(rx);
            ry = Math.floor(ry);

            var renderEdge = !Browser.isWebkit;

            var y = 0;
            var py = 0;
            while (y < h) {
                py = y % ph;
                var dh = Math.min(ph - py, h - ry);
                var x = 0;
                while (x < w) {
                    var px = x % pw;
                    var dw = Math.min(pw - px, w - rx);
                    try {
                        ctx.drawImage(p, px, py, dw, dh, rx, ry, dw, dh);
                        if (renderEdge) {
                            if (this._repeatX)
                                ctx.drawImage(p, px, py, 2, dh, rx - 1, ry, 2, dh);
                            if (this._repeatY)
                                ctx.drawImage(p, px, py, dw, 2, rx, ry - 1, dw, 2);
                        }
                    } catch (e) {
                        Util.log('scene: ' + JSON.stringify({
                            w:w, h:h, pw:pw, ph:ph, dw:dw, dh:dh, x:x, y:y, px:px, py:py, rx:rx, ry:ry, edge:renderEdge
                        }))
                        Util.reportError('backgroundScene', e, false);
                        // stop rendering
                        return;
                    }
                    rx = (rx + dw) % w;
                    x += this._repeatX ? dw : w;
                }
                ry = (ry + dh) % h;
                y += this._repeatY ? dh : h;
            }
        }
    }
}