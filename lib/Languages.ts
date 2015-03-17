///<reference path='refs.ts'/>
declare class EventArgs {}
interface EventHandler {
    (sender: Object, args: EventArgs): void;
}
declare class SpeechRecognition {
        constructor();
        //public grammars : SpeechGrammarList;
        public lang : string;
        public continuous : boolean;
        public interimResults : boolean;
        public maxAlternatives : number;
        public serviceURI : string;

        // methods to drive the speech interaction
        public start();
        public stop();
        public abort();

        // event methods
        public onaudiostart : EventHandler;
        public onsoundstart : EventHandler;
        public onspeechstart : EventHandler;
        public onspeechend : EventHandler;
        public onsoundend : EventHandler;
        public onaudioend : EventHandler;
        public onresult : EventHandler;
        public onnomatch : EventHandler;
        public onerror : EventHandler;
        public onstart : EventHandler;
        public onend : EventHandler;
}
declare class SpeechSynthesis {
    constructor();
    public pending : boolean;
    public speaking : boolean;
    public paused: boolean;

    public speak(utterance : SpeechSynthesisUtterance);
    public cancel();
    public pause();
    public resume();
    //getVoices() : SpeechSynthesisVoiceList;
}

declare class SpeechSynthesisUtterance {
    constructor(text : string);
    public text : string;
    public lang : string;
    public voiceURI : string;
    public volume : number;
    public rate: number;
    public pitch : number;

    //  attribute EventHandler onstart;
    //  attribute EventHandler onend;
    //  attribute EventHandler onerror;
    //  attribute EventHandler onpause;
    //  attribute EventHandler onresume;
    //  attribute EventHandler onmark;
    //  attribute EventHandler onboundary;
}

module TDev.RT {
    export module WebSpeechManager {
        function initialize() {
            var a = <any>window;
            if (a && !a.SpeechRecognition) {
                a.SpeechRecognition = a.SpeechRecognition ||
                        a.webkitSpeechRecognition ||
                        a.mozSpeechRecognition ||
                        a.oSpeechRecognition ||
                        a.msSpeechRecognition;
            }
            if (a && !a.SpeechSynthesisUtterance) {
                a.SpeechSynthesisUtterance = a.SpeechSynthesisUtterance ||
                a.webkitSpeechSynthesisUtterance ||
                a.mozSpeechSynthesisUtterance ||
                a.oSpeechSynthesisUtterance ||
                a.msSpeechSynthesisUtterance;
            }
        }
        export function isSupported() : boolean {
            return isRecognitionSupported() || isSynthesisSupported();
        }
        export function isRecognitionSupported(): boolean {
            initialize();
            var a = <any>window;
            return !!a.SpeechRecognition;
        }
        export function isSynthesisSupported(): boolean {
            initialize();
            var a = <any>window;
            return !!a.speechSynthesis && !!a.SpeechSynthesisUtterance;
        }
        export function createRecognition() : SpeechRecognition {
            return isRecognitionSupported() ? new SpeechRecognition() : undefined;
        }
        export function createSynthesis() : SpeechSynthesis {
            return isSynthesisSupported() ? <SpeechSynthesis>((<any>window).speechSynthesis) : undefined;
        }
    }
    export module MicrosoftTranslator
    {
        export function createTranslateButton(cls : string, tk : Ticks, elementDiv : HTMLElement, from : string, button = false, replaceContent = false) : HTMLElement {
            var current = TDev.RT.Languages.current_language();
            if (from.toLowerCase() == current.toLowerCase()) return null;

            var translateBtn: HTMLElement = null;
            var trDiv = div('translated');
            var translateCmt = () => {
                tick(tk);
                if (Cloud.anonMode(lf("translation"))) return;
                translateBtn.setFlag("working", true);
                TDev.RT.MicrosoftTranslator.translateAsync(from || '', current, elementDiv.innerHTML, true)
                    .done(translated => {
                        replaceContent = replaceContent && translated;
                        Browser.setInnerHTML(trDiv, translated ? translated : lf(":( Sorry, we could not translate this."));
                        translateBtn.setFlag("working", false);
                        translateBtn.removeSelf();
                        if (replaceContent)
                            elementDiv.setChildren([trDiv]);
                        else
                            elementDiv.appendChild(trDiv);
                    }, e => {
                        translateBtn.setFlag("working", false);
                        var trDiv = div('translated');
                        Browser.setInnerHTML(trDiv, lf(":( Sorry, an error occured while translating this text."));
                        elementDiv.appendChild(trDiv);
                    });
            }
            translateBtn = createElement(button ? "button" : "div", cls, lf("translate")).withClick(translateCmt);
            return translateBtn;
        }

