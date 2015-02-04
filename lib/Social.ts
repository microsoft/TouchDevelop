///<reference path='refs.ts'/>
module TDev.RT {
    //? Emails, sms, contacts, calendar, ...
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

        //? Searches for recent messages in a social network (twitter, facebook)
        //@ async flow(SinkSafe) returns(Collection<Message>) obsolete
        //@ [result].writesMutable
        //@ [network].deflStrings("facebook", "twitter")
        export function search(network: string, terms: string, r: ResumeCtx) // : Collection<Message>
        {
            var links = Collections.create_message_collection();
            r.resumeVal(links);

            /*
            var url = Cloud.getPrivateApiUrl('runtime/social/search?network=' + encodeURIComponent(network) + '&query=' + encodeURIComponent(terms));
            var request = WebRequest.mk(url, undefined);
            request
                .sendAsync()
                .then((response: WebResponse) =>
                {
                    try {
                        var json = response.content_as_json();
                        if (json) {
                            var links = Collections.create_message_collection();
                            for (var i = 0; i < json.count(); ++i) {
                                var m = json.at(i);
                                var msg = Social.create_message(m.string("message"));
                                msg.set_from(m.string('from'));
                                if (m.contains_key('time'))
                                    msg.set_time(m.time('time'));
                                msg.set_link(m.string('link'));
                                msg.set_picture_link(m.string('picturelink'));
                                msg.set_source(m.string('source'));
                                var loc = m.field('loc');
                                if (loc)
                                    msg.set_location(Location_.mkShort(loc.number('latitude'), loc.number('longitude')));
                                links.add(msg);
                            }
                            r.resumeVal(links);
                            return;
                        }
                    }
                    catch (ex) {
                        Time.log('social search failed');
                    }
                    r.resumeVal(undefined);
                }).done();
            */
        }

        //? Searches for places nearby. The distance is in meters.
        //@ obsolete flow(SinkSafe) stub()
        //@ [result].writesMutable
        //@ [network].defl("facebook") [location].deflExpr('senses->current_location') [distance].defl(1000)
        export function search_places_nearby(network: string, terms: string, location: Location_, distance: number): Collection<Place> {
            return Collections.create_place_collection();
        }

        var _fakeContacts: Contact[] = [
            Contact.mkFake("Orlando", "N.",    "Gee", "orlando0@adventure-works.com", "245-555-0173", "1.jpg"),
            Contact.mkFake("Janet", "M.", "Gates", "janet1@adventure-works.com", "710-555-0173", "9.jpg"),
            Contact.mkFake("Donna", "F.", "Carreras", "donna0@adventure-works.com",    "279-555-0130", "10.jpg"),
            Contact.mkFake("Lucy", null, "Harrington", "lucy0@adventure-works.com", "828-555-0186", "32.jpg"),
            Contact.mkFake("Rosmarie","J.", "Carroll", "rosmarie0@adventure-works.com", "244-555-0112", "42.jpg"),
            Contact.mkFake("Dominic", "P.", "Gash", "dominic0@adventure-works.com", "192-555-0173", "5.jpg"),
            Contact.mkFake("Kathleen", "M.", "Garza", "kathleen0@adventure-works.com", "150-555-0127", "72.jpg"),
            Contact.mkFake("Johnny", "A.", "Caprio", "johnny0@adventure-works.com", "112-555-0191","28.jpg"),
            Contact.mkFake("Christopher", "R.",    "Beck","christopher1@adventure-works.com", "1 (11) 500 555-0132", "48.jpg"),
            Contact.mkFake("Donald", "L.", "Blanton", "donald0@adventure-works.com", "357-555-0161", "184.jpg")
        ];

        //? Retrieves the list of contacts
        //@ async hidden cap(contacts) flow(SourceContacts) returns(Collection<Contact>)
        //@ [network].defl("phone")
        export function contacts(network:string, r : ResumeCtx)
        {
            search_contacts("", r);
        }

        export var askCalendarAccessAsync = (r: ResumeCtx): Promise => { // boolean
            return r.rt.host.askSourceAccessAsync("calendar", "your calendar and appointments.", false);
        }

        export var askContactsAccessAsync = (r : ResumeCtx): Promise => { // boolean
            return r.rt.host.askSourceAccessAsync("contacts", "your contact list.", false);
        }

        export var searchContactsAsync = (prefix: string): Promise => { // Collection<Contact>
            var prefix = prefix.toUpperCase();
            var cs: Contact[] = [];
            _fakeContacts.forEach((c) => {
                if (c.name().toUpperCase().indexOf(prefix) > -1)
                    cs.push(c.clone());
            });
            return Promise.as(Collection.mkAny(Contact, cs));
        }

        //? Searches for contacts by name.
        //@ async cap(contacts) flow(SourceContacts) returns(Collection<Contact>)
        export function search_contacts(prefix:string, r : ResumeCtx)
        {
            Social.askContactsAccessAsync(r)
                .then((allow) => {
                    if (allow) return Social.searchContactsAsync(prefix);
                    else return Promise.as(Collection.mkAny(Contact));
                }).done(cs => r.resumeVal(cs));
        }

        //? Chooses an email from the contact list
        //@ cap(contacts) flow(SourceContacts) returns(Link) uiAsync
        //@ [result].writesMutable
        export function choose_email(r : ResumeCtx)
        {
            Social.chooseContactAsync().done(c => {
                var url : string = c ? (c.email() || c.work_email() || c.personal_email()) : "";
                if (url)
                    r.resumeVal(Link.mk(url, LinkKind.email));
                else
                    r.resumeVal(undefined);
            });
        }

        export var chooseContactAsync = (): Promise => {
            var c = _fakeContacts[Math_.random(_fakeContacts.length)].clone();
            return Promise.as(c);
        }

        //? Chooses a contact from the contact list
        //@ cap(contacts) flow(SourceContacts) returns(Contact) uiAsync
        //@ [result].writesMutable
        export function choose_contact(r: ResumeCtx) {
            Social.chooseContactAsync().done(c => r.resumeVal(c));
        }

        export var searchAppointmentsAsync = (start: DateTime, end: DateTime): Promise => { // Collection<Appointment>
            Util.log('returning fake appointments');
            return Promise.as(Collection.mkAny(Appointment));
        }

        //? Searches for appointments in a given time range
        //@ async cap(calendar) flow(SourceCalendar) returns(Collection<Appointment>)
        //@ [start].deflExpr('time->now') [end].deflExpr('time->tomorrow')
        export function search_appointments(start:DateTime, end:DateTime, r : ResumeCtx) // : Collection<Appointment>
        {
            Social.askCalendarAccessAsync(r)
                .then((allow) => {
                    if (allow) return Social.searchAppointmentsAsync(start, end);
                    else return Promise.as(Collection.mkAny(Appointment));
                }).done(cs => r.resumeVal(cs));
        }

        //? Creates a new contact
        //@ [nickname].writesMutable
        //@ [result].writesMutable
        export function create_contact(nickname: string): Contact { return Contact.mk(nickname); }
    }
}
