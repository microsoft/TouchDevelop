///<reference path='refs.ts'/>


module TDev.HTML {
    export function tr(parent: HTMLElement, cl: string) {
        var d = document.createElement('tr');
        d.className = cl;
        parent.appendChild(d);
        return d;
    }

    export function td(parent: HTMLElement, cl: string) {
        var d = document.createElement('td');
        d.className = cl;
        parent.appendChild(d);
        return d;
    }

    export function col(parent: HTMLElement) {
        var d = document.createElement('col');
        parent.appendChild(d);
        return d;
    }

    export function jsrequireAsync(url: string): Promise {
        return new Promise((onSuccess, onProgress, onError) => {
            // look for previous script tag
            if (Util.children(document.head).some(el => /script/i.test(el.tagName) && el.getAttribute("src") == url)) {
                onSuccess(undefined);
                return;
            }

            Util.log('require ' + url);
            // add a new script entry and wait till loaded
            var script = <HTMLScriptElement> document.createElement("script");
            script.type = "text/javascript";
            script.charset = "utf-8";
            script.onload = () => {
                if (!script.readyState || script.readyState === 'complete') {
                    Util.log('require success ' + url);
                    onSuccess(undefined);
                }
            };
            script.onreadystatechange = script.onload;
            script.onerror = (err) => {
                Util.log('require error: {0}', err);
                onSuccess(err)
            };
            script.src = url;
            document.head.appendChild(script);
        });
    }

    export interface OEmbed {
        title: string;
        author_name: string;
        author_url: string;
        html: string;
        thumbnail_url: string;
        provider_name: string;
        provider_url: string;
    }

    export function mkOEmbed(url: string, oe: OEmbed): HTMLElement {
        var d = div('md-video-link',
            div('', HTML.mkImg(oe.thumbnail_url)).withClick(() => window.open(url, 'oembed') ),
            oe.title,
            HTML.mkA('', oe.author_url, 'oembed', oe.author_name),
            HTML.mkA('', oe.provider_url, 'oembed', oe.provider_url)
            );
        return d;
    }

    export function mkLazyVideoPlayer(preview: string, iframeSrc:string): HTMLElement {
        var d = div('md-video-link');
        Browser.setInnerHTML(d, SVG.getVideoPlay(preview));
        d.setAttribute("data-playersrc", iframeSrc);
        d.withClick(() => {
            d.innerHTML = Util.fmt("<div class='md-video-wrapper'><iframe src='{0:url}' frameborder='0' allowfullscreen=''></iframe></div>",iframeSrc);
        });
        return d;        
    }

    export function mkYouTubePlayer(ytid: string) {
        return mkLazyVideoPlayer(
            Util.fmt('https://img.youtube.com/vi/{0:q}/mqdefault.jpg', ytid),
            Util.fmt("//www.youtube-nocookie.com/embed/{0:uri}?modestbranding=1&autoplay=1&autohide=1&origin={1:uri}", ytid, Cloud.config.rootUrl)
            );
    }

    export function mkAudio(url: string, aacUrl: string = null, mp3Url: string = null, controls = false): HTMLAudioElement {
        var audio = <HTMLAudioElement>document.createElement('audio');
        (<any>audio).crossorigin = "anonymous";
        audio.controls = controls;
        setAudioSource(audio, url, aacUrl, mp3Url);
        return audio;
    }

    export function audioLoadAsync(audio: HTMLAudioElement): Promise {
        return new Promise((onSuccess, onError, onProgress) => {
            audio.oncanplay = () => {
                Util.log('loaded sound oncanplay');
                audio.oncanplay = null;
                audio.oncanplaythrough = null;
                audio.onerror = null;
                onSuccess(audio);
            };
            audio.oncanplaythrough = () => {
                Util.log('loaded sound oncanplaythrough');
                audio.oncanplay = null;
                audio.oncanplaythrough = null;
                audio.onerror = null;
                onSuccess(audio);
            };
            audio.onerror = (e: Event) => {
                Util.log('failed loading sound - ' + audio.readyState);
                audio.oncanplay = null;
                audio.oncanplaythrough = null;
                audio.onerror = null;
                onSuccess(audio);
            };
            // poll for browsers who don't implement events properly
            var retry = 20;
            var loadTracker = () => {
                var readyState = <number>(<any>(audio.readyState));
                if (!audio.oncanplay) return;
                if (readyState === HTMLMediaElement.HAVE_ENOUGH_DATA) {
                    audio.oncanplay = null;
                    audio.oncanplaythrough = null;
                    audio.onerror = null;
                    onSuccess(audio);
                } else if (retry-- > 0) {
                    Util.log('retry loading sound. readState:' + readyState + ', networkState:' + audio.networkState + ', try:' + retry);
                    Util.setTimeout(250, loadTracker);
                }
                else { // give up
                    Util.log('timeout loading sound');
                    audio.oncanplay = null;
                    audio.oncanplaythrough = null;
                    audio.onerror = null;
                    onSuccess(audio);
                }
            };
            try {
                Util.log('start loading sound');
                audio.load();
                Util.setTimeout(400, loadTracker);
            }
            catch (e) {
                Util.log('failed loading sound: ' + e.message);
                onSuccess(audio);
            }
        });
    }

