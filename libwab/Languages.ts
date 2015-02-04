///<reference path='refs.ts'/>
module TDev.RT.Wab {
    export function LanguagesInit()
    {
        var Languages = <any>TDev.RT.Languages;
        if (isSupportedAction(Action.DICTATE)) {
            Util.log('wab: boosting DICTATE');
            Languages.record_text = LanguagesWab.record_text;
        }

        if (isSupportedAction(Action.SPEAK_TEXT)) {
            Util.log('wab: boosting SPEAK_TEXT');
            Languages.speak_text = LanguagesWab.speak_text;
        }

        if (isSupportedAction(Action.SPEAK_SSML)) {
            Util.log('wab: boosting SPEAK_SSML');
            Languages.speak_ssml = LanguagesWab.speak_ssml;
        }
    }

    export module LanguagesWab {
        export function record_text(r: ResumeCtx) {
            sendRequest({ action: Action.DICTATE },
                (response: DictateResponse) => {
                    if (response.status === Status.OK)
                        r.resumeVal(response.text);
                    else
                        r.resumeVal('');
                });
        }

        export function speak_text(voice_language: string, voice_gender: string, text: string, r: ResumeCtx) {
            sendRequest(<SpeakTextRequest>{ action: Action.SPEAK_TEXT, language: voice_language, gender: voice_gender, text: text },
                (response) => r.resume());
        }

        export function speak_ssml(ssml: XmlObject, r: ResumeCtx) {
            sendRequest(<SpeakSsmlRequest>{ action: Action.SPEAK_SSML, markup: ssml.toString() },
                (response) => r.resume());
        }
    }
}
