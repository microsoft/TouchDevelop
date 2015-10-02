///<reference path='refs.ts'/>

module TDev.RT {
    //? Pictures and music...
    //@ skill(2)
    export module Media
    {
        export function rt_start(rt: Runtime): void
        {}

        export function rt_stop(rt: Runtime)
        {
            AudioContextManager.stop();
        }
        
        //? Plays a monotone sine wave
        export function tone(frequency: number, gain: number) {
            AudioContextManager.tone(frequency, gain);
        }
        
        //? Plays a monotone note
        export function play_note(frequency: number, seconds: number, r: ResumeCtx) {    
            if (seconds <= 0) return;
            
            AudioContextManager.tone(frequency, 1);
            Util.setTimeout(seconds * 1000, () => {
                AudioContextManager.tone(frequency, 0);
                Util.setTimeout(40, () => {
                    r.resume();                    
                })
            })
        }

        //? Creates a new picture of the given size
        //@ [result].writesMutable
        //@ [width].defl(480) [height].defl(800)
        export function create_picture(width:number, height:number) : Picture { return Picture.mk(width, height); }

        //? Searches the Windows Phone Store (type in applications or music)
        //@ stub flow(SinkSafe) obsolete
        //@ [type].defl("music")
        export function search_marketplace(terms:string, type:string) : void
        { }

        export function askMusicAccessAsync(r : ResumeCtx): Promise { // boolean
            return r.rt.host.askSourceAccessAsync("music", "your songs, song albums and playlists.", false);
        }
        export function askPictureAccessAsync(r : ResumeCtx): Promise { // boolean
            return r.rt.host.askSourceAccessAsync("picture", "your pictures and picture albums.", false);
        }

        //? Gets the playlists on the phone
        //@ cap(media) flow(SourceMusic) returns(Playlists)
        //@ embedsLink("Playlists", "Playlist") async
        export function playlists(r : ResumeCtx)  // : Playlists
        {
            askMusicAccessAsync(r)
                .then(allow => r.resumeVal(undefined))
                .done();
        }

        export function pictureUriForMedia(uri: string, media: string) {
            return uri;
        }

        export function pictureDataUriAsync(uri: string): Promise { // string
            return Promise.as(undefined);
        }

        var _pictureUrls: string[] = undefined;
        export function picturesAsync(uri : string) : Promise
        {
            if (!!_pictureUrls)
                return Promise.as(Pictures.mk(_pictureUrls));
            return BingServices.searchAsync("Images", "cat", null)
                .then((results) => {
                    _pictureUrls = results.map((r) => r.url).slice(0, 4);
                    return Pictures.mk(_pictureUrls);
                });
        }

        var _pictureAlbums: PictureAlbums = undefined;
        export function pictureAlbumsAsync(uri : string) : Promise
        {
            if (_pictureAlbums) return Promise.as(_pictureAlbums);

            return Media.picturesAsync(uri).then(pics => {
                _pictureAlbums = PictureAlbums.mk([PictureAlbum.mk('cats', 'cats', pics)]);
                return _pictureAlbums;
            });
        }

        //? Gets the pictures on the phone
        //@ async cap(media) flow(SourcePicture) returns(Pictures)
        //@ embedsLink("Pictures", "Picture")
        export function pictures(r: ResumeCtx) {
            askPictureAccessAsync(r)
                .then(allow => {
                    if (!allow) return Promise.as(Pictures.mk([]));
                    else return Media.picturesAsync('');
                }).done(pics => r.resumeVal(pics));
        }


        //? Gets the saved pictures on the phone
        //@ cap(media) flow(SourcePicture) returns(Pictures)
        //@ embedsLink("Pictures", "Picture") async
        export function saved_pictures(r: ResumeCtx) // : Pictures
        {
            pictures(r);
        }

        export function choosePictureAsync(title = 'choose a picture', description = ''): Promise {
            var cam = (<any>navigator).camera;
            if (cam) {
                return new Promise((onSuccess, onError, onProgress) => {
                    cam.getPicture((url) => {
                        onSuccess(Picture.fromUrlSync(url, false, false));
                    }, (msg) => {
                            TDev.RT.App.logEvent(App.DEBUG, "senses", "choose picture failed: " + msg, undefined);
                            onSuccess(undefined);
                        }, {
                            quality: 85,
                            mediaType: (<any>window).Camera.MediaType.JPEG,
                            sourceType: (<any>window).Camera.PictureSourceType.PHOTOLIBRARY,
                            destinationType: (<any>window).Camera.DestinationType.FILE_URI
                    });
                });
            }

            return new Promise(function (onSuccess, onError, onProgress) {
                var m = new ModalDialog();
                var file = HTML.mkImageInput(true, -1);
                var pic : Picture = null;
                m.add([div("wall-dialog-header", title),
                       div('wall-dialog-body', description),
                       div("wall-dialog-input", file.element),
                       div("wall-dialog-buttons", HTML.mkButtonOnce("ok", () => {
                           file.readAsync()
                               .then(dataUri => {
                                   if (dataUri) return Picture.fromUrl(dataUri);
                                   else return Promise.as(null);
                               })
                               .then(p => {
                                   pic = p;
                                   return p ? p.initAsync() : null;
                               })
                               .done(() => { m.dismiss(); });
                            })
                        )
                    ]);
                m.onDismiss = () => onSuccess(pic);
                m.show();
            });
        }

