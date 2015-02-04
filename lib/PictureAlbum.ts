///<reference path='refs.ts'/>
module TDev.RT {
    //? A picture album
    //@ stem("album") walltap cap(media)
    export class PictureAlbum
        extends RTValue
    {
        _name: string;
        _uri: string;
        _albums: PictureAlbums;
        _pictures: Pictures;

        constructor() {
            super()
        }

        static mk(name: string, uri : string, pictures : Pictures = null) {
            var pa = new PictureAlbum();
            pa._name = name;
            pa._uri = uri;
            pa._pictures = pictures;
            return pa;
        }
        
        //? Gets the children albums
        //@ async embedsLink("Picture Album", "Picture Albums") returns(PictureAlbums)
        public albums(r : ResumeCtx) { //: PictureAlbums {
            if (this._albums) r.resumeVal(this._albums);

            Media.pictureAlbumsAsync(this._uri)
                .done(albums => {
                    this._albums = albums;
                    r.resumeVal(this._albums)
                });
        }

        //? Gets the name of the album
        public name(): string { return this._name; }

        //? Gets the pictures
        //@ async embedsLink("Picture Album", "Pictures") returns(Pictures)
        public pictures(r : ResumeCtx) { //: Pictures {
            if (this._pictures) r.resumeVal(this._pictures);

            Media.picturesAsync(this._uri).done(pics => {
                this._pictures = pics;
                r.resumeVal(this._pictures)
            });
        }

        //? Displays the album to the wall
        public post_to_wall(s: IStackFrame): void {
            // TODO: display picture thumbnails
            s.rt.postText(this.name(), s.pc);
        }
    }
}
