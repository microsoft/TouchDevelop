///<reference path='refs.ts'/>
module TDev.RT.WinRT {
    export function PhoneInit()
    {
        (<any>Phone).choose_phone_number = function (r: ResumeCtx)
        {
            if (!UtilWinRT.tryUnsnap()) { //  no pickers when snapped
                r.resumeVal(undefined);
                return;
            }

            var picker = new Windows.ApplicationModel.Contacts.ContactPicker();
            picker
                .pickSingleContactAsync()
                .then(function (contact: Windows.ApplicationModel.Contacts.ContactInformation)
                {
                    if (contact) {
                        var phoneNumbers = contact.phoneNumbers;
                        if (phoneNumbers.length > 0) {
                            r.resumeVal(Link.mk(phoneNumbers.getAt(0).value, LinkKind.phoneNumber));
                            return;
                        }
                    }
                    r.resumeVal(undefined);
                });
        }
    }
}
