///<reference path='refs.ts'/>
module TDev.RT {
    //? Ask or display values on the wall...
    export module Wall
    {
        var R = HTML;

        //? Clears the background, buttons and entries
        export function clear(s:IStackFrame) : void { s.rt.clearWall(); }

        //? This action is not supported anymore.
        //@ [on].defl(true) obsolete
        export function display_search(on: boolean): void {
            // TODO
        }

        export function body(text:string)
        {
            var r = div("wall-dialog-body")
            Browser.setInnerHTML(r, Util.formatText(text));
            return r
        }

        //? Prompts the user with a ok button
        //@ tandre2
        //@ uiAsync
        export function prompt(text: string, r: ResumeCtx): void {
            var rt = r.rt;
            var m = new ModalDialog();
            m.add([body(text),
                div("wall-dialog-buttons",
                    [R.mkButtonOnce("ok",() => m.dismiss())])
            ]);
            m.onDismiss = () => r.resume();
            m.show();
        }

        //? Prompts the user with ok and cancel buttons
        //@ returns(boolean)
        //@ tandre2
        //@ uiAsync
        export function ask_boolean(text: string, caption: string, r: ResumeCtx) {
            var rt = r.rt;
            var value = false;
            var m = new ModalDialog();
            m.add([div("wall-dialog-header", text),
                body(caption),
                div("wall-dialog-buttons",
                    [R.mkButton(lf("no"),() => {
                        value = false;
                        m.dismiss();
                    }),
                        R.mkButton(lf("yes"),() => {
                            value = true;
                            m.dismiss();
                        })])
            ]);
            m.onDismiss = () => r.resumeVal(value);
            m.show();
        }

        //? Prompts the user to input a number
        //@ returns(number)
        //@ tandre2
        //@ uiAsync
        export function ask_number(text: string, r: ResumeCtx) {
            var rt = r.rt;
            var t = R.mkTextInput("number", lf("enter a number"));
            t.value = "";
            var value = 0;
            var m = new ModalDialog();
            m.add([
                body(text),
                div("wall-dialog-input", t),
                div("wall-dialog-buttons",
                    [R.mkButton(lf("ok"),() => {
                        value = t.valueAsNumber;
                        if (!isFinite(value)) value = parseFloat(t.value); // Firefox
                        if (!isFinite(value)) value = undefined;
                        m.dismiss();
                    })])
            ]);
            m.onDismiss = () => r.resumeVal(value);
            m.show();
            Util.setKeyboardFocus(t);
        }

        //? Prompts the user to input a string
        //@ returns(string)
        //@ tandre2
        //@ uiAsync
        export function ask_string(text: string, r: ResumeCtx) {
            var rt = r.rt;
            var t = R.mkTextArea("variableDesc");
            t.value = "";
            var value = "";
            var m = new ModalDialog();
            m.add([body(text),
                div("wall-dialog-input", t),
                div("wall-dialog-buttons",
                    [R.mkButton(lf("ok"),() => {
                        value = t.value;
                        m.dismiss();
                    })])
            ]);
            m.onDismiss = () => r.resumeVal(value);
            m.show();
            Util.setKeyboardFocusTextArea(t);
        }

        //? Takes a screenshot of the wall.
        //@ flow(SourcePicture) returns(Picture)
        //@ readsMutable [result].writesMutable quickAsync
        export function screenshot(r : ResumeCtx) //: Picture
        {
            ScreenshotManager.toScreenshotURLAsync(r.rt.host)
                .then((data: string) => {
                    if (data != null)
                        return Picture.fromUrl(data)
                    else return Promise.as(undefined);
                }).done(p => r.resumeVal(p));
        }

        //? Creates an updatable text box
        //@ [result].writesMutable
        //@ [font_size].defl(19)
        //@ embedsLink("Wall", "TextBox")
        export function create_text_box(text:string, font_size:number) : TextBox { return TextBox.mk(text, font_size); }

