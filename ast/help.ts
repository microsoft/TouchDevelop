///<reference path='refs.ts'/>

module TDev {
    export interface JsonProgress {
        kind: string;
        userid: string;
        progressid: string;
        //guid?: string;
        index: number;
        completed?: number;
    }

    export interface JsonProgressStep {
        index: number;
        text: string;
        count: number;
        minDuration?: number;
        medDuration?: number;
        medModalDuration?: number;
        medPlayDuration?: number;
    }

    export interface JsonProgressStats {
        kind: string; // progressstats
        publicationId: string;
        count: number;
        steps: JsonProgressStep[];
    }

    export interface JsonCapability
    {
        name: string;
        iconurl: string;
    }

    export interface JsonCanExportApp {
        canExport: boolean;
        reason?: string;
    }

    export interface JsonIdObject
    {
        kind:string;
        id:string; // id
        url:string; // website for human consumption
    }

    export interface JsonPublication extends JsonIdObject
    {
        time:number;// time when publication was created
        userid:string; // user id of user who published
        userscore : number;
        username:string;
        userhaspicture:boolean;
    }

    // lite only
    export interface JsonNotification extends JsonPubOnPub
    {
        notificationkind: string;

        // if publicationkind == 'review', this will hold the script data
        supplementalid: string;
        supplementalkind: string;
        supplementalname: string;
    }

    export interface JsonDocument
    {
        url:string; // website for human consumption
        kind:string;
        name: string;  // document name
        abstract: string; // document description
        mimetype: string; // mimetype of document given by url
        views: number; // approximate number of document views
        thumburl: string;
    }

    export interface JsonArt extends JsonPublication
    {
        name: string;
        description: string;
        // if picture
        pictureurl: string;
        mediumthumburl: string;
        thumburl: string;
        flags: string[];
        // if sound
        wavurl: string;
        aacurl: string;
    }

    export interface JsonUser extends JsonIdObject
    {
        name:string; // user name
        about:string; // user's about-me text
        features:number; // number of features used by that user
        receivedpositivereviews: number; // number of ♥ given to this user's scripts and comments
        activedays: number;
        subscribers:number; // number of users subscribed to this user
        score:number; // overall score of this user
        haspicture:boolean; // whether this use has a picture
    }

    export interface JsonScore {
        points: number;
    }

    export interface JsonReceivedPositiveReviewsScore extends JsonScore {
        scripts : JsonScript[];
    }

    export interface JsonFeature {
        name:string;
        title:string;
        text:string;
        count:number;
    }

    export interface JsonLanguageFeaturesScore extends JsonScore {
        features: JsonFeature[];
    }

    export interface JsonUserScore
    {
        receivedPositiveReviews : JsonReceivedPositiveReviewsScore;
        receivedSubscriptions : JsonScore;
        languageFeatures : JsonLanguageFeaturesScore;
        activeDays : JsonScore;
    }

    export interface JsonGroup extends JsonPublication {
        name: string;
        description: string;
        allowexport: boolean;
        allowappstatistics: boolean;
        isrestricted : boolean;
        pictureid : string;
        comments : number;
        positivereviews : number;
        subscribers: number;
    }

    export interface JsonCode {
        kind: string; // “code”
        time: number; // creation time in seconds since 1970
        expiration: number; // in seconds since 1970
        userid: string; // creator
        username: string;
        userscore: number;
        userhaspicture: boolean;
        verb: string; // “JoinGroup” for group invitation codes
        data: string; // groupid for group invitation codes
    }


    export interface JsonScript extends JsonPublication
    {
        name:string;
        description:string;
        icon:string; // script icon name
        iconbackground:string; // script icon background color in HTML notation
        iconurl: string; // script icon picture url (obsolete)
        iconArtId?: string; // art id for script icon
        splashArtId?: string; // art id for script splash screen
        positivereviews:number; // number of users who added ♥ to this script
        cumulativepositivereviews:number;
        comments:number; // number of discussion threads
        subscribers:number;
        capabilities:JsonCapability[]; // array of capabilities used by this script; each capability has two fields: name, iconurl
        flows:any[]; // ???
        haserrors:boolean; // whether this script has any compilation errors
        rootid:string; // refers to the earliest script along the chain of script bases
        updateid:string; // refers to the latest published successor (along any path) of that script with the same name and from the same user
        updatetime:number;
        ishidden:boolean; // whether the user has indicated that this script should be hidden
        islibrary:boolean; // whether the user has indicated that this script is a reusable library
        installations:number; // an approximation of how many TouchDevelop users have currently installed this script
        runs:number; // an estimate of how often users have run this script
        platforms:string[];
        userplatform?:string[];
        screenshotthumburl:string;
        screenshoturl:string;
        mergeids:string[];
    }

    export interface JsonHistoryItem
    {
       kind: string; // InstalledScriptHistory
       time: number; // seconds since 1970; indicates when code was backed up
       historyid: string; // identifier of this item
       scriptstatus: string; // “published”, “unpublished”
       scriptname: string; // script name, mined from the script code
       scriptdescription: string; // script description, mined from the script code
       scriptid: string; // publication id if scriptstatus==”published”
       isactive: boolean; // whether this history item is the currently active backup

       entryNo?: number; // assigned when the thing is displayed
    }

    export function getScriptHeartCount(j:JsonScript)
    {
        if (!j) return -1;
        if (j.updateid && j.updateid == j.id) return j.cumulativepositivereviews;
        else return j.positivereviews || 0;
    }

    export interface JsonPubOnPub extends JsonPublication
    {
        publicationid:string; // script id that is being commented on
        publicationname:string; // script name
        publicationkind:string; //
    }


    export interface JsonComment extends JsonPubOnPub
    {
        text:string; // comment text
        nestinglevel:number; // 0 or 1
        positivereviews:number; // number of users who added ♥ to this comment
        comments:number; // number of nested replies available for this comment
        assignedtoid?: string;
        resolved?: string;
    }

    export interface JsonReview extends JsonPubOnPub
    {
        ispositive: boolean;
    }

    export interface JsonRelease extends JsonPublication
    {
        releaseid:string;
        labels:JsonReleaseLabel[];
    }

    export interface JsonReleaseLabel
    {
        name: string;
        userid: string;
        time: number;
        releaseid: string;
    }

    export interface JsonEtag
    {
        id:string;
        kind:string;
        ETag:string;
    }

    export interface JsonList
    {
        items:JsonIdObject[];
        etags:JsonEtag[];
        continuation:string;
    }

    export interface JsonTag extends JsonIdObject
    {
        time:number;
        name:string;
        category:string;
        description:string;
        instances:number;
        topscreenshotids:string[];
    }

    export interface JsonScreenShot extends JsonPubOnPub
    {
        pictureurl:string; // screenshot picture url
        thumburl:string; // screenshot picture thumb url
    }

    export interface JsonVideoSource {
        // poster to display the video
        poster?: string;
        // locale of this video source
        srclang: string;
        // video url
        src: string;
        // video mime type
        type: string;
    }

    export interface JsonVideoTrack {
        // local of this track
        srclang: string;
        // url of the track
        src: string;
        // kind, by default subtitles
        kind?: string;
        // label shown to user
        label?: string;
    }

    // information to create a localized video with cc
    export interface JsonVideo {
        // poster to display the video
        poster: string;
        // closed caption tracks
        tracks?: JsonVideoTrack[];
        // localized video streams
        sources: JsonVideoSource[];
    }

    export class MdComments
    {
        public userid:string;
        public scriptid:string;
        public showCopy = true;
        public useSVG = true;
        public useExternalLinks = false;
        public allowLinks = true;
        public allowImages = true;
        public allowVideos = true;
        public designTime = false;
        private currComment:AST.Comment;

        constructor(public renderer:Renderer = null, private libName:string = null)
        {
        }

        public topicLink(id:string)
        {
            return (this.useExternalLinks ? "https://www.touchdevelop.com/docs/" : "#topic:") + MdComments.shrink(id);
        }

        public appLink(id:string)
        {
            return (this.useExternalLinks ? "https://www.touchdevelop.com/app/" : "") + id
        }

        static shrink(s:string)
        {
            return s ? s.replace(/[^A-Za-z0-9]/g, "").toLowerCase() : "";
        }

        static error(msg:string)
        {
            return "<span class='md-error'>" + Util.htmlEscape(msg) + " </span>";
        }

        static proxyVideos(v: JsonVideo) {
            v.poster = HTML.proxyResource(v.poster);
            v.sources.forEach(s => {
                s.poster = HTML.proxyResource(s.poster);
                s.src = HTML.proxyResource(s.src);
            })
            v.tracks.forEach(t => {
                t.src = HTML.proxyResource(t.src);
            })
        }

