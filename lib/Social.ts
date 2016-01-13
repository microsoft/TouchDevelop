///<reference path='refs.ts'/>
module TDev.RT {
    //? Emails, sms, contacts, calendar, ...
    //@ skill(2)
    export module Social
    {
        //? Opens the mail client
        //@ flow(SinkSharing) uiAsync
        export function send_email(to:string, subject:string, body:string, r : ResumeCtx) : void
        {
            var url = "mailto:" + encodeURIComponent(to || " ") + "?subject=" + encodeURIComponent(subject || " ") + "&body=" + encodeURIComponent(body);
            Web.browse(url, r);
        }

        //? Allows the user to save the email address (email)
        //@ cap(contacts) flow(SinkContacts)
        export function save_email(email_address: string): void {
            ModalDialog.showText(email_address, 'save email', 'Saving emails is not supported on this platform. Please copy and save this email manually.');
        }

        //? Saves a new contact
        //@ cap(contacts) flow(SinkContacts)
        export function save_contact(contact: Contact): void {
            ModalDialog.showText(contact.toFullString(), 'save contact', 'Saving contacts is not supported on this platform. Please copy and save this contact manually.');
        }

        export var sendSmsAsync = (to: string, body: string): Promise => {
            var url = "sms:" + encodeURIComponent(to || " ") + "?body=" + encodeURIComponent(body);
            return Web.browseAsync(url);
        }

        //? Opens the short message client (to, body)
        //@ flow(SinkSharing) uiAsync
        export function send_sms(to: string, body: string, r : ResumeCtx): void
        {
            return sendSmsAsync(to, body).done(() => r.resume());
        }

        //? Creates a link from a phone number
        //@ [result].writesMutable
        export function link_phone_number(phone_number: string): Link { return Link.mk(phone_number, LinkKind.phoneNumber); }

        //? Creates a link from an email
        //@ [result].writesMutable
        export function link_email(email_address: string): Link { return Link.mk(email_address, LinkKind.email); }

        //? Creates a message to share
        //@ [result].writesMutable
        export function create_message(message: string): Message { return Message.mk(message); }

        //? Creates a place
        //@ [result].writesMutable
        export function create_place(name: string, location: Location_): Place { return Place.mk(name, location); }

        //? Creates a new contact
        //@ [nickname].writesMutable
        //@ [result].writesMutable
        export function create_contact(nickname: string): Contact { return Contact.mk(nickname); }
    }
}