        //? Prompts the user to pick a string from a list. Returns the selected index.
        //@ returns(number)
        //@ tandre2
        //@ uiAsync
        export function pick_string(text: string, caption: string, values: Collection<string>, r: ResumeCtx) {
            var rt = r.rt;
            var m = new ModalDialog();
            var index = -1;
            var btns = values.a.map((st: string, i: number) => div('modalDialogChooseItem', st).withClick(() => {
                index = i;
                m.dismiss();
            }));
            m.add([div("wall-dialog-header", text),
                body(caption)]);
            m.onDismiss = () => r.resumeVal(index);
            m.choose(btns);
        }

        //? Prompts the user to pick a time. Returns a datetime whose time is set, the date is undefined.
        //@ returns(DateTime)
        //@ tandre2
        //@ [caption].defl("pick a time")
        //@ uiAsync
        export function pick_time(text: string, caption: string, r: ResumeCtx) //: DateTime
        {
            var rt = r.rt;
            var t = R.mkTextInput("time", lf("enter a time"));
            t.style.borderStyle = 'hidden';
            t.style.borderColor = 'red';
            t.onkeyup = (ev: Event) => {
                t.style.borderStyle = String_.to_time(t.value) != null ? 'hidden' : 'solid';
            };
            var value: DateTime = undefined;
            var m = new ModalDialog();
            m.add([div("wall-dialog-header", text),
                body(caption),
                div("wall-dialog-input", t),
                body("Enter a time like 15:43 or 3:43pm or 15:43:20 or 3:43:20pm"),
                div("wall-dialog-buttons",
                    [R.mkButton(lf("ok"),() => {
                        var tt = String_.to_time(t.value);
                        if (tt != null)
                            value = Time.today().add_seconds(tt);
                        m.dismiss();
                    })])
            ]);
            m.onDismiss = () => r.resumeVal(value);
            m.show();
            Util.setKeyboardFocus(t);
        }

        //? Prompts the user to pick a date. Returns a datetime whose date is set, the time is 12:00:00.
        //@ returns(DateTime)
        //@ tandre2
        //@ [caption].defl("pick a date")
        //@ uiAsync
        export function pick_date(text: string, caption: string, r: ResumeCtx) //: DateTime
        {
            var rt = r.rt;
            var t = R.mkTextInput("date", lf("enter a date"));
            t.style.borderStyle = 'hidden';
            t.style.borderColor = 'red';
            t.onkeyup = (ev: Event) => {
                t.style.borderStyle = DateTime.parse(t.value) != null ? 'hidden' : 'solid';
            };
            var value: DateTime = undefined;
            var m = new ModalDialog();
            m.add([div("wall-dialog-header", text),
                body(caption),
                div("wall-dialog-input", t),
                div("wall-dialog-buttons",
                    [R.mkButton(lf("ok"),() => {
                        value = DateTime.parse(t.value);
                        m.dismiss();
                    })])
            ]);
            m.onDismiss = () => r.resumeVal(value);
            m.show();
            Util.setKeyboardFocus(t);
        }

        //? Sets the wall foreground color of elements.
        //@ [color].readsMutable
        //@ [color].deflExpr('colors->random')
        export function set_foreground(color:Color, s:IStackFrame) : void
        {
           s.rt.getCurrentPage().fgColor = color.toHtml()
           s.rt.applyPageAttributes(true)
        }

        //? Clears the background color, picture and camera
        export function clear_background(s:IStackFrame) : void
        {
            var p = s.rt.getCurrentPage();
            p.bgColor = null;
            p.bgPicture = null;
            p.bgPictureUrl = null;
            p.bgVideo = null;
            s.rt.applyPageAttributes(true)
        }

        //? Sets the wall background color.
        //@ [color].readsMutable
        //@ [color].deflExpr('colors->random')
        export function set_background(color:Color, s:IStackFrame) : void
        {
           s.rt.getCurrentPage().bgColor = color.toHtml()
           s.rt.applyPageAttributes(true)
        }

        //? Sets the animation for push/pop of pages.
        //@ [style].deflStrings('slide', 'fade', 'none')
        //@ dbgOnly
        export function set_page_transition_style(style:string, s:IStackFrame) : void
        {
           s.rt.pageTransitionStyle = style;
        }