        static attachVideoHandlers(e: HTMLElement, autoPlay: boolean): void {
            if (!Browser.directionAuto) {
                Util.toArray(e.getElementsByClassName('md-tutorial')).forEach((v: HTMLElement) => dirAuto(v));
                Util.toArray(e.getElementsByClassName('md-box-avatar-body')).forEach((v: HTMLElement) => dirAuto(v));
            }
            Util.toArray(e.getElementsByClassName('md-video-link')).forEach((v: HTMLElement) => {
                var ytid = v.getAttribute("data-youtubeid");
                if (ytid)
                    v.withClick(() => {
                        v.innerHTML = Util.fmt("<div class='md-video-wrapper'><iframe src='//www.youtube-nocookie.com/embed/{0:uri}?modestbranding=1&autoplay=1&autohide=1&origin=https://www.touchdevelop.com' frameborder='0' allowfullscreen=''></iframe></div>", ytid);
                    });
                else if (v.hasAttribute("data-video")) {
                    var lang = Util.getTranslationLanguage();
                    var jsvideo = <JsonVideo>JSON.parse(decodeURIComponent(v.getAttribute("data-video")));
                    if (!jsvideo) {
                        v.setChildren(div('', lf(":( invalid in video information")));
                        return;
                    }
                    // proxy all video resources
                    MdComments.proxyVideos(jsvideo);

                    var jssource = MdComments.findBestSource(jsvideo.sources);
                    if (!jssource) {
                        v.setChildren(div('', lf(":( could not find any video source")));
                        return;
                    }
                    var video = <HTMLVideoElement>createElement("video");
                    (<any>video).crossOrigin = "anonymous";
                    video.width = 300;
                    video.height = 150;
                    video.controls = true;
                    video.autoplay = autoPlay; // option?
                    video.poster = jssource.poster || jsvideo.poster;
                    var source = <HTMLSourceElement>createElement("source");
                    source.src = jssource.src;
                    source.type = jssource.type;
                    video.appendChild(source);
                    if (jsvideo.tracks && jsvideo.tracks.length > 0) {
                        Util.log('loading tracks');
                        // dynamic tracks?
                        if (!Browser.videoTracks) {
                            var jstrack = MdComments.findBestTrack(jsvideo.tracks);
                            Util.log('best track: ' + jstrack.label);
                            Util.httpGetTextAsync(jstrack.src)
                                .done(wtt => {
                                    var cues = HTML.parseWtt(wtt);
                                    Util.log('found {0} cues', cues.length);
                                    if (cues.length > 0) {
                                        if (video.addTextTrack) {
                                            var track = video.addTextTrack(jstrack.kind || "subtitles", jstrack.label || jstrack.srclang, jstrack.srclang);
                                            cues.forEach(cue => track.addCue((<any>TextTrackCue)(cue.startTime, cue.endTime, cue.message)));
                                            track.mode = track.SHOWING;
                                        }
                                        else {
                                            var caption = <HTMLSpanElement>document.createElement('span');
                                            caption.className = 'videoCaption';
                                            var lastCue = undefined;
                                            video.ontimeupdate = ev => {
                                                var t = video.currentTime;
                                                // shortcut
                                                if (lastCue && lastCue.startTime <= t && t <= lastCue.endTime) return;
                                                lastCue = undefined;
                                                var i = 0;
                                                while (i < cues.length) {
                                                    if (cues[i].startTime <= t && t <= cues[i].endTime) {
                                                        lastCue = cues[i];
                                                        break;
                                                    }
                                                    if (cues[i].endTime > t) break;
                                                    i++;
                                                }
                                                if (lastCue) {
                                                    caption.innerText = lastCue.message;
                                                    caption.style.opacity = "1.0";
                                                }
                                                else {
                                                    caption.style.opacity = "0.0";
                                                }
                                            };
                                            v.classList.add('videoOuter');
                                            v.setChildren([video, caption]);
                                        }
                                    }
                                }, e => {
                                    // silently fail
                                    Util.log('wtt: failed to load caption: ' + ((<any>e).message || ""));
                                });
                            } else {
                                video.appendChildren(jsvideo.tracks.map((jstrack, i) => {
                                    var track = <HTMLTrackElement>createElement("track");
                                    if (i == 0) track.default = true;
                                    track.src = jstrack.src;
                                    track.kind = jstrack.kind || "subtitles";
                                    if (jstrack.srclang)
                                        track.srclang = jstrack.srclang;
                                    track.label = jstrack.label || jstrack.srclang;
                                    return track
                                }));
                            }
                        }
                        v.setChildren(video);
                } else if (v.hasAttribute("data-videosrc")) {
                    var vtid = v.getAttribute("data-videosrc");
                    var pid = v.getAttribute("data-videoposter");
                    v.withClick(() => {
                        var video = <HTMLVideoElement>createElement("video");
                        (<any>video).crossOrigin = "anonymous";
                        video.width = 300;
                        video.height = 150;
                        video.controls = true;
                        video.autoplay = true;
                        video.src = decodeURI(vtid);
                        video.poster = decodeURI(pid);
                        v.setChildren(video);
                        v.withClick(() => { });
                    });
                }
            });
        }

        static findBestSource(sources: JsonVideoSource[]): JsonVideoSource {
            if (!sources) return undefined;

            var lang = Util.getTranslationLanguage() || "en";
            var video: JsonVideoSource = sources.filter(t => t.srclang == lang)[0];
            if (video) return video;
            lang = lang.substr(0, 2);
            video = sources.filter(t => t.srclang == lang)[0];
            if (video) return video;

            // bail out
            return sources[0];
        }

        static findBestTrack(tracks: JsonVideoTrack[]): JsonVideoTrack {
            if (!tracks) return undefined;

            var lang = Util.getTranslationLanguage() || "en";
            var track: JsonVideoTrack = tracks.filter(t => t.srclang == lang)[0];
            if (track) return track;
            lang = lang.substr(0, 2);
            track = tracks.filter(t => t.srclang == lang)[0];
            if (track) return track;
            return tracks[0];
        }

        private apiList(arg:string)
        {
            var prefix = ""
            var m = /^([^:]*):(.*)/.exec(arg)
            if (m) {
                prefix = m[1]
                arg = m[2]
            }
            var res = ""
            arg.split(/,/).forEach((t) => {
                if (/^\s*$/.test(t)) return;
                var id = prefix + "_" + t;
                var topic = HelpTopic.findById(id)
                if (!topic)
                    res += MdComments.error("no such topic: " + id)
                else if (topic.isPropertyHelp())
                    res += topic.renderLink(this, true);
                else {
                    var st = topic.getSubTopics();
                    if (st.length > 0) {
                        res += st.map((t) => t.renderLink(this, true)).join("");
                    } else {
                        res += MdComments.error(id + " is neither property nor type");
                    }
                }
            })
            return res;
        }

        static findArtStringResource(app : TDev.AST.App, id: string): string {
            var artVar = app ? app.resources().filter((r) => MdComments.shrink(r.getName()) == MdComments.shrink(id))[0] : null;
            if (artVar && artVar.url) {
                return TDev.RT.String_.valueFromArtUrl(artVar.url);
            }
            return undefined;
        }

        static findArtId(id : string) : string {
            var artVar = Script ? Script.resources().filter((r) => MdComments.shrink(r.getName()) == MdComments.shrink(id))[0] : null;
            var artPref = "https://az31353.vo.msecnd.net/pub/"
            if (artVar && artVar.url && artVar.url.slice(0, artPref.length) == artPref) {
                var newId = artVar.url.slice(artPref.length)
                if (/^\w+$/.test(newId)) id = newId;
            }
            return id;
        }

