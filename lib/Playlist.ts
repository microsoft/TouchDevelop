///<reference path='refs.ts'/>
module TDev { export module RT {
    //? A song playlist
    //@ walltap cap(media)
    export class Playlist
        extends RTValue
    {
        constructor() {
            super()
        }

        //? Gets the duration in seconds
        //@ stub
        //@ readsMutable
        public duration() : number
        { return undefined; }

        //? Gets the name of the song
        //@ stub
        //@ readsMutable
        public name() : string
        { return undefined; }

        //? Gets the songs
        //@ stub
        //@ readsMutable
        public songs() : Songs
        { return undefined; }

        //? Displays the playlist to the wall
        //@ stub
        //@ readsMutable
        public post_to_wall() : void
        { }

        //? Plays the songs in the playlist
        //@ stub cap(musicandsounds)
        public play() : void
        { }

    }
} }
