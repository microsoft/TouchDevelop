declare module Blockly {
    class Block {
        static obtain(workspace: Workspace, prototypeName?: string): Block;

        // If type is equals to "foo_bar" and [Foo_BarBlock] exists, then you
        // may cast to it.
        type: string;
        id: string;

        // Returns null if the field does not exist on the specified block.
        getFieldValue(field: string): string;
        setFieldValue(newValue: string, field: string): void;
    }

    class Controls_IfBlock extends Block {
        elseIfCount_: number;
        elseCount_: number;
    }

    class Workspace {
        clear(): void;
        dispose(): void;
        getTopBlocks(ordered: boolean): Block[];
        getAllBlocks(): Block[];
    }

    module Xml {
        function domToText(dom: Element): string;
        function domToPrettyText(dom: Element): string;
        function domToWorkspace(workspace: Workspace, dom: Element): void;
        function textToDom(text: string): Element;
        function workspaceToDom(workspace: Workspace): Element;
    }

    interface Options {
        readOnly?: boolean;
        toolbox?: Element;
        trashcan?: boolean;
        collapse?: boolean;
        comments?: boolean;
        disable?: boolean;
        scrollbars?: boolean;
        sound?: boolean;
        css?: boolean;
        grid?: {
            spacing?: boolean;
            length?: boolean;
            colour?: boolean;
            snap?: boolean;
        };
        enableRealTime?: boolean;
    }

    interface callbackHandler {}

    function inject(elt: Element, options?: Options): void;
    function addChangeListener(f: () => void): callbackHandler;
    function removeChangeListener(h: callbackHandler): void;

    var mainWorkspace: Workspace;
}
