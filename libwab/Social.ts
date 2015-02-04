///<reference path='refs.ts'/>
module TDev.RT.Wab {
    export function SocialInit()
    {
        if (isSupportedAction(Action.SEND_SMS)) {
            Util.log('wab: boosting SEND_SMS');
            Social.sendSmsAsync = SocialWab.sendSmsAsync;
        }

        if (isSupportedAction(Action.PICK_CONTACT)) {
            Util.log('wab: boosting PICK_CONTACT');
            Social.chooseContactAsync = SocialWab.chooseContactAsync;
        }

        if (isSupportedAction(Action.LIST_CONTACTS)) {
            Util.log('wab: boosting LIST_CONTACTS');
            Social.searchContactsAsync = SocialWab.searchContactsAsync;
        }

        if (isSupportedAction(Action.LIST_APPOINTMENTS)) {
            Util.log('wab: boosting LIST_APPOINTMENTS');
            Social.searchAppointmentsAsync = SocialWab.searchAppointmentsAsync;
        }

        if (isSupportedAction(Action.SAVE_TO_GALLERY)) {
            Util.log('wab: boosting SAVE_TO_GALLERY');
            Picture.prototype.save_to_library = function (r: ResumeCtx) {
                var pic: Picture = this;
                pic.initAsync().done(() => {
                    var url = pic.getDataUri(0.95);
                    sendRequestAsync(<UriRequest>{ action: Action.SAVE_TO_GALLERY, uri: url })
                        .then((response: SaveToGalleryResponse) => {
                            if (response.status === Status.OK) {
                                r.resumeVal(response.name);
                            }
                            else
                                r.resumeVal(undefined);
                        }).done();
                })
            }
        }

        if (isSupportedAction(Action.VIBRATE)) {
            Util.log('wab: boosting VIBRATE');
            Phone.vibrateCore = function (seconds: number) {
                var ms = Math.min(5, Math.max(0.02, seconds)) * 1000.0;
                sendRequestAsync(<VibrateRequest>{ action: Action.VIBRATE, millis: ms })
                    .done(() => { }, (e) => { });
            }
        }
    }

    export module SocialWab {
        export function sendSmsAsync(to: string, body: string) {
            return sendRequestAsync(<SendSmsRequest>{ action: Action.SEND_SMS, to: to, body: body });
        }

        export function chooseContactAsync() : Promise { // Contact
            return sendRequestAsync({ action: Action.PICK_CONTACT })
                .then((response: ContactResponse) => {
                    if (response.status === Status.OK)
                        return mkContact(response);
                    else return undefined;
                });
        }

        export function searchContactsAsync(query: string): Promise { // Collection<Contact>
            return new Promise((onSuccess, onError, onProgress) => {
                Util.log('wab: search contacts');
                var aps: Contact[] = [];
                sendRequest(<SearchContactsRequest>{ action: Action.LIST_CONTACTS, query: query },
                            (response: ListContactsResponse) => {
                                if (response.status == Status.OK && !isLastResponse(response)) {
                                    aps.push(mkContact(<ContactResponse>response));
                                } else {
                                    Util.log('wab: search contacts: ' + aps.length);
                                    onSuccess(Collection.mkAny(Contact, aps));
                                }
                            });
            });
        }

        export function searchAppointmentsAsync(start: DateTime, end: DateTime): Promise { // Collection<Appointment>
            return new Promise((onSuccess, onError, onProgress) => {
                Util.log('wab: search appointments between ' + start + ' and ' + end);
                var aps: Appointment[] = [];
                sendRequest(<SearchAppointmentsRequest>{ action: Action.LIST_APPOINTMENTS, start:start.milliseconds_since_epoch(), end:end.milliseconds_since_epoch() },
                            (response: ListAppointmentsResponse) => {
                                if (response.status == Status.OK && !isLastResponse(response)) {
                                    aps.push(mkAppointment(response));
                                } else {
                                    Util.log('wab: found ' + aps.length + ' appointments');
                                    onSuccess(Collection.mkAny(Appointment, aps));
                                }
                            });
            });
        }

        function mkAppointmentContact(r: AppointmentContact): Contact {
            if (r)
                return Contact.mk(r.nameDisplay, r.email);
            else
                return undefined;
        }

        function mkAppointmentContacts(r: AppointmentContact[]): Collection<Contact> {
            if (r)
                return Collection.mkAny(Contact, r.map(ac => Contact.mk(ac.nameDisplay, ac.email)));
            else
                return Collection.mkAny(Contact);
        }

        function mkAppointment(r: ListAppointmentsResponse): Appointment {
            return Appointment.mk(r.subject, r.details, r.location, DateTime.mkMs(r.start), DateTime.mkMs(r.end),
                r.source, mkAppointmentContact(r.organizer), mkAppointmentContacts(r.attendees),
                r.isPrivate, r.isAllDay, r.onlineStatus);
        }

        function mkContact(response: ContactResponse): Contact {
            var c = new Contact();
            c.set_nick_name(response.name); // legacy
            c.set_email(response.email); // legacy
            c.set_phone_number(response.phone); // legacy

            c.set_first_name(response.nameGiven);
            c.set_middle_name(response.nameMiddle);
            c.set_last_name(response.nameFamily);

            c.set_home_phone(response.phoneHome);
            c.set_work_phone(response.phoneWork);
            c.set_mobile_phone(response.phoneMobile);
            c.set_phone_number(response.phoneOther);

            c.set_work_email(response.emailWork);
            c.set_personal_email(response.emailHome);
            c.set_email(response.emailOther);

            c.set_home_address(response.addressHome || response.addressOther);
            c.set_work_address(response.addressWork);

            c.setPicture_url(response.photoUri);
            c.set_source(response.source || "Phone");
            return c;
        }
    }
}