    export function setAudioSource(audio: HTMLAudioElement, url: string, aacUrl: string = null, mp3Url: string = null) {
        if (!url) {
            audio.setChildren([]);
            return;
        }

        // special handling of data urls
        var m = url.match(/^data:audio\/(mp3|mp4|wav);base64,/i);
        if (m) {
            Util.log('audio: src datauri ' + m[1]);
            var src = <HTMLSourceElement>document.createElement('source');
            src.src = url;
            src.type = 'audio/' + m[1];
            audio.setChildren([src]);
        }
        else {
            // in general, we don't know if the file is a wav or a mp3
            var wavSrc = <HTMLSourceElement>document.createElement('source');
            wavSrc.src = proxyResource(url);
            wavSrc.type = 'audio/wav';

            var mp3Src = <HTMLSourceElement>document.createElement('source');
            mp3Src.src = proxyResource(mp3Url || url);
            mp3Src.type = 'audio/mp3';

            var aacSrc = <HTMLSourceElement>document.createElement('source');
            aacSrc.src = proxyResource(aacUrl || url);
            aacSrc.type = 'audio/mp4';

            audio.setChildren([aacSrc, wavSrc, mp3Src]);
        }
    }

    export interface ITextTrackCue {
        startTime: number;
        endTime: number;
        message: string
    }

    export function parseWtt(wtt: string): ITextTrackCue[] {
        var r = []
        if (wtt) {
            try {
                var rx = /((\d{2}):)?(\d{2}):(\d{2})\.(\d{3}) --> ((\d{2}):)?(\d{2}):(\d{2})\.(\d{3})/gi;
                var m: RegExpExecArray;
                while (m = rx.exec(wtt)) {
                    var startTime = parseInt(m[2] || "0") * 3600 + parseInt(m[3]) * 60 + parseInt(m[4]) + parseInt(m[5]) / 1000;
                    var endTime = parseInt(m[7] || "0") * 3600 + parseInt(m[8]) * 60 + parseInt(m[9]) + parseInt(m[10]) / 1000;
                    var message = wtt.substr(m.index + m[0].length).trim();
                    var emptyLine = /^$/m.exec(message);
                    if (emptyLine) message = message.substr(0, emptyLine.index).trim();
                    r.push({ startTime: startTime, endTime: endTime, message: message });
                }
            }
            catch (e) {
                Util.reportError("wtt", e, false);
                return r;
            }
        }
        return r;
    }

