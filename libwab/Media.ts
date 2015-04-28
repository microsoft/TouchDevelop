///<reference path='refs.ts'/>
module TDev.RT.Wab {
    export function MediaInit()
    {
        var Media = <any>TDev.RT.Media;
        if (isSupportedAction(Action.PICK_IMAGE)) {
            Util.log('wab: boosting PICK_IMAGE');
            Media.choose_picture = MediaWab.choose_picture;
            HTML.mkImageInput = HTMLWab.mkImageInput;
            HTML.mkImageChooser = HTMLWab.mkImageChooser;
        }

        if (isSupportedAction(Action.STATUS)) {
            Util.log('wab: boosting STATUS');
            HTML.showProgressNotification = HTMLWab.showProgressNotification;
        }

        if (isSupportedAction(Action.LIST_IMAGE_ALBUMS)) {
            Util.log('wab: boosting LIST_IMAGE_ALBUMS');
            Media.pictureAlbumsAsync = MediaWab.pictureAlbumsAsync;
        }

        if (isSupportedAction(Action.LIST_IMAGES) || isSupportedAction(Action.LIST_IMAGE_ALBUM)) {
            Util.log('wab: boosting LIST_IMAGES, LIST_IMAGE_ALBUM');
            Media.picturesAsync = MediaWab.picturesAsync;
        }

        if (isSupportedAction(Action.IMAGE)) {
            Util.log('wab: boosting IMAGE');
            Media.pictureDataUriAsync = MediaWab.pictureDataUriAsync;
            Media.pictureUriForMedia = MediaWab.pictureUriForMedia;
        }

        if (isSupportedAction(Action.LIST_SONGS)) {
            Util.log('wab: boosting LIST_SONGS');
            Media.songsAsync = MediaWab.songsAsync;
            MediaWab.songsAsyncAction = Action.LIST_SONGS;
        }

        if (isSupportedAction(Action.LIST_SONG_ALBUM)) {
            Util.log('wab: boosting LIST_SONG_ALBUM');
            Media.songsAsync = MediaWab.songsAsync;
            MediaWab.songsAsyncAction = Action.LIST_SONG_ALBUM;
        }

        if (isSupportedAction(Action.LIST_SONG_ALBUMS)) {
            Util.log('wab: boosting LIST_SONG_ALBUMS');
            Media.songAlbumsAsync = MediaWab.songAlbumsAsync;
        }

        if (isSupportedAction(Action.SONG_ALBUM)) {
            Util.log('wab: boosting SONG_ALBUM');
            Media.initSongAlbumAsync = MediaWab.initSongAlbumAsync;
        }

        if (isSupportedAction(Action.SONG_ALBUM_ART)) {
            Util.log('wab: boosting SONG_ALBUM_ART');
            Media.loadSongAlbumArtAsync = MediaWab.loadSongAlbumArtAsync;
        }
    }

    export module MediaWab {
        export function choose_picture(r: ResumeCtx) {
            sendRequestAsync({ action: Action.PICK_IMAGE })
                .then((response: UriResponse) => {
                    if (response.status === Status.OK && response.uri)
                        return Picture.fromUrl(response.uri);
                    else
                        return Promise.as(undefined);
                }).done(pic => r.resumeVal(pic));
        }

        export function pictureUriForMedia(uri: string, media: string) {
            if (!/^wab:/.test(uri))
                return uri;
            return uri += "&media=" + encodeURIComponent(media);
        }

        export function pictureDataUriAsync(uri: string): Promise { // string
            if (!/^wab:/.test(uri))
                return Promise.as(undefined);

            Util.log('wab: picture load');
            return sendRequestAsync(<UriRequest>{ action: Action.IMAGE, uri: uri })
                .then((response: UriResponse) => {
                        if (response.status == Status.OK) {
                            Util.log('wab: picture load success: ' + uri);
                            return response.uri;
                        } else {
                            Util.log('wab: picture load failed: ' + response.status);
                            return undefined;
                        }
                    });
        }

        export function picturesAsync(uri: string): Promise {
            return new Promise((onSuccess, onError, onProgress) => {
                var pics: string[] = [];
                sendRequest(<UriRequest>{ action: Action.LIST_IMAGES, uri: uri },
                            (response: ListImagesResponse) => {
                                if (response.status == Status.OK && !isLastResponse(response)) {
                                    pics.push(response.uri);
                                } else {
                                    onSuccess(Pictures.mk(pics));
                                }
                            });
            });
        }

        export function pictureAlbumsAsync(uri : string): Promise {
            return new Promise((onSuccess, onError, onProgress) => {
                var albums: PictureAlbum[] = [];
                sendRequest({ action: Action.LIST_IMAGE_ALBUMS, uri: uri },
                    (response: ListImageAlbumsResponse) => {
                        if (response.status == Status.OK && !isLastResponse(response)) {
                            albums.push(PictureAlbum.mk(response.name, response.uri));
                        } else {
                            onSuccess(PictureAlbums.mk(albums));
                    }
                    });
                });
        }

        export var songsAsyncAction : string = Action.LIST_SONGS;
        export function songsAsync(album: string): Promise {
            return new Promise((onSuccess, onError, onProgress) => {
                Util.log("wab: listing songs: " + album);
                var songs: Song[] = [];
                sendRequest({ action: songsAsyncAction, name: album },
                            (response: ListSongsResponse) => {
                                if (response.status == Status.OK && !isLastResponse(response)) {
                                    var song = Song.mk(response.uri, undefined, response.title);
                                    song.init(response.title, response.album, response.artist, response.duration || -1, "", 0, response.track || -1);
                                    songs.push(song);
                                } else {
                                    Util.log('wab: found songs: ' + songs.length);
                                    onSuccess(Songs.mk(songs));
                                }
                            });
            });
        }

