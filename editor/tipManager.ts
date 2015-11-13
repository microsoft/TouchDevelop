///<reference path='refs.ts'/>

module TDev {
    export interface Tip {
        tick?: Ticks;
        tickArg?: string;
        title: string;
        description: string;
        el?: HTMLElement;
        decl?: AST.Decl;
        forceTop?:boolean;
        forceBottom?: boolean;
        clientHeight?: number;
    }

    export module TipManager {
        var currentTipDiv: HTMLElement;
        var currentTipTarget: HTMLElement;
        var currentTip: Tip;
        var scheduledTip: Tip;
        // = { tick : Ticks.codeRun, title : 'run your script', description : "tap 'run' to see the code in action" };

        export function showScheduled()
        {
            if (scheduledTip)
                setTip(scheduledTip)
        }

        export function scheduleTip(tip: Tip)
        {
            setTip(null)
            scheduledTip = tip;
        }
        
        export function isCurrent(tip: Tip) {
            return currentTip == tip;
        }

        export function isScheduled()
        {
            return !!scheduledTip
        }

        export function isVisible()
        {
            return !!currentTip
        }

        export function setTip(tip: Tip)
        {
            var needsAnimation = tip && (!currentTip || currentTip.description != tip.description)
            currentTip = tip;
            scheduledTip = null;
            update(needsAnimation)
        }

        export function update(needsAnimation = false) {
            if (!currentTip) {
                hideTip();
            } else {
                updateTip(needsAnimation);
            }
        }

        function hideTip() {
            if (currentTipDiv) {
                currentTipDiv.removeSelf();
                currentTipDiv = undefined;
            }
            if (currentTipTarget) {
                currentTipTarget.setFlag("tipped", false);
                currentTipTarget = undefined;
            }
        }

        function isHidden(el : HTMLElement) {
            var e = el;
            while(e && e.tagName != 'BODY') {
                if (!e || e.style.display == 'none') return true;
                e = e.parentElement;
            }
            return false;
        }

        function updateTip(needsAnimation:boolean)
        {
            var tip = currentTip;

            // special handling for case when back button is not visible
            if (tip.tick === Ticks.wallBack && !TheEditor.host.showBackButton()) {
                var root = document.getElementById('root');
                placeTip(tip, -1, -1, root, root, true);
                return;
            }

            var el = tip.el;
            if (!el && tip.tick) el = document.getElementById('btn-' + Ticker.tickName(tip.tick) + (tip.tickArg ? tip.tickArg : ""));
            if (!el && tip.decl) el = TheEditor.scriptNav.htmlForDecl(tip.decl)
            if (!el || isHidden(el)) {
                // special handling of hardware buttons
                hideTip();
                return;
            }
            // find the offset parent
            var top = el.offsetTop;
            var left = el.offsetLeft;
            var width = el.offsetWidth
            var parent = <HTMLElement>el.offsetParent;
            while (parent) {
                if (parent.id == 'root') break;
                if ((<any>parent).scrollEnabled) break;
                if (/sideTabScroll/.test(parent.className) || /scriptEditor|leftPaneContent/.test(parent.id))
                    break;
                top += parent.offsetTop;
                left += parent.offsetLeft;
                parent = <HTMLElement>parent.offsetParent;
            }
            if (parent == null) parent = document.body;
            if (width > SizeMgr.topFontSize * 5)
                left += width / 3;
            placeTip(tip, left, top, el, parent, needsAnimation);

            if (currentTipTarget && currentTipTarget != el)
                currentTipTarget.setFlag("tipped", false)
            currentTipTarget = el
            currentTipTarget.setFlag("tipped", true)

            var tp = currentTipDiv
            Util.setTimeout(1, () => {
                if (tp == currentTipDiv) {
                    Util.ensureVisible(tp);
                    Util.ensureVisible(el, parent)
                }
            })
        }

        function placeTip(tip : Tip, left : number, top : number, el : HTMLElement, parent : HTMLElement, needsAnimation : boolean) {
            // create new div on demand
            if (currentTipDiv) currentTipDiv.removeSelf()

            currentTipDiv = div('tip', div('tipInner'))
            // placing it on tipInner doesn't really help
            currentTipDiv.withClick(() => {
                // Util.coreAnim("shakeTip", 500, currentTipDiv);
                if (el)
                    Util.coreAnim("pulseTarget", 1500, el);
            })

            var innerTip = <HTMLElement>currentTipDiv.firstChild
            currentTipDiv.className = 'tip';
            innerTip.innerHTML = "";
            var triangleClass = 'tip-';
            // special handling for left hardware button
            if (left == -1 && top == -1) {
                currentTipDiv.style.bottom = '12px';
                currentTipDiv.style.left = '25px';
                currentTipDiv.style.right = '';
                currentTipDiv.style.top = '';
                tip.title = 'press the phone back button';
                triangleClass += 'bl';
            }
            else {
                if (tip.forceBottom || (!tip.forceTop && top < parent.clientHeight / 2)) {
                    currentTipDiv.style.bottom = '';
                    currentTipDiv.style.top = (top + (tip.clientHeight|| (5 + el.clientHeight))) + 'px';
                    triangleClass += 't';
                }
                else {
                    currentTipDiv.style.bottom = (parent.clientHeight - (top - 5)) + 'px';
                    currentTipDiv.style.top = '';
                    triangleClass += 'b';
                }
                if (left > parent.clientWidth/2) {
                    currentTipDiv.style.right = (parent.clientWidth - (left + el.clientWidth / 2 - 8)) + 'px';
                    currentTipDiv.style.left = '';
                    triangleClass += 'r';
                }
                else {
                    currentTipDiv.style.right = '';
                    currentTipDiv.style.left = (left + 8) + 'px';
                    triangleClass += 'l';
                }
            }
            currentTipDiv.className += ' ' + triangleClass;
            innerTip.setChildren([
                div('tipTitle', tip.title),
                div('tipDescr', tip.description)])
            parent.appendChild(currentTipDiv);
            if (needsAnimation)
                Util.coreAnim("showTip", 1000, currentTipDiv);
            dirAuto(currentTipDiv)
        }
    }
}

