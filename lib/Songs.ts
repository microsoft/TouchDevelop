///<reference path='refs.ts'/>
module TDev.RT {
    //? A collection of songs
    //@ immutable enumerable cap(media)
    export class Songs
        extends RTValue
    {
        private _songs: Song[] = [];

        constructor() {
            super()
        }

        static mk(songs: Song[])
        {
            var s = new Songs();
            s._songs = songs;
            return s;
        }

        //? Gets the item at position 'index'; invalid if index is out of bounds
        public at(index: number): Song
        {
            return this._songs[index];
        }

        public indexOf(song: Song): number
        {
            if (!song) return -1;

            var url = song.url();
            for (var i = 0; i < this._songs.length; ++i) {
                if (this._songs[i].url() === url)
                    return i;
            }
            return -1;
        }

        //? Gets a random item; invalid if collection is empty
        public random() : Song
        {
            if (this._songs.length == 0) return undefined;
            return this._songs[Math_.random(this._songs.length)];
        }

        //? Gets the number of elements in the collection
        public count(): number
        {
            return this._songs.length;
        }

        //? Plays the song.
        //@ cap(musicandsounds)
        public play()
        {
            Player.play_many(this);
        }

        //? Displays the songs on the wall
        public post_to_wall(s: IStackFrame)
        {
            for (var i = this._songs.length - 1; i >= 0; --i) {
                this._songs[i].post_to_wall(s);
            }
        }

        //? Renamed to 'random'
        //@ hidden
        public rand() : Song
        {
            return this.random();
        }
    }
}
