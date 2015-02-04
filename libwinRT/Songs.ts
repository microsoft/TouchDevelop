///<reference path='refs.ts'/>
module TDev.RT {
    export class WinRTSongs
        extends Songs
    {
        constructor() {
            super()
        }
        static mkWinRT(r: ResumeCtx)
        {
            var folder = Windows.Storage.KnownFolders.musicLibrary;
            folder.getFilesAsync()
            .then(<any>function (files: Windows.Storage.StorageFile[])
            {
                var songs : Song[] = files.map((file) => Song.mk(undefined, file.path, undefined));
                r.resumeVal(Songs.mk(songs));
            });
        }
    }
}
