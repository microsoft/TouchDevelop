///<reference path='refs.ts'/>
module TDev.RT {
    //? 2D barcodes, QR codes and NFC tags
    //@ skill(3)
    export module Tags
    {
        export var sendNFC = (writeTag:boolean, type : string, value: string, sent : (id : number) => void, transferred : () => void) =>
        {
            transferred();
        }

        export var stopSendNFCAsync = (id:number): Promise =>
        { // number
            return Promise.as();
        }

        export var receiveNFC = (type : string, sent : (id : number) => void, received : (value : string) => void) =>
        {
            received('');
        }

        export var stopReceiveNFCAsync = (id:number): Promise =>
        { // number
            return Promise.as();
        }

        function askProximityAccessAsync(r: Runtime): Promise { // boolean
            return r.host.askSourceAccessAsync("proximity", "send and receive data using NFC.", false);
        }

        function sendNFCDialogAsync(writeTag : boolean, type: string, value: string): Promise {
            return new Promise((onSuccess, onError, onProgress) => {
                var mid : number = 0;
                var m = new ModalDialog();
                m.onDismiss = () => {
                    Tags.stopSendNFCAsync(mid).done();
                    onSuccess(undefined);
                };
                if (writeTag) {
                    m.add(div('wall-dialog-header', 'write tag'));
                    m.add(div('wall-dialog-body', 'Place your device near your tag to write it.'));
                } else {
                    m.add(div('wall-dialog-header', 'tap+send'));
                    m.add(div('wall-dialog-body', 'Go ahead and tap your device to another device that supports NFC.'));
                }
                m.add(div('wall-dialog-buttons',
                    HTML.mkButton('cancel', () => {
                        Util.log('nfc: user cancel');
                        m.dismiss();
                    })));
                m.show();
                Tags.sendNFC(writeTag, type, value, (publishId) => {
                    mid = publishId;
                    Util.log('nfc: message id: ' + mid);
                }, () => {
                    mid = 0;
                    m.dismiss();
                    Util.log('nfc: transferred id: ' + mid);
                });
            });
        }

        function receiveNFCDialogAsync(type: string): Promise {
            return new Promise((onSuccess, onError, onProgress) => {
                var mid : number = 0;
                var m = new ModalDialog();
                var value :string = undefined;
                m.onDismiss = () => {
                    Tags.stopReceiveNFCAsync(mid).done();
                    onSuccess(value);
                };
                m.add(div('wall-dialog-header', 'tap+receive'));
                m.add(div('wall-dialog-body', 'Go ahead and tap your device to another device that supports NFC.'));
                m.add(div('wall-dialog-buttons',
                    HTML.mkButton('cancel', () => {
                        Util.log('nfc: user cancel');
                        m.dismiss();
                    })));
                m.show();
                Tags.receiveNFC(type, (publishId) => {
                    mid = publishId;
                    Util.log('nfc: message id: ' + mid);
                }, (v) => {
                    value = v;
                    mid = 0;
                    m.dismiss();
                    Util.log('nfc: transferred id: ' + mid);
                });
            });
        }

        //? Receives text through NFC. `type` may also be a mime type.
        //@ uiAsync cap(proximity) returns(string)
        //@ [type].deflStrings("text", "url", "vcard")
        export function nfc_receive(type: string, r: ResumeCtx) { //: string {
            receiveNFCDialogAsync(type)
                .done(v => r.resumeVal(v || ''));
        }

        //? Receives a picture through NFC.
        //@ uiAsync cap(proximity) returns(Picture)
        export function nfc_receive_picture(r: ResumeCtx) {
            receiveNFCDialogAsync('image/jpeg')
                .then(v => Picture.fromUrl(v))
                .done(p => r.resumeVal(p));
        }

        //? Sends a url, text or any other text format using NFC. `type` may be a mime type.
        //@ uiAsync cap(proximity)
        //@ [type].deflStrings("text", "url", "vcard")
        export function nfc_send(type: string, value: string, r: ResumeCtx) {
            if (!value) {
                r.resume();
                return;
            }
            askProximityAccessAsync(r.rt)
                .then(allow => {
                    if (allow) return sendNFCDialogAsync(false, type, value);
                    else return Promise.as();
                }).done(() => r.resume())
        }

        //? Sends a url, text or any other format using NFC. `type` may be a mime type.
        //@ uiAsync cap(proximity)
        export function nfc_send_picture(pic : Picture, r: ResumeCtx) {
            askProximityAccessAsync(r.rt)
                .then(allow => {
                    if (allow)
                        return pic.initAsync()
                            .then(() => sendNFCDialogAsync(false, 'picture', pic.getDataUri()));
                    else return Promise.as();
                }).done(() => r.resume())
        }

        //? Writes a static NFC tag with url, text or any other format. `type` may be a mime type.
        //@ uiAsync cap(proximity)
        //@ [type].deflStrings("url", "text", "vcard")
        export function nfc_write_tag(type: string, value: string, r: ResumeCtx) {
            askProximityAccessAsync(r.rt)
                .then(allow => {
                    if (allow) {
                        if (type == "app")
                            value = "scriptid=" + r.rt.currentScriptId + "&" + value;
                        return sendNFCDialogAsync(true, type, value);
                    }
                    else return Promise.as();
                }).done(() => r.resume())
        }

        function tag(text: string, size: number, bw: boolean, kind: string, r : ResumeCtx)
        {
            if (size < 0.75) size = 0.75;
            else if (size > 3) size = 3;
            if (text.length > 1000) text = text.substr(0, 1000);

            var url = 'runtime/tags/tag?kind=' + encodeURIComponent(kind)
                + '&size=' + encodeURIComponent(size.toString())
                + '&bw=' + (bw ? 'true' : 'false')
                + '&text=' + text;
            var purl = Cloud.getPrivateApiUrl(url);
            Picture.fromUrl(purl)
                .then((p: Picture) => r.resumeVal(p));
        }

        //? Generates a 2D barcode pointing to the url using Microsoft Tag. url must be less than 1000 character long and size must be between 0.75 and 5 inches.
        //@ async cap(editoronly) flow(SinkSharing) returns(Picture)
        //@ [result].writesMutable
        //@ [size].defl(1) [bw].defl(true)
        export function tag_url(url: string, size: number, bw: boolean, r: ResumeCtx) // : Picture
        {
            tag(url, size, bw, 'url', r);
        }

        //? Generates a 2D barcode pointing to the text using Microsoft Tag. text must be less than 1000 character long and size must be between 0.75 and 5 inches.
        //@ async cap(editoronly) flow(SinkSharing) returns(Picture)
        //@ [result].writesMutable
        //@ [size].defl(1) [bw].defl(true)
        export function tag_text(text:string, size:number, bw:boolean, r : ResumeCtx) //: Picture
        {
            tag(text, size, bw, 'text', r);
        }

        //? Scans an id tag created by Touch Develop and returns the embedded text.
        //@ dbgOnly stub
        export function scan() : string
        { return ''; }
    }
}
