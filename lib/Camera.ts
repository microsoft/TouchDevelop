///<reference path='refs.ts'/>
module TDev.RT {
    //? The front or back camera
    //@ walltap
    export class Camera
        extends RTValue
    {
        private _isFront: boolean = false;
        private _deviceId: string = undefined;
        private _videoUrl: string = undefined;
        private _video: HTMLVideoElement = undefined;

        constructor() {
            super()
        }

        public set_is_front(isFront : boolean)
        {
            this._isFront = isFront;
        }

        public device_id() : string { return this._deviceId; }
        public set_device_id(deviceId: string)
        {
            this._deviceId = deviceId;
        }

        //? Gets the height of the camera image in pixels.
        //@ stub()
        public height() : number
        {
            return undefined;
        }

        //? Indicates if this camera is in front of the phone; false if this is the primary (back) camera.
        public is_front() : boolean
        {
            return this._isFront;
        }

        //? Gets the width of the camera image in pixels.
        //@ stub()
        public width() : number
        {
            return undefined;
        }

        public getVideoAsync(r : Runtime): Promise
        {
            return this.askCameraAccessAsync(r)
                .then(allow => {
                    if (!allow) return Promise.as(undefined);
                    else
                        return new Promise((onSuccess, onError, onProcess) => {
                            if (this._videoUrl) {
                                var v = <HTMLVideoElement>createElement('video');
                                v.src = this._videoUrl;
                                v.controls = false;
                                v.autoplay = true;
                                onSuccess(v);
                            }
                            else {
                                UserMediaManager.getCameraUrlAsync(this._isFront, this._deviceId)
                                .then((url: string) => {
                                    if (url) {
                                        this._videoUrl = url;
                                        var v = <HTMLVideoElement>createElement('video');
                                        v.src = this._videoUrl;
                                        v.controls = false;
                                        v.autoplay = true;
                                        onSuccess(v);
                                    }
                                    else {
                                        onSuccess(undefined);
                                    }
                                })
                                .done();
                            }
                        });
                })
        }

        public askCameraAccessAsync(r: Runtime): Promise { // boolean
            return r.host.askSourceAccessAsync("camera", "your camera.", false);
        }

        //? Displays the camera video stream in full screen.
        //@ flow(SourceCamera)
        public post_to_wall(s : IStackFrame): void
        {
            this.getVideoAsync(s.rt)
                .done(v => {
                    this._video = v;
                    if (this._video) {
                        this._video.controls = true;
                        s.rt.postBoxedHtml(this._video, s.pc);
                    }
                    //s.rt.currentResumeCtx.resume();
                });
        }

        private previewVideo(v : HTMLVideoElement, r : ResumeCtx)
        {
            var picurl = UserMediaManager.previewVideo(v);
            Picture.fromUrl(picurl)
                .then(p => { r.resumeVal(p) });
        }

        //? Takes a low quality picture from the camera.
        //@ flow(SourceCamera) returns(Picture) uiAsync
        public preview(r: ResumeCtx) // : Picture
        {           
            if (this._video) {
                this.previewVideo(this._video, r);
            } else {
                this.getVideoAsync(r.rt)
                    .then(v => {
                        if (!v) {
                            r.resumeVal(undefined);
                        } else {
                            this._video = v;
                            this._video.controls = true;
                            r.rt.postBoxedHtml(this._video, r.rt.current.pc);
                            // events specifying that the video started do not trigger reliably
                            // so unfortunately, waiting is our best option
                            Util.setTimeout(5 * 1000, () => { this.previewVideo(this._video, r); });                        
                        }
                    })
                    .done();
            }
        }
    }
}
