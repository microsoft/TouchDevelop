///<reference path='refs.ts'/>
module TDev.RT {
    //? A user account
    //@ ctx(general,indexkey,cloudfield,walltap,json) serializable
    //@ icon("fa-user") immutable isData ctx(general) serializable
    export class User
        extends RTValue {
        private _id: string = undefined;
        static jsonCache: { [userId: string]: Promise/*of a json record*/; } = {} // TODO: consider persisting in localStorage (with automatic cleanup)
        static getJsonAsync(userId: string): Promise { // of a json record
            if (User.jsonCache.hasOwnProperty(userId))
                return User.jsonCache[userId];

            var p:Promise
            var m = /^([^:]*):(.*)/.exec(userId)
            if (m) {
                if (m[1] == "td")
                    p = User.getJsonAsync(m[2])
                else if (m[1] == "live" && /^[^0-9a-f]+$/.test(m[2]))
                    p = Util.httpGetJsonAsync("https://apis.live.net/v5.0/" + m[2]).then(resp => {
                        return {
                            kind: "user",
                            id: userId,
                            name: resp.name
                        }
                    })
                else
                    p = Promise.as({
                        kind: "user",
                        id: userId,
                    })
            } else {
                p = Cloud.getPublicApiAsync(encodeURIComponent(userId))
            }

            User.jsonCache[userId] = p
            return p;
        }

        public getJsonAsync(): Promise {
            return User.getJsonAsync(this._id);
        }
        public getApiUrl(path: string) {
            var ns = this.idNamespace()
            var id = this._id
            if (ns == "td" || ns == "")
                id = this._id.replace(/^[^:]+:/, "")
            else
                return undefined;
            return Cloud.getServiceUrl() + "/api/" + encodeURIComponent(id) + path;
        }
        public getPictureUrl(user: any, which: string) {
            return (user && user.haspicture) ? this.getApiUrl("/picture" + ((which && which != "original") ? ("?type=" + encodeURIComponent(which)) : "")) : undefined;
        }

        constructor () {
            super()
        }

        public idNamespace()
        {
            var m = /^([^:]*):(.*)/.exec(this._id)
            if (m)
                return m[1]
            else
                return ""
        }

        //public reuseKey() { return "" + this._id; }
        public toJsonKey(): any { return this._id; }
        public keyCompareTo(o: any): number {
            var other: User = o;
            return (this._id < other._id) ? - 1 :
                (this._id > other._id) ? 1 : 0;
        }


        static mk(id: string): User {
            var u = new User();
            u._id = id;
            return u;
        }

        // used for displaying tables and for json export
        public getShortStringRepresentation(): string {
            return this._id;
        }

        public toString(): string {
            var s = "user /" + this._id;
            return s;
        }

        public exportJson(ctx: JsonExportCtx): any {
            return this._id;
        }
        public importJson(ctx: JsonImportCtx, json: any): RT.RTValue {
            Util.oops("should not call immutable instance for importing");
            return undefined;
        }
        static mkFromJson(ctx: JsonImportCtx, json: any): RT.RTValue {
            if (typeof (json) !== "string")
                return undefined;
            else {
                return User.mk(json);
            }
        }


        //? Gets a value idincating if the user is the same as the other.
        public equals(other : User) : boolean {
            return this._id == other._id;
        }

        //? Gets a unique identifier for the user.
        public id(): string {
            return this._id;
        }

        //? Download user-data if needed
        //@ async cap(network) returns(void)
        public preload(r: ResumeCtx) {
            this.loadFirst(r, user => { })
        }

        //? Gets the name of the user
        //@ cachedAsync cap(network) returns(string)
        public name(r: ResumeCtx) {
            this.loadFirst(r, user => user ? user.name : undefined);
        }

        //? Gets the about-me text of the user
        //@ cachedAsync cap(network) returns(string)
        public about(r: ResumeCtx) {
            this.loadFirst(r, user => user ? user.about : undefined);
        }

        //? Indicates if the user has a picture
        //@ cachedAsync cap(network) returns(boolean)
        public has_picture(r: ResumeCtx) {
            this.loadFirst(r, user => user ? user.haspicture : undefined);
        }

        //? Gets the url of the user picture where original is the unmodified user picture, square is 50x50, small has 50px width, normal has 100px width, large has roughly 200px width
        //@ [which].deflStrings("original", "square", "small", "normal", "large")
        //@ cachedAsync cap(network) returns(string)
        public picture_address(which: string, r: ResumeCtx) {
            this.loadFirst(r, user => this.getPictureUrl(user, which));
        }

        //? Gets the user picture where original is the unmodified user picture, square is 50x50, small has 50px width, normal has 100px width, large has roughly 200px width
        //@ [which].deflStrings("original", "square", "small", "normal", "large")
        //@ cachedAsync cap(network) returns(Picture)
        public picture(which: string, r: ResumeCtx) {
            Util.assert(!!r); // fail early if no resume ctx
            this.getJsonAsync()
                .then(user => this.getPictureUrl(user, which))
                .then(url => url ? Picture.fromUrl(url) : undefined)
                .done(picture => r.resumeVal(picture));
        }

        public loadFirst(r: ResumeCtx, f: (any) =>any): void {
            Util.assert(!!r); // fail early if no resume ctx
            this.getJsonAsync().done(user => {
                if (!f) r.resume();
                else r.resumeVal(f(user));
            }, e => {
                if (!f) r.resume();
                else r.resumeVal(f(undefined));
            });
        }

        public getViewCore(s: IStackFrame, b: BoxBase = null): HTMLElement {
            var elt = div("item", [div("wall-dialog-header", "user /" + this._id)]);
            this.getJsonAsync().then(user => {
                if (user.kind == "user") {
                    elt.appendChildren(div("wall-dialog-body", "name: " + user.name));
                    if (user.haspicture) {
                        var img = <HTMLImageElement>createElement("img");
                        img.setAttribute('class', 'wall-picture');
                        img.src = this.getPictureUrl(user, "large");
                        img.alt = user.name;
                        elt.appendChildren(img);
                    }
                } else
                    elt.appendChildren(div("wall-dialog-body", lf("invalid user id")));
            }, e =>
            {
                elt.appendChildren(div("wall-dialog-body", lf("further user information unavailable")));
            }).done();
            return elt;
        }

        //? Displays the link on the wall
        //@ cap(network) flow(SinkWeb)
        public post_to_wall(s: IStackFrame): void { super.post_to_wall(s) }
    }
}
