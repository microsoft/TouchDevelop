///<reference path='refs.ts'/>
module TDev { export module RT {

    //? Current box element in the page.
    export module Box
    {
        var R = HTML;

        // Start new definition of a box
        export function push_box(s:IStackFrame) : void
        {
            if (!LayoutMgr.RenderExecutionMode())
                Util.userError(lf("boxes can only be created in page display code"));
            var parent = LayoutMgr.getCurrentRenderBox();
            Util.assert(parent != null);

            LayoutMgr.createOrRecycleContainerBoxDelayed(s.rt, parent);

            // var w:WallBox = WallBox.CreateOrRecycleContainerBox(s.rt, parent);
            // LayoutMgr.setCurrentRenderBox(w);
        }

        // Finish the box definition
        export function pop_box(s:IStackFrame) : void
        {
            Util.assert(LayoutMgr.RenderExecutionMode());
            var box = LayoutMgr.getCurrentRenderBox();
            //Util.log("pop box " + box.depth + " " + box.id);
            var parent = box.parent;
            Util.assert(parent != null);
            LayoutMgr.setCurrentRenderBox(box.parent);
        }


        //? Sets the foreground color of elements.
        //@ [color].deflExpr('colors->random')
        export function set_foreground(color:Color, s:IStackFrame) : void
        {
            var box = s.rt.getCurrentBox();
            box.setForeground(color.toHtml(), s.rt.getTopScriptPc());
        }

        //? Sets the background color.
        //@ [color].deflExpr('colors->random')
        export function set_background(color:Color, s:IStackFrame) : void
        {
           var box = s.rt.getCurrentBox();
            box.setBackground(color.toHtml(), s.rt.getTopScriptPc());
        }

        //? Sets the background picture. The picture must be a resource or from the web. The size of the picture does not impact the size of the box.
        //@ [position].deflStrings('center center', 'left top', 'left center', 'left bottom', 'right top', 'right center','right bottom','center top','center bottom')
        //@ [size].deflStrings('cover', 'contain', 'auto')
        //@ [repeat].deflStrings('no-repeat', 'repeat', 'repeat-x', 'repeat-y')
        //@ [attachment].deflStrings('scroll', 'fixed', 'local')
        export function add_background_picture(pic: Picture, position : string, size : string, repeat : string, attachment : string, s: IStackFrame) {
            var url = pic.getReadonlyUrlSync();
            function validate(str: string): string {
                var r = str.toLowerCase().trim();
                if (!/^[a-z %0-9\-]*$/.test(r)) {
                    App.log('invalid box background value: ' + r);
                    return '';
                }
                return r;
            }
            if (url) {
                var box = s.rt.getCurrentBox();
                box.addBackgroundImage({
                    url: url,
                    position:validate(position),
                    size: validate(size),
                    repeat: validate(repeat),
                    attachment:validate(attachment)
                }, s.rt.getTopScriptPc());
            }
        }

        //? Arrange boxes inside this box from top to bottom.
        export function use_vertical_layout(s:IStackFrame): void
        {
           var box = s.rt.getCurrentBox();
            box.setFlow(WallBox.FLOW_VERTICAL, s.rt.getTopScriptPc());
        }

        //? Arrange boxes inside this box from left to right.
        export function use_horizontal_layout(s:IStackFrame): void
        {
            var box = s.rt.getCurrentBox();
            box.setFlow(WallBox.FLOW_HORIZONTAL, s.rt.getTopScriptPc());
        }

        //? Arrange boxes inside this box as layers on top of each other.
        export function use_overlay_layout(s:IStackFrame): void {
            var box = s.rt.getCurrentBox();
            box.setFlow(WallBox.FLOW_OVERLAY, s.rt.getTopScriptPc());
        }


        //? Set the width of this box.
        export function set_width(width:number, s:IStackFrame) : void
        {
            var box = s.rt.getCurrentBox();
            box.setEmWidth(width, s.rt.getTopScriptPc());
        }

        //? Set the height of this box.
        export function set_height(height:number, s:IStackFrame) : void
        {
            var box = s.rt.getCurrentBox();
            box.setEmHeight(height, s.rt.getTopScriptPc());
        }

        //? Set lower and upper limits on the width of this box.
        export function set_width_range(min_width: number, max_width: number, s:IStackFrame): void
        {
            var box = s.rt.getCurrentBox();
            box.setEmWidthRange(min_width, max_width, s.rt.getTopScriptPc());
        }

        //? Set lower and upper limits on the height of this box.
        export function set_height_range(min_height: number, max_height: number, s:IStackFrame): void
        {
            var box = s.rt.getCurrentBox();
            box.setEmHeightRange(min_height, max_height, s.rt.getTopScriptPc());
        }

