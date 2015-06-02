///<reference path='refs.ts'/>
module TDev.RT {
    //? Play, stop or resume songs, ...
    //@ skill(3)
    export module Player
    {
        var _rt: Runtime;
        var _activeSong: Song;
        var _songs: Songs = undefined;
        var _audio: HTMLAudioElement;
        var _source: HTMLSourceElement;
        var _shuffled: boolean;
        var _onActiveSongChanged : Event_;
        var _onPlayerStateChanged : Event_;

        export function rt_start(rt: Runtime): void
        {
            _rt = rt;
            _activeSong = null;
            _songs = null;
            _onActiveSongChanged = undefined;
            _onPlayerStateChanged = undefined;
            if (rt.eventEnabled("active song changed"))
                Player.addActiveSongChangedEvent(rt);
            if (rt.eventEnabled("player state changed"))
                Player.addPlayerStateChangedEvent(rt);
        }

        export function rt_stop(rt:Runtime)
        {
            Player.removeActiveSongChangedEvent();
            Player.removePlayerStateChangedEvent();
            _rt = null;
            _activeSong = null;
            _songs = null;
            _onActiveSongChanged = undefined;
            _onPlayerStateChanged = undefined;
        }

        export function addActiveSongChangedEvent(rt : Runtime) {}
        export function removeActiveSongChangedEvent() {}
        export function addPlayerStateChangedEvent(rt: Runtime) {}
        export function removePlayerStateChangedEvent() { }

        //? Gets the active song if any
        //@ quickAsync readsMutable returns(Song)
        //@ embedsLink("Player", "Song")
        export function active_song(r : ResumeCtx) // : Song
        {
            r.resumeVal(_activeSong);
        }

        //? Attaches a handler when the active song changes
        //@ ignoreReturnValue
        export function on_active_song_changed(body : Action) : EventBinding {
            if (_rt && !_onActiveSongChanged) {
                _onActiveSongChanged = new Event_();
                Player.addActiveSongChangedEvent(_rt);
            }
            return _onActiveSongChanged.addHandler(body);
        }

        function raiseActiveSongChanged() {
            if (_rt) {
                if (_rt.eventEnabled("player state changed"))
                    _rt.queueEvent("active song changed", null, []);
                if (_onActiveSongChanged && _onActiveSongChanged.handlers)
                    _rt.queueLocalEvent(_onActiveSongChanged, [], false);
            }
        }

        //? Attaches a handler when the player state changes
        //@ ignoreReturnValue
        export function on_player_state_changed(body : Action) : EventBinding {
            if (_rt && !_onPlayerStateChanged) {
                _onPlayerStateChanged = new Event_();
                Player.addPlayerStateChangedEvent(_rt);
            }
            return _onPlayerStateChanged.addHandler(body);
        }

        function raisePlayerStateChanged() {
            if (_rt) {
                if (_rt.eventEnabled("player state changed"))
                    _rt.queueEvent("player state changed", null, []);
                if (_onPlayerStateChanged && _onPlayerStateChanged.handlers)
                    _rt.queueLocalEvent(_onPlayerStateChanged, [], false);
            }
        }

        function ensureAudio()
        {
            if (!_audio) {
                _audio = <HTMLAudioElement>document.createElement("audio");
                (<any>_audio).crossorigin = "anonymous";
                _audio.style.display = 'none';
                _audio.onpause = () => {
                    raisePlayerStateChanged();
                };
                _audio.onplay = _audio.onpause;
                _audio.onplaying = _audio.onpause;
                _audio.onended = () => {
                    raisePlayerStateChanged();
                    if (_songs) {
                        if (_shuffled) {
                            var i = (Math_.random(_songs.count() - 1) + 1);
                            Player.playOne(_songs.at(i));
                        }
                        else
                            Player.next();
                    }
                };
                _source = <HTMLSourceElement>document.createElement("source");
                _audio.appendChild(_source);
                document.body.appendChild(_audio);
            }
        }

        //? Moves to the next song in the queue of playing songs
        //@ cap(musicandsounds)
        //@ writesMutable
        export function next(): void
        {
            if (_songs) {
                var i = _songs.indexOf(_activeSong);
                i++;
                if (i < _songs.count()) {
                    Player.playOne(_songs.at(i));
                }
            }
        }

        //? Moves to the previous song in the queue of playing songs
        //@ cap(musicandsounds)
        //@ writesMutable
        export function previous(): void
        {
            if (_songs) {
                var i = _songs.indexOf(_activeSong);
                i--;
                if (i > -1) {
                    Player.playOne(_songs.at(i));
                }
            }
        }