        //? Sets the wall background as a cloud picture. The best resolution will be picked and the picture might be clipped to fit the screen.
        //@ picAsync cap(cloudservices)
        export function set_background_cloud_picture(picture: CloudPicture, r: ResumeCtx): void {
            picture.toPictureUrlAsync("screen")
                .done(url => {
                    if (url) {
                        var wp = r.rt.getCurrentPage();
                        wp.bgPictureUrl = url;
                        wp.bgPicture = null;
                        r.rt.applyPageAttributes(true);
                    }
                    r.resume();
                });
        }

        //? Sets the wall background picture. The picture will be resized and clipped to the screen background as needed.
        //@ [picture].readsMutable picAsync
        export function set_background_picture(picture:Picture, r:ResumeCtx)
        {
            var wp = r.rt.getCurrentPage();
            var url = picture.getReadonlyUrlSync();
            if (url) {
                wp.bgPictureUrl = url;
                wp.bgPicture = null;
                r.rt.applyPageAttributes(true)
                r.resume();
            } else {
                picture.loadFirst(r, () => {
                    if (picture.widthSync() === 0 || picture.heightSync() === 0) return;
                    wp.bgPictureWidth = picture.widthSync();
                    wp.bgPictureHeight = picture.heightSync();
                    wp.bgPicture = picture.getViewCanvas();
                    wp.bgPictureUrl = null;
                    r.rt.applyPageAttributes(true)
                });
            }
        }

        //? Sets the wall background camera.
        //@ cap(camera) async
        //@ [camera].readsMutable
        //@ [camera].deflExpr('senses->camera')
        export function set_background_camera(camera : Camera, r: ResumeCtx): void
        {
            camera
                .getVideoAsync(r.rt)
                .then(v => {
                    if (v) {
                        r.rt.getCurrentPage().bgVideo = v;
                        r.rt.applyPageAttributes(true)
                    }
                    r.resume()
                })
                .done();
        }

        //? Sets the 3x3 affine matrix transformation applied to the wall.
        //@ stub cap(phone)
        //@ [m11].defl(1) [m12].defl(0) [m21].defl(0) [m22].defl(1) [offsetx].defl(0) [offsety].defl(0)
        export function set_transform_matrix(m11:number, m12:number, m21:number, m22:number, offsetx:number, offsety:number) : void
        { }

        //? Reverses the elements on the wall and inserts new ones at the bottom.
        //@ [bottom].readsMutable
        //@ [bottom].defl(true)
        export function set_reversed(bottom:boolean, s:IStackFrame) : void
        {
            s.rt.setWallDirection(bottom);
        }

        //? Indicates if the title and subtitle bar should be visible on a page.
        export function show_title_bar(visible: boolean, s: IStackFrame): void {
            s.rt.getCurrentPage().chromeVisible = visible;
            s.rt.applyPageAttributes(true);
        }

        //? Indicates if the back button should be visible on the current page. The back button gets visible automatically when the app is paused or stopped in the editor.
        export function show_back_button(visible: boolean, s: IStackFrame): void {
            s.rt.getCurrentPage().backButtonVisible = visible;
            s.rt.applyPageAttributes(true);
        }

        //? Sets the title of the wall.
        export function set_title(text: string, s: IStackFrame): void
        {
            s.rt.getCurrentPage().title = text;
            s.rt.applyPageAttributes(true)
        }

        //? Sets the subtitle of the wall.
        export function set_subtitle(text: string, s : IStackFrame): void
        {
            s.rt.getCurrentPage().subtitle = text;
            s.rt.applyPageAttributes(true)
        }

        //? Use button icon names instead.
        //@ obsolete
        export function icon_names(): Collection<string>
        {
            return button_icon_names();
        }

        //? Clears the application bar buttons and hides the bar
        export function clear_buttons(s:IStackFrame) : void
        {
            s.rt.clearPageButtons();
        }

