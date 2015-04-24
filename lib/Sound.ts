///<reference path='refs.ts'/>

module TDev.RT {
    //? A sound effect
    //@ stem("snd") icon("fa-headphones") ctx(general,gckey,walltap)
    export class Sound
        extends RTValue
    {
        private _pan : number = 0;
        private _pitch : number = 0;
        private _volume : number = 1;
        private _url: string = undefined;
        private _urlToken: SoundUrlTokenDomain = SoundUrlTokenDomain.None;
        private _originalUrl: string = undefined;
        private _buffer : AudioBuffer = undefined; // buffer of data used with browsers supporting web audio api
        private _audio: HTMLAudioElement = undefined; // default HTML5 impl

        constructor() {
            super()
        }
        //public jsonFields() { return ["_pan", "_pitch", "_volume", "_url", "_urlToken", "_originalUrl"]; }

        static mk(
            url: string,
            urlToken : SoundUrlTokenDomain = SoundUrlTokenDomain.None,
            originalUrl : string = null) : Sound
        {
            var s = new Sound();
            s._url = url;
            s._urlToken = urlToken;
            s._originalUrl = originalUrl;
            return s;
        }

        static fromDataUrl(dataUrl: string, originalUrl : string) : Promise
        {
            if (!dataUrl) return Promise.as(null);

            var m = dataUrl.match(/^data:audio\/(wav|mp4|mp3);base64,/i);
            if (!m) return Promise.as(null);

            var p = Sound.mk(dataUrl, SoundUrlTokenDomain.None, originalUrl);
            return p.initAsync()
        }

        static dataUriMimeType(url: string) : string {
            var m = /^data:(audio\/(wav|mp4|mp3));base64,/.exec(url);
            return m ? m[1] : undefined;
        }

        // specialized in various platforms
        static patchLocalArtUrl(url : string) : string {
            return url;
        }

        // no caching
        static fromUrl(url : string) : Promise
        {
            // do not test for CORS with data urls
            if (Sound.dataUriMimeType(url))
                return Sound.fromDataUrl(url, null);

            var s = Sound.mk(url, SoundUrlTokenDomain.None, url);
            return s.initAsync();
        }

        static fromArtId(id:string)  : Promise
        {
            return Sound.fromArtUrl('https://az31353.vo.msecnd.net/pub/' + id);
        }

        static fromArtUrl(url:string)  : Promise
        {
            // do not test for CORS with data urls
            if (Sound.dataUriMimeType(url))
                return Sound.fromDataUrl(url, null);

            if (/^\.\/art\//.test(url)) {
                url = Sound.patchLocalArtUrl(url);
            }
            if (!Browser.audioWav) {
                url = HTML.patchWavToMp4Url(url);
                Util.log('fixed art sound: ' + url);
            }

            url = HTML.proxyResource(url);
            
            function streamed() : Promise {
                var s = Sound.mk(url, SoundUrlTokenDomain.None, url);
                return s.initAsync();
            }

            if (Browser.audioDataUrls || AudioContextManager.isSupported()) {
                return ArtCache.getArtAsync(url, "audio/*")
                    .then(dataUrl => {
                        // art caching might fail
                        if (dataUrl) return Sound.fromDataUrl(dataUrl, url);
                        else return streamed();
                    });
            }

            return streamed();
        }

        public toWabRequestAsync(): Promise {
            return this.createUrlAsync()
                .then(url => {
                    return {
                        uri : url,
                        pan : this._pan,
                        pitch : this._pitch,
                        volume : this._volume
                    };
                });
        }

        public initAsync() : Promise
        {
            if (this._buffer || this._audio) return Promise.as(this);

            // if Web Audio supported, simply load the sound data
            if (AudioContextManager.isSupported() &&
                Sound.dataUriMimeType(this._url)) {
                var array = Util.decodeDataURL(this._url);
                if (array)
                    return AudioContextManager
                        .loadAsync(array.buffer)
                        .then(b => {
                            this._buffer = b;
                            return this;
                        });
            }

            // HTML5 way, using an audio tag
            return this.createAudioAsync()
               .then(audio => HTML.audioLoadAsync(audio))
               .then(audio => {
                    this._audio = audio;
                    return this;
               });
        }

        public getDataUri() : string {
            if(this._url && Sound.dataUriMimeType(this._url))
                return this._url;
            return undefined;
        }

        public createUrlAsync(): Promise // string
        {
            var url = this._url;
            switch (this._urlToken) {
                case SoundUrlTokenDomain.TouchDevelop:
                    url = Cloud.getPrivateApiUrl(url);
                    break;
                case SoundUrlTokenDomain.MicrosoftTranslator:
                    return AzureMarketplace.requestAccessTokenAsync(ApiManager.microsoftTranslatorClientId,
                        ApiManager.microsoftTranslatorClientSecret, "http://api.microsofttranslator.com", "client_credentials")
                        .then(accessToken => {
                            return url + "&appId=" + encodeURIComponent("BEARER " + accessToken);
                        });
                    break;
            }
            // wav extension? let's download the sound
            if (/^https?:\/\/.*\.wav$/i.test(url))
            {
                Util.log('sound createurl: loading online wav file');
                var wr = WebRequest.mk(url, null);
                wr.set_accept('audio/wav');
                return wr.sendAsync()
                    .then((response: WebResponse) => {
                        var bytes = response.contentAsArraybuffer();
                        if (bytes) {
                            var dataUri = 'data:audio/wav;base64,' + Util.base64EncodeBytes(<number[]><any>bytes);
                            Util.log('sound createurl: loaded online wav file');
                            this._url = dataUri;
                        } else {
                            Util.log('sound createurl: failed loading online wav file');
                        }
                        return dataUri;
                    });
            }
            return Promise.as(url);
        }

        private createAudioAsync(): Promise // HTMLAudioElement
        {
            return this.createUrlAsync()
                .then(url => {
                    var audio = HTML.mkAudio(url);
                    return audio;
                });
        }

        private syncAudioProperties(audio : HTMLAudioElement)
        {
            try {
                audio.volume = this._volume;
                audio.playbackRate = 1 + this._pitch / 2;
            } catch (e) { }
        }

        //? Gets the panning, ranging from -1.0 (full left) to 1.0 (full right).
        //@ readsMutable
        public pan() : number { return this._pan; }

        //? Sets the panning, ranging from -1.0 (full left) to 1.0 (full right).
        //@ writesMutable
        public set_pan(pan:number) : void { this._pan = pan; }

        //? Gets the pitch adjustment, ranging from -1 (down one octave) to 1 (up one octave).
        //@ readsMutable
        public pitch() : number
        {
            return this._pitch;
        }

        //? Sets the pitch adjustment, ranging from -1 (down one octave) to 1 (up one octave).
        //@ writesMutable
        public set_pitch(pitch:number) : void {
            this._pitch = pitch;
        }

        //? Gets the volume from 0 (silent) to 1 (full volume)
        //@ readsMutable
        public volume() : number { return this._volume; }

        //? Sets the volume from 0 (silent) to 1 (full volume).
        //@ writesMutable
        public set_volume(v:number) : void {
            this._volume = Math_.normalize(v);
            if (this._audio)
                this.syncAudioProperties(this._audio);
        }

        //? Gets the duration in seconds.
        //@ returns(number) cachedAsync
        //@ readsMutable
        public duration(r : ResumeCtx) // : number
        {
            this.initAsync()
                .then(() => {
                    var d = this._audio ? this._audio.duration : 0;
                    r.resumeVal(isNaN(d) ? 0 : d);
                })
                .done();
        }

        //? Not supported anymore
        //@ obsolete
        //@ writesMutable
        public pause() : void {}

        // resets the sound position
        public resetAsync() : Promise {
            try {
                if (this._audio) {
                    this.syncAudioProperties(this._audio);
                    if (this._audio.currentTime != 0) {
                        this._audio.currentTime = 0;
                        // some streams don't support reseting the position, we have no choice but to reload
                        if (this._audio.currentTime != 0) {
                            this._audio = null;
                            return this.initAsync();
                        }
                    }
                }
            } catch(e) {
                Time.log('failed to reset sound position - ' + e);
            }
            return Promise.as();
        }

        public playAsync(): Promise {
            return this.playCoreAsync();
        }

        public playCoreAsync(): Promise {
            if (!RuntimeSettings.sounds()) {
                return Promise.as(undefined);
            }

            return this.initAsync()
                .then(() => this.resetAsync())
                .then(() => {
                    try {
                        if (this._buffer && AudioContextManager.isSupported())
                            AudioContextManager.play(this._buffer, this._volume);
                        else if (this._audio)
                            this._audio.play();
                    }
                    catch (e) {
                        Time.log('failed to play sound - ' + e);
                    }
                });
        }

        //? Plays the sound effect
        //@ cap(musicandsounds) quickAsync
        //@ readsMutable
        //@ import("cordova", "org.apache.cordova.media")
        public play(r : ResumeCtx) : void
        {
            this.playAsync()
                .done(() => r.resumeVal(undefined));
        }

        //? Plays the song with different volume (0 to 1), pitch (-1 to 1) and pan (-1 to 1).
        //@ cap(musicandsounds) quickAsync
        //@ [volume].defl(1)
        //@ import("cordova", "org.apache.cordova.media")
        public play_special(volume:number, pitch:number, pan:number, r : ResumeCtx) : void
        {
            this.set_volume(volume);
            this.set_pitch(pitch);
            this.set_pan(pan);
            this.play(r);
        }

        //? Displays a player on the wall
        //@ readsMutable
        public post_to_wall(s:IStackFrame) : void
        {
            s.rt.postBoxedHtml(HTML.mkButton('play', () => {
                this.playAsync().done();
            }), s.pc);
        }

        //? Not supported anymore
        //@ obsolete
        //@ writesMutable
        public resume() : void { }

        //? Not supported anymore
        //@ obsolete
        //@ readsMutable
        public state() : string { return undefined; }

        //? Not supported anymore
        //@ obsolete
        //@ writesMutable
        public stop() : void {}
    }

    export enum SoundUrlTokenDomain
    {
        None,
        TouchDevelop,
        MicrosoftTranslator
    }
}
