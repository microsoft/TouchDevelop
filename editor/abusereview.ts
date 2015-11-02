///<reference path='refs.ts'/>

module TDev.AbuseReview
{
    var root:HTMLElement;
    var scroll:HTMLElement;
    var pg:Browser.AbuseReportsPage;

    export function show()
    {
        if (!root) {
            var resolved = 
                HTML.mkButton(lf("resolved: shown"), () => {
                    if (root.getAttribute("data-hideresolved") == "yes") {
                        resolved.setChildren(lf("resolved: shown"))
                        root.setAttribute("data-hideresolved", "no")
                    } else {
                        resolved.setChildren(lf("resolved: hidden"))
                        root.setAttribute("data-hideresolved", "yes")
                    }
                })
            root = div("abuseReview",
                HTML.mkButton(lf("abuse reports"), () => {
                    show();
                }, "onlyHidden"),
                HTML.mkButton(lf("refresh"), () => {
                    refresh();
                }),
                resolved,
                HTML.mkButton(lf("minimize"), () => {
                    hide();
                }),
                scroll = div("scroll"))
            elt("root").appendChild(root)
            pg = new Browser.AbuseReportsPage(Browser.TheHost);
            scroll.setChildren(pg.initOverlay())
        }

        ModalDialog.dismissCurrent()
        root.className = "abuseReview";
    }

    function refresh()
    {
        pg.refresh();
    }

    export function hide()
    {
        if (!root) return;

        root.className = "abuseReview abuseReviewHidden";
    }

}

