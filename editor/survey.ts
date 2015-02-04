///<reference path='refs.ts'/>

module TDev {

    // Listener for various things happening to theEditor
    export interface EditorSpy {
        onEdit?: (stmt: AST.AstNode) => void;
        onView?: (decl: AST.Decl) => void;
        onAddNear?: (stmt: AST.AstNode) => void;
        onDelete?: (stmts: AST.Block) => void;
        onEnterDebugMode?: () => void;
        onLeaveDebugMode?: () => void;
        onAddBreakpoint?: (stmt: AST.Stmt) => void;
        onRemoveBreakpoint?: (stmt: AST.Stmt) => void;
        onCompile?: (script: AST.App) => void;
        onRun?: (script: AST.App) => void;
        onDebug?: (script: AST.App) => void;
        onRunAction?: (action: AST.Action) => void;
        onExit?: () => void;

        // self-awareness events
        onAddThisSpy?: (manager: IEditorSurveyManager) => void;
        onRemoveThisSpy?: () => void;
    };
    // that interface and this enum must always be in sync !!!
    export enum EditorSpyEvents {
        onEdit,
        onView,
        onAddNear,
        onDelete,
        onEnterDebugMode,
        onLeaveDebugMode,
        onAddBreakpoint,
        onRemoveBreakpoint,
        onCompile,
        onRun,
        onDebug,
        onRunAction,
        onExit,
    };

    function enumStrings(enum_: any) {
        var enumContents = Object.keys(enum_);
        var enumLength = Math.floor(enumContents.length / 2); // each 'normal' enum contains the strings and the numbers, 1 to 1
		return Object.keys(enum_).filter(it => (+it !== +it)); // filter out the numbers
    }

    export var EditorSpyEventStrings = enumStrings(EditorSpyEvents);

    export interface EditorSpyTicks {
        [event: string]: Ticks;
    }

    export class TickyEditorSpy implements EditorSpy {
        constructor(public ticks: EditorSpyTicks) {
            /* all the actual functionality is in the extension below */
        }
    };
    // we have to do it this way in order to make this class extendable
    function initTickyEditorSpyImpl() {
        EditorSpyEventStrings.forEach(event => {
            TickyEditorSpy.prototype[event] = function (arg?: any) { this.ticks[event] && tick(this.ticks[event]) };
        });
    };
    initTickyEditorSpyImpl();

    export interface SpyContainer {
        [name: string]: EditorSpy;
    }

    // we need this interface for TS to see the methods of EditorSpy on the manager
    // for some reason it does not see the methods on the class below
    // (maybe because they are not there and the compiler is too smart)
    export interface IEditorSurveyManager extends EditorSpy {
        addSpy(name: string, spy: EditorSpy);
        removeSpy(name: string);
        reset();
    };

    // this class is not extendable, and is not intended to be
    export class EditorSurveyManager implements IEditorSurveyManager {
        constructor(public spies: SpyContainer = {}) {
            EditorSpyEventStrings.forEach(event => {
                this[event] = (arg?: any) => this.forEach(spy => spy[event] && spy[event](arg))
            });
        }

        private forEach(f: (spy: EditorSpy) => void ) {
            Object.keys(this.spies).map(k => this.spies[k]).forEach(f);
        }

        public addSpy(name: string, spy: EditorSpy) {
            this.spies[name] = spy;
            spy.onAddThisSpy(this);
        }

        public removeSpy(name: string) {
            var spy = this.spies[name];
            spy.onRemoveThisSpy();
            delete this.spies[name];
        }

        public reset() {
            this.spies = {};
        }
    }



};