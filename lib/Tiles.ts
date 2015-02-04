///<reference path='refs.ts'/>
module TDev.RT {
	export interface ITileData {
        counter?: number;
        content?: string;
        title?: string;
        background?: string; // HTML color or image data uri
        pin?: boolean;
        icon?: string; // picture uri
        pictures?: string[]; // array of pictures
        template?: string; // preferred template name
	}

    //? tiles and notifications for Windows and Windows Phone
    //@ cap(tiles)
    export module Tiles
    {
		export var updateTileAsync = (fragment : string, data : ITileData) : Promise =>
        {
		    return Promise.as();
		}

		function defaultFragment(r : Runtime) : string {
			return 'run%3A' + r.getScriptGuid();
        }

        //? Sets the title, content and counter of the default tile. The counter is hidden if the number is not between 1 or 99.
        //@ cap(tiles) quickAsync
        export function set_default(title: string, content: string, counter: number, r: ResumeCtx) {
            var rt = r.rt;
            Tiles.updateTileAsync(defaultFragment(rt), <ITileData>{
                title: title,
                background: r.rt.getScriptColor(),
                content: content,
                counter: Math_.clamp(0, 100, counter),
            }).done(() => r.resume());
        }

        //? Sets the counter of the default tile. Hidden if the number is not between 1 or 99.
        //@ cap(tiles) quickAsync
        export function set_default_counter(value: number, r : ResumeCtx) {
			var rt = r.rt;
            Tiles.updateTileAsync(defaultFragment(rt), <ITileData>{
                counter: Math_.clamp(0, 100, value),
                background: r.rt.getScriptColor()
            }).done(() => r.resume());
        }

		//? Sets the front of a standard tile.
        //@ cap(tiles) quickAsync
		export function set_default_text(title : string, content : string, r : ResumeCtx) {
			var rt = r.rt;
            Tiles.updateTileAsync(defaultFragment(rt), <ITileData>{
                title: title,
                background: r.rt.getScriptColor(),
                content: content,
                count : -1,
            })
		    .done(() => r.resume());
		}

		//? Pins or updates the default tile.
        //@ cap(tiles) uiAsync
		export function pin_default(r : ResumeCtx) {
			var rt = r.rt;
			Tiles.updateTileAsync(defaultFragment(rt), <ITileData>{
				title: r.rt.getScriptName(),
                background: r.rt.getScriptColor(),
                pin: true,
                count : -1,
            }).done(() => r.resume());
        }

        //? Pins or updates the default tile with custom pictures.
        //@ cap(tiles) uiAsync
        export function pin_pictures(title: string, counter: number, icon: Picture, pictures: Collection<Picture>, r: ResumeCtx) {
            var maxWidth = 691;
            var rt = r.rt;
            var iconUri = "";
            var pictureUris: string[] = [];
			HTML.showProgressNotification(lf("pinning tile..."));
            icon.getDataUriAsync(0.85, 150)
                .then(u => {
                    iconUri = u;
                    return Promise.join(pictures.a.map(pic => pic.getDataUriAsync(0.85, 691)
                                                             .then(uri => pictureUris.push(uri))));
                }).then(() => {
                    Tiles.updateTileAsync(defaultFragment(rt), <ITileData>{
                        title: title,
                        background: r.rt.getScriptColor(),
						counter: Math_.clamp(0, 100, counter),
                        icon: iconUri,
                        pictures: pictureUris,
                        template: 'cycle',
                        pin: true
                    })
                }).done(() => r.resume());
        }

        //? Pins or updates the default tile with a custom picture.
        //@ cap(tiles) uiAsync
        export function pin_picture(title: string, content : string, counter: number, pic: Picture, r: ResumeCtx) {
            var maxWidth = 691;
            var rt = r.rt;
            var iconUri = "";
			var wideUri = "";
			HTML.showProgressNotification(lf("pinning tile..."));
            pic.getDataUriAsync(0.85, 691)
                .then(u => {
                    Tiles.updateTileAsync(defaultFragment(rt), <ITileData>{
                        title: title,
                        background: r.rt.getScriptColor(),
						counter: Math_.clamp(0, 100, counter),
						content: content,
                        icon: u,
                        pictures: [ u ],
                        template: 'flip',
                        pin: true
                    })
                }).done(() => r.resume());
        }
    }
}
