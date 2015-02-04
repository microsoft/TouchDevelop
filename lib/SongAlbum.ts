///<reference path='refs.ts'/>
module TDev.RT {
    //? A song album
    //@ stem("album") walltap cap(media)
    export class SongAlbum
        extends RTValue
    {
        private _name: string;
        private _artist: string;

        private _genre: string = undefined;
        private _thumbnail: Picture;
        private _duration: number = 0;

        private _songs: Songs;
        private _art: Picture;
        private _artInit = false;

        constructor() {
            super()
        }

        static mk(name: string, artist : string) : SongAlbum {
            var sa = new SongAlbum();
            sa._name = name;
            sa._artist = artist;
            return sa;
        }

        public init(genre: string, duration: number, thumbnail : Picture) {
            this._genre = genre;
            this._duration = duration;
            this._thumbnail = thumbnail;
        }

        public initArtAsync() : Promise {
            if(this._artInit)
                return Promise.as(undefined);
            return Media.loadSongAlbumArtAsync(this.name())
                .then(art => {
                    this._artInit = true;
                    this._art = art;
                });
        }

        public initAsync(): Promise {
            if (this._genre != undefined)
                return Promise.as(undefined);
            return Media.initSongAlbumAsync(this);
        }

        public initSongsAsync() : Promise { // Songs
            if (this._songs) return Promise.as(undefined);
            return Media.songsAsync(this._name)
                .then(s => this._songs = s);
        }


        public toString(): string {
            return this.name();
        }

        //? Gets album art picture
        //@ returns(Picture) cachedAsync
        public art(r : ResumeCtx)  //: Picture
        {
            this.initArtAsync().done(() => r.resumeVal(this._art));
        }

        //? Gets the name of the artist
        public artist() : string
        {
            return this._artist || '';
        }

        //? Gets the duration in seconds
        //@ returns(number) cachedAsync
        public duration(r : ResumeCtx) //: number
        {
            this.initAsync().done(() => r.resumeVal(this._duration || 0));
        }

        //? Gets the genre of the song
        //@ returns(string) cachedAsync
        public genre(r : ResumeCtx) // : string
        {
            this.initAsync().done(() => r.resumeVal(this._genre || ''));
        }

        //? Indicates if the album has art
        //@ returns(boolean) cachedAsync
        public has_art(r : ResumeCtx) //: boolean
        {
            this.initArtAsync().done(() => r.resumeVal(!!this._art));
        }

        //? Gets the name of the album
        public name(): string { return this._name; }

        public getViewCore(s: IStackFrame, b: BoxBase): HTMLElement {
            var d = div("item");
            var di = div("item-image contact-image");
            var dc = div("item-info item-with-button");
            d.setChildren([di, dc])
            if (this.name())
                dc.appendChild(div("item-title", this.name()));
            if (this.artist())
                dc.appendChild(div("item-subtitle", this.artist()));
            this.initAsync().done(() => {
                if (this._thumbnail) {
                    var img = this._thumbnail.getImageElement();
                    if (img) {
                        img.className = "contact-image";
                        di.appendChild(img);
                    } else {
                        this._thumbnail.initAsync().done(() => {
                            var c = this._thumbnail.getViewCanvasClone();
                            c.className = "contact-image";
                            di.appendChild(c);
                        });
                    }
                }
                if (this._genre)
                    dc.appendChild(div("item-subtle", this._genre));
                d.appendChild(div('item-buttons', HTML.mkRoundButton("svg:play,black", lf("play"), Ticks.songAlbumPlay, () => this.playAsync().done())));
            })
            return d;
        }

        //? Displays the song album on the wall
        public post_to_wall(s: IStackFrame): void { super.post_to_wall(s) }

        //? Gets the songs
        //@ returns(Songs) async
        public songs(r : ResumeCtx) //: Songs
        {
            this.initSongsAsync()
                .done(() => r.resumeVal(this._songs))
        }

        //? Gets the thumbnail picture
        //@ returns(Picture) cachedAsync
        public thumbnail(r : ResumeCtx) //: Picture
        {
            this.initAsync().done(() => r.resumeVal(this._thumbnail));
        }

        public playAsync() {
            return this.initSongsAsync().then(() => {
                if (this._songs) Player.play_many(this._songs);
            });
        }

        //? Plays the songs of the album
        //@ cap(musicandsounds) async
        public play(r : ResumeCtx): void {
            this.playAsync()
                .done(() => r.resume());
        }
    }
}
