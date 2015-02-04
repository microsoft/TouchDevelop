///<reference path='refs.ts'/>
module TDev.RT.WinRT {
    export function SensesInit()
    {
        var Senses = <any>TDev.RT.Senses;

        Senses.camera = function(r : ResumeCtx)
        {
            WinRTCamera.findCamera(false, c => r.resumeVal(c));
        };

        Senses.front_camera = function(r : ResumeCtx)
        {
            WinRTCamera.findCamera(true, c => r.resumeVal(c));
        };

        Senses.has_front_camera = function(r : ResumeCtx)
        {
            WinRTCamera.findCamera(true, c => c != null);
        };

        Senses.take_camera_picture = function (r: ResumeCtx)
        {
            var captureUI = new Windows.Media.Capture.CameraCaptureUI();
            //captureUI.photoSettings.allowCropping = true;
            captureUI.captureFileAsync(Windows.Media.Capture.CameraCaptureUIMode.photo)
                .then(function (file : Windows.Storage.StorageFile)
            {
                if (file) {
                    var url = URL.createObjectURL(file, { oneTimeOnly: true });
                    Picture.fromUrl(url)
                        .then((pic: Picture) =>
                        {
                            r.resumeVal(pic);
                        });
                }
                else {
                    r.resumeVal(undefined);
                }
            });
        }
    }
}
