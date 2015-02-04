///<reference path='refs.ts'/>
module TDev.RT.Wab {
    export function SoundInit()
    {
        if (isSupportedAction(Action.PLAY_SOUND)) {
            Util.log('wab: boosting PLAY_SOUND');
            Sound.prototype.playAsync = function () {
                var sound: Sound = <Sound>this;
                return sound.toWabRequestAsync()
                    .then(r => {
                        if (/^data:audio\/wav;base64,/.test(r.uri)) {
                            var soundid = <string>(<any>sound).soundid;
                            return sendRequestAsync(<PlaySoundRequest>{
                                action: Action.PLAY_SOUND,
                                soundid: soundid,
                                uri: soundid ? "" : r.uri,
                                pan: r.pan,
                                pitch: r.pitch,
                                volume: r.volume
                            }).then((e: PlaySoundResponse) => {
                                if (e.cachemiss) {
                                    Util.log('wab: play sound: cache-miss');
                                    (<any>sound).soundid = undefined;
                                    return sendRequestAsync(<PlaySoundRequest>{
                                        action: Action.PLAY_SOUND,
                                        uri: r.uri,
                                        pan: r.pan,
                                        pitch: r.pitch,
                                        volume: r.volume
                                    }).then((cm: PlaySoundResponse) => {
                                        if (cm.soundid) {
                                            Util.log('wab: play sound: cached after miss ' + cm.soundid);
                                            (<any>sound).soundid = cm.soundid;
                                        }
                                    });
                                }
                                if (e.soundid) {
                                    Util.log('wab: play sound: cached ' + e.soundid);
                                    (<any>sound).soundid = e.soundid;
                                }
                                return Promise.as(undefined);
                            });
                        }
                        else {
                            return sound.playCoreAsync();
                        }
                    });
            }
        }
    }
}
