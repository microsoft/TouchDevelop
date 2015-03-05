///<reference path='refs.ts'/>

module TDev { export module RT {

    //? A collection of sprites
    //@ stem("sprites") icon("fa-list-ol") ctx(general,gckey,enumerable)
    export class SpriteSet
        extends RTValue
        implements ObjSet
    {
        // ordered by insertion time
        private _elements : Sprite[] = [];

        constructor() {
            super()
        }

        //? Removes all sprites from the set.
        //@ writesMutable
        public clear(): void { this._elements = []; }

        //? Returns the number of sprites in the set
        //@ readsMutable
        public count() : number { return this._elements.length; }

        //? Add sprite to set. Returns true if sprite was not already in set.
        //@ writesMutable ignoreReturnValue
        //@ embedsLink("Sprite Set", "Sprite")
        public add(sprite:Sprite) : boolean {
            if (this.contains(sprite)) return false;
            this._elements.push(sprite);
            return true;
        }

        //? Add sprite to set and remove from old set. Returns true if sprite was in old set and not in new set.
        //@ writesMutable [old_set].readsMutable [old_set].writesMutable ignoreReturnValue
        //@ embedsLink("Sprite Set", "Sprite")
        public add_from(old_set:SpriteSet, sprite:Sprite) : boolean {
            if (!old_set.contains(sprite) || this.contains(sprite)) return false;
            old_set.remove(sprite);
            this.add(sprite);
            return true;
        }

        //? Remove sprite from set. Returns true if sprite was in set.
        //@ writesMutable ignoreReturnValue
        public remove(sprite:Sprite) : boolean {
            var idx = this.index_of(sprite);
            if (idx >= 0) {
                this._elements.splice(idx, 1);
                return true;
            }
            return false;
        }

        //? Returns true if sprite is in set.
        //@ readsMutable
        public contains(sprite:Sprite) : boolean {
            var idx = this.index_of(sprite);
            if (idx < 0) { return false; }
            return true;
        }

        //? Remove sprite that was added to set first.
        //@ writesMutable ignoreReturnValue
        public remove_first() : Sprite {
            var result = this._elements.shift();
            return result;
        }

        //? Returns index of sprite in this set or -1 if not in set.
        //@ readsMutable
        public index_of(sprite:Sprite) : number {
            var idx = this._elements.indexOf(sprite);
            return idx;
        }

        public index_of_obj(sprite:any) : number { return this.index_of(sprite); }

        //? Return sprite at given index.
        //@ readsMutable
        public at(index:number) : Sprite {
            var elmt = this._elements[index];
            return elmt;
        }

        public get_enumerator() { return this._elements.slice(0); }

        public debuggerChildren() {
            return this._elements;
        }
    }
} }