        //? Pauses the currently playing song
        //@ cap(musicandsounds)
        //@ writesMutable
        export function pause(): void
        {
            if (_audio) {
                _audio.pause();
            }
        }

        export function playOne(song: Song)
        {
            if (_activeSong != song) {
                ensureAudio();
                _activeSong = song;
                var url = song.url();
                _source.src = url;
                if (RuntimeSettings.sounds()) {
                    HTML.showProgressNotification(lf("playing song..."));
                    _audio.play();
                }
                raiseActiveSongChanged();
            }
        }

        //? Plays a Song
        //@ cap(musicandsounds)
        //@ writesMutable [song].readsMutable [song].writesMutable
        export function play(song: Song)
        {
            _songs = undefined; // clear song list
            Player.playOne(song);
        }

        //? Plays a collection of songs
        //@ cap(musicandsounds)
        //@ writesMutable
        //@ embedsLink("Player", "Songs")
        export function play_many(songs: Songs): void
        {

            if (songs.count() == 0) {
                _songs = undefined;
                Player.stop();
            }
            else {
                _songs = songs;
                _activeSong = undefined;
                Player.playOne(_songs.at(0));
            }
        }

        //? Gets the position in seconds whithin the active song
        //@ returns(number)
        //@ readsMutable quickAsync
        export function play_position(r: ResumeCtx) /*: number*/
        {
            r.resumeVal(_audio ? _audio.currentTime : undefined);
        }

        //? Resumes a paused song
        //@ cap(musicandsounds)
        //@ writesMutable
        export function resume(): void {
            if (_audio && RuntimeSettings.sounds()) {
                _audio.play();
            }
        }

        //? Stops playing a song
        //@ cap(musicandsounds)
        //@ writesMutable
        export function stop(): void
        {
            if (_audio) {
                _source.src = null;
                _audio.load();
            }
        }

        //? Indicates if the player is muted
        //@ readsMutable returns(boolean) quickAsync
        export function is_muted(r : ResumeCtx) // : boolean
        {
            r.resumeVal(_audio ? _audio.muted : false);
        }

        //? Gets the sound volume for sounds from 0 (silent) to 1 (current volume)
        //@ stub cap(media)
        //@ readsMutable
        export function sound_volume() : number
        { return undefined; }

        //? Sets the sound volume level from 0 (silent) to 1 (current volume)
        //@ stub cap(media)
        export function set_sound_volume(x:number) : void
        { }

        //? Indicates if the player is repeating
        //@ readsMutable returns(boolean) quickAsync
        export function is_repeating(r : ResumeCtx) //: boolean
        {
            r.resumeVal(_audio ? _audio.loop : false);
        }

        //? Sets the repeating on and off
        //@ writesMutable quickAsync
        //@ [repeating].defl(true)
        export function set_repeating(repeating:boolean, r : ResumeCtx) : void
        {
            ensureAudio();
            _audio.loop = repeating;
            r.resume();
        }

        //? Indicates if the player is shuffled
        //@ readsMutable returns(boolean) quickAsync
        export function is_shuffled(r : ResumeCtx) // : boolean
        {
            r.resumeVal(_shuffled);
        }

        //? Sets the shuffling on and off
        //@ writesMutable quickAsync
        //@ [shuffled].defl(true)
        export function set_shuffled(shuffled: boolean, r : ResumeCtx): void
        {
            _shuffled = shuffled;
            r.resume();
        }

        //? Indicates if the player is stopped
        //@ readsMutable returns(boolean) quickAsync
        export function is_stopped(r : ResumeCtx) // : boolean
        {
            r.resumeVal(_audio ? _audio.ended : true);
        }

        //? Indicates if the player is playing a song
        //@ readsMutable returns(boolean) quickAsync
        export function is_playing(r : ResumeCtx) // : boolean
        {
            r.resumeVal(_audio ? (!_audio.ended && !_audio.paused) : false);
        }

        //? Indicates if the player is paused
        //@ readsMutable returns(boolean) quickAsync
        export function is_paused(r : ResumeCtx) //: boolean
        {
            r.resumeVal(_audio ? _audio.paused : false);
        }

        //? Plays an audio/video file from the home network
        //@ writesMutable cap(home)
        export function play_home_media(media: MediaLink): void {
            switch (media.kind()) {
                case 'song':
                    var s = Song.mk(media.url(), 'media', media.title());
                    Player.play(s);
                    break;
                default:
                    Web.play_media(media.url());
                    break;
            }
        }

        //? Volume is no longer supported.
        //@ obsolete
        //@ readsMutable
        export function volume(): number { return 0; }
    }
}
