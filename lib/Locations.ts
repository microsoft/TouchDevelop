///<reference path='refs.ts'/>
module TDev.RT {
    //? Geo coordinates
    //@ skill(3)
    export module Locations
    {
        //? Creates a new geo coordinate location
        export function create_location(latitude:number, longitude:number) : Location_ { return Location_.mk(latitude, longitude, undefined, undefined, undefined, undefined, undefined) }

        //? Creates an empty list of locations
        export function create_location_list(): Collection<Location_> { return Collections.create_location_collection(); }

        //? Looks for an address near a location using Bing.
        //@ async cap(maps) flow(SinkSafe) returns(string)
        export function describe_location(location: Location_, r : ResumeCtx) //: string
        {
            Cloud.authenticateAsync(lf("describing a location"))
                .then((authenticated) => {
                    if (!authenticated) return Promise.as(undefined);
                    else {
                        var url = 'runtime/locations/describe?latitude=' + encodeURIComponent(location.latitude().toString()) + '&longitude=' + encodeURIComponent(location.longitude().toString());
                        var request = WebRequest.mk(Cloud.getPrivateApiUrl(url), undefined);
                        r.progress('Describing location...');
                        return request.sendAsync();
                    }
                }).done((response: WebResponse) => {
                    try {
                        var description: string = undefined;
                        var json = response ? response.content_as_json() : undefined;
                        if (json)
                            description = json.to_string();
                        r.resumeVal(description);
                    }
                    catch (ex) {
                        Time.log('locations describe failed, ' + ex.message);
                        r.resumeVal(undefined);
                    }
                })
        }

        //? Looks for the coordinate of an address using Bing.
        //@ async cap(maps) flow(SinkSafe) returns(Location_)
        export function search_location(address:string, postal_code:string, city:string, country:string, r : ResumeCtx) //: Location_
        {
            Cloud.authenticateAsync(lf("searching a location"))
                .then((authenticated) => {
                    if (!authenticated) return Promise.as(undefined);
                    else {
                        var url = 'runtime/locations/search?address=' + encodeURIComponent(address);
                        if (postal_code)
                            url += '&postalCode=' + encodeURIComponent(postal_code);
                        if (city)
                            url += '&city=' + encodeURIComponent(city);
                        if (country)
                            url += '&country=' + encodeURIComponent(country);
                        var request = WebRequest.mk(Cloud.getPrivateApiUrl(url), undefined);
                        r.progress('Searching location...');
                        return request.sendAsync();
                    }
                }).done((response : WebResponse) => {
                    try {
                        var loc: Location_ = undefined;
                        var json = response ? response.content_as_json() : undefined;
                        if (json)
                            loc = Location_.mkShort(json.number('latitude'), json.number('longitude'));
                        r.resumeVal(loc);
                    }
                    catch (ex) {
                        Time.log('locations search failed, ' + ex.message);
                        r.resumeVal(undefined);
                    }
                });
        }
    }
}