    export function pauseVideos(el: HTMLElement) {
        if (el) {
            var vids = el.getElementsByTagName("video");
            for (var i = 0; i < vids.length; ++i) {
                try { vids.item(i).pause(); } catch (e) { }
            }
        }
    }
    export function patchWavToMp4Url(url: string): string {
        if (url) {
            var m = url.match(/^http(s?):\/\/(cdn\.touchdevelop\.com|az31353\.vo\.msecnd\.net)\/pub\/(\w+)/i);
            if (m) return 'https://' + m[2] + '/aac/' + m[3] + '.m4a';
            if (/^\.\/art\//i.test(url)) return url + '.m4a';
        }
        return url;
    }


    export function mkBr() { return document.createElement("br") }

    export function mkTextArea(cls : string = null) {
        var ta = <HTMLTextAreaElement>document.createElement("textarea");
        if (cls != null)
            ta.className = cls;
        dirAuto(ta);
        ta.onselectstart = (e) => {
            e.stopImmediatePropagation();
            return true;
        }
        return ta;
    }

    export function wrong(e:HTMLElement)
    {
        Util.coreAnim("shakeTip", 500, e)
    }

    export function setupDragAndDrop(r: HTMLElement, onFiles : (files : FileList) => void) {
        if (!Browser.dragAndDrop) return;

        r.addEventListener('dragover', function (e) {
            if (e.dataTransfer.types[0] == 'Files') {
                if (e.preventDefault) e.preventDefault(); // Necessary. Allows us to drop.
                e.dataTransfer.dropEffect = 'copy';  // See the section on the DataTransfer object.
                return false;
            }
        }, false);
        r.addEventListener('drop',(e) => {
            if (e.dataTransfer.files[0]) {
                e.stopPropagation(); // Stops some browsers from redirecting.
                e.preventDefault();
                onFiles(e.dataTransfer.files);
            }
            return false;
        }, false);
        r.addEventListener('dragend',(e) => {
            return false;
        }, false);
    }

    export function mkButtonElt(cl:string, ...children:any[]) {
        var elt = <HTMLElement> document.createElement("button");
        if (cl != null)
            elt.className = cl;
        elt.appendChildren(children);
        dirAuto(elt);
        return elt;
    }

    export function mkImg(url:string, cls : string = undefined):HTMLElement {
        if (/^\//.test(url))
            url = (<any> url).slice(1);

        var m = /^scripticons(96)?\/(.*)\.png/.exec(url);
        if (m) {
            url = "svg:" + m[2] + ",white";
        }

        var img;
        if (/^svg:/.test(url)) {
            img = SVG.getIconSVG(url.slice(4));
        } else {
            var elt = <HTMLImageElement> document.createElement("img");
            elt.src = proxyResource(url);
            elt.alt = "";
            img = elt;
        }
        if (cls)
            img.className += " " + cls;
        return img;
    }

    export function mkImgButton(img:string, f:()=>void)
    {
        var i = HTML.mkImg(img);
        HTML.setRole(i, "presentation");
        var btn = mkButtonElt("wall-button", i);
        Util.clickHandler(btn, f);
        return btn;
    }

    export function mkDisablableButton(content:string, f:()=>void)
    {
        var r = mkButton(content, () => {
            if (!r.getFlag("disabled")) f();
        })
        return r;
    }

    export function mkAsyncButton(content:string, f:()=>Promise, cls = ""):HTMLElement
    {
        var btn = mkButtonElt("wall-button " + cls, text(content));
        var running = false
        Util.clickHandler(btn, () => {
            if (running) return
            running = true
            btn.style.opacity = "0.5"
            btn.setFlag("disabled", true)
            f().done(() => {
                running = false
                btn.style.opacity = null
                btn.setFlag("disabled", false)
            })
        });
        return btn;
    }

    export function mkButton(content:string, f:()=>void, cls = ""):HTMLElement
    {
        var btn = mkButtonElt("wall-button " + cls, text(content));
        Util.clickHandler(btn, f);
        return btn;
    }

    export function mkLinkButton(content:string, f:()=>void, cls = "")
    {
        var btn = mkButtonElt("link-button " + cls, text(content));
        Util.clickHandler(btn, f);
        return btn;
    }

    export function mkButtonTick(content:string, t:Ticks, f:()=>void, cls = "")
    {
        var btn = mkButtonElt("wall-button " + cls, text(content));
        setTickCallback(btn, t, f);
        return btn;
    }

    export function mkButtonOnce(content:string, f:()=>void, removeSiblings : boolean = false)
    {
        var btn = mkButtonElt("wall-button", text(content));
        Util.clickHandler(btn, (e) => {
            if (removeSiblings)
                (<Element>btn.parentNode).removeAllChildren();
            else
                btn.removeSelf();
            f();
        });
        return btn;
    }

    export function setTickCallback(btn:HTMLElement, tick:Ticks, f:()=>void)
    {
        if (tick == Ticks.noEvent) {
            return btn.withClick(f)
        } else {
            btn.id = "btn-" + Ticker.tickName(tick);
            return btn.withClick(() => { Ticker.tick(tick); f() })
        }
        return btn
    }

    export function mkRoundButton(icon:string, name:string, tick:Ticks, f:()=>void) :HTMLButtonElement
    {
        var btn = HTML.mkButtonElt("topMenu-button " + (name.length > 11 ? "topMenu-button-long-desc" : ""), [
            div("topMenu-button-frame", HTML.mkImg(icon)),
            div("topMenu-button-desc", name)
        ]);
        setTickCallback(btn, tick, f)
        return <HTMLButtonElement>btn;
    }

    export interface IInputElement {
        element: HTMLElement;
        validate(): string; // returns error message
        readAsync(): Promise; // of string
    }

    export function fileReadAsDataURLAsync(f: File) : Promise {
        if (!f)
            return Promise.as(null);
        else {
            return new Promise((onSuccess, onError, onProgress) => {
                var reader = new FileReader();
                reader.onerror = (ev) => onSuccess(null);
                reader.onload = (ev) => onSuccess(reader.result);
                reader.readAsDataURL(f);
            });
        }
    }

    export var documentMimeTypes: StringMap<string> = {
        "text/css": "css",
        "application/javascript": "js",
        "text/plain": "txt",
        "application/pdf": "pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx"
    };

    export function mkDocumentInput(maxMb: number): IInputElement {
        var input = HTML.mkTextInput("file", lf("choose a file"));
        input.accept = Object.keys(documentMimeTypes).join(";");
        return <IInputElement>{
            element: input,
            validate: function (): string {
                var f = input.files[0];
                if (!f)
                    return 'Oops, you need to select a file...';
                if (maxMb > 0 && f.size > maxMb * 1000000)
                    return 'Sorry, the file is too big. The sound must be less than ' + maxMb + 'Mb...';
                if (input.accept.indexOf(f.type) < 0)
                    return 'Sorry, this document format is not supported...';
                return null;
            },
            readAsync: () => fileReadAsDataURLAsync(input.files[0])
        };
    }

    export var mkAudioInput = (allowEmpty: boolean, maxMb: number): IInputElement =>
    {
        var input = HTML.mkTextInput("file", lf("choose a file"));
        input.accept = "audio/wav";
        return <IInputElement>{
            element: input,
            validate: function (): string {
                var files = input.files;
                if (files.length == 0)
                    return allowEmpty ? null : 'Oops, you need to select a sound...';
                var f = files[0];
                if (maxMb > 0 && f.size > maxMb * 1000000)
                    return 'Sorry, the sound is too big. The sound must be less than ' + maxMb + 'Mb...';
                if (f.type !== 'audio/wav' && f.type !== 'audio/x-wav') // audio/x-wav on Mac/Safari
                    return 'Sorry, you can only upload WAV sounds...';
                return null;
            },
            readAsync: () => fileReadAsDataURLAsync(input.files[0])
        };
    }

    export var mkImageChooser = (onchanged:(dataUri:string)=>void):HTMLElement =>
    {
        var file = HTML.mkTextInput("file", lf("choose a picture"));
        file.accept = "image/jpeg,image/png";
        file.onchange = () => {
            var f = file.files.length > 0 ? file.files[0] : null;
            if (!f) return;
            var reader = new FileReader();
            reader.onload = (ev) => onchanged(reader.result);
            reader.readAsDataURL(f);
        };
        return file;
    }

    export function mkFileInput(file : File, maxMb: number): IInputElement
    {
        var input;
        if (/^image\//.test(file.type)) {
            input = document.createElement("img");
            input.style.maxWidth = '21em';
            input.style.maxHeight = '11em';
            input.src = file;
            fileReadAsDataURLAsync(file).done(url => input.src = url);
        } else if (/^audio\//.test(file.type)) {
            input = document.createElement("audio");
            (<any>input).crossorigin = "anonymous";
            input.src = file;
            fileReadAsDataURLAsync(file).done(url => input.src = url);
        } else {
            input = div('wall-textbox', lf("{0} {1}Kb", file.name, Math.ceil(file.size / 1000)));
        }
        input.style.margins = '0.5em';
        return <IInputElement>{
            element : input,
            validate : () => null,
            readAsync: (): Promise => fileReadAsDataURLAsync(file)
        };
    }

    export var mkImageInput = (allowEmpty : boolean, maxMb: number): IInputElement =>
    {
        var input = HTML.mkTextInput("file", lf("choose a picture"));
        input.accept = "image/jpeg,image/png";
        return <IInputElement>{ element : input,
            validate : function (): string {
                var files = input.files;
                if (files.length == 0)
                    return allowEmpty ? null : lf("Oops, you need to select a picture...");
                var f = files[0];
                if (maxMb > 0 && f.size > maxMb * 1000000)
                    return lf("Sorry, the picture is too big. The picture must be less than {0} Mb...", maxMb);
                if (f.type !== 'image/jpeg' && f.type !== 'image/png')
                    return lf("Sorry, you can only upload JPEG and PNG pictures...");
                return null;
            },
            readAsync : function (): Promise { // of String
                var f = input.files[0];
                if (!f)
                    return Promise.as(null);
                else {
                    return new Promise((onSuccess, onError, onProgress) => {
                        var reader = new FileReader();
                        reader.onerror = (ev) => onSuccess(null);
                        reader.onload = (ev) => onSuccess(reader.result);
                        reader.readAsDataURL(f);
                    });
                }
            }
        };
    }

    export function setRole(el: HTMLElement, role: string) {
        if (!el) return;
        if (role)
            el.setAttribute("role", role);
        else
            el.removeAttribute("role");
    }

    export function enableSpeech(el: HTMLInputElement, changed: () => void ) {
        el.setAttribute('x-webkit-speech', 'x-webkit-speech');
        (<any>el).onwebkitspeechchange = () => {
            changed();
        };
        (<any>el).onspeechchange = () => {
            changed();
        };
    }

    export function mkTextInput(type:string, placeholder : string, role?:string) : HTMLInputElement
    {
        var txt = <HTMLInputElement> document.createElement("input");
        txt.setAttribute("type", type);
        if (placeholder) {
            txt.setAttribute("placeholder", placeholder);
            txt.setAttribute("aria-label", placeholder);
        }
        if (role) HTML.setRole(txt, role);
        txt.autofocus = false;
        txt.className = "wall-textbox";
        dirAuto(txt);
        //https://developer.apple.com/library/safari/codinghowtos/Mobile/UserExperience/_index.html#//apple_ref/doc/uid/DTS40008248-CH1-DontLinkElementID_13
        if (Browser.browser == BrowserSoftware.safari)
            (<any>txt).autocapitalize = false;
        txt.onselectstart = (e) => {
            e.stopImmediatePropagation();
            return true;
        }
        return txt;
    }

    export function mkTextInputWithOk(type:string, placeholder? : string, onOk? : () => void) : HTMLInputElement
    {
        var res = mkTextInput(type, placeholder)
        var okBtn:HTMLElement = null;

        Util.onInputChange(res, () => {
            if (okBtn) return
            res.style.width = "calc(100% - 6em)";
            okBtn = mkButton(lf("ok"), () => {
                var b = okBtn
                okBtn = null
                res.style.width = "";
                if (b) b.removeSelf();
                res.blur()
                if (onOk) onOk();
            }, "input-confirm");
            res.parentNode.insertBefore(okBtn, res.nextSibling)
        })
        res.addEventListener("blur", () => {
            var b = okBtn
            okBtn = null
            res.style.width = "";
            if (b) b.removeSelf();
        }, false)

        return res
    }

    export function mkOption(value: string, label: string, selected: boolean = undefined, ...children: any[]): HTMLOptionElement {
        var option = <HTMLOptionElement> document.createElement("option");
        option.label = label;
        option.value = value;
        if (selected !== undefined) option.selected = selected;
        if (label) option.appendChildren(label);
        option.appendChildren(children);
        return option;
    }

    export function mkComboBox(options: HTMLOptionElement[]): HTMLSelectElement {
        var combobox = <HTMLSelectElement> document.createElement("select");
        combobox.autofocus = false;
        combobox.className = "wall-textbox";
        combobox.appendChildren(options);
        return combobox;
    }

    export function getCheckboxValue(ch: HTMLElement) { return !!(<any> ch).selected; }
    export function setCheckboxValue(ch:HTMLElement, v:boolean)
    {
        (<any> ch).theBox.setChildren(v ? [text("\u2713")] : []);
        (<any> ch).selected = v;
    }

    export function mkCheckBox(lbl:string, onchg:(v:boolean)=>void = undefined, v?:boolean)
    {
        return mkTickCheckBox(Ticks.noEvent, lbl, onchg, v)
    }

    export function mkTickCheckBox(t:Ticks, lbl:string, onchg:(v:boolean)=>void = undefined, v?:boolean)
    {
        var b = div("theBox", text(""));
        var r = div("checkbox", b, text(lbl));
        (<any> r).theBox = b;
        setTickCallback(r, t, () => {
            var nv = !(<any> r).selected;
            setCheckboxValue(r, nv);
            if (!!onchg) onchg(nv);
        });
        if (v !== undefined)
            setCheckboxValue(r, v)
        return r;
    }

    export interface RadioGroup
    {
        buttons:HTMLElement[];
        onchange:(n:number)=>void;
        change:(n:number)=>void;
        current:number;
        elt:HTMLElement;
        enabled:boolean;
    }

    export interface RadioItem
    {
        name: string;
        tick?: Ticks;
    }

    export function mkRadioButtons(lbls:RadioItem[])
    {
        var res:RadioGroup = {
            current: -1,
            enabled: true,
            buttons:
                lbls.map((l, i) => setTickCallback(mkButtonElt("radio-button",
                    div("radio-outer", div("radio-inner")), div("radio-label", l.name)), l.tick, () => {
                        if (res.enabled)
                            res.change(i)
                    })),
            onchange: (n) => {},
            change: (n) => {
                res.current = n;
                res.buttons.forEach((b, i) => b.setFlag("selected", i == n))
                res.onchange(n);
            },
            elt: div("radio-group")
        }
        res.elt.setChildren(res.buttons)
        return res
    }

    export function mkModalList(children:any[])
    {
        var kindList = div("modalList", children);
        Util.setupDragToScroll(kindList);
        return kindList;
    }

    var progressNotificationAnimation: Animation;
    export var showProgressNotification = (msgText:string, fadeOut:boolean = true, delay : number = 1000, duration : number = 2000) =>
    {
        if (Browser.isHeadless) {
            Util.log("progress: " + msgText);
            return;
        }

        var className = "progressNotification";
        var se = elt("root");
        var oldMsgs = se.getElementsByClassName(className);
        var msg = oldMsgs.length > 0 ? <HTMLElement>oldMsgs.item(0) : undefined;
        var f = function() {
            progressNotificationAnimation = undefined;
            if (fadeOut) {
                progressNotificationAnimation = Animation.fadeOut(msg);
                progressNotificationAnimation.delay = delay;
                progressNotificationAnimation.duration = duration;
                progressNotificationAnimation.completed = () => { progressNotificationAnimation = undefined; }
                progressNotificationAnimation.begin();
            }
        };
        if (msg) {
            if (!!progressNotificationAnimation) {
                progressNotificationAnimation.stop();
            }
            msg.style.opacity = "1";
            if (msgText !== undefined) {
                msg.removeAllChildren();
                msg.appendChildren(msgText);
            }
            f();
        } else if (msgText) {
            msg = div(className, msgText);
            se.appendChild(msg);
            progressNotificationAnimation = Animation.fadeIn(msg);
            progressNotificationAnimation.completed = f;
            progressNotificationAnimation.begin();
        }
    }

    export function showWarningNotification(msgText: string, details: string = null) {
        if (Browser.isHeadless) {
            Util.log("warning: " + msgText);
            return;
        }

        var msg = div("warningNotification",
            div('frownie', ":("), div('info', msgText)
            );
        if (details) {
            msg.appendChild(div('info link', 'learn more...'));
            msg.withClick(() => {
                tick(Ticks.warningNotificationTap);
                ModalDialog.info(msgText, details);
            });
        }
        elt("root").appendChild(msg);
        var a = Animation.fadeOut(msg);
        a.delay = 6000;
        a.duration = 3000;
        a.begin();
    }

    export function showPluginNotification(msgText: string) {
        var msg = div("pluginNotification", div('info', msgText));
        elt("root").appendChild(msg);
        var a = Animation.fadeOut(msg);
        a.delay = 6000;
        a.duration = 3000;
        a.begin();
    }

    export function showUndoNotification(msgText: string, undo: () => void) {
        var previous = elt("infoNotification"); if (previous) previous.removeSelf();
        var msg = divId("infoNotification", "infoNotification", msgText, HTML.mkButtonOnce(lf("undo"),() => {
            msg.removeSelf();
            undo();
        }));
        elt("root").appendChild(msg);
        var fi = Animation.fadeIn(msg);
        fi.completed = () => {
            var a = Animation.fadeOut(msg);
            a.delay = 4000;
            a.duration = 1000;
            a.begin();
        }
        fi.begin();
    }

    export function showErrorNotification(msgText:string)
    {
        if (Browser.isHeadless) {
            Util.log("error: " + msgText);
            return;
        }

        var msg = div("errorNotification", msgText);
        elt("root").appendChild(msg);
        var a = Animation.fadeOut(msg);
        a.delay = 2000;
        a.duration = 2000;
        a.begin();
    }

    export function showSaveNotification(msgText:string, time = 1000)
    {
        var msg = div("saveNotification", msgText);
        elt("root").appendChild(msg);
        var a = Animation.fadeOut(msg);
        a.delay = time;
        a.duration = 1000;
        a.begin();
        return msg
    }

    export interface NotificationOptions {
      lang?: string;
      body?: string;
      tag?: string;
      icon?: string;
    };


    export function showWebNotification(aTitle: string, aOptions: NotificationOptions = {}, aTimeout=10000) {
        if (!("Notification" in window))
            return;

        if (document.hasFocus())
            return;

        var Notification = (<any>window).Notification;

        var doit = () => {
            var n = new Notification(aTitle, aOptions);
            n.onshow = () => {
                Util.setTimeout(aTimeout, () => n.close());
            }
        };

        if (Notification.permission === "granted") {
            doit();
        } else {
            Notification.requestPermission(function (permission) {
                if (permission === "granted")
                    doit();
            });
        }
    }


    export function mkA(cl:string, href:string, target:string, ...children:any[]):HTMLAnchorElement
    {
        var elt = <HTMLAnchorElement>document.createElement("a");
        elt.href = href;
        elt.target = target;
        if (cl)
            elt.className = cl;
        elt.appendChildren(children);
        return elt;
    }

    export function span(cls:string, ...elts:any[]):HTMLElement
    {
        var r = document.createElement("span")
        if (cls)
            r.className = cls;
        r.setChildren(elts)
        return r;
    }

    export function label(cls:string, ...elts:any[]):HTMLElement
    {
        var r = document.createElement("label")
        if (cls)
            r.className = cls;
        r.setChildren(elts)
        return r;
    }

    export function showNotification(msg: HTMLElement) {
        elt("root").appendChild(msg);
        var a = Animation.fadeOut(msg);
        a.delay = 6000;
        a.duration = 2000;
        a.begin();
    }

    export function showNotificationText(text: string) {
        var msg = div("errorNotification", text);
        showNotification(msg);
    }

    export function showProxyNotification(message: string, url: string)
    {
        var msg = div("errorNotification",
            message, mkBr(), span("smallText", "URL: " + url));
        showNotification(msg);
    }

    export function showCorsNotification(url: string)
    {
        var msg = div("errorNotification",
            lf("Access Denied: Your web browser and the web site prevent cross-origin resource sharing (CORS)."),
            mkA("", Cloud.config.rootUrl + "/docs/CORS", "_blank", "Learn more..."), mkBr(), span("smallText", "URL: " + url));
        showNotification(msg);
    }

    export interface ProgressBar
        extends HTMLElement
    {
        start():void;
        stop():void;
        reset():void;
    }

    export function mkProgressBar():ProgressBar
    {
        var r = <ProgressBar>div("progressBar", Util.range(0, 4).map((v) => div("progressDot progressDot-" + v)));
        HTML.setRole(r, "progressbar");
        var n = 0;
        function update(k: number) {
            n += k;
            if (n < 0) n = 0;
            r.style.display = n > 0 ? "block" : "none";
        }
        update(0);

        if (Browser.noAnimations) {
            r.start = r.stop = r.reset = () => { };
        } else {
            r.start = () => { update(+1) };
            r.stop = () => { update(-1) };
            r.reset = () => { update(-n) };
        }

        return r;
    }

    export interface AutoExpandingTextAreaOptions {
        showDismiss?: boolean;
        editFullScreenAsync?: (text: string) => Promise; // string
    }

    export interface AutoExpandingTextArea {
        div: HTMLElement;
        textarea: HTMLTextAreaElement;
        update: () => void;
        onUpdate: () => void;
        dismiss: HTMLElement;
        onDismiss: () => void;
        fullScreen: HTMLElement;
    }

    export function mkAutoExpandingTextArea(options: AutoExpandingTextAreaOptions = {}): AutoExpandingTextArea
    {
        var ta = HTML.mkTextArea();
        var pre = document.createElement("pre");
        var dismiss: HTMLElement;
        var fullScreen: HTMLElement;
        var btns: HTMLElement;
        if (options.showDismiss || options.editFullScreenAsync) {
            btns = div('close-round-buttons');
            if (options.showDismiss)
                btns.appendChild(dismiss = div('',HTML.mkImg("svg:check,black")).withClick(() => {
                    if (r.onDismiss) r.onDismiss();
                }));
            if (options.editFullScreenAsync)
                btns.appendChild(fullScreen = div('',HTML.mkImg('svg:expand,black')).withClick(() => {
                    options.editFullScreenAsync(ta.value).done(value => {
                        ta.value = value;
                        if (r.onDismiss) r.onDismiss();
                    })
                }));
        }
        var content = span(null, null)
        pre.setChildren([content, mkBr()])
        var update = () => {
            content.textContent = ta.value;
            r.onUpdate();
        }
        Util.onInputChange(ta, update)
        var r = {
          div: div("expandingTextAreaContainer", pre, ta, btns),
          textarea: ta,
          update: update,
          onUpdate: () => {},
          dismiss: dismiss,
          onDismiss: () => { },
          fullScreen: fullScreen,
        }
        return r;
    }

    export function fixWp8Links(...elts:HTMLElement[])
    {
        // if (!Browser.isWP8app) return;

        elts.forEach((elt) => {
            var ch = elt.getElementsByTagName("A");
            for (var i = 0; i < ch.length; ++i) (() => {
                var a = <HTMLAnchorElement>ch[i];
                var href = a.getAttribute("href");
                if (/^#/.test(href)) {
                    a.onclick = () => false;
                    a.withClick(() => {
                        Util.log("navigate " + href);
                        Util.setHash(href)
                        return false;
                    })
                }
            })()
        })
    }

    export var localCdn:string = null;

    export function proxyResource(url:string)
    {
        // Must be idempotent
        if (!url) return url;
        // only do it for az31353.vo.msecnd.net ?
        if (localCdn && !/http:\/\/localhost/i.test(url) &&
            /^(https:\/\/az31353.vo.msecnd.net|http:\/\/cdn.touchdevelop.com|https?:\/\/lexmediaservice3.blob.core.windows.net|https:\/\/tdtutorialtranslator.blob.core.windows.net)/i.test(url)) {
            url = localCdn + encodeURIComponent(url)
        }
        return url
    }

    export function cssImage(url:string, opacity = 1) : string
    {
        if (!url) return "";
        var u = "url(" + proxyResource(url) + ")";
        if (opacity <= 1)
            u = Util.fmt("linear-gradient(to bottom, rgba(255,255,255,{0}) 0%,rgba(255,255,255,{0}) 100%), {1}", (1-opacity).toFixed(3) , u);
        return u;
    }


    export var html5Tags:any = {
// Forbidden
"dialog": -1,       // A dialog box or window
"embed": -1,        // A container for an external (non-HTML) application
"keygen": -1,       // A key-pair generator field (for forms)
"link": -1,         // The relationship between a document and an external resource (most used to link to style sheets)
"meta": -1,         // Metadata about an HTML document
"noscript": -1,     // An alternate content for users that do not support client-side scripts
"object": -1,       // An embedded object
"param": -1,        // A parameter for an object
"script": -1,       // A client-side script
"applet": -1,       // Not supported in HTML5. Use <object> instead.
"frame": -1,        // Not supported in HTML5.
"frameset": -1,     // Not supported in HTML5.
"noframes": -1,     // Not supported in HTML5.
"html": -1,         // The root of an HTML document
"body": -1,         // The document's body
"head": -1,         // Information about the document
"title": -1,        // A title for the document
"form": -1,         // An HTML form for user input
"style": -1,        // Style information for a document

// Not supported.
"basefont": -2,     // Not supported in HTML5. Use CSS instead.
"font": -2,         // Not supported in HTML5. Use CSS instead.
"center": -2,       // Not supported in HTML5. Use CSS instead.
"big": -2,          // Not supported in HTML5. Use CSS instead.
"dir": -2,          // Not supported in HTML5. Use <ul> instead.
"acronym": -2,      // Not supported in HTML5. Use <abbr> instead.
"strike": -2,       // Not supported in HTML5. Use <del> instead.
"tt": -2,           // Not supported in HTML5. Use CSS instead.

// Supported in and outside markdown
"a": 1,             // A hyperlink
"ul": 1,            // An unordered list
"h1": 1,            // Header 1
"h2": 1,            // Header 2
"h3": 1,            // Header 3
"h4": 1,            // Header 4
"h5": 1,            // Header 5
"h6": 1,            // Header 6
"ol": 1,            // An ordered list
"li": 1,            // A list item
"blockquote": 1,    // A section that is quoted from another source
"pre": 1,           // Preformatted text
"b": 1,             // Bold text
"button": 1,        // A clickable button
"code": 1,          // A piece of computer code
"img": 1,           // An image
"strong": 1,        // Important text
"span": 1,          // A section in a document
"br": 1,            // A single line break
"del": 1,           // Text that has been deleted from a document
"div": 1,           // A section in a document
"em": 1,            // Emphasized text
"p": 1,             // A paragraph
"i": 1,             // A part of text in an alternate voice or mood
"u": 1,             // Text that should be stylistically different from normal text
"video": 1,         // A video or movie
"source": 1,        // Multiple media resources for media elements (<video> and <audio>)
"audio": 1,         // Sound content
"track": 1,         // Text tracks for media elements (<video> and <audio>)
"small": 1,         // Smaller text (supported by bootstrap)

"iframe": 1,        // An inline frame

// SVG
"svg": 1,
"path": 1,
"circle": 1,
"g": 1,

// Supported outside markdown
"abbr": 2,          // An abbreviation
"address": 2,       // Contact information for the author/owner of a document
"area": 2,          // An area inside an image-map
"article": 2,       // An article
"aside": 2,         // Content aside from the page content
"bdi": 2,           // Isolates a part of text that might be formatted in a different direction from other text outside it
"bdo": 2,           // Overrides the current text direction
"canvas": 2,        // Used to draw graphics, on the fly, via scripting (usually JavaScript)
"caption": 2,       // A table caption
"cite": 2,          // The title of a work
"col": 2,           // Specifies column properties for each column within a <colgroup> element
"colgroup": 2,      // Specifies a group of one or more columns in a table for formatting
"datalist": 2,      // Specifies a list of pre-defined options for input controls
"dd": 2,            // A description/value of a term in a description list
"details": 2,       // Additional details that the user can view or hide
"dfn": 2,           // Represents the defining instance of a term
"dl": 2,            // A description list
"dt": 2,            // A term/name in a description list
"fieldset": 2,      // Groups related elements in a form
"figcaption": 2,    // A caption for a <figure> element
"figure": 2,        // Specifies self-contained content
"footer": 2,        // A footer for a document or section
"header": 2,        // A header for a document or section
"hgroup": 2,        // A group of headings
"hr": 2,            // A thematic change in the content
"input": 2,         // An input control
"ins": 2,           // A text that has been inserted into a document
"kbd": 2,           // Keyboard input
"label": 2,         // A label for an <input> element
"legend": 2,        // A caption for a <fieldset> element
"main": 2,          // Specifies the main content of a document
"map": 2,           // A client-side image-map
"mark": 2,          // Marked/highlighted text
"menu": 2,          // A list/menu of commands
"menuitem": 2,      // A command/menu item that the user can invoke from a popup menu
"meter": 2,         // A scalar measurement within a known range (a gauge)
"nav": 2,           // Navigation links
"optgroup": 2,      // A group of related options in a drop-down list
"option": 2,        // An option in a drop-down list
"output": 2,        // The result of a calculation
"progress": 2,      // Represents the progress of a task
"q": 2,             // A short quotation
"rp": 2,            // What to show in browsers that do not support ruby annotations
"rt": 2,            // An explanation/pronunciation of characters (for East Asian typography)
"ruby": 2,          // A ruby annotation (for East Asian typography)
"s": 2,             // Text that is no longer correct
"samp": 2,          // Sample output from a computer program
"section": 2,       // A section in a document
"select": 2,        // A drop-down list
"sub": 2,           // Subscripted text
"summary": 2,       // A visible heading for a <details> element
"sup": 2,           // Superscripted text
"table": 2,         // A table
"tbody": 2,         // Groups the body content in a table
"td": 2,            // A cell in a table
"textarea": 2,      // A multiline input control (text area)
"tfoot": 2,         // Groups the footer content in a table
"th": 2,            // A header cell in a table
"thead": 2,         // Groups the header content in a table
"time": 2,          // A date/time
"tr": 2,            // A row in a table
"var": 2,           // A variable
"wbr": 2,           // A possible line-break
    }

    var html5Attributes = {
        // URL
        "src": 1,
        "srcset": 1,
        "href": 1,

        "xmlns": 1, //SVG

        // non-URL
        "class": 2,
        "frameborder": 2,
        "allowfullscreen": 2,
        "alt": 2,
        "style": 2,
        "type":2,
        "target": 2,
        "rel": 2,
        "name": 2,
        "translate": 2,
        "dir": 2,
        "id": 2,
        "width": 2,
        "height": 2,
        "placeholder": 2,
        "title":2,
        // video
        "controls": 2,
        "autoplay": 2,
        "disabled": 2,

        // accessibility,
        "role":2,
        "aria-atomic": 2,
        "aria-busy": 2,
        "aria-controls": 2,
        "aria-describedby": 2,
        "aria-disabled": 2,
        "aria-dropeffect": 2,
        "aria-flowto": 2,
        "aria-grabbed": 2,
        "aria-haspopup": 2,
        "aria-hidden": 2,
        "aria-invalid": 2,
        "aria-label": 2,
        "aria-labelledby": 2,
        "aria-live": 2,
        "aria-owns": 2,
        "aria-relevant": 2,
        // svg
        "viewbox": 2,
        "preserveaspectratio": 2,
        "fill": 2,
        "d": 2,
        "cx": 2,
        "cy": 2,
        "r": 2,
        "stroke": 2,
        "stroke-width": 2,
        "transform": 2,
        "fill-opacity": 2,
        "stroke-miterlimit": 2,
        "stroke-dasharray": 2,
    }

    function htmlOops(msg:string, html:string, other?:string)
    {
        //console.log("HTML: " + html)
        //console.log("HTML: " + msg + ": " + other)

        if (other) msg += ": " + other.slice(0, 100)
        var err:any = new Error("Critical: HTML sanitization failure, " + msg)
        err.bugAttachments = [html]
        if (other && other.length > 100) err.bugAttachments.push(other)
        throw err
    }

    function validateTag(t:string, html:string) {
        if (/^\!--.*--$/.exec(t))
             return

        var m = /^\/?([a-zA-Z0-9]+)(\s|\/?$)/.exec(t)
        if (!m) htmlOops("no tag name", html, t)
        var tn = m[1].toLowerCase()
        if (!html5Tags.hasOwnProperty(tn))
            htmlOops("unknown tag", html, tn)
        var v = html5Tags[tn]
        if (v !== 1)
            htmlOops("tag not allowed, " + v, html, tn)

        t = t.slice(m[0].length)

        while (!/^\s*\/?$/.test(t)) {
            m = /^\s*([a-zA-Z0-9-]+)($|\s|="([^"]*)"|='([^']*)'|=([a-zA-Z0-9]+))/.exec(t)
            if (!m) htmlOops("cannot parse html attribute", html, t)
            var an = m[1].toLowerCase()
            var av = m[3] || m[4] || m[5] || ""
            if (/^data-/.test(an)) {}
            else if (!html5Attributes.hasOwnProperty(an))
                htmlOops("unknown attribute", html, t)
            else {
                var kk = html5Attributes[an]
                if (kk == 1) {
                    if (!/^(http|\/|\.\/|#|mailto:)/i.test(av))
                        htmlOops("bad URL", html, t)
                } else if (kk == 2) {
                } else {
                    htmlOops("forbidden attribute", html, t)
                }
            }
            t = t.slice(m[0].length)
        }
    }

    export function sanitizeHTML(html:string) : string
    {
        if (!isBeta) return html
        if (!html) return html;
        try {
            var reminder = html.replace(/<([^<>]+)>/g, (allm, t) => {
                validateTag(t, html)
                return "(tag)"
            })

            if (/[<>]/.test(reminder)) {
                htmlOops("unexpected tag", html, reminder)
            }

            return html

        } catch (e) {
            Util.reportError("html", e, false)
            return html
        }
    }

    export function allowedTagName(tn:string)
    {
        tn = tn.toLowerCase()
        if (!html5Tags.hasOwnProperty(tn))
            return false
        var v = html5Tags[tn]
        return v === 1 || v === 2
    }

    export function allowedAttribute(name: string, val: string) {
        if (/^data-/.test(name))
            return true
        if (!html5Attributes.hasOwnProperty(name))
            return false
        var v = html5Attributes[val]
        if (v === 1)
            // essentially, we want to exclude javascript:..., but it can be written in many ways, so we go for a white-list instead
            return /^(http|\/|\.\/|#|mailto:)/.test(val)
        else if (v === 2)
            return true
        else
            return false
    }
}
