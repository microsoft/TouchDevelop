///<reference path='refs.ts'/>
module TDev.RT {
    export interface SpriteFrame {
        x : number;
        y : number;
        width : number;
        height : number;
        rotated:boolean;
    }
    export interface SpriteFrameClip {
        frames : string[];
        duration : number;
        loopCount: number;
        yoyo:boolean;
    }

    //? A sprite sheet which packs multiple frames in a single picture
    //@ stem("sheet") ctx(general)
    export class SpriteSheet
        extends RTValue
    {
        private frames = {}; // string => Frame
        private animations = {}; // string => SpriteFrameClip

        constructor(public _board : Board, public _picture : Picture) {
            super();
        }

        //? Gets the picture associated to this sprite sheet.
        //@ readsMutable
        public picture() : Picture {
            return this._picture;
        }

        private empty : SpriteFrame = { x:0, y:0, width:0, height:0, rotated:false};
        //? Sets the current frame displayed by sprite
        //@ writesMutable
        public set_frame(sprite : Sprite, frame : string) {
            var f = <SpriteFrame>this.frames[frame];
            sprite.setFrame(f || this.empty);
        }

        //? Creates a new sprite displaying the given frame.
        //@ readsMutable [result].writesMutable
        //@ embedsLink("SpriteSheet", "Sprite"), embedsLink("Sprite", "Picture")
        public create_sprite(frame : string) : Sprite {
            var sprite = this._board.mkSprite(SpriteType.Picture, 1, 1);
            sprite.setSheet(this);
            this.set_frame(sprite, frame);
            return sprite;
        }

        //? Sets the frames as a rectangular grid. The tiles are numbered from top, left to bottom right starting at 0.
        //@ writesMutable [rows].defl(1) [columns].defl(1)
        public set_frame_grid(rows : number, columns : number, frame_width : number, frame_height:number, margin_left : number, margin_top : number, spacing : number) {
            this.frames = [];
            if (rows < 1 || columns < 1) return;
            rows = Math.floor(rows);
            columns = Math.floor(columns);
            var h = this._picture.heightSync();
            var w = this._picture.widthSync();
            var fw = frame_width > 0 ? frame_width : w / columns;
            var fh = frame_height > 0 ? frame_height : h / rows;
            var k = 1;
            var y = margin_top;
            for(var i = 0; i < rows; ++i) {
                var x = margin_left;
                for(var j = 0; j < columns; ++j) {
                    var name = (k++).toString();
                    this.add_frame(name, x, y, fw, fh, false);
                    x += fw + spacing;
                }
                y += fh + spacing;
            }
        }

        //? Defines a new frame in the sprite sheet
        //@ writesMutable
        public add_frame(name : string, x : number, y : number, width : number, height : number, rotated : boolean) {
            this.frames[name] = <SpriteFrame>{
                x : x,
                y : y,
                width : width,
                height : height,
                rotated : rotated
            };
        }

        public findAnimation(name : string) : SpriteFrameClip {
            return <SpriteFrameClip>this.animations[name];
        }

        //? Defines an animation as a continuous sequence of frames. The frame index starts at `1`.
        //@ writesMutable [loops].defl(1) [start].defl(1) [name].defl("all")
        public add_grid_animation(name : string, start : number, count : number, duration : number, loops : number, yoyo : boolean) {
            var frs = [];
            start = Math.floor(start);
            count = Math.floor(count);
            if (count < 1) return;
            var n = start + count;
            for(var i = start; i<=n;++i) frs.push(i.toString());
            if (frs.length > 0)
                this.add_animation(name, Collection.mkStrings(frs), duration, loops, yoyo);
        }

        //? Defines an animation as a custom sequence of frames.
        //@ writesMutable [loops].defl(1)
        public add_animation(name : string, frames : Collection<string>, duration : number, loops : number, yoyo:boolean) {
            if (duration <= 0) duration = frames.count() * 1/30.0; // 30fps
            this.animations[name] = <SpriteFrameClip>{
                frames : frames.a.slice(0),
                duration : Math.max(0.02, duration),
                loopCount:Math.floor(loops),
                yoyo:yoyo
            };
        }

        public getDebugCanvas() {
            var picCanvas = this._picture.getCanvas();
            var canvas = document.createElement("canvas");
            canvas.width = picCanvas.width;
            canvas.height = picCanvas.height;
            var ctx = canvas.getContext("2d");
            ctx.drawImage(picCanvas, 0, 0);
            ctx.strokeStyle = "blue";
            ctx.lineWidth = 1;
            ctx.font = "1em Arial";
            var keys = Object.keys(this.frames);
            keys.forEach(key => {
                var frame = this.frames[key];
                ctx.strokeRect(frame.x, frame.y, frame.width, frame.height);
                ctx.fillText(key, frame.x + 4, frame.y + 12);
            });
            return canvas;
        }

        public getViewCore(s: IStackFrame, b:BoxBase): HTMLElement {
            return this.getDebugCanvas();
        }

        //? Displays the sprite sheet.
        //@ readsMutable
        //@ embedsLink("Wall", "Picture")
        public post_to_wall(s: IStackFrame): void {
            super.post_to_wall(s)
        }
    }
}