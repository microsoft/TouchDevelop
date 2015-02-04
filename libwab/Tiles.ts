///<reference path='refs.ts'/>
module TDev.RT.Wab {
    export function TilesInit()
    {
        if (isSupportedAction(Action.UPDATE_TILE)) {
            Util.log('wab: boosting UPDATE_TILE');
            Tiles.updateTileAsync = TilesWab.updateTileAsync;
        }
    }

    export module TilesWab {
        export function updateTileAsync(fragment : string, data : ITileData) : Promise {
			Util.log('wab: update tile');
			return sendRequestAsync(<UpdateTileRequest>{ action: Action.UPDATE_TILE,
                uri: fragment,
                background: data.background,
				content:data.content,
				title:data.title,
                counter: data.counter,
                icon: data.icon,
                pictures: data.pictures,
                template: data.template,
				pin:data.pin })
				.then((r : Response) => {
					Util.log('wab: update tile: ' + r.status);
				});
		}
    }
}
