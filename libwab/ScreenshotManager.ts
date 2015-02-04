///<reference path='refs.ts'/>
module TDev.RT.Wab {
    export function ScreenshotManagerInit()
    {
        if (isSupportedAction(Action.SCREENSHOT)) {
            Util.log('wab: boosting screenshot');
            TDev.RT.ScreenshotManager.toScreenshotURLAsync = ScreenshotManagerWab.toScreenshotURLAsync;
        }
    }

    export module ScreenshotManagerWab {
        export function toScreenshotURLAsync(rt: RuntimeHost): Promise {
            return sendRequestAsync({ action: Action.SCREENSHOT })
                .then((response: UriResponse) => {
                    if (response.status === Status.OK)
                        return response.uri;
                    else
                        return undefined;
                });
        }
    }
}
