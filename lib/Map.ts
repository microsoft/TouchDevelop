///<reference path='refs.ts'/>
module TDev.RT {
    //? A map pushpin
    //@ stem("pushpin") ctx(general,gckey) cap(maps)
    export class MapPushpin
        extends RTValue
    {
        private _map : Microsoft.Maps.Map;
        private _pp : Microsoft.Maps.Pushpin;
        private _location: Location_;
        private _text: string;
        private _background: Color;
        private _foreground: Color;
        private _pictureUrl: string;
        private _taptarget: RTValue;
        public onTap: Event_ = new Event_();

        static mk(location: Location_, text: string, background: Color, foreground: Color, pictureUrl: string = undefined, taptarget:RTValue = undefined)
        {
            var p = new MapPushpin();
            p._location = location;
            p._text = text;
            p._background = background;
            p._foreground = foreground;
            p._pictureUrl = pictureUrl;
            p._taptarget = taptarget;
            return p;
        }

        //? Set the handler invoked when the pushpin is tapped
        //@ ignoreReturnValue
        public on_tap(tapped: Action) : EventBinding {
            return this.onTap.addHandler(tapped);
        }

        //? Gets the pushpin geo location
        //@ readsMutable
        public location(): Location_ 
        {
            return this._location;
        }

        //? Sets the location of the pushpin
        //@ writesMutable
        public set_location(loc : Location_) {
            this._location = loc;
            if (this._pp)
                this._pp.setLocation(new Microsoft.Maps.Location(this._location.latitude(), this._location.longitude()));
        }

        //? Shows or hides the pushpin
        //@ writesMutable
        public set_visible(visible : boolean) {
            if(this._pp)
                this._pp.setOptions({visible:visible});
        }

        private setOptions() {
            if (!this._pp) return;

            var options: any = {
                anchor: new Microsoft.Maps.Point(14, 25 + 16 + 16),
                width: 39 + 20,
                height: 25 + 16
            };
            options.htmlContent = "<div class='mapPushpin' style='";
            if (this._foreground)
                options.htmlContent += "color:" + this._foreground.toHtml() + ";";
            if (this._background)
                options.htmlContent += "background-color:" + this._background.toHtml() + ";";
            options.htmlContent += "'>";
            if (this._pictureUrl)
                options.htmlContent += "<img src='" + Web.html_encode(this._pictureUrl) + "' style='float:left;height:auto;max-width:39px;max-height:25px;' />";
            if (this._text)
                options.htmlContent += "<div class='mapPushpinInner'>" + Web.html_encode(this._text) + "</div>";
            options.htmlContent += "</div>";

            this._pp.setOptions(options);
        }

        public addToMap(map: Microsoft.Maps.Map)
        {
            this._map = map;
            if (!map) return;


            this._pp = new Microsoft.Maps.Pushpin(
                new Microsoft.Maps.Location(this._location.latitude(), this._location.longitude()), {}
                );
            this.setOptions();
            map.entities.push(this._pp);
            BingMaps.addClickHandler(this._pp, () => {
                var rt = Runtime.theRuntime;
                if (rt) {
                    if(this.onTap.handlers)
                        rt.queueLocalEvent(this.onTap, []);
                    if (this._taptarget) {
                        var evtname = "tap wall " + this._taptarget.rtType();
                        if(rt.eventEnabled(evtname))
                            rt.eventQ.add(evtname, null, [this._taptarget]);
                    }
                }
            });
        }

        public setPictureUrl(url : string) {
            this._pictureUrl = url;
            this.setOptions();
        }
    }

    export class MapLine
        extends RTValue
    {
        private _locations: Collection<Location_>;
        private _fill: Color;
        private _stroke: Color;
        private _thickness: number;

        static mk(locations: Collection<Location_>, fill : Color, stroke: Color, thickness : number)
        {
            var p = new MapLine();
            p._locations = locations;
            p._fill = fill;
            p._stroke = stroke;
            p._thickness = thickness;
            return p;
        }

        public addToMap(map: Microsoft.Maps.Map)
        {
            var locs : Microsoft.Maps.Location[] =
                this._locations.a.map((l) => new Microsoft.Maps.Location(l.latitude(), l.longitude()));
            var options : any = {
                strokeColor: new Microsoft.Maps.Color(this._stroke.a, this._stroke.r, this._stroke.g, this._stroke.b),
                strokeThickness: Math.floor(Math.max(1, this._thickness))
            };

            var pp: any;
            if (this._fill) {
                options.fillColor = new Microsoft.Maps.Color(this._fill.a, this._fill.r, this._fill.g, this._fill.b);
                pp = new Microsoft.Maps.Polygon(locs, options);
            }
            else 
                pp = new Microsoft.Maps.Polyline(locs, options);
            map.entities.push(pp);
        }

     }

