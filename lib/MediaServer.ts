///<reference path='refs.ts'/>
module TDev { export module RT {
    //? A media server on the home network
    //@ stem("server") walltap cap(home) obsolete
    export class MediaServer
        extends RTValue
    {
        constructor() {
            super()
        }

        //? Gets the detailled information about this device
        //@ stub obsolete
        public device() : Device
        { return undefined; }

        //? Gets the name of the printer
        //@ stub obsolete
        public name() : string
        { return undefined; }

        //? Display the printer to the wall
        //@ stub obsolete
        public post_to_wall() : void
        { }

        //? Gets a list of all songs
        //@ stub obsolete
        public songs() : Collection<MediaLink>
        { return undefined; }

        //? Gets a list of all videos
        //@ stub obsolete
        public videos() : Collection<MediaLink>
        { return undefined; }

        //? Gets a list of all pictures
        //@ stub obsolete
        public pictures() : Collection<MediaLink>
        { return undefined; }

        //? Searches for songs
        //@ stub obsolete
        public search_songs(term:string) : Collection<MediaLink>
        { return undefined; }

        //? Searches for videos
        //@ stub obsolete
        public search_videos(term:string) : Collection<MediaLink>
        { return undefined; }

        //? Searches for videos in a particular date range.
        //@ stub obsolete
        //@ [end].deflExpr('time->now')
        public search_videos_by_date(start:DateTime, end:DateTime) : Collection<MediaLink>
        { return undefined; }

        //? Searches for pictures in a particular date range.
        //@ stub obsolete
        //@ [end].deflExpr('time->now')
        public search_pictures_by_date(start:DateTime, end:DateTime) : Collection<MediaLink>
        { return undefined; }

        //? Chooses a song
        //@ stub returns(MediaLink) obsolete
        public choose_song(r:ResumeCtx)
        { }

        //? Chooses a video or a movie
        //@ stub returns(MediaLink) obsolete
        public choose_video(r:ResumeCtx)
        { }

        //? Chooses a picture
        //@ stub returns(MediaLink) obsolete
        public choose_picture(r:ResumeCtx)
        { }

    }
} }
