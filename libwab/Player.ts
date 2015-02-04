///<reference path='refs.ts'/>
module TDev.RT.Wab {
    export function PlayerInit()
    {
        var Player = <any>TDev.RT.Player;
        if (isSupportedAction(Action.PLAYER_COMMAND)) {
            Util.log('wab: boosting PLAYER_COMMAND');
            Player.stop = PlayerWab.stop;
            Player.next = PlayerWab.next;
            Player.previous = PlayerWab.previous;
            Player.resume = PlayerWab.resume;
            Player.pause = PlayerWab.pause;
            Player.playOne = PlayerWab.playOne;
        }

        if (isSupportedAction(Action.PLAYER_STATE)) {
            Util.log('wab: boosting PLAYER_STATE');
            Player.is_repeating = PlayerWab.is_repeating;
            Player.set_repeating = PlayerWab.set_repeating;
            Player.is_shuffled = PlayerWab.is_shuffled;
            Player.set_shuffled = PlayerWab.set_shuffled;
            Player.is_muted = PlayerWab.is_muted;
            Player.is_stopped = PlayerWab.is_stopped;
            Player.is_paused = PlayerWab.is_paused;
            Player.is_playing = PlayerWab.is_playing;
        }

        if (isSupportedAction(Action.ACTIVE_SONG)) {
            Util.log('wab: boosting ACTIVE_SONG');
            Player.active_song = PlayerWab.active_song;            
        }

        if (isSupportedAction(Action.START_ACTIVE_SONG_CHANGED)) {
            Util.log('wab: boosting START_ACTIVE_SONG_CHANGED');
            Player.addActiveSongChangedEvent = PlayerWab.addActiveSongChangedEvent;
            Player.removeActiveSongChangedEvent = PlayerWab.removeActiveSongChangedEvent;
        }

        if (isSupportedAction(Action.START_PLAYER_STATE_CHANGED)) {
            Util.log('wab: boosting START_PLAYER_STATE_CHANGED');
            Player.addPlayerStateChangedEvent = PlayerWab.addPlayerStateChangedEvent;
            Player.removePlayerStateChangedEvent = PlayerWab.removePlayerStateChangedEvent;
        }
    }

    export module PlayerWab {
        function playerCommand(command: string, uri: string) {
            Util.log('wab: player ' + command + ' ' + uri);
            sendRequestAsync(<PlayerCommandRequest>{
                action: Action.PLAYER_COMMAND,
                command: command,
                uri: uri
            })
            .done();
        }
        export function stop() { playerCommand('stop', null); }
        export function next() { playerCommand('next', null); }
        export function previous() { playerCommand('previous', null); }
        export function resume() { playerCommand('resume', null); }
        export function pause() { playerCommand('pause', null); }
        export function playOne(song: Song) {
            Util.log('wab: play ' + song.url());
            HTML.showProgressNotification(lf("playing song..."));        
            playerCommand('play', song.url());
            Util.log('wab: play done');
        }
        export function active_song(r: ResumeCtx) {
            sendRequest({ action: Action.ACTIVE_SONG },
                (response: ActiveSongResponse) => {
                    if (response.status == Status.OK) {
                        if (!response.uri)
                            r.resumeVal(undefined);
                        else {
                            var song = Song.mk(response.uri, undefined, response.title);
                            song.init(response.title, response.album, response.artist, response.duration || -1, "", 0, response.track || -1);
                            r.resumeVal(song);
                        } 
                    } else
                        r.resumeVal(undefined);
                });
        }
        export function is_muted(r: ResumeCtx) {
            sendRequest(<PlayerStateRequest>{ action: Action.PLAYER_STATE },
                (response: PlayerStateResponse) => {
                    r.resumeVal(response.status == Status.OK ? response.muted : false);
                });
        }
        export function is_shuffled(r: ResumeCtx) {
            sendRequest(<PlayerStateRequest>{ action: Action.PLAYER_STATE },
                (response: PlayerStateResponse) => {
                    r.resumeVal(response.status == Status.OK ? response.shuffle : false);
                });
        }
        export function set_shuffled(value : boolean, r: ResumeCtx) {
            sendRequest(<PlayerStateRequest>{ action: Action.PLAYER_STATE, shuffle : value },
                (response: PlayerStateResponse) => r.resume());
        }
        export function is_repeating(r: ResumeCtx) {
            sendRequest(<PlayerStateRequest>{ action: Action.PLAYER_STATE },
                (response: PlayerStateResponse) => {
                    r.resumeVal(response.status == Status.OK ? response.repeat : false);
                });
        }
        export function set_repeating(value: boolean, r: ResumeCtx) {
            sendRequest(<PlayerStateRequest>{ action: Action.PLAYER_STATE, repeat: value },
                (response: PlayerStateResponse) => r.resume());
        }
        export function is_stopped(r: ResumeCtx) {
            isPlayerState(r, 'stopped');
        }
        export function is_paused(r: ResumeCtx) {
            isPlayerState(r, 'paused');
        }
        export function is_playing(r: ResumeCtx) {
            isPlayerState(r, 'playing');
        }
        function isPlayerState(r : ResumeCtx, state : string) {
            sendRequest(<PlayerStateRequest>{ action: Action.PLAYER_STATE },
                (response: PlayerStateResponse) => {
                    r.resumeVal(response.status == Status.OK ? response.state == state : false);
                });
        }

        var activeSongChangedId:string;
        export function addActiveSongChangedEvent(rt: Runtime) {
            Util.log('wab: starting active song changed');
            activeSongChangedId = sendRequest({ action: Action.START_ACTIVE_SONG_CHANGED },
                (response) => {
                    if (response.status == Status.OK)
                        rt.queueEvent("active song changed", null, []);
                })
        }
        export function removeActiveSongChangedEvent() {
            if (activeSongChangedId) {
                Util.log('wab: stopping active song changed');
                cancelRequest(activeSongChangedId);
                activeSongChangedId = "";
            }
        }
        var playerStateChangedId :string;
        export function addPlayerStateChangedEvent(rt: Runtime) {
            Util.log('wab: starting player state changed');
            playerStateChangedId = sendRequest({ action: Action.START_PLAYER_STATE_CHANGED },
                (response) => {
                    if (response.status == Status.OK)
                        rt.queueEvent("player state changed", null, []);
                })
        }
        export function removePlayerStateChangedEvent() {
            if (playerStateChangedId) {
                Util.log('wab: stopping player state changed');
                cancelRequest(playerStateChangedId);
                playerStateChangedId = "";
            }
        }
    }
}
