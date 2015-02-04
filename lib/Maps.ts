///<reference path='refs.ts'/>
module TDev.RT {
    //? Maps, location to address, address to location
    export module Maps
    {
        //? Creates a Bing map. Use 'post to wall' to display it.
        //@ cap(maps) [result].writesMutable
        export function create_map(): Map
        {
            return Map.mk(false);
        }

        //? Creates a full screen Bing map. Use 'post to wall' to display it.
        //@ cap(maps) [result].writesMutable
        export function create_full_map(): Map
        {
            return Map.mk(true);
        }

        //? Calculates the directions between two coordinates using Bing.
        //@ async cap(maps) flow(SinkSafe) returns(Collection<Location_>)
        //@ [result].writesMutable
        //@ [from].deflExpr('senses->current_location') [walking].defl(true)
        export function directions(from: Location_, to: Location_, walking: boolean, r :ResumeCtx)
        {
            
            if (from.equals(to)) {
                var col = Collections.create_location_collection();
                col.add(from);
                col.add(to);
                r.resumeVal(col);
                return;
            }

            var url = 'runtime/maps/directions?'
               + 'fromLat=' + encodeURIComponent(from.latitude().toString()) 
               + '&fromLong=' + encodeURIComponent(from.longitude().toString())                
               + '&toLat=' + encodeURIComponent(to.latitude().toString())
               + '&toLong=' + encodeURIComponent(to.longitude().toString()) 
               + '&walking=' + (walking ? 'true' : 'false');
            var request = WebRequest.mk(Cloud.getPrivateApiUrl(url), undefined);
            r.progress('Getting directions...');
            request.sendAsync()
                .then((response : WebResponse) => {
                    try {
                        var locs: Collection<Location_> = undefined;
                        var json = response.content_as_json();
                        if (json) {
                            locs = Collections.create_location_collection();
                            for (var i = 0; i < json.count(); ++i) {
                                var jloc = json.at(i);
                                locs.add(Location_.mkShort(jloc.number('latitude'), jloc.number('longitude')));
                            }
                        }
                        r.resumeVal(locs);
                    }
                    catch (ex) {
                        Time.log('locations describe failed, ' + ex.message);
                        r.resumeVal(undefined);
                    }
                }).done();
        }

        //? Shows the directions in the Bing map application. If search term is provided, location is ignored.Provide search term or location for start and end.
        //@ [start_search].defl("") [start_loc].deflExpr('senses->current_location') [end_search].defl("")
        //@ uiAsync
        export function open_directions(start_search: string, start_loc: Location_, end_search: string, end_loc: Location_, r: ResumeCtx): void {
            var url = "http://www.bing.com/maps/?v=2&rtp=";
            if (start_search)
                url += "adr." + encodeURIComponent(start_search);
            else if (start_loc)
                url += "pos." + encodeURIComponent(start_loc.latitude().toString()) + "_" + encodeURIComponent(start_loc.longitude().toString());
            url += "~";
            if (end_search)
                url += "adr." + encodeURIComponent(end_search);
            else if (end_loc)
                url += "pos." + encodeURIComponent(end_loc.latitude().toString()) + "_" + encodeURIComponent(end_loc.longitude().toString());
            url += "&lvl=12";
            Web.browse(url, r);
        }

        export function mapUrl(center: Location_, search: string = undefined, zoom: number = undefined): string
        {
            var url = "http://www.bing.com/maps/?v=2&cp="
                    + encodeURIComponent(center.latitude().toString())
                    + "~"
                    + encodeURIComponent(center.longitude().toString());
            if (search)
                url += "&q=" + encodeURIComponent(search);
            if (zoom) {
                var z = 1.0 + Math.max(0.0, Math.min(1.0, zoom)) * 18.0;
                url += "&zoom=" + z;
            }
            url += "&lvl=12";
            return url;
        }

        //? Opens the Bing map application. zoom between 0 (close) and 1 (far).
        //@ [center].deflExpr('senses->current_location') [search].defl("") [zoom].defl(0.6)
        //@ uiAsync
        export function open_map(center: Location_, search: string, zoom: number, r : ResumeCtx): void
        {
            Web.browse(mapUrl(center, search, zoom), r);
        }
    }
}
