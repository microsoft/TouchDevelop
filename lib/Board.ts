///<reference path='refs.ts'/>

module TDev { export module RT {
    //? A board to build 2D games
    //@ icon("gameboard") ctx(general,gckey,enumerable)
    export class Board
        extends RTValue
    {
        private _landscape: boolean;
        public _width:number;
        public _height:number;
        public _full: boolean;
        public scaleFactor = 1.0;
        private container:HTMLElement;
        private canvas:HTMLCanvasElement;
        private ctx : CanvasRenderingContext2D;
        private sprites: Sprite[] = [];
        private _orderedSprites: Sprite[];
        public backgroundColor:Color = null;
        private backgroundPicture:Picture = null;
        private backgroundCamera: Camera = null;
        private _boundaryDistance : number = NaN;
        private _everyFrameTimer : Timer = undefined;

        constructor() {
            super()
        }
        private _gravity : Vector2 = new Vector2(0,0);
        public _worldFriction : number = 0;
        private _debugMode : boolean = false;
        private _lastUpdateMS : number = 0; // no serialization, relative time since board initialized.
        private _lastTimeDelta : number = 0; // no serialization
        public _startTime : number = 0; // no serialization
        private _touched : boolean = false; // no serialization
        private _touchStart : Vector3 = Vector3.mk(0,0,0); // no serialization
        private _touchCurrent : Vector3 = Vector3.mk(0,0,0); // no serialization
        private _touchEnd : Vector3 = Vector3.mk(0,0,0); // no serialization
        private _touchVelocity : Vector3 = Vector3.mk(0,0,0); // no serialization
        private _touchedSpriteStack: Sprite[];
        private _touchLast: Vector3;
        private _runtime:Runtime;

        /// <summary>
        /// for debugging only
        /// </summary>
        public _minSegments: Vector4[] = [];

        /// <summary>
        /// Constructed on demand from obstacles and in the constructor. No serialization
        /// </summary>
        private _walls : WallSegment[] = [];     // not serialized
        private _obstacles : Obstacle[] = [];
        private _springs: Spring[] = [];
        private _backgroundScene: BoardBackgroundScene = undefined;

        static mk(rt:Runtime, landscape : boolean, w:number, h:number, full:boolean)
        {
            var b = new Board();
            b._landscape = landscape;
            b._width = w;
            b._height = h;
            b._full = full;
            b._startTime = rt.currentTime();
            b.backgroundColor = Colors.transparent();
            b.init(rt);
            return b;
        }

        public init(rt:Runtime)
        {
            this._runtime = rt;
            this.canvas = <HTMLCanvasElement> document.createElement("canvas");
            this.canvas.className = "boardCanvas";
            this.updateScaleFactor();
            this.container = div("boardContainer", this.canvas);
            this.ctx = this.canvas.getContext("2d");
            this.container.setChildren([this.canvas]);
            (<any>this.container).updateSizes = () => {
                this.updateScaleFactor();
                this.redrawBoardAndContents();
            };

            var handler = new TouchHandler(this.canvas, (e,x,y) => { this.touchHandler(e, x, y); });

        }

        private updateScaleFactor()
        {
            Util.assert(!!this._runtime);
            if (!this._runtime) return;

            var s0:number;
            var s1:number;

            if (this._full) {
                s0 = this._runtime.host.fullWallWidth() / this._width;
                s1 = this._runtime.host.fullWallHeight() / this._height;
            } else {
                var w = this._runtime.host.wallWidth;
                if (this.container && this.container.offsetWidth)
                    w = this.container.offsetWidth;
                s0 = w / this._width;
                s1 = this._runtime.host.wallHeight / this._height;
            }

            if (s0 > s1) s0 = s1;

            var ww = this._width * s0;
            var hh = this._height * s0;

            this.scaleFactor = s0;
            this.canvas.width = ww * SizeMgr.devicePixelRatio;
            this.canvas.height = hh * SizeMgr.devicePixelRatio;
            this.canvas.style.width = ww + "px";
            this.canvas.style.height = hh + "px";

            if (this._full) {
                var topMargin = (this._runtime.host.fullWallHeight() - hh) / 2;
                this.canvas.style.marginTop = topMargin + "px";
            }
        }

        private swipeThreshold = 10;
        private dragThreshold = 5;

        private onTap: Event_ = new Event_();
        private onTouchDown: Event_ = new Event_();
        private onTouchUp: Event_ = new Event_();
        private onSwipe: Event_ = new Event_();

        private _prevTouchTime : number;
        private _touchDeltaTime : number;
        private _touchPrevious : Vector3 = Vector3.mk(0,0,0); // no serialization
        private _touchDirection : Vector3 = Vector3.mk(0,0,0); // no serialization

        private touchHandler(e:string, x:number, y:number) : void {
            Util.assert(!!this._runtime);
            if (!this._runtime) return;

            x = Math.round(x / this.scaleFactor);
            y = Math.round(y / this.scaleFactor);
            switch (e) {
                case "down":
                    this._touched = true;
                    this._touchPrevious = this._touchCurrent = this._touchLast = this._touchStart = Vector3.mk(x, y, 0);
                    this._touchedSpriteStack = this.findTouchedSprites(x, y);
                    this._prevTouchTime = this._runtime.currentTime();
                    this._touchDeltaTime = 0;
                    this._touchDirection = Vector3.mk(0, 0, 0);
                    this.queueTouchDown(this._touchedSpriteStack, [x, y]);
                    this._runtime.queueBoardEvent(["touch down: "], [this], [x, y]);
                    if (!!this._touchedSpriteStack) {
                        this._runtime.queueBoardEvent(["touch over "], this._touchedSpriteStack, [x, y], true, true);
                    }
                    break;
                case "move":
                    this._touchCurrent = Vector3.mk(x, y, 0);
                    var now = this._runtime.currentTime();
                    var deltaMove = this._touchCurrent.subtract(this._touchPrevious);
                    var deltaTime = now - this._prevTouchTime;
                    if (deltaTime > 50 || deltaMove.length() > 20) {
                        this._touchDirection = deltaMove;
                        this._touchDeltaTime = deltaTime;
                    }
                    if (!!this._touchedSpriteStack) {
                        var dist = this._touchCurrent.subtract(this._touchLast);
                        if (dist.length() > this.dragThreshold) {
                            this._touchLast = this._touchCurrent;
                            this.queueDrag(this._touchedSpriteStack, [x, y, dist._x, dist._y]);
                            this._runtime.queueBoardEvent(["drag sprite in ", "drag sprite: "], this._touchedSpriteStack, [x, y, dist._x, dist._y]);
                        }
                    }
                    var currentStack = this.findTouchedSprites(x, y);
                    if (!!currentStack) {
                        this._runtime.queueBoardEvent(["touch over "], currentStack, [x, y], true, true);
                    }
                    break;
                case "up":
                    var currentPoint = Vector3.mk(x, y, 0);
                    this._touchEnd = this._touchCurrent = currentPoint;
                    this._touched = false;
                    if (this._touchDeltaTime > 0) {
                        this._touchVelocity = this._touchDirection.scale(1000 / this._touchDeltaTime);
                    }
                    else {
                        this._touchVelocity = Vector3.mk(0, 0, 0);
                    }
                    var dist = this._touchEnd.subtract(this._touchStart);
                    var stack: any[] = this._touchedSpriteStack;
                    if (!stack) { stack = []; }
                    stack.push(this); // add board
                    if (dist.length() > this.swipeThreshold) {
                        this.queueSwipe(this._touchedSpriteStack, [this._touchStart._x, this._touchStart._y, dist._x, dist._y]);
                        this._runtime.queueBoardEvent(["swipe sprite in ", "swipe sprite: ", "swipe board: "], stack,
                            [this._touchStart._x, this._touchStart._y, dist._x, dist._y]);
                    }
                    else {
                        this.queueTap(this._touchedSpriteStack, [x, y]);
                        this._runtime.queueBoardEvent(["tap sprite in ", "tap sprite: ", "tap board: "], stack, [x, y]);
                    }
                    this.queueTouchUp(this._touchedSpriteStack, [x, y]);
                    this._runtime.queueBoardEvent(["touch up: "], [this], [x, y]);
                    break;
            }

        }

        private queueDrag(stack: Sprite[], args): boolean {
            if (!stack) return false;
            for (var i = 0; i < stack.length; i++) {
                var sprite = stack[i];
                if (sprite instanceof Board) continue;
                if (sprite.onDrag.handlers) {
                    this._runtime.queueLocalEvent(sprite.onDrag, args);
                    return true;
                }
            }
            return false;
        }

        private queueTouchDown(stack: Sprite[], args): boolean {
            if (stack && stack.length > 0) {
                for (var i = 0; i < stack.length; i++) {
                    var sprite = stack[i];
                    if (sprite instanceof Board) continue;
                    if (sprite.onTouchDown.handlers) {
                        this._runtime.queueLocalEvent(sprite.onTouchDown, args);
                        return true;
                    }
                }
            }
            else {
                if (this.onTouchDown.handlers) {
                    this._runtime.queueLocalEvent(this.onTouchDown, args);
                    return true;
                }
            }
            return false;
        }

        private queueTouchUp(stack: Sprite[], args): boolean {
            if (stack && stack.length > 0) {
                for (var i = 0; i < stack.length; i++) {
                    var sprite = stack[i];
                    if (sprite instanceof Board) continue;
                    if (sprite.onTouchUp.handlers) {
                        this._runtime.queueLocalEvent(sprite.onTouchUp, args);
                        return true;
                    }
                }
            }
            else {
                if (this.onTouchUp.handlers) {
                    this._runtime.queueLocalEvent(this.onTouchUp, args);
                    return true;
                }
            }
            return false;
        }

        private queueTap(stack: Sprite[], args): boolean {
            if (stack && stack.length > 0) {
                for (var i = 0; i < stack.length; i++) {
                    var sprite = stack[i];
                    if (sprite instanceof Board) continue;
                    if (sprite.onTap.handlers) {
                        this._runtime.queueLocalEvent(sprite.onTap, args);
                        return true;
                    }
                }
            }
            if (this.onTap.handlers) {
                this._runtime.queueLocalEvent(this.onTap, args);
                return true;
            }
            return false;
        }

        private queueSwipe(stack: Sprite[], args): boolean {
            if (stack && stack.length > 0) {
                for (var i = 0; i < stack.length; i++) {
                    var sprite = stack[i];
                    if (sprite instanceof Board) continue;
                    if (sprite.onSwipe.handlers) {
                        this._runtime.queueLocalEvent(sprite.onSwipe, args);
                        return true;
                    }
                }
            }
            else {
                if (this.onSwipe.handlers) {
                    this._runtime.queueLocalEvent(this.onSwipe, args);
                    return true;
                }
            }
            return false;
        }

        private findTouchedSprites(x:number, y:number) : Sprite[] {
            var candidates = this.orderedSprites()
                .filter(sp => !sp._hidden && sp.contains(x, y))
                .reverse();
            if (candidates.length == 0)
                return undefined;
            return candidates;
        }

        private applyBackground()
        {
            this.ctx.save();
            this.ctx.clearRect(0, 0, this._width, this._height);
            if (!!this.backgroundCamera) {
                //  TODO: display video element in div to start streaming
            }
            // it may not have a canvas when the picture is still loading and an resize event occurs
            else if (!!this.backgroundPicture && this.backgroundPicture.hasCanvas()) {
                this.ctx.drawImage(this.backgroundPicture.getCanvas(), 0, 0,
                    this.backgroundPicture.widthSync(), this.backgroundPicture.heightSync(), 0, 0, this._width, this._height);
            } else if (!!this.backgroundColor) {
                this.ctx.fillStyle = this.backgroundColor.toHtml();
                this.ctx.fillRect(0, 0, this._width, this._height);
            }
            if (this._backgroundScene) this._backgroundScene.render(this._width, this._height, this.ctx);
            this.ctx.restore();
        }

        //? Gets the height in pixels
        public height() : number { return this._height; }

        //? Gets the sprite count
        //@ readsMutable
        public count(): number { return this.sprites.length; }

        public get_enumerator() { return this.sprites.slice(0); }

        //? Gets the width in pixels
        public width() : number { return this._width; }

        //? True if board is touched
        //@ tandre
        public touched() : boolean {
            return this._touched;
        }

        //? Last touch start point
        //@ tandre
        public touch_start() : Vector3 {
            return this._touchStart;
        }

        //? Current touch point
        //@ tandre
        public touch_current() : Vector3 {
            return this._touchCurrent;
        }

        //? Last touch end point
        //@ tandre
        public touch_end() : Vector3 {
            return this._touchEnd;
        }

        //? Final touch velocity after touch ended
        //@ tandre
        public touch_velocity() : Vector3 {
            return this._touchVelocity;
        }

        //? Create walls around the board at the given distance.
        //@ writesMutable
        public create_boundary(distance:number) : void
        {
            if (!isNaN(this._boundaryDistance)) return;
            this._boundaryDistance = distance;
            this.initializeCanvasBoundaries(distance);
        }

        /// <summary>
        /// Call only after canvasHeight has been determined (in deserialize)
        /// </summary>
        private initializeCanvasBoundaries(distance:number):void
        {
            if (isNaN(distance)) return;

            // add surrounding walls (orient counter-clock-wise)
            this._walls.push(WallSegment.mk(-distance, -distance, this.width() + 2 * distance, 0, 1, 0));
            this._walls.push(WallSegment.mk(this.width() + distance, -distance, 0, this.height() + 2 * distance, 1, 0));
            this._walls.push(WallSegment.mk(this.width() + distance, this.height() + distance, -(this.width() + 2 * distance), 0, 1, 0));
            this._walls.push(WallSegment.mk(-distance, this.height() + distance, 0, -(this.height() + 2 * distance), 1, 0));
        }

        private addObstacle(o : Obstacle): void
        {
            this._walls.push(WallSegment.mk(o.x, o.y, o.xextent, o.yextent, o.elasticity, o.friction, o));
            this._walls.push(WallSegment.mk(o.x + o.xextent, o.y + o.yextent, -o.xextent, -o.yextent, o.elasticity, o.friction, o));
            this._obstacles.push(o);
        }

        //? Create a new collection for sprites.
        public create_sprite_set() : SpriteSet {
            return new SpriteSet();
        }

        public deleteSprite(sprite : Sprite) : void {
            var idx = this.sprites.indexOf(sprite);
            if (idx < 0) return;
            this.sprites.splice(idx, 1);
            this.spritesChanged();
        }

        public spritesChanged() {
            this._orderedSprites = undefined;
        }

        //? gets the timer that fires for every display frame.
        public frame_timer(s : IStackFrame): Timer {
            if(!this._everyFrameTimer) this._everyFrameTimer = new Timer(s.rt, 0.02, false);
            return this._everyFrameTimer;
        }

        //? add an action that fires for every display frame.
        //@ ignoreReturnValue
        public add_on_every_frame(body: Action, s: IStackFrame): EventBinding {
            return this.on_every_frame(body, s);
        }

        //? add an action that fires for every display frame.
        //@ ignoreReturnValue
        public on_every_frame(body: Action, s: IStackFrame): EventBinding {
            return this.frame_timer(s).on_trigger(body);
        }

        //? Stops and clears all the `every frame` timers
        public clear_every_frame_timers() {
            if (this._everyFrameTimer) {
                this._everyFrameTimer.clear();
                this._everyFrameTimer = undefined;
                this._everyFrameOnSprite = false;
            }
        }

        //? set the handler that is invoked when the board is tapped
        //@ ignoreReturnValue
        //@ writesMutable
        public on_tap(tapped: PositionAction) : EventBinding {
            return this.onTap.addHandler(tapped);
        }

        //? set the handler that is invoked when the board is swiped
        //@ ignoreReturnValue
        //@ writesMutable
        public on_swipe(swiped: VectorAction) : EventBinding {
            return this.onSwipe.addHandler(swiped);
        }

        //? set the handler that is invoked when the board is touched
        //@ writesMutable
        //@ ignoreReturnValue
        public on_touch_down(touch_down: PositionAction) : EventBinding {
            return this.onTouchDown.addHandler(touch_down);
        }

        //? set the handler that is invoked when the board touch is released
        //@ writesMutable
        //@ ignoreReturnValue
        public on_touch_up(touch_up: PositionAction) : EventBinding {
            return this.onTouchUp.addHandler(touch_up);
        }

        public tick: number = 0;
        //? Update positions of sprites on board.
        //@ timestamp
        //@ writesMutable
        public evolve() : void
        {
            Util.assert(!!this._runtime);
            if (!this._runtime) return;

            this.tick++; if (isNaN(this.tick)) this.tick = 0;
            var now = this._runtime.currentTime();
            var newDelta = this._lastTimeDelta = (now - this._startTime) - this._lastUpdateMS;
            //if (newDelta === undefined || newDelta < 0) {
            //  throw new Error("negative dt");
            //}
            this._lastUpdateMS += newDelta;
            var dT = Math_.clamp(0, 0.2, newDelta / 1000);
            this.sprites.forEach(sprite => sprite.update(dT));
            this.detectCollisions(dT);
            this.sprites.forEach(sprite => sprite.commitUpdate(this._runtime, dT));
        }

        private detectCollisions(dT:number):void
        {
            // detect wall collisions
            for (var i = 0; i < this.sprites.length; i++)
            {
                var s = this.sprites[i];
                if (!!s._location) continue;
                this.detectWallCollision(s, dT);
            }
        }

        private detectWallCollision(sprite:Sprite, dT:number):void
        {
            sprite.normalTouchPoints.clear(); // this means clear the array!

            for (var i = 0; i < this._walls.length; i++)
            {
                var wall = this._walls[i];
                if(wall.processPotentialCollision(sprite, dT) && wall._obstacle)
                    wall._obstacle.raiseCollision(this._runtime, sprite);
            }
            // do it twice to get corners right
            for (var i = 0; i < this._walls.length; i++)
            {
                var wall = this._walls[i];
                if(wall.processPotentialCollision(sprite, dT) && wall._obstacle)
                    wall._obstacle.raiseCollision(this._runtime, sprite);
            }
        }



        public updateViewCore(s: IStackFrame, b: BoxBase) {

            if (b instanceof WallBox)
               (<WallBox> b).fullScreen = this._full;
            this.redrawBoardAndContents();
        }

        public getViewCore(s:IStackFrame, b:BoxBase) : HTMLElement
        {
            // called when board gets posted
            this._touched = false; // clear any past touches that were not lifted

            return this.container;
        }

        //? Checks if the board is the same instance as the other board.
        public equals(other_board: Board): boolean {
            return this == other_board;
        }

        //? Gets the background scene
        //@ readsMutable
        public background_scene(): BoardBackgroundScene {
            if (!this._backgroundScene)
                this._backgroundScene = new BoardBackgroundScene(this);
            return this._backgroundScene;
        }

        //? Sets the background color
        //@ writesMutable
        //@ [color].deflExpr('colors->random')
        public set_background(color:Color) : void
        {
            this.backgroundCamera = null;
            this.backgroundColor = color;
            this.backgroundPicture = null;
        }

        //? Sets the background camera
        //@ writesMutable
        //@ cap(camera)
        //@ [camera].deflExpr('senses->camera')
        public set_background_camera(camera: Camera): void
        {
            this.backgroundCamera = camera;
            this.backgroundColor = null;
            this.backgroundPicture = null;
        }

        //? Sets the background picture
        //@ writesMutable picAsync
        //@ embedsLink("Board", "Picture")
        public set_background_picture(picture:Picture, r:ResumeCtx) : void
        {
            this.backgroundCamera = null;
            this.backgroundColor = null;
            this.backgroundPicture = picture;
            picture.loadFirst(r, null);
        }

        //? In debug mode, board displays speed and other info of sprites
        //@ [debug].defl(true)
        public set_debug_mode(debug:boolean) : void {
            this._debugMode = debug;
        }

        //? Sets the default friction for sprites to a fraction of speed loss between 0 and 1
        //@ writesMutable
        //@ [friction].defl(0.01)
        public set_friction(friction:number) : void
        {
            this._worldFriction = friction;
        }

        //? Gets a value indicating if the board is designed to be viewed in landscape mode
        public is_landscape(): boolean
        {
            return this._landscape;
        }

        //? Sets the uniform acceleration vector for objects on the board to pixels/sec^2
        //@ writesMutable [y].defl(200)
        public set_gravity(x:number, y:number) : void
        {
           this._gravity = new Vector2(x, y);
        }

        public gravity() : Vector2 { return this._gravity; }

        //? Gets the sprite indexed by i
        //@ readsMutable
        public at(i:number) : Sprite { return this.sprites[i]; }

        private initialX() : number { return this.width() / 2; }
        private initialY() : number { return this.height() / 2; }

        private _everyFrameOnSprite = false;
        public enableEveryFrameOnSprite(s:IStackFrame)
        {
            if (this._everyFrameOnSprite) return;
            this._everyFrameOnSprite = true;
            var handler:any = (bot, prev) => {
                var q = this._runtime.eventQ
                var args = []
                this.sprites.forEach(s => {
                    if (s.onEveryFrame.pendinghandlers == 0)
                        q.addLocalEvent(s.onEveryFrame, args)
                })
                bot.entryAddr = prev
                return bot
            };
            this.on_every_frame(handler, s);
        }

        //? Make updates visible.
        //@ writesMutable
        public update_on_wall() : void
        {
            this.redrawBoardAndContents();
        }

        private orderedSprites() : Sprite[] {
            if (!this._orderedSprites) {
                this._orderedSprites = this.sprites.slice(0);
                this._orderedSprites.stableSort((a, b) => a.z_index() - b.z_index());
            }
            return this._orderedSprites;
        }

        private redrawBoardAndContents() : void
        {
            var isDebugMode = this._debugMode && (this._runtime && !this._runtime.currentScriptId);

            this.ctx.save();
            var scale = this.scaleFactor * SizeMgr.devicePixelRatio;
            this.ctx.scale(scale, scale);

            this.applyBackground();
            this.orderedSprites().forEach(s => s.redraw(this.ctx, isDebugMode));
            this.renderObstacles();
            if (isDebugMode) {
                this.debugGrid();
                this.debugSprings();
                this.debugSegments();
            }
            this.ctx.restore();
        }

        public renderingContext() { return this.ctx; }

        private debugGrid() {
            this.ctx.save();
            this.ctx.beginPath();
            var w = this.width();
            var h = this.height();
            this.ctx.strokeStyle = "rgba(90, 90, 90, 0.7)";
            this.ctx.fillStyle = "rgba(90, 90, 90, 0.7)";
            this.ctx.lineWidth = 1;
            this.ctx.font = "12px sans-serif";
            // this.ctx.globalAlpha = 0.8;
            for(var y = 0; y <= h; y += 100) {
                this.ctx.moveTo(0, y);
                this.ctx.lineTo(w, y);
                if (y > 0 && y % 100 == 0)
                    this.ctx.fillText(y.toString(), 2, y - 5);
                this.ctx.stroke();
            }
            for(var x = 0; x <= w; x += 100) {
                this.ctx.moveTo(x, 0);
                this.ctx.lineTo(x, h);
                if (x > 0 && x % 100 == 0)
                    this.ctx.fillText(x.toString(), x - 15, 10);
                this.ctx.stroke();
            }
            this.ctx.restore();
        }

        private debugSegments(): void {
            this.ctx.save();
            this.ctx.beginPath();

            for (var i = 0; i < this._minSegments.length; ++i) {
                var seg = this._minSegments[i];

                if ((<any>seg).overlap) {
                    this.ctx.fillStyle = "green";
                    this.ctx.strokeStyle = "green";
                }
                else {
                    this.ctx.fillStyle = "red";
                    this.ctx.strokeStyle = "red";
                }
                this.ctx.font = "20px sans-serif";

                this.ctx.lineWidth = 4;
                this.ctx.moveTo(seg.x(), seg.y());
                this.ctx.lineTo(seg.x() + seg.z(), seg.y() + seg.w());
                this.ctx.fillText((<any>seg).from + "", seg.x() + seg.z(), seg.y() + seg.w());
            }

            this.ctx.stroke();
            this.ctx.restore();
            if (this._minSegments.length > 0) {
                debugger;
                this._minSegments = [];
            }
        }

        private debugSprings(): void {
            this.ctx.save();
            this.ctx.strokeStyle = "gray";
            this.ctx.beginPath();
            for (var i = 0; i < this._springs.length; i++) {
                var o = this._springs[i];

                this.ctx.moveTo(o.sprite1.x(), o.sprite1.y());
                this.ctx.lineTo(o.sprite2.x(), o.sprite2.y());
            }
            this.ctx.stroke();
            this.ctx.restore();

        }

        private renderObstacles() : void
        {
            this.ctx.save();
            for (var i = 0; i < this._obstacles.length; i++) {
                var o = this._obstacles[i];
                if (!o.isValid()) continue;

                this.ctx.beginPath();
                this.ctx.lineWidth = o._thickness;
                this.ctx.strokeStyle = o._color.toHtml();
                this.ctx.moveTo(o.x, o.y);
                this.ctx.lineTo(o.x+o.xextent, o.y+o.yextent);
                this.ctx.stroke();
            }
            this.ctx.restore();
        }

        public mkSprite(tp:SpriteType, w:number, h:number)
        {
            var s = Sprite.mk(tp, this.initialX(), this.initialY(), w, h);
            this.addSprite(s);
            return s;
        }

        private addSprite(s:Sprite)
        {
            s._parent = this;
            s.set_z_index(0);
            this.sprites.push(s);
            s.changed();
            this.spritesChanged();
        }

        //? Create a new ellipse sprite.
        //@ readsMutable [result].writesMutable
        //@ [width].defl(20) [height].defl(20)
        //@ embedsLink("Board", "Sprite")
        public create_ellipse(width:number, height:number) : Sprite { return this.mkSprite(SpriteType.Ellipse, width, height); }

        //? Create a new rectangle sprite.
        //@ readsMutable [result].writesMutable
        //@ [width].defl(20) [height].defl(20)
        //@ embedsLink("Board", "Sprite")
        public create_rectangle(width:number, height:number) : Sprite { return this.mkSprite(SpriteType.Rectangle, width, height); }

        //? Create a new text sprite.
        //@ readsMutable [result].writesMutable
        //@ [width].defl(100) [height].defl(40) [fontSize].defl(20)
        //@ embedsLink("Board", "Sprite")
        public create_text(width:number, height:number, fontSize:number, text:string) : Sprite
        {
            var s = this.mkSprite(SpriteType.Text, width, height);
            s.fontSize = fontSize;
            s.set_text(text);
            return s;
        }

        //? Create a new picture sprite.
        //@ readsMutable [result].writesMutable picAsync
        //@ embedsLink("Board", "Sprite"), embedsLink("Sprite", "Picture")
        //@ returns(Sprite)
        public create_picture(picture:Picture, r:ResumeCtx)
        {
            var s = this.mkSprite(SpriteType.Picture, 1, 1);
            picture.loadFirst(r, () => {
                s.setPictureInternal(picture);
                return s;
            });
        }

        //? Create a new sprite sheet.
        //@ readsMutable [result].writesMutable picAsync
        //@ embedsLink("Board", "SpriteSheet"), embedsLink("SpriteSheet", "Picture")
        //@ returns(SpriteSheet)
        public create_sprite_sheet(picture:Picture, r:ResumeCtx)
        {
            picture.loadFirst(r, () => {
                Util.log('board: new sprite sheet - ' + picture.widthSync() + 'x' + picture.heightSync());
                var sheet = new SpriteSheet(this, picture);
                return sheet;
            });
        }

        //? Create an anchor sprite.
        //@ readsMutable [result].writesMutable
        //@ [width].defl(20) [height].defl(20)
        //@ embedsLink("Board", "Sprite")
        public create_anchor(width:number, height:number) : Sprite {
            var anchor = this.mkSprite(SpriteType.Anchor, width, height);
            anchor.set_friction(1); // don't move
            anchor.hide();
            return anchor;
        }

        //? Create a line obstacle with given start point, and given width and height. Elasticity is 0 for sticky, 1 for complete bounce.
        //@ writesMutable ignoreReturnValue
        //@ [elasticity].defl(1)
        public create_obstacle(x:number, y:number, width:number, height:number, elasticity:number) : Obstacle {
            if (width == 0 && height == 0) return; // avoid singularities

            var o = new Obstacle(this, x, y, width, height, elasticity, 1 - elasticity);
            this.addObstacle(o);
            return o;
        }

        public deleteObstacle(obstacle : Obstacle)
        {
            var idx = this._obstacles.indexOf(obstacle);
            if (idx > -1) {
                this._obstacles.splice(idx, 1);
                this._walls = this._walls.filter(wall => wall._obstacle != obstacle);
            }
        }

        //? Create a spring between the two sprites.
        //@ writesMutable ignoreReturnValue
        //@ [stiffness].defl(100)
        public create_spring(sprite1:Sprite, sprite2:Sprite, stiffness:number) : Spring
        {
            // TODO: check for invalid parents
            var spring = new Spring(this, sprite1, sprite2, stiffness);
            this._springs.push(spring);
            sprite1.addSpring(spring);
            sprite2.addSpring(spring);
            return spring;
        }

        public deleteSpring(spring : Spring) {
            spring.sprite1.removeSpring(spring);
            spring.sprite2.removeSpring(spring);
            var idx = this._springs.indexOf(spring);
            if (idx > -1)
                this._springs.splice(idx, 1);
        }

        //? Clear all queued events related to this board
        public clear_events() : void
        {
        }

        public overlapWithAny(sprite:Sprite, sprites:SpriteSet):SpriteSet {
            var result = new SpriteSet();
            for (var i = 0; i < sprites.count(); i++)
            {
                var other = sprites.at(i);
                if (sprite === other) continue;
                if (sprite.overlaps_with(other))
                {
                    result.add(other);
                }
            }
            return result;
        }

        //? Clears the background camera
        //@ cap(camera)
        public clear_background_camera(): void
        {
            this.backgroundCamera = null;
        }

        //? Clear the background picture
        public clear_background_picture(): void
        {
            this.backgroundPicture = null;
        }

        //? Shows the board on the wall.
        public post_to_wall(s:IStackFrame) : void
        {
            super.post_to_wall(s)
            if (this._full) {
                if (this._landscape) Runtime.lockOrientation(false, true, false);
                else Runtime.lockOrientation(true, false, false);
            }
        }
    }

