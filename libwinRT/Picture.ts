///<reference path='refs.ts'/>
module TDev.RT {
    export class WinRTPicture
        extends Picture
    {
        constructor() {
            super()
        }
        public save_to_library(r: ResumeCtx) // : string
        {
            this.initAsync().done(() => {
                var f : Windows.Storage.StorageFile = undefined;
                var s: Windows.Storage.Streams.IRandomAccessStream = undefined;
                var data = this.getImageData();
                var w = this.widthSync();
                var h = this.heightSync();

                var folder = Windows.Storage.KnownFolders.picturesLibrary;
                folder
                .createFileAsync("pic.jpeg", Windows.Storage.CreationCollisionOption.generateUniqueName)
                .then(function (file: Windows.Storage.StorageFile)
                {
                    f = file;
                    // Prevent updates to the remote version of the file until we finish making changes and call CompleteUpdatesAsync.
                    Windows.Storage.CachedFileManager.deferUpdates(file);
                    return file.openAsync(Windows.Storage.FileAccessMode.readWrite);
                }).then(<any>function(stream : Windows.Storage.Streams.IRandomAccessStream)
                {
                    s = stream;
                    s.size = 0;
                    // write to file
                    var encoderId = Windows.Graphics.Imaging.BitmapEncoder.jpegEncoderId;
                    return Windows.Graphics.Imaging.BitmapEncoder.createAsync(encoderId, stream);
                }).then(function (encoder: Windows.Graphics.Imaging.BitmapEncoder)
                {
                    encoder.setPixelData(
                        Windows.Graphics.Imaging.BitmapPixelFormat.rgba8,
                        Windows.Graphics.Imaging.BitmapAlphaMode.straight,
                        w, // pixel width
                        h, // pixel height
                        96, // horizontal DPI
                        96, // vertical DPI
                        <any>data.data
                        );
                    return encoder.flushAsync();
                }).then(function()
                {
                    // Let Windows know that we're finished changing the file so the other app can update the remote version of the file.
                    // Completing updates may require Windows to ask for user input.
                    return Windows.Storage.CachedFileManager.completeUpdatesAsync(f);
                }).done(<any>function (updateStatus : Windows.Storage.Provider.FileUpdateStatus) {
                    if (s) {
                        s.close(); s = undefined;
                    }
                    if (updateStatus === Windows.Storage.Provider.FileUpdateStatus.complete)
                        r.resumeVal(f.name);
                    else
                        r.resumeVal(undefined);
                });
            })
        }
    }
}
