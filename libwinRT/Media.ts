///<reference path='refs.ts'/>
module TDev.RT.WinRT {
    export function MediaInit()
    {
        var Media = <any>TDev.RT.Media;

        Media.pictures = function (r: ResumeCtx)
        {
            WinRTPictures.mkWinRT(r);
        };

        Media.songs = function (r: ResumeCtx)
        {
            WinRTSongs.mkWinRT(r);
        };

        Media.choose_picture = function (r: ResumeCtx)
        {
            if (!UtilWinRT.tryUnsnap()) {
                r.resumeVal(undefined);
                return;
            }
            // Create the picker object and set options
            var openPicker = new Windows.Storage.Pickers.FileOpenPicker();
            openPicker.viewMode = Windows.Storage.Pickers.PickerViewMode.thumbnail;
            openPicker.suggestedStartLocation = Windows.Storage.Pickers.PickerLocationId.picturesLibrary;
            // Users expect to have a filtered view of their folders depending on the scenario.
            // For example, when choosing a documents folder, restrict the filetypes to documents for your application.
            openPicker.fileTypeFilter.replaceAll([".png", ".jpg", ".jpeg"]);

            // Open the picker for the user to pick a file
            openPicker.pickSingleFileAsync().then(function (file : Windows.Storage.StorageFile) {
                if (file) {
                    var url = URL.createObjectURL(file, { oneTimeOnly: true });
                    Picture.fromUrl(url)
                        .then(
                            (p : Picture) => r.resumeVal(p),
                            (e : any) => r.resumeVal(undefined));
                }
                else
                    r.resumeVal(undefined);
            });
        };
    }
}
