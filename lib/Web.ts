///<reference path='refs.ts'/>
module TDev.RT {
    export module BingServices {
        function readBingSearchResponse(response: WebResponse): BingSearchResult[] {
            var links: BingSearchResult[] = [];
            try {
                var json = response.content_as_json();
                if (json) {
                    for (var i = 0; i < json.count(); ++i) {
                        var jlink = json.at(i);
                        var url = jlink.string('address');
                        var name = jlink.string('name');
                        var thumb = jlink.string('thumb');
                        var web = jlink.string('web');
                        if (url != null && url.length > 0)
                            links.push({ url: url, name: name, thumbUrl: thumb, web: web });
                    }
                }
                return links;
            }
            catch (ex) {}
            return links;
        }

        export var searchAsync = (kind: string, query: string, loc: Location_): Promise =>
        {
            if (!query) return Promise.as([]);

            var url = 'runtime/web/search?kind=' + encodeURIComponent(kind) + '&query=' + encodeURIComponent(query);
            if (loc) {
                url += '&latitude=' + encodeURIComponent(loc.latitude().toString()) + '&longitude=' + encodeURIComponent(loc.longitude().toString());
            }
            var request = WebRequest.mk(Cloud.getPrivateApiUrl(url), undefined);
            return request.sendAsync()
                .then((response: WebResponse) => readBingSearchResponse(response));
        }
    }

    export interface BingSearchResult {
        name: string;
        url: string;
        thumbUrl: string;
        web: string;
    }

    export interface EventSource {
        addEventListener(msg: string, cb: (e: any) => void, replace: boolean);
        close();
        readyState: number;
    }

    //? A Server-Sent-Events client
    //@ stem("source")
    export class WebEventSource extends RTDisposableValue {
        private onMessages = {};
        private onOpen: Event_;
        private onError: Event_;

        constructor(rt : Runtime, private source : EventSource) {
            super(rt);
        }

        //? Sets an event to run when a message is received. Change name to receive custom events.
        //@ [name].defl('message') ignoreReturnValue writesMutable
        public on_message(name: string, handler: TextAction): EventBinding {
            if (!name || /^close|error$/i.test(name))
                Util.userError(lf("name cannot be 'close' or 'error'"));

            var onMessage = <Event_>this.onMessages[name];
            if (!onMessage) {
                onMessage = new Event_();
                if (this.source)
                    this.source.addEventListener(name, (e: MessageEvent) => {
                        if (this.source && onMessage.handlers) {
                            var d = e.data || "";
                            this.rt.queueLocalEvent(onMessage, [d]);
                        }
                    }, false);
            }
            return onMessage.addHandler(handler);
        }

        //? Gets the current connection state (`connecting`, `open`, `closed`)
        public state(): string {
            if (!this.source) return "closed";
            else switch (this.source.readyState) {
                case 0: return "connecting";
                case 1: return "open";
                case 2: return "closed";
                default: return "unkown";
            }
        }

        //? Sets an event to run when the event source is opened
        //@ ignoreReturnValue writesMutable
        public on_open(body: Action): EventBinding {
            if (!this.onOpen) {
                this.onOpen = new Event_();
                if (this.source)
                    this.source.addEventListener('open', (e) => {
                        if (this.source && this.onOpen.handlers)
                            this.rt.queueLocalEvent(this.onOpen);
                    }, false);
            }
            return this.onOpen.addHandler(body);
        }

        //? Sets an event to run when an error occurs
        //@ ignoreReturnValue writesMutable
        public on_error(body: Action): EventBinding {
            if (!this.onError) {
                this.onError = new Event_();
                if (this.source)
                    this.source.addEventListener('error', (e) => {
                        if (this.source && this.onError.handlers)
                            this.rt.queueLocalEvent(this.onError);
                    }, false);
            }
            return this.onError.addHandler(body);
        }

        //? Closes the EventSource. No further event will be raised.
        //@ writesMutable
        public close() {
            if (this.source) {
                try {
                    this.source.close();
                }
                catch (e) {}
                this.source = undefined;
            }
        }

        public dispose() {
            this.close();
            super.dispose();
        }
    }

    //? Search and browse the web...
    //@ skill(2)
    export module Web {
        export interface MessageWaiter {
            origin: string;
            handler: (js:JsonObject)=>void;
        }

        export interface State {
            _onReceivedMessageEvent: Event_;
            _messageWaiters: MessageWaiter[];
            receiveMessage: (event: MessageEvent) => void;
        }

        export function rt_start(rt: Runtime): void {
            clearReceivedMessageEvent(rt);
        }
        export function rt_stop(rt: Runtime) {
            clearReceivedMessageEvent(rt);
        }