        //? Chooses a picture from the media library
        //@ flow(SourcePicture) returns(Picture) uiAsync
        //@ import("cordova", "org.apache.cordova.camera")
        export function choose_picture(r: ResumeCtx)
        {
            return choosePictureAsync().done(pic => r.resumeVal(pic));
        }

        //? Gets the picture albums
        //@ cap(media) flow(SourcePicture) returns(PictureAlbums)
        //@ embedsLink("Picture Albums", "Picture Album") async
        export function picture_albums(r: ResumeCtx) //: PictureAlbums
        {
            askPictureAccessAsync(r)
                .then(allow => {
                    if (!allow) return Promise.as(PictureAlbums.mk([]));
                    else return Media.pictureAlbumsAsync('');
                }).done(albums => r.resumeVal(albums));
        }

        export function initSongAlbumAsync(album: SongAlbum): Promise { // must call init
            album.init('', 0, null);
            return Promise.as(undefined);
        }

        export function loadSongAlbumArtAsync(albumName: string): Promise { // string
            return Promise.as(undefined);
        }

        export function songsAsync(album : string) : Promise // Songs
        {
            return Promise.as(Songs.mk([]));
        }

        export function songAlbumsAsync() : Promise // SongAlbums
        {
            return Promise.as(SongAlbums.mk([]));
        }

        //? Gets the songs on the phone
        //@ cap(media) flow(SourceMusic) returns(Songs)
        //@ embedsLink("Songs", "Song") async
        export function songs(r: ResumeCtx)
        {
            askMusicAccessAsync(r)
                .then(allow => {
                    if (!allow) return Promise.as(Songs.mk([]));
                    else return Media.songsAsync("");
                }).done(s => r.resumeVal(s));
        }

        //? Gets the song albums on the phone
        //@ cap(media) flow(SourceMusic) returns(SongAlbums)
        //@ embedsLink("Song Albums", "Song Album") async
        export function song_albums(r : ResumeCtx) // : SongAlbums
        {
            askMusicAccessAsync(r)
                .then(allow => {
                    if (!allow) return Promise.as(SongAlbums.mk([]));
                    else return Media.songAlbumsAsync();
                }).done(s => r.resumeVal(s));
        }

        //? Creates a new game board
        //@ timestamp
        //@ [result].writesMutable
        //@ [height].defl(640)
        export function create_board(height:number, s:IStackFrame) : Board { return Board.mk(s.rt, false, 456, height, false); }

        //? Creates a new game board in portrait mode. On rotatable devices it will take the entire screen when posted.
        //@ obsolete
        //@ timestamp
        //@ [result].writesMutable
        export function create_full_board(s:IStackFrame) : Board {
            return Board.mk(s.rt, false, 480, 800, true);
        }

        //? Creates a new game board in portrait mode. On rotatable devices it will take the entire screen when posted.
        //@ [result].writesMutable
        //@ [width].defl(480) [height].defl(800)
        export function create_portrait_board(width:number, height:number, s:IStackFrame) : Board {
            return Board.mk(s.rt, false, width, height, true);
        }

        //? Creates a new game board in landscape mode. On rotatable devices it will take the entire screen when posted.
        //@ [result].writesMutable
        //@ [width].defl(800) [height].defl(480)
        export function create_landscape_board(width:number, height:number, s:IStackFrame) : Board {
            return Board.mk(s.rt, true, width, height, true);
        }

