///<reference path='refs.ts'/>
module TDev.RT {
    //? A contact
    //@ walltap cap(contacts)
    export class Contact
        extends RTValue
    {
        private _id : string = undefined;
        private _first_name : string = undefined;
        private _last_name : string = undefined;
        private _nick_name : string = undefined;
        private _middle_name : string = undefined;
        private _title : string = undefined;
        private _suffix : string = undefined;
        private _company : string = undefined;
        private _job_title : string = undefined;
        private _office : string = undefined;
        private _work_address : string = undefined;
        private _home_address : string = undefined;
        private _source : string = undefined;
        private _birthday : DateTime = undefined;
        private _pictureUrl: string = undefined;
        private _picture : Picture = undefined;
        private _email : string = undefined;
        private _work_email : string = undefined;
        private _personal_email : string = undefined;
        private _phone_number : string = undefined;
        private _home_phone : string = undefined;
        private _work_phone : string = undefined;
        private _mobile_phone : string = undefined;
        private _web_site : string = undefined;

        static mkFake(firstName : string, middleName : string, lastName : string, email : string, phoneNumber : string, pictureUrl : string): Contact {
            var c = new Contact();
            c._first_name = firstName;
            c._middle_name = middleName;
            c._last_name = lastName;
            c._email = email;
            c._phone_number = phoneNumber;
            c._pictureUrl = Cloud.getServiceUrl() + '/doc/contacts/' + encodeURIComponent(pictureUrl);
            c._source = "AdventureWorks";
            return c;
        }

        constructor() {
            super()
        }

        public clone(): Contact {
            var c = new Contact();
            c._id = this._id;
            c._first_name = this._first_name;
            c._last_name = this._last_name;
            c._nick_name = this._nick_name;
            c._middle_name = this._middle_name;
            c._title = this._title;
            c._suffix = this._suffix;
            c._company = this._company;
            c._job_title = this._job_title;
            c._office = this._office;
            c._work_address = this._work_address;
            c._home_address = this._home_address;
            c._source = this._source;
            c._birthday = this._birthday;
            c._pictureUrl = this._pictureUrl;
            c._picture = this._picture;
            c._email = this._email;
            c._work_email = this._work_email;
            c._personal_email = this._personal_email;
            c._phone_number = this._phone_number;
            c._home_phone = this._home_phone;
            c._work_phone = this._work_phone;
            c._mobile_phone = this._mobile_phone;
            c._web_site = this._web_site;
            return c;
        }

        static mk(nickname: string, email : string = null): Contact
        {
            var c = new Contact();
            c._nick_name = nickname;
            c._email = email;
            return c;
        }

        public toString(): string
        {
            return this.name();
        }

        public toFullString(): string {
            var r = this.name();
            if (this._title != null)
                r += '\ntitle: ' + this._title;
            if (this._company != null)
                r += '\ncompany: ' + this._company;
            if (this._job_title != null)
                r += '\njob title: ' + this._job_title;
            if (this._office != null)
                r += '\noffice: ' + this._office;
            if (this._work_address != null)
                r += '\nwork address: ' + this._work_address;
            if (this._home_address != null)
                r += '\nhome address: ' + this._home_address;
            if (this._birthday != null)
                r += '\nbirthday: ' + this._birthday;
            if (this._email != null)
                r += '\nemail: ' + this._email;
            if (this._work_email != null)
                r += '\nwork email: ' + this._work_email;
            if (this._personal_email != null)
                r += '\npersonal email: ' + this._personal_email;
            if (this._phone_number != null)
                r += '\nphone number: ' + this._phone_number;
            if (this._home_phone != null)
                r += '\nhome phone: ' + this._home_phone;
            if (this._work_phone != null)
                r += '\nwork phone: ' + this._work_phone;
            if (this._mobile_phone != null)
                r += '\nmobile phone: ' + this._mobile_phone;
            if (this._web_site != null)
                r += '\nweb site: ' + this._web_site;
            return r;
        }

        //? Gets the user id if any
        //@ readsMutable
        public id() : string {
            return this._id;
        }

        //? Sets the user id
        //@ writesMutable
        public set_id(id : string) {
            this._id = id;
        }

        //? Gets the display name (not used when saving contact)
        //@ readsMutable
        public name() : string
        {
            if (this._nick_name) return this._nick_name;
            else
                return [this._first_name, this._middle_name, this._last_name]
                    .filter(s => !!s)
                    .join(" ");
        }

        //? Gets the first name if any.
        //@ readsMutable
        public first_name() : string { return this._first_name || ''; }

        //? Sets the first name
        //@ writesMutable
        public set_first_name(first_name:string) : void { this._first_name = first_name; }

        //? Gets the last name if any.
        //@ readsMutable
        public last_name() : string { return this._last_name; }

        //? Sets the last name
        //@ writesMutable
        public set_last_name(last_name:string) : void { this._last_name = last_name; }

        //? Gets the nickname if any.
        //@ readsMutable
        public nick_name() : string { return this._nick_name; }

        //? Sets the middle name
        //@ writesMutable
        public set_nick_name(nick_name:string) : void { this._nick_name = nick_name; }

        //? Gets the middle name if any.
        //@ readsMutable
        public middle_name() : string { return this._middle_name; }

        //? Sets the middle name
        //@ writesMutable
        public set_middle_name(middle_name:string) : void { this._middle_name = middle_name; }

        //? Gets the name title if any.
        //@ readsMutable
        public title() : string { return this._title; }

        //? Sets the title
        //@ writesMutable
        public set_title(title:string) : void { this._title = title; }

        //? Gets the name suffix if any.
        //@ readsMutable
        public suffix() : string { return this._suffix; }

        //? Sets the suffix
        //@ writesMutable
        public set_suffix(suffix:string) : void { this._suffix = suffix; }

        //? Gets the company name if any.
        //@ readsMutable
        public company() : string { return this._company; }

        //? Sets the company
        //@ writesMutable
        public set_company(company:string) : void { this._company = company; }

        //? Gets the job title at the company if any.
        //@ readsMutable
        public job_title() : string { return this._title; }

        //? Sets the job title
        //@ writesMutable
        public set_job_title(job_title:string) : void { this._job_title = job_title; }

        //? Gets the office location at the company if any.
        //@ readsMutable
        public office() : string { return this._office; }

        //? Sets the office location at the company
        //@ writesMutable
        public set_office(office:string) : void { this._office = office; }

        //? Gets the home address if any
        //@ readsMutable
        public work_address() : string { return this._work_address; }

        //? Sets the work address
        //@ writesMutable
        public set_work_address(work_address:string) : void { this._work_address = work_address; }

        //? Gets the work address if any
        //@ readsMutable
        public home_address() : string { return this._home_address; }

        //? Sets the home address
        //@ writesMutable
        public set_home_address(home_address:string) : void { this._home_address = home_address; }

        //? Gets the source of this contact (phone, etc...)
        //@ readsMutable
        public source() : string { return this._source; }

        //? Sets the source
        //@ writesMutable
        public set_source(source:string) : void { this._source = source; }

        //? Gets the birth date if any.
        //@ readsMutable
        public birthday() : DateTime { return this._birthday; }

        //? Sets the birthday
        //@ writesMutable
        public set_birthday(birthday:DateTime) : void { this._birthday = birthday; }

        //? Gets the picture of the contact if any.
        //@ returns(Picture) readsMutable picAsync
        public picture(r : ResumeCtx) // : Picture
        {
            if (!this._picture && this._pictureUrl) {
                Picture.fromUrl(this._pictureUrl, true)
                    .then((pic) => {
                        this._picture = pic;
                        r.resumeVal(pic);
                    })
                    .done();
            }
            r.resumeVal(this._picture);
        }

        //? Sets the picture
        //@ writesMutable [picture].readsMutable
        public set_picture(picture: Picture): void {
            this._pictureUrl = undefined;
            this._picture = picture;
        }

        //? Sets the picture url
        //@ writesMutable
        public setPicture_url(url: string) {
            this._pictureUrl = url;
            this._picture = null;
        }

        public getViewCore(s: IStackFrame, b: BoxBase): HTMLElement {
            var d = div("item");
            if (this._picture)
                d.appendChild(div("item-image contact-image", this._picture.getViewCore(s, b)));
            else if (this._pictureUrl) {
                var img = HTML.mkImg(this._pictureUrl);
                img.className = "item-image contact-image";
                d.appendChild(img);
            }
            var dc = div("item-info");
            d.appendChild(dc);
            var n = this.name();
            if (n)
                dc.appendChild(div("item-title", n));
            var t = this.title() || this._email || this._work_email || this._personal_email;
            if (t)
                dc.appendChild(div("item-subtitle", t));
            if (this.company() || this.job_title())
                dc.appendChild(div("item-description", this.job_title() + ' ' + this.company()));
            var ss = this.source();
            if (ss)
                dc.appendChild(div("item-subtle", ss));
            return d;
        }

        //? Gets the work or personal email if any
        //@ readsMutable
        public email() : Link { return this._email ? Link.mk(this._email, LinkKind.email) : undefined; }
        //? Sets the work or personal email
        //@ writesMutable
        public set_email(email:string) : void { this._email = email; }

        //? Gets the work email if any
        //@ readsMutable
        public work_email() : Link { return this._work_email ? Link.mk(this._work_email, LinkKind.email) : undefined; }

        //? Sets the work email
        //@ writesMutable
        public set_work_email(work_email:string) : void { this._work_email = work_email; }

        //? Gets the personal email if any
        //@ readsMutable
        public personal_email() : Link { return this._personal_email ? Link.mk(this._personal_email, LinkKind.email) : undefined; }

        //? Sets the personal email
        //@ writesMutable
        public set_personal_email(personal_email:string) : void { this._personal_email = personal_email; }

        //? Gets the cell or work or home phone number if any
        //@ readsMutable
        public phone_number() : Link { return this._phone_number ? Link.mk(this._phone_number, LinkKind.phoneNumber) : undefined; }
        //? Sets the cell or work or home phone number if any
        //@ writesMutable
        public set_phone_number(phone_number:string) : void { this._phone_number = phone_number; }

        //? Gets the home phone number if any
        //@ readsMutable
        public home_phone() : Link { return this._home_phone ? Link.mk(this._home_phone, LinkKind.phoneNumber) : undefined; }

        //? Sets the home phone
        //@ writesMutable
        public set_home_phone(home_phone:string) : void { this._home_phone = home_phone; }

        //? Gets the work phone number if any
        //@ readsMutable
        public work_phone() : Link { return this._work_phone ? Link.mk(this._work_phone, LinkKind.phoneNumber) : undefined; }

        //? Sets the work phone
        //@ writesMutable
        public set_work_phone(work_phone:string) : void { this._work_phone = work_phone; }

        //? Gets the cell phone number if any
        //@ readsMutable
        public mobile_phone() : Link { return this._mobile_phone ? Link.mk(this._mobile_phone, LinkKind.phoneNumber) : undefined; }

        //? Sets the mobile phone
        //@ writesMutable
        public set_mobile_phone(mobile_phone:string) : void { this._mobile_phone = mobile_phone; }

        //? Gets the web site if any
        //@ readsMutable
        public web_site() : Link { return this._web_site ? Link.mk(this._web_site, LinkKind.hyperlink) : undefined; }
        //? Sets the web site
        //@ writesMutable
        public set_web_site(web_site:string) : void { this._web_site = web_site; }

        public set_nickname(value:string) : void
        {
            this.set_nickname(value);
        }

        public set_website(value:string) : void
        {
            this.set_web_site(value);
        }

        //? Posts the contact to the wall
        //@ cap(none)
        public post_to_wall(s:IStackFrame) : void { super.post_to_wall(s) }
    }
}