        //? Specify how to compute box width (0 = shrink to fit content, 1 = stretch to fit frame, , 0.5 = stretch to half width)
        //@ [elasticity].defl(1)
        export function set_horizontal_stretch(elasticity: number, s: IStackFrame): void {
            var n = elasticity;
            var box = s.rt.getCurrentBox();
            if (n < 0 || n > 1) {
                Util.userError(lf("invalid argument: elasticity must be a number between 0 and 1"));
                n = 0;
            }
            box.setHorizontalStretch(n, s.rt.getTopScriptPc());
        }

        //? Specify how to compute box height (0 = shrink to fit content, 1 = stretch to fit frame, 0.5 = stretch to half height)
        //@ [elasticity].defl(1)
        export function set_vertical_stretch(elasticity: number, s: IStackFrame): void {
            var n = elasticity;
            var box = s.rt.getCurrentBox();
            if (n < 0 || n > 1) {
                Util.userError(lf("invalid argument: elasticity must be a number between 0 and 1"));
                n = 0;
            }
            box.setVerticalStretch(n, s.rt.getTopScriptPc());
        }

        //? Set the color and width of the border.
        //@ [color].deflExpr('colors->foreground') [width].defl(0.1)
        export function set_border(color: Color, width: number, s:IStackFrame): void {
            var box = s.rt.getCurrentBox();
            box.setEmBorder(color.toHtml(), width, s.rt.getTopScriptPc());
         }


        //? Set the width of each border.
        export function set_border_widths(top:number, right:number, bottom:number, left:number, s:IStackFrame): void
        {
            var box = s.rt.getCurrentBox();
            box.setEmBorderWidth(top, right, bottom, left, s.rt.getTopScriptPc());
        }

        //? Set the margins of this box (to leave space around the outside of this box).
        //@ [left].defl(0.5) [top].defl(0.5)
        export function set_margins(top: number, right: number, bottom: number, left: number, s:IStackFrame): void
        {
            var box = s.rt.getCurrentBox();
            box.setAllEmMargins(top, right, bottom, left, s.rt.getTopScriptPc());
        }


        //? Set the padding of this box (to leave space around the contents of this box).
        export function set_padding(top: number, right: number, bottom: number, left: number, s:IStackFrame): void
        {
            var box = s.rt.getCurrentBox();
            box.setEmPadding(top, right, bottom, left, s.rt.getTopScriptPc());
        }




        // Set the weights for extending the margins of this box.
        //export function stretch_margins(top:number, right:number, bottom:number, left:number, s:IStackFrame) : void
        //{
        //    var box = s.rt.getCurrentBox();
        //    box.stretchAllMargins(top, right, bottom, left, s.rt.getTopScriptPc());
        //}
        // Set the weight for extending the width of this box.
        //export function stretch_width(weight:number, s:IStackFrame) : void
        //{
        //    var box = s.rt.getCurrentBox();
        //    box.setWidthStretch(weight, s.rt.getTopScriptPc());
        //}
        // Set the weight for extending the height of this box.
        //export function stretch_height(weight:number, s:IStackFrame) : void
        //{
        //    var box = s.rt.getCurrentBox();
        //    box.setHeightStretch(weight, s.rt.getTopScriptPc());
        //}

        //? align (0,0)=center (1,0)=left, (0,1)=right, (1,1)=stretch
        //@ obsolete
        export function set_horizontal_alignment(left: number, right: number, s: IStackFrame): void
        {
            var box = s.rt.getCurrentBox();
            box.setHorizontalAlignment(left, right, s.rt.getTopScriptPc());
        }

        //? align (0,0)=center (1,0)=top, (0,1)=bottom, (1,1)=stretch
        //@ obsolete
        export function set_vertical_alignment(top:number, bottom:number, s: IStackFrame) : void
        {
           var box = s.rt.getCurrentBox();
            box.setVerticalAlignment(top, bottom, s.rt.getTopScriptPc());
        }

        //? Specify how to arrange the content of this box
        //@ [arrange].defl("left") [arrange].deflStrings("center", "left", "right", "justify", "spread")
        export function set_horizontal_align(arrange:string, s: IStackFrame): void {
            var box = s.rt.getCurrentBox();
            var a = WallBox.ARRANGE_LEFT;
            var what = arrange;
            if (what === "left")
                a = WallBox.ARRANGE_LEFT;
            else if (what === "right")
                a = WallBox.ARRANGE_RIGHT;
            else if (what === "center")
                a = WallBox.ARRANGE_CENTER;
            else if (what === "justify")
                a = WallBox.ARRANGE_JUSTIFY;
            else if (what === "spread")
                a = WallBox.ARRANGE_SPREAD;
            else
                Util.userError(lf("horizontal align must be one of {left, right, center, justify, spread}"));
            box.setHorizontalArrangement(a, s.rt.getTopScriptPc());
        }