        var iconNames = [
'123',
'8ball',
'abc',
'acorn',
'add',
'addcircle',
'addfolder',
'addressbook',
'adduser',
'adminuser',
'airplane',
'aligncenter',
'alignleft',
'alignright',
'almostequal',
'alram',
'anchor',
'appointment',
'approvebutton',
'arrowbox',
'arrowcirclealt',
'arrow-circle-r',
'arrowcirclerounded',
'arrowdotted',
'arrowdownl',
'arrowdownr',
'arrowdownrounded',
'arrowhead',
'arrowlarge',
'arrowlr',
'arrowmoving',
'arrowr',
'arrowrlarge',
'arrowrounded',
'arrowstandard',
'arrowstandardcircle',
'award',
'barchart',
'beer',
'bell',
'binoculars',
'blankpage',
'bold',
'bolt',
'bomb',
'book',
'bookmark',
'briefcase',
'brush',
'bulletlist',
'bullseye',
'business',
'businesscard',
'businessperson',
'butterfly',
'cactus',
'calculator',
'callout',
'camera',
'capitalize',
'caution',
'chapback',
'chapbackcircle',
'chapforward',
'chargingbattery',
'check',
'checkalt',
'checkbox',
'checkcircle',
'checkcirclealt',
'cherry',
'clipboard',
'clock',
'clover',
'club',
'coffeecup',
'command',
'commandline',
'construction',
'contacts',
'controller',
'controls',
'copyright',
'creditcard',
'cube',
'cut',
'cycle',
'dashboard',
'delete',
'deleteuser',
'deliverytruck',
'directions',
'document',
'documents',
'documentsalt',
'dollar',
'downbox',
'download',
'downloadbutton',
'downloadbuttonalt',
'downloadpage',
'drawing',
'email',
'emaildoc',
'emailopen',
'emergency',
'emptybattery',
'erase',
'euro',
'exclamation',
'exclamationcircle',
'exclamationcirclealt',
'exit',
'expand',
'eye',
'farm',
'female',
'files',
'film',
'fire',
'fit',
'fithorizontal',
'flag',
'fleurdelis',
'flipchart',
'flowchart',
'folder',
'formattext',
'forward',
'forwardbutton',
'fourcolumn',
'fullbattery',
'funnel',
'gaspump',
'globe',
'globea',
'globeas',
'globeaus',
'globeeua',
'globesa',
'globeus',
'government',
'gps',
'grapes',
'graph',
'group',
'halfbattery',
'hammer',
'headphones',
'heart',
'heartalt',
'help',
'home',
'homealt',
'horn',
'horseshoe',
'hourglass',
'im',
'inbox',
'info',
'infocircle',
'infocirclealt',
'italic',
'journal',
'joystick',
'justified',
'key',
'lab',
'ladder',
'leaf',
'lightbulb',
'linechart',
'link',
'loading',
'loadingalt',
'location',
'lock',
'lockedfolder',
'male',
'map',
'martini',
'maximize',
'megaphone',
'mic',
'minusbox',
'minusboxalt',
'mobilephone',
'money',
'monitor',
'moon',
'mountains',
'movie',
'mp3player',
'multiply',
'multiplycircle',
'music',
'mute',
'needle',
'newpage',
'newpagealt',
'nextscenebutton',
'ninecolumn',
'notebook',
'numberedlist',
'omega',
'openfolder',
'package',
'pagecurl',
'paint',
'painting',
'paperclip',
'pause',
'pausecircle',
'pear',
'pen',
'penalt',
'pencil',
'person',
'phone',
'photo',
'photos',
'pie',
'piechart',
'play',
'playbutton',
'playcircle',
'plusbox',
'plusboxalt',
'pluscircle',
'pound',
'power',
'presentation',
'pricetag',
'printer',
'pushpin',
'question',
'questioncircle',
'questioncirclealt',
'quote',
'raindrop',
'reading',
'recycle',
'removebutton',
'removefolder',
'removepage',
'removeuser',
'restore',
'revert',
'rewind',
'rewindcircle',
'ribbon',
'runningman',
'save',
'savealt',
'screwdriver',
'search',
'setting',
'settings',
'share',
'sharethis',
'shield',
'shirt',
'shoppingbag',
'shoppingbasket',
'shoppingcart',
'shoppingcartalt',
'shrink',
'shuffle',
'signal',
'signalalt',
'sixcolumn',
'smartphone',
'smiliehappy',
'smiliehappyalt',
'smiliejustok',
'smiliejustokalt',
'smiliesad',
'smiliesadalt',
'sms',
'smsalt',
'snowflake',
'sort',
'sortaz',
'sound',
'soundhigh',
'soundlow',
'space',
'spade',
'split',
'stacks',
'star',
'staralt',
'strikeout',
'subtract',
'subtractcircle',
'suitcase',
'sun',
'switch',
'tableft',
'tabright',
'tanktop',
'target',
'terminal',
'text',
'threecolumn',
'thumbsdown',
'ticket',
'tools',
'touchpad',
'trash',
'tree',
'umbrella',
'underline',
'unlock',
'upbox',
'upload',
'video',
'videocam',
'wand',
'warning',
'warningalt',
'watch',
'weather',
'wheel',
'wifi',
'wine',
'workorder',
'wrench',
'writepage',
'yen',
'zoomin',
'zoomout'
];

        //? Gets the list of built-in 48x48 icon names. You can see the icon list in the script settings.
        //@ hidden cap(editoronly)
        export function icon_names() : Collection<string>
        {
            return Collection.mkStrings(iconNames.slice(0));
        }

        function load_icon(name : string, size:number)
        {
            if (iconNames.indexOf(name.toLowerCase()) < 0)
                return undefined;

            return Picture.fromSVGIcon(name.toLowerCase(), size);
        }

        //? Gets a 48x48 icon picture. Use 'media->icon names' to retrieve the list of names available.
        //@ hidden cap(editoronly)
        export function icon(name:string):Picture
        {
            return load_icon(name, 48);
        }

        //? Gets a 96x96 icon picture. Use 'media->icon names' to retrieve the list of names available.
        //@ hidden cap(editoronly)
        export function large_icon(name:string):Picture
        {
            return load_icon(name, 96);
        }
    }
}
