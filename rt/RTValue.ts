///<reference path='refs.ts'/>

'use strict';

module TDev.RT {
    export class RTValue
    {
        static normalize(n:number) { return n < 0 ? 0 : n > 1 ? 1 : n; }
        public decorators: DecoratorCollection;

        public on_render_heap = false;
        public versioncounter: number = 1; // used to track changes for auto-refresh purposes


        // the 'reuse key' is used by the incremental box tree algorithm.
        // whenever posting to the wall, it checks equality (===) of the reuse key
        // if there is a match, it reuses the previous WallBox instead of creating a new one.
        //public reuseKey():any { return this; }

        public post_to_wall(s:IStackFrame) : void
        {
            if (!s.rt.mayPostToWall(s.rt.getCurrentPage()))
                Util.userError("cannot post to the wall here");
            var box = WallBox.CreateOrRecycleLeafBox(s.rt, this);
            if (!box.getContent())
            {
                var e: HTMLElement;
                try {
                    e = this.getViewCore(s, box);
                }
                catch (e)
                {
                    Util.reportError('getViewCore crash: ' + (typeof this), e, false);
                    e = div('item item-crash', ':( something went wrong');
                }
                if (box instanceof WallBox)
                   s.rt.addTapEvent(e, this.rtType(), <WallBox>box, this);
                box.setContent(e);
                try {
                    this.updateViewCore(s, box);
                }
                catch (e) {
                    Util.reportError('updateViewCore crash: ' + (typeof this), e, false);
                }
            }
            if (box instanceof WallBox && (<WallBox>box).getDepth() === 1) s.rt.renderBox(box);
        }


        public viewIsRefreshable() { return false }



        public refreshViews(s:IStackFrame)
        {
        }

        public debuggerDisplay(clickHandler : () => any): HTMLElement
        {
            return div("wall-text", this.getShortStringRepresentation()).withClick(clickHandler);
        }

        public getViewCore(s:IStackFrame, b:BoxBase) : HTMLElement
        {
            return div("wall-text", this.getShortStringRepresentation());
        }




        public updateViewCore(s: IStackFrame, b: BoxBase) { }


        // subclasses can override this to provide customized string representations
        public getShortStringRepresentation(): string
        {
            try {
                if ((<any>this).to_string)
                    return (<any>this).to_string();
                else
                    return this.toString();
            } catch (e) {
                Util.reportError("getShortStringRepresentation", e, false);
                return "???";
            }
        }

        public toString() : string
        {
                return "[" + this.rtType() + "]";
        }

        public isSerializable() { return false; }

        // this gets dynamically overriden (JsonCtx.setupTypeTable())
        public rtType() { return "RTValue"; }

        static mkPicker(p:IPicker, v:any, n:string, qn:string) : IFullPicker
        {
            var fp = <IFullPicker>p;
            p.set(v);
            fp.userName = n;
            fp.quotedName = qn;
            return fp;
        }

        public exportJson(ctx:JsonExportCtx):any
        {
           return undefined; // subclasses override this to support exporting
        }
        public importJson(ctx: JsonImportCtx, json:any): RT.RTValue {
            // subclasses override this to support importing
            return undefined;
        }
        public jsonExportKey(ctx: JsonExportCtx)
        {
            return undefined; // recursive types must override this to null or some string representation
        }
        public jsonExportMark = false; // used to block infinite recursion


        public toJsonKey():any
        {
            throw new Error("cannot use " + this.rtType() + " as a key (it is not a value)");
        }
        public keyCompareTo(other:any):number
        {
            throw new Error("cannot use " + this.rtType() + " as a key (it is not a value)");
        }
        public isDefaultValue():boolean
        {
            return false;  // overridden in value types where objects may denote the default value
        }

