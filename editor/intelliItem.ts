///<reference path='refs.ts'/>

module TDev
{
    export class IntelliItem
    {
        public score = 0;
        public prop:IProperty;
        public decl:AST.Decl;
        public nameOverride:string;
        public imageOverride:string;
        public lowSearch:boolean; // demote in keyboard search
        public descOverride:string;
        public colorOverride:string;
        public tick = Ticks.noEvent;
        public iconOverride:string;
        public cbOverride:(i:IntelliItem)=>void;
        public isWide = false;
        public lastMatchScore = 0;
        public isAttachedTo:Kind = null;
        public usageKey:string;
        public cornerIcon:string;
        public noButton: boolean;
        public matchAny: boolean;

        public getName()
        {
            if (!!this.nameOverride) return this.nameOverride;
            if (!!this.prop) return this.prop.getName();

            if (this.decl instanceof AST.SingletonDef && this.decl.getName() == AST.libSymbol)
                return "libs";
            return this.decl.getName();
        }

        public alphaOverride()
        {
            if (this.cbOverride) return 30;
            if (this.decl instanceof AST.LocalDef) return 20;
            if (this.prop instanceof AST.GlobalDef) return 15;
            if (this.decl && this.decl.getKind() instanceof ThingSetKind) return -1;
            if (this.prop instanceof AST.LibraryRef) return 5;
            if (this.prop && !Script.canUseProperty(this.prop)) return -10;
            if (this.matchAny) return -1e10;

            if (Cloud.isRestricted() && TheEditor.intelliProfile && this.decl instanceof AST.SingletonDef) {
                var order = TheEditor.intelliProfile.getSingletonOrder(this.decl.getName())
                if (!order) return 0;
                else return (1000 - order) / 1000
            }
            return 0;
        }

        public getLongName()
        {
            if (!!this.nameOverride) return "\u00a0[" + this.nameOverride + "]";
            var d:any = this.decl;
            if (!d && this.prop) d = this.prop.forwardsTo();
            if (!d) d = this.prop;
            var n = d.getName();
            if (!(d instanceof AST.LibraryRefAction) && d.getNamespace) {
                n = d.getNamespace() + n;
            } else if (d.getNamespaces && d.getNamespaces()[0]) {
                n = d.getNamespaces()[0] + (this.prop ? this.prop.getArrow() : " ") + n;
            } else if (this.isAttachedTo)
                n = this.isAttachedTo.getPropPrefix() + (this.prop ? this.prop.getArrow() : " ") + n;
            else if (this.prop)
                n = this.prop.getArrow() + n;
            return n;
        }

        private shortName()
        {
            if (!!this.decl && this.decl instanceof AST.SingletonDef)
                return this.decl.getKind().shortName();
            else if (this.prop && this.prop instanceof AST.LibraryRef)
                return AST.libSymbol;
            else if (this.prop && this.prop instanceof AST.GlobalDef)
                return (<AST.GlobalDef>this.prop).isResource ? AST.artSymbol : AST.dataSymbol;
            return null;
        }

        private getDesc(skip?:boolean)
        {
            if (!!this.descOverride) return this.descOverride;
            return ""
            //if (!!this.prop) return this.prop.getDescription(skip);
            //return this.decl.getDescription(skip);
        }

        private onClick()
        {
            var calc = TDev.TheEditor.calculator;
            if (this.tick) tick(this.tick)
            calc.searchApi.cancelImplicitInsert();
            if (!!this.cbOverride) this.cbOverride(this);
            else {
                if (!!this.prop) {
                    calc.insertProp(this.prop, this.isAttachedTo != null);
                }
                else if (!!this.decl) {
                    calc.insertThing(this.decl);
                }
            }
            calc.hideBottomScroller();
        }

        public mkBox(options?: DeclBoxOptions) : HTMLElement
        {
            var box:HTMLElement = null;
            if (this.decl) box = DeclRender.mkBox(this.decl, options);
            else if (this.prop) {
                if (!this.isAttachedTo) {
                    box = DeclRender.mkPropBox(this.prop, options);
                } else {
                    this.prop.useFullName = true;
                    box = DeclRender.mkPropBox(this.prop, options);
                    this.prop.useFullName = false;
                }
            }
            else {
                var de = new DeclEntry(this.getName());
                de.color = this.getColor();
                de.description = this.getDesc();
                if (this.imageOverride) {
                    de.icon = this.imageOverride;
                    de.color = 'white';
                } else if (this.iconOverride) de.icon = this.iconOverride;
                box = DeclRender.mkBox(<any> de);
            }
            if (!!this.isAttachedTo)
                box.className += " attachedItem";
            return box.withClick(() => this.onClick());
        }

        private nameIsOp() {
            var n = this.getName();
            return n == ":=" || (n.length == 1 && !/[a-zA-Z]/.test(n));
        }