        //? Specify how to arrange the content of this box
        //@ [arrange].defl("baseline") [arrange].deflStrings("baseline", "top", "bottom", "center", "justify", "spread")
        export function set_vertical_align(arrange:string, s: IStackFrame): void {
            var box = s.rt.getCurrentBox();
            var a = WallBox.ARRANGE_TOP;
            var what = arrange;
            if (what === "top")
                a = WallBox.ARRANGE_TOP;
            else if (what === "bottom")
                a = WallBox.ARRANGE_BOTTOM;
            else if (what === "center")
                a = WallBox.ARRANGE_CENTER;
            else if (what === "justify")
                a = WallBox.ARRANGE_JUSTIFY;
            else if(what === "baseline")
                a = WallBox.ARRANGE_BASELINE;
            else if (what === "spread")
                a = WallBox.ARRANGE_SPREAD;
            else
                Util.userError(lf("vertical align must be one of {baseline, top, bottom, center, justify, spread}"));
            box.setVerticalArrangement(a, s.rt.getTopScriptPc());
        }



        //? Set font size in this box and contained boxes.
        //@ [font_size].defl(1)
        export function set_font_size(font_size: number, s:IStackFrame): void
        {
            var box = s.rt.getCurrentBox();
            box.setEmFontSize(font_size, s.rt.getTopScriptPc());
        }


        //? Set font weight in this box and contained boxes.
        //@ [font_weight].defl("bold") [font_weight].deflStrings("normal", "bold", "lighter", "bolder")
        export function set_font_weight(font_weight: string, s: IStackFrame): void {
            var box = s.rt.getCurrentBox();
            box.setFontWeight(font_weight, s.rt.getTopScriptPc());
        }


        //? Set font family in this box and contained boxes.
        //@ [family].defl("Default") [family].deflStrings("Default", "Arial, Helvetica, sans-serif", "Courier New, Courier, monospace", "Georgia, serif", "Lucida Console, Monaco, monospace", "Lucida Sans Unicode, Lucida Grande, sans - serif", "Palatino Linotype, Book Antiqua, Palatino, serif", "Tahoma, Geneva, sans - serif", "Times New Roman, Times, serif", "Trebuchet MS, sans-serif", "Verdana, Geneva, sans-serif", "Comic Sans MS, cursive")
         //@ dbgOnly
       export function set_font_family(family: string, s:IStackFrame): void
        {
            var box = s.rt.getCurrentBox();
            box.setFontFamily(family, s.rt.getTopScriptPc());
        }

        //? Specify whether to use scrollbars on overflow.
        //@ [horizontal_scrolling].defl(true) [vertical_scrolling].defl(true)
        export function set_scrolling(horizontal_scrolling: boolean, vertical_scrolling: boolean, s:IStackFrame): void
        {
            var box = s.rt.getCurrentBox();
            box.setScrolling(horizontal_scrolling, vertical_scrolling, s.rt.getTopScriptPc());
        }


        //? Set what happens when the box is tapped.
        export function on_tapped(handler:Action, s:IStackFrame) : void
        {
            var box = s.rt.getCurrentBox();
            box.attributes.tappedEvent.addHandler(handler);
        }

       // //? Set what happens when the box is tapped.
       // export function on_edit(handler: Action, s: IStackFrame): void {
      //      var box = s.rt.getCurrentBox();
      //      box.attributes.editEvent.addHandler(handler);
      //  }


        //? Set what happens whenever the text in the box is being edited.
        //@ obsolete
        export function on_text_editing(handler:TextAction, s:IStackFrame) : void
        {
            var box = s.rt.getCurrentBox();
            box.attributes.textEditingEvent.addHandler(handler);
        }


        //? Set what happens when the user has finished editing the text in the box.
        //@ obsolete
        export function on_text_edited(handler:TextAction, s:IStackFrame): void
        {
            var box = s.rt.getCurrentBox();
            box.attributes.textEditedEvent.addHandler(handler);
        }

        //? Display editable text.
        //@ obsolete
        //@ [text].defl("") [multiline].defl(true)
        export function edit_text(text: string, multiline: boolean, s: IStackFrame): void {
            s.rt.postEditableText(multiline ? "textarea" : "textline", text, null, s.rt.getTopScriptPc());
        }



