///<reference path='refs.ts'/>
module TDev.RT.Wab {
    export function SensesInit()
    {
        if (isSupportedAction(Action.POWER_INFORMATION)) {
            Util.log('wab: boosting POWER_INFORMATION');
            (<any>Senses).battery_level = SensesWab.battery_level;
            (<any>Phone).power_source = PhoneWab.power_source;
        }
        if (isSupportedAction(Action.RECORD_MICROPHONE)) {
            Util.log('wab: boosting RECORD_MICROPHONE');
            (<any>Senses).record_microphone = SensesWab.record_microphone;
            HTML.mkAudioInput = HTMLWab.mkAudioInput;
        }
        if (isSupportedAction(Action.TAKE_PHOTO)) {
            Util.log('wab: boosting TAKE_PHOTO');
            (<any>Senses).take_camera_picture = SensesWab.take_camera_picture;
        }
    }

    export module PhoneWab {
        export function power_source(r: ResumeCtx) {
            sendRequest({ action: Action.POWER_INFORMATION },
                (response: PowerInformationResponse) => {
                    r.resumeVal(response.status == Status.OK ? response.source : "");
                });
        }
    }

    export module SensesWab {
        export function take_camera_picture(r: ResumeCtx) {
            sendRequestAsync({ action: Action.TAKE_PHOTO })
                .then((response: UriResponse) => {
                    if (response.status === Status.OK)
                        return Picture.fromUrl(response.uri);
                    else
                        return Promise.as(undefined);
                }).done(pic => r.resumeVal(pic));
        }
        export function battery_level(r: ResumeCtx) {
            sendRequest({ action: Action.POWER_INFORMATION },
                (response: PowerInformationResponse) => {
                    r.resumeVal(response.status == Status.OK ? response.level : undefined);
                });
        }
        export function record_microphone(r: ResumeCtx) {
            Util.log("wab: record microphone");
            sendRequestAsync({ action: Action.RECORD_MICROPHONE })
                .then((response: UriResponse) => {
                    if (response.status === Status.OK) {
                        Util.log("wab: record microphone : success");
                        return Sound.fromArtUrl(response.uri)
                    }
                    else {
                        Util.log("wab: record microphone : failed");
                        return Promise.as(undefined);
                    }
                }).done(snd => r.resumeVal(snd));
        }

    }
}
