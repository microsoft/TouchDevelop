///<reference path='refs.ts'/>
module TDev.RT.Wab {
    export function TagsInit()
    {
        if (isSupportedAction(Action.START_SEND_NFC_MESSAGE)) {
            Util.log('wab: boosting START_SEND_NFC_MESSAGE');
            Tags.sendNFC = TagsWab.sendNFC;
        }

        if (isSupportedAction(Action.START_RECEIVE_NFC_MESSAGE)) {
            Util.log('wab: boosting START_RECEIVE_NFC_MESSAGE');
            Tags.receiveNFC = TagsWab.receiveNFC;
        }
    }

    export module TagsWab {
        export function sendNFC(writeTag: boolean, type: string, value : string, sent : (id : number) => void, transferred : () => void) { // number
            Util.log("wab: sending nfc tag");
            var mid: number = 0;
            sendRequest(<StartSendNfcMessageRequest>{ action: Action.START_SEND_NFC_MESSAGE, value: value, type: type, writeTag:writeTag },
                (response: SendNfcMessageResponse) => {
                    Util.log("wab: send nfc tag status: " + response.status);
                    if (response.status == Status.OK) {
                        if (response.transferred) {
                            Util.log("wab: send nfc transferred: " + response.id);
                            transferred();
                        }
                        else {
                            mid = response.id;
                            Util.log("wab: send nfc id: " + mid);
                            sent(mid);
                        }
                    }
                });
        }

        export function receiveNFC(type: string, sent : (id : number) => void, received : (string) => void) { // number
            Util.log("wab: receiving nfc tag");
            var mid: number = 0;
            sendRequest(<StartReceiveNfcMessageRequest>{ action: Action.START_RECEIVE_NFC_MESSAGE, type: type },
                (response: ReceiveNfcMessageResponse) => {
                    Util.log("wab: receive nfc tag status: " + response.status);
                    if (response.status == Status.OK) {
                        if (response.received) {
                            Util.log("wab: receive nfc received: " + response.id);
                            received(response.value);
                        }
                        else {
                            mid = response.id;
                            Util.log("wab: receive nfc id: " + mid);
                            sent(mid);
                        }
                    }
                });
        }
    }
}
