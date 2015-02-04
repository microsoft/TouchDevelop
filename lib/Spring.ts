///<reference path='refs.ts'/>
module TDev { export module RT {
    //? A spring between two sprites.
    //@ ctx(general,gckey)
    export class Spring
        extends RTValue
    {
        constructor(public board : Board, public sprite1 : Sprite, public sprite2 : Sprite, public stiffness : number) {
            super()
        }

        //? Sets the spring stiffness.
        public set_stiffness(stiffness : number) {
            this.stiffness = stiffness;
        }

        //? Deletes the spring
        public delete_() {
            this.board.deleteSpring(this);
        }
        
        public forceOn(sprite : Sprite) : Vector2 {
            var other = sprite === this.sprite1 ? this.sprite2 : this.sprite1;
            var force = other._position.subtract(sprite._position).scale(this.stiffness);
            return force;
        }
    }
} }
