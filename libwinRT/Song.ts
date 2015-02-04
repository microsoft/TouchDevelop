///<reference path='refs.ts'/>
module TDev.RT {
    export class WinRTSong
        extends Song
    {
        constructor() {
            super()
        }
        public initAsync(): Promise
        {
            var song = this;
            var path = song.path();
            if (!path) return Promise.as();

            return new Promise(function (onSuccess, onError, onProgress)
            {
                Windows.Storage.StorageFile
               .getFileFromPathAsync(path)
               .then(function (file: Windows.Storage.StorageFile)
               {
                   return
                       file.properties
                       .getMusicPropertiesAsync();
               })
               .done(<any>function (p: Windows.Storage.FileProperties.MusicProperties)
               {
                   if(p)
                       song.init(
                           p.title, p.album, p.artist, p.duration, p.genre.getAt(0),
                           p.rating, p.trackNumber);
                   else
                       song.initNoData();
                   onSuccess(undefined);
               });
            });
        }
    }
}
