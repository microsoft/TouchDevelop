///<reference path='refs.ts'/>
module TDev { export module RT {
    //? A post on a message board
    //@ stem("msg") ctx(general,gckey,walltap) serializable
    export class Message
        extends RTValue
    {
        private _id: string = undefined;
        private _title : string = undefined;
        private _message : string = undefined;
        private _from : string = undefined;
        private _to : string = undefined;
        private _picture_link : string = undefined;
        private _link : string = undefined;
        private _media_link : string = undefined;
        private _location : Location_ = undefined;
        private _time : DateTime = undefined;
        private _source : string = undefined;
        constructor() {
            super()
        }
        private _values: StringMap = new StringMap();

        static mk(message: string): Message
        {
            var m = new Message();
            m.set_message(message);
            m.set_source("");
            m.set_from(lf("me"));
            return m;
        }

        //? Gets the title text
        //@ readsMutable
        public title() : string { return this._title; }

        //? Sets the title text
        //@ writesMutable
        public set_title(title:string) : void { this._title = title; }

        //? Gets the message text
        //@ readsMutable
        public message() : string { return this._message; }

        //? Sets the message text
        //@ writesMutable
        public set_message(message:string) : void { this._message = message; }

        //? Gets the message identifier
        //@ readsMutable
        public id(): string { return this._id; }

        //? Sets the message identifier
        //@ writesMutable
        public set_id(value: string) { this._id = value; }

        //? Gets the author
        //@ readsMutable
        public from() : string { return this._from; }

        //? Sets the author
        //@ writesMutable
        public set_from(author:string) : void { this._from = author; }

        //? Gets the recipient
        //@ readsMutable
        public to() : string { return this._to; }

        //? Sets the recipient
        //@ writesMutable
        public set_to(author:string) : void { this._to = author; }

        //? Gets a url to the picture
        //@ readsMutable
        public picture_link() : string { return this._picture_link; }

        //? Sets the url to the picture
        //@ writesMutable
        public set_picture_link(url:string) : void { this._picture_link = url; }

        //? Gets the link associated to the message
        //@ readsMutable
        public link() : string { return this._link; }

        //? Sets the link associated to the message
        //@ writesMutable
        public set_link(url:string) : void { this._link = url; }

        //? Gets a url to the media
        //@ readsMutable
        public media_link() : string { return this._media_link; }

        //? Sets the url to the media
        //@ writesMutable
        public set_media_link(url:string) : void { this._media_link = url; }

        //? Gets the geo coordinates
        //@ readsMutable
        public location() : Location_ { return this._location; }

        //? Sets the geo coordinates
        //@ writesMutable
        public set_location(location:Location_) : void { this._location = location; }

        //? Gets the time
        //@ readsMutable
        public time() : DateTime { return this._time || DateTime.defaultValue; }

        //? Sets the time
        //@ writesMutable
        public set_time(time:DateTime) : void { this._time = time; }

        //? Gets the source of this message (Facebook, Twitter, etc...)
        //@ readsMutable
        public source() : string { return this._source; }

        //? Sets the source of this message
        //@ writesMutable
        public set_source(source:string) : void { this._source = source; }

        public toString() : string
        {
            var sb = '';
            if (this.title())
                sb += this.title() + '\n';
            if (this.message())
                sb += this.message() + '\n';
            if (this.from() && this.from() != "me")
                sb += "from " + this.from() + '\n';
            if (this.to())
                sb += "to " + this.to() + '\n';
            if (this.link())
                sb += "at " + this.link() + '\n';
            if (this.picture_link())
                sb += "with " + this.picture_link() + '\n';
            if (this.media_link())
                sb += "with " + this.media_link() + '\n';
            if (this.location())
                sb += "at location " + this.location().toString() + '\n';
            if (this.source())
                sb += "source " + this.source() + '\n';
            if (this.time() && !this.time().isDefaultValue())
                sb += this.time().from_now() + '\n';
            return sb;
        }

        public getViewCore(s: IStackFrame, b:BoxBase): HTMLElement
        {
            var d = div("item");
            if (this.picture_link())
                d.appendChild(img("item-image", this.picture_link(), "linked picture"));
            var dc = div("item-info");
            d.appendChild(dc);
            if (this.from())
                dc.appendChild(div("item-title", this.from()));
            if (this.title())
                dc.appendChild(div("item-subtitle", this.title()));
            if (this.message())
                dc.appendChild(div("item-description", tweetify(this.message())));
            var subtle = this.source() || '';
            if (this.time() && !this.time().isDefaultValue())
                subtle += ' ' + this.time().from_now();
            dc.appendChild(div("item-subtle", subtle));
            if (this.link() || this.media_link()) {
                var f = () => Web.browseAsync(this.link()).done();
                if (this.media_link()) {
                    f = () => Web.play_media(this.media_link());
                }
                b.withClick(f);
            }
            return d;
        }

        //? Shares this message (email, sms, facebook, social or '' to pick from a list)
        //@ flow(SinkSharing)
        //@ readsMutable
        //@ [network].defl("social") uiAsync
        public share(network: string, r : ResumeCtx): void
        {
            HTML.showProgressNotification(lf("sharing message..."));
            ShareManager.shareTextAsync(this.toString(), network).done(() => r.resume());
        }

        //? Gets the additional values stored in the message
        //@ readsMutable
        public values(): StringMap { return this._values; }

        //? Posts the message to the wall
        //@ flow(SinkWeb)
        //@ readsMutable
        public post_to_wall(s:IStackFrame) : void { super.post_to_wall(s) }
    }
} }
