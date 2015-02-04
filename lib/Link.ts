///<reference path='refs.ts'/>
module TDev.RT {
     export enum LinkKind
     {
        unknown,
        media,
        image,
        email,
        phoneNumber,
        hyperlink,
        radio,
        address
    }

    //? A link to a video, image, email, phone number
    //@ ctx(general,gckey,walltap,cloudfield,json) serializable
    export class Link
        extends RTValue
    {
        private _title : string = undefined;
        private _description : string = undefined;
        private _kind: LinkKind = undefined;
        private _address: string = undefined;
        private _location : Location_ = undefined;

        constructor() {
            super()
        }

        //public reuseKey() { return "" + this._title + this._description + this._address + this._kind + this._location; }

        // ctx is ignored
        public exportJson(ctx: JsonExportCtx): any {
            return {
                title: this._title,
                description: this._description,
                kind: this._kind && this._kind,
                address: this._address,
                location: this._location && this._location.exportJson(ctx)
            }
        }

        public importJson(ctx: JsonImportCtx, json: any): RT.RTValue {
           if (typeof json != "object") json = undefined;
            this._title = ctx.importString(json, "title");
            this._description = ctx.importString(json, "description");
            this._kind = ctx.importNumber(json, "kind");
            this._address = ctx.importString(json, "address");
            this._location = ctx.importLocation(json, "location");
           return this;
        }

        static mk(address : string, kind : LinkKind) : Link
        {
            var lnk = new Link();
            lnk._address = address;
            lnk._kind = kind;
            return lnk;
        }

        public toString(): string {
            var s = this.name();
            return s;
        }

        //? Gets the name if any
        //@ readsMutable
        public name() : string {
            if (this._description)
                return this._title + " : " + this._description;
            else
                return this._title;
        }

        //? Sets the name
        //@ writesMutable
        public set_name(name : string ) : void {
            this._description = "";
            this._title = name;
        }
        public set_title(t : string) : void
        {
            this._title = t;
        }
        public set_description(d : string) : void
        {
            this._description = d;
        }

        //? Gets the location if any
        //@ readsMutable
        public location() : Location_ { return this._location; }

        //? Sets the location
        //@ writesMutable
        public set_location(location:Location_) : void { this._location = location; }

        //? Gets the url
        //@ readsMutable
        public address(): string { return this._address; }

        //? Gets a picture pointing to this address. Only applies to `image` link kinds.
        //@ readsMutable
        public to_picture(): Picture {
            if (this._kind != LinkKind.image) return undefined;
            return Picture.fromUrlSync(this._address, true);
        }

        //? Gets the kind of asset - media, image, email, phone number, hyperlink, deep zoom link, radio
        public kind(): string { return (enumToString(LinkKind, this._kind)).toLowerCase(); }

        private slowlyloadingelement: HTMLElement;
        private previouslyloaded = false;

        public getViewCore(s: IStackFrame, b: BoxBase = null): HTMLElement
        {
            switch (this._kind)
            {
                case LinkKind.image:
                    var img = <HTMLImageElement>createElement("img");
                    img.setAttribute('class', 'wall-picture');
                    img.src = this.address();
                    img.alt = this.name();
                    this.slowlyloadingelement = img;
                    b.delayedlayout = true;
                    return img;
                case LinkKind.media:
                    try {
                        if (/\.(mp3|wav|m4a)$/i.test(this.address())) {
                            var audio = <HTMLAudioElement>createElement("audio", "wall-media", this.name());
                            audio.src = this.address();
                            audio.controls = true;
                            audio.autobuffer = true;
                            (<any>audio).crossorigin = "anonymous";
                            audio.load();
                            this.slowlyloadingelement = audio;
                            return audio;
                        } else {
                            var video = <HTMLVideoElement>createElement("video", "wall-media", this.name());
                            video.src = this.address();
                            video.controls = true;
                            video.autobuffer = true;
                            (<any>video).crossorigin = "anonymous";
                            video.load();
                            this.slowlyloadingelement = video;
                            b.delayedlayout = true;
                            return video;
                        }
                    } catch(e) {
                        return div("item", div("wall-dialog-header", lf("invalid media")), div("wall-dialog-body", this.address()));
                    }
                default:
                    var url = this.address();
                    var text = "go";
                    switch (this._kind)
                    {
                        case LinkKind.phoneNumber:
                            if (!/^tel:/i.test(url))
                                url = 'tel:' + url;
                            text = "call";
                        break;
                        case LinkKind.email:
                            if (!/^mailto:/i.test(url))
                                url = 'mailto:' + encodeURIComponent(url);
                            text = "send";
                        break;
                    }
                    var elt = div("item link-item",
                            [div("wall-dialog-header", this._title || this.address() || url),
                             this._description ? div("wall-dialog-body", this._description) : null])
                    elt.withClick(() => Web.browseAsync(url).done());
                    return elt;
            }
        }

        public updateViewCore(s: IStackFrame, b: BoxBase) {
            if (LayoutMgr.RenderExecutionMode() && this.slowlyloadingelement)
            {
                if (this.slowlyloadingelement.tagName == "IMG") {
                    this.slowlyloadingelement.onload = () => {
                        //Util.log("onload h=" + (<HTMLImageElement> this.slowlyloadingelement).height + " w=" + (<HTMLImageElement> this.slowlyloadingelement).width );
                        b.delayedlayout = false;
                        b.RefreshOnScreen();
                    }
                    this.slowlyloadingelement.onerror = () => {
                        // Util.log("onerror")
                        b.SwapImageContent(Picture.errorPic());
                    }
                } else {
                    this.slowlyloadingelement.onloadedmetadata = () => {
                        //Util.log("onloadedmetadata h=" + (<HTMLImageElement> this.slowlyloadingelement).height + " w=" + (<HTMLImageElement> this.slowlyloadingelement).width );
                        b.delayedlayout = false;
                        b.RefreshOnScreen();
                    }
                }
            }
        }

        //? Shares the link (email, sms, facebook, social or '' to pick from a list)
        //@ flow(SinkSharing) readsMutable uiAsync
        //@ [network].defl("social")
        public share(network: string, r : ResumeCtx): void
        {
            HTML.showProgressNotification(lf("sharing link..."));
            ShareManager.shareLinkAsync(this, network).done(() => r.resume());
        }

        //? Displays the link on the wall
        //@ flow(SinkWeb)
        //@ readsMutable
        public post_to_wall(s: IStackFrame): void { super.post_to_wall(s) }
    }
}
