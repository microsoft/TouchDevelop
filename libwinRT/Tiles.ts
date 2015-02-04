///<reference path='refs.ts'/>
module TDev.RT.WinRT {
    export function TilesInit() {
        Tiles.updateTileAsync = TilesWinRT.updateTileAsync;
    }

    export module TilesWinRT {
        export function updateTileAsync(fragment: string, data: ITileData): Promise {
            var count = data.counter;
            var notifications = Windows.UI.Notifications;
            var badgeUpdateManager = notifications.BadgeUpdateManager;
            var updater = notifications.BadgeUpdateManager.createBadgeUpdaterForApplication()
            if (count <= 0)
                updater.clear();
            else {
                var badgeType = notifications.BadgeTemplateType.badgeNumber;
                var badgeXml = badgeUpdateManager.getTemplateContent(badgeType);
                var badgeAttributes = badgeXml.getElementsByTagName("badge");
                badgeAttributes[0].setAttribute("value", Math_.round(count).toString());
                var badgeNotification = new notifications.BadgeNotification(badgeXml);
                updater.update(badgeNotification);
            }
            return Promise.as();
        }
    }
}
