///<reference path='refs.ts'/>
module TDev.RT.WinRT {
    export function PrintManagerInit()
    {
        PrintManager.setPrintable = PrintManagerWinRT.setPrintable
        PrintManagerWinRT.init();
    }

    export module PrintManagerWinRT
    {
        export function init() {
        }

        export function setPrintable(isPrintable : boolean)
        {
            var printManager = Windows.Graphics.Printing.PrintManager.getForCurrentView();
            if (isPrintable) {
                printManager.onprinttaskrequested = (ev: Windows.Graphics.Printing.PrintTaskRequestedEventArgs) => {
                    var src = MSApp.getHtmlPrintDocumentSource(document);
                    var printTask = ev.request
                        .createPrintTask("TouchDevelop", (args) => {
                            args.setSource(src);
                        });
                }
            }
            else
                printManager.onprinttaskrequested = null;
        }
    }
}
