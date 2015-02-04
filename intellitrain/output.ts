///<reference path='../editor/refs.ts'/>

module TDev.Util {
    export interface IOutput {
        horizontal(f: () => void): void;
        vertical(f: () => void): void;
        show(s: string): void;
    }

    interface IContext {
        elem: HTMLElement;
        vert: boolean;
    }
    export class HtmlOutput implements IOutput {

        private stack: IContext[] = [];
        constructor(private elem: HTMLElement) {
            this.stack.push({ elem: elem, vert: true });
        }

        private top(): IContext {
            return this.stack[this.stack.length - 1];
        }

        private appendChild(): HTMLElement {
            var top = this.top();
            var next = document.createElement('div');
            if (top.vert) {
                next.style.display = "block";
                next.style.paddingLeft = "10px";
            }
            else {
                next.style.display = "inline";
            }
            top.elem.appendChild(next);
            return next;
        }

        public vertical(f: () => void) {

            var next = this.appendChild();
            this.stack.push({ elem: next, vert: true });
            try {
                f();
            }
            finally {
                this.stack.pop();
            }
        }

        public horizontal(f: () => void) {
            var next = this.appendChild();
            this.stack.push({ elem: next, vert: false});
            try {
                f();
            }
            finally {
                this.stack.pop();
            }
        }

        public show(s: string) {
            var child = this.appendChild();
            Browser.setInnerHTML(child, s);
        }
    }

}