        //? Add a new button. icon must be the name of a built-in icon, text must be non-empty.
        //@ [result].writesMutable
        //@ [icon].defl("add") [icon].deflStrings("back", "cancel", "check", "close", "delete", "download", "edit", "favs.addto", "favs", "feature.camera", "feature.email", "feature.search", "feature.settings", "feature.video", "folder", "minus", "new", "next", "questionmark", "refresh", "save", "share", "stop", "sync", "transport.ff", "transport.pause", "transport.play", "transport.rew", "upload")
        //@ embedsLink("Wall", "Page Button") ignoreReturnValue
        export function add_button(icon:string, text:string, s:IStackFrame) : PageButton
        {
            // The call graph is:
            //
            // 1. Wall#add_button
            //      called by TD script to create a new PageButton object.
            // 2. Runtime#addPageButton
            //      add the button to the buttons list in the Page object
            //      and bind a tap event handler to the button.
            // 3. EditorHost#notifyPageButtonPush
            //      notify the editor that the button is added to re-render the whole page buttons.
            //
            if (s.rt.getPageButtons().length < 4) {
                if (text.length > 8)
                    text = text.substr(0, 8);
                else if (text.length == 0)
                    text = "???";
                var pageButton: PageButton = PageButton.mk(icon, text, s.rt.getCurrentPage().rtPage());
                s.rt.addPageButton(pageButton);
                s.rt.applyPageAttributes(true)
                return pageButton;
            }
            return undefined;
        }

        //? Gets the current page displayed on the wall
        export function current_page(s:IStackFrame) : Page { return s.rt.getCurrentPage().rtPage(); }

        //? Pushes an empty page on the wall.
        //@ ignoreReturnValue
        export function push_new_page(s: IStackFrame): Page
        {
            s.rt.forceNonRender("You may not push a page here");
            return s.rt.pushPage().rtPage();
        }

        //? Pops the current page and restores the previous wall page. Returns false if already on the default page.
        //@ ignoreReturnValue
        export function pop_page(s: IStackFrame): boolean
        {
            s.rt.forceNonRender("You may not pop a page here");
            return s.rt.popPage();
        }

        //? Same as `wall->pop_page`, but lets you use specific animation.
        //@ ignoreReturnValue
        //@ [style].deflStrings('slide down', 'slide up', 'slide right', 'fade', 'none')
        export function pop_page_with_transition(style:string, s: IStackFrame): boolean
        {
            s.rt.forceNonRender("You may not pop a page here");
            return s.rt.popPage(style);
        }

        //? Returns the current back stack of pages, starting from the current page to the bottom page.
        export function pages(s:IStackFrame) : Collection<Page>
        {
            var c = s.rt.getPageCount();
            var arr:Page[] = []
            for (var i = 0; i < c;++i)
                arr.push(s.rt.getPageAt(i).rtPage())
            return Collection.mkAny(Page, arr);
        }

        //? Gets the list of available page button names.
        export function button_icon_names() : Collection<string>
        {
            return Collection.mkStrings([
                "add",
                "back",
                "cancel",
                "check",
                "close",
                "delete",
                "download",
                "edit",
                "favs.addto",
                "favs",
                "feature.camera",
                "feature.email",
                "feature.search",
                "feature.settings",
                "feature.video",
                "folder",
                "minus",
                "new",
                "next",
                "questionmark",
                "refresh",
                "save",
                "share",
                "stop",
                "sync",
                "transport.ff",
                "transport.pause",
                "transport.play",
                "transport.rew",
                "upload"]);
        }

        //? Gets the width of the screen (in pixels).
        export function width(s : IStackFrame) : number {
            return s.rt.host.fullWallWidth();
        }

        //? Gets the height of the screen (in pixels).
        export function height(s : IStackFrame) : number {
            return s.rt.host.fullWallHeight();
        }
    }

    export module ScreenshotManager {
        export var toScreenshotURLAsync = (rt: RuntimeHost): Promise => { // string {
            var c = rt.toScreenshotCanvas();
            try {
                var data = c ? c.toDataURL('image/png') : undefined;
                return Promise.as(data);
            }
            catch(e) {
                return Promise.as(undefined);
            }
        };
    }
}
