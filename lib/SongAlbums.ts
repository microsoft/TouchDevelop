///<reference path='refs.ts'/>
module TDev.RT {
    //? A collection of albums
    //@ stem("songalbums") enumerable cap(media)
    export class SongAlbums
        extends RTValue
    {
        private a: SongAlbum[] = [];
        constructor() {
            super()
        }

        static mk(albums: SongAlbum[]) : SongAlbums {
            var r = new SongAlbums();
            r.a = albums;
            return r;
        }

        //? Gets the item at position 'index'; invalid if index is out of bounds
        public at(index:number) : SongAlbum { return this.a[Math.floor(index)]; }

        //? Gets a random item; invalid if collection is empty
        public random(): SongAlbum { return this.a.length == 0 ? undefined : this.at(Math_.random(this.a.length)); }

        //? Gets the number of elements in the collection
        public count() : number
        { return this.a.length; }

        //? Displays the albums to the wall
        public post_to_wall(s : IStackFrame) : void
        {
            for (var i = this.a.length - 1; i > -1; --i)
                this.a[i].post_to_wall(s);
        }
    }
}
