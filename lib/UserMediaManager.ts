///<reference path='refs.ts'/>
module TDev.RT {
    export module UserMediaManager
    {
        var _initialized: boolean = false;
        function init()
        {
            if (!_initialized) {
                (<any>navigator).getUserMedia =
                    (<any>navigator).getUserMedia
                    || (<any>navigator).webkitGetUserMedia
                    || (<any>navigator).mozGetUserMedia
                    || (<any>navigator).msGetUserMedia;
                (<any>window).URL = (<any>window).URL || (<any>window).webkitURL;
                _initialized = true;
            }
        }

        export function isSupported() : boolean
        {
            init();
            return !!((<any>navigator).getUserMedia);
        }

        export function getMicrophoneStreamAsync(): Promise
        {
            if (!isSupported()) return Promise.as(undefined);

            return new Promise((onSuccess, onError, onProgress) => 
            {
                try {
                    (<any>navigator).getUserMedia(
                        { audio: true },
                        (localMediaStream: any) => {
                            onSuccess(localMediaStream);
                        },
                        (e : any) => {
                            Time.log('microphone access failed, ' + e.message);
                            onSuccess(undefined)
                        });
                }
                catch (e) {
                    Time.log('microphone access failed, ' + e.message);
                    onError(undefined);
                }
            });
        }

        // facingMode = 'user' for front, 'environment' for back
        export function getCameraUrlAsync(front : boolean = false, sourceId : string = undefined): Promise
        {
            if (!isSupported()) return Promise.as(undefined);

            return new Promise((onSuccess, onError, onProgress) => 
            {
                try {
                    var constraints = <any>{
                        video: {
                            optional:[]
                        }
                    };
                    // see Constraint API, supported in Chrome 30.0
                    constraints.video.optional.push({ facingMode: front ? "user" : "environment" });
                    if (sourceId) constraints.video.optional.push({ sourceId: sourceId });
                    (<any>navigator).getUserMedia(
                        constraints,
                        (localMediaStream: any) => {
                            var url = (<any>window).URL.createObjectURL(localMediaStream);
                            onSuccess(url);
                        },
                        (e : any) => {
                            Time.log('camera access failed, ' + e.message);
                            onSuccess(undefined)
                        });
                }
                catch (e) {
                    Time.log('camera access failed, ' + e.message);
                    onError(undefined);
                }
            });
        }

        export function previewVideo(v : HTMLVideoElement): string
        {
            // assumes video is streaming; otherwise the picture will be dark
            var canvas = <HTMLCanvasElement>createElement('canvas');
            canvas.width = v.clientWidth;
            canvas.height = v.clientHeight;

            var ctx = canvas.getContext('2d');
            ctx.drawImage(v, 0, 0);
            var picurl = canvas.toDataURL('image/jpeg');

            return picurl;
        }
    }
}
