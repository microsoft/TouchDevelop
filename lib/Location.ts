///<reference path='refs.ts'/>
module TDev.RT {
    //? A geo coordinate (latitude, longitude, ...)
    //@ stem("loc") immutable ctx(general,indexkey,cloudfield,json) serializable
    export class Location_
        extends RTValue
    {
        public _latitude : number = undefined;
        public _longitude : number = undefined;
        public _altitude : number = undefined;
        public _hor_accuracy : number = undefined;
        public _vert_accuracy : number = undefined;
        public _speed : number = undefined;
        public _course : number = undefined;

        constructor() {
            super()
        }

        static mkShort(lat: number, lon: number): Location_
        {
            return Location_.mk(lat, lon, undefined, undefined, undefined, undefined, undefined);
        }
     
        static mk(lat : number, lon : number, alt : number, horacc : number, veracc : number, cou : number, spe : number) : Location_            
        {
            var l = new Location_();
            l._latitude = lat;
            l._longitude = lon;
            l._altitude = alt;
            l._hor_accuracy = horacc;
            l._vert_accuracy = veracc;
            l._course = cou;
            l._speed = spe;
            return l;
        }

        static mkFromString(s: string):Location_ {
            var pos = s.indexOf(",");
            var l = new Location_();
            l._latitude = Number(s.slice(0, pos));
            l._longitude = Number(s.slice(pos + 1));
            return l;
        }
     
        //? Converts to a string lat,long
        public to_string() : string { return this._latitude + ',' + this._longitude; }


        //ctx is ignored
        public exportJson(ctx: JsonExportCtx): any {
            return {
                latitude: this._latitude,
                longitude: this._longitude,
                altitude: this._altitude,
                hor_accuracy: this._hor_accuracy,
                vert_accuracy: this._vert_accuracy,
                course: this._course,
                speed: this._speed
            };
        }
        public importJson(ctx: JsonImportCtx, json: any): RT.RTValue {
            Util.oops("should not call immutable instance for importing");
            return undefined;
        }
        static mkFromJson(ctx: JsonImportCtx, json: any): RT.Location_ {
            if (typeof json != "object")
                return undefined;
            var loc = new Location_();
            loc._latitude = ctx.importNumber(json, "latitude");
            loc._longitude = ctx.importNumber(json, "longitude");
            loc._altitude = ctx.importNumber(json, "altitude");
            loc._hor_accuracy = ctx.importNumber(json, "hor_accuracy");
            loc._vert_accuracy = ctx.importNumber(json, "vert_accuracy");
            loc._course = ctx.importNumber(json,  "course");
            loc._speed = ctx.importNumber(json, "speed");
            return loc;
        }
  
        public isSerializable() { return true; }
        
        public toJsonKey() 
        { 
            return [this._latitude, this._longitude, this._altitude, 
            this._hor_accuracy, this._vert_accuracy, 
            this._speed, this._course];
        }

        public keyCompareTo(o:any):number
        {
            var other:Location_ = o;
            var diff = this._latitude - other._latitude;
            if (diff) return diff;
            diff = this._longitude - other._longitude;
            if (diff) return diff;
            diff = this._altitude - other._altitude;
            if (diff) return diff;
            diff = this._hor_accuracy - other._hor_accuracy;
            if (diff) return diff;
            diff = this._vert_accuracy - other._vert_accuracy;
            if (diff) return diff;
            diff = this._speed - other._speed;
            if (diff) return diff;
            diff = this._course - other._course;
            return diff;
        }
        
       
        //? Gets the latitude of the coordinate
        public latitude() : number { return this._latitude; }

        //? Gets the longitude of the coordinate
        public longitude() : number { return this._longitude; }

        //? Gets the altitude of the coordinate
        public altitude() : number { return this._altitude; }

        //? Gets the horizontal accuracy of the coordinate
        public hor_accuracy() : number { return this._hor_accuracy; }

        //? Gets the vertical accuracy of the coordinate
        public vert_accuracy() : number { return this._vert_accuracy; }

        //? Gets the speed of the coordinate
        public speed() : number { return this._speed; }

        //? Gets the course of the coordinate
        public course() : number { return this._course; }

        public toString(): string {
            return "(" + this._latitude + "," + this._longitude + ")";
        }

        //? Indicates if this instance is equal to the other
        public equals(other:Location_) : boolean {
            return (
                this._latitude === other._latitude &&
                this._longitude === other._longitude &&
                this._altitude === other._altitude &&
                this._hor_accuracy === other._hor_accuracy &&
                this._vert_accuracy === other._vert_accuracy &&
                this._speed === other._speed &&
                this._course === other._course);
        }

        //? Shares the location (email, sms, social or '' to pick from a list)
        //@ flow(SinkSharing) uiAsync
        //@ [network].defl("social") [network].deflStrings("", "email", "sms", "social") [message].defl("Sent from TouchDevelop")
        public share(network: string, message: string, r : ResumeCtx): void {
            var lnk = Link.mk(Maps.mapUrl(this), LinkKind.hyperlink);
            lnk.set_title(this.to_string());
            lnk.set_description(message);
            HTML.showProgressNotification(lf("sharing location..."));
            ShareManager.shareLinkAsync(lnk, network).done(() => r.resume());
        }

        //? Calculates the distance in meters
        public distance(other: Location_): number
        {
            return Location_.computeDistance(this.latitude(), this.longitude(), other.latitude(), other.longitude());
        }

        static computeDistance(lat1 : number, lng1 : number, lat2 : number, lng2 : number) : number
        {
            var radius = 6367.0; // earth radius in kilometers
            return radius * 2 * Math.asin(
                Math.min(
                    1, 
                    Math.sqrt(
                            Math.pow(Math.sin(((Math_.deg_to_rad(lat2 - lat1))) / 2.0), 2.0) 
                            + Math.cos(Math_.deg_to_rad(lat1)) 
                            * Math.cos(Math_.deg_to_rad(lat2)) 
                            * Math.pow(Math.sin(((Math_.deg_to_rad(lng2 - lng1))) / 2.0), 2.0)
                      )
                  )
              );
        }

        // Displays the location in a map using Bing.
        public getViewCore(s: IStackFrame, b: BoxBase): HTMLElement
        {
            var map = Maps.create_map();
            map.set_center(this);
            map.add_text(this, this.latitude().toFixed(3) + ', ' +  this.longitude().toFixed(3), Colors.background(s), Colors.foreground(s));
            return map.getViewCore(s, b);
        }

        //? Displays the location in a map using Bing.
        //@ cap(maps) flow(SinkSafe)
        public post_to_wall(s:IStackFrame) : void { super.post_to_wall(s) }
    }
}
