///<reference path='refs.ts'/>
module TDev.RT {
    interface SpriteAnimationData {
        apply : (rt : Runtime, sprite : Sprite, value : number) => void;
        easing : (value : number) => number;
        duration : number;
        repeat : number;
        yoyo:boolean;
        reversed: boolean;
        init?: (sprite: Sprite) => void;
    }

    //? A animation to animate sprite properties.
    //@ stem("anim") ctx(general)
     export class SpriteAnimation
        extends RTValue
    {
        private _tweens : SpriteAnimationData[] = [];
        private _onStart : Event_;
        private _onStop : Event_;
        private _tweenIndex = 0;
        private _t : number = -1;
        private _timeScale = 1;
        public isActive = true;

        constructor(public _sprite : Sprite) {
            super();
        }

        private pushTween(
            apply : (rt : Runtime, sprite : Sprite, value : number) => void,
            easing : (value : number) => number,
            duration : number) : SpriteAnimationData {
            this.ensureActive();
            if (this._tweens.length > 0 && this._tweens[this._tweens.length-1].repeat < 0)
                Util.userError(lf("the previous animation repeats forever"));
            var tween = { apply : apply,
                easing : easing,
                duration : Math.max(duration,0),
                repeat : 1,
                yoyo:false,
                reversed:false
            };
            this._tweens.push(tween);
            return tween;
        }

        private ensureActive() {
            if(!this.isActive) Util.userError(lf("trying to chain a tween that has already stopped"));
        }

        static easing = {
            linear : {
                in : function(x) { return x; },
                out : function(x) { return x; },
                inout : function(x) { return x; },
            },
            quadratic : {
                in : function(x) { return x*x; },
                out : function(x) { return x*(2-x); },
                inout : function(x) { return (x*=2) < 1 ? x*x/2 : (1-(--x)*(x-2))/2; },
            },
            cubic : {
                in : function(x) { return x*x*x; },
                out : function(x) { --x; return 1 + x*x*x; },
                inout : function(x) { return (x*=2) < 1 ? x*x*x/2 : ((x-=2)*x*x+2)/2; }
            },
            sine : {
                in : function(x) { return 1 - Math.cos(x*Math.PI/2); },
                out : function(x) { return Math.sin(x * Math.PI/2); },
                inout : function(x) { return (1 - Math.cos(Math.PI*x))/2; },
            },
            expo : {
                in : function(x) { return x==0 ? 0 : Math.pow(1024, x - 1); },
                out : function(x) { return x==1 ? 1 : 1-Math.pow(2, -10 * x); },
                inout : function(x) { return x==0 ? 0 : x==1 ? 1 : (x*=2) < 1 ? Math.pow(1024, x-1)/2 : 1 - Math.pow(2,-10*(x-1)) / 2; },
            },
        };
        static resolveEasing(name : string, shape : string) {
            var e = SpriteAnimation.easing[name.toLowerCase().replace(' ', '')] || SpriteAnimation.easing['cubic'];
            return e[shape.toLowerCase().replace(' ', '')] || e['inout'];
        }

        //? Gets the current time scale factor
        //@ readsMutable
        public time_scale() : number { return this._timeScale; }

        //? Sets the current time scale factor
        //@ writesMutable [scale].defl(1)
        public set_time_scale(scale : number) {
            this._timeScale = scale;
        }

        //? Moves the sprite to a given location using separate easing for x and y
        //@ writesMutable
        //@ [duration].defl(1)
        //@ [easing].deflStrings('cubic', 'linear', 'quadratic', 'expo', 'sine')
        //@ [shape].deflStrings('inout', 'out', 'in')
        public move_to(duration : number, easing : string, shape : string, x : number, y : number) {
            var oldx = this._sprite.x();
            var oldy = this._sprite.y();
            var dx = x - oldx;
            var dy = y - oldy;
            var tw = this.pushTween(
                function(rt,sprite,k) {
                    sprite.set_pos(oldx + k * dx, oldy + k * dy);
                },
                SpriteAnimation.resolveEasing(easing,shape),
                duration);
            tw.init = function(sp) { 
                oldx = sp.x();
                oldy = sp.y();
                dx = x - oldx;
                dy = y - oldy;                
            }
        }

        //? Changes the text of the sprite.
        //@ [duration].defl(1)
        //@ [easing].deflStrings('cubic', 'linear', 'quadratic', 'expo', 'sine')
        //@ [shape].deflStrings('inout', 'out', 'in')
        public text(duration: number, easing: string, shape: string, value: string) {
            var oldtext = this._sprite.text() || "";
            var oldnumber = parseInt(oldtext);
            var newnumber = parseInt(value);

            // interpolating between numbers?
            if (!isNaN(newnumber) && (!isNaN(oldnumber) || !oldnumber)) {
                if (isNaN(oldnumber)) oldnumber = 0;
                var d = newnumber - oldnumber;
                this.pushTween(
                    function (rt, sprite, k) {
                        sprite.set_text(Math_.round(oldnumber + k * d).toString());
                    },
                    SpriteAnimation.resolveEasing(easing, shape),
                    duration);
            }
            else {
                var n = Math.max(oldtext.length, value.length);
                var s = oldtext;
                this.pushTween(
                    function (rt, sprite, k) {
                        var i = Math.floor(k * n);
                        var c = value[i] || "";
                        s = (value.substring(0, i) || "") +  + (oldtext.substring(i) || "");
                        sprite.set_text(s);
                    },
                    SpriteAnimation.resolveEasing(easing, shape),
                    duration);
            }
        }

        //? Changes the color of the sprite
        //@ [duration].defl(1)
        //@ [easing].deflStrings('cubic', 'linear', 'quadratic', 'expo', 'sine')
        //@ [shape].deflStrings('inout', 'out', 'in')
        public color(duration : number, easing : string, shape : string, c : Color) {
            var old = this._sprite.color();
            var tw = this.pushTween(
                function(rt,sprite,k) {
                    var onek = 1 - k;
                    sprite.set_color(Color.fromArgb(old.a * k + c.a * onek, old.r * k + c.r * onek, old.g * k + c.g * onek, old.b * k + c.b * onek));
                },
                SpriteAnimation.resolveEasing(easing,shape),
                duration);
            tw.init = function(sprite) { old = sprite.color(); } 
        }

        //? Creating a beating animation
        //@ writesMutable [duration].defl(0.3) [cycle].defl(2) [value].defl(1.1)
        public beat(duration : number, cycle : number, value : number) {
            this.scale(duration, 'quadratic', 'inout', value);
            this.repeat(cycle * 2, true);
        }

        //? Scales the sprite
        //@ writesMutable [duration].defl(0.5) [value].defl(1.2)
        //@ [easing].deflStrings('sine', 'linear', 'quadratic', 'cubic', 'expo')
        //@ [shape].deflStrings('inout', 'out', 'in')
        public scale(duration : number, easing : string, shape : string, value : number) {
            var current = 1.0;
            this.pushTween(
                function(rt, sprite, k) { sprite.set_scale(current * (1-k) + k * value); },
                SpriteAnimation.resolveEasing(easing, shape),
                duration);
        }

         //? Modifies the sprite width
         //@ writesMutable [duration].defl(0.5) [value].defl(100)
         //@ [easing].deflStrings('sine', 'linear', 'quadratic', 'cubic', 'expo')
         //@ [shape].deflStrings('inout', 'out', 'in')
         public width(duration: number, easing: string, shape: string, value: number) {
             var current = this._sprite.width();
             this.pushTween(
                 function (rt, sprite, k) { sprite.set_width(current * (1 - k) + k * value); },
                 SpriteAnimation.resolveEasing(easing, shape),
                 duration);
         }

         //? Modifies the sprite height
         //@ writesMutable [duration].defl(0.5) [value].defl(100)
         //@ [easing].deflStrings('sine', 'linear', 'quadratic', 'cubic', 'expo')
         //@ [shape].deflStrings('inout', 'out', 'in')
         public height(duration: number, easing: string, shape: string, value: number) {
             var current = this._sprite.height();
             this.pushTween(
                 function (rt, sprite, k) { sprite.set_height(current * (1 - k) + k * value); },
                 SpriteAnimation.resolveEasing(easing, shape),
                 duration);
         }

        //? Starts a new animation and continues with the current animation
        //@ writesMutable
        public fork() : SpriteAnimation {
            var anim = this._sprite.createAnimation();
            this.pushTween(
                function(rt, sprite, k) { sprite.startAnimation(anim); },
                SpriteAnimation.easing['linear']['in'],
                0);
            return anim;
        }

         //? Waits till the animation completes. This action will evolve the board if needed.
         //@ async
         public wait(r: ResumeCtx) {
             var board = this._sprite._parent;
             var boardTick = board.tick;
             if (!board) {
                 r.resume();
                 return;
             }
             App.allow_other_events(r.stackframe);
             var step = () => {
                 r.rt.yield_now();
                 // call evolved if not called in another loop
                 if (boardTick != board.tick) {
                     boardTick = board.tick;
                     board.evolve();
                     board.update_on_wall();
                 }
                 if (!this.isActive)
                     r.resume();
                 else Util.setTimeout(100, step);
             };
             step();
         }

        //? Waits for the other animation to complete before proceding.
        public wait_for(animation : SpriteAnimation) {
            var tween = this.pushTween(
                function(rt, sprite, k) {
                    if(!animation.isActive)
                        tween.duration = -1;
                },
                SpriteAnimation.easing['linear']['in'],
                1e6);
        }

        //? Stops this animation
        //@ writesMutable
        public stop() {
            // this will stop the tweening on the next iteration
            this._tweenIndex = this._tweens.length;
            this._t = 0;
        }

        //? Repeats the latest animation. Negative ``count`` makes infinite repetition. ``yoyo`` makes the animation repeat back and forth.
        //@ writesMutable [count].defl(2)
        public repeat(count : number, yoyo : boolean) {
            this.ensureActive();
            if (this._tweens.length > 0) {
                var tween = this._tweens[this._tweens.length - 1];
                tween.repeat = count;
                tween.yoyo = yoyo;
                tween.reversed = false;
            }
        }

        //? Raised when the animation started playing
        //@ ignoreReturnValue writesMutable
        public on_start(body : Action) : EventBinding{
            if (!this._onStart) this._onStart = new Event_();
            return this._onStart.addHandler(body);
        }

        //? Raised when the animation stopped playing
        //@ ignoreReturnValue writesMutable
        public on_stop(body : Action) : EventBinding{
            this.ensureActive();
            if (!this._onStop) this._onStop = new Event_();
            return this._onStop.addHandler(body);
        }

        //? Waits for a number of seconds
        //@ [duration].defl(1) writesMutable
        public sleep(duration : number) {
            this.pushTween(
                function(rt, sprite, x) {},
                SpriteAnimation.easing['linear']['in'],
                duration
            );
        }

        //? Fades in to fully opaque
        //@ writesMutable [duration].defl(0.5)
        //@ [easing].deflStrings('cubic', 'linear', 'quadratic', 'expo', 'sine')
        public fade_in(duration : number, easing : string)
        {
            var old = this._sprite.opacity();
            var tw = this.pushTween(
                function(rt, sprite, value) {
                    sprite.set_opacity(old * (1-value) + value);
                },
                SpriteAnimation.resolveEasing(easing, 'in'),
                duration
                );
            tw.init = function(sprite) { old = sprite.opacity() };
        }

        //? Fades out to transparent
        //@ writesMutable [duration].defl(0.5)
        //@ [easing].deflStrings('cubic', 'linear', 'quadratic', 'expo', 'sine')
        public fade_out(duration : number, easing : string)
        {
            var old = this._sprite.opacity();
            var tw = this.pushTween(
                function(rt, sprite, value) {
                    sprite.set_opacity(old*(1-value));
                },
                SpriteAnimation.resolveEasing(easing, 'out'),
                duration
            );
            tw.init = function(sprite) { old = sprite.opacity() };
        }

         //? Changes the opacity of the sprite
         //@ writesMutable [duration].defl(0.5)
         //@ [easing].deflStrings('cubic', 'linear', 'quadratic', 'expo', 'sine')
         //@ [shape].deflStrings('inout', 'out', 'in')
         public fade(duration: number, easing: string, shape: string, opacity : number) {
            var old = this._sprite.opacity();
             opacity = Math_.normalize(opacity);
             var tw = this.pushTween(
                 function (rt, sprite, value) {
                     sprite.set_opacity(old * (1 - value) + opacity * value);
                 },
                 SpriteAnimation.resolveEasing(easing, shape),
                 duration
                 );
            tw.init = function(sprite) { old = sprite.opacity() };
         }

        //? Scales up and fades out an object
        //@ writesMutable [duration].defl(0.5) [scale].defl(1.5)
        //@ [easing].deflStrings('cubic', 'linear', 'quadratic', 'expo', 'sine')
        public puff_out(duration : number, easing : string, scale : number)
        {
            var oldop = this._sprite.opacity();
            var oldscale = this._sprite.scale();
            var tw = this.pushTween(
                function(rt, sprite, value) {
                    sprite.set_opacity(oldop*(1-value));
                    sprite.set_scale(oldscale * (1-value) + value * scale);
                },
                SpriteAnimation.resolveEasing(easing, 'out'),
                duration
                );
            tw.init = function(sprite) {
                oldop = sprite.opacity();
                oldscale = sprite.scale();
            };            
        }

        //? Hides the sprite
        //@ writesMutable
        public hide() {
            this.pushTween(
                function(rt, sprite, value) { sprite.hide(); },
                SpriteAnimation.easing['linear']['in'],
                0
            );
        }

        //? shows the sprite
        //@ writesMutable
        public show() {
            this.pushTween(
                function(rt, sprite, value) { sprite.show(); },
                SpriteAnimation.easing['linear']['in'],
                0
            );
        }

        //? deletes the sprite
        //@ writesMutable
        public delete_() {
            this.pushTween(
                function(rt, sprite, value) { sprite.delete_(); },
                SpriteAnimation.easing['linear']['in'],
                0
            );
        }

        //? play sound
        //@ writesMutable
        public play_sound(sound : Sound) {
            this.pushTween(
                function(rt, sprite, value) { sound.playAsync().done(); },
                SpriteAnimation.easing['linear']['in'],
                0
            );
        }

        //? Sets a different frame from the sprite sheet
        public frame(name : string) {
            var sheet = this._sprite.sheet();
            if (sheet)
                this.pushTween(
                    function(rt, sprite, value) {
                        sheet.set_frame(sprite, name);
                    },
                    SpriteAnimation.easing['linear']['in'],
                    0
                );
        }

        //? Starts playing an animation from the sprite sheet, if any
        //@ writesMutable
        //@ [animation].defl('all')
        public play_frames(animation : string) {
            var sheet = this._sprite.sheet();
            if (sheet) {
                var data = sheet.findAnimation(animation);
                if (data) {
                    this.pushTween(
                        function(rt, sprite, x) {
                            sheet.set_frame(sprite, data.frames[Math.floor(x * (data.frames.length - 1))]);
                        },
                        SpriteAnimation.resolveEasing('linear', 'in'),
                        data.duration);
                    this.repeat(data.loopCount, data.yoyo);
                }
            }
        }

        //? Rotates the sprite.
        //@ writesMutable [duration].defl(1)
        //@ [easing].deflStrings('expo', 'linear', 'quadratic', 'cubic', 'sine')
        //@ [shape].deflStrings('in', 'out', 'inout')
        public turn_to(duration : number, easing : string, shape : string, angle : number) {
            var old = this._sprite.angle();
            var tw = this.pushTween(
                function(rt, sprite, value) { sprite.set_angle(old * value + (1-value) * angle); },
                SpriteAnimation.resolveEasing(easing,shape),
                duration
                );
            tw.init = function(sp) { old = sp.angle() };    
        }

        //? Calls a user handler during the animation. ``handler`` receives a number from 0 to 1 during the tweeining.
        //@ writesMutable [duration].defl(1)
        //@ [easing].deflStrings('expo', 'linear', 'quadratic', 'cubic', 'sine')
        //@ [shape].deflStrings('in', 'out', 'inout')
        public run(duration : number, easing : string, shape : string, handler : NumberAction) {
            var ev = new Event_();
            ev.addHandler(handler);
            this.pushTween(
                (rt, sprite, x) => {
                    rt.queueLocalEvent(ev, [x], false);
                },
                SpriteAnimation.resolveEasing(easing, shape),
                duration
            );
        }
        
        private initTween(tween: SpriteAnimationData) {
            if (tween && tween.init) {
                tween.init(this._sprite);
                delete tween.init;
            }
        }

        // returns false if finished
        public evolve(rt : Runtime, dT : number) : boolean {
            if (!this.isActive) return false;
            if (this._t < 0 && this._onStart && this._onStart.handlers) rt.queueLocalEvent(this._onStart, [], false);
            var tween = this._tweens[this._tweenIndex];
            this._t = this._t < 0 ? 0 : this._t + dT * this._timeScale;
            // advance to the next tween if needed
            while(tween && this._t > tween.duration) {
                // make sure to call tween.apply at least once
                this.initTween(tween);
                tween.apply(rt, this._sprite, tween.reversed ? 0 : 1);
                // increment timer...
                this._t = tween.duration < 0 ? 0 : this._t - tween.duration;
                if(tween.repeat == 0)
                    tween = this._tweens[++this._tweenIndex];
                else if (tween.repeat > 0 && --tween.repeat == 0)
                    tween = this._tweens[++this._tweenIndex];
                else // repeat
                    if (tween.yoyo) tween.reversed = !tween.reversed;
            }
            // are we done?
            if (tween) {
                // interpolated current tween.
                var x =  tween.easing(this._t / tween.duration);
                this.initTween(tween);
                tween.apply(rt,this._sprite, tween.reversed ? 1 - x : x);
                return true;
            } else {
                if (this._onStop && this._onStop.handlers) rt.queueLocalEvent(this._onStop, [], false);
                return this.isActive = false;
            }
        }

        //? Gets a value indicating if the animation is still running
        public is_active(): boolean {
             return this.isActive;
        }

        public getViewCore(s: IStackFrame, b:BoxBase): HTMLElement {
            return div('item', 'tween');
        }

        //? Describes the animation.
        //@ readsMutable
        public post_to_wall(s: IStackFrame): void {
            super.post_to_wall(s)
        }
    }
}