        export function songAlbumsAsync(): Promise {
            return new Promise((onSuccess, onError, onProgress) => {
                Util.log("wab: listing song albums");
                var albums: SongAlbum[] = [];
                sendRequest({ action: Action.LIST_SONG_ALBUMS },
                    (response: ListSongAlbumsResponse) => {
                        if (response.status == Status.OK && !isLastResponse(response)) {
                            var album = SongAlbum.mk(response.name, response.artist);
                            albums.push(album);
                        } else {
                            onSuccess(SongAlbums.mk(albums));
                    }
                    });
                });
        }

        export function initSongAlbumAsync(album : SongAlbum): Promise { // string
            Util.log('wab: init song album:' + album.name());
            var genre: string = '';
            var duration: number = 0;
            return sendRequestAsync({ action: Action.SONG_ALBUM, name: album.name() })
                .then((response: SongAlbumResponse) => {
                    if (response.status == Status.OK && response.thumbnail) {
                        genre = response.genre;
                        duration = response.duration;
                        return Picture.fromUrl(response.thumbnail, true);
                    }
                    else return Promise.as(undefined);
                }).then(thumbnail => album.init(genre, duration, thumbnail));
        }

        export function loadSongAlbumArtAsync(albumName: string): Promise { // string
            Util.log('wab: load song album art:' + albumName);
            return sendRequestAsync({ action: Action.SONG_ALBUM_ART, name: albumName })
                .then((response: UriResponse) => {
                    if (response.status == Status.OK && response.uri)
                        return Picture.fromUrl(response.uri, true);
                    else return Promise.as(undefined);
                });
        }
    }

    export module HTMLWab {
        export function showProgressNotification(msgText: string, fadeOut: boolean = true, delay: number = 1000, duration: number = 2000) {
            Util.log('wab: status: ' + msgText + ', ' + duration);
            sendRequestAsync(<StatusRequest>{ action: Action.STATUS, progress: !fadeOut, message: msgText, duration: duration })
                .done();
        }

        export function mkAudioInput(allowEmpty: boolean, maxMb: number): HTML.IInputElement {
            var dataUri: string = null;
            var statusDiv = div('', div('validation-error', 'no sound selected'));
            return <HTML.IInputElement>{
                element: div("",
                    HTML.mkButton(lf("record sound"), () => {
                        sendRequestAsync({ action: Action.RECORD_MICROPHONE })
                        .done((response: UriResponse) => {
                            if (response.status === Status.OK) {
                                dataUri = response.uri;
                                var previewPlaying = false;
                                var btn = HTML.mkRoundButton("svg:play,white", lf("play"), Ticks.noEvent, () => {
                                    Util.log('audio input: preview play');
                                    if (!previewPlaying) {
                                        previewPlaying = true;
                                        Sound.fromArtUrl(dataUri)
                                            .then(snd => snd.playAsync())
                                            .done(() => {
                                                previewPlaying = false;
                                            });
                                    }
                                });
                                statusDiv.setChildren([btn]);
                            }
                            else {
                                dataUri = null;
                                statusDiv.setChildren([div('validation-error', lf("no sound selected"))]);
                            }
                        })
                    }),
                    statusDiv
                ),
                validate: function (): string {
                    if (!dataUri)
                        return allowEmpty ? null : lf("Oops, you need to select a sound...");
                    if (dataUri.length > maxMb * 1000000)
                        return lf("Sorry, the sound is too big. The sound must be less than {0} Mb...", maxMb);
                    if (!/^data:audio\/wav/.test(dataUri))
                        return lf("Sorry, you can only upload WAV sounds...");
                    return null;
                },
                readAsync: function (): Promise { return Promise.as(dataUri); }
            };
        }

        export var mkImageInput = (allowEmpty: boolean, maxMb: number): HTML.IInputElement =>
        {
            var dataUri: string = null;
            var statusDiv = div('', div('validation-error', lf("no picture selected")));
            return <HTML.IInputElement>{
                element: div("",
                    HTML.mkButton(lf("choose picture"), () => {
                        sendRequestAsync({ action: Action.PICK_IMAGE })
                        .done((response: UriResponse) => {
                            if (response.status === Status.OK) {
                                dataUri = response.uri;
                                var img = HTML.mkImg(dataUri);
                                img.className = 'upload-preview';
                                statusDiv.setChildren([div('upload-preview', img)]);
                            }
                            else {
                                dataUri = null;
                                statusDiv.setChildren([div('validation-error', lf("no picture selected"))]);
                            }
                        })
                    }),
                    statusDiv
                ),
                validate: function (): string {
                    if (!dataUri)
                        return allowEmpty ? null : lf("Oops, you need to select a picture...");
                    if (dataUri.length > maxMb * 1000000)
                        return lf("Sorry, the picture is too big. The picture must be less than {0} Mb...", maxMb);
                    if (!/^data:image\/(jpeg|png)/.test(dataUri))
                        return lf("Sorry, you can only upload JPEG and PNG pictures...");
                    return null;
                },
                readAsync: function (): Promise { return Promise.as(dataUri); }
            };
        }

        export function mkImageChooser(onchanged:(dataUri:string)=>void):HTMLElement
        {
            return HTML.mkButton(lf("choose picture"), () => {
                        sendRequestAsync({ action: Action.PICK_IMAGE })
                        .done((response: UriResponse) => {
                            if (response.status === Status.OK) {
                                onchanged(response.uri);
                            }
                        })
                    });
        }
    }
}