        public apply(c:CalcButton, idx:number) : void
        {
            var par = this.prop ? this.prop.parentKind : null
            var arrow = null
            if (par && !par.shortName() && !this.prop.getInfixPriority())
                arrow = span("calcArrow", this.prop.getArrow())
            var sn = this.shortName();
            var inner:HTMLElement;
            if (sn)
                inner = div("calcOp", [span("symbol", sn + " "), span("", this.getName())])
            else
                inner = div("calcOp", [arrow, text(this.getName())])
            var triangle = idx >= 0;
            inner.style.fontSize = this.nameIsOp() ? "1.2em" : (this.getName().length >= 18 ? "0.6em" : "0.8em");
            var help = this.getDesc()
            if (help.length > 14) help = ""
            var fn = () => {
                if (idx >= 0) {
                    tick(Ticks.calcIntelliButton)
                    tickN(Ticks.calcIntelliButton0, idx)
                }
                TDev.Browser.EditorSoundManager.intellibuttonClick();
                this.onClick()
            }

            if (this.imageOverride)
                c.setImage(this.imageOverride, help, Ticks.noEvent, fn)
            else
                c.setHtml(inner, help, fn);

            var b = c.getButton();
            if (triangle) {
                if (this.cornerIcon) {
                   var d = div("calcButtonCornerIcon", SVG.getIconSVG(this.cornerIcon))
                   b.appendChild(d)
                } else {
                    var cc = this.getColor();
                    if (DeclRender.propColor(this.prop)) {
                        d = div("calcButtonColorMarker");
                        b.appendChild(d);
                        d.style.backgroundColor = cc;
                    } else {
                        d = div("calcButtonTriangle", "");
                        b.appendChild(d);
                        d.style.borderTopColor = cc;
                        d.style.borderRightColor = cc;
                    }
                }
                c._theButton.className = "calcButton calcIntelliButton"
            } else {
                c._theButton.className = "calcButton calcStmtButton"
            }
            // display picture art in button
            if (this.prop instanceof TDev.AST.GlobalDef) {
                var gd = <TDev.AST.GlobalDef>this.prop;
                if (gd.isResource && gd.getKind().getName() == "Picture" && Cloud.isArtUrl(gd.url)) {
                    c.setBackgroundImage(gd.url);
                    inner.style.backgroundColor = 'rgba(238,238,255,0.5)';
                }
            }
            c.intelliItem = this;
        }

        private getColor()
        {
            var c = "blue";
            if (!!this.colorOverride) return this.colorOverride;
            if (!!this.decl) c = DeclRender.declColor[this.decl.nodeType()](this.decl);
            else if (this.prop instanceof AST.PropertyDecl) c = DeclRender.declColor[(<any>this.prop).nodeType()](this.prop);
            else if (!!this.prop) c = DeclRender.declColor["property"](this.prop);
            return c;
        }

        static matchString(s:string, terms:string[], begMatch:number, wordMatch:number, match:number)
        {
            if (terms.length == 0) return begMatch;

            var res = 0;
            for (var i = 0; i < terms.length; ++i) {
                var idx = s.indexOf(terms[i]);
                if (idx < 0) return 0;
                if (idx >= 0) {
                    if (idx == 0) {
                        res += begMatch;
                    } else {
                        idx = s.indexOf(" " + terms[i]);
                        if (idx >= 0)
                            res += wordMatch;
                        else
                            res += match;
                    }
                }
            }
            return res;
        }

        static matchProp(p:IProperty, terms:string[], fullName:string)
        {
            if (!p.isBrowsable()) return 0;
            if (terms.length == 0) return 10000;
            var pp:IPropertyWithCache = p.canCacheSearch() ? <IPropertyWithCache>p : null;
            var n:string;
            if (pp && pp.cacheShort) {
                n = pp.cacheShort;
            } else {
                n = (p.getName() + " " + (!p.parentKind ? "" : p.parentKind.toString())).toLowerCase();
                if (pp) pp.cacheShort = n;
            }
            var r = IntelliItem.matchString(n, terms, 10000, 1000, 100);
            if (r > 0) {
                if (p.getName().toLowerCase().replace(/[^a-z0-9]/g, "") == fullName)
                    r += 100000;
                return r;
            }
            var lng:string;
            if (pp && pp.cacheLong) {
                lng = pp.cacheLong;
            } else {
                lng = (n + p.getSignature() + " " + p.getDescription(true)).toLowerCase();
                if ((<any>p).forSearch)
                    lng += " " + (<any>p).forSearch().toLowerCase()
                if (pp) pp.cacheLong = lng
            }
            return IntelliItem.matchString(lng, terms, 100, 10, 1);
        }

        static thereIsMore()
        {
            var dotdotdot = new IntelliItem();
            dotdotdot.nameOverride = lf("... there's more ...");
            dotdotdot.descOverride = lf("just keep typing the search terms!");
            return dotdotdot.mkBox();
        }

        // Returns match quality
        public match(terms:string[], fullName:string)
        {
            if (this.matchAny) return this.score;
            if (!!this.prop) return IntelliItem.matchProp(this.prop, terms, fullName);
            if (terms.length == 0) return 1;
            var lowerName = this.getName().toLowerCase();
            var r = IntelliItem.matchString(lowerName, terms, 10000, 1000, 100);
            if (r > 0) {
                if (lowerName.replace(/[^a-z0-9]/g, "") == fullName)
                    r += 100000;
                return r;
            }
            return IntelliItem.matchString((this.getName() + " " + this.getDesc(true)).toLowerCase(), terms, 100, 10, 1);
        }

        static cmpName(a: IntelliItem, b: IntelliItem)
        {
            return b.alphaOverride() - a.alphaOverride() ||
                   Util.stringCompare(a.getName(), b.getName());
        }

        static cmpScoreThenName(a: IntelliItem, b: IntelliItem)
        {
            return b.lastMatchScore - a.lastMatchScore || b.score - a.score || IntelliItem.cmpName(a, b);
        }
    }
}