    //? A Bing map
    //@ ctx(general,gckey) cap(maps)
    export class Map
        extends RTValue
    {
        private _full: boolean = false;
        private _zoom : number = 12;
        private _center : Location_ = undefined;
        private _pushpins: MapPushpin[] = [];
        private _lines: MapLine[] = [];
        private _map : Microsoft.Maps.Map;

        static mk(full: boolean)
        {
            var m = new Map();
            m._full = full;
            return m;
        }

        //? Gets the zoom level
        //@ readsMutable
        public zoom() : number { 
            this.syncView();
            return this._zoom; 
        }

        //? Sets the zoom level from 1 (earth) to 21 (street)
        //@ writesMutable
        //@ [level].defl(12)
        public set_zoom(level:number) : void { 
            this.syncView();
            this._zoom = level; 
            this.updateView(); 
        }

        //? Gets the map center location
        //@ readsMutable
        public center(): Location_ { 
            this.syncView();
            return this._center;  
        }

        //? Sets the map center location
        //@ writesMutable
        public set_center(center: Location_): void {
            this.syncView();
            this._center = center; 
            this.updateView(); 
        }

        //? Adds a text pushpin on the map
        //@ writesMutable ignoreReturnValue
        //@ [background].deflExpr('colors->accent') [foreground].deflExpr('colors->white')
        public add_text(location: Location_, text: string, background: Color, foreground: Color): MapPushpin
        {
            var pp = MapPushpin.mk(location, text, background, foreground);
            this._pushpins.push(pp);
            pp.addToMap(this._map);
            return pp;
        }

        //? Adds a cloud picture pushpin on the map
        //@ cap(network) flow(SinkWeb)
        //@ readsMutable writesMutable ignoreReturnValue
        //@ [background].deflExpr('colors->accent')
        //@ embedsLink("Map", "CloudPicture")
        public add_cloud_picture(location: Location_, picture: CloudPicture, background: Color): MapPushpin {
            var pp = MapPushpin.mk(location, undefined, background, undefined, undefined, picture);
            this._pushpins.push(pp);
            pp.addToMap(this._map);
            picture.toPictureUrlAsync('thumbnail').done(url => { pp.setPictureUrl(url); });
            return pp;
        }

        //? Adds a link pushpin on the map (ignored if the location if not set)
        //@ cap(network) flow(SinkWeb)
        //@ readsMutable writesMutable ignoreReturnValue
        //@ [background].deflExpr('colors->accent') [foreground].deflExpr('colors->white')
        //@ embedsLink("Map", "Link")
        public add_link(link: Link, background: Color, foreground: Color): MapPushpin
        {
            var loc = link.location();
            if (loc) {
                var pp = MapPushpin.mk(loc, link.name() || link.address(), background, foreground, link.kind() == 'image' ? link.address() : null);
                this._pushpins.push(pp);
                pp.addToMap(this._map);
                return pp;
            } else return undefined;
        }

        //? Adds a message pushpin on the map (ignored if the location is not set)
        //@ cap(network) flow(SinkWeb)
        //@ writesMutable ignoreReturnValue
        //@ [background].deflExpr('colors->accent') [foreground].deflExpr('colors->white')
        //@ embedsLink("Map", "Message")
        public add_message(msg: Message, background: Color, foreground: Color): MapPushpin
        {
            var loc = msg.location();
            if (loc)
                return this.add_text(loc, msg.title() || msg.from(), background, foreground);
            else return undefined;
        }

        //? Adds a picture pushpin on the map
        //@ writesMutable ignoreReturnValue
        //@ [background].deflExpr('colors->accent')
        //@ embedsLink("Map", "Picture")
        public add_picture(location: Location_, picture: Picture, background: Color): MapPushpin
        {
            var pp = MapPushpin.mk(location, undefined, background, undefined, undefined, picture);
            this._pushpins.push(pp);
            pp.addToMap(this._map);
            picture.getUrlAsync().done(url => pp.setPictureUrl(url));
            return pp;
        }

        //? Adds a place pushpin on the map (ignored if the location is not set)
        //@ cap(network) flow(SinkWeb)
        //@ writesMutable ignoreReturnValue
        //@ [background].deflExpr('colors->accent') [foreground].deflExpr('colors->white')
        //@ embedsLink("Map", "Place")
        public add_place(place: Place, background: Color, foreground: Color): MapPushpin
        {
            var loc = place.location();
            if (loc) {
                var pp = MapPushpin.mk(loc, place.name(), background, foreground, place.picture_link(), place);
                this._pushpins.push(pp);
                pp.addToMap(this._map);
                return pp;
            } else return undefined;
        }

        //? Adds a polyline that passes through various geocoordinates
        //@ writesMutable [locations].readsMutable
        //@ [color].deflExpr('colors->accent') [thickness].defl(6)
        public add_line(locations: Collection<Location_>, color: Color, thickness: number): void
        {
            var pp = MapLine.mk(locations, undefined, color, thickness);
            this._lines.push(pp);
            if(this._map)
                pp.addToMap(this._map);
        }

        //? Fills a region with a color
        //@ writesMutable [locations].readsMutable
        //@ [fill].deflExpr('colors->background') [stroke].deflExpr('colors->foreground') [thickness].defl(6)
        public fill_region(locations:Collection<Location_>, fill:Color, stroke:Color, thickness:number) : void
        {
            var pp = MapLine.mk(locations, fill, stroke, thickness);
            this._lines.push(pp);
            if(this._map)
                pp.addToMap(this._map);
        }

        //? Clears the lines, regions and pushpins
        //@ writesMutable
        public clear(): void
        {
            this._pushpins = [];
            this._lines = [];
            if (this._map)
                this._map.entities.clear();
        }

        // Displays the map in the wall using Bing.
        public getViewCore(s: IStackFrame, b: BoxBase): HTMLElement
        {
            // add placeholder
            var el = div("");
            el.style.display = 'inline';
            el.style.margin = '8px 8px 8px 8px';
            el.style.verticalAlign = 'top';
            el.style.width = '400px';
            el.style.height = '400px';
            (<any>el).fullScreen = this._full;

            // load map async
            BingMaps.mkMapAsync(el, this.center(), this.zoom())
                .done((map : Microsoft.Maps.Map) =>
                {
                    this._map = map;
                    if (!this._full)
                        this._map.setOptions({ width: 400, height: 400 });
                    this._lines.forEach(p => p.addToMap(this._map));
                    this._pushpins.forEach(p => p.addToMap(this._map));
                    if (!this._center) // no center, auto-zoom on pushpins
                        this.view_pushpins();
                    b.RefreshOnScreen();
                    if (this._full && b instanceof WallBox) {
                        (<WallBox>b).attributes.stretchwidth = 1;
                        (<WallBox>b).attributes.stretchheight = 1;
                    }
                });
 
            return el;
        }


        private updateView() {
            if (this._map && this._center) {
                var options : any = { zoom : this._zoom };
                if(this._center)
                    options.center = new Microsoft.Maps.Location(this._center.latitude(), this._center.longitude())
                this._map.setView(options);
            }
        }

        private syncView() {
            if (this._map) {
                // update center and zoom
                var c = this._map.getCenter();
                this._center = Location_.mkShort(c.latitude, c.longitude);
                this._zoom = this._map.getZoom();
            }
        }

        //? Changes the current zoom and center so that all the pushpins are visible. This method has no effect if the map is not posted on a the wall yet.
        //@ writesMutable
        public view_pushpins(): void 
        {
            this.syncView();
            if (this._map && this._pushpins.length > 0) {

                var locs = this._pushpins
                    .map(p => new Microsoft.Maps.Location(p.location().latitude(), p.location().longitude()));
                var rect = Microsoft.Maps.LocationRect.fromLocations(locs);
                this._map.setView({ bounds: rect});

                this.syncView();
            }
        }

        //? Displays the map in the wall using Bing.
        //@ cap(maps) flow(SinkSafe)
        //@ readsMutable
        public post_to_wall(s:IStackFrame) : void { super.post_to_wall(s) }
    }
}