        //? Display editable text, for the given content and change handler.
        //@ [style].defl("textline") [style].deflStrings("textline", "textarea", "number", "password")
        export function edit(style: string, value: string, changehandler:TextAction, s: IStackFrame): void {
            s.rt.postEditableText(style, value, changehandler, s.rt.getTopScriptPc());
        }

        //? Display editable text, bound to the given string reference.
        //@ [style].defl("textline") [style].deflStrings("textline", "textarea", "number", "password")
        export function edit_ref(style: string, ref:Ref<string>, s: IStackFrame): void {
            s.rt.postEditableText(style, ref._get(s), ref, s.rt.getTopScriptPc());
        }


        //?
        //@ hidden
        export function is_init(s:IStackFrame): boolean
        {
            return s.rt.getCurrentPage().renderCount == 0;
        }

        //? Get the total width of the page.
        export function page_width(s:IStackFrame) : number
        {
            // must leave room for scrollbar, otherwise we get double scroll bars
           return (s.rt.host.fullWallWidth() - LayoutMgr.instance.scrollbarWidth) / SizeMgr.topFontSize;
        }

        //? Get the total height of the page.
        export function page_height(s:IStackFrame) : number
        {
            return s.rt.host.userWallHeight() / SizeMgr.topFontSize;
        }

        //? Get the number of pixels in an em
        export function pixels_per_em(): number {
            return SizeMgr.topFontSize;
        }

        //? Set whether to break long lines, and specify what length is too short for breaking
        //@ [wrap].readsMutable
        //@ [wrap].defl(true) [minimumwidth].defl(15)
        export function set_text_wrapping(wrap:boolean, minimumwidth:number, s:IStackFrame) : void
        {
            var box = s.rt.getCurrentBox();
            box.setWrap(wrap, minimumwidth, s.rt.getTopScriptPc());
        }
    }

    //? Current html element in the page.
    //@ betaOnly
    export module Dom {
        //? Use CSS for layout and import additional CSS stylesheets. Use string art resource to import urls.
        //@ betaOnly
        export function use_css(stylesheet: string, s: IStackFrame): void {
            s.rt.forceNonRender(lf("cannot change css while displaying page"));
            s.rt.getCurrentPage().csslayout = true;
            s.rt.applyPageAttributes(true);
            if (stylesheet)
                (<any>s.rt.host).importCss(stylesheet)
        }

        //? Specify the tagname for this element
        //@ betaOnly
        export function set_tag_name(name: string, s: IStackFrame): void {
            if (!name) return;
            if (!HTML.allowedTagName(name))
                Util.userError(lf("tag not allowed"), s.pc);
            LayoutMgr.setHtmlTagName(name);
        }

        //? Add a CSS class name to the current element.
        //@ betaOnly
        export function add_css_class(name: string, s: IStackFrame): void {
            if (!name) return;

            var box = s.rt.getCurrentHtmlBox();
            box.addClassName(name, s.rt.getTopScriptPc());
        }

        //? Specify an attribute for the current element.
        //@ betaOnly
        export function set_attribute(name: string, value: string, s: IStackFrame): void {
            if (!name) return;
            if (!HTML.allowedAttributeName(name))
                Util.userError(lf("attribute not allowed"), s.pc);
            var box = s.rt.getCurrentHtmlBox();
            box.setAttribute(name, value, s.rt.getTopScriptPc());
        }

        //? Specify a style attribute for the current element.
        //@ betaOnly
        export function set_style(property: string, value: string, s: IStackFrame): void {
            if (!property) return;

            var box = s.rt.getCurrentHtmlBox();
            box.setStyle(property,value, s.rt.getTopScriptPc());
        }

        //? Bind editable text, by giving current text and change handler.
        //@ betaOnly
        export function bind_value_with_handler(value: string, changehandler: TextAction, s: IStackFrame): void {
            var box = s.rt.getCurrentHtmlBox();
            box.bindEditableText(value, changehandler, s.rt.getTopScriptPc());
        }

        //? Bind editable text, using a string reference.
        //@ betaOnly
        export function bind_value_to_ref(ref: Ref<string>, s: IStackFrame): void {
            var box = s.rt.getCurrentHtmlBox();
            box.bindEditableText(ref._get(s), ref, s.rt.getTopScriptPc());
        }


        //? Set what happens when this element is clicked.
        //@ betaOnly
        export function add_on_click(handler: Action, s: IStackFrame): void {
            var box = s.rt.getCurrentHtmlBox();
            box.attributes.tappedEvent.addHandler(handler);
        }

    }
} }
