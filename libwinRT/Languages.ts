///<reference path='refs.ts'/>
module TDev.RT {
    export function LanguagesInit()
    {
        (<any>Languages).picture_to_text = function picture_to_text(lang: string, pic: Picture, r : ResumeCtx) // : string
        {
            if (!ApiManager.projectHawaiiKey) {
                Time.log('Missing Project Hawaii API Key. Please edit /js/apikey.js to fix this issue.');
                r.resumeVal(undefined);
            }

            pic.initAsync().done(() => {
                var request = Web.create_request("http://api.hawaii-services.net/Ocr/V1/OcrServiceRest.svc/Ocr");
                request.set_header('Authorization', 'Basic ' + Util.base64Encode(ApiManager.projectHawaiiKey));
                request.set_method('post');
                request.set_accept('application/xml');
                request.setContentAsPictureInternal(pic, 0.8);
                r.progress('Analyzing picture...');
                request
                    .sendAsync()
                    .done((response : WebResponse) => {
                        var xml = response.content_as_xml();
                        if (xml) {
                            var text = "";
                            var ocrtexts = xml.child('OcrTexts');
                            if (ocrtexts) {
                                ocrtexts = ocrtexts.children('OcrText');
                                for (var i = 0; i < ocrtexts.count(); ++i) {
                                    var words = ocrtexts.at(i).child('Words');
                                    if (words) {
                                        words = words.children('OcrWord');
                                        for (var j = 0; j < words.count(); ++j) {
                                            var word = words.at(j);
                                            var t = word.child('Text');
                                            if (t) text += t.value();
                                        }
                                    }
                                }
                            }
                            r.resumeVal(text);
                        }
                        else
                            r.resumeVal("");
                    });
            })

        }
    }
}
