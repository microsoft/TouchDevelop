///<reference path='refs.ts'/>
module TDev.RT {
    //? A collection of pictures
    //@ stem("pics") enumerable cap(media)
    export class Pictures
        extends RTValue
    {
        private _urls: string[] = [];
        constructor() {
            super()
        }

        static mk(urls: string[]) {
            if (!urls) return undefined;

            var pics = new Pictures();
            pics._urls = urls;
            return pics;
        }

        //? Gets the picture at position 'index'; invalid if index is out of bounds
        //@ returns(Picture) picAsync
        public at(index: number, r : ResumeCtx) {
            this.atAsync(index, 'screen').done(p => r.resumeVal(p));
        }

        public atAsync(index: number, media: string): Promise {
            index = Math.floor(index);
            if (index < 0 || index > this._urls.length)
                return Promise.as(undefined);

            var url = Media.pictureUriForMedia(this._urls[index], media);
            return Picture.fromUrl(url);
        }

        //? Gets a random picture; invalid if collection is empty
        //@ returns(Picture) picAsync
        public random(r : ResumeCtx) {
            this.at(Math_.rand(this.count()), r);
        }

        //? Gets the number of elements in the collection
        public count() : number {
            return this._urls.length;
        }

        //? Finds a picture by name and returns the index. Returns -1 if not found.
        public find(name: string): number
        {
            for (var i = 0; i < length;++i)
                if (this._urls[i] === name)
                    return i;
            return -1;
        }

        //? Displays the picture thumbmails to the wall
        public post_to_wall(s:IStackFrame) {
            this._urls.forEach((url) => {
                Link.mk(url, LinkKind.image).post_to_wall(s);
            });
        }

        //? Gets the full resolution of i-th picture.
        //@ returns(Picture) picAsync
        public full(index: number, r : ResumeCtx) {
            this.atAsync(index, 'full').done(p => r.resumeVal(p));
        }

        //? Gets the thumbnail of i-th picture.
        //@ returns(Picture) picAsync
        public thumbnail(index: number, r : ResumeCtx) {
            this.atAsync(index, 'thumbnail').done(p => r.resumeVal(p));
        }

        //? Renamed to 'random'
        //@ hidden returns(Picture) picAsync
        public rand(r : ResumeCtx) {
            this.random(r);
        }
    }
}
