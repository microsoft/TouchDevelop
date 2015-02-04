///<reference path='refs.ts'/>
module TDev { export module RT {
    //? A collection of playlists
    //@ enumerable cap(media)
    export class Playlists
        extends RTValue
    {
        constructor() {
            super()
        }
        // public jsonFields() => [];

        //? Gets the number of playlists
        //@ stub
        //@ readsMutable
        public count() : number
        { return undefined; }

        //? Gets i-th playlist
        //@ stub
        //@ readsMutable
        public at(index:number) : Playlist
        { return undefined; }

        //? Displays the value to the wall
        //@ stub
        //@ readsMutable
        public post_to_wall() : void
        { }

    }
} }
