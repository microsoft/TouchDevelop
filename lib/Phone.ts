///<reference path='refs.ts'/>
module TDev.RT {
    //? Phone numbers, vibrate, etc...
    export module Phone
    {
        //? Starts a phone call
        //@ flow(SinkSharing) uiAsync
        export function dial_phone_number(n: string, r : ResumeCtx): void
        {
            var m = new ModalDialog();
            m.add([div("wall-dialog-header", lf("call number")),
                     div("wall-dialog-body", n)]);
            if (Browser.isCellphone)
                m.add(div("wall-dialog-body", lf("note: install the Skype app to place Skype calls.")));
            else
                m.add(div("wall-dialog-body", lf("note: Phone calls might not be supported on this platform. Install the Skype app to place Skype calls.")));
            m.add(div("wall-dialog-buttons", [
                        HTML.mkButton(lf("call"), () => {
                            m.onDismiss = null;
                            m.dismiss();
                            var url = "tel:" + encodeURIComponent(n || " ");
                            Web.browse(url, r);
                         }),
                        HTML.mkButton(lf("Skype"), () => {
                            m.onDismiss = null;
                            m.dismiss();
                            var url = "skype:" + encodeURIComponent(n || " ");
                            Web.browse(url, r);
                         }),
                     ]));
            m.onDismiss = () => r.resume();
            m.show();

        }

        //? Chooses a phone number from the contact list
        //@ cap(contacts) flow(SourceContacts) returns(Link) uiAsync
        export function choose_phone_number(r: ResumeCtx)
        {
            Social.chooseContactAsync().done(c => {
                var url: string = c ? (c.phone_number() || c.work_phone() || c.home_phone()) : "";
                if (url)
                    r.resumeVal(Link.mk(url, LinkKind.phoneNumber));
                else
                    r.resumeVal(undefined);
            });
        }

        //? Allows the user to save the phone number
        //@ cap(contacts) flow(SinkContacts)
        export function save_phone_number(phone_number: string): void {
            // does nothing
        }

        //? Obsolete, use social->save contact instead
        //@ obsolete cap(contacts) flow(SinkContacts) uiAsync
        export function save_contact(contact: Contact): void {
            Social.save_contact(contact);
        }

        //? Vibrates the phone for ... seconds (0.02 minimum)
        //@ [seconds].defl(0.1)
        //@ import("cordova", "org.apache.cordova.vibration")
        export function vibrate(seconds: number): void {
            vibrateCore(seconds)
        }

        export var vibrateCore = (seconds: number): void => {
            if ((<any>window).navigator.vibrate) {
                var ms = Math.min(5, Math.max(0.02, seconds)) * 1000.0;
                (<any>window).navigator.vibrate(ms);
            }
        }

        //? Chooses an address from the contacts
        //@ cap(contacts) flow(SourceContacts) returns(Link) uiAsync
        export function choose_address(r: ResumeCtx) {
            Social.chooseContactAsync().done((c : Contact) => {
                var url: string = c ? (c.home_address() || c.work_address()) : "";
                if (url)
                    r.resumeVal(Link.mk(url, LinkKind.address));
                else
                    r.resumeVal(undefined);
            });
        }

        //? Indicates if the phone is on 'battery' or 'external' power source.
        //@ returns(string) quickAsync
        export function power_source(r : ResumeCtx) { //: string {
            r.resumeVal("");
        }
    }
}
