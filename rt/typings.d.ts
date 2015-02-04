//declare var WinJS:any;
//declare var Windows:any;
//declare var debugger:any;
declare var escape:any;

interface String {
    // 'any' below is hack around http://typescript.codeplex.com/workitem/1812
    replace(searchValue: RegExp, replaceValue: any): string;
}

interface Element extends Node, NodeSelector, ElementTraversal {
    removeAllChildren():void;
    appendChildren(elts:any):void;
    setChildren(elts:any):void;
    setChildrenIfNeeded(elts:any):void;
    setPosition(x:number,y:number,w:number,h:number):void;
    offsetPosition():any;
    removeSelf():any;
    setFlag(name:string, v:boolean):void;
    getFlag(name:string):boolean;
}

interface KeyboardEvent extends UIEvent {
    fromTextBox:boolean;
    fromTextArea:boolean;
    keyName:string;
    stopIt():boolean;
}

interface HTMLElement extends Element, ElementCSSInlineStyle, MSEventAttachmentTarget, MSNodeExtensions {
    withClick(cb:(e) => void, allowSelect?:boolean) : HTMLElement;
}

/*
interface EventTarget {
    removeEventListener(type: string, listener: EventListenerHE, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerHE, useCapture?: boolean): void;
}
*/

interface EventListenerHE {
    handleEvent(evt: Event): void;
}

interface Array<T> {
    peek() : T;
    //collect(fn:(e:T) => any[]) : any[];
    collect(fn:any) : any[];
    pushRange(a:T[]) : void;
    //maxBy(fn:(e:T) => number) : T;
    //minBy(fn:(e:T) => number) : T;
    max() : number;
    min() : number;
    spliceArr(idx:number, len:number, elts:T[]) : void;
    clear() :void;
    stableSortObjs(cmp:(a:T, b:T)=>number):void;
    stableSorted(cmp:(a:T, b:T)=>number):T[];
    stableSort(cmp:(a:T, b:T)=>number):void;
}

interface MSPointerEvent extends MouseEvent {
    getPointerList(): MSPointerList;
    preventMouseEvent(): void;
    preventManipulation(): void;
}

interface MSPointerList {
    length: number;
    item(index: number): MSPointerPoint;
    [index: number]: MSPointerPoint;
}

interface MSPointerPoint {
    width: number;
    rotation: number;
    pressure: number;
    clientY: number;
    pointerType: number;
    tiltY: number;
    height: number;
    screenY: number;
    tiltX: number;
    pointerId: number;
    hwTimestamp: number;
    clientX: number;
    screenX: number;
}