        static CompareKeys(a:RTValue, b:RTValue):number
        {
            if (!a)
              return (b ? -1 : 0);
            else
              return (b ? a.keyCompareTo(b) : 1);
        }


/*
        API overriding logic
        ~~~~~~~~~~~~~~~~~~~~

        Each API target is given a prefix. At the moment there are two: "Wab" and "WinRT".
        In the following <prefix> refers to one of them.

        1. Overriding functions in modules

            The overriding works by running all the methods in TDev.RT.<prefix>. The naming convention
            is for overrides for module Foo to be placed in function TDev.RT.<prefix>.FooInit, like this:

            File lib<prefix>/Foo.str:
            module TDev.RT.<prefix> {
                export function FooInit()
                {
                    Foo.bar = (x:number) => {
                        // body of Foo.bar goes here
                    };
                }
            }


            The ResumeCtx convention needs to agree among all implementations.

        2. Overriding methods in classes

            To override methods in class Baz defined <prefix>Baz class deriving from Baz
            in TDev.RT (or in TDev.RT.<prefix>).

            File lib<prefix>/Baz.str:
            module TDev.RT {
                class <prefix>Baz extends Baz
                {
                    private _my_field:number;
                    public foo(x:number) {
                        // body of Baz.foo
                    }
                }
            }

*/

        static copySpecificImpls(classPrefix:string)
        {
            var rt = <any> TDev.RT
            var moduleOverrides = rt[classPrefix]

            Object.keys(moduleOverrides).forEach((k) => {
                if (/Init$/.test(k)) {
                    var f = moduleOverrides[k]
                    if (f instanceof Function)
                        f()
                }
            })

            var rx = new RegExp("^" + classPrefix)

            function copyFrom(src) {
                Object.keys(src).forEach((k) => {
                    if (rx.test(k)) {
                        var baseName = k.slice(classPrefix.length)
                        var derived = src[k].prototype
                        if (!derived) return;
                        var base = rt[baseName].prototype;

                        Object.keys(derived).forEach((m) => {
                            if (m != "constructor" && m != "rtType")
                                base[m] = derived[m]
                        })
                    }
                })
            }
            copyFrom(rt)
            copyFrom(moduleOverrides)
        }

        static setupTypeTable()
        {
            var setClsName = (name: string, fn: any) =>
            {
                fn.prototype.rtType = () => name;
            }

            for (var cls in TDev.RT) {
                if (!TDev.RT.hasOwnProperty(cls)) continue;
                var fn = (<any>TDev.RT)[cls];
                if (fn.prototype && fn.prototype.rtType && !fn.prototype.noMagicRtType) {
                    if (!fn.prototype.hasOwnProperty("rtType"))
                        setClsName(cls, fn);
                    //JsonCtx.typeCtors[fn.prototype.rtType()]= fn;
                }
            }
        }

        static initApis()
        {
            RTValue.setupTypeTable()

            if (Browser.isNodeJS)
                this.copySpecificImpls("Node")
            else if (Browser.inCordova)
                this.copySpecificImpls("Cordova")
            else if (Browser.win8)
                this.copySpecificImpls("WinRT")
            else if (Browser.webAppBooster)
                this.copySpecificImpls("Wab")
        }
    }

    /// A runtime value that should be explicitely stopped.
    /// Reference counted in the runtime. Inherited class must call the 'dispose' base class.
    export class RTDisposableValue
        extends RTValue {
        constructor(public rt : Runtime) {
            super();
            this.rt.disposables.push(this); // ref counting
        }
        public dispose() {
            var i = this.rt.disposables.indexOf(this);
            if (i > 0)
                this.rt.disposables.splice(i, 1);
        }
    }

    /*
    export class RefreshableValue
        extends RTValue
    {
        static currentViewId = 1;

        private attachedIds:string[];

        public viewIsRefreshable() { return true }

        public refreshViews(s:IStackFrame)
        {
            this.attachedIds = this.attachedIds.filter((id) => {
                var e = elt(id);
                if (e) {
                    var newView = this.getViewCore(s);
                    e.parentNode.replaceChild(newView, e);
                    newView.id = id;
                    return true;
                } else return false;
            })
        }

        public getView(s:IStackFrame) : HTMLElement
        {
            var view = this.getViewCore(s);
            if (this.viewIsUpdatable()) {
                view.id = "view-" + currentViewId++;
                if (!this.attachedIds)
                    this.attachedIds = []
                this.attachedIds.push(view.id)
            }
            return view
        }
    }
    */

    export class DecoratorCollection
        extends RTValue
    {
        constructor() {
            super()
        }
    }



    export interface IPicker
    {
        set(v:any):void;
        validate():boolean;
        get():any;
        html:HTMLElement;
    }

    export interface IFullPicker
        extends IPicker
    {
        userName:string;
        quotedName:string;
    }
}