        function toLink(jlink: BingSearchResult, kind: LinkKind): Link {
            var link: Link = Link.mk(jlink.url, kind);
            var idx = jlink.name.indexOf(' : ');
            if (idx > 0) {
                link.set_title(jlink.name.slice(0, idx));
                link.set_description(jlink.name.slice(idx + 3));
            } else {
                link.set_name(jlink.name);
            }
            return link;
        }

        function bingSearch(kind: string, query: string, loc: Location_, linkKind: LinkKind, r: ResumeCtx) {
            BingServices.searchAsync(kind, query, loc)
                .done((results: BingSearchResult[]) => {
                    var links = Collections.create_link_collection();
                    results.forEach(result => {
                        links.add(toLink(result, linkKind));
                    });
                    r.resumeVal(links);
                });
        }

        //? Searching the web using Bing
        //@ async cap(search) flow(SinkSafe) returns(Collection<Link>)
        //@ [result].writesMutable
        export function search(query: string, r: ResumeCtx) //: Collection<Link>
        {
            bingSearch("Web", query, undefined, LinkKind.hyperlink, r);
        }

        //? Searching the web near a location using Bing. Distance in meters, negative to ignore.
        //@ async cap(search) flow(SinkSafe) returns(Collection<Link>)
        //@ [result].writesMutable
        //@ [location].deflExpr('senses->current_location') [distance].defl(1000)
        export function search_nearby(query: string, location: Location_, distance: number, r: ResumeCtx) // : Collection<Link>
        {
            bingSearch("Web", query, location, LinkKind.hyperlink, r);
        }

        //? Searching images using Bing
        //@ async cap(search) flow(SinkSafe) returns(Collection<Link>)
        //@ [result].writesMutable
        export function search_images(query: string, r: ResumeCtx)  // : Collection<Link>
        {

            bingSearch("Images", query, undefined, LinkKind.image, r);
        }

        //? Searching images near a location using Bing. Distance in meters, negative to ignore.
        //@ async cap(search) flow(SinkSafe) returns(Collection<Link>)
        //@ [result].writesMutable
        //@ [location].deflExpr('senses->current_location') [distance].defl(1000)
        export function search_images_nearby(query: string, location: Location_, distance: number, r: ResumeCtx) // : Collection<Link>
        {

            bingSearch("Images", query, location, LinkKind.image, r);
        }

        //? Search phone numbers using Bing
        //@ obsolete cap(search) flow(SinkSafe)
        //@ [result].writesMutable
        export function search_phone_numbers(query: string): Collection<Link> {
            return undefined;
        }

        //? Search phone numbers near a location using Bing. Distance in meters, negative to ignore.
        //@ obsolete cap(search) flow(SinkSafe)
        //@ [result].writesMutable
        //@ [location].deflExpr('senses->current_location') [distance].defl(1000)
        export function search_phone_numbers_nearby(query: string, location: Location_, distance: number): Collection<Link> {
            return undefined;
        }

        //? Searching news using Bing
        //@ async cap(search) flow(SinkSafe) returns(Collection<Link>)
        //@ [result].writesMutable
        export function search_news(query: string, r: ResumeCtx) // : Collection<Link>
        {
            bingSearch("News", query, undefined, LinkKind.hyperlink, r);
        }

        //? Searching news near a location using Bing. Distance in meters, negative to ignore.
        //@ async cap(search) flow(SinkSafe) returns(Collection<Link>)
        //@ [result].writesMutable
        //@ [location].deflExpr('senses->current_location') [distance].defl(1000)
        export function search_news_nearby(query: string, location: Location_, distance: number, r: ResumeCtx) // : Collection<Link>
        {
            bingSearch("News", query, location, LinkKind.hyperlink, r);
        }

        //? Indicates whether any network connection is available
        export function is_connected(): boolean {
            return window.navigator.onLine;
        }

        //? Gets the type of the network servicing Internet requests (unknown, none, ethernet, wifi, mobile)
        //@ quickAsync returns(string)
        //@ import("cordova", "cordova-plugin-network-information")
        export function connection_type(r: ResumeCtx) { //: string
            var res = 'unknown';
            var connection = (<any>navigator).connection;
            if (connection) {
                res = connection.type || 'unknown';
            }
            r.resumeVal(res);
        }

        //? Gets a name of the currently connected network servicing Internet requests. Empty string if no connection.
        //@ quickAsync returns(string)
        export function connection_name(r : ResumeCtx) { // : string
            r.resumeVal('');
        }

        //? Opens a connection settings page (airplanemode, bluetooth, wifi, cellular)
        //@ cap(phone) uiAsync
        //@ [page].defl("airplanemode") [page].deflStrings("airplanemode", "bluetooth", "wifi", "cellular")
        export function open_connection_settings(page:string, r : ResumeCtx) : void
        {
            r.resume();
        }

        //? Opens a web browser to a url
        //@ cap(network) flow(SinkWeb) uiAsync
        export function browse(url: string, r : ResumeCtx): void {
            Web.browseAsync(url).done(() => r.resume());
        }