        // Translates some text between two languages using Bing. Empty source language to auto-detect. 5000 characters max.
        export var translateAsync = (source_lang: string, target_lang: string, text: string, html : boolean): Promise =>
        {
            if (!target_lang) {
                Time.log('translate: missing target language');
                return Promise.as(undefined);
            }
            if (!text || source_lang === target_lang)
                return Promise.as(text);
            if (text.length >= 10000) {
                Time.log('translate: text too long, 10000 characeters max');
                return Promise.as(undefined);
            }

            var url = 'runtime/languages/translate?'
                + 'to=' + encodeURIComponent(target_lang)
                + '&text=' + encodeURIComponent(text);
            if (source_lang)
                url += '&from=' + encodeURIComponent(source_lang);
            if (html)
                url += '&html=true';

            var request = WebRequest.mk(Cloud.getPrivateApiUrl(url), undefined);
            return request.sendAsync()
                .then((response: WebResponse) => {
                    var translated = response.content_as_json();
                    return translated ? translated.to_string() : undefined;
                });
        }

        export var detectAsync = (text: string) : Promise =>
        {
            if (text.length == 0) {
                return Promise.as(undefined);
            }

            var url = 'runtime/languages/detect?text=' + encodeURIComponent(text);
            var request = WebRequest.mk(Cloud.getPrivateApiUrl(url), undefined);
            return request.sendAsync()
                .then((response : WebResponse) => {
                    var lg = response.content_as_json();
                    return lg.to_string();
                });
        }

        export function speakTranslator(lang: string, text: string): Sound {
            var url = 'runtime/languages/speak?language=' + encodeURIComponent(lang || Languages.current_language()) + '&text=' + encodeURIComponent(text || "");
            var snd = Sound.mk(url, SoundUrlTokenDomain.TouchDevelop, 'audio/mp4');
            return snd;
        }

        export var speak = speakTranslator;
    }

    //? Translation, speech to text, ...
    //@ skill(2)
    export module Languages
    {

        //? Gets the current language code, to be used in the 'translate' method.
        export function current_language(): string
        {
            return navigator.userLanguage || <string>(<any>navigator).language || "en-US";
        }

        //? Converts a sound to a text using Project Hawaii from Microsoft Research.
        //@ stub cap(hawaii) flow(SinkSafe)
        //@ [speech].readsMutable
        //@ [lang].defl("en") [speech].deflExpr('senses->record_microphone')
        //@ obsolete stub
        export function speech_to_text(lang:string, speech:Sound) : string
        { return undefined; }

        //? Extracts text in the picture using Project Hawaii from Microsoft Research.
        //@ async cap(hawaii) flow(SinkSafe) returns(string)
        //@ [pic].readsMutable
        //@ [lang].defl("en")
        export function picture_to_text(lang: string, pic: Picture, r : ResumeCtx) // : string
        {
            var url = 'runtime/languages/pictureToText';

            var privateUrl = Cloud.getPrivateApiUrl(url);
            var request = WebRequest.mk(privateUrl, undefined);
            pic.initAsync().done(() => {
                request.setContentAsPictureInternal(pic, 0.75);
                request.set_method("POST");
                r.progress('Analyzing picture...');
                request
                    .sendAsync()
                    .done((response : WebResponse) => {
                        var text = response.content();
                        r.resumeVal(text)
                    });
            })
        }

        export function isSpeechSupported() : boolean {
            return WebSpeechManager.isSupported();
        }

