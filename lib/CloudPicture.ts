///<reference path='refs.ts'/>
module TDev.RT {
    //? A picture hosted on OneDrive.
    //@ cap(cloudservices) serializable stem("cloud pic") immutable ctx(general,cloudfield,json)
    export class CloudPicture
        extends RTValue
    {
        private provider: string;
        private id: string;
        public shared: boolean;
        // full scale size
        public width: number;
        public height: number;

        constructor() {
            super()
        }

        static mk(provider: string, id: string, shared : boolean, width : number, height : number) {
            var cp = new CloudPicture();
            cp.provider = provider;
            cp.id = id;
            cp.shared = shared;
            cp.width = width;
            cp.height = height;
            return cp;
        }

        public toString(): string
        {
            return "cloud picture";
        }

        // ctx is ignored
        public exportJson(ctx: JsonExportCtx): any {
            return {
                provider: this.provider,
                id : this.id,
                shared: this.shared,
                width: this.width,
                height : this.height
            }
        }
        public importJson(ctx: JsonImportCtx, data: any): RT.RTValue {
            if (typeof data != "object") data = undefined;
            this.provider = ctx.importString(data, "provider");
            this.id = ctx.importString(data, "id");
            this.shared = ctx.importBoolean(data, "shared");
            this.width = ctx.importNumber(data, "width");
            this.height = ctx.importNumber(data, "height");
            return this;
        }
        public toJsonKey(): any { return this.provider + this.id; }
        public keyCompareTo(other: any): number {
            var o: CloudPicture = other;
            var diff = this.provider.localeCompare(o.provider);
            if (diff) return diff;
            diff = this.id.localeCompare(o.id);
            return diff;
        }

        // do not expose to user
        public toPictureUrlAsync(media: string): Promise { // string
            var media = media.toLocaleLowerCase().trim();
            if (media == "screen")
                media = this.getScreenMedia();
            else if (!/^full|normal|thumbnail|album|small$/.test(media)) {
                /*
- full (maximum size: 2048 × 2048 pixels)
- normal (maximum size 800 × 800 pixels)
- album (maximum size 176 × 176 pixels)
- thumbnail, small (maximum size 96 × 96 pixels)
*/

                media = 'normal';
            }
            return OneDrive.downloadPictureUrlAsync(this.id, media)
        }

        private currentMedia: string = undefined;
        private pending: boolean = false;

        private chooseMedia(width: number, height: number): string {
            var size = Math.min(width, height);
            if (size > 1024) return "full";
            if (size > 176) return "normal";
            return "thumbnail";
        }

        public getScreenMedia() {
            return this.chooseMedia(SizeMgr.wallWindowWidth, SizeMgr.windowHeight);
        }

        public downloadPictureAsync(media: string): Promise { // Picture
			var pic : Picture = undefined;
            return this.toPictureUrlAsync(media)
                .then((url: string) => {
                    if (!url) return Promise.as(undefined);
					return Picture.fromUrl(url, false, false)
						.then(p => {
							pic = p;
							return p.initAsync();
						})
						.then(() => {
							pic.clearUrl();
							return pic;
						});
                });
        }

        //? Gets the picture with a particular size.
        //@ [media].deflStrings('normal', 'thumbnail', 'full') authAsync
        //@ returns(Picture)
        public to_picture(media: string, r : ResumeCtx) {
            this.toPictureUrlAsync(media)
                .done((url: string) => r.resumeVal(url ? Picture.fromUrlSync(url, true, false) : undefined),
                    (e) => r.resumeVal(undefined)
                );
        }

        //? Downloads the picture with a particular size.
        //@ [media].deflStrings('normal', 'thumbnail', 'full') async
        //@ returns(Picture)
        public download_picture(media: string, r: ResumeCtx) {
            this.downloadPictureAsync(media)
                .done(
					(p: Picture) => r.resumeVal(p),
					(e) => r.resumeVal(undefined));
        }

        public getViewCore(s: IStackFrame, b: BoxBase): HTMLElement {
            var d = div("item");
            // size attributes provide hints to the layout alg.
            d.setAttribute("height", (this.height || s.rt.host.userWallHeight()).toString());
            d.setAttribute("width", (this.width || s.rt.host.fullWallWidth()).toString());
            b.layoutcompletehandler = (width: number, height: number) => {
                var bestmedia = this.chooseMedia(width, height);
                if (bestmedia !== this.currentMedia && !this.pending) {
                    this.pending = true;
                    this.toPictureUrlAsync(bestmedia)
                        .done((url: string) => {
                            this.pending = false;
                            if (url) {
                                this.currentMedia = bestmedia;
                                var pic = HTML.mkImg(url);
                                pic.style.maxWidth = '100%';
                                pic.style.maxHeight = '100%';
                                d.setChildren([pic]);
                                b.RefreshOnScreen();
                            }
                        });
                }
            };
            return d;
        }

        //? Posts the picture to the wall.
        public post_to_wall(s:IStackFrame) : void { super.post_to_wall(s) }
    }
}