    //? An obstacle on a board
    //@ ctx(general,gckey)
    export class Obstacle
      extends RTValue
    {
        public _color : Color = Colors.gray();
        public _thickness : number = 3;
        public _onCollision : Event_;
        constructor(public board : Board, public x:number, public y:number, public xextent:number, public yextent:number, public elasticity:number, public friction:number) {
            super()
        }

        //? Attaches a handler where a sprite bounces on the obstacle
        //@ ignoreReturnValue
        public on_collision(bounce : SpriteAction) : EventBinding {
            if (!this._onCollision) this._onCollision = new Event_();
            return this._onCollision.addHandler(bounce);
        }
        public raiseCollision(rt : Runtime, sprite : Sprite) {
            if (this._onCollision && this._onCollision.handlers)
                rt.queueLocalEvent(this._onCollision, [sprite], false);
        }

        //? Sets the obstacle color
        //@ [color].deflExpr('colors->random')
        public set_color(color : Color) {
            this._color = color;
        }

        //? Sets the obstacle thickness
        //@ [thickness].defl(3)
        public set_thickness(thickness : number) {
            this._thickness = Math.max(1, thickness);
        }

        //? Delete the obstacle
        public delete_() {
            this.board.deleteObstacle(this);
        }

        public isValid() : boolean {
            if (!this.IsFinite(this.x)) return false;
            if (!this.IsFinite(this.y)) return false;
            if (!this.IsFinite(this.xextent)) return false;
            if (!this.IsFinite(this.yextent)) return false;
            return true;
        }

        private IsFinite(x:number) : boolean {
            if (isNaN(x)) return false;
            if (isFinite(x)) return true;
            return false;
        }
    }