        //? Converts the microphone dictation to text.
        //@ uiAsync cap(speech) flow(SourceMicrophone) returns(string)
        export function record_text(r : ResumeCtx) //: string
        {
            var recognition = WebSpeechManager.createRecognition();
            if (!recognition) {
                Wall.ask_string("please enter your text", r);
                return;
            }

            var res = "";
            var m = new ModalDialog();
            var status = div('wall-dialog-body', 'initializing...');
            var btns;
            m.add(div('wall-dialog-header', 'recording text'));
            m.add(status);
            m.onDismiss = () => r.resumeVal("");

                recognition.continuous = false; // stop when user stops talking
                recognition.interimResults = false; // only report final results

                recognition.onstart = (e) => {
                    Util.log('speech recog: start');
                    status.setChildren(['time to talk!']);
                }
                recognition.onresult = (e : any) => {
                    Util.log('speech recog: onresult');
                    for (var i = e.resultIndex; i < e.results.length; ++i) {
                        if (e.results[i].isFinal)
                            res += e.results[i][0].transcript;
                    }
                    status.setChildren([res]);
                    m.add(btns = div('wall-dialog-buttons',
                        HTML.mkButton('cancel', () => m.dismiss()),
                        HTML.mkButton('try again', () => {
                            btns.removeSelf();
                            tryRecognition();
                        }),
                        HTML.mkButton('ok', () => {
                            m.onDismiss = null;
                            m.dismiss();
                            r.resumeVal(res);
                        }))
                    );
                };
                recognition.onerror = e => {
                    Util.log('speech recog: onerror');
                    status.setChildren(['oops, couldn\'t understand what you said.']);

                    m.add(btns = div('wall-dialog-buttons',
                        HTML.mkButton('cancel', () => m.dismiss()),
                        HTML.mkButton('try again', () => {
                            btns.removeSelf();
                            tryRecognition();
                        }))
                    );
                }
                recognition.lang = Languages.current_language();

            function tryRecognition() {
                res = "";
                recognition.start();
            }
            tryRecognition();
            m.show();

        }

        //? Translates some text between two languages using Bing. Empty source language to auto-detect.
        //@ async cap(translation) flow(SinkSafe) returns(string)
        //@ [target_lang].defl("fr") [text].defl("hello")
        export function translate(source_lang: string, target_lang: string, text: string, r : ResumeCtx)//: string
        {
            var rt = r.rt;
            Cloud.authenticateAsync(lf("translation"))
                .then((authenticated) => {
                    if (authenticated) return MicrosoftTranslator.translateAsync(source_lang, target_lang, text, false)
                    else return Promise.as(undefined);
                })
                .done(translated => r.resumeVal(translated));
        }

        //? Automatically detects the language of a given text using Bing.
        //@ async cap(translation) flow(SinkSafe) returns(string)
        export function detect_language(text: string, r: ResumeCtx) //: string
        {
            var rt = r.rt;
            Cloud.authenticateAsync(lf("translation"))
                .then((authenticated) => {
                    if (authenticated) return MicrosoftTranslator.detectAsync(text)
                    else return Promise.as(undefined);
                })
                .done((lang) => r.resumeVal(lang));
        }

        //? This api was renamed. Use `speak_text` instead.
        //@ cap(translation) flow(SinkSafe) obsolete
        //@ [result].writesMutable
        //@ [lang].defl("en") [text].defl("")
        export function speak(lang: string, text: string) : Sound
        {
            return MicrosoftTranslator
                .speakTranslator(lang, text);
        }

        //? Speaks the text immediately using the text-to-speech engine on the device.
        //@ async cap(speech)
        //@ [voice_language].defl("") [voice_gender].deflStrings("female", "male") [text].defl("")
        //@ import("cordova", "org.apache.cordova.speech.speechsynthesis")
        export function speak_text(voice_language: string, voice_gender : string, text: string, r : ResumeCtx) {
            if (!text) {
                r.resume();
                return;
            }

            var synthesis = WebSpeechManager.createSynthesis();
            if (synthesis) {
                var utterance = new SpeechSynthesisUtterance(text);
                utterance.lang = voice_language || Languages.current_language();
                synthesis.speak(utterance);
                r.resume();
            } else {
                var snd = MicrosoftTranslator .speak(voice_language, text);
                if (snd)
                    snd.play(r);
                else
                    r.resume();
            }
        }

        //? Speaks the SSML markup immediately using the text-to-speech engine on the device.
        //@ async cap(speech)
        //@ import("cordova", "org.apache.cordova.speech.speechsynthesis")
        export function speak_ssml(ssml: XmlObject, r : ResumeCtx) {
            var synthesis = WebSpeechManager.createSynthesis();
            if (synthesis) {
                var utterance = new SpeechSynthesisUtterance(ssml.toString());
                synthesis.speak(utterance);
                r.resume();
            } else {
                var text = ssml.value();
                var snd = MicrosoftTranslator .speak(Languages.current_language(), text);
                if (snd)
                    snd.play(r);
                else
                    r.resume();
            }
        }
    }
}
