///<reference path='refs.ts'/>
module TDev.RT {
    //? An calendar appointment
    //@ stem("a") immutable ctx(general,gckey,walltap) cap(calendar)
    export class Appointment
        extends RTValue
    {
        private _subject: string = undefined;
        private _details: string = undefined;
        private _location: string = undefined;
        private _startTime: DateTime = undefined;
        private _endTime: DateTime = undefined;
        private _source: string = undefined;
        private _organizer: Contact = undefined;
        private _attendees: Collection<Contact> = undefined;

        private _is_private: boolean = false;
        private _is_all_day_event: boolean = false;
        private _status: string = undefined;

        constructor() {
            super()
        }

        static mk(subject: string, details: string, location: string, startTime: DateTime, endTime: DateTime, source : string, organizer : Contact, attendees : Collection<Contact>, isPrivate : boolean, isAllDay :boolean, status :string): Appointment {
            var a = new Appointment();
            a._subject = subject;
            a._details = details;
            a._location = location;
            a._startTime = startTime;
            a._endTime = endTime;
            a._source = source;
            a._organizer = organizer;
            a._attendees = attendees;
            a._is_private = isPrivate;
            a._is_all_day_event = isAllDay;
            a._status = status;
            return a;
        }

        //? Indicates if this appointment is private
        public is_private(): boolean { return this._is_private; }

        //? Indicates if this is an all day event
        public is_all_day_event(): boolean { return this._is_all_day_event; }

        //? Gets your status (free, tentative, busy, outofoffice)
        public status(): string { return this._status || ''; }

        //? Gets the organizer
        public organizer(): Contact { return this._organizer; }

        //? Gets the end time
        public end_time(): DateTime { return this._endTime; }

        //? Gets the location
        public start_time(): DateTime { return this._startTime; }

        //? Gets the location
        public location(): string { return this._location || ''; }

        //? Gets the subject
        public subject(): string { return this._subject || ''; }

        //? Gets the details
        public details(): string { return this._details || ''; }

        //? Gets the source of this appointment (facebook, etc...)
        public source(): string { return this._source || ''; }

        //? Gets the list of attendees. Each contact contains a name and email address.
        public attendees(): Collection<Contact> { return this._attendees || Collection.mkAny(Contact); }

        //? Posts the appointment to the wall
        public post_to_wall(s: IStackFrame): void
        {
            super.post_to_wall(s);
        }

        public getViewCore(s: IStackFrame, b:BoxBase): HTMLElement {
            var d = div("item");
            d.appendChild(div("item-title", this.subject()));
            d.appendChild(div("item-subtitle", this.location() + ", " + this.start_time() + ":" + this.end_time()));
            d.appendChild(div("item-subtle", this.source()));
            return d;
        }

        public debuggerDisplay(clickHandler: () => any): HTMLElement {
            return this.getViewCore(null, null).withClick(clickHandler);
        }
    }
}
