///<reference path='refs.ts'/>
module TDev.RT {
    //? A picture
    //@ stem("pic") icon("fa-file-image-o") walltap enumerable
    export class Picture
        extends RTValue
    {
        // keep track of the original url, until the context is modified in any fashion
        // since the URL might contain access tokens, it should never be leaked to the user
        private _url: string;
        private _cors: boolean;
        private canvas : HTMLCanvasElement;
        private ctx : CanvasRenderingContext2D;
        private _date : DateTime = undefined;
        private _location: Location_ = undefined;
        // might be cached
        private _isResource: boolean = false;
        private _isReadOnly: boolean = false;
        private imageData : ImageData = null;
        private imageDataHasChanges = false;
        private fitToColumn = false;

        private initFn:(p:Picture)=>Promise;
        private initPromise:Promise;

        constructor() {
            super()
        }

        public clearUrl() {
            this._url = undefined;
        }

        public getReadonlyUrlSync() {
            if (this._isReadOnly && this._url && !this.canvas && !/^data:/.test(this._url)) return this._url;
            return undefined;
        }

        public getUrlAsync(): Promise {
            var url = this.getReadonlyUrlSync();
            if (url) return Promise.as(url);
            return this.getDataUriAsync();
        }

        public getDataUriAsync(quality: number = 0.95, maxWidth : number = -1): Promise {
            return this.initAsync()
                .then(() => {
                    this.commitImageData();
                    return this.getDataUri(quality, maxWidth);
                });
        }

        public getImageElement(): HTMLImageElement {
            if (this._isReadOnly && this._url && !this.canvas) {
                Util.log("img: direct display " + this._url.slice(0, 100));
                var img = <HTMLImageElement>createElement("img");
                img.src = this._url;
                img.alt = this._url;
                return img;
            }
            return undefined;
        }

        public getDataUri(quality: number = 0.9, maxWidth: number = -1, forceJpeg = false): string {
            this.commitImageData();
            var c = this.getCanvas();
            // dealing with empty image
            if (c.width == 0 || c.height == 0) {
                // create a 1x1 image to avoid a bogus data uri
                c = <HTMLCanvasElement>document.createElement('canvas');
                c.width = 1;
                c.height = 1;
            }

            if (maxWidth > 0 && c.width > maxWidth) {
                var temp = <HTMLCanvasElement>document.createElement('canvas');
                temp.width = maxWidth;
                temp.height = maxWidth / c.width * c.height;
                var tempCtx = temp.getContext("2d");
                tempCtx.drawImage(c, 0, 0, c.width, c.height, 0, 0, temp.width, temp.height);
                c = temp;
            }
            if (quality >= 1 && !forceJpeg)
                return c.toDataURL('image/png');
            else
                return c.toDataURL('image/jpeg', quality);
        }

        static mk(w:number, h:number) : Picture
        {
            var p = new Picture();
            p.initFn = () => {
                p._init(w, h);
                return Promise.as();
            };
            return p;
        }

        static mkSync(w:number, h:number) : Picture
        {
            var p = new Picture();
            p.initPromise = Promise.as();
            p._init(w, h);
            return p;
        }

        private imgLoadAsync(url : string, cors : boolean, dataUrl : string = null): Promise
        {
            var rt = Runtime.theRuntime;
            var auth = (!dataUrl && cors && !/^https:\/\/az31353.vo.msecnd.net\/pub\//.test(url)) ? Cloud.authenticateAsync(lf("image proxying")) : Promise.as(true);
            return auth.then((authenticated) => { // ask wab to expand urls
                Util.log('picture load: 0');
                if (dataUrl) {
                    Util.log('picture load: dataurl, skipping wab request');
                    return undefined;
                }
                else return Media.pictureDataUriAsync(url);
            }).then(d => {                        // update data url as needed
                if (!dataUrl && d) {
                    Util.log('picture: updated dataurl');
                    dataUrl = d;
                }
                return new Promise((onSuccess: (v: any) => any, onError: (v: any) => any, onProgress: (v: any) => any) => {
                    Util.log('picture: loading');
                    var img = <HTMLImageElement> document.createElement("img");
                    img.onload = () => {
                        Util.log('picture: loaded ' + img.width + 'x' + img.height);
                        this._init(img.width, img.height);
                        this._url = url;
                        this._cors = cors;
                        this.ctx.drawImage(img, 0, 0);
                        img = null;
                        dataUrl = null;
                        href = null;
                        onSuccess(this);
                    };
                    img.onerror = () => {
                        Util.log('picture: failed to load');
                        this._init(480, 480);
                        this._url = url;
                        this._cors = cors;
                        this.ctx.save();
                        this.ctx.fillStyle = "lightgray";
                        this.ctx.fillRect(0, 0, 480, 480);
                        this.ctx.fillStyle = "white";
                        this.ctx.textAlign = "center";
                        this.ctx.textBaseline = "top";
                        this.ctx.font = "240px sans-serif";
                        this.ctx.fillText(':(', 240, 60);
                        this.ctx.font = "42px sans-serif";
                        this.ctx.fillText('picture failed to load', 240, 360);
                        this.ctx.restore();
                        img = null;
                        dataUrl = null;
                        href = null;
                        onSuccess(this);
                    };
                    //(<any>img).crossOrigin = 'anonymous'; // attempt to thwart cross origin pixel security http://blog.chromium.org/2011/07/using-cross-domain-images-in-webgl-and.html
                    var href = dataUrl ? dataUrl : cors ? Web.proxy(url) : url;
                    img.src = href;
                    img.alt = url;
                })
            });
        }

        private delayLoadSync(f: (p: Picture) => Promise): Picture {
            this.initFn = f;
            return this;
        }

        private delayLoad(f: (p: Picture) => Promise): Promise {
            this.delayLoadSync(f);
            return Promise.as(this);
        }

        static delayed(f:(p:Picture)=>Promise):Promise
        {
            return new Picture().delayLoad(f);
        }

        static fromImage(img: HTMLImageElement): Picture {
            var p = Picture.mkSync(img.width, img.height);
            p.ctx.save();
            p.ctx.drawImage(img, 0, 0, img.width, img.height);
            p.ctx.restore();
            return p;
        }

        static fromCanvas(canvas : HTMLCanvasElement) : Picture {
            var p = Picture.mkSync(canvas.width, canvas.height);
            p.ctx.save();
            p.ctx.drawImage(canvas, 0, 0, canvas.width, canvas.height);
            p.ctx.restore();
            return p;
        }

        static fromDataUrl(dataUrl:string, originalUrl : string = null, isResource = false) : Promise
        {
            if (!dataUrl) return Promise.as(null);

            Util.log('picture: loading from dataurl');
            Util.check(/^data:image\/(jpeg|png|svg\+xml);base64,/i.test(dataUrl));
            var img = new Picture();
            img._isResource = isResource;
            img._isReadOnly = isResource;
            return img.delayLoad((p) => p.imgLoadAsync(originalUrl, false, dataUrl));
        }

        static fromUrlSync(url: string, isReadOnly  = false, cors = true): Picture {
            var img = new Picture();
            img._url = url;
            img._isResource = false;
            img._isReadOnly = isReadOnly;
            return img.delayLoadSync(p => p.loadAsync(url, cors));
        }

        static fromUrl(url: string, isReadOnly  = false, cors = true): Promise
        {
            return Promise.as(Picture.fromUrlSync(url, isReadOnly, cors));
        }

        // specialized in various platforms
        static patchLocalArtUrl(url : string) : string {
            return url;
        }

        static fromArtUrl(url:string) : Promise
        {
            // make sure to avoid loading a data url
            if (/^data:image\/(jpeg|png|svg\+xml);base64,/i.test(url)) return Picture.fromDataUrl(url, undefined, true);

            var cors = true;
            // update local art as needed
            if (/^\.\/art\//.test(url)) {
                url = Picture.patchLocalArtUrl(url);
                cors = false; // no CORS needed
            }

            return ArtCache.getArtAsync(url, "image/*")
                .then(() => {
                    Util.log('picture: fromArtUrl delayed');
                    var img = new Picture();
                    img._url = url;
                    img._isResource = true;
                    img._isReadOnly = true;
                    return img.delayLoad((p) => p.loadAsync(url, cors));
                })
        }

        private loadAsync(url: string, cors : boolean) {
            // do not test for CORS with data urls
            if (/^data:image\/(jpeg|png|svg\+xml);base64,/i.test(url))
                return this.imgLoadAsync(url, false, url);

            // Art hosted on TouchDevelop?
            if (this._isResource || ArtCache.isArtResource(url))
                return ArtCache.getArtAsync(url, "image/*")
                       .then(dataUrl => this.imgLoadAsync(url, cors, dataUrl));
            // default load
            return this.imgLoadAsync(url, cors);
        }

        static fromSVGIcon(name:string, sz:number)
        {
            var p = Picture.mkSync(sz, sz);
            p.ctx.save();
            var scale = sz/480;
            p.ctx.fillStyle = "white";
            p.ctx.scale(scale, scale);
            SVG.drawSVG(p.ctx, name);
            p.ctx.restore();
            p.fitToColumn = false;
            return p;
        }

        private _init(w:number, h:number)
        {
            w = Math.round(w);
            h = Math.round(h);
            this.slowlyloadingelement = undefined;
            this.canvas = <HTMLCanvasElement>document.createElement("canvas");
            this.canvas.width = w;
            this.canvas.height = h;
            this.ctx = this.canvas.getContext("2d");
        }

        private commitImageData()
        {
            if (this.imageDataHasChanges) {
                this.imageDataHasChanges = false;
                this.ctx.putImageData(this.imageData, 0, 0);
            }
        }

        private changed(invalidateData = true) {
            if (this._isReadOnly)
                TDev.Util.userError(lf("This picture cannot be modified. Use 'clone' to get a copy of the picture that can be modified.\n\n    var pic := \u273fmy art->clone"));
            if (invalidateData) {
                this.commitImageData();
                this.imageData = null;
            }
            this.versioncounter++;
            this._url = undefined; // image modified, forget about url
        }

        public getImageData() : ImageData
        {
            Util.assert(!!this.ctx);
            if (!this.imageData)
                this.imageData = this.ctx.getImageData(0, 0, this.widthSync(), this.heightSync());
            return this.imageData;
        }

        public hasCanvas()
        {
            return !!this.canvas;
        }

        public widthSync():number
        {
            return this.canvas.width;
        }

        public heightSync():number
        {
            return this.canvas.height;
        }

        public getCanvas() : HTMLCanvasElement
        {
            Util.assert(!!this.canvas);
            return this.canvas;
        }

        //? Gets the number of pixels
        //@ readsMutable returns(number)
        //@ picAsync
        public count(r:ResumeCtx)
        {
            this.loadFirst(r, () => {
                return this.canvas.width * this.canvas.height;
            });
        }

        //? Gets the date time where the picture was taken; if any.
        //@ readsMutable returns(DateTime)
        //@ picAsync
        public date(r:ResumeCtx)
        {
            this.loadFirst(r, () => {
                return this._date;
            });
        }

        //? Gets the height in pixels
        //@ readsMutable returns(number)
        //@ picAsync
        public height(r:ResumeCtx)
        {
            this.loadFirst(r, () => {
                return this.canvas.height;
            });
        }

        //? Checks if the picture is the same instance as the other picture. This action does not check that pixels are the same between two different pictures.
        public equals(other_picture: Picture) : boolean {
            return this == other_picture;
        }

        //? Indicates if the picture width is greater than its height
        //@ readsMutable returns(boolean)
        //@ picAsync
        public is_panorama(r:ResumeCtx)
        {
            this.loadFirst(r, () => {
                return this.canvas.width > this.canvas.height;
            });
        }

        //? Gets the location where the picture was taken; if any.
        //@ flow(SourceGeoLocation) returns(Location_)
        //@ readsMutable
        //@ picAsync
        public location(r:ResumeCtx)
        {
            this.loadFirst(r, () => {
                return this._location;
            });
        }

        //? Gets the width in pixels
        //@ readsMutable returns(number)
        //@ picAsync
        public width(r:ResumeCtx)
        {
            this.loadFirst(r, () => {
                return this.canvas.width;
            });
        }

        //? Refreshes the picture on the wall
        //@ readsMutable
        public update_on_wall() : void
        {
            if (this.imageData)
                this.ctx.putImageData(this.imageData, 0, 0);
            //commitImageData();
        }

        //? Gets the pixel color at the given linear index
        //@ readsMutable returns(Color)
        //@ picAsync
        public at(index:number, r:ResumeCtx)
        {
            this.loadFirst(r, () => {
                if (isNaN(index)) return Colors.transparent();

                index = Math.round(index);
                index *= 4;
                var id = this.getImageData();
                if (index < 0 || index >= id.data.length)
                    return Colors.transparent();
                return Color.fromArgb(id.data[index+3], id.data[index], id.data[index+1], id.data[index+2]);
            });
        }

        public initAsync() : Promise
        {
            if (this.initPromise) return this.initPromise;
            var f = this.initFn;
            if (f) {
                this.initFn = null;
                this.initPromise = f(this);
                this.initPromise.done(() => {
                    this.initPromise = null;
                })
                if (this.initPromise)
                    return this.initPromise;
            }
            return Promise.as();
        }

        public loadFirst(r:ResumeCtx, f:()=>any):void
        {
            Util.assert(!!r); // fail early if no resume ctx
            if (!this.initPromise && !this.initFn) {
                //Util.log('picture: sync load');
                if (!f) r.resume();
                else r.resumeVal(f());
            } else {
                //Util.log('picture: async load');
                this.initAsync().done(() => {
                    if (!f) r.resume();
                    else r.resumeVal(f());
                })
            }
        }

        private atPosition(r:ResumeCtx, left:number, top:number, angle:number, opacity:number, f:() => void):void
        {
            this.loadFirst(r, () => {
                this.changed();
                this.ctx.save();
                    this.ctx.translate(left, top);
                    this.ctx.rotate(angle / 180 * Math.PI);
                    this.ctx.globalAlpha = Math_.normalize(opacity);
                    f();
                this.ctx.restore();
            })
        }

        //? Writes another picture at a given location. The opacity ranges from 0 (transparent) to 1 (opaque).
        //@ writesMutable [other].readsMutable
        //@ [opacity].defl(1)
        //@ picAsync
        public blend(other: Picture, left: number, top: number, angle: number, opacity: number, r:ResumeCtx): void {
            opacity = Math_.normalize(opacity);
            this.atPosition(r, left, top, angle, opacity, () => {
                other.initAsync().done(() =>
                    this.ctx.drawImage(other.getCanvas(), 0, 0))
            });
        }

        //? Returns a copy of the image
        //@ readsMutable [result].writesMutable returns(Picture)
        //@ picAsync
        public clone(r:ResumeCtx)
        {
            this.loadFirst(r, () => {
                this.commitImageData();
                var p = Picture.mkSync(this.widthSync(), this.heightSync());
                p.ctx.drawImage(this.canvas, 0, 0);
                p._url = this._url;
                p._cors = this._cors;
                p._date = this._date;
                p._location = this._location;
                return p;
            });
        }

        //? Fills a rectangle with a given color
        //@ writesMutable
        //@ [width].defl(100) [height].defl(100) [angle].defl(0) [color].deflExpr('colors->accent')
        //@ picAsync
        public fill_rect(left:number, top:number, width:number, height:number, angle:number, color:Color, r:ResumeCtx) : void
        {
            this.atPosition(r, left, top, angle, color.A(), () => {
                this.ctx.fillStyle = color.toHtml();
                this.ctx.fillRect(0, 0, width, height);
            });
        }

        //? Gets the pixel color
        //@ readsMutable returns(Color)
        //@ picAsync
        public pixel(left: number, top: number, r:ResumeCtx)
        {
            this.initAsync().done(() => {
              left = Math.round(left);
              top = Math.round(top);
              this.at(left + top * this.widthSync(), r);
            });
        }

        public getViewCanvasClone(): HTMLCanvasElement {
            this.commitImageData();
            // Create a deep copy of the canvas to allow multiple pictures at once
            var rc = <HTMLCanvasElement>document.createElement("canvas");
            rc.width = this.widthSync();
            rc.height = this.heightSync();
            var rx = rc.getContext("2d");
            rx.drawImage(this.canvas, 0, 0);
            return rc;

        }

        public getViewCanvas(): HTMLCanvasElement
        {
            this.commitImageData();
            if (this.canvas.parentElement || LayoutMgr.RenderExecutionMode()) {
                // Create a deep copy of the canvas to allow multiple pictures at once
                var rc = <HTMLCanvasElement>document.createElement("canvas");
                rc.width = this.widthSync();
                rc.height = this.heightSync();
                var rx = rc.getContext("2d");
                rx.drawImage(this.canvas, 0, 0);
                this.canvas = rc;
                this.ctx = rx;
                this.slowlyloadingelement = undefined;
            }

            this.fitToColumn = !LayoutMgr.RenderExecutionMode();

            if (this.fitToColumn && this.heightSync() > 0 && this.widthSync() > 0) {
                var r = this.heightSync() / this.widthSync();
                var colwidth = SizeMgr.getColumnWidth();
                if (this.widthSync() > colwidth) {
                    this.canvas.style.width = colwidth + "px";
                    this.canvas.style.height = (colwidth * r) + "px";
                }
            }
            return this.canvas;
        }

        private slowlyloadingelement: HTMLElement;
        public getViewCore(s: IStackFrame, b: BoxBase): HTMLElement
        {
            var r = div("viewPicture");
            var img = this.getImageElement();
            if (img) {
                img.setAttribute('class', 'wall-picture');
                this.slowlyloadingelement = img;
                return img;
            } else {
                this.slowlyloadingelement = undefined;
                this.initAsync().done(() => {
                    this.commitImageData();
                    r.setChildren(this.getViewCanvas());
                    b.RefreshOnScreen();
                });
            }
            return r;
        }

        public updateViewCore(s: IStackFrame, b: BoxBase) {
            if (LayoutMgr.RenderExecutionMode() && this.slowlyloadingelement) {
                this.slowlyloadingelement.onload = () => {
                    //Util.log("onload");
                    if (this.slowlyloadingelement.offsetParent) {
                        // element is already in DOM... remove and reinsert element so it does resize
                        var c = this.getViewCore(s, b);
                        c.onload = () => {
                            b.RefreshOnScreen();
                        }
                        c.onerror = () => {
                            b.SwapImageContent(Picture.errorPic());
                        }
                        b.SwapImageContent(c);
                    }
                    else {
                        b.RefreshOnScreen();
                    }
                }
                this.slowlyloadingelement.onerror = () => {
                    // Util.log("onerror")
                    b.SwapImageContent(Picture.errorPic());
                }
            }
        }

        static errorPic(): HTMLElement {
            // Util.log("onerror")
            var frowny = div(null, ":(");
            var msg = div(null, "picture failed to load");
            var rect = div(null, frowny, document.createElement("br"), msg);
            rect.style.background = "lightgray";
            rect.style.fontFamily = "sans-serif";
            rect.style.color = "white";
            frowny.style.fontSize = "240px";
            msg.style.marginBottom = "1em";
            msg.style.marginLeft = "1em";
            msg.style.fontSize = "42px";
            rect.style.height = "480px";
            rect.style.width = "480px";
            return rect;
        }

        //? Resizes the picture to the given size in pixels
        //@ writesMutable
        //@ [width].defl(100) [height].defl(-1)
        //@ picAsync
        public resize(width:number, height:number, r:ResumeCtx) : void
        {
            this.loadFirst(r, () => {
                this.changed();

                width = Math.round(width);
                height = Math.round(height);
                if (width < 1)
                    width = Math.floor(this.widthSync() / this.heightSync() * height);
                if (height < 1)
                    height = Math.floor(this.heightSync() / this.widthSync() * width);
                if (width == this.widthSync() && height == this.heightSync()) return;

                var ow = this.widthSync();
                var oh = this.heightSync();

                // clone canvas
                var temp = <HTMLCanvasElement>document.createElement('canvas');
                temp.width = ow;
                temp.height = oh;
                var tempCtx = temp.getContext("2d");
                tempCtx.drawImage(this.canvas, 0, 0, ow, oh);

                // resize and draw
                this.canvas.width = width;
                this.canvas.height = height;
                this.ctx.save();
                this.ctx.drawImage(temp, 0, 0, ow, oh, 0, 0, width, height);
                this.ctx.restore();
            });
        }

        //? Saves the picture and returns the file name if successful.
        //@ flow(SinkMedia) returns(string)
        //@ readsMutable ignoreReturnValue
        //@ async
        public save_to_library(r:ResumeCtx) // : string
        {
            HTML.showProgressNotification(lf("saving picture"));
            this.loadFirst(r, () => {
                var defaultName = Picture.niceFilename() + ".png";
                if ((<any>window).navigator.msSaveOrOpenBlob) {
                    try {
                        var result = (<any>window).navigator.msSaveOrOpenBlob(this.canvas.msToBlob(), defaultName);
                        return defaultName;
                    } catch(e) {
                        HTML.showProgressNotification(lf("saving picture failed..."));
                        return "";
                    }
                }
                else {
                    var url = this.canvas.toDataURL('image/png');
                    var link = <HTMLAnchorElement>window.document.createElement('a');
                    link.href = url;
                    (<any>link).download = defaultName;
                    var click = document.createEvent("Event");
                    click.initEvent("click", true, true);
                    link.dispatchEvent(click);
                }
                return defaultName;
            });
        }

        //? Clears the picture to a given color
        //@ writesMutable
        //@ [color].deflExpr('colors->transparent')
        //@ picAsync
        public clear(color:Color, r:ResumeCtx) : void {
            this.loadFirst(r, () => {
                this.changed();
                this.ctx.save();
                this.ctx.clearRect(0, 0, this.widthSync(), this.heightSync());
                this.ctx.fillStyle = color.toHtml();
                this.ctx.fillRect(0, 0, this.widthSync(), this.heightSync());
                this.ctx.restore();
            });

        }

        //? Clears a rectangle on a the picture to a given color
        //@ writesMutable
        //@ [color].deflExpr('colors->transparent') [width].defl(10) [height].defl(10)
        //@ picAsync
        public clear_rect(color: Color, left: number, top: number, width: number, height: number, r: ResumeCtx): void {
            if (isNaN(left) || isNaN(top) || isNaN(width) || isNaN(height)
                || width <= 0 || height <= 0) {
                r.resume();
            } else {
                this.loadFirst(r, () => {
                    this.changed();
                    this.ctx.save();
                    this.ctx.clearRect(left, top, width, height);
                    this.ctx.fillStyle = color.toHtml();
                    this.ctx.fillRect(left, top, width, height);
                    this.ctx.restore();
                });
            }
        }

        public eraseWhiteBackgroundAsync() : Promise {
            return this.initAsync()
                .then(() => {
                    this.changed();
                    this.ctx.save();
                    var data = this.ctx.getImageData(0, 0, this.widthSync(), this.heightSync());
                    var p = data.data;
                    var threshold = 25;
                    for (var i = 0; i < p.length; i+=4)
                    {
                        var dr = 255 - p[i];
                        var dg = 255 - p[i+1];
                        var db = 255 - p[i+2];
                        if (dr < threshold
                        && dg < threshold
                        && db < threshold) {
                            p[i + 3] = Math.floor((dr + dg + db) / (3 * threshold) * 255);
                        }
                    }
                    this.ctx.putImageData(data, 0, 0);
                    this.ctx.restore();
                });
        }

        //? Recolors the picture with the background and foreground color, based on a color threshold between 0.0 and 1.0
        //@ writesMutable
        //@ [background].deflExpr('colors->accent') [foreground].deflExpr('colors->background') [threshold].defl(0.65)
        //@ picAsync
        public colorize(background:Color, foreground:Color, threshold:number, r:ResumeCtx) : void
        {
            this.loadFirst(r, () => {
                this.changed();
                this.ctx.save();
                var data = this.ctx.getImageData(0, 0, this.widthSync(), this.heightSync());
                var p = data.data;
                var ba = background.a;
                var br = background.r;
                var bg = background.g;
                var bb = background.b;
                var fa = foreground.a;
                var fr = foreground.r;
                var fg = foreground.g;
                var fb = foreground.b;
                var threshold255 = 255 * Math_.normalize(threshold) * 3;
                for (var i = 0; i < p.length; i+=4)
                {
                    var k = (p[i] + p[i+1] + p[i+2]);
                    var isb = k < threshold255;
                    // apply tint
                    p[i] = isb ? br : fr;
                    p[i + 1] = isb ? bg : fg;
                    p[i + 2] = isb ? bb : fb;
                    p[i + 3] = isb ? ba : fa;
                }
                this.ctx.putImageData(data, 0, 0);
                this.ctx.restore();
            });
        }

        //? Inverts the colors in the picture
        //@ writesMutable
        //@ picAsync
        public negative(r : ResumeCtx) : void
        {
            this.loadFirst(r, () => {
                this.changed();
                this.ctx.save();
                var data = this.ctx.getImageData(0, 0, this.widthSync(), this.heightSync());
                var p = data.data;
                for (var i = 0; i < p.length; i+=4)
                {
                    p[i] = 255 - p[i];
                    p[i+1] = 255 - p[i+1];
                    p[i+2] = 255 - p[i+2];
                }
                this.ctx.putImageData(data, 0, 0);
                this.ctx.restore();
            });
        }

        //? Makes picture monochromatic (black and white)
        //@ writesMutable
        //@ picAsync
        public desaturate(r:ResumeCtx) : void
        {
            this.loadFirst(r, () => {
                this.changed();
                this.ctx.save();
                var data = this.ctx.getImageData(0, 0, this.widthSync(), this.heightSync());
                var p = data.data;
                for (var i = 0; i < p.length; i+=4)
                {
                    var k = (p[i] + p[i+1] + p[i+2])/3;
                    // apply tint
                    p[i] = k;
                    p[i+1] = k;
                    p[i+2] = k;
                }
                this.ctx.putImageData(data, 0, 0);
                this.ctx.restore();
            });
        }

        //? Inverts the red, blue and green channels
        //@ writesMutable
        //@ picAsync
        public invert(r:ResumeCtx) : void
        {
            this.loadFirst(r, () => {
                this.changed();
                this.ctx.save();
                var data = this.ctx.getImageData(0, 0, this.widthSync(), this.heightSync());
                var p = data.data;
                for (var i = 0; i < p.length; i+=4)
                {
                    p[i] = 255-p[i];
                    p[i+1] = 255-p[i+1];
                    p[i+2] = 255-p[i+2];
                }
                this.ctx.putImageData(data, 0, 0);
                this.ctx.restore();
            });
        }

        //? Converts every pixel to gray and tints it with the given color.
        //@ writesMutable
        //@ [color].deflExpr('colors->sepia')
        //@ picAsync
        public tint(color:Color, r:ResumeCtx) : void
        {
            this.loadFirst(r, () => {
                var tint = color;
                this.changed();
                var ta = tint.A();
                var tr = tint.R();
                var tg = tint.G();
                var tb = tint.B();
                this.ctx.save();
                var data = this.ctx.getImageData(0, 0, this.widthSync(), this.heightSync());
                var p = data.data;
                // see Digital video and HDTV: algorithms and interfaces
                for (var i = 0; i < p.length; i+=4)
                {
                    var a = p[i+3];
                    var r = p[i];
                    var g = p[i+1];
                    var b = p[i+2];;
                    // convert to gray with constant factors according to luminance contribution
                    // of each color channel, 0.2126 - 0.7152 - 0.0722
                    var gray = (r *  0.2126 + g * 0.7152 + b *  0.0722);

                    // apply tint
                    a = a * ta;
                    r = gray * tr;
                    g = gray * tg;
                    b = gray * tb;

                    p[i+3] = a;
                    p[i] = r;
                    p[i+1] = g;
                    p[i+2] = b;
                }
                this.ctx.putImageData(data, 0, 0);
                this.ctx.restore();
            });
        }

        //? Changes the brightness of the picture. factor in [-1, 1].
        //@ writesMutable
        //@ [factor].defl(0.05)
        //@ picAsync
        public brightness(factor:number, r:ResumeCtx) : void
        {
            this.loadFirst(r, () => {
                this.changed();
                // see Digital video and HDTV: algorithms and interfaces
                // brightness is a translation of pixels
                var f = factor < -1.0 ? -1.0 : factor > 1.0 ? 1.0 : factor;
                var fi = f * 255;

                this.ctx.save();
                var data = this.ctx.getImageData(0, 0, this.widthSync(), this.heightSync());
                var p = data.data;
                for (var i = 0; i < p.length; i+=4)
                {
                    var r = p[i];
                    var g = p[i+1];
                    var b = p[i+2];;

                    var ri = r + fi;
                    var gi = g + fi;
                    var bi = b + fi;

                    r = ri > 255 ? 255 : (ri < 0 ? 0 : ri);
                    g = gi > 255 ? 255 : (gi < 0 ? 0 : gi);
                    b = bi > 255 ? 255 : (bi < 0 ? 0 : bi);

                    p[i] = r;
                    p[i+1] = g;
                    p[i+2] = b;
                }
                this.ctx.putImageData(data, 0, 0);
                this.ctx.restore();
            });
        }

        //? Changes the contrast of the picture. factor in [-1, 1].
        //@ writesMutable
        //@ [factor].defl(0.05)
        //@ picAsync
        public contrast(factor:number, r:ResumeCtx) : void
        {
            this.loadFirst(r, () => {
                this.changed();
                // see Digital video and HDTV: algorithms and interfaces
                // contrast is a scaling of pixels
                var f = factor < -1.0 ? -1.0 : factor > 1.0 ? 1.0 : factor;
                var cfi = 1 + f;
                this.ctx.save();
                var data = this.ctx.getImageData(0, 0, this.widthSync(), this.heightSync());
                var p = data.data;
                for (var i = 0; i < p.length; i+=4)
                {
                    var r = p[i];
                    var g = p[i+1];
                    var b = p[i+2];;

                    var ri = r - 128;
                    var gi = g - 128;
                    var bi = b - 128;

                    ri = ri * cfi;
                    gi = gi * cfi;
                    bi = bi * cfi;

                    ri = ri + 128;
                    gi = gi + 128;
                    bi = bi + 128;

                    r = ri > 255 ? 255 : (ri < 0 ? 0 : ri);
                    g = gi > 255 ? 255 : (gi < 0 ? 0 : gi);
                    b = bi > 255 ? 255 : (bi < 0 ? 0 : bi);

                    p[i] = r;
                    p[i+1] = g;
                    p[i+2] = b;
                }
                this.ctx.putImageData(data, 0, 0);
                this.ctx.restore();
            });
        }

        //? Crops a sub-image
        //@ writesMutable
        //@ picAsync
        public crop(left:number, top:number, width:number, height:number, r:ResumeCtx) : void
        {
            this.loadFirst(r, () => {
                var ileft = Math.round(left);
                var itop = Math.round(top);
                var iwidth = Math.round(width);
                var iheight = Math.round(height);
                if (this.widthSync() == 0 || this.heightSync() == 0) return; // nothing to crop
                // make sure parameters are in bounds
                if (ileft < 0)
                    ileft = 0;
                else if (ileft >= this.widthSync())
                    ileft = this.widthSync() - 1;
                if (itop < 0)
                    itop = 0;
                else if (itop >= this.heightSync())
                    itop = this.heightSync() - 1;
                if (ileft + iwidth > this.widthSync())
                    iwidth = this.widthSync() - ileft;
                if (itop + iheight > this.heightSync())
                    iheight = this.heightSync() - itop;

                this.cropInternal(ileft, itop, iwidth, iheight);
            });
        }

        private cropInternal(left:number, top:number, cwidth:number, cheight:number) : void
        {
            TDev.Contract.Requires(left >= 0 && left < this.widthSync());
            TDev.Contract.Requires(top >= 0 && top < this.heightSync());
            TDev.Contract.Requires(cwidth >= 0 && left + cwidth <= this.widthSync());
            TDev.Contract.Requires(cheight >= 0 && top + cheight <= this.heightSync());

            this.changed();
            var imageData: ImageData = undefined;
            if (cwidth > 0 && cheight > 0)
                imageData = this.ctx.getImageData(left, top, cwidth, cheight);
            this.canvas.width = cwidth;
            this.canvas.height = cheight;
            this.ctx = this.canvas.getContext("2d");
            if (imageData)
                this.ctx.putImageData(imageData, 0, 0);
        }

        //? Draws an elliptic border with a given color
        //@ writesMutable
        //@ [width].defl(100) [height].defl(100) [angle].defl(0) [c].deflExpr('colors->accent') [thickness].defl(3)
        //@ picAsync
        public draw_ellipse(left:number, top:number, width:number, height:number, angle:number, c:Color, thickness:number, r:ResumeCtx) : void
        {
            if (isNaN(thickness) || thickness < 0) thickness = 2.0;
            this.atPosition(r, left+width/2, top+height/2, angle, c.A(), () => {
                this.ctx.scale(width/height, 1);
                this.ctx.strokeStyle = c.toHtml();
                this.ctx.lineWidth = thickness;
                this.ctx.beginPath();
                this.ctx.arc(0,0,height/2, 0, 2*Math.PI);
                this.ctx.stroke();
            });
        }

        //? Draws a line between two points
        //@ writesMutable
        //@ [color].deflExpr('colors->accent') [thickness].defl(3)
        //@ picAsync
        public draw_line(x1:number, y1:number, x2:number, y2:number, color:Color, thickness:number, r:ResumeCtx) : void {
            if (isNaN(thickness) || thickness < 0) thickness = 2.0;
            this.atPosition(r, 0, 0, 0, color.A(), () => {
                this.ctx.beginPath();
                this.ctx.strokeStyle = color.toHtml();
                this.ctx.lineWidth = thickness;
                this.ctx.moveTo(x1, y1)
                this.ctx.lineTo(x2, y2);
                this.ctx.stroke();
            });
        }

        //? Draws a rectangle border with a given color
        //@ writesMutable
        //@ [width].defl(100) [height].defl(100) [angle].defl(0) [color].deflExpr('colors->accent') [thickness].defl(3)
        //@ picAsync
        public draw_rect(left:number, top:number, width:number, height:number, angle:number, color:Color, thickness:number, r:ResumeCtx) : void
        {
            if (isNaN(thickness) || thickness < 0) thickness = 2.0;
            this.atPosition(r, left, top, angle, color.A(), () => {
                this.ctx.strokeStyle = color.toHtml();
                this.ctx.lineWidth = thickness;
                this.ctx.strokeRect(0, 0, width, height);
            });
        }

        //? Draws some text border with a given color and font size
        //@ writesMutable
        //@ [font_size].defl(16) [angle].defl(0) [color].deflExpr('colors->foreground')
        //@ picAsync
        public draw_text(left:number, top:number, text:string, font_size:number, angle:number, color:Color, r:ResumeCtx) : void
        {
            this.atPosition(r, left, top, angle, color.A(), () => {
                this.ctx.fillStyle = color.toHtml();
                this.ctx.font = font_size + "px sans-serif";
                this.ctx.textBaseline = "top";
                this.ctx.fillText(text, 0, 0);
            });
        }

        //? Fills a ellipse with a given color
        //@ writesMutable
        //@ [width].defl(100) [height].defl(100) [angle].defl(0) [color].deflExpr('colors->random')
        //@ picAsync
        public fill_ellipse(left:number, top:number, width:number, height:number, angle:number, color:Color, r:ResumeCtx) : void
        {
            this.atPosition(r, left+width/2, top+height/2, angle, color.A(), () => {
                this.ctx.scale(width/height, 1);
                this.ctx.strokeStyle = color.toHtml();
                this.ctx.fillStyle = color.toHtml();
                this.ctx.beginPath();
                this.ctx.arc(0,0,height/2, 0, 2*Math.PI);
                this.ctx.fill();
            });
        }

        /*
        //? Draws a path with a given color.
        //@ writesMutable
        //@ [angle].defl(0) [color].deflExpr('colors->random')
        //@ picAsync
        public draw_path(left : number, top : number, angle : number, color:Color, thickness : number, data : string, r : ResumeCtx) : void {
            this.atPosition(r, left, top, angle, color.A(), () => {
                var parts = data.split(' ');
                this.ctx.strokeStyle = color.toHtml();
                this.ctx.lineWidth = thickness;
                this.ctx.beginPath();
                this.parsePathData(data);
                this.ctx.stroke();
            });
        }

        //? Fills a path with a given color.
        //@ writesMutable
        //@ [angle].defl(0) [color].deflExpr('colors->random')
        //@ picAsync
        public fill_path(left : number, top : number, angle : number, color:Color, data : string, r : ResumeCtx) : void {
            this.atPosition(r, left, top, angle, color.A(), () => {
                this.ctx.strokeStyle = color.toHtml();
                this.ctx.fillStyle = color.toHtml();
                this.ctx.beginPath();
                this.parsePathData(data);
                this.ctx.fill();
            });
        }
        */

        static parseSvg(xml : string, width : number, height : number) : HTMLCanvasElement {
            try {
                var svg = XmlObject.mk(xml);
                if (!svg || svg.name() != "svg")
                    return null;

                var svgWidth = parseFloat(svg.attr("width"));
                var svgHeight = parseFloat(svg.attr("height"));

                if (height < 0)
                    height = width / svgWidth * svgHeight;
                else if (width < 0)
                    width = height / svgHeight * svgWidth;

                var canvas = <HTMLCanvasElement>document.createElement("canvas");
                canvas.width = width;
                canvas.height = height;

                var ctx = canvas.getContext("2d");

                ctx.scale(width / svgWidth, height / svgHeight);

                var g = svg.child("g");
                if (!g) return null;

                var transform = g.attr("transform");
                var m = /matrix\(([^)]+)\)/.exec(transform);
                if (m) {
                    var v = m[1].split(/[, ]/).map(p => parseFloat(p));
                    ctx.transform(v[0], v[1], v[2], v[3], v[4], v[5]);
                }

                var paths = g.children('');
                ctx.fillStyle = 'none';
                ctx.strokeStyle = 'none';
                for(var i = 0; i < paths.count(); ++i) {
                    var path = paths.at(i);
                    ctx.save();
                    switch(path.name()) {
                        case 'path':
                            ctx.beginPath();
                            if(!Picture.parsePathData(ctx, path.attr('d')))
                                return null;
                            Picture.parsePathStyle(ctx, path);
                            break;
                        case 'polygon':
                            ctx.beginPath();
                            if(!Picture.parsePolygonData(ctx, path.attr('points')))
                                return null;
                            ctx.closePath();
                            Picture.parseFillStyle(ctx, path);
                            Picture.parseStrokeStyle(ctx, path);
                            break;
                        case 'line':
                            ctx.moveTo(parseFloat(path.attr('x1')), parseFloat(path.attr('y1')));
                            ctx.lineTo(parseFloat(path.attr('x2')), parseFloat(path.attr('y2')));
                            Picture.parseStrokeStyle(ctx,path);
                            break;
                        default:
                            Util.log('svg rendering: unsupported command ' + path.name());
                            return null;
                    }
                    ctx.restore();
                }

                return canvas;
            } catch(e) {
                return null;
            }
        }

        static parsePolygonData(ctx : CanvasRenderingContext2D , data : string) {
            if (!data) return false;
            var points = data.split(' ').map(p => p.split(',').map(x => parseFloat(x)));
            for(var i = 0; i < points.length; ++i) {
                var p = points[i];
                if (i == 0) ctx.moveTo(p[0], p[1]);
                else ctx.lineTo(p[0], p[1]);
            }
            return true;
        }

        static parseFillStyle(ctx : CanvasRenderingContext2D, x : XmlObject) {
            var fill = x.attr('fill');
            if (fill)
                ctx.fillStyle = x.attr('fill');
            if (!fill || fill != 'none') {
                ctx.closePath();
                ctx.fill();
            }
        }

        static parseStrokeStyle(ctx : CanvasRenderingContext2D, x : XmlObject) {
            var stroke = x.attr('stroke');
            if (stroke && stroke != 'none') {
                ctx.strokeStyle = stroke;
                if (x.attr('stroke-width')) ctx.lineWidth = parseFloat(x.attr('stroke-width'));
                if (x.attr('stroke-linejoin')) ctx.lineJoin = x.attr('stroke-linejoin');
                ctx.stroke();
            }
        }

        static parsePathStyle(ctx : CanvasRenderingContext2D , x : XmlObject) {
            if (!x.attr('fill') && !x.attr('style')) {
                ctx.strokeStyle = '#000000';
                ctx.closePath();
                ctx.fill();
                return;
            }
            Picture.parseFillStyle(ctx, x);
            Picture.parseStrokeStyle(ctx, x);
            var data = x.attr('style');
            if (data) {
                var m = /fill:([^;]+);/i.exec(data);
                if (m && !/none/.test(m[1])) {
                    ctx.fillStyle = m[1];
                    ctx.closePath();
                    ctx.fill();
                }
                m = /stroke:([^;]+);/i.exec(data);
                if (m && !/none/.test(m[1])) {
                    ctx.strokeStyle = m[1];
                    m = /stroke-width:([^;]+);/.exec(data);
                    if (m)
                        ctx.lineWidth = parseFloat(m[1]);
                    ctx.stroke();
                }
            }
        }

        static applyStyle(ctx : CanvasRenderingContext2D) {
            if (ctx.fillStyle && ctx.fillStyle != 'none')
                ctx.fill();
        }

        static parsePathData(ctx : CanvasRenderingContext2D , data : string) {
            if (!data) return false;
            var parts = data
                .replace(/-/gm, ' -')
                .replace(/[a-zA-Z]/gm, ' $& ')
                .replace(/,/gm, ' ')
                .split(/\s+/)
                .filter(p => !!p);
            var x = 0;
            var y = 0;
            var rx = 0;
            var ry = 0;
            var i = 0;
            var cpx = 0; // last control point
            var cpy = 0;
            var lastCommand = '';
            while(i < parts.length) {
                var command = parts[i++];
                switch(command) {
                    case 'Z':
                    case 'z':
                        ctx.closePath();
                        break;
                    case 'm':
                        rx = x;
                        ry = y;
                        ctx.moveTo(rx = rx + parseFloat(parts[i++]), ry = ry + parseFloat(parts[i++]));
                        while(i+1 < parts.length && !isNaN(parseFloat(parts[i])))
                            ctx.lineTo(rx = rx + parseFloat(parts[i++]), ry = ry + parseFloat(parts[i++]));
                        x = rx;
                        y = ry;
                        break;
                    case 'M':
                        ctx.moveTo(x = parseFloat(parts[i++]), y = parseFloat(parts[i++]));
                        while(i+1 < parts.length && !isNaN(parseFloat(parts[i])))
                            ctx.lineTo(x = parseFloat(parts[i++]), y = parseFloat(parts[i++]));
                        break;
                    case 'l':
                        rx = x;
                        ry = y;
                        do {
                            ctx.lineTo(rx = rx + parseFloat(parts[i++]), ry = ry + parseFloat(parts[i++]));
                        } while(i+1 < parts.length && !isNaN(parseFloat(parts[i])));
                        x = rx;
                        y = ry;
                        break;
                    case 'L':
                        do {
                            ctx.lineTo(x = parseFloat(parts[i++]), y = parseFloat(parts[i++]));
                        } while(i+1 < parts.length && !isNaN(parseFloat(parts[i])));
                        break;
                    case 'c':
                        rx = x;
                        ry = y;
                        do {
                            var x1 = rx + parseFloat(parts[i++]);
                            var y1 = ry + parseFloat(parts[i++]);
                            var x2 = rx + parseFloat(parts[i++]);
                            var y2 = ry + parseFloat(parts[i++]);
                            ctx.bezierCurveTo(
                                x1, y1,
                                x2, y2,
                                rx = rx + parseFloat(parts[i++]), ry = ry + parseFloat(parts[i++]));
                        } while(i+5 < parts.length && !isNaN(parseFloat(parts[i])));
                        cpx = x2;
                        cpy = y2;
                        x = rx;
                        y = ry;
                        break;
                    case 'C':
                        do {
                            ctx.bezierCurveTo(
                                parseFloat(parts[i++]), parseFloat(parts[i++]),
                                cpx = parseFloat(parts[i++]), cpy = parseFloat(parts[i++]), x = parseFloat(parts[i++]), y = parseFloat(parts[i++]));
                        } while(i+5 < parts.length && !isNaN(parseFloat(parts[i])));
                        break;
                    case 'S':
                        if (!/^[CcSs]$/.test(lastCommand)) { cpx = x; cpy = y; }
                        do {
                            var x2 = parseFloat(parts[i++]);
                            var y2 = parseFloat(parts[i++]);
                            var x1 = 2*x-cpx;
                            var y1 = 2*y-cpy;
                            ctx.bezierCurveTo(x1,y1, cpx = x2, cpy = y2, x = parseFloat(parts[i++]), y = parseFloat(parts[i++]));
                        } while(i+3 < parts.length && !isNaN(parseFloat(parts[i])));
                        break;
                    case 's':
                        rx = x;
                        ry = y;
                        if (!/^[CcSs]$/.test(lastCommand)) { cpx = rx; cpy = ry; }
                        do {
                            var x2 = rx + parseFloat(parts[i++]);
                            var y2 = ry + parseFloat(parts[i++]);
                            var x1 = 2*rx-cpx;
                            var y1 = 2*ry-cpy;
                            ctx.bezierCurveTo(
                                x1, y1,
                                cpx = x2, cpy = y2,
                                rx = rx + parseFloat(parts[i++]), ry = ry + parseFloat(parts[i++]));
                        } while(i+3 < parts.length && !isNaN(parseFloat(parts[i])));
                        x = rx;
                        y = ry;
                        break;
                    case 'H':
                        rx = parseFloat(parts[i++]);
                        ctx.lineTo(rx, y);
                        x = rx;
                        break;
                    case 'h':
                        rx = x + parseFloat(parts[i++]);
                        ctx.lineTo(rx, y);
                        x = rx;
                        break;
                    case 'V':
                        ry = parseFloat(parts[i++]);
                        ctx.lineTo(x, ry);
                        y = ry;
                        break;
                    case 'v':
                        ry = y + parseFloat(parts[i++]);
                        ctx.lineTo(x, ry);
                        y = ry;
                        break;
                    default:
                        Util.log('svg rendering: unknown path command ' + command);
                        return false;
                }
                lastCommand = command;
            }
            return true;
        }

        //? Sets the pixel color at a given pixel
        //@ writesMutable
        //@ [color].deflExpr('colors->accent')
        //@ picAsync
        public set_pixel(left:number, top:number, color:Color, r:ResumeCtx) : void
        {
            this.loadFirst(r, () => {
                left = Math.round(left);
                top = Math.round(top);
                if (left < 0 || top < 0 || left >= this.widthSync() || top >= this.heightSync()) return;

                this.changed(false);
                this.imageDataHasChanges = true;

                /*
                var c = color.toHtml();
                if (color.A() != 1)
                    this.ctx.clearRect(left, top, 1, 1);
                this.ctx.fillStyle = c;
                this.ctx.strokeStyle = c;
                this.ctx.fillRect(left, top, 1, 1);
                */

                this.getImageData();
                var d = this.imageData.data;
                var idx = (left + top * this.widthSync()) * 4;
                d[idx+0] = color.r;
                d[idx+1] = color.g;
                d[idx+2] = color.b;
                d[idx+3] = color.a;

                /*
                // this one is slower
                if (!this._onePixelData) {
                    this._onePixelData = this.ctx.createImageData(1,1); // only do this once per page
                }
                var d  = this._onePixelData.data;
                d[0] = color.R();
                d[1] = color.G();
                d[2] = color.B();
                d[3] = color.A();
                this.ctx.putImageData( this._onePixelData, left, top );
                */
            });
        }

        //? Copy all pixels from the picture
        //@ allocates returns(Buffer)
        //@ writesMutable
        //@ picAsync
        public to_buffer(r:ResumeCtx)
        {
            this.loadFirst(r, () => {
                this.changed();
                var d = this.getImageData();
                this.imageData = null;
                return Buffer.fromImageData(d);
            })
        }

        //? Copy pixels from `buffer` to the picture
        //@ writesMutable
        //@ picAsync
        public write_buffer(buffer:Buffer, r:ResumeCtx)
        {
            this.loadFirst(r, () => {
                this.changed();
                var d = buffer.imageData;
                if (!d) {
                    d = this.ctx.createImageData(this.widthSync(), this.heightSync())
                    var sz = d.width * d.height * 4;
                    var dst = d.data
                    var src = buffer.buffer
                    for (var i = 0; i < sz; ++i)
                        dst[i] = src[i]
                }
                this.ctx.putImageData(d, 0, 0);
            })
        }

        //? Shares this message ('' to pick from a list)
        //@ flow(SinkSharing)
        //@ readsMutable uiAsync
        public share(where: string, message: string, r:ResumeCtx): void
        {
            HTML.showProgressNotification(lf("sharing picture..."));
            this.initAsync()
                .then(() => ShareManager.sharePictureAsync(this, where, message))
                .done(() => r.resume());
        }

        //? Flips the picture horizontally
        //@ writesMutable
        //@ picAsync
        public flip_horizontal(r:ResumeCtx): void
        {
            this.loadFirst(r,() => {
                this.commitImageData();
                this.changed();
                var temp = <HTMLCanvasElement>document.createElement("canvas");
                temp.width = this.canvas.width;
                temp.height = this.canvas.height;
                var tempCtx = temp.getContext("2d");
                tempCtx.drawImage(this.canvas, 0, 0);                

                this.ctx.save();
                this.ctx.translate(temp.width, 0);
                this.ctx.scale(-1, 1);
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                this.ctx.drawImage(temp, 0, 0);
                this.ctx.restore();
            });
        }

        //? Flips the picture vertically
        //@ writesMutable
        //@ picAsync
        public flip_vertical(r:ResumeCtx): void
        {
            this.loadFirst(r, () => {
                this.commitImageData();
                this.changed();

                var temp = <HTMLCanvasElement>document.createElement("canvas");
                temp.width = this.canvas.width;
                temp.height = this.canvas.height;
                var tempCtx = temp.getContext("2d");
                tempCtx.drawImage(this.canvas, 0, 0);                

                this.ctx.save();
                this.ctx.translate(0, this.canvas.height);
                this.ctx.scale(1, -1);
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                this.ctx.drawImage(temp, 0, 0);
                this.ctx.restore();
            });
        }

        //? Encodes the image into a data uri using the desired quality (1 best, 0 worst). If the quality value is 1, the image is encoded as PNG, otherwise JPEG.
        //@ async readsMutable returns(string) [quality].defl(0.85)
        //@ picAsync
        public to_data_uri(quality: number, r: ResumeCtx): void {
            this.loadFirst(r, () => {
                var uri = this.getDataUri(Math_.normalize(quality));
                r.resumeVal(uri);
            });
        }

        //? Writes an Scalable Vector Graphics (SVG) document at a given location. By default, this action uses the viewport size provided in the SVG document when width or height are negative.
        //@ writesMutable
        //@ [width].defl(-1) [height].defl(-1)
        //@ picAsync
        //@ import("npm", "xmldom", "0.1.*")
        public blend_svg(markup: string, left: number, top: number, width: number, height: number, angle: number, r: ResumeCtx): void {
            // try canvas rendering in IE
            if (Browser.browser == BrowserSoftware.ie10 || Browser.browser == BrowserSoftware.ie11) {
                var cvs = Picture.parseSvg(markup, width, height);
                if (cvs) {
                    this.atPosition(r, left, top, angle, 1, () => {
                        this.ctx.drawImage(cvs, 0, 0, cvs.width, cvs.height);
                    });
                    return;
                }
            }

            // browser svg rendering
            var svg = "data:image/svg+xml;base64," + Web.base64_encode(markup);
            var img = <HTMLImageElement>document.createElement("img");

            // workaround IE11 issue
            var svgWidth = markup.match(/width="(\d+)"/);
            if (svgWidth) img.width = parseInt(svgWidth[1]);
            var svgHeight = markup.match(/height="(\d+)"/);
            if (svgHeight) img.height = parseInt(svgHeight[1]);

            var unhappy = () => {
                this.ctx.fillStyle = "lightgray";
                this.ctx.fillRect(0, 0, 100, 100);
                this.ctx.fillStyle = "white";
                this.ctx.textAlign = "center";
                this.ctx.textBaseline = "top";
                this.ctx.font = "80px sans-serif";
                this.ctx.fillText(':(', 50, 0);
            };

            var svgLoadFailed = () => {
                this.atPosition(r, left, top, angle, 1, () => {
                    unhappy();
                });
            }

            img.onload = () => {
                this.atPosition(r, left, top, angle, 1, () => {
                    // image might be empty
                    if (!img.width || !img.height) {
                        Time.log('blend_svg error: empty svg');
                        unhappy();
                    }
                    else {
                        // rescale as needed
                        var w = width > 0 ? width : img.width;
                        var h = height > 0 ? height : img.height;
                        if (width < 0 && height > 0)
                            w = height / img.height * img.width;
                        else if (height < 0 && width > 0)
                            h = width / img.width * img.height;
                        // draw svg
                        try {
                            this.ctx.drawImage(img, 0, 0, w, h);
                        } catch(ex) {
                            try {
                                // observed in IE11: sometimes, first call fails.
                                this.ctx.drawImage(img, 0, 0, w, h);
                            } catch(ex2) {
                                unhappy();
                            }
                        }
                    }
                });
            };
            img.onerror = () => {
                Time.log('blend_svg error: svg load failed');
                svgLoadFailed();
            };
            img.src = svg;
        }

        //? Displays the image to the wall; you need to call 'update on wall' later if you want changes to be reflected.
        //@ readsMutable
        //@ embedsLink("Wall", "Picture")
        public post_to_wall(s: IStackFrame): void {
            super.post_to_wall(s)
        }

        static niceFilename() : string {
            var now = Time.now();
            return now.year() + "-" + now.month() + "-" + now.day() + "-" + now.hour() + "-" + now.minute() + "-" + now.second() + "-" + now.millisecond();
        }
    }
}
