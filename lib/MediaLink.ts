///<reference path='refs.ts'/>
module TDev.RT {
    //? A media file on the home network
    //@ stem("link") immutable cap(home) obsolete
    export class MediaLink
        extends RTValue
    {
        private _kind: string;
        private _title: string;
        private _author: string;
        private _album: string;
        private _date: DateTime;
        private _duration: number;
        private _url: string;

        constructor() {
            super()
        }

        static mk(kind: string, title: string, url : string) : MediaLink {
            var m = new MediaLink();
            m._kind = kind;
            m._title = title;
            m._url = url;
            return m;
        }

        //public reuseKey() { return "" + this._title + this._kind + this._author + this._duration + this._album + this._date;  }


        //? Gets the title if available
        //@ obsolete
        public title(): string { return this._title; }

        //? Gets the author if available
        //@ obsolete
        public author() : string { return this._author; }

        //? Gets the album if available
        //@ obsolete
        public album() : string { return this._album; }

        //? Gets the date if available
        //@ obsolete
        public date() : DateTime { return this._date; }

        //? Gets the duration in seconds (0 for pictures)
        //@ obsolete
        public duration() : number { return this._duration || 0; }

        //? Gets the kind of media (video, song, picture)
        //@ obsolete
        public kind(): string { return this._kind; }

        // gets the current url of the media.
        //@ obsolete
        public url(): string { return this._url; }
        public set_url(url: string) { this._url = url; }

        //? Post the media to the wall
        //@ obsolete
        //@ cap(media)
        public post_to_wall(s : IStackFrame): void {
            switch (this.kind()) {
                case 'video':
                    var video = <HTMLVideoElement>createElement("video", "", this.title());
                    video.src = this.url();
                    video.controls = true;
                    video.autobuffer = true;
                    video.load();
                    s.rt.postBoxedHtml(video, s.pc);
                    break;
                case 'song':
                    var audio = Song.createAudio(this.url());
                    s.rt.postBoxedHtml(audio, s.pc);
                    break;
                case 'picture':
                    var img = HTML.mkImg(this.url());
                    s.rt.postBoxedHtml(img, s.pc);
                    break;
            }
        }

        //? Plays or displays the media on the phone
        //@ obsolete
        //@ cap(musicandsounds)
        public play(): void {
            Player.play_home_media(this);
        }
    }
}