        private defaultRepl(macro:string, arg:string) : string
        {
            if (macro == "var") {
                switch (arg) {
                    case "userid": return this.userid || Cloud.getUserId();
                    case "apihelp":
                        return MdComments.error("var:apihelp no longer supported");
                    default: return MdComments.error("unknown variable " + arg);
                }
            } else if (macro == "pic") {
                var m = /^((https:\/\/[^:]+)|([\w ]+))(:(\d+)x(\d+))?(:.*)?/i.exec(arg);
                if (m) {
                    var url = m[2];
                    var artId = m[3];
                    var width = parseFloat(m[4] || "12");
                    var height = parseFloat(m[5] || "12");
                    if (width > 30) {
                        height = 30 / width * height;
                        width = 30;
                    }
                    if (height > 20) {
                        width = 20 / height * width;
                        height = 20;
                    }
                    var caption = m[6];
                    if (artId && !url) {
                        artId = MdComments.findArtId(artId);
                        url = Util.fmt("https://az31353.vo.msecnd.net/pub/{0:uri}", artId);
                    }
                    var urlsafe = HTML.proxyResource(url);
                    if (urlsafe == url) urlsafe = Util.fmt("{0:url}", url);
                    var r = "<div class='md-img'><div class='md-img-inner'>";
                    r += Util.fmt("<img src=\"{0}\" alt='picture' style='height:{1}em'/></div>", urlsafe, height);
                    if (caption) {
                        r += "<div class='md-caption'>" + this.formatText(caption.slice(1)) + "</div>";
                    }
                    r += "</div>";
                    return r;
                } else {
                    m = /^(:(\d+)x(\d+))?(:.*)?/.exec(arg);
                    if (m) {
                        
                    } else
                        return MdComments.error(lf("invalid picture id"));
                }
            } else if (macro == "pici") {
                var artId = MdComments.findArtId(arg);
                var r = Util.fmt("<img class='md-img-inline' src='{0}' alt='picture' />", HTML.proxyResource(Util.fmt("https://az31353.vo.msecnd.net/pub/{0:uri}", artId)));
                return r;
            } else if (macro == "decl") {
                var decl = Script ? Script.things.filter((t) => t.getName() == arg)[0] : null;
                if (this.currComment && this.currComment.mdDecl)
                    decl = this.currComment.mdDecl;
                if (!decl) return MdComments.error("no such decl " + arg);
                return this.mkDeclSnippet(decl);
            } else if (macro == "imports") {
                if (!Script) return MdComments.error(lf("import can only be used from a script context"));
                var r = "";
                [
                 {name:'npm', url:'https://www.npmjs.com/package/{0:q}', pkgs:Script.npmModules},
                 {name:'pip', url:'https://pypi.python.org/pypi/{0:q}/', pkgs:Script.pipPackages},
                 {name:'cordova', url:'http://plugins.cordova.io/#/package/{0:q}/', pkgs:Script.cordovaPlugins},
                 {name:'touchdevelop', url:'#pub:{0:q}', pkgs:Script.touchDevelopPlugins}
                ].forEach(imports => {
                    var keys = Object.keys(imports.pkgs);
                    if (keys.length > 0) {
                        keys.forEach(key => {
                            var url = Util.fmt(imports.url, key);
                            var ver = imports.pkgs[key];
                            r += Util.fmt("<li>{3}: <a target='blank' href='{1}'>{0:q}{2}</a></li>\n", key, url, ver ? " " + ver : "", imports.name);
                        });
                    }
                });
                if (!r) return this.designTime ? "{imports}" : "";
                else return "<h3>" + lf("imports") + "</h3><ul>" + r + "</ul>";
            } else if (macro == "stlaunch") {
                if (!this.scriptid) return "";
                return "<h2>" + lf("follow tutorial online") + "</h2><div class='md-box-print print-big'>" + lf("Follow this tutorial online at <b>http://tdev.ly/{0:q}</b>", this.scriptid) + ".</div>";
            } else if (macro == "stcmd") {
                var mrun = /^run(:(.*))?/.exec(arg)
                if (mrun)
                    return Util.fmt("<b>Run your program: {0:q}</b>", mrun[2] || "");
                return Util.fmt("<b>tutorial command: {0:q}</b>", arg)
            } else if (macro == "adddecl") {
                return this.designTime ? Util.fmt("<b>Add the declaration:</b>") : ""
            } else if (macro == "stcode") {
                return "<b>(code of the step)</b>";
            } else if (macro == "internalstepid") {
                return Util.fmt("<h1 class='stepid'>{0:q}</h1>", arg)
            } else if (macro == "follow") {
                return Util.fmt("<!-- FOLLOW --><a href=\"{0:q}\">{1:q}</a>",
                    this.appLink("#hub:follow-tile:" + MdComments.shrink(arg)),
                    arg)
            } else if (macro == "topictile") {
                return Util.fmt("<!-- FOLLOW --><a href=\"{0:q}\">{1:q}</a>",
                    this.appLink("#topic-tile:" + MdComments.shrink(arg)),
                    arg)
            } else if (macro == "pub") {
                var args = arg.split(':');
                if (args.length != 2)
                    return MdComments.error(lf("missing publication title: {pub:id:title}"));
                return Util.fmt("<!-- FOLLOW --><a href=\"{0:q}\">{1:q}</a>",
                    this.appLink("#pub:" + MdComments.shrink(args[0])),
                    args[1])
            } else if (macro == "hide" || macro == "priority" || macro == "template" || macro == "highlight" ||
                macro == 'box' || macro == "code" || macro == "widgets" || macro == "templatename" || macro == "hints" ||
                macro == "parenttopic" || macro == "docflags" || macro == "stprecise" || macro == "flags" || macro == "action" ||
                macro == "stvalidator" || macro == "stnoprofile" || macro == "stauto" || macro == "sthints" ||
                macro == "stcode" || macro == "storder" || macro == "stdelete" || macro == "stcheckpoint" || macro == "sthashtags" ||
                macro == "stnocheers" || macro == "steditormode" || macro == "stnexttutorials" || macro == "stmoretutorials" ||
                macro == "translations" || macro == "stpixeltracking" || macro == "steventhubstracking"
                ) {
                if (this.designTime)
                    return "{" + macro + (arg ? ":" + Util.htmlEscape(arg) : "") + "}";
                else return "";
            } else if (macro == "api") {
                return this.apiList(arg);
            } else if (macro == "youtube") {
                if (!this.allowVideos) return "";
                if (!arg)
                    return MdComments.error("youtube: missing video id");
                else {
                    return Util.fmt("<div class='md-video-link' data-youtubeid='{0:uri}'>{1}</div>",
                        arg,
                        SVG.getVideoPlay(Util.fmt('https://img.youtube.com/vi/{0:q}/mqdefault.jpg', arg))
                        );
                }
            } else if (macro == "channel9") {
                if (!this.allowVideos) return "";
                if (!arg)
                    return MdComments.error("channel9: missing MP4 url");
                var video = arg.replace(/^http:\/\/video/, 'https://sec');
                var poster = video.replace(/\.mp4$/, '_512.jpg');
                return Util.fmt("<div class='md-video-link' data-videoposter='{0:url}' data-videosrc='{1:url}'>{2}</div>",
                    poster,
                    video,
                    SVG.getVideoPlay(poster))
            } else if (macro == "video") {
                if (!this.allowVideos) return "";
                if (!arg)
                    return MdComments.error("video: missing video preview and url");
                var res = MdComments.findArtStringResource(Script, arg);
                if (res) return MdComments.expandJsonVideo(res);

                var urls = arg.split(',');
                if (urls.length != 2)
                    return MdComments.error("video: must have <preview url>,<mp4 url> arguments");
                else {
                  return Util.fmt("<div class='md-video-link' data-videoposter='{0:url}' data-videosrc='{1:url}'>{2}</div>",
                        urls[0],
                        urls[1],
                        SVG.getVideoPlay(urls[0]))
                }
            } else if (macro == "cap") {
                if (!arg)
                    return MdComments.error("cap: requires a comma separated list of required capabilities");
                var required = AST.App.fromCapabilityList(arg.split(/,/));
                var current = PlatformCapabilityManager.current();
                var missing = required & ~current;
                if (!missing)
                    return "";
                else
                    return "<div class='md-tutorial md-warning'>" +
                        "<strong>This code might not work on your current device</strong>: missing " + AST.App.capabilityName(missing) + " capabilities." +
                        "</div>";
            } else if (macro == "webonly") {
                if (this.designTime)
                    return MdComments.error("{webonly} macro doesn't do anything anymore")
                else
                    return "";
            } else if (macro == "bigbutton") {
                if (!arg) return MdComments.error("bigbutton: requires <text>,<url> arguments");
                var ms = arg.split(',');
                if (ms.length != 2) return MdComments.error(lf("bigbutton: must have <text>,<url> arguments"));
                return Util.fmt("<a class='md-bigbutton' target='_blank'  rel='nofollow' href='{0:url}'>{1:q}</a>", ms[1], ms[0]);
            } else {
                return null;
            }
        }

        static expandJsonVideo(res: string) {
            var video : JsonVideo;
            try { video = <JsonVideo>JSON.parse(res); } catch (e) {}
            if (!video) return MdComments.error("video: missing data");
            var source = MdComments.findBestSource(video.sources);
            if (!source) return MdComments.error('videoset: missing sources');
            var poster = source.poster || video.poster;
            if (!poster) return MdComments.error('video: missing poster');

            // encode all stream for later use
            return Util.fmt("<div class='md-video-link' data-video='{0:uri}'>{1}</div>",
                JSON.stringify(video),
                SVG.getVideoPlay(poster))
        }