    export class WallSegment {
        public _position:Vector2;
        public _unitExtent:Vector2;
        public _length:number;
        public _elasticity:number;
        public _friction:number;
        public _obstacle : Obstacle;

        static mk(x:number, y:number, xextent:number, yextent:number, elasticity:number, friction:number, obstacle : Obstacle = undefined)
        {
            var w = new WallSegment();
            w._position = new Vector2(x,y);
            var segment = new Vector2(xextent, yextent);
            w._length = segment.length();
            w._unitExtent = segment.normalize();
            w._elasticity = elasticity;
            w._friction = friction;
            w._obstacle = obstacle;
            return w;
        }

        /// <summary>
        /// Find two points, p1 along wall and p2 along sprite path, such that their distance is the radius of the sprite.
        ///
        /// s = 0..length. P1(s) = pos + unitExtent * s
        /// t = 0..1       P2(t) = lastPosition + t*(newPosition - lastPosition);
        ///
        /// For now, we simplify this to just compute the time t at which the sprite is distance r from the wall. To avoid
        /// missing collisions on the end of the segment, we pretend that the segment extends by object radius on both sides.
        ///
        /// </summary>
        public processPotentialCollision(sprite:Sprite, dT:number):boolean
        {
            var unitNormal = this._unitExtent.rotate90Left();
            var normalSpeedMag = -Vector2.dot(unitNormal, sprite.stepDisplacement());
            if (normalSpeedMag <= 0)
            {
                // moving away
                return false;
            }
            var pq = sprite._position.subtract(this._position);
            var distance = Vector2.dot(pq, unitNormal);
            var normalRadius = sprite.radius(unitNormal);
            if (distance < normalRadius / 2)
            {
                // inside or behind the wall
                // check how much
                if (distance <= -normalRadius / 2)
                {
                    // completely clear of other side
                    return false;
                }

                // inside the wall. Check if we are overlapping it
                var unitRadius = sprite.radius(this._unitExtent);
                var segmentProj = Vector2.dot(sprite._position.subtract(this._position), this._unitExtent);
                if (segmentProj < -unitRadius / 2 || segmentProj > this._length + unitRadius / 2)
                {
                    // outside wall segment
                    return false;
                }

                //move it back.
                if (distance < 0)
                {
                    return false;
                    //sprite.newPosition = sprite.position + unitNormal * (sprite.RadiusX - distance);
                }
                else
                {
                    sprite.newPosition = sprite._position.add(unitNormal.scale(normalRadius - distance));
                }
                // reverse newSpeed
                normalSpeedMag = Math.abs(Vector2.dot(unitNormal, sprite.midSpeed));
                var normalSpeed = unitNormal.scale(normalSpeedMag);
                var parallelSpeed = this._unitExtent.scale(Vector2.dot(this._unitExtent, sprite.midSpeed));

                sprite.midSpeed = sprite.newSpeed = (normalSpeed.scale(sprite._elasticity * this._elasticity).add( parallelSpeed.scale(1 - this._friction)));

                sprite.normalTouchPoints.push(unitNormal);
                return true;
            }

            var t = (distance - normalRadius) / normalSpeedMag; // approximation of radius

            if (t > 1)
            {
                return false;
            }

            var impactPos = sprite._position.add(sprite.stepDisplacement().scale(((t < 0) ? (t * 1.01) : (t * 0.99))));
            // check if impact Pos projected onto segment is within bounds
            var unitRadius2 = sprite.radius(this._unitExtent);
            var segmentIndex = Vector2.dot(impactPos.subtract(this._position), this._unitExtent);
            if (segmentIndex < -unitRadius2 / 2 || segmentIndex > this._length + unitRadius2 / 2)
            {
                // outside wall segment
                return false;
            }
            {
                // fixup position
                normalSpeedMag = Math.abs(Vector2.dot(unitNormal, sprite.midSpeed));
                var normalSpeed = unitNormal.scale(normalSpeedMag);
                var stepParallelSpeed = this._unitExtent.scale(Vector2.dot(this._unitExtent, sprite.stepDisplacement()));
                sprite.newPosition = impactPos.add(stepParallelSpeed.scale(1 - t));

                var parallelSpeed = this._unitExtent.scale(Vector2.dot(this._unitExtent, sprite.newSpeed));
                sprite.midSpeed = sprite.newSpeed = (normalSpeed.scale(sprite._elasticity * this._elasticity).add(parallelSpeed.scale(1 - this._friction)));
                sprite.normalTouchPoints.push(unitNormal);
                return true;
            }
        }

    }
} }
