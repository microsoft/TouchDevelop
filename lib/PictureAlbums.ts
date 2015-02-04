///<reference path='refs.ts'/>
module TDev.RT {
    //? A collection of picture albums
    //@ stem("picalbums") enumerable cap(media)
    export class PictureAlbums
        extends RTValue
    {
        private a: PictureAlbum[] = [];

        constructor() {
            super()
        }

        static mk(albums: PictureAlbum[]): PictureAlbums {
            var pa = new PictureAlbums();
            pa.a = albums;
            return pa;
        }

        //? Gets the item at position 'index'; invalid if index is out of bounds
        public at(index:number) : PictureAlbum { return this.a[Math.floor(index)]; }

        //? Gets a random item; invalid if collection is empty
        public random(): PictureAlbum { return this.at(Math_.random(this.count())); }

        //? Gets the number of elements in the collection
        public count(): number { return this.a.length; }

        //? Displays the value to the wall
        public post_to_wall(s : IStackFrame): void {
            for (var i = this.a.length - 1; i >= 0; i--) {
                this.a[i].post_to_wall(s);
            }
        }
    }
}
