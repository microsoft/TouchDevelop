///<reference path='refs.ts'/>
module TDev.RT {
    //? A song
    //@ icon("fa-headphones") walltap
    export class Song
        extends RTValue
    {
        private _url: string = undefined;
        public /*protected*/ _path: string = undefined;
        private _album: SongAlbum = undefined;
        private _albumName: string = undefined;
        private _artist: string = undefined;
        private _duration: number = undefined;
        public /*protected*/ _genre: string = undefined;
        private _name: string = undefined;
        private _playCount: number = -1;
        //private _protected: boolean = undefined;
        private _rating : number = -1;
        private _track : number = -1;
        private _initialized: boolean = false;

        constructor() {
            super()
        }

        static mk(url: string, path:string, name : string) : Song
        {
            var song = new Song();
            song._url = url;
            song._path = path;
            song._name = name;
            return song;
        }

        public initAsync() : Promise
        {
            this._initialized = true;
            return Promise.as();
        }

        public initNoData()
        {
            this._initialized = true;
        }

        public init(
            name: string,
            albumName:string,
            artist: string,
            duration: number,
            genre: string,
            rating: number,
            track: number)
        {
            this._initialized = true;
            this._name = name;
            this._albumName = albumName;
            this._artist = artist;
            this._album = SongAlbum.mk(this._albumName, this._artist);
            this._duration = duration;
            this._genre = genre;
            this._rating = rating;
            this._track = track;
        }

        //? Gets the song album containing the song
        //@ returns(SongAlbum) cachedAsync
        public album(r: ResumeCtx) {
            if (this._initialized) r.resumeVal(this._album);
            else this.initAsync().done(() => r.resumeVal(this._album));
        }

        //? Gets the name of the artist
        //@ returns(string) cachedAsync
        public artist(r: ResumeCtx) {
            if (this._initialized) r.resumeVal(this._artist);
            else this.initAsync().done(() => {
                r.resumeVal(this._artist || '');
            });
        }

        //? Gets the duration in seconds
        //@ returns(number) cachedAsync
        public duration(r: ResumeCtx) {
            if (this._initialized) r.resumeVal(this._duration);
            else this.initAsync().done(() => {
                r.resumeVal(this._duration);
            });
        }

        //? Gets the genre of the song
        //@ returns(string) cachedAsync
        public genre(r: ResumeCtx) {
            if (this._initialized) r.resumeVal(this._genre);
            else this.initAsync().done(() => {
                r.resumeVal(this._genre || '');
            });
        }

        //? Gets the name of the song
        public name(): string { return this._name; }

        //? Gets the play count
        //@ returns(number) cachedAsync
        //@ readsMutable
        public play_count(r: ResumeCtx) {
            if (this._initialized) r.resumeVal(this._playCount);
            else this.initAsync().done(() => {
                r.resumeVal(this._playCount);
            });
        }

        // Gets a value whether the song is DRM protected
        //public @protected() : boolean{ return this._protected; }

        //? Gets the users rating. -1 if not rated.
        //@ returns(number) cachedAsync
        public rating(r: ResumeCtx) {
            if (this._initialized) r.resumeVal(this._rating);
            else this.initAsync().done(() => {
                r.resumeVal(this._rating);
            });
        }

        //? Gets the track number in the album
        //@ returns(number) cachedAsync
        public track(r: ResumeCtx) {
            if (this._initialized) r.resumeVal(this._track);
            else this.initAsync().done(() => {
                r.resumeVal(this._track);
            });
        }

        public url(): string { return this._url; }
        public path(): string { return this._path; }

        static createAudio(url : string) : HTMLAudioElement
        {
            var audio : HTMLAudioElement = <HTMLAudioElement>document.createElement("audio");
            audio.controls = true;
            (<any>audio).crossorigin = "anonymous";
            var source: HTMLSourceElement = <HTMLSourceElement>document.createElement("source");
            source.src = url;
            audio.appendChild(source);

            return audio;
        }

        //? Plays the song.
        //@ cap(musicandsounds)
        public play(): void
        {
            Player.play(this);
        }

        // Displays the song on the wall
        public getViewCore(s: IStackFrame, b:BoxBase): HTMLElement
        {
            var d = div("item");
            var dc = div("item-info item-with-button");
            d.appendChild(dc);
            if (this._name)
                dc.appendChild(div("item-title", this._name));
            this.initAsync().done(() => {
                if (this._artist)
                    dc.appendChild(div("item-subtitle", this._artist));
                if (this._album)
                    dc.appendChild(div("item-subtle", this._album.name()));
                d.appendChild(div('item-buttons', HTML.mkRoundButton("svg:play,black", lf("play"), Ticks.songPlay, () => this.play())));
            });
            return d;
        }

        //? Gets a value whether the song is DRM protected
        //@ stub()
        public protected(): boolean
        {
            return undefined;
        }

        //? Displays the song on the wall
        public post_to_wall(s:IStackFrame) : void { super.post_to_wall(s) }
    }
}
