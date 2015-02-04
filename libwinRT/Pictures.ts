///<reference path='refs.ts'/>
module TDev.RT {
    export class WinRTPictures
        extends Pictures
    {    
        private _files : Windows.Storage.StorageFile[];

        constructor() {
            super()
        }
        static mkWinRT(r: ResumeCtx)
        {
            var folder = Windows.Storage.KnownFolders.picturesLibrary;
            folder.getFilesAsync()
            .then(<any>function (files: Windows.Storage.StorageFile[])
            {
                var pics = new TDev.RT.WinRTPictures();
                pics._files = files;
                r.resumeVal(pics);
            });
        }

        // Gets the item at position 'index'; invalid if index is out of bounds
        public at(index: number, r: ResumeCtx)
        {
            index = Math.floor(index);
            if (index < 0 || index > this._files.length) {
                r.resumeVal(undefined);
                return;
            }

            var file = this._files[index];
            var url = URL.createObjectURL(file, { oneTimeOnly: true });
            Picture.fromUrl(url)
                 .then((pic: Picture) =>
                 {
                     r.resumeVal(pic);
                 });
        }
        
        // Gets the thumbnail of i-th picture.
        public thumbnail(index: number, r: ResumeCtx)
        {
            index = Math.floor(index);
            if (index < 0 || index > this._files.length) {
                r.resumeVal(undefined);
                return;
            }

            var file = this._files[index];
            var mode = Windows.Storage.FileProperties.ThumbnailMode.picturesView;
            file.getThumbnailAsync(mode)
                .then(function (thumb: Windows.Storage.FileProperties.StorageItemThumbnail)
                {
                    var url = URL.createObjectURL(thumb, { oneTimeOnly: true });
                    Picture.fromUrl(url)
                         .then((pic: Picture) =>
                         {
                             r.resumeVal(pic);
                         });
                });
        }

        // Gets the number of elements in the collection
        public count() : number {
            return this._files.length;
        }

        // Finds a picture by name and returns the index. Returns -1 if not found.
        public find(name: string): number
        {
            for (var i = 0; i < this._files.length; ++i) {
                var file = this._files[i];
                if (file.name === name)
                    return i;
            }
            return -1;
        }

        // Displays the picture thumbmails to the wall
        public post_to_wall(s:IStackFrame) : void {
            
        }
    }
}