        //? Redirects the browser to a url; only available when exporting
        //@ betaOnly uiAsync
        export function redirect(url:string, r: ResumeCtx) : void
        {
            if (r.rt.devMode)
                Util.userError(lf("web->redirect not available when running in the editor"))
            else {
                // TODO this is a hack
                // give it some time to save data etc
                // we never resume
                Util.setTimeout(1500, () => Util.navigateInWindow(url))
            }
        }

        export var browseAsync = (url: string) =>
        {
            var win = window.open(url, "_blank");
            try {
                win.focus()
                return Promise.as()
            } catch (e) {
                // popup blocked the url
                return new Promise((onSuccess, onError, onProgress) => {
                    var d = new ModalDialog();
                    d.onDismiss = () => onSuccess(undefined);
                    d.add(div("wall-dialog-header", lf("web browsing...")));
                    d.add(div("wall-dialog-body", lf("We tried to open the following web page: {0}",url)))
                    d.add(div("wall-dialog-body", lf("If the page did not open, tap the 'open' button below, otherwise tap 'done'.")))
                    d.add(div("wall-dialog-buttons",
                            HTML.mkA("button wall-button", url, "_blank", "open"),
                            HTML.mkButton(lf("done"), () => {
                                d.dismiss();
                            })))
                    d.show();
                });
            }
        }

        //? Plays an internet audio/video in full screen
        //@ cap(network) flow(SinkWeb)
        export function play_media(url: string): void {
            window.open(url);
        }

        //? Creates a link to an internet audio/video
        //@ [result].writesMutable
        export function link_media(url: string): Link { return Link.mk(url, LinkKind.media); }

        //? Creates a link to an internet image
        //@ [result].writesMutable
        export function link_image(url: string): Link { return Link.mk(url, LinkKind.image); }

        //? Creates a link to an internet page
        //@ [result].writesMutable
        export function link_url(name: string, url: string): Link {
            var l = Link.mk(url, LinkKind.hyperlink);
            l.set_name(name);
            return l;
        }

        //? Creates a multi-scale image from an image url
        //@ obsolete
        //@ [result].writesMutable
        export function link_deep_zoom(url: string): Link {
            return undefined;
        }

