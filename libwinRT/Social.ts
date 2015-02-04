///<reference path='refs.ts'/>
module TDev.RT.WinRT {
    export function SocialInit()
    {
        var Social = <any>TDev.RT.Social;
        Social.search_contacts = function (prefix: string, r: ResumeCtx) {
            r.resumeVal(new Collection<Contact>(Contact));
        }
        Social.choose_email = function (r: ResumeCtx)
        {
            if (!UtilWinRT.tryUnsnap()) { //  no pickers when snapped
                r.resumeVal(undefined);
                return;
            }

            var picker = new Windows.ApplicationModel.Contacts.ContactPicker();
            var c = new Contact();
            picker
                .pickSingleContactAsync()
                .then(function (contact: Windows.ApplicationModel.Contacts.ContactInformation)
                {
                    var email: Link = undefined;
                    if (contact) {
                        var emails = contact.emails;
                        for (var i = 0; i < emails.length; ++i) {
                            var field = emails.getAt(i);
                            if (field.name === "email") { email = Link.mk(field.value, LinkKind.email); break; }
                            else if (field.name === "homeEmail") { email = Link.mk(field.value, LinkKind.email); break; }
                            else if (field.name === "workEmail") { email = Link.mk(field.value, LinkKind.email); break; }
                        }
                    }
                    r.resumeVal(email);
                });
        }

        Social.choose_contact = function (r: ResumeCtx)
        {
            if (!UtilWinRT.tryUnsnap()) { //  no pickers when snapped
                r.resumeVal(undefined);
                return;
            }

            var picker = new Windows.ApplicationModel.Contacts.ContactPicker();
            var c = new Contact();
            picker
                .pickSingleContactAsync()
                .then(function (contact: Windows.ApplicationModel.Contacts.ContactInformation)
                {
                    if (!contact) {
                        r.resumeVal(undefined);
                    }
                    else {
                        c.set_nick_name(contact.name);
                        var phoneNumbers = contact.phoneNumbers;
                        for (var i = 0; i < phoneNumbers.length; ++i) {
                            var field = phoneNumbers.getAt(i);
                            if (field.name === "phoneNumber") c.set_phone_number(field.value);
                            else if (field.name === "homePhone") c.set_home_phone(field.value);
                            else if (field.name === "workPhone") c.set_work_phone(field.value);
                        }
                        var emails = contact.emails;
                        for (var i = 0; i < emails.length; ++i) {
                            var field = emails.getAt(i);
                            if (field.name === "email") c.set_email(field.value);
                            else if (field.name === "homeEmail") c.set_personal_email(field.value);
                            else if (field.name === "workEmail") c.set_work_email(field.value);
                        }
                        contact
                            .getThumbnailAsync()
                            .then(function (stream: Windows.Storage.Streams.IRandomAccessStreamWithContentType)
                            {
                                var url = URL.createObjectURL(stream, { oneTimeOnly: true });
                                return Picture.fromUrl(url, true, false);
                            }).then(<any>function (pic: Picture)
                            {
                                if (pic)
                                    c.set_picture(pic);
                                r.resumeVal(c);
                            });
                    }
                });
        }

        Social.search = SocialWinRT.search;
    }

    export module SocialWinRT
    {
        function searchTwitter(terms: string, r: ResumeCtx) 
        {
            var url = "http://search.twitter.com/search.json?q=" + encodeURIComponent(terms);
            var request = Web.create_request(url);
            request.set_accept('application/json');
            r.progress('Searching Twitter...');
            request
                .sendAsync()
                .then(function (response: WebResponse)
                {
                    var json = response.content_as_json();
                    if (!json) {
                        r.resumeVal(undefined);
                        return;
                    }
                    var msgs = Collections.create_message_collection();
                    var results = json.field('results');
                    if (results) {
                        for (var i = 0; i < results.count(); ++i) {
                            var tweet = results.at(i);
                            var text = tweet.string("text");
                            var from = tweet.string("from_user");
                            var id = tweet.string("id_str");
                            var created = tweet.time("created_at");
                            var geo: Location_ = undefined;
                            var geoObject = tweet.field("geo");
                            if (geoObject) {
                                var coord = geoObject.field("coordinates");
                                if (coord && coord.count() === 2) {
                                    var lat = coord.at(0).to_number();
                                    var lon = coord.at(1).to_number();
                                    geo = Location_.mkShort(lat, lon);
                                }
                            }
                            var img = tweet.string("profile_image_url");
                            var tweeturl = 'http://mobile.twitter.com/' + encodeURIComponent(from) + '/statuses/' + encodeURIComponent(id);
                            var msg = Message.mk(text); // TODO: html decode
                            msg.set_from(from);
                            msg.set_time(created);
                            msg.set_location(geo);
                            msg.set_link(tweeturl);
                            msg.set_source('twitter');
                            msg.set_picture_link(img);
                            msgs.add(msg);
                        }
                    }
                    r.resumeVal(msgs);
                });
        }

        function searchFacebook(terms: string, r: ResumeCtx)
        {
            var url = "https://graph.facebook.com/search?q={0}&type=post" + encodeURIComponent(terms);
            var request = Web.create_request(url);
            request.set_accept('application/json');
            r.progress('Searching Facebook...');
            request
                .sendAsync()
                .then(function (response: WebResponse)
                {
                    var json = response.content_as_json();
                    if (!json) {
                        r.resumeVal(undefined);
                        return;
                    }
                    var msgs = Collections.create_message_collection();
                    var results = json.field('data');
                    if (results) {
                        for (var i = 0; i < results.count(); ++i) {
                            var msg = results.at(i);
                            var text = msg.string("message") || msg.string("description") || "";
                            var title = msg.string("name");
                            var fromField = msg.field("from");
                            var from = fromField ? undefined : fromField.string("name");
                            var id = msg.field("id");
                            var created = msg.time("created_time");
                            var img = msg.string("picture");
                            var link = msg.string("link");

                            var m = Message.mk(text); // TODO: Html decode
                            m.set_from(from);
                            m.set_title(title);
                            m.set_time(created);
                            m.set_link(link);
                            m.set_source("Facebook");
                            m.set_picture_link(img);

                            msgs.add(m);
                        }
                    }
                    r.resumeVal(msgs);
                });
        }
        
        // Searches for recent messages in a social network (twitter, facebook)
        export function search(network: string, terms: string, r: ResumeCtx) // : Collection<Message>
        {
            network = network.toLowerCase();
            if (network === 'twitter')
                searchTwitter(terms, r);
            else if (network === 'facebook')
                searchTwitter(terms, r);
            else 
            {
                Time.log('unknown social network ' + network + '. use twitter or facebook.');
                r.resumeVal(undefined);
            }
        }
    }
}
