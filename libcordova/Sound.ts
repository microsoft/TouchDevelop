///<reference path='refs.ts'/>
// http://docs.phonegap.com/en/edge/cordova_media_media.md.html
interface Media {
    new (url: string): Media;
    play(): void;
    getDuration(): number;
    seekTo(millis: number): void;
}

module TDev.RT.Cordova {
    // provides a bridge between HTMLAudioElement and Cordova Media
    class MediaShim {
        media: Media;
        public duration = -1;
        public volume = 1;
        public playbackRate = 1;
        constructor(url: string) {
            this.media = new (<any>window).Media(url);
            this.duration = this.media.getDuration();
        }

        public play() {
            this.runMedia(m => m.play());
        }

        private runMedia(f: (m: any) => {}) {
            if (this.media) {
                try {
                    f(this.media);
                } catch (e) {
                    Util.reportError("cordova sound", e, false);
                }
            }
        }
    }

    export function SoundInit() {
        Util.log('wab: boosting PLAY_SOUND');
        Sound.prototype.initAsync = function () {
            var sound: Sound = <Sound>this;
            if ((<any>sound)._audio) return Promise.as(sound);
            return sound.createUrlAsync()
                .then(url => {
                    (<any>sound)._audio = new MediaShim(url);
                    return sound;
                });
        }

        Sound.prototype.resetAsync = function () {
            var sound: Sound = <Sound>this;
            var media : Media = (<any>sound)._audio;
            if (media && media.seekTo) media.seekTo(0);
            return Promise.as();
        }
    }
}
