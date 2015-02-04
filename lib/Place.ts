///<reference path='refs.ts'/>
module TDev.RT {
    //? A named location
    //@ ctx(general,gckey,walltap)
    export class Place
        extends RTValue
    {
        private _id: string = undefined;
        private _location : Location_ = undefined;
        private _name : string = undefined;
        private _picture_link : string = undefined;
        private _link : string = undefined;
        private _category : string = undefined;
        private _source: string = undefined;
        private _values: StringMap = undefined;

        constructor() {
            super()
        }

        static mk(name: string, location : Location_): Place
        {
            var m = new Place();
            m.set_name(name);
            m.set_location(location);
            return m;
        }

        //? Gets the location of the place
        //@ readsMutable
        public location() : Location_ { return this._location; }

        //? Sets the location of the place
        //@ writesMutable
        public set_location(location:Location_) : void { this._location = location; }

        //? Gets the identifier of this place
        //@ readsMutable
        public id() : string { return this._id; }

        //? Sets the identifier of this place
        //@ writesMutable
        public set_id(id:string) : void { this._id = id; }

        //? Gets the name of the place
        //@ readsMutable
        public name() : string { return this._name; }

        //? Sets the name of the place
        //@ writesMutable
        public set_name(name:string) : void { this._name = name; }

        //? Gets a url to the picture
        //@ readsMutable
        public picture_link() : string { return this._picture_link; }

        //? Sets the url to the picture
        //@ writesMutable
        public set_picture_link(url:string) : void { this._picture_link = url; }

        //? Gets the link associated to the message
        //@ readsMutable
        public link() : string { return this._link; }

        //? Sets the link associated to the place
        //@ writesMutable
        public set_link(url:string) : void { this._link = url; }

        //? Gets the category of the place
        //@ readsMutable
        public category() : string { return this._category; }

        //? Sets the category of the place
        //@ writesMutable
        public set_category(category:string) : void { this._category = category; }

        //? Gets the source of this place
        //@ readsMutable
        public source(): string { return this._source; }

        //? Sets the source of this place
        //@ writesMutable
        public set_source(source: string) { this._source = source; }

        //? Gets the additional values stored in the place
        //@ readsMutable
        public values(): StringMap {
            if (!this._values)
                this._values = Collections.create_string_map();
            return this._values;
        }

        //? Converts to a string name,lat,long
        //@ readsMutable
        public to_string(): string { return this._name; }

        public getViewCore(s: IStackFrame, b: BoxBase): HTMLElement
        {
            var d = div("item");
            if (this.picture_link())
                d.appendChild(img("item-image", this.picture_link(), "linked picture"));
            var dc = div("item-info");
            d.appendChild(dc);
            if (this.name())
                dc.appendChild(div("item-title", this.name()));
            if (this.category())
                dc.appendChild(div("item-subtitle", this.category()));
            if (this.location())
                dc.appendChild(div("item-description", this.location().to_string()));
            dc.appendChild(div("item-subtle", this.source()));
            return d;
        }

        //? Checks into the place (supported for Facebook)
        //@ obsolete stub flow(SinkSharing)
        //@ readsMutable
        public check_in() : void
        { }

        //? Posts the place to the wall
        //@ cap(maps,network) flow(SinkWeb)
        //@ readsMutable
        public post_to_wall(s:IStackFrame) : void { super.post_to_wall(s) }
    }
}