        private expandInline(s:string, allowStyle = false, allowRepl = true):string
        {
            var inp = s;
            var outp = "";

            var applySpan = (rx:RegExp, repl:(m:RegExpExecArray)=>string) =>
            {
                var m = rx.exec(inp);
                if (m) {
                    inp = inp.slice(m[0].length);
                    outp += repl(m);
                    return true;
                }
                return false;
            }

            var replace = (tag:string) => {
                return (m:RegExpExecArray) => "<" + tag + ">" + this.expandInline(m[1]) + "</" + tag + ">";
            }

            var getReplCode = (m:RegExpExecArray) => {
                var s = m[2]
                if (m[1].length == 1) {
                    s = s.replace(/->/g, "\u2192");
                    s = s.replace(/(^|\s)(\w+)\u2192/, (m, pr, w) => {
                        switch (w) {
                            case "code": return pr + "\u25b7";
                            case "data": return pr + "\u25f3";
                            case "art": return pr + "\u273f";
                            case "libs": return pr + AST.libSymbol;
                            case "records": return pr + AST.recordSymbol;
                            default: return m;
                        }
                    });
                }
                var inner = this.expandInline(s, false, false)
                // ensure symbols render properly
                inner = inner.replace(/[\u25b7\u25f3\u273f\u267B\u2339]/, '<span class="symbol">$&</span>');
                return inner
            }

            var replCode = (m:RegExpExecArray) => {
                var inner = getReplCode(m)

                if (this.allowLinks && m[1].length == 1)
                    inner = inner.replace(/(^|[\s\(,])([\u2192\w ]+)($|[\s\(,])/g, (all, before, topic, after) => {
                        if (HelpTopic.findById(topic))
                            return before + "<a class='md-code-link' href='" + this.topicLink(topic) + "'>" + topic + "</a>" + after;
                        else
                            return all;
                    })
                return "<code class=notranslate translate=no dir=ltr>" + inner + "</code>";
            }

            var replUI = (m:RegExpExecArray) => {
                var inner = getReplCode(m)
                return "<code class='md-ui' translate=no dir=ltr>" + inner + "</code>";
            }

            var quote = Util.htmlEscape;

            while (inp) {
                if (allowRepl &&
                    applySpan(/^\{(\w+)(:([^{}]*))?\}/, (m) => {
                        if (!this.allowImages) return "";
                        var res = this.defaultRepl(m[1].toLowerCase(), m[3])
                        if (res == null) return MdComments.error("unknown macro '" + m[1] + "'")
                        else return res;
                    }))
                    continue;

                if (applySpan(/^\&(\w+|#\d+);/, (m) => m[0]) ||
                    applySpan(/^([<>&])/, (m) => Util.htmlEscape(m[1])) ||
                    applySpan(/^\t/, (m) => MdComments.error("<tab>")) ||
                    false)
                    continue;

                if (allowStyle && (
                    applySpan(/^(``)(.+?)``/, replCode) ||
                    applySpan(/^(``)\[(.+?)\]``/, replUI) ||
                    applySpan(/^(`)\[(.+?)\]`/, replUI) ||
                    applySpan(/^(`)([^\n`]+)`/, replCode) ||
                    applySpan(/^\*\*(.+?)\*\*/, replace("strong")) ||
                    applySpan(/^\*([^\n\*]+)\*/, replace("em")) ||
                    applySpan(/^__(.+?)__/, replace("strong")) ||
                    applySpan(/^_([^\n_]+)_/, replace("em")) ||
                    (this.allowLinks && applySpan(/^(http|https|ftp):\/\/[^\s]*/gi, (m) => {
                        var str = m[0];
                        var suff = ""
                        var mm = /(.*?)([,\.;:\)]+)$/.exec(str);
                        if (mm) {
                            str = mm[1]
                            suff = mm[2];
                        }
                        str = this.expandInline(str);
                        str = str.replace(/"/g, "&quot;");
                        return "<a href=\"" + quote(str) + "\" target='_blank' rel='nofollow'>" + str + "</a>" + suff;
                    })) ||
                    false))
                    continue;

                var tdev = "https://www.touchdevelop.com/";
                if (allowRepl && (
                    applySpan(/^\{\#(\w+)\}/g, (m) => "<a name='" + quote(m[1]) + "'></a>") ||
                    applySpan(/^\[([^\[\]]*)\]\s*\(([^ \(\)\s]+)\)/, (m) => {
                        var name = m[1];
                        var href = m[2];
                        var acls = '';
                        var additions = ""
                        if (!name) name = href.replace(/^\//, "");
                        if (/^\/\w+(->\w+)?(#\w+)?$/.test(href))
                            href = this.topicLink(href.slice(1));
                        else if (/^\/script:\w+$/.test(href)) {
                            acls = 'md-link';
                            href = (this.useExternalLinks ? "http://tdev.ly/" + href.slice(8) : "#" + href.slice(1));
                        }
                        else if (/^#[\w\-]+:[\w,\-:]*$/.test(href))
                            href = (this.useExternalLinks ? tdev + "/app/#" : "#") + href.slice(1);
                        else if (/^#[\w\-]+$/.test(href))
                            href = (this.useExternalLinks ? "#" : "#goto:") + href.slice(1);
                        else if (/^(http|https|ftp):\/\//.test(href) || /^mailto:/.test(href)) {
                            href = href; // OK
                            acls = "md-link md-external-link";
                            additions = " rel=\"nofollow\" target=\"_blank\"";
                            if (!this.useExternalLinks && this.allowLinks)
                                name += " \u2197";
                        }
                        else
                            return MdComments.error("invalid link '" + href + "'");
                        if (this.allowLinks)
                            return "<a class=\"" + acls + "\" href=\"" + quote(href) + "\"" + additions + ">" + quote(name) + "</a>";
                        else
                            return quote(name);
                    }) ||
                    false))
                    continue;

                if (applySpan(/^(\s+)/, (m) => m[0]) ||
                    applySpan(/^(\w+\s*|.)/, (m) => m[0]))
                    continue;
            }

            return outp;
        }

        public formatInline(s: string)
        {
            var prev = this.allowLinks;
            var prevI = this.allowImages;
            var prevV = this.allowVideos;
            this.allowLinks = false;
            this.allowImages = false;
            this.allowVideos = false;
            try {
                return this.expandInline(s, true, true);
            } finally {
                this.allowLinks = prev;
                this.allowImages = prevI;
                this.allowVideos = prevV;
            }
        }

        public formatTextNoLinks(s: string)
        {
            var prev = this.allowLinks;
            this.allowLinks = false;
            try {
                return this.formatText(s)
            } finally {
                this.allowLinks = prev;
            }
        }

        public formatText(s: string, comment:AST.Comment = null)
        {
            if (!s) return s;

            this.init();

            var start = "";
            var final = "";

            var wrap = (tag:string, end = "") => {
                if (!end) end = "/" + tag;
                return (m, s) => {
                    if (start != "") return m;
                    start = "<" + tag + ">";
                    final = "<" + end + ">";
                    return s;
                }
            }

            if (/^    /.test(s)) {
                return "<pre>" + Util.htmlEscape(s.slice(4)) + "</pre>";
            }

            s = s.replace(/^#\s+(.*)/, wrap("h1"));
            s = s.replace(/^##\s+(.*)/, wrap("h2"));
            s = s.replace(/^###\s+(.*)/, wrap("h3"));
            s = s.replace(/^####\s+(.*)/, wrap("h4"));
            s = s.replace(/^>\s+(.*)/, wrap("blockquote"));

            s = s.replace(/^[-+*]\s+(.*)/, wrap("ul><li", "/li></ul"));
            s = s.replace(/^\d+\.\s+(.*)/, wrap("ol><li", "/li></ol"));

            wrap("div class='md-para'", "/div")("", "");

            var prevComment = this.currComment;
            try {
                this.currComment = comment;
                return start + this.expandInline(s, true, true) + final
            } finally {
                this.currComment = prevComment;
            }
        }

        private mkCopyButton(tp:string, dt:string)
        {
            var r = Util.fmt("<button class='{0} copy-button' data-type='{1:q}' data-data='{2:q}'>",
                             this.useSVG ? "code-button" : "wall-button", tp, dt);
            if (!this.useSVG)
                r += "copy";
            else
                r += Util.fmt('<div class="code-button-frame">{0}</div>', SVG.getIconSVGCore("copy,black"));

            r += "</button>";
            return r;
        }

        private depthLimit = 0;

        public mkDeclSnippet(decl:AST.Decl, formatComments = false, cls = 'md-snippet', addDepth = 0)
        {
            if (this.depthLimit < 0 || !this.renderer) return "<div class='md-message'>[" + Util.htmlEscape(decl.getName()) + " goes here]</div>";

            var r = "<div class=notranslate translate=no dir=ltr><div class='" + cls + "'>";
            var prev = this.renderer.formatComments;
            var prevMd = this.renderer.mdComments
            try {
                this.depthLimit += addDepth - 1;
                this.renderer.mdComments = this;
                this.renderer.formatComments = formatComments;
                r += this.renderer.renderDecl(decl);
            } finally {
                this.depthLimit -= addDepth - 1;
                this.renderer.formatComments = prev;
                this.renderer.mdComments = prevMd;
            }
            if (this.showCopy && !formatComments)
                r += this.mkCopyButton("decls", decl.serialize());
            r += "</div></div>";
            return r;
        }

        private mkSnippet(stmts:AST.Stmt[])
        {
            if (!this.renderer) return "<div class='md-message'>[inline snippet goes here]</div>";

            var r = "<div class=notranslate translate=no dir=ltr><div class='md-snippet'>";
            r += this.renderer.renderSnippet(stmts);
            if (this.showCopy) {
                var block = new AST.Block();
                block.stmts = stmts; // don't use setChildren(), that would override the parent
                var d = block.serialize()
                // OK, this is a hack...
                if (this.libName)
                    d = d.replace(/code\u2192/g, '@\\u267b ->' + AST.Lexer.quoteId(this.libName) + '->');
                r += this.mkCopyButton("block", d);
            }
            r += "</div></div>";
            return r;
        }

        private init()
        {
            if (!this.renderer) return;
            if (this.libName) {
                this.renderer.codeReplacement = '<span class="id symbol">' + AST.libSymbol + '</span>\u200A' + this.libName + '\u200A';
                if (this.showCopy)
                    this.renderer.codeReplacement += '\u2192\u00A0';
            } else {
                this.renderer.codeReplacement = null;
            }
        }

        public extract(a:AST.Action)
        {
            return this.extractStmts(a.body.stmts)
        }

        public extractStmts(stmts:AST.Stmt[])
        {
            function isEmptyComment(s:AST.Stmt)
            {
                return s instanceof AST.Comment && !(<AST.Comment>s).text;
            }

            this.init();

            var output = "";
            var currBox = null;

            for (var i = 0; i < stmts.length; ) {
                if (stmts[i] instanceof AST.Comment) {
                    var cmt = <AST.Comment>stmts[i]
                } else {
                    cmt = null;
                }

                if (cmt) {
                    var m = /^\s*\{hide(:[^{}]*)?\}\s*$/.exec(cmt.text);
                    if (m) {
                        if (m[1]) output += this.formatText(m[1]);
                        var j = i + 1;
                        while (j < stmts.length) {
                            if (stmts[j] instanceof AST.Comment &&
                                /^\s*\{\/hide\}\s*$/.test((<AST.Comment>stmts[j]).text)) {
                                j++;
                                break;
                            }
                            j++;
                        }
                        i = j;
                    } else if (i == 0 && cmt.text == '{var:apihelp}') {
                        i++;
                    } else if ((m = /^\s*(\{code}|````)\s*$/.exec(cmt.text)) != null) {
                        var j = i + 1;
                        var seenStmt = false;
                        while (j < stmts.length) {
                            if ((stmts[j] instanceof AST.Comment) &&
                                /^\s*(\{\/code}|````)\s*$/.test((<AST.Comment>stmts[j]).text))
                                break;
                            j++;
                        }
                        output += this.mkSnippet(stmts.slice(i + 1, j));
                        i = j + 1;
                    } else if ((m = /^\s*\{box:([^{}]*)\}\s*$/.exec(cmt.text)) != null) {
                        if (currBox) output += "</div>";
                        var parts = m[1].split(':');
                        var boxClass = parts[0];
                        var boxDir = "";
                        var boxHd = "";
                        var boxFt = "";
                        var boxCss = "md-box";
                        switch (boxClass) {
                            case "hint":
                                boxHd = "<div class='md-box-header'>" + lf("hint") + "</div>";
                                break;
                            case "exercise":
                                boxHd = "<div class='md-box-header'>" + lf("exercise") + "</div>";
                                break;
                            case "example":
                                boxHd = "<div class='md-box-header'>" + lf("example") + "</div>";
                                break;
                            case "nointernet":
                                boxHd = "<div class='md-box-header'>" + lf("no internet?") + "</div>";
                                break;
                            case "portrait":
                                boxHd = "<div class='md-box-header-print'>" + lf("device in portrait") +"</div>";
                                boxCss = "";
                                break;
                            case "landscape":
                                boxHd = "<div class='md-box-header-print'>" + lf("device in landscape") + "</div>";
                                boxCss = "";
                                break;
                            case "print":
                            case "screen":
                            case "block":
                                boxHd = "";
                                boxCss = "";
                                break;
                            case "avatar":
                                var artId = MdComments.findArtId(parts[1]);
                                boxHd = Util.fmt("<img class='md-box-avatar-img' src='{0}' /><div class='md-box-avatar-body' dir='auto'>", HTML.proxyResource(Util.fmt("https://az31353.vo.msecnd.net/pub/{0:uri}", artId)));
                                boxFt = '</div>';
                                boxCss = '';
                                boxClass = 'avatar';
                                boxDir = "dir='ltr'";
                                break;
                            default:
                                boxHd = MdComments.error("no such box type " + m[1] + ", use hint, exercise, example or nointernet")
                                boxClass = 'hint'
                                break;
                        }
                        currBox = boxClass;
                        output += Util.fmt("<div class='{0} md-box-{1}' {2}>{3}", boxCss, boxClass, boxDir, boxHd)
                        i++;
                    } else if (/^\s*\{\/box(:[^{}]*)?\}\s*$/.test(cmt.text)) {
                        if (currBox) {
                            output += boxFt + "</div>";
                            currBox = null;
                        } else {
                            output += MdComments.error("no box to close")
                        }
                        i++;
                    } else {
                        output += this.formatText(cmt.text);
                        i++;
                    }
                } else {
                    var j = i;
                    while (j < stmts.length) {
                        if (stmts[j] instanceof AST.Comment) break;
                        j++;
                    }
                    output += this.mkSnippet(stmts.slice(i, j));
                    i = j;
                }
            }

            if (currBox) output += "</div>";

            var fixMultiline = (s:string) => {
                s = s.replace(/(<\/ul><ul>|<\/ol><ol>|<\/pre><pre>|<\/div><!-- HL --><div class='code-highlight'>)/g, "");
                s = s.replace(/<ul><li><!-- FOLLOW -->/g, "<ul class='tutorial-list'><li>")
                return s;
            }

            output = fixMultiline(output);
            return "<div class='md-tutorial' dir='auto'>" + output + "</div>";
        }

        static splitDivs(tut:string)
        {
            var splits:string[] = []
            var leftovers = tut.replace(/([^<]+|<[^<>]+>)/g, (m, g) => {
                splits.push(g)
                return ""
            })
            Util.assert(!leftovers, "should be nothing left: " + leftovers)
            if (/<div.*md-tutorial.*>/.test(splits[0]) &&
                /<\/div>/.test(splits.peek())) {
                splits.shift()
                splits.pop()
            }

            var stack:string[] = []
            var output:string[] = []
            var curr = ""

            var norm = (s:string) => s.toLowerCase().replace(/\s*/g, "")

            splits.forEach(s => {
                curr += s
                if (norm(s) == stack.peek())
                    stack.pop()
                else {
                    var m = /<([a-z0-9\-]+)(\s|>)/i.exec(s)
                    if (m && /^(div|p|ul|ol|h[1-9]|blockquote)$/i.test(m[1]))
                        stack.push(norm("</" + m[1] + ">"))
                }

                if (stack.length == 0) {
                    output.push(curr)
                    curr = ""
                }
            })

            if (curr) output.push(curr)

            return output
        }
    }

    export interface HelpTopicJson
    {
        name: string;
        id: string;
        rootid: string;
        description: string;
        icon:string;
        iconbackground:string;
        iconArtId?:string;
        time?:number;
        userid?:string;
        text: string;
        priority:number;
        platforms?:string[];
        parentTopic?:string;
        screenshot?:string;
    }

    export interface HelpTopicInfoJson {
        title: string;
        description: string;
        body: string[];
        translations?: StringMap<string>; // locale -> script id
        manual?: boolean;
    }

    export class HelpTopic
    {
        private searchCache:string;
        public app:AST.App;
        private apiKind:Kind;
        private apiProperty:IProperty;
        private subTopics:StringMap<HelpTopic>;
        private initPromise:Promise;
        public id:string;
        public fromJson:JsonScript;
        public isBuiltIn = false;
        public isTutorial(): boolean {
            return this.hashTags()
                && /#(stepbystep|hourofcode)\b/i.test(this.allHashTags)
                && !/template|notes/i.test(this.json.name);
        }
        public isHourOfCode(): boolean {
            return this.hashTags() && /#HourOfCode\b/i.test(this.allHashTags);
        }
        private translatedTopic: HelpTopicInfoJson;

        public nestingLevel:number;
        public parentTopic:HelpTopic = null;
        public childTopics:HelpTopic[] = [];

        static contextTopics:HelpTopic[] = [];
        static shippedScripts:any;
        static scriptTemplates:any[];

        static getScriptAsync:(id:string)=>Promise;

        static _topics:HelpTopic[] = [];
        static _initalized = false;

        constructor(public json:HelpTopicJson)
        {
            this.id = MdComments.shrink(this.json.name);
            if (!json.text && HelpTopic.shippedScripts.hasOwnProperty(json.id))
                json.text = HelpTopic.shippedScripts[json.id]
        }

        static fromJsonScript(e:JsonScript)
        {
            var t = new HelpTopic({
                name: e.name,
                id: e.id,
                description: e.description,
                icon: e.icon,
                iconbackground: e.iconbackground,
                iconArtId: e.iconArtId,
                userid: e.userid,
                time:e.time,
                text: null,
                rootid: e.rootid,
                platforms: e.platforms,
                priority: 20000,
            });
            t.id = e.id;
            t.hashTags();
            t.fromJson = e;
            return t;
        }

        static fromScriptText(id:string, text:string)
        {
            var app = AST.Parser.parseScript(text);
            var t = HelpTopic.fromScript(app, false);
            if (id) {
                t.id = id;
                t.json.id = id;
            }
            return t;
        }

        static fromScript(app:AST.App, useApp = true)
        {
            var t = new HelpTopic({
                name: app.getName(),
                id: "none",
                description: app.getDescription(),
                icon: SVG.justName(app.iconPath()),
                iconbackground: app.htmlColor(),
                text: app.serialize(),
                rootid: "none",
                priority: 20000
            })
            if (useApp) {
                t.app = app;
                t.initPromise = Promise.as();
            }
            return t;
        }

        static forLibraryAction(act:AST.LibraryRefAction)
        {
            var t = new HelpTopic({
                name: act.getName(),
                id: "",
                description: act.getDescription(),
                icon: "Recycle",
                iconbackground: "#008800",
                text: "",
                rootid: "none",
                priority: 20000
            })

            t.apiProperty = act
            t.apiKind = api.core.Nothing
            t.app = act.parentLibrary().resolved
            t.id = Util.tagify(t.app.getName() + " " + act.getName())

            t.json.description += " #" + t.id

            return t;
        }

        static getAllTutorials(): HelpTopic[]{
            var tuts = HelpTopic.getAll().filter(ht => ht.isTutorial());
            return tuts;
        }

        static getAll() : HelpTopic[]
        {
            if (!HelpTopic._initalized) {
                HelpTopic._initalized = true;
                var bestForTag:any = {}

                HelpTopic._topics.forEach((topic) => {
                    bestForTag[topic.id] = topic;
                    var ht = topic.hashTags().map(MdComments.shrink);
                    if (ht.indexOf("docs") < 0) topic.hashTagsCache.push("#docs");
                    var tt = Util.toHashTag(topic.json.name)
                    if (ht.indexOf(MdComments.shrink(tt)) < 0) topic.hashTagsCache.push(tt);
                })

                api.getKinds().forEach((k:Kind) => {
                    if (k.isPrivate || k instanceof ThingSetKind || (k.isData && k.getContexts() == KindContext.None)) return;
                    var tagName = Util.toHashTag(k.getName());
                    var topic:HelpTopic = bestForTag[MdComments.shrink(tagName)]
                    if (!topic) {
                        topic = new HelpTopic({
                            name: k.getName(),
                            id: "",
                            description: "",
                            icon: SVG.justName(k.icon()) || "Document",
                            iconbackground: "#7d26cd",
                            priority: 11000,
                            rootid: "none",
                            text: ""
                        })
                        topic.hashTagsCache = ["#docs", tagName]
                        HelpTopic._topics.push(topic);
                    }
                    topic.id = MdComments.shrink(tagName.replace(/^#/, ""));
                    topic.json.name = k.getName();
                    topic.json.description = k.getHelp(false)
                    topic.json.parentTopic = "api"
                    topic.apiKind = k;
                    var outerTopic = topic;
                    outerTopic.subTopics = {};

                    k.listProperties().forEach((prop) => {
                        if (!prop.isBrowsable()) return;
                        var propname = prop.parentKind.getName() + prop.getArrow() + prop.getName();
                        var tagName = "#" + prop.helpTopic();
                        var topic:HelpTopic = bestForTag[MdComments.shrink(tagName)]
                        if (!topic) {
                            var j = outerTopic.json;
                            topic = new HelpTopic({
                                name: propname,
                                id: "",
                                rootid: "none",
                                description: "",
                                icon: j.icon,
                                iconbackground: j.iconbackground,
                                priority: 10000 + j.priority,
                                text: ""
                            });
                            topic.hashTagsCache = ["#docs", tagName]
                            HelpTopic._topics.push(topic);
                        }
                        topic.id = MdComments.shrink(tagName.replace(/^#/, ""));
                        topic.json.name = propname;
                        topic.json.description = prop.getDescription(true)
                        // they clash for "unknown -> :="
                        if (outerTopic.id != topic.id)
                            topic.json.parentTopic = outerTopic.id
                        outerTopic.subTopics[topic.id] = topic;
                        topic.apiKind = k;
                        topic.apiProperty = prop;
                    })
                })

                HelpTopic._topics.sort((a, b) => {
                    var d = a.json.priority - b.json.priority
                    if (d) return d;
                    return Util.stringCompare(a.json.name, b.json.name);
                })

                HelpTopic._topics.forEach((t) => t.isBuiltIn = true)

                HelpTopic.topicCache = {}
                HelpTopic.topicByScriptId = {}
                HelpTopic._topics.forEach((t) => {
                    HelpTopic.topicByScriptId[t.json.id] = t
                    HelpTopic.topicCache[t.id] = t
                })

                var workSet:StringMap<number> = {}

                var getNesting = (t:HelpTopic) => {
                    if (workSet.hasOwnProperty(t.id) && workSet[t.id]) workSet[t.id] = 2
                    if (t.nestingLevel !== undefined) return t.nestingLevel

                    t.nestingLevel = 0
                    if (t.json.parentTopic && HelpTopic.topicCache.hasOwnProperty(t.json.parentTopic)) {
                        var par = HelpTopic.topicCache[t.json.parentTopic]
                        workSet[t.id] = 1
                        var pn = getNesting(par)
                        if (workSet[t.id] == 1) {
                            t.parentTopic = par
                            t.nestingLevel = getNesting(par) + 1
                            t.parentTopic.childTopics.push(t)
                        } else {
                            if (dbg)
                                Util.log("DOCERR: cycle in help topics involving " + t.id)
                        }
                        workSet[t.id] = 0
                    } else {
                        if (dbg) {
                            if (t.json.parentTopic)
                                Util.log("DOCERR: parent topic " + t.json.parentTopic + " doesn't exists (in '" + t.json.name + "' /" + t.json.id + ")")
                            else
                                Util.log("DOCERR: no parent topic set for '" + t.json.name + "' /" + t.json.id)
                        }
                    }

                    return t.nestingLevel
                }

                HelpTopic._topics.forEach(getNesting)

                HelpTopic._topics.forEach(t => {
                    if (t.childTopics.length > 0)
                        t.childTopics.sort((a, b) => Util.stringCompare(a.json.name, b.json.name))
                })
            }

            return HelpTopic._topics;
        }

        public renderLink(mdcmt:MdComments, withKind = false)
        {
            var p = this.apiProperty;
            var r = "";
            r += "<a href='" + mdcmt.topicLink(this.id) + "' class='md-api-entry-link'><div class='md-api-entry'>";
            if (this.json.text)
                r += "<div class='md-more'>more info</div>"
            if (mdcmt.renderer)
                r += mdcmt.renderer.renderPropertySig(p, false, withKind);
            else
                r += Renderer.tdiv("signature", "action " + p.getName()) // we shouldn't really get here
            r += "<div class='nopara'>" + mdcmt.formatTextNoLinks(p.getDescription()) + "</div>";
            r += "</div></a>";
            return r;
        }

        public isBetterThan(other:HelpTopic)
        {
            var d = this.hashTags().length - other.hashTags().length;
            if (d != 0) return d < 0;
            d = this.json.priority - other.json.priority;
            if (d != 0) return d < 0;
            return Util.stringCompare(this.id, other.id) < 0;
        }

        static addMany(scripts:any, topicsJson:HelpTopicJson[], templates:any[])
        {
            HelpTopic.shippedScripts = scripts;
            var sc = (<any>TDev).ScriptCache;
            if (sc) sc.shippedScripts = scripts;
            HelpTopic.scriptTemplates = templates;
            topicsJson.forEach((d) => {
                HelpTopic._topics.push(new HelpTopic(d))
            })
        }

        public updateKey()
        {
            var j = this.fromJson
            if (j)
                return j.rootid + ":" + j.userid + ":" + j.name
            return this.json.rootid + ":jeiv:" + this.json.name
        }

        private allHashTags: string;
        private hashTagsCache:string[];
        public hashTags()
        {
            if (!this.hashTagsCache) {
                var r = this.hashTagsCache = [];
                var ht = "";
                this.json.description = this.json.description.replace(/(#\w+)/g, (m, h) => { r.push(m); ht += " " + m; return "" })
                this.allHashTags = ht;
            }
            return this.hashTagsCache;
        }

        public translations(): StringMap<string> {
            var m = /\{translations:([^\}]+)\}/i.exec(this.json.text);
            if (!m) return undefined;

            var res = MdComments.findArtStringResource(this.app, m[1]);
            if (!res) return undefined;

            var r: StringMap<string> = {};
            res.split('\n')
                .map(p => p.split('='))
                .forEach(parts => r[parts[0].toLowerCase()] = parts[1]);
            return r;
        }

        public templateHashTags() : string[] {
            var m = /\{sthashtags:([^\}]+)\}/i.exec(this.json.text);
            if (m) return m[1].split(',');
            else return [];
        }

        public templateEditorMode(): string {
            var m = /\{steditormode:([^\}]+)\}/i.exec(this.json.text);
            if (m) return m[1];
            return "";
        }

        public eventHubsTracking(): { namespace: string; hub: string; token: string; } {
            var m = /\{steventhubstracking:([^\:]+):([^\:]+):([^\}]+)\}/i.exec(this.json.text);
            if (m) return { namespace: m[1], hub: m[2], token: m[3] };
            return undefined;
        }

        public pixelTrackingUrl(): string {
            var m = /\{stpixeltracking:([^\}]+)\}/i.exec(this.json.text);
            if (m) return m[1];
            return "";
        }

        public nextTutorials(): string[] {
            var m = /\{stnexttutorials:([^\}]+)\}/i.exec(this.json.text);
            if (m) return m[1].split(',');
            return [];
        }

        public moreTutorials(): string {
            var m = /\{stmoretutorials:([^\}]+)\}/i.exec(this.json.text);
            if (m) return m[1];
            return undefined;
        }

        private translateAsync(to: string): Promise { // of HelpTopicInfoJson
            if (this.translatedTopic) return Promise.as(this.translatedTopic);
            if (!to || /^en/i.test(to) || Cloud.isOffline()) return Promise.as(undefined);

            tick(Ticks.translateDocTopic, to);
            return this.translateToScriptAsync(to, this.json.id);
        }

        private translateToScriptAsync(to: string, tutorialId: string): Promise { // translated topic
            // unpublished tutorial
            if (!tutorialId)
                return Promise.as(this.translatedTopic = <HelpTopicInfoJson>{ body: undefined });

            return ProgressOverlay.lockAndShowAsync(lf("translating topic...") + (dbg ? tutorialId : ""))
                .then(() => {
                    var blobUrl = HTML.proxyResource("https://tdtutorialtranslator.blob.core.windows.net/docs/" + to + "/" + tutorialId);
                    return Util.httpGetJsonAsync(blobUrl).then((blob) => {
                        this.translatedTopic = blob;
                        return this.translatedTopic;
                    }, e => {
                            // requestion translation
                            Util.log('requesting topic translation');
                            var url = 'https://tdtutorialtranslator.azurewebsites.net/api/translate_doc?scriptId=' + tutorialId + '&to=' + to;
                            return Util.httpGetJsonAsync(url).then((js) => {
                                this.translatedTopic = js.info;
                                return this.translatedTopic;
                            }, e => {
                                    Util.log('tutorial topic failed, ' + e);
                                    return this.translatedTopic = <HelpTopicInfoJson>{ body : undefined };
                                });
                        });
                }).then(() => ProgressOverlay.hide(), e => () => ProgressOverlay.hide());
        }

        public forSearch()
        {
            if (!this.searchCache) {
                var j = this.json;
                var c = j.name + " " + j.description;

                if (this.apiProperty) {
                    c +=  " " + this.apiProperty.parentKind.toString();
                    this.apiProperty.getParameters().forEach((p) => {
                        c += " " + p.getName() + " " + p.getKind().toString();
                    })
                    c += " " + this.apiProperty.getResult().getKind().toString();
                    c += " " + this.apiProperty.getDescription();
                } else if (this.apiKind) {
                    c += " " + this.apiKind.toString();
                    c += " " + this.apiKind.getDescription();
                }

                if (j.text) c += " " + j.text;

                this.searchCache = c.toLowerCase();
            }

            return this.searchCache;
        }

        public reloadAppAsync()
        {
            var j = this.json;
            var loadScript = (id) => {
                if (id == "") {
                    if (j.text == null && j.id)
                        return HelpTopic.getScriptAsync(j.id).then((text) => {
                            j.text = text;
                            return text;
                        })
                    else
                        return Promise.as(j.text);
                } else {
                    return HelpTopic.getScriptAsync(id);
                }
            }

            return TDev.AST.loadScriptAsync(loadScript).then((tcRes:AST.LoadScriptResult) => {
                var s = Script;
                setGlobalScript(tcRes.prevScript);
                return s;
            })
        }

        public initAsync()
        {
            if (!this.json.text && !this.json.id)
                return Promise.as(this.app);

            if (this.initPromise) return this.initPromise;

            this.initPromise = this.reloadAppAsync()
                .then(s => { this.app = s; return s });
            return this.initPromise
        }

        public isApiHelp()
        {
            return !!this.apiProperty
        }

        private renderCore(mdcmt : MdComments) : string
        {
            if (!mdcmt) {
                var rend = new Renderer();
                rend.stringLimit = 90;
                mdcmt = new MdComments(rend, null);
            }

            var ch = ""

            if (this.apiProperty) {
                ch += "<div class='md-api-header md-tutorial'>" +
                          (new Renderer()).renderPropertySig(this.apiProperty, true) +
                          "<div class='md-prop-desc'>" +
                            mdcmt.formatText(this.apiProperty.getDescription()) +
                          "</div>" +
                      "</div>";

                var cap = this.apiProperty.getCapability();
                    ch += "<div class='md-tutorial'>" +
                            "<ul>" +
                              (cap == PlatformCapability.None ? "" :
                                "<li>" + lf("<strong>required platform:</strong>") + " " + Util.htmlEscape(AST.App.capabilityName(cap)) +
                                 " <a title='" + lf("read more about platforms") + "' href='/help/platforms'>" + lf("Learn more...") + "</a></li>") +
                              (!this.apiProperty.isBeta() ? "" :
                                "<li>" + lf("<strong>feature in beta testing:</strong> the syntax and semantics is subject to change") +
                                " <a title='" + lf("read more about the beta") + "' href='#topic:beta'>" + lf("Learn more...") + "</a></li>") +
                              (this.apiProperty.isImplementedAnywhere() ? "" :
                                "<li><strong>" + lf("API not implemented") + "</strong>, sorry " +
                                "<a title='" + lf("read more about unimplemented features") + "' href='#topic:notImplemented'>" + lf("Learn more...") + "</a></li>") +
                            "</ul>" +
                          "</div>";

                if (mdcmt.useExternalLinks)
                    ch = ch.replace(/#topic(:|%3a)/g, "https://www.touchdevelop.com/docs/");
            }

            if (this.app) {
                var acts:AST.Action[] = <AST.Action[]> this.app.orderedThings().filter((a) => a instanceof AST.Action);
                var noTutorial = acts.some(a => a.getName() == "this is no tutorial")
                if (this.apiProperty instanceof AST.LibraryRefAction) {
                    acts = acts.filter(a => a.getName() == "docs " + this.apiProperty.getName())
                } else {
                    acts = acts.filter((a) => a.isNormalAction() && /^example/.test(a.getName()))
                    if (acts.length == 0 && this.app.mainAction()) acts = [this.app.mainAction()];
                }
                var tutorialSteps = noTutorial ? [] : AST.Step.splitActions(this.app);

                acts.forEach((a) => {
                    ch += mdcmt.extract(a);
                })

                if (tutorialSteps.length > 0) {
                    tutorialSteps.forEach((s) => {
                        if (s.printOut) {
                            ch += mdcmt.mkDeclSnippet(s.printOut, true, "tutorial-step", 1);
                        }
                    })

                    var finalAct = this.app.actions().filter(a => a.getName() == "final")[0];
                    if (finalAct)
                        ch += mdcmt.extract(finalAct)
                }
            }

            if (this.apiKind && !this.apiProperty) {
                var r = this.getSubTopics().map((st) => st.renderLink(mdcmt))
                ch += "<div class='md-tutorial'>" + r.join('') + "</div>";
            }

            if (this.id == "api") {
                var r: string[] = [];
                var kindTopics = HelpTopic.getAll().filter(st => st.apiKind && !st.apiProperty);
                kindTopics.sort((a, b) => Util.stringCompare(a.id, b.id))

                r.push('<h3>' + lf("services") + '</h3>');
                kindTopics.filter(st => !st.apiKind.isData && !st.apiKind.isObsolete).forEach((st) => HelpTopic.renderKindDecl(r,st, mdcmt));
                r.push('<h3>' + lf("types") + '</h3>');
                kindTopics.filter(st => st.apiKind.isData && !st.apiKind.isAction && !st.apiKind.isObsolete).forEach((st) => HelpTopic.renderKindDecl(r, st, mdcmt));
                r.push('<h3>' + lf("action types") + '</h3>');
                kindTopics.filter(st => st.apiKind.isData && st.apiKind.isAction && !st.apiKind.isObsolete).forEach((st) => HelpTopic.renderKindDecl(r, st, mdcmt));

                ch += "<div class='md-tutorial'>" + r.join('') + "</div>";
            }

            return ch;
        }

        public isPropertyHelp() { return !!this.apiProperty; }

        public getSubTopics():HelpTopic[]
        {
            var names = Object.keys(this.subTopics);
            names.sort(Util.stringCompare);
            return names.map((k) => this.subTopics[k])
        }

        private renderTranslated() {
            if (this.translatedTopic && this.translatedTopic.body) {
                var ch = "<div class='md-tutorial' dir='auto'>" +
                    this.translatedTopic.body.join('\n') +
                    "</div>";
                return ch;
            }
            return undefined;
        }

        public renderAsync(mdcmt : MdComments = null) : Promise // string
        {
            return this.initAsync().then(() => {
                var prevScript = Script;
                    try {
                        setGlobalScript(this.app);
                        return this.renderCore(mdcmt);
                    } finally {
                        setGlobalScript(prevScript);
                    }
            })
        }

        public docInfoAsync() : Promise // of HelpTopicInfoJson
        {
            var md = new TDev.MdComments(new TDev.CopyRenderer());
            md.useSVG = false;
            md.showCopy = false;
            // md.useExternalLinks = true;

            var ht = this
            return this.renderAsync(md)
                .then(text => {
                    var r = <HelpTopicInfoJson>{
                        title: "<h1>" + TDev.Util.htmlEscape(ht.json.name) + "</h1>",
                        description: ht.isApiHelp() ? "" : "<p>" + TDev.Util.htmlEscape(ht.json.description) + "</p>",
                        body: MdComments.splitDivs(text),
                    }
                    var translations = ht.translations();
                    if (translations) r.translations = translations;
                    return r;
                })
        }

        public renderHeader()
        {
            var r = div(null);
            this.initAsync().done(() => {
                var appName = this.app.getName().replace(/ tutorial$/, "");
                // remove any text before ':'
                var i = appName.indexOf(':');
                if (i > 0) appName = appName.substr(i+1);
                else appName = lf("tutorial: ") + appName;
                r.setChildren(appName)
            })
            return r;
        }

        public render(whenDone:(e:HTMLElement)=>void)
        {
            var d = div(null);
            d.style.marginRight = "0.2em";

            this.translateAsync(Util.getTranslationLanguage())
                .then(() => this.renderAsync())
                .done((text) => {
                var translatedDocs = this.renderTranslated();
                if (!translatedDocs)
                    Browser.setInnerHTML(d, text);
                else if (this.translatedTopic && this.translatedTopic.manual) {
                    Browser.setInnerHTML(d, translatedDocs);
                } else {
                    var elementDiv = <HTMLDivElement>div('');
                    Browser.setInnerHTML(elementDiv, text);
                    var trElementDiv = <HTMLDivElement>div('');
                    Browser.setInnerHTML(trElementDiv, translatedDocs);

                    var trNotice = div('translate-notice', lf("Translations by Microsoft® Translator, tap to see original..."))
                        .withClick(() => {
                            trElementDiv.style.display = 'none';
                            elementDiv.style.display = 'block';
                            Util.seeTranslatedText(false);
                        });
                    trElementDiv.insertBefore(trNotice, trElementDiv.firstElementChild);
                    var elNotice = div('translate-notice', lf("tap to translate with Microsoft® Translator..."))
                        .withClick(() => {
                            elementDiv.style.display = 'none';
                            trElementDiv.style.display = 'block';
                            Util.seeTranslatedText(true);
                        })
                    elementDiv.insertBefore(elNotice, elementDiv.firstElementChild);
                    if (Util.seeTranslatedText())
                        elementDiv.style.display = 'none';
                    else
                        trElementDiv.style.display = 'none';

                    d.setChildren([elementDiv, trElementDiv]);
                }
                HTML.fixWp8Links(d);
                whenDone(d);
            })

            return d;
        }

        static printManyAsync(topics:HelpTopic[])
        {
            return Promise.join(topics.map(t => t.printedAsync())).then(arr =>
                HelpTopic.printText(arr.join("<div style='page-break-after:always'></div>\n"), "Help"))
        }

        public printedAsync(newsletter = false)
        {
            var r = new CopyRenderer();
            var md = new MdComments(r);
            md.scriptid = this.json.id;
            md.useSVG = false;
            md.useExternalLinks = true;
            md.showCopy = false;
            return this.renderAsync(md).then((text) => {
                if (newsletter)
                    return CopyRenderer.inlineStyles(text);
                else
                    return (
                    "<h1>" + Util.htmlEscape(this.json.name) + "</h1>" +
                    "<p>" + Util.htmlEscape(this.json.description) + "</p>" +
                    text)
            })
        }

        static printText(text:string, title:string)
        {
            try {
                var w = window.open("about:blank", "tdTopic" + Util.guidGen());
                w.document.write("<!DOCTYPE html><html><head>" + CopyRenderer.css
                                 + "<title>" + Util.htmlEscape(title) + "</title>"
                                 + "<meta name='microsoft' content='notranslateclasses stmt keyword'/>"
                                 + "</head><body onload='try { window.print(); } catch(ex) {}'>"
                                 + "<div><img src='" + HTML.proxyResource("https://az31353.vo.msecnd.net/c04/uxoj.png") + "' alt='TouchDevelop by Microsoft Research'></div>"
                                 + text
                                 + "</body></html>");
                w.document.close();
            } catch(e) {
                ModalDialog.info(":( can't print from here", "Your browser might have blocked the print page or try to print from another device...");
            }
        }

        public printNewsletter()
        {
            this.printedAsync(true).done(text => {
                try {
                    var w = window.open("about:blank", "tdTopic" + Util.guidGen());
                    text = Util.fmt("<!DOCTYPE html><html><head><title>{0:q}</title></head><body>{1}</body></html>",
                             this.json.name, text)
                    w.document.write(text)
                    w.document.close();
                } catch(e) {
                    ModalDialog.info(":( can't print from here", "Your browser might have blocked the print page or try to print from another device...");
                }
            })
        }

        public print()
        {
            this.printedAsync().done(text => HelpTopic.printText(text, this.json.name))
        }

        static renderKindDecl(r : string[], st : HelpTopic, mdcmt:MdComments) {
            var j = st.json;
            var n = j.name;
            if (!st.apiKind.isData) n = n.toLowerCase();
            r.push("<div class='api-kind'><a href='" + mdcmt.topicLink(st.id) + "'>");
            r.push("<div class='api-kind-inner'>");
            // without SVG we don't do any icons at the moment; in future see below
            if (mdcmt.useSVG)
                r.push("<span class='api-icon' style='background:" + j.iconbackground + "'>" +
                     (mdcmt.useSVG ? SVG.getIconSVGCore(j.icon + ",white") :
                         "<img src='/replaceicons/" + j.icon + ".png' alt='" + j.icon + "'>") + "</span>");
            r.push("<div class='api-names'><div class='api-name'>" + Util.htmlEscape(n) + "</div>");
            r.push("<div class='api-desc'>" + Util.htmlEscape(j.description) + "</div>");
            r.push("</div></div></a></div>");
        }


        static topicCache:any;
        static topicByScriptId:any;
        static findById(id:string):HelpTopic
        {
            // make sure things are initialized
            HelpTopic.getAll();
            if (id)
                id = id.replace(/^t:/, "")
            id = MdComments.shrink(id)
            if (HelpTopic.topicCache.hasOwnProperty(id))
                return HelpTopic.topicCache[id];
            return null;
        }

        static testSplit(id:string)
        {
            var h = HelpTopic.findById(id)
            if (h)
                h.renderAsync().done(text => {
                    console.log(MdComments.splitDivs(text))
                })
        }

        static findByScriptId(id:string):HelpTopic
        {
            if (!HelpTopic.topicByScriptId) HelpTopic.findById("anything");
            if (HelpTopic.topicByScriptId.hasOwnProperty(id))
                return HelpTopic.topicByScriptId[id]
        }
    }

    TDev.api.addHelpTopics = HelpTopic.addMany;
}
