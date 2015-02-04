///<reference path='refs.ts'/>
module TDev.RT {
    export class WinRTCamera
        extends Camera
    {
        constructor() {
            super()
        }
        static findCamera(isFront : boolean, f : (any) => void)
        {
            //Enumerate webcams and add them to the list
            var deviceInfo = Windows.Devices.Enumeration.DeviceInformation;
            deviceInfo
                .findAllAsync(Windows.Devices.Enumeration.DeviceClass.videoCapture)
                .done(function (deviceInfos : Windows.Devices.Enumeration.DeviceInformationCollection) {
                    var panel = isFront ? Windows.Devices.Enumeration.Panel.front : Windows.Devices.Enumeration.Panel.back;
                    for (var i = 0; i < deviceInfos.length; i++) {
                        var deviceInfo : Windows.Devices.Enumeration.DeviceInformation = deviceInfos.getAt(i);
                        var cameraLocation = deviceInfo.enclosureLocation ? deviceInfo.enclosureLocation.panel : null;
                        if (cameraLocation === panel) {
                            var c = new WinRTCamera();
                            c.set_is_front(isFront);
                            c.set_device_id(deviceInfo.id);
                            f(c);
                            return;
                        }
                    }
                    // fallback to first camera
                    if (!isFront && deviceInfos.length > 0) {
                        var c = new WinRTCamera();
                        c.set_is_front(isFront);
                        c.set_device_id(deviceInfos.getAt(0).id);
                        f(c);
                    }
                    else
                        f(undefined);
            });
        }

        public preview(r : ResumeCtx)
        {
            var stream = new Windows.Storage.Streams.InMemoryRandomAccessStream();
            this.initAsync()
                .then(() => {
                    var imageEncodingProperties = Windows.Media.MediaProperties.ImageEncodingProperties.createJpeg();
                    return this._capture.capturePhotoToStreamAsync(imageEncodingProperties, stream);
                }, (e : any) => r.resumeVal(undefined))
                .then(() => stream.flushAsync())
                .then(() => {
                    stream.seek(0);
                    var streamRef = Windows.Storage.Streams.RandomAccessStreamReference.createFromStream(stream);
                    return streamRef.openReadAsync();
                })
                .then((s : Windows.Storage.Streams.IRandomAccessStreamWithContentType) => {
                    var u = URL.createObjectURL(s);
                    return Picture.fromUrl(u);
                })
                .done(
                    (p: Picture) => r.resumeVal(p),
                    (e: any) => r.resumeVal(undefined)
                );
        }

        private _capture: Windows.Media.Capture.MediaCapture = undefined;
        private initAsync(): any
        {
            if (this._capture) return Promise.as(undefined);

            this._capture = new Windows.Media.Capture.MediaCapture();
            this._capture.onfailed = () => {
                this._capture = undefined;
            }
            var settings = new Windows.Media.Capture.MediaCaptureInitializationSettings();
            settings.audioDeviceId = "";
            settings.videoDeviceId = this.device_id();
            settings.streamingCaptureMode = Windows.Media.Capture.StreamingCaptureMode.video;
            settings.photoCaptureSource = Windows.Media.Capture.PhotoCaptureSource.videoPreview;
            (<any>settings).realTimeModeEnabled = true;
            return this._capture
                .initializeAsync(settings)
        }

        public post_to_wall(s: IStackFrame): void
        {
            var video = <HTMLVideoElement>createElement("video");
            s.rt.postBoxedHtml(video, s.pc);

            this.initAsync()
                .done(() => {
                    if (this._capture) {
                        var url = URL.createObjectURL(this._capture);
                        video.src = url;
                        video.play();
                    }

                    //s.rt.currentResumeCtx.resume();
                });
        }
    }
}
