///<reference path='refs.ts'/>
module TDev.RT.Wab {
    export function RadioInit()
    {
        var Radio = <any>TDev.RT.Radio;
        if (isSupportedAction(Action.RADIO_COMMAND)) {
            Util.log('wab: boosting RADIO_COMMAND');
            Radio.is_playing = RadioWab.is_playing;
            Radio.start = RadioWab.start;
            Radio.stop = RadioWab.stop;
            Radio.signal_strength = RadioWab.signal_strength;
            Radio.frequency = RadioWab.frequency;
            Radio.set_frequency = RadioWab.set_frequency;
        }
    }

    export module RadioWab {
        export function start(r: ResumeCtx) {
            sendRequest(<RadioCommandRequest>{ action: Action.RADIO_COMMAND, command:'play' },
                () => r.resume());
        }

        export function stop(r: ResumeCtx) {
            sendRequest(<RadioCommandRequest>{ action: Action.RADIO_COMMAND, command:'stop' },
                () => r.resume());
        }
        export function is_playing(r: ResumeCtx) // : boolean
        {
            sendRequest(<RadioCommandRequest>{ action: Action.RADIO_COMMAND },
                (response: RadioCommandResponse) => {
                    r.resumeVal(response.status == Status.OK ? response.isPlaying : false);
                });
        }
        export function signal_strength(r: ResumeCtx) // : number
        {
            sendRequest(<RadioCommandRequest>{ action: Action.RADIO_COMMAND },
                (response: RadioCommandResponse) => {
                    r.resumeVal(response.status == Status.OK ? response.signal : 0.0);
                });
        }
        export function frequency(r: ResumeCtx) //: number
        {
            sendRequest(<RadioCommandRequest>{ action: Action.RADIO_COMMAND },
                (response: RadioCommandResponse) => {
                    r.resumeVal(response.status == Status.OK ? response.frequency : 0.0);
                });
        }
        export function set_frequency(frequency: number, r: ResumeCtx): void {
            sendRequest(<RadioCommandRequest>{ action: Action.RADIO_COMMAND, frequency : frequency },
                () => r.resume());
        }
    }
}
