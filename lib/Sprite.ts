///<reference path='refs.ts'/>

module TDev.RT {
    export enum SpriteType
    {
        Ellipse,
        Rectangle,
        Text,
        Picture,
        Anchor,
    }

    class SpriteContent
        extends RTValue
    {
        constructor() {
            super()
        }
    }
    
    //? A sprite
    //@ icon("sprite") ctx(general,gckey)
    export class Sprite
        extends RTValue
    {
        public _parent : Board = undefined;
        public _sheet : SpriteSheet = undefined;
        private _friction : number = Number.NaN;
        private _angular_speed : number = 0;
        public _height : number = undefined;
        public _location : Location_ = undefined;
        private _angle : number = 0;
        public _elasticity : number = 1;
        public _scale : number = 1;
        constructor() {
            super()
        }
        private _speed : Vector2 = Vector2.mk(0,0);
        private _acceleration : Vector2 = Vector2.mk(0,0);
        public _width : number = undefined;
        private _mass : number = Number.NaN;
        
        public _position : Vector2 = Vector2.mk(0,0);
        private _color : Color = Colors.light_gray();
        private _text : string = undefined;
        private _textBaseline : string = undefined;
        public _hidden : boolean = false;
        private _opacity : number = 1;
        private _clip: number[] = undefined;
        
        public spriteType : SpriteType;
        public fontSize : number;
        private _picture : Picture;
        private _animations : SpriteAnimation[];
        private shapeDirty = true;
        private hasChanged = true;

        /// <summary>
        /// Produced at each step by the wall collision
        /// Used in the next step to clip forces (reactive forces)
        /// </summary>
        public normalTouchPoints : Vector2[] = [];

        private _lastPosition : Vector2 ; // used in redraw, no serialization

        private _springs : Spring[] = [];
        
        /// <summary>
        /// newPosition, newSpeed, and midSpeed, newRotation are only used during an update step and need not be serialized
        /// </summary>
        public newPosition : Vector2;
        public newSpeed : Vector2;
        public midSpeed : Vector2;
        private newRotation : number;

        /// <summary>
        /// Recomputed on demand
        /// </summary>
        public boundingMinX : number;
        public boundingMaxX : number;
        public boundingMinY : number;
        public boundingMaxY : number;

        /// events
        public onTap: Event_ = new Event_();
        public onSwipe: Event_ = new Event_();
        public onDrag: Event_ = new Event_();
        public onTouchDown: Event_ = new Event_();
        public onTouchUp: Event_ = new Event_();
        public onEveryFrame: Event_ = new Event_();

        static mk(tp:SpriteType, x:number, y:number, w:number, h:number)
        {
            var s = new Sprite();
            s.spriteType = tp;
            s._width = w;
            s._height = h;
            s._position = new Vector2(x, y);
            s.computeBoundingBox();
            return s;
        }

        //? Gets the fraction of speed loss between 0 and 1
        //@ readsMutable
        public friction() : number
        {
           if (! this._parent) return NaN;
           if (isNaN(this._friction)) return this._parent._worldFriction;
           return this._friction;
        }

        //? Sets the friction to a fraction of speed loss between 0 and 1
        //@ writesMutable
        public set_friction(friction:number) : void { this._friction = Math.min(1, Math.abs(friction)); }

        //? Gets the scaling applied when rendering the sprite. This scaling does not influence the bounding box.
        //@ readsMutable
        public scale() : number { return this._scale; }

        //? Sets the scaling applied to the sprite on rendering. This scaling does not influence the bounding box.
        //@ writesMutable [value].defl(1)
        public set_scale(value : number) { this._scale = value; }

        //? Gets the rotation speed in degrees/sec
        //@ readsMutable
        public angular_speed() : number { return this._angular_speed; }

        //? Sets the rotation speed in degrees/sec
        //@ writesMutable
        public set_angular_speed(speed:number) : void { this._angular_speed = speed; }

        //? Gets the height in pixels
        public height() : number { return this._height; }

        //? Gets the geo location assigned to the sprite
        //@ readsMutable
        public location() : Location_ { return this._location; }

        //? Sets the geo location of the sprite
        //@ cap(motion) flow(SourceGeoLocation)
        //@ writesMutable
        public set_location(location:Location_) : void { this._location = location; }

        //? Gets the angle of the sprite in degrees
        //@ readsMutable
        public angle() : number { return this._angle; }

        //? Sets the angle of the sprite in degrees
        //@ writesMutable
        public set_angle(angle:number) : void { 
            if(this._angle != angle) {
                this._angle = angle;
                this.computeBoundingBox(); 
                this.contentChanged();
            }
        }

        //? Gets the sprite elasticity as a fraction of speed preservation per bounce (0-1)
        //@ readsMutable
        public elasticity() : number { return this._elasticity; }

        //? Sets the sprite elasticity as a fraction of speed preservation per bounce (0-1)
        //@ writesMutable
        public set_elasticity(elasticity:number) : void { this._elasticity = Math.abs(elasticity); }

        //? Gets the speed along x in pixels/sec
        //@ readsMutable
        public speed_x() : number { return this._speed.x(); }

        //? Sets the x speed in pixels/sec
        //@ writesMutable
        public set_speed_x(vx:number) : void { this._speed = new Vector2(vx, this._speed.y()); }

        //? Gets the speed along y in pixels/sec
        //@ readsMutable
        public speed_y() : number { return this._speed.y(); }

        //? Sets the y speed in pixels/sec
        //@ writesMutable
        public set_speed_y(vy:number) : void { this._speed = new Vector2(this._speed.x(), vy); }

        //? Gets the width in pixels
        public width() : number { return this._width; }

        //? Sets the height in pixels
        //@ writesMutable
        public set_height(height:number) : void 
        {
            height = Math.max(1, height);
            if (height != this._height) {
                this._height = height; 
                if (this._picture)
                    this._width = this._picture.widthSync() / Math.max(1, this._picture.heightSync()) * this._height;
                this.computeBoundingBox(); 
                this.contentChanged(); 
            }
        }

        //? Sets the width in pixels
        //@ writesMutable
        public set_width(width:number) : void { 
            width = Math.max(1, width); 
            if(this._width != width) {
                this._frame = null;
                this._width = width;
                if (this._picture)
                    this._height = this._picture.heightSync() / Math.max(1, this._picture.widthSync()) * this._width;
                this.computeBoundingBox(); 
                this.contentChanged(); 
            }
        }

        //? Gets the top position in pixels
        //@ readsMutable
        public top(): number { return this._position.y() - this._height / 2; }

        //? Sets the top position in pixels
        //@ writesMutable
        public set_top(y: number): void { this._position = new Vector2(this._position.x(), y + this._height / 2); }

        //? Gets the bottom position in pixels
        //@ readsMutable
        public bottom(): number { return this._position.y() + this._height / 2; }

        //? Sets the bottom position in pixels
        //@ writesMutable
        public set_bottom(y: number): void { this._position = new Vector2(this._position.x(), y - this._height / 2); }

        //? Gets the right position in pixels
        //@ readsMutable
        public right(): number { return this._position.x() + this._width / 2; }

        //? Sets the right position in pixels
        //@ writesMutable
        public set_right(x: number): void { this._position = new Vector2(x - this._width / 2, this._position.y()); }

        //? Gets the left position in pixels
        //@ readsMutable
        public left(): number { return this._position.x() - this._width / 2; }

        //? Sets the left position in pixels
        //@ writesMutable
        public set_left(x: number): void { this._position = new Vector2(x + this._width / 2, this._position.y()); }

        //? Gets the center horizontal position of in pixels
        //@ readsMutable
        public x() : number { return this._position.x(); }

        //? Sets the center horizontal position in pixels
        //@ writesMutable
        public set_x(x:number) : void { this._position = new Vector2(x, this._position.y()); }

        //? Gets the y position in pixels
        //@ readsMutable
        public y() : number { return this._position.y(); }

        //? Sets the y position in pixels
        //@ writesMutable
        public set_y(y:number) : void { this._position = new Vector2(this._position.x(), y); }

        //? Returns the sprite color.
        //@ readsMutable
        public color() : Color { return this._color; }

        //? Sets the sprite color.
        //@ writesMutable
        //@ [color].deflExpr('colors->random')
        public set_color(color:Color) : void { this._color = color; this.contentChanged(); }

        //? Gets the opacity (between 0 transparent and 1 opaque)
        public opacity() : number { return this._opacity; }

        //? Sets the sprite opacity (between 0 transparent and 1 opaque).
        //@ writesMutable
        public set_opacity(opacity:number) : void { this._opacity = Math.min(1,Math.max(0,opacity)); this.contentChanged(); }

        //? Gets the associated sprite sheet
        public sheet() : SpriteSheet { return this._sheet; }

        public setSheet(sheet : SpriteSheet) {
            this._sheet = sheet;
            this.setPictureInternal(this._sheet._picture);
            this._width = 0;
            this._height = 0;
        }

        //? Sets the font size in pixels of the sprite (for text sprites)
        //@ writesMutable [size].defl(20)
        public set_font_size(size : number, s : IStackFrame) {
            var size = Math.round(size);
            if (this.fontSize != size) {
                this.fontSize = size;
                this.changed();
            }
        }

        //? Gets the font size in pixels (for text sprites)
        //@ readsMutable
        public font_size() : number {
            return this.fontSize || 0;
        }

        //? Sets the current text baseline used when drawing text (for text sprites)
        //@ [pos].deflStrings("top", "alphabetic", "hanging", "middle", "ideographic", "bottom") writesMutable
        public set_text_baseline(pos : string, s : IStackFrame) {
            pos = pos.trim().toLowerCase();
            if (!/^(alphabetic|top|hanging|middle|ideographic|bottom)$/.test(pos))
                Util.userError(lf("invalid text baseline value"), s.pc);
            this._textBaseline = pos;
        }


        //? Gets the current text baseline (for text sprites)
        //@ readsMutable
        public text_baseline() : string {
            return this._textBaseline;
        }

        //? Fits the bounding box to the size of the text
        //@ writesMutable
        public fit_text() {
            var ctx;
            if (this._text && this._parent && (ctx = this._parent.renderingContext())) {
                ctx.save();
                ctx.font = this.font(this.fontSize);
                var lines = this._text.split('\n');
                var w = 0, h = this.fontSize *((lines.length - 1) * 1.25 + 1);
                lines.forEach(line => w = Math.max(w, ctx.measureText(line).width));
                ctx.restore();
                this.set_width(w);
                this.set_height(h);
                this._textBaseline = "middle";
            }
        }

        //? The text on a text sprite (if it is a text sprite)
        //@ readsMutable
        public text() : string { return this._text; }

        //? Updates text on a text sprite (if it is a text sprite)
        //@ writesMutable
        public set_text(text: string): void {
            if (this.spriteType == SpriteType.Text) {
                this._text = text; this.contentChanged();
            }
        }

        //? Gets the mass
        //@ readsMutable
        public mass() : number {
            if (isNaN(this._mass)) {
                return Math.max(1e-6, this.width() * this.height());
            }
            return this._mass;
        }

        //? Sets the sprite mass.
        //@ writesMutable
        public set_mass(mass:number) : void {
            if (isNaN(mass) || isFinite(mass) && mass > 0) {
                this._mass = mass;
            }
        }

        //? Gets the acceleration along x in pixels/sec^2
        //@ readsMutable
        public acceleration_x():number { return this._acceleration._x; }

        //? Gets the acceleration along y in pixels/sec^2
        //@ readsMutable
        public acceleration_y():number { return this._acceleration._y; }

        //? Sets the x acceleration in pixels/sec^2
        //@ writesMutable
        public set_acceleration_x(x:number) { this._acceleration = new Vector2(x, this._acceleration._y); }

        //? Sets the y acceleration in pixels/sec^2
        //@ writesMutable
        public set_acceleration_y(y:number) { this._acceleration = new Vector2(this._acceleration._x, y); }

        //? Sets the acceleration in pixels/sec^2
        //@ writesMutable
        public set_acceleration(x:number, y:number) { this._acceleration = new Vector2(x, y); }

        //? Set the handler invoked when the sprite is tapped
        //@ ignoreReturnValue
        public on_tap(tapped: PositionAction) : EventBinding {
            return this.onTap.addHandler(tapped);
        }

        //? Set the handler invoked when the sprite is swiped
        //@ ignoreReturnValue
        public on_swipe(swiped: VectorAction) : EventBinding {
            return this.onSwipe.addHandler(swiped);
        }

        //? Set the handler invoked when the sprite is dragged
        //@ ignoreReturnValue
        public on_drag(dragged: VectorAction) : EventBinding {
            return this.onDrag.addHandler(dragged);
        }

        //? Set the handler invoked when the sprite is touched initially
        //@ ignoreReturnValue
        public on_touch_down(touch_down: PositionAction) : EventBinding {
            return this.onTouchDown.addHandler(touch_down);
        }

        //? Set the handler invoked when the sprite touch is released
        //@ ignoreReturnValue
        public on_touch_up(touch_up: PositionAction) : EventBinding {
            return this.onTouchUp.addHandler(touch_up);
        }

        //? Add an action that fires for every display frame
        //@ ignoreReturnValue
        public on_every_frame(perform: Action, s: IStackFrame): EventBinding {
            if (this._parent)
                this._parent.enableEveryFrameOnSprite(s);
            return this.onEveryFrame.addHandler(perform)
        }

        public changed(): void 
        {
            this.hasChanged = true;
        }

        private contentChanged(): void 
        {
            this.changed();
            this.shapeDirty = true;
        }
        
        public redraw(ctx : CanvasRenderingContext2D, debug: boolean)
        {
            if (!debug && (this._hidden || this._opacity == 0 || this._width <= 0 || this._height <= 0 || this._scale == 0)) return; // don't render hidden sprites
            
            //if (!hasChanged) return;
            //hasChanged = false;
            this.drawShape(ctx, debug);
            //self.canvas.style.left = (self.x() - self.width()/2 ) + "px";
            //self.canvas.style.top = (self.y() - self.height()/2 ) + "px";
           // self.canvas.style.transform = "rotate(30deg)";
        }

        private font(size : number) : string {
            return size + "px " + '"Segoe UI", "Segoe WP", "Helvetica Neue", Sans-Serif';
        }

        private drawShape(ctx : CanvasRenderingContext2D, debug : boolean)
        {
            //if (!shapeDirty) return;
            //shapeDirty = false;

            //if (!canvasIsEmpty)
            //    ctx.clearRect(0, 0, canvas.width, canvas.height);
            //canvasIsEmpty = false;

            //canvas.width = _width;
            //canvas.height = _height;
            
            var fcolor = this.color().toHtml();
            var dcolor = () => this.color().make_transparent(1).toHtml(); // debug color not tranparent   
            var scaledWidth = this._width * this._scale;
            var scaledHeight = this._height * this._scale;    
            var scaledFontSize = Math_.round_with_precision(this.fontSize * this._scale, 1);
            ctx.save();
            ctx.translate(this.x(), this.y());
            var ag = this._angle / 180 * Math.PI;
            if (this._frame && this._frame.rotated) ag -= 90;
            ctx.rotate(ag);            
            switch (this.spriteType) {
            case SpriteType.Rectangle:
                ctx.translate(-scaledWidth/2, -scaledHeight/2);
                if (debug) {
                    ctx.strokeStyle = dcolor();
                    ctx.strokeRect(0, 0, scaledWidth, scaledHeight);
                }
                // set opacity only after debugging done
                ctx.globalAlpha = this._opacity;
                ctx.fillStyle = fcolor;
                if (!this._hidden) {
                    ctx.fillRect(0, 0, scaledWidth, scaledHeight);
                }
                break;

            case SpriteType.Ellipse:
                // TODO need to play with createRadialGradient() 
                ctx.scale(scaledWidth/scaledHeight, 1);
                ctx.translate(-scaledHeight/2, -scaledHeight/2);

                // debug rectangle around ellipse
                if (debug) {
                  ctx.strokeStyle = dcolor();
                  ctx.strokeRect(0, 0, scaledHeight, scaledHeight);
                }
                
                // set opacity only after debugging done
                ctx.globalAlpha = this._opacity;
                if (!this._hidden) {                
                    ctx.beginPath();
                    ctx.arc(scaledHeight/2, scaledHeight/2, scaledHeight/2, 0, 2*Math.PI);
                    if (Browser.brokenGradient) {
                        ctx.fillStyle = fcolor;
                    }
                    else {
                        try {
                            var radgrad = ctx.createRadialGradient(scaledHeight * 0.75, scaledHeight * 0.25, 1, scaledHeight / 2, scaledHeight / 2, scaledHeight / 2);
                            radgrad.addColorStop(0, '#FFFFFF');
                            radgrad.addColorStop(1, fcolor);
                            ctx.fillStyle = radgrad;
                        } catch (e) {
                            Util.log("draw shape crash, color: " + fcolor);
                            throw e;
                        }
                    }
                    ctx.closePath();
                    ctx.fill();
                }
                break;

            case SpriteType.Picture:
                ctx.translate(- scaledWidth/2, -scaledHeight/2);
                // debug rectangle around ellipse
                if (debug) {
                  ctx.strokeStyle = dcolor();
                  ctx.strokeRect(0, 0, scaledWidth, scaledHeight);
                }
                // this may be called by screen resize before _picture is actually set
                if (this._opacity > 0 && this._picture) {
                    // set opacity only after debugging done
                    ctx.globalAlpha = this._opacity;
                    if (!this._hidden) {
                        if (this._clip) {
                            if(this._clip[2] > 0 && this._clip[3] > 0)
                                ctx.drawImage(
                                    this._picture.getCanvas(),
                                    this._clip[0], this._clip[1], this._clip[2], this._clip[3],
                                    0, 0, scaledWidth, scaledHeight);
                        } else {
                            ctx.drawImage(
                                this._picture.getCanvas(),
                                0, 0, this._picture.widthSync(), this._picture.heightSync(),
                                0, 0, scaledWidth, scaledHeight);
                        }
                    }
                }
                break;
                
            case SpriteType.Text:
                ctx.translate(-scaledWidth/2, -scaledHeight/2);
                // debug rectangle around ellipse
                ctx.fillStyle = fcolor;
                if (debug) {
                  ctx.strokeStyle = dcolor();
                  ctx.strokeRect(0, 0, scaledWidth, scaledHeight);
                }
                if (!this._hidden) {
                    // set opacity only after debugging done
                    ctx.globalAlpha = this._opacity;
                    ctx.font = this.font(scaledFontSize);
                    var lines = this._text.split("\n");
                    ctx.textBaseline = this._textBaseline || "top";
                    // adjust y to match phone layout
                    if (!this._textBaseline)
                        ctx.translate(0, scaledFontSize * 0.2);
                    else ctx.translate(0, scaledHeight /2);
                    //ctx.translate(offset, this.fontSize);
                    for (var line = 0; line < lines.length; line++) {
                        var msr = ctx.measureText(lines[line]);
                        ctx.save();
                        var offset = scaledWidth - msr.width;
                        if (offset > 0) {
                            offset = offset / 2;
                        }
                        else {
                            offset = 0;
                        }
                        ctx.translate(offset, 0);
                        ctx.fillText(lines[line], 0, 0);
                        ctx.restore();
                        ctx.translate(0, scaledFontSize * 1.25);
                    }
                }
                break;    
                
            case SpriteType.Anchor:
                ctx.translate(- scaledWidth/2, - scaledHeight/2);
                // debug rectangle around ellipse
                if (debug) {
                  ctx.strokeStyle = dcolor();
                  ctx.strokeRect(0, 0, scaledWidth, scaledHeight);
                }
                break;
            }
            if (debug) {
                ctx.restore();
                ctx.save();
                ctx.translate(this.x() + this.boundingMaxX + 2, this.y()+this.boundingMinY);
                ctx.font = "10px sans-serif";
                ctx.fillStyle = dcolor();
                ctx.fillText("x:" + this.x().toFixed(1), 0, 0);
                ctx.translate(0, 10);
                ctx.fillText("y:" + this.y().toFixed(1), 0, 0);
                if (this.speed_x() != 0 || this.speed_y() != 0) {
                    ctx.translate(0, 10);
                    ctx.fillText("vx:" + this.speed_x().toFixed(1), 0, 0);
                    ctx.translate(0, 10);
                    ctx.fillText("vy:" + this.speed_y().toFixed(1), 0, 0);
                }

                // draw capsule
                ctx.restore();
                ctx.save();
                ctx.strokeStyle = "green";
                ctx.beginPath();
                var cap = this.capsule();
                ctx.moveTo(cap.x(), cap.y());
                ctx.lineWidth = 5;
                ctx.lineTo(cap.x() + cap.z(), cap.y() + cap.w());

                ctx.lineWidth = 1;
                ctx.moveTo(this.x() + this.boundingMinX, this.y() + this.boundingMinY);
                ctx.lineTo(this.x() + this.boundingMaxX, this.y() + this.boundingMinY);
                ctx.lineTo(this.x() + this.boundingMaxX, this.y() + this.boundingMaxY);
                ctx.lineTo(this.x() + this.boundingMinX, this.y() + this.boundingMaxY);
                ctx.lineTo(this.x() + this.boundingMinX, this.y() + this.boundingMinY);

                // draw center
                ctx.moveTo(this.x() - 3, this.y());
                ctx.lineTo(this.x() + 3, this.y());
                ctx.moveTo(this.x(), this.y() - 3);
                ctx.lineTo(this.x(), this.y() + 3);

                ctx.stroke();
            }
            ctx.restore();
        }


        public computeBoundingBox() : void
        {
            var rx = this.radiusX();
            var ry = this.radiusY();
            if (this._angle == 0 || this._angle == 180) {
                this.boundingMinX = -rx;
                this.boundingMaxX = rx;
                this.boundingMinY = -ry;
                this.boundingMaxY = ry;
                return;
            } if (this._angle == 90 || this._angle == 270 || this._angle == -90) {
                this.boundingMinX = -ry;
                this.boundingMaxX = ry;
                this.boundingMinY = -rx;
                this.boundingMaxY = rx;
                return;
            }

            // rotate the 4 corners according to the rotation and figure out min/max values
            this.boundingMinX = Number.MAX_VALUE;
            this.boundingMaxX = Number.MIN_VALUE;
            this.boundingMinY = Number.MAX_VALUE;
            this.boundingMaxY = Number.MIN_VALUE;

            var sine = Math.sin(Math.PI * this._angle / 180);
            var cosine = Math.cos(Math.PI * this._angle / 180);

            // upper right corner
            this.updateBoundingX(this.rotateX(rx, -ry, sine, cosine));
            this.updateBoundingY(this.rotateY(rx, -ry, sine, cosine));

            // lower right corner
            this.updateBoundingX(this.rotateX(rx, ry, sine, cosine));
            this.updateBoundingY(this.rotateY(rx, ry, sine, cosine));

            // lower left corner
            this.updateBoundingX(this.rotateX(-rx, ry, sine, cosine));
            this.updateBoundingY(this.rotateY(-rx, ry, sine, cosine));

            // upper left corner
            this.updateBoundingX(this.rotateX(-rx, -ry, sine, cosine));
            this.updateBoundingY(this.rotateY(-rx, -ry, sine, cosine));
        }

        private rotateX(x : number, y : number, sine :number, cosine:number) : number
        {
            return x * cosine - y * sine;
        }
        private rotateY(x : number, y : number, sine : number, cosine : number) : number
        {
            return x * sine + y * cosine;
        }

        private rotate(v: Vector2): Vector2 {
            var sine = Math.sin(Math.PI * this._angle / 180);
            var cosine = Math.cos(Math.PI * this._angle / 180);

            var x = this.rotateX(v.x(), v.y(), sine, cosine);
            var y = this.rotateY(v.x(), v.y(), sine, cosine);
            return new Vector2(x, y);
        }

        ///
        /// Project p0-p1 onto d0 and subtract from p0-p1 to get vector
        /// returns the closest vector rooted at x1,y1 to the segment
        private minPointSegment(x0:number, y0:number, dx0:number, dy0:number, x1:number, y1:number) : Vector2 {
            var wx = x0 - x1;
            var wy = y0 - y1;
            var d = dx0 * dx0 + dy0 * dy0;
            if (Math.abs(d) < 0.00001) { // zero
                // point to point
                var result = new Vector2(wx, wy);
                (<any>result).from = 0;
                return result;
            }
            var from = 1;
            var t = -(wx * dx0 + wy * dy0) / d;
            if (t < 0) {
                t = 0;
                from = 2;
            }
            else if (t > 1) {
                t = 1;
                from = 3;
            }
            var result = new Vector2(wx + t * dx0, wy + t * dy0);
            (<any>result).from = from;
            return result;
        }

        /// <summary>
        /// Consider segments o0 + d0*s and o1 + d1*t, parametrized by s and t in [0,1]
        /// Either the segments overlap, i.e., we can find both s and t in the range [0,1], in which case, the 
        /// closest segment is 0 length.
        ///
        /// Otherwise the closest distance will be rooted at one of the four endpoints of these segments.
        /// Thus, compute 4 point/segment distances and pick the smallest one.
        /// </summary>
        private minConnectingSegment(x0: number, y0: number, dx0: number, dy0: number, x1: number, y1: number, dx1: number, dy1: number) : Vector4 {
            var b = dx0 * dy1 - dy0 * dx1;
            if (b != 0) {
                var wx = x0 - x1;
                var wy = y0 - y1;
                var d = dx0 * wy - dy0 * wx;
                var e = dx1 * wy - dy1 * wx;
                var t = d / b;
                var s = e / b;
                if (s >= 0 && s <= 1 && t >= 0 && t <= 1) {
                    var result = new Vector4(x0 + s * dx0, y0 + s * dy0, 0, 0);
                    (<any>result).from = 32;
                    return result;
                }
            }
            var v1 = this.minPointSegment(x0, y0, dx0, dy0, x1, y1);
            var v2 = this.minPointSegment(x0, y0, dx0, dy0, x1 + dx1, y1 + dy1);
            var v3 = this.minPointSegment(x1, y1, dx1, dy1, x0, y0);
            var v4 = this.minPointSegment(x1, y1, dx1, dy1, x0 + dx0, y0 + dy0);
            
            var d1 = v1.length();
            var d2 = v2.length();
            var d3 = v3.length();
            var d4 = v4.length();

            var m = Math.min(d1, d2, d3, d4);

            if (m == d1) {
                var result = new Vector4(x1, y1, v1.x(), v1.y());
                (<any>result).from = (<any>v1).from + 4;
                return result;
            }
            if (m == d2) {
                var result = new Vector4(x1 + dx1, y1 + dy1, v2.x(), v2.y());
                (<any>result).from = (<any>v1).from + 8;
                return result;
            }
            if (m == d3) {
                var result = new Vector4(x0, y0, v3.x(), v3.y());
                (<any>result).from = (<any>v1).from + 12;
                return result;
            }
            //if (m == d4) {
                var result = new Vector4(x0 + dx0, y0 + dy0, v4.x(), v4.y());
                (<any>result).from = (<any>v1).from + 16;
                return result;
            //}
        }

        private updateBoundingX(newX : number) : void
        {
            this.boundingMaxX = Math.max(this.boundingMaxX, newX);
            this.boundingMinX = Math.min(this.boundingMinX, newX);
        }

        private updateBoundingY(newY : number) : void
        {
            this.boundingMaxY = Math.max(this.boundingMaxY, newY);
            this.boundingMinY = Math.min(this.boundingMinY, newY);
        }

        private bbRadius(unitNormal : Vector2) : number
        {
            // rotate unitNormal into rotation of box of this sprite by adding -angle to it
            var angle = Math.atan(unitNormal.y()/unitNormal.x());
            angle = angle - Math.PI * this._angle / 180;
            
            // find intersect with horizontals of bb
            var tan = Math.tan(angle);
            var horiz = Math.abs(this.radiusY()/tan);
            if (horiz <= this.radiusX()) {
                // dist to bb
                return Math.abs(this.radiusY()/Math.sin(angle));
            }
            // find intersect with verticals of bb
            var vert = Math.abs(this.radiusX() * tan);
            if (vert > this.radiusY()) {
                debugger; // something is wrong
            }
            return Math.abs(this.radiusX()/Math.cos(angle));
        }
        
        public radius(unitNormal : Vector2) : number
        {
            // TODO: Explain where this funky dot product came from...
            // return Math.abs(self.boundingMaxX * unitNormal.x() + this.boundingMaxY * unitNormal.y());

            // Approximate as ellipse
            var angle = Math.atan(unitNormal.y() / unitNormal.x());
            angle = angle - Math.PI * this._angle / 180;

            var sin = Math.sin(angle);
            var cos = Math.cos(angle);

            // Detect ellipse axis rotation
            var majorAxis:number, majorAxisMult:number;
            var minorAxis:number, minorAxisMult:number;
            if (this.width >= this.height) {
                majorAxis = this.radiusX();
                minorAxis = this.radiusY();
                majorAxisMult = sin;
                minorAxisMult = cos;
            } else {
                majorAxis = this.radiusY();
                minorAxis = this.radiusX();
                majorAxisMult = cos;
                minorAxisMult = -sin;
            }

            var rad = (majorAxis * minorAxis) / (Math.sqrt(majorAxis * majorAxis * majorAxisMult * majorAxisMult + minorAxis * minorAxis * minorAxisMult * minorAxisMult));

            return rad;
        }

        private radiusX() : number { return this.width() / 2; } 
        private radiusY() : number { return this.height() / 2; }


        /// <summary>
        /// Used during a time step to determine collisions etc.
        /// </summary>
        public stepDisplacement() : Vector2 
        {
            return this.newPosition.subtract(this._position);
        }

        /// <summary>
        /// Apply gravity and user applied force and also repulsive forces due to touching of walls/other objects
        /// </summary>
        private computeForces(positionSpeed : Vector4) : Vector2 
        {
            var force = (this._parent.gravity().add(this._acceleration)).scale(this.mass());

            for (var i = 0; i < this._springs.length; i++)
            {
                var spring = this._springs[i];
                force = force.add(spring.forceOn(this));
            }

            // compute repulsive forces from walls
            for (var i = 0; i < this.normalTouchPoints.length; i++)
            {
                var unitNormal = this.normalTouchPoints[i];
                if (Vector2.dot(unitNormal, force) > 0) continue; // not pointing into the wall
                if (Vector2.dot(unitNormal, new Vector2(positionSpeed.z(), positionSpeed.w())) > 0) continue; // speeding away from wall.
                var unitParallel = unitNormal.rotate90Left();
                var proj = unitParallel.scale(Vector2.dot(force, unitParallel));
                force = proj;
            }
            if (Math.abs(force.x()) < 0.1) force = new Vector2(0, force.y());
            if (Math.abs(force.y()) < 0.1) force = new Vector2(force.x(), 0);
            return force;
        }

        private isEqualToEpsilon(x:number, p:number) : boolean
        {
            return (Math.round((x - p) / 2) == 0.0);
        }

        private derivativePosAndSpeed(dT:number, positionSpeed:Vector4) : Vector4
        {
            var accel = this.computeForces(positionSpeed).scale(1 / this.mass());

            // apply friction directly (instead of as a force)

            return new Vector4((positionSpeed.z() + dT * accel.x()),
                               (positionSpeed.w() + dT * accel.y()),
                               accel.x(), accel.y());
        }

        private actualFriction() : number
        {
            if (isNaN(this._friction)) return this._parent._worldFriction;
            return this._friction;
        }


        private RungaKutta(dT:number): Vector4
        {
            var yi = Vector4.fromV2V2(this._position, this._speed);
            var u1 = this.derivativePosAndSpeed(0, yi).scale(dT);
            var u2 = this.derivativePosAndSpeed(dT / 2, yi.add(u1.scale(.5))).scale(dT);
            var u3 = this.derivativePosAndSpeed(dT / 2, yi.add(u2.scale(.5))).scale(dT);
            var u4 = this.derivativePosAndSpeed(dT, yi.add(u3)).scale(dT);

            var avg = (u1.add(u2.scale(2)).add(u3.scale(2)).add(u4)).scale(1/6);

            // clean accel
            var nz = avg.z();
            if (avg.z() < 0.1 && avg.z() > -0.1) nz = 0;
            var nw = avg.w();
            if (avg.w() < 0.1 && avg.w() > -0.1) nw = 0;

            var nx = avg.x() * (1 - this.actualFriction());
            var ny = avg.y() * (1 - this.actualFriction());
            avg = new Vector4(nx,ny,nz,nw);

            this.midSpeed = new Vector2(avg.x() / dT, avg.y() / dT);

            var yip1 = yi.add(avg);

            // apply friction directly (instead of as a force)
            yip1 = yip1.withW(yip1.w() * (1 - this.actualFriction()))
            yip1 = yip1.withZ(yip1.z() * (1 - this.actualFriction()));
            return yip1;
        }

        /// <summary>
        /// Make a time step. 
        ///   - Uses speed, position to create newSpeed and newPosition
        /// 
        /// CommitUpdate moves the newPosition, newSpeed into position, speed, thereby finalizing it. 
        /// 
        /// Use Euler midpoint method.
        /// 
        /// This method must be IDEMPOTENT so we can call it a few times during a step with different partial time steps.
        /// </summary>
        public update(dT:number):void
        {
            TDev.Contract.Requires(dT >= 0);

            if (!this._parent) return;
            var yip1 = this.RungaKutta(dT);
            // compute final displacement (position is updated after collision detection)
            this.newPosition = new Vector2(yip1.x(), yip1.y());
            this.newSpeed = new Vector2(yip1.z(), yip1.w());
            this.newRotation = this._angle + this._angular_speed * dT;
        }
        F
        public commitUpdate(rt : Runtime, dT : number): void
        {
            if (!this._lastPosition || !this._lastPosition.equals(this.newPosition) || this._angle != this.newRotation)
                this.changed();
            this._position = this.newPosition;
            this._angle = this.newRotation;
            this._speed = this.newSpeed;
            if (this._animations) {
                var anyDone = false;
                this._animations.forEach(anim => anyDone = !anim.evolve(rt, dT) || anyDone);
                // cleanup on demand
                if (anyDone) { 
                    this._animations = this._animations.filter(anim => anim.isActive);
                    if (this._animations.length == 0) this._animations = undefined;
                }
            }
            this.computeBoundingBox();
        }

        //? Hide sprite.
        //@ writesMutable
        public hide() : void {
            this._hidden = true;
        }

        //? Returns true if sprite is not hidden
        //@ readsMutable
        public is_visible() : boolean {
            return !this._hidden;
        }

        //? Moves sprite.
        //@ writesMutable
        public move(delta_x:number, delta_y:number) : void {
            this._position = new Vector2(this._position._x + delta_x, this._position._y + delta_y);
        }

        //? Moves sprite towards other sprite.
        //@ writesMutable [other].readsMutable
        //@ [fraction].defl(1)
        public move_towards(other:Sprite, fraction:number) : void
        {
            var center1 = this._position;
            var center2 = other._position;
            var dir = center2.subtract(center1).scale(fraction);
            this.move(dir._x, dir._y);
        }

        public capsule(): Vector4 {
            var s0x, s0y, s1x, s1y, d0x, d0y, d1x, d1y;
            if (this._width > this._height) {
                d0x = (this._width - this._height);
                d0y = 0;
                s0x = -d0x / 2;
                s0y = 0;
            }
            else {
                d0x = 0; 
                d0y = (this._height - this._width);
                s0x = 0;
                s0y = -d0y / 2;
            }
            var d0 = this.rotate(new Vector2(d0x, d0y));
            var s0 = this.rotate(new Vector2(s0x, s0y)); 
            return new Vector4(this.x() + s0.x(), this.y() + s0.y(), d0.x(), d0.y());
        }

        public capsuleRadius(): number {
            if (this._width < this._height) {
                return this._width / 2;
            }
            return this._height / 2;
        }

        //? Do the sprites overlap
        //@ readsMutable [other].readsMutable
        public overlaps_with(other:Sprite) : boolean {
            if (!this._parent) return false;
            if (!other._parent) return false;

            if (isNaN(this.x()) || isNaN(this.y()) || isNaN(other.x()) || isNaN(other.y())) return false;
            if (this.x() + this.boundingMaxX <= other.x() + other.boundingMinX) return false;
            if (this.x() + this.boundingMinX >= other.x() + other.boundingMaxX) return false;
            if (this.y() + this.boundingMaxY <= other.y() + other.boundingMinY) return false;
            if (this.y() + this.boundingMinY >= other.y() + other.boundingMaxY) return false;

            // capsule-capsule intersection
            var cap1 = this.capsule();
            var cap2 = other.capsule();

            //var dist = this.segmentSegmentDistanceSquared(cap1.x(), cap1.y(), cap1.z(), cap1.w(), cap2.x(), cap2.y(), cap2.z(), cap2.w());
            var seg = this.minConnectingSegment(cap1.x(), cap1.y(), cap1.z(), cap1.w(), cap2.x(), cap2.y(), cap2.z(), cap2.w());
            if (this._parent) {
                this._parent._minSegments.push(seg);
            }
            var radi = this.capsuleRadius() + other.capsuleRadius();
            var dist = seg.z() * seg.z() + seg.w() * seg.w();
            if (dist >= radi*radi) {
                (<any>seg).overlap = false;
                return false;
            }
            (<any>seg).overlap = true;
            return true;

            var center1 = this._position;
            var center2 = other._position;
            var distVec = center2.subtract(center1);
            var dist = distVec.length();
            if (dist == 0) return true;
            var norm = distVec.normalize();

            var radius1 = this.radius(norm);
            var radius2 = other.radius(norm);
            if (radius1 + radius2 >= dist) return true;
            return false;
        }

        //? Returns the subset of sprites in the given set that overlap with sprite.
        //@ readsMutable [sprites].readsMutable
        public overlap_with(sprites:SpriteSet) : SpriteSet {
            if (!this._parent) return new SpriteSet();

            return this._parent.overlapWithAny(this, sprites);
        }

        //? Are these the same sprite
        //@ readsMutable [other].readsMutable
        public equals(other:Sprite) : boolean {
            return this === other;
        }

        //? Updates picture on a picture sprite (if it is a picture sprite)
        //@ writesMutable picAsync
        public set_picture(pic:Picture, r:ResumeCtx) : void
        {
            if (this.spriteType != SpriteType.Picture) r.resume();
            else
                pic.loadFirst(r, () => {
                    this.setPictureInternal(pic);
                })
        }

        public setPictureInternal(pic:Picture):void
        {
            this._picture = pic;
            this._width = pic.widthSync();
            this._height = pic.heightSync();
            this.computeBoundingBox();
            this.contentChanged();
        }

        //? The picture on a picture sprite (if it is a picture sprite)
        //@ readsMutable
        public picture(): Picture { return this._picture; }

        //? Sets the position in pixels
        //@ writesMutable
        public set_pos(x:number, y:number) : void { this._position = new Vector2(x,y); }

        //? Sets the speed in pixels/sec
        //@ writesMutable
        public set_speed(vx:number, vy:number) : void { this._speed = new Vector2(vx,vy); }

        //? Show sprite.
        //@ writesMutable
        public show() : void {
            this._hidden = false;
        }

        //? Sets sprite speed direction towards other sprite with given magnitude.
        //@ writesMutable [other].readsMutable
        public speed_towards(other:Sprite, magnitude:number) : void {
            var center1 = this._position;
            var center2 = other._position;
            var speed = center2.subtract(center1);
            speed = speed.normalize();
            speed = speed.scale(magnitude);

            this._speed = speed;
        }

        //? Sets the clipping area for an image sprite (if it is an image sprite)
        //@ writesMutable
        //@ [width].defl(48) [height].defl(48)
        public set_clip(left: number, top: number, width: number, height: number): void
        {
            if (this._picture 
                && isFinite(left) && isFinite(top) && isFinite(width) && isFinite(height)) 
            {
                this._frame = undefined;
                this._width = width;
                this._height = height;
                this._clip = [left, top, width, height];
                this.computeBoundingBox();
                this.contentChanged();
            }
        }

        private _frame : SpriteFrame;
        public setFrame(frame : SpriteFrame) {
            if (this._frame != frame) {
                this._frame = frame;
                if (this._width <= 0) this._width = frame.width;                
                this._height = frame.width <= 0 ? frame.height : this._width / frame.width * frame.height;
                this._clip = [frame.x, frame.y, frame.width, frame.height];
                // this._angle = frame.rotated ? -90 : 0;
                this.computeBoundingBox();
                this.contentChanged();
            }
        }

        //? Use `Sprite Sheet` instead.
        //@ writesMutable obsolete
        //@ [x].defl(48)
        public move_clip(x:number, y:number) : void
        {
            if (this._clip && this._picture) {
                var left = (this._clip[0] + x) % this._picture.widthSync();
                if (left < 0) left += this._clip[2];
                else if (left + this._clip[2] > this._picture.widthSync()) left = 0;
                var top = (this._clip[1] + y) % this._picture.heightSync();
                if (top < 0) top += this._clip[3];
                else if (top + this._clip[3] > this._picture.heightSync()) top = 0;
                this._clip = [left, top, this._clip[2], this._clip[3]];
                this.computeBoundingBox();
                this.contentChanged();
            }
        }

        //? Delete sprite.
        //@ writesMutable
        public delete_() : void
        {
            if (! this._parent) {
                return;
            }
            this._parent.deleteSprite(this);
            this._parent = null;
        }
        
        //? True if sprite is deleted.
        //@ readsMutable
        public is_deleted(): boolean {
            return !this._parent;
        }

        // return true if x, y is within the sprite extent (rotated bounding box)
        public contains(x:number, y:number) : boolean {
            var diff = Vector2.mk(x, y).subtract(this._position);
            var norm = diff.normalize();
            var rad = this.bbRadius(norm);
            if (diff.length() <= rad) return true;
            return false;
        }

        public addSpring(sp:Spring) : void 
        {
            this._springs.push(sp);
        }

        public removeSpring(sp:Spring) : void 
        {
            var idx = this._springs.indexOf(sp);
            if (idx > -1)
                this._springs.splice(idx, 1);
        }

        private _z_index : number = undefined;

        //? Gets the z-index of the sprite
        //@ readsMutable
        public z_index() : number { return this._z_index; }

        //? Sets the z-index of the sprite
        //@ writesMutable
        public set_z_index(zindex: number): void {
            if (this._z_index != zindex) {
                this._z_index = zindex;
                if (this._parent)
                    this._parent.spritesChanged();
            }
        }

        public createAnimation() : SpriteAnimation {
            var anim = new SpriteAnimation(this);
            return anim;
        }

        public startAnimation(anim : SpriteAnimation) {
            Util.assert(anim._sprite == this);
            if(!this._animations) this._animations = [];
            this._animations.push(anim);
        }

        //? Starts a new tween animation.
        public create_animation() : SpriteAnimation {
            var anim = this.createAnimation();
            this.startAnimation(anim);
            return anim;
        }

        public debuggerChildren() {
            return {
                'Z-index': this.z_index(),
                Friction: this.friction(),
                'Angular speed': this.angular_speed(),
                Angle: this.angle(),
                Elasticity: this.elasticity(),
                'Speed X': this.speed_x(),
                'Speed Y': this.speed_y(),
                X: this.x(),
                Y: this.y(),
                Color: this.color(),
                Opacity: this.opacity(),
                Text: this.text(),
                Picture: this.picture(),
                Mass: this.mass(),
                'Acceleration X': this.acceleration_x(),
                'Acceleration Y': this.acceleration_y(),
                Visible: this.is_visible(),                          
            };
        }
    }
}
