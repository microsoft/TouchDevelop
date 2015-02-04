///<reference path='refs.ts'/>
module TDev.RT {
    //? This type is no longer supported. See [](/tiles) for more information.
    //@ ctx(general,gckey,walltap) cap(tiles)
    export class Tile
        extends RTValue
    {
        constructor() {
            super()
        }

        //? This action is no longer supported. See [](/tiles) for more information.
        //@ obsolete
        public title() : string { return ''; }

        //? This action is no longer supported. See [](/tiles) for more information.
        //@ obsolete
        public set_title(title:string) : void {  }

        //? This action is no longer supported. See [](/tiles) for more information.
        //@ obsolete
        public back_title() : string { return ''; }

        //? This action is no longer supported. See [](/tiles) for more information.
        //@ obsolete
        public set_back_title(title:string) : void {  }

        //? This action is no longer supported. See [](/tiles) for more information.
        //@ obsolete
        public background() : Color { return Colors.transparent(); }

        //? This action is no longer supported. See [](/tiles) for more information.
        //@ obsolete
        public set_background(color:Color) : void { }

        //? This action is no longer supported. See [](/tiles) for more information.
        //@ obsolete
        public back_icon() : Picture { return undefined; }

        //? This action is no longer supported. See [](/tiles) for more information.
        //@ obsolete
        public set_back_icon(pic:Picture) : void {  }

        //? This action is no longer supported. See [](/tiles) for more information.
        //@ obsolete
        public content() : string { return ''; }

        //? This action is no longer supported. See [](/tiles) for more information.
        //@ obsolete
        public set_content(content:string) : void { }

        //? This action is no longer supported. See [](/tiles) for more information.
        //@ obsolete
        public counter() : number { return 0; }

        //? This action is no longer supported. See [](/tiles) for more information.
        //@ obsolete
        public set_counter(counter:number) : void { }

        //? This action is no longer supported. See [](/tiles) for more information.
        //@ obsolete
        public icon() : Picture { return undefined; }

        //? This action is no longer supported. See [](/tiles) for more information.
        //@ obsolete
        public set_icon(pic:Picture) : void {  }

        //? This action is no longer supported. See [](/tiles) for more information.
        //@ obsolete
        public panorama() : boolean { return false; }

        //? This action is no longer supported. See [](/tiles) for more information.
        //@ obsolete
        public set_panorama(panorama:boolean) : void {  }

        //? This action is no longer supported. See [](/tiles) for more information.
        //@ obsolete
        public height(): number { return 0; }

        //? This action is no longer supported. See [](/tiles) for more information.
        //@ obsolete
        public width(): number { return 0; }

        //? This action is no longer supported. See [](/tiles) for more information.
        //@ obsolete
        public clear_back_icon(): void {  }

        //? This action is no longer supported. See [](/tiles) for more information.
        //@ obsolete
        public clear_icon() : void  {  }

        //? This action is no longer supported. See [](/tiles) for more information.
        //@ obsolete
        public pin_to_start(): void
        {
            // does not do anything, but does not hurt
        }

        static mkDefaultValue(): Tile {
            var t = new Tile();
            return t;
        }

        //? This action is no longer supported. See [](/tiles) for more information.
        //@ obsolete
        public post_to_wall(s:IStackFrame) : void { }
    }
}
