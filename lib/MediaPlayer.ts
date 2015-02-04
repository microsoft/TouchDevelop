///<reference path='refs.ts'/>
module TDev { export module RT {
    //? An audio/video player on the home network
    //@ stem("pa") walltap cap(home) obsolete
    export class MediaPlayer
        extends RTValue
    {
        private _volume : number = undefined;

        constructor() {
            super()
        }

        //? Gets the current volume
        //@ obsolete
        public volume() : number { return this._volume; }

        //? Sets the current value
        //@ obsolete
        public set_volume(volume:number) : void { this._volume = volume; }

        //? Gets the detailled information about this device
        //@ stub obsolete
        public device() : Device
        { return undefined; }

        //? Gets the name of the audio/video player
        //@ stub obsolete
        public name() : string
        { return undefined; }

        //? Display the player to the wall
        //@ stub obsolete
        public post_to_wall() : void
        { }

        //? Indicates the media can be played, paused, resumed
        //@ stub obsolete
        public is_control_supported() : boolean
        { return undefined; }

        //? Resumes playing the current media if any.
        //@ stub obsolete
        public resume() : void
        { }

        //? Stops the current media if any.
        //@ stub obsolete
        public stop() : void
        { }

        //? Pauses the current media if any.
        //@ stub obsolete
        public pause() : void
        { }

        //? Moves the player to the next media in the queue.
        //@ stub obsolete
        public next() : void
        { }

        //? Moves the player to the previous media in the queue.
        //@ stub obsolete
        public previous() : void
        { }

        //? Plays the current media from the start.
        //@ stub obsolete
        public play() : void
        { }

        //? Plays the media at the 'url' internet address.
        //@ stub cap(network) flow(SinkWeb)
        //@ writesMutable obsolete
        public play_media(url:string) : void
        { }

        //? Plays a media from the home network.
        //@ stub
        //@ writesMutable obsolete
        public play_home_media(media:MediaLink) : void
        { }

        //? Gets the uri of the media currently active
        //@ stub
        //@ readsMutable obsolete
        public active_media() : string
        { return undefined; }

        //? Gets the position in seconds whithin the active media
        //@ stub obsolete
        public play_position() : number
        { return undefined; }

        //? Indicates if the player is stopped
        //@ stub obsolete
        public is_stopped() : boolean
        { return undefined; }

        //? Indicates if the player is playing
        //@ stub obsolete
        public is_playing() : boolean
        { return undefined; }

        //? Indicates if the player is paused
        //@ stub obsolete
        public is_paused() : boolean
        { return undefined; }

        //? Gets the status of the player
        //@ stub obsolete
        public status() : string
        { return undefined; }

        //? Indicates if volume can be changed
        //@ stub obsolete
        public is_volume_supported() : boolean
        { return undefined; }

    }
} }