        export function proxy(url: string) {
            // don't proxy when not authenticated
            if (!Cloud.hasAccessToken()) return url;
            // don't proxy localhost
            if (!url || /^http:\/\/localhost(:[0-9]+)?\//i.test(url)) return url;
            // don't proxy private ip ranges
            // 10.0.0.0 - 10.255.255.255
            // 172.16.0.0 - 172.31.255.255
            // 192.168.0.0 - 192.168.255.255
            var m = url.match(/^http:\/\/([0-9]+)\.([0-9]+)\.([0-9]+)\.([0-9]+)(:[0-9]+)?\//i);
            if (m) {
                var a = parseInt(m[1]);
                if (a == 10) return url;

                var b = parseInt(m[2]);
                if (a == 172 && b >= 16 && b <= 31) return url;
                if (a == 192 && b == 168) return url;
            }
            return Cloud.getPrivateApiUrl("runtime/web/proxy?url=" + encodeURIComponent(url));
        }

        //? Downloads the content of an internet page (http get)
        //@ async cap(network) flow(SinkWeb) returns(string)
        export function download(url: string, r: ResumeCtx) {
            r.progress('Downloading...');
            var request = create_request(url);
            request
                .sendAsync()
                .done((response: WebResponse) => r.resumeVal(response.content()),
                    (e) => r.resumeVal(undefined));
        }

        //? Downloads a web service response as a JSON data structure (http get)
        //@ async cap(network) flow(SinkWeb) returns(JsonObject)
        export function download_json(url: string, r: ResumeCtx) {
            r.progress('Downloading...');
            var request = create_request(url);
            request.set_accept('application/json');
            request
                .sendAsync()
                .done((response: WebResponse) => r.resumeVal(response.content_as_json()),
                    (e) => r.resumeVal(undefined));
        }

        //? Downloads a web service response as a XML data structure (http get)
        //@ cap(network) async flow(SinkWeb) returns(XmlObject)
        //@ import("npm", "xmldom", "0.1.*")
        export function download_xml(url: string, r: ResumeCtx) {
            var request = create_request(url);
            r.progress('Downloading...');
            request.set_accept('text/xml');
            request
                .sendAsync()
                .done((response: WebResponse) => r.resumeVal(response.content_as_xml()),
                    (e) => r.resumeVal(undefined));
        }

        //? Downloads a WAV sound file from internet
        //@ async cap(network) flow(SinkWeb) returns(Sound)
        export function download_sound(url: string, r: ResumeCtx) // : Sound
        {
            r.progress("Downloading...");
            Sound
                .fromUrl(url)
                .done(snd => r.resumeVal(snd));
        }

        //? Create a streamed song file from internet (download happens when playing)
        //@ cap(media,network) flow(SinkWeb)
        //@ [name].defl("a song")
        export function download_song(url: string, name: string): Song
        {
            return Song.mk(url, undefined, name);
        }

        //? Uploads text to an internet page (http post)
        //@ async cap(network) flow(SinkWeb) returns(string)
        export function upload(url:string, body:string, r : ResumeCtx)
        {
            var request = create_request(url);
            r.progress('Uploading...');
            request.set_method('post');
            request.set_content(body);
            request
                .sendAsync()
                .done((response : WebResponse) => r.resumeVal(response.content()),
                    (e) => r.resumeVal(undefined));
        }

        //? Uploads a sound to an internet page (http post). The sound must have been recorded from the microphone.
        //@ async cap(network) flow(SinkWeb) returns(string)
        export function upload_sound(url: string, snd: Sound, r : ResumeCtx) //: string
        {
            var request = create_request(url);
            r.progress('Uploading...');
            request.set_method('post');
            request.setContentAsSoundInternal(snd);
            request.sendAsync()
                .done((response : WebResponse) => r.resumeVal(response.content()),
                    (e) => r.resumeVal(undefined));
        }

        //? Uploads a picture to an internet page (http post)
        //@ async cap(network) flow(SinkWeb) returns(string)
        export function upload_picture(url: string, pic: Picture, r : ResumeCtx) //: string
        {
            var request = create_request(url);
            r.progress('Uploading...');
            request.set_method('post');
            pic.initAsync()
                .then(() => {
                    request.setContentAsPictureInternal(pic, 0.85);
                    return request.sendAsync();
                }).done((response : WebResponse) => r.resumeVal(response.content()),
                    (e) => r.resumeVal(undefined));
        }

        //? Downloads a picture from internet
        //@ async cap(network) flow(SinkWeb) returns(Picture)
        //@ [result].writesMutable
        export function download_picture(url:string, r : ResumeCtx)
        {
            r.progress('Downloading...');
            var pic = undefined;
            Picture.fromUrl(url)
                .then((p : Picture) => {
                    pic = p;
                    return p.initAsync();
                })
                .done(() => r.resumeVal(pic),
                    (e) => r.resumeVal(undefined));
        }

        //? Decodes a string that has been HTML-encoded
        export function html_decode(html: string): string
        {
            return Util.htmlUnescape(html);
        }

        //? Converts a text string into an HTML-encoded string
        export function html_encode(text: string): string
        {
            return Util.htmlEscape(text);
        }

        //? Decodes a URI component
        export function decode_uri(url: string): string { return decodeURI(url); }

        //? Encodes a uri component
        export function encode_uri(text: string): string { return encodeURI(text); }

        //? Decodes a URI component
        export function decode_uri_component(url: string): string { return decodeURIComponent(url); }

        //? Encodes a uri component
        export function encode_uri_component(text: string): string { return encodeURIComponent(text); }

        //? Use `web->decode uri component` instead.
        //@ obsolete
        export function url_decode(url:string) : string { return decodeURIComponent(url); }

        //? Use `web->encode uri component` instead.
        //@ obsolete
        export function url_encode(text:string) : string { return encodeURIComponent(text); }

        //? Parses the string as a json object
        //@ [value].lang("json")
        //@ [value].defl("{}")
        export function json(value: string): JsonObject
        {
            return JsonObject.mk(value, function (msg) {
                App.logEvent(App.DEBUG, 'json', lf("error parsing json: {0}", msg), undefined);
            });
        }

        //? Returns an empty json object
        export function json_object(): JsonObject {
            return JsonObject.wrap({});
        }

        //? Returns an empty json array
        export function json_array(): JsonObject {
            return JsonObject.wrap([]);
        }

        //? Parses the string as a xml element
        //@ import("npm", "xmldom", "0.1.*")
        export function xml(value:string) : XmlObject
        {
            return XmlObject.mk(value);
        }

        //? Obsolete. Use 'feed' instead.
        //@ obsolete
        //@ [result].writesMutable
        export function rss(value: string): Collection<Message>
        {
            return feed(value);
        }

        //? Creates a web request
        export function create_request(url: string): WebRequest
        {
            return WebRequest.mk(url, "text");
        }

        //? Creates a web socket
        //@ async returns(WebSocket_)
        export function open_web_socket(url: string, r:ResumeCtx)
        {
            var ws = new WebSocket(url)
            ws.onopen = () => {
                ws.onerror = null;
                ws.onopen = null;
                r.resumeVal(WebSocket_.mk(ws, r.rt))
            }
            ws.onerror = err => {
                App.log("Error opening WebSocket to " + url + ": " + err.message)
                r.resumeVal(undefined)
            }
        }

        //? Decodes a string that has been base64-encoded (assuming utf8 encoding)
        export function base64_decode(text: string): string
        {
            var decoded = Util.base64Decode(text)
            try {
                return Util.fromUTF8(decoded);
            } catch (e) {
                return decoded;
            }
        }

        //? Converts a string into an base64-encoded string (with utf8 encoding)
        export function base64_encode(text: string): string
        {
               return Util.base64Encode(Util.toUTF8(text));
        }

        function htmlToPictureUrl(value: string) {
            if (!value) return value;
            var m = value.match(/<img.*?src=['"](.*?)['"].*?\/?>/i);
            if (m) return m[1];
            return null;
        }

        function htmlToText(value : string)
        {
            if (!value) return value;

            var r = value.replace(/<[^>]+>/ig, '');
            var decoded = Web.html_decode(r);
            var decodedescaped = decoded.replace(/<[^>]+>/ig, '');
            return decodedescaped;
        }

        function parseRss(rssx: XmlObject, msgs: Collection<Message>)
        {
            var channel = rssx.child('channel');
            if (!channel) return;

            var imgRx = /^image\/(png|jpg|jpeg)$/i;
            var mediaRx = Browser.isGecko ? /^video\/webm|audio\/mp3$/i : /^video\/mp4|audio\/mp3$/i;
            var items = channel.children('item');
            for (var i = 0; i < items.count(); ++i) {
                var item = items.at(i);
                var msg = Message.mk("");
                msg.set_from(undefined);
                msgs.add(msg);
                var description = item.child('description');
                if (description)
                    parseHtmlContent(msg, description.value());
                var title = item.child('title');
                if (title)
                    msg.set_title(htmlToText(title.value()));
                var link = item.child('link');
                if (link)
                    msg.set_link(link.value());
                var pubDate = item.child('pubDate');
                if (pubDate)
                    msg.set_time(DateTime.parse(pubDate.value()));
                var speaker = item.child('{http://www.microsoft.com/dtds/mavis/}speaker');
                if (speaker)
                    msg.set_from(htmlToText(speaker.value()));
                var author = item.child('{http://www.itunes.com/dtds/podcast-1.0.dtd}author');
                if (author)
                    msg.set_from(htmlToText(author.value()));
                var creator = item.child('creator');
                if (creator)
                    msg.set_from(htmlToText(creator.value()));
                var img = item.child('{http://www.itunes.com/dtds/podcast-1.0.dtd}image');
                if (img && img.attr('href'))
                    msg.set_picture_link(img.attr('href'));
                var enclosure = item.child('enclosure');
                if (enclosure) {
                    var enclosureType = enclosure.attr('type') || "";
                    if (imgRx.test(enclosureType))
                        msg.set_picture_link(enclosure.attr('url'));
                    else if (mediaRx.test(enclosureType))
                        msg.set_media_link(enclosure.attr('url'));
                }
                var thumbnails = item.children('{http://search.yahoo.com/mrss/}thumbnail');
                var tisize = -1;
                for (var ti = 0; ti < thumbnails.count(); ++ti) {
                    var thumbnail = thumbnails.at(ti);
                    var cisize = (String_.to_number(thumbnail.attr('width')) || 1) * (String_.to_number(thumbnail.attr('height')) || 1);
                    if (thumbnail.attr('url') && cisize > tisize) {
                        msg.set_picture_link(thumbnail.attr('url'));
                        tisize = cisize;
                    }
                }
                var group = item.child('{http://search.yahoo.com/mrss/}group');
                if (group) {
                    var contents = group.children('{http://search.yahoo.com/mrss/}content');
                    var mcsize = 0;
                    for (var ci = 0; ci < contents.count(); ++ci) {
                        var content = contents.at(ci);
                        var csize = String_.to_number(content.attr('fileSize')) || 0;
                        var curl = content.attr('url');
                        var ctype = content.attr('type');
                        if (curl && mediaRx.test(ctype) && csize > mcsize) {
                            msg.set_media_link(curl);
                            mcsize = csize;
                        }
                    }
                }
                parseGeoRss(msg, item);
            }
        }

        function parseGeoRss(msg: Message, item: XmlObject) {
            var point = item.child('{http://www.georss.org/georss}point');
            if (point) {
                var txt = point.value();
                var i = txt.indexOf(' ');
                if (i > 0) {
                    var lat = parseFloat(txt.substr(0, i));
                    var long = parseFloat(txt.substr(i + 1));
                    if (!isNaN(lat) && !isNaN(long))
                        msg.set_location(Location_.mkShort(lat, long));
                }
            }
        }

        function parseProperties(msg: Message, entry: XmlObject) {
            var properties = entry.child('{http://schemas.microsoft.com/ado/2007/08/dataservices/metadata}properties');
            if (properties) {
                var props = properties.children("");
                for (var j = 0; j < props.count(); ++j) {
                    var prop = props.at(j);
                    msg.values().set_at(prop.local_name(), prop.value());
                }
            }
        }

        function parseHtmlContent(msg: Message, value: string) {
            if (!value) return;

            msg.set_message(htmlToText(value));
            var pic = htmlToPictureUrl(value);
            if (pic)
                msg.set_picture_link(pic);
        }

        function parseAtom(feed: XmlObject, msgs: Collection<Message>)
        {
            var channelTitlex = feed.child('title');
            var channelTitle = channelTitlex ? channelTitlex.value() : "atom";
            var entries = feed.children('entry');
            if (entries) {
                for (var i = 0; i < entries.count(); ++i) {
                    var entry = entries.at(i);
                    var msg = Message.mk("");
                    msg.set_from(undefined);
                    msgs.add(msg);
                    var summary = entry.child('summary');
                    if (summary)
                        parseHtmlContent(msg, summary.value());
                    var title = entry.child('title');
                    if (title)
                        msg.set_title(htmlToText(title.value()));
                    var updated = entry.child('updated');
                    if (updated) {
                        var updatedd = DateTime.parse(updated.value());
                        if (updatedd)
                            msg.set_time(updatedd);
                    }
                    var content = entry.child('content');
                    if (content) {
                        var contentType = content.attr('type') || "";
                        if (/^image\//i.test(contentType) && content.attr('src'))
                            msg.set_picture_link(content.attr('src'));
                        else if (/^application\/xml/i.test(contentType))
                            parseProperties(msg, content);
                        else if (/html/i.test(contentType))
                            parseHtmlContent(msg, content.value());
                    }
                    var author = entry.child('author');
                    if (author) {
                        var authorName = author.child('name');
                        if (authorName)
                            msg.set_from(authorName.value());
                    }
                    parseGeoRss(msg, entry);
                }
            }
        }

        //? Parses the newsfeed string (RSS 2.0 or Atom 1.0) into a message collection
        //@ [result].writesMutable
        //@ import("npm", "xmldom", "0.1.*")
        export function feed(value: string): Collection<Message>
        {
            var msgs = Collections.create_message_collection();
            var xml = XmlObject.mk(value);
            while(xml != null) {
                if (xml.name() === 'rss') {
                    parseRss(xml, msgs);
                    break;
                }
                else if (xml.name() === 'feed') {
                    parseAtom(xml, msgs);
                    break;
                }
                else {
                    xml = xml.next_sibling();
                }
            }
            return msgs;
        }

        //? Creates a json builder
        //@ [result].writesMutable
        export function create_json_builder(): JsonBuilder {
            return new (<any>JsonBuilder)(); //TS9
        }

        //? Parses a Command Separated Values document into a JsonObject where the `headers` is a string array of column names; `records` is an array of rows where each row is itself an array of strings. The delimiter is inferred if not specified.
        //@ [delimiter].defl("\t")
        export function csv(text: string, delimiter : string): JsonObject {
            var file = new CsvParser().parse(text, delimiter);
            return JsonObject.wrap(file);
        }

        //? Creates a picture from a web address. The resulting picture cannot be modified, use clone if you want to change it.
        export function picture(url: string): Picture {
            return Picture.fromUrlSync(url, true);
        }

        interface OAuthRedirect {
            redirect_url: string;
            user_id: string;
            time: number;
        }

        //? Authenticate with OAuth 2.0 and receives the access token or error. See [](/oauthv2) for more information on which Redirect URI to choose.
        //@ cap(network) flow(SinkWeb) returns(OAuthResponse) uiAsync
        export function oauth_v2(oauth_url: string, r : ResumeCtx)
        {
            // validating url
            if (!oauth_url) {
                r.resumeVal(OAuthResponse.mkError("access_denied", "Empty oauth url.", null));
                return;
            }
            // dissallow state and redirect uris.
            if (/state=|redirect_uri=/i.test(oauth_url)) {
                r.resumeVal(OAuthResponse.mkError("access_denied", "The `redirect_uri` and `state` query arguments are not allowed.", null));
                return;
            }

            // check connection
            if (!Web.is_connected()) {
                r.resumeVal(OAuthResponse.mkError("access_denied", "No internet connection.", null));
                return;
            }
            var userid = r.rt.currentAuthorId;

            Web.oauth_v2_async(oauth_url, userid).done((v) => {
                r.resumeVal(v);
            })
        }

        export function oauth_v2_async(oauth_url: string, userid: string): Promise
            // : OAuthResponse
        {
            var redirectURI = "https://www.touchdevelop.com/" + userid + "/oauth";
            var state = Util.guidGen();
            var stateArg = "state=" + state.replace('-', '');

            var hostM = /^([^\/]+:\/\/[^\/]+)/.exec(document.URL)
            var host = hostM ? hostM[1] : ""
            if (host && !/\.touchdevelop\.com$/i.test(host)) {
                redirectURI = host + "/api/oauth"
                userid = "web-app"
            }

            var actualRedirectURI = redirectURI;
            // special subdomain scheme?
            var subdomainRx = /&tdredirectdomainid=([a-z0-9]{1,64})/i;
            var msubdomain = oauth_url.match(subdomainRx);
            if (msubdomain) {
                var appid = msubdomain[1];
                actualRedirectURI = 'https://' + appid + '-' + userid + '.users.touchdevelop.com/oauth';
                redirectURI = "https://www.touchdevelop.com/" + appid + '-' + userid + "/oauth";
                App.log('oauth appid redirect: ' + appid);
                oauth_url = oauth_url.replace(subdomainRx, '');
            }
            // state variable needed in redirect uri?
            var stateRx = /&tdstateinredirecturi=true/i;
            if (stateRx.test(oauth_url)) {
                actualRedirectURI += "?" + stateArg;
                Time.log('oauth adding state to url');
                oauth_url = oauth_url.replace(stateRx, '');
            }

            App.log('oauth login uri: ' + oauth_url);
            App.log('oauth redirect uri: ' + actualRedirectURI);
            // craft url login;
            var url = oauth_url
                + (/\?/.test(oauth_url) ? '&' : '?')
                + 'redirect_uri=' + encodeURIComponent(actualRedirectURI)
                + "&" + stateArg;
            if (!/response_type=(token|code)/i.test(url))
                url += "&response_type=token";

            App.log('oauth auth url: ' + url);
            return Web.oauth_v2_dance_async(url, actualRedirectURI, userid, stateArg);
        }

        export function oauth_v2_dance_async(url: string, redirect_uri: string, userid: string, stateArg: string): Promise {
            var res = new PromiseInv();

            var response: OAuthResponse;
            var oauthWindow: Window;
            var m = new ModalDialog();

            function handleMessage(event) {
                var origin = document.URL.replace(/(.*:\/\/[^\/]+).*/, (a, b) => b)
                if (event.origin == origin && Array.isArray(event.data)) {
                    processRedirects(event.data)
                }
            }

            function handleStorage(event) {
                // console.log("Storage: " + event.key)
                if (event.key == "oauth_redirect")
                    processRedirects(JSON.parse(event.newValue || "[]"))
            }

            function dismiss() {
                window.removeEventListener("message", handleMessage, false)
                window.removeEventListener("storage", handleStorage, false)

                if (!response)
                    response = OAuthResponse.mkError("access_denied", "The user cancelled the authentication.", null);
                if (oauthWindow)
                    oauthWindow.close();
                res.success(response);
            }

            function processRedirects(redirects:OAuthRedirect[])
            {
                redirects.reverse(); // pick the latest oauth message

                var matches = redirects.filter(redirect => userid == redirect.user_id && redirect.redirect_url.indexOf(stateArg) > -1);
                if (matches.length > 0) {
                    Time.log('oauth redirect_uri: ' + matches[0].redirect_url);
                    response = OAuthResponse.parse(matches[0].redirect_url);
                    m.dismiss();
                    return;
                }

                // is the window still opened?
                if (!response && oauthWindow && oauthWindow.closed) {
                    response = OAuthResponse.mkError("access_denied", "The authentication window was closed", null);
                    m.dismiss();
                    return;
                }
            }

            // monitors local storage for the url
            function tracker() {
                if (response) return; // we've gotten a response or the user dismissed

                window.localStorage.setItem("last_oauth_check", Date.now() + "")

                // array of access tokens
                processRedirects(JSON.parse(window.localStorage.getItem("oauth_redirect") || "[]"))

                if (!response)
                    Util.setTimeout(100, tracker);
            }

            // start the oauth dance...
            var woptions = 'menubar=no,toolbar=no';
            oauthWindow = window.open(url, '_blank', woptions);

            m.add(div('wall-dialog-header', lf("authenticating...")));
            m.add(div('wall-dialog-body', lf("A separate window with the sign in dialog has opened, please sign in in that window.")));
            m.add(div('wall-dialog-body', lf("Can't see any window? Try tapping the button below to log in manually.")));
            m.add(div('wall-dialog-buttons', HTML.mkA("button wall-button", url, "_blank", "log in")));
            m.onDismiss = () => { dismiss(); };

            m.show();

            // and start listening...
            Util.setTimeout(100, tracker);
            // window.addEventListener("message", handleMessage, false)
            // window.addEventListener("storage", handleStorage, false)

            return res;
        }

        //? Create a form builder
        //@ [result].writesMutable
        export function create_form_builder(): FormBuilder { return new FormBuilder(); }

        //? Posts a message to the parent window if any. The `target origin` must match the domain of the parent window, * is not accepted.
        //@ readsMutable [target_origin].defl('https://www.touchdevelop.com')
        export function post_message_to_parent(target_origin: string, message: JsonObject, s:IStackFrame) {
            if (!target_origin || target_origin == "*")
                Util.userError(lf("target origin cannot be empty or *"));

            if (isWebWorker) {
                var msg = message.value()
                if (s && s.rt.pluginSlotId) {
                    msg = Util.jsonClone(msg)
                    msg.tdSlotId = s.rt.pluginSlotId
                }

                (<any>self).postMessage(msg)
                return
            }

            var parent = window.parent;
            if (parent && parent != window && parent.postMessage) {
                try {
                    parent.postMessage(message.value(), target_origin);
                }
                catch (e) {
                    App.log("web: posting message to parent failed");
                }
            }
        }

        function receiveMessage(rt:Runtime, event: MessageEvent) {
            var s = rt.webState
            if (window != window.parent && event.source === window.parent && s._onReceivedMessageEvent) {
                App.log("web: receiving message from parent");
                var json = JsonObject.wrap(event.data)

                var waiters = s._messageWaiters.filter(m => m.origin === event.origin)
                if (waiters.length > 0) {
                    // remove them
                    s._messageWaiters = s._messageWaiters.filter(m => m.origin !== event.origin)
                    waiters.forEach(w => w.handler(json))
                }

                if (s._onReceivedMessageEvent.handlers) {
                    rt.queueLocalEvent(s._onReceivedMessageEvent, [json], false, false, (binding) => {
                        var origin = <string>binding.data;
                        return event.origin === origin;
                    });
                }
            }
        }

        export function receiveWorkerMessage(rt:Runtime, data:any) {
            var s = rt.webState
            if (s._onReceivedMessageEvent) {
                var json = JsonObject.wrap(data)

                var waiters = s._messageWaiters
                if (waiters.length > 0) {
                    // remove them
                    s._messageWaiters = []
                    waiters.forEach(w => w.handler(json))
                }

                if (s._onReceivedMessageEvent.handlers) {
                    rt.queueLocalEvent(s._onReceivedMessageEvent, [json], false, false)
                }
            }
        }

        function installReceiveMessage(rt:Runtime, origin:string)
        {
            if (!origin)
                Util.userError(lf("origin cannot be empty"));
            var s = rt.webState
            if (!s._onReceivedMessageEvent) {
                s._onReceivedMessageEvent = new Event_();
                s._messageWaiters = [];
                if (!isWebWorker) {
                    s.receiveMessage = (e) => receiveMessage(rt, e)
                    window.addEventListener("message", s.receiveMessage, false);
                }
            }
        }


        //? Waits for the next message from the parent window in `origin`.
        //@ async
        //@ returns(JsonObject)
        export function wait_for_message_from_parent(origin: string, r: ResumeCtx) {
            installReceiveMessage(r.rt, origin)
            r.rt.webState._messageWaiters.push({
                origin: origin,
                handler: (j) => r.resumeVal(j)
            })
        }

        //? Attaches code to run when a message is received. Only messages from the parent window and `origin` will be received.
        //@ ignoreReturnValue
        export function on_received_message_from_parent(origin: string, received: JsonAction, s:IStackFrame): EventBinding {
            installReceiveMessage(s.rt, origin)
            var st = s.rt.webState
            var binding = st._onReceivedMessageEvent.addHandler(received);
            binding.data = origin;
            return binding;
        }

        function clearReceivedMessageEvent(rt:Runtime) {
            var s = rt.webState
            if (s._onReceivedMessageEvent) {
                if (s.receiveMessage)
                    window.removeEventListener("message", s.receiveMessage, false);
                s._onReceivedMessageEvent = undefined;
                s._messageWaiters = undefined;
            }
        }

        //? Opens an Server-Sent-Events client on the given URL. If not supported, returns invalid. The server must implement CORS to allow https://www.touchdevelop.com to receive messages.
        // [result].writesMutable
        export function create_event_source(url: string, s: IStackFrame): WebEventSource {
            if (!url)
                Util.userError(lf("url cannot be empty"), s.pc);
            if (!!(<any>window).EventSource) {
                var source = new (<any>window).EventSource(url);
                return new WebEventSource(s.rt, source);
            } else {
                // Result to xhr polling :(
                return undefined;
            }
        }

        //? Parses a OAuth v2.0 access token from a redirect uri as described in http://tools.ietf.org/html/rfc6749. Returns invalid if the url does not contain an OAuth token.
        export function oauth_token_from_url(redirect_url : string) : OAuthResponse {
            return OAuthResponse.parse(redirect_url);
        }

        //? Parses a OAuth v2.0 access token from a JSON payload as described in http://tools.ietf.org/html/rfc6749. Returns invalid if the payload is not an OAuth token.
        export function oauth_token_from_json(response: JsonObject): OAuthResponse {
            return OAuthResponse.parseJSON(response);
        }
    }
}